# MOC: Java Fundamentals — Ek Node.js Dev ki Nazar Se

> [!info] Yeh file kya hai?
> Yeh ek **Map of Content** hai — ek navigator jaise Zomato ka map hota hai restaurants ke liye, waise yeh Java seekhne ke liye tumhara map hai. TypeScript background hai toh seedha Spring pe jump mat karo — pehle yeh fundamentals pakdo, warna baad mein bahut zyada confusion hogi. Har link ek full notes file hai. Is MOC ka kaam hai tujhe yeh batana ki **kahan se shuru karo, kya skip kar sakte ho, aur kya must-read hai.**

---

## Kyun Java Fundamentals? Seedha Spring kyun nahi?

Suno — main samajhta hoon. Tum Express mein ek server 10 lines mein likhte the:

```typescript
import express from 'express';
const app = express();
app.get('/orders', (req, res) => res.json({ orders: [] }));
app.listen(3000);
```

Spring mein same cheez ke liye pehle annotations, Beans, Application Context, Dependency Injection — sab kuch aata hai. Agar Java ki basics seedhi nahi hain, toh Spring ek black box lagega. Tum copy-paste karoge, kaam karega, lekin pata nahi kyun karega.

Real project mein kya hota hai — Swiggy jaisi company ka order service likhte waqt tumhe:
- **Checked exceptions** ko properly handle karna hota hai (payment failure pe kya karo?)
- **Generics** samajhni padti hain (`List<Order>` ko `List<Object>` se confuse nahi karna)
- **Concurrency** handle karni padti hai (1000 orders ek saath aaye toh?)
- **Streams** se data transform karna hota hai (orders ko filter, sort, group karna)

Yeh sab Java fundamentals hain. Chhota investment, bada return.

---

## The Platform — JVM ke Andar Kya Hota Hai

> [!info] Node.js se analogy
> Node.js mein V8 engine hota hai jo JavaScript run karta hai. Java mein **JVM** (Java Virtual Machine) hoti hai jo bytecode run karti hai. Difference yeh hai — Java ka code pehle compile hota hai `.class` files mein, phir JVM run karta hai. Node.js JIT compilation karta hai at runtime. Dono eventually machine code banate hain — rasta alag hai.

- [[01-JDK-JRE-JVM-Basics]] — JDK vs JRE vs JVM kya hota hai, actually kya run karta hai tumhara code. Ek baar padhlo, concept clear ho jaayega.
- [[02-Bytecode-and-Class-Loading]] — `javac` kya produce karta hai, aur JVM usse kaise load karta hai. Spring mein class loading tricks bahut use hoti hain (jaise hot reload).
- [[03-JVM-Memory-and-GC]] — Heap, stack, garbage collectors. **Production mein jab app slow ho jaaye** ya memory leak aaye, tab yeh samajhna zaroori hai. Pehle skim karo, baad mein GC pauses dekho toh wapas aao.
- [[04-Modules-and-the-Module-System]] — JPMS (Java 9+). Honestly? Shuru mein ignore kar sakte ho. Jab library compatibility issues aayein tab padhna.

> [!tip] Kya padhna zaroori hai?
> **01 aur 03 must-read hain.** 02 helpful hai Spring samajhne ke liye. 04 baad mein padhna.

---

## Language Basics — Woh Cheezein Jo TypeScript Se Alag Hain

Yahan pe sabse zyada "aha moments" aayenge — aur sabse zyada "yaar yeh kyun aisa hai" moments bhi.

### Classes aur Objects

- [[01-Classes-and-Objects]] — Java mein sab kuch class ke andar hai. `export default function` jaisi cheez nahi hoti. Ek file, ek public class — yeh rule hai.

Node.js mein tum aise likhte the:
```typescript
// orders.service.ts
export const getOrders = async (userId: string) => { ... };
```

Java mein yeh aise hoga:
```java
// OrderService.java — file ka naam class ke naam se match karna chahiye
public class OrderService {
    public List<Order> getOrders(String userId) { ... }
}
```

