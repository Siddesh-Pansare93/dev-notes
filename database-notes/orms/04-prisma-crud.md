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

Kya hota hai jab Prisma project start karte ho? Sabse pehle client instantiate karna padta hai. Aur ye kaam ek hi baar karna hai — usko poore app mein reuse karo, jaise tum Express app mein `app` object ko ek hi jagah banate ho aur sab jagah use karte ho.

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
```

> **Tip:** Node.js server mein client ko module level pe ek hi baar banao. Har request pe naya client banaoge to bohot saare DB connections khul jayenge — bilkul waise jaise har order pe Zomato naya delivery partner hire kar le, instead of reusing available riders.

Is chapter mein hum ek **social network schema** use karenge, jisme ye models hain:

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

### `create()` — Ek Record Insert Karna

Kya karta hai `create()`? Simple — ek row insert karta hai aur wahi naya banaya hua record wapas return karta hai. Data ko `data` object ke andar pass karna hota hai.

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

Isse aage badhkar, tum **related records bhi same call mein bana sakte ho** — nested writes ke through. Prisma inko automatically ek hi database transaction mein wrap kar deta hai, matlab ya to sab ho jayega ya kuch nahi hoga.

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

**`connectOrCreate`** ek kamaal ka feature hai: agar `where` condition wala record already exist karta hai to bas usse connect kar dega, warna naya bana dega. Tags, categories, ya kisi bhi pre-existing lookup table ke liye ye perfect hai — jaise Swiggy pe restaurant category "North Indian" already hai to reuse karo, nahi hai to nayi bana do.

---

### `createMany()` — Bulk Insert

Jab tumhe ek saath dus-sau records insert karne ho, `create()` ko loop mein chalana bilkul galat approach hai. Uske jagah `createMany()` use karo — ye ek hi SQL `INSERT` statement bhejta hai database ko, matlab bohot fast.

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

> **Limitation:** `createMany()` banaye gaye records wapas nahi deta — sirf count deta hai. Agar IDs chahiye to `create()` loop mein use karo, ya `createManyAndReturn()` (Prisma 5.14+ mein available).

---

### `upsert()` — Create Ya Update

`upsert()` ka matlab hai: "agar record exist nahi karta to create kar do, warna update kar do." Isme teen keys hoti hain: `where`, `create`, aur `update`.

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

Socho jaise CRED pe koi naya user login kare — agar uska account already hai to profile update ho jaye, nahi hai to naya account create ho jaye. Yahi kaam `upsert()` ek hi call mein kar deta hai.

---

## 🔍 READ Operations

### `findUnique()` — Unique Field Se Dhundna

Kab use karein? Jab tumhe pata ho ki field `@unique` ya `@id` marked hai schema mein. Prisma guarantee deta hai ki result zyada se zyada ek hi milega; return type hota hai `T | null`.

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

### `findFirst()` — Pehla Matching Record

Agar field unique nahi hai, phir bhi tumhe sirf ek record chahiye, to `findFirst()` use karo. Ye `where` clause se match hone wala pehla record return karta hai (kaunsa "pehla" hoga, wo tum `orderBy` se control karte ho).

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

### `findMany()` — Saare Matching Records

Ye hai READ operations ka workhorse — asli mehnat karne wala method. Ye ek array return karta hai (kuch match na ho to empty array, kabhi bhi `null` nahi).

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

`where` clause ke andar bohot saare filter operators milte hain. Sab operators field key ke andar hi likhe jaate hain.

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

### `in` aur `notIn`

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

### Relations Pe Filtering

Yaha thoda interesting part aata hai — related table ke data ke basis pe filter lagana.

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

`some`, `none`, `every` — bilkul English jaisa hi matlab hai: "kam se kam ek," "koi bhi nahi," "sab ke sab."

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

Ye woh classic "page 1, page 2..." wala pagination hai jo tumne har website pe dekha hoga. Samajhna easy hai, aur chhote-medium datasets pe theek kaam karta hai.

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

> **Offset pagination ki dikkat:** Agar do page-fetch ke beech naye records insert ho jayein, to pages "shift" ho sakte hain — tumhe duplicate records dikh sakte hain ya kuch miss ho sakte hain. Zyadatar use-cases ke liye theek hai, lekin real-time feeds (jaise Instagram feed) ke liye problematic hai.

### Cursor Pagination (Bade / Real-Time Datasets Ke Liye Better)

Kitni rows skip karni hain, ye count karne ke bajaye, cursor pagination last dekha hua item yaad rakhta hai aur poochta hai "iske baad wale records de do." Bade tables pe ye kaafi zyada efficient hai.

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

Socho jaise IRCTC ki tatkal booking list ho ya BigBasket ka infinite-scroll product listing — jitni tezi se naya data aata rehta hai, cursor pagination utna hi zaroori ho jaata hai kyunki skip/take wala approach wahan gadbad kar dega.

---

## 🧩 Selecting Fields & Loading Relations

### `select` — Specific Fields Chunna

Default mein Prisma model ke sab scalar fields return karta hai. `select` use karke sirf wahi fields mangao jo chahiye — chhota payload, fast query.

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

### `include` — Relations Eager Load Karna

`include` Prisma ko batata hai ki related table ko JOIN karo aur result ko nested object ya array ki tarah attach kar do.

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

### `include` Ke Andar Nested `select`

Related model ke sirf kuch fields chahiye? To `include` ke andar `select` nest kar sakte ho.

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

### `_count` — Related Records Ko Fetch Kiye Bina Count Karna

Ek bahut common requirement: "post pe kitne likes aur comments hain ye dikhao" — bina har like/comment row load kiye. Zomato pe restaurant card mein "500+ ratings" dikhta hai na, exactly waisa hi — puri list load nahi hoti, sirf count hota hai.

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

Upar ki sab cheezein jod ke, ek production-style paginated feed banate hain:

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

### `update()` — Ek Record Update Karna

Kyun zaruri hai `where` clause? Kyunki `update()` ko ek unique field targeting `where` chahiye hi hota. Agar koi record match nahi karta to Prisma error throw karega.

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

### `updateMany()` — Ek Saath Multiple Records Update Karna

`deleteMany()` ki tarah, ye bhi updated records ke bajaye sirf ek count return karta hai.

```typescript
// Unpublish all posts by a banned user
const result = await prisma.post.updateMany({
  where: { authorId: 42 },
  data:  { published: false },
})

