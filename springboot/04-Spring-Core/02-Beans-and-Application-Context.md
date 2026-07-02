# Beans aur ApplicationContext — Spring ka Dil

Socho ek second ke liye — Zomato ka backend kaise kaam karta hoga? Hazaron orders, restaurants, delivery partners, payments — sab ek saath chal rahe hain. Har service ko doosri service ki zarurat hoti hai. `OrderService` ko `PaymentService` chahiye, `PaymentService` ko `DatabaseService` chahiye, `NotificationService` ko dono chahiye.

Ab agar ye sab manually manage karna pade — "pehle yeh object banao, phir usse wahan pass karo, phir yeh service initialize karo" — toh code ek spider web ban jaayega. Maintenance nightmare.

Yahi problem solve karta hai **Spring ka ApplicationContext** aur **Beans** ka concept.

> [!info] Node.js/TypeScript developer ke liye
> Agar tumne Express mein kaam kiya hai, toh tumne zaroor ek pattern dekha hoga — `db.js` file mein connection banao, `export` karo, har jagah `import` karo. Kuch log ek central `container.js` file banate hain jahan saari dependencies registered hoti hain. Spring ka **ApplicationContext** exactly yahi kaam karta hai — lekin steroids pe. Yeh ek giant `Map<Type, Instance>` hai jo tumhare pure application ke saare singletons hold karta hai. Ek baar wahan register karo, Spring khud inject kar dega jahan chahiye.

---

## Bean kya hota hai? (Aur kyun chahiye?)

**Bean** ek simple concept hai — koi bhi object jo Spring container manage karta hai, woh bean hai.

Itna hi. Koi special interface implement nahi karna, koi parent class extend nahi karna. Bas Spring ko batao "yaar, is object ko tu manage kar" — aur Spring uski poori zindagi sambhal leta hai: kab banao, kab destroy karo, kiske saath inject karo.

### Node.js se comparison

TypeScript mein tum kuch aisa karte ho:

```typescript
// Manually sab kuch wire karo
const db = new DatabaseService(config);
const userRepo = new UserRepository(db);
const authService = new AuthService(userRepo, jwtSecret);
const userController = new UserController(authService);

app.use('/users', userController.router);
```

Spring mein? Tum bas annotations lagate ho, baaki Spring karta hai:

```java
@Repository
public class UserRepository { /* ... */ }

@Service
public class AuthService {
    private final UserRepository userRepo;
    // Spring khud inject kar dega
    public AuthService(UserRepository userRepo) {
        this.userRepo = userRepo;
    }
}

@RestController
public class UserController {
    private final AuthService authService;
    public UserController(AuthService authService) {
        this.authService = authService;
    }
}
```

Koi manual wiring nahi. Koi `new` keyword nahi (mostly). Spring ne sab dekh liya.

---

## Bean kaisa banta hai?

Ek class bean tab banti hai jab:

### Tarika 1: Stereotype Annotations

```java
@Component          // Generic bean
public class Clock { /* ... */ }

@Service            // Business logic layer
public class OrderService { /* ... */ }

@Repository         // Data access layer (DB wali classes)
public class OrderRepository { /* ... */ }

@Controller         // Web layer (MVC ke liye)
public class HomeController { /* ... */ }

@RestController     // Web layer (REST APIs ke liye) = @Controller + @ResponseBody
public class OrderApiController { /* ... */ }
```

Ye saare basically `@Component` ke hi specialized versions hain. `@Service`, `@Repository`, `@Controller` — functionally sab `@Component` jaisa hi kaam karta hai, lekin:
- **Readability** badhti hai — dekh ke pata chalta hai yeh class kya kaam karti hai
- **AOP** (Aspect-Oriented Programming) ke liye helpful hai — Spring kuch specific behavior apply kar sakta hai (jaise `@Repository` pe database exceptions ko Spring exceptions mein convert karta hai)

### Tarika 2: @Bean Method in @Configuration Class

Yeh tab use karte hain jab:
- Third-party library ki class hai (jaise `ObjectMapper`, `RestTemplate`) — uspe `@Component` nahi laga sakte
- Object banane ke liye complex logic chahiye
- Multiple variants chahiye ek hi type ke

```java
@Configuration
public class AppConfig {

    // Ye bean Spring context mein register ho jaayega
    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        // Custom configuration
        mapper.setSerializationInclusion(JsonInclude.Include.NON_NULL);
        mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        return mapper;
    }

    // Ye bhi bean hai — Razorpay/Payment gateway ka client
    @Bean
    public PaymentGatewayClient paymentClient() {
        return new RazorpayClient("key_id", "key_secret");
    }
}
```

