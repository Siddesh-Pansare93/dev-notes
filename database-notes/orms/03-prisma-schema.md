# 🗂️ Prisma Schema — Apna Data Model Define Karna

> **Chapter 3 of the Prisma ORM Series**
> Audience: Beginner developers jinhone Prisma setup kar liya hai aur ab samajhna chahte hain ki database ko code mein kaise model karte hain.

---

## 🧭 Prisma Schema Kya Hota Hai?

Kya hota hai yahaan? Database query likhne se pehle, Prisma ko tumhare data ka structure pata hona chahiye. Ye poori knowledge ek hi file mein rehti hai: `schema.prisma`. Isko socho apne **database ka blueprint** ki tarah — jaise Zomato ka backend team pehle decide karta hai ki "Restaurant" table mein kaunse columns honge, "Order" table kaise connect hoga usse — bilkul waise hi ye file batati hai har table, har column, har relationship, aur tumhara app database se kaise connect hota hai.

Jab tum `prisma migrate dev` ya `prisma db push` chalate ho, Prisma is file ko padhta hai aur woh definitions actual database pe apply karta hai. Aur jab tum `prisma generate` chalate ho, Prisma is file ko padh ke ek fully-typed TypeScript client generate kar deta hai — matlab tumhari har query mein autocomplete aur compile-time safety milti hai.

Ek file. Teen kaam:
1. Database connection configure karna
2. Code generator configure karna
3. Har model (table) describe karna

---

## 🔬 `schema.prisma` Ki Anatomy

Har `schema.prisma` file teen building blocks se banti hai: **generator**, **datasource**, aur **models**.

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

### `generator` Block

```prisma
generator client {
  provider = "prisma-client-js"
}
```

Kyun zaruri hai? Ye Prisma ko batata hai ki `prisma generate` chalane pe **kya generate karna hai**. `provider = "prisma-client-js"` ka matlab hai "JavaScript/TypeScript client banao". Yehi wajah hai ki tumhe `PrismaClient` object milta hai jo tum apne app ke code mein import karte ho. Agar kisi doosri language ya runtime ke liye generate karna hota, to yahin provider change karte.

### `datasource` Block

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Ye Prisma ko batata hai ki **tumhara database kahan hai**. `provider` field mein `"postgresql"`, `"mysql"`, `"sqlite"`, `"sqlserver"`, `"mongodb"`, ya `"cockroachdb"` de sakte ho. `url` field connection string hold karta hai. Connection string ko hard-code karna security risk hota hai (jaise apna UPI PIN kahin likh dena), isliye `env("DATABASE_URL")` use karte hain jo runtime pe `.env` file se value uthata hai.

> [!warning]
> Kabhi bhi apna real database URL version control (Git) mein commit mat karo. Hamesha environment variables use karo.

---

## 📦 Models: Apni Tables Define Karna

**Model** Prisma mein tumhare relational database ki ek **table** ke barabar hota hai. Model ke andar har field, table ke ek **column** ke barabar hota hai.

```prisma
model Post {
  id      Int    @id @default(autoincrement())
  title   String
  content String?
}
```

- `model Post` — ek table define karta hai. By default Prisma model ka naam hi table ka naam use karta hai (`Post`). Isko `@@map` se override kar sakte ho.
- Andar har line ek field (column) hai.
- Ek `?` field ko optional banata hai (SQL mein nullable).
- `?` nahi hai to field required hai (SQL mein NOT NULL).

---

## 🔤 Field Types

Prisma ka apna type system hai jo tumhare database ke native types se map hota hai. Poora reference yahan hai:

| Prisma Type   | Kya represent karta hai                        | Example values             |
|---------------|--------------------------------------------------|----------------------------|
| `String`      | Kisi bhi length ka text                          | `"hello"`, `"user@email.com"` |
| `Int`         | 32-bit integer                                   | `1`, `-42`, `1000`         |
| `BigInt`      | 64-bit integer (bahut bade numbers)              | `9007199254740993n`        |
| `Float`       | Floating point number (approximate)              | `3.14`, `-0.001`           |
| `Decimal`     | Exact decimal (paisa/money ke liye use karo)     | `19.99`, `0.001`           |
| `Boolean`     | True ya false                                    | `true`, `false`            |
| `DateTime`    | Date aur time timezone ke saath                  | `2024-01-15T10:30:00Z`     |
| `Json`        | Raw JSON jo DB mein store hoti hai               | `{ "key": "value" }`       |
| `Bytes`       | Binary data                                      | File contents, hashes      |
| `Unsupported` | DB-native type jo Prisma automatically map nahi kar sakta | PostGIS geometry types |

