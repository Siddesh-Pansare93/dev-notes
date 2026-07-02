# Creating Databases and Tables (DDL)

> **Chapter 2** | SQL From Scratch Series
> **Difficulty:** Beginner | **Reading time:** ~25 min

---

## DDL kya hota hai?

**DDL (Data Definition Language)** SQL ka woh part hai jo tumhare database ka *structure* define karta hai. Socho tum ek naya ghar bana rahe ho — DDL matlab architect ka blueprint. Pehle building ka structure decide hota hai (kitne rooms, konsi wall kahan), tab jaake furniture (data) andar aata hai.

Core DDL statements ye hain:

| Statement | Purpose |
|---|---|
| `CREATE DATABASE` | Naya database banao |
| `CREATE TABLE` | Table aur uske columns define karo |
| `ALTER TABLE` | Existing table ka structure badlo |
| `DROP TABLE` | Table ko permanently delete karo |
| `TRUNCATE TABLE` | Saare rows hatao, structure rakho |

---

## 🏗️ CREATE DATABASE

Kuch bhi store karne se pehle tumhe ek database chahiye — ek named container jisme tumhare saare tables rahenge. Zomato ke app ko socho: pehle "Zomato" naam ka ek bada building banega, uske andar hi restaurants, orders, users ke alag-alag rooms (tables) honge.

```sql
CREATE DATABASE my_app;
```

Ye syntax PostgreSQL, MySQL, aur SQL Server mein identical hai. Oracle mein concept thoda alag hai (Oracle mein "database" pura server instance hota hai; tum jo banate ho woh usually ek **schema** ya **pluggable database** hota hai).

### Optional: Create karne se pehle check karo

```sql
-- PostgreSQL
CREATE DATABASE my_app;

-- MySQL
CREATE DATABASE IF NOT EXISTS my_app;

-- SQL Server
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'my_app')
    CREATE DATABASE my_app;
```

> [!tip]
> Scripts mein jo baar-baar run ho sakte hain, unme hamesha `IF NOT EXISTS` use karo — isse agar database pehle se hai to error nahi aayega.

---

## 🔀 Database Switch Karna (USE / \c)

Database banane ke baad, apne client ko batana padta hai ki kaunse database mein kaam karna hai. Jaise UPI app mein pehle account select karte ho — "kis bank account se payment karni hai" — waise hi yahan "kis database ke andar kaam karna hai".

| Database | Command | Example |
|---|---|---|
| **MySQL / SQL Server** | `USE database_name;` | `USE my_app;` |
| **PostgreSQL (psql CLI)** | `\c database_name` | `\c my_app` |
| **PostgreSQL (code)** | Connection string parameter | `dbname=my_app` connection URL mein |
| **Oracle** | Directly schema se connect karo | `ALTER SESSION SET CURRENT_SCHEMA = my_app;` |

```sql
-- MySQL and SQL Server
USE my_app;

-- PostgreSQL (psql terminal mein)
\c my_app
```

Ek baar switch karne ke baad, tumhara har statement us database ke andar ke tables ko target karega.

---

## 📋 CREATE TABLE — Poora Syntax

`CREATE TABLE` statement se naya table define hota hai: uska naam, columns, data types, aur constraints.

**Basic structure (sabhi major databases mein same):**

```sql
CREATE TABLE table_name (
    column_name  data_type  [constraints],
    column_name  data_type  [constraints],
    ...
    [table-level constraints]
);
```

**Sabse minimal working example:**

```sql
CREATE TABLE users (
    id   INT,
    name VARCHAR(100)
);
```

### IF NOT EXISTS

```sql
CREATE TABLE IF NOT EXISTS users (
    id   INT,
    name VARCHAR(100)
);
```

`IF NOT EXISTS` PostgreSQL, MySQL, aur SQL Server mein kaam karta hai (SQL Server mein tables ke liye thoda alag pattern hota hai, neeche dekho).

