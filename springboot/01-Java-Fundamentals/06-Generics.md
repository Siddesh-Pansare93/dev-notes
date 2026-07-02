# Generics — Ek Type-Safe Duniya Banao

Socho Zomato ka backend. Ek `Order` hota hai, ek `Restaurant` hota hai, ek `Rider` hota hai. Ab agar tumhe ek "container" class banani ho jo kisi bhi cheez ko hold kare — `Order` bhi, `Restaurant` bhi — toh kya karoge? Ek option hai ki `Object` use karo. Lekin phir kya hoga? Har baar type cast karna padega, aur ek galti se `ClassCastException` runtime pe aayegi — aur tab pata chalega jab customer ka order already fail ho gaya ho.

**Generics is problem ka solution hai.** Tum ek class ya method likhte ho jo *kisi bhi type ke saath kaam kare*, lekin **compiler** ensure karta hai ki type sahi hai — runtime pe nahi, compile time pe hi pakad lo. TypeScript mein tumne `Array<User>` ya `Promise<Order>` likha hoga — exact wahi concept hai Java mein bhi.

> [!info] TypeScript wale yahan se seedha connect karenge
> `List<User>`, `Map<String, Long>`, `<T extends Comparable<T>>` — ye sab TypeScript generics jaisa hi dikhta hai. Ek bada difference hai: **type erasure**. Runtime pe JVM ko pata nahi hota ki `T` kya tha. `List<String>` aur `List<Integer>` dono ek hi class hain JVM ki nazar mein. TypeScript mein bhi types runtime pe erase ho jaati hain — same concept. But Java mein pain thoda zyada hai: `new T()` nahi kar sakte, `T[]` nahi bana sakte. Yeh sab below cover karenge.

---

## Generic Class — Apna Reusable Container Banao

**Kya problem solve karta hai?**

Maan lo Swiggy ke liye ek `ApiResponse` wrapper banana hai — jo kabhi `Order` return kare, kabhi `Restaurant` list, kabhi `User` profile. Bina generics ke, ya toh har type ke liye alag class banao (boring + repetitive), ya `Object` use karo (unsafe). Generics se ek class likhte ho, sab kaam ho jaata hai.

```java
// Ye ek generic "box" hai — T ek placeholder hai actual type ke liye
// Jab create karenge tab batayenge T kya hai
public class ApiResponse<T> {
    private final T data;           // actual response data — kuch bhi ho sakta hai
    private final String message;
    private final int statusCode;

    // Constructor
    public ApiResponse(T data, String message, int statusCode) {
        this.data = data;
        this.message = message;
        this.statusCode = statusCode;
    }

    // Getter — T wapas karta hai, type-safe
    public T getData() {
        return data;
    }

    public String getMessage() {
        return message;
    }

    public boolean isSuccess() {
        return statusCode >= 200 && statusCode < 300;
    }
}
```

Ab use karo:

```java
// Order ke liye — T = Order
ApiResponse<Order> orderResp = new ApiResponse<>(
    new Order(101, "Vada Pav"),
    "Order placed successfully",
    201
);
Order myOrder = orderResp.getData();  // no cast needed! Compiler jaanta hai T = Order

// Restaurant list ke liye — T = List<Restaurant>
ApiResponse<List<Restaurant>> restResp = new ApiResponse<>(
    List.of(new Restaurant("Sharma Ji ki Dukaan")),
    "Restaurants fetched",
    200
);
List<Restaurant> restaurants = restResp.getData();  // perfectly type-safe

// Galat type dene ki koshish karo — COMPILE ERROR aayegi, runtime pe nahi
// ApiResponse<Order> bad = new ApiResponse<>(new Restaurant(...), "msg", 200);
// ^^^ This won't even compile. Compiler ne pakad liya.
```

