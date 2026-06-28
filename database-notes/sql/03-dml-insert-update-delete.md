# 📝 Chapter 3: Inserting, Updating, and Deleting Data (DML)

> **Level:** Beginner | **Estimated reading time:** ~25 minutes  
> **Prerequisites:** Chapter 1 (SQL Basics), Chapter 2 (SELECT queries)

---

## 🗺️ What You Will Learn

Data Manipulation Language (DML) is the part of SQL that lets you **change** what is inside a database. While `SELECT` reads data, DML writes it. By the end of this chapter you will be able to:

- Add new rows with `INSERT INTO`
- Modify existing rows with `UPDATE`
- Remove rows with `DELETE` and `TRUNCATE`
- Handle the "insert or update" scenario with UPSERT
- Retrieve the rows you just changed with `RETURNING` / `OUTPUT`
- Avoid the single most catastrophic SQL mistake a developer can make

---

## 🏪 Our Running Example

Throughout this chapter we will work with a small e-commerce schema:

```sql
-- products table
CREATE TABLE products (
    product_id   INT PRIMARY KEY,
    name         VARCHAR(100),
    price        DECIMAL(10, 2),
    stock        INT,
    is_active    BOOLEAN DEFAULT TRUE
);

-- orders table
CREATE TABLE orders (
    order_id     INT PRIMARY KEY,
    customer_id  INT,
    product_id   INT,
    quantity     INT,
    status       VARCHAR(20) DEFAULT 'pending',
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- order_archive table (same shape as orders, used later)
CREATE TABLE order_archive (
    order_id    INT PRIMARY KEY,
    customer_id INT,
    product_id  INT,
    quantity    INT,
    status      VARCHAR(20),
    created_at  TIMESTAMP
);
```

---

## ➕ INSERT INTO — Adding Rows

### Single Row Insert

The most basic form inserts exactly one row. Syntax is identical across all major databases:

```sql
INSERT INTO products (product_id, name, price, stock)
VALUES (1, 'Wireless Mouse', 29.99, 150);
```

**Tips for beginners:**
- Always list the column names explicitly. Relying on column order is fragile — someone adding a column later will break your INSERT.
- Columns not listed (like `is_active`) will receive their `DEFAULT` value or `NULL`.

### Multiple Row Insert

You can insert several rows in a single statement. This is far more efficient than running one INSERT per row:

```sql
INSERT INTO products (product_id, name, price, stock)
VALUES
    (2, 'Mechanical Keyboard', 89.99, 75),
    (3, 'USB-C Hub',           24.99, 200),
    (4, 'Monitor Stand',       49.99, 60);
```

This syntax works the same in PostgreSQL, MySQL, SQL Server (2008+), and Oracle (18c+).

---

## 📋 INSERT INTO ... SELECT — Copying Rows from Another Table

You can use a `SELECT` statement as the source of an `INSERT`. This is perfect for archiving, migrating, or cloning data:

```sql
-- Archive all completed orders into order_archive
INSERT INTO order_archive (order_id, customer_id, product_id, quantity, status, created_at)
SELECT order_id, customer_id, product_id, quantity, status, created_at
FROM   orders
WHERE  status = 'completed';
```

The column count and data types of the `SELECT` result must match the target column list. The `SELECT` can be as complex as you like — it can include `JOIN`s, `WHERE` filters, computed columns, and aggregations.

---

## 🔄 UPSERT — Insert or Update If It Already Exists

A very common real-world need: "Insert this row, but if the primary key already exists, update the existing row instead." This is called an **UPSERT** (update + insert). Each database handles it differently.

### PostgreSQL — ON CONFLICT DO UPDATE

```sql
-- PostgreSQL
INSERT INTO products (product_id, name, price, stock)
VALUES (1, 'Wireless Mouse', 34.99, 200)
ON CONFLICT (product_id)
DO UPDATE SET
    price = EXCLUDED.price,
    stock = EXCLUDED.stock;
```

`EXCLUDED` is a special table that holds the values you tried to insert. You can also use `ON CONFLICT DO NOTHING` to silently ignore duplicates.