```sql
-- SQL Server pattern (tables ke liye IF NOT EXISTS nahi hota)
IF OBJECT_ID('dbo.users', 'U') IS NULL
    CREATE TABLE users (
        id   INT,
        name VARCHAR(100)
    );
```

---

## 🔢 Column Data Types — Poori Guide

Sahi data type choose karna database design ka sabse important decision hota hai. Galat type storage waste karta hai, bugs create karta hai, ya silently data truncate kar deta hai — jaise Ola mein galat vehicle type select karne se poora ride hi mismatch ho jaaye.

### Integers

**Kya hota hai?** Integer types whole numbers store karte hain — koi decimal nahi. Farak sirf ye hai ki kitni "range" cover karni hai.

| Type | Storage | Range | Notes |
|---|---|---|---|
| `TINYINT` | 1 byte | 0–255 (unsigned) / -128–127 | Sirf MySQL mein |
| `SMALLINT` | 2 bytes | -32,768 to 32,767 | Sab major DBs mein |
| `INT` / `INTEGER` | 4 bytes | ~-2.1B to 2.1B | Sab major DBs mein |
| `BIGINT` | 8 bytes | ~-9.2 quintillion to 9.2Q | Sab major DBs mein |

```sql
-- Zyada IDs aur counts ke liye INT use karo
-- Agar 2 billion se zyada rows expect ho (jaise Instagram scale) to BIGINT use karo
-- Chhote lookup tables ke liye (status codes waghera) SMALLINT use karo

user_id   BIGINT,
age       SMALLINT,
quantity  INT
```

### Decimals aur Floating Point

**Kyun zaruri hai?** Agar tum paise (money) store kar rahe ho — jaise Paytm wallet balance — to exact precision chahiye, warna paisa idhar-udhar ho sakta hai.

| Type | Exact hai? | Use Case |
|---|---|---|
| `DECIMAL(p, s)` / `NUMERIC(p, s)` | Haan (exact) | Money, measurements jahan precision matter kare |
| `FLOAT` | Nahi (approximate) | Scientific data jahan thoda rounding chalta hai |
| `REAL` | Nahi (approximate) | FLOAT jaisa hi but kam precision |

`DECIMAL(10, 2)` ka matlab hai kul 10 digits, jisme se 2 decimal point ke baad. Ye money store karne ka standard tarika hai.

```sql
price       DECIMAL(10, 2),   -- jaise, 99999999.99
tax_rate    DECIMAL(5, 4),    -- jaise, 0.0825
weight_kg   FLOAT
```

> [!warning]
> Money ke liye kabhi bhi `FLOAT` ya `REAL` use mat karo. Floating-point arithmetic mein rounding errors aati hain (binary mein 0.1 + 0.2 = 0.30000000000000004 hota hai). Socho CRED bill mein 1 paisa idhar-udhar ho jaaye — chalega kya?

### Text Types

**Kya hota hai?** Text store karne ke liye alag-alag types hote hain — kuch fixed length, kuch variable, kuch unlimited.

| Type | PostgreSQL | MySQL | SQL Server | Oracle |
|---|---|---|---|---|
| Fixed-length string | `CHAR(n)` | `CHAR(n)` | `CHAR(n)` | `CHAR(n)` |
| Variable-length string | `VARCHAR(n)` | `VARCHAR(n)` | `VARCHAR(n)` / `NVARCHAR(n)` | `VARCHAR2(n)` |
| Unlimited text | `TEXT` | `TEXT` | `VARCHAR(MAX)` | `CLOB` |
| Unicode variable | `TEXT` (default UTF-8) | `NVARCHAR(n)` | `NVARCHAR(n)` | `NVARCHAR2(n)` |

