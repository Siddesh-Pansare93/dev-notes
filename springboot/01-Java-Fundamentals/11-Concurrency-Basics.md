# Concurrency Basics — Java Mein Multiple Kaam Ek Saath

## Yaar, Concurrency Kyun Seekhni Hai?

Socho ek second ke liye — Swiggy pe 50,000 log ek saath order kar rahe hain. Ek-ek karke process karo toh kya hoga? Sab customers ka khaana thanda ho jaayega order place hone se pehle hi.

Real-world applications mein concurrency ka matlab hai: **ek hi time pe multiple kaam handle karna**. Yeh cheez Node.js mein tumhare liye invisible thi — event loop sab sambhalta tha parde ke peechhe. Java mein yeh tumhari responsibility hai. Aur agar samajh liya toh tumhare paas Node se zyada power hai — real OS threads, fine-grained control, aur Java 21 ke virtual threads jo Node ki simplicity aur Java ki power dono dete hain.

> [!info] Node.js Developer Ho? Pehle Yeh Padho
> Node.js single-threaded hai — ek event loop, sab kuch async I/O ke through. Tum kabhi "thread" nahi likhte kyunki runtime sab handle karta hai. Java bilkul ulta hai: **real OS threads** hain, ek shared mutable heap hai, aur full preemptive multitasking hai. Yahan async code `CompletableFuture` (JS ke `Promise` jaisa) + `ExecutorService` (thread pool) se banta hai. Java 21 ne **virtual threads** laaye — millions of lightweight threads jo thode OS threads pe map hote hain — finally Java ko Node wali "blocking code likho, runtime sambhaale" feeling mil gayi.

---

## Part 1 — Thread Kya Hota Hai? (Foundation)

### Pehle Mental Model Seedha Karo

Node.js mein ek restaurant ki analogy socho jahan sirf ek waiter hai jo lightning-fast hai — ek table pe order leta hai, dusre table pe jaata hai, event loop manage karta hai. Koi table "block" nahi hoti.

Java mein multiple waiters hain — har ek apna kaam karta hai independently. Ek waiter Zomato delivery track kar sakta hai, doosra payment process kar sakta hai, teesra menu update kar sakta hai — sab ek saath.

### `Thread` — Sabse Purana, Sabse Low-Level Tarika

```java
// Yeh likho mat production mein — sirf samajhne ke liye
Thread t = new Thread(() -> {
    // Yeh code alag thread mein chalega
    System.out.println("Main thread se alag, main hoon: " + Thread.currentThread().getName());
});

t.start();  // Thread ko schedule karo (immediately start nahi hota, OS decide karta hai)
t.join();   // Main thread yahan ruko jab tak t complete nahi hota
```

> [!warning] `new Thread(...)` Production Mein Mat Likho
> Har baar nayi thread banana expensive hai — OS resources lagte hain. Ek UPI transaction ke liye agar har baar nayi thread banaao, server mein 10,000 users aate hi memory khatam ho jaayegi. Iske liye **`ExecutorService`** use karo.

### Thread ke States — Zindagi ki Kahani

Ek thread ka lifecycle kuch aisa hota hai:

```
NEW → RUNNABLE → (BLOCKED / WAITING / TIMED_WAITING) → TERMINATED
```

- **NEW**: `new Thread()` bana diya, abhi `start()` nahi kiya
- **RUNNABLE**: OS ne schedule kar diya, CPU milne ka wait kar raha hai ya chal raha hai
- **BLOCKED**: `synchronized` lock ka wait kar raha hai (kisi aur ne lock pakad rakha hai)
- **WAITING**: `join()`, `wait()`, ya `LockSupport.park()` call ki — indefinitely wait
- **TIMED_WAITING**: `sleep(100)`, `wait(100)` — fixed time ke liye wait
- **TERMINATED**: Thread ka kaam khatam

---

## Part 2 — `ExecutorService` — Professional Thread Management

### Kya Problem Solve Karta Hai?

Socho IRCTC Tatkal booking — subah 10 baje lakhon requests aati hain. Agar har request ke liye nayi thread banao, server crash ho jaayega. Solution? **Thread Pool** — kuch threads pehle se bana ke ready rakho, aane wale kaam unhe assign karo.

`ExecutorService` yehi karta hai — ek pool of threads manage karta hai.

