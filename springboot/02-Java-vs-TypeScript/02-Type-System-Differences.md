# Type System Differences: TypeScript vs Java

Socho ek second ke liye — TypeScript mein tum itne comfortable ho gaye ho ki types ko almost "documentation" ki tarah treat karte ho. Compiler help karta hai, lekin ultimately JavaScript chal raha hai under the hood. Java mein scene bilkul alag hai. Yahan types sirf developer ke liye nahi hain — JVM ke liye hain, bytecode ke liye hain, runtime ke liye hain. Ye mental shift samajhna bahut zaroori hai, warna bahut saari cheezein "kaam kyun nahi kar rahi?" wali situation aayegi.

Is file mein hum cover karenge:
- Structural vs Nominal typing — sabse bada fark
- Primitives aur unka boxed counterpart
- Union types ka Java equivalent
- Generics aur type erasure ka drama
- Null safety — Java ka achilles heel
- Common gotchas jo beginners ko trip karte hain

---

## Structural vs Nominal Typing — Ye Fundamental Fark Samjho

> [!info] Pehle ye samjho
> TypeScript ka type system ek **layer** hai JavaScript ke upar — compile time pe disappear ho jaata hai. Java ka type system language ka core hai — compile time mein hai, bytecode mein hai, aur runtime pe bhi reflection ke zariye accessible hai. Ye sirf syntax ka fark nahi hai — ye philosophy ka fark hai.

### TypeScript ka approach: "Agar bhatak duck ki tarah, toh duck hai"

TypeScript **structural typing** follow karta hai. Matlab compiler sirf **shape** dekhta hai — naam nahi. Agar koi object ke paas wahi fields aur methods hain jo type expect karta hai, toh compatible hai.

```ts
// TypeScript: structural — duck typing at compile time
interface Deliverable {
  orderId: string;
  address: string;
}

class ZomatoOrder {
  orderId: string = "ORD-001";
  address: string = "Bandra, Mumbai";
  restaurantName: string = "Biryani Palace"; // extra field — ok!
}

// ZomatoOrder ne kabhi nahi kaha "implements Deliverable"
// Fir bhi ye kaam karta hai — shape match karti hai!
const delivery: Deliverable = new ZomatoOrder(); // OK!
```

### Java ka approach: "Naam batao pehle"

Java **nominal typing** follow karta hai. Naam matter karta hai. Agar class ne explicitly nahi kaha `implements SomeInterface`, toh compiler nahi maanegi — chahe shape bilkul match kare.

```java
// Java: nominal — names matter, shapes don't
interface Deliverable {
    String getOrderId();
    String getAddress();
}

// Ye class exact same methods provide karti hai...
class ZomatoOrder {
    public String getOrderId() { return "ORD-001"; }
    public String getAddress() { return "Bandra, Mumbai"; }
    // ...lekin "implements Deliverable" nahi likha!
}

// COMPILE ERROR — ZomatoOrder is not Deliverable in Java's eyes
Deliverable d = new ZomatoOrder(); // ERROR!
```

Fix karna simple hai — explicitly declare karo:

```java
// Ab sahi hai
class ZomatoOrder implements Deliverable {
    public String getOrderId() { return "ORD-001"; }
    public String getAddress() { return "Bandra, Mumbai"; }
}

Deliverable d = new ZomatoOrder(); // AB CHALTA HAI!
```

### Nominal Typing ka fayda kya hai?

Lagta hai extra kaam hai, lekin iska ek bada fayda hai — **refactoring safety**. Agar tum `Deliverable` ko `Shippable` rename karo, toh compiler tumhe batayega har woh jagah jahan change chahiye. TypeScript mein accidentally koi unrelated class bhi "compatible" ho sakti hai sirf isliye ki uske fields match karte hain — ye subtle bugs introduce kar sakta hai large codebases mein.

> [!tip] Node.js se aane wali habit
> TypeScript mein hum aksar anonymous objects pass karte hain jo interface match karte hain — `{ orderId: "123", address: "Delhi" }`. Java mein ye possible nahi. Tumhe ya toh class banana hoga, ya record (Java 16+). Har data structure ko explicitly define karna padta hai.

