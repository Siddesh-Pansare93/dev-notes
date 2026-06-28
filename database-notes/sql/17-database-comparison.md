# Chapter 17: PostgreSQL vs MySQL vs SQL Server vs Oracle — The Complete Comparison

> The reference guide you bookmark, print, and keep on your desk.

SQL is a standard — but every database engine speaks its own dialect. This chapter maps every major feature across the four most important relational databases so you always know exactly what syntax to reach for, no matter which system you're working in.

---

## 1. Overview & Who Uses It

| | PostgreSQL | MySQL | SQL Server | Oracle DB |
|---|---|---|---|---|
| **License** | Open source (PostgreSQL License) | Open source (GPL) + commercial | Commercial (Microsoft) | Commercial (Oracle) |
| **Cost** | Free | Free community edition | From ~$900/core | From ~$17,500/processor |
| **Primary Vendor** | PostgreSQL Global Dev Group | Oracle (acquired 2010) | Microsoft | Oracle |
| **Best Known For** | Correctness, extensibility, JSON, PostGIS | Speed, ubiquity, simplicity | Windows/.NET integration | Enterprise power, financial sector |
| **Famous Users** | Instagram, Apple, Twitch, Gitlab | Facebook (early), Twitter (early), WordPress | Stack Overflow, Dell | Banks, airlines, SAP |
| **OS** | Linux, macOS, Windows | Linux, macOS, Windows | Windows-first, Linux (2017+) | Linux, Windows, Solaris |
| **ACID Compliant** | ✅ Full | ✅ (InnoDB only) | ✅ Full | ✅ Full |
| **Standout Feature** | Extensible types, PostGIS, JSONB | Fastest simple reads, ecosystem size | SSMS tooling, T-SQL, Azure | Partitioning, RAC, PL/SQL |

### When to pick which one

- **PostgreSQL** — You want correctness over speed, you're on Linux/cloud, you need GIS, full-text, or JSONB, or you're building anything greenfield.
- **MySQL** — You're running a LAMP/LEMP stack, need maximum read throughput for simple queries, or the whole team already knows it.
- **SQL Server** — Your shop runs .NET, Windows Server, Active Directory, Azure, or SSRS/SSAS reporting.
- **Oracle DB** — You're in a heavily regulated industry (banking, insurance, government), need Oracle RAC clustering, or you're migrating a legacy Oracle system.

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
| Boolean | `BOOLEAN` | `TINYINT(1)` (no native bool) | `BIT` | `NUMBER(1)` (no native bool) |
| Date only | `DATE` | `DATE` | `DATE` | `DATE` (includes time!) |
| Time only | `TIME` | `TIME` | `TIME` | — |
| Date + Time | `TIMESTAMP` | `DATETIME` / `TIMESTAMP` | `DATETIME` / `DATETIME2` | `TIMESTAMP` |
| Date + Time + TZ | `TIMESTAMPTZ` | — | `DATETIMEOFFSET` | `TIMESTAMP WITH TIME ZONE` |
| Interval | `INTERVAL` | — | `DATEDIFF` result only | `INTERVAL` |
| UUID | `UUID` | `CHAR(36)` / `BINARY(16)` | `UNIQUEIDENTIFIER` | `RAW(16)` |
| JSON | `JSON` / `JSONB` | `JSON` | `NVARCHAR` + JSON funcs | `CLOB` + JSON funcs (21c native) |
| Array | `INTEGER[]`, `TEXT[]`, etc. | — | — | — |
| Enum | `CREATE TYPE ... AS ENUM` | `ENUM('a','b')` | — | — |
| IP Address | `INET` / `CIDR` | — | — | — |
| Geometric/GIS | `POINT`, `POLYGON`, PostGIS | — | `GEOMETRY` / `GEOGRAPHY` | `SDO_GEOMETRY` |
| XML | `XML` | — | `XML` | `XMLTYPE` |

> **Key gotcha:** Oracle `DATE` stores date AND time (to the second). Never assume it's date-only.
> **MySQL boolean:** There is no native BOOLEAN type — `TINYINT(1)` is used, where 0=false, 1=true.

---

## 3. Auto-Increment / Identity Column

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