```java
import java.util.concurrent.*;

// 4 threads ka pool — Swiggy ke 4 delivery partners ki tarah
ExecutorService pool = Executors.newFixedThreadPool(4);

// Kaam submit karo — ek delivery order dene ki tarah
Future<Integer> f = pool.submit(() -> {
    Thread.sleep(100);  // kuch processing kar raha hai
    return 42;
});

// Result lo — blocking call hai, jab tak thread kaam khatam nahi karta
int result = f.get();

// ZARURI: pool band karo warna JVM kabhi exit nahi karega
pool.shutdown();
```

### Executor Factories — Kaunsa Kab Use Karein?

```java
// 1. Fixed Pool — jab tum jaante ho kitni capacity chahiye
// Jaise Zomato ke 10 delivery partners fixed hain ek area mein
ExecutorService fixed = Executors.newFixedThreadPool(10);

// 2. Cached Pool — demand pe barhta-ghatta hai
// Jaise Ola surge pricing ke time extra drivers laata hai
// DANGER: Unbounded — agar kaam bahut aaya toh bahut threads ban jaayenge
ExecutorService cached = Executors.newCachedThreadPool();

// 3. Single Thread — serialized execution, ek ke baad ek
// Jaise ek accountant jo ek time pe ek hi cheez process karta hai
ExecutorService single = Executors.newSingleThreadExecutor();

// 4. Scheduled — delayed ya periodic tasks
// Jaise roz raat 12 baje BigBasket inventory sync karna
ScheduledExecutorService scheduled = Executors.newScheduledThreadPool(2);
scheduled.scheduleAtFixedRate(
    () -> syncInventory(),
    0,      // initial delay
    1,      // period
    TimeUnit.HOURS
);

// 5. Virtual Thread Pool — Java 21+ ka magic (baad mein detail mein)
ExecutorService virtual = Executors.newVirtualThreadPerTaskExecutor();
```

### `Future` — Kaam Ka Promise

`pool.submit()` ek `Future` return karta hai — yeh basically ek receipt hai ki "kaam diya gaya hai, baad mein result lo."

```java
ExecutorService pool = Executors.newFixedThreadPool(4);

// Multiple kaam parallel mein submit karo
Future<String> userFuture    = pool.submit(() -> fetchUser(userId));
Future<String> orderFuture   = pool.submit(() -> fetchOrders(userId));
Future<String> addressFuture = pool.submit(() -> fetchAddress(userId));

// Teeno parallel chal rahe hain — ab results lo
String user    = userFuture.get();    // blocks karta hai
String orders  = orderFuture.get();   // blocks karta hai
String address = addressFuture.get(); // blocks karta hai

pool.shutdown();
```

> [!tip] Try-With-Resources Use Karo (Java 19+)
> Java 19 se `ExecutorService` `AutoCloseable` ho gaya. `shutdown()` bhoolne ki problem khatam:
> ```java
> try (ExecutorService pool = Executors.newFixedThreadPool(4)) {
>     // pool automatically close hoga is block ke baad
>     Future<String> f = pool.submit(() -> "kaam khatam");
>     System.out.println(f.get());
> }
> ```

---

## Part 3 — `CompletableFuture` — Java Ka `Promise`

### Node.js Developer Ke Liye Sabse Important Section

Yeh woh cheez hai jo Node.js Promises se closest hai. `CompletableFuture` ek async computation represent karta hai jisko tum chain kar sakte ho, combine kar sakte ho, error handle kar sakte ho — bilkul JS Promises ki tarah.

### Basic Usage — `supplyAsync`

```java
// Node.js mein: const user = await fetchUser(id);
// Java mein:
CompletableFuture<User> userCF = CompletableFuture.supplyAsync(() -> fetchUser(id));

// Chain karo — JS ka .then() jaisa
userCF
    .thenApply(user -> user.getName())          // transform result (map)
    .thenApply(name -> name.toUpperCase())      // ek aur transform
    .thenAccept(name -> System.out.println(name)) // consume karo, kuch return mat karo
    .exceptionally(ex -> {                      // JS ka .catch() jaisa
        log.error("User nahi mila: ", ex);
        return null;
    });
```

### `thenApply` vs `thenCompose` vs `thenAccept` — Confusion Mat Karo

