# Express/TypeScript Devs ke liye Spring Boot FAQ

> [!info] Pehle yeh padho
> Agar tu Node.js/Express ya NestJS se aa raha hai aur Spring Boot ki duniya mein ghus gaya hai — toh yeh file tere liye hi likhi gayi hai. Yahan pe "Express mein X karte the, Spring Boot mein kaise karein?" type ke har sawaal ka seedha jawab hai. Poora ek baar skim kar — 10 minute lagenge, aur phir bahut kuch "click" karega.

---

Soch ek second ke liye. Tu Express mein kaam karta tha — `app.use()`, `req.body`, `res.json()`, `dotenv`, `package.json`, `npm install`. Sab kuch ek hi ecosystem mein tha. Aur ab suddenly Spring Boot? Annotations, XML files, `pom.xml`, `@Autowired`, `ApplicationContext` — yeh sab kya chakkar hai bhai?

Ghabra mat. Concepts wahi hain — DI, routing, middleware, config, DB access, testing. Sirf **bhasha alag hai**. Aur yeh bhasha seekhni padegi, koi shortcut nahi.

Yeh FAQ teri woh "translation guide" hai — Node.js/Express ki duniya se Spring Boot ki duniya mein.

---

## Project aur Dependencies

### `package.json` kahan gaya bhai?

Woh nahi hoga. Spring Boot mein do options hain:

- **`pom.xml`** — Maven use karte ho toh. XML format, thoda verbose lagta hai pehle pehle.
- **`build.gradle.kts`** — Gradle use karte ho toh. Kotlin script format, concise.

Dono ka kaam same hai — project metadata, dependencies list karna, build lifecycle define karna. Jaise Zomato ke backend pe `package.json` define karta hai ki kaunsi libraries chahiye, waise hi `pom.xml` define karta hai.

See [[01-Maven-Basics]], [[02-Gradle-Basics]].

---

### `node_modules/` kahan hai?

**Hai hi nahi** — aur yahi Spring Boot ka ek bada fayda hai.

Java mein dependencies ek **global local cache** mein store hoti hain:
- Maven: `~/.m2/repository/`
- Gradle: `~/.gradle/caches/`

Matlab teri machine pe ek baar download hua — 10 projects mein reuse hoga. `node_modules` wali 500 MB per project ki problem khatam. Disk space bachega, clone karna fast hoga.

> [!tip] Practical fayda
> CI/CD pe bhi yahi hota hai — cache warm hone ke baad builds bahut fast ho jaate hain. GitHub Actions pe Maven/Gradle cache action available hai.

---

### `npm install` ka equivalent kya hai?

**Kuch nahi** — aur yeh intentional hai.

Maven aur Gradle dependencies automatically resolve aur download karte hain jab bhi tum build karte ho. Tu explicit `install` command nahi chalata.

```bash
# Maven
./mvnw verify          # compile + test + lint sab kuch

# Gradle
./gradlew build        # same
```

Pehli baar run karoge toh internet se download karega. Uske baad cache se.

---

### `npm scripts` ka equivalent kya hai?

Maven mein **goals** hote hain, Gradle mein **tasks**. Direct mapping:

| Node.js                | Maven                        | Gradle                  |
|------------------------|------------------------------|-------------------------|
| `npm start`            | `./mvnw spring-boot:run`     | `./gradlew bootRun`     |
| `npm test`             | `./mvnw test`                | `./gradlew test`        |
| `npm run build`        | `./mvnw package`             | `./gradlew bootJar`     |
| `npm run check`        | `./mvnw verify`              | `./gradlew check`       |

See [[01-Maven-Basics]].

---

### `package-lock.json` ka equivalent kya hai?

Maven mein **BOM (Bill of Materials)** + `pom.xml` mein fixed versions. Spring Boot ka apna BOM hota hai jo sab dependencies ke compatible versions define karta hai — tu manually version specify nahi karta most cases mein.

```xml
<!-- pom.xml mein version specify nahi karna -- BOM handle karti hai -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
    <!-- version nahi -- parent BOM se aata hai -->
</dependency>
```

Gradle mein explicit `gradle.lockfile` bhi hota hai. Practice mein: `pom.xml` ke fixed versions + Maven Wrapper = reproducible builds.

---

### `.nvmrc` ka equivalent kya hai?

Java version management ke liye:
- **`.sdkmanrc`** — SDKMAN! use karte ho toh
- **`.tool-versions`** — asdf use karte ho toh

```bash
# .sdkmanrc
java=21.0.2-tem
```

See [[05-Common-CLI-Tools]].

---

### App kaise run karte hain?

```bash
# Option 1: Direct run (dev ke liye)
./mvnw spring-boot:run

# Option 2: JAR build karke run karo (production style)
./mvnw package && java -jar target/*.jar
```

See [[01-Packaging-Fat-JAR]].

---

## Language aur Runtime

### REPL hai kya? (Node ka `node` command jaisa)

Haan — **`jshell`**, JDK 9+ se built-in hai.

```bash
jshell
|  Welcome to JShell -- Version 21
|  For an introduction type: /help intro

jshell> var x = 10 + 20
x ==> 30

jshell> System.out.println("Chai peete hain!")
Chai peete hain!
```

See [[05-Common-CLI-Tools]].

---

### TypeScript jaisi types hain kya?

TypeScript se zyada strong types hain — aur compile time pe enforce hoti hain.

**TypeScript** mein tu types add karta hai JavaScript ke upar. **Java** mein types language ka fundamental part hain — alag tool nahi, alag compiler pass nahi.

```java
// TypeScript mein
function getUser(id: number): User { ... }

// Java mein -- same concept, alag syntax
User getUser(Long id) { ... }
```

Java ka type system statically typed + compiled hai. `javac` compiler type errors pakad leta hai build time pe hi. Generics bhi hain — `List<User>`, `Map<String, Order>`, sab.

> [!warning] Gotcha
> Java mein **union types** nahi hain (TypeScript ka `string | null`). Uske liye `Optional<T>` use karo ya sealed interfaces. Yeh initially frustrating lagta hai TS devs ko.

See [[01-Generics]], [[02-Type-System-Differences]].

---

### `null` hai kya? TypeScript mein `undefined` tha...

Haan, `null` hai. Aur yeh Java ka ek purana dard hai.

