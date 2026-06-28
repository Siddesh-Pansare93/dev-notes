---
tags: [java, maven, gradle, multi-module, monorepo, intermediate]
aliases: [Multi-Module, Monorepo, Parent POM]
stage: intermediate
---

# Multi-Module Projects

> [!info] For the Express/TS dev
> "Multi-module" is the Java equivalent of pnpm/yarn workspaces or an Nx monorepo. One repo, multiple buildable artifacts, shared versions, internal cross-references. Maven calls them **modules**, Gradle calls them **sub-projects**, but the layout and intent are identical.

## When to reach for it

- One repo produces multiple deployables (web app + worker + admin tool).
- Shared `domain` / `common` / `proto` libraries that several services depend on.
- You want enforced architectural layers (e.g., `web` cannot import from `infra`).
- You ship a library + sample app + tests as separate artifacts.

For a single Spring Boot service, **don't** start with multiple modules. Single-module is simpler and refactoring later is easy.

## Layout

```
my-platform/
├── pom.xml                        ← parent (packaging=pom)
├── common/
│   ├── pom.xml
│   └── src/main/java/com/acme/common/...
├── billing-domain/
│   ├── pom.xml
│   └── src/main/java/com/acme/billing/...
├── billing-api/                   ← Spring Boot app
│   ├── pom.xml
│   └── src/main/java/com/acme/billing/api/...
└── orders-api/                    ← another Spring Boot app
    ├── pom.xml
    └── src/main/java/com/acme/orders/...
```

The parent `pom.xml` aggregates the modules and declares shared config; each child has its own `pom.xml`.

## Parent POM (Maven)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
    <modelVersion>4.0.0</modelVersion>

    <groupId>com.acme</groupId>
    <artifactId>my-platform</artifactId>
    <version>1.0.0-SNAPSHOT</version>
    <packaging>pom</packaging>      <!-- not jar -->

    <modules>
        <module>common</module>
        <module>billing-domain</module>
        <module>billing-api</module>
        <module>orders-api</module>
    </modules>

    <properties>
        <java.version>21</java.version>
        <spring-boot.version>3.3.4</spring-boot.version>
    </properties>

    <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-dependencies</artifactId>
                <version>${spring-boot.version}</version>
                <type>pom</type><scope>import</scope>
            </dependency>
            <!-- Internal modules — pin to project version -->
            <dependency>
                <groupId>com.acme</groupId>
                <artifactId>common</artifactId>
                <version>${project.version}</version>
            </dependency>
            <dependency>
                <groupId>com.acme</groupId>
                <artifactId>billing-domain</artifactId>
                <version>${project.version}</version>
            </dependency>
        </dependencies>
    </dependencyManagement>

    <build>
        <pluginManagement>
            <plugins>
                <plugin>
                    <groupId>org.springframework.boot</groupId>
                    <artifactId>spring-boot-maven-plugin</artifactId>
                    <version>${spring-boot.version}</version>
                </plugin>
            </plugins>
        </pluginManagement>
    </build>
</project>
```

## Child POM

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>com.acme</groupId>
        <artifactId>my-platform</artifactId>
        <version>1.0.0-SNAPSHOT</version>
    </parent>

    <artifactId>billing-api</artifactId>
    <packaging>jar</packaging>

    <dependencies>
        <dependency>
            <groupId>com.acme</groupId>
            <artifactId>billing-domain</artifactId>      <!-- internal! -->
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
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

The internal dep `com.acme:billing-domain` resolves to the *sibling* module — Maven detects it during the reactor build and doesn't go to Maven Central.

## Building a multi-module project

```bash
mvn clean install                         # build everything in dep order
mvn -pl billing-api -am install           # build billing-api + everything it depends on
mvn -pl billing-api -am -amd install      # ... and modules that depend on billing-api
mvn -T 4 install                          # 4-thread parallel build
mvn -pl billing-api install -DskipTests   # skip tests in just one module
```

> [!tip] `-pl` (project list) and `-am` (also make) are your friends.
> CI can build only the modules touched by a PR — figure out which modules changed (`git diff --name-only`), pass them to `-pl`, and Maven figures out the rest.

## Gradle multi-module

### `settings.gradle.kts`

```kotlin
rootProject.name = "my-platform"

include("common")
include("billing-domain")
include("billing-api")
include("orders-api")
```

### Root `build.gradle.kts`

```kotlin
plugins {
    java
    id("io.spring.dependency-management") version "1.1.6" apply false
    id("org.springframework.boot") version "3.3.4" apply false
}

