# Repositories — Spring Data JPA ka Jadoo

Socho ek second ke liye. Tum Zomato pe kaam kar rahe ho. Tumhare paas ek `Order` entity hai. Ab tumhe chahiye:
- "Is customer ke saare orders do" — `findByCustomerId()`
- "Aaj ke delivered orders count karo" — `countByStatusAndDeliveredAtAfter()`
- "Latest 10 orders dikhao dashboard pe" — `findTop10ByOrderByPlacedAtDesc()`

Node.js mein tum Prisma likhte — `prisma.order.findMany({ where: { customerId } })`. Spring mein? Tum sirf ek **interface** likhte ho — aur Spring Data JPA khud implementation bana deta hai. Koi SQL nahi, koi JDBC boilerplate nahi. Bas method ka naam sahi rakhna hai.

Yahi hai Spring Data JPA ka **Repository pattern** — aur yeh shayad Spring ka sabse powerful feature hai jo beginners miss kar dete hain.

> [!info] Node.js/TypeScript se aa rahe ho?
> Spring Data JPA ka `JpaRepository` == Prisma ka auto-generated client. Tum ek interface declare karte ho jo `JpaRepository<Entity, IdType>` extend karta hai, aur Spring startup pe us interface ki implementation khud build kar deta hai. Method names jaise `findByEmailAndStatus` parse karke SQL queries ban jaati hain — inhe **derived queries** kehte hain. Complex cases ke liye: `@Query`, `Specification`, ya `Querydsl`.

---

## Repository Hierarchy — Seedhi Baat

Kya hota hai jab tum `JpaRepository` extend karte ho? Actually uske peeche ek poora hierarchy chal raha hota hai — tumhe sirf top wala interface dikhta hai, but neeche 2-3 aur interfaces hain jinse woh saari methods aati hain. Samajh lo yeh:

Spring Data mein repositories ka ek hierarchy hai:

```
CrudRepository<T, ID>
    — basic: save() / findById() / findAll() / delete() / count()
    ↓
PagingAndSortingRepository<T, ID>
    — upar wala sab + Pageable aur Sort support
    ↓
JpaRepository<T, ID>
    — upar wala sab + flush(), saveAllAndFlush(), deleteAllInBatch(), getReferenceById()
```

**Practically almost hamesha `JpaRepository` hi extend karo.** Yeh sabse powerful hai aur JPA-specific features deta hai.

Ek simple example — Zomato style:

```java
// Sirf yeh interface define karo — implementation Spring khud banayega!
public interface OrderRepository extends JpaRepository<Order, Long> {
    // Koi aur code nahi — abhi bhi save(), findById(), findAll() sab kaam karta hai
}
```

Bas itna. Spring startup pe yeh interface ka ek concrete class bana deta hai — jaise Prisma apna client generate karta hai, exactly waise hi.

---

## Derived Queries — Method Name = SQL Query

Kyun zaruri hai yeh samajhna? Kyunki 90% real-world queries — "email se user dhundo", "status ke hisaab se count karo", "date range mein orders lao" — yeh sab bina ek line SQL likhe ban jaati hain. Yeh Spring Data ka jadoo hai. Method ka naam ek specific format mein rakhte ho, aur Spring startup pe method signature ko parse karke automatically SQL generate karta hai — Prisma jaisa auto-complete nahi milega editor mein (kyunki yeh compile-time convention hai, not codegen), but kaam wahi hota hai.

