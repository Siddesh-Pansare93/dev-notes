# Filters aur Interceptors — Spring Boot ka Middleware Layer

Socho Zomato ka backend hai. Har ek incoming request ke saath kuch kaam karna hoga — chahe woh order API ho, restaurant listing ho, ya delivery tracking. Kya kaam?

- Har request ka ek unique ID assign karo (taaki logs mein dhund sako baad mein)
- JWT token check karo — kya yeh banda logged in hai?
- Request kitna time le raha hai, woh measure karo
- Agar request kisi specific restaurant ke tenant se hai, toh uska context set karo

Yeh sab kaam **har ek** controller pe jaake manually karna padega? Nahi yaar. Woh toh bakwaas hai.

Express mein tune kya kiya hoga? `app.use((req, res, next) => { ... })` — ek simple middleware. Spring Boot mein yahi concept hai, lekin do alag layers mein split hota hai:

1. **Servlet Filter** — raw level pe, DispatcherServlet ke bhi pehle chalta hai
2. **HandlerInterceptor** — Spring MVC ke andar, controller ke aas-paas chalta hai

Dono ka kaam cross-cutting concerns handle karna hai — woh cheezein jo har request ke saath karna ho, business logic se alag.

---

## Request ka Safar — Poori Pipeline Samjho

Pehle picture clear karte hain. Jab ek HTTP request aati hai tumhare Spring Boot app mein, woh kuch aise travel karti hai:

```
Client (Browser / Mobile App / Postman)
   ↓
HttpServletRequest
   ↓
┌─────────────────────────────────┐
│         Filter Chain            │  ← Servlet container level
│  (Spring Security bhi yahan)    │     Raw HttpServletRequest milta hai
│  Filter1 → Filter2 → Filter3   │     DispatcherServlet ke PEHLE
└─────────────────────────────────┘
   ↓
DispatcherServlet  (Spring MVC ka darbaan)
   ↓
┌─────────────────────────────────┐
│   HandlerInterceptor.preHandle  │  ← Spring MVC level
└─────────────────────────────────┘
   ↓
@Controller method  (tumhara actual business logic)
   ↓
┌─────────────────────────────────┐
│  HandlerInterceptor.postHandle  │  ← Controller ke baad, view/body render se pehle
└─────────────────────────────────┘
   ↓
Response body / View render hota hai
   ↓
┌─────────────────────────────────┐
│ HandlerInterceptor.afterCompletion │ ← Sab kuch ho gaya, cleanup time
└─────────────────────────────────┘
   ↓
HttpServletResponse → Client
```

**Key insight:** Filter ko pata nahi hota ki kaun sa controller handle karega. Woh sab kuch andheron mein karta hai. Interceptor ko pata hota hai — uske paas `HandlerMethod` object hota hai jisme controller class aur method ki info milti hai.

> [!info] Express wale ke liye
> Express mein ek hi middleware concept tha: `(req, res, next) => {}`. Spring ne isko do layers mein tod diya:
> - **Filter** = Express middleware jo `app.use()` se register hoti hai — servlet level pe
> - **Interceptor** = Route-level middleware jaisa, controller ka context jaanta hai
>
> Spring Security poori tarah Filters pe bani hai. Jab tum `http.authorizeHttpRequests(...)` configure karte ho, woh actually ek filter chain mein entries add kar raha hota hai.

---

## Servlet Filter — Sabse Pehle Wala Darban

### Kya hota hai Filter?

Filter ek Java interface hai (`javax.servlet.Filter` ya newer `jakarta.servlet.Filter`) jo servlet container (Tomcat) ke level pe plug hota hai. Spring Boot mein tu seedha `OncePerRequestFilter` extend karta hai — yeh guaranteed hai ki ek request pe ek hi baar chalega, chahe Spring internally request forward kare.

**Kab use karo Filter:**
- Request/Response ID propagation
- Logging (method, URL, status, time)
- JWT token parsing (Spring Security yahi karta hai)
- CORS headers
- Request body buffering (jab body ek se zyada jagah padhni ho)
- Compression/Decompression
- Rate limiting

### Code — Request Logging + Request ID Filter

Yeh ek production-ready logging filter hai. Zomato jaisi company mein iska use hoga — har request ka trace ID hona chahiye taaki distributed logs mein dhundh sako:

