# Idiom Translation: Express Patterns → Spring Boot

Socho ek second ke liye — tu ek Express developer hai. Teri duniya mein `app.get`, `app.use`, `req.body`, `next()` hain. Ab tu Spring Boot seekhne aaya hai. Problem kya hai? Spring ke docs directly padhne se aisa lagta hai jaise kisi alien language mein likha gaya ho.

Isliye ye file exist karti hai. Har ek cheez jo tu Express mein karta hai — routing, middleware, error handling, validation, async jobs — uska Spring equivalent side-by-side dekhte hain. Ek baar pattern samajh aaya, toh Spring kaafi intuitive lagega.

> [!info] Kaise use karein ye file
> Har section mein pehle Express/TypeScript code hai, phir Spring ka equivalent. Dono ko saath padhna — differences naturally samajh aayenge. Tu pehle se Express jaanta hai, toh Spring ko "nayi cheez" nahi, "same cheez, alag syntax" ki tarah dekh.

---

## 1. Routing: `app.get` → `@GetMapping`

Express mein tu route aise define karta hai:

```ts
// Express — seedha aur simple
const app = express();

app.get('/users/:id', (req, res) => {
    const id = Number(req.params.id);
    res.json({ id, name: 'Ada' });
});
```

Spring mein wahi kaam class ke andar annotations se hota hai:

```java
// Spring — ek dedicated class, annotations se route define hota hai
@RestController                    // ye class HTTP requests handle karti hai
@RequestMapping("/users")          // saare routes /users se start honge
public class UserController {

    @GetMapping("/{id}")           // GET /users/{id}
    public User getById(@PathVariable Long id) {
        // return karo directly — Spring khud JSON banayega Jackson se
        return new User(id, "Ada");
    }
}
```

Express ke har concept ka Spring equivalent neeche table mein hai:

| Express idiom                | Spring equivalent                                         |
| ---------------------------- | --------------------------------------------------------- |
| `app.get('/u/:id', h)`       | `@GetMapping("/u/{id}")` + `@PathVariable`                |
| `app.post('/u', h)`          | `@PostMapping("/u")` + `@RequestBody`                     |
| `app.put`, `delete`, `patch` | `@PutMapping`, `@DeleteMapping`, `@PatchMapping`          |
| `req.query.foo`              | `@RequestParam String foo`                                |
| `req.params.id`              | `@PathVariable Long id`                                   |
| `req.body`                   | `@RequestBody Dto dto`                                    |
| `req.headers['x-trace']`     | `@RequestHeader("X-Trace") String trace`                  |
| `req.cookies.session`        | `@CookieValue("session") String session`                  |
| `res.status(201).json(x)`    | Return `ResponseEntity.status(201).body(x)`               |
| Router (sub-app)             | Multiple `@RestController` classes                        |

### Ek complete example — CRUD endpoints

Express mein tu ek router file mein saare routes dalta hai:

```ts
// Express users.router.ts
const router = express.Router();

router.get('/', async (req, res) => {
    const users = await userService.findAll();
    res.json(users);
});

router.get('/:id', async (req, res) => {
    const user = await userService.findById(Number(req.params.id));
    if (!user) return res.status(404).json({ error: 'not found' });
    res.json(user);
});

router.post('/', async (req, res) => {
    const user = await userService.create(req.body);
    res.status(201).json(user);
});

router.delete('/:id', async (req, res) => {
    await userService.delete(Number(req.params.id));
    res.status(204).send();
});
```

Spring mein wahi structure ek Controller class mein:

```java
// Spring UserController.java — same logic, same flow
@RestController
@RequestMapping("/users")
public class UserController {

    private final UserService userService;

    // Constructor injection — Spring khud userService provide karega
    public UserController(UserService userService) {
        this.userService = userService;
    }

    // GET /users — saare users
    @GetMapping
    public List<User> getAll() {
        return userService.findAll();
    }

    // GET /users/42
    @GetMapping("/{id}")
    public ResponseEntity<User> getById(@PathVariable Long id) {
        return userService.findById(id)
            .map(ResponseEntity::ok)                          // user mila toh 200
            .orElse(ResponseEntity.notFound().build());       // nahi mila toh 404
    }

    // POST /users
    @PostMapping
    public ResponseEntity<User> create(@Valid @RequestBody CreateUserDto dto) {
        User created = userService.create(dto);
        return ResponseEntity.status(201).body(created);
    }

    // DELETE /users/42
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        userService.delete(id);
        return ResponseEntity.noContent().build();  // 204
    }
}
```

> [!tip] Mental model
> Express mein route aur handler alag hote hain (`app.get(path, handler)`). Spring mein method annotation hi route define karta hai — annotation + method = route + handler ek saath.

---

## 2. JSON Validation: Zod → Bean Validation

Tu TypeScript mein Zod use karta hai — `z.object()` se schema banao, parse karo, invalid hone pe error throw karo. Spring mein ye kaam Bean Validation (Jakarta Validation API) karta hai.

