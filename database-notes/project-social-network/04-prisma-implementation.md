# 🏗️ Social Network: Prisma Implementation

> **Chapter 04 — Project: Social Network**
> Building the full API layer with Prisma ORM and TypeScript

---

## 🗺️ Kya Banane Wale Hain?

Pichle chapters mein humne social network ka schema design kiya aur ORM kya hota hai woh samjha. Ab time hai sab kuch wire karne ka — actual production jaisa API layer khada karenge jo users, posts, feed, likes, comments, notifications, aur search — sab handle karega. Bilkul waisa hi jaisa Instagram ya kisi bhi real social platform ke peeche chalta hai.

Is chapter ka har function production-shaped hai. Errors handle karta hai, jahan paisa (yaani counters) involved hai wahan transactions use karta hai, aur end-to-end TypeScript mein typed hai.

---

## 📦 Project Setup

```bash
npm init -y
npm install prisma @prisma/client
npm install -D typescript ts-node @types/node
npx prisma init
```

Setup ke baad tumhara folder layout kuch aisa dikhega:

```
social-network/
├── prisma/
│   └── schema.prisma      ← data model yahin rehta hai
├── src/
│   ├── lib/
│   │   └── prisma.ts      ← shared client singleton
│   └── services/
│       ├── userService.ts
│       ├── feedService.ts
│       ├── postService.ts
│       ├── likeService.ts
│       ├── commentService.ts
│       ├── notificationService.ts
│       └── searchService.ts
└── tsconfig.json
```

---

## 🧱 Complete Prisma Schema

`prisma/schema.prisma` banao. Ye schema tumhara single source of truth hai — Prisma isko padhke tumhara type-safe client generate karta hai.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────
model User {
  id             Int       @id @default(autoincrement())
  username       String    @unique @db.VarChar(30)
  email          String    @unique
  passwordHash   String
  displayName    String    @db.VarChar(50)
  bio            String?   @db.VarChar(160)
  avatarUrl      String?
  isVerified     Boolean   @default(false)
  isPrivate      Boolean   @default(false)

  // Denormalized counters — transactions ke through sync mein rakhte hain
  followerCount  Int       @default(0)
  followingCount Int       @default(0)
  postCount      Int       @default(0)

  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  deletedAt      DateTime?

  // Relations
  posts          Post[]
  likes          Like[]
  comments       Comment[]

  // Follow graph (self-referential many-to-many)
  followers      Follow[]  @relation("following")
  following      Follow[]  @relation("follower")

  // Notifications
  notifications  Notification[] @relation("recipient")
  actedNotifs    Notification[] @relation("actor")

  @@index([username])
  @@index([email])
}

// ─────────────────────────────────────────────
// FOLLOWS
// ─────────────────────────────────────────────
model Follow {
  followerId  Int
  followingId Int
  createdAt   DateTime @default(now())

  follower    User @relation("follower",  fields: [followerId],  references: [id], onDelete: Cascade)
  following   User @relation("following", fields: [followingId], references: [id], onDelete: Cascade)

  @@id([followerId, followingId])   // composite PK duplicate follow rok deta hai
  @@index([followingId])
}

// ─────────────────────────────────────────────
// POSTS
// ─────────────────────────────────────────────
model Post {
  id           Int       @id @default(autoincrement())
  authorId     Int
  caption      String?   @db.VarChar(2200)
  imageUrls    String[]  // PostgreSQL native array
  likeCount    Int       @default(0)
  commentCount Int       @default(0)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  deletedAt    DateTime?

  author       User      @relation(fields: [authorId], references: [id], onDelete: Cascade)
  likes        Like[]
  comments     Comment[]
  hashtags     PostHashtag[]

  @@index([authorId, createdAt(sort: Desc)])
  @@index([createdAt(sort: Desc)])
}

// ─────────────────────────────────────────────
// HASHTAGS
// ─────────────────────────────────────────────
model Hashtag {
  id        Int       @id @default(autoincrement())
  tag       String    @unique @db.VarChar(100)
  postCount Int       @default(0)
  posts     PostHashtag[]

  @@index([tag])
}

