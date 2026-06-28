# Production Node.js — Database, Caching, and File Uploads

> Revision notes for experienced JS devs. Skip the basics — go deep on the WHY, the traps, and the production patterns.

---

## 🗂️ Table of Contents

- [Part 1 — Prisma & Databases](#part-1--prisma--databases)
- [Part 2 — Redis Caching](#part-2--redis-caching)
- [Part 3 — File Uploads](#part-3--file-uploads)

---

# Part 1 — Prisma & Databases

## 🔥 Schema Design: Relationships, Enums, and Constraints

Prisma schema is your single source of truth. Get it wrong here and you're fighting migrations in production.

### Relations — the full picture

```prisma
// schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  USER
  ADMIN
  MODERATOR
}

enum PostStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  profile   Profile?
  posts     Post[]
  // explicit join table for many-to-many
  postLikes PostLike[]
  // self-relation: user can follow other users
  following  Follow[] @relation("UserFollowing")
  followers  Follow[] @relation("UserFollowers")

  @@index([email])
  @@index([role, createdAt])
}

model Profile {
  id     String  @id @default(cuid())
  bio    String?
  avatar String?
  userId String  @unique
  user   User    @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Post {
  id        String     @id @default(cuid())
  title     String
  slug      String
  content   String
  status    PostStatus @default(DRAFT)
  authorId  String
  author    User       @relation(fields: [authorId], references: [id])
  tags      PostTag[]
  likes     PostLike[]
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  // compound unique: one slug per author
  @@unique([authorId, slug])
  // compound index for common queries
  @@index([status, createdAt])
  @@index([authorId, status])
}

model Tag {
  id    String    @id @default(cuid())
  name  String    @unique
  posts PostTag[]
}

// Explicit join table for Post <-> Tag many-to-many
// Why explicit? So you can add metadata (e.g., addedAt, addedBy)
model PostTag {
  postId    String
  tagId     String
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  tag       Tag      @relation(fields: [tagId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@id([postId, tagId])
}

// Explicit join table for Post <-> User likes
model PostLike {
  userId String
  postId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  post   Post   @relation(fields: [postId], references: [id], onDelete: Cascade)

  @@id([userId, postId])
}

// Self-relation for User follows
model Follow {
  followerId  String
  followingId String
  follower    User     @relation("UserFollowers", fields: [followerId], references: [id])
  following   User     @relation("UserFollowing", fields: [followingId], references: [id])
  createdAt   DateTime @default(now())

  @@id([followerId, followingId])
}
```

**Here's the trap most devs fall into:** Using Prisma's implicit many-to-many (`@relation` with no join model). It's fine for simple cases but you lose the ability to add fields to the join table (like `createdAt`, `order`, `metadata`). Always use explicit join tables in production — you will need that extra field eventually.

**Why `cuid()` over `uuid()`?** cuid generates roughly-sortable IDs that are URL-safe and collision-resistant at scale. `uuid()` is random — random UUIDs cause B-tree index fragmentation because inserts are scattered across pages. `cuid()` is mostly sequential, so inserts stay in-order on the index. For massive tables this matters. Alternative: `nanoid` or Postgres's `gen_random_uuid()` with `ulid` if you need true time-sortability.

---

## 🔥 Prisma Client: Querying Like a Pro

### Pagination: Cursor vs Offset

| | Offset (`skip`/`take`) | Cursor-based |
|---|---|---|
| How it works | `OFFSET 200 LIMIT 20` | `WHERE id > $cursor LIMIT 20` |
| Performance on large tables | Degrades — DB scans all skipped rows | Constant — indexed seek |
| Consistent results | No — inserts shift pages | Yes — cursor anchors position |
| Can jump to page N | Yes | No |
| Use for | Admin tables, small datasets | Infinite scroll, feeds, APIs |

```typescript
// services/post.service.ts

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// OFFSET pagination — fine for admin dashboards (known small result sets)
export async function getPostsOffset(page: number, pageSize = 20) {
  const [posts, total] = await prisma.$transaction([
    prisma.post.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        createdAt: true,
        author: {
          select: { id: true, name: true, email: true },
        },
        _count: { select: { likes: true, tags: true } },
      },
    }),
    prisma.post.count(),
  ]);

  return { posts, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

// CURSOR pagination — for feeds, infinite scroll, large datasets
export async function getPostsCursor(cursor?: string, pageSize = 20) {
  const posts = await prisma.post.findMany({
    take: pageSize + 1, // fetch one extra to detect hasNextPage
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1, // skip the cursor itself
    }),
    where: { status: 'PUBLISHED' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      slug: true,
      createdAt: true,
      author: { select: { id: true, name: true } },
    },
  });

  const hasNextPage = posts.length > pageSize;
  const items = hasNextPage ? posts.slice(0, -1) : posts;
  const nextCursor = hasNextPage ? items[items.length - 1].id : null;

  return { items, nextCursor, hasNextPage };
}
```

### Complex Filters, Upsert, Bulk Operations

```typescript
// Complex where clause
const posts = await prisma.post.findMany({
  where: {
    AND: [
      { status: 'PUBLISHED' },
      { createdAt: { gte: new Date('2024-01-01') } },
      {
        OR: [
          { title: { contains: 'node', mode: 'insensitive' } },
          { tags: { some: { tag: { name: 'nodejs' } } } },
        ],
      },
      { author: { role: { not: 'ADMIN' } } },
    ],
  },
  orderBy: [{ createdAt: 'desc' }, { title: 'asc' }],
});

// Upsert — create if not exists, update if exists
const tag = await prisma.tag.upsert({
  where: { name: 'nodejs' },
  create: { name: 'nodejs' },
  update: {}, // nothing to update if it already exists
});

// createMany — bulk insert (way faster than looping)
// NOTE: createMany does NOT support nested creates (no relations in the data array)
await prisma.postTag.createMany({
  data: tagIds.map((tagId) => ({ postId, tagId })),
  skipDuplicates: true, // ignore if @@id pair already exists
});

// updateMany — bulk update without fetching records
const { count } = await prisma.post.updateMany({
  where: { authorId: userId, status: 'DRAFT' },
  data: { status: 'ARCHIVED' },
});
```

### Interactive Transactions — When Atomicity Actually Matters

**Here's the trap most devs fall into:** Using `prisma.$transaction([...])` (batch transactions) for complex conditional logic. Batch mode runs all queries in one DB roundtrip but you can't use the results of query A to build query B. Use interactive transactions for anything with branching logic.

```typescript
// Interactive transaction for a purchase flow
export async function purchaseItem(userId: string, itemId: string) {
  return prisma.$transaction(async (tx) => {
    // 1. Lock the item row with a read (SELECT ... FOR UPDATE via raw query if needed)
    const item = await tx.item.findUniqueOrThrow({
      where: { id: itemId },
    });

    if (item.stock < 1) {
      throw new Error('OUT_OF_STOCK'); // rolls back transaction
    }

    if (item.price > (await tx.wallet.findUniqueOrThrow({ where: { userId } })).balance) {
      throw new Error('INSUFFICIENT_FUNDS');
    }

    // 2. Decrement stock
    await tx.item.update({
      where: { id: itemId },
      data: { stock: { decrement: 1 } },
    });

    // 3. Deduct balance
    await tx.wallet.update({
      where: { userId },
      data: { balance: { decrement: item.price } },
    });

    // 4. Create order record
    const order = await tx.order.create({
      data: { userId, itemId, price: item.price, status: 'COMPLETED' },
    });

    return order;
  }, {
    maxWait: 5000,   // max time to wait for a connection (ms)
    timeout: 10000,  // max time for the transaction itself (ms)
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable, // for financial ops
  });
}
```

---

## 🔥 The N+1 Problem: How It Sneaks In

```typescript
// WRONG — this is N+1
const posts = await prisma.post.findMany({ take: 20 });
for (const post of posts) {
  // This fires a separate query PER post — 20 posts = 21 queries
  const author = await prisma.user.findUnique({ where: { id: post.authorId } });
}

// RIGHT — Prisma include does a JOIN (or a batched IN query)
const posts = await prisma.post.findMany({
  take: 20,
  include: { author: true },
  // Prisma actually does: SELECT * FROM posts; SELECT * FROM users WHERE id IN (...)
  // It's NOT a JOIN by default — it's a separate batched query, which is usually fine
});
```

**For GraphQL with DataLoader:** When resolvers load relations field-by-field, `include` doesn't help because you don't know upfront which fields the client requested. This is where DataLoader batches:

```typescript
// dataloader setup (e.g., in Apollo Server context)
import DataLoader from 'dataloader';

export function createLoaders() {
  return {
    userLoader: new DataLoader<string, User>(async (ids) => {
      const users = await prisma.user.findMany({
        where: { id: { in: [...ids] } },
      });
      // DataLoader requires results in same order as keys
      const userMap = new Map(users.map((u) => [u.id, u]));
      return ids.map((id) => userMap.get(id) ?? new Error(`User ${id} not found`));
    }),
  };
}

// In GraphQL resolver
const Post = {
  author: (post, _, { loaders }) => loaders.userLoader.load(post.authorId),
};
// Now 100 posts fire exactly 1 user query instead of 100
```

---

## 🔥 Connection Pooling: Where Most Production Bugs Hide

```mermaid
graph TD
    A[Node.js App Instance] -->|Pool: 10 connections| B[Prisma Connection Pool]
    B --> C[PostgreSQL: max_connections=100]
    D[Node.js App Instance] -->|Pool: 10 connections| E[Prisma Connection Pool]
    E --> C
    F[Node.js App Instance] -->|Pool: 10 connections| G[Prisma Connection Pool]
    G --> C
    H[PgBouncer] -->|Single pool| C
    A2[Serverless fn 1] --> H
    B2[Serverless fn 2] --> H
    C2[Serverless fn N] --> H
```

**The problem with serverless:** Each Lambda/Vercel function invocation creates its own Prisma Client with its own connection pool. 100 concurrent invocations = potentially 100 pools of 10 = 1000 connections. Postgres on RDS default is 100. You'll get `too many connections` errors under load.

```typescript
// For serverless — use connection_limit=1 or Accelerate
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '?connection_limit=1&pool_timeout=20',
    },
  },
});

// Better: PgBouncer URL — transactions mode is most compatible
// DATABASE_URL=postgresql://user:pass@pgbouncer-host:6432/db?pgbouncer=true&connection_limit=1
// The ?pgbouncer=true flag disables Prisma's own pooling and uses PgBouncer's

// For long-running servers — tune the pool
const prisma = new PrismaClient({
  datasources: {
    db: {
      // connection_limit: connections per instance
      // pool_timeout: wait time before throwing if no free connection
      url: `${process.env.DATABASE_URL}?connection_limit=10&pool_timeout=30`,
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
});

// Singleton pattern — critical for long-running servers
// Prevents multiple Prisma Client instances on hot reload in dev
declare global {
  var __prisma: PrismaClient | undefined;
}

export const db = global.__prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.__prisma = db;
```

---

## 🔥 Migrations in Production

| Command | Use when | Risk |
|---|---|---|
| `prisma migrate dev` | Local development | High — resets on conflicts |
| `prisma migrate deploy` | CI/CD, production | Low — only applies pending |
| `prisma migrate reset` | Local dev reset | Destroys all data |
| `prisma db push` | Prototyping, no migration files | No migration history |
| `prisma migrate diff` | Audit what would change | Read-only |

```bash
# Local dev workflow
npx prisma migrate dev --name add_post_views_column

# Production deploy (in CI/CD pipeline — NEVER migrate dev in prod)
npx prisma migrate deploy

# If a migration fails in production — DON'T PANIC
# Check prisma_migrations table for failed entry
# Fix forward (add a new migration) rather than rollback (Prisma has no built-in rollback)
```

**Safe schema changes (no downtime):**
1. Add nullable column → deploy → backfill data → add NOT NULL constraint in next migration
2. Rename column → add new column → dual-write → migrate data → drop old column
3. Add index → use `CREATE INDEX CONCURRENTLY` (via raw migration SQL) to avoid table lock

```sql
-- Custom migration for concurrent index creation (edit the generated .sql file)
-- prisma/migrations/20240101_add_post_index/migration.sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Post_status_createdAt_idx" ON "Post"("status", "createdAt");
```

**Here's the trap most devs fall into:** Running `prisma migrate dev` on a production database. It can mark migrations as applied without actually running them, or worse, reset your schema. Always use `migrate deploy` in production — it's idempotent and only applies pending migrations.

---

# Part 2 — Redis Caching

## 🔥 ioredis Setup: Retry Strategy and Cluster Mode

```typescript
// lib/redis.ts
import Redis, { Cluster } from 'ioredis';

const retryStrategy = (times: number) => {
  // Exponential backoff capped at 30s, stop after 10 attempts
  if (times > 10) {
    console.error('Redis: max retries reached, giving up');
    return null; // null = stop retrying
  }
  return Math.min(times * 200, 30_000);
};

// Single-node setup (dev, staging)
export const redis = new Redis({
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT) ?? 6379,
  password: process.env.REDIS_PASSWORD,
  db: 0,
  retryStrategy,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
  lazyConnect: false,
  // Reconnect on specific errors
  reconnectOnError(err) {
    return err.message.includes('READONLY'); // for Redis Sentinel failover
  },
});

redis.on('error', (err) => console.error('Redis Client Error:', err));
redis.on('connect', () => console.log('Redis connected'));
redis.on('reconnecting', (delay) => console.log(`Redis reconnecting in ${delay}ms`));

// Cluster mode (production, ElastiCache cluster)
export const cluster = new Cluster(
  [
    { host: process.env.REDIS_CLUSTER_HOST_1!, port: 6379 },
    { host: process.env.REDIS_CLUSTER_HOST_2!, port: 6379 },
    { host: process.env.REDIS_CLUSTER_HOST_3!, port: 6379 },
  ],
  {
    redisOptions: {
      password: process.env.REDIS_PASSWORD,
      tls: process.env.NODE_ENV === 'production' ? {} : undefined,
    },
    clusterRetryStrategy: retryStrategy,
    // Route read commands to replicas
    scaleReads: 'slave',
    // IMPORTANT: In cluster mode, keys must hash to the same slot for multi-key ops
    // Use hash tags: {user:123}:sessions and {user:123}:profile go to same slot
    enableOfflineQueue: false, // fail fast in production
  }
);
```

**Here's the trap most devs fall into:** Not handling the `error` event on the Redis client. An unhandled `error` event in Node.js crashes the process. Always attach an error listener even if it's just a console.error.

---

## 🔥 Cache Patterns: Read-Through, Write-Through, Cache-Aside

```mermaid
flowchart LR
    Client -->|1. GET request| App
    App -->|2. Check cache| Redis
    Redis -->|3a. HIT: return data| App
    Redis -->|3b. MISS| App
    App -->|4. Query DB| Postgres
    Postgres -->|5. Return data| App
    App -->|6. SET in cache| Redis
    App -->|7. Return data| Client
```

### Cache-Aside (Lazy Loading) — The Default Pattern

```typescript
// lib/cache.ts
import { redis } from './redis';

type CacheOptions = {
  ttl?: number;       // seconds
  tags?: string[];    // for tag-based invalidation
};

export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const { ttl = 3600, tags = [] } = options;

  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached) as T;
  }

  const data = await fetcher();

  // Use pipeline for atomic multi-key operations
  const pipeline = redis.pipeline();
  pipeline.set(key, JSON.stringify(data), 'EX', ttl);

  // Tag-based invalidation: store key under each tag's set
  for (const tag of tags) {
    pipeline.sadd(`tag:${tag}`, key);
    pipeline.expire(`tag:${tag}`, ttl + 60); // tags expire slightly after data
  }

  await pipeline.exec();

  return data;
}

// Invalidate all keys with a given tag
export async function invalidateByTag(tag: string) {
  const tagKey = `tag:${tag}`;
  const keys = await redis.smembers(tagKey);

  if (keys.length > 0) {
    const pipeline = redis.pipeline();
    keys.forEach((key) => pipeline.del(key));
    pipeline.del(tagKey);
    await pipeline.exec();
  }
}

// Usage
const post = await cached(
  `post:${slug}`,
  () => prisma.post.findUniqueOrThrow({ where: { slug } }),
  { ttl: 1800, tags: [`author:${authorId}`, 'posts'] }
);

// When author updates their profile, invalidate all their post cache
await invalidateByTag(`author:${authorId}`);
```

### Write-Through — Keep Cache and DB in Sync on Every Write

```typescript
// Write-through: update DB and cache atomically
export async function updatePost(id: string, data: Prisma.PostUpdateInput) {
  const updated = await prisma.post.update({ where: { id }, data });

  // Update cache immediately — don't wait for a cache miss
  await redis.set(`post:${id}`, JSON.stringify(updated), 'EX', 3600);

  return updated;
}
```

**When to use each pattern:**

| Pattern | When to use | When NOT to use |
|---|---|---|
| Cache-aside | Read-heavy, infrequent writes | Write-heavy data (cache goes stale) |
| Write-through | Strong consistency needed | Write-heavy (double write penalty) |
| Write-behind | Very write-heavy, OK with eventual consistency | Financial data, anything requiring durability |
| Cache-through | You want the cache layer to own DB reads | Complex query patterns |

---

## 🔥 Redis Data Structures: the Right Tool for Each Job

### Hash — Session Storage / User Object

```typescript
// Store user session as a Hash (field-level access, no need to serialize whole object)
const SESSION_TTL = 60 * 60 * 24 * 7; // 1 week

export async function setSession(sessionId: string, userData: Record<string, string>) {
  const key = `session:${sessionId}`;
  await redis.hset(key, userData);
  await redis.expire(key, SESSION_TTL);
}

export async function getSession(sessionId: string) {
  return redis.hgetall(`session:${sessionId}`);
}

export async function updateSessionField(sessionId: string, field: string, value: string) {
  // Update one field without fetching/re-serializing the whole object
  await redis.hset(`session:${sessionId}`, field, value);
}
```

### Sorted Set — Leaderboard and Rate Limiting

```typescript
// Leaderboard: ZADD, ZREVRANGE, ZRANK
export async function addScore(userId: string, score: number) {
  await redis.zadd('leaderboard:global', score, userId);
}

export async function getTopN(n: number) {
  // Returns [ [memberId, score], ... ] highest to lowest
  return redis.zrevrange('leaderboard:global', 0, n - 1, 'WITHSCORES');
}

export async function getUserRank(userId: string) {
  // 0-indexed rank from highest; add 1 for human-readable rank
  const rank = await redis.zrevrank('leaderboard:global', userId);
  return rank !== null ? rank + 1 : null;
}

// Sliding window rate limiter using Sorted Set
export async function isRateLimited(
  identifier: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const key = `ratelimit:${identifier}`;
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;

  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, '-inf', windowStart); // remove old entries
  pipeline.zadd(key, now, `${now}-${Math.random()}`);  // add this request
  pipeline.zcard(key);                                  // count requests in window
  pipeline.expire(key, windowSeconds);

  const results = await pipeline.exec();
  const count = results![2][1] as number;

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt: now + windowSeconds * 1000,
  };
}
```

### Pub/Sub — Broadcasting to WebSocket Servers

```mermaid
graph LR
    UserA -->|HTTP POST /message| APIServer1
    APIServer1 -->|PUBLISH chat:room:42| Redis
    Redis -->|SUBSCRIBE| APIServer1
    Redis -->|SUBSCRIBE| APIServer2
    Redis -->|SUBSCRIBE| APIServer3
    APIServer2 -->|ws.send| UserB
    APIServer3 -->|ws.send| UserC
```

```typescript
// publisher.ts — on HTTP POST handler
import { redis } from './redis';

export async function publishChatMessage(roomId: string, message: ChatMessage) {
  // Store in DB first
  await prisma.message.create({ data: { ...message, roomId } });

  // Then publish to all WebSocket servers
  await redis.publish(`chat:room:${roomId}`, JSON.stringify(message));
}

// subscriber.ts — runs in WebSocket server (separate Redis connection — required!)
// CRITICAL: A Redis connection in subscribe mode can ONLY be used for subscribe/unsubscribe
// You MUST use a separate client for subscribe operations
import Redis from 'ioredis';
import { WebSocketServer } from 'ws';

const subscriber = new Redis(process.env.REDIS_URL!);
const roomConnections = new Map<string, Set<WebSocket>>(); // roomId -> Set of sockets

subscriber.psubscribe('chat:room:*', (err) => {
  if (err) console.error('Subscribe error:', err);
});

subscriber.on('pmessage', (_pattern, channel, message) => {
  const roomId = channel.split(':')[2];
  const sockets = roomConnections.get(roomId) ?? new Set();

  for (const socket of sockets) {
    if (socket.readyState === socket.OPEN) {
      socket.send(message);
    }
  }
});
```

### List — Simple Job Queue

```typescript
// producer: push to right end of list
export async function enqueueJob(queue: string, payload: object) {
  await redis.rpush(`queue:${queue}`, JSON.stringify(payload));
}

// consumer: blocking pop from left (BLPOP blocks until an item is available)
// Run in a worker process — NOT in your API server
async function startWorker(queue: string) {
  console.log(`Worker listening on queue:${queue}`);
  while (true) {
    try {
      // BLPOP returns [key, value] after waiting up to 5s
      const result = await redis.blpop(`queue:${queue}`, 5);
      if (!result) continue; // timeout, loop again

      const [, raw] = result;
      const job = JSON.parse(raw);
      await processJob(job);
    } catch (err) {
      console.error('Worker error:', err);
      // Don't crash the loop — log, maybe push to dead-letter queue
    }
  }
}
```

**Here's the trap most devs fall into:** Using Redis List as a production job queue for anything critical. Lists have no acknowledgement mechanism — if your worker crashes after BLPOP but before finishing the job, the job is gone. For production job queues use BullMQ (built on Redis Streams) which gives you ack, retries, and dead-letter queues.

---

# Part 3 — File Uploads

## 🔥 Multer: Memory vs Disk Storage

```typescript
// middleware/upload.ts
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';

// Memory storage: file lives in req.file.buffer
// USE for: small files you immediately process/stream to S3
// DO NOT USE for: large files — you'll OOM your server under concurrent load
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
    files: 1,
  },
  fileFilter(_req, file, cb) {
    if (!validateMimeType(file.mimetype)) {
      return cb(new Error('INVALID_FILE_TYPE'));
    }
    cb(null, true);
  },
});

// Disk storage: file written to local disk
// USE for: large files, video uploads, when you need to process with CLI tools (ffmpeg)
// DO NOT USE for: serverless (no persistent disk), multi-instance (file on one server)
const diskUpload = multer({
  storage: multer.diskStorage({
    destination: '/tmp/uploads',
    filename(_req, file, cb) {
      const uniqueName = `${crypto.randomUUID()}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  }),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
});

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
]);

