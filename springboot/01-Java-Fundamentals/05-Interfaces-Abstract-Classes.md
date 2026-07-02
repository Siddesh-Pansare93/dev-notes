# Interfaces aur Abstract Classes

Yaar, agar tum sirf ek cheez seekh ke Java mein sahi developer banna chahte ho — toh woh hai **interfaces ka sahi use**. Spring Boot ke poore dependency injection system ka aadhar yahi hai. Bina interfaces samjhe, tum Spring Boot likhtey toh rahe ho, par samjhe nahi. Toh chalo — deeply samjhte hain.

---

## Pehle problem samjho — kyun chahiye yeh cheez?

Socho tum Zomato jaisi app bana rahe ho. Notifications bhejni hai — kisi ko email, kisi ko SMS, kisi ko WhatsApp push notification. Agar tum yeh code likho:

```java
// Galat approach — tightly coupled
public class OrderService {
    public void orderPlaced(String userId) {
        EmailSender emailSender = new EmailSender();
        emailSender.send(userId, "Order placed!");
        // kal WhatsApp chahiye toh? Naya class likhna padega, yahan bhi change
    }
}
```

Problem kya hai? `OrderService` directly `EmailSender` se baat kar raha hai. Kal agar SMS bhejna hai — toh `OrderService` ko bhi chhuna padega. Yeh **tight coupling** hai — ek cheez change karo, sab toota.

**Interfaces is problem ka solution hai.** Contract define karo — implementation badlo, caller ko pata bhi nahi chalega.

---

## Interface — Contract ka Kagaz

> [!info] TypeScript walo ke liye ek important fark
> TypeScript mein `interface` sirf compile-time ka tool hai — runtime pe exist hi nahi karta. Java mein `interface` ek **real runtime construct** hai. Tum `instanceof` check kar sakte ho, Spring DI isse type ke basis pe wire karta hai, aur since Java 8, interfaces ke andar actual code (default methods) bhi ho sakta hai. Yeh bahut zyada powerful hai.

### Basic Interface Kaise Likhte Hain

```java
// Notification bhejne ka contract — sirf rules, koi implementation nahi
public interface Notifier {
    // Yeh methods automatically public + abstract hote hain
    // tum likho ya na likho — Java same maanta hai
    void send(String to, String message);

    // Java 8 se: default method — body bhi hai, aur override bhi kar sakte ho
    default void broadcast(List<String> recipients, String message) {
        // Yeh default implementation hai — koi bhi implementing class
        // isse override kar sakta hai, par karna zaruri nahi
        recipients.forEach(recipient -> send(recipient, message));
    }

    // Static method — interface ke naam se call karte hain, instance se nahi
    static Notifier noOp() {
        // Anonymous class — ek baar use, throw away
        return (to, msg) -> {}; // kuch nahi karta — testing ke liye useful
    }
}
```

Ek class isko implement karti hai — aur **ek se zyada** interfaces implement kar sakti hai (TypeScript jaisa hi):

```java
// EmailNotifier ek email bhejti hai
public class EmailNotifier implements Notifier {
    @Override
    public void send(String to, String message) {
        // Real code mein yahan JavaMail ya AWS SES ka use hoga
        System.out.println("EMAIL bheja " + to + " ko: " + message);
    }
    // broadcast() override nahi kiya — default wala chalega
}

// SmsNotifier SMS bhejti hai
public class SmsNotifier implements Notifier {
    @Override
    public void send(String to, String message) {
        System.out.println("SMS bheja " + to + " ko: " + message);
    }

    @Override
    public void broadcast(List<String> recipients, String message) {
        // SMS pe bulk discount milta hai, toh ek sath bhejte hain
        System.out.println("Bulk SMS bheja " + recipients.size() + " logon ko");
        recipients.forEach(r -> send(r, message));
    }
}

// WhatsApp wala bhi ban sakta hai — OrderService ko kuch nahi pata
public class WhatsAppNotifier implements Notifier {
    @Override
    public void send(String to, String message) {
        System.out.println("WhatsApp bheja " + to + " ko: " + message);
    }
}
```

