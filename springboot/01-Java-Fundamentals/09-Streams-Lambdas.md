# Streams aur Lambdas — Java ka Functional Programming Wala Power-Up

Socho Zomato ka backend. Ek restaurant hai, uske paas hazaron orders hain. Tumhe chahiye:
- Sirf **active orders** filter karo
- Har order ka **customer name** nikalo
- **Amount ke hisaab se sort** karo
- Top 10 dikhao

Node.js mein tum karte — `orders.filter(...).map(...).sort(...).slice(0, 10)`. Done.

Java mein? Java 8 se pehle yeh sab karna ek nightmare tha — for loops ke andar for loops, temp lists banana, manual iteration. Bahut boilerplate.

**Java 8 ne Lambdas aur Stream API introduce kiya** — aur ek baar mein sab kuch badal gaya. Ab Java bhi tumhare beloved `.filter().map().reduce()` jaisi cheez karta hai, lekin kuch extra superpowers ke saath.

---

## Lambdas — Anonymous Functions, Java Style

TypeScript mein tum likhte ho:
```typescript
const double = (x: number) => x * 2;
const greet = (name: string) => `Hello ${name}`;
```

Java mein lambda syntax thoda alag hai, but concept same:
```java
// TypeScript: (x: number) => x * 2
// Java:
Function<Integer, Integer> double = x -> x * 2;

// TypeScript: (a: number, b: number) => a + b
// Java:
BiFunction<Integer, Integer, Integer> add = (a, b) -> a + b;

// TypeScript: () => console.log("hi")
// Java:
Runnable r = () -> System.out.println("hi");

// TypeScript: (msg: string) => console.log("LOG " + msg)
// Java: (returns nothing, takes one arg)
Consumer<String> log = msg -> System.out.println("LOG " + msg);

// Multi-line lambda — curly braces chahiye aur explicit return bhi
Function<Integer, String> classify = n -> {
    if (n < 0)  return "neg";   // negative numbers
    if (n == 0) return "zero";  // zero
    return "pos";               // positive
};
```

### Functional Interface — Lambda ka Foundation

Lambda tab kaam karta hai jab uska **target type ek functional interface ho**. Matlab ek interface jo sirf **ek abstract method** define kare.

```java
// Yeh ek functional interface hai
@FunctionalInterface
interface Validator<T> {
    boolean validate(T value);  // sirf yeh ek method
}

// Ab isko lambda se implement karo
Validator<String> notEmpty = s -> !s.isBlank();
Validator<Integer> positive = n -> n > 0;

// Use karo
System.out.println(notEmpty.validate("hello")); // true
System.out.println(positive.validate(-5));       // false
```

Java ke built-in functional interfaces (java.util.function package mein):

| Interface | Signature | Kab use karo |
|-----------|-----------|--------------|
| `Function<T, R>` | `T -> R` | Input lo, output do |
| `BiFunction<T, U, R>` | `(T, U) -> R` | Do inputs, ek output |
| `Consumer<T>` | `T -> void` | Kuch karo, return mat karo |
| `BiConsumer<T, U>` | `(T, U) -> void` | Do inputs, kuch karo |
| `Supplier<T>` | `() -> T` | Koi argument nahi, value do |
| `Predicate<T>` | `T -> boolean` | Condition check karo |
| `BiPredicate<T, U>` | `(T, U) -> boolean` | Do inputs pe condition |
| `Runnable` | `() -> void` | No args, no return |

---

## Method References — Shortcut Syntax `::` (Double Colon)

Kabhi kabhi lambda itna simple hota hai ki seedha method ka reference de do. `User::getName` is much cleaner than `u -> u.getName()`.

```java
// u -> System.out.println(u) — ye boring hai
// instance ka method reference:
list.forEach(System.out::println);

// s -> s.toUpperCase() — shortcut:
list.stream().map(String::toUpperCase);

// u -> new User(u) — constructor reference:
list.stream().map(User::new);

// User::getAge se Comparator banana:
list.sort(Comparator.comparing(User::getAge));
```

Char types ke method references:

| Form | Equivalent Lambda |
|------|-------------------|
| `ClassName::staticMethod` | `x -> ClassName.staticMethod(x)` |
| `instance::method` | `x -> instance.method(x)` |
| `ClassName::instanceMethod` | `x -> x.method()` |
| `ClassName::new` | `() -> new ClassName()` |

