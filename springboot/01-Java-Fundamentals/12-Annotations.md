---
tags: [java, fundamentals, annotations, metadata]
aliases: [Annotations, @Override, Custom Annotations, Decorators]
stage: foundation
---

# Annotations

> [!info] For the Express/TS dev
> Annotations are Java's equivalent of TS **decorators** — but with a different mental model. They are pure **metadata** attached to classes/methods/fields/parameters. By themselves they do nothing. Something else (the compiler, a framework like Spring, or a code generator) reads them at compile-time or runtime via reflection and behaves accordingly. Spring is built almost entirely on annotations: `@RestController`, `@Autowired`, `@Transactional`.

## Concept

### Built-in annotations

| Annotation             | Effect                                                   |
| ---------------------- | -------------------------------------------------------- |
| `@Override`            | Compile error if not actually overriding a parent method |
| `@Deprecated`          | Warns callers; can include `since` / `forRemoval`        |
| `@SuppressWarnings`    | Tells compiler to shut up (`"unchecked"`, `"deprecation"`) |
| `@FunctionalInterface` | Compile error if interface has != 1 abstract method      |
| `@SafeVarargs`         | Suppresses warning on generic varargs                    |

```java
public class Cat extends Animal {
    @Override
    public String speak() { return "meow"; }

    @Deprecated(since = "2.0", forRemoval = true)
    public void purr() {}
}

@SuppressWarnings("unchecked")
List<String> raw = (List<String>) someRawList;
```

### Anatomy of an annotation

```java
import java.lang.annotation.*;

@Retention(RetentionPolicy.RUNTIME)        // available via reflection
@Target(ElementType.METHOD)                // can only annotate methods
public @interface Audited {
    String action();                       // required attribute
    String level() default "INFO";         // with default
}
```

Use:

```java
@Audited(action = "delete-user", level = "WARN")
public void deleteUser(long id) { ... }
```

### Retention policies

| Policy   | Lives until                          | Used by                   |
| -------- | ------------------------------------ | ------------------------- |
| `SOURCE` | thrown away after compile            | `@Override`, lint tools   |
| `CLASS`  | in `.class` file but not at runtime  | bytecode tools            |
| `RUNTIME`| visible via reflection at runtime    | Spring, Jackson, JPA      |

Most useful annotations are `RUNTIME`.

### Targets

`ElementType.TYPE`, `METHOD`, `FIELD`, `PARAMETER`, `CONSTRUCTOR`, `LOCAL_VARIABLE`, `ANNOTATION_TYPE`, `PACKAGE`, `TYPE_PARAMETER`, `TYPE_USE`, `MODULE`. List multiples: `@Target({TYPE, METHOD})`.

### Reading annotations via reflection

```java
Method m = Service.class.getMethod("deleteUser", long.class);
Audited a = m.getAnnotation(Audited.class);
if (a != null) {
    log.info("audit {} as {}", a.action(), a.level());
}
```

In practice you rarely write reflection code yourself — frameworks do it.

### Annotations in Spring

Almost everything you'll see is built on annotations:

```java
@RestController                            // mark as web controller
@RequestMapping("/api/users")
public class UserController {
    @Autowired                             // dependency injection
    private UserService service;

    @GetMapping("/{id}")
    public User get(@PathVariable long id) {
        return service.get(id);
    }

    @PostMapping
    @Transactional                         // wrap in DB transaction
    public User create(@Valid @RequestBody UserDto dto) {
        return service.create(dto);
    }
}
```

See [[REST-Controllers]], [[Spring-Beans]], [[Spring-Transactions]].

### Meta-annotations

You can stack annotations on annotations. Spring's `@RestController` is itself annotated with `@Controller` + `@ResponseBody`. Custom example:

```java
@Target(TYPE)
@Retention(RUNTIME)
@Service                                   // meta-annotation
@Transactional                             // meta-annotation
public @interface AppService {}
```

Now `@AppService` carries the behavior of both.

## TypeScript ↔ Java comparison

| TypeScript decorator                              | Java annotation                          |
| ------------------------------------------------- | ---------------------------------------- |
| `@Component()` (Angular)                          | `@Component` (Spring)                    |
| `@Injectable()`                                   | `@Service` / `@Component`                |
| Decorators run at class definition (mutate)       | Annotations are **passive** metadata     |
| Stage-3 / experimental in TS                      | First-class since Java 5                 |
| No retention model — always runtime               | Three retention policies                 |
| `Reflect.getMetadata`                             | `Method.getAnnotation(...)`              |
| Decorator factories `@Foo(args)`                  | `@Foo(arg = "x")`                        |

## Code example

```java
package com.example.audit;

import java.lang.annotation.*;
import java.lang.reflect.Method;

@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface Audited {
    String action();
    String level() default "INFO";
}

public class UserService {
    @Audited(action = "createUser")
    public void create(String name)       { System.out.println("creating " + name); }

    @Audited(action = "deleteUser", level = "WARN")
    public void delete(long id)           { System.out.println("deleting " + id); }

    public void unaudited()               { System.out.println("ignored"); }
}

// A simple "framework" that reads the metadata
public class AuditScanner {
    public static void scan(Class<?> cls) {
        for (Method m : cls.getDeclaredMethods()) {
            Audited a = m.getAnnotation(Audited.class);
            if (a != null) {
                System.out.printf("[%s] %s -> %s%n",
                    a.level(), m.getName(), a.action());
            }
        }
    }

    public static void main(String[] args) {
        scan(UserService.class);
        // [INFO] create -> createUser
        // [WARN] delete -> deleteUser
    }
}
```

## Gotchas

> [!warning] Annotations alone do nothing
> `@Transactional` on a plain class with no Spring context will be ignored. The framework must scan and apply behavior. This trips beginners up: "I added the annotation but nothing happened."

> [!warning] Self-invocation breaks AOP-based annotations
> Spring uses proxies. `this.someAnnotatedMethod()` from inside the same class **bypasses the proxy** — `@Transactional`/`@Async` won't trigger. Call via the injected bean instead.

> [!warning] Reflection has a runtime cost
> Heavy reflective scanning at request time hurts perf. Spring caches and warms up; if you write your own scanner, cache results.

> [!tip] Lombok = annotations that generate code
> [[Lombok]] is a compile-time annotation processor: `@Getter`, `@Setter`, `@Builder`, `@Data` synthesize boilerplate. You'll see it in many codebases — but [[13-Records-Sealed-Pattern-Matching|records]] and modern Java cover most of its use cases.

> [!tip] Validation annotations
> Bean Validation (`@NotNull`, `@Size`, `@Email`, `@Min`) integrates with Spring controllers via `@Valid`. See [[Validation]].

## Related

- [[03-OOP-Classes-Objects]]
- [[05-Interfaces-Abstract-Classes]]
- [[Spring-Beans]]
- [[REST-Controllers]]
- [[Validation]]
- [[Lombok]]
