---
tags: [security, production, abac, opa, cerbos, spicedb, policy-engine, authorization]
aliases: [ABAC, Attribute-Based Access Control, OPA, Cerbos, SpiceDB, ReBAC]
stage: advanced
---

# ABAC and Policy Engines

> [!info] For the Express/TS dev
> CASL is ABAC-lite. When your CASL `defineAbility` functions grow to hundreds of lines, teams reach for a dedicated policy engine. This note covers the spectrum: custom Spring `AuthorizationManager` → OPA → Cerbos → SpiceDB, with a decision guide.

## Concept / mental model

### When RBAC isn't enough

RBAC breaks down when authorization rules involve:

- **Resource attributes** — "can only approve invoices under $50,000"
- **Subject attributes** — "users from the EU can only see EU data"
- **Environmental attributes** — "admin actions only allowed during business hours"
- **Relationship graphs** — "can edit if you're a collaborator on the project, or the project is owned by your organization"

The classic signal: your `@PreAuthorize` SpEL is calling service methods to load data needed just to *decide* whether to allow the call. That's ABAC — you're just doing it without a name for it.

### The four-factor ABAC model

```
Decision = Policy(Subject, Resource, Action, Environment)

Subject:     who is asking?         (user id, roles, department, clearance level)
Resource:    what are they touching? (order id, status, owner, amount)
Action:      what are they doing?   (read, write, approve, delete)
Environment: context of the request (time, IP, request path, tenant)
```

---

## Code examples

### Custom `AuthorizationManager` with attributes

For moderate complexity that doesn't warrant an external policy engine:

```java
@Component
@RequiredArgsConstructor
public class InvoiceAuthorizationManager
        implements AuthorizationManager<MethodInvocation> {

    private final InvoiceRepository invoiceRepo;
    private final UserRepository    userRepo;
    private final Clock             clock;

    private static final BigDecimal SELF_APPROVE_LIMIT =
        new BigDecimal("50000.00");

    @Override
    public AuthorizationDecision check(Supplier<Authentication> authSupplier,
                                       MethodInvocation invocation) {
        Authentication auth  = authSupplier.get();
        Long invoiceId       = (Long) invocation.getArguments()[0];
        Invoice invoice      = invoiceRepo.findById(invoiceId).orElseThrow();
        User currentUser     = userRepo.findByEmail(auth.getName()).orElseThrow();

        // Rule 1: global approvers can approve anything
        if (hasAuthority(auth, "invoice:approve")) {
            return new AuthorizationDecision(true);
        }
        // Rule 2: department managers can approve invoices in their dept
        //         if amount is under their limit
        if (hasAuthority(auth, "invoice:approve:dept")
            && currentUser.getDepartmentId().equals(invoice.getDepartmentId())
            && invoice.getAmount().compareTo(SELF_APPROVE_LIMIT) <= 0) {
            return new AuthorizationDecision(true);
        }
        // Rule 3: no self-approval ever
        if (invoice.getRequestedById().equals(currentUser.getId())) {
            return new AuthorizationDecision(false);
        }

        return new AuthorizationDecision(false);
    }

    private boolean hasAuthority(Authentication auth, String authority) {
        return auth.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals(authority));
    }
}

// Wire it — use InterceptorAopBean for method-level
@Configuration
@EnableMethodSecurity
public class InvoiceSecurityConfig {

    @Bean
    @Role(BeanDefinition.ROLE_INFRASTRUCTURE)
    public Advisor invoiceSecurityAdvisor(
            InvoiceAuthorizationManager mgr) {
        var interceptor = AuthorizationManagerBeforeMethodInterceptor
            .preAuthorize(mgr);
        interceptor.setOrder(Ordered.HIGHEST_PRECEDENCE);
        return interceptor;
    }
}
```

### Integration with OPA (Open Policy Agent) via REST sidecar

OPA runs as a sidecar (Docker/k8s) and your Spring app makes HTTP calls to it:

```yaml
# docker-compose.yml — OPA sidecar
services:
  opa:
    image: openpolicyagent/opa:latest
    command: run --server --addr :8181 /policies
    volumes:
      - ./policies:/policies
    ports:
      - "8181:8181"
```

```rego
# policies/orders.rego
package orders

import future.keywords.if

default allow = false

# Admins can do anything
allow if {
    "order:manage" in input.subject.permissions
}

# Users can read their own orders
allow if {
    input.action == "read"
    "order:read:own" in input.subject.permissions
    input.resource.ownerId == input.subject.userId
}

# Managers can read all orders in their department
allow if {
    input.action == "read"
    "order:read" in input.subject.permissions
    input.resource.departmentId == input.subject.departmentId
}

# No self-approval
deny if {
    input.action == "approve"
    input.resource.requestedById == input.subject.userId
}

allow if {
    input.action == "approve"
    "order:approve" in input.subject.permissions
    not deny
}
```