model PostHashtag {
  postId    Int
  hashtagId Int
  post      Post    @relation(fields: [postId],    references: [id], onDelete: Cascade)
  hashtag   Hashtag @relation(fields: [hashtagId], references: [id])

  @@id([postId, hashtagId])
}

// ─────────────────────────────────────────────
// LIKES
// ─────────────────────────────────────────────
model Like {
  userId    Int
  postId    Int
  createdAt DateTime @default(now())

  user      User @relation(fields: [userId], references: [id], onDelete: Cascade)
  post      Post @relation(fields: [postId], references: [id], onDelete: Cascade)

  @@id([userId, postId])
  @@index([postId])
}

// ─────────────────────────────────────────────
// COMMENTS
// ─────────────────────────────────────────────
model Comment {
  id        Int       @id @default(autoincrement())
  postId    Int
  authorId  Int
  parentId  Int?      // null = top-level; non-null = reply
  content   String    @db.VarChar(500)
  likeCount Int       @default(0)
  createdAt DateTime  @default(now())
  deletedAt DateTime?

  post      Post      @relation(fields: [postId],   references: [id], onDelete: Cascade)
  author    User      @relation(fields: [authorId], references: [id], onDelete: Cascade)
  parent    Comment?  @relation("replies", fields: [parentId], references: [id])
  replies   Comment[] @relation("replies")

  @@index([postId, createdAt(sort: Asc)])
  @@index([parentId])
}

// ─────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────
enum NotificationType {
  follow
  like
  comment
  reply
  mention
}

model Notification {
  id        Int              @id @default(autoincrement())
  userId    Int              // recipient
  actorId   Int              // kisne trigger kiya
  type      NotificationType
  postId    Int?
  commentId Int?
  isRead    Boolean          @default(false)
  createdAt DateTime         @default(now())

  user      User @relation("recipient", fields: [userId],   references: [id], onDelete: Cascade)
  actor     User @relation("actor",     fields: [actorId],  references: [id], onDelete: Cascade)

  @@index([userId, isRead, createdAt(sort: Desc)])
}
```

Schema likhne ke baad:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

---

## 🔗 Shared Prisma Client Singleton

Hamesha ek hi `PrismaClient` instance use karo. Node.js mein multiple instances banaoge toh har ek apna alag connection pool khol lega — wasteful hai, aur serverless environments mein toh kabhi kabhi fatal bhi ho sakta hai.

Socho tumhare paas Zomato ka delivery-fleet hai — har baar naya order aane pe agar naya delivery hub khol do, toh resources waste honge aur system crash ho jaayega. Isliye ek fixed pool rakho, jise sab services share karein.

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'warn', 'error']
      : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

Is `prisma` object ko har jagah import karo — dobara kabhi `new PrismaClient()` mat likhna.

---

## 👤 User Service

```typescript
// src/services/userService.ts
import { prisma } from '../lib/prisma'

// ── Public profile nikalo ──────────────────────────────────────────────────
export async function getUserProfile(username: string) {
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
      isVerified: true,
      isPrivate: true,
      followerCount: true,
      followingCount: true,
      postCount: true,
      createdAt: true,
      // Latest 12 posts include karo (grid view ke liye)
      posts: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 12,
        select: {
          id: true,
          imageUrls: true,
          likeCount: true,
          commentCount: true,
        },
      },
    },
  })

  if (!user) throw new Error('User not found')
  return user
}