```java
@Component
@Order(1)  // Chhota number = pehle chalta hai
public class RequestLoggingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RequestLoggingFilter.class);

    @Override
    protected void doFilterInternal(HttpServletRequest req,
                                    HttpServletResponse res,
                                    FilterChain chain)
            throws ServletException, IOException {

        // Pehle check karo — kya client ne already ek Request ID bheja hai?
        // Agar nahi, toh humein ek naya banana hoga (UUID)
        String requestId = Optional.ofNullable(req.getHeader("X-Request-Id"))
                .orElse(UUID.randomUUID().toString());

        // MDC = Mapped Diagnostic Context — SLF4J ka magic
        // Isko set karo toh EVERY log statement is request mein automatically
        // requestId=[abc123] add ho jaata hai
        MDC.put("requestId", requestId);

        // Response header mein bhi set karo taaki client track kar sake
        res.setHeader("X-Request-Id", requestId);

        long start = System.currentTimeMillis();

        try {
            // Bahut important — yeh line agle filter ko (ya DispatcherServlet ko)
            // request forward karti hai. Agar yeh nahi likha, request yahan ROOK jaayegi
            chain.doFilter(req, res);
        } finally {
            // finally block — chahe exception aaye ya nahi, yeh ZAROOR chalega
            long elapsed = System.currentTimeMillis() - start;

            // Response status chain.doFilter() ke baad hi available hota hai
            log.info("{} {} -> {} ({} ms)",
                    req.getMethod(),
                    req.getRequestURI(),
                    res.getStatus(),
                    elapsed);

            // CRITICAL: ThreadLocal cleanup karo!
            // Tomcat threads reuse karta hai — agar yahan clear nahi kiya
            // toh agli request ko purana requestId mil jaayega
            MDC.clear();
        }
    }
}
```

`logback.xml` mein MDC ka use:
```xml
<pattern>%d{HH:mm:ss} [%X{requestId}] %-5level %logger{36} - %msg%n</pattern>
```

Ab har log line kuch aisa dikhegi:
```
14:23:45 [a3f8c1d2-...] INFO  c.z.order.OrderController - Order placed successfully
```

> [!tip] `OncePerRequestFilter` hamesha prefer karo
> Plain `Filter` interface use karo toh Spring internally agar request forward kare (error dispatch wagera), filter dobara chal sakta hai. `OncePerRequestFilter` is problem se protect karta hai — ek request = ek execution, guaranteed.

### Specific URLs pe Filter Lagaana — FilterRegistrationBean

`@Component` lagane se filter **sabhi** URLs pe lagta hai. Agar sirf `/api/*` pe chahiye?

```java
@Configuration
public class FilterConfig {

    @Bean
    public FilterRegistrationBean<RequestLoggingFilter> loggingFilter() {
        FilterRegistrationBean<RequestLoggingFilter> registration = new FilterRegistrationBean<>();

        // Note: naya instance banao — Spring Context se nahi uthao
        // (warna double registration ho sakti hai agar @Component bhi laga hai)
        registration.setFilter(new RequestLoggingFilter());

        // Sirf in URL patterns pe chalega
        registration.addUrlPatterns("/api/*");

        // Order define karo — chhota number = pehle
        registration.setOrder(1);

        return registration;
    }
}
```

> [!warning] Double Registration se bacho
> Agar Filter class pe `@Component` laga hai **AUR** tum `FilterRegistrationBean` bhi bana rahe ho, toh filter **do baar** register hoga. Ya toh `@Component` hatao, ya `FilterRegistrationBean` mein `registration.setEnabled(false)` mat karo — ek hi way choose karo.

---

## HandlerInterceptor — Controller ka Andar Wala Guard

### Kya hota hai Interceptor?

Interceptor Spring MVC ke andar kaam karta hai. Iska sabse bada superpower? Usse pata hota hai ki request ko **kaun sa controller method** handle karega. Woh `HandlerMethod` object se controller ki annotations, return type, method signature — sab kuch inspect kar sakta hai.

**Kab use karo Interceptor:**
- Custom annotations check karna (jaise `@RequiresTenant`, `@RateLimit`, `@AuditLog`)
- Tenant context set karna multi-tenant apps mein
- Controller return value inspect karna (`postHandle` mein)
- Admin-only endpoints ke liye role check
- Request-level audit logging with controller metadata

### Interceptor ke Teen Methods

