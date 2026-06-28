# 🔍 Filtering Data — WHERE, LIKE, IN, BETWEEN, and More

> **Chapter 5** | SQL From Scratch Series
> Prerequisites: SELECT basics, FROM clause, basic data types

---

## 🎯 What Is Filtering and Why Does It Matter?

A database table can hold millions of rows. Without filtering, every query returns the entire table — slow, expensive, and full of irrelevant data. The `WHERE` clause is your primary tool for saying: *"Only give me the rows I care about."*

This chapter covers every major filtering technique you will use day-to-day.

---

## 🟢 The WHERE Clause

`WHERE` comes after `FROM` and before `ORDER BY` or `GROUP BY`. It evaluates a condition for every row — rows where the condition is **true** are kept; all others are discarded.

```sql
SELECT column1, column2
FROM   table_name
WHERE  condition;
```

**Example table — `users`:**

| id | name    | age | status   | email               |
|----|---------|-----|----------|---------------------|
| 1  | Alice   | 30  | active   | alice@example.com   |
| 2  | Bob     | 17  | pending  | bob@example.com     |
| 3  | Carol   | 25  | inactive | carol@example.com   |
| 4  | Dave    | 30  | active   | dave@example.com    |
| 5  | Eve     | NULL| active   | NULL                |

```sql
-- Only active users
SELECT name, email
FROM   users
WHERE  status = 'active';
-- Returns: Alice, Dave, Eve
```

---

## ➕ Comparison Operators

These work the same in all major databases:

| Operator | Meaning               | Example              |
|----------|-----------------------|----------------------|
| `=`      | Equal to              | `age = 30`           |
| `!=`     | Not equal to          | `status != 'active'` |
| `<>`     | Not equal to (SQL std)| `status <> 'active'` |
| `<`      | Less than             | `age < 18`           |
| `>`      | Greater than          | `age > 25`           |
| `<=`     | Less than or equal    | `age <= 30`          |
| `>=`     | Greater than or equal | `age >= 18`          |

> **Tip:** `!=` and `<>` are functionally identical. `<>` is the SQL standard; both work in PostgreSQL, MySQL, SQL Server, and Oracle.

```sql
SELECT name
FROM   users
WHERE  age >= 18;
-- Returns: Alice, Carol, Dave (Bob is 17; Eve has NULL age — NULL is excluded)
```

---

## 🔗 AND, OR, NOT — Combining Conditions

### AND — both conditions must be true

```sql
SELECT name
FROM   users
WHERE  status = 'active'
  AND  age >= 18;
-- Returns: Alice, Dave
```

### OR — at least one condition must be true

```sql
SELECT name
FROM   users
WHERE  status = 'active'
  OR   age < 18;
-- Returns: Alice, Bob, Dave, Eve
```

### NOT — inverts a condition

```sql
SELECT name
FROM   users
WHERE  NOT status = 'active';
-- Returns: Bob, Carol
```

### ⚠️ Operator Precedence — AND Wins Over OR

SQL evaluates `AND` **before** `OR`, just like multiplication before addition in math. This is a common source of bugs.

```sql
-- WRONG INTENTION: you probably want (status = 'active' OR status = 'pending') AND age >= 18
SELECT name
FROM   users
WHERE  status = 'active'
  OR   status = 'pending'
  AND  age >= 18;
-- SQL reads this as: status = 'active' OR (status = 'pending' AND age >= 18)
-- Returns: Alice, Dave, Eve  — Bob is excluded! But you probably wanted him.

-- CORRECT: use parentheses to force your intended grouping
SELECT name
FROM   users
WHERE  (status = 'active' OR status = 'pending')
  AND  age >= 18;
-- Returns: Alice, Dave, Eve (Bob is excluded because age=17, which is correct now)
```

**Rule of thumb:** When mixing `AND` and `OR`, always use parentheses. They cost nothing and prevent bugs.

---

## 📋 IN — Match Against a List

Instead of chaining multiple `OR` conditions, use `IN`:

```sql
-- Verbose version with OR
SELECT name FROM users
WHERE  status = 'active' OR status = 'pending';

-- Clean version with IN
SELECT name FROM users
WHERE  status IN ('active', 'pending');
```

Both return the same result. `IN` is easier to read and maintain — especially when the list is long.

```sql
-- Filter multiple IDs
SELECT name FROM users
WHERE  id IN (1, 3, 5);
```

### ❌ NOT IN — Watch Out for NULLs!

`NOT IN` works as expected when the list has no NULLs:

```sql
SELECT name FROM users
WHERE  status NOT IN ('inactive');
-- Returns: Alice, Bob, Dave, Eve
```

**Critical caveat:** If the list contains a `NULL`, `NOT IN` **always returns zero rows**.

```sql
-- Suppose you subquery a list that happens to include NULL
SELECT name FROM users
WHERE  id NOT IN (2, NULL);
-- Returns: EMPTY — zero rows!
```

This happens because SQL uses three-valued logic. Comparing any value to `NULL` produces `UNKNOWN`, not `TRUE` or `FALSE`. So no row can be confirmed as "not in" a list containing `NULL`.

**Safe pattern:** Always use `NOT EXISTS` or filter NULLs out when using `NOT IN` with subqueries.

---

## 📏 BETWEEN — Range Filtering

`BETWEEN low AND high` is a shorthand for `>= low AND <= high`. Both ends are **inclusive**.

```sql
SELECT name, age
FROM   users
WHERE  age BETWEEN 18 AND 30;
-- Equivalent to: age >= 18 AND age <= 30
-- Returns: Alice (30), Carol (25), Dave (30)
```

`BETWEEN` also works on dates and strings:

```sql
-- Date range
SELECT * FROM orders
WHERE  created_at BETWEEN '2024-01-01' AND '2024-12-31';

-- Alphabetic range (less common, but valid)
SELECT name FROM users
WHERE  name BETWEEN 'A' AND 'D';
```

> **Note:** For dates, BETWEEN can be tricky with timestamps. `BETWEEN '2024-01-01' AND '2024-12-31'` may miss rows from Dec 31 after midnight. Prefer explicit `>= '2024-01-01' AND < '2025-01-01'` for timestamp columns.

---

## 🔤 LIKE — Pattern Matching

`LIKE` matches string patterns using two wildcard characters:

| Wildcard | Meaning                        | Example              |
|----------|--------------------------------|----------------------|
| `%`      | Any sequence of characters (0+)| `'alice%'` → alice, alice123 |
| `_`      | Exactly one character          | `'ali_e'` → alice, alige |

```sql
-- Names starting with 'A'
SELECT name FROM users WHERE name LIKE 'A%';

-- Names ending with 'e'
SELECT name FROM users WHERE name LIKE '%e';

-- Names containing 'ar'
SELECT name FROM users WHERE name LIKE '%ar%';

-- 5-character names with 'ob' in the middle
SELECT name FROM users WHERE name LIKE '_ob__';
```

### Case Sensitivity Differences

This is where databases diverge:

| Database    | Default behavior                              | Case-insensitive option         |
|-------------|-----------------------------------------------|---------------------------------|
| PostgreSQL  | Case-sensitive                                | Use `ILIKE`                     |
| MySQL       | Case-insensitive (for most collations)        | Default — no extra keyword needed |
| SQL Server  | Depends on column/database collation          | Use collation: `LIKE '%alice%' COLLATE Latin1_General_CI_AS` |
| Oracle      | Case-sensitive                                | Use `UPPER(col) LIKE UPPER('%alice%')` |

```sql
-- PostgreSQL: case-insensitive with ILIKE
SELECT name FROM users WHERE name ILIKE 'alice%';

-- MySQL: already case-insensitive by default
SELECT name FROM users WHERE name LIKE 'alice%';

-- SQL Server: force case-insensitive via collation
SELECT name FROM users
WHERE  name LIKE 'alice%' COLLATE Latin1_General_CI_AS;

-- Oracle: uppercase both sides
SELECT name FROM users WHERE UPPER(name) LIKE UPPER('alice%');
```

---

## 🔧 REGEXP / SIMILAR TO — Advanced Pattern Matching

For complex patterns beyond what `LIKE` offers, most databases provide regex support — but the syntax varies significantly:

```sql
-- PostgreSQL: ~ (case-sensitive), ~* (case-insensitive)
SELECT name FROM users WHERE name ~ '^A.*e$';   -- starts with A, ends with e
SELECT name FROM users WHERE name ~* '^a.*e$';  -- same, case-insensitive

-- PostgreSQL also supports SIMILAR TO (SQL standard regex subset)
SELECT name FROM users WHERE name SIMILAR TO '(Alice|Dave)';

-- MySQL: REGEXP or RLIKE (aliases)
SELECT name FROM users WHERE name REGEXP '^A.*e$';
SELECT name FROM users WHERE name RLIKE '^A.*e$';

-- SQL Server: no native REGEXP
-- Use LIKE with multiple patterns, or enable CLR integration for regex
-- Workaround:
SELECT name FROM users WHERE name LIKE 'A%e' OR name LIKE 'A%e%';

-- Oracle: REGEXP_LIKE() function
SELECT name FROM users WHERE REGEXP_LIKE(name, '^A.*e$');
-- Case-insensitive in Oracle:
SELECT name FROM users WHERE REGEXP_LIKE(name, '^A.*e$', 'i');
```

