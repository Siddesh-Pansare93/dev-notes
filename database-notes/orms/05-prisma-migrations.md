# 🗄️ Prisma Migrations

> **Chapter 5 of the Prisma ORM Guide**
> Prerequisites: Basic Prisma schema knowledge, a working Prisma project setup.

---

## 🧭 What Is a Migration?

A **migration** is a versioned script that describes a change to your database schema. Think of it like a save point in a video game — each migration captures exactly what changed and when, so your database structure can be reproduced step by step on any machine.

When you add a new column, rename a table, or create an index, Prisma generates a `.sql` file that represents that change. This file is stored alongside your code, committed to Git, and applied in order — from oldest to newest.

A migration file might look like this:

```sql
-- CreateTable
CREATE TABLE "User" (
    "id"    SERIAL NOT NULL,
    "email" TEXT   NOT NULL,
    "name"  TEXT,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
```

Simple, readable, and permanent.

---

## 🤔 Why Do Migrations Matter?

Without migrations, database schema changes are a manual, error-prone process. Migrations solve several real problems:

| Problem | Without Migrations | With Migrations |
|---|---|---|
| New team member onboarding | Manually run SQL scripts in unknown order | `migrate deploy` applies everything automatically |
| Production deployment | Hope you remember what changed | Exact SQL diff is captured and version-controlled |
| Rolling back a bad change | Restore from backup (risky) | Each migration is a discrete, reviewable step |
| Multiple environments | Dev and prod drift apart silently | All environments share the same migration history |

Migrations are essentially **version control for your database**. Just as Git tracks your code changes, Prisma Migrate tracks your schema changes.

---

## ⚙️ Prisma Migrate Commands

### Development Commands

**Create and apply a new migration:**
```bash
npx prisma migrate dev --name init
npx prisma migrate dev --name add_bio
```
The `--name` flag becomes part of the migration folder name. Always use a descriptive name (`add_bio`, `create_posts_table`, `add_index_on_email`). This command will:
1. Compare your current `schema.prisma` to the last migration
2. Generate a new SQL migration file
3. Apply it to your development database
4. Regenerate the Prisma Client

**Reset and re-apply all migrations (development only!):**
```bash
npx prisma migrate reset
```
This **drops your entire database**, re-applies every migration from scratch, and optionally runs your seed script. Never use this in production. It is a blunt tool for clearing local state when things get messy.

**Check migration status:**
```bash
npx prisma migrate status
```
Shows which migrations have been applied and which are pending. Useful for auditing before a production deploy.

### Production Commands

**Apply pending migrations:**
```bash
npx prisma migrate deploy
```
This is the production-safe command. It reads your `prisma/migrations/` folder, checks which migrations have not yet been applied to the target database (using the `_prisma_migrations` table), and applies the pending ones in order. It does **not** generate new migrations — that is a developer workflow step.

**Mark a migration as applied without running it:**
```bash
npx prisma migrate resolve --applied 0001_init
```
Used in edge cases where you have manually applied a migration script and just need Prisma to acknowledge it as done in the tracking table.

---

## 📁 The `prisma/migrations/` Folder Structure

Every time you run `migrate dev`, Prisma creates a new timestamped folder inside `prisma/migrations/`:

```
prisma/
  schema.prisma
  migrations/
    20240101120000_init/
      migration.sql
    20240215093000_add_bio/
      migration.sql
    migration_lock.toml
```

- Each folder is named with a **UTC timestamp + your migration name**
- Inside is a single `migration.sql` file containing the raw SQL changes
- `migration_lock.toml` records the database provider (e.g., `postgresql`) so Prisma can warn you if you accidentally switch databases mid-project

These files should be **committed to Git** — they are source of truth for your schema history.

---

## 🗂️ The `_prisma_migrations` Table

Prisma automatically creates a table called `_prisma_migrations` in your database. You never touch it directly, but it is essential. It records:

