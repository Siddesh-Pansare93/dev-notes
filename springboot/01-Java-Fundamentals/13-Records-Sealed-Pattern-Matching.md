# Records, Sealed Classes, aur Pattern Matching

Socho ek second ke liye — tum TypeScript mein daily kya karte ho? `type User = { id: number; name: string }` likhte ho, discriminated unions use karte ho jaise `type Event = OrderPlaced | OrderCancelled | OrderDelivered`, aur phir exhaustive switch se handle karte ho. Ye sab itna clean hota hai na?

Ab Java ki purani duniya mein welcome karo — jahaan ek simple data class ke liye 50 lines ka boilerplate chahiye tha. Constructor, getters, setters, `equals()`, `hashCode()`, `toString()` — sab kuch haath se likhna padta tha. Ya phir Lombok ka annotation magic use karna padta tha.

**Good news ye hai** — Java 17 aur 21 ne ye gap kaafi had tak close kar diya hai. **Records**, **Sealed Classes**, aur **Pattern Matching** — yeh teen features mil ke wahi karte hain jo TypeScript mein naturally hota tha. Is chapter mein hum inhe deeply samjhenge — kya hain, kyun laaye gaye, aur real projects mein kaise use karte hain.

---

## Records (Java 16+) — Data Classes for Real Devs

### Pehle problem samjho

Zomato pe ek `OrderItem` represent karna ho — dish ka naam, price, quantity. TypeScript mein:

```typescript
type OrderItem = {
  dishName: string;
  priceInPaise: number;
  quantity: number;
};
```

Done. 3 lines.

Ab purana Java dekhte hain (pre-16):

```java
// Purana Java — sirf ek data class ke liye itna likhna padta tha 😭
public final class OrderItem {
    private final String dishName;
    private final int priceInPaise;
    private final int quantity;

    public OrderItem(String dishName, int priceInPaise, int quantity) {
        this.dishName = dishName;
        this.priceInPaise = priceInPaise;
        this.quantity = quantity;
    }

    public String getDishName()    { return dishName; }
    public int getPriceInPaise()   { return priceInPaise; }
    public int getQuantity()       { return quantity; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof OrderItem)) return false;
        OrderItem that = (OrderItem) o;
        return priceInPaise == that.priceInPaise &&
               quantity == that.quantity &&
               dishName.equals(that.dishName);
    }

    @Override
    public int hashCode() {
        return Objects.hash(dishName, priceInPaise, quantity);
    }

    @Override
    public String toString() {
        return "OrderItem[dishName=" + dishName +
               ", priceInPaise=" + priceInPaise +
               ", quantity=" + quantity + "]";
    }
}
```

Yaar, 40+ lines sirf ek data container ke liye. Aur agar field change kiya toh 5 jagah update karna padta.

### Ab modern Java Records dekhte hain

```java
// Modern Java — ek line! 🎉
public record OrderItem(String dishName, int priceInPaise, int quantity) {}
```

Bas. Itna. Aur ye ek line tumhe ye sab deta hai:

- `dishName`, `priceInPaise`, `quantity` — final fields (auto-immutable)
- Canonical constructor (jo sab fields leta hai)
- Accessor methods: `dishName()`, `priceInPaise()`, `quantity()` — **notice: get prefix nahi!**
- `equals()` — sab fields pe based
- `hashCode()` — sab fields pe based
- `toString()` — `OrderItem[dishName=Paneer Tikka, priceInPaise=34900, quantity=2]`
- Record implicitly `final` hai — koi subclass nahi bana sakta

```java
// Use karna bhi simple hai
var item = new OrderItem("Paneer Tikka", 34900, 2);

System.out.println(item.dishName());      // Paneer Tikka
System.out.println(item.priceInPaise());  // 34900
System.out.println(item);                 // OrderItem[dishName=Paneer Tikka, priceInPaise=34900, quantity=2]

// Equality automatically kaam karta hai
var item2 = new OrderItem("Paneer Tikka", 34900, 2);
System.out.println(item.equals(item2));   // true ✅
```

> [!info] TypeScript se comparison
> Record Java mein wahi hai jo TypeScript mein `type` ya `interface` with readonly fields hai. Difference ye hai ki Java Records automatically `equals`/`hashCode`/`toString` bhi generate karte hain — jo TypeScript mein manually ya library se karna padta.