### MySQL — ON DUPLICATE KEY UPDATE

```sql
-- MySQL
INSERT INTO products (product_id, name, price, stock)
VALUES (1, 'Wireless Mouse', 34.99, 200)
ON DUPLICATE KEY UPDATE
    price = VALUES(price),
    stock = VALUES(stock);
```

`VALUES(col)` refers to the value that was in the attempted INSERT.

### SQL Server — MERGE Statement

SQL Server uses a more verbose but powerful `MERGE` statement:

```sql
-- SQL Server
MERGE INTO products AS target
USING (VALUES (1, 'Wireless Mouse', 34.99, 200))
      AS source (product_id, name, price, stock)
ON    target.product_id = source.product_id
WHEN MATCHED THEN
    UPDATE SET target.price = source.price,
               target.stock = source.stock
WHEN NOT MATCHED THEN
    INSERT (product_id, name, price, stock)
    VALUES (source.product_id, source.name, source.price, source.stock);
```

### Oracle — MERGE Statement

Oracle's `MERGE` syntax is nearly identical to SQL Server's:

```sql
-- Oracle
MERGE INTO products target
USING (SELECT 1 AS product_id, 'Wireless Mouse' AS name,
              34.99 AS price, 200 AS stock FROM DUAL) source
ON    (target.product_id = source.product_id)
WHEN MATCHED THEN
    UPDATE SET target.price = source.price,
               target.stock = source.stock
WHEN NOT MATCHED THEN
    INSERT (product_id, name, price, stock)
    VALUES (source.product_id, source.name, source.price, source.stock);
```

### UPSERT Quick Comparison

| Feature | PostgreSQL | MySQL | SQL Server | Oracle |
|---|---|---|---|---|
| Keyword | `ON CONFLICT DO UPDATE` | `ON DUPLICATE KEY UPDATE` | `MERGE` | `MERGE` |
| Conflict source reference | `EXCLUDED.col` | `VALUES(col)` | `source.col` | `source.col` |
| Only insert on conflict | `ON CONFLICT DO NOTHING` | `INSERT IGNORE` | `WHEN NOT MATCHED THEN INSERT` | same |

---

## ✏️ UPDATE — Modifying Existing Rows

### Basic UPDATE

```sql
-- Raise the price of product 2 by 10%
UPDATE products
SET    price = price * 1.10
WHERE  product_id = 2;
```

### Updating Multiple Columns at Once

```sql
-- Mark an order as shipped and record the time
UPDATE orders
SET    status     = 'shipped',
       created_at = CURRENT_TIMESTAMP
WHERE  order_id = 1042;
```

You can update as many columns as you like in one `SET` clause — just separate them with commas.

### Conditional Update with a Subquery

```sql
-- Give a 15% discount to all products that have never been ordered
UPDATE products
SET    price = price * 0.85
WHERE  product_id NOT IN (
    SELECT DISTINCT product_id FROM orders
);
```

---

## ☠️ The Deadly WHERE Clause Mistake

> **This is the most important warning in this entire chapter.**

Running `UPDATE` or `DELETE` **without a `WHERE` clause` affects every single row in the table. There is no undo button in most production systems.

```sql
-- DISASTER: updates price for ALL products, not just one
UPDATE products
SET price = 0.01;

-- CORRECT: only affects the intended row
UPDATE products
SET   price = 0.01
WHERE product_id = 7;
```

**Defensive habits to build right now:**
1. Always write the `WHERE` clause first, before the `SET` clause, and run a `SELECT` with that same `WHERE` to confirm which rows are affected.
2. Wrap destructive statements in a transaction so you can `ROLLBACK` if something goes wrong (covered in Chapter 5).
3. In production, request a confirmation count before committing.

```sql
-- Step 1: Check what you are about to change
SELECT * FROM products WHERE stock < 5;

