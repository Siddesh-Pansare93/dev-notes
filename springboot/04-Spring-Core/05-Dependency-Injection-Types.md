# Dependency Injection ke Teeno Types — Constructor, Setter, Field

Socho ek second ke liye. Tum Zomato ka backend bana rahe ho. Ek `OrderService` hai jo orders handle karta hai. Us service ko kaam karne ke liye chahiye — `PaymentGateway` (payment process karne ke liye), `NotificationService` (customer ko SMS/email bhejne ke liye), aur `OrderRepository` (database mein save karne ke liye).

Ab sawaal yeh hai — yeh teeno cheezein `OrderService` ke paas kaise pahunchegi?

Option 1: `OrderService` khud hi `new PaymentGateway()` kar le. Lekin yeh toh galat hai — tight coupling ho jaayegi, testing mushkil ho jaayegi.

Option 2: Koi bahar se de de. Yahi hai **Dependency Injection** — aur Spring yahi karta hai. Lekin Spring ke paas inject karne ke teen tarike hain, aur teeno ke trade-offs alag hain. Yahi is note ka topic hai.

> [!info] Node.js/TypeScript waalon ke liye
> TypeScript mein tum constructor mein `private readonly gateway: PaymentGateway` likhte ho — yahi hai constructor injection. Spring ka recommended approach bilkul wohi hai. Agar NestJS use kiya hai, toh `@Injectable()` aur constructor injection already familiar hai tumhe.

---

## Teen Tarike Dependency Inject Karne Ke

### 1. Constructor Injection — The Gold Standard

Yeh sabse best approach hai. Dependencies constructor ke through di jaati hain, matlab jab object banta hai, tabhi saari dependencies ready hoti hain. Ek baar ban gaya object — mutable nahi, sab kuch `final`.

```java
@Service
public class OrderService {

    // final — matlab ek baar set, phir change nahi hoga. Immutability!
    private final PaymentGateway gateway;
    private final OrderRepository orderRepo;
    private final NotificationService notifier;

    // Spring is constructor ko dhundhega aur automatically inject karega
    public OrderService(PaymentGateway gateway,
                        OrderRepository orderRepo,
                        NotificationService notifier) {
        this.gateway = gateway;
        this.orderRepo = orderRepo;
        this.notifier = notifier;
    }

    public Order placeOrder(Cart cart) {
        Order order = orderRepo.save(cart.toOrder());
        gateway.charge(order.getTotal());
        notifier.sendConfirmation(order.getCustomerEmail());
        return order;
    }
}
```

Yahan kya ho raha hai:
- Constructor mein jo bhi parameters hain, Spring unhe IoC container se dhundh ke inject karta hai
- `final` use kiya — matlab object ek baar bana, dependencies lock ho gayi — thread-safe, immutable
- Spring 4.3+ mein agar sirf ek constructor hai, toh `@Autowired` likhna bhi zaruri nahi

> [!tip] Lombok ke saath aur bhi clean
> Agar Lombok use kar rahe ho (aur karna chahiye), toh constructor likhne ki zarurat hi nahi. `@RequiredArgsConstructor` annotation sab kuch handle kar leti hai:
>
> ```java
> @Service
> @RequiredArgsConstructor  // Lombok: sab final fields ke liye constructor bana deta hai
> @Slf4j                    // Lombok: log variable inject kar deta hai
> public class OrderService {
>
>     private final PaymentGateway gateway;
>     private final OrderRepository orderRepo;
>     private final NotificationService notifier;
>
>     // Constructor likhne ki zarurat nahi — Lombok ne bana diya behind the scenes!
>
>     public Order placeOrder(Cart cart) {
>         log.info("Order place ho raha hai: {}", cart.getId());
>         Order order = orderRepo.save(cart.toOrder());
>         gateway.charge(order.getTotal());
>         notifier.sendConfirmation(order.getCustomerEmail());
>         return order;
>     }
> }
> ```
>
> Yahi hai modern idiomatic Spring Boot code.

---

### 2. Setter Injection — Optional Dependencies Ke Liye

