# 13. JSON in SQL Databases

> **Prerequisite:** Basic `SELECT`, `INSERT`, `UPDATE` aur table design ka thoda idea hona chahiye, tabhi ye chapter maza dega.

---

## 🤔 Relational Database Ke Andar JSON Kyun Rakhein?

Socho relational database ek strict Excel sheet jaisa hai — har row mein same columns, har column ka fixed type. Orders, invoices, user accounts jaise data ke liye ye perfect hai kyunki shape fix hai, kabhi nahi badalta.

Lekin real-world apps mein aisa data bhi aata hai jo columns mein fit hi nahi hota:

- Ek product catalogue jahan har category ke attributes alag hain (book ka ISBN hota hai, shirt ka size-color, laptop ka CPU-RAM)
- User preferences jo har user ke hisaab se bahut alag hoti hain
- Webhook payloads ya event logs jo external systems se aate hain
- Feature flags ya config blobs jo records ke saath attach hote hain

Ab tumhare paas do purane options hain: dus-dus nullable columns bana do (ganda lagta hai), ya phir bahut saari related tables bana ke joins karo (bahut zyada joins). JSON tumhe teesra rasta deta hai: **flexible part ko JSON document mein store karo, aur structured part ko normal columns mein rakho**.

### Core Fayde

Zomato ka example lo — order table mein `order_id`, `restaurant_id`, `total_amount` fix columns hain. Lekin "customisations" (extra cheese, spice level, no onion) har order mein alag ho sakti hain — ye JSON mein daal do.

| Fayda | Explanation |
|---|---|
| **Flexibility** | Naye keys JSON mein add kar sakte ho bina `ALTER TABLE` migration ke |
| **Kam joins** | Related data ko embed kar do (jaise address user row ke andar) alag table banane ke bajaye |
| **Semi-structured data** | Jahan har row ka shape alag ho, wahan kaam aata hai |
| **Single source of truth** | Sab kuch ek hi DB mein rakho, alag se document store mix karne ki zarurat nahi |

> **Golden rule:** JSON ek tool hai, good relational design ka replacement nahi. Row ke *variable* parts ke liye JSON use karo; *stable, query-hone-wale* parts ke liye normal columns hi rakho.

---

## 🗃️ JSON vs JSONB — PostgreSQL Ka Farak

PostgreSQL mein **do** JSON column types milte hain. Ye decision bahut important hai:

| Feature | `JSON` | `JSONB` |
|---|---|---|
| Storage format | Plain text (jaisa tumne likha waisa hi) | Binary (parsed, decompose hua) |
| Whitespace preserve karta hai | Haan | Nahi |
| Key order preserve karta hai | Haan | Nahi (internally sort ho jata hai) |
| Duplicate keys | Sab keep karta hai silently | Har key ka sirf last value rakhta hai |
| Write speed | Thodi fast (parsing nahi hoti) | Thodi slow (write pe parse hota hai) |
| Read/query speed | **Slow** (har baar text re-parse hota hai) | **Fast** (already parsed hai) |
| Indexing | Support nahi hai | GIN index support karta hai |
| Operators (`@>`, `?`, etc.) | Support nahi | **Support hai** |

**Almost har real-world case mein `JSONB` hi use karo.** `JSON` tabhi lena jab tumhe original document ka byte-for-byte exact text preserve karna ho (jaise client ne kya bheja tha, uska audit rakhna ho).

```sql
-- PostgreSQL: JSONB ke saath table banana
CREATE TABLE users (
    id        SERIAL PRIMARY KEY,
    name      TEXT NOT NULL,
    email     TEXT NOT NULL,
    data      JSONB          -- flexible metadata yahan rahega
);

-- JSON data insert karna
INSERT INTO users (name, email, data) VALUES (
    'Priya Sharma',
    'priya@example.com',
    '{"role": "admin", "theme": "dark", "notifications": {"email": true, "sms": false}}'
);
```

---

