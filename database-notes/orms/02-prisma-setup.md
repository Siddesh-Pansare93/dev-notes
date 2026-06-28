# 🛠️ Prisma Setup and Configuration

> **Difficulty:** Beginner | **Time to read:** ~15 minutes | **Prerequisites:** Basic Node.js knowledge

---

## 🤔 What Is Prisma?

Prisma is a **next-generation ORM (Object-Relational Mapper)** for Node.js and TypeScript. Unlike traditional ORMs that rely on class decorators or raw SQL strings scattered throughout your code, Prisma uses a **declarative schema file** as the single source of truth for your database structure.

Think of Prisma as a smart translator that sits between your application code and your database. You write TypeScript — Prisma handles the SQL.

**Why developers love Prisma:**

- **Type-safe queries** — autocomplete and compile-time errors catch bugs before they hit production
- **Human-readable schema** — one file defines your entire database structure
- **Auto-generated client** — no writing boilerplate DAO classes
- **Works with multiple databases** — PostgreSQL, MySQL, SQLite, SQL Server, MongoDB, CockroachDB

---

## 🧩 Prisma Components

Prisma is not just one tool — it's a **suite of three components** that work together:

### 1. Prisma Client
The auto-generated, type-safe query builder for your application. Every time you update your schema, you regenerate the client to stay in sync.

```typescript
// Example: fetch all users
const users = await prisma.user.findMany();
```

### 2. Prisma Migrate
A database migration tool that tracks schema changes over time. When you change your schema, Prisma Migrate generates SQL migration files and applies them to your database — keeping your database structure in version control alongside your code.

```bash
npx prisma migrate dev --name add-user-table
```

### 3. Prisma Studio
A **visual, browser-based database browser** built right into Prisma. You can view, add, edit, and delete records without writing any SQL. Perfect for development and debugging.

```bash
npx prisma studio
# Opens at http://localhost:5555
```

---

## ✅ Prerequisites

Before installing Prisma, make sure you have the following:

| Tool | Minimum Version | Check with |
|------|----------------|------------|
| Node.js | v16+ | `node --version` |
| npm | v7+ | `npm --version` |
| yarn (optional) | v1.22+ | `yarn --version` |
| pnpm (optional) | v7+ | `pnpm --version` |

You also need access to a **database**. If you don't have one yet, don't worry — we'll cover how to spin one up with Docker, and SQLite requires zero setup.

---

## 🚀 Step-by-Step Installation

### Step 1: Initialize a Node.js Project

Start fresh in a new directory:

```bash
mkdir my-prisma-app
cd my-prisma-app
npm init -y
```

This creates a `package.json` file.

### Step 2: Install Prisma CLI

Prisma CLI is a development tool — it helps you manage migrations and generate the client. Install it as a dev dependency:

```bash
npm install prisma --save-dev
```

### Step 3: Install Prisma Client

The Prisma Client is what your application actually uses at runtime to query the database:

```bash
npm install @prisma/client
```

> **Note:** You need both packages. `prisma` is the CLI toolchain; `@prisma/client` is the runtime library your app imports.

### Step 4: Initialize Prisma

Run the Prisma initializer to scaffold the required files:

```bash
npx prisma init
```

This command creates two things:

1. **`prisma/schema.prisma`** — your schema file
2. **`.env`** — your environment variables file (if it doesn't already exist)

---

## 📄 The `prisma/schema.prisma` File

After running `npx prisma init`, open `prisma/schema.prisma`. It will look like this:

```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**Breaking it down:**

- **`generator client`** — tells Prisma to generate a JavaScript/TypeScript client
- **`datasource db`** — defines which database engine to use and where to find it
- **`provider`** — the database type (postgresql, mysql, sqlite, etc.)
- **`url = env("DATABASE_URL")`** — reads the connection string from your `.env` file (never hardcode credentials!)

You'll add your data models below this block. For example:

```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
}
```

---

## 🔑 The `.env` File and DATABASE_URL

The `.env` file holds your database connection string. Prisma reads it automatically.

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
```