> [!tip] Diamond Operator `<>` — Repeat Mat Karo
> Java 7 se `<>` operator aaya. Left side pe type likh do, right side pe sirf `<>` — compiler khud infer kar leta hai.
> ```java
> // Purana tarika — boring repetition
> ApiResponse<List<Order>> resp = new ApiResponse<List<Order>>(...);
>
> // Naya tarika — diamond operator
> ApiResponse<List<Order>> resp = new ApiResponse<>(...);
>
> // Ya phir var use karo — aur bhi clean
> var resp = new ApiResponse<>(new Order(101, "Idli"), "ok", 200);
> ```

---

## Generic Method — Ek Method, Har Type Ke Liye

Kuch functions aisa kaam karte hain jo type pe depend nahi karta — woh logic generic ho sakta hai. Jaise "list mein pehla non-null element do" — yeh `String` ke liye bhi kaam karta hai, `Integer` ke liye bhi, `Order` ke liye bhi.

```java
// <T> method signature se pehle — ye batata hai T ek type parameter hai
public static <T> T firstNonNull(T a, T b) {
    return a != null ? a : b;
}

// Use karo — T automatically infer hota hai
String city = firstNonNull(null, "Mumbai");          // T = String
Integer price = firstNonNull(null, 499);             // T = Integer
Order order = firstNonNull(pendingOrder, defaultOrder); // T = Order
```

Ek aur practical example — Swiggy style pagination:

```java
// Generic page wrapper — kisi bhi list ke liye
public static <T> List<T> getPage(List<T> items, int page, int pageSize) {
    int start = page * pageSize;
    int end = Math.min(start + pageSize, items.size());
    if (start >= items.size()) return List.of(); // empty page
    return items.subList(start, end);
}

// Usage
List<Order> allOrders = fetchAllOrders();
List<Order> page1 = getPage(allOrders, 0, 10);  // T = Order

List<Restaurant> allRests = fetchAllRestaurants();
List<Restaurant> page1Rests = getPage(allRests, 0, 20); // T = Restaurant
```

TypeScript mein yeh kuch aisa hota:

```typescript
// TypeScript equivalent
function firstNonNull<T>(a: T | null, b: T): T {
    return a !== null ? a : b;
}
```

Exact same syntax! Java aur TypeScript generics methods mein almost identical hain.

---

## Bounded Type Parameters — "Sirf Aise Types Accept Karo"

**Kya zarurat hai?**

Agar tumhe ek method chahiye jo *numbers ka sum nikale* — toh tumhe ensure karna hai ki `T` sirf number types ho, `String` nahi. Ya agar *max element* chahiye toh `T` ko `Comparable` implement karna chahiye. Yahi hai bounded type parameters.

### Upper Bound — `extends`

```java
// T sirf Number ya uski subclasses ho sakti hai (Integer, Double, Float, etc.)
public static <T extends Number> double sum(List<T> numbers) {
    double total = 0;
    for (T num : numbers) {
        total += num.doubleValue();  // Number ka method — available because T extends Number
    }
    return total;
}

// Valid calls
sum(List.of(1, 2, 3));          // List<Integer> — Integer extends Number ✓
sum(List.of(1.5, 2.5, 3.0));   // List<Double> — Double extends Number ✓

// Invalid — compile error
// sum(List.of("Vada Pav", "Idli")); // String extends Number nahi karta
```

```java
// Multiple bounds — T ko dono implement karne chahiye
// Syntax: T extends Interface1 & Interface2 (& se separate karo, comma nahi)
public static <T extends Number & Comparable<T>> T findMax(List<T> list) {
    T max = list.get(0);
    for (T item : list) {
        if (item.compareTo(max) > 0) max = item;
    }
    return max;
}

Integer maxInt = findMax(List.of(3, 1, 4, 1, 5, 9));  // returns 9
Double maxDbl = findMax(List.of(3.14, 2.71, 1.41));    // returns 3.14
```

TypeScript comparison:

```typescript
// TypeScript mein bhi same concept
function findMax<T extends number | string>(list: T[]): T {
    return list.reduce((a, b) => (a > b ? a : b));
}
```

---

## Wildcards (`?`) — The Tricky Part

Yeh Java generics ka sabse confusing part hai. Dhyan se padho.

