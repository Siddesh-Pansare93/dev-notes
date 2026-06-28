# Chapter 12: CTEs and Window Functions

> "SQL got its superpower the day window functions arrived."

If subqueries and JOINs are the bread and butter of SQL, then **CTEs** and **window functions** are the secret sauce that separates basic SQL writers from analysts who can answer complex business questions in a single, readable query. This chapter covers both in depth, with clear examples and real-world use cases.

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

All examples in this chapter use the following three tables. Run this once to follow along:

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

A **CTE** (Common Table Expression) is a **named, temporary result set** that you define at the top of a query using the `WITH` keyword. You can then refer to it by name just like a regular table — but it only lives for the duration of that single query.

Think of it as giving a subquery a friendly name so you can reuse and read it more easily.

### Basic Syntax

```sql
WITH cte_name AS (
    -- This is just a regular SELECT query
    SELECT column1, column2
    FROM some_table
    WHERE some_condition
)
-- Now use it like a normal table
SELECT *
FROM cte_name;
```

### Your First CTE — Active Users

Let's find all users who have written more than one post:

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

The CTE `active_users` calculates post counts. The outer query joins it with `users` to get the names. Clean and readable.

---

## 🔗 Multiple CTEs

You can chain multiple CTEs by separating them with a comma. Each CTE can even reference the one defined before it.

```sql
WITH
-- Step 1: count posts per user
post_counts AS (
    SELECT user_id, COUNT(*) AS total_posts
    FROM posts
    GROUP BY user_id
),
-- Step 2: add average views per user
avg_views AS (
    SELECT user_id, AVG(views) AS avg_views
    FROM posts
    GROUP BY user_id
),
-- Step 3: combine both
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

Each CTE is a building block. You build complexity step by step — much easier to debug than a wall of nested subqueries.

---

## ⚖️ CTE vs Subquery: When to Use Which

Both CTEs and subqueries let you embed a query inside another query. So when should you choose one over the other?

| Feature | CTE | Subquery |
|---|---|---|
| Readability | Excellent — named and defined at the top | Can get messy when nested deeply |
| Reusability in same query | Yes — reference the same CTE multiple times | No — must repeat the subquery |
| Recursive queries | Yes (recursive CTEs) | No |
| Performance | Usually the same; some DBs materialize CTEs | Sometimes slightly faster (optimizer can inline) |
| Debugging | Easy — test each CTE independently | Hard — must untangle nesting |

**Rule of thumb:**
- Use a **subquery** when the logic is simple and used only once.
- Use a **CTE** when the logic is complex, reused, or benefits from a name.

```sql
-- Subquery version (fine for simple cases)
SELECT username
FROM users
WHERE user_id IN (
    SELECT user_id FROM posts GROUP BY user_id HAVING COUNT(*) > 1
);

