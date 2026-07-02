# Chapter 17: PostgreSQL vs MySQL vs SQL Server vs Oracle — Poori Comparison

> Yeh woh reference guide hai jo tum bookmark karoge, print karoge, aur desk pe rakhoge.

SQL ek standard hai — lekin har database engine apni khud ki dialect bolta hai. Bilkul waise hi jaise Hindi, Marathi aur Bengali sab Devanagari-family languages hain but ek doosre se alag bolte hain. Is chapter mein hum chaaron major relational databases ke har important feature ko side-by-side rakhenge, taaki tumhe hamesha pata ho ki kaunsa syntax kis system mein use karna hai.

---

## 1. Overview & Kaun Use Karta Hai

| | PostgreSQL | MySQL | SQL Server | Oracle DB |
|---|---|---|---|---|
| **License** | Open source (PostgreSQL License) | Open source (GPL) + commercial | Commercial (Microsoft) | Commercial (Oracle) |
| **Cost** | Free | Free community edition | ~$900/core se shuru | ~$17,500/processor se shuru |
| **Primary Vendor** | PostgreSQL Global Dev Group | Oracle (2010 mein acquire kiya) | Microsoft | Oracle |
| **Best Known For** | Correctness, extensibility, JSON, PostGIS | Speed, ubiquity, simplicity | Windows/.NET integration | Enterprise power, financial sector |
| **Famous Users** | Instagram, Apple, Twitch, Gitlab | Facebook (early), Twitter (early), WordPress | Stack Overflow, Dell | Banks, airlines, SAP |
| **OS** | Linux, macOS, Windows | Linux, macOS, Windows | Windows-first, Linux (2017+) | Linux, Windows, Solaris |
| **ACID Compliant** | ✅ Full | ✅ (sirf InnoDB) | ✅ Full | ✅ Full |
| **Standout Feature** | Extensible types, PostGIS, JSONB | Fastest simple reads, ecosystem size | SSMS tooling, T-SQL, Azure | Partitioning, RAC, PL/SQL |

### Kaunsa database kab choose karein?

Socho ek second — agar tumse koi puchhe "Zomato banau ya Swiggy jaisa app, konsa database lagau?" Jawab depend karta hai tumhare use-case pe:

- **PostgreSQL** — Speed se zyada correctness chahiye, Linux/cloud pe ho, GIS/full-text/JSONB chahiye, ya kuch bhi greenfield (naya) bana rahe ho. Yeh aaj-kal ka default choice hai — jaise UPI aaj default payment method ban gaya hai.
- **MySQL** — LAMP/LEMP stack chala rahe ho, simple queries pe maximum read throughput chahiye, ya poori team already jaanti hai isko.
- **SQL Server** — Tumhari company .NET, Windows Server, Active Directory, Azure, ya SSRS/SSAS reporting pe chalti hai.
- **Oracle DB** — Heavily regulated industry mein ho (banking, insurance, government), Oracle RAC clustering chahiye, ya legacy Oracle system migrate kar rahe ho.

---

## 2. Data Types — Side-by-Side

| Concept | PostgreSQL | MySQL | SQL Server | Oracle |
|---|---|---|---|---|
| Integer (small) | `SMALLINT` | `SMALLINT` / `TINYINT` | `SMALLINT` / `TINYINT` | `NUMBER(5)` |
| Integer (standard) | `INTEGER` / `INT` | `INT` | `INT` | `NUMBER(10)` |
| Integer (big) | `BIGINT` | `BIGINT` | `BIGINT` | `NUMBER(19)` |
| Auto-increment int | `SERIAL` / `BIGSERIAL` | `INT AUTO_INCREMENT` | `INT IDENTITY` | `NUMBER` + `SEQUENCE` |
| Decimal/Numeric | `NUMERIC(p,s)` | `DECIMAL(p,s)` | `DECIMAL(p,s)` / `NUMERIC` | `NUMBER(p,s)` |
| Float | `REAL` / `DOUBLE PRECISION` | `FLOAT` / `DOUBLE` | `FLOAT` / `REAL` | `BINARY_FLOAT` / `BINARY_DOUBLE` |
| Money | `MONEY` | — | `MONEY` / `SMALLMONEY` | `NUMBER(19,4)` |
| Fixed-length string | `CHAR(n)` | `CHAR(n)` | `CHAR(n)` | `CHAR(n)` |
| Variable string | `VARCHAR(n)` | `VARCHAR(n)` | `VARCHAR(n)` | `VARCHAR2(n)` |
| Unlimited text | `TEXT` | `TEXT` / `LONGTEXT` | `VARCHAR(MAX)` | `CLOB` |
| Binary data | `BYTEA` | `BLOB` / `LONGBLOB` | `VARBINARY(MAX)` | `BLOB` / `RAW` |
| Boolean | `BOOLEAN` | `TINYINT(1)` (native bool nahi) | `BIT` | `NUMBER(1)` (native bool nahi) |
| Date only | `DATE` | `DATE` | `DATE` | `DATE` (time bhi include hai!) |
| Time only | `TIME` | `TIME` | `TIME` | — |
| Date + Time | `TIMESTAMP` | `DATETIME` / `TIMESTAMP` | `DATETIME` / `DATETIME2` | `TIMESTAMP` |
| Date + Time + TZ | `TIMESTAMPTZ` | — | `DATETIMEOFFSET` | `TIMESTAMP WITH TIME ZONE` |
| Interval | `INTERVAL` | — | `DATEDIFF` ka result hi | `INTERVAL` |
| UUID | `UUID` | `CHAR(36)` / `BINARY(16)` | `UNIQUEIDENTIFIER` | `RAW(16)` |
| JSON | `JSON` / `JSONB` | `JSON` | `NVARCHAR` + JSON funcs | `CLOB` + JSON funcs (21c native) |
| Array | `INTEGER[]`, `TEXT[]`, etc. | — | — | — |
| Enum | `CREATE TYPE ... AS ENUM` | `ENUM('a','b')` | — | — |
| IP Address | `INET` / `CIDR` | — | — | — |
| Geometric/GIS | `POINT`, `POLYGON`, PostGIS | — | `GEOMETRY` / `GEOGRAPHY` | `SDO_GEOMETRY` |
| XML | `XML` | — | `XML` | `XMLTYPE` |

