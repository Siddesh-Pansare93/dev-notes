---
tags: [testing, integration, e2e]
aliases: [Integration Tests, IT]
stage: advanced
---

# Integration Testing

> [!info] For the Express/TS dev
> "Integration test" in Spring usually means: real ApplicationContext + real DB (via Testcontainers) + MockMvc/WebTestClient hitting controllers + maybe real external services. It's broader than a unit test, narrower than full E2E. Convention: name them `*IT.java` (or `*IntegrationTest.java`) so build tools can run them separately from fast unit tests.

## Concept

A unit test pyramid in Spring:

```
+---------------------+
|   E2E (deployed)    |  RestAssured/Playwright vs staging
+---------------------+
|  Integration (IT)   |  @SpringBootTest + Testcontainers
+---------------------+
|  Slice tests        |  @WebMvcTest, @DataJpaTest
+---------------------+
|  Unit tests         |  plain JUnit + Mockito
+---------------------+
```

Integration tests are the **most valuable** tier for backend services — they catch wiring bugs, DB schema drift, transaction issues, and serialization problems that unit tests miss.

### Maven Failsafe vs Surefire

By convention:
- **Surefire** runs `*Test.java` — unit tests, fast, in `mvn test`.
- **Failsafe** runs `*IT.java` — integration tests, in `mvn verify`.

```xml
<plugin>
    <artifactId>maven-failsafe-plugin</artifactId>
    <executions>
        <execution>
            <goals>
                <goal>integration-test</goal>
                <goal>verify</goal>
            </goals>
        </execution>
    </executions>
</plugin>
```

Gradle: separate source set or use a tag filter.

## Code example

### Full integration test — controller → service → repo → real DB

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@AutoConfigureWebTestClient
class OrderApiIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres =
        new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired WebTestClient client;
    @Autowired OrderRepository orderRepo;

    @MockitoBean PaymentGateway gateway;  // mock just the external boundary

    @BeforeEach
    void clean() {
        orderRepo.deleteAll();
    }

    @Test
    void placeOrder_endToEnd() {
        when(gateway.charge(anyInt())).thenReturn("txn-1");

        var resp = client.post().uri("/api/orders")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(Map.of(
                "items", List.of(Map.of("sku", "BOOK-1", "qty", 2)),
                "customerId", "cust-1"
            ))
            .exchange()
            .expectStatus().isCreated()
            .expectBody(OrderResponse.class)
            .returnResult().getResponseBody();

        // 1. HTTP layer
        assertThat(resp.id()).isNotNull();
        assertThat(resp.status()).isEqualTo("PAID");

        // 2. Persistence
        var saved = orderRepo.findById(resp.id()).orElseThrow();
        assertThat(saved.getStatus()).isEqualTo(OrderStatus.PAID);

        // 3. External call
        verify(gateway).charge(any());
    }

    @Test
    void paymentFails_orderNotPersisted() {
        when(gateway.charge(anyInt()))
            .thenThrow(new PaymentDeclined("insufficient funds"));

        client.post().uri("/api/orders")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(Map.of(
                "items", List.of(Map.of("sku", "BOOK-1", "qty", 1)),
                "customerId", "cust-1"
            ))
            .exchange()
            .expectStatus().is4xxClientError();

        assertThat(orderRepo.count()).isZero();
    }
}
```

### Cleaning state between tests

Three strategies:

**1. `@Transactional` rollback** — Spring rolls back after each test. Doesn't work for tests crossing thread/transaction boundaries (async, Kafka).

```java
@SpringBootTest
@Transactional
class FooIT { /* each test rolls back */ }
```

**2. Manual cleanup**

```java
@BeforeEach
void clean() {
    jdbcTemplate.execute("TRUNCATE orders, items CASCADE");
}
```

**3. Database snapshots / Flyway clean**

```java
@Autowired Flyway flyway;
@BeforeEach
void clean() { flyway.clean(); flyway.migrate(); }
```

### `@DirtiesContext` — last resort

```java
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class StatefulIT { ... }
```

Marks the context as polluted; Spring rebuilds it for the next test class. **Slow** — only when a test mutates singletons in unfixable ways.

### Testing async / eventual behavior with Awaitility

```java
@Test
void publishesEvent() {
    service.placeOrder(new Cart(...));

    await().atMost(5, TimeUnit.SECONDS)
           .untilAsserted(() ->
               assertThat(eventStore.events()).hasSize(1));
}
```

### Stubbing external HTTP with WireMock

```java
@SpringBootTest
@AutoConfigureWireMock(port = 0)
class ExternalApiIT {

    @Value("${wiremock.server.port}") int wmPort;
    @Autowired ExchangeRateClient client;

    @Test
    void fetchesRate() {
        stubFor(get("/rates/USD")
            .willReturn(okJson("""
                { "rate": 1.10 }
            """)));

        var rate = client.getRate("USD");

        assertThat(rate).isEqualTo(new BigDecimal("1.10"));
        verify(getRequestedFor(urlEqualTo("/rates/USD")));
    }
}
```

Configure your client to point at WireMock:

```yaml
exchange-rate:
  base-url: http://localhost:${wiremock.server.port}
```

### Tagging / filtering

```java
@Tag("integration")
class FooIT { ... }
```

```bash
mvn test -Dgroups=integration
```

## Express/Node comparison

| Spring | Node |
|--------|------|
| `@SpringBootTest(RANDOM_PORT)` | `app.listen(0)` then test |
| Testcontainers Postgres | testcontainers-node + Knex pointing at it |
| `@MockitoBean` | DI override or `nock` for outbound HTTP |
| WireMock | `nock` / `msw` |
| `@Transactional` rollback | manual `BEGIN/ROLLBACK` per test |
| Awaitility | `waitFor` / polling helpers |
| Failsafe vs Surefire split | `jest --testPathPattern=integration` or separate config |

## Gotchas

> [!warning] Don't share mutable state via `@SpringBootTest`
> Static singletons, in-memory caches, scheduler state — all leak between tests in the same JVM. Reset them in `@BeforeEach` or use `@DirtiesContext`.

> [!warning] `@Transactional` + async = bug factory
> If your service spawns a `@Async` job inside a transactional test, the async thread can't see the test's not-yet-committed data, and the test will roll it back before the job runs. Disable `@Transactional` and clean manually for these.

> [!danger] Test pollution from caches
> Spring caches `ApplicationContext`. Mutate `@Cacheable` results in test A → flaky test B. Use `@CacheEvict` between tests or `@DirtiesContext`.

> [!tip] Slow ITs deserve a separate Gradle task
> Don't make devs pay 60s on every commit. Use a `verify` job in CI, fast `test` task locally.

> [!tip] One real-world workflow per IT
> "User registers → confirms email → places order → cancels." Test the journey, not every branch. Branches go in unit tests.

## Related
- [[04-Spring-Boot-Test]]
- [[05-MockMvc-and-WebTestClient]]
- [[06-Testcontainers]]
- [[08-Test-Profiles-and-Properties]]
- [[../12-Observability/01-Logging|Logging in tests]]
