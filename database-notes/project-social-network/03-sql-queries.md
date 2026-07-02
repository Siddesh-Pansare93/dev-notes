# Social Network: Core SQL Queries

Ab tak tumne tables bana liye, indexes define kar liye — ab time hai theory ko reality mein badalne ka. Is chapter mein hum wahi actual SQL likhenge jo tumhare app ke har feature ko power karta hai. Har query production-grade hai, aur line-by-line explain ki gayi hai taaki tumhe sirf *kya* nahi, balki *kyun* bhi samajh aaye.

---

## 1. User Queries

### Username ya Email se User Dhoondo

```sql
SELECT id, username, email, display_name, avatar_url, bio, created_at
FROM users
WHERE LOWER(username) = LOWER($1)
   OR LOWER(email)    = LOWER($1);
```

**Kya karta hai?** Ek single user ko uske username ya email se dhoond nikaalta hai — login aur profile lookup ke liye kaam aata hai.

**`LOWER()` kyun?** SQL comparisons by default case-sensitive hote hain. `LOWER()` ke bina, `"Alice"` search karoge toh database mein `"alice"` waala user nahi milega. Dono sides ko `LOWER()` mein wrap karke hum stored value aur input dono ko normalise kar dete hain compare karne se pehle.

**Index jo isse fast banata hai:**

```sql
CREATE INDEX idx_users_lower_username ON users (LOWER(username));
CREATE INDEX idx_users_lower_email    ON users (LOWER(email));
```

Ye *expression indexes* hain — PostgreSQL `LOWER(column)` ke result par index banata hai, isliye lookup O(log n) hota hai, na ki full table scan.

> [!tip]
> Socho Zomato pe login karte waqt agar tum apna email `SIDDESH@GMAIL.COM` CAPS mein daal do, toh bhi login hona chahiye na? Yahi kaam `LOWER()` karta hai.

---

### Poora User Profile Nikaalo

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

**Kya karta hai?** Ek hi round-trip mein user ke baare mein sab kuch de deta hai: profile data, kitne followers hain, kitno ko follow karta hai, aur uske 5 latest posts.

**`COUNT(DISTINCT ...)` kyun?** Har join rows ko multiply kar sakta hai. Agar user ke 100 followers hain aur tum `follows` table join karo, toh achanak 100 rows aa jaayengi. `DISTINCT` unhe wapas ek real count mein collapse kar deta hai.

**Posts ke liye correlated subquery kyun?** Alternative hai posts par ek aur `LEFT JOIN` lagana, jo row count ko explode kar dega aur `GROUP BY` ko bahut expensive bana dega. JSON return karne waali subquery cleaner hai aur database use alag se execute kar sakta hai.

**Index jo isse fast banata hai:**

```sql
CREATE INDEX idx_follows_following_id ON follows (following_id);
CREATE INDEX idx_follows_follower_id  ON follows (follower_id);
CREATE INDEX idx_posts_user_created   ON posts (user_id, created_at DESC);
```

---

### Username ya Display Name se Users Search Karo

```sql
SELECT id, username, display_name, avatar_url,
       similarity(username, $1) AS score
FROM users
WHERE username    ILIKE '%' || $1 || '%'
   OR display_name ILIKE '%' || $1 || '%'
ORDER BY score DESC, username
LIMIT 20;
```

**Kya karta hai?** "Find people" search box ko power deta hai. `ILIKE` PostgreSQL ka case-insensitive `LIKE` hai. `pg_trgm` extension `similarity()` function add karta hai taaki jo results tumhare typed text se sabse zyada milte-julte hain, woh top pe aayein.

