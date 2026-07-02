# Spring Boot Glossary — A se Z tak

Yaar, jab bhi koi naya ecosystem seekhte ho toh sabse badi problem kya hoti hai? Terms. Har jagah acronyms, har jagah jargon — IoC, AOP, BOM, JIT, AOT. Aur tum Node.js/Express se aa rahe ho toh ye sab aur bhi alien lagta hai.

Ye glossary teri "terminology cheatsheet" hai. Jab bhi koi term samajh na aaye — project mein dekho, koi blog post padho, ya interview prep karo — ek jagah aa jao. Har entry mein:
- **Kya hai** — plain language mein
- **Kyun matter karta hai** — real context mein
- **Node.js analogy** — jahan relevant ho
- **Gotcha** — common mistake jo beginners karte hain

Bookmark karo. Baat-baat pe kaam aayega.

---

## A

### AOP — Aspect-Oriented Programming

**Kya hai?** Socho tumhara Zomato backend hai. Har API call pe tum chahte ho: logging, transaction management, aur security check. Agar ye sab manually har method mein likho toh code ek disaster ban jaata hai. AOP iska solution hai — tumhare actual business logic ke "around" ya "before/after" kuch code inject kar do, bina us code ko directly wahan likhhe.

Spring mein AOP ka matlab hai "cross-cutting concerns" ko ek jagah define karo, aur Spring automatically har relevant method ke around use weave karega.

```java
@Aspect
@Component
public class LoggingAspect {

    // Har method jo @RestController class mein ho, uske before-after log karo
    @Around("within(@org.springframework.web.bind.annotation.RestController *)")
    public Object logExecutionTime(ProceedingJoinPoint joinPoint) throws Throwable {
        long start = System.currentTimeMillis();
        Object result = joinPoint.proceed(); // actual method call
        long time = System.currentTimeMillis() - start;
        System.out.println(joinPoint.getSignature() + " took " + time + "ms");
        return result;
    }
}
```

> [!tip] Node.js analogy
> Express middleware jaisa samjho. `app.use((req, res, next) => { ... next() })` — same concept, bas Spring mein ye method level pe bhi ho sakta hai, sirf HTTP requests pe nahi.

> [!warning] Gotcha
> AOP sirf Spring-managed beans pe kaam karta hai. Agar tum `new MyService()` se object banate ho khud, toh Spring ka proxy nahi hoga aur AOP fire nahi karega.

Dekho: [[07-AOP-and-Proxies]]

---

### AOT — Ahead-Of-Time Compilation

**Kya hai?** Normal Java mein code runtime pe compile hota hai (JIT). AOT mein code deploy se pehle compile ho jaata hai — ek native binary ban jaati hai jo seedha OS pe chalti hai, JVM ki zaroorat hi nahi.

GraalVM `native-image` tool ye karta hai. Result: startup time milliseconds mein (JVM apps ke seconds ki jagah), aur bahut kam memory use.

Tradeoff hai — dynamic features jaise reflection limited ho jaata hai, aur build time zyada lagta hai.

Dekho: [[03-GraalVM-Native-Image]]

---

### Actuator

**Kya hai?** Production mein deployed app ke baare mein jaankari chahiye? Kya sab theek chal raha hai? Kitna memory use ho raha hai? Kaun sa database connected hai? Actuator ye sab expose karta hai ready-made HTTP endpoints pe.

```bash
# Common actuator endpoints
GET /actuator/health    # app healthy hai?
GET /actuator/metrics   # JVM metrics, custom counters
GET /actuator/info      # app version, git commit
GET /actuator/env       # saari properties (sensitive values hidden)
GET /actuator/beans     # kaunse beans load hue Spring container mein
```

```yaml
# application.yml mein enable karo
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics  # production mein sab mat expose karna!
  endpoint:
    health:
      show-details: when-authorized
```

> [!warning] Gotcha
> `include: "*"` mat karna production mein. `/actuator/env` pe saari environment variables visible ho jaati hain — database passwords, API keys sab. Sirf zarurat ke endpoints expose karo.

Dekho: [[01-Spring-Boot-Actuator]]

---

### ApplicationContext

**Kya hai?** Spring ka heart. Ye ek container hai jo tumhare saare beans ko hold karta hai, unke lifecycle manage karta hai, dependencies inject karta hai, aur events fire karta hai.

Node.js mein koi central "container" nahi hota — tum manually `import` karte ho aur objects create karte ho. Spring mein ApplicationContext ye sab apne aap manage karta hai.

```java
// ApplicationContext se directly bean lo (rarely needed — usually autowiring use karo)
@Autowired
ApplicationContext context;

MyService service = context.getBean(MyService.class);
```

Dekho: [[08-ApplicationContext-and-Events]]

---

### AssertJ

**Kya hai?** Test likhne ka fluent (readable) tarika. JUnit ke basic `assertEquals` se zyada expressive.

```java
// Old way — less readable
assertEquals("Siddesh", user.getName());

// AssertJ way — reads like English
assertThat(user.getName()).isEqualTo("Siddesh");
assertThat(orders).hasSize(3).doesNotContainNull();
assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
```

Dekho: [[03-Mockito-and-AssertJ]]

---

### Auto-configuration

**Kya hai?** Spring Boot ka "magic". Tum `spring-boot-starter-data-jpa` dependency daalo, aur Spring Boot apne aap DataSource, EntityManagerFactory, TransactionManager sab configure kar deta hai. Tum sirf `application.yml` mein DB URL daalo.

Internally, `@ConditionalOnClass`, `@ConditionalOnMissingBean` annotations check karte hain — "agar PostgreSQL driver classpath mein hai, toh DataSource auto-configure karo; lekin agar user ne khud bean define kiya hai, toh unhe override mat karo."

> [!info] Node.js comparison
> Express mein har cheez manually setup karni padti hai. Spring Boot mein convention-over-configuration hai — sensible defaults already set hain, tum sirf override karo jahan zarurat ho.

Dekho: [[02-Spring-Boot-Auto-Configuration]]

---

## B

### Bean

**Kya hai?** Koi bhi Java object jo Spring container manage karta ho — woh ek "bean" hai. Spring usse banata hai, dependencies inject karta hai, aur zarurat padne par destroy karta hai.

```java
@Service  // ye annotation Spring ko batata hai: "is class ka bean banao"
public class OrderService {
    // Spring iska lifecycle manage karega
}

@Configuration
public class AppConfig {
    @Bean  // explicitly ek bean define karna
    public HttpClient httpClient() {
        return HttpClient.newBuilder().build();
    }
}
```

> [!info] Simple rule
> `@Component`, `@Service`, `@Repository`, `@Controller`, `@RestController`, ya `@Bean` annotation laga hua object = Bean. Baaki sab = plain Java object (POJO).

Dekho: [[01-IoC-DI-Concepts]]

---

### Bean Validation

**Kya hai?** Request body ya method parameters ko validate karne ka standard tarika. Annotations use karo, Spring automatically validate karega.

```java
public class CreateOrderRequest {
    @NotBlank(message = "Item name required hai")
    private String itemName;

    @Min(value = 1, message = "Quantity kam se kam 1 honi chahiye")
    private int quantity;

    @Email(message = "Valid email daalo")
    private String customerEmail;

    @NotNull
    @Size(min = 6, max = 6, message = "Pincode 6 digits ka hona chahiye")
    private String pincode;
}

@RestController
public class OrderController {
    @PostMapping("/orders")
    public ResponseEntity<?> createOrder(@Valid @RequestBody CreateOrderRequest req) {
        // Agar validation fail ho toh method yahan tak pahunche hi nahi
        // Spring automatically 400 Bad Request return karega
    }
}
```

Hibernate Validator is annotation ka actual implementation provide karta hai.

Dekho: [[04-Bean-Validation]]

---

### BOM — Bill of Materials

**Kya hai?** Ek special Maven POM file jo related dependencies ke versions ek jagah pin karta hai. Spring Boot ke starter parent ek BOM hai — isiliye tum `spring-boot-starter-web` add karte ho bina version likhhe.

```xml
<!-- Bina BOM ke — versions manually manage karo -->
<dependency>
    <groupId>com.fasterxml.jackson.core</groupId>
    <artifactId>jackson-databind</artifactId>
    <version>2.15.2</version>  <!-- manually update karna padega -->
</dependency>

<!-- Spring Boot BOM use karne ke baad — version nahi likhna -->
<dependency>
    <groupId>com.fasterxml.jackson.core</groupId>
    <artifactId>jackson-databind</artifactId>
    <!-- Spring Boot compatible version automatically aa jaayegi -->
</dependency>
```

> [!tip] Fayda
> Version conflicts ka sabse bada source hote hain manually managed versions. BOM se sab compatible versions ek saath upgrade hote hain.

Dekho: [[01-Maven-Basics]]

---

### Bytecode

**Kya hai?** Jab tum `javac` se `.java` file compile karte ho, toh `.class` file banti hai jisme bytecode hota hai — ye na pure machine code hai, na source code. JVM is bytecode ko read karta hai aur platform ke according execute karta hai.

Isiliye Java "write once, run anywhere" hai. Ek hi `.class` file Windows pe, Mac pe, Linux pe chalti hai.

```
MyService.java  →  javac  →  MyService.class (bytecode)  →  JVM execute karta hai
```

Dekho: [[02-Bytecode-and-Class-Loading]]

---

## C

### Caffeine Cache

