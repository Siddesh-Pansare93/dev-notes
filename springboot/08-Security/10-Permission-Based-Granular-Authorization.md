# Permission-Based Granular Authorization

> [!info] Express/TS wale dev ke liye
> Node mein CASL use kiya hoga tumne — pata hai `can('read', 'Order', { ownerId: user.id })` kitna zyada expressive hai `checkRole('user')` se. Spring Security mein bhi bilkul yehi cheez hai, naam hai `PermissionEvaluator`, jo SpEL ke `hasPermission()` ko power deta hai. Is note mein dekhenge ise sahi tarike se kaise wire karte hain — object-level (row-level) aur field-level dono authorization ke saath.

## Concept / mental model

### Sirf roles se kaam kyun nahi chalta at scale?

Zara socho ek order management system — jaise Flipkart ka seller-cum-admin panel:

- `ROLE_MANAGER` — *saare* orders dekh sakta hai.
- `ROLE_USER` — sirf *apne* orders dekh sakta hai.
- `ROLE_APPROVER` — sirf ₹10,000 *se kam* ke orders approve kar sakta hai.
- `ROLE_ADMIN` — sab dekh aur approve kar sakta hai, lekin delete nahi — delete ke liye alag se `data:delete` chahiye.

Yeh rules sirf roles se clean tarike se model nahi ho sakte. Jaise hi rule mein *data ki value* aati hai — ownership, amount, status — waise hi tum RBAC (Role-Based Access Control) ki duniya se nikal ke permission-string ya attribute-based (ABAC) duniya mein chale jaate ho. Yeh bilkul waise hi hai jaise Swiggy pe sirf "delivery partner" role kaafi nahi — tumhe yeh bhi check karna padta hai ki "yeh order isi partner ko assign hua tha ya nahi."

### Permission naming convention

```
resource:action[:scope]

order:read              # kisi bhi order ko read karo
order:read:own          # sirf apna order read karo
order:write             # order create/update karo
order:write:own         # sirf apna order create/update karo
order:approve           # koi bhi order approve karo
order:approve:low-value # sirf $10k se kam ke orders approve karo
user:manage             # full user administration
report:view             # reports module access karo
data:delete             # hard-delete kuch bhi (sirf admin ke liye)
```

> [!tip]
> `:own` scope suffix ek convention hai, Spring ka koi built-in feature nahi. Tumhara `PermissionEvaluator` implementation hi is suffix ko padh ke ownership check enforce karega. Spring ko khud kuch pata nahi ki "own" ka matlab kya hai — yeh sab tumhara likha hua logic hai.

---

## Code examples

### `PermissionEvaluator` — pura implementation

Socho `PermissionEvaluator` ek bouncer hai jo club (tumhara API) ke gate pe khada hai. Uske paas do tarike se log aate hain — kabhi sirf ID leke ("bhai is order ID ka access chahiye"), kabhi pura object leke ("yeh raha order, isko access karne do"). Dono cases handle karne padte hain.

```java
@Component
@RequiredArgsConstructor
public class AppPermissionEvaluator implements PermissionEvaluator {

    private final OrderRepository  orderRepo;
    private final UserRepository   userRepo;

    /**
     * hasPermission(#id, 'Order', 'read') se call hota hai — targetDomainObject null hota hai,
     * hume ID aur type alag arguments ke roop mein milte hain.
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
     * hasPermission(#order, 'read') se call hota hai — targetDomainObject actual object hota hai.
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
        // Unrestricted permission hai toh DB call avoid karo
        if (hasAuthority(auth, "order:" + perm)) return true;
        if (!hasAuthority(auth, "order:" + perm + ":own")) return false;
        // DB call sirf tab jab :own scope involve ho
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
        // Assume kar rahe hain tumhari UserDetails impl mein getId() hai
        return ((CustomUserDetails) auth.getPrincipal()).getId();
    }
}
```

