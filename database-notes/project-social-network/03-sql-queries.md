# Social Network: Core SQL Queries

This chapter is where theory meets reality. You have your tables created, your indexes defined — now let's write the actual SQL that powers every feature in your app. Each query here is production-grade, explained line by line so you understand not just *what* it does but *why* it's written that way.

---

## 1. User Queries

### Find a User by Username or Email

```sql
SELECT id, username, email, display_name, avatar_url, bio, created_at
FROM users
WHERE LOWER(username) = LOWER($1)
   OR LOWER(email)    = LOWER($1);
```

**What it does:** Looks up a single user by either their username or email — useful for login and profile lookups.

**Why `LOWER()`?** SQL comparisons are case-sensitive by default. Without `LOWER()`, searching for `"Alice"` won't find a user stored as `"alice"`. Wrapping both sides in `LOWER()` normalises both the stored value and the input before comparing.

**Index that makes it fast:**

```sql
CREATE INDEX idx_users_lower_username ON users (LOWER(username));
CREATE INDEX idx_users_lower_email    ON users (LOWER(email));
```

These are *expression indexes* — PostgreSQL builds the index on the result of `LOWER(column)` so the lookup is O(log n) rather than a full table scan.

---

### Get a Full User Profile

```sql
SELECT
  u.*,
  COUNT(DISTINCT f_followers.follower_id)  AS follower_count,
  COUNT(DISTINCT f_following.following_id) AS following_count,
  (
    SELECT json_agg(recent)
    FROM (
      SELECT id, content, image_urls, created_at
      FROM posts
      WHERE user_id = u.id
        AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 5
    ) recent
  ) AS recent_posts
FROM users u
LEFT JOIN follows f_followers ON f_followers.following_id = u.id
LEFT JOIN follows f_following ON f_following.follower_id  = u.id
WHERE u.id = $1
GROUP BY u.id;
```

**What it does:** Returns everything about a user in one round-trip: their profile data, how many people follow them, how many they follow, and their 5 most recent posts.

**Why `COUNT(DISTINCT ...)`?** Each join can multiply rows. If a user has 100 followers and you join the `follows` table, you suddenly have 100 rows. `DISTINCT` collapses those back to a real count.

**Why a correlated subquery for posts?** The alternative is another `LEFT JOIN` on posts, which would explode the row count and make the `GROUP BY` extremely expensive. A subquery that returns JSON is cleaner and the database can execute it separately.

**Index that makes it fast:**

```sql
CREATE INDEX idx_follows_following_id ON follows (following_id);
CREATE INDEX idx_follows_follower_id  ON follows (follower_id);
CREATE INDEX idx_posts_user_created   ON posts (user_id, created_at DESC);
```

---

### Search Users by Username or Display Name

```sql
SELECT id, username, display_name, avatar_url,
       similarity(username, $1) AS score
FROM users
WHERE username    ILIKE '%' || $1 || '%'
   OR display_name ILIKE '%' || $1 || '%'
ORDER BY score DESC, username
LIMIT 20;
```

**What it does:** Powers the "find people" search box. `ILIKE` is PostgreSQL's case-insensitive `LIKE`. The `pg_trgm` extension adds the `similarity()` function so results closest to what you typed appear first.

**Setup required:**

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_users_username_trgm     ON users USING gin (username gin_trgm_ops);
CREATE INDEX idx_users_displayname_trgm  ON users USING gin (display_name gin_trgm_ops);
```

A GIN trigram index makes `ILIKE '%...%'` fast. Without this index, every `ILIKE` query does a full table scan — catastrophic on a table with millions of users. With it, the database narrows to a small candidate set before comparing.

---

### Get Mutual Followers Between Two Users

```sql
SELECT u.id, u.username, u.avatar_url
FROM follows f1
JOIN follows f2
  ON f1.follower_id = f2.follower_id
JOIN users u
  ON u.id = f1.follower_id
WHERE f1.following_id = $1   -- user A
  AND f2.following_id = $2   -- user B
