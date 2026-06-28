---
tags: [data-jpa, auditing, soft-delete, hibernate]
aliases: [Auditing, Soft Delete, CreatedDate, LastModifiedDate, SQLDelete]
stage: intermediate
---

# Auditing & Soft Delete

> [!info] For the Express/TS dev
> Two related concerns: who/when changed a row (auditing) and "delete" without actually losing data (soft delete). Prisma users typically write a Prisma middleware to set `updatedAt` and `deletedAt`; Spring has built-in support via `@EnableJpaAuditing` plus Hibernate-specific `@SQLDelete` and `@Where` for soft delete.

## Auditing

### Setup

```java
@Configuration
@EnableJpaAuditing(auditorAwareRef = "auditorAware")
public class JpaAuditingConfig {

    @Bean
    public AuditorAware<String> auditorAware() {
        return () -> Optional.ofNullable(SecurityContextHolder.getContext())
                .map(SecurityContext::getAuthentication)
                .filter(Authentication::isAuthenticated)
                .map(Authentication::getName)
                .or(() -> Optional.of("system"));
    }
}
```

### Annotate a base class

```java
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class Auditable {

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private Instant updatedAt;

    @CreatedBy
    @Column(name = "created_by", updatable = false, length = 64)
    private String createdBy;

    @LastModifiedBy
    @Column(name = "updated_by", length = 64)
    private String updatedBy;

    // getters
}
```

```java
@Entity
@Table(name = "users")
public class User extends Auditable {
    @Id @GeneratedValue Long id;
    @Column(unique = true) String email;
    // ... business fields ...
}
```

Spring populates the four fields automatically on every `INSERT` / `UPDATE`.

### Alternative: Hibernate annotations (no `AuditorAware` needed)

```java
@CreationTimestamp
@Column(name = "created_at", updatable = false)
private Instant createdAt;

@UpdateTimestamp
@Column(name = "updated_at")
private Instant updatedAt;
```

`@CreationTimestamp` / `@UpdateTimestamp` are pure Hibernate; they don't capture user — only timestamps.

### Envers — full revision history

For a complete audit log (every change as a separate row), Hibernate Envers:

```xml
<dependency>
    <groupId>org.hibernate.orm</groupId>
    <artifactId>hibernate-envers</artifactId>
</dependency>
```

```java
@Entity
@Audited                                  // Envers tracks every change
public class Order { ... }
```

Hibernate creates `order_AUD` and `revinfo` tables. Query history:

```java
AuditReader reader = AuditReaderFactory.get(em);
List<Number> revisions = reader.getRevisions(Order.class, orderId);
Order historicalState = reader.find(Order.class, orderId, revisions.get(0));
```

## Soft delete

Two clean approaches.

### Approach 1 — Hibernate `@SQLDelete` + `@Where` (or `@SQLRestriction`)

```java
@Entity
@Table(name = "users")
@SQLDelete(sql = "UPDATE users SET deleted_at = current_timestamp WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")    // Hibernate 6.3+; use @Where for older
public class User extends Auditable {

    @Id @GeneratedValue Long id;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    // ...
}
```

Now `userRepository.delete(user)` does `UPDATE ... SET deleted_at = now()`, and every `SELECT` automatically appends `WHERE deleted_at IS NULL`.

### Approach 2 — `enabled` flag

```java
@Entity
public class User {
    @Column(nullable = false)
    private boolean active = true;
}

public interface UserRepository extends JpaRepository<User, Long> {
    List<User> findByActiveTrue();           // explicit
    Optional<User> findByIdAndActiveTrue(Long id);
}
```

More explicit, no Hibernate magic — but you have to remember to filter every query.

### Bypass the soft-delete filter (admin / restoration)

Hibernate's `@SQLRestriction` is unconditional — to fetch deleted rows, write a native query:

```java
@Query(value = "SELECT * FROM users WHERE id = :id", nativeQuery = true)
Optional<User> findIncludingDeleted(@Param("id") Long id);
```

Or split into two entities/views.

### Indexing tip

```sql
CREATE INDEX idx_users_active ON users(id) WHERE deleted_at IS NULL;
```

PostgreSQL partial index — keeps the index small (only live rows).

## Express/TS comparison

```ts
// Prisma middleware approach
prisma.$use(async (params, next) => {
  if (params.action === 'create' || params.action === 'update') {
    params.args.data.updatedAt = new Date();
  }
  if (params.action === 'delete') {
    params.action = 'update';
    params.args.data = { deletedAt: new Date() };
  }
  return next(params);
});
```

| TS / Prisma | Spring / Hibernate |
| --- | --- |
| `$use` middleware | `AuditingEntityListener` + `@CreatedDate` etc. |
| Manual `deletedAt` middleware | `@SQLDelete` + `@SQLRestriction` |
| `where: { deletedAt: null }` everywhere | Implicit via `@SQLRestriction` |
| Audit-log table by hand | Hibernate **Envers** (`@Audited`) |

## Gotchas

> [!warning] `@SQLDelete` doesn't fire `@PreRemove` callbacks for cascaded deletes correctly in older Hibernate
> Test cascade-delete scenarios. Sometimes you'll see direct DELETE statements bypass your soft-delete on related tables.

> [!warning] Unique constraints + soft delete
> If `email` is unique and you soft-delete a user, you can't reuse the email until you hard-delete or null it out. Solutions:
> - Make `email` unique only where `deleted_at IS NULL` (partial index, PostgreSQL)
> - On delete, append a uniquifier: `email = email || '-deleted-' || id`

> [!warning] `@SQLRestriction` applies to ALL queries, even joins
> If `Order.user` joins to `User` and the user is soft-deleted, the order disappears too. May be desired or not — design carefully.

> [!warning] `@CreatedBy` requires authentication
> Without `AuditorAware`, you'll get `NullPointerException` or empty values. Provide one even for batch jobs.

> [!tip] Don't soft-delete everything
> It's a real cost: every query is filtered, every unique constraint needs special handling, every join has hidden semantics. Soft-delete what's auditable/restorable; hard-delete the rest.

## Related

- [[02-Entity-Basics]]
- [[03-Relationships]]
- [[01-Spring-Security-Concepts]]