Ab `OrderService` sirf `Notifier` se baat karta hai — concrete class se nahi:

```java
public class OrderService {
    // Yahan Notifier type hai — EmailNotifier ya SmsNotifier ya koi bhi
    private final Notifier notifier;

    // Constructor injection — Spring isko automatically set karega
    public OrderService(Notifier notifier) {
        this.notifier = notifier;
    }

    public void orderPlaced(String userId) {
        // Yeh nahi pata — email jayega ya SMS? Notifier decide karega
        notifier.send(userId, "Tera order place ho gaya! Zomato ki taraf se dhanyavaad.");
    }
}
```

Main method mein kaise use karein:

```java
public class Demo {
    public static void main(String[] args) {
        // Aaj email chahiye
        OrderService emailService = new OrderService(new EmailNotifier());
        emailService.orderPlaced("rahul@gmail.com");

        // Kal SMS chahiye — OrderService ka ek line bhi nahi badla
        OrderService smsService = new OrderService(new SmsNotifier());
        smsService.orderPlaced("+919876543210");

        // Testing mein kuch nahi bhejana — noOp use karo
        OrderService testService = new OrderService(Notifier.noOp());
        testService.orderPlaced("test-user");
    }
}
```

**Yahi Spring ka magic hai.** Spring decide karta hai kaunsa implementation inject karna hai — tumhara business code bilkul nahi badlta.

---

## Abstract Class — Jab Contract + Shared Code Dono Chahiye

Interface sirf contract deta hai. Lekin kabhi kabhi aisa hota hai ki kai implementations mein kuch code exactly same hoga. Toh kya har jagah copy-paste karoge? Nahin yaar — `abstract class` use karo.

### Abstract Class ka Concept

```java
// BaseNotifier — shared functionality sabke liye
public abstract class BaseNotifier implements Notifier {
    // Shared state — har notifier ke paas logger aur retry count hoga
    protected final Logger log = LoggerFactory.getLogger(getClass());
    protected final int maxRetries;
    protected final String senderName;

    // Constructor — subclass ko yeh values deni hongi
    protected BaseNotifier(String senderName, int maxRetries) {
        this.senderName = senderName;
        this.maxRetries = maxRetries;
    }

    // Yeh method sabke liye same hai — toh yahan likhte hain
    @Override
    public void broadcast(List<String> recipients, String message) {
        log.info("{} se {} logon ko message bhej rahe hain", senderName, recipients.size());
        recipients.forEach(r -> send(r, message));
        log.info("Broadcast complete");
    }

    // Template Method Pattern — subclass decide karega actual bhejne ka logic
    @Override
    public abstract void send(String to, String message);

    // Yeh protected helper method sirf child classes use kar sakti hain
    protected void logAttempt(String to, int attempt) {
        log.debug("Attempt {} - {} ko message bhejne ki koshish", attempt, to);
    }
}
```

Ab specific implementations:

```java
public class EmailNotifier extends BaseNotifier {

    public EmailNotifier() {
        // Parent constructor call karna compulsory hai
        super("Zomato Email System", 3);
    }

    @Override
    public void send(String to, String message) {
        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            logAttempt(to, attempt); // parent ka helper use kar raha hai
            try {
                // Real email bhejne ka code
                System.out.println("EMAIL: " + to + " -> " + message);
                return; // success, loop se bahar
            } catch (Exception e) {
                log.error("Attempt {} fail hua: {}", attempt, e.getMessage());
            }
        }
        log.error("Saare {} attempts fail ho gaye {} ke liye", maxRetries, to);
    }
}

public class SmsNotifier extends BaseNotifier {

    public SmsNotifier() {
        super("Zomato SMS Gateway", 2);
    }

    @Override
    public void send(String to, String message) {
        // SMS ka retry logic thoda alag
        logAttempt(to, 1);
        System.out.println("SMS: " + to + " -> " + message);
    }
}
```

