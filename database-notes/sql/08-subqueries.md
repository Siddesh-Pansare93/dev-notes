# 🔍 Chapter 8: Subqueries

> Query ke andar query — SQL ka wo trick jahan ek sochne wali cheez ke andar dusri sochne wali cheez ghusa dete ho.

---

## 🧠 Subquery Hota Kya Hai?

Socho tum Zomato pe order kar rahe ho aur pehle "sabse zyada rating wale restaurants" dhundhte ho, phir unme se "jo abhi open hai" filter karte ho. Ye do-step sochne wala process hi subquery hai — ek query ke result ko dusri query ke andar use karna.

Ek **subquery** (jise *inner query* ya *nested query* bhi kehte hain) ek complete `SELECT` statement hota hai jo kisi doosre SQL statement ke andar bitha diya jata hai. Bahar wale statement ko **outer query** ya **main query** kehte hain.

```sql
SELECT name
FROM users
WHERE id IN (
    SELECT user_id FROM posts WHERE likes > 100   -- ye hai subquery
);
```

Database engine pehle andar wali query chalata hai, uska result nikalta hai, aur fir usi result ko use karke bahar wali query chalata hai.

Subqueries ye jagah pe use ho sakti hain:
- `WHERE` clause mein (sabse common)
- `FROM` clause mein (derived table ki tarah)
- `SELECT` clause mein (scalar expression ki tarah)
- `HAVING` clause mein

---

## 📐 Is Chapter Mein Use Hone Wala Schema

Saare examples ek simple social network schema pe based hain:

```sql
users   (id, name, email, created_at)
posts   (id, user_id, title, content, created_at)
likes   (id, user_id, post_id, created_at)
```

---

## 🔢 Subqueries Ke Types

### 1. Scalar Subquery — Ek Value Return Karta Hai

**Scalar subquery** exactly **ek row aur ek column** return karta hai. Jahan bhi ek single value ki zarurat ho, wahan iska use kar sakte ho.

```sql
-- Har user ka naam aur database mein total posts count saath mein dikhao
SELECT
    name,
    (SELECT COUNT(*) FROM posts) AS total_posts_in_db
FROM users;
```

Agar subquery ek se zyada row ya column return kare, to database error de dega. Scalar subqueries usually `SELECT` ya `WHERE` mein use hote hain jab kisi ek computed value se compare karna ho.

```sql
-- Wo users dhundo jo sabse pehle wale user ke baad register hue
SELECT name, created_at
FROM users
WHERE created_at > (SELECT MIN(created_at) FROM users);
```

---

### 2. Row Subquery — Ek Row, Multiple Columns

**Row subquery** ek row return karta hai jisme multiple columns hote hain. Isse compare karne ke liye row constructor syntax use hota hai.

```sql
-- Wo user dhundo jiska (name, email) exactly match kare ek known pair se
SELECT *
FROM users
WHERE (name, email) = (
    SELECT name, email FROM users WHERE id = 42
);
```

> Row subqueries PostgreSQL aur MySQL mein support hote hain. SQL Server aur Oracle mein support limited hai — wahan tumhe ye alag-alag scalar subqueries banake `AND` se jodne padenge.

---

### 3. Table Subquery (Derived Table / Inline View) — Multiple Rows Return Karta Hai

**Table subquery** multiple rows return karta hai aur `FROM` clause ke andar use hota hai. Isko ek alias dena zaruri hai. Isse **derived table** ya **inline view** bhi kehte hain.

```sql
-- Pehle sabhi posts ka average like count nikalo, fir us average se upar wale posts dhundo
SELECT p.title, p.like_count
FROM (
    SELECT post_id, COUNT(*) AS like_count
    FROM likes
    GROUP BY post_id
) AS post_likes                          -- alias dena zaruri hai
JOIN posts p ON p.id = post_likes.post_id
WHERE post_likes.like_count > 10;
```

