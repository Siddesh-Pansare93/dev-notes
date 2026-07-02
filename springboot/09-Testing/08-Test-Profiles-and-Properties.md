# Test Profiles and Properties

> [!info] Express/TS wale dev ke liye
> Node mein tum `NODE_ENV=test` set karte ho aur ek alag `.env` file load karte ho. Spring mein tum ek **profile** (`test`) activate karte ho jo `application-test.yml` aur `@Profile("test")` wale beans select kar leta hai. Aur uske upar, individual tests ke liye surgical overrides bhi milte hain (`@TestPropertySource`, `@DynamicPropertySource`) — matlab ek-ek test ka config bhi fine-tune kar sakte ho.

## Concept

Kya hota hai? Test config ke 3 layers hote hain, precedence order mein (jo baad mein aata hai, woh jeetta hai):

1. **`application.yml`** + **`application-test.yml`** — base config, jisko `test` profile override karta hai.
2. **`@TestPropertySource`** — class-level overrides. Ek specific test class ke liye kuch values badalni hain? Yahi use hoga.
3. **`@DynamicPropertySource`** — programmatic overrides (jaise Testcontainer ka URL, jo runtime pe hi pata chalta hai).
4. **`@SpringBootTest(properties = ...)`** — inline overrides, seedha annotation mein.

Socho isko ek priority queue jaisa — jaise Zomato mein agar tumne "no onion" preference set ki hai globally, par order karte waqt "extra onion" bola, toh order-level preference jeetegi. Yahan bhi last layer (most specific) sabse zyada priority leta hai.

## Code example

### Profile-based config

Kyun zaruri hai? Production mein tum real Postgres DB use karna chahte ho, lekin tests mein har baar real DB hit karna slow aur risky hai. Isliye ek alag "test" profile banate hain jisme fake/in-memory setup ho.

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

Isko test mein activate karo:

```java
@SpringBootTest
@ActiveProfiles("test")
class FooIT { ... }
```

Bas itna karne se Spring automatically `application-test.yml` ko `application.yml` ke upar merge kar dega, aur tumhare tests H2 in-memory DB use karenge, prod Postgres nahi.

### `@TestPropertySource`

Kya hota hai? Kabhi kabhi poore profile ki zarurat nahi hoti, bas 1-2 property values ek specific test ke liye badalni hoti hain. Uske liye `@TestPropertySource` use karo — ekdum surgical strike jaise.

```java
@SpringBootTest
@TestPropertySource(properties = {
    "feature.new-checkout=true",
    "external.api.timeout=100ms"
})
class CheckoutFeatureFlagTest { ... }
```

Ya phir ek poori properties file bhi load kar sakte ho:

```java
@TestPropertySource(locations = "classpath:test-overrides.properties")
```

### `@DynamicPropertySource` — runtime values ke liye

Kyun zaruri hai? Testcontainers jab ek Postgres/Kafka/Redis container spin karte hain, toh unka port random hota hai — pehle se pata nahi hota. Isliye compile-time pe hardcode nahi kar sakte, runtime pe hi register karna padta hai.

```java
@DynamicPropertySource
static void registerProps(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", postgres::getJdbcUrl);
    registry.add("spring.kafka.bootstrap-servers", kafka::getBootstrapServers);
    registry.add("redis.host", redis::getHost);
    registry.add("redis.port", () -> redis.getMappedPort(6379));
}
```

Iska use karo kisi bhi aisi value ke liye jo test khud runtime pe discover karta hai — Testcontainer ke random ports, random server ports, generated secrets, waghera.

### `@SpringBootTest(properties = ...)`

Ye sabse quick tarika hai — inline hi properties de do, bina koi alag file banaye:

```java
@SpringBootTest(properties = {
    "logging.level.root=warn",
    "spring.task.execution.pool.core-size=1"
})
class QuietTest { ... }
```

### Profile-specific beans

Kya hota hai? `@Profile` annotation lagakar tum bata sakte ho ki koi bean sirf kis profile mein load hoga. Jaise Zomato ka "test mode" order pe real restaurant ko notification nahi bhejta, ek dummy/mock service use karta hai.

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

Ab `@ActiveProfiles("test")` lagate hi Spring automatically in-memory wala implementation pick kar lega, real SES email service nahi.

### Multi-profile composition

Ek se zyada profiles ek saath bhi activate kar sakte ho — jaise "test" + "test-kafka" dono chalu:

```java
@ActiveProfiles({"test", "test-kafka"})
class KafkaIT { ... }
```

### Environment variables in tests

`@SpringBootTest` tumhare shell ka `.env` khud se nahi padhta — lekin ye tarike use kar sakte ho:

```java
@SpringBootTest
@TestPropertySource(properties = "API_KEY=test-key")
class FooTest { ... }
```

Ya phir JUnit Pioneer ka `@SetEnvironmentVariable` use karo agar tumhe *actual* env variable chahiye (na ki Spring property).

### Random ports

Kyun zaruri hai? Jab parallel mein multiple test JVMs chal rahe hon, toh fixed port (jaise 8080) clash kar sakta hai. Random port lene se ye problem solve ho jaati hai.

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

Bilkul waise hi jaise Node mein `app.listen(0)` karke `server.address().port` se actual port nikaalte ho.

### `application-test.yml` patterns

Ek real-world test config kaisa dikhta hai, dekho:

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

Dekho yahan pattern kya hai — payment gateway disable, email ko "noop" provider, retries ko 1 attempt tak limit — matlab jitna ho sake, real duniya se door rakho tests ko, taaki fast aur predictable rahen.

### Profile groups (Boot 2.4+)

Kya hota hai? Agar tumhe baar-baar 3-4 profiles ek saath activate karne padte hain, toh unko ek "group" mein bandh sakte ho — jaise ek combo meal jisme burger + fries + coke sab saath aata hai.

```yaml
spring:
  profiles:
    group:
      local: ["dev", "h2", "verbose-logging"]
      ci:    ["test", "testcontainers"]
```

Ab sirf `local` activate karo, aur Spring apne aap teeno (`dev`, `h2`, `verbose-logging`) activate kar dega.

### `@TestConfiguration` for test-only beans

Kya hota hai? Agar tumhe kuch beans sirf test ke liye chahiye (production code mein unka koi matlab nahi), toh unko `@TestConfiguration` mein rakho.

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
| `@TestPropertySource(properties=...)` | `beforeAll` mein `process.env` override karna |
| `@DynamicPropertySource` | Testcontainers start karne ke baad ek config object banana |
| `@Profile("!test")` beans | `if (process.env.NODE_ENV === "test") { ... }` |
| `@LocalServerPort` | `app.listen(0)` phir `server.address().port` |
| Profile groups | composite env loaders |

Spring ka approach zyada declarative aur discoverable hai — sab kuch annotations mein saaf-saaf dikh jaata hai. Node ka approach "bas JS hai" wala hai, zyada flexible lekin kam structured.

## Gotchas

> [!warning] `application.yml` precedence samajh lo
> Spring bahut saari jagah se config load karta hai. `application.yml` mein secrets mat daalo ye soch ke ki test override kar dega — `@TestPropertySource` toh karta hai, lekin tumhare shell ke env vars bhi *leak* ho sakte hain andar. Intentional raho, guess mat karo.

> [!warning] Context cache invalidation ka dhyaan rakho
> Har unique `@TestPropertySource` / `@ActiveProfiles` / `@MockitoBean` combination ek naya Spring context banata hai. Agar tests mein ye combinations alag-alag hote rahe, toh bahut saare cached contexts ban jaate hain — matlab slow tests aur OOM (out of memory) errors. Isliye standardize karo, jitna ho sake same config reuse karo.

> [!danger] Real credentials kabhi bhi test resources mein mat daalo
> `application-test.yml` git mein commit karna theek hai agar usme fake values hain, lekin real API keys ya passwords daalna khatarnak hai. CI mein environment-injected secrets use karo, hardcoded nahi.

> [!tip] `@AutoConfigureTestDatabase(replace = NONE)` use karo
> Ye Spring ko rokta hai automatically tumhara DataSource H2 se replace karne se — jab tumhe genuinely configured DB chahiye ho (jaise Testcontainers ke saath).

> [!tip] CI mein config validate karo
> `mvn test --fail-on-warning` chalane se `@Value("${missing.prop}")` jaisi typos jaldi pakdi jaati hain, production mein jaane se pehle hi.

## Related
- [[06-Testcontainers]]
- [[07-Integration-Testing]]
- [[../05-Spring-Boot/04-Profiles|Profiles in production]]
- [[../05-Spring-Boot/05-Externalized-Configuration|Externalized config]]
