# 13. JSON in SQL Databases

> **Prerequisite:** You should be comfortable with basic `SELECT`, `INSERT`, `UPDATE`, and table design before reading this chapter.

---

## 🤔 Why Store JSON Inside a Relational Database?

Relational databases are built around a rigid structure: every row has the same columns, every column has a fixed type. That works brilliantly for orders, invoices, and user accounts — data where the shape is well-known and stable.

But modern applications deal with data that doesn't fit neatly into columns:

- A product catalogue where every category has different attributes (a book has an ISBN, a shirt has a size and color, a laptop has a CPU and RAM)
- User preferences that vary wildly per user
- Webhook payloads or event logs arriving from external systems
- Feature flags or configuration blobs attached to records

You have two classic options: create dozens of nullable columns (messy), or split into many related tables (lots of joins). JSON gives you a third path: **store the flexible part as a JSON document, keep the structured part as regular columns**.

### The Core Benefits

| Benefit | Explanation |
|---|---|
| **Flexibility** | Add new keys to the JSON without an `ALTER TABLE` migration |
| **Fewer joins** | Embed related data (e.g. address inside a user row) instead of a separate table |
| **Semi-structured data** | Handles data where the shape varies per row |
| **Single source of truth** | Keep everything in one DB instead of mixing SQL + a separate document store |

> **Golden rule:** JSON is a tool, not a replacement for good relational design. Use it for the *variable* parts of a row; use regular columns for the *stable, queryable* parts.

---

## 🗃️ JSON vs JSONB — The PostgreSQL Distinction

PostgreSQL offers **two** JSON column types. This is one of the most important decisions you'll make:

| Feature | `JSON` | `JSONB` |
|---|---|---|
| Storage format | Plain text (exactly as you typed it) | Binary (parsed, decomposed) |
| Preserves whitespace | Yes | No |
| Preserves key order | Yes | No (sorted internally) |
| Duplicate keys | Keeps last one silently... actually keeps all | Keeps last value per key |
| Write speed | Slightly faster (no parsing) | Slightly slower (parses on write) |
| Read/query speed | **Slow** (re-parses text every time) | **Fast** (already parsed) |
| Indexing | Not supported | Supports GIN index |
| Operators (`@>`, `?`, etc.) | Not supported | **Supported** |

**Use `JSONB` in almost every real-world scenario.** The only reason to use `JSON` is if you need to preserve the exact byte-for-byte text of the original document (e.g., auditing what was sent by a client).

```sql
-- PostgreSQL: creating a table with JSONB
CREATE TABLE users (
    id        SERIAL PRIMARY KEY,
    name      TEXT NOT NULL,
    email     TEXT NOT NULL,
    data      JSONB          -- flexible metadata lives here
);

-- Inserting JSON data
INSERT INTO users (name, email, data) VALUES (
    'Priya Sharma',
    'priya@example.com',
    '{"role": "admin", "theme": "dark", "notifications": {"email": true, "sms": false}}'
);
```

---

## 🐘 PostgreSQL — JSON Operators and Functions

PostgreSQL has the richest JSON support of any major relational database. Here is the complete toolkit:

### Extraction Operators

```sql
-- -> returns JSON (useful when the result is an object or array)
SELECT data -> 'role' FROM users;
-- Result: "admin"  (a JSON string — note the quotes)

-- ->> returns TEXT (most common for simple values)
SELECT data ->> 'role' FROM users;
-- Result: admin  (plain text, no quotes)

-- Nested path with #> (returns JSON)
SELECT data #> '{notifications, email}' FROM users;
-- Result: true

-- Nested path with #>> (returns TEXT)
SELECT data #>> '{notifications, email}' FROM users;
-- Result: true  (as text)

-- Array element by index (0-based)
-- Suppose data = '{"tags": ["sql", "backend", "api"]}'
SELECT data -> 'tags' -> 0 FROM users;
-- Result: "sql"
```

### Existence and Containment Operators (JSONB only)

```sql
-- ? checks if a top-level key exists
SELECT * FROM users WHERE data ? 'role';

-- @> checks containment: "does this JSONB contain that subset?"
SELECT * FROM users WHERE data @> '{"role": "admin"}';

-- <@ is the reverse containment check
SELECT * FROM users WHERE '{"role": "admin"}' <@ data;

-- ?| checks if ANY of these keys exist
SELECT * FROM users WHERE data ?| ARRAY['role', 'permissions'];

-- ?& checks if ALL of these keys exist
SELECT * FROM users WHERE data ?& ARRAY['role', 'theme'];
```