// ── Follow karna — atomic transaction ───────────────────────────────────
export async function followUser(followerId: number, followingId: number) {
  if (followerId === followingId) {
    throw new Error('Cannot follow yourself')
  }

  // Check karo ki follow pehle se toh nahi hai
  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
  })
  if (existing) throw new Error('Already following this user')

  // Chaaron writes ya toh sab succeed karenge, ya sab rollback
  await prisma.$transaction([
    prisma.follow.create({ data: { followerId, followingId } }),
    prisma.user.update({
      where: { id: followingId },
      data: { followerCount: { increment: 1 } },
    }),
    prisma.user.update({
      where: { id: followerId },
      data: { followingCount: { increment: 1 } },
    }),
    prisma.notification.create({
      data: {
        userId: followingId,
        actorId: followerId,
        type: 'follow',
      },
    }),
  ])
}

// ── Unfollow karna — atomic transaction ─────────────────────────────────
export async function unfollowUser(followerId: number, followingId: number) {
  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
  })
  if (!existing) throw new Error('Not following this user')

  await prisma.$transaction([
    prisma.follow.delete({
      where: { followerId_followingId: { followerId, followingId } },
    }),
    prisma.user.update({
      where: { id: followingId },
      data: { followerCount: { decrement: 1 } },
    }),
    prisma.user.update({
      where: { id: followerId },
      data: { followingCount: { decrement: 1 } },
    }),
  ])
}

// ── Followers / Following list ───────────────────────────────────────────
export async function getFollowers(userId: number, page = 1, limit = 20) {
  const skip = (page - 1) * limit
  const follows = await prisma.follow.findMany({
    where: { followingId: userId },
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
    select: {
      follower: {
        select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true },
      },
    },
  })
  return follows.map((f) => f.follower)
}

export async function getFollowing(userId: number, page = 1, limit = 20) {
  const skip = (page - 1) * limit
  const follows = await prisma.follow.findMany({
    where: { followerId: userId },
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
    select: {
      following: {
        select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true },
      },
    },
  })
  return follows.map((f) => f.following)
}
```

**Transaction kyun zaruri hai?** Isके bina, `follow.create` succeed ho jaata aur uske turant baad agar server crash ho jaaye, toh `followerCount` increment hi nahi hota. Result — ek corrupt counter, jisme kitna drift hua ye pata karne ka koi reliable tareeka nahi bachta. Bilkul waisa jaise UPI transaction mein paisa deduct ho gaya par receiver ke account mein credit hi nahi hua — dono steps ek saath hone chahiye, nahi toh gadbad guaranteed hai.

---

## 📰 Feed Service

Home feed un accounts ke posts dikhata hai jinko tum follow karte ho, newest-first, cursor-based pagination ke saath (real-time content ke liye offset pagination se kahi better).

```typescript
// src/services/feedService.ts
import { prisma } from '../lib/prisma'

interface FeedOptions {
  userId: number
  cursor?: number   // last seen post ID
  limit?: number
}

export async function getHomeFeed({ userId, cursor, limit = 20 }: FeedOptions) {
  // Step 1: current user kisko follow karta hai unke IDs nikalo
  const follows = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  })
  const followingIds = follows.map((f) => f.followingId)

  if (followingIds.length === 0) {
    return { posts: [], nextCursor: null }
  }

  // Step 2: un accounts ke posts fetch karo
  const posts = await prisma.post.findMany({
    where: {
      authorId: { in: followingIds },
      deletedAt: null,
      // Cursor: sirf woh posts jo cursor se purane (lower ID) hain
      ...(cursor ? { id: { lt: cursor } } : {}),
    },
    orderBy: { id: 'desc' },   // newest first; ID order hi time order ke barabar hai
    take: limit + 1,           // ek extra fetch karo taaki pata chale next page hai ya nahi
    select: {
      id: true,
      caption: true,
      imageUrls: true,
      likeCount: true,
      commentCount: true,
      createdAt: true,
      author: {
        select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true },
      },
    },
  })

  // Step 3: next cursor decide karo
  const hasMore = posts.length > limit
  const items = hasMore ? posts.slice(0, limit) : posts
  const nextCursor = hasMore ? items[items.length - 1].id : null

  return { posts: items, nextCursor }
}