```java
// thenApply — synchronous transform (JS ka .then(x => transform(x)))
// Result: CompletableFuture<String>
CompletableFuture<String> nameCF = userCF.thenApply(user -> user.getName());

// thenCompose — agar next step bhi CompletableFuture return kare (JS ka .then(x => asyncFn(x)))
// Flatmap jaisa hai
CompletableFuture<Order> orderCF = userCF.thenCompose(user -> fetchOrders(user.getId()));

// thenAccept — side effect, kuch return nahi (JS ka .then(x => { doSomething(x); }))
CompletableFuture<Void> printed = userCF.thenAccept(user -> System.out.println(user));

// thenRun — result ki parwah nahi, bas kuch action karo
CompletableFuture<Void> logged = userCF.thenRun(() -> log.info("User fetch complete"));
```

### Parallel Execution — JS `Promise.all` jaisa

```java
// Swiggy app ke liye — restaurant, menu, aur reviews parallel mein load karo
CompletableFuture<Restaurant> restaurantCF = CompletableFuture.supplyAsync(() -> loadRestaurant(id));
CompletableFuture<Menu> menuCF             = CompletableFuture.supplyAsync(() -> loadMenu(id));
CompletableFuture<List<Review>> reviewsCF  = CompletableFuture.supplyAsync(() -> loadReviews(id));

// JS: await Promise.all([restaurantCF, menuCF, reviewsCF])
// Java:
CompletableFuture.allOf(restaurantCF, menuCF, reviewsCF)
    .thenApply(v -> {
        // Sab complete ho gaye, ab results lo
        Restaurant r = restaurantCF.join();  // join() = get() without checked exception
        Menu m       = menuCF.join();
        List<Review> reviews = reviewsCF.join();
        return buildResponse(r, m, reviews);
    })
    .join(); // final result ka wait karo
```

### `thenCombine` — Do Futures Combine Karo

```java
// UPI payment: user ki balance check karo aur merchant verify karo — parallel mein
CompletableFuture<Long> balanceCF  = CompletableFuture.supplyAsync(() -> getBalance(userId));
CompletableFuture<Boolean> merchantCF = CompletableFuture.supplyAsync(() -> verifyMerchant(merchantId));

CompletableFuture<String> resultCF = balanceCF.thenCombine(merchantCF, (balance, isValid) -> {
    if (isValid && balance >= amount) {
        return "Payment approved: ₹" + amount;
    } else {
        return "Payment failed";
    }
});

System.out.println(resultCF.get());
```

### `anyOf` — JS `Promise.race` jaisa

```java
// Fastest server se response lo — CDN fallback strategy
CompletableFuture<Object> fastest = CompletableFuture.anyOf(
    CompletableFuture.supplyAsync(() -> fetchFromMumbaiServer()),
    CompletableFuture.supplyAsync(() -> fetchFromDelhiServer()),
    CompletableFuture.supplyAsync(() -> fetchFromBangaloreServer())
);

String result = (String) fastest.get(); // jo pehle aaya
```

### Complete Real Example — Swiggy Order Placement

```java
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class SwiggyOrderService {

    private final ExecutorService pool = Executors.newFixedThreadPool(10);

    public CompletableFuture<OrderResult> placeOrder(OrderRequest request) {
        // Step 1: User aur restaurant ko parallel mein validate karo
        CompletableFuture<User> userCF = CompletableFuture
            .supplyAsync(() -> validateUser(request.getUserId()), pool);

        CompletableFuture<Restaurant> restaurantCF = CompletableFuture
            .supplyAsync(() -> validateRestaurant(request.getRestaurantId()), pool);

        // Step 2: Dono ready hone ke baad order create karo
        return userCF.thenCombine(restaurantCF, (user, restaurant) -> {
                // Yeh tab chalega jab dono complete ho jaayein
                return createOrder(user, restaurant, request.getItems());
            })
            // Step 3: Order create hone ke baad payment process karo
            .thenCompose(order ->
                CompletableFuture.supplyAsync(() -> processPayment(order), pool)
            )
            // Step 4: Payment success ke baad delivery assign karo
            .thenCompose(payment ->
                CompletableFuture.supplyAsync(() -> assignDeliveryPartner(payment.getOrderId()), pool)
            )
            // Step 5: Koi bhi step fail ho toh gracefully handle karo
            .exceptionally(ex -> {
                log.error("Order placement failed: ", ex);
                return OrderResult.failed(ex.getMessage());
            });
    }
}
```

---

## Part 4 — Virtual Threads (Java 21+) — Game Changer

### Kya Problem Tha Pehle?

