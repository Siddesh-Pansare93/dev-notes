# Spring Boot Learning Path — 8 Hafte Ka Plan

Socho ek second ke liye. Agar Zomato ka backend crash ho jaye peak dinner time pe, toh kya hoga? Orders queue mein atke rahenge, delivery partners confused honge, aur founder ka phone bajta rahega. Yahi wajah hai ki Zomato, Swiggy, CRED, PhonePe — ye sab companies apne critical systems ke liye Java aur Spring Boot use karti hain. Node.js mast hai side projects aur fast prototypes ke liye, lekin jab baat aati hai enterprise-grade, high-traffic, fault-tolerant systems ki — Java ki duniya hi alag hai.

Tu Node.js aur TypeScript se aa raha hai — yeh actually ek advantage hai. Tu already samajhta hai REST APIs, async patterns, middleware, aur deployment pipelines. Spring Boot sirf ek naya framework hai, ek naya toolchain hai — fundamentals wahi hain jo tu pehle se jaanta hai.

Yeh 8-week plan tera roadmap hai. Iske baad tu kisi bhi Spring Boot codebase mein ghus sakta hai bina panic ke — controllers likhega, JPA entities banayega, security configure karega, tests likhega, aur Kubernetes pe deploy karega.

> [!info] Kitna time chahiye?
> Roughly 10 focused hours per week. Weekend pe 6-7 ghante ka deep dive, aur weekdays pe 30-45 minute ka consistent revision. Yeh "aggressive but achievable" plan hai — agar tu serious hai toh 8 hafte mein production-ready ban sakta hai.

> [!tip] Reading order
> Har week top-to-bottom padh. Checkbox tick karta ja. **Exercises skip mat karna** — Java ek muscle hai, sirf padh ke nahi seekha jaata. Jaise gym mein without reps biceps nahi banta, waise bina code likhe Spring Boot nahi aata.

---

## Week 1 — Java Fundamentals aur Toolchain

**Goal**: Koi bhi Java code padhke panic na aaye. Working JDK aur IDE ready ho.

### Kyun zaroori hai yeh week?

Node.js mein tu directly `npm init` karta aur code likhne lagta. Java mein pehle kuch "infrastructure" samajhni padti hai — JDK kya hai, JVM kya karta hai, IDE kyun important hai. Yeh boring lagta hai, par bina iske Week 2 ka kuch samajh nahi aayega.

Ek analogy socho: Swiggy ka delivery partner bina city ka map jaane kaise deliver karega? JVM, JDK, classpath — ye sab tera city map hai Java ki duniya mein.

### Is week mein kya padhna hai:

- [ ] [[06-FAQ-for-Express-Devs]] — pehle yeh padh, 15 minute mein orient ho ja
- [ ] [[05-Common-CLI-Tools]] — `sdkman` install kar, JDK 21 le, `jshell` khel
- [ ] [[06-IDE-Setup]] — IntelliJ Community edition install kar, Lombok plugin enable kar
- [ ] [[01-JDK-JRE-JVM-Basics]] — JVM kya hai, bytecode kya hai, sab clear ho jayega
- [ ] [[02-Classes-and-Objects]] — Java ke classes TypeScript interfaces se kaise alag hain
- [ ] [[03-Primitives-vs-Reference-Types]] — `int` vs `Integer` wala confusion hamesha ke liye khatam
- [ ] [[04-Generics]] — `List<String>` aur `Map<K,V>` samajhna zaroori hai
- [ ] [[01-Java-vs-TypeScript-Quick-Map]] — ek table jo tera Node.js knowledge Java se map karega

### Is week ka exercise:

`jshell` khole aur yeh sab kar:

```java
// jshell mein type kar, ek ek karke
record Point(int x, int y) {}   // TypeScript ke { x: number; y: number } jaisa hai

// List banao
var points = List.of(
    new Point(1, 2),
    new Point(3, 4),
    new Point(5, 6),
    new Point(2, 8)
);

// Stream se filter karo (array.filter() + array.map() jaisa)
points.stream()
    .filter(p -> p.x() > 2)         // sirf woh points jahan x > 2
    .map(p -> p.x() + p.y())        // x + y sum nikalo
    .forEach(System.out::println);   // console.log() jaisa

// Output: 7, 11, 10
```

