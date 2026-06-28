# 🏗️ Social Network: Prisma Implementation

> **Chapter 04 — Project: Social Network**
> Building the full API layer with Prisma ORM and TypeScript

---

## 🗺️ What We Are Building

In the previous chapters we designed the social network schema and learned what ORMs are. Now we wire everything together. By the end of this chapter you will have a complete, working service layer that handles users, posts, feeds, likes, comments, notifications, and search — the same moving parts found in any real social platform.

Every function in this chapter is production-shaped. It handles errors, uses transactions where money matters (counter integrity), and is typed end-to-end with TypeScript.

---

## 📦 Project Setup

```bash
npm init -y
npm install prisma @prisma/client
npm install -D typescript ts-node @types/node
npx prisma init
```

Your folder layout after setup:

```
social-network/
├── prisma/
│   └── schema.prisma      ← data model lives here
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

## 🧱 The Complete Prisma Schema

Create `prisma/schema.prisma`. This schema is the single source of truth — Prisma reads it to generate your type-safe client.

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

  // Denormalized counters — kept in sync via transactions
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

  @@id([followerId, followingId])   // composite PK prevents duplicates
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
  actorId   Int              // who triggered it
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

After writing the schema:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

---

## 🔗 Shared Prisma Client Singleton

Always use a single `PrismaClient` instance. Multiple instances in Node.js each open their own connection pool — wasteful and sometimes fatal in serverless environments.

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

Import this `prisma` object everywhere — never `new PrismaClient()` again.

---

## 👤 User Service

```typescript
// src/services/userService.ts
import { prisma } from '../lib/prisma'

// ── Get a public profile ──────────────────────────────────────────────────
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
      // Include latest 12 posts (grid view)
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

// ── Follow a user — atomic transaction ───────────────────────────────────
export async function followUser(followerId: number, followingId: number) {
  if (followerId === followingId) {
    throw new Error('Cannot follow yourself')
  }

  // Check the follow does not already exist
  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
  })
  if (existing) throw new Error('Already following this user')

  // All four writes succeed or all four roll back
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

// ── Unfollow a user — atomic transaction ─────────────────────────────────
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

// ── Followers / Following lists ───────────────────────────────────────────
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

**Why the transaction?** Without it, the `follow.create` could succeed and then the server could crash before incrementing `followerCount`. You would have a corrupt counter with no reliable way to know how far it drifted.

---

## 📰 Feed Service

The home feed shows posts from accounts you follow, newest first, with cursor-based pagination (better for real-time content than offset pagination).

```typescript
// src/services/feedService.ts
import { prisma } from '../lib/prisma'

interface FeedOptions {
  userId: number
  cursor?: number   // last seen post ID
  limit?: number
}

export async function getHomeFeed({ userId, cursor, limit = 20 }: FeedOptions) {
  // Step 1: get IDs of everyone the current user follows
  const follows = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  })
  const followingIds = follows.map((f) => f.followingId)

  if (followingIds.length === 0) {
    return { posts: [], nextCursor: null }
  }

  // Step 2: fetch posts from those accounts
  const posts = await prisma.post.findMany({
    where: {
      authorId: { in: followingIds },
      deletedAt: null,
      // Cursor: only fetch posts older than (lower ID than) the cursor
      ...(cursor ? { id: { lt: cursor } } : {}),
    },
    orderBy: { id: 'desc' },   // newest first; ID order matches time order
    take: limit + 1,           // fetch one extra to know if there is a next page
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

  // Step 3: determine next cursor
  const hasMore = posts.length > limit
  const items = hasMore ? posts.slice(0, limit) : posts
  const nextCursor = hasMore ? items[items.length - 1].id : null

  return { posts: items, nextCursor }
}

// Explore feed — recent posts from everyone (public accounts)
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

**Cursor vs offset:** Offset pagination (`SKIP 40`) re-scans the beginning of the index on every request and produces duplicate or missing posts when new content is inserted mid-scroll. Cursor pagination always starts from a known position in the index — much faster and consistent.

---

## 📸 Post Service

```typescript
// src/services/postService.ts
import { prisma } from '../lib/prisma'

