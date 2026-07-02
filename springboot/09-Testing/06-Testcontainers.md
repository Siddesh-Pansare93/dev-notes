# Testcontainers

> [!info] Express/TS wale dev ke liye
> Testcontainers ek Docker container (Postgres, Kafka, Redis, Mongo, jo bhi chahiye) real mein spin up kar deta hai tumhare test ke duration ke liye. Bilkul wahi `testcontainers` library jo Node mein bhi available hai — same concept, bas yahan native Java integration hai. Ab H2 pe test karke Postgres hone ka natak karna band karo.

## Concept

Socho tumhara test ek **real** Postgres Docker mein start karta hai, tumhari app ko usi se point kar deta hai, test run karta hai, aur phir sab kuch clean kar deta hai. Bas — ab wo classic excuse nahi chalega ki "mere test H2 pe pass ho rahe the but production mein Postgres ke DDL semantics alag hone ki wajah se fail ho gaye."

Kya hota hai asal mein? Jab tum H2 (in-memory DB) pe test likhte ho, wo Postgres jaisa *dikhta* hai, lekin waisa *behave* nahi karta — JSONB columns, partial indexes, specific functions, sab kuch different hai. Testcontainers ye gap khatam kar deta hai kyunki tum literal wahi Postgres image use karte ho jo prod mein chalti hai.

Teen tarike se integrate kar sakte ho:

1. **JUnit 5 extension** — `@Testcontainers` + `@Container`.
2. **Spring Boot 3.1+ `@ServiceConnection`** — container ka URL/credentials Spring properties mein khud-ba-khud wire ho jaate hain. Ekdum magic hai.
3. **Singleton container** — poore JVM ke liye ek baar start karo, saare test classes mein reuse karo.

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

Kyun zaruri hai? Kyunki pehle tumhe manually `spring.datasource.url`, `username`, `password` set karna padta tha. `@ServiceConnection` ye sab automatically kar deta hai — container dekh ke samajh jaata hai ki ye Postgres hai ya Kafka ya Redis, aur uske hisaab se properties inject kar deta hai.

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

Bas itna hi. `@ServiceConnection` container ka type introspect karta hai aur `spring.datasource.url`, `username`, `password` khud register kar deta hai. Same trick Kafka, Mongo, Redis, Cassandra sab pe kaam karti hai.

### Pre-3.1 / manual property override

Agar tum Spring Boot 3.1 se pehle ke version pe ho, to itna magic nahi milega — manually `@DynamicPropertySource` use karke properties register karni padengi. Socho isko UPI ka manual bank account link karna — kaam ho jaata hai, bas ek extra step lagta hai.

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

### Singleton pattern (faster — ek baar start karo)

Har test class apna alag Postgres container start kare to test suite bahut slow ho jaayega — Zomato ke restaurant onboarding jaisa, agar har order ke liye naya restaurant register karna pade to system crawl karega. Isliye ek shared container banao jo saare test classes use karein.

```java
public abstract class AbstractIntegrationTest {

    static final PostgreSQLContainer<?> POSTGRES =
        new PostgreSQLContainer<>("postgres:16-alpine");

    static {
        POSTGRES.start();   // ek baar start hota hai, kabhi stop nahi hota (JVM exit pe cleanup ho jaata hai)
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
class UserIT  extends AbstractIntegrationTest { /* same Postgres share karta hai */ }
```

### Multiple containers — full integration

Kya karna hai agar tumhe DB + Kafka + Redis sab ek saath real mein chahiye taaki poora flow test ho sake? Bas sabko `@Container @ServiceConnection` laga do — Spring khud sab wire kar dega.

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
        // real DB, real Kafka, real Redis — full path test, koi mocking nahi
        service.place(new Cart(...));
    }
}
```

Ye Swiggy ke order placement flow ki tarah hai — DB mein order save hua, Kafka pe event publish hua, Redis mein cache update hua — sab kuch ek hi test mein real components ke saath verify ho jaata hai.

### `application.yml` — JDBC URL prefix se Testcontainers point karo

Ek neat trick: JDBC URL ke aage `tc:` laga do aur Testcontainers khud control le leta hai.

```yaml
spring:
  datasource:
    url: jdbc:tc:postgresql:16-alpine:///mydb
    driver-class-name: org.testcontainers.jdbc.ContainerDatabaseDriver