Traditional Java threads direct OS threads hote hain. Ek OS thread ~1MB memory leta hai. Matlab 10,000 concurrent requests = 10GB sirf threads ke liye. Isliye pehle sab log async/reactive code likhte the — `CompletableFuture`, Reactive Streams, etc. — jo code ko complex bana deta tha.

### Virtual Threads Ka Jadu

Virtual threads JVM-level lightweight threads hain. Yeh OS threads pe mount/unmount hote hain — jab I/O wait kar rahe ho, OS thread free ho jaati hai kisi aur kaam ke liye.

```
OS Threads:      [Thread-1] [Thread-2] [Thread-3] [Thread-4]
Virtual Threads: [V-1] [V-2] [V-3] ... [V-1,000,000]
                 ^-- Ye sab unmount/remount karte rehte hain
```

### Code Mein Kitna Aasaan Hai

```java
// Java 21+
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    // Har task ko apna virtual thread milta hai
    // Blocking I/O ab cheap hai!
    var future = executor.submit(() -> {
        Thread.sleep(1000);  // Yeh OS thread block NAHI karta
        return "Kaam ho gaya";
    });
    System.out.println(future.get());
}
```

### Spring Boot 3.2+ Mein Virtual Threads Enable Karo — Sirf Ek Line

```properties
# application.properties
spring.threads.virtual.enabled=true
```

Bas. Ab har HTTP request apne virtual thread mein chalegi. Blocking JDBC calls, file reads sab automatically handle ho jaata hai — Node ki simplicity + Java ki power.

### Virtual Threads Ka Real Demo

```java
// 10,000 virtual threads ek saath — koi problem nahi!
try (var pool = Executors.newVirtualThreadPerTaskExecutor()) {
    List<Future<String>> futures = IntStream.range(0, 10_000)
        .mapToObj(i -> pool.submit(() -> {
            // "Blocking" call — OS thread free rehti hai
            Thread.sleep(100);
            return "Task " + i + " done";
        }))
        .toList();

    // Sab results collect karo
    long count = futures.stream()
        .map(f -> {
            try { return f.get(); }
            catch (Exception e) { throw new RuntimeException(e); }
        })
        .count();

    System.out.println(count + " tasks complete"); // 10000 tasks complete
}
```

> [!info] Virtual Threads Kab Use Karein?
> - I/O-heavy work (database queries, HTTP calls, file reads) — **Virtual threads perfect hain**
> - CPU-intensive work (image processing, encryption, sorting) — **Traditional threads better hain**
> - Virtual threads CPU work mein koi advantage nahi dete kyunki woh CPU pe hain, I/O wait nahi

---

## Part 5 — Synchronization — Shared State Ka Dard

### Problem Kyun Hoti Hai?

Node.js mein yeh problem kabhi nahi aayi — single thread tha. Java mein multiple threads ek hi memory share karte hain. Socho do delivery partners ek hi bag uthane ki koshish kar rahe hain — chaos!

```java
// DANGEROUS CODE — mat likho
public class Counter {
    private int count = 0;

    public void increment() {
        count++;  // Yeh ATOMIC nahi hai!
    }
}
// Thread A padhta hai count=5
// Thread B padhta hai count=5
// Thread A likhta hai count=6
// Thread B likhta hai count=6
// Expected: 7, Actual: 6 — RACE CONDITION!
```

### Solution 1 — `synchronized` Keyword

```java
public class SafeCounter {
    private final Object lock = new Object();  // Dedicated lock object
    private int count = 0;

    public void increment() {
        synchronized (lock) {
            // Sirf ek thread is block mein ek time pe
            count++;
        }
    }

    public int getCount() {
        synchronized (lock) {
            return count;
        }
    }
}
```

> [!warning] `synchronized` Pe Common Mistakes
> - `String` ya boxed primitives (`Integer`, `Long`) pe synchronize mat karo — woh interned/shared ho sakte hain, deadlock aa sakta hai
> - `this` pe synchronize karna avoid karo — bahar wala code bhi `this` lock kar sakta hai
> - Hamesha **`private final Object lock = new Object();`** use karo

### Solution 2 — `AtomicInteger` (Better Option)

```java
import java.util.concurrent.atomic.AtomicInteger;

public class AtomicCounter {
    // Thread-safe, lock-free, CPU-level atomic operations
    private final AtomicInteger count = new AtomicInteger(0);

    public void increment() {
        count.incrementAndGet();  // Thread-safe, synchronized se fast
    }

    public int getCount() {
        return count.get();
    }

    // Compare-and-swap — optimistic locking jaisa
    public boolean setIfEqual(int expected, int newValue) {
        return count.compareAndSet(expected, newValue);
    }
}
```