> [!tip] jshell ka fayda
> REPL hai Java ke liye — bilkul Node.js mein `node` command se REPL jaise. Koi bhi concept jaldi test kar sakta hai bina poora project banaye.

### Node.js se comparison:

| Node.js/TypeScript | Java |
|---|---|
| `npm init` | `start.spring.io` se project generate |
| `node index.js` | `java -jar app.jar` |
| `ts-node` REPL | `jshell` REPL |
| `interface Point { x: number }` | `record Point(int x, int y) {}` |
| `.filter().map()` | `.stream().filter().map()` |

---

## Week 2 — Collections, Streams, Concurrency

**Goal**: Standard library se comfortable ho. Concurrency basics samajh.

### Kyun zaroori hai yeh week?

Node.js mein concurrency simple tha — event loop, async/await, done. Java mein concurrency alag hai — threads, thread pools, aur agar galat kiya toh race conditions. Spring Boot ke andar jo requests handle hoti hain, woh threads pe chalti hain. Yeh samajhna production mein bugs se bachayega.

Aur collections — Java ka `List`, `Map`, `Set` TypeScript se alag hai. Agar tu `ArrayList` aur `LinkedList` ka fark nahi jaanta, toh Flipkart-scale pe performance problems aayenge.

### Is week mein kya padhna hai:

- [ ] [[05-Collections-Framework]] — `ArrayList`, `HashMap`, `LinkedHashMap`, `TreeMap` — sab ka use case
- [ ] [[06-Streams-and-Lambdas]] — functional programming Java mein — `.filter()`, `.map()`, `.collect()`
- [ ] [[07-Optional-and-Null-Safety]] — `NullPointerException` se zindagi barbad nahi hogi agar `Optional` use karo
- [ ] [[08-Exception-Handling]] — checked vs unchecked exceptions — Java ka ek quirk jo beginners ko confuse karta hai
- [ ] [[09-Concurrency-Basics]] — `Thread`, `ExecutorService`, `CompletableFuture` — async Java style
- [ ] [[02-Type-System-Differences]] — Java ka type system TypeScript se kaafi strict hai
- [ ] [[03-Async-Patterns-Comparison]] — `Promise` vs `CompletableFuture` side by side

### Is week ka exercise:

Ek CLI program banao (koi Spring nahi — pure Java):

```java
// Kaam kya karna hai:
// 1. Ek CSV file padho (orders.csv jaise — orderId, userId, amount, category)
// 2. Category ke hisaab se group karo
// 3. Har category ka total amount nikalo
// 4. Result ko JSON file mein likho

import java.nio.file.*;
import java.util.*;
import java.util.stream.*;

public class OrderSummary {
    record Order(String id, String userId, double amount, String category) {}

    public static void main(String[] args) throws Exception {
        // CSV padho
        List<Order> orders = Files.lines(Path.of("orders.csv"))
            .skip(1) // header skip
            .map(line -> line.split(","))
            .map(parts -> new Order(parts[0], parts[1],
                                    Double.parseDouble(parts[2]), parts[3]))
            .toList();

        // Category ke hisaab se group karo aur total nikalo
        Map<String, Double> summary = orders.stream()
            .collect(Collectors.groupingBy(
                Order::category,
                Collectors.summingDouble(Order::amount)
            ));

        // JSON banao (simple string formatting — Jackson baad mein aayega)
        String json = summary.entrySet().stream()
            .map(e -> "  \"" + e.getKey() + "\": " + e.getValue())
            .collect(Collectors.joining(",\n", "{\n", "\n}"));

        Files.writeString(Path.of("summary.json"), json);
        System.out.println("Done! Check summary.json");
    }
}
```

`java -jar` se chalaao — koi Spring Boot nahi, koi auto-magic nahi, sirf raw Java. Yeh samajhna zaroori hai before Spring ke "magic" pe depend karo.

> [!warning] Common Gotcha
> `NullPointerException` Java ka sabse famous error hai. Node.js mein `undefined` bhi silently propagate karta rehta hai — Java mein woh crash kar dega. `Optional<T>` use karo jab koi value absent ho sakti hai. Yeh TypeScript ke `T | null` jaisa hai, par compiler enforce karta hai.

---

## Week 3 — Build Tools aur Spring Core

**Goal**: Maven/Gradle samajh. IoC/DI ka concept clear ho.

### Kyun zaroori hai yeh week?