```

Test code mein koi change nahi chahiye — lekin control kam milta hai (container lifecycle pe fine-grained access nahi milta).

### Reusable containers (local dev loops fast karne ke liye)

```java
postgres.withReuse(true);
```

`~/.testcontainers.properties` mein:

```
testcontainers.reuse.enable=true
```

Container JVM runs ke beech persist karta hai — locally huge speedup milta hai kyunki baar-baar container start/stop nahi hota. CI mein isko enable mat karo — waha tumhe clean state chahiye, warna ek test run ka data agle run ko pollute kar dega.

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

Phir `./mvnw spring-boot:test-run` chalao (Gradle mein `bootTestRun`) — tumhari app test containers ke saath start ho jaayegi. Ye us fiddly `docker-compose.dev.yml` ka replacement hai jo local dev ke liye Postgres/Kafka manually spin up karne ke liye likhte the.

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
| `withReuse(true)` | Node lib mein bhi yahi flag exist karta hai |

Java ka tooling zyada declarative hai — annotations laga do, baaki Spring sambhal leta hai. Node ka approach zyada imperative hai lekin flexible bhi — tumhe khud control milta hai ki kab start/stop karna hai.

## Gotchas

> [!warning] Docker chahiye hi chahiye
> Test runner ko Docker (ya Podman, Colima, Rancher) chahiye. CI mein docker-in-docker setup ya remote socket hona zaruri hai. GitHub Actions ke Linux runners mein ye pre-installed hota hai, so usually koi dikkat nahi aati.

> [!warning] Container startup time lagta hai
> Postgres ≈ 2-3 second. Kafka ≈ 5-15 second. Agar har test class apna naya container start kare to ye time multiply ho jaayega. **Singleton** ya **reuse** use karo taaki ye cost baar-baar na chukani pade.

> [!warning] Ryuk side-container
> Testcontainers ek "Ryuk" naam ka helper container spawn karta hai jo JVM exit hone ke baad dangling containers clean karta hai. Kuch restricted CI environments isko block kar dete hain — waha `TESTCONTAINERS_RYUK_DISABLED=true` set karo (aur cleanup khud handle karo).

> [!danger] Singleton mein tests ke beech state share mat karo
> Agar 50 tests ek hi Postgres share kar rahe hain, to ek test ka data agle test ko pollute kar dega — jaise ek customer ka cart dusre customer ko dikhne lag jaaye. `@Transactional` rollback use karo, `@AfterEach` mein tables truncate karo, ya Flyway/Liquibase se clean karo — lekin **plan karke** rakho, accident se mat hone do.

> [!tip] Image versions pin karo
> `postgres:latest` ek din tumhare tests tod dega jab naya version aayega aur behavior change ho jaayega. Hamesha `postgres:16-alpine` jaisa specific version pin karo.

> [!tip] H2 tabhi use karo jab speed > fidelity ho
> Agar tumhare repository tests vendor-specific SQL, JSONB, partial indexes waghera use karte hain — H2 tumse jhooth bolega ki sab sahi hai. Testcontainers + real Postgres asli bugs pakadega jo H2 kabhi nahi pakad payega.

## Related
- [[04-Spring-Boot-Test]]
- [[07-Integration-Testing]]
- [[08-Test-Profiles-and-Properties]]
- [[../07-Data-JPA/01-JPA-Hibernate-Overview|JPA]]
- [[../11-Messaging/03-Spring-Kafka|Spring Kafka — KafkaContainer se test karo]]

## Key Takeaways
- Testcontainers real Docker containers (Postgres, Kafka, Redis, Mongo) spin up karta hai test ke duration ke liye — H2 jaisi fake DB pe bharosa karna band karo.
- `@ServiceConnection` (Spring Boot 3.1+) sabse aasan tarika hai — container ka URL/credentials automatically wire ho jaate hain, koi manual property setting nahi.
- Pre-3.1 mein `@DynamicPropertySource` use karo manual wiring ke liye.
- Singleton container pattern se saare test classes ek hi container share karte hain — test suite fast rehta hai.
- Multiple containers ek saath use karke full integration test likh sakte ho (DB + Kafka + Redis).
- `withReuse(true)` local dev ke liye speedup deta hai, lekin CI mein isse avoid karo — clean state chahiye hoti hai.
- Docker zaruri hai test runner ke liye — CI mein docker-in-docker ya remote socket set karna padega.
- Container startup time (khaaskar Kafka ka) ignore mat karo — singleton/reuse se optimize karo.
- Singleton container mein tests ke beech state pollution se bachne ke liye transactional rollback ya cleanup strategy plan karo.
- Image versions hamesha pin karo (`postgres:16-alpine`), `:latest` kabhi use mat karo tests mein.
