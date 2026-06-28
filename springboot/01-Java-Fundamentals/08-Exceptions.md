---
tags: [java, fundamentals, exceptions, error-handling]
aliases: [Exceptions, try-catch, Checked Exceptions, try-with-resources]
stage: foundation
---

# Exceptions

> [!info] For the Express/TS dev
> In TS/Node every error is essentially a runtime `Error`; you handle them as you see fit. Java has **two flavors**: *checked* exceptions (must be declared with `throws` or caught — the compiler enforces it) and *unchecked* exceptions (RuntimeExceptions — like JS errors). Modern Java + Spring favor unchecked. The other big addition: **try-with-resources** for automatic resource cleanup, replacing manual `finally` blocks.

## Concept

### Hierarchy

```
Throwable
├── Error                    (JVM-level, do not catch — OutOfMemoryError, StackOverflowError)
└── Exception
    ├── RuntimeException     (UNCHECKED — NullPointerException, IllegalArgumentException, ...)
    └── (everything else)    (CHECKED — IOException, SQLException, ...)
```

- **Checked**: must be declared on the method (`throws IOException`) or caught. Compile-time enforced.
- **Unchecked** (`extends RuntimeException`): no compiler enforcement.

### `try / catch / finally`

```java
try {
    var data = Files.readString(Path.of("config.json"));
    process(data);
} catch (NoSuchFileException e) {
    log.warn("missing config, using defaults");
} catch (IOException e) {
    log.error("io failure", e);
    throw new RuntimeException(e);          // wrap & rethrow
} finally {
    cleanup();                              // always runs
}
```

Multi-catch:

```java
try { ... }
catch (IOException | SQLException e) {
    log.error("io/sql", e);
}
```

### `throws` clause

```java
public String load(Path p) throws IOException {     // checked — must declare
    return Files.readString(p);
}
```

`RuntimeException` subclasses don't need to be declared.

### Custom exceptions

```java
public class NotFoundException extends RuntimeException {     // unchecked
    public NotFoundException(String msg)             { super(msg); }
    public NotFoundException(String msg, Throwable e){ super(msg, e); }
}

throw new NotFoundException("user " + id);
```

In Spring, custom unchecked exceptions are the norm — see [[Spring-Exception-Handling]].

### try-with-resources

Anything that implements `AutoCloseable` is auto-closed when the block exits — even on exception. **Use this instead of finally for resources.**

```java
try (var in = Files.newBufferedReader(path);
     var out = Files.newBufferedWriter(other)) {
    String line;
    while ((line = in.readLine()) != null) out.write(line);
}   // in.close() and out.close() called automatically, even on exception
```

### Exception chaining

```java
try {
    db.query(...);
} catch (SQLException e) {
    throw new ServiceException("failed to load user", e);   // preserves cause
}
```

`e.getCause()` retrieves the original. Stack traces include the chain.

### Best practices

- Throw the most specific exception you can.
- Don't catch `Exception` or `Throwable` — too broad.
- Don't swallow exceptions: never write empty `catch { }`.
- Always log *with* the exception object so the stack trace is preserved.
- Prefer unchecked + a global handler ([[Spring-Exception-Handling|@ControllerAdvice]]).

## TypeScript ↔ Java comparison

| TypeScript / JS                          | Java                                          |
| ---------------------------------------- | --------------------------------------------- |
| `throw new Error("msg")`                 | `throw new RuntimeException("msg");`          |
| `try { } catch (e) { }`                  | `try { } catch (Exception e) { }`             |
| `try { } finally { }`                    | `try { } finally { }`                         |
| All errors are unchecked                 | Two kinds: checked + unchecked                |
| `using` statement (TC39 stage 3)         | `try (var r = ...)` since Java 7              |
| `class FooError extends Error`           | `class FooException extends RuntimeException` |
| `e.cause`                                | `e.getCause()` (also constructor arg)         |
| `Promise.reject(...)`                    | `CompletableFuture.failedFuture(ex)`          |

## Code example

```java
package com.example.errors;

import java.io.IOException;
import java.nio.file.*;
import java.util.List;

public class FileLoader {

    public static class LoadException extends RuntimeException {
        public LoadException(String msg, Throwable cause) { super(msg, cause); }
    }

    public List<String> load(String name) {
        Path p = Path.of(name);
        try {
            return Files.readAllLines(p);
        } catch (NoSuchFileException e) {
            return List.of();                     // soft default
        } catch (IOException e) {
            throw new LoadException("could not read " + name, e);
        }
    }

    public void copy(Path from, Path to) throws IOException {
        try (var in  = Files.newInputStream(from);
             var out = Files.newOutputStream(to)) {
            in.transferTo(out);
        }   // both streams closed automatically
    }

    public static void main(String[] args) {
        var loader = new FileLoader();
        try {
            loader.load("missing.txt").forEach(System.out::println);
            loader.load("/dev/full");             // simulated failure path
        } catch (LoadException e) {
            System.err.println(e.getMessage());
            System.err.println("caused by: " + e.getCause());
        }
    }
}
```

## Gotchas

> [!warning] `NullPointerException` is everywhere
> The most common Java runtime error. Mitigations: use [[10-Optional|Optional]] for return types, never return `null` from collections, validate inputs early. Java 14+ shows helpful NPE messages: `"Cannot invoke "User.getName()" because "user" is null"`.

> [!warning] Don't catch and ignore
> ```java
> try { ... } catch (Exception e) { }    // !! sin
> ```
> At minimum log it. Catching `InterruptedException` and not re-interrupting silently breaks thread cancellation.

> [!warning] Checked exceptions and lambdas don't mix
> Functional interfaces don't allow checked exceptions. You'll need to wrap:
> ```java
> list.stream().map(p -> {
>     try { return Files.readString(p); }
>     catch (IOException e) { throw new UncheckedIOException(e); }
> });
> ```

> [!tip] Spring translates exceptions
> Spring catches checked SQL/IO exceptions in its repositories and rethrows them as unchecked `DataAccessException`s, so your service layer stays clean. See [[Spring-Data-JPA]].

## Related

- [[03-OOP-Classes-Objects]]
- [[09-Streams-Lambdas]]
- [[10-Optional]]
- [[11-Concurrency-Basics]]
- [[Spring-Exception-Handling]]