-- Oracle (pre-12c) — required a sequence + trigger
CREATE SEQUENCE users_seq START WITH 1 INCREMENT BY 1;
-- Then in a trigger: :NEW.id := users_seq.NEXTVAL;
```

---

## 4. String Functions

| Function | PostgreSQL | MySQL | SQL Server | Oracle |
|---|---|---|---|---|
| **Substring** | `SUBSTRING(s, start, len)` | `SUBSTRING(s, start, len)` | `SUBSTRING(s, start, len)` | `SUBSTR(s, start, len)` |
| **Concatenation** | `\|\|` or `CONCAT()` | `CONCAT()` (null-safe) | `+` or `CONCAT()` | `\|\|` or `CONCAT()` |
| **String length** | `LENGTH(s)` | `LENGTH(s)` | `LEN(s)` | `LENGTH(s)` |
| **Uppercase** | `UPPER(s)` | `UPPER(s)` | `UPPER(s)` | `UPPER(s)` |
| **Lowercase** | `LOWER(s)` | `LOWER(s)` | `LOWER(s)` | `LOWER(s)` |
| **Trim (both)** | `TRIM(s)` | `TRIM(s)` | `TRIM(s)` | `TRIM(s)` |
| **Left trim** | `LTRIM(s)` | `LTRIM(s)` | `LTRIM(s)` | `LTRIM(s)` |
| **Right trim** | `RTRIM(s)` | `RTRIM(s)` | `RTRIM(s)` | `RTRIM(s)` |
| **Replace** | `REPLACE(s, old, new)` | `REPLACE(s, old, new)` | `REPLACE(s, old, new)` | `REPLACE(s, old, new)` |
| **Position of substring** | `POSITION(sub IN s)` | `INSTR(s, sub)` | `CHARINDEX(sub, s)` | `INSTR(s, sub)` |
| **Pad left** | `LPAD(s, len, pad)` | `LPAD(s, len, pad)` | `REPLICATE` hack | `LPAD(s, len, pad)` |
| **Pad right** | `RPAD(s, len, pad)` | `RPAD(s, len, pad)` | `REPLICATE` hack | `RPAD(s, len, pad)` |
| **Reverse** | `REVERSE(s)` | `REVERSE(s)` | `REVERSE(s)` | `REVERSE(s)` |
| **Repeat** | `REPEAT(s, n)` | `REPEAT(s, n)` | `REPLICATE(s, n)` | `RPAD('', n*LENGTH(s), s)` |
| **String split** | `STRING_TO_ARRAY(s, delim)` | No built-in (use JSON workaround) | `STRING_SPLIT(s, delim)` | `REGEXP_SUBSTR` / `XMLTABLE` |

```sql
-- NULL-safe concat differences
-- PostgreSQL / Oracle: NULL || 'world' = NULL
-- MySQL: CONCAT(NULL, 'world') = NULL but CONCAT_WS(',', NULL, 'world') = 'world'
-- SQL Server: NULL + 'world' = NULL

