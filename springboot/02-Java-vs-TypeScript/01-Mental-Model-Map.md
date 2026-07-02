# Mental Model Map: TypeScript → Java

> [!info] Yeh note tere liye hai, Node/Express wale bhai
> Tu ek aise developer hai jisne Zomato jaisi apps TypeScript mein banayi hain — `express()`, `app.get()`, `prisma.user.findMany()` — yeh sab tujhe pata hai. Ab Spring Boot seekhne baith raha hai aur laga raha hai "yaar, yeh sab kya bakwaas hai?" Toh yeh note teri **Rosetta Stone** hai. Har concept jo tune Node mein seekha hai, uska Java counterpart yahan milega. Ek baar isko padh le, phir jab bhi koi Java term alien lagey — wapas aa.

---

## Pehle Baat Karte Hain — Yeh Sab Kyun Seekhna Hai?

Socho ek second ke liye. Teri company ek naya backend system bana rahi hai — scalable, enterprise-grade, jisme lakhs of concurrent users honge. HR department bolta hai "Java mein banao," lead developer bolta hai "Spring Boot use karo." Aur tu soch raha hai "bhai, mera Node.js ka system toh perfectly chalata tha, yeh kyun?"

Honestly? Node.js ek sports car hai — fast, nimble, ek hi kaam mein amazing. Java ek freight train hai — heavy, opinionated, zyada code likhna padta hai, lekin 30 saal ki optimization ke baad **predictably runs for years** bina kisi issue ke. Jab IRCTC ka ticket booking system crash karta hai ek second ke liye, lakhs of rupees ka nuksaan hota hai. Aisi jagah pe Java ka reliability matter karta hai.

**Spring Boot basically hai:** Express + NestJS + Prisma + dotenv + PM2 + ek full DI container — sab kuch ek saath, aur sab kuch wired up hone se pehle hi.

Tu zyada code likhega har feature ke liye. Lekin compile time pe zyada bugs pakdega, aur jo system ship karega woh barsoon tak smoothly chalega.

---

## High-Level Concept Map — Ek Nazar Mein

Yeh table teri **cheat sheet** hai. Jab bhi Java mein koi term aaye aur samajh na aaye, yahaan dekh:

| Concept | TypeScript / Node | Java / Spring Boot |
|---|---|---|
| Package manager | `npm` / `pnpm` / `yarn` | `Maven` / `Gradle` |
| Manifest (project file) | `package.json` | `pom.xml` ya `build.gradle(.kts)` |
| Lockfile | `package-lock.json` | `pom.xml` khud hi reproducible hai (versions pinned hoti hain) |
| Registry (packages kahaan se aate hain) | npmjs.com | Maven Central, Gradle Plugin Portal |
| Module system | ESM `import` / CJS `require` | `package` declaration + `import` |
| Runtime | Node.js (V8 engine) | JVM (HotSpot, GraalVM) |
| Entry point | `node dist/index.js` | `public static void main(String[] args)` |
| HTTP framework | Express / Fastify / NestJS | Spring MVC / Spring WebFlux |
| Routing | `app.get('/users', handler)` | `@GetMapping("/users")` on a `@RestController` |
| Middleware | `app.use(fn)` | `Filter`, `HandlerInterceptor`, `@Aspect` |
| Validation | Zod / Joi / class-validator | Bean Validation (`@NotNull`, `@Valid`, Hibernate Validator) |
| ORM | Prisma / TypeORM / Drizzle | JPA + Hibernate / Spring Data JPA / jOOQ |
| DB Migrations | Prisma Migrate / Knex | Flyway / Liquibase |
| DI container | tsyringe / Nest DI / InversifyJS | Spring `ApplicationContext` (built-in, no install needed) |
| Async primitive | `Promise<T>` + `async/await` | `CompletableFuture<T>`, `Mono<T>`/`Flux<T>` (Reactor) |
| Concurrency model | Single-threaded event loop | OS threads + virtual threads (Project Loom, JDK 21+) |
| Logging | pino / winston | SLF4J + Logback (Spring Boot ka default) |
| Environment config | `dotenv` + `process.env` | `application.yml` + Spring profiles |
| Testing | Jest / Vitest | JUnit 5 + Mockito + AssertJ |
| HTTP client | `fetch` / axios | `RestClient` / `WebClient` / OpenFeign |
| Hot reload | `nodemon` / `tsx watch` | `spring-boot-devtools` |
| Build artifact | `dist/` folder of JS files | Ek single fat `.jar` file (sab kuch andar) |
| Process manager | PM2 / systemd | `java -jar app.jar` + systemd / Docker |
| Type checker | `tsc --noEmit` | `javac` (yeh alag tool nahi hai — compilation IS type checking) |
| Linter | ESLint | Checkstyle / PMD / SpotBugs / ErrorProne |
| Formatter | Prettier | Spotless / google-java-format |
| REPL | `node` / `ts-node` | `jshell` |
| Monorepo | turborepo / nx / pnpm workspaces | Maven multi-module / Gradle composite builds |