> **Sabse bada gotcha:** Oracle ka `DATE` date AUR time dono store karta hai (second tak). Kabhi bhi assume mat karo ki yeh sirf date hai — warna production mein subah 3 baje bug milega.
> **MySQL boolean:** Native BOOLEAN type hai hi nahi — `TINYINT(1)` use hota hai, jahan 0=false, 1=true hota hai.

---

## 3. Auto-Increment / Identity Column

Kya hota hai? Har table mein ek unique ID chahiye hoti hai — jaise Swiggy order ID, jo automatically badhti jaati hai. Har database iska naam aur syntax alag rakhta hai.

| | PostgreSQL | MySQL | SQL Server | Oracle |
|---|---|---|---|---|
| **Simple syntax** | `SERIAL` / `BIGSERIAL` | `AUTO_INCREMENT` | `IDENTITY(1,1)` | `GENERATED ALWAYS AS IDENTITY` (12c+) |
| **Standard SQL way** | `GENERATED ALWAYS AS IDENTITY` | — | `IDENTITY` | `GENERATED ALWAYS AS IDENTITY` |
| **Sequence object** | `CREATE SEQUENCE` | — | `CREATE SEQUENCE` | `CREATE SEQUENCE` + `NEXTVAL` |

```sql
-- PostgreSQL (preferred modern way)
CREATE TABLE users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL
);

-- MySQL
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

-- SQL Server
CREATE TABLE users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL
);

-- Oracle (12c+)
CREATE TABLE users (
    id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR2(255) NOT NULL
);

-- Oracle (pre-12c) — sequence + trigger zaruri tha
CREATE SEQUENCE users_seq START WITH 1 INCREMENT BY 1;
-- Phir ek trigger mein: :NEW.id := users_seq.NEXTVAL;
```

---

## 4. String Functions

| Function | PostgreSQL | MySQL | SQL Server | Oracle |
|---|---|---|---|---|
| **Substring** | `SUBSTRING(s, start, len)` | `SUBSTRING(s, start, len)` | `SUBSTRING(s, start, len)` | `SUBSTR(s, start, len)` |
| **Concatenation** | `\|\|` ya `CONCAT()` | `CONCAT()` (null-safe) | `+` ya `CONCAT()` | `\|\|` ya `CONCAT()` |
| **String length** | `LENGTH(s)` | `LENGTH(s)` | `LEN(s)` | `LENGTH(s)` |
| **Uppercase** | `UPPER(s)` | `UPPER(s)` | `UPPER(s)` | `UPPER(s)` |
| **Lowercase** | `LOWER(s)` | `LOWER(s)` | `LOWER(s)` | `LOWER(s)` |
| **Trim (dono side)** | `TRIM(s)` | `TRIM(s)` | `TRIM(s)` | `TRIM(s)` |
| **Left trim** | `LTRIM(s)` | `LTRIM(s)` | `LTRIM(s)` | `LTRIM(s)` |
| **Right trim** | `RTRIM(s)` | `RTRIM(s)` | `RTRIM(s)` | `RTRIM(s)` |
| **Replace** | `REPLACE(s, old, new)` | `REPLACE(s, old, new)` | `REPLACE(s, old, new)` | `REPLACE(s, old, new)` |
| **Substring ki position** | `POSITION(sub IN s)` | `INSTR(s, sub)` | `CHARINDEX(sub, s)` | `INSTR(s, sub)` |
| **Pad left** | `LPAD(s, len, pad)` | `LPAD(s, len, pad)` | `REPLICATE` hack | `LPAD(s, len, pad)` |
| **Pad right** | `RPAD(s, len, pad)` | `RPAD(s, len, pad)` | `REPLICATE` hack | `RPAD(s, len, pad)` |
| **Reverse** | `REVERSE(s)` | `REVERSE(s)` | `REVERSE(s)` | `REVERSE(s)` |
| **Repeat** | `REPEAT(s, n)` | `REPEAT(s, n)` | `REPLICATE(s, n)` | `RPAD('', n*LENGTH(s), s)` |
| **String split** | `STRING_TO_ARRAY(s, delim)` | Built-in nahi (JSON se workaround) | `STRING_SPLIT(s, delim)` | `REGEXP_SUBSTR` / `XMLTABLE` |

```sql
-- NULL-safe concat mein differences
-- PostgreSQL / Oracle: NULL || 'world' = NULL
-- MySQL: CONCAT(NULL, 'world') = NULL lekin CONCAT_WS(',', NULL, 'world') = 'world'
-- SQL Server: NULL + 'world' = NULL

-- LEN vs LENGTH — SQL Server LEN() use karta hai, trailing spaces exclude ho jaate hain
SELECT LEN('hello   ');    -- SQL Server: 5
SELECT LENGTH('hello   '); -- PostgreSQL/MySQL/Oracle: 8
```

> [!warning]
> Yeh `LEN` vs `LENGTH` wala difference chhota lagta hai lekin production mein padding-based validation logic tod sakta hai. Ek baar test karo phir hi trust karo.

---

## 5. Date & Time Functions

