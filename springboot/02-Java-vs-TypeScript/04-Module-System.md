---
tags: [java, typescript, modules, packages, maven, npm, foundation]
aliases: [Java Modules, Packages vs Modules, npm vs Maven]
stage: foundation
---

# Module System: npm vs Maven Coordinates, Packages vs Modules

> [!info] For the Express/TS dev
> "Module" means very different things in the two ecosystems. In Node, a module is a single file. In Java, the unit of *namespacing* is a **package** (a folder), and the unit of *distribution* is an **artifact** (a JAR). Java also has a third concept — the **JPMS module** (Java 9+) — which most application code happily ignores.

## Three layers of "modularity" in Java

| Layer        | Java concept       | What it actually is                              | TS analogue           |
| ------------ | ------------------ | ------------------------------------------------ | --------------------- |
| Compilation unit | `.java` file   | One source file, one public class                | `.ts` file            |
| Namespace    | **Package**        | Folder hierarchy reflected in `package` keyword  | Folder + relative imports |
| Distribution | **Artifact (JAR)** | A zipped collection of `.class` files            | npm package           |
| Strong encapsulation | **JPMS module** | A `module-info.java` declaring exports/requires | (no analogue)        |

For 95% of Spring Boot work, you care about **packages** and **artifacts**. Treat JPMS as advanced material until you ship a public library.

## Packages — the namespacing layer

A **package** is the directory path of a Java source file, declared at the top of the file.

```java
// File: src/main/java/com/acme/billing/InvoiceService.java
package com.acme.billing;

import com.acme.users.User;          // import a single class
import com.acme.users.*;             // import all public types in package
import static java.util.Objects.requireNonNull;  // static import

public class InvoiceService { ... }
```

> [!warning] Folder and `package` MUST match
> If the file is at `com/acme/billing/InvoiceService.java`, the declaration *must* be `package com.acme.billing;`. The compiler enforces this.

### Convention: reverse-DNS naming

Packages start with the reversed domain you control: `com.acme.*`, `io.github.username.*`, `org.springframework.*`. This avoids collisions because there is **no global registry** of package names — Maven Central registers *artifacts*, not packages.

### Visibility modifiers

Java has four access levels (TypeScript has three):

| Modifier         | Visible from                                  | TS approximation         |
| ---------------- | --------------------------------------------- | ------------------------ |
| `public`         | Everywhere                                    | `export` (public)        |
| `protected`      | Same package + subclasses                     | `protected`              |
| *(no modifier)*  | **Same package only** ("package-private")     | (no equivalent)          |
| `private`        | Same class                                    | `private`                |

Package-private is Java's most underused feature — use it for "internal to this module's folder, not part of the public API of my library."

## Artifacts — the distribution layer

A library is shipped as a **JAR** (Java ARchive — a zip of `.class` files). Each JAR has a unique **Maven coordinate**:

```
groupId : artifactId : version
```

| Coordinate part | Example                       | npm equivalent                     |
| --------------- | ----------------------------- | ---------------------------------- |
| `groupId`       | `org.springframework.boot`    | npm scope (`@org/...`)             |
| `artifactId`    | `spring-boot-starter-web`     | package name                       |
| `version`       | `3.3.4`                       | version                            |
| Combined        | `org.springframework.boot:spring-boot-starter-web:3.3.4` | `@org/foo@1.0.0` |

A coordinate uniquely identifies a JAR in **Maven Central** (the npmjs.com of Java).

### A package and an artifact are NOT the same

This is the single biggest source of confusion. One artifact contains many packages.

```
spring-boot-starter-web (artifact)
├── org.springframework.boot.autoconfigure.web
├── org.springframework.web.servlet
├── org.springframework.http
└── ...
```

You declare the *artifact* in `pom.xml`, then `import` from any *package* it provides.

### Maven coordinate ↔ npm package map

| What                    | Maven                                                         | npm                            |
| ----------------------- | ------------------------------------------------------------- | ------------------------------ |
| Web server starter      | `org.springframework.boot:spring-boot-starter-web`            | `express`                      |
| Validation              | `org.springframework.boot:spring-boot-starter-validation`     | `zod`                          |
| Logging                 | (transitive via boot starters)                                | `pino`                         |
| HTTP client             | `org.springframework:spring-web`                              | `axios`                        |
| Test framework          | `org.springframework.boot:spring-boot-starter-test`           | `jest`                         |
| JSON                    | `com.fasterxml.jackson.core:jackson-databind`                 | (built-in)                     |
| ORM                     | `org.springframework.boot:spring-boot-starter-data-jpa`       | `prisma`                       |

## Imports

Java imports refer to **fully-qualified class names**, not filesystem paths.

```ts
// TS — relative file path
import { InvoiceService } from '../billing/invoice-service';
import { z } from 'zod';
```

