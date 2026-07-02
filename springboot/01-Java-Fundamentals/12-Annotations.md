# Annotations — Java ka "Label System"

Socho Zomato delivery system ke baare mein. Ek order aata hai — uske saath kuch "tags" lagte hain: `#VegOnly`, `#Express`, `#Prepaid`, `#Fragile`. Delivery boy in tags ko dekhta hai aur accordingly handle karta hai. Order ke andar koi special code nahi hota — sirf ek label hota hai jo baaki system ko batata hai "is cheez ko is tarah treat karo."

Yehi kaam Java mein **Annotations** karte hain.

Annotation ek metadata label hai — class pe, method pe, field pe, ya parameter pe lagao, aur koi aur (compiler, Spring framework, ya tumhara khud ka code) us label ko padh ke decide karta hai kya karna hai. Annotation khud kuch execute nahi karta. Woh sirf information carry karta hai.

> [!info] TypeScript Developer ke liye
> Agar tumne Angular ya NestJS use kiya hai toh `@Component()`, `@Injectable()`, `@Controller()` dekha hoga — woh TypeScript Decorators hain. Annotations unhi ke jaisa lagta hai, lekin **fundamentally alag** hain. TypeScript decorators actually **function hai jo run hote hain** — woh class ko mutate kar sakte hain. Java Annotations **pure metadata** hain — woh khud kuch nahi karte. Koi framework unhe read karta hai via reflection aur behavior apply karta hai. Mental model change karo: decorator = code, annotation = label.

Spring Boot almost **poora** annotations pe chalti hai. `@RestController`, `@Autowired`, `@Transactional`, `@GetMapping` — sab annotations hain. Toh ye samajhna fundamentally zaruri hai.

---

## Built-in Annotations — Jo Java Compiler Samjhta Hai

Java ke kuch annotations hain jo compiler directly samjhta hai — inke liye koi framework nahi chahiye.

| Annotation             | Kya karta hai                                                    |
| ---------------------- | ---------------------------------------------------------------- |
| `@Override`            | Compile error deta hai agar method actually parent ko override nahi kar raha |
| `@Deprecated`          | Callers ko warn karta hai; `since` aur `forRemoval` bhi likh sakte ho |
| `@SuppressWarnings`    | Compiler ki specific warning band karta hai                      |
| `@FunctionalInterface` | Compile error agar interface mein exactly 1 abstract method nahi hai |
| `@SafeVarargs`         | Generic varargs pe aayi warning suppress karta hai               |

```java
public class Cat extends Animal {

    // Compiler check karega — agar Animal mein speak() nahi hai,
    // ya signature match nahi karta, toh compile error aayega
    @Override
    public String speak() { return "meow"; }

    // Ye method ab outdated hai — caller ko warning milegi IDE mein
    @Deprecated(since = "2.0", forRemoval = true)
    public void purr() { }
}

// Raw cast pe compiler warning aati hai — hum suppress kar rahe hain
// (sochke karo, galti chhupaane ka tool hai ye)
@SuppressWarnings("unchecked")
List<String> raw = (List<String>) someRawList;
```

`@Override` sabse valuable hai — ek typo se tum galat method override karte reh sakte ho silently. Ye annotation uss galti ko compile time pe hi pakad leta hai.

---

## Apna Annotation Banana — Custom Annotation

Ab asli maza yahan aata hai. Tum apne khud ke annotations bana sakte ho. Socho tumhe ek audit trail chahiye — kaunse methods "sensitive" hain aur unhe log karna hai. Har jagah manually log likhna tedious hai. Better solution? Ek `@Audited` annotation banao.

### Annotation Definition ka Anatomy

```java
import java.lang.annotation.*;

// Ye annotation runtime pe bhi available rahega (Spring, JPA ye chahte hain)
@Retention(RetentionPolicy.RUNTIME)

// Sirf methods pe lagaaya ja sakta hai ye annotation
@Target(ElementType.METHOD)

// @interface keyword — normal interface nahi, annotation hai ye
public @interface Audited {

    // Required attribute — koi default nahi, toh caller must provide this
    String action();

    // Optional attribute — default value hai "INFO"
    String level() default "INFO";
}
```

Banana itna simple hai — `@interface` likho, attributes define karo (method signatures ki tarah, return type = attribute type).

### Use Karo Apna Annotation