---

## Mental Shifts — Yeh Cheezein Tujhe Zaroor Trip Karengi

> [!warning] Bhai, yeh padh le — warna raat ko 2 baje bug dhundhta rahega
> Yeh woh cheezein hain jahan Node developer hone ka background directly tujhe galat raaste pe le jaayega. Ek ek karke samajhte hain.

### 1. No Top-Level Code — Sab Kuch Class Ke Andar Hai

Node mein tu directly likhta hai:

```typescript
// Node/TS mein — perfectly valid
const port = 3000;
console.log("Server starting...");

async function startServer() {
  const app = express();
  app.listen(port);
}

startServer();
```

Java mein yeh nahi chalega. **Har cheez ek class ke andar honi chahiye.** `main` bhi ek `static` method hai class ke andar:

```java
// Java mein — sab class ke andar
public class Application {
    public static void main(String[] args) {
        // Yahan se program shuru hota hai
        System.out.println("Server starting...");
        SpringApplication.run(Application.class, args);
    }
}
```

Pehle pehle weird lagega. Aadat pad jaayegi.

---

### 2. File Naam aur Class Naam — Yeh Coupled Hain

TypeScript mein tu `userService.ts` mein `class UserController` likh sakta hai — compiler ko koi takleef nahi. Java mein? **Public class ka naam aur file ka naam exactly match karna chahiye.**

```
// SAHI: UserService.java mein
public class UserService { ... }   ✅

// GALAT: UserService.java mein
public class UserController { ... }  ❌ — Compilation error aayega
```

Aur ek rule aur — **ek public class per file**. Ek `.java` file mein ek se zyada public class nahi ho sakti.

---

### 3. Compilation Mandatory Hai — Koi Shortcuts Nahi

Node mein `ts-node` ya `tsx` se source directly chala deta tha. Java mein yeh concept nahi hai. Pehle compile karo, phir run karo:

```bash
# Node — source se directly run
npx tsx src/index.ts

# Java — pehle compile, phir run
javac UserService.java      # .class files banti hain
java UserService            # tab run hota hai

# Spring Boot ke saath Maven use karo
./mvnw spring-boot:run      # Maven andar se compile karke run karta hai
```

**Kyun yeh important hai?** Iska fayda yeh hai ki bahut saari galtiyan runtime pe nahi, compile time pe hi pakdi jaati hain. `npm start` ka equivalent `./mvnw spring-boot:run` hai Spring Boot mein.

---

### 4. Structural Typing vs Nominal Typing — Sabse Bada Mental Shift

Yeh samajhna bahut zaruri hai. TypeScript **structural typing** use karta hai — agar do objects ka shape same hai, woh compatible hain:

```typescript
// TypeScript — structural typing
interface Zomato {
  name: string;
  deliver(): void;
}

interface Swiggy {
  name: string;
  deliver(): void;
}

// Yeh VALID hai TypeScript mein — same shape, same type
function process(app: Zomato) { ... }
const swiggy: Swiggy = { name: "Swiggy", deliver: () => {} };
process(swiggy); // Works! Shape same hai toh Java ko fark nahi padta
```

Java **nominal typing** use karta hai — naam matter karta hai, shape nahi:

```java
// Java — nominal typing
interface FoodApp {
    String getName();
    void deliver();
}

class Zomato implements FoodApp {    // explicitly "implements" likhna padega
    public String getName() { return "Zomato"; }
    public void deliver() { ... }
}

class Swiggy {                       // FoodApp implement nahi kiya
    public String getName() { return "Swiggy"; }
    public void deliver() { ... }
}

void process(FoodApp app) { ... }

// GALAT — Swiggy ne FoodApp implement nahi kiya, chahe shape same ho
process(new Swiggy()); // ❌ Compilation error

// SAHI
process(new Zomato());  // ✅
```

**Practical impact:** Har jagah `implements` likhna padega. Tu automatically kisi interface ko satisfy nahi kar sakta — explicitly opt-in karna padta hai.

---

### 5. `undefined` Nahi Hai — Sirf `null` Hai (Aur `Optional<T>`)

TypeScript mein `undefined` aur `null` dono hote hain. Java mein sirf `null` hai. Lekin modern Java iska alternative deta hai — `Optional<T>`:

```java
// Purana Java style — null return karna (avoid karo)
public User findById(Long id) {
    // Agar nahi mila toh null return karo — dangerous!
    return userRepository.findById(id).orElse(null);
}

// Modern Java style — Optional use karo
public Optional<User> findById(Long id) {
    return userRepository.findById(id);  // Optional<User> return hogi
}

// Use karte waqt:
Optional<User> maybeUser = userService.findById(1L);
maybeUser.ifPresent(user -> System.out.println(user.getName()));

// Ya TypeScript ke Optional chaining jaisa:
String name = maybeUser.map(User::getName).orElse("Unknown");
```

TypeScript ka `?.` operator roughly `Optional.map()` jaisa hai Java mein.

---

### 6. Generics Runtime Pe Erase Ho Jaate Hain — Type Erasure

Yeh ek Java-specific quirk hai jo TypeScript mein nahi hoti. Java mein generics sirf **compile-time** pe kaam karte hain — runtime pe erase ho jaate hain:

```java
List<String> strings = new ArrayList<>();
List<Integer> numbers = new ArrayList<>();

// Runtime pe dono ka same class hai!
System.out.println(strings.getClass() == numbers.getClass()); // true

// Yeh NAHI kar sakte:
if (myList instanceof List<String>) { ... }  // ❌ Compile error — type erased hai

// Sirf yeh kar sakte hain:
if (myList instanceof List) { ... }  // ✅ (raw type check)
```

**Practical impact:** JSON deserialization ya reflection-based code likhte waqt yeh problem aati hai. Spring internally `TypeReference` jaisi cheezein use karta hai isko handle karne ke liye.

---

### 7. `async`/`await` Keyword Nahi Hai — Yeh Library Ka Kaam Hai

Node mein `async/await` language mein built-in hai. Java mein async kaam **libraries** karte hain:

```typescript
// TypeScript — language level async
async function fetchOrder(id: string): Promise<Order> {
  const order = await db.order.findUnique({ where: { id } });
  return order;
}
```

```java
// Java — library level async (CompletableFuture)
public CompletableFuture<Order> fetchOrder(Long id) {
    return CompletableFuture.supplyAsync(() -> 
        orderRepository.findById(id).orElseThrow()
    );
}

// Ya Spring WebFlux ke saath Reactor (reactive programming)
public Mono<Order> fetchOrder(Long id) {
    return orderRepository.findById(id);  // reactive repository
}
```

