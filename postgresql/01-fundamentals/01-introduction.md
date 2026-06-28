# Introduction to PostgreSQL

## Overview

This module introduces PostgreSQL, covering its history, core features, and why it has become one of the most popular open-source relational database management systems in the world.

---

## Theory

### What is PostgreSQL?

PostgreSQL (often called "Postgres") is an advanced, open-source object-relational database management system (ORDBMS) that emphasizes extensibility and SQL compliance. It supports both relational (SQL) and non-relational (JSON) queries, making it a versatile choice for modern applications.

**Key Characteristics:**
- **Open Source**: Free to use, modify, and distribute under the PostgreSQL License (similar to MIT/BSD)
- **ACID Compliant**: Guarantees Atomicity, Consistency, Isolation, and Durability
- **Extensible**: Supports custom data types, functions, operators, and index types
- **Standards Compliant**: Adheres closely to SQL standards (SQL:2016)
- **Multi-Platform**: Runs on Windows, Linux, macOS, BSD, and more

### Brief History

**1970s-1980s: The Berkeley Origins**
- PostgreSQL originated from the POSTGRES project at the University of California, Berkeley
- Led by Professor Michael Stonebraker starting in 1986
- POSTGRES was a successor to the INGRES database project
- Early versions used a custom query language called POSTQUEL

**1990s: The Birth of PostgreSQL**
- In 1994, Andrew Yu and Jolly Chen added SQL support, replacing POSTQUEL
- The project was renamed to Postgres95 in 1995
- In 1996, the name changed to PostgreSQL to reflect SQL support
- Version 6.0 was released in 1997 with significant improvements

**2000s-Present: Modern Evolution**
- PostgreSQL 8.0 (2005): Native Windows support, savepoints, tablespaces
- PostgreSQL 9.0 (2010): Hot standby, streaming replication, 64-bit Windows
- PostgreSQL 9.4 (2014): JSONB support, logical decoding
- PostgreSQL 10 (2017): Declarative partitioning, logical replication
- PostgreSQL 12 (2019): Improved indexing, JSON path queries
- PostgreSQL 14 (2021): Performance improvements, logical replication enhancements
- PostgreSQL 15 (2022): MERGE command, performance gains
- PostgreSQL 16 (2023): Logical replication improvements, parallel query enhancements
- PostgreSQL 17 (2024): Incremental backups, vacuum improvements

### Why Choose PostgreSQL?

#### 1. ACID Compliance

PostgreSQL provides full ACID guarantees for all transactions:

- **Atomicity**: Transactions are all-or-nothing
- **Consistency**: Database remains in a valid state
- **Isolation**: Concurrent transactions don't interfere
- **Durability**: Committed data survives system failures

#### 2. Extensibility

PostgreSQL can be extended in numerous ways:

- **Custom Data Types**: Create your own data types (e.g., geometric types, network addresses)
- **Custom Functions**: Write functions in SQL, PL/pgSQL, Python, Perl, C, and more
- **Custom Operators**: Define new operators for custom types
- **Foreign Data Wrappers (FDW)**: Query external data sources as if they were tables
- **Extensions**: Install pre-built extensions (PostGIS, pg_trgm, pgcrypto, etc.)

#### 3. Advanced JSON Support

PostgreSQL offers robust JSON and JSONB support:

- **JSONB Type**: Binary JSON format with indexing support
- **JSON Operators**: Rich set of operators for querying JSON
- **JSON Functions**: Extract, transform, and manipulate JSON data
- **GIN Indexes**: Efficient indexing for JSON queries
- **JSON Path**: SQL/JSON path language support (PostgreSQL 12+)

#### 4. Strong Community

- Active development with yearly major releases
- Extensive documentation
- Large ecosystem of tools and extensions
- Professional support available from multiple vendors
- PostgreSQL Global Development Group maintains independence

#### 5. Enterprise Features

- **Replication**: Streaming replication, logical replication
- **Partitioning**: Declarative table partitioning
- **Parallel Query**: Parallel execution of complex queries
- **Just-in-Time (JIT) Compilation**: Performance optimization for queries
- **Row-Level Security**: Fine-grained access control
- **Foreign Data Wrappers**: Query external databases

#### 6. Cost-Effective

- No licensing fees (even for commercial use)
- No per-core or per-seat costs
- Freedom from vendor lock-in
- Professional support available if needed

### PostgreSQL vs Other Databases

#### PostgreSQL vs MySQL

