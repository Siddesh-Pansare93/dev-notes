# 🔍 SELECT — Querying Data

> **Chapter 4 of SQL from Scratch**
> Prerequisites: Chapter 3 — Tables, Data Types, and Schema Design

---

## 🗺️ What You Will Learn

By the end of this chapter you will be able to write `SELECT` statements that retrieve exactly the data you need — picking specific columns, filtering rows, sorting results, handling `NULL`, removing duplicates, paginating through large result sets, and building computed columns with expressions and conditional logic.

All examples use a social-network schema introduced at the end of this section.

---

## 🏗️ The Schema We Will Use

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

## 🧬 SELECT Statement Anatomy

The general shape of a `SELECT` query reads like plain English: "give me these columns, from this table, where these conditions hold, ordered this way, limited to this many rows."

```sql
SELECT   column1, column2, ...   -- what columns (or expressions)
FROM     table_name              -- which table
WHERE    condition               -- filter rows (optional)
ORDER BY column ASC | DESC       -- sort (optional)
LIMIT    n                       -- how many rows (optional; syntax varies)
OFFSET   m;                      -- skip first m rows (optional)
```

The database processes clauses in this logical order — even though you write them in the order shown above:

```
FROM → WHERE → SELECT → ORDER BY → LIMIT/OFFSET
```

This ordering matters when you hit errors: you cannot reference a column alias defined in `SELECT` inside a `WHERE` clause, because `WHERE` runs before `SELECT`.

---

## ⭐ SELECT * — The Wildcard

`SELECT *` returns every column in the table.

```sql
SELECT * FROM users;
```

It is great for quick exploration, but avoid it in production code because:

- **Fragility** — if someone adds or reorders a column, any application code that destructures by position silently breaks.
- **Performance** — you transfer columns you do not need across the network and through memory.
- **Readability** — a reader cannot tell which columns your query actually depends on without looking at the table definition.

---

## 📌 Selecting Specific Columns

List only what you need, separated by commas.

```sql
SELECT user_id, username, city
FROM   users;
```

The order of columns in the result matches the order you list them — not the order they appear in the table definition.

---

## 🏷️ Column Aliases: AS

Rename a column in the result set using `AS`. The alias is purely cosmetic — it does not change the table.

```sql
SELECT username  AS handle,
       city      AS location,
       joined_at AS member_since
FROM   users;
```

The `AS` keyword is optional in all major databases — you can just write the alias after the expression:

```sql
SELECT username handle, city location
FROM   users;
```

Using `AS` is strongly recommended for clarity. Omitting it can cause accidental aliasing if you forget a comma.

Aliases with spaces or reserved words need quoting:

```sql
-- PostgreSQL / Oracle / SQLite
SELECT username AS "user name" FROM users;

-- MySQL
SELECT username AS `user name` FROM users;

-- SQL Server
SELECT username AS [user name] FROM users;
```

---

## ➕ Expressions in SELECT

You are not limited to raw column values. You can put any expression in the column list.

### Arithmetic

```sql
SELECT post_id,
       views,
       views * 0.001  AS views_in_thousands
FROM   posts;
```

Standard arithmetic operators (`+`, `-`, `*`, `/`, `%`) work in every database.

### String Concatenation

This is one area where databases genuinely differ.

| Database       | Operator / Function                | Notes                                              |
|----------------|------------------------------------|----------------------------------------------------|
| PostgreSQL     | `||` or `CONCAT()`                 | `||` with a `NULL` operand returns `NULL`          |
| Oracle         | `||` or `CONCAT(a, b)` (2-arg only)| Same `NULL` behavior as PostgreSQL                 |
| MySQL          | `CONCAT()` only                    | `||` is the logical **OR** operator by default!    |
| SQL Server     | `+` or `CONCAT()`                  | `+` with `NULL` returns `NULL`; `CONCAT()` coerces |

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
-- or, safely with NULLs:
SELECT CONCAT(first_name, ' (@', username, ')') AS display_name
FROM   users;
```

> **Tip:** `CONCAT()` is the safest cross-database choice because it exists in all four engines (Oracle 11g+) and handles `NULL` gracefully in MySQL and SQL Server by treating `NULL` as an empty string.

### Built-in Functions

```sql
SELECT username,
       UPPER(username)           AS upper_handle,
       LENGTH(bio)               AS bio_length,
       CURRENT_DATE              AS today
FROM   users;
```

`UPPER`, `LOWER`, `LENGTH` / `LEN` (SQL Server), and date functions vary by database — consult your database's function reference for the full list.

---

## 🔁 DISTINCT — Removing Duplicate Rows

`DISTINCT` filters out rows where every selected column is identical.

```sql
-- List every city that has at least one user (no duplicates)
SELECT DISTINCT city
FROM   users;
```

`DISTINCT` applies to the entire row, not just the first column:

```sql
SELECT DISTINCT city, joined_at
FROM   users;
-- A city appears multiple times if users joined on different dates
```

`DISTINCT` can be expensive on large tables because the database must sort or hash the entire result set. Use it only when you genuinely need unique rows.

---

## 🔎 WHERE — Filtering Rows

```sql
SELECT username, city
FROM   users
WHERE  city = 'London';
```

Common comparison operators: `=`, `<>` (or `!=`), `<`, `>`, `<=`, `>=`.

Combine conditions with `AND`, `OR`, `NOT`:

```sql
SELECT post_id, views
FROM   posts
WHERE  views > 1000
  AND  is_pinned = TRUE;