> [!tip] Beginner ke liye advice
> Start mein synchronous/blocking code likho. Java ka thread model allow karta hai blocking I/O ko bina event loop block kiye (OS threads hain, event loop nahi). Reactive programming (Mono/Flux) baad mein seekhna — pehle solid foundation bana.

---

## Spring Boot Ka "Jaadu" — Kahan Se Aata Hai Yeh Sab?

Express mein aata tha toh sab kuch **explicit** tha — tu khud routes register karta tha, khud service instantiate karta tha. Spring Boot mein app start hoti hai aur **automatically** sab kuch wired ho jaata hai. Dekh kaise:

### Express Mein — Explicit Wiring

```typescript
// Express — tu khud sab kuch connect karta hai
import express from 'express';
import { UserRepo } from './repos/UserRepo';
import { UserService } from './services/UserService';
import { UserController } from './controllers/UserController';

const db = new Database(process.env.DATABASE_URL);
const userRepo = new UserRepo(db);          // Manually create
const userService = new UserService(userRepo);  // Manually inject
const userController = new UserController(userService);  // Manually inject

const app = express();
app.get('/users/:id', (req, res) => userController.getById(req, res));  // Manually register
app.listen(3000);
```

### Spring Boot Mein — Declarative (Magic Wiring)

```java
// Spring — annotations lagao, baki Spring sambhal leta hai
@RestController
@RequestMapping("/users")
public class UserController {

    // Constructor injection — Spring khud UserService inject karega
    private final UserService service;

    public UserController(UserService service) {
        this.service = service;
    }

    @GetMapping("/{id}")
    public ResponseEntity<User> getById(@PathVariable Long id) {
        return service.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
}

@Service
public class UserService {

    private final UserRepository repo;

    public UserService(UserRepository repo) {
        this.repo = repo;
    }

    public Optional<User> findById(Long id) {
        return repo.findById(id);
    }
}

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    // Bas interface likho — Spring Data khud implementation banayega!
    Optional<User> findByEmail(String email);  // Method name se query ban jaati hai
}
```

**Yeh kaise hota hai?** Spring Boot startup pe:
1. Classpath scan karta hai saari classes ke liye
2. `@Component`, `@Service`, `@RestController`, `@Repository` annotations wali classes dhundhta hai
3. Unhe instantiate karta hai (beans banaata hai)
4. Constructor dependencies resolve karta hai (dependency injection)
5. Routes register karta hai embedded Tomcat server ke saath

Yeh sab tera kaam **Spring ApplicationContext** karta hai — Node ke `express()` instance ka bahut powerful version.

---

## Idiom Level Analogies — Jo Tune Seekha, Woh Rename Hua Hai

> [!example] Patterns jo tujhe pata hain, sirf naam alag hain

### Express Middleware ≈ Spring Filter / HandlerInterceptor

```typescript
// Express middleware — auth check
app.use((req, res, next) => {
  const token = req.headers.authorization;
  if (!isValidToken(token)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
});
```

```java
// Spring Filter — same concept
@Component
public class AuthFilter implements OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws IOException, ServletException {
        String token = request.getHeader("Authorization");
        if (!isValidToken(token)) {
            response.setStatus(401);
            return;
        }
        chain.doFilter(request, response);  // Express ka next() jaisa
    }
}
```

---

### Express Error Handler ≈ `@ControllerAdvice`

```typescript
// Express error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  res.status(500).json({ message: err.message });
});
```

```java
// Spring @ControllerAdvice — global error handler
@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(ResourceNotFoundException ex) {
        return ResponseEntity
            .status(404)
            .body(new ErrorResponse("NOT_FOUND", ex.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneral(Exception ex) {
        return ResponseEntity
            .status(500)
            .body(new ErrorResponse("INTERNAL_ERROR", ex.getMessage()));
    }
}
```

---

### Zod Validation ≈ Bean Validation (`@Valid`)