-- Step 2: Only then run the UPDATE
UPDATE products
SET    is_active = FALSE
WHERE  stock < 5;
```

---

## 🔗 UPDATE with JOIN — Cross-Database Differences

Sometimes you need to update rows in one table using values from another table. The syntax diverges significantly here.

**Scenario:** When a product's price changes, update any pending orders to reflect a new `notes` column.

### PostgreSQL — FROM clause

```sql
-- PostgreSQL
UPDATE orders AS o
SET    status = 'price_updated'
FROM   products AS p
WHERE  o.product_id = p.product_id
AND    p.price > 50
AND    o.status = 'pending';
```

### MySQL — JOIN in UPDATE

```sql
-- MySQL
UPDATE orders AS o
JOIN   products AS p ON o.product_id = p.product_id
SET    o.status = 'price_updated'
WHERE  p.price > 50
AND    o.status = 'pending';
```

### SQL Server — FROM with JOIN

```sql
-- SQL Server
UPDATE o
SET    o.status = 'price_updated'
FROM   orders   AS o
JOIN   products AS p ON o.product_id = p.product_id
WHERE  p.price > 50
AND    o.status = 'pending';
```

### Oracle — Correlated Subquery (most portable)

Oracle does not support `FROM` or `JOIN` directly in `UPDATE`. Use a correlated subquery or a `MERGE`:

```sql
-- Oracle
UPDATE orders o
SET    o.status = 'price_updated'
WHERE  o.status = 'pending'
AND    EXISTS (
    SELECT 1
    FROM   products p
    WHERE  p.product_id = o.product_id
    AND    p.price > 50
);
```

---

## 🗑️ DELETE FROM — Removing Rows

### Basic DELETE

```sql
-- Remove a single cancelled order
DELETE FROM orders
WHERE order_id = 505;

-- Remove all orders older than 2 years
DELETE FROM orders
WHERE created_at < CURRENT_DATE - INTERVAL '2 years';
```

> **Reminder:** Always include a `WHERE` clause. `DELETE FROM orders;` with no filter wipes the entire table.

### Soft Delete — A Real-World Pattern

In most applications you never truly delete rows — you hide them by flipping a flag. This preserves audit history and allows recovery:

```sql
-- Instead of hard-deleting, mark as inactive
UPDATE products
SET    is_active = FALSE
WHERE  product_id = 9;

-- Your SELECT queries then always filter active products
SELECT * FROM products WHERE is_active = TRUE;
```

This pattern is called a **soft delete** and is used by virtually every serious production application.

### DELETE with JOIN

Deleting rows in one table based on a condition in another table.

```sql
-- PostgreSQL
DELETE FROM orders
USING  products
WHERE  orders.product_id = products.product_id
AND    products.is_active = FALSE;
```

```sql
-- MySQL
DELETE o
FROM   orders   AS o
JOIN   products AS p ON o.product_id = p.product_id
WHERE  p.is_active = FALSE;
```

```sql
-- SQL Server
DELETE o
FROM   orders   AS o
JOIN   products AS p ON o.product_id = p.product_id
WHERE  p.is_active = 0;
```

```sql
-- Oracle (correlated subquery)
DELETE FROM orders o
WHERE EXISTS (
    SELECT 1
    FROM   products p
    WHERE  p.product_id = o.product_id
    AND    p.is_active  = 0
);
```

---

## ⚡ TRUNCATE vs DELETE

Both remove rows, but they behave very differently:

| Feature | `DELETE` | `TRUNCATE` |
|---|---|---|
| Removes rows | One at a time (logged) | All at once (minimally logged) |
| Speed on large tables | Slow | Very fast |
| WHERE clause | Supported | Not supported |
| Resets AUTO_INCREMENT / IDENTITY | No | Yes (usually) |
| Can be rolled back | Yes (inside a transaction) | Depends on DB* |
| Fires row-level triggers | Yes | Usually no |
| Can truncate tables with FK references | No | No (must disable FKs first) |

*PostgreSQL and SQL Server allow `TRUNCATE` inside a transaction. MySQL does not — it auto-commits.

```sql
-- Wipe ALL rows from the table and reset the identity counter
TRUNCATE TABLE order_archive;
```

**Rule of thumb:** Use `TRUNCATE` only when you intentionally want to empty the entire table — for example, clearing a staging or temp table between ETL runs. For anything else, use `DELETE`.

---

## 🔁 RETURNING / OUTPUT — Getting Changed Rows Back

A powerful feature: after inserting, updating, or deleting rows, you often need to know which rows were affected — for example, to get a newly generated ID or log what was deleted.

### PostgreSQL and Oracle — RETURNING clause

```sql
-- PostgreSQL / Oracle: INSERT and get back the new row
INSERT INTO orders (order_id, customer_id, product_id, quantity)
VALUES (9001, 42, 3, 2)
RETURNING order_id, created_at;