## 🐘 PostgreSQL — JSON Operators Aur Functions

PostgreSQL ka JSON support sabse best hai kisi bhi major relational database mein. Poora toolkit dekho:

### Extraction Operators

```sql
-- -> JSON return karta hai (jab result object ya array ho tab useful)
SELECT data -> 'role' FROM users;
-- Result: "admin"  (ye JSON string hai — quotes note karo)

-- ->> TEXT return karta hai (simple values ke liye sabse common)
SELECT data ->> 'role' FROM users;
-- Result: admin  (plain text, koi quotes nahi)

-- Nested path #> se (JSON return karta hai)
SELECT data #> '{notifications, email}' FROM users;
-- Result: true

-- Nested path #>> se (TEXT return karta hai)
SELECT data #>> '{notifications, email}' FROM users;
-- Result: true  (text ke roop mein)

-- Array element index se (0-based)
-- Maan lo data = '{"tags": ["sql", "backend", "api"]}'
SELECT data -> 'tags' -> 0 FROM users;
-- Result: "sql"
```

### Existence Aur Containment Operators (Sirf JSONB)

```sql
-- ? check karta hai ki top-level key exist karti hai ya nahi
SELECT * FROM users WHERE data ? 'role';

-- @> containment check karta hai: "kya ye JSONB us subset ko contain karta hai?"
SELECT * FROM users WHERE data @> '{"role": "admin"}';

-- <@ reverse containment check hai
SELECT * FROM users WHERE '{"role": "admin"}' <@ data;

-- ?| check karta hai ki in mein se KOI EK key exist karti hai
SELECT * FROM users WHERE data ?| ARRAY['role', 'permissions'];

-- ?& check karta hai ki SAARI keys exist karti hain
SELECT * FROM users WHERE data ?& ARRAY['role', 'theme'];
```

### Useful Functions

```sql
-- jsonb_object_keys: saari top-level keys list karo
SELECT jsonb_object_keys(data) FROM users WHERE id = 1;

-- jsonb_array_elements: JSON array ko rows mein expand karo
SELECT jsonb_array_elements(data -> 'tags') AS tag FROM users WHERE id = 1;

-- jsonb_set: JSONB ke andar ek value update karo
UPDATE users
SET data = jsonb_set(data, '{theme}', '"light"')
WHERE id = 1;

-- - operator se key remove karo
UPDATE users
SET data = data - 'theme'
WHERE id = 1;

-- || se do JSONB objects merge karo
UPDATE users
SET data = data || '{"verified": true}'
WHERE id = 1;
```

### GIN Index — JSONB Queries Ko Fast Banana

Bina index ke, har JSONB query full table scan karti hai. GIN (Generalized Inverted Index) index ye problem fix karta hai — jaise Swiggy pe restaurant search ke liye index hota hai taaki har baar poori list scan na karni pade:

```sql
-- Poore JSONB column ko index karo (?, ?|, ?&, @> support karta hai)
CREATE INDEX idx_users_data ON users USING gin(data);

-- Ek specific path ko index karo (zyada targeted, chhota index)
CREATE INDEX idx_users_role ON users USING gin((data -> 'role'));
```

GIN index banane ke baad, `WHERE data @> '{"role": "admin"}'` jaisi queries lakhon rows pe bhi bahut fast ho jaati hain.

---

## 🐬 MySQL — JSON Support (5.7+)

MySQL ne version 5.7 mein native JSON support add kiya. Column type simply `JSON` hai, aur insert pe MySQL check karta hai ki value well-formed hai ya nahi.

```sql
-- JSON column ke saath table banana
CREATE TABLE users (
    id    INT AUTO_INCREMENT PRIMARY KEY,
    name  VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    data  JSON
);

-- Insert karna
INSERT INTO users (name, email, data) VALUES (
    'Priya Sharma',
    'priya@example.com',
    '{"role": "admin", "theme": "dark", "notifications": {"email": true, "sms": false}}'
);
```