**Zaruri differences:**
- **SQL Server** `VARCHAR` (ASCII) aur `NVARCHAR` (Unicode) mein farak karta hai. International apps ke liye (jaise Hindi, emoji support chahiye) hamesha `NVARCHAR` use karo.
- **Oracle** `VARCHAR` ki jagah `VARCHAR2` use karta hai (VARCHAR technically Oracle mein reserved hai).
- **PostgreSQL** default mein sab kuch UTF-8 mein store karta hai, isliye `TEXT` aur `VARCHAR(n)` internally functionally same hote hain.

```sql
-- PostgreSQL
username    VARCHAR(50),
bio         TEXT,

-- MySQL
username    VARCHAR(50),
bio         TEXT,

-- SQL Server (Unicode-safe)
username    NVARCHAR(50),
bio         NVARCHAR(MAX),

-- Oracle
username    VARCHAR2(50),
bio         CLOB
```

> [!info]
> **CHAR vs VARCHAR kab use karein:** `CHAR(n)` sirf tabhi use karo jab data truly fixed-length ho (country codes: `CHAR(2)`, phone extensions). Baaki sab jagah `VARCHAR(n)` zyada space-efficient hota hai.

### Boolean

**Kya hota hai?** True/False store karne ka type — jaise "is_active" flag, "order_delivered" flag waghera.

| Database | Type | True Value | False Value |
|---|---|---|---|
| **PostgreSQL** | `BOOLEAN` | `TRUE`, `'t'`, `'yes'`, `1` | `FALSE`, `'f'`, `'no'`, `0` |
| **MySQL** | `BOOLEAN` / `TINYINT(1)` | `1` | `0` |
| **SQL Server** | `BIT` | `1` | `0` |
| **Oracle** | Native boolean nahi hai* | — | — |

*Oracle ne `BOOLEAN` Oracle Database 23c mein add kiya, lekin zyadatar production Oracle environments mein tum `NUMBER(1)` (0 ya 1) ya `CHAR(1)` ('Y' ya 'N') use karoge.

```sql
-- PostgreSQL / MySQL
is_active   BOOLEAN DEFAULT TRUE,

-- SQL Server
is_active   BIT DEFAULT 1,

-- Oracle (traditional workaround)
is_active   NUMBER(1) DEFAULT 1 CHECK (is_active IN (0, 1))
```

### Date aur Time

**Kyun zaruri hai?** Ek order kab place hua, kab deliver hua — ye track karne ke liye sahi date/time type choose karna zaruri hai, especially jab users alag-alag timezones (Mumbai vs US) se ho.

| Type | Description | PostgreSQL | MySQL | SQL Server | Oracle |
|---|---|---|---|---|---|
| Sirf Date | Year, month, day | `DATE` | `DATE` | `DATE` | `DATE` |
| Sirf Time | Hours, minutes, seconds | `TIME` | `TIME` | `TIME` | — |
| Date + Time | Timezone nahi | `TIMESTAMP` | `DATETIME` | `DATETIME` | `TIMESTAMP` |
| Date + Time (TZ-aware) | Timezone offset ke saath | `TIMESTAMPTZ` | — | `DATETIMEOFFSET` | `TIMESTAMP WITH TIME ZONE` |

```sql
-- PostgreSQL (sabse expressive)
created_at   TIMESTAMPTZ DEFAULT NOW(),   -- timezone bhi store karta hai
event_date   DATE,
start_time   TIME,

-- MySQL
created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
event_date   DATE,

-- SQL Server
created_at   DATETIME2 DEFAULT GETUTCDATE(),
event_date   DATE,

-- Oracle
created_at   TIMESTAMP DEFAULT SYSTIMESTAMP,
event_date   DATE   -- Oracle ka DATE mein time component bhi hota hai!
```

> [!warning]
> **Gotcha — Oracle DATE:** Oracle mein, `DATE` date AUR time (seconds tak) dono store karta hai. Agar sirf date chahiye to `TRUNC(column)` se truncate karna padega.

