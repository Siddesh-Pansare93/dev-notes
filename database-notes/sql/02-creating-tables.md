# Creating Databases and Tables (DDL)

> **Chapter 2** | SQL From Scratch Series  
> **Difficulty:** Beginner | **Reading time:** ~25 min

---

## What is DDL?

**DDL (Data Definition Language)** is the subset of SQL used to *define and structure* your database. Think of it as the architect's toolkit — you use DDL to draw the blueprint before any data ever flows in.

The core DDL statements are:

| Statement | Purpose |
|---|---|
| `CREATE DATABASE` | Make a new database |
| `CREATE TABLE` | Define a table and its columns |
| `ALTER TABLE` | Modify an existing table structure |
| `DROP TABLE` | Permanently delete a table |
| `TRUNCATE TABLE` | Remove all rows, keep the structure |

---

## 🏗️ CREATE DATABASE

Before you can store anything, you need a database — a named container that holds your tables.

```sql
CREATE DATABASE my_app;
```

This syntax works identically in PostgreSQL, MySQL, and SQL Server. Oracle uses a different concept (a "database" in Oracle is the entire server instance; what you typically create is a **schema** or **pluggable database**).

### Optional: Check before creating

```sql
-- PostgreSQL
CREATE DATABASE my_app;

-- MySQL
CREATE DATABASE IF NOT EXISTS my_app;

-- SQL Server
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'my_app')
    CREATE DATABASE my_app;
```

> **Tip:** Always use `IF NOT EXISTS` in scripts that may be re-run — it prevents an error if the database already exists.

---

## 🔀 Switching Databases (USE / \c)

After creating a database, you need to tell your client which one to work in.

| Database | Command | Example |
|---|---|---|
| **MySQL / SQL Server** | `USE database_name;` | `USE my_app;` |
| **PostgreSQL (psql CLI)** | `\c database_name` | `\c my_app` |
| **PostgreSQL (code)** | Connection string parameter | `dbname=my_app` in connection URL |
| **Oracle** | Connect to schema directly | `ALTER SESSION SET CURRENT_SCHEMA = my_app;` |

```sql
-- MySQL and SQL Server
USE my_app;

-- PostgreSQL (in psql terminal)
\c my_app
```

Once you switch, every statement you write targets tables inside that database.

---

## 📋 CREATE TABLE — Full Syntax

The `CREATE TABLE` statement defines a new table: its name, columns, data types, and constraints.

**Basic structure (identical across all major databases):**

```sql
CREATE TABLE table_name (
    column_name  data_type  [constraints],
    column_name  data_type  [constraints],
    ...
    [table-level constraints]
);
```

**Minimal working example:**

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

`IF NOT EXISTS` works in PostgreSQL, MySQL, and SQL Server (SQL Server uses a different pattern, shown below).

```sql
-- SQL Server pattern (no IF NOT EXISTS for tables)
IF OBJECT_ID('dbo.users', 'U') IS NULL
    CREATE TABLE users (
        id   INT,
        name VARCHAR(100)
    );
```

---

## 🔢 Column Data Types — Comprehensive Guide

Choosing the right data type is one of the most important decisions in database design. The wrong type wastes storage, causes bugs, or silently truncates data.

### Integers

| Type | Storage | Range | Notes |
|---|---|---|---|
| `TINYINT` | 1 byte | 0–255 (unsigned) / -128–127 | MySQL only |
| `SMALLINT` | 2 bytes | -32,768 to 32,767 | All major DBs |
| `INT` / `INTEGER` | 4 bytes | ~-2.1B to 2.1B | All major DBs |
| `BIGINT` | 8 bytes | ~-9.2 quintillion to 9.2Q | All major DBs |

```sql
-- Use INT for most IDs and counts
-- Use BIGINT when you expect more than 2 billion rows (social media scale)
-- Use SMALLINT for small lookup tables (status codes, etc.)

user_id   BIGINT,
age       SMALLINT,
quantity  INT
```

### Decimals and Floating Point

