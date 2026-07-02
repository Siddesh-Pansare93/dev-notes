# Collections Framework

Socho ek second ke liye — Zomato ka backend kaise kaam karta hai? Har restaurant ke orders track karne hain, users ki wishlist maintain karni hai, delivery partners ki live location store karni hai, aur coupon codes ki unique list rakhni hai. Ye sab data structures ke bina possible hi nahi hai.

Java mein **Collections Framework** exactly yahi kaam karta hai — ek well-engineered, battle-tested set of interfaces aur implementations jo tumhare data ko organize karne mein help karta hai. Aur ye sirf ArrayList nahi hai — ek poora ecosystem hai: Lists, Sets, Maps, Queues, Deques — sab kuch.

TypeScript se aaye ho? Wahan sirf `Array`, `Map`, aur `Set` tha. Java mein ek proper hierarchy hai with **interfaces** (contract define karte hain) aur **implementations** (actual kaam karte hain). Rule yaad rakho:

> **Declare by interface, instantiate the implementation.**
>
> ```java
> List<User> users = new ArrayList<>();   // Sahi tarika
> ArrayList<User> users = new ArrayList<>(); // Kaam karta hai, but wrong approach
> ```

Ye isliye important hai kyunki Spring ke saare APIs `List<>`, `Map<>` type expect karte hain — specific implementation nahi. Aur kal agar `ArrayList` se `LinkedList` pe switch karna pade toh sirf ek line change hogi.

---

## Collections Framework ka Family Tree

```
java.util.Collection (interface)
    ├── List<E>           → ordered, indexable, duplicates allowed
    │     ├── ArrayList
    │     └── LinkedList
    ├── Set<E>            → no duplicates
    │     ├── HashSet
    │     ├── LinkedHashSet
    │     └── TreeSet
    └── Queue<E> / Deque<E>  → FIFO / double-ended
          ├── ArrayDeque
          ├── LinkedList
          └── PriorityQueue

java.util.Map<K,V> (interface — Collection ka part NAHI hai)
    ├── HashMap
    ├── LinkedHashMap
    ├── TreeMap
    └── ConcurrentHashMap
```

| Interface | Kya karta hai | Common Implementations |
|---|---|---|
| `List<E>` | Ordered, indexable, duplicates allow | `ArrayList`, `LinkedList` |
| `Set<E>` | No duplicates | `HashSet`, `LinkedHashSet`, `TreeSet` |
| `Map<K,V>` | Key → Value pairs | `HashMap`, `LinkedHashMap`, `TreeMap`, `ConcurrentHashMap` |
| `Queue<E>` / `Deque<E>` | FIFO / double-ended | `ArrayDeque`, `LinkedList`, `PriorityQueue` |

---

## List — Ordered Collection

### Kya hota hai List?

List ek ordered collection hai jisme duplicates allowed hain aur index se access kar sakte ho. TypeScript ke `Array<T>` jaisa hi hai, but with a proper interface.

**Real-world analogy**: Zomato app mein tumhara cart — items ek order mein hain, same item multiple times add kar sakte ho, aur kisi bhi position se remove kar sakte ho.

### ArrayList — 95% cases ke liye yahi use karo

```java
import java.util.ArrayList;
import java.util.List;

List<String> restaurantNames = new ArrayList<>();

// Elements add karna
restaurantNames.add("Domino's");
restaurantNames.add("McDonald's");
restaurantNames.add("KFC");
restaurantNames.add("Burger King");

// Index se access
System.out.println(restaurantNames.get(0));  // "Domino's"
System.out.println(restaurantNames.size());  // 4

// Check karna
System.out.println(restaurantNames.contains("KFC"));  // true

// Remove karna — 2 tarike hain
restaurantNames.remove(0);             // Index se remove (Domino's hata diya)
restaurantNames.remove("Burger King"); // Value se remove

// Loop karna
for (String name : restaurantNames) {
    System.out.println("Restaurant: " + name);
}

// Index se loop — agar index chahiye
for (int i = 0; i < restaurantNames.size(); i++) {
    System.out.println(i + ": " + restaurantNames.get(i));
}
```

**ArrayList ke andar kya hota hai?** Ek backing array hai jo automatically resize hoti hai jab full ho jaye. Default initial capacity 10 hai. Agar pehle se pata hai ki kitne elements aayenge, toh capacity set kar sakte ho:

```java
// Agar tumhe pata hai ki ~1000 orders honge toh
List<Order> orders = new ArrayList<>(1000);
// Ye unnecessary resizing se bachata hai — small optimization but good practice
```

**Performance**:
- `get(index)` → O(1) — direct array access
- `add(element)` (end pe) → O(1) amortized
- `add(index, element)` (middle mein) → O(n) — sab shift karne padte hain
- `remove(index)` → O(n) — shift again
- `contains(value)` → O(n) — linear search

### LinkedList — Rare use case

```java
import java.util.LinkedList;

LinkedList<String> orderQueue = new LinkedList<>();
orderQueue.addFirst("Order #1001");  // Queue ke front pe add
orderQueue.addLast("Order #1002");   // Queue ke back pe add
orderQueue.removeFirst();            // Front se remove
orderQueue.peekFirst();              // Dekho but remove mat karo
```

**LinkedList kab use karo?**
- Jab frequently head/tail se add/remove karna ho
- Deque (double-ended queue) ki tarah use karna ho
- But honestly? **`ArrayDeque` almost always better hai** for queue/deque operations

> [!tip] LinkedList vs ArrayDeque
> Agar tumhe queue/deque chahiye, `LinkedList` use mat karo. `ArrayDeque` faster hai memory locality ki wajah se. `LinkedList` tab hi use karo jab tumhe literally `List` interface + queue operations dono ek saath chahiye.

### List ke useful methods

```java
List<Integer> prices = new ArrayList<>(List.of(299, 499, 199, 399, 99));

// Sublist — original ka view hai, new list nahi
List<Integer> slice = prices.subList(1, 3);  // [499, 199]

// Sort karna
Collections.sort(prices);                    // Natural order: [99, 199, 299, 399, 499]
prices.sort(Comparator.reverseOrder());       // Reverse: [499, 399, 299, 199, 99]

// All elements remove karna
prices.clear();
System.out.println(prices.isEmpty());  // true

// Array se List banana
String[] arr = {"Swiggy", "Zomato", "Dunzo"};
List<String> fromArray = new ArrayList<>(Arrays.asList(arr));

// List se Array banana
String[] backToArray = fromArray.toArray(new String[0]);

// List copy karna
List<String> copy = new ArrayList<>(fromArray);  // Deep copy of references

// indexOf — pehla occurrence
List<String> items = List.of("Paneer", "Chicken", "Paneer", "Fish");
System.out.println(items.indexOf("Paneer"));     // 0
System.out.println(items.lastIndexOf("Paneer")); // 2
```

---

## Set — No Duplicates

### Kya hota hai Set?

Set ek collection hai jisme **duplicate elements nahi hote**. Agar same element dobara add karo, toh silently ignore ho jata hai.

**Real-world analogy**: Swiggy pe restaurant tags — "Pizza", "Burger", "Fast Food". Same tag dobara add karna meaningless hai.

### HashSet — Fastest Set

```java
import java.util.HashSet;
import java.util.Set;

Set<String> cuisineTags = new HashSet<>();

cuisineTags.add("Pizza");
cuisineTags.add("Italian");
cuisineTags.add("Pizza");      // Duplicate — silently ignore hoga
cuisineTags.add("Fast Food");

System.out.println(cuisineTags.size());         // 3 (duplicate nahi count hua)
System.out.println(cuisineTags.contains("Pizza")); // true — O(1)!

// Real use case: Unique users who visited a page
Set<String> uniqueVisitors = new HashSet<>();
uniqueVisitors.add("user_123");
uniqueVisitors.add("user_456");
uniqueVisitors.add("user_123"); // Same user dobara visit kiya — ignore
System.out.println("Unique visitors: " + uniqueVisitors.size()); // 2
```

**Performance**:
- `add()` → O(1) average
- `contains()` → O(1) average — **ye bahut powerful hai!**
- `remove()` → O(1) average
- **But**: Order guaranteed nahi hai — elements kisi bhi order mein aa sakte hain

### LinkedHashSet — Order chahiye?

```java
Set<String> recentSearches = new LinkedHashSet<>();
recentSearches.add("Biryani");
recentSearches.add("Pizza");
recentSearches.add("Momos");
recentSearches.add("Biryani"); // Duplicate, ignore

// Insertion order preserve hoti hai
System.out.println(recentSearches); // [Biryani, Pizza, Momos]
```

Use case: User ki recent searches, recently viewed items — where insertion order matters.

### TreeSet — Sorted Set