// Explore feed — sabke recent posts (public accounts ke)
export async function getExploreFeed(cursor?: number, limit = 20) {
  const posts = await prisma.post.findMany({
    where: {
      deletedAt: null,
      author: { isPrivate: false },
      ...(cursor ? { id: { lt: cursor } } : {}),
    },
    orderBy: { id: 'desc' },
    take: limit + 1,
    select: {
      id: true,
      imageUrls: true,
      likeCount: true,
      commentCount: true,
      author: {
        select: { id: true, username: true, avatarUrl: true },
      },
    },
  })

  const hasMore = posts.length > limit
  const items = hasMore ? posts.slice(0, limit) : posts
  return { posts: items, nextCursor: hasMore ? items[items.length - 1].id : null }
}
```

**Cursor vs offset:** Offset pagination (`SKIP 40`) har request pe index ko shuru se scan karta hai, aur jab beech mein scroll karte waqt naya content insert hota hai toh duplicate ya missing posts dikhne lagte hain. Socho Swiggy pe scroll kar rahe ho aur beech mein naya restaurant add ho gaya — offset pagination se tumhe wahi item do baar dikh sakta hai. Cursor pagination hamesha index mein ek known position se shuru hota hai — bahut fast aur consistent.

---

## 📸 Post Service

```typescript
// src/services/postService.ts
import { prisma } from '../lib/prisma'

// ── Caption text se hashtags nikalo ───────────────────────────────────
function extractHashtags(text: string): string[] {
  const matches = text.match(/#[\w]+/g) ?? []
  // Duplicate hatao aur lowercase mein normalize karo
  return [...new Set(matches.map((tag) => tag.slice(1).toLowerCase()))]
}

// ── Post create karna ─────────────────────────────────────────────────────
export async function createPost(
  authorId: number,
  imageUrls: string[],
  caption?: string
) {
  if (imageUrls.length === 0) throw new Error('A post must have at least one image')
  if (imageUrls.length > 10) throw new Error('Maximum 10 images per post')

  const tags = caption ? extractHashtags(caption) : []

  const post = await prisma.$transaction(async (tx) => {
    // 1. Post create karo
    const newPost = await tx.post.create({
      data: { authorId, imageUrls, caption },
    })

    // 2. User ka post count increment karo
    await tx.user.update({
      where: { id: authorId },
      data: { postCount: { increment: 1 } },
    })

    // 3. Hashtags upsert karo aur post se link karo
    for (const tag of tags) {
      const hashtag = await tx.hashtag.upsert({
        where: { tag },
        create: { tag, postCount: 1 },
        update: { postCount: { increment: 1 } },
      })
      await tx.postHashtag.create({
        data: { postId: newPost.id, hashtagId: hashtag.id },
      })
    }

    return newPost
  })

  return post
}

// ── Ek post ko comments ke saath fetch karo ──────────────────────────────
export async function getPost(postId: number) {
  const post = await prisma.post.findUnique({
    where: { id: postId, deletedAt: null },
    include: {
      author: {
        select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true },
      },
      hashtags: {
        select: { hashtag: { select: { tag: true } } },
      },
      comments: {
        where: { parentId: null, deletedAt: null },
        orderBy: { createdAt: 'asc' },
        take: 20,
        include: {
          author: {
            select: { id: true, username: true, avatarUrl: true },
          },
          replies: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'asc' },
            take: 3,
            include: {
              author: { select: { id: true, username: true, avatarUrl: true } },
            },
          },
        },
      },
    },
  })

  if (!post) throw new Error('Post not found')
  return post
}

