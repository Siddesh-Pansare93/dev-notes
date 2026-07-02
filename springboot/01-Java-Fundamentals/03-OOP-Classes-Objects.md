# OOP — Classes, Objects, Constructors

Yaar, agar tum Node.js/TypeScript se aaye ho, toh OOP tumhare liye completely naya nahi hai. TypeScript mein bhi classes hoti hain. Lekin Java ka OOP ek level zyada strict hai — aur iska ek solid reason bhi hai.

Socho Zomato ka backend. Har restaurant ek **object** hai. Har order ek **object** hai. Har delivery partner ek **object** hai. In sab ke apne **state** (data) aur **behaviour** (kya kar sakta hai) hote hain. OOP exactly yahi model karta hai — real-world cheezein code mein represent karna.

Java mein **sab kuch class ke andar hai**. Node.js mein tum ek loose function likh ke `module.exports` kar dete ho. Java mein? Nahi. Har function kisi na kisi class ka member hona chahiye. Pehle yeh weird lagta hai, phir sense banta hai.

> [!info] TypeScript wale ke liye shortcut
> Agar TypeScript classes use ki hain, toh 80% already pata hai. Sirf 3 cheezein different hain:
> 1. **Sab kuch class ke andar hona chahiye** — koi top-level function nahi
> 2. **Fields ka default access `public` nahi, `package-private` hai** — yeh TS devs ko trip karta hai
> 3. **Constructor ka naam `constructor` nahi hota — class ka naam hota hai** (aur koi return type nahi)
> 4. **Default parameter values nahi hote** — uski jagah constructor overloading use karo

---

## Class ka Anatomy — Isko Samajhna Sabse Zaroori Hai

Chalo ek concrete example se shuru karte hain. Maano hum Flipkart ke liye ek `Product` class bana rahe hain:

```java
package com.flipkart.catalog;

public class Product {
    // Fields — yeh object ka "state" hai
    // private matlab sirf is class ke andar accessible
    // final matlab ek baar set hua toh change nahi hoga (TS ka readonly)
    private final String sku;       // Stock Keeping Unit — unique identifier
    private String name;
    private double price;
    private int stockCount;

    // Constructor — class ka hi naam hota hai, koi return type nahi
    // Yeh tabb call hota hai jab tum 'new Product(...)' likhte ho
    public Product(String sku, String name, double price, int stockCount) {
        // 'this.sku' matlab is object ka field
        // sirf 'sku' matlab constructor ka parameter
        this.sku        = sku;
        this.name       = name;
        this.price      = price;
        this.stockCount = stockCount;
    }

    // Getters — private field ko bahar read karne ka tarika
    // Java mein koi built-in property syntax nahi, sirf methods
    public String getSku()        { return sku; }
    public String getName()       { return name; }
    public double getPrice()      { return price; }
    public int getStockCount()    { return stockCount; }

    // Setter — price change ho sakti hai, sku nahi (final hai)
    public void setPrice(double price) {
        if (price < 0) throw new IllegalArgumentException("Price negative nahi ho sakti!");
        this.price = price;
    }

    public void decrementStock(int qty) {
        if (qty > stockCount) throw new IllegalStateException("Itna stock nahi hai!");
        this.stockCount -= qty;
    }

    // Behaviour — object kya kar sakta hai
    public double priceWithGST(double gstRate) {
        return price * (1 + gstRate);   // 18% GST ke liye 0.18 pass karo
    }

    public boolean isInStock() {
        return stockCount > 0;
    }

    // Object.toString() override — debugging ke liye bahut kaam aata hai
    // Jab tum System.out.println(product) karte ho, yahi print hota hai
    @Override
    public String toString() {
        return "Product[sku=%s, name=%s, price=₹%.2f, stock=%d]"
                .formatted(sku, name, price, stockCount);
    }
}
```

Ab isse use karte hain:

```java
// 'new' keyword se object banate hain — heap pe allocate hota hai
Product iphone = new Product("IPH-15", "iPhone 15", 79999.00, 50);

System.out.println(iphone.getName());               // iPhone 15
System.out.println(iphone.priceWithGST(0.18));     // 94398.82
System.out.println(iphone.isInStock());             // true
System.out.println(iphone);                         // toString() automatic call hota hai
// Output: Product[sku=IPH-15, name=iPhone 15, price=₹79999.00, stock=50]

iphone.decrementStock(5);    // 5 units bik gayi
iphone.setPrice(74999.00);   // sale price
```

**TypeScript mein yahi kuch aise dikhta:**

```typescript
class Product {
    readonly sku: string;
    name: string;
    price: number;
    stockCount: number;

    constructor(sku: string, name: string, price: number, stockCount: number) {
        this.sku = sku;
        this.name = name;
        this.price = price;
        this.stockCount = stockCount;
    }

    priceWithGST(gstRate: number): number {
        return this.price * (1 + gstRate);
    }
}
```

Structure almost same hai — bas Java mein types explicit hain aur `constructor` keyword ki jagah class ka naam use hota hai.

---

## Access Modifiers — Kaun Kya Dekh Sakta Hai

Yeh Java ka ek important concept hai. Socho ek gated society (apartment complex) — kuch cheezein sirf ghar ke andar, kuch building mein, kuch poori society mein accessible hoti hain.

| Modifier | Kahan se access? | Real-world analogy |
|---|---|---|
| `public` | Kahin se bhi | Society ka main gate — sab aa sakte hain |
| `protected` | Same package + subclasses | Building ke andar + relatives |
| *(kuch nahi)* — "package-private" | Sirf same package | Ek hi building ke residents |
| `private` | Sirf same class | Ghar ke andar ka bedroom |

```java
public class BankAccount {
    private double balance;          // sirf is class ke methods dekh sakte hain
    String accountType;             // package-private — koi modifier nahi = galat lagta hai lekin hai yeh
    protected String branchCode;    // same package + subclasses
    public String accountNumber;    // sab dekh sakte hain
}
```

> [!warning] Yeh trap bohot common hai TS devs ke liye
> TypeScript mein class field ka default access `public` hai. Java mein **package-private** hai (koi modifier nahi likha toh). Agar tum modifier bhool gaye aur socha "public hai" — nahi hai! Always explicitly `public` likhna.

**Best practice:** Fields almost always `private` rakho. Access ke liye getters/setters banao. Isse encapsulation milta hai — baad mein implementation change karo, bahar wala code nahi tootega.

---

## Constructors — Object Kaisa Banta Hai

Constructor woh special method hai jo `new` ke saath call hota hai. Iska koi return type nahi hota aur naam class jaisa hota hai.

### Basic Constructor

```java
public class DeliveryPartner {
    private final String partnerId;
    private final String name;
    private String currentCity;
    private boolean isAvailable;

    // Main constructor
    public DeliveryPartner(String partnerId, String name, String currentCity) {
        this.partnerId   = partnerId;
        this.name        = name;
        this.currentCity = currentCity;
        this.isAvailable = true; // default — naya partner available hai
    }
}
```

### Constructor Overloading — Default Parameters ka Jugaad

Java mein default parameter values nahi hote (TypeScript mein `function foo(x = 0)` hota hai). Iske badle **overloading** use karte hain — same name ke alag alag constructors alag alag parameters ke saath.

```java
public class Coupon {
    private final String code;
    private final double discountPercent;
    private final int maxUses;
    private final boolean isActive;

    // Full constructor — sab parameters
    public Coupon(String code, double discountPercent, int maxUses, boolean isActive) {
        this.code            = code;
        this.discountPercent = discountPercent;
        this.maxUses         = maxUses;
        this.isActive        = isActive;
    }

    // Shortcut — active coupon banana, maxUses default 100
    // this(...) se main constructor call ho jaata hai — DRY principle
    public Coupon(String code, double discountPercent) {
        this(code, discountPercent, 100, true);
    }

    // Aur bhi shortcut — sirf code, baaki sab default
    public Coupon(String code) {
        this(code, 10.0);  // 10% discount default
    }
}
```

```java
// Teen tarike se Coupon bana sakte ho
Coupon c1 = new Coupon("SAVE50", 50.0, 200, true);  // full control
Coupon c2 = new Coupon("NEWUSER", 20.0);             // 100 uses, active
Coupon c3 = new Coupon("WELCOME");                   // 10% off, 100 uses, active
```