Andar wali query pehle chalti hai aur uska result outer query ke liye ek temporary table jaisa treat hota hai.

---

### 4. Correlated Subquery — Outer Query Ko Reference Karta Hai

**Correlated subquery** outer query ke kisi column ko reference karta hai. Is dependency ki wajah se, ye outer query ki **har row ke liye ek baar** dobara chalta hai. Isse ye powerful to hai, par bade dataset pe slow ho sakta hai.

```sql
-- Wo users dhundo jinhone average se zyada posts likhe hain
SELECT u.name
FROM users u
WHERE (
    SELECT COUNT(*) FROM posts p WHERE p.user_id = u.id   -- outer u.id ko reference kar raha hai
) > (
    SELECT AVG(post_count)
    FROM (SELECT COUNT(*) AS post_count FROM posts GROUP BY user_id) AS counts
);
```

Andar wali `SELECT COUNT(*) FROM posts p WHERE p.user_id = u.id` query `users` table ki **har ek row** ke liye chalti hai. Agar 100,000 users hain, to ye subquery 100,000 baar chalegi. Bade tables ke liye `JOIN` with `GROUP BY` use karna better hai.

---

## 🎯 WHERE Ke Saath Subquery

Sabse common pattern — subquery ke result ke basis pe rows filter karna.

```sql
-- Wo saare users dhundo jinhone kam se kam ek post kiya ho
SELECT name
FROM users
WHERE id IN (
    SELECT DISTINCT user_id FROM posts
);
```

Scalar subqueries ke saath comparison operators bhi use kar sakte ho:

```sql
-- Wo users dhundo jinhone average se zyada posts kiye hain
SELECT name
FROM users
WHERE (
    SELECT COUNT(*) FROM posts WHERE user_id = users.id
) > (
    SELECT AVG(c) FROM (SELECT COUNT(*) AS c FROM posts GROUP BY user_id) AS avg_table
);
```

---

## ⚡ EXISTS vs IN — Ek Important Performance Choice

`EXISTS` aur `IN` dono ye check karte hain ki rows kisi condition ko satisfy karte hain ya nahi, par ye internally alag tarike se kaam karte hain.

### EXISTS

```sql
-- Wo users dhundo jinke kam se kam ek post hai
SELECT name
FROM users u
WHERE EXISTS (
    SELECT 1 FROM posts p WHERE p.user_id = u.id
);
```

- Subquery ko sirf **ek matching row** chahiye hoti hai, mile toh turant ruk jaata hai (short-circuit evaluation) — bilkul jaise IRCTC pe tatkal ticket book karte waqt ek seat mili nahi ki booking confirm ho jaati hai, baaki seats check karne ki zarurat nahi.
- Ye `TRUE` ya `FALSE` return karta hai — `EXISTS` ke andar kaunse columns select kiye hain wo matter nahi karta (`SELECT 1` conventional hai).
- Jab andar wali table badi ho, tab acha perform karta hai kyunki pehle match pe hi ruk jaata hai.

### IN

```sql
-- Same query, IN use karke
SELECT name
FROM users
WHERE id IN (
    SELECT user_id FROM posts
);
```

- Subquery pehle **poori** chalti hai aur saare matching values ko memory mein load kar leta hai.
- Fir outer query har row ko us poori list se check karti hai.
- Jab subquery ka result set bada ho, tab slow ho sakta hai.

### General Guideline

| Scenario | Prefer |
|---|---|
| Inner table badi hai | `EXISTS` |
| Inner result set chota hai | `IN` |
| Non-existence check karna ho | `NOT EXISTS` (safer) |
| Simple value list (`IN (1, 2, 3)`) | `IN` (subquery involved nahi hai) |

### NOT IN Ka NULL Trap

Ye beginners ke liye sabse common SQL bugs mein se ek hai.

```sql
-- Ye dekhne mein sahi lagta hai par ZERO rows return kar sakta hai agar posts mein koi user_id NULL ho
SELECT name
FROM users
WHERE id NOT IN (
    SELECT user_id FROM posts   -- agar yahan KOI bhi user_id NULL hai, to poora result empty ho jaayega!
);
```