### Solution 3 — Concurrent Collections

```java
import java.util.concurrent.*;

// WRONG: HashMap thread-safe nahi hai
Map<String, Integer> unsafe = new HashMap<>();  // Concurrent modification = crash

// RIGHT: ConcurrentHashMap use karo
ConcurrentHashMap<String, Integer> safeMap = new ConcurrentHashMap<>();
safeMap.put("orders", 100);
safeMap.incrementAndGet("orders", 1);  // Atomic operation

// Thread-safe queue — producer-consumer pattern ke liye
BlockingQueue<Order> orderQueue = new LinkedBlockingQueue<>(1000);
orderQueue.put(new Order(...));   // Blocking put (agar full hai toh wait)
Order order = orderQueue.take();  // Blocking take (agar empty hai toh wait)

// CopyOnWriteArrayList — jab reads zyada hain, writes kam
// Har write pe ek copy banta hai — read aur write kabhi conflict nahi karte
List<String> listeners = new CopyOnWriteArrayList<>();
```

### Paytm Wallet Ka Example — Race Condition vs Safe Code

```java
// UNSAFE — Race condition hogi
public class UnsafeWallet {
    private double balance;

    public void debit(double amount) {
        if (balance >= amount) {   // Thread A checks: balance = 1000
                                    // Thread B checks: balance = 1000
            balance -= amount;     // Thread A debits 800: balance = 200
                                    // Thread B debits 800: balance = -600 !!!
        }
    }
}

// SAFE — synchronized se
public class SafeWallet {
    private double balance;
    private final Object lock = new Object();

    public synchronized void debit(double amount) {
        if (balance >= amount) {
            balance -= amount;
        } else {
            throw new InsufficientFundsException("Insufficient balance");
        }
    }
}

// EVEN BETTER — Atomic operations ke saath
public class AtomicWallet {
    // AtomicLong paise ko paisa (integer) mein store karo
    private final AtomicLong balancePaisa = new AtomicLong(0);

    public boolean debit(long amountPaisa) {
        while (true) {
            long current = balancePaisa.get();
            if (current < amountPaisa) return false;
            // Compare-and-swap — agar kisi aur ne change kar diya toh retry
            if (balancePaisa.compareAndSet(current, current - amountPaisa)) {
                return true;
            }
            // Retry — koi aur thread ne change kar diya tha
        }
    }
}
```

---

## Part 6 — `volatile` Keyword

### Kya Karta Hai?

Multi-threading mein CPUs apne-apne cache maintain karte hain. Ek thread variable update kare toh doosra thread purana value dekh sakta hai. `volatile` ensure karta hai ki har read/write main memory se ho.

```java
public class ServiceStatus {
    // volatile se ensure hota hai ki har thread latest value dekhe
    private volatile boolean running = true;
    private volatile boolean healthy = true;

    // Background thread ye dekhta rehta hai
    public void monitorLoop() {
        while (running) {
            checkHealth();
        }
    }

    // Koi bhi thread se call kar sakte ho — safely
    public void stop() {
        running = false;  // Turant visible hoga monitorLoop thread ko
    }
}
```

> [!warning] `volatile` Sirf Simple Cases Ke Liye
> - Single write, multiple reads — OK
> - `count++` jaise compound operations — NAHI, still race condition
> - Complex logic — Use `AtomicInteger`, `synchronized`, ya locks

---

## Part 7 — `ReentrantLock` — Advanced Locking

`synchronized` se zyada control chahiye? `ReentrantLock` lo:

```java
import java.util.concurrent.locks.*;

public class AdvancedLocking {
    private final ReentrantLock lock = new ReentrantLock();
    private final ReentrantReadWriteLock rwLock = new ReentrantReadWriteLock();
    private int data = 0;

    // Read-write lock — multiple readers OR one writer
    // Jaise library mein — multiple log ek saath padh sakte hain,
    // par likhne wala ek hi hoga aur tab koi nahi padhega
    public int readData() {
        rwLock.readLock().lock();
        try {
            return data;
        } finally {
            rwLock.readLock().unlock();
        }
    }

    public void writeData(int value) {
        rwLock.writeLock().lock();
        try {
            data = value;
        } finally {
            rwLock.writeLock().unlock();
        }
    }

    // tryLock — deadlock avoid karne ke liye
    public boolean tryUpdate(int value) throws InterruptedException {
        // 500ms tak try karo, nahi mila toh false
        if (lock.tryLock(500, TimeUnit.MILLISECONDS)) {
            try {
                data = value;
                return true;
            } finally {
                lock.unlock();
            }
        }
        return false; // Lock nahi mila
    }
}
```