**Kya hai?** JVM mein fast, in-memory cache. Spring Boot `spring-boot-starter-cache` + `caffeine` dependency add karo, aur `@Cacheable` annotation se method results cache karo.

```java
@Service
public class RestaurantService {

    @Cacheable(value = "restaurants", key = "#city")
    public List<Restaurant> getRestaurantsByCity(String city) {
        // Pehli baar DB se fetch karega
        // Baad mein same city ke liye cache se return karega
        return restaurantRepository.findByCity(city);
    }

    @CacheEvict(value = "restaurants", key = "#city")
    public void updateRestaurant(String city, Restaurant r) {
        // Update ke baad cache clear karo
        restaurantRepository.save(r);
    }
}
```

Zomato ya Swiggy mein restaurant listings mostly cache mein hoti hain — har user ke liye DB hit nahi karte.

Dekho: [[01-Library-Cheatsheet]]

---

### Checked Exception

**Kya hai?** Java mein do tarah ke exceptions hote hain. Checked exception woh hai jise compiler enforce karta hai — ya toh `try-catch` karo ya method signature mein `throws` likho.

```java
// IOException ek checked exception hai
public void readFile(String path) throws IOException {
    // agar IOException throw ho toh caller ko handle karna padega
    Files.readAllBytes(Path.of(path));
}

// Caller ko ye karna hi padega:
try {
    readFile("/data/menu.json");
} catch (IOException e) {
    // handle karo
}
```

> [!info] Spring Boot tip
> Spring Boot mostly unchecked exceptions prefer karta hai. Checked exceptions wali library calls ke around Spring wrappers provide karta hai jo unchecked throw karte hain (e.g., `JdbcTemplate` `SQLException` ko `DataAccessException` mein wrap karta hai).

Dekho: [[02-Checked-vs-Unchecked]]

---

### Circuit Breaker

**Kya hai?** Socho Swiggy ka order service payment gateway ko call karta hai. Payment gateway down ho gayi. Agar har order request wahan timeout ka intezaar kare — 30 seconds — toh pure system ki threads block ho jaayengi. Circuit breaker ye rokta hai.

Circuit breaker ek state machine hai:
- **Closed** (normal): requests pass ho rahi hain
- **Open** (fail fast): threshold exceed ho gayi, ab seedha fallback return karo, gateway ko mat call karo
- **Half-open** (recovery check): thodi requests try karo — agar success, wapas Closed; agar fail, wapas Open

```java
@CircuitBreaker(name = "paymentService", fallbackMethod = "paymentFallback")
public PaymentResponse processPayment(Order order) {
    return paymentGateway.charge(order);
}

public PaymentResponse paymentFallback(Order order, Exception e) {
    // Fallback: payment retry queue mein daalo
    return PaymentResponse.queued(order.getId());
}
```

Dekho: [[02-Resilience4j-Circuit-Breakers]]

---

### Class Loader

**Kya hai?** JVM mein `.class` files memory mein load karne ka kaam class loader karta hai. Ye on-demand hota hai — jab pehli baar class use hoti hai tab load hoti hai.

Spring Boot ka Fat JAR nested JARs ke saath kaam karne ke liye apna custom class loader use karta hai.

> [!info] Jab zarurat padegi
> `ClassNotFoundException` ya `NoClassDefFoundError` dekhoge toh class loading problem hai — typically wrong classpath ya missing dependency.

Dekho: [[02-Bytecode-and-Class-Loading]]

---

### CompletableFuture

**Kya hai?** Java ka async programming tool. Node.js mein `Promise` ka equivalent.

```java
// Node.js Promise:
// fetchUser(id).then(user => fetchOrders(user)).then(orders => process(orders))

// Java CompletableFuture:
CompletableFuture<User> userFuture = CompletableFuture.supplyAsync(() -> fetchUser(id));

userFuture
    .thenApply(user -> fetchOrders(user))   // thenApply = .then()
    .thenAccept(orders -> process(orders))  // thenAccept = side effect
    .exceptionally(ex -> {                  // .catch()
        log.error("Error: ", ex);
        return null;
    });
```

> [!warning] Gotcha
> `CompletableFuture` by default common ForkJoinPool use karta hai. Spring Boot applications mein agar blocking calls kar rahe ho (DB, HTTP), toh custom executor use karo warna thread pool exhaust ho sakta hai.

Dekho: [[03-CompletableFuture]]

---

### Component

**Kya hai?** Spring ko batane ka tarika ki "is class ka bean banao". `@Component` generic annotation hai. `@Service`, `@Repository`, `@Controller` iske specializations hain — same kaam karte hain, bas semantic meaning different hoti hai (aur kuch extra behavior milta hai jaise `@Repository` exception translation karta hai).

```java
@Component          // generic — koi specific role nahi
@Service            // business logic layer
@Repository         // database layer
@Controller         // web layer (returns views)
@RestController     // web layer (returns JSON/XML)
```

Dekho: [[03-Component-Scanning]]

---

### ConfigurationProperties

**Kya hai?** `application.yml` ki properties ko ek typed Java class mein bind karo. String typos se baccho, IDE autocomplete milti hai, aur validation bhi kar sakte ho.

```yaml
# application.yml
zomato:
  api:
    base-url: https://api.zomato.com
    timeout-ms: 5000
    api-key: ${ZOMATO_API_KEY}
    max-retries: 3
```

```java
@ConfigurationProperties(prefix = "zomato.api")
@Validated  // Bean Validation support
public class ZomatoApiProperties {
    @NotBlank
    private String baseUrl;

    @Min(100)
    private int timeoutMs;

    private String apiKey;
    private int maxRetries = 3;

    // getters/setters (ya Lombok @Data)
}

@Service
public class ZomatoApiClient {
    private final ZomatoApiProperties props;

    public ZomatoApiClient(ZomatoApiProperties props) {
        this.props = props;
    }
}
```

> [!tip] Node.js comparison
> `process.env.ZOMATO_API_KEY` se compare karo — woh untyped string hai. ConfigurationProperties typed, validated, aur documented hoti hai.

Dekho: [[04-Configuration-Properties]]

---

### CRUD

Create, Read, Update, Delete — database ke basic operations. Spring Data JPA mein `CrudRepository` ya `JpaRepository` extend karo, ye sab automatically mil jaate hain.

```java
public interface OrderRepository extends JpaRepository<Order, Long> {
    // findAll(), findById(), save(), delete() sab inherited hain
    // Custom query bhi likh sakte ho:
    List<Order> findByCustomerIdAndStatus(Long customerId, OrderStatus status);
}
```

Dekho: [[03-Spring-Data-Repositories]]

---

## D

### DI — Dependency Injection

**Kya hai?** Ek class ko uski dependencies khud nahi banani chahiye — bahar se provide karni chahiye. Ye testing easy banata hai (mock inject kar sakte ho) aur coupling kam karta hai.

```java
// Bina DI — tightly coupled, test karna mushkil
public class OrderService {
    private PaymentService payment = new PaymentService(); // khud bana raha hai!
    private InventoryService inventory = new InventoryService(); // ye bhi!
}

// DI ke saath — loosely coupled, testable
@Service
public class OrderService {
    private final PaymentService payment;
    private final InventoryService inventory;

    // Spring constructor injection karega
    public OrderService(PaymentService payment, InventoryService inventory) {
        this.payment = payment;
        this.inventory = inventory;
    }
}
```

> [!tip] Constructor injection prefer karo
> Field injection (`@Autowired` directly on field) avoid karo — constructor injection ke saath `final` use kar sakte ho, testing easy hai, aur circular dependencies pakdi jaati hain.

Dekho: [[01-IoC-DI-Concepts]]

---

### DTO — Data Transfer Object

**Kya hai?** API request ya response ke liye alag class banao — database entity directly expose mat karo. Ek `User` entity mein password hash, internal IDs, audit timestamps sab hote hain — client ko ye sab nahi chahiye.

```java
// Entity — DB ke liye
@Entity
public class User {
    @Id private Long id;
    private String name;
    private String email;
    private String passwordHash;  // KABHI bhi API response mein mat bhejo!
    private LocalDateTime createdAt;
    private boolean isAdmin;
}

// DTO — client ke liye
public record UserResponse(Long id, String name, String email) {}

// Controller mein convert karo
@GetMapping("/users/{id}")
public UserResponse getUser(@PathVariable Long id) {
    User user = userService.findById(id);
    return new UserResponse(user.getId(), user.getName(), user.getEmail());
}
```

> [!warning] Common mistake
> Entity directly return karna. Iska result: sensitive data expose hoti hai, aur JPA lazy-loading se JSON serialization ke time `LazyInitializationException` aa sakta hai.

Dekho: [[03-DTOs-and-Serialization]]

---

### DevTools

**Kya hai?** Development mein `spring-boot-devtools` dependency add karo — code change karo, app restart automatically ho jaata hai (partial restart jo bahut fast hai). Spring Boot 3.2+ mein live reload browser extension bhi support karta hai.

Sirf `compile` scope mein add karo — production build mein automatically exclude ho jaata hai.

Dekho: [[07-DevTools-and-Live-Reload]]

---

## E

### Entity

**Kya hai?** JPA mein ek `@Entity` annotated class jo directly database table se map hoti hai. Har field ek column hota hai.

