# Library Cheatsheet

> [!info] Express/TS wale dev ke liye
> npm ecosystem mein tumne dekha hoga — chhote-chhote packages, sab kuch `left-pad` jaisa granular. Java/Spring ka ecosystem uske ulta hai: kam packages, but har ek bada aur "sticky" — matlab ek baar choose kar liya (say Jackson ya Hibernate), toh poori codebase usi pe depend karegi, easily switch nahi hoga. Isliye Java devs library choose karne mein zyada time lagate hain.
>
> Ye file tumhara "iska Java equivalent kya hai?" wala lookup table hai. Jab bhi kisi naye Spring Boot project mein koi dependency dikhe aur samajh na aaye "ye kaam kya karta hai", isi file pe wapas aa jaana.

## Boilerplate reduction

**Kyun zaruri hai?** Java verbose language hai — ek simple `User` class banane ke liye getters, setters, constructor, `equals()`, `hashCode()`, `toString()` sab manually likhna padta tha pehle. Ye libraries wahi boring kaam automate kar deti hain, jaise TypeScript mein tum `interface` likh ke type-safety free mein pa jaate ho.

| Library | Purpose | Node analog |
|---------|---------|-------------|
| **Lombok** | Getters, setters, builders, constructors — sab annotation se generate ho jaate hain (`@Data`, `@Builder`) | `lodash` + class transformers |
| **MapStruct** | Compile-time pe DTO ↔ Entity mapping generate karta hai (koi runtime reflection nahi, isliye fast) | `class-transformer` |
| **Records** (JDK 14+) | Immutable data classes — built-in hai, koi library chahiye hi nahi | TS `readonly` types |

> [!tip] Agar Java 16+ use kar rahe ho toh simple immutable DTOs ke liye `record` use karo, Lombok nahi — kyunki ye JDK ka native feature hai, extra dependency ki zarurat nahi.

See [[02-Lombok]], [[03-MapStruct]].

## JSON / serialization

**Kya hota hai?** Jaise Express mein `JSON.stringify()`/`JSON.parse()` free mein milta hai, Java mein JSON handling ke liye dedicated library chahiye hoti hai — kyunki Java strongly-typed hai aur object ↔ JSON conversion complex ho sakta hai (nested objects, dates, generics waghera).

| Library | Purpose |
|---------|---------|
| **Jackson** | JSON ser/deser — Spring Boot ka default, sabse zyada use hota hai |
| **Gson** | Google ka alternative — simpler API, lekin features kam |
| **JSON-B** | Jakarta ka official standard, but industry mein kam adoption |
| **Moshi** | Kotlin-friendly JSON library |

> [!info] Spring Boot mein `spring-boot-starter-web` add karte hi Jackson automatically aa jaata hai — tumhe alag se add karne ki zarurat nahi.

See [[04-Jackson-Deep-Dive]].

## Logging

**Kyun zaruri hai?** `console.log()` production apps ke liye kaafi nahi hai — tumhe log levels (DEBUG/INFO/WARN/ERROR), file rotation, structured JSON output, aur alag-alag output destinations (console, file, ELK stack) chahiye hote hain. Java mein ye do layers mein split hai: ek "facade" (interface) aur ek "implementation".

| Library | Purpose |
|---------|---------|
| **SLF4J** | Logging ka facade (interface) — ye khud kuch nahi karta, sirf ek contract deta hai |
| **Logback** | SLF4J ka actual implementation, Spring Boot default |
| **Log4j2** | Alternative implementation, async-by-default (zyada throughput) |
| **logstash-logback-encoder** | Logback ke logs ko JSON format mein output karta hai (ELK/Grafana ke liye) |

> [!warning] Log4j2 use kar rahe ho toh version updated rakho — Log4Shell (CVE-2021-44228) jaisa massive vulnerability isi library mein tha. Dependency versions pe hamesha nazar rakho.

See [[03-Logging-Best-Practices]].

## HTTP clients

**Kya hota hai?** Node mein `axios` ya `fetch` se ek line mein API call kar lete ho. Java mein historically ye kaafi verbose tha — isliye alag-alag abstraction levels pe multiple clients ban gaye.

| Library | Purpose |
|---------|---------|
| **RestClient** (Spring 6.1+) | Modern sync HTTP client — naye projects ke liye ye hi use karo, `axios` jaisa clean feel deta hai |
| **WebClient** | Reactive/async HTTP client (Project Reactor pe based) — jab non-blocking chahiye |
| **RestTemplate** | Legacy sync client — kaam karta hai, but maintenance mode mein hai, naye code mein mat use karo |
| **Feign** (Spring Cloud OpenFeign) | Interface likho, ye automatically HTTP call bana deta hai — declarative style, jaise TS mein typed API client generate karna |
| **OkHttp** | Square ka low-level client, bahut performant |
| **Apache HttpClient** | Purana, battle-tested, low-level client |

> [!tip] Agar naya code likh rahe ho aur reactive/WebFlux nahi use kar rahe, `RestClient` pick karo. Ye Spring 6.1+ ka naya default hai aur `RestTemplate` se kaafi cleaner API deta hai.