> [!tip] Method References Kab Use Karein?
> Jab lambda sirf ek existing method call kar raha ho — tab method reference zyada readable hai. Lekin agar logic complex hai ya multiple lines hain, to regular lambda hi rakho.

---

## Stream Pipeline — Zomato Orders Ka Example

Socho Zomato ke paas orders ka ek bada list hai. Tumhe pipeline banana hai:

1. **Source** — data kahan se aa raha hai (collection, file, etc.)
2. **Intermediate Operations** — lazy operations jo stream ko transform karte hain
3. **Terminal Operation** — actual kaam tab hota hai jab terminal operation chalti hai

```java
List<User> users = getUsersFromDB(); // Zomato ke registered users

// Pipeline: active users ke names, alphabetically sorted
List<String> activeNames = users.stream()      // 1. Source — stream banao
    .filter(u -> u.isActive())                 // 2. Intermediate — filter
    .map(User::getName)                        // 2. Intermediate — transform
    .sorted()                                  // 2. Intermediate — sort
    .toList();                                 // 3. Terminal — result collect karo

// Active users ki total age
int totalAge = users.stream()
    .filter(u -> u.isActive())
    .mapToInt(User::getAge)    // Object stream -> primitive IntStream (boxing avoid)
    .sum();                    // Terminal operation
```

> [!info] Node.js vs Java Streams — Ek Important Difference
> JavaScript mein `arr.filter(...).map(...)` — **har step turant execute hota hai** (eager).
> Java Streams **lazy** hain — koi bhi intermediate operation tab tak execute nahi hoti jab tak terminal operation na aaye. Matlab agar `.filter()` ke baad `.findFirst()` lagaya, to Java sirf pehla matching element milte hi ruk jaata hai — baaki elements process hi nahi karta. Performance win!

---

## Intermediate Operations — Pipeline ke Building Blocks

### `filter` — Condition se chhano

```java
// Sirf premium Swiggy users
users.stream()
    .filter(u -> u.isPremium())
    .toList();

// Multiple conditions chain karo
users.stream()
    .filter(u -> u.getCity().equals("Mumbai"))
    .filter(u -> u.getOrderCount() > 10)
    .toList();
```

### `map` — Transform karo

```java
// User objects se sirf emails nikalo
List<String> emails = users.stream()
    .map(User::getEmail)
    .toList();

// Prices pe 18% GST apply karo
List<Double> pricesWithGST = prices.stream()
    .map(p -> p * 1.18)
    .toList();
```

### `flatMap` — Nested Lists ko Flatten Karo

Yeh concept thoda tricky hai. Socho har Zomato customer ke paas multiple orders hain. Tumhe **saare orders** ek flat list mein chahiye.

```java
// Yeh structure socho:
// Customer A -> [Order1, Order2]
// Customer B -> [Order3]
// Customer C -> [Order4, Order5, Order6]
// Tumhe chahiye: [Order1, Order2, Order3, Order4, Order5, Order6]

List<Customer> customers = getCustomers();

List<Order> allOrders = customers.stream()
    .flatMap(c -> c.getOrders().stream())  // har customer ki list ko flatten karo
    .toList();

// Simple nested list example:
List<List<Integer>> nested = List.of(
    List.of(1, 2, 3),
    List.of(4, 5),
    List.of(6, 7, 8, 9)
);

List<Integer> flat = nested.stream()
    .flatMap(List::stream)    // List::stream == list -> list.stream()
    .toList();
// Result: [1, 2, 3, 4, 5, 6, 7, 8, 9]
```

TypeScript mein `flatMap` same kaam karta hai:
```typescript
const flat = nested.flatMap(arr => arr); // ya flat(1)
```

### `sorted` — Sort Karo

```java
// Natural order (alphabetical for strings, ascending for numbers)
names.stream().sorted().toList();

// Custom comparator
orders.stream()
    .sorted(Comparator.comparingDouble(Order::getAmount).reversed()) // amount descending
    .toList();

// Multiple criteria — pehle city, phir name
users.stream()
    .sorted(Comparator.comparing(User::getCity)
                      .thenComparing(User::getName))
    .toList();
```

