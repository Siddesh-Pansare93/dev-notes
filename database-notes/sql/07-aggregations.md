# 📊 Aggregations, GROUP BY, aur HAVING

> **Ye kiske liye hai:** Jo developers basic SELECT, WHERE, aur JOIN jaante hain, lekin ab numbers crunch karna aur data summarize karna seekhna chahte hain — bilkul ek pro ki tarah.

---

## 🧮 Aggregate Functions Hote Kya Hain?

Ab tak tum individual rows fetch kar rahe the — ek-ek row uthake dikha rahe the. Lekin **aggregations** tumhe kya dete hain? Woh tumhe **bahut saari rows ko ek single summary value mein collapse** karne dete hain — jaise total users count karna, revenue sum karna, sabse purana post dhundna, waghera.

SQL mein paanch core aggregate functions hote hain jo har major database mein same tarike se kaam karte hain:

| Function | Kya return karta hai |
|---|---|
| `COUNT(...)` | Rows ki sankhya (ya non-NULL values ki) |
| `SUM(col)` | Numeric column ke saare values ka total |
| `AVG(col)` | Saare values ka average |
| `MIN(col)` | Sabse chhota value |
| `MAX(col)` | Sabse bada value |

### Basic example — abhi grouping nahi hai

```sql
SELECT
    COUNT(*)        AS total_posts,
    AVG(like_count) AS avg_likes,
    MAX(like_count) AS most_liked,
    MIN(like_count) AS least_liked
FROM posts;
```

Ye query `posts` table ki **saari rows ka summary ek hi row mein** de degi. Socho jaise Zomato tumhe saal bhar ke orders ka ek single summary card dikhata hai — total orders, average bill, sabse mehenga order — sab ek jagah.

---

## 🔢 COUNT(*) vs COUNT(column) vs COUNT(DISTINCT column)

Ye teeno dikhne mein similar lagte hain, lekin behave bilkul alag tarike se karte hain. Fark samajh lo, warna silent bugs milenge jo pakadna mushkil hote hain.

```sql
-- Scenario: `posts` table mein 10 rows hain, lekin 2 rows mein `image_url` NULL hai

SELECT
    COUNT(*)              AS all_rows,         -- 10  (sab kuch count karta hai)
    COUNT(image_url)      AS rows_with_image,  -- 8   (NULLs skip karta hai)
    COUNT(DISTINCT user_id) AS unique_authors  -- jitne bhi distinct user_ids hain
FROM posts;
```

**Rules yaad rakho:**

- `COUNT(*)` — har row count karta hai, chahe saare columns NULL hi kyun na hon. Jab sirf row count chahiye ho, ye use karo.
- `COUNT(column)` — sirf un rows ko count karta hai jaha us column mein **NULL nahi hai**. "Kitni rows mein ye value hai" jaanne ke liye use hota hai.
- `COUNT(DISTINCT column)` — unique non-NULL values count karta hai. "Kitne alag-alag users ne post kiya?" jaise sawaal ka jawab dene ke liye.

> [!tip]
> `SUM`, `AVG`, `MIN`, aur `MAX` — ye sab bhi chupke se NULLs ko ignore kar dete hain. Zyadatar yehi tumhe chahiye hota hai, lekin agar column sparse hai (bahut NULLs hain) to iska dhyan rakhna.

---

## 🗂️ GROUP BY — Har Group Ke Andar Aggregate Karna

Bina `GROUP BY` ke, har aggregate poori table ko ek row mein collapse kar deta hai. `GROUP BY` ke saath, SQL pehle rows ko **buckets mein baant deta hai** — jo column(s) tumne specify kiye hain uske basis pe — phir uss aggregate ko **har bucket ke andar** apply karta hai.

### Social network example: har user ke posts

```sql
SELECT
    user_id,
    COUNT(*) AS post_count
FROM posts
GROUP BY user_id;
```

Result (example):

| user_id | post_count |
|---------|-----------|
| 1       | 14        |
| 2       | 3         |
| 3       | 27        |