-- LEN vs LENGTH — SQL Server uses LEN(), trailing spaces excluded
SELECT LEN('hello   ');    -- SQL Server: 5
SELECT LENGTH('hello   '); -- PostgreSQL/MySQL/Oracle: 8
```

---

## 5. Date & Time Functions

| Operation | PostgreSQL | MySQL | SQL Server | Oracle |
|---|---|---|---|---|
| **Current timestamp** | `NOW()` / `CURRENT_TIMESTAMP` | `NOW()` / `SYSDATE()` | `GETDATE()` / `SYSDATETIME()` | `SYSDATE` / `SYSTIMESTAMP` |
| **Current date** | `CURRENT_DATE` | `CURDATE()` | `CAST(GETDATE() AS DATE)` | `TRUNC(SYSDATE)` |
| **Current time** | `CURRENT_TIME` | `CURTIME()` | `CAST(GETDATE() AS TIME)` | — |
| **Truncate to unit** | `DATE_TRUNC('month', ts)` | `DATE_FORMAT(d, '%Y-%m-01')` | `DATETRUNC('month', d)` (2022+) | `TRUNC(d, 'MM')` |
| **Extract part** | `EXTRACT(YEAR FROM d)` | `YEAR(d)` / `EXTRACT(YEAR FROM d)` | `YEAR(d)` / `DATEPART(year, d)` | `EXTRACT(YEAR FROM d)` |
| **Add interval** | `d + INTERVAL '3 days'` | `DATE_ADD(d, INTERVAL 3 DAY)` | `DATEADD(day, 3, d)` | `d + 3` / `d + INTERVAL '3' DAY` |
| **Difference in days** | `d1 - d2` (returns integer) | `DATEDIFF(d1, d2)` | `DATEDIFF(day, d2, d1)` | `d1 - d2` (returns number) |
| **Format date** | `TO_CHAR(d, 'YYYY-MM-DD')` | `DATE_FORMAT(d, '%Y-%m-%d')` | `FORMAT(d, 'yyyy-MM-dd')` | `TO_CHAR(d, 'YYYY-MM-DD')` |
| **Parse string to date** | `TO_DATE('2024-01-15', 'YYYY-MM-DD')` | `STR_TO_DATE('2024-01-15', '%Y-%m-%d')` | `CONVERT(DATE, '2024-01-15')` | `TO_DATE('2024-01-15', 'YYYY-MM-DD')` |
| **Age/duration** | `AGE(ts1, ts2)` | `TIMESTAMPDIFF(unit, ts2, ts1)` | `DATEDIFF` + `DATEPART` | `MONTHS_BETWEEN(d1, d2)` |

```sql
-- Truncate to start of month
-- PostgreSQL
SELECT DATE_TRUNC('month', created_at) FROM orders;

-- MySQL
SELECT DATE_FORMAT(created_at, '%Y-%m-01') FROM orders;

-- SQL Server (2022+)
SELECT DATETRUNC(month, created_at) FROM orders;
-- Older SQL Server:
SELECT DATEFROMPARTS(YEAR(created_at), MONTH(created_at), 1) FROM orders;

-- Oracle
SELECT TRUNC(created_at, 'MM') FROM orders;
```

---

## 6. Conditional Expressions

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
-- COALESCE: standard across all four (use this for portability)
SELECT COALESCE(phone, email, 'no contact') FROM users;

-- SQL Server shorthand (non-portable)
SELECT IIF(score >= 60, 'Pass', 'Fail') FROM results;
-- Equivalent everywhere:
SELECT CASE WHEN score >= 60 THEN 'Pass' ELSE 'Fail' END FROM results;

-- Oracle DECODE (non-portable — avoid in new code)
SELECT DECODE(status, 'A', 'Active', 'I', 'Inactive', 'Unknown') FROM accounts;

-- Oracle NVL vs standard COALESCE
SELECT NVL(phone, 'N/A') FROM users;       -- Oracle only
SELECT COALESCE(phone, 'N/A') FROM users;  -- All databases
```

---

## 7. Pagination: LIMIT / OFFSET vs FETCH NEXT vs ROWNUM

| | PostgreSQL | MySQL | SQL Server | Oracle |
|---|---|---|---|---|
| **Simple limit** | `LIMIT 10` | `LIMIT 10` | `TOP 10` (SELECT TOP) or `FETCH NEXT 10` | `FETCH NEXT 10` (12c+) or `ROWNUM` |
| **Offset-based paging** | `LIMIT 10 OFFSET 20` | `LIMIT 10 OFFSET 20` | `OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY` | `OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY` |
| **Requires ORDER BY** | No (but recommended) | No (but recommended) | ✅ Yes (mandatory with OFFSET/FETCH) | ✅ Yes |

```sql
-- Page 3 (rows 21-30), all databases

-- PostgreSQL / MySQL
SELECT * FROM products
ORDER BY id
LIMIT 10 OFFSET 20;

-- SQL Server (OFFSET/FETCH — preferred, requires ORDER BY)
SELECT * FROM products
ORDER BY id
OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY;

-- SQL Server legacy (TOP — no offset support without a subquery)
SELECT TOP 10 * FROM products ORDER BY id;

-- Oracle 12c+
SELECT * FROM products
ORDER BY id
OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY;

-- Oracle pre-12c (ugly but classic)
SELECT * FROM (
    SELECT p.*, ROWNUM AS rn FROM (
        SELECT * FROM products ORDER BY id
    ) p WHERE ROWNUM <= 30
) WHERE rn > 20;
```