```java
import java.util.TreeSet;

Set<Integer> ratings = new TreeSet<>();
ratings.add(4);
ratings.add(2);
ratings.add(5);
ratings.add(1);
ratings.add(3);

System.out.println(ratings); // [1, 2, 3, 4, 5] — automatically sorted!

// First aur last
TreeSet<Integer> treeSet = (TreeSet<Integer>) ratings;
System.out.println(treeSet.first()); // 1
System.out.println(treeSet.last());  // 5

// Range queries — bahut powerful!
System.out.println(treeSet.headSet(3));   // [1, 2] — 3 se chhote
System.out.println(treeSet.tailSet(3));   // [3, 4, 5] — 3 aur 3 se bade
System.out.println(treeSet.subSet(2, 4)); // [2, 3] — 2 to 4 (exclusive)
```

**Performance**: O(log n) for add/remove/contains — slower than HashSet but sorted!

### Set Operations — Union, Intersection, Difference

```java
Set<String> zomatoRestaurants = new HashSet<>(Set.of("Dominos", "KFC", "McDonald's", "Burger King"));
Set<String> swiggyRestaurants = new HashSet<>(Set.of("Dominos", "Subway", "McDonald's", "Pizza Hut"));

// Union — dono pe available
Set<String> union = new HashSet<>(zomatoRestaurants);
union.addAll(swiggyRestaurants);
System.out.println("All restaurants: " + union);

// Intersection — dono pe common
Set<String> intersection = new HashSet<>(zomatoRestaurants);
intersection.retainAll(swiggyRestaurants);
System.out.println("Available on both: " + intersection); // [Dominos, McDonald's]

// Difference — sirf Zomato pe
Set<String> onlyOnZomato = new HashSet<>(zomatoRestaurants);
onlyOnZomato.removeAll(swiggyRestaurants);
System.out.println("Only on Zomato: " + onlyOnZomato); // [KFC, Burger King]
```

---

## Map — Key-Value Pairs

### Kya hota hai Map?

Map ek key-value store hai. TypeScript ke `Map<K, V>` se bilkul similar, but much more powerful with methods like `merge`, `computeIfAbsent`, `getOrDefault`.

**Real-world analogy**: UPI ID to bank account mapping — ek UPI ID exactly ek account se map hota hai. Ya Paytm merchant ID to merchant details.

### HashMap — Most Common

```java
import java.util.HashMap;
import java.util.Map;

Map<String, Integer> itemPrices = new HashMap<>();

// Put
itemPrices.put("Butter Chicken", 350);
itemPrices.put("Biryani", 280);
itemPrices.put("Paneer Tikka", 320);
itemPrices.put("Naan", 40);

// Get
System.out.println(itemPrices.get("Biryani"));      // 280
System.out.println(itemPrices.get("Dosa"));          // null — key nahi hai!

// Safe get with default
System.out.println(itemPrices.getOrDefault("Dosa", 0)); // 0 — NPE se bachao

// Check karna
System.out.println(itemPrices.containsKey("Naan"));   // true
System.out.println(itemPrices.containsValue(280));     // true

// Remove
itemPrices.remove("Naan");

// Size
System.out.println(itemPrices.size()); // 3

// Update — put hi use karo
itemPrices.put("Biryani", 300); // Purani value overwrite ho jayegi
```

### Map ko Iterate karna

```java
Map<String, Integer> scores = new HashMap<>();
scores.put("Alice", 95);
scores.put("Bob", 87);
scores.put("Carol", 92);

// Method 1: entrySet — BEST way, key aur value dono chahiye
for (Map.Entry<String, Integer> entry : scores.entrySet()) {
    System.out.println(entry.getKey() + " scored " + entry.getValue());
}

// Method 2: keySet — sirf keys chahiye
for (String name : scores.keySet()) {
    System.out.println(name);
}

// Method 3: values — sirf values chahiye
for (int score : scores.values()) {
    System.out.println(score);
}

// Method 4: forEach — Lambda style (clean!)
scores.forEach((name, score) ->
    System.out.println(name + ": " + score));
```

### Map ke Power Methods — ye TypeScript mein nahi hai!

