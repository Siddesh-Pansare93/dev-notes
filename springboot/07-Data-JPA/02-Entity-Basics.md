# Entity Basics — JPA ka Dil

Socho ek second ke liye. Tum Swiggy ka backend bana rahe ho. Tumhare paas ek `orders` table hai database mein — `order_id`, `user_id`, `restaurant_id`, `status`, `total_amount`, `created_at` — sab kuch. Ab tum Java mein kaam kar rahe ho, toh direct SQL likhna possible hai, but phir ek cheez aati hai jo life easy bana deti hai: **JPA Entity**.

JPA Entity basically tumhare Java class aur database table ke beech ka bridge hai. Ek `@Entity` annotated class likhdo, aur Hibernate (JPA ka implementation) automatically samajh jaata hai — "yeh class `orders` table se map hoti hai, iska yeh field `order_id` column se, woh field `status` column se."

> [!info] Node.js/TypeScript waalon ke liye
> Agar tum Prisma use karte the, toh tum `schema.prisma` mein `model Order { ... }` likhte the. JPA mein **wahi kaam tumhara Java class karta hai**. Difference yeh hai: Prisma schema se TypeScript types generate hote hain. JPA mein tumhara class **khud hi** woh type hai — alag schema file nahi hoti. Class IS the schema.

---

## @Entity Kya Hota Hai? Aur Kyon Chahiye?

Bina Entity ke tum yeh kar rahe ho:

```java
// Bina JPA ke — har jagah raw SQL likhna padta hai
String sql = "SELECT * FROM orders WHERE id = ?";
PreparedStatement ps = connection.prepareStatement(sql);
ps.setLong(1, orderId);
ResultSet rs = ps.executeQuery();
// phir manually map karo har column ko Java field mein
Long id = rs.getLong("order_id");
String status = rs.getString("status");
// ... aur yeh sab har method mein
```

Yeh approach mein problems hain:
- Boilerplate bahut zyada hai
- Column rename karo toh poore codebase mein dhundho
- Type safety zero — `rs.getString("stutus")` likha aur runtime pe crash

JPA Entity ke saath:

```java
@Entity
@Table(name = "orders")
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String status;
    // ...
}

// Use karna itna simple hai:
Order order = entityManager.find(Order.class, orderId);
```

Bhai, yeh fark exactly wahi hai jo Express mein raw `pg` queries aur Prisma ke beech tha. Ek mein sab kuch tum likhte ho, doosre mein framework sambhal leta hai.

---

## Core Annotations — Ek Ek Karke Samjho

Yeh hain woh annotations jo tum roz use karoge:

| Annotation | Kya Karta Hai |
| --- | --- |
| `@Entity` | JPA ko batata hai — "yeh class ek database table represent karta hai" |
| `@Table(name=...)` | Table ka naam override karo (default: class ka naam hi table naam maana jaata hai) |
| `@Id` | Primary key field kaunsa hai |
| `@GeneratedValue` | ID kaise generate hogi — DB se, sequence se, ya UUID |
| `@Column(name=, nullable=, length=, unique=)` | Column ke details — naam, null allowed hai ya nahi, length |
| `@Enumerated(EnumType.STRING)` | Java enum ko database mein store karna |
| `@Embedded` / `@Embeddable` | Ek helper class ke fields ko main table ke columns mein fold karo |
| `@Transient` | Yeh field database mein SAVE NAHI HOGA |
| `@Version` | Optimistic locking — concurrent update conflicts pakdo |
| `@CreationTimestamp` / `@UpdateTimestamp` | Hibernate automatically timestamp set karta hai |

---

## Ek Poora Real-World Entity Example

Chalo ek `User` entity likhte hain — jaise Zomato ya Swiggy mein ek user hota hai:

```java
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.Instant;

@Entity
// Table ka naam "users" rakha — warna default "User" hoga (camelCase class naam)
@Table(
    name = "users",
    // Email pe unique constraint — ek hi email se do accounts nahi bane chahiye
    uniqueConstraints = @UniqueConstraint(columnNames = "email"),
    // Status pe index — "sabhi ACTIVE users dikhao" jaise queries fast hongi
    indexes = @Index(name = "idx_users_status", columnList = "status")
)
public class User {

    @Id
    // PostgreSQL ya MySQL ka auto-increment use karo
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // nullable = false matlab DB level pe NOT NULL constraint
    @Column(nullable = false, length = 255)
    private String email;

    // Column ka naam Java field naam se alag hai — DB mein "password_hash" column hai
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "full_name", length = 100)
    private String fullName;

    // EnumType.STRING — database mein "ACTIVE" store hoga, "0" nahi
    // (ORDINAL use karna mat — neeche gotchas mein explain kiya hai kyun)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserStatus status;

    // Address ek alag class hai jo apne aap mein table nahi banata
    // Balki iske fields is table ke columns ban jaate hain
    @Embedded
    private Address address;

    // updatable = false — yeh field ek baar set hone ke baad update nahi hogi
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    // Optimistic locking — agar do log ek saath same row update karein
    // toh dono same version number dekhenge, save karte waqt conflict detect hoga
    @Version
    private Long version;

    // @Transient — yeh field sirf Java object mein hai, DB mein save nahi hoti
    // Jaise ek temporary flag jo sirf current request ke liye chahiye
    @Transient
    private boolean dirty;

    // JPA ke liye no-arg constructor MANDATORY hai
    // protected rakha hai taaki application code galti se is() call na kare
    protected User() {}

    // Actual useful constructor jahan sab required fields hain
    public User(String email, String passwordHash, String fullName) {
        this.email = email;
        this.passwordHash = passwordHash;
        this.fullName = fullName;
        this.status = UserStatus.ACTIVE; // naya user default ACTIVE hoga
    }

    // @PrePersist — pehli baar save karne se PEHLE automatically call hota hai
    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    // @PreUpdate — har update se PEHLE automatically call hota hai
    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }

    // Getters aur setters (Lombok use karo real projects mein — neeche dekho)
    public Long getId() { return id; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public UserStatus getStatus() { return status; }
    public void setStatus(UserStatus status) { this.status = status; }
    public Address getAddress() { return address; }
    public void setAddress(Address address) { this.address = address; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}

// UserStatus enum — Zomato style: account ACTIVE hai, SUSPENDED hai, ya DELETE ho gayi
public enum UserStatus {
    ACTIVE,
    SUSPENDED,
    DELETED
}

// @Embeddable — yeh class apna alag table nahi banata
// Iska data User table ke andar hi columns ban jaata hai:
//   users.street, users.city, users.zip
@Embeddable
public class Address {
    @Column(name = "street")
    private String street;

    @Column(name = "city")
    private String city;

    @Column(name = "zip", length = 10)
    private String zip;

    // Embeddable ke liye bhi no-arg constructor chahiye
    protected Address() {}

    public Address(String street, String city, String zip) {
        this.street = street;
        this.city = city;
        this.zip = zip;
    }

    // Getters...
    public String getStreet() { return street; }
    public String getCity() { return city; }
    public String getZip() { return zip; }
}
```

Yeh code dekho — ek cheez notice karo. `User` table mein `street`, `city`, `zip` columns automatically aayenge `Address` class se. Koi `address` column nahi hoga. Yeh `@Embedded` + `@Embeddable` ka kaam hai — value object ko flat karke main table mein daaldo.

---

## ID Generation Strategies — Kaunsa Kab Use Karein?

Har project mein yeh sawaal aata hai — primary key kaise generate karein? Chaar options hain:

```java
// --- Option 1: IDENTITY ---
// PostgreSQL ka SERIAL ya MySQL ka AUTO_INCREMENT use karta hai
// Seedha aur simple, production mein sabse zyada use hota hai
// Downside: batch inserts slow ho sakti hain kyunki har insert ke baad ID milti hai
@Id
@GeneratedValue(strategy = GenerationType.IDENTITY)
private Long id;


// --- Option 2: SEQUENCE ---
// PostgreSQL sequences use karta hai — IDENTITY se zyada flexible hai
// allocationSize = 50 matlab Hibernate ek baar mein 50 IDs reserve kar leta hai
// Phir 50 inserts tak DB se baat nahi karni — bahut fast!
// Large scale apps mein yeh prefer karo
@Id
@GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "user_seq")
@SequenceGenerator(
    name = "user_seq",
    sequenceName = "user_id_seq",  // PostgreSQL mein yeh sequence create hogi
    allocationSize = 50             // 50 IDs ek saath reserve karo
)
private Long id;


// --- Option 3: UUID ---
// Application side pe UUID generate hoti hai — DB se poochhna hi nahi padta
// Distributed systems mein useful — jaise microservices mein
// Hibernate 6+ mein directly support hai
// Downside: storage zyada lagti hai, index performance thodi slow
@Id
@GeneratedValue(strategy = GenerationType.UUID)
private UUID id;


// --- Option 4: Manual / Business Key ---
// Tum khud ID set karte ho — jaise country code, IFSC code, product SKU
// Jab ID ka koi business meaning ho tab use karo
@Id
private String ifscCode; // "SBIN0001234" jaisa fixed identifier
```

