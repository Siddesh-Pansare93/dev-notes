---
tags: [java, typescript, express, spring, idioms, comparison, intermediate]
aliases: [Express to Spring, Idiom Translation, Patterns]
stage: intermediate
---

# Idiom Translation: Express Patterns → Spring

> [!info] For the Express/TS dev
> Walk through the Express patterns you write every day and see the Spring equivalent side-by-side. By the end you should be able to mentally translate any Express handler, middleware chain, or error handler into idiomatic Spring.

## 1. Routing: `app.get` → `@GetMapping`

```ts
// Express
const app = express();
app.get('/users/:id', (req, res) => {
    const id = Number(req.params.id);
    res.json({ id, name: 'Ada' });
});
```

```java
// Spring
@RestController
@RequestMapping("/users")
public class UserController {
    @GetMapping("/{id}")
    public User getById(@PathVariable Long id) {
        return new User(id, "Ada");
    }
}
```

| Express                      | Spring                                            |
| ---------------------------- | ------------------------------------------------- |
| `app.get('/u/:id', h)`       | `@GetMapping("/u/{id}")` + `@PathVariable`        |
| `app.post('/u', h)`          | `@PostMapping("/u")` + `@RequestBody`             |
| `app.put`, `delete`, `patch` | `@PutMapping`, `@DeleteMapping`, `@PatchMapping`  |
| `req.query.foo`              | `@RequestParam String foo`                        |
| `req.params.id`              | `@PathVariable Long id`                           |
| `req.body`                   | `@RequestBody Dto dto`                            |
| `req.headers['x-trace']`     | `@RequestHeader("X-Trace") String trace`          |
| `req.cookies.session`        | `@CookieValue("session") String session`          |
| `res.status(201).json(x)`    | Return `ResponseEntity.status(201).body(x)`       |
| Router (sub-app)             | Multiple `@RestController` classes                |

## 2. JSON parsing & validation: Zod → Bean Validation

```ts
// Zod
const CreateUser = z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
    age: z.number().int().min(0).optional(),
});
app.post('/users', (req, res) => {
    const dto = CreateUser.parse(req.body);  // throws on invalid
    res.status(201).json(userService.create(dto));
});
```

```java
// Bean Validation
public record CreateUser(
    @NotBlank @Size(max = 100) String name,
    @Email String email,
    @Min(0) Integer age           // nullable = optional
) {}

@PostMapping
public ResponseEntity<User> create(@Valid @RequestBody CreateUser dto) {
    return ResponseEntity.status(201).body(service.create(dto));
}
```

The `@Valid` annotation triggers validation; failures throw `MethodArgumentNotValidException` and Spring auto-returns a 400 (with [[Error-Handling-Spring]] you can customize the body).

## 3. Middleware chains

Express middleware = filter chain. Spring has three layers:

| Layer            | Concept              | Use when                                  |
| ---------------- | -------------------- | ----------------------------------------- |
| Servlet `Filter` | Runs on every request, before MVC | Auth tokens, CORS, request logging        |
| `HandlerInterceptor` | Wraps controller invocation | MDC setup, per-controller timing          |
| `@Aspect` (AOP)  | Wrap any method      | Cross-cutting on services, not just HTTP  |

### 3a. Filter (closest to Express middleware)

```ts
// Express
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => console.log(`${req.method} ${req.url} ${Date.now()-start}ms`));
    next();
});
```

```java
// Spring
@Component
public class TimingFilter extends OncePerRequestFilter {
    private static final Logger log = LoggerFactory.getLogger(TimingFilter.class);
    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws IOException, ServletException {
        long start = System.currentTimeMillis();
        try {
            chain.doFilter(req, res);
        } finally {
            log.info("{} {} {}ms", req.getMethod(), req.getRequestURI(), System.currentTimeMillis() - start);
        }
    }
}
```

### 3b. Interceptor