```ts
// TypeScript — Zod se validation
import { z } from 'zod';

const CreateUserSchema = z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
    age: z.number().int().min(0).optional(),
    phone: z.string().regex(/^[0-9]{10}$/).optional(),  // Indian phone number
});

app.post('/users', (req, res) => {
    const dto = CreateUserSchema.parse(req.body);  // invalid hone pe ZodError throw
    res.status(201).json(userService.create(dto));
});
```

Spring mein validation annotations directly DTO class pe lagate hain:

```java
// Spring — Bean Validation annotations
public record CreateUserDto(
    @NotBlank(message = "Name khali nahi ho sakta")
    @Size(max = 100, message = "Name 100 characters se zyada nahi ho sakta")
    String name,

    @NotBlank
    @Email(message = "Valid email dalo bhai")
    String email,

    @Min(value = 0, message = "Age negative nahi hoga")
    Integer age,              // Integer (nullable) = optional field

    @Pattern(regexp = "^[0-9]{10}$", message = "10 digit phone number chahiye")
    String phone              // null allowed = optional
) {}

// Controller mein @Valid lagao — bas itna hi
@PostMapping
public ResponseEntity<User> create(@Valid @RequestBody CreateUserDto dto) {
    // agar validation fail hua, Spring khud 400 throw karega MethodArgumentNotValidException
    return ResponseEntity.status(201).body(userService.create(dto));
}
```

`@Valid` annotation trigger karta hai validation. Agar koi field invalid hai toh Spring automatically `MethodArgumentNotValidException` throw karta hai aur 400 Bad Request return karta hai.

### Custom error response banana

Default Spring validation error response thoda ugly hota hai. Use kar `@ControllerAdvice` isko customize karne ke liye (Section 4 mein detail hai):

```java
// Custom validation error handler
@ExceptionHandler(MethodArgumentNotValidException.class)
public ResponseEntity<Map<String, String>> handleValidation(
        MethodArgumentNotValidException ex) {

    // Har field ki error ek map mein daal do
    Map<String, String> errors = new LinkedHashMap<>();
    ex.getBindingResult().getFieldErrors().forEach(err ->
        errors.put(err.getField(), err.getDefaultMessage())
    );

    // Response: { "email": "Valid email dalo bhai", "name": "Name khali nahi ho sakta" }
    return ResponseEntity.badRequest().body(errors);
}
```

### Common Validation Annotations

| Annotation | Kya karta hai |
| --- | --- |
| `@NotNull` | null nahi hona chahiye |
| `@NotBlank` | null ya empty string nahi, whitespace bhi count nahi |
| `@NotEmpty` | null ya empty collection/string nahi |
| `@Size(min, max)` | String/Collection ki size |
| `@Min(n)`, `@Max(n)` | Number ki range |
| `@Email` | Valid email format |
| `@Pattern(regexp)` | Regex match |
| `@Positive` | > 0 |
| `@PositiveOrZero` | >= 0 |
| `@Future` | Date future mein honi chahiye (bookings ke liye useful) |
| `@Past` | Date past mein honi chahiye |

> [!tip] Zod vs Bean Validation
> Zod zyada expressive hai (chaining, transform, refine). Bean Validation simpler hai but sufficient for most cases. Complex validation ke liye custom `@Constraint` annotations bana sakte hain ya service layer mein manual validation kar sakte hain.

---

## 3. Middleware Chains

Express mein middleware ki chain hoti hai — `app.use(fn)` se globally lagate hain, route-specific bhi laga sakte hain, `next()` se pass karte hain:

```ts
// Express middleware chain
app.use(cors());                    // CORS
app.use(helmet());                  // security headers
app.use(express.json());           // body parsing
app.use(requestLogger);            // logging
app.use('/api', authMiddleware);   // route-specific auth
app.use(errorHandler);             // error handling (last mein)
```

Spring mein teen layers hain middleware jaisi functionality ke liye:

| Layer | Concept | Kab use karein |
| --- | --- | --- |
| Servlet `Filter` | Har request pe chalega, MVC se pehle | Auth tokens, CORS, request logging, body modification |
| `HandlerInterceptor` | Controller invocation wrap karta hai | MDC setup, per-controller timing, role checks |
| `@Aspect` (AOP) | Koi bhi method wrap kar sakta hai | Service layer cross-cutting — caching, logging, transactions |

### 3a. Servlet Filter — Express `app.use` ka closest equivalent

```ts
// Express — timing middleware
app.use((req, res, next) => {
    const start = Date.now();
    // response finish hone pe log karo
    res.on('finish', () => {
        console.log(`${req.method} ${req.url} — ${Date.now() - start}ms`);
    });
    next();  // agla middleware call karo
});
```

```java
// Spring — TimingFilter
@Component  // Spring isko automatically register karega
public class TimingFilter extends OncePerRequestFilter {
    // OncePerRequestFilter ensure karta hai ek request pe sirf ek baar chalega

    private static final Logger log = LoggerFactory.getLogger(TimingFilter.class);

    @Override
    protected void doFilterInternal(
            HttpServletRequest req,
            HttpServletResponse res,
            FilterChain chain) throws IOException, ServletException {

        long start = System.currentTimeMillis();
        try {
            chain.doFilter(req, res);   // next filter ya controller tak pass karo
        } finally {
            // finally mein log karo — exception pe bhi chalega
            log.info("{} {} — {}ms",
                req.getMethod(),
                req.getRequestURI(),
                System.currentTimeMillis() - start);
        }
    }
}
```