### Problem: Generics Invariant Hain

```java
// Array mein yeh kaam karta hai (arrays covariant hain):
Animal[] animals = new Dog[5];  // valid — but dangerous

// Generics mein NAHI kaam karta:
List<Animal> animals = new ArrayList<Dog>();  // COMPILE ERROR
// Kyun? Kyunki agar yeh valid hota, toh:
// animals.add(new Cat());  // Cat bhi Animal hai, toh add ho jaati
// lekin actual list Dog ki thi — runtime pe ClassCastException!
// Java ne sahi kiya — compile time pe hi rok diya
```

Iska matlab: `List<Dog>` is NOT a subtype of `List<Animal>`, even though `Dog` is a subtype of `Animal`. Generics are **invariant**.

Toh phir kaise kaam karein? **Wildcards.**

### Unbounded Wildcard — `List<?>`

```java
// Kisi bhi List ko accept karta hai — padhne ke liye
public static void printAll(List<?> items) {
    for (Object item : items) {
        System.out.println(item);  // Object ki hi operations available hain
    }
}

printAll(List.of("Mumbai", "Delhi"));  // List<String> — works
printAll(List.of(1, 2, 3));            // List<Integer> — works
printAll(List.of(new Order(101, "Biryani"))); // List<Order> — works

// But add nahi kar sakte (except null):
// items.add("something");  // COMPILE ERROR — type unknown hai
```

TypeScript analog: `Array<unknown>` — read kar sakte ho, but add karne ke liye type assert karna padega.

### Upper Bounded Wildcard — `List<? extends Animal>`

*"Producer Extends"* — yeh list sirf data produce (read) karti hai. Write nahi kar sakte.

```java
// Swiggy example: kisi bhi payment method ki list ka total nikalo
// NetBanking, UPI, Card — sab PaymentMethod ke subtypes hain
public static double totalAmount(List<? extends PaymentMethod> payments) {
    double total = 0;
    for (PaymentMethod p : payments) {  // PaymentMethod ke methods available hain
        total += p.getAmount();
    }
    return total;
}

List<UpiPayment> upiList = List.of(new UpiPayment("paytm", 250.0));
List<CardPayment> cardList = List.of(new CardPayment("HDFC", 1500.0));

totalAmount(upiList);   // works! UpiPayment extends PaymentMethod
totalAmount(cardList);  // works! CardPayment extends PaymentMethod

// lekin add nahi kar sakte:
// payments.add(new UpiPayment(...));  // COMPILE ERROR
// Kyun? Compiler nahi jaanta actual type kya hai — safe nahi hai
```

### Lower Bounded Wildcard — `List<? super Dog>`

*"Consumer Super"* — yeh list data consume (write) karti hai. Isse sirf add kar sakte ho.

```java
// Dog ya usse upar ki kisi bhi list mein Dog add karo
public static void addDogs(List<? super Dog> list) {
    list.add(new Dog("Tommy"));     // valid — Dog ya usse upar ki list mein Dog fit hota hai
    list.add(new Dog("Sheru"));
    // list.add(new Cat()); // COMPILE ERROR — Cat nahi daal sakte
}

List<Dog> dogs = new ArrayList<>();
List<Animal> animals = new ArrayList<>();
List<Object> objects = new ArrayList<>();

addDogs(dogs);     // works — Dog super Dog (itself)
addDogs(animals);  // works — Animal super Dog
addDogs(objects);  // works — Object super Dog
```

### PECS — Producer Extends, Consumer Super

Yaad rakhne ka formula:

- **P**roducer **E**xtends — jab list se *read* karna ho: `List<? extends T>`
- **C**onsumer **S**uper — jab list mein *write* karna ho: `List<? super T>`

```java
// Classic example — src se read karo (producer), dst mein write karo (consumer)
public static <T> void copy(List<? extends T> src, List<? super T> dst) {
    for (T item : src) {
        dst.add(item);  // src se padha, dst mein daala
    }
}

List<Dog> dogSrc = List.of(new Dog("Tommy"), new Dog("Sheru"));
List<Animal> animalDst = new ArrayList<>();
copy(dogSrc, animalDst);  // works perfectly
```