```java
@Component
@RequiredArgsConstructor
public class OpaAuthorizationManager<T> implements AuthorizationManager<T> {

    private final WebClient opaClient;    // configured to point at OPA sidecar
    private final ObjectMapper mapper;

    @Override
    public AuthorizationDecision check(Supplier<Authentication> authSupplier,
                                       T object) {
        Authentication auth = authSupplier.get();
        OpaInput input = buildInput(auth, object);

        try {
            OpaResponse response = opaClient.post()
                .uri("/v1/data/orders/allow")
                .bodyValue(Map.of("input", input))
                .retrieve()
                .bodyToMono(OpaResponse.class)
                .block(Duration.ofMillis(50));  // tight timeout — policy is on loopback

            return new AuthorizationDecision(
                response != null && Boolean.TRUE.equals(response.getResult())
            );
        } catch (Exception e) {
            // Fail closed on OPA unavailability
            log.error("OPA check failed — denying access", e);
            return new AuthorizationDecision(false);
        }
    }

    private OpaInput buildInput(Authentication auth, T object) {
        List<String> permissions = auth.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .toList();

        return OpaInput.builder()
            .subject(OpaSubject.builder()
                .userId(getCurrentUserId(auth))
                .permissions(permissions)
                .departmentId(getCurrentDepartmentId(auth))
                .build())
            .resource(extractResource(object))
            .action(extractAction(object))
            .build();
    }
}

// application.yml
opa:
  url: http://localhost:8181
```

> [!tip]
> OPA's REST API adds latency. Keep OPA on loopback (same pod in k8s, same host in Docker). Target < 5ms for policy evaluation. Use OPA bundles for distributing policies so all instances load policies from a central store without a network hop per request.

### Cerbos integration

Cerbos is an open-source, self-hosted authorization service with a richer policy DSL than raw OPA:

```yaml
# cerbos/policies/order_resource_policy.yaml
apiVersion: api.cerbos.dev/v1
resourcePolicy:
  version: "default"
  resource: order
  rules:
    - actions: ["read"]
      effect: EFFECT_ALLOW
      roles: ["admin", "manager"]

    - actions: ["read"]
      effect: EFFECT_ALLOW
      roles: ["user"]
      condition:
        match:
          expr: request.resource.attr.ownerId == request.principal.id

    - actions: ["approve"]
      effect: EFFECT_ALLOW
      roles: ["approver"]
      condition:
        match:
          all:
            of:
              - expr: request.resource.attr.requestedById != request.principal.id
              - expr: request.resource.attr.amount <= 50000
```

```java
// Cerbos Java SDK (io.cerbos:cerbos-sdk-java)
@Component
@RequiredArgsConstructor
public class CerbosAuthorizationService {

    private final CerbosBlockingClient cerbos;

    public boolean isAllowed(UserDetails user, String resourceId,
                             Map<String, Value> resourceAttrs, String action) {
        CheckResourcesResponse response = cerbos.checkResources(
            Principal.newInstance(user.getUsername())
                .withRoles(extractRoles(user))
                .withAttribute("department", stringValue(getDepartment(user))),
            ResourceList.newInstance()
                .addResource(
                    Resource.newInstance("order", resourceId)
                        .withAttributes(resourceAttrs),
                    action
                )
        );

        return response.isAllowed(resourceId, action);
    }
}
```

### SpiceDB / Authzed — relationship-based access (ReBAC)

SpiceDB implements Google Zanzibar (the model behind Google Drive sharing). Use it when your authorization is fundamentally about *graph relationships*: "User A can edit Document D if A is a member of Group G which has editor access to Folder F which contains D."

```
// SpiceDB schema (Authzed Schema Language)
definition user {}

definition organization {
    relation member: user
    relation admin: user
    permission manage = admin
}

definition project {
    relation org: organization
    relation viewer: user | organization#member
    relation editor: user | organization#member
    relation owner: user
    permission read   = viewer + editor + owner + org->admin
    permission write  = editor + owner + org->admin
    permission delete = owner + org->admin
}
```

```java
// SpiceDB Java client (com.authzed.api:authzed)
@Service
@RequiredArgsConstructor
public class SpiceDBAuthorizationService {

    private final PermissionsServiceGrpc.PermissionsServiceBlockingStub spicedb;

    public boolean canUserReadProject(String userId, String projectId) {
        CheckPermissionRequest request = CheckPermissionRequest.newBuilder()
            .setResource(ObjectReference.newBuilder()
                .setObjectType("project")
                .setObjectId(projectId))
            .setPermission("read")
            .setSubject(SubjectReference.newBuilder()
                .setObject(ObjectReference.newBuilder()
                    .setObjectType("user")
                    .setObjectId(userId)))
            .build();

        CheckPermissionResponse response = spicedb.checkPermission(request);
        return response.getPermissionship() ==
            CheckPermissionResponse.Permissionship.PERMISSIONSHIP_HAS_PERMISSION;
    }
}
```

---