> [!tip] `this(...)` rule
> `this(...)` sirf constructor ke andar call ho sakta hai, aur **pehli line** honi chahiye. Usse pehle koi code nahi likh sakte.

---

## `this` Keyword — JS/TS se Bahut Safe Hai

JavaScript mein `this` ek nightmare hai. Arrow functions, `bind`, `call`, `apply` — sab confusion create karte hain. Java mein `this` bahut predictable hai:

- `this` **hamesha current object** ko refer karta hai
- `this` kabhi "lost" nahi hota — method pass karo, `this` bound rahega
- Koi `bind()`/`call()`/`apply()` ki zaroorat nahi

```java
public class Rider {
    private String name;
    private int deliveriesCompleted;

    public Rider(String name) {
        // 'this.name' = field; 'name' = parameter
        // Agar same naam hain, toh this. zaruri hai
        this.name = name;
        this.deliveriesCompleted = 0;
    }

    public void completeDelivery() {
        this.deliveriesCompleted++;
        // 'this' bhi hataa sakte ho jab parameter se clash na ho
        // deliveriesCompleted++; // yeh bhi kaam karta hai
    }

    public String getStatus() {
        // 'this' yahan optional hai lekin clear karta hai
        return this.name + " ne " + this.deliveriesCompleted + " deliveries ki hain";
    }
}
```

---

## Static Members — Class Level, Instance Level Nahi

`static` matlab woh cheez sirf class se belong karti hai, kisi specific object se nahi.

**Analogy:** Zomato ka headquarters — yeh Zomato company (class) ka hai, kisi specific restaurant (instance) ka nahi.

```java
public class GST {
    // Static constant — class level pe ek hi copy
    // Math.PI jaisi — har jagah same
    public static final double FOOD_GST    = 0.05;  // 5%
    public static final double CLOTHES_GST = 0.12;  // 12%
    public static final double PHONE_GST   = 0.18;  // 18%

    // Static method — object banaye bina call kar sakte ho
    public static double calculate(double price, double rate) {
        return price * rate;
    }

    // Static counter — kitne baar call hua track karta hai
    private static int calculationCount = 0;

    public static double calculateAndTrack(double price, double rate) {
        calculationCount++;
        return price * rate;
    }

    public static int getCalculationCount() {
        return calculationCount;
    }
}
```

```java
// Object banaye bina direct use karo
double tax = GST.calculate(1000, GST.FOOD_GST);  // 50.0
System.out.println("GST: ₹" + tax);

// Static field — class ke zariye access
System.out.println(GST.getCalculationCount());   // 0 (abhi tak koi call nahi)
GST.calculateAndTrack(500, GST.CLOTHES_GST);
System.out.println(GST.getCalculationCount());   // 1
```

**TypeScript equivalent:**

```typescript
class GST {
    static readonly FOOD_GST = 0.05;
    static calculate(price: number, rate: number): number {
        return price * rate;
    }
}
```

Bilkul same concept — Java mein sirf types zyada strict hain.

> [!warning] Static se Instance fields access nahi kar sakte
> `static` method ke andar `this` nahi hota — koi specific object nahi hai. Isliye static method se instance variable access karne ki koshish karo toh compiler error aata hai. Yeh common beginner mistake hai.

---

## `equals` aur `hashCode` — Yeh Ignore Kiya Toh Maarega

Yaar, yeh ek aisa concept hai jo agar samjha nahi toh production mein bugs aate hain. Seedha example se samjho.

### Problem

```java
Product p1 = new Product("IPH-15", "iPhone 15", 79999.00, 50);
Product p2 = new Product("IPH-15", "iPhone 15", 79999.00, 50);

// Kya yeh equal hain?
System.out.println(p1 == p2);        // FALSE! Alag alag heap locations
System.out.println(p1.equals(p2));   // bhi FALSE by default — same problem
```

**Kyun?** By default, `equals()` reference check karta hai (same object? same memory address?). Tum same data se do alag objects banao — Java ko nahi pata "yeh logically same hain".