## Validation

**Kyun zaruri hai?** Jaise tum Express mein `zod` ya `joi` se request body validate karte ho (`z.string().email()`), Java mein annotations se ye same kaam hota hai — `@NotNull`, `@Email`, `@Size(min=8)` waghera class fields pe laga do aur validation automatic ho jaati hai.

| Library | Purpose |
|---------|---------|
| **Hibernate Validator** | Jakarta Bean Validation ka reference implementation (`@NotNull`, `@Email`, etc.) |
| **spring-boot-starter-validation** | Isse add karte hi upar wali library auto-wire ho jaati hai |

## Persistence

**Kya hota hai?** Database se baat karne ka poora ecosystem. Node mein Prisma/TypeORM/Sequelize jaisa hi socho, bas yahan options zyada granular hain — kuch full ORM hain, kuch sirf SQL-builder.

| Library | Purpose |
|---------|---------|
| **Spring Data JPA** | Repository abstraction — Prisma ke repository pattern jaisa, boilerplate CRUD khud handle karta hai |
| **Hibernate** | Sabse popular JPA implementation — actual ORM engine jo SQL generate karta hai |
| **Flyway / Liquibase** | DB migrations — jaise Prisma Migrate ya Knex migrations |
| **jOOQ** | Type-safe SQL DSL — jab JPA/ORM overhead nahi chahiye aur raw SQL pe control chahiye |
| **MyBatis** | XML-driven SQL mapper — purane enterprise projects mein milta hai |
| **HikariCP** | Connection pool — Spring Boot ka default, bahut fast |
| **mssql-jdbc** | Microsoft SQL Server ka JDBC driver — see [[../07-Data-JPA/12-MSSQL-Setup]] |
| **postgresql** / **mysql-connector-j** | Baaki common JDBC drivers |
| **R2DBC** (`r2dbc-postgresql`, `r2dbc-mssql`) | Reactive (non-blocking) SQL drivers — WebFlux ke saath use karne ke liye |

> [!warning] JDBC drivers blocking hote hain — agar WebFlux/reactive stack use kar rahe ho toh normal `postgresql` driver kaam nahi karega thread-blocking ki wajah se. Us case mein R2DBC chahiye.

## Caching

**Kyun zaruri hai?** Bar-bar database hit karna expensive hai — jaise Zomato apne restaurant listings ko har request pe DB se nahi, cache se serve karta hai. Java mein caching ke multiple flavors hain — in-memory (single instance) vs distributed (multiple instances share karte hain).

| Library | Purpose |
|---------|---------|
| **Caffeine** | High-performance in-memory cache — `spring-boot-starter-cache` ka default |
| **Ehcache** | Purana option, disk overflow support karta hai |
| **Redis** (via Spring Data Redis) | Distributed cache — multiple app instances ke beech shared, jaise Node projects mein bhi Redis use hota hai |
| **Hazelcast** | Distributed in-memory data grid |

## Resilience

**Kya hota hai?** Socho tumhara payment service kisi third-party API (jaise Razorpay) ko call kar raha hai aur woh API down ho gaya. Bina resilience patterns ke, tumhara poora system slow ho jaayega ya crash ho jaayega. Ye libraries circuit breaker, retry, rate limiting jaisi patterns implement karne mein help karti hain.

| Library | Purpose |
|---------|---------|
| **Resilience4j** | Circuit breaker, retry, rate limiter, bulkhead — modern aur lightweight, industry standard hai ab |
| **Spring Retry** | Sirf retry annotations chahiye ho toh ye kaafi hai |
| ~~Hystrix~~ | Deprecated — Netflix ne band kar diya, Resilience4j use karo |

See [[02-Resilience4j-Circuit-Breakers]].

## Messaging

**Kyun zaruri hai?** Jab ek service ko dusri service ko async message bhejna ho (jaise order place hone pe notification service ko event bhejna), message brokers use hote hain — Kafka, RabbitMQ waghera. Spring inke liye clean abstraction deta hai.

| Library | Purpose |
|---------|---------|
| **spring-kafka** | Kafka producer/consumer integration |
| **spring-amqp** | RabbitMQ integration |
| **spring-cloud-stream** | Kafka/RabbitMQ dono ke upar ek common abstraction |

## Testing

**Kya hota hai?** Node mein Jest ek hi library sab kuch (runner + assertions + mocking) handle kar leta hai. Java mein ye responsibilities alag-alag libraries mein split hain — thoda zyada setup lagta hai, but har piece specialized hai.

| Library | Purpose |
|---------|---------|
| **JUnit 5 (Jupiter)** | Test framework — Jest ka test runner equivalent |
| **AssertJ** | Fluent assertions (`assertThat(x).isEqualTo(...)`) — jaise Jest ka `expect()` |
| **Mockito** | Mocking library — Jest ke `jest.mock()` jaisa |
| **Testcontainers** | Real Docker containers spin up karke unke against test likhna (real Postgres, real Kafka) |
| **WireMock** | HTTP service stub karne ke liye — MSW (Mock Service Worker) jaisa |
| **REST Assured** | Fluent HTTP test DSL — API endpoints test karne ke liye |
| **Awaitility** | Async operations ke assertions ke liye (jab tak condition true na ho, wait karo) |