// ── Extract hashtags from caption text ───────────────────────────────────
function extractHashtags(text: string): string[] {
  const matches = text.match(/#[\w]+/g) ?? []
  // Deduplicate and normalise to lowercase
  return [...new Set(matches.map((tag) => tag.slice(1).toLowerCase()))]
}

// ── Create a post ─────────────────────────────────────────────────────────
export async function createPost(
  authorId: number,
  imageUrls: string[],
  caption?: string
) {
  if (imageUrls.length === 0) throw new Error('A post must have at least one image')
  if (imageUrls.length > 10) throw new Error('Maximum 10 images per post')

  const tags = caption ? extractHashtags(caption) : []

  const post = await prisma.$transaction(async (tx) => {
    // 1. Create the post
    const newPost = await tx.post.create({
      data: { authorId, imageUrls, caption },
    })

    // 2. Increment user's post count
    await tx.user.update({
      where: { id: authorId },
      data: { postCount: { increment: 1 } },
    })

    // 3. Upsert hashtags and link them to the post
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

// ── Get a single post with comments ──────────────────────────────────────
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

// ── Soft delete a post ────────────────────────────────────────────────────
export async function deletePost(postId: number, requesterId: number) {
  const post = await prisma.post.findUnique({ where: { id: postId } })
  if (!post) throw new Error('Post not found')
  if (post.authorId !== requesterId) throw new Error('Not authorised')
  if (post.deletedAt) throw new Error('Post already deleted')

  await prisma.$transaction(async (tx) => {
    // Soft-delete the post
    await tx.post.update({
      where: { id: postId },
      data: { deletedAt: new Date() },
    })

    // Decrement author's post count
    await tx.user.update({
      where: { id: post.authorId },
      data: { postCount: { decrement: 1 } },
    })

    // Decrement hashtag counters
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

**Why `upsert` for hashtags?** Two users might post `#sunset` simultaneously. A plain `findOrCreate` pattern (find → create) has a race condition: both find nothing and then both try to create, causing a unique constraint error. `upsert` pushes the race resolution into the database where it belongs.

---

## ❤️ Like Service

```typescript
// src/services/likeService.ts
import { prisma } from '../lib/prisma'

// ── Toggle like (like if not liked, unlike if already liked) ──────────────
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
    // Like + notify the post author
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
      // Only notify if the liker is not the author
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

// ── Fetch users who liked a post ──────────────────────────────────────────
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

// ── Create a top-level comment or a reply ─────────────────────────────────
export async function createComment(
  postId: number,
  authorId: number,
  content: string,
  parentId?: number   // provide to reply to an existing comment
) {
  if (content.trim().length === 0) throw new Error('Comment cannot be empty')
  if (content.length > 500) throw new Error('Comment too long (max 500 characters)')

  // If replying, verify the parent belongs to this post
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

    // Increment post comment counter
    await tx.post.update({
      where: { id: postId },
      data: { commentCount: { increment: 1 } },
    })

    // Notify the post author (if commenter !== author)
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

    // If this is a reply, also notify the parent comment author
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

// ── Soft delete a comment ─────────────────────────────────────────────────
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

// ── Get comments for a post (top-level only, with reply count) ────────────
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

// ── Get replies for a comment ─────────────────────────────────────────────
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

// ── Fetch notifications for a user ────────────────────────────────────────
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

// ── Mark a single notification as read ───────────────────────────────────
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

// ── Mark ALL notifications as read ────────────────────────────────────────
export async function markAllRead(userId: number) {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  })
  return { updated: result.count }
}

// ── Count unread notifications ─────────────────────────────────────────────
export async function getUnreadCount(userId: number): Promise<number> {
  return prisma.notification.count({
    where: { userId, isRead: false },
  })
}

// ── Manually create a notification (used by other services internally) ────
export async function createNotification(data: {
  userId: number
  actorId: number
  type: NotificationType
  postId?: number
  commentId?: number
}) {
  // Avoid notifying someone about their own actions
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

  // Use Prisma's `contains` with `mode: 'insensitive'` (maps to ILIKE in PostgreSQL)
  return prisma.user.findMany({
    where: {
      deletedAt: null,
      OR: [
        { username: { contains: term, mode: 'insensitive' } },
        { displayName: { contains: term, mode: 'insensitive' } },
      ],
    },
    orderBy: [
      // Prioritise exact prefix matches by putting verified/popular users first
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

// ── Full-text caption search (PostgreSQL only) ────────────────────────────
export async function searchPosts(query: string, cursor?: number, limit = 20) {
  if (query.trim().length < 3) throw new Error('Search query too short')

  // Prisma raw query for PostgreSQL full-text search
  // ts_rank orders results by relevance
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

**Note on full-text search:** The raw SQL query uses PostgreSQL's native `tsvector`/`tsquery` which Prisma does not yet expose through its type-safe API. For simpler setups use `contains: { mode: 'insensitive' }` — it works but does a `LIKE '%term%'` which cannot use a regular index. For scale, add a GIN index: `CREATE INDEX ON "Post" USING gin(to_tsvector('english', caption));`

---

## ⚡ Key Patterns You Used in Every Service

| Pattern | Where | Why |
|---|---|---|
| `$transaction([...])` | Follow, like, comment | Guarantees counters stay in sync with relationship data |
| `$transaction(async tx => ...)` | Create post, delete | Allows conditional logic inside the transaction |
| Soft delete (`deletedAt`) | Post, comment, user | Preserves data for audit / recovery; filters via `where: { deletedAt: null }` |
| Cursor pagination | Feed, notifications | Stable pages even when new content is inserted; index-friendly |
| `select` over `include` | Profile, feed | Only fetch columns you actually send to the client |
| `upsert` | Hashtag creation | Handles concurrent inserts without unique constraint crashes |
| Singleton `PrismaClient` | `lib/prisma.ts` | One connection pool shared across all services |

---

## 🏁 Running Migrations in Practice

```bash
# First time setup
npx prisma migrate dev --name init

# After editing schema.prisma
npx prisma migrate dev --name add_bookmarks

# Production deploy (no prompt, no shadow DB)
npx prisma migrate deploy

# Inspect the current DB in a browser UI
npx prisma studio
```

---

## 🔑 Key Takeaways

1. **Transactions are not optional for counters.** Every like, follow, and comment touches both a join table and a denormalized counter. If those two writes are not in a transaction you will drift, and the drift is silent and cumulative.

2. **Cursor pagination beats offset pagination for feeds.** Offset re-scans the index from the start and produces duplicates on live data. Cursor pagination is O(1) regardless of how deep into the list you are.

3. **Soft deletes preserve referential integrity.** A hard delete cascades and removes likes/comments tied to that post. A soft delete (`deletedAt = now()`) lets you keep the foreign keys intact and restore content if needed.

4. **`select` keeps your responses lean.** Prisma will `SELECT *` if you use `include` without a nested `select`. Be explicit — your API surface should match what the client actually renders.

5. **`upsert` is the correct tool for find-or-create.** Any naive `findFirst → create` flow has a race condition in a concurrent environment. Push the conflict resolution into the database.

6. **One `PrismaClient` instance per process.** Connection pools are expensive. The singleton pattern in `lib/prisma.ts` is especially important in Next.js and other runtimes that hot-reload modules during development.

7. **`$queryRaw` is the escape hatch.** Prisma's type-safe API covers 95% of use cases. For things like full-text search ranking (`ts_rank`), window functions, or CTEs, drop to raw SQL — but keep it isolated in its own function so the rest of your codebase stays type-safe.

---

*Next chapter: Adding authentication middleware, rate limiting, and wiring these services into an Express or Next.js API router.*