Modern approach — **`Optional<T>`** use karo jab koi value "ho bhi sakti hai, nahi bhi":

```java
// Ganda tarika -- null return karna
public User findUser(Long id) {
    return null; // caller ko pata nahi chalega!
}

// Accha tarika -- Optional use karo
public Optional<User> findUser(Long id) {
    return userRepository.findById(id); // clearly "may be absent"
}

// Caller pe:
userService.findUser(id)
    .orElseThrow(() -> new UserNotFoundException(id));
```

JPA columns pe `@Column(nullable = false)` use karo DB level pe.

See [[04-Optional-and-Null-Safety]].

---

### `async`/`await` kahan hai? Sab blocking lagta hai...

Teen options hain, situation ke hisaab se:

**Option 1: Virtual Threads (JDK 21+) — RECOMMENDED for new apps**

Yeh Spring Boot 3.2+ ka best approach hai. Tu blocking code likhta hai — JVM ke andar virtual threads handle karte hain concurrency. Like Node ka event loop, but different underlying model.

```yaml
# application.yml mein ek line
spring:
  threads:
    virtual:
      enabled: true
```

Bas itna. Ab tera Tomcat virtual threads use karega. 10,000 concurrent requests? No problem. Traditional thread pool ka constraint khatam.

**Option 2: `CompletableFuture` — Promise-style composition**

```java
// Node.js ke Promise.then() jaisa
CompletableFuture<Order> future = orderService.processAsync(orderId)
    .thenApply(order -> enrichWithUserData(order))
    .thenCompose(order -> notifyDelivery(order));
```

**Option 3: Reactive (`Mono`/`Flux`) — Spring WebFlux**

```java
// Reactive style -- Mono = single value, Flux = stream of values
Mono<User> user = userRepository.findById(id);
Flux<Order> orders = orderRepository.findByUserId(id);
```

> [!tip] New apps ke liye
> JDK 21+ pe kaam kar raha hai? Virtual threads pehle try karo. Simple, effective, aur existing blocking code ke saath kaam karta hai. WebFlux sirf tab chahiye jab truly reactive pipeline ho.

See [[05-Virtual-Threads]], [[03-CompletableFuture]], [[03-MOC-Spring]].

---

### Hot reload hai? Har baar restart...

Haan hai — **Spring Boot DevTools**.

```xml
<!-- pom.xml mein add karo -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-devtools</artifactId>
    <scope>runtime</scope>
    <optional>true</optional>
</dependency>
```

Classpath mein koi bhi change hone pe application automatically restart ho jaata hai. IntelliJ Ultimate pe "HotSwap" bhi hai — method body changes ke liye full restart bhi nahi chahiye.

> [!warning] Gotcha
> DevTools **production mein disabled** ho jaata hai automatically jab fat JAR se run karo. Yeh intentional hai — `optional: true` isiliye hai.

See [[07-DevTools-and-Live-Reload]].

---

### `var` kya hai? JavaScript ka `let` jaisa hai?

Haan — **local type inference**. Lekin `let` se zyada limited hai.

```java
// Purana tarika — verbose
List<User> users = userRepository.findAll();

// var ke saath -- compiler type infer kar leta hai
var users = userRepository.findAll(); // still List<User>, just shorter
```

Sirf **method ke andar** use kar sakte ho (local variables). Class-level fields pe nahi. See [[05-var-and-Local-Type-Inference]].

---

### Har class apni file mein kyun? Ek file mein sab kyun nahi?

Java ka compiler rule hai: public top-level class ka naam aur file ka naam **same hona chahiye**. `User` class — `User.java` file.

Pehle rigid lagta hai. Baad mein fayda samajh aata hai — kisi bhi class ko dhundna trivial hai. `OrderService.java` — `OrderService` class. No mystery.

Multiple non-public classes ek file mein rakh sakte ho, but practice mein avoid karo — confusing hota hai.

---

## Spring aur Framework

### Spring Boot Express jaisa hai ya NestJS jaisa?

**NestJS ke bahut kareeb** — opinionated, dependency injection first, annotation-driven. Agar tu NestJS jaanta hai, Spring Boot mein settle hone mein zyada time nahi lagega.

Differences:
- Spring Boot bahut purana hai (2003 se) — ecosystem massive hai
- Java ka type system NestJS se strict hai
- Spring Boot mein "magic" zyada hai (auto-configuration) — kabhi helpful, kabhi confusing

Express se zyada structured hai, NestJS se zyada mature.

See [[02-Spring-Boot-Auto-Configuration]].

---

### "Bean" kya hota hai?

Bean = **Spring ke container mein managed object**.

Jaise NestJS ka Provider, ya Angular ka Service — Spring ka Bean wahi hai. Tu object create nahi karta (`new OrderService()`), Spring create karta hai aur inject karta hai jahan zarurat ho.

```java
@Service              // yeh class ek bean hai
public class OrderService {
    // Spring isko manage karega
}
```

Ek baar bean ban gayi, usse kahin bhi inject kar sakte ho. Zomato analogy — kitchen ek bean hai (managed, shared), har order ke liye nayi kitchen nahi banti.

See [[01-IoC-DI-Concepts]].

---

### `@Autowired` kya kar raha hai?

Bean inject kar raha hai. Lekin **modern Spring mein `@Autowired` mat use karo** — constructor injection use karo.

```java
// Purana style -- avoid karo
@Service
public class OrderService {
    @Autowired
    private OrderRepository repo; // field injection -- bad practice
}

// Modern style -- constructor injection
@Service
@RequiredArgsConstructor   // Lombok generates constructor automatically
public class OrderService {
    private final OrderRepository repo;  // final -- immutable, testable
}
```

Constructor injection kyun better?
- **Testable** — constructor se mock inject kar sakte ho directly
- **Immutable** — `final` field, reassignment impossible
- **Explicit** — dependencies clearly visible hain

See [[01-IoC-DI-Concepts]].

---

### Middleware kahan configure karte hain?

"Middleware" concept hai, but alag naam se:

| Express                     | Spring Boot equivalent                           |
|-----------------------------|--------------------------------------------------|
| `app.use(fn)`               | `Filter` (Servlet level)                         |
| Router-level middleware     | `HandlerInterceptor`                             |
| Error handler middleware    | `@RestControllerAdvice` + `@ExceptionHandler`   |
| `cors()` middleware         | `WebMvcConfigurer.addCorsMappings()`             |