```java
// action required hai, level optional (default "INFO" use hoga)
@Audited(action = "view-balance")
public AccountSummary getBalance(long userId) {
    return repo.findById(userId);
}

// Dono attributes explicitly de rahe hain
@Audited(action = "delete-user", level = "WARN")
public void deleteUser(long id) {
    repo.deleteById(id);
}
```

Sirf annotation lagane se kuch nahi hoga. Ab kisi ko isko **read** karna padega — compiler, framework, ya tumhara khud ka code.

---

## Retention Policies — Annotation Kitne Time Tak Zinda Rehta Hai?

Jab tum `@Retention` specify karte ho, tum decide kar rahe ho ki annotation kitne time tak accessible rahega.

| Policy          | Kab tak zinda rehta hai                      | Kaun use karta hai                |
| --------------- | -------------------------------------------- | --------------------------------- |
| `SOURCE`        | Compile ke baad delete ho jata hai           | `@Override`, lint tools, Lombok   |
| `CLASS`         | `.class` file mein hota hai, runtime pe nahi | Bytecode manipulation tools       |
| `RUNTIME`       | Runtime pe bhi available, reflection se padh sakte ho | Spring, Jackson, JPA, Hibernate |

**90% cases mein tum `RUNTIME` use karoge** jab khud annotation bana rahe ho — kyunki frameworks runtime pe reflection se annotation padhte hain.

```java
// SOURCE example — sirf compile time pe kaam aata hai
// Runtime pe koi evidence nahi hoga is annotation ka
@Retention(RetentionPolicy.SOURCE)
public @interface TodoFix { String reason(); }

// RUNTIME example — Spring aur tumhara scanner dono padh sakte hain
@Retention(RetentionPolicy.RUNTIME)
public @interface RateLimit { int requestsPerMinute() default 60; }
```

---

## Targets — Annotation Kahan Laga Sakte Ho?

`@Target` se tum restrict karte ho ki annotation kahaan valid hai.

```java
// Sirf methods pe
@Target(ElementType.METHOD)

// Sirf classes, interfaces, enums pe
@Target(ElementType.TYPE)

// Fields pe
@Target(ElementType.FIELD)

// Method parameters pe
@Target(ElementType.PARAMETER)

// Multiple targets — TYPE ya METHOD, dono pe chal sakta hai
@Target({ElementType.TYPE, ElementType.METHOD})
```

Sab available targets:

`TYPE`, `METHOD`, `FIELD`, `PARAMETER`, `CONSTRUCTOR`, `LOCAL_VARIABLE`, `ANNOTATION_TYPE`, `PACKAGE`, `TYPE_PARAMETER`, `TYPE_USE`, `MODULE`

Agar `@Target` specify nahi karo, annotation **kahin bhi** lag sakta hai — generally ye accha practice nahi hai, explicit raho.

---

## Reflection se Annotation Padhna — Framework Kaise Karta Hai

Annotations tab kaam ke hote hain jab koi unhe padhe. Java mein ye kaam **Reflection API** se hota hai — runtime pe class structure inspect karne ka mechanism.

```java
import java.lang.reflect.Method;

public class AuditScanner {

    public static void scan(Class<?> cls) {
        // Class ke sare declared methods iterate karo
        for (Method method : cls.getDeclaredMethods()) {

            // Check karo — is method pe @Audited annotation hai?
            Audited annotation = method.getAnnotation(Audited.class);

            if (annotation != null) {
                // Annotation se values nikalo aur use karo
                System.out.printf("[%s] Method '%s' -> Action: %s%n",
                    annotation.level(),
                    method.getName(),
                    annotation.action()
                );
            }
        }
    }

    public static void main(String[] args) {
        scan(UserService.class);
        // Output:
        // [INFO] createUser -> create-user
        // [WARN] deleteUser -> delete-user
    }
}
```

Spring exactly yehi karta hai — startup pe sare classes scan karta hai, annotations padhta hai, aur accordingly behavior set karta hai. Tum mostly ye code khud nahi likhoge — Spring ka kaam hai ye. Lekin **samajhna** zaruri hai ki under the hood kya chal raha hai.

---

## Pura Working Example — Ek Mini Audit System

Chalo ek complete example banate hain — `@Audited` annotation se ek realistic scenario:

```java
package com.example.audit;

import java.lang.annotation.*;

// ---- Step 1: Annotation define karo ----

@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface Audited {
    String action();                    // Kya operation ho raha hai
    String level() default "INFO";      // Log level
    boolean logParams() default false;  // Params bhi log karne hain?
}
```