function validateMimeType(mimetype: string): boolean {
  return ALLOWED_MIME_TYPES.has(mimetype);
}

export { memoryUpload, diskUpload };
```

**Here's the trap most devs fall into:** Trusting `file.mimetype` from multer for security. That field comes directly from the `Content-Type` header sent by the client — it's trivially spoofable. A malicious actor can upload a PHP shell disguised as `image/jpeg`. Always validate magic bytes server-side.

---

## 🔥 Magic Bytes Validation: Don't Trust Extensions or MIME Type

```typescript
// lib/file-type-validator.ts
// Magic bytes (file signatures) — the real source of truth
const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37], [0x47, 0x49, 0x46, 0x38, 0x39]],
  'image/webp': [], // checked differently — see below
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
};

export function validateMagicBytes(buffer: Buffer, expectedMime: string): boolean {
  if (expectedMime === 'image/webp') {
    // RIFF????WEBP
    return (
      buffer.slice(0, 4).toString('ascii') === 'RIFF' &&
      buffer.slice(8, 12).toString('ascii') === 'WEBP'
    );
  }

  const signatures = MAGIC_BYTES[expectedMime];
  if (!signatures?.length) return false;

  return signatures.some((sig) =>
    sig.every((byte, i) => buffer[i] === byte)
  );
}

