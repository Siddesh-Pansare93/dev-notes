# 🔍 SELECT — Data Querying Karna

> **Chapter 4 of SQL from Scratch**
> Prerequisites: Chapter 3 — Tables, Data Types, and Schema Design

---

## 🗺️ Is Chapter Mein Kya Seekhoge?

Socho tumhare paas Zomato ka database hai aur tumhe usme se sirf wahi data nikalna hai jo chahiye — poore table ko nahi ghaseetna. Yehi kaam `SELECT` statement karta hai. Is chapter ke end tak tum specific columns pick karna, rows filter karna, results sort karna, `NULL` handle karna, duplicates hatana, bade result sets ko pages mein todna (pagination), aur expressions + conditional logic se naye computed columns banana — sab seekh loge.

Saare examples ek social-network schema pe based hain jo neeche diya gaya hai.

---

## 🏗️ Schema Jo Hum Use Karenge

```sql
-- users: one row per registered account
CREATE TABLE users (
    user_id   INT PRIMARY KEY,
    username  VARCHAR(50)  NOT NULL,
    email     VARCHAR(120) NOT NULL,
    bio       TEXT,                    -- nullable
    joined_at DATE         NOT NULL,
    city      VARCHAR(80)
);

-- posts: content published by users
CREATE TABLE posts (
    post_id    INT PRIMARY KEY,
    user_id    INT          NOT NULL,  -- FK → users
    body       TEXT         NOT NULL,
    created_at TIMESTAMP    NOT NULL,
    views      INT          DEFAULT 0,
    is_pinned  BOOLEAN      DEFAULT FALSE
);

-- likes: which user liked which post
CREATE TABLE likes (
    user_id  INT NOT NULL,
    post_id  INT NOT NULL,
    liked_at TIMESTAMP NOT NULL,
    PRIMARY KEY (user_id, post_id)
);

-- followers: who follows whom
CREATE TABLE followers (
    follower_id  INT NOT NULL,
    followee_id  INT NOT NULL,
    followed_at  DATE NOT NULL,
    PRIMARY KEY (follower_id, followee_id)
);
```

---

## 🧬 SELECT Statement Ka Structure

`SELECT` query ka general shape plain English jaisa hi lagta hai — "mujhe ye columns do, is table se, jahan ye conditions match karti hain, is order mein sort karke, aur bas itni hi rows do."

```sql
SELECT   column1, column2, ...   -- kaunse columns (ya expressions)
FROM     table_name              -- kaunsa table
WHERE    condition               -- rows filter karo (optional)
ORDER BY column ASC | DESC       -- sort karo (optional)
LIMIT    n                       -- kitni rows chahiye (optional; syntax vary karta hai)
OFFSET   m;                      -- pehli m rows skip karo (optional)
```

> [!info]
> Database in clauses ko is logical order mein process karta hai — bhale hi tum unhe upar diye order mein likho:
>
> ```
> FROM → WHERE → SELECT → ORDER BY → LIMIT/OFFSET
> ```

Ye order kyun zaruri hai? Jab tumhe koi confusing error milega tab samajh aayega — tum `SELECT` mein banaya hua column alias `WHERE` clause ke andar use nahi kar sakte, kyunki `WHERE` `SELECT` se pehle chalta hai.

---

## ⭐ SELECT * — Wildcard

`SELECT *` table ka har column return karta hai. Jaise Swiggy app mein "Select All" dabana — sab kuch aa jayega, chahe chahiye ya nahi.

```sql
SELECT * FROM users;
```

Quick exploration ke liye badhiya hai, lekin production code mein iska use avoid karo, kyunki:

- **Fragility** — agar kisi ne column add ya reorder kar diya, toh position ke hisaab se data padhne wala application code chupchap toot jayega.
- **Performance** — jo columns chahiye hi nahi, unko bhi network aur memory se transfer karna padta hai — bewajah bandwidth waste.
- **Readability** — koi bhi reader ye nahi bata payega ki tumhari query actually kaunse columns pe depend karti hai, jab tak table definition na dekhe.

---

