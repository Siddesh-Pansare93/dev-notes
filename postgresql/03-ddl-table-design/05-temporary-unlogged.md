# Temporary and Unlogged Tables

## Theory

PostgreSQL provides specialized table types for specific performance and lifecycle requirements: TEMPORARY (or TEMP) tables and UNLOGGED tables. Understanding when and how to use these tables is crucial for optimizing database performance and managing transient data.

**TEMPORARY Tables** are session-specific tables that exist only for the duration of a database session (or optionally, a transaction). They are:
- Automatically dropped at session end (or transaction end with ON COMMIT DROP)
- Visible only to the session that created them
- Not written to the Write-Ahead Log (WAL), making them faster
- Stored in a separate schema per session
- Perfect for intermediate calculations, staging data, and temporary workspaces

**UNLOGGED Tables** are permanent tables that skip WAL writing for better write performance:
- Persist across sessions like normal tables
- Much faster writes (no WAL overhead)
- Contents lost if server crashes or unclean shutdown occurs
- Automatically truncated after crash recovery
- Ideal for data that can be regenerated (caches, session data, ETL staging)

**Table Creation Shortcuts**:
- CREATE TABLE ... LIKE: Copies structure (columns, defaults, constraints) without data
- CREATE TABLE ... AS SELECT (CTAS): Creates table from query results with data

These features are essential for ETL processes, data warehousing, analytics workloads, and performance optimization.

## Syntax

### TEMPORARY Tables

```sql
-- Basic temporary table
CREATE TEMPORARY TABLE temp_table_name (
    column1 data_type,
    column2 data_type
);

-- Short form
CREATE TEMP TABLE temp_table_name (
    column1 data_type
);

-- With ON COMMIT behavior
CREATE TEMP TABLE temp_table_name (
    column1 data_type
) ON COMMIT { PRESERVE ROWS | DELETE ROWS | DROP };
```

### UNLOGGED Tables

```sql
-- Create unlogged table
CREATE UNLOGGED TABLE unlogged_table_name (
    column1 data_type,
    column2 data_type
);

-- Convert existing table to unlogged
ALTER TABLE table_name SET UNLOGGED;

-- Convert unlogged table to logged
ALTER TABLE table_name SET LOGGED;
```

### CREATE TABLE ... LIKE

```sql
-- Copy structure only
CREATE TABLE new_table (LIKE existing_table);

-- Copy structure with specific options
CREATE TABLE new_table (
    LIKE existing_table INCLUDING { DEFAULTS | CONSTRAINTS | INDEXES | STORAGE | COMMENTS | ALL }
);
```

### CREATE TABLE AS SELECT (CTAS)

```sql
-- Create table from query
CREATE TABLE new_table AS
SELECT column1, column2
FROM existing_table
WHERE condition;

-- Create temporary table from query
CREATE TEMP TABLE temp_table AS
SELECT * FROM existing_table;

-- Create unlogged table from query
CREATE UNLOGGED TABLE unlogged_table AS
SELECT * FROM existing_table;
```

## Examples

### Basic TEMPORARY Table

```sql
-- Create a temporary table
CREATE TEMP TABLE temp_calculations (
    calc_id SERIAL PRIMARY KEY,
    input_value NUMERIC(10, 2),
    result NUMERIC(10, 2),
    calculated_at TIMESTAMP DEFAULT now()
);

-- Insert data
INSERT INTO temp_calculations (input_value, result)
VALUES (100, 150), (200, 300), (50, 75);

-- Query works in this session
SELECT * FROM temp_calculations;

-- Table is automatically dropped when session ends
-- Try connecting in another session - temp_calculations won't exist there
```

### Temporary Tables with ON COMMIT

