# Method Security

> [!info] Express/TS wale dev ke liye
> URL-level auth (`requestMatchers("/admin/**").hasRole("ADMIN")`) route-based hota hai — bilkul Express ke `app.use('/admin', requireRole('admin'))` jaisa. Method security isse ek level deeper le jaati hai: kisi bhi service method pe annotation laga do (`@PreAuthorize("hasRole('ADMIN')")`) aur Spring us call ko block kar dega. Ye NestJS ke `@guard` decorator ke sabse kareeb hai.

## Concept / Ye kaam kaise karta hai?

Socho tumne Zomato jaisa backend banaya hai. Controller level pe check laga diya "admin hi `/admin/**` routes hit kar sakta hai" — theek hai, lekin agar koi `OrderService.deleteAll()` method ko kisi aur jagah se, kisi doosre internal flow se, bina proper role check ke call kar de? URL-level guard wahan kaam nahi aayega, kyunki request wahan se aayi hi nahi.

Yahi problem method security solve karta hai — security ko method ke andar hi bolt kar do, chahe wo method kahin se bhi call ho (controller se, scheduler se, kisi doosre service se).

Enable karne ke liye bas `@EnableMethodSecurity` (Spring Security 6+) lagao. Underneath, Spring Security ek AOP advisor register karta hai jo annotated methods ko intercept karta hai — matlab jab bhi tum us method ko call karte ho, actual method chalne se pehle (ya baad mein) ek proxy beech mein aakar check karta hai "isko permission hai kya?"

| Annotation | Kab check hota hai | Use kab karein |
| --- | --- | --- |
| `@PreAuthorize` | Method call hone se PEHLE | Sabse common, 90% cases yahi |
| `@PostAuthorize` | Method chalne ke BAAD, return value dekh sakta hai | "User sirf apna hi data dekh sakta hai" |
| `@PreFilter` | Method call hone se pehle, input collection ko filter karta hai | Unauthorized items ko input se hata do |
| `@PostFilter` | Method chalne ke baad, return collection ko filter karta hai | Unauthorized items ko output se hata do |
| `@Secured` | Method call se pehle, sirf role check | Legacy hai; `@PreAuthorize` use karo |
| `@RolesAllowed` | JSR-250 standard | Legacy hai; `@PreAuthorize` use karo |

## Code example

### Enable karna

```java
@Configuration
@EnableMethodSecurity                       // @PreAuthorize/@PostAuthorize enable karta hai
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

    // Method ke arguments ko directly reference karo
    @PreAuthorize("#userId == authentication.principal.id or hasRole('ADMIN')")
    public List<Order> ordersOf(Long userId) { ... }

    // Parameter object ke fields ko reference karo
    @PreAuthorize("#req.userId == authentication.principal.id")
    public Order create(@P("req") CreateOrderRequest req) { ... }

    // Anonymous (logged out) user ke liye
    @PreAuthorize("isAnonymous()")
    public void registerWaitingList(String email) { ... }

    // Custom bean expression
    @PreAuthorize("@orderSecurity.canEdit(#id, authentication)")
    public Order update(Long id, UpdateOrderRequest req) { ... }
}
```

Dekho, ye SpEL (Spring Expression Language) expressions kitne flexible hain — sirf role check nahi, method ke arguments tak access mil jaata hai. Ye Express mein manually likhe gaye `if` conditions ka declarative version hai.

### `@PostAuthorize` — return value check karna

```java
@PostAuthorize("returnObject.userId == authentication.principal.id or hasRole('ADMIN')")
public Order findById(Long id) {
    return repo.findById(id).orElseThrow();
}
```

Socho IRCTC ka scenario — koi user apna PNR dekhna chahta hai. URL se sirf `id` mil raha hai, lekin ye pata karne ke liye ki "ye order isi user ka hai ya nahi", pehle DB se order fetch karna padega. Yahi kaam `@PostAuthorize` karta hai — method chalne do (DB query ho jaane do), fir return value check karo. Agar order ka `userId` principal ke id se match nahi karta aur wo admin bhi nahi hai, to Spring `AccessDeniedException` throw kar dega — method chal chuka hoga, par response user tak nahi pahunchega.

> [!tip] Kyun sparingly use karein?
> Kyunki DB query already ho chuki hoti hai — resource waste hua. Lekin jab authorization rule khud data pe depend karta ho (jaise "sirf apna record dekh sakta hai"), tab `@PostAuthorize` ke alawa koi chaara nahi.

### `@PostFilter` — collections ko filter karna

```java
@PostFilter("filterObject.userId == authentication.principal.id or hasRole('ADMIN')")
public List<Order> all() {
    return repo.findAll();
}
```

Socho Swiggy ka "my orders" list — DB se sabke orders aa gaye, lekin `@PostFilter` list ke har element pe predicate chalayega aur jo `false` return karega, use list se hata dega. Result: user ko sirf apne orders dikhenge, baaki automatically drop ho jayenge.

### Custom security bean

Jab logic thoda complex ho jaaye (jaise DB call karke check karna), to SpEL ke andar hi sab kuch likhna messy ho jaata hai. Isliye ek alag bean bana lo:

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