Kyun zaruri hai? Har database "abhi ka time kya hai" alag tarike se poochhta hai — Instagram pe "abhi" post karne jaisa simple lagta hai, lekin backend mein har DB ka apna function hai.

| Operation | PostgreSQL | MySQL | SQL Server | Oracle |
|---|---|---|---|---|
| **Current timestamp** | `NOW()` / `CURRENT_TIMESTAMP` | `NOW()` / `SYSDATE()` | `GETDATE()` / `SYSDATETIME()` | `SYSDATE` / `SYSTIMESTAMP` |
| **Current date** | `CURRENT_DATE` | `CURDATE()` | `CAST(GETDATE() AS DATE)` | `TRUNC(SYSDATE)` |
| **Current time** | `CURRENT_TIME` | `CURTIME()` | `CAST(GETDATE() AS TIME)` | — |
| **Truncate to unit** | `DATE_TRUNC('month', ts)` | `DATE_FORMAT(d, '%Y-%m-01')` | `DATETRUNC('month', d)` (2022+) | `TRUNC(d, 'MM')` |
| **Extract part** | `EXTRACT(YEAR FROM d)` | `YEAR(d)` / `EXTRACT(YEAR FROM d)` | `YEAR(d)` / `DATEPART(year, d)` | `EXTRACT(YEAR FROM d)` |
| **Add interval** | `d + INTERVAL '3 days'` | `DATE_ADD(d, INTERVAL 3 DAY)` | `DATEADD(day, 3, d)` | `d + 3` / `d + INTERVAL '3' DAY` |
| **Days ka difference** | `d1 - d2` (integer return) | `DATEDIFF(d1, d2)` | `DATEDIFF(day, d2, d1)` | `d1 - d2` (number return) |
| **Date format karo** | `TO_CHAR(d, 'YYYY-MM-DD')` | `DATE_FORMAT(d, '%Y-%m-%d')` | `FORMAT(d, 'yyyy-MM-dd')` | `TO_CHAR(d, 'YYYY-MM-DD')` |
| **String ko date mein parse** | `TO_DATE('2024-01-15', 'YYYY-MM-DD')` | `STR_TO_DATE('2024-01-15', '%Y-%m-%d')` | `CONVERT(DATE, '2024-01-15')` | `TO_DATE('2024-01-15', 'YYYY-MM-DD')` |
| **Age/duration** | `AGE(ts1, ts2)` | `TIMESTAMPDIFF(unit, ts2, ts1)` | `DATEDIFF` + `DATEPART` | `MONTHS_BETWEEN(d1, d2)` |

```sql
-- Month ki shuruaat pe truncate karo
-- PostgreSQL
SELECT DATE_TRUNC('month', created_at) FROM orders;

-- MySQL
SELECT DATE_FORMAT(created_at, '%Y-%m-01') FROM orders;

-- SQL Server (2022+)
SELECT DATETRUNC(month, created_at) FROM orders;
-- Purana SQL Server:
SELECT DATEFROMPARTS(YEAR(created_at), MONTH(created_at), 1) FROM orders;

-- Oracle
SELECT TRUNC(created_at, 'MM') FROM orders;
```

---

## 6. Conditional Expressions

Kya hota hai? Yeh basically SQL ka `if-else` hai — jaise "agar order amount 500 se zyada hai to free delivery, warna nahi" wali logic.

| Expression | PostgreSQL | MySQL | SQL Server | Oracle |
|---|---|---|---|---|
| **CASE WHEN** | ✅ Standard | ✅ Standard | ✅ Standard | ✅ Standard |
| **COALESCE** | ✅ Standard | ✅ Standard | ✅ Standard | ✅ Standard |
| **NULLIF** | ✅ Standard | ✅ Standard | ✅ Standard | ✅ Standard |
| **IIF** | ❌ | ❌ | ✅ `IIF(cond, true_val, false_val)` | ❌ |
| **DECODE** | ❌ | ❌ | ❌ | ✅ `DECODE(expr, v1, r1, v2, r2, default)` |
| **NVL** | ❌ | ❌ | ❌ | ✅ `NVL(expr, replacement)` |
| **IF()** | ❌ | ✅ `IF(cond, true_val, false_val)` | ❌ | ❌ |
| **IFNULL** | ❌ | ✅ `IFNULL(expr, replacement)` | ❌ | ❌ |
| **ISNULL** | ❌ | ❌ | ✅ `ISNULL(expr, replacement)` | ❌ |

```sql
-- COALESCE: chaaron mein standard hai (portability ke liye isi ko use karo)
SELECT COALESCE(phone, email, 'no contact') FROM users;

-- SQL Server ka shorthand (non-portable)
SELECT IIF(score >= 60, 'Pass', 'Fail') FROM results;
-- Har jagah equivalent:
SELECT CASE WHEN score >= 60 THEN 'Pass' ELSE 'Fail' END FROM results;

-- Oracle DECODE (non-portable — naye code mein avoid karo)
SELECT DECODE(status, 'A', 'Active', 'I', 'Inactive', 'Unknown') FROM accounts;

-- Oracle NVL vs standard COALESCE
SELECT NVL(phone, 'N/A') FROM users;       -- Sirf Oracle
SELECT COALESCE(phone, 'N/A') FROM users;  -- Sabhi databases
```

---

## 7. Pagination: LIMIT / OFFSET vs FETCH NEXT vs ROWNUM

Kyun zaruri hai? Jab tum Flipkart pe products list dekhte ho aur "next page" click karte ho, backend mein yehi pagination chal raha hota hai.

