---
tags: [data-jpa, mssql, sql-server, database, dialect]
aliases: [MSSQL, SQL Server, Microsoft SQL Server with Spring Boot]
stage: intermediate
---

# MSSQL (SQL Server) with Spring Boot

> [!info] For the Express/TS dev
> In Node you'd reach for `mssql` or `tedious` and write queries by hand. In Spring Boot you just swap the JDBC driver — JPA/Hibernate handles the rest. The only SQL-Server-specific things you usually touch are the **dialect**, the **driver**, and a couple of identity/column quirks.

## Concept

SQL Server is a first-class citizen for Spring Boot — Microsoft maintains the JDBC driver (`mssql-jdbc`) and Hibernate ships a `SQLServerDialect`. Once configured, Spring Data JPA repositories, migrations, transactions, and HikariCP all work identically to Postgres/MySQL setups.

## Dependencies

`pom.xml`:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>
<dependency>
    <groupId>com.microsoft.sqlserver</groupId>
    <artifactId>mssql-jdbc</artifactId>
    <scope>runtime</scope>
</dependency>
```

Spring Boot auto-detects the driver — no `driver-class-name` needed.

## application.yml

```yaml
spring:
  datasource:
    url: jdbc:sqlserver://localhost:1433;databaseName=appdb;encrypt=true;trustServerCertificate=true
    username: sa
    password: ${DB_PASSWORD}
    hikari:
      maximum-pool-size: 20
      connection-timeout: 30000
  jpa:
    hibernate:
      ddl-auto: validate          # never 'update' in prod — use Flyway
    properties:
      hibernate:
        dialect: org.hibernate.dialect.SQLServerDialect
        jdbc.time_zone: UTC
    show-sql: false
```

**URL flags that matter**:
- `encrypt=true` — required by recent driver versions (TLS).
- `trustServerCertificate=true` — dev only; in prod, use a real CA cert.
- `databaseName=appdb` — or use `;database=appdb`.
- `applicationName=my-svc` — shows up in `sys.dm_exec_sessions` for DBA debugging.

## Common gotchas

| Gotcha | Fix |
|---|---|
| `@GeneratedValue(strategy = AUTO)` picks `TABLE` (slow) | Use `IDENTITY` for SQL Server `IDENTITY(1,1)` columns |
| `BIT` vs `BOOLEAN` | Map Java `boolean` — Hibernate handles the `BIT` conversion |
| `NVARCHAR` vs `VARCHAR` | `@Column(columnDefinition = "NVARCHAR(255)")` for Unicode |
| `OFFSET ... FETCH NEXT` pagination | Hibernate emits this automatically for `Pageable` |
| Reserved keywords (`User`, `Order`) | Quote in `@Table(name = "[User]")` or rename |
| `datetime2` vs `datetime` | Prefer `datetime2(6)` for `Instant`/`LocalDateTime` precision |
| TLS errors on Java 17+ | Update `mssql-jdbc` to 12.x+ |

## Identity column example

```java
@Entity
@Table(name = "orders")
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String customerRef;

    @Column(columnDefinition = "datetime2(6)")
    private Instant createdAt;
}
```

## Flyway migration (preferred over `ddl-auto`)

`src/main/resources/db/migration/V1__init.sql`:

```sql
CREATE TABLE orders (
    id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    customer_ref NVARCHAR(64) NOT NULL,
    created_at  DATETIME2(6) NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_orders_customer_ref ON orders(customer_ref);
```

Flyway picks the SQL Server dialect automatically from the JDBC URL.

## Testcontainers (integration tests)

```java
@Container
static MSSQLServerContainer<?> mssql = new MSSQLServerContainer<>(
        "mcr.microsoft.com/mssql/server:2022-latest")
    .acceptLicense();
```

Add `org.testcontainers:mssqlserver` to your test scope. See [[09-Testing/06-Testcontainers]].

## When NOT to use SQL Server

- Greenfield cloud-native projects where you have no MS licensing — Postgres is cheaper, has better JSONB.
- Heavy JSON workloads — SQL Server's JSON support is competent but lags Postgres.
- Choose SQL Server when: existing MS stack, AD/Kerberos auth, Always-On HA already in place, or T-SQL stored procs you can't rewrite.

## Related
- [[08-DataSource-Connection-Pool]] — HikariCP tuning
- [[07-Schema-Migration]] — Flyway/Liquibase
- [[01-JDBC-vs-JPA-vs-Hibernate]] — dialect concept
- [[../14-Ecosystem/01-Library-Cheatsheet]]