---

## Primitives vs Objects — Do Duniya Ek Java Mein

TypeScript mein `number`, `string`, `boolean` — sab kuch object-like behave karta hai. Java mein scene alag hai. Yahan **do categories** hain:

1. **Primitive types** — lightweight, stack pe store hote hain, null nahi ho sakte
2. **Reference types (Objects)** — heap pe store hote hain, null ho sakte hain

### Primitive types — Java ke "real" values

```
byte    — -128 to 127
short   — -32,768 to 32,767
int     — -2 billion to 2 billion (MOST COMMON)
long    — bahut bada number (64-bit)
float   — decimal (7 digits precision)
double  — bada decimal (15 digits precision) (MOST COMMON)
char    — single character
boolean — true/false
```

### Comparison table: TS vs Java

| TypeScript type | Java primitive | Java boxed (Object) | Notes |
|---|---|---|---|
| `number` | `int` / `long` / `double` | `Integer` / `Long` / `Double` | TS sab unify karta hai; Java mein choose karna padta hai |
| `bigint` | `long` (64-bit) ya `BigInteger` | `BigInteger` | Unbounded ke liye `BigInteger` use karo |
| `boolean` | `boolean` | `Boolean` | Primitive default hai |
| `string` | — | `String` | Java mein always object hai |
| `null` / `undefined` | — | `null` | Java mein sirf `null` — no `undefined` |
| `Date` | — | `Instant` / `LocalDateTime` | `java.time.*` use karo, purana `Date` avoid karo |

### Boxed types kyun exist karte hain?

**Generics only reference types accept karte hain.** Isliye:

```java
// GALAT — int primitive nahi chal sakta generics mein
List<int> prices = new ArrayList<>(); // COMPILE ERROR!

// SAHI — Integer (boxed) chal jaata hai
List<Integer> prices = new ArrayList<>(); // OK

// SAHI — Long ke saath Swiggy order IDs store karo
List<Long> orderIds = new ArrayList<>();
```

### Auto-boxing — Java karta hai magic (sometimes too much)

Java automatically primitive ko boxed type mein convert karta hai aur vice versa. Isko **auto-boxing** kehte hain:

```java
// Auto-boxing: int -> Integer (automatically)
List<Integer> amounts = new ArrayList<>();
amounts.add(500);  // Java internally karta hai: amounts.add(Integer.valueOf(500))

// Auto-unboxing: Integer -> int (automatically)
int total = amounts.get(0) + 200; // Integer automatically int ban jaata hai
```

> [!warning] Auto-boxing ka performance trap
> Har auto-boxing ek naya object allocate karta hai heap pe. Agar tum tight loop mein lakhs integers process kar rahe ho (jaise UPI transactions ka calculation), toh `List<Integer>` ke bajaye primitive array `int[]` use karo. Performance bahut better hogi.
>
> ```java
> // Slow — lakhs of objects allocated
> List<Integer> prices = new ArrayList<>();
> for (int i = 0; i < 1_000_000; i++) { prices.add(i); } // lakhs of Integer objects!
>
> // Fast — no object overhead
> int[] prices = new int[1_000_000];
> for (int i = 0; i < 1_000_000; i++) { prices[i] = i; }
> ```

---

## Union Types nahi hain — Kya Karein?

TypeScript ka `string | number` — bahut convenient feature hai. Java mein directly equivalent nahi hai. Lekin modern Java (17+) mein bahut clean workarounds hain.

### 1. Sealed Interfaces + Records — The Modern Way (Java 17+)

Ye sabse powerful approach hai. Zomato ka example lete hain — ek order multiple states mein ho sakta hai:

```ts
// TypeScript mein:
type OrderStatus =
  | { kind: "placed"; orderId: string; timestamp: Date }
  | { kind: "preparing"; estimatedMinutes: number }
  | { kind: "out_for_delivery"; riderName: string; phone: string }
  | { kind: "delivered"; rating?: number };
```

