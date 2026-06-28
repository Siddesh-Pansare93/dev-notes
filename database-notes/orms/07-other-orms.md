# 🗄️ Chapter 7: Other ORMs — Drizzle, TypeORM, Sequelize, and Knex

> You have learned Prisma. You can model data, run migrations, and write type-safe queries. Now the question every developer eventually asks is: *"Are there alternatives, and when would I use them?"*
>
> This chapter answers that question honestly and practically.

---

## 🧭 Why Learn the Alternatives?

Prisma is excellent, but it is not always the right tool. Different projects have different constraints:

- A **Cloudflare Worker** cannot run Prisma's query engine binary.
- A **NestJS** codebase built by Java developers may already use TypeORM.
- A **legacy Node.js** project from 2016 is almost certainly on Sequelize.
- A data-intensive app that needs **hand-crafted SQL** will benefit from Knex.

Understanding the landscape makes you a better engineer — not because you need to rewrite everything, but because you can make *informed* architectural decisions.

---

## 🎯 The Benchmark Query

Every ORM in this chapter will implement the same query so you can compare them side by side:

```
Get users where isActive = true,
include their post count,
order by createdAt descending,
page 2 (10 items per page).
```

This is a realistic query: filtering, aggregation, ordering, and pagination. It reveals a lot about how an ORM thinks.

---

## 🌊 1. Drizzle ORM

### What Is It?

Drizzle is a **TypeScript-first, SQL-centric ORM** built for the modern JavaScript runtime era. It was created in 2022 and has grown rapidly because it solves a specific pain point: you get full type safety *without* hiding SQL from you.

Its philosophy is blunt: **"If you know SQL, you know Drizzle."** The query API is a thin, typed wrapper around SQL syntax — not a new abstraction on top of it.

### Schema Definition

Unlike Prisma, there is no separate `.prisma` file. The schema lives in TypeScript:

```typescript
// schema.ts
import { pgTable, serial, text, boolean, timestamp, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  userId: integer('user_id').references(() => users.id),
});

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));
```

Everything is just TypeScript. The columns, types, constraints, and foreign keys are all expressed in code you already understand.

### The Benchmark Query in Drizzle

```typescript
import { db } from './db';
import { users, posts } from './schema';
import { eq, desc, count } from 'drizzle-orm';

const PAGE = 2;
const PAGE_SIZE = 10;

const result = await db
  .select({
    id: users.id,
    name: users.name,
    email: users.email,
    postCount: count(posts.id),
  })
  .from(users)
  .leftJoin(posts, eq(posts.userId, users.id))
  .where(eq(users.isActive, true))
  .groupBy(users.id)
  .orderBy(desc(users.createdAt))
  .limit(PAGE_SIZE)
  .offset((PAGE - 1) * PAGE_SIZE);

// result is fully typed: { id: number, name: string, email: string, postCount: number }[]
```

Notice how this reads almost like SQL. `select`, `from`, `leftJoin`, `where`, `groupBy`, `orderBy`, `limit`, `offset` — these are SQL clauses, just typed.

### Pros

- **Zero runtime overhead** — no query engine process, no binary
- **Excellent TypeScript inference** — return types are inferred from the select shape
- **Edge-compatible** — runs in Cloudflare Workers, Deno, Bun, and any environment that supports `fetch`
- **SQL-transparent** — you always know what query will run
- **Lightweight bundle** — critical for serverless cold start times

### Cons

- **Younger ecosystem** — fewer third-party plugins compared to Prisma or Sequelize
- **Verbose for simple queries** — Prisma's `findMany` with `include` is more concise for standard CRUD
- **Manual relation handling** — Drizzle does not automatically load nested relations without explicit joins
- **Migrations are separate** — you use `drizzle-kit` for migrations, which is a separate workflow step

### When to Use Drizzle

- Building on **Cloudflare Workers**, **Vercel Edge**, or **Deno Deploy**
- You want **full SQL control** with type safety
- Performance is critical and you need a **lightweight runtime**
- Your team is comfortable with SQL and dislikes ORM magic
- You are using **Bun** or another modern JS runtime

---

## 🏛️ 2. TypeORM

