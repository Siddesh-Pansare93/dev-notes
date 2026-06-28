# Prisma Advanced — Transactions, Raw SQL, Middleware, and Performance

> **Level:** Intermediate — you should already be comfortable with basic Prisma CRUD, relations, and the Prisma schema. This chapter covers the features you reach for once your app grows beyond simple queries.

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

A **transaction** is a group of database operations that either all succeed together or all fail together. If any single step throws an error, the database rolls back every change made so far — as if none of it happened. This is critical for data integrity. Imagine charging a customer's card and then failing to create their order record: without a transaction you now have a payment with no order.

Prisma gives you two transaction flavors.

---

### Sequential (Interactive) Transactions

The interactive form lets you run several queries **one after the other** and use the result of one query as input to the next. You pass an async callback to `$transaction`; every query inside must use the special `tx` (transaction client) instead of the global `prisma` client.

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

**Why use `tx` and not `prisma` inside?** The `tx` object is a special client that is bound to the same database connection and the same open transaction. Using the global `prisma` client inside the callback would run queries on a different connection, outside the transaction, and you lose the atomicity guarantee.

**Timeout:** By default Prisma aborts an interactive transaction after 5 seconds. For long-running work you can override this:

```typescript
await prisma.$transaction(async (tx) => { /* ... */ }, {
  maxWait: 5000,   // ms to wait for a connection from the pool (default 2000)
  timeout: 10000,  // ms before the transaction is force-rolled-back (default 5000)
})
```

---

### Batch (Array) Transactions

When your operations are **independent of each other** — no result from query A feeds into query B — you can pass an array. Prisma sends all queries in one round-trip and wraps them in a single database transaction.

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

Notice that you use `prisma` (not `tx`) here. You are just building query *promises* and handing them to `$transaction` as a list. The array syntax is simpler but less flexible — you cannot branch on intermediate results.

| Feature | Sequential (callback) | Batch (array) |
|---|---|---|
| Use result of query A in query B | Yes | No |
| Syntax | `$transaction(async tx => {})` | `$transaction([...])` |
| Round-trips | One per query | One for all |
| Timeout control | Yes | No (single round-trip) |

---

## 🧬 Raw SQL

Prisma's query API covers the vast majority of use cases, but sometimes you need raw SQL — a complex window function, a database-specific feature, or a migration-time script. Prisma exposes two raw helpers.

---

### `$queryRaw` — Read Data

Use this when you need rows back. Tag the template literal with your SQL:

```typescript
import { Prisma } from '@prisma/client'

const cutoffDate = new Date('2024-01-01')

const users = await prisma.$queryRaw<User[]>`
  SELECT * FROM users WHERE created_at > ${cutoffDate}
`
```

A few things to note:

- **Type parameter** — `$queryRaw<User[]>` tells TypeScript what shape each row has. Prisma cannot verify this at compile time; you are responsible for keeping it in sync with your actual SELECT columns.
- **Template literal = auto-parameterization** — The `${cutoffDate}` interpolation is NOT plain string concatenation. Prisma turns it into a parameterized placeholder (`$1`, `?`, etc. depending on your database), which **prevents SQL injection**. Never build the SQL string yourself with string concatenation.
- **`Prisma.sql` helper** — When you want to compose parts of a query dynamically, use `Prisma.sql`:

```typescript
const column = 'email'
// Safe composition
const rows = await prisma.$queryRaw`
  SELECT ${Prisma.raw(column)} FROM users LIMIT 10
`
// WARNING: Prisma.raw does NOT sanitize — only use it with values
// you fully control (never user input)
```

---

### `$executeRaw` — Mutate Data

Use this for `UPDATE`, `INSERT`, or `DELETE` when you do not need rows back. It returns the **number of rows affected**.

```typescript
const affectedRows = await prisma.$executeRaw`
  UPDATE users SET is_active = true WHERE last_login > ${cutoffDate}
`
console.log(`Activated ${affectedRows} users`)
```

The same parameterization rules apply. Always use the template-literal syntax; never interpolate user-controlled values with `Prisma.raw`.

---

## 🪝 Middleware

Prisma Middleware lets you intercept every query before it runs (or after it returns), globally across your whole application. Think of it like Express middleware but for database operations.

You register middleware with `prisma.$use(...)`. Each middleware receives:
- `params` — describes the query: which model, which action, what arguments.
- `next` — a function that forwards the query down the chain (and eventually to the database).

