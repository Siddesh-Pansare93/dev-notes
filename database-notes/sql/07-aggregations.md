# 📊 Aggregations, GROUP BY, and HAVING

> **Who this is for:** Developers who know basic SELECT, WHERE, and JOIN but want to crunch numbers and summarize data like a pro.

---

## 🧮 What Are Aggregate Functions?

So far you have been fetching individual rows. Aggregations let you **collapse many rows into a single summary value** — counting users, summing revenue, finding the oldest post, and so on.

SQL has five core aggregate functions that work the same way across all major databases:

| Function | What it returns |
|---|---|
| `COUNT(...)` | Number of rows (or non-NULL values) |
| `SUM(col)` | Total of all values in a numeric column |
| `AVG(col)` | Average of all values |
| `MIN(col)` | Smallest value |
| `MAX(col)` | Largest value |

### Basic example — no grouping yet

```sql
SELECT
    COUNT(*)        AS total_posts,
    AVG(like_count) AS avg_likes,
    MAX(like_count) AS most_liked,
    MIN(like_count) AS least_liked
FROM posts;
```

This returns **one row** summarising every row in the `posts` table.

---

## 🔢 COUNT(*) vs COUNT(column) vs COUNT(DISTINCT column)

These three look similar but behave very differently. Knowing the difference saves you from silent bugs.

```sql
-- Scenario: the `posts` table has 10 rows, but 2 rows have NULL in `image_url`

SELECT
    COUNT(*)              AS all_rows,         -- 10  (counts everything)
    COUNT(image_url)      AS rows_with_image,  -- 8   (skips NULLs)
    COUNT(DISTINCT user_id) AS unique_authors  -- however many distinct user_ids exist
FROM posts;
```

**Rules:**

- `COUNT(*)` — counts every row, including rows where every column is NULL. Use this when you just want the row count.
- `COUNT(column)` — counts rows where that column is **not NULL**. Use this to count "how many rows have a value here".
- `COUNT(DISTINCT column)` — counts unique non-NULL values. Use this to answer "how many different users posted?".

> **Tip:** `SUM`, `AVG`, `MIN`, and `MAX` all silently ignore NULLs too. This is almost always what you want, but keep it in mind when a column is sparse.

---

## 🗂️ GROUP BY — Aggregating Per Group

Without `GROUP BY`, every aggregate collapses the whole table into one row. With `GROUP BY`, SQL first **splits rows into buckets** based on the column(s) you specify, then applies the aggregate **inside each bucket**.

### Social network example: posts per user

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

SQL grouped every row that shares the same `user_id`, then counted how many rows are in each group.

### Grouping by multiple columns

```sql
-- Posts per user, per day
SELECT
    user_id,
    DATE(created_at) AS post_date,
    COUNT(*)          AS daily_posts
FROM posts
GROUP BY user_id, DATE(created_at)
ORDER BY post_date DESC;
```

---

## ⚠️ The SELECT Rule with GROUP BY

This is one of the most common beginner mistakes. Once you add `GROUP BY`, **only two kinds of expressions are allowed in SELECT**:

1. Columns that appear in the `GROUP BY` clause
2. Aggregate function calls

```sql
-- WRONG in PostgreSQL and SQL Server — title is not in GROUP BY
SELECT user_id, title, COUNT(*)
FROM posts
GROUP BY user_id;

-- CORRECT
SELECT user_id, COUNT(*)
FROM posts
GROUP BY user_id;
```

### Database behaviour comparison

| Database | Behaviour |
|---|---|
| **PostgreSQL** | Strict — raises an error if a non-aggregated, non-grouped column appears in SELECT |
| **SQL Server** | Strict — same error as PostgreSQL |
| **Oracle** | Strict — same error |
| **MySQL** | Lenient by default — silently picks an arbitrary value from the group for the extra column. **This is dangerous and produces unpredictable results.** |

MySQL's leniency is a footgun. You can (and should) enable strict mode in MySQL:

```sql
-- MySQL: enable strict GROUP BY validation
SET sql_mode = 'ONLY_FULL_GROUP_BY,...';
```

Always write queries that would be valid on a strict engine, even when using MySQL.

