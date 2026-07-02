# Native Queries & Projections

> [!info] Express/TS wale dev ke liye
> Kabhi kabhi tumhe raw SQL chahiye hi hota hai — performance ke liye, vendor-specific features (window functions, `LATERAL`, JSONB ops) ke liye, ya phir JPQL se kaam nahi banta. Spring Data tumhe seedha native SQL likhne deta hai. **Projections** JPA ka tarika hai ye bolne ka "mujhe sirf ye columns chahiye" — bilkul Prisma ke `select` jaisa. Dono ko mila do, aur ye data padhne ka sabse fast tarika ban jaata hai, persistence context ko chhue bina.

## Concept / Ye kaam kaise karta hai

Socho teen alag-alag knobs hain jinhe tum ghuma sakte ho:

| Dimension | Choice |
| --- | --- |
| Query language | JPQL (default) vs native SQL |
| Return shape | Entity / DTO / interface projection / `Tuple` / primitives |
| Mechanism | Spring Data method / `@Query` / `EntityManager` / `JdbcClient` |

Matlab — tum decide karte ho: query kaunsi language mein likhni hai, result kis shape mein wapas chahiye, aur us result ko fetch karne ka mechanism kya hoga. Ye teeno independent choices hain, aur inka combination hi tumhara final query design banata hai.

## Kyun zaruri hai?

JPQL (Java Persistence Query Language) powerful hai, lekin har database ke apne special tricks hote hain — PostgreSQL ka JSONB, window functions, CTEs, `LATERAL` joins. JPQL in sabko support nahi karta kyuki wo database-agnostic hai. Aur agar tumhe pura `User` entity nahi chahiye, sirf `id` aur `email` chahiye, toh poora entity load karna waste hai — extra memory, extra columns fetch, aur persistence context mein unnecessary tracking. Yahi do problems solve karte hain **native queries** (raw SQL likhne ki azaadi) aur **projections** (sirf zaruri columns fetch karna).

## Code example

### Native query

Jab JPQL kaafi nahi, seedha SQL likh do — bas `nativeQuery = true` lagana mat bhoolna:

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

Isko Express/Prisma ke `$queryRaw` jaisa samjho — tum database ke exact SQL dialect mein likh rahe ho, Spring Data usse pass-through karke result deta hai.

### Interface-based projection (sabse clean approach)

Ye Prisma ke `select: { id: true, email: true }` ka JPA version hai — bas ek interface banao jisme wahi getters ho jo tumhe chahiye:

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

Hibernate is interface ko dekhkar samajh jaata hai ki tumhe kaunse columns chahiye, aur SELECT statement mein sirf wahi columns maangta hai. **Poora entity instantiate nahi hota, persistence context ka overhead bhi nahi lagta.** `getDisplayName()` jaisa derived field bhi bana sakte ho SpEL expression se — bilkul waise jaise tum TypeScript mein ek computed getter likhte ho.

> [!tip] Kya hota hai peeche se?
> Hibernate ek dynamic proxy banata hai jo interface implement karta hai, aur query result se directly values fill kar deta hai. Isliye ye "closed projection" (sirf declared fields) ya "open projection" (SpEL wali) ho sakta hai.

### Class/record projection (constructor expression)

Agar tumhe strongly-typed DTO chahiye jisme aggregation bhi ho (jaise order count), toh JPQL ka constructor expression use karo:

```java
public record UserSummary(Long id, String email, String fullName, long orderCount) {}

@Query("""
    SELECT new com.example.user.UserSummary(u.id, u.email, u.fullName, COUNT(o))
    FROM User u LEFT JOIN u.orders o
    GROUP BY u.id, u.email, u.fullName
    """)
List<UserSummary> summaries();
```

Yaad rakho: package + class name **fully qualified** hona chahiye JPQL ke `new` expression mein — sirf `UserSummary` nahi chalega, `com.example.user.UserSummary` likhna padega. Records bilkul fine chalte hain, kyuki Java records ke pass proper constructor hota hi hai.

### Native + DTO mapping (`@SqlResultSetMapping` ke saath)

Jab query native SQL mein ho, lekin result ko clean DTO mein map karna ho, toh `@SqlResultSetMapping` + `@ConstructorResult` ka combo use hota hai. Thoda verbose hai, lekin reusable hai:

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

Yahan `@NamedNativeQuery` entity ke upar define hoti hai (Order class ke saath attach), aur repository sirf uska naam refer karta hai. Column names exactly wahi hone chahiye jo SQL mein alias diye hain (`month`, `revenue`).