### `distinct` — Duplicates Hatao

```java
// Duplicate order IDs remove karo
List<String> uniqueProductIds = orders.stream()
    .map(Order::getProductId)
    .distinct()    // deduplication
    .toList();
```

### `limit` aur `skip` — Pagination Ke Liye

```java
int page = 2;
int pageSize = 10;

List<Order> pagedOrders = allOrders.stream()
    .skip((long) page * pageSize)  // pehle N elements skip karo
    .limit(pageSize)               // sirf N elements lo
    .toList();

// Top 5 most expensive orders
List<Order> top5 = orders.stream()
    .sorted(Comparator.comparingDouble(Order::getAmount).reversed())
    .limit(5)
    .toList();
```

### `peek` — Debugging ke Liye (Don't use in production logic)

```java
// Intermediate step pe kya ho raha hai dekhno
List<String> result = names.stream()
    .peek(n -> System.out.println("Before filter: " + n))  // debug
    .filter(n -> n.startsWith("A"))
    .peek(n -> System.out.println("After filter: " + n))   // debug
    .map(String::toUpperCase)
    .toList();
```

> [!warning] `peek` sirf debugging ke liye hai
> Production code mein `peek` se koi side effect mat karo (like DB writes). Yeh ek anti-pattern hai. Sirf logging/debugging ke liye use karo.

---

## Terminal Operations — Yahan Asli Kaam Hota Hai

### `collect` — Result Collection Mein Convert Karo

```java
import static java.util.stream.Collectors.*;

// Mutable list (old way)
List<String> mutableList = stream.collect(toList());

// Immutable list (Java 16+, preferred)
List<String> immutableList = stream.toList();
// Ya ye bhi:
List<String> immutableList2 = stream.collect(toUnmodifiableList());

// Set mein collect karo (duplicates automatically remove)
Set<String> productSet = stream.collect(toSet());

// String join karo (like array.join(', ') in JS)
String csv = stream.collect(joining(", "));         // "a, b, c"
String withBrackets = stream.collect(joining(", ", "[", "]")); // "[a, b, c]"
```

### `groupingBy` — Data Group Karo (SQL GROUP BY jaisa)

Yeh Streams ka sabse powerful collector hai. Zomato ke orders ko city ke hisaab se group karo:

```java
// Orders grouped by customer name
Map<String, List<Order>> ordersByCustomer = orders.stream()
    .collect(groupingBy(Order::getCustomerName));
// Result: {"Alice" -> [Order1, Order3], "Bob" -> [Order2, Order5], ...}

// City ke hisaab se order count
Map<String, Long> orderCountByCity = orders.stream()
    .collect(groupingBy(
        Order::getCity,       // group key
        counting()            // downstream collector
    ));
// Result: {"Mumbai" -> 150, "Delhi" -> 200, "Bengaluru" -> 180}

// Customer ke hisaab se total revenue
Map<String, Double> revenueByCustomer = orders.stream()
    .collect(groupingBy(
        Order::getCustomerName,
        summingDouble(Order::getAmount)
    ));

// Customer ke hisaab se average order value
Map<String, Double> avgByCustomer = orders.stream()
    .collect(groupingBy(
        Order::getCustomerName,
        averagingDouble(Order::getAmount)
    ));
```

### `toMap` — Map Banao

```java
// User ID -> User object
Map<Long, User> userById = users.stream()
    .collect(toMap(User::getId, u -> u));
// Ya shorthand:
Map<Long, User> userById2 = users.stream()
    .collect(toMap(User::getId, Function.identity()));

// User ID -> User name (sirf name chahiye value mein)
Map<Long, String> idToName = users.stream()
    .collect(toMap(User::getId, User::getName));
```

> [!warning] `toMap` Duplicate Keys Pe Crash Karta Hai
> Agar stream mein duplicate keys hain, `toMap` `IllegalStateException` throw karta hai. Merge function do:
> ```java
> // Duplicate key pe pehli value rakho
> Map<String, Order> latestByCustomer = orders.stream()
>     .collect(toMap(
>         Order::getCustomerName,
>         o -> o,
>         (existing, newOne) -> existing  // conflict pe pehli wali rakho
>     ));
> ```

### `partitioningBy` — Do Groups Mein Baanto

