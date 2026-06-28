---
tags: [data-jpa, jdbc, hibernate, jpa, layers]
aliases: [JDBC vs JPA, Hibernate, JPA Provider]
stage: intermediate
---

# JDBC vs JPA vs Hibernate

> [!info] For the Express/TS dev
> In Node, the layers go: **driver** (`pg`) → **query builder** (`Knex`) → **ORM** (`Prisma` / `TypeORM`). Java's stack is similar but with a key wrinkle: there's a **specification** layer (JPA) and **implementations** of it (Hibernate, EclipseLink). When people say "JPA," they almost always mean "Hibernate behind the JPA interface." Spring Data JPA sits on top.

## The layers, bottom to top

```
+---------------------------------------------------+
|  Spring Data JPA  (JpaRepository, derived queries)|  ← convenience layer
+---------------------------------------------------+
|  JPA  (jakarta.persistence.* — the SPEC/interface)|  ← portable API
+---------------------------------------------------+
|  Hibernate  (the JPA provider — actual ORM engine)|  ← concrete implementation
+---------------------------------------------------+
|  JDBC  (java.sql.* — connections, statements)     |  ← raw SQL/parameter binding
+---------------------------------------------------+
|  JDBC Driver  (PostgreSQL/MySQL JAR)              |  ← wire protocol
+---------------------------------------------------+
|  Database                                          |
+---------------------------------------------------+
```

| Layer | Equivalent in Node | What it does |
| --- | --- | --- |
| **JDBC** | `pg`, `mysql2` | Raw SQL execution. Manual prepared statements. |
| **JdbcTemplate / JdbcClient** | Knex (query builder) | Spring's thin wrapper over JDBC: less boilerplate, still SQL-first. |
| **Hibernate** | TypeORM | Full ORM: object graph, change tracking, lazy loading, dialect translation. |
| **JPA** | (no equivalent) | An **interface** Hibernate implements. Lets you swap providers. |
| **Spring Data JPA** | Prisma's high-level client | Repository abstraction over JPA: derived queries, paging, `JpaRepository`. |

## Code example — same operation at each layer

### Pure JDBC (rare today)

```java
try (Connection conn = dataSource.getConnection();
     PreparedStatement ps = conn.prepareStatement(
         "SELECT id, email FROM users WHERE id = ?")) {
    ps.setLong(1, 42L);
    try (ResultSet rs = ps.executeQuery()) {
        if (rs.next()) {
            return new User(rs.getLong("id"), rs.getString("email"));
        }
    }
}
```

### `JdbcClient` (Spring 6.1+ — the modern thin layer)

```java
@Repository
public class UserDao {
    private final JdbcClient jdbc;

    public UserDao(JdbcClient jdbc) { this.jdbc = jdbc; }

    public Optional<User> findById(Long id) {
        return jdbc.sql("SELECT id, email FROM users WHERE id = :id")
                   .param("id", id)
                   .query(User.class)
                   .optional();
    }
}
```

### Hibernate via JPA (`EntityManager`)

```java
@Repository
public class UserDao {
    @PersistenceContext
    private EntityManager em;

    public Optional<User> findById(Long id) {
        return Optional.ofNullable(em.find(User.class, id));
    }

    public List<User> byEmail(String email) {
        return em.createQuery("SELECT u FROM User u WHERE u.email = :e", User.class)
                 .setParameter("e", email)
                 .getResultList();
    }
}
```

### Spring Data JPA (most common)

```java
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
}
```

That's it. Spring generates the implementation at startup. See [[04-Repositories]].

## When to pick which

| Use case | Tool |
| --- | --- |
| Standard CRUD, relationships | **Spring Data JPA** (default) |
| Heavy reporting/aggregation queries | `JdbcClient` or native SQL |
| Bulk loads | `JdbcTemplate` batch update |
| Complex domain with rich object graphs | JPA + Hibernate |
| You need raw SQL control with object mapping | `JdbcTemplate` + `RowMapper` |
| Reactive | **Spring Data R2DBC** (separate stack) |

## Express/TS comparison

```ts
// pg (raw)
const r = await client.query('SELECT id, email FROM users WHERE id = $1', [42]);

// Knex (query builder)
const u = await knex('users').where({ id: 42 }).first();

// Prisma (ORM)
const u = await prisma.user.findUnique({ where: { id: 42 } });
```

| Layer | Node | Java |
| --- | --- | --- |
| Driver | `pg` | JDBC driver (`postgresql` jar) |
| Query builder | Knex / Kysely | `JdbcClient` / `JdbcTemplate` |
| ORM | Prisma / TypeORM / Sequelize | Hibernate (via JPA) |
| Repository abstraction | (Prisma client itself) | Spring Data JPA `JpaRepository` |
| Migrations | Prisma migrate | Flyway / Liquibase ([[07-Schema-Migration]]) |

## Gotchas

> [!warning] "JPA" in error messages = Hibernate
> When you see `org.hibernate.LazyInitializationException` or `Hibernate: SELECT ...` in logs, you're seeing Hibernate. JPA is just the API contract.

> [!warning] Don't mix `EntityManager.find()` and raw JDBC in the same transaction lightly
> Hibernate has a first-level cache. Raw JDBC writes bypass it — Hibernate may serve stale data. Use `em.flush()` / `em.clear()` if you must mix.

> [!warning] JPA is not "just SQL with annotations"
> It's a **persistence context** with change tracking, dirty checking, cascade rules, lazy proxies. This power has a learning curve and several footguns ([[06-N-Plus-One-and-Fetching]], [[05-Transactions]]).

> [!tip] Prisma users will miss generated types
> JPA/Hibernate uses runtime reflection. You don't get Prisma-style "your schema is the source of truth, types regenerated." You write entities and migrations separately. Some teams use [[jOOQ]] for type-safe SQL — closer to Prisma's typed-query feel.

## Related

- [[02-Entity-Basics]]
- [[04-Repositories]]
- [[05-Transactions]]
- [[06-N-Plus-One-and-Fetching]]
- [[07-Schema-Migration]]
- [[08-DataSource-Connection-Pool]]
