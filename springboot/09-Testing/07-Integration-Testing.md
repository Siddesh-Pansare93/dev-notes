# Integration Testing

> [!info] Express/TS wale dev ke liye
> Spring mein "integration test" ka matlab usually hota hai: real `ApplicationContext` + real DB (Testcontainers ke through) + MockMvc/WebTestClient jo controllers ko hit karta hai + kabhi-kabhi real external services bhi. Yeh unit test se bada hai, aur full E2E se chhota hai. Convention yeh hai ki inhe `*IT.java` (ya `*IntegrationTest.java`) naam dete hain, taaki build tools inhe fast unit tests se alag chala sake.

## Concept

Socho tumne Zomato jaisa food delivery backend banaya hai. Ab agar sirf `OrderService.calculateTotal()` function ka unit test likho, toh pata chalega ki math sahi hai. Lekin kya pata chalega ki jab actual HTTP request aayegi, DB mein order save hoga, aur payment gateway ko call jayega — tab sab kuch sahi se connect ho raha hai ya nahi? Yehi cheez integration test check karta hai.

Testing pyramid Spring mein aisi dikhti hai:

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

Backend services ke liye integration tests **sabse valuable** tier hai — yeh wiring bugs (bean galat inject hua), DB schema drift (migration bhool gaye), transaction issues, aur serialization problems pakadte hain jo unit tests miss kar jaate hain. Unit test mein tumne mock laga diya, sab pass ho gaya — lekin production mein jaake pata chala ki repository ka query hi galat tha. Integration test yeh gap fill karta hai.

### Maven Failsafe vs Surefire — Kyun do plugins?

Node.js mein tum `jest` ya `vitest` chala dete ho aur sab tests ek saath run ho jaate hain — chaho toh `--testPathPattern` se filter kar lo. Spring/Maven mein iske liye **do alag plugins** hain, kyunki integration tests slow hote hain (real DB spin up karte hain) aur tum unhe har `git commit` pe nahi chalana chahte:

- **Surefire** chalata hai `*Test.java` — fast, unit tests, `mvn test` command se.
- **Failsafe** chalata hai `*IT.java` — integration tests, `mvn verify` command se.

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

Gradle mein iske liye separate source set banate hain ya tag filter use karte hain.

> [!tip] Local dev vs CI
> Rozana `mvn test` chalao (fast feedback), aur CI pipeline mein `mvn verify` chalao (dono unit + integration). Bilkul waise hi jaise tum Node project mein `npm run test:unit` aur `npm run test:integration` alag rakhte ho.

## Code example

### Full integration test — controller → service → repo → real DB

Yeh sabse important pattern hai. Poore flow ko test karo — jaise ki koi real user Postman se API hit kar raha ho, order DB mein save ho raha ho, aur payment gateway (mocked) call ho raha ho:

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

**Kya ho raha hai yahan?**
- `@Testcontainers` + `@Container` + `@ServiceConnection` — Docker mein ek real Postgres container spin up hota hai, aur Spring khud-ba-khud `spring.datasource.url` set kar deta hai us container ki taraf point karke. Tumhe manually `application-test.yml` mein URL likhne ki zaroorat nahi.
- `@MockitoBean PaymentGateway gateway` — sirf **boundary** (external payment API) ko mock kiya, baaki sab real hai: real HTTP call, real service layer, real DB write. Yeh isliye zaroori hai kyunki tum production mein real Razorpay/Stripe ko har test run pe hit nahi karna chahte.
- Pehla test `placeOrder_endToEnd` teen alag layers verify karta hai ek hi test mein — HTTP response, DB state, aur external call — kyunki yehi ek real user journey hai.
- Doosra test check karta hai ki agar payment fail ho (jaise UPI declined), toh order DB mein save hi na ho — koi "ghost order" na bache.

### Cleaning state between tests — Har test ek clean slate pe chale

Socho tumne Swiggy ka test likha aur test A ne DB mein ek order chhod diya. Ab test B jab `orderRepo.count()` check karega, toh expected 0 ki jagah 1 milega — flaky test ban gaya. Isliye state cleanup zaroori hai. Teen strategies hain:

**1. `@Transactional` rollback** — Spring har test ke baad automatically rollback kar deta hai, matlab kuch bhi permanently DB mein nahi jaata. Lekin yeh tab kaam nahi karta jab test thread/transaction boundary cross kare (async, Kafka) — kyunki alag thread ussi transaction ko dekh nahi paata.

```java
@SpringBootTest
@Transactional
class FooIT { /* each test rolls back */ }
```

**2. Manual cleanup** — sabse explicit aur predictable tareeka:

```java
@BeforeEach
void clean() {
    jdbcTemplate.execute("TRUNCATE orders, items CASCADE");
}
```

**3. Database snapshots / Flyway clean** — jab schema hi reset karna ho:

```java
@Autowired Flyway flyway;
@BeforeEach
void clean() { flyway.clean(); flyway.migrate(); }
```

> [!tip] Kaunsa use karein?
> Zyada tar cases mein `@Transactional` rollback sabse fast aur simple hai. Async/Kafka involve ho toh manual cleanup pe switch karo. Flyway clean sabse slow hai — sirf tab use karo jab schema-level reset chahiye.

### `@DirtiesContext` — Last resort

```java
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class StatefulIT { ... }
```

Yeh Spring ko batata hai ki "yeh context ab gandaa (dirty) ho chuka hai, agle test class ke liye naya context banao." Matlab Spring poora `ApplicationContext` phir se boot karega — jo **bahut slow** hai (naya DB connection pool, naye beans, sab kuch). Sirf tab use karo jab koi test singleton state ko is tarah modify kar de ki usse fix karna asambhav ho.

Iska Node equivalent kuch aisa hai jaise tum poora `app` instance destroy karke naya `express()` app banao — koi bhi sensible dev roz-roz aisa nahi karega.

### Testing async / eventual behavior with Awaitility

Node mein jab tum kisi async event (jaise queue consumer) ka wait karte ho, tum `setTimeout` ya `waitFor` polling helper use karte ho. Spring mein iske liye **Awaitility** library hai:

```java
@Test
void publishesEvent() {
    service.placeOrder(new Cart(...));

    await().atMost(5, TimeUnit.SECONDS)
           .untilAsserted(() ->
               assertThat(eventStore.events()).hasSize(1));
}
```

`await()` bar-bar (default har 100ms) assertion check karta rehta hai jab tak ya toh woh pass ho jaaye, ya `atMost` time khatam ho jaaye. Isse `Thread.sleep(5000)` daalne se kaafi behtar hai — kyunki agar event 200ms mein hi publish ho jaaye, test turant pass ho jaayega, poore 5 second wait nahi karega.

### Stubbing external HTTP with WireMock

Jaise Node mein tum `nock` ya `msw` use karte ho kisi third-party API (jaise exchange rate API ya SMS gateway) ko fake karne ke liye, Spring mein **WireMock** hai:

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

`port = 0` ka matlab hai ki WireMock koi bhi free port pick kar lega (taaki tests parallel mein clash na karein). Apne client ko us WireMock port pe point karna hoga:

```yaml
exchange-rate:
  base-url: http://localhost:${wiremock.server.port}
```

> [!info] WireMock kab use karo, TestContainers ke bajaye?
> Testcontainers real infrastructure (DB, Kafka) ke liye hai. WireMock un cases ke liye hai jaha tumhe kisi **third-party HTTP API** (jise tum control nahi karte, jaise Razorpay ya SMS gateway) ko fake karna hai — bina real network call kiye.

### Tagging / filtering

```java
@Tag("integration")
class FooIT { ... }
```

```bash
mvn test -Dgroups=integration
```

Isse tum selectively sirf integration-tagged tests chala sakte ho, chahe woh `*Test.java` naming convention follow na kar rahe hon.

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

> [!warning] `@SpringBootTest` mein mutable state share mat karo
> Static singletons, in-memory caches, scheduler state — yeh sab ek hi JVM mein chal rahe tests ke beech leak ho sakte hain. Har `@BeforeEach` mein reset karo, ya `@DirtiesContext` use karo. Socho jaise Node mein tum global variable use kar rahe ho jo test files ke beech share ho raha hai — same problem.

> [!warning] `@Transactional` + async = bug factory
> Agar tumhara service `@Async` job spawn karta hai transactional test ke andar, toh async thread test ki abhi-tak-commit-na-hui data dekh nahi paayega, aur test job chalne se pehle hi rollback kar dega. Aise cases mein `@Transactional` hata do aur manually cleanup karo.

> [!danger] Cache se test pollution
> Spring `ApplicationContext` ko cache karta hai (taaki har test class ke liye naya context na banaana pade — speed ke liye). Agar test A `@Cacheable` result ko mutate kar de, toh test B flaky ho sakta hai. `@CacheEvict` use karo tests ke beech, ya `@DirtiesContext`.

> [!tip] Slow ITs ke liye alag Gradle task rakho
> Devs ko har commit pe 60 second wait mat karwao. CI mein `verify` job rakho, local mein fast `test` task.

> [!tip] Ek IT = ek real-world workflow
> "User register karta hai → email confirm karta hai → order place karta hai → cancel karta hai." Poori journey test karo, har branch nahi. Branches (edge cases) unit tests mein jaate hain. IRCTC ka pura ticket-booking-se-cancellation tak ka flow test karna hai, har possible seat combination nahi.

## Related
- [[04-Spring-Boot-Test]]
- [[05-MockMvc-and-WebTestClient]]
- [[06-Testcontainers]]
- [[08-Test-Profiles-and-Properties]]
- [[../12-Observability/01-Logging|Logging in tests]]