### Tuple — dynamic result rows

Kabhi tumhe fixed DTO banana bhi zaroorat nahi lagti — bas ad-hoc columns chahiye hote hain. Wahan `Tuple` kaam aata hai:

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

Ye thoda JavaScript ke plain object jaisa feel deta hai — koi fixed type nahi, bas alias se value nikal lo. Lekin isme type-safety kam hai isliye production code mein interface projection ya record DTO better rehta hai.

### `JdbcClient` — jab JPA ki zaroorat hi nahi

Reports aur analytics queries ke liye JPA ka poora overhead (entity mapping, persistence context, dirty checking) chahiye hi nahi hota. Wahan Spring ka naya `JdbcClient` use karo — plain JDBC jaisa simple, lekin thoda modern syntax ke saath:

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

Yahan koi persistence context nahi hai, koi proxy nahi hai, koi surprise nahi hai — bas ResultSet se manually row-by-row map kar rahe ho. Bade dashboard/reporting queries ke liye ye best choice hai kyuki ismein JPA ka koi baggage nahi.

## Kaunsa approach kab pick karein?

Zomato ki analogy se socho: order detail page pe poori order entity chahiye (relations ke saath) — toh normal repository method use karo. Lekin agar tum ek admin dashboard bana rahe ho jisme sirf "restaurant name + total orders count" dikhana hai lakhon rows mein se, toh wahan projection ya `JdbcClient` use karoge — poori entity load karna bewajah slow hoga.

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

Prisma ke concepts JPA mein aise map hote hain:

| Prisma | JPA / Spring Data |
| --- | --- |
| `select: {...}` | Interface projection / record DTO |
| `$queryRaw` | `@Query(nativeQuery = true)` |
| `$queryRawUnsafe` | `EntityManager.createNativeQuery` |
| Tagged-template typed result | `@SqlResultSetMapping` + `@ConstructorResult` |

## Gotchas — ye galtiyan sab karte hain

> [!warning] Native query + `Pageable` ko `countQuery` chahiye hi chahiye
> Spring Data JPQL ke liye khud COUNT query bana leta hai, lekin native SQL ke liye nahi bana sakta (kyuki SQL parse nahi kar sakta). Tumhe explicitly `countQuery` dena hi padega, warna exception milega.

> [!warning] Interface projections + nested associations ko `@Query` mein joins chahiye
> Agar tumne projection interface mein `getOrders()` jaisa nested association access kiya bina proper join ke, toh Hibernate har row ke liye alag query fire karega — matlab N+1 problem wahi wapas aa gayi jisse bachne ke liye tumne projection use kiya tha.

> [!warning] Native queries persistence context ko update nahi karti
> Agar tumne native `UPDATE` chalaya, toh Hibernate ka first-level cache (persistence context) ko pata hi nahi chalega. Pehle se load ki hui entities stale data dikhati rahengi. Agar dono mila rahe ho toh `em.clear()` call karo taaki cache reset ho jaaye.

> [!warning] DTO projections ka constructor EXACTLY match hona chahiye
> `new UserSummary(u.id, u.email)` mein order, types, count sab kuch match karna zaroori hai jo actual record/class constructor mein hai. Agar mismatch hai toh compile time pe nahi, **runtime** pe error milega — isliye careful rehna.

> [!warning] PostgreSQL ka `RETURNING` `@Modifying @Query` se kaam nahi karega
> Spring Data `@Modifying` query ko void ya int return type maan leta hai (affected rows count). Agar tumhe `RETURNING` clause ka actual data chahiye, toh `EntityManager` use karo aur `createNativeQuery(...).getResultList()` call karo.

> [!tip] Guess mat karo, profile karo
> `hibernate.generate_statistics` enable karo aur dekho actual mein kaunsi queries fire ho rahi hain, kitni baar ho rahi hain — usके baad decide karo ki native SQL pe jaana zaroori hai ya nahi. Bina data ke optimization karna time waste hai.

> [!tip] Records + Java text blocks = readable queries
> Triple-quoted text blocks (`"""..."""`) aur record DTOs ka combo modern JPA code ko surprisingly clean bana deta hai — SQL formatting bhi maintain hoti hai aur DTO bhi ek-line mein define ho jaata hai.

## Related

- [[04-Repositories]]
- [[06-N-Plus-One-and-Fetching]]
- [[01-JDBC-vs-JPA-vs-Hibernate]]
- [[Records]]