## 📌 Specific Columns Select Karna

Sirf wahi list karo jo chahiye, comma se separate karke — bilkul waise jaise Zomato pe menu se sirf apni pasand ki dishes select karte ho, poora menu order nahi karte.

```sql
SELECT user_id, username, city
FROM   users;
```

Result mein columns ka order wahi hoga jo tumne list kiya — table definition mein jo order hai wo matter nahi karta.

---

## 🏷️ Column Aliases: AS

`AS` use karke result set mein column ka naam badal sakte ho. Ye sirf cosmetic hai — actual table change nahi hota.

```sql
SELECT username  AS handle,
       city      AS location,
       joined_at AS member_since
FROM   users;
```

`AS` keyword sabhi major databases mein optional hai — tum bas expression ke baad alias likh sakte ho:

```sql
SELECT username handle, city location
FROM   users;
```

> [!tip]
> Clarity ke liye `AS` likhna strongly recommended hai. Agar isse omit karoge aur galti se comma bhool gaye, toh accidental aliasing ho sakti hai.

Aliases mein agar spaces ya reserved words hain, toh unhe quote karna padta hai:

```sql
-- PostgreSQL / Oracle / SQLite
SELECT username AS "user name" FROM users;

-- MySQL
SELECT username AS `user name` FROM users;

-- SQL Server
SELECT username AS [user name] FROM users;
```

---

## ➕ SELECT Mein Expressions

Sirf raw column values tak hi limited nahi ho — column list mein koi bhi expression daal sakte ho.

### Arithmetic

```sql
SELECT post_id,
       views,
       views * 0.001  AS views_in_thousands
FROM   posts;
```

Standard arithmetic operators (`+`, `-`, `*`, `/`, `%`) har database mein kaam karte hain.

### String Concatenation

Ye ek aisi jagah hai jahan databases genuinely alag behave karte hain — thoda dhyan rakhna.

| Database       | Operator / Function                | Notes                                              |
|----------------|------------------------------------|-----------------------------------------------------|
| PostgreSQL     | `\|\|` ya `CONCAT()`               | `\|\|` ke saath `NULL` operand ho toh result `NULL` |
| Oracle         | `\|\|` ya `CONCAT(a, b)` (sirf 2-arg)| PostgreSQL jaisa hi `NULL` behavior                |
| MySQL          | Sirf `CONCAT()`                    | `\|\|` yahan default mein logical **OR** operator hai! |
| SQL Server     | `+` ya `CONCAT()`                  | `+` ke saath `NULL` return hota `NULL`; `CONCAT()` handle kar leta hai |

```sql
-- PostgreSQL / Oracle
SELECT first_name || ' (@' || username || ')' AS display_name
FROM   users;

-- MySQL
SELECT CONCAT(first_name, ' (@', username, ')') AS display_name
FROM   users;

-- SQL Server
SELECT first_name + ' (@' + username + ')' AS display_name
FROM   users;
-- ya, NULLs ke saath safely:
SELECT CONCAT(first_name, ' (@', username, ')') AS display_name
FROM   users;
```

> [!tip]
> `CONCAT()` sabse safe cross-database choice hai kyunki ye chaaron engines mein exist karta hai (Oracle 11g+) aur MySQL/SQL Server mein `NULL` ko empty string treat karke gracefully handle karta hai.

### Built-in Functions

```sql
SELECT username,
       UPPER(username)           AS upper_handle,
       LENGTH(bio)               AS bio_length,
       CURRENT_DATE              AS today
FROM   users;
```

`UPPER`, `LOWER`, `LENGTH` / `LEN` (SQL Server), aur date functions database ke hisaab se vary karte hain — apne database ke function reference ki puri list zaroor check karo.

---

## 🔁 DISTINCT — Duplicate Rows Hatana

Kabhi socha hai Flipkart pe agar tum "distinct sellers" nikalna chaho jo ek specific city se hain, toh repeated seller names dikhte rahenge agar tum dedupe na karo? `DISTINCT` yahi karta hai — un rows ko filter karta hai jahan selected har column identical ho.