```java
Map<String, Integer> orderCount = new HashMap<>();

// merge — increment-or-init (word count pattern)
// Agar key nahi hai toh 1 rakho, agar hai toh existing value + 1 karo
String[] orders = {"Pizza", "Burger", "Pizza", "Biryani", "Burger", "Pizza"};
for (String item : orders) {
    orderCount.merge(item, 1, Integer::sum);
}
System.out.println(orderCount); // {Pizza=3, Burger=2, Biryani=1}

// computeIfAbsent — agar key nahi hai toh create karo
// Grouped data structure banana ke liye best
Map<String, List<String>> cuisineRestaurants = new HashMap<>();

// Ek baar manually karna padta tha:
// if (!map.containsKey(key)) { map.put(key, new ArrayList<>()); }
// map.get(key).add(value);

// Ab ek line mein:
cuisineRestaurants.computeIfAbsent("Italian", k -> new ArrayList<>()).add("Pizza Hut");
cuisineRestaurants.computeIfAbsent("Italian", k -> new ArrayList<>()).add("Dominos");
cuisineRestaurants.computeIfAbsent("Indian", k -> new ArrayList<>()).add("Biryani House");

System.out.println(cuisineRestaurants);
// {Italian=[Pizza Hut, Dominos], Indian=[Biryani House]}

// putIfAbsent — sirf tab put karo jab key nahi ho
Map<String, String> upiMapping = new HashMap<>();
upiMapping.put("alice@upi", "HDFC Bank");
upiMapping.putIfAbsent("alice@upi", "SBI Bank"); // Ignore hoga!
upiMapping.putIfAbsent("bob@upi", "ICICI Bank"); // Add hoga
System.out.println(upiMapping.get("alice@upi")); // HDFC Bank (unchanged)

// compute — key ke liye value calculate karo
Map<String, Double> ratings = new HashMap<>();
ratings.put("restaurant_1", 4.5);
ratings.compute("restaurant_1", (key, oldVal) -> oldVal == null ? 0.0 : oldVal + 0.1);
System.out.println(ratings.get("restaurant_1")); // 4.6
```

### LinkedHashMap — Insertion Order Preserve karta hai

```java
Map<String, Integer> recentOrders = new LinkedHashMap<>();
recentOrders.put("Order #1001", 350);
recentOrders.put("Order #1002", 520);
recentOrders.put("Order #1003", 180);

// Insertion order mein iterate hoga
recentOrders.forEach((id, amount) ->
    System.out.println(id + ": ₹" + amount));
// Order #1001: ₹350
// Order #1002: ₹520
// Order #1003: ₹180
```

**Use case**: Cache with insertion order, recently used items, audit logs.

### TreeMap — Sorted by Key

```java
import java.util.TreeMap;

Map<String, Integer> alphabeticalMenu = new TreeMap<>();
alphabeticalMenu.put("Zinger Burger", 250);
alphabeticalMenu.put("Aloo Paratha", 120);
alphabeticalMenu.put("Masala Chai", 40);
alphabeticalMenu.put("Dal Makhani", 180);

// Keys automatically alphabetically sorted!
alphabeticalMenu.forEach((item, price) ->
    System.out.println(item + ": ₹" + price));
// Aloo Paratha: ₹120
// Dal Makhani: ₹180
// Masala Chai: ₹40
// Zinger Burger: ₹250
```

---

## Queue aur Deque

### Kya hota hai Queue?

Queue ek FIFO (First In, First Out) data structure hai. Zomato delivery queue socho — jo order pehle aaya, pehle deliver hoga.

```java
import java.util.ArrayDeque;
import java.util.Queue;

Queue<String> deliveryQueue = new ArrayDeque<>();

// Enqueue — queue mein add karna
deliveryQueue.offer("Order #1001");
deliveryQueue.offer("Order #1002");
deliveryQueue.offer("Order #1003");

// Dequeue — front se remove karke return karna
System.out.println(deliveryQueue.poll()); // "Order #1001"

// Peek — remove kiye bina front element dekho
System.out.println(deliveryQueue.peek()); // "Order #1002"

System.out.println(deliveryQueue.size()); // 2
```

### Deque — Double-Ended Queue

```java
import java.util.Deque;

Deque<String> browserHistory = new ArrayDeque<>();

// Stack ki tarah use karna (LIFO)
browserHistory.push("google.com");    // front pe add
browserHistory.push("zomato.com");
browserHistory.push("swiggy.com");

System.out.println(browserHistory.pop()); // "swiggy.com" — last added, first out

// Queue ki tarah use karna
browserHistory.addLast("flipkart.com");
System.out.println(browserHistory.peekFirst()); // front element
System.out.println(browserHistory.peekLast());  // last element
```

### PriorityQueue — Sorted Queue

