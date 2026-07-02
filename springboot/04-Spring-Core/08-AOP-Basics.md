# AOP Basics — Aspect-Oriented Programming

> [!info] Node.js/Express wale ke liye quick context
> AOP woh engine hai jo `@Transactional`, `@Async`, `@Cacheable`, aur Spring Security ko under the hood power karta hai. Express mein tum yahi kaam `transactional(handler)` middleware se karte ho — manually route ko wrap karo. AOP mein tum sirf ek annotation lagate ho method pe, aur framework khud proxy banakar usse wrap kar leta hai. TypeScript analogy? NestJS ke interceptors, ya method decorators with `reflect-metadata`. Bas wahi cheez, aur zyada powerful.

---

## Yeh AOP kya problem solve karta hai?

Socho ek second ke liye — tum Swiggy jaise ek food delivery app bana rahe ho. Har order place karne wali method mein tumhe yeh sab karna padega:

1. Pehle check karo — user logged in hai?
2. Transaction start karo DB mein
3. Log karo ki method kab start hui
4. Timer lagao — kitna time lag raha hai?
5. Agar exception aaye toh rollback karo
6. End mein log karo — kitna time laga, success hua ya fail?

Ab yahi cheez `OrderService`, `RestaurantService`, `PaymentService`, `DeliveryService` — har jagah repeat karo. Yeh code ka duplication nahi hai, yeh code ka **pollution** hai. Business logic ke beech mein infrastructure ka kachra bhar gaya.

Inhe kehte hain **cross-cutting concerns** — yeh concerns tum poori application mein "cross" karte ho. Ek jagah tay nahi hota inhe likhna. Logging, transactions, security, caching, retries, metrics — yeh sab cross-cutting concerns hain.

**AOP (Aspect-Oriented Programming)** ka simple idea hai: in concerns ko ek jagah likho (ek "Aspect" class mein), aur phir bolo "jab bhi yeh method chhaye, yeh code pehle/baad/around run karo." Framework sab handle karta hai — tumhara original method ekdum saaf rehta hai.

```java
// BINA AOP — yeh kachra har method mein hoga
public Order place(Cart cart) {
    log.info("place() start hua");
    long startTime = System.nanoTime();
    var tx = txManager.begin();
    try {
        // === sirf yeh 1 line business logic hai ===
        var order = doPlace(cart);
        // ==========================================
        tx.commit();
        return order;
    } catch (Exception e) {
        tx.rollback();
        throw e;
    } finally {
        log.info("place() mein laga: {}ns", System.nanoTime() - startTime);
    }
}

// AOP KE SAATH — ekdum saaf, business logic direct dikhta hai
@Transactional  // yeh AOP use karta hai
@Timed          // yeh bhi AOP use karta hai
public Order place(Cart cart) {
    return doPlace(cart);
}
```

Second wala kitna clean hai? Ek developer isko dekhe toh immediately samajh aayega ki yeh method kya karti hai. Cross-cutting concerns alag rakhe hain — unhe maintain karna bhi alag aur aasaan hai.

---

## AOP ki vocabulary — ek baar clearly samjho

Pehle terms clear karte hain kyunki yahan log confuse hote hain:

| Term | Matlab kya hai? |
|---|---|
| **Aspect** | Woh class jisme tumhara cross-cutting code hai. Jaise `LoggingAspect`, `TimingAspect`, `SecurityAspect`. Annotation: `@Aspect` |
| **Advice** | Woh actual code/logic jo run karna hai. "Kya karna hai?" ka jawab. Types: `@Before`, `@After`, `@Around`, etc. |
| **Pointcut** | Ek expression jo batata hai "kahan apply karna hai yeh advice?" Jaise "sab service methods pe" ya "jo bhi `@Transactional` annotation laga ho" |
| **Join Point** | Execution ka ek specific moment — typically ek method call. "Kab apply karna hai?" ka jawab. Spring mein practically sab method calls join points hain. |
| **Weaving** | Aspects ko actual code mein "wire" karna. Spring **runtime proxy-based weaving** use karta hai (compile-time nahi). |