SQL mein, `x NOT IN (1, 2, NULL)` `UNKNOWN` evaluate hota hai (`TRUE` nahi), kyunki `x != NULL` hamesha `UNKNOWN` hota hai. Jab `IN` list mein koi bhi value `NULL` ho, `NOT IN` koi row return nahi karta.

**Safe alternative:**

```sql
-- Iske badle NOT EXISTS use karo — NULLs ko sahi tarike se handle karta hai
SELECT name
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM posts p WHERE p.user_id = u.id
);
```

> [!warning]
> **Rule:** Hamesha `NOT EXISTS` ko `NOT IN` se zyada prefer karo, jab tak tumhe 100% pata na ho ki subquery kabhi `NULL` return nahi karegi.

---

## 📋 FROM Clause Mein Subquery (Derived Table)

`FROM` mein subquery use karne se tum join ya filter karne se pehle data ko pre-aggregate ya transform kar sakte ho.

```sql
-- Har user ka sabse popular post (likes ke hisab se) dhundo
SELECT u.name, top_posts.title, top_posts.like_count
FROM users u
JOIN (
    SELECT p.user_id, p.title, COUNT(l.id) AS like_count
    FROM posts p
    LEFT JOIN likes l ON l.post_id = p.id
    GROUP BY p.user_id, p.id, p.title
) AS top_posts ON top_posts.user_id = u.id
WHERE top_posts.like_count = (
    SELECT MAX(like_count)
    FROM (
        SELECT p2.user_id, COUNT(l2.id) AS like_count
        FROM posts p2
        LEFT JOIN likes l2 ON l2.post_id = p2.id
        GROUP BY p2.user_id, p2.id
    ) AS inner_counts
    WHERE inner_counts.user_id = u.id
);
```

> [!info]
> Itni complex derived-table logic ke liye CTE usually zyada readable hota hai. Chapter ke end mein CTE ka preview dekho.

---

## 🧮 SELECT Clause Mein Subquery (Har Row Ke Liye Scalar Subquery)

`SELECT` mein scalar subquery outer query ki har row ke liye ek baar chalta hai aur ek single value column ki tarah dikhata hai.

```sql
-- Har user ka naam aur usne kitne posts likhe hain, dono dikhao
SELECT
    u.name,
    u.email,
    (SELECT COUNT(*) FROM posts p WHERE p.user_id = u.id) AS post_count
FROM users u;
```

Ye basically ek correlated subquery hi hai — har user row ke liye ek baar chalta hai. Chote tables ke liye ye theek hai; bade tables ke liye `LEFT JOIN` with `GROUP BY` prefer karo:

```sql
-- JOIN use karke faster equivalent
SELECT
    u.name,
    u.email,
    COUNT(p.id) AS post_count
FROM users u
LEFT JOIN posts p ON p.user_id = u.id
GROUP BY u.id, u.name, u.email;
```

---

## 🔀 ALL / ANY / SOME Operators

Ye operators ek value ko subquery se return hue **set** se compare karte hain.

### ANY / SOME

`ANY` aur `SOME` synonyms hain. Condition true hota hai agar wo subquery result mein **kam se kam ek** value ke liye sahi ho.

```sql
-- Wo users dhundo jinka post count kisi bhi ek single user se zyada hai
-- (matlab, sabse kam poster nahi hai)
SELECT name
FROM users
WHERE (SELECT COUNT(*) FROM posts WHERE user_id = users.id)
    > ANY (SELECT COUNT(*) FROM posts GROUP BY user_id);
```

### ALL

Condition **har** value ke liye sahi hona chahiye.

```sql
-- Wo users dhundo jinka post count sabse zyada hai (baaki sabse zyada)
SELECT name
FROM users
WHERE (SELECT COUNT(*) FROM posts WHERE user_id = users.id)
    >= ALL (SELECT COUNT(*) FROM posts GROUP BY user_id);
```

