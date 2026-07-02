# DTOs and Mapping

Socho ek second ke liye — tumhare paas ek Zomato jaise app hai. Database mein `User` table hai jisme `password_hash`, `internal_credit_score`, `fraud_flag`, `created_by_admin` jaise sensitive columns hain. Ab agar koi `/api/users/me` call kare toh kya tum seedha woh poora database row return kar doge? **Bilkul nahi.** Tum sirf woh fields return karoge jo client ko chahiye — `name`, `email`, `phone`.

Yahi kaam DTOs karte hain.

DTO ka full form hai **Data Transfer Object** — ek simple class/record jo API boundary cross karta hai. Tumhara `@Entity` class tumhara internal database model hai (Hibernate/JPA usse manage karta hai), aur DTO woh "packet" hai jo client ko jaata hai ya client se aata hai. Yeh dono alag hone chahiye — aur Spring Boot mein yeh ek fundamental best practice hai.

Node.js/Express background se aate ho toh samjho — Prisma mein `User` model hota hai aur tum manually `{ id, email, name }` return karte ho `res.json()` se. Java mein woh explicit "manual select" ek proper class bana ke karte hain. Sound karta hai verbose, lekin jab project bada ho jaata hai, yeh discipline bahut kaam aati hai.

---

## Kyun zaruri hai DTO? (The Real Reason)

### Problem 1: Sensitive Data Leak

```java
// Galat tarika — Entity seedha return karna
@GetMapping("/users/{id}")
public User getUser(@PathVariable Long id) {
    return userRepository.findById(id).orElseThrow();
    // Yeh passwordHash, internalScore, sab kuch return karega!
}
```

Yeh ek serious security vulnerability hai. Swiggy pe agar koi `/api/delivery-partners/123` call kare aur unka `aadhaar_number` aur `bank_account` bhi response mein aa jaaye — toh soch lo kitni badi problem ho sakti hai.

### Problem 2: LazyInitializationException — The Most Common Spring Disaster

JPA mein relationships lazy-load hoti hain by default. Matlab jab transaction band ho jaati hai (controller mein), tab agar Jackson (JSON serializer) try kare entity ke relations serialize karne ke liye — BOOM:

```
org.hibernate.LazyInitializationException: could not initialize proxy — no Session
```

Yeh tab hota hai jab:
- `User` entity ke paas `List<Order> orders` hai (`@OneToMany`)
- Tum seedha `User` entity return karte ho controller se
- Transaction service layer mein khatam ho chuki hai
- Jackson JSON banane ke liye `orders` access karta hai — session nahi milta

DTO use karo toh yeh problem exist hi nahi karti — tumne explicitly decide kar liya ki kya serialize karna hai.

### Problem 3: API ka Database se Tight Coupling

Kal agar tumne column `full_name` rename karke `display_name` kar diya — toh tumhara API response change ho gaya. Clients break ho gaye. DTO use karo toh field name database se alag rakh sakte ho:

```java
// Database mein hai: display_name
// API mein expose karo: fullName
public record UserResponse(
        Long id,
        String email,
        String fullName   // DTO mein naam alag ho sakta hai
) {}
```

---

## Teen Types ke DTOs

| Role | Example Class | Kab use karo |
|------|--------------|--------------|
| Request DTO | `CreateUserRequest` | Client se data aata hai — validate karo |
| Response DTO | `UserResponse` | Client ko data jaata hai — sensitive fields chhodo |
| Command/Internal | `CreateUserCommand` | Service layer ke beech communication |

IRCTC example mein socho:
- `BookTicketRequest` — user ne kya form fill kiya (passenger name, train, class)
- `BookTicketResponse` — user ko kya dikhao (PNR, seat number, fare)
- `BookTicketCommand` — internal service ko kya bheja (payment ID, inventory lock ID) — client ko yeh nahi dikhna

---

## Java Records — DTOs ka Sabse Seedha Tarika