Yeh sirf syntax nahi hai — Java mein **everything is an object** (except primitives). Functions float nahi karte — hamesha kisi class ke andar rehte hain.

### Types ka Chakkar

- [[02-Primitives-vs-Reference-Types]] — **Yeh ek important gotcha hai.** Java mein `int` aur `Integer` alag hain. `int` primitive hai (stack pe), `Integer` object hai (heap pe). TypeScript mein `number` ek hi tha. Yahan dono hain — aur auto-boxing ke waqt subtle bugs aa sakte hain.

```java
int a = 5;        // primitive — stack pe
Integer b = 5;    // object — heap pe (auto-boxed)

// Gotcha:
Integer x = 1000;
Integer y = 1000;
System.out.println(x == y);      // false! (reference comparison)
System.out.println(x.equals(y)); // true  (value comparison)
// -128 se 127 tak ke liye == kaam karta hai (cache hai), baad mein nahi
```

- [[03-Visibility-and-Access-Modifiers]] — `public`, `private`, `protected`, aur default (package-private). TypeScript mein `export`/no-export tha. Java mein 4 levels hain. Spring mein usually `public` service methods hote hain, `private` helper methods. Pattern samjho.
- [[04-Static-vs-Instance]] — `static` matlab class ke saath — koi bhi object banana zaroori nahi. `instance` matlab har object ka apna. Spring mein mostly instance methods use hoti hain (Spring Beans singletons hote hain).
- [[05-Constructors-and-Initialization]] — Constructors seedhe hain. Lekin Spring mein **constructor injection** popular hai — isliye samajhna zaroori hai ki constructor kab kya karta hai.
- [[06-Interfaces-and-Abstract-Classes]] — Java interfaces TypeScript interfaces se powerful hain — unme `default` methods bhi ho sakte hain (Java 8+). Spring bahut heavy interfaces use karta hai (jaise `CrudRepository`).
- [[07-Inheritance-and-Polymorphism]] — Single inheritance (ek hi parent class), multiple interfaces. TypeScript mein multiple extends nahi tha (classes ke liye), Java mein bhi nahi.
- [[08-Enums]] — Java enums TypeScript enums se zyada powerful hain — methods bhi rakh sakte hain!

```java
// Java enum mein methods bhi ho sakte hain — TypeScript mein nahi hota
public enum OrderStatus {
    PLACED, CONFIRMED, OUT_FOR_DELIVERY, DELIVERED, CANCELLED;

    public boolean isActive() {
        return this == PLACED || this == CONFIRMED || this == OUT_FOR_DELIVERY;
    }
}

// Use:
OrderStatus status = OrderStatus.CONFIRMED;
boolean active = status.isActive(); // true
```

- [[09-Records-and-Pattern-Matching]] — Java 16+. TypeScript ke `type` ya `interface` jaisa — immutable data carriers. Spring Boot DTOs ke liye perfect.

```java
// TypeScript mein yeh likhte the:
// type OrderSummary = { orderId: string; total: number; status: string };

// Java mein Record:
public record OrderSummary(String orderId, double total, String status) {}
// Automatically getter, equals, hashCode, toString milta hai — boilerplate nahi
```

- [[10-Sealed-Classes]] — Java 17+. TypeScript ke discriminated unions jaisa. Agar `OrderStatus` ke specific subtypes hain aur koi naya add nahi hona chahiye, toh sealed class use karo.

> [!tip] Priority order
> 01 → 02 → 03 → 04 → 06 → 07. Baaki baad mein.

---

## Type System — Generics aur Java ki Duniya

TypeScript mein generics comfortable the? Good. Java mein bhi hain — lekin kuch extra quirks hain.

- [[01-Generics]] — `List<Order>` matlab yeh list sirf `Order` objects hold karegi. TypeScript ka `Array<Order>` same concept.