| Operator | Matlab |
|---|---|
| `= ANY` | Kam se kam ek value ke barabar (`IN` ke equivalent) |
| `> ANY` | Kam se kam ek value se zyada (minimum se zyada) |
| `> ALL` | Har value se zyada (maximum se zyada) |
| `< ALL` | Har value se kam (minimum se kam) |

> [!warning]
> Subquery mein agar `NULL` values ho to `ALL` / `ANY` unexpected `UNKNOWN` results de sakte hain — yahan bhi wahi NULL trap lagu hota hai.

---

## 📊 Correlated vs Non-Correlated: Performance Ka Farak

| | Non-Correlated | Correlated |
|---|---|---|
| **Definition** | Inner query outer query ko reference nahi karti | Inner query outer query ke column ko reference karti hai |
| **Executions** | Ek baar chalti hai | Outer ki har row ke liye ek baar chalti hai |
| **Performance** | Generally fast | Bade tables pe slow ho sakta hai (N subquery calls) |
| **Use case** | Static filtering, lookup lists | Per-row comparisons, existence checks |
| **Alternative** | Zyada tar `JOIN` se replace ho sakta hai | Zyada tar `JOIN` + aggregation se replace ho sakta hai |

**Non-correlated example:**

```sql
SELECT name FROM users
WHERE id IN (SELECT user_id FROM posts WHERE likes > 50);
-- Inner query ek hi baar chalti hai, ek list banati hai, outer query us list se filter karta hai
```

**Correlated example:**

```sql
SELECT name FROM users u
WHERE EXISTS (SELECT 1 FROM posts p WHERE p.user_id = u.id AND p.likes > 50);
-- Inner query PER USER ROW ek baar chalti hai
```

---

## 🤔 Subquery Use Karein Ya JOIN?

JOINs SQL ka workhorse hain aur usually faster hote hain kyunki query optimizers JOINs ke liye heavily tuned hote hain. Subqueries thoda overhead add karte hain, especially correlated wale.

| Situation | Recommendation |
|---|---|
| Filter se pehle aggregate karna ho | `FROM` mein subquery (ya CTE) |
| Existence check karna ho | `EXISTS` subquery |
| IDs ki list se filter karna ho | `IN` subquery (ya `JOIN`) |
| Related table se columns nikalne ho | `JOIN` — usually faster |
| Complex intermediate transformation | CTE (nested subqueries se cleaner) |
| One-off scalar value | `SELECT` mein scalar subquery theek hai |

```sql
-- Subquery approach (readable, par slow ho sakta hai)
SELECT name FROM users
WHERE id IN (SELECT user_id FROM posts WHERE created_at > '2024-01-01');

-- JOIN approach (often faster, especially indexes ke saath)
SELECT DISTINCT u.name
FROM users u
JOIN posts p ON p.user_id = u.id
WHERE p.created_at > '2024-01-01';
```

---

## 🌐 Databases Ke Beech Syntax Ka Farak

Zyada tar subquery syntax standard SQL hai aur sab databases mein same tarike se kaam karta hai. Main farak hota hai **derived table aliasing** aur **row subquery support** mein.

### Derived Table Alias Ki Requirement

```sql
-- PostgreSQL / MySQL / SQL Server — alias zaruri hai
SELECT * FROM (SELECT id FROM users) AS u;

-- Oracle — alias zaruri hai, table aliases pe AS keyword optional hai
SELECT * FROM (SELECT id FROM users) u;
```

### Row Subquery Support

```sql
-- PostgreSQL / MySQL — supported
WHERE (col1, col2) = (SELECT col1, col2 FROM ...)

-- SQL Server / Oracle — natively supported nahi; isse aise likho:
WHERE col1 = (SELECT col1 FROM ...) AND col2 = (SELECT col2 FROM ...)
```