> [!tip]
> **Best practice:** Timestamps hamesha UTC mein store karo. PostgreSQL mein `TIMESTAMPTZ` use karo ya MySQL/SQL Server mein `DATETIME` mein UTC values store karo — jaise IRCTC ka server chahe kisi bhi region mein ho, ticket booking time hamesha ek standard timezone mein hi store hota hai.

### UUID (Universally Unique Identifiers)

**Kya hota hai?** UUID ek 128-bit unique identifier hai — perfect for distributed systems jahan ek central auto-increment counter pe bharosa nahi kar sakte (jaise multiple servers alag-alag jagah se orders create kar rahe hon, Swiggy ke multiple regional servers ki tarah).

| Database | Native Type | Storage |
|---|---|---|
| **PostgreSQL** | `UUID` | 16 bytes (efficient) |
| **MySQL** | `CHAR(36)` ya `BINARY(16)` | 36 bytes string ki tarah |
| **SQL Server** | `UNIQUEIDENTIFIER` | 16 bytes |
| **Oracle** | `RAW(16)` ya `CHAR(36)` | — |

```sql
-- PostgreSQL
id   UUID DEFAULT gen_random_uuid(),

-- MySQL
id   CHAR(36) DEFAULT (UUID()),

-- SQL Server
id   UNIQUEIDENTIFIER DEFAULT NEWID(),
```

### JSON Storage

**Kya hota hai?** Modern apps aksar semi-structured data store karte hain (jaise user preferences, ek flexible object jiska shape fix nahi hai). Har database iska alag tarike se handle karta hai:

| Database | Type | Notes |
|---|---|---|
| **PostgreSQL** | `JSONB` (preferred) ya `JSON` | `JSONB` binary-stored hai, indexable hai, aur queries ke liye fast hai |
| **MySQL** | `JSON` | MySQL 5.7 se available, query functions ke saath |
| **SQL Server** | `NVARCHAR(MAX)` | Native JSON type nahi hai; JSON functions strings pe kaam karte hain |
| **Oracle** | `JSON` (21c+) ya `CLOB` | Native JSON type Oracle 21c mein add hua |

```sql
-- PostgreSQL (JSONB hamesha JSON se better hota hai)
metadata     JSONB,
preferences  JSONB DEFAULT '{}',

-- MySQL
metadata     JSON,

-- SQL Server (native type nahi hai — NVARCHAR use karo)
metadata     NVARCHAR(MAX),   -- JSON functions use karo: JSON_VALUE(), JSON_QUERY()

-- Oracle (21c+)
metadata     JSON,
```

### Auto-Increment Primary Keys

**Kyun zaruri hai?** Har row ko ek unique ID chahiye, aur usko manually track karne ke bajaye database khud increment kare — ye sabse bada syntax difference hai databases ke beech:

```sql
-- PostgreSQL: SERIAL (legacy, abhi bhi widely use hota hai)
CREATE TABLE users (
    id   SERIAL PRIMARY KEY
);

-- PostgreSQL: GENERATED AS IDENTITY (SQL standard, modern code mein preferred)
CREATE TABLE users (
    id   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
);

-- MySQL
CREATE TABLE users (
    id   INT AUTO_INCREMENT PRIMARY KEY
);

-- SQL Server
CREATE TABLE users (
    id   INT IDENTITY(1,1) PRIMARY KEY
    -- IDENTITY(seed, increment): 1 se start, 1-1 karke badhega
);

-- Oracle
CREATE TABLE users (
    id   INT GENERATED AS IDENTITY PRIMARY KEY
);
-- ya SEQUENCE use karke (purana approach):
-- CREATE SEQUENCE users_seq START WITH 1 INCREMENT BY 1;
```

---

## 🔒 Constraints

**Kya hota hai?** Constraints tumhare columns ke data pe rules enforce karte hain — jaise ek bouncer jo galat entry (invalid data) ko andar aane hi nahi deta. Ye **inline** (column ke saath) ya **table level** (sab columns ke baad) define ho sakte hain.

