---
tags: [glossary, reference, index]
aliases: [Glossary, Terms, Dictionary]
stage: foundation
---

# Glossary

> [!info] How to use this
> A-Z reference of Java/Spring terms. Each entry is 1-2 sentences. Click the wikilink to dive deeper. Use Obsidian's **Quick Switcher** (`Cmd/Ctrl+O`) to jump back here from anywhere.

## A

- **AOP** — Aspect-Oriented Programming. Spring uses it to weave cross-cutting concerns (transactions, security, logging) around your beans. See [[07-AOP-and-Proxies]].
- **AOT** — Ahead-Of-Time compilation. Code compiled before runtime, foundation of GraalVM Native Image. See [[03-GraalVM-Native-Image]].
- **Actuator** — Spring Boot's production-ready endpoints (health, metrics, info). See [[01-Spring-Boot-Actuator]].
- **ApplicationContext** — Spring's IoC container. Holds beans, manages lifecycle. See [[08-ApplicationContext-and-Events]].
- **AssertJ** — Fluent assertion library: `assertThat(x).isEqualTo(...)`. See [[03-Mockito-and-AssertJ]].
- **Auto-configuration** — Spring Boot's mechanism for wiring beans based on classpath + properties. See [[02-Spring-Boot-Auto-Configuration]].

## B

- **Bean** — Any object managed by the Spring container. See [[01-IoC-DI-Concepts]].
- **Bean Validation** — Jakarta spec for `@NotNull`, `@Size`, etc.; Hibernate Validator is the impl. See [[04-Bean-Validation]].
- **BOM (Bill of Materials)** — A pom that pins versions of related dependencies. See [[01-Maven-Basics]].
- **Bytecode** — Platform-neutral instructions in `.class` files; the JVM executes them. See [[02-Bytecode-and-Class-Loading]].

## C

- **Caffeine** — High-performance in-memory cache; Spring's default cache impl. See [[01-Library-Cheatsheet]].
- **Checked exception** — Compile-time-enforced exception (extends `Exception`, not `RuntimeException`). See [[02-Checked-vs-Unchecked]].
- **Circuit breaker** — Resilience pattern: stop calling a failing service. See [[02-Resilience4j-Circuit-Breakers]].
- **Class loader** — Loads `.class` files into the JVM at runtime. See [[02-Bytecode-and-Class-Loading]].
- **CompletableFuture** — Java's promise/future type for async composition. See [[03-CompletableFuture]].
- **Component** — Generic stereotype annotation; specializations are `@Service`, `@Repository`, `@Controller`. See [[03-Component-Scanning]].
- **ConfigurationProperties** — Typed binding of `application.yml` to a Java class. See [[04-Configuration-Properties]].
- **Container (Spring)** — The `ApplicationContext` — what holds and wires beans. See [[01-IoC-DI-Concepts]].
- **Context** — Short for `ApplicationContext`. See [[08-ApplicationContext-and-Events]].
- **CRUD** — Create, Read, Update, Delete. See [[03-Spring-Data-Repositories]].

## D

- **DI (Dependency Injection)** — Pattern where objects receive their dependencies. See [[01-IoC-DI-Concepts]].
- **DTO (Data Transfer Object)** — Object shaped for transport (e.g., HTTP), distinct from your domain entity. See [[03-DTOs-and-Serialization]].
- **DevTools** — Spring Boot module for live reload during development. See [[07-DevTools-and-Live-Reload]].

## E

- **Entity** — A persistent class mapped to a DB table via JPA `@Entity`. See [[02-Entity-Basics]].
- **Eureka** — Netflix's service registry, used in Spring Cloud. See [[02-Service-Discovery]].
- **Executor** — Abstraction over thread pools. See [[02-ExecutorService-and-Thread-Pools]].

## F

- **Fat JAR** — Self-contained executable JAR with embedded server + dependencies. See [[01-Packaging-Fat-JAR]].
- **Feign** — Declarative HTTP client (interface-driven). See [[10-WebClient-and-RestClient]].
- **Filter chain** — Spring Security's stack of filters processing each HTTP request. See [[01-Spring-Security-Basics]].
- **Flyway** — Versioned SQL migration tool. See [[08-Migrations-Flyway-Liquibase]].

## G

