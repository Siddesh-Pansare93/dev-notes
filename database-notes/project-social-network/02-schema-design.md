# Chapter 2: Social Network — Database Schema Design

> **Is chapter ka goal:** Har table, har column, aur har design decision ko step-by-step samjhna — ek real social network database ke liye. Chapter khatam hote hote tum kisi bhi production schema ko dekh ke samajh paoge ki cheezein *waise kyun* hain — sirf *kya* hain woh nahi.

---

## Bada Picture

Ek `CREATE TABLE` likhne se pehle khud se poocho: *yeh application actually karti kya hai?*

Ek social network ko yeh sab chahiye:

- User accounts aur profiles store karna
- Users ko posts publish karne dena (images ke saath)
- Users ko ek dusre ko follow karne dena
- Users ko posts like aur comment karne dena
- Posts ko hashtags se organize karna
- Users ko notify karna jab kuch relevant ho
- Private direct messages support karna

Har bullet point ka matlab hai ek table. Yeh coincidence nahi hai — achha schema design shuru hota hai apne domain ke **nouns** (users, posts, follows) list karke, aur unke beech ke **relationships** samajh ke (ek user *ke paas hote hain kai* posts, ek post *ke paas hote hain kai* likes).

Zomato ka example lo: restaurant, order, aur menu-item — sab alag-alag nouns hain, aur unke beech relationships hain (ek restaurant ke paas kai orders, ek order ke andar kai items). Bilkul waisa hi yahan bhi hoga.

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

### Column-by-column reasoning — kyun har cheez waisi hai?

**`id BIGSERIAL PRIMARY KEY`**
`BIGSERIAL` use karo (64-bit auto-incrementing integer) plain `SERIAL` (32-bit) ki jagah. Ek 32-bit integer max 2.1 billion rows tak jaata hai. Sunne mein bahut lagta hai, lekin socho — Instagram ke paas 1 billion users the aur har user ke multiple tables mein rows ho sakti hain. `BIGSERIAL` tumhe 9.2 *quintillion* rows deta hai — future-proof, aur cost almost zero.

**`email VARCHAR(255) NOT NULL UNIQUE`**
`255` characters RFC 5321 ka maximum hai email address ke liye. `NOT NULL` isliye kyunki email ke bina account verify ya recover nahi ho sakta. `UNIQUE` isliye kyunki ek email exactly ek account se map hona chahiye — yeh tumhara de-facto login identifier hai. `UNIQUE` constraint automatically ek B-tree index bhi bana deta hai, toh "find user by email" instant ho jaata hai.

**`username VARCHAR(50) NOT NULL UNIQUE`**
Email se chota (50 chars) kyunki username URLs mein dikhta hai (`/profile/johndoe`) aur UI mein har jagah. `UNIQUE` isliye kyunki do users ek handle share nahi kar sakte. Limit tight rakho — bahut lambe usernames URLs ko ugly bana dete hain aur UI layout tod dete hain.

**`display_name VARCHAR(100)` — nullable**
Yeh woh human-readable naam hai jo UI mein dikhta hai ("John Doe"). *Nullable* hai kyunki ho sakta hai signup ke time collect na karo. Unique hone ki bhi zarurat nahi — bahut saare real logon ka naam same hota hai.

**`bio TEXT` — nullable**
PostgreSQL mein `TEXT` ki koi practical length limit nahi hoti. `VARCHAR(160)` bhi kaam karta (Twitter ka purana limit), lekin `TEXT` simpler hai aur chhote strings ke liye storage cost same hi hai. Nullable hai kyunki optional profile info hai.

**`avatar_url TEXT` aur `website TEXT`**
Image ka *URL* store karo, image khud nahi. Images object storage mein rehti hain (S3, Cloudflare R2). URLs kaafi lambe ho sakte hain (signed URLs, CDN paths), isliye `TEXT` `VARCHAR(255)` se safe hai yahan.