Yaha SQL ne un saari rows ko group kiya jinka `user_id` same hai, phir har group mein kitni rows hain woh count kiya. Bilkul waise jaise Swiggy tumhare area ke saare delivery partners ko group karke bata de "is delivery boy ne aaj kitne orders deliver kiye."

### Multiple columns pe grouping

```sql
-- Har user ke, har din ke posts
SELECT
    user_id,
    DATE(created_at) AS post_date,
    COUNT(*)          AS daily_posts
FROM posts
GROUP BY user_id, DATE(created_at)
ORDER BY post_date DESC;
```

---

## ⚠️ GROUP BY Ke Saath SELECT Ka Rule

Ye beginners ki sabse common mistake hai. Jaise hi tum `GROUP BY` add karte ho, SELECT mein **sirf do tarah ki cheezein allowed hain**:

1. Wo columns jo `GROUP BY` clause mein hain
2. Aggregate function calls

```sql
-- GALAT — PostgreSQL aur SQL Server mein error dega — title GROUP BY mein nahi hai
SELECT user_id, title, COUNT(*)
FROM posts
GROUP BY user_id;

-- SAHI
SELECT user_id, COUNT(*)
FROM posts
GROUP BY user_id;
```

Socho aise — tumne apne friends ko city ke hisaab se group kiya hai (Mumbai wale ek group, Delhi wale doosra), aur ab tum poochh rahe ho "har group mein pehla friend ka naam kya hai?" — ye sawaal hi galat hai, kyunki group ke andar multiple alag naam ho sakte hain. SQL yehi keh raha hai.

### Database ka behaviour compare karo

| Database | Behaviour |
|---|---|
| **PostgreSQL** | Strict — agar non-aggregated, non-grouped column SELECT mein aaya to error de dega |
| **SQL Server** | Strict — PostgreSQL jaisa hi error |
| **Oracle** | Strict — same error |
| **MySQL** | By default lenient hai — group mein se koi bhi random value chupke se utha leta hai extra column ke liye. **Ye khatarnak hai aur unpredictable results deta hai.** |

MySQL ki ye leniency ek footgun hai — kabhi bhi apne pair pe goli maar sakti hai. Isliye MySQL mein strict mode enable karna chahiye:

```sql
-- MySQL: strict GROUP BY validation enable karo
SET sql_mode = 'ONLY_FULL_GROUP_BY,...';
```

> [!warning]
> Hamesha aise queries likho jo strict engine pe bhi valid hon, chahe tum MySQL hi use kar rahe ho. Kal ko database change hua to tumhara code todega nahi.

---

## 🔍 HAVING — Aggregation Ke Baad Groups Filter Karna

`WHERE` **individual rows ko grouping se pehle** filter karta hai. `HAVING` **groups ko aggregation ke baad** filter karta hai. Ye distinction bahut zaruri hai.

```sql
-- Wo users jinhone 10 se zyada baar post kiya hai
SELECT
    user_id,
    COUNT(*) AS post_count
FROM posts
GROUP BY user_id
HAVING COUNT(*) > 10;
```

### WHERE vs HAVING — side-by-side

| | WHERE | HAVING |
|---|---|---|
| **Chalta kab hai** | GROUP BY se pehle | GROUP BY ke baad |
| **Filter karta hai** | Individual rows | Aggregated groups |
| **Reference kar sakta hai** | Raw column values | Aggregate results |
| **Kab use karo** | Calculation se rows exclude karne ke liye | Result se groups exclude karne ke liye |

### Dono ko saath mein use karna

```sql
-- 2024 mein bane posts mein se, jin users ke 5 se zyada aise posts hain
SELECT
    user_id,
    COUNT(*) AS post_count
FROM posts
WHERE created_at >= '2024-01-01'   -- rows PEHLE filter honge
GROUP BY user_id
HAVING COUNT(*) > 5;               -- groups BAAD mein filter honge
```

Yaha `WHERE` ka matlab hai — 2023 ki rows grouping calculation mein enter hi nahi hongi. Ye HAVING se baad mein filter karne se zyada efficient hai — kyunki jitna kaam pehle hi kam kar do, utna behtar.