ORDER BY u.username;
```

**What it does:** Finds everyone who follows both user A and user B — the "people you both know" feature.

**Why self-join on `follows`?** Think of it as: *give me all follower IDs in user A's followers list that also appear in user B's followers list.* Joining `follows` to itself once for each user, then matching on the shared `follower_id`, is the direct relational way to express that intersection.

---

## 2. Feed Queries (The Hard One)

The news feed is the most complex query in a social network. Here it is in full, then broken apart line by line.

```sql
SELECT
  p.*,
  u.username,
  u.avatar_url,
  COUNT(DISTINCT l.user_id)  AS like_count,
  COUNT(DISTINCT c.id)       AS comment_count,
  EXISTS(
    SELECT 1 FROM likes
    WHERE user_id = $1 AND post_id = p.id
  ) AS i_liked
FROM posts p
JOIN users u
  ON p.user_id = u.id
JOIN follows f
  ON f.following_id = p.user_id
  AND f.follower_id = $1
LEFT JOIN likes l
  ON l.post_id = p.id
LEFT JOIN comments c
  ON c.post_id = p.id
  AND c.deleted_at IS NULL
WHERE p.deleted_at IS NULL
  AND p.is_public = true
GROUP BY p.id, u.username, u.avatar_url
ORDER BY p.created_at DESC
LIMIT 20 OFFSET $2;
```

**Line-by-line explanation:**

| Fragment | Purpose |
|---|---|
| `SELECT p.*` | All columns from the post itself (content, image_urls, created_at, etc.) |
| `u.username, u.avatar_url` | Author info — avoids a second query from the application layer |
| `COUNT(DISTINCT l.user_id) AS like_count` | How many unique users liked this post. `DISTINCT` is necessary because the `LEFT JOIN` on comments multiplies rows |
| `COUNT(DISTINCT c.id) AS comment_count` | How many non-deleted comments exist |
| `EXISTS(SELECT 1 FROM likes WHERE user_id = $1 AND post_id = p.id)` | Boolean: did *you* specifically like this post? `EXISTS` stops as soon as it finds one matching row — extremely cheap |
| `FROM posts p` | Posts is the driving table |
| `JOIN users u ON p.user_id = u.id` | Attach author info — INNER JOIN so posts without a valid author are excluded (shouldn't happen, but safe) |
| `JOIN follows f ON f.following_id = p.user_id AND f.follower_id = $1` | **The feed filter.** This INNER JOIN keeps only posts whose author is followed by you (`$1`). Posts from people you don't follow simply have no matching row in `follows` and are discarded |
| `LEFT JOIN likes l ON l.post_id = p.id` | Attach all likes. LEFT JOIN keeps posts with zero likes |
| `LEFT JOIN comments c ON c.post_id = p.id AND c.deleted_at IS NULL` | Attach non-deleted comments. The soft-delete filter goes in the ON clause, not WHERE, so posts with zero non-deleted comments still appear |
| `WHERE p.deleted_at IS NULL AND p.is_public = true` | Exclude deleted posts and private posts |
| `GROUP BY p.id, u.username, u.avatar_url` | Collapse all the joined rows (one per like, one per comment) back to one row per post |
| `ORDER BY p.created_at DESC` | Newest posts first |
| `LIMIT 20 OFFSET $2` | Pagination. `$2` is `page_number * 20` |

**Indexes that make the feed fast:**

```sql
CREATE INDEX idx_follows_follower_following ON follows (follower_id, following_id);
CREATE INDEX idx_posts_user_created         ON posts (user_id, created_at DESC)
  WHERE deleted_at IS NULL AND is_public = true;
CREATE INDEX idx_likes_post_id              ON likes (post_id);
CREATE INDEX idx_comments_post_deleted      ON comments (post_id) WHERE deleted_at IS NULL;
```

The partial index on `posts` (`WHERE deleted_at IS NULL AND is_public = true`) is a major win — it only indexes rows your query will actually use, keeping the index small and fast.

---

## 3. Post Queries

### Create a Post with Hashtag Parsing

Application code extracts hashtags first; then you insert in a transaction:

```sql
-- Step 1: Insert the post
INSERT INTO posts (user_id, content, image_urls, is_public)
VALUES ($1, $2, $3, $4)
RETURNING id;

-- Step 2: Upsert each hashtag (idempotent)
INSERT INTO hashtags (name)
VALUES ($1)
ON CONFLICT (name) DO NOTHING
RETURNING id;

