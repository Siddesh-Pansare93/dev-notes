---
tags: [java, maven, gradle, dependencies, bom, dependency-management, intermediate]
aliases: [BOM, dependencyManagement, Transitive Dependencies]
stage: intermediate
---

# Dependency Management: BOMs, `dependencyManagement`, Transitives

> [!info] For the Express/TS dev
> npm has lockfiles to pin transitive versions. Maven and Gradle take a different approach: a **BOM** (Bill of Materials) declares "use these specific versions for this family of libraries," and `<dependencyManagement>` controls versions across modules. Mastering this is the difference between "the Spring app builds reproducibly forever" and "the build broke because Jackson upgraded."

## The transitive dependency problem

You add `spring-boot-starter-web`. That pulls in:

```
spring-boot-starter-web
├── spring-boot-starter
├── spring-boot-starter-json
│   └── jackson-databind
│       └── jackson-core
│       └── jackson-annotations
├── spring-boot-starter-tomcat
│   └── tomcat-embed-core
└── spring-web
    └── spring-core
```

You wrote one line. You got 30+ JARs on your classpath. Now imagine two of your dependencies need *different versions* of `jackson-databind`. What happens?

## How conflicts get resolved

| Tool   | Default conflict resolution                                    |
| ------ | -------------------------------------------------------------- |
| Maven  | **Nearest wins** — the dependency closest to the root of the dep tree. |
| Gradle | **Highest version wins** — the highest semver satisfying constraints. |

Both are fragile. The right answer is to **pin the version explicitly** via a BOM or `dependencyManagement`.

## BOM — Bill of Materials

A BOM is a special POM (`<packaging>pom</packaging>`) that declares versions for a *family* of related artifacts but doesn't add anything to your classpath itself. Spring Boot's `spring-boot-dependencies` BOM pins ~250 libraries (Jackson, Tomcat, Hibernate, JUnit, …) to versions known to work together.

### Maven — importing a BOM

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-dependencies</artifactId>
            <version>3.3.4</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>

<dependencies>
    <!-- No <version> needed — comes from the BOM -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>com.fasterxml.jackson.core</groupId>
        <artifactId>jackson-databind</artifactId>
    </dependency>
</dependencies>
```

> [!tip] If you `<parent>` `spring-boot-starter-parent`, you already get the BOM imported plus opinionated plugin config. If you can't (e.g., your company has its own parent), use the `<scope>import</scope>` pattern above.

### Gradle — importing a BOM

```kotlin
// Option A — use the Spring dependency-management plugin (auto-imports the BOM)
plugins {
    id("org.springframework.boot") version "3.3.4"
    id("io.spring.dependency-management") version "1.1.6"
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")  // no version
}
```

```kotlin
// Option B — Gradle native BOM support (no plugin needed)
dependencies {
    implementation(platform("org.springframework.boot:spring-boot-dependencies:3.3.4"))
    implementation("org.springframework.boot:spring-boot-starter-web")
}
```

`platform()` is the Gradle equivalent of `<scope>import</scope>`. `enforcedPlatform()` makes the versions strict (cannot be overridden).

## `dependencyManagement` — version control without forcing inclusion

`<dependencies>` adds a dependency *and* its version. `<dependencyManagement>` only controls the version *if* something declares the dep. Useful in parent POMs:

```xml
<!-- parent pom -->
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>com.fasterxml.jackson.core</groupId>
            <artifactId>jackson-databind</artifactId>
            <version>2.17.2</version>
        </dependency>
    </dependencies>
</dependencyManagement>
```

```xml
<!-- child pom: uses jackson but doesn't repeat the version -->
<dependencies>
    <dependency>
        <groupId>com.fasterxml.jackson.core</groupId>
        <artifactId>jackson-databind</artifactId>
    </dependency>
</dependencies>
```

This is how multi-module projects ([[05-Multi-Module-Projects]]) keep versions consistent.

## Inspecting the dep tree

```bash
# Maven
mvn dependency:tree
mvn dependency:tree -Dincludes=com.fasterxml.jackson    # filter
mvn dependency:tree -Dverbose                           # show conflicts

# Gradle
./gradlew dependencies
./gradlew dependencies --configuration runtimeClasspath
./gradlew dependencyInsight --dependency jackson-databind
```

Output excerpt:

```
[INFO] +- org.springframework.boot:spring-boot-starter-web:jar:3.3.4
[INFO] |  +- org.springframework.boot:spring-boot-starter-json:jar:3.3.4
[INFO] |  |  +- com.fasterxml.jackson.core:jackson-databind:jar:2.17.2
[INFO] |  |  |  +- com.fasterxml.jackson.core:jackson-annotations:jar:2.17.2
[INFO] |  |  |  \- com.fasterxml.jackson.core:jackson-core:jar:2.17.2
```

## Excluding transitives

Sometimes a dep brings in a logger you don't want, or an old version of something:

```xml
<dependency>
    <groupId>org.apache.kafka</groupId>
    <artifactId>kafka-clients</artifactId>
    <version>3.7.0</version>
    <exclusions>
        <exclusion>
            <groupId>org.slf4j</groupId>
            <artifactId>slf4j-log4j12</artifactId>
        </exclusion>
    </exclusions>