### Useful Functions

```sql
-- jsonb_object_keys: list all top-level keys
SELECT jsonb_object_keys(data) FROM users WHERE id = 1;

-- jsonb_array_elements: expand a JSON array into rows
SELECT jsonb_array_elements(data -> 'tags') AS tag FROM users WHERE id = 1;

-- jsonb_set: update a value inside JSONB
UPDATE users
SET data = jsonb_set(data, '{theme}', '"light"')
WHERE id = 1;

-- Remove a key with the - operator
UPDATE users
SET data = data - 'theme'
WHERE id = 1;

-- Merge two JSONB objects with ||
UPDATE users
SET data = data || '{"verified": true}'
WHERE id = 1;
```

### GIN Index — Making JSONB Queries Fast

Without an index, every JSONB query does a full table scan. A GIN (Generalized Inverted Index) index fixes this:

```sql
-- Index the entire JSONB column (supports ?, ?|, ?&, @>)
CREATE INDEX idx_users_data ON users USING gin(data);

-- Index a specific path (more targeted, smaller index)
CREATE INDEX idx_users_role ON users USING gin((data -> 'role'));
```

After creating the GIN index, queries like `WHERE data @> '{"role": "admin"}'` become very fast even on millions of rows.

---

## 🐬 MySQL — JSON Support (5.7+)

MySQL added native JSON support in version 5.7. The column type is simply `JSON`, and MySQL validates that the value is well-formed on insert.

```sql
-- Creating a table with a JSON column
CREATE TABLE users (
    id    INT AUTO_INCREMENT PRIMARY KEY,
    name  VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    data  JSON
);

-- Inserting
INSERT INTO users (name, email, data) VALUES (
    'Priya Sharma',
    'priya@example.com',
    '{"role": "admin", "theme": "dark", "notifications": {"email": true, "sms": false}}'
);
```

### Extracting Values

```sql
-- JSON_EXTRACT — returns a JSON value
SELECT JSON_EXTRACT(data, '$.role') FROM users;
-- Result: "admin"  (with quotes — it's JSON)

-- Inline shorthand operator -> (same as JSON_EXTRACT)
SELECT data->'$.role' FROM users;

-- ->> shorthand (unquotes, returns plain text)
SELECT data->>'$.role' FROM users;
-- Result: admin  (no quotes)

-- Nested path
SELECT data->>'$.notifications.email' FROM users;

-- Array element
SELECT data->>'$.tags[0]' FROM users;
```

### Modifying JSON Values

```sql
-- JSON_SET: insert or replace a value
UPDATE users
SET data = JSON_SET(data, '$.theme', 'light')
WHERE id = 1;

-- JSON_INSERT: insert only if path doesn't exist
UPDATE users
SET data = JSON_INSERT(data, '$.verified', true)
WHERE id = 1;

-- JSON_REMOVE: delete a path
UPDATE users
SET data = JSON_REMOVE(data, '$.theme')
WHERE id = 1;

-- JSON_REPLACE: replace only if path exists (no-op otherwise)
UPDATE users
SET data = JSON_REPLACE(data, '$.role', 'viewer')
WHERE id = 1;
```

### Checking Containment

```sql
-- JSON_CONTAINS(target, candidate, path)
SELECT * FROM users
WHERE JSON_CONTAINS(data, '"admin"', '$.role');

-- JSON_CONTAINS_PATH checks if a path exists
SELECT * FROM users
WHERE JSON_CONTAINS_PATH(data, 'one', '$.notifications.email');
```

### Indexing in MySQL — Generated Columns

MySQL does not support indexing a JSON column directly. The workaround is a **generated column**:

```sql
-- Add a virtual or stored generated column
ALTER TABLE users
    ADD COLUMN role VARCHAR(50)
        GENERATED ALWAYS AS (data->>'$.role') STORED;

-- Now index the generated column like any regular column
CREATE INDEX idx_users_role ON users(role);

-- Queries on the generated column use the index automatically
SELECT * FROM users WHERE role = 'admin';
```

`STORED` materialises the value on disk (faster reads, more storage). `VIRTUAL` computes on the fly (no extra storage, slower reads).

---

## 🪟 SQL Server — JSON Without a Native Type