| | PostgreSQL | MySQL | SQL Server | Oracle |
|---|---|---|---|---|
| **Simple limit** | `LIMIT 10` | `LIMIT 10` | `TOP 10` (SELECT TOP) ya `FETCH NEXT 10` | `FETCH NEXT 10` (12c+) ya `ROWNUM` |
| **Offset-based paging** | `LIMIT 10 OFFSET 20` | `LIMIT 10 OFFSET 20` | `OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY` | `OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY` |
| **ORDER BY zaruri hai?** | Nahi (par recommended) | Nahi (par recommended) | ✅ Haan (OFFSET/FETCH ke saath mandatory) | ✅ Haan |

```sql
-- Page 3 (rows 21-30), sabhi databases mein

-- PostgreSQL / MySQL
SELECT * FROM products
ORDER BY id
LIMIT 10 OFFSET 20;

-- SQL Server (OFFSET/FETCH — preferred, ORDER BY zaruri)
SELECT * FROM products
ORDER BY id
OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY;

-- SQL Server legacy (TOP — bina subquery ke offset support nahi)
SELECT TOP 10 * FROM products ORDER BY id;

-- Oracle 12c+
SELECT * FROM products
ORDER BY id
OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY;

-- Oracle pre-12c (ugly lekin classic)
SELECT * FROM (
    SELECT p.*, ROWNUM AS rn FROM (
        SELECT * FROM products ORDER BY id
    ) p WHERE ROWNUM <= 30
) WHERE rn > 20;
```

---

## 8. JSON Support

Kya hota hai? Modern apps mein bahut baar structured data ke saath-saath thoda flexible/nested data bhi store karna padta hai — jaise ek user ka "preferences" object jisme kabhi kya field ho, pata nahi. JSON columns isi ke liye hain.

| Feature | PostgreSQL | MySQL | SQL Server | Oracle |
|---|---|---|---|---|
| **Native JSON type** | ✅ `JSON` + `JSONB` | ✅ `JSON` | ⚠️ `NVARCHAR` mein store, JSON functions add kiye gaye | ⚠️ `CLOB`; native `JSON` type 21c mein |
| **Binary/indexed JSON** | ✅ `JSONB` (indexed, compressed) | ❌ Sirf text | ❌ | ❌ |
| **Value extract karo** | `data->>'key'` ya `JSON_VALUE()` | `JSON_UNQUOTE(JSON_EXTRACT(d, '$.key'))` | `JSON_VALUE(d, '$.key')` | `JSON_VALUE(d, '$.key')` |
| **Object extract karo** | `data->'key'` | `JSON_EXTRACT(d, '$.key')` | `JSON_QUERY(d, '$.key')` | `JSON_QUERY(d, '$.key')` |
| **Array length** | `jsonb_array_length(data)` | `JSON_LENGTH(data)` | `JSON_ARRAY_LENGTH(data)` (2022+) | `JSON_ARRAY_LENGTH(data)` (21c) |
| **JSON hai ya nahi check karo** | — | `JSON_VALID(data)` | `ISJSON(data)` | `VALIDATE_CONVERSION(data IS JSON)` |
| **JSON pe index** | ✅ GIN index on JSONB | ⚠️ Generated columns pe index | ❌ | ❌ |
| **JSON mein aggregate karo** | `JSON_AGG()`, `JSONB_AGG()` | `JSON_ARRAYAGG()`, `JSON_OBJECTAGG()` | `JSON_ARRAYAGG()`, `JSON_OBJECTAGG()` | `JSON_ARRAYAGG()`, `JSON_OBJECTAGG()` |

```sql
-- role = 'admin' waale users dhundo JSON field se

-- PostgreSQL (JSONB — GIN index ke saath fast)
SELECT * FROM users WHERE metadata->>'role' = 'admin';
-- GIN index ke saath:
CREATE INDEX idx_metadata ON users USING GIN (metadata);

-- MySQL
SELECT * FROM users WHERE JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.role')) = 'admin';
-- Ya shorthand:
SELECT * FROM users WHERE metadata->>'$.role' = 'admin';

-- SQL Server
SELECT * FROM users WHERE JSON_VALUE(metadata, '$.role') = 'admin';

-- Oracle 21c+
SELECT * FROM users WHERE JSON_VALUE(metadata, '$.role') = 'admin';
```

PostgreSQL ka `JSONB` yahan clear winner hai — yeh compress karta hai, keys ko deduplicate karta hai, aur full index-based querying support karta hai. Agar JSON tumhare data model ka core part hai, to PostgreSQL hi sahi choice hai — jaise CRED apna transaction metadata flexible JSON mein rakh sakta hai bina schema tode.

---

## 9. Full-Text Search

Kya hota hai? Jab tum Amazon pe "wireless earphones" search karte ho aur relevant results milte hain, wahan simple `LIKE '%wireless%'` kaafi nahi — asli full-text search chahiye hoti hai.

| Feature | PostgreSQL | MySQL | SQL Server | Oracle |
|---|---|---|---|---|
| **Built-in FTS** | ✅ `tsvector` / `tsquery` | ✅ `FULLTEXT` index | ✅ Full-Text Search service | ✅ Oracle Text |
| **Index type** | GIN/GiST on `tsvector` | `FULLTEXT` index | Full-Text index (alag service) | `CONTEXT` index |
| **Ranking** | `ts_rank()` | — | `CONTAINSTABLE` rank column | `SCORE()` |
| **Language support** | ✅ Bahut saare built-in dictionaries | ⚠️ Limited | ✅ Har language ke word breakers | ✅ |
| **Fuzzy / stemming** | ✅ dictionaries ke through | ❌ | ✅ | ✅ |