---

## Part 8 — `ThreadLocal` — Per-Thread Data

Kabhi kabhi tum chahte ho ki har thread ka apna alag data ho — jaise har delivery partner ka apna GPS tracker:

```java
// Request ID track karne ke liye — har thread apna ID rakhta hai
public class RequestContext {
    private static final ThreadLocal<String> requestId = new ThreadLocal<>();
    private static final ThreadLocal<User> currentUser = new ThreadLocal<>();

    public static void setRequestId(String id) {
        requestId.set(id);
    }

    public static String getRequestId() {
        return requestId.get();
    }

    // CRITICAL: Thread pool use karte ho toh cleanup ZARURI hai
    // Warna purana request ka data naye request ko dikhega
    public static void clear() {
        requestId.remove();
        currentUser.remove();
    }
}

// Spring ke filter mein use karo
@Component
public class RequestIdFilter implements Filter {
    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {
        try {
            RequestContext.setRequestId(UUID.randomUUID().toString());
            chain.doFilter(req, res);
        } finally {
            RequestContext.clear();  // ZARURI — thread pool ka thread reuse hoga
        }
    }
}
```

---

## Part 9 — Common Patterns

### Pattern 1: Producer-Consumer (Swiggy Order Queue)

```java
public class OrderProcessingSystem {
    // Bounded queue — max 500 pending orders
    private final BlockingQueue<Order> queue = new LinkedBlockingQueue<>(500);
    private final ExecutorService consumers = Executors.newFixedThreadPool(10);

    // Restaurant se order aaya — producer
    public void receiveOrder(Order order) throws InterruptedException {
        queue.put(order);  // Agar queue full hai toh block karega
    }

    // Delivery partner process karta hai — consumer
    public void startProcessing() {
        for (int i = 0; i < 10; i++) {
            consumers.submit(() -> {
                while (!Thread.currentThread().isInterrupted()) {
                    try {
                        Order order = queue.take();  // Wait until order available
                        processOrder(order);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            });
        }
    }
}
```

### Pattern 2: Parallel Fan-Out (Multiple APIs Parallel Mein)

```java
public class ProductPageService {

    public ProductPageData loadProductPage(String productId) {
        // Sab parallel mein fetch karo
        CompletableFuture<Product> productCF =
            CompletableFuture.supplyAsync(() -> productService.findById(productId));

        CompletableFuture<List<Review>> reviewsCF =
            CompletableFuture.supplyAsync(() -> reviewService.findByProduct(productId));

        CompletableFuture<List<String>> imagesCF =
            CompletableFuture.supplyAsync(() -> imageService.findByProduct(productId));

        CompletableFuture<Integer> stockCF =
            CompletableFuture.supplyAsync(() -> inventoryService.getStock(productId));

        // Sab ka wait karo
        CompletableFuture.allOf(productCF, reviewsCF, imagesCF, stockCF).join();

        // Results collect karo
        return new ProductPageData(
            productCF.join(),
            reviewsCF.join(),
            imagesCF.join(),
            stockCF.join()
        );
    }
}
```

---

## TypeScript ↔ Java — Side-by-Side Comparison

| Node.js / TypeScript | Java |
|---|---|
| Single thread + event loop | Many threads + shared heap |
| `async function fetchData() {}` | `CompletableFuture.supplyAsync(() -> fetchData())` |
| `await fn()` | `cf.get()` (blocks) / `cf.join()` / `.thenApply()` |
| `Promise.all([a, b, c])` | `CompletableFuture.allOf(a, b, c)` |
| `Promise.race([a, b])` | `CompletableFuture.anyOf(a, b)` |
| `setTimeout(() => {}, 1000)` | `scheduledPool.schedule(() -> {}, 1, TimeUnit.SECONDS)` |
| Worker threads (`worker_threads`) | `ExecutorService` |
| No data races (single thread) | Synchronize karo / atomics use karo |
| `AsyncLocalStorage` | `ThreadLocal` |
| `async/await` ka simple blocking style | Virtual threads (Java 21) — same feel |
| Node ki event loop | JVM ka carrier thread pool (virtual threads ke liye) |