### 3b. HandlerInterceptor — Route-specific logic

Filter saari requests pe chalta hai. Interceptor zyada precise hai — specific paths pe apply kar sakte ho:

```java
// AuthInterceptor — token validate karo
@Component
public class AuthInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest req,
                             HttpServletResponse res,
                             Object handler) throws Exception {
        String token = req.getHeader("Authorization");

        if (token == null || !token.startsWith("Bearer ")) {
            res.setStatus(401);
            res.getWriter().write("{\"error\": \"Token nahi diya bhai\"}");
            return false;  // false = request rok do, controller tak mat jaao
        }

        // Token valid hai toh userId extract karo aur request mein daal do
        Long userId = jwtService.extractUserId(token.substring(7));
        req.setAttribute("userId", userId);
        return true;  // true = aage badhne do
    }

    @Override
    public void postHandle(HttpServletRequest req, HttpServletResponse res,
                           Object handler, ModelAndView modelAndView) {
        // Controller ke baad, response likhne se pehle — rarely needed
    }

    @Override
    public void afterCompletion(HttpServletRequest req, HttpServletResponse res,
                                Object handler, Exception ex) {
        // Request complete hone ke baad cleanup
    }
}

// WebConfig mein register karo
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Autowired
    private AuthInterceptor authInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(authInterceptor)
            .addPathPatterns("/api/**")          // sirf /api/** pe apply ho
            .excludePathPatterns("/api/auth/**"); // login/register pe nahi
    }
}
```

> [!warning] Auth ke liye best practice
> Modern Spring apps mein **Spring Security** use karo auth ke liye — ye HandlerInterceptor se zyada robust hai. Spring Security filter chain pehle chalti hai, interceptors ke bhi pehle. Uska separate notes mein detail hai.

### 3c. Aspect — Service layer cross-cutting

Zomato ke order service mein socho — har method pe logging chahiye, performance tracking chahiye. AOP se ek jagah likh do, sab pe apply ho jaata hai:

```java
// AOP Aspect — service layer pe logging
@Aspect
@Component
public class ServiceLoggingAspect {

    private static final Logger log = LoggerFactory.getLogger(ServiceLoggingAspect.class);

    // @Service annotated saari classes ke saare methods pe apply hoga
    @Around("within(@org.springframework.stereotype.Service *)")
    public Object logServiceCalls(ProceedingJoinPoint pjp) throws Throwable {
        String methodName = pjp.getSignature().toShortString();
        long start = System.currentTimeMillis();

        try {
            Object result = pjp.proceed();  // actual method chalao
            log.info("{} completed in {}ms", methodName, System.currentTimeMillis() - start);
            return result;
        } catch (Exception e) {
            log.error("{} failed: {}", methodName, e.getMessage());
            throw e;
        }
    }
}
```

---

## 4. Error Handling: Error Middleware → `@ControllerAdvice`

Express mein error handler middleware last mein register karte hain — 4 arguments wala function:

```ts
// Express — error handler (4 args: err, req, res, next)
class NotFoundError extends Error {
    constructor(msg: string) { super(msg); }
}

class ValidationError extends Error {
    constructor(public errors: string[]) { super('Validation failed'); }
}

// Last mein register karo
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof NotFoundError) {
        return res.status(404).json({ error: err.message });
    }
    if (err instanceof ValidationError) {
        return res.status(400).json({ errors: err.errors });
    }
    console.error(err);
    res.status(500).json({ error: 'Kuch toh gadbad hai' });
});
```

Spring mein `@RestControllerAdvice` class globally saari exceptions handle karti hai:

```java
// Custom exceptions
public class NotFoundException extends RuntimeException {
    public NotFoundException(String message) { super(message); }
}

public class BusinessException extends RuntimeException {
    private final String code;
    public BusinessException(String code, String message) {
        super(message);
        this.code = code;
    }
    public String getCode() { return code; }
}

// Error response ka structure
public record ErrorResponse(String error, String code, List<String> details) {
    // convenience constructors
    public static ErrorResponse of(String error) {
        return new ErrorResponse(error, null, null);
    }
    public static ErrorResponse of(String error, List<String> details) {
        return new ErrorResponse(error, null, details);
    }
}

// Global exception handler — ek class, saari exceptions handle
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // 404 — resource not found
    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(NotFoundException e) {
        return ResponseEntity
            .status(404)
            .body(ErrorResponse.of(e.getMessage()));
    }

    // 400 — validation fail
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException e) {
        List<String> errors = e.getBindingResult().getFieldErrors().stream()
            .map(f -> f.getField() + ": " + f.getDefaultMessage())
            .toList();
        return ResponseEntity
            .badRequest()
            .body(ErrorResponse.of("Validation failed", errors));
    }

    // 400 — business rule violation
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusiness(BusinessException e) {
        return ResponseEntity
            .badRequest()
            .body(new ErrorResponse(e.getMessage(), e.getCode(), null));
    }

    // 500 — sab se last, unexpected errors
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneric(Exception e) {
        log.error("Unexpected error", e);  // full stack trace log karo
        return ResponseEntity
            .status(500)
            .body(ErrorResponse.of("Kuch toh gadbad hai, thodi der baad try karo"));
    }
}
```

