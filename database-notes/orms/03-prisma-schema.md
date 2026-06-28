# 🗂️ Prisma Schema — Defining Your Data Model

> **Chapter 3 of the Prisma ORM Series**
> Audience: Beginner developers who have set up Prisma and want to understand how to model their database in code.

---

## 🧭 What is the Prisma Schema?

Before you write a single database query, Prisma needs to know your data structure. That knowledge lives in a single file: `schema.prisma`. Think of it as a **blueprint for your database** — it describes every table, every column, every relationship, and how your application connects to the database.

When you run `prisma migrate dev` or `prisma db push`, Prisma reads this file and applies those definitions to your actual database. When you run `prisma generate`, Prisma reads this file and auto-generates a fully-typed TypeScript client so that every query you write has autocomplete and compile-time safety.

One file. Three jobs:
1. Configure the database connection
2. Configure the code generator
3. Describe every model (table)

---

## 🔬 Anatomy of `schema.prisma`

Every `schema.prisma` file is made up of three building blocks: **generator**, **datasource**, and **models**.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id    Int    @id @default(autoincrement())
  email String @unique
}
```

### The `generator` Block

```prisma
generator client {
  provider = "prisma-client-js"
}
```

This tells Prisma **what to generate** when you run `prisma generate`. The `provider = "prisma-client-js"` value means "generate a JavaScript/TypeScript client". This is what gives you the `PrismaClient` object you import in your application code. If you were generating for a different language or runtime, you would change the provider here.

### The `datasource` Block

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

This tells Prisma **where your database is**. The `provider` field accepts `"postgresql"`, `"mysql"`, `"sqlite"`, `"sqlserver"`, `"mongodb"`, or `"cockroachdb"`. The `url` field holds the connection string. Instead of hard-coding the connection string (which would be a security risk), `env("DATABASE_URL")` reads it from your `.env` file at runtime.

> **Security tip:** Never commit your actual database URL to version control. Always use environment variables.

---

## 📦 Models: Defining Your Tables

A **model** in Prisma corresponds to a **table** in your relational database. Each field in the model corresponds to a **column** in that table.

```prisma
model Post {
  id      Int    @id @default(autoincrement())
  title   String
  content String?
}
```

- `model Post` — defines a table. By default, Prisma uses the model name as the table name (`Post`). You can override this with `@@map`.
- Each line inside is a field (column).
- A trailing `?` marks the field as optional (nullable in SQL).
- No `?` means the field is required (NOT NULL in SQL).

---

## 🔤 Field Types

Prisma has its own type system that maps to your database's native types. Here is a complete reference:

| Prisma Type   | What it represents                             | Example values             |
|---------------|------------------------------------------------|----------------------------|
| `String`      | Text of any length                             | `"hello"`, `"user@email.com"` |
| `Int`         | 32-bit integer                                 | `1`, `-42`, `1000`         |
| `BigInt`      | 64-bit integer (very large numbers)            | `9007199254740993n`        |
| `Float`       | Floating point number (approximate)            | `3.14`, `-0.001`           |
| `Decimal`     | Exact decimal (use for money)                  | `19.99`, `0.001`           |
| `Boolean`     | True or false                                  | `true`, `false`            |
| `DateTime`    | Date and time with timezone                    | `2024-01-15T10:30:00Z`     |
| `Json`        | Raw JSON stored in DB                          | `{ "key": "value" }`       |
| `Bytes`       | Binary data                                    | File contents, hashes      |
| `Unsupported` | DB-native type Prisma cannot map automatically | PostGIS geometry types     |

> **When to use `Decimal` vs `Float`:** Use `Float` for scientific data where tiny rounding errors are acceptable. Use `Decimal` for money or precise calculations — floating point arithmetic can silently introduce rounding bugs in financial applications.

---

## 🏷️ Field Attributes

Attributes modify how a field behaves. Single-field attributes start with `@`, and model-level attributes start with `@@`.

### `@id` — Primary Key

```prisma
id Int @id @default(autoincrement())
```

Marks this field as the table's primary key. Every model must have exactly one `@id` field (or a composite `@@id`).

### `@default(...)` — Default Values

Specifies what value is inserted if none is provided.

```prisma
id        Int      @id @default(autoincrement())  // auto-increment integer
uid       String   @default(uuid())               // random UUID like "a1b2c3d4-..."
cuid      String   @default(cuid())               // collision-resistant ID
createdAt DateTime @default(now())                // current timestamp
published Boolean  @default(false)               // literal false
role      String   @default("user")              // literal string
```

- `autoincrement()` — database generates sequential integers (1, 2, 3...)
- `uuid()` — generates a v4 UUID string, useful when you need globally unique IDs
- `cuid()` — generates a collision-resistant ID that is also sortable by creation time
- `now()` — inserts the current date and time at the moment of record creation
- Literal values like `true`, `false`, or `"somestring"` are set as-is

### `@unique` — Unique Constraint

```prisma
email String @unique
```

Ensures no two rows can have the same value for this field. Prisma will also create a unique index in the database.

### `@updatedAt` — Auto-Update Timestamp

```prisma
updatedAt DateTime @updatedAt
```

Prisma automatically sets this field to the current time whenever the record is updated. You never need to pass this value yourself — Prisma manages it transparently.

### `@map("column_name")` — Rename the Database Column

```prisma
firstName String @map("first_name")
```

In your Prisma code you use `firstName` (camelCase), but in the database the column is stored as `first_name` (snake_case). This lets you follow TypeScript naming conventions in your code while following SQL naming conventions in the database.

### `@@map("table_name")` — Rename the Database Table

```prisma
model User {
  // ...
  @@map("users")
}
```

The model is called `User` in Prisma code (which generates `prisma.user.findMany()`), but the actual SQL table is named `users`. This is a common convention — singular model names in Prisma, plural table names in the database.

### `@@index([field1, field2])` — Composite Index

```prisma
@@index([authorId])
@@index([createdAt, authorId])
```

Creates a database index on the specified field(s). Indexes dramatically speed up queries that filter or sort by those columns. You should add indexes on any foreign key columns and on columns you frequently use in `WHERE` clauses.

### `@@unique([field1, field2])` — Composite Unique Constraint

```prisma
@@unique([userId, postId])
```

Ensures the **combination** of both fields is unique. In the `Like` model this means a user can like the same post only once — but they can like many different posts.

### `@@id([field1, field2])` — Composite Primary Key

```prisma
@@id([followerId, followingId])
```

When no single field is the primary key, you can define a composite primary key from multiple fields. The combination must be unique across all rows.

---

## 🔗 Relations in Prisma

Relations are the most powerful part of the schema. They describe how models connect to each other. Prisma handles the foreign keys and generates intuitive query methods automatically.

### 1. One-to-Many: User has many Posts

The most common relation. One user writes many posts, but each post belongs to exactly one user.

```prisma
model User {
  posts Post[]  // "User has many Posts"
}