```java
import java.util.PriorityQueue;

// Minimum amount pehle process hoga
PriorityQueue<Integer> amounts = new PriorityQueue<>();
amounts.offer(500);
amounts.offer(100);
amounts.offer(300);

System.out.println(amounts.poll()); // 100 — smallest first!
System.out.println(amounts.poll()); // 300
System.out.println(amounts.poll()); // 500

// Custom comparator — maximum first
PriorityQueue<Integer> maxQueue = new PriorityQueue<>(Comparator.reverseOrder());
maxQueue.offer(500);
maxQueue.offer(100);
maxQueue.offer(300);
System.out.println(maxQueue.poll()); // 500 — largest first!
```

**Use case**: Task scheduling, Dijkstra's algorithm, order processing by priority.

---

## Immutable Collections (Java 9+)

```java
// Immutable List
List<String> cities = List.of("Mumbai", "Delhi", "Bangalore", "Chennai");

// Immutable Set
Set<Integer> validPinCodes = Set.of(400001, 110001, 560001);

// Immutable Map
Map<String, String> bankCodes = Map.of(
    "HDFC", "HDFC0001",
    "SBI", "SBIN0001",
    "ICICI", "ICIC0001"
);

// cities.add("Pune"); // RUNTIME ERROR! UnsupportedOperationException
// validPinCodes.add(411001); // RUNTIME ERROR!
```

**Kab use karo**: Constants, configuration data, method return values jab caller ko modify nahi karna chahiye.

**Mutable copy banana hai?**

```java
List<String> mutableCities = new ArrayList<>(List.of("Mumbai", "Delhi"));
mutableCities.add("Pune"); // Ab theek hai!

Map<String, String> mutableMap = new HashMap<>(Map.of("key1", "val1"));
mutableMap.put("key2", "val2"); // Works!
```

---

## Sorting — Collections ko Sort karna

```java
import java.util.Comparator;

// Simple types sort karna
List<Integer> numbers = new ArrayList<>(List.of(5, 2, 8, 1, 9, 3));
Collections.sort(numbers);           // Natural order ascending
numbers.sort(Comparator.reverseOrder()); // Descending

// Custom objects sort karna
record User(String name, int age, double rating) {}

List<User> users = new ArrayList<>(List.of(
    new User("Rahul", 28, 4.5),
    new User("Priya", 24, 4.8),
    new User("Amit", 31, 4.2),
    new User("Sneha", 26, 4.8)
));

// Single field se sort
users.sort(Comparator.comparing(User::name));       // Alphabetical by name
users.sort(Comparator.comparingInt(User::age));     // By age ascending
users.sort(Comparator.comparingInt(User::age).reversed()); // By age descending

// Multiple fields se sort — chained comparators
users.sort(Comparator
    .comparingDouble(User::rating).reversed()   // Pehle rating descending
    .thenComparing(User::name));                // Tie break: name alphabetical

users.forEach(u -> System.out.println(u.name() + " - " + u.rating()));
// Priya - 4.8
// Sneha - 4.8
// Rahul - 4.5
// Amit - 4.2

// Null-safe sorting
List<String> withNulls = new ArrayList<>(Arrays.asList("Zomato", null, "Swiggy", null, "Dunzo"));
withNulls.sort(Comparator.nullsLast(Comparator.naturalOrder()));
System.out.println(withNulls); // [Dunzo, Swiggy, Zomato, null, null]
```

---

## Concurrency-Safe Collections

Multi-threaded code mein (Spring Boot ke async tasks, scheduled jobs, etc.) regular `HashMap` aur `ArrayList` thread-safe nahi hain — race conditions ho sakti hain.

```java
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

// Thread-safe HashMap — production mein use karo
Map<String, Integer> sessionCount = new ConcurrentHashMap<>();

// Multiple threads simultaneously put kar sakte hain safely
sessionCount.put("session_1", 1);
sessionCount.computeIfAbsent("user_123", k -> 0);
sessionCount.merge("user_123", 1, Integer::sum);

// Thread-safe List — read-heavy scenarios ke liye
// Write pe full copy banti hai — isliye read bahut fast, write slow
List<String> activeDeliveryPartners = new CopyOnWriteArrayList<>();
activeDeliveryPartners.add("Partner_001");
activeDeliveryPartners.add("Partner_002");

// Iterate karna safe hai even if another thread is writing
for (String partner : activeDeliveryPartners) {
    System.out.println(partner);
}

// AVOID this — coarse-grained locking, bad performance
List<String> syncList = Collections.synchronizedList(new ArrayList<>());
// Har operation pe poora list lock ho jata hai
```

