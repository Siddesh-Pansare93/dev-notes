# Schema Migration

> [!info] Express/TS wale dev ke liye
> Prisma mein schema aur migration dono ek hi jagah handle hote hain — tum `schema.prisma` edit karte ho, `prisma migrate dev` chalate ho, aur woh khud SQL migration generate kar deta hai. JPA/Hibernate mein aisa jugaad nahi hai. Schema tumhare `@Entity` classes mein rehta hai, lekin migrations tumhe **alag se**, **haath se** likhni padti hain — Flyway ya Liquibase use karke. Production mein `ddl-auto: update` set karna ek time-bomb hai jo kabhi bhi phatt sakta hai.

## Kya hota hai? Concept samjho

Socho tumhara database ek Swiggy restaurant ka menu hai. Menu mein naya item add karna hai, ya price change karna hai — tum directly kitchen mein jaake random tareeke se cheezein badal nahi sakte. Ek proper process chahiye: ek changelog, jisme likha ho "yeh change kab hua, kya hua, kis order mein hua." Yehi kaam migration tools karte hain — database ke schema changes ko **version control** mein daal dete hain, taaki har environment (dev, staging, prod) mein exactly same order mein changes apply ho.

| Tool | Style | Files |
| --- | --- | --- |
| **Flyway** | SQL-first, simple, seedha-saadha | `V1__init.sql`, `V2__add_column.sql` |
| **Liquibase** | Changeset-based, DB-agnostic | XML/YAML/JSON, refactoring primitives ke saath |

Dono tools basically ek jaisa kaam karte hain:
1. Ek tracking table maintain karte hain (`flyway_schema_history` / `DATABASECHANGELOG`) — yeh bata deta hai ki kaunse migrations already apply ho chuke hain
2. Startup pe migration files scan karte hain
3. Jo abhi tak apply nahi hue, unko sahi order mein apply karte hain
4. Agar koi pehle se apply ho chuka migration file mein badal gaya (checksum mismatch), toh app start hi nahi hoga — yeh tampering rokne ke liye hai

> [!tip] Kyun zaruri hai?
> Bina migration tool ke, teams "database drift" mein phas jaati hain — dev ka schema kuch aur hai, staging ka kuch aur, prod ka kuch aur. Kisi ne manually ek column add kar diya aur bhool gaya document karna. Migration files yeh guarantee deti hain ki jo bhi environment mein deploy karo, schema **exactly** same banega, step-by-step, order mein.

## Code example — Flyway (Spring Boot mein sabse common)

`pom.xml`:

```xml
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-core</artifactId>
</dependency>
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-database-postgresql</artifactId>
</dependency>
```

`src/main/resources/db/migration/` folder mein files kuch aisi dikhengi:

```
V1__create_users.sql
V2__add_status_to_users.sql
V3__create_orders.sql
V20250510_1200__add_email_index.sql
```

`V1__create_users.sql`:

```sql
CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(100),
    status        VARCHAR(20)  NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ
);

CREATE INDEX idx_users_status ON users(status);
```

`V2__add_status_to_users.sql`:

```sql
ALTER TABLE users
    ADD COLUMN deleted_at TIMESTAMPTZ NULL;
```

Dekho, yeh bilkul waise hi hai jaise tum Git mein commits banate ho — har migration ek "commit" hai jo database ke history mein permanently record ho jaata hai. Ek baar apply ho gaya, toh usse edit nahi karte — naya migration banate ho.

### `application.yml`

```yaml
spring:
  flyway:
    enabled: true
    locations: classpath:db/migration
    baseline-on-migrate: true   # agar existing DB se connect kar rahe ho
    validate-on-migrate: true
    out-of-order: false         # production mein: strict ordering rakho
  jpa:
    hibernate:
      ddl-auto: validate         # Hibernate ka view actual schema se match karwao
```

`ddl-auto: validate` ka matlab — Hibernate khud kuch nahi banayega/badlega, sirf check karega ki tumhare `@Entity` classes DB ke actual schema se match kar rahe hain ya nahi. Agar mismatch mila, app start hone se pehle hi error de dega. Yeh ek safety net hai.