---

## ApplicationContext — Spring ka Brain

`ApplicationContext` Spring ka IoC (Inversion of Control) container hai. Yeh ek powerful object hai jo tumhari pure application ki dependency graph maintain karta hai.

Iska kaam kya hai? Yeh karta hai:

| Kaam | Explanation |
|------|-------------|
| **Discover** | Scan karo classes (component scan, config classes) |
| **Instantiate** | Beans banao, sahi order mein (dependencies pehle) |
| **Inject** | Dependencies wire karo |
| **Lifecycle manage** | `@PostConstruct`, `@PreDestroy` call karo |
| **Events publish** | Application events fire karo |
| **Environment resolve** | Properties, profiles, env variables |

### Zomato Analogy

Socho ApplicationContext ek **master kitchen manager** hai Zomato ke central kitchen mein.

- Jab kitchen start hoti hai, woh pehle dekha khaana banane ke liye kya kya chahiye (dependencies discover karna)
- Phir sahi order mein sab prepare karta hai — pehle masala pisna, phir gravy banana, phir dish assemble karna (topological ordering)
- Jab ek chef (service) ko dusre chef ki zarurat hai, manager arrange kar deta hai (dependency injection)
- Koi chef beemar pade toh cleanup bhi karta hai (lifecycle management)

---

## ApplicationContext ka Code Example

### Spring Boot mein Context Inspect karna

```java
@SpringBootApplication
public class App implements CommandLineRunner {

    // ApplicationContext khud bhi ek bean hai — inject ho sakta hai
    private final ApplicationContext ctx;

    public App(ApplicationContext ctx) {
        this.ctx = ctx;
    }

    public static void main(String[] args) {
        SpringApplication.run(App.class, args);
    }

    @Override
    public void run(String... args) {
        // Kitne beans hain? (Spring Boot mein 200-300 bhi ho sakte hain)
        System.out.println("Total beans: " + ctx.getBeanDefinitionCount());

        // Saare bean names print karo
        for (String name : ctx.getBeanDefinitionNames()) {
            System.out.println(name);
        }

        // Type se bean fetch karo — recommended tarika
        ObjectMapper mapper = ctx.getBean(ObjectMapper.class);

        // Name se bean fetch karo
        Clock clock = (Clock) ctx.getBean("clock");
    }
}
```

> [!warning] `getBean()` seedha mat call karo
> Yeh **Service Locator anti-pattern** hai. Jab tum context se directly bean fetch karte ho, toh dependencies hidden ho jaati hain aur testing mushkil ho jaata hai. Constructor injection use karo — Spring khud inject kar dega.

### Manual Context (bina Spring Boot ke)

Agar tum pure Spring use kar rahe ho (Spring Boot nahi), toh manually context banana padta hai:

```java
public class Main {
    public static void main(String[] args) {
        // AnnotationConfigApplicationContext = annotation-based config ke liye
        var ctx = new AnnotationConfigApplicationContext(AppConfig.class);

        UserService svc = ctx.getBean(UserService.class);
        svc.doWork();

        // Context band karo — @PreDestroy methods trigger honge
        ctx.close();
    }
}
```

Spring Boot mein yeh sab automatically hota hai. `SpringApplication.run()` context banata, start karta, aur JVM shutdown pe close bhi karta hai.

---

## Bean Naming — Spring kaise naam deta hai?

Default rule simple hai: **class name ka pehla letter lowercase** kar do.

| Class Name | Bean Name |
|-----------|-----------|
| `UserService` | `userService` |
| `OrderRepository` | `orderRepository` |
| `PaymentGatewayClient` | `paymentGatewayClient` |
| `JSONParser` | `JSONParser` (special case — agar 2+ consecutive uppercase letters hain toh as-is rahega) |

### Custom naam dena

```java
// @Component pe
@Component("mySpecialClock")
public class Clock { /* ... */ }

// @Bean pe
@Bean(name = "razorpayClient")
public PaymentClient paymentClient() {
    return new RazorpayClient();
}

// Multiple names bhi de sakte ho
@Bean(name = {"primaryDs", "mainDataSource"})
public DataSource primaryDataSource() {
    return new HikariDataSource(config);
}
```

---

## Ek Type ke Multiple Beans — `@Qualifier` aur `@Primary`

Yeh ek common scenario hai. Socho tumhare paas 2 databases hain — ek main database (Postgres) aur ek audit database (MySQL). Dono `DataSource` type ke beans hain. Spring confuse ho jaayega — kaunsa inject karun?