Java 17+ mein `record` types aaye aur DTOs likhna bahut aasaan ho gaya. Ek `record` automatically generate karta hai:
- Constructor (all fields ka)
- Getters (field ke naam se hi — `email()`, `fullName()`)
- `equals()`, `hashCode()`, `toString()`

```java
// Request DTO — client se aata hai
// @NotBlank, @Email validation annotations hain (05-Validation se)
public record CreateUserRequest(
        @NotBlank(message = "Email required hai bhai")
        @Email(message = "Valid email daal")
        String email,

        @NotBlank
        @Size(min = 8, message = "Password kam se kam 8 characters ka hona chahiye")
        String password,

        @NotBlank
        String fullName
) {}

// Response DTO — client ko jaata hai
// Dhyan dena: password ka koi field nahi hai yahan
public record UserResponse(
        Long id,
        String email,
        String fullName,
        Instant createdAt
) {}
```

> [!tip] Records are Immutable
> Record fields `final` hote hain by default. Ek baar banaya toh change nahi ho sakta. Yeh DTOs ke liye perfect hai — request aaya, process hua, done. Koi mutation nahi.

TypeScript mein yeh kuch aisa hoga:
```typescript
// TypeScript equivalent
interface CreateUserRequest {
  readonly email: string;
  readonly password: string;
  readonly fullName: string;
}

interface UserResponse {
  readonly id: number;
  readonly email: string;
  readonly fullName: string;
  readonly createdAt: Date;
}
```

Fark yeh hai ki Java `record` ek concrete class hai — compile hoti hai, runtime pe exist karti hai. TypeScript interface sirf compile-time pe hoti hai.

---

## Mapping — Entity se DTO, DTO se Entity

DTO banane ke baad tumhe yeh convert karna padega:
- Client ka request DTO → Database Entity (save karne ke liye)
- Database Entity → Response DTO (return karne ke liye)

Teen approaches hain:

### Approach 1: Manual Mapping — Simple Projects ke Liye

```java
@Service
@RequiredArgsConstructor  // Lombok se constructor injection
public class UserService {

    private final UserRepository repo;
    private final PasswordEncoder encoder;

    public UserResponse create(CreateUserRequest req) {
        // DTO → Entity (manual conversion)
        User entity = new User();
        entity.setEmail(req.email());          // record ka getter: req.email()
        entity.setPasswordHash(encoder.encode(req.password()));  // password hash karo
        entity.setFullName(req.fullName());

        User saved = repo.save(entity);

        // Entity → Response DTO
        return toResponse(saved);
    }

    public UserResponse getById(Long id) {
        User user = repo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));
        return toResponse(user);
    }

    // Private helper method — Entity ko Response DTO mein convert karta hai
    private UserResponse toResponse(User u) {
        return new UserResponse(
                u.getId(),
                u.getEmail(),
                u.getFullName(),
                u.getCreatedAt()
                // passwordHash yahan nahi hai — intentionally
        );
    }
}
```

**Kab use karo?** Chhote projects mein, ya jab fields ka mapping 1:1 ho. 5-6 entities tak theek hai. Usse zyada ho toh repetitive ho jaata hai.

**Node.js mein kya karte the?**
```typescript
// Express + Prisma equivalent
const user = await prisma.user.create({ data });
return res.json({
  id: user.id,
  email: user.email,
  fullName: user.fullName,
  createdAt: user.createdAt
  // password: user.passwordHash  ← yeh kabhi mat karo
});
```

Exactly same logic — Java mein bas ek dedicated method mein encapsulate kar dete hain.

---

### Approach 2: MapStruct — Large Projects ka Hero

Jab tumhare paas 20-30 entities hain (Flipkart jaise system mein `Product`, `Order`, `Payment`, `Seller`, `Delivery`, `Return`...), manual mapping likhna bahut tedious aur error-prone ho jaata hai.

