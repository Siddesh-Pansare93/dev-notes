---
tags: [java, fundamentals, syntax, primitives]
aliases: [Java Syntax, Variables, Primitives, Control Flow]
stage: foundation
---

# Syntax Basics — Variables, Types, Operators, Control Flow

> [!info] For the Express/TS dev
> Java syntax looks like TypeScript with the type *before* the variable name and semicolons that aren't optional. The biggest mental shift: Java has **primitive types** (`int`, `double`, `boolean`) that are *not* objects, and **reference types** (every class) that are. There's no `undefined`; there is `null`, but only on reference types. Every program lives inside a class, and execution starts at `public static void main(String[] args)`.

## Concept

### Primitives vs reference types

| Primitive | Size     | Range / notes                |
| --------- | -------- | ---------------------------- |
| `byte`    | 8-bit    | -128 to 127                  |
| `short`   | 16-bit   |                              |
| `int`     | 32-bit   | the default integer          |
| `long`    | 64-bit   | suffix `L`: `1_000_000_000L` |
| `float`   | 32-bit   | suffix `f`: `3.14f`          |
| `double`  | 64-bit   | the default decimal          |
| `boolean` | 1-bit    | `true` / `false` only        |
| `char`    | 16-bit   | `'a'` (UTF-16 code unit)     |

Each primitive has a **boxed** wrapper: `Integer`, `Long`, `Double`, `Boolean`, `Character`. You need them in [[07-Collections-Framework|collections]] (you can't have `List<int>`, only `List<Integer>`).

### Variable declaration

```java
int count = 0;                        // explicit type
final double PI = 3.14159;            // immutable (like const)
var name = "Alice";                   // type inferred (Java 10+, locals only)
String greeting = "hello";            // String is a class, not a primitive
```

> [!note] `var` is not `any`
> Java's `var` is **inferred at compile time** like TS `const` without an annotation. It's not dynamic. Once the type is inferred, it's locked in.

### Operators

Mostly identical to TS: `+ - * / %`, `== != < > <= >=`, `&& || !`, `& | ^ ~ << >>`, ternary `cond ? a : b`. Key differences:

- **No `===`** — Java's `==` already compares primitives by value. For objects `==` compares *references* (identity), and `.equals()` compares value. **Always use `.equals()` for `String` and other objects.**
- Integer division truncates: `5 / 2 == 2`. Use `5.0 / 2` for `2.5`.
- `+` on a `String` and anything else converts to string: `"x=" + 42` → `"x=42"`.

### Control flow

```java
if (x > 0) { ... } else if (x == 0) { ... } else { ... }

for (int i = 0; i < 10; i++) { ... }
for (String s : list) { ... }                 // for-each
while (cond) { ... }
do { ... } while (cond);

// Modern switch expression (Java 14+)
String label = switch (status) {
    case ACTIVE, PENDING -> "open";
    case CLOSED          -> "done";
    default              -> "unknown";
};
```

### Strings

`String` is immutable. `+` builds a new string. For heavy concatenation in a loop use `StringBuilder`.

```java
String s = "hello";
String upper = s.toUpperCase();     // "HELLO"
boolean eq = s.equals("hello");     // true (use .equals, NOT ==)
String f = "x=%d, y=%s".formatted(1, "a");
String multi = """
    {
      "ok": true
    }
    """;                            // text block (Java 15+)
```

### Arrays

```java
int[] nums = {1, 2, 3};
int[] zeros = new int[5];           // [0, 0, 0, 0, 0]
nums.length;                        // 3 (field, not method)
nums[0] = 99;
```

Arrays are fixed-size. For dynamic lists use `ArrayList` — see [[07-Collections-Framework]].

## TypeScript ↔ Java comparison

| TypeScript                              | Java                                  |
| --------------------------------------- | ------------------------------------- |
| `let x: number = 1`                     | `int x = 1;`                          |
| `const PI = 3.14`                       | `final double PI = 3.14;`             |
| `null` and `undefined`                  | `null` only (on reference types)      |
| `===` value-and-type                    | `==` for primitives, `.equals()` for objects |
| `string`, `number`, `boolean`           | `String`, `int`/`double`, `boolean`   |
| array `[1,2,3]`                         | `int[] x = {1,2,3}` or `List.of(1,2,3)` |
| Template literals `` `x=${n}` ``        | `"x=%d".formatted(n)` or text blocks  |
| Top-level code allowed                  | Everything must be in a class         |
| `import { foo } from "./bar"`           | `import com.acme.Bar;`                |

## Code example

```java
package com.example.basics;

import java.util.List;

public class Demo {
    public static void main(String[] args) {
        // Variables
        var name = "world";
        final int year = 2025;

        // String formatting
        System.out.println("Hello, %s! Year=%d".formatted(name, year));

        // Loops
        var nums = List.of(1, 2, 3, 4, 5);
        int sum = 0;
        for (int n : nums) sum += n;
        System.out.println("sum = " + sum);

        // Switch expression
        String day = switch (java.time.LocalDate.now().getDayOfWeek()) {
            case SATURDAY, SUNDAY -> "weekend";
            default               -> "weekday";
        };
        System.out.println(day);

        // Equality gotcha
        String a = "foo";
        String b = new String("foo");
        System.out.println(a == b);          // false (different references!)
        System.out.println(a.equals(b));     // true
    }
}
```

## Gotchas

> [!warning] `==` on objects compares references
> ```java
> new String("hi") == new String("hi")   // false
> new String("hi").equals(new String("hi")) // true
> ```
> String literals get interned so `"hi" == "hi"` happens to be `true` — but never rely on it.

> [!warning] Integer overflow is silent
> `int` overflows wrap silently: `Integer.MAX_VALUE + 1` → `Integer.MIN_VALUE`. Use `Math.addExact` if you need to detect overflow, or use `long`.

> [!warning] `null` on primitives doesn't exist
> `int x = null;` won't compile. Only reference types are nullable. But auto-unboxing a `null` `Integer` into an `int` throws `NullPointerException`.

> [!tip] Use text blocks for multi-line strings
> Triple-quoted `"""` strings handle indentation and embedded JSON/SQL beautifully. They're the closest thing Java has to backtick template literals (no interpolation though — use `.formatted()`).

## Related

- [[01-JVM-JDK-JRE]]
- [[03-OOP-Classes-Objects]]
- [[07-Collections-Framework]]
- [[10-Optional]]
- [[13-Records-Sealed-Pattern-Matching]]