```java
// Active aur inactive users alag karo
Map<Boolean, List<User>> partitioned = users.stream()
    .collect(partitioningBy(User::isActive));

List<User> activeUsers = partitioned.get(true);
List<User> inactiveUsers = partitioned.get(false);
```

### `forEach` — Loop Chalao (void terminal)

```java
// Har active order print karo
orders.stream()
    .filter(Order::isActive)
    .forEach(o -> System.out.println(o.getId() + ": " + o.getAmount()));
```

### `count`, `findFirst`, `anyMatch`, `allMatch`

```java
// Kitne active users hain?
long activeCount = users.stream()
    .filter(User::isActive)
    .count();

// Koi bhi premium user hai?
boolean hasPremium = users.stream()
    .anyMatch(User::isPremium);

// Sab users verified hain?
boolean allVerified = users.stream()
    .allMatch(User::isVerified);

// Koi bhi banned user nahi hai?
boolean noneBanned = users.stream()
    .noneMatch(User::isBanned);

// Pehla Mumbai ka user dhundo (Optional return karta hai)
Optional<User> mumbaiUser = users.stream()
    .filter(u -> u.getCity().equals("Mumbai"))
    .findFirst();
```

### `reduce` — Accumulate Karo

```java
// Saare numbers ka sum (manually, without .sum())
int total = IntStream.of(1, 2, 3, 4, 5)
    .reduce(0, Integer::sum);  // 15

// Saari strings concatenate karo
String combined = Stream.of("Zomato", "Swiggy", "Blinkit")
    .reduce("", (a, b) -> a + ", " + b);
// Zyada idiomatic: use joining() collector
```

---

## Primitive Streams — Boxing se Bachao

Jab numbers ke saath kaam karo, `Stream<Integer>` se bachna chahiye kyunki **boxing/unboxing costly hai**. Instead use karo `IntStream`, `LongStream`, `DoubleStream`.

```java
// BAD: Stream<Integer> — har number ek Integer object banta hai
Stream<Integer> ages = users.stream().map(User::getAge);

// GOOD: IntStream — primitive int, no boxing
IntStream ages = users.stream().mapToInt(User::getAge);

// Primitive stream pe built-in math operations
IntStream.range(1, 11).sum();                    // 1 se 10 ka sum = 55
IntStream.rangeClosed(1, 10).average();          // OptionalDouble[5.5]
IntStream.of(10, 20, 30, 40).max();              // OptionalInt[40]

DoubleStream prices = orders.stream().mapToDouble(Order::getAmount);
double totalRevenue = prices.sum();

// Primitive back to object stream
IntStream intStream = IntStream.of(1, 2, 3);
Stream<Integer> boxed = intStream.boxed();  // ab normal stream
```

---

## Parallel Streams — Multi-threading Easy Mode

```java
// Sirf parallelStream() likhna hai
long count = orders.parallelStream()
    .filter(o -> o.getAmount() > 1000)
    .count();
```

> [!warning] Parallel Streams — Samajhke Use Karo
> - Sirf **CPU-bound, large datasets** ke liye worthwhile hai (hazaron+ elements)
> - **Shared mutable state** kabhi mat use karo parallel stream ke andar (race conditions)
> - Small lists pe parallel stream **slower** ho sakta hai (thread overhead > actual work)
> - Spring Boot web requests typically already multi-threaded hain — ek request ke andar parallel stream usually overkill hai
> ```java
> // DANGER — shared mutable state in parallel stream:
> List<String> result = new ArrayList<>();
> orders.parallelStream()
>     .filter(...)
>     .forEach(o -> result.add(o.getName())); // RACE CONDITION!
>
> // SAFE — use collect():
> List<String> result = orders.parallelStream()
>     .filter(...)
>     .map(Order::getName)
>     .collect(Collectors.toList()); // thread-safe collector
> ```

---

## TypeScript vs Java Stream — Side-by-Side Comparison