Setter injection mein Spring pehle object banaata hai (empty constructor se), phir setter methods call karke dependencies inject karta hai.

```java
@Service
public class OrderService {

    private PaymentGateway gateway;
    private AuditLogger auditLogger; // optional dependency — ho toh theek, na ho toh bhi chalega

    // Required dependency — setter pe @Autowired
    @Autowired
    public void setGateway(PaymentGateway gateway) {
        this.gateway = gateway;
    }

    // Optional dependency — required = false matlab agar bean na mile toh error mat do
    @Autowired(required = false)
    public void setAuditLogger(AuditLogger auditLogger) {
        this.auditLogger = auditLogger;
    }

    public void processPayment(Order order) {
        gateway.charge(order.getTotal());

        // Agar AuditLogger available hai tabhi log karo
        if (auditLogger != null) {
            auditLogger.log("Payment done for order: " + order.getId());
        }
    }
}
```

Setter injection kab use karo:
- Jab dependency genuinely optional ho (without it bhi system kaam kare)
- Circular dependency break karne ke liye (emergency mein — design fix karna zyada better hai)
- Plugin-style architecture jahan dependency runtime pe swap ho sakti ho

> [!warning] Setter injection mein `final` nahi likh sakte
> Field `final` nahi ho sakta kyunki Spring pehle object banata hai, phir setter se set karta hai. Iska matlab fields mutable hain — thread safety concern ho sakta hai agar proper synchronization nahi ki.

---

### 3. Field Injection — Lagta Hai Clean, Hai Bilkul Nahi

Yeh sabse zyada "dikh-ne-mein-clean" approach hai — seedha field pe `@Autowired` laga do. Spring reflection use karke directly field mein value set kar deta hai, bina constructor ya setter ke.

```java
@Service
public class OrderService {

    @Autowired
    private PaymentGateway gateway;  // DON'T DO THIS

    @Autowired
    private OrderRepository orderRepo;  // DON'T DO THIS EITHER

    @Autowired
    private NotificationService notifier;  // SERIOUSLY, DON'T

    public Order placeOrder(Cart cart) {
        // Code theek lagta hai, lekin yeh brittle hai
        Order order = orderRepo.save(cart.toOrder());
        gateway.charge(order.getTotal());
        notifier.sendConfirmation(order.getCustomerEmail());
        return order;
    }
}
```

Yeh approach chhodo. Kyon? Abhi batata hoon.

---

## Constructor Injection Kyun Jeet-ta Hai — Complete Breakdown

Chalte hain ek comparison ke saath:

| Concern | Constructor Injection | Setter Injection | Field Injection |
|---|---|---|---|
| `final` fields possible? | **Haan** | Nahi | Nahi |
| Immutable object? | **Haan** | Nahi | Nahi |
| Required deps compile-time enforce? | **Haan** | Nahi | Nahi |
| Spring ke bina test ho sakta hai? | **Haan** (`new` karke) | Haan | **Nahi** (reflection chahiye) |
| Dependencies visible hain? | **Haan** (constructor signature) | Thodi | Bilkul Nahi |
| Circular dep startup pe pakdta hai? | **Haan** (fast fail) | Nahi | Nahi |
| Boilerplate? | Thoda (Lombok se zero) | Medium | Zero (but misleading) |

### Testing ka angle — Yeh sabse bada reason hai

Constructor injection ke saath, test likhna bahut aasaan hai. Spring ka koi involvement nahi chahiye:

```java
// Constructor injection ke saath — CLEAN TEST
class OrderServiceTest {

    @Test
    void shouldChargeCorrectAmount() {
        // Plain Java — no Spring, no magic, no slow context loading
        PaymentGateway mockGateway = Mockito.mock(PaymentGateway.class);
        OrderRepository mockRepo = Mockito.mock(OrderRepository.class);
        NotificationService mockNotifier = Mockito.mock(NotificationService.class);

        // Direct 'new' karo — bilkul Express mein new Service() jaisa
        OrderService service = new OrderService(mockGateway, mockRepo, mockNotifier);

        // Test karo
        Cart cart = TestData.sampleCart();
        service.placeOrder(cart);

        Mockito.verify(mockGateway).charge(cart.getTotal());
    }
}

// Field injection ke saath — PAINFUL TEST
class OrderServiceBadTest {

    @InjectMocks  // Yeh annotation reflection use karta hai — slow, brittle
    private OrderService service;

    @Mock
    private PaymentGateway gateway; // Annotations chahiye

    @Mock
    private OrderRepository repo;

    @BeforeEach
    void setup() {
        MockitoAnnotations.openMocks(this); // Setup boilerplate
    }

    @Test
    void shouldWork() {
        // Ab yahan test likho... agar setup sahi ho gayi toh
    }
}
```

**Node.js analogy:** Socho tum NestJS mein constructor injection use karte ho, toh jest mein seedha `new MyService(mockDep1, mockDep2)` kar sakte ho. Agar field injection use karo toh reflection-based test setup karna padega — zyada complex, zyada slow.

### "8 @Autowired fields" wala signal

Field injection ka ek hidden "benefit" yeh hai ki bahut saari dependencies add karne ka dard nahi hota. Lekin yahi toh problem hai:

```java
// Field injection: 10 dependencies, koi protest nahi
@Service
public class GodService {
    @Autowired private UserRepo userRepo;
    @Autowired private OrderRepo orderRepo;
    @Autowired private PaymentGateway payment;
    @Autowired private EmailService email;
    @Autowired private SmsService sms;
    @Autowired private AuditService audit;
    @Autowired private CacheService cache;
    @Autowired private NotificationHub hub;
    @Autowired private AnalyticsService analytics;
    @Autowired private FraudDetector fraud;
    // ... aur bhi ho sakte hain
}

// Constructor injection: same class — PAIN is visible
@Service
public class GodService {
    public GodService(UserRepo userRepo, OrderRepo orderRepo,
                      PaymentGateway payment, EmailService email,
                      SmsService sms, AuditService audit,
                      CacheService cache, NotificationHub hub,
                      AnalyticsService analytics, FraudDetector fraud) {
        // Yeh constructor dekhke hi samajh aata hai — yeh class TOO BIG hai
        // Single Responsibility Principle toot rahi hai
        // Refactor karo!
    }
}
```

Constructor injection ka "dard" ek natural alarm hai. Jab constructor bada ho jaaye, samajh lo class ko tod-na padega. Field injection yeh alarm mute kar deta hai.

> [!warning] Field injection ek smell hai
> Spring ke khud ke developers aur Spring documentation bhi recommend karte hain constructor injection. IntelliJ IDEA field injection pe warning deta hai by default. Agar kisi codebase mein bahut saare `@Autowired` fields hain, toh woh technical debt hai — aahista aahista constructor injection pe migrate karo.

---

## @Autowired, @Inject, aur @Resource — Kaun Sa Use Karein?

Teen annotations hain jo DI ke liye use ho sakti hain. Confusion natural hai:

| Annotation | Kahan Se Aata Hai | Kaise Resolve Karta Hai |
|---|---|---|
| `@Autowired` | Spring Framework | Type se pehle, phir name se |
| `@Inject` | JSR-330 (`jakarta.inject`) | Sirf type se |
| `@Resource` | JSR-250 (`jakarta.annotation`) | Name se pehle, phir type se |

```java
// @Autowired — Spring specific, type-based
@Autowired
private PaymentGateway gateway;

// @Inject — Standard Java annotation (Spring support karta hai)
@Inject
private PaymentGateway gateway;

// @Resource — Name-based (byName="razorpayGateway" dhundhega pehle)
@Resource(name = "razorpayGateway")
private PaymentGateway gateway;
```

**Practical advice:** Modern Spring mein constructor injection use karo bina kisi annotation ke (single constructor hone pe Spring automatically detect karta hai). Annotation ki zarurat hi nahi padti zyaadatar cases mein.

```java
@Service
@RequiredArgsConstructor
public class OrderService {
    // Koi @Autowired nahi — Spring khud samajh jaata hai
    private final PaymentGateway gateway;
    private final OrderRepository orderRepo;
}
```

