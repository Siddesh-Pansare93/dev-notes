---
tags: [data-jpa, query, projection, native-sql]
aliases: [Native Query, Projection, DTO Projection, Tuple]
stage: intermediate
---

# Native Queries & Projections

> [!info] For the Express/TS dev
> Sometimes you need raw SQL — for performance, vendor-specific features (window functions, `LATERAL`, JSONB ops), or because the JPQL escapes you. Spring Data lets you drop to native SQL inline. **Projections** are the JPA way to say "I only want these columns" — equivalent to Prisma's `select`. Combined, they're the fastest way to read data without touching the persistence context.

## Concept / How it works

Three dimensions:

| Dimension | Choice |
| --- | --- |
| Query language | JPQL (default) vs native SQL |
| Return shape | Entity / DTO / interface projection / `Tuple` / primitives |
| Mechanism | Spring Data method / `@Query` / `EntityManager` / `JdbcClient` |

## Code example

### Native query

```java
public interface UserRepository extends JpaRepository<User, Long> {

    // Vendor-specific (PostgreSQL JSONB)
    @Query(value = """
        SELECT * FROM users
        WHERE preferences -> 'theme' ->> 'color' = :color
        """, nativeQuery = true)
    List<User> withThemeColor(@Param("color") String color);

    // Window functions
    @Query(value = """
        SELECT id, email,
               ROW_NUMBER() OVER (PARTITION BY status ORDER BY created_at DESC) AS rn
        FROM users
        """, nativeQuery = true)
    List<Object[]> rankedByStatus();

    // Native + paging — must provide a count query
    @Query(
        value = "SELECT * FROM users WHERE email LIKE %:q%",
        countQuery = "SELECT COUNT(*) FROM users WHERE email LIKE %:q%",
        nativeQuery = true)
    Page<User> searchNative(@Param("q") String q, Pageable pageable);
}
```

### Interface-based projection (the cleanest approach)

```java
public interface UserView {
    Long getId();
    String getEmail();
    String getFullName();
    @Value("#{target.firstName + ' ' + target.lastName}")  // SpEL
    String getDisplayName();
}

public interface UserRepository extends JpaRepository<User, Long> {
    List<UserView> findByStatus(UserStatus status);          // works automatically

    @Query("SELECT u.id AS id, u.email AS email, u.fullName AS fullName FROM User u")
    List<UserView> minimal();
}
```

Hibernate sees the interface, generates a SELECT only for the requested columns. **No entity instantiation, no persistence context cost.**

### Class/record projection (constructor expression)

```java
public record UserSummary(Long id, String email, String fullName, long orderCount) {}

@Query("""
    SELECT new com.example.user.UserSummary(u.id, u.email, u.fullName, COUNT(o))
    FROM User u LEFT JOIN u.orders o
    GROUP BY u.id, u.email, u.fullName
    """)
List<UserSummary> summaries();
```

Note: package + class name MUST be fully qualified. Records work fine.

### Native + DTO mapping (with `@SqlResultSetMapping`)

```java
@Entity
@SqlResultSetMapping(
    name = "OrderRevenueMapping",
    classes = @ConstructorResult(
        targetClass = OrderRevenue.class,
        columns = {
            @ColumnResult(name = "month",   type = String.class),
            @ColumnResult(name = "revenue", type = BigDecimal.class)
        }))
@NamedNativeQuery(
    name = "Order.monthlyRevenue",
    query = """
        SELECT TO_CHAR(placed_at, 'YYYY-MM') AS month,
               SUM(total) AS revenue
        FROM orders
        GROUP BY TO_CHAR(placed_at, 'YYYY-MM')
        """,
    resultSetMapping = "OrderRevenueMapping")
public class Order { ... }

public record OrderRevenue(String month, BigDecimal revenue) {}

// Use it
public interface OrderRepository extends JpaRepository<Order, Long> {
    @Query(name = "Order.monthlyRevenue", nativeQuery = true)
    List<OrderRevenue> monthlyRevenue();
}
```

### Tuple — dynamic result rows

```java
@Query("SELECT u.id AS id, u.email AS email, COUNT(o) AS orderCount " +
       "FROM User u LEFT JOIN u.orders o GROUP BY u.id")
List<Tuple> stats();

// Access:
List<Tuple> rows = repo.stats();
for (Tuple t : rows) {
    Long id = t.get("id", Long.class);
    String email = t.get("email", String.class);
    Long orderCount = t.get("orderCount", Long.class);
}
```

### `JdbcClient` — when JPA isn't worth it

```java
@Repository
public class ReportingDao {

    private final JdbcClient jdbc;

    public ReportingDao(JdbcClient jdbc) { this.jdbc = jdbc; }

    public List<MonthlyRevenue> monthlyRevenue() {
        return jdbc.sql("""
                SELECT TO_CHAR(placed_at, 'YYYY-MM') AS month,
                       SUM(total) AS revenue
                FROM orders
                GROUP BY 1 ORDER BY 1
                """)
                .query((rs, n) -> new MonthlyRevenue(
                        rs.getString("month"),
                        rs.getBigDecimal("revenue")))
                .list();
    }
}
```

No persistence context, no proxies, no surprises. Good for reports.

## When to pick each

| Need | Use |
| --- | --- |
| CRUD on a single entity | Repository derived query |
| Filter + sort + page | `Specification` or `@Query` |
| Read-only summary | **Interface projection** |
| Aggregation across joins | JPQL constructor expression |
| Vendor SQL (JSONB, CTE, window) | Native `@Query` |
| Reports / analytics | `JdbcClient` |
| Bulk `UPDATE`/`DELETE` | `@Modifying @Query` |

## Express/TS comparison

```ts
// Prisma
const users = await prisma.user.findMany({
  select: { id: true, email: true, fullName: true }   // projection
});

// Raw query
const rows = await prisma.$queryRaw<MonthRev[]>`
  SELECT TO_CHAR(placed_at, 'YYYY-MM') AS month, SUM(total)::numeric AS revenue
  FROM orders GROUP BY 1
`;
```

| Prisma | JPA / Spring Data |
| --- | --- |
| `select: {...}` | Interface projection / record DTO |
| `$queryRaw` | `@Query(nativeQuery = true)` |
| `$queryRawUnsafe` | `EntityManager.createNativeQuery` |
| Tagged-template typed result | `@SqlResultSetMapping` + `@ConstructorResult` |

## Gotchas

> [!warning] Native query + `Pageable` requires `countQuery`
> Spring Data can't auto-derive a COUNT for native SQL. Provide it.

> [!warning] Interface projections + nested associations need joins in your `@Query`
> Otherwise Hibernate fires N+1 to load each association.

> [!warning] Native queries don't update the persistence context
> A native UPDATE bypasses Hibernate's first-level cache. Already-loaded entities show stale data. `em.clear()` if mixing.

> [!warning] DTO projections must MATCH the constructor exactly
> `new UserSummary(u.id, u.email)` — order, types, count all matter. Errors are at runtime.

> [!warning] PostgreSQL `RETURNING` won't work via `@Modifying @Query`
> Spring Data treats the call as void/int. Use `EntityManager` + `createNativeQuery(...).getResultList()` if you need it.

> [!tip] Profile, don't guess
> Enable `hibernate.generate_statistics` and look at the actual queries before deciding to drop to native SQL.

> [!tip] Records + Java text blocks = readable queries
> Triple-quoted strings + record DTOs make modern JPA code surprisingly nice.

## Related

- [[04-Repositories]]
- [[06-N-Plus-One-and-Fetching]]
- [[01-JDBC-vs-JPA-vs-Hibernate]]
- [[Records]]