```java
@Component
public class AuthInterceptor implements HandlerInterceptor {
    @Override
    public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) {
        String token = req.getHeader("Authorization");
        if (token == null) { res.setStatus(401); return false; }
        req.setAttribute("userId", parse(token));
        return true;
    }
}

@Configuration
class WebConfig implements WebMvcConfigurer {
    @Autowired AuthInterceptor auth;
    @Override public void addInterceptors(InterceptorRegistry r) {
        r.addInterceptor(auth).addPathPatterns("/api/**");
    }
}
```

In modern Spring apps, **prefer Spring Security** for auth — see [[Spring-Security-Basics]].

## 4. Error handling: error middleware → `@ControllerAdvice`

```ts
// Express — error handler must be last, has 4 args
app.use((err, req, res, next) => {
    if (err instanceof NotFoundError) return res.status(404).json({ error: err.message });
    if (err instanceof ValidationError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'internal' });
});
```

```java
// Spring
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ErrorBody> notFound(NotFoundException e) {
        return ResponseEntity.status(404).body(new ErrorBody(e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorBody> validation(MethodArgumentNotValidException e) {
        var msgs = e.getBindingResult().getFieldErrors().stream()
            .map(f -> f.getField() + ": " + f.getDefaultMessage()).toList();
        return ResponseEntity.badRequest().body(new ErrorBody(String.join(", ", msgs)));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorBody> generic(Exception e) {
        return ResponseEntity.status(500).body(new ErrorBody("internal"));
    }
}

record ErrorBody(String error) {}
```

`@ControllerAdvice` applies globally; you can scope it with `basePackages` or `assignableTypes`. Modern Spring also supports `ProblemDetail` (RFC 7807) — return `ProblemDetail.forStatusAndDetail(...)` and the framework serializes it correctly.

## 5. Async routes: `async` handler → virtual threads or `@Async`

### Option A — virtual threads (JDK 21+, preferred)

```yaml
spring:
  threads:
    virtual:
      enabled: true
```

```java
@GetMapping("/orders/{id}")
public Order getOrder(@PathVariable Long id) {
    User u  = userClient.fetch(id);   // blocking call — fine on virtual thread
    var os  = orderRepo.findByUser(id);
    return new Order(u, os);
}
```

This is the closest Java has to "just write `async/await`."

### Option B — `@Async` for fire-and-forget

```java
@EnableAsync
@Configuration class AsyncConfig {}

@Service
public class EmailService {
    @Async
    public CompletableFuture<Void> sendWelcome(String email) {
        // runs on a separate executor
        smtp.send(email, "Welcome");
        return CompletableFuture.completedFuture(null);
    }
}
```

> [!warning] `@Async` only works when called from *another* bean (proxy limitation). Internal `this.foo()` calls bypass the async machinery.

### Option C — Reactive `Mono`/`Flux`

For streaming or backpressure-heavy work, see [[Project-Reactor]].

## 6. Dependency injection: manual wiring → `@Autowired`

```ts
// Express — wire by hand or with a DI lib
const repo = new UserRepository(db);
const svc  = new UserService(repo);
const ctrl = new UserController(svc);
app.get('/users/:id', ctrl.getById);
```

```java
// Spring — declarative, constructor-injected
@Repository public class UserRepository { /* ... */ }

@Service
public class UserService {
    private final UserRepository repo;
    public UserService(UserRepository repo) { this.repo = repo; }
}

@RestController
public class UserController {
    private final UserService svc;
    public UserController(UserService svc) { this.svc = svc; }
}
```

Spring discovers each `@Component` (or stereotype like `@Service`/`@Repository`/`@RestController`), instantiates them, and resolves constructor args by type. See [[Dependency-Injection]].

## 7. Config: `process.env` → `@Value` / `@ConfigurationProperties`

```ts
const port = Number(process.env.PORT ?? 3000);
const dbUrl = process.env.DATABASE_URL!;
```

```yaml
# application.yml
acme:
  payments:
    api-key: ${PAYMENTS_API_KEY}
    timeout: 5s
```

```java
@ConfigurationProperties("acme.payments")
public record PaymentConfig(String apiKey, Duration timeout) {}

@Service
public class PaymentService {
    private final PaymentConfig cfg;
    public PaymentService(PaymentConfig cfg) { this.cfg = cfg; }
}
```