**Simple analogy**: Zomato app mein har delivery boy ko check karna padta hai ki unka background verification hua hai ya nahi. Yeh ek cross-cutting concern hai.

- **Aspect** = BackgroundCheckAspect class
- **Advice** = woh code jo actually check karta hai ("verify karo")
- **Pointcut** = "jab bhi koi @DeliveryMethod wali method call ho"
- **Join Point** = specific moment jab `acceptOrder()` call hua
- **Weaving** = Spring ka woh kaam jo automatically yeh sab connect karta hai

---

## Advice ke types — kab kya use karein?

| Annotation | Kab run hota hai? | Kab use karein? |
|---|---|---|
| `@Before` | Method se **pehle** | Input validation, security check, logging "method start" |
| `@After` | Method ke **baad** (chahe success ho ya exception) | Cleanup, resource release, audit log |
| `@AfterReturning` | Method **successfully** return karne ke baad | Result log karna, cache warm-up |
| `@AfterThrowing` | Method mein **exception** aane ke baad | Error alerting, specific exception handling |
| `@Around` | Method ko **wrap** karta hai — pehle bhi, baad bhi, aur bich mein bhi | Timing, transactions, retries, caching — most powerful |

`@Around` sabse powerful hai kyunki tum method ko rok bhi sakte ho, arguments change kar sakte ho, return value change kar sakte ho. Use isse tabhi karo jab actually control chahiye method execution pe. Simple logging ke liye `@Before`/`@After` kaafi hai.

---

## Setup kaise karein?

Spring Boot mein `spring-boot-starter-aop` add karo `pom.xml` mein:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-aop</artifactId>
</dependency>
```

Bas. Spring Boot automatically `@EnableAspectJAutoProxy` enable kar deta hai. Manual config tab chahiye jab Spring Boot nahi use kar rahe:

```java
@Configuration
@EnableAspectJAutoProxy
public class AopConfig {
    // Spring Boot mein yeh usually zaruri nahi hota
}
```

---

## Pehla real example: Timing Aspect

Socho Flipkart ke saath — har service method ka execution time track karna chahte ho for performance monitoring. Bina AOP ke, har method mein `System.nanoTime()` daalna padega. AOP se:

```java
// Step 1: Apna custom annotation banao
@Target(ElementType.METHOD)   // sirf methods pe lagega
@Retention(RetentionPolicy.RUNTIME) // runtime pe available hoga — AOP ke liye zaruri hai
public @interface Timed {
    String value() default ""; // optional: operation ka naam
}
```

```java
// Step 2: Aspect class banao
@Aspect        // yeh bolta hai Spring ko ki yeh ek Aspect class hai
@Component     // Spring Bean hai — DI ke liye
@Slf4j         // Lombok ka logging shortcut
public class TimingAspect {

    // @annotation(Timed) matlab: koi bhi method jis pe @Timed laga ho
    @Around("@annotation(Timed)")
    public Object measureTime(ProceedingJoinPoint pjp) throws Throwable {
        // pjp = ProceedingJoinPoint — method ki full info milti hai yahan

        String methodName = pjp.getSignature().toShortString();
        long startNano = System.nanoTime();

        try {
            // IMPORTANT: yeh actual method ko call karta hai
            // agar yeh nahi likhoge, method never execute hogi!
            Object result = pjp.proceed();
            return result;
        } finally {
            // finally mein daala hai taaki exception pe bhi time log ho
            long durationMicros = (System.nanoTime() - startNano) / 1_000;
            log.info("[TIMING] {} ne liya: {} microseconds", methodName, durationMicros);
        }
    }
}
```

```java
// Step 3: Use karo apni service mein
@Service
public class OrderService {

    @Timed // bas yeh lagao — timing automatically track hogi
    public Order placeOrder(Cart cart) {
        // sirf business logic
        return orderRepository.save(new Order(cart));
    }

