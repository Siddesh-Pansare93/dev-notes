---
tags: [java, fundamentals, oop, classes]
aliases: [Classes, Objects, Constructors, OOP]
stage: foundation
---

# OOP — Classes, Objects, Constructors

> [!info] For the Express/TS dev
> If you've used TypeScript classes, you already know 80% of this. Java differs in three ways: (1) **everything is in a class** — no top-level functions, (2) **fields default to package-private**, not `public` like TS, and (3) constructors don't use the `constructor` keyword — they're methods named after the class. Method overloading exists; there are no default parameter values, you overload instead.

## Concept

### Anatomy of a class

```java
package com.example.shop;

public class Product {
    // Fields (instance state)
    private final String sku;            // immutable after construction
    private String name;
    private double price;

    // Constructor — same name as class, no return type
    public Product(String sku, String name, double price) {
        this.sku = sku;
        this.name = name;
        this.price = price;
    }

    // Getters/setters
    public String getSku()     { return sku; }
    public String getName()    { return name; }
    public double getPrice()   { return price; }
    public void setPrice(double price) { this.price = price; }

    // Behaviour
    public double priceWithTax(double rate) {
        return price * (1 + rate);
    }

    // Override Object.toString — handy for logging
    @Override
    public String toString() {
        return "Product[%s, %s, $%.2f]".formatted(sku, name, price);
    }
}
```

```java
Product p = new Product("ABC-1", "Widget", 9.99);
System.out.println(p.priceWithTax(0.10));   // 10.989
```

### Access modifiers

| Modifier            | Visible from                          |
| ------------------- | ------------------------------------- |
| `public`            | anywhere                              |
| `protected`         | same package + subclasses             |
| *(none)* "package-private" | same package only              |
| `private`           | same class only                       |

**Default is package-private.** This catches TS devs out — leaving the modifier off is *not* the same as `public`.

### `this` and `null`

`this` always refers to the current instance. Unlike JS, `this` is never lost when you pass a method around — Java method references capture the receiver. There is no `bind()`/`call()`/`apply()`.

### Static members

```java
public class MathUtil {
    public static final double PI = 3.14159;     // static constant
    public static int square(int x) { return x * x; }
}

MathUtil.square(5);
```

`static` = belongs to the class, not an instance. Equivalent to a TS `static` member or a module-level export.

### Constructor overloading & `this(...)`

No default parameter values — overload instead. Use `this(...)` to chain.

```java
public class User {
    private final String name;
    private final int age;

    public User(String name)            { this(name, 0); }
    public User(String name, int age)   {
        this.name = name;
        this.age  = age;
    }
}
```

### `equals` and `hashCode`

If you put your object in a `HashMap` or `HashSet`, you must override **both** `equals` and `hashCode` (or the collection will use reference identity). IDEs auto-generate these, but [[13-Records-Sealed-Pattern-Matching|records]] do it for you for free.

```java
@Override
public boolean equals(Object o) {
    if (this == o) return true;
    if (!(o instanceof Product p)) return false;
    return sku.equals(p.sku);
}

@Override
public int hashCode() { return sku.hashCode(); }
```

### Object lifecycle

`new Product(...)` allocates on the heap. There is no `delete` — the [[01-JVM-JDK-JRE|JVM]] garbage collector reclaims unreachable objects. No `destructor`; for cleanup of resources see [[08-Exceptions|try-with-resources]].

## TypeScript ↔ Java comparison

| TypeScript                                  | Java                                       |
| ------------------------------------------- | ------------------------------------------ |
| `class Foo { constructor(...) {} }`         | `public class Foo { public Foo(...) {} }`  |
| `private name: string`                      | `private String name;`                     |
| `readonly id`                               | `final String id`                          |
| Default param `x = 0`                       | Constructor overloading + `this(...)`      |
| `static foo()`                              | `public static Foo foo()`                  |
| `obj.method.bind(obj)`                      | Not needed — `this` is bound               |
| `JSON.stringify(obj)`                       | `obj.toString()` (you must override it)    |
| `Object.is(a, b)`                           | `a == b` (reference) / `a.equals(b)`        |
| TS interfaces                                | [[05-Interfaces-Abstract-Classes]]         |
| Plain object literal `{ a: 1 }`             | No equivalent — make a [[13-Records-Sealed-Pattern-Matching\|record]] |

## Code example

```java
package com.example.shop;

import java.util.ArrayList;
import java.util.List;

public class Order {
    private final long id;
    private final List<Product> items = new ArrayList<>();
    private Status status = Status.OPEN;

    public Order(long id) { this.id = id; }

    public void add(Product p) {
        if (status != Status.OPEN)
            throw new IllegalStateException("order is " + status);
        items.add(p);
    }

    public double total() {
        return items.stream().mapToDouble(Product::getPrice).sum();
    }

    public void close() { this.status = Status.CLOSED; }

    public enum Status { OPEN, CLOSED, CANCELLED }

    public static void main(String[] args) {
        var o = new Order(1);
        o.add(new Product("A", "Apple", 1.50));
        o.add(new Product("B", "Bread", 3.00));
        System.out.println("total = " + o.total());      // 4.5
    }
}
```

## Gotchas

> [!warning] Forgetting `this.`
> If a parameter shadows a field (`public Product(String name)`), you **must** write `this.name = name;`. Otherwise you assign the parameter to itself.

> [!warning] No properties, only methods
> Java has no `get`/`set` accessors built into the language. Convention: `getX()` / `setX()`. Frameworks like Spring/Jackson rely on this convention. [[Lombok]] can generate them; [[13-Records-Sealed-Pattern-Matching|records]] make them automatic for value types.

> [!warning] One public top-level class per file
> If `Order` is `public`, the file must be `Order.java`. You can declare more non-public classes in the same file but it's rarely a good idea.

> [!tip] Prefer immutability
> Make fields `final` and skip setters when you can. Spring + JPA encourage rich domain objects, but pure value types should be records.

## Related

- [[02-Syntax-Basics]]
- [[04-Inheritance-Polymorphism]]
- [[05-Interfaces-Abstract-Classes]]
- [[13-Records-Sealed-Pattern-Matching]]
- [[Lombok]]