```java
// Method security mein wire karo
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

Dekha kaise `checkOrderPermission` pehle cheap check karta hai (`hasAuthority` — sirf authorities list mein dekhna hai, koi DB call nahi), aur DB call sirf tab karta hai jab zaroorat pade? Yeh bilkul ek chaiwale jaisa hai jo pehle poochta hai "regular customer ho?" (fast check), aur sirf tab register kholta hai jab pehchan na paaye.

### `@PreAuthorize` ke saath `hasPermission` use karna

```java
@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository repo;

    // Pehle entity load karo, phir check karo — return object @PostAuthorize ko milta hai
    @PostAuthorize("hasPermission(returnObject, 'read')")
    public Order findById(Long id) {
        return repo.findById(id).orElseThrow();
    }

    // ID-based check load karne se pehle — sasta hai (deny hone pe DB hit nahi hota)
    @PreAuthorize("hasPermission(#id, 'Order', 'read')")
    public Order findByIdSecure(Long id) {
        return repo.findById(id).orElseThrow();
    }

    @PreAuthorize("hasPermission(#id, 'Order', 'write')")
    public Order update(Long id, UpdateOrderRequest req) {
        Order order = repo.findById(id).orElseThrow();
        // updates apply karo...
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
> `@PostAuthorize` object ko DB se load karta hai *permission check hone se pehle*. Jab bhi ownership bina pura entity load kiye pata chal sake, `@PreAuthorize` ke saath ID-based check ko prefer karo. `@PostAuthorize` sirf tab use karo jab genuinely object ki state dekhe bina decide hi nahi ho sakta.

### Query results filter karna — `@PostFilter` aur custom repositories

Kya hota hai jab tumhe ek poori list return karni ho, lekin usme se sirf woh items dikhane ho jo user access kar sakta hai? Do tarike hain — ek "sab load karo, phir chhaanto" (aasan lekin slow), doosra "database se hi sirf zaruri rows maango" (thoda extra kaam, lekin fast).

```java
// Option A: @PostFilter — Spring pura list iterate karke unauthorized items hata deta hai.
// Sirf chhote result sets ke liye use karo — yeh pehle DB se sab kuch load karta hai.
@PostFilter("hasPermission(filterObject, 'read')")
public List<Order> findAll() {
    return repo.findAll();
}

// Option B: query mein hi ownership inject karo — lakhon rows tak scale karta hai
public interface OrderRepository extends JpaRepository<Order, Long> {

    @Query("""
        SELECT o FROM Order o
        WHERE (:ownerId IS NULL OR o.ownerId = :ownerId)
          AND o.status IN :statuses
        """)
    Page<Order> findByOwnerOrAll(
        @Param("ownerId") Long ownerId,   // admins ke liye null, jinke paas order:read hai
        @Param("statuses") Set<OrderStatus> statuses,
        Pageable pageable
    );
}

// Service mein:
public Page<Order> search(OrderSearchRequest req, Authentication auth) {
    Long ownerId = hasAuthority(auth, "order:read") ? null : currentUserId(auth);
    return repo.findByOwnerOrAll(ownerId, req.statuses(), req.pageable());
}
```

Yeh bilkul waise hi hai jaise agar tum Swiggy ki team mein ho aur tumhe apne saare orders dikhane ho — koi sahi engineer poora database query nahi karega aur phir application mein filter nahi karega, seedha `WHERE user_id = ?` laga dega query mein. `@PostFilter` waala approach us jaisa hai jaise tum poora restaurant ka menu utha lo aur phir ghar pe baithke chhaanto ki tumhe kya-kya pasand hai — kaam ho jaata hai, lekin waste bahut hota hai.

### `AuthorizationManager<T>` — programmatic fine-grained checks

Jab rules itne complex ho jaayein ki SpEL expression mein likhna bhi ajeeb lage, tab poora Java class bana lo:

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

        boolean granted = /* tumhara complex logic yahan */ false;
        return new AuthorizationDecision(granted);
    }
}
```

---

## Field-level authorization — role ke hisaab se data chhupana (redact karna)

Kabhi kabhi poora object toh dikhana hai, lekin usme se kuch fields kuch logon se chhupane hain. Jaise CRED app mein — normal user ko sirf apna credit score dikhta hai, lekin internal ops team ko poora risk profile dikhta hai. Isi ko field-level authorization kehte hain.

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

    @JsonView(Views.Internal.class)   // sirf managers+ ke liye
    private BigDecimal totalAmount;

    @JsonView(Views.Admin.class)      // sirf admin ke liye
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
> Serializer ke andar `SecurityContextHolder` access karna ek code smell hai — isse tumhara domain model security layer se tightly coupled ho jaata hai. `@JsonView` ke saath controller mein view select karna prefer karo, ya har role ke liye alag DTO class banao (sabse explicit, sabse maintainable approach).

---

## "Owner hai YA admin permission hai" pattern

Yeh sabse common ownership check pattern hai — production mein baar baar milega:

```java
@PreAuthorize("""
    hasAuthority('order:read')
    or
    (hasAuthority('order:read:own') and #id == authentication.principal.id)
    """)