| Feature | PostgreSQL | MySQL |
|---------|-----------|-------|
| **ACID Compliance** | Full ACID compliance | ACID with InnoDB engine |
| **Concurrency** | MVCC (better for read-heavy) | Table/row locking (varies by engine) |
| **JSON Support** | JSONB with full indexing | JSON type, limited indexing |
| **Complex Queries** | Advanced (CTEs, window functions) | Good, improving |
| **Extensibility** | Highly extensible | Limited extensibility |
| **Replication** | Streaming, logical, multi-master | Master-slave, group replication |
| **Standards Compliance** | Very high SQL standard compliance | Moderate compliance |
| **Full-Text Search** | Built-in, powerful | Basic, often use external tools |
| **Licensing** | PostgreSQL License (permissive) | GPL (or commercial license) |
| **Best For** | Complex queries, data integrity | Simple web applications, read-heavy |

#### PostgreSQL vs Microsoft SQL Server

| Feature | PostgreSQL | SQL Server |
|---------|-----------|------------|
| **Cost** | Free, open-source | Commercial (Express edition free) |
| **Platform** | Cross-platform | Windows, Linux (since 2017) |
| **T-SQL vs PL/pgSQL** | PL/pgSQL, others | T-SQL |
| **JSON Support** | Excellent JSONB support | JSON functions available |
| **Extensibility** | Highly extensible | Limited to Microsoft ecosystem |
| **Enterprise Tools** | Third-party (pgAdmin, etc.) | SSMS, Azure Data Studio |
| **Cloud Integration** | AWS RDS, Azure, Google Cloud | Deep Azure integration |
| **Licensing** | No cost, no restrictions | Per-core licensing (Standard/Enterprise) |
| **Best For** | Open-source projects, flexibility | Microsoft ecosystem, .NET apps |

#### PostgreSQL vs Oracle

| Feature | PostgreSQL | Oracle |
|---------|-----------|--------|
| **Cost** | Free | Very expensive licensing |
| **Features** | Rich, growing | Extremely comprehensive |
| **Performance** | Excellent, improving | Industry-leading (at high cost) |
| **Scalability** | Very good | Excellent |
| **Community** | Open community | Commercial vendor |
| **Enterprise Features** | Good, expanding | Best-in-class (RAC, Data Guard) |
| **Migration Path** | Growing (orafce extension) | Proprietary |
| **Best For** | Cost-conscious enterprises | Large enterprises with budget |

### Use Cases

#### 1. Web Applications

PostgreSQL excels as a backend database for web applications:

- Django, Ruby on Rails, Node.js (Prisma, Sequelize)
- Strong JSON support for modern JavaScript frameworks
- Connection pooling (pgBouncer, PgPool-II)
- Full-text search without external dependencies

**Example Scenarios:**
- E-commerce platforms
- Content management systems (CMS)
- Social media applications
- SaaS platforms

#### 2. Geospatial Applications

With PostGIS extension, PostgreSQL becomes a powerful GIS database:

- Store and query geographic data (points, lines, polygons)
- Spatial indexing and analysis
- Map-based applications

**Example Scenarios:**
- Mapping applications
- Location-based services
- Urban planning systems
- Environmental monitoring

#### 3. Data Warehousing and Analytics

PostgreSQL handles analytical workloads effectively:

- Columnar storage (with extensions like Citus, TimescaleDB)
- Parallel query execution
- Window functions and CTEs
- Materialized views

**Example Scenarios:**
- Business intelligence platforms
- Reporting systems
- Time-series data analysis
- Data lakes and warehouses

#### 4. Financial Systems

ACID compliance and reliability make PostgreSQL suitable for finance:

- Transactional consistency
- Audit logging
- Complex business rules
- Regulatory compliance

**Example Scenarios:**
- Banking applications
- Payment processing
- Trading platforms
- Accounting systems

#### 5. Scientific and Research Data

PostgreSQL handles complex data types and large datasets:

- Array and composite types
- Custom data types
- Large object support
- Integration with R, Python (PL/Python)

**Example Scenarios:**
- Genomics databases
- Clinical trial data
- Research data management
- Scientific simulations

---

## Syntax

PostgreSQL follows standard SQL syntax with extensions:

```sql
-- Basic query structure
SELECT column1, column2
FROM table_name
WHERE condition
ORDER BY column1;

-- PostgreSQL-specific features
SELECT array_agg(column1)  -- Array aggregation
FROM table_name
WHERE column2 @> '{"key": "value"}'::jsonb;  -- JSONB containment
```

