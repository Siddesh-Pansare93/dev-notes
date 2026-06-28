---
tags: [java, fundamentals, optional, null]
aliases: [Optional, Maybe, Null Safety]
stage: foundation
---

# Optional

> [!info] For the Express/TS dev
> TypeScript handles "maybe a value" with `T | undefined` plus optional chaining `?.` and nullish coalescing `??`. Java doesn't have union types, so since Java 8 we wrap "maybe-present" return values in `Optional<T>`. Think of `Optional<T>` as a small functional container with two states (`empty` / `of(value)`) — closer to Rust's `Option<T>` or Haskell's `Maybe`. **Use `Optional` for return types only.** Never as a field, parameter, or in collections.

## Concept

### Creating

```java
Optional<String> a = Optional.of("hello");          // value, NPE if null
Optional<String> b = Optional.ofNullable(maybeNull);// safe — empty if null
Optional<String> c = Optional.empty();              // explicit empty
```

### Querying

```java
opt.isPresent();              // true/false
opt.isEmpty();                // Java 11+
opt.get();                    // unwrap — throws NoSuchElementException if empty
opt.orElse("default");        // value or fallback
opt.orElseGet(() -> compute());  // lazy fallback
opt.orElseThrow();            // unwrap or NoSuchElementException
opt.orElseThrow(() -> new NotFoundException("user"));
```

### Functional style — preferred

```java
Optional<User> user = repo.findById(id);

// Transform
Optional<String> name = user.map(User::getName);

// Chain (when the function itself returns Optional)
Optional<Address> addr = user.flatMap(User::findAddress);

// Conditional consume
user.ifPresent(u -> log.info("found {}", u));
user.ifPresentOrElse(
    u -> log.info("found {}", u),
    () -> log.warn("missing"));

// Filter
Optional<User> active = user.filter(User::isActive);

// Default to another Optional (Java 9+)
Optional<User> anyUser = user.or(() -> repo.findDefault());
```

### Combining with [[09-Streams-Lambdas|streams]]

```java
List<User> found = ids.stream()
    .map(repo::findById)              // Stream<Optional<User>>
    .flatMap(Optional::stream)        // unwraps + drops empties
    .toList();
```

## TypeScript ↔ Java comparison

| TypeScript                              | Java                                          |
| --------------------------------------- | --------------------------------------------- |
| `string \| undefined`                   | `Optional<String>`                            |
| `user?.name`                            | `user.map(User::getName)`                     |
| `user?.address?.zip`                    | `user.flatMap(User::getAddress).map(Address::getZip)` |
| `user ?? defaultUser`                   | `user.orElse(defaultUser)`                    |
| `user ?? makeDefault()`                 | `user.orElseGet(() -> makeDefault())`         |
| `if (user) { ... }`                     | `user.ifPresent(u -> ...)`                    |
| `as NonNull<...>`                       | `opt.orElseThrow()`                           |
| `value!`                                | `opt.get()` (avoid)                           |

## Code example

```java
package com.example.opt;

import java.util.*;

public record User(long id, String name, Optional<String> email) {
    // Convenience factory
    public static User of(long id, String name, String email) {
        return new User(id, name, Optional.ofNullable(email));
    }
}

public class UserService {
    private final Map<Long, User> store = new HashMap<>();

    public Optional<User> findById(long id) {
        return Optional.ofNullable(store.get(id));
    }

    public User getOrThrow(long id) {
        return findById(id)
            .orElseThrow(() -> new NoSuchElementException("user " + id));
    }

    public String displayName(long id) {
        return findById(id)
            .map(User::name)
            .map(String::toUpperCase)
            .orElse("UNKNOWN");
    }

    public String emailFor(long id) {
        return findById(id)
            .flatMap(User::email)            // Optional<Optional<...>> flattened
            .orElse("no-reply@example.com");
    }

    public static void main(String[] args) {
        var svc = new UserService();
        svc.store.put(1L, User.of(1, "Alice", "a@b.com"));
        svc.store.put(2L, User.of(2, "Bob",   null));

        System.out.println(svc.displayName(1));   // ALICE
        System.out.println(svc.displayName(99));  // UNKNOWN
        System.out.println(svc.emailFor(2));       // no-reply@example.com
    }
}
```

## Gotchas

> [!warning] Don't use `Optional` for fields
> ```java
> private Optional<String> middleName;  // NO
> private String middleName;            // OK — can be null internally
> ```
> `Optional` isn't `Serializable` (well, it is now, but the JDK team explicitly designed it for return values). Use it as a *return type* to communicate "may be absent".

> [!warning] Don't put `Optional` in collections
> `List<Optional<User>>` is an anti-pattern. Filter the empties out and store `List<User>`.

> [!warning] `.get()` is a code smell
> Calling `.get()` without first checking `.isPresent()` defeats the purpose. Prefer `orElse` / `orElseThrow` / `map` / `ifPresent`.

> [!warning] Spring repositories
> [[Spring-Data-JPA|Spring Data]] returns `Optional<T>` from `findById`. Embrace it — don't unwrap immediately.

> [!tip] `Optional.stream()`
> Java 9+ lets you use `Optional` in stream pipelines naturally:
> ```java
> users.stream()
>      .map(User::email)
>      .flatMap(Optional::stream)   // drops empties, unwraps presents
>      .toList();
> ```

## Related

- [[02-Syntax-Basics]]
- [[08-Exceptions]]
- [[09-Streams-Lambdas]]
- [[Spring-Data-JPA]]
