---
tags: [java, maven, build-tools, pom, foundation]
aliases: [Maven, pom.xml, Maven Lifecycle]
stage: foundation
---

# Maven Basics

> [!info] For the Express/TS dev
> Maven is **npm + the bundler + the test runner + the deploy step, all driven by an XML file called `pom.xml`**. It's verbose but predictable: same project, same outputs, on every machine, forever. Once you know the lifecycle phases and the four sections of `pom.xml`, you're ~90% there.

## What Maven is

- A **dependency manager** that pulls JARs from Maven Central.
- A **build orchestrator** that compiles, tests, packages, and installs/deploys artifacts.
- A **convention-driven** tool — there's a "standard" project layout, and Maven yells at you politely if you deviate.

## Standard project layout

```
my-app/
├── pom.xml
├── src/
│   ├── main/
│   │   ├── java/         ← your source
│   │   └── resources/    ← application.yml, static files, templates
│   └── test/
│       ├── java/         ← unit + integration tests
│       └── resources/    ← test config
└── target/               ← build output (gitignored)
    ├── classes/
    ├── test-classes/
    └── my-app-1.0.0.jar
```

Convention beats configuration: don't fight this layout unless you have a strong reason.

## Anatomy of `pom.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
    <modelVersion>4.0.0</modelVersion>

    <!-- 1. Identity ------------------------------------------------ -->
    <groupId>com.acme</groupId>
    <artifactId>my-app</artifactId>
    <version>1.0.0-SNAPSHOT</version>
    <packaging>jar</packaging>          <!-- jar | war | pom -->

    <!-- 2. Inheritance --------------------------------------------- -->
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.3.4</version>
        <relativePath/>                  <!-- look up in repo -->
    </parent>

    <!-- 3. Properties (variables) ---------------------------------- -->
    <properties>
        <java.version>21</java.version>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    </properties>

    <!-- 4. Dependencies -------------------------------------------- -->
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <!-- 5. Build (plugins) ----------------------------------------- -->
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

| Section            | Purpose                                                    | TS analogue                |
| ------------------ | ---------------------------------------------------------- | -------------------------- |
| Identity (GAV)     | Coordinates of *this* artifact                             | `name`+`version` in `package.json` |
| Parent             | Inherit settings, plugins, dep versions                    | (no direct equivalent)     |
| Properties         | Variable substitution                                      | env in `package.json`      |
| Dependencies       | Libraries this project needs                               | `dependencies`/`devDependencies` |
| Build / plugins    | Build steps (compile, test, package…)                      | `scripts` + bundler config |

## The Maven lifecycle

A **lifecycle** is a fixed sequence of **phases**. Running phase X runs every prior phase. There are three built-in lifecycles; the one you'll use 99% of the time is **default**:

```
validate → compile → test → package → verify → install → deploy
```

| Phase      | What it does                                                 | Approximate npm equivalent          |
| ---------- | ------------------------------------------------------------ | ----------------------------------- |
| `validate` | Sanity-check pom.xml                                          | (no equivalent)                     |
| `compile`  | Compile `src/main/java` → `target/classes`                    | `tsc`                               |
| `test`     | Run unit tests via Surefire                                   | `npm test`                          |
| `package`  | Build the artifact (`.jar` / `.war`)                          | `tsc && npm pack`                   |
| `verify`   | Run integration tests via Failsafe                            | (often `npm run test:integration`)  |
| `install`  | Copy artifact to local `~/.m2/repository`                     | `npm link`                          |
| `deploy`   | Publish to a remote repository (Nexus, GitHub Packages)       | `npm publish`                       |

Plus two side lifecycles:
- `clean` — wipes `target/`.
- `site` — generates docs.

### Phases vs goals

A **plugin** contributes **goals** that are bound to phases. `mvn package` runs every default plugin goal bound to phases up to and including `package`.

```bash
mvn clean              # remove target/
mvn compile            # validate + compile
mvn test               # ... + test (no packaging)
mvn package            # ... + package (jar appears in target/)
mvn verify             # ... + integration tests
mvn install            # ... + copy jar to local repo
mvn clean package -DskipTests   # rebuild, skip tests
```

## Dependency declarations

```xml
<dependency>
    <groupId>com.fasterxml.jackson.core</groupId>
    <artifactId>jackson-databind</artifactId>
    <version>2.17.2</version>
    <scope>compile</scope>          <!-- default -->
    <optional>false</optional>      <!-- transitively visible? -->
    <exclusions>
        <exclusion>
            <groupId>commons-logging</groupId>
            <artifactId>commons-logging</artifactId>
        </exclusion>
    </exclusions>
</dependency>
```

### Scopes