```java
// Generic method — TypeScript se familiar lagega
public <T> List<T> filterActive(List<T> items, Predicate<T> condition) {
    return items.stream()
                .filter(condition)
                .collect(Collectors.toList());
}
```

- [[02-Bounded-Type-Parameters-and-Wildcards]] — `? extends Number` ya `? super Integer`. Yeh TypeScript mein nahi tha — Java ka unique feature. Bahut confusing lagta hai pehle, lekin pattern samajh aao toh easy hai.

```java
// ? extends — covariant (read-only use case)
public double sumPrices(List<? extends Number> prices) { ... }

// ? super — contravariant (write use case)
public void addOrders(List<? super Order> list) { ... }
```

- [[03-Type-Erasure]] — **Important gotcha!** Java compile time pe generics check karta hai, but runtime pe `List<Order>` aur `List<User>` dono sirf `List` hain. TypeScript bhi runtime pe types erase karta hai (compiled to JS), toh yeh concept familiar lagega.
- [[04-Optional-and-Null-Safety]] — `NullPointerException` — Java ka sabse famous error. `Optional<T>` class hai jo null handle karne ka cleaner way deta hai. TypeScript mein `undefined` check tha, Java mein `Optional.isPresent()`.

```java
// Bura tarika:
User user = userRepo.findById(userId);
if (user != null) {
    return user.getName(); // NullPointerException ka darr
}

// Accha tarika — Optional use karo:
Optional<User> user = userRepo.findById(userId);
return user.map(User::getName).orElse("Guest");
// Spring Data automatically Optional return karta hai — isliye zaruri hai yeh samajhna
```

- [[05-var-and-Local-Type-Inference]] — Java 10+. TypeScript ka `let` jaisa — compiler type infer karta hai. Lekin sirf local variables ke liye.

```java
var orders = orderService.getActiveOrders(); // compiler jaanta hai yeh List<Order> hai
```

---

## Collections & Streams — Data Ko Handle Karna

> [!info] Node.js se comparison
> JavaScript mein Arrays bahut flexible hain — `push`, `pop`, `filter`, `map`, `reduce` sab ek hi object pe. Java mein alag alag data structures hain alag purposes ke liye. Aur `Streams` JavaScript ke Array methods se milte-julte hain — lekin zyada powerful.

- [[01-Collections-Framework]] — `List`, `Set`, `Map`, `Queue` — sabke use cases alag hain.

```java
// List — ordered, duplicates allowed (JS Array jaisa)
List<String> cities = new ArrayList<>();
cities.add("Mumbai");
cities.add("Pune");

// Set — unordered, no duplicates (JS Set jaisa)
Set<String> uniqueTags = new HashSet<>();

// Map — key-value pairs (JS Object/Map jaisa)
Map<String, Order> orderMap = new HashMap<>();
orderMap.put("ORD001", order1);
```

- [[02-Iterators-and-for-each]] — Seedha aur simple. Java ka enhanced for-loop TypeScript ke `for...of` jaisa hai.
- [[03-Streams-and-Lambdas]] — **Must read. Seriously.** Yeh Java ka sabse powerful feature hai. JavaScript ke `Array.filter().map().reduce()` jaisa, but zyada expressive.

```java
// TypeScript mein yeh likhte the:
// const activeOrders = orders
//   .filter(o => o.status === 'ACTIVE')
//   .map(o => ({ id: o.id, total: o.total }))
//   .sort((a, b) => b.total - a.total);

// Java Streams mein:
List<OrderSummary> activeOrders = orders.stream()
    .filter(o -> o.getStatus() == OrderStatus.ACTIVE)
    .map(o -> new OrderSummary(o.getId(), o.getTotal(), o.getStatus().name()))
    .sorted(Comparator.comparingDouble(OrderSummary::total).reversed())
    .collect(Collectors.toList());
```

- [[04-Collectors]] — Stream ke end mein data kaise collect karo. `toList()`, `toMap()`, `groupingBy()` — ye sab Collectors hain.