-- Step 3: Link post to hashtags
INSERT INTO post_hashtags (post_id, hashtag_id)
VALUES ($post_id, $hashtag_id)
ON CONFLICT DO NOTHING;
```

**Why `ON CONFLICT DO NOTHING`?** Hashtags like `#food` are shared across thousands of posts. You never want to `INSERT` and then crash because `#food` already exists. `ON CONFLICT DO NOTHING` makes the operation idempotent — safe to run multiple times with the same result.

---

### Get Post Detail with Author, Likes, and Top Comments

```sql
SELECT
  p.*,
  u.username,
  u.display_name,
  u.avatar_url,
  COUNT(DISTINCT l.user_id)  AS like_count,
  (
    SELECT json_agg(top_comments ORDER BY (top_comments).created_at ASC)
    FROM (
      SELECT c.id, c.content, c.created_at,
             cu.username, cu.avatar_url
      FROM comments c
      JOIN users cu ON cu.id = c.user_id
      WHERE c.post_id = p.id AND c.deleted_at IS NULL
      ORDER BY c.created_at ASC
      LIMIT 3
    ) top_comments
  ) AS top_comments
FROM posts p
JOIN users u ON u.id = p.user_id
LEFT JOIN likes l ON l.post_id = p.id
WHERE p.id = $1
  AND p.deleted_at IS NULL
GROUP BY p.id, u.username, u.display_name, u.avatar_url;
```

**Why top comments as a subquery?** Joining comments inline would multiply your rows and require complex deduplication. A subquery that returns JSON is clean, predictable, and the 3-row limit means it's always fast regardless of how many total comments exist.

---

### Get Trending Posts (Most Likes in Last 24 Hours)

```sql
SELECT p.*, u.username, u.avatar_url,
       COUNT(l.user_id) AS like_count
FROM posts p
JOIN users u ON u.id = p.user_id
JOIN likes l ON l.post_id = p.id
WHERE l.created_at >= NOW() - INTERVAL '24 hours'
  AND p.deleted_at IS NULL
  AND p.is_public = true
GROUP BY p.id, u.username, u.avatar_url
ORDER BY like_count DESC
LIMIT 10;
```

**Why filter on `l.created_at`?** A post from last month with 10,000 total likes should not beat a new post from 2 hours ago with 500 likes. You want recency of *engagement*, not total engagement.

**Index that makes it fast:**

```sql
CREATE INDEX idx_likes_created_at ON likes (created_at DESC);
```

---

### Get Posts by Hashtag

```sql
SELECT p.*, u.username, u.avatar_url
FROM posts p
JOIN users u ON u.id = p.user_id
JOIN post_hashtags ph ON ph.post_id = p.id
JOIN hashtags h ON h.id = ph.hashtag_id
WHERE LOWER(h.name) = LOWER($1)
  AND p.deleted_at IS NULL
  AND p.is_public = true
ORDER BY p.created_at DESC
LIMIT 20 OFFSET $2;
```

**Index:**

```sql
CREATE INDEX idx_post_hashtags_hashtag_id ON post_hashtags (hashtag_id);
CREATE INDEX idx_hashtags_lower_name ON hashtags (LOWER(name));
```

---

## 4. Follow Queries

### Follow a User

```sql
INSERT INTO follows (follower_id, following_id)
VALUES ($1, $2)
ON CONFLICT (follower_id, following_id) DO NOTHING;
```

**Why `ON CONFLICT DO NOTHING`?** Users can tap "Follow" multiple times (double-click, network retry, etc.). Without conflict handling this crashes with a unique constraint violation. With it, the second attempt silently succeeds — the end state is the same.

The table needs a unique constraint for this to work:

```sql
ALTER TABLE follows ADD CONSTRAINT uq_follows UNIQUE (follower_id, following_id);
```

---

### Unfollow a User

```sql
DELETE FROM follows
WHERE follower_id  = $1
  AND following_id = $2;
```

Simple. The compound index on `(follower_id, following_id)` makes this a direct lookup rather than a scan.

---

### Check if Following

```sql
SELECT EXISTS(
  SELECT 1 FROM follows
  WHERE follower_id  = $1
    AND following_id = $2
) AS is_following;
```