> [!warning] HashMap in multithreaded code
> Production Spring Boot app mein agar multiple threads ek `HashMap` ko modify kar rahe hain toh **data corruption ya infinite loop** ho sakta hai. `ConcurrentHashMap` use karo.

---

## TypeScript vs Java Collections — Side by Side

| TypeScript / JS | Java | Notes |
|---|---|---|
| `string[]` / `Array<string>` | `List<String>` (impl: `ArrayList`) | Java mein type parameter required |
| `new Set<string>()` | `Set<String>` → `new HashSet<>()` | Java Set = interface |
| `new Map<string, number>()` | `Map<String, Integer>` → `new HashMap<>()` | Java Map = interface |
| `arr.push(x)` | `list.add(x)` | Same concept |
| `arr.length` | `list.size()` | Property vs method |
| `arr.unshift(x)` | `deque.addFirst(x)` | No direct equivalent on List |
| `map.set(k, v)` | `map.put(k, v)` | Different method name |
| `map.get(k)` | `map.get(k)` (but returns `null`, not `undefined`) | NPE risk in Java! |
| `map.has(k)` | `map.containsKey(k)` | |
| `map.delete(k)` | `map.remove(k)` | |
| `[...arr]` shallow clone | `new ArrayList<>(list)` | |
| `Object.freeze` / readonly | `List.of(...)` immutable | |
| `arr.includes(x)` | `list.contains(x)` | O(n) for both |
| `arr.sort((a,b) => ...)` | `list.sort(Comparator.comparing(...))` | Java's is more readable |
| `arr.indexOf(x)` | `list.indexOf(x)` | Same |
| `map.size` | `map.size()` | Property vs method |
| `_.groupBy(arr, fn)` | `stream().collect(Collectors.groupingBy(fn))` | Streams chapter mein cover hoga |
| `_.uniq(arr)` | `new HashSet<>(list)` | Type different hoga |

---

## Real-World Code Example — Zomato Style

```java
package com.example.collections;

import java.util.*;
import java.util.stream.Collectors;

// Record — automatic equals/hashCode/toString
public record Order(String customerId, String item, double amount, String city) {}

public class ZomatoAnalytics {
    public static void main(String[] args) {

        // Kuch sample orders
        List<Order> orders = List.of(
            new Order("user_1", "Biryani",    350.0, "Mumbai"),
            new Order("user_2", "Pizza",      450.0, "Delhi"),
            new Order("user_1", "Butter Naan",  80.0, "Mumbai"),
            new Order("user_3", "Dosa",       150.0, "Bangalore"),
            new Order("user_2", "Burger",     200.0, "Delhi"),
            new Order("user_1", "Lassi",       60.0, "Mumbai")
        );

        // 1. Customer ke orders group karna (Lodash _.groupBy jaisa)
        Map<String, List<Order>> byCustomer = orders.stream()
            .collect(Collectors.groupingBy(Order::customerId));

        System.out.println("Orders per customer:");
        byCustomer.forEach((customerId, customerOrders) ->
            System.out.println(customerId + ": " + customerOrders.size() + " orders"));

        // 2. Har customer ka total spend
        Map<String, Double> totalSpend = orders.stream()
            .collect(Collectors.groupingBy(
                Order::customerId,
                Collectors.summingDouble(Order::amount)));

        System.out.println("\nTotal spend per customer:");
        totalSpend.forEach((id, total) ->
            System.out.printf("%s: ₹%.2f%n", id, total));
        // user_1: ₹490.00
        // user_2: ₹650.00
        // user_3: ₹150.00

        // 3. Unique cities jahan orders aaye (sorted)
        Set<String> activeCities = new TreeSet<>();
        orders.forEach(o -> activeCities.add(o.city()));
        System.out.println("\nActive cities: " + activeCities);
        // [Bangalore, Delhi, Mumbai]

        // 4. Most popular items — word count pattern
        Map<String, Long> itemFrequency = orders.stream()
            .collect(Collectors.groupingBy(Order::item, Collectors.counting()));
        System.out.println("\nItem frequency: " + itemFrequency);

        // 5. Mutable map pe merge — order count track karna
        Map<String, Integer> orderCount = new HashMap<>();
        for (Order order : orders) {
            orderCount.merge(order.customerId(), 1, Integer::sum);
        }
        System.out.println("\nOrder counts (merge): " + orderCount);

        // 6. computeIfAbsent — city ke restaurants track karna
        Map<String, List<String>> cityRestaurants = new HashMap<>();
        cityRestaurants.computeIfAbsent("Mumbai", k -> new ArrayList<>()).add("Biryani By Kilo");
        cityRestaurants.computeIfAbsent("Mumbai", k -> new ArrayList<>()).add("Behrouz Biryani");
        cityRestaurants.computeIfAbsent("Delhi", k -> new ArrayList<>()).add("Haldiram's");
        System.out.println("\nCity restaurants: " + cityRestaurants);
    }
}
```