### Values Extract Karna

```sql
-- JSON_EXTRACT — ek JSON value return karta hai
SELECT JSON_EXTRACT(data, '$.role') FROM users;
-- Result: "admin"  (quotes ke saath — kyunki ye JSON hai)

-- Inline shorthand operator -> (JSON_EXTRACT jaisa hi)
SELECT data->'$.role' FROM users;

-- ->> shorthand (unquote karta hai, plain text deta hai)
SELECT data->>'$.role' FROM users;
-- Result: admin  (quotes nahi)

-- Nested path
SELECT data->>'$.notifications.email' FROM users;

-- Array element
SELECT data->>'$.tags[0]' FROM users;
```

### JSON Values Modify Karna

```sql
-- JSON_SET: value insert ya replace karo
UPDATE users
SET data = JSON_SET(data, '$.theme', 'light')
WHERE id = 1;

-- JSON_INSERT: sirf tab insert karo jab path exist na kare
UPDATE users
SET data = JSON_INSERT(data, '$.verified', true)
WHERE id = 1;

-- JSON_REMOVE: path delete karo
UPDATE users
SET data = JSON_REMOVE(data, '$.theme')
WHERE id = 1;

-- JSON_REPLACE: sirf tab replace karo jab path exist kare (warna kuch nahi hoga)
UPDATE users
SET data = JSON_REPLACE(data, '$.role', 'viewer')
WHERE id = 1;
```

### Containment Check Karna

```sql
-- JSON_CONTAINS(target, candidate, path)
SELECT * FROM users
WHERE JSON_CONTAINS(data, '"admin"', '$.role');

-- JSON_CONTAINS_PATH check karta hai ki path exist karta hai ya nahi
SELECT * FROM users
WHERE JSON_CONTAINS_PATH(data, 'one', '$.notifications.email');
```

### MySQL Mein Indexing — Generated Columns

MySQL directly JSON column ko index karne nahi deta. Workaround hai **generated column**:

```sql
-- Ek virtual ya stored generated column add karo
ALTER TABLE users
    ADD COLUMN role VARCHAR(50)
        GENERATED ALWAYS AS (data->>'$.role') STORED;

-- Ab generated column ko normal column ki tarah index karo
CREATE INDEX idx_users_role ON users(role);

-- Generated column pe queries automatically index use karengi
SELECT * FROM users WHERE role = 'admin';
```

`STORED` value ko disk pe materialise karta hai (reads fast, storage zyada lagta hai). `VIRTUAL` on-the-fly compute karta hai (extra storage nahi, reads thodi slow).

---

## 🪟 SQL Server — Bina Native Type Ke JSON

SQL Server (2016+) mein dedicated JSON column type nahi hai. JSON documents `NVARCHAR(MAX)` columns mein store hote hain. SQL Server iske badle functions ka set deta hai jo JSON-formatted strings ko samajhte hain.

```sql
-- Table banana (JSON NVARCHAR mein store hoga)
CREATE TABLE users (
    id    INT IDENTITY PRIMARY KEY,
    name  NVARCHAR(100) NOT NULL,
    email NVARCHAR(150) NOT NULL,
    data  NVARCHAR(MAX)
        CONSTRAINT chk_users_data CHECK (ISJSON(data) = 1)
        -- CHECK constraint ensure karta hai ki value valid JSON hai
);

-- Insert karna
INSERT INTO users (name, email, data) VALUES (
    'Priya Sharma',
    'priya@example.com',
    '{"role": "admin", "theme": "dark", "notifications": {"email": true, "sms": false}}'
);
```

### Values Extract Karna

```sql
-- JSON_VALUE: scalar value ko NVARCHAR ke roop mein extract karta hai
SELECT JSON_VALUE(data, '$.role') FROM users;
-- Result: admin

-- JSON_QUERY: object ya array extract karta hai (JSON fragment return karta hai)
SELECT JSON_QUERY(data, '$.notifications') FROM users;
-- Result: {"email": true, "sms": false}

-- Nested path
SELECT JSON_VALUE(data, '$.notifications.email') FROM users;
```