```sql
-- ON COMMIT PRESERVE ROWS (default)
CREATE TEMP TABLE temp_preserve (
    id SERIAL,
    data VARCHAR(100)
) ON COMMIT PRESERVE ROWS;

BEGIN;
INSERT INTO temp_preserve (data) VALUES ('Test 1');
COMMIT;

SELECT * FROM temp_preserve; -- Data still exists after commit

-- ON COMMIT DELETE ROWS
CREATE TEMP TABLE temp_delete (
    id SERIAL,
    data VARCHAR(100)
) ON COMMIT DELETE ROWS;

BEGIN;
INSERT INTO temp_delete (data) VALUES ('Test 1'), ('Test 2');
SELECT * FROM temp_delete; -- Shows data within transaction
COMMIT;

SELECT * FROM temp_delete; -- Empty after commit!

-- ON COMMIT DROP
CREATE TEMP TABLE temp_drop (
    id SERIAL,
    data VARCHAR(100)
) ON COMMIT DROP;

BEGIN;
INSERT INTO temp_drop (data) VALUES ('Test 1');
SELECT * FROM temp_drop; -- Works within transaction
COMMIT;

-- Table no longer exists after commit
-- This fails: SELECT * FROM temp_drop;
```

### TEMPORARY Tables for ETL Processing

```sql
-- Real-world ETL example: Processing customer orders

-- 1. Create temp table for staging raw data
CREATE TEMP TABLE staging_orders (
    raw_order_id VARCHAR(50),
    customer_email VARCHAR(100),
    product_code VARCHAR(50),
    quantity VARCHAR(20),
    price VARCHAR(20),
    order_date VARCHAR(50)
);

-- 2. Load raw data (simulating CSV import)
INSERT INTO staging_orders VALUES
    ('ORD-001', 'alice@example.com', 'PROD-A', '5', '$19.99', '2024-01-15'),
    ('ORD-002', 'bob@example.com', 'PROD-B', '3', '$45.50', '2024-01-16'),
    ('ORD-003', 'alice@example.com', 'PROD-C', '1', '$129.99', '2024-01-17');

-- 3. Create temp table for cleaned data
CREATE TEMP TABLE cleaned_orders (
    order_id INTEGER,
    customer_email VARCHAR(100),
    product_code VARCHAR(50),
    quantity INTEGER,
    unit_price NUMERIC(10, 2),
    order_date DATE,
    total_amount NUMERIC(10, 2)
);

-- 4. Clean and transform data
INSERT INTO cleaned_orders
SELECT
    SUBSTRING(raw_order_id FROM 5)::INTEGER as order_id,
    LOWER(customer_email),
    product_code,
    quantity::INTEGER,
    REPLACE(price, '$', '')::NUMERIC as unit_price,
    order_date::DATE,
    quantity::INTEGER * REPLACE(price, '$', '')::NUMERIC as total_amount
FROM staging_orders;

-- 5. Validate data in temp table
SELECT * FROM cleaned_orders ORDER BY order_id;

-- 6. Load into permanent table (would exist in real scenario)
-- INSERT INTO permanent_orders SELECT * FROM cleaned_orders;

-- Temp tables automatically cleaned up at session end
```

### UNLOGGED Tables

```sql
-- Create unlogged table for high-performance writes
CREATE UNLOGGED TABLE session_cache (
    session_id UUID PRIMARY KEY,
    user_id INTEGER NOT NULL,
    session_data JSONB,
    created_at TIMESTAMP DEFAULT now(),
    last_accessed TIMESTAMP DEFAULT now()
);

-- Insert lots of data quickly
INSERT INTO session_cache (session_id, user_id, session_data)
SELECT
    gen_random_uuid(),
    (random() * 1000)::INTEGER,
    jsonb_build_object('key', 'value' || i)
FROM generate_series(1, 10000) i;

-- Fast writes, but data lost on crash
SELECT COUNT(*) FROM session_cache;

-- Check if table is unlogged
SELECT
    schemaname,
    tablename,
    relpersistence
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE tablename = 'session_cache';
-- relpersistence = 'u' means unlogged
-- relpersistence = 'p' means permanent
-- relpersistence = 't' means temporary
```

### Converting Between LOGGED and UNLOGGED