> [!tip]
> **`Decimal` vs `Float` kab use karein:** `Float` use karo scientific data ke liye jahan chhote rounding errors chalenge. `Decimal` use karo paise (money) ya precise calculations ke liye — jaise Paytm ya PhonePe ka wallet balance calculate karte waqt floating point arithmetic silently rounding bugs de sakta hai jo financial apps mein bahut risky hai.

---

## 🏷️ Field Attributes

Attributes batate hain ki field kaise behave karega. Single-field attributes `@` se start hote hain, aur model-level attributes `@@` se start hote hain.

### `@id` — Primary Key

```prisma
id Int @id @default(autoincrement())
```

Is field ko table ki primary key banata hai. Har model mein exactly ek `@id` field hona chahiye (ya ek composite `@@id`).

### `@default(...)` — Default Values

Batata hai ki agar koi value nahi di gayi to kya insert hoga.

```prisma
id        Int      @id @default(autoincrement())  // auto-increment integer
uid       String   @default(uuid())               // random UUID jaise "a1b2c3d4-..."
cuid      String   @default(cuid())               // collision-resistant ID
createdAt DateTime @default(now())                // current timestamp
published Boolean  @default(false)               // literal false
role      String   @default("user")              // literal string
```

- `autoincrement()` — database sequential integers generate karta hai (1, 2, 3...)
- `uuid()` — ek v4 UUID string generate karta hai, jab tumhe globally unique IDs chahiye tab useful hai
- `cuid()` — ek collision-resistant ID generate karta hai jo creation time ke hisaab se sortable bhi hota hai
- `now()` — record create hone ke exact time pe current date-time insert karta hai
- `true`, `false`, ya `"somestring"` jaisi literal values as-is set ho jaati hain

### `@unique` — Unique Constraint

```prisma
email String @unique
```

Ye ensure karta hai ki do rows ki value is field mein same na ho. Zomato mein jaise do users ka same email ID nahi ho sakta — waisa hi. Prisma database mein ek unique index bhi bana deta hai.

### `@updatedAt` — Auto-Update Timestamp

```prisma
updatedAt DateTime @updatedAt
```

Jab bhi record update hota hai, Prisma khud is field ko current time pe set kar deta hai. Tumhe kabhi bhi ye value manually pass karne ki zarurat nahi — Prisma isko transparently manage karta hai.

### `@map("column_name")` — Database Column Ka Naam Badalna

```prisma
firstName String @map("first_name")
```

Tumhare Prisma code mein tum `firstName` (camelCase) use karte ho, lekin database mein wahi column `first_name` (snake_case) ke naam se store hota hai. Isse tum apne TypeScript code mein clean naming convention follow kar sakte ho, aur database mein SQL ka convention bhi maintain rehta hai.

### `@@map("table_name")` — Database Table Ka Naam Badalna

```prisma
model User {
  // ...
  @@map("users")
}
```

Model Prisma code mein `User` kehlata hai (isse `prisma.user.findMany()` generate hota hai), lekin actual SQL table ka naam `users` hota hai. Ye ek common convention hai — Prisma mein singular model names, database mein plural table names.

### `@@index([field1, field2])` — Composite Index

```prisma
@@index([authorId])
@@index([createdAt, authorId])
```

Specified field(s) pe database index create karta hai. Indexes un queries ko dramatically fast kar dete hain jo un columns pe filter ya sort karti hain. Foreign key columns pe aur jin columns ko tum frequently `WHERE` clause mein use karte ho, unpe index zaroor lagao — jaise Swiggy ke order table mein `userId` pe index hona chahiye taaki "mere saare orders dikhao" query fast chale.

### `@@unique([field1, field2])` — Composite Unique Constraint

```prisma
@@unique([userId, postId])
```

