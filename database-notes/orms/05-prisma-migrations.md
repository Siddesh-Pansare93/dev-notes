# 🗄️ Prisma Migrations

> **Chapter 5 of the Prisma ORM Guide**
> Prerequisites: Basic Prisma schema knowledge, a working Prisma project setup.

---

## 🧭 Migration Hota Kya Hai?

Ek **migration** basically ek versioned script hoti hai jo batati hai ki tumhare database schema mein kya change hua. Isko video game ke save point jaisa socho — har migration exactly capture karti hai ki kya change hua aur kab, taaki tumhara database structure kisi bhi machine pe step-by-step reproduce ho sake.

Jab tum ek naya column add karte ho, table ka naam change karte ho, ya index create karte ho — Prisma ek `.sql` file generate karta hai jo us change ko represent karti hai. Ye file tumhare code ke saath store hoti hai, Git mein commit hoti hai, aur order mein apply hoti hai — sabse purani se sabse nayi tak.

Ek migration file kuch aisi dikhti hai:

```sql
-- CreateTable
CREATE TABLE "User" (
    "id"    SERIAL NOT NULL,
    "email" TEXT   NOT NULL,
    "name"  TEXT,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
```

Simple, readable, aur permanent.

---

## 🤔 Migrations Kyun Zaruri Hain?

Migrations ke bina, database schema change karna ek manual aur error-prone process ban jaata hai. Socho ek second — agar Zomato ka backend team bina migrations ke schema change karta, toh production mein SQL script hath se run karna padta, aur ek galti se poora order bigad sakta tha. Migrations kai real problems solve karte hain:

| Problem | Migrations Ke Bina | Migrations Ke Saath |
|---|---|---|
| New team member onboarding | Unknown order mein manually SQL scripts run karo | `migrate deploy` sab kuch automatically apply kar deta hai |
| Production deployment | Ummeed karo ki tumhe yaad ho kya change hua tha | Exact SQL diff capture hoti hai aur version-controlled hoti hai |
| Ek bekar change ko rollback karna | Backup se restore karo (risky) | Har migration ek discrete, reviewable step hai |
| Multiple environments | Dev aur prod chupke se alag ho jaate hain | Saare environments same migration history share karte hain |

Migrations basically tumhare **database ke liye version control** hain. Jaise Git tumhare code changes track karta hai, waise hi Prisma Migrate tumhare schema changes track karta hai.

---

## ⚙️ Prisma Migrate Commands

### Development Commands

**Naya migration create aur apply karo:**
```bash
npx prisma migrate dev --name init
npx prisma migrate dev --name add_bio
```
`--name` flag migration folder ke naam ka part ban jaata hai. Hamesha ek descriptive naam use karo (`add_bio`, `create_posts_table`, `add_index_on_email`). Ye command:
1. Tumhara current `schema.prisma` last migration se compare karta hai
2. Ek naya SQL migration file generate karta hai
3. Usse tumhare development database pe apply karta hai
4. Prisma Client regenerate karta hai

**Saare migrations reset aur re-apply karo (sirf development ke liye!):**
```bash
npx prisma migrate reset
```
Ye tumhara **poora database drop kar deta hai**, har migration ko scratch se re-apply karta hai, aur optionally tumhara seed script bhi run kar deta hai. Production mein isko kabhi use mat karna. Ye ek blunt tool hai jab local state gadbad ho jaaye toh use karne ke liye.

> [!warning]
> `migrate reset` production mein use karna matlab apna poora data udaana. Ye sirf local development ke liye hai.

**Migration status check karo:**
```bash
npx prisma migrate status
```
Dikhata hai ki kaunse migrations apply ho chuke hain aur kaunse pending hain. Production deploy se pehle audit karne ke liye kaafi useful.

### Production Commands