---

## Examples

### Example 1: Simple Database Query

```sql
-- Create a simple table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert data
INSERT INTO users (username, email)
VALUES
    ('alice', 'alice@example.com'),
    ('bob', 'bob@example.com'),
    ('charlie', 'charlie@example.com');

-- Query data
SELECT id, username, email, created_at
FROM users
ORDER BY created_at DESC;
```

**Output:**
```
 id | username |        email         |         created_at
----+----------+----------------------+----------------------------
  3 | charlie  | charlie@example.com  | 2024-02-10 10:15:30.123456
  2 | bob      | bob@example.com      | 2024-02-10 10:15:30.123456
  1 | alice    | alice@example.com    | 2024-02-10 10:15:30.123456
```

### Example 2: JSON Support

```sql
-- Create a table with JSONB column
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    attributes JSONB
);

-- Insert products with JSON attributes
INSERT INTO products (name, attributes) VALUES
    ('Laptop', '{"brand": "Dell", "specs": {"ram": "16GB", "storage": "512GB SSD"}}'),
    ('Phone', '{"brand": "Samsung", "specs": {"ram": "8GB", "storage": "128GB"}}'),
    ('Tablet', '{"brand": "Apple", "specs": {"ram": "4GB", "storage": "64GB"}}');

-- Query using JSON operators
SELECT name, attributes->>'brand' AS brand,
       attributes->'specs'->>'ram' AS ram
FROM products
WHERE attributes @> '{"brand": "Dell"}';
```

**Output:**
```
  name  | brand |  ram
--------+-------+------
 Laptop | Dell  | 16GB
```

### Example 3: Array Data Type

```sql
-- Create a table with array column
CREATE TABLE articles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200),
    tags TEXT[]
);

-- Insert data with arrays
INSERT INTO articles (title, tags) VALUES
    ('PostgreSQL Basics', ARRAY['database', 'sql', 'tutorial']),
    ('Advanced Indexing', ARRAY['database', 'performance', 'indexing']),
    ('JSON in PostgreSQL', ARRAY['database', 'json', 'tutorial']);

-- Query using array operators
SELECT title, tags
FROM articles
WHERE 'tutorial' = ANY(tags);

-- Array aggregation
SELECT unnest(tags) AS tag, COUNT(*) AS count
FROM articles
GROUP BY tag
ORDER BY count DESC;
```

**Output:**
```
       title        |           tags
--------------------+---------------------------
 PostgreSQL Basics  | {database,sql,tutorial}
 JSON in PostgreSQL | {database,json,tutorial}

    tag     | count
------------+-------
 database   |     3
 tutorial   |     2
 indexing   |     1
 json       |     1
 performance|     1
 sql        |     1
```

### Example 4: Common Table Expressions (CTEs)

```sql
-- Create sample data
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    manager_id INTEGER REFERENCES employees(id),
    salary NUMERIC(10, 2)
);

INSERT INTO employees (name, manager_id, salary) VALUES
    ('CEO', NULL, 200000),
    ('CTO', 1, 150000),
    ('Developer 1', 2, 90000),
    ('Developer 2', 2, 95000),
    ('CFO', 1, 150000),
    ('Accountant', 5, 70000);

-- Recursive CTE to show hierarchy
WITH RECURSIVE org_chart AS (
    -- Base case: top-level employees
    SELECT id, name, manager_id, salary, 1 AS level,
           name::TEXT AS path
    FROM employees
    WHERE manager_id IS NULL

    UNION ALL

    -- Recursive case: employees under managers
    SELECT e.id, e.name, e.manager_id, e.salary, oc.level + 1,
           oc.path || ' -> ' || e.name
    FROM employees e
    JOIN org_chart oc ON e.manager_id = oc.id
)
SELECT level, name, salary, path
FROM org_chart
ORDER BY level, name;
```

**Output:**
```
 level |     name     |  salary   |              path
-------+--------------+-----------+--------------------------------
     1 | CEO          | 200000.00 | CEO
     2 | CFO          | 150000.00 | CEO -> CFO
     2 | CTO          | 150000.00 | CEO -> CTO
     3 | Accountant   |  70000.00 | CEO -> CFO -> Accountant
     3 | Developer 1  |  90000.00 | CEO -> CTO -> Developer 1
     3 | Developer 2  |  95000.00 | CEO -> CTO -> Developer 2
```

---

## Common Mistakes

### Mistake 1: Assuming MySQL Compatibility