public Order findByIdForUser(Long id) { ... }
```

Ya phir `PermissionEvaluator` ke through (complex logic ke liye zyada clean):

```java
@PreAuthorize("hasPermission(#id, 'Order', 'read')")
public Order findByIdForUser(Long id) { ... }
// PermissionEvaluator "any vs own" ka pura branching internally handle karta hai
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

// Route handler mein:
const ability = defineAbilityFor(req.user);
if (ability.cannot('read', order)) {
  return res.status(403).json({ error: 'Forbidden' });
}
```

```java
// Spring equivalent — same meaning, alag syntax
@PreAuthorize("hasPermission(#id, 'Order', 'read')")
public Order getOrder(Long id) {
    return repo.findById(id).orElseThrow();
}

// PermissionEvaluator wahi logic implement karta hai jo CASL ka defineAbility karta hai:
// hasAuthority('order:read') → admins ke liye can('read', 'Order')
// hasAuthority('order:read:own') → can('read', 'Order', { ownerId: user.id })
```

Mental model bilkul same hai. CASL ka `defineAbility` map hota hai `PermissionEvaluator` se; CASL ka `can/cannot` map hota hai `hasPermission()` se; CASL ki conditions (`{ ownerId: user.id }`) map hoti hain `hasPermission` ke andar ke DB check se. Farak sirf itna hai — CASL imperatively middleware mein check hota hai, jabki Spring ka check method pe declarative hota hai aur *har* caller ke liye fire hota hai, chahe woh scheduled job hi kyun na ho.

---

## Gotchas — yahan log fasenge

> [!danger]
> **Bade collections pe `@PostFilter` ek performance disaster hai.** Spring pehle DB se har entity load karta hai, phir memory mein iterate karke unauthorized ones hata deta hai. Jaise agar tumhare paas 1 lakh orders hain aur user ke paas sirf 5 access hain, toh Spring pehle **saare 1 lakh** load karega, phir 99,995 phenk dega. Query-level filtering use karo (repository ko `ownerId` pass karo) ~50 se zyada items waale kisi bhi collection ke liye.

> [!warning]
> **`@PreAuthorize` inherit nahi hota.** Agar koi subclass secured method ko override karti hai bina `@PreAuthorize` re-declare kiye, toh security check gayab ho jaata hai — silently! Hamesha concrete method pe hi annotate karo, sirf interface/superclass pe nahi. (Spring Security 6.3+ mein kuch improvements hain, par explicit annotation abhi bhi safest hai.)

> [!warning]
> **`SecurityContext` thread-local hota hai.** `@Async` methods ya virtual threads use karte waqt, `SecurityContext` automatically propagate nahi hota. `DelegatingSecurityContextExecutor` configure karo, ya `SecurityContextHolder.setStrategyName(SecurityContextHolder.MODE_INHERITABLETHREADLOCAL)` use karo — lekin thread pools ke liye iske implications samajh ke hi karo. Node se aane waalon ke liye — yeh us jaisa hai jaise ek naye async callback mein `req` object accidentally undefined aa jaaye kyunki context transfer hi nahi hua.

> [!danger]
> **Authorization logic sirf controller layer mein mat rakho.** Services aur repositories scheduled tasks, message consumers, aur admin CLI commands se bhi call ho sakte hain — inme se koi bhi HTTP filter chain se nahi guzarta. Service method pe `@PreAuthorize` ek defense-in-depth hai jo akela controller layer nahi de sakta. Socho — tumne UPI transaction ka authorization sirf REST controller mein likha, lekin ek background reconciliation job seedha service call kar rahi hai — woh job bina kisi check ke sab kuch access kar legi.

---

## Production checklist

- [ ] Permission naming `resource:action[:scope]` convention follow karti hai
- [ ] `AppPermissionEvaluator` kam se kam top 3 resource types handle karta hai
- [ ] `@PostFilter` ko replace kar diya gaya hai repository-level filtering se un saare collections mein jo > 50 items ke hain
- [ ] `@PreAuthorize` ko `@PostAuthorize` se prefer kiya gaya hai jahan bhi possible ho (sasta padta hai)
- [ ] Field-level redaction `@JsonView` ya separate DTO classes use karta hai (serializer mein `SecurityContextHolder` nahi)
- [ ] `PermissionEvaluator` ke unit tests hain: own-resource allowed, other-resource denied, admin hamesha allowed
- [ ] Authorization logic sirf controllers mein nahi rehti
- [ ] `@EnableMethodSecurity` configured hai `MethodSecurityExpressionHandler` ke saath jo `PermissionEvaluator` wire karta hai
- [ ] Async methods `DelegatingSecurityContextExecutor` use karte hain `SecurityContext` propagate karne ke liye

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
