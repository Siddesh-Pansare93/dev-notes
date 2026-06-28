---
tags: [java, fundamentals, oop, inheritance, polymorphism]
aliases: [extends, super, Polymorphism, Method Overriding]
stage: foundation
---

# Inheritance and Polymorphism

> [!info] For the Express/TS dev
> Same idea as TS class inheritance, with stricter rules. **Single inheritance only** — a class can `extends` at most one parent, but can `implements` many [[05-Interfaces-Abstract-Classes|interfaces]]. Methods are **virtual by default** (the opposite of C++/C#); use `final` to lock them down. The `@Override` annotation isn't required but you should always use it.

## Concept

### `extends` and `super`

```java
public class Animal {
    protected final String name;

    public Animal(String name) { this.name = name; }

    public String speak() { return "..."; }

    @Override
    public String toString() { return "%s(%s)".formatted(getClass().getSimpleName(), name); }
}

public class Dog extends Animal {
    private final String breed;

    public Dog(String name, String breed) {
        super(name);                  // MUST be the first statement
        this.breed = breed;
    }

    @Override
    public String speak() { return "Woof"; }
}
```

`super(...)` calls the parent constructor and **must** be the first statement of a child constructor. If you don't write it, the compiler inserts `super()` (the no-arg parent ctor). If the parent has no no-arg constructor, you must call `super(...)` explicitly.

### Polymorphism

A reference of the parent type can hold any subtype, and method calls dispatch to the actual runtime type:

```java
Animal a = new Dog("Rex", "Lab");
System.out.println(a.speak());      // "Woof" — dynamic dispatch
```

### `instanceof` and pattern matching

```java
if (a instanceof Dog d) {           // Java 16+ pattern variable
    System.out.println(d.speak());  // d is typed as Dog inside the block
}
```

This is similar to a TS type guard `if (a instanceof Dog) { a /* narrowed */ }`.

### `final`, `abstract`, `sealed`

| Modifier on class    | Meaning                                          |
| -------------------- | ------------------------------------------------ |
| `final`              | Cannot be subclassed                             |
| `abstract`           | Cannot be instantiated; may have abstract methods |
| `sealed`             | Restricts which classes may extend it ([[13-Records-Sealed-Pattern-Matching\|sealed]]) |
| *(default)*          | Open for extension                               |

```java
public abstract class Shape {
    public abstract double area();        // no body — subclass must implement
    public String describe() { return "Shape with area=" + area(); }
}

public final class Circle extends Shape {
    private final double r;
    public Circle(double r) { this.r = r; }
    @Override public double area() { return Math.PI * r * r; }
}
```

### Method overriding rules

- Same name, **same or covariant return type**, same parameter types.
- Cannot reduce visibility (`public` parent → must stay `public` or wider).
- Cannot throw broader checked exceptions than parent.
- Use `@Override` — the compiler will catch mistakes (e.g. wrong signature, typo).

### Object methods to know

Every class extends `java.lang.Object`. Common methods to override:

- `toString()` — string representation (logging, debugging)
- `equals(Object)` — value equality
- `hashCode()` — must be consistent with equals
- `clone()` — rarely used, prefer copy constructors

## TypeScript ↔ Java comparison

| TypeScript                                | Java                                          |
| ----------------------------------------- | --------------------------------------------- |
| `class Dog extends Animal`                | `class Dog extends Animal`                    |
| `super()` in constructor                  | `super()` — must be first statement           |
| Multiple `implements` allowed             | Same                                          |
| Multiple `extends` (interface) allowed    | Class: single `extends` only                  |
| Methods virtual by default                | Same — but use `final` to lock                |
| `abstract class`                          | `abstract class`                              |
| `instanceof Dog` (narrows type)           | `obj instanceof Dog d` (Java 16+)             |
| `Object.prototype` chain                  | All classes extend `java.lang.Object`         |
| TS lacks `sealed`                         | `sealed class` (Java 17+)                     |

## Code example

```java
package com.example.payments;

public abstract class Payment {
    protected final double amount;
    public Payment(double amount) { this.amount = amount; }

    public abstract String process();          // template method

    public final String receipt() {            // can't be overridden
        return "Paid $%.2f via %s".formatted(amount, getClass().getSimpleName());
    }
}

public class CardPayment extends Payment {
    private final String last4;
    public CardPayment(double amount, String last4) {
        super(amount);
        this.last4 = last4;
    }
    @Override public String process() {
        return "charging card *%s for $%.2f".formatted(last4, amount);
    }
}

public class PaypalPayment extends Payment {
    private final String email;
    public PaypalPayment(double amount, String email) {
        super(amount);
        this.email = email;
    }
    @Override public String process() {
        return "paypal %s for $%.2f".formatted(email, amount);
    }
}

// Polymorphic use
public class Demo {
    public static void main(String[] args) {
        Payment[] payments = {
            new CardPayment(10.00, "4242"),
            new PaypalPayment(20.00, "a@b.com"),
        };
        for (Payment p : payments) {
            System.out.println(p.process());
            System.out.println(p.receipt());
        }
    }
}
```

## Gotchas

> [!warning] No multiple inheritance of state
> A class extends exactly one class. To compose behavior from multiple sources, use [[05-Interfaces-Abstract-Classes|interfaces]] (which can have `default` methods) or composition.

> [!warning] Constructors are not inherited
> If `Animal` has `Animal(String name)` and `Dog` adds nothing, you still need `Dog(String name) { super(name); }`. Constructors don't pass through.

> [!warning] Calling overridable methods from a constructor
> Inside a parent constructor, calling an overridable method runs the **child** version before the child has finished constructing. Bug magnet — don't do it. Mark such methods `final` or `private`.

> [!tip] Prefer composition over inheritance
> Spring strongly favors composition + [[05-Interfaces-Abstract-Classes|interfaces]] + [[04-Spring-Core/01-IoC-DI-Concepts|dependency injection]] over deep class hierarchies. Inheritance is for "is-a", composition for "has-a".

## Related

- [[03-OOP-Classes-Objects]]
- [[05-Interfaces-Abstract-Classes]]
- [[12-Annotations]]
- [[13-Records-Sealed-Pattern-Matching]]
