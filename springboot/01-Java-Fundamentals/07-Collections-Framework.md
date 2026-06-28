---
tags: [java, fundamentals, collections, list, map, set]
aliases: [Collections, ArrayList, HashMap, HashSet, List, Map, Set]
stage: foundation
---

# Collections Framework

> [!info] For the Express/TS dev
> JavaScript has `Array`, `Map`, `Set` and that's about it. Java has a deep, well-engineered hierarchy under `java.util` with separate **interfaces** (`List`, `Set`, `Map`, `Queue`, `Deque`) and **implementations** (`ArrayList`, `LinkedList`, `HashSet`, `TreeSet`, `HashMap`, `LinkedHashMap`, `TreeMap`, `ArrayDeque`). Always *declare* by interface (`List<User>`) and *instantiate* the concrete class (`new ArrayList<>()`).

## Concept

### The three core interfaces

| Interface           | Purpose                          | Common impls                                  |
| ------------------- | -------------------------------- | --------------------------------------------- |
| `List<E>`           | Ordered, indexable, allows dups  | `ArrayList`, `LinkedList`                     |
| `Set<E>`            | No duplicates                    | `HashSet`, `LinkedHashSet`, `TreeSet`         |
| `Map<K,V>`          | Key→value pairs                  | `HashMap`, `LinkedHashMap`, `TreeMap`, `ConcurrentHashMap` |
| `Queue<E>` / `Deque<E>` | FIFO / double-ended           | `ArrayDeque`, `LinkedList`, `PriorityQueue`   |

### `List`

```java
List<String> names = new ArrayList<>();
names.add("Alice");
names.add("Bob");
names.get(0);                  // "Alice"
names.size();                  // 2
names.contains("Alice");       // true
names.remove(0);               // remove by index
names.remove("Bob");           // remove by value
for (String n : names) { ... }
```

`ArrayList` = backing array, O(1) get, O(n) middle insert. Use this 95% of the time.
`LinkedList` = doubly-linked list, O(1) head/tail, O(n) get. Rarely the right choice — prefer `ArrayDeque` for a queue.

### `Set`

```java
Set<String> tags = new HashSet<>();
tags.add("java");
tags.add("java");           // ignored — already present
tags.size();                // 1
tags.contains("java");      // true (O(1))
```

- `HashSet` — unordered, O(1).
- `LinkedHashSet` — insertion order preserved.
- `TreeSet` — sorted (natural order or `Comparator`), O(log n).

### `Map`

```java
Map<String, Integer> counts = new HashMap<>();
counts.put("a", 1);
counts.put("b", 2);
counts.get("a");                // 1
counts.getOrDefault("c", 0);    // 0
counts.containsKey("b");        // true
counts.remove("a");

// Iterate
for (var e : counts.entrySet()) {
    System.out.println(e.getKey() + "=" + e.getValue());
}

// Idiomatic: increment-or-init
counts.merge("a", 1, Integer::sum);

// Compute if absent
Map<String, List<String>> byLetter = new HashMap<>();
byLetter.computeIfAbsent("a", k -> new ArrayList<>()).add("apple");
```

### Immutable collections (Java 9+)

```java
List<Integer> xs  = List.of(1, 2, 3);
Set<String>   ts  = Set.of("a", "b");
Map<String,Integer> m = Map.of("a", 1, "b", 2);
```

These are **immutable** — `xs.add(4)` throws `UnsupportedOperationException`. Great for constants and method returns.

### Iteration

```java
for (var item : list)         { ... }    // for-each
list.forEach(System.out::println);        // method-ref
Iterator<T> it = list.iterator();         // manual
```

For transformation, use [[09-Streams-Lambdas|streams]].

### Sorting

```java
List<User> users = ...;
users.sort(Comparator.comparing(User::getName));
users.sort(Comparator.comparingInt(User::getAge).reversed());
Collections.sort(users);                   // requires User implements Comparable
```