```java
// Java 17+ mein equivalent — sealed interface + records
sealed interface OrderStatus
    permits Placed, Preparing, OutForDelivery, Delivered {}

// Har variant ek record hai — immutable data carrier
record Placed(String orderId, Instant timestamp) implements OrderStatus {}
record Preparing(int estimatedMinutes) implements OrderStatus {}
record OutForDelivery(String riderName, String phone) implements OrderStatus {}
record Delivered(Integer rating) implements OrderStatus {} // rating nullable ho sakta hai

// Phir pattern matching se handle karo — EXHAUSTIVE checking!
String describeStatus(OrderStatus status) {
    return switch (status) {
        case Placed p       -> "Order placed at " + p.timestamp();
        case Preparing p    -> p.estimatedMinutes() + " min mein ready hoga";
        case OutForDelivery o -> o.riderName() + " aa raha hai — " + o.phone();
        case Delivered d    -> d.rating() != null
                               ? "Delivered! Rating: " + d.rating()
                               : "Delivered (unrated)";
    };
}
```

**Sealed interface ka kamaal:** Agar tum `Cancelled` variant add karo, toh **har woh `switch` statement compile error dega** jisne `Cancelled` handle nahi kiya. TypeScript ke discriminated unions jaisi hi safety — aur honestly, kaafi close experience hai.

### 2. Inheritance Hierarchy — Pre-Java 17 ka tarika

```java
// Abstract base class
abstract class ApiResponse {}

class SuccessResponse extends ApiResponse {
    private final Object data;
    public SuccessResponse(Object data) { this.data = data; }
    public Object getData() { return data; }
}

class ErrorResponse extends ApiResponse {
    private final String message;
    private final int statusCode;
    public ErrorResponse(String message, int statusCode) {
        this.message = message;
        this.statusCode = statusCode;
    }
}
```

**Problem:** Hierarchy "open" hai — koi bhi extend kar sakta hai. Exhaustiveness guarantee nahi hai. Isliye Java 17+ mein sealed interfaces prefer karo.

### 3. Object + instanceof — Last Resort

```java
// Jab tum genuinely nahi jaante type kya aayega
Object value = getValueFromLegacyCode();

// Java 16+ pattern matching with instanceof — cleaner
if (value instanceof String s) {
    System.out.println("String hai: " + s.toUpperCase());
} else if (value instanceof Integer i) {
    System.out.println("Number hai: " + (i * 2));
} else if (value instanceof List<?> list) {
    System.out.println("List hai, size: " + list.size());
}
```

> [!warning] Ye approach avoid karo
> `Object` type use karne se compile-time safety poori tarah khatam ho jaati hai. Sirf legacy code ke saath kaam karte waqt ya genuinely unknown types ke liye use karo.

---

## Generics — Powerful Lekin Kuch Surprises

TypeScript ke generics aur Java ke generics surface pe similar lagte hain, lekin under the hood bahut fark hai.

### Basic generic syntax — comparison

```ts
// TypeScript
function getFirst<T>(items: T[]): T | null {
  return items.length > 0 ? items[0] : null;
}

// Generic class
class Repository<T> {
  private items: T[] = [];
  add(item: T): void { this.items.push(item); }
  getAll(): T[] { return [...this.items]; }
}
```

```java
// Java — same concept, slightly different syntax
// <T> before return type declare karta hai type parameter
public static <T> T getFirst(List<T> items) {
    return items.isEmpty() ? null : items.get(0);
}

// Generic class
public class Repository<T> {
    private final List<T> items = new ArrayList<>();

    public void add(T item) { items.add(item); }

    public List<T> getAll() { return Collections.unmodifiableList(items); }
}

// Usage:
Repository<ZomatoOrder> orderRepo = new Repository<>();
orderRepo.add(new ZomatoOrder("ORD-001"));
```

### Type Erasure — Java ka Bada Surprise

Ye Java beginners ko sabse zyada confuse karta hai. Java mein **generics compile time pe only** exist karte hain. Runtime pe JVM ko pata nahi hai `List<String>` hai ya `List<Integer>` — dono ko woh sirf `List` ki tarah dekhta hai.

