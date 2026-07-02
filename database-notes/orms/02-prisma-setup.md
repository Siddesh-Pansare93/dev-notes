# 🛠️ Prisma Setup and Configuration

> **Difficulty:** Beginner | **Time to read:** ~15 minutes | **Prerequisites:** Basic Node.js knowledge

---

## 🤔 Prisma Hai Kya Cheez?

Prisma ek **next-generation ORM (Object-Relational Mapper)** hai Node.js aur TypeScript ke liye. Purane zamane ke ORMs mein tumne dekha hoga — class decorators ka jhanjhat, ya phir raw SQL strings jo poore codebase mein bikhri padi hoti hain. Prisma yeh sab chhod ke ek **declarative schema file** use karta hai, jo tumhare database structure ka single source of truth banti hai.

Socho Prisma ko ek smart translator ki tarah — jo tumhare application code aur database ke beech baitha hai. Tum sirf TypeScript likhte ho, SQL likhna Prisma ka kaam hai.

**Developers Prisma ko kyun pasand karte hain?**

- **Type-safe queries** — autocomplete aur compile-time errors bugs ko production mein jaane se pehle hi pakad lete hain
- **Human-readable schema** — ek hi file mein poora database structure define ho jaata hai
- **Auto-generated client** — boilerplate DAO classes likhne ki zaroorat nahi
- **Multiple databases ke saath kaam karta hai** — PostgreSQL, MySQL, SQLite, SQL Server, MongoDB, CockroachDB

---

## 🧩 Prisma Ke Components

Prisma sirf ek tool nahi hai — yeh **teen components ka ek suite** hai, jo saath mein kaam karte hain:

### 1. Prisma Client
Yeh tumhare application ke liye auto-generated, type-safe query builder hai. Jab bhi tum apna schema update karte ho, client ko regenerate karna padta hai taaki woh schema ke saath sync mein rahe.

```typescript
// Example: fetch all users
const users = await prisma.user.findMany();
```

### 2. Prisma Migrate
Yeh ek database migration tool hai jo schema changes ko time ke saath track karta hai. Jab tum schema change karte ho, Prisma Migrate SQL migration files generate karta hai aur unhe database pe apply karta hai — matlab tumhara database structure bhi code ke saath version control mein rehta hai.

```bash
npx prisma migrate dev --name add-user-table
```

### 3. Prisma Studio
Yeh ek **visual, browser-based database browser** hai jo Prisma ke andar hi built-in aata hai. Tum records ko dekh, add, edit, delete kar sakte ho — bina ek line SQL likhe. Development aur debugging ke liye ekdum perfect.

```bash
npx prisma studio
# Opens at http://localhost:5555
```

---

## ✅ Prerequisites

Prisma install karne se pehle, yeh cheezein check kar lo:

| Tool | Minimum Version | Check karo isse |
|------|----------------|------------|
| Node.js | v16+ | `node --version` |
| npm | v7+ | `npm --version` |
| yarn (optional) | v1.22+ | `yarn --version` |
| pnpm (optional) | v7+ | `pnpm --version` |

Ek **database** bhi chahiye hoga. Agar abhi nahi hai toh tension mat lo — hum Docker se ek spin up karna dekhenge, aur SQLite ke liye toh koi setup hi nahi chahiye.

---

## 🚀 Step-by-Step Installation

### Step 1: Node.js Project Initialize Karo

Ek naye directory se shuru karo:

```bash
mkdir my-prisma-app
cd my-prisma-app
npm init -y
```

Isse ek `package.json` file ban jaayegi.

### Step 2: Prisma CLI Install Karo

Prisma CLI ek development tool hai — yeh migrations manage karne aur client generate karne mein madad karta hai. Ise dev dependency ki tarah install karo:

```bash
npm install prisma --save-dev
```

### Step 3: Prisma Client Install Karo

Prisma Client woh cheez hai jo tumhara application runtime pe actually use karta hai database query karne ke liye:

```bash
npm install @prisma/client
```

> **Note:** Dono packages chahiye. `prisma` CLI toolchain hai; `@prisma/client` runtime library hai jo tumhara app import karta hai.

### Step 4: Prisma Initialize Karo

Prisma initializer run karo taaki zaruri files scaffold ho jaayein:

```bash
npx prisma init
```

Yeh command do cheezein create karta hai:

1. **`prisma/schema.prisma`** — tumhari schema file
2. **`.env`** — tumhari environment variables file (agar pehle se nahi hai toh)