> [!tip] Kaunsa choose karein?
> - Simple CRUD apps: `IDENTITY` theek hai
> - High-throughput apps (Swiggy jaise — lakhs of orders per day): `SEQUENCE` with allocationSize
> - Microservices ya distributed systems: `UUID`
> - Business identifiers (IFSC, PAN, SKU): Manual

---

## application.yml — Schema Control

Yeh config bahut important hai. Ek galat setting production ka data uda sakti hai:

```yaml
spring:
  jpa:
    hibernate:
      # validate — Hibernate check karta hai ki entity aur DB schema match karte hain
      # agar nahi karte toh startup pe error — yeh prod mein sahi hai
      # KABHI KABHI 'update' ya 'create' prod mein mat use karo!
      ddl-auto: validate

    # open-in-view: false BAHUT ZAROORI HAI
    # Default true hai — matlab HTTP request poori hone tak
    # persistence context open rehta hai, lazy loading bugs chhup jaati hain
    # false karo aur asli problems surface hone do
    open-in-view: false

    properties:
      hibernate:
        # SQL logs pretty-printed honge — dev mein useful
        format_sql: true

        # Batch insert/update — ek saath kaafi SQL execute hogi
        # Performance ke liye important hai
        jdbc:
          batch_size: 50
        order_inserts: true
        order_updates: true

    # Dev mein SQL dikhao — PROD mein band karo (logs pollute hoti hain)
    show-sql: true
```

> [!warning] `ddl-auto` options ki list
> - `none` — Hibernate kuch nahi karta schema pe (prod ke liye safe)
> - `validate` — schema check karta hai, mismatch pe fail (prod ke liye best)
> - `update` — diff dhundhta hai aur alter karta hai (KABHI PROD MEIN MAT!)
> - `create` — har startup pe tables drop karke recreate (testing only)
> - `create-drop` — startup pe create, shutdown pe drop (unit tests ke liye)

---

## Prisma vs JPA — Side by Side Comparison

Tu Prisma se aa raha hai — toh directly compare karte hain:

```prisma
// schema.prisma mein yeh likha hota tha
model User {
  id           Int        @id @default(autoincrement())
  email        String     @unique
  passwordHash String     @map("password_hash")
  fullName     String?    @map("full_name")
  status       UserStatus
  createdAt    DateTime   @default(now()) @map("created_at")
  updatedAt    DateTime   @updatedAt      @map("updated_at")

  @@map("users")
  @@index([status])
}

enum UserStatus { ACTIVE SUSPENDED DELETED }
```

Ab dekho JPA mein kya equivalent hai:

| Prisma | JPA |
| --- | --- |
| `model User { ... }` | `@Entity @Table(name="users")` |
| `@id @default(autoincrement())` | `@Id @GeneratedValue(strategy = IDENTITY)` |
| `@unique` | `@Column(unique=true)` ya `@UniqueConstraint` |
| `@map("password_hash")` | `@Column(name="password_hash")` |
| `@@map("users")` | `@Table(name="users")` |
| `@@index([status])` | `@Index(name="idx_users_status", columnList="status")` |
| `@default(now())` | `@PrePersist` method ya `@CreationTimestamp` |
| `@updatedAt` | `@PreUpdate` method ya `@UpdateTimestamp` |
| `String?` (nullable) | `@Column(nullable=true)` (default) |
| `String` (required) | `@Column(nullable=false)` |
| Schema se TypeScript types generate | Nahi hota — class KHUD hi type hai |

**Sabse bada fark**: Prisma mein tum `prisma migrate dev` chalate the aur schema se migration automatically ban jaata tha. JPA mein **migrations alag tool se manage hoti hain** — Flyway ya Liquibase. Entity class sirf mapping batata hai, migration nahi chalata.

---

## Lifecycle Callbacks — Entity ke Lifecycle Events

JPA entities ke paas lifecycle hooks hote hain — exactly jaise Express mein middleware tha ya Prisma mein `$use` hooks. Har important event pe apna code run kar sakte ho:

```java
@Entity
public class Order {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String status;
    private Instant createdAt;
    private Instant updatedAt;

    // Pehli baar DB mein save hone SE PEHLE call hota hai
    @PrePersist
    void onCreate() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
        System.out.println("Order create ho raha hai!");
    }

    // Save HONE KE BAAD call hota hai
    @PostPersist
    void afterCreate() {
        System.out.println("Order saved! ID: " + this.id);
        // Yahan notification service call kar sakte ho
    }

    // Update SE PEHLE
    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }

    // Update KE BAAD
    @PostUpdate
    void afterUpdate() {
        // Audit log likh sakte ho
    }

    // Delete SE PEHLE
    @PreRemove
    void onDelete() {
        // Koi cleanup karo
    }

    // Delete KE BAAD
    @PostRemove
    void afterDelete() {
        // Cache invalidate karo
    }

    // DB se load hone KE BAAD (find/query)
    @PostLoad
    void afterLoad() {
        // Koi computed field set karo
    }
}
```

---

## @Embedded aur @Embeddable — Value Objects

Ek real example: Zomato mein delivery address. Tum ek alag `addresses` table bana sakte ho, ya delivery address ke fields directly `orders` table mein daal sakte ho using `@Embedded`.

```java
@Embeddable
public class DeliveryAddress {

    @Column(name = "delivery_street", nullable = false)
    private String street;

    @Column(name = "delivery_city", nullable = false)
    private String city;

    @Column(name = "delivery_state", length = 50)
    private String state;

    @Column(name = "delivery_pincode", length = 6)
    private String pincode;

    @Column(name = "delivery_landmark")
    private String landmark;

    protected DeliveryAddress() {}

    public DeliveryAddress(String street, String city, String state, String pincode) {
        this.street = street;
        this.city = city;
        this.state = state;
        this.pincode = pincode;
    }

    // Getters...
}

@Entity
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;
    private String status;

    // Address ke saare fields "orders" table mein hi honge:
    // delivery_street, delivery_city, delivery_state, delivery_pincode, delivery_landmark
    @Embedded
    private DeliveryAddress deliveryAddress;

    // ...
}
```

DB mein `orders` table kuch aisa dikhega:
```
| id | user_id | status   | delivery_street     | delivery_city | delivery_pincode |
|----|---------|----------|---------------------|---------------|------------------|
| 1  | 101     | PLACED   | 42 MG Road         | Bangalore     | 560001           |
```

Koi alag address table nahi, koi JOIN nahi — sab ek hi row mein. Simple aur fast.

---

## @Version aur Optimistic Locking — Concurrency Problem Solve Karo

Socho IRCTC pe ticket booking ho rahi hai. Do log ek saath same seat book karne ki koshish karte hain. Yeh concurrent update problem hai.

**Optimistic Locking** ka matlab: assume karo ki conflicts rare hain. Jab save karo, check karo ki kisi ne beech mein change toh nahi kiya.

```java
@Entity
public class SeatInventory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String trainNumber;
    private String seatClass;    // "SLEEPER", "3AC", "2AC"
    private int availableSeats;

    // Yeh column DB mein hoga — har update pe automatically increment hota hai
    // Hibernate khud manage karta hai isko
    @Version
    private Long version;

    // Seat book karo
    public void bookSeats(int count) {
        if (this.availableSeats < count) {
            throw new RuntimeException("Seats available nahi hain!");
        }
        this.availableSeats -= count;
    }
}
```

Agar do transactions ek saath same `SeatInventory` load karein (dono version = 5 dekhte hain), phir ek save kare (version 6 ho jaata hai), toh doosre ki save pe Hibernate check karta hai — "main version 5 se update kar raha tha, lekin ab version 6 hai!" — aur `OptimisticLockException` throw karta hai.

Tumhara code handle karo:
```java
try {
    seatInventory.bookSeats(2);
    seatRepository.save(seatInventory);
} catch (OptimisticLockException e) {
    // Retry karo ya user ko batao — "Please dobara try karo"
    throw new RuntimeException("Concurrent booking conflict — retry karein");
}
```

---

## Gotchas — Yeh Galtiyan Mat Karna

> [!warning] `ddl-auto: update` production mein mat use karo
> Yeh Hibernate ka sabse dangerous setting hai. Tumhare entity changes se schema update hota hai — columns add ho sakti hain, lekin **columns DROP NAHI hoti**! Agar tum ek column rename karo, purana column wahi rahega aur naya alag se bana. Data silently corrupt ho sakta hai. Production mein hamesha `validate` ya `none` use karo, aur Flyway/Liquibase se migrations run karo.

