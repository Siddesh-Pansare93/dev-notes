# 🔍 Chapter 8: Subqueries

> A query within a query — the SQL equivalent of nesting one thought inside another.

---

## 🧠 What Is a Subquery?

A **subquery** (also called an *inner query* or *nested query*) is a complete `SELECT` statement placed inside another SQL statement. The outer statement is called the **outer query** or **main query**.

```sql
SELECT name
FROM users
WHERE id IN (
    SELECT user_id FROM posts WHERE likes > 100   -- this is the subquery
);
```

The database engine runs the inner query first, then uses its result to execute the outer query.

Subqueries can appear in:
- `WHERE` clauses (most common)
- `FROM` clauses (as a derived table)
- `SELECT` clauses (as a scalar expression)
- `HAVING` clauses

---

## 📐 Schema Used in This Chapter

All examples use a simple social network schema:

```sql
users   (id, name, email, created_at)
posts   (id, user_id, title, content, created_at)
likes   (id, user_id, post_id, created_at)
```

---

## 🔢 Types of Subqueries

### 1. Scalar Subquery — Returns One Value

A **scalar subquery** returns exactly **one row and one column**. It can be used anywhere a single value is expected.

```sql
-- Get each user's name alongside the total number of posts in the database
SELECT
    name,
    (SELECT COUNT(*) FROM posts) AS total_posts_in_db
FROM users;
```

If the subquery returns more than one row or more than one column, the database will throw an error. Scalar subqueries are often used in `SELECT` or `WHERE` to compare against a single computed value.

```sql
-- Find users who registered after the very first user
SELECT name, created_at
FROM users
WHERE created_at > (SELECT MIN(created_at) FROM users);
```

---

### 2. Row Subquery — Returns One Row, Multiple Columns

A **row subquery** returns one row with multiple columns. It is compared using the row constructor syntax.

```sql
-- Find a user whose (name, email) exactly matches a known pair
SELECT *
FROM users
WHERE (name, email) = (
    SELECT name, email FROM users WHERE id = 42
);
```

> Row subqueries are supported in PostgreSQL and MySQL. SQL Server and Oracle have more limited support — you may need to rewrite these as separate scalar subqueries joined by `AND`.

---

### 3. Table Subquery (Derived Table / Inline View) — Returns Multiple Rows

A **table subquery** returns multiple rows and is used inside the `FROM` clause. It must be given an alias. This is also called a **derived table** or **inline view**.

```sql
-- Find the average like count across all posts, then find posts above that average
SELECT p.title, p.like_count
FROM (
    SELECT post_id, COUNT(*) AS like_count
    FROM likes
    GROUP BY post_id
) AS post_likes                          -- alias is required
JOIN posts p ON p.id = post_likes.post_id
WHERE post_likes.like_count > 10;
```

The inner query runs first and its result is treated like a temporary table for the outer query.

---

### 4. Correlated Subquery — References the Outer Query

A **correlated subquery** references a column from the outer query. Because of this dependency, it must be re-executed **once for every row** in the outer query. This makes it powerful but potentially slow on large datasets.

```sql
-- Find all users who have posted more than the average number of posts
SELECT u.name
FROM users u
WHERE (
    SELECT COUNT(*) FROM posts p WHERE p.user_id = u.id   -- references outer u.id
) > (
    SELECT AVG(post_count)
    FROM (SELECT COUNT(*) AS post_count FROM posts GROUP BY user_id) AS counts
);
```

The inner `SELECT COUNT(*) FROM posts p WHERE p.user_id = u.id` runs once for **each row in `users`**. If there are 100,000 users, that subquery runs 100,000 times. Prefer a `JOIN` with `GROUP BY` for large tables.

---

## 🎯 WHERE with Subquery

The most common pattern — filter rows based on values returned by a subquery.

```sql
-- Find all users who have made at least one post
SELECT name
FROM users
WHERE id IN (
    SELECT DISTINCT user_id FROM posts
);
```

You can also use comparison operators with scalar subqueries:

```sql
-- Find users who posted more than the average number of posts
SELECT name
FROM users
WHERE (
    SELECT COUNT(*) FROM posts WHERE user_id = users.id
) > (
    SELECT AVG(c) FROM (SELECT COUNT(*) AS c FROM posts GROUP BY user_id) AS avg_table
);
```

---

## ⚡ EXISTS vs IN — An Important Performance Choice

Both `EXISTS` and `IN` test whether rows satisfy a condition, but they behave differently under the hood.

### EXISTS

```sql
-- Find users who have at least one post
SELECT name
FROM users u
WHERE EXISTS (
    SELECT 1 FROM posts p WHERE p.user_id = u.id
);
```

- The subquery only needs to find **one matching row** and stops immediately (short-circuit evaluation).
- Returns `TRUE` or `FALSE` — the actual columns selected inside `EXISTS` don't matter (`SELECT 1` is conventional).
- Performs well when the inner table is large because it stops at the first match.

### IN

```sql
-- Same query using IN
SELECT name
FROM users
WHERE id IN (
    SELECT user_id FROM posts
);
```