```java
@Entity
@Table(name = "orders")  // default table name class name se hota hai
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String restaurantName;

    @Enumerated(EnumType.STRING)  // DB mein "PLACED", "DELIVERED" string store karo, int nahi
    private OrderStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private Customer customer;
}
```

> [!warning] Gotcha
> Entity classes mein no-args constructor hona chahiye (JPA ko chahiye reflection ke liye). Lombok `@NoArgsConstructor` use karo. Aur `equals`/`hashCode` override karte waqt entity ID pe base karo, na saare fields pe.

Dekho: [[02-Entity-Basics]]

---

### Eureka

**Kya hai?** Microservices mein ek service ko doosri service ka address kaise pata chale? Netflix ka Eureka ek service registry hai — har service startup pe apna address register karti hai, aur doosri services Eureka se address fetch karti hain. Kubernetes mein mostly Eureka ki zaroorat nahi hoti (k8s apna service discovery provide karta hai).

Dekho: [[02-Service-Discovery]]

---

### Executor / ExecutorService

**Kya hai?** Java mein thread pool manage karne ka standard tarika. Har async task ke liye naya thread mat banao — threads expensive hote hain. ExecutorService thread pool maintain karta hai.

```java
// Fixed thread pool — max 10 threads
ExecutorService pool = Executors.newFixedThreadPool(10);

pool.submit(() -> {
    // Ye background thread mein run hoga
    processOrder(order);
});

// Spring mein @Async use karo
@Service
public class NotificationService {

    @Async  // Spring automatically thread pool mein run karega
    public void sendEmail(String to, String message) {
        emailClient.send(to, message);
    }
}
```

Dekho: [[02-ExecutorService-and-Thread-Pools]]

---

## F

### Fat JAR

**Kya hai?** Spring Boot ka executable JAR jisme tumhara code, saari dependencies, aur embedded Tomcat server — sab ek file mein hote hain. Deploy karna itna simple: `java -jar myapp.jar`.

Node.js `node_modules` folder separately deploy karna padta hai. Java Fat JAR self-contained hai.

```bash
# Build karo
mvn clean package

# Run karo — koi extra setup nahi
java -jar target/myapp-0.0.1-SNAPSHOT.jar

# Production mein typically ye ho jaata hai:
java -Xms512m -Xmx1g -jar target/myapp.jar --spring.profiles.active=prod
```

Dekho: [[01-Packaging-Fat-JAR]]

---

### Feign Client

**Kya hai?** Doosri REST API call karne ka declarative tarika. Interface define karo, annotations lagao — Spring apne aap implementation banata hai. Node.js mein `axios` use karte ho, Spring mein Feign ya RestClient.

```java
@FeignClient(name = "payment-service", url = "${payment.service.url}")
public interface PaymentClient {

    @PostMapping("/payments/charge")
    PaymentResponse charge(@RequestBody ChargeRequest request);

    @GetMapping("/payments/{id}")
    PaymentStatus getStatus(@PathVariable String id);
}

// Use karo — implementation khud likhne ki zaroorat nahi
@Service
public class OrderService {
    private final PaymentClient paymentClient;

    public void placeOrder(Order order) {
        PaymentResponse response = paymentClient.charge(new ChargeRequest(order));
    }
}
```

Dekho: [[10-WebClient-and-RestClient]]

---

### Filter Chain (Spring Security)

**Kya hai?** Har HTTP request Spring Security ke filters ki ek chain se guzarti hai. Authentication check, authorization check, CORS handling, CSRF protection — sab alag-alag filters mein hote hain, sequence mein.

Node.js mein Express middleware chain jaisa samjho — `app.use()` se add karte ho. Spring Security mein ye configured `SecurityFilterChain` bean se hota hai.

Dekho: [[01-Spring-Security-Basics]]

---

### Flyway

**Kya hai?** Database schema changes ko version control karo. `V1__create_users_table.sql`, `V2__add_order_table.sql` — ye migrations automatically apply hote hain app startup pe.

```
db/migration/
  V1__init_schema.sql
  V2__add_restaurant_table.sql
  V3__add_order_status_column.sql
```

```sql
-- V3__add_order_status_column.sql
ALTER TABLE orders
ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'PLACED';
```

> [!warning] Gotcha
> Ek baar apply ho gayi migration ko KABHI edit mat karo. Flyway checksum verify karta hai — edit karoge toh app start hi nahi karega. Naya migration file banao changes ke liye.

Dekho: [[08-Migrations-Flyway-Liquibase]]

---

## G

### GC — Garbage Collector

**Kya hai?** JVM ka automatic memory manager. Java mein `free()` nahi karna padta (C/C++ ki tarah) — GC apne aap unused objects ki memory reclaim karta hai.

Different GC algorithms hain: G1GC (default), ZGC, Shenandoah. Production mein typically G1GC ya ZGC use hota hai.

> [!info] Node.js comparison
> Node.js V8 engine bhi garbage collection karta hai. Same concept, different implementation.

> [!warning] Gotcha
> "GC is free" mat socho. GC pauses create karta hai — "Stop the World" events. High-throughput apps mein GC tuning important hai. `OutOfMemoryError` aaye toh GC logs analyze karo.

Dekho: [[03-JVM-Memory-and-GC]]

---

### Generics

**Kya hai?** Type-safe containers likhne ka tarika. `List<String>` guarantee karta hai ki list mein sirf Strings hongi — `List` (raw type) koi bhi le sakta hai.

```java
// Bina generics — runtime pe ClassCastException risk
List names = new ArrayList();
names.add("Siddesh");
names.add(42);  // allowed! but wrong
String name = (String) names.get(1);  // CRASH

// Generics ke saath — compile time check
List<String> names = new ArrayList<>();
names.add("Siddesh");
// names.add(42);  // compile error — caught early!
String name = names.get(0);  // no cast needed
```

Dekho: [[01-Generics]], [[03-Type-Erasure]]

---

### GraalVM

**Kya hai?** Oracle ka alternative JVM jo native image compilation support karta hai. `native-image` tool use karo aur ek self-contained binary bana lo — JVM ki zaroorat hi nahi.

Result: startup 10ms mein (vs 2-3 seconds), memory 50-70% kam. Serverless/Lambda ke liye perfect.

Tradeoff: build time zyada, reflection-heavy code mein extra configuration chahiye.

Dekho: [[03-GraalVM-Native-Image]]

---

### Gradle

**Kya hai?** Maven ka competitor build tool. Maven XML use karta hai, Gradle Kotlin ya Groovy DSL use karta hai — zyada readable aur flexible.

```kotlin
// build.gradle.kts (Kotlin DSL)
dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    runtimeOnly("org.postgresql:postgresql")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
}
```

Incremental builds aur caching ki wajah se Gradle generally faster hai.

Dekho: [[02-Gradle-Basics]]

---

## H

### HikariCP

**Kya hai?** Spring Boot ka default JDBC connection pool. Database connection banane mein time lagta hai — pool maintains karta hai ready connections. Request aai, connection lo; done, wapas pool mein daalo.

```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 20      # max connections (default 10)
      minimum-idle: 5             # kam se kam idle connections
      connection-timeout: 30000   # 30 seconds mein connection nahi mila toh exception
      idle-timeout: 600000        # 10 min idle raha toh close karo
```

> [!warning] Gotcha
> Pool size bahut zyada mat rakho. PostgreSQL default max_connections 100 hota hai. Agar 5 instances deployed hain 20 connections each — 100 connections exhaust ho jaayenge. Pool size = (CPU cores * 2) + effective spindle count — ye formula generally kaam karta hai.

Dekho: [[01-JPA-Hibernate-Basics]]

---

### Hibernate

**Kya hai?** JPA (Jakarta Persistence API) ka sabse popular implementation. ORM (Object-Relational Mapping) framework jo Java objects aur database tables ke beech mapping handle karta hai.

```java
// Tum likhte ho:
User user = userRepository.findById(1L).orElseThrow();
user.setEmail("new@email.com");
// @Transactional context mein — Hibernate automatically UPDATE SQL run karega

// Hibernate automatically banata hai:
// UPDATE users SET email = ? WHERE id = ?
```

Dekho: [[01-JPA-Hibernate-Basics]]

---

## I

### IoC — Inversion of Control

**Kya hai?** Normally tumhara code control mein hota hai — tum objects banate ho, methods call karte ho. IoC mein framework control leta hai — tum sirf configuration karte ho, framework decide karta hai kab aur kaise objects banana hai.

Spring ka ApplicationContext IoC container hai. Tum beans define karte ho, Spring unhe banata hai, wires karta hai, aur lifecycle manage karta hai.

> [!info] Hollywood Principle
> "Don't call us, we'll call you." — Framework tumhare code ko call karta hai, ulta nahi.

Dekho: [[01-IoC-DI-Concepts]]

---

### Interface

**Kya hai?** Java ka `interface` ek contract define karta hai — "jo bhi class ye implement kare, use ye methods provide karne honge." Java 8 se default methods bhi allowed hain.

```java
public interface PaymentGateway {
    PaymentResult charge(Money amount, String token);

    // Java 8+ default method — implementation provide kar sakte ho
    default boolean supports(Currency currency) {
        return currency == Currency.INR;
    }
}

// Multiple implementations
@Component("razorpay")
public class RazorpayGateway implements PaymentGateway { ... }

@Component("stripe")
public class StripeGateway implements PaymentGateway { ... }
```

> [!tip] Testing ke liye
> Interfaces mock karna easy hai. `PaymentGateway` interface ke against code likho, test mein mock inject karo — real payment call nahi hogi.

