# Async & Concurrency: Node Event Loop vs Java Threads

Socho ek second ke liye — Swiggy pe 10 lakh orders aa rahe hain ek saath. Ek banda kitchen mein khada hai aur ek-ek order process kar raha hai — yeh Node.js ka model hai. Doosri taraf, ek army hai jahan har order ke liye alag banda khada hai — yeh traditional Java ka model hai. Dono ke apne faayde hain, apni limitations hain. Aur ab JDK 21 ke baad ek teesra rasta bhi khul gaya hai — **Virtual Threads** — jo dono duniyaon ke best ko combine karta hai.

Yeh file samjhayegi ki Java mein concurrency kaise kaam karta hai, Node.js se kaise alag hai, aur aaj 2024 mein kya approach leni chahiye. Yeh sirf theory nahi hai — real production code mein in choices ka bohot fark padta hai.

---

## Execution Models: Ek vs. Many

```
Node.js:                         Java (Traditional):
┌──────────────────┐             ┌────────┐ ┌────────┐ ┌────────┐
│   Event Loop     │             │Thread 1│ │Thread 2│ │Thread N│
│   (1 core only)  │             │  req A │ │  req B │ │  req C │
└──────┬───────────┘             └────┬───┘ └───┬────┘ └───┬────┘
       │ libuv thread pool             └────── shared heap ──────┘
       │ (file, dns, crypto)
       ▼
   ┌────────┐
   │ 4 pool │  (sirf I/O ke liye, CPU nahi)
   └────────┘
```

### Node.js ka model — "Single Waiter" Restaurant

Node.js ek aise restaurant jaisa hai jahan sirf ek waiter hai. Woh waiter super fast hai — order leta hai, kitchen ko bhej deta hai, doosre table pe chala jaata hai. Jab tak kitchen khaana bana raha hai, woh baaki tables handle karta rehta hai. Jab khaana ready hota hai, callback fire hota hai aur waiter serve karta hai.

**Problem kab hoti hai?** Jab koi kaam CPU-heavy hota hai — jaise badi JSON parsing, image processing, heavy calculations. Tab woh ek waiter atak jaata hai aur baaki sab tables wait karte hain. Isliye Node.js mein `worker_threads` aaya — heavy CPU work ke liye alag threads.

### Java ka model — "Ek Request, Ek Thread"

Traditional Java mein — aur Spring Boot by default — har incoming HTTP request ko apna dedicated OS thread milta hai. Yeh thread poori request process karta hai: database call, external API call, sab kuch. Jab thread database se response wait kar raha hota hai, woh block hota hai — CPU idle rehta hai — par thread still "live" hai.

**Cost:** Ek OS thread lagbhag **1 MB stack memory** leta hai. Iska matlab — agar tum 10,000 concurrent requests handle karna chaho, tumhe 10 GB memory sirf threads ke liye chahiye. Yeh scale nahi karta.

> [!info] Node.js developer ke liye key insight
> Node.js mein blocking the event loop = sab kuch ruk jaata hai. Java mein blocking a thread = sirf woh ek request ruk jaati hai. Yahi fark hai. Java zyada "isolated" hai per-request basis pe, lekin threads expensive hain.

---

## Virtual Threads (JDK 21+) — Game Changer

Virtual threads ek revolution hai Java concurrency mein. Samjho aise — OS threads ko "heavy" threads kaho. Virtual threads "featherweight" threads hain jo JVM manage karta hai. Ek virtual thread sirf **~1 KB** memory leta hai (OS thread ke muqable mein ~1 MB). Matlab tum **millions** of virtual threads ek saath chala sakte ho.

### Yeh kaise kaam karta hai?

JVM ke paas kuch OS threads hain — inhe "carrier threads" bolte hain. Jab ek virtual thread koi blocking operation karta hai (DB query, HTTP call, file read), JVM us virtual thread ko carrier thread se "unmount" kar leta hai — us carrier thread pe koi doosra virtual thread chadha deta hai. Jab blocking operation complete hoti hai, virtual thread wapas mount ho jaata hai kisi available carrier pe.