> [!tip]
> **Rule of thumb:** Jitna jaldi ho sake filter kar do. Dataset chhota karne ke liye WHERE use karo, phir unwanted groups trim karne ke liye HAVING.

---

## ↕️ Aggregates Ke Saath ORDER BY

Aggregate result ko bhi normal column ki tarah sort kar sakte ho:

```sql
-- Sabse active users pehle
SELECT
    user_id,
    COUNT(*) AS post_count
FROM posts
GROUP BY user_id
ORDER BY post_count DESC;
```

Aggregate expression ko directly `ORDER BY` mein bhi use kar sakte ho:

```sql
ORDER BY COUNT(*) DESC
```

Dono forms har major database mein kaam karte hain.

---

## 🔗 JOINs Ke Saath Aggregations

Real queries mein aksar tables ko pehle combine karte hain, phir group karte hain. Yaad rakho — JOIN pehle hota hai, aggregation joined result pe run hota hai.

### Har user ke posts count karo (username ke saath, sirf ID nahi)

```sql
SELECT
    u.username,
    COUNT(p.id) AS post_count
FROM users u
LEFT JOIN posts p ON p.user_id = u.id
GROUP BY u.id, u.username
ORDER BY post_count DESC;
```

`LEFT JOIN` kyun? Taaki zero-posts wale users bhi result mein aayein — unka count 0 dikhega. `COUNT(p.id)` 0 return karta hai jab koi matching post nahi hai (kyunki un rows mein `p.id` NULL hota hai). Ye bilkul Zomato jaisa hai — jo restaurant abhi tak koi order nahi mila, wo bhi list mein "0 orders" ke saath dikhna chahiye, list se gayab nahi ho jaana chahiye.

### Har post ke likes (post title ke saath)

```sql
SELECT
    p.title,
    COUNT(l.id) AS like_count
FROM posts p
LEFT JOIN likes l ON l.post_id = p.id
GROUP BY p.id, p.title
ORDER BY like_count DESC
LIMIT 10;
```

---

## 🔄 GROUP BY Mein NULL

Jab kisi column mein NULLs hote hain, SQL saare NULL values ko **ek single group** mana leta hai. Ye behaviour har database mein consistent hai.

```sql
-- Kuch posts ki koi category nahi hai (NULL). Woh sab ek group ban jaayenge.
SELECT
    category,
    COUNT(*) AS post_count
FROM posts
GROUP BY category;
```

Result kuch aisa dikh sakta hai:

| category | post_count |
|----------|-----------|
| Tech     | 42        |
| Travel   | 18        |
| NULL     | 7         |

Ye NULL group un saare posts ko represent karta hai jinki category unknown hai. Zyadatar ye intentional hi hota hai, lekin agar tum uncategorized posts ko count se hataana chahte ho, to grouping se pehle `WHERE category IS NOT NULL` add kar do.

---

## 🧩 ROLLUP aur CUBE — Subtotals aur Cross-Totals

`ROLLUP` ek hierarchy ke along **subtotals aur ek grand total** generate karta hai. `CUBE` subtotals ka **har possible combination** generate karta hai.

### ROLLUP — hierarchy ke har level ka subtotal

```sql
-- PostgreSQL / SQL Server / Oracle
SELECT
    user_id,
    DATE(created_at) AS post_date,
    COUNT(*)          AS post_count
FROM posts
GROUP BY ROLLUP(user_id, DATE(created_at));
```

```sql
-- MySQL
SELECT
    user_id,
    DATE(created_at) AS post_date,
    COUNT(*)          AS post_count
FROM posts
GROUP BY user_id, DATE(created_at) WITH ROLLUP;
```

`ROLLUP(user_id, date)` ye deta hai:
- Har (user_id, date) combination ke liye ek row
- Har user_id ke liye ek subtotal row (date = NULL)
- Ek grand total row (user_id = NULL, date = NULL)

Socho jaise CRED tumhe monthly bill breakdown deta hai — har din ka spend, phir mahine ka subtotal, phir saal ka grand total. ROLLUP wahi karta hai data ke liye.