```sql
-- 'database performance' ke liye full-text search

-- PostgreSQL
SELECT * FROM articles
WHERE to_tsvector('english', body) @@ to_tsquery('english', 'database & performance')
ORDER BY ts_rank(to_tsvector('english', body), to_tsquery('english', 'database & performance')) DESC;

-- MySQL
SELECT * FROM articles
WHERE MATCH(body) AGAINST('database performance' IN NATURAL LANGUAGE MODE);

-- SQL Server
SELECT * FROM articles
WHERE CONTAINS(body, '"database" AND "performance"');

-- Oracle
SELECT * FROM articles
WHERE CONTAINS(body, 'database AND performance') > 0;
```

---

## 10. Window Functions

Chaaron databases mein window functions ka syntax lagbhag same hai (SQL standard). Yeh sabse consistent area hai — jaise UPI ka QR code sab jagah same tarike se kaam karta hai.

| Function | PostgreSQL | MySQL | SQL Server | Oracle |
|---|---|---|---|---|
| **ROW_NUMBER** | ✅ | ✅ (8.0+) | ✅ | ✅ |
| **RANK / DENSE_RANK** | ✅ | ✅ (8.0+) | ✅ | ✅ |
| **LAG / LEAD** | ✅ | ✅ (8.0+) | ✅ | ✅ |
| **FIRST_VALUE / LAST_VALUE** | ✅ | ✅ (8.0+) | ✅ | ✅ |
| **NTILE** | ✅ | ✅ (8.0+) | ✅ | ✅ |
| **PERCENT_RANK / CUME_DIST** | ✅ | ✅ (8.0+) | ✅ | ✅ |

```sql
-- Running total + rank — chaaron mein identical syntax
SELECT
    employee_id,
    department,
    salary,
    SUM(salary) OVER (PARTITION BY department ORDER BY salary) AS running_total,
    RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS dept_rank,
    LAG(salary) OVER (PARTITION BY department ORDER BY salary) AS prev_salary
FROM employees;
```

> [!info]
> MySQL ne window functions sirf version **8.0** (2018) mein add kiye. Agar tum MySQL 5.7 ya usse purane pe ho, window functions exist hi nahi karte — uske badle correlated subqueries use karo.

---

## 11. CTEs (Common Table Expressions)

Standard CTEs (`WITH ...`) chaaron mein same tarike se kaam karte hain. Difference tab aata hai jab **recursive CTEs** ki baat aati hai.

| Feature | PostgreSQL | MySQL | SQL Server | Oracle |
|---|---|---|---|---|
| **Standard CTE** | ✅ | ✅ (8.0+) | ✅ | ✅ |
| **Recursive CTE keyword** | `WITH RECURSIVE` | `WITH RECURSIVE` | `WITH` (RECURSIVE keyword nahi chahiye) | `WITH` (RECURSIVE keyword nahi chahiye) |
| **Recursive supported** | ✅ | ✅ (8.0+) | ✅ | ✅ |

```sql
-- Recursive CTE: employee hierarchy

-- PostgreSQL / MySQL
WITH RECURSIVE org_chart AS (
    SELECT id, name, manager_id, 1 AS depth
    FROM employees WHERE manager_id IS NULL
    UNION ALL
    SELECT e.id, e.name, e.manager_id, oc.depth + 1
    FROM employees e
    JOIN org_chart oc ON e.manager_id = oc.id
)
SELECT * FROM org_chart ORDER BY depth;

-- SQL Server / Oracle (RECURSIVE keyword nahi chahiye)
WITH org_chart AS (
    SELECT id, name, manager_id, 1 AS depth
    FROM employees WHERE manager_id IS NULL
    UNION ALL
    SELECT e.id, e.name, e.manager_id, oc.depth + 1
    FROM employees e
    JOIN org_chart oc ON e.manager_id = oc.id
)
SELECT * FROM org_chart ORDER BY depth;
```

---

## 12. Stored Procedures — Same Logic, Chaar Dialects

```sql
-- Stored procedure: minimum amount se upar ke orders lao

-- PostgreSQL (PL/pgSQL)
CREATE OR REPLACE FUNCTION get_large_orders(min_amount NUMERIC)
RETURNS TABLE(order_id INT, total NUMERIC) AS $$
BEGIN
    RETURN QUERY
    SELECT id, amount FROM orders WHERE amount >= min_amount;
END;
$$ LANGUAGE plpgsql;

-- Call:
SELECT * FROM get_large_orders(500);

-- MySQL
DELIMITER $$
CREATE PROCEDURE get_large_orders(IN min_amount DECIMAL(10,2))
BEGIN
    SELECT id, amount FROM orders WHERE amount >= min_amount;
END$$
DELIMITER ;

-- Call:
CALL get_large_orders(500);

-- SQL Server (T-SQL)
CREATE OR ALTER PROCEDURE dbo.get_large_orders
    @min_amount DECIMAL(10,2)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT id, amount FROM orders WHERE amount >= @min_amount;
END;
GO

-- Call:
EXEC dbo.get_large_orders @min_amount = 500;

-- Oracle (PL/SQL)
CREATE OR REPLACE PROCEDURE get_large_orders(
    p_min_amount IN NUMBER,
    p_cursor     OUT SYS_REFCURSOR
) AS
BEGIN
    OPEN p_cursor FOR
        SELECT id, amount FROM orders WHERE amount >= p_min_amount;
END;
/

-- Call (dusre PL/SQL block se):
DECLARE
    v_cursor SYS_REFCURSOR;
    v_id orders.id%TYPE;
    v_amount orders.amount%TYPE;
BEGIN
    get_large_orders(500, v_cursor);
    LOOP
        FETCH v_cursor INTO v_id, v_amount;
        EXIT WHEN v_cursor%NOTFOUND;
        DBMS_OUTPUT.PUT_LINE(v_id || ': ' || v_amount);
    END LOOP;
    CLOSE v_cursor;
END;
/
```

