# ABAC and Policy Engines

> [!info] Express/TS wale dev ke liye
> CASL basically ABAC-lite hai. Jab tumhare CASL `defineAbility` functions badhte-badhte sau-sau lines ke ho jaate hain, tab teams dedicated policy engine ki taraf jaati hain. Ye note poora spectrum cover karta hai: custom Spring `AuthorizationManager` → OPA → Cerbos → SpiceDB, saath mein ek decision guide bhi.

## Concept / mental model

### RBAC kab kaam nahi karta

Socho tum Zomato ke backend pe kaam kar rahe ho. RBAC mein bas itna hota hai — "delivery-partner", "restaurant-owner", "admin" jaise roles, aur har role ke fixed permissions. Lekin real duniya mein rules itne simple nahi hote. RBAC wahan fail hota hai jab authorization rules in cheezon pe depend karte hain:

- **Resource attributes** — "sirf ₹50,000 se kam ke invoice approve kar sakte ho"
- **Subject attributes** — "EU ke users sirf EU ka data dekh sakte hain"
- **Environmental attributes** — "admin actions sirf business hours mein allowed hain"
- **Relationship graphs** — "edit kar sakte ho agar tum project ke collaborator ho, ya project tumhari organization ka hai"

Classic signal ye hai: tumhara `@PreAuthorize` SpEL, service methods ko call kar raha hai sirf data load karne ke liye taaki decide kiya ja sake ki call allow karni hai ya nahi. Bhai, ye toh ABAC hi hai — bas tumne isko naam nahi diya.

### Four-factor ABAC model

Ise yaad rakhne ka sabse aasan tarika — jaise Swiggy order approve karne se pehle 4 cheezein check karta hai: kaun order kar raha hai, kya order kar raha hai, kya karna chahta hai, aur kis situation mein:

```
Decision = Policy(Subject, Resource, Action, Environment)

Subject:     kaun request kar raha hai?         (user id, roles, department, clearance level)
Resource:    kis cheez ko touch kar raha hai?   (order id, status, owner, amount)
Action:      kya kar raha hai?                  (read, write, approve, delete)
Environment: request ka context                 (time, IP, request path, tenant)
```

---

## Code examples

### Custom `AuthorizationManager` attributes ke saath

Moderate complexity ke liye jahan external policy engine laane ki zarurat nahi hai — apna khud ka `AuthorizationManager` likh lo:

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

        // Rule 1: global approvers kuch bhi approve kar sakte hain
        if (hasAuthority(auth, "invoice:approve")) {
            return new AuthorizationDecision(true);
        }
        // Rule 2: department managers apne department ke invoices approve
        //         kar sakte hain agar amount unki limit ke andar hai
        if (hasAuthority(auth, "invoice:approve:dept")
            && currentUser.getDepartmentId().equals(invoice.getDepartmentId())
            && invoice.getAmount().compareTo(SELF_APPROVE_LIMIT) <= 0) {
            return new AuthorizationDecision(true);
        }
        // Rule 3: apna khud ka request kabhi bhi self-approve nahi kar sakte
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

// Wire it — method-level ke liye InterceptorAopBean use karo
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

### OPA (Open Policy Agent) ke saath integration via REST sidecar

OPA sidecar ki tarah chalta hai (Docker/k8s mein), aur tumhara Spring app usko HTTP calls karta hai — bilkul waise jaise tum kisi internal microservice ko call karte ho:

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

# Admins kuch bhi kar sakte hain
allow if {
    "order:manage" in input.subject.permissions
}

# Users apna khud ka order read kar sakte hain
allow if {
    input.action == "read"
    "order:read:own" in input.subject.permissions
    input.resource.ownerId == input.subject.userId
}

# Managers apne department ke saare orders read kar sakte hain
allow if {
    input.action == "read"
    "order:read" in input.subject.permissions
    input.resource.departmentId == input.subject.departmentId
}