`EXISTS` is the right tool here — it stops scanning the moment it finds one row. Never use `COUNT(*) > 0` for a boolean check; it reads all matching rows unnecessarily.

---

### Get Followers List with Pagination

```sql
SELECT u.id, u.username, u.display_name, u.avatar_url,
       f.created_at AS followed_at
FROM follows f
JOIN users u ON u.id = f.follower_id
WHERE f.following_id = $1
ORDER BY f.created_at DESC
LIMIT 20 OFFSET $2;
```

**Get Following List with Pagination** — swap the join side:

```sql
SELECT u.id, u.username, u.display_name, u.avatar_url,
       f.created_at AS followed_at
FROM follows f
JOIN users u ON u.id = f.following_id
WHERE f.follower_id = $1
ORDER BY f.created_at DESC
LIMIT 20 OFFSET $2;
```

Both queries use the same `follows` table but filter on opposite columns. The compound indexes on `(following_id)` and `(follower_id)` each serve one query.

---

## 5. Like Queries

### Like a Post (Upsert Pattern)

```sql
INSERT INTO likes (user_id, post_id)
VALUES ($1, $2)
ON CONFLICT (user_id, post_id) DO NOTHING;
```

### Unlike a Post

```sql
DELETE FROM likes
WHERE user_id = $1 AND post_id = $2;
```

**Why not a toggle?** A toggle in SQL requires a transaction with a SELECT then INSERT or DELETE — two round-trips. The application layer is simpler: the "like" button calls the INSERT endpoint; the "unlike" button calls the DELETE endpoint. Clean, explicit, no race conditions.

---

### Get Users Who Liked a Post

```sql
SELECT u.id, u.username, u.display_name, u.avatar_url,
       l.created_at AS liked_at
FROM likes l
JOIN users u ON u.id = l.user_id
WHERE l.post_id = $1
ORDER BY l.created_at DESC
LIMIT 50 OFFSET $2;
```

**Index:**

```sql
CREATE INDEX idx_likes_post_user ON likes (post_id, user_id);
```

---

## 6. Notification Queries

### Create a Notification

```sql
INSERT INTO notifications (recipient_id, actor_id, type, entity_type, entity_id)
VALUES ($1, $2, $3, $4, $5);
```

`type` is an ENUM: `'follow'`, `'like'`, `'comment'`, `'mention'`.  
`entity_type` is `'post'` or `'comment'` and `entity_id` points to the relevant row.

This insert happens inside the same transaction as the action that triggered it. If user A likes post 42, the `likes` insert and this notification insert happen together — either both succeed or neither does.

---

### Get Unread Notifications for a User

```sql
SELECT
  n.*,
  u.username   AS actor_username,
  u.avatar_url AS actor_avatar
FROM notifications n
JOIN users u ON u.id = n.actor_id
WHERE n.recipient_id = $1
  AND n.read_at IS NULL
ORDER BY n.created_at DESC
LIMIT 20;
```

**Why `read_at IS NULL` instead of a boolean `is_read`?** A timestamp gives you more: you know exactly when the user read each notification, which is useful for analytics and for the UI ("read 3 minutes ago").

**Index:**

```sql
CREATE INDEX idx_notifications_recipient_unread
  ON notifications (recipient_id, created_at DESC)
  WHERE read_at IS NULL;
```

This partial index only includes unread rows — which is exactly what the query filters on. As users read notifications, those rows fall out of the index automatically.

---

### Mark Notifications as Read

```sql
-- Mark all as read
UPDATE notifications
SET read_at = NOW()
WHERE recipient_id = $1
  AND read_at IS NULL;

-- Mark one as read
UPDATE notifications
SET read_at = NOW()
WHERE id = $1
  AND recipient_id = $2;  -- security: ensure the recipient owns it
```

The `recipient_id` check in the single-read query is important. Without it, any user who guesses a notification ID could mark it read — always scope updates to the authenticated user.

---

## 7. Search Queries

### Full-Text Search on Posts