// Or use the 'file-type' npm package — handles 500+ formats
// import { fileTypeFromBuffer } from 'file-type';
// const detected = await fileTypeFromBuffer(buffer);
// if (!detected || detected.mime !== expectedMime) throw new Error('INVALID_FILE');
```

---

## 🔥 Uploading Directly to S3

```typescript
// lib/s3.ts
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

export const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.S3_BUCKET!;

// Server-side upload (after processing with sharp)
export async function uploadToS3(
  buffer: Buffer,
  key: string,
  contentType: string,
  metadata?: Record<string, string>
) {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      Metadata: metadata,
      // Never set ACL: 'public-read' unless you know what you're doing
      // Use CloudFront in front of a private bucket instead
      CacheControl: 'public, max-age=31536000, immutable', // 1 year — content-addressed keys
    })
  );

  return `https://${process.env.CLOUDFRONT_DOMAIN}/${key}`;
}
```

---

## 🔥 Presigned URLs: The Right Pattern for Production

**The server-side upload flow is a bottleneck at scale.** Every file passes through your API server, consuming memory, bandwidth, and CPU. With presigned URLs, your server is only in the authentication/authorization path — the actual bytes go directly from the client to S3.

```mermaid
sequenceDiagram
    participant Client
    participant APIServer
    participant S3

    Client->>APIServer: POST /api/upload/presign { filename, contentType, size }
    APIServer->>APIServer: Validate user, file type, size
    APIServer->>S3: Generate presigned PutObject URL (expires in 300s)
    APIServer-->>Client: { uploadUrl, fileKey, publicUrl }
    Client->>S3: PUT uploadUrl (file bytes go directly to S3)
    S3-->>Client: 200 OK
    Client->>APIServer: POST /api/upload/confirm { fileKey }
    APIServer->>APIServer: Verify key exists in S3, save to DB
    APIServer-->>Client: { success: true, url: publicUrl }