---

## 8. JSON Support

| Feature | PostgreSQL | MySQL | SQL Server | Oracle |
|---|---|---|---|---|
| **Native JSON type** | ✅ `JSON` + `JSONB` | ✅ `JSON` | ⚠️ Stored as `NVARCHAR`, JSON functions added | ⚠️ `CLOB`; native `JSON` type in 21c |
| **Binary/indexed JSON** | ✅ `JSONB` (indexed, compressed) | ❌ Text only | ❌ | ❌ |
| **Extract value** | `data->>'key'` or `JSON_VALUE()` | `JSON_UNQUOTE(JSON_EXTRACT(d, '$.key'))` | `JSON_VALUE(d, '$.key')` | `JSON_VALUE(d, '$.key')` |
| **Extract object** | `data->'key'` | `JSON_EXTRACT(d, '$.key')` | `JSON_QUERY(d, '$.key')` | `JSON_QUERY(d, '$.key')` |
| **Array length** | `jsonb_array_length(data)` | `JSON_LENGTH(data)` | `JSON_ARRAY_LENGTH(data)` (2022+) | `JSON_ARRAY_LENGTH(data)` (21c) |
| **Check is JSON** | — | `JSON_VALID(data)` | `ISJSON(data)` | `VALIDATE_CONVERSION(data IS JSON)` |
| **Index JSON** | ✅ GIN index on JSONB | ⚠️ Index on generated columns | ❌ | ❌ |
| **Aggregate to JSON** | `JSON_AGG()`, `JSONB_AGG()` | `JSON_ARRAYAGG()`, `JSON_OBJECTAGG()` | `JSON_ARRAYAGG()`, `JSON_OBJECTAGG()` | `JSON_ARRAYAGG()`, `JSON_OBJECTAGG()` |

```sql
-- Query JSON field for users with role = 'admin'

-- PostgreSQL (JSONB — fast with GIN index)
SELECT * FROM users WHERE metadata->>'role' = 'admin';
-- With GIN index:
CREATE INDEX idx_metadata ON users USING GIN (metadata);

-- MySQL
SELECT * FROM users WHERE JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.role')) = 'admin';
-- Or shorthand:
SELECT * FROM users WHERE metadata->>'$.role' = 'admin';

-- SQL Server
SELECT * FROM users WHERE JSON_VALUE(metadata, '$.role') = 'admin';

-- Oracle 21c+
SELECT * FROM users WHERE JSON_VALUE(metadata, '$.role') = 'admin';
```

PostgreSQL's `JSONB` is the clear winner here — it compresses, deduplicates keys, and supports full index-based querying. If JSON is a core part of your data model, PostgreSQL is often the right choice.

---

## 9. Full-Text Search

| Feature | PostgreSQL | MySQL | SQL Server | Oracle |
|---|---|---|---|---|
| **Built-in FTS** | ✅ `tsvector` / `tsquery` | ✅ `FULLTEXT` index | ✅ Full-Text Search service | ✅ Oracle Text |
| **Index type** | GIN/GiST on `tsvector` | `FULLTEXT` index | Full-Text index (separate service) | `CONTEXT` index |
| **Ranking** | `ts_rank()` | — | `CONTAINSTABLE` rank column | `SCORE()` |
| **Language support** | ✅ Many built-in dictionaries | ⚠️ Limited | ✅ Word breakers per language | ✅ |
| **Fuzzy / stemming** | ✅ via dictionaries | ❌ | ✅ | ✅ |