Node.js mein `package.json` tha — simple. Java mein Maven ya Gradle hai — zyada powerful, zyada complex. Yeh "build tools" sirf dependencies manage nahi karte — compilation, testing, packaging, deployment — sab handle karte hain.

Aur Spring ka heart — **IoC (Inversion of Control)** aur **Dependency Injection** — yeh samajhe bina Spring ka code likho toh copy-paste karoge without understanding. Jaise Ola driver GPS ke baare mein kuch nahi jaanta — sirf follow karta hai. Toh journey complete hoti hai, par kuch galatfehmi ho toh woh samajh nahi payega.

### Is week mein kya padhna hai:

- [ ] [[01-Maven-Basics]] — `pom.xml` kya hai, `mvn install`, `mvn test`, `mvn package`
- [ ] [[02-Gradle-Basics]] — `build.gradle`, `./gradlew bootRun`
- [ ] [[03-Project-Layout]] — `src/main/java`, `src/test/java`, `src/main/resources` — structure kyun aisi hai
- [ ] [[01-IoC-DI-Concepts]] — Spring beans kya hain, container kya karta hai
- [ ] [[02-Bean-Lifecycle]] — bean kab banta hai, kab destroy hota hai, lifecycle hooks
- [ ] [[03-Component-Scanning]] — `@Component`, `@Service`, `@Repository` — Spring inhe khud dhundhta hai
- [ ] [[04-Configuration-Classes]] — `@Configuration` aur `@Bean` — manual wiring kab karti hai

### Spring IoC — Express se comparison:

Node.js mein tu classes manually instantiate karta tha:

```typescript
// Node.js mein — tujhe khud manage karna padta tha
const db = new Database(config.dbUrl);
const userRepo = new UserRepository(db);
const userService = new UserService(userRepo);
const userController = new UserController(userService);
app.use('/users', userController.router);
```

Spring mein yeh Spring ka kaam hai:

```java
// Spring mein — tu sirf declare kar, Spring khud inject karega
@Repository
public class UserRepository { /* ... */ }

@Service
public class UserService {
    private final UserRepository userRepository;

    // Spring khud UserRepository inject karega yahan
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
}

@RestController
public class UserController {
    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }
}
```

Spring ka "container" ek smart factory hai — woh jaanta hai kaunse beans hain, unki dependencies kya hain, aur sabko sahi order mein wire karta hai. Tu bas annotations lagata hai.

### Is week ka exercise:

[start.spring.io](https://start.spring.io) pe jaa:
- Project: Maven
- Language: Java
- Spring Boot: latest stable
- Dependencies: Spring Web, Lombok

Project download kar, IntelliJ mein khol, aur yeh controller banao:

```java
@RestController
public class HelloController {

    @GetMapping("/hello")
    public String hello() {
        return "Namaste, Spring Boot!";
    }

    @GetMapping("/hello/{name}")
    public String helloName(@PathVariable String name) {
        return "Namaste, " + name + "!";
    }
}
```

`./mvnw spring-boot:run` ya `./gradlew bootRun` se chalaao. Browser mein `http://localhost:8080/hello` kholo. Yeh dikhna chahiye.

> [!tip] start.spring.io — tera best friend
> IntelliJ IDEA Community mein bhi yeh directly available hai via File > New > Spring Initializr. Har baar nayi project ke liye manually setup mat karo.

---

## Week 4 — Spring Boot Core aur Web Layer

**Goal**: Real REST API banao with validation aur proper error handling.

### Kyun zaroori hai yeh week?

Ab tak Java fundamentals aur Spring concepts clear ho gaye. Ab asli kaam — REST API banana. Yeh woh week hai jab tujhe pehla "aha!" moment aayega. Spring Boot ka magic dekhega — kitna kam code likhke itna powerful API ban jaata hai.

Express mein tu manually middleware chain karta tha, manually JSON parse karta tha, manually validation likhta tha. Spring Boot yeh sab already handle karta hai — tujhe sirf business logic pe focus karna hai.

### Is week mein kya padhna hai:

- [ ] [[01-Spring-Boot-Project-Layout]] — `src` structure, `application.properties` kahan hai, sab explain hoga
- [ ] [[02-Spring-Boot-Auto-Configuration]] — yeh Spring Boot ka superpower hai — auto-magic kaise kaam karta hai
- [ ] [[03-Application-Properties-and-YAML]] — config files — `application.yml` vs `application.properties`
- [ ] [[04-Configuration-Properties]] — `@ConfigurationProperties` — type-safe config binding
- [ ] [[06-Profiles-Per-Environment]] — dev/staging/prod alag configs — `.env` files jaisa lekin better
- [ ] [[01-REST-Controllers]] — `@RestController`, `@GetMapping`, `@PostMapping`, etc.
- [ ] [[02-Request-Mapping-and-Path-Variables]] — `@PathVariable`, `@RequestParam`, `@RequestBody`
- [ ] [[03-DTOs-and-Serialization]] — request/response objects — TypeScript interfaces ki tarah
- [ ] [[04-Bean-Validation]] — `@NotBlank`, `@Size`, `@Email` — input validation built-in
- [ ] [[05-Exception-Handlers-and-ProblemDetail]] — `@RestControllerAdvice` — global error handling

### Express vs Spring Boot — Error Handling:

Express mein:
```typescript
// Express error middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    res.status(500).json({ error: err.message });
});
```

Spring Boot mein:
```java
// Ek class, sab controllers ke liye error handling
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(OrderNotFoundException.class)
    public ProblemDetail handleOrderNotFound(OrderNotFoundException ex) {
        // ProblemDetail = RFC 9457 standard error format
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(
            HttpStatus.NOT_FOUND,
            ex.getMessage()
        );
        detail.setTitle("Order Not Found");
        return detail;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidationErrors(MethodArgumentNotValidException ex) {
        ProblemDetail detail = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        detail.setTitle("Validation Failed");
        // Har field ki error detail add karo
        detail.setProperty("errors",
            ex.getFieldErrors().stream()
                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                .toList()
        );
        return detail;
    }
}
```

### Is week ka exercise — Todo REST API:

```java
// TodoRequest.java — incoming data ka DTO
public record TodoRequest(
    @NotBlank(message = "Title khali nahi ho sakta")
    @Size(max = 100, message = "Title 100 characters se zyada nahi")
    String title,

    String description,

    @NotNull
    Priority priority
) {}

// TodoResponse.java — outgoing data ka DTO
public record TodoResponse(
    Long id,
    String title,
    String description,
    Priority priority,
    boolean completed,
    LocalDateTime createdAt
) {}

// TodoController.java
@RestController
@RequestMapping("/api/todos")
@Validated
public class TodoController {

    private final TodoService todoService;

    public TodoController(TodoService todoService) {
        this.todoService = todoService;
    }

    @GetMapping
    public List<TodoResponse> getAllTodos() {
        return todoService.findAll();
    }

    @GetMapping("/{id}")
    public TodoResponse getTodo(@PathVariable Long id) {
        return todoService.findById(id)
            .orElseThrow(() -> new TodoNotFoundException(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TodoResponse createTodo(@Valid @RequestBody TodoRequest request) {
        return todoService.create(request);
    }

    @PutMapping("/{id}")
    public TodoResponse updateTodo(
        @PathVariable Long id,
        @Valid @RequestBody TodoRequest request
    ) {
        return todoService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTodo(@PathVariable Long id) {
        todoService.delete(id);
    }
}
```

> [!warning] Beginner Gotcha — `@Valid` mat bhoolo
> `@RequestBody TodoRequest request` likha lekin `@Valid` nahi lagaya? Toh validation annotations (`@NotBlank`, etc.) kabhi fire nahi honge. Yeh ek classic mistake hai jo ghante waste karti hai debugging mein.

---

## Week 5 — JPA aur Persistence

**Goal**: `HashMap` mein data store karna band karo. Postgres pe persist karo.

### Kyun zaroori hai yeh week?

Abtak tera Todo API in-memory hai — server restart hoga toh sab data gayab. Real apps mein — Swiggy ki orders, IRCTC ki bookings, PhonePe ke transactions — sab database mein store hote hain. JPA (Java Persistence API) aur Hibernate tumhara Java code aur database ke beech bridge hai.

TypeScript mein shayad tu Prisma ya TypeORM use karta tha. Spring Boot mein Spring Data JPA + Hibernate use hota hai — similar concept, alag implementation.

### Is week mein kya padhna hai:

- [ ] [[01-JPA-Hibernate-Basics]] — ORM kya hai, JPA standard hai vs Hibernate implementation
- [ ] [[02-Entity-Basics]] — `@Entity`, `@Id`, `@Column` — table ko class se map karo
- [ ] [[03-Spring-Data-Repositories]] — `JpaRepository` — CRUD operations free mein milte hain
- [ ] [[04-Query-Methods-and-JPQL]] — `findByTitleContaining()` jaisi magical methods
- [ ] [[05-Transactions]] — `@Transactional` — ACID properties ensure karo
- [ ] [[06-Relationships-and-Lazy-Loading]] — `@OneToMany`, `@ManyToOne` — tables join karo
- [ ] [[07-N-Plus-1-and-Fetch-Strategies]] — **sabse common performance bug** — samajhna critical hai
- [ ] [[08-Migrations-Flyway-Liquibase]] — database schema version control
- [ ] [[03-MapStruct]] — Entity aur DTO ke beech boring mapping automate karo

### N+1 Problem — Ek Real Gotcha:

Yeh JPA ka sabse dangerous trap hai. Socho Zomato ke restaurants aur unke menus:

```java
// GALAT — N+1 problem
// Pehle query: SELECT * FROM restaurants (10 restaurants milte hain)
List<Restaurant> restaurants = restaurantRepository.findAll();

// Ab har restaurant ke liye ek alag query
for (Restaurant r : restaurants) {
    // SELECT * FROM menu_items WHERE restaurant_id = ?
    // Yeh 10 baar alag alag chalta hai!
    System.out.println(r.getMenuItems().size());
}
// Total: 1 + 10 = 11 queries! Yeh IRCTC wala slowness hai.

// SAHI — JOIN FETCH use karo
@Query("SELECT r FROM Restaurant r JOIN FETCH r.menuItems")
List<Restaurant> findAllWithMenuItems();
// Total: 1 query. Problem solved.
```

> [!warning] N+1 is silent
> Yeh bug development mein dikhta nahi — tere paas 5 restaurants hain toh 6 queries chalti hain, koi notice nahi karta. Production mein 50,000 restaurants hain toh 50,001 queries — server crash. Spring Boot Actuator aur Hibernate statistics enable kar development mein hi.

### Is week ka exercise:

```java
// User.java entity
@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String name;

    // Ek user ke multiple todos ho sakte hain
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Todo> todos = new ArrayList<>();

    // getters, setters (ya Lombok @Getter @Setter)
}

// Todo.java entity
@Entity
@Table(name = "todos")
public class Todo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    private boolean completed = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;
}
```

Docker se Postgres chalaao (machine pe install karne ki zaroorat nahi):

```bash
docker run -d \
  --name todo-postgres \
  -e POSTGRES_DB=tododb \
  -e POSTGRES_USER=todouser \
  -e POSTGRES_PASSWORD=secret \
  -p 5432:5432 \
  postgres:15
```

Flyway migration script banao:

```sql
-- src/main/resources/db/migration/V1__create_users_todos.sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE todos (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT FALSE,
    priority VARCHAR(20) NOT NULL,
    user_id BIGINT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Week 6 — Security aur Testing

**Goal**: Real auth lagao. Trustworthy tests likho.

### Kyun zaroori hai yeh week?

Bina security ke tu pizza delivery karo bina address check kiye — koi bhi order kar sakta hai kisi ke bhi naam pe. Aur bina tests ke code likhna? Woh aise hai jaise IRCTC ka booking system bina test kiye launch kar diya — aur phir peak hour mein crash.

Spring Security pehli baar scary lagta hai — bohot configuration, annotations har jagah. Par ek baar samajh gaya toh bohot powerful hai.

### Is week mein kya padhna hai:

- [ ] [[01-Spring-Security-Basics]] — Security filter chain kya hai, kaise kaam karta hai
- [ ] [[02-Authentication-vs-Authorization]] — "kaun hai" vs "kya kar sakta hai" — simple hai, par confuse mat hona
- [ ] [[03-Password-Encoding]] — plaintext password kabhi mat store karo — `BCryptPasswordEncoder`
- [ ] [[04-JWT-with-Spring-Security]] — stateless auth — mobile apps ke liye best
- [ ] [[05-OAuth2-OIDC-with-Spring]] — Google/GitHub se login — "Sign in with Google" waala feature
- [ ] [[06-Method-Level-Security]] — `@PreAuthorize("hasRole('ADMIN')")` — method level pe access control
- [ ] [[01-Testing-Strategy]] — kya test karna hai, kya nahi — strategy pehle
- [ ] [[02-JUnit-5-Basics]] — Java ka testing framework — Mocha/Jest ka Indian cousin
- [ ] [[03-Mockito-and-AssertJ]] — mocking framework — Jest mock jaisa
- [ ] [[04-Spring-Boot-Test-Slices]] — `@WebMvcTest`, `@DataJpaTest` — sirf relevant layer test karo
- [ ] [[05-Testcontainers]] — actual Docker containers tests mein — real Postgres se test karo

### JWT Security — Express se comparison:

Express mein tu manually middleware likhta tha:

```typescript
// Express JWT middleware
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token missing' });
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch {
        res.status(401).json({ error: 'Invalid token' });
    }
};
```

Spring Boot mein:

```java
// Security configuration
@Configuration
@EnableWebSecurity
@EnableMethodSecurity  // @PreAuthorize ke liye
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())  // JWT use kar rahe hain, CSRF nahi chahiye
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()  // login/register open hai
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()  // baaki sab ke liye auth chahiye
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();  // kabhi MD5 ya SHA-1 mat use karna!
    }
}