```ts
// TypeScript mein runtime check possible hai
function processItems<T>(items: unknown[]): items is T[] {
  // type guard likh sakte ho
  return Array.isArray(items);
}
```

```java
// Java mein ye NAHI kar sakte — type erasure ki wajah se
// COMPILE ERROR:
if (someList instanceof List<String>) { } // ERROR! Type nahi check ho sakta at runtime

// Sirf raw type check possible hai:
if (someList instanceof List<?> list) {
    // Hum jaante hain ye List hai, lekin element type ka nahi pata
    System.out.println("Ye ek List hai");
}
```

**Type erasure ke practical implications:**

```java
// 1. Generic arrays create nahi ho sakte
public class Box<T> {
    // COMPILE ERROR:
    T[] items = new T[10]; // nahi chal sakta!

    // WORKAROUND:
    @SuppressWarnings("unchecked")
    T[] items = (T[]) new Object[10]; // hacky, lekin kaam karta hai
    // Ya better:
    List<T> items = new ArrayList<>(); // use List instead
}

// 2. Overloading generic parameters pe based nahi ho sakta
public class OrderService {
    // COMPILE ERROR — dono erase ho ke same signature ban jaate hain:
    public void process(List<ZomatoOrder> orders) { }
    public void process(List<SwiggyOrder> orders) { }  // ERROR! Same erasure!

    // WORKAROUND — alag method names use karo:
    public void processZomato(List<ZomatoOrder> orders) { }
    public void processSwiggy(List<SwiggyOrder> orders) { }
}
```

### Variance — PECS Rule

TypeScript mein `in` aur `out` keywords hain declaration site pe. Java mein variance **use site** pe define hoti hai wildcards ke saath.

```ts
// TypeScript — declaration site variance
interface Producer<out T> { produce(): T }  // covariant
interface Consumer<in T> { consume(T item): void }  // contravariant

const animals: Producer<Animal> = new DogProducer(); // OK — Dog is Animal
```

```java
// Java — use site variance with wildcards

// Covariant: sirf READ kar sakte ho (? extends)
// Swiggy delivery se Food read karna chahte ho
List<? extends Food> foodItems = new ArrayList<Biryani>(); // OK
Food first = foodItems.get(0); // OK — read kar sakte ho
// foodItems.add(new Pasta()); // ERROR! Write nahi kar sakte

// Contravariant: sirf WRITE kar sakte ho (? super)
// Kisi bhi Food ko ek container mein dalna chahte ho
List<? super Biryani> foodSink = new ArrayList<Food>(); // OK
foodSink.add(new Biryani()); // OK — write kar sakte ho
// Biryani b = foodSink.get(0); // Problem — type guaranteed nahi hai

// Invariant (default): na extend na super — exact type chahiye
List<Food> exactFoods = new ArrayList<>();
// List<Biryani> biryaniList = exactFoods; // ERROR! List<Biryani> is NOT List<Food>
```

> [!tip] PECS Mnemonic — yaad rakhne ka trick
> **P**roducer **E**xtends, **C**onsumer **S**uper
> - Agar list se data **produce** (read) ho raha hai → `? extends T`
> - Agar list mein data **consume** (write) ho raha hai → `? super T`

---

## Null Safety — Java Ka Bada Dard

TypeScript mein `strictNullChecks: true` enable karo, toh compiler tumhe force karta hai null handle karne ke liye. Java mein yeh default mein nahi hai — **`NullPointerException` Java developers ka sabse common runtime error hai.**

```ts
// TypeScript — compile time null safety
function findUser(id: string): User | null { ... }

const user = findUser("123");
user.name; // COMPILE ERROR — might be null!
user?.name; // OK — optional chaining
```

```java
// Java — runtime pe pata chalta hai :(
public User findUser(String id) { ... } // return type mein null hidden hai!

User user = findUser("123");
user.getName(); // Runtime NullPointerException if user is null!
```