SQL Server (2016+) does not have a dedicated JSON column type. JSON documents are stored in `NVARCHAR(MAX)` columns. SQL Server instead provides a set of functions that understand JSON-formatted strings.

```sql
-- Creating a table (JSON stored as NVARCHAR)
CREATE TABLE users (
    id    INT IDENTITY PRIMARY KEY,
    name  NVARCHAR(100) NOT NULL,
    email NVARCHAR(150) NOT NULL,
    data  NVARCHAR(MAX)
        CONSTRAINT chk_users_data CHECK (ISJSON(data) = 1)
        -- The CHECK constraint ensures the value is valid JSON
);

-- Inserting
INSERT INTO users (name, email, data) VALUES (
    'Priya Sharma',
    'priya@example.com',
    '{"role": "admin", "theme": "dark", "notifications": {"email": true, "sms": false}}'
);
```

### Extracting Values

```sql
-- JSON_VALUE: extracts a scalar value as NVARCHAR
SELECT JSON_VALUE(data, '$.role') FROM users;
-- Result: admin

-- JSON_QUERY: extracts an object or array (returns JSON fragment)
SELECT JSON_QUERY(data, '$.notifications') FROM users;
-- Result: {"email": true, "sms": false}

-- Nested path
SELECT JSON_VALUE(data, '$.notifications.email') FROM users;
```

### Expanding JSON to Rows — OPENJSON

`OPENJSON` is SQL Server's killer feature — it turns a JSON array into a relational result set:

```sql
-- Suppose you have a JSON array of orders
DECLARE @orders NVARCHAR(MAX) = '[
    {"id": 1, "product": "Laptop", "qty": 2},
    {"id": 2, "product": "Mouse",  "qty": 5}
]';

SELECT *
FROM OPENJSON(@orders)
WITH (
    id      INT          '$.id',
    product NVARCHAR(50) '$.product',
    qty     INT          '$.qty'
);
-- Returns a proper table with columns id, product, qty
```

### Converting SQL Results to JSON — FOR JSON

```sql
-- FOR JSON AUTO: SQL Server infers the structure
SELECT id, name, email
FROM users
FOR JSON AUTO;

-- FOR JSON PATH: you control the output shape
SELECT
    id          AS 'user.id',
    name        AS 'user.name',
    email       AS 'user.email'
FROM users
FOR JSON PATH, ROOT('users');
```

### Modifying JSON in SQL Server

```sql
-- JSON_MODIFY: update a value
UPDATE users
SET data = JSON_MODIFY(data, '$.theme', 'light')
WHERE id = 1;
```

---

## 🔶 Oracle — JSON Support (12c+)

Oracle Database 12c introduced JSON support, expanded significantly in 21c. Like SQL Server, Oracle stores JSON in standard column types (`VARCHAR2`, `CLOB`, or `BLOB`) with an `IS JSON` constraint to enforce validity. Oracle 21c added a native `JSON` data type.

```sql
-- Oracle: enforce valid JSON with IS JSON constraint
CREATE TABLE users (
    id    NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name  VARCHAR2(100) NOT NULL,
    email VARCHAR2(150) NOT NULL,
    data  CLOB CONSTRAINT chk_users_json CHECK (data IS JSON)
);

-- Extracting a scalar value
SELECT JSON_VALUE(data, '$.role') FROM users;

-- Extracting an object or array
SELECT JSON_QUERY(data, '$.notifications') FROM users;

-- JSON_TABLE: the Oracle equivalent of OPENJSON — turns JSON into rows
SELECT jt.*
FROM users,
     JSON_TABLE(data, '$'
         COLUMNS (
             role     VARCHAR2(50) PATH '$.role',
             theme    VARCHAR2(20) PATH '$.theme'
         )
     ) jt;
```

Oracle 21c also supports a dot-notation shorthand:

```sql
-- Oracle 21c simplified dot notation
SELECT u.data.role FROM users u;
```

---

## 📊 Cross-Database Feature Comparison