Ye ensure karta hai ki dono fields ka **combination** unique ho. `Like` model mein iska matlab hai ki ek user ek post ko sirf ek hi baar like kar sakta hai — lekin alag-alag posts ko jitni baar chahe like kar sakta hai.

### `@@id([field1, field2])` — Composite Primary Key

```prisma
@@id([followerId, followingId])
```

Jab koi single field primary key nahi hoti, to tum multiple fields se ek composite primary key define kar sakte ho. Uss combination ka value saari rows mein unique hona chahiye.

---

## 🔗 Prisma Mein Relations

Relations schema ka sabse powerful part hain. Ye batate hain ki models ek-doosre se kaise connect hote hain. Prisma foreign keys khud handle karta hai aur intuitive query methods automatically generate kar deta hai.

### 1. One-to-Many: User Ke Bahut Saare Posts

Sabse common relation. Ek user bahut saare posts likhta hai, lekin har post exactly ek user ka hota hai.

```prisma
model User {
  posts Post[]  // "User has many Posts"
}

model Post {
  authorId Int
  author   User @relation(fields: [authorId], references: [id])
}
```

- `User` pe `Post[]` — ek list; ye side DB mein kuch bhi store nahi karta, ye sirf querying ke liye ek virtual field hai.
- `Post` pe `authorId Int` — actual foreign key column jo database mein store hota hai.
- `author User @relation(...)` — Prisma ko batata hai: "is model ke `authorId` ko use karke `User` ka `id` dhoondho".

### 2. One-to-One: User Ka Ek Profile

Ek user ka exactly ek profile hota hai, aur har profile exactly ek user ka hota hai.

```prisma
model User {
  profile Profile?
}

model Profile {
  userId Int     @unique
  user   User    @relation(fields: [userId], references: [id])
}
```

`userId` pe laga `@unique` one-to-one constraint enforce karta hai — koi do profiles same user share nahi kar sakte.

### 3. Many-to-Many: Posts Aur Tags (Implicit)

Ek post ke bahut saare tags ho sakte hain, aur ek tag bahut saare posts mein use ho sakta hai. Prisma ka **implicit many-to-many** isko handle karta hai bina schema mein koi junction model likhe:

```prisma
model Post {
  tags Tag[]
}

model Tag {
  posts Post[]
}
```

Prisma automatically ek hidden `_PostToTag` join table database mein bana deta hai. Tum isse `post.tags` aur `tag.posts` ke through interact karte ho — junction table ko kabhi directly touch nahi karte.

Agar junction table pe poora control chahiye (jaise join mein `createdAt` field add karni ho), to `Like` ya `Follow` jaisa **explicit junction model** use karo, jo neeche schema mein hai.

### 4. Self-Relation: User Follows User

Ek user doosre users ko follow kar sakta hai aur khud bhi follow ho sakta hai — Instagram jaisa follow system socho. Dono sides `User` model ko hi refer karte hain. Prisma ko dono sides differentiate karne ke liye named relations chahiye:

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

`"follower"` aur `"following"` string names labels ki tarah kaam karte hain jinhe Prisma same relation ke dono sides match karne ke liye use karta hai. Ye labels na hote to Prisma ko pata hi nahi chalta ki kaunsa `Follow[]` field kis foreign key se corresponding hai.

---

## 🌐 Full Social Network Schema — Line by Line

Yahan ek social network app ka poora schema hai. Dhyan se padho — har line annotate ki gayi hai.