// ── Post soft delete karna ────────────────────────────────────────────────
export async function deletePost(postId: number, requesterId: number) {
  const post = await prisma.post.findUnique({ where: { id: postId } })
  if (!post) throw new Error('Post not found')
  if (post.authorId !== requesterId) throw new Error('Not authorised')
  if (post.deletedAt) throw new Error('Post already deleted')

  await prisma.$transaction(async (tx) => {
    // Post ko soft-delete karo
    await tx.post.update({
      where: { id: postId },
      data: { deletedAt: new Date() },
    })

    // Author ka post count decrement karo
    await tx.user.update({
      where: { id: post.authorId },
      data: { postCount: { decrement: 1 } },
    })

    // Hashtag counters decrement karo
    const postHashtags = await tx.postHashtag.findMany({
      where: { postId },
      select: { hashtagId: true },
    })
    for (const { hashtagId } of postHashtags) {
      await tx.hashtag.update({
        where: { id: hashtagId },
        data: { postCount: { decrement: 1 } },
      })
    }
  })
}
```

**`upsert` hashtags ke liye kyun?** Do users ek saath `#sunset` post kar sakte hain. Ek plain `findOrCreate` pattern (pehle find, phir create) mein race condition hai — dono ko kuch nahi milta, dono create karne ki koshish karte hain, aur unique constraint error aa jaata hai. Socho ek hi coupon code do log ek saath IRCTC pe apply kar rahe hain — jo `upsert` karta hai woh race resolution ko database ke andar hi daal deta hai, jahan ye handle hona chahiye.

---

## ❤️ Like Service

```typescript
// src/services/likeService.ts
import { prisma } from '../lib/prisma'

// ── Like toggle karo (like nahi kiya toh like, kiya hai toh unlike) ──────────────
export async function toggleLike(userId: number, postId: number) {
  const existing = await prisma.like.findUnique({
    where: { userId_postId: { userId, postId } },
  })

  if (existing) {
    // Unlike
    await prisma.$transaction([
      prisma.like.delete({ where: { userId_postId: { userId, postId } } }),
      prisma.post.update({
        where: { id: postId },
        data: { likeCount: { decrement: 1 } },
      }),
    ])
    return { liked: false }
  } else {
    // Like + post author ko notify karo
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    })
    if (!post || post.deletedAt !== null) throw new Error('Post not found')

    await prisma.$transaction(async (tx) => {
      await tx.like.create({ data: { userId, postId } })
      await tx.post.update({
        where: { id: postId },
        data: { likeCount: { increment: 1 } },
      })
      // Sirf tab notify karo jab liker khud author na ho
      if (post.authorId !== userId) {
        await tx.notification.create({
          data: {
            userId: post.authorId,
            actorId: userId,
            type: 'like',
            postId,
          },
        })
      }
    })
    return { liked: true }
  }
}

// ── Post ko kisne like kiya, woh users fetch karo ──────────────────────────────────
export async function getPostLikers(postId: number, cursor?: number, limit = 20) {
  const likes = await prisma.like.findMany({
    where: {
      postId,
      ...(cursor ? { userId: { lt: cursor } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    select: {
      user: {
        select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true },
      },
    },
  })

  const hasMore = likes.length > limit
  const items = hasMore ? likes.slice(0, limit) : likes
  return {
    users: items.map((l) => l.user),
    nextCursor: hasMore ? items[items.length - 1].user.id : null,
  }
}
```

---

## 💬 Comment Service