```java
public interface UserRepository extends JpaRepository<User, Long> {

    // "WHERE email = ?" — simple lookup
    Optional<User> findByEmail(String email);

    // "SELECT COUNT(*) > 0 WHERE email = ?" — boolean check
    boolean existsByEmail(String email);

    // "SELECT COUNT(*) WHERE status = ?"
    long countByStatus(UserStatus status);

    // "WHERE status = ? ORDER BY created_at DESC"
    List<User> findByStatusOrderByCreatedAtDesc(UserStatus status);

    // "WHERE LOWER(email) LIKE ?" — case-insensitive search
    List<User> findByEmailContainingIgnoreCase(String fragment);

    // "WHERE status = ? AND created_at > ?" — multiple conditions
    List<User> findByStatusAndCreatedAtAfter(UserStatus status, Instant after);

    // Pagination ke saath — Swiggy ke dashboard ki tarah paged results
    Page<User> findByStatus(UserStatus status, Pageable pageable);

    // "LIMIT 10 ORDER BY created_at DESC" — top 10
    List<User> findTop10ByStatusOrderByCreatedAtDesc(UserStatus status);

    // Bulk delete — @Modifying + @Transactional required hai!
    @Modifying
    @Transactional
    int deleteByStatus(UserStatus status);
}
```

---

## Derived Query Keywords — Cheat Sheet

Yeh keywords yaad rakhna zaruri nahi — bas pata hona chahiye yeh exist karte hain, phir jab zarurat pade Google/docs se dekh lo. Method name mein yeh keywords use karo:

```
findBy / readBy / queryBy / getBy   → SELECT query banata hai
existsBy                            → boolean return karta hai
countBy                             → long (count) return karta hai
deleteBy / removeBy                 → DELETE query banata hai

--- Conditions ---
And, Or                             → WHERE ke conditions join karna
Is, Equals                         → = (default hi hai, explicitly likhne ki zarurat nahi)
Between                            → BETWEEN ? AND ?
LessThan, LessThanEqual            → < aur <=
GreaterThan, GreaterThanEqual      → > aur >=
After, Before                      → dates ke liye > aur <
IsNull, IsNotNull                  → IS NULL / IS NOT NULL
Like, NotLike                      → LIKE / NOT LIKE (% tumhe khud dalna hai)
StartingWith, EndingWith           → LIKE 'abc%' / LIKE '%abc'
Containing                         → LIKE '%abc%' (search ke liye best)
Not                                → != 
In, NotIn                          → IN (...) / NOT IN (...)
True, False                        → = true / = false
IgnoreCase                         → LOWER() wrap karta hai comparison pe
OrderBy                            → ORDER BY clause
Top, First                         → LIMIT — findTop10, findFirst
```

---

## @Query — Jab Derived Query Kafi Nahi Ho

Derived queries simple cases ke liye great hain. But jab complex logic ho — `GROUP BY`, `JOIN`, subqueries — tab `@Query` use karo.

### JPQL (Java Persistence Query Language)

JPQL SQL jaisa hi hai, bas table names ki jagah entity class names use hoti hain.

```java
public interface UserRepository extends JpaRepository<User, Long> {

    // JPQL — entity name "User", column nahi "users"
    @Query("SELECT u FROM User u WHERE u.email LIKE %:fragment% AND u.status = :status")
    List<User> search(@Param("fragment") String fragment,
                      @Param("status") UserStatus status);

    // DTO projection — sirf jo chahiye woh fetch karo, poori entity nahi
    // UserSummary ek simple class/record hai jisme sirf 3 fields hain
    @Query("""
        SELECT new com.example.user.UserSummary(u.id, u.email, u.fullName)
        FROM User u WHERE u.status = :s
        """)
    List<UserSummary> summaries(@Param("s") UserStatus s);
}
```

### Native SQL — Jab Bilkul Raw SQL Chahiye

```java
// nativeQuery = true matlab ab yeh SQL hai, JPQL nahi
// Table name "users" use karo, entity name "User" nahi
@Query(value = "SELECT * FROM users WHERE LENGTH(email) > :n",
       nativeQuery = true)
List<User> withLongEmails(@Param("n") int n);
```

> [!warning] Native queries ka ek bada drawback hai — yeh database-specific hote hain. Agar PostgreSQL se MySQL pe jaana ho, toh yeh queries change karni pad sakti hain. JPQL prefer karo jab tak koi compelling reason na ho.