```typescript
// TypeScript — Zod se validate karo
const CreateUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(18),
});

app.post('/users', (req, res) => {
  const result = CreateUserSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json(result.error);
  }
  // validated data use karo
});
```

```java
// Java — Bean Validation annotations
public class CreateUserRequest {

    @NotBlank(message = "Naam dena zaroori hai")
    private String name;

    @Email(message = "Valid email chahiye")
    @NotBlank
    private String email;

    @Min(value = 18, message = "18 saal se kam nahi chalega")
    private Integer age;

    // Getters and setters...
}

@PostMapping("/users")
public ResponseEntity<User> createUser(
        @Valid @RequestBody CreateUserRequest request,  // @Valid triggers validation
        BindingResult result) {

    if (result.hasErrors()) {
        // Validation fail — 400 automatically return hoga agar @Valid ke baad exception throw ho
        throw new ValidationException(result.getAllErrors());
    }

    return ResponseEntity.ok(userService.create(request));
}
```

---

### Prisma `findMany` ≈ Spring Data JPA Repository

```typescript
// Prisma — query builder
const users = await prisma.user.findMany({
  where: { email: { contains: "@zomato.com" } },
  include: { orders: true },
  take: 10,
});
```

```java
// Spring Data JPA — method name se query ban jaati hai (magic!)
public interface UserRepository extends JpaRepository<User, Long> {

    // Method name se Spring automatically query banayega
    List<User> findByEmailContaining(String emailPart);

    // Ya JPQL (SQL jaisi, but object-oriented)
    @Query("SELECT u FROM User u JOIN FETCH u.orders WHERE u.email LIKE %:domain%")
    List<User> findByEmailDomain(@Param("domain") String domain, Pageable pageable);

    // Ya native SQL bhi chal jaata hai
    @Query(value = "SELECT * FROM users WHERE email LIKE %:domain%", nativeQuery = true)
    List<User> findByEmailDomainNative(@Param("domain") String domain);
}
```

---

### `process.env.DATABASE_URL` ≈ `application.yml` + `@Value`

```typescript
// TypeScript — dotenv
const dbUrl = process.env.DATABASE_URL;
const port = parseInt(process.env.PORT || '3000');
```

```yaml
# application.yml — Spring ka "dotenv"
spring:
  datasource:
    url: ${DATABASE_URL}          # Env variable reference karo
    username: ${DB_USERNAME:admin} # Default value bhi de sakte ho
  jpa:
    hibernate:
      ddl-auto: validate

server:
  port: ${PORT:8080}

# Custom properties
app:
  zomato:
    api-key: ${ZOMATO_API_KEY}
    timeout: 5000
```

```java
// Java mein use karo
@Service
public class ZomatoService {

    @Value("${app.zomato.api-key}")
    private String apiKey;

    @Value("${app.zomato.timeout}")
    private int timeout;
}

// Ya type-safe config class banao (recommended)
@ConfigurationProperties(prefix = "app.zomato")
@Component
public class ZomatoConfig {
    private String apiKey;
    private int timeout;
    // Getters/Setters...
}
```

---

### `pnpm workspaces` ≈ Maven Multi-Module Project

```
# pnpm workspace
apps/
  web/package.json
  api/package.json
packages/
  shared/package.json
pnpm-workspace.yaml
```

```
# Maven multi-module (same concept)
parent-project/
  pom.xml                   # Parent POM (pnpm-workspace.yaml jaisa)
  web-module/
    pom.xml
    src/
  api-module/
    pom.xml
    src/
  shared-module/
    pom.xml
    src/
```

---

### NestJS Guards/Pipes/Interceptors ≈ Spring Filters/Validators/AOP

Agar tune NestJS use kiya hai, toh yeh sunke khush hoga — **NestJS is basically Spring for TypeScript.** Nest ke creators ne explicitly Spring se inspiration li thi:

| NestJS | Spring Boot |
|---|---|
| Guards | Filters / `@PreAuthorize` |
| Pipes | `@Valid` + Bean Validation |
| Interceptors | `HandlerInterceptor` / `@Around` Aspect |
| Modules | `@Configuration` + Component Scan |
| Providers | Spring Beans (`@Component`, `@Service`) |
| Decorators | Annotations |

---

## Kya Nahi Map Hota — Honest Comparison

Kuch cheezein TypeScript mein hain jo Java mein simply exist nahi karti. Inke baare mein honest rehna zaroori hai:

| TypeScript Feature | Java Reality | Workaround |
|---|---|---|
| Union types `string \| number` | Koi native equivalent nahi | `sealed interface` (Java 17+) ya `Object` use karo |
| Mapped types (`Partial<T>`, `Pick<T, K>`) | Exist nahi karte | Builder pattern ya alag DTOs banao |
| `Partial<T>` | Nahi hai | Builder pattern — har field optional banao manually |
| `keyof T` | Reflection (`Class<?>`, `Field`) — runtime only, clunky | Java 21+ pattern matching thoda better hai |
| Discriminated unions | `sealed interface Result permits Ok, Err {}` (Java 17+) | `sealed interfaces` use karo |
| Template literal types | Exist nahi karte | Enums ya constants use karo |
| Conditional types | Nahi hain | Manually alag classes banao |

```java
// Java 17+ sealed interface — TypeScript discriminated union ka equivalent
sealed interface PaymentResult permits PaymentSuccess, PaymentFailure {}

record PaymentSuccess(String transactionId, double amount) implements PaymentResult {}
record PaymentFailure(String errorCode, String message) implements PaymentResult {}

// Use karna:
PaymentResult result = paymentService.processUpiPayment(request);
switch (result) {
    case PaymentSuccess s -> System.out.println("Transaction ID: " + s.transactionId());
    case PaymentFailure f -> System.out.println("Failed: " + f.message());
}
```

---

## Gotchas — Woh Mistakes Jo Tu Zaroor Karega

> [!warning] Yeh padh le, please. Raat ko neend aayegi.

### Gotcha 1: `String` Comparison Mein `==` Mat Use Karo

```java
// GALAT — reference compare hoga, value nahi
String city1 = "Mumbai";
String city2 = new String("Mumbai");
System.out.println(city1 == city2);      // false! (different objects)

// SAHI — .equals() use karo
System.out.println(city1.equals(city2)); // true ✅
System.out.println(city1.equalsIgnoreCase("MUMBAI")); // true ✅
```

TypeScript mein `===` string values compare karta hai. Java mein `==` sirf reference compare karta hai. Yeh bug dhundhna bahut mushkil hota hai — unit tests fail hote hain randomly, production mein behavior alag hota hai.

---

### Gotcha 2: `null` Checks Painful Hain — `Optional` Use Karo

```java
// GALAT style — NullPointerException ka darwaza khulta hai
public String getCity(User user) {
    return user.getAddress().getCity().toUpperCase(); // NPE if kuch bhi null ho
}

// SAHI style — Optional chain
public String getCity(User user) {
    return Optional.ofNullable(user)
        .map(User::getAddress)
        .map(Address::getCity)
        .map(String::toUpperCase)
        .orElse("Unknown City");
}
```

---

### Gotcha 3: `Object` Se Avoid Karo — Generics Use Karo

```java
// GALAT — TypeScript ka `any` jaisa hai yeh
public Object processData(Object input) {
    return input; // Type safety gone
}

// SAHI — Generics use karo
public <T> T processData(T input) {
    return input; // Type-safe
}

// Ya bounded generics
public <T extends Serializable> void save(T entity) {
    ...
}
```

---

### Gotcha 4: `pom.xml` Mein Dependency Add Karo — Global Install Nahi

```bash
# Node mein
npm install axios

# Java mein yeh NAHI karte
# Java mein pom.xml mein add karo:
```