```sql
-- Har city list karo jahan kam se kam ek user ho (no duplicates)
SELECT DISTINCT city
FROM   users;
```

`DISTINCT` poori row pe apply hota hai, sirf pehle column pe nahi:

```sql
SELECT DISTINCT city, joined_at
FROM   users;
-- Ek city multiple baar aa sakti hai agar users alag-alag dates pe join hue hain
```

> [!warning]
> `DISTINCT` bade tables pe expensive ho sakta hai kyunki database ko poora result set sort ya hash karna padta hai. Isko tabhi use karo jab genuinely unique rows chahiye ho.

---

## 🔎 WHERE — Rows Filter Karna

```sql
SELECT username, city
FROM   users
WHERE  city = 'London';
```

Common comparison operators: `=`, `<>` (ya `!=`), `<`, `>`, `<=`, `>=`.

Conditions ko `AND`, `OR`, `NOT` se combine karo:

```sql
SELECT post_id, views
FROM   posts
WHERE  views > 1000
  AND  is_pinned = TRUE;
```

---

## 📶 ORDER BY — Results Sort Karna

`SELECT` ke results ka koi guaranteed order nahi hota jab tak tum `ORDER BY` include na karo. Kabhi bhi "natural" insertion order pe bharosa mat karo — jaise UPI transaction history bina sort ke random order mein aa jaye toh confusion ho jayegi.

```sql
-- Sabse naye posts pehle
SELECT post_id, created_at
FROM   posts
ORDER BY created_at DESC;

-- Sabse purane pehle (ASC default hai aur omit kiya ja sakta hai)
SELECT post_id, created_at
FROM   posts
ORDER BY created_at ASC;
```

### Multiple Sort Columns

Columns ko comma se separate karo. Database pehle column se sort karta hai; ties dusre column se todi jaati hain, aur aage bhi.

```sql
SELECT username, city, joined_at
FROM   users
ORDER BY city ASC, joined_at DESC;
```

### Expression Se Order Karna

```sql
SELECT post_id, views, (views * 10) AS score
FROM   posts
ORDER BY views * 10 DESC;
```

Alias se bhi order kar sakte ho — lekin sirf un databases mein jo isko allow karte hain (PostgreSQL, MySQL, SQL Server). Oracle nahi karta.

```sql
-- PostgreSQL, MySQL, SQL Server mein kaam karta hai
SELECT post_id, views * 10 AS score
FROM   posts
ORDER BY score DESC;
```

### NULL Ordering

`NULL` values ka koi natural numeric order nahi hota, isliye har database apna convention decide karta hai.

| Database       | ASC mein default NULL position | DESC mein default NULL position |
|----------------|-------------------------------|----------------------------------|
| PostgreSQL     | NULLS LAST                     | NULLS FIRST                      |
| Oracle         | NULLS LAST                     | NULLS FIRST                      |
| MySQL          | Sabse chota value maana jata → ASC mein pehle | DESC mein last |
| SQL Server     | Sabse chota value maana jata → ASC mein pehle | DESC mein last |

PostgreSQL aur Oracle explicitly override karne dete hain:

```sql
-- PostgreSQL / Oracle
SELECT username, city
FROM   users
ORDER BY city ASC NULLS FIRST;   -- NULLs sabse upar aayenge

SELECT username, city
FROM   users
ORDER BY city DESC NULLS LAST;   -- NULLs sabse neeche aayenge
```

MySQL aur SQL Server `NULLS FIRST / NULLS LAST` support nahi karte. Common workaround ye hai ki ek computed column pe sort karo:

```sql
-- MySQL / SQL Server: ASC sort mein NULLs ko end pe push karo
SELECT username, city
FROM   users
ORDER BY (city IS NULL) ASC, city ASC;
-- (city IS NULL) non-NULL ke liye 0 aur NULL ke liye 1 return karta hai, isliye NULLs last mein sort hote hain
```

---

## 📄 LIMIT / OFFSET — Pagination

Pagination — matlab result ko ek-ek page mein fetch karna, jaise IRCTC pe train search results 20-20 karke dikhte hain — iske liye ek row-count cap aur ek skip count chahiye hota hai. Yahan syntax significantly alag hai har database mein.