```
preHandle()      → Controller SE PEHLE. Return false toh request yahan ruk jaati hai.
postHandle()     → Controller KE BAAD, response write hone SE PEHLE.
                   Model attributes inspect kar sakte ho.
afterCompletion() → Sab kuch ho gaya. Exception bhi aa gayi ho toh bhi yahan aata hai.
                    Cleanup ke liye perfect.
```

### Code — Tenant Interceptor (Multi-tenant App)

Maano CRED jaisa app hai jahan ek hi codebase multiple companies ke liye kaam karta hai. Har request mein `X-Tenant-Id` header hona chahiye:

```java
@Component
public class TenantInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest req,
                             HttpServletResponse res,
                             Object handler) throws Exception {

        // 'handler' object check karo — yeh HandlerMethod hai ya kuch aur?
        // Static resources ke liye ResourceHttpRequestHandler aata hai,
        // unhe check karne ki zarurat nahi
        if (!(handler instanceof HandlerMethod hm)) {
            return true; // Static resource hai, bypass karo
        }

        // Controller method pe @RequiresTenant annotation hai?
        // Agar nahi toh kuch karna nahi
        RequiresTenant ann = hm.getMethodAnnotation(RequiresTenant.class);
        if (ann == null) {
            return true; // Annotation nahi mili, allow karo
        }

        // Yahan aaye matlab tenant required hai
        String tenantId = req.getHeader("X-Tenant-Id");

        if (tenantId == null || tenantId.isBlank()) {
            // 400 Bad Request bhejo — missing header
            res.sendError(HttpStatus.BAD_REQUEST.value(),
                    "X-Tenant-Id header is required for this endpoint");
            return false; // STOP — controller mein mat jao
        }

        // ThreadLocal mein store karo taaki service/repo layer access kar sake
        TenantContext.set(tenantId);

        return true; // Aage badho
    }

    @Override
    public void postHandle(HttpServletRequest req,
                           HttpServletResponse res,
                           Object handler,
                           ModelAndView modelAndView) {
        // REST APIs mein yeh rarely use hota hai
        // Thymeleaf/JSP wale apps mein Model attributes modify kar sakte ho yahan
    }

    @Override
    public void afterCompletion(HttpServletRequest req,
                                HttpServletResponse res,
                                Object handler,
                                Exception ex) {
        // HAMESHA cleanup karo — chahe exception aaye ya nahi
        // ThreadLocal leak bahut dangerous hota hai (aage explain karenge)
        TenantContext.clear();

        // Exception logging bhi yahan kar sakte ho
        if (ex != null) {
            // log.error("Request failed for tenant: {}", TenantContext.get(), ex);
            // But TenantContext already clear ho gaya upar — is liye order matters
        }
    }
}
```

Custom annotation:
```java
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RequiresTenant {
    // marker annotation — koi field nahi chahiye
}
```

TenantContext (ThreadLocal wrapper):
```java
public class TenantContext {
    // ThreadLocal har thread ke liye alag value store karta hai
    // Ek request = ek thread (traditional servlet model mein)
    private static final ThreadLocal<String> CURRENT_TENANT = new ThreadLocal<>();

    public static void set(String tenantId) {
        CURRENT_TENANT.set(tenantId);
    }

    public static String get() {
        return CURRENT_TENANT.get();
    }

    public static void clear() {
        CURRENT_TENANT.remove(); // remove() use karo, set(null) nahi
    }
}
```

### Interceptor Register Karna — WebMvcConfigurer

Interceptor banana alag baat hai, register karna alag. `WebMvcConfigurer` implement karo:

```java
@Configuration
public class WebConfig implements WebMvcConfigurer {

    // Constructor injection prefer karo — @Autowired field injection se better
    private final TenantInterceptor tenantInterceptor;

    public WebConfig(TenantInterceptor tenantInterceptor) {
        this.tenantInterceptor = tenantInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(tenantInterceptor)
                // Yeh paths pe lagao
                .addPathPatterns("/api/**")
                // Yeh paths pe MAT lagao
                .excludePathPatterns("/api/v1/health", "/api/v1/ping");
    }
}
```

---

## Real-World Example — Audit Logging Interceptor

Swiggy ka example socho. Jab koi admin user kuch sensitive kaam kare (order cancel, refund approve), toh us action ka audit trail chahiye:

```java
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Audited {
    String action(); // jaise "ORDER_CANCEL" ya "REFUND_APPROVE"
}
```