### LATERAL / CROSS APPLY (Advanced)

Jab `FROM` ke andar wali subquery ko outer query reference karni ho (yani correlated derived table), alag-alag databases mein alag syntax hota hai:

```sql
-- PostgreSQL
SELECT u.name, recent.title
FROM users u,
LATERAL (SELECT title FROM posts WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) AS recent;

-- SQL Server
SELECT u.name, recent.title
FROM users u
CROSS APPLY (SELECT TOP 1 title FROM posts WHERE user_id = u.id ORDER BY created_at DESC) AS recent;

-- MySQL (8.0+)
-- LATERAL MySQL 8.0 se support hota hai
SELECT u.name, recent.title
FROM users u,
LATERAL (SELECT title FROM posts WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) AS recent;

-- Oracle
SELECT u.name, recent.title
FROM users u,
LATERAL (SELECT title FROM posts WHERE user_id = u.id ORDER BY created_at DESC FETCH FIRST 1 ROW ONLY) recent;
```

---

## 🧪 Social Network Schema Ke Saath Real Examples

### Example 1: Average Se Zyada Post Karne Wale Users Dhundo

```sql
SELECT u.name, COUNT(p.id) AS post_count
FROM users u
JOIN posts p ON p.user_id = u.id
GROUP BY u.id, u.name
HAVING COUNT(p.id) > (
    SELECT AVG(post_count)
    FROM (
        SELECT COUNT(*) AS post_count
        FROM posts
        GROUP BY user_id
    ) AS avg_calc
);
```

### Example 2: Jinhone Apni Hi Post Ko Like Kiya Unhe Dhundo

```sql
SELECT DISTINCT u.name
FROM users u
WHERE EXISTS (
    SELECT 1
    FROM likes l
    JOIN posts p ON p.id = l.post_id
    WHERE l.user_id = u.id       -- liker hi user hai
      AND p.user_id = u.id       -- post ka author bhi wahi user hai
);
```

### Example 3: Har User Ka Sabse Popular Post Dhundo

```sql
SELECT u.name, p.title, like_counts.cnt AS likes
FROM users u
JOIN posts p ON p.user_id = u.id
JOIN (
    SELECT post_id, COUNT(*) AS cnt
    FROM likes
    GROUP BY post_id
) AS like_counts ON like_counts.post_id = p.id
WHERE like_counts.cnt = (
    SELECT MAX(lc2.cnt)
    FROM likes lc_inner
    JOIN (
        SELECT post_id, COUNT(*) AS cnt
        FROM likes
        GROUP BY post_id
    ) AS lc2 ON lc2.post_id = lc_inner.post_id
    JOIN posts p2 ON p2.id = lc2.post_id
    WHERE p2.user_id = u.id
);
```

> [!tip]
> Ye query ab thodi complex hone lagi hai. Yahi wo jagah hai jahan **CTE** kaam aata hai — niche preview dekho.

---

## 👀 CTEs — Ek Preview (Poora Chapter Aa Raha Hai)

Jab subqueries bahut zyada nested ho jaati hain, to unhe padhna aur debug karna mushkil ho jaata hai. **Common Table Expressions (CTEs)** tumhe subqueries ko naam dene dete hain aur unhe temporary tables ki tarah reference karne dete hain — Swiggy ke order mein alag-alag steps ko naam dene jaisa (cart_total, delivery_fee, final_amount) taki poora flow saaf dikhe.

```sql
-- "Har user ka sabse popular post" wali query — CTEs ke saath kaafi zyada readable
WITH like_counts AS (
    SELECT post_id, COUNT(*) AS cnt
    FROM likes
    GROUP BY post_id
),
max_likes_per_user AS (
    SELECT p.user_id, MAX(lc.cnt) AS max_cnt
    FROM posts p
    JOIN like_counts lc ON lc.post_id = p.id
    GROUP BY p.user_id
)
SELECT u.name, p.title, lc.cnt AS likes
FROM users u
JOIN posts p ON p.user_id = u.id
JOIN like_counts lc ON lc.post_id = p.id
JOIN max_likes_per_user mlpu ON mlpu.user_id = u.id AND mlpu.max_cnt = lc.cnt;
```