---

## Iteration Patterns

```java
List<String> apps = new ArrayList<>(List.of("Zomato", "Swiggy", "Dunzo", "BigBasket"));

// 1. Enhanced for-each — sabse simple
for (String app : apps) {
    System.out.println(app);
}

// 2. forEach with lambda
apps.forEach(app -> System.out.println("App: " + app));

// 3. forEach with method reference
apps.forEach(System.out::println);

// 4. Iterator — jab iterate karte waqt remove karna ho
Iterator<String> iterator = apps.iterator();
while (iterator.hasNext()) {
    String app = iterator.next();
    if (app.equals("Dunzo")) {
        iterator.remove(); // Safe removal during iteration
    }
}

// 5. removeIf — aur cleaner way
apps.removeIf(app -> app.startsWith("D")); // "Dunzo" hata do

// 6. Index-based — jab index chahiye
for (int i = 0; i < apps.size(); i++) {
    System.out.println(i + ": " + apps.get(i));
}

// 7. Stream (Chapter 9 mein detail mein)
apps.stream()
    .filter(app -> app.length() > 5)
    .map(String::toLowerCase)
    .forEach(System.out::println);
```

---

## Gotchas — Common Mistakes Jo Beginners Karte Hain

> [!warning] `List.of(...)` immutable hai — yaad rakho!
> ```java
> List<String> cities = List.of("Mumbai", "Delhi");
> cities.add("Pune"); // RUNTIME EXCEPTION: UnsupportedOperationException
>
> // Fix: Mutable copy banao
> List<String> mutableCities = new ArrayList<>(List.of("Mumbai", "Delhi"));
> mutableCities.add("Pune"); // Works!
> ```

> [!warning] `map.get()` null return kar sakta hai
> TypeScript mein `map.get("missing")` returns `undefined` — tum safely check kar lete ho. Java mein `null` return hota hai. Agar uspe directly method call kiya toh **NullPointerException**!
> ```java
> Map<String, Integer> prices = new HashMap<>();
> prices.put("Pizza", 350);
>
> // Dangerous:
> int price = prices.get("Biryani"); // NPE! "Biryani" nahi hai map mein
>
> // Safe:
> int price = prices.getOrDefault("Biryani", 0); // 0 return karta hai
>
> // Ya check karo:
> if (prices.containsKey("Biryani")) {
>     int p = prices.get("Biryani");
> }
> ```

> [!warning] `equals()` aur `hashCode()` — Custom Objects in HashMap/HashSet
> Agar custom class ka object `HashSet` ya `HashMap` mein use karo aur `equals()`/`hashCode()` override nahi kiya, toh Java reference identity use karta hai — do "same" objects alag dikhenge!
> ```java
> class Restaurant {
>     String name;
>     // equals() aur hashCode() nahi hai!
> }
>
> Restaurant r1 = new Restaurant("Dominos");
> Restaurant r2 = new Restaurant("Dominos");
>
> Set<Restaurant> set = new HashSet<>();
> set.add(r1);
> set.add(r2); // Duplicate nahi samjha! Set mein 2 elements honge
>
> // Fix 1: Record use karo (automatic equals/hashCode)
> record Restaurant(String name) {}
>
> // Fix 2: Override karo manually
> // Fix 3: IDE generate kara do (@Override equals + hashCode)
> ```

> [!warning] Iterate karte waqt Modify mat karo
> ```java
> List<String> items = new ArrayList<>(List.of("Pizza", "Burger", "Biryani"));
>
> // WRONG — ConcurrentModificationException aayega!
> for (String item : items) {
>     if (item.equals("Burger")) {
>         items.remove(item); // Exception!
>     }
> }
>
> // RIGHT — Iterator.remove() use karo
> Iterator<String> it = items.iterator();
> while (it.hasNext()) {
>     if (it.next().equals("Burger")) {
>         it.remove(); // Safe!
>     }
> }
>
> // BEST — removeIf use karo
> items.removeIf(item -> item.equals("Burger")); // Clean aur safe!
> ```

