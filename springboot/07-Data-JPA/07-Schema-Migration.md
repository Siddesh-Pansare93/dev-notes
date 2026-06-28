---
tags: [data-jpa, migration, flyway, liquibase, schema]
aliases: [Flyway, Liquibase, Migrations, Schema Migration]
stage: intermediate
---

# Schema Migration

> [!info] For the Express/TS dev
> Prisma owns both the schema AND the migrations: edit `schema.prisma`, run `prisma migrate dev`, get a generated SQL migration. JPA/Hibernate doesn't do that. The schema lives in your `@Entity` classes; you're expected to write migrations **separately** with **Flyway** or **Liquibase**. Setting `ddl-auto: update` in production is a path to disaster.

## Concept / How it works

| Tool | Style | Files |
| --- | --- | --- |
| **Flyway** | SQL-first, simple | `V1__init.sql`, `V2__add_column.sql` |
| **Liquibase** | Changeset-based, DB-agnostic | XML/YAML/JSON, with refactoring primitives |

Both:
1. Maintain a tracking table (`flyway_schema_history` / `DATABASECHANGELOG`)
2. On startup, scan migration files
3. Apply unapplied ones in order
4. Refuse to start if a previously-applied migration's checksum changed (prevents tampering)

## Code example — Flyway (most common in Spring Boot)

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

Files in `src/main/resources/db/migration/`:

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

### `application.yml`

```yaml
spring:
  flyway:
    enabled: true
    locations: classpath:db/migration
    baseline-on-migrate: true   # if connecting to an existing DB
    validate-on-migrate: true
    out-of-order: false         # production: keep strict ordering
  jpa:
    hibernate:
      ddl-auto: validate         # match Hibernate's view to actual schema
```

### Repeatable migrations (views, procedures)

```
R__refresh_user_summary_view.sql
```

Runs whenever its checksum changes — perfect for views, stored procedures, seed data.

### Java-based migration (when SQL isn't enough)

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

## Liquibase example

`pom.xml`:

```xml
<dependency>
    <groupId>org.liquibase</groupId>
    <artifactId>liquibase-core</artifactId>
</dependency>
```

`src/main/resources/db/changelog/db.changelog-master.yaml`:

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
V20250510120000__add_users_status.sql   # timestamp-based for many devs
```

Use timestamps if multiple devs commit migrations in parallel — avoids merge conflicts on numeric sequences.

## Express/TS comparison

```bash
# Prisma
$ npx prisma migrate dev --name add_status
# generates prisma/migrations/20250510120000_add_status/migration.sql
```

| Prisma | Flyway/Liquibase |
| --- | --- |
| `prisma migrate dev` | Manually write `V<n>__name.sql` |
| `migration.sql` (generated) | Hand-written SQL |
| Drift detection | Flyway `validate-on-migrate` |
| `prisma db push` (no migrations) | `ddl-auto: update` (BAD in prod) |
| `prisma migrate reset` | `flyway clean` + `migrate` |
| Schema = source of truth | Migrations = source of truth |

## Gotchas

> [!danger] Don't edit applied migrations
> Flyway hashes each migration. If `V2__init.sql` has been applied and you change it, the next startup fails: `Migration checksum mismatch`. **Always add a NEW migration to fix or alter.**

> [!danger] `ddl-auto: update` is not migration
> It tries to ALTER tables to match entities. It can:
> - Drop NOT NULL constraints silently
> - Add columns but never remove them
> - Rename a field → add new column, leave old one (data loss if you migrate later)
> Use **`validate`** in prod and let Flyway/Liquibase do schema work.

> [!warning] Flyway baseline for existing databases
> If your DB already exists without `flyway_schema_history`, set `baseline-on-migrate: true` and `baseline-version` matching your starting point.

> [!warning] Test migrations on real data shape
> Use a Testcontainers PostgreSQL with a snapshot of prod-like data. Don't just smoke-test on an empty schema.

> [!warning] Migrations and downtime
> Long `ALTER TABLE` on big tables locks. Use online schema-change patterns: add nullable column → backfill → set NOT NULL → drop old.

> [!tip] Flyway vs Liquibase choice
> - SQL-fluent team, simple needs → **Flyway**
> - Multi-DB support, refactoring primitives, rollback scripts → **Liquibase**

> [!tip] One migration per concern
> Don't mix "add table + backfill data + add index" in a single SQL file. Atomic units of change are easier to debug, revert, and reason about.

## Related

- [[02-Entity-Basics]]
- [[01-JDBC-vs-JPA-vs-Hibernate]]
- [[08-DataSource-Connection-Pool]]
- [[Spring-Boot-Profiles]]