```
Virtual Threads on Carrier Threads:

  Virtual Thread A  ──────block──────────────────resume──────▶
  Virtual Thread B            ──────────────block──────────▶
  Virtual Thread C      ─────────────────────────────────▶

  Carrier Thread 1  [VT-A]   [VT-B]   [VT-C]   [VT-A]   ...
  Carrier Thread 2  [VT-C]   [VT-A]   [VT-B]   [VT-C]   ...
```

Yeh bilkul async/await jaisa hi behaviour hai — lekin tumhe **kuch bhi likhna nahi** "async" ya "await"!

### Spring Boot mein enable karna

Spring Boot 3.2+ ke saath JDK 21 pe ek single flag se yeh sab on ho jaata hai:

```yaml
# application.yml mein bas yeh likho
spring:
  threads:
    virtual:
      enabled: true
```

Bas. Ek line. Ab har HTTP request ek virtual thread pe chalegi. Aur tumhara code bilkul normal blocking code jaisa dikhega:

```java
// Yeh code bilkul synchronous dikhta hai
// Lekin virtual threads ki wajah se yeh actually async behave karta hai!
@GetMapping("/orders/{id}")
public Order getOrder(@PathVariable Long id) {
    // Virtual thread yahan block hoga (DB query)
    // Lekin OS thread free rahega doosra kaam karne ke liye
    User user = userClient.fetch(id);

    // Yahan bhi block hoga
    // Lekin system ka throughput affect nahi hoga
    List<Item> items = itemRepo.findByUser(id);

    return new Order(user, items);
}
```

Node.js developer ke liye comparison:

```typescript
// TypeScript — tumhe explicitly async likhna padta hai
async function getOrder(id: string) {
    const user = await userClient.fetch(id);      // await keyword
    const items = await itemRepo.findByUser(id);  // har jagah await
    return new Order(user, items);
}
```

```java
// Java Virtual Threads — same behaviour, but koi async/await nahi!
public Order getOrder(Long id) {
    User user = userClient.fetch(id);          // blocking, but JVM handles it
    List<Item> items = itemRepo.findByUser(id); // ditto
    return new Order(user, items);
}
```

> [!tip] Naya project start kar rahe ho?
> JDK 21 use karo aur virtual threads enable karo. Tumhe simplicity of synchronous code milegi aur throughput of async code bhi. Reactor/WebFlux sirf streaming aur backpressure ke liye zaruri hai — regular REST APIs ke liye virtual threads kaafi hain.

---

## CompletableFuture — Java ka Promise

`CompletableFuture<T>` bilkul `Promise<T>` jaisa hai. Values future mein aate hain, tum chains banate ho, errors handle karte ho. API thodi zyada verbose hai, lekin concept same hai.

### TypeScript Promise vs Java CompletableFuture

```typescript
// TypeScript — user aur orders parallel mein fetch karo
async function getUserOrder(userId: string) {
    const [user, orders] = await Promise.all([
        fetchUser(userId),
        fetchOrders(userId),
    ]);
    return { user, orders };
}
```

```java
// Java — same kaam, different syntax
public CompletableFuture<UserOrder> getUserOrder(String userId) {
    // Dono futures simultaneously start ho jaate hain
    CompletableFuture<User>        userF   = fetchUser(userId);
    CompletableFuture<List<Order>> orderF  = fetchOrders(userId);

    // Dono complete hone ke baad combine karo
    return userF.thenCombine(orderF, UserOrder::new);
}

// Ya allOf ke saath N futures ke liye:
CompletableFuture.allOf(userF, orderF)
    .thenApply(v -> new UserOrder(userF.join(), orderF.join()));
```

### Method-by-Method Mapping Table

| TypeScript                          | Java CompletableFuture                                        | Kya karta hai?                     |
| ----------------------------------- | ------------------------------------------------------------- | ---------------------------------- |
| `new Promise((res, rej) => …)`      | `new CompletableFuture<>()` + `.complete()` / `.completeExceptionally()` | Manual future banana |
| `Promise.resolve(x)`                | `CompletableFuture.completedFuture(x)`                        | Already resolved future            |
| `Promise.reject(e)`                 | `CompletableFuture.failedFuture(e)`                           | Already rejected future            |
| `.then(f)` (sync transform)         | `.thenApply(f)`                                               | Value transform karo               |
| `.then(f)` (returns promise)        | `.thenCompose(f)`                                             | Flatmap — future return karta hai  |
| `.then(undefined, f)` / `.catch(f)` | `.exceptionally(f)` / `.handle((v, e) -> …)`                 | Error handle karo                  |
| `.finally(f)`                       | `.whenComplete((v, e) -> f())`                                | Chahe success ho ya fail           |
| `Promise.all([a, b])`               | `CompletableFuture.allOf(a, b)`                               | Sab complete honge tab             |
| `Promise.race([a, b])`              | `CompletableFuture.anyOf(a, b)`                               | Jo pehle complete ho               |
| `Promise.allSettled([a, b])`        | `handle` se manually + `allOf`                                | Sab settle hone ka wait            |
| `await p`                           | `p.get()` (checked) / `p.join()` (unchecked)                 | Block karke result lo              |