---

## Multiple Beans — Ek Type Ke Kai Implementations

Yeh real-world mein bahut common situation hai. Socho Zomato ke notifications — koi SMS chahta hai, koi email, koi WhatsApp. Teen implementations, ek interface.

```java
// Interface define karo
public interface Notifier {
    void send(String userId, String message);
}

// Teen implementations
@Component
public class EmailNotifier implements Notifier {
    @Override
    public void send(String userId, String message) {
        System.out.println("Email bheja " + userId + " ko: " + message);
    }
}

@Component
public class SmsNotifier implements Notifier {
    @Override
    public void send(String userId, String message) {
        System.out.println("SMS bheja " + userId + " ko: " + message);
    }
}

@Component
public class WhatsAppNotifier implements Notifier {
    @Override
    public void send(String userId, String message) {
        System.out.println("WhatsApp message " + userId + " ko: " + message);
    }
}
```

Ab Spring ko kaise pata chalega kaunsa inject karna hai? Teen options hain:

### Option 1: @Primary — Default Bean Mark Karo

```java
@Component
@Primary  // Jab koi explicitly specify na kare, yeh wala default mein use hoga
public class EmailNotifier implements Notifier {
    // ...
}

// Koi aur service sirf Notifier maange toh EmailNotifier milega
@Service
@RequiredArgsConstructor
public class AlertService {
    private final Notifier notifier; // EmailNotifier milega @Primary ki wajah se
}
```

### Option 2: @Qualifier — Explicitly Specify Karo

```java
@Service
public class AlertService {

    private final Notifier primaryNotifier;
    private final Notifier backupNotifier;

    // Exact bean name specify karo @Qualifier mein
    public AlertService(@Qualifier("emailNotifier") Notifier primaryNotifier,
                        @Qualifier("smsNotifier") Notifier backupNotifier) {
        this.primaryNotifier = primaryNotifier;
        this.backupNotifier = backupNotifier;
    }

    public void sendAlert(String userId, String message) {
        try {
            primaryNotifier.send(userId, message);
        } catch (Exception e) {
            // Email fail toh SMS fallback
            backupNotifier.send(userId, message);
        }
    }
}
```

> [!info] Bean name kya hota hai by default?
> `@Component` annotation ke saath class name ka camelCase version bean name ban jaata hai. `EmailNotifier` class ka bean name `emailNotifier` hoga, `SmsNotifier` ka `smsNotifier`. Ya explicitly naam do: `@Component("myCustomName")`.

### Option 3: Sabko Ek Saath Inject Karo — List ya Map Mein

Yeh sabse powerful pattern hai. Sab implementations ek saath chahiye? List inject karo:

```java
@Service
public class BroadcastService {

    private final List<Notifier> allNotifiers;

    // Spring automatically list bana deta hai sabhi Notifier beans ki
    public BroadcastService(List<Notifier> allNotifiers) {
        this.allNotifiers = allNotifiers;
        // allNotifiers = [EmailNotifier, SmsNotifier, WhatsAppNotifier]
    }

    public void broadcast(String userId, String message) {
        // Sab channels pe bhejo ek saath
        allNotifiers.forEach(notifier -> notifier.send(userId, message));
    }
}
```

Ya Map inject karo bean-name ke saath — dynamic dispatch ke liye:

```java
@Service
public class SmartNotificationService {

    // Key = bean name, Value = bean instance
    private final Map<String, Notifier> notifierByChannel;

    public SmartNotificationService(Map<String, Notifier> notifierByChannel) {
        this.notifierByChannel = notifierByChannel;
        // { "emailNotifier": EmailNotifier, "smsNotifier": SmsNotifier, ... }
    }

    public void notify(String userId, String preferredChannel, String message) {
        // User ki preference ke hisaab se channel select karo
        // Zomato jaisa — user ne preferred contact method set kiya hai
        Notifier notifier = notifierByChannel.get(preferredChannel);
        if (notifier != null) {
            notifier.send(userId, message);
        } else {
            // Fallback to email
            notifierByChannel.get("emailNotifier").send(userId, message);
        }
    }
}
```