---

## 🚫 IS NULL / IS NOT NULL

`NULL` means "unknown" or "missing". You **cannot** compare to `NULL` using `=` or `!=` — those comparisons always return `UNKNOWN` (not `TRUE`).

```sql
-- WRONG: this returns zero rows, always
SELECT name FROM users WHERE email = NULL;

-- CORRECT: use IS NULL
SELECT name FROM users WHERE email IS NULL;
-- Returns: Eve

-- CORRECT: use IS NOT NULL
SELECT name FROM users WHERE email IS NOT NULL;
-- Returns: Alice, Bob, Carol, Dave
```

---

## 📅 Filtering Dates

Date filtering uses the same comparison operators, but the current-timestamp function varies by database:

```sql
-- PostgreSQL / MySQL
SELECT * FROM orders WHERE created_at >= NOW();

-- All databases (SQL standard)
SELECT * FROM orders WHERE created_at >= CURRENT_TIMESTAMP;

-- SQL Server
SELECT * FROM orders WHERE created_at >= GETDATE();

-- Oracle
SELECT * FROM orders WHERE created_at >= SYSDATE;
```

**Date range filtering example:**

```sql
-- Orders placed in 2024
SELECT order_id, total
FROM   orders
WHERE  created_at >= '2024-01-01'
  AND  created_at <  '2025-01-01';
```

**Filtering within the last N days:**

```sql
-- PostgreSQL
SELECT * FROM orders WHERE created_at >= NOW() - INTERVAL '30 days';

-- MySQL
SELECT * FROM orders WHERE created_at >= NOW() - INTERVAL 30 DAY;

-- SQL Server
SELECT * FROM orders WHERE created_at >= DATEADD(DAY, -30, GETDATE());

-- Oracle
SELECT * FROM orders WHERE created_at >= SYSDATE - 30;
```

---

## 🔡 String Functions in WHERE Clauses

You can call string functions directly inside `WHERE` conditions.

### UPPER / LOWER

Works the same everywhere:

```sql
SELECT name FROM users WHERE UPPER(name) = 'ALICE';
SELECT name FROM users WHERE LOWER(email) = 'alice@example.com';
```

### TRIM

Removes leading/trailing whitespace — same syntax in all major databases:

```sql
SELECT name FROM users WHERE TRIM(name) = 'Alice';
```

### LENGTH vs LEN

| Function    | PostgreSQL | MySQL | SQL Server | Oracle |
|-------------|-----------|-------|------------|--------|
| String length | `LENGTH()` | `LENGTH()` | `LEN()` | `LENGTH()` |

```sql
-- PostgreSQL / MySQL / Oracle
SELECT name FROM users WHERE LENGTH(name) > 4;

-- SQL Server
SELECT name FROM users WHERE LEN(name) > 4;
```

### SUBSTRING vs SUBSTR

The SQL standard is `SUBSTRING(col FROM start FOR length)`. Most databases also accept `SUBSTRING(col, start, length)`.

| Function    | PostgreSQL | MySQL | SQL Server | Oracle |
|-------------|-----------|-------|------------|--------|
| Standard    | `SUBSTRING` | `SUBSTRING` | `SUBSTRING` | `SUBSTR` |
| Shorthand   | `SUBSTR` (alias) | `SUBSTR` (alias) | — | `SUBSTRING` (alias) |

```sql
-- Works in PostgreSQL, MySQL, SQL Server
SELECT name FROM users WHERE SUBSTRING(name, 1, 1) = 'A';

-- Oracle prefers SUBSTR
SELECT name FROM users WHERE SUBSTR(name, 1, 1) = 'A';
```

### REPLACE

Same syntax everywhere:

```sql
-- Normalize email domains for comparison
SELECT name FROM users
WHERE  REPLACE(email, '.net', '.com') LIKE '%@example.com';
```

---

## 🌍 Real-World Filtering Examples

### 1. User Search

A user types "ali" into a search box. You want to match name or email:

```sql
-- PostgreSQL (case-insensitive with ILIKE)
SELECT id, name, email
FROM   users
WHERE  name  ILIKE '%ali%'
  OR   email ILIKE '%ali%';

-- MySQL (LIKE is already case-insensitive)
SELECT id, name, email
FROM   users
WHERE  name  LIKE '%ali%'
  OR   email LIKE '%ali%';

-- SQL Server
SELECT id, name, email
FROM   users
WHERE  name  LIKE '%ali%'  COLLATE Latin1_General_CI_AS
  OR   email LIKE '%ali%'  COLLATE Latin1_General_CI_AS;

-- Oracle
SELECT id, name, email
FROM   users
WHERE  UPPER(name)  LIKE UPPER('%ali%')
  OR   UPPER(email) LIKE UPPER('%ali%');
```

### 2. Date Range Report

Pull all orders from Q1 2024 with a value above $100:

```sql
SELECT order_id, customer_id, total, created_at
FROM   orders
WHERE  created_at >= '2024-01-01'
  AND  created_at <  '2024-04-01'
  AND  total > 100
ORDER BY created_at DESC;
```

### 3. Status Filtering with NULL Safety

Find all users who are either active or have no status set:

```sql
SELECT name, status
FROM   users
WHERE  status = 'active'
  OR   status IS NULL;
```

### 4. Exclude a Set of Roles Safely

```sql
-- Safe NOT IN when you control the list (no NULLs)
SELECT name FROM users
WHERE  role NOT IN ('admin', 'superuser');

-- Safer pattern when NULLs might exist in a subquery
SELECT name FROM users u
WHERE  NOT EXISTS (
    SELECT 1 FROM restricted_roles r
    WHERE  r.role = u.role
);
```

---

## 🗝️ Key Takeaways

| Concept          | Remember This                                                   |
|------------------|-----------------------------------------------------------------|
| `WHERE`          | Filters rows before any grouping or sorting                     |
| `AND` before `OR`| Use parentheses whenever you mix them                           |
| `IN`             | Cleaner than many `OR` conditions                               |
| `NOT IN + NULL`  | Avoid — always returns empty if the list contains NULL          |
| `BETWEEN`        | Inclusive on both ends; careful with timestamps                 |
| `LIKE`           | `%` = any chars, `_` = one char; case sensitivity varies by DB |
| `IS NULL`        | Never use `= NULL`; always use `IS NULL` / `IS NOT NULL`        |
| Dates            | Use `CURRENT_TIMESTAMP` for portability; date literals in `'YYYY-MM-DD'` |
| `LENGTH` vs `LEN`| PostgreSQL/MySQL/Oracle use `LENGTH`; SQL Server uses `LEN`     |

---

## 📝 Quiz

Test yourself — answers below (no peeking!).

**Question 1:** What does the following query return if `email` column contains NULL for some rows?

```sql
SELECT name FROM users WHERE email NOT IN ('a@b.com', NULL);
```

A) All users whose email is not `a@b.com`
B) Zero rows
C) An error
D) Only users with NULL email

---

**Question 2:** You need to find all products with a price between $20 and $80 inclusive, AND whose category is either `'electronics'` or `'books'`. Which query is correct?

A)
```sql
WHERE price BETWEEN 20 AND 80 AND category = 'electronics' OR category = 'books'
```

B)
```sql
WHERE price BETWEEN 20 AND 80 AND (category = 'electronics' OR category = 'books')
```

C)
```sql
WHERE price BETWEEN 20 AND 80 OR category IN ('electronics', 'books')
```

D) A and B are both correct

---

**Question 3:** Which of these correctly performs a case-insensitive LIKE search in PostgreSQL?

A) `WHERE name LIKE '%alice%'`
B) `WHERE name ILIKE '%alice%'`
C) `WHERE name REGEXP '%alice%'`
D) `WHERE NOCASE(name) LIKE '%alice%'`

---

**Answers:**
1. **B** — `NOT IN` with a NULL in the list always returns zero rows due to three-valued logic.
2. **B** — Option A is wrong because AND binds tighter than OR, making it `(... AND category = 'electronics') OR category = 'books'`. Parentheses are required.
3. **B** — PostgreSQL provides `ILIKE` for case-insensitive pattern matching. Option A is case-sensitive. Option C uses the wrong syntax (regex uses `~` in PostgreSQL). Option D is not a real function.

---

*Next chapter: Sorting and Limiting Results — ORDER BY, LIMIT/TOP/FETCH FIRST*