| TypeScript / JavaScript | Java Stream | Notes |
|------------------------|-------------|-------|
| `arr.map(x => x * 2)` | `s.map(x -> x * 2)` | Same concept |
| `arr.filter(x => x > 0)` | `s.filter(x -> x > 0)` | Same |
| `arr.reduce((a,b) => a+b, 0)` | `s.reduce(0, Integer::sum)` | Same |
| `arr.flatMap(x => x)` | `s.flatMap(x -> x.stream())` | Java mein `.stream()` call karo |
| `arr.find(p)` | `s.filter(p).findFirst()` | Java mein `Optional` return hota hai |
| `arr.some(p)` | `s.anyMatch(p)` | Same concept |
| `arr.every(p)` | `s.allMatch(p)` | Same concept |
| `[...new Set(arr)]` | `s.distinct().toList()` | Same |
| `arr.sort(cmp)` | `s.sorted(comparator)` | Java mein immutable (nayi stream) |
| `arr.slice(0, 5)` | `s.limit(5)` | Same |
| `arr.join(", ")` | `s.collect(joining(", "))` | Collector use karo |
| Eager — turant run hota hai | Lazy — terminal op pe run hota hai | Important difference |
| Reusable array | Single-use stream | Stream dobara use nahi ho sakta |
| `arr.length` | `s.count()` | Java mein terminal op hai |
| `arr.forEach(fn)` | `s.forEach(fn)` | Java mein void, returns nothing |
| `Object.groupBy(arr, fn)` | `s.collect(groupingBy(fn))` | Java mein zyada powerful |

---

## Complete Example — Zomato Orders Analytics

```java
package com.example.streams;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;
import static java.util.stream.Collectors.*;

// Record — modern Java ka data class (like TypeScript interface)
public record Order(
    String customer,
    String product,
    String city,
    double amount,
    LocalDate date,
    boolean isPremiumOrder
) {}

public class ZomatoAnalytics {
    public static void main(String[] args) {
        List<Order> orders = List.of(
            new Order("Alice",  "Butter Chicken", "Mumbai",     350.00, LocalDate.of(2025, 1, 5),  true),
            new Order("Bob",    "Biryani",         "Delhi",      280.00, LocalDate.of(2025, 1, 6),  false),
            new Order("Alice",  "Paneer Tikka",   "Mumbai",     420.00, LocalDate.of(2025, 1, 7),  true),
            new Order("Carol",  "Dosa",            "Bengaluru",  150.00, LocalDate.of(2025, 1, 8),  false),
            new Order("Bob",    "Chole Bhature",  "Delhi",      200.00, LocalDate.of(2025, 1, 8),  false),
            new Order("David",  "Pizza",           "Mumbai",     650.00, LocalDate.of(2025, 1, 9),  true),
            new Order("Carol",  "Idli",            "Bengaluru",   80.00, LocalDate.of(2025, 1, 9),  false)
        );

        // 1. Har customer ka total revenue — amount by customer, descending order
        System.out.println("=== Revenue per Customer ===");
        orders.stream()
            .collect(groupingBy(
                Order::customer,
                summingDouble(Order::amount)
            ))
            .entrySet().stream()
            .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
            .forEach(e -> System.out.printf("%-10s: Rs %.2f%n", e.getKey(), e.getValue()));

        // 2. Top 3 most expensive orders
        System.out.println("\n=== Top 3 Orders ===");
        orders.stream()
            .sorted(Comparator.comparingDouble(Order::amount).reversed())
            .limit(3)
            .forEach(o -> System.out.printf("%s's %s — Rs %.2f%n",
                o.customer(), o.product(), o.amount()));

        // 3. City ke hisaab se average order value
        System.out.println("\n=== Average Order by City ===");
        orders.stream()
            .collect(groupingBy(
                Order::city,
                averagingDouble(Order::amount)
            ))
            .forEach((city, avg) ->
                System.out.printf("%-12s: Rs %.2f avg%n", city, avg));

        // 4. Unique products ka set
        Set<String> uniqueProducts = orders.stream()
            .map(Order::product)
            .collect(toUnmodifiableSet());
        System.out.println("\nUnique products: " + uniqueProducts);

        // 5. Overall average order amount
        double avgAmount = orders.stream()
            .mapToDouble(Order::amount)
            .average()
            .orElse(0.0);
        System.out.printf("%nOverall avg order: Rs %.2f%n", avgAmount);

        // 6. Premium vs non-premium orders partition
        Map<Boolean, List<Order>> partitioned = orders.stream()
            .collect(partitioningBy(Order::isPremiumOrder));
        System.out.println("\nPremium orders: " + partitioned.get(true).size());
        System.out.println("Regular orders: " + partitioned.get(false).size());

        // 7. City + customer ke hisaab se order CSV
        String orderSummary = orders.stream()
            .sorted(Comparator.comparing(Order::city).thenComparing(Order::customer))
            .map(o -> o.city() + "/" + o.customer() + "(" + o.product() + ")")
            .collect(joining(", "));
        System.out.println("\nOrder summary: " + orderSummary);

        // 8. Total revenue (IntStream style)
        double totalRevenue = orders.stream()
            .mapToDouble(Order::amount)
            .sum();
        System.out.printf("%nTotal Revenue: Rs %.2f%n", totalRevenue);
    }
}
```