**`is_private BOOLEAN NOT NULL DEFAULT false`**
Control karta hai ki is account ke posts non-followers ko dikhein ya nahi. `DEFAULT false` ka matlab accounts default public hain, jab tak koi user private mode opt-in na kare. `NOT NULL` teen-state boolean (true/false/NULL) hone se rokta hai, jo har permission check ko complicated bana deta.

**`is_verified BOOLEAN NOT NULL DEFAULT false`**
Woh blue checkmark. Sirf tumhara backend isse set kare — kabhi bhi client input pe trust mat karo isके liye.

**`post_count`, `follower_count`, `following_count` — denormalized counters**
Yeh *jaan-boojh kar* denormalized hain (poori discussion neeche Denormalization section mein hai). Alternative — har baar profile render karte waqt `posts` ya `follows` mein rows count karna — scale pe bahut slow ho jaayega. Socho Instagram pe har profile visit pe millions rows count karna pade, server jal jaayega.

**`created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`**
`TIMESTAMPTZ` ek UTC timestamp store karta hai timezone-awareness ke saath. *Hamesha* `TIMESTAMPTZ` use karo, plain `TIMESTAMP` nahi — `TIMESTAMP` mein timezone context hota hi nahi, aur jab tumhare servers ya users alag timezones mein hon, toh chupke se galat result dega. `DEFAULT NOW()` ka matlab database khud yeh fill karta hai; application code se pass karne ki zarurat nahi.

**`updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`**
Ek trigger se update hota hai (aage dikhaya gaya) jab bhi row ka koi column change ho. Cache invalidation aur "last active" dikhane ke liye useful.

**`deleted_at TIMESTAMPTZ` — soft delete**
User row ko `DELETE` karne ke bajaye (jo cascade karke saalon ka content destroy kar sakta hai), tum `deleted_at = NOW()` set kar dete ho. Row abhi bhi exist karta hai, bas har query `WHERE deleted_at IS NULL` filter lagati hai. Isse galti se delete kiye account ko recover kar sakte ho, data-deletion requests ko controlled tareeke se handle kar sakte ho, aur foreign key references bhi intact rehte hain. Bilkul jaise Swiggy pe account "deactivate" karne aur permanently delete karne mein farak hota hai.

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
Har post exactly ek user ka hota hai. `NOT NULL` isliye kyunki bina owner ka post koi sense nahi banata. `ON DELETE CASCADE` ka matlab — user delete hua toh uske saare posts bhi delete ho jaayenge. Cascade options ki poori discussion neeche hai.

**`content TEXT NOT NULL`**
Post ka body. `NOT NULL` — ek khaali post publish nahi kar sakte (halaanki agar image-only posts allow karna ho toh isko nullable bana sakte ho ya check constraint add kar sakte ho).

**`image_urls TEXT[]`**
Text ka ek PostgreSQL *array*. Ek post mein 0–10 images ho sakti hain, aur unhe alag `post_images` table mein rakhna har baar post dikhane pe ek JOIN maangega. Array unhe post row ke saath hi co-locate rakhta hai. Yeh ek deliberate trade-off hai: tum "image X wale saare posts" ko efficiently query nahi kar paoge, lekin woh query rare hoti hai. MySQL/SQL Server mein isko kaise handle karein, cross-database section mein dekho.

**`is_public BOOLEAN NOT NULL DEFAULT true`**
Private account wale users ke liye, naye posts default public hote hain (woh override kar sakte hain). Yeh field tumhe same account pe public aur private posts mix karne deta hai agar product ko chahiye ho.

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

Yeh ek **self-referential many-to-many** table hai — users doosre users ko follow karte hain. Relationship *directional* hai: Alice ne Bob ko follow kiya, iska matlab yeh nahi ki Bob bhi Alice ko follow karta hai.

**Composite primary key `(follower_id, following_id)`**
Do users ke beech exactly ek follow relationship ho sakta hai. Composite PK isko enforce karta hai, aur saath hi "user X kisko follow karta hai?" jaisi queries ke liye index ka kaam bhi karta hai. Yahan alag se surrogate `id` column ki zarurat nahi kyunki dono IDs ka pair already ek perfect natural key hai.

