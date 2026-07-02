# 📝 Chapter 3: Data Insert, Update, Delete Karna (DML)

> **Level:** Beginner | **Padhne ka time:** ~25 minutes  
> **Prerequisites:** Chapter 1 (SQL Basics), Chapter 2 (SELECT queries)

---

## 🗺️ Is Chapter Mein Kya Seekhoge?

Data Manipulation Language (DML) SQL ka woh hissa hai jisse tum database ke andar ka data **change** kar sakte ho. `SELECT` sirf data padhta hai, lekin DML usse likhta hai — insert karta hai, update karta hai, delete karta hai. Chapter khatam hone tak tum yeh sab kar paoge:

- `INSERT INTO` se naye rows add karna
- `UPDATE` se existing rows modify karna
- `DELETE` aur `TRUNCATE` se rows remove karna
- "Insert karo ya update karo" wala scenario handle karna — UPSERT
- Jo rows abhi change kiye, unhe wapas `RETURNING` / `OUTPUT` se le aana
- Sabse bada SQL disaster jo ek developer kar sakta hai, uss se bachna

---

## 🏪 Hamara Running Example

Poore chapter mein hum ek chhota sa e-commerce schema use karenge — socho tumhara apna mini Flipkart backend:

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

## ➕ INSERT INTO — Naye Rows Add Karna

### Single Row Insert

Kya hota hai? Sabse basic form ek baar mein exactly ek row insert karta hai. Syntax sabhi major databases mein same hai:

```sql
INSERT INTO products (product_id, name, price, stock)
VALUES (1, 'Wireless Mouse', 29.99, 150);
```

**Beginners ke liye tips:**
- Hamesha column names explicitly likho. Column order pe bharosa mat karo — kal ko koi naya column add kar de, tumhara INSERT tut jayega.
- Jo columns list nahi kiye (jaise `is_active`), unko unka `DEFAULT` value ya `NULL` mil jayega.

### Multiple Row Insert

Kyun zaruri hai? Ek hi statement mein kayi rows insert kar sakte ho — yeh ek-ek row ke liye alag INSERT chalane se kaafi zyada efficient hai:

```sql
INSERT INTO products (product_id, name, price, stock)
VALUES
    (2, 'Mechanical Keyboard', 89.99, 75),
    (3, 'USB-C Hub',           24.99, 200),
    (4, 'Monitor Stand',       49.99, 60);
```

Yeh syntax PostgreSQL, MySQL, SQL Server (2008+), aur Oracle (18c+) — sabme same tarah kaam karta hai.

---

## 📋 INSERT INTO ... SELECT — Doosre Table Se Rows Copy Karna

Kya hota hai? Tum `SELECT` statement ko `INSERT` ka source bana sakte ho. Yeh archiving, migration, ya data clone karne ke liye perfect hai:

```sql
-- Archive all completed orders into order_archive
INSERT INTO order_archive (order_id, customer_id, product_id, quantity, status, created_at)
SELECT order_id, customer_id, product_id, quantity, status, created_at
FROM   orders
WHERE  status = 'completed';
```

`SELECT` result ke columns ki count aur data types target column list se match honi chahiye. `SELECT` jitna complex chahe utna ho sakta hai — usme `JOIN`s, `WHERE` filters, computed columns, aggregations sab kuch daal sakte ho.

---

## 🔄 UPSERT — Insert Karo, Ya Agar Already Exist Kare To Update Karo

Socho ek real-world scenario: "Yeh row insert kar do, lekin agar primary key already exist karti hai, to naya row insert karne ke bajaye existing row ko update kar do." Isse **UPSERT** (update + insert) kehte hain. Har database iske liye alag approach use karta hai — bilkul waise hi jaise Swiggy aur Zomato dono food deliver karte hain lekin app ka flow alag hai.

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