### PostgreSQL, MySQL, SQLite

```sql
-- Page 1: pehli 10 rows
SELECT post_id, created_at
FROM   posts
ORDER BY created_at DESC
LIMIT  10 OFFSET 0;

-- Page 2: agli 10 rows
SELECT post_id, created_at
FROM   posts
ORDER BY created_at DESC
LIMIT  10 OFFSET 10;
```

### SQL Server (2012+)

SQL Server mein `OFFSET … FETCH` se pehle `ORDER BY` zaruri hai.

```sql
-- Page 2: 10 skip karo, 10 lo
SELECT post_id, created_at
FROM   posts
ORDER BY created_at DESC
OFFSET 10 ROWS
FETCH NEXT 10 ROWS ONLY;
```

### Oracle 12c+

```sql
-- Page 1
SELECT post_id, created_at
FROM   posts
ORDER BY created_at DESC
FETCH FIRST 10 ROWS ONLY;

-- Page 2
SELECT post_id, created_at
FROM   posts
ORDER BY created_at DESC
OFFSET 10 ROWS
FETCH NEXT 10 ROWS ONLY;
```

### TOP Keyword (SQL Server aur purana Oracle)

SQL Server 2012 se pehle jab `OFFSET … FETCH` nahi tha, `TOP` hi ek option tha. Ab bhi valid aur common hai jab sirf first N rows chahiye ho.

```sql
-- SQL Server: sabse zyada dekhe gaye 5 posts
SELECT TOP 5 post_id, views
FROM   posts
ORDER BY views DESC;

-- Oracle (pre-12c via ROWNUM — note: filter ORDER BY se PEHLE hota hai, isliye subquery mein wrap karo)
SELECT *
FROM (
    SELECT post_id, views
    FROM   posts
    ORDER BY views DESC
)
WHERE ROWNUM <= 5;
```

> [!warning]
> Oracle ke `ROWNUM` approach mein, outer `WHERE` already-sorted subquery result ko filter karta hai. Agar tum `WHERE ROWNUM <= 5` inner query mein daal doge, toh Oracle sort karne se pehle filter kar dega, jisse galat results milenge.

---

## 🧮 Naye Columns Calculate Karna

`SELECT` mein expressions bilkul naye, computed columns bana sakte hain jo table mein exist hi nahi karte.

```sql
-- Engagement rate: view ke hisaab se likes (hypothetical join yahan simplify kiya gaya)
SELECT p.post_id,
       p.views,
       p.views / 1000.0          AS views_k,
       CURRENT_DATE - p.created_at::DATE AS days_old  -- PostgreSQL
FROM   posts p
WHERE  p.views > 0;
```

Ye non-destructive hai — tum sirf padh aur calculate kar rahe ho, stored data ko kabhi modify nahi kar rahe.

---

## 🔀 CASE WHEN — Conditional Logic

`CASE WHEN` SQL ka `if / else if / else` hai. Ye kahin bhi use ho sakta hai jahan expression valid hai: `SELECT`, `ORDER BY`, `WHERE`.

### Simple Form (ek column ko fixed values se compare karna)

```sql
SELECT post_id,
       views,
       CASE views
           WHEN 0    THEN 'No views'
           WHEN 1    THEN 'One view'
           ELSE           'Multiple views'
       END AS views_label
FROM   posts;
```

### Searched Form (har branch ke liye arbitrary conditions — zyada flexible)

```sql
SELECT post_id,
       views,
       CASE
           WHEN views = 0             THEN 'No views'
           WHEN views BETWEEN 1 AND 99  THEN 'Low'
           WHEN views BETWEEN 100 AND 999 THEN 'Medium'
           ELSE                             'High'
       END AS popularity
FROM   posts;
```

`CASE` hamesha us pehli branch ka value return karta hai jiski condition true ho. Agar koi branch match na kare aur `ELSE` bhi na ho, toh result `NULL` hoga.