| Type | Exact? | Use Case |
|---|---|---|
| `DECIMAL(p, s)` / `NUMERIC(p, s)` | Yes (exact) | Money, measurements where precision matters |
| `FLOAT` | No (approximate) | Scientific data where small rounding is acceptable |
| `REAL` | No (approximate) | Same as FLOAT but lower precision |

`DECIMAL(10, 2)` means up to 10 digits total, 2 after the decimal point. This is the standard for storing money.

```sql
price       DECIMAL(10, 2),   -- e.g., 99999999.99
tax_rate    DECIMAL(5, 4),    -- e.g., 0.0825
weight_kg   FLOAT
```

> **Rule of thumb:** Never use `FLOAT` or `REAL` for money. Floating-point arithmetic introduces rounding errors (0.1 + 0.2 = 0.30000000000000004 in binary).

### Text Types

| Type | PostgreSQL | MySQL | SQL Server | Oracle |
|---|---|---|---|---|
| Fixed-length string | `CHAR(n)` | `CHAR(n)` | `CHAR(n)` | `CHAR(n)` |
| Variable-length string | `VARCHAR(n)` | `VARCHAR(n)` | `VARCHAR(n)` / `NVARCHAR(n)` | `VARCHAR2(n)` |
| Unlimited text | `TEXT` | `TEXT` | `VARCHAR(MAX)` | `CLOB` |
| Unicode variable | `TEXT` (default UTF-8) | `NVARCHAR(n)` | `NVARCHAR(n)` | `NVARCHAR2(n)` |

**Key differences:**
- **SQL Server** distinguishes between `VARCHAR` (ASCII) and `NVARCHAR` (Unicode). For international apps, always use `NVARCHAR`.
- **Oracle** uses `VARCHAR2` instead of `VARCHAR` (VARCHAR is technically reserved in Oracle).
- **PostgreSQL** stores everything as UTF-8 by default, so `TEXT` and `VARCHAR(n)` are functionally equivalent internally.

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

> **When to use CHAR vs VARCHAR:** Use `CHAR(n)` only for truly fixed-length data (country codes: `CHAR(2)`, phone extensions). For everything else, `VARCHAR(n)` is more space-efficient.

### Boolean

| Database | Type | True Value | False Value |
|---|---|---|---|
| **PostgreSQL** | `BOOLEAN` | `TRUE`, `'t'`, `'yes'`, `1` | `FALSE`, `'f'`, `'no'`, `0` |
| **MySQL** | `BOOLEAN` / `TINYINT(1)` | `1` | `0` |
| **SQL Server** | `BIT` | `1` | `0` |
| **Oracle** | No native boolean* | — | — |

*Oracle added `BOOLEAN` in Oracle Database 23c, but in most production Oracle environments you'll use `NUMBER(1)` (0 or 1) or `CHAR(1)` ('Y' or 'N').

```sql
-- PostgreSQL / MySQL
is_active   BOOLEAN DEFAULT TRUE,

-- SQL Server
is_active   BIT DEFAULT 1,

-- Oracle (traditional workaround)
is_active   NUMBER(1) DEFAULT 1 CHECK (is_active IN (0, 1))
```

### Date and Time

| Type | Description | PostgreSQL | MySQL | SQL Server | Oracle |
|---|---|---|---|---|---|
| Date only | Year, month, day | `DATE` | `DATE` | `DATE` | `DATE` |
| Time only | Hours, minutes, seconds | `TIME` | `TIME` | `TIME` | — |
| Date + Time | No timezone | `TIMESTAMP` | `DATETIME` | `DATETIME` | `TIMESTAMP` |
| Date + Time (TZ-aware) | With timezone offset | `TIMESTAMPTZ` | — | `DATETIMEOFFSET` | `TIMESTAMP WITH TIME ZONE` |

```sql
-- PostgreSQL (most expressive)
created_at   TIMESTAMPTZ DEFAULT NOW(),   -- stores timezone
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
event_date   DATE   -- Oracle DATE includes time component!
```

> **Gotcha — Oracle DATE:** In Oracle, `DATE` stores both date AND time (down to seconds). If you only want the date part, you must truncate with `TRUNC(column)`.

