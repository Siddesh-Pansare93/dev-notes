# Drizzle ORM: The TypeScript-First SQL ORM

Drizzle ORM is a headless TypeScript ORM that provides type-safe SQL queries, schema declarations, and migrations. It aims to strike a perfect balance between developer experience and raw SQL performance.

## 1. What is Drizzle and Why Use It?

### Drizzle vs Prisma vs TypeORM

| Feature | Drizzle ORM | Prisma | TypeORM |
|---------|-------------|--------|---------|
| **Architecture** | SQL-like Query Builder + ORM | Custom Query Engine (Rust) | Active Record / Data Mapper |
| **Type Safety** | Excellent (Inferred from schema) | Excellent (Generated client) | Good (Relies on decorators) |
| **Performance** | Extremely Fast (No abstraction tax) | Slower (Rust engine overhead) | Moderate (Heavy object mapping) |
| **Edge Support** | Full Support (Cloudflare, Vercel Edge) | Requires Data Proxy | Limited/Complex |
| **Schema** | TypeScript file (`schema.ts`) | Custom DSL (`schema.prisma`) | Decorators/Classes |
| **Learning Curve** | Low (if you know SQL) | Very Low | High |

**When to choose Drizzle:**
- You want **maximum performance** and zero abstraction overhead.
- You are deploying to **Edge Environments** (Vercel Edge, Cloudflare Workers).
- You prefer writing queries that look exactly like SQL.
- You want true zero-dependency execution.

---

## 2. Setup with PostgreSQL, MySQL, SQLite

### Installation

```bash
# Core packages
npm install drizzle-orm

# Drizzle Kit for migrations
npm install -D drizzle-kit tsx
```

### Driver Setup Examples

**PostgreSQL (using `postgres.js`)**
```bash
npm install postgres
npm install -D @types/postgres
```
```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const queryClient = postgres("postgres://user:password@host:port/db");
export const db = drizzle(queryClient);
```

**MySQL (using `mysql2`)**
```bash
npm install mysql2
```
```typescript
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const poolConnection = mysql.createPool("mysql://user:password@host:port/db");
export const db = drizzle(poolConnection);
```

**SQLite (using `better-sqlite3`)**
```bash
npm install better-sqlite3
npm install -D @types/better-sqlite3
```
```typescript
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

const sqlite = new Database('sqlite.db');
export const db = drizzle(sqlite);
```

---

## 3. Schema Definition (Drizzle-Kit)

Define your schema in TypeScript. This is your single source of truth for both your database schema and your TypeScript types.

```typescript
// src/schema.ts
import { pgTable, serial, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  authorId: integer('author_id').references(() => users.id).notNull(),
});

// Define Relations for Relational Queries
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}));
```

**Extracting Types:**
```typescript
type User = typeof users.$inferSelect;
type NewUser = typeof users.$inferInsert;
```

---

## 4. Type-Safe Queries & Query Building Patterns

Drizzle offers two ways to query: **SQL-like** (Query Builder) and **Relational** (Prisma-like).

### SQL-like Query Builder (Maximum Control)

```typescript
import { eq, gt, and, desc } from 'drizzle-orm';
import { db } from './db';
import { users, posts } from './schema';

// Select
const activeUsers = await db.select()
  .from(users)
  .where(gt(users.createdAt, new Date('2023-01-01')))
  .orderBy(desc(users.createdAt))
  .limit(10);

// Insert
const newUser = await db.insert(users)
  .values({ name: 'Alice', email: 'alice@example.com' })
  .returning(); // PostgreSQL/SQLite specific

// Update
await db.update(users)
  .set({ name: 'Alice Smith' })
  .where(eq(users.id, 1));

// Delete
await db.delete(users).where(eq(users.id, 1));
```

### Relational Queries (Best Developer Experience)

Requires passing the schema to the Drizzle initialization:
```typescript
import * as schema from './schema';
export const db = drizzle(queryClient, { schema });
```

```typescript
// Fetch user with their posts
const userWithPosts = await db.query.users.findFirst({
  where: (users, { eq }) => eq(users.id, 1),
  with: {
    posts: true, // Fetch related posts automatically
  },
});
```

---

## 5. Relations and Joins (SQL-like)

When you need granular control over the generated SQL:

```typescript
const result = await db.select({
  userId: users.id,
  userName: users.name,
  postTitle: posts.title,
})
.from(users)
.leftJoin(posts, eq(users.id, posts.authorId))
.where(eq(users.name, 'Alice'));
```

---

## 6. Migrations with Drizzle-Kit

Drizzle-Kit handles generating SQL migrations from your TypeScript schema changes.

**drizzle.config.ts**
```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle', // output directory for SQL migrations
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

**Commands:**
```bash
# Generate SQL migration file based on schema changes
npx drizzle-kit generate

# Apply migrations directly to the database
npx drizzle-kit push
```

**Running Migrations in Code:**
```typescript
import { migrate } from 'drizzle-orm/postgres-js/migrator';

// This will run the generated SQL files in the ./drizzle folder
await migrate(db, { migrationsFolder: './drizzle' });
```

---

## 7. Transactions

Transactions ensure atomic database operations.

```typescript
await db.transaction(async (tx) => {
  const [newUser] = await tx.insert(users)
    .values({ name: 'Bob', email: 'bob@example.com' })
    .returning();

  await tx.insert(posts).values({
    title: 'Hello World',
    content: 'My first post!',
    authorId: newUser.id,
  });
  
  // If anything throws, the transaction is rolled back
});
```

---

## 8. Best Practices & Common Pitfalls

### Best Practices
- **Use `$inferSelect` and `$inferInsert`**: Always export these types for your components and services.
- **Relational vs SQL-like**: Use Relational Queries (`db.query.*`) for reading nested data (it's optimized heavily). Use the SQL-like query builder for complex aggregations, updates, and deletes.
- **Drizzle Config**: Keep your `drizzle.config.ts` at the root of your project.

### Common Pitfalls
- **Missing `notNull()`**: By default, columns are nullable. Always append `.notNull()` unless you specifically want optional fields.
- **Forgetting `returning()`**: In Postgres, updates and inserts do not return the row by default unless you chain `.returning()`.
- **Mixing standard Node drivers on Edge**: Ensure you use HTTP-based drivers (like `@neondatabase/serverless` or `postgres`) when deploying to edge environments like Vercel Edge.

## Practice Exercises
1. Set up a local SQLite database with Drizzle.
2. Create a schema for a "Task Management" app (Users, Projects, Tasks).
3. Write a relational query to fetch a user, their projects, and the first 5 tasks for each project.
4. Generate and run the migration using `drizzle-kit generate`.
