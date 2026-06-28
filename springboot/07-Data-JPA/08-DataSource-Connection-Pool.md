---
tags: [data-jpa, datasource, hikari, connection-pool]
aliases: [HikariCP, Connection Pool, DataSource]
stage: intermediate
---

# DataSource & Connection Pool

> [!info] For the Express/TS dev
> In Node, `pg.Pool` is the connection pool you configure (`max: 20`). In Spring Boot, **HikariCP** is the default — auto-configured the moment you add a JDBC driver. The defaults are reasonable for development, but production tuning (`maximum-pool-size`, timeouts) directly affects your latency and crash behavior under load.

## Concept / How it works

A connection pool keeps a small number of physical DB connections open and hands them out to threads. Without pooling, every query creates a TCP+auth+TLS connection — fatal for web apps.

HikariCP (the default since Boot 2.0) is the fastest pool in the JVM ecosystem. Spring Boot auto-configures it from properties.

## Code example — typical configuration

`pom.xml` — driver only; HikariCP comes with `spring-boot-starter-data-jpa`:

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
      maximum-pool-size: 20             # peak concurrent DB connections
      minimum-idle: 5                   # warm connections ready to go
      connection-timeout: 30000         # ms to wait for a connection (default 30s)
      idle-timeout: 600000              # 10 min — close idle conns
      max-lifetime: 1800000             # 30 min — recycle even live conns
      leak-detection-threshold: 60000   # log if a conn is held >60s
      auto-commit: false                # JPA wants tx control
      data-source-properties:
        ApplicationName: acme-api
        socketTimeout: 30
        loginTimeout: 10
        tcpKeepAlive: true
        reWriteBatchedInserts: true     # PostgreSQL: batch INSERTs in one round-trip
```

### Multiple DataSources

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

## Sizing the pool

> "The pool should be small. Smaller than you think." — HikariCP wiki

Formula from the HikariCP docs:

```
connections = (cores * 2) + effective_spindle_count
```

Most modern PostgreSQL on SSD: **~10-30 connections** per app instance. Don't blindly raise to 100; you'll thrash.

Also consider:
- DB max connections (PostgreSQL default `max_connections = 100`)
- App instance count: `app_instances × pool_size ≤ db_max_connections - reserved`

## Monitoring

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
- `hikaricp.connections.active`
- `hikaricp.connections.idle`
- `hikaricp.connections.pending` ← if non-zero often, your pool is undersized
- `hikaricp.connections.usage` ← histogram of how long conns are held
- `hikaricp.connections.timeout`

### JMX

HikariCP exposes pool stats via JMX too — useful in JConsole / VisualVM.

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
| `allowExitOnIdle` | n/a (Spring shuts down on app stop) |
| (manual) | `leak-detection-threshold` |
| (manual) | `max-lifetime` |

## Gotchas

> [!danger] Long-running transactions hold connections
> A 10-second `@Transactional` method holds a connection for 10 seconds. Combined with `open-in-view: true`, you exhaust the pool under modest load. **Set `open-in-view: false`** ([[02-Entity-Basics]]).

> [!danger] HTTP calls inside `@Transactional`
> A 5-second external API call inside a transaction holds the DB connection for 5 seconds. Move the I/O outside the tx boundary.

> [!warning] Idle-in-transaction queries
> If you forget to commit/rollback, PostgreSQL flags `idle in transaction` and blocks vacuums. HikariCP's `max-lifetime` recycles eventually, but set DB-side `idle_in_transaction_session_timeout` too.

> [!warning] `connection-timeout` too small
> If a sudden burst exhausts the pool, threads waiting for a connection start failing with `HikariPool-1 - Connection is not available, request timed out after 30000ms`. Either increase pool, fix slow queries, or accept the back-pressure.

> [!warning] Pool size > DB max connections
> Your app instance starves the DB; other apps fail. Coordinate.

> [!tip] Test with realistic concurrency
> Load-test with the actual concurrent request count. A 10-conn pool handling 1000 RPS may be fine if each query is 5 ms; might choke if a single query is 200 ms.

> [!tip] PostgreSQL: prefer `pgbouncer` for very high concurrency
> If you have many micro-services hitting one PG, put pgbouncer in front in transaction-pooling mode and let each app's HikariCP be small.

## Related

- [[01-JDBC-vs-JPA-vs-Hibernate]]
- [[02-Entity-Basics]]
- [[05-Transactions]]
- [[Observability-Basics]]
- [[Actuator]]