### RFC 7807 ProblemDetail — Modern approach

Spring 6+ mein `ProblemDetail` support built-in hai — ye ek standard format hai errors ke liye:

```java
// Modern Spring 6+ approach — RFC 7807 ProblemDetail
@ExceptionHandler(NotFoundException.class)
public ProblemDetail handleNotFound(NotFoundException e, HttpServletRequest req) {
    ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, e.getMessage());
    pd.setTitle("Resource Not Found");
    pd.setInstance(URI.create(req.getRequestURI()));
    return pd;
}
```

Response aisa hoga:
```json
{
  "type": "about:blank",
  "title": "Resource Not Found",
  "status": 404,
  "detail": "User with id 42 nahi mila",
  "instance": "/users/42"
}
```

> [!tip] Scope control
> `@ControllerAdvice` by default globally apply hota hai. Agar sirf kuch controllers ke liye chahiye:
> ```java
> @ControllerAdvice(basePackages = "com.myapp.api.v2")
> @ControllerAdvice(assignableTypes = {UserController.class, OrderController.class})
> ```

---

## 5. Async Routes: `async/await` → Virtual Threads ya `@Async`

Ye woh jagah hai jahan Express aur Spring most different lagte hain. Express mein async natural hai:

```ts
// Express — async naturally
app.get('/orders/:id', async (req, res) => {
    const user = await userService.findById(req.params.id);  // DB call
    const orders = await orderService.findByUser(user.id);  // DB call
    res.json({ user, orders });
});
```

Spring mein traditionally sab synchronous blocking tha — ek thread ek request handle karta tha. Ab teen options hain:

### Option A — Virtual Threads (JDK 21+, RECOMMENDED)

JDK 21 ke virtual threads se blocking code bhi efficiently chalta hai — threads block hone pe OS thread nahi, sirf virtual thread wait karta hai:

```yaml
# application.yml — bas ye line add karo
spring:
  threads:
    virtual:
      enabled: true
```

```java
// Blocking code jo virtual threads pe fast chalega
@GetMapping("/orders/{id}")
public OrderResponse getOrder(@PathVariable Long id) {
    // Ye sab blocking calls hain — lekin virtual thread pe fine hai
    User user = userClient.fetchUser(id);          // HTTP call
    List<Order> orders = orderRepo.findByUserId(id); // DB call
    PaymentInfo payment = paymentClient.getInfo(id); // another HTTP call

    return new OrderResponse(user, orders, payment);
}
```

Virtual threads ke saath ye code async/await jaisa hi efficient hai — Node.js jaisi non-blocking I/O without the callback hell ya async/await plumbing.

### Option B — `@Async` — Fire-and-Forget tasks

Email bhejne jaisi background tasks ke liye — caller ko wait nahi karna:

```java
// @EnableAsync configuration mein enable karo
@EnableAsync
@Configuration
public class AsyncConfig {

    // Custom thread pool — production mein zarur configure karo
    @Bean
    public Executor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);
        executor.setMaxPoolSize(20);
        executor.setQueueCapacity(500);
        executor.setThreadNamePrefix("async-");
        executor.initialize();
        return executor;
    }
}

@Service
public class NotificationService {

    // @Async — ye method alag thread pe chalega, caller wait nahi karega
    @Async
    public CompletableFuture<Void> sendOrderConfirmation(String email, Long orderId) {
        // Ye slow operation hai — email bhejana
        emailClient.send(email, "Order #" + orderId + " confirmed!");
        return CompletableFuture.completedFuture(null);
    }

    // Caller ka code — immediately return karta hai
    // notificationService.sendOrderConfirmation(email, orderId);  // fire and forget
}
```

> [!warning] `@Async` ka sabse bada trap
> `@Async` sirf tab kaam karta hai jab **dusre bean se call karo**. Agar `this.sendEmail()` khud apni class mein call karo toh proxy bypass ho jaata hai aur synchronously chalega.
>
> ```java
> // GALAT — self-call, @Async kaam nahi karega
> public void placeOrder(Order order) {
>     saveOrder(order);
>     this.sendConfirmation(order.email());  // proxy bypass!
> }
>
> // SAHI — dusra bean se call karo
> @Service
> public class OrderService {
>     private final NotificationService notificationService;  // inject karo
>
>     public void placeOrder(Order order) {
>         saveOrder(order);
>         notificationService.sendConfirmation(order.email());  // works!
>     }
> }
> ```

### Option C — Reactive (WebFlux)

Streaming data ya backpressure-heavy scenarios ke liye `Mono`/`Flux` use karo — ye Node.js streams ka Java equivalent hai. Production mein Zomato live tracking jaisi features ke liye useful.

```java
// WebFlux — fully reactive
@GetMapping(value = "/live-orders", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
public Flux<Order> streamOrders() {
    return orderService.getLiveOrderStream()  // Flux<Order>
        .delayElements(Duration.ofSeconds(1));
}
```

---

## 6. Dependency Injection: Manual Wiring → `@Autowired`