> [!tip] Testcontainers use karo jab bhi possible ho — H2 jaise in-memory fake DB pe test karne se better hai real Postgres container pe test karna, kyunki production behavior match karta hai.

## Utilities

**Kyun zaruri hai?** Har language mein ek "helper functions" library hoti hai — Node mein `lodash`, Java mein ye options hain.

| Library | Purpose | Node analog |
|---------|---------|-------------|
| **Apache Commons Lang3** | StringUtils, ObjectUtils, etc. | `lodash` |
| **Guava** | Immutable collections, Optional, caches | `lodash` + `immutable` |
| **Vavr** | Functional types (Try, Either, immutable collections) | `fp-ts` |
| **java-uuid-generator** | Time-ordered UUIDs (sortable, jaise ULID) | `uuid` |

## Security

**Kya hota hai?** Auth, authorization, JWT, encryption — sab kuch ek hi umbrella project (Spring Security) ke around organized hai, jo NestJS ke Passport.js integration jaisa feel deta hai but zyada powerful aur zyada configuration-heavy.

| Library | Purpose |
|---------|---------|
| **Spring Security** | Auth/authz ka poora framework — filters, login flows, method-level security sab kuch |
| **java-jwt** (Auth0) | JWT banane/parse karne ki library |
| **nimbus-jose-jwt** | JWT/JOSE library — Spring Security internally isko use karta hai |
| **Bouncy Castle** | Low-level crypto primitives |

## Async / reactive

**Kyun zaruri hai?** Node inherently single-threaded aur event-loop based hai — async by default. Java traditionally thread-per-request model use karta hai (blocking). Reactive stack Java mein Node jaisa non-blocking, event-driven model laane ke liye bana.

| Library | Purpose |
|---------|---------|
| **Spring WebFlux** | Netty pe based reactive web stack — see [[../06-Web-REST/13-WebFlux-Reactive]] |
| **Project Reactor** | `Mono` / `Flux` — WebFlux ka backbone, RxJS ke `Observable` jaisa feel deta hai |
| **RxJava** | Older reactive library, abhi bhi kaafi jagah use hoti hai |
| **Coroutines (Kotlin)** | Agar kabhi Kotlin pe shift karo toh ye async ka native tarika hai |

> [!warning] WebFlux seekhne se pehle regular Spring MVC (blocking) achhe se samajh lo. Reactive programming ka mental model bahut different hai — mixing blocking code reactive stack mein performance disaster bana sakta hai.

## Build / dev tools

**Kya hota hai?** Development experience improve karne wale tools — code formatting, live reload, static analysis.

| Tool | Purpose |
|------|---------|
| **Spring Boot DevTools** | Dev ke time live reload — `nodemon` jaisa |
| **Spotless** | Code formatter — Prettier jaisa |
| **JaCoCo** | Code coverage report |
| **Checkstyle / PMD / SpotBugs** | Static analysis — ESLint jaisa, bugs aur style issues pehle hi pakad lete hain |
| **Error Prone** | Google ka static analyzer, common bug patterns detect karta hai |

## Observability

**Kyun zaruri hai?** Production mein pata chalna chahiye ki system kaisa perform kar raha hai — latency, error rate, request traces. Ye "observability ka holy trinity" hai: metrics, tracing, logs.

| Library | Purpose |
|---------|---------|
| **Micrometer** | Metrics ka facade (interface) — Prometheus/Datadog waghera ke liye vendor-neutral layer |
| **Micrometer Tracing** | Distributed tracing ka facade |
| **OpenTelemetry** | Vendor-neutral telemetry standard — industry ab isi pe converge kar rahi hai |

## Key Takeaways

- Java ecosystem npm se kam granular hai — libraries badi hoti hain aur ek baar choose karne ke baad switch karna costly hota hai, isliye shuru mein hi sahi choice karo.
- Naye projects mein: **RestClient** (HTTP), **Resilience4j** (resilience), **Testcontainers** (testing), **OpenTelemetry** (observability) — ye modern defaults hain, legacy alternatives (RestTemplate, Hystrix) avoid karo.
- Spring Boot starters (`spring-boot-starter-*`) bahut sa "kaunsi library use karu" decision khud le lete hain — jaise `spring-boot-starter-web` Jackson bhi le aata hai.
- Facade vs implementation ka pattern samajhna zaruri hai — SLF4J (facade) + Logback (implementation), Micrometer (facade) + Prometheus/Datadog (backend). Isse tum implementation switch kar sakte ho bina application code change kiye.
- Reactive stack (WebFlux, R2DBC, Project Reactor) sirf tab use karo jab genuinely high-concurrency, non-blocking I/O chahiye ho — warna normal Spring MVC + JDBC simpler aur maintainable rehta hai.

## Related
- [[02-Lombok]]
- [[03-MapStruct]]
- [[04-Jackson-Deep-Dive]]
- [[01-Maven-Basics]]
- [[02-Gradle-Basics]]