CTEs `WITH` keyword use karte hain aur PostgreSQL, MySQL 8.0+, SQL Server, aur Oracle mein supported hain. Poori coverage Chapter 9 mein.

---

## ✅ Key Takeaways

- **Subquery** ek `SELECT` hota hai jo doosre SQL statement ke andar hota hai; inner query pehle chalti hai.
- **Scalar subquery** ek value return karta hai; **table subquery** rows return karta hai aur `FROM` mein rehta hai; **correlated subquery** outer query ko reference karta hai.
- Bade datasets ke liye `IN` ke bajaye `EXISTS` use karo — ye pehle match pe hi short-circuit ho jaata hai.
- **`NOT IN` kabhi mat use karo** jab subquery `NULL` return kar sakti ho — iske badle `NOT EXISTS` use karo.
- `ANY` / `SOME` = kam se kam ek match; `ALL` = har value match hona chahiye.
- Correlated subqueries outer ki **har row ke liye ek baar** chalti hain — ye slow ho sakti hain; jab possible ho `JOIN` prefer karo.
- `SELECT` mein correlated scalar subquery se usually `JOIN` + `GROUP BY` faster hota hai.
- Jab subqueries complex aur nested ho jaayein, readability ke liye **CTEs** ka use karo.

---

## 📝 Quiz

**Question 1:** Tumne ye query chalayi aur zero results mile, jabki tumhe pata hai ki kuch users ke koi posts nahi hain. Bug kya hai?

```sql
SELECT name FROM users
WHERE id NOT IN (SELECT user_id FROM posts);
```

<details>
<summary>Answer</summary>

`posts` table mein shayad koi rows aisi hain jaha `user_id` `NULL` hai. `NOT IN` jab list mein `NULL` ho to har row ke liye `UNKNOWN` evaluate hota hai, isliye koi row return nahi hoti. Fix: `NOT EXISTS` use karo, ya subquery ke andar `WHERE user_id IS NOT NULL` add karo.

</details>

---

**Question 2:** In dono queries mein, inner query kitni baar execute hoti hai — usme kya farak hai?

```sql
-- Query A
SELECT name FROM users
WHERE id IN (SELECT user_id FROM posts WHERE likes > 100);

-- Query B
SELECT name FROM users u
WHERE EXISTS (SELECT 1 FROM posts p WHERE p.user_id = u.id AND p.likes > 100);
```

<details>
<summary>Answer</summary>

**Query A** non-correlated hai — inner query **ek hi baar** chalti hai, user IDs ki ek list banati hai, aur outer query us list se filter karti hai.

**Query B** correlated hai — inner query `users` ki **har row ke liye ek baar** chalti hai. Agar 50,000 users hain, to inner query 50,000 baar chalegi. Lekin `EXISTS` pehle match pe short-circuit ho jaata hai, jisse ye `IN` se faster ho sakta hai jab inner table badi ho aur matches jaldi mil jaayein.

</details>

---

**Question 3:** `SELECT` mein is correlated subquery ko `JOIN` use karke rewrite karo:

```sql
SELECT
    u.name,
    (SELECT COUNT(*) FROM posts p WHERE p.user_id = u.id) AS post_count
FROM users u;
```

<details>
<summary>Answer</summary>

```sql
SELECT
    u.name,
    COUNT(p.id) AS post_count
FROM users u
LEFT JOIN posts p ON p.user_id = u.id
GROUP BY u.id, u.name;
```

`LEFT JOIN` ye ensure karta hai ki zero posts wale users bhi result mein dikhein (`post_count = 0` ke saath), bilkul waisa hi jaisa scalar subquery karta — no-posts wale users ke liye `0` return karta.

</details>
