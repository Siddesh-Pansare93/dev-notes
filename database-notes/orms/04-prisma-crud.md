# 🗄️ Prisma CRUD Operations

> **Chapter 4 — Database Notes / ORMs**
> Level: Beginner-friendly | Prerequisites: Prisma schema basics, TypeScript fundamentals

---

## 📋 Table of Contents

1. [Setup & Schema Overview](#setup--schema-overview)
2. [CREATE Operations](#-create-operations)
3. [READ Operations](#-read-operations)
4. [Filtering Deep Dive](#-filtering-deep-dive)
5. [Sorting & Pagination](#-sorting--pagination)
6. [Selecting Fields & Loading Relations](#-selecting-fields--loading-relations)
7. [UPDATE Operations](#-update-operations)
8. [DELETE Operations](#-delete-operations)
9. [AGGREGATE Operations](#-aggregate-operations)
10. [Key Takeaways](#-key-takeaways)
11. [Quiz](#-quiz)

---

## 🛠️ Setup & Schema Overview

Every Prisma project starts by instantiating the client. You typically do this once and reuse the same instance throughout your application.

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
```

> **Tip:** In a Node.js server, create the client once at module level. Re-creating it on every request opens too many database connections.

Throughout this chapter we use a **social network schema** with the following models:

```prisma
model User {
  id        Int       @id @default(autoincrement())
  email     String    @unique
  username  String    @unique
  name      String?
  avatar    String?
  bio       String?
  createdAt DateTime  @default(now())
  posts     Post[]
  likes     Like[]
  followers Follow[]  @relation("following")
  following Follow[]  @relation("follower")
}

model Post {
  id         Int       @id @default(autoincrement())
  content    String
  published  Boolean   @default(false)
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  author     User      @relation(fields: [authorId], references: [id])
  authorId   Int
  likes      Like[]
  comments   Comment[]
  tags       Tag[]     @relation("PostTags")
}

model Tag {
  id    Int    @id @default(autoincrement())
  name  String @unique
  posts Post[] @relation("PostTags")
}

model Like {
  id     Int  @id @default(autoincrement())
  user   User @relation(fields: [userId], references: [id])
  userId Int
  post   Post @relation(fields: [postId], references: [id])
  postId Int
}

model Comment {
  id        Int      @id @default(autoincrement())
  body      String
  createdAt DateTime @default(now())
  post      Post     @relation(fields: [postId], references: [id])
  postId    Int
}

model Follow {
  follower    User @relation("follower", fields: [followerId], references: [id])
  followerId  Int
  following   User @relation("following", fields: [followingId], references: [id])
  followingId Int
  @@id([followerId, followingId])
}
```

---

## ✏️ CREATE Operations

### `create()` — Insert a Single Record

The `create()` method inserts one row and returns the newly created record. You pass the data inside a `data` object.

```typescript
// Create a new user
const newUser = await prisma.user.create({
  data: {
    email: 'alice@example.com',
    username: 'alice',
    name: 'Alice Wonderland',
    bio: 'Curiouser and curiouser.',
  },
})

console.log(newUser.id) // e.g., 1
```

You can also **create related records in the same call** using nested writes. Prisma wraps these in a single database transaction automatically.

```typescript
// Create a post with an inline author connection and tags
const post = await prisma.post.create({
  data: {
    content: 'Hello World! My first post.',
    published: true,
    author: {
      connect: { id: 1 }, // connect to an existing user
    },
    tags: {
      connectOrCreate: [
        { where: { name: 'tech' },  create: { name: 'tech' } },
        { where: { name: 'intro' }, create: { name: 'intro' } },
      ],
    },
  },
  include: {
    author: true,
    tags: true,
  },
})
```

**`connectOrCreate`** is extremely useful: it connects to an existing record if it matches the `where` condition, or creates a new one. Perfect for tags, categories, or any pre-existing lookup table.

---

### `createMany()` — Bulk Insert

When you need to insert dozens or hundreds of rows at once, `createMany()` is far more efficient than calling `create()` in a loop — it sends a single SQL `INSERT` statement.

```typescript
// Bulk-create tags
const result = await prisma.tag.createMany({
  data: [
    { name: 'typescript' },
    { name: 'prisma' },
    { name: 'node' },
    { name: 'database' },
  ],
  skipDuplicates: true, // silently ignore records that violate unique constraints
})

console.log(result.count) // number of records actually inserted
```

> **Limitation:** `createMany()` does not return the created records themselves — only a count. If you need the IDs back, use `create()` in a loop or `createManyAndReturn()` (available in Prisma 5.14+).

---

### `upsert()` — Create or Update

`upsert()` is the "insert if not exists, otherwise update" operation. It takes three keys: `where`, `create`, and `update`.

```typescript
// Ensure a tag exists; create it if it does not
const tag = await prisma.tag.upsert({
  where:  { name: 'prisma' },
  create: { name: 'prisma' },
  update: {}, // nothing to update if it already exists
})

// Upsert a user profile — update bio if email already registered
const user = await prisma.user.upsert({
  where:  { email: 'bob@example.com' },
  create: { email: 'bob@example.com', username: 'bob', name: 'Bob' },
  update: { bio: 'Updated bio for Bob.' },
})
```

---

## 🔍 READ Operations

### `findUnique()` — Find by a Unique Field

Use this when you know the exact value of a field marked `@unique` or `@id` in your schema. Prisma guarantees at most one result; the return type is `T | null`.

```typescript
// Find by primary key
const userById = await prisma.user.findUnique({
  where: { id: 1 },
})

// Find by unique email
const userByEmail = await prisma.user.findUnique({
  where: { email: 'alice@example.com' },
})

if (!userByEmail) {
  throw new Error('User not found')
}
```

---

### `findFirst()` — Find the First Matching Record

When a field is not unique but you still want a single record, use `findFirst()`. It returns the first record that matches the `where` clause (you can control which "first" via `orderBy`).

```typescript
// Find the most recent published post by a specific user
const latestPost = await prisma.post.findFirst({
  where: {
    authorId: 1,
    published: true,
  },
  orderBy: {
    createdAt: 'desc',
  },
})
```

---

### `findMany()` — Find All Matching Records

The workhorse of READ operations. Returns an array (empty array, never null, if nothing matches).

```typescript
// Get all published posts
const allPublished = await prisma.post.findMany({
  where: { published: true },
})

// Get all posts by a specific author
const userPosts = await prisma.post.findMany({
  where: { authorId: 1 },
})
```

---

## 🎯 Filtering Deep Dive

The `where` clause accepts a rich set of filter operators. All operators live inside the field key.

### Comparison Operators

```typescript
const posts = await prisma.post.findMany({
  where: {
    authorId: { not: 5 },          // not equal
    createdAt: { gt: new Date('2024-01-01') }, // greater than
    // lt  — less than
    // lte — less than or equal
    // gte — greater than or equal
  },
})
```

### `in` and `notIn`

```typescript
// Posts written by users 1, 2, or 3
const posts = await prisma.post.findMany({
  where: {
    authorId: { in: [1, 2, 3] },
  },
})

// Posts NOT written by users 4 or 5
const others = await prisma.post.findMany({
  where: {
    authorId: { notIn: [4, 5] },
  },
})
```

### String Operators

```typescript
const users = await prisma.user.findMany({
  where: {
    // contains: substring match
    bio: { contains: 'developer' },

    // startsWith / endsWith
    username: { startsWith: 'ali' },
    email:    { endsWith: '@example.com' },

    // Case-insensitive (works on most databases)
    name: {
      contains: 'alice',
      mode: 'insensitive',
    },
  },
})
```

### Logical Operators: `AND`, `OR`, `NOT`

```typescript
// Posts that are published AND created after Jan 1
const filtered = await prisma.post.findMany({
  where: {
    AND: [
      { published: true },
      { createdAt: { gte: new Date('2024-01-01') } },
    ],
  },
})

// Users whose name contains "Alice" OR whose bio mentions "developer"
const results = await prisma.user.findMany({
  where: {
    OR: [
      { name: { contains: 'Alice', mode: 'insensitive' } },
      { bio:  { contains: 'developer', mode: 'insensitive' } },
    ],
  },
})
```

### Filtering on Relations

```typescript
// Users who have at least one published post
const activeAuthors = await prisma.user.findMany({
  where: {
    posts: {
      some: { published: true },
    },
  },
})

// Users who have NO posts at all
const newUsers = await prisma.user.findMany({
  where: {
    posts: { none: {} },
  },
})

// Users where every post is published
const prolificAuthors = await prisma.user.findMany({
  where: {
    posts: {
      every: { published: true },
    },
  },
})
```

---

## 📑 Sorting & Pagination

### `orderBy` — Sorting

```typescript
// Single field, descending
const recent = await prisma.post.findMany({
  orderBy: { createdAt: 'desc' },
})

// Multiple fields — primary sort by author, secondary by date
const sorted = await prisma.post.findMany({
  orderBy: [
    { authorId: 'asc' },
    { createdAt: 'desc' },
  ],
})
```

### Offset Pagination (`skip` + `take`)

This is the classic "page 1, page 2..." pagination. Easy to understand, works fine on moderate datasets.

```typescript
const PAGE_SIZE = 10

async function getPage(page: number) {
  return prisma.post.findMany({
    where:   { published: true },
    orderBy: { createdAt: 'desc' },
    skip:    (page - 1) * PAGE_SIZE, // how many records to skip
    take:    PAGE_SIZE,              // how many records to return
  })
}

const page1 = await getPage(1) // records 1-10
const page2 = await getPage(2) // records 11-20
```

> **Drawback of offset pagination:** If new records are inserted between page fetches, pages can shift — you may see duplicates or miss records. Fine for most use cases, problematic for real-time feeds.

### Cursor Pagination (Better for Large / Real-Time Datasets)

Instead of counting how many rows to skip, cursor pagination remembers the last item seen and asks "give me records after this one." Much more efficient on large tables.

```typescript
async function getNextPage(cursor?: number, take = 10) {
  return prisma.post.findMany({
    where:   { published: true },
    orderBy: { id: 'asc' },
    take,
    // If cursor is provided, skip it and start from the next record
    ...(cursor
      ? { skip: 1, cursor: { id: cursor } }
      : {}),
  })
}

// First page — no cursor
const firstPage = await getNextPage()

// Next page — pass the id of the last item from the previous page
const lastId    = firstPage[firstPage.length - 1]?.id
const nextPage  = await getNextPage(lastId)
```

---

## 🧩 Selecting Fields & Loading Relations

### `select` — Pick Specific Fields

By default Prisma returns every scalar field on a model. Use `select` to get only what you need — smaller payloads, faster queries.

```typescript
// Only return id, username, and avatar — nothing else
const users = await prisma.user.findMany({
  select: {
    id:       true,
    username: true,
    avatar:   true,
  },
})
// users[0] — { id: 1, username: 'alice', avatar: '...' }
// No email, no bio, no createdAt
```

### `include` — Eager Load Relations

`include` tells Prisma to JOIN the related table and attach the results as nested objects or arrays.

```typescript
// Post with its author and all its comments
const postWithRelations = await prisma.post.findUnique({
  where:   { id: 1 },
  include: {
    author:   true,
    comments: true,
    tags:     true,
  },
})
```

### Nested `select` Inside `include`

You can nest a `select` inside an `include` to pick only certain fields of the related model.

```typescript
const post = await prisma.post.findUnique({
  where:   { id: 1 },
  include: {
    author: {
      select: {
        id:       true,
        username: true,
        avatar:   true,
        // email and bio are NOT included
      },
    },
    comments: {
      orderBy: { createdAt: 'asc' },
      select:  { id: true, body: true, createdAt: true },
    },
  },
})
```

### `_count` — Count Related Records Without Fetching Them

A very common need: "show the number of likes and comments on a post" without loading every like/comment row.

```typescript
const postsWithCounts = await prisma.post.findMany({
  where:   { published: true },
  include: {
    _count: {
      select: {
        likes:    true,
        comments: true,
      },
    },
  },
})

// postsWithCounts[0]._count => { likes: 42, comments: 7 }
```

### Real-World Feed Example

Combining everything above into a production-style paginated feed:

```typescript
async function getFeed(page: number) {
  const PAGE_SIZE = 10

  return prisma.post.findMany({
    where:   { published: true },
    orderBy: { createdAt: 'desc' },
    skip:    (page - 1) * PAGE_SIZE,
    take:    PAGE_SIZE,
    include: {
      author: {
        select: { id: true, username: true, avatar: true },
      },
      tags: {
        select: { id: true, name: true },
      },
      _count: {
        select: { likes: true, comments: true },
      },
    },
  })
}
```

---

## 🔄 UPDATE Operations

### `update()` — Update a Single Record

`update()` requires a `where` clause that targets a unique field. Prisma throws an error if no record matches.

```typescript
// Update a user's bio
const updatedUser = await prisma.user.update({
  where: { id: 1 },
  data:  { bio: 'Now living in Wonderland.' },
})

// Publish a post
const publishedPost = await prisma.post.update({
  where: { id: 5 },
  data:  { published: true },
})
```

### `updateMany()` — Update Multiple Records at Once

Like `deleteMany()`, this returns a count rather than the updated records.

```typescript
// Unpublish all posts by a banned user
const result = await prisma.post.updateMany({
  where: { authorId: 42 },
  data:  { published: false },
})

console.log(result.count) // number of rows updated
```

### Atomic Number Operations

When incrementing/decrementing counters you must avoid race conditions. Prisma lets you perform these operations atomically at the database level — no need to read the current value first.

```typescript
// Increment a hypothetical view count by 1
await prisma.post.update({
  where: { id: 1 },
  data:  { viewCount: { increment: 1 } },
})

// Decrement
await prisma.post.update({
  where: { id: 1 },
  data:  { viewCount: { decrement: 1 } },
})

// Multiply (e.g., apply a 2x boost)
await prisma.post.update({
  where: { id: 1 },
  data:  { score: { multiply: 2 } },
})

// Divide
await prisma.post.update({
  where: { id: 1 },
  data:  { score: { divide: 2 } },
})

// Explicitly set (same as normal assignment, but atomic)
await prisma.post.update({
  where: { id: 1 },
  data:  { viewCount: { set: 0 } },
})
```

> **Why atomic?** Without atomic operations, two simultaneous requests could both read `viewCount: 5`, both compute `5 + 1 = 6`, and both write `6` — losing one increment. The database-level operation avoids this entirely.

---

## 🗑️ DELETE Operations

### `delete()` — Delete a Single Record

Like `update()`, `delete()` requires a unique `where` clause and throws if the record does not exist.

```typescript
// Delete a specific comment
const deleted = await prisma.comment.delete({
  where: { id: 10 },
})

console.log(deleted.id) // the deleted record is returned
```

### `deleteMany()` — Delete Multiple Records

Returns only a count. The `where` clause is optional — omitting it deletes every row in the table (use with extreme care!).

```typescript
// Delete all unpublished posts older than 30 days
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

const result = await prisma.post.deleteMany({
  where: {
    published: false,
    createdAt: { lt: thirtyDaysAgo },
  },
})

console.log(`Deleted ${result.count} draft posts.`)
```

> **Cascading Deletes:** If your schema uses `onDelete: Cascade` on relations, Prisma (and the database) will automatically delete related records. Without cascade rules, deleting a record with existing related rows throws a foreign key constraint error.

---

## 📊 AGGREGATE Operations

### `count()` — Count Records

```typescript
// Total number of users
const totalUsers = await prisma.user.count()

// Count published posts only
const publishedCount = await prisma.post.count({
  where: { published: true },
})

// Count posts per author (using the _count in findMany)
const authors = await prisma.user.findMany({
  include: {
    _count: { select: { posts: true } },
  },
})
```

### `aggregate()` — Sum, Average, Min, Max

```typescript
// Aggregate on a numeric field (e.g., viewCount added to Post)
const stats = await prisma.post.aggregate({
  where: { published: true },
  _count: { _all: true },     // total record count
  _sum:   { viewCount: true },
  _avg:   { viewCount: true },
  _min:   { viewCount: true },
  _max:   { viewCount: true },
})

console.log(stats._avg.viewCount)  // average views per published post
console.log(stats._sum.viewCount)  // total views across all published posts
```

### `groupBy()` — Group and Aggregate

`groupBy()` is the Prisma equivalent of SQL's `GROUP BY`. You specify which fields to group on, then which aggregations to compute per group.

```typescript
// Count posts grouped by authorId, only groups with more than 2 posts
const postsByAuthor = await prisma.post.groupBy({
  by:     ['authorId'],
  _count: { _all: true },
  having: {
    authorId: {
      _count: { gt: 2 },  // only authors with more than 2 posts
    },
  },
  orderBy: {
    _count: { authorId: 'desc' },
  },
})

// postsByAuthor[0] => { authorId: 1, _count: { _all: 8 } }
```

---

## 💡 Key Takeaways

| Operation | Method | Returns |
|---|---|---|
| Insert one | `create()` | Created record |
| Insert many | `createMany()` | `{ count: N }` |
| Insert or update | `upsert()` | Resulting record |
| Find by unique | `findUnique()` | `T \| null` |
| Find one matching | `findFirst()` | `T \| null` |
| Find all matching | `findMany()` | `T[]` |
| Update one | `update()` | Updated record |
| Update many | `updateMany()` | `{ count: N }` |
| Delete one | `delete()` | Deleted record |
| Delete many | `deleteMany()` | `{ count: N }` |
| Count | `count()` | `number` |
| Aggregate stats | `aggregate()` | Stats object |
| Group & aggregate | `groupBy()` | Array of groups |

**Mental model checklist before writing a query:**

1. **How many records do I need?** One → `findUnique` / `findFirst`. Many → `findMany`.
2. **Do I need related data?** Yes → `include`. Only specific fields of it → nested `select`.
3. **Do I need to count relations without loading them?** → `_count`.
4. **Am I on a large table?** Use cursor pagination over offset pagination.
5. **Am I updating a number?** Use atomic `increment`/`decrement` over read-then-write.
6. **Am I inserting many rows?** Use `createMany()` over a loop.
7. **Does the record need to exist already?** `update()` or `delete()` throw if not found; `updateMany()` and `deleteMany()` silently return `{ count: 0 }`.

---

## 🧪 Quiz

Test your understanding before moving on.

---

**Question 1**

You are building a "Trending Posts" endpoint. It should return the 5 most-liked posts from the last 7 days, showing only the post `id`, `content`, and the like count — without loading every `Like` record into memory.

Which Prisma features do you need to combine? Write the query.

<details>
<summary>Answer</summary>

```typescript
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

const trending = await prisma.post.findMany({
  where: {
    published: true,
    createdAt: { gte: sevenDaysAgo },
  },
  orderBy: {
    likes: { _count: 'desc' }, // order by relation count
  },
  take: 5,
  select: {
    id:      true,
    content: true,
    _count:  { select: { likes: true } },
  },
})
```

Key features: `where` with date filter, `orderBy` on relation count, `take` for limit, `select` with `_count`.

</details>

---

**Question 2**

A user updates their profile. Your endpoint receives `{ email, name, bio }` but you only want to update the fields the user actually provided (not overwrite with `undefined`).

Why is this safe with Prisma's `update()`, and how would you handle it?

<details>
<summary>Answer</summary>

Prisma's `data` object only updates the fields you explicitly include. Passing `undefined` for a key is the same as not passing it — Prisma will not set that column to `NULL`. You can safely spread only the defined values:

```typescript
async function updateProfile(userId: number, input: {
  email?: string
  name?:  string
  bio?:   string
}) {
  return prisma.user.update({
    where: { id: userId },
    data:  {
      ...(input.email !== undefined && { email: input.email }),
      ...(input.name  !== undefined && { name:  input.name }),
      ...(input.bio   !== undefined && { bio:   input.bio }),
    },
  })
}
```

</details>

---

**Question 3**

You have a `Post` model with a `viewCount Int @default(0)` field. Two users open the same post simultaneously. Both requests read `viewCount = 100`, add 1, and write back `101`. The real count should be `102`.

What Prisma operation prevents this race condition, and what does the generated SQL look like?

<details>
<summary>Answer</summary>

Use the atomic `increment` operation:

```typescript
await prisma.post.update({
  where: { id: postId },
  data:  { viewCount: { increment: 1 } },
})
```

Prisma generates:

```sql
UPDATE "Post"
SET "viewCount" = "viewCount" + 1
WHERE "id" = $1;
```

Because the increment happens in a single SQL statement inside the database, no application-level read is needed. Both concurrent requests safely produce `102` because the database serialises the two `+1` operations.

</details>

---

*Next chapter: Prisma Relations — one-to-many, many-to-many, and self-referencing models.*
