---
tags: [security, method-security, authorization, preauthorize]
aliases: [PreAuthorize, PostAuthorize, Secured, Method Security]
stage: intermediate
---

# Method Security

> [!info] For the Express/TS dev
> URL-level auth (`requestMatchers("/admin/**").hasRole("ADMIN")`) is route-based — like `app.use('/admin', requireRole('admin'))` in Express. Method security takes it deeper: annotate any service method (`@PreAuthorize("hasRole('ADMIN')")`) and Spring blocks the call. Closer to a `@guard` decorator in NestJS.

## Concept / How it works

Enable with `@EnableMethodSecurity` (Spring Security 6+). Underneath, Spring Security registers an AOP advisor that intercepts annotated methods.

| Annotation | When checked | Use |
| --- | --- | --- |
| `@PreAuthorize` | Before invocation | Most common |
| `@PostAuthorize` | After invocation, can inspect return value | "User can only read their own data" |
| `@PreFilter` | Before invocation, filters input collection | Drop unauthorized items from input |
| `@PostFilter` | After invocation, filters return collection | Drop unauthorized items from output |
| `@Secured` | Before invocation, role-only | Legacy; prefer `@PreAuthorize` |
| `@RolesAllowed` | JSR-250 | Legacy; prefer `@PreAuthorize` |

## Code example

### Enable

```java
@Configuration
@EnableMethodSecurity                       // enables @PreAuthorize/@PostAuthorize
public class MethodSecurityConfig { }
```

### Common patterns

```java
@Service
public class OrderService {

    @PreAuthorize("hasRole('ADMIN')")
    public void deleteAll() { ... }

    @PreAuthorize("hasAnyRole('ADMIN','SUPPORT')")
    public List<Order> all() { ... }

    @PreAuthorize("hasAuthority('orders:read')")
    public Order get(Long id) { ... }

    // Reference method arguments
    @PreAuthorize("#userId == authentication.principal.id or hasRole('ADMIN')")
    public List<Order> ordersOf(Long userId) { ... }

    // Reference fields on parameter objects
    @PreAuthorize("#req.userId == authentication.principal.id")
    public Order create(@P("req") CreateOrderRequest req) { ... }

    // Anonymous (logged out)
    @PreAuthorize("isAnonymous()")
    public void registerWaitingList(String email) { ... }

    // Custom bean expression
    @PreAuthorize("@orderSecurity.canEdit(#id, authentication)")
    public Order update(Long id, UpdateOrderRequest req) { ... }
}
```

### `@PostAuthorize` — check the return value

```java
@PostAuthorize("returnObject.userId == authentication.principal.id or hasRole('ADMIN')")
public Order findById(Long id) {
    return repo.findById(id).orElseThrow();
}
```

If the order's `userId` doesn't match the principal's id and they're not admin, Spring throws `AccessDeniedException` after the method runs. Used sparingly because the method already ran (DB query already happened) — but indispensable when the authorization rule depends on the data itself.

### `@PostFilter` — filter collections

```java
@PostFilter("filterObject.userId == authentication.principal.id or hasRole('ADMIN')")
public List<Order> all() {
    return repo.findAll();
}
```

Each element where the predicate is `false` is removed.

### Custom security bean

```java
@Component("orderSecurity")
public class OrderSecurity {

    private final OrderRepository repo;

    public OrderSecurity(OrderRepository repo) { this.repo = repo; }

    public boolean canEdit(Long orderId, Authentication auth) {
        if (auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) return true;
        Long callerId = ((AppUser) auth.getPrincipal()).getId();
        return repo.findById(orderId)
                .map(o -> o.getCustomer().getId().equals(callerId))
                .orElse(false);
    }
}
```

Reference it from `@PreAuthorize("@orderSecurity.canEdit(#id, authentication)")`.

### Using `@AuthenticationPrincipal` together

You can pass your custom principal type directly into the SpEL:

```java
@PreAuthorize("#user.id == #ownerId or hasRole('ADMIN')")
public Resource read(Long ownerId, @AuthenticationPrincipal AppUser user) { ... }
```

### Class-level

```java
@RestController
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {
    // every method requires ROLE_ADMIN, individual methods can override
    @GetMapping("/audit")
    @PreAuthorize("hasAuthority('audit:read')")   // overrides
    public List<AuditEntry> audit() { ... }
}
```

## Express/TS comparison

```ts
// NestJS guard equivalent
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Get('/orders')
findAll() { ... }

// Express (manual)
router.get('/orders/:id', async (req, res, next) => {
  const order = await getOrder(req.params.id);
  if (order.userId !== req.user.id && !req.user.roles.includes('ADMIN'))
    return res.status(403).end();
  res.json(order);
});
```

| Other frameworks | Spring Security |
| --- | --- |
| NestJS `@Roles('ADMIN') @UseGuards(RolesGuard)` | `@PreAuthorize("hasRole('ADMIN')")` |
| Custom guard with method args | `@PreAuthorize("@bean.method(#arg, authentication)")` |
| Manual `req.user` checks in handler | `@PostAuthorize` on the result |
| Filter array post-fetch | `@PostFilter` |

## SpEL cheat sheet

| Expression | Meaning |
| --- | --- |
| `hasRole('X')` | Has `ROLE_X` |
| `hasAnyRole('X','Y')` | Has either |
| `hasAuthority('s:r')` | Exact authority |
| `hasAnyAuthority(...)` | Any of |
| `isAuthenticated()` | Logged in (not anonymous) |
| `isAnonymous()` | Not logged in |
| `isFullyAuthenticated()` | Not via remember-me |
| `permitAll()` / `denyAll()` | Always / never |
| `principal` | The principal (custom UserDetails or `Jwt`) |
| `authentication` | The full `Authentication` object |
| `#argName` | Method argument |
| `returnObject` | Return value (in `@PostAuthorize`) |
| `filterObject` | Each element (in `@PreFilter`/`@PostFilter`) |
| `@beanName.method(...)` | Bean reference |

## Gotchas

> [!warning] Self-invocation (yet again)
> Method security uses AOP. Calling a `@PreAuthorize` method from another method in the SAME class skips the proxy — no check. Same fix as `@Transactional`/`@Cacheable`.

> [!warning] `@PostAuthorize` runs the method first
> If the method has side effects, they happen even if authorization fails. Use only for query methods.

> [!warning] Public methods only
> AOP proxies intercept public methods. `private` / `package-private` methods are NOT secured.

> [!warning] `@PreFilter`/`@PostFilter` mutates the collection
> If the underlying collection is immutable (e.g., from `Stream.toList()`), you'll get an exception. Return a mutable list.

> [!warning] Roles vs Authorities mismatch
> `hasRole('ADMIN')` checks `ROLE_ADMIN`. `hasAuthority('ADMIN')` checks the literal `ADMIN`. With JWTs claiming `roles: ["ADMIN"]`, Spring will store them as authorities `ROLE_ADMIN` if your converter prefixes `ROLE_` ([[04-JWT-with-Spring-Security]]).

> [!warning] `@Secured` doesn't support SpEL
> `@Secured("ROLE_ADMIN")` works; `@Secured("hasRole('ADMIN')")` does NOT. Use `@PreAuthorize` for expressions.

> [!tip] Test method security
> ```java
> @WithMockUser(roles = "ADMIN") @Test void admin_can_delete() { ... }
> ```

## Related

- [[01-Spring-Security-Concepts]]
- [[02-Configuration-and-SecurityFilterChain]]
- [[Spring-AOP]]
- [[04-JWT-with-Spring-Security]]