-- PostgreSQL: UPDATE and see the before/after values
UPDATE products
SET    stock = stock - 1
WHERE  product_id = 3
RETURNING product_id, name, stock;

-- PostgreSQL: DELETE and capture what was deleted
DELETE FROM orders
WHERE  status = 'cancelled'
RETURNING order_id, customer_id;
```

### SQL Server — OUTPUT clause

SQL Server uses `OUTPUT` and exposes two pseudo-tables: `INSERTED` (new values) and `DELETED` (old values):

```sql
-- SQL Server: INSERT with OUTPUT
INSERT INTO orders (order_id, customer_id, product_id, quantity)
OUTPUT INSERTED.order_id, INSERTED.created_at
VALUES (9001, 42, 3, 2);

-- SQL Server: UPDATE — see both old and new values
UPDATE products
SET    stock = stock - 1
OUTPUT DELETED.stock AS old_stock,
       INSERTED.stock AS new_stock,
       INSERTED.product_id
WHERE  product_id = 3;

-- SQL Server: DELETE with OUTPUT
DELETE FROM orders
OUTPUT DELETED.order_id, DELETED.status
WHERE  status = 'cancelled';
```

### MySQL — No Native RETURNING

MySQL does not have a `RETURNING` clause. The common workarounds:

```sql
-- MySQL: For INSERT, use LAST_INSERT_ID() for auto-increment PKs
INSERT INTO orders (customer_id, product_id, quantity)
VALUES (42, 3, 2);

SELECT LAST_INSERT_ID();   -- returns the generated order_id

-- For UPDATE/DELETE, run a SELECT first to capture the IDs,
-- then run the UPDATE/DELETE
SELECT order_id FROM orders WHERE status = 'cancelled';
DELETE FROM orders WHERE status = 'cancelled';
```

### RETURNING Quick Comparison

| Database | INSERT | UPDATE | DELETE | Notes |
|---|---|---|---|---|
| PostgreSQL | `RETURNING *` | `RETURNING *` | `RETURNING *` | Full support |
| Oracle | `RETURNING col INTO :var` | `RETURNING col INTO :var` | `RETURNING col INTO :var` | Bind variable syntax in PL/SQL |
| SQL Server | `OUTPUT INSERTED.*` | `OUTPUT INSERTED.*, DELETED.*` | `OUTPUT DELETED.*` | Can access both old and new |
| MySQL | `LAST_INSERT_ID()` for INSERT only | Not available | Not available | Must workaround with SELECT |

---

## 🛒 Real-World Examples

### Example 1: Processing an E-Commerce Order

```sql
-- Step 1: Create the order
INSERT INTO orders (order_id, customer_id, product_id, quantity, status)
VALUES (9001, 42, 3, 2, 'pending');

-- Step 2: Deduct stock
UPDATE products
SET    stock = stock - 2
WHERE  product_id = 3
AND    stock >= 2;   -- safety check: never go negative

-- Step 3: Mark the order as confirmed only if stock was available
UPDATE orders
SET    status = 'confirmed'
WHERE  order_id = 9001
AND EXISTS (
    SELECT 1 FROM products WHERE product_id = 3 AND stock >= 0
);
```

### Example 2: Bulk Price Update from a Pricing Table

```sql
-- A separate table holds the new prices approved by the pricing team
-- pricing_updates (product_id, new_price)

-- PostgreSQL
UPDATE products AS p
SET    price = pu.new_price
FROM   pricing_updates AS pu
WHERE  p.product_id = pu.product_id;
```

### Example 3: Soft Delete Discontinued Products and Archive Their Orders

```sql
-- 1. Soft-delete the products
UPDATE products
SET    is_active = FALSE
WHERE  product_id IN (7, 8, 11);