    @Timed
    public List<Order> getOrderHistory(Long userId) {
        return orderRepository.findByUserId(userId);
    }
}
```

Ab jab bhi `placeOrder()` ya `getOrderHistory()` call hoga, `TimingAspect` automatically fire hoga aur log karega.

---

## Pointcut expressions — kahan apply karna hai?

Pointcut expressions AOP ka sabse tricky part hain. Yahan common patterns hain:

```java
// 1. execution() — method signature match karo
// Pattern: execution(modifiers? return-type declaring-type? method-name(params) throws?)

// Koi bhi public method, koi bhi return type, service package mein, koi bhi class
@Before("execution(public * com.example.app.service..*(..))")

// Sirf OrderService ki koi bhi method
@Before("execution(* com.example.app.service.OrderService.*(..))")

// Sirf woh methods jo String return karein
@Before("execution(String com.example.app..*(..))")

// Sirf woh methods jinme exactly ek Long parameter ho
@Before("execution(* com.example..*Service.*(Long))")
```

```java
// 2. @annotation() — annotation ke basis pe match karo
// Koi bhi method jis pe @Transactional laga ho
@Around("@annotation(org.springframework.transaction.annotation.Transactional)")

// Apni custom annotation ke saath
@Around("@annotation(com.example.app.annotations.Timed)")
```

```java
// 3. within() — class ke basis pe match karo
// Koi bhi RestController ke andar
@Before("within(@org.springframework.web.bind.annotation.RestController *)")

// Pura package
@Before("within(com.example.app.service.*)")
```

```java
// 4. Combine karke complex expressions banao

// com.example ki kisi bhi *Service class ki method,
// LEKIN @SkipAudit wali methods nahi
@Around("execution(* com.example..*Service.*(..)) && !@annotation(com.example.app.annotations.SkipAudit)")

// Ya toh @Transactional annotation ho, ya @Audited annotation ho
@Before("@annotation(Transactional) || @annotation(Audited)")
```

> [!tip] Pointcut expressions ko reuse karo
> Ek baar pointcut define karo, kahin bhi use karo — baar baar likhne ki zarurat nahi:
>
> ```java
> @Aspect
> @Component
> public class AuditAspect {
>
>     // Ek jagah define karo
>     @Pointcut("within(@org.springframework.web.bind.annotation.RestController *)")
>     public void controllerMethods() {} // yeh method empty rehti hai — sirf pointcut ka naam hai
>
>     // Alag jagah reuse karo
>     @Before("controllerMethods()")
>     public void logControllerCall(JoinPoint jp) {
>         log.info("Controller called: {}", jp.getSignature());
>     }
>
>     @AfterThrowing(pointcut = "controllerMethods()", throwing = "ex")
>     public void logControllerError(Exception ex) {
>         log.error("Controller error: {}", ex.getMessage());
>     }
> }
> ```

---

## Proxy-based weaving — aur uska sabse bada gotcha

Yeh samajhna bahut zaruri hai — yahan 90% beginners galti karte hain.

Spring AOP **proxy-based** hai. Matlab Spring tumhara bean directly nahi deta — woh pehle ek **proxy object** banata hai jo tumhare original bean ko wrap karta hai. Jab koi proxy ko call karta hai, proxy advice run karta hai, phir original method call karta hai.

```
External Code → Proxy → [Advice runs] → Original Bean Method
```

Diagram mein dekho:

```
@Service OrderService (tumhara original bean)
         ↑
    Proxy wraps it
         ↑
Service calls proxy → Proxy intercepted → Advice fires → Real method runs
```

**Problem yeh hai** — jab `OrderService` khud apni hi dusri method ko internally call karta hai, toh woh proxy ke through nahi jaata. Direct call hota hai:

```java
@Service
public class OrderService {

    @Transactional
    public void placeOrder(Cart cart) {
        // Business logic...
        sendConfirmation(cart.getUserId()); // GALTI! Yeh directly call hoga, proxy bypass!
    }

    @Transactional // YEH ADVICE NEVER FIRE HOGI jab placeOrder() ne call kiya
    public void sendConfirmation(Long userId) {
        // Yeh apni transaction mein run karna chahta tha...
        // ...lekin placeOrder() ki transaction mein run karega
    }
}
```

Yeh **self-invocation problem** hai — Spring AOP ka sabse common gotcha.

**Teen solutions hain:**

```java
// Solution 1: Bean ko khud mein inject karo (thoda ugly, but works)
@Service
public class OrderService {