`EXCLUDED` ek special table hai jo tumne jo values insert karne ki koshish ki thi, unhe hold karta hai. `ON CONFLICT DO NOTHING` bhi use kar sakte ho agar duplicate ko chupchap ignore karna ho.

### MySQL — ON DUPLICATE KEY UPDATE

```sql
-- MySQL
INSERT INTO products (product_id, name, price, stock)
VALUES (1, 'Wireless Mouse', 34.99, 200)
ON DUPLICATE KEY UPDATE
    price = VALUES(price),
    stock = VALUES(stock);
```

`VALUES(col)` uss value ko refer karta hai jo tumne INSERT mein try ki thi.

### SQL Server — MERGE Statement

SQL Server thoda verbose lekin powerful `MERGE` statement use karta hai:

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

Oracle ka `MERGE` syntax SQL Server jaisa hi hai:

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

## ✏️ UPDATE — Existing Rows Modify Karna

### Basic UPDATE

```sql
-- Raise the price of product 2 by 10%
UPDATE products
SET    price = price * 1.10
WHERE  product_id = 2;
```

### Ek Saath Multiple Columns Update Karna

```sql
-- Mark an order as shipped and record the time
UPDATE orders
SET    status     = 'shipped',
       created_at = CURRENT_TIMESTAMP
WHERE  order_id = 1042;
```

Ek `SET` clause mein jitne chahe utne columns update kar sakte ho — bas comma se separate karo.

### Subquery Ke Saath Conditional Update

```sql
-- Give a 15% discount to all products that have never been ordered
UPDATE products
SET    price = price * 0.85
WHERE  product_id NOT IN (
    SELECT DISTINCT product_id FROM orders
);
```

---

## ☠️ WHERE Clause Wali Sabse Khatarnak Galti

> **Yeh is poore chapter ki sabse important warning hai.**

`UPDATE` ya `DELETE` ko **bina `WHERE` clause ke** chalana table ke har ek row ko affect karta hai. Zyadatar production systems mein koi "undo" button nahi hota — yeh CRED pe accidentally saara balance transfer karne jaisa hai, wapas nahi aata.

```sql
-- DISASTER: updates price for ALL products, not just one
UPDATE products
SET price = 0.01;

-- CORRECT: only affects the intended row
UPDATE products
SET   price = 0.01
WHERE product_id = 7;
```

**Yeh defensive habits abhi se banao:**
1. Hamesha `WHERE` clause pehle likho, `SET` clause se pehle, aur same `WHERE` ke saath ek `SELECT` chalao yeh confirm karne ke liye ki kaunse rows affect honge.
2. Destructive statements ko transaction mein wrap karo taaki kuch galat ho to `ROLLBACK` kar sako (Chapter 5 mein cover karenge).
3. Production mein commit karne se pehle affected rows ka confirmation count maango.

```sql
-- Step 1: Check what you are about to change
SELECT * FROM products WHERE stock < 5;

-- Step 2: Only then run the UPDATE
UPDATE products
SET    is_active = FALSE
WHERE  stock < 5;
```

---

## 🔗 UPDATE with JOIN — Database Ke Hisaab Se Farak

Kabhi kabhi tumhe ek table ke rows ko doosre table ki values use karke update karna padta hai. Yahan syntax database-wise kaafi alag ho jaata hai.

**Scenario:** Jab kisi product ki price change ho, to uske pending orders ka `status` update karo yeh batane ke liye ki price update ho gayi.

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

### Oracle — Correlated Subquery (sabse portable)

Oracle `UPDATE` mein directly `FROM` ya `JOIN` support nahi karta. Correlated subquery ya `MERGE` use karo:

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

## 🗑️ DELETE FROM — Rows Remove Karna

### Basic DELETE

```sql
-- Remove a single cancelled order
DELETE FROM orders
WHERE order_id = 505;

-- Remove all orders older than 2 years
DELETE FROM orders
WHERE created_at < CURRENT_DATE - INTERVAL '2 years';
```