---

## 📄 `prisma/schema.prisma` File

`npx prisma init` run karne ke baad, `prisma/schema.prisma` kholo. Kuch aisa dikhega:

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

**Isko break karke samjhte hain:**

- **`generator client`** — Prisma ko batata hai ki JavaScript/TypeScript client generate karna hai
- **`datasource db`** — define karta hai ki kaunsa database engine use karna hai aur woh kahan milega
- **`provider`** — database ka type (postgresql, mysql, sqlite, etc.)
- **`url = env("DATABASE_URL")`** — tumhari `.env` file se connection string padhta hai (credentials kabhi hardcode mat karo!)

Iske neeche tum apne data models add karoge. Jaise:

```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
}
```

---

## 🔑 `.env` File Aur DATABASE_URL

`.env` file tumhara database connection string hold karti hai. Prisma ise automatically padh leta hai.

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
```

### Har Database Ke Liye DATABASE_URL Format

Apne database ke hisaab se format choose karo:

**PostgreSQL** (production mein sabse common)
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

**SQLite** — seekhne ke liye sabse aasan, koi server nahi chahiye!
```env
DATABASE_URL="file:./dev.db"
```

**MongoDB**
```env
DATABASE_URL="mongodb://dev:secret@localhost:27017/myapp"
```

> **Beginner tip:** Seekhte waqt **SQLite** use karo. Yeh ek file-based database hai — no installation, no Docker, no credentials ka jhanjhat. Bas `schema.prisma` mein `provider` ko `"sqlite"` set karo aur URL ko `"file:./dev.db"`.

---

## 🐳 Docker + PostgreSQL Ke Saath Setup

Agar tumhe local install kiye bina ek real PostgreSQL database chahiye, toh Docker sabse aasan raasta hai. Ek hi command se ek fully running Postgres server mil jaata hai — bilkul jaise ek click mein Zomato pe order place ho jaata hai, backend ka pura kaam ek line mein ho jaata hai:

```bash
docker run -d \
  --name mydb \
  -e POSTGRES_USER=dev \
  -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_DB=myapp \
  -p 5432:5432 \
  postgres:15
```

**Har flag ka kaam:**

| Flag | Purpose |
|------|---------|
| `-d` | Background mein run karo (detached mode) |
| `--name mydb` | Container ko ek friendly naam do |
| `-e POSTGRES_USER=dev` | Database ka username set karo |
| `-e POSTGRES_PASSWORD=secret` | Database ka password set karo |
| `-e POSTGRES_DB=myapp` | Startup pe `myapp` naam ka database create karo |
| `-p 5432:5432` | Container ka port 5432 apni machine pe map karo |
| `postgres:15` | Official Postgres 15 image use karo |

Ab apni `.env` update karo:

```env
DATABASE_URL="postgresql://dev:secret@localhost:5432/myapp?schema=public"
```

Container chal raha hai ya nahi verify karne ke liye:

```bash
docker ps
```

Baad mein isse stop karne ke liye:

```bash
docker stop mydb
```

---

## ⚙️ Prisma Client Generate Karna

**Kyun zaruri hai?** Jab bhi tum apna `schema.prisma` modify karte ho, Prisma Client ko regenerate karna hi padega, warna woh purane schema ke hisaab se hi kaam karta rahega — jaise Swiggy app update na kare toh purana menu dikhata rahega.

```bash
npx prisma generate
```

Yeh tumhari schema ko padhta hai aur TypeScript types aur query methods generate karta hai `node_modules/@prisma/client` ke andar. Iske baad tum ise apne code mein import aur use kar sakte ho:

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

> **Important:** Har schema change ke baad `npx prisma generate` zaroor run karo. Kaafi bugs isi step ko bhoolne se aate hain.

---

## 🗂️ Prisma Project Ki Folder Structure

Setup ke baad, tumhara project structure kuch aisa dikhega:

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

**Yaad rakhne wale rules:**

- `prisma/` folder aur `schema.prisma` git mein commit hone chahiye
- `prisma/migrations/` folder hamesha commit hona chahiye — yeh tumhara migration history hai
- `.env` file **kabhi** commit mat karo — ise `.gitignore` mein daalo
- `node_modules/@prisma/client` ke andar ki files manually edit mat karo

---

## 🌍 Environment-Specific Configuration

**Kya hota hai real production apps mein?** Woh multiple environments mein chalte hain — development tumhare laptop pe, staging QA testing ke liye, aur production real users ke liye. Har environment ko apna alag database chahiye — bilkul jaise IRCTC ka testing server alag hota hai aur live booking server alag.

### Multiple `.env` Files Use Karna

```bash
.env                # Default (development)
.env.staging        # Staging environment
.env.production     # Production environment (never commit this!)
```

### Sahi Environment Load Karna

`--env-file` flag ya `dotenv-cli` jaisa tool use karo:

```bash
npm install dotenv-cli --save-dev
```

Phir `package.json` mein scripts add karo:

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

> **Security tip:** Production mein hamesha SSL required rakho (`sslmode=require`) aur apne hosting platform ke environment variables use karo — credentials ko kahin bhi hardcode mat karo.

### Production Mein Connection Pooling

Production apps aksar ek connection pooler use karte hain jaise **PgBouncer** ya Prisma ka apna **Accelerate**. PgBouncer compatibility ke liye `?pgbouncer=true` add karo:

```env
DATABASE_URL="postgresql://user:pass@bouncer-host:6543/myapp?pgbouncer=true&connection_limit=1"
```

---

## 🔭 Prisma Studio: Visual Database Browser

Prisma Studio ek GUI hai jisse tum apna database browse aur edit kar sakte ho — bina SQL likhe. Isse start karo:

```bash
npx prisma studio
```

Yeh automatically `http://localhost:5555` pe khul jaata hai. Yahan se tum:

- Apni saari tables aur records browse kar sakte ho
- Rows add, edit, ya delete kar sakte ho
- Data filter aur sort kar sakte ho
- Records ke beech relationships navigate kar sakte ho

Development ke dauraan data inspect karne ke liye Prisma Studio ekdum perfect hai — koi third-party database GUI ki zaroorat nahi.

---

## 🗝️ Key Takeaways

- Prisma ek **type-safe ORM** hai jiske teen core parts hain: Client (queries), Migrate (migrations), Studio (GUI)
- `prisma` (CLI, dev dependency) aur `@prisma/client` (runtime) dono install karo
- `npx prisma init` se `prisma/schema.prisma` aur `.env` ban jaate hain
- `DATABASE_URL` ka format har database ke hisaab se alag hota hai — SQLite (`file:./dev.db`) shuruaat karne ka sabse aasan tareeka hai
- Local pe PostgreSQL chalane ke liye **Docker** use karo, full installation ki zaroorat nahi
- Schema change karne ke har baar `npx prisma generate` run karo
- `.env` files kabhi commit mat karo — production ke liye hosting platform ke environment variables use karo
- `prisma/migrations/` ko version control mein rakho — yeh tumhara database change history hai

---

## 📝 Quiz

Aage badhne se pehle apni samajh test karo:

**Question 1:** Tumne apni `schema.prisma` mein ek naya field add kiya. Konsa command chalana padega taaki tumhare TypeScript code mein us naye field ke liye autocomplete aa jaaye?

<details>
<summary>Show Answer</summary>

`npx prisma generate` — Yeh tumhare updated schema se Prisma Client ko regenerate karta hai, taaki TypeScript ko naye field ke baare mein pata chal jaaye.

</details>

---

**Question 2:** Tum ek quick prototype bana rahe ho aur koi database server set up nahi karna chahte. Konsa `DATABASE_URL` format use karoge, aur `schema.prisma` mein kya change karna padega?

<details>
<summary>Show Answer</summary>

SQLite use karo: `.env` mein `DATABASE_URL="file:./dev.db"` set karo, aur `schema.prisma` mein `provider` ko `"postgresql"` se `"sqlite"` mein badal do. SQLite data ko ek local file mein store karta hai — zero server setup.

</details>

---

**Question 3:** Tumhara teammate tumhara repository clone karta hai aur app run karta hai, lekin usse error milta hai ki `DATABASE_URL` defined nahi hai. Sabse likely wajah kya hai, aur secrets expose kiye bina isse kaise fix karoge?

<details>
<summary>Show Answer</summary>

`.env` file `.gitignore` ki wajah se sahi tarah se git se exclude ho gayi thi, isliye teammate ke paas woh locally nahi hai. Fix yeh hai ki ek `.env.example` file banao placeholder values ke saath (jaise `DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"`) aur usse commit karo. Teammates ise `.env` mein copy karke apne credentials daal sakte hain.

</details>

---

*Next chapter: **Defining Your Schema** — models, fields, relations, and data types in Prisma.*