# Self-approval kabhi allow nahi
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

    private final WebClient opaClient;    // OPA sidecar ki taraf point karta hai
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
                .block(Duration.ofMillis(50));  // tight timeout — policy loopback pe hai

            return new AuthorizationDecision(
                response != null && Boolean.TRUE.equals(response.getResult())
            );
        } catch (Exception e) {
            // OPA unavailable ho toh fail closed — deny kar do
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
> OPA ka REST API latency add karta hai. OPA ko hamesha loopback pe rakho (k8s mein same pod, Docker mein same host). Policy evaluation ka target < 5ms rakho. Policies distribute karne ke liye OPA bundles use karo, taaki har instance central store se policies load kare bina har request pe network hop kiye — jaise CDN se static assets serve karte ho, waise hi.

### Cerbos integration

Cerbos ek open-source, self-hosted authorization service hai jiska policy DSL raw OPA se zyada rich hai — thoda zyada "developer-friendly" bolo:

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

SpiceDB, Google Zanzibar model implement karta hai — wahi model jo Google Drive ke sharing ke peeche hai. Isko use karo jab tumhara authorization fundamentally *graph relationships* ke baare mein ho — jaise: "User A, Document D ko edit kar sakta hai agar A, Group G ka member hai, jiske paas Folder F pe editor access hai, aur Folder F mein D hai." Soch lo jaise ek WhatsApp group ka admin, sub-groups pe permissions cascade kar raha ho.

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

## Decision matrix — kaunsa model kab use karein

| Scenario | Recommended |
|---|---|
| Simple roles, < 10 rule types | RBAC — `@PreAuthorize` + `hasRole` |
| Resource ownership + thode se resource attributes | Permission-based + `PermissionEvaluator` |
| Complex rules, kai attributes, business conditions | Custom `AuthorizationManager` ya **Cerbos** |
| Policy-as-code, multiple services mein centralized | **OPA** |
| Graph/hierarchy relationships (Google Drive sharing jaisa model) | **SpiceDB / ReBAC** |
| Compliance-heavy: har policy evaluation ka audit trail chahiye | **Cerbos** (built-in audit) ya OPA with decision logs |
| Prototype / chhoti team | Spring mein hi raho — jab tak dard na ho, external dependency mat lo |

> [!warning]
> OPA/Cerbos/SpiceDB ko premature adopt mat karo. Har ek operational dependency, network hop, aur naya language sikhne ka overhead add karta hai. Spring ke built-in tools se shuru karo, aur jab concrete scaling problem face karo tabhi migrate karo. Zomato bhi din 1 se microservices mein nahi tha — monolith se shuru hua tha.

---

## Authorization decisions safely cache karna

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
        // Sirf ALLOW decisions cache karo — DENY stale ho sakta hai agar data change ho jaaye
        if (decision.isGranted()) {
            authzCache.put(cacheKey, decision);
        }
        return decision;
    }
}
```

> [!danger]
> Authorization decisions cache karna risky hai. Ek cached ALLOW galat ho jaata hai jaise hi: resource ka owner change ho, user ka role change ho, ya resource ka status change ho. Bahut chhota TTL rakho (< 30 seconds), ya sirf read-heavy immutable resources pe cache karo. Confusion ho toh authorization cache mat karo — uski jagah policy input data (user attributes, resource attributes) ko cache karo. Socho jaise UPI transaction cache nahi hota, lekin merchant ka static profile cache ho sakta hai.

---

## Express/TS comparison

OPA ka Node.js SDK hai (`@open-policy-agent/opa-wasm` WASM ke liye, ya sidecar model ke liye plain HTTP calls). Cerbos ka bhi Node.js SDK hai (`@cerbos/http`). Pattern wahi hai jo Spring mein hai:

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

Spring approach ka structural advantage ye hai: `@PreAuthorize("hasPermission(...)")` check ko enforce karta hai chahe service method non-HTTP context se call ho — scheduled job ho ya Kafka consumer. Express mein tum route level pe enforce karte ho, aur background worker mein check karna bhool sakte ho — production mein ye ek chhupa hua landmine ban jaata hai.

---

## Gotchas

> [!danger]
> **Policy engine unavailable ho toh fail closed raho.** Agar OPA/Cerbos down hai, toh saari requests deny karo — allow karne pe fallback mat karo. Ek weak fallback, downtime se bhi zyada bura hota hai. Socho — agar Paytm ka fraud-check service down ho jaaye, toh woh transactions block karega, allow nahi.

> [!warning]
> **OPA bundle staleness.** Jab OPA bundle se policies load karta hai, policies change hone par ek propagation delay hota hai. Us window mein purani policies hi active rehti hain. Policy changes ko additive design karo (purani rules hatane se pehle nayi rules add karo) taaki authorization gap na aaye.

> [!warning]
> **SpiceDB eventual consistency.** SpiceDB zookie-based consistency tokens deta hai taaki "new enemy problem" avoid ho. Agar tum ek permission relationship write karte ho aur turant check karte ho, toh stale answer mil sakta hai. Hamesha write operation ka zookie, baad ke read operations mein pass karo.

---

## Production checklist

- [ ] Decision matrix ADR mein documented hai: kyun RBAC/ABAC/ReBAC/OPA choose kiya
- [ ] Policy engine (OPA/Cerbos) loopback ya same-pod pe deployed hai — network ke across nahi
- [ ] Policy engine calls pe timeout set hai (< 50ms)
- [ ] Policy engine unavailable hone par fail-closed behaviour hai
- [ ] Policy changes additive hain (koi gap nahi jahan na purani rule apply ho na nayi)
- [ ] Authorization decision caching TTL ≤ 30 seconds, manual invalidation hooks ke saath
- [ ] Integration test: resource attribute change karo, verify karo ki auth decision badalta hai
- [ ] Audit log saari DENY decisions capture karta hai (dekho [[16-Audit-Logging-and-Compliance]])
- [ ] SpiceDB ke liye: zookie tokens write-then-check flows mein consistency ke liye use ho rahe hain

---

## Related

- [[09-RBAC-Production-Patterns]]
- [[10-Permission-Based-Granular-Authorization]]
- [[05-Method-Security]]
- [[01-Spring-Security-Concepts]]
- [[16-Audit-Logging-and-Compliance]]
- [[15-Multi-Tenancy-Security]]