**Pending migrations apply karo:**
```bash
npx prisma migrate deploy
```
Ye production-safe command hai. Ye tumhara `prisma/migrations/` folder padhta hai, check karta hai ki target database pe kaunse migrations abhi tak apply nahi huye (`_prisma_migrations` table use karke), aur pending waale order mein apply kar deta hai. Ye naye migrations **generate nahi karta** — wo developer workflow ka step hai.

**Bina run kiye migration ko applied mark karo:**
```bash
npx prisma migrate resolve --applied 0001_init
```
Edge cases mein use hota hai — jab tumne manually koi migration script apply kar diya ho aur bas Prisma ko tracking table mein usse "done" mark karwana ho.

---

## 📁 `prisma/migrations/` Folder Ka Structure

Jab bhi tum `migrate dev` run karte ho, Prisma `prisma/migrations/` ke andar ek naya timestamped folder create karta hai:

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

- Har folder ka naam **UTC timestamp + tumhara migration naam** hota hai
- Andar ek single `migration.sql` file hoti hai jisme raw SQL changes hote hain
- `migration_lock.toml` database provider record karta hai (jaise `postgresql`), taaki agar tum galti se beech mein database switch kar do toh Prisma tumhe warn kar sake

Ye files **Git mein commit honi chahiye** — ye tumhare schema history ka source of truth hain.

---

## 🗂️ `_prisma_migrations` Table

Prisma automatically tumhare database mein `_prisma_migrations` naam ki ek table create karta hai. Tum ise directly kabhi touch nahi karte, lekin ye essential hai. Isme ye record hota hai:

| Column | Purpose |
|---|---|
| `id` | Migration record ka unique identifier |
| `checksum` | SQL file ka hash, tampering detect karne ke liye |
| `migration_name` | Migration folder ka naam |
| `started_at` / `finished_at` | Timing info |
| `applied_steps_count` | Kitne SQL steps run huye |
| `logs` | Agar migration fail hua toh error output |

Jab tum `migrate deploy` run karte ho, Prisma is table ko query karta hai ye pata karne ke liye ki kya pending hai. Agar koi migration folder mein hai lekin is table mein nahi, toh wo apply ho jaata hai.

---

## 🔄 Development Workflow

Development ka daily loop kuch aisa hota hai:

```
1. schema.prisma edit karo
        ↓
2. npx prisma migrate dev --name <description>
        ↓
3. Prisma migration SQL generate karta hai + apply karta hai
        ↓
4. Prisma Client regenerate hota hai
        ↓
5. Updated Client use karke application code likho
```

**Example — users mein `bio` field add karna:**

```prisma
// schema.prisma (pehle)
model User {
  id    Int    @id @default(autoincrement())
  email String @unique
  name  String?
}

// schema.prisma (baad mein — ye line tum add karte ho)
model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
  bio   String?   // <-- naya field
}
```

```bash
npx prisma migrate dev --name add_bio
```

Prisma generate karta hai:
```sql
-- AlterTable
ALTER TABLE "User" ADD COLUMN "bio" TEXT;
```

Ab tumhare database mein column aa gaya, aur tumhara Prisma Client turant `user.bio` ke baare mein jaan jaata hai.

---

## 🚀 Production Workflow

Production deployments kabhi `migrate dev` use nahi karte. Flow kuch aisa hai — bilkul jaise ek Zomato ka feature pehle staging pe test hota hai aur phir production ka rollout controlled tareeke se hota hai:

```
1. Developer local pe migrate dev run karta hai → migration files Git mein commit karta hai
        ↓
2. CI/CD pipeline code checkout karta hai (migration files ke saath)
        ↓
3. Pipeline run karta hai: npx prisma migrate deploy
        ↓
4. Prisma sirf pending migrations production DB pe apply karta hai
        ↓
5. Application updated schema ke saath start hota hai
```

Key difference yaad rakho: **`migrate dev` migrations create karta hai; `migrate deploy` unhe apply karta hai.** Production kabhi create nahi karta, sirf apply karta hai.

---

## 🗜️ Squashing Migrations (Experimental)

