---
tags: [security, production, authorization, permissions, abac, casl, permission-evaluator]
aliases: [Granular Authorization, Permission-Based Auth, PermissionEvaluator, Object-Level Security]
stage: advanced
---

# Permission-Based Granular Authorization

> [!info] For the Express/TS dev
> You've used CASL in Node — you know that `can('read', 'Order', { ownerId: user.id })` is far more expressive than `checkRole('user')`. Spring Security has an equivalent mechanism called `PermissionEvaluator` that powers `hasPermission()` in SpEL. This note shows how to wire it up properly, including object-level (row-level) and field-level authorization.

## Concept / mental model

### Why role-only fails at scale

Imagine an order management system:

- `ROLE_MANAGER` can view *all* orders.
- `ROLE_USER` can view *their own* orders only.
- `ROLE_APPROVER` can approve orders *under $10,000*.
- A `ROLE_ADMIN` can view and approve everything but cannot delete — deletion requires `data:delete`.

You cannot model these rules cleanly with roles alone. As soon as a rule involves *data values* (ownership, amount, status), you've left RBAC territory and entered permission-string or attribute-based territory.

### Permission naming convention

```
resource:action[:scope]

order:read              # read any order
order:read:own          # read only your own orders
order:write             # create/update orders
order:write:own         # create/update your own orders
order:approve           # approve an order (any)
order:approve:low-value # approve orders under $10k
user:manage             # full user administration
report:view             # access the reports module
data:delete             # hard-delete anything (admin-only)
```

> [!tip]
> The `:own` scope suffix is a convention, not a Spring feature. Your `PermissionEvaluator` implementation reads that suffix and enforces the ownership check.

---

## Code examples

### `PermissionEvaluator` — full implementation

```java
@Component
@RequiredArgsConstructor
public class AppPermissionEvaluator implements PermissionEvaluator {

    private final OrderRepository  orderRepo;
    private final UserRepository   userRepo;

    /**
     * Called by hasPermission(#id, 'Order', 'read') — targetDomainObject is null,
     * we receive the ID and type as separate arguments.
     */
    @Override
    public boolean hasPermission(Authentication auth,
                                 Object targetId,
                                 String targetType,
                                 Object permission) {
        if (auth == null || !auth.isAuthenticated()) return false;
        String perm = permission.toString();

        return switch (targetType) {
            case "Order"  -> checkOrderPermission(auth, (Long) targetId, perm);
            case "Report" -> checkReportPermission(auth, (Long) targetId, perm);
            default       -> false;
        };
    }

    /**
     * Called by hasPermission(#order, 'read') — targetDomainObject is the actual object.
     */
    @Override
    public boolean hasPermission(Authentication auth,
                                 Object targetDomainObject,
                                 Object permission) {
        if (targetDomainObject instanceof Order order) {
            return checkOrderPermission(auth, order, permission.toString());
        }
        return false;
    }

    private boolean checkOrderPermission(Authentication auth, Long orderId, String perm) {
        // Avoid DB call if user has unrestricted permission
        if (hasAuthority(auth, "order:" + perm)) return true;
        if (!hasAuthority(auth, "order:" + perm + ":own")) return false;
        // DB call only when :own scope is involved
        return orderRepo.existsByIdAndOwnerId(orderId, currentUserId(auth));
    }

    private boolean checkOrderPermission(Authentication auth, Order order, String perm) {
        if (hasAuthority(auth, "order:" + perm)) return true;
        if (!hasAuthority(auth, "order:" + perm + ":own")) return false;
        return order.getOwnerId().equals(currentUserId(auth));
    }

    private boolean checkReportPermission(Authentication auth, Long reportId, String perm) {
        return hasAuthority(auth, "report:" + perm);
    }

    private boolean hasAuthority(Authentication auth, String authority) {
        return auth.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals(authority));
    }

    private Long currentUserId(Authentication auth) {
        // Assumes your UserDetails impl exposes getId()
        return ((CustomUserDetails) auth.getPrincipal()).getId();
    }
}
```

```java
// Wire into method security
@Configuration
@EnableMethodSecurity
public class MethodSecurityConfig {

    @Bean
    public MethodSecurityExpressionHandler methodSecurityExpressionHandler(
            AppPermissionEvaluator permissionEvaluator) {
        var handler = new DefaultMethodSecurityExpressionHandler();
        handler.setPermissionEvaluator(permissionEvaluator);
        return handler;
    }
}
```

### Using `@PreAuthorize` with `hasPermission`