```java
package com.example.audit;

// ---- Step 2: Annotation use karo real service mein ----

public class PaymentService {

    @Audited(action = "initiate-payment", logParams = true)
    public void initiatePayment(String userId, double amount) {
        System.out.println("Processing payment of " + amount + " for " + userId);
    }

    @Audited(action = "refund", level = "WARN", logParams = true)
    public void refund(String transactionId) {
        System.out.println("Refunding transaction: " + transactionId);
    }

    // Annotation nahi hai — ye audit nahi hoga
    public void checkBalance(String userId) {
        System.out.println("Checking balance for " + userId);
    }
}
```

```java
package com.example.audit;

import java.lang.reflect.Method;

// ---- Step 3: Scanner jo annotation padhe aur kuch kare ----

public class AuditScanner {

    public static void processAndScan(Class<?> cls) {
        System.out.println("=== Audit Report for: " + cls.getSimpleName() + " ===");

        for (Method method : cls.getDeclaredMethods()) {
            Audited a = method.getAnnotation(Audited.class);

            if (a != null) {
                System.out.printf(
                    "[%s] %s() -> action='%s', logParams=%b%n",
                    a.level(),
                    method.getName(),
                    a.action(),
                    a.logParams()
                );
            } else {
                System.out.printf("[ -- ] %s() -> NOT audited%n", method.getName());
            }
        }
    }

    public static void main(String[] args) {
        processAndScan(PaymentService.class);

        /*
         * Output:
         * === Audit Report for: PaymentService ===
         * [INFO] initiatePayment() -> action='initiate-payment', logParams=true
         * [WARN] refund() -> action='refund', logParams=true
         * [ -- ] checkBalance() -> NOT audited
         */
    }
}
```

Real Spring projects mein ye manual scanner nahi likhte — Spring AOP use hota hai jo automatically `@Audited` methods ke aage-peeche code inject karta hai. Lekin ye example dikhata hai **mechanism** kya hai.

---

## Annotations Spring Mein — Yahan Sab Kuch Annotations Hai

Spring Boot ka pura ecosystem annotations pe built hai. Kuch most common ones:

```java
@RestController                         // HTTP requests handle karne wali class
@RequestMapping("/api/payments")        // Base URL path
public class PaymentController {

    @Autowired                          // Spring inject karega ye bean automatically
    private PaymentService paymentService;

    @GetMapping("/{id}")                // GET /api/payments/123
    public Payment getPayment(@PathVariable long id) {
        return paymentService.findById(id);
    }

    @PostMapping                        // POST /api/payments
    @Transactional                      // DB transaction wrap hoga is method ke liye
    public Payment createPayment(
            @Valid                      // Validation run karega
            @RequestBody                // JSON body se map karega
            PaymentRequest request) {
        return paymentService.create(request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")   // Security check — sirf ADMIN kar sakta hai
    public void deletePayment(@PathVariable long id) {
        paymentService.delete(id);
    }
}
```

Ye ek real-world controller hai — notice karo kitna kuch annotations se ho raha hai bina explicit code likhe.

---

## Meta-Annotations — Annotations pe Annotations

Ye ek powerful feature hai. Tum apne annotation mein doosre annotations embed kar sakte ho. Spring khud yehi karta hai internally.

Example: `@RestController` Spring mein actually `@Controller + @ResponseBody` ka combination hai:

```java
// Spring source code mein kuch aisa hai (simplified)
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Controller        // ye bhi ek annotation hai
@ResponseBody      // ye bhi
public @interface RestController {
    String value() default "";
}
```

Tum bhi aisa kar sakte ho — apni team ke liye shortcut annotation banao:

```java
// Ye annotation ek shorthand hai "ye ek standard service layer bean hai"
// jisme transactions auto-enabled hain
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Service            // Spring bean banao
@Transactional      // Sab methods ke liye transaction enable karo by default
public @interface ApplicationService { }
```

Ab use:

```java
// Sirf @ApplicationService lagao — @Service aur @Transactional dono apply ho jaate hain
@ApplicationService
public class OrderService {
    public Order createOrder(OrderRequest req) {
        // Ye method automatically transactional hai
        // Spring is class ko bean ki tarah inject kar sakta hai
    }
}
```

---