```sql
-- Create regular logged table
CREATE TABLE conversion_test (
    id SERIAL PRIMARY KEY,
    data VARCHAR(100)
);

INSERT INTO conversion_test (data) VALUES ('Test 1'), ('Test 2');

-- Check initial state
SELECT c.relname, c.relpersistence
FROM pg_class c
WHERE c.relname = 'conversion_test';

-- Convert to unlogged (faster writes, data lost on crash)
ALTER TABLE conversion_test SET UNLOGGED;

-- Verify conversion
SELECT c.relname, c.relpersistence
FROM pg_class c
WHERE c.relname = 'conversion_test';

-- Convert back to logged (slower writes, data safe)
ALTER TABLE conversion_test SET LOGGED;

-- Verify conversion
SELECT c.relname, c.relpersistence
FROM pg_class c
WHERE c.relname = 'conversion_test';

-- Data preserved through conversions
SELECT * FROM conversion_test;
```

### CREATE TABLE ... LIKE

```sql
-- Create source table
CREATE TABLE customers (
    customer_id SERIAL PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT now()
);

-- Copy structure only (no constraints or indexes)
CREATE TABLE customers_backup_basic (LIKE customers);

\d customers_backup_basic
-- Notice: No PRIMARY KEY, no UNIQUE, no DEFAULT values

-- Copy structure including defaults
CREATE TABLE customers_backup_defaults (
    LIKE customers INCLUDING DEFAULTS
);

\d customers_backup_defaults
-- Notice: DEFAULT values copied, but no constraints

-- Copy structure including everything
CREATE TABLE customers_backup_full (
    LIKE customers INCLUDING ALL
);

\d customers_backup_full
-- Notice: PRIMARY KEY, UNIQUE, DEFAULT values all copied

-- Selective including
CREATE TABLE customers_backup_selective (
    LIKE customers
    INCLUDING DEFAULTS
    INCLUDING COMMENTS
);
```

### CREATE TABLE ... LIKE with Modifications

```sql
-- Source table
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    product_name VARCHAR(200) NOT NULL,
    price NUMERIC(10, 2) DEFAULT 0
);

-- Copy and add columns
CREATE TABLE products_extended (
    LIKE products INCLUDING ALL,
    category VARCHAR(50),
    stock_quantity INTEGER DEFAULT 0
);

\d products_extended

-- Create temporary copy
CREATE TEMP TABLE products_temp (
    LIKE products INCLUDING DEFAULTS
);

-- Create unlogged copy
CREATE UNLOGGED TABLE products_cache (
    LIKE products INCLUDING ALL
);
```

### CREATE TABLE AS SELECT (CTAS)

```sql
-- Create source data
CREATE TABLE sales (
    sale_id SERIAL PRIMARY KEY,
    product_id INTEGER,
    quantity INTEGER,
    unit_price NUMERIC(10, 2),
    sale_date DATE
);

INSERT INTO sales (product_id, quantity, unit_price, sale_date) VALUES
    (101, 5, 19.99, '2024-01-15'),
    (102, 3, 45.50, '2024-01-16'),
    (101, 2, 19.99, '2024-01-17'),
    (103, 1, 129.99, '2024-01-18'),
    (102, 4, 45.50, '2024-01-19');

-- Create summary table from query
CREATE TABLE sales_summary AS
SELECT
    product_id,
    COUNT(*) as num_sales,
    SUM(quantity) as total_quantity,
    SUM(quantity * unit_price) as total_revenue,
    AVG(unit_price) as avg_price
FROM sales
GROUP BY product_id;

SELECT * FROM sales_summary;

-- Note: CTAS does NOT copy constraints or indexes
\d sales_summary

-- Create temporary table from query
CREATE TEMP TABLE daily_sales AS
SELECT
    sale_date,
    SUM(quantity * unit_price) as daily_revenue
FROM sales
GROUP BY sale_date
ORDER BY sale_date;

SELECT * FROM daily_sales;
```

### CTAS with Column Aliases

```sql
-- Create table with custom column names
CREATE TABLE product_stats (product_code, total_sold, revenue) AS
SELECT
    product_id,
    SUM(quantity),
    SUM(quantity * unit_price)
FROM sales
GROUP BY product_id;

SELECT * FROM product_stats;

-- Alternative syntax
CREATE TABLE product_stats_alt AS
SELECT
    product_id AS product_code,
    SUM(quantity) AS total_sold,
    SUM(quantity * unit_price) AS revenue
FROM sales
GROUP BY product_id;
```

### Combining TEMP and CTAS for Analytics

