---
tags:
  - spring-boot
  - starters
  - dependencies
aliases:
  - Starters
  - Spring Boot Starters
stage: intermediate
---

# Starters

> [!info] For the Express/TS dev
> A "starter" is a curated bundle of dependencies. Instead of `npm install express body-parser cors morgan helmet pino`, you add `spring-boot-starter-web` once and get a compatible set of libraries. Every transitive version is pinned by Spring Boot's parent BOM, so you stop fighting `npm peerDependency`-style conflicts.

## What is a starter?

A starter is just a Maven/Gradle artifact with **no code** — only `<dependencies>` declaring what should come along. Add the starter, get the whole stack.

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
```

Pulling that in transitively gives you:
- `spring-web`, `spring-webmvc`
- Embedded Tomcat (`tomcat-embed-core`)
- Jackson (`jackson-databind`, `jackson-datatype-jsr310`)
- Bean validation (`hibernate-validator`)
- Logging (`logback`)

Plus a matching [[03-Auto-Configuration|auto-configuration]] kicks in automatically.

## Common starters

| Starter | Purpose |
|---|---|
| `spring-boot-starter-web` | REST APIs, MVC, embedded Tomcat |
| `spring-boot-starter-webflux` | Reactive (Netty) — alternative to web |
| `spring-boot-starter-data-jpa` | JPA + Hibernate |
| `spring-boot-starter-data-mongodb` | MongoDB |
| `spring-boot-starter-data-redis` | Redis client + repositories |
| `spring-boot-starter-jdbc` | Plain JDBC + JdbcTemplate |
| `spring-boot-starter-security` | Spring Security |
| `spring-boot-starter-oauth2-client` | OAuth2/OIDC client |
| `spring-boot-starter-oauth2-resource-server` | JWT validation |
| `spring-boot-starter-validation` | Bean Validation (`@Valid`, `@NotNull`) |
| `spring-boot-starter-actuator` | Health, metrics, info endpoints |
| `spring-boot-starter-cache` | Caching abstraction (`@Cacheable`) |
| `spring-boot-starter-aop` | AOP support ([[../04-Spring-Core/08-AOP-Basics]]) |
| `spring-boot-starter-mail` | JavaMail |
| `spring-boot-starter-thymeleaf` | Server-side templates |
| `spring-boot-starter-test` | JUnit 5, Mockito, AssertJ, Spring Test |
| `spring-boot-starter-quartz` | Scheduler |
| `spring-boot-starter-amqp` | RabbitMQ |
| `spring-boot-devtools` | Hot reload (see [[07-DevTools-and-Hot-Reload]]) |

## How versions stay consistent

Your `pom.xml` typically inherits from `spring-boot-starter-parent`:

```xml
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.3.0</version>
</parent>
```

The parent imports a **BOM** (Bill of Materials) that pins versions for ~200 libraries known to work together. So you write:

```xml
<!-- No version! -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
<dependency>
    <groupId>com.fasterxml.jackson.module</groupId>
    <artifactId>jackson-module-kotlin</artifactId>
</dependency>
```

Spring Boot picks the right Jackson version for you.

> [!tip] Gradle equivalent
> ```groovy
> plugins {
>     id 'org.springframework.boot' version '3.3.0'
>     id 'io.spring.dependency-management' version '1.1.5'
> }
> dependencies {
>     implementation 'org.springframework.boot:spring-boot-starter-web'
> }
> ```

## Code example: a typical web+data app

```xml
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
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>

    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-actuator</artifactId>
    </dependency>

    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
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
```

That's a complete production stack: REST, persistence, validation, health endpoints, security, Postgres driver, testing — all with consistent versions.

## Excluding transitive deps

Sometimes a starter brings something you don't want (e.g., default logging when you want Log4j2):

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
    <exclusions>
        <exclusion>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-logging</artifactId>
        </exclusion>
    </exclusions>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-log4j2</artifactId>
</dependency>
```

## Writing a custom starter

Useful inside organizations to package shared concerns (auth, telemetry, common config). The recipe:

```
my-starter/
├── my-starter-autoconfigure/   ← @AutoConfiguration classes
└── my-starter/                 ← empty module that depends on autoconfigure
                                  + brings in transitive deps
```

See [[03-Auto-Configuration#Code example writing your own auto-config]] for the autoconfigure piece.

## Gotchas

> [!warning] Common pitfalls
> - **Adding `spring-web` (no `boot-`)** by mistake — you bypass auto-config and lose the embedded server.
> - **Forcing a version** on a starter or its transitive deps — breaks the BOM's compatibility guarantees. Trust the parent.
> - **Starter on classpath but not used** — auto-config still runs and may surprise you (e.g., adding `starter-security` enables auth on every endpoint).
> - **`devtools` shipped to production** — mark it `<scope>runtime</scope>` and use `optional=true`. See [[07-DevTools-and-Hot-Reload]].
> - **Old answers using `spring-boot-starter` without `-web`** — that's the *base* starter, no web layer.

## Related
- [[01-What-is-Spring-Boot]]
- [[03-Auto-Configuration]]
- [[05-Application-Properties]]
- [[09-Building-and-Running]]
- [[../03-Build-Tools/Maven-Basics]]
- [[../12-Observability/Actuator]]