```xml
<!-- pom.xml -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
    <!-- Version Spring Boot parent se automatically aayegi -->
</dependency>
```

Phir `./mvnw install` ya IDE automatically download kar lega.

---

### Gotcha 5: Hot Reload "Just Works" Nahi Karta

Node mein `nodemon` ya `tsx watch` seamlessly kaam karta hai. Spring Boot mein hot reload ke liye:

1. `spring-boot-devtools` dependency add karo `pom.xml` mein
2. IDE mein "Build project automatically" enable karo (IntelliJ IDEA mein)
3. Application restart hogi jab files change hongi — fully hot reload nahi, lekin restart fast hota hai

```xml
<!-- pom.xml mein add karo -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-devtools</artifactId>
    <scope>runtime</scope>
    <optional>true</optional>
</dependency>
```

---

### Gotcha 6: `.jar` File Ek Shipping Unit Hai

Node mein production pe typically `dist/` folder + `node_modules/` ship karta hai (ya Docker image). Java mein sab kuch ek **fat JAR** mein pack hota hai:

```bash
# Build karo
./mvnw clean package

# Jo milega
target/myapp-1.0.0.jar    # Sab kuch andar — dependencies, templates, static files

# Run karo anywhere (JVM honi chahiye)
java -jar target/myapp-1.0.0.jar

# Production pe
java -Xmx512m -jar app.jar --spring.profiles.active=prod
```

---

### Gotcha 7: Java Ek Bahut Verbose Language Hai — Yeh Normal Hai

TypeScript mein 10 lines mein jo kaam ho jaata hai, Java mein 30 lines lagti hain. Isko avoid karne ki koshish mat karo — yeh Java ka design choice hai. Verbose code = more explicit = easier to understand for a new team member.

```typescript
// TypeScript — concise
const getActiveUsers = async () => 
  db.user.findMany({ where: { active: true } });
```

```java
// Java — verbose but explicit
@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public List<User> getActiveUsers() {
        return userRepository.findByActiveTrue();
    }
}
```

**Phir bhi Java modern hai:** Records, pattern matching, text blocks (Java 14+), var keyword — kuch shortcuts hain. Lekin overall verbosity TypeScript se zyada rahegi.

---

## Recommended Learning Order — Iss Order Mein Padh

1. **Java Fundamentals** — types, classes, generics, interfaces — foundation pakki karo
2. **Type System Differences** — structural vs nominal typing deeply samajhna
3. **Async & Concurrency** — threads vs event loop mental model
4. **Maven Basics** — build tool sikhna — `pom.xml` samajhna
5. **Express Idiom Translation** — apni Express knowledge ko Spring mein map karo
6. **Spring Boot Starters & DI** — tab Spring ke jaadu mein jaao

---

## Key Takeaways

- **Java freight train hai, TypeScript sports car** — Java verbose hai, lekin compile-time safety aur long-term reliability ke liye industry standard hai
- **Sab kuch class ke andar** — top-level code exist nahi karta Java mein
- **File naam = Public class naam** — strict convention hai, optional nahi
- **Nominal typing** — explicitly `implements` likhna padega, shape se kaam nahi chalega
- **`null` hai, `undefined` nahi** — `Optional<T>` use karo API boundaries pe
- **Type erasure** — generics sirf compile time pe hain, runtime pe erase ho jaate hain
- **Async library hai, keyword nahi** — `CompletableFuture`, Reactor — language feature nahi
- **Spring Boot ka jaadu = Classpath scanning + Annotations + DI container** — "magic" nahi, systematic wiring hai
- **NestJS users ke liye:** NestJS IS Spring for TypeScript — mental model almost identical hai
- **String comparison** mein `.equals()` use karo, `==` nahi — yeh ek classic bug hai
- **`pom.xml` mein dependencies** — globally install karne ka concept nahi Java mein
- **Ek fat `.jar`** production artifact hai — Docker image jaisi self-contained