---

## 13. Triggers

Kya hota hai? Trigger basically ek "auto-reaction" hai — jaise jab tum Ola mein ride complete karte ho, automatically ek receipt generate ho jaati hai. Waise hi database mein kisi row ke insert/update/delete hone pe automatically kuch aur action chal jaata hai.

| Feature | PostgreSQL | MySQL | SQL Server | Oracle |
|---|---|---|---|---|
| **BEFORE trigger** | ✅ | ✅ | ❌ (sirf INSTEAD OF views) | ✅ |
| **AFTER trigger** | ✅ | ✅ | ✅ | ✅ |
| **INSTEAD OF trigger** | ✅ (views pe) | ❌ | ✅ | ✅ |
| **Row-level trigger** | ✅ `FOR EACH ROW` | ✅ (hamesha row-level) | ⚠️ inserted/deleted tables ke through statement-level | ✅ `FOR EACH ROW` |
| **NEW/OLD reference** | ✅ `NEW`, `OLD` | ✅ `NEW`, `OLD` | ✅ `inserted`, `deleted` tables | ✅ `:NEW`, `:OLD` |

```sql
-- Audit trigger: orders.amount ke updates log karo

-- PostgreSQL
CREATE OR REPLACE FUNCTION audit_order_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO order_audit(order_id, old_amount, new_amount, changed_at)
    VALUES (OLD.id, OLD.amount, NEW.amount, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_order_audit
AFTER UPDATE OF amount ON orders
FOR EACH ROW EXECUTE FUNCTION audit_order_changes();

-- MySQL
CREATE TRIGGER trg_order_audit
AFTER UPDATE ON orders
FOR EACH ROW
BEGIN
    IF OLD.amount <> NEW.amount THEN
        INSERT INTO order_audit(order_id, old_amount, new_amount, changed_at)
        VALUES (OLD.id, OLD.amount, NEW.amount, NOW());
    END IF;
END;

-- SQL Server
CREATE TRIGGER trg_order_audit ON orders
AFTER UPDATE AS
BEGIN
    INSERT INTO order_audit(order_id, old_amount, new_amount, changed_at)
    SELECT d.id, d.amount, i.amount, GETDATE()
    FROM deleted d JOIN inserted i ON d.id = i.id
    WHERE d.amount <> i.amount;
END;

-- Oracle
CREATE OR REPLACE TRIGGER trg_order_audit
AFTER UPDATE OF amount ON orders
FOR EACH ROW
WHEN (OLD.amount <> NEW.amount)
BEGIN
    INSERT INTO order_audit(order_id, old_amount, new_amount, changed_at)
    VALUES (:OLD.id, :OLD.amount, :NEW.amount, SYSDATE);
END;
/
```

---

## 14. Schemas vs Databases

Yeh cheez bahut developers ko confuse karti hai jab woh ek system se doosre system pe migrate karte hain.

| Concept | PostgreSQL | MySQL | SQL Server | Oracle |
|---|---|---|---|---|
| **Hierarchy** | Server → Database → Schema → Table | Server → Database (=Schema) → Table | Server → Database → Schema → Table | Server → Database → Schema → Table |
| **Schema = Database?** | ❌ Alag concepts | ✅ `CREATE SCHEMA` = `CREATE DATABASE` | ❌ Alag concepts | ❌ Alag concepts |
| **Default schema** | `public` | (database ke naam jaisa hi) | `dbo` | User ka apna schema |
| **Cross-schema query** | `schema_name.table_name` | `db_name.table_name` | `db_name.schema_name.table_name` | `schema_name.table_name` |
| **Cross-DB query** | `postgres_fdw` extension chahiye | ✅ Native | ✅ Linked servers / 4-part names | ✅ Database links |

```sql
-- Schemas banana aur use karna

-- PostgreSQL
CREATE SCHEMA analytics;
CREATE TABLE analytics.reports (id SERIAL, name TEXT);
SELECT * FROM analytics.reports;

-- MySQL (schema = database — ek hi cheez)
CREATE DATABASE analytics;
USE analytics;
CREATE TABLE reports (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255));
-- Cross-database:
SELECT * FROM analytics.reports;

-- SQL Server
CREATE SCHEMA analytics;
CREATE TABLE analytics.reports (id INT IDENTITY PRIMARY KEY, name NVARCHAR(255));
SELECT * FROM analytics.reports;
-- Full 4-part naam: server.database.schema.table
SELECT * FROM MyServer.MyDB.analytics.reports;

-- Oracle
CREATE USER analytics IDENTIFIED BY password;
GRANT CREATE SESSION, CREATE TABLE TO analytics;
-- Objects schema (user) ke andar aate hain
CREATE TABLE analytics.reports (id NUMBER GENERATED ALWAYS AS IDENTITY, name VARCHAR2(255));
```

---

## 15. Upsert — Insert ya Update

Kya hota hai? Upsert ka matlab hai — "agar record already hai to update kardo, warna naya insert kardo." Bilkul waise jaise jab tum Paytm mein apna contact save karte ho — pehle se hai to update, nahi hai to naya add.

| | PostgreSQL | MySQL | SQL Server | Oracle |
|---|---|---|---|---|
| **Syntax** | `INSERT ... ON CONFLICT` | `INSERT ... ON DUPLICATE KEY UPDATE` | `MERGE INTO` | `MERGE INTO` |
| **Target** | Specific column ya constraint | Koi bhi UNIQUE/PRIMARY KEY | Koi bhi condition | Koi bhi condition |
| **SQL Standard** | Non-standard | Non-standard | ✅ SQL:2003 MERGE | ✅ SQL:2003 MERGE |