JavaScript mein bhi yahi hota hai: `{} === {}` is `false`. Difference yeh hai ki Java mein iska solution clearly defined hai.

### Solution — Override Karo

```java
public class Product {
    private final String sku;
    private String name;
    private double price;

    // Constructor... (upar wala)

    @Override
    public boolean equals(Object o) {
        // Same reference? Toh definitely equal
        if (this == o) return true;

        // null hai ya alag class? Toh nahi
        // 'instanceof Product p' = pattern matching (Java 16+)
        if (!(o instanceof Product p)) return false;

        // Business logic: do products equal hain agar SKU same hai
        return sku.equals(p.sku);
    }

    @Override
    public int hashCode() {
        // equals() ke saath hamesha hashCode() bhi override karo!
        // Rule: agar a.equals(b) true hai, toh a.hashCode() == b.hashCode() hona chahiye
        return sku.hashCode();
    }
}
```

Ab:

```java
Product p1 = new Product("IPH-15", "iPhone 15", 79999.00, 50);
Product p2 = new Product("IPH-15", "iPhone 15", 79999.00, 50);

System.out.println(p1.equals(p2));   // TRUE! SKU same hai

// HashMap/HashSet ke saath bhi kaam karega
Set<Product> catalog = new HashSet<>();
catalog.add(p1);
System.out.println(catalog.contains(p2));  // TRUE — hashCode match karta hai
```

> [!warning] HashMap mein object daala aur hashCode override nahi kiya?
> Agar `equals` override kiya lekin `hashCode` nahi, toh `HashMap.get()` aur `HashSet.contains()` **galat results** denge. Yeh ek silent bug hai — no exception, bas wrong behaviour. Hamesha dono saath override karo.

> [!tip] IDE ya Records use karo
> IntelliJ mein `Alt+Insert` → "equals() and hashCode()" — automatic generate ho jaata hai. Ya phir Records use karo (Java 16+) — woh automatically sab kuch karte hain.

---

## Object Lifecycle — Kahan Se Aata Hai, Kahan Jaata Hai

```java
// 1. 'new' keyword — heap pe memory allocate hoti hai
//    Constructor call hota hai
Product p = new Product("X", "Test", 100.0, 10);

// 2. Reference variable 'p' stack pe hota hai, actual object heap pe
//    Jaise JavaScript mein objects work karte hain

// 3. Jab 'p' scope se bahar jaata hai ya null ho jaata hai,
//    object "unreachable" ho jaata hai

p = null;  // Ab koi reference nahi

// 4. Garbage Collector (GC) apne time pe aa ke memory free kar deta hai
//    Tum directly memory free nahi karte — Java ka yeh kaam hai
//    C++ ka 'delete' yahan nahi hota
```

**Node.js comparison:** V8 engine bhi garbage collection karta hai. Same concept — tum memory manually manage nahi karte. Java ka GC thoda zyada configurable aur predictable hai.

> [!info] try-with-resources
> Agar koi resource (file, database connection, network socket) use karo, toh close karna zaroori hai. GC sirf memory free karta hai, resources nahi. Iske liye `try-with-resources` syntax hai — Exceptions wale file mein cover hoga.

---

## Ek Real-World Example — Swiggy Order System

Ab sab cheezein ek jagah combine karte hain:

```java
package com.swiggy.orders;

import java.util.ArrayList;
import java.util.List;

public class Order {
    // Static counter — har order ka unique ID
    private static long orderCounter = 0;

    private final long orderId;
    private final String customerId;
    private final String restaurantId;
    private final List<OrderItem> items = new ArrayList<>();
    private OrderStatus status;
    private double deliveryFee;

    // Enum — status ke liye valid values defined
    public enum OrderStatus {
        PENDING,      // order diya, restaurant ne accept nahi kiya
        ACCEPTED,     // restaurant ne accept kiya
        PREPARING,    // khana ban raha hai
        OUT_FOR_DELIVERY,  // delivery partner ke paas hai
        DELIVERED,    // hogaya!
        CANCELLED     // cancel
    }

    // Constructor
    public Order(String customerId, String restaurantId) {
        this.orderId      = ++orderCounter;  // static counter se unique ID
        this.customerId   = customerId;
        this.restaurantId = restaurantId;
        this.status       = OrderStatus.PENDING;
        this.deliveryFee  = 30.0;  // default delivery fee
    }

    // Item add karo — sirf PENDING status mein
    public void addItem(OrderItem item) {
        if (status != OrderStatus.PENDING) {
            throw new IllegalStateException(
                "Order " + orderId + " ka status " + status + " hai — items add nahi kar sakte"
            );
        }
        items.add(item);
    }

    // Total calculate karo
    public double getSubtotal() {
        return items.stream()
                    .mapToDouble(OrderItem::getTotalPrice)
                    .sum();
    }

    public double getGrandTotal() {
        return getSubtotal() + deliveryFee;
    }

    // Status update — valid transitions enforce karo
    public void updateStatus(OrderStatus newStatus) {
        // Business rule: CANCELLED se kuch nahi ho sakta
        if (this.status == OrderStatus.CANCELLED) {
            throw new IllegalStateException("Cancelled order ka status change nahi ho sakta");
        }
        this.status = newStatus;
    }

    public void cancel() {
        if (status == OrderStatus.OUT_FOR_DELIVERY || status == OrderStatus.DELIVERED) {
            throw new IllegalStateException("Delivery pe hai ya ho gayi — cancel nahi ho sakti!");
        }
        this.status = OrderStatus.CANCELLED;
    }

    // Getters
    public long getOrderId()        { return orderId; }
    public String getCustomerId()   { return customerId; }
    public OrderStatus getStatus()  { return status; }
    public List<OrderItem> getItems() { return List.copyOf(items); } // immutable copy return karo

    @Override
    public String toString() {
        return "Order#%d [customer=%s, restaurant=%s, total=₹%.2f, status=%s]"
                .formatted(orderId, customerId, restaurantId, getGrandTotal(), status);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Order other)) return false;
        return orderId == other.orderId;
    }

    @Override
    public int hashCode() {
        return Long.hashCode(orderId);
    }
}
```

```java
// OrderItem class — ek simple supporting class
public class OrderItem {
    private final String itemName;
    private final double unitPrice;
    private final int quantity;

    public OrderItem(String itemName, double unitPrice, int quantity) {
        this.itemName  = itemName;
        this.unitPrice = unitPrice;
        this.quantity  = quantity;
    }

    public double getTotalPrice() { return unitPrice * quantity; }
    public String getItemName()   { return itemName; }
}
```

```java
// Ab isko use karte hain:
public static void main(String[] args) {
    Order order = new Order("user_123", "rest_456");

    order.addItem(new OrderItem("Butter Chicken", 320.0, 1));
    order.addItem(new OrderItem("Garlic Naan", 60.0, 3));
    order.addItem(new OrderItem("Dal Makhani", 280.0, 1));

    System.out.println("Order placed: " + order);
    // Order#1 [customer=user_123, restaurant=rest_456, total=₹810.00, status=PENDING]

    order.updateStatus(Order.OrderStatus.ACCEPTED);
    order.updateStatus(Order.OrderStatus.PREPARING);
    order.updateStatus(Order.OrderStatus.OUT_FOR_DELIVERY);

    System.out.println("Final: " + order);
    // Order#1 [customer=user_123, restaurant=rest_456, total=₹810.00, status=OUT_FOR_DELIVERY]

    // Yeh exception throw karega
    try {
        order.cancel();
    } catch (IllegalStateException e) {
        System.out.println("Error: " + e.getMessage());
        // Error: Delivery pe hai ya ho gayi — cancel nahi ho sakti!
    }
}
```

---

## TypeScript vs Java — Side by Side