### Solution 1: Optional — The Modern Way

```java
// Optional<T> — explicitly represent "might not exist"
public Optional<User> findUser(String id) {
    // database se dhundho
    User user = database.query(id);
    return Optional.ofNullable(user); // null bhi ho sakta hai
}

// Caller code — null check forced hai
Optional<User> maybeUser = findUser("123");

// Method 1: isPresent check
if (maybeUser.isPresent()) {
    System.out.println(maybeUser.get().getName());
}

// Method 2: orElse — default value
User user = maybeUser.orElse(new GuestUser());

// Method 3: map + orElse — functional style (best!)
String email = findUser("123")
    .map(User::getEmail)        // transform if present
    .orElse("no-email@guest.com"); // fallback

// Method 4: orElseThrow — agar nahi mila toh exception
User user = findUser("123")
    .orElseThrow(() -> new UserNotFoundException("User 123 nahi mila!"));

// Method 5: ifPresent — sirf kuch karna hai present hone pe
findUser("123").ifPresent(u -> sendWelcomeEmail(u.getEmail()));
```

### Solution 2: @NonNull / @Nullable Annotations

Spring Boot projects mein ye common hai:

```java
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;

public class UserService {
    // @NonNull — ye kabhi null nahi hoga (IDE check karta hai)
    public User createUser(@NonNull String name, @NonNull String email) {
        // ...
    }

    // @Nullable — caller ko pata hai null possible hai
    public @Nullable User findByEmail(String email) {
        return userRepository.findByEmail(email).orElse(null);
    }
}
```

> [!warning] Optional anti-patterns
> - **Field mein mat rakho:** `private Optional<String> name;` — yeh anti-pattern hai. Field ko directly `@Nullable` karo ya `null` use karo.
> - **Parameter mein mat pass karo:** `void process(Optional<User> user)` — yeh bhi avoid karo. Caller ko decide karne do.
> - **Sirf return type ke liye:** `Optional` ka best use case method return type hai — "ye method value nahi return kar sakta."

---

## TypeScript ↔ Java Type Feature Map

| TypeScript feature | Java equivalent | Notes |
|---|---|---|
| `string \| number` | `sealed interface` + records | Ya `Object` (type-unsafe) |
| `Partial<T>` | Builder pattern ya separate DTO | Java mein utility types nahi hain |
| `Readonly<T>` | `record` (Java 16+) ya `final` fields | Records fully immutable hote hain |
| `Pick<T, K>` / `Omit<T, K>` | Hand-written DTO class | Manual kaam — no magic |
| `keyof T` | `Class<?>.getDeclaredFields()` | Reflection — runtime only |
| `typeof someValue` | `someValue.getClass()` | Runtime `Class<?>` object |
| `T[]` | `T[]` (array) ya `List<T>` | `List<T>` prefer karo production mein |
| `Record<K, V>` | `Map<K, V>` | Same concept |
| `enum Color { Red, Green }` | `enum Color { RED, GREEN }` | Java enums zyada powerful hain |
| `as const` literal types | `enum` ya `static final` constants | No direct equivalent |
| `unknown` | `Object` + explicit cast | Type safety manually maintain karo |
| `never` | `Void` ya throw | No direct equivalent |
| Tuple `[string, number]` | `record` ya `Map.Entry<K, V>` | Records best option hain |
| `Promise<T>` | `CompletableFuture<T>` | Async handling different hai |

---

## Records vs Interfaces vs Classes — Kab Kya?

Java 16+ mein `record` ek new concept hai jo TypeScript ke `type` alias jaisa kaam karta hai data ke liye.

