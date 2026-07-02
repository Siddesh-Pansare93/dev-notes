# DataSource & Connection Pool

> [!info] Express/TS dev ke liye
> Node mein `pg.Pool` woh connection pool hai jo tum khud configure karte ho (`max: 20`). Spring Boot mein **HikariCP** default pool hai — jaise hi tum JDBC driver add karte ho, Spring Boot khud-ba-khud isko auto-configure kar deta hai. Development ke defaults theek-thaak hain, lekin production mein tuning (`maximum-pool-size`, timeouts) seedha tumhari latency aur load ke neeche crash hone ke behavior ko affect karti hai.

## Concept / Ye kaam kaise karta hai?

Socho Zomato ka delivery fleet hai. Har order pe naya delivery boy hire karna, train karna, bike dena — bohot slow aur expensive hota. Isliye Zomato ke paas already ek pool of riders hota hai jo ready-to-go rehte hain, order aate hi assign ho jaate hain.

Connection pool bhi exactly yehi karta hai — database ke saath kuch physical connections already khole rakhta hai aur jab bhi koi thread ko DB se baat karni ho, pool se ek connection udhaar de deta hai, kaam khatam hone pe wapas le leta hai. Agar pooling na ho, toh **har single query** ke liye naya TCP connection banega + authentication hoga + (agar SSL hai toh) TLS handshake hoga — ye sab itna heavy hai ki web app ke liye practically fatal hai. Har request pe naya rider hire karna jaisa hai.

**HikariCP** — Spring Boot 2.0 se lekar ab tak ka default pool — JVM ecosystem ka sabse fast connection pool hai. Bas `spring-boot-starter-data-jpa` add karo, Spring Boot properties se khud HikariCP ko auto-configure kar dega. Tumhe manually kuch bhi wire-up nahi karna.

## Code example — typical configuration

`pom.xml` — sirf driver dena hoga, HikariCP already `spring-boot-starter-data-jpa` ke andar bundled aata hai:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <scope>runtime</scope>
</dependency>
```

`application.yml`:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/acme
    username: acme
    password: ${DB_PASSWORD}
    driver-class-name: org.postgresql.Driver

    hikari:
      pool-name: acme-pool
      maximum-pool-size: 20             # peak par ek saath max kitne DB connections
      minimum-idle: 5                   # itne connections hamesha warm/ready rakhne hain
      connection-timeout: 30000         # connection milne ka max wait time (ms), default 30s
      idle-timeout: 600000              # 10 min — idle padi connections close kar do
      max-lifetime: 1800000             # 30 min — chalu connection ko bhi recycle karo
      leak-detection-threshold: 60000   # agar connection 60s se zyada hold hai toh log karo
      auto-commit: false                # JPA ko transaction pe khud control chahiye
      data-source-properties:
        ApplicationName: acme-api
        socketTimeout: 30
        loginTimeout: 10
        tcpKeepAlive: true
        reWriteBatchedInserts: true     # PostgreSQL: multiple INSERTs ek round-trip mein batch karo
```

Yaha `maximum-pool-size` woh limit hai — Zomato ke uss "peak-hour riders" wali limit jaisa. `minimum-idle` matlab kitne riders bina order ke bhi standby pe rakhne hain taaki sudden demand pe turant available ho.

### Multiple DataSources

Kabhi kabhi ek hi app ko do alag databases se baat karni padti hai — jaise primary DB (writes ke liye) aur ek reporting/replica DB (heavy read-only analytics queries ke liye, jisse primary DB pe load na aaye). Ye bilkul aise hai jaise Swiggy apne order-processing DB ko alag rakhta hai aur analytics/dashboard queries ko replica se serve karta hai — taaki koi bhi bhaari report query, live orders ko slow na kare.

```java
@Configuration
public class DataSourceConfig {

    @Primary
    @Bean
    @ConfigurationProperties("spring.datasource.primary")
    public DataSourceProperties primaryProps() { return new DataSourceProperties(); }

    @Primary
    @Bean
    public DataSource primaryDataSource(DataSourceProperties p) {
        return p.initializeDataSourceBuilder().type(HikariDataSource.class).build();
    }

    @Bean
    @ConfigurationProperties("spring.datasource.reporting")
    public DataSourceProperties reportingProps() { return new DataSourceProperties(); }

    @Bean
    public DataSource reportingDataSource(@Qualifier("reportingProps")
                                          DataSourceProperties p) {
        return p.initializeDataSourceBuilder().type(HikariDataSource.class).build();
    }
}
```

`application.yml`:

```yaml
spring:
  datasource:
    primary:
      url: jdbc:postgresql://primary/acme
      hikari: { maximum-pool-size: 20 }
    reporting:
      url: jdbc:postgresql://replica/acme
      hikari: { maximum-pool-size: 5 }
```

## Pool ka size kitna rakhein?

> "The pool should be small. Smaller than you think." — HikariCP wiki

Bohot log sochte hain "zyada connections = zyada speed", but ye ulta sach hai. Zyada connections matlab DB pe zyada context-switching, zyada lock contention — jaise Zomato agar ek chhoti si gali mein 100 delivery bikes ek saath bhej de, sab jaam mein phas jaayenge. Kam bikes but achhi tarah manage ki hui, zyada fast deliver karengi.

HikariCP docs ka formula:

```
connections = (cores * 2) + effective_spindle_count
```