### JSON Ko Rows Mein Expand Karna — OPENJSON

`OPENJSON` SQL Server ki killer feature hai — ye JSON array ko relational result set mein badal deta hai:

```sql
-- Maan lo tumhare paas orders ka JSON array hai
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
-- id, product, qty columns wali proper table return karta hai
```

### SQL Results Ko JSON Mein Convert Karna — FOR JSON

```sql
-- FOR JSON AUTO: SQL Server khud structure figure out karta hai
SELECT id, name, email
FROM users
FOR JSON AUTO;

-- FOR JSON PATH: tum output shape control karte ho
SELECT
    id          AS 'user.id',
    name        AS 'user.name',
    email       AS 'user.email'
FROM users
FOR JSON PATH, ROOT('users');
```

### SQL Server Mein JSON Modify Karna

```sql
-- JSON_MODIFY: value update karo
UPDATE users
SET data = JSON_MODIFY(data, '$.theme', 'light')
WHERE id = 1;
```

---

## 🔶 Oracle — JSON Support (12c+)

Oracle Database 12c mein JSON support aaya, aur 21c mein aur expand hua. SQL Server ki tarah, Oracle bhi JSON ko standard column types (`VARCHAR2`, `CLOB`, ya `BLOB`) mein store karta hai `IS JSON` constraint ke saath validity enforce karne ke liye. Oracle 21c ne native `JSON` data type add kiya.

```sql
-- Oracle: IS JSON constraint se valid JSON enforce karna
CREATE TABLE users (
    id    NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name  VARCHAR2(100) NOT NULL,
    email VARCHAR2(150) NOT NULL,
    data  CLOB CONSTRAINT chk_users_json CHECK (data IS JSON)
);

-- Scalar value extract karna
SELECT JSON_VALUE(data, '$.role') FROM users;

-- Object ya array extract karna
SELECT JSON_QUERY(data, '$.notifications') FROM users;

-- JSON_TABLE: Oracle ka OPENJSON equivalent — JSON ko rows mein badalta hai
SELECT jt.*
FROM users,
     JSON_TABLE(data, '$'
         COLUMNS (
             role     VARCHAR2(50) PATH '$.role',
             theme    VARCHAR2(20) PATH '$.theme'
         )
     ) jt;
```

Oracle 21c dot-notation shorthand bhi support karta hai:

```sql
-- Oracle 21c simplified dot notation
SELECT u.data.role FROM users u;
```

---

## 📊 Cross-Database Feature Comparison

| Feature | PostgreSQL | MySQL 5.7+ | SQL Server 2016+ | Oracle 12c+ |
|---|---|---|---|---|
| Native JSON type | `JSON`, `JSONB` | `JSON` | Nahi (use `NVARCHAR`) | `CLOB`/`JSON` (21c) |
| Validity enforcement | Type-level | Type-level | `ISJSON()` check | `IS JSON` constraint |
| Scalar extract | `->>` | `->>'$.path'` | `JSON_VALUE()` | `JSON_VALUE()` |
| Object/array extract | `->` | `JSON_EXTRACT()` | `JSON_QUERY()` | `JSON_QUERY()` |
| Path syntax | `'key'` / `'{a,b}'` | `'$.key'` | `'$.key'` | `'$.key'` |
| Array ko rows mein expand | `jsonb_array_elements()` | `JSON_TABLE()` (8.0) | `OPENJSON()` | `JSON_TABLE()` |
| Direct indexing | GIN on JSONB | Support nahi | Support nahi | Function-based index |
| Indexing workaround | — | Generated column | Computed column | Virtual column |
| Value update | `jsonb_set()` | `JSON_SET()` | `JSON_MODIFY()` | `JSON_MERGEPATCH()` |

---

## 🏗️ Real-World Examples

### Example 1 — User Preferences