model Post {
  authorId Int
  author   User @relation(fields: [authorId], references: [id])
}
```

- `Post[]` on `User` — a list; this side does not store anything in the DB, it's a virtual field for querying.
- `authorId Int` on `Post` — the actual foreign key column stored in the database.
- `author User @relation(...)` — tells Prisma: "use `authorId` on this model to look up the `id` on `User`".

### 2. One-to-One: User has one Profile

One user has exactly one profile, and each profile belongs to exactly one user.

```prisma
model User {
  profile Profile?
}

model Profile {
  userId Int     @unique
  user   User    @relation(fields: [userId], references: [id])
}
```

The `@unique` on `userId` enforces the one-to-one constraint — no two profiles can share the same user.

### 3. Many-to-Many: Posts and Tags (Implicit)

A post can have many tags, and a tag can belong to many posts. Prisma's **implicit many-to-many** handles this with no junction model required in your schema:

```prisma
model Post {
  tags Tag[]
}

model Tag {
  posts Post[]
}
```

Prisma automatically creates a hidden `_PostToTag` join table in your database. You interact with it through `post.tags` and `tag.posts` — you never touch the junction table directly.

For full control over the junction table (e.g., to add a `createdAt` field to the join), use an **explicit junction model** like `Like` or `Follow` in the schema below.

### 4. Self-Relation: User follows User

A user can follow other users and be followed by other users. Both sides refer back to the `User` model. Prisma needs named relations to tell them apart:

```prisma
model Follow {
  followerId  Int
  followingId Int
  follower    User @relation("follower",  fields: [followerId],  references: [id])
  following   User @relation("following", fields: [followingId], references: [id])
}