```

```typescript
// routes/upload.ts
import { Router } from 'express';
import { s3, BUCKET } from '../lib/s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';

const router = Router();

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

const MAX_SIZES: Record<string, number> = {
  'image/jpeg': 10 * 1024 * 1024,  // 10MB
  'image/png': 10 * 1024 * 1024,
  'image/webp': 10 * 1024 * 1024,
  'application/pdf': 50 * 1024 * 1024,
};

router.post('/presign', requireAuth, async (req, res) => {
  const { filename, contentType, size } = req.body;

  if (!ALLOWED_TYPES[contentType]) {
    return res.status(400).json({ error: 'File type not allowed' });
  }

  if (size > MAX_SIZES[contentType]) {
    return res.status(400).json({ error: 'File too large' });
  }

  // Content-addressed key: hash of (userId + timestamp + random)
  // This prevents path traversal and makes keys unguessable
  const ext = ALLOWED_TYPES[contentType];
  const fileKey = `uploads/${req.user.id}/${crypto.randomUUID()}${ext}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: fileKey,
    ContentType: contentType,
    ContentLength: size,
    // Enforce that client uploads EXACTLY this content type and size
    // Prevents content-type confusion attacks
    Metadata: {
      'uploaded-by': req.user.id,
      'original-name': Buffer.from(filename).toString('base64'),
    },
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 minutes

  // Store pending upload in Redis to verify on confirm
  await redis.set(
    `pending-upload:${fileKey}`,
    JSON.stringify({ userId: req.user.id, contentType, size }),
    'EX',
    600 // 10 minute window
  );

  return res.json({
    uploadUrl,
    fileKey,
    publicUrl: `https://${process.env.CLOUDFRONT_DOMAIN}/${fileKey}`,
  });
});