Dekho: [[06-Interfaces-and-Abstract-Classes]]

---

## J

### JAR — Java ARchive

**Kya hai?** ZIP format mein compiled Java classes aur resources. Spring Boot Fat JAR ek special JAR hai jo nested JARs (dependencies) aur embedded server bhi include karta hai.

```bash
# Unzip karke contents dekho
jar -tf myapp.jar | head -20

# Run karo
java -jar myapp.jar
```

Dekho: [[01-Packaging-Fat-JAR]]

---

### Jackson

**Kya hai?** Java ka most popular JSON library. Spring Boot mein default. JSON-to-Java (deserialization) aur Java-to-JSON (serialization) dono karta hai.

```java
// Basic use — Spring automatically karta hai yeh sab controllers mein

// ObjectMapper directly use karo jab manually JSON karna ho
@Component
public class JsonHelper {
    private final ObjectMapper mapper;

    public JsonHelper(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    public String toJson(Object obj) throws JsonProcessingException {
        return mapper.writeValueAsString(obj);
    }

    public <T> T fromJson(String json, Class<T> type) throws JsonProcessingException {
        return mapper.readValue(json, type);
    }
}

// Customization annotations
public class OrderDto {
    @JsonProperty("order_id")          // JSON key alag naam chahiye
    private Long id;

    @JsonIgnore                        // JSON mein include mat karo
    private String internalNotes;

    @JsonFormat(pattern = "dd-MM-yyyy HH:mm")
    private LocalDateTime createdAt;

    @JsonInclude(JsonInclude.Include.NON_NULL)  // null values skip karo
    private String promoCode;
}
```

Dekho: [[04-Jackson-Deep-Dive]]

---

### JDBC — Java Database Connectivity

**Kya hai?** Java mein database se baat karne ka lowest-level API. Direct SQL likhte ho, ResultSet manually handle karte ho. JPA/Hibernate JDBC ke upar built hai.

```java
// Ye JDBC hai — verbose but maximum control
Connection conn = dataSource.getConnection();
PreparedStatement stmt = conn.prepareStatement("SELECT * FROM orders WHERE id = ?");
stmt.setLong(1, orderId);
ResultSet rs = stmt.executeQuery();
while (rs.next()) {
    Order order = new Order();
    order.setId(rs.getLong("id"));
    order.setStatus(rs.getString("status"));
}
```

Spring `JdbcTemplate` se JDBC ka boilerplate kam hota hai. Complex queries ke liye ya JPA se better performance chahiye toh directly JDBC ya `JdbcTemplate` use karo.

Dekho: [[01-JPA-Hibernate-Basics]]

---

### JDK — Java Development Kit

**Kya hai?** Java development ke liye full toolkit — JRE (runtime) + compiler (`javac`) + tools (`jar`, `jshell`, `jconsole`, `jmap`). Production server pe sirf JRE kafi hota hai.

```
JDK
├── JRE (Java Runtime Environment)
│   └── JVM (Java Virtual Machine)
│       └── bytecode execute karta hai
├── javac (compiler)
├── jar (packaging tool)
├── jshell (REPL)
└── jmap, jstack, jconsole (diagnostic tools)
```

Dekho: [[01-JDK-JRE-JVM-Basics]]

---

### JIT — Just-In-Time Compilation

**Kya hai?** JVM pehle bytecode interpret karta hai (slow). Jab koi code "hot" ho jaata hai (bahut baar run hota hai), JIT compiler use native machine code mein compile kar deta hai — much faster.

Isiliye Java apps startup pe slow hote hain lekin time ke saath "warm up" ho jaate hain aur fast ho jaate hain. Ye "warm up" period Lambda/serverless mein problem create karta hai — isliye Native Image (AOT) wahan useful hai.

Dekho: [[03-JVM-Memory-and-GC]]

---

### Jib

**Kya hai?** Google ka tool jo Spring Boot app ka Docker image banata hai bina Dockerfile likhe aur bina Docker daemon ke. CI/CD mein useful — Docker install nahi karna padta.

```xml
<!-- pom.xml mein add karo -->
<plugin>
    <groupId>com.google.cloud.tools</groupId>
    <artifactId>jib-maven-plugin</artifactId>
    <version>3.4.0</version>
    <configuration>
        <to>
            <image>gcr.io/my-project/myapp:latest</image>
        </to>
    </configuration>
</plugin>
```

```bash
# Docker daemon ke bina image build karke registry push karo
mvn jib:build
```

Dekho: [[02-Docker-for-Spring-Boot]]

---

### JPA — Jakarta Persistence API

**Kya hai?** Java mein ORM ke liye specification (interface set). Hibernate is specification ki implementation hai. JPA annotations use karo (`@Entity`, `@OneToMany`, etc.) — specific ORM vendor se tied nahi ho.

> [!info] Analogy
> JPA = JDBC interface; Hibernate = ek implementation. Jaise JDBC ek standard API hai, aur PostgreSQL/MySQL driver uski implementations hain.

Dekho: [[01-JPA-Hibernate-Basics]]

---

### JPQL — Jakarta Persistence Query Language

**Kya hai?** JPA ke liye query language jo SQL jaisi lagti hai lekin table/column names ki jagah Java class aur field names use karta hai.

```java
// SQL: SELECT * FROM orders WHERE customer_id = ? AND status = ?
// JPQL: entity name aur field name use karo
@Query("SELECT o FROM Order o WHERE o.customer.id = :customerId AND o.status = :status")
List<Order> findByCustomerAndStatus(@Param("customerId") Long id,
                                    @Param("status") OrderStatus status);

// Native SQL bhi likh sakte ho — complex queries ke liye
@Query(value = "SELECT * FROM orders WHERE EXTRACT(MONTH FROM created_at) = :month",
       nativeQuery = true)
List<Order> findOrdersByMonth(@Param("month") int month);
```

Dekho: [[04-Query-Methods-and-JPQL]]

---

### jshell

**Kya hai?** Java REPL (Read-Eval-Print Loop) — JDK 9 se available. Quick Java snippets try karo bina poora project banaye.

```bash
$ jshell
|  Welcome to JShell -- Version 21

jshell> var list = List.of(1, 2, 3, 4, 5)
jshell> list.stream().filter(n -> n % 2 == 0).toList()
$2 ==> [2, 4]
```

Dekho: [[05-Common-CLI-Tools]]

---

### JUnit 5

**Kya hai?** Java ka standard testing framework. Node.js mein Jest/Mocha jaisa.

```java
@SpringBootTest  // full Spring context load karo
class OrderServiceTest {

    @Autowired
    private OrderService orderService;

    @MockBean
    private PaymentService paymentService;  // real payment nahi chahiye tests mein

    @Test
    @DisplayName("Order place hona chahiye jab payment successful ho")
    void shouldPlaceOrderWhenPaymentSucceeds() {
        // Arrange
        when(paymentService.charge(any())).thenReturn(PaymentResult.success());

        // Act
        Order order = orderService.placeOrder(new CreateOrderRequest("Pizza", 2));

        // Assert
        assertThat(order.getStatus()).isEqualTo(OrderStatus.CONFIRMED);
        verify(paymentService).charge(any());
    }

    @Test
    void shouldThrowWhenItemNotAvailable() {
        assertThatThrownBy(() -> orderService.placeOrder(new CreateOrderRequest("", 0)))
            .isInstanceOf(ValidationException.class)
            .hasMessageContaining("Item name required");
    }
}
```

Dekho: [[02-JUnit-5-Basics]]

---

### JVM — Java Virtual Machine

**Kya hai?** Ek virtual machine jo Java bytecode execute karti hai. Windows, Mac, Linux — har platform ka apna JVM implementation hota hai, lekin bytecode same hota hai.

```
Tumhara Code (.java)
       ↓ javac
   Bytecode (.class)
       ↓ JVM loads
   Machine Code (platform-specific)
       ↓
   CPU Execute karta hai
```

JVM memory management (GC), JIT compilation, thread management — sab kuch handle karta hai.

Dekho: [[01-JDK-JRE-JVM-Basics]]

---

### JWT — JSON Web Token

**Kya hai?** Stateless authentication ke liye signed token. User login karta hai, server JWT return karta hai. Baad ki requests mein client JWT bhejta hai header mein — server verify karta hai signature, koi DB lookup nahi.

```
eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyQGV4YW1wbGUuY29tIiwicm9sZXMiOlsiVVNFUiJdLCJpYXQiOjE2OTAwMDAwMDAsImV4cCI6MTY5MDA4NjQwMH0.signature
     ^Header                    ^Payload (Base64)                                                                                                    ^Signature
```

```java
// Spring Security mein JWT filter
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                     HttpServletResponse response,
                                     FilterChain chain) throws ServletException, IOException {
        String token = extractToken(request);
        if (token != null && jwtService.isValid(token)) {
            // Authentication set karo Spring Security context mein
            UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(
                    jwtService.extractUsername(token), null,
                    jwtService.extractAuthorities(token)
                );
            SecurityContextHolder.getContext().setAuthentication(auth);
        }
        chain.doFilter(request, response);
    }
}
```

> [!warning] Gotcha
> JWT revoke karna mushkil hai — expiry se pehle invalidate nahi kar sakte (short expiry + refresh token pattern use karo). Sensitive data JWT payload mein mat daalo — Base64 decoded easily padha ja sakta hai.