> [!warning] `null` keys aur values mein inconsistency
> ```java
> HashMap<String, String> hm = new HashMap<>();
> hm.put(null, "value");        // Allowed — one null key
> hm.put("key", null);          // Allowed — null values
>
> Map<String, String> immutable = Map.of(null, "value"); // NPE!
>
> ConcurrentHashMap<String, String> chm = new ConcurrentHashMap<>();
> chm.put(null, "value"); // NPE!
> chm.put("key", null);   // NPE!
> ```

> [!warning] Remove by value vs Remove by index
> ```java
> List<Integer> numbers = new ArrayList<>(List.of(1, 2, 3, 4, 5));
>
> numbers.remove(2);    // Index 2 remove karta hai → [1, 2, 4, 5]
>
> // Agar value 2 remove karna hai:
> numbers.remove(Integer.valueOf(2)); // Value 2 remove karta hai → [1, 3, 4, 5]
> ```
> Java autoboxing se confuse ho jaata hai — `remove(2)` ko int argument milta hai toh index samajhta hai!

> [!tip] Declare always by interface
> ```java
> // WRONG — implementation ko expose karta hai
> ArrayList<User> users = new ArrayList<>();
>
> // RIGHT — interface expose karo
> List<User> users = new ArrayList<>();
>
> // Kyun? Kal switch karna ho toh:
> List<User> users = new LinkedList<>(); // Sirf yahan change
> // Baki sab code unchanged!
> ```
> Spring ke saare APIs `List<>`, `Map<>` type expect karte hain, specific implementation nahi.

---

## Quick Reference — Kab Kya Use Karo

| Situation | Use | Kyun |
|---|---|---|
| General purpose list | `ArrayList` | O(1) random access, simple |
| Frequently head/tail operations | `ArrayDeque` | Faster than LinkedList |
| No duplicates, fast lookup | `HashSet` | O(1) contains |
| No duplicates, insertion order | `LinkedHashSet` | Hash + linked list |
| No duplicates, sorted | `TreeSet` | Auto-sorted, O(log n) |
| Key-value, fast lookup | `HashMap` | O(1) get/put |
| Key-value, insertion order | `LinkedHashMap` | Ordered HashMap |
| Key-value, sorted keys | `TreeMap` | Sorted by key |
| Multithreaded key-value | `ConcurrentHashMap` | Thread-safe HashMap |
| Multithreaded read-heavy list | `CopyOnWriteArrayList` | Thread-safe, read-optimized |
| Priority-based processing | `PriorityQueue` | Min-heap by default |
| Constants/immutable data | `List.of()`, `Set.of()`, `Map.of()` | Immutable, fast |

---

## Key Takeaways

- **Hierarchy samjho**: `List`, `Set`, `Map`, `Queue` — interfaces hain; `ArrayList`, `HashMap`, etc. — implementations hain. Declare interface type se, instantiate implementation se.

- **`ArrayList` teri best friend hai** — 95% cases mein yahi use karo. `LinkedList` sirf jab queue/deque operations explicitly chahiye.

- **`HashMap` vs `TreeMap` vs `LinkedHashMap`**: Unordered fast access = `HashMap`, sorted keys = `TreeMap`, insertion order = `LinkedHashMap`.

- **`HashSet` = O(1) contains** — agar sirf unique elements aur fast lookup chahiye, `HashSet` `List` se much better hai.

- **`getOrDefault()` use karo** — `map.get()` se directly value use mat karo, `null` check ya `getOrDefault()` use karo.

- **`merge()` aur `computeIfAbsent()`** — ye methods Node.js mein nahi hain, but Java mein ye grouping aur counting ko bahut clean banate hain.

- **`List.of()` immutable hai** — agar mutable copy chahiye: `new ArrayList<>(List.of(...))`.

- **ConcurrentModificationException** — loop ke andar loop ki list modify mat karo; `removeIf()` ya `Iterator.remove()` use karo.

- **Custom objects in Set/Map**: `equals()` aur `hashCode()` override karna mandatory hai. `record` use karo — automatic milta hai.

- **Multithreaded code**: Regular collections thread-safe nahi hain. `ConcurrentHashMap`, `CopyOnWriteArrayList` use karo.