**Wrong:**
```sql
-- MySQL-style LIMIT with offset
SELECT * FROM users LIMIT 10, 20;  -- MySQL syntax
```

**Correct:**
```sql
-- PostgreSQL LIMIT/OFFSET syntax
SELECT * FROM users LIMIT 20 OFFSET 10;

-- Or using FETCH (SQL standard)
SELECT * FROM users OFFSET 10 ROWS FETCH FIRST 20 ROWS ONLY;
```

### Mistake 2: Case-Sensitive Identifiers

**Wrong:**
```sql
-- Creating a table with uppercase name
CREATE TABLE Users (
    ID INTEGER,
    Name VARCHAR(50)
);

-- This won't work as expected
SELECT * FROM Users;  -- Error: relation "users" does not exist
```

**Correct:**
```sql
-- Option 1: Use lowercase (recommended)
CREATE TABLE users (
    id INTEGER,
    name VARCHAR(50)
);

SELECT * FROM users;  -- Works

-- Option 2: Quote identifiers (not recommended)
CREATE TABLE "Users" (
    "ID" INTEGER,
    "Name" VARCHAR(50)
);

SELECT * FROM "Users";  -- Works but requires quotes always
```

### Mistake 3: Not Using Transactions

**Wrong:**
```sql
-- Multiple related operations without transaction
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
-- If second update fails, first update is already committed
```

**Correct:**
```sql
-- Use transactions for related operations
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;  -- Both succeed or both fail
```

### Mistake 4: Ignoring NULL Handling

**Wrong:**
```sql
-- Comparing with NULL using =
SELECT * FROM users WHERE email = NULL;  -- Returns 0 rows
```

**Correct:**
```sql
-- Use IS NULL for NULL comparisons
SELECT * FROM users WHERE email IS NULL;

-- Use COALESCE for default values
SELECT username, COALESCE(email, 'no-email@example.com') AS email
FROM users;
```

### Mistake 5: Not Using RETURNING Clause

**Wrong:**
```sql
-- Insert and then query to get the ID
INSERT INTO users (username, email)
VALUES ('newuser', 'newuser@example.com');

SELECT id FROM users WHERE username = 'newuser';  -- Extra query
```

**Correct:**
```sql
-- Use RETURNING clause
INSERT INTO users (username, email)
VALUES ('newuser', 'newuser@example.com')
RETURNING id, username, created_at;
```

---

## Best Practices

### 1. Use Appropriate Data Types

Choose the right data type for your data:

```sql
-- Good: Specific types
CREATE TABLE events (
    id BIGSERIAL PRIMARY KEY,           -- Use BIGSERIAL for large tables
    event_name VARCHAR(100),             -- VARCHAR for variable-length strings
    event_date DATE,                     -- DATE for dates (not TIMESTAMP)
    event_time TIME,                     -- TIME for time-of-day
    price NUMERIC(10, 2),                -- NUMERIC for money (not FLOAT)
    is_active BOOLEAN,                   -- BOOLEAN for true/false
    metadata JSONB                       -- JSONB for semi-structured data
);
```

### 2. Always Use Transactions for Multi-Statement Operations

```sql
-- Good: Wrapped in transaction
BEGIN;

INSERT INTO orders (customer_id, total)
VALUES (123, 99.99)
RETURNING id AS order_id;

INSERT INTO order_items (order_id, product_id, quantity)
VALUES (currval('orders_id_seq'), 456, 2);

COMMIT;
```

### 3. Leverage PostgreSQL-Specific Features

```sql
-- Use RETURNING clause
INSERT INTO products (name, price)
VALUES ('Widget', 19.99)
RETURNING id, created_at;

-- Use CTEs for complex queries
WITH recent_orders AS (
    SELECT customer_id, SUM(total) AS total_spent
    FROM orders
    WHERE order_date > CURRENT_DATE - INTERVAL '30 days'
    GROUP BY customer_id
)
SELECT c.name, ro.total_spent
FROM customers c
JOIN recent_orders ro ON c.id = ro.customer_id
WHERE ro.total_spent > 1000;
```

### 4. Use Constraints for Data Integrity

```sql
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total NUMERIC(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',

    -- Check constraints
    CONSTRAINT positive_total CHECK (total > 0),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled'))
);
```

### 5. Use Meaningful Names