```java
@Configuration
public class DataSourceConfig {

    @Bean
    @Primary  // Default injection mein yeh use hoga
    public DataSource primaryDataSource() {
        // Main Postgres DB
        HikariDataSource ds = new HikariDataSource();
        ds.setJdbcUrl("jdbc:postgresql://localhost/main_db");
        return ds;
    }

    @Bean
    public DataSource auditDataSource() {
        // Audit MySQL DB
        HikariDataSource ds = new HikariDataSource();
        ds.setJdbcUrl("jdbc:mysql://localhost/audit_db");
        return ds;
    }
}
```

```java
@Repository
public class OrderRepository {

    private final DataSource primaryDs;   // @Primary wala auto-inject hoga
    private final DataSource auditDs;     // @Qualifier se specific maango

    public OrderRepository(
        DataSource primaryDs,  // yeh @Primary wala milega
        @Qualifier("auditDataSource") DataSource auditDs  // explicitly maango
    ) {
        this.primaryDs = primaryDs;
        this.auditDs = auditDs;
    }
}
```

---

## Context Kaise Boot Hota Hai — Step by Step

Yeh samajhna bahut important hai. Jab tumhara Spring Boot app start hota hai, yeh sab hota hai sequence mein:

```
Step 1: @Configuration classes aur @ComponentScan paths read karo
        → Spring decide karta hai kahan-kahan scan karna hai

Step 2: BeanDefinitions banao
        → Yeh metadata hai: class kya hai, scope kya hai, dependencies kya hain
        → Actual objects abhi nahi bane

Step 3: Dependency graph banao (topological sort)
        → A depends on B, B depends on C → C pehle banega, phir B, phir A

Step 4: Singleton beans instantiate karo
        → Constructors call ho rahe hain

Step 5: Dependencies inject karo
        → Constructor injection, field injection, setter injection

Step 6: @PostConstruct methods call karo
        → Initialization logic run ho

Step 7: ContextRefreshedEvent publish karo
        → Listeners ko signal milta hai

Step 8: App "ready" hai
        → Requests accept karna shuru
```

**Circular dependency ka chakkar:**
Agar A ka constructor B maangta hai, aur B ka constructor A maangta hai — Spring Step 3 pe hi pakad lega aur startup fail kar dega. Yeh intentional hai — better hai startup pe fail ho rather than runtime pe weird behavior ho.

> [!tip] Circular dependency solve kaise karein?
> Usually circular dependency ka matlab hai design problem hai. Refactor karo — ek common service/component nikalo jisko dono use kar sakein. Last resort pe `@Lazy` use karo ya setter injection — lekin pehle architecture rethink karo.

---

## BeanFactory vs ApplicationContext — Kya fark hai?

| Feature | BeanFactory | ApplicationContext |
|---------|-------------|-------------------|
| Basic DI | Haan | Haan |
| Eager singleton initialization | Nahi (lazy) | Haan |
| Event publishing | Nahi | Haan |
| i18n (MessageSource) | Nahi | Haan |
| Environment/Properties | Nahi | Haan |
| AOP integration | Limited | Full |

**Short answer**: `BeanFactory` bare minimum DI container hai. `ApplicationContext` uska superset hai — yahi hamesha use karo. Spring Boot automatically `ApplicationContext` use karta hai.

---

## Application Events — Spring ka EventEmitter

TypeScript mein tum `EventEmitter` use karte ho — Spring mein iska equivalent `ApplicationEventPublisher` hai, lekin type-safe aur bean-aware.

### Practical Example: Order Place Hone pe Email Bhejo

```java
// Custom event class — Java record (TS interface jaisa)
public record OrderPlacedEvent(Long orderId, String customerEmail) {}
```

```java
// Event publish karne wali service
@Service
public class OrderService {

    private final OrderRepository orderRepo;
    private final ApplicationEventPublisher publisher;

    public OrderService(OrderRepository orderRepo, ApplicationEventPublisher publisher) {
        this.orderRepo = orderRepo;
        this.publisher = publisher;
    }

    public Order placeOrder(OrderRequest request) {
        // Order save karo database mein
        Order order = orderRepo.save(new Order(request));

        // Event fire karo — EmailService ko directly couple mat karo
        publisher.publishEvent(new OrderPlacedEvent(order.getId(), request.getEmail()));

        return order;
    }
}
```

```java
// Event sun-ne wali service — OrderService ko pata bhi nahi
@Component
public class EmailNotificationListener {

    @EventListener
    public void onOrderPlaced(OrderPlacedEvent event) {
        System.out.println("Email bhej rahe hain: " + event.customerEmail());
        System.out.println("Order ID: " + event.orderId());
        // Email sending logic yahan
    }
}

// Ek aur listener — analytics ke liye
@Component
public class AnalyticsListener {

    @EventListener
    public void onOrderPlaced(OrderPlacedEvent event) {
        // Analytics track karo
        System.out.println("Analytics: Order " + event.orderId() + " placed");
    }
}
```