// Method level security
@Service
public class TodoService {

    @PreAuthorize("@todoSecurity.isOwner(#id, authentication.name)")
    public void deleteTodo(Long id) {
        // Sirf todo ka owner delete kar sakta hai
        todoRepository.deleteById(id);
    }
}
```

### Testing — Testcontainers ka magic:

```java
// Real Postgres se test — H2 in-memory database se nahi
@SpringBootTest
@Testcontainers
class TodoRepositoryTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15")
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
    TodoRepository todoRepository;

    @Test
    void shouldSaveAndRetrieveTodo() {
        var todo = new Todo("Swiggy se order karo", false);
        var saved = todoRepository.save(todo);

        assertThat(saved.getId()).isNotNull();
        assertThat(todoRepository.findById(saved.getId())).isPresent();
    }
}
```

> [!tip] H2 se door raho production tests mein
> H2 in-memory database fast hai, par behavior Postgres se alag hai — especially JSON queries, array operations, aur some SQL syntax. Testcontainers use karo — real database, real behavior.

---

## Week 7 — Observability aur Deployment

**Goal**: Production-ready bano. Containers, logs, metrics, traces, Kubernetes.

### Kyun zaroori hai yeh week?

Tera app local pe chal raha hai — badiya. Ab isko production pe daalo jahan lakhs of users hit karenge. Kya hoga agar koi slow ho jaye? Kaise pata chalega? Kaise fix karoge? Yahi observability hai — logs, metrics, traces — teri production mein aankhein.

Aur Docker + Kubernetes — aaj ke enterprise mein yeh must-know hai. CRED, Razorpay, Zomato — sab k8s pe hain.

### Is week mein kya padhna hai:

- [ ] [[01-Spring-Boot-Actuator]] — built-in health endpoints, info, metrics — `http://localhost:8080/actuator`
- [ ] [[02-Micrometer-Metrics]] — Prometheus ke saath integrate karo — custom metrics banao
- [ ] [[03-Logging-Best-Practices]] — structured JSON logging — `console.log` se better
- [ ] [[04-Distributed-Tracing]] — ek request kitne services se guzri — trace ID se dekho
- [ ] [[05-Health-Checks-and-Readiness]] — k8s ko kaise pata chalega app ready hai
- [ ] [[01-Packaging-Fat-JAR]] — `./mvnw package` — ek JAR file, sab included
- [ ] [[02-Docker-for-Spring-Boot]] — multi-stage Dockerfile — optimized image
- [ ] [[08-Kubernetes-From-Scratch]] — **pehle yeh padh agar k8s naya hai**
- [ ] [[04-Kubernetes-Basics]] — Spring Boot ke liye k8s manifests
- [ ] [[05-CI-CD-Pipeline-Example]] — GitHub Actions se auto-deploy
- [ ] [[07-Twelve-Factor-Spring]] — 12-factor app principles Spring Boot mein