---

### Compact Constructor — Validation kaise karein

Record ka constructor by default sab fields accept karta hai. But agar validation chahiye? Jaise UPI transaction mein amount negative nahi ho sakta, ya currency null nahi ho sakti.

```java
public record UpiTransaction(long amountInPaise, String upiId, String currency) {

    // Compact constructor — koi parens nahi hote fields ke baad
    public UpiTransaction {
        // Validation pehle
        if (amountInPaise <= 0) {
            throw new IllegalArgumentException(
                "Transaction amount must be positive, got: " + amountInPaise
            );
        }
        if (upiId == null || upiId.isBlank()) {
            throw new IllegalArgumentException("UPI ID cannot be empty");
        }

        // Normalization bhi ho sakta hai — assignment se pehle
        currency = currency != null ? currency.toUpperCase() : "INR";
        upiId = upiId.trim();  // whitespace hata do
    }
}
```

```java
// Use karo
var txn = new UpiTransaction(50000L, " siddesh@upi ", "inr");
System.out.println(txn.currency());  // INR (uppercase ho gaya)
System.out.println(txn.upiId());     // siddesh@upi (trim ho gaya)

// Ye throw karega
var bad = new UpiTransaction(-100L, "siddesh@upi", "INR");
// IllegalArgumentException: Transaction amount must be positive, got: -100
```

> [!tip] Compact Constructor ka syntax
> `public UpiTransaction { ... }` — yahan field names ke saath parens nahi hote. Java automatically fields assign kar leta hai compact constructor ke baad, unless tumne khud explicitly assign kiya ho (normalization ke liye).

---

### Records mein aur kya ho sakta hai?

Records sirf dumb data containers nahi hain — inhe thoda extend kiya ja sakta hai:

```java
public record OrderItem(String dishName, int priceInPaise, int quantity) {

    // Static factory method — clean API ke liye
    public static OrderItem of(String name, double priceInRupees, int qty) {
        return new OrderItem(name, (int)(priceInRupees * 100), qty);
    }

    // Derived method — compute karo fields se
    public int totalPriceInPaise() {
        return priceInPaise * quantity;
    }

    public String displayPrice() {
        return String.format("₹%.2f", priceInPaise / 100.0);
    }

    // Interface implement kar sakte ho
    // Extra instance fields NAHI ho sakte (components ke alawa)
}
```

```java
// Static factory use karo — readable hai
var item = OrderItem.of("Dal Makhani", 249.00, 3);
System.out.println(item.totalPriceInPaise());  // 74700
System.out.println(item.displayPrice());        // ₹249.00
```

> [!warning] Records mein extra instance fields nahi
> Record ke components ke alawa koi instance field declare nahi kar sakte. Static fields (constants) allowed hain. Agar mutable state chahiye, toh regular class use karo.

---

### Record implement kar sakta hai Interface

```java
// Interface banao
public interface Discountable {
    int discountedPrice(int discountPercent);
}

// Record implement kare interface
public record Product(String name, int priceInPaise) implements Discountable {

    @Override
    public int discountedPrice(int discountPercent) {
        // CRED style discount — 20% off on HDFC card
        return priceInPaise - (priceInPaise * discountPercent / 100);
    }
}
```

---

## Sealed Classes/Interfaces (Java 17+) — Discriminated Unions ka Java Version

### Problem: Extensibility jo tumhe nahi chahiye

Socho Swiggy mein payment methods model kar rahe ho. Payment sirf teen tarike ka ho sakta hai: UPI, Card, ya Wallet. Tum chahte ho ki koi teen se bahar kuch bana hi na sake.

TypeScript mein tum likhte:

```typescript
type Payment =
  | { kind: "upi";    upiId: string }
  | { kind: "card";   last4: string; network: string }
  | { kind: "wallet"; walletName: string; balance: number };
```

Compiler guarantee deta hai — sirf yahi teen types exist karenge. Agar koi `{ kind: "crypto" }` add kare toh type error aayega.

Java mein purana tarika? `abstract class Payment` banao — koi bhi extend kar sakta hai. Compiler ko koi pata nahi kitni subclasses hain. Exhaustive checking? Impossible.

**Sealed classes solve this.**

### Sealed Interface — Closed Hierarchy