-- CTE version (preferred when logic grows)
WITH prolific_authors AS (
    SELECT user_id FROM posts GROUP BY user_id HAVING COUNT(*) > 1
)
SELECT username
FROM users
WHERE user_id IN (SELECT user_id FROM prolific_authors);
```

---

## 🔄 Recursive CTEs

A **recursive CTE** is a CTE that references itself. It works in two parts:

1. **Anchor member** — the starting point (base case), runs once.
2. **Recursive member** — references the CTE itself, runs repeatedly until no more rows are returned.

> **Warning:** Always include a termination condition (a `WHERE` clause or a maximum depth guard) or your query will loop forever!

### Syntax Difference: RECURSIVE Keyword

| Database | Syntax |
|---|---|
| PostgreSQL | `WITH RECURSIVE cte_name AS (...)` |
| MySQL 8.0+ | `WITH RECURSIVE cte_name AS (...)` |
| SQLite | `WITH RECURSIVE cte_name AS (...)` |
| SQL Server | `WITH cte_name AS (...)` — no `RECURSIVE` keyword |
| Oracle | `WITH cte_name AS (...)` — no `RECURSIVE` keyword |

### Example 1 — Organizational Hierarchy

Suppose we have an `employees` table where each employee has a `manager_id`:

```sql
CREATE TABLE employees (
    emp_id     INT PRIMARY KEY,
    name       VARCHAR(50),
    manager_id INT  -- NULL means top of the org
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

**Goal:** Starting from the CEO, list every employee and their level in the hierarchy.

```sql
-- PostgreSQL / MySQL / SQLite
WITH RECURSIVE org_chart AS (
    -- Anchor: start with the CEO (no manager)
    SELECT emp_id, name, manager_id, 1 AS level
    FROM employees
    WHERE manager_id IS NULL

    UNION ALL

    -- Recursive: find direct reports of each row already in the CTE
    SELECT e.emp_id, e.name, e.manager_id, oc.level + 1
    FROM employees e
    JOIN org_chart oc ON e.manager_id = oc.emp_id
)
SELECT
    REPEAT('  ', level - 1) || name AS hierarchy,  -- indent by level
    level
FROM org_chart
ORDER BY level, emp_id;
```

```sql
-- SQL Server (no RECURSIVE keyword, use REPLICATE instead of REPEAT)
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

The query "walks" down the tree: level 1 → level 2 → level 3 → level 4, stopping when no more employees are found.

### Example 2 — Generating a Series of Numbers

Need a sequence of numbers without a `generate_series()` function? A recursive CTE can do it:

```sql
-- PostgreSQL / MySQL / SQLite
WITH RECURSIVE numbers AS (
    SELECT 1 AS n         -- anchor: start at 1
    UNION ALL
    SELECT n + 1          -- recursive: add 1 each time
    FROM numbers
    WHERE n < 10          -- termination: stop at 10
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

You can adapt this to **generate a date series** (useful for filling in missing dates in reports):

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

A **window function** performs a calculation across a set of rows that are related to the current row — called a "window" — **without collapsing those rows into a single output row** the way `GROUP BY` does.

This is the critical difference:

```sql
-- GROUP BY: collapses rows — you lose the individual rows
SELECT user_id, SUM(views) AS total_views
FROM posts
GROUP BY user_id;
-- Returns 1 row per user_id

-- Window function: keeps all rows + adds the aggregate alongside
SELECT post_id, user_id, views,
       SUM(views) OVER (PARTITION BY user_id) AS total_views_per_user
FROM posts;
-- Returns ALL rows, with total_views_per_user added as a column
```

Window functions are supported across all major databases:

| Database | Minimum Version |
|---|---|
| PostgreSQL | 8.4+ |
| MySQL | 8.0+ |
| SQL Server | 2012+ |
| Oracle | 8i+ |
| SQLite | 3.25+ |

---

## 🔭 The OVER() Clause: Your Window Into the Data

Every window function is followed by `OVER(...)`. The `OVER` clause defines the "window" — which rows the function looks at relative to the current row.

```sql
function_name(column) OVER (
    PARTITION BY partition_column   -- divide rows into groups
    ORDER BY order_column           -- set order within each group
    ROWS BETWEEN start AND end      -- optional: frame specification
)
```

All three parts are optional. An empty `OVER()` means "look at all rows."

| Clause | What it does |
|---|---|
| `PARTITION BY col` | Splits rows into groups (like GROUP BY, but keeps all rows) |
| `ORDER BY col` | Sets the ordering within each partition |
| `ROWS BETWEEN ... AND ...` | Specifies the exact frame of rows to include |

### Frame Specification

The frame clause defines which rows relative to the current row are included:

```sql
ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW   -- from first row to current (default for running totals)
ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING           -- current row ± 1 neighbor
ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING -- entire partition
```

---

## 🏆 Ranking Functions

### ROW_NUMBER() — Unique Sequential Number

Assigns a unique integer to each row within a partition, starting at 1. No ties — every row gets a different number.

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

Each user's posts are numbered independently, most-viewed first.

### RANK() — Rank With Gaps for Ties

Assigns ranks, but when two rows tie, they share the same rank and the next rank is **skipped** (e.g., 1, 1, 3).

### DENSE_RANK() — Rank Without Gaps

Like `RANK()`, but tied rows share a rank and the **next rank is not skipped** (e.g., 1, 1, 2).

```sql
-- Demonstrate all three ranking functions together
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

If two sales in the same region had the same amount, you'd see:

| region | amount | row_num | rnk | dense_rnk |
|--------|--------|---------|-----|-----------|
| North  | 2300   | 1       | 1   | 1         |
| North  | 1200   | 2       | 2   | 2         |
| North  | 1200   | 3       | 2   | 2         |  ← tie example
| North  | 980    | 4       | 4   | 3         |  ← RANK skips to 4, DENSE_RANK goes to 3

### NTILE(n) — Divide Into Buckets

Splits rows in a partition into `n` roughly equal groups (quartiles, deciles, etc.) and assigns a bucket number.

```sql
-- Divide posts into 3 tiers based on views
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

Tier 1 = top third, Tier 3 = bottom third. Great for percentile-based segmentation.

---

## ⏪ LAG and LEAD: Time Travel Between Rows

`LAG` and `LEAD` let you peek at a **previous** or **next** row's value without a self-join. They are invaluable for comparing sequential data like daily sales, stock prices, or step-by-step events.

```sql
LAG(column, offset, default)  OVER (PARTITION BY ... ORDER BY ...)
LEAD(column, offset, default) OVER (PARTITION BY ... ORDER BY ...)
```

- `offset` — how many rows back (LAG) or forward (LEAD). Default is 1.
- `default` — what to return if there's no previous/next row (e.g., the very first row has no previous row).

### Example: Compare Each Day's Sales to the Previous Day

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

With `LEAD`, you can look forward — for example, showing what the next day's expected sales will be.

```sql
SELECT
    sale_date,
    amount,
    LEAD(amount, 1) OVER (ORDER BY sale_date) AS next_day_amount
FROM sales;
```

---

## 🔝 FIRST_VALUE and LAST_VALUE

These return the **first** or **last** value in the window frame.

```sql
FIRST_VALUE(column) OVER (PARTITION BY ... ORDER BY ... ROWS BETWEEN ...)
LAST_VALUE(column)  OVER (PARTITION BY ... ORDER BY ... ROWS BETWEEN ...)
```

### FIRST_VALUE — Easy

```sql
-- For each post, show the most-viewed post by the same user
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

### LAST_VALUE — The Gotcha!

`LAST_VALUE` has a common trap. By default, the window frame is `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`, which means "from the first row up to the current row." So `LAST_VALUE` returns the **current row's value**, not the last in the partition!

**Fix:** Explicitly expand the frame to include all rows in the partition:

```sql
-- Wrong: LAST_VALUE returns current row's value (frame ends at current row by default)
SELECT post_id, views,
    LAST_VALUE(title) OVER (PARTITION BY user_id ORDER BY views DESC) AS wrong_last
FROM posts;

-- Correct: expand frame to cover entire partition
SELECT post_id, views,
    LAST_VALUE(title) OVER (
        PARTITION BY user_id
        ORDER BY views DESC
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS correct_last
FROM posts;
```

With the fixed frame, `LAST_VALUE` now correctly returns the least-viewed post's title for each user.

---

## ➕ Aggregate Window Functions

Standard aggregate functions (`SUM`, `AVG`, `COUNT`, `MIN`, `MAX`) become window functions when you add `OVER()`. They perform the aggregation across the window instead of collapsing rows.

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

The `ORDER BY` inside `OVER()` causes `SUM` to accumulate — each row gets the sum of all rows up to and including itself.

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

`ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` means: look at the current row plus the 2 rows before it (a 3-row sliding window).

### Running COUNT

```sql
SELECT
    sale_date,
    region,
    COUNT(*) OVER (PARTITION BY region ORDER BY sale_date) AS running_count_per_region
FROM sales;
```

This gives a cumulative count of sales per region over time — useful for tracking how quickly each region hits milestones.

---

## 🌍 Real-World Examples

### 1. Rank Users by Post Count

**Business question:** Who are our most prolific writers? Show everyone with their rank.

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

### 2. Calculate Running Total of Revenue

**Business question:** Build a daily revenue dashboard showing cumulative total.

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

### 3. Compare Today's Sales to Yesterday's (LAG)

**Business question:** Flag days where sales dropped by more than 30% compared to the previous day.

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

### 4. Find the Top 3 Posts Per User

**Business question:** For each user, surface their three most-viewed posts for a "Best Of" feature.

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

This pattern — filter `WHERE row_num <= N` from a CTE — is one of the most common interview questions and real-world patterns in SQL analytics. The combination of CTEs and window functions makes it clean, efficient, and readable.

---

## 🔑 Key Takeaways

- A **CTE** is a named temporary query defined with `WITH`. It makes complex queries readable and allows reuse within the same query.
- **Multiple CTEs** can be chained with commas, building up logic step by step.
- A **recursive CTE** references itself to traverse hierarchies or generate series. PostgreSQL, MySQL, and SQLite require the `RECURSIVE` keyword; SQL Server and Oracle do not.
- Always include a termination condition in recursive CTEs to avoid infinite loops.
- A **window function** operates on a "window" of rows related to the current row — unlike `GROUP BY`, it does not collapse rows.
- The `OVER()` clause defines the window: `PARTITION BY` groups rows, `ORDER BY` sets order within the group, and the frame clause (`ROWS BETWEEN`) sets the exact range.
- **Ranking functions:** `ROW_NUMBER()` gives unique numbers, `RANK()` has gaps for ties, `DENSE_RANK()` has no gaps, `NTILE(n)` divides into buckets.
- **LAG / LEAD** access neighboring rows without a self-join — perfect for time-series comparisons.
- **FIRST_VALUE / LAST_VALUE** retrieve boundary values; always specify the frame for `LAST_VALUE` to avoid the default-frame gotcha.
- **Aggregate window functions** (`SUM`, `AVG`, `COUNT` with `OVER()`) enable running totals, moving averages, and cumulative counts.
- Combining CTEs and window functions unlocks nearly any analytics query you could need.

---

## 🧠 Quiz

**Question 1:**

You have a `transactions` table with columns `txn_date` and `revenue`. You want to display every transaction row along with the **cumulative sum** of revenue up to and including each row, ordered by date. Which query is correct?

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

**B** is correct. `SUM(revenue) OVER (ORDER BY txn_date)` defaults to `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`, which produces a running total while keeping all rows visible. Option A and D collapse rows with GROUP BY. Option C uses PARTITION BY on the date, which only sums within each date (not a running total).

</details>

---

**Question 2:**

You write a recursive CTE to walk an employee hierarchy. After running it, the query runs forever and crashes. What most likely went wrong?

**A.** You forgot the `UNION ALL` between the anchor and recursive member.  
**B.** You used `RECURSIVE` keyword in SQL Server.  
**C.** You forgot a termination condition — the recursive member keeps finding rows indefinitely (possibly a cycle in the data or a missing WHERE clause).  
**D.** Recursive CTEs do not support `JOIN`.

<details>
<summary>Answer</summary>

**C** is correct. Without a proper termination condition (a `WHERE` clause that eventually returns zero rows), the recursive member keeps executing. This can happen if the data has a cycle (employee A reports to B, and B reports to A) or the stopping condition is missing entirely. Option B is wrong because SQL Server simply does not use RECURSIVE but still works fine. Options A and D would cause errors, not infinite loops.

</details>

---

**Question 3:**

Given this query:

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

What will `last_val` contain for most rows, and why?

**A.** The highest views in the user's partition, because ORDER BY sorts descending.  
**B.** The same value as `views` on each row, because the default frame ends at the current row.  
**C.** The lowest views in the user's partition, because `LAST_VALUE` always looks at the end of the partition.  
**D.** `NULL`, because no frame clause was specified.

<details>
<summary>Answer</summary>

**B** is correct. This is the classic `LAST_VALUE` gotcha. Without an explicit frame clause, the default is `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`. So `LAST_VALUE` looks only at rows from the beginning of the partition up to the current row — and the last of those is always the current row itself. To get the actual last value in the partition, you must specify `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`.

</details>

---

*Next chapter: Indexes and Query Optimization — making your queries fast at scale.*