```

---

## 📶 ORDER BY — Sorting Results

Results from a `SELECT` have no guaranteed order unless you include `ORDER BY`. Never rely on "natural" insertion order.

```sql
-- Newest posts first
SELECT post_id, created_at
FROM   posts
ORDER BY created_at DESC;

-- Oldest first (ASC is the default and can be omitted)
SELECT post_id, created_at
FROM   posts
ORDER BY created_at ASC;
```

### Multiple Sort Columns

Separate columns with commas. The database sorts by the first column; ties are broken by the second, and so on.

```sql
SELECT username, city, joined_at
FROM   users
ORDER BY city ASC, joined_at DESC;
```

### Ordering by Expression

```sql
SELECT post_id, views, (views * 10) AS score
FROM   posts
ORDER BY views * 10 DESC;
```

You can also order by an alias — but only in databases that allow it (PostgreSQL, MySQL, SQL Server). Oracle does not.

```sql
-- Works in PostgreSQL, MySQL, SQL Server
SELECT post_id, views * 10 AS score
FROM   posts
ORDER BY score DESC;
```

### NULL Ordering

`NULL` values have no natural numeric order, so each database picks a convention.

| Database       | Default NULL position in ASC | Default NULL position in DESC |
|----------------|------------------------------|-------------------------------|
| PostgreSQL     | NULLS LAST                   | NULLS FIRST                   |
| Oracle         | NULLS LAST                   | NULLS FIRST                   |
| MySQL          | Treated as smallest value → first in ASC | last in DESC |
| SQL Server     | Treated as smallest value → first in ASC | last in DESC |

PostgreSQL and Oracle let you override explicitly:

```sql
-- PostgreSQL / Oracle
SELECT username, city
FROM   users
ORDER BY city ASC NULLS FIRST;   -- NULLs appear at the top

SELECT username, city
FROM   users
ORDER BY city DESC NULLS LAST;   -- NULLs appear at the bottom
```

MySQL and SQL Server do not support `NULLS FIRST / NULLS LAST`. The common workaround is to sort a computed column:

```sql
-- MySQL / SQL Server: push NULLs to the end in an ASC sort
SELECT username, city
FROM   users
ORDER BY (city IS NULL) ASC, city ASC;
-- (city IS NULL) returns 0 for non-NULL and 1 for NULL, so NULLs sort last
```

---

## 📄 LIMIT / OFFSET — Pagination

Pagination — fetching one page of results at a time — requires a row-count cap and a skip count. Syntax diverges significantly here.

### PostgreSQL, MySQL, SQLite

```sql
-- Page 1: first 10 rows
SELECT post_id, created_at
FROM   posts
ORDER BY created_at DESC
LIMIT  10 OFFSET 0;

-- Page 2: next 10 rows
SELECT post_id, created_at
FROM   posts
ORDER BY created_at DESC
LIMIT  10 OFFSET 10;
```

### SQL Server (2012+)

SQL Server requires `ORDER BY` before `OFFSET … FETCH`.

```sql
-- Page 2: skip 10, take 10
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

### TOP Keyword (SQL Server and older Oracle)

Before SQL Server 2012 introduced `OFFSET … FETCH`, `TOP` was the only option. It is still valid and common for simply grabbing the first N rows.

```sql
-- SQL Server: top 5 most-viewed posts
SELECT TOP 5 post_id, views
FROM   posts
ORDER BY views DESC;

-- Oracle (pre-12c via ROWNUM — note: filter BEFORE ORDER BY, so wrap in subquery)
SELECT *
FROM (
    SELECT post_id, views
    FROM   posts
    ORDER BY views DESC
)
WHERE ROWNUM <= 5;
```

> **Warning:** In Oracle's `ROWNUM` approach, the outer `WHERE` filters the already-sorted subquery result. If you put `WHERE ROWNUM <= 5` in the inner query, Oracle filters before sorting, giving wrong results.

---

## 🧮 Calculating New Columns

Expressions in `SELECT` can produce entirely new, computed columns that do not exist in the table.

```sql
-- Engagement rate: likes per view (hypothetical join simplified here)
SELECT p.post_id,
       p.views,
       p.views / 1000.0          AS views_k,
       CURRENT_DATE - p.created_at::DATE AS days_old  -- PostgreSQL
FROM   posts p
WHERE  p.views > 0;
```

This is non-destructive — you are reading and computing, never modifying the stored data.

---

## 🔀 CASE WHEN — Conditional Logic