---

### Example: Soft Delete

Hard deletes remove a row permanently. Soft deletes instead set a `deletedAt` timestamp so you can recover data later. Implementing this manually in every delete call is error-prone. Middleware centralizes the logic:

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

Now every `prisma.post.delete(...)` in your codebase silently becomes a soft delete — no other code needs to change.

You would also want to intercept `findMany` / `findFirst` to exclude soft-deleted records:

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

**Note:** Prisma Middleware is considered a "legacy" feature. For new projects, Prisma recommends **Prisma Client Extensions** (covered at the end of this chapter), which offer better TypeScript support and composability. Middleware still works and is widely used in existing codebases.

---

## ⚡ Performance

### The N+1 Problem

The N+1 problem is one of the most common performance mistakes with any ORM. Here is how it looks with Prisma:

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

**The fix: use `include`**

```typescript
// GOOD — 1 + 1 queries (or sometimes just 1)
const posts = await prisma.post.findMany({
  include: { author: true },
})

for (const post of posts) {
  console.log(post.title, post.author.name)   // author already loaded
}
```

Prisma fires a second query to fetch all related authors **in one shot** and stitches the results together in memory — far better than one query per post.

---

### `select` vs `include` — Load Only What You Need

- **`include`** — keep all scalar fields on the model AND eagerly load relations.
- **`select`** — pick *exactly* the fields you want, scalar or relational.

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

Avoid `SELECT *` (the implicit default when you omit `select`). Over a large table with many columns — especially `TEXT` blobs or `JSONB` columns — transferring unused data wastes bandwidth and memory. Use `select` whenever you know you only need a subset.

---

### Prisma's Built-In Query Batching (DataLoader Pattern)

When Prisma detects multiple `findUnique` calls with the same `where` field happening in the same event-loop tick, it automatically batches them into a single `WHERE id IN (...)` query. This is the same idea as Facebook's DataLoader library. It happens transparently — you write individual lookups and Prisma collapses them:

```typescript
// These two calls issued in the same tick...
const a = prisma.user.findUnique({ where: { id: 1 } })
const b = prisma.user.findUnique({ where: { id: 2 } })

await Promise.all([a, b])
// Prisma sends: SELECT * FROM users WHERE id IN (1, 2)  ← one query!
```

You do not need to configure anything — this is on by default for `findUnique`.

---

### Connection Pooling

Prisma Client opens a pool of database connections. Holding open too many connections or too few is a classic scaling problem:

- **Too few** — requests queue up waiting for a free connection.
- **Too many** — your database server gets overwhelmed.

**Prisma Accelerate (Cloud)** — Prisma's managed connection pool and global cache layer. You swap your database URL for an Accelerate proxy URL; it handles pooling, edge caching, and keeps warm connections close to your users.

**PgBouncer (Self-hosted)** — A lightweight PostgreSQL connection pooler you run alongside your database. You point Prisma at PgBouncer instead of Postgres directly. When using PgBouncer in transaction mode, add `?pgbouncer=true` to your connection string so Prisma disables prepared statements (which are unsupported in that mode):

```
DATABASE_URL="postgresql://user:pass@pgbouncer-host:5432/mydb?pgbouncer=true"
```

---

### Query Logging

Turn on Prisma's built-in query logger when debugging performance:

```typescript
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
})
```

With `'query'` enabled you will see every generated SQL statement in your console, including the parameter values and execution time. This is invaluable during development but should be disabled (or reduced to `'warn'`/`'error'`) in production to avoid log noise and performance overhead.

You can also listen programmatically:

```typescript
prisma.$on('query', (e) => {
  console.log(`Query: ${e.query}`)
  console.log(`Duration: ${e.duration}ms`)
})
```

---

### `prisma.$metrics` — Prometheus Metrics

For production observability, Prisma exposes internal metrics (connection pool usage, query latency histograms) in Prometheus format:

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

Pipe this output to a `/metrics` endpoint that Prometheus scrapes. Combine it with Grafana dashboards to visualize connection pool saturation and slow queries over time.

---

## 🧩 Prisma Client Extensions

Prisma Client Extensions (stable since Prisma 4.16) are the modern, type-safe way to extend Prisma beyond its built-in capabilities. They replace much of what middleware was used for and give you proper TypeScript inference.

You create extensions with `prisma.$extends({...})` and assign the result to a new client variable.

---

### Result Extensions — Computed Fields