| Scope        | On `compile` classpath | On `test` classpath | In packaged JAR | Use case                       |
| ------------ | ---------------------- | ------------------- | --------------- | ------------------------------ |
| `compile`    | Yes                    | Yes                 | Yes             | Default; everything needs it   |
| `provided`   | Yes                    | Yes                 | **No**          | Servlet API in a WAR — container provides it |
| `runtime`    | No                     | Yes                 | Yes             | JDBC drivers, Logback impls    |
| `test`       | No                     | Yes                 | No              | JUnit, Mockito                 |
| `system`     | Yes                    | Yes                 | No (manual)     | Avoid                          |
| `import`     | (BOMs only — see [[04-Dependency-Management]]) |   |                 |                                |

Roughly: `runtime` ≈ npm `dependencies` for things you `require()` only at runtime; `test` ≈ `devDependencies`; `provided` has no JS equivalent.

## Properties and variables

```xml
<properties>
    <java.version>21</java.version>
    <jackson.version>2.17.2</jackson.version>
</properties>

<dependency>
    <groupId>com.fasterxml.jackson.core</groupId>
    <artifactId>jackson-databind</artifactId>
    <version>${jackson.version}</version>
</dependency>
```

You can also reference predefined properties: `${project.version}`, `${project.basedir}`, `${env.HOME}`.

## Profiles — environment switching

```xml
<profiles>
    <profile>
        <id>prod</id>
        <properties>
            <log.level>INFO</log.level>
        </properties>
        <dependencies>
            <dependency>
                <groupId>com.acme</groupId>
                <artifactId>prod-only-lib</artifactId>
            </dependency>
        </dependencies>
    </profile>
</profiles>
```

```bash
mvn package -Pprod
```

## Settings vs pom

- `pom.xml` is per-project, committed.
- `~/.m2/settings.xml` is per-user, **not** committed — credentials, mirror URLs, server creds.

## Common commands cheat sheet

```bash
mvn -v                            # version
mvn clean install                 # full build, drop into local repo
mvn dependency:tree               # show resolved dep graph
mvn dependency:tree -Dincludes=org.springframework  # filter
mvn help:effective-pom            # show pom after inheritance/profiles
mvn versions:display-dependency-updates  # what's outdated
mvn -pl billing -am install       # multi-module: build "billing" + deps
mvn -DskipTests package           # skip running tests (still compiles)
mvn -Dmaven.test.skip=true package # skip compiling AND running tests
mvn -o package                    # offline mode
mvn spring-boot:run               # run a Spring Boot app
```

## TypeScript ↔ Maven comparison

| Concept                  | npm                          | Maven                                       |
| ------------------------ | ---------------------------- | ------------------------------------------- |
| Manifest                 | `package.json`               | `pom.xml`                                   |
| Dependency declaration   | `dependencies` field         | `<dependencies>` element                    |
| Lockfile                 | `package-lock.json`          | (versions are pinned in pom; Maven Central is immutable) |
| Run a script             | `npm run build`              | `mvn <phase>` (no arbitrary scripts; use plugins) |
| Local cache              | `~/.npm/`                    | `~/.m2/repository/`                         |
| Workspace / monorepo     | `workspaces`                 | Multi-module project (parent pom)           |
| Version range            | `^1.2.3`                     | `[1.2,2.0)` — exists, but rarely used       |
| "latest" install         | `npm i foo@latest`           | (not idiomatic — pin versions)              |
| Execute a binary         | `npx foo`                    | `mvn <plugin>:<goal>`                        |
| Publish                  | `npm publish`                | `mvn deploy`                                |
| Lock to specific Node    | `engines` field              | `<maven.compiler.release>`, enforcer plugin |

## Code example — full minimal Spring Boot pom

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
    <modelVersion>4.0.0</modelVersion>

    <groupId>com.acme</groupId>
    <artifactId>billing-service</artifactId>
    <version>1.0.0-SNAPSHOT</version>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.3.4</version>
    </parent>

    <properties>
        <java.version>21</java.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <scope>runtime</scope>
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

## Gotchas

> [!warning] Maven traps
> - **`SNAPSHOT` versions** are mutable — Maven re-fetches them daily. For reproducibility, release builds must drop `-SNAPSHOT`.
> - **Inheritance vs aggregation**: a `<parent>` inherits config; a `<modules>` aggregates child builds. They're independent (and often combined).
> - **`mvn install` vs `mvn package`**: `package` only builds the JAR in `target/`. `install` *also* copies it to `~/.m2/` so other local projects can resolve it.
> - **Removing a dependency may not remove transitives**: run `mvn dependency:tree` to verify.
> - **Plugin without `<version>`**: in Spring Boot it's fine (the parent supplies it); standalone, you must specify or risk getting whatever Maven happens to pick.
> - **XML order matters in some places** (e.g., Jackson `@JsonProperty` on records — but pom sections themselves are mostly order-insensitive).

## Related

- [[02-Gradle-Basics]]
- [[03-Maven-vs-Gradle]]
- [[04-Dependency-Management]]
- [[05-Multi-Module-Projects]]
- [[06-Common-Plugins]]
- [[01-Mental-Model-Map]]