```typescript
// src/services/commentService.ts
import { prisma } from '../lib/prisma'

// ── Top-level comment ya reply create karo ─────────────────────────────────
export async function createComment(
  postId: number,
  authorId: number,
  content: string,
  parentId?: number   // reply karna hai toh existing comment ki ID do
) {
  if (content.trim().length === 0) throw new Error('Comment cannot be empty')
  if (content.length > 500) throw new Error('Comment too long (max 500 characters)')

  // Agar reply hai, toh verify karo parent isi post ka hai
  if (parentId) {
    const parent = await prisma.comment.findUnique({ where: { id: parentId } })
    if (!parent || parent.postId !== postId) throw new Error('Parent comment not found')
    if (parent.parentId !== null) throw new Error('Cannot reply to a reply (max nesting = 1)')
  }

  const post = await prisma.post.findUnique({
    where: { id: postId, deletedAt: null },
    select: { authorId: true },
  })
  if (!post) throw new Error('Post not found')

  const comment = await prisma.$transaction(async (tx) => {
    const newComment = await tx.comment.create({
      data: { postId, authorId, content, parentId },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true } },
      },
    })

    // Post ka comment counter increment karo
    await tx.post.update({
      where: { id: postId },
      data: { commentCount: { increment: 1 } },
    })

    // Post author ko notify karo (agar commenter aur author alag hain)
    if (post.authorId !== authorId) {
      await tx.notification.create({
        data: {
          userId: post.authorId,
          actorId: authorId,
          type: parentId ? 'reply' : 'comment',
          postId,
          commentId: newComment.id,
        },
      })
    }

    // Ye reply hai toh parent comment ke author ko bhi notify karo
    if (parentId) {
      const parent = await tx.comment.findUnique({
        where: { id: parentId },
        select: { authorId: true },
      })
      if (parent && parent.authorId !== authorId && parent.authorId !== post.authorId) {
        await tx.notification.create({
          data: {
            userId: parent.authorId,
            actorId: authorId,
            type: 'reply',
            postId,
            commentId: newComment.id,
          },
        })
      }
    }

    return newComment
  })

  return comment
}

// ── Comment soft delete karna ─────────────────────────────────────────────────
export async function deleteComment(commentId: number, requesterId: number) {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } })
  if (!comment || comment.deletedAt) throw new Error('Comment not found')
  if (comment.authorId !== requesterId) throw new Error('Not authorised')

  await prisma.$transaction([
    prisma.comment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    }),
    prisma.post.update({
      where: { id: comment.postId },
      data: { commentCount: { decrement: 1 } },
    }),
  ])
}

// ── Post ke comments fetch karo (sirf top-level, reply count ke saath) ────────────
export async function getComments(postId: number, cursor?: number, limit = 20) {
  const comments = await prisma.comment.findMany({
    where: {
      postId,
      parentId: null,
      deletedAt: null,
      ...(cursor ? { id: { gt: cursor } } : {}),
    },
    orderBy: { createdAt: 'asc' },
    take: limit + 1,
    include: {
      author: { select: { id: true, username: true, avatarUrl: true } },
      _count: { select: { replies: true } },
    },
  })

  const hasMore = comments.length > limit
  const items = hasMore ? comments.slice(0, limit) : comments
  return {
    comments: items,
    nextCursor: hasMore ? items[items.length - 1].id : null,
  }
}

// ── Ek comment ke replies fetch karo ─────────────────────────────────
export async function getReplies(parentId: number) {
  return prisma.comment.findMany({
    where: { parentId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
    include: {
      author: { select: { id: true, username: true, avatarUrl: true } },
    },
  })
}
```

---

## 🔔 Notification Service

```typescript
// src/services/notificationService.ts
import { prisma } from '../lib/prisma'
import { NotificationType } from '@prisma/client'

// ── User ke notifications fetch karo ────────────────────────────────────
export async function getNotifications(
  userId: number,
  cursor?: number,
  limit = 30
) {
  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      ...(cursor ? { id: { lt: cursor } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    include: {
      actor: {
        select: { id: true, username: true, avatarUrl: true, isVerified: true },
      },
    },
  })

  const hasMore = notifications.length > limit
  const items = hasMore ? notifications.slice(0, limit) : notifications
  return {
    notifications: items,
    nextCursor: hasMore ? items[items.length - 1].id : null,
    unreadCount: items.filter((n) => !n.isRead).length,
  }
}

// ── Ek notification read mark karo ───────────────────────────────
export async function markRead(notificationId: number, userId: number) {
  const notif = await prisma.notification.findUnique({
    where: { id: notificationId },
  })
  if (!notif || notif.userId !== userId) throw new Error('Notification not found')

  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  })
}

// ── SAB notifications read mark karo ────────────────────────────────
export async function markAllRead(userId: number) {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  })
  return { updated: result.count }
}

// ── Unread notifications count karo ─────────────────────────────────────────────
export async function getUnreadCount(userId: number): Promise<number> {
  return prisma.notification.count({
    where: { userId, isRead: false },
  })
}

// ── Manually notification create karo (dusre services internally isko use karte hain) ────
export async function createNotification(data: {
  userId: number
  actorId: number
  type: NotificationType
  postId?: number
  commentId?: number
}) {
  // Khud ke actions pe khud ko notify mat karo
  if (data.userId === data.actorId) return null

  return prisma.notification.create({ data })
}
```