Dekho: [[04-JWT-with-Spring-Security]]

---

## K

### Kafka

**Kya hai?** Distributed event streaming platform. Microservices mein loose coupling ke liye — service directly call karne ki jagah event publish karo Kafka topic pe, aur interested services consume karte hain.

```java
// Producer — event publish karo
@Service
public class OrderService {
    private final KafkaTemplate<String, OrderEvent> kafka;

    public void placeOrder(Order order) {
        orderRepository.save(order);
        // Doosri services ko batao order placed hua — directly call nahi
        kafka.send("order-events", new OrderPlacedEvent(order.getId(), order.getTotal()));
    }
}

// Consumer — notification service sun raha hai
@Service
public class NotificationService {
    @KafkaListener(topics = "order-events", groupId = "notifications")
    public void onOrderPlaced(OrderPlacedEvent event) {
        sendOrderConfirmationEmail(event.getOrderId());
    }
}
```

Swiggy, Zomato jaise apps mein order events, real-time tracking updates, analytics — sab Kafka ya similar systems pe hote hain.

Dekho: [[01-Spring-Kafka]]

---

### Kubernetes (k8s)

**Kya hai?** Container orchestration platform — Docker containers ko production mein deploy, scale, aur manage karo. Zomato jaisi company ke thousands of containers automatically manage karta hai.

Key concepts:
- **Pod** — ek ya zyada containers ka group
- **Deployment** — pods ka desired state declare karo
- **Service** — pods ke upar stable network endpoint
- **ConfigMap/Secret** — configuration aur secrets
- **HorizontalPodAutoscaler** — traffic ke hisaab se pods scale karo

Dekho: [[04-Kubernetes-Basics]]

---

## L

### Lazy Loading

**Kya hai?** JPA mein by default `@OneToMany` aur `@ManyToMany` associations lazily load hoti hain — related entities tab tak DB se nahi aatein jab tak directly access na karo.

```java
@Entity
public class Restaurant {
    @OneToMany(mappedBy = "restaurant", fetch = FetchType.LAZY)
    private List<MenuItem> menu;  // DB se tab load hoga jab menu access karoge
}

// Transaction ke andar — works fine
@Transactional
public void printMenu(Long restaurantId) {
    Restaurant r = restaurantRepository.findById(restaurantId).orElseThrow();
    r.getMenu().forEach(item -> System.out.println(item.getName()));  // OK
}

// Transaction ke bahar — CRASH!
public void printMenu(Long restaurantId) {
    Restaurant r = restaurantRepository.findById(restaurantId).orElseThrow();
    // Session already closed
    r.getMenu().forEach(...);  // LazyInitializationException!
}
```

> [!warning] N+1 Problem
> Lazy loading ka classic trap: 1 query se 10 restaurants lo, phir har restaurant ke liye separately menu load karo = 11 queries. `JOIN FETCH` ya `@EntityGraph` use karo.

Dekho: [[06-Relationships-and-Lazy-Loading]], [[07-N-Plus-1-and-Fetch-Strategies]]

---

### Liveness Probe

**Kya hai?** Kubernetes regularly check karta hai — kya app alive hai? Fail hone par container restart karta hai.

```yaml
livenessProbe:
  httpGet:
    path: /actuator/health/liveness
    port: 8080
  initialDelaySeconds: 30  # startup ke baad wait karo
  periodSeconds: 10
  failureThreshold: 3
```

Spring Boot 2.3+ automatically `/actuator/health/liveness` aur `/actuator/health/readiness` provide karta hai.

Dekho: [[05-Health-Checks-and-Readiness]]

---

### Logback

**Kya hai?** Spring Boot ka default logging implementation. SLF4J API ke through use karo — direct Logback dependency mat lo.

```java
// Ye karo — SLF4J facade ke through
private static final Logger log = LoggerFactory.getLogger(OrderService.class);
// Ya Lombok ke saath:
@Slf4j
@Service
public class OrderService {
    public void placeOrder(Order order) {
        log.info("Order placed: orderId={}, restaurantId={}", order.getId(), order.getRestaurantId());
        log.debug("Order details: {}", order);  // debug level — production mein off hoga
        log.error("Payment failed for orderId={}", order.getId(), exception);
    }
}
```

```yaml
# application.yml mein log levels set karo
logging:
  level:
    com.myapp: DEBUG        # apna code DEBUG
    org.hibernate.SQL: DEBUG  # Hibernate SQL dekhne ke liye
    root: INFO              # baaki sab INFO
```

Dekho: [[03-Logging-Best-Practices]]

---

### Lombok

**Kya hai?** Boilerplate code generate karne ka annotation processor. Getters, setters, constructors, equals/hashCode, toString — sab @annotations se.

```java
// Bina Lombok — 50+ lines
public class Order {
    private Long id;
    private String status;
    // ... getters, setters, constructor, equals, hashCode, toString

// Lombok ke saath — clean!
@Data           // @Getter + @Setter + @ToString + @EqualsAndHashCode + @RequiredArgsConstructor
@Builder        // builder pattern
@NoArgsConstructor
@AllArgsConstructor
public class Order {
    private Long id;
    private String status;
}

// Use karo:
Order order = Order.builder()
    .id(1L)
    .status("PLACED")
    .build();
```

> [!warning] Gotcha
> `@Data` on JPA entities avoid karo — generated `equals`/`hashCode` saare fields use karta hai jo JPA ke saath problematic hai. Entities pe sirf `@Getter`/`@Setter` use karo.

Dekho: [[02-Lombok]]

---

## M

### MapStruct

**Kya hai?** Entity se DTO mein convert karna compile time pe (reflection nahi, pure generated code) — faster aur type-safe.

```java
@Mapper(componentModel = "spring")
public interface OrderMapper {

    @Mapping(source = "customer.email", target = "customerEmail")
    @Mapping(source = "restaurant.name", target = "restaurantName")
    @Mapping(target = "createdAt", dateFormat = "dd-MM-yyyy HH:mm")
    OrderDto toDto(Order order);

    Order toEntity(CreateOrderRequest request);

    List<OrderDto> toDtoList(List<Order> orders);
}

// Use karo — Spring inject karega
@Service
public class OrderService {
    private final OrderMapper mapper;

    public OrderDto getOrder(Long id) {
        Order order = orderRepository.findById(id).orElseThrow();
        return mapper.toDto(order);  // generated code automatically run hoga
    }
}
```

Dekho: [[03-MapStruct]]

---

### Maven

**Kya hai?** Java projects ka build aur dependency management tool. `pom.xml` mein dependencies declare karo, Maven download karega, compile karega, test run karega, JAR banayega.

```xml
<!-- pom.xml ka basic structure -->
<project>
    <groupId>com.mycompany</groupId>
    <artifactId>order-service</artifactId>
    <version>1.0.0</version>

    <parent>
        <!-- Spring Boot BOM — version management -->
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.3.0</version>
    </parent>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
            <!-- Version nahi likhna — parent BOM se aata hai -->
        </dependency>
    </dependencies>
</project>
```

```bash
mvn clean install     # clean build + JAR
mvn spring-boot:run   # development mein run karo
mvn test              # tests run karo
```

Dekho: [[01-Maven-Basics]]

---

### MDC — Mapped Diagnostic Context

**Kya hai?** Thread-local key-value store for logging. Ek request ke saare log lines mein same `requestId` ya `userId` automatically dikh sake — bina har log statement mein manually likhhe.

```java
// Filter mein MDC set karo
@Component
public class RequestIdFilter implements Filter {
    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain) {
        String requestId = UUID.randomUUID().toString().substring(0, 8);
        MDC.put("requestId", requestId);
        MDC.put("userId", extractUserId(req));
        try {
            chain.doFilter(req, res);
        } finally {
            MDC.clear();  // thread pool mein thread wapas jaata hai — clear karo!
        }
    }
}

// logback.xml mein include karo
// <pattern>%d{HH:mm:ss} [%X{requestId}] [%X{userId}] %-5level %msg%n</pattern>

// Ab saare logs mein automatically requestId aayega:
// 14:23:01 [abc12345] [user@email.com] INFO  Order placed successfully
```

Dekho: [[03-Logging-Best-Practices]]

---

### Micrometer

**Kya hai?** Metrics collection ke liye facade library — SLF4J jaisa, par metrics ke liye. Custom counters, timers, gauges define karo. Backend Prometheus, Datadog, CloudWatch, kuch bhi ho sakta hai.

```java
@Service
public class OrderService {
    private final Counter orderCounter;
    private final Timer orderTimer;

    public OrderService(MeterRegistry registry) {
        this.orderCounter = registry.counter("orders.placed", "restaurant", "zomato");
        this.orderTimer = registry.timer("orders.processing.time");
    }

    public Order placeOrder(CreateOrderRequest req) {
        return orderTimer.recordCallable(() -> {
            Order order = processOrder(req);
            orderCounter.increment();
            return order;
        });
    }
}
```

Dekho: [[02-Micrometer-Metrics]]

---

### Mockito

**Kya hai?** Unit tests mein real dependencies ki jagah fake (mock) objects use karo. Zomato test karte waqt real payment gateway hit nahi karna — mock use karo.