### CompletableFuture ki chaining — real example

```java
// Zomato order flow simulate karte hain
CompletableFuture<OrderStatus> placeOrder(String restaurantId, String userId) {

    return CompletableFuture
        // Step 1: Check restaurant availability
        .supplyAsync(() -> restaurantService.isOpen(restaurantId))

        // Step 2: Agar open hai toh order create karo
        .thenCompose(isOpen -> {
            if (!isOpen) {
                return CompletableFuture.failedFuture(
                    new RuntimeException("Restaurant band hai!")
                );
            }
            return orderService.createOrder(restaurantId, userId);
        })

        // Step 3: Payment initiate karo
        .thenCompose(order -> paymentService.process(order.getId()))

        // Step 4: Delivery assign karo
        .thenApply(payment -> deliveryService.assignRider(payment.getOrderId()))

        // Error handle karo
        .exceptionally(ex -> {
            log.error("Order fail ho gaya: {}", ex.getMessage());
            return OrderStatus.FAILED;
        });
}
```

> [!warning] `.get()` aur `.join()` BLOCKING calls hain!
> Inhe kabhi bhi request thread pe mat call karo agar tum non-virtual-thread app pe ho. Yeh poore thread ko block kar denge. Virtual thread pe yeh theek hai — JVM unmount kar dega.

---

## Reactor: Mono aur Flux — "Advanced Mode"

Spring WebFlux Project Reactor use karta hai. Yeh zyada powerful hai lekin zyada complex bhi.

- **`Mono<T>`** ≈ `Promise<T>` — 0 ya 1 value emit karta hai
- **`Flux<T>`** ≈ typed observable — 0 se N values emit karta hai, backpressure ke saath

```java
// Mono example — ek user fetch karo
@GetMapping("/users/{id}")
public Mono<User> getUser(@PathVariable String id) {
    return userRepo.findById(id)              // Mono<User> return karta hai
        .flatMap(u -> enrichUser(u))          // chain karo
        .switchIfEmpty(
            Mono.error(new UserNotFoundException("User nahi mila: " + id))
        );
}

// Flux example — sab orders stream karo
@GetMapping("/orders/stream")
public Flux<Order> streamOrders() {
    return orderRepo.findAll()               // Flux<Order>
        .filter(o -> o.getStatus() == ACTIVE)
        .map(o -> enrichWithUserInfo(o));
}
```

### Kab use karo Reactor?

- **Server-Sent Events** — real-time data stream clients ko push karna
- **Large result sets** — millions of rows database se process karna, memory mein sab load kiye bina
- **Message pipelines** — Kafka/RabbitMQ se events consume karna
- **Backpressure** — consumer jitna handle kar sake, utna hi data bhejo

**Regular CRUD APIs ke liye?** Virtual threads kaafi hain. Reactor ki complexity lena zaruri nahi.

> [!info] Node.js mein RxJS similar hai Reactor se, lekin production mein RxJS mostly UI side pe use hota hai. Backend mein virtual threads aur CompletableFuture zyada common hain.

---

## ExecutorService — Thread Pool Management

Java mein thread pool manage karna `ExecutorService` se hota hai. Yeh Node.js mein explicit nahi hota (libuv automatically handle karta hai), par Java mein tumhe explicitly decide karna padta hai.

```java
// Old style — fixed pool of OS threads
ExecutorService pool = Executors.newFixedThreadPool(10);
Future<String> result = pool.submit(() -> doHeavyWork());
String value = result.get(); // blocking wait

// JDK 21 — virtual threads, unlimited! No memory worries
ExecutorService pool = Executors.newVirtualThreadPerTaskExecutor();
```