### Bulk Update with @Modifying

```java
// UPDATE query — @Modifying aur @Transactional dono zaroori hain
@Modifying
@Query("UPDATE User u SET u.status = :s WHERE u.id IN :ids")
int bulkUpdateStatus(@Param("ids") Collection<Long> ids,
                     @Param("s") UserStatus s);
```

---

## Pagination & Sorting — Zomato Order History ki Tarah

Koi bhi production app mein tum `findAll()` nahi karoge — woh poora database memory mein laad lega. Pagination use karo.

```java
// Controller — query params se page, size, sort lo
@GetMapping("/users")
public Page<UserDto> listUsers(
        @RequestParam(defaultValue = "0") int page,       // kaunsa page (0-indexed)
        @RequestParam(defaultValue = "20") int size,      // ek page pe kitne records
        @RequestParam(defaultValue = "createdAt") String sortBy,
        @RequestParam(defaultValue = "desc") String dir) {

    // Sort object banao
    Sort.Direction direction = dir.equalsIgnoreCase("asc")
        ? Sort.Direction.ASC : Sort.Direction.DESC;
    Sort sort = Sort.by(direction, sortBy);

    // PageRequest banao — yeh Pageable implement karta hai
    PageRequest pageRequest = PageRequest.of(page, size, sort);

    // Page<User> return karta hai — total elements, total pages sab andar hota hai
    return userRepository.findAll(pageRequest).map(this::toDto);
}
```

`Page<T>` object mein yeh sab milta hai:
- `getContent()` — is page ke records
- `getTotalElements()` — total kitne records hain database mein
- `getTotalPages()` — total kitne pages bante hain
- `getNumber()` — current page number
- `hasNext()` / `hasPrevious()` — navigation ke liye

Yeh exact information Zomato ke order history page pe dikhti hai — "Showing 1-20 of 150 orders".

> [!info] **`Page` vs `Slice` — Instagram-style infinite scroll ke liye**
> `Page<T>` ke liye Spring ek extra `COUNT(*)` query bhi chalata hai (total elements/pages nikalne ke liye) — do queries total. Agar tumhe sirf "next batch dikha do, total count ki zarurat nahi" (jaise Instagram/Swiggy feed ka infinite scroll), toh `Slice<T>` return karo instead of `Page<T>`. `Slice` mein `getTotalElements()` nahi hota, but `hasNext()` hai — aur sirf ek query lagti hai, koi count query nahi. Performance ke liye better jab total count kabhi UI mein dikhana hi nahi hai.
> ```java
> Slice<Order> findByCustomerId(Long customerId, Pageable pageable);
> ```

---

## Specifications — Dynamic Filters ke Liye

Socho Swiggy ka filter panel — user koi bhi filter laga sakta hai ya nahi bhi lagata. Ek order ke liye status filter hoga, doosre ke liye date range, teesre ke liye dono.

Derived queries yahan fail ho jaati hain — tum `findByStatusAndDateRange()` alag, `findByStatus()` alag, `findByDateRange()` alag nahi likh sakte (well, likh sakte ho, but yeh scalable nahi hai).

**Specification** pattern solve karta hai yeh problem — runtime pe dynamically conditions compose karo.

