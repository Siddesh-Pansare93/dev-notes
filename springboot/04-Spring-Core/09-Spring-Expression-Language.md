# Spring Expression Language (SpEL)

Socho ek second ke liye — tumhara Zomato backend chal raha hai, aur tumhe chahiye ki **production pe discount rate alag ho, staging pe alag ho, aur testing pe bilkul zero ho.** Aur yeh sab kuch bina code change kiye, sirf ek config property se control ho jaye. Aur uss property ki value ko tum ek expression mein use karke automatically percentage mein convert kar sako.

Yahi kaam karta hai **Spring Expression Language (SpEL)** — ek chhota lekin bahut powerful expression engine jo Spring ke andar baked-in hai. Yeh tumhare annotations ke andar dynamic logic likhne deta hai — property lookups, math calculations, method calls, conditionals — sab kuch **string literals ke andar** hi.

Node.js se aaye ho? Toh socho JavaScript ke template literals — `` `Hello ${name}` `` — lekin yeh sirf string interpolation nahi hai. Yeh actually **Spring container ke against evaluate hota hai** — beans, system properties, environment variables, sab kuch access kar sakta hai. Bahut zyada powerful hai.

## Do Syntaxes — Inka Fark Samjho Pehle

Yeh sabse pehli cheez hai jo confuse karti hai beginners ko. Spring mein do alag syntaxes hain:

| Syntax | Naam | Kya Karta Hai |
|---|---|---|
| `${property.name}` | **Property Placeholder** | `application.properties` / `application.yml` ya environment variables se value uthata hai |
| `#{ expression }` | **SpEL Expression** | Actual code ki tarah evaluate hota hai — beans, methods, math sab |

**Simple rule yaad rakho:**
- `${}` = config file se uthao
- `#{}` = code ki tarah execute karo

Aur yeh dono nest bhi ho sakte hain — pehle `${}` resolve hota hai, phir `#{}` evaluate hota hai:

```java
// Pehle '${app.mode}' ko resolve karega (e.g., "prod"),
// phir SpEL expression evaluate karega
@Value("#{ '${app.mode}' == 'prod' ? 100 : 10 }")
private int rateLimit;
```

> [!info] Node.js waalon ke liye
> Express mein tum `process.env.PORT` ya `config.get('port')` use karte ho. Spring mein yahi kaam `@Value("${server.port}")` karta hai. SpEL (`#{}`) is se ek step aage hai — jaise `process.env` ki value pe JavaScript expression chala sako.

---

## @Value — Config Inject Karo Apne Beans Mein

Yeh sabse common use case hai SpEL ka. `@Value` annotation se tum seedha kisi bhi field mein config property inject kar sakte ho.

```java
@Service
public class ZomatoOrderService {

    // Simple property injection — application.yml se server.port uthao
    @Value("${server.port}")
    private int port;

    // Default value bhi de sakte ho — agar property nahi mili toh "Zomato App" use hoga
    @Value("${app.name:Zomato App}")
    private String appName;

    // Agar list chahiye aur property nahi mili toh empty list — null se bachao
    @Value("${app.tags:#{T(java.util.Collections).emptyList()}}")
    private List<String> tags;

    // System property — user ke home directory ka path
    @Value("#{systemProperties['user.home']}")
    private String homeDir;

    // SpEL mein math — seedha expression likho
    @Value("#{ 2 + 2 }")
    private int four; // always 4 rahega, obviously :)

    // SpEL mein Java class ka method call — aaj ki date inject karo
    @Value("#{ T(java.time.LocalDate).now() }")
    private LocalDate today;

    // Fee rate — config se uthao (e.g., 0.025) aur 100 se multiply karo percentage ke liye
    @Value("#{ ${app.fee-rate} * 100 }")
    private BigDecimal feePercent; // 2.5 aa jayega
}
```

> [!tip] @ConfigurationProperties vs @Value — Kab Kya Use Karo
> Agar ek hi property chahiye, toh `@Value` bilkul theek hai. Lekin agar tumhare paas **related properties ka group** hai (jaise `app.db.host`, `app.db.port`, `app.db.name`), toh `@ConfigurationProperties` use karo. Woh zyada clean hai, IDE support bhi better deta hai, aur validation bhi support karta hai.

---

## SpEL Ki Poori Duniya — Expressions Ka Breakdown

### 1. Literals — Basic Values