Isko `@PreAuthorize("@orderSecurity.canEdit(#id, authentication)")` se reference karo. Bean ka naam (`"orderSecurity"`) SpEL string ke andar `@` ke saath use hota hai — bilkul NestJS mein dependency injection token jaisa feel hota hai, bas syntax alag hai.

### `@AuthenticationPrincipal` ke saath combine karna

Apna custom principal type directly SpEL mein pass kar sakte ho:

```java
@PreAuthorize("#user.id == #ownerId or hasRole('ADMIN')")
public Resource read(Long ownerId, @AuthenticationPrincipal AppUser user) { ... }
```

### Class-level annotation

```java
@RestController
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {
    // har method ko ROLE_ADMIN chahiye, individual methods override kar sakte hain
    @GetMapping("/audit")
    @PreAuthorize("hasAuthority('audit:read')")   // ye override karta hai
    public List<AuditEntry> audit() { ... }
}
```

Yaani pura controller "admin-only" bana do ek hi line mein, aur jahan zaroorat ho wahan method-level pe override kar do — CRED app mein jaise "admin panel" ke andar sab kuch by-default locked hota hai, sirf specific screens ko custom permission milti hai.

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

Dekho Express wale example mein tumhe khud `if` likhna pada — yahi manual check `@PostAuthorize` automate kar deta hai.

| Doosre frameworks mein | Spring Security mein |
| --- | --- |
| NestJS `@Roles('ADMIN') @UseGuards(RolesGuard)` | `@PreAuthorize("hasRole('ADMIN')")` |
| Custom guard jo method args use kare | `@PreAuthorize("@bean.method(#arg, authentication)")` |
| Handler ke andar manual `req.user` checks | `@PostAuthorize` result pe |
| Fetch ke baad array filter karna | `@PostFilter` |

## SpEL cheat sheet

| Expression | Matlab |
| --- | --- |
| `hasRole('X')` | `ROLE_X` hai kya |
| `hasAnyRole('X','Y')` | Inmein se koi ek hai |
| `hasAuthority('s:r')` | Exact authority match |
| `hasAnyAuthority(...)` | Inmein se koi ek authority |
| `isAuthenticated()` | Login hai (anonymous nahi) |
| `isAnonymous()` | Login nahi hai |
| `isFullyAuthenticated()` | Remember-me se nahi, pura login hai |
| `permitAll()` / `denyAll()` | Hamesha allow / hamesha deny |
| `principal` | Principal object (custom UserDetails ya `Jwt`) |
| `authentication` | Pura `Authentication` object |
| `#argName` | Method ka argument |
| `returnObject` | Return value (`@PostAuthorize` mein) |
| `filterObject` | Har element (`@PreFilter`/`@PostFilter` mein) |
| `@beanName.method(...)` | Bean ka reference |

## Gotchas

> [!warning] Self-invocation (phir se wahi problem)
> Method security AOP use karta hai. Agar tum SAME class ke andar se ek `@PreAuthorize` method ko doosre method se call karte ho, to proxy skip ho jaata hai — koi check nahi lagega. Bilkul wahi issue jo `@Transactional`/`@Cacheable` mein hota hai. Fix bhi wahi hai — self-injection ya method ko dusre bean mein nikaal do.

> [!warning] `@PostAuthorize` pehle method chala deta hai
> Agar method ke side effects hain (jaise DB write, email bhejna), to wo ho chuke honge chahe authorization fail ho jaaye. Isliye sirf query methods (read-only) ke liye use karo.

> [!warning] Sirf public methods secure hote hain
> AOP proxies sirf public methods ko intercept karte hain. `private` ya `package-private` methods secure NAHI hote — annotation lagane ke bawajood bhi.

> [!warning] `@PreFilter`/`@PostFilter` collection ko mutate karta hai
> Agar underlying collection immutable hai (jaise `Stream.toList()` se aayi hui), to exception aayegi. Ek mutable list return karo (jaise `new ArrayList<>(...)` ya `Collectors.toList()`).

> [!warning] Roles vs Authorities ka confusion
> `hasRole('ADMIN')` asal mein `ROLE_ADMIN` check karta hai. `hasAuthority('ADMIN')` literal `ADMIN` check karta hai — `ROLE_` prefix nahi lagata. JWT mein agar `roles: ["ADMIN"]` claim aa raha hai, to Spring use `ROLE_ADMIN` authority ki tarah tabhi store karega jab tumhara converter `ROLE_` prefix laga raha ho ([[04-JWT-with-Spring-Security]]). Ye galti bahut common hai — "role hai phir bhi 403 kyun aa raha" — isi mismatch ki wajah se hoti hai.

> [!warning] `@Secured` SpEL support nahi karta
> `@Secured("ROLE_ADMIN")` chalega; `@Secured("hasRole('ADMIN')")` NAHI chalega — SpEL expressions ko samajhta hi nahi. Expressions chahiye to `@PreAuthorize` use karo.

> [!tip] Method security test karo
> ```java
> @WithMockUser(roles = "ADMIN") @Test void admin_can_delete() { ... }
> ```
> `@WithMockUser` ek fake authenticated user set kar deta hai test context mein, taaki tumhe real login flow ke bina hi security rules test karne ka mauka mile.

## Related

- [[01-Spring-Security-Concepts]]
- [[02-Configuration-and-SecurityFilterChain]]
- [[Spring-AOP]]
- [[04-JWT-with-Spring-Security]]