---

## Complete Code Example — HTTP Fetcher

```java
package com.example.async;

import java.net.URI;
import java.net.http.*;
import java.util.List;
import java.util.concurrent.*;
import java.util.stream.IntStream;

public class Fetcher {
    private final HttpClient http = HttpClient.newHttpClient();

    /**
     * Ek URL async mein fetch karo — CompletableFuture return karta hai
     * Node.js equivalent: async function fetch(url) { return await axios.get(url); }
     */
    public CompletableFuture<String> fetch(String url) {
        return http.sendAsync(
            HttpRequest.newBuilder(URI.create(url)).build(),
            HttpResponse.BodyHandlers.ofString()
        ).thenApply(HttpResponse::body);  // Response object se body extract karo
    }

    /**
     * Multiple URLs parallel mein fetch karo — CompletableFuture chains ke saath
     * Node.js equivalent: await Promise.all(urls.map(fetch))
     */
    public List<String> fetchAll(List<String> urls) {
        // Saare futures kick off karo
        List<CompletableFuture<String>> futures = urls.stream()
            .map(this::fetch)
            .toList();

        // Sab ka wait karo, phir results collect karo
        return CompletableFuture.allOf(futures.toArray(CompletableFuture[]::new))
            .thenApply(v -> futures.stream()
                .map(CompletableFuture::join)  // join() = get() without checked exception
                .toList())
            .join();
    }

    /**
     * Virtual threads version — Java 21+
     * Blocking code likhte hain, scale karta hai async ki tarah
     * Yahi Java 21 ka sabse bada fayda hai
     */
    public List<String> fetchAllVirtual(List<String> urls) throws Exception {
        try (var pool = Executors.newVirtualThreadPerTaskExecutor()) {
            // Har URL ke liye apna virtual thread
            List<Future<String>> tasks = urls.stream()
                .map(url -> pool.submit(() -> {
                    // Yeh blocking call OS thread block NAHI karta
                    return http.send(
                        HttpRequest.newBuilder(URI.create(url)).build(),
                        HttpResponse.BodyHandlers.ofString()
                    ).body();
                }))
                .toList();

            // Results collect karo
            return tasks.stream()
                .map(f -> {
                    try {
                        return f.get();
                    } catch (Exception e) {
                        throw new RuntimeException("Fetch failed: " + e.getMessage(), e);
                    }
                })
                .toList();
        }
        // try-with-resources: pool automatically shutdown ho jaata hai yahan
    }

    /**
     * Scalability demo — 1000 concurrent requests virtual threads se
     */
    public static void main(String[] args) throws Exception {
        var fetcher = new Fetcher();
        var urls = IntStream.range(0, 1000)
            .mapToObj(i -> "https://jsonplaceholder.typicode.com/posts/" + (i % 100 + 1))
            .toList();

        long start = System.currentTimeMillis();
        List<String> results = fetcher.fetchAllVirtual(urls);
        long elapsed = System.currentTimeMillis() - start;

        System.out.println(results.size() + " responses in " + elapsed + "ms");
        // 1000 requests in ~2-3 seconds — vs 1000 seconds sequentially
    }
}
```

---

## Gotchas — Common Mistakes Jo Har Beginner Karta Hai

> [!warning] `.get()` Blocking Hai — Async Chain Mein Mat Use Karo
> ```java
> // WRONG: async chain ke andar .get() = deadlock possible
> CompletableFuture<String> cf = CompletableFuture.supplyAsync(() -> {
>     String result = anotherCF.get();  // DEADLOCK RISK!
>     return process(result);
> });
>
> // RIGHT: thenCompose use karo
> CompletableFuture<String> cf = anotherCF
>     .thenCompose(result -> CompletableFuture.supplyAsync(() -> process(result)));
> ```

> [!warning] Pool Shutdown Bhool Gaye? JVM Kabhi Exit Nahi Karega
> Non-daemon threads JVM ko alive rakhte hain. `pool.shutdown()` ya try-with-resources ZARURI hai.
> ```java
> // WRONG:
> ExecutorService pool = Executors.newFixedThreadPool(4);
> pool.submit(() -> doWork());
> // shutdown() bhool gaye — program hang karega
>
> // RIGHT:
> try (ExecutorService pool = Executors.newFixedThreadPool(4)) {
>     pool.submit(() -> doWork());
> } // automatic shutdown + awaitTermination
> ```