Express mein DI manually karna padta hai ya koi library (InversifyJS, tsyringe) use karni padti hai:

```ts
// Express — manual wiring, ya DI library use karo
const db = new Database(process.env.DATABASE_URL!);
const userRepo = new UserRepository(db);
const userService = new UserService(userRepo);
const orderService = new OrderService(userRepo);  // same repo, dono mein
const userController = new UserController(userService, orderService);

app.get('/users/:id', (req, res) => userController.getById(req, res));
```

Spring mein ye sab automatically hota hai — tu bas classes define kar, Spring wiring sambhal leta hai:

```java
// Spring — bas annotations lagao, Spring khud wire karega

@Repository  // Database layer
public class UserRepository {
    private final JdbcTemplate jdbc;
    public UserRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    // methods...
}

@Service  // Business logic layer
public class UserService {
    private final UserRepository userRepo;

    // Constructor injection — recommended approach
    public UserService(UserRepository userRepo) {
        this.userRepo = userRepo;
    }
    // methods...
}

@Service
public class OrderService {
    private final UserRepository userRepo;  // same instance, Spring khud inject karega

    public OrderService(UserRepository userRepo) {
        this.userRepo = userRepo;
    }
}

@RestController  // HTTP layer
public class UserController {
    private final UserService userService;
    private final OrderService orderService;

    // Spring dekhega — UserService aur OrderService dono beans hain, inject karega
    public UserController(UserService userService, OrderService orderService) {
        this.userService = userService;
        this.orderService = orderService;
    }

    @GetMapping("/{id}")
    public User getById(@PathVariable Long id) {
        return userService.find(id);
    }
}
```

### Bean Scopes — Ek important concept

By default Spring beans **singleton** hote hain — ek application mein ek hi instance. Yahi behavior Express mein manually karte the (module-level singleton).

```java
@Service  // Default: @Scope("singleton") — ek hi instance
public class UserService { ... }

@Scope("prototype")  // Har baar naya instance
@Service
public class ReportGenerator { ... }

@RequestScope  // Har HTTP request ke liye naya instance
@Service
public class RequestContextHolder { ... }
```

> [!tip] Node.js se comparison
> Node.js mein `require()` automatically singleton behavior deta hai (module cache). Spring ka `@Singleton` scope same kaam karta hai — ek Spring context mein ek hi instance.

---

## 7. Configuration: `process.env` → `@Value` / `@ConfigurationProperties`

TypeScript mein:

```ts
// TypeScript — simple env vars
const config = {
    port: Number(process.env.PORT ?? 3000),
    dbUrl: process.env.DATABASE_URL!,
    jwtSecret: process.env.JWT_SECRET!,
    paymentsApiKey: process.env.PAYMENTS_API_KEY!,
    paymentsTimeout: Number(process.env.PAYMENTS_TIMEOUT ?? 5000),
};
```

Spring mein configuration `application.yml` mein structured hoti hai:

```yaml
# application.yml — structured configuration
server:
  port: 8080

spring:
  datasource:
    url: ${DATABASE_URL}  # env var se
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}

# Custom app config — prefix ke saath group karo
app:
  jwt:
    secret: ${JWT_SECRET}
    expiry: 24h

  payments:
    api-key: ${PAYMENTS_API_KEY}
    timeout: 5s
    base-url: https://payments.example.com
    retry-attempts: 3
```

### Simple `@Value` — quick access

```java
@Service
public class JwtService {
    @Value("${app.jwt.secret}")     // yml se value inject
    private String jwtSecret;

    @Value("${app.jwt.expiry}")
    private Duration jwtExpiry;

    public String generateToken(Long userId) {
        // jwtSecret aur jwtExpiry use karo
        return Jwts.builder()
            .subject(userId.toString())
            .expiration(Date.from(Instant.now().plus(jwtExpiry)))
            .signWith(Keys.hmacShaKeyFor(jwtSecret.getBytes()))
            .compact();
    }
}
```

### `@ConfigurationProperties` — Group config (Recommended)

Related configs ko ek class mein group karo — type-safe, IDE support, easy testing:

```java
// Payments config group
@ConfigurationProperties("app.payments")
public record PaymentConfig(
    String apiKey,
    Duration timeout,      // "5s" automatically Duration mein convert
    String baseUrl,
    int retryAttempts
) {}

// Enable karo (main class ya @Configuration pe)
@EnableConfigurationProperties(PaymentConfig.class)
@SpringBootApplication
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}

// Use karo
@Service
public class PaymentService {
    private final PaymentConfig config;

    public PaymentService(PaymentConfig config) {
        this.config = config;
    }

    public PaymentResult processPayment(UpiPayment payment) {
        return httpClient.post(config.baseUrl() + "/pay")
            .timeout(config.timeout())
            .header("X-API-Key", config.apiKey())
            .body(payment)
            .execute();
    }
}
```

### Profile-based Config — Dev vs Prod

Node.js mein `.env.development`, `.env.production` files hoti hain. Spring mein profiles:

```yaml
# application.yml — default config
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/myapp

---
# application-prod.yml — production override
spring:
  config:
    activate:
      on-profile: prod
  datasource:
    url: ${DATABASE_URL}  # production mein env var se
```