| Feature | PostgreSQL | MySQL 5.7+ | SQL Server 2016+ | Oracle 12c+ |
|---|---|---|---|---|
| Native JSON type | `JSON`, `JSONB` | `JSON` | No (use `NVARCHAR`) | `CLOB`/`JSON` (21c) |
| Validity enforcement | Type-level | Type-level | `ISJSON()` check | `IS JSON` constraint |
| Extract scalar | `->>` | `->>'$.path'` | `JSON_VALUE()` | `JSON_VALUE()` |
| Extract object/array | `->` | `JSON_EXTRACT()` | `JSON_QUERY()` | `JSON_QUERY()` |
| Path syntax | `'key'` / `'{a,b}'` | `'$.key'` | `'$.key'` | `'$.key'` |
| Expand array to rows | `jsonb_array_elements()` | `JSON_TABLE()` (8.0) | `OPENJSON()` | `JSON_TABLE()` |
| Direct indexing | GIN on JSONB | Not supported | Not supported | Function-based index |
| Indexing workaround | — | Generated column | Computed column | Virtual column |
| Update value | `jsonb_set()` | `JSON_SET()` | `JSON_MODIFY()` | `JSON_MERGEPATCH()` |

---

## 🏗️ Real-World Examples

### Example 1 — User Preferences

Store per-user UI settings without a separate preferences table.

```sql
-- PostgreSQL
CREATE TABLE users (
    id          SERIAL PRIMARY KEY,
    email       TEXT UNIQUE NOT NULL,
    preferences JSONB DEFAULT '{}'
);

INSERT INTO users (email, preferences) VALUES
('priya@example.com', '{"theme": "dark", "language": "en", "timezone": "Asia/Kolkata"}'),
('alex@example.com',  '{"theme": "light", "language": "fr", "timezone": "Europe/Paris"}');

-- Find all users who prefer dark theme
SELECT email FROM users WHERE preferences @> '{"theme": "dark"}';

-- Update a single preference without touching the rest
UPDATE users
SET preferences = jsonb_set(preferences, '{timezone}', '"UTC"')
WHERE email = 'priya@example.com';
```

### Example 2 — Product Metadata (Variable Attributes)

Different product categories have different attributes. JSON handles this cleanly.

```sql
-- PostgreSQL
CREATE TABLE products (
    id       SERIAL PRIMARY KEY,
    name     TEXT NOT NULL,
    price    NUMERIC(10,2) NOT NULL,
    category TEXT NOT NULL,
    attrs    JSONB
);

INSERT INTO products (name, price, category, attrs) VALUES
('Pro Laptop X1', 1299.99, 'electronics', '{"cpu": "M3 Pro", "ram_gb": 18, "storage_gb": 512}'),
('Classic Tee',      29.99, 'clothing',    '{"sizes": ["S","M","L","XL"], "color": "navy"}'),
('SQL Mastery Book', 49.99, 'books',       '{"isbn": "978-3-16-148410-0", "pages": 512, "edition": 3}');

-- Find all electronics with at least 16 GB RAM
SELECT name, price
FROM products
WHERE category = 'electronics'
  AND (attrs->>'ram_gb')::INT >= 16;

-- Create a GIN index to speed up attribute searches
CREATE INDEX idx_products_attrs ON products USING gin(attrs);
```

### Example 3 — Event Payloads / Audit Log

Webhook events and audit logs often arrive as arbitrary JSON blobs. Store them verbatim and query what you need.

```sql
-- PostgreSQL
CREATE TABLE events (
    id         SERIAL PRIMARY KEY,
    source     TEXT NOT NULL,
    event_type TEXT NOT NULL,
    received_at TIMESTAMPTZ DEFAULT now(),
    payload    JSONB NOT NULL
);

INSERT INTO events (source, event_type, payload) VALUES
('stripe',  'payment.succeeded', '{"amount": 4999, "currency": "usd", "customer": "cus_abc123"}'),
('github',  'push',              '{"ref": "refs/heads/main", "commits": 3, "repo": "myapp"}'),
('sendgrid','email.delivered',   '{"to": "user@example.com", "subject": "Welcome!"}');

-- Find all failed Stripe payments in the last 7 days
SELECT received_at, payload->>'customer' AS customer
FROM events
WHERE source = 'stripe'
  AND event_type = 'payment.failed'
  AND received_at > now() - INTERVAL '7 days';
```

---

## ⚖️ When to Use JSON in SQL vs. a Separate NoSQL Database

JSON in SQL is not always the right tool. Here is a practical decision guide:

| Situation | Use JSON in SQL | Use a Dedicated NoSQL DB |
|---|---|---|
| Most of the data is relational, with occasional flexible fields | Yes | No |
| You need ACID transactions across JSON and relational data | Yes | Complex |
| The JSON schema changes rarely | Yes | Yes |
| You need full-text search inside JSON at scale | Marginal | Yes (Elasticsearch) |
| The entire data model is document-centric | No | Yes (MongoDB) |
| You need horizontal write scaling across many servers | No | Yes |
| Team already operates one SQL DB | Yes — keep it simple | Only if justified |