### try-with-resources ke saath — clean shutdown

```java
// JDK 19+ se try-with-resources karo — automatic shutdown
try (var pool = Executors.newVirtualThreadPerTaskExecutor()) {
    // Parallel mein kai tasks submit karo
    var f1 = pool.submit(() -> fetchFromUPI(orderId));
    var f2 = pool.submit(() -> fetchFromPaytm(orderId));
    var f3 = pool.submit(() -> fetchFromPhonePe(orderId));

    // try block end hone pe:
    // 1. Pool naye tasks accept karna band kar deta hai
    // 2. Saare pending tasks complete honge
    // 3. Phir pool close ho jaata hai
    // Automatic! Koi pool.shutdown() + pool.awaitTermination() nahi likhna
}
```

### Common ExecutorService types

```java
// Fixed pool — exactly N threads
Executors.newFixedThreadPool(10);

// Cached pool — dynamically grow/shrink karta hai
// Warning: unbounded hai, spike pe bahut threads ban sakte hain
Executors.newCachedThreadPool();

// Single thread — ek thread pe sequential execution
Executors.newSingleThreadExecutor();

// Scheduled tasks — setTimeout jaisa
ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(2);
scheduler.schedule(() -> sendReminder(), 30, TimeUnit.MINUTES);
scheduler.scheduleAtFixedRate(() -> healthCheck(), 0, 5, TimeUnit.SECONDS);

// JDK 21 — virtual threads, best for I/O heavy work
Executors.newVirtualThreadPerTaskExecutor();
```

---

## Structured Concurrency (JDK 21+) — "Promise.all with Superpowers"

`StructuredTaskScope` ek nayi API hai jo fan-out tasks ko ek unit ki tarah treat karta hai. Yeh `Promise.all` jaisa hai lekin proper cancellation aur error propagation ke saath.

```java
// Payment processing — UPI + Card dono parallel check karo
public PaymentResult processPayment(String orderId) throws Exception {
    try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {

        // Dono tasks parallel mein start ho jaate hain
        Subtask<UpiStatus>  upiTask  = scope.fork(() -> upiService.check(orderId));
        Subtask<CardStatus> cardTask = scope.fork(() -> cardService.verify(orderId));

        // Dono complete hone ka wait karo
        // Agar koi bhi fail ho, scope automatically doosre ko cancel karta hai
        scope.join()          // wait for all
             .throwIfFailed(); // agar koi fail hua toh exception throw karo

        // Yahan dono tasks guaranteed complete hain
        return new PaymentResult(upiTask.get(), cardTask.get());
    }
    // try block end pe scope automatically cleanup karta hai
}
```

### ShutdownOnSuccess — jo pehle jeet jaye

```java
// Multiple payment gateways — jo pehle succeed kare use karo
public PaymentResult tryMultipleGateways(String orderId) throws Exception {
    try (var scope = new StructuredTaskScope.ShutdownOnSuccess<PaymentResult>()) {

        scope.fork(() -> razorpay.process(orderId));
        scope.fork(() -> paytm.process(orderId));
        scope.fork(() -> phonepe.process(orderId));

        // Jab pehla succeed karta hai, baaki cancel ho jaate hain
        scope.join();
        return scope.result(); // jo pehle succeed hua
    }
}
```

Yeh `Promise.race()` jaisa hai, lekin zyada structured aur proper cleanup ke saath.

---

## Synchronization — Shared State kaise handle karein

Node.js mein yeh problem rarely hoti hai kyunki single thread hai. Java mein multiple threads ek hi data access kar sakti hain — yahan concurrency bugs aate hain.

### synchronized block

```java
// Bank account — shared mutable state
public class BankAccount {
    private double balance;

    // synchronized matlab ek waqt mein sirf ek thread yeh method enter kar sakta hai
    public synchronized void deposit(double amount) {
        balance += amount; // Race condition nahi hogi
    }

    public synchronized double getBalance() {
        return balance;
    }
}
```

### ReentrantLock — zyada flexible