| Column | Purpose |
|---|---|
| `id` | Unique identifier for the migration record |
| `checksum` | Hash of the SQL file to detect tampering |
| `migration_name` | Name of the migration folder |
| `started_at` / `finished_at` | Timing info |
| `applied_steps_count` | How many SQL steps ran |
| `logs` | Error output if a migration failed |

When you run `migrate deploy`, Prisma queries this table to determine what is pending. If a migration appears in the folder but not in this table, it gets applied.

---

## 🔄 Development Workflow

The day-to-day loop for development:

```
1. Edit schema.prisma
        ↓
2. npx prisma migrate dev --name <description>
        ↓
3. Prisma generates migration SQL + applies it
        ↓
4. Prisma regenerates the Client
        ↓
5. Write application code using the updated Client
```

**Example — adding a `bio` field to users:**

```prisma
// schema.prisma (before)
model User {
  id    Int    @id @default(autoincrement())
  email String @unique
  name  String?
}

// schema.prisma (after — you add this line)
model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
  bio   String?   // <-- new field
}
```

```bash
npx prisma migrate dev --name add_bio
```

Prisma generates:
```sql
-- AlterTable
ALTER TABLE "User" ADD COLUMN "bio" TEXT;
```

Now your database has the column, and your Prisma Client immediately knows about `user.bio`.

---

## 🚀 Production Workflow

Production deployments never use `migrate dev`. The flow is:

```
1. Developer runs migrate dev locally → commits migration files to Git
        ↓
2. CI/CD pipeline checks out code (with migration files)
        ↓
3. Pipeline runs: npx prisma migrate deploy
        ↓
4. Prisma applies only the pending migrations to the production DB
        ↓
5. Application starts with the updated schema
```

The key distinction: **`migrate dev` creates migrations; `migrate deploy` applies them.** Production never creates, it only applies.

---

## 🗜️ Squashing Migrations (Experimental)

Over months of development, you can accumulate hundreds of migration files. Squashing condenses them into a single baseline migration:

```bash
npx prisma migrate squash --experimental
```

This is useful when:
- Onboarding new environments takes too long (applying 200 migrations)
- Old migration files have become irrelevant noise

Use with caution — squashing rewrites history and should only be done when all existing environments have already been migrated to the latest state.

---

## ✍️ Custom Migration Scripts

Prisma auto-generates SQL for most schema changes, but some changes require human judgment. Two common cases:

### Case 1: Adding a NOT NULL Column to a Table with Existing Data

If your `users` table already has rows and you add a non-nullable column, the database will reject it because existing rows would have `NULL` for that column. The 3-step process:

**Step 1 — Add column as nullable in schema, migrate:**
```prisma
model User {
  ...
  role  String?  // nullable first
}
```
```bash
npx prisma migrate dev --name add_role_nullable
```

**Step 2 — Write a script to backfill existing rows:**
```typescript
// scripts/backfill-role.ts
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
await prisma.user.updateMany({ where: { role: null }, data: { role: 'member' } })
await prisma.$disconnect()
```
Run this against your database before continuing.

**Step 3 — Make the column NOT NULL in schema, migrate:**
```prisma
model User {
  ...
  role  String  // now non-nullable
}
```
```bash
npx prisma migrate dev --name make_role_required
```

### Case 2: Renaming a Column

Prisma cannot distinguish between a rename and a drop-plus-add. If you rename `name` to `fullName`, Prisma will generate:

```sql
ALTER TABLE "User" DROP COLUMN "name";  -- DATA LOSS!
ALTER TABLE "User" ADD COLUMN "fullName" TEXT;
```

To safely rename, manually edit the generated migration file before applying:

```sql
-- Replace the generated SQL with:
ALTER TABLE "User" RENAME COLUMN "name" TO "fullName";
```

Then update your `schema.prisma` to match and run `migrate dev`. Prisma will detect the migration already exists and skip regenerating it.

---

## 🌱 Seeding the Database