```java
// "permits" keyword se batao ki exactly kaun extend kar sakta hai
public sealed interface Payment
    permits UpiPayment, CardPayment, WalletPayment {}

// Har subtype ya toh final hoga, ya sealed, ya non-sealed
public record UpiPayment(String upiId, String merchantVpa) implements Payment {}

public record CardPayment(String last4Digits, String network, boolean isInternational)
    implements Payment {}

public record WalletPayment(String walletName, long balanceInPaise)
    implements Payment {}
```

Ab compiler ko **pata hai** ki `Payment` ke exactly teen implementations hain — `UpiPayment`, `CardPayment`, `WalletPayment`. Koi aur nahi. Aur isi wajah se exhaustive pattern matching possible ho jaata hai.

### Sealed Hierarchy ke rules

Sealed class/interface ke subtypes:

1. **`final`** (ya `record`) — hierarchy yahan band ho jaaye. Koi aur extend na kare.
2. **`sealed`** — hierarchy aur extend ho sakti hai, but again restricted.
3. **`non-sealed`** — hierarchy yahan se open ho jaaye (koi bhi extend kar sakta hai). Use karo jab intentionally open karna ho.

```java
// Multi-level sealed hierarchy — Ola ride types
public sealed interface OlaRide permits MiniRide, PremiumRide, AutoRide {}

// MiniRide aur extend ho sakti hai — OlaPlus, OlaShare etc.
public sealed interface MiniRide extends OlaRide permits OlaMini, OlaShare {}
public final class OlaMini  implements MiniRide {}
public final class OlaShare implements MiniRide {}

// PremiumRide final hai
public final record PremiumRide(boolean chauffeurIncluded) implements OlaRide {}

// AutoRide non-sealed hai — koi bhi extend kar sakta hai
public non-sealed class AutoRide implements OlaRide {}
```

---

## Pattern Matching for `instanceof` (Java 16+)

### Pehle wala tarika — ugly cast

```java
// Purana Java — cast karo, phir use karo
Object obj = getPaymentDetails(); // kuch unknown aaya

if (obj instanceof UpiPayment) {
    UpiPayment upi = (UpiPayment) obj;  // manual cast lagao
    System.out.println("UPI ID: " + upi.upiId());
} else if (obj instanceof CardPayment) {
    CardPayment card = (CardPayment) obj;  // phir cast
    System.out.println("Card: " + card.last4Digits());
}
```

### Naya tarika — Pattern matching

```java
// Java 16+ — ek hi step mein check aur cast
Object obj = getPaymentDetails();

if (obj instanceof UpiPayment upi) {
    // 'upi' directly UpiPayment type ka hai — cast nahi karna pada
    System.out.println("UPI ID: " + upi.upiId());
} else if (obj instanceof CardPayment card) {
    System.out.println("Card ending: " + card.last4Digits());
}
```

Ek cheez aur — `instanceof` pattern ka scope sirf us branch mein hota hai jahan condition true hai:

```java
// upi variable sirf if-block ke andar available hai
if (obj instanceof UpiPayment upi) {
    System.out.println(upi.upiId());  // ✅ OK
}
// System.out.println(upi.upiId());  // ❌ Compile error — upi out of scope
```

---

## Pattern Matching for `switch` (Java 21) — Asli Power Yahan Hai

Yeh feature Java 21 mein stable hua aur yahan **Records + Sealed + Switch** ka combination ek kamaal ki cheez create karta hai.

### Basic Type Switch

```java
// Swiggy payment process karo
public static String processPayment(Payment payment) {
    return switch (payment) {
        case UpiPayment upi    -> "UPI payment via " + upi.upiId();
        case CardPayment card  -> "Card payment, last 4: " + card.last4Digits();
        case WalletPayment w   -> "Wallet: " + w.walletName() +
                                  ", balance: ₹" + (w.balanceInPaise() / 100);
        // Default ki zaroorat nahi — sealed hai, compiler jaanta hai
    };
}
```

> [!info] Compiler magic
> Kyunki `Payment` sealed hai aur teen permitted types hain, compiler automatically verify karta hai ki sab cases cover hain. Agar tum ek case bhool gaye toh **compile error** aayega, runtime error nahi. Yeh TypeScript ke exhaustive switch jaisa hi hai.

### Record Patterns — Directly Destructure Karo

