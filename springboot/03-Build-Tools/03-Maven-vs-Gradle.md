---
tags: [java, maven, gradle, build-tools, comparison, foundation]
aliases: [Maven vs Gradle, Choose Build Tool]
stage: foundation
---

# Maven vs Gradle

> [!info] For the Express/TS dev
> Both tools solve the same problem (dependency resolution + build orchestration) but with very different philosophies. **Pick Maven if your build is standard and you want predictability. Pick Gradle if you have unusual build steps or care about incremental-build performance.** New Spring Boot tutorials default to Maven; many large enterprise codebases use Gradle.

## TL;DR — when to pick which

| Scenario                                 | Recommendation                              |
| ---------------------------------------- | ------------------------------------------- |
| Solo project, learning Java              | **Maven** — fewer surprises                 |
| Spring Boot tutorial / sample app        | **Maven** — what start.spring.io defaults to |
| Library you'll publish to Maven Central  | **Maven** (or Gradle, both work)            |
| Monorepo with many modules               | **Gradle** — composite builds, build cache  |
| Custom code generation, multi-language   | **Gradle** — extensible task graph          |
| Android                                  | **Gradle** — only option                    |
| Build performance matters                | **Gradle** — incremental + cache            |
| Team already uses one                    | Whichever they use                          |

## Side-by-side: the same `pom.xml` and `build.gradle.kts`

### Maven

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.acme</groupId>
    <artifactId>my-app</artifactId>
    <version>1.0.0</version>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.3.4</version>
    </parent>
    <properties><java.version>21</java.version></properties>
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>
    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
```

### Gradle (Kotlin DSL)

```kotlin
plugins {
    java
    id("org.springframework.boot") version "3.3.4"
    id("io.spring.dependency-management") version "1.1.6"
}

group = "com.acme"
version = "1.0.0"

java { toolchain { languageVersion = JavaLanguageVersion.of(21) } }

repositories { mavenCentral() }

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
}