```java
// String literal
@Value("#{ 'Namaste Duniya' }")
private String greeting;

// Integer
@Value("#{ 42 }")
private int answer;

// Boolean
@Value("#{ true }")
private boolean isActive;

// List literal — inline list directly annotation mein
@Value("#{ {1, 2, 3, 4, 5} }")
private List<Integer> numbers;

// Map literal — inline map
@Value("#{ {'city': 'Mumbai', 'country': 'India'} }")
private Map<String, String> location;
```

### 2. Operators — Math, String, Comparison

```java
// Math operations
@Value("#{ 1 + 2 * 3 }")  // = 7 (BODMAS follow karta hai)
private int calc;

// String concatenation
@Value("#{ 'Jai ' + 'Hind' }")
private String message;

// Comparison
@Value("#{ 10 > 5 }")
private boolean result; // true

// Ternary operator — Node.js jaise hi
@Value("#{ ${app.env} == 'prod' ? 'Production' : 'Development' }")
private String environment;

// Elvis operator — Node.js mein ?. jaise, null check ke liye
// Agar list null hai toh 0 return karo, warna size()
@Value("#{ someList?.size() ?: 0 }")
private int listSize;
```

> [!info] Elvis Operator Kya Hota Hai?
> `?:` ko Elvis operator kehte hain (sideways se dekho, hair jaisa lagta hai — Elvis Presley ki yaad aati hai 😄). Matlab: "agar left side null ya false hai toh right side wala lo." Node.js mein tum `value ?? defaultValue` likhte ho — SpEL mein yahi `value ?: defaultValue` se hota hai.

### 3. Bean References — Doosre Beans Ko Access Karo

Yeh SpEL ki superpower hai. Ek bean doosre bean ko directly annotation mein reference kar sakta hai!

```java
// Bean ka naam likhke directly inject karo
@Value("#{userService}")
private UserService userService;

// Bean ka method call karo — startup pe ek baar execute hoga
@Value("#{userService.getAdminCount()}")
private int adminCount;

// @beanName syntax — explicit form, Spring container mein jaake dhundta hai
@Value("#{@orderRepository.count()}")
private long totalOrders;

// Nested property access — bean ki property ki property
@Value("#{@configBean.database.host}")
private String dbHost;
```

> [!warning] Circular Dependency Ka Darr
> Agar Bean A, Bean B ko `@Value` mein reference karta hai aur Bean B, Bean A ko — toh Spring circular dependency error de sakta hai. Aisa design avoid karo. Better hai ki config values `@ConfigurationProperties` mein rakhao aur beans use karein.

### 4. Type References — Static Methods Aur Constants

Java mein static methods ya constants access karne ke liye `T()` syntax use hota hai:

```java
// Math.PI — static constant
@Value("#{ T(java.lang.Math).PI }")
private double pi;

// Static method call — UUID generate karo
@Value("#{ T(java.util.UUID).randomUUID().toString() }")
private String instanceId;

// Instant.now() — current timestamp
@Value("#{ T(java.time.Instant).now() }")
private java.time.Instant startTime;

// Enum value reference
@Value("#{ T(com.example.Status).ACTIVE }")
private Status defaultStatus;
```

### 5. Collection Projection aur Selection — SpEL Ka Secret Weapon

Yeh wali feature bahut kam log jaante hain, lekin yeh extremely useful hai:

```java
// .![expression] — Projection (map karo har element pe)
// users list se sirf names nikalo
@Value("#{@userService.getAllUsers().![name]}")
private List<String> allUserNames;

// .?[condition] — Selection (filter karo)
// Sirf woh users jinka age > 18 hai
@Value("#{@userService.getAllUsers().?[age > 18]}")
private List<User> adultUsers;

// Dono combine karo — adults ke sirf emails nikalo
@Value("#{@userService.getAllUsers().?[age > 18].![email]}")
private List<String> adultEmails;

// .^[condition] — First match
@Value("#{@userService.getAllUsers().^[isPremium]}")
private User firstPremiumUser;

// .$[condition] — Last match
@Value("#{@userService.getAllUsers().$[city == 'Mumbai']}")
private User lastMumbaiUser;
```

> [!info] Node.js waalon ke liye
> Yeh exactly JavaScript ke `.map()`, `.filter()`, `.find()` jaise hain, lekin annotation ke andar. `![name]` = `.map(u => u.name)`, `.?[age > 18]` = `.filter(u => u.age > 18)`.

---

## SpEL Real Projects Mein — Common Annotation Uses