-- 2. Archive pending orders for those products
INSERT INTO order_archive
SELECT * FROM orders
WHERE  product_id IN (7, 8, 11)
AND    status = 'pending';

-- 3. Cancel those orders
UPDATE orders
SET    status = 'cancelled'
WHERE  product_id IN (7, 8, 11)
AND    status = 'pending';
```

---

## 💡 Key Takeaways

- `INSERT INTO ... VALUES (...)` adds rows. List column names explicitly — never rely on column order.
- `INSERT INTO ... SELECT ...` copies rows from another table or query result.
- UPSERT syntax differs by database: `ON CONFLICT` (PostgreSQL), `ON DUPLICATE KEY UPDATE` (MySQL), `MERGE` (SQL Server, Oracle).
- `UPDATE` modifies existing rows. **Always include a `WHERE` clause unless you genuinely mean to update every row.**
- `UPDATE ... FROM / JOIN` lets you update using data from another table — syntax varies by database.
- `DELETE FROM` removes rows. **Always include a `WHERE` clause.** Prefer soft deletes (a flag column) in real applications.
- `TRUNCATE` removes all rows instantly, resets identity counters, and cannot always be rolled back — use it only for wiping entire tables (staging/temp tables).
- `RETURNING` (PostgreSQL/Oracle) and `OUTPUT` (SQL Server) let you capture the rows you just changed. MySQL requires a separate `SELECT`.

---

## ❓ Quiz

Test your understanding before moving to the next chapter.

**Question 1**

You run the following statement on your production orders table:

```sql
UPDATE orders SET status = 'cancelled';
```

What happens, and how should this have been written?

<details>
<summary>Show answer</summary>

Every single row in the `orders` table is updated to `status = 'cancelled'` — regardless of its current state. This is almost certainly not what was intended. The correct form requires a `WHERE` clause to target only specific rows, for example:

```sql
UPDATE orders
SET    status = 'cancelled'
WHERE  order_id = 505;
```

Always verify the affected rows with a `SELECT` using the same `WHERE` condition before running an UPDATE or DELETE.

</details>

---

**Question 2**

What is the difference between `DELETE FROM orders;` and `TRUNCATE TABLE orders;`? When would you choose one over the other?

<details>
<summary>Show answer</summary>

- `DELETE FROM orders;` removes rows one by one, logs each deletion, fires triggers, and can be rolled back inside a transaction. It is slow on large tables but supports a `WHERE` clause.
- `TRUNCATE TABLE orders;` removes all rows at once with minimal logging, resets identity/auto-increment counters, and is much faster. It cannot be rolled back in MySQL and does not fire row-level triggers.

**Choose `DELETE`** when you need to remove specific rows, need trigger support, or might need to roll back.  
**Choose `TRUNCATE`** only when you want to completely empty an entire table (e.g., a staging table between ETL runs) and speed matters.

</details>

---

**Question 3**

You are using PostgreSQL. You want to insert a new product, but if a product with the same `product_id` already exists, you want to update its `price` and `stock` instead. Write the SQL statement.

<details>
<summary>Show answer</summary>

```sql
INSERT INTO products (product_id, name, price, stock)
VALUES (5, 'Laptop Stand', 59.99, 100)
ON CONFLICT (product_id)
DO UPDATE SET
    price = EXCLUDED.price,
    stock = EXCLUDED.stock;
```

`EXCLUDED` refers to the row that was attempted to be inserted but conflicted. This is PostgreSQL's UPSERT syntax. MySQL would use `ON DUPLICATE KEY UPDATE`, and SQL Server / Oracle would use a `MERGE` statement.

</details>

---

## 🔜 What's Next

In Chapter 4 we will explore **Filtering, Sorting, and Aggregating** — learning to slice and summarize data with `WHERE`, `GROUP BY`, `HAVING`, and aggregate functions like `COUNT`, `SUM`, and `AVG`.

---

*Chapter 3 of the SQL from Scratch series — DML: INSERT, UPDATE, DELETE*