Java 21 mein record patterns se tum directly components extract kar sakte ho:

```java
// Record destructuring in switch
public static double calculateFee(Payment payment) {
    return switch (payment) {
        // UpiPayment ke components directly extract karo
        case UpiPayment(String upiId, String merchantVpa) ->
            upiId.endsWith("@paytm") ? 0.0 : 2.0;  // Paytm UPI free

        // CardPayment ke components
        case CardPayment(String last4, String network, boolean isInternational) ->
            isInternational ? 250.0 : 18.0;  // International card pe zyada fee

        // WalletPayment
        case WalletPayment(String walletName, long balance) ->
            walletName.equals("Paytm") ? 0.0 : 5.0;
    };
}
```

Yah `var` bhi use kar sakte ho agar type inference chahiye:

```java
case UpiPayment(var upiId, var merchantVpa) -> processUpi(upiId);
```

### Guards — `when` clause

Guards se tum case mein additional conditions laga sakte ho:

```java
public static String categorizeOrder(int orderAmount) {
    return switch (orderAmount) {
        case int amt when amt < 0      -> "Invalid amount!";
        case int amt when amt == 0     -> "Empty order";
        case int amt when amt < 20000  -> "Small order (under ₹200)";
        case int amt when amt < 100000 -> "Medium order";
        default                        -> "Large order — free delivery! 🎉";
    };
}
```

Real example — Payment ke saath guard:

```java
public static String getPaymentStatus(Payment payment) {
    return switch (payment) {
        // Guard use karo — insufficient balance check
        case WalletPayment w when w.balanceInPaise() < 10000 ->
            "Insufficient wallet balance (need at least ₹100)";

        case WalletPayment w ->
            "Wallet payment approved";

        case UpiPayment upi when upi.upiId().isBlank() ->
            "Invalid UPI ID";

        case UpiPayment upi ->
            "UPI payment to " + upi.merchantVpa();

        case CardPayment(var last4, var network, true) ->
            "International " + network + " card — verification required";

        case CardPayment card ->
            "Domestic card payment approved";
    };
}
```

### `null` Handle karna in Switch

```java
public static String describeInput(Object input) {
    return switch (input) {
        case null          -> "Kuch aaya hi nahi";  // Null explicitly handle karo
        case String s      -> "String: " + s;
        case Integer i     -> "Integer: " + i;
        case Double d      -> "Double: " + d;
        default            -> "Unknown type: " + input.getClass().getSimpleName();
    };
}
```

> [!warning] Pattern switch mein null
> Traditional switch `null` pe `NullPointerException` throw karta tha. Pattern switch mein `case null` explicitly likh sakte ho. Agar nahi likha aur null aaya, toh NPE aayega. Always explicitly handle karo.

---

## Teen Ka Killer Combo — Records + Sealed + Switch

Yeh combination modern Java ka sabse powerful feature hai. Isko samjhao ek real example se.

### TypeScript Version (jo tumhe pehle se pata hai)

```typescript
// TypeScript mein Result type — Rust se inspired
type Result<T> =
  | { kind: "ok";  value: T }
  | { kind: "err"; error: string; code: number };

function processResult<T>(result: Result<T>): T {
    switch (result.kind) {
        case "ok":  return result.value;
        case "err": throw new Error(`[${result.code}] ${result.error}`);
        // TypeScript verify karta hai ki sab cases cover hain
    }
}
```

### Java 21 Version

```java
// Sealed interface + Records = TypeScript discriminated union
public sealed interface Result<T> permits Ok, Err {}

public record Ok<T>(T value) implements Result<T> {}

public record Err<T>(String error, int code) implements Result<T> {}

// Usage
public static <T> T processResult(Result<T> result) {
    return switch (result) {
        case Ok<T>(T value)                -> value;
        case Err<T>(String error, int code) ->
            throw new RuntimeException("[" + code + "] " + error);
        // Compiler verify karta hai exhaustiveness — default ki zaroorat nahi
    };
}
```

```java
// Real use
Result<String> success = new Ok<>("Order placed successfully");
Result<String> failure = new Err<>("Payment failed", 402);

System.out.println(processResult(success));  // Order placed successfully
// processResult(failure);  // RuntimeException: [402] Payment failed
```

---

## Real-World Example — Zomato Order Event System