### Inline Constraints

```sql
CREATE TABLE users (
    id          INT          PRIMARY KEY,
    email       VARCHAR(255) NOT NULL UNIQUE,
    age         INT          CHECK (age >= 0 AND age <= 150),
    country     CHAR(2)      DEFAULT 'US',
    role        VARCHAR(20)  DEFAULT 'user'
);
```

### Table-Level Constraints

Table-level constraints tab kaam aate hain jab constraint **multiple columns** ko span kare (composite keys, composite unique constraints):

```sql
CREATE TABLE order_items (
    order_id    INT NOT NULL,
    product_id  INT NOT NULL,
    quantity    INT NOT NULL CHECK (quantity > 0),
    price       DECIMAL(10,2) NOT NULL,

    -- Table-level constraints
    PRIMARY KEY (order_id, product_id),                  -- composite PK
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT uq_order_product UNIQUE (order_id, product_id)
);
```

### Constraint Quick Reference

| Constraint | Purpose | Example |
|---|---|---|
| `PRIMARY KEY` | Har row ke liye unique, not-null identifier | `id INT PRIMARY KEY` |
| `NOT NULL` | Column khaali nahi ho sakta | `name VARCHAR(100) NOT NULL` |
| `UNIQUE` | Column ki saari values distinct honi chahiye | `email VARCHAR(255) UNIQUE` |
| `DEFAULT` | Value use hogi jab kuch diya na ho | `status VARCHAR(20) DEFAULT 'active'` |
| `CHECK` | Custom rule jo value ko satisfy karna padega | `CHECK (age >= 18)` |
| `FOREIGN KEY` | Doosre table ki row se link karta hai | `REFERENCES users(id)` |

---

## ✏️ ALTER TABLE — Existing Tables Modify Karna

Ek baar table exist karne lage aur usme data aa jaaye, tumhe uska structure change karna pad sakta hai — bina table ko drop aur recreate kiye. Jaise ek building already ban chuki hai, lekin ab tumhe ek extra room add karna hai — pura ghar todna nahi padta.

### ADD COLUMN — Sab databases mein same

```sql
ALTER TABLE users ADD COLUMN phone_number VARCHAR(20);

-- Default value ke saath
ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
```

### DROP COLUMN

```sql
-- PostgreSQL, MySQL, Oracle
ALTER TABLE users DROP COLUMN phone_number;

-- SQL Server
ALTER TABLE users DROP COLUMN phone_number;
-- Agar default constraint hai to pehle usko drop karo:
ALTER TABLE users DROP CONSTRAINT DF_users_phone_number;
ALTER TABLE users DROP COLUMN phone_number;
```

### RENAME COLUMN

Ye databases ke beech sabse inconsistent operation hai:

```sql
-- PostgreSQL (v9.6 se)
ALTER TABLE users RENAME COLUMN username TO display_name;

-- MySQL (8.0 se)
ALTER TABLE users RENAME COLUMN username TO display_name;

-- SQL Server
EXEC sp_rename 'users.username', 'display_name', 'COLUMN';

-- Oracle
ALTER TABLE users RENAME COLUMN username TO display_name;
```

### COLUMN TYPE Change Karna

Column ka data type change karna risky ho sakta hai agar existing data incompatible hai. Hamesha ek copy pe test karo pehle.

```sql
-- PostgreSQL
ALTER TABLE users ALTER COLUMN age TYPE BIGINT;

-- MySQL
ALTER TABLE users MODIFY COLUMN age BIGINT;

-- SQL Server
ALTER TABLE users ALTER COLUMN age BIGINT;

-- Oracle
ALTER TABLE users MODIFY (age BIGINT);
```

### Table Rename Karna

```sql
-- PostgreSQL
ALTER TABLE old_name RENAME TO new_name;

-- MySQL
RENAME TABLE old_name TO new_name;

-- SQL Server
EXEC sp_rename 'old_name', 'new_name';

-- Oracle
ALTER TABLE old_name RENAME TO new_name;
```