> **Yaad rakho:** Hamesha `WHERE` clause include karo. `DELETE FROM orders;` bina filter ke poora table saaf kar deta hai.

### Soft Delete — Ek Real-World Pattern

Kya hota hai? Zyadatar applications mein tum rows ko kabhi truly delete nahi karte — bas ek flag flip karke unhe chhupa dete ho. Isse audit history bachi rehti hai aur recovery bhi possible hoti hai — bilkul Swiggy jaise ek restaurant ko "inactive" kar dena, delete nahi karna:

```sql
-- Instead of hard-deleting, mark as inactive
UPDATE products
SET    is_active = FALSE
WHERE  product_id = 9;

-- Your SELECT queries then always filter active products
SELECT * FROM products WHERE is_active = TRUE;
```

Isko **soft delete** kehte hain aur virtually har serious production application isi pattern ko use karti hai.

### DELETE with JOIN

Ek table ke rows delete karna, doosre table ki condition ke basis pe.

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

Dono rows remove karte hain, lekin behave bahut alag tarike se karte hain.

| Feature | `DELETE` | `TRUNCATE` |
|---|---|---|
| Rows kaise remove hote hain | Ek-ek karke (logged) | Sab ek saath (minimally logged) |
| Bade tables pe speed | Slow | Bahut fast |
| WHERE clause | Supported | Not supported |
| AUTO_INCREMENT / IDENTITY reset | Nahi | Haan (usually) |
| Rollback ho sakta hai | Haan (transaction ke andar) | Depends on DB* |
| Row-level triggers fire hote hain | Haan | Usually nahi |
| FK reference wale tables truncate ho sakte hain | Nahi | Nahi (pehle FK disable karna padega) |

*PostgreSQL aur SQL Server `TRUNCATE` ko transaction ke andar allow karte hain. MySQL nahi karta — woh auto-commit kar deta hai.

```sql
-- Wipe ALL rows from the table and reset the identity counter
TRUNCATE TABLE order_archive;
```

**Rule of thumb:** `TRUNCATE` sirf tab use karo jab tum jaan-boojh kar poora table khali karna chahte ho — jaise staging ya temp table ko ETL runs ke beech mein clear karna. Baaki har cheez ke liye `DELETE` use karo.

---

## 🔁 RETURNING / OUTPUT — Changed Rows Wapas Paana

Kyun zaruri hai? Ek powerful feature: rows insert, update, ya delete karne ke baad, aksar tumhe pata hona chahiye ki kaunse rows affect hue — jaise naya generated ID lena, ya jo delete hua uska log rakhna.

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

SQL Server `OUTPUT` use karta hai aur do pseudo-tables expose karta hai: `INSERTED` (naya values) aur `DELETED` (purana values):

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

### MySQL — Native RETURNING Nahi Hai

MySQL mein `RETURNING` clause nahi hota. Common workarounds:

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

### Example 1: E-Commerce Order Process Karna

Socho tum apna khud ka mini Amazon/Flipkart order flow bana rahe ho:

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

### Example 2: Pricing Table Se Bulk Price Update

```sql
-- A separate table holds the new prices approved by the pricing team
-- pricing_updates (product_id, new_price)

-- PostgreSQL
UPDATE products AS p
SET    price = pu.new_price
FROM   pricing_updates AS pu
WHERE  p.product_id = pu.product_id;
```

### Example 3: Discontinued Products Ko Soft Delete Karo Aur Unke Orders Archive Karo

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

