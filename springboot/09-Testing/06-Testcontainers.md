---
tags: [testing, testcontainers, docker, integration]
aliases: [Testcontainers, Real DB tests]
stage: advanced
---

# Testcontainers

> [!info] For the Express/TS dev
> Testcontainers spins up real Docker containers (Postgres, Kafka, Redis, Mongo, anything) for the duration of your test. It's the same `testcontainers` library available in Node — same idea, native Java integration. Stop testing against H2 and pretending it's Postgres.

## Concept

The pitch: your test starts a **real** Postgres in Docker, points your app at it, runs, and tears it down. No more "works on H2 but breaks in prod because Postgres has different DDL semantics."

Three integration styles:

1. **JUnit 5 extension** — `@Testcontainers` + `@Container`.
2. **Spring Boot 3.1+ `@ServiceConnection`** — auto-wires the container's URL/credentials into Spring properties. Magic.
3. **Singleton container** — start once for the whole JVM, reuse across test classes.

## Code example

### Dependencies

```xml
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>junit-jupiter</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>postgresql</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>kafka</artifactId>
    <scope>test</scope>
</dependency>
```

### Modern Spring Boot (3.1+) — `@ServiceConnection`

```java
@SpringBootTest
@Testcontainers
class OrderRepositoryIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres =
        new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired OrderRepository repo;

    @Test
    void savesAndFinds() {
        var order = repo.save(new Order("ABC-1"));
        assertThat(repo.findById(order.id())).isPresent();
    }
}
```

That's it. `@ServiceConnection` introspects the container type and registers `spring.datasource.url`, `username`, `password` automatically. Same works for Kafka, Mongo, Redis, Cassandra, etc.

### Pre-3.1 / manual property override

```java
@SpringBootTest
@Testcontainers
class OrderRepositoryIT {

    @Container
    static PostgreSQLContainer<?> postgres =
        new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("test")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired OrderRepository repo;

    @Test
    void it() { /* ... */ }
}
```

### Singleton pattern (faster — start once)

```java
public abstract class AbstractIntegrationTest {

    static final PostgreSQLContainer<?> POSTGRES =
        new PostgreSQLContainer<>("postgres:16-alpine");

    static {
        POSTGRES.start();   // started once, never stopped (JVM exit cleans up)
    }

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        r.add("spring.datasource.username", POSTGRES::getUsername);
        r.add("spring.datasource.password", POSTGRES::getPassword);
    }
}

@SpringBootTest
class OrderIT extends AbstractIntegrationTest { /* ... */ }

@SpringBootTest
class UserIT  extends AbstractIntegrationTest { /* shares the same Postgres */ }
```

### Multiple containers — full integration

```java
@SpringBootTest
@Testcontainers
class FullIntegrationIT {

    @Container @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Container @ServiceConnection
    static KafkaContainer kafka =
        new KafkaContainer(DockerImageName.parse("confluentinc/cp-kafka:7.5.0"));

    @Container @ServiceConnection
    static GenericContainer<?> redis =
        new GenericContainer<>("redis:7-alpine").withExposedPorts(6379);

    @Autowired OrderService service;

    @Test
    void placeOrder_persistsAndPublishes() {
        // real DB, real Kafka, real Redis — full path test
        service.place(new Cart(...));
    }
}
```

### `application.yml` — point Testcontainers via JDBC URL prefix

A neat trick: prefix the JDBC URL with `tc:` and Testcontainers takes over.

```yaml
spring:
  datasource:
    url: jdbc:tc:postgresql:16-alpine:///mydb
    driver-class-name: org.testcontainers.jdbc.ContainerDatabaseDriver
```

No code changes needed in tests — but less control.

### Reusable containers (faster local dev loops)

```java
postgres.withReuse(true);
```

In `~/.testcontainers.properties`:

```
testcontainers.reuse.enable=true
```

Container persists between JVM runs — huge speedup locally. Don't enable in CI (you want clean state).

### Spring Boot 3.1+ `TestcontainersConfiguration` for `bootTestRun`

```java
@TestConfiguration(proxyBeanMethods = false)
class TestcontainersConfig {
    @Bean
    @ServiceConnection
    PostgreSQLContainer<?> postgres() {
        return new PostgreSQLContainer<>("postgres:16-alpine");
    }
}
```

Then run `./mvnw spring-boot:test-run` (or `bootTestRun` in Gradle) — your app starts with the test containers. Replaces fiddly `docker-compose.dev.yml`.

## Express/Node comparison

```typescript
// testcontainers-node
import { PostgreSqlContainer } from "@testcontainers/postgresql";

let container: StartedPostgreSqlContainer;
beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();
  process.env.DATABASE_URL = container.getConnectionUri();
});
afterAll(() => container.stop());
```

| Java | Node |
|------|------|
| `@Container` + `@Testcontainers` | manual `beforeAll`/`afterAll` |
| `@ServiceConnection` | manual env var wiring |
| `@DynamicPropertySource` | `process.env.X = ...` |
| Singleton via static init | top-level `await` in setup |
| `withReuse(true)` | same flag exists in Node lib |

The Java tooling is more declarative. Node's is more imperative but flexible.

## Gotchas

> [!warning] Docker required
> The test runner needs Docker (or Podman, Colima, Rancher). CI must have a docker-in-docker setup or remote socket. Github Actions Linux runners have it pre-installed.

> [!warning] Container startup time
> Postgres ≈ 2-3s. Kafka ≈ 5-15s. Use **singleton** or **reuse** to avoid paying this per test class.

> [!warning] Ryuk side-container
> Testcontainers spawns a "Ryuk" container that cleans up dangling containers after the JVM exits. Some restricted CI environments block it — set `TESTCONTAINERS_RYUK_DISABLED=true` (and clean up yourself).

> [!danger] Don't share state between tests via the singleton
> If 50 tests share one Postgres, one test's data pollutes the next. Use `@Transactional` rollback, truncate tables in `@AfterEach`, or use Flyway/Liquibase clean — but **plan it**.

> [!tip] Pin image versions
> `postgres:latest` will eventually break your tests. Pin to `postgres:16-alpine`.

> [!tip] Use H2 only when speed > fidelity
> If your repo tests use vendor-specific SQL, JSONB, partial indexes, etc. — H2 will lie to you. Testcontainers + real Postgres catches it.

## Related
- [[04-Spring-Boot-Test]]
- [[07-Integration-Testing]]
- [[08-Test-Profiles-and-Properties]]
- [[../07-Data-JPA/01-JPA-Hibernate-Overview|JPA]]
- [[../11-Messaging/03-Spring-Kafka|Spring Kafka — test with KafkaContainer]]
