# Chapter 2: Social Network — Database Schema Design

> **Goal of this chapter:** Walk through every table, every column, and every design decision for a real social network database. By the end you should be able to read any production schema and understand *why* things are the way they are — not just *what* they are.

---

## The Big Picture

Before writing a single `CREATE TABLE`, ask yourself: *what does this application actually do?*

A social network needs to:

- Store user accounts and profiles
- Let users publish posts (with images)
- Let users follow each other
- Let users like and comment on posts
- Organize posts with hashtags
- Notify users when something relevant happens
- Support private direct messages

Each of those bullets maps almost directly to a table. That is not a coincidence — good schema design starts by listing the **nouns** in your domain (users, posts, follows) and the **relationships** between them (a user *has many* posts, a post *has many* likes).

---

## Table 1: `users`

```sql
CREATE TABLE users (
  id              BIGSERIAL PRIMARY KEY,
  email           VARCHAR(255) NOT NULL UNIQUE,
  username        VARCHAR(50)  NOT NULL UNIQUE,
  display_name    VARCHAR(100),
  bio             TEXT,
  avatar_url      TEXT,
  website         TEXT,
  is_private      BOOLEAN NOT NULL DEFAULT false,
  is_verified     BOOLEAN NOT NULL DEFAULT false,
  post_count      INT NOT NULL DEFAULT 0,
  follower_count  INT NOT NULL DEFAULT 0,
  following_count INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ  -- soft delete
);
```

### Column-by-column reasoning

**`id BIGSERIAL PRIMARY KEY`**
Use `BIGSERIAL` (auto-incrementing 64-bit integer) instead of plain `SERIAL` (32-bit). A 32-bit integer maxes out at about 2.1 billion rows. Sounds like a lot until you realize Instagram had 1 billion users and each user might have many rows across tables. `BIGSERIAL` gives you 9.2 *quintillion* rows — future-proof at essentially zero cost.

**`email VARCHAR(255) NOT NULL UNIQUE`**
`255` characters is the RFC 5321 maximum for an email address. `NOT NULL` because an account without an email cannot be verified or recovered. `UNIQUE` because one email must map to exactly one account — this is your de-facto login identifier. The `UNIQUE` constraint also automatically creates a B-tree index on the column, making "find user by email" instant.

**`username VARCHAR(50) NOT NULL UNIQUE`**
Shorter than email (50 chars) because usernames appear in URLs (`/profile/johndoe`) and UI everywhere. `UNIQUE` because two users cannot share a handle. Keep the limit tight — very long usernames make URLs ugly and UI layouts break.

**`display_name VARCHAR(100)` — nullable**
This is the human-readable name shown in the UI ("John Doe"). It is *nullable* because you might not collect it at signup. It does not need to be unique — plenty of real people share a name.