```bash
# Profile activate karna
java -jar app.jar --spring.profiles.active=prod
# ya env var se
SPRING_PROFILES_ACTIVE=prod java -jar app.jar
```

---

## 8. Database Access: Prisma → Spring Data JPA

Prisma itna convenient hai — TypeScript types automatically generate hote hain, queries type-safe hoti hain:

```ts
// Prisma — TypeScript se database
const user = await prisma.user.findUnique({
    where: { email },
    include: { orders: true }
});

const newUser = await prisma.user.create({
    data: { name, email, createdAt: new Date() }
});

const users = await prisma.user.findMany({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
    take: 20, skip: offset
});
```

Spring Data JPA mein interface define karo — Spring implementation generate karega:

```java
// Entity — database table ka Java representation
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();

    // Getters, setters, constructors...
}

// Repository — interface define karo, Spring implementation banayega
public interface UserRepository extends JpaRepository<User, Long> {

    // Method name se query derive hoti hai — Prisma jaisa magic
    Optional<User> findByEmail(String email);

    List<User> findByActiveTrue();

    List<User> findByCreatedAtAfterOrderByCreatedAtDesc(Instant since);

    // Pagination ke liye
    Page<User> findByActiveTrue(Pageable pageable);

    // Custom query bhi likh sakte ho
    @Query("SELECT u FROM User u WHERE u.email LIKE %:domain")
    List<User> findByEmailDomain(@Param("domain") String domain);
}

// Service mein use karo
@Service
public class UserService {
    private final UserRepository userRepo;

    public UserService(UserRepository userRepo) {
        this.userRepo = userRepo;
    }

    public User create(CreateUserDto dto) {
        User user = new User();
        user.setName(dto.name());
        user.setEmail(dto.email());
        return userRepo.save(user);  // INSERT karta hai
    }

    public Optional<User> findByEmail(String email) {
        return userRepo.findByEmail(email);
    }

    public Page<User> findActive(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return userRepo.findByActiveTrue(pageable);
    }
}
```

> [!info] Prisma vs Spring Data JPA
> Prisma automatically TypeScript types generate karta hai schema se. Spring Data JPA mein tu Entity class khud likhta hai, phir repository methods method naming convention se kaam karti hain. Dono mein "convention over configuration" wala vibe hai — bas different syntax.

---

## 9. Background Jobs: `BullMQ` / `node-cron` → `@Scheduled` + `@EventListener`

Node.js mein BullMQ ya node-cron se background jobs:

```ts
// node-cron
import cron from 'node-cron';

// Har raat 2 baje purane sessions clean karo
cron.schedule('0 2 * * *', async () => {
    console.log('Cleaning stale sessions...');
    await sessionService.purgeExpired();
});

// BullMQ — durable queue
const emailQueue = new Queue('emails');
emailQueue.add('send-welcome', { userId: 123, email: 'user@example.com' });
```

Spring mein:

```java
// @EnableScheduling enable karo
@EnableScheduling
@Configuration
public class SchedulingConfig {}

@Component
public class MaintenanceJobs {

    private final SessionRepository sessionRepo;
    private final ReportService reportService;

    public MaintenanceJobs(SessionRepository sessionRepo, ReportService reportService) {
        this.sessionRepo = sessionRepo;
        this.reportService = reportService;
    }

    // Har raat 2 baje — purane sessions delete
    @Scheduled(cron = "0 0 2 * * *")
    public void purgeExpiredSessions() {
        log.info("Purging expired sessions...");
        int deleted = sessionRepo.deleteExpiredBefore(Instant.now());
        log.info("Deleted {} sessions", deleted);
    }

    // Har ghante mein — fixed rate (milliseconds mein)
    @Scheduled(fixedRate = 3_600_000)
    public void generateHourlyReport() {
        reportService.generateHourly();
    }

    // App start hone ke 30 seconds baad, phir har 10 minute mein
    @Scheduled(initialDelay = 30_000, fixedDelay = 600_000)
    public void syncInventory() {
        inventoryService.sync();
    }
}
```

### Internal Event Bus — pub/sub within the app

Zomato ke order flow mein socho — order place hone pe multiple cheezein honi chahiye: notification bhejna, inventory update karna, analytics log karna. Inhe decouple karo events se:

```java
// Event define karo — plain record
public record OrderPlacedEvent(Long orderId, String customerEmail, BigDecimal amount) {}

// Publisher — order service event fire karta hai
@Service
public class OrderService {
    private final ApplicationEventPublisher eventPublisher;
    private final OrderRepository orderRepo;

    public OrderService(ApplicationEventPublisher eventPublisher, OrderRepository orderRepo) {
        this.eventPublisher = eventPublisher;
        this.orderRepo = orderRepo;
    }

    @Transactional
    public Order placeOrder(CreateOrderDto dto) {
        Order order = orderRepo.save(new Order(dto));

        // Event publish karo — listeners automatically call honge
        eventPublisher.publishEvent(
            new OrderPlacedEvent(order.getId(), dto.email(), dto.getTotal())
        );

        return order;
    }
}

// Multiple listeners — same event pe
@Component
public class OrderEventListeners {

    private final NotificationService notificationService;
    private final AnalyticsService analyticsService;
    private final InventoryService inventoryService;

    // ... constructor injection

    @EventListener
    public void onOrderPlaced_sendNotification(OrderPlacedEvent event) {
        notificationService.sendOrderConfirmation(event.customerEmail(), event.orderId());
    }

    @EventListener
    public void onOrderPlaced_updateAnalytics(OrderPlacedEvent event) {
        analyticsService.recordSale(event.orderId(), event.amount());
    }

    @Async  // Async mein chalaao — order service ko wait nahi karna
    @EventListener
    public void onOrderPlaced_updateInventory(OrderPlacedEvent event) {
        inventoryService.decrementStock(event.orderId());
    }
}
```