- **GC (Garbage Collector)** — JVM's automatic memory reclamation. See [[03-JVM-Memory-and-GC]].
- **Generics** — Parameterized types (`List<String>`); erased at runtime. See [[01-Generics]] and [[03-Type-Erasure]].
- **GraalVM** — Polyglot VM with a `native-image` AOT compiler. See [[03-GraalVM-Native-Image]].
- **Gradle** — Groovy/Kotlin-DSL build tool. Faster builds than Maven. See [[02-Gradle-Basics]].

## H

- **HikariCP** — Default JDBC connection pool in Spring Boot. See [[01-JPA-Hibernate-Basics]].
- **Hibernate** — Most popular JPA implementation. See [[01-JPA-Hibernate-Basics]].

## I

- **IoC (Inversion of Control)** — Framework controls object creation/lifecycle, not your code. See [[01-IoC-DI-Concepts]].
- **Interface** — Contract type (Java's `interface`), can have default methods since 8. See [[06-Interfaces-and-Abstract-Classes]].

## J

- **JAR (Java ARchive)** — Zip file of classes + resources; can be executable. See [[01-Packaging-Fat-JAR]].
- **Jackson** — JSON ser/deser library; Spring's default. See [[04-Jackson-Deep-Dive]].
- **JDBC** — Low-level Java DB API. See [[01-JPA-Hibernate-Basics]].
- **JDK** — Java Development Kit; includes JRE + compiler + tools. See [[01-JDK-JRE-JVM-Basics]].
- **JIT (Just-In-Time)** — JVM compiles hot bytecode to native at runtime. See [[03-JVM-Memory-and-GC]].
- **Jib** — Google's tool to build OCI images without Docker daemon. See [[02-Docker-for-Spring-Boot]].
- **JPA (Jakarta Persistence API)** — Spec for ORM in Java; Hibernate is the dominant impl. See [[01-JPA-Hibernate-Basics]].
- **JPQL** — Query language for JPA, similar to SQL but on entities. See [[04-Query-Methods-and-JPQL]].
- **jshell** — Java REPL (JDK 9+). See [[05-Common-CLI-Tools]].
- **JUnit 5** — The standard test framework. See [[02-JUnit-5-Basics]].
- **JVM (Java Virtual Machine)** — The runtime that executes bytecode. See [[01-JDK-JRE-JVM-Basics]].
- **JWT (JSON Web Token)** — Signed bearer token for stateless auth. See [[04-JWT-with-Spring-Security]].

## K

- **Kafka** — Distributed log/streaming platform. See [[01-Spring-Kafka]].
- **Kubernetes (k8s)** — Container orchestrator. See [[04-Kubernetes-Basics]].

## L

- **Lazy loading** — JPA defers loading associations until accessed; source of N+1. See [[06-Relationships-and-Lazy-Loading]] and [[07-N-Plus-1-and-Fetch-Strategies]].
- **Liveness probe** — k8s check: is the JVM alive? Failure → restart. See [[05-Health-Checks-and-Readiness]].
- **Logback** — Default logging implementation. See [[03-Logging-Best-Practices]].
- **Lombok** — Annotation processor that generates boilerplate. See [[02-Lombok]].

## M

- **MapStruct** — Compile-time DTO ↔ entity mapper. See [[03-MapStruct]].
- **Maven** — XML-based build/dependency tool. See [[01-Maven-Basics]].
- **MDC (Mapped Diagnostic Context)** — Thread-local kv for log correlation. See [[03-Logging-Best-Practices]].
- **Micrometer** — Metrics facade; Prometheus/Datadog/etc. behind it. See [[02-Micrometer-Metrics]].
- **Mockito** — Mocking library for tests. See [[03-Mockito-and-AssertJ]].

## N

- **N+1** — JPA performance bug: 1 query loads parents, then N more queries load each child. See [[07-N-Plus-1-and-Fetch-Strategies]].
- **Native image** — AOT-compiled standalone binary (GraalVM). See [[03-GraalVM-Native-Image]].

## O

- **OAuth2 / OIDC** — Auth delegation / identity protocols. See [[05-OAuth2-OIDC-with-Spring]].
- **ObjectMapper** — Jackson's main entry point. See [[04-Jackson-Deep-Dive]].
- **Optional** — Container type for "value or absent", since Java 8. See [[04-Optional-and-Null-Safety]].
- **OTel (OpenTelemetry)** — Vendor-neutral telemetry SDK + protocol. See [[04-Distributed-Tracing]].

## P

- **POJO (Plain Old Java Object)** — Just a class — no framework requirements.
- **POM (Project Object Model)** — Maven's `pom.xml` build config. See [[01-Maven-Basics]].
- **ProblemDetail** — RFC 7807 error format, first-class in Spring 6. See [[05-Exception-Handlers-and-ProblemDetail]].
- **Profile** — Named config slice (dev/staging/prod). See [[06-Profiles-Per-Environment]].
- **Prometheus** — Pull-based metrics database. See [[02-Micrometer-Metrics]].
- **Proxy** — Spring wraps your bean to add cross-cutting behavior (transactions, security). See [[07-AOP-and-Proxies]].

## R

- **Readiness probe** — k8s check: ready for traffic? Failure → no traffic, no restart. See [[05-Health-Checks-and-Readiness]].
- **Record** — Immutable data class (`record Point(int x, int y) {}`), JDK 16+. See [[09-Records-and-Pattern-Matching]].
- **Reflection** — Inspect/invoke types at runtime; powers Spring + Jackson + JPA.
- **Repository** — Stereotype for persistence beans; in Spring Data, an interface auto-implemented. See [[03-Spring-Data-Repositories]].
- **Resilience4j** — Circuit breaker, retry, rate limiter, bulkhead lib. See [[02-Resilience4j-Circuit-Breakers]].
- **REST controller** — `@RestController`-annotated class handling HTTP. See [[01-REST-Controllers]].
- **RestClient** — Modern sync HTTP client (Spring 6.1+). See [[10-WebClient-and-RestClient]].

## S

- **SDKMAN!** — JDK + tooling version manager. See [[05-Common-CLI-Tools]].
- **SLF4J** — Logging facade (the API you log against). See [[03-Logging-Best-Practices]].
- **Spring Boot** — Convention-over-configuration framework on top of Spring. See [[02-Spring-Boot-Auto-Configuration]].
- **Spring Cloud** — Umbrella for distributed-system tooling (Config, Gateway, OpenFeign). See [[04-MOC-Microservices]].
- **Spring Data JPA** — Auto-implemented repositories on top of JPA. See [[03-Spring-Data-Repositories]].
- **Spring Security** — Auth/authz framework. See [[01-Spring-Security-Basics]].
- **Stage** — Where a note sits in the curriculum: foundation/intermediate/advanced.
- **Starter** — A `spring-boot-starter-*` dependency that pulls in a curated set. See [[05-Starters-Explained]].
- **Stereotype** — `@Component`, `@Service`, `@Repository`, `@Controller` — semantic markers. See [[03-Component-Scanning]].
- **Stream** — Functional pipeline over a collection (`.map`, `.filter`, `.collect`). See [[03-Streams-and-Lambdas]].

## T

- **Testcontainers** — Real Docker dependencies (Postgres, Kafka) in tests. See [[05-Testcontainers]].
- **Transaction** — Atomic unit of DB work, declared via `@Transactional`. See [[05-Transactions]].
- **TraceId / SpanId** — Distributed tracing identifiers; injected into MDC. See [[04-Distributed-Tracing]].
- **Twelve-Factor** — Methodology for cloud-native apps. See [[07-Twelve-Factor-Spring]].

## U

- **Unchecked exception** — Subclass of `RuntimeException`; not enforced by compiler. See [[02-Checked-vs-Unchecked]].

## V

- **var** — Local variable type inference (JDK 10+). See [[05-var-and-Local-Type-Inference]].
- **Virtual thread** — Lightweight thread (JDK 21+); blocks cheaply, scales to millions. See [[05-Virtual-Threads]].

## W

- **WebClient** — Reactive HTTP client (`Mono`/`Flux`). See [[10-WebClient-and-RestClient]].
- **WebFlux** — Spring's reactive web stack.
- **WireMock** — HTTP service stubbing in tests.

## Y

- **YAML** — Human-friendly config format, common for `application.yml`. See [[03-Application-Properties-and-YAML]].

## Related
- [[00-README]]
- [[06-FAQ-for-Express-Devs]]
- [[01-Library-Cheatsheet]]
- [[02-MOC-Java-Fundamentals]]
- [[03-MOC-Spring]]
