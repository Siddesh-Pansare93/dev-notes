# 👁️ Views, Stored Procedures, and Functions

> **Chapter 9** — SQL for Beginners Series

---

## 📋 Table of Contents

1. [What Are Views?](#1-what-are-views)
2. [Creating, Querying, and Dropping Views](#2-creating-querying-and-dropping-views)
3. [Updatable Views](#3-updatable-views)
4. [WITH CHECK OPTION](#4-with-check-option)
5. [Materialized Views](#5-materialized-views)
6. [What Are Stored Procedures?](#6-what-are-stored-procedures)
7. [Stored Procedure Syntax by Database](#7-stored-procedure-syntax-by-database)
8. [IN, OUT, and INOUT Parameters](#8-in-out-and-inout-parameters)
9. [Calling Stored Procedures](#9-calling-stored-procedures)
10. [User-Defined Functions (UDFs)](#10-user-defined-functions-udfs)
11. [The Same Example Across All Four Databases](#11-the-same-example-across-all-four-databases)
12. [Procedures vs. Application Code — When to Use Which](#12-procedures-vs-application-code--when-to-use-which)
13. [Key Takeaways](#key-takeaways)
14. [Quiz](#quiz)

---

## 1. 👁️ What Are Views?

A **view** is a saved SELECT query that the database treats exactly like a table. You give your query a name, and from that point on you can query it as if rows actually live there — even though no data is stored separately (for standard views).

Think of a view as a window into your data:

- The underlying tables hold the real data.
- The view is the window — it shows a particular arrangement of that data every time you look through it.

### Why use views?

| Reason | Explanation |
|--------|-------------|
| **Simplicity** | Hide complex JOINs behind a clean name |
| **Security** | Expose only certain columns to certain users |
| **Consistency** | Enforce a single definition of a business concept (e.g., "active users") |
| **Abstraction** | Change the underlying table structure without breaking application queries |

Suppose you have `users` and `posts` tables and you frequently join them. Instead of writing the same JOIN every time, you save it as a view called `user_post_summary`.

---

## 2. 🔧 Creating, Querying, and Dropping Views

The core syntax is identical across all major databases.

```sql
-- Create a view
CREATE VIEW view_name AS
SELECT column1, column2, ...
FROM table_name
WHERE condition;

-- Query a view (just like a table)
SELECT * FROM view_name;
SELECT column1 FROM view_name WHERE condition;

-- Drop a view
DROP VIEW view_name;

-- Replace/update a view definition (recreate it)
CREATE OR REPLACE VIEW view_name AS
SELECT ...;
```

> **Note:** `CREATE OR REPLACE VIEW` works in PostgreSQL, MySQL, and Oracle.
> In SQL Server, use `ALTER VIEW view_name AS SELECT ...;`

### Practical example

```sql
-- Underlying tables
-- users(id, name, email, is_active)
-- posts(id, user_id, title, created_at)

CREATE VIEW active_user_posts AS
SELECT
    u.id         AS user_id,
    u.name       AS user_name,
    p.id         AS post_id,
    p.title      AS post_title,
    p.created_at AS posted_at
FROM users u
JOIN posts p ON p.user_id = u.id
WHERE u.is_active = 1;

-- Now use it anywhere
SELECT user_name, COUNT(post_id) AS total_posts
FROM active_user_posts
GROUP BY user_name
ORDER BY total_posts DESC;
```

Every time this SELECT runs, the database executes the underlying JOIN fresh — you always see current data.

---

## 3. ✏️ Updatable Views

You can sometimes run `INSERT`, `UPDATE`, or `DELETE` directly on a view, and the change flows through to the underlying table. This works when the view meets all of the following conditions:

- It selects from **exactly one base table**.
- It does **not** use `DISTINCT`, `GROUP BY`, `HAVING`, `UNION`, or aggregate functions.
- It does **not** use subqueries in the SELECT list.
- It includes enough columns to satisfy any `NOT NULL` constraints on the base table.

```sql
CREATE VIEW active_users AS
SELECT id, name, email
FROM users
WHERE is_active = 1;

-- This UPDATE flows through to the users table
UPDATE active_users
SET name = 'Alice Smith'
WHERE id = 42;

-- This INSERT adds a row directly to users
INSERT INTO active_users (id, name, email)
VALUES (99, 'Bob Jones', 'bob@example.com');
```

When a view is **not** updatable (complex JOINs, aggregates, etc.), the database raises an error if you try to write through it. In that case, use `INSTEAD OF` triggers (SQL Server / Oracle) to intercept writes on a non-updatable view.

---

## 4. ✅ WITH CHECK OPTION

`WITH CHECK OPTION` is a safety guard on updatable views. It refuses any INSERT or UPDATE that would make the new row invisible through the view's own WHERE clause.

```sql
CREATE VIEW active_users AS
SELECT id, name, email, is_active
FROM users
WHERE is_active = 1
WITH CHECK OPTION;

-- This fails: the inserted row has is_active = 0, so it would
-- immediately disappear from the view — the CHECK prevents it.
INSERT INTO active_users (id, name, email, is_active)
VALUES (100, 'Ghost User', 'ghost@example.com', 0);
-- ERROR: new row violates check option for view "active_users"
```

This is especially useful when views are used to enforce business rules (e.g., "only active users can be edited through this interface").

---

## 5. 🗄️ Materialized Views

A standard view recalculates its query every time you query it. A **materialized view** pre-computes the result and stores it physically on disk — like a cached snapshot. Queries against it are fast because no JOIN or aggregation runs at query time; you refresh the snapshot on a schedule or on demand.

The concept is the same everywhere, but the syntax and feature set differ significantly:

### PostgreSQL

```sql
-- Create
CREATE MATERIALIZED VIEW monthly_sales AS
SELECT
    DATE_TRUNC('month', order_date) AS month,
    SUM(amount)                      AS total_sales
FROM orders
GROUP BY 1;

-- Query (reads the snapshot, not live data)
SELECT * FROM monthly_sales;

-- Refresh the snapshot manually
REFRESH MATERIALIZED VIEW monthly_sales;

-- Refresh without locking reads (PostgreSQL 9.4+)
REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_sales;

-- Drop
DROP MATERIALIZED VIEW monthly_sales;
```

### MySQL

MySQL has no native materialized views. The common workaround is a regular table plus a scheduled event:

```sql
-- Step 1: Create a plain table to hold the pre-computed data
CREATE TABLE monthly_sales_cache (
    month        DATE,
    total_sales  DECIMAL(15,2)
);

-- Step 2: Create a stored procedure to refresh it
DELIMITER //
CREATE PROCEDURE refresh_monthly_sales()
BEGIN
    TRUNCATE TABLE monthly_sales_cache;
    INSERT INTO monthly_sales_cache
    SELECT
        DATE_FORMAT(order_date, '%Y-%m-01') AS month,
        SUM(amount)
    FROM orders
    GROUP BY 1;
END //
DELIMITER ;

-- Step 3: Schedule automatic refresh every day at midnight
CREATE EVENT refresh_sales_cache
ON SCHEDULE EVERY 1 DAY STARTS '2026-01-01 00:00:00'
DO CALL refresh_monthly_sales();
```

### SQL Server — Indexed Views

SQL Server calls them **Indexed Views**. You create a regular view with `SCHEMABINDING`, then add a unique clustered index, which forces the database to materialize and maintain the result automatically.

```sql
-- The view must use SCHEMABINDING
CREATE VIEW dbo.monthly_sales
WITH SCHEMABINDING AS
SELECT
    DATEFROMPARTS(YEAR(order_date), MONTH(order_date), 1) AS month,
    SUM(amount)   AS total_sales,
    COUNT_BIG(*)  AS row_count    -- required for indexed views
FROM dbo.orders
GROUP BY DATEFROMPARTS(YEAR(order_date), MONTH(order_date), 1);

-- Adding this index materializes the view
CREATE UNIQUE CLUSTERED INDEX IX_monthly_sales
ON dbo.monthly_sales (month);
```

SQL Server updates the materialized data automatically whenever the base table changes — there is no manual REFRESH step.

### Oracle

```sql
-- Create with automatic refresh on commit
CREATE MATERIALIZED VIEW monthly_sales
REFRESH FAST ON COMMIT AS
SELECT
    TRUNC(order_date, 'MM') AS month,
    SUM(amount)             AS total_sales
FROM orders
GROUP BY TRUNC(order_date, 'MM');

-- Or refresh on a schedule (complete refresh every day)
CREATE MATERIALIZED VIEW monthly_sales
REFRESH COMPLETE
START WITH SYSDATE
NEXT SYSDATE + 1 AS
SELECT
    TRUNC(order_date, 'MM') AS month,
    SUM(amount)             AS total_sales
FROM orders
GROUP BY TRUNC(order_date, 'MM');

-- Manual refresh
EXEC DBMS_MVIEW.REFRESH('monthly_sales', 'C');
```

### Materialized Views Quick Comparison

| Feature | PostgreSQL | MySQL | SQL Server | Oracle |
|---------|-----------|-------|------------|--------|
| Native support | Yes | No | Indexed Views | Yes |
| Manual refresh | `REFRESH MATERIALIZED VIEW` | `CALL procedure` | N/A (auto) | `DBMS_MVIEW.REFRESH` |
| Auto refresh | No (use pg_cron) | Via Events | Yes (auto) | Yes (on commit / schedule) |
| Concurrent reads during refresh | Yes (`CONCURRENTLY`) | Always | Always | Yes |

---

## 6. 📦 What Are Stored Procedures?

A **stored procedure** is a named block of SQL logic saved inside the database itself. Instead of sending multiple SQL statements over the network from your application, you call one procedure name and the database engine runs all the logic server-side.

### Why use stored procedures?

- **Performance** — logic runs close to the data; reduces network round-trips.
- **Reusability** — write once, call from any application or user.
- **Security** — grant `EXECUTE` on the procedure without granting direct table access.
- **Encapsulation** — business rules live in one place, not scattered across applications.

---

## 7. 🗃️ Stored Procedure Syntax by Database

This is where databases diverge the most. Each has its own procedural language and syntax rules.

### PostgreSQL — `CREATE FUNCTION` with PL/pgSQL

PostgreSQL uses `CREATE FUNCTION` for both functions and procedures (procedures were added in PG 11 via `CREATE PROCEDURE`, but functions with `VOID` return type were the traditional approach).

```sql
-- PostgreSQL
CREATE OR REPLACE FUNCTION greet_user(p_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE NOTICE 'Hello, %!', p_name;
END;
$$;

-- Call it
SELECT greet_user('Alice');
```

### MySQL — `CREATE PROCEDURE` with `DELIMITER`

MySQL uses `DELIMITER` to temporarily change the statement terminator, because the procedure body contains semicolons that would otherwise end the `CREATE` statement early.

```sql
-- MySQL
DELIMITER //
CREATE PROCEDURE greet_user(IN p_name VARCHAR(100))
BEGIN
    SELECT CONCAT('Hello, ', p_name, '!') AS greeting;
END //
DELIMITER ;

-- Call it
CALL greet_user('Alice');
```

### SQL Server — `CREATE PROCEDURE` with T-SQL

```sql
-- SQL Server
CREATE OR ALTER PROCEDURE greet_user
    @p_name NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 'Hello, ' + @p_name + '!' AS greeting;
END;

-- Call it
EXEC greet_user @p_name = 'Alice';
-- or: EXECUTE greet_user 'Alice';
```

### Oracle — `CREATE PROCEDURE` with PL/SQL

```sql
-- Oracle
CREATE OR REPLACE PROCEDURE greet_user(p_name IN VARCHAR2)
AS
BEGIN
    DBMS_OUTPUT.PUT_LINE('Hello, ' || p_name || '!');
END;
/

-- Call it
EXEC greet_user('Alice');
-- or inside a PL/SQL block:
BEGIN
    greet_user('Alice');
END;
/
```

---

## 8. 🔄 IN, OUT, and INOUT Parameters

All major databases support three parameter modes:

| Mode | Direction | Description |
|------|-----------|-------------|
| `IN` | Caller → Procedure | Read-only input value (default in most DBs) |
| `OUT` | Procedure → Caller | The procedure writes a result back |
| `INOUT` | Both ways | Caller passes a value; procedure can modify and return it |

```sql
-- PostgreSQL example with OUT parameter
CREATE OR REPLACE FUNCTION get_user_count(
    OUT p_count INT
)
LANGUAGE plpgsql
AS $$
BEGIN
    SELECT COUNT(*) INTO p_count FROM users;
END;
$$;

SELECT get_user_count();
```

```sql
-- MySQL example with OUT parameter
DELIMITER //
CREATE PROCEDURE get_user_count(OUT p_count INT)
BEGIN
    SELECT COUNT(*) INTO p_count FROM users;
END //
DELIMITER ;

CALL get_user_count(@total);
SELECT @total;   -- read the OUT value from a session variable
```

```sql
-- SQL Server example with OUTPUT parameter
CREATE OR ALTER PROCEDURE get_user_count
    @p_count INT OUTPUT
AS
BEGIN
    SELECT @p_count = COUNT(*) FROM users;
END;

DECLARE @total INT;
EXEC get_user_count @p_count = @total OUTPUT;
SELECT @total;
```

```sql
-- Oracle example with OUT parameter
CREATE OR REPLACE PROCEDURE get_user_count(p_count OUT NUMBER)
AS
BEGIN
    SELECT COUNT(*) INTO p_count FROM users;
END;
/

DECLARE
    v_count NUMBER;
BEGIN
    get_user_count(v_count);
    DBMS_OUTPUT.PUT_LINE('Count: ' || v_count);
END;
/
```

---

## 9. 📞 Calling Stored Procedures

| Database | Keyword | Example |
|----------|---------|---------|
| PostgreSQL | `SELECT` (for functions) / `CALL` (PG 11+ procedures) | `CALL my_proc(arg);` or `SELECT my_func(arg);` |
| MySQL | `CALL` | `CALL my_proc(arg);` |
| SQL Server | `EXEC` or `EXECUTE` | `EXEC my_proc @param = val;` |
| Oracle | `EXEC` (SQL*Plus) / `BEGIN...END` block | `EXEC my_proc(arg);` |

---

## 10. ⚙️ User-Defined Functions (UDFs)

Unlike stored procedures, **functions** must return a value and can be used directly inside SQL expressions (`SELECT`, `WHERE`, `JOIN ON`, etc.). Procedures cannot.

### Scalar Functions — return a single value

```sql
-- PostgreSQL
CREATE OR REPLACE FUNCTION full_name(first TEXT, last TEXT)
RETURNS TEXT
LANGUAGE sql
AS $$
    SELECT first || ' ' || last;
$$;

SELECT full_name(first_name, last_name) FROM users;
```

```sql
-- MySQL
CREATE FUNCTION full_name(first VARCHAR(100), last VARCHAR(100))
RETURNS VARCHAR(200)
DETERMINISTIC
BEGIN
    RETURN CONCAT(first, ' ', last);
END;
```

```sql
-- SQL Server
CREATE OR ALTER FUNCTION dbo.full_name(
    @first NVARCHAR(100),
    @last  NVARCHAR(100)
)
RETURNS NVARCHAR(200)
AS
BEGIN
    RETURN @first + ' ' + @last;
END;
```

```sql
-- Oracle
CREATE OR REPLACE FUNCTION full_name(
    p_first VARCHAR2,
    p_last  VARCHAR2
) RETURN VARCHAR2
AS
BEGIN
    RETURN p_first || ' ' || p_last;
END;
/
```

### Table-Valued Functions — return a result set (PostgreSQL and SQL Server)

These functions return a full table of rows, not a single scalar value. They are powerful for encapsulating complex queries that you want to reuse inline.

```sql
-- PostgreSQL: RETURNS TABLE
CREATE OR REPLACE FUNCTION users_in_country(p_country TEXT)
RETURNS TABLE(id INT, name TEXT, email TEXT)
LANGUAGE sql
AS $$
    SELECT id, name, email
    FROM users
    WHERE country = p_country;
$$;

-- Use like a table
SELECT * FROM users_in_country('Canada');
```

```sql
-- SQL Server: RETURNS TABLE (inline table-valued function)
CREATE OR ALTER FUNCTION dbo.users_in_country(@country NVARCHAR(100))
RETURNS TABLE
AS
RETURN (
    SELECT id, name, email
    FROM users
    WHERE country = @country
);

-- Use like a table
SELECT * FROM dbo.users_in_country('Canada');
```

> MySQL and Oracle support table-valued functions with more verbose syntax (using pipelined functions in Oracle or temporary tables in MySQL), but they are less commonly used in those platforms.

---

## 11. 🔁 The Same Example Across All Four Databases

**Goal:** A reusable routine that accepts a user ID and returns that user's name along with their total post count.

### PostgreSQL

```sql
-- PostgreSQL
CREATE OR REPLACE FUNCTION get_user_with_post_count(p_user_id INT)
RETURNS TABLE(user_name TEXT, post_count BIGINT)
LANGUAGE sql
AS $$
    SELECT
        u.name          AS user_name,
        COUNT(p.id)     AS post_count
    FROM users u
    LEFT JOIN posts p ON p.user_id = u.id
    WHERE u.id = p_user_id
    GROUP BY u.name;
$$;

-- Usage
SELECT * FROM get_user_with_post_count(42);
```

### MySQL

```sql
-- MySQL
DELIMITER //
CREATE PROCEDURE get_user_with_post_count(IN p_user_id INT)
BEGIN
    SELECT
        u.name          AS user_name,
        COUNT(p.id)     AS post_count
    FROM users u
    LEFT JOIN posts p ON p.user_id = u.id
    WHERE u.id = p_user_id
    GROUP BY u.name;
END //
DELIMITER ;

-- Usage
CALL get_user_with_post_count(42);
```

### SQL Server

```sql
-- SQL Server
CREATE OR ALTER FUNCTION dbo.get_user_with_post_count(@user_id INT)
RETURNS TABLE
AS
RETURN (
    SELECT
        u.name          AS user_name,
        COUNT(p.id)     AS post_count
    FROM users u
    LEFT JOIN posts p ON p.user_id = u.id
    WHERE u.id = @user_id
    GROUP BY u.name
);

-- Usage
SELECT * FROM dbo.get_user_with_post_count(42);

-- Alternatively, as a stored procedure:
CREATE OR ALTER PROCEDURE dbo.get_user_with_post_count
    @user_id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        u.name          AS user_name,
        COUNT(p.id)     AS post_count
    FROM users u
    LEFT JOIN posts p ON p.user_id = u.id
    WHERE u.id = @user_id
    GROUP BY u.name;
END;

EXEC dbo.get_user_with_post_count @user_id = 42;
```

### Oracle

```sql
-- Oracle: function returning a SYS_REFCURSOR
CREATE OR REPLACE FUNCTION get_user_with_post_count(p_user_id NUMBER)
RETURN SYS_REFCURSOR
AS
    v_result SYS_REFCURSOR;
BEGIN
    OPEN v_result FOR
        SELECT
            u.name          AS user_name,
            COUNT(p.id)     AS post_count
        FROM users u
        LEFT JOIN posts p ON p.user_id = u.id
        WHERE u.id = p_user_id
        GROUP BY u.name;
    RETURN v_result;
END;
/

-- Usage (from an application or PL/SQL block)
DECLARE
    v_cursor SYS_REFCURSOR;
    v_name   VARCHAR2(200);
    v_count  NUMBER;
BEGIN
    v_cursor := get_user_with_post_count(42);
    FETCH v_cursor INTO v_name, v_count;
    DBMS_OUTPUT.PUT_LINE(v_name || ': ' || v_count || ' posts');
    CLOSE v_cursor;
END;
/
```

---

## 12. ⚖️ Procedures vs. Application Code — When to Use Which

This is one of the most debated topics in backend development. Here is a practical breakdown:

### Use stored procedures or functions when:

| Situation | Why it helps |
|-----------|-------------|
| **Batch data processing** | Processing millions of rows inside the DB avoids sending all that data over the network |
| **Enforcing business rules centrally** | Multiple apps (web, mobile, batch) share one canonical implementation |
| **Fine-grained security** | Grant `EXECUTE` on a procedure; deny direct `SELECT/UPDATE` on the table |
| **Complex multi-step transactions** | Keep all steps atomic inside a single DB session |
| **Reporting and scheduled jobs** | DB-native scheduling (MySQL Events, Oracle DBMS_SCHEDULER) pairs naturally |

### Use application code when:

| Situation | Why it helps |
|-----------|-------------|
| **Rapid iteration** | Deploying a Python/Node/Java change is easier than a schema migration |
| **Version control and code review** | Stored procedures are harder to diff and review than application code |
| **Unit testing** | Application logic is far easier to test in isolation |
| **Logic involving external services** | Calling an API, sending email, or reading a file — not possible inside SQL |
| **Complex conditional flows** | Modern languages handle branching, loops, and error handling more cleanly |
| **Team expertise** | Most backend developers are more comfortable in their app language |

**Rule of thumb:** Keep SQL in the database for what SQL is best at — set-based data operations. Keep business logic in your application for what programming languages are best at — control flow, external integrations, and testability.

---

## 🔑 Key Takeaways

- A **view** is a named SELECT query stored in the database. It behaves like a table but reads live data every time it is queried.
- Views can be **updatable** (writes flow to the underlying table) when they are simple enough — no JOINs, aggregates, or DISTINCT.
- `WITH CHECK OPTION` prevents inserts or updates that would make a row invisible through the view's own filter.
- **Materialized views** store the query result physically for fast reads. PostgreSQL and Oracle support them natively; SQL Server uses Indexed Views; MySQL requires a manual workaround.
- **Stored procedures** save server-side logic with a name. Their syntax varies greatly: PostgreSQL uses PL/pgSQL, MySQL uses `DELIMITER`, SQL Server uses T-SQL, and Oracle uses PL/SQL.
- Parameters come in three modes: `IN` (input), `OUT` (output), and `INOUT` (both). SQL Server uses the `OUTPUT` keyword instead of `OUT`.
- **User-defined functions** must return a value and can be embedded in SQL expressions. Scalar functions return one value; table-valued functions return rows.
- Use stored procedures for batch operations, security boundaries, and multi-app shared logic. Use application code for business logic that benefits from version control, testing, and external integrations.

---

## 📝 Quiz

Test your understanding before moving on.

**Question 1**

You create this view:

```sql
CREATE VIEW vip_users AS
SELECT id, name, email, spending_tier
FROM users
WHERE spending_tier = 'VIP'
WITH CHECK OPTION;
```

A developer runs:

```sql
UPDATE vip_users SET spending_tier = 'Standard' WHERE id = 7;
```

What happens, and why?

<details>
<summary>Answer</summary>

The UPDATE is **rejected** with an error. The `WITH CHECK OPTION` clause prevents any modification that would cause the updated row to no longer satisfy the view's `WHERE spending_tier = 'VIP'` condition. After the update, the row would have `spending_tier = 'Standard'`, which means it would disappear from the view — exactly what `WITH CHECK OPTION` is designed to block.

</details>

---

**Question 2**

Your team is debating where to put this logic: "When a user places an order, deduct the item quantity from inventory and log the transaction." Should this go in a stored procedure or in the application layer? What factors should drive your decision?

<details>
<summary>Answer</summary>

There is no single right answer, but the key factors are:

- **For a stored procedure:** The logic is purely set-based (UPDATE inventory, INSERT log). It benefits from atomicity within a single DB transaction. If multiple applications (web, mobile app, batch importer) all place orders, centralizing the logic in a procedure prevents duplication.
- **For the application layer:** If you need to call external services (e.g., notify a warehouse API, send a confirmation email), a stored procedure cannot do this. Application code is also easier to unit-test, version-control, and deploy incrementally.

A common real-world compromise: handle the data mutation (deduct inventory + log) in a transaction in the application layer, and potentially call a stored procedure for the actual SQL work while keeping orchestration and external calls in application code.

</details>

---

**Question 3**

You want a fast summary report showing total sales per product category, queried hundreds of times per hour. The underlying sales data changes only once per hour (batch import). Which database object is the best fit, and how would you set it up in PostgreSQL?

<details>
<summary>Answer</summary>

A **materialized view** is the best fit. Since data changes only once per hour, there is no need to re-run the aggregation on every query. Store the pre-computed result and refresh it after each batch import.

```sql
-- Create the materialized view
CREATE MATERIALIZED VIEW category_sales_summary AS
SELECT
    p.category,
    SUM(oi.quantity * oi.unit_price) AS total_sales
FROM order_items oi
JOIN products p ON p.id = oi.product_id
GROUP BY p.category;

-- After each hourly batch import, refresh it:
REFRESH MATERIALIZED VIEW CONCURRENTLY category_sales_summary;

-- All report queries now hit the snapshot, not the raw tables:
SELECT * FROM category_sales_summary ORDER BY total_sales DESC;
```

`CONCURRENTLY` allows reads to continue while the refresh runs (requires a unique index on the materialized view).

</details>

---

*Next Chapter: Transactions and Concurrency Control →*
