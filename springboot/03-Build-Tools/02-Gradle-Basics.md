---
tags: [java, gradle, build-tools, kotlin-dsl, foundation]
aliases: [Gradle, build.gradle, Gradle Kotlin DSL]
stage: foundation
---

# Gradle Basics

> [!info] For the Express/TS dev
> Gradle is "Maven, but the build file is real code." Instead of XML you write Groovy or Kotlin DSL — closer to a `package.json` + custom scripts hybrid. It's faster (incremental builds, daemon, build cache) and more flexible than Maven, at the cost of being harder to reason about when things go wrong.

## Gradle vs Maven in one paragraph

Maven says "describe what you want and I'll do the standard build." Gradle says "configure a build graph; tasks depend on tasks; here's a programming language to do it in." If your build is standard, Maven is simpler. If you have custom steps (code generation, multi-language, custom packaging), Gradle wins. See [[03-Maven-vs-Gradle]].

## Project layout

Same as Maven (`src/main/java`, `src/test/java`) — Gradle uses the **Maven standard layout** by default. The build file goes at the root:

```
my-app/
├── build.gradle.kts          ← Kotlin DSL (recommended)  OR
├── build.gradle              ← Groovy DSL
├── settings.gradle.kts       ← project name, sub-projects
├── gradle/
│   └── wrapper/              ← committed; pins Gradle version
├── gradlew, gradlew.bat      ← wrapper scripts (always use these)
└── src/...
```

> [!tip] Always invoke Gradle via `./gradlew` (Linux/Mac) or `gradlew.bat` (Windows).
> The wrapper downloads the exact Gradle version the project needs, so contributors and CI don't need Gradle installed globally.

## Anatomy of `build.gradle.kts` (Kotlin DSL)

```kotlin
plugins {
    java
    id("org.springframework.boot") version "3.3.4"
    id("io.spring.dependency-management") version "1.1.6"
}

group = "com.acme"
version = "1.0.0-SNAPSHOT"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    runtimeOnly("org.postgresql:postgresql")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
}

tasks.test {
    useJUnitPlatform()
}
```

| Block        | Purpose                                              | Maven equivalent                |
| ------------ | ---------------------------------------------------- | ------------------------------- |
| `plugins`    | Apply plugins (Java support, Spring Boot, Kotlin…)   | `<build><plugins>` in pom       |
| `group`/`version` | Project coordinates                             | `<groupId>`/`<version>`         |
| `java`       | Java toolchain config                                | `<maven.compiler.release>`      |
| `repositories` | Where to fetch dependencies                        | (Maven Central is implicit)     |
| `dependencies` | Library dependencies                               | `<dependencies>`                |
| `tasks.<name>` | Configure a built-in task                          | Plugin `<configuration>` block  |

## Configurations (= Maven scopes)

| Gradle configuration       | Maven scope    | Meaning                                          |
| -------------------------- | -------------- | ------------------------------------------------ |
| `implementation`           | `compile`      | Default — used at compile + runtime              |
| `api`                      | `compile`      | Like `implementation` but also exposed to consumers (libraries only) |
| `compileOnly`              | `provided`     | Compile-time only, not packaged                  |
| `runtimeOnly`              | `runtime`      | Runtime only (e.g., JDBC drivers)                |
| `testImplementation`       | `test`         | Tests only                                       |
| `testRuntimeOnly`          | `test+runtime` | Test runtime (e.g., H2 database)                 |
| `annotationProcessor`      | (special)      | Annotation processors (Lombok, MapStruct)        |

> [!tip] Use `implementation` over `api` unless you're a library that *intentionally* re-exports a dependency. `implementation` keeps deps off downstream consumers' classpaths and speeds up incremental compiles.

## Tasks — the unit of work

Everything in Gradle is a **task**. `compileJava`, `test`, `bootJar`, `clean` — each is a task with inputs, outputs, and dependencies on other tasks.

```bash
./gradlew tasks                # list available tasks
./gradlew build                # compile + test + assemble
./gradlew bootRun              # Spring Boot run
./gradlew test --tests UserServiceTest
./gradlew dependencies         # full dep graph
./gradlew dependencyInsight --dependency jackson-databind
./gradlew clean build --no-daemon --rerun-tasks
```

### Lifecycle vs Maven

Gradle has **lifecycle tasks** that map roughly to Maven phases:

| Maven phase | Gradle task     |
| ----------- | --------------- |
| `clean`     | `clean`         |
| `compile`   | `compileJava`   |
| `test`      | `test`          |
| `package`   | `assemble` / `jar` / `bootJar` |
| `verify`    | `check`         |
| `install`   | `publishToMavenLocal` |
| `deploy`    | `publish`       |
| (all)       | `build` (= `assemble` + `check`) |

## Groovy DSL vs Kotlin DSL

The same build in Groovy:

```groovy
plugins {
    id 'java'
    id 'org.springframework.boot' version '3.3.4'
    id 'io.spring.dependency-management' version '1.1.6'
}

group = 'com.acme'
version = '1.0.0-SNAPSHOT'
sourceCompatibility = '21'

repositories { mavenCentral() }

dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-web'
    runtimeOnly 'org.postgresql:postgresql'
    testImplementation 'org.springframework.boot:spring-boot-starter-test'
}

tasks.named('test') { useJUnitPlatform() }
```

> [!tip] Pick **Kotlin DSL** for new projects.
> Static typing means autocomplete and refactor support in IntelliJ. Groovy DSL is older and you'll see it in legacy projects, but Kotlin is the future.

## Custom tasks

```kotlin
tasks.register("hello") {
    doLast {
        println("Hello from $project.name")
    }
}
```

```bash
./gradlew hello
```

You can wire ordering, inputs, outputs, and even chain tasks:

```kotlin
tasks.register<Copy>("copyConfig") {
    from("config")
    into(layout.buildDirectory.dir("dist/config"))
}

tasks.named("bootJar") {
    dependsOn("copyConfig")
}
```

## `settings.gradle.kts`

Declares the project name and any sub-projects:

```kotlin
rootProject.name = "billing-service"

include("api", "core", "infra")
```

For multi-module setups, see [[05-Multi-Module-Projects]].

## Build cache and daemon

Two killer features:

- **Daemon**: a long-running JVM that keeps Gradle hot — successive builds skip startup.
- **Build cache**: caches task outputs by hash of inputs. Local by default; can be remote (shared across CI).

Enable in `gradle.properties`:

```properties
org.gradle.daemon=true
org.gradle.caching=true
org.gradle.parallel=true
org.gradle.configureondemand=true
```

## TypeScript ↔ Gradle comparison

| Concept                | npm / TS                              | Gradle                                            |
| ---------------------- | ------------------------------------- | ------------------------------------------------- |
| Manifest               | `package.json`                        | `build.gradle(.kts)`                              |
| Scripts                | `"scripts": { "build": "tsc" }`       | `tasks.register("build") { ... }`                 |
| Lockfile               | `package-lock.json`                   | `gradle.lockfile` (opt-in via `dependencyLocking`)|
| Pinned tool version    | `engines.node`                        | `gradle/wrapper/gradle-wrapper.properties`        |
| Workspaces             | `workspaces`                          | `include("a", "b")` in `settings.gradle`          |
| Tasks DAG              | (sequential scripts)                  | First-class `dependsOn` / `mustRunAfter`          |
| Caching                | None native                           | Build cache (local + remote)                      |
| Daemon                 | None                                  | `org.gradle.daemon=true`                          |

## Code example — Gradle `build.gradle.kts` for a Spring Boot + JPA app

```kotlin
import org.springframework.boot.gradle.tasks.bundling.BootJar

plugins {
    java
    id("org.springframework.boot") version "3.3.4"
    id("io.spring.dependency-management") version "1.1.6"
    id("com.diffplug.spotless") version "6.25.0"
}

group = "com.acme"
version = "1.0.0-SNAPSHOT"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-validation")

    developmentOnly("org.springframework.boot:spring-boot-devtools")
    runtimeOnly("org.postgresql:postgresql")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.testcontainers:postgresql:1.20.1")
    testImplementation("org.testcontainers:junit-jupiter:1.20.1")
}

tasks.withType<Test> {
    useJUnitPlatform()
    systemProperty("spring.profiles.active", "test")
}

tasks.withType<BootJar> {
    archiveFileName.set("app.jar")
}

spotless {
    java {
        googleJavaFormat("1.22.0").aosp()
        removeUnusedImports()
        importOrder()
    }
}
```

## Gotchas

> [!warning] Gradle traps
> - **Configuration vs execution phase**: top-level code in `build.gradle` runs at *configuration* — every build, even for a single task. Heavy work belongs *inside* `doLast { }` or a registered task.
> - **`dependsOn` strings vs typed**: Kotlin DSL prefers `tasks.named("foo")` over string IDs — typos surface earlier.
> - **`compile` is gone**: use `implementation` (deprecated→removed in Gradle 7+).
> - **Snapshot resolution**: same trap as Maven — `SNAPSHOT` deps refresh daily.
> - **Build script classpath**: don't add app deps to the build itself; that's the `buildscript {}` or `plugins {}` block.
> - **Daemon memory**: long-running daemon can OOM on big projects; bump `org.gradle.jvmargs=-Xmx2g`.
> - **Don't commit `.gradle/`**: it's the local cache. `gradle/wrapper/` *is* committed.

## Related

- [[01-Maven-Basics]]
- [[03-Maven-vs-Gradle]]
- [[04-Dependency-Management]]
- [[05-Multi-Module-Projects]]
- [[06-Common-Plugins]]