```java
// Express ka app.use() equivalent -- Servlet Filter
@Component
public class RequestLoggingFilter implements Filter {
    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {
        // before request
        System.out.println("Request aa raha hai...");
        chain.doFilter(req, res); // next() jaisa
        // after request
        System.out.println("Response gaya.");
    }
}
```

See [[01-Spring-Security-Basics]], [[05-Exception-Handlers-and-ProblemDetail]].

---

### Environment variables kaise read karte hain?

`application.yml` mein placeholder + `@ConfigurationProperties`:

```yaml
# application.yml
db:
  url: ${DATABASE_URL}
  username: ${DB_USER:admin}      # default value bhi de sakte ho
  max-pool-size: ${POOL_SIZE:10}
```

```java
// Type-safe config class
@ConfigurationProperties(prefix = "db")
@Validated
public record DbConfig(
    URI url,
    String username,
    @Min(1) @Max(50) int maxPoolSize
) {}

// Use karo
@Service
@RequiredArgsConstructor
public class DatabaseService {
    private final DbConfig dbConfig;

    public void connect() {
        // dbConfig.url(), dbConfig.username() -- type-safe!
    }
}
```

> [!tip] Best practice
> `@ConfigurationProperties` use karo, `@Value("${db.url}")` nahi — zyada type-safe hai, validation milti hai, aur testing mein easy hai.

See [[04-Configuration-Properties]].

---

### `process.env.NODE_ENV` ka equivalent kya hai?

**Spring Profiles**. Environment variable: `SPRING_PROFILES_ACTIVE=prod`

```bash
# Dev pe
SPRING_PROFILES_ACTIVE=dev ./mvnw spring-boot:run

# Production pe
SPRING_PROFILES_ACTIVE=prod java -jar app.jar
```

```yaml
# application.yml -- sab environments mein common config
spring:
  application:
    name: orders-api

---
# application-dev.yml -- sirf dev mein
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/orders_dev

---
# application-prod.yml -- sirf production mein
spring:
  datasource:
    url: ${DATABASE_URL}  # env var se
```

See [[06-Profiles-Per-Environment]].

---

### `dotenv` library ka kya? `.env` file nahi chalta?

Spring Boot by default `.env` file load **nahi** karta.

Options:
- **Dev mein**: IntelliJ ki run configuration mein env vars directly set karo
- **Docker/Kubernetes mein**: env vars natively inject hoti hain — `.env` ka concept hi different hai
- **Agar chahiye**: `spring-dotenv` community library hai

```bash
# IntelliJ Ultimate mein -- Run Configuration edit karo
# Environment Variables section mein: DATABASE_URL=jdbc:...
```

Production pe `.env` file ki zarurat nahi hoti — Docker ya k8s khud env vars provide karta hai.

---

## HTTP

### `app.use(express.json())` kahan likhen?

**Kuch nahi likhna** — Spring Boot automatically JSON handle karta hai.

Jackson (JSON library) auto-configured hoti hai. Bas `@RequestBody` annotation lagao:

```java
// Express mein:
// app.use(express.json())
// router.post('/orders', (req, res) => { const dto = req.body; ... })

// Spring Boot mein:
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    @PostMapping
    public ResponseEntity<Order> createOrder(
            @RequestBody @Valid CreateOrderDto dto) {  // JSON auto-deserialize
        // dto already populated hai -- Jackson ne kiya
        Order order = orderService.create(dto);
        return ResponseEntity.status(201).body(order);
    }
}
```

See [[01-REST-Controllers]], [[04-Jackson-Deep-Dive]].

---

### `req.params.id` ka equivalent?

```java
// Express mein:
// app.get('/orders/:id', (req, res) => { const id = req.params.id; })

// Spring Boot mein:
@GetMapping("/orders/{id}")
public Order getOrder(@PathVariable Long id) {
    // id already Long mein convert ho gaya -- type-safe!
    return orderService.findById(id);
}

// Multiple path variables
@GetMapping("/users/{userId}/orders/{orderId}")
public Order getUserOrder(
        @PathVariable Long userId,
        @PathVariable Long orderId) {
    return orderService.findUserOrder(userId, orderId);
}

// Query params (req.query.status)
@GetMapping("/orders")
public List<Order> getOrders(
        @RequestParam(defaultValue = "PENDING") String status,
        @RequestParam(defaultValue = "0") int page) {
    return orderService.findByStatus(status, page);
}
```

See [[02-Request-Mapping-and-Path-Variables]].

---

### Dusri APIs kaise call karte hain? (`axios` / `fetch` ka equivalent)

**`RestClient`** (Spring 6.1+) — modern aur recommended:

```java
@Service
public class PaymentService {

    private final RestClient restClient;

    public PaymentService(RestClient.Builder builder) {
        this.restClient = builder
            .baseUrl("https://api.razorpay.com/v1")  // Razorpay integration
            .build();
    }

    public PaymentResponse initiatePayment(PaymentRequest request) {
        return restClient.post()
            .uri("/payments")
            .header("Authorization", "Basic " + encodedKey)
            .body(request)
            .retrieve()
            .body(PaymentResponse.class);  // auto-deserialize JSON
    }

    public PaymentStatus getStatus(String paymentId) {
        return restClient.get()
            .uri("/payments/{id}", paymentId)
            .retrieve()
            .body(PaymentStatus.class);
    }
}
```

> [!info] Older code mein `RestTemplate` dikhega
> `RestTemplate` deprecated ho raha hai — new code mein `RestClient` use karo. WebFlux pe kaam kar rahe ho toh `WebClient` use karo.

See [[10-WebClient-and-RestClient]].

---

### CORS middleware kahan hai?

```java
// Option 1: Specific controller pe
@CrossOrigin(origins = "https://yourfrontend.com")
@RestController
public class OrderController { ... }

// Option 2: Global configuration (recommended)
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOrigins("https://yourfrontend.com")
            .allowedMethods("GET", "POST", "PUT", "DELETE")
            .allowedHeaders("*")
            .allowCredentials(true)
            .maxAge(3600);
    }
}
```

See [[08-CORS-Configuration]].

---

### Error handling kaise karte hain?

Express mein `(err, req, res, next)` wala 4-argument middleware tha. Spring mein `@RestControllerAdvice` + `@ExceptionHandler`:

```java
// Custom exception
public class OrderNotFoundException extends RuntimeException {
    public OrderNotFoundException(Long id) {
        super("Order nahi mila: " + id);
    }
}

// Global error handler
@RestControllerAdvice
public class GlobalExceptionHandler {

    // Specific exception handle karo
    @ExceptionHandler(OrderNotFoundException.class)
    public ProblemDetail handleOrderNotFound(OrderNotFoundException ex) {
        // ProblemDetail = Spring 6 ka RFC 7807 compliant error format
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
            HttpStatus.NOT_FOUND, ex.getMessage()
        );
        problem.setTitle("Order Not Found");
        return problem;
    }

    // Validation errors
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidationErrors(MethodArgumentNotValidException ex) {
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        problem.setTitle("Validation Failed");
        // field errors include karo
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getFieldErrors()
            .forEach(e -> errors.put(e.getField(), e.getDefaultMessage()));
        problem.setProperty("errors", errors);
        return problem;
    }

    // Fallback -- unexpected errors
    @ExceptionHandler(Exception.class)
    public ProblemDetail handleAll(Exception ex) {
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.INTERNAL_SERVER_ERROR);
        problem.setTitle("Kuch toot gaya");
        return problem; // stack trace mat bhejna production mein!
    }
}
```

See [[05-Exception-Handlers-and-ProblemDetail]].

---

## Database

### Prisma / TypeORM ka equivalent kya hai?

**Spring Data JPA** (Hibernate as the ORM under the hood).

Concept same hai — entity define karo, repository interface likho, CRUD free mein milta hai:

```java
// Entity -- Prisma model schema jaisa
@Entity
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String customerId;

    @Enumerated(EnumType.STRING)
    private OrderStatus status;

    @CreatedDate
    private Instant createdAt;

    // getters/setters ya Lombok @Data/@Getter/@Setter
}

// Repository -- TypeORM Repository jaisa, but interface hai -- implementation nahi likhni
public interface OrderRepository extends JpaRepository<Order, Long> {

    // Method naam se query generate hoti hai -- magic!
    List<Order> findByCustomerId(String customerId);
    List<Order> findByStatus(OrderStatus status);
    Optional<Order> findByIdAndCustomerId(Long id, String customerId);

    // Custom JPQL query
    @Query("SELECT o FROM Order o WHERE o.createdAt > :since AND o.status = :status")
    List<Order> findRecentByStatus(@Param("since") Instant since,
                                   @Param("status") OrderStatus status);
}
```

Swiggy ya Zomato ke order service mein yahi pattern use hota hai — entity define karo, repository interface likho, aur CRUD methods automatically implement ho jaate hain.

See [[01-JPA-Hibernate-Basics]].

---

### Knex jaisa query builder hai?

**jOOQ** — type-safe SQL DSL. Raw SQL ki power + compile-time safety:

```java
// jOOQ ke saath type-safe SQL
Result<Record> orders = dsl
    .select(ORDER.ID, ORDER.CUSTOMER_ID, ORDER.TOTAL_AMOUNT)
    .from(ORDER)
    .where(ORDER.STATUS.eq(OrderStatus.PENDING)
        .and(ORDER.CREATED_AT.gt(LocalDateTime.now().minusDays(7))))
    .orderBy(ORDER.CREATED_AT.desc())
    .limit(50)
    .fetch();
```

Dynamic queries ke liye JPA Specifications bhi hai. See [[10-Specifications-and-Criteria-API]].

---

### Migrations? (Sequelize migrate, Prisma migrate jaisa)

**Flyway** ya **Liquibase**. Flyway zyada popular aur simple hai:

```
src/main/resources/db/migration/
├── V1__create_users_table.sql
├── V2__create_orders_table.sql
├── V3__add_status_to_orders.sql
└── V4__create_payments_table.sql
```

```sql
-- V2__create_orders_table.sql
CREATE TABLE orders (
    id          BIGSERIAL PRIMARY KEY,
    customer_id VARCHAR(100) NOT NULL,
    status      VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    total_amount DECIMAL(10,2) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
```

App startup pe Flyway automatically pending migrations run kar deta hai. Koi manual step nahi.

> [!warning] Gotcha
> Flyway migrations **irreversible** hote hain by default. Ek baar `V2__...sql` run ho gaya — woh dobara nahi chalega. Galat migration fix karne ke liye nayi migration file likhni padegi (`V3__fix_orders.sql`).

See [[08-Migrations-Flyway-Liquibase]].

---

### Connection pool? (`pg-pool` jaisa)

**HikariCP** — default in Spring Boot. Tu configure nahi karta explicitly:

```yaml
# application.yml -- sirf agar tune karna ho
spring:
  datasource:
    hikari:
      maximum-pool-size: 20      # default: 10
      minimum-idle: 5
      connection-timeout: 30000  # 30 seconds
      idle-timeout: 600000       # 10 minutes
```

HikariCP industry ka fastest connection pool hai. Node ka `pg-pool` bhi isse inspire hua hai.

---

## Testing

### JUnit 5 kya hai? Jest jaisa hai?

JUnit 5 (Jupiter) = Jest of Java. Naya code mein JUnit 4 use mat karo:

```java
// Basic test -- Jest ka describe/it block jaisa
@SpringBootTest
class OrderServiceTest {

    @Autowired
    private OrderService orderService;

    @MockBean    // Mockito mock -- Jest ka jest.mock() jaisa
    private OrderRepository orderRepository;

    @Test
    @DisplayName("Order create hona chahiye valid request pe")
    void shouldCreateOrderSuccessfully() {
        // Arrange -- given
        var request = new CreateOrderRequest("user-123", List.of(item1));
        when(orderRepository.save(any())).thenReturn(savedOrder);

        // Act -- when
        var result = orderService.create(request);

        // Assert -- then
        assertThat(result.getStatus()).isEqualTo(OrderStatus.PENDING);
        assertThat(result.getCustomerId()).isEqualTo("user-123");
        verify(orderRepository, times(1)).save(any());
    }

    @Test
    void shouldThrowWhenItemListEmpty() {
        var request = new CreateOrderRequest("user-123", List.of());

        assertThatThrownBy(() -> orderService.create(request))
            .isInstanceOf(InvalidOrderException.class)
            .hasMessageContaining("items");
    }
}
```