```sql
-- Multi-step analytics with temporary tables

-- Step 1: Get active customers
CREATE TEMP TABLE active_customers AS
SELECT DISTINCT customer_email
FROM cleaned_orders
WHERE order_date >= CURRENT_DATE - INTERVAL '30 days';

-- Step 2: Calculate customer metrics
CREATE TEMP TABLE customer_metrics AS
SELECT
    customer_email,
    COUNT(*) as order_count,
    SUM(total_amount) as total_spent,
    AVG(total_amount) as avg_order_value,
    MAX(order_date) as last_order_date
FROM cleaned_orders
WHERE customer_email IN (SELECT customer_email FROM active_customers)
GROUP BY customer_email;

-- Step 3: Segment customers
CREATE TEMP TABLE customer_segments AS
SELECT
    customer_email,
    order_count,
    total_spent,
    CASE
        WHEN total_spent > 500 THEN 'VIP'
        WHEN total_spent > 200 THEN 'Regular'
        ELSE 'Occasional'
    END as segment
FROM customer_metrics;

-- Final results
SELECT segment, COUNT(*) as customer_count, AVG(total_spent) as avg_spent
FROM customer_segments
GROUP BY segment;

-- All temp tables automatically cleaned up at session end
```

### Performance Comparison: Regular vs Unlogged vs Temporary

```sql
-- Create three table types for comparison
CREATE TABLE logged_test (
    id SERIAL PRIMARY KEY,
    data VARCHAR(100),
    created_at TIMESTAMP DEFAULT now()
);

CREATE UNLOGGED TABLE unlogged_test (
    id SERIAL PRIMARY KEY,
    data VARCHAR(100),
    created_at TIMESTAMP DEFAULT now()
);

CREATE TEMP TABLE temp_test (
    id SERIAL PRIMARY KEY,
    data VARCHAR(100),
    created_at TIMESTAMP DEFAULT now()
);

-- Insert 10,000 rows into each and compare performance
-- Note: Actual timing depends on system, but unlogged and temp are typically faster

-- Logged (slowest - writes to WAL)
\timing on
INSERT INTO logged_test (data)
SELECT 'Data ' || i FROM generate_series(1, 10000) i;
\timing off

-- Unlogged (faster - no WAL)
\timing on
INSERT INTO unlogged_test (data)
SELECT 'Data ' || i FROM generate_series(1, 10000) i;
\timing off

-- Temporary (fastest - no WAL, session-only)
\timing on
INSERT INTO temp_test (data)
SELECT 'Data ' || i FROM generate_series(1, 10000) i;
\timing off

-- Verify counts
SELECT 'logged' as type, COUNT(*) FROM logged_test
UNION ALL
SELECT 'unlogged', COUNT(*) FROM unlogged_test
UNION ALL
SELECT 'temp', COUNT(*) FROM temp_test;
```

### Use Case: Data Import Staging

```sql
-- Real-world pattern: Staging area for bulk imports

-- 1. Create temporary staging table
CREATE TEMP TABLE import_staging (
    raw_data TEXT
);

-- 2. Bulk load data (in practice, use COPY command)
INSERT INTO import_staging (raw_data) VALUES
    ('user1,alice@example.com,active'),
    ('user2,bob@example.com,active'),
    ('user3,charlie@example.com,inactive');

-- 3. Create temp table for parsed data
CREATE TEMP TABLE parsed_users AS
SELECT
    split_part(raw_data, ',', 1) as username,
    split_part(raw_data, ',', 2) as email,
    split_part(raw_data, ',', 3) as status
FROM import_staging;

-- 4. Validate data
CREATE TEMP TABLE validation_errors AS
SELECT
    username,
    email,
    CASE
        WHEN email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'
        THEN 'Invalid email format'
        WHEN status NOT IN ('active', 'inactive')
        THEN 'Invalid status'
        ELSE NULL
    END as error_message
FROM parsed_users
WHERE email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'
   OR status NOT IN ('active', 'inactive');

-- 5. Check for errors
SELECT * FROM validation_errors;

-- 6. Load valid data into permanent table (if validation passes)
-- INSERT INTO permanent_users SELECT * FROM parsed_users WHERE ...;

-- All temp tables automatically cleaned up
```