### Repeatable migrations (views, procedures)

```
R__refresh_user_summary_view.sql
```

`R__` prefix wali files special hain — yeh normal `V1`, `V2` ki tarah "ek baar chalke khatam" nahi hoti. Jab bhi inka checksum badalta hai (matlab file ka content change hua), Flyway inhe **dobara** run karta hai. Views, stored procedures, seed data ke liye perfect — kyunki inhe baar-baar refresh karna pad sakta hai without version bump ki jhanjhat ke.

### Java-based migration (jab SQL kaafi na ho)

Kabhi kabhi tumhe complex logic chahiye hota hai — jaise data transform karna jo pure SQL mein karna mushkil ho. Us case mein Java migration likh sakte ho:

```java
public class V3__BackfillFullName extends BaseJavaMigration {
    @Override
    public void migrate(Context ctx) throws Exception {
        try (Statement st = ctx.getConnection().createStatement()) {
            st.execute("UPDATE users SET full_name = email WHERE full_name IS NULL");
        }
    }
}
```

Yeh bhi ek normal migration ki tarah hi treat hota hai — versioned, tracked, order mein apply hota hai. Bas SQL file ki jagah Java class hai.

## Liquibase example

Ab agar tumhe multi-database support chahiye (jaise ek hi app Postgres aur MySQL dono pe chalani hai), ya rollback scripts explicitly define karne hain, toh Liquibase better fit hai.

`pom.xml`:

```xml
<dependency>
    <groupId>org.liquibase</groupId>
    <artifactId>liquibase-core</artifactId>
</dependency>
```

`src/main/resources/db/changelog/db.changelog-master.yaml` — yeh ek "master index" file hai jo baaki sab changelogs ko include karti hai:

```yaml
databaseChangeLog:
  - include:
      file: db/changelog/changes/001-create-users.yaml
  - include:
      file: db/changelog/changes/002-add-deleted-at.yaml
```

`001-create-users.yaml`:

```yaml
databaseChangeLog:
  - changeSet:
      id: 001-create-users
      author: alice
      changes:
        - createTable:
            tableName: users
            columns:
              - column: { name: id,            type: BIGSERIAL, constraints: { primaryKey: true } }
              - column: { name: email,         type: VARCHAR(255), constraints: { nullable: false, unique: true } }
              - column: { name: password_hash, type: VARCHAR(255), constraints: { nullable: false } }
              - column: { name: status,        type: VARCHAR(20),  constraints: { nullable: false } }
              - column: { name: created_at,    type: TIMESTAMPTZ,  defaultValueComputed: now() }
        - createIndex:
            tableName: users
            indexName: idx_users_status
            columns:
              - column: { name: status }
      rollback:
        - dropTable:
            tableName: users
```

Notice karo — Liquibase mein `rollback` explicitly likh sakte ho. Flyway mein rollback (community edition mein) manually next migration likh ke hi karna padta hai; Liquibase mein "undo" pehle se define ho sakta hai. Yeh ek bada differentiator hai agar tumhe production mein quick revert chahiye ho sakta hai.

`application.yml`:

```yaml
spring:
  liquibase:
    enabled: true
    change-log: classpath:db/changelog/db.changelog-master.yaml
```

## Naming conventions

Flyway versions:

```
V<VERSION>__<NAME>.sql
V1__init.sql
V2.1__add_index.sql
V20250510120000__add_users_status.sql   # timestamp-based, kai devs use karte hain
```

> [!tip] Timestamp use karo agar team bada hai
> Agar multiple developers parallel mein migrations commit kar rahe hain (jaise `V5`, `V6` dono log alag branch pe bana rahe hain), toh numeric sequence pe merge conflict ho sakta hai — dono ne `V5` bana diya! Timestamp-based naming (`V20250510120000__...`) is problem ko avoid karta hai, kyunki har timestamp naturally unique hota hai.

## Express/TS comparison

```bash
# Prisma
$ npx prisma migrate dev --name add_status
# generates prisma/migrations/20250510120000_add_status/migration.sql
```

