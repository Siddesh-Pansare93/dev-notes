# Chapter 12: CTEs and Window Functions

> "SQL ko uski superpower us din mili jab window functions aaye."

Agar subqueries aur JOINs SQL ki roti-sabzi hain, toh **CTEs** aur **window functions** wo secret sauce hain jo basic SQL likhne walo ko un analysts se alag karte hain jo complex business questions ek hi, readable query mein solve kar sakte hain. Ye chapter dono ko depth mein cover karta hai — clear examples aur real-world use cases ke saath.

---

## Table of Contents

1. [Common Table Expressions (CTEs)](#-common-table-expressions-ctes)
2. [Multiple CTEs](#-multiple-ctes)
3. [CTE vs Subquery](#-cte-vs-subquery-when-to-use-which)
4. [Recursive CTEs](#-recursive-ctes)
5. [Window Functions](#-window-functions-the-game-changer)
6. [OVER, PARTITION BY, ORDER BY](#-the-over-clause-your-window-into-the-data)
7. [Ranking Functions](#-ranking-functions)
8. [LAG and LEAD](#-lag-and-lead-time-travel-between-rows)
9. [FIRST_VALUE and LAST_VALUE](#-first_value-and-last_value)
10. [Aggregate Window Functions](#-aggregate-window-functions)
11. [Real-World Examples](#-real-world-examples)
12. [Key Takeaways](#-key-takeaways)
13. [Quiz](#-quiz)

---

## Sample Data Setup

Is chapter ke saare examples in teen tables use karte hain. Isko ek baar run kar lo taaki saath-saath follow kar sako:

```sql
CREATE TABLE users (
    user_id   INT PRIMARY KEY,
    username  VARCHAR(50),
    joined_at DATE
);

CREATE TABLE posts (
    post_id    INT PRIMARY KEY,
    user_id    INT,
    title      VARCHAR(100),
    created_at DATE,
    views      INT
);

CREATE TABLE sales (
    sale_id    INT PRIMARY KEY,
    sale_date  DATE,
    amount     DECIMAL(10,2),
    region     VARCHAR(50)
);

INSERT INTO users VALUES
(1, 'alice', '2023-01-10'),
(2, 'bob',   '2023-03-15'),
(3, 'carol', '2023-06-01'),
(4, 'dave',  '2024-01-20');

INSERT INTO posts VALUES
(1, 1, 'Intro to SQL',      '2023-02-01', 1500),
(2, 1, 'Joins Explained',   '2023-04-10', 3200),
(3, 1, 'Window Functions',  '2023-09-05', 4800),
(4, 2, 'My First Post',     '2023-04-01', 800),
(5, 2, 'Bob Learns SQL',    '2023-07-20', 600),
(6, 3, 'Carol on CTEs',     '2023-10-11', 2100),
(7, 3, 'Carol on Indexes',  '2024-01-05', 3700),
(8, 3, 'Carol on Triggers', '2024-02-18', 950);

INSERT INTO sales VALUES
(1, '2024-01-01', 1200.00, 'North'),
(2, '2024-01-02',  850.00, 'South'),
(3, '2024-01-03', 2300.00, 'North'),
(4, '2024-01-04',  400.00, 'East'),
(5, '2024-01-05', 1750.00, 'South'),
(6, '2024-01-06',  980.00, 'North'),
(7, '2024-01-07', 3100.00, 'East');
```

---

## 🗂 Common Table Expressions (CTEs)

Kya hota hai CTE? Ek **CTE** (Common Table Expression) ek **named, temporary result set** hota hai jo tum query ke top pe `WITH` keyword ke saath define karte ho. Uske baad tum usko ek normal table ki tarah refer kar sakte ho — lekin woh sirf usi ek query ke duration tak zinda rehta hai.

Isko aise socho — jaise tumne ek subquery ko ek friendly naam de diya, taaki usko reuse aur read karna aasan ho jaaye. Bilkul waise hi jaise Zomato pe tum ek baar "favourites" list bana lete ho aur baar-baar wahi restaurant search nahi karte.

### Basic Syntax

```sql
WITH cte_name AS (
    -- Ye bas ek normal SELECT query hai
    SELECT column1, column2
    FROM some_table
    WHERE some_condition
)
-- Ab isko normal table ki tarah use karo
SELECT *
FROM cte_name;
```

### Tumhara Pehla CTE — Active Users

Chalo dekhte hain kaunse users ne ek se zyada post likhi hai:

```sql
WITH active_users AS (
    SELECT user_id, COUNT(*) AS post_count
    FROM posts
    GROUP BY user_id
    HAVING COUNT(*) > 1
)
SELECT u.username, a.post_count
FROM users u
JOIN active_users a ON u.user_id = a.user_id
ORDER BY a.post_count DESC;
```

Result:

| username | post_count |
|----------|-----------|
| carol    | 3         |
| alice    | 3         |
| bob      | 2         |

CTE `active_users` post counts calculate karta hai. Outer query usko `users` ke saath join karke naam nikal leti hai. Simple aur clean.

---

## 🔗 Multiple CTEs

Kyun zaruri hai multiple CTEs jaanna? Kyunki real-world queries mein ek step se kaam nahi chalta. Tum multiple CTEs ko comma se separate karke chain kar sakte ho. Har CTE apne pehle wale CTE ko bhi reference kar sakta hai — bilkul jaise Swiggy order flow mein pehle cart banta hai, phir uspe discount apply hota hai, phir final bill.

```sql
WITH
-- Step 1: har user ke posts count karo
post_counts AS (
    SELECT user_id, COUNT(*) AS total_posts
    FROM posts
    GROUP BY user_id
),
-- Step 2: har user ka average views nikaalo
avg_views AS (
    SELECT user_id, AVG(views) AS avg_views
    FROM posts
    GROUP BY user_id
),
-- Step 3: dono ko combine karo
user_stats AS (
    SELECT pc.user_id, pc.total_posts, av.avg_views
    FROM post_counts pc
    JOIN avg_views av ON pc.user_id = av.user_id
)
-- Final query
SELECT u.username, s.total_posts, ROUND(s.avg_views, 0) AS avg_views
FROM users u
JOIN user_stats s ON u.user_id = s.user_id
ORDER BY s.total_posts DESC;
```

Result:

| username | total_posts | avg_views |
|----------|-------------|-----------|
| carol    | 3           | 2250      |
| alice    | 3           | 3167      |
| bob      | 2           | 700       |

Har CTE ek building block hai. Tum complexity ko step-by-step build karte ho — ye ek lambi nested subquery se debug karna kaafi aasan hai.

---

## ⚖️ CTE vs Subquery: When to Use Which

Dono, CTE aur subquery, tumhe ek query ke andar dusri query embed karne dete hain. Toh kaunsa kab choose karein?

| Feature | CTE | Subquery |
|---|---|---|
| Readability | Zabardast — top pe naam ke saath defined | Deeply nested hone pe messy ho sakti hai |
| Same query mein reusability | Haan — same CTE ko multiple baar reference kar sakte ho | Nahi — subquery baar-baar repeat karni padegi |
| Recursive queries | Haan (recursive CTEs) | Nahi |
| Performance | Usually same; kuch DBs CTE ko materialize karte hain | Kabhi-kabhi thoda fast (optimizer inline kar deta hai) |
| Debugging | Aasan — har CTE ko alag test kar sakte ho | Mushkil — nesting untangle karni padti hai |

**Rule of thumb:**
- **Subquery** use karo jab logic simple ho aur sirf ek baar use ho raha ho.
- **CTE** use karo jab logic complex ho, reuse ho raha ho, ya ek naam se fayda ho.

```sql
-- Subquery version (simple cases ke liye theek hai)
SELECT username
FROM users
WHERE user_id IN (
    SELECT user_id FROM posts GROUP BY user_id HAVING COUNT(*) > 1
);

-- CTE version (jab logic badhta hai, ye preferred hai)
WITH prolific_authors AS (
    SELECT user_id FROM posts GROUP BY user_id HAVING COUNT(*) > 1
)
SELECT username
FROM users
WHERE user_id IN (SELECT user_id FROM prolific_authors);
```

---

## 🔄 Recursive CTEs

Kya hota hai recursive CTE? Ye ek aisa CTE hota hai jo khud ko reference karta hai. Ye do parts mein kaam karta hai:

1. **Anchor member** — starting point (base case), ek hi baar chalta hai.
2. **Recursive member** — CTE ko khud reference karta hai, tab tak baar-baar chalta hai jab tak aur rows nahi milti.

> [!warning]
> Hamesha ek termination condition rakho (ek `WHERE` clause ya maximum depth guard) — warna tumhari query hamesha ke liye loop ho jaayegi!

### Syntax Difference: RECURSIVE Keyword

| Database | Syntax |
|---|---|
| PostgreSQL | `WITH RECURSIVE cte_name AS (...)` |
| MySQL 8.0+ | `WITH RECURSIVE cte_name AS (...)` |
| SQLite | `WITH RECURSIVE cte_name AS (...)` |
| SQL Server | `WITH cte_name AS (...)` — `RECURSIVE` keyword nahi chahiye |
| Oracle | `WITH cte_name AS (...)` — `RECURSIVE` keyword nahi chahiye |

### Example 1 — Organizational Hierarchy

Maan lo hamare paas ek `employees` table hai jahan har employee ka ek `manager_id` hota hai — bilkul jaise kisi company mein reporting structure hota hai (CEO → VP → Manager → Engineer):

```sql
CREATE TABLE employees (
    emp_id     INT PRIMARY KEY,
    name       VARCHAR(50),
    manager_id INT  -- NULL matlab org ka sabse top
);

INSERT INTO employees VALUES
(1, 'CEO Alice',    NULL),
(2, 'VP Bob',       1),
(3, 'VP Carol',     1),
(4, 'Mgr Dave',     2),
(5, 'Eng Eve',      4),
(6, 'Eng Frank',    4),
(7, 'Designer Gina',3);
```

**Goal:** CEO se start karke, har employee aur uska level hierarchy mein list karo.

```sql
-- PostgreSQL / MySQL / SQLite
WITH RECURSIVE org_chart AS (
    -- Anchor: CEO se start karo (koi manager nahi)
    SELECT emp_id, name, manager_id, 1 AS level
    FROM employees
    WHERE manager_id IS NULL

    UNION ALL

    -- Recursive: CTE mein already maujood har row ke direct reports dhoondo
    SELECT e.emp_id, e.name, e.manager_id, oc.level + 1
    FROM employees e
    JOIN org_chart oc ON e.manager_id = oc.emp_id
)
SELECT
    REPEAT('  ', level - 1) || name AS hierarchy,  -- level ke hisaab se indent karo
    level
FROM org_chart
ORDER BY level, emp_id;
```

```sql
-- SQL Server (RECURSIVE keyword nahi, REPEAT ki jagah REPLICATE use karo)
WITH org_chart AS (
    SELECT emp_id, name, manager_id, 1 AS level
    FROM employees
    WHERE manager_id IS NULL

    UNION ALL

    SELECT e.emp_id, e.name, e.manager_id, oc.level + 1
    FROM employees e
    JOIN org_chart oc ON e.manager_id = oc.emp_id
)
SELECT
    REPLICATE('  ', level - 1) + name AS hierarchy,
    level
FROM org_chart
ORDER BY level, emp_id;
```

Result:

| hierarchy        | level |
|------------------|-------|
| CEO Alice        | 1     |
|   VP Bob         | 2     |
|   VP Carol       | 2     |
|     Mgr Dave     | 3     |
|       Eng Eve    | 4     |
|       Eng Frank  | 4     |
|   Designer Gina  | 3     |

Query tree ko "walk" karti hai: level 1 → level 2 → level 3 → level 4, aur jab aur employees nahi milte tab ruk jaati hai.

### Example 2 — Numbers Ki Series Generate Karna

`generate_series()` function ke bina numbers ki sequence chahiye? Recursive CTE ye kar sakta hai:

```sql
-- PostgreSQL / MySQL / SQLite
WITH RECURSIVE numbers AS (
    SELECT 1 AS n         -- anchor: 1 se start
    UNION ALL
    SELECT n + 1          -- recursive: har baar 1 add karo
    FROM numbers
    WHERE n < 10          -- termination: 10 pe ruk jao
)
SELECT n FROM numbers;
```

```sql
-- SQL Server
WITH numbers AS (
    SELECT 1 AS n
    UNION ALL
    SELECT n + 1
    FROM numbers
    WHERE n < 10
)
SELECT n FROM numbers;
```

Result: `1, 2, 3, 4, 5, 6, 7, 8, 9, 10`

Isko tum **date series generate** karne ke liye bhi adapt kar sakte ho (reports mein missing dates fill karne ke liye kaafi useful hai):

```sql
-- PostgreSQL
WITH RECURSIVE date_series AS (
    SELECT '2024-01-01'::DATE AS d
    UNION ALL
    SELECT d + INTERVAL '1 day'
    FROM date_series
    WHERE d < '2024-01-07'
)
SELECT d FROM date_series;
```

---

## 🪟 Window Functions: The Game Changer

Kya hota hai window function? Ye current row se related rows ke ek set — jisse "window" kehte hain — par calculation karta hai, **bina un rows ko ek single output row mein collapse kiye**, jaisa `GROUP BY` karta hai.

Yehi critical difference hai:

```sql
-- GROUP BY: rows collapse ho jaati hain — individual rows kho jaati hain
SELECT user_id, SUM(views) AS total_views
FROM posts
GROUP BY user_id;
-- Har user_id ke liye 1 row return karta hai

-- Window function: saari rows rakhta hai + aggregate ko saath mein add karta hai
SELECT post_id, user_id, views,
       SUM(views) OVER (PARTITION BY user_id) AS total_views_per_user
FROM posts;
-- SAARI rows return karta hai, total_views_per_user ek extra column ke roop mein
```

Window functions har major database mein support hote hain:

| Database | Minimum Version |
|---|---|
| PostgreSQL | 8.4+ |
| MySQL | 8.0+ |
| SQL Server | 2012+ |
| Oracle | 8i+ |
| SQLite | 3.25+ |

---

## 🔭 The OVER() Clause: Your Window Into the Data

Kyun zaruri hai OVER() samajhna? Kyunki har window function ke baad `OVER(...)` aata hai. `OVER` clause "window" define karta hai — yaani function current row ke relative konsi rows ko dekhta hai.

```sql
function_name(column) OVER (
    PARTITION BY partition_column   -- rows ko groups mein baanto
    ORDER BY order_column           -- har group ke andar order set karo
    ROWS BETWEEN start AND end      -- optional: frame specification
)
```

Teeno parts optional hain. Ek empty `OVER()` ka matlab hai "saari rows dekho."

| Clause | Kya karta hai |
|---|---|
| `PARTITION BY col` | Rows ko groups mein split karta hai (GROUP BY jaisa, lekin saari rows rakhta hai) |
| `ORDER BY col` | Har partition ke andar ordering set karta hai |
| `ROWS BETWEEN ... AND ...` | Rows ka exact frame specify karta hai jo include hoga |

### Frame Specification

Frame clause define karta hai ki current row ke relative kaunsi rows include hongi:

```sql
ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW   -- pehli row se current tak (running totals ke liye default)
ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING           -- current row ± 1 neighbor
ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING -- poora partition
```

---

## 🏆 Ranking Functions

### ROW_NUMBER() — Unique Sequential Number

Har row ko partition ke andar ek unique integer deta hai, 1 se start hokar. Koi tie nahi — har row ko alag number milta hai.

```sql
SELECT
    username,
    post_id,
    views,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY views DESC) AS row_num
FROM posts
JOIN users USING (user_id);
```

| username | post_id | views | row_num |
|----------|---------|-------|---------|
| alice    | 3       | 4800  | 1       |
| alice    | 2       | 3200  | 2       |
| alice    | 1       | 1500  | 3       |
| bob      | 4       | 800   | 1       |
| bob      | 5       | 600   | 2       |
| carol    | 7       | 3700  | 1       |
| carol    | 6       | 2100  | 2       |
| carol    | 8       | 950   | 3       |

Har user ke posts alag-alag number ho jaate hain, sabse zyada views wala pehle.

### RANK() — Ties Ke Liye Gaps Wala Rank

Ranks deta hai, lekin jab do rows tie karti hain, dono ka same rank hota hai aur next rank **skip** ho jaata hai (jaise 1, 1, 3).

### DENSE_RANK() — Bina Gaps Ke Rank

`RANK()` jaisa hi, lekin tied rows same rank share karti hain aur **next rank skip nahi hota** (jaise 1, 1, 2).

```sql
-- Teeno ranking functions ek saath dikhao
SELECT
    region,
    sale_id,
    amount,
    ROW_NUMBER()  OVER (PARTITION BY region ORDER BY amount DESC) AS row_num,
    RANK()        OVER (PARTITION BY region ORDER BY amount DESC) AS rnk,
    DENSE_RANK()  OVER (PARTITION BY region ORDER BY amount DESC) AS dense_rnk
FROM sales
ORDER BY region, amount DESC;
```

Agar same region mein do sales ka amount same hota, toh dikhega:

| region | amount | row_num | rnk | dense_rnk |
|--------|--------|---------|-----|-----------|
| North  | 2300   | 1       | 1   | 1         |
| North  | 1200   | 2       | 2   | 2         |
| North  | 1200   | 3       | 2   | 2         |  ← tie example
| North  | 980    | 4       | 4   | 3         |  ← RANK 4 pe jump karta hai, DENSE_RANK 3 pe jaata hai

### NTILE(n) — Buckets Mein Divide Karo

Partition ki rows ko `n` roughly equal groups mein baant deta hai (quartiles, deciles, etc.) aur ek bucket number assign karta hai.

```sql
-- Posts ko views ke hisaab se 3 tiers mein divide karo
SELECT
    post_id,
    title,
    views,
    NTILE(3) OVER (ORDER BY views DESC) AS tier
FROM posts;
```

| post_id | title             | views | tier |
|---------|-------------------|-------|------|
| 3       | Window Functions  | 4800  | 1    |
| 7       | Carol on Indexes  | 3700  | 1    |
| 2       | Joins Explained   | 3200  | 1    |
| 6       | Carol on CTEs     | 2100  | 2    |
| 1       | Intro to SQL      | 1500  | 2    |
| 8       | Carol on Triggers | 950   | 2    |
| 4       | My First Post     | 800   | 3    |
| 5       | Bob Learns SQL    | 600   | 3    |

Tier 1 = top third, Tier 3 = bottom third. Percentile-based segmentation ke liye zabardast — jaise CRED apne users ko credit score ke hisaab se tiers mein daalta hai.

---

## ⏪ LAG and LEAD: Time Travel Between Rows

`LAG` aur `LEAD` tumhe **pichli** ya **agli** row ki value bina self-join ke dekhne dete hain. Sequential data jaise daily sales, stock prices, ya step-by-step events compare karne ke liye ye bahut kaam ki cheez hain.

```sql
LAG(column, offset, default)  OVER (PARTITION BY ... ORDER BY ...)
LEAD(column, offset, default) OVER (PARTITION BY ... ORDER BY ...)
```

- `offset` — kitni rows peeche (LAG) ya aage (LEAD) jaana hai. Default 1 hota hai.
- `default` — agar pichli/agli row hai hi nahi toh kya return karna hai (jaise pehli row ki koi pichli row nahi hoti).

### Example: Har Din Ki Sales Ko Pichle Din Se Compare Karo

```sql
SELECT
    sale_date,
    amount,
    LAG(amount, 1, 0) OVER (ORDER BY sale_date) AS prev_day_amount,
    amount - LAG(amount, 1, 0) OVER (ORDER BY sale_date) AS day_over_day_change
FROM sales
ORDER BY sale_date;
```

| sale_date  | amount  | prev_day_amount | day_over_day_change |
|------------|---------|-----------------|---------------------|
| 2024-01-01 | 1200.00 | 0.00            | 1200.00             |
| 2024-01-02 | 850.00  | 1200.00         | -350.00             |
| 2024-01-03 | 2300.00 | 850.00          | 1450.00             |
| 2024-01-04 | 400.00  | 2300.00         | -1900.00            |
| 2024-01-05 | 1750.00 | 400.00          | 1350.00             |
| 2024-01-06 | 980.00  | 1750.00         | -770.00             |
| 2024-01-07 | 3100.00 | 980.00          | 2120.00             |

`LEAD` se tum aage bhi dekh sakte ho — jaise agle din ki expected sales dikhana.

```sql
SELECT
    sale_date,
    amount,
    LEAD(amount, 1) OVER (ORDER BY sale_date) AS next_day_amount
FROM sales;
```

---

## 🔝 FIRST_VALUE and LAST_VALUE

Ye window frame mein **pehli** ya **aakhri** value return karte hain.

```sql
FIRST_VALUE(column) OVER (PARTITION BY ... ORDER BY ... ROWS BETWEEN ...)
LAST_VALUE(column)  OVER (PARTITION BY ... ORDER BY ... ROWS BETWEEN ...)
```

### FIRST_VALUE — Easy Wala

```sql
-- Har post ke liye, usi user ka sabse zyada view wala post dikhao
SELECT
    post_id,
    user_id,
    title,
    views,
    FIRST_VALUE(title) OVER (
        PARTITION BY user_id
        ORDER BY views DESC
    ) AS top_post_by_user
FROM posts;
```

### LAST_VALUE — Yahan Gotcha Hai!

`LAST_VALUE` mein ek common trap hai. Default se, window frame `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` hota hai, jiska matlab hai "pehli row se current row tak." Toh `LAST_VALUE` **current row ki value** hi return karta hai, partition ki last value nahi!

> [!warning]
> Bilkul waise hi jaise koi tumse bole "list ki last cheez batao" lekin tumhe list ka sirf aadha hissa dikhaya jaaye — tum uss aadhe hisse ki last cheez hi bataoge, poori list ki nahi.

**Fix:** Frame ko explicitly expand karo taaki partition ki saari rows cover ho jaayein:

```sql
-- Galat: LAST_VALUE current row ki value return karta hai (frame default se current row pe khatam hota hai)
SELECT post_id, views,
    LAST_VALUE(title) OVER (PARTITION BY user_id ORDER BY views DESC) AS wrong_last
FROM posts;

-- Sahi: frame ko poore partition tak expand karo
SELECT post_id, views,
    LAST_VALUE(title) OVER (
        PARTITION BY user_id
        ORDER BY views DESC
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS correct_last
FROM posts;
```

Fixed frame ke saath, `LAST_VALUE` ab sahi se har user ke sabse kam-viewed post ka title return karta hai.

---

## ➕ Aggregate Window Functions

Standard aggregate functions (`SUM`, `AVG`, `COUNT`, `MIN`, `MAX`) jab `OVER()` ke saath use hote hain toh window functions ban jaate hain. Ye rows ko collapse karne ki jagah window ke across aggregation perform karte hain.

### Running Total (Cumulative SUM)

```sql
SELECT
    sale_date,
    amount,
    SUM(amount) OVER (ORDER BY sale_date) AS running_total
FROM sales
ORDER BY sale_date;
```

| sale_date  | amount  | running_total |
|------------|---------|---------------|
| 2024-01-01 | 1200.00 | 1200.00       |
| 2024-01-02 | 850.00  | 2050.00       |
| 2024-01-03 | 2300.00 | 4350.00       |
| 2024-01-04 | 400.00  | 4750.00       |
| 2024-01-05 | 1750.00 | 6500.00       |
| 2024-01-06 | 980.00  | 7480.00       |
| 2024-01-07 | 3100.00 | 10580.00      |

`OVER()` ke andar wala `ORDER BY` `SUM` ko accumulate karwata hai — har row ko apne tak ki saari rows ka sum milta hai. Bilkul jaise UPI transaction history mein "total spent till date" dikhta hai.

### Moving Average (3-Day Window)

```sql
SELECT
    sale_date,
    amount,
    ROUND(
        AVG(amount) OVER (
            ORDER BY sale_date
            ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
        ), 2
    ) AS moving_avg_3day
FROM sales
ORDER BY sale_date;
```

| sale_date  | amount  | moving_avg_3day |
|------------|---------|-----------------|
| 2024-01-01 | 1200.00 | 1200.00         |
| 2024-01-02 | 850.00  | 1025.00         |
| 2024-01-03 | 2300.00 | 1450.00         |
| 2024-01-04 | 400.00  | 1183.33         |
| 2024-01-05 | 1750.00 | 1483.33         |

`ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` ka matlab hai: current row plus usse pehle ki 2 rows dekho (3-row ka sliding window).

### Running COUNT

```sql
SELECT
    sale_date,
    region,
    COUNT(*) OVER (PARTITION BY region ORDER BY sale_date) AS running_count_per_region
FROM sales;
```

Ye har region ki sales ka time ke saath cumulative count deta hai — useful hai ye track karne ke liye ki har region kitni jaldi milestones hit kar raha hai.

---

## 🌍 Real-World Examples

### 1. Users Ko Post Count Se Rank Karo

**Business question:** Hamare sabse zyada likhne wale writers kaun hain? Sabko unke rank ke saath dikhao.

```sql
WITH post_counts AS (
    SELECT user_id, COUNT(*) AS total_posts
    FROM posts
    GROUP BY user_id
)
SELECT
    u.username,
    pc.total_posts,
    RANK() OVER (ORDER BY pc.total_posts DESC) AS author_rank
FROM users u
LEFT JOIN post_counts pc ON u.user_id = pc.user_id
ORDER BY author_rank;
```

| username | total_posts | author_rank |
|----------|-------------|-------------|
| alice    | 3           | 1           |
| carol    | 3           | 1           |
| bob      | 2           | 3           |
| dave     | NULL        | 4           |

### 2. Revenue Ka Running Total Calculate Karo

**Business question:** Ek daily revenue dashboard banao jisme cumulative total dikhe.

```sql
SELECT
    sale_date,
    region,
    amount,
    SUM(amount) OVER (ORDER BY sale_date
                      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cumulative_revenue
FROM sales
ORDER BY sale_date;
```

### 3. Aaj Ki Sales Ko Kal Se Compare Karo (LAG)

**Business question:** Un dino ko flag karo jaha sales pichle din se 30% se zyada gir gayi ho.

```sql
WITH daily_change AS (
    SELECT
        sale_date,
        amount,
        LAG(amount) OVER (ORDER BY sale_date) AS prev_amount
    FROM sales
)
SELECT
    sale_date,
    amount,
    prev_amount,
    ROUND((amount - prev_amount) / prev_amount * 100, 1) AS pct_change,
    CASE
        WHEN (amount - prev_amount) / prev_amount * 100 < -30
        THEN 'Alert: Sharp Drop'
        ELSE 'Normal'
    END AS status
FROM daily_change
WHERE prev_amount IS NOT NULL
ORDER BY sale_date;
```

### 4. Har User Ke Top 3 Posts Dhoondo

**Business question:** Har user ke liye, "Best Of" feature ke liye unke teen sabse zyada view wale posts nikaalo.

```sql
WITH ranked_posts AS (
    SELECT
        u.username,
        p.title,
        p.views,
        ROW_NUMBER() OVER (
            PARTITION BY p.user_id
            ORDER BY p.views DESC
        ) AS view_rank
    FROM posts p
    JOIN users u ON p.user_id = u.user_id
)
SELECT username, title, views, view_rank
FROM ranked_posts
WHERE view_rank <= 3
ORDER BY username, view_rank;
```

| username | title             | views | view_rank |
|----------|-------------------|-------|-----------|
| alice    | Window Functions  | 4800  | 1         |
| alice    | Joins Explained   | 3200  | 2         |
| alice    | Intro to SQL      | 1500  | 3         |
| bob      | My First Post     | 800   | 1         |
| bob      | Bob Learns SQL    | 600   | 2         |
| carol    | Carol on Indexes  | 3700  | 1         |
| carol    | Carol on CTEs     | 2100  | 2         |
| carol    | Carol on Triggers | 950   | 3         |

Ye pattern — CTE se `WHERE row_num <= N` filter karna — SQL analytics ke sabse common interview questions aur real-world patterns mein se ek hai. CTEs aur window functions ka combination isko clean, efficient aur readable banata hai.

---

## 🔑 Key Takeaways

- **CTE** ek named temporary query hoti hai jo `WITH` se define hoti hai. Ye complex queries ko readable banata hai aur same query ke andar reuse allow karta hai.
- **Multiple CTEs** ko commas se chain kar sakte ho, jisse logic step-by-step build hota hai.
- **Recursive CTE** khud ko reference karke hierarchies traverse karta hai ya series generate karta hai. PostgreSQL, MySQL, aur SQLite ko `RECURSIVE` keyword chahiye; SQL Server aur Oracle ko nahi.
- Recursive CTEs mein hamesha termination condition rakho, warna infinite loop ho jaayega.
- **Window function** current row se related rows ke "window" par operate karta hai — `GROUP BY` ke ulat, ye rows ko collapse nahi karta.
- `OVER()` clause window define karta hai: `PARTITION BY` rows ko group karta hai, `ORDER BY` group ke andar order set karta hai, aur frame clause (`ROWS BETWEEN`) exact range set karta hai.
- **Ranking functions:** `ROW_NUMBER()` unique numbers deta hai, `RANK()` mein ties ke liye gaps hote hain, `DENSE_RANK()` mein gaps nahi hote, `NTILE(n)` buckets mein divide karta hai.
- **LAG / LEAD** bina self-join ke neighboring rows access karte hain — time-series comparisons ke liye perfect.
- **FIRST_VALUE / LAST_VALUE** boundary values retrieve karte hain; `LAST_VALUE` ke liye hamesha frame specify karo taaki default-frame gotcha se bacha ja sake.
- **Aggregate window functions** (`SUM`, `AVG`, `COUNT` with `OVER()`) running totals, moving averages, aur cumulative counts enable karte hain.
- CTEs aur window functions ka combination bilkul kisi bhi analytics query ko unlock kar deta hai jo tumhe chahiye ho.

---

## 🧠 Quiz

**Question 1:**

Tumhare paas ek `transactions` table hai jisme columns `txn_date` aur `revenue` hain. Tum har transaction row ke saath uski **cumulative sum** of revenue dikhana chahte ho, date ke order mein. Kaunsi query sahi hai?

**A.**
```sql
SELECT txn_date, revenue, SUM(revenue) GROUP BY txn_date;
```
**B.**
```sql
SELECT txn_date, revenue,
       SUM(revenue) OVER (ORDER BY txn_date) AS running_total
FROM transactions;
```
**C.**
```sql
SELECT txn_date, revenue,
       SUM(revenue) OVER (PARTITION BY txn_date) AS running_total
FROM transactions;
```
**D.**
```sql
SELECT txn_date, SUM(revenue) AS running_total
FROM transactions
GROUP BY txn_date;
```

<details>
<summary>Answer</summary>

**B** sahi hai. `SUM(revenue) OVER (ORDER BY txn_date)` default se `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` leta hai, jo saari rows dikhate hue running total produce karta hai. Option A aur D GROUP BY se rows collapse kar dete hain. Option C date pe PARTITION BY use karta hai, jo sirf har date ke andar sum karta hai (running total nahi).

</details>

---

**Question 2:**

Tumne employee hierarchy walk karne ke liye ek recursive CTE likha. Run karne ke baad, query hamesha ke liye chalti rehti hai aur crash ho jaati hai. Sabse zyada possible kya galat hua?

**A.** Tum anchor aur recursive member ke beech `UNION ALL` bhool gaye.  
**B.** Tumne SQL Server mein `RECURSIVE` keyword use kar diya.  
**C.** Tum termination condition bhool gaye — recursive member hamesha rows dhoondta rehta hai (shaayad data mein cycle hai ya WHERE clause missing hai).  
**D.** Recursive CTEs `JOIN` support nahi karte.

<details>
<summary>Answer</summary>

**C** sahi hai. Proper termination condition (ek `WHERE` clause jo eventually zero rows return kare) ke bina, recursive member chalta hi rehta hai. Ye tab ho sakta hai jab data mein cycle ho (employee A, B ko report karta ho, aur B, A ko) ya stopping condition bilkul missing ho. Option B galat hai kyunki SQL Server simply RECURSIVE use nahi karta lekin phir bhi theek se kaam karta hai. Options A aur D errors dete, infinite loops nahi.

</details>

---

**Question 3:**

Ye query dekho:

```sql
SELECT
    user_id,
    post_id,
    views,
    LAST_VALUE(views) OVER (
        PARTITION BY user_id
        ORDER BY views DESC
    ) AS last_val
FROM posts;
```

`last_val` zyadatar rows ke liye kya contain karega, aur kyun?

**A.** User ke partition mein sabse zyada views, kyunki ORDER BY descending sort karta hai.  
**B.** Har row par `views` jaisi hi value, kyunki default frame current row pe khatam hota hai.  
**C.** User ke partition mein sabse kam views, kyunki `LAST_VALUE` hamesha partition ke end ko dekhta hai.  
**D.** `NULL`, kyunki koi frame clause specify nahi kiya gaya.

<details>
<summary>Answer</summary>

**B** sahi hai. Ye classic `LAST_VALUE` gotcha hai. Bina explicit frame clause ke, default `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` hota hai. Toh `LAST_VALUE` sirf partition ke start se current row tak ki rows dekhta hai — aur un mein se last hamesha current row hi hoti hai. Partition ki actual last value paane ke liye tumhe `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` specify karna hoga.

</details>

---

*Next chapter: Indexes and Query Optimization — apni queries ko scale pe fast banana.*