```sql
-- Full-text search for 'database performance'

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

All four databases support window functions with nearly identical syntax (SQL standard). This is one of the most consistent areas.

| Function | PostgreSQL | MySQL | SQL Server | Oracle |
|---|---|---|---|---|
| **ROW_NUMBER** | ✅ | ✅ (8.0+) | ✅ | ✅ |
| **RANK / DENSE_RANK** | ✅ | ✅ (8.0+) | ✅ | ✅ |
| **LAG / LEAD** | ✅ | ✅ (8.0+) | ✅ | ✅ |
| **FIRST_VALUE / LAST_VALUE** | ✅ | ✅ (8.0+) | ✅ | ✅ |
| **NTILE** | ✅ | ✅ (8.0+) | ✅ | ✅ |
| **PERCENT_RANK / CUME_DIST** | ✅ | ✅ (8.0+) | ✅ | ✅ |

```sql
-- Running total + rank — identical syntax in all four
SELECT
    employee_id,
    department,
    salary,
    SUM(salary) OVER (PARTITION BY department ORDER BY salary) AS running_total,
    RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS dept_rank,
    LAG(salary) OVER (PARTITION BY department ORDER BY salary) AS prev_salary
FROM employees;
```

> MySQL only added window functions in version **8.0** (2018). If you're on MySQL 5.7 or earlier, window functions don't exist — use correlated subqueries instead.

---

## 11. CTEs (Common Table Expressions)

Standard CTEs (`WITH ...`) work the same in all four. The difference appears with **recursive CTEs**.

| Feature | PostgreSQL | MySQL | SQL Server | Oracle |
|---|---|---|---|---|
| **Standard CTE** | ✅ | ✅ (8.0+) | ✅ | ✅ |
| **Recursive CTE keyword** | `WITH RECURSIVE` | `WITH RECURSIVE` | `WITH` (no RECURSIVE keyword needed) | `WITH` (no RECURSIVE keyword needed) |
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

-- SQL Server / Oracle (no RECURSIVE keyword)
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

## 12. Stored Procedures — The Same Logic, Four Dialects

```sql
-- Stored procedure: get orders above a minimum amount

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

-- Call (from another PL/SQL block):
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

| Feature | PostgreSQL | MySQL | SQL Server | Oracle |
|---|---|---|---|---|
| **BEFORE trigger** | ✅ | ✅ | ❌ (INSTEAD OF views only) | ✅ |
| **AFTER trigger** | ✅ | ✅ | ✅ | ✅ |
| **INSTEAD OF trigger** | ✅ (on views) | ❌ | ✅ | ✅ |
| **Row-level trigger** | ✅ `FOR EACH ROW` | ✅ (always row-level) | ⚠️ Statement-level via inserted/deleted tables | ✅ `FOR EACH ROW` |
| **NEW/OLD reference** | ✅ `NEW`, `OLD` | ✅ `NEW`, `OLD` | ✅ `inserted`, `deleted` tables | ✅ `:NEW`, `:OLD` |

```sql
-- Audit trigger: log updates to orders.amount

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

This trips up many developers migrating between systems.

| Concept | PostgreSQL | MySQL | SQL Server | Oracle |
|---|---|---|---|---|
| **Hierarchy** | Server → Database → Schema → Table | Server → Database (=Schema) → Table | Server → Database → Schema → Table | Server → Database → Schema → Table |
| **Schema = Database?** | ❌ Separate concepts | ✅ `CREATE SCHEMA` = `CREATE DATABASE` | ❌ Separate concepts | ❌ Separate concepts |
| **Default schema** | `public` | (same as database name) | `dbo` | User's own schema |
| **Cross-schema query** | `schema_name.table_name` | `db_name.table_name` | `db_name.schema_name.table_name` | `schema_name.table_name` |
| **Cross-DB query** | Requires `postgres_fdw` extension | ✅ Native | ✅ Linked servers / 4-part names | ✅ Database links |

```sql
-- Creating and using schemas

-- PostgreSQL
CREATE SCHEMA analytics;
CREATE TABLE analytics.reports (id SERIAL, name TEXT);
SELECT * FROM analytics.reports;

-- MySQL (schema = database — same thing)
CREATE DATABASE analytics;
USE analytics;
CREATE TABLE reports (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255));
-- Cross-database:
SELECT * FROM analytics.reports;

-- SQL Server
CREATE SCHEMA analytics;
CREATE TABLE analytics.reports (id INT IDENTITY PRIMARY KEY, name NVARCHAR(255));
SELECT * FROM analytics.reports;
-- Full 4-part name: server.database.schema.table
SELECT * FROM MyServer.MyDB.analytics.reports;