```sql
-- Users ko label karo based on ki unka bio bhara hai ya nahi
SELECT username,
       CASE
           WHEN bio IS NULL OR bio = '' THEN 'No bio'
           ELSE                               'Has bio'
       END AS profile_status
FROM   users;
```

---

## 🩹 COALESCE — Pehla Non-NULL Value

`COALESCE(a, b, c, ...)` pehla argument return karta hai jo `NULL` nahi hai. Ye nullable columns ke liye default value dene ka standard SQL tarika hai — jaise CRED app mein agar tumhara nickname set nahi hai toh woh tumhara real naam dikha deta hai.

```sql
-- Agar city NULL hai, toh 'Unknown location' dikhao
SELECT username,
       COALESCE(city, 'Unknown location') AS display_city
FROM   users;
```

Multiple fallbacks ko chain bhi kar sakte ho:

```sql
SELECT user_id,
       COALESCE(display_name, username, email) AS best_name
FROM   users;
```

`COALESCE` ek `CASE WHEN` ke equivalent hai lekin bahut zyada concise hai. Ye PostgreSQL, MySQL, SQL Server, aur Oracle mein identically kaam karta hai.

---

## 🔄 NULLIF — Equality Pe NULL Return Karna

`NULLIF(a, b)` `NULL` return karta hai jab `a = b` ho, warna `a` return karta hai. Ye `COALESCE` ka logical inverse hai aur zyada tar division-by-zero errors avoid karne ke liye use hota hai.

```sql
-- views = 0 hone par divide-by-zero avoid karo
SELECT post_id,
       likes_count,
       views,
       likes_count / NULLIF(views, 0) AS like_rate
FROM   posts;
```

Jab `views` `0` hota hai, `NULLIF(views, 0)` `NULL` return karta hai, aur `NULL` se division `NULL` hi hota hai — safe, koi error nahi.

---

## 🚫 IS NULL / IS NOT NULL

`NULL` ka matlab hai missing ya unknown value. Isko `=` se test nahi kar sakte kyunki SQL mein `NULL = NULL` `TRUE` nahi hota — woh `NULL` (unknown) hota hai. Ye ek common gotcha hai jo naye developers ko confuse karta hai.

```sql
-- GALAT — koi rows return nahi karega, chahe bio NULL ho
SELECT * FROM users WHERE bio = NULL;

-- SAHI
SELECT * FROM users WHERE bio IS NULL;

-- Un users ko dhundo jinhone bio bhara hai
SELECT * FROM users WHERE bio IS NOT NULL;
```

`IS NULL` aur `IS NOT NULL` sabhi major databases mein identically kaam karte hain.

---

## 🧩 Sab Kuch Mila Ke — Full Examples

### Example 1: Recent active posts with popularity label

```sql
SELECT p.post_id,
       u.username                                       AS author,
       p.views,
       CASE
           WHEN p.views >= 1000 THEN 'Viral'
           WHEN p.views >= 100  THEN 'Popular'
           ELSE                      'Normal'
       END                                              AS popularity,
       COALESCE(u.city, 'Unknown')                      AS author_city
FROM   posts  p
JOIN   users  u ON u.user_id = p.user_id
WHERE  p.created_at >= CURRENT_DATE - INTERVAL '30 days'  -- PostgreSQL
  AND  p.views > 0
ORDER BY p.views DESC
LIMIT  20;
```

### Example 2: Distinct cities with at least one user, NULLs last sorted

```sql
-- PostgreSQL / Oracle
SELECT DISTINCT city
FROM   users
ORDER BY city ASC NULLS LAST;

-- MySQL / SQL Server
SELECT DISTINCT city
FROM   users
ORDER BY (city IS NULL) ASC, city ASC;
```

### Example 3: Pagination — page 3 of posts (10 per page)

```sql
-- PostgreSQL / MySQL
SELECT post_id, body, created_at
FROM   posts
ORDER BY created_at DESC
LIMIT 10 OFFSET 20;

-- SQL Server
SELECT post_id, body, created_at
FROM   posts
ORDER BY created_at DESC
OFFSET 20 ROWS
FETCH NEXT 10 ROWS ONLY;

-- Oracle 12c+
SELECT post_id, body, created_at
FROM   posts
ORDER BY created_at DESC
OFFSET 20 ROWS
FETCH NEXT 10 ROWS ONLY;
```