```sql
-- Upsert: user insert karo, agar id already exist karti hai to email update karo

-- PostgreSQL
INSERT INTO users (id, name, email)
VALUES (1, 'Alice', 'alice@new.com')
ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        updated_at = NOW();

-- MySQL
INSERT INTO users (id, name, email)
VALUES (1, 'Alice', 'alice@new.com')
ON DUPLICATE KEY UPDATE
    email = VALUES(email);

-- SQL Server
MERGE INTO users AS target
USING (SELECT 1 AS id, 'Alice' AS name, 'alice@new.com' AS email) AS source
ON target.id = source.id
WHEN MATCHED THEN
    UPDATE SET email = source.email
WHEN NOT MATCHED THEN
    INSERT (id, name, email) VALUES (source.id, source.name, source.email);

-- Oracle (SQL Server jaisa hi MERGE syntax)
MERGE INTO users target
USING (SELECT 1 AS id, 'Alice' AS name, 'alice@new.com' AS email FROM dual) source
ON (target.id = source.id)
WHEN MATCHED THEN
    UPDATE SET email = source.email
WHEN NOT MATCHED THEN
    INSERT (id, name, email) VALUES (source.id, source.name, source.email);
```

---

## 16. RETURNING / OUTPUT Clause

Yeh useful hai jab tumhe generated IDs ya updated values chahiye hon bina ek extra query chalaye.

| | PostgreSQL | MySQL | SQL Server | Oracle |
|---|---|---|---|---|
| **Clause ka naam** | `RETURNING` | ❌ Koi equivalent nahi (`LAST_INSERT_ID()` use karo) | `OUTPUT` | `RETURNING ... INTO` (sirf PL/SQL) |
| **INSERT ke saath** | ✅ | ❌ | ✅ | ✅ (PL/SQL) |
| **UPDATE ke saath** | ✅ | ❌ | ✅ | ✅ (PL/SQL) |
| **DELETE ke saath** | ✅ | ❌ | ✅ | ✅ (PL/SQL) |

```sql
-- Insert ke baad naya ID lo

-- PostgreSQL
INSERT INTO users (name, email)
VALUES ('Bob', 'bob@example.com')
RETURNING id, created_at;

-- MySQL (RETURNING nahi hai — LAST_INSERT_ID() use karo)
INSERT INTO users (name, email) VALUES ('Bob', 'bob@example.com');
SELECT LAST_INSERT_ID();

-- SQL Server
INSERT INTO users (name, email)
OUTPUT INSERTED.id, INSERTED.created_at
VALUES ('Bob', 'bob@example.com');

-- Oracle (sirf PL/SQL mein)
DECLARE v_id NUMBER;
BEGIN
    INSERT INTO users (name, email)
    VALUES ('Bob', 'bob@example.com')
    RETURNING id INTO v_id;
    DBMS_OUTPUT.PUT_LINE('New ID: ' || v_id);
END;
/
```

---

## 17. Transactions: Auto-Commit & Isolation

| | PostgreSQL | MySQL | SQL Server | Oracle |
|---|---|---|---|---|
| **Auto-commit default** | ✅ ON | ✅ ON (InnoDB) | ✅ ON | ❌ OFF (manual commit zaruri) |
| **Transaction start** | `BEGIN` | `START TRANSACTION` | `BEGIN TRANSACTION` | Implicit (auto-started) |
| **Default isolation** | `READ COMMITTED` | `REPEATABLE READ` | `READ COMMITTED` | `READ COMMITTED` |
| **SERIALIZABLE support** | ✅ True serializable (SSI) | ✅ | ✅ | ✅ |
| **DDL transactions mein** | ✅ Haan! CREATE TABLE rollback ho sakta hai | ❌ DDL auto-commit ho jaata hai | ❌ DDL auto-commit ho jaata hai | ❌ DDL auto-commit ho jaata hai |
| **Savepoints** | ✅ | ✅ | ✅ | ✅ |

> [!tip]
> PostgreSQL ka transactional DDL ek killer feature hai. Tum `CREATE TABLE`, `ALTER TABLE` kar sakte ho, test chala sakte ho, phir `ROLLBACK` kar sakte ho — aur table gayab ho jaati hai. Koi doosra major database yeh nahi karta.

```sql
-- Oracle: auto-commit OFF hai — hamesha explicitly commit ya rollback karo
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT; -- Zaruri hai! Oracle commit ya rollback tak locks hold karega.

-- PostgreSQL: transactional DDL
BEGIN;
CREATE TABLE temp_test (id SERIAL, val TEXT);
INSERT INTO temp_test (val) VALUES ('test');
-- Kuch galat ho gaya...
ROLLBACK; -- Table gayab! Schema change rollback ho gaya.
```

---

## 18. Connection Limits & Pooling Tools

| | PostgreSQL | MySQL | SQL Server | Oracle |
|---|---|---|---|---|
| **Default max connections** | 100 | 151 | 32,767 | Unlimited (licensed) |
| **Connection overhead** | High (process-per-connection) | Low (thread-per-connection) | Low | Moderate |
| **Recommended pooler** | PgBouncer, Pgpool-II | ProxySQL, MySQL Router | Built-in connection pooling | UCP, DRCP |
| **Cloud managed pooling** | ✅ AWS RDS Proxy, Supabase | ✅ AWS RDS Proxy | ✅ Azure SQL built-in | ✅ Oracle Cloud |

PostgreSQL ka process-per-connection model matlab har connection ek naya OS process fork karta hai (~5-10MB RAM). 500 connections pe tumne kaafi memory kha li. **PgBouncer transaction mode mein** high-concurrency PostgreSQL deployments ke liye standard solution hai — bilkul BigBasket ke peak-hour traffic ke waqt connection pooling zaruri hai, warna server dhang ho jaayega.