---

## 🗑️ DROP TABLE

`DROP TABLE` ek table aur uska saara data permanently delete kar deta hai. Ye undo nahi ho sakta (jab tak tum transaction mein nahi ho ya backup nahi hai). Socho pura Zomato restaurant listing hi delete ho jaaye — koi undo button nahi hai.

```sql
-- Basic drop (agar table exist nahi karta to error dega)
DROP TABLE users;

-- Safe drop (error nahi dega agar table exist nahi karta) — PostgreSQL & MySQL
DROP TABLE IF EXISTS users;

-- SQL Server
IF OBJECT_ID('dbo.users', 'U') IS NOT NULL
    DROP TABLE users;
```

### CASCADE vs RESTRICT

Jab doosre tables ke foreign keys us table ko reference kar rahe hon jise tum drop kar rahe ho:

```sql
-- PostgreSQL: table aur uske saare dependent objects drop karo
DROP TABLE users CASCADE;

-- PostgreSQL: agar dependencies exist karti hain to drop karne se mana kar do (default behavior)
DROP TABLE users RESTRICT;
```

> [!warning]
> `CASCADE` child tables ke foreign key constraints bhi drop kar dega — isse carefully use karo.

---

## ⚡ TRUNCATE TABLE

`TRUNCATE` ek table ke saare rows `DELETE` se bahut fast hata deta hai kyunki ye individual row deletions log nahi karta. Table ka structure intact rehta hai.

```sql
TRUNCATE TABLE users;
```

| Feature | `DELETE` | `TRUNCATE` |
|---|---|---|
| Saare rows remove karta hai | Haan | Haan |
| WHERE clause ho sakta hai | Haan | Nahi |
| Triggers fire hote hain | Haan | Kabhi-kabhi |
| Transaction rollback | Haan (zyadatar DBs) | PostgreSQL: Haan; MySQL: Nahi |
| Auto-increment reset karta hai | Nahi | Haan (MySQL/SQL Server) |
| Speed | Slower | Bahut fast |

```sql
-- PostgreSQL: ek saath multiple tables truncate karo
TRUNCATE TABLE posts, comments, users RESTART IDENTITY CASCADE;

-- MySQL
TRUNCATE TABLE users;  -- AUTO_INCREMENT counter reset ho jaata hai

-- SQL Server
TRUNCATE TABLE users;  -- IDENTITY counter reset ho jaata hai
```

---

## 📁 Schemas — Tables Ko Organize Karna

**Kya hota hai?** Ek **schema** ek namespace hai jo related tables ko database ke andar group karta hai. Ise apne database ke andar ek folder jaisa socho — jaise BigBasket app mein "Groceries" aur "Household" ke alag sections hote hain, waise hi ek database mein `auth` aur `blog` jaise alag schemas ho sakte hain.

```sql
-- PostgreSQL: schemas create karo
CREATE SCHEMA auth;
CREATE SCHEMA blog;
CREATE SCHEMA analytics;

-- Schemas ke andar tables create karo
CREATE TABLE auth.users (...);
CREATE TABLE blog.posts (...);
CREATE TABLE analytics.events (...);

-- Cross-schema reference
SELECT u.name FROM auth.users u
JOIN blog.posts p ON p.user_id = u.id;
```

**MySQL note:** MySQL mein, `SCHEMA` aur `DATABASE` synonyms hain — `CREATE SCHEMA my_app` aur `CREATE DATABASE my_app` bilkul same cheez karte hain. MySQL mein database ke andar sub-schemas nahi hote.

**SQL Server:** PostgreSQL jaisa hi schema concept hai. Default schema `dbo` (database owner) hai. Objects ko `schema_name.table_name` ki tarah reference karte ho.

**PostgreSQL default schema:** Default schema `public` hai. Jab tum bina schema specify kiye table create karte ho, woh `public` mein chala jaata hai.