See [[02-JUnit-5-Basics]].

---

### `supertest` ka equivalent kya hai?

**MockMvc** (in-process, fast) ya **WebTestClient**:

```java
// MockMvc -- in-process HTTP testing, supertest jaisa
@WebMvcTest(OrderController.class)   // sirf controller layer load hoti
class OrderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OrderService orderService;

    @Test
    void shouldReturn201WhenOrderCreated() throws Exception {
        var response = new OrderResponse(1L, "PENDING");
        when(orderService.create(any())).thenReturn(response);

        mockMvc.perform(post("/api/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "customerId": "user-123",
                        "items": [{"productId": "p1", "quantity": 2}]
                    }
                """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value("PENDING"))
            .andExpect(jsonPath("$.id").value(1));
    }
}
```

See [[06-Integration-Tests]].

---

### Real DB ke saath test kaise karein?

**Testcontainers** — Docker mein real Postgres/MySQL/Redis spin up karta hai sirf test ke liye:

```java
@SpringBootTest
@Testcontainers
class OrderRepositoryTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16")
        .withDatabaseName("test_orders")
        .withUsername("test")
        .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        // Test DB ka URL Spring ko bata do
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private OrderRepository orderRepository;

    @Test
    void shouldSaveAndFindOrder() {
        // Real Postgres pe run ho raha hai
        var order = new Order("customer-1", OrderStatus.PENDING);
        var saved = orderRepository.save(order);

        var found = orderRepository.findById(saved.getId());
        assertThat(found).isPresent();
        assertThat(found.get().getCustomerId()).isEqualTo("customer-1");
    }
}
```

> [!info] Docker chahiye
> Testcontainers ko Docker Desktop ya Docker Engine chahiye locally. CI/CD pe generally available hota hai.

See [[05-Testcontainers]].

---

## Build aur Deploy

### Production artifact kya hota hai?

**Fat JAR** — ek single file jisme tera app + Tomcat + sab dependencies hain.

```bash
./mvnw package

# Yeh file ban jaati hai:
target/orders-api-1.0.0.jar    # ~50-80 MB typically

# Run karo directly
java -jar target/orders-api-1.0.0.jar

# Port, profile sab command line se override kar sakte ho
java -jar target/orders-api-1.0.0.jar \
    --server.port=8080 \
    --spring.profiles.active=prod
```

Node.js mein `node server.js` chalaate the — yahan `java -jar app.jar`. Concept same hai.

See [[01-Packaging-Fat-JAR]].

---

### Nginx jaisa kuch chahiye?

Production HTTPS termination ke liye haan — nginx ya k8s Ingress. Lekin **Tomcat alag se install nahi karna** — Spring Boot ke JAR mein embedded hai.

Node.js mein bhi `node` directly run karta tha, nginx sirf reverse proxy tha. Same pattern yahan bhi.

See [[02-Docker-for-Spring-Boot]].

---

### Docker image kaise banayein?

Teen options:

```bash
# Option 1: Buildpacks -- Dockerfile nahi chahiye (recommended for starters)
./mvnw spring-boot:build-image -Dspring-boot.build-image.imageName=orders-api:latest

# Option 2: Jib -- Google ka tool, fast builds
./mvnw com.google.cloud.tools:jib-maven-plugin:build \
    -Dimage=gcr.io/myproject/orders-api

# Option 3: Custom Dockerfile -- layered build for better caching
```

```dockerfile
# Layered Dockerfile (Option 3)
FROM eclipse-temurin:21-jre-alpine AS runtime

WORKDIR /app

# Layers alag alag -- Docker cache efficient hoga
COPY --from=build /app/target/extracted/dependencies/ ./
COPY --from=build /app/target/extracted/spring-boot-loader/ ./
COPY --from=build /app/target/extracted/snapshot-dependencies/ ./
COPY --from=build /app/target/extracted/application/ ./

EXPOSE 8080
ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
```

See [[02-Docker-for-Spring-Boot]].

---

### Cold start slow hai! Lambda pe nahi chalta...

JVM cold start typically **2-5 seconds**. Serverless ya edge ke liye yeh problem hai.

Solution: **GraalVM Native Image**

```bash
./mvnw -Pnative native:compile

# Native binary ban jaati hai -- JVM nahi chahiye
./target/orders-api  # starts in ~50ms!
```

> [!warning] Gotcha — Native Image ki limitations
> GraalVM Native Image ke saath reflection, dynamic proxy, aur runtime classpath scanning kaam nahi karta as-is. Spring Boot 3 ka AOT (Ahead-of-Time) processing automatically hints generate karta hai, but kuch manual configuration lag sakti hai. Production-grade native image ke liye testing thoroughly karo.

See [[03-GraalVM-Native-Image]].

---

## Stack-Specific: Eureka, Gateway, Feign

### Eureka kya hai aur kyun hai?

Eureka = **Service Registry** — ek phone book jahan har microservice apna address register karti hai.

Imagine kar: Zomato ka order-service, delivery-service, payment-service, restaurant-service — sab alag-alag servers pe chal rahe hain. IP addresses change hote rehte hain (containers restart, scale up/down). Toh order-service kaise jaane ki delivery-service kahan hai?

Eureka se:
1. Delivery-service start hoti hai → Eureka ko bolta hai "Main hoon, `delivery-api`, yahan pe hoon"
2. Order-service delivery-service se baat karna chahti hai → Eureka se poochti hai → address milta hai

```yaml
# Eureka client configuration
eureka:
  client:
    service-url:
      defaultZone: http://eureka-server:8761/eureka
  instance:
    prefer-ip-address: true
```

See [[03-Service-Discovery-Eureka]].

> [!tip] Eureka vs Kubernetes DNS
> Kubernetes apna service discovery DNS se karta hai — alag Eureka ki zarurat nahi hoti. Lekin agar codebase already Eureka ke saath likha gaya hai, toh dono saath chal sakte hain. [[09-Stack-Specific-Eureka-Gateway-Feign-on-K8s]] mein tradeoffs discuss hain.

---

### Spring Cloud Gateway kya hai?

Single entry point for all your microservices. IRCTC analogy — ek website pe jaate ho, backend pe alag-alag services hain (booking service, payment service, PNR service). Gateway sab route karta hai:

```yaml
# Gateway configuration
spring:
  cloud:
    gateway:
      routes:
        - id: orders-route
          uri: lb://orders-api          # lb:// = Eureka se load balance
          predicates:
            - Path=/api/orders/**
          filters:
            - StripPrefix=1             # /api/orders/1 -> /orders/1 forward

        - id: users-route
          uri: lb://users-api
          predicates:
            - Path=/api/users/**

        - id: payments-route
          uri: lb://payments-api
          predicates:
            - Path=/api/payments/**
          filters:
            - name: CircuitBreaker
              args:
                name: paymentsCircuitBreaker
                fallbackUri: forward:/fallback/payment
```

Auth, rate limiting, header rewriting — sab Gateway pe kar sakte ho.

> [!warning] Important
> Spring Cloud Gateway **WebFlux** pe build hai (reactive). Iske project mein `spring-boot-starter-web` mat add karna — conflict hoga. Sirf `spring-cloud-starter-gateway` chahiye.

See [[04-API-Gateway-Spring-Cloud-Gateway]].

---

### Feign kya hai? `axios` instance jaisa?

Declarative HTTP client. `axios` instance create karte the aur methods likhte the — Feign mein sirf **interface** define karo, implementation Spring generate karta hai:

```java
// Purana tarika -- RestClient se manually call karna
@Service
public class OrderService {
    private final RestClient restClient;

    public UserDto getUser(Long userId) {
        return restClient.get()
            .uri("http://users-api/api/users/{id}", userId)
            .retrieve()
            .body(UserDto.class);
    }
}

// Feign way -- zyada clean
@FeignClient(name = "users-api")  // Eureka se resolve hoga
public interface UsersClient {

    @GetMapping("/api/users/{id}")
    UserDto getById(@PathVariable Long id);

    @PostMapping("/api/users")
    UserDto create(@RequestBody CreateUserRequest request);

    @GetMapping("/api/users")
    Page<UserDto> findAll(@RequestParam int page, @RequestParam int size);
}

// Use karo -- bilkul local method call jaisa
@Service
@RequiredArgsConstructor
public class OrderService {
    private final UsersClient usersClient;  // inject karo, call karo

    public Order enrichWithUserData(Order order) {
        UserDto user = usersClient.getById(order.getCustomerId()); // HTTP call internally
        order.setCustomerName(user.getName());
        return order;
    }
}
```

Feign automatically:
- Eureka se `users-api` ka address resolve karta hai
- Load balance karta hai multiple instances mein
- Retry logic add kar sakte ho
- Circuit breaker integrate kar sakte ho

See [[07-OpenFeign]].

---

### JWT Gateway pe validate karein ya har service pe?

**Dono jagah** — defense in depth approach:

```java
// Gateway pe -- coarse-grained check
// application.yml in gateway
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          jwk-set-uri: http://auth-server/oauth2/jwks

// Har service pe -- fine-grained validation
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/orders/**").hasRole("USER")
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(Customizer.withDefaults())
            );
        return http.build();
    }
}
```

See [[09-Stack-Specific-Eureka-Gateway-Feign-on-K8s]] section 5.

---

### Feign calls mein JWT kaise forward karein?

`RequestInterceptor` bean likho — yeh automatically har Feign request mein JWT add kar dega:

```java
@Bean
public RequestInterceptor jwtForwardingInterceptor() {
    return template -> {
        // Current request ka JWT lo
        ServletRequestAttributes attrs =
            (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();

        if (attrs != null) {
            String authHeader = attrs.getRequest().getHeader("Authorization");
            if (authHeader != null) {
                // Feign ki outgoing request mein add karo
                template.header("Authorization", authHeader);
            }
        }
    };
}
```

See [[09-Stack-Specific-Eureka-Gateway-Feign-on-K8s]] section 4.

---

### Spring Cloud kya hai overall?

Spring Cloud ek **umbrella project** hai — distributed systems ke liye Spring Boot ke upar libraries ka collection:

| Library                    | Kya karta hai                                      |
|----------------------------|----------------------------------------------------|
| Spring Cloud Netflix Eureka | Service discovery                                  |
| Spring Cloud Gateway        | API Gateway                                        |
| Spring Cloud OpenFeign      | Declarative HTTP client                            |
| Spring Cloud Config         | Centralized configuration server                   |
| Spring Cloud LoadBalancer   | Client-side load balancing                         |
| Resilience4j integration    | Circuit breaker, retry, rate limiter               |

Har ek alag dependency hai — sab at once nahi lena. See [[02-Spring-Cloud-Overview]].

---

## Kubernetes (Docker jaanta hai, k8s naya hai)

### Kahan se shuru karein?

[[08-Kubernetes-From-Scratch]] — Docker wale ke liye specifically likha gaya hai. Har Docker concept ka k8s equivalent mapped hai.

---

### Pod vs Deployment vs Service?

Docker-to-Kubernetes mental model:

| Docker concept          | Kubernetes equivalent           | Kya karta hai                                         |
|-------------------------|---------------------------------|-------------------------------------------------------|
| `docker run ...`        | **Pod**                         | Ek running container (rarely directly create karte)   |
| `docker-compose` service | **Deployment**                 | "N replicas chahiye, always" — auto-restart, rolling updates |
| Port mapping            | **Service**                     | Stable DNS name + load balancing across pods           |
| `.env` file             | **ConfigMap** / **Secret**      | Non-sensitive / sensitive config                      |
| `docker-compose.yml`    | Deployment + Service + ConfigMap | Full service definition                              |
| Exposed ports           | **Ingress**                     | External traffic routing                             |

```yaml
# Deployment -- "main orders-api ke 3 replicas chahiye"
apiVersion: apps/v1
kind: Deployment
metadata:
  name: orders-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: orders-api
  template:
    metadata:
      labels:
        app: orders-api
    spec:
      containers:
        - name: orders-api
          image: myregistry/orders-api:1.0.0
          ports:
            - containerPort: 8080
          env:
            - name: SPRING_PROFILES_ACTIVE
              value: "prod"
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-secrets
                  key: url

---
# Service -- stable DNS name
apiVersion: v1
kind: Service
metadata:
  name: orders-api
spec:
  selector:
    app: orders-api
  ports:
    - port: 80
      targetPort: 8080
```

See [[08-Kubernetes-From-Scratch]].

---

### k8s locally kaise run karein?