> [!tip] Map<String, Strategy> Pattern — Bahut Kaam Ka Hai
> Yeh pattern bahut jagah use hota hai — payment gateways (Razorpay, Paytm, Stripe), shipping providers, discount strategies, auth providers. Interface define karo, implementations Spring context mein daalo, Map inject karo, aur runtime pe dispatch karo. No if-else chains, no switch statements. Clean aur extensible.

---

## Optional Dependencies — Jab Dependency "Optional" Ho

Kai baar ek dependency nice-to-have hoti hai — ho toh kaam aur better hoga, na ho toh basic kaam toh chalega.

**Java's Optional ke saath:**

```java
@Service
public class OrderService {

    private final PaymentGateway gateway;
    private final OrderRepository orderRepo;
    private final AuditLogger auditLogger; // Optional — production pe ho sakta hai, dev pe nahi

    public OrderService(PaymentGateway gateway,
                        OrderRepository orderRepo,
                        Optional<AuditLogger> maybeAuditLogger) {
        this.gateway = gateway;
        this.orderRepo = orderRepo;
        // Agar AuditLogger bean nahi hai toh NoopAuditLogger use karo
        this.auditLogger = maybeAuditLogger.orElseGet(NoopAuditLogger::new);
    }
}

// Null object pattern — kuch nahi karta, lekin NullPointerException bhi nahi aata
public class NoopAuditLogger implements AuditLogger {
    @Override
    public void log(String event) {
        // Intentionally khaali — audit nahi karna in this env
    }
}
```

**@Autowired(required = false) ke saath (sirf field/setter injection mein useful):**

```java
@Service
public class OrderService {

    private final PaymentGateway gateway;

    @Autowired(required = false) // Bean nahi mila toh null rahega — handle karo
    private MetricsCollector metrics;

    public OrderService(PaymentGateway gateway) {
        this.gateway = gateway;
    }

    public void processOrder(Order order) {
        gateway.charge(order.getTotal());

        // Null check zaruri hai
        if (metrics != null) {
            metrics.recordOrderProcessed();
        }
    }
}
```

---

## Circular Dependencies — Spring Ka Nightmare

Circular dependency tab hoti hai jab A ko B chahiye aur B ko A chahiye:

```
OrderService → PaymentService → OrderService → ...
```

**Constructor injection ke saath — Spring startup pe hi pakad leta hai:**

```java
@Service
@RequiredArgsConstructor
public class OrderService {
    private final PaymentService paymentService; // PaymentService chahiye
}

@Service
@RequiredArgsConstructor
public class PaymentService {
    private final OrderService orderService; // OrderService chahiye — CIRCULAR!
}

// Yeh code run karo toh Spring startup pe error dega:
// BeanCurrentlyInCreationException: Error creating bean with name 'orderService':
// Requested bean is currently in creation: Is there an unresolvable circular reference?
```

Yeh **good** hai! Fast fail — bug startup pe pakda, runtime pe nahi.

**Field injection ke saath — silently kaam karta hai, problems runtime pe aati hain:**

```java
// Field injection: Spring A banaata hai bina B ke,
// phir B banata hai aur A inject karta hai,
// phir A mein B inject karta hai — cycle "work" karta hai
// Lekin yeh design problem hai jo chhup jaata hai
@Service
public class OrderService {
    @Autowired private PaymentService paymentService; // Circular, but no error at startup
}

@Service
public class PaymentService {
    @Autowired private OrderService orderService; // Same here
}
```

**Circular dependency fix karne ke sahi tarike:**

