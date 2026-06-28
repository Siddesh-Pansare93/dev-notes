---
tags: [data-jpa, entity, hibernate, mapping]
aliases: [Entity, JPA Entity, Id, GeneratedValue]
stage: intermediate
---

# Entity Basics

> [!info] For the Express/TS dev
> A JPA `@Entity` is the equivalent of a Prisma `model` declaration — it tells the ORM "this Java class maps to a database table." Unlike Prisma where the schema generates types, in JPA the **class IS the schema** (or a partial view of it; migrations are separate, see [[07-Schema-Migration]]). Entities are mutable, must have a no-arg constructor, and live inside a "persistence context" — a unit-of-work cache.

## Concept / How it works

Core annotations from `jakarta.persistence`:

| Annotation | Purpose |
| --- | --- |
| `@Entity` | Marks a class as JPA-managed |
| `@Table(name=...)` | Override default table name (defaults to class name) |
| `@Id` | Primary key |
| `@GeneratedValue` | Strategy for ID generation (`IDENTITY`, `SEQUENCE`, `UUID`, `AUTO`) |
| `@Column(name=, nullable=, length=, unique=)` | Column metadata |
| `@Enumerated(EnumType.STRING)` | Map a Java enum |
| `@Embedded` / `@Embeddable` | Reuse a value object as a set of columns |
| `@Transient` | Field NOT persisted |
| `@Version` | Optimistic locking |
| `@CreationTimestamp` / `@UpdateTimestamp` | Hibernate auto-stamps (or use auditing — [[09-Auditing-Soft-Delete]]) |

## Code example

### A complete entity

```java
@Entity
@Table(name = "users",
       uniqueConstraints = @UniqueConstraint(columnNames = "email"),
       indexes = @Index(name = "idx_users_status", columnList = "status"))
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)   // PostgreSQL/MySQL auto-increment
    private Long id;

    @Column(nullable = false, length = 255)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "full_name", length = 100)
    private String fullName;

    @Enumerated(EnumType.STRING)            // store "ACTIVE", not 0
    @Column(nullable = false, length = 20)
    private UserStatus status;

    @Embedded
    private Address address;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @Version
    private Long version;                    // optimistic lock counter

    @Transient                                // NOT stored
    private boolean dirty;

    protected User() {}                       // JPA requires no-arg constructor

    public User(String email, String passwordHash, String fullName) {
        this.email = email;
        this.passwordHash = passwordHash;
        this.fullName = fullName;
        this.status = UserStatus.ACTIVE;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }

    // getters/setters omitted for brevity
}

@Embeddable
public class Address {
    @Column(name = "street") private String street;
    @Column(name = "city")   private String city;
    @Column(name = "zip", length = 10) private String zip;
    protected Address() {}
}

public enum UserStatus { ACTIVE, SUSPENDED, DELETED }
```

### ID generation strategies

```java
// 1. IDENTITY — DB auto-increment (PostgreSQL serial, MySQL AUTO_INCREMENT)
@GeneratedValue(strategy = GenerationType.IDENTITY)
private Long id;

// 2. SEQUENCE — DB sequence (PostgreSQL preferred, supports batching)
@GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "user_seq")
@SequenceGenerator(name = "user_seq", sequenceName = "user_id_seq", allocationSize = 50)
private Long id;

// 3. UUID — application-generated UUIDs (Hibernate 6+)
@Id
@GeneratedValue(strategy = GenerationType.UUID)
private UUID id;

// 4. Manual / business key
@Id private String code;
```

### `application.yml` — schema control

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: validate     # never `update` or `create` in prod
    open-in-view: false      # IMPORTANT — see Gotchas
    properties:
      hibernate:
        format_sql: true
        jdbc:
          batch_size: 50
        order_inserts: true
        order_updates: true
    show-sql: true            # logs raw SQL — dev only
```

## Express/TS comparison

```prisma
// schema.prisma
model User {
  id           Int       @id @default(autoincrement())
  email        String    @unique
  passwordHash String    @map("password_hash")
  fullName     String?   @map("full_name")
  status       UserStatus
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt      @map("updated_at")

  @@map("users")
  @@index([status])
}

enum UserStatus { ACTIVE SUSPENDED DELETED }
```

| Prisma | JPA |
| --- | --- |
| `model User { ... }` | `@Entity @Table(name="users")` |
| `@id @default(autoincrement())` | `@Id @GeneratedValue(IDENTITY)` |
| `@unique` | `@UniqueConstraint` or `@Column(unique=true)` |
| `@map("password_hash")` | `@Column(name="password_hash")` |
| `@@map("users")` | `@Table(name="users")` |
| `@default(now())` | `@PrePersist` or `@CreationTimestamp` |
| `@updatedAt` | `@PreUpdate` or `@UpdateTimestamp` |
| Generated TS types | (no equivalent — your class IS the type) |

## Gotchas

> [!danger] `ddl-auto: update` in production
> Hibernate's auto-DDL can lose data, miss column drops, and silently diverge from migrations. **Always** use `validate` or `none` in prod, and run [[Flyway]] or [[Liquibase]] for schema changes.

> [!warning] No-arg constructor required
> Even if all fields are final/required. Use `protected` to discourage application code from calling it.

> [!warning] `@Entity` classes shouldn't be records
> Records are immutable; JPA needs setters and a no-arg constructor. Use records for **DTOs**, classes for entities.

> [!warning] `equals` / `hashCode`
> The default `Object.equals` (reference identity) breaks when entities are loaded twice. Implement based on a stable business key, not the auto-generated `id` (which is `null` before persist). One safe pattern: `equals` only checks `id` when both are non-null.

> [!warning] `@Enumerated(EnumType.ORDINAL)` is the default and DANGEROUS
> Storing `0`, `1`, `2`. Adding/reordering enum values silently corrupts the DB. ALWAYS use `EnumType.STRING`.

> [!warning] `open-in-view: true` is the Boot default
> Keeps the persistence context open during the HTTP request, hiding lazy-loading bugs. **Set it to `false`** and surface the issues. See [[06-N-Plus-One-and-Fetching]].

> [!tip] Lombok with entities
> `@Data` generates `equals`/`hashCode` over ALL fields — pulls relationships, infinite loops, performance disaster. Use `@Getter @Setter @NoArgsConstructor` only, write `equals`/`hashCode` by hand.

## Related

- [[01-JDBC-vs-JPA-vs-Hibernate]]
- [[03-Relationships]]
- [[04-Repositories]]
- [[05-Transactions]]
- [[09-Auditing-Soft-Delete]]
- [[Records]]
- [[Lombok]]
