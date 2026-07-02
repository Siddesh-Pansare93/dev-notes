# Auditing & Soft Delete

> [!info] Express/TS dev ke liye
> Yahan do related cheezein cover ho rahi hain: pehla — kisne aur kab row change ki (auditing), aur dusra — "delete" karna bina data actually gawaye (soft delete). Prisma wale is problem ko middleware se solve karte hain — ek `$use` middleware likhke `updatedAt` aur `deletedAt` set karte ho. Spring mein yeh built-in support ke saath aata hai: `@EnableJpaAuditing` auditing ke liye, aur Hibernate-specific `@SQLDelete` + `@Where`/`@SQLRestriction` soft delete ke liye. Matlab boilerplate middleware likhne ki zaroorat hi nahi.

## Auditing

### Kya hota hai aur kyun zaroori hai?

Socho tum Zomato ka backend bana rahe ho. Har order row mein tumhe pata hona chahiye — yeh order kab create hua, last kab update hua, aur agar koi admin panel se manually kuch change kare, toh kisne kiya. Yeh sab manually har jagah `createdAt = new Date()` likh ke set karna bore-driven development hai — bhool jaoge kahin na kahin. Auditing isi cheez ko automate karta hai: Spring khud in fields ko track karke fill kar deta hai, tumhe kuch bhi manually set karne ki zaroorat nahi.

### Setup

Sabse pehle `@EnableJpaAuditing` on karo aur batao ki "current user kaun hai" yeh Spring ko kaise pata chale — iske liye `AuditorAware` bean chahiye:

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

Yahan `AuditorAware` basically ek functional interface hai jiska ek hi kaam hai — "abhi kaun logged-in user hai batao". Spring Security context se currently authenticated user ka naam nikal ke deta hai, aur agar koi authenticated nahi hai (jaise koi background cron job chal raha ho), toh fallback `"system"` use ho jata hai.

### Base class banao aur annotate karo

Ab ek common `Auditable` base class banate hain jisme yeh 4 fields honge — jaise Express mein tum ek `BaseEntity`/mixin bana lete ho jisme `createdAt`, `updatedAt` common ho:

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

> [!info] `@MappedSuperclass` kya hai?
> Yeh batata hai ki `Auditable` khud ek entity/table nahi hai — iski fields sirf child entities mein "inherit" hoke unke apne column ban jaayengi. `@EntityListeners(AuditingEntityListener.class)` woh listener hai jo actual magic karta hai — INSERT/UPDATE hone se pehle yeh listener trigger hota hai aur `@CreatedDate`, `@LastModifiedDate` waali fields ko populate kar deta hai.

Ab koi bhi entity isko extend kar le — bas:

```java
@Entity
@Table(name = "users")
public class User extends Auditable {
    @Id @GeneratedValue Long id;
    @Column(unique = true) String email;
    // ... business fields ...
}
```

Spring ab in chaaron fields (`createdAt`, `updatedAt`, `createdBy`, `updatedBy`) ko har `INSERT` / `UPDATE` par automatically bhar dega. Tumhe kabhi manually inko set karne ki zaroorat nahi — bilkul waise jaise Prisma middleware har `create`/`update` call ko intercept karke `updatedAt` set kar deta tha.

### Alternative: Sirf Hibernate annotations (AuditorAware ki zaroorat nahi)

Agar tumhe sirf timestamps chahiye, "kisne kiya" wala part nahi chahiye, toh Spring's `@EnableJpaAuditing` setup ki bhi zaroorat nahi — seedha Hibernate ke apne annotations use kar lo:

```java
@CreationTimestamp
@Column(name = "created_at", updatable = false)
private Instant createdAt;

@UpdateTimestamp
@Column(name = "updated_at")
private Instant updatedAt;
```

`@CreationTimestamp` / `@UpdateTimestamp` pure Hibernate ke feature hain — yeh sirf timestamp set karte hain, user ka naam capture nahi karte. Simpler use case ke liye kaafi hai.

> [!tip] Kaunsa use karu?
> Agar sirf `createdAt`/`updatedAt` chahiye — Hibernate ke `@CreationTimestamp`/`@UpdateTimestamp` use karo, kam setup. Agar `createdBy`/`updatedBy` bhi chahiye (audit trail ke liye "kisne kiya" important hai — jaise CRED ya banking apps mein), toh Spring Data's `@EnableJpaAuditing` + `AuditorAware` route lo.

### Envers — full revision history

Ab socho tumhe sirf "last update kab hua" nahi, balki "is order ka poora history — har change, har version" chahiye — jaise git ka commit history. Iske liye Hibernate Envers hai — yeh har change ko separate row mein store kar deta hai, ek complete audit log.

```xml
<dependency>
    <groupId>org.hibernate.orm</groupId>
    <artifactId>hibernate-envers</artifactId>
</dependency>
```

Entity pe bas `@Audited` laga do:

```java
@Entity
@Audited                                  // Envers tracks every change
public class Order { ... }
```

Iske baad Hibernate automatically `order_AUD` (audit table) aur `revinfo` (revision metadata table) bana deta hai. History query karne ke liye:

```java
AuditReader reader = AuditReaderFactory.get(em);
List<Number> revisions = reader.getRevisions(Order.class, orderId);
Order historicalState = reader.find(Order.class, orderId, revisions.get(0));
```

Yeh bilkul aisa hai jaise IRCTC ya banking system mein tum dekh sakte ho ki ek particular booking/transaction record time ke saath kaise-kaise change hua — Envers tumhe woh time-travel dega bina khud manually versioning table maintain kiye.

## Soft delete