Yeh pattern **Open/Closed Principle** follow karta hai — `OrderService` mein koi change nahi karni, bas ek naya listener add karo. Exactly jaise Node.js mein `emitter.on('orderPlaced', handler)` add karte ho.

> [!info] Async Events
> Default pe events synchronous hain — same thread mein run hote hain. Agar email bhejne mein time lagta hai toh order response delay hoga. `@Async` annotation use karo listener pe aur Spring Boot mein `@EnableAsync` add karo — tab listener alag thread mein run hoga.

```java
@Component
public class EmailNotificationListener {

    @EventListener
    @Async  // Alag thread mein run karega — order response block nahi hoga
    public void onOrderPlaced(OrderPlacedEvent event) {
        // Slow email sending logic
    }
}
```

---

## Context Refresh Events — Built-in Events

Spring khud bhi kuch events fire karta hai jo tum sun sakte ho:

```java
@Component
public class AppStartupListener {

    // Jab context fully ready ho jaaye
    @EventListener(ContextRefreshedEvent.class)
    public void onContextReady() {
        System.out.println("App ready! Cache warm up karte hain...");
        // Cache warm-up, initial data load, etc.
    }

    // Jab application start ho jaaye (Spring Boot specific)
    @EventListener(ApplicationReadyEvent.class)
    public void onAppReady() {
        System.out.println("HTTP requests accept karna shuru!");
    }
}
```

---

## Gotchas — Common Mistakes Jo Beginners Karte Hain

> [!warning] Gotcha #1: Constructor mein `getBean()` mat karo
> ```java
> @Service
> public class UserService {
>     public UserService(ApplicationContext ctx) {
>         // GALAT! Context abhi fully built nahi hua
>         // Doosre beans abhi exist nahi karte
>         OrderService os = ctx.getBean(OrderService.class); // Exception!
>     }
> }
> ```
> Constructor injection use karo — Spring sahi order mein inject karega.

> [!warning] Gotcha #2: `getBean()` everywhere — Service Locator Pattern
> ```java
> // GALAT tarika
> @Service
> public class OrderService {
>     @Autowired
>     private ApplicationContext ctx;
>
>     public void process() {
>         PaymentService ps = ctx.getBean(PaymentService.class); // BAD
>         ps.charge();
>     }
> }
>
> // SAHI tarika
> @Service
> public class OrderService {
>     private final PaymentService paymentService;
>
>     public OrderService(PaymentService paymentService) { // Constructor injection
>         this.paymentService = paymentService;
>     }
>
>     public void process() {
>         paymentService.charge(); // Clean!
>     }
> }
> ```

> [!warning] Gotcha #3: Same type ke 2 beans, same name — Override ya Error
> ```java
> @Bean
> public DataSource dataSource() { return new HikariDataSource(config1); }
>
> // Kahin aur
> @Bean
> public DataSource dataSource() { return new HikariDataSource(config2); } // Conflict!
> ```
> Default pe Spring Boot `BeanDefinitionOverrideException` throw karta hai. Agar purana behavior chahiye:
> ```properties
> spring.main.allow-bean-definition-overriding=true
> ```
> Lekin yeh dangerous hai — silently wrong bean inject ho sakta hai. Better hai names alag rakho.

> [!warning] Gotcha #4: Tests mein manually context close karna
> ```java
> // GALAT
> @SpringBootTest
> class MyTest {
>     @Autowired ApplicationContext ctx;
>
>     @Test
>     void test() {
>         // kuch karo
>         ((ConfigurableApplicationContext) ctx).close(); // BAD — doosre tests break honge
>     }
> }
> ```
> `@SpringBootTest` khud lifecycle manage karta hai. Test ke beech context mat close karo.

> [!warning] Gotcha #5: @PostConstruct mein slow operations
> ```java
> @Component
> public class CacheLoader {
>     @PostConstruct
>     public void loadCache() {
>         // 10 seconds ka DB call — app 10 sec tak start nahi hogi!
>         loadMillionRecordsFromDB();
>     }
> }
> ```
> Heavy initialization ke liye `ApplicationReadyEvent` listen karo, ya `@Async` use karo.