> [!info] In-memory vs Durable Queue
> `ApplicationEventPublisher` in-memory hai — agar server crash kare toh events lost. Production mein durable jobs ke liye RabbitMQ ya Kafka use karo (Spring AMQP, Spring Kafka).

---

## 10. Testing: `supertest` → `MockMvc`

Node.js mein supertest se controller testing:

```ts
// supertest + Jest
import request from 'supertest';
import { app } from '../app';

describe('UserController', () => {
    it('GET /users/:id — returns user', async () => {
        // Mock service
        jest.spyOn(userService, 'findById').mockResolvedValue({
            id: 1, name: 'Ada', email: 'ada@example.com'
        });

        const res = await request(app).get('/users/1');

        expect(res.status).toBe(200);
        expect(res.body.name).toBe('Ada');
    });

    it('POST /users — validates input', async () => {
        const res = await request(app)
            .post('/users')
            .send({ name: '', email: 'not-an-email' });

        expect(res.status).toBe(400);
    });
});
```

Spring mein `MockMvc` se same kaam:

```java
// @WebMvcTest — sirf controller layer load karta hai, fast test
@WebMvcTest(UserController.class)
class UserControllerTest {

    @Autowired
    private MockMvc mvc;  // HTTP requests simulate karne ke liye

    @MockBean  // Mockito mock — UserService autowire nahi hogi, mock inject hogi
    private UserService userService;

    @Test
    void getById_whenUserExists_returns200() throws Exception {
        // Arrange — mock setup
        when(userService.findById(1L))
            .thenReturn(Optional.of(new User(1L, "Ada", "ada@example.com")));

        // Act & Assert — request karo aur response check karo
        mvc.perform(get("/users/1")
                .contentType(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(1))
            .andExpect(jsonPath("$.name").value("Ada"))
            .andExpect(jsonPath("$.email").value("ada@example.com"));
    }

    @Test
    void getById_whenNotFound_returns404() throws Exception {
        when(userService.findById(99L)).thenReturn(Optional.empty());

        mvc.perform(get("/users/99"))
            .andExpect(status().isNotFound());
    }

    @Test
    void createUser_withInvalidData_returns400() throws Exception {
        String invalidJson = """
            {
                "name": "",
                "email": "not-an-email"
            }
            """;

        mvc.perform(post("/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidJson))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.details").isArray());
    }

    @Test
    void createUser_withValidData_returns201() throws Exception {
        var dto = new CreateUserDto("Siddesh", "siddesh@example.com", null);
        var created = new User(1L, "Siddesh", "siddesh@example.com");

        when(userService.create(any())).thenReturn(created);

        String validJson = """
            {
                "name": "Siddesh",
                "email": "siddesh@example.com"
            }
            """;

        mvc.perform(post("/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(validJson))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value(1))
            .andExpect(jsonPath("$.name").value("Siddesh"));
    }
}
```

---

## Complete Cheat Sheet: Express → Spring

| Express idiom | Spring equivalent |
| --- | --- |
| `app.use(cors())` | `@CrossOrigin` on controller, ya `CorsFilter` bean |
| `app.use(helmet())` | Spring Security default security headers |
| `app.use(express.json())` | Built-in (Jackson auto-configured) |
| `app.use(rateLimit(...))` | `bucket4j-spring-boot-starter` ya Resilience4j |
| Custom 404 | `@ExceptionHandler(NoHandlerFoundException.class)` |
| File upload (`multer`) | `@RequestPart MultipartFile file` |
| Server-Sent Events | `SseEmitter` ya `Flux<ServerSentEvent<T>>` |
| WebSockets | `@MessageMapping` + STOMP, ya `@ServerEndpoint` |
| Health check | `spring-boot-starter-actuator` → `/actuator/health` |
| Graceful shutdown | `server.shutdown=graceful` in `application.yml` |
| `morgan` (request logging) | `OncePerRequestFilter` ya Logback access log |
| `dotenv` | `application.yml` + `${ENV_VAR}` syntax |
| `multer` file upload | `@RequestPart MultipartFile` |
| JWT middleware | Spring Security `JwtAuthFilter` |
| `compression()` | `server.compression.enabled=true` in yml |

---

## Gotchas — Beginners Ko Ye Traps Milenge