```java
@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository repo;

    // Load the entity then check — Spring passes the returned object to @PostAuthorize
    @PostAuthorize("hasPermission(returnObject, 'read')")
    public Order findById(Long id) {
        return repo.findById(id).orElseThrow();
    }

    // ID-based check before loading — cheaper (no DB hit if denied)
    @PreAuthorize("hasPermission(#id, 'Order', 'read')")
    public Order findByIdSecure(Long id) {
        return repo.findById(id).orElseThrow();
    }

    @PreAuthorize("hasPermission(#id, 'Order', 'write')")
    public Order update(Long id, UpdateOrderRequest req) {
        Order order = repo.findById(id).orElseThrow();
        // apply updates...
        return repo.save(order);
    }

    @PreAuthorize("hasAuthority('order:approve')")
    public Order approve(Long id) {
        Order order = repo.findById(id).orElseThrow();
        order.setStatus(OrderStatus.APPROVED);
        return repo.save(order);
    }
}
```

> [!warning]
> `@PostAuthorize` loads the object from the DB *before* checking permissions. Prefer `@PreAuthorize` with an ID-based check when the ownership is derivable without loading the full entity. Reserve `@PostAuthorize` for when you genuinely need the object state to decide.

### Filtering query results — `@PostFilter` and custom repositories

```java
// Option A: @PostFilter — Spring iterates the list and removes unauthorized items.
// Only use for small result sets — it loads everything from DB first.
@PostFilter("hasPermission(filterObject, 'read')")
public List<Order> findAll() {
    return repo.findAll();
}

// Option B: inject ownership into the query — scales to millions of rows
public interface OrderRepository extends JpaRepository<Order, Long> {

    @Query("""
        SELECT o FROM Order o
        WHERE (:ownerId IS NULL OR o.ownerId = :ownerId)
          AND o.status IN :statuses
        """)
    Page<Order> findByOwnerOrAll(
        @Param("ownerId") Long ownerId,   // null for admins with order:read
        @Param("statuses") Set<OrderStatus> statuses,
        Pageable pageable
    );
}

// In the service:
public Page<Order> search(OrderSearchRequest req, Authentication auth) {
    Long ownerId = hasAuthority(auth, "order:read") ? null : currentUserId(auth);
    return repo.findByOwnerOrAll(ownerId, req.statuses(), req.pageable());
}
```

### `AuthorizationManager<T>` — programmatic fine-grained checks

For complex rules that don't fit SpEL nicely:

```java
@Component
public class OrderAuthorizationManager
        implements AuthorizationManager<MethodInvocation> {

    @Override
    public AuthorizationDecision check(
            Supplier<Authentication> authSupplier,
            MethodInvocation invocation) {

        Authentication auth = authSupplier.get();
        Object[] args = invocation.getArguments();
        Long orderId = (Long) args[0];

        boolean granted = /* your complex logic */ false;
        return new AuthorizationDecision(granted);
    }
}
```

---

## Field-level authorization — redacting per role

### Option A: `@JsonView`

```java
// View markers
public class Views {
    public interface Public {}
    public interface Internal extends Public {}
    public interface Admin extends Internal {}
}

@Entity
public class Order {
    @JsonView(Views.Public.class)
    private Long id;

    @JsonView(Views.Public.class)
    private OrderStatus status;

    @JsonView(Views.Internal.class)   // managers+ only
    private BigDecimal totalAmount;

    @JsonView(Views.Admin.class)      // admin only
    private String internalNote;
}

@RestController
public class OrderController {

    @GetMapping("/orders/{id}")
    public MappingJacksonValue getOrder(@PathVariable Long id, Authentication auth) {
        Order order = orderService.findByIdSecure(id);
        MappingJacksonValue value = new MappingJacksonValue(order);

        if (hasAuthority(auth, "user:manage")) {
            value.setSerializationView(Views.Admin.class);
        } else if (hasAuthority(auth, "order:read")) {
            value.setSerializationView(Views.Internal.class);
        } else {
            value.setSerializationView(Views.Public.class);
        }
        return value;
    }
}
```

### Option B: custom Jackson serializer + `SecurityContext`

```java
@Component
public class OrderSerializer extends StdSerializer<Order> {

    public OrderSerializer() { super(Order.class); }

    @Override
    public void serialize(Order order, JsonGenerator gen,
                          SerializerProvider provider) throws IOException {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean isAdmin = hasAuthority(auth, "user:manage");
        boolean isInternal = hasAuthority(auth, "order:read");

        gen.writeStartObject();
        gen.writeNumberField("id", order.getId());
        gen.writeStringField("status", order.getStatus().name());
        if (isInternal) {
            gen.writeNumberField("totalAmount", order.getTotalAmount().doubleValue());
        }
        if (isAdmin) {
            gen.writeStringField("internalNote", order.getInternalNote());
        }
        gen.writeEndObject();
    }
}
```