| Prisma | Flyway/Liquibase |
| --- | --- |
| `prisma migrate dev` | Manually `V<n>__name.sql` likhna padta hai |
| `migration.sql` (auto-generated) | Hand-written SQL |
| Drift detection | Flyway `validate-on-migrate` |
| `prisma db push` (bina migration ke) | `ddl-auto: update` (prod mein BAD idea) |
| `prisma migrate reset` | `flyway clean` + `migrate` |
| Schema hi source of truth hai | Migrations hi source of truth hain |

Yeh last row sabse important mental shift hai. Prisma mein tum `schema.prisma` badalte ho, aur Prisma khud diff nikaal ke migration bana deta hai — schema "truth" hai. Spring/JPA world mein ulta hai: migrations "truth" hain, aur tumhari `@Entity` classes ko unke saath sync rehna padta hai. Isiliye `ddl-auto: update` khatarnaak hai — woh Prisma jaisa "auto-sync" karne ki koshish karta hai lekin bina proper migration history ke, bina rollback ke, bina review ke.

## Gotchas — yeh mat bhoolna

> [!danger] Applied migration ko kabhi edit mat karo
> Flyway har migration file ka ek checksum (hash) store karta hai. Agar `V2__init.sql` already apply ho chuka hai aur tum uska content change kar do, agli baar app start karne pe error aayega: `Migration checksum mismatch`. **Hamesha ek NAYI migration banao** fix ya change ke liye — jaise Git mein purani commit rewrite nahi karte, naya commit karte ho.

> [!danger] `ddl-auto: update` migration nahi hai
> Yeh Hibernate ko bolta hai ki tables ko entities ke hisaab se khud ALTER kar de. Lekin isme bade problems hain:
> - NOT NULL constraints silently drop kar sakta hai
> - Naye columns add kar dega, lekin purane kabhi remove nahi karega (garbage accumulate hota rahega)
> - Field rename karo toh naya column add karega, purana chhod dega — matlab agar baad mein tum migrate karo toh data loss ho sakta hai
> Production mein hamesha **`validate`** use karo aur schema ka kaam Flyway/Liquibase pe chhodo.

> [!warning] Existing database ke liye Flyway baseline
> Agar tumhara DB pehle se exist karta hai (bina `flyway_schema_history` table ke — matlab Flyway pehli baar aa raha hai kisi purane system mein), toh `baseline-on-migrate: true` set karo aur `baseline-version` apne starting point ke hisaab se set karo. Warna Flyway confuse ho jaayega ki "yeh sab tables already hain, migration V1 kaise chalau?"

> [!warning] Migrations ko real data shape pe test karo
> Sirf empty schema pe smoke-test mat karo. Testcontainers ke saath ek PostgreSQL instance uthao jisme prod-jaisa data snapshot ho, aur migration wahan test karo — kyunki bahut saare migration bugs sirf tab dikhte hain jab data already present ho (jaise NOT NULL add karna jab existing rows mein NULL values hon).

> [!warning] Migrations aur downtime
> Bade tables pe lambi `ALTER TABLE` query poori table ko lock kar degi — production traffic ruk jaayega. Isiliye online schema-change pattern follow karo: pehle nullable column add karo → backfill (data fill) karo → phir NOT NULL set karo → phir purana column drop karo. Yeh Zomato jaisi high-traffic app mein zaroori hai jahan ek second ka downtime bhi order loss kar sakta hai.

> [!tip] Flyway vs Liquibase kaise choose karo
> - Team SQL mein comfortable hai, needs simple hain → **Flyway**
> - Multi-database support chahiye, refactoring primitives, explicit rollback scripts chahiye → **Liquibase**

> [!tip] Ek migration = ek concern
> "Table add karo + data backfill karo + index add karo" — sab kuch ek hi SQL file mein mat thoko. Chhote, atomic changes debug karna, revert karna, aur samajhna bahut aasan hota hai. Socho jaise UPI transaction — ek transaction ek kaam karta hai, do cheezein mix nahi karta.

## Related

- [[02-Entity-Basics]]
- [[01-JDBC-vs-JPA-vs-Hibernate]]
- [[08-DataSource-Connection-Pool]]
- [[Spring-Boot-Profiles]]