allprojects {
    group = "com.acme"
    version = "1.0.0-SNAPSHOT"
    repositories { mavenCentral() }
}

subprojects {
    apply(plugin = "java")
    apply(plugin = "io.spring.dependency-management")

    java { toolchain { languageVersion = JavaLanguageVersion.of(21) } }

    dependencyManagement {
        imports {
            mavenBom("org.springframework.boot:spring-boot-dependencies:3.3.4")
        }
    }

    tasks.withType<Test> { useJUnitPlatform() }
}
```

### Child `build.gradle.kts` (`billing-api`)

```kotlin
plugins {
    id("org.springframework.boot")
    id("io.spring.dependency-management")
}

dependencies {
    implementation(project(":billing-domain"))   // internal cross-ref
    implementation(project(":common"))
    implementation("org.springframework.boot:spring-boot-starter-web")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
}
```

```bash
./gradlew :billing-api:bootRun
./gradlew build                       # build all
./gradlew :billing-api:build          # one module + its deps
./gradlew :billing-api:dependencies
```

## Layered architecture enforcement

A common multi-module pattern enforces clean architecture by *physical* boundaries. Modules can only depend on modules they declare:

```
common  ← no dependencies
domain  ← common
infra   ← domain + common
api     ← domain + infra (web layer)
```

If `domain` accidentally tries to `import com.acme.api.*`, the compile fails. No more "we have a layered architecture" with everyone importing across.

## TypeScript ↔ Multi-module comparison

| Concept                | pnpm/yarn workspaces                | Maven multi-module / Gradle subprojects   |
| ---------------------- | ----------------------------------- | ----------------------------------------- |
| Workspace root         | `package.json` with `workspaces`    | Parent `pom.xml` (packaging=pom) / `settings.gradle` |
| Cross-package deps     | `"foo": "workspace:*"`              | Maven coordinate of sibling / `project(":foo")` |
| Shared version pinning | (nothing first-class)               | `dependencyManagement` / BOM in parent    |
| Filtered build         | `pnpm --filter <pkg> build`         | `mvn -pl <module> -am install` / `./gradlew :<module>:build` |
| Parallel build         | turbo, nx                           | `mvn -T <n>` / Gradle parallel by default |
| Affected-only CI       | turbo, nx                           | `-pl` + git diff; Gradle build cache      |

## Code example — full Gradle composite vs Maven reactor side-by-side

```bash
# Maven
mvn -pl billing-api -am clean install
# Build order: common → billing-domain → billing-api

# Gradle
./gradlew :billing-api:build
# Same order, with caching and parallelism by default
```

## Composite builds (Gradle only)

Gradle has **composite builds**: link two *separate* Git repos as if they were one project, with substitutions. Useful when you co-develop a library and an app.

```kotlin
// settings.gradle.kts (in app repo)
includeBuild("../my-shared-lib")
```

Now `implementation("com.acme:shared-lib:1.0.0")` resolves to your local checkout. Maven has no equivalent without `mvn install`-ing first.

## Gotchas

> [!warning] Multi-module traps
> - **Forgetting to add a new module to the parent's `<modules>`** — it won't build, but it'll resolve from your local `.m2` if you previously installed it. Disaster waiting in CI.
> - **Cyclic deps**: Maven and Gradle both refuse cycles between modules. Good — fix the design.
> - **Spring Boot `bootJar` on a library module**: it'll repackage the JAR into a fat JAR, which other modules can't depend on. Disable: `tasks.bootJar { enabled = false }; tasks.jar { enabled = true }`. In Maven the `spring-boot-maven-plugin` similarly needs `<classifier>exec</classifier>` on libraries.
> - **`provided` and inheritance**: child poms inherit `<dependencyManagement>` but only inherit `<dependencies>` *if not overridden* — repeating a dep silently replaces, not merges.
> - **Parallel builds and resource conflicts**: tests writing to a fixed port/file will collide. Use random ports / per-module temp dirs.
> - **`${project.version}` drift**: when bumping versions, every cross-internal-dep version reference must move together. Use `versions:set` (Maven) or a script.

## Related

- [[01-Maven-Basics]]
- [[02-Gradle-Basics]]
- [[03-Maven-vs-Gradle]]
- [[04-Dependency-Management]]
- [[06-Common-Plugins]]
- [[04-Module-System]]
