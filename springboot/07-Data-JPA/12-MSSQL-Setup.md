# MSSQL (SQL Server) with Spring Boot

> [!info] Express/TS wale dev ke liye
> Node mein tum `mssql` ya `tedious` package uthate ho aur queries haath se likhte ho. Spring Boot mein bas JDBC driver swap karo — baaki sab kaam JPA/Hibernate khud sambhal leta hai. SQL-Server-specific cheezein jo tumhe touch karni padengi woh bas teen hain: **dialect**, **driver**, aur kuch identity/column ke chote-mote nakhre.

## Concept

Kya hota hai yahan? SQL Server, Spring Boot ke liye koi "third-class" support wala database nahi hai — Microsoft khud `mssql-jdbc` driver maintain karta hai, aur Hibernate ka apna `SQLServerDialect` hai jo out-of-the-box milta hai. Matlab jaise Zomato app Swiggy ke saath bhi kaam karta agar dono ka API same hota — waise hi ek baar configure kar do, phir Spring Data JPA repositories, migrations, transactions, HikariCP — sab kuch bilkul waise hi chalega jaise Postgres ya MySQL ke saath chalta hai. Underlying database badla, lekin tumhara Java code waisa hi rahega.

## Dependencies

Sabse pehle pom.xml mein do cheezein daalni hain — JPA starter (jo already hoga agar tum Data JPA use kar rahe ho) aur SQL Server ka JDBC driver.

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

> [!tip]
> `driver-class-name` explicitly likhne ki zarurat nahi — Spring Boot JDBC URL dekh kar (`jdbc:sqlserver://...`) khud detect kar leta hai ki driver kaunsa use karna hai. Ye bilkul waisa hai jaise Node mein `mssql` package connection string dekh kar apna protocol samajh leta hai.

## application.yml

Ab connection details set karte hain. Ye woh jagah hai jahan tumhara app SQL Server se "milta" hai.

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
      ddl-auto: validate          # prod mein kabhi 'update' mat rakhna — Flyway use karo
    properties:
      hibernate:
        dialect: org.hibernate.dialect.SQLServerDialect
        jdbc.time_zone: UTC
    show-sql: false