```java
// Step 1: Repository mein JpaSpecificationExecutor bhi extend karo
public interface UserRepository
        extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {
    // existing methods...
}

// Step 2: Specifications define karo — har ek ek condition hai
public class UserSpecs {

    // Status filter — agar status null hai toh koi condition mat lagao
    public static Specification<User> hasStatus(UserStatus status) {
        return (root, query, criteriaBuilder) ->
            status == null
                ? null  // null return = no condition (Spring Data handle karta hai)
                : criteriaBuilder.equal(root.get("status"), status);
    }

    // Email search — case-insensitive
    public static Specification<User> emailContains(String fragment) {
        return (root, query, criteriaBuilder) ->
            fragment == null || fragment.isBlank()
                ? null
                : criteriaBuilder.like(
                    criteriaBuilder.lower(root.get("email")),
                    "%" + fragment.toLowerCase() + "%"
                  );
    }

    // Date range filter — IRCTC booking date range ki tarah
    public static Specification<User> createdAfter(Instant date) {
        return (root, query, criteriaBuilder) ->
            date == null
                ? null
                : criteriaBuilder.greaterThan(root.get("createdAt"), date);
    }
}

// Step 3: Runtime pe compose karo — sirf jo filters user ne laagaye
public Page<User> searchUsers(UserStatus status, String emailQuery,
                               Instant fromDate, Pageable pageable) {
    Specification<User> spec = Specification
        .where(UserSpecs.hasStatus(status))
        .and(UserSpecs.emailContains(emailQuery))
        .and(UserSpecs.createdAfter(fromDate));

    return userRepository.findAll(spec, pageable);
}
```

Prisma walo ke liye: yeh exactly `where: { status, email: { contains: q } }` jaisa hai — sirf jo field pass karo wahi filter hoga.

---

## Complete Example — Zomato Order System

Yeh dekho ek complete controller-service-repository slice — Zomato ke order system ki tarah:

```java
// ===== 1. Repository =====
public interface OrderRepository
        extends JpaRepository<Order, Long>, JpaSpecificationExecutor<Order> {

    // Customer ke orders, paginated
    Page<Order> findByCustomerId(Long customerId, Pageable p);

    // Order with items fetch karo — N+1 avoid karne ke liye @EntityGraph
    @EntityGraph(attributePaths = { "items", "items.product" })
    Optional<Order> findWithItemsById(Long id);

    // Status ke hisab se count — analytics ke liye
    long countByStatus(OrderStatus status);

    // Specific date ke baad ke orders — reports ke liye
    @Query("SELECT o FROM Order o WHERE o.placedAt >= :from AND o.status = :status")
    List<Order> findRecentByStatus(@Param("from") Instant from,
                                   @Param("status") OrderStatus status);
}

// ===== 2. DTOs (Records — Java 16+) =====
// Response DTO — sirf woh fields jo frontend ko chahiye
public record OrderResponse(
    Long id,
    Long customerId,
    String customerName,
    BigDecimal total,
    OrderStatus status,
    Instant placedAt
) {}

// Request DTO — order create karne ke liye
public record CreateOrderRequest(
    @NotNull Long customerId,
    @NotEmpty List<@Valid LineItem> items
) {}

// Line item — ek product aur quantity
public record LineItem(
    @NotNull Long productId,
    @Min(1) int quantity
) {}

// ===== 3. Service =====
@Service
@Transactional  // saare public methods transactional ho jaate hain by default
public class OrderService {

    private final OrderRepository orderRepo;
    private final CustomerRepository customerRepo;
    private final ProductRepository productRepo;

    // Constructor injection — @Autowired ki zarurat nahi agar single constructor ho
    public OrderService(OrderRepository o, CustomerRepository c, ProductRepository p) {
        this.orderRepo = o;
        this.customerRepo = c;
        this.productRepo = p;
    }

    /**
     * Naya order create karo — Zomato pe "Place Order" button ki tarah
     */
    public OrderResponse create(CreateOrderRequest req) {
        // Customer exist karta hai? Nahi toh 404
        Customer customer = customerRepo.findById(req.customerId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer", req.customerId()));

        // Naya order object banao
        Order order = new Order();
        order.setCustomer(customer);
        order.setStatus(OrderStatus.PENDING);
        order.setPlacedAt(Instant.now());

        // Har line item ke liye product fetch karo aur order mein add karo
        for (LineItem li : req.items()) {
            Product product = productRepo.findById(li.productId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product", li.productId()));

            OrderItem item = new OrderItem();
            item.setProduct(product);
            item.setQuantity(li.quantity());
            item.setUnitPrice(product.getPrice()); // price lock karo order time pe
            order.addItem(item);  // entity mein bi-directional set hota hai
        }

        // save() karo — JPA insert kar dega
        Order saved = orderRepo.save(order);
        return toResponse(saved);
    }

    /**
     * Order by ID fetch karo — with items (N+1 avoid)
     */
    @Transactional(readOnly = true)  // performance optimization — no dirty tracking
    public OrderResponse find(Long id) {
        return orderRepo.findWithItemsById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Order", id));
    }

    /**
     * Customer ke saare orders, paginated
     */
    @Transactional(readOnly = true)
    public Page<OrderResponse> customerOrders(Long customerId, Pageable pageable) {
        return orderRepo.findByCustomerId(customerId, pageable)
                        .map(this::toResponse);
    }

    // Entity → DTO conversion
    private OrderResponse toResponse(Order o) {
        BigDecimal total = o.getItems().stream()
                .map(i -> i.getUnitPrice().multiply(BigDecimal.valueOf(i.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new OrderResponse(
            o.getId(),
            o.getCustomer().getId(),
            o.getCustomer().getFullName(),
            total,
            o.getStatus(),
            o.getPlacedAt()
        );
    }
}

// ===== 4. Controller =====
@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {

    private final OrderService service;

    public OrderController(OrderService service) {
        this.service = service;
    }

    // POST /api/v1/orders — order place karo
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse create(@RequestBody @Valid CreateOrderRequest req) {
        return service.create(req);
    }

    // GET /api/v1/orders/{id} — specific order fetch karo
    @GetMapping("/{id}")
    public OrderResponse get(@PathVariable Long id) {
        return service.find(id);
    }

    // GET /api/v1/orders?customerId=123&page=0&size=10 — customer ke orders
    @GetMapping
    public Page<OrderResponse> list(
            @RequestParam Long customerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        PageRequest pr = PageRequest.of(page, size, Sort.by("placedAt").descending());
        return service.customerOrders(customerId, pr);
    }
}
```

