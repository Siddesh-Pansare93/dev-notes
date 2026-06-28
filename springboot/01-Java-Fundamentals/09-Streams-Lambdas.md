---
tags: [java, fundamentals, streams, lambdas, functional]
aliases: [Streams, Lambdas, Functional Java, Method References]
stage: foundation
---

# Streams and Lambdas

> [!info] For the Express/TS dev
> Java 8 added lambdas (`x -> x * 2`) and the **Stream API** (`.filter().map().collect(...)`). This is essentially `Array.prototype.map/filter/reduce` for Java, but **lazy** and **single-use**. You build a pipeline of operations on a `Stream<T>`, then a *terminal* operation (`collect`, `forEach`, `count`, `reduce`) executes it. Streams are not collections — you can't iterate twice without recreating.

## Concept

### Lambdas

```java
Function<Integer, Integer> dbl = x -> x * 2;
BiFunction<Integer, Integer, Integer> add = (a, b) -> a + b;

Runnable r = () -> System.out.println("hi");
Consumer<String> log = msg -> System.out.println("LOG " + msg);

// Multi-line — needs braces and explicit return
Function<Integer, String> classify = n -> {
    if (n < 0)  return "neg";
    if (n == 0) return "zero";
    return "pos";
};
```

A lambda's target type must be a [[05-Interfaces-Abstract-Classes|functional interface]] (one abstract method). The compiler matches the shape.

### Method references — `::`

```java
list.forEach(System.out::println);            // x -> System.out.println(x)
list.stream().map(String::toUpperCase);       // s -> s.toUpperCase()
list.stream().map(User::new);                 // constructor reference
list.sort(Comparator.comparing(User::getAge));
```

| Form                       | Equivalent lambda          |
| -------------------------- | -------------------------- |
| `ClassName::staticMethod`  | `x -> ClassName.staticMethod(x)` |
| `instance::method`         | `x -> instance.method(x)`  |
| `ClassName::instanceMethod`| `x -> x.method()`          |
| `ClassName::new`           | `() -> new ClassName()`    |

### Stream pipeline

```java
List<User> users = ...;

List<String> activeNames = users.stream()
    .filter(u -> u.isActive())
    .map(User::getName)
    .sorted()
    .toList();              // Java 16+ shortcut

int totalAge = users.stream()
    .filter(u -> u.isActive())
    .mapToInt(User::getAge)
    .sum();
```

Three stages:

1. **Source** — `collection.stream()`, `Stream.of(...)`, `Files.lines(path)`, `IntStream.range(0, 10)`.
2. **Intermediate** (lazy, return Stream) — `filter`, `map`, `flatMap`, `distinct`, `sorted`, `limit`, `skip`, `peek`.
3. **Terminal** (eager, return value or void) — `toList`, `collect`, `forEach`, `count`, `reduce`, `findFirst`, `anyMatch`.

### Common collectors

```java
import static java.util.stream.Collectors.*;

list.stream().collect(toList());                       // mutable list
list.stream().collect(toUnmodifiableList());           // immutable
list.stream().collect(toSet());
list.stream().collect(joining(", "));                  // -> "a, b, c"
list.stream().collect(groupingBy(User::getDept));
list.stream().collect(toMap(User::getId, u -> u));
list.stream().collect(partitioningBy(User::isActive));
list.stream().collect(summingDouble(Order::amount));
```

### Primitive streams

For numeric work, avoid boxing:

```java
IntStream.range(1, 11).sum();                          // 55
IntStream.rangeClosed(1, 10).average();                // OptionalDouble[5.5]
DoubleStream.of(1.0, 2.0, 3.0).max();
```

Convert object stream → primitive: `users.stream().mapToInt(User::getAge)`.
Convert back: `intStream.boxed()`.

### `flatMap` — flatten

```java
List<List<Integer>> nested = List.of(List.of(1,2), List.of(3,4));
nested.stream()
      .flatMap(List::stream)
      .toList();                          // [1, 2, 3, 4]
```

### Parallel streams (use sparingly)