- The subquery runs completely first and loads **all matching values** into memory.
- Then the outer query checks each row against that full list.
- Can be slower when the subquery returns a large result set.

### General Guideline

| Scenario | Prefer |
|---|---|
| Inner table is large | `EXISTS` |
| Inner result set is small | `IN` |
| Checking for non-existence | `NOT EXISTS` (safer) |
| Simple value list (`IN (1, 2, 3)`) | `IN` (no subquery involved) |

### The NULL Trap with NOT IN

This is one of the most common SQL bugs for beginners.

```sql
-- This looks correct but may return ZERO rows if any user_id is NULL in posts
SELECT name
FROM users
WHERE id NOT IN (
    SELECT user_id FROM posts   -- if ANY user_id is NULL here, result is empty!
);
```

In SQL, `x NOT IN (1, 2, NULL)` evaluates to `UNKNOWN` (not `TRUE`) because `x != NULL` is always `UNKNOWN`. When any value in the `IN` list is `NULL`, `NOT IN` returns no rows.

**The safe alternative:**

```sql
-- Use NOT EXISTS instead — handles NULLs correctly
SELECT name
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM posts p WHERE p.user_id = u.id
);
```

> **Rule:** Always prefer `NOT EXISTS` over `NOT IN` unless you are certain the subquery will never return a `NULL`.

---

## 📋 Subquery in FROM Clause (Derived Table)

Using a subquery in `FROM` lets you pre-aggregate or transform data before joining or filtering.

```sql
-- Find the most popular post (by likes) for each user
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

> For complex derived-table logic like this, a CTE is usually more readable. See the CTE preview at the end of this chapter.

---

## 🧮 Subquery in SELECT Clause (Scalar Subquery per Row)

A scalar subquery in `SELECT` runs once per row of the outer query and returns a single value displayed as a column.

```sql
-- Show each user's name and how many posts they have written
SELECT
    u.name,
    u.email,
    (SELECT COUNT(*) FROM posts p WHERE p.user_id = u.id) AS post_count
FROM users u;
```

This is essentially a correlated subquery — it runs once per user row. For small tables this is fine; for large tables prefer a `LEFT JOIN` with `GROUP BY`:

```sql
-- Faster equivalent using JOIN
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

These operators compare a value against a **set** returned by a subquery.

### ANY / SOME

`ANY` and `SOME` are synonyms. The condition is true if it holds for **at least one** value in the subquery result.

```sql
-- Find users whose post count is greater than ANY single user's post count
-- (i.e., not the lowest poster)
SELECT name
FROM users
WHERE (SELECT COUNT(*) FROM posts WHERE user_id = users.id)
    > ANY (SELECT COUNT(*) FROM posts GROUP BY user_id);
```

### ALL

The condition must hold for **every** value in the subquery result.

```sql
-- Find users whose post count is greater than ALL other users' post counts
-- (i.e., the top poster)
SELECT name
FROM users
WHERE (SELECT COUNT(*) FROM posts WHERE user_id = users.id)
    >= ALL (SELECT COUNT(*) FROM posts GROUP BY user_id);
```

| Operator | Meaning |
|---|---|
| `= ANY` | Equal to at least one value (equivalent to `IN`) |
| `> ANY` | Greater than at least one value (greater than the minimum) |
| `> ALL` | Greater than every value (greater than the maximum) |
| `< ALL` | Less than every value (less than the minimum) |

> `ALL` / `ANY` with `NULL` values in the subquery can produce unexpected `UNKNOWN` results — the same NULL trap applies here.

---

## 📊 Correlated vs Non-Correlated: Performance Implications

| | Non-Correlated | Correlated |
|---|---|---|
| **Definition** | Inner query does not reference outer query | Inner query references a column from outer query |
| **Executions** | Runs once | Runs once per outer row |
| **Performance** | Generally fast | Can be slow on large tables (N subquery calls) |
| **Use case** | Static filtering, lookup lists | Per-row comparisons, existence checks |
| **Alternative** | Often replaceable with a `JOIN` | Often replaceable with a `JOIN` + aggregation |

**Non-correlated example:**

```sql
SELECT name FROM users
WHERE id IN (SELECT user_id FROM posts WHERE likes > 50);
-- Inner query runs ONCE, produces a list, outer query filters against it
```

**Correlated example:**

```sql
SELECT name FROM users u
WHERE EXISTS (SELECT 1 FROM posts p WHERE p.user_id = u.id AND p.likes > 50);
-- Inner query runs once PER USER ROW
```

---

## 🤔 When to Use a Subquery vs a JOIN

JOINs are the workhorse of SQL and are usually faster because query optimizers are heavily tuned for them. Subqueries add overhead, especially correlated ones.

| Situation | Recommendation |
|---|---|
| Aggregating before filtering | Subquery in `FROM` (or CTE) |
| Checking existence | `EXISTS` subquery |
| Filtering by a list of IDs | `IN` subquery (or `JOIN`) |
| Retrieving columns from related table | `JOIN` — usually faster |
| Complex intermediate transformation | CTE (cleaner than nested subqueries) |
| One-off scalar value | Scalar subquery in `SELECT` is fine |

