---
tags: [data-jpa, repository, spring-data, query]
aliases: [JpaRepository, Repository, Derived Queries, Specification]
stage: intermediate
---

# Repositories

> [!info] For the Express/TS dev
> Spring Data JPA's `JpaRepository` is the closest thing in the Java world to Prisma's auto-generated client. You declare an **interface** that extends `JpaRepository<Entity, IdType>` and Spring builds the implementation at startup. Method names like `findByEmailAndStatus` are parsed into queries — derived queries. For complex stuff: `@Query`, `Specification`, or `Querydsl`.

## Concept / How it works

```
CrudRepository<T, ID>           — basic save / findById / delete
   ↓
PagingAndSortingRepository<T,ID> — + Pageable, Sort
   ↓
JpaRepository<T, ID>             — + flush, batching, JPA-specific
```

You almost always extend `JpaRepository`.

## Code example

### Simple repository

```java
public interface UserRepository extends JpaRepository<User, Long> {

    // Derived query — Spring parses the method name
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    long countByStatus(UserStatus status);
    List<User> findByStatusOrderByCreatedAtDesc(UserStatus status);
    List<User> findByEmailContainingIgnoreCase(String fragment);

    // Multiple criteria
    List<User> findByStatusAndCreatedAtAfter(UserStatus status, Instant after);

    // Pagination
    Page<User> findByStatus(UserStatus status, Pageable pageable);

    // First/Top N
    List<User> findTop10ByStatusOrderByCreatedAtDesc(UserStatus status);

    // Delete — must be @Modifying + @Transactional in service
    @Modifying
    @Transactional
    int deleteByStatus(UserStatus status);

    // Custom JPQL
    @Query("SELECT u FROM User u WHERE u.email LIKE %:fragment% AND u.status = :status")
    List<User> search(@Param("fragment") String fragment,
                      @Param("status") UserStatus status);

    // Native SQL
    @Query(value = "SELECT * FROM users WHERE LENGTH(email) > :n",
           nativeQuery = true)
    List<User> withLongEmails(@Param("n") int n);

    // Update
    @Modifying
    @Query("UPDATE User u SET u.status = :s WHERE u.id IN :ids")
    int bulkUpdateStatus(@Param("ids") Collection<Long> ids,
                         @Param("s") UserStatus s);

    // Projection (DTO directly — no entity load)
    @Query("""
        SELECT new com.example.user.UserSummary(u.id, u.email, u.fullName)
        FROM User u WHERE u.status = :s
        """)
    List<UserSummary> summaries(@Param("s") UserStatus s);
}
```

### Derived-query keywords (cheat sheet)

```
findBy / readBy / queryBy / getBy   → SELECT
existsBy                            → boolean
countBy                             → long
deleteBy / removeBy                 → DELETE

And, Or, Is, Equals, Between, LessThan, LessThanEqual,
GreaterThan, GreaterThanEqual, After, Before,
IsNull, IsNotNull, Like, NotLike, StartingWith, EndingWith,
Containing, OrderBy, Not, In, NotIn, True, False,
IgnoreCase
```

### Pagination & sorting

```java
@GetMapping
public Page<UserDto> list(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(defaultValue = "createdAt,desc") String[] sort) {

    Sort sortOrder = Sort.by(Sort.Order.desc(sort[0]));
    PageRequest pr = PageRequest.of(page, size, sortOrder);
    return userRepository.findAll(pr).map(this::toDto);
}
```

### Specifications (dynamic predicates — Prisma's `where: {...}` analog)

```java
public interface UserRepository
        extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {}

public class UserSpecs {
    public static Specification<User> hasStatus(UserStatus s) {
        return (root, q, cb) -> s == null ? null : cb.equal(root.get("status"), s);
    }
    public static Specification<User> emailContains(String f) {
        return (root, q, cb) -> f == null ? null
                : cb.like(cb.lower(root.get("email")), "%" + f.toLowerCase() + "%");
    }
}

// Compose at runtime
Specification<User> spec = Specification.where(UserSpecs.hasStatus(status))
                                        .and(UserSpecs.emailContains(query));
Page<User> page = repo.findAll(spec, pageable);
```

### Full controller-service-repo slice