```sql
-- PostgreSQL mein ye dono equivalent hain:
CREATE TABLE users (...);
CREATE TABLE public.users (...);
```

---

## 🚀 Full Working Example: Blog Platform Schema

Chalo ek real schema banate hain ek blog platform ke liye — users, posts, aur comments ke saath. Ye example **PostgreSQL syntax** use karta hai, doosre databases ke differences ke notes ke saath.

```sql
-- ================================================
-- Blog Platform Schema
-- ================================================

-- 1. Database create aur select karo
CREATE DATABASE blog_platform;
-- \c blog_platform   (psql)

-- 2. Tables organize karne ke liye schemas create karo
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS content;

-- 3. Users table (auth schema mein)
CREATE TABLE IF NOT EXISTS auth.users (
    id              INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username        VARCHAR(50)  NOT NULL UNIQUE,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   CHAR(60)     NOT NULL,            -- bcrypt hash hamesha 60 chars ka hota hai
    display_name    VARCHAR(100),
    bio             TEXT,
    avatar_url      VARCHAR(500),
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    is_admin        BOOLEAN      NOT NULL DEFAULT FALSE,
    email_verified  BOOLEAN      NOT NULL DEFAULT FALSE,
    preferences     JSONB        DEFAULT '{}',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_username_length CHECK (LENGTH(username) >= 3)
);

-- 4. Posts table (content schema mein)
CREATE TABLE IF NOT EXISTS content.posts (
    id           INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id      INT          NOT NULL,
    title        VARCHAR(300) NOT NULL,
    slug         VARCHAR(350) NOT NULL UNIQUE,        -- title ka URL-friendly version
    body         TEXT         NOT NULL,
    summary      VARCHAR(500),
    status       VARCHAR(20)  NOT NULL DEFAULT 'draft',
    view_count   INT          NOT NULL DEFAULT 0,
    published_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_posts_user
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT chk_post_status
        CHECK (status IN ('draft', 'published', 'archived')),
    CONSTRAINT chk_view_count
        CHECK (view_count >= 0)
);

-- 5. Comments table (content schema mein)
CREATE TABLE IF NOT EXISTS content.comments (
    id         INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    post_id    INT  NOT NULL,
    user_id    INT  NOT NULL,
    parent_id  INT,                                    -- NULL = top-level comment
    body       TEXT NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_comments_post
        FOREIGN KEY (post_id) REFERENCES content.posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_user
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_parent
        FOREIGN KEY (parent_id) REFERENCES content.comments(id) ON DELETE SET NULL,
    CONSTRAINT chk_comment_not_empty
        CHECK (LENGTH(TRIM(body)) > 0)
);

-- 6. Post tags (many-to-many junction table)
CREATE TABLE IF NOT EXISTS content.tags (
    id   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    slug VARCHAR(60) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS content.post_tags (
    post_id INT NOT NULL,
    tag_id  INT NOT NULL,

    PRIMARY KEY (post_id, tag_id),
    CONSTRAINT fk_post_tags_post FOREIGN KEY (post_id) REFERENCES content.posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_post_tags_tag  FOREIGN KEY (tag_id)  REFERENCES content.tags(id)  ON DELETE CASCADE
);
```

**Users table ka MySQL equivalent (no schemas, different types):**

```sql
-- MySQL version
CREATE DATABASE IF NOT EXISTS blog_platform;
USE blog_platform;

CREATE TABLE IF NOT EXISTS users (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    username       VARCHAR(50)  NOT NULL UNIQUE,
    email          VARCHAR(255) NOT NULL UNIQUE,
    password_hash  CHAR(60)     NOT NULL,
    display_name   VARCHAR(100),
    bio            TEXT,
    is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
    preferences    JSON         DEFAULT ('{}'),
    created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## 🔧 Post-Creation Alterations

Schema live hone ke baad, requirements badalti rehti hain. Yahan hai ki tum isko kaise evolve karoge:

```sql
-- Follower count cache column add karo
ALTER TABLE auth.users ADD COLUMN follower_count INT NOT NULL DEFAULT 0;

