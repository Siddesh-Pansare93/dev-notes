---
tags: [java, fundamentals, packages, modules, classpath]
aliases: [Packages, Modules, JPMS, Imports, Classpath]
stage: foundation
---

# Packages and Modules

> [!info] For the Express/TS dev
> A Java **package** is the equivalent of a directory of related TS modules with a shared namespace prefix — like `com.acme.shop.orders`. There is no `import "./relative/path"`. Imports are **always by fully-qualified class name**, not by file path. The directory layout *must* mirror the package name. **Modules** (JPMS, Java 9+) are a higher-level grouping with explicit visibility — closer to a `package.json` `exports` field. Most app code ignores JPMS and just uses packages on the classpath.

## Concept

### Packages

```java
// File: src/main/java/com/example/shop/Order.java
package com.example.shop;

public class Order { ... }
```

The `package` declaration must match the directory: `src/main/java/com/example/shop/Order.java`. Convention: reverse-DNS of your org (`com.acme...`, `org.springframework...`).

### Imports

```java
package com.example.app;

import java.util.List;                       // single class
import java.util.*;                          // wildcard (avoid in prod code)
import static java.util.Collections.emptyList;  // static import
import com.example.shop.Order;

public class App {
    List<Order> orders = emptyList();
}
```

- Same-package imports are **automatic** — no need to import classes from `com.example.app`.
- `java.lang.*` is auto-imported (`String`, `Integer`, `Math`, `System`, `Thread`, ...).
- IDEs handle imports for you. Don't memorize them.

### Visibility recap

`public` classes are visible everywhere; package-private (no modifier) classes are visible only within the same package. Combined with class-member modifiers (see [[03-OOP-Classes-Objects]]) this gives you finer-grained encapsulation than TS exports do.

### Standard project layout (Maven/Gradle)

```
my-app/
├── pom.xml                      (or build.gradle)
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/example/app/
│   │   │       ├── Main.java
│   │   │       └── service/UserService.java
│   │   └── resources/           (config, static files)
│   │       └── application.yml
│   └── test/
│       └── java/
│           └── com/example/app/
│               └── service/UserServiceTest.java
└── target/                      (build output)
```

See [[Maven]] / [[Gradle]] for build details.

### Classpath

The **classpath** is the list of locations the JVM searches for classes — directories and `.jar` files. Build tools manage this for you. From the command line:

```bash
java -cp target/classes:lib/* com.example.app.Main
```

Modern apps usually run as a **fat jar** (Spring Boot bundles all deps): `java -jar app.jar`.

### Modules (JPMS, Java 9+)

A *module* declares its name, what it `requires`, and what packages it `exports`:

```java
// src/main/java/module-info.java
module com.example.app {
    requires java.sql;
    requires com.fasterxml.jackson.databind;

    exports com.example.app.api;          // visible to other modules
    // com.example.app.internal is hidden (NOT exported)
}
```

Benefits:
- Strong encapsulation — `internal` packages can't be `import`-ed externally even if `public`.
- Reliable configuration — missing dependencies fail at startup, not at runtime.
- `jlink` lets you build a custom slim JRE containing only the modules you need.

**Reality check**: Most Spring Boot apps **don't** use JPMS. They use the classpath. JPMS is more common in libraries (notably the JDK itself, which is fully modularized). Don't worry about `module-info.java` until you have a specific reason.

## TypeScript ↔ Java comparison

| TypeScript / Node                          | Java                                          |
| ------------------------------------------ | --------------------------------------------- |
| Files are modules                          | Files contain classes; package = directory    |
| `import { Foo } from "./foo"`              | `import com.acme.foo.Foo;`                    |
| Relative imports                           | No relative imports — fully qualified         |
| `export` / `export default`                | `public` modifier on class                    |
| `package.json` `exports`                   | `module-info.java` `exports`                  |
| `node_modules`                             | classpath / module path (jars)                |
| `tsconfig.json` `paths`                    | n/a — package = directory always              |
| Auto-import in IDE                         | Same                                          |
| Barrel files `index.ts`                    | No equivalent — import each class             |

## Code example

```java
// File: src/main/java/com/example/shop/model/Product.java
package com.example.shop.model;

public record Product(String sku, String name, double price) {}
```

```java
// File: src/main/java/com/example/shop/service/Catalog.java
package com.example.shop.service;

import com.example.shop.model.Product;
import java.util.*;

public class Catalog {
    private final Map<String, Product> store = new HashMap<>();

    public void add(Product p)               { store.put(p.sku(), p); }
    public Optional<Product> find(String s)  { return Optional.ofNullable(store.get(s)); }
    public Collection<Product> all()         { return store.values(); }
}
```

```java
// File: src/main/java/com/example/shop/Main.java
package com.example.shop;

import com.example.shop.model.Product;
import com.example.shop.service.Catalog;

public class Main {
    public static void main(String[] args) {
        var c = new Catalog();
        c.add(new Product("A1", "Apple", 1.50));
        c.add(new Product("B2", "Bread", 3.00));
        c.find("A1").ifPresent(System.out::println);
    }
}
```

Optional `module-info.java` for a JPMS-aware project:

```java
// File: src/main/java/module-info.java
module com.example.shop {
    requires java.base;                    // implicit, but for illustration
    exports com.example.shop;              // entry point for other modules
    exports com.example.shop.model;
    // shop.service is internal — not exported
}
```

## Gotchas

> [!warning] Package declaration MUST match folder
> If `Order.java` says `package com.example.shop;` but lives in `src/main/java/com/foo/`, it won't compile. Build tools enforce this rigidly.

> [!warning] Wildcard imports collide
> `import java.util.*; import java.sql.*;` will fail because both contain a `Date` class. Prefer single-class imports — IDEs make it painless.

> [!warning] No top-level functions or constants
> Everything is in a class. The closest you get to "module-level" is `public static final` fields and `public static` methods on a utility class:
> ```java
> public final class StringUtils {
>     private StringUtils() {}                   // prevent instantiation
>     public static String slugify(String s) { ... }
> }
> ```

> [!warning] `internal` packages
> If you ship a library, name internal packages with `internal` (e.g. `com.acme.shop.internal`) as a convention. Without JPMS, nothing actually prevents users from importing them — but tools like jdeps and IDEs respect the convention.

> [!tip] Use a [[Build-Tools|build tool]] from day one
> Manually managing classpaths is misery. [[Maven]] and [[Gradle]] handle dependencies, packaging, and execution for you. Spring Boot's [start.spring.io](https://start.spring.io) generates a working project in seconds.

## Related

- [[01-JVM-JDK-JRE]]
- [[03-OOP-Classes-Objects]]
- [[12-Annotations]]
- [[Maven]]
- [[Gradle]]
- [[Spring-Boot-Setup]]