```java
// Orders ko status ke hisaab se group karo
// Jaise IRCTC mein trains ko status se group karte hain
Map<OrderStatus, List<Order>> ordersByStatus = orders.stream()
    .collect(Collectors.groupingBy(Order::getStatus));
```

- [[05-Functional-Interfaces]] — `Function`, `Predicate`, `Supplier`, `Consumer`. Yeh Java ke function types hain. Lambdas inhi interfaces ke implementations hote hain.

```java
// Predicate — boolean return karta hai (TypeScript: (x: T) => boolean)
Predicate<Order> isExpensive = order -> order.getTotal() > 1000;

// Function — ek type se doosri type mein convert (TypeScript: (x: T) => U)
Function<Order, String> getOrderId = Order::getId;

// Consumer — kuch karta hai, kuch return nahi (TypeScript: (x: T) => void)
Consumer<Order> printOrder = order -> System.out.println(order.getId());

// Supplier — bina input ke kuch return karta hai (TypeScript: () => T)
Supplier<List<Order>> emptyOrders = ArrayList::new;
```

---

## Exceptions — Kya Galat Ho Sakta Hai aur Usse Kaise Handle Karein

> [!warning] Yeh section skip mat karna
> Java mein exceptions Node.js se fundamentally alag hain. Node.js mein `try/catch` optional tha — likh bhi sakte the, nahi bhi. Java mein **Checked Exceptions** hote hain jo compiler force karta hai handle karne ko. Yeh bahut frustrating lagta hai shuru mein, lekin production mein life save karta hai.

- [[01-Exception-Handling]] — Basic try-catch-finally. Same as TypeScript, mostly.
- [[02-Checked-vs-Unchecked]] — **Java specific aur confusing!** Checked exceptions compiler check karta hai — tum ignore nahi kar sakte. Unchecked (RuntimeException) optional hain.

```java
// Checked Exception — compiler force karega handle karne ko
// Jaise IRCTC mein seat booking mein IOException aa sakta hai
public void bookTicket(String trainId) throws BookingException {
    // agar throw karo toh caller ko handle karna padega
    if (seatsNotAvailable) {
        throw new BookingException("No seats available");
    }
}

// Caller ke paas do options:
// 1. Try-catch mein handle karo
try {
    bookTicket("12345");
} catch (BookingException e) {
    log.error("Booking failed: {}", e.getMessage());
}

// 2. Aage throw kar do
public void processBooking() throws BookingException {
    bookTicket("12345"); // caller pe responsibility daal di
}

// Unchecked Exception — RuntimeException subclass
// Handle karna optional hai
throw new IllegalArgumentException("Invalid train ID");
```

- [[03-Try-with-Resources]] — Automatically resources band karta hai (jaise database connections, file handles). TypeScript mein yeh pattern nahi tha.

```java
// Purana tarika (Node.js mein finally block use karte the):
Connection conn = null;
try {
    conn = getConnection();
    // kaam karo
} finally {
    if (conn != null) conn.close(); // manually band karo
}

// Try-with-resources (Java 7+) — automatic cleanup
try (Connection conn = getConnection()) {
    // kaam karo
} // conn automatically band ho jaata hai — exception aaye ya nahi
```

- [[04-Custom-Exceptions]] — Apni exceptions banao. Spring Boot REST APIs mein bahut common pattern hai — `OrderNotFoundException`, `PaymentFailedException` etc.

```java
// Custom exception — Zomato order not found jaisa scenario
public class OrderNotFoundException extends RuntimeException {
    private final String orderId;

    public OrderNotFoundException(String orderId) {
        super("Order not found: " + orderId);
        this.orderId = orderId;
    }

    public String getOrderId() {
        return orderId;
    }
}
```

---

## Concurrency — Ek Saath Bahut Saara Kaam