```java
@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock
    private PaymentService paymentService;  // fake implementation

    @Mock
    private OrderRepository orderRepository;

    @InjectMocks
    private OrderService orderService;  // mocks inject ho jaayenge

    @Test
    void shouldRefundWhenOrderCancelled() {
        // Arrange — mock behavior set karo
        Order order = new Order(1L, OrderStatus.PLACED, new BigDecimal("250.00"));
        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));
        when(paymentService.refund(any())).thenReturn(RefundResult.success());

        // Act
        orderService.cancelOrder(1L);

        // Verify — sahi method call hui?
        verify(paymentService).refund(argThat(r -> r.getAmount().equals(order.getTotal())));
        verify(orderRepository).save(argThat(o -> o.getStatus() == OrderStatus.CANCELLED));
    }
}
```

Dekho: [[03-Mockito-and-AssertJ]]

---

## N

### N+1 Problem

**Kya hai?** JPA ka sabse common performance bug. 10 restaurants fetch karo, phir Hibernate har restaurant ke liye separately 1 query aur karta hai menu fetch karne ke liye = 1 + 10 = 11 queries.

```java
// N+1 bug
List<Restaurant> restaurants = restaurantRepository.findAll();  // Query 1
for (Restaurant r : restaurants) {
    // Har iteration pe alag query! 
    System.out.println(r.getMenuItems().size());  // Query 2, 3, 4...N+1
}

// FIX — JOIN FETCH use karo
@Query("SELECT r FROM Restaurant r JOIN FETCH r.menuItems WHERE r.city = :city")
List<Restaurant> findByCityWithMenu(@Param("city") String city);

// Ya @EntityGraph
@EntityGraph(attributePaths = {"menuItems"})
List<Restaurant> findByCity(String city);
```

Production mein N+1 ke saath 100 restaurants = 101 DB queries. Hibernate SQL logging enable karo development mein aur count karo.

Dekho: [[07-N-Plus-1-and-Fetch-Strategies]]

---

### Native Image

AOT-compiled application binary. JVM nahi chahiye. GraalVM `native-image` se banate hain. Serverless/Lambda ke liye ideal — millisecond startup.

Dekho: [[03-GraalVM-Native-Image]], [AOT](#aot--ahead-of-time-compilation)

---

## O

### OAuth2 / OIDC

**Kya hai?** "Google se login karo", "GitHub se login karo" — ye OAuth2 hai. Tumhara app user ke credentials handle nahi karta, trusted provider (Google, GitHub) karta hai.

OIDC (OpenID Connect) OAuth2 ke upar built hai aur identity layer add karta hai — sirf permission nahi, user ki identity bhi milti hai.

```java
// Spring Security + OAuth2 — Google login
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .oauth2Login(oauth2 -> oauth2
                .defaultSuccessUrl("/dashboard"))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/public/**").permitAll()
                .anyRequest().authenticated());
        return http.build();
    }
}
```

Dekho: [[05-OAuth2-OIDC-with-Spring]]

---

### ObjectMapper

**Kya hai?** Jackson ka main class — JSON operations ke liye entry point.

```java
ObjectMapper mapper = new ObjectMapper();

// Object to JSON
String json = mapper.writeValueAsString(order);

// JSON to Object
Order order = mapper.readValue(jsonString, Order.class);

// Generic types ke saath
List<Order> orders = mapper.readValue(jsonArray,
    mapper.getTypeFactory().constructCollectionType(List.class, Order.class));
```

Spring Boot automatically ek configured `ObjectMapper` bean provide karta hai — apna mat banao, woh inject karo.

Dekho: [[04-Jackson-Deep-Dive]]

---

### Optional

**Kya hai?** Null pointer exceptions se bachne ka Java 8 ka tarika. Method `null` return nahi karta, `Optional` return karta hai — caller ko explicitly handle karna padta hai "value absent" case.

```java
// Bina Optional
User user = userRepository.findById(id);  // null aa sakta hai
user.getName();  // NullPointerException if null!

// Optional ke saath
Optional<User> userOpt = userRepository.findById(id);

// Agar exist kare toh use karo, nahi toh exception throw karo
User user = userOpt.orElseThrow(() -> new UserNotFoundException(id));

// Default value
String name = userOpt.map(User::getName).orElse("Guest");

// Conditional processing
userOpt.ifPresent(u -> sendWelcomeEmail(u.getEmail()));
```

> [!warning] Gotcha
> `Optional.get()` bina check ke mat karo — same problem hai NullPointerException jaisi. `orElse`, `orElseThrow`, `orElseGet`, `ifPresent` use karo.

Dekho: [[04-Optional-and-Null-Safety]]

---

### OTel — OpenTelemetry

**Kya hai?** Distributed tracing aur observability ke liye vendor-neutral standard. Microservices mein ek user request kaafi services touch karti hai — Zomato order: API Gateway → Order Service → Payment Service → Notification Service. OTel se ye poora path track karo ek `traceId` se.

Dekho: [[04-Distributed-Tracing]]

---

## P

### POJO — Plain Old Java Object

Koi bhi simple Java class — koi framework annotations nahi, koi specific interface implement nahi, koi class extend nahi. Bas data hold karna ya simple logic.

```java
// POJO — bilkul simple
public class Address {
    private String street;
    private String city;
    private String pincode;
    // constructors, getters/setters
}
```

---

### POM — Project Object Model

Maven ka `pom.xml` — project configuration file. Dependencies, plugins, build configuration sab yahan.

Dekho: [[01-Maven-Basics]]

---

### ProblemDetail

**Kya hai?** RFC 7807 standard error response format. Spring 6 (Spring Boot 3) mein first-class support mila. Consistent, machine-readable error responses.

```json
{
  "type": "https://api.myapp.com/errors/order-not-found",
  "title": "Order Not Found",
  "status": 404,
  "detail": "Order with ID 12345 does not exist",
  "instance": "/api/orders/12345"
}
```

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(OrderNotFoundException.class)
    public ProblemDetail handleOrderNotFound(OrderNotFoundException ex) {
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.NOT_FOUND);
        problem.setTitle("Order Not Found");
        problem.setDetail(ex.getMessage());
        problem.setProperty("orderId", ex.getOrderId());
        return problem;
    }
}
```

Dekho: [[05-Exception-Handlers-and-ProblemDetail]]

---

### Profile

**Kya hai?** Different environments ke liye different configuration. Dev mein H2 in-memory DB, staging mein PostgreSQL, production mein prod credentials — sab alag.

```yaml
# application.yml — common config
spring:
  application:
    name: order-service

---
# Dev profile
spring:
  config:
    activate:
      on-profile: dev
  datasource:
    url: jdbc:h2:mem:devdb
  jpa:
    show-sql: true

---
# Prod profile
spring:
  config:
    activate:
      on-profile: prod
  datasource:
    url: ${DATABASE_URL}
  jpa:
    show-sql: false
```

```bash
# Profile activate karo
java -jar app.jar --spring.profiles.active=prod
# Ya environment variable se:
SPRING_PROFILES_ACTIVE=prod java -jar app.jar
```

Dekho: [[06-Profiles-Per-Environment]]

---

### Prometheus

**Kya hai?** Open-source metrics collection aur alerting system. Micrometer metrics expose karo `/actuator/prometheus` pe, Prometheus pull karke store karta hai, Grafana dashboard mein visualize karo.

Zomato, Flipkart jaisi companies ke infrastructure monitoring mein Prometheus/Grafana standard hai.

Dekho: [[02-Micrometer-Metrics]]

---

### Proxy (Spring)

**Kya hai?** Spring tumhare bean ko directly inject nahi karta — ek wrapper (proxy) inject karta hai. Jab tum proxy ka method call karte ho, proxy pehle cross-cutting concerns handle karta hai (transaction start karo, security check karo, log karo) phir actual method call karta hai.

```
Tumhara Code → Proxy → Actual Bean Method
                ↓
    [Transaction Start]
    [Security Check]
    [Logging]
    [Actual Logic]
    [Transaction Commit/Rollback]
```

> [!warning] Gotcha — self-invocation
> Agar ek method doosri method same class mein call kare, AOP/transactions kaam nahi karte. Class apna proxy nahi hoti.
> ```java
> @Service
> public class OrderService {
>     @Transactional
>     public void processOrder() {
>         this.saveOrder();  // ye PROXY ke through nahi jaayega!
>         // @Transactional saveOrder pe kaam nahi karega
>     }
>
>     @Transactional(propagation = REQUIRES_NEW)
>     public void saveOrder() { ... }
> }
> ```

Dekho: [[07-AOP-and-Proxies]]

---

## R

### Readiness Probe

**Kya hai?** Kubernetes check karta hai — kya app traffic handle karne ke liye ready hai? Fail hone par traffic route nahi hota (lekin restart bhi nahi). Useful for: DB connection establish ho rahi hai, cache warm up ho raha hai.

```yaml
readinessProbe:
  httpGet:
    path: /actuator/health/readiness
    port: 8080
  initialDelaySeconds: 20
  periodSeconds: 5
```

Dekho: [[05-Health-Checks-and-Readiness]]

---

### Record

**Kya hai?** JDK 16 mein aya immutable data class shorthand. DTOs aur value objects ke liye perfect.

```java
// Traditional class — bahut boilerplate
public final class OrderSummary {
    private final Long id;
    private final String status;
    private final BigDecimal total;
    // constructor, getters, equals, hashCode, toString...
}

// Record — same cheez, teen lines mein
public record OrderSummary(Long id, String status, BigDecimal total) {}

