---
tags: [java, typescript, types, generics, comparison, foundation]
aliases: [Type System, Nominal vs Structural, Java Types]
stage: foundation
---

# Type System Differences: TS vs Java

> [!info] For the Express/TS dev
> TypeScript's type system is a *layer* on top of JavaScript that vanishes at runtime. Java's type system is the language — types exist at compile time, in the bytecode, and (mostly) at runtime via reflection. The biggest mental shifts: **nominal typing**, **no union types**, **type erasure**, and **declaration-site variance**.

## The fundamental split: structural vs nominal

> [!example] Same shape, different fate
> ```ts
> // TypeScript: structural — duck-typed at compile time
> interface Named { name: string }
> class Cat { name: string = "Felix" }
> const x: Named = new Cat(); // OK — Cat has the right shape
> ```
>
> ```java
> // Java: nominal — names matter
> interface Named { String getName(); }
> class Cat { public String getName() { return "Felix"; } } // does NOT implement Named
> Named x = new Cat(); // COMPILE ERROR — Cat doesn't declare `implements Named`
> ```

You must explicitly opt into an interface with `implements`. There is no "anonymous compatibility." The upside: refactor safety is excellent — renaming `Named` cannot accidentally widen or narrow another type.

## Primitives vs objects

Java has **eight primitive types** that are not objects: `byte`, `short`, `int`, `long`, `float`, `double`, `char`, `boolean`. Each has a boxed wrapper (`Integer`, `Long`, …).

| TS type       | Java primitive | Java boxed     | Notes                          |
| ------------- | -------------- | -------------- | ------------------------------ |
| `number`      | `int` / `long` / `double` | `Integer` / `Long` / `Double` | TS unifies; Java forces a choice |
| `bigint`      | `long` (64-bit) or `BigInteger` |          | Use `BigInteger` for unbounded |
| `boolean`     | `boolean`      | `Boolean`      |                                |
| `string`      | —              | `String`       | Always an object               |
| `null`/`undef`| —              | `null`         | Only one nullish value         |
| `Date`        | —              | `Instant` / `LocalDateTime` | Use `java.time.*` |

Primitives can't be `null`. Generics can only hold reference types — `List<int>` is illegal, you write `List<Integer>`. Auto-boxing handles conversion but allocates.

## No union types — what to do instead

TypeScript's `string | number` has no direct Java equivalent. Three workarounds:

### 1. Sealed interfaces (Java 17+) — the modern way

```ts
type Result<T> = { ok: true; value: T } | { ok: false; error: string };
```

```java
sealed interface Result<T> permits Ok, Err {}
record Ok<T>(T value) implements Result<T> {}
record Err<T>(String error) implements Result<T> {}

// Pattern matching — exhaustive, like TS narrowing
String describe(Result<Integer> r) {
    return switch (r) {
        case Ok<Integer>(Integer v) -> "got " + v;
        case Err<Integer>(String e) -> "err " + e;
    };
}
```

The compiler enforces exhaustiveness — if you add a new permitted subtype, every `switch` breaks at compile time. Same DX as TS discriminated unions.

### 2. Inheritance hierarchy (pre-Java 17)

```java
abstract class Shape {}
class Circle extends Shape { double radius; }
class Square extends Shape { double side; }
```

Open hierarchy — no exhaustiveness guarantee.

### 3. Object + instanceof (last resort)

```java
Object value = ...;
if (value instanceof String s) { /* use s */ }
else if (value instanceof Integer i) { /* use i */ }
```

Pattern matching with `instanceof` (Java 16+) makes this less painful, but you lose all compile-time safety. Avoid.

## Generics: the surprises

### Type erasure

Java generics are erased at runtime — the JVM sees `List`, not `List<String>`.

```ts
// TS: runtime guards possible (with care)
if (Array.isArray(x) && x.every(s => typeof s === 'string')) { /* List<string> */ }
```

```java
// Java: this WILL NOT compile
if (x instanceof List<String>) { } // ERROR

// You can only check the raw type
if (x instanceof List<?> list) { /* unknown element type */ }
```

Implications:
- You cannot create `new T[]` inside a generic class.
- Method overloads cannot differ only in generic parameters: `void foo(List<String>)` and `void foo(List<Integer>)` clash.
- Reflection on a `List` field tells you nothing about element type unless you inspect the *generic signature* metadata.

### Variance: declaration-site vs use-site

TypeScript uses **declaration-site variance** with `in`/`out`. Java uses **use-site variance** with `? extends` and `? super`.

```ts
interface Producer<out T> { produce(): T }
const animals: Producer<Animal> = new Producer<Dog>(); // covariant — OK
```