router.post('/confirm', requireAuth, async (req, res) => {
  const { fileKey } = req.body;

  // Verify this was a pending upload for this user
  const pending = await redis.get(`pending-upload:${fileKey}`);
  if (!pending) return res.status(400).json({ error: 'Unknown upload' });

  const { userId } = JSON.parse(pending);
  if (userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  // Verify the file actually exists in S3 (client claimed to upload it)
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: fileKey }));
  } catch {
    return res.status(400).json({ error: 'File not found in storage' });
  }

  // Optionally trigger image processing job
  await enqueueJob('image-processing', { fileKey, userId });

  // Clean up pending key
  await redis.del(`pending-upload:${fileKey}`);

  // Save to DB
  const attachment = await prisma.attachment.create({
    data: { key: fileKey, userId: req.user.id, status: 'PROCESSING' },
  });

  return res.json({ attachmentId: attachment.id });
});

export default router;
```

---

## 🔥 Image Processing with Sharp

```typescript
// workers/image-processor.ts
import sharp from 'sharp';
import { s3 } from '../lib/s3';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

type ProcessingJob = {
  fileKey: string;
  userId: string;
};

const THUMBNAIL_SIZES = [
  { width: 150, height: 150, suffix: 'thumb' },
  { width: 400, height: 400, suffix: 'medium' },
  { width: 1200, height: 800, suffix: 'large' },
];