### CUBE — subtotals ka har combination

```sql
-- PostgreSQL / SQL Server / Oracle
SELECT
    category,
    user_id,
    COUNT(*) AS post_count
FROM posts
GROUP BY CUBE(category, user_id);
```

MySQL natively `CUBE` support nahi karta. MySQL mein tumhe UNION queries se ise simulate karna padega.

---

## 🎛️ GROUPING SETS — Custom Combinations

`GROUPING SETS` tumhe exactly define karne deta hai ki tumhe kaunse grouping combinations chahiye, `CUBE` ke full combinatorial explosion ke bina.

```sql
-- PostgreSQL / SQL Server / Oracle
SELECT
    category,
    user_id,
    COUNT(*) AS post_count
FROM posts
GROUP BY GROUPING SETS (
    (category, user_id),  -- detail level
    (category),           -- category ke hisaab se subtotal
    ()                     -- grand total
);
```

MySQL `GROUPING SETS` support nahi karta. `UNION ALL` se simulate karo:

```sql
-- MySQL equivalent (manual simulation)
SELECT category, user_id, COUNT(*) FROM posts GROUP BY category, user_id
UNION ALL
SELECT category, NULL,    COUNT(*) FROM posts GROUP BY category
UNION ALL
SELECT NULL,     NULL,    COUNT(*) FROM posts;
```

---

## 🧵 String Aggregation — Values Ko List Mein Collect Karna

Kabhi-kabhi counting ki jagah tumhe **multiple rows ke values ko ek string mein jodna** hota hai.

```sql
-- PostgreSQL
SELECT user_id, STRING_AGG(title, ', ' ORDER BY created_at) AS post_titles
FROM posts
GROUP BY user_id;
```

```sql
-- MySQL
SELECT user_id, GROUP_CONCAT(title ORDER BY created_at SEPARATOR ', ') AS post_titles
FROM posts
GROUP BY user_id;
```

```sql
-- SQL Server (2017+)
SELECT user_id, STRING_AGG(title, ', ') WITHIN GROUP (ORDER BY created_at) AS post_titles
FROM posts
GROUP BY user_id;
```

```sql
-- Oracle
SELECT user_id, LISTAGG(title, ', ') WITHIN GROUP (ORDER BY created_at) AS post_titles
FROM posts
GROUP BY user_id;
```

> [!warning]
> Oracle ka `LISTAGG` error throw karta hai agar resulting string 4000 characters se zyada ho jaaye. Bade datasets ke liye `LISTAGG(...) ON OVERFLOW TRUNCATE` (Oracle 19c+) ya `XMLAGG` use karo.

---

## 🌐 Real Social Network Examples

### Sabse active users (all time)

```sql
SELECT
    u.username,
    COUNT(p.id)       AS posts,
    SUM(p.like_count) AS total_likes
FROM users u
LEFT JOIN posts p ON p.user_id = u.id
GROUP BY u.id, u.username
ORDER BY posts DESC
LIMIT 10;
```

### Pichle 30 dino ke daily signup counts

```sql
SELECT
    DATE(created_at) AS signup_date,
    COUNT(*)          AS new_users
FROM users
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY signup_date;
```

### Average se zyada likes wale posts

```sql
SELECT
    p.title,
    p.like_count
FROM posts p
WHERE p.like_count > (SELECT AVG(like_count) FROM posts)
ORDER BY p.like_count DESC;
```

### 5 se zyada posts mein use hue tags

```sql
SELECT
    t.name       AS tag,
    COUNT(pt.post_id) AS usage_count
FROM tags t
JOIN post_tags pt ON pt.tag_id = t.id
GROUP BY t.id, t.name
HAVING COUNT(pt.post_id) > 5
ORDER BY usage_count DESC;
```

---

## 🗺️ Mental Model: Query Execution Order

SQL usi order mein execute nahi hota jis order mein tum likhte ho. Ye logical order samajh lo, confusion nahi hoga:

```
1. FROM / JOIN    — poora dataset assemble karo
2. WHERE          — individual rows filter karo
3. GROUP BY       — groups mein split karo
4. Aggregates     — har group ke liye COUNT, SUM, etc. compute karo
5. HAVING         — groups filter karo
6. SELECT         — columns pick karo / expressions compute karo
7. ORDER BY       — result sort karo
8. LIMIT / FETCH  — N rows tak truncate karo
```

Isi wajah se tum **WHERE ya HAVING ke andar SELECT alias use nahi kar sakte** zyadatar databases mein — kyunki execution ke us point pe wo alias abhi exist hi nahi karta.

---

## ✅ Key Takeaways

- **Aggregate functions** (COUNT, SUM, AVG, MIN, MAX) bahut saari rows ko ek value mein collapse karte hain.
- `COUNT(*)` saari rows count karta hai; `COUNT(col)` NULLs skip karta hai; `COUNT(DISTINCT col)` unique values count karta hai.
- `GROUP BY` rows ko buckets mein split karta hai aur har bucket pe aggregate apply karta hai.
- `GROUP BY` ke saath `SELECT` mein har column ya to `GROUP BY` mein hona chahiye ya aggregate ke andar wrap hona chahiye — MySQL by default ye rule todta hai (isi pe bharosa mat karo).
- `WHERE` grouping se **pehle** rows filter karta hai; `HAVING` aggregation ke **baad** groups filter karta hai.
- `GROUP BY` mein NULLs apna ek alag group bana lete hain.
- `ROLLUP` / `CUBE` / `GROUPING SETS` multi-level summaries generate karte hain; syntax MySQL aur baaki databases mein alag hota hai.
- String aggregation syntax alag-alag hai: `STRING_AGG` (PostgreSQL, SQL Server), `GROUP_CONCAT` (MySQL), `LISTAGG` (Oracle).

---

## 📝 Quiz

**Question 1.** Tum ye query ek 100-row table pe chalate ho, jaha 10 rows mein `email` column NULL hai:

```sql
SELECT COUNT(*), COUNT(email) FROM users;
```

Dono values kya return hongi?

<details>
<summary>Answer</summary>

`COUNT(*)` return karega **100** (NULLs ki parwaah kiye bina saari rows count karta hai).  
`COUNT(email)` return karega **90** (jin 10 rows mein email NULL hai unhe skip kar deta hai).

</details>

---

**Question 2.** Is query mein kya galat hai, aur ise kaise fix karoge?

```sql
SELECT user_id, title, COUNT(*)
FROM posts
GROUP BY user_id;
```

<details>
<summary>Answer</summary>

`title` na to `GROUP BY` mein hai, na hi kisi aggregate function ke andar wrap hai. PostgreSQL, SQL Server, aur Oracle pe ye error dega. MySQL chupke se har group se ek arbitrary `title` return kar dega, jo unpredictable hai.

Fix: ya to `title` ko `GROUP BY` mein add karo (agar tumhe har user+title combination ke liye ek row chahiye), ya `title` ko `SELECT` se hata do (agar tumhe sirf har user ka count chahiye).

</details>

---

**Question 3.** Tumhe wo saare users chahiye jo 2024 mein signup hue **aur** jinhone 3 se zyada posts likhe hain. Kaunsa clause kaha jaayega?

```sql
SELECT u.username, COUNT(p.id) AS post_count
FROM users u
LEFT JOIN posts p ON p.user_id = u.id
WHERE _______________
GROUP BY u.id, u.username
HAVING _______________;
```

<details>
<summary>Answer</summary>

```sql
WHERE  u.created_at >= '2024-01-01' AND u.created_at < '2025-01-01'
HAVING COUNT(p.id) > 3
```

`WHERE` grouping se **pehle** hi users ko 2024 ke sign-ups tak filter kar deta hai (zyada efficient). `HAVING` aggregation ke **baad** resulting groups ko un tak filter karta hai jinke 3 se zyada posts hain.

</details>

---

*Next chapter: Window Functions — running totals, rankings, aur moving averages, bina apni rows collapse kiye.*