```sql
SELECT p.*, u.username, u.avatar_url,
       ts_rank(to_tsvector('english', p.content), query) AS rank
FROM posts p
JOIN users u ON u.id = p.user_id,
  to_tsquery('english', $1) query
WHERE to_tsvector('english', p.content) @@ query
  AND p.deleted_at IS NULL
  AND p.is_public = true
ORDER BY rank DESC
LIMIT 20;
```

**What it does:** Finds posts containing the searched words in any form (searches for "running" also finds "run", "runs"). PostgreSQL's built-in full-text search handles stemming and stop-word removal automatically.

**The `@@` operator** asks: "does this document match this query?"  
**`ts_rank()`** scores how well each result matches — closer matches rank higher.

**Index that makes it fast:**

```sql
CREATE INDEX idx_posts_fulltext
  ON posts USING gin (to_tsvector('english', content))
  WHERE deleted_at IS NULL AND is_public = true;
```

A GIN index on the `tsvector` expression means the planner doesn't re-compute it for every row at query time.

---

### Fuzzy User Search

```sql
SELECT id, username, display_name, avatar_url,
       similarity(username || ' ' || COALESCE(display_name, ''), $1) AS score
FROM users
WHERE username    % $1
   OR display_name % $1
ORDER BY score DESC
LIMIT 10;
```

**What `%` means here:** With `pg_trgm` loaded, `%` is the similarity threshold operator. It returns `true` when two strings share enough trigrams to be considered "similar" — the threshold is configurable with `pg_trgm.similarity_threshold` (default 0.3).

**Why concatenate `username || ' ' || display_name` for scoring?** A search for `"John Doe"` should score a user whose username is `johndoe` and display name is `John Doe` very highly. Concatenating gives the similarity function more signal.

---

## Index Summary

Here is every index referenced in this chapter in one place:

```sql
-- Users
CREATE INDEX idx_users_lower_username    ON users (LOWER(username));
CREATE INDEX idx_users_lower_email       ON users (LOWER(email));
CREATE INDEX idx_users_username_trgm     ON users USING gin (username gin_trgm_ops);
CREATE INDEX idx_users_displayname_trgm  ON users USING gin (display_name gin_trgm_ops);

-- Follows
CREATE INDEX idx_follows_follower_id     ON follows (follower_id);
CREATE INDEX idx_follows_following_id    ON follows (following_id);

-- Posts
CREATE INDEX idx_posts_user_created      ON posts (user_id, created_at DESC)
  WHERE deleted_at IS NULL AND is_public = true;
CREATE INDEX idx_posts_fulltext          ON posts USING gin (to_tsvector('english', content))
  WHERE deleted_at IS NULL AND is_public = true;

-- Likes
CREATE INDEX idx_likes_post_user         ON likes (post_id, user_id);
CREATE INDEX idx_likes_created_at        ON likes (created_at DESC);

-- Comments
CREATE INDEX idx_comments_post_deleted   ON comments (post_id) WHERE deleted_at IS NULL;

-- Hashtags
CREATE INDEX idx_hashtags_lower_name     ON hashtags (LOWER(name));
CREATE INDEX idx_post_hashtags_hashtag   ON post_hashtags (hashtag_id);

-- Notifications
CREATE INDEX idx_notifications_recipient ON notifications (recipient_id, created_at DESC)
  WHERE read_at IS NULL;
```

---

## Patterns to Remember

**Soft deletes everywhere:** Filter with `WHERE deleted_at IS NULL`, not `WHERE is_deleted = false`. A timestamp lets you restore deleted content and gives you an audit trail.

**`ON CONFLICT DO NOTHING` for idempotent writes:** Follows, likes, hashtag links — all can be inserted safely multiple times without crashing.

**`EXISTS` over `COUNT > 0` for boolean checks:** `EXISTS` short-circuits; `COUNT` reads every matching row.

**Subqueries returning JSON for nested data:** Avoids row-multiplication explosions from multiple joins. `json_agg()` lets you pack a list of child rows directly into a column.

**Partial indexes on common filter columns:** If every query filters `WHERE deleted_at IS NULL`, only index those rows. Smaller index, faster lookups, less maintenance overhead.

**Scope every write to the authenticated user:** Always include `AND user_id = $current_user` or `AND recipient_id = $current_user` in UPDATEs and DELETEs. Never trust the ID coming from the request body alone.