Aajkal ke SSD-based PostgreSQL setup ke liye typically **~10-30 connections** per app instance kaafi hota hai. Blindly 100 tak mat badhao — thrash karoge, performance improve nahi hogi, ulta gir jaayegi.

Ye bhi dhyaan rakho:
- DB ki apni max connection limit (PostgreSQL ka default `max_connections = 100`)
- Tumhare app ke kitne instances chal rahe hain: `app_instances × pool_size ≤ db_max_connections - reserved`

Matlab agar tumhare 5 app instances hain aur har ek ka pool size 20 hai, toh DB pe 100 connections ki demand aa jaayegi — jo default limit ko hi khatam kar degi. Isliye pool size ko instance count ke saath milaake plan karo.

## Monitoring — Kya ho raha hai pool ke andar, kaise pata chale?

### Actuator metrics

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health, info, metrics, prometheus
  metrics:
    enable:
      hikaricp: true
```

Important Micrometer metrics:
- `hikaricp.connections.active` — abhi kitne connections use ho rahe hain
- `hikaricp.connections.idle` — kitne free/idle pade hain
- `hikaricp.connections.pending` ← agar ye baar-baar non-zero aa raha hai, matlab tumhara pool chhota pad raha hai (demand > supply)
- `hikaricp.connections.usage` ← histogram — connection kitni der tak hold hota hai
- `hikaricp.connections.timeout` — kitni baar connection na milne se timeout hua

### JMX

HikariCP JMX ke through bhi pool stats expose karta hai — JConsole ya VisualVM mein dekhne ke liye useful.

## Express/TS comparison

```ts
// pg
import { Pool } from 'pg';
const pool = new Pool({
  host: 'localhost',
  database: 'acme',
  max: 20,
  idleTimeoutMillis: 600_000,
  connectionTimeoutMillis: 30_000,
});
```

| Node `pg.Pool` | HikariCP |
| --- | --- |
| `max` | `maximum-pool-size` |
| `min` | `minimum-idle` |
| `idleTimeoutMillis` | `idle-timeout` |
| `connectionTimeoutMillis` | `connection-timeout` |
| `allowExitOnIdle` | n/a (Spring app stop hote hi khud shutdown kar deta hai) |
| (manual) | `leak-detection-threshold` |
| (manual) | `max-lifetime` |

Dekha? Concept bilkul same hai jo tum `pg.Pool` mein already jaanti/jaante ho — bas naam alag hain. HikariCP thoda zyada "batteries-included" hai — leak detection aur max-lifetime jaise features built-in milte hain, jo `pg` mein tumhe khud implement karne padte.

## Gotchas — Ye galtiyan mat karna

> [!danger] Lambi transactions connection ko pakde rakhti hain
> Agar tumhara `@Transactional` method 10 second leta hai, toh woh 10 second tak ek connection ko pakde rakhega — koi aur use nahi kar payega. Isko `open-in-view: true` ke saath combine karo toh modest load mein bhi pool khaali ho jaayega. **Hamesha `open-in-view: false` set karo** ([[02-Entity-Basics]]).

> [!danger] `@Transactional` ke andar HTTP calls mat karo
> Agar transaction ke andar 5 second ki external API call kar di, toh DB connection bhi 5 second tak block rahega — bina wajah. Rule simple hai: I/O (network calls) ko transaction boundary se **bahar** nikaalo.

> [!warning] Idle-in-transaction queries
> Agar commit/rollback karna bhool gaye, PostgreSQL usse `idle in transaction` flag kar deta hai aur vacuum process ko block kar deta hai. HikariCP ka `max-lifetime` eventually usko recycle kar dega, lekin DB-side pe bhi `idle_in_transaction_session_timeout` set karna zaruri hai — dono taraf se safety net rakho.

> [!warning] `connection-timeout` bohot chhota rakh diya
> Agar achanak traffic ka burst aaya aur pool khaali ho gaya, toh baaki threads connection ke wait mein fail hone lagenge is error ke saath: `HikariPool-1 - Connection is not available, request timed out after 30000ms`. Solution: ya toh pool badhao, ya slow queries fix karo, ya phir back-pressure ko accept karo (jaanbujh kar requests reject karna, taaki system crash na ho).

> [!warning] Pool size DB ki max connections se zyada mat rakho
> Agar tumhara app hi saari connections le lega, toh baaki apps starve ho jaayenge — unko connection milega hi nahi. Sab apps ke beech coordinate karke pool sizes decide karo.

> [!tip] Realistic concurrency ke saath test karo
> Load-test hamesha actual concurrent request count ke saath karo. Ek 10-connection pool, 1000 RPS bhi aaram se handle kar sakta hai agar har query sirf 5ms leti hai — but agar ek query hi 200ms leti hai, toh wahi pool chhoke jaayega. Numbers dekh ke pool size decide mat karo, actual query latency dekh ke karo.

> [!tip] Bohot zyada concurrency ke liye PostgreSQL mein `pgbouncer` use karo
> Agar tumhare paas bohot saare microservices ek hi PostgreSQL ko hit kar rahe hain (jaise ek CRED jaisa system jisme dozen services ek hi DB use karte hain), toh beech mein `pgbouncer` laga do transaction-pooling mode mein, aur har app ka apna HikariCP pool chhota rakho. `pgbouncer` khud ek upar ka pooling layer bana deta hai.

## Related

- [[01-JDBC-vs-JPA-vs-Hibernate]]
- [[02-Entity-Basics]]
- [[05-Transactions]]
- [[Observability-Basics]]
- [[Actuator]]
