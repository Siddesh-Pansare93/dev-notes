# Prisma Advanced — Transactions, Raw SQL, Middleware, and Performance

> **Level:** Intermediate — basic Prisma CRUD, relations, aur Prisma schema pehle se aana chahiye. Yeh chapter un cheezo ke baare mein hai jo tum tab use karte ho jab app simple queries se aage badh jaata hai.

---

## Table of Contents

1. [Transactions](#-transactions)
2. [Raw SQL](#-raw-sql)
3. [Middleware](#-middleware)
4. [Performance](#-performance)
5. [Prisma Client Extensions](#-prisma-client-extensions)
6. [Key Takeaways](#-key-takeaways)
7. [Quiz](#-quiz)

---

## 🔁 Transactions

**Kya hota hai?** Ek **transaction** matlab database operations ka ek group jo ya to sab ke sab succeed karenge, ya sab ke sab fail. Agar beech mein koi ek step error de de, toh database ab tak ke saare changes rollback kar deta hai — jaise kuch hua hi nahi. Yeh data integrity ke liye zaruri hai.

Socho — tum Paytm se kisi ka card charge kar rahe ho aur uske baad order record create karna hai. Agar payment ho gaya lekin order create karte waqt kuch fail ho gaya, aur transaction nahi hai, toh customer ka paisa kat gaya but order kahin nahi hai. Bawaal ho jayega support team ke liye. Isi problem ko transactions solve karte hain.

Prisma do transaction flavors deta hai.

---

### Sequential (Interactive) Transactions

**Kyun zaruri hai?** Kabhi kabhi ek query ka result agli query mein use karna padta hai — jaise pehle user banao, phir uske `user.id` se profile banao. Interactive form isi ke liye hai — queries **ek ke baad ek** chalti hain, aur ek query ka result agli query mein input ban sakta hai. Tum `$transaction` ko ek async callback dete ho; andar har query global `prisma` client ki jagah special `tx` (transaction client) use karti hai.

```typescript
const result = await prisma.$transaction(async (tx) => {
  // Step 1 — create the user row
  const user = await tx.user.create({
    data: { email, username },
  })

  // Step 2 — we need user.id, so this MUST come after step 1
  const profile = await tx.profile.create({
    data: { userId: user.id, bio },
  })

  return { user, profile }
})
// If either step throws, BOTH rows are rolled back automatically
```

**`tx` hi kyun, `prisma` kyun nahi?** `tx` object ek special client hai jo usi database connection aur usi open transaction se bandha hota hai. Agar tum andar global `prisma` client use karoge, toh woh query ek alag connection pe chalegi, transaction ke bahar — aur atomicity guarantee gayab ho jayegi. Socho tumne UPI transfer ke andar ek alag "connection" se database hit kiya — woh transfer ke saath rollback nahi hoga, toh data inconsistent reh jayega.

**Timeout:** Default mein Prisma interactive transaction ko 5 second baad abort kar deta hai. Long-running kaam ke liye tum yeh override kar sakte ho:

```typescript
await prisma.$transaction(async (tx) => { /* ... */ }, {
  maxWait: 5000,   // ms to wait for a connection from the pool (default 2000)
  timeout: 10000,  // ms before the transaction is force-rolled-back (default 5000)
})
```

---

### Batch (Array) Transactions

**Kab use karein?** Jab tumhare operations ek dusre se **independent** hain — matlab query A ka result query B mein feed nahi ho raha — tab tum ek array pass kar sakte ho. Prisma saari queries ek hi round-trip mein bhejta hai aur unhe ek single database transaction mein wrap kar deta hai.

```typescript
const [createdPost, updatedUser] = await prisma.$transaction([
  prisma.post.create({
    data: { content, authorId },
  }),
  prisma.user.update({
    where: { id: authorId },
    data: { postCount: { increment: 1 } },
  }),
])
```

Notice karo — yahan `prisma` use ho raha hai, `tx` nahi. Tum bas query *promises* bana rahe ho aur unki ek list `$transaction` ko de rahe ho. Array syntax simple hai lekin utna flexible nahi — intermediate results pe branch nahi kar sakte.

| Feature | Sequential (callback) | Batch (array) |
|---|---|---|
| Query A ka result Query B mein use karna | Haan | Nahi |
| Syntax | `$transaction(async tx => {})` | `$transaction([...])` |
| Round-trips | Har query ka alag | Sab ke liye ek |
| Timeout control | Haan | Nahi (single round-trip) |

---

## 🧬 Raw SQL

Prisma ka query API zyada tar use-cases cover kar leta hai, lekin kabhi kabhi tumhe raw SQL chahiye hota hai — koi complex window function, database-specific feature, ya migration-time script. Iske liye Prisma do raw helpers deta hai.

---

### `$queryRaw` — Read Data

Jab tumhe rows chahiye, tab yeh use karo. SQL ko template literal se tag karo:

```typescript
import { Prisma } from '@prisma/client'

const cutoffDate = new Date('2024-01-01')

const users = await prisma.$queryRaw<User[]>`
  SELECT * FROM users WHERE created_at > ${cutoffDate}
`
```

Kuch important baatein:

- **Type parameter** — `$queryRaw<User[]>` TypeScript ko batata hai ki har row ka shape kaisa hai. Prisma isko compile time pe verify nahi kar sakta; tumhari zimmedari hai ki yeh actual SELECT columns ke saath sync rahe.
- **Template literal = auto-parameterization** — `${cutoffDate}` interpolation plain string concatenation NAHI hai. Prisma isko ek parameterized placeholder (`$1`, `?`, database ke hisaab se) mein convert karta hai, jo **SQL injection ko prevent** karta hai. Kabhi bhi apne haath se string concatenation karke SQL mat banao — warna ho sakta hai koi tumhare form field mein `'; DROP TABLE users; --` type cheez daal de, jaise ek expired IRCTC coupon code exploit karke.
- **`Prisma.sql` helper** — Jab dynamically query ke parts compose karne ho, `Prisma.sql` use karo:

```typescript
const column = 'email'
// Safe composition
const rows = await prisma.$queryRaw`
  SELECT ${Prisma.raw(column)} FROM users LIMIT 10
`
// WARNING: Prisma.raw does NOT sanitize — only use it with values
// you fully control (never user input)
```

> [!warning]
> `Prisma.raw` sanitize NAHI karta. Isko sirf un values ke saath use karo jo tum khud control karte ho (jaise hardcoded column names) — kabhi bhi user input ke saath nahi, warna SQL injection ka seedha darwaza khul jayega.

---

### `$executeRaw` — Mutate Data

Jab `UPDATE`, `INSERT`, ya `DELETE` karna ho aur rows wapas nahi chahiye, tab yeh use karo. Yeh **kitni rows affect hui** wo number return karta hai.

```typescript
const affectedRows = await prisma.$executeRaw`
  UPDATE users SET is_active = true WHERE last_login > ${cutoffDate}
`
console.log(`Activated ${affectedRows} users`)
```

Same parameterization rules yahan bhi lagu hote hain. Hamesha template-literal syntax use karo; user-controlled values ko kabhi `Prisma.raw` se interpolate mat karo.

---

## 🪝 Middleware

**Kya hota hai?** Prisma Middleware tumhe har query ko run hone se pehle (ya return hone ke baad) intercept karne deta hai — poore application mein globally. Socho ise Express middleware jaisa, bas database operations ke liye.

Tum `prisma.$use(...)` se middleware register karte ho. Har middleware ko milta hai:
- `params` — query describe karta hai: kaunsa model, kaunsa action, kya arguments.
- `next` — ek function jo query ko chain mein aage bhejta hai (aur eventually database tak).

---

### Example: Soft Delete

**Kyun zaruri hai?** Hard delete row ko permanently hata deta hai. Soft delete iski jagah ek `deletedAt` timestamp set kar deta hai taaki baad mein data recover ho sake — bilkul jaise Gmail mein "Trash" folder hota hai, delete hone ke baad bhi 30 din tak recover kar sakte ho. Har delete call mein manually yeh logic likhna error-prone hai. Middleware isko centralize kar deta hai:

```typescript
prisma.$use(async (params, next) => {
  // Intercept delete calls on the Post model
  if (params.action === 'delete' && params.model === 'Post') {
    // Swap the delete for an update
    params.action = 'update'
    params.args.data = { deletedAt: new Date() }
  }
  return next(params)
})
```

Ab tumhare codebase mein har `prisma.post.delete(...)` chupke se soft delete ban jaata hai — kisi aur code ko change karne ki zarurat nahi.

Iske saath `findMany` / `findFirst` ko bhi intercept karna chahoge, taaki soft-deleted records exclude ho jayein:

```typescript
prisma.$use(async (params, next) => {
  if (params.model === 'Post') {
    if (params.action === 'findMany' || params.action === 'findFirst') {
      params.args.where = {
        ...params.args.where,
        deletedAt: null,        // exclude soft-deleted rows
      }
    }
  }
  return next(params)
})
```

---

### Example: Query Timing / Logging

```typescript
prisma.$use(async (params, next) => {
  const start = Date.now()
  const result = await next(params)
  const elapsed = Date.now() - start

  if (elapsed > 200) {
    console.warn(`Slow query (${elapsed}ms): ${params.model}.${params.action}`)
  }

  return result
})
```

> [!info]
> Prisma Middleware ko ab "legacy" feature maana jaata hai. Naye projects ke liye Prisma **Prisma Client Extensions** recommend karta hai (isi chapter ke end mein cover kiya hai), jisme better TypeScript support aur composability milti hai. Middleware abhi bhi kaam karta hai aur existing codebases mein widely use hota hai.

---

## ⚡ Performance

### The N+1 Problem

**Kya hai yeh problem?** N+1 problem kisi bhi ORM ke saath sabse common performance mistake hai. Dekho Prisma mein yeh kaisa dikhta hai:

```typescript
// BAD — N+1
const posts = await prisma.post.findMany()          // 1 query

for (const post of posts) {
  const author = await prisma.user.findUnique({      // N queries (one per post!)
    where: { id: post.authorId },
  })
  console.log(post.title, author.name)
}
// If you have 100 posts → 101 database round-trips
```

Socho Zomato ki app agar har order card ke liye alag se "restaurant details" fetch karne database ko 100 baar hit kare — app hang ho jayegi. Yahi ho raha hai upar wale code mein.

**Fix: `include` use karo**

```typescript
// GOOD — 1 + 1 queries (or sometimes just 1)
const posts = await prisma.post.findMany({
  include: { author: true },
})

for (const post of posts) {
  console.log(post.title, post.author.name)   // author already loaded
}
```

Prisma ek second query fire karta hai jo saare related authors ko **ek hi shot mein** fetch kar leta hai aur results ko memory mein stitch kar deta hai — har post ke liye alag query maarne se kahin behtar.

---

### `select` vs `include` — Sirf Wahi Load Karo Jiski Zarurat Hai

- **`include`** — model ke saare scalar fields rakhta hai AND relations bhi eagerly load karta hai.
- **`select`** — sirf woh fields deta hai jo tum explicitly maango, scalar ho ya relational.

```typescript
// include: gives you every column on Post + the relation
const posts = await prisma.post.findMany({
  include: { author: { select: { name: true } } },
})

// select: gives you only the fields you name
const posts = await prisma.post.findMany({
  select: {
    id: true,
    title: true,
    author: { select: { name: true } },
  },
})
```

`SELECT *` se bacho (jo tab implicit default hota hai jab tum `select` omit karte ho). Ek badi table pe jisme bahut saare columns hain — especially `TEXT` blobs ya `JSONB` columns — unused data transfer karna bandwidth aur memory dono waste karta hai. Jab pata ho ki sirf kuch fields chahiye, tab `select` use karo.

---

### Prisma ka Built-In Query Batching (DataLoader Pattern)

**Kya hota hai?** Jab Prisma dekhta hai ki same event-loop tick mein multiple `findUnique` calls same `where` field ke saath ho rahe hain, toh woh automatically inhe ek single `WHERE id IN (...)` query mein batch kar deta hai. Yeh wahi idea hai jo Facebook ki DataLoader library use karti hai. Yeh transparently hota hai — tum individual lookups likhte ho aur Prisma unhe collapse kar deta hai:

```typescript
// These two calls issued in the same tick...
const a = prisma.user.findUnique({ where: { id: 1 } })
const b = prisma.user.findUnique({ where: { id: 2 } })

await Promise.all([a, b])
// Prisma sends: SELECT * FROM users WHERE id IN (1, 2)  ← one query!
```

Yeh feature `findUnique` ke liye default on hai — kuch configure karne ki zarurat nahi.

---

### Connection Pooling

**Kyun zaruri hai?** Prisma Client database connections ka ek pool khol ke rakhta hai. Bahut zyada ya bahut kam connections open rakhna scaling ki classic problem hai:

- **Bahut kam** — requests queue mein wait karti hain free connection ke liye.
- **Bahut zyada** — tumhara database server overwhelm ho jaata hai.

Socho ek IRCTC ki tatkal booking ka scene — agar counter (connections) kam hain toh log queue mein latke rehte hain; agar bina limit ke sabko andar ghusa diya toh poora system crash ho jaata hai.

**Prisma Accelerate (Cloud)** — Prisma ka managed connection pool aur global cache layer. Tum apne database URL ko Accelerate proxy URL se swap kar dete ho; yeh pooling, edge caching sambhalta hai aur users ke close warm connections rakhta hai.

**PgBouncer (Self-hosted)** — Ek lightweight PostgreSQL connection pooler jo tum apne database ke saath chalate ho. Prisma ko direct Postgres ki jagah PgBouncer pe point karo. Jab PgBouncer transaction mode mein use kar rahe ho, connection string mein `?pgbouncer=true` add karo taaki Prisma prepared statements disable kar de (jo us mode mein unsupported hain):

```
DATABASE_URL="postgresql://user:pass@pgbouncer-host:5432/mydb?pgbouncer=true"
```

---

### Query Logging

Performance debug karte waqt Prisma ka built-in query logger on karo:

```typescript
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
})
```

`'query'` enable karne se tumhe console mein har generated SQL statement dikhega, saath mein parameter values aur execution time bhi. Development mein yeh invaluable hai, lekin production mein isko disable (ya `'warn'`/`'error'` tak reduce) kar dena chahiye, warna log noise aur performance overhead badh jaayega.

Programmatically bhi listen kar sakte ho:

```typescript
prisma.$on('query', (e) => {
  console.log(`Query: ${e.query}`)
  console.log(`Duration: ${e.duration}ms`)
})
```

---

### `prisma.$metrics` — Prometheus Metrics

**Kyun zaruri hai?** Production observability ke liye Prisma internal metrics (connection pool usage, query latency histograms) Prometheus format mein expose karta hai:

```typescript
// Enable in client constructor
const prisma = new PrismaClient({
  log: ['warn', 'error'],
})

// Expose an HTTP endpoint for your monitoring stack
const metrics = await prisma.$metrics.prometheus()
console.log(metrics)
// # HELP prisma_client_queries_total ...
// # TYPE prisma_client_queries_total counter
// prisma_client_queries_total{...} 42
```

Is output ko ek `/metrics` endpoint pe pipe karo jise Prometheus scrape kare. Iske saath Grafana dashboards combine karo taaki connection pool saturation aur slow queries time ke saath visualize ho sakein — jaise Swiggy ka ops team apne delivery-time dashboards monitor karta hoga.

---

## 🧩 Prisma Client Extensions

**Kya hota hai?** Prisma Client Extensions (stable Prisma 4.16 se) Prisma ko uski built-in capabilities se aage extend karne ka modern, type-safe tareeka hai. Yeh zyada tar wahi kaam karte hain jo pehle middleware karta tha, lekin proper TypeScript inference ke saath.

Tum `prisma.$extends({...})` se extensions banate ho aur result ko ek naye client variable mein assign karte ho.

---

### Result Extensions — Computed Fields

Ek virtual field add karo jo har baar record return hone pe existing fields se compute ho:

```typescript
const xprisma = prisma.$extends({
  result: {
    user: {
      fullName: {
        needs: { firstName: true, lastName: true },
        compute(user) {
          return `${user.firstName} ${user.lastName}`
        },
      },
    },
  },
})

const user = await xprisma.user.findFirst()
console.log(user.fullName)  // "Jane Doe" — TypeScript knows this field exists!
```

`needs` object Prisma ko batata hai ki kaunse underlying fields required hain. Agar tum user ko `firstName` ke bina `select` karoge, aur `fullName` access karne ki koshish karoge, toh TypeScript error dega.

---

### Model Extensions — Models Pe Custom Methods

Model pe seedha domain-specific methods add karo:

```typescript
const xprisma = prisma.$extends({
  model: {
    user: {
      async findByEmail(email: string) {
        return prisma.user.findUnique({ where: { email } })
      },
      async activate(id: number) {
        return prisma.user.update({
          where: { id },
          data: { isActive: true, activatedAt: new Date() },
        })
      },
    },
  },
})

// Clean call site — reads like a domain model
const user = await xprisma.user.findByEmail('jane@example.com')
await xprisma.user.activate(user.id)
```

---

### Client Extensions — Root Client Ko Extend Karo

Client ke top-level pe methods ya properties add karo:

```typescript
const xprisma = prisma.$extends({
  client: {
    async healthCheck() {
      await prisma.$queryRaw`SELECT 1`
      return 'ok'
    },
  },
})

const status = await xprisma.healthCheck()
```

---

### Composing Extensions

Extensions chainable hote hain. Chhote, focused extensions banao aur unhe compose karo:

```typescript
const withAudit = prisma.$extends(auditExtension)
const withSoftDelete = withAudit.$extends(softDeleteExtension)
const withMetrics = withSoftDelete.$extends(metricsExtension)

export { withMetrics as prisma }
```

Har `$extends` call ek naya client return karta hai — original `prisma` instance untouched rehta hai. Yahi composability middleware ke comparison mein sabse bada advantage hai, jahan saare interceptors ek hi mutable chain share karte hain.

---

## 🏁 Key Takeaways

- **Transactions** all-or-nothing execution guarantee karte hain. Jab queries ek dusre ke result pe depend karti hain, callback form (`async tx => {}`) use karo; jab independent hain, array form use karo.
- **`$queryRaw` aur `$executeRaw` ke saath hamesha template literals use karo** — kabhi string concatenation nahi — automatic parameterization se SQL injection prevent karne ke liye.
- **Middleware** ek global interceptor hai jo cross-cutting concerns ke liye useful hai — soft delete, logging, auditing. Yeh legacy API hai; naye code mein **Prisma Client Extensions** prefer karo.
- **N+1 problem** ko `include` se solve karo — Prisma ko relations bulk mein load karne do, loop mein ek-ek karke query maarne ke bajaye.
- **`select` tumhara dost hai** — jo columns chahiye nahi unhe transfer mat karo, especially bade text ya JSON fields ke case mein.
- **Connection pooling** (Prisma Accelerate ya PgBouncer ke through) scale pe zaruri hai taaki database connections exhaust na ho.
- **Prisma Client Extensions** type-safe, composable tareeke se computed fields, custom model methods, aur client-level utilities add karne deta hai — bina TypeScript inference qurbaan kiye.

---

## 📝 Quiz

Aage badhne se pehle khud ko test kar lo.

**Question 1**

Tumhare paas ek function hai jo bank transfer create karta hai: ek account debit hota hai aur dusra credit. Kaunsi transaction style use karoge, aur kyun?

<details>
<summary>Answer</summary>

**Sequential (interactive) transaction** use karo (`$transaction(async (tx) => {...})`). Dono operations ko same transaction client (`tx`) share karna chahiye taaki woh ek hi atomic unit mein rahein. Agar credit fail hota hai, toh debit automatically rollback ho jayega. Batch (array) form bhi yahan chal jaata, kyunki koi bhi result dusre ka input nahi hai, lekin sequential form is use-case ke liye zyada clear hai aur tumhe conditional logic add karne ki flexibility bhi deta hai.

</details>

---

**Question 2**

Ek teammate 50 blog posts ki list unke authors ke naam ke saath display karne ke liye yeh code likhta hai:

```typescript
const posts = await prisma.post.findMany()
for (const post of posts) {
  const author = await prisma.user.findUnique({ where: { id: post.authorId } })
  console.log(post.title, author.name)
}
```

Is code mein kya problem hai, aur tum isko kaise fix karoge?

<details>
<summary>Answer</summary>

Yeh **N+1 problem** hai. 50 posts ke liye, code 1 query posts fetch karne ke liye chalata hai, phir 50 aur queries (har post ke liye ek) authors fetch karne ke liye — total 51 round-trips.

Isko `include` se fix karo:

```typescript
const posts = await prisma.post.findMany({
  include: { author: { select: { id: true, name: true } } },
})
for (const post of posts) {
  console.log(post.title, post.author.name)
}
```

Ab Prisma saare authors ko ek second query mein fetch karta hai aur data ko memory mein join kar deta hai — 51 ki jagah sirf 2 round-trips. Nested `author` pe `select` add karna bhi user row ka har column fetch karne se bachata hai.

</details>

---

**Question 3**

Prisma Middleware aur Prisma Client Extensions mein kya difference hai, aur kab kisko prefer karna chahiye?

<details>
<summary>Answer</summary>

**Middleware** (`prisma.$use(...)`) ek runtime interceptor hai jo global chain mein baitha hota hai. Yeh `params.action` aur `params.model` ko plain strings ki tarah inspect karke queries intercept karta hai. Params object pe koi type safety nahi hai aur shared state mutate karta hai. Yeh legacy API hai lekin abhi bhi widely used aur fully supported hai.

**Prisma Client Extensions** (`prisma.$extends({...})`) modern replacement hain. Yeh type-safe hain (TypeScript ko result fields aur method signatures ke shapes pata hote hain), composable hain (har `$extends` call ek naya immutable client return karta hai), aur distinct extension types support karte hain (result, model, client, query). Extensions original client ko mutate nahi karte.

**Kab kisko use karein:**
- **Naye projects** — hamesha Prisma Client Extensions prefer karo.
- **Existing codebases** jahan middleware hai — migration urgent nahi hai; middleware abhi bhi kaam karta hai. Jab us code ko touch karo tab incrementally migrate karo.
- **Query interception** (jaise soft delete, audit logs) — Extensions ek `query` extension type support karte hain jo full type safety ke saath middleware ki jagah leta hai.

</details>

---

*Next Chapter: Prisma in Production — Schema Migrations, Multi-tenancy, and Deployment Patterns*