Har user ki UI settings ke liye alag preferences table na banao, JSON mein hi rakh do.

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

-- Un sab users ko dhoondo jo dark theme prefer karte hain
SELECT email FROM users WHERE preferences @> '{"theme": "dark"}';

-- Baaki sab kuch touch kiye bina sirf ek preference update karo
UPDATE users
SET preferences = jsonb_set(preferences, '{timezone}', '"UTC"')
WHERE email = 'priya@example.com';
```

### Example 2 — Product Metadata (Variable Attributes)

Flipkart ki tarah socho — electronics ka attribute hai RAM/CPU, clothing ka attribute hai size/color. Alag-alag category ke alag attributes hote hain, aur JSON isko cleanly handle karta hai.

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

-- Kam se kam 16 GB RAM wale saare electronics dhoondo
SELECT name, price
FROM products
WHERE category = 'electronics'
  AND (attrs->>'ram_gb')::INT >= 16;

-- Attribute searches fast karne ke liye GIN index banao
CREATE INDEX idx_products_attrs ON products USING gin(attrs);
```

### Example 3 — Event Payloads / Audit Log

Webhook events aur audit logs aksar arbitrary JSON blobs ke roop mein aate hain — jaise Paytm ya Razorpay se payment webhook. Unhe as-it-is store karo aur jo chahiye wahi query karo.

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

-- Pichle 7 dino ke saare failed Stripe payments dhoondo
SELECT received_at, payload->>'customer' AS customer
FROM events
WHERE source = 'stripe'
  AND event_type = 'payment.failed'
  AND received_at > now() - INTERVAL '7 days';