---

## Prisma vs Spring Data JPA — Side by Side

Tum TypeScript/Prisma se aa rahe ho, toh yeh comparison direct kaam aayega:

```typescript
// ----- TypeScript / Prisma -----

// Single record by ID
const user = await prisma.user.findUnique({ where: { id: 1 } });

// Search with filters
const list = await prisma.user.findMany({
  where: {
    status: 'ACTIVE',
    email: { contains: searchQuery, mode: 'insensitive' }
  },
  orderBy: { createdAt: 'desc' },
  skip: page * size,
  take: size,
});

// Create
const newUser = await prisma.user.create({ data: { email, name } });

// Update
await prisma.user.update({ where: { id }, data: { status: 'INACTIVE' } });

// Include relations
const order = await prisma.order.findUnique({
  where: { id },
  include: { items: { include: { product: true } } }
});

// Select specific fields only
const summaries = await prisma.user.findMany({
  select: { id: true, email: true, name: true }
});

// Raw SQL
const result = await prisma.$queryRaw`SELECT * FROM users WHERE id = ${id}`;
```

| Prisma | Spring Data JPA |
|--------|----------------|
| `findUnique({ where: { id } })` | `findById(id)` |
| `findFirst({ where: { email } })` | `findByEmail(email)` — `Optional<User>` return karta hai |
| `findMany({ where: { status } })` | `findByStatus(status)` |
| `where: { email: { contains: q } }` | `findByEmailContaining(q)` |
| `where: { email: { contains: q, mode: 'insensitive' } }` | `findByEmailContainingIgnoreCase(q)` |
| `orderBy: { createdAt: 'desc' }` | `OrderBy` in method name ya `Sort` object |
| `skip / take` | `Pageable` → `PageRequest.of(page, size)` |
| `create({ data })` | `save(entity)` — new entity ke liye |
| `update({ where, data })` | Entity load karo, mutate karo, `save()` karo — ya `@Modifying @Query` |
| `deleteMany({ where })` | `@Modifying @Query("DELETE ...")` |
| `include: { items: true }` | `@EntityGraph(attributePaths = "items")` |
| `select: { id, email }` | DTO projection — `new UserSummary(u.id, u.email)` |
| Dynamic `where` | `Specification` API |
| `$queryRaw` | `nativeQuery = true` ya `JdbcClient` |