### DATABASE_URL Formats for Every Database

Choose the format that matches your database:

**PostgreSQL** (most common in production)
```env
DATABASE_URL="postgresql://dev:secret@localhost:5432/myapp?schema=public"
```

**MySQL**
```env
DATABASE_URL="mysql://dev:secret@localhost:3306/myapp"
```

**SQL Server**
```env
DATABASE_URL="sqlserver://localhost:1433;database=myapp;user=dev;password=secret"
```

**SQLite** — easiest for learning, no server needed!
```env
DATABASE_URL="file:./dev.db"
```

**MongoDB**
```env
DATABASE_URL="mongodb://dev:secret@localhost:27017/myapp"
```

> **Beginner tip:** Use **SQLite** when learning. It's a file-based database — no installation, no Docker, no credentials. Just change the `provider` in `schema.prisma` to `"sqlite"` and set the URL to `"file:./dev.db"`.

---

## 🐳 Setting Up with Docker + PostgreSQL

If you want a real PostgreSQL database without installing it locally, Docker is the easiest path. With one command you get a fully running Postgres server:

```bash
docker run -d \
  --name mydb \
  -e POSTGRES_USER=dev \
  -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_DB=myapp \
  -p 5432:5432 \
  postgres:15
```

**What each flag does:**

| Flag | Purpose |
|------|---------|
| `-d` | Run in the background (detached mode) |
| `--name mydb` | Give the container a friendly name |
| `-e POSTGRES_USER=dev` | Set the database username |
| `-e POSTGRES_PASSWORD=secret` | Set the database password |
| `-e POSTGRES_DB=myapp` | Create a database named `myapp` on startup |
| `-p 5432:5432` | Map port 5432 from container to your machine |
| `postgres:15` | Use the official Postgres 15 image |

Then update your `.env`:

```env
DATABASE_URL="postgresql://dev:secret@localhost:5432/myapp?schema=public"
```

To verify the container is running:

```bash
docker ps
```

To stop it later:

```bash
docker stop mydb
```

---

## ⚙️ Generating Prisma Client

Every time you modify your `schema.prisma`, you must regenerate the Prisma Client so it stays in sync with your schema:

```bash
npx prisma generate
```

This reads your schema and generates TypeScript types and query methods inside `node_modules/@prisma/client`. After this, you can import and use it in your code:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log(users);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

> **Important:** Run `npx prisma generate` after every schema change. Many bugs come from forgetting this step.

---

## 🗂️ Folder Structure of a Prisma Project

After setup, your project structure will look like this:

```
my-prisma-app/
├── prisma/
│   ├── schema.prisma        # Your database schema (single source of truth)
│   └── migrations/          # Auto-generated SQL migration history
│       └── 20240101_init/
│           └── migration.sql
├── src/
│   └── index.ts             # Your application code
├── node_modules/
│   └── @prisma/
│       └── client/          # Auto-generated Prisma Client (don't edit!)
├── .env                     # Database connection string (never commit this!)
├── .gitignore               # Should include .env and node_modules
├── package.json
└── tsconfig.json
```

**Key rules:**

- The `prisma/` folder and `schema.prisma` should be committed to git
- The `prisma/migrations/` folder should always be committed — it's your migration history
- The `.env` file should **never** be committed — add it to `.gitignore`
- Never manually edit files inside `node_modules/@prisma/client`

---

## 🌍 Environment-Specific Configuration

Real applications run in multiple environments: development on your laptop, staging for QA testing, and production for real users. Each environment needs its own database.

### Using Multiple `.env` Files

```bash
.env                # Default (development)
.env.staging        # Staging environment
.env.production     # Production environment (never commit this!)
```

### Loading the Right Environment

Use the `--env-file` flag or a tool like `dotenv-cli`:

```bash
npm install dotenv-cli --save-dev
```

Then add scripts to `package.json`:

```json
{
  "scripts": {
    "migrate:dev": "prisma migrate dev",
    "migrate:staging": "dotenv -e .env.staging -- prisma migrate deploy",
    "migrate:prod": "dotenv -e .env.production -- prisma migrate deploy"
  }
}
```

### Environment-Specific DATABASE_URL Examples

```env
# .env (development) - local SQLite or Docker
DATABASE_URL="postgresql://dev:secret@localhost:5432/myapp_dev?schema=public"

# .env.staging - hosted database (e.g., Railway, Supabase)
DATABASE_URL="postgresql://staging_user:staging_pass@staging-host.com:5432/myapp_staging?schema=public"

# .env.production - production database with SSL
DATABASE_URL="postgresql://prod_user:prod_pass@prod-host.com:5432/myapp_prod?schema=public&sslmode=require"
```

> **Security tip:** In production, always require SSL (`sslmode=require`) and use environment variables provided by your hosting platform — never hardcode credentials anywhere.

### Connection Pooling in Production

Production apps often use a connection pooler like **PgBouncer** or Prisma's own **Accelerate**. Add `?pgbouncer=true` for PgBouncer compatibility:

```env
DATABASE_URL="postgresql://user:pass@bouncer-host:6543/myapp?pgbouncer=true&connection_limit=1"
```

---

## 🔭 Prisma Studio: Visual Database Browser

Prisma Studio is a GUI that lets you browse and edit your database without writing SQL. Start it with:

```bash
npx prisma studio
```

It opens automatically at `http://localhost:5555`. From here you can:

- Browse all your tables and records
- Add, edit, or delete rows
- Filter and sort data
- Navigate relationships between records

Prisma Studio is perfect for inspecting data during development — no third-party database GUI needed.

---

## 🗝️ Key Takeaways

- Prisma is a **type-safe ORM** with three core parts: Client (queries), Migrate (migrations), Studio (GUI)
- Install both `prisma` (CLI, dev dependency) and `@prisma/client` (runtime)
- `npx prisma init` creates `prisma/schema.prisma` and `.env`
- The `DATABASE_URL` format differs per database — SQLite (`file:./dev.db`) is the easiest starting point
- Use **Docker** to run PostgreSQL locally without a full installation
- Run `npx prisma generate` every time you change your schema
- Never commit `.env` files — use environment variables on your hosting platform for production
- Keep `prisma/migrations/` in version control — it's your database change history

---

## 📝 Quiz

Test your understanding before moving on:

**Question 1:** You update your `schema.prisma` to add a new field to a model. What command must you run to make sure your TypeScript code has autocomplete for the new field?

<details>
<summary>Show Answer</summary>

`npx prisma generate` — This regenerates the Prisma Client from your updated schema, so TypeScript knows about the new field.

</details>

---

**Question 2:** You're building a quick prototype and don't want to set up any database server. Which `DATABASE_URL` format should you use, and what change do you need to make in `schema.prisma`?

<details>
<summary>Show Answer</summary>

Use SQLite: set `DATABASE_URL="file:./dev.db"` in `.env`, and change the `provider` in `schema.prisma` from `"postgresql"` to `"sqlite"`. SQLite stores data in a local file with zero server setup.

</details>

---

**Question 3:** A teammate clones your repository and runs the app, but gets an error that `DATABASE_URL` is not defined. What is the most likely cause, and how do you fix it without exposing secrets?

<details>
<summary>Show Answer</summary>

The `.env` file was correctly excluded from git (via `.gitignore`), so the teammate doesn't have it locally. The fix is to create a `.env.example` file with placeholder values (like `DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"`) and commit that. Teammates copy it to `.env` and fill in their own credentials.

</details>

---

*Next chapter: **Defining Your Schema** — models, fields, relations, and data types in Prisma.*