```sql
-- Good naming conventions
CREATE TABLE customer_orders (              -- Descriptive table name
    order_id BIGSERIAL PRIMARY KEY,         -- Clear column names
    customer_id BIGINT NOT NULL,
    order_date TIMESTAMP NOT NULL,
    total_amount NUMERIC(10, 2),

    CONSTRAINT fk_customer                  -- Named constraint
        FOREIGN KEY (customer_id)
        REFERENCES customers(id)
        ON DELETE RESTRICT
);

CREATE INDEX idx_customer_orders_customer_id -- Descriptive index name
    ON customer_orders(customer_id);
```

---

## Practice Exercises

### Exercise 1: Database Exploration

**Task:** Create a small database to explore PostgreSQL features.

```sql
-- 1. Create a database for a bookstore
CREATE DATABASE bookstore;

-- Connect to the database (in psql: \c bookstore)

-- 2. Create tables with various data types
CREATE TABLE authors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    bio TEXT,
    birth_year INTEGER,
    nationality VARCHAR(50)
);

CREATE TABLE books (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    author_id INTEGER REFERENCES authors(id),
    isbn VARCHAR(13) UNIQUE,
    published_date DATE,
    price NUMERIC(10, 2),
    genres TEXT[],  -- Array of genres
    metadata JSONB  -- Additional metadata
);

-- 3. Insert sample data
INSERT INTO authors (name, bio, birth_year, nationality) VALUES
    ('J.K. Rowling', 'British author, best known for Harry Potter series', 1965, 'British'),
    ('George Orwell', 'English novelist and essayist', 1903, 'British'),
    ('Haruki Murakami', 'Japanese writer', 1949, 'Japanese');

INSERT INTO books (title, author_id, isbn, published_date, price, genres, metadata) VALUES
    ('Harry Potter and the Philosopher''s Stone', 1, '9780747532699', '1997-06-26', 19.99,
     ARRAY['Fantasy', 'Young Adult'],
     '{"pages": 223, "language": "English", "awards": ["British Book Awards"]}'),
    ('1984', 2, '9780451524935', '1949-06-08', 14.99,
     ARRAY['Dystopian', 'Political Fiction'],
     '{"pages": 328, "language": "English", "awards": ["Prometheus Hall of Fame Award"]}'),
    ('Norwegian Wood', 3, '9780375704024', '1987-09-04', 16.99,
     ARRAY['Fiction', 'Romance'],
     '{"pages": 296, "language": "Japanese", "original_title": "ノルウェイの森"}');

-- 4. Query the data using PostgreSQL features
-- Find books in the Fantasy genre
SELECT title, genres
FROM books
WHERE 'Fantasy' = ANY(genres);

-- Find books with more than 300 pages (using JSONB)
SELECT title, metadata->>'pages' AS pages
FROM books
WHERE (metadata->>'pages')::INTEGER > 300;

-- Get author names with their books (JOIN)
SELECT a.name AS author, b.title, b.price
FROM authors a
JOIN books b ON a.id = b.author_id
ORDER BY a.name, b.title;
```

**Expected Results:**
You should see Fantasy books, books with more than 300 pages, and a list of authors with their books.

### Exercise 2: JSON Data Exploration

**Task:** Work with JSONB data to understand PostgreSQL's JSON capabilities.

```sql
-- Create a table for user profiles with flexible attributes
CREATE TABLE user_profiles (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    profile_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert users with different profile structures
INSERT INTO user_profiles (username, profile_data) VALUES
    ('alice', '{
        "fullName": "Alice Johnson",
        "age": 28,
        "interests": ["reading", "hiking", "photography"],
        "contact": {
            "email": "alice@example.com",
            "phone": "+1-555-0101"
        },
        "premium": true
    }'),
    ('bob', '{
        "fullName": "Bob Smith",
        "age": 35,
        "interests": ["gaming", "coding"],
        "contact": {
            "email": "bob@example.com"
        },
        "premium": false,
        "occupation": "Developer"
    }'),
    ('charlie', '{
        "fullName": "Charlie Brown",
        "age": 42,
        "interests": ["music", "cooking", "travel", "photography"],
        "contact": {
            "email": "charlie@example.com",
            "phone": "+1-555-0103"
        },
        "premium": true,
        "occupation": "Chef"
    }');

-- Query 1: Find all premium users
SELECT username, profile_data->>'fullName' AS name
FROM user_profiles
WHERE profile_data->>'premium' = 'true';

-- Query 2: Find users interested in photography
SELECT username, profile_data->'interests' AS interests
FROM user_profiles
WHERE profile_data->'interests' @> '["photography"]';

-- Query 3: Get users with phone numbers
SELECT username,
       profile_data->>'fullName' AS name,
       profile_data->'contact'->>'phone' AS phone
FROM user_profiles
WHERE profile_data->'contact' ? 'phone';

-- Query 4: Count interests per user
SELECT username,
       jsonb_array_length(profile_data->'interests') AS interest_count
FROM user_profiles
ORDER BY interest_count DESC;

-- Query 5: Update JSON data (add a new field)
UPDATE user_profiles
SET profile_data = profile_data || '{"verified": true}'::jsonb
WHERE username = 'alice'
RETURNING username, profile_data;
```

