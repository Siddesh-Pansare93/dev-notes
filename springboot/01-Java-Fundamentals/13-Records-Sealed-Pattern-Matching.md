---
tags: [java, fundamentals, records, sealed, pattern-matching, modern-java]
aliases: [Records, Sealed Classes, Pattern Matching, Java 17, Java 21]
stage: foundation
---

# Records, Sealed Classes, Pattern Matching

> [!info] For the Express/TS dev
> Modern Java (17/21) closes the gap with TS dramatically. **Records** are immutable data classes, like a `type User = { id: number; name: string }` plus auto-generated `equals`/`hashCode`/`toString`. **Sealed classes/interfaces** restrict who can extend them — equivalent to TS discriminated unions. **Pattern matching** lets `switch` and `instanceof` deconstruct values, like TS exhaustive `switch` on a tagged union. Together these let you write data-oriented code that feels closer to TS.

## Concept

### Records (Java 16+)

```java
public record User(long id, String name, String email) {}
```

That single line gives you:

- Final fields `id`, `name`, `email`
- A canonical constructor
- Accessor methods `id()`, `name()`, `email()` (note: no `get` prefix!)
- `equals` based on all fields
- `hashCode` based on all fields
- `toString()` like `User[id=1, name=Alice, email=a@b.com]`
- Implicitly `final` — cannot be subclassed

```java
var u = new User(1, "Alice", "a@b.com");
System.out.println(u.name());           // Alice
System.out.println(u);                  // User[id=1, name=Alice, email=a@b.com]
new User(1, "Alice", "a@b.com").equals(u);   // true
```

#### Compact constructor — validation

```java
public record Money(long cents, String currency) {
    public Money {                              // no parens — compact ctor
        if (cents < 0)        throw new IllegalArgumentException("cents < 0");
        if (currency == null) throw new IllegalArgumentException("currency null");
        currency = currency.toUpperCase();      // can normalize before assign
    }
}
```

Records can implement interfaces, declare static methods, and add extra (derived) methods, but cannot have instance fields beyond the components.

### Sealed classes / interfaces (Java 17+)

Restrict who can extend / implement:

```java
public sealed interface Shape permits Circle, Square, Triangle {}

public record Circle(double r)              implements Shape {}
public record Square(double side)           implements Shape {}
public record Triangle(double a, double b, double c) implements Shape {}
```

Subtypes must be:

- `final` (or a record), or
- another `sealed` (continuing the hierarchy), or
- `non-sealed` (re-opens for arbitrary extension)

This gives the compiler an **exhaustive list** of subtypes — enabling exhaustive pattern matching.

### Pattern matching for `instanceof` (Java 16+)

```java
if (obj instanceof User u) {
    System.out.println(u.name());        // u is typed as User in this branch
}
```

Replaces the old cast-after-check dance:

```java
// before
if (obj instanceof User) {
    User u = (User) obj;
    System.out.println(u.getName());
}
```

### Pattern matching for `switch` (Java 21)

Exhaustive, type-narrowing, deconstructing — all in one:

```java
double area = switch (shape) {
    case Circle(double r)         -> Math.PI * r * r;
    case Square(double s)         -> s * s;
    case Triangle(double a, double b, double c) -> heron(a, b, c);
};
```

Because `Shape` is `sealed`, the compiler verifies all cases are covered — no `default` needed. Add a new `Shape` subtype and every `switch` becomes a compile error until updated.

#### Guards

```java
String label = switch (shape) {
    case Circle c when c.r() > 100 -> "huge circle";
    case Circle c                  -> "circle";
    case Square s                  -> "square";
    case Triangle t                -> "triangle";
};
```

#### `null` cases

```java
return switch (input) {
    case null              -> "missing";
    case String s          -> "str: " + s;
    case Integer i         -> "int: " + i;
    default                -> "unknown";
};
```

### Combining records + sealed + switch — the killer combo

This is the modern Java equivalent of TS:

```typescript
type Result<T> = { kind: "ok"; value: T } | { kind: "err"; error: string };
function unwrap<T>(r: Result<T>): T {
    switch (r.kind) {
        case "ok":  return r.value;
        case "err": throw new Error(r.error);
    }
}
```