---

## Gotchas — Common Mistakes Jo Beginners Karte Hain

> [!warning] **`@Modifying` queries bina transaction ke fail honge**
> `@Modifying @Query` wali methods mein `@Transactional` kisi na kisi jagah hona chahiye — service method pe, ya repository method pe. Agar nahi hai toh `TransactionRequiredException` aayega. Zyada clean approach: service layer pe `@Transactional` rakho, repository methods pe mat lagao.

> [!warning] **`@Modifying` ke baad persistence context stale ho jaata hai**
> Maan lo tumne `bulkUpdateStatus()` call kiya — database update ho gaya. But agar same transaction mein pehle se koi `User` entity loaded hai, toh woh purani values dikhaayega (persistence context mein cache hai). Solution:
> ```java
> @Modifying(clearAutomatically = true, flushAutomatically = true)
> @Query("UPDATE User u SET u.status = :s WHERE u.id IN :ids")
> int bulkUpdateStatus(@Param("ids") List<Long> ids, @Param("s") UserStatus s);
> ```
> `clearAutomatically = true` persistence context flush aur clear karta hai — stale data problem solve.

> [!warning] **`findAll()` kabhi bhi badi table pe mat karo**
> `userRepository.findAll()` — yeh saare users memory mein laad lega. Agar 10 lakh users hain, toh OutOfMemoryError. Hamesha paginate karo:
> ```java
> // Galat
> List<User> allUsers = userRepository.findAll(); // NEVER for large tables
>
> // Sahi
> Page<User> page = userRepository.findAll(PageRequest.of(0, 100));
> ```
> Streaming ke liye `@Query` + `Stream<User>` return type use karo.

> [!warning] **Derived queries 3+ conditions pe unreadable ho jaati hain**
> Yeh technically kaam karta hai:
> ```java
> List<User> findByStatusAndCreatedAtBetweenAndEmailContainingIgnoreCaseOrderByCreatedAtDescIdAsc(
>     UserStatus status, Instant from, Instant to, String email);
> ```
> But yeh padha nahi jaata. Switch to `@Query` ya `Specification` jab 2-3 se zyada conditions hon.

> [!warning] **`save()` ke baad returned value use karo — especially for new entities**
> ```java
> User user = new User();
> user.setEmail("test@zomato.com");
>
> // Galat — user abhi bhi transient state mein hai (id null hai)
> userRepository.save(user);
> System.out.println(user.getId()); // null ho sakta hai
>
> // Sahi — returned managed entity use karo
> User saved = userRepository.save(user);
> System.out.println(saved.getId()); // database-generated id milega
> ```

> [!warning] **`@Transactional` method ke andar `save()` call zaroori nahi — but zaruri bhi ho sakta hai**
> Agar entity already JPA ke persistence context mein loaded hai (matlab tumne `findById()` kiya tha aur woh same `@Transactional` method mein hai), toh tum sirf entity mutate karo — JPA automatically dirty detect karega aur flush karega. `save()` ki zarurat nahi. But naye entities ke liye `save()` explicitly call karna padega.
> ```java
> @Transactional
> public void updateEmail(Long userId, String newEmail) {
>     User user = userRepository.findById(userId).orElseThrow();
>     user.setEmail(newEmail);  // bus itna — no save() needed!
>     // method ke end pe JPA automatically UPDATE query run karega
> }
> ```