### Dockerfile — Spring Boot ke liye:

```dockerfile
# Multi-stage build — image size chhoti rehti hai
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .
# Dependencies pehle download karo (caching ke liye)
RUN ./mvnw dependency:go-offline
COPY src src
RUN ./mvnw package -DskipTests

# Runtime image — sirf JRE chahiye, JDK nahi
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
# Build stage se sirf JAR copy karo
COPY --from=build /app/target/*.jar app.jar
# Non-root user se chalaao (security best practice)
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### Kubernetes Deployment:

```yaml
# todo-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: todo-api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: todo-api
  template:
    metadata:
      labels:
        app: todo-api
    spec:
      containers:
      - name: todo-api
        image: your-registry/todo-api:latest
        ports:
        - containerPort: 8080
        env:
        - name: SPRING_PROFILES_ACTIVE
          value: "prod"
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: todo-secrets
              key: db-password
        # k8s ko batao app ready hai
        readinessProbe:
          httpGet:
            path: /actuator/health/readiness
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        # k8s ko batao app alive hai
        livenessProbe:
          httpGet:
            path: /actuator/health/liveness
            port: 8080
          initialDelaySeconds: 45
          periodSeconds: 15
```

### Is week ka exercise:

1. `kind` ya `minikube` install karo
2. Todo API ko Dockerize karo
3. k8s pe deploy karo with health probes, ConfigMap, Secret
4. Kuch cheez tod do intentionally — phir `kubectl describe pod` aur `kubectl logs` se debug karo
5. GitHub Actions workflow banao — push hone pe auto-build + test + image push

> [!warning] Secrets ko YAML mein mat daalo
> `password: mySecret123` directly k8s YAML mein — yeh galat hai. k8s Secrets use karo, aur better hai ki Vault ya AWS Secrets Manager se fetch karo. Git mein kabhi passwords commit mat karna — IRCTC data breach yaad hai?

---

## Week 8 — Microservices: Spring Cloud + Eureka + Gateway + Feign

**Goal**: Services mein split karo. End-to-end wire karo.

### Kyun zaroori hai yeh week?

Socho Swiggy ka system — restaurants alag service, orders alag, payments alag, delivery tracking alag. Agar sab ek monolith mein hote toh payments system down hone se puri app down. Microservices mein sirf payment service down hoti — baki chal raha rehta.

Yeh week sabse complex hai, sabse important bhi. Enterprise Spring Boot jobs mostly microservices wale hote hain.

### Is week mein kya padhna hai:

- [ ] [[01-What-is-a-Microservice]] — microservice kab banao, kab nahi — yeh decision important hai
- [ ] [[02-Spring-Cloud-Overview]] — Spring Cloud umbrella mein kya kya hai
- [ ] [[03-Service-Discovery-Eureka]] — services ek dusre ko kaise dhundti hain — DNS jaisa, par dynamic
- [ ] [[07-OpenFeign]] — HTTP calls between services — Axios/fetch jaisa, par type-safe
- [ ] [[04-API-Gateway-Spring-Cloud-Gateway]] — public entry point — Nginx jaisa, par programmable
- [ ] [[05-Centralized-Config-Server]] — sab services ka config ek jagah
- [ ] [[06-Inter-Service-Communication]] — sync vs async communication
- [ ] [[08-Resilience4j]] — circuit breakers — ek service fail ho toh cascade failure rokho
- [ ] [[09-Stack-Specific-Eureka-Gateway-Feign-on-K8s]] — yeh sab k8s pe kaise wire karo
- [ ] [[01-Spring-Kafka]] — optional, agar async messaging chahiye
- [ ] [[03-GraalVM-Native-Image]] — skim karo — fast startup, chhoti memory — serverless ke liye

### OpenFeign — Service-to-Service Calls:

Node.js mein tu manually Axios call karta:

```typescript
// Node.js — manual HTTP call
const userResponse = await axios.get(`http://user-service/api/users/${userId}`);
const user = userResponse.data;
```

Spring Boot mein Feign se:

```java
// UserServiceClient.java — ek interface, Feign baki kaam karta hai
@FeignClient(name = "user-service")  // Eureka se service dhundhta hai
public interface UserServiceClient {