**MapStruct** ek annotation processor hai jo:
- Tumhare mapping interface ko read karta hai compile time pe
- Plain Java implementation class generate karta hai
- Runtime pe zero reflection — seedha method calls

**Step 1: Dependency add karo `pom.xml` mein**

```xml
<dependencies>
    <!-- MapStruct library -->
    <dependency>
        <groupId>org.mapstruct</groupId>
        <artifactId>mapstruct</artifactId>
        <version>1.6.3</version>
    </dependency>

    <!-- Annotation processor — compile time pe code generate karta hai -->
    <dependency>
        <groupId>org.mapstruct</groupId>
        <artifactId>mapstruct-processor</artifactId>
        <version>1.6.3</version>
        <scope>provided</scope>  <!-- sirf compile time chahiye, runtime pe nahi -->
    </dependency>
</dependencies>
```

Agar Lombok bhi use kar rahe ho (jo almost sab karte hain), toh `maven-compiler-plugin` configure karna padega. Neeche dekho Gotchas section mein.

**Step 2: Mapper Interface banao**

```java
@Mapper(componentModel = "spring")  // Spring bean banaega is mapper ka
public interface UserMapper {

    // Yeh method MapStruct automatically implement karega
    // User entity → UserResponse DTO
    // Agar field names same hain toh automatic mapping hoti hai
    UserResponse toResponse(User entity);

    // DTO → Entity ke liye thoda complex hai
    // Kyunki kuch fields handle karne hain specially
    @Mapping(target = "id", ignore = true)           // id database generate karega
    @Mapping(target = "createdAt", ignore = true)    // createdAt server set karega
    @Mapping(
        target = "passwordHash",    // Entity mein field ka naam
        source = "password",         // DTO mein field ka naam
        qualifiedByName = "encodePassword"  // custom method use karo
    )
    User toEntity(CreateUserRequest req, @Context PasswordEncoder encoder);

    // Custom method — password encode karne ke liye
    // @Named se upar wala @Mapping link karta hai
    @Named("encodePassword")
    default String encodePassword(String raw, @Context PasswordEncoder encoder) {
        return encoder.encode(raw);
    }
}
```

**Step 3: Service mein use karo**

```java
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository repo;
    private final UserMapper mapper;       // Spring inject karega MapStruct ka generated impl
    private final PasswordEncoder encoder;

    public UserResponse create(CreateUserRequest req) {
        // DTO → Entity
        User entity = mapper.toEntity(req, encoder);

        // Save karo
        User saved = repo.save(entity);

        // Entity → Response DTO
        return mapper.toResponse(saved);
    }

    public UserResponse getById(Long id) {
        return repo.findById(id)
                .map(mapper::toResponse)   // method reference — clean!
                .orElseThrow(() -> new ResourceNotFoundException("User nahi mila: " + id));
    }

    public List<UserResponse> getAll() {
        return repo.findAll().stream()
                .map(mapper::toResponse)
                .toList();
    }
}
```

**MapStruct kya generate karta hai under the hood?**

`target/generated-sources/annotations/` mein jaake dekho — tumhe milega `UserMapperImpl.java`:

```java
// Yeh file MapStruct generate karta hai — tum nahi likhte
@Component
public class UserMapperImpl implements UserMapper {

    @Override
    public UserResponse toResponse(User entity) {
        if (entity == null) return null;
        return new UserResponse(
            entity.getId(),
            entity.getEmail(),
            entity.getFullName(),
            entity.getCreatedAt()
        );
    }

    @Override
    public User toEntity(CreateUserRequest req, PasswordEncoder encoder) {
        if (req == null) return null;
        User user = new User();
        user.setEmail(req.email());
        user.setFullName(req.fullName());
        user.setPasswordHash(encodePassword(req.password(), encoder));
        return user;
    }
}
```

Plain Java! Koi reflection nahi, koi magic nahi. Yeh class directly readable hai.