    @Autowired
    @Lazy  // circular dependency avoid karne ke liye
    private OrderService self; // proxy inject hoga, original nahi

    @Transactional
    public void placeOrder(Cart cart) {
        self.sendConfirmation(cart.getUserId()); // ab proxy ke through jayega!
    }

    @Transactional
    public void sendConfirmation(Long userId) { ... }
}
```

```java
// Solution 2: AopContext use karo (exposeProxy enable karna padega)
@Configuration
@EnableAspectJAutoProxy(exposeProxy = true) // yeh add karo
public class AopConfig {}

@Service
public class OrderService {
    @Transactional
    public void placeOrder(Cart cart) {
        ((OrderService) AopContext.currentProxy()).sendConfirmation(cart.getUserId());
    }
}
```

```java
// Solution 3 (Best): Method ko alag bean mein move karo
@Service
public class OrderService {
    private final NotificationService notificationService;

    @Transactional
    public void placeOrder(Cart cart) {
        notificationService.sendConfirmation(cart.getUserId()); // different bean = proxy works!
    }
}

@Service
public class NotificationService {
    @Transactional
    public void sendConfirmation(Long userId) { ... }
}
```

> [!warning] Final classes aur private methods bhi proxy nahi bante
> - **Final class ya method**: CGLIB proxy nahi bana sakta final cheez ko. Apne beans ya methods ko `final` mat karo.
> - **Private methods**: Proxy sirf public/protected methods intercept kar sakta hai. Private methods pe annotation lagao — silently kuch nahi hoga.
> - **Non-Spring objects**: `new OrderService()` se banaya object Spring proxy nahi hai — uske methods pe koi advice nahi lagegi.

---

## JoinPoint se method ki info kaise milti hai?

Advice mein tum `JoinPoint` (ya `@Around` ke liye `ProceedingJoinPoint`) use karke bohot saari info le sakte ho:

```java
@Aspect
@Component
@Slf4j
public class AuditAspect {

    @Before("execution(* com.example.app.service..*(..))")
    public void auditMethodCall(JoinPoint jp) {

        // Method ka naam
        String methodName = jp.getSignature().getName();

        // Full signature
        String fullSignature = jp.getSignature().toShortString();

        // Arguments jo pass kiye gaye method ko
        Object[] args = jp.getArgs();

        // Target object (original bean)
        Object target = jp.getTarget();
        String className = target.getClass().getSimpleName();

        log.info("[AUDIT] {}.{}() called with {} arguments",
            className, methodName, args.length);

        // Arguments log karo (sensitive data careful raho!)
        for (int i = 0; i < args.length; i++) {
            log.debug("[AUDIT] Arg[{}]: {}", i, args[i]);
        }
    }

    // @AfterReturning mein return value bhi milti hai
    @AfterReturning(pointcut = "execution(* com.example.app.service..*(..))",
                    returning = "result")
    public void auditReturn(JoinPoint jp, Object result) {
        log.info("[AUDIT] {} returned: {}", jp.getSignature().getName(), result);
    }

    // @AfterThrowing mein exception milti hai
    @AfterThrowing(pointcut = "execution(* com.example.app.service..*(..))",
                   throwing = "ex")
    public void auditException(JoinPoint jp, Exception ex) {
        log.error("[AUDIT] {} threw: {}", jp.getSignature().getName(), ex.getMessage());
    }
}
```

---

## Real-world example: Multi-tenant Security Aspect

Socho ek SaaS app hai — Zomato jaise multiple restaurants alag alag "tenants" hain. Har request pe yeh check zaruri hai ki current user sahi tenant ka data access kar raha hai ya nahi. Yeh ek classic cross-cutting concern hai:

```java
// Custom annotation
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface TenantScoped {
    // Isko lagao un methods pe jo tenant-specific data return karein
}
```

```java
// Tenant info current request se milti hai (ThreadLocal ya SecurityContext se)
@Component
public class CurrentTenant {
    public Long getId() {
        // Real implementation mein SecurityContextHolder ya RequestContextHolder use hoga
        return (Long) RequestContextHolder
            .getRequestAttributes()
            .getAttribute("tenantId", RequestAttributes.SCOPE_REQUEST);
    }
}
```

```java
@Aspect
@Component
@Slf4j
public class TenantGuardAspect {