### What Is It?

TypeORM is a **class-based, decorator-driven ORM** inspired by Java's Hibernate and Spring Data. It was built for TypeScript from the beginning (unlike Sequelize) and integrates deeply with the NestJS ecosystem.

It supports two patterns:
- **Active Record** — models know how to save themselves (`user.save()`)
- **Data Mapper** — repositories handle persistence, models are plain data

### Entity Definition

```typescript
// user.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Post } from './post.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Post, (post) => post.user)
  posts: Post[];
}
```

```typescript
// post.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from './user.entity';

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @ManyToOne(() => User, (user) => user.posts)
  user: User;
}
```

Decorators define the schema. It feels familiar if you have worked with Spring Boot or NestJS.

### The Benchmark Query in TypeORM

```typescript
import { AppDataSource } from './data-source';
import { User } from './user.entity';

const PAGE = 2;
const PAGE_SIZE = 10;

const userRepository = AppDataSource.getRepository(User);

const result = await userRepository
  .createQueryBuilder('user')
  .leftJoin('user.posts', 'post')
  .select([
    'user.id',
    'user.name',
    'user.email',
  ])
  .addSelect('COUNT(post.id)', 'postCount')
  .where('user.isActive = :isActive', { isActive: true })
  .groupBy('user.id')
  .orderBy('user.createdAt', 'DESC')
  .limit(PAGE_SIZE)
  .offset((PAGE - 1) * PAGE_SIZE)
  .getRawAndEntities();

// Or using raw query for count + entities:
const [entities, count] = await userRepository.findAndCount({
  where: { isActive: true },
  relations: { posts: true },
  order: { createdAt: 'DESC' },
  take: PAGE_SIZE,
  skip: (PAGE - 1) * PAGE_SIZE,
});
```

TypeORM gives you two styles: a `QueryBuilder` for complex queries (with raw SQL-like syntax) and a simpler `find` API for standard operations.

### Pros

- **First-class NestJS integration** — NestJS modules wrap TypeORM out of the box
- **Decorator-driven** — familiar to Java/Spring developers
- **Supports both Active Record and Data Mapper** — flexible architecture
- **Mature ecosystem** — widely used, lots of Stack Overflow answers
- **Supports many databases** — PostgreSQL, MySQL, SQLite, MongoDB (partial), Oracle

### Cons

- **Decorator performance** — metadata reflection adds overhead at startup
- **Complex relations can be tricky** — eager loading can trigger N+1 queries unexpectedly
- **QueryBuilder verbosity** — complex queries become long chains
- **Slower development velocity** — more boilerplate than Prisma for simple tasks
- **TypeScript types are not always inferred** — `getRawMany()` returns `any[]`

### When to Use TypeORM

- Building a **NestJS application** (the default ORM choice for NestJS)
- Your team comes from a **Java or Spring background**
- You prefer **class-based models** with decorators
- You need **Active Record pattern** for simplicity in smaller services
- The project already uses TypeORM and migration cost is high

---

## 🐘 3. Sequelize

### What Is It?

Sequelize is the **oldest and most established Node.js ORM**, first released in 2010. It predates TypeScript becoming popular. If you find a Node.js ORM tutorial from before 2018, it is almost certainly using Sequelize.

It is a full-featured ORM: model definition, associations, migrations, hooks, validators, and more — all built in.

### Model Definition

```typescript
// models/user.ts
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../database';

interface UserAttributes {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  createdAt?: Date;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id'> {}

export class User extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes {
  declare id: number;
  declare name: string;
  declare email: string;
  declare isActive: boolean;
  declare createdAt: Date;
}

User.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  { sequelize, modelName: 'User', tableName: 'users', timestamps: true }
);
```

Associations are defined separately:

```typescript
// associations.ts
User.hasMany(Post, { foreignKey: 'userId', as: 'posts' });
Post.belongsTo(User, { foreignKey: 'userId', as: 'user' });
```

### The Benchmark Query in Sequelize