---

## 🔍 Search Service

```typescript
// src/services/searchService.ts
import { prisma } from '../lib/prisma'

// ── User search ───────────────────────────────────────────────────────────
export async function searchUsers(query: string, limit = 20) {
  if (query.trim().length < 2) throw new Error('Search query too short')

  const term = query.trim().toLowerCase()

  // Prisma ka `contains` with `mode: 'insensitive'` use karo (PostgreSQL mein ILIKE ban jaata hai)
  return prisma.user.findMany({
    where: {
      deletedAt: null,
      OR: [
        { username: { contains: term, mode: 'insensitive' } },
        { displayName: { contains: term, mode: 'insensitive' } },
      ],
    },
    orderBy: [
      // Verified/popular users ko upar rakhke exact-match prioritize karo
      { isVerified: 'desc' },
      { followerCount: 'desc' },
    ],
    take: limit,
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      isVerified: true,
      followerCount: true,
    },
  })
}

// ── Hashtag / post search ─────────────────────────────────────────────────
export async function searchByHashtag(
  tag: string,
  cursor?: number,
  limit = 20
) {
  const normalised = tag.replace(/^#/, '').toLowerCase()

  const hashtag = await prisma.hashtag.findUnique({
    where: { tag: normalised },
    select: { id: true, postCount: true },
  })

  if (!hashtag) return { posts: [], nextCursor: null, totalPosts: 0 }

  const postHashtags = await prisma.postHashtag.findMany({
    where: {
      hashtagId: hashtag.id,
      post: { deletedAt: null, author: { isPrivate: false } },
      ...(cursor ? { postId: { lt: cursor } } : {}),
    },
    orderBy: { postId: 'desc' },
    take: limit + 1,
    select: {
      post: {
        select: {
          id: true,
          imageUrls: true,
          likeCount: true,
          commentCount: true,
          author: { select: { id: true, username: true, avatarUrl: true } },
        },
      },
    },
  })

  const hasMore = postHashtags.length > limit
  const items = hasMore ? postHashtags.slice(0, limit) : postHashtags
  return {
    posts: items.map((ph) => ph.post),
    nextCursor: hasMore ? items[items.length - 1].post.id : null,
    totalPosts: hashtag.postCount,
  }
}

// ── Full-text caption search (sirf PostgreSQL) ────────────────────────────
export async function searchPosts(query: string, cursor?: number, limit = 20) {
  if (query.trim().length < 3) throw new Error('Search query too short')

  // Prisma raw query, PostgreSQL full-text search ke liye
  // ts_rank results ko relevance ke hisaab se order karta hai
  const posts = await prisma.$queryRaw<
    Array<{ id: number; caption: string; imageUrls: string[]; likeCount: number }>
  >`
    SELECT
      p.id,
      p.caption,
      p."imageUrls",
      p."likeCount",
      p."commentCount",
      ts_rank(to_tsvector('english', COALESCE(p.caption, '')), plainto_tsquery('english', ${query})) AS rank
    FROM "Post" p
    JOIN "User" u ON u.id = p."authorId"
    WHERE
      p."deletedAt" IS NULL
      AND u."isPrivate" = false
      AND to_tsvector('english', COALESCE(p.caption, '')) @@ plainto_tsquery('english', ${query})
      ${cursor ? prisma.$queryRaw`AND p.id < ${cursor}` : prisma.$queryRaw``}
    ORDER BY rank DESC, p.id DESC
    LIMIT ${limit + 1}
  `

  const hasMore = posts.length > limit
  const items = hasMore ? posts.slice(0, limit) : posts
  return {
    posts: items,
    nextCursor: hasMore ? items[items.length - 1].id : null,
  }
}
```