```java
// 1) Repository
public interface OrderRepository
        extends JpaRepository<Order, Long>, JpaSpecificationExecutor<Order> {
    Page<Order> findByCustomerId(Long customerId, Pageable p);

    @EntityGraph(attributePaths = { "items", "items.product" })
    Optional<Order> findWithItemsById(Long id);
}

// 2) DTOs
public record OrderResponse(Long id, Long customerId, BigDecimal total, Instant placedAt) {}
public record CreateOrderRequest(@NotNull Long customerId,
                                 @NotEmpty List<@Valid LineItem> items) {}
public record LineItem(@NotNull Long productId, @Min(1) int quantity) {}

// 3) Service
@Service
@Transactional
public class OrderService {
    private final OrderRepository orderRepo;
    private final CustomerRepository customerRepo;
    private final ProductRepository productRepo;

    public OrderService(OrderRepository o, CustomerRepository c, ProductRepository p) {
        this.orderRepo = o; this.customerRepo = c; this.productRepo = p;
    }

    public OrderResponse create(CreateOrderRequest req) {
        Customer customer = customerRepo.findById(req.customerId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer", req.customerId()));

        Order order = new Order();
        order.setCustomer(customer);
        order.setPlacedAt(Instant.now());

        for (LineItem li : req.items()) {
            Product product = productRepo.findById(li.productId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product", li.productId()));
            OrderItem item = new OrderItem();
            item.setProduct(product);
            item.setQuantity(li.quantity());
            item.setUnitPrice(product.getPrice());
            order.addItem(item);
        }

        Order saved = orderRepo.save(order);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public OrderResponse find(Long id) {
        return orderRepo.findWithItemsById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Order", id));
    }

    private OrderResponse toResponse(Order o) {
        BigDecimal total = o.getItems().stream()
                .map(i -> i.getUnitPrice().multiply(BigDecimal.valueOf(i.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new OrderResponse(o.getId(), o.getCustomer().getId(), total, o.getPlacedAt());
    }
}

// 4) Controller
@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {
    private final OrderService service;
    public OrderController(OrderService service) { this.service = service; }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse create(@RequestBody @Valid CreateOrderRequest req) {
        return service.create(req);
    }

    @GetMapping("/{id}")
    public OrderResponse get(@PathVariable Long id) { return service.find(id); }
}
```

## Express/TS comparison

```ts
// Prisma
const user = await prisma.user.findUnique({ where: { email } });
const list = await prisma.user.findMany({
  where: { status: 'ACTIVE', email: { contains: q } },
  orderBy: { createdAt: 'desc' },
  skip: page * size, take: size,
});
const created = await prisma.user.create({ data });
```

| Prisma | Spring Data JPA |
| --- | --- |
| `findUnique({ where: { id } })` | `findById(id)` |
| `findMany({ where: ... })` | Derived query / `Specification` |
| `where: { email: { contains } }` | `findByEmailContaining` |
| `orderBy` | `OrderBy` in method name / `Sort` |
| `skip / take` | `Pageable` (`PageRequest.of`) |
| `create({ data })` | `save(entity)` |
| `update({ where, data })` | `save(entity)` (after dirty mutation in tx) |
| `deleteMany({ where })` | `@Modifying @Query("DELETE ...")` |
| `include` | `@EntityGraph` / `JOIN FETCH` |
| `select` | DTO projection |
| Raw SQL | `nativeQuery = true` or `JdbcClient` |

## Gotchas

> [!warning] `@Modifying` queries need a transaction
> Without `@Transactional` (somewhere in the call chain) you get `TransactionRequiredException`. Repository methods don't have it by default; put it on the service.

> [!warning] `@Modifying` doesn't update the persistence context
> After a bulk `UPDATE ... SET status = ...`, entities already in the context still hold old values. Use `@Modifying(clearAutomatically = true, flushAutomatically = true)` or `em.clear()`.

> [!warning] `findAll()` on a huge table
> Loads everything into memory. Always paginate, or use a streaming query.

> [!warning] Derived queries become illegible past 3 conditions
> `findByStatusAndCreatedAtBetweenAndEmailContainingIgnoreCaseOrderByCreatedAtDescIdAsc(...)` is unreadable. Switch to `@Query` or `Specification`.

> [!warning] `save()` and the persistence context
> Inside a `@Transactional` method, mutating an entity loaded by JPA writes to DB at flush time even WITHOUT calling `save()`. `save()` returns the **managed** instance — for new entities, use the returned reference.

> [!tip] `getReferenceById` for FK without loading
> When you only need to set a FK, `repo.getReferenceById(productId)` returns a proxy without hitting DB.

## Related

- [[02-Entity-Basics]]
- [[03-Relationships]]
- [[05-Transactions]]
- [[06-N-Plus-One-and-Fetching]]
- [[10-Native-Queries-Projections]]