    @GetMapping("/api/users/{userId}")
    UserResponse getUserById(@PathVariable Long userId);

    @GetMapping("/api/users/{userId}/exists")
    boolean userExists(@PathVariable Long userId);
}

// OrderService mein use karo
@Service
public class OrderService {

    private final UserServiceClient userServiceClient;

    public OrderResponse createOrder(Long userId, OrderRequest request) {
        // Feign khud HTTP call karta hai — tu interface use karta hai
        if (!userServiceClient.userExists(userId)) {
            throw new UserNotFoundException(userId);
        }
        // ... order create karo
    }
}
```

### Circuit Breaker — Resilience4j:

```java
// Agar user-service down hai, toh order service bhi down na ho
@Service
public class OrderService {

    @CircuitBreaker(name = "user-service", fallbackMethod = "getUserFallback")
    @TimeLimiter(name = "user-service")
    public UserResponse getUser(Long userId) {
        return userServiceClient.getUserById(userId);
    }

    // Fallback — user-service down ho toh yeh run karta hai
    public UserResponse getUserFallback(Long userId, Exception ex) {
        log.warn("User service unavailable, using fallback for userId: {}", userId);
        return new UserResponse(userId, "Unknown User", "unknown@email.com");
    }
}
```

### Is week ka exercise — Full Microservices System:

Todo API ko split karo:

```
eureka-server/          # Service registry (port 8761)
api-gateway/            # Public entry point (port 8080)
users-service/          # User management (port 8081)
  - Apna Postgres