> [!info] Node.js vs Java concurrency — fundamental difference
> **Node.js single-threaded + event loop** hai. Non-blocking I/O ka matlab tha ki ek thread sab handle karta tha — callbacks, promises, async/await sab isi ke liye the. **Java multi-threaded** hai — alag threads sach mein parallel run kar sakte hain (multi-core CPU pe). Zyada power, lekin zyada complexity bhi.

Socho Swiggy ka order processing system — ek saath 10,000 orders process ho rahe hain. Node.js mein yeh async operations ke through hota tha. Java mein actual parallel threads se hota hai.

- [[01-Concurrency-Basics]] — `Thread`, `Runnable`, `Callable`. Thread banana easy hai, manage karna mushkil.

```java
// Thread directly banana (low-level, usually avoid)
Thread t = new Thread(() -> {
    System.out.println("Order processing in separate thread");
});
t.start();

// Callable — Runnable jaisa but return value deta hai
Callable<OrderResult> task = () -> {
    return processOrder(orderId);
};
```

- [[02-ExecutorService-and-Thread-Pools]] — Threads manually mat banao — `ExecutorService` use karo. Thread pool manage karta hai — jaise Swiggy ke delivery partners का pool.

```java
// Thread pool — fixed 10 threads (jaise 10 delivery partners)
ExecutorService executor = Executors.newFixedThreadPool(10);

executor.submit(() -> processOrder("ORD001"));
executor.submit(() -> processOrder("ORD002"));
// ... orders submit hote rahenge, threads available hone pe process honge

executor.shutdown(); // nayi tasks accept nahi karega, existing complete honge
```

- [[03-CompletableFuture]] — TypeScript ke `Promise` ka Java version. Async operations chain kar sakte ho.

```java
// TypeScript mein:
// fetchUser(id)
//   .then(user => fetchOrders(user.id))
//   .then(orders => calculateTotal(orders))
//   .catch(err => handleError(err));

// Java CompletableFuture:
CompletableFuture.supplyAsync(() -> fetchUser(userId))
    .thenCompose(user -> CompletableFuture.supplyAsync(() -> fetchOrders(user.getId())))
    .thenApply(orders -> calculateTotal(orders))
    .exceptionally(err -> { handleError(err); return 0.0; });
```

- [[04-Synchronization-and-Locks]] — Jab multiple threads shared data access karein, race conditions hoti hain. `synchronized`, `Lock`, `ReentrantLock` — yeh sab control karte hain ki ek waqt ek hi thread kaam kare.

```java
// Race condition example — do threads ek saath balance update karte hain:
// Thread 1: balance = 1000, read: 1000
// Thread 2: balance = 1000, read: 1000
// Thread 1: write 1000 - 100 = 900
// Thread 2: write 1000 - 200 = 800  // 100 wali deduction gayi!

// Fix — synchronized method:
public synchronized void deductBalance(double amount) {
    if (balance >= amount) {
        balance -= amount;
    }
}
```

- [[05-Virtual-Threads]] — **JDK 21+ ka game changer.** Yeh bahut lightweight threads hain — lakho bana sakte ho bina memory choke hue. I/O-bound apps (REST APIs, database calls) ke liye perfect. Spring Boot 3.2+ pe Virtual Threads directly enable kar sakte ho.

```java
// application.properties mein ek line:
// spring.threads.virtual.enabled=true
// Bas! Spring Boot automatically virtual threads use karega
```

> [!tip] Virtual Threads padhne ke baad
> Agar JDK 21+ use kar rahe ho, toh reactive programming (WebFlux) ki zarurat bahut kam ho jaati hai. Blocking code ka problem solve ho jaata hai. Pehle yeh samjho, phir decide karo WebFlux chahiye ya nahi.

- [[06-Atomic-Types-and-Concurrent-Collections]] — Thread-safe operations ke liye — `AtomicInteger`, `ConcurrentHashMap`. Synchronized blocks se faster, simpler bhi.

```java
// Counter jo multiple threads se safely increment ho sake
// Zomato pe concurrent order count jaisa
AtomicInteger activeOrders = new AtomicInteger(0);
activeOrders.incrementAndGet(); // thread-safe, no synchronized needed
```