```java
@Component
public class AuditInterceptor implements HandlerInterceptor {

    private final AuditLogService auditLogService;
    // ThreadLocal mein start time store karo (postHandle mein access karna hai)
    private final ThreadLocal<Long> startTime = new ThreadLocal<>();

    public AuditInterceptor(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @Override
    public boolean preHandle(HttpServletRequest req,
                             HttpServletResponse res,
                             Object handler) {
        startTime.set(System.currentTimeMillis());
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest req,
                                HttpServletResponse res,
                                Object handler,
                                Exception ex) {

        if (!(handler instanceof HandlerMethod hm)) return;

        Audited audited = hm.getMethodAnnotation(Audited.class);
        if (audited == null) return;

        long duration = System.currentTimeMillis() - startTime.get();
        startTime.remove(); // cleanup!

        // Audit log save karo
        auditLogService.log(AuditEntry.builder()
                .action(audited.action())
                .userId(req.getHeader("X-User-Id"))
                .endpoint(req.getRequestURI())
                .httpMethod(req.getMethod())
                .statusCode(res.getStatus())
                .durationMs(duration)
                .success(ex == null && res.getStatus() < 400)
                .build());
    }
}
```

Controller mein use:
```java
@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {

    @Audited(action = "ORDER_CANCEL")
    @PostMapping("/{orderId}/cancel")
    public ResponseEntity<Void> cancelOrder(@PathVariable Long orderId) {
        // Business logic
        return ResponseEntity.noContent().build();
    }
}
```

---

## Filter vs Interceptor — Kab Kaun?

| Kaam kya hai | Filter | Interceptor |
|---|---|---|
| Request ID generate/propagate karna | YES | nahi |
| Logging (method, URL, status, time) | YES | ho sakta hai, lekin Filter better hai |
| JWT / Auth token parse karna | YES (Spring Security yahi karta hai) | avoid karo |
| CORS headers lagana | YES | nahi |
| Response compress karna (gzip) | YES | nahi |
| Request/Response body modify karna | YES | limited |
| Kaunsa controller handle karega, jaanna | nahi | YES |
| Custom annotation check karna (@Audited, @RequiresTenant) | nahi (technically ho sakta, lekin hard hai) | YES, easy hai |
| Controller return value (ModelAndView) dekhna | nahi | YES (postHandle mein) |
| Conditionally request rok dena | YES (chain.doFilter() mat karo) | YES (return false from preHandle) |
| Spring Security se pehle kuch karna | YES | nahi (Interceptor baad mein aata hai) |

---

## Express se Comparison — Tere Background ke Liye

Tu Node.js/Express wala hai, toh directly map karte hain:

```typescript
// Express mein — Request ID middleware
app.use((req, res, next) => {
  const id = req.header('X-Request-Id') ?? randomUUID();
  res.set('X-Request-Id', id);
  const start = Date.now();

  res.on('finish', () => {
    console.log(`${req.method} ${req.url} -> ${res.statusCode} (${Date.now()-start}ms)`);
  });

  next(); // chain.doFilter() jaisa
});

// Per-route middleware — role check
router.get('/admin/dashboard', requireRole('ADMIN'), dashboardHandler);

// res.locals — request ke andar data share karna
app.use((req, res, next) => {
  res.locals.user = parseToken(req.headers.authorization);
  next();
});
```

| Express concept | Spring equivalent | Notes |
|---|---|---|
| `app.use(fn)` | `@Component` Filter ya `FilterRegistrationBean` | Global middleware |
| `router.use('/api', fn)` | `addUrlPatterns("/api/*")` | Scoped middleware |
| `next()` | `chain.doFilter(req, res)` | Aage badho |
| `next(err)` | Exception throw karo | `@ControllerAdvice` handle karega |
| Per-route middleware | Annotation + HandlerInterceptor checking annotation | |
| `res.locals.user` | Request attribute (`req.setAttribute`) ya `ThreadLocal` | ThreadLocal zyada common hai |
| Express error middleware `(err, req, res, next)` | `@ControllerAdvice` + `@ExceptionHandler` | Alag file mein hota hai |

**Sabse bada difference:** Express mein ek hi linear middleware chain hai. Spring mein do layers hain — Filter (servlet level) aur Interceptor (MVC level). Filter ki reach zyada broad hai; Interceptor ko zyada context milta hai.

---

## Gotchas — Beginners Yahan Ghalti Karte Hain