| Wildcard | Matlab | TypeScript Analog |
|---|---|---|
| `List<?>` | Unknown type — read-only | `Array<unknown>` |
| `List<? extends Animal>` | Animal ya uski subclass — producer, read-only | `readonly Animal[]` (covariant) |
| `List<? super Dog>` | Dog ya uski superclass — consumer, write | Contravariant parameter |

---

## Type Erasure — Runtime Pe Type Gayab Ho Jaata Hai

Yeh Java generics ka sabse important "gotcha" hai. **Compile time pe types hain, runtime pe nahi.**

JVM ne Java 5 mein generics add kiye, lekin backward compatibility ke liye yeh decision liya ki runtime pe sab type info erase ho jaaye. `List<String>` aur `List<Integer>` dono JVM ke liye sirf `List` hain.

### Type Erasure Ke Consequences

```java
List<String> strings = new ArrayList<>();
List<Integer> ints = new ArrayList<>();

// Dono ka class ek hi hai — type erasure!
System.out.println(strings.getClass() == ints.getClass());  // true!
System.out.println(strings.getClass().getName());            // java.util.ArrayList
```

**1. instanceof Type Parameter Se Kaam Nahi Karta**

```java
Object obj = List.of("a", "b");

// COMPILE ERROR — runtime pe T exist nahi karta
// if (obj instanceof List<String>) { }

// Sahi tarika — unbounded wildcard
if (obj instanceof List<?> list) {
    System.out.println("Ye ek List hai: " + list.size());
}
```

**2. `new T()` Illegal Hai**

```java
public class Repository<T> {
    // COMPILE ERROR — T ka size runtime pe unknown hai
    // public T create() { return new T(); }

    // Solution 1: Supplier pass karo
    private final Supplier<T> factory;
    public Repository(Supplier<T> factory) {
        this.factory = factory;
    }
    public T create() {
        return factory.get();
    }

    // Solution 2: Class<T> token pass karo (reflection ke liye)
    private final Class<T> type;
    public Repository(Class<T> type) throws Exception {
        this.type = type;
    }
    public T createViaReflection() throws Exception {
        return type.getDeclaredConstructor().newInstance();
    }
}

// Usage
Repository<Order> repo1 = new Repository<>(Order::new);  // Supplier approach
Repository<User> repo2 = new Repository<>(User.class);    // Class token approach
```

**3. `T[]` Array Nahi Bana Sakte**

```java
public class Stack<T> {
    // COMPILE ERROR
    // private T[] elements = new T[10];

    // Sahi tarika 1 — List use karo
    private List<T> elements = new ArrayList<>();

    // Sahi tarika 2 — unchecked cast (avoid if possible)
    @SuppressWarnings("unchecked")
    private T[] elements2 = (T[]) new Object[10];  // warning suppress karna padega
}
```

**4. Overloading Mein Problem**

```java
// COMPILE ERROR — dono methods erase hone ke baad same signature ban jaata hai
// void process(List<String> items) { }
// void process(List<Integer> items) { }
// Dono ban jaate hain: void process(List items)

// Solution: alag method names do
void processStrings(List<String> items) { }
void processIntegers(List<Integer> items) { }
```

### Runtime Type Token — Jackson/Spring mein bahut common

```java
// Jackson ya Spring mein often Class<T> token pass karna padta hai
public class TypedService<T> {
    private final Class<T> entityType;

    public TypedService(Class<T> entityType) {
        this.entityType = entityType;
    }

    // Jackson ObjectMapper ki tarah kaam karta hai
    public T deserialize(String json) {
        // entityType.getName() se pata chalta hai actual type
        System.out.println("Deserializing to: " + entityType.getName());
        // objectMapper.readValue(json, entityType) — real code mein
        return null;
    }
}

// Usage
TypedService<Order> orderService = new TypedService<>(Order.class);
TypedService<User> userService = new TypedService<>(User.class);
```

---