**Koi `updated_at` nahi**
Ek follow ya toh exist karta hai ya nahi karta. Update karne ko kuch hai hi nahi — sirf insert aur delete hota hai. Isse table kaafi simple ho jaata hai.

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

`follows` jaisa hi pattern hai. Ek user ek post ko exactly ek baar like kar sakta hai (PK duplicates rokta hai). Jab check karna ho "kya is user ne is post ko like kiya hai?", tum ek single primary-key lookup karte ho — matlab extremely fast.

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
Yeh nested/threaded comments (reply ka reply) ke liye ek **self-referential** relationship banata hai. Jab `parent_id IS NULL` ho, comment top-level hai. Jab uski koi value ho, toh woh us comment ka reply hai.

Apne product mein nesting shallow rakho (max 2–3 levels) kyunki deeply recursive queries expensive hoti hain. Zyada tar social networks ek hi level ke replies tak limit karte hain.

**Comments ka apna `id` kyun hai** — `likes` ke ulat, comment ka content hota hai jise like, report, ya reply kiya ja sakta hai. Isko apni identity chahiye, isliye surrogate `id` yahan sense banata hai.

---

## Tables 6 & 7: `hashtags` aur `post_hashtags`

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

Yeh classic **many-to-many junction table** hai. Ek post ke kai hashtags ho sakte hain; ek hashtag kai posts mein aa sakta hai.

**Hashtags ko `posts` pe `TEXT[]` array kyun nahi rakha?**
Kyunki tumhe *hashtag side se* query karna padta hai: "`#photography` tag wale saare posts dikhao". Array column ko us query ke liye efficiently index nahi kiya ja sakta. Alag `hashtags` table aur junction table ke saath tum simple join aur index lookup se un posts ko dhoond sakte ho.

**`name VARCHAR(100) NOT NULL UNIQUE`**
Hashtag ke naam ek hi baar store hote hain aur ID se reference hote hain. Yeh normalization ka live example hai — tum string `"photography"` ko hazaaron rows mein repeat nahi karte; integer `42` store karte ho instead.

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
`user_id` woh *recipient* hai (jise notification milega). `actor_id` woh *actor* hai (jisne trigger kiya — jisne tumhara post like kiya, tumhe follow kiya, waghera). Dono `users` ko reference karte hain. Yeh naming jaan-boojh kar aisi hai, aur apne codebase mein document karne layak hai — dono ko `user_id` bulane se confusion ho jaayega.

**`type VARCHAR(50)` — string discriminator**
Har notification type ke liye alag table banane ke bajaye, ek `type` column tumhe naye notification types add karne deta hai bina schema migration ke. Trade-off yeh hai ki `post_id` aur `comment_id` nullable hain — "follow" notification ka koi post ya comment nahi hota. Yeh acceptable design hai; har row sirf apne type ke relevant columns use karta hai.

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

**Teen tables kyun, ek kyun nahi?**
Ek naive design `sender_id` aur `recipient_id` seedha `messages` table pe rakh deta. Yeh design tab tootta hai jab group chats chahiye hote hain. Teen-table design bina kisi schema change ke 1-on-1 aur group conversations dono support karta hai — bas `conversation_participants` mein aur rows add karo. Bilkul jaise WhatsApp group chat aur 1-on-1 chat dono ek hi underlying model pe chalte hain.

**`conversation_participants` composite PK**
Ek user ek conversation mein sirf ek baar reh sakta hai. Composite PK yeh enforce karta hai.

---

## Indexes: Queries Ko Fast Banana

Indexes woh farak hain jo ek query ko 1 millisecond mein chalane aur 10 seconds mein chalane ke beech hota hai, ek bade table pe. Har `PRIMARY KEY` aur `UNIQUE` constraint already automatically ek index bana deta hai. Neeche diye gaye additional indexes sabse common query patterns cover karte hain.

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

**`idx_notifications_unread` partial index (`WHERE is_read = false`) kyun use karta hai?**
Partial index sirf un rows ko index karta hai jo condition match karte hain. Tumhare notifications table mein eventually lakhon read notifications ho jaayenge, lekin users ko sirf unread wale se matlab hota hai. Partial index chhota aur bahut fast hota hai kyunki woh saare purane read notifications ko ignore kar deta hai.