> [!info] TypeScript mein MapStruct ka equivalent nahi hai
> Closest options hain:
> - **class-transformer** (reflection-based, slower)
> - Hand-rolled `toDto()` functions
> - **Zod** for validation + transform
> Java mein compile-time code generation ka yeh advantage hai ki performance cost zero hai.

---

### Approach 3: ModelMapper / BeanUtils — Avoid Karo

```java
// Yeh mat karo
ModelMapper modelMapper = new ModelMapper();
UserResponse response = modelMapper.map(user, UserResponse.class);
```

Problems:
- Runtime reflection — slow
- Field name mismatch silently ignore ho jaata hai (debug karna mushkil)
- Type mismatches runtime pe explode hote hain
- Compile time pe koi guarantee nahi

---

## Complete Example — Controller se Database tak

Ek complete flow dekho Zomato-style restaurant API ke liye:

```java
// Entity
@Entity
@Table(name = "restaurants")
public class Restaurant {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String city;
    private Double rating;
    private Boolean isActive;

    @Column(name = "owner_phone")  // sensitive — clients ko nahi dikhana
    private String ownerPhone;

    @Column(name = "commission_percent")  // business data — clients ko nahi dikhana
    private Double commissionPercent;

    @CreationTimestamp
    private Instant createdAt;

    // getters/setters ya Lombok @Data
}
```

```java
// Request DTO — restaurant register karne ke liye
public record CreateRestaurantRequest(
        @NotBlank String name,
        @NotBlank String city,
        @NotBlank @Pattern(regexp = "^[6-9]\\d{9}$", message = "Valid Indian phone number daal")
        String ownerPhone
) {}

// Response DTO — public users ko dikhao
// commission aur ownerPhone nahi hai!
public record RestaurantResponse(
        Long id,
        String name,
        String city,
        Double rating,
        Boolean isActive
) {}

// Admin Response DTO — admin users ke liye
// Thoda zyada details
public record AdminRestaurantResponse(
        Long id,
        String name,
        String city,
        Double rating,
        Boolean isActive,
        String ownerPhone,           // admin dekh sakta hai
        Double commissionPercent,    // admin dekh sakta hai
        Instant createdAt
) {}
```

```java
// Mapper
@Mapper(componentModel = "spring")
public interface RestaurantMapper {

    // Public response
    RestaurantResponse toResponse(Restaurant entity);

    // Admin response — same entity, zyada fields
    AdminRestaurantResponse toAdminResponse(Restaurant entity);

    // Request → Entity
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "rating", constant = "0.0")   // naya restaurant, rating 0 se start
    @Mapping(target = "isActive", constant = "true")
    @Mapping(target = "commissionPercent", constant = "15.0")  // default commission
    @Mapping(target = "createdAt", ignore = true)
    Restaurant toEntity(CreateRestaurantRequest req);
}
```

```java
// Controller
@RestController
@RequestMapping("/api/restaurants")
@RequiredArgsConstructor
public class RestaurantController {

    private final RestaurantService service;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RestaurantResponse create(@Valid @RequestBody CreateRestaurantRequest req) {
        return service.create(req);
    }

    @GetMapping("/{id}")
    public RestaurantResponse getById(@PathVariable Long id) {
        return service.getById(id);
    }

    @GetMapping
    public List<RestaurantResponse> getAll() {
        return service.getAll();
    }

    // Admin endpoint — alag DTO return karta hai
    @GetMapping("/admin/{id}")
    // @PreAuthorize("hasRole('ADMIN')")  // Security baad mein
    public AdminRestaurantResponse getAdminView(@PathVariable Long id) {
        return service.getAdminView(id);
    }
}
```