---

## 19. GUI Tools

| Database | Best Free Tool | Best Paid Tool | Cross-DB Option |
|---|---|---|---|
| **PostgreSQL** | pgAdmin 4, DBeaver | DataGrip (JetBrains) | DBeaver, TablePlus |
| **MySQL** | MySQL Workbench, DBeaver | DataGrip | DBeaver, TablePlus |
| **SQL Server** | SSMS (SQL Server Management Studio) | DataGrip, Redgate | DBeaver, Azure Data Studio |
| **Oracle** | SQL Developer (Oracle, free) | Toad for Oracle | DBeaver, DataGrip |

**DBeaver** universal free option hai — yeh chaaron aur bhi bahut sare databases se connect ho jaata hai. **DataGrip** best paid cross-database IDE hai. **SSMS** abhi bhi SQL Server ke liye sabse powerful tool hai.

---

## 20. Kaunsa Database Kab Choose Karein

### PostgreSQL choose karo jab:
- Naya project start kar rahe ho, koi existing constraint nahi
- Indexed queries ke saath JSONB chahiye
- GIS/geospatial data chahiye (PostGIS)
- Data integrity aur correctness matter karti hai
- Transactional DDL chahiye
- Linux ya cloud-native pe deploy kar rahe ho (Supabase, Neon, AWS Aurora PostgreSQL)
- Budget matter karta hai — yeh bilkul free hai

### MySQL choose karo jab:
- Tumhara stack WordPress, Drupal, ya koi LAMP/LEMP application hai
- Simple queries ke liye maximum read throughput priority hai
- Team already jaanti hai aur migration cost benefit se zyada hai
- MySQL-specific ecosystem tools chahiye (sharding ke liye Vitess, ProxySQL)

### SQL Server choose karo jab:
- Tumhari organization Microsoft-centric hai (.NET, Azure, Active Directory)
- Deep SSRS/SSAS/SSIS integration chahiye (SQL Server Reporting/Analysis Services)
- On-premises Windows Server pe chala rahe ho
- Row-level security aur Always Encrypted built-in chahiye

### Oracle choose karo jab:
- Banking, insurance, government, ya large enterprise mein ho jahan existing Oracle licenses hain
- Oracle RAC (Real Application Clusters) chahiye multi-node active-active clustering ke liye
- Bada PL/SQL codebase hai jise migrate karna expensive hoga
- Oracle ka advanced partitioning, compression, ya In-Memory Column Store chahiye

---

## Quick Reference: Feature Summary Card

| Feature | PostgreSQL | MySQL | SQL Server | Oracle |
|---|---|---|---|---|
| Open source | ✅ | ✅ | ❌ | ❌ |
| Native JSON | ✅ JSONB | ✅ | ⚠️ | ⚠️ |
| Full-text search | ✅ | ✅ | ✅ | ✅ |
| Window functions | ✅ | ✅ 8.0+ | ✅ | ✅ |
| CTEs | ✅ | ✅ 8.0+ | ✅ | ✅ |
| Recursive CTEs | ✅ | ✅ 8.0+ | ✅ | ✅ |
| Transactional DDL | ✅ | ❌ | ❌ | ❌ |
| Native array type | ✅ | ❌ | ❌ | ❌ |
| GIS/Spatial | ✅ PostGIS | ⚠️ | ✅ | ✅ |
| Partitioning | ✅ | ✅ | ✅ | ✅ (best) |
| Materialized views | ✅ | ❌ | ✅ | ✅ |
| RETURNING clause | ✅ | ❌ | OUTPUT ✅ | PL/SQL only |
| Boolean type | ✅ | ❌ (TINYINT) | BIT | ❌ (NUMBER) |
| Enum type | ✅ | ✅ | ❌ | ❌ |
| Cloud-native options | ✅ Many | ✅ Many | ✅ Azure SQL | ✅ OCI |

---

## Key Takeaways

1. **SQL ek standard hai, lekin dialects real hain.** `SUBSTRING` vs `SUBSTR`, `LEN` vs `LENGTH`, `NOW()` vs `GETDATE()` vs `SYSDATE` — yeh chhote differences production mein matter karte hain.

2. **PostgreSQL aaj ka modern default hai.** Greenfield projects ke liye, yeh sabse correct, sabse extensible, aur sabse feature-rich open-source option hai.

3. **MySQL har jagah hai lekin thoda quirky hai.** No boolean, no materialized views, no RETURNING, DDL transactions tod deta hai. Production mein hit hone se pehle inhe jaan lo.

4. **SQL Server Microsoft ecosystem ke andar excellent hai.** SSMS ek superb tool hai. T-SQL powerful hai. Windows/.NET ke bahar iska home-field advantage khatam ho jaata hai.

5. **Oracle serious enterprise ke liye hai.** Features world-class hain. Price tag aur complexity bhi utne hi bade hain.

6. **Window functions aur CTEs standard ban chuke hain.** Kisi bhi database mein likho — sab jagah kaam karte hain (MySQL 8.0+).

7. **MERGE/Upsert tumhara cross-database upsert hai.** SQL:2003 MERGE SQL Server aur Oracle mein kaam karta hai. PostgreSQL ka `ON CONFLICT` aur MySQL ka `ON DUPLICATE KEY` single-table upserts ke liye simpler hain.

8. **Scale pe PostgreSQL ke liye pooling mandatory hai.** Jab hundreds of application connections hon, PgBouncer optional nahi hai.

---

*Agla chapter: Query optimization aur execution plans — PostgreSQL mein EXPLAIN ANALYZE, MySQL mein EXPLAIN, aur SQL Server/Oracle ke execution plan viewers.*