**`idx_posts_user_id` composite index `(user_id, created_at DESC)` pe kyun hai?**
Jab tum query karte ho "user 42 ke 20 sabse recent posts do", PostgreSQL poori query — filtering *aur* sorting dono — sirf isi ek index se satisfy kar sakta hai, bina table ko touch kiye. Ise **index-only scan** kehte hain, aur yeh `user_id` se filter karke phir alag se sort karne se kaafi zyada fast hota hai.

---

## Denormalized Counter Columns

`post_count`, `follower_count`, `following_count`, `like_count`, aur `comment_count` **denormalized** hain. "Normalized" alternative yeh hoga ki query time pe rows count karo:

```sql
-- Normalized approach (correct but slow at scale)
SELECT COUNT(*) FROM posts WHERE user_id = 42 AND deleted_at IS NULL;
```

Millions posts wale table pe, index ke saath `COUNT(*)` bhi fast hota hai — lekin yeh query tum *har profile page render* pe chalate ho, potentially har second hazaaron baar. Denormalized counters us repeated count ko ek single column read mein badal dete hain.

### Triggers se counters consistent rakhna

Khatra yeh hai: agar counter ko application code mein update karo, toh bugs ya crashes counter ko out-of-sync chhod sakte hain. Triggers *database transaction ke andar hi* chalte hain — woh us change ke saath atomic hote hain jisne unhe trigger kiya.

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

**`GREATEST(post_count - 1, 0)`** — kabhi bhi counter ko negative mat jaane do kisi data inconsistency bug ki wajah se. Yeh database level pe defensive programming hai.

> [!tip]
> **Periodic reconciliation** — triggers hone ke bawajood, ek nightly job chalao jo counters ko source-of-truth counts se recompute kare aur koi drift ho toh fix kar de:

```sql
UPDATE users u
SET post_count = (
  SELECT COUNT(*) FROM posts p
  WHERE p.user_id = u.id AND p.deleted_at IS NULL
);
```

---

## ON DELETE Behavior: CASCADE vs SET NULL vs RESTRICT

Har foreign key ko yeh declare karna padta hai ki referenced row delete hone pe kya hoga. Yeh schema design ke sabse consequential decisions mein se ek hai.

| Option | Behavior | Kab use karein |
|---|---|---|
| `CASCADE` | Child row automatically delete ho jaata hai | Child parent ke bina exist nahi kar sakta (post ko user chahiye hi) |
| `SET NULL` | FK column ko NULL set kar diya jaata hai | Child independently exist kar sakta hai (order shayad ek deleted product ka record rakhna chahe) |
| `RESTRICT` | Parent delete hone se rokta hai agar children exist karte hain | Tumhe pehle explicit cleanup force karna hai |
| `NO ACTION` | RESTRICT jaisa hi lekin deferred | Rarely use hota; agar kuch specify na karo toh default |

**Is schema mein:**

- `posts.user_id → users` `CASCADE` use karta hai: bina user ke post meaningless orphan data hai.
- `comments.post_id → posts` `CASCADE` use karta hai: bina post ke comment bhi utna hi meaningless hai.
- `comments.parent_id → comments` `CASCADE` use karta hai: top-level comment delete karne pe uske replies bhi delete ho jaate hain.
- `notifications.post_id → posts` `CASCADE` use karta hai: post delete hone pe uske notifications bhi irrelevant ho jaate hain.

> [!info]
> **Jahan `SET NULL` better ho sakta hai:**
> Agar tum chahte ho ki conversation ke messages tab bhi rahein jab ek participant apna account delete kar de (dusre participant ki history ke liye), toh `messages.sender_id` ko nullable bana ke `ON DELETE SET NULL` use kar sakte ho, aur UI mein "Deleted User" dikha sakte ho. Yeh schema simplicity ke liye `CASCADE` use karta hai, lekin `SET NULL` bahut real products ke liye sahi choice hai.