model User {
  followers Follow[] @relation("following")
  following Follow[] @relation("follower")
}
```

The string names `"follower"` and `"following"` act as labels that Prisma uses to match up both sides of the same relation. Without these labels, Prisma wouldn't know which `Follow[]` field corresponds to which foreign key.

---

## 🌐 Full Social Network Schema — Line by Line

Here is the complete schema for a social network app. Read it carefully — every line is annotated.

```prisma
generator client {
  provider = "prisma-client-js"    // Generate the JS/TS PrismaClient
}

datasource db {
  provider = "postgresql"          // We're using PostgreSQL
  url      = env("DATABASE_URL")   // Connection string from .env file
}

model User {
  id        Int      @id @default(autoincrement()) // Primary key, auto-incrementing integer
  email     String   @unique                       // Must be unique across all users
  username  String   @unique                       // Must be unique across all users
  name      String?                                // Optional (nullable) display name
  bio       String?                                // Optional profile bio
  avatar    String?                                // Optional URL to profile picture
  createdAt DateTime @default(now())               // Set to current time on insert
  updatedAt DateTime @updatedAt                    // Auto-updated by Prisma on every update

  posts     Post[]                                 // Virtual: user's posts (one-to-many)
  comments  Comment[]                              // Virtual: user's comments (one-to-many)
  likes     Like[]                                 // Virtual: user's likes (one-to-many)
  followers Follow[] @relation("following")        // Users who follow this user
  following Follow[] @relation("follower")         // Users this user follows

  @@map("users")                                   // DB table is named "users"
}

model Post {
  id        Int      @id @default(autoincrement()) // Primary key
  content   String                                 // Post body text, required
  imageUrl  String?                                // Optional image attachment URL
  published Boolean  @default(true)               // Visible by default
  createdAt DateTime @default(now())               // Creation timestamp
  updatedAt DateTime @updatedAt                    // Last-updated timestamp

  authorId  Int                                    // Foreign key to users.id
  author    User     @relation(fields: [authorId], references: [id])  // Belong to User
  comments  Comment[]                              // Virtual: post's comments
  likes     Like[]                                 // Virtual: post's likes
  tags      Tag[]                                  // Implicit many-to-many with Tag

  @@map("posts")                                   // DB table is "posts"
  @@index([authorId])                              // Index on authorId for fast user-post queries
}

model Follow {
  followerId  Int                                  // FK: the user doing the following
  followingId Int                                  // FK: the user being followed
  createdAt   DateTime @default(now())             // When the follow happened

  follower    User @relation("follower",  fields: [followerId],  references: [id])
  following   User @relation("following", fields: [followingId], references: [id])

  @@id([followerId, followingId])                  // Composite PK: one follow per pair
  @@map("follows")                                 // DB table is "follows"
}

model Comment {
  id        Int      @id @default(autoincrement()) // Primary key
  content   String                                 // Comment text
  createdAt DateTime @default(now())               // Creation timestamp

  authorId  Int                                    // FK: who wrote the comment
  postId    Int                                    // FK: which post it's on
  author    User     @relation(fields: [authorId], references: [id])
  post      Post     @relation(fields: [postId],   references: [id])

  @@map("comments")                                // DB table is "comments"
}

model Like {
  userId    Int                                    // FK: who liked
  postId    Int                                    // FK: what was liked
  createdAt DateTime @default(now())               // When the like happened

  user      User @relation(fields: [userId], references: [id])
  post      Post @relation(fields: [postId], references: [id])

  @@id([userId, postId])                           // Composite PK: one like per user per post
  @@map("likes")                                   // DB table is "likes"
}

model Tag {
  id    Int    @id @default(autoincrement())        // Primary key
  name  String @unique                              // Tag names must be unique
  posts Post[]                                      // Implicit many-to-many with Post

  @@map("tags")                                     // DB table is "tags"
}
```

### What this schema gives you in code

Once you run `prisma generate`, you get queries like:

```typescript
// Get a user with all their posts and each post's tags
const user = await prisma.user.findUnique({
  where: { email: "alice@example.com" },
  include: {
    posts: {
      include: { tags: true }
    }
  }
});