```

---

## ⚖️ SQL Mein JSON Kab Use Karein vs. Alag NoSQL Database

SQL mein JSON hamesha sahi tool nahi hota. Ek practical decision guide dekho:

| Situation | SQL Mein JSON Use Karo | Dedicated NoSQL DB Use Karo |
|---|---|---|
| Zyada data relational hai, kabhi-kabhi flexible fields hain | Haan | Nahi |
| JSON aur relational data ke beech ACID transactions chahiye | Haan | Complex ho jayega |
| JSON schema rarely change hota hai | Haan | Haan |
| JSON ke andar large scale full-text search chahiye | Marginal | Haan (Elasticsearch) |
| Poora data model hi document-centric hai | Nahi | Haan (MongoDB) |
| Bahut saare servers pe horizontal write scaling chahiye | Nahi | Haan |
| Team already ek hi SQL DB operate karti hai | Haan — simple rakho | Sirf tabhi jab justified ho |

**Hybrid sweet spot:** Jin fields pe sabse zyada filter karte ho unke liye regular indexed columns use karo, aur baaki sab ke liye JSONB/JSON column. Isse tumhe ek hi system mein relational integrity, ACID compliance, aur document store jaisi flexibility — teeno mil jaate hain.

---

## 🔑 Key Takeaways

- **SQL mein JSON** semi-structured, variable, ya schema-light data ke liye ek pragmatic escape hatch hai — proper relational design ka replacement nahi.
- **PostgreSQL ka JSONB** gold standard hai: binary storage, full operator support, GIN indexes. Agar choice ho, to JSON-heavy workloads ke liye PostgreSQL hi choose karo.
- **MySQL** `JSON` type use karta hai `$` dollar-sign path syntax ke saath. Indexing ke liye JSON value se ek virtual column generate karna padta hai.
- **SQL Server** JSON ko `NVARCHAR(MAX)` mein store karta hai aur `JSON_VALUE()`, `JSON_QUERY()`, aur powerful `OPENJSON()` / `FOR JSON` pair deta hai.
- **Oracle** `CLOB` ya `VARCHAR2` pe `IS JSON` constraints use karta hai; Oracle 21c ek native `JSON` type bhi deta hai. `JSON_TABLE()` documents ko rows mein expand karta hai.
- Jis pe filter karte ho usko hamesha index karo: PostgreSQL mein GIN index, MySQL mein generated column index, SQL Server mein computed column.
- **Stable, frequently-queried fields ko real columns** rakho aur **variable, rarely-queried metadata ko JSON** mein daalo. Ye hybrid design tumhe dono duniya ka best deta hai.

---

## 🧠 Quiz

Aage badhne se pehle khud ko test kar lo.

**Question 1**
Tum PostgreSQL use kar rahe ho. Tumhare paas `products` table hai jisme `JSONB` column hai `attrs`. Tumhe wo saare products dhoondne hain jinke `attrs` mein key-value pair `"in_stock": true` present hai. Konsi query sahi hai?

- A) `SELECT * FROM products WHERE attrs -> 'in_stock' = true;`
- B) `SELECT * FROM products WHERE attrs @> '{"in_stock": true}';`
- C) `SELECT * FROM products WHERE attrs ->> 'in_stock' = true;`
- D) `SELECT * FROM products WHERE attrs ? 'in_stock' = true;`

<details>
<summary>Answer</summary>

**B** sahi hai. `@>` containment operator check karta hai ki JSONB column diye gaye JSON subset ko contain karta hai ya nahi. Option A ek JSON value ko boolean se bina cast kiye compare kar raha hai. Option C text ke roop mein extract karta hai lekin boolean se compare karta hai. Option D sirf key existence check karta hai, value equality nahi.

</details>

---

**Question 2**
Tum MySQL 8 use kar rahe ho. Tumhare paas `users` table hai jisme `JSON` column hai `data`. Konsa statement sahi tarike se ek index create karta hai jo `data->>'$.role'` pe filter karne wali queries ko fast banaye?

- A) `CREATE INDEX idx_role ON users USING gin(data);`
- B) `ALTER TABLE users ADD INDEX idx_role ((data->>'$.role'));`
- C) `ALTER TABLE users ADD COLUMN role VARCHAR(50) GENERATED ALWAYS AS (data->>'$.role') STORED; CREATE INDEX idx_role ON users(role);`
- D) `CREATE INDEX idx_role ON users(data->'$.role');`

<details>
<summary>Answer</summary>

**C** sahi hai. Purane MySQL versions mein JSON column ya expression ko directly index karne ki permission nahi hai; standard approach hai ek generated (virtual ya stored) column banana jo value extract kare, aur phir usi column ko index karna. Option A PostgreSQL syntax use kar raha hai. Option B MySQL 8.0.13+ mein functional index ke roop mein supported hai, lekin option C zyada widely compatible aur explicit hai. Option D invalid syntax hai.

</details>

---

**Question 3**
Tum ek e-commerce platform ka schema PostgreSQL mein design kar rahe ho. Tumhare paas product records hain. Kuch fields (`name`, `price`, `category`) har filter mein query hoti hain. Dusre bahut saare fields (colour, size, material, wattage, ISBN, etc.) category ke hisaab se vary karte hain. Best approach kya hai?

- A) Sab kuch ek single JSONB column mein store karo.
- B) Har category ke liye alag table banao apne khud ke columns ke saath.
- C) `name`, `price`, `category` ko regular columns bana ke index karo, aur variable attributes ko GIN index wale JSONB column mein store karo.
- D) Poora product catalogue MongoDB mein move kar do aur query time pe PostgreSQL mein join karo.

<details>
<summary>Answer</summary>

**C** sahi hai. Ye hybrid approach hai: regular columns stable, frequently-filtered fields ko efficiently handle karte hain (B-tree indexes ke saath), jabki JSONB variable, schema-light attributes ko handle karta hai (containment queries ke liye GIN index ke saath). Option A core fields pe efficiently index aur filter karne ki capability kho deta hai. Option B schema explosion aur complex migrations ki taraf le jaata hai. Option D ek multi-database architecture introduce karta hai jo bina kisi clear benefit ke operational complexity badha deta hai.

</details>

---

*Next chapter: 14 — Window Functions*