```typescript
import { User } from './models/user';
import { Post } from './models/post';
import { fn, col, literal } from 'sequelize';

const PAGE = 2;
const PAGE_SIZE = 10;

const result = await User.findAll({
  attributes: [
    'id',
    'name',
    'email',
    [fn('COUNT', col('posts.id')), 'postCount'],
  ],
  include: [
    {
      model: Post,
      as: 'posts',
      attributes: [],    // don't include post columns in output
      required: false,   // LEFT JOIN
    },
  ],
  where: { isActive: true },
  group: ['User.id'],
  order: [['createdAt', 'DESC']],
  limit: PAGE_SIZE,
  offset: (PAGE - 1) * PAGE_SIZE,
  subQuery: false,       // required for correct LIMIT with GROUP BY
});

// result is User[] but postCount must be accessed via .get('postCount')
```

Notice `subQuery: false` — a Sequelize quirk required when combining `GROUP BY` with `LIMIT`. This is the kind of thing you learn the hard way.

### Pros

- **Massive ecosystem** — years of community packages, guides, and battle-tested patterns
- **All associations built in** — `hasMany`, `belongsTo`, `belongsToMany`, `hasOne`
- **Rich hooks system** — `beforeCreate`, `afterUpdate`, `beforeDestroy`, etc.
- **Excellent for existing projects** — if the codebase uses it, staying is usually right
- **Flexible migration system** — `sequelize-cli` is stable and widely understood

### Cons

- **TypeScript support feels bolted on** — the types require a lot of boilerplate (`declare`, `Optional`, interface duplication)
- **Complex queries are awkward** — `fn`, `col`, `literal`, and `where` become hard to read
- **Documentation is dense** — lots of options, unclear which to use
- **N+1 risk** — eager loading can be inefficient without careful `include` configuration
- **Slower than alternatives** — more abstraction layers between your code and the database

### When to Use Sequelize

- The **project already uses Sequelize** and rewriting is not justified
- You need a **huge ecosystem** with many pre-built plugins
- The team is more comfortable with JavaScript than TypeScript
- You need **complex hook pipelines** for side effects (audit logs, event emission)
- Migrating a legacy app with no budget for rewriting data access layer

---

## 🔧 4. Knex.js — The Query Builder

### What Is It?

Knex is **not an ORM**. It is a **SQL query builder** — a library that constructs SQL strings from a JavaScript/TypeScript API and sends them to your database. There are no models, no entities, no schema definitions. Just queries.

Think of it as the layer between raw `pg.query('SELECT ...')` and a full ORM. Many ORMs (including older versions of Objection.js) use Knex under the hood.

### Setup

```typescript
// db.ts
import knex from 'knex';

export const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL,
});
```

No schema definition needed — Knex does not know about your models.

### The Benchmark Query in Knex

```typescript
import { db } from './db';

const PAGE = 2;
const PAGE_SIZE = 10;

const result = await db('users')
  .select(
    'users.id',
    'users.name',
    'users.email',
    db.raw('COUNT(posts.id) as "postCount"')
  )
  .leftJoin('posts', 'posts.user_id', 'users.id')
  .where('users.is_active', true)
  .groupBy('users.id')
  .orderBy('users.created_at', 'desc')
  .limit(PAGE_SIZE)
  .offset((PAGE - 1) * PAGE_SIZE);

// result is { id: number, name: string, email: string, postCount: string }[]
// Note: postCount is a string — PostgreSQL COUNT returns bigint as string
```

This is clean and readable. You always know exactly what SQL will run. The tradeoff: you get no help with relations, no model layer, and types require manual definition.

### Migrations in Knex

Knex does have a migration system:

```typescript
// migrations/20240101_create_users.ts
exports.up = (knex) =>
  knex.schema.createTable('users', (table) => {
    table.increments('id');
    table.string('name').notNullable();
    table.string('email').notNullable().unique();
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

exports.down = (knex) => knex.schema.dropTable('users');
```

### Pros

- **You are always in control** — no magic, no hidden queries
- **Excellent for complex SQL** — subqueries, CTEs, window functions, raw fragments all work naturally
- **Lightweight** — minimal abstraction, fast startup, no binary
- **Great for data scripts and migrations** — when you just need to run SQL programmatically
- **Works alongside any ORM** — use Knex for complex reports, your ORM for CRUD