> [!tip] **`getReferenceById()` use karo sirf FK set karne ke liye**
> Maan lo tumhe ek `Order` banana hai aur sirf `customerId` pata hai. Pura `Customer` entity fetch karne ki zarurat nahi agar tum sirf FK set karna chahte ho:
> ```java
> // Galat — extra database query
> Customer customer = customerRepo.findById(customerId).orElseThrow();
> order.setCustomer(customer);
>
> // Sahi — koi database hit nahi, sirf proxy object milta hai
> Customer customerRef = customerRepo.getReferenceById(customerId);
> order.setCustomer(customerRef);
> ```
> `getReferenceById()` ek lazy proxy return karta hai — database hit tabhi hoga jab tum customer ki actual fields access karo.

> [!tip] **`@Transactional(readOnly = true)` use karo read queries pe**
> Jab tum sirf data read kar rahe ho (no creates, updates, deletes), toh `readOnly = true` use karo:
> ```java
> @Transactional(readOnly = true)
> public Page<UserDto> getUsers(Pageable pageable) { ... }
> ```
> Iska fayda? JPA dirty tracking disable kar deta hai — memory aur CPU dono save hote hain. Read-heavy endpoints pe noticeable performance improvement milta hai.

---

## Custom Repository Implementation — Jab Sab Fail Ho

Kabhi kabhi derived queries, `@Query`, aur `Specification` — teeno kafi nahi hote. Tab tum custom implementation likh sakte ho.

```java
// Step 1: Custom interface define karo
public interface UserRepositoryCustom {
    List<User> complexSearch(UserSearchCriteria criteria);
}

// Step 2: Implementation likhdo — EntityManager inject karo
public class UserRepositoryCustomImpl implements UserRepositoryCustom {

    @PersistenceContext
    private EntityManager em;

    @Override
    public List<User> complexSearch(UserSearchCriteria criteria) {
        // Yahan tum EntityManager se jo chahiye woh karo
        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<User> cq = cb.createQuery(User.class);
        Root<User> root = cq.from(User.class);

        List<Predicate> predicates = new ArrayList<>();
        if (criteria.getStatus() != null) {
            predicates.add(cb.equal(root.get("status"), criteria.getStatus()));
        }
        // ... aur conditions

        cq.where(predicates.toArray(new Predicate[0]));
        return em.createQuery(cq).getResultList();
    }
}

// Step 3: Main repository mein dono extend karo
public interface UserRepository
        extends JpaRepository<User, Long>, UserRepositoryCustom {
    // existing methods...
}
```

---

## Key Takeaways

- **`JpaRepository<Entity, ID>` extend karo** — yeh sabse complete interface hai, `save()`, `findById()`, `findAll()`, `delete()`, `count()` sab milta hai out of the box.

- **Derived queries magic hain simple cases ke liye** — `findByEmailAndStatus()` likhte ho, Spring SQL generate karta hai. Method name hi query hai.

- **`@Query` use karo complex logic ke liye** — JPQL prefer karo (database-agnostic); native SQL tab jab koi aur option na ho.

- **Hamesha paginate karo** — `findAll()` badi tables pe kabhi nahi. `PageRequest.of(page, size, sort)` use karo.

- **`Specification` dynamic filters ke liye** — runtime pe conditions compose karo bina multiple repository methods likhe.

- **`@Modifying` queries mein `@Transactional` zaroori hai** — `clearAutomatically = true` add karo stale persistence context se bachne ke liye.

- **Read-only methods pe `@Transactional(readOnly = true)`** — performance optimization, dirty tracking disable hota hai.

- **`save()` ka returned value use karo** — new entities ke liye especially, kyunki returned object mein database-generated ID hogi.

- **`getReferenceById()` FK-only cases ke liye** — unnecessary database queries bachao.

- **3+ conditions pe derived queries mat use karo** — `@Query` ya `Specification` pe switch karo readability ke liye.