```java
// Java — same idea, but written at use-site
List<? extends Animal> animals = new ArrayList<Dog>();   // covariant — read-only
List<? super Dog> dogSink     = new ArrayList<Animal>(); // contravariant — write-only

// Mnemonic: PECS — Producer Extends, Consumer Super
```

Without wildcards, generics are **invariant**: `List<Dog>` is *not* a `List<Animal>`.

### Generic methods

```java
public static <T> T firstOrNull(List<T> list) {
    return list.isEmpty() ? null : list.get(0);
}
```

The `<T>` before the return type declares the type parameter. Same idea as TS `function firstOrNull<T>(list: T[]): T | null`.

## Null safety

Java has no compile-time null checking by default. Tools that approximate `strictNullChecks`:

- **`Optional<T>`** — return type for "may be absent." Don't use as a field.
- **`@Nullable` / `@NonNull`** — annotations from JSpecify, JetBrains, or Spring; checked by the IDE and tools like NullAway.
- **Records + Bean Validation** — `@NotNull String name` enforced at runtime on DTOs.

```ts
function findUser(id: string): User | null { ... }
```

```java
public Optional<User> findUser(String id) { ... }
// caller:
findUser(id).map(User::getEmail).orElse("none");
```

## TypeScript ↔ Java type comparison

| TS feature                   | Java equivalent                                       |
| ---------------------------- | ----------------------------------------------------- |
| `string \| number`           | `sealed interface` + records, or `Object`             |
| `Partial<T>`                 | Builder pattern, or separate DTO                      |
| `Readonly<T>`                | `record` (Java 16+) or `final` fields                 |
| `Pick<T, K>` / `Omit<T, K>`  | Hand-written DTO                                      |
| `keyof T`                    | Reflection — `Class<?>.getDeclaredFields()`           |
| `typeof someValue`           | `someValue.getClass()` — runtime `Class<?>`           |
| `T[]`                        | `T[]` (array) or `List<T>` (preferred)                |
| `Record<K,V>`                | `Map<K, V>`                                           |
| `enum Color { Red, Green }`  | `enum Color { RED, GREEN }` (more powerful in Java)   |
| `as const` literal types     | No equivalent — use `enum` or constants               |
| `unknown`                    | `Object` + cast                                       |
| `never`                      | No direct equivalent; methods return `Void` or throw  |
| Tuple `[string, number]`     | No — use a record or `Map.Entry`                      |

## Records vs interfaces vs classes

```java
// Record — immutable data carrier (Java 16+); like TS `type X = { ... }`
public record User(Long id, String name, String email) {}

// Interface — contract; like TS `interface`
public interface UserRepository {
    Optional<User> findById(Long id);
}

// Class — full mutable object with behaviour
public class UserService {
    private final UserRepository repo;
    public UserService(UserRepository repo) { this.repo = repo; }
}
```

Records auto-generate constructor, accessors (`user.name()`, not `getName()`), `equals`, `hashCode`, `toString`. Use them everywhere TS would use a `type` alias for an object shape — DTOs, value objects, API responses.

## Code example: full type-safe DSL

```java
sealed interface HttpResponse<T> permits Ok, NotFound, ServerError {}
record Ok<T>(T body) implements HttpResponse<T> {}
record NotFound<T>(String message) implements HttpResponse<T> {}
record ServerError<T>(Throwable cause) implements HttpResponse<T> {}

public <T> String render(HttpResponse<T> response) {
    return switch (response) {
        case Ok<T>(T body)            -> "200 " + body;
        case NotFound<T>(String msg)  -> "404 " + msg;
        case ServerError<T>(Throwable e) -> "500 " + e.getMessage();
    };
}
```

Compile-time exhaustive, immutable, pattern-matched. This is as close as Java gets to discriminated unions — and honestly, it's pretty close.

## Gotchas

> [!warning] Type-system traps
> - **`==` vs `.equals()`**: `==` on objects compares references. Always use `.equals()` for value equality. `Objects.equals(a, b)` is null-safe.
> - **Auto-boxing surprises**: `Integer a = 1000; Integer b = 1000; a == b` is `false` (cached only for `-128..127`).
> - **Generic arrays**: `new T[10]` and `new List<String>[10]` are illegal.
> - **Raw types**: `List` (no `<>`) compiles with warnings — never use; you lose all generic safety.
> - **Casting generics**: `(List<String>) someList` is an *unchecked* cast; the runtime cannot verify it.
> - **`Optional` as a field/parameter**: anti-pattern. Only use as a return type.

## Related

- [[01-Mental-Model-Map]]
- [[03-Async-Concurrency]]
- [[Records-and-Sealed-Classes]]
- [[Generics-Deep-Dive]]
- [[Optional-and-Null-Safety]]