```java
// Option 1: Extract a third class — sabse clean solution
// OrderService aur PaymentService dono OrderEventPublisher pe depend karein
// instead of ek dusre pe

@Service
@RequiredArgsConstructor
public class OrderService {
    private final OrderRepository orderRepo;
    private final ApplicationEventPublisher eventPublisher; // Framework class, no cycle

    public Order placeOrder(Cart cart) {
        Order order = orderRepo.save(cart.toOrder());
        // Direct PaymentService call nahi — event publish karo
        eventPublisher.publishEvent(new OrderCreatedEvent(order));
        return order;
    }
}

@Service
@RequiredArgsConstructor
public class PaymentService {
    private final PaymentGateway gateway;

    // Event listener — OrderService pe directly depend nahi karta
    @EventListener
    public void onOrderCreated(OrderCreatedEvent event) {
        gateway.charge(event.getOrder().getTotal());
    }
}

// Option 2: @Lazy — Last resort
@Service
public class OrderService {
    private final PaymentService paymentService;

    public OrderService(@Lazy PaymentService paymentService) {
        // PaymentService ko lazily inject karo — Spring proxy bana deta hai
        this.paymentService = paymentService;
    }
}
```

> [!warning] Setter injection se cycle "fix" mat karo
> Kai log setter injection use karke circular dependency "solve" karte hain — Spring allow kar deta hai. Lekin yeh asli solution nahi hai, sirf mute karna hai problem ko. Design ko fix karo — extract karo shared logic, events use karo, ya responsibilities clearly separate karo.

---

## Idiomatic Modern Spring — Complete Example

Yeh hai woh code jo aaj 2024 mein ek experienced Spring developer likhega — Zomato jaisa order checkout flow:

```java
@Service
@RequiredArgsConstructor  // Lombok: constructor automatically generate hoga
@Slf4j                    // Lombok: log variable available hoga
public class CheckoutService {

    // Sab final — immutable, thread-safe
    private final OrderRepository orderRepo;
    private final PaymentGateway paymentGateway;
    private final NotificationService notifier;
    private final ApplicationEventPublisher eventPublisher;
    private final InventoryService inventoryService;

    /**
     * Cart se order banao, payment lo, notification bhejo.
     * Zomato pe "Place Order" button tap karne jaisa.
     */
    @Transactional
    public Order checkout(String userId, CartId cartId) {
        log.info("Checkout start ho raha hai — user: {}, cart: {}", userId, cartId);

        // Inventory check karo pehle
        inventoryService.validateAvailability(cartId);

        // Order create karo
        Order order = orderRepo.createFromCart(userId, cartId);
        log.info("Order create hua: {}", order.getId());

        // Payment lo
        PaymentResult result = paymentGateway.charge(order.getTotal(), userId);
        if (!result.isSuccess()) {
            throw new PaymentFailedException("Payment fail ho gayi: " + result.getErrorCode());
        }

        // Order confirm karo
        order.markConfirmed(result.getTransactionId());
        orderRepo.save(order);

        // Notification bhejo (async ho sakta hai)
        notifier.sendOrderConfirmation(userId, order);

        // Event publish karo — kitchen system, delivery system, etc. sun saktey hain
        eventPublisher.publishEvent(new OrderPlacedEvent(order.getId(), userId));

        log.info("Checkout complete — order: {}", order.getId());
        return order;
    }
}
```

Yeh code:
- Constructor injection use karta hai (Lombok ki wajah se invisible hai boilerplate)
- Sab fields `final` hain
- Testing ke liye trivially mockable hai — `new CheckoutService(mock1, mock2, ...)` karo aur test karo
- Koi `@Autowired` annotation nahi — modern Spring ka standard

---

## Common Gotchas — Beginners Yeh Mistakes Karte Hain

> [!warning] Yeh galtiyan mat karna

**1. Static field pe @Autowired — kaam nahi karta**

```java
@Service
public class ConfigHelper {

    @Autowired
    private static AppConfig config; // WRONG! Static fields Spring inject nahi karta

    // Spring instances pe kaam karta hai, static members pe nahi
}

// Sahi tarika:
@Service
@RequiredArgsConstructor
public class ConfigHelper {
    private final AppConfig config; // Instance field — sahi hai
}
```

**2. Multiple constructors — Spring confuse ho jaata hai**