---

## 🔍 HAVING — Filtering Groups After Aggregation

`WHERE` filters **individual rows before grouping**. `HAVING` filters **groups after aggregation**.

```sql
-- Users who have posted more than 10 times
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
| **Runs** | Before GROUP BY | After GROUP BY |
| **Filters** | Individual rows | Aggregated groups |
| **Can reference** | Raw column values | Aggregate results |
| **Use when** | Excluding rows from the calculation | Excluding groups from the result |

### Using both together

```sql
-- Among posts created in 2024, find users with more than 5 such posts
SELECT
    user_id,
    COUNT(*) AS post_count
FROM posts
WHERE created_at >= '2024-01-01'   -- filters rows FIRST
GROUP BY user_id
HAVING COUNT(*) > 5;               -- filters groups SECOND
```

The `WHERE` here means rows from 2023 never even enter the grouping calculation — which is more efficient than filtering after the fact with `HAVING`.

> **Rule of thumb:** Filter as early as possible. Use WHERE to shrink the dataset, then HAVING to trim unwanted groups.

---

## ↕️ ORDER BY with Aggregates

You can sort by an aggregate result just like any column:

```sql
-- Most active users first
SELECT
    user_id,
    COUNT(*) AS post_count
FROM posts
GROUP BY user_id
ORDER BY post_count DESC;
```

You can also use the aggregate expression directly in `ORDER BY`:

```sql
ORDER BY COUNT(*) DESC
```

Both forms work across all major databases.

---

## 🔗 Aggregations with JOINs

Real queries often combine tables before grouping. The JOIN happens first; aggregation runs on the joined result.

### Count posts per user (showing username, not just ID)

```sql
SELECT
    u.username,
    COUNT(p.id) AS post_count
FROM users u
LEFT JOIN posts p ON p.user_id = u.id
GROUP BY u.id, u.username
ORDER BY post_count DESC;
```

Why `LEFT JOIN`? So users with zero posts still appear in the result with a count of 0. `COUNT(p.id)` returns 0 when there are no matching posts (because `p.id` is NULL for those rows).

### Likes per post (with post title)

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

## 🔄 NULL in GROUP BY

When a column contains NULLs, SQL treats all NULL values as **a single group**. This is consistent across all databases.

```sql
-- Some posts have no category (NULL). They will appear as one group.
SELECT
    category,
    COUNT(*) AS post_count
FROM posts
GROUP BY category;
```

Result might look like:

| category | post_count |
|----------|-----------|
| Tech     | 42        |
| Travel   | 18        |
| NULL     | 7         |

The NULL group represents all posts where `category` is unknown. This is usually intentional, but if you want to exclude uncategorized posts from your count, add `WHERE category IS NOT NULL` before grouping.

---

## 🧩 ROLLUP and CUBE — Subtotals and Cross-Totals

`ROLLUP` generates **subtotals and a grand total** along a hierarchy. `CUBE` generates **every possible combination** of subtotals.

### ROLLUP — subtotals per hierarchy level

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

`ROLLUP(user_id, date)` produces:
- One row per (user_id, date) combination
- One subtotal row per user_id (date = NULL)
- One grand total row (user_id = NULL, date = NULL)

### CUBE — every combination of subtotals

```sql
-- PostgreSQL / SQL Server / Oracle
SELECT
    category,
    user_id,
    COUNT(*) AS post_count
FROM posts
GROUP BY CUBE(category, user_id);
```

MySQL does not support `CUBE` natively. For MySQL, you must simulate it with UNION queries.

---

## 🎛️ GROUPING SETS — Custom Combinations

`GROUPING SETS` lets you define exactly which grouping combinations you want, without the full combinatorial explosion of `CUBE`.

```sql
-- PostgreSQL / SQL Server / Oracle
SELECT
    category,
    user_id,
    COUNT(*) AS post_count