> **Best practice:** Always store timestamps in UTC. Use `TIMESTAMPTZ` in PostgreSQL or store UTC values in `DATETIME` in MySQL/SQL Server.

### UUID (Universally Unique Identifiers)

UUIDs are 128-bit identifiers — perfect for distributed systems where you can't rely on a central auto-increment counter.

| Database | Native Type | Storage |
|---|---|---|
| **PostgreSQL** | `UUID` | 16 bytes (efficient) |
| **MySQL** | `CHAR(36)` or `BINARY(16)` | 36 bytes as string |
| **SQL Server** | `UNIQUEIDENTIFIER` | 16 bytes |
| **Oracle** | `RAW(16)` or `CHAR(36)` | — |

```sql
-- PostgreSQL
id   UUID DEFAULT gen_random_uuid(),

-- MySQL
id   CHAR(36) DEFAULT (UUID()),

-- SQL Server
id   UNIQUEIDENTIFIER DEFAULT NEWID(),
```

### JSON Storage

Modern applications often store semi-structured data. Here's how each database handles it:

| Database | Type | Notes |
|---|---|---|
| **PostgreSQL** | `JSONB` (preferred) or `JSON` | `JSONB` is binary-stored, indexable, and faster for queries |
| **MySQL** | `JSON` | Available since MySQL 5.7, has query functions |
| **SQL Server** | `NVARCHAR(MAX)` | No native JSON type; JSON functions work on strings |
| **Oracle** | `JSON` (21c+) or `CLOB` | Native JSON type added in Oracle 21c |

```sql
-- PostgreSQL (JSONB is almost always preferred over JSON)
metadata     JSONB,
preferences  JSONB DEFAULT '{}',

-- MySQL
metadata     JSON,

-- SQL Server (no native type — use NVARCHAR)
metadata     NVARCHAR(MAX),   -- use JSON functions: JSON_VALUE(), JSON_QUERY()

-- Oracle (21c+)
metadata     JSON,
```

### Auto-Increment Primary Keys

This is one of the biggest syntax differences across databases:

```sql
-- PostgreSQL: SERIAL (legacy, still widely used)
CREATE TABLE users (
    id   SERIAL PRIMARY KEY
);

-- PostgreSQL: GENERATED AS IDENTITY (SQL standard, preferred in modern code)
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
    -- IDENTITY(seed, increment): starts at 1, increments by 1
);

-- Oracle
CREATE TABLE users (
    id   INT GENERATED AS IDENTITY PRIMARY KEY
);
-- or using a SEQUENCE (older approach):
-- CREATE SEQUENCE users_seq START WITH 1 INCREMENT BY 1;
```

---

## 🔒 Constraints

Constraints enforce rules on the data in your columns. They can be defined **inline** (on the column) or at the **table level** (after all columns).

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

Table-level constraints are useful when a constraint spans **multiple columns** (composite keys, composite unique constraints):

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
| `PRIMARY KEY` | Unique, not null identifier for each row | `id INT PRIMARY KEY` |
| `NOT NULL` | Column cannot be empty | `name VARCHAR(100) NOT NULL` |
| `UNIQUE` | All values in column must be distinct | `email VARCHAR(255) UNIQUE` |
| `DEFAULT` | Value used when none is provided | `status VARCHAR(20) DEFAULT 'active'` |
| `CHECK` | Custom rule the value must satisfy | `CHECK (age >= 18)` |
| `FOREIGN KEY` | Links to a row in another table | `REFERENCES users(id)` |

---

## ✏️ ALTER TABLE — Modifying Existing Tables

Once a table exists and has data in it, you often need to change its structure without dropping and recreating it.

### ADD COLUMN — Same across all databases

```sql
ALTER TABLE users ADD COLUMN phone_number VARCHAR(20);

-- With a default value
ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
```

### DROP COLUMN

```sql
-- PostgreSQL, MySQL, Oracle
ALTER TABLE users DROP COLUMN phone_number;

-- SQL Server
ALTER TABLE users DROP COLUMN phone_number;
-- If there's a default constraint, drop it first:
ALTER TABLE users DROP CONSTRAINT DF_users_phone_number;
ALTER TABLE users DROP COLUMN phone_number;
```