```java
// RECORD — immutable data carrier (Java 16+)
// TypeScript ka: type User = { id: number; name: string; email: string }
public record User(Long id, String name, String email) {}

// Record automatically generate karta hai:
// - All-args constructor: new User(1L, "Siddesh", "s@example.com")
// - Accessor methods (NOT getters): user.id(), user.name(), user.email()
// - equals() aur hashCode() — value-based
// - toString() — readable format
// - final fields — immutable by default

// INTERFACE — contract/behaviour define karo
// TypeScript ka: interface UserRepository { findById(id: number): User | null }
public interface UserRepository {
    Optional<User> findById(Long id);
    List<User> findAll();
    User save(User user);
}

// CLASS — full mutable object with state aur behaviour
// TypeScript ka: class UserService { ... }
public class UserService {
    private final UserRepository repo; // dependency injection

    public UserService(UserRepository repo) {
        this.repo = repo;
    }

    public User getUser(Long id) {
        return repo.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found: " + id));
    }
}
```

### Record ka real-world use — API DTOs

Zomato jaise app mein order response DTO:

```java
// Request DTO — what comes in from app
public record PlaceOrderRequest(
    String restaurantId,
    List<String> itemIds,
    String deliveryAddress,
    String paymentMethod  // "UPI", "CARD", "CASH"
) {}

// Response DTO — what goes back to app
public record OrderResponse(
    String orderId,
    String status,
    int estimatedDeliveryMinutes,
    double totalAmount
) {}

// Controller mein:
@PostMapping("/orders")
public OrderResponse placeOrder(@RequestBody PlaceOrderRequest request) {
    // request.restaurantId(), request.itemIds() — accessor methods
    return orderService.placeOrder(request);
}
```

> [!tip] Record vs Class kab?
> - **Record** — agar sirf data hold karna hai, behaviour nahi. DTOs, API responses, value objects ke liye perfect.
> - **Class** — agar state mutate karna hai, ya complex behaviour chahiye (services, repositories, etc.)

---

## Real-World Example: Type-Safe HTTP Response

Node.js mein hum aksar generic response objects return karte hain. Java mein hum isko properly type-safe bana sakte hain:

```java
// Sealed interface + records — TypeScript discriminated union jaisa
sealed interface ApiResponse<T> permits ApiResponse.Success, ApiResponse.NotFound, ApiResponse.ServerError {

    // Nested records as permitted types
    record Success<T>(T data, int statusCode) implements ApiResponse<T> {
        // Convenience constructor
        public Success(T data) { this(data, 200); }
    }

    record NotFound<T>(String resource, String id) implements ApiResponse<T> {}

    record ServerError<T>(String message, Throwable cause) implements ApiResponse<T> {}
}

// Service mein use karo
public ApiResponse<User> getUser(Long id) {
    try {
        return userRepo.findById(id)
            .<ApiResponse<User>>map(ApiResponse.Success::new)
            .orElse(new ApiResponse.NotFound<>("User", id.toString()));
    } catch (Exception e) {
        return new ApiResponse.ServerError<>("Database error", e);
    }
}

// Controller mein exhaustive handling
@GetMapping("/users/{id}")
public ResponseEntity<?> handleGetUser(@PathVariable Long id) {
    return switch (userService.getUser(id)) {
        case ApiResponse.Success<User>(User user, int code) ->
            ResponseEntity.status(code).body(user);

        case ApiResponse.NotFound<User>(String resource, String userId) ->
            ResponseEntity.notFound().build();

        case ApiResponse.ServerError<User>(String msg, Throwable cause) ->
            ResponseEntity.internalServerError().body(Map.of("error", msg));
    };
    // Compiler ensure karta hai — koi case miss nahi hua!
}
```

---

## Common Gotchas — Ye Galtiyan Mat Karna

> [!warning] Type system ke traps

### 1. `==` vs `.equals()` — Reference vs Value

```java
String a = new String("Siddesh");
String b = new String("Siddesh");

System.out.println(a == b);       // FALSE — alag objects, alag references
System.out.println(a.equals(b));  // TRUE — same value

// SAFE approach — null-safe equality
System.out.println(Objects.equals(a, b)); // TRUE, aur null safe hai

// String literals — ye confusing hai:
String x = "hello";
String y = "hello";
System.out.println(x == y); // TRUE (string pool se same object!) — rely mat karo iss pe!
```

### 2. Auto-boxing aur `==` ka disaster