-- Oracle
CREATE USER analytics IDENTIFIED BY password;
GRANT CREATE SESSION, CREATE TABLE TO analytics;
-- Objects belong to the schema (user)
CREATE TABLE analytics.reports (id NUMBER GENERATED ALWAYS AS IDENTITY, name VARCHAR2(255));
```

---

## 15. Upsert — Insert or Update

| | PostgreSQL | MySQL | SQL Server | Oracle |
|---|---|---|---|---|
| **Syntax** | `INSERT ... ON CONFLICT` | `INSERT ... ON DUPLICATE KEY UPDATE` | `MERGE INTO` | `MERGE INTO` |
| **Target** | Specific column or constraint | Any UNIQUE/PRIMARY KEY | Any condition | Any condition |
| **SQL Standard** | Non-standard | Non-standard | ✅ SQL:2003 MERGE | ✅ SQL:2003 MERGE |

```sql
-- Upsert: insert a user, update email if id already exists

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

-- Oracle (same MERGE syntax as SQL Server)
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

Useful for getting back generated IDs or updated values without a second query.

| | PostgreSQL | MySQL | SQL Server | Oracle |
|---|---|---|---|---|
| **Clause name** | `RETURNING` | ❌ No equivalent (use `LAST_INSERT_ID()`) | `OUTPUT` | `RETURNING ... INTO` (PL/SQL only) |
| **Works with INSERT** | ✅ | ❌ | ✅ | ✅ (PL/SQL) |
| **Works with UPDATE** | ✅ | ❌ | ✅ | ✅ (PL/SQL) |
| **Works with DELETE** | ✅ | ❌ | ✅ | ✅ (PL/SQL) |

```sql
-- Get the new ID after insert

-- PostgreSQL
INSERT INTO users (name, email)
VALUES ('Bob', 'bob@example.com')
RETURNING id, created_at;

-- MySQL (no RETURNING — use LAST_INSERT_ID())
INSERT INTO users (name, email) VALUES ('Bob', 'bob@example.com');
SELECT LAST_INSERT_ID();

-- SQL Server
INSERT INTO users (name, email)
OUTPUT INSERTED.id, INSERTED.created_at
VALUES ('Bob', 'bob@example.com');

-- Oracle (in PL/SQL only)
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
| **Auto-commit default** | ✅ ON | ✅ ON (InnoDB) | ✅ ON | ❌ OFF (manual commit required) |
| **Start transaction** | `BEGIN` | `START TRANSACTION` | `BEGIN TRANSACTION` | Implicit (auto-started) |
| **Default isolation** | `READ COMMITTED` | `REPEATABLE READ` | `READ COMMITTED` | `READ COMMITTED` |
| **Supports SERIALIZABLE** | ✅ True serializable (SSI) | ✅ | ✅ | ✅ |
| **DDL in transactions** | ✅ Yes! Rollback CREATE TABLE | ❌ DDL auto-commits | ❌ DDL auto-commits | ❌ DDL auto-commits |
| **Savepoints** | ✅ | ✅ | ✅ | ✅ |

> PostgreSQL's transactional DDL is a killer feature. You can `CREATE TABLE`, `ALTER TABLE`, run tests, then `ROLLBACK` — and the table disappears. No other major database does this.

```sql
-- Oracle: auto-commit is OFF — always commit or rollback explicitly
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT; -- Required! Oracle will hold locks until you commit or rollback.