-- Posts mein reading time estimate add karo
ALTER TABLE content.posts ADD COLUMN reading_time_minutes SMALLINT;

-- Ek badly named column ko rename karo
ALTER TABLE content.posts RENAME COLUMN body TO content;

-- Ek column drop karo jo ab zaruri nahi
ALTER TABLE auth.users DROP COLUMN avatar_url;

-- Ek column ko widen karo jo bahut chhota nikla
ALTER TABLE auth.users ALTER COLUMN display_name TYPE VARCHAR(200);
```

---

## Key Takeaways

- **DDL** structure ke liye hai; DML (INSERT/UPDATE/DELETE) data ke liye hai. Dono ko mind mein alag rakho.
- Scripts ko **idempotent** (multiple baar run karna safe) banane ke liye hamesha `IF NOT EXISTS` / `IF EXISTS` use karo.
- Data types carefully choose karo: money ke liye **DECIMAL** use karo, PostgreSQL mein kisi bhi datetime ke liye **TIMESTAMPTZ** use karo jise alag-alag timezones ke users dekhenge.
- **SERIAL** vs **GENERATED AS IDENTITY**: PostgreSQL mein dono kaam karte hain, lekin `GENERATED AS IDENTITY` SQL standard hai aur naye code mein preferred hai.
- **TRUNCATE** `DELETE` nahi hai — ye faster hai but less flexible hai aur triggers fire nahi kar sakta.
- PostgreSQL aur SQL Server mein tables organize karne ke liye **schemas** use karo. MySQL mein, schema sirf database ka doosra naam hai.
- Auto-increment syntax databases ke beech sabse bada cross-database gotcha hai: `AUTO_INCREMENT` (MySQL), `IDENTITY(1,1)` (SQL Server), `SERIAL` / `GENERATED AS IDENTITY` (PostgreSQL).

---

## Quiz

Aage badhne se pehle apni understanding test karo.

**Question 1:** Tum ek e-commerce store ke liye product prices store karne wala table design kar rahe ho. Price column ke liye konsa data type use karoge, aur kyun?

> A) `FLOAT(10, 2)` — flexible hai
> B) `DECIMAL(10, 2)` — exact hai
> C) `INT` — prices to bas numbers hi hain
> D) `VARCHAR(20)` — prices mein "$" jaise symbols include ho sakte hain

**Question 2:** Tum SQL Server database pe kaam kar rahe ho aur user ki biography store karni hai (potentially hazaron characters, Unicode characters required). Konsa column type choose karoge?

> A) `VARCHAR(MAX)`
> B) `NVARCHAR(MAX)`
> C) `TEXT`
> D) `CHAR(5000)`

**Question 3:** Tumhare `users` table mein 1 crore rows hain. Ek bug ki wajah se saare email_verified flags galti se TRUE set ho gaye. Tumhe unko jitna fast ho sake FALSE reset karna hai. Kya karoge?

> A) `DELETE FROM users` phir saare rows re-insert karo
> B) `TRUNCATE TABLE users` — column clear karne ka fastest tarika
> C) `UPDATE users SET email_verified = FALSE` — ye hi correct targeted approach hai
> D) `DROP TABLE users` phir usse recreate karo

---

**Answers:** 1-B (DECIMAL exact hai; floating-point financial calculations mein rounding errors introduce kar sakta hai) | 2-B (NVARCHAR Unicode store karta hai; SQL Server mein VARCHAR sirf ASCII hota hai) | 3-C (TRUNCATE saare rows hata dega including good data; UPDATE sirf us column ko target karta hai jise fix karna hai)

---

*Next Chapter: Inserting, Updating, and Deleting Data (DML) →*