console.log(result.count) // number of rows updated
```

### Atomic Number Operations

Jab counters ko increment/decrement karna ho, race conditions se bachna zaruri hai. Prisma tumhe ye operations database level pe atomically karne deta hai — pehle current value read karne ki koi zarurat nahi.

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

> **Atomic kyun zaruri hai?** Bina atomic operations ke, do simultaneous requests dono `viewCount: 5` read kar sakte hain, dono `5 + 1 = 6` calculate karke `6` hi likh denge — matlab ek increment kho gaya. Bilkul waise jaise UPI mein do log ek hi second mein balance check karke transaction bhej dein aur system race condition mein fas jaye. Database-level operation isko puri tarah avoid karta hai.

---

## 🗑️ DELETE Operations

### `delete()` — Ek Record Delete Karna

`update()` ki tarah, `delete()` ko bhi unique `where` clause chahiye, aur record na milne pe error throw karta hai.

```typescript
// Delete a specific comment
const deleted = await prisma.comment.delete({
  where: { id: 10 },
})

console.log(deleted.id) // the deleted record is returned
```

### `deleteMany()` — Multiple Records Delete Karna

Ye sirf count return karta hai. `where` clause optional hai — agar chhod diya to poori table ke saare rows delete ho jayenge (bohot dhyan se use karo!).

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

> [!warning]
> **Cascading Deletes:** Agar tumhare schema mein relations pe `onDelete: Cascade` set hai, to Prisma (aur database) automatically related records bhi delete kar dega. Cascade rules na ho to existing related rows wale record ko delete karne pe foreign key constraint error aayega.

---

## 📊 AGGREGATE Operations

### `count()` — Records Count Karna

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

### `groupBy()` — Group Karke Aggregate Karna

`groupBy()` SQL ke `GROUP BY` ka Prisma version hai. Tum batate ho kis field pe group karna hai, phir har group ke liye kaunsi aggregation chahiye.

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

Isko aise socho — jaise Swiggy ye pata karna chahta ho "kaunse restaurants ne is mahine 2 se zyada orders complete kiye," `groupBy` + `having` exactly ye kaam karte hain.

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

**Query likhne se pehle ye mental checklist chalao:**

1. **Kitne records chahiye?** Ek → `findUnique` / `findFirst`. Zyada → `findMany`.
2. **Related data bhi chahiye?** Haan → `include`. Sirf kuch specific fields → nested `select`.
3. **Relations ko load kiye bina count chahiye?** → `_count`.
4. **Bade table pe kaam kar rahe ho?** Offset pagination ke bajaye cursor pagination use karo.
5. **Number update kar rahe ho?** Read-then-write ke bajaye atomic `increment`/`decrement` use karo.
6. **Bohot saari rows insert kar rahe ho?** Loop ke bajaye `createMany()` use karo.
7. **Record ka exist karna zaruri hai?** `update()` aur `delete()` na milne pe error throw karte hain; `updateMany()` aur `deleteMany()` chupchaap `{ count: 0 }` return kar dete hain.

---

## 🧪 Quiz

Aage badhne se pehle apni samajh test kar lo.

---

**Question 1**

Tum ek "Trending Posts" endpoint bana rahe ho. Isse pichle 7 dino ke top-5 sabse zyada liked posts return karne hain — sirf post ka `id`, `content`, aur like count ke saath, bina har `Like` record ko memory mein load kiye.

Ye karne ke liye kaunse Prisma features combine karne padenge? Query likho.

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

Key features: date filter wala `where`, relation count pe `orderBy`, limit ke liye `take`, aur `_count` wala `select`.

</details>

---

**Question 2**

Ek user apna profile update karta hai. Tumhare endpoint ko `{ email, name, bio }` milta hai, lekin tumhe sirf wahi fields update karne hain jo user ne actually diye hain (`undefined` waali fields ko overwrite nahi karna).

Prisma ke `update()` ke saath ye kyun safe hai, aur isse kaise handle karoge?

<details>
<summary>Answer</summary>

Prisma ka `data` object sirf wahi fields update karta hai jo tum explicitly usme daalte ho. Kisi key ke liye `undefined` pass karna waisa hi hai jaisa uss key ko pass hi na karna — Prisma us column ko `NULL` set nahi karega. Isliye tum safely sirf defined values ko spread kar sakte ho:

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

Tumhare paas `Post` model hai jisme `viewCount Int @default(0)` field hai. Do users same post ek saath open karte hain. Dono requests `viewCount = 100` read karti hain, 1 add karti hain, aur wapas `101` likh deti hain. Real count `102` hona chahiye tha.

Kaunsa Prisma operation is race condition ko rokta hai, aur generated SQL kaisa dikhta hai?

<details>
<summary>Answer</summary>

Atomic `increment` operation use karo:

```typescript
await prisma.post.update({
  where: { id: postId },
  data:  { viewCount: { increment: 1 } },
})
```

Prisma ye generate karta hai:

```sql
UPDATE "Post"
SET "viewCount" = "viewCount" + 1
WHERE "id" = $1;
```

Kyunki increment ek hi SQL statement mein database ke andar hota hai, application-level read ki zarurat hi nahi padti. Dono concurrent requests safely `102` produce karte hain kyunki database dono `+1` operations ko serialize kar deta hai — ek ke baad ek, bina kisi conflict ke.

</details>

---

*Next chapter: Prisma Relations — one-to-many, many-to-many, and self-referencing models.*