### Cons

- **Not an ORM** — no model layer, no relations, no type inference on joins
- **Manual typing** — return types are not inferred from the query shape
- **More boilerplate for CRUD** — what Prisma does in one line requires multiple in Knex
- **No schema awareness** — typos in column names are runtime errors, not compile-time errors
- **Scales poorly as complexity grows** — very large Knex queries become hard to maintain

### When to Use Knex

- You need **complex analytical queries** that ORMs mangle
- Building a **data pipeline or migration script**
- You want **maximum SQL control** without writing raw strings
- Using it as a **foundation under a custom repository pattern**
- The app needs queries with **CTEs, window functions, or LATERAL joins** that your ORM cannot express

---

## 📊 Big Comparison Table

| Feature | Prisma | Drizzle | TypeORM | Sequelize | Knex |
|---|---|---|---|---|---|
| **TypeScript Support** | Excellent (auto-generated types) | Excellent (inferred from schema) | Good (decorators, some gaps) | Fair (verbose, boilerplate) | Manual (you write types) |
| **Schema Definition** | `.prisma` file (DSL) | TypeScript objects | Class decorators | `Model.init()` | None (migrations only) |
| **Migrations** | `prisma migrate` (auto-diff) | `drizzle-kit push/generate` | `typeorm migration:generate` | `sequelize-cli migrate` | `knex migrate:latest` |
| **Learning Curve** | Low (beginner-friendly) | Medium (need SQL knowledge) | Medium-High (decorators, DI) | Medium (many options) | Low-Medium (just SQL) |
| **Performance** | Good (query engine overhead) | Excellent (no runtime) | Good | Good | Excellent (no ORM layer) |
| **Edge Support** | Limited (binary engine) | Excellent (edge-first) | Limited | Limited | Good |
| **Community** | Large, fast-growing | Growing rapidly | Large | Very large (oldest) | Large (stable) |
| **Best For** | TypeScript teams, rapid dev | Serverless, edge, SQL lovers | NestJS, Java devs | Legacy projects | Complex queries, raw SQL |
| **Relations** | Automatic (include/select) | Manual joins | Decorators + lazy/eager | hasMany/belongsTo | Manual joins only |
| **Full ORM?** | Yes | Yes | Yes | Yes | No (query builder only) |

---

## 🤔 When to Choose Each

### Choose Prisma When...
- You are building a **TypeScript application from scratch**
- The team includes **junior developers** or those unfamiliar with SQL
- You want **fast iteration** — Prisma's `include` and `select` are the most ergonomic
- You are building a **Next.js or SvelteKit** full-stack app
- You want **auto-generated types** without any configuration

### Choose Drizzle When...
- You are deploying to **Cloudflare Workers, Vercel Edge, or Deno**
- You want **SQL-level control** with TypeScript safety
- **Bundle size and cold start** are critical metrics
- Your team loves SQL and finds ORMs too abstract
- You are building with **Bun** or any non-Node runtime

### Choose TypeORM When...
- You are building a **NestJS application** (it is the standard choice)
- Your team comes from **Java, Spring, or Hibernate** backgrounds
- You want the **Active Record** pattern for simpler services
- The project already has TypeORM entities and migration history

### Choose Sequelize When...
- You are **maintaining an existing Node.js project** that uses Sequelize
- You need the **largest possible ecosystem** of plugins and guides
- The team is more comfortable in **JavaScript than TypeScript**
- You need **rich lifecycle hooks** for audit trails and side effects

### Choose Knex When...
- You need to write **complex SQL** that ORMs cannot express well
- Building **data pipelines, ETL scripts, or reporting tools**
- You want a **query builder with no model magic**
- Using Knex **alongside an ORM** for the queries the ORM cannot handle
- You are building a custom data layer and want SQL control without raw strings

---

## 💡 Key Takeaways

1. **Prisma is the best default** for greenfield TypeScript projects. Its developer experience is unmatched for standard CRUD operations.

2. **Drizzle is the Prisma of the edge**. If you cannot run Prisma (Cloudflare Workers, edge functions), Drizzle is the modern replacement — not a downgrade.