tasks.test { useJUnitPlatform() }
```

The Gradle file is ~½ the lines and is real code (autocomplete, refactor, conditionals). The Maven file is XML — verbose but uniform.

## Feature-by-feature comparison

| Aspect                   | Maven                             | Gradle                                     |
| ------------------------ | --------------------------------- | ------------------------------------------ |
| **Build file**           | `pom.xml` (XML)                   | `build.gradle.kts` (Kotlin) or `.gradle` (Groovy) |
| **Philosophy**           | Convention + declaration          | Programmable task graph                    |
| **Learning curve**       | Gentle                            | Steeper, especially when debugging         |
| **Performance (cold)**   | Comparable                        | Comparable                                 |
| **Performance (warm)**   | Re-runs everything                | Incremental, daemon, build cache → much faster |
| **IDE support**          | Excellent (IntelliJ/Eclipse/VSCode) | Excellent in IntelliJ; weaker elsewhere  |
| **Plugin ecosystem**     | Mature, stable                    | Larger, more diverse                       |
| **Custom build steps**   | Awkward (write a plugin)          | Natural — just write a task                |
| **Multi-module**         | Parent POM + `<modules>`          | `settings.gradle` + sub-projects           |
| **Composite builds**     | No                                | Yes (link multiple repos as one)           |
| **Build cache**          | No                                | Yes (local + remote)                       |
| **Lockfiles**            | Implicit (versions pinned in pom) | Opt-in via `dependencyLocking`             |
| **Reproducibility**      | High (XML is declarative)         | High if you avoid imperative tricks        |
| **Debugging a broken build** | Easier — fewer dynamic parts | Harder — could be config phase logic       |
| **DSL portability across IDEs** | Same XML everywhere        | Best in IntelliJ; Kotlin DSL ≠ Groovy DSL  |

## Dependency syntax side-by-side

```xml
<!-- Maven -->
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <scope>runtime</scope>
</dependency>
```

```kotlin
// Gradle Kotlin DSL
runtimeOnly("org.postgresql:postgresql")
```

```groovy
// Gradle Groovy DSL
runtimeOnly 'org.postgresql:postgresql'
```

## Common command translations

| Task                       | Maven                          | Gradle                              |
| -------------------------- | ------------------------------ | ----------------------------------- |
| Clean                      | `mvn clean`                    | `./gradlew clean`                   |
| Compile                    | `mvn compile`                  | `./gradlew compileJava`             |
| Run tests                  | `mvn test`                     | `./gradlew test`                    |
| Build artifact             | `mvn package`                  | `./gradlew build`                   |
| Run Spring Boot app        | `mvn spring-boot:run`          | `./gradlew bootRun`                 |
| Show dep tree              | `mvn dependency:tree`          | `./gradlew dependencies`            |
| Skip tests                 | `mvn package -DskipTests`      | `./gradlew build -x test`           |
| Run a single test          | `mvn test -Dtest=UserTest`     | `./gradlew test --tests UserTest`   |
| Install to local repo      | `mvn install`                  | `./gradlew publishToMavenLocal`     |

## Performance reality check

- **Cold build**: roughly equivalent. Both pay the same JVM startup cost.
- **Incremental build (no changes)**: Maven re-runs every plugin goal; Gradle skips unchanged tasks via the build cache → often **5–10× faster**.
- **Single-test re-run**: Gradle is dramatically faster on big projects.
- **CI**: Gradle's remote build cache lets multiple CI runs share results.

If you've been frustrated by `mvn clean install` taking minutes on a big monorepo, Gradle is the answer.

## Migration considerations

- **Maven → Gradle**: there's a `gradle init` mode that imports a `pom.xml`. The result is rough but a starting point.
- **Gradle → Maven**: harder; usually a rewrite. Anything dynamic in your Gradle script doesn't translate to XML.

## TypeScript ↔ Maven/Gradle comparison

| Aspect          | npm + scripts                   | Maven                          | Gradle                              |
| --------------- | ------------------------------- | ------------------------------ | ----------------------------------- |
| Style           | JSON + shell scripts            | XML, declarative               | Real code (Kotlin/Groovy)           |
| Caching         | None (unless turborepo/nx)      | None                           | First-class                         |
| Monorepo        | Workspaces                      | Multi-module                   | Composite builds                    |
| Performance     | Fast (small)                    | OK; reruns everything          | Fast (incremental + daemon + cache) |
| Conventions     | Loose                           | Very strict                    | Conventional but flexible           |

## Code example — choosing in `start.spring.io`

When generating a Spring Boot project at https://start.spring.io, the first radio button is **Project: Maven | Gradle - Kotlin | Gradle - Groovy**. For a beginner I'd pick:

1. **Maven** if you want zero-friction onboarding.
2. **Gradle - Kotlin** if you're already comfortable with build tools and care about speed.

Both produce identical applications. The choice is purely about the *build* file format, not the runtime.

## Gotchas

> [!warning] Common confusions
> - **Maven `compile` scope ≠ Gradle `compile` configuration** (the latter was removed). Use `implementation` in Gradle.
> - **Maven plugins vs Gradle plugins** — different ecosystems; the names occasionally collide (e.g., "spring-boot-maven-plugin" vs the Gradle Spring Boot plugin), and the configuration syntax differs entirely.
> - **`provided` scope**: in Gradle that's `compileOnly`, *not* a configuration named `provided` (without extra plugins).
> - **Maven version ranges** (`[1.0,2.0)`): legal but discouraged; in Gradle, prefer fixed versions or use a BOM ([[04-Dependency-Management]]).
> - **`./gradlew` vs `gradle`**: always use the wrapper. The wrapper version is committed; system Gradle may differ.
> - **Maven's `-pl` and Gradle's `:module:task`** look similar but behave subtly differently for transitive task selection.

## Related

- [[01-Maven-Basics]]
- [[02-Gradle-Basics]]
- [[04-Dependency-Management]]
- [[05-Multi-Module-Projects]]
- [[06-Common-Plugins]]