In Java 21:

```java
public sealed interface Result<T> permits Ok, Err {}
public record Ok<T>(T value)        implements Result<T> {}
public record Err<T>(String error)  implements Result<T> {}

public static <T> T unwrap(Result<T> r) {
    return switch (r) {
        case Ok<T>(T v)        -> v;
        case Err<T>(String e)  -> throw new RuntimeException(e);
    };
}
```

## TypeScript ↔ Java comparison

| TypeScript                                 | Java (17/21)                                  |
| ------------------------------------------ | --------------------------------------------- |
| `type User = { id: number; name: string }` | `record User(long id, String name) {}`        |
| `as const`                                 | record (auto-immutable)                        |
| `type X = A \| B \| C`                     | `sealed interface X permits A, B, C`          |
| Discriminated union + `kind` field         | sealed + `instanceof` / pattern switch        |
| `if ("foo" in obj) ...`                    | `if (obj instanceof Foo f) ...`               |
| Exhaustive switch (`never`)                | Exhaustive switch on sealed type (compile-checked) |
| Object destructuring in switch             | Record patterns `case Circle(var r)`          |
| Spread to copy `{ ...u, name: "X" }`       | Manual `with`-style: `new User(u.id(), "X")`  |

## Code example

```java
package com.example.modern;

public sealed interface Json permits JNull, JBool, JNum, JStr, JArr, JObj {}

public record JNull()                          implements Json {}
public record JBool(boolean v)                 implements Json {}
public record JNum(double n)                   implements Json {}
public record JStr(String s)                   implements Json {}
public record JArr(java.util.List<Json> items) implements Json {}
public record JObj(java.util.Map<String, Json> fields) implements Json {}

public class JsonPrinter {
    public static String print(Json j) {
        return switch (j) {
            case JNull()           -> "null";
            case JBool(boolean v)  -> Boolean.toString(v);
            case JNum(double n)    -> Double.toString(n);
            case JStr(String s)    -> "\"" + s.replace("\"", "\\\"") + "\"";
            case JArr(var items)   -> items.stream()
                                        .map(JsonPrinter::print)
                                        .collect(java.util.stream.Collectors.joining(",", "[", "]"));
            case JObj(var fs)      -> fs.entrySet().stream()
                                        .map(e -> "\"" + e.getKey() + "\":" + print(e.getValue()))
                                        .collect(java.util.stream.Collectors.joining(",", "{", "}"));
        };
        // No default needed — sealed + exhaustive
    }

    public static void main(String[] args) {
        Json j = new JObj(java.util.Map.of(
            "name", new JStr("Alice"),
            "age",  new JNum(30),
            "tags", new JArr(java.util.List.of(new JStr("a"), new JStr("b")))));
        System.out.println(print(j));
    }
}
```

## Gotchas

> [!warning] Records are shallowly immutable
> `record Box(List<String> items)` — the `items` field is `final` but the **list inside** can still be mutated. Use `List.copyOf(items)` in a compact constructor for true immutability.

> [!warning] Record accessors don't have `get` prefix
> `user.name()`, not `user.getName()`. Some frameworks (Jackson, Spring) understand this, but older bean-style code may not without configuration.

> [!warning] Records can't extend classes
> They implicitly extend `java.lang.Record`. They can implement interfaces.

> [!warning] Pattern matching evolved fast
> Java 16: `instanceof` patterns. Java 17: sealed. Java 19/20: preview record patterns. Java 21: stable record patterns + pattern switch. Make sure your project targets **Java 21**.

> [!tip] Records replace 80% of [[Lombok]]
> If you don't need mutability or JPA-style entities, use a record. Reach for Lombok or hand-written classes only when records can't fit (mutable entities, builder patterns).

## Related

- [[03-OOP-Classes-Objects]]
- [[04-Inheritance-Polymorphism]]
- [[05-Interfaces-Abstract-Classes]]
- [[09-Streams-Lambdas]]
- [[10-Optional]]
- [[Lombok]]