FROM posts
GROUP BY GROUPING SETS (
    (category, user_id),  -- detail level
    (category),           -- subtotal by category
    ()                    -- grand total
);
```

MySQL does not support `GROUPING SETS`. Simulate with `UNION ALL`:

```sql
-- MySQL equivalent (manual simulation)
SELECT category, user_id, COUNT(*) FROM posts GROUP BY category, user_id
UNION ALL
SELECT category, NULL,    COUNT(*) FROM posts GROUP BY category
UNION ALL
SELECT NULL,     NULL,    COUNT(*) FROM posts;
```

---

## 🧵 String Aggregation — Collecting Values into a List

Sometimes instead of counting, you want to **concatenate values from multiple rows into one string**.

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

> **Watch out:** Oracle's `LISTAGG` throws an error if the resulting string exceeds 4000 characters. Use `LISTAGG(...) ON OVERFLOW TRUNCATE` (Oracle 19c+) or `XMLAGG` for large datasets.

---

## 🌐 Real Social Network Examples

### Most active users (all time)

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

### Daily signup counts for the last 30 days

```sql
SELECT
    DATE(created_at) AS signup_date,
    COUNT(*)          AS new_users
FROM users
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY signup_date;
```

### Posts with above-average likes

```sql
SELECT
    p.title,
    p.like_count
FROM posts p
WHERE p.like_count > (SELECT AVG(like_count) FROM posts)
ORDER BY p.like_count DESC;
```

### Tags used in more than 5 posts

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

SQL does not execute in the order you write it. Understanding the logical order prevents confusion:

```
1. FROM / JOIN    — assemble the full dataset
2. WHERE          — filter individual rows
3. GROUP BY       — split into groups
4. Aggregates     — compute COUNT, SUM, etc. per group
5. HAVING         — filter groups
6. SELECT         — pick columns / compute expressions
7. ORDER BY       — sort the result
8. LIMIT / FETCH  — truncate to N rows
```

This is why you **cannot use a SELECT alias inside WHERE or HAVING** in most databases — the alias does not exist yet at that point in execution.

---

## ✅ Key Takeaways

- **Aggregate functions** (COUNT, SUM, AVG, MIN, MAX) collapse many rows into one value.
- `COUNT(*)` counts all rows; `COUNT(col)` skips NULLs; `COUNT(DISTINCT col)` counts unique values.
- `GROUP BY` splits rows into buckets and applies aggregates per bucket.
- In `SELECT` with `GROUP BY`, every column must be either in `GROUP BY` or wrapped in an aggregate — MySQL breaks this rule by default (do not rely on that).
- `WHERE` filters rows **before** grouping; `HAVING` filters groups **after** aggregation.
- NULLs form their own group in `GROUP BY`.
- `ROLLUP` / `CUBE` / `GROUPING SETS` generate multi-level summaries; syntax varies between MySQL and the rest.
- String aggregation syntax varies: `STRING_AGG` (PostgreSQL, SQL Server), `GROUP_CONCAT` (MySQL), `LISTAGG` (Oracle).

---

## 📝 Quiz

**Question 1.** You run this query on a table with 100 rows, where 10 rows have a NULL `email` column:

```sql
SELECT COUNT(*), COUNT(email) FROM users;
```

What are the two values returned?

<details>
<summary>Answer</summary>

`COUNT(*)` returns **100** (counts all rows regardless of NULLs).  
`COUNT(email)` returns **90** (skips the 10 rows where email is NULL).

</details>

---

**Question 2.** What is wrong with this query, and how would you fix it?

```sql
SELECT user_id, title, COUNT(*)
FROM posts
GROUP BY user_id;
```

<details>
<summary>Answer</summary>

`title` is neither in `GROUP BY` nor wrapped in an aggregate function. On PostgreSQL, SQL Server, and Oracle this raises an error. MySQL silently returns an arbitrary `title` from each group, which is unpredictable.

Fix: either add `title` to `GROUP BY` (if you want one row per user+title combination) or remove `title` from `SELECT` (if you only care about the count per user).

</details>

---

**Question 3.** You want to find all users who signed up in 2024 **and** have written more than 3 posts. Which clause goes where?

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

`WHERE` filters the users to 2024 sign-ups **before** grouping (more efficient). `HAVING` filters the resulting groups to those with more than 3 posts **after** aggregation.

</details>

---

*Next chapter: Window Functions — running totals, rankings, and moving averages without collapsing your rows.*