---

## Stream Sources — Data Kahan Se Aata Hai

```java
// Collection se
List<String> list = List.of("a", "b", "c");
Stream<String> s1 = list.stream();

// Array se
String[] arr = {"x", "y", "z"};
Stream<String> s2 = Arrays.stream(arr);

// Hardcoded values se
Stream<String> s3 = Stream.of("Zomato", "Swiggy", "Blinkit");

// Range (int ka loop jaisa)
IntStream range = IntStream.range(0, 10);      // 0 to 9
IntStream rangeClosed = IntStream.rangeClosed(1, 10); // 1 to 10

// File ki lines
// try (Stream<String> lines = Files.lines(Path.of("orders.csv"))) {
//     lines.filter(l -> l.startsWith("MUM")).forEach(System.out::println);
// }

// Empty stream
Stream<String> empty = Stream.empty();

// Infinite stream (with limit!)
Stream<Double> randoms = Stream.generate(Math::random).limit(5);
Stream<Integer> evens = Stream.iterate(0, n -> n + 2).limit(10);
// Result: 0, 2, 4, 6, 8, 10, 12, 14, 16, 18
```

---

## Gotchas — Common Mistakes Jo Beginners Karte Hain

> [!warning] Stream Single-Use Hota Hai — Dobara Use Mat Karo
> ```java
> Stream<User> stream = users.stream();
> long count = stream.count();     // terminal op — stream consumed!
> List<User> list = stream.toList(); // IllegalStateException — stream already operated upon or closed
>
> // Fix: Stream dobara banao
> long count = users.stream().count();
> List<User> list = users.stream().toList(); // alag stream call
> ```

> [!warning] Lambda ke Andar Checked Exception Nahi Chal Sakta
> ```java
> // Yeh compile nahi hoga:
> List<String> urls = List.of("http://...");
> urls.stream()
>     .map(url -> new URL(url))  // URL() throws MalformedURLException — checked exception!
>     .toList();
>
> // Fix: Wrap in unchecked exception
> urls.stream()
>     .map(url -> {
>         try {
>             return new URL(url);
>         } catch (MalformedURLException e) {
>             throw new RuntimeException(e);  // unchecked mein convert karo
>         }
>     })
>     .toList();
> ```

> [!warning] Stream ke Andar Bahar Ka State Mutate Mat Karo
> ```java
> // DANGER — external list modify karna stream se (especially parallel mein)
> List<String> result = new ArrayList<>();
> users.stream()
>     .filter(User::isActive)
>     .forEach(u -> result.add(u.getName())); // side effect — avoid!
>
> // CORRECT — collect karo
> List<String> result = users.stream()
>     .filter(User::isActive)
>     .map(User::getName)
>     .collect(Collectors.toList());
> ```

> [!warning] `toMap` Pe Duplicate Key = Exception
> ```java
> // Agar duplicate customer name hai:
> Map<String, Order> map = orders.stream()
>     .collect(toMap(Order::getCustomerName, o -> o));
> // IllegalStateException: Duplicate key Alice
>
> // Fix: Merge function do
> Map<String, Order> map = orders.stream()
>     .collect(toMap(
>         Order::getCustomerName,
>         o -> o,
>         (first, second) -> first // duplicate pe pehla rakho
>     ));
> ```

> [!warning] `sorted()` Null Handle Nahi Karta
> ```java
> // NullPointerException agar koi name null hai
> users.stream().sorted(Comparator.comparing(User::getName)).toList();
>
> // Fix: Null-safe comparator
> users.stream()
>     .sorted(Comparator.comparing(User::getName, Comparator.nullsLast(String::compareTo)))
>     .toList();
> ```