```prisma
generator client {
  provider = "prisma-client-js"    // JS/TS PrismaClient generate karo
}

datasource db {
  provider = "postgresql"          // Hum PostgreSQL use kar rahe hain
  url      = env("DATABASE_URL")   // .env file se connection string
}

model User {
  id        Int      @id @default(autoincrement()) // Primary key, auto-incrementing integer
  email     String   @unique                       // Saare users mein unique hona chahiye
  username  String   @unique                       // Saare users mein unique hona chahiye
  name      String?                                // Optional (nullable) display name
  bio       String?                                // Optional profile bio
  avatar    String?                                // Optional URL profile picture ke liye
  createdAt DateTime @default(now())               // Insert hone pe current time set
  updatedAt DateTime @updatedAt                    // Har update pe Prisma khud update karta hai

  posts     Post[]                                 // Virtual: user ke posts (one-to-many)
  comments  Comment[]                              // Virtual: user ke comments (one-to-many)
  likes     Like[]                                 // Virtual: user ke likes (one-to-many)
  followers Follow[] @relation("following")        // Jo users is user ko follow karte hain
  following Follow[] @relation("follower")         // Jinhe ye user follow karta hai

  @@map("users")                                   // DB table ka naam "users"
}

model Post {
  id        Int      @id @default(autoincrement()) // Primary key
  content   String                                 // Post body text, required
  imageUrl  String?                                // Optional image attachment URL
  published Boolean  @default(true)               // Default mein visible
  createdAt DateTime @default(now())               // Creation timestamp
  updatedAt DateTime @updatedAt                    // Last-updated timestamp

  authorId  Int                                    // Foreign key -> users.id
  author    User     @relation(fields: [authorId], references: [id])  // User ka post
  comments  Comment[]                              // Virtual: post ke comments
  likes     Like[]                                 // Virtual: post ke likes
  tags      Tag[]                                  // Tag ke saath implicit many-to-many

  @@map("posts")                                   // DB table "posts"
  @@index([authorId])                              // authorId pe index fast user-post queries ke liye
}

model Follow {
  followerId  Int                                  // FK: follow karne wala user
  followingId Int                                  // FK: jise follow kiya ja raha hai
  createdAt   DateTime @default(now())             // Follow kab hua

  follower    User @relation("follower",  fields: [followerId],  references: [id])
  following   User @relation("following", fields: [followingId], references: [id])

  @@id([followerId, followingId])                  // Composite PK: har pair ka ek hi follow
  @@map("follows")                                 // DB table "follows"
}

model Comment {
  id        Int      @id @default(autoincrement()) // Primary key
  content   String                                 // Comment text
  createdAt DateTime @default(now())               // Creation timestamp

  authorId  Int                                    // FK: comment kisne likha
  postId    Int                                    // FK: kis post pe hai
  author    User     @relation(fields: [authorId], references: [id])
  post      Post     @relation(fields: [postId],   references: [id])

  @@map("comments")                                // DB table "comments"
}

model Like {
  userId    Int                                    // FK: kisne like kiya
  postId    Int                                    // FK: kya like kiya
  createdAt DateTime @default(now())               // Like kab hua

  user      User @relation(fields: [userId], references: [id])
  post      Post @relation(fields: [postId], references: [id])

  @@id([userId, postId])                           // Composite PK: har user-post ka ek hi like
  @@map("likes")                                   // DB table "likes"
}

model Tag {
  id    Int    @id @default(autoincrement())        // Primary key
  name  String @unique                              // Tag names unique hone chahiye
  posts Post[]                                      // Post ke saath implicit many-to-many

  @@map("tags")                                     // DB table "tags"
}
```

### Ye Schema Tumhe Code Mein Kya Deta Hai

`prisma generate` chalane ke baad, tumhe aisi queries milti hain:

```typescript
// Ek user uske saare posts aur har post ke tags ke saath fetch karo
const user = await prisma.user.findUnique({
  where: { email: "alice@example.com" },
  include: {
    posts: {
      include: { tags: true }
    }
  }
});

// Ek post create karo aur usse existing tags se ek hi operation mein connect karo
const post = await prisma.post.create({
  data: {
    content: "Hello Prisma!",
    authorId: 1,
    tags: { connect: [{ name: "prisma" }, { name: "typescript" }] }
  }
});

// Kisi doosre user ko follow karo (explicit junction model)
await prisma.follow.create({
  data: { followerId: 1, followingId: 2 }
});
```

In sabhi calls mein full type-safety hai — TypeScript ko exactly pata hota hai kaunse fields exist karte hain, kaunse optional hain, aur return shape kaisi dikhegi.

---

## 🗺️ Sahi ID Strategy Kaise Choose Karein

| Strategy | Prisma default | Kis ke liye best hai |
|---|---|---|
| `autoincrement()` | Int ya BigInt | Simple apps, chhoti tables, readable IDs |
| `uuid()` | String | Distributed systems, URLs mein expose hone waali IDs |
| `cuid()` | String | UUID jaisa hi, but time ke hisaab se sortable |
| Composite `@@id` | Multiple fields | Junction tables (Like, Follow) |