> [!warning] Self-invocation trap — sabse common mistake
> `@Async`, `@Transactional`, `@Cacheable` — ye sab Spring proxy se kaam karte hain. Agar `this.method()` call karo apni class mein, proxy bypass ho jaata hai aur annotation ka koi effect nahi hota.
>
> ```java
> // GALAT — this.sendEmail() proxy se nahi chalega
> @Service
> public class OrderService {
>     @Transactional
>     public void placeOrder(OrderDto dto) {
>         saveOrder(dto);
>         this.notifyUser(dto.email());  // @Async kaam nahi karega!
>     }
>
>     @Async
>     public void notifyUser(String email) { ... }
> }
>
> // SAHI — alag bean se call karo
> @Service
> public class OrderService {
>     private final NotificationService notificationService;  // inject karo
>
>     @Transactional
>     public void placeOrder(OrderDto dto) {
>         saveOrder(dto);
>         notificationService.notifyUser(dto.email());  // works!
>     }
> }
> ```

> [!warning] `@RequestBody` vs `@RequestParam` vs `@ModelAttribute`
> Express mein sab `req.body`/`req.query` mein tha. Spring mein explicitly bolna padta hai:
> - `@RequestBody` — JSON body se (`Content-Type: application/json`)
> - `@RequestParam` — query string se (`?name=foo`)
> - `@ModelAttribute` — form-encoded se (`Content-Type: application/x-www-form-urlencoded`)
>
> Inhein mix mat karo — `@RequestBody` query params nahi padhega, `@RequestParam` JSON body nahi padhega.

> [!warning] `null` return karna controller se
> Express mein `res.json(null)` clearly null bhejta hai. Spring mein controller se `null` return karne pe default behavior hai 200 OK with empty body — ye confusing hai.
>
> Instead use karo:
> ```java
> // BAD
> public User getUser(Long id) {
>     return userRepo.findById(id).orElse(null);  // null return = 200 empty body
> }
>
> // GOOD
> public ResponseEntity<User> getUser(Long id) {
>     return userRepo.findById(id)
>         .map(ResponseEntity::ok)
>         .orElse(ResponseEntity.notFound().build());  // 404
> }
> ```

> [!warning] Filter ordering undefined by default
> Multiple filters hone pe order unspecified hota hai. Explicitly order do:
> ```java
> @Component
> @Order(1)  // pehle chalega
> public class CorsFilter extends OncePerRequestFilter { ... }
>
> @Component
> @Order(2)  // baad mein
> public class AuthFilter extends OncePerRequestFilter { ... }
> ```

> [!warning] `@ControllerAdvice` filters ke exceptions nahi pakdega
> Agar Filter mein exception throw ho, `@ControllerAdvice` usse handle nahi kar sakta — kyunki filter MVC ke bahar hai. Filter ke andar try-catch karo ya `HandlerExceptionResolver` use karo.
>
> ```java
> @Override
> protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
>         throws IOException, ServletException {
>     try {
>         chain.doFilter(req, res);
>     } catch (JwtExpiredException e) {
>         // Manually response likho — @ControllerAdvice yahan kaam nahi karega
>         res.setStatus(401);
>         res.setContentType("application/json");
>         res.getWriter().write("{\"error\": \"Token expired\"}");
>     }
> }
> ```

> [!warning] Bean Validation — `@Valid` vs `@Validated`
> - `@Valid` — method parameters pe (controller mein)
> - `@Validated` — class level pe ya groups ke liye
>
> Service layer mein validation chahiye? `@Validated` class pe lagate hain aur `@Valid` method params pe — Spring AOP handle karega.

---

## Key Takeaways

- **Routing**: Express `app.get(path, handler)` → Spring `@GetMapping` method annotation. Same concept, different syntax. `@PathVariable`, `@RequestParam`, `@RequestBody` explicitly declare karne padte hain.

- **Validation**: Zod ki jagah Bean Validation annotations — `@NotBlank`, `@Email`, `@Min` etc. directly DTO class pe. `@Valid` controller mein trigger karta hai.

- **Middleware**: Teen layers — `Filter` (saari requests, MVC se pehle), `HandlerInterceptor` (controller wrap), `@Aspect` (koi bhi method). Most middleware-like work `Filter` se hoga.

- **Error handling**: Express error middleware → `@RestControllerAdvice` class. Globally apply hota hai, exception type ke basis pe handlers define karo.

- **Async**: Virtual threads (JDK 21+) enable karo aur blocking code likho — Node.js jaisa efficient. `@Async` fire-and-forget ke liye, self-invocation trap se bachna.

- **DI**: Manual wiring ki zarurat nahi — `@Service`, `@Repository`, `@Component` lagao, constructor injection karo, Spring khud wire karega. Default singleton scope hai.

- **Config**: `process.env` → `application.yml` with `${ENV_VAR}` syntax. `@ConfigurationProperties` se group config type-safe aur IDE-friendly banti hai.

- **Database**: Prisma → Spring Data JPA. Entity class likho, Repository interface define karo with method naming convention — Spring implementation generate karega.

- **Testing**: `supertest` → `MockMvc`. `@WebMvcTest` sirf controller layer load karta hai, fast tests ke liye. `@MockBean` se dependencies mock karo.

- **Self-invocation trap sabse important** — `@Async`, `@Transactional`, `@Cacheable` kisi bhi `this.method()` call pe kaam nahi karte. Hamesha alag bean se call karo.