    private final CurrentTenant currentTenant;

    public TenantGuardAspect(CurrentTenant currentTenant) {
        this.currentTenant = currentTenant;
    }

    @Around("@annotation(TenantScoped)")
    public Object enforceTenantContext(ProceedingJoinPoint pjp) throws Throwable {
        Long tenantId = currentTenant.getId();

        if (tenantId == null) {
            log.warn("[SECURITY] Tenant context nahi mila — {}", pjp.getSignature());
            throw new AccessDeniedException("Tenant context required");
        }

        log.debug("[SECURITY] Tenant {} ke liye: {}", tenantId, pjp.getSignature());
        return pjp.proceed(); // sab theek — method chalao
    }
}
```

```java
@Service
public class RestaurantService {

    @TenantScoped  // bas yeh lagao — security automatic
    public List<MenuItem> getMenu(Long restaurantId) {
        return menuRepository.findByRestaurantId(restaurantId);
    }

    @TenantScoped
    public Restaurant getRestaurantDetails(Long restaurantId) {
        return restaurantRepository.findById(restaurantId)
            .orElseThrow(() -> new NotFoundException("Restaurant nahi mila"));
    }
}
```

---

## Multiple Aspects ka order

Agar ek method pe multiple aspects lag rahe hain, order undefined hota hai by default. `@Order` se control karo:

```java
@Aspect
@Component
@Order(1) // pehle yeh run hoga (lower number = higher priority)
public class SecurityAspect { ... }

@Aspect
@Component
@Order(2) // phir yeh
public class LoggingAspect { ... }