```sql
-- Subquery approach (readable but may be slower)
SELECT name FROM users
WHERE id IN (SELECT user_id FROM posts WHERE created_at > '2024-01-01');

-- JOIN approach (often faster, especially with indexes)
SELECT DISTINCT u.name
FROM users u
JOIN posts p ON p.user_id = u.id
WHERE p.created_at > '2024-01-01';
```

---

## 🌐 Cross-Database Syntax Differences

Most subquery syntax is standard SQL and works identically across databases. The main differences are in **derived table aliasing** and **row subquery support**.

### Derived Table Alias Requirement

```sql
-- PostgreSQL / MySQL / SQL Server — alias required
SELECT * FROM (SELECT id FROM users) AS u;

-- Oracle — alias required, AS keyword is optional on table aliases
SELECT * FROM (SELECT id FROM users) u;
```

### Row Subquery Support

```sql
-- PostgreSQL / MySQL — supported
WHERE (col1, col2) = (SELECT col1, col2 FROM ...)

-- SQL Server / Oracle — not supported natively; rewrite as:
WHERE col1 = (SELECT col1 FROM ...) AND col2 = (SELECT col2 FROM ...)
```

### LATERAL / CROSS APPLY (Advanced)

When a subquery in `FROM` needs to reference the outer query (a correlated derived table), different databases use different syntax:

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
-- LATERAL is supported from MySQL 8.0
SELECT u.name, recent.title
FROM users u,
LATERAL (SELECT title FROM posts WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) AS recent;

-- Oracle
SELECT u.name, recent.title
FROM users u,
LATERAL (SELECT title FROM posts WHERE user_id = u.id ORDER BY created_at DESC FETCH FIRST 1 ROW ONLY) recent;
```

---

## 🧪 Real Examples with Social Network Schema

### Example 1: Find Users Who Posted More Than Average

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

### Example 2: Find Users Who Liked Their Own Posts

```sql
SELECT DISTINCT u.name
FROM users u
WHERE EXISTS (
    SELECT 1
    FROM likes l
    JOIN posts p ON p.id = l.post_id
    WHERE l.user_id = u.id       -- the liker is the user
      AND p.user_id = u.id       -- the post author is also the user
);
```

### Example 3: Find the Most Popular Post Per User

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

> This query is starting to get complex. This is exactly when a **CTE** shines — see the preview below.

---

## 👀 CTEs — A Preview (Full Chapter Coming)

When subqueries get deeply nested, they become hard to read and debug. **Common Table Expressions (CTEs)** let you name subqueries and reference them like temporary tables.

```sql
-- Same "most popular post per user" query — much more readable with CTEs
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

CTEs use the `WITH` keyword and are supported in PostgreSQL, MySQL 8.0+, SQL Server, and Oracle. Full coverage in Chapter 9.

---

## ✅ Key Takeaways

- A **subquery** is a `SELECT` inside another SQL statement; the inner query runs first.
- **Scalar subquery** returns one value; **table subquery** returns rows and lives in `FROM`; **correlated subquery** references the outer query.
- Use `EXISTS` instead of `IN` for large datasets — it short-circuits at the first match.
- **Never use `NOT IN`** when the subquery might return `NULL` — use `NOT EXISTS` instead.
- `ANY` / `SOME` = at least one match; `ALL` = every value must match.
- Correlated subqueries run **once per outer row** — they can be slow; prefer a `JOIN` when possible.
- `JOIN` + `GROUP BY` is usually faster than a correlated scalar subquery in `SELECT`.
- When subqueries get complex and nested, reach for **CTEs** for readability.

---

## 📝 Quiz

**Question 1:** You run the following query and get zero results, even though you know some users have no posts. What is the bug?

```sql
SELECT name FROM users
WHERE id NOT IN (SELECT user_id FROM posts);
```

<details>
<summary>Answer</summary>

The `posts` table likely has rows where `user_id` is `NULL`. `NOT IN` with a `NULL` in the list evaluates to `UNKNOWN` for every row, so no rows are returned. Fix: use `NOT EXISTS` instead, or add `WHERE user_id IS NOT NULL` inside the subquery.

</details>

---

**Question 2:** What is the difference between these two queries in terms of how many times the inner query executes?

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

**Query A** is non-correlated — the inner query runs **once**, produces a list of user IDs, and the outer query filters against that list.

**Query B** is correlated — the inner query runs **once per row in `users`**. If there are 50,000 users, the inner query runs 50,000 times. However, `EXISTS` short-circuits at the first match, which can make it faster than `IN` when the inner table is large and matches are found early.

</details>

---

**Question 3:** Rewrite this correlated subquery in `SELECT` using a `JOIN` instead:

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

The `LEFT JOIN` ensures users with zero posts still appear (with `post_count = 0`), matching the behavior of the scalar subquery which would return `0` for users with no posts.

</details>