```java
import java.util.concurrent.locks.ReentrantLock;

public class OrderProcessor {
    private final ReentrantLock lock = new ReentrantLock();

    public void processOrder(Order order) {
        // Lock acquire karo
        lock.lock();
        try {
            // Critical section — ek waqt mein ek thread
            inventoryService.reserve(order.getItems());
            paymentService.charge(order);
        } finally {
            // ALWAYS finally mein unlock karo — exception aaye tab bhi
            lock.unlock();
        }
    }
}
```

### Atomic classes — simple operations ke liye

```java
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

// Order counter — thread-safe without locks
AtomicInteger orderCount = new AtomicInteger(0);
orderCount.incrementAndGet();  // thread-safe increment
orderCount.getAndIncrement();  // pehle get, phir increment

// Atomic compare-and-swap — optimistic locking
AtomicLong version = new AtomicLong(1L);
boolean updated = version.compareAndSet(1L, 2L); // sirf tab update karo jab value 1 ho
```

### volatile — visibility guarantee

```java
// volatile matlab: har thread directly main memory se padhega, cache se nahi
private volatile boolean isShuttingDown = false;

// Thread A:
isShuttingDown = true; // immediately visible to all threads

// Thread B:
while (!isShuttingDown) {
    processNextOrder();
}
```

---

## Threading Primitives: TS vs Java — Quick Reference

| Node.js / TypeScript           | Java                                                    | Kya karta hai?                    |
| ------------------------------ | ------------------------------------------------------- | --------------------------------- |
| `setTimeout(fn, ms)`           | `scheduler.schedule(fn, ms, MILLISECONDS)`              | Delay ke baad execute            |
| `setInterval(fn, ms)`          | `scheduler.scheduleAtFixedRate(fn, 0, ms, MS)`          | Repeat karo                       |
| `setImmediate(fn)`             | `CompletableFuture.runAsync(fn)`                        | Background mein run karo          |
| `Promise.all([a, b])`          | `CompletableFuture.allOf(a, b)` ya `StructuredTaskScope`| Parallel tasks                    |
| `worker_threads`               | `Thread`, `ExecutorService`                             | CPU-heavy work                    |
| `cluster`                      | Multiple JVM processes + load balancer                  | Multi-process scaling             |
| Mutex (`async-mutex`)          | `synchronized` block, `ReentrantLock`                   | Mutual exclusion                  |
| `Atomics`                      | `AtomicInteger`, `AtomicReference`, etc.                | Lock-free atomic ops              |
| `EventEmitter`                 | `ApplicationEvent` + `@EventListener`                   | Event-driven communication        |
| Queue                          | `BlockingQueue`, `LinkedBlockingDeque`                  | Producer-consumer pattern         |
| `AsyncLocalStorage`            | `ThreadLocal<T>`, `ScopedValue<T>`                      | Request-scoped context            |
| `AbortController`              | `Thread.interrupt()`, `Future.cancel(true)`             | Task cancellation                 |

---

## Spring @Async — Quick Annotation-based Async

Spring mein ek simple tarika hai background task run karne ka — `@Async` annotation:

```java
// Config class mein enable karo
@Configuration
@EnableAsync  // yeh zaruri hai!
public class AsyncConfig {

    @Bean
    public TaskExecutor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);
        executor.setMaxPoolSize(20);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("async-");
        executor.initialize();
        return executor;
    }
}
```

```java
// Service mein use karo
@Service
public class NotificationService {

    // Yeh method alag thread pe chalega — caller wait nahi karega
    @Async
    public CompletableFuture<Void> sendOrderConfirmation(String userId, String orderId) {
        // Email bhejo, push notification bhejo, SMS bhejo
        emailService.send(userId, "Order " + orderId + " confirmed!");
        return CompletableFuture.completedFuture(null);
    }
}

// Controller mein:
@PostMapping("/orders")
public ResponseEntity<Order> placeOrder(@RequestBody OrderRequest req) {
    Order order = orderService.create(req);

    // Email bhejne ka wait mat karo — background mein hoga
    notificationService.sendOrderConfirmation(req.getUserId(), order.getId());

    // Immediately response return karo customer ko
    return ResponseEntity.ok(order);
}
```

> [!warning] @Async ke common gotchas
> 1. `@EnableAsync` bhool gaye? Annotation silently ignore ho jaayega — koi error nahi!
> 2. Same class ke andar se call? Kaam nahi karega — Spring proxy bypass ho jaata hai.
> 3. `private` method pe @Async? Kaam nahi karega — Spring proxy ke limitations.