`CASE WHEN` is SQL's `if / else if / else`. It appears anywhere an expression is valid: `SELECT`, `ORDER BY`, `WHERE`.

### Simple Form (compare one column to fixed values)

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

### Searched Form (arbitrary conditions per branch — more flexible)

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

`CASE` always returns the value of the first branch whose condition is true. If no branch matches and there is no `ELSE`, the result is `NULL`.

```sql
-- Label users based on whether their bio is filled in
SELECT username,
       CASE
           WHEN bio IS NULL OR bio = '' THEN 'No bio'
           ELSE                               'Has bio'
       END AS profile_status
FROM   users;
```

---

## 🩹 COALESCE — First Non-NULL Value

`COALESCE(a, b, c, ...)` returns the first argument that is not `NULL`. It is the standard SQL way to supply a default for nullable columns.

```sql
-- If city is NULL, display 'Unknown location'
SELECT username,
       COALESCE(city, 'Unknown location') AS display_city
FROM   users;
```

You can chain multiple fallbacks:

```sql
SELECT user_id,
       COALESCE(display_name, username, email) AS best_name
FROM   users;
```

`COALESCE` is equivalent to a `CASE WHEN` but much more concise. It works identically in PostgreSQL, MySQL, SQL Server, and Oracle.

---

## 🔄 NULLIF — Return NULL on Equality

`NULLIF(a, b)` returns `NULL` when `a = b`, otherwise returns `a`. It is the logical inverse of `COALESCE` and is most often used to avoid division-by-zero errors.

```sql
-- Avoid dividing by zero if views = 0
SELECT post_id,
       likes_count,
       views,
       likes_count / NULLIF(views, 0) AS like_rate
FROM   posts;
```

When `views` is `0`, `NULLIF(views, 0)` returns `NULL`, and division by `NULL` is `NULL` — safe, no error.

---

## 🚫 IS NULL / IS NOT NULL

`NULL` represents a missing or unknown value. You cannot test for it with `=` because `NULL = NULL` is not `TRUE` in SQL — it is `NULL` (unknown).

```sql
-- WRONG — returns no rows even when bio is NULL
SELECT * FROM users WHERE bio = NULL;

-- CORRECT
SELECT * FROM users WHERE bio IS NULL;

-- Find users who have filled in their bio
SELECT * FROM users WHERE bio IS NOT NULL;
```

`IS NULL` and `IS NOT NULL` work identically across all major databases.

---

## 🧩 Putting It All Together — Full Examples

### Example 1: Recent active posts with a popularity label

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

### Example 2: Distinct cities with at least one user, sorted with NULLs last

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

### Example 4: Build a display name with concatenation, handling NULLs

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

| Concept | Remember |
|---|---|
| `SELECT *` | Fine for exploration; avoid in production code |
| Column alias | Use `AS alias_name`; quote if it contains spaces |
| String concatenation | `\|\|` in PostgreSQL/Oracle; `CONCAT()` everywhere; `+` in SQL Server |
| `DISTINCT` | Removes fully duplicate rows; can be slow |
| `ORDER BY` | No guaranteed order without it; `ASC` is default |
| NULL ordering | Explicit `NULLS FIRST/LAST` only in PostgreSQL/Oracle |
| Pagination | `LIMIT/OFFSET` in PG/MySQL; `OFFSET…FETCH` in SQL Server/Oracle 12c+ |
| `CASE WHEN` | SQL's if/else; use searched form for complex conditions |
| `COALESCE` | Return first non-NULL; great for default values |
| `NULLIF` | Return NULL when two values match; stops division-by-zero |
| `IS NULL` | Always use `IS NULL`, never `= NULL` |

---

## 🧠 Quiz

Test yourself before moving to the next chapter.

**Question 1**

You have a `posts` table and want to see the 10 most-viewed posts, but skip the top 3 (perhaps they are pinned and shown separately). Write the query using:
- (a) PostgreSQL syntax
- (b) SQL Server syntax

**Question 2**

A `users.city` column is nullable. You want to display the city, but show `'Remote'` if the city is `NULL`. Which function do you use, and what does the expression look like?

**Question 3**

A teammate writes:

```sql
SELECT DISTINCT username, city
FROM   users
WHERE  city = NULL;
```

Identify **two** bugs in this query and write the corrected version.

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

Use `COALESCE`:

```sql
SELECT username, COALESCE(city, 'Remote') AS display_city
FROM   users;
```

**Answer 3**

Bug 1: `city = NULL` should be `city IS NULL` — equality with `NULL` always yields `NULL`, not `TRUE`.

Bug 2: `DISTINCT username, city` with `WHERE city IS NULL` would return only users without a city. If the intent is to list all distinct cities, the column list should be just `city` (and the `WHERE` clause removed unless filtering is intended).

Corrected query (list all distinct cities):

```sql
SELECT DISTINCT city
FROM   users
WHERE  city IS NOT NULL;
```

---

*Next chapter: Chapter 5 — Filtering with WHERE — Operators, LIKE, IN, BETWEEN, and Subqueries*