---

## I/O & Files — Files ke Saath Kaam

Node.js mein `fs.readFile`, `fs.writeFile` tha. Java mein zyada options hain — classic I/O (streams-based), NIO (non-blocking), aur modern `java.nio.file` package.

- [[01-Streams-IO-vs-NIO]] — Old (`java.io`) vs new (`java.nio`). Production code mein modern NIO use karo.
- [[02-Reading-and-Writing-Files]] — Practical examples — CSV files padhna, JSON write karna, etc.
- [[03-Charsets-and-Encoding]] — UTF-8 encoding explicitly specify karo — warna different OS pe different behavior. Node.js mein bhi yahi issue tha.

```java
// Always encoding specify karo
List<String> lines = Files.readAllLines(
    Path.of("orders.csv"),
    StandardCharsets.UTF_8  // explicit — assume mat karo
);
```

---

## Date & Time — Woh Cheez Jo Node.js Mein Bhi Messy Tha

Moment.js ka dard yaad hai? Java mein bhi date handling ka ek bhura itihas tha — `java.util.Date` aur `Calendar`. Lekin Java 8 se `java.time` package aaya — yeh bahut accha hai.

- [[01-java-time-Overview]] — `Instant`, `LocalDate`, `LocalDateTime`, `ZonedDateTime`, `Duration`, `Period` — har ek ka alag use case hai.

```java
// Instant — UTC timestamp (database ke liye, API responses ke liye)
Instant now = Instant.now();

// LocalDate — sirf date, koi time nahi (birthday, expiry date)
LocalDate dob = LocalDate.of(1995, 3, 15);

// LocalDateTime — date + time, lekin timezone nahi (local app use)
LocalDateTime orderTime = LocalDateTime.now();

// ZonedDateTime — timezone ke saath (multi-region apps ke liye must)
// Zomato Mumbai order vs Zomato Bangalore order — different zones
ZonedDateTime mumbaiOrder = ZonedDateTime.now(ZoneId.of("Asia/Kolkata"));
```

- [[02-Time-Zones-Done-Right]] — **Production bug ka common source.** Indian apps ke liye `Asia/Kolkata` use karo. UTC mein store karo, display ke waqt convert karo.

> [!warning] Common mistake
> `LocalDateTime` ko database mein store mat karo agar tumhara app multi-timezone support karta hai. `Instant` (UTC) store karo, display ke waqt user ke timezone mein convert karo.

---

## Modern Features — Java Bhi Modern Ho Gaya Hai

Java ka image tha ki yeh verbose aur old-school hai. Lekin Java 14 ke baad se kaafi changes aaye hain.

- [[01-Records-and-Pattern-Matching]] — Immutable data classes ek line mein. Spring Boot DTOs ke liye perfect.
- [[02-Switch-Expressions-and-Patterns]] — Java 14+. Switch statement se zyada powerful — expression return kar sakta hai.

```java
// Old switch (statement):
String category;
switch (orderTotal) {
    case 500: category = "small"; break;
    default: category = "large"; break;
}

// New switch expression (Java 14+):
String category = switch (orderStatus) {
    case PLACED, CONFIRMED -> "active";
    case DELIVERED -> "completed";
    case CANCELLED -> "cancelled";
    default -> "unknown";
};
```

- [[03-Text-Blocks]] — Java 15+. Multi-line strings. TypeScript ke template literals jaisa.

```java
// Purana tarika — JSON string concatenation (dard):
String json = "{\n" +
              "  \"orderId\": \"" + id + "\",\n" +
              "  \"status\": \"active\"\n" +
              "}";

// Text blocks (Java 15+):
String json = """
        {
          "orderId": "%s",
          "status": "active"
        }
        """.formatted(id);
```

- [[04-Sealed-Classes]] — TypeScript discriminated unions jaisa. Sirf specific classes hi extend kar sakti hain.