---

## Teen Tarike — Fan-out HTTP Calls

Ek practical example — ek request mein user info aur orders dono chahiye:

```java
record Combined(User user, List<Order> orders) {}

// Tarika 1: Plain blocking — Virtual Threads pe perfectly fine hai
// Sabse simple, sabse readable
public Combined classic(String id) {
    return new Combined(
        userClient.fetch(id),    // blocks virtual thread
        orderClient.list(id)     // blocks virtual thread
        // Note: yeh sequential hain — pehle user, phir orders
        // Parallel nahi hain!
    );
}

// Tarika 2: CompletableFuture — explicit parallel execution
// User aur orders SIMULTANEOUSLY fetch honge
public CompletableFuture<Combined> withFutures(String id) {
    // Dono immediately start ho jaate hain
    var u = CompletableFuture.supplyAsync(() -> userClient.fetch(id));
    var o = CompletableFuture.supplyAsync(() -> orderClient.list(id));

    // Jab dono done ho jaayein, combine karo
    return u.thenCombine(o, Combined::new);
}

// Tarika 3: Structured Concurrency — cleanest parallel approach (JDK 21)
// Automatic cancellation agar koi fail ho
public Combined structured(String id) throws Exception {
    try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
        var u = scope.fork(() -> userClient.fetch(id));
        var o = scope.fork(() -> orderClient.list(id));

        scope.join().throwIfFailed(); // wait + error propagation

        return new Combined(u.get(), o.get());
    }
}
```

**Kab kya use karein?**
- **Tarika 1 (plain blocking)**: Jab sequence matter karta ho, ya simplicity chahiye, ya virtual threads on hain aur speed enough hai
- **Tarika 2 (CompletableFuture)**: Jab parallel execution chahiye aur complex chains banana ho
- **Tarika 3 (StructuredConcurrency)**: Jab parallel tasks ek unit hain — failure propagation zaruri ho

---

## TypeScript vs Java — Full Concurrency Comparison

| Concept                  | Node.js / TypeScript                      | Java                                                         |
| ------------------------ | ----------------------------------------- | ------------------------------------------------------------ |
| Default model            | Single-threaded event loop                | Multi-threaded; ek OS thread per request                     |
| Lightweight tasks        | Promises on the loop                      | Virtual threads (JDK 21+) ya `CompletableFuture`             |
| CPU-bound work           | `worker_threads`                          | Regular thread ya `ForkJoinPool`                             |
| Blocking I/O             | Never block! Async se wrap karo           | Virtual thread pe fine; OS thread pe avoid karo              |
| Backpressure             | Streams (`pipe`, `pipeline`)              | Reactor `Flux` / Reactive Streams                            |
| Cancellation             | `AbortController`                         | `Thread.interrupt()`, `Future.cancel(true)`                  |
| Shared mutable state     | Rare (single thread hai na)               | Common — `synchronized` / `Atomic*` / `Lock` zaruri          |
| Thread-local context     | `AsyncLocalStorage`                       | `ThreadLocal<T>`, `ScopedValue<T>` (JDK 21 preview)          |
| Error propagation        | Promise rejection chain                   | CompletableFuture exceptionally / StructuredTaskScope        |
| Parallelism (N tasks)    | `Promise.all()`                           | `CompletableFuture.allOf()` ya `StructuredTaskScope`         |

---

## Gotchas — Yeh Mistakes Mat Karna

> [!warning] Concurrency ke common traps — carefully padho

**1. synchronized + Virtual Threads = Pinning Problem**

```java
// BAD — synchronized block virtual thread ko pin karta hai carrier thread pe
// Matlab agar 1000 virtual threads yahan block hain, 1000 carrier threads bhi block hain
public synchronized void badMethod() {
    doBlockingOperation(); // Virtual threads ka fayda khatam!
}

// GOOD — ReentrantLock use karo
private final ReentrantLock lock = new ReentrantLock();
public void goodMethod() {
    lock.lock();
    try {
        doBlockingOperation(); // Virtual thread unmount ho sakta hai
    } finally {
        lock.unlock();
    }
}
```

**2. ThreadLocal Memory Leaks**