## TypeScript Decorators vs Java Annotations — Side-by-Side

Tumhara TS/Angular background hai, toh direct comparison helpful rahega:

| Concept                         | TypeScript Decorator                        | Java Annotation                               |
| ------------------------------- | ------------------------------------------- | --------------------------------------------- |
| Syntax                          | `@Component({selector: 'app-root'})`        | `@Component("myService")`                     |
| Nature                          | **Active** — function jo execute hota hai   | **Passive** — sirf metadata, khud kuch nahi karta |
| Kab execute hota hai            | Class definition ke time pe                 | Framework/compiler kab chahe tab (via reflection) |
| Class mutate kar sakta hai?     | Haan — class structure change ho sakti hai  | Nahi — class waise hi rehti hai               |
| Language mein status            | Stage 3 proposal, experimental              | First-class since Java 5                      |
| Retention model                 | Nahi (sab runtime pe available)             | Teen policies: SOURCE, CLASS, RUNTIME         |
| Metadata padhna                 | `Reflect.getMetadata(key, target)`          | `method.getAnnotation(Audited.class)`         |
| Arguments syntax                | `@Foo({key: value})`                        | `@Foo(key = "value")`                         |

Key mental shift: **TS decorators kuch "karte" hain. Java annotations sirf "bataate" hain.** Behavior apply karna framework ka kaam hai.

---

## Validation Annotations — Bean Validation

Spring ke saath ek aur powerful annotation family aati hai — **Bean Validation**:

```java
import jakarta.validation.constraints.*;

public class UpiPaymentRequest {

    @NotBlank(message = "UPI ID khali nahi ho sakta")
    @Pattern(regexp = "^[a-zA-Z0-9._-]+@[a-zA-Z]+$",
             message = "Valid UPI ID dalo jaise: user@upi")
    private String upiId;

    @NotNull(message = "Amount required hai")
    @DecimalMin(value = "1.0", message = "Minimum ₹1 transfer karo")
    @DecimalMax(value = "100000.0", message = "Maximum ₹1 lakh ek transaction mein")
    private Double amount;

    @NotBlank
    @Size(min = 3, max = 100, message = "Remark 3 se 100 characters ke beech hona chahiye")
    private String remark;

    @Email(message = "Valid email dalo")
    private String notificationEmail; // optional field

    // getters/setters...
}
```

Controller mein `@Valid` lagao aur Spring automatically validate karega:

```java
@PostMapping("/transfer")
public ResponseEntity<String> transfer(@Valid @RequestBody UpiPaymentRequest req) {
    // Yahan aate aate req already validated hai
    // Invalid request pe Spring 400 Bad Request return kar deta hai automatically
    paymentService.process(req);
    return ResponseEntity.ok("Transfer initiated!");
}
```

---

## Lombok Annotations — Code Generation Wale

Lombok ek compile-time annotation processor hai — woh actual Java code generate karta hai `.java` file se `.class` file banate waqt. Tumhe boilerplate nahi likhna padta.

```java
import lombok.*;

@Data           // @Getter + @Setter + @ToString + @EqualsAndHashCode + @RequiredArgsConstructor
@Builder        // Builder pattern generate karta hai
@NoArgsConstructor  // Default constructor
@AllArgsConstructor // Sab fields ka constructor
public class OrderItem {
    private String productId;
    private String productName;
    private int quantity;
    private double price;
}

// Ab tum directly use kar sakte ho:
OrderItem item = OrderItem.builder()
    .productId("ZOMATO_GOLD")
    .productName("Zomato Gold Subscription")
    .quantity(1)
    .price(299.0)
    .build();
```

> [!tip] Lombok vs Records
> Modern Java (Java 16+) mein **Records** hain jo immutable data classes ke liye better hain. Agar tumhara project Java 17+ hai, toh records prefer karo simple DTOs ke liye. Lombok abhi bhi useful hai complex cases mein — jaise mutable beans ya partial constructors.

---

## Gotchas — Jo Beginners Se Miss Hoti Hain

> [!warning] Annotation Lagane Se Kuch Nahi Hoga Akele
> Ye sabse common confusion hai. `@Transactional` lagaaya ek plain Java class pe — kuch nahi hoga. `@Autowired` ek class mein likha jo Spring context mein register nahi hai — null pointer milega. Annotation sirf tab kaam karta hai jab koi us annotation ko **read karke act kare** — Spring context, compiler, ya tumhara code. "Annotation lagaya tha phir bhi kaam nahi kiya" — 99% chance hai framework ne us class ko process hi nahi kiya.