| TypeScript | Java |
|---|---|
| `class Foo { constructor(...) {} }` | `public class Foo { public Foo(...) {} }` |
| `private name: string` | `private String name;` |
| `readonly id: string` | `private final String id;` |
| `name: string = "default"` | Field initializer ya constructor mein |
| Default param `x = 0` | Constructor overloading + `this(...)` |
| `static foo()` | `public static void foo()` |
| `public` by default | Package-private by default (koi modifier nahi) |
| `obj.method.bind(obj)` | Zaroorat nahi — `this` hamesha bound |
| `JSON.stringify(obj)` | `obj.toString()` (override karna padta hai) |
| `a === b` (reference) | `a == b` (reference) |
| `deepEqual(a, b)` | `a.equals(b)` (agar override kiya) |
| `interface Foo {}` | `interface Foo {}` (alag file mein) |
| `type Foo = { x: number }` | Record ya class banao |
| `{ name: "foo" }` object literal | Koi shorthand nahi — class ya record banao |

---

## Gotchas — Yeh Mistakes Mat Karna

> [!warning] `this.` bhool gaye toh field assign nahi hogi
> Jab constructor parameter aur field ka naam same ho, `this.` must hai. Varna parameter apne aap ko assign ho jaata hai — compiler bhi nahi rokata:
> ```java
> public Product(String name) {
>     name = name;   // GALAT! Parameter khud ko assign kar raha hai
>     this.name = name;  // SAHI!
> }
> ```

> [!warning] Java mein koi property syntax nahi
> TypeScript mein `get name() { return this._name; }` likhte ho. Java mein koi aisa built-in syntax nahi. Convention hai `getName()` / `setName()` — yahi getters/setters hain. Spring, Jackson, Hibernate — sab frameworks isi convention par depend karte hain. Agar `getName()` ki jagah `fetchName()` likh diya toh frameworks kaam nahi karenge.

> [!warning] Ek `public` class, ek file
> Agar `Order` class `public` hai, toh file ka naam **zaruri** `Order.java` hona chahiye. Ek file mein ek se zyada `public` class nahi ho sakti. Yeh Java ka hard rule hai — compiler error aata hai.

> [!warning] `==` vs `.equals()` — Sabse Common Bug
> Java mein `==` hamesha reference compare karta hai (same object?). String comparison mein yeh bahut commonly galti hoti hai:
> ```java
> String s1 = "hello";
> String s2 = new String("hello");
> System.out.println(s1 == s2);       // FALSE — alag objects
> System.out.println(s1.equals(s2));  // TRUE — content same hai
> ```
> **Hamesha `.equals()` use karo** objects compare karne ke liye. `==` sirf primitives (`int`, `double`, etc.) ke liye use karo.

> [!warning] Mutable List return karna — Security Issue
> ```java
> // GALAT — baahri code tumhari internal list modify kar sakta hai
> public List<OrderItem> getItems() { return items; }
>
> // SAHI — unmodifiable copy return karo
> public List<OrderItem> getItems() { return List.copyOf(items); }
> ```

> [!tip] Immutability ko prefer karo
> Jitna ho sake, fields ko `final` banao aur setters mat banao. Isse code zyada predictable hota hai aur multi-threading mein bugs kam hote hain. Spring Boot + JPA mein kuch cases mein mutable objects zaruri hote hain, lekin pure value types ke liye Records use karo (Java 16+).

---

## Key Takeaways

- **Class = blueprint, Object = actual instance.** `new` keyword se object banta hai, heap pe allocate hota hai.
- **Fields private rakhna best practice hai** — bahar ke code ko direct access mat do. Getters/setters use karo.
- **Constructor ka naam class ka naam hota hai, koi return type nahi.** Java mein `constructor` keyword nahi hota.
- **Default access modifier package-private hai** — TypeScript ki tarah `public` by default nahi. Hamesha explicitly likho.
- **No default parameters — constructor overloading use karo** aur `this(...)` se chain karo.
- **`this` kabhi lost nahi hota** — no `bind()`, no arrow function jugaad needed.
- **`static` = class level**, object banaye bina access karo. Instance fields/methods `static` context se access nahi hote.
- **`equals()` aur `hashCode()` hamesha saath override karo** — HashMap/HashSet ke liye zaruri hai.
- **`==` sirf reference compare karta hai** — objects compare karne ke liye hamesha `.equals()` use karo.
- **GC memory manage karta hai** — koi `delete`/`free` nahi. Resources (files, connections) ke liye try-with-resources use karo.
- **One public class per file** — file ka naam public class ke naam se match karna chahiye.