```java
// BAD — long-lived thread pool + ThreadLocal = memory leak
static ThreadLocal<UserContext> ctx = new ThreadLocal<>();

public void handleRequest(User user) {
    ctx.set(new UserContext(user));
    processRequest();
    // Agar yeh line miss ho gayi, memory leak!
    // ctx.remove(); // ZARURI HAI
}

// GOOD — always in finally block
public void handleRequestSafe(User user) {
    ctx.set(new UserContext(user));
    try {
        processRequest();
    } finally {
        ctx.remove(); // Chahe exception aaye, cleanup hoga
    }
}

// BEST (JDK 21) — ScopedValue use karo, automatically scoped hai
static final ScopedValue<UserContext> CTX = ScopedValue.newInstance();
ScopedValue.where(CTX, new UserContext(user)).run(() -> processRequest());
```

**3. Future.get() without Timeout — Deadlock ka invitation**

```java
// BAD — forever block kar sakta hai
String result = future.get(); // Kabhi complete nahi hua toh?

// GOOD — timeout do
try {
    String result = future.get(5, TimeUnit.SECONDS);
} catch (TimeoutException e) {
    log.warn("Task 5 seconds mein complete nahi hua");
    future.cancel(true);
}
```

**4. Shared Mutable State — Race Conditions**

```java
// BAD — race condition!
public class Counter {
    private int count = 0; // Not thread-safe

    public void increment() {
        count++; // Yeh 3 operations hain: read + modify + write
        // Multiple threads simultaneously yeh kar sakte hain
    }
}

// GOOD — AtomicInteger use karo
public class Counter {
    private AtomicInteger count = new AtomicInteger(0);

    public void increment() {
        count.incrementAndGet(); // Thread-safe, single atomic operation
    }
}
```

**5. supplyAsync without Executor — ForkJoinPool pe load**

```java
// BAD — default mein ForkJoinPool.commonPool() use hota hai
// Agar ForkJoinPool ke threads block hain, puri app suffer karti hai
CompletableFuture.supplyAsync(() -> blockingDbCall());

// GOOD — dedicated executor do
ExecutorService myPool = Executors.newVirtualThreadPerTaskExecutor();
CompletableFuture.supplyAsync(() -> blockingDbCall(), myPool);
```

**6. @Async same class se call karna**

```java
@Service
public class OrderService {

    @Async
    public CompletableFuture<Void> sendNotification(String id) {
        // Background mein run karna chahiye
        return CompletableFuture.completedFuture(null);
    }

    public Order placeOrder(OrderRequest req) {
        Order order = createOrder(req);

        // BAD — same class ke andar se call! @Async kaam nahi karega
        // Spring proxy bypass ho jaata hai, synchronously run hoga
        sendNotification(order.getId());

        // GOOD — self-injection ya separate service class use karo
        return order;
    }
}
```

---

## Key Takeaways

- **Java traditionally multi-threaded hai** — har request ko apna OS thread milta hai, Node.js ki tarah single event loop nahi
- **OS threads expensive hain** — ~1 MB each, isliye 10K+ concurrent requests OS thread model pe mushkil hai
- **Virtual Threads (JDK 21) game changer hain** — ~1 KB each, millions possible, blocking code likho par async behaviour pao
- **Spring Boot 3.2+ pe sirf ek YAML flag** — `spring.threads.virtual.enabled: true` — aur virtual threads on
- **CompletableFuture = Java ka Promise** — same concept, alag syntax, table dekho for mapping
- **`thenApply` vs `thenCompose`** — sync transform vs async chain (`.then()` ka dono role)
- **Reactor (Mono/Flux) streaming ke liye hai** — CRUD REST APIs ke liye virtual threads prefer karo
- **`synchronized` + virtual threads = pinning** — `ReentrantLock` use karo instead
- **`ThreadLocal` leaks** — always `finally` mein `remove()` karo, ya JDK 21 ka `ScopedValue` use karo
- **`Future.get()` mein timeout zaruri hai** — bina timeout ke deadlock possible hai
- **Structured Concurrency** — `StructuredTaskScope` parallel tasks ko unit ki tarah treat karta hai, proper cancellation ke saath
- **Shared state Node.js mein rare tha** — Java mein common hai, `synchronized`/`Atomic*`/`Lock` seekhna padega