> [!info] TypeScript comparison
> TypeScript mein bhi `abstract class` hoti hai — almost same syntax. Par fark yeh hai ki Java mein ek class sirf ek abstract class extend kar sakti hai (single inheritance), lekin multiple interfaces implement kar sakti hai. TypeScript mein structural typing hai — Java mein nominal. Matlab Java mein explicitly likhna padta hai `implements Notifier`, sirf method hone se kaam nahi chalega.

---

## Interface vs Abstract Class — Kaun Kab Use Karein?

Yeh confusion bahut common hai. Table dekho:

| Zaroorat                                        | Kya Use Karein           |
|--------------------------------------------------|--------------------------|
| Sirf contract chahiye, koi shared code nahi      | `interface`              |
| Multiple inheritance chahiye (ek class, kai types) | `interface`           |
| Shared fields (state) chahiye                   | `abstract class`         |
| Constructor logic share karna hai               | `abstract class`         |
| Default behavior + multiple implementations     | `interface` + `default`  |
| Capability mark karna — `Comparable`, `Closeable` | `interface`            |
| Template Method Pattern                         | `abstract class`         |

**Real talk:** Modern Java + Spring mein tum **90% time interfaces hi use karoge**. Abstract class special cases ke liye hai.

Ek simple rule yaad rakho:
- **Kya hai?** — Interface (UPI payment processor, Notifier)
- **Kaise implement karein?** — Abstract Class (BasePaymentProcessor with shared logic)

---

## Repository Pattern — Spring mein Interface ka King Use Case

Yaar, Spring Data JPA mein tumhara sabse pehla interface yahi hoga:

```java
// JpaRepository ek interface hai — Spring Data implement karta hai automatically
public interface UserRepository extends JpaRepository<User, Long> {
    // Yeh method Spring khud implement kar deta hai — naam se query ban jaati hai
    Optional<User> findByEmail(String email);
    List<User> findByCity(String city);

    // Custom query bhi likh sakte ho
    @Query("SELECT u FROM User u WHERE u.active = true AND u.city = :city")
    List<User> findActiveUsersByCity(@Param("city") String city);
}
```

Tumne sirf interface likha — Spring ne implementation provide ki. **Yahi interfaces ki power hai.**

---

## Functional Interfaces — Lambda ka Darwaza

Ek interface jisme **sirf ek abstract method** ho — use **functional interface** kehte hain. Aur usse **lambda se implement** kar sakte ho. TypeScript walo ke liye — yeh wahi hai jo tum `(a: A) => B` likhte the.

```java
// @FunctionalInterface annotation — compiler check karega ki sirf ek method hai
@FunctionalInterface
public interface PaymentProcessor {
    PaymentResult process(PaymentRequest request);
    // Sirf yeh ek abstract method — isliye lambda use kar sakte hain
}

// Lambda se implement karo — koi class nahi banani
PaymentProcessor upiProcessor = request -> {
    System.out.println("UPI se payment: " + request.getAmount());
    return PaymentResult.success();
};

PaymentProcessor cardProcessor = request -> {
    System.out.println("Card se payment: " + request.getAmount());
    return PaymentResult.success();
};

// Use karo — bilkul normal object ki tarah
upiProcessor.process(new PaymentRequest(500.0));
```

### `java.util.function` Package — Ready Made Functional Interfaces

Java ne tum jaise logon ke liye pehle se common functional interfaces bana rakhe hain:

| Java Interface       | Method              | TypeScript Equivalent       | Use Case                              |
|----------------------|---------------------|-----------------------------|---------------------------------------|
| `Function<T, R>`     | `R apply(T t)`      | `(t: T) => R`               | Transform karo — User se DTO          |
| `Predicate<T>`       | `boolean test(T t)` | `(t: T) => boolean`         | Filter karo — active users            |
| `Consumer<T>`        | `void accept(T t)`  | `(t: T) => void`            | Side effects — log karo, save karo    |
| `Supplier<T>`        | `T get()`           | `() => T`                   | Lazy value — config load karo         |
| `BiFunction<T,U,R>`  | `R apply(T t, U u)` | `(t: T, u: U) => R`         | Do inputs, ek output                  |