### Kya hota hai aur kyun zaroori hai?

Jab koi user apna Zomato account "delete" karta hai, actually usko database se hata dena risky hota hai — uske orders, reviews, payment history sab kuch dangle ho jayega, aur agar galti se delete ho gaya toh recovery possible nahi. Isliye real-world apps mein "delete" ka matlab hota hai — row ko ek flag/timestamp se mark kar do "deleted" as, lekin actually row database mein rehne do. Isko soft delete kehte hain. Do clean approaches hain Spring/Hibernate mein.

### Approach 1 — Hibernate `@SQLDelete` + `@Where` (ya `@SQLRestriction`)

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

Yahan do cheezein ho rahi hain:
- `@SQLDelete` — jab bhi Hibernate `DELETE` query chalane wala hota, uski jagah yeh custom SQL chala deta hai — actual delete ki jagah `deleted_at` column update.
- `@SQLRestriction` (pehle `@Where` kehlata tha) — har `SELECT` query ke saath automatically `WHERE deleted_at IS NULL` append ho jata hai, taaki deleted rows kabhi normal query mein nazar hi na aayein.

Ab jab tum `userRepository.delete(user)` call karoge, actual mein `UPDATE ... SET deleted_at = now()` chalega, aur har `SELECT` automatically `WHERE deleted_at IS NULL` append karega — bilkul transparent, tumhe koi extra code likhne ki zaroorat nahi.

### Approach 2 — `enabled`/`active` flag (manual)

Agar Hibernate ka "magic" pasand nahi, aur explicit control chahiye:

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

Yeh approach zyada explicit hai, koi hidden magic nahi hoti — lekin nuksan yeh hai ki tumhe har query mein khud yaad rakhna padega `active = true` filter lagana. Bhool gaye ek jagah, toh deleted users bhi dikhne lagenge — jaise Prisma mein agar tum har jagah manually `where: { deletedAt: null }` likhna bhool jao.

### Soft-delete filter ko bypass karna (admin / restore ke liye)

Ab problem yeh hai — `@SQLRestriction` unconditional hai, matlab yeh HAR query pe lag jata hai, chaahe tumhe deleted rows explicitly chahiye ho (jaise admin panel mein "restore user" feature banate waqt). Iske liye ek native query likhni padegi jo is restriction ko bypass kare:

```java
@Query(value = "SELECT * FROM users WHERE id = :id", nativeQuery = true)
Optional<User> findIncludingDeleted(@Param("id") Long id);
```

Ya phir do alag entities/views bana lo — ek normal filtered view ke liye, ek admin/unrestricted view ke liye.

### Indexing tip

Jab tumhare paas millions of rows hain aur zyada tar queries sirf "active" rows dhoondti hain, toh PostgreSQL ka partial index bahut kaam aata hai:

```sql
CREATE INDEX idx_users_active ON users(id) WHERE deleted_at IS NULL;
```

Yeh sirf live (non-deleted) rows ka index banata hai — index chhota rehta hai aur lookups fast, kyunki deleted rows index mein jagah hi nahi ghera rahe.

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

Basically jo kaam Prisma mein tumhe khud middleware likh ke karna padta tha, Spring/Hibernate mein woh annotations ke through declaratively ho jata hai — kam code, kam chances of bhoolne ke.

## Gotchas

> [!warning] `@SQLDelete` cascaded deletes mein `@PreRemove` callbacks sahi se fire nahi karta (purane Hibernate mein)
> Cascade-delete scenarios ko zaroor test karo. Kabhi-kabhi direct DELETE statements related tables pe tumhare soft-delete logic ko bypass kar dete hain — matlab parent soft-delete ho gaya lekin child hard-delete ho gaya. Yeh silent data-loss bug ban sakta hai agar test na kiya.

> [!warning] Unique constraints + soft delete ka combo dangerous hai
> Agar `email` column unique hai aur tumne ek user ko soft-delete kar diya, toh woh email address dobara use nahi ho sakta jab tak tum hard-delete na karo ya usko null/change na karo. Socho — ek user ne apna Swiggy account "delete" kiya, aur dobara wahi email se signup karna chaha — fail ho jayega agar handle nahi kiya. Do solutions hain:
> - `email` ko unique rakho sirf `deleted_at IS NULL` waali rows ke liye (PostgreSQL partial index)
> - Delete karte waqt email ko uniquify kar do: `email = email || '-deleted-' || id`

> [!warning] `@SQLRestriction` SAARI queries pe lagta hai, joins samet
> Agar `Order.user` field `User` ko join karta hai, aur woh user soft-deleted hai, toh us user ke orders bhi gayab ho jayenge query results se — chahe order khud deleted na ho. Yeh desired ho sakta hai ya nahi — design carefully socho, warna production mein confusing bug lagega ("order kahan gaya?").

> [!warning] `@CreatedBy` ko authentication chahiye hoti hai
> `AuditorAware` bina configure kiye, tumhe `NullPointerException` ya empty values milenge. Batch jobs/cron ke liye bhi ek fallback auditor (jaise `"system"`) provide karna mat bhoolo — warna scheduled task fail ho jayega.

> [!tip] Har cheez ko soft-delete mat karo
> Isme real cost hai: har query filter honi padti hai, har unique constraint ko special handling chahiye, har join mein hidden semantics aa jaate hain. Sirf woh cheezein soft-delete karo jo actually auditable ya restorable hone chahiye (jaise users, orders, payments) — baaki sab (jaise temporary logs, OTP records) hard-delete hi kar do.

## Related

- [[02-Entity-Basics]]
- [[03-Relationships]]
- [[01-Spring-Security-Concepts]]
