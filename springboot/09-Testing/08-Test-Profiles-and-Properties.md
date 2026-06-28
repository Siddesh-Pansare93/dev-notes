---
tags: [testing, profiles, configuration]
aliases: [Test Profiles, Test Properties]
stage: advanced
---

# Test Profiles and Properties

> [!info] For the Express/TS dev
> In Node you set `NODE_ENV=test` and load a different `.env`. In Spring you activate a **profile** (`test`) which selects `application-test.yml` and any `@Profile("test")` beans. Plus you have surgical overrides (`@TestPropertySource`, `@DynamicPropertySource`) for individual tests.

## Concept

Three layers of test config, in order of precedence (later wins):

1. **`application.yml`** + **`application-test.yml`** — base config with a `test` profile override.
2. **`@TestPropertySource`** — class-level overrides.
3. **`@DynamicPropertySource`** — programmatic overrides (e.g. Testcontainer URLs).
4. **`@SpringBootTest(properties = ...)`** — inline overrides.

## Code example

### Profile-based config

`src/main/resources/application.yml`:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://prod-db/app
  jpa:
    show-sql: false
```

`src/test/resources/application-test.yml`:

```yaml
spring:
  datasource:
    url: jdbc:h2:mem:test
  jpa:
    show-sql: true
    hibernate:
      ddl-auto: create-drop
logging:
  level:
    com.example: debug
    org.hibernate.SQL: debug
```

Activate it in tests:

```java
@SpringBootTest
@ActiveProfiles("test")
class FooIT { ... }
```

### `@TestPropertySource`

```java
@SpringBootTest
@TestPropertySource(properties = {
    "feature.new-checkout=true",
    "external.api.timeout=100ms"
})
class CheckoutFeatureFlagTest { ... }
```

Or load a properties file:

```java
@TestPropertySource(locations = "classpath:test-overrides.properties")
```

### `@DynamicPropertySource` — for runtime values

```java
@DynamicPropertySource
static void registerProps(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", postgres::getJdbcUrl);
    registry.add("spring.kafka.bootstrap-servers", kafka::getBootstrapServers);
    registry.add("redis.host", redis::getHost);
    registry.add("redis.port", () -> redis.getMappedPort(6379));
}
```

Use for any value the test discovers at runtime — Testcontainer ports, random ports, generated secrets.

### `@SpringBootTest(properties = ...)`

```java
@SpringBootTest(properties = {
    "logging.level.root=warn",
    "spring.task.execution.pool.core-size=1"
})
class QuietTest { ... }
```

### Profile-specific beans

```java
@Configuration
public class EmailConfig {

    @Bean
    @Profile("!test")
    EmailService realEmail() { return new SesEmailService(); }

    @Bean
    @Profile("test")
    EmailService fakeEmail() { return new InMemoryEmailService(); }
}
```

Now `@ActiveProfiles("test")` picks the in-memory implementation automatically.

### Multi-profile composition

```java
@ActiveProfiles({"test", "test-kafka"})
class KafkaIT { ... }
```

### Environment variables in tests

`@SpringBootTest` doesn't read your shell `.env` — but you can:

```java
@SpringBootTest
@TestPropertySource(properties = "API_KEY=test-key")
class FooTest { ... }
```

Or use `@SetEnvironmentVariable` from JUnit Pioneer for true env vars.

### Random ports

```yaml
server:
  port: 0   # random port
```

```java
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
class FooIT {
    @LocalServerPort int port;

    @Test
    void it() {
        // use port
    }
}
```

### `application-test.yml` patterns

```yaml
spring:
  config:
    activate:
      on-profile: test

  datasource:
    url: jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1
    username: sa
    password:

  jpa:
    hibernate:
      ddl-auto: create-drop
    show-sql: true

  flyway:
    enabled: false        # let Hibernate own schema in tests

  kafka:
    consumer:
      auto-offset-reset: earliest

  task:
    scheduling:
      pool:
        size: 1

logging:
  level:
    root: warn
    com.example: debug

# disable real integrations
external:
  payment:
    enabled: false
  email:
    provider: noop

resilience4j:
  retry:
    instances:
      default:
        max-attempts: 1   # fail fast in tests
```

### Profile groups (Boot 2.4+)

```yaml
spring:
  profiles:
    group:
      local: ["dev", "h2", "verbose-logging"]
      ci:    ["test", "testcontainers"]
```

Activate `local` and Spring activates all three under it.

### `@TestConfiguration` for test-only beans

```java
@SpringBootTest
@Import(EmailTestConfig.class)
class FooIT { ... }

@TestConfiguration
class EmailTestConfig {
    @Bean @Primary
    EmailService emailService() {
        return new InMemoryEmailService();
    }
}
```

## Express/Node comparison

| Spring | Node |
|--------|------|
| `application-test.yml` | `.env.test` |
| `@ActiveProfiles("test")` | `NODE_ENV=test` |
| `@TestPropertySource(properties=...)` | overriding `process.env` in `beforeAll` |
| `@DynamicPropertySource` | building a config object after starting Testcontainers |
| `@Profile("!test")` beans | `if (process.env.NODE_ENV === "test") { ... }` |
| `@LocalServerPort` | `app.listen(0)` then `server.address().port` |
| Profile groups | composite env loaders |

The Spring approach is more declarative and discoverable; the Node approach is "just JS" and more flexible.

## Gotchas

> [!warning] `application.yml` precedence
> Spring loads from many sources. Don't put secrets in `application.yml` and expect tests to override them — `@TestPropertySource` does, but env vars from your shell *also* leak in. Be intentional.

> [!warning] Context cache invalidation
> Each unique `@TestPropertySource` / `@ActiveProfiles` / `@MockitoBean` set is a new context. Variations across tests = many cached contexts = slow + OOM. Standardize.

> [!danger] Don't bake real credentials into test resources
> `application-test.yml` checked into git is fine for fakes, dangerous for real keys. Use environment-injected secrets in CI.

> [!tip] Use `@AutoConfigureTestDatabase(replace = NONE)`
> Stops Spring from automatically swapping your DataSource for H2 when you actually want the configured DB (e.g. with Testcontainers).

> [!tip] Validate config in CI
> A `mvn test` run with `--fail-on-warning` catches typos in `@Value("${missing.prop}")` early.

## Related
- [[06-Testcontainers]]
- [[07-Integration-Testing]]
- [[../05-Spring-Boot/04-Profiles|Profiles in production]]
- [[../05-Spring-Boot/05-Externalized-Configuration|Externalized config]]