## Common Mistakes

### 1. Expecting TEMPORARY Tables Across Sessions

```sql
-- WRONG: Creating temp table and expecting it in another session
CREATE TEMP TABLE session_data (id INTEGER, data TEXT);
INSERT INTO session_data VALUES (1, 'Test');

-- In another session/connection, this fails:
-- SELECT * FROM session_data; -- ERROR: relation does not exist

-- CORRECT: Understand temp tables are session-specific
-- Use unlogged or regular tables for cross-session data
```

### 2. Not Understanding ON COMMIT Behavior

```sql
-- WRONG: Expecting data to persist with ON COMMIT DELETE ROWS
CREATE TEMP TABLE temp_wrong (data TEXT) ON COMMIT DELETE ROWS;

BEGIN;
INSERT INTO temp_wrong VALUES ('Important data');
COMMIT;

SELECT * FROM temp_wrong; -- Empty! Data deleted on commit

-- CORRECT: Use appropriate ON COMMIT behavior
CREATE TEMP TABLE temp_correct (data TEXT) ON COMMIT PRESERVE ROWS;
```

### 3. Using UNLOGGED for Critical Data

```sql
-- WRONG: Storing critical data in unlogged table
CREATE UNLOGGED TABLE customer_orders ( -- DON'T DO THIS!
    order_id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    order_total NUMERIC(10, 2)
);

-- Data will be lost on server crash!

-- CORRECT: Use unlogged only for disposable/regenerable data
CREATE UNLOGGED TABLE search_cache (
    search_term VARCHAR(200),
    results JSONB,
    cached_at TIMESTAMP
);
```

### 4. Expecting Constraints with CTAS

```sql
CREATE TABLE original (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) UNIQUE,
    status VARCHAR(20) DEFAULT 'active'
);

-- WRONG: Expecting constraints to be copied
CREATE TABLE copy AS SELECT * FROM original;

\d copy -- No PRIMARY KEY, no UNIQUE, no DEFAULT!

-- CORRECT: Use LIKE INCLUDING ALL or add constraints manually
CREATE TABLE copy_correct (LIKE original INCLUDING ALL);
INSERT INTO copy_correct SELECT * FROM original;
```

### 5. Not Cleaning Up Large Temporary Tables

```sql
-- WRONG: Creating many large temp tables without cleanup
CREATE TEMP TABLE huge_temp1 AS SELECT * FROM large_table;
CREATE TEMP TABLE huge_temp2 AS SELECT * FROM large_table;
-- Session stays open for hours...

-- CORRECT: Explicitly drop when done
CREATE TEMP TABLE huge_temp AS SELECT * FROM large_table;
-- Use the data...
DROP TABLE huge_temp; -- Free memory immediately
```

## Best Practices

### 1. Use TEMP Tables for Session-Specific Work

```sql
-- Good use cases for temp tables:
-- - ETL staging
-- - Complex multi-step calculations
-- - User-specific working data
-- - Report generation intermediate results

CREATE TEMP TABLE user_report_data AS
SELECT
    user_id,
    COUNT(*) as activity_count,
    MAX(activity_date) as last_activity
FROM user_activities
WHERE user_id = current_setting('app.current_user_id')::INTEGER
GROUP BY user_id;
```

### 2. Use UNLOGGED for Regenerable Data

```sql
-- Good use cases for unlogged tables:
-- - Caches
-- - Session stores
-- - ETL staging (if data can be reloaded)
-- - Materialized views that can be rebuilt

CREATE UNLOGGED TABLE api_response_cache (
    cache_key VARCHAR(200) PRIMARY KEY,
    response_data JSONB,
    cached_at TIMESTAMP DEFAULT now(),
    expires_at TIMESTAMP
);
```

### 3. Use LIKE INCLUDING ALL for Full Structure Copy

```sql
-- Best practice: Include all attributes when copying structure
CREATE TABLE archive_2024 (
    LIKE active_table INCLUDING ALL
);

-- Then add partition-specific constraints if needed
```

### 4. Add Constraints After CTAS