> [!warning] ThreadLocal cleanup — Sabse Important Gotcha
> Agar tune `ThreadLocal` mein kuch set kiya (request ID, tenant, user), toh `finally` block mein ya `afterCompletion()` mein ZAROOR clear karo.
>
> Kyun? Tomcat/Jetty threads ko **reuse** karta hai. Ek request process hone ke baad, woh thread pool mein wapas jaata hai. Agli request usse uthayegi — aur agar tune clear nahi kiya, toh **purani request ka data nayi request ko dikh sakta hai.**
>
> Production mein yeh bahut khatarnak bug hai — customer A ka data customer B ko dikh sakta hai.

```java
// GALAT — finally nahi hai
MDC.put("requestId", requestId);
chain.doFilter(req, res);
MDC.clear(); // Agar chain.doFilter() exception throw kare toh yeh line execute nahi hogi!

// SAHI — finally mein cleanup
MDC.put("requestId", requestId);
try {
    chain.doFilter(req, res);
} finally {
    MDC.clear(); // Hamesha chalega, chahe exception aaye ya nahi
}
```

> [!warning] Request Body ek baar hi padhi ja sakti hai
> Agar Filter mein `request.getInputStream()` padhte ho, toh stream consume ho jaati hai. Controller ko empty body milegi.
>
> Solution: `ContentCachingRequestWrapper` use karo body ko buffer karne ke liye:

```java
@Override
protected void doFilterInternal(HttpServletRequest req,
                                HttpServletResponse res,
                                FilterChain chain) throws ServletException, IOException {

    // Wrapper bana lo — yeh body cache karta hai
    ContentCachingRequestWrapper wrappedRequest = new ContentCachingRequestWrapper(req);
    ContentCachingResponseWrapper wrappedResponse = new ContentCachingResponseWrapper(res);

    chain.doFilter(wrappedRequest, wrappedResponse);

    // Ab body padh sakte ho (chain.doFilter ke BAAD)
    byte[] body = wrappedRequest.getContentAsByteArray();
    String requestBody = new String(body, StandardCharsets.UTF_8);
    log.debug("Request body: {}", requestBody);

    // Response body bhi padh sakte ho, lekin phir copy karna padega
    byte[] responseBody = wrappedResponse.getContentAsByteArray();
    // ... process response body ...
    wrappedResponse.copyBodyToResponse(); // IMPORTANT: client ko actual response bhejo
}
```

> [!warning] Filter Order aur Spring Security
> Spring Security khud ek **filter chain** hai — `SecurityFilterChain`. Isme specific positions pe specific filters hain.
>
> Agar tu custom auth filter bana raha hai, seedha `@Order` se order mat set karo — Spring Security ke filters ke saath conflict ho sakta hai. Instead, Spring Security ke `HttpSecurity` mein `addFilterBefore()` ya `addFilterAfter()` use karo:

```java
// Spring Security config mein:
http.addFilterBefore(myJwtFilter, UsernamePasswordAuthenticationFilter.class);
// Ya
http.addFilterAfter(myAuditFilter, SecurityContextHolderFilter.class);
```

> [!warning] Interceptor mein `@Transactional` nahi chalegi
> Interceptor Spring MVC layer pe hai. Agar service method call karte ho jo `@Transactional` hai, woh kaam karega. Lekin interceptor khud `@Transactional` annotate karo — woh Spring AOP se bahar hai, transaction nahi kholega properly.

> [!tip] `preHandle` mein `return false` karne ke baad
> Jab tum `preHandle` se `false` return karte ho, controller mein request nahi jaati. Lekin response likhne ki zimmedari **tumhari** hai — Spring automatically kuch nahi karega.
>
> ```java
> if (unauthorized) {
>     res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
>     res.setContentType("application/json");
>     res.getWriter().write("{\"error\": \"Unauthorized\"}");
>     return false;
> }
> ```

> [!tip] WebFlux (Reactive) use kar rahe ho?
> Yeh sab Servlet-based (blocking) Spring MVC ke liye hai. Agar WebFlux choose kiya hai, toh `WebFilter` use hota hai — similar concept, different API. Traditional servlet world mein raho jab tak WebFlux ki specific need na ho.

---

## Multiple Filters/Interceptors — Execution Order

Agar teen filters hain (Order 1, 2, 3), toh execution kuch aisa hota hai:

```
Request aai:
  Filter1.doFilter() start
    Filter2.doFilter() start
      Filter3.doFilter() start
        → DispatcherServlet → Interceptor.preHandle → Controller → Interceptor.postHandle
      Filter3.doFilter() end (finally block)
    Filter2.doFilter() end (finally block)
  Filter1.doFilter() end (finally block)
Response gayi
```

**Onion jaisi structure hai** — pehle wala filter sabse bahar, last wala filter controller ke sabse paas. Exactly Express middleware chain jaisi.

Interceptors ke liye:
- `preHandle` → order mein (1, 2, 3)
- `postHandle` → reverse order mein (3, 2, 1) — sirf agar sab `preHandle` true return karein
- `afterCompletion` → reverse order mein (3, 2, 1) — hamesha, even on exception

---

## Ek Complete Example — Production-Ready Setup

```java
// Filter 1: Request ID (sabse pehle — Order 1)
@Component
@Order(1)
public class RequestIdFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String requestId = Optional.ofNullable(req.getHeader("X-Request-Id"))
                .orElse(UUID.randomUUID().toString());
        MDC.put("requestId", requestId);
        res.setHeader("X-Request-Id", requestId);
        try {
            chain.doFilter(req, res);
        } finally {
            MDC.clear();
        }
    }
}

// Filter 2: Timing (Order 2)
@Component
@Order(2)
public class TimingFilter extends OncePerRequestFilter {
    private static final Logger log = LoggerFactory.getLogger(TimingFilter.class);

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        long start = System.currentTimeMillis();
        try {
            chain.doFilter(req, res);
        } finally {
            log.info("{} {} {} {}ms",
                    req.getMethod(), req.getRequestURI(),
                    res.getStatus(), System.currentTimeMillis() - start);
        }
    }
}

// Interceptor: Tenant Context (Spring MVC level)
@Component
public class TenantInterceptor implements HandlerInterceptor {
    @Override
    public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) throws Exception {
        if (!(handler instanceof HandlerMethod hm)) return true;
        if (hm.getMethodAnnotation(RequiresTenant.class) == null) return true;

        String tenantId = req.getHeader("X-Tenant-Id");
        if (tenantId == null) {
            res.sendError(400, "X-Tenant-Id required");
            return false;
        }
        TenantContext.set(tenantId);
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest req, HttpServletResponse res, Object handler, Exception ex) {
        TenantContext.clear();
    }
}

// Config
@Configuration
public class WebConfig implements WebMvcConfigurer {
    private final TenantInterceptor tenantInterceptor;

    public WebConfig(TenantInterceptor tenantInterceptor) {
        this.tenantInterceptor = tenantInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(tenantInterceptor)
                .addPathPatterns("/api/**")
                .excludePathPatterns("/api/health", "/api/ping");
    }
}
```

---

## Key Takeaways

- **Filter = Servlet container level** — DispatcherServlet se pehle chalta hai. Raw `HttpServletRequest` milta hai. JWT auth, logging, CORS, request ID — sab filter ka kaam.

- **Interceptor = Spring MVC level** — Controller ke aas paas chalta hai. `HandlerMethod` se controller annotations inspect kar sakta hai. Custom annotation-based logic ke liye perfect.

- **`OncePerRequestFilter` hamesha prefer karo** — plain `Filter` pe, double-execution se bachata hai.

- **`chain.doFilter()` zaroor call karo** — warna request yahan ruk jaayegi. Express ka `next()` yaad karo.

- **ThreadLocal ka cleanup mandatory hai** — `finally` block ya `afterCompletion()` mein. Tomcat threads reuse karta hai — cleanup nahi kiya toh data leak hoga across requests.

- **Request body sirf ek baar padhi ja sakti hai** — Filter mein body padhni ho toh `ContentCachingRequestWrapper` use karo.

- **`preHandle` se `false` return karne pe** apna response khud likho — Spring kuch nahi karega automatically.

- **Spring Security khud ek Filter chain hai** — custom auth filter integrate karna ho toh `HttpSecurity.addFilterBefore/After()` use karo, `@Order` se conflict avoid karo.

- **Express vs Spring:** Express ka `app.use()` = Spring ka Filter. Express ka per-route middleware = Spring ka Interceptor with annotation check. `res.locals` = Spring ka `ThreadLocal` (ya `request.setAttribute()`).

- **Order matters** — Filters chote order number se pehle chalte hain. Interceptors `preHandle` mein forward order mein, `postHandle`/`afterCompletion` mein reverse order mein.