> [!warning] Self-Invocation — Spring ka Sabse Bada Trap
> Spring annotations jaise `@Transactional` aur `@Async` **proxies** ke through kaam karte hain. Jab tum same class ke andar `this.someMethod()` call karte ho, proxy bypass ho jaata hai — annotation ka effect nahi hota.
>
> ```java
> @Service
> public class OrderService {
>
>     @Transactional
>     public void processOrder(Order order) {
>         // Ye kaam NAHI karega — this.createInvoice() proxy bypass kar raha hai
>         // Iska matlab transaction sirf processOrder ke liye hoga, createInvoice ke liye nahi
>         this.createInvoice(order);
>     }
>
>     @Transactional(propagation = Propagation.REQUIRES_NEW)
>     public void createInvoice(Order order) {
>         // Ye annotation actually apply NAHI hoga jab self-invoke ho
>         invoiceRepo.save(new Invoice(order));
>     }
> }
> ```
>
> Fix: `createInvoice` ko alag bean mein nikalo aur inject karo, ya `ApplicationContext` se bean lo.

> [!warning] Retention Bhul Jaana
> Agar `@Retention` nahi likha, default `CLASS` hota hai — runtime pe reflection se nahi padh sakte. Spring annotations ke saath tumhara custom annotation integrate karna ho toh `@Retention(RetentionPolicy.RUNTIME)` mandatory hai.
>
> ```java
> // GALAT — ye annotation runtime pe invisible hai
> @Target(ElementType.METHOD)
> public @interface Audited { String action(); }
>
> // SAHI — runtime pe readable hai
> @Retention(RetentionPolicy.RUNTIME)
> @Target(ElementType.METHOD)
> public @interface Audited { String action(); }
> ```

> [!warning] Reflection ka Performance Cost
> Reflection fast nahi hai — runtime pe class structure inspect karna expensive hai. Spring isko startup pe karta hai aur results cache karta hai. Agar tum khud scanner likh rahe ho aur har request pe reflection run kar rahe ho, performance hit hogi. Pehle scan karo, results cache karo, phir use karo.

> [!tip] @SuppressWarnings Carefully Use Karo
> `@SuppressWarnings` warning ko fix nahi karta — sirf hide karta hai. Kabhi kabhi legitimate hai (jaise raw type cast jo tum control nahi karte), lekin zyada use karna means tum potential bugs ignore kar rahe ho. Hamesha comment likho ki kyun suppress kiya.

> [!tip] Annotation Attributes ke Liye Valid Types
> Annotation attributes ke return types restricted hain — sirf ye allowed hain: primitives (`int`, `boolean`, etc.), `String`, `Class`, enums, doosre annotations, ya inke arrays. `List`, `Map`, custom classes — ye allowed nahi hain.
>
> ```java
> // GALAT — List allowed nahi hai
> public @interface Foo { List<String> tags(); }
>
> // SAHI — String array use karo
> public @interface Foo { String[] tags(); }
> ```

---

## Key Takeaways

- **Annotation = metadata label** — khud kuch execute nahi karta, sirf information carry karta hai
- **Koi "reader" chahiye** — compiler, Spring framework, ya tumhara reflection code jo annotation padhe aur act kare
- **Retention decide karo carefully** — `RUNTIME` chahiye toh `@Retention(RetentionPolicy.RUNTIME)` likhna mandatory hai, warna reflection se nahi milega
- **`@Target` se restrict karo** — annotation sirf wahan lage jahan sense banta ho
- **TypeScript decorators se alag hain** — decorators active functions hain, annotations passive metadata hain
- **Spring ka pura magic annotations pe hai** — `@RestController`, `@Transactional`, `@Autowired` sab isi mechanism se kaam karte hain
- **Self-invocation trap** — `this.method()` se Spring annotations bypass ho jaate hain, proxy se hi call karo
- **Meta-annotations se shortcuts banao** — multiple annotations ka combination ek annotation mein pack karo
- **Lombok = compile-time annotation processor** — source file se bytecode banate waqt boilerplate generate karta hai
- **Bean Validation annotations** (`@NotNull`, `@Size`, `@Email`) Spring controllers ke saath `@Valid` se auto-validate karte hain