> [!warning] No-arg constructor mandatory hai
> JPA entity instantiate karta hai via reflection using no-arg constructor. Agar nahi hai toh runtime pe `InstantiationException` aayega. Usse `protected` rakho taaki application code galti se `new User()` call na kare bina kisi argument ke.

> [!warning] `@Entity` classes records nahi ho sakti
> Java records immutable hoti hain — unke paas setters nahi hote. JPA ko setters chahiye entities update karne ke liye. Records **DTOs ke liye** perfect hain, entities ke liye nahi.

> [!warning] `@Enumerated(EnumType.ORDINAL)` — default aur khatarnak
> Agar tum `@Enumerated` likhte ho bina `EnumType.STRING` ke, toh DB mein `0`, `1`, `2` store hoga enum ke order ke hisaab se. Kal tumne enum mein ek naya value add kiya ya order change kiya — poora data corrupt! Hamesha `@Enumerated(EnumType.STRING)` use karo.

> [!warning] `equals` / `hashCode` — yeh carefully implement karo
> Default `Object.equals` reference identity check karta hai. Jab same row do alag Java objects mein load hoti hai, woh `equals` ke hisaab se alag hote hain. Yeh `HashSet` ya `HashMap` mein entities daalne pe problem aata hai. Safe pattern: `equals` sirf tab compare karo jab dono ki IDs non-null hain.

```java
@Override
public boolean equals(Object o) {
    if (this == o) return true;
    if (!(o instanceof User)) return false;
    User user = (User) o;
    // Dono ka ID null hai toh reference check
    if (id == null || user.id == null) return false;
    return Objects.equals(id, user.id);
}

@Override
public int hashCode() {
    // Fixed value — kyunki persist hone se pehle id null hoti hai
    // aur hashCode consistent rehna chahiye
    return getClass().hashCode();
}
```

> [!warning] `open-in-view: true` — Boot ka default, lekin problem source
> Default configuration mein Spring Boot HTTP request poori hone tak persistence context open rakhta hai. Iska matlab: Controller mein bhi lazy relations load ho sakte hain accidentally. Real problems chhup jaati hain. `open-in-view: false` karo — problems surface hogi, tum properly fix karoge.

> [!tip] Lombok ke saath entities — dhyan se
> `@Data` annotation mat use karo entities pe. Yeh `equals`/`hashCode` ALL fields pe generate karta hai — relationships bhi include ho jaate hain — aur infinite loop ho sakta hai. Sirf yeh use karo:
> ```java
> @Getter
> @Setter
> @NoArgsConstructor(access = AccessLevel.PROTECTED)
> @Entity
> public class User { ... }
> ```
> `equals` aur `hashCode` khud likhna better hai entities ke liye.

> [!tip] @Column(nullable = false) ka fayda
> Yeh sirf DB constraint nahi hai — Hibernate validation bhi run karta hai before insert. But agar tum Bean Validation chahte ho (Java-side validation), toh `@NotNull` (from `jakarta.validation`) alag se dalna hoga alongside `@Column(nullable = false)`.

---

## Key Takeaways

- **`@Entity`** ek Java class ko JPA-managed table representation banata hai — exactly jaise Prisma ka `model`
- **`@Table`** se table naam, unique constraints, aur indexes define karo
- **`@Id` + `@GeneratedValue`** se primary key strategy choose karo — simple apps ke liye `IDENTITY`, high-throughput ke liye `SEQUENCE`
- **`@Column`** se column naam, nullability, length customize karo
- **No-arg constructor mandatory hai** — `protected` rakho taaki misuse na ho
- **`@Enumerated(EnumType.STRING)`** hamesha — ordinal use karna data corruption ka raasta hai
- **`@Embedded` + `@Embeddable`** se value objects ko flatten karo — alag table ki zaroorat nahi
- **`@Version`** se optimistic locking karo — concurrent updates safely handle honge
- **`@PrePersist` / `@PreUpdate`** lifecycle hooks hain — timestamps set karne ke liye perfect
- **`ddl-auto: validate`** production mein — kabhi `update` nahi
- **`open-in-view: false`** set karo hamesha — lazy loading bugs early pakdo
- **Lombok `@Data` entities pe mat use karo** — `@Getter @Setter @NoArgsConstructor` use karo
- **`equals`/`hashCode`** carefully implement karo — ID-based, reference-based nahi