Mahino tak development karne ke baad, tumhare paas sau-do-sau migration files jama ho sakti hain. Squashing unhe ek single baseline migration mein condense kar deta hai:

```bash
npx prisma migrate squash --experimental
```

Ye tab useful hai jab:
- Naye environments onboard karne mein bahut time lagta hai (200 migrations apply karna)
- Purani migration files ab sirf noise ban gayi hain

Isse sambhal ke use karo — squashing history rewrite karta hai aur sirf tab karna chahiye jab saare existing environments already latest state pe migrate ho chuke hon.

---

## ✍️ Custom Migration Scripts

Prisma zyaadatar schema changes ke liye SQL auto-generate kar deta hai, lekin kuch changes mein human judgment chahiye hoti hai. Do common cases:

### Case 1: Existing Data Waali Table Mein NOT NULL Column Add Karna

Agar tumhari `users` table mein already rows hain aur tum ek non-nullable column add karte ho, toh database usse reject kar dega kyunki existing rows ke liye us column mein `NULL` aayega. 3-step process:

**Step 1 — Schema mein column nullable add karo, migrate karo:**
```prisma
model User {
  ...
  role  String?  // pehle nullable
}
```
```bash
npx prisma migrate dev --name add_role_nullable
```

**Step 2 — Existing rows ko backfill karne ke liye ek script likho:**
```typescript
// scripts/backfill-role.ts
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
await prisma.user.updateMany({ where: { role: null }, data: { role: 'member' } })
await prisma.$disconnect()
```
Isse aage badhne se pehle apne database ke against run karo.

**Step 3 — Schema mein column ko NOT NULL banao, migrate karo:**
```prisma
model User {
  ...
  role  String  // ab non-nullable
}
```
```bash
npx prisma migrate dev --name make_role_required
```

### Case 2: Column Rename Karna

Prisma ye differentiate nahi kar sakta ki tum rename kar rahe ho ya drop-plus-add. Agar tum `name` ko `fullName` mein rename karte ho, Prisma ye generate karega:

```sql
ALTER TABLE "User" DROP COLUMN "name";  -- DATA LOSS!
ALTER TABLE "User" ADD COLUMN "fullName" TEXT;
```

Safely rename karne ke liye, apply karne se pehle generated migration file ko manually edit karo:

```sql
-- Generated SQL ko replace karo isse:
ALTER TABLE "User" RENAME COLUMN "name" TO "fullName";
```

Phir apne `schema.prisma` ko match karne ke liye update karo aur `migrate dev` run karo. Prisma detect karega ki migration already exist karta hai aur usse dobara generate nahi karega.

> [!tip]
> Column rename ka case interview mein bhi kaafi common hai — hamesha yaad rakhna ki Prisma default behaviour "drop + add" hota hai, "rename" nahi.

---

## 🌱 Database Seed Karna

Seeding matlab tumhare database mein initial ya test data daalna — bilkul jaise ek naye Swiggy restaurant ko launch se pehle dummy menu items se populate kiya jaata hai. `prisma/seed.ts` create karo:

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

`package.json` mein seed script register karo:

```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

Isse run karo:

```bash
npx prisma db seed
```

`migrate reset` reset karne ke baad automatically seed script bhi run kar deta hai, isliye ek clean, populated development state restore karna sirf ek command se ho jaata hai.

---

## 🧪 `db push`: Bina Migrations Ke Prototyping

Jab tum abhi experiment kar rahe ho aur migration files commit nahi karna chahte, ye use karo:

```bash
npx prisma db push
```

Ye tumhara current `schema.prisma` seedhe database pe push kar deta hai **bina koi migration file banaye**. Ye kisi naye model ke early design phase ke liye perfect hai. Jab schema solidify ho jaaye, `migrate dev` pe switch kar do proper migration history generate karne ke liye.

> [!warning]
> `db push` data loss kar sakta hai agar tumhare changes columns drop karne ki demand karte hain. Ye production use ke liye nahi hai.

---

## 🔍 `db pull` (Introspection): Existing Database Se Prisma Tak

Agar tum ek existing project mein Prisma add kar rahe ho jiska database already hai, ye run karo:

```bash
npx prisma db pull
```

Prisma tumhare database se connect hota hai, uska current structure padhta hai (tables, columns, indexes, relations), aur ek **`schema.prisma` file generate karta hai** jo usse match karti hai. Ye existing database ko Prisma se manage karne ka starting point hai.

---

## 📐 Baselining: Existing Database Ko Prisma Mein Migrate Karna

Agar tumhare paas ek existing database hai aur tum chahte ho ki Prisma Migrate ab aage se control le le (bina purana SQL dobara run kiye), ye steps follow karo:

**Step 1 — Introspect karke apna schema generate karo:**
```bash
npx prisma db pull
```

**Step 2 — Manually ek baseline migration folder banao:**
```bash
mkdir -p prisma/migrations/0001_baseline
```

**Step 3 — Current database schema ko us file mein dump karo:**
Apne database ke dump tool ka use karo (jaise `pg_dump --schema-only`) aur output ko `prisma/migrations/0001_baseline/migration.sql` mein save karo.

**Step 4 — Isse already-applied mark karo:**
```bash
npx prisma migrate resolve --applied 0001_baseline
```

Ab Prisma ko pata hai ki baseline exist karta hai aur applied hai. Aage ke saare `migrate dev` runs is baseline ke upar incremental migrations generate karenge.

---

## 💡 Key Takeaways

- Ek **migration** ek versioned SQL file hai jo ek schema change capture karti hai — isse source code jaisa treat karo aur Git mein commit karo.
- Development mein migrations generate aur apply karne ke liye **`migrate dev`** use karo; CI/CD aur production pipelines mein **`migrate deploy`** use karo.
- **`_prisma_migrations`** table Prisma ka internal ledger hai — ye track karta hai ki kya apply ho chuka hai, taaki deployments idempotent rahein.
- **Production mein kabhi `migrate reset` use mat karo** — ye saara data drop kar deta hai. Ye sirf ek development convenience hai.
- Jin changes ke liye Prisma auto-generate nahi kar sakta (rename, NOT NULL backfill), unke liye apply karne se pehle migration SQL manually edit karo.
- **`db push`** fast prototyping ke liye hai; jab schema stable ho jaaye toh `migrate dev` pe switch karo.
- **`db pull`** existing database se schema generate karta hai, aur **baselining** Prisma ko purani history replay kiye bina management lene deta hai.

---

## 📝 Quiz

**Question 1**
Tum ek model mein ek naya `String` column add karte ho jisme already hazaron rows hain database mein. Tum column ko `String` (not nullable) turant mark kar dete ho. Kaunsi problem aayegi, aur sahi approach kya hai?

> Database NOT NULL column add karna reject kar dega jab existing rows us constraint ko satisfy nahi kar sakte. Sahi approach 3-step process hai: pehle nullable add karo, application code se existing rows ko backfill karo, phir column ko NOT NULL mein alter karo.

**Question 2**
Ek colleague poochta hai ki `prisma/migrations/` folder Git mein kyun commit hota hai. Tum unhe kya bataoge?

> Migration folder tumhare database schema ki version history hai. Isse commit karne se ye ensure hota hai ki har developer aur har deployment environment exact same changes exact same order mein apply kare, jisse schema reproducible aur auditable ban jaata hai.

**Question 3**
`npx prisma migrate dev` aur `npx prisma migrate deploy` mein kya difference hai?

> `migrate dev` ek development tool hai: ye tumhara schema last migration se compare karta hai, ek naya SQL file generate karta hai, aur usse local database pe apply karta hai. `migrate deploy` production ke liye hai: ye existing migration files padhta hai aur jo bhi `_prisma_migrations` table mein record nahi huye unhe apply kar deta hai — ye kabhi naye migrations generate nahi karta.

---

*Next Chapter: Prisma Relations — one-to-one, one-to-many, aur many-to-many.*