```java
// Function — User object ko UserDTO mein badlo
Function<User, UserDTO> toDto = user -> new UserDTO(user.getId(), user.getName());

// Predicate — check karo kya user premium hai
Predicate<User> isPremium = user -> user.getSubscription().equals("PREMIUM");

// Consumer — user ko log karo (koi return nahi)
Consumer<User> logUser = user -> log.info("User logged in: {}", user.getEmail());

// Supplier — lazily kuch return karo
Supplier<List<User>> defaultUsers = () -> userRepository.findAll();

// Real use — Streams mein yahi sab use hota hai
List<UserDTO> premiumDtos = users.stream()
    .filter(isPremium)       // Predicate
    .map(toDto)              // Function
    .collect(Collectors.toList());
```

---

## Sealed Interfaces — Java 17+ ka Naya Feature

Kabhi kabhi tum chahte ho ki koi bhi tumhara interface implement na kar sake — sirf kuch specific classes. Zomato delivery status socho — sirf 4 states hain: PLACED, PREPARING, OUT_FOR_DELIVERY, DELIVERED. Koi bhi random class `OrderStatus` implement na kare.

```java
// Sealed interface — sirf yeh 4 implement kar sakte hain
public sealed interface OrderStatus
    permits OrderPlaced, Preparing, OutForDelivery, Delivered {

    String getDisplayMessage();
}

// Har state ek record hai (Java 16+)
public record OrderPlaced(String orderId, LocalTime time)
    implements OrderStatus {
    public String getDisplayMessage() {
        return "Order " + orderId + " placed at " + time;
    }
}

public record Preparing(String restaurantName, int estimatedMinutes)
    implements OrderStatus {
    public String getDisplayMessage() {
        return restaurantName + " khana bana raha hai — " + estimatedMinutes + " min";
    }
}

public record OutForDelivery(String deliveryPartner, String currentLocation)
    implements OrderStatus {
    public String getDisplayMessage() {
        return deliveryPartner + " raste mein hai — " + currentLocation + " se";
    }
}

public record Delivered(LocalTime deliveredAt)
    implements OrderStatus {
    public String getDisplayMessage() {
        return "Khana pahunch gaya! " + deliveredAt + " pe deliver hua";
    }
}
```

Aur Java 21 ke pattern matching switch ke saath yeh aur bhi powerful lagta hai:

```java
public String getStatusForUI(OrderStatus status) {
    // Compiler check karta hai — koi case miss nahi hua na?
    return switch (status) {
        case OrderPlaced p    -> "Order placed: " + p.orderId();
        case Preparing p      -> "Preparing at " + p.restaurantName();
        case OutForDelivery o -> "Out for delivery near " + o.currentLocation();
        case Delivered d      -> "Delivered at " + d.deliveredAt();
        // Compiler jaanta hai yeh saare cases hain — default nahi chahiye!
    };
}
```

---

## Real Spring Boot Example — Sab Cheez Ek Sath

Dekhte hain real Spring Boot app mein kaise sab kuch fit hota hai:

```java
// 1. Interface — contract define karo
public interface PaymentGateway {
    PaymentResponse processPayment(PaymentRequest request);
    boolean refund(String transactionId, double amount);

    // Default method — sabke liye same logic
    default boolean isAmountValid(double amount) {
        return amount > 0 && amount <= 100000; // UPI limit
    }
}

// 2. Abstract Base Class — common retry + logging logic
public abstract class BasePaymentGateway implements PaymentGateway {
    protected final Logger log = LoggerFactory.getLogger(getClass());

    @Override
    public PaymentResponse processPayment(PaymentRequest request) {
        if (!isAmountValid(request.getAmount())) {
            throw new IllegalArgumentException("Amount invalid: " + request.getAmount());
        }
        log.info("Payment processing: {} via {}", request.getAmount(), getGatewayName());
        return doProcess(request); // template method
    }

    // Subclass yeh implement karega
    protected abstract PaymentResponse doProcess(PaymentRequest request);
    protected abstract String getGatewayName();
}

// 3. Concrete Implementation — Razorpay
@Service
@Profile("razorpay") // sirf razorpay profile active ho tab yeh bean banega
public class RazorpayGateway extends BasePaymentGateway {

    @Override
    protected PaymentResponse doProcess(PaymentRequest request) {
        // Razorpay SDK call
        System.out.println("Razorpay se payment: " + request.getAmount());
        return PaymentResponse.success("rzp_" + System.currentTimeMillis());
    }

    @Override
    protected String getGatewayName() { return "Razorpay"; }

    @Override
    public boolean refund(String transactionId, double amount) {
        System.out.println("Razorpay refund: " + transactionId);
        return true;
    }
}

// 4. Another Implementation — Paytm
@Service
@Profile("paytm")
public class PaytmGateway extends BasePaymentGateway {

    @Override
    protected PaymentResponse doProcess(PaymentRequest request) {
        System.out.println("Paytm se payment: " + request.getAmount());
        return PaymentResponse.success("ptm_" + System.currentTimeMillis());
    }

    @Override
    protected String getGatewayName() { return "Paytm"; }

    @Override
    public boolean refund(String transactionId, double amount) {
        System.out.println("Paytm refund: " + transactionId);
        return true;
    }
}

// 5. Service — interface se hi baat karta hai
@Service
public class CheckoutService {
    private final PaymentGateway paymentGateway; // Interface type!

    // Spring inject karega — Razorpay ya Paytm — profile ke hisaab se
    @Autowired
    public CheckoutService(PaymentGateway paymentGateway) {
        this.paymentGateway = paymentGateway;
    }

    public void checkout(Cart cart, PaymentRequest paymentRequest) {
        PaymentResponse response = paymentGateway.processPayment(paymentRequest);
        if (response.isSuccess()) {
            // order confirm karo
            System.out.println("Order confirmed! Transaction: " + response.getTransactionId());
        }
    }
}
```

Test mein mock inject karo — `CheckoutService` ko kuch pata nahi:

```java
@SpringBootTest
class CheckoutServiceTest {

    @MockBean // PaymentGateway ka mock inject hoga
    private PaymentGateway paymentGateway;

    @Autowired
    private CheckoutService checkoutService;

    @Test
    void testCheckout() {
        // Mock ka behavior set karo
        when(paymentGateway.processPayment(any()))
            .thenReturn(PaymentResponse.success("test_txn_123"));

        checkoutService.checkout(new Cart(), new PaymentRequest(500.0));

        verify(paymentGateway, times(1)).processPayment(any());
    }
}
```

---

## TypeScript se Java ka Comparison — Side by Side

| TypeScript                               | Java                                              |
|------------------------------------------|---------------------------------------------------|
| `interface Notifier { send(): void }`    | `interface Notifier { void send(String to, String msg); }` |
| Structural typing — duck typing          | Nominal typing — explicitly `implements` likhna padta hai |
| Interfaces runtime pe exist nahi karte   | Interfaces runtime pe exist karte hain — `instanceof` kaam karta hai |
| Method bodies rare (no default)          | `default` methods se concrete code possible       |
| `type Mapper<A,B> = (a: A) => B`         | `@FunctionalInterface interface Mapper<A,B> { B map(A a); }` |
| Multiple `implements` — same             | Same                                              |
| `abstract class` — same concept          | `abstract class` — same, par stricter             |
| Optional chaining, union types           | Sealed interfaces + pattern matching (Java 17+)   |