```java
// Service
@Service
@RequiredArgsConstructor
public class RestaurantService {

    private final RestaurantRepository repo;
    private final RestaurantMapper mapper;

    public RestaurantResponse create(CreateRestaurantRequest req) {
        Restaurant entity = mapper.toEntity(req);
        return mapper.toResponse(repo.save(entity));
    }

    public RestaurantResponse getById(Long id) {
        return repo.findById(id)
                .map(mapper::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Restaurant not found: " + id));
    }

    public List<RestaurantResponse> getAll() {
        return repo.findAll().stream()
                .map(mapper::toResponse)
                .toList();
    }

    public AdminRestaurantResponse getAdminView(Long id) {
        return repo.findById(id)
                .map(mapper::toAdminResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Restaurant not found: " + id));
    }
}
```

Dekho kaise ek hi entity ke liye do alag DTOs hain — `RestaurantResponse` (public) aur `AdminRestaurantResponse` (admin ke liye). Yeh flexibility sirf DTOs se milti hai. Direct entity return karte toh ya sab expose karte ya kuch bhi nahi.

---

## TypeScript vs Java — Side by Side

```typescript
// TypeScript/Express/Prisma way
interface CreateRestaurantRequest {
  name: string;
  city: string;
  ownerPhone: string;
}

interface RestaurantResponse {
  id: number;
  name: string;
  city: string;
  rating: number;
}

// Hand-rolled mapper
function toResponse(restaurant: PrismaRestaurant): RestaurantResponse {
  return {
    id: restaurant.id,
    name: restaurant.name,
    city: restaurant.city,
    rating: restaurant.rating,
    // ownerPhone yahan nahi — intentionally
  };
}

// Controller
app.get('/restaurants/:id', async (req, res) => {
  const r = await prisma.restaurant.findUnique({ where: { id: Number(req.params.id) } });
  if (!r) return res.status(404).json({ error: 'Not found' });
  return res.json(toResponse(r));  // DTO apply kiya
});
```

| TypeScript Pattern | Java Equivalent |
|-------------------|-----------------|
| `interface CreateRestaurantRequest` | `record CreateRestaurantRequest(...)` |
| `interface RestaurantResponse` | `record RestaurantResponse(...)` |
| Hand-written `toResponse()` function | Manual mapper method ya MapStruct |
| `Pick<Restaurant, 'id' \| 'name'>` | Alag response record |
| Zod schema validation | `@Valid @RequestBody` + bean validation annotations |
| Prisma model | `@Entity` class |

---

## Gotchas — Common Mistakes Jo Beginners Karte Hain

> [!warning] Galti #1: Entity seedha Controller se Return Karna
> ```java
> // GALAT — kabhi mat karo
> @GetMapping("/{id}")
> public User getUser(@PathVariable Long id) {
>     return repo.findById(id).orElseThrow(); // passwordHash bhi jayega!
> }
> ```
> Teen problems:
> 1. Sensitive fields leak hote hain
> 2. `LazyInitializationException` aata hai lazy relations ke saath
> 3. Database schema change → API break
>
> **Hamesha DTO return karo.**

> [!warning] Galti #2: Same DTO Request aur Response ke Liye Use Karna
> ```java
> // Tempting lagta hai lekin galat hai
> public record UserDto(Long id, String email, String password, String fullName) {}
>
> // Create ke liye — password chahiye, id nahi
> // Response ke liye — id chahiye, password nahi
> // Dono ke liye same DTO? Sab kuch optional/nullable ho jaayega — mess!
> ```
>
> Alag rakho: `CreateUserRequest`, `UpdateUserRequest`, `UserResponse`. Har ek ka clear purpose.

> [!warning] Galti #3: MapStruct + Lombok ka Ordering
> Agar dono use kar rahe ho toh `maven-compiler-plugin` mein processor order matter karta hai — Lombok pehle, MapStruct baad mein:
>
> ```xml
> <plugin>
>     <groupId>org.apache.maven.plugins</groupId>
>     <artifactId>maven-compiler-plugin</artifactId>
>     <version>3.11.0</version>
>     <configuration>
>         <annotationProcessorPaths>
>             <!-- Lombok PEHLE -->
>             <path>
>                 <groupId>org.projectlombok</groupId>
>                 <artifactId>lombok</artifactId>
>                 <version>1.18.30</version>
>             </path>
>             <!-- MapStruct BAAD MEIN -->
>             <path>
>                 <groupId>org.mapstruct</groupId>
>                 <artifactId>mapstruct-processor</artifactId>
>                 <version>1.6.3</version>
>             </path>
>         </annotationProcessorPaths>
>     </configuration>
> </plugin>
> ```
>
> Galat order mein rakha toh MapStruct Lombok ke generated getters/setters nahi dekh paata — "method not found" errors aate hain even when build passes.