### @Cacheable — Cache Key Define Karo

Swiggy ki order service mein cache use karo — `orderId` se cache key banao:

```java
// Simple case — method parameter se cache key
@Cacheable(value = "orders", key = "#orderId")
public Order getOrder(Long orderId) {
    return orderRepository.findById(orderId).orElseThrow();
}

// Complex case — object ki property se key, aur condition bhi
@Cacheable(
    value = "users",
    key = "#user.phoneNumber",          // user object ki phoneNumber property
    condition = "#user.isActive"        // sirf active users ko cache karo
)
public User cacheUser(User user) {
    return userRepository.save(user);
}

// Multiple params se composite key
@Cacheable(value = "menus", key = "#restaurantId + '_' + #city")
public List<MenuItem> getMenu(Long restaurantId, String city) {
    return menuRepository.findByRestaurantAndCity(restaurantId, city);
}
```

### @PreAuthorize — Spring Security Mein Access Control

Paytm wallet mein sirf ADMIN ya khud ka data access ho sake — yeh security rule SpEL se likhte hain:

```java
// Sirf ADMIN role wale access kar sakte hain
@PreAuthorize("hasRole('ADMIN')")
public List<User> getAllUsers() { ... }

// ADMIN ya phir jo khud woh user hai
@PreAuthorize("hasRole('ADMIN') or #userId == authentication.name")
public User getUserById(String userId) { ... }

// Custom permission check
@PreAuthorize("hasPermission(#orderId, 'Order', 'READ')")
public Order getOrder(Long orderId) { ... }

// Method parameter se condition
@PreAuthorize("#amount <= authentication.principal.withdrawalLimit")
public void withdraw(BigDecimal amount) { ... }
```

### @Scheduled — Cron Job Ka Expression Config Se Lo

Cleanup job ka cron expression hardcode mat karo — config mein rakhao:

```java
// Cron expression application.yml se lo
@Scheduled(cron = "${jobs.cleanup.cron}")
public void cleanupExpiredSessions() {
    sessionRepository.deleteExpiredSessions();
}

// Fixed delay bhi config se
@Scheduled(fixedDelayString = "${jobs.retry.delay-ms}")
public void retryFailedPayments() {
    paymentService.retryPendingTransactions();
}
```

```yaml
# application.yml
jobs:
  cleanup:
    cron: "0 0 2 * * *"      # Roz raat 2 baje
  retry:
    delay-ms: 30000           # 30 seconds
```

### @ConditionalOnExpression — Bean Conditionally Create Karo

CRED jaise app mein Redis cache sirf tab enable karo jab config mein explicitly on kiya ho:

```java
@Bean
@ConditionalOnExpression("'${cache.type}' == 'redis' && ${cache.enabled:false}")
public CacheManager redisCacheManager() {
    // Sirf tab create hoga jab cache.type=redis aur cache.enabled=true
    return new RedisCacheManager(...);
}

@Bean
@ConditionalOnExpression("${feature.payments.enabled:false}")
public PaymentGateway razorpayGateway() {
    return new RazorpayGateway();
}
```

---

## Complete Real-World Example — Delivery App Config

Yeh dekho ek complete example jo production mein actual use hota hai:

```yaml
# application.yml — Swiggy-style delivery app config
app:
  name: SwiggyClone
  retry-count: 3
  enabled-features: payments,notifications,live-tracking
  fee-rate: 0.025                        # 2.5% delivery fee
  max-order-amount: 5000
  admin-emails:
    - ops@swiggy.com
    - admin@swiggy.com
  premium-cities:
    - Mumbai
    - Bangalore
    - Delhi
```