@Aspect
@Component
@Order(3) // aur phir yeh
public class TimingAspect { ... }
```

Order matters zyada `@Around` mein — outer aspect ka code pehle run hoga before method, aur baad mein last.

---

## Spring ke built-in Aspects — jo tum already use karte ho

Yeh sab AOP ke upar bane hain — aur tumne shayad already use kiye hain bina jaane:

| Annotation | Kya karta hai? | Kahan se aata hai? |
|---|---|---|
| `@Transactional` | Method ko DB transaction mein wrap karta hai | Spring Data |
| `@Async` | Method ko alag thread pe run karta hai | Spring Context |
| `@Cacheable` | Result cache karta hai, agar cache mein hai toh method call nahi karta | Spring Cache |
| `@CacheEvict` | Specific cache entries hata deta hai | Spring Cache |
| `@Retryable` | Exception pe automatic retry karta hai | Spring Retry |
| `@PreAuthorize` | Method call se pehle authorization check karta hai | Spring Security |
| `@PostAuthorize` | Return value check karke authorization enforce karta hai | Spring Security |
| `@Validated` | Method parameters validate karta hai | Spring Validation |

Inhe use karne ke liye tumhe AOP ke baare mein kuch jaanna nahi — Spring sab handle karta hai. Lekin agar kabhi inhe debug karna pade (aur padega!), tab samjho ki yeh sab proxy-based AOP hai.

---

## Common Gotchas — ek baar aur clearly

> [!warning] Yeh galtiyan mat karna
>
> **1. Self-invocation** — sabse common
> ```java
> this.someAnnotatedMethod(); // proxy bypass! advice nahi chalegi
> ```
> Fix: alag bean mein move karo ya `self` inject karo.
>
> **2. Final classes/methods**
> ```java
> @Service
> public final class OrderService { // CGLIB proxy nahi banega
>     public final void place() { ... } // yeh bhi nahi
> }
> ```
> Fix: `final` mat lagao Spring beans pe.
>
> **3. Private methods**
> ```java
> @Transactional // silently ignore hoga!
> private void internalProcess() { ... }
> ```
> Fix: `public` ya `protected` karo, ya different bean mein rakho.
>
> **4. `@Async` returning void**
> ```java
> @Async
> public void sendEmail() { throw new RuntimeException(); } // exception lost ho jayegi!
> ```
> Fix: `CompletableFuture<Void>` return karo.
>
> **5. Pointcut expression typos**
> ```java
> @Before("execution(* com.example.servce.*.*(..))") // "servce" spelling galat hai!
> // kuch nahi hoga, koi error bhi nahi — silently fail
> ```
> Fix: Test likho ki advice actually fire hoti hai.
>
> **6. non-Spring managed objects**
> ```java
> OrderService service = new OrderService(); // Spring bean nahi, proxy nahi!
> service.place(cart); // @Transactional nahi chalegi
> ```
> Fix: Hamesha Spring se inject karo, khud `new` mat karo.

---

> [!tip] AOP kab use karein aur kab nahi
>
> **Use karo jab:**
> - Concern genuinely systemic hai — har service pe, har controller pe
> - Infrastructure concern hai — transactions, security, metrics
> - Business logic se completely alag hai yeh concern
> - Same code kaafi jagah repeat ho raha hai
>
> **Use mat karo jab:**
> - Sirf 2-3 jagah chahiye — wahan simple method call kar do
> - Concern closely tied hai business logic se — readable code zyada important hai
> - Team ko AOP se familiarity nahi — debugging mushkil ho jata hai
>
> AOP ka overuse bhi hota hai — jab har cheez Aspect banane laga, toh code trace karna mushkil ho jaata hai. Magic achhi lagti hai jab tak debug karna na pade.

---

## Node.js/Express se comparison

Tumhara Node.js background hai toh yeh comparison helpful hoga:

| Concept | Node.js/Express | Spring AOP |
|---|---|---|
| Middleware/Interceptor | `app.use(authMiddleware)` | `@Before("within(@RestController *)")` |
| Route-specific wrapper | `router.get('/orders', asyncWrapper(handler))` | `@Transactional` on method |
| Method decorator | NestJS `@UseInterceptors(LoggingInterceptor)` | `@Aspect` + `@Around` |
| Error handling | `try/catch` in middleware | `@AfterThrowing` |
| Post-processing | Promise `.then()` chain | `@AfterReturning` |

Express middleware stack mein har request linearly sab middleware se guzarti hai. Spring AOP mein har method call ke liye relevant aspects proxy ke through run hote hain. Concept same hai — implementation alag.

NestJS use kiya hai? Toh `@Injectable()` interceptors bilkul same idea hain. Spring AOP zyada powerful hai kyunki pointcut expressions se tum pattern-based targeting kar sakte ho bina explicitly har route/method pe decorator lagaye.

---

## Key Takeaways

- **AOP ka purpose** — cross-cutting concerns (logging, transactions, security, timing) ko business logic se alag rakho. Ek jagah likho, kahin bhi apply karo.

- **Core vocabulary** — Aspect (class), Advice (logic), Pointcut (where), JoinPoint (when), Weaving (how they connect).

- **`@Around` sabse powerful** — method ko rok sakte ho, args/return modify kar sakte ho. Simple cases ke liye `@Before`/`@After` prefer karo.

- **Pointcut expressions** — `execution()` method signature se match karta hai, `@annotation()` annotation se, `within()` class/package se. Combine karo `&&`, `||`, `!` se.

- **Proxy-based hai** — Spring AOP compile-time nahi, runtime proxy use karta hai. Self-invocation (`this.method()`) proxy bypass karta hai — yeh sabse common gotcha hai.

- **Built-in aspects already use karo** — `@Transactional`, `@Async`, `@Cacheable`, `@PreAuthorize` sab AOP ke upar bane hain. Custom aspects sirf tab banao jab built-in kaafi na ho.

- **Multiple aspects ka order** — `@Order(n)` se control karo. Lower number = pehle run hoga.

- **Private aur final se bachho** — private methods aur final classes proxy-based AOP se out of reach hain.