**Setup chahiye:**

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_users_username_trgm     ON users USING gin (username gin_trgm_ops);
CREATE INDEX idx_users_displayname_trgm  ON users USING gin (display_name gin_trgm_ops);
```

GIN trigram index `ILIKE '%...%'` ko fast bana deta hai. Ye index na ho toh har `ILIKE` query full table scan karegi — lakhon users waale table pe ye disaster hai. Index ke saath, database compare karne se pehle ek chhota candidate set nikaal leta hai.

> [!info]
> Ye bilkul Swiggy ke restaurant search jaisa hai — jab tum "biryani" type karte ho, wo exact match nahi dhoondta, balki closest matches sabse upar dikhata hai.

---

### Do Users Ke Beech Mutual Followers Nikaalo

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

**Kya karta hai?** Wo sab dhoondta hai jo user A aur user B, dono ko follow karte hain — "logo jinhe tum dono jaante ho" waala feature.

**`follows` par self-join kyun?** Isko aise socho: *mujhe user A ki followers list mein se un follower IDs do jo user B ki followers list mein bhi hain.* `follows` ko khud se do baar join karke (ek har user ke liye), aur phir shared `follower_id` par match karke — ye is intersection ko express karne ka direct relational tareeka hai.

---

## 2. Feed Queries (The Hard One)

News feed kisi bhi social network ki sabse complex query hoti hai. Pehle poori query dekho, phir line-by-line samjhenge.

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
| `SELECT p.*` | Post ke saare columns (content, image_urls, created_at, etc.) |
| `u.username, u.avatar_url` | Author ki info — application layer se dusri query karne se bachaata hai |
| `COUNT(DISTINCT l.user_id) AS like_count` | Kitne unique users ne is post ko like kiya. `DISTINCT` zaruri hai kyunki comments waala `LEFT JOIN` rows multiply karta hai |
| `COUNT(DISTINCT c.id) AS comment_count` | Kitne non-deleted comments hain |
| `EXISTS(SELECT 1 FROM likes WHERE user_id = $1 AND post_id = p.id)` | Boolean: kya *tumne* khud is post ko like kiya? `EXISTS` pehli matching row milte hi ruk jaata hai — bahut cheap |
| `FROM posts p` | Posts driving table hai |
| `JOIN users u ON p.user_id = u.id` | Author info attach karo — INNER JOIN taaki bina valid author waale posts exclude ho jaayein (aisa hona nahi chahiye, par safe hai) |
| `JOIN follows f ON f.following_id = p.user_id AND f.follower_id = $1` | **Feed ka asli filter.** Ye INNER JOIN sirf unhi posts ko rakhta hai jinke author ko tum (`$1`) follow karte ho. Jinko tum follow nahi karte unke posts ke liye `follows` mein koi matching row nahi hoti, so wo discard ho jaate hain |
| `LEFT JOIN likes l ON l.post_id = p.id` | Saare likes attach karo. LEFT JOIN se zero-like posts bhi dikhte hain |
| `LEFT JOIN comments c ON c.post_id = p.id AND c.deleted_at IS NULL` | Non-deleted comments attach karo. Soft-delete filter `ON` clause mein hai, `WHERE` mein nahi — taaki zero non-deleted comments waale posts bhi appear karein |
| `WHERE p.deleted_at IS NULL AND p.is_public = true` | Deleted aur private posts exclude karo |
| `GROUP BY p.id, u.username, u.avatar_url` | Saari joined rows (har like ki, har comment ki) ko wapas ek row-per-post mein collapse karo |
| `ORDER BY p.created_at DESC` | Sabse naye posts pehle |
| `LIMIT 20 OFFSET $2` | Pagination. `$2` hota hai `page_number * 20` |

**Indexes jo feed ko fast banate hain:**

```sql
CREATE INDEX idx_follows_follower_following ON follows (follower_id, following_id);
CREATE INDEX idx_posts_user_created         ON posts (user_id, created_at DESC)
  WHERE deleted_at IS NULL AND is_public = true;
CREATE INDEX idx_likes_post_id              ON likes (post_id);
CREATE INDEX idx_comments_post_deleted      ON comments (post_id) WHERE deleted_at IS NULL;
```

`posts` par ye partial index (`WHERE deleted_at IS NULL AND is_public = true`) ek badi win hai — ye sirf unhi rows ko index karta hai jinki tumhari query ko zarurat hai, isse index chhota aur fast rehta hai.

> [!tip]
> Isko Instagram ke feed algorithm jaisa socho — tumhe sirf unhi logo ke posts dikhte hain jinhe tum follow karte ho, aur wo bhi newest-first order mein.

---

## 3. Post Queries

### Hashtag Parsing Ke Saath Post Banao

Application code pehle hashtags extract karta hai; phir tum ek transaction mein insert karte ho:

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

**`ON CONFLICT DO NOTHING` kyun?** `#food` jaise hashtags hazaaron posts mein share hote hain. Tum kabhi nahi chahoge ki `INSERT` karo aur crash ho jaaye kyunki `#food` pehle se exist karta hai. `ON CONFLICT DO NOTHING` operation ko idempotent bana deta hai — same result ke saath multiple baar chalana safe hai.

---

### Author, Likes, aur Top Comments Ke Saath Post Detail Nikaalo

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

**Top comments subquery mein kyun?** Comments ko inline join karne se rows multiply ho jaayengi aur complex deduplication chahiye hogi. JSON return karne waali subquery clean, predictable hai, aur 3-row limit ka matlab hai ki total comments chahe jitne bhi hon, ye hamesha fast rahegi.

---

### Trending Posts Nikaalo (Last 24 Hours Mein Sabse Zyada Likes)

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