## Generic Interface — Contracts Bhi Generic Ho Sakte Hain

```java
// Generic interface — Zomato ke liye: koi bhi entity map karo
public interface Mapper<A, B> {
    B map(A a);
}

// Implementation 1: Order entity ko DTO mein convert karo
public class OrderMapper implements Mapper<Order, OrderDto> {
    @Override
    public OrderDto map(Order order) {
        return new OrderDto(
            order.getId(),
            order.getRestaurantName(),
            order.getTotalAmount()
        );
    }
}

// Implementation 2: User entity ko response mein convert karo
public class UserMapper implements Mapper<User, UserResponse> {
    @Override
    public UserResponse map(User user) {
        return new UserResponse(user.getId(), user.getName(), user.getEmail());
    }
}

// Generic use karna
public static <A, B> List<B> mapAll(List<A> items, Mapper<A, B> mapper) {
    List<B> result = new ArrayList<>();
    for (A item : items) {
        result.add(mapper.map(item));
    }
    return result;
}

// Usage
List<Order> orders = getOrders();
List<OrderDto> dtos = mapAll(orders, new OrderMapper());
```

Java ke built-in functional interfaces bhi isi tarah kaam karte hain:

```java
// Java.util.function mein sab generic interfaces hain
Function<Order, OrderDto> orderMapper = order -> new OrderDto(order.getId(), ...);
Predicate<Order> isDelivered = order -> order.getStatus() == Status.DELIVERED;
Supplier<Order> defaultOrder = () -> new Order(0, "Default");
Consumer<Order> logOrder = order -> System.out.println("Order: " + order.getId());
```

---

## Real-World Example — Result Type (Rust/TypeScript Style)

TypeScript wale Optional chaining (`?.`) aur `Result` types se familiar hain. Java mein bhi same concept implement kar sakte ho generics se:

```java
package com.example.generics;

import java.util.*;
import java.util.function.Function;

/**
 * Rust/TypeScript jaisa Result type — ya toh success value hai ya error
 * TypeScript mein: type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }
 */
public class Result<T, E> {
    private final T value;    // success case mein
    private final E error;    // failure case mein
    private final boolean success;

    // Private constructors — factory methods use karenge
    private Result(T value, E error, boolean success) {
        this.value = value;
        this.error = error;
        this.success = success;
    }

    // Factory methods — aise banao
    public static <T, E> Result<T, E> ok(T value) {
        return new Result<>(value, null, true);
    }

    public static <T, E> Result<T, E> err(E error) {
        return new Result<>(null, error, false);
    }

    public boolean isOk() {
        return success;
    }

    public boolean isErr() {
        return !success;
    }

    // Value nikalo — null check required
    public Optional<T> getValue() {
        return Optional.ofNullable(value);
    }

    public Optional<E> getError() {
        return Optional.ofNullable(error);
    }

    // map — TypeScript ka .then() jaisa
    // <R> matlab naya type parameter — sirf is method ke liye
    // Function<? super T, ? extends R> — PECS rule follow kar raha hai
    public <R> Result<R, E> map(Function<? super T, ? extends R> f) {
        if (isOk()) {
            return Result.ok(f.apply(value));
        }
        return Result.err(error);  // error as-is pass through
    }

    // flatMap — nested Results ko flatten karta hai
    public <R> Result<R, E> flatMap(Function<? super T, ? extends Result<R, E>> f) {
        if (isOk()) {
            return f.apply(value);
        }
        return Result.err(error);
    }

    @Override
    public String toString() {
        return success ? "Ok(" + value + ")" : "Err(" + error + ")";
    }

    public static void main(String[] args) {
        // Zomato order flow — har step ya succeed karta hai ya fail
        Result<Integer, String> orderId = Result.ok(10);

        // Chain operations — agar ok hai toh aage badho
        Result<String, String> confirmation = orderId
            .map(id -> "ORDER-" + id)        // Integer -> String
            .map(code -> "Confirmed: " + code); // String -> String

        System.out.println(confirmation);  // Ok(Confirmed: ORDER-10)

        // Error case — error propagate hoti hai
        Result<Integer, String> failed = Result.err("Payment failed");
        Result<String, String> failedConfirm = failed
            .map(id -> "ORDER-" + id)  // yeh execute nahi hoga
            .map(code -> "Confirmed: " + code); // yeh bhi nahi

        System.out.println(failedConfirm);  // Err(Payment failed)

        // flatMap example — nested calls
        Result<Order, String> orderResult = Result.<Integer, String>ok(101)
            .flatMap(id -> fetchOrderFromDb(id));  // returns Result<Order, String>

        System.out.println(orderResult);
    }

    // Simulated DB call
    private static Result<Order, String> fetchOrderFromDb(int id) {
        if (id > 0) return Result.ok(new Order(id, "Biryani"));
        return Result.err("Order not found: " + id);
    }
}
```