```java
// Java — fully qualified class
import com.acme.billing.InvoiceService;
import jakarta.validation.constraints.NotNull;
```

Same package = no import needed. `java.lang.*` is auto-imported (`String`, `Integer`, `Object`, `Thread`).

### No default exports, no re-exports, no namespace imports

Java has no equivalent of `export default`, `export *`, or `import * as X from 'y'`. Each public type is independently importable.

## File-and-class rules

> [!warning] Strict rules — TS does not have these
> 1. A `public` class **must** live in a file with the same name (`InvoiceService` → `InvoiceService.java`).
> 2. At most **one public class per file**.
> 3. Package-private classes can share a file (rare).
> 4. The first non-comment line is the `package` declaration.

## JPMS — Java Platform Module System (Java 9+)

A heavier layer on top of packages. A module is declared by a `module-info.java` file at the source root:

```java
// src/main/java/module-info.java
module com.acme.billing {
    requires com.acme.users;            // depend on another module
    requires java.sql;
    requires spring.context;

    exports com.acme.billing;           // public API
    exports com.acme.billing.api to com.acme.web;   // qualified export
    opens   com.acme.billing.entity to org.hibernate;  // for reflection
}
```

Why most apps don't bother:
- Spring's classpath scanning depends on reflection — JPMS makes that awkward.
- It's stricter encapsulation than typical apps need.
- Most libraries on Maven Central are not modular yet.

When you *do* care: shipping a library, building a `jlink`'d native image, or strict architecture enforcement.

## Local "modules" — multi-module Maven projects

For a monorepo, use a Maven multi-module project. See [[05-Multi-Module-Projects]] for full treatment.

```
my-app/
├── pom.xml              ← parent (packaging = pom)
├── billing/
│   ├── pom.xml
│   └── src/main/java/com/acme/billing/...
├── users/
│   ├── pom.xml
│   └── src/main/java/com/acme/users/...
└── web/
    ├── pom.xml
    └── src/main/java/com/acme/web/...
```

Roughly equivalent to pnpm workspaces — children depend on each other by Maven coordinate.

## TypeScript ↔ Java module comparison

| Aspect                       | TypeScript / Node                   | Java                                            |
| ---------------------------- | ----------------------------------- | ----------------------------------------------- |
| Unit of source               | One file = one module               | One file (with package decl); package = folder  |
| Distribution unit            | npm package                         | Maven artifact (JAR)                            |
| Naming                       | `@scope/package`                    | `groupId:artifactId`                            |
| Registry                     | npmjs.com                           | Maven Central, JitPack, GitHub Packages         |
| Import style                 | Path-based                          | Fully-qualified class name                      |
| Default export               | `export default`                    | None                                            |
| Re-export                    | `export *`                          | None                                            |
| Wildcard import              | `import * as X`                     | `import pkg.*` (only one level)                 |
| Public API enforcement       | Conventions / `package.json` exports| `public`/`protected`/package-private + JPMS    |
| Local cross-package deps     | pnpm workspaces                     | Multi-module Maven / Gradle composite builds    |
| Tree-shaking                 | Bundler-driven                      | None — JAR ships all classes                    |

## Code example — package + import + visibility

```java
// File: src/main/java/com/acme/billing/Invoice.java
package com.acme.billing;

import java.math.BigDecimal;
import java.time.Instant;

public record Invoice(Long id, BigDecimal amount, Instant issuedAt) {}
```

```java
// File: src/main/java/com/acme/billing/InvoiceRepository.java
package com.acme.billing;

import java.util.Optional;

// package-private — only visible inside com.acme.billing
interface InvoiceRepository {
    Optional<Invoice> findById(Long id);
}
```

```java
// File: src/main/java/com/acme/web/InvoiceController.java
package com.acme.web;

import com.acme.billing.Invoice;            // public — OK
// import com.acme.billing.InvoiceRepository;  // ERROR — package-private

public class InvoiceController { ... }
```

## Gotchas

> [!warning] Module-system traps
> - **Folder name ≠ artifactId**: the `pom.xml` declares the artifactId; the folder name is just convention.
> - **Two classes with the same simple name from different packages**: you can only import one — fully-qualify the other inline (`com.other.Foo other = ...`).
> - **Circular package imports**: legal in Java (unlike modules in some bundlers), but a smell.
> - **Splitting a package across JARs**: forbidden under JPMS, allowed on the classpath but causes split-package warnings.
> - **Fat JARs and shading**: a Spring Boot fat JAR contains all dependency JARs nested. Custom classloader handles it. Don't try to `unzip` and run the inner JARs directly.
> - **`java.*` packages are reserved** — never put your code in a `java.` namespace.

## Related

- [[01-Mental-Model-Map]]
- [[01-Maven-Basics]]
- [[05-Multi-Module-Projects]]
- [[Spring-Component-Scanning]]