## Decision matrix — which model to use

| Scenario | Recommended |
|---|---|
| Simple roles, < 10 rule types | RBAC — `@PreAuthorize` + `hasRole` |
| Resource ownership + a few resource attributes | Permission-based + `PermissionEvaluator` |
| Complex rules with many attributes, business conditions | Custom `AuthorizationManager` or **Cerbos** |
| Policy-as-code, centralized across multiple services | **OPA** |
| Graph/hierarchy relationships (Google Drive sharing model) | **SpiceDB / ReBAC** |
| Compliance-heavy: audit trail of every policy evaluation | **Cerbos** (built-in audit) or OPA with decision logs |
| Prototype / small team | Stay in Spring — avoid external dependencies until you feel pain |

> [!warning]
> Don't adopt OPA/Cerbos/SpiceDB prematurely. Each adds an operational dependency, a network hop, and a new language to learn. Start with Spring's built-in tools and migrate when you hit concrete scaling problems.

---

## Caching authorization decisions safely

```java
@Component
@RequiredArgsConstructor
public class CachingAuthorizationManager<T> implements AuthorizationManager<T> {

    private final OpaAuthorizationManager<T> delegate;
    private final Cache authzCache;  // Caffeine cache

    @Override
    public AuthorizationDecision check(Supplier<Authentication> authSupplier,
                                       T object) {
        Authentication auth = authSupplier.get();
        String cacheKey = buildKey(auth.getName(), object);

        AuthorizationDecision cached = authzCache.getIfPresent(cacheKey);
        if (cached != null) return cached;

        AuthorizationDecision decision = delegate.check(authSupplier, object);
        // Only cache ALLOW decisions — DENY may be stale if data changes
        if (decision.isGranted()) {
            authzCache.put(cacheKey, decision);
        }
        return decision;
    }
}
```

> [!danger]
> Caching authorization decisions is risky. A cached ALLOW becomes incorrect the moment: the resource changes owner, the user's role changes, or the resource status changes. Set very short TTLs (< 30 seconds) or cache only on read-heavy immutable resources. When in doubt, don't cache authorization — cache the policy input data (user attributes, resource attributes) instead.

---

## Express/TS comparison

OPA has a Node.js SDK (`@open-policy-agent/opa-wasm` for WASM, or HTTP calls for the sidecar model). Cerbos has a Node.js SDK (`@cerbos/http`). The pattern is the same:

```typescript
// Node.js + Cerbos
const client = new HTTP({ hostname: 'localhost:3592' });

const decisions = await client.checkResources({
  principal: { id: user.id, roles: user.roles, attributes: { dept: user.dept } },
  resources: [{
    resource: { kind: 'order', id: order.id, attributes: { ownerId: order.ownerId } },
    actions: ['read', 'approve']
  }]
});

if (!decisions.isAllowed(order.id, 'approve')) {
  return res.status(403).json({ error: 'Forbidden' });
}
```

The structural advantage of the Spring approach: `@PreAuthorize("hasPermission(...)")` enforces the check even when the service method is called from a non-HTTP context (scheduled job, Kafka consumer). In Express, you enforce at the route level and may forget to check in a background worker.

---

## Gotchas

> [!danger]
> **Fail closed on policy engine unavailability.** If OPA/Cerbos is down, deny all requests — do not fall back to allowing. A flimsy fallback is worse than downtime.

> [!warning]
> **OPA bundle staleness.** When OPA loads policies from a bundle, there's a propagation delay when policies change. During that window, old policies are active. Design policy changes to be additive (add new rules before removing old ones) to avoid authorization gaps.

> [!warning]
> **SpiceDB eventual consistency.** SpiceDB offers zookie-based consistency tokens to avoid new-enemy problems. If you write a permission relationship and immediately check it, you may get a stale answer. Always pass the zookie from the write operation to subsequent read operations.

---

## Production checklist

- [ ] Decision matrix documented in ADR: why RBAC/ABAC/ReBAC/OPA was chosen
- [ ] Policy engine (OPA/Cerbos) deployed on loopback or same-pod — not across network
- [ ] Timeout set on policy engine calls (< 50ms)
- [ ] Fail-closed behaviour on policy engine unavailability
- [ ] Policy changes are additive (no gap where neither old nor new rule applies)
- [ ] Authorization decision caching TTL ≤ 30 seconds, with manual invalidation hooks
- [ ] Integration test: change a resource attribute, verify auth decision changes
- [ ] Audit log captures all DENY decisions (see [[16-Audit-Logging-and-Compliance]])
- [ ] For SpiceDB: zookie tokens used for consistency on write-then-check flows

---

## Related

- [[09-RBAC-Production-Patterns]]
- [[10-Permission-Based-Granular-Authorization]]
- [[05-Method-Security]]
- [[01-Spring-Security-Concepts]]
- [[16-Audit-Logging-and-Compliance]]
- [[15-Multi-Tenancy-Security]]