**Challenge:**
- Add a new user with a completely different profile structure
- Query users by age range
- Extract all unique interests across all users

### Exercise 3: Understanding PostgreSQL Advantages

**Task:** Create a scenario that demonstrates PostgreSQL's advantages over simpler databases.

```sql
-- Scenario: Order management system with complex requirements

-- 1. Create tables with constraints
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    loyalty_points INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT positive_loyalty_points CHECK (loyalty_points >= 0)
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending',
    total_amount NUMERIC(10, 2) NOT NULL,
    discount_applied NUMERIC(5, 2) DEFAULT 0,

    CONSTRAINT valid_status CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
    CONSTRAINT positive_amount CHECK (total_amount > 0),
    CONSTRAINT valid_discount CHECK (discount_applied >= 0 AND discount_applied <= 100)
);

-- 2. Insert sample data
INSERT INTO customers (email, name, loyalty_points) VALUES
    ('john@example.com', 'John Doe', 150),
    ('jane@example.com', 'Jane Smith', 300),
    ('mike@example.com', 'Mike Johnson', 50);

-- 3. Use a transaction with RETURNING
BEGIN;

INSERT INTO orders (customer_id, total_amount, discount_applied)
VALUES (1, 99.99, 10)
RETURNING id, order_date, total_amount * (1 - discount_applied/100) AS final_amount;

-- Update customer loyalty points
UPDATE customers
SET loyalty_points = loyalty_points + 10
WHERE id = 1
RETURNING name, loyalty_points;

COMMIT;

-- 4. Use CTE for complex analytics
WITH monthly_stats AS (
    SELECT
        DATE_TRUNC('month', order_date) AS month,
        COUNT(*) AS order_count,
        SUM(total_amount) AS total_revenue,
        AVG(total_amount) AS avg_order_value
    FROM orders
    WHERE status != 'cancelled'
    GROUP BY DATE_TRUNC('month', order_date)
)
SELECT
    TO_CHAR(month, 'YYYY-MM') AS month,
    order_count,
    ROUND(total_revenue, 2) AS total_revenue,
    ROUND(avg_order_value, 2) AS avg_order_value
FROM monthly_stats
ORDER BY month DESC;

-- 5. Use window functions for ranking
SELECT
    c.name,
    c.loyalty_points,
    COUNT(o.id) AS order_count,
    RANK() OVER (ORDER BY c.loyalty_points DESC) AS loyalty_rank,
    DENSE_RANK() OVER (ORDER BY COUNT(o.id) DESC) AS order_rank
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
GROUP BY c.id, c.name, c.loyalty_points
ORDER BY loyalty_rank;
```

**Questions to Explore:**
1. What happens if you try to insert an order with a negative amount?
2. How does the transaction ensure data consistency?
3. What advantages do CTEs provide over subqueries?
4. How does PostgreSQL's MVCC handle concurrent transactions?

---

## Summary

PostgreSQL is a powerful, feature-rich database system with:
- Strong ACID compliance and data integrity
- Advanced features like JSON support, arrays, and custom types
- Excellent extensibility through extensions and custom functions
- Active community and regular improvements
- Cost-effective alternative to commercial databases

**Next Steps:**
- [Installation and Setup](./02-installation-setup.md) - Get PostgreSQL running on your system
- [Architecture Overview](./03-architecture.md) - Understand how PostgreSQL works internally

---

## Additional Resources

- Official PostgreSQL Documentation: https://www.postgresql.org/docs/
- PostgreSQL Wiki: https://wiki.postgresql.org/
- PostgreSQL Tutorial: https://www.postgresqltutorial.com/
- Try PostgreSQL Online: https://www.db-fiddle.com/ (select PostgreSQL)

---

**Module:** 01-Fundamentals | **Next:** [Installation and Setup](./02-installation-setup.md)