**The hybrid sweet spot:** Use a relational table with regular indexed columns for the fields you filter on most, and a JSONB/JSON column for everything else. You get relational integrity, ACID compliance, and the flexibility of a document store in one system.

---

## 🔑 Key Takeaways

- **JSON in SQL** is a pragmatic escape hatch for semi-structured, variable, or schema-light data — not a replacement for proper relational design.
- **PostgreSQL's JSONB** is the gold standard: binary storage, full operator support, GIN indexes. If you have a choice, use PostgreSQL for JSON-heavy workloads.
- **MySQL** uses a `JSON` type with `$` dollar-sign path syntax. Indexing requires generating a virtual column from the JSON value.
- **SQL Server** stores JSON as `NVARCHAR(MAX)` and provides `JSON_VALUE()`, `JSON_QUERY()`, and the powerful `OPENJSON()` / `FOR JSON` pair.
- **Oracle** uses `IS JSON` constraints on `CLOB` or `VARCHAR2`; Oracle 21c adds a native `JSON` type. `JSON_TABLE()` expands documents to rows.
- Always index what you filter on: GIN index in PostgreSQL, generated column index in MySQL, computed column in SQL Server.
- Keep **stable, frequently queried fields as real columns** and relegate **variable, rarely queried metadata to JSON**. That hybrid design gives you the best of both worlds.

---

## 🧠 Quiz

Test yourself before moving on.

**Question 1**
You are using PostgreSQL. You have a `products` table with a `JSONB` column called `attrs`. You want to find all products where `attrs` contains the key-value pair `"in_stock": true`. Which query is correct?

- A) `SELECT * FROM products WHERE attrs -> 'in_stock' = true;`
- B) `SELECT * FROM products WHERE attrs @> '{"in_stock": true}';`
- C) `SELECT * FROM products WHERE attrs ->> 'in_stock' = true;`
- D) `SELECT * FROM products WHERE attrs ? 'in_stock' = true;`

<details>
<summary>Answer</summary>

**B** is correct. The `@>` containment operator checks whether the JSONB column contains the given JSON subset. Option A compares a JSON value to a boolean without casting. Option C extracts as text but compares to a boolean. Option D checks key existence, not value equality.

</details>

---

**Question 2**
You are using MySQL 8. You have a `users` table with a `JSON` column called `data`. Which statement correctly creates an index that speeds up queries filtering on `data->>'$.role'`?

- A) `CREATE INDEX idx_role ON users USING gin(data);`
- B) `ALTER TABLE users ADD INDEX idx_role ((data->>'$.role'));`
- C) `ALTER TABLE users ADD COLUMN role VARCHAR(50) GENERATED ALWAYS AS (data->>'$.role') STORED; CREATE INDEX idx_role ON users(role);`
- D) `CREATE INDEX idx_role ON users(data->'$.role');`

<details>
<summary>Answer</summary>

**C** is correct. MySQL does not allow direct indexing on a JSON column or expression in older versions; the standard approach is to create a generated (virtual or stored) column that extracts the value, then index that column. Option A uses PostgreSQL syntax. Option B is supported in MySQL 8.0.13+ as a functional index, but option C is more widely compatible and explicit. Option D is invalid syntax.

</details>

---

**Question 3**
You are designing a schema for an e-commerce platform in PostgreSQL. You have product records. Some fields (`name`, `price`, `category`) are queried in every filter. Dozens of other fields (colour, size, material, wattage, ISBN, etc.) vary by category. What is the best approach?

- A) Store everything in a single JSONB column.
- B) Create a separate table for every category with its own columns.
- C) Store `name`, `price`, `category` as regular columns with indexes, and store the variable attributes in a JSONB column with a GIN index.
- D) Move the entire product catalogue to MongoDB and join it into PostgreSQL at query time.

<details>
<summary>Answer</summary>

**C** is correct. This is the hybrid approach: regular columns handle the stable, frequently filtered fields efficiently (with B-tree indexes), while JSONB handles the variable, schema-light attributes (with a GIN index for containment queries). Option A loses the ability to index and filter efficiently on core fields. Option B leads to schema explosion and complex migrations. Option D introduces a multi-database architecture that adds operational complexity without clear benefit here.

</details>

---

*Next chapter: 14 — Window Functions*