### Concurrency-safe variants

For multi-threaded code (see [[11-Concurrency-Basics]]):

- `ConcurrentHashMap` — thread-safe `HashMap`
- `CopyOnWriteArrayList` — for read-heavy lists
- `Collections.synchronizedList(list)` — coarse-grained wrapper (avoid)

## TypeScript ↔ Java comparison

| TypeScript / JS                            | Java                                       |
| ------------------------------------------ | ------------------------------------------ |
| `string[]` / `Array<string>`               | `List<String>` (impl: `ArrayList`)         |
| `new Set<string>()`                        | `Set<String>` → `new HashSet<>()`          |
| `new Map<string, number>()`                | `Map<String, Integer>` → `new HashMap<>()` |
| `arr.push(x)`                              | `list.add(x)`                              |
| `arr.length`                               | `list.size()`                              |
| `map.set(k, v)` / `map.get(k)`             | `map.put(k, v)` / `map.get(k)`             |
| `[...arr]` clone                           | `new ArrayList<>(list)`                    |
| `Object.freeze` / readonly                 | `List.of(...)` immutable                   |
| `arr.includes(x)`                          | `list.contains(x)`                         |
| `arr.sort((a,b) => ...)`                   | `list.sort(Comparator.comparing(...))`     |

## Code example

```java
package com.example.collections;

import java.util.*;
import java.util.stream.Collectors;

public record Order(String customer, double amount) {}

public class Demo {
    public static void main(String[] args) {
        List<Order> orders = List.of(
            new Order("Alice",  50.0),
            new Order("Bob",   120.0),
            new Order("Alice",  30.0),
            new Order("Carol",  90.0)
        );

        // Group by customer (Java's analog to lodash _.groupBy)
        Map<String, List<Order>> byCustomer = orders.stream()
            .collect(Collectors.groupingBy(Order::customer));

        // Sum amounts per customer
        Map<String, Double> totals = orders.stream()
            .collect(Collectors.groupingBy(
                Order::customer,
                Collectors.summingDouble(Order::amount)));

        // Distinct customers, sorted
        Set<String> customers = new TreeSet<>(byCustomer.keySet());

        System.out.println(byCustomer);
        System.out.println(totals);     // {Alice=80.0, Bob=120.0, Carol=90.0}
        System.out.println(customers);  // [Alice, Bob, Carol]

        // Mutable + idiomatic merge
        Map<String, Integer> wordCount = new HashMap<>();
        for (String w : "the quick brown fox the lazy fox".split(" ")) {
            wordCount.merge(w, 1, Integer::sum);
        }
        System.out.println(wordCount);  // {the=2, fox=2, ...}
    }
}
```

## Gotchas

> [!warning] `List.of(...)` is immutable
> Calling `.add()` on it throws at runtime. If you need a mutable copy: `new ArrayList<>(List.of(1,2,3))`.

> [!warning] `null` keys / values
> `HashMap` allows one `null` key and `null` values. `ConcurrentHashMap` and `Map.of(...)` reject them with NPE. `TreeMap` doesn't allow `null` keys.

> [!warning] `equals` + `hashCode` contract
> If you put a custom object in a `HashSet`/`HashMap` and don't override `equals`/`hashCode`, lookups will use reference identity and fail. [[13-Records-Sealed-Pattern-Matching|Records]] do this for free.

> [!warning] Iterating while modifying
> `for (var x : list) { list.remove(x); }` throws `ConcurrentModificationException`. Use `Iterator.remove()` or `list.removeIf(...)`.

> [!tip] Always declare by interface
> `List<User> users = new ArrayList<>();` — not `ArrayList<User> users`. Lets you swap the impl without changing call sites, and is what every Spring API expects.

## Related

- [[02-Syntax-Basics]]
- [[06-Generics]]
- [[09-Streams-Lambdas]]
- [[11-Concurrency-Basics]]
- [[13-Records-Sealed-Pattern-Matching]]