Add a virtual field that is computed from existing fields every time a record is returned:

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

The `needs` object tells Prisma which underlying fields are required. If you `select` a user without `firstName`, TypeScript will error if you try to access `fullName`.

---

### Model Extensions — Custom Methods on Models

Add domain-specific methods directly to a model:

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

### Client Extensions — Extend the Root Client

Add top-level methods or properties to the client itself:

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

Extensions are chainable. Build small, focused extensions and compose them:

```typescript
const withAudit = prisma.$extends(auditExtension)
const withSoftDelete = withAudit.$extends(softDeleteExtension)
const withMetrics = withSoftDelete.$extends(metricsExtension)

export { withMetrics as prisma }
```

Each `$extends` call returns a new client — the original `prisma` instance is untouched. This composability is the key advantage over middleware, where all interceptors share one mutable chain.

---

## 🏁 Key Takeaways

- **Transactions** guarantee all-or-nothing execution. Use the callback form (`async tx => {}`) when queries depend on each other's results; use the array form when they are independent.
- **Always use template literals with `$queryRaw` and `$executeRaw`** — never string concatenation — to prevent SQL injection through automatic parameterization.
- **Middleware** is a global interceptor useful for cross-cutting concerns like soft delete, logging, and auditing. It is a legacy API; prefer **Prisma Client Extensions** in new code.
- **The N+1 problem** is solved by `include` — let Prisma load relations in bulk rather than querying one by one in a loop.
- **`select` is your friend** — never transfer columns you do not need, especially for large text or JSON fields.
- **Connection pooling** (via Prisma Accelerate or PgBouncer) is essential at scale to prevent exhausting database connections.
- **Prisma Client Extensions** provide type-safe, composable ways to add computed fields, custom model methods, and client-level utilities without sacrificing TypeScript inference.

---

## 📝 Quiz

Test yourself before moving on.

**Question 1**

You have a function that creates a bank transfer: it debits one account and credits another. Which transaction style should you use, and why?

<details>
<summary>Answer</summary>

Use the **sequential (interactive) transaction** (`$transaction(async (tx) => {...})`). Both operations must share the same transaction client (`tx`) so they live in the same atomic unit. If the credit fails, the debit is automatically rolled back. The batch (array) form would also work here since neither result is needed as input to the other, but the sequential form is clearer for this use case and gives you the ability to add conditional logic.

</details>

---

**Question 2**

A teammate writes this code to display a list of 50 blog posts with their authors' names:

```typescript
const posts = await prisma.post.findMany()
for (const post of posts) {
  const author = await prisma.user.findUnique({ where: { id: post.authorId } })
  console.log(post.title, author.name)
}
```

What problem does this code have, and how would you fix it?

<details>
<summary>Answer</summary>

This is the **N+1 problem**. For 50 posts, the code issues 1 query to fetch posts then 50 more queries (one per post) to fetch authors — 51 round-trips total.

Fix it with `include`:

```typescript
const posts = await prisma.post.findMany({
  include: { author: { select: { id: true, name: true } } },
})
for (const post of posts) {
  console.log(post.title, post.author.name)
}
```

Prisma now fetches all authors in a second query and joins the data in memory — 2 round-trips instead of 51. Adding `select` on the nested `author` also avoids fetching every column on the user row.

</details>

---

**Question 3**

What is the difference between Prisma Middleware and Prisma Client Extensions, and when should you prefer one over the other?

<details>
<summary>Answer</summary>

**Middleware** (`prisma.$use(...)`) is a runtime interceptor that sits in a global chain. It intercepts queries by inspecting `params.action` and `params.model` as plain strings. It has no type safety on the params object and mutates shared state. It is a legacy API but is still widely used and fully supported.

**Prisma Client Extensions** (`prisma.$extends({...})`) are the modern replacement. They are type-safe (TypeScript knows the shapes of result fields and method signatures), they are composable (each `$extends` call returns a new immutable client), and they support distinct extension types (result, model, client, query). Extensions do not mutate the original client.

**When to use each:**
- **New projects** — always prefer Prisma Client Extensions.
- **Existing codebases** with middleware — migration is not urgent; middleware still works. Migrate incrementally when you touch that code.
- **Query interception** (e.g., soft delete, audit logs) — Extensions support a `query` extension type that replaces middleware for this use case with full type safety.

</details>

---

*Next Chapter: Prisma in Production — Schema Migrations, Multi-tenancy, and Deployment Patterns*