```java
@Service
public class DeliveryConfigService {

    // Simple int injection
    @Value("${app.retry-count}")
    private int retryCount;  // = 3

    // Comma-separated string → List automatically split hoti hai Spring se
    @Value("${app.enabled-features}")
    private List<String> features;  // = ["payments", "notifications", "live-tracking"]

    // BigDecimal injection — floating point precision ke liye
    @Value("${app.fee-rate}")
    private BigDecimal feeRate;  // = 0.025

    // YAML list → Java List
    @Value("${app.admin-emails}")
    private List<String> adminEmails;  // = ["ops@swiggy.com", "admin@swiggy.com"]

    // SpEL se explicitly split karo (alternative approach)
    @Value("#{ '${app.enabled-features}'.split(',') }")
    private String[] featuresArray;

    // SpEL mein math — fee rate ko percentage mein convert karo
    @Value("#{ ${app.fee-rate} * 100 }")
    private BigDecimal feePercent;  // = 2.5

    // Conditional value — production pe strict limit, warna relaxed
    @Value("#{ '${spring.profiles.active:dev}' == 'prod' ? ${app.max-order-amount} : 99999 }")
    private int effectiveMaxOrder;

    // Premium cities count — SpEL se list ki size
    @Value("#{${app.premium-cities}.size()}")
    private int premiumCityCount;

    // App start time — injection ke time jo bhi current time ho
    @Value("#{ T(java.time.LocalDateTime).now().toString() }")
    private String startedAt;

    // System info — JVM ka info access karo
    @Value("#{systemProperties['java.version']}")
    private String javaVersion;

    // Environment variable — OS level
    @Value("#{systemEnvironment['HOME'] ?: '/default/home'}")
    private String homeDirectory;
}
```

---

## Programmatic SpEL Evaluation — Code Mein SpEL Run Karo

Yeh advanced use case hai — jab tumhe runtime pe dynamically expressions evaluate karne hon. Libraries banate waqt ya rules engine mein useful hota hai:

```java
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.StandardEvaluationContext;

@Service
public class DynamicRuleEngine {

    private final ExpressionParser parser = new SpelExpressionParser();

    public boolean evaluateRule(String ruleExpression, Object targetObject) {
        // Expression parse karo
        Expression exp = parser.parseExpression(ruleExpression);

        // Evaluation context set karo — variables inject karo
        StandardEvaluationContext ctx = new StandardEvaluationContext(targetObject);
        ctx.setVariable("currentTime", LocalDateTime.now());
        ctx.setVariable("userTier", "PREMIUM");

        // Evaluate karo
        return exp.getValue(ctx, Boolean.class);
    }

    // Example: Discount eligibility check
    public double calculateDiscount(Order order, String discountRule) {
        // discountRule could be: "totalAmount > 500 ? 0.1 : 0.05"
        ExpressionParser parser = new SpelExpressionParser();
        StandardEvaluationContext ctx = new StandardEvaluationContext();
        ctx.setVariable("totalAmount", order.getTotalAmount());
        ctx.setVariable("itemCount", order.getItems().size());
        ctx.setVariable("isFirstOrder", order.isFirstOrder());

        return parser.parseExpression(discountRule)
                     .getValue(ctx, Double.class);
    }
}
```

> [!warning] SECURITY ALERT — Yeh Bahut Important Hai
> **Kabhi bhi user input ko directly SpEL mein evaluate mat karo.** Yeh Remote Code Execution (RCE) vulnerability create karta hai — attacker tumhare server pe kuch bhi run kar sakta hai. Agar rules database se aa rahe hain, toh pehle sanitize karo ya safe expression language use karo.
> ```java
> // GALAT — Kabhi mat karo
> String userInput = request.getParam("rule");
> parser.parseExpression(userInput).getValue(ctx); // DANGEROUS!
>
> // SAHI — Whitelist-based approach
> if (allowedRules.contains(ruleId)) {
>     parser.parseExpression(PREDEFINED_RULES.get(ruleId)).getValue(ctx);
> }
> ```

---

## Gotchas — Common Mistakes Jo Beginners Karte Hain

> [!warning] Mistake #1 — `${}` aur `#{}` Mix Karna
> `${}` pehle resolve hota hai, phir `#{}` evaluate hota hai. Agar property value ko SpEL mein use karna hai, toh quote-wrap karo:
> ```java
> // GALAT — yeh kaam nahi karega
> @Value("#{ ${app.mode} == 'prod' ? 100 : 10 }")
>
> // SAHI — property ko string mein wrap karo SpEL ke andar
> @Value("#{ '${app.mode}' == 'prod' ? 100 : 10 }")
> ```

> [!warning] Mistake #2 — Missing Property Ke Liye No Default
> Agar property `application.yml` mein nahi hai aur default nahi diya, toh **startup pe app crash ho jaayega** `IllegalArgumentException` ke saath. Hamesha default do critical nahi hone wali properties ke liye:
> ```java
> // GALAT — agar app.feature.xyz nahi mili toh crash
> @Value("${app.feature.xyz}")
> private boolean featureEnabled;
>
> // SAHI — default false rakhao
> @Value("${app.feature.xyz:false}")
> private boolean featureEnabled;
> ```