---

## Cross-Database Equivalents

PostgreSQL ke kuch features jo upar use hue hain, woh MySQL ya SQL Server mein exist hi nahi karte. Yahan hai key differences ko translate kaise karein.

### Arrays → JSON

PostgreSQL ka `TEXT[]` array type MySQL ya SQL Server mein exist nahi karta. Uski jagah JSON use karo.

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

JSON zyada flexible hai lekin native array se query karne mein slow hai, aur tum per-element foreign keys define karne ki ability kho dete ho. Zyada tar use cases ke liye JSON approach bilkul theek hai.

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

MySQL ka `DATETIME` koi timezone info store nahi karta — tumhari zimmedari hai hamesha UTC store karna. SQL Server ka `DATETIMEOFFSET`, `TIMESTAMPTZ` ka sabse close equivalent hai.

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

PostgreSQL indexes pe `WHERE` clauses support karta hai. MySQL partial indexes support hi nahi karta. SQL Server 2008+ filtered indexes support karta hai.

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

PostgreSQL ka `BIGSERIAL` ek `SEQUENCE` object ke upar syntactic sugar hai. MySQL aur SQL Server mein auto-increment behavior column definition ke andar hi built-in hota hai, alag object nahi. Yeh tab matter karta hai jab kabhi sequences ko reset ya tables ke beech share karna ho (rare, lekin jaanna zaruri hai).

---

## Summary: Design Decisions Ek Nazar Mein

| Decision | Kya chuna gaya | Kyun |
|---|---|---|
| Primary key type | `BIGSERIAL` | Future-proof; 64-bit overflow rokta hai |
| Soft deletes | `deleted_at TIMESTAMPTZ` | Recoverability aur data integrity |
| Timestamp type | `TIMESTAMPTZ` | Timezone-aware; silent bugs se bachaata hai |
| Image storage | URL columns, binary data nahi | Images object storage mein hi rehni chahiye |
| Counter columns | Triggers ke saath denormalized | Render time pe expensive `COUNT(*)` se bachaata hai |
| Follow/Like tables | Composite PK, koi surrogate id nahi | Natural key already unique hai; storage bachta hai |
| DM design | 3-table conversation model | Bina schema change ke group chats support karta hai |
| Notification type | `VARCHAR(50)` discriminator | Naye types add karna easy, bina migrations ke |
| Hashtag storage | Apni table mein normalized | Efficient "posts by tag" queries enable karta hai |
| Arrays | PostgreSQL `TEXT[]` | Images ko post ke saath co-locate karta hai; simple queries |

---

> **Agla chapter:** Schema ko query karna — feed query likhna, follower timelines banana, aur `EXPLAIN ANALYZE` output samajhna slow queries diagnose karne ke liye.

## Key Takeaways

- `BIGSERIAL` primary keys use karo — future-proof aur cost-free
- `TIMESTAMPTZ` hamesha use karo, plain `TIMESTAMP` kabhi nahi — timezone bugs se bachne ke liye
- Soft delete (`deleted_at`) recoverability deta hai; hard delete data permanently gawa deta hai
- Denormalized counters (like `post_count`) triggers ke saath consistent rakho, aur nightly reconciliation job bhi rakho
- Composite primary keys (`follows`, `likes`, `post_hashtags`) natural many-to-many relationships ke liye perfect hain, alag surrogate id ki zarurat nahi
- `ON DELETE CASCADE` vs `SET NULL` vs `RESTRICT` — decide karo child row parent ke bina meaningful hai ya nahi
- Hashtags ko normalize karo apni table mein taaki "posts by tag" query efficient rahe
- Indexes query patterns ke hisaab se design karo — composite index jaise `(user_id, created_at DESC)` filtering aur sorting dono ek saath solve karta hai
- Partial indexes (`WHERE is_read = false`) chhote aur fast rehte hain jab sirf ek subset of rows matter karta hai
- PostgreSQL-specific features (arrays, partial indexes) ko MySQL/SQL Server mein translate karna aata hona chahiye