### Example 4: Concatenation se display name banao, NULLs handle karke

```sql
-- PostgreSQL / Oracle
SELECT user_id,
       COALESCE(username, 'deleted_user') || ' <' || email || '>' AS display
FROM   users;

-- MySQL
SELECT user_id,
       CONCAT(COALESCE(username, 'deleted_user'), ' <', email, '>') AS display
FROM   users;

-- SQL Server
SELECT user_id,
       CONCAT(COALESCE(username, 'deleted_user'), ' <', email, '>') AS display
FROM   users;
```

---

## 🔑 Key Takeaways

- `SELECT *` exploration ke liye theek hai, production code mein avoid karo
- Column alias ke liye `AS alias_name` use karo; spaces ho toh quote karo
- String concatenation: PostgreSQL/Oracle mein `||`; sab jagah `CONCAT()`; SQL Server mein `+`
- `DISTINCT` poori duplicate rows hatata hai; bade tables pe slow ho sakta hai
- `ORDER BY` ke bina koi guaranteed order nahi; `ASC` default hota hai
- NULL ordering: explicit `NULLS FIRST/LAST` sirf PostgreSQL/Oracle mein
- Pagination: PG/MySQL mein `LIMIT/OFFSET`; SQL Server/Oracle 12c+ mein `OFFSET…FETCH`
- `CASE WHEN` SQL ka if/else hai; complex conditions ke liye searched form use karo
- `COALESCE` pehla non-NULL value return karta hai; default values ke liye best
- `NULLIF` do values match karne pe NULL return karta hai; division-by-zero rokta hai
- `IS NULL` hamesha use karo, `= NULL` kabhi nahi

---

## 🧠 Quiz

Agle chapter pe jaane se pehle khud ko test karo.

**Question 1**

Tumhare paas ek `posts` table hai aur tumhe 10 most-viewed posts dekhne hain, lekin top 3 skip karke (shayad wo pinned hain aur alag se dikhaye jaate hain). Query likho:
- (a) PostgreSQL syntax use karke
- (b) SQL Server syntax use karke

**Question 2**

`users.city` column nullable hai. Tumhe city dikhani hai, lekin agar city `NULL` ho toh `'Remote'` dikhana hai. Kaunsa function use karoge, aur expression kaisa dikhega?

**Question 3**

Ek teammate ye likhta hai:

```sql
SELECT DISTINCT username, city
FROM   users
WHERE  city = NULL;
```

Is query mein **do** bugs identify karo aur corrected version likho.

---

### Answers

**Answer 1a (PostgreSQL)**

```sql
SELECT post_id, views
FROM   posts
ORDER BY views DESC
LIMIT 10 OFFSET 3;
```

**Answer 1b (SQL Server)**

```sql
SELECT post_id, views
FROM   posts
ORDER BY views DESC
OFFSET 3 ROWS
FETCH NEXT 10 ROWS ONLY;
```

**Answer 2**

`COALESCE` use karo:

```sql
SELECT username, COALESCE(city, 'Remote') AS display_city
FROM   users;
```

**Answer 3**

Bug 1: `city = NULL` ko `city IS NULL` hona chahiye — `NULL` ke saath equality hamesha `NULL` deti hai, `TRUE` nahi.

Bug 2: `WHERE city IS NULL` ke saath `DISTINCT username, city` sirf un users ko return karega jinki city nahi hai. Agar intent ye hai ki saari distinct cities list ki jaayein, toh column list sirf `city` honi chahiye (aur `WHERE` clause hatana chahiye, jab tak filtering intended na ho).

Corrected query (saari distinct cities list karo):

```sql
SELECT DISTINCT city
FROM   users
WHERE  city IS NOT NULL;
```

---

*Next chapter: Chapter 5 — Filtering with WHERE — Operators, LIKE, IN, BETWEEN, and Subqueries*