Socho Zomato ka order lifecycle model karna hai. Har event ek type ka hoga — placed, accepted, picked up, delivered, cancelled.

```java
// Event hierarchy — sealed se restricted
public sealed interface OrderEvent
    permits OrderPlaced, OrderAccepted, OrderPickedUp, OrderDelivered, OrderCancelled {}

// Har event apna relevant data carry karta hai
public record OrderPlaced(
    String orderId,
    String customerId,
    String restaurantId,
    int totalAmountInPaise,
    Payment paymentMethod
) implements OrderEvent {}

public record OrderAccepted(
    String orderId,
    String restaurantId,
    int estimatedMinutes
) implements OrderEvent {}

public record OrderPickedUp(
    String orderId,
    String deliveryPartnerId,
    String partnerName
) implements OrderEvent {}

public record OrderDelivered(
    String orderId,
    long deliveredAt,
    int deliveryTimeMinutes
) implements OrderEvent {}

public record OrderCancelled(
    String orderId,
    String reason,
    boolean refundEligible,
    int refundAmountInPaise
) implements OrderEvent {}
```

```java
// Event processor — exhaustive aur clean
public class ZomatoOrderProcessor {

    public static String processEvent(OrderEvent event) {
        return switch (event) {
            // Pattern destructuring — directly fields nikalo
            case OrderPlaced(var orderId, var customerId, var restaurantId,
                             var amount, var payment) -> {
                // Complex logic ke liye block syntax
                String paymentInfo = switch (payment) {
                    case UpiPayment upi  -> "UPI: " + upi.upiId();
                    case CardPayment c   -> "Card: *" + c.last4Digits();
                    case WalletPayment w -> "Wallet: " + w.walletName();
                };
                yield String.format(
                    "Order %s placed by %s at restaurant %s | Amount: ₹%d | %s",
                    orderId, customerId, restaurantId, amount / 100, paymentInfo
                );
            }

            case OrderAccepted(var orderId, _, var eta) ->
                // _ se unwanted fields ignore karo (Java 21 unnamed patterns)
                "Order " + orderId + " accepted! ETA: " + eta + " minutes";

            case OrderPickedUp(var orderId, _, var partnerName) ->
                "Order " + orderId + " picked up by " + partnerName;

            case OrderDelivered(var orderId, _, var time) when time > 60 ->
                "Order " + orderId + " delivered but LATE! (" + time + " mins) 😤";

            case OrderDelivered(var orderId, _, var time) ->
                "Order " + orderId + " delivered in " + time + " minutes ✅";

            case OrderCancelled(var orderId, var reason, true, var refund) ->
                "Order " + orderId + " cancelled: " + reason +
                " | Refund: ₹" + (refund / 100);

            case OrderCancelled(var orderId, var reason, false, _) ->
                "Order " + orderId + " cancelled: " + reason + " | No refund";
        };
    }
}
```

```java
// Test karo
var placed = new OrderPlaced(
    "ORD-001", "CUST-123", "REST-456",
    34900,
    new UpiPayment("siddesh@paytm", "zomato@hdfcbank")
);

var delivered = new OrderDelivered("ORD-001", System.currentTimeMillis(), 28);
var cancelled = new OrderCancelled("ORD-002", "Restaurant closed", true, 34900);

System.out.println(ZomatoOrderProcessor.processEvent(placed));
// Order ORD-001 placed by CUST-123 at restaurant REST-456 | Amount: ₹349 | UPI: siddesh@paytm

System.out.println(ZomatoOrderProcessor.processEvent(delivered));
// Order ORD-001 delivered in 28 minutes ✅

System.out.println(ZomatoOrderProcessor.processEvent(cancelled));
// Order ORD-002 cancelled: Restaurant closed | Refund: ₹349
```

---

## Real-World Example 2 — JSON Type System

Ek mini JSON AST (Abstract Syntax Tree) banao — ye sealed + records ka classic example hai:

```java
package com.example.modern;

// JSON ke sab possible types — sealed se restrict karo
public sealed interface Json permits JNull, JBool, JNum, JStr, JArr, JObj {}

// Har JSON type ek record hai
public record JNull()                                    implements Json {}
public record JBool(boolean v)                           implements Json {}
public record JNum(double n)                             implements Json {}
public record JStr(String s)                             implements Json {}
public record JArr(java.util.List<Json> items)           implements Json {}
public record JObj(java.util.Map<String, Json> fields)   implements Json {}

public class JsonPrinter {

    public static String print(Json j) {
        return switch (j) {
            // Har case exhaustively handle karo
            case JNull()           -> "null";
            case JBool(boolean v)  -> Boolean.toString(v);
            case JNum(double n)    -> n == Math.floor(n)
                                      ? String.valueOf((long) n)  // 30.0 -> "30"
                                      : String.valueOf(n);
            case JStr(String s)    -> "\"" + s.replace("\"", "\\\"") + "\"";

            // Recursive cases — arrays aur objects
            case JArr(var items)   -> items.stream()
                .map(JsonPrinter::print)
                .collect(java.util.stream.Collectors.joining(", ", "[", "]"));

            case JObj(var fields)  -> fields.entrySet().stream()
                .map(e -> "\"" + e.getKey() + "\": " + print(e.getValue()))
                .collect(java.util.stream.Collectors.joining(", ", "{", "}"));

            // Default ki zaroorat nahi — Json sealed hai, sab covered hain
        };
    }

    public static void main(String[] args) {
        // Ek sample JSON object build karo
        Json profile = new JObj(java.util.Map.of(
            "name",    new JStr("Siddesh"),
            "age",     new JNum(25),
            "isActive",new JBool(true),
            "score",   new JNull(),
            "tags",    new JArr(java.util.List.of(
                           new JStr("java"),
                           new JStr("typescript"),
                           new JStr("web3")
                       ))
        ));

        System.out.println(print(profile));
        // {"name": "Siddesh", "age": 25, "isActive": true, "score": null, "tags": ["java", "typescript", "web3"]}
    }
}
```

---

## TypeScript vs Java 21 — Side by Side

| TypeScript | Java 21 |
|---|---|
| `type User = { id: number; name: string }` | `record User(long id, String name) {}` |
| `readonly` fields | Record fields (auto-final) |
| `type X = A \| B \| C` (union) | `sealed interface X permits A, B, C` |
| Discriminated union + `kind` field | `sealed` + pattern switch |
| `if ("foo" in obj)` type narrowing | `if (obj instanceof Foo f)` |
| Exhaustive switch (`never` check) | Exhaustive switch on sealed (compile-checked) |
| Object destructuring in switch | Record patterns `case Circle(var r)` |
| `{ ...user, name: "New" }` spread copy | `new User(user.id(), "New")` |
| Optional chaining `obj?.field` | `Optional<T>` ya explicit null check |
| `switch (x) { case "a": ...}` | `switch (x) { case String s when s.equals("a"): ... }` |

---

## Gotchas — Beginners Yahan Galti Karte Hain

> [!warning] Records shallowly immutable hote hain
> `record Box(List<String> items)` — `items` field `final` hai, matlab reference change nahi ho sakta. **But list ke andar ke elements change ho sakte hain!**
> ```java
> var items = new ArrayList<>(List.of("a", "b"));
> var box = new Box(items);
> items.add("c");  // Box ke items bhi change ho gaye! 😱
>
> // Fix: compact constructor mein defensive copy
> public record Box(List<String> items) {
>     public Box {
>         items = List.copyOf(items);  // Immutable copy
>     }
> }
> ```

> [!warning] Accessor methods mein `get` prefix nahi hota
> `user.name()` — NOT `user.getName()`. Jackson (JSON library) aur Spring ye samjhte hain, but agar kisi purane bean-style code ke saath integrate karo toh dikkat aa sakti hai. Agar Jackson use karo toh `@JsonProperty` ya Jackson's record support enable karo.

> [!warning] Records `extend` nahi kar sakte
> Records implicitly `java.lang.Record` extend karte hain. Isliye koi aur class extend nahi kar sakte. Interfaces implement kar sakte hain — that's fine.
> ```java
> // ❌ Ye compile nahi hoga
> public record Admin(long id) extends User {}
>
> // ✅ Ye theek hai
> public record Admin(long id) implements Authenticatable {}
> ```

> [!warning] Pattern matching Java versions mein evolve hua
> - Java 14/15: `instanceof` pattern (preview)
> - Java 16: `instanceof` pattern (stable)
> - Java 17: Sealed classes (stable)
> - Java 19/20: Record patterns (preview)
> - Java 21: Record patterns + Pattern switch (stable)
>
> **Always Java 21 target karo** modern Java features ke liye. `pom.xml` mein check karo:
> ```xml
> <properties>
>     <java.version>21</java.version>
> </properties>
> ```

