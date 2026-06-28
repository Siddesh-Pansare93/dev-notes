---
tags: [java, fundamentals, oop, interfaces, abstract]
aliases: [Interfaces, Abstract Classes, Default Methods]
stage: foundation
---

# Interfaces and Abstract Classes

> [!info] For the Express/TS dev
> A Java `interface` is far more powerful than a TS `interface`. It's a runtime construct: classes explicitly `implements` it, you can check `instanceof`, and since Java 8 interfaces can carry **default methods** (concrete code) and `static` methods. They're the backbone of Spring's dependency injection. Use **interface** when you only need a contract; use **abstract class** when you need a contract *plus* shared state or constructors.

## Concept

### Interface basics

```java
public interface Repository<T> {
    T findById(long id);            // implicitly public abstract
    List<T> findAll();
    void save(T entity);

    // default method — has a body, can be overridden
    default boolean existsById(long id) {
        return findById(id) != null;
    }

    // static method — utility on the interface
    static <T> Repository<T> empty() {
        return new Repository<>() {
            public T findById(long id) { return null; }
            public List<T> findAll() { return List.of(); }
            public void save(T e) { /* no-op */ }
        };
    }
}
```

A class implements one or more interfaces:

```java
public class UserRepository implements Repository<User>, AutoCloseable {
    public User findById(long id)    { /* ... */ }
    public List<User> findAll()      { /* ... */ }
    public void save(User u)         { /* ... */ }
    public void close()              { /* ... */ }
}
```

### Abstract class

Use when you want to share **state** (fields) or constructors. A class can extend at most one abstract class.

```java
public abstract class BaseService<T> {
    protected final Logger log = LoggerFactory.getLogger(getClass());
    protected final Repository<T> repo;

    protected BaseService(Repository<T> repo) { this.repo = repo; }

    public T get(long id) {
        log.info("loading {}", id);
        return repo.findById(id);
    }

    public abstract void validate(T t);   // subclass must implement
}
```

### Interface vs Abstract class — pick one

| Need...                                  | Use                  |
| ---------------------------------------- | -------------------- |
| Pure contract / multiple inheritance     | `interface`          |
| Shared fields, constructor logic         | `abstract class`     |
| Default behavior + multi-impl            | `interface` + `default` |
| Mark a capability (`Comparable`, `Closeable`) | `interface`     |
| Template method pattern                  | `abstract class`     |

In modern Java + Spring you'll write **interfaces** 90% of the time.

### Functional interfaces

An interface with **exactly one abstract method** is a *functional interface* and can be implemented with a [[09-Streams-Lambdas|lambda]]:

```java
@FunctionalInterface
public interface Mapper<A, B> {
    B map(A a);
}

Mapper<String, Integer> length = s -> s.length();
length.map("hello");    // 5
```

The standard library provides ready-made ones in `java.util.function`:

| Interface          | Method     | TS analog              |
| ------------------ | ---------- | ---------------------- |
| `Function<T,R>`    | `R apply(T)` | `(t: T) => R`        |
| `Predicate<T>`     | `boolean test(T)` | `(t: T) => boolean` |
| `Consumer<T>`      | `void accept(T)` | `(t: T) => void` |
| `Supplier<T>`      | `T get()`  | `() => T`              |
| `BiFunction<T,U,R>` | `R apply(T,U)` | `(t,u) => R`      |

### Sealed interfaces

Restrict who can implement (Java 17+):

```java
public sealed interface Result<T> permits Success, Failure {}
public record Success<T>(T value)   implements Result<T> {}
public record Failure<T>(String err) implements Result<T> {}
```

See [[13-Records-Sealed-Pattern-Matching]].

## TypeScript ↔ Java comparison

| TypeScript                          | Java                                       |
| ----------------------------------- | ------------------------------------------ |
| `interface Foo { x: number }`       | `interface Foo { int getX(); }`            |
| Structural typing (duck typing)     | Nominal typing — must `implements`         |
| Interfaces erased at runtime        | Interfaces are reified — `instanceof` works |
| Cannot have method bodies (until recently — still rare) | `default` methods have bodies |
| `type Mapper<A,B> = (a: A) => B`    | `@FunctionalInterface interface Mapper<A,B>` |
| Multiple `implements`               | Same                                       |
| `abstract class`                    | `abstract class`                           |

## Code example

```java
package com.example.notify;

import java.util.List;

public interface Notifier {
    void send(String to, String msg);

    default void broadcast(List<String> recipients, String msg) {
        recipients.forEach(r -> send(r, msg));
    }
}

public class EmailNotifier implements Notifier {
    public void send(String to, String msg) {
        System.out.println("EMAIL to " + to + ": " + msg);
    }
}

public class SmsNotifier implements Notifier {
    public void send(String to, String msg) {
        System.out.println("SMS to " + to + ": " + msg);
    }
}

// Polymorphic use — DI in disguise
public class AlertService {
    private final Notifier notifier;
    public AlertService(Notifier notifier) { this.notifier = notifier; }
    public void alert(String user) { notifier.send(user, "system alert!"); }
}

public class Demo {
    public static void main(String[] args) {
        var svc = new AlertService(new EmailNotifier());
        svc.alert("ops@acme.com");

        // Lambda for a functional interface
        Notifier noop = (to, msg) -> {};
        new AlertService(noop).alert("ignored");
    }
}
```

## Gotchas

> [!warning] Diamond problem with default methods
> If two interfaces define the same `default` method, the implementing class must override and explicitly choose: `Interface1.super.method();`.

> [!warning] All interface methods are public
> Even if you write nothing, methods are `public abstract`. You can't have package-private interface methods (you can have `private` helpers as of Java 9, used only by `default` methods).

> [!warning] Don't put state in interfaces
> Fields in interfaces are implicitly `public static final` — they're constants, not instance state. Use an abstract class if you need state.

> [!tip] Spring's bread and butter
> [[Spring-Beans|Spring beans]] are typically wired by *interface* type. You write `interface UserService`, an `@Service` impl, and inject `UserService` everywhere. This is what makes Spring testable — swap in a mock impl. See [[Spring-Dependency-Injection]].

## Related

- [[04-Inheritance-Polymorphism]]
- [[06-Generics]]
- [[09-Streams-Lambdas]]
- [[13-Records-Sealed-Pattern-Matching]]
- [[Spring-Beans]]
- [[Spring-Dependency-Injection]]