```java
@Service
public class OrderService {

    private final PaymentGateway gateway;
    private final OrderRepository repo;

    // Default constructor
    public OrderService() {
        // ...
    }

    // Parameterized constructor
    public OrderService(PaymentGateway gateway, OrderRepository repo) {
        this.gateway = gateway;
        this.repo = repo;
    }
    // Spring ko pata nahi kaunsa use kare — @Autowired lagao specific constructor pe
}

// Fix:
@Service
public class OrderService {
    // ...

    @Autowired // Explicitly bolo Spring ko
    public OrderService(PaymentGateway gateway, OrderRepository repo) {
        this.gateway = gateway;
        this.repo = repo;
    }
}
```

**3. Service ke andar `new` karna — DI ka purpose defeat kar deta hai**

```java
@Service
public class OrderService {

    public void processOrder(Order order) {
        // WRONG! Khud new kar liya — Spring ko pata hi nahi chalega
        // Testing mein mock nahi kar paoge
        PaymentGateway gateway = new RazorpayGateway();
        gateway.charge(order.getTotal());
    }
}

// Sahi tarika: inject karo, khud mat banao
@Service
@RequiredArgsConstructor
public class OrderService {
    private final PaymentGateway gateway; // Inject karo — testable, configurable
}
```

**4. Self-injection — almost always bad design**

```java
@Service
public class OrderService {

    @Autowired
    private OrderService self; // Khud ko inject karna — yeh kab chahiye?

    // Sirf ek case mein valid hai: @Transactional method ko same class se call karna
    // Spring proxy ke through call ho — isliye self-reference chahiye
    // Lekin yeh design smell hai — refactor karo agar possible ho
}
```

**5. Field injection wali class ko test mein `new` se banane ki koshish**

```java
// Field injection wali class
@Service
public class OrderService {
    @Autowired private PaymentGateway gateway; // Private field, no constructor param
}

// Test mein:
class OrderServiceTest {
    @Test
    void test() {
        OrderService service = new OrderService();
        // gateway null hai! @Autowired sirf Spring container mein kaam karta hai
        // NullPointerException aayega jab gateway use karo
        service.placeOrder(cart); // BOOM!
    }
}

// Isliye constructor injection use karo — test trivial ban jaata hai
```

**6. Bean nahi mila toh startup error aata hai — check karo**

```java
// Agar PaymentGateway ka koi @Component/@Bean nahi hai application mein
@Service
@RequiredArgsConstructor
public class OrderService {
    private final PaymentGateway gateway; // Spring dhoondh nahi paaega
    // Error: NoSuchBeanDefinitionException: No qualifying bean of type 'PaymentGateway'
}

// Fix: Ya toh bean define karo, ya @Autowired(required=false), ya Optional<> use karo
```

---

## Key Takeaways

- **Constructor injection sabse best hai** — immutability, testability, compile-time safety. Modern Spring mein yahi standard hai.

- **Lombok ka `@RequiredArgsConstructor`** use karo — boilerplate constructor likhna band karo. Sab `final` fields ke liye constructor automatically ban jaata hai.

- **Field injection avoid karo** — dekhne mein clean lagta hai, lekin testing painful hai, dependencies hidden hain, aur Single Responsibility violations chhup jaate hain.

- **Setter injection sirf optional dependencies ke liye** — ya circular dependency todne ke last resort ke taur pe (prefer karo design fix karna).

- **Multiple implementations ho toh** `@Primary` (default set karo) ya `@Qualifier` (specific maango) use karo. `List<Interface>` ya `Map<String, Interface>` inject karna ek powerful pluggable strategy pattern hai.

- **Circular dependency constructor injection mein startup pe pakdi jaati hai** — yeh feature hai, bug nahi. Design fix karo — event publishing, third shared bean, ya `@Lazy` last resort mein.

- **Spring 4.3+ mein single constructor pe `@Autowired` nahi chahiye** — Spring automatically detect karta hai.

- **`new` mat karo services ke andar** — DI ka poora point yahi hai ki tum khud dependencies nahi banaate, Spring deta hai. `new` karne se testability aur configurability khatam ho jaati hai.

- **Node.js comparison:** NestJS ka `@Injectable()` + constructor injection exactly yahi concept hai. Spring mein `@Service`/`@Component` + constructor = same thing, different syntax.