### RENAME COLUMN

This is one of the most inconsistent operations across databases:

```sql
-- PostgreSQL (since v9.6)
ALTER TABLE users RENAME COLUMN username TO display_name;

-- MySQL (since 8.0)
ALTER TABLE users RENAME COLUMN username TO display_name;

-- SQL Server
EXEC sp_rename 'users.username', 'display_name', 'COLUMN';

-- Oracle
ALTER TABLE users RENAME COLUMN username TO display_name;
```

### CHANGE COLUMN TYPE

Changing a column's data type can be risky if existing data is incompatible. Always test on a copy first.

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

### Rename a Table

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

`DROP TABLE` permanently deletes a table and all its data. This cannot be undone (unless you're in a transaction or have backups).

```sql
-- Basic drop (errors if table doesn't exist)
DROP TABLE users;

-- Safe drop (no error if table doesn't exist) — PostgreSQL & MySQL
DROP TABLE IF EXISTS users;

-- SQL Server
IF OBJECT_ID('dbo.users', 'U') IS NOT NULL
    DROP TABLE users;
```

### CASCADE vs RESTRICT

When other tables have foreign keys referencing the table you're dropping:

```sql
-- PostgreSQL: drop table and all dependent objects
DROP TABLE users CASCADE;

-- PostgreSQL: refuse to drop if dependencies exist (default behavior)
DROP TABLE users RESTRICT;
```

> **Warning:** `CASCADE` will also drop foreign key constraints in child tables — use it carefully.

---

## ⚡ TRUNCATE TABLE

`TRUNCATE` removes all rows from a table much faster than `DELETE` because it doesn't log individual row deletions. The table structure remains intact.

```sql
TRUNCATE TABLE users;
```

| Feature | `DELETE` | `TRUNCATE` |
|---|---|---|
| Removes all rows | Yes | Yes |
| Can have WHERE clause | Yes | No |
| Triggers fire | Yes | Sometimes |
| Transaction rollback | Yes (most DBs) | PostgreSQL: Yes; MySQL: No |
| Resets auto-increment | No | Yes (MySQL/SQL Server) |
| Speed | Slower | Much faster |

```sql
-- PostgreSQL: truncate multiple tables at once
TRUNCATE TABLE posts, comments, users RESTART IDENTITY CASCADE;

-- MySQL
TRUNCATE TABLE users;  -- resets AUTO_INCREMENT counter

-- SQL Server
TRUNCATE TABLE users;  -- resets IDENTITY counter
```

---

## 📁 Schemas — Organizing Tables

A **schema** is a namespace that groups related tables together within a database. Think of it like a folder inside your database.

```sql
-- PostgreSQL: create schemas
CREATE SCHEMA auth;
CREATE SCHEMA blog;
CREATE SCHEMA analytics;

-- Create tables inside schemas
CREATE TABLE auth.users (...);
CREATE TABLE blog.posts (...);
CREATE TABLE analytics.events (...);

-- Reference across schemas
SELECT u.name FROM auth.users u
JOIN blog.posts p ON p.user_id = u.id;
```

**MySQL note:** In MySQL, `SCHEMA` and `DATABASE` are synonyms — `CREATE SCHEMA my_app` and `CREATE DATABASE my_app` do the exact same thing. MySQL does not have sub-schemas within a database.

**SQL Server:** Has the same schema concept as PostgreSQL. The default schema is `dbo` (database owner). You reference objects as `schema_name.table_name`.

**PostgreSQL default schema:** The default schema is `public`. When you create a table without specifying a schema, it goes into `public`.

```sql
-- These are equivalent in PostgreSQL:
CREATE TABLE users (...);
CREATE TABLE public.users (...);
```

---

## 🚀 Full Working Example: Blog Platform Schema

Let's build a real schema for a blog platform with users, posts, and comments. This example uses **PostgreSQL syntax** with notes where other databases differ.

```sql
-- ================================================
-- Blog Platform Schema
-- ================================================

-- 1. Create and select the database
CREATE DATABASE blog_platform;
-- \c blog_platform   (psql)

-- 2. Create schemas to organize tables
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS content;

-- 3. Users table (in auth schema)
CREATE TABLE IF NOT EXISTS auth.users (
    id              INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username        VARCHAR(50)  NOT NULL UNIQUE,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   CHAR(60)     NOT NULL,            -- bcrypt hash is always 60 chars
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

-- 4. Posts table (in content schema)
CREATE TABLE IF NOT EXISTS content.posts (
    id           INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id      INT          NOT NULL,
    title        VARCHAR(300) NOT NULL,
    slug         VARCHAR(350) NOT NULL UNIQUE,        -- URL-friendly version of title
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

-- 5. Comments table (in content schema)
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

**MySQL equivalent for the users table (no schemas, different types):**

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

After the schema is live, requirements change. Here's how you'd evolve it:

```sql
-- Add a follower count cache column
ALTER TABLE auth.users ADD COLUMN follower_count INT NOT NULL DEFAULT 0;

-- Add a reading time estimate to posts
ALTER TABLE content.posts ADD COLUMN reading_time_minutes SMALLINT;

-- Rename a poorly named column
ALTER TABLE content.posts RENAME COLUMN body TO content;

-- Drop a column that's no longer needed
ALTER TABLE auth.users DROP COLUMN avatar_url;

-- Widen a column that turns out to be too short
ALTER TABLE auth.users ALTER COLUMN display_name TYPE VARCHAR(200);
```

---

## Key Takeaways

- **DDL** is for structure; DML (INSERT/UPDATE/DELETE) is for data. Keep them separate in your mind.
- Always use `IF NOT EXISTS` / `IF EXISTS` in scripts to make them **idempotent** (safe to run multiple times).
- Pick data types carefully: use **DECIMAL** for money, **TIMESTAMPTZ** in PostgreSQL for any datetime that users from different timezones will see.
- **SERIAL** vs **GENERATED AS IDENTITY**: both work in PostgreSQL, but `GENERATED AS IDENTITY` is the SQL standard and preferred in new code.
- **TRUNCATE** is not `DELETE` — it's faster but less flexible and may not fire triggers.
- Use **schemas** to organize tables in PostgreSQL and SQL Server. In MySQL, a schema is just another word for a database.
- Auto-increment syntax is one of the biggest cross-database gotchas: `AUTO_INCREMENT` (MySQL), `IDENTITY(1,1)` (SQL Server), `SERIAL` / `GENERATED AS IDENTITY` (PostgreSQL).

---

## Quiz

Test your understanding before moving on.

**Question 1:** You're designing a table to store product prices for an e-commerce store. Which data type should you use for the price column, and why?

> A) `FLOAT(10, 2)` — it's flexible  
> B) `DECIMAL(10, 2)` — it's exact  
> C) `INT` — prices are just numbers  
> D) `VARCHAR(20)` — prices can include symbols like "$"

**Question 2:** You're working on a SQL Server database and need to store a user's biography (potentially thousands of characters, Unicode characters required). Which column type do you choose?

> A) `VARCHAR(MAX)`  
> B) `NVARCHAR(MAX)`  
> C) `TEXT`  
> D) `CHAR(5000)`

**Question 3:** Your `users` table has 10 million rows. A bug caused all email_verified flags to be set to TRUE incorrectly. You want to reset them all to FALSE as fast as possible. What should you do?

> A) `DELETE FROM users` then re-insert all rows  
> B) `TRUNCATE TABLE users` — fastest way to clear the column  
> C) `UPDATE users SET email_verified = FALSE` — this is the correct targeted approach  
> D) `DROP TABLE users` then recreate it

---

**Answers:** 1-B (DECIMAL is exact; floating-point can introduce rounding errors in financial calculations) | 2-B (NVARCHAR stores Unicode; VARCHAR in SQL Server is ASCII-only) | 3-C (TRUNCATE removes all rows including the good data; UPDATE targets just the column you need to fix)

---

*Next Chapter: Inserting, Updating, and Deleting Data (DML) →*
