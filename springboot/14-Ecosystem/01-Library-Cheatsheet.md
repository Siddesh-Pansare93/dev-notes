---
tags: [ecosystem, libraries, cheatsheet, reference]
aliases: [Library Cheatsheet, Common Java Libraries]
stage: foundation
---

# Library Cheatsheet

> [!info] For the Express/TS dev
> The Java ecosystem has fewer micro-libs than npm but each one tends to be larger and stickier. This is your "what's the Java equivalent of X?" lookup table.

## Boilerplate reduction

| Library | Purpose | Node analog |
|---------|---------|-------------|
| **Lombok** | Generates getters, setters, builders, constructors | `lodash` + class transformers |
| **MapStruct** | Compile-time DTO ↔ Entity mapping | `class-transformer` |
| **Records** (JDK 14+) | Immutable data classes (built-in) | TS `readonly` types |

See [[02-Lombok]], [[03-MapStruct]].

## JSON / serialization

| Library | Purpose |
|---------|---------|
| **Jackson** | JSON ser/deser — Spring's default |
| **Gson** | Google's alternative — simpler, less feature-rich |
| **JSON-B** | Jakarta standard, less used |
| **Moshi** | Kotlin-friendly JSON |

See [[04-Jackson-Deep-Dive]].

## Logging

| Library | Purpose |
|---------|---------|
| **SLF4J** | The logging facade (interface) |
| **Logback** | Default Spring Boot impl |
| **Log4j2** | Alternative, async-by-default |
| **logstash-logback-encoder** | JSON output for Logback |

See [[03-Logging-Best-Practices]].

## HTTP clients

| Library | Purpose |
|---------|---------|
| **RestClient** (Spring 6.1+) | Modern sync HTTP client — preferred |
| **WebClient** | Reactive/async HTTP (Project Reactor) |
| **RestTemplate** | Legacy sync client (still works, on maintenance) |
| **Feign** (Spring Cloud OpenFeign) | Declarative interfaces for HTTP |
| **OkHttp** | Square's low-level client |
| **Apache HttpClient** | Battle-tested, low-level |

## Validation

| Library | Purpose |
|---------|---------|
| **Hibernate Validator** | Reference impl of Jakarta Bean Validation (`@NotNull`, `@Email`, etc.) |
| **spring-boot-starter-validation** | Auto-wires the above |

## Persistence

| Library | Purpose |
|---------|---------|
| **Spring Data JPA** | Repository abstraction over JPA |
| **Hibernate** | The dominant JPA provider |
| **Flyway / Liquibase** | DB migrations |
| **jOOQ** | Type-safe SQL DSL (alternative to JPA) |
| **MyBatis** | SQL mapper (XML-driven) |
| **HikariCP** | Connection pool (Spring Boot default) |
| **mssql-jdbc** | Microsoft SQL Server JDBC driver — see [[../07-Data-JPA/12-MSSQL-Setup]] |
| **postgresql** / **mysql-connector-j** | Other common JDBC drivers |
| **R2DBC** (`r2dbc-postgresql`, `r2dbc-mssql`) | Reactive (non-blocking) SQL drivers for WebFlux |

## Caching

| Library | Purpose |
|---------|---------|
| **Caffeine** | High-performance in-memory cache (default for `spring-boot-starter-cache`) |
| **Ehcache** | Older, supports disk overflow |
| **Redis** (via Spring Data Redis) | Distributed cache |
| **Hazelcast** | Distributed in-memory grid |

## Resilience

| Library | Purpose |
|---------|---------|
| **Resilience4j** | Circuit breaker, retry, rate limiter, bulkhead (modern, lightweight) |
| **Spring Retry** | Retry annotations |
| ~~Hystrix~~ | Deprecated — replaced by Resilience4j |

See [[02-Resilience4j-Circuit-Breakers]].

## Messaging

| Library | Purpose |
|---------|---------|
| **spring-kafka** | Kafka producer/consumer integration |
| **spring-amqp** | RabbitMQ |
| **spring-cloud-stream** | Abstraction over Kafka/RabbitMQ |

## Testing

| Library | Purpose |
|---------|---------|
| **JUnit 5 (Jupiter)** | Test framework |
| **AssertJ** | Fluent assertions (`assertThat(x).isEqualTo(...)`) |
| **Mockito** | Mocking |
| **Testcontainers** | Real Docker containers in tests |
| **WireMock** | HTTP service stubbing |
| **REST Assured** | Fluent HTTP test DSL |
| **Awaitility** | Async assertions |

## Utilities

| Library | Purpose | Node analog |
|---------|---------|-------------|
| **Apache Commons Lang3** | StringUtils, ObjectUtils, etc. | `lodash` |
| **Guava** | Immutable collections, Optional, caches | `lodash`+`immutable` |
| **Vavr** | Functional types (Try, Either, immutable collections) | `fp-ts` |
| **java-uuid-generator** | Time-ordered UUIDs | `uuid` |

## Security

| Library | Purpose |
|---------|---------|
| **Spring Security** | Auth/authz framework |
| **java-jwt** (Auth0) | JWT building/parsing |
| **nimbus-jose-jwt** | JWT/JOSE — used internally by Spring Security |
| **Bouncy Castle** | Crypto primitives |

## Async / reactive

| Library | Purpose |
|---------|---------|
| **Spring WebFlux** | Reactive web stack on Netty — see [[../06-Web-REST/13-WebFlux-Reactive]] |
| **Project Reactor** | `Mono` / `Flux` — backbone of WebFlux |
| **RxJava** | Older reactive lib, still used |
| **Coroutines (Kotlin)** | If you ever go Kotlin |

## Build / dev tools

| Tool | Purpose |
|------|---------|
| **Spring Boot DevTools** | Live reload during dev |
| **Spotless** | Code formatter (like Prettier) |
| **JaCoCo** | Coverage |
| **Checkstyle / PMD / SpotBugs** | Static analysis |
| **Error Prone** | Google's static analyzer |

## Observability

| Library | Purpose |
|---------|---------|
| **Micrometer** | Metrics facade |
| **Micrometer Tracing** | Tracing facade |
| **OpenTelemetry** | Vendor-neutral telemetry |

## Related
- [[02-Lombok]]
- [[03-MapStruct]]
- [[04-Jackson-Deep-Dive]]
- [[01-Maven-Basics]]
- [[02-Gradle-Basics]]