```bash
# Option 1: kind -- lightest, CI-friendly
brew install kind
kind create cluster --name my-cluster

# Option 2: minikube -- more features, GUI dashboard
brew install minikube
minikube start

# Option 3: Docker Desktop built-in k8s
# Settings > Kubernetes > Enable Kubernetes
```

---

### Pod `CrashLoopBackOff` mein hai — kya karein?

Step by step debug:

```bash
# Step 1: Events padho -- 9/10 times answer yahan hota hai
kubectl describe pod <pod-name>
# Events section dekho -- "OOMKilled", "ImagePullBackOff", etc.

# Step 2: Logs dekho
kubectl logs <pod-name>
kubectl logs <pod-name> --previous  # crashed pod ke logs

# Step 3: Container mein ghuso (agar start ho raha hai)
kubectl exec -it <pod-name> -- /bin/sh

# Common causes:
# 1. Missing environment variable (SPRING_DATASOURCE_URL nahi mili)
# 2. DB unreachable (service name wrong)
# 3. Memory limit too low (OOMKilled)
# 4. Wrong image tag
```

See [[08-Kubernetes-From-Scratch]].

---

### Spring Boot pod startup pe restart kyun hota hai?

**Liveness probe bahut jaldi fire ho rahi hai** — Spring Boot abhi boot hi kar raha tha.

Fix: `startupProbe` add karo:

```yaml
containers:
  - name: orders-api
    image: myregistry/orders-api:latest
    readinessProbe:
      httpGet:
        path: /actuator/health/readiness
        port: 8080
      initialDelaySeconds: 10
      periodSeconds: 5
    livenessProbe:
      httpGet:
        path: /actuator/health/liveness
        port: 8080
      periodSeconds: 10
    startupProbe:            # yeh pehle run hota hai
      httpGet:
        path: /actuator/health
        port: 8080
      failureThreshold: 30   # 30 * 10s = 5 minutes max startup time
      periodSeconds: 10
```

Spring Boot Actuator automatically `/actuator/health/readiness` aur `/actuator/health/liveness` expose karta hai:

```yaml
# application.yml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics
  endpoint:
    health:
      probes:
        enabled: true
      show-details: always
```

See [[05-Health-Checks-and-Readiness]].

---

### Config aur secrets kaise pass karein?

```bash
# ConfigMap -- non-sensitive config
kubectl create configmap app-config \
    --from-literal=SPRING_PROFILES_ACTIVE=prod \
    --from-literal=SERVER_PORT=8080

# Secret -- sensitive values (base64 encoded)
kubectl create secret generic db-secrets \
    --from-literal=DATABASE_URL=jdbc:postgresql://... \
    --from-literal=DATABASE_PASSWORD=supersecret
```

Spring Boot automatically env vars ko properties mein map karta hai:
- `SPRING_DATASOURCE_URL` → `spring.datasource.url`
- `SPRING_DATASOURCE_PASSWORD` → `spring.datasource.password`

Naming convention: uppercase + underscores.

See [[04-Kubernetes-Basics]].

---

### `kubectl` kya hai?

Docker ke liye `docker` jaisa, k8s ke liye `kubectl`.

Daily use ke commands:

```bash
# Status
kubectl get pods                           # sab pods list
kubectl get pods -w                        # watch -- live updates
kubectl get deployments
kubectl get services
kubectl describe pod <name>                # details + events

# Logs
kubectl logs <pod-name>
kubectl logs <pod-name> -f                 # follow (tail -f jaisa)
kubectl logs <pod-name> --previous         # crashed pod ke logs

# Debugging
kubectl exec -it <pod-name> -- /bin/bash   # container mein ghuso
kubectl port-forward pod/<name> 8080:8080  # local access for debugging

# Apply changes
kubectl apply -f deployment.yaml
kubectl rollout restart deployment/orders-api  # restart all pods

# Scale
kubectl scale deployment/orders-api --replicas=5

# Delete
kubectl delete pod <pod-name>              # pod delete -- deployment dobara create karega
```

---

## Tooling aur DX

### Best IDE kaunsa hai?

**IntelliJ IDEA** — Spring Boot ke liye Ultimate edition best hai. Spring support, JPA query validation, Kubernetes manifests, Docker, database tools — sab built-in.

VS Code Java pack se casual editing hoti hai, but serious Spring Boot development ke liye IntelliJ hi standard hai.

> [!info] Cost
> IntelliJ Ultimate paid hai. Students ke liye free. Companies generally license provide karti hain. Community edition free hai but Spring Boot support limited hai.

See [[06-IDE-Setup]].

---

### Lombok kya hai? IDE kyun complain karta hai?

Lombok = compile-time code generator. Getters, setters, constructors, builders — sab automatically generate karta hai annotation se:

```java
// Lombok ke bina -- bahut boilerplate
public class Order {
    private Long id;
    private String customerId;
    private OrderStatus status;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getCustomerId() { return customerId; }
    // ... aur 10 aur methods

    // Constructor, equals, hashCode, toString...
}

// Lombok ke saath -- clean!
@Data               // getters + setters + equals + hashCode + toString
@Builder            // builder pattern
@NoArgsConstructor  // no-arg constructor
@AllArgsConstructor // all-args constructor
public class Order {
    private Long id;
    private String customerId;
    private OrderStatus status;
}

// Use:
Order order = Order.builder()
    .customerId("user-123")
    .status(OrderStatus.PENDING)
    .build();
```

IDE mein red squiggles isliye aate hain kyunki IDE dekh raha hai ki `getId()` method nahi hai class mein — but Lombok build time pe generate karta hai. **Fix**: Lombok IDE plugin install karo.

IntelliJ: `File > Settings > Plugins > search "Lombok" > Install`

See [[02-Lombok]].

---

### Linter / Prettier jaisa kya hai?

| Node.js tool    | Java equivalent              | Kya karta hai              |
|-----------------|------------------------------|----------------------------|
| Prettier        | **Spotless**                 | Code formatter             |
| ESLint          | **Checkstyle**               | Style enforcement          |
| SonarQube       | **SonarLint** (IDE plugin)   | Bug patterns + code smells |
| -               | **SpotBugs / PMD**           | Static analysis            |
| -               | **Error Prone**              | Compile-time bug detection |