**`bio TEXT` — nullable**
`TEXT` in PostgreSQL has no practical length limit. A `VARCHAR(160)` would also work (Twitter's old limit), but `TEXT` is simpler and storage cost is identical for short strings. Nullable because it is optional profile info.

**`avatar_url TEXT` and `website TEXT`**
Store the *URL* to the image, not the image itself. Images live in object storage (S3, Cloudflare R2). URLs can be quite long (signed URLs, CDN paths), so `TEXT` is safer than `VARCHAR(255)` here.

**`is_private BOOLEAN NOT NULL DEFAULT false`**
Controls whether this account's posts are visible to non-followers. The `DEFAULT false` means accounts are public unless a user opts in to private mode. `NOT NULL` prevents a three-state boolean (true/false/NULL), which would complicate every permission check.

**`is_verified BOOLEAN NOT NULL DEFAULT false`**
The blue checkmark. Only your backend sets this; never trust client input on this field.

**`post_count`, `follower_count`, `following_count` — denormalized counters**
These are *intentionally* denormalized (see the full discussion in the Denormalization section below). The alternative — counting rows in `posts` or `follows` every time you render a profile — would be too slow at scale.

**`created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`**
`TIMESTAMPTZ` stores a UTC timestamp with timezone awareness. *Always* use `TIMESTAMPTZ` over plain `TIMESTAMP` — `TIMESTAMP` has no timezone context and will silently give you wrong results when your servers or users span timezones. `DEFAULT NOW()` means the database fills this in automatically; you never need to pass it from application code.

**`updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`**
Updated by a trigger (shown later) whenever any column in the row changes. Useful for cache invalidation and "last active" displays.

**`deleted_at TIMESTAMPTZ` — soft delete**
Instead of `DELETE`ing a user row (which would cascade and potentially destroy years of content), you set `deleted_at = NOW()`. The row still exists but every query filters `WHERE deleted_at IS NULL`. This lets you recover accidentally deleted accounts, comply with data-deletion requests in a controlled way, and keep foreign key references intact.

---

## Table 2: `posts`

```sql
CREATE TABLE posts (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content       TEXT NOT NULL,
  image_urls    TEXT[],  -- PostgreSQL array
  is_public     BOOLEAN NOT NULL DEFAULT true,
  like_count    INT NOT NULL DEFAULT 0,
  comment_count INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);
```

**`user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE`**
Every post belongs to exactly one user. `NOT NULL` because an ownerless post makes no sense. `ON DELETE CASCADE` means if the user is deleted, all their posts are deleted too. See the full discussion of cascade options below.

**`content TEXT NOT NULL`**
The post body. `NOT NULL` — you cannot publish an empty post (though you might allow image-only posts in which case you would make this nullable or add a check constraint).

**`image_urls TEXT[]`**
A PostgreSQL *array* of text. A single post can have 0–10 images, and storing them in a separate `post_images` table would require a JOIN every time you display a post. The array keeps them co-located with the post row. This is a deliberate trade-off: you cannot query "all posts containing image X" efficiently, but that query is rare. See the cross-database section for how to handle this in MySQL/SQL Server.

**`is_public BOOLEAN NOT NULL DEFAULT true`**
For users with private accounts, new posts default to public (they can override). This field lets you mix public and private posts on the same account if your product needs it.

---

## Table 3: `follows`

```sql
CREATE TABLE follows (
  follower_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);
```

This is a **self-referential many-to-many** table — users follow other users. The relationship is *directional*: Alice follows Bob does not mean Bob follows Alice.

**Composite primary key `(follower_id, following_id)`**
A pair of users can have exactly one follow relationship. The composite PK enforces this and simultaneously acts as an index for "who does user X follow?" queries. You do not need a separate surrogate `id` column here because the pair of IDs is already a perfect natural key.

**No `updated_at`**
A follow either exists or it does not. There is nothing to update — you only insert and delete rows. This simplifies the table significantly.

---

## Table 4: `likes`

```sql
CREATE TABLE likes (
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id    BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);
```

Same pattern as `follows`. A user can like a post exactly once (the PK prevents duplicates). When you need to check "has this user liked this post?" you do a single primary-key lookup — extremely fast.

---

## Table 5: `comments`

```sql
CREATE TABLE comments (
  id         BIGSERIAL PRIMARY KEY,
  post_id    BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id  BIGINT REFERENCES comments(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  like_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
```

**`parent_id BIGINT REFERENCES comments(id) ON DELETE CASCADE` — nullable**
This creates a **self-referential** relationship for nested/threaded comments (replies to replies). When `parent_id IS NULL`, the comment is a top-level comment. When it has a value, it is a reply to that comment.

Keep nesting shallow in your product (max 2–3 levels) because deeply recursive queries are expensive. Most social networks cap at one level of replies.

**Why comments get their own `id`** — unlike `likes`, a comment has content that can be liked, reported, or replied to. It needs its own identity, so a surrogate `id` makes sense here.

---

## Tables 6 & 7: `hashtags` and `post_hashtags`

```sql
CREATE TABLE hashtags (
  id         BIGSERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL UNIQUE,
  post_count INT NOT NULL DEFAULT 0
);

CREATE TABLE post_hashtags (
  post_id    BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  hashtag_id BIGINT NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, hashtag_id)
);
```

This is a classic **many-to-many junction table**. A post can have many hashtags; a hashtag can appear in many posts.

**Why not store hashtags as a `TEXT[]` array on `posts`?**
Because you need to query *from the hashtag side*: "show all posts tagged `#photography`". An array column cannot be efficiently indexed for that query. A separate `hashtags` table with a junction table lets you find all posts for a tag using a simple join and an index lookup.

**`name VARCHAR(100) NOT NULL UNIQUE`**
Hashtag names are stored once and referenced by ID. This is normalization in action — you do not repeat the string `"photography"` in thousands of rows; you store the integer `42` instead.

---

## Table 8: `notifications`

```sql
CREATE TABLE notifications (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       VARCHAR(50) NOT NULL,
  post_id    BIGINT REFERENCES posts(id) ON DELETE CASCADE,
  comment_id BIGINT REFERENCES comments(id) ON DELETE CASCADE,
  is_read    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**`user_id` vs `actor_id`**
`user_id` is the *recipient* (who gets notified). `actor_id` is the *actor* (who triggered the notification — the person who liked your post, followed you, etc.). Both reference `users`. This naming is intentional and worth documenting in your codebase — calling both `user_id` would be ambiguous.

**`type VARCHAR(50)` — string discriminator**
Rather than separate tables for each notification type, a single `type` column lets you add new notification types without schema migrations. The trade-off is that `post_id` and `comment_id` are nullable — a "follow" notification has no post or comment. This is an acceptable design; each row uses only the columns relevant to its type.

---

## Tables 9–11: `conversations`, `conversation_participants`, `messages`

```sql
CREATE TABLE conversations (
  id         BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE conversation_participants (
  conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE messages (
  id              BIGSERIAL PRIMARY KEY,
  conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  is_read         BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Why three tables and not one?**
A naive design stores `sender_id` and `recipient_id` directly on the `messages` table. That breaks the moment you need group chats. The three-table design supports both 1-on-1 and group conversations without any schema change — just add more rows to `conversation_participants`.

**`conversation_participants` composite PK**
A user can only be in a conversation once. The composite PK enforces this.

---

## Indexes: Making Queries Fast

Indexes are the difference between a query taking 1 millisecond and 10 seconds on a large table. Every `PRIMARY KEY` and `UNIQUE` constraint already creates an index automatically. The additional indexes below cover the most common query patterns.

```sql
-- Users: look up by email or username (login, profile pages)
CREATE INDEX idx_users_email    ON users(email);        -- covered by UNIQUE, shown for clarity
CREATE INDEX idx_users_username ON users(username);     -- covered by UNIQUE, shown for clarity
CREATE INDEX idx_users_deleted  ON users(deleted_at);   -- filter soft-deleted rows efficiently

-- Posts: most common query is "all posts by a user, newest first"
CREATE INDEX idx_posts_user_id    ON posts(user_id, created_at DESC);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);  -- global feed / trending
CREATE INDEX idx_posts_deleted    ON posts(deleted_at);

-- Follows: two directions of the follow graph
CREATE INDEX idx_follows_follower  ON follows(follower_id);   -- "who does X follow?"
CREATE INDEX idx_follows_following ON follows(following_id);  -- "who follows X?"

-- Comments: get all comments for a post; get all replies to a comment
CREATE INDEX idx_comments_post_id   ON comments(post_id, created_at);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);

-- Hashtags: case-insensitive tag lookup
CREATE INDEX idx_hashtags_name ON hashtags(LOWER(name));

-- Post-hashtags: find all posts for a given hashtag
CREATE INDEX idx_post_hashtags_hashtag ON post_hashtags(hashtag_id);

-- Notifications: unread notifications for a user (the most common query)
CREATE INDEX idx_notifications_user    ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread  ON notifications(user_id) WHERE is_read = false;

-- Messages: all messages in a conversation, chronologically
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
```

**Why `idx_notifications_unread` uses a partial index (`WHERE is_read = false`)**
A partial index only indexes rows that match the condition. Your notifications table will eventually have millions of read notifications, but users only care about unread ones. The partial index is tiny and extremely fast because it ignores all the historical read notifications.

**Why `idx_posts_user_id` is a composite index on `(user_id, created_at DESC)`**
When you query "give me the 20 most recent posts by user 42", PostgreSQL can satisfy the entire query — filtering *and* sorting — using this single index without touching the table at all. This is called an **index-only scan** and is significantly faster than filtering by `user_id` and then sorting separately.

---

## Denormalized Counter Columns

`post_count`, `follower_count`, `following_count`, `like_count`, and `comment_count` are **denormalized**. The "normalized" alternative is to count rows at query time:

```sql
-- Normalized approach (correct but slow at scale)
SELECT COUNT(*) FROM posts WHERE user_id = 42 AND deleted_at IS NULL;
```

On a table with millions of posts, `COUNT(*)` with an index is still fast — but you run this query on *every profile page render*, potentially thousands of times per second. Denormalized counters convert that repeated count into a single column read.

### Keeping counters consistent with triggers

The danger: if you update the counter in application code, bugs or crashes can leave the counter out of sync. Triggers run *inside the database transaction* — they are atomic with the change that caused them.

```sql
-- Trigger function: increment post_count when a post is inserted
CREATE OR REPLACE FUNCTION increment_post_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users SET post_count = post_count + 1
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_post_inserted
AFTER INSERT ON posts
FOR EACH ROW EXECUTE FUNCTION increment_post_count();

-- Trigger function: decrement post_count on soft delete
CREATE OR REPLACE FUNCTION decrement_post_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Only decrement when deleted_at transitions from NULL to a value
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    UPDATE users SET post_count = GREATEST(post_count - 1, 0)
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_post_soft_deleted
AFTER UPDATE ON posts
FOR EACH ROW EXECUTE FUNCTION decrement_post_count();

-- Trigger: keep updated_at current on any row change
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Apply the same trigger to posts
CREATE TRIGGER trg_posts_updated_at
BEFORE UPDATE ON posts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

**`GREATEST(post_count - 1, 0)`** — never let counters go negative due to a data inconsistency bug. It is defensive programming at the database level.

**Periodic reconciliation** — even with triggers, run a nightly job that recomputes counters from source-of-truth counts and corrects any drift:

```sql
UPDATE users u
SET post_count = (
  SELECT COUNT(*) FROM posts p
  WHERE p.user_id = u.id AND p.deleted_at IS NULL
);
```

---

## ON DELETE Behavior: CASCADE vs SET NULL vs RESTRICT

Every foreign key must declare what happens when the referenced row is deleted. This is one of the most consequential decisions in schema design.

| Option | Behavior | Use when |
|---|---|---|
| `CASCADE` | Delete the child row automatically | Child cannot exist without parent (post needs a user) |
| `SET NULL` | Set the FK column to NULL | Child can exist independently (an order might keep a deleted product's record) |
| `RESTRICT` | Block the parent deletion if children exist | You want to force explicit cleanup first |
| `NO ACTION` | Same as RESTRICT but deferred | Rarely used; default if you specify nothing |

**In this schema:**

- `posts.user_id → users` uses `CASCADE`: a post without a user is meaningless orphan data.
- `comments.post_id → posts` uses `CASCADE`: a comment without a post is equally meaningless.
- `comments.parent_id → comments` uses `CASCADE`: deleting a top-level comment deletes its replies.
- `notifications.post_id → posts` uses `CASCADE`: when a post is deleted, its notifications become irrelevant.

**Where you might prefer SET NULL:**
If you wanted to keep messages in a conversation even after a participant deletes their account (for the other participant's history), you could make `messages.sender_id` nullable with `ON DELETE SET NULL` and display "Deleted User" in the UI. This schema uses `CASCADE` for simplicity, but `SET NULL` is the right choice for many real products.

---

## Cross-Database Equivalents

PostgreSQL has several features used above that do not exist in MySQL or SQL Server. Here is how to translate the key differences.

### Arrays → JSON

PostgreSQL's `TEXT[]` array type does not exist in MySQL or SQL Server. Use JSON instead.

```sql
-- PostgreSQL
image_urls TEXT[]

-- MySQL 5.7+ / SQL Server 2016+
image_urls JSON

-- Querying in MySQL (extract first image):
SELECT JSON_UNQUOTE(JSON_EXTRACT(image_urls, '$[0]')) FROM posts;

-- Querying in SQL Server:
SELECT JSON_VALUE(image_urls, '$[0]') FROM posts;
```

JSON is more flexible but slower to query than a native array, and you lose the ability to define per-element foreign keys. For most use cases the JSON approach is perfectly adequate.

### TIMESTAMPTZ → DATETIME with UTC convention

```sql
-- PostgreSQL
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

-- MySQL
created_at DATETIME NOT NULL DEFAULT UTC_TIMESTAMP()
-- Always set your MySQL session timezone: SET time_zone = '+00:00';

-- SQL Server
created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
-- Or use DATETIME2 and enforce UTC in application code:
created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
```

MySQL's `DATETIME` stores no timezone info — it is your responsibility to always store UTC. `DATETIMEOFFSET` in SQL Server is the closest equivalent to `TIMESTAMPTZ`.

### BIGSERIAL → AUTO_INCREMENT / IDENTITY

```sql
-- PostgreSQL
id BIGSERIAL PRIMARY KEY

-- MySQL
id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY

-- SQL Server
id BIGINT NOT NULL IDENTITY(1,1) PRIMARY KEY
```

### Partial Indexes

PostgreSQL supports `WHERE` clauses on indexes. MySQL does not support partial indexes at all. SQL Server 2008+ supports filtered indexes.

```sql
-- PostgreSQL (partial index)
CREATE INDEX idx_notifications_unread
ON notifications(user_id) WHERE is_read = false;

-- MySQL: no equivalent — use a composite index and accept the larger size
CREATE INDEX idx_notifications_user_unread
ON notifications(user_id, is_read);

-- SQL Server (filtered index — equivalent to PostgreSQL)
CREATE INDEX idx_notifications_unread
ON notifications(user_id) WHERE is_read = 0;
```

### BIGSERIAL and Sequences

PostgreSQL's `BIGSERIAL` is syntactic sugar over a `SEQUENCE` object. In MySQL and SQL Server, the auto-increment behavior is built into the column definition itself, not a separate object. This matters if you ever need to reset or share sequences across tables (rare, but worth knowing).

---

## Summary: Design Decisions at a Glance

| Decision | What was chosen | Why |
|---|---|---|
| Primary key type | `BIGSERIAL` | Future-proof; 64-bit prevents overflow |
| Soft deletes | `deleted_at TIMESTAMPTZ` | Recoverability and data integrity |
| Timestamp type | `TIMESTAMPTZ` | Timezone-aware; avoids silent bugs |
| Image storage | URL columns, not binary data | Images belong in object storage |
| Counter columns | Denormalized with triggers | Avoids expensive `COUNT(*)` at render time |
| Follow/Like tables | Composite PK, no surrogate id | Natural key is unique; saves storage |
| DM design | 3-table conversation model | Supports group chats without schema change |
| Notification type | `VARCHAR(50)` discriminator | Easy to add new types without migrations |
| Hashtag storage | Normalized into own table | Enables efficient "posts by tag" queries |
| Arrays | PostgreSQL `TEXT[]` | Co-locates images with post; simple queries |

---

> **Next chapter:** Querying the schema — writing the feed query, building follower timelines, and understanding `EXPLAIN ANALYZE` output to diagnose slow queries.