// Use karo
OrderSummary summary = new OrderSummary(1L, "PLACED", new BigDecimal("250.00"));
System.out.println(summary.id());     // getter
System.out.println(summary.total());  // getter
// equals, hashCode, toString sab generated
```

> [!tip] JPA entities pe mat use karo
> Records immutable hote hain — JPA ko mutable entities chahiye (dirty checking ke liye). Records DTOs/responses ke liye use karo.

Dekho: [[09-Records-and-Pattern-Matching]]

---

### Reflection

**Kya hai?** Runtime pe classes inspect karna, fields access karna, methods call karna — bina compile time knowledge ke. Spring, Jackson, JPA sab heavily reflection use karte hain.

```java
// Reflection se kisi bhi class ka koi bhi field access karo
Field field = User.class.getDeclaredField("email");
field.setAccessible(true);  // private fields bhi
field.set(user, "new@email.com");
```

> [!warning] Native Image ke saath
> GraalVM native image mein reflection limited hai — use hone wale classes explicitly register karne padte hain.

---

### Repository

**Kya hai?** Database operations ke liye bean. Spring Data JPA mein sirf interface banao extending `JpaRepository` — implementation Spring khud generate karta hai.

```java
@Repository  // ya sirf JpaRepository extend karo — annotation optional hai
public interface ProductRepository extends JpaRepository<Product, Long> {

    // Method name se Spring query generate karta hai
    List<Product> findByCategoryAndPriceLessThan(String category, BigDecimal maxPrice);

    // Existence check
    boolean existsBySkuCode(String skuCode);

    // Custom query
    @Query("SELECT p FROM Product p WHERE p.stock > 0 AND p.category = :cat")
    Page<Product> findAvailableByCategory(@Param("cat") String category, Pageable pageable);

    // Native SQL
    @Modifying
    @Query(value = "UPDATE products SET stock = stock - :qty WHERE id = :id", nativeQuery = true)
    int decrementStock(@Param("id") Long id, @Param("qty") int qty);
}
```

Dekho: [[03-Spring-Data-Repositories]]

---

### Resilience4j

**Kya hai?** Resilience patterns implement karne ke liye library — Circuit Breaker, Retry, Rate Limiter, Bulkhead, TimeLimiter.

```java
@Service
public class InventoryService {

    // Circuit Breaker
    @CircuitBreaker(name = "inventory", fallbackMethod = "defaultInventory")
    // Retry — 3 baar try karo
    @Retry(name = "inventory")
    // Rate Limit — 100 calls per second max
    @RateLimiter(name = "inventory")
    public InventoryStatus checkStock(String productId) {
        return inventoryClient.getStock(productId);
    }