```xml
<!-- pom.xml mein Spotless add karo -->
<plugin>
    <groupId>com.diffplug.spotless</groupId>
    <artifactId>spotless-maven-plugin</artifactId>
    <configuration>
        <java>
            <googleJavaFormat/>  <!-- Google Java Format use karo -->
        </java>
    </configuration>
</plugin>
```

---

### `npx` ka equivalent kya hai?

```bash
# One-off main class run karna
./mvnw exec:java -Dexec.mainClass=com.example.DataMigration

# Single Java file run karna (JDK 11+)
java HelloWorld.java      # no compile step!

# jbang -- community tool, npm run jaisa for single scripts
jbang MyScript.java
```

---

## Mental Model

### Itni saari annotations kyun hain?

Java mein annotations primary metaprogramming mechanism hain — TypeScript decorators jaisa, but more powerful aur ubiquitous.

Spring annotations two ways se work karti hain:
1. **Runtime reflection** — Spring `@Service`, `@Autowired`, etc. runtime pe process karta hai
2. **Compile-time annotation processors** — Lombok, MapStruct compile time pe code generate karte hain

Ek baar mental model clear ho jaye toh annotations surprisingly readable lagte hain:

```java
@RestController                    // yeh REST controller hai
@RequestMapping("/api/orders")     // base path
@RequiredArgsConstructor           // Lombok: constructor generate karo
@Slf4j                             // Lombok: logger inject karo (log.info(...))
public class OrderController {

    private final OrderService orderService;

    @PostMapping                   // POST /api/orders
    @ResponseStatus(CREATED)       // 201 return karo
    public OrderResponse create(
            @RequestBody @Valid CreateOrderRequest request) {  // JSON parse + validate
        log.info("Order create request: {}", request.getCustomerId());
        return orderService.create(request);
    }
}
```

Har annotation ek specific kaam karta hai — magic nahi, configuration hai.

---

### App start hone mein time kyun lagta hai?

Spring Boot startup pe:
1. Classpath scan karta hai — sab classes dhundta hai
2. Beans wire karta hai — dependency graph build karta hai
3. Auto-configuration run karta hai — features configure karta hai
4. DB connection pool initialize karta hai
5. Migrations run karta hai (Flyway)

JVM cold start: **2-5 seconds** typical. Production pe acceptable hai (containers restart rare hote hain). Dev pe: app running rakhna + DevTools hot reload use karna.

Spring Boot 3 + AOT processing startup time reduce karta hai. GraalVM Native Image mein ~100ms.

---

### JVM "heavy" kyun lagta hai?

Legacy perception hai. Modern reality:

- JDK 21 + G1GC/ZGC: very efficient garbage collection, predictable pause times
- Container-aware heap sizing: JVM automatically detect karta hai container memory limits
- Virtual threads: thousands of concurrent connections, minimal thread overhead

Typical Spring Boot service: **300-500 MB RAM**, **~2s startup**, **excellent throughput**. Ek Zomato order service ya UPI payment service ke liye yeh perfectly fine numbers hain.

See [[03-JVM-Memory-and-GC]].

---

### TypeScript miss karunga?

Honestly? Kuch cheezein haan:
- **Union types** (`string | null | 'pending' | 'done'`) — Java mein nahi hai directly
- **Structural typing** — Java nominal typing use karta hai
- **Type narrowing** — TypeScript iska expert hai

Lekin Java mein milega:
- **Faster runtime** — JVM TypeScript/Node se faster hai raw throughput mein
- **Better refactoring tools** — IntelliJ ka refactoring TypeScript IDE se miles ahead hai
- **Mature ecosystem** — 20+ saal ki libraries aur patterns
- **Records** — `record Order(Long id, String customerId)` = TypeScript interface + class combined
- **Sealed interfaces** — discriminated unions ke liye

```java
// Java records -- TypeScript type jaisa, but value object bhi hai
public record OrderSummary(Long id, String status, BigDecimal total) {}

// Sealed interfaces -- TypeScript union types jaisa
public sealed interface PaymentResult
    permits PaymentSuccess, PaymentFailed, PaymentPending {}

public record PaymentSuccess(String transactionId, Instant completedAt)
    implements PaymentResult {}
public record PaymentFailed(String reason, String errorCode)
    implements PaymentResult {}

// Pattern matching -- TypeScript type narrowing jaisa
switch (result) {
    case PaymentSuccess s -> processSuccess(s.transactionId());
    case PaymentFailed f -> handleFailure(f.reason());
    case PaymentPending p -> scheduleRetry();
}
```

See [[02-Type-System-Differences]].

---

## Key Takeaways

- **`package.json` → `pom.xml`**, `node_modules` → `~/.m2/repository`, `npm start` → `./mvnw spring-boot:run` — mapping straightforward hai
- **Spring Boot NestJS ke kareeb hai** Express se — DI, annotations, opinionated structure sab familiar lagega agar NestJS jaanta hai
- **`@Autowired` use mat karo** — constructor injection better hai, testable hai, Lombok `@RequiredArgsConstructor` se easy hai
- **Java types language mein hain**, TypeScript jaisa separate layer nahi — compiler type safety enforce karta hai
- **`Optional<T>` use karo** null ke bajaaye jab value "absent" ho sakti ho
- **Virtual threads (JDK 21+)** async/await ka replacement hai — blocking code likho, JVM handle karta hai concurrency
- **Fat JAR** production artifact hai — Tomcat embedded, koi separate app server nahi
- **Eureka = service registry** (phone book), **Gateway = entry point**, **Feign = declarative HTTP client** — teen pieces saath kaam karte hain microservices mein
- **Kubernetes**: Pod = container, Deployment = "N replicas always", Service = stable DNS
- **`startupProbe`** zarur add karo k8s pe — liveness probe Spring Boot ke boot hone se pehle fire kar deta hai otherwise
- **Testcontainers** real DB tests ke liye — Docker mein spin up karta hai, test ke baad destroy karta hai
- **IntelliJ IDEA** + **Lombok plugin** install karo — development experience drastically better hoti hai

---

## Related
- [[00-README]]
- [[01-Learning-Path]]
- [[05-Glossary]]
- [[01-Java-vs-TypeScript-Quick-Map]]
- [[01-Library-Cheatsheet]]
- [[06-IDE-Setup]]
- [[08-Kubernetes-From-Scratch]]
- [[09-Stack-Specific-Eureka-Gateway-Feign-on-K8s]]