**Sabse bada fark:** TypeScript mein agar kisi object mein woh methods hain, toh wo interface se compatible hai — explicitly implement karna zaruri nahi. Java mein nahi — **explicitly `implements` likhna padta hai**. Iska matlab hai compile time pe zyada safety.

---

## Gotchas — Nayi Bhool Mat Karna

> [!warning] Diamond Problem — Default Methods ke saath
> Agar do interfaces ka same naam ka `default` method hai aur ek class dono implement kare — compiler error dega. Explicitly override karna padega aur batana padega kaunsa wala chahiye.
> ```java
> interface A { default void greet() { System.out.println("A"); } }
> interface B { default void greet() { System.out.println("B"); } }
>
> // Yeh compile error dega
> class C implements A, B {
>     @Override
>     public void greet() {
>         A.super.greet(); // explicitly A ka wala choose kiya
>     }
> }
> ```

> [!warning] Interface mein State Mat Rakho
> Interface ke fields automatically `public static final` hote hain — yeh constants hain, instance variables nahi. Agar tumhe state chahiye (database connection, retry count, etc.) — abstract class use karo.
> ```java
> interface Wrong {
>     int count = 0; // Yeh instance variable NAHI hai — compile hoga par static final hai
> }
> ```

> [!warning] Sab Methods Public Hote Hain
> Interface mein methods implicitly `public abstract` hote hain — chahe tum `public` likhon ya na likhon. Package-private ya protected methods nahi ho sakte (sirf Java 9+ mein `private` helper methods for default methods allowed hain).

> [!warning] Abstract Class Extend Karne ke Baad Aur Abstract Class Extend Nahi Kar Sakte
> Java mein single inheritance hai — ek class sirf ek class extend kar sakti hai. Toh agar tumne ek abstract class extend ki, doosri extend nahi hogi. Isliye prefer karo interface — ek class multiple interfaces implement kar sakti hai.

> [!tip] Spring ka Favorite Pattern
> Spring mein hamesha service ko interface ke through inject karo:
> ```java
> // Sahi — interface type use karo
> @Autowired
> private UserService userService; // Interface
>
> // Galat — concrete class use mat karo unless zaruri ho
> @Autowired
> private UserServiceImpl userService; // Concrete class — testing mushkil hoga
> ```
> Interface use karne se `@MockBean` se easily mock inject kar sakte hain tests mein.

> [!warning] `@FunctionalInterface` Annotation Miss Mat Karo
> Technically optional hai, par dalo zaroor. Agar koi galti se doosra abstract method add kare — compiler immediately bata dega ki yeh functional interface nahi raha. Safeguard hai.

---

## Key Takeaways

- **Interface = Contract** — Kya karna chahiye, kaise nahi. Multiple implement kar sakte hain.
- **Abstract Class = Contract + Shared Code** — Jab state ya constructor logic share karna ho. Sirf ek extend ho sakta hai.
- **Java ka `interface` TypeScript se zyada powerful hai** — runtime pe exist karta hai, `instanceof` kaam karta hai, `default` methods se concrete code rakh sakte ho.
- **Spring DI ka aadhar interfaces hain** — `UserService` interface likho, `@Service` impl banao, constructor mein inject karo — Spring handle karega kaunsa implementation dena hai.
- **Functional Interface + Lambda** — Single abstract method wale interfaces ko lambda se implement karo — clean code milta hai.
- **`java.util.function` package** — `Function`, `Predicate`, `Consumer`, `Supplier` — yeh sab ready-made functional interfaces hain, Streams mein heavily use hote hain.
- **Sealed Interfaces (Java 17+)** — Jab limited number of implementations chahiye ho — like order states, payment results — compile-time safety milti hai.
- **Testing ke liye interface essential hai** — Interface use karo toh `@MockBean` se mock inject ho jata hai — bina interface ke testing painful hoti hai.
- **90% time interfaces use karoge** — Abstract class sirf special cases ke liye hai jab state ya constructor share karna ho.