> [!info]
> **Full-text search pe note:** Ye raw SQL query PostgreSQL ke native `tsvector`/`tsquery` ka use karti hai, jo Prisma abhi apne type-safe API ke through expose nahi karta. Simpler setups ke liye `contains: { mode: 'insensitive' }` use karo — kaam toh karta hai, lekin `LIKE '%term%'` chalata hai jo regular index use nahi kar paata. Scale ke liye GIN index add karo: `CREATE INDEX ON "Post" USING gin(to_tsvector('english', caption));`

---

## ⚡ Har Service Mein Use Kiye Gaye Key Patterns

| Pattern | Kahan | Kyun |
|---|---|---|
| `$transaction([...])` | Follow, like, comment | Counters aur relationship data ko sync mein guarantee karta hai |
| `$transaction(async tx => ...)` | Post create, delete | Transaction ke andar conditional logic allow karta hai |
| Soft delete (`deletedAt`) | Post, comment, user | Audit/recovery ke liye data preserve karta hai; `where: { deletedAt: null }` se filter |
| Cursor pagination | Feed, notifications | Naya content insert hone par bhi stable pages; index-friendly |
| `include` ke bajaye `select` | Profile, feed | Sirf woh columns fetch karo jo client ko actually bhejne hain |
| `upsert` | Hashtag creation | Concurrent inserts ko unique constraint crash ke bina handle karta hai |
| Singleton `PrismaClient` | `lib/prisma.ts` | Sab services mein ek hi connection pool share hota hai |

---

## 🏁 Practically Migrations Chalana

```bash
# Pehli baar setup
npx prisma migrate dev --name init

# schema.prisma edit karne ke baad
npx prisma migrate dev --name add_bookmarks

# Production deploy (koi prompt nahi, koi shadow DB nahi)
npx prisma migrate deploy

# Browser UI mein current DB inspect karo
npx prisma studio
```

---

## 🔑 Key Takeaways

1. **Counters ke liye transactions optional nahi hain.** Har like, follow, aur comment ek join table aur ek denormalized counter — dono ko touch karta hai. Agar ye do writes transaction mein nahi hain, toh drift hoga, aur ye drift silent aur cumulative hota hai.

2. **Feeds ke liye cursor pagination, offset pagination se better hai.** Offset shuru se index re-scan karta hai aur live data pe duplicates deta hai. Cursor pagination O(1) hai, chahe list mein kitna bhi deep ho.

3. **Soft deletes referential integrity preserve karte hain.** Hard delete cascade hoke us post se juде likes/comments hata deta hai. Soft delete (`deletedAt = now()`) foreign keys intact rakhta hai aur zarurat pade toh content restore kar sakte ho.

4. **`select` tumhare responses lean rakhta hai.** Prisma agar `include` bina nested `select` ke use karoge, toh `SELECT *` kar dega. Explicit raho — tumhara API surface waisa hi hona chahiye jaisa client actually render karta hai.

5. **`upsert` hi find-or-create ke liye sahi tool hai.** Koi bhi naive `findFirst → create` flow concurrent environment mein race condition rakhta hai. Conflict resolution database ke andar push karo.

6. **Har process mein ek hi `PrismaClient` instance.** Connection pools expensive hote hain. `lib/prisma.ts` ka singleton pattern especially Next.js jaise runtimes mein important hai jo development ke time modules hot-reload karte hain.

7. **`$queryRaw` tumhara escape hatch hai.** Prisma ka type-safe API 95% use cases cover karta hai. Full-text search ranking (`ts_rank`), window functions, ya CTEs jaisi cheezon ke liye raw SQL pe jao — lekin usko apne alag function mein isolate rakho taaki baaki codebase type-safe bana rahe.

---

*Next chapter: Authentication middleware, rate limiting add karenge, aur in services ko Express ya Next.js API router mein wire karenge.*