```

**URL ke flags jo matter karte hain**:
- `encrypt=true` — naye driver versions mein ye mandatory hai (TLS encryption ke liye). Bina isके connection hi refuse ho jayega.
- `trustServerCertificate=true` — sirf local dev ke liye. Production mein ek real CA certificate use karo, warna ye setting man-in-the-middle attack ke liye darwaza khol deti hai.
- `databaseName=appdb` — ya phir `;database=appdb` bhi likh sakte ho, dono chalte hain.
- `applicationName=my-svc` — ye string `sys.dm_exec_sessions` mein dikhti hai, matlab jab DBA ko dekhna ho ki kaunsa service konsi query chala raha hai, ye naam identify karne mein madad karta hai. Production mein zaroor set karo — Zomato ke 10 microservices ek hi DB hit kar rahe hon toh DBA ko pata chalna chahiye "ye query order-service se aayi ya payment-service se".

## Common gotchas

SQL Server, Postgres/MySQL se kaafi milta-julta hai lekin kuch jagah alag chalta hai. Yeh table wahi chhoti-chhoti cheezein cover karta hai jo naye developers ko confuse karti hain:

| Gotcha | Fix |
|---|---|
| `@GeneratedValue(strategy = AUTO)` `TABLE` strategy pick kar leta hai (slow) | `IDENTITY` use karo SQL Server ke `IDENTITY(1,1)` columns ke liye |
| `BIT` vs `BOOLEAN` | Java ka `boolean` map karo — Hibernate khud `BIT` conversion handle karta hai |
| `NVARCHAR` vs `VARCHAR` | Unicode text (Hindi, emoji, etc.) ke liye `@Column(columnDefinition = "NVARCHAR(255)")` use karo |
| `OFFSET ... FETCH NEXT` pagination | Hibernate `Pageable` ke liye ye automatically generate kar deta hai, tumhe likhna nahi padta |
| Reserved keywords (`User`, `Order`) | `@Table(name = "[User]")` mein square brackets se quote karo, ya table ka naam hi badal do |
| `datetime2` vs `datetime` | `Instant`/`LocalDateTime` ki precision ke liye `datetime2(6)` prefer karo, purana `datetime` kam precise hai |
| Java 17+ pe TLS errors | `mssql-jdbc` ko 12.x ya usse upar update karo |

> [!warning]
> `AUTO` generation strategy sabse bada trap hai. Agar tum `@GeneratedValue(strategy = GenerationType.AUTO)` chhod doge, Hibernate SQL Server ke liye `TABLE` strategy select kar sakta hai — jo ek extra table maintain karke ID generate karta hai. Ye IDENTITY column se kaafi slow hota hai. Hamesha explicitly `IDENTITY` bolo.

## Identity column example

Zomato ke order table jaisa ek simple example dekhते hain — jahan `id` auto-increment hai (SQL Server ka `IDENTITY(1,1)`):

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

Yahan `GenerationType.IDENTITY` bolna zaruri hai — isse Hibernate ko pata chal jata hai ki ID generate karne ka kaam database khud karega (SQL Server ka native `IDENTITY(1,1)` mechanism), Hibernate ko koi extra table maintain nahi karni padegi.

## Flyway migration (ddl-auto se better)

Kyun zaruri hai? `ddl-auto: update` production mein use karna waise hi risky hai jaise production database pe directly `ALTER TABLE` chala dena bina backup ke. Isliye schema changes ko version-controlled SQL files mein likho — Flyway (ya Liquibase) unhe order se apply karta hai.

`src/main/resources/db/migration/V1__init.sql`:

```sql
CREATE TABLE orders (
    id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    customer_ref NVARCHAR(64) NOT NULL,
    created_at  DATETIME2(6) NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_orders_customer_ref ON orders(customer_ref);
```

Flyway JDBC URL dekh kar khud SQL Server dialect detect kar leta hai — tumhe alag se kuch configure nahi karna padta.

## Testcontainers (integration tests)

Kya problem solve karta hai? Integration tests ke liye tumhe real SQL Server chahiye, na ki H2 jaisa in-memory fake — kyunki dialect-specific behavior (jaise `IDENTITY`, `OFFSET FETCH`) H2 mein match nahi karega. Testcontainers ek real SQL Server container spin up kar deta hai test ke duration ke liye, bilkul disposable Docker container jaisa — test khatam, container gayab.

```java
@Container
static MSSQLServerContainer<?> mssql = new MSSQLServerContainer<>(
        "mcr.microsoft.com/mssql/server:2022-latest")
    .acceptLicense();
```

`org.testcontainers:mssqlserver` ko apne test scope mein add karna mat bhoolna. Dekho [[09-Testing/06-Testcontainers]].

## Kab SQL Server use NAHI karna chahiye

- Greenfield cloud-native projects jahan tumhare paas Microsoft licensing nahi hai — Postgres sasta bhi hai aur uska JSONB support bhi behtar hai.
- Heavy JSON workloads wale projects — SQL Server ka JSON support theek-thaak hai lekin Postgres se peeche hai.
- SQL Server tabhi choose karo jab: pehle se Microsoft stack ho company mein, AD/Kerberos authentication zaruri ho, Always-On High Availability already setup ho, ya phir purane T-SQL stored procedures ho jinhe rewrite karna practical na ho.

## Related
- [[08-DataSource-Connection-Pool]] — HikariCP tuning
- [[07-Schema-Migration]] — Flyway/Liquibase
- [[01-JDBC-vs-JPA-vs-Hibernate]] — dialect concept
- [[../14-Ecosystem/01-Library-Cheatsheet]]