orders-service/         # Todo/Order management (port 8082)
  - Apna Postgres
  - Feign se users-service call karta hai
```

Sab ko local `kind` cluster pe deploy karo. JWT forward karo Feign through. Resilience4j circuit breakers lagao. Verify karo ki trace IDs logs mein sab services mein flow ho rahe hain.

> [!warning] Microservices distributed debugging ka dard
> Node.js monolith mein ek stack trace se bug milta tha. Microservices mein request 4 services se guzri — kahan fail hua? Distributed tracing (Zipkin/Jaeger) aur correlation IDs iske bina tum aandhe ho production mein. Week 7 mein padha tha — ab use karo.

---

## 8 Hafte Ke Baad

Yahan tere liye kuch resources hain jo next level le jayenge:

> [!tip] Keep going — ruk mat
> - **Effective Java** (Joshua Bloch) — Java ka "Clean Code" — 2-3 items per week padh
> - **Java Weekly by Baeldung** — subscribe kar, har week kuch naya milega
> - Apna koi side project lo aur Spring Boot mein rebuild karo
> - **Spring PetClinic Microservices** GitHub pe dekh — polished reference implementation hai
> - [[07-Recommended-Reading]] — deeper specialization ke liye

---

## Progress Track Karo

> [!tip] Har week ek short retro likho
> Weekly ek note likho — kya seekha, kya confusing laga, kya dobaara padhna hai. Graph view mein dekhoge knowledge kaise spread ho raha hai. [[05-Glossary]] use karo terms refresh karne ke liye.

---

## Key Takeaways

- **Spring Boot ek opinionated framework hai** — iska matlab yeh hai ki bahut saari decisions already le li gayi hain tere liye. Express mein sab manually configure karna padta tha; Spring Boot "convention over configuration" follow karta hai.

- **Java ka type system strict hai — yeh feature hai, bug nahi** — TypeScript mein bhi types tha, par Java mein compiler aur runtime dono enforce karte hain. Yeh production bugs rokta hai.

- **IoC/DI pattern samajhna zaroori hai** — Spring ka 80% magic IoC container hai. Ek baar woh clear ho gaya toh baki sab fall into place ho jaata hai.

- **N+1 problem sabse common JPA bug hai** — production mein performance issues ka sबसे bada culprit. JPQL `JOIN FETCH` ya `@EntityGraph` use karo.

- **Security pehle se plan karo** — baad mein "security add karna" bohot mushkil hota hai. Week 6 mein seekha tha — naye projects mein start se lagao.

- **Testcontainers > H2 in-memory** — real database se test karo, surprises production mein nahi aayenge.

- **Distributed tracing non-negotiable hai microservices mein** — bina Zipkin/Jaeger ke microservices debugging andhere mein taatol karna hai.

- **8 hafte ka plan aggressive hai** — koi baat nahi agar ek week mein 2 hafte ka content lagta hai. Speed mat dekho, understanding dekho.

---

## Related

- [[00-README]]
- [[02-MOC-Java-Fundamentals]]
- [[03-MOC-Spring]]
- [[04-MOC-Microservices]]
- [[06-FAQ-for-Express-Devs]]
- [[07-Recommended-Reading]]