## 8. Database access: Prisma → Spring Data JPA

```ts
// Prisma
const user = await prisma.user.findUnique({ where: { email } });
await prisma.user.create({ data: { name, email } });
```

```java
// Spring Data JPA — interface, no implementation needed
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);   // derived query
}

// usage
Optional<User> u = userRepo.findByEmail(email);
userRepo.save(new User(null, name, email));
```

Spring generates the implementation at runtime from the method name. See [[JPA-Entities]] and [[Spring-Data-Repositories]].

## 9. Background jobs: `BullMQ` / `agenda` → `@Scheduled` + `@EventListener`

```java
@EnableScheduling
@Configuration class SchedConfig {}

@Component
public class CleanupJob {
    @Scheduled(cron = "0 0 * * * *")  // every hour
    public void purgeStale() { /* ... */ }
}
```

For event-driven internal pub/sub:

```java
public record OrderPlaced(Long orderId) {}

@Service class OrderService {
    private final ApplicationEventPublisher events;
    public OrderService(ApplicationEventPublisher e) { this.events = e; }
    public void place(Order o) { /* ... */ events.publishEvent(new OrderPlaced(o.id())); }
}

@Component class OrderListeners {
    @EventListener public void onPlaced(OrderPlaced e) { /* notify, etc */ }
}
```

For real durable queues see [[Spring-RabbitMQ]] / [[Spring-Kafka]].

## 10. Testing: supertest → MockMvc

```ts
// supertest
await request(app).get('/users/1').expect(200).expect({ id: 1, name: 'Ada' });
```

```java
@WebMvcTest(UserController.class)
class UserControllerTest {
    @Autowired MockMvc mvc;
    @MockBean UserService svc;

    @Test
    void getsUser() throws Exception {
        when(svc.find(1L)).thenReturn(new User(1L, "Ada"));
        mvc.perform(get("/users/1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Ada"));
    }
}
```

## TypeScript ↔ Java idiom comparison cheat sheet

| Express idiom                             | Spring equivalent                               |
| ----------------------------------------- | ----------------------------------------------- |
| `app.use(cors())`                         | `@CrossOrigin` on controller, or a `CorsFilter` |
| `app.use(helmet())`                       | Spring Security default headers                 |
| `app.use(express.json())`                 | Built-in (Jackson auto-configured)              |
| `app.use(rateLimit(...))`                 | `bucket4j-spring-boot-starter` or Resilience4j  |
| Custom 404                                | `@ExceptionHandler(NoHandlerFoundException.class)` |
| File upload (`multer`)                    | `@RequestPart MultipartFile file`               |
| Server-Sent Events                        | `SseEmitter` or `Flux<ServerSentEvent<T>>`      |
| WebSockets                                | `@MessageMapping` + STOMP, or raw `@ServerEndpoint` |
| Health check                              | `spring-boot-starter-actuator` → `/actuator/health` |
| Graceful shutdown                         | `server.shutdown=graceful` in `application.yml` |

## Gotchas

> [!warning] Idiom-translation traps
> - **`@Async`/`@Transactional`/`@Cacheable` self-invocation**: calling these methods on `this` skips the proxy. Inject the bean into itself or extract to another bean.
> - **`@RequestBody` vs `@RequestParam` vs `@ModelAttribute`**: JSON body, query string, and form-encoded — they're not interchangeable.
> - **Returning `null` from a controller** with default config produces a 200 + empty body. Use `Optional<T>` + `ResponseEntity` or throw 404.
> - **Filter ordering**: define `@Order` explicitly; default ordering is unspecified.
> - **`@ControllerAdvice` doesn't catch errors thrown from filters** — filter exceptions bypass MVC. Wrap in a try/catch inside the filter or use a `HandlerExceptionResolver`.

## Related

- [[01-Mental-Model-Map]]
- [[03-Async-Concurrency]]
- [[Spring-Security-Basics]]
- [[Error-Handling-Spring]]
- [[Spring-Data-Repositories]]
- [[Project-Reactor]]