export async function processImage(job: ProcessingJob) {
  const { fileKey } = job;

  // Download original from S3
  const getResponse = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: fileKey }));
  const originalBuffer = Buffer.from(await getResponse.Body!.transformToByteArray());

  // Validate magic bytes AGAIN — even though we validated mime type at presign time,
  // validate here too since you're now actually reading the bytes
  const { fileTypeFromBuffer } = await import('file-type');
  const detected = await fileTypeFromBuffer(originalBuffer);
  if (!detected || !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(detected.mime)) {
    throw new Error(`INVALID_FILE_TYPE: detected ${detected?.mime}`);
  }

  // Get image metadata before processing
  const metadata = await sharp(originalBuffer).metadata();
  console.log(`Processing ${metadata.width}x${metadata.height} ${metadata.format} image`);

  // Process variants in parallel
  const variants = await Promise.all(
    THUMBNAIL_SIZES.map(async ({ width, height, suffix }) => {
      const processed = await sharp(originalBuffer)
        .resize(width, height, {
          fit: 'cover',          // crop to fill, centered
          position: 'attention', // smart crop — focus on the interesting part
          withoutEnlargement: true, // don't upscale small images
        })
        .webp({ quality: 85, effort: 4 }) // quality/effort tradeoff
        .toBuffer();

      const variantKey = fileKey.replace(/\.[^.]+$/, `-${suffix}.webp`);

      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: variantKey,
          Body: processed,
          ContentType: 'image/webp',
          CacheControl: 'public, max-age=31536000, immutable',
        })
      );

      return { suffix, key: variantKey, size: processed.length };
    })
  );

  // Also convert original to WebP for the full-size version
  const optimizedOriginal = await sharp(originalBuffer)
    .webp({ quality: 90 })
    .toBuffer();

  const optimizedKey = fileKey.replace(/\.[^.]+$/, '-original.webp');
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: optimizedKey,
      Body: optimizedOriginal,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );

  // Update DB with all variant URLs
  await prisma.attachment.update({
    where: { key: fileKey },
    data: {
      status: 'READY',
      originalKey: optimizedKey,
      thumbnailKey: variants.find((v) => v.suffix === 'thumb')!.key,
      mediumKey: variants.find((v) => v.suffix === 'medium')!.key,
      largeKey: variants.find((v) => v.suffix === 'large')!.key,
      originalWidth: metadata.width,
      originalHeight: metadata.height,
    },
  });

  console.log(`Image processed: ${variants.map((v) => `${v.suffix}(${v.size}B)`).join(', ')}`);
}
```

**Sharp performance notes:**
- Sharp uses libvips which is significantly faster than ImageMagick or jimp
- `effort: 4` for WebP is a good balance — `effort: 6` is highest quality but 2x slower
- Process variants in parallel with `Promise.all` — sharp is CPU-bound, not I/O-bound, so concurrency helps on multi-core servers
- For very high throughput, run image processing in a separate worker process/container — don't block your API server with CPU-intensive work

---

## 🔥 Full Upload Architecture: Putting It Together

```mermaid
graph TB
    Client -->|1. POST /upload/presign| API
    API -->|2. Validate user + file type| API
    API -->|3. getSignedUrl| S3
    API -->|4. Store pending in Redis| Redis
    API -->|5. Return { uploadUrl, fileKey }| Client
    Client -->|6. PUT file bytes directly| S3
    Client -->|7. POST /upload/confirm| API
    API -->|8. HeadObject verify| S3
    API -->|9. CREATE attachment PROCESSING| DB
    API -->|10. Enqueue job| JobQueue
    JobQueue -->|11. Process| Worker
    Worker -->|12. Download original| S3
    Worker -->|13. Validate magic bytes| Worker
    Worker -->|14. Generate WebP variants| Worker
    Worker -->|15. Upload variants| S3
    Worker -->|16. UPDATE attachment READY| DB
    Client -->|17. Poll or WebSocket for status| API
```

**When to use presigned URLs vs server-side upload:**

| | Presigned URL | Server-Side Upload |
|---|---|---|
| Scalability | Excellent — S3 handles bandwidth | Poor — every byte through your server |
| Validation | Must rely on content-type header at presign time; validate after | Can validate fully before storing |
| File processing | Must download from S3 after upload | Can process in-memory stream |
| Implementation complexity | Medium — two-step flow | Low — one step |
| Use for | Images, videos, large files, production | Internal tools, admin, small files |

---

## Quick Reference: Environment Variables Checklist

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db?connection_limit=10&pool_timeout=30

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-password
# Or for cluster
REDIS_CLUSTER_HOST_1=cluster-node-1.cache.amazonaws.com

# S3 / Storage
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=your-bucket-name
CLOUDFRONT_DOMAIN=d1234.cloudfront.net
```

---

> Key mental model: **Databases store truth. Redis stores speed. S3 stores bulk.** Each system is optimized for exactly one job — don't fight their design. Prisma gives you type-safe access to truth. ioredis gives you low-latency access to speed. Presigned URLs give you direct access to bulk storage without making your server the middleman.