> [!tip] IntelliJ mein Annotation Processors Enable Karo
> Settings → Build, Execution, Deployment → Compiler → Annotation Processors → Enable annotation processing
>
> Yeh nahi kiya toh IDE mein "symbol not found" errors dikhega generated `UserMapperImpl` ke liye, even though `mvn compile` kaam karta hai. Build se IDE out of sync lagta hai — confusing hota hai beginners ke liye.

> [!warning] Galti #4: Nested DTOs ko Bhool Jaana
> Agar tumhari entity mein nested entity hai:
> ```java
> public class Order {
>     private User user;        // @ManyToOne
>     private List<OrderItem> items;  // @OneToMany
> }
> ```
> Toh response DTO mein bhi nested DTO hona chahiye:
> ```java
> public record OrderResponse(
>     Long id,
>     UserSummary user,        // UserResponse nahi — shayad sirf naam aur id chahiye
>     List<OrderItemResponse> items,
>     Double totalAmount
> ) {}
>
> public record UserSummary(Long id, String fullName) {}  // sirf itna hi
> public record OrderItemResponse(String itemName, Integer quantity, Double price) {}
> ```
> Sirf top-level DTO banana aur nested entities ko ignore karna — phir wahi LazyInitializationException!

> [!info] Galti #5: DTO Mein Business Logic Daalna
> DTO sirf data carry karta hai — koi business logic nahi:
> ```java
> // GALAT — DTO mein logic mat daalo
> public record OrderResponse(...) {
>     public boolean isEligibleForReturn() {  // yeh service/domain layer ka kaam hai
>         return createdAt.isAfter(Instant.now().minus(7, ChronoUnit.DAYS));
>     }
> }
>
> // SAHI — sirf data
> public record OrderResponse(Long id, Instant createdAt, boolean eligibleForReturn) {}
> // eligibleForReturn service compute karega
> ```

---

## Kab Manual Mapping vs MapStruct?

| Situation | Recommendation |
|-----------|---------------|
| 1-3 entities, quick prototype | Manual mapping — simple rakho |
| 4+ entities, production app | MapStruct — boilerplate hata do |
| Complex custom logic (encryption, external calls) | Manual mapping ya MapStruct `@Named` methods |
| Already using Lombok | MapStruct with proper pom.xml ordering |
| Sirf Kotlin use kar rahe (future) | MapStruct works, lekin data classes directly bhi kaam karte hain |

---

## Key Takeaways

- **Entity kabhi seedha return mat karo** controller se — `@Entity` class tumhara internal persistence model hai, API contract nahi
- **Teen roles yaad rakho**: Request DTO (client se), Response DTO (client ko), Command (internal services ke beech)
- **Java `record`** DTOs ke liye best choice hai — immutable, concise, auto-generated methods
- **Manual mapping** chhote projects ke liye perfectly fine hai — do not over-engineer
- **MapStruct** compile-time code generation karta hai, zero runtime reflection — prefer this for large projects
- **ModelMapper/BeanUtils** avoid karo — reflection-based, error-prone, slow
- **Separate DTOs** request aur response ke liye — same DTO mat use karo dono ke liye
- **Nested entities** ke liye nested DTOs banao — otherwise LazyInitializationException
- **IntelliJ mein annotation processing** enable karna mat bhoolo
- **Lombok + MapStruct** saath use karo toh pom.xml mein processor order matter karta hai — Lombok pehle