```java
Integer a = 1000;
Integer b = 1000;
System.out.println(a == b); // FALSE! (JVM -128 to 127 cache karta hai)

Integer c = 100;
Integer d = 100;
System.out.println(c == d); // TRUE (cached range mein hai)

// Lesson: Integer comparison mein ALWAYS .equals() use karo
System.out.println(a.equals(b)); // TRUE — hamesha ye karo
```

### 3. Generic Arrays — Illegal in Java

```java
// NAHI chal sakta — generic array creation
T[] arr = new T[10]; // COMPILE ERROR

// WORKAROUND 1 — unchecked cast (avoid if possible)
@SuppressWarnings("unchecked")
T[] arr = (T[]) new Object[10];

// WORKAROUND 2 — List use karo (BEST)
List<T> list = new ArrayList<>();
```

### 4. Raw Types — Kabhi Mat Use Karo

```java
// RAW TYPE — generics without type parameter
List myList = new ArrayList(); // AVOID! Compiler warnings milenge
myList.add("hello");
myList.add(42); // Integer bhi add ho gaya — type safety gone!
String s = (String) myList.get(1); // Runtime ClassCastException!

// HAMESHA type parameter specify karo:
List<String> myList = new ArrayList<>();
// myList.add(42); // COMPILE ERROR — type safe hai ab
```

### 5. Casting Generics — Unchecked Warning

```java
Object someObject = getFromLegacyApi();

// Ye compile hoga, warning aayegi
@SuppressWarnings("unchecked")
List<String> strings = (List<String>) someObject; // Unchecked cast!
// Runtime pe koi actual check nahi hoga — type erasure ki wajah se

// Safe approach — check first
if (someObject instanceof List<?> rawList && !rawList.isEmpty()
    && rawList.get(0) instanceof String) {
    // Ab relatively safe hai
}
```

### 6. NullPointerException — Java ka old enemy

```java
// Common NPE scenario
String name = user.getAddress().getCity().toUpperCase();
// Agar getAddress() null return kare — NPE!

// Safe approach 1 — Optional chaining
String city = Optional.ofNullable(user)
    .map(User::getAddress)
    .map(Address::getCity)
    .map(String::toUpperCase)
    .orElse("Unknown City");

// Safe approach 2 — null checks
if (user != null && user.getAddress() != null && user.getAddress().getCity() != null) {
    String city = user.getAddress().getCity().toUpperCase();
}
```

---

## Key Takeaways

- **Nominal typing** — Java mein `implements` explicitly likhna padta hai; shape match karna kaafi nahi. Ye zyada verbose hai lekin refactoring mein safe hai.

- **Primitives exist karte hain** — `int` aur `Integer` alag hain. Generics mein sirf boxed types chal sakti hain (`List<Integer>` not `List<int>`). Auto-boxing seamless hai lekin performance cost aati hai.

- **No union types** — lekin `sealed interface` + `record` + pattern matching se discriminated unions jaisi safety milti hai (Java 17+). Same DX, thoda zyada code.

- **Type erasure** — `List<String>` aur `List<Integer>` runtime pe same hain. `instanceof List<String>` kaam nahi karta. Overloads sirf generic parameters se different nahi ho sakte.

- **PECS rule yaad rakho** — Producer Extends, Consumer Super. Wildcard generics initially confusing lagte hain lekin pattern simple hai.

- **Optional return type ke liye** — null return karne ke bajaye `Optional<T>` return karo. Field mein ya parameter mein mat rakho — sirf return type mein.

- **Records = TS type aliases** — immutable data carriers ke liye records use karo (DTOs, API responses, value objects). Class sirf behaviour ke liye.

- **`==` kabhi nahi objects ke liye** — hamesha `.equals()` ya `Objects.equals()` use karo. Integer caching (`-128` to `127`) ek classic gotcha hai.

---

## Related

- [[01-Mental-Model-Map]]
- [[03-Async-Concurrency]]
- [[Records-and-Sealed-Classes]]
- [[Generics-Deep-Dive]]
- [[Optional-and-Null-Safety]]