> [!warning] Gotcha #6: Field Injection se testing mushkil
> ```java
> // GALAT — testing mein inject nahi kar sakte easily
> @Service
> public class OrderService {
>     @Autowired
>     private PaymentService paymentService; // Field injection
> }
>
> // SAHI — constructor injection se mock easily inject karo
> @Service
> public class OrderService {
>     private final PaymentService paymentService;
>
>     public OrderService(PaymentService paymentService) {
>         this.paymentService = paymentService;
>     }
> }
>
> // Test mein
> class OrderServiceTest {
>     @Test
>     void test() {
>         PaymentService mockPayment = mock(PaymentService.class);
>         OrderService service = new OrderService(mockPayment); // Easy!
>     }
> }
> ```

---

## Real World Example — Ek Mini Zomato Order System

Ab sab cheez saath mein dekho:

```java
// Events
public record OrderPlacedEvent(Long orderId, String restaurantId, String customerId) {}
public record OrderCancelledEvent(Long orderId, String reason) {}
```

```java
// Repository layer
@Repository
public class OrderRepository {
    private final DataSource dataSource;

    public OrderRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    public Order save(Order order) {
        // DB logic
        return order;
    }
}
```

```java
// Service layer
@Service
public class OrderService {

    private final OrderRepository orderRepo;
    private final ApplicationEventPublisher eventPublisher;

    public OrderService(OrderRepository orderRepo, ApplicationEventPublisher eventPublisher) {
        this.orderRepo = orderRepo;
        this.eventPublisher = eventPublisher;
    }

    public Order placeOrder(String restaurantId, String customerId, List<String> items) {
        Order order = new Order(restaurantId, customerId, items);
        Order saved = orderRepo.save(order);

        // Event publish karo — baaki services khud handle karengi
        eventPublisher.publishEvent(
            new OrderPlacedEvent(saved.getId(), restaurantId, customerId)
        );

        return saved;
    }
}
```

```java
// Notification listener
@Component
public class NotificationService {

    @EventListener
    @Async
    public void onOrderPlaced(OrderPlacedEvent event) {
        System.out.println("Push notification bhej rahe hain customer ko: " + event.customerId());
    }
}

// Restaurant listener
@Component
public class RestaurantNotifier {

    @EventListener
    @Async
    public void onOrderPlaced(OrderPlacedEvent event) {
        System.out.println("Restaurant ko order mila: " + event.restaurantId());
    }
}

// Analytics listener
@Component
public class OrderAnalytics {

    @EventListener
    @Async
    public void onOrderPlaced(OrderPlacedEvent event) {
        System.out.println("Analytics: New order #" + event.orderId());
    }
}
```

```java
// Controller layer
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    public ResponseEntity<Order> placeOrder(@RequestBody OrderRequest request) {
        Order order = orderService.placeOrder(
            request.restaurantId(),
            request.customerId(),
            request.items()
        );
        return ResponseEntity.ok(order);
    }
}
```

Spring ne automatically:
- `DataSource` bean inject kiya `OrderRepository` mein
- `OrderRepository` inject kiya `OrderService` mein
- `ApplicationEventPublisher` inject kiya `OrderService` mein
- `OrderService` inject kiya `OrderController` mein
- Saare listeners register kiye `OrderPlacedEvent` ke liye

Tum sirf logic likho — wiring Spring kare.

---

## Key Takeaways

- **Bean** = koi bhi object jo Spring container manage karta hai. `@Component`, `@Service`, `@Repository`, `@Controller` ya `@Bean` method se register hota hai.

- **ApplicationContext** = Spring ka master container. Beans discover karta hai, instantiate karta hai, dependencies inject karta hai, lifecycle manage karta hai, events publish karta hai.

- **Startup sequence** ka order samjho — BeanDefinitions pehle, phir instantiation, phir injection, phir `@PostConstruct`. Circular deps startup pe hi fail karte hain.

- **Constructor injection** > field injection. Testing easy hoti hai, immutability milti hai, circular deps startup pe pakad aate hain.

- **`getBean()` directly mat call karo** — Service Locator anti-pattern hai. Dependencies inject karwao.

- **Bean naming** default mein camelCase class name hai. `@Component("name")` ya `@Bean(name="name")` se override karo.

- **`@Primary` aur `@Qualifier`** — same type ke multiple beans hone pe ye decide karte hain kaunsa inject ho.

- **Events** — loose coupling ke liye powerful tool. `ApplicationEventPublisher` se fire karo, `@EventListener` se sun-no. `@Async` add karo non-blocking ke liye.

- **`BeanFactory` vs `ApplicationContext`** — hamesha `ApplicationContext` use karo. `BeanFactory` sirf bare-minimum DI hai, events/i18n/env kuch nahi.