```sql
-- Pattern: Create with CTAS, then add constraints
CREATE TABLE summary AS
SELECT
    category,
    COUNT(*) as count,
    SUM(amount) as total
FROM transactions
GROUP BY category;

-- Add constraints
ALTER TABLE summary ADD PRIMARY KEY (category);
ALTER TABLE summary ALTER COLUMN count SET NOT NULL;
ALTER TABLE summary ALTER COLUMN total SET NOT NULL;
```

### 5. Use Appropriate ON COMMIT for Temporary Tables

```sql
-- For transaction-scoped temp data
CREATE TEMP TABLE transaction_scratch (
    id INTEGER,
    data TEXT
) ON COMMIT DELETE ROWS;

-- For session-scoped temp data (default)
CREATE TEMP TABLE session_working (
    id INTEGER,
    data TEXT
) ON COMMIT PRESERVE ROWS;

-- For truly transaction-only tables
CREATE TEMP TABLE transaction_only (
    id INTEGER,
    data TEXT
) ON COMMIT DROP;
```

### 6. Document UNLOGGED Tables

```sql
CREATE UNLOGGED TABLE metrics_cache (
    metric_name VARCHAR(100) PRIMARY KEY,
    metric_value NUMERIC,
    calculated_at TIMESTAMP DEFAULT now()
);

COMMENT ON TABLE metrics_cache IS
    'UNLOGGED: Fast writes, data lost on crash. Rebuilt from metrics_source table on startup.';
```

## Practice Exercises

### Exercise 1: ETL Pipeline with Temporary Tables

Build a complete ETL pipeline using temporary tables:

1. Create a temp staging table for raw CSV data with columns: raw_id, raw_name, raw_email, raw_amount, raw_date (all TEXT)
2. Insert sample raw data with some dirty data (invalid emails, malformed dates, negative amounts)
3. Create a temp validation_errors table that identifies all invalid records with error messages
4. Create a temp cleaned_data table with properly typed columns (id INT, name VARCHAR, email VARCHAR, amount NUMERIC, date DATE)
5. Populate cleaned_data with only valid, transformed records
6. Create a temp summary_stats table showing count of valid vs invalid records
7. Use ON COMMIT DELETE ROWS for true transaction-only scratch data
8. Demonstrate that temp tables don't exist in another session

```sql
-- Your solution here
```

### Exercise 2: Performance Testing LOGGED vs UNLOGGED

Compare performance and durability characteristics:

1. Create three identical tables: logged_perf, unlogged_perf, temp_perf
2. Time inserting 50,000 rows into each using generate_series
3. Time updating 10,000 random rows in each
4. Create indexes on each and time queries
5. Convert logged_perf to unlogged and back to logged
6. Document which operations are fastest on each table type
7. Create an unlogged cache table with automatic expiration (expires_at column)
8. Write a query to clean up expired cache entries

```sql
-- Your solution here
```

### Exercise 3: Advanced Table Copying

Practice different table copying techniques:

1. Create a source table `products` with: id SERIAL PRIMARY KEY, name VARCHAR UNIQUE, price NUMERIC DEFAULT 0, category VARCHAR, created_at TIMESTAMP DEFAULT now()
2. Add a CHECK constraint ensuring price > 0
3. Add an index on category
4. Add table and column comments
5. Create copies using:
   - LIKE with no options
   - LIKE INCLUDING DEFAULTS
   - LIKE INCLUDING CONSTRAINTS
   - LIKE INCLUDING INDEXES
   - LIKE INCLUDING ALL
   - CREATE TABLE AS SELECT
6. Compare the resulting table structures using \d+
7. Create a temporary copy with LIKE INCLUDING ALL
8. Create an unlogged copy using CTAS from a filtered query
9. Document which attributes are copied by each method

```sql
-- Your solution here
```

---

**Cross-references:**
- For table creation basics, see [CREATE, ALTER, DROP](./01-create-alter-drop.md)
- For indexes on temporary/unlogged tables, see Module 06
- For ETL and data loading with COPY, see Module 09
- For transactions and ON COMMIT behavior, see Module 08
- For materialized views (related to unlogged tables), see Module 07
- For performance tuning, see Module 10