> [!warning]
> Accessing `SecurityContextHolder` inside a serializer is a code smell — it couples your domain model to the security layer. Prefer `@JsonView` with the view selection in the controller, or use separate DTO classes per role (most explicit, most maintainable).

---

## "Is owner OR has admin permission" pattern

This is the most common ownership check pattern:

```java
@PreAuthorize("""
    hasAuthority('order:read')
    or
    (hasAuthority('order:read:own') and #id == authentication.principal.id)
    """)
public Order findByIdForUser(Long id) { ... }
```

Or via `PermissionEvaluator` (cleaner for complex logic):

```java
@PreAuthorize("hasPermission(#id, 'Order', 'read')")
public Order findByIdForUser(Long id) { ... }
// PermissionEvaluator handles the "any vs own" branching internally
```

---

## Express/TS comparison — CASL vs Spring PermissionEvaluator

```typescript
// CASL — express
import { defineAbility } from '@casl/ability';

function defineAbilityFor(user: User) {
  return defineAbility((can, cannot) => {
    if (user.role === 'admin') {
      can('manage', 'all');
    } else {
      can('read', 'Order', { ownerId: user.id });
      can('update', 'Order', { ownerId: user.id });
    }
  });
}

// In route handler:
const ability = defineAbilityFor(req.user);
if (ability.cannot('read', order)) {
  return res.status(403).json({ error: 'Forbidden' });
}
```

```java
// Spring equivalent — same semantics, different syntax
@PreAuthorize("hasPermission(#id, 'Order', 'read')")
public Order getOrder(Long id) {
    return repo.findById(id).orElseThrow();
}

// PermissionEvaluator implements the same logic as CASL's defineAbility:
// hasAuthority('order:read') → can('read', 'Order') for admins
// hasAuthority('order:read:own') → can('read', 'Order', { ownerId: user.id })
```

The mental model is identical. CASL's `defineAbility` maps to `PermissionEvaluator`; CASL's `can/cannot` maps to `hasPermission()`; CASL's conditions (`{ ownerId: user.id }`) map to the DB check inside `hasPermission`. The difference: CASL is checked imperatively in middleware; Spring's check is declarative on the method and fires for *every* caller, including scheduled jobs.

---

## Gotchas

> [!danger]
> **`@PostFilter` on large collections is a performance disaster.** Spring loads every entity from the DB, then iterates and removes unauthorized ones in memory. Use query-level filtering (pass `ownerId` to the repository) for any collection larger than ~50 items.

> [!warning]
> **`@PreAuthorize` is not inherited.** If a subclass overrides a secured method without re-declaring `@PreAuthorize`, the security check is gone. Always annotate on the concrete method, not just the interface/superclass. (Spring Security 6.3+ has improvements here, but explicit annotation is still safest.)

> [!warning]
> **`SecurityContext` is thread-local.** When using `@Async` methods or virtual threads, the `SecurityContext` may not propagate automatically. Configure `DelegatingSecurityContextExecutor` or use `SecurityContextHolder.setStrategyName(SecurityContextHolder.MODE_INHERITABLETHREADLOCAL)` — but understand the implications for thread pools.

> [!danger]
> **Don't put authorization logic in the controller layer only.** Services and repositories are callable from scheduled tasks, message consumers, and admin CLI commands — none of which go through the HTTP filter chain. `@PreAuthorize` on the service method is defense-in-depth that the controller layer alone cannot provide.

---

## Production checklist

- [ ] Permission naming follows `resource:action[:scope]` convention
- [ ] `AppPermissionEvaluator` handles at least the top 3 resource types
- [ ] `@PostFilter` replaced with repository-level filtering on all collections > 50 items
- [ ] `@PreAuthorize` preferred over `@PostAuthorize` where possible (cheaper)
- [ ] Field-level redaction uses `@JsonView` or separate DTO classes (not `SecurityContextHolder` in serializer)
- [ ] `PermissionEvaluator` has unit tests for: own-resource allowed, other-resource denied, admin always allowed
- [ ] No authorization logic lives solely in controllers
- [ ] `@EnableMethodSecurity` configured with `MethodSecurityExpressionHandler` wiring `PermissionEvaluator`
- [ ] Async methods use `DelegatingSecurityContextExecutor` to propagate `SecurityContext`

---

## Related

- [[09-RBAC-Production-Patterns]]
- [[11-ABAC-and-Policy-Engines]]
- [[05-Method-Security]]
- [[01-Spring-Security-Concepts]]
- [[02-Configuration-and-SecurityFilterChain]]
- [[04-JWT-with-Spring-Security]]
- [[16-Audit-Logging-and-Compliance]]
- [[02-Entity-Basics]]