```java
list.parallelStream().filter(...).reduce(...)
```

Only worthwhile for CPU-bound work on large collections; otherwise overhead outweighs gains. Don't use with shared mutable state.

## TypeScript ↔ Java comparison

| TypeScript / JS                                 | Java Stream                                |
| ----------------------------------------------- | ------------------------------------------ |
| `arr.map(x => x * 2)`                           | `s.map(x -> x * 2)`                        |
| `arr.filter(x => x > 0)`                        | `s.filter(x -> x > 0)`                     |
| `arr.reduce((a,b) => a+b, 0)`                   | `s.reduce(0, Integer::sum)`                |
| `arr.flatMap(...)`                              | `s.flatMap(...)`                           |
| `arr.find(...)`                                 | `s.filter(...).findFirst()` → `Optional`   |
| `arr.some(...)` / `arr.every(...)`              | `s.anyMatch(...)` / `s.allMatch(...)`      |
| `[...new Set(arr)]`                             | `s.distinct().toList()`                    |
| `arr.sort(cmp)`                                 | `s.sorted(comparator)`                     |
| `arr.slice(0, 5)`                               | `s.limit(5)`                               |
| `arr.join(", ")`                                | `s.collect(joining(", "))`                 |
| Eager — runs immediately                        | Lazy — needs terminal op                   |
| Reusable                                        | Single-use — one terminal op then done     |

## Code example

```java
package com.example.streams;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

public record Order(String customer, String product, double amount, LocalDate date) {}

public class Demo {
    public static void main(String[] args) {
        List<Order> orders = List.of(
            new Order("Alice", "Book",   12.50, LocalDate.of(2025, 1, 5)),
            new Order("Bob",   "Pen",     2.00, LocalDate.of(2025, 1, 6)),
            new Order("Alice", "Lamp",   45.00, LocalDate.of(2025, 1, 7)),
            new Order("Carol", "Book",   12.50, LocalDate.of(2025, 1, 8)),
            new Order("Bob",   "Lamp",   45.00, LocalDate.of(2025, 1, 8))
        );

        // Total revenue per customer, sorted desc
        var byCustomer = orders.stream()
            .collect(Collectors.groupingBy(
                Order::customer,
                Collectors.summingDouble(Order::amount)));

        byCustomer.entrySet().stream()
            .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
            .forEach(e -> System.out.printf("%s: $%.2f%n", e.getKey(), e.getValue()));

        // Top 3 most expensive orders
        var top3 = orders.stream()
            .sorted(Comparator.comparingDouble(Order::amount).reversed())
            .limit(3)
            .toList();

        // Distinct products
        Set<String> products = orders.stream()
            .map(Order::product)
            .collect(Collectors.toUnmodifiableSet());

        // Average order amount
        double avg = orders.stream()
            .mapToDouble(Order::amount)
            .average()
            .orElse(0.0);

        System.out.println(top3);
        System.out.println(products);
        System.out.println("avg = " + avg);
    }
}
```

## Gotchas

> [!warning] Streams are single-use
> ```java
> var s = list.stream();
> s.count();
> s.count();   // IllegalStateException — stream already consumed
> ```

> [!warning] No checked exceptions in lambdas
> See [[08-Exceptions]] — wrap in unchecked or write a helper.

> [!warning] Don't mutate from inside a stream
> Avoid `forEach` that modifies external state, especially in parallel. Use `collect`/`reduce` to *build* a result instead.

> [!warning] `Collectors.toMap` throws on duplicate keys
> Pass a merge function: `toMap(k, v, (a,b) -> a)` to keep first.

> [!tip] `toList()` (Java 16+) returns immutable
> Old `collect(Collectors.toList())` returned a mutable `ArrayList`; new `.toList()` returns immutable. Switch consciously.

> [!tip] Method references read better
> Prefer `User::getName` over `u -> u.getName()` once you've internalized the syntax.

## Related

- [[05-Interfaces-Abstract-Classes]]
- [[06-Generics]]
- [[07-Collections-Framework]]
- [[10-Optional]]
- [[11-Concurrency-Basics]]