3. **TypeORM is the NestJS ORM**. If you are using NestJS, TypeORM is already integrated. Fighting this default has a cost.

4. **Sequelize is legacy-stable**. It is not the best choice for new projects, but it is not broken either. If your project is on Sequelize, there is rarely a compelling reason to rewrite.

5. **Knex is not your ORM — it is your escape hatch**. Most projects using a full ORM still have one or two Knex queries for the complex SQL that the ORM cannot express cleanly.

6. **The "best ORM" is context-dependent**. Runtime environment, team background, existing codebase, and query complexity all matter. Learn to evaluate tradeoffs, not to pick a winner.

7. **SQL knowledge multiplies your ORM effectiveness**. Whether you use Drizzle (where SQL is the API) or Prisma (where SQL is hidden), understanding what query is being generated makes you a better developer.

---

## 🧠 Quiz

Test your understanding before moving to the next chapter.

**Question 1**

You are building an API route that runs on Cloudflare Workers. The route fetches user data from a PostgreSQL database. Which ORM would you choose and why?

<details>
<summary>Answer</summary>

**Drizzle ORM.** Cloudflare Workers use the V8 isolate runtime — no Node.js APIs, no filesystem access, no ability to spawn processes. Prisma's query engine is a binary that cannot run in this environment. Drizzle has no runtime binary — it is pure TypeScript that generates SQL strings and uses a compatible driver (like `@cloudflare/workers-postgres`). It is specifically designed for edge environments.

</details>

---

**Question 2**

Your team is building a NestJS application. A senior developer from a Java background suggests using TypeORM. A TypeScript-first developer on the team suggests Prisma. What are the strongest arguments for each side, and how would you decide?

<details>
<summary>Answer</summary>

**Arguments for TypeORM:** NestJS has native `@nestjs/typeorm` integration with module setup, entity injection via `@InjectRepository`, and the decorator style is familiar to developers coming from Spring/Hibernate. Less conceptual translation required.

**Arguments for Prisma:** Prisma has better TypeScript inference, a cleaner schema definition, and is generally faster to prototype with. `@nestjs/prisma` community integrations exist.

**How to decide:** If the Java developer is the lead or the team is mostly OOP-oriented, TypeORM reduces friction. If TypeScript quality and developer ergonomics are the priority, Prisma is the better choice. Either works — the most important factor is team consensus and consistency.

</details>

---

**Question 3**

You have a PostgreSQL database with an `orders` table. You need to write a query that uses a `WITH RECURSIVE` CTE to traverse a category hierarchy, then join against orders. Which tool would you reach for and why?

<details>
<summary>Answer</summary>

**Knex.js** (or raw SQL via your ORM's `$queryRaw` / `query` escape hatch).

Recursive CTEs are advanced SQL that most ORMs do not support natively. Drizzle has limited CTE support. Prisma, TypeORM, and Sequelize generally require a raw query escape hatch for this.

In Knex:
```typescript
const result = await db.raw(`
  WITH RECURSIVE category_tree AS (
    SELECT id, name, parent_id FROM categories WHERE id = ?
    UNION ALL
    SELECT c.id, c.name, c.parent_id
    FROM categories c
    JOIN category_tree ct ON c.parent_id = ct.id
  )
  SELECT o.* FROM orders o
  JOIN category_tree ct ON o.category_id = ct.id
`, [rootCategoryId]);
```

This is exactly the use case Knex excels at: complex SQL you need full control over, expressed in a structured way without raw string concatenation for the simpler parts.

</details>

---

## 📚 Further Reading

- [Drizzle ORM Docs](https://orm.drizzle.team) — especially the "Why Drizzle?" page
- [TypeORM Docs](https://typeorm.io) — Data Mapper vs Active Record section
- [Sequelize v6 Docs](https://sequelize.org/docs/v6/) — Associations guide
- [Knex.js Docs](https://knexjs.org) — Query Builder reference
- [Prisma vs Drizzle — Official Comparison](https://orm.drizzle.team/docs/prisma) — written by the Drizzle team, so read critically

---

*Next Chapter: Database Migrations — Managing Schema Changes Safely Across Environments*