**`l.created_at` par filter kyun?** Pichle mahine ka post jisko 10,000 total likes mile hain, usko 2 ghante pehle post hue us naye post se nahi jeetna chahiye jisko 500 likes mile hain. Tumhe *engagement ki recency* chahiye, total engagement nahi.

**Index jo isse fast banata hai:**

```sql
CREATE INDEX idx_likes_created_at ON likes (created_at DESC);
```

> [!info]
> Ye bilkul CRED ke "trending rewards" jaisa hai — jo abhi-abhi popular ho raha hai wo dikhta hai, na ki jo mahino pehle ek baar bahut popular tha.

---

### Hashtag Se Posts Nikaalo

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

### Kisi User Ko Follow Karo

```sql
INSERT INTO follows (follower_id, following_id)
VALUES ($1, $2)
ON CONFLICT (follower_id, following_id) DO NOTHING;
```

**`ON CONFLICT DO NOTHING` kyun?** Users "Follow" button ko multiple baar tap kar sakte hain (double-click, network retry, etc.). Conflict handling ke bina ye unique constraint violation ke saath crash ho jaayega. Isके साथ, second attempt silently succeed hota hai — end state same rehta hai.

Iske liye table mein unique constraint chahiye:

```sql
ALTER TABLE follows ADD CONSTRAINT uq_follows UNIQUE (follower_id, following_id);
```

---

### Kisi User Ko Unfollow Karo

```sql
DELETE FROM follows
WHERE follower_id  = $1
  AND following_id = $2;
```

Simple hai. `(follower_id, following_id)` par compound index isse scan ki jagah direct lookup bana deta hai.

---

### Check Karo Ki Follow Kar Rahe Ho Ya Nahi

```sql
SELECT EXISTS(
  SELECT 1 FROM follows
  WHERE follower_id  = $1
    AND following_id = $2
) AS is_following;
```

Yahan `EXISTS` hi sahi tool hai — ye pehli matching row milte hi scan karna band kar deta hai. Boolean check ke liye kabhi `COUNT(*) > 0` use mat karo; ye zarurat se zyada saari matching rows padh leta hai.

---

### Pagination Ke Saath Followers List Nikaalo

```sql
SELECT u.id, u.username, u.display_name, u.avatar_url,
       f.created_at AS followed_at
FROM follows f
JOIN users u ON u.id = f.follower_id
WHERE f.following_id = $1
ORDER BY f.created_at DESC
LIMIT 20 OFFSET $2;
```

**Following List with Pagination** — join side switch karo:

```sql
SELECT u.id, u.username, u.display_name, u.avatar_url,
       f.created_at AS followed_at
FROM follows f
JOIN users u ON u.id = f.following_id
WHERE f.follower_id = $1
ORDER BY f.created_at DESC
LIMIT 20 OFFSET $2;
```

Dono queries same `follows` table use karti hain par opposite columns par filter karti hain. `(following_id)` aur `(follower_id)` par compound indexes har query ko alag-alag serve karte hain.

---

## 5. Like Queries

### Post Ko Like Karo (Upsert Pattern)

```sql
INSERT INTO likes (user_id, post_id)
VALUES ($1, $2)
ON CONFLICT (user_id, post_id) DO NOTHING;
```

### Post Ko Unlike Karo

```sql
DELETE FROM likes
WHERE user_id = $1 AND post_id = $2;
```

**Toggle kyun nahi?** SQL mein toggle ke liye transaction chahiye hoga jisme SELECT phir INSERT ya DELETE ho — matlab do round-trips. Application layer mein ye simpler hai: "like" button INSERT endpoint call karta hai; "unlike" button DELETE endpoint call karta hai. Clean, explicit, koi race conditions nahi.

---

### Post Ko Like Karne Waale Users Nikaalo

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

### Notification Banao

```sql
INSERT INTO notifications (recipient_id, actor_id, type, entity_type, entity_id)
VALUES ($1, $2, $3, $4, $5);
```

`type` ek ENUM hai: `'follow'`, `'like'`, `'comment'`, `'mention'`.
`entity_type` `'post'` ya `'comment'` hota hai aur `entity_id` relevant row ko point karta hai.

Ye insert usi transaction ke andar hota hai jis action ne isko trigger kiya. Agar user A post 42 ko like karta hai, toh `likes` waala insert aur ye notification waala insert saath mein hote hain — ya toh dono succeed karte hain, ya koi nahi.

---

### User Ke Unread Notifications Nikaalo

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

**Boolean `is_read` ki jagah `read_at IS NULL` kyun?** Timestamp tumhe zyada deta hai: tumhe pata chalta hai ki user ne exactly kab notification padha — jo analytics ke liye aur UI ke liye ("3 minute pehle padha") useful hai.