---

## TypeScript vs Java Generics — Side by Side

| Concept | TypeScript | Java |
|---|---|---|
| Generic class | `class Box<T> { value: T }` | `class Box<T> { T value; }` |
| Generic method | `function fn<T>(x: T): T` | `public static <T> T fn(T x)` |
| Bounded type | `<T extends Foo>` | `<T extends Foo>` |
| Multiple bounds | Not directly (use intersection types) | `<T extends Foo & Bar>` |
| Unknown array | `Array<unknown>` | `List<?>` |
| Covariant | Arrays are covariant (`Animal[]` accepts `Dog[]`) | Arrays covariant, but generics invariant — use `<? extends T>` |
| Contravariant | Type param | `<? super T>` |
| Types at runtime | Erased (no reflection) | Erased, but Class tokens + reflection available |
| `new T()` | Possible with constructor type | Illegal — use `Supplier<T>` or `Class<T>` |
| `T[]` | Possible | Illegal — use `List<T>` |
| Conditional types | `T extends X ? A : B` | Not available |
| Mapped types | `{ [K in keyof T]: ... }` | Not available |
| Template literals | Available | Not available |

---

## Gotchas — Ye Mistakes Mat Karna

> [!warning] Primitives Type Parameters Nahi Ban Sakte
> `List<int>` illegal hai. Java generics sirf reference types ke saath kaam karte hain. Boxed types use karo.
> ```java
> List<int> bad = new ArrayList<>();      // COMPILE ERROR
> List<Integer> good = new ArrayList<>(); // Sahi — Integer is a reference type
>
> // Autoboxing hota hai automatic
> good.add(42);           // int -> Integer automatically
> int val = good.get(0);  // Integer -> int automatically
>
> // Performance sensitive code ke liye primitive streams use karo
> IntStream.of(1, 2, 3).sum();  // boxing overhead nahi
> ```

> [!warning] Raw Types — Kabhi Use Mat Karo
> `List` (bina `<>`) ek "raw type" hai — backward compatibility ke liye rakha hai. Agar raw type use karo toh compiler ki saari type safety chali jaati hai silently.
> ```java
> List raw = new ArrayList();     // raw type — dangerous
> raw.add("hello");
> raw.add(42);                    // kuch bhi daal sakte ho — no compile error
> String s = (String) raw.get(1); // ClassCastException at RUNTIME — tabhi pata chalega
>
> List<String> safe = new ArrayList<>();  // always parameterize
> safe.add("hello");
> // safe.add(42);  // COMPILE ERROR — immediately pata chal jaata hai
> ```

> [!warning] Arrays Aur Generics Ka Mix Achha Nahi
> ```java
> // COMPILE ERROR — generic array creation illegal
> List<String>[] arr = new List<String>[10];
>
> // Workarounds:
> // Option 1: List of Lists (recommended)
> List<List<String>> listOfLists = new ArrayList<>();
>
> // Option 2: Unchecked cast (last resort)
> @SuppressWarnings("unchecked")
> List<String>[] arr2 = new List[10];  // warning, but works
> ```