// Create a post and connect it to existing tags in one operation
const post = await prisma.post.create({
  data: {
    content: "Hello Prisma!",
    authorId: 1,
    tags: { connect: [{ name: "prisma" }, { name: "typescript" }] }
  }
});

// Follow another user (explicit junction model)
await prisma.follow.create({
  data: { followerId: 1, followingId: 2 }
});
```

Every one of these calls is fully type-safe — TypeScript knows exactly what fields exist, which are optional, and what the return shape looks like.

---

## 🗺️ Choosing the Right ID Strategy

| Strategy | Prisma default | Best for |
|---|---|---|
| `autoincrement()` | Int or BigInt | Simple apps, small tables, readable IDs |
| `uuid()` | String | Distributed systems, IDs exposed in URLs |
| `cuid()` | String | Same as UUID but sortable by time |
| Composite `@@id` | Multiple fields | Junction tables (Like, Follow) |

A key trade-off: `autoincrement()` generates short, human-readable IDs (`1`, `2`, `42`) but they leak row counts and are sequential — which can be a security concern if IDs are exposed in public URLs. `uuid()` and `cuid()` are opaque and safe to expose but take more storage space.

---

## ✅ Key Takeaways

- `schema.prisma` contains three blocks: `generator`, `datasource`, and your `model` definitions. It is the single source of truth for your database structure.
- Every model needs a primary key — either a single `@id` field or a composite `@@id([...])`.
- Use `?` to mark optional (nullable) fields. Fields without `?` are required (NOT NULL).
- The `@relation` attribute always lives on the model that holds the foreign key. The other side (the virtual list like `Post[]`) is just for convenient querying.
- `@@map` and `@map` let you keep clean TypeScript naming conventions while still following SQL naming conventions in the actual database.
- Add `@@index` on foreign key columns and any columns you frequently filter by — this is critical for production performance.
- For many-to-many relations, use Prisma's implicit style (just `Tag[]` on both sides) for simplicity, or an explicit junction model when you need extra fields on the join.
- `@updatedAt` is one of Prisma's most convenient features — you never have to remember to set the timestamp yourself.

---

## 🧠 Quiz

**Question 1**

You have a `Product` model and a `Category` model. A product belongs to exactly one category, and a category can have many products. Which field holds the foreign key, and on which model?

<details>
<summary>Show Answer</summary>

The foreign key (`categoryId`) lives on the `Product` model — the "many" side of the relation. The `Category` model holds a virtual `products Product[]` field, which does not correspond to a real database column.

```prisma
model Product {
  categoryId Int
  category   Category @relation(fields: [categoryId], references: [id])
}

model Category {
  products Product[]
}
```

</details>

---

**Question 2**

What is the difference between `@unique` on a single field and `@@unique([field1, field2])` at the model level? Give a real-world example of when you would use each.

<details>
<summary>Show Answer</summary>

`@unique` on a single field means that field's value alone must be unique across all rows — for example, `email String @unique` ensures no two users share the same email address.

`@@unique([field1, field2])` means the **combination** of both fields must be unique, but each field individually may repeat. A real-world example: a user can only leave one review per product.

```prisma
model Review {
  userId    Int
  productId Int
  rating    Int
  @@unique([userId, productId])  // One review per user-product pair
}
```

Here `userId` 1 can review `productId` 5 and `productId` 10, but cannot review `productId` 5 twice.

</details>

---

**Question 3**

In the social network schema, `Follow` uses `@@id([followerId, followingId])` instead of a standalone `id Int @id`. Why is this a good design choice, and what real-world constraint does it enforce?

<details>
<summary>Show Answer</summary>

Using a composite primary key on `(followerId, followingId)` enforces at the **database level** that the same follow relationship can only exist once. User 1 can follow User 2 exactly once — attempting to insert a duplicate row will fail with a primary key violation.

A standalone auto-increment `id` would allow duplicate rows like:
```
id=1, followerId=1, followingId=2
id=2, followerId=1, followingId=2  ← duplicate, allowed!
```

With `@@id([followerId, followingId])`, the second row would fail to insert, giving you data integrity for free at the database level without needing application-level checks.

</details>

---

*Next Chapter: Prisma Client — Querying Your Database*