**Index:**

```sql
CREATE INDEX idx_notifications_recipient_unread
  ON notifications (recipient_id, created_at DESC)
  WHERE read_at IS NULL;
```

Ye partial index sirf unread rows include karta hai — jo exactly wahi hai jispar query filter karti hai. Jaise-jaise users notifications padhte hain, wo rows automatically index se bahar nikal jaati hain.

---

### Notifications Ko Read Mark Karo

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

Single-read query mein `recipient_id` check bahut important hai. Iske bina, koi bhi user jo notification ID guess kar le, use read mark kar sakta hai — updates ko hamesha authenticated user tak hi scope karo.

> [!warning]
> Ye security ka bahut common bug hai. Socho koi Ola app mein sirf `ride_id` bhejke kisi aur ki ride cancel kar de — isliye har UPDATE/DELETE mein current user ka check hona zaruri hai.

---

## 7. Search Queries

### Posts Par Full-Text Search

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

**Kya karta hai?** Un posts ko dhoondta hai jinme searched words kisi bhi form mein hon (jaise "running" search karne pe "run", "runs" bhi mil jaate hain). PostgreSQL ka built-in full-text search stemming aur stop-word removal automatically handle karta hai.

**`@@` operator** poochta hai: "kya ye document is query se match karta hai?"
**`ts_rank()`** score karta hai ki har result kitna acha match karta hai — jitna close match, utna high rank.

**Index jo isse fast banata hai:**

```sql
CREATE INDEX idx_posts_fulltext
  ON posts USING gin (to_tsvector('english', content))
  WHERE deleted_at IS NULL AND is_public = true;
```

`tsvector` expression par GIN index ka matlab hai ki planner ko har row ke liye query time pe dobara compute nahi karna padta.

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

**Yahan `%` ka matlab kya hai:** `pg_trgm` load hone ke saath, `%` similarity threshold operator hai. Ye `true` return karta hai jab do strings ke beech itne trigrams common hon ki unhe "similar" mana ja sake — threshold `pg_trgm.similarity_threshold` (default 0.3) se configurable hai.

**Scoring ke liye `username || ' ' || display_name` concatenate kyun karein?** `"John Doe"` search karne par us user ko bahut high score milna chahiye jiska username `johndoe` hai aur display name `John Doe` hai. Concatenate karne se similarity function ko zyada signal milta hai.

---

## Index Summary

Is chapter mein reference kiye gaye saare indexes ek jagah:

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

## Yaad Rakhne Waale Patterns

**Soft deletes har jagah:** `WHERE is_deleted = false` nahi, `WHERE deleted_at IS NULL` se filter karo. Timestamp tumhe deleted content restore karne deta hai aur audit trail bhi deta hai.

**Idempotent writes ke liye `ON CONFLICT DO NOTHING`:** Follows, likes, hashtag links — ye sab crash hue bina multiple baar safely insert kiye ja sakte hain.

**Boolean checks ke liye `COUNT > 0` se `EXISTS` behtar:** `EXISTS` short-circuit karta hai; `COUNT` har matching row padhta hai.

**Nested data ke liye JSON return karne waali subqueries:** Multiple joins se hone waale row-multiplication explosions se bachaata hai. `json_agg()` se tum child rows ki poori list ek column mein pack kar sakte ho.

**Common filter columns par partial indexes:** Agar har query `WHERE deleted_at IS NULL` filter karti hai, toh sirf wahi rows index karo. Chhota index, faster lookups, kam maintenance overhead.

**Har write ko authenticated user tak scope karo:** UPDATEs aur DELETEs mein hamesha `AND user_id = $current_user` ya `AND recipient_id = $current_user` include karo. Request body se aayi ID par kabhi bharosa mat karo.

## Key Takeaways

- `LOWER()` expression indexes se case-insensitive lookups fast ho jaate hain
- `COUNT(DISTINCT ...)` joins ke row-multiplication problem ko fix karta hai
- Nested/child data ke liye JSON subqueries use karo, extra joins ki jagah — row explosion se bachega
- `pg_trgm` extension `ILIKE` aur fuzzy search ko production-scale par fast bana deta hai
- Feed query ka core trick: `follows` table ke saath INNER JOIN hi feed filter hai
- `ON CONFLICT DO NOTHING` se writes idempotent (safe-to-retry) ban jaate hain
- Boolean checks ke liye hamesha `EXISTS` use karo, `COUNT(*) > 0` nahi
- Partial indexes (`WHERE deleted_at IS NULL`) sirf relevant rows index karke storage aur speed dono bachate hain
- Har UPDATE/DELETE mein authenticated user ka ownership check karna security ke liye non-negotiable hai