-- PostgreSQL: transactional DDL
BEGIN;
CREATE TABLE temp_test (id SERIAL, val TEXT);
INSERT INTO temp_test (val) VALUES ('test');
-- Something went wrong...
ROLLBACK; -- Table is gone! Schema change was rolled back.
```

---

## 18. Connection Limits & Pooling Tools

| | PostgreSQL | MySQL | SQL Server | Oracle |
|---|---|---|---|---|
| **Default max connections** | 100 | 151 | 32,767 | Unlimited (licensed) |
| **Connection overhead** | High (process-per-connection) | Low (thread-per-connection) | Low | Moderate |
| **Recommended pooler** | PgBouncer, Pgpool-II | ProxySQL, MySQL Router | Built-in connection pooling | UCP, DRCP |
| **Cloud managed pooling** | ✅ AWS RDS Proxy, Supabase | ✅ AWS RDS Proxy | ✅ Azure SQL built-in | ✅ Oracle Cloud |

PostgreSQL's process-per-connection model means each connection forks a new OS process (~5-10MB RAM). At 500 connections you've consumed significant memory. **PgBouncer in transaction mode** is the standard solution for high-concurrency PostgreSQL deployments.

---

## 19. GUI Tools

| Database | Best Free Tool | Best Paid Tool | Cross-DB Option |
|---|---|---|---|
| **PostgreSQL** | pgAdmin 4, DBeaver | DataGrip (JetBrains) | DBeaver, TablePlus |
| **MySQL** | MySQL Workbench, DBeaver | DataGrip | DBeaver, TablePlus |
| **SQL Server** | SSMS (SQL Server Management Studio) | DataGrip, Redgate | DBeaver, Azure Data Studio |
| **Oracle** | SQL Developer (Oracle, free) | Toad for Oracle | DBeaver, DataGrip |

**DBeaver** is the universal free option — it connects to all four and many more. **DataGrip** is the best paid cross-database IDE. **SSMS** is still the most powerful tool specifically for SQL Server.

---

## 20. When to Choose Each Database

### Choose PostgreSQL when:
- You're starting a new project with no existing constraints
- You need JSONB with indexed queries
- You need GIS/geospatial data (PostGIS)
- You care deeply about data integrity and correctness
- You want transactional DDL
- You're deploying on Linux or cloud-native (Supabase, Neon, AWS Aurora PostgreSQL)
- Budget matters — it's completely free

### Choose MySQL when:
- Your stack is WordPress, Drupal, or any LAMP/LEMP application
- Maximum read throughput for simple queries is the priority
- Your team already knows it and migration cost outweighs benefits
- You need MySQL-specific ecosystem tools (Vitess for sharding, ProxySQL)

### Choose SQL Server when:
- Your organization is Microsoft-centric (.NET, Azure, Active Directory)
- You need deep SSRS/SSAS/SSIS integration (SQL Server Reporting/Analysis Services)
- You're running on-premises Windows Server
- You need row-level security and Always Encrypted built in

### Choose Oracle when:
- You're in banking, insurance, government, or large enterprise with existing Oracle licenses
- You need Oracle RAC (Real Application Clusters) for multi-node active-active clustering
- You have a large PL/SQL codebase that would be expensive to migrate
- You need Oracle's advanced partitioning, compression, or In-Memory Column Store

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

1. **SQL is a standard, dialects are real.** `SUBSTRING` vs `SUBSTR`, `LEN` vs `LENGTH`, `NOW()` vs `GETDATE()` vs `SYSDATE` — these small differences matter in production.

2. **PostgreSQL is the modern default.** For greenfield projects, it is the most correct, most extensible, and most feature-rich open-source option.

3. **MySQL is ubiquitous but quirky.** No boolean, no materialized views, no RETURNING, DDL breaks transactions. Know these before you hit them in production.

4. **SQL Server is excellent inside the Microsoft ecosystem.** SSMS is a superb tool. T-SQL is powerful. Outside Windows/.NET, it loses its home-field advantage.

5. **Oracle is for serious enterprise.** The features are world-class. So is the price tag and the complexity.

6. **Window functions and CTEs are standard.** Write them in any database — they work everywhere (MySQL 8.0+).

7. **MERGE/Upsert is your cross-database upsert.** SQL:2003 MERGE works in SQL Server and Oracle. PostgreSQL's `ON CONFLICT` and MySQL's `ON DUPLICATE KEY` are simpler for single-table upserts.

8. **Pooling is mandatory for PostgreSQL at scale.** PgBouncer is not optional when you have hundreds of application connections.

---

*Next chapter: Query optimization and execution plans — EXPLAIN ANALYZE in PostgreSQL, EXPLAIN in MySQL, and execution plan viewers in SQL Server and Oracle.*