- `INSERT INTO ... VALUES (...)` naye rows add karta hai. Column names explicitly likho — kabhi bhi column order pe bharosa mat karo.
- `INSERT INTO ... SELECT ...` doosre table ya query result se rows copy karta hai.
- UPSERT syntax har database mein alag hai: `ON CONFLICT` (PostgreSQL), `ON DUPLICATE KEY UPDATE` (MySQL), `MERGE` (SQL Server, Oracle).
- `UPDATE` existing rows modify karta hai. **Hamesha `WHERE` clause include karo, jab tak tum genuinely har row update nahi karna chahte.**
- `UPDATE ... FROM / JOIN` tumhe doosre table ke data se update karne deta hai — syntax database ke hisaab se badalta hai.
- `DELETE FROM` rows remove karta hai. **Hamesha `WHERE` clause include karo.** Real applications mein soft deletes (flag column) prefer karo.
- `TRUNCATE` saare rows instantly hata deta hai, identity counters reset kar deta hai, aur hamesha rollback nahi ho sakta — sirf poora table wipe karne ke liye use karo (staging/temp tables).
- `RETURNING` (PostgreSQL/Oracle) aur `OUTPUT` (SQL Server) tumhe abhi change kiye gaye rows capture karne dete hain. MySQL mein alag `SELECT` chalana padta hai.

---

## ❓ Quiz

Agle chapter pe jaane se pehle apni understanding test kar lo.

**Question 1**

Tumne apne production orders table pe yeh statement chala diya:

```sql
UPDATE orders SET status = 'cancelled';
```

Kya hoga, aur yeh sahi tarike se kaise likha jaana chahiye tha?

<details>
<summary>Show answer</summary>

`orders` table ka har ek row `status = 'cancelled'` mein update ho jayega — chahe uska current state kuch bhi ho. Yeh almost certainly intended nahi tha. Sahi form mein `WHERE` clause honi chahiye jo sirf specific rows ko target kare, jaise:

```sql
UPDATE orders
SET    status = 'cancelled'
WHERE  order_id = 505;
```

Hamesha UPDATE ya DELETE chalane se pehle same `WHERE` condition ke saath ek `SELECT` chala kar affected rows verify kar lo.

</details>

---

**Question 2**

`DELETE FROM orders;` aur `TRUNCATE TABLE orders;` mein kya farak hai? Kab kaunsa use karoge?

<details>
<summary>Show answer</summary>

- `DELETE FROM orders;` rows ko ek-ek karke remove karta hai, har deletion log karta hai, triggers fire karta hai, aur transaction ke andar rollback ho sakta hai. Bade tables pe slow hai lekin `WHERE` clause support karta hai.
- `TRUNCATE TABLE orders;` saare rows ek saath minimal logging ke saath remove kar deta hai, identity/auto-increment counters reset kar deta hai, aur kaafi zyada fast hai. MySQL mein yeh rollback nahi ho sakta aur row-level triggers fire nahi karta.

**`DELETE` choose karo** jab specific rows remove karne hon, trigger support chahiye ho, ya rollback ki zaroorat pad sakti ho.  
**`TRUNCATE` choose karo** sirf tab jab poora table completely empty karna ho (jaise ETL runs ke beech staging table) aur speed matter karti ho.

</details>

---

**Question 3**

Tum PostgreSQL use kar rahe ho. Tumhe naya product insert karna hai, lekin agar same `product_id` wala product already exist karta hai, to uska `price` aur `stock` update karna hai instead. SQL statement likho.

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

`EXCLUDED` uss row ko refer karta hai jo insert karne ki koshish ki gayi thi lekin conflict ho gayi. Yeh PostgreSQL ka UPSERT syntax hai. MySQL `ON DUPLICATE KEY UPDATE` use karega, aur SQL Server / Oracle `MERGE` statement use karenge.

</details>

---

## 🔜 Aage Kya Hai

Chapter 4 mein hum explore karenge **Filtering, Sorting, aur Aggregating** — `WHERE`, `GROUP BY`, `HAVING`, aur `COUNT`, `SUM`, `AVG` jaise aggregate functions se data ko slice aur summarize karna seekhenge.

---

*Chapter 3 of the SQL from Scratch series — DML: INSERT, UPDATE, DELETE*
