# 👁️ Views, Stored Procedures, aur Functions

> **Chapter 9** — SQL for Beginners Series

---

## 📋 Table of Contents

1. [Views Kya Hote Hain?](#1-views-kya-hote-hain)
2. [View Banana, Query Karna, aur Drop Karna](#2-view-banana-query-karna-aur-drop-karna)
3. [Updatable Views](#3-updatable-views)
4. [WITH CHECK OPTION](#4-with-check-option)
5. [Materialized Views](#5-materialized-views)
6. [Stored Procedures Kya Hote Hain?](#6-stored-procedures-kya-hote-hain)
7. [Har Database Mein Stored Procedure Syntax](#7-har-database-mein-stored-procedure-syntax)
8. [IN, OUT, aur INOUT Parameters](#8-in-out-aur-inout-parameters)
9. [Stored Procedures Ko Call Karna](#9-stored-procedures-ko-call-karna)
10. [User-Defined Functions (UDFs)](#10-user-defined-functions-udfs)
11. [Chaaron Databases Mein Same Example](#11-chaaron-databases-mein-same-example)
12. [Procedures vs Application Code — Kab Kya Use Karein](#12-procedures-vs-application-code--kab-kya-use-karein)
13. [Key Takeaways](#key-takeaways)
14. [Quiz](#quiz)

---

## 1. 👁️ Views Kya Hote Hain?

Socho tumne ek complicated SELECT query likhi — kaafi JOINs, kaafi conditions — aur ab har baar wahi query baar-baar type karna padta hai. Boring hai na? Yahin pe **view** kaam aata hai.

Ek **view** basically ek saved SELECT query hai jisko database ek table ki tarah treat karta hai. Ek naam de do apni query ko, aur uske baad tum usse bilkul table jaise query kar sakte ho — jaise data wahin store ho, jab ki asal mein (normal views ke case mein) alag se koi data store nahi hota.

View ko socho ek **khidki (window)** ki tarah:

- Underlying tables mein asli data padha hai.
- View sirf ek khidki hai — jab bhi tum us khidki se dekhoge, data ka ek particular arrangement dikhega.

### Views kyun use karte hain?

| Reason | Explanation |
|--------|-------------|
| **Simplicity** | Complex JOINs ko ek clean naam ke peeche chhupa do |
| **Security** | Sirf kuch columns hi certain users ko dikhao |
| **Consistency** | Ek business concept (jaise "active users") ki ek hi definition sabke liye |
| **Abstraction** | Underlying table structure change karo bina application queries todhe |

Maan lo tumhare paas `users` aur `posts` tables hain, aur tum baar-baar inko join karte ho. Har baar wahi JOIN likhne ki jagah, ek view bana do jiska naam ho `user_post_summary` — bas.

---

## 2. 🔧 View Banana, Query Karna, aur Drop Karna

Core syntax sabhi major databases mein same hai — yahan koi drama nahi.

```sql
-- View banao
CREATE VIEW view_name AS
SELECT column1, column2, ...
FROM table_name
WHERE condition;

-- View ko query karo (bilkul table jaisa)
SELECT * FROM view_name;
SELECT column1 FROM view_name WHERE condition;

-- View drop karo
DROP VIEW view_name;

-- View definition replace/update karo (recreate karke)
CREATE OR REPLACE VIEW view_name AS
SELECT ...;
```

> **Note:** `CREATE OR REPLACE VIEW` PostgreSQL, MySQL, aur Oracle mein chalta hai.
> SQL Server mein `ALTER VIEW view_name AS SELECT ...;` use karo.

### Practical example

Socho Zomato jaisi app hai — `users` aur `posts` (yaani reviews) tables hain, aur tumhe baar-baar active users ke posts dekhne hain.

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

-- Ab isko kahin bhi use karo
SELECT user_name, COUNT(post_id) AS total_posts
FROM active_user_posts
GROUP BY user_name
ORDER BY total_posts DESC;
```

Har baar jab ye SELECT chalta hai, database underlying JOIN ko fresh execute karta hai — matlab tumhe hamesha current, live data hi dikhega.

---

## 3. ✏️ Updatable Views

Kya hota hai? Kabhi-kabhi tum view pe directly `INSERT`, `UPDATE`, ya `DELETE` chala sakte ho, aur change underlying table tak pahunch jaata hai. Ye tab hi kaam karta hai jab view in saari conditions ko follow kare:

- Woh sirf **ek hi base table** se select karta ho.
- `DISTINCT`, `GROUP BY`, `HAVING`, `UNION`, ya aggregate functions use na kare.
- SELECT list mein subqueries na ho.
- Base table ke `NOT NULL` constraints satisfy karne ke liye kaafi columns include kare.

```sql
CREATE VIEW active_users AS
SELECT id, name, email
FROM users
WHERE is_active = 1;

-- Ye UPDATE seedhe users table tak pahunch jaata hai
UPDATE active_users
SET name = 'Alice Smith'
WHERE id = 42;

-- Ye INSERT bhi users table mein directly row add karta hai
INSERT INTO active_users (id, name, email)
VALUES (99, 'Bob Jones', 'bob@example.com');
```

Jab view **updatable nahi** hota (complex JOINs, aggregates, waghera), toh database error de deta hai agar tum uske through likhne ki koshish karo. Us case mein `INSTEAD OF` triggers use karo (SQL Server / Oracle) taaki non-updatable view pe writes ko intercept kiya ja sake.

---

## 4. ✅ WITH CHECK OPTION

`WITH CHECK OPTION` ek safety guard hai updatable views pe. Ye kisi bhi INSERT ya UPDATE ko reject kar deta hai jo naye row ko view ke apne WHERE clause se invisible bana de.

Socho CRED jaisi app mein sirf "VIP" users hi dikhne chahiye ek particular list mein — agar koi unhe "Standard" mein downgrade kar de, toh woh list se gayab ho jaana chahiye, aur `WITH CHECK OPTION` isi ko enforce karta hai — silently gayab hone ki jagah error deke rok deta hai.

```sql
CREATE VIEW active_users AS
SELECT id, name, email, is_active
FROM users
WHERE is_active = 1
WITH CHECK OPTION;

-- Ye fail hoga: insert kiya gaya row is_active = 0 rakhta hai,
-- toh woh turant view se gayab ho jaata — CHECK isko rokta hai.
INSERT INTO active_users (id, name, email, is_active)
VALUES (100, 'Ghost User', 'ghost@example.com', 0);
-- ERROR: new row violates check option for view "active_users"
```

Ye especially useful hai jab views ka use business rules enforce karne ke liye ho raha ho (jaise "sirf active users hi is interface se edit ho sakte hain").

---

## 5. 🗄️ Materialized Views

**Kyun zaruri hai?** Normal view har baar apni query fresh se recalculate karta hai. Ek **materialized view** result ko pre-compute karke disk pe physically store kar leta hai — jaise ek cached snapshot. Isliye queries fast chalti hain kyunki query time pe koi JOIN ya aggregation nahi chalta; tum snapshot ko schedule pe ya on-demand refresh karte ho.

Concept sab jagah same hai, lekin syntax aur feature set kaafi alag hai:

### PostgreSQL

```sql
-- Create
CREATE MATERIALIZED VIEW monthly_sales AS
SELECT
    DATE_TRUNC('month', order_date) AS month,
    SUM(amount)                      AS total_sales
FROM orders
GROUP BY 1;

-- Query (ye snapshot padhta hai, live data nahi)
SELECT * FROM monthly_sales;

-- Snapshot ko manually refresh karo
REFRESH MATERIALIZED VIEW monthly_sales;

-- Bina reads lock kiye refresh karo (PostgreSQL 9.4+)
REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_sales;

-- Drop
DROP MATERIALIZED VIEW monthly_sales;
```

### MySQL

MySQL mein native materialized views nahi hote. Common workaround hai — ek normal table plus ek scheduled event.

```sql
-- Step 1: Pre-computed data rakhne ke liye ek plain table banao
CREATE TABLE monthly_sales_cache (
    month        DATE,
    total_sales  DECIMAL(15,2)
);

-- Step 2: Isko refresh karne ke liye stored procedure banao
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

-- Step 3: Har raat midnight pe automatic refresh schedule karo
CREATE EVENT refresh_sales_cache
ON SCHEDULE EVERY 1 DAY STARTS '2026-01-01 00:00:00'
DO CALL refresh_monthly_sales();
```

### SQL Server — Indexed Views

SQL Server inko **Indexed Views** bolta hai. Tum ek normal view banao `SCHEMABINDING` ke saath, phir ek unique clustered index add karo, jo database ko result materialize karke automatically maintain karne pe majboor kar deta hai.

```sql
-- View mein SCHEMABINDING zaruri hai
CREATE VIEW dbo.monthly_sales
WITH SCHEMABINDING AS
SELECT
    DATEFROMPARTS(YEAR(order_date), MONTH(order_date), 1) AS month,
    SUM(amount)   AS total_sales,
    COUNT_BIG(*)  AS row_count    -- indexed views ke liye zaruri hai
FROM dbo.orders
GROUP BY DATEFROMPARTS(YEAR(order_date), MONTH(order_date), 1);

-- Ye index add karne se view materialize ho jaata hai
CREATE UNIQUE CLUSTERED INDEX IX_monthly_sales
ON dbo.monthly_sales (month);
```

SQL Server materialized data ko automatically update kar deta hai jab bhi base table change hoti hai — manual REFRESH step ki zarurat hi nahi.

### Oracle

```sql
-- Commit hote hi automatic refresh ke saath create karo
CREATE MATERIALIZED VIEW monthly_sales
REFRESH FAST ON COMMIT AS
SELECT
    TRUNC(order_date, 'MM') AS month,
    SUM(amount)             AS total_sales
FROM orders
GROUP BY TRUNC(order_date, 'MM');

-- Ya schedule pe refresh karo (har din complete refresh)
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

### Materialized Views — Quick Comparison

| Feature | PostgreSQL | MySQL | SQL Server | Oracle |
|---------|-----------|-------|------------|--------|
| Native support | Haan | Nahi | Indexed Views | Haan |
| Manual refresh | `REFRESH MATERIALIZED VIEW` | `CALL procedure` | N/A (auto) | `DBMS_MVIEW.REFRESH` |
| Auto refresh | Nahi (pg_cron use karo) | Events ke through | Haan (auto) | Haan (commit / schedule pe) |
| Refresh ke dauran concurrent reads | Haan (`CONCURRENTLY`) | Hamesha | Hamesha | Haan |

---

## 6. 📦 Stored Procedures Kya Hote Hain?

Ek **stored procedure** SQL logic ka ek naamed block hai jo database ke andar hi save hota hai. Application se multiple SQL statements network pe bhejne ki jagah, tum bas ek procedure ka naam call karte ho aur database engine saara logic server-side hi run kar deta hai.

**Kyun zaruri hai?**

- **Performance** — logic data ke paas hi chalta hai; network round-trips kam hote hain.
- **Reusability** — ek baar likho, kisi bhi application ya user se call karo.
- **Security** — procedure pe `EXECUTE` grant karo, direct table access diye bina.
- **Encapsulation** — business rules ek jagah rehte hain, applications mein bikhre hue nahi.

Socho IRCTC jaisa system — ticket booking ka poora logic (seat check, payment, confirmation) ek stored procedure mein hai, aur website, mobile app, aur agent portal — teeno usi ek procedure ko call karte hain. Logic ek jagah, use kahin se bhi.

---

## 7. 🗃️ Har Database Mein Stored Procedure Syntax

Yahan pe databases sabse zyada alag ho jaate hain. Har ek ki apni procedural language aur syntax rules hain.

### PostgreSQL — `CREATE FUNCTION` with PL/pgSQL

PostgreSQL `CREATE FUNCTION` ka use karta hai functions aur procedures dono ke liye (procedures PG 11 mein `CREATE PROCEDURE` ke through aaye, lekin `VOID` return type wale functions traditional approach the).

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

-- Call karo
SELECT greet_user('Alice');
```

### MySQL — `CREATE PROCEDURE` with `DELIMITER`

MySQL `DELIMITER` use karta hai statement terminator ko temporarily change karne ke liye, kyunki procedure body mein semicolons hote hain jo warna `CREATE` statement ko jaldi khatam kar dete.

```sql
-- MySQL
DELIMITER //
CREATE PROCEDURE greet_user(IN p_name VARCHAR(100))
BEGIN
    SELECT CONCAT('Hello, ', p_name, '!') AS greeting;
END //
DELIMITER ;

-- Call karo
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

-- Call karo
EXEC greet_user @p_name = 'Alice';
-- ya: EXECUTE greet_user 'Alice';
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

-- Call karo
EXEC greet_user('Alice');
-- ya PL/SQL block ke andar:
BEGIN
    greet_user('Alice');
END;
/
```

---

## 8. 🔄 IN, OUT, aur INOUT Parameters

Saare major databases teen parameter modes support karte hain:

| Mode | Direction | Description |
|------|-----------|-------------|
| `IN` | Caller → Procedure | Read-only input value (zyada databases mein default) |
| `OUT` | Procedure → Caller | Procedure result wapas likh deta hai |
| `INOUT` | Dono taraf | Caller value pass karta hai; procedure usko modify karke return kar sakta hai |

```sql
-- PostgreSQL example — OUT parameter ke saath
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
-- MySQL example — OUT parameter ke saath
DELIMITER //
CREATE PROCEDURE get_user_count(OUT p_count INT)
BEGIN
    SELECT COUNT(*) INTO p_count FROM users;
END //
DELIMITER ;

CALL get_user_count(@total);
SELECT @total;   -- OUT value ko session variable se padho
```

```sql
-- SQL Server example — OUTPUT parameter ke saath
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
-- Oracle example — OUT parameter ke saath
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

## 9. 📞 Stored Procedures Ko Call Karna

| Database | Keyword | Example |
|----------|---------|---------|
| PostgreSQL | `SELECT` (functions ke liye) / `CALL` (PG 11+ procedures) | `CALL my_proc(arg);` ya `SELECT my_func(arg);` |
| MySQL | `CALL` | `CALL my_proc(arg);` |
| SQL Server | `EXEC` ya `EXECUTE` | `EXEC my_proc @param = val;` |
| Oracle | `EXEC` (SQL*Plus) / `BEGIN...END` block | `EXEC my_proc(arg);` |

---

## 10. ⚙️ User-Defined Functions (UDFs)

Stored procedures ke ulat, **functions** ko hamesha ek value return karni hoti hai aur inko directly SQL expressions ke andar use kiya ja sakta hai (`SELECT`, `WHERE`, `JOIN ON`, waghera). Procedures ye nahi kar sakte.

### Scalar Functions — ek single value return karte hain

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

### Table-Valued Functions — ek pura result set return karte hain (PostgreSQL aur SQL Server)

Ye functions ek single scalar value nahi, balki rows ka pura table return karte hain. Complex queries ko encapsulate karke inline reuse karne ke liye ye kaafi powerful hain.

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

-- Table jaisa use karo
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

-- Table jaisa use karo
SELECT * FROM dbo.users_in_country('Canada');
```

> MySQL aur Oracle bhi table-valued functions support karte hain, par thode zyada verbose syntax ke saath (Oracle mein pipelined functions, MySQL mein temporary tables) — is wajah se in platforms pe ye kam common hain.

---

## 11. 🔁 Chaaron Databases Mein Same Example

**Goal:** Ek reusable routine jo ek user ID leta hai aur us user ka naam plus uske total posts ka count return karta hai.

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

-- Ya, stored procedure ki tarah:
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
-- Oracle: SYS_REFCURSOR return karne wala function
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

-- Usage (application ya PL/SQL block se)
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

## 12. ⚖️ Procedures vs Application Code — Kab Kya Use Karein

Backend development mein ye sabse zyada debate ho ne wala topic hai. Chalo ek practical breakdown karte hain.

### Stored procedures ya functions kab use karein:

| Situation | Kyun help karta hai |
|-----------|-------------|
| **Batch data processing** | Lakhon rows ko DB ke andar process karna network pe saara data bhejne se bachata hai |
| **Business rules centrally enforce karna** | Multiple apps (web, mobile, batch) sab ek hi canonical implementation share karte hain |
| **Fine-grained security** | Procedure pe `EXECUTE` grant karo; table pe direct `SELECT/UPDATE` deny karo |
| **Complex multi-step transactions** | Saare steps ek hi DB session ke andar atomic rakhna |
| **Reporting aur scheduled jobs** | DB-native scheduling (MySQL Events, Oracle DBMS_SCHEDULER) naturally fit hoti hai |

### Application code kab use karein:

| Situation | Kyun help karta hai |
|-----------|-------------|
| **Rapid iteration** | Python/Node/Java mein change deploy karna schema migration se aasan hai |
| **Version control aur code review** | Stored procedures ko diff aur review karna application code se zyada mushkil hai |
| **Unit testing** | Application logic ko isolation mein test karna kaafi aasan hai |
| **External services wala logic** | API call karna, email bhejna, file padhna — ye SQL ke andar possible nahi |
| **Complex conditional flows** | Modern languages branching, loops, aur error handling ko zyada cleanly handle karti hain |
| **Team expertise** | Zyada tar backend developers apni app language mein zyada comfortable hote hain |

**Rule of thumb:** SQL ko database mein rakho uske liye jisme SQL best hai — set-based data operations. Business logic ko application mein rakho uske liye jisme programming languages best hain — control flow, external integrations, aur testability.

Socho Swiggy jaisa system: order place hote hi inventory deduct karna aur transaction log karna — ye pure set-based operation hai, isliye ek stored procedure mein achha fit baithta hai. Par restaurant ko notify karna ya SMS bhejna — ye application layer ka kaam hai, kyunki SQL external APIs ko call nahi kar sakta.

---

## 🔑 Key Takeaways

- **View** ek named SELECT query hai jo database mein store hoti hai. Ye table jaisa behave karta hai lekin har baar query karne pe live data padhta hai.
- Views **updatable** ho sakte hain (writes underlying table tak pahunchte hain) jab woh kaafi simple ho — koi JOINs, aggregates, ya DISTINCT nahi.
- `WITH CHECK OPTION` un inserts ya updates ko rokta hai jo row ko view ke apne filter se invisible bana dein.
- **Materialized views** query result ko physically store karte hain fast reads ke liye. PostgreSQL aur Oracle inhe natively support karte hain; SQL Server Indexed Views use karta hai; MySQL ko manual workaround chahiye.
- **Stored procedures** server-side logic ko ek naam ke saath save karte hain. Inka syntax kaafi alag hota hai: PostgreSQL PL/pgSQL use karta hai, MySQL `DELIMITER` use karta hai, SQL Server T-SQL use karta hai, aur Oracle PL/SQL use karta hai.
- Parameters teen modes mein aate hain: `IN` (input), `OUT` (output), aur `INOUT` (dono). SQL Server `OUT` ki jagah `OUTPUT` keyword use karta hai.
- **User-defined functions** ko value return karni hi hoti hai aur inhe SQL expressions ke andar embed kiya ja sakta hai. Scalar functions ek value return karte hain; table-valued functions rows return karte hain.
- Stored procedures use karo batch operations, security boundaries, aur multi-app shared logic ke liye. Application code use karo us business logic ke liye jisko version control, testing, aur external integrations se fayda ho.

---

## 📝 Quiz

Aage badhne se pehle apni understanding check kar lo.

**Question 1**

Tumne ye view banaya:

```sql
CREATE VIEW vip_users AS
SELECT id, name, email, spending_tier
FROM users
WHERE spending_tier = 'VIP'
WITH CHECK OPTION;
```

Ek developer ye chalata hai:

```sql
UPDATE vip_users SET spending_tier = 'Standard' WHERE id = 7;
```

Kya hoga, aur kyun?

<details>
<summary>Answer</summary>

UPDATE **reject** ho jaayega ek error ke saath. `WITH CHECK OPTION` clause kisi bhi aisi modification ko rokta hai jo updated row ko view ke `WHERE spending_tier = 'VIP'` condition se bahar nikal de. Update ke baad, row ka `spending_tier = 'Standard'` ho jaayega, matlab woh view se gayab ho jaayega — aur yehi exactly hai jo `WITH CHECK OPTION` rokne ke liye design kiya gaya hai.

</details>

---

**Question 2**

Tumhari team ye discuss kar rahi hai ki ye logic kahan rakha jaaye: "Jab user order place kare, inventory se item quantity deduct karo aur transaction log karo." Kya ye stored procedure mein jaana chahiye ya application layer mein? Decision lete waqt kaunse factors dhyan mein rakhne chahiye?

<details>
<summary>Answer</summary>

Iska koi single right answer nahi hai, lekin key factors ye hain:

- **Stored procedure ke favor mein:** Ye logic purely set-based hai (UPDATE inventory, INSERT log). Isko ek single DB transaction ke andar atomicity ka fayda milta hai. Agar multiple applications (web, mobile app, batch importer) sab orders place karte hain, toh logic ko ek procedure mein centralize karna duplication rokta hai.
- **Application layer ke favor mein:** Agar tumhe external services call karni hain (jaise warehouse API ko notify karna, confirmation email bhejna), toh stored procedure ye nahi kar sakta. Application code unit-test, version-control, aur incrementally deploy karna bhi zyada aasan hai.

Ek common real-world compromise: data mutation (inventory deduct + log) ko application layer ke transaction mein handle karo, aur asal SQL work ke liye potentially ek stored procedure call karo, jab ki orchestration aur external calls application code mein hi rakho.

</details>

---

**Question 3**

Tumhe ek fast summary report chahiye jo har product category ka total sales dikhaye, jise hazaron baar per hour query kiya jaata hai. Underlying sales data sirf ek baar per hour change hota hai (batch import). Kaunsa database object best fit hai, aur PostgreSQL mein isko kaise set up karoge?

<details>
<summary>Answer</summary>

**Materialized view** yahan best fit hai. Kyunki data sirf ek baar per hour change hota hai, har query pe aggregation re-run karne ki zarurat nahi. Pre-computed result store karo aur har batch import ke baad refresh kar do.

```sql
-- Materialized view banao
CREATE MATERIALIZED VIEW category_sales_summary AS
SELECT
    p.category,
    SUM(oi.quantity * oi.unit_price) AS total_sales
FROM order_items oi
JOIN products p ON p.id = oi.product_id
GROUP BY p.category;

-- Har hourly batch import ke baad, isko refresh karo:
REFRESH MATERIALIZED VIEW CONCURRENTLY category_sales_summary;

-- Ab saari report queries snapshot pe hit karengi, raw tables pe nahi:
SELECT * FROM category_sales_summary ORDER BY total_sales DESC;
```

`CONCURRENTLY` reads ko refresh ke dauran bhi chalne deta hai (iske liye materialized view pe ek unique index chahiye).

</details>

---

*Next Chapter: Transactions and Concurrency Control →*