Seeding populates your database with initial or test data. Create `prisma/seed.ts`:

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.user.createMany({
    data: [
      { email: 'alice@example.com', name: 'Alice' },
      { email: 'bob@example.com',   name: 'Bob'   },
    ],
  })
  console.log('Seeding complete.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

Register the seed script in `package.json`:

```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

Run it:

```bash
npx prisma db seed
```

`migrate reset` also runs the seed script automatically after resetting, making it easy to restore a clean, populated development state in one command.

---

## 🧪 `db push`: Prototyping Without Migrations

When you are still experimenting and do not want to commit migration files yet, use:

```bash
npx prisma db push
```

This pushes your current `schema.prisma` directly to the database **without creating any migration files**. It is perfect for the early design phase of a new model. When you are ready to solidify the schema, switch to `migrate dev` to generate the proper migration history.

> Warning: `db push` can cause data loss if your changes require dropping columns. It is not for production use.

---

## 🔍 `db pull` (Introspection): From Existing Database to Prisma

If you are adding Prisma to an existing project that already has a database, run:

```bash
npx prisma db pull
```

Prisma connects to your database, reads its current structure (tables, columns, indexes, relations), and **generates a `schema.prisma` file** that matches it. This is the starting point for managing an existing database with Prisma.

---

## 📐 Baselining: Migrating an Existing Database to Prisma

If you have an existing database and want Prisma Migrate to take over going forward (without re-running historical SQL), follow these steps:

**Step 1 — Introspect to generate your schema:**
```bash
npx prisma db pull
```

**Step 2 — Create a baseline migration folder manually:**
```bash
mkdir -p prisma/migrations/0001_baseline
```

**Step 3 — Dump the current database schema into that file:**
Use your database's dump tool (e.g., `pg_dump --schema-only`) and save the output as `prisma/migrations/0001_baseline/migration.sql`.

**Step 4 — Mark it as already applied:**
```bash
npx prisma migrate resolve --applied 0001_baseline
```

Now Prisma knows the baseline exists and is applied. All future `migrate dev` runs will generate incremental migrations on top of it.

---

## 💡 Key Takeaways

- A **migration** is a versioned SQL file that captures one schema change — treat it like source code and commit it to Git.
- Use **`migrate dev`** during development to generate and apply migrations; use **`migrate deploy`** in CI/CD and production pipelines.
- The **`_prisma_migrations`** table is Prisma's internal ledger — it tracks what has been applied so deployments are idempotent.
- **Never use `migrate reset` in production** — it drops all data. It is a development convenience only.
- For changes Prisma cannot auto-generate (rename, NOT NULL backfill), edit the migration SQL manually before applying.
- **`db push`** is for fast prototyping; switch to `migrate dev` once your schema stabilizes.
- **`db pull`** generates a schema from an existing database, and **baselining** lets Prisma take over management without replaying old history.

---

## 📝 Quiz

**Question 1**
You add a new `String` column to a model that already has thousands of rows in the database. You mark the column as `String` (not nullable) immediately. What problem will you encounter, and what is the correct approach?

> The database will reject adding a NOT NULL column when existing rows cannot satisfy the constraint. The correct approach is the 3-step process: add as nullable first, backfill existing rows with application code, then alter the column to NOT NULL.

**Question 2**
A colleague asks why the `prisma/migrations/` folder is committed to Git. What do you tell them?

> The migration folder is the version history of your database schema. Committing it ensures every developer and every deployment environment applies the exact same changes in the exact same order, making the schema reproducible and auditable.

**Question 3**
What is the difference between `npx prisma migrate dev` and `npx prisma migrate deploy`?

> `migrate dev` is a development tool: it compares your schema to the last migration, generates a new SQL file, and applies it to your local database. `migrate deploy` is for production: it reads existing migration files and applies any that have not yet been recorded in the `_prisma_migrations` table — it never generates new migrations.

---

*Next Chapter: Prisma Relations — one-to-one, one-to-many, and many-to-many.*