</dependency>
```

```kotlin
// Gradle
dependencies {
    implementation("org.apache.kafka:kafka-clients:3.7.0") {
        exclude(group = "org.slf4j", module = "slf4j-log4j12")
    }
}
```

## Forcing a version

When you must override a transitive:

```xml
<!-- Maven: declare it directly in <dependencies> with the version you want -->
<dependency>
    <groupId>com.fasterxml.jackson.core</groupId>
    <artifactId>jackson-databind</artifactId>
    <version>2.17.3</version>
</dependency>
```

```kotlin
// Gradle
dependencies {
    implementation("com.fasterxml.jackson.core:jackson-databind") {
        version { strictly("2.17.3") }
    }
}

// Or globally:
configurations.all {
    resolutionStrategy.force("com.fasterxml.jackson.core:jackson-databind:2.17.3")
}
```

## Common useful BOMs

| BOM                                              | What it covers                          |
| ------------------------------------------------ | --------------------------------------- |
| `org.springframework.boot:spring-boot-dependencies` | All Spring Boot starters + their world |
| `org.springframework.cloud:spring-cloud-dependencies` | Spring Cloud (Gateway, Config, etc.) |
| `com.fasterxml.jackson:jackson-bom`              | All Jackson modules in lockstep         |
| `io.netty:netty-bom`                             | Netty                                   |
| `org.junit:junit-bom`                            | JUnit Jupiter modules                   |
| `org.testcontainers:testcontainers-bom`          | Testcontainers modules                  |

> [!example] Multi-BOM imports
> ```xml
> <dependencyManagement>
>     <dependencies>
>         <dependency>
>             <groupId>org.springframework.boot</groupId>
>             <artifactId>spring-boot-dependencies</artifactId>
>             <version>3.3.4</version>
>             <type>pom</type><scope>import</scope>
>         </dependency>
>         <dependency>
>             <groupId>org.testcontainers</groupId>
>             <artifactId>testcontainers-bom</artifactId>
>             <version>1.20.1</version>
>             <type>pom</type><scope>import</scope>
>         </dependency>
>     </dependencies>
> </dependencyManagement>
> ```

## Lockfiles (optional but recommended)

Maven Central artifacts are immutable, so versions in your `pom.xml` already pin transitives — *as long as* the resolution graph is deterministic. For belt-and-braces:

- **Maven**: `flatten-maven-plugin` or commit `mvn dependency:resolve -Dmaven.repo.local=...` outputs to CI.
- **Gradle**: `dependencyLocking` writes `gradle.lockfile` per configuration.

```kotlin
dependencyLocking {
    lockAllConfigurations()
}
```

```bash
./gradlew dependencies --write-locks
```

Commit the resulting `gradle.lockfile`. Now any drift fails the build.

## TypeScript ↔ Java dep management comparison

| Concept                  | npm                         | Maven / Gradle                                |
| ------------------------ | --------------------------- | --------------------------------------------- |
| Pin transitives          | `package-lock.json`         | BOM + (optionally) lockfile                   |
| Override transitive      | `overrides` in package.json | Declare directly + `dependencyManagement`     |
| Exclude transitive       | (no easy way)               | `<exclusions>` / `exclude` block              |
| Inspect tree             | `npm ls`                    | `mvn dependency:tree` / `./gradlew dependencies` |
| Family-of-libs versioning| (manual)                    | BOM (one file pins many)                      |
| Reproducible builds      | Lockfile                    | Pinned versions + immutable Maven Central     |

## Code example — clean BOM-driven setup

```xml
<project>
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.acme</groupId>
    <artifactId>orders</artifactId>
    <version>1.0.0</version>

    <properties>
        <java.version>21</java.version>
        <spring-boot.version>3.3.4</spring-boot.version>
        <testcontainers.version>1.20.1</testcontainers.version>
    </properties>

    <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-dependencies</artifactId>
                <version>${spring-boot.version}</version>
                <type>pom</type><scope>import</scope>
            </dependency>
            <dependency>
                <groupId>org.testcontainers</groupId>
                <artifactId>testcontainers-bom</artifactId>
                <version>${testcontainers.version}</version>
                <type>pom</type><scope>import</scope>
            </dependency>
        </dependencies>
    </dependencyManagement>

    <dependencies>
        <!-- All versions resolved from BOMs above -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.testcontainers</groupId>
            <artifactId>postgresql</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>
</project>
```

## Gotchas

> [!warning] Dep-management traps
> - **Mixing BOM versions**: importing two BOMs that disagree on a third library — Maven picks one (the first declared), and you may not notice until runtime.
> - **`dependencyManagement` only sets version**, not scope or exclusions. Repeat those at the dep site.
> - **`spring-boot-starter-parent` vs BOM import**: the parent gives you BOM + plugin config + Java version + properties. The BOM-only approach gives you versions but you configure plugins yourself.
> - **`SNAPSHOT` deps drift**: re-resolution daily. Reproducible builds need release versions.
> - **Multi-module override**: declaring a version in a child POM *silently overrides* the parent's `dependencyManagement` for that module — surprising in code review.
> - **Gradle resolution strategy is per-configuration**; `force` on `runtimeClasspath` doesn't affect `compileClasspath` unless you scope `configurations.all`.

## Related

- [[01-Maven-Basics]]
- [[02-Gradle-Basics]]
- [[03-Maven-vs-Gradle]]
- [[05-Multi-Module-Projects]]
- [[Spring-Boot-Starters]]