---

## TS-to-Java Translation Aids — Tumhare Liye Special Section

Kyunki tum TypeScript background se aa rahe ho, yeh comparison files specially helpful hongi:

- [[01-Java-vs-TypeScript-Quick-Map]] — Side-by-side: TypeScript concept → Java equivalent. Bookmark karo yeh.
- [[02-Type-System-Differences]] — `interface` vs `class` vs `abstract class` vs `record` — Java mein zyada options hain TypeScript se.
- [[03-Async-Patterns-Comparison]] — `Promise` → `CompletableFuture`, `async/await` → virtual threads, callbacks → listeners. Pattern match karo.
- [[04-Modules-and-Imports-Compared]] — `import/export` → Java packages aur `import` statements. Concept similar, implementation alag.
- [[05-Tooling-Compared]] — npm → Maven/Gradle, nodemon → Spring DevTools, jest → JUnit, ESLint → Checkstyle/SpotBugs.

---

## Suggested Study Path — Pehle Kya Padhein?

> [!tip] Agar sirf 5 cheezein padhni hain is MOC se
> 1. [[01-Classes-and-Objects]] + [[02-Primitives-vs-Reference-Types]] — Java ki duniya mein welcome
> 2. [[01-Generics]] — Spring mein har jagah generics hain
> 3. [[03-Streams-and-Lambdas]] — Modern Java ka bread and butter
> 4. [[01-Exception-Handling]] + [[02-Checked-vs-Unchecked]] — Yeh concept Java-unique hai, galti mat karo
> 5. [[01-Concurrency-Basics]] + [[05-Virtual-Threads]] — Spring apps ke liye critical

### Full Learning Sequence (Agar Time Ho)

**Week 1 — Foundation:**
Platform (01-03) → Language Basics (01-07) → Type System (01, 04)

**Week 2 — Functional Java:**
Collections (01-03) → Streams + Lambdas → Functional Interfaces

**Week 3 — Production-ready:**
Exceptions (01-04) → Concurrency (01-03, 05) → Date/Time

**Jab zarurat padhe:** I/O, Wildcards, Virtual Threads deep dive, Modern Features

---

## Related Links

- [[00-README]] — Is repository ka overview
- [[01-Learning-Path]] — Step-by-step Spring Boot learning journey
- [[03-MOC-Spring]] — Spring Framework ka Map of Content — yeh tab padhna jab Java basics ho jaayein
- [[05-Glossary]] — Terms jab confuse karo
- [[06-FAQ-for-Express-Devs]] — "Yeh Express mein kaise karte the?" — sabse common questions ke answers

---

## Key Takeaways

- **Java aur TypeScript mein concept overlap hai** — classes, generics, async, exceptions — lekin implementation details alag hain aur wahi bits important hain
- **Checked Exceptions Java-unique hain** — compiler force karta hai handle karne ko — frustrating but powerful
- **Primitives vs Reference types** — `int` aur `Integer` alag hain, `==` vs `.equals()` ka fark samjho
- **Streams** TypeScript ke Array methods jaisi hain — lekin `collect()` se end karna padta hai — lazy evaluation hoti hai
- **`Optional<T>` use karo NullPointerException se bachne ke liye** — especially Spring Data repositories mein
- **Modern Java (Java 16+) bahut accha hai** — Records, Text Blocks, Switch Expressions — verbose nahi hai ab
- **Virtual Threads (JDK 21+) game changer hai** — Spring Boot 3.2+ mein ek property se enable, I/O-bound apps ke liye reactive ka alternative
- **Concurrency samjho, lekin panic mat karo** — Spring khud bahut kuch handle karta hai — shuru mein just ExecutorService aur CompletableFuture kafi hai
- **Date ke liye hamesha `java.time` use karo** — `java.util.Date` purana aur buggy hai — production code mein kabhi use mat karo
- **TS-to-Java comparison files padhna mat bhoolo** — tumhare background ke liye especially helpful hain
