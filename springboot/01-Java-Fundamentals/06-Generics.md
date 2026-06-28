---
tags: [java, fundamentals, generics, types]
aliases: [Generics, Type Parameters, Wildcards]
stage: foundation
---

# Generics

> [!info] For the Express/TS dev
> Java generics look almost identical to TS generics — `List<User>`, `Map<String, Long>`, `<T extends Comparable<T>>`. The big difference: **type erasure**. At runtime the JVM does not know `T` — `List<String>` and `List<Integer>` are the same class. This is the same as TS (where types vanish at runtime), but unlike TS, Java tries hard to keep type-safety at compile time *and* needs workarounds (wildcards, `Class<T>` tokens) for runtime type info.

## Concept

### Generic class

```java
public class Box<T> {
    private T value;
    public Box(T value) { this.value = value; }
    public T get()              { return value; }
    public void set(T value)    { this.value = value; }
}

Box<String> b = new Box<>("hello");        // diamond <> infers
String s = b.get();
```

### Generic method

```java
public static <T> T firstNonNull(T a, T b) {
    return a != null ? a : b;
}

String x = firstNonNull(null, "default");
```

### Bounded type parameters

```java
public static <T extends Comparable<T>> T max(T a, T b) {
    return a.compareTo(b) > 0 ? a : b;
}
```

`T extends Foo` works just like TS `<T extends Foo>`. You can chain bounds: `<T extends Number & Comparable<T>>`.

### Wildcards (`?`) — the tricky part

Wildcards exist because `List<Dog>` is **not** a subtype of `List<Animal>` (generics are *invariant*).

| Wildcard      | Meaning                          | TS analog                  |
| ------------- | -------------------------------- | -------------------------- |
| `List<?>`     | unknown type — read-only         | `Array<unknown>`           |
| `List<? extends Animal>` | "producer": read-only Animal | `readonly Animal[]` (covariant) |
| `List<? super Dog>` | "consumer": write-only Dog | contravariant param        |

Mnemonic **PECS**: *Producer Extends, Consumer Super*.

```java
// reads from src (producer), writes to dst (consumer)
public static <T> void copy(List<? extends T> src, List<? super T> dst) {
    for (T t : src) dst.add(t);
}
```

### Type erasure

At runtime, `List<String>` is just `List`. Consequences:

- `obj instanceof List<String>` — **compile error**. Use `obj instanceof List<?>`.
- `new T()` — illegal. Pass a `Supplier<T>` or `Class<T>` token instead.
- `T[]` array creation — illegal. Use `(T[]) new Object[n]` with a warning, or use a `List<T>`.
- Two methods that differ only by type parameter (`foo(List<String>)` vs `foo(List<Integer>)`) cannot coexist — same erased signature.

```java
public class TypedRepo<T> {
    private final Class<T> type;        // runtime type token
    public TypedRepo(Class<T> type) { this.type = type; }
    public T parse(String json) { /* uses type for reflection */ return null; }
}

new TypedRepo<>(User.class);
```

### Generic interface

```java
public interface Mapper<A, B> {
    B map(A a);
}
```

Combined with [[05-Interfaces-Abstract-Classes|functional interfaces]], this is how `Function<T,R>`, `Predicate<T>`, etc. are declared.

## TypeScript ↔ Java comparison

| TypeScript                           | Java                                          |
| ------------------------------------ | --------------------------------------------- |
| `class Box<T> { value: T }`          | `class Box<T> { T value; }`                   |
| `<T extends Foo>`                    | `<T extends Foo>`                             |
| `Array<unknown>`                     | `List<?>`                                     |
| Covariant arrays `Animal[]` accepts `Dog[]` | Generics invariant; use `<? extends T>` |
| `keyof T`, mapped types, conditional types | Not available in Java                  |
| Types erased at runtime              | Same — but more painful (no `T[]`, no `new T()`) |
| `as const`                           | n/a                                           |

## Code example

```java
package com.example.generics;

import java.util.*;
import java.util.function.Function;

public class Result<T, E> {
    private final T value;
    private final E error;
    private Result(T v, E e) { this.value = v; this.error = e; }

    public static <T, E> Result<T, E> ok(T v)    { return new Result<>(v, null); }
    public static <T, E> Result<T, E> err(E e)   { return new Result<>(null, e); }

    public boolean isOk() { return error == null; }

    public <R> Result<R, E> map(Function<? super T, ? extends R> f) {
        return isOk() ? ok(f.apply(value)) : err(error);
    }

    @Override public String toString() {
        return isOk() ? "Ok(" + value + ")" : "Err(" + error + ")";
    }

    public static void main(String[] args) {
        Result<Integer, String> r = Result.ok(10);
        Result<String, String>  s = r.map(i -> "n=" + i);
        System.out.println(s);                // Ok(n=10)

        Result<Integer, String> bad = Result.err("nope");
        System.out.println(bad.map(i -> i * 2));   // Err(nope)
    }
}
```

## Gotchas

> [!warning] Cannot use primitives as type parameters
> `List<int>` is illegal. Use the boxed type `List<Integer>` (with autoboxing). Performance-sensitive code should reach for primitive streams (`IntStream`) — see [[09-Streams-Lambdas]].

> [!warning] Raw types — avoid them
> `List` (no `<>`) is a *raw type*, kept for backwards compatibility. Mixing raw + generic gives unchecked warnings and silently disables type-checking. Always parameterize: `List<String>`.

> [!warning] Arrays and generics don't mix
> ```java
> List<String>[] arr = new List<String>[10];   // compile error
> ```
> Use `List<List<String>>` instead, or `@SuppressWarnings("unchecked")` with a cast as a last resort.

> [!tip] Diamond `<>` infers from context
> `Map<String, List<User>> m = new HashMap<>();` — don't repeat the parameters.

> [!tip] Use `var` to avoid double-typing
> `var users = new ArrayList<User>();` instead of `ArrayList<User> users = new ArrayList<User>();`.

## Related

- [[02-Syntax-Basics]]
- [[05-Interfaces-Abstract-Classes]]
- [[07-Collections-Framework]]
- [[09-Streams-Lambdas]]
- [[10-Optional]]