> [!warning] Mistake #3 — Constructor Mein @Value Use Karna
> `@Value` injection **construction ke baad** hoti hai. Constructor ke andar injected value use karne ki koshish mat karo:
> ```java
> // GALAT — constructor ke andar port ka value nahi aaya abhi
> @Service
> public class MyService {
>     @Value("${server.port}")
>     private int port;
>
>     public MyService() {
>         System.out.println(port); // 0 print hoga — default int value!
>     }
> }
>
> // SAHI Option 1 — @PostConstruct use karo
> @PostConstruct
> public void init() {
>     System.out.println(port); // Ab sahi value aayegi
> }
>
> // SAHI Option 2 — Constructor injection (recommended)
> public MyService(@Value("${server.port}") int port) {
>     this.port = port;
>     System.out.println(port); // Seedha constructor mein aa gaya
> }
> ```

> [!warning] Mistake #4 — Static Fields Pe @Value
> Spring beans ke static fields pe `@Value` kaam nahi karta — Spring instance-level injection karta hai, static pe nahi:
> ```java
> // GALAT — static field pe inject nahi hoga
> @Value("${app.name}")
> private static String appName; // null rahega!
>
> // SAHI — non-static rakhao ya setter use karo
> @Value("${app.name}")
> private String appName; // Yeh kaam karega
> ```

> [!warning] Mistake #5 — Type Mismatch
> Config mein `"abc"` hai aur Java field `int` — conversion error aayegi startup pe:
> ```yaml
> app:
>   count: "not-a-number"  # Yeh galat hai
> ```
> ```java
> @Value("${app.count}")
> private int count; // NumberFormatException at startup!
> ```

> [!warning] Mistake #6 — @Value on @Bean Method Parameters (Unusual Behavior)
> `@Configuration` class mein `@Bean` method ke parameters pe `@Value` differently behave karta hai. Zyada reliable hai ki `@Value` field injection use karo ya `Environment` object inject karo:
> ```java
> // Reliable alternative — Environment inject karo
> @Autowired
> private Environment env;
>
> public void someMethod() {
>     String port = env.getProperty("server.port", "8080");
> }
> ```

---

## Quick Reference Card

| Zaroorat | Use |
|---|---|
| Config string inject karo | `@Value("${property.name}")` |
| Default ke saath inject karo | `@Value("${property.name:defaultValue}")` |
| List inject karo (comma-separated) | `@Value("${property.name}")` on `List<String>` |
| Startup pe compute karo | `@Value("#{expression}")` |
| Doosre bean ka method call karo | `@Value("#{@beanName.methodName()}")` |
| Static method call karo | `@Value("#{T(FullyQualifiedClass).method()}")` |
| Conditional bean create karo | `@ConditionalOnExpression("#{...}")` |
| Cache key define karo | `@Cacheable(key = "#paramName")` |
| Security check karo | `@PreAuthorize("hasRole('X') or #id == auth.name")` |
| List filter karo | `#{list.?[condition]}` |
| List se property extract karo | `#{list.![propertyName]}` |

---

## Key Takeaways

- **SpEL do kaam karta hai:** `${}` config properties resolve karta hai, `#{}` actual expression evaluate karta hai — dono ka fark samajhna sabse zaroori hai
- **@Value** sabse common use case hai — single property inject karne ke liye perfect, grouped config ke liye `@ConfigurationProperties` prefer karo
- **Bean references annotation mein** — `#{@beanName.method()}` se ek bean doosre ka method startup pe call kar sakta hai, yeh SpEL ki real power hai
- **Collection operations** — `.?[filter]` aur `.![projection]` se list ke upar filter aur map operations annotation mein hi kar sakte ho
- **Security annotations mein** SpEL bahut kaam aata hai — `@PreAuthorize`, `@PostAuthorize`, `@Cacheable` sab mein expressions likhte hain
- **Constructor mein @Value use mat karo** — injection construction ke baad hoti hai; `@PostConstruct` ya constructor-parameter injection use karo
- **User input kabhi SpEL mein evaluate mat karo** — RCE vulnerability create hoti hai; yeh production security risk hai
- **Default values hamesha do** non-critical properties ke liye — `${property:default}` se startup crash se bachao
- **Static fields pe @Value kaam nahi karta** — hamesha instance fields pe use karo
- **Node.js comparison:** `process.env.VAR` → `@Value("${VAR}")`, JavaScript expression → `@Value("#{expression}")`, optional chaining `?.` → SpEL ka Elvis `?:`