    public InventoryStatus defaultInventory(String productId, Exception ex) {
        return InventoryStatus.unknown();  // fallback
    }
}
```

Dekho: [[02-Resilience4j-Circuit-Breakers]]

---

### REST Controller

**Kya hai?** HTTP endpoints handle karne wala Spring class. `@RestController` = `@Controller` + `@ResponseBody` — sab methods automatically JSON/XML return karte hain.

```java
@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {

    private final OrderService orderService;

    // Constructor injection
    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping("/{id}")
    public ResponseEntity<OrderDto> getOrder(@PathVariable Long id) {
        OrderDto order = orderService.findById(id);
        return ResponseEntity.ok(order);
    }

    @PostMapping
    public ResponseEntity<OrderDto> createOrder(
            @Valid @RequestBody CreateOrderRequest req,
            UriComponentsBuilder ucb) {
        OrderDto created = orderService.createOrder(req);
        URI location = ucb.path("/api/v1/orders/{id}").buildAndExpand(created.id()).toUri();
        return ResponseEntity.created(location).body(created);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteOrder(@PathVariable Long id) {
        orderService.deleteOrder(id);
    }
}
```

Dekho: [[01-REST-Controllers]]

---

### RestClient

**Kya hai?** Spring 6.1 mein aya modern synchronous HTTP client — WebClient ka fluent API, blocking behavior ke saath.

```java
@Service
public class PaymentApiClient {
    private final RestClient restClient;

    public PaymentApiClient(RestClient.Builder builder) {
        this.restClient = builder
            .baseUrl("https://api.razorpay.com")
            .defaultHeader("Authorization", "Basic " + credentials)
            .build();
    }

    public PaymentResponse createPayment(PaymentRequest req) {
        return restClient.post()
            .uri("/v1/payments")
            .body(req)
            .retrieve()
            .onStatus(status -> status.is4xxClientError(),
                (request, response) -> { throw new PaymentClientException(response); })
            .body(PaymentResponse.class);
    }
}
```

Dekho: [[10-WebClient-and-RestClient]]

---

## S

### SDKMAN!

**Kya hai?** JDK aur other JVM tools ke versions manage karne ka tool. Multiple Java versions parallel mein install rakho, project ke hisaab se switch karo.

```bash
# Install SDKMAN
curl -s "https://get.sdkman.io" | bash

# Java 21 install karo
sdk install java 21.0.2-tem

# Project-specific version (.sdkmanrc file)
sdk env init  # .sdkmanrc banata hai
```

Dekho: [[05-Common-CLI-Tools]]

---

### SLF4J — Simple Logging Facade for Java

**Kya hai?** Logging ke liye API/facade. Directly Logback ya Log4j use mat karo — SLF4J ke through karo. Bina code change ke underlying implementation swap kar sakte ho.

```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

// Ya Lombok @Slf4j annotation se

private static final Logger log = LoggerFactory.getLogger(MyClass.class);

// Structured logging — string concatenation mat karo (expensive if debug level off hai)
log.info("Order placed: orderId={}, amount={}", order.getId(), order.getAmount());
// NOT: log.info("Order placed: " + order.getId() + " amount: " + order.getAmount());
```

Dekho: [[03-Logging-Best-Practices]]

---

### Spring Boot

Convention-over-configuration framework jo Spring Framework ke upar banaya gaya hai. Auto-configuration, embedded server, starter dependencies — production-ready apps jaldi banana ke liye.

Dekho: [[02-Spring-Boot-Auto-Configuration]]

---

### Spring Cloud

**Kya hai?** Microservices infrastructure ke liye tools ka collection — Config Server (centralized configuration), Gateway (API gateway), OpenFeign (HTTP client), LoadBalancer, Circuit Breaker integration.

Dekho: [[04-MOC-Microservices]]

---

### Spring Data JPA

JPA ke upar auto-implemented repositories. `JpaRepository` extend karo, method names se queries auto-generate ho jaati hain, `@Query` se custom JPQL.

Dekho: [[03-Spring-Data-Repositories]]

---

### Spring Security

**Kya hai?** Authentication (kaun ho tum?) aur Authorization (tumhe ye karne ki permission hai?) ke liye comprehensive framework.

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)  // REST APIs mein usually off
            .sessionManagement(s -> s.sessionCreationPolicy(STATELESS))  // JWT ke liye
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/restaurants/**").permitAll()
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
```

Dekho: [[01-Spring-Security-Basics]]

---

### Starter

**Kya hai?** `spring-boot-starter-*` dependency — ek line mein related dependencies ka curated set pull in karta hai.

```xml
<!-- Sirf ye ek line -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
<!-- Ye automatically laata hai:
     - Spring MVC
     - Embedded Tomcat
     - Jackson (JSON)
     - Spring Core + Context
     - Logging (Logback + SLF4J)
     - Validation
-->
```

Common starters:
- `spring-boot-starter-web` — REST APIs
- `spring-boot-starter-data-jpa` — JPA + Hibernate
- `spring-boot-starter-security` — Spring Security
- `spring-boot-starter-test` — JUnit 5, Mockito, AssertJ
- `spring-boot-starter-actuator` — production endpoints
- `spring-boot-starter-cache` — caching abstraction

Dekho: [[05-Starters-Explained]]

---

### Stereotype Annotation

`@Component`, `@Service`, `@Repository`, `@Controller` — ye sab "stereotype annotations" hain. Spring ko batate hain: "is class ka bean banao." Semantic meaning alag hai — tests mein, documentation mein, aur kuch extra Spring behavior ke liye.

Dekho: [[03-Component-Scanning]]

---

### Stream (Java)

**Kya hai?** Collections pe functional-style operations — filter, map, reduce, collect. Node.js array methods jaisa.

```java
// Node.js:
// orders.filter(o => o.status === 'PLACED').map(o => o.total).reduce((a, b) => a + b, 0)

// Java Streams:
BigDecimal totalRevenue = orders.stream()
    .filter(o -> o.getStatus() == OrderStatus.PLACED)
    .map(Order::getTotal)
    .reduce(BigDecimal.ZERO, BigDecimal::add);

// Grouping
Map<OrderStatus, List<Order>> ordersByStatus = orders.stream()
    .collect(Collectors.groupingBy(Order::getStatus));

// Parallel processing (be careful!)
long premiumOrderCount = orders.parallelStream()
    .filter(o -> o.getTotal().compareTo(new BigDecimal("1000")) > 0)
    .count();
```

> [!warning] Parallel streams ka gotcha
> `parallelStream()` har jagah use mat karo. Small lists pe overhead zyada hai. Database se pehle hi filter karo — saara data memory mein la ke stream karna anti-pattern hai.

Dekho: [[03-Streams-and-Lambdas]]

---

## T

### Testcontainers

**Kya hai?** Tests mein real Docker containers use karo — H2 in-memory DB nahi, actual PostgreSQL. Integration tests zyada reliable ho jaate hain.

```java
@SpringBootTest
@Testcontainers
class OrderRepositoryTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16")
        .withDatabaseName("testdb")
        .withUsername("test")
        .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private OrderRepository orderRepository;

    @Test
    void shouldSaveAndRetrieveOrder() {
        Order order = new Order("Pizza", OrderStatus.PLACED);
        Order saved = orderRepository.save(order);
        assertThat(saved.getId()).isNotNull();
        assertThat(orderRepository.findById(saved.getId())).isPresent();
    }
}
```

Dekho: [[05-Testcontainers]]

---

### Transaction

**Kya hai?** Ek atomic unit of work — ya sab kuch succeed ho, ya sab rollback ho. Zomato order: stock decrement karo, payment charge karo, order create karo — teen alag DB operations. Ek bhi fail hua toh sab undo.

```java
@Service
@Transactional  // Class level — sab methods transactional
public class OrderService {

    @Transactional  // Method level — specific config
    public Order placeOrder(CreateOrderRequest req) {
        // Ye sab ek transaction mein
        inventoryService.decrementStock(req.getItemId(), req.getQuantity());
        Payment payment = paymentService.charge(req.getPaymentToken(), req.getTotal());
        Order order = orderRepository.save(new Order(req, payment.getId()));
        notificationService.sendConfirmation(order);  // agar ye fail ho toh sab rollback
        return order;
    }

    @Transactional(readOnly = true)  // Read-only — performance optimization
    public List<Order> getOrderHistory(Long userId) {
        return orderRepository.findByUserId(userId);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)  // Naya transaction
    public void logAuditEvent(AuditEvent event) {
        // Outer transaction rollback ho toh bhi ye commit ho
        auditRepository.save(event);
    }
}
```

> [!warning] Gotcha
> `@Transactional` sirf public methods pe kaam karta hai (proxy limitation). Same class ke andar method call transaction nahi start karega — seedha method call hoga. Agar zarurat hai, service ko doosri service mein inject karo.

Dekho: [[05-Transactions]]

---

### TraceId / SpanId

**Kya hai?** Distributed tracing mein:
- **TraceId** — ek user request ka unique ID jo poore system mein ek hi rahta hai (sab microservices mein)
- **SpanId** — har individual operation ka ID (ek HTTP call, ek DB query)

```
User Request → TraceId: abc123
  Order Service  → SpanId: span001
    DB Query     → SpanId: span002 (parent: span001)
  Payment Service → SpanId: span003 (parent: span001)
    External API  → SpanId: span004 (parent: span003)
```

Spring Boot Actuator + Micrometer Tracing automatically TraceId MDC mein daalta hai.

Dekho: [[04-Distributed-Tracing]]

---

### Twelve-Factor App

**Kya hai?** Cloud-native apps banane ke liye 12 principles. Key ones:
1. **Config** — environment variables mein, code mein nahi
2. **Backing services** — DB, cache ko attached resources treat karo
3. **Dev/prod parity** — environments similar rakho
4. **Logs** — stdout pe stream karo, files mein nahi
5. **Processes** — stateless rakho, state external store mein

Dekho: [[07-Twelve-Factor-Spring]]

---

## U

### Unchecked Exception

**Kya hai?** `RuntimeException` ya uski subclass — compiler enforce nahi karta handle karna. Spring Boot mein ye prefer kiya jaata hai.

```java
// Custom unchecked exception
public class OrderNotFoundException extends RuntimeException {
    private final Long orderId;

    public OrderNotFoundException(Long orderId) {
        super("Order not found: " + orderId);
        this.orderId = orderId;
    }

    public Long getOrderId() { return orderId; }
}

// Use karo — caller ko try-catch nahi karna
public Order findOrder(Long id) {
    return orderRepository.findById(id)
        .orElseThrow(() -> new OrderNotFoundException(id));
}
```

Dekho: [[02-Checked-vs-Unchecked]]

---

## V

### var — Local Variable Type Inference

**Kya hai?** JDK 10 se available. Local variables ke liye type explicitly likhne ki zaroorat nahi — compiler infer karta hai.

```java
// Pehle
Map<String, List<OrderDto>> ordersByRestaurant = new HashMap<>();
List<OrderDto> orders = orderRepository.findAll().stream()
    .map(mapper::toDto)
    .toList();

// var ke saath
var ordersByRestaurant = new HashMap<String, List<OrderDto>>();
var orders = orderRepository.findAll().stream()
    .map(mapper::toDto)
    .toList();
```

> [!info] Sirf local variables pe
> `var` method parameters, return types, ya fields pe use nahi ho sakta — sirf local variables pe.

Dekho: [[05-var-and-Local-Type-Inference]]

---

### Virtual Thread

**Kya hai?** JDK 21 ka game changer. Traditional threads OS threads hote hain — expensive, limited (typically thousands). Virtual threads JVM-managed lightweight threads hain — millions create kar sakte ho, blocking calls cheap hain.

```java
// Spring Boot 3.2+ mein enable karo
@Bean
public TomcatProtocolHandlerCustomizer<?> protocolHandlerVirtualThreadExecutorCustomizer() {
    return protocolHandler ->
        protocolHandler.setExecutor(Executors.newVirtualThreadPerTaskExecutor());
}

// Ya application.yml mein (Spring Boot 3.2+)
spring:
  threads:
    virtual:
      enabled: true
```

Node.js ka event loop non-blocking ke liye hai — Virtual threads Java mein same throughput blocking code se achieve karte hain.

Dekho: [[05-Virtual-Threads]]

---

## W

### WebClient

**Kya hai?** Spring WebFlux ka reactive HTTP client. Non-blocking, `Mono`/`Flux` return karta hai. Zyada complex hai RestClient se — sirf reactive apps mein zaroorat hai.

```java
WebClient client = WebClient.builder()
    .baseUrl("https://api.example.com")
    .build();

Mono<OrderDto> order = client.get()
    .uri("/orders/{id}", orderId)
    .retrieve()
    .bodyToMono(OrderDto.class);

// Subscribe karo ya .block() (blocking context mein)
order.subscribe(dto -> process(dto));
```

Dekho: [[10-WebClient-and-RestClient]]

---

### WebFlux

Spring ka reactive web framework — traditional Spring MVC ka alternative. Non-blocking I/O, `Mono`/`Flux` reactive types. Virtual threads ke aane ke baad WebFlux ki zaroorat kam ho gayi hai most use cases mein.

---

### WireMock

**Kya hai?** Tests mein external HTTP services stub karo. Real Razorpay API hit nahi karna test mein — WireMock ek fake server start karta hai jo predefined responses return karta hai.

```java
@SpringBootTest(webEnvironment = RANDOM_PORT)
@AutoConfigureWireMock(port = 0)  // random port pe WireMock start karo
class PaymentIntegrationTest {

    @Test
    void shouldHandlePaymentSuccess() {
        // WireMock stub
        stubFor(post(urlEqualTo("/v1/payments/charge"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("""
                    {"paymentId": "pay_123", "status": "SUCCESS"}
                """)));

        // Test run karo — real API hit nahi hogi
        PaymentResult result = paymentService.charge(new ChargeRequest("token", 250));
        assertThat(result.getStatus()).isEqualTo("SUCCESS");
    }
}
```

---

## Y

### YAML — Yet Another Markup Language

**Kya hai?** `application.properties` ka alternative — hierarchical config likhne mein zyada readable.

```yaml
# application.yml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/mydb
    username: ${DB_USER}          # environment variable
    password: ${DB_PASS}
    hikari:
      maximum-pool-size: 20

  jpa:
    hibernate:
      ddl-auto: validate          # prod mein never create/update!
    show-sql: false

  kafka:
    bootstrap-servers: ${KAFKA_BROKERS:localhost:9092}  # default value
    consumer:
      group-id: order-service
```

> [!warning] YAML indentation gotcha
> YAML tabs accept nahi karta — sirf spaces use karo. Galat indentation cryptic errors deta hai.

Dekho: [[03-Application-Properties-and-YAML]]

---

## Key Takeaways

- **IoC/DI** — Framework objects manage karta hai, tum nahi. Constructor injection prefer karo.
- **Bean** — Spring managed object. `@Component`/`@Service`/`@Repository`/`@Bean` se banate hain.
- **Auto-configuration** — Spring Boot "magic" hai jo classpath dekh ke automatically configure karta hai.
- **N+1 Problem** — JPA ka sabse common pitfall. `JOIN FETCH` ya `@EntityGraph` se fix karo. SQL logging enable rakho dev mein.
- **@Transactional** — Sirf public methods pe, proxy ke through call pe kaam karta hai. Self-invocation avoid karo.
- **DTO vs Entity** — Entity kabhi directly expose mat karo. DTO banao API ke liye.
- **Fat JAR** — Self-contained deployment unit. `java -jar` se run karo.
- **Profiles** — Environment-specific config ke liye. Secrets environment variables mein rakho, hardcode mat karo.
- **Actuator** — Production mein health/metrics expose karo, lekin carefully — `/actuator/env` sensitive hai.
- **Virtual Threads** (JDK 21+) — Blocking code ke saath Node.js jaisi concurrency. Enable karo Spring Boot 3.2+ mein.

---

## Related
- [[00-README]]
- [[06-FAQ-for-Express-Devs]]
- [[01-Library-Cheatsheet]]
- [[02-MOC-Java-Fundamentals]]
- [[03-MOC-Spring]]