> [!tip] `toList()` (Java 16+) Immutable Hai
> ```java
> // Old way — mutable ArrayList return karta hai
> List<String> mutable = stream.collect(Collectors.toList());
> mutable.add("extra"); // allowed
>
> // New way — immutable list
> List<String> immutable = stream.toList();
> immutable.add("extra"); // UnsupportedOperationException!
>
> // Spring Boot ke modern projects mein .toList() prefer karo
> ```

> [!tip] `peek` Sirf Debug Ke Liye
> `peek` ek intermediate op hai jo stream ko pass-through karta hai but ek action bhi karta hai. Production logic ke liye use mat karo. Debugging mein IDE breakpoints ya logging ke alternative ke taur pe helpful hai.

---

## Spring Boot Mein Streams — Real Usage

Spring Boot ke service layer mein tum yahi karte ho:

```java
@Service
public class OrderService {

    @Autowired
    private OrderRepository orderRepository;

    // Har user ka total spend
    public Map<String, Double> getSpendByUser() {
        List<Order> orders = orderRepository.findAll();

        return orders.stream()
            .collect(Collectors.groupingBy(
                Order::getCustomerEmail,
                Collectors.summingDouble(Order::getAmount)
            ));
    }

    // Top N orders by amount
    public List<OrderDTO> getTopOrders(int n) {
        return orderRepository.findAll().stream()
            .sorted(Comparator.comparingDouble(Order::getAmount).reversed())
            .limit(n)
            .map(this::toDTO)  // entity -> DTO convert karo
            .toList();
    }

    // City filter + search
    public List<OrderDTO> searchOrders(String city, String keyword) {
        return orderRepository.findAll().stream()
            .filter(o -> city == null || o.getCity().equalsIgnoreCase(city))
            .filter(o -> keyword == null || o.getProductName().toLowerCase().contains(keyword.toLowerCase()))
            .map(this::toDTO)
            .toList();
    }

    private OrderDTO toDTO(Order order) {
        return new OrderDTO(order.getId(), order.getCustomerEmail(),
                            order.getProductName(), order.getAmount());
    }
}
```

> [!info] Database Queries Ke Liye Stream Use Mat Karo
> Agar tumhara data directly database se aa raha hai, to **filtering/sorting/grouping database level pe karo** (SQL/JPQL mein). Java Streams ke liye use karo **in-memory transformations** — jab data already application memory mein ho. Hazaron rows Java mein laake phir filter karna inefficient hai.

---

## Key Takeaways

- **Lambda = anonymous function** — `x -> x * 2` is Java ka arrow function. Functional interface ka ek abstract method satisfy karta hai.

- **Method reference (`::`)** = shortcut jab lambda sirf ek method call kare — `User::getName` is cleaner than `u -> u.getName()`.

- **Stream = pipeline** — Source → Intermediate Operations (lazy) → Terminal Operation (eager). Jab tak terminal op nahi, koi kaam nahi hota.

- **Intermediate ops** (lazy, return Stream): `filter`, `map`, `flatMap`, `sorted`, `distinct`, `limit`, `skip`, `peek`

- **Terminal ops** (eager, return result): `collect`, `toList`, `forEach`, `count`, `reduce`, `findFirst`, `anyMatch`, `allMatch`, `noneMatch`

- **Collectors** are the real power — `groupingBy`, `toMap`, `joining`, `partitioningBy`, `summingDouble`, `averagingDouble`

- **Primitive streams** (`IntStream`, `LongStream`, `DoubleStream`) use karo number operations ke liye — boxing overhead avoid hota hai.

- **Streams single-use** hain — ek baar terminal op chalane ke baad stream dobara use nahi ho sakta.

- **Parallel streams** power deta hai lekin side effects aur shared mutable state se darao.

- **flatMap** nested lists flatten karne ke liye — `List<List<T>>` ko `List<T>` banana hai to `flatMap(Collection::stream)` use karo.

- **TypeScript se Java aa rahe ho?** Concept same hai — map/filter/reduce — bas syntax aur laziness ka difference samajh lo, baki sab familiar lagega.