> [!warning] Overloaded Methods Mein Type Erasure Ka Trap
> ```java
> // COMPILE ERROR — type erasure ke baad same signature
> public void process(List<String> items) { }
> public void process(List<Integer> items) { }
> // Dono ban jaate: void process(List items) — conflict!
>
> // Fix: alag method names
> public void processStrings(List<String> items) { }
> public void processIntegers(List<String> items) { }
> ```

> [!warning] Wildcard List Mein Add Nahi Kar Sakte
> ```java
> public void addItem(List<?> list, Object item) {
>     // list.add(item);  // COMPILE ERROR — type unknown hai
>     // list.add(null);  // Sirf null allowed hai
> }
>
> // Agar add karna hai toh bounded wildcard use karo:
> public <T> void addItem(List<? super T> list, T item) {
>     list.add(item);  // valid
> }
> ```

> [!tip] Diamond `<>` Always Use Karo
> Right side pe type parameters repeat karna zaroori nahi. Compiler infer kar leta hai.
> ```java
> // Purana boring way
> Map<String, List<Order>> map = new HashMap<String, List<Order>>();
>
> // Modern way — much cleaner
> Map<String, List<Order>> map = new HashMap<>();
> var map2 = new HashMap<String, List<Order>>();  // ya var use karo
> ```

> [!tip] `var` Se Code Aur Clean Hoga
> ```java
> // Verbose
> ArrayList<Map<String, List<Order>>> complexList = new ArrayList<Map<String, List<Order>>>();
>
> // Clean
> var complexList = new ArrayList<Map<String, List<Order>>>();
> ```

> [!info] Spring Boot Mein Generics Ka Use
> Spring Boot mein generics bahut jagah dikhengi:
> - `ResponseEntity<T>` — controller methods mein `ResponseEntity<UserDto>` return karo
> - `Page<T>` — pagination ke liye `Page<Order>` return karta hai Spring Data
> - `Optional<T>` — repository mein `Optional<User>` return hoti hai
> - `List<T>` — JPA queries mein
> - `Repository<T, ID>` — Spring Data ka base interface generic hai
> ```java
> // Spring Controller mein
> @GetMapping("/orders/{id}")
> public ResponseEntity<OrderDto> getOrder(@PathVariable Long id) {
>     return orderService.findById(id)
>         .map(order -> ResponseEntity.ok(orderMapper.map(order)))
>         .orElse(ResponseEntity.notFound().build());
> }
>
> // Spring Data Repository mein
> public interface OrderRepository extends JpaRepository<Order, Long> {
>     // JpaRepository<T, ID> generic hai — T = Order, ID = Long
>     List<Order> findByUserId(Long userId);
>     Page<Order> findByStatus(Status status, Pageable pageable);
> }
> ```

---

## Key Takeaways

- **Generics = Type Safety at Compile Time** — runtime pe `ClassCastException` se bachao. TypeScript generics jaise hi syntax, almost identical.
- **Generic Class**: `class Box<T>` — T placeholder hai, create karte waqt batao `new Box<String>()`
- **Generic Method**: `<T> T method(T param)` — return type se pehle `<T>` declare karo
- **Bounded**: `<T extends Foo>` — T sirf Foo ya uski subclass ho sakti hai; multiple bounds `<T extends A & B>`
- **Wildcards solve invariance problem**: `List<Dog>` is NOT `List<Animal>` — wildcards se flexible code likho
- **PECS**: Producer Extends (`<? extends T>` — read only), Consumer Super (`<? super T>` — write only)
- **Type Erasure**: Runtime pe `T` exist nahi karta — `instanceof List<String>` illegal, `new T()` illegal, `T[]` illegal
- **Workarounds for erasure**: `Supplier<T>` for creation, `Class<T>` for reflection, `List<T>` instead of `T[]`
- **Never use raw types** — `List` instead of `List<String>` silently breaks type safety
- **Primitives not allowed** — `List<int>` invalid, use `List<Integer>` with autoboxing
- **Spring Boot mein everywhere** — `ResponseEntity<T>`, `JpaRepository<T, ID>`, `Page<T>`, `Optional<T>`