Ek important trade-off: `autoincrement()` chhoti, human-readable IDs deta hai (`1`, `2`, `42`) lekin ye row counts leak karti hain aur sequential hoti hain — jo security concern ban sakta hai agar IDs public URLs mein expose ho rahi hain (jaise koi pata laga le ki tumhare platform pe kitne total orders hue). `uuid()` aur `cuid()` opaque hote hain aur expose karne ke liye safe hote hain, lekin thoda zyada storage space lete hain.

---

## ✅ Key Takeaways

- `schema.prisma` mein teen blocks hote hain: `generator`, `datasource`, aur tumhare `model` definitions. Ye tumhare database structure ka single source of truth hai.
- Har model ko ek primary key chahiye — ya to single `@id` field, ya composite `@@id([...])`.
- `?` use karo optional (nullable) fields mark karne ke liye. Bina `?` waale fields required (NOT NULL) hote hain.
- `@relation` attribute hamesha us model pe hota hai jiske paas foreign key hai. Doosri side (virtual list jaise `Post[]`) sirf convenient querying ke liye hota hai.
- `@@map` aur `@map` tumhe clean TypeScript naming conventions follow karne dete hain, jabki actual database SQL naming conventions follow karta hai.
- Foreign key columns pe aur jin columns ko frequently filter karte ho unpe `@@index` add karo — production performance ke liye ye critical hai.
- Many-to-many relations ke liye, simplicity chahiye to Prisma ka implicit style use karo (dono sides pe sirf `Tag[]`), ya join pe extra fields chahiye to explicit junction model use karo.
- `@updatedAt` Prisma ki sabse convenient features mein se ek hai — timestamp khud set karna kabhi yaad nahi rakhna padta.

---

## 🧠 Quiz

**Question 1**

Tumhare paas ek `Product` model aur ek `Category` model hai. Ek product exactly ek category ka hota hai, aur ek category ke bahut saare products ho sakte hain. Foreign key kis field mein hogi, aur kaunse model pe?

<details>
<summary>Answer Dekho</summary>

Foreign key (`categoryId`) `Product` model pe rahegi — relation ki "many" side pe. `Category` model ke paas ek virtual `products Product[]` field hoga, jo actual database column nahi hota.

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

Single field pe `@unique` aur model-level `@@unique([field1, field2])` mein kya farak hai? Har ek ka ek real-world example do.

<details>
<summary>Answer Dekho</summary>

Single field pe `@unique` ka matlab hai ki sirf uss field ki value saari rows mein unique honi chahiye — jaise `email String @unique` ye ensure karta hai ki koi do users same email address share na karein.

`@@unique([field1, field2])` ka matlab hai dono fields ka **combination** unique hona chahiye, lekin har field individually repeat ho sakta hai. Real-world example: ek user ek product pe sirf ek hi review de sakta hai.

```prisma
model Review {
  userId    Int
  productId Int
  rating    Int
  @@unique([userId, productId])  // Har user-product pair ka ek hi review
}
```

Yahan `userId` 1, `productId` 5 aur `productId` 10 dono ko review kar sakta hai, lekin `productId` 5 ko do baar review nahi kar sakta.

</details>

---

**Question 3**

Social network schema mein, `Follow` model standalone `id Int @id` ki jagah `@@id([followerId, followingId])` use karta hai. Ye design choice achhi kyun hai, aur ye real-world mein kaunsa constraint enforce karta hai?

<details>
<summary>Answer Dekho</summary>

`(followerId, followingId)` pe composite primary key use karne se **database level** pe hi enforce ho jaata hai ki same follow relationship sirf ek hi baar exist kar sake. User 1, User 2 ko exactly ek hi baar follow kar sakta hai — duplicate row insert karne ki koshish primary key violation se fail ho jayegi.

Ek standalone auto-increment `id` hota to aise duplicate rows allow ho jaate:
```
id=1, followerId=1, followingId=2
id=2, followerId=1, followingId=2  ← duplicate, allowed!
```

`@@id([followerId, followingId])` ke saath, doosri row insert hi nahi hogi — matlab tumhe application-level checks likhe bina hi database level pe data integrity mil jaati hai, free mein.

</details>

---

*Next Chapter: Prisma Client — Apna Database Query Karna*