> [!warning] `default` case aur sealed
> Agar sealed interface pe switch mein `default` case lagaoge toh compiler exhaustiveness check nahi karta. Matlab naya subtype add karo — compiler warn nahi karega!
> ```java
> // ❌ Default lagane se exhaustiveness check lost
> return switch (payment) {
>     case UpiPayment u   -> handleUpi(u);
>     case CardPayment c  -> handleCard(c);
>     default             -> "unknown";  // WalletPayment bhool gaye — compiler silent
> };
>
> // ✅ Bina default — compiler WalletPayment missing bataega
> return switch (payment) {
>     case UpiPayment u    -> handleUpi(u);
>     case CardPayment c   -> handleCard(c);
>     case WalletPayment w -> handleWallet(w);  // Compiler force karta hai
> };
> ```

> [!tip] Records replace karte hain 80% Lombok
> Agar Lombok `@Data` ya `@Value` use kar rahe ho sirf boilerplate ke liye, toh Record better hai. Sirf `@Builder` ya JPA entities (`@Entity`) ke liye Lombok keep karo — kyunki JPA ko mutable objects chahiye jo Records nahi hote.

---

## Spring Boot mein Records

Spring Boot Records ko well support karta hai:

```java
// DTOs as Records — bilkul perfect use case
public record CreateOrderRequest(
    String customerId,
    String restaurantId,
    List<OrderItem> items,
    Payment payment
) {}

public record OrderResponse(
    String orderId,
    String status,
    int totalAmount,
    String estimatedTime
) {}

// Controller mein use karo
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(
        @RequestBody CreateOrderRequest request  // Jackson automatically deserialize karta hai
    ) {
        // Process...
        return ResponseEntity.ok(new OrderResponse(
            "ORD-" + System.currentTimeMillis(),
            "PLACED",
            request.items().stream()
                .mapToInt(OrderItem::totalPriceInPaise)
                .sum(),
            "30-40 minutes"
        ));
    }
}
```

> [!info] Jackson + Records
> Spring Boot 2.7+ aur Jackson 2.12+ Records ko automatically handle karte hain. Koi extra configuration nahi chahiye normally. Agar issue aaye toh `spring.jackson.mapper.use-annotations=true` check karo.

---

## Key Takeaways

- **Records** ek line mein immutable data class banate hain — constructor, accessors, equals, hashCode, toString sab included. TypeScript ke `type`/`interface` jaisa, but runtime equality ke saath.

- **Compact Constructor** validation aur normalization ke liye hai — `if (x < 0) throw ...` aur `field = normalized(field)` dono allowed hain.

- **Sealed Classes/Interfaces** restrict karte hain ki kaun extend kar sakta hai — exactly TypeScript discriminated unions jaisa. `permits Foo, Bar, Baz` likho aur hierarchy closed ho jaati hai.

- **Pattern matching for `instanceof`** cast-after-check dance khatam karta hai — `if (obj instanceof User u)` mein `u` already typed hai.

- **Pattern matching for `switch`** (Java 21) sealed types pe exhaustive checking deta hai — naya subtype add karo aur har switch compile error dene lagega jab tak update na karo.

- **Record patterns in switch** — `case Circle(double r)` se directly destructure karo. `when` guards se conditional logic add karo.

- **Teen ka combo** — `sealed interface` + `record` subtypes + pattern `switch` = TypeScript discriminated unions ka Java equivalent, with compile-time exhaustiveness guarantee.

- **Shallow immutability gotcha** — Record ke `List`/`Map` fields ke andar mutate ho sakta hai. `List.copyOf()` use karo compact constructor mein real immutability ke liye.

- **`get` prefix nahi** — `user.name()` not `user.getName()`. Jackson ye jaanta hai, but purana Spring XML config nahi jaan sakta.

- **Java 21 target karo** — Record patterns aur Pattern switch stable yahan se hain. `pom.xml` mein `<java.version>21</java.version>` confirm karo.

- **Spring DTOs** — Request/Response DTOs ke liye Records perfect hain. JPA Entities ke liye use mat karo (JPA ko mutable objects chahiye).