> [!warning] `InterruptedException` Ko Swallow Mat Karo
> ```java
> // WRONG: interrupt signal lost ho jaata hai
> try {
>     Thread.sleep(1000);
> } catch (InterruptedException e) {
>     // Kuch mat karo — BAHUT BURA
> }
>
> // RIGHT: interrupt restore karo ya rethrow karo
> try {
>     Thread.sleep(1000);
> } catch (InterruptedException e) {
>     Thread.currentThread().interrupt();  // Interrupt flag restore karo
>     throw new RuntimeException("Interrupted", e);
> }
> ```

> [!warning] `String` Ya Boxed Primitives Pe Synchronize Mat Karo
> ```java
> // WRONG: String intern pool mein shared ho sakti hai
> private String lock = "myLock";
> synchronized (lock) { ... }  // Doosra code bhi "myLock" pe sync kar sakta hai = deadlock
>
> // RIGHT: dedicated private object
> private final Object lock = new Object();
> synchronized (lock) { ... }
> ```

> [!warning] `parallelStream()` Common ForkJoinPool Use Karta Hai
> ```java
> // WRONG: blocking work parallelStream pe
> list.parallelStream()
>     .map(item -> {
>         Thread.sleep(1000);  // Whole JVM ka ForkJoinPool block ho jaata hai!
>         return process(item);
>     })
>     .toList();
>
> // RIGHT: dedicated pool ya virtual threads
> try (var pool = Executors.newVirtualThreadPerTaskExecutor()) {
>     list.stream()
>         .map(item -> pool.submit(() -> process(item)))
>         .map(f -> f.get())
>         .toList();
> }
> ```

> [!warning] ThreadLocal Cleanup Bhoolna — Thread Pool Mein Bahut Bura
> ```java
> // Thread pool mein threads reuse hoti hain
> // Agar cleanup nahi kiya toh purani request ka data naye request ko dikhega
>
> // WRONG:
> ThreadLocal<User> currentUser = new ThreadLocal<>();
> currentUser.set(user);
> // cleanup nahi kiya — next request same thread pe kisi aur user ka data dekhegi!
>
> // RIGHT:
> try {
>     currentUser.set(user);
>     handleRequest();
> } finally {
>     currentUser.remove();  // HAMESHA cleanup karo
> }
> ```

> [!tip] Spring Mein `@Async` aur `WebClient` Prefer Karo
> Production Spring apps mein tum directly `ExecutorService` ya `CompletableFuture` rarely banate ho. Spring ke abstractions use karo:
> - `@Async` annotation for background method execution
> - `WebClient` for non-blocking HTTP calls (reactive)
> - Virtual threads enable karo (`spring.threads.virtual.enabled=true`) for simple blocking style

---

## Key Takeaways

- **Node.js vs Java mental shift**: Node single-thread + event loop hai; Java multi-threaded + shared heap. Yahan tumhe synchronization ki chinta karni padti hai.
- **`new Thread(...)` production mein mat likho** — hamesha `ExecutorService` use karo thread lifecycle manage karne ke liye.
- **`CompletableFuture` = Java ka `Promise`** — `thenApply` (map), `thenCompose` (flatMap), `thenCombine` (zip), `allOf` (Promise.all), `anyOf` (Promise.race).
- **Shared mutable state = danger zone** — `synchronized`, `AtomicInteger`, ya `ConcurrentHashMap` use karo jab multiple threads ek cheez share karein.
- **`volatile` sirf simple flags ke liye** — compound operations ke liye `Atomic*` use karo.
- **Virtual threads (Java 21) = game changer** — millions of threads, blocking code likhte hain, scales like async. Spring Boot 3.2+ mein ek property se enable hota hai.
- **`parallelStream()` CPU-bound kaam ke liye** — I/O-bound kaam ke liye virtual threads ya `CompletableFuture` better hain.
- **`ThreadLocal` cleanup ZARURI hai** thread pools mein — `finally` block mein `.remove()` karo.
- **`InterruptedException` kabhi swallow mat karo** — ya rethrow karo ya interrupt flag restore karo.
- **Spring apps mein**: `@Async`, `WebClient`, aur `spring.threads.virtual.enabled=true` — yeh teeno concepts seekhna zaroori hai production ke liye.
