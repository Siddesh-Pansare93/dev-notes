# Essential PostgreSQL Extensions

## Table of Contents
- [Introduction to Extensions](#introduction-to-extensions)
- [pg_stat_statements](#pg_stat_statements)
- [pgcrypto](#pgcrypto)
- [UUID Generation](#uuid-generation)
- [pg_trgm (Trigram Matching)](#pg_trgm-trigram-matching)
- [btree_gist and btree_gin](#btree_gist-and-btree_gin)
- [tablefunc](#tablefunc)
- [citext](#citext)
- [pg_cron](#pg_cron)
- [Common Mistakes](#common-mistakes)
- [Best Practices](#best-practices)
- [Practice Exercises](#practice-exercises)

## Introduction to Extensions

### Theory
PostgreSQL extensions are packaged collections of SQL objects (functions, data types, operators, indexes) that extend the database's capabilities. Extensions are installed per-database and provide additional functionality beyond core PostgreSQL.

### Syntax

```sql
-- List available extensions
SELECT * FROM pg_available_extensions ORDER BY name;

-- List installed extensions
SELECT * FROM pg_extension ORDER BY extname;

-- Create/install an extension
CREATE EXTENSION IF NOT EXISTS extension_name;

-- Create in specific schema
CREATE EXTENSION extension_name SCHEMA schema_name;

-- Drop extension
DROP EXTENSION extension_name CASCADE;

-- Update extension to new version
ALTER EXTENSION extension_name UPDATE TO 'version';
```

### Examples

```sql
-- Check if extension is available
SELECT * FROM pg_available_extensions WHERE name = 'pg_stat_statements';

-- Install extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Check extension version
SELECT extname, extversion FROM pg_extension WHERE extname = 'pg_stat_statements';

-- See extension objects
SELECT * FROM pg_depend WHERE refobjid IN (
    SELECT oid FROM pg_extension WHERE extname = 'pg_stat_statements'
);
```

## pg_stat_statements

### Theory
The pg_stat_statements extension tracks execution statistics for all SQL statements executed by a server. It's essential for query performance analysis, identifying slow queries, and optimizing database performance.

### Syntax

```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View query statistics
SELECT * FROM pg_stat_statements;

-- Reset statistics
SELECT pg_stat_statements_reset();

-- Reset specific query
SELECT pg_stat_statements_reset(userid, dbid, queryid);
```

### Examples

```sql
-- Install pg_stat_statements
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Top 10 slowest queries by total time
SELECT
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    max_exec_time,
    stddev_exec_time,
    rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

-- Top 10 queries by average execution time
SELECT
    query,
    calls,
    mean_exec_time,
    total_exec_time,
    ROUND((100 * total_exec_time / SUM(total_exec_time) OVER ())::numeric, 2) AS percentage
FROM pg_stat_statements
WHERE calls > 10  -- Filter out rarely called queries
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Most frequently called queries
SELECT
    query,
    calls,
    total_exec_time / calls AS avg_time_ms,
    rows / calls AS avg_rows
FROM pg_stat_statements
ORDER BY calls DESC
LIMIT 10;

-- Queries with high variability (inconsistent performance)
SELECT
    query,
    calls,
    mean_exec_time,
    stddev_exec_time,
    CASE
        WHEN mean_exec_time > 0 THEN (stddev_exec_time / mean_exec_time) * 100
        ELSE 0
    END AS coefficient_of_variation
FROM pg_stat_statements
WHERE calls > 50
ORDER BY coefficient_of_variation DESC
LIMIT 10;

-- Queries causing most I/O
SELECT
    query,
    shared_blks_hit,
    shared_blks_read,
    shared_blks_written,
    ROUND(
        100.0 * shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0),
        2
    ) AS cache_hit_ratio
FROM pg_stat_statements
WHERE shared_blks_hit + shared_blks_read > 0
ORDER BY shared_blks_read + shared_blks_written DESC
LIMIT 10;

-- Reset all statistics
SELECT pg_stat_statements_reset();
```

## pgcrypto

### Theory
The pgcrypto extension provides cryptographic functions for PostgreSQL, including hashing, password encryption, symmetric and asymmetric encryption. Essential for storing sensitive data securely.

### Syntax

```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Hash functions
digest(data text, type text) → bytea
crypt(password text, salt text) → text
gen_salt(type text) → text

-- Encryption functions
pgp_sym_encrypt(data text, password text) → bytea
pgp_sym_decrypt(encrypted bytea, password text) → text
```

### Examples

```sql
-- Install pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Password hashing with bcrypt (recommended)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert user with hashed password
INSERT INTO users (username, password_hash)
VALUES ('john_doe', crypt('my_secure_password', gen_salt('bf')));

-- Verify password
SELECT
    username,
    password_hash = crypt('my_secure_password', password_hash) AS password_matches
FROM users
WHERE username = 'john_doe';

-- MD5 and SHA hashing
SELECT
    digest('Hello World', 'md5') AS md5_hash,
    digest('Hello World', 'sha1') AS sha1_hash,
    digest('Hello World', 'sha256') AS sha256_hash,
    digest('Hello World', 'sha512') AS sha512_hash;

-- Encode hash as hex string
SELECT encode(digest('Hello World', 'sha256'), 'hex') AS sha256_hex;

-- Symmetric encryption (encrypt/decrypt with same key)
CREATE TABLE sensitive_data (
    id SERIAL PRIMARY KEY,
    user_id INT,
    encrypted_ssn BYTEA,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Encrypt data
INSERT INTO sensitive_data (user_id, encrypted_ssn)
VALUES (1, pgp_sym_encrypt('123-45-6789', 'encryption_key_here'));

-- Decrypt data
SELECT
    id,
    user_id,
    pgp_sym_decrypt(encrypted_ssn, 'encryption_key_here') AS ssn
FROM sensitive_data;

-- Random data generation
SELECT
    gen_random_bytes(16) AS random_bytes,
    encode(gen_random_bytes(32), 'hex') AS random_token;

-- HMAC (keyed hash for message authentication)
SELECT
    hmac('message', 'secret_key', 'sha256') AS hmac_sha256,
    encode(hmac('message', 'secret_key', 'sha256'), 'hex') AS hmac_hex;

-- Example: API token generation
CREATE TABLE api_tokens (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- Generate and store API token
WITH new_token AS (
    SELECT encode(gen_random_bytes(32), 'hex') AS token
)
INSERT INTO api_tokens (user_id, token_hash, expires_at)
SELECT
    1,
    encode(digest(token, 'sha256'), 'hex'),
    CURRENT_TIMESTAMP + INTERVAL '30 days'
FROM new_token
RETURNING id, (SELECT token FROM new_token) AS api_token;
```

## UUID Generation

### Theory
UUIDs (Universally Unique Identifiers) are 128-bit values used as globally unique identifiers. PostgreSQL supports UUID generation through uuid-ossp extension (older) and built-in gen_random_uuid() function (PostgreSQL 13+).

### Syntax

```sql
-- Built-in (PostgreSQL 13+, recommended)
gen_random_uuid() → uuid

-- uuid-ossp extension (legacy)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
uuid_generate_v1() → uuid  -- MAC address + timestamp
uuid_generate_v4() → uuid  -- Random
```

### Examples

```sql
-- Use built-in gen_random_uuid() (PostgreSQL 13+)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    sku VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert products
INSERT INTO products (name, sku)
VALUES
    ('Laptop', 'TECH-001'),
    ('Mouse', 'TECH-002'),
    ('Keyboard', 'TECH-003');

-- Query by UUID
SELECT * FROM products WHERE id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

-- Using uuid-ossp extension (if needed)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(20) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    total DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Generate UUIDs
SELECT
    gen_random_uuid() AS v4_builtin,
    uuid_generate_v4() AS v4_extension,
    uuid_generate_v1() AS v1_timestamp;

-- UUID as foreign key
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL
);
```

## pg_trgm (Trigram Matching)

### Theory
The pg_trgm extension provides functions and operators for determining similarity of text based on trigram matching. It's extremely useful for fuzzy text search, autocomplete, and optimizing LIKE queries with indexes.

### Syntax

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Similarity functions
similarity(text1, text2) → real  -- Returns 0-1
word_similarity(text1, text2) → real
strict_word_similarity(text1, text2) → real

-- Similarity operators
text1 % text2  -- Similar to (threshold-based)
text1 <-> text2  -- Distance operator (for ORDER BY)

-- Index creation
CREATE INDEX idx_name ON table USING GIN (column gin_trgm_ops);
CREATE INDEX idx_name ON table USING GIST (column gist_trgm_ops);
```

### Examples

```sql
-- Install pg_trgm
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create sample data
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    company VARCHAR(100)
);

INSERT INTO customers (name, email, company) VALUES
    ('John Smith', 'john.smith@example.com', 'Acme Corporation'),
    ('Jane Doe', 'jane.doe@techcorp.com', 'TechCorp Industries'),
    ('Bob Johnson', 'bob.j@example.com', 'Johnson & Associates'),
    ('Alice Williams', 'alice.w@acme.com', 'Acme Corporation'),
    ('Charlie Brown', 'charlie.b@example.com', 'Brown Enterprises');

-- Calculate similarity
SELECT
    name,
    similarity(name, 'Jon Smit') AS similarity_score
FROM customers
ORDER BY similarity_score DESC;

-- Fuzzy search with similarity threshold
SELECT name, email
FROM customers
WHERE name % 'Jon Smit'
ORDER BY similarity(name, 'Jon Smit') DESC;

-- Set similarity threshold (default 0.3)
SET pg_trgm.similarity_threshold = 0.2;

SELECT name, similarity(name, 'Alice') AS score
FROM customers
WHERE name % 'Alice';

-- Word similarity (better for partial matches)
SELECT
    company,
    word_similarity('Acme', company) AS word_sim
FROM customers
ORDER BY word_sim DESC;

-- Create GIN index for fast similarity search
CREATE INDEX idx_customers_name_trgm ON customers USING GIN (name gin_trgm_ops);

-- Optimize LIKE queries with trigram index
-- Before: slow sequential scan
EXPLAIN ANALYZE
SELECT * FROM customers WHERE name LIKE '%Smith%';

-- With trigram index: uses index
EXPLAIN ANALYZE
SELECT * FROM customers WHERE name ILIKE '%smith%';

-- Distance operator for ordering
SELECT
    name,
    name <-> 'Jon Smit' AS distance
FROM customers
ORDER BY name <-> 'Jon Smit'
LIMIT 5;

-- Autocomplete example
CREATE INDEX idx_customers_name_gist_trgm ON customers USING GIST (name gist_trgm_ops);

SELECT name
FROM customers
WHERE name ILIKE 'joh%'
ORDER BY name <-> 'joh'
LIMIT 10;

-- Combined with other conditions
SELECT name, email, company
FROM customers
WHERE
    name % 'Alice'
    AND company ILIKE '%corp%'
ORDER BY similarity(name, 'Alice') DESC;

-- Show trigrams
SELECT show_trgm('PostgreSQL');
```

## btree_gist and btree_gin

### Theory
These extensions allow btree-indexed data types to be used with GiST and GIN indexes, enabling exclusion constraints with ranges and more complex index combinations.

### Syntax

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- Exclusion constraint with ranges
ALTER TABLE table_name
ADD CONSTRAINT constraint_name
EXCLUDE USING GIST (range_column WITH &&);
```

### Examples

```sql
-- Install extensions
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- Room booking system with non-overlapping reservations
CREATE TABLE room_bookings (
    id SERIAL PRIMARY KEY,
    room_id INT NOT NULL,
    guest_name VARCHAR(100),
    booking_period TSTZRANGE NOT NULL,
    EXCLUDE USING GIST (
        room_id WITH =,
        booking_period WITH &&
    )
);

-- Successful booking
INSERT INTO room_bookings (room_id, guest_name, booking_period)
VALUES (
    101,
    'John Doe',
    tstzrange('2024-03-01 14:00', '2024-03-01 16:00')
);

-- This will succeed (different room)
INSERT INTO room_bookings (room_id, guest_name, booking_period)
VALUES (
    102,
    'Jane Smith',
    tstzrange('2024-03-01 14:00', '2024-03-01 16:00')
);

-- This will fail (overlapping time for same room)
-- INSERT INTO room_bookings (room_id, guest_name, booking_period)
-- VALUES (
--     101,
--     'Bob Johnson',
--     tstzrange('2024-03-01 15:00', '2024-03-01 17:00')
-- );

-- IP address range allocation
CREATE TABLE ip_allocations (
    id SERIAL PRIMARY KEY,
    network INET NOT NULL,
    organization VARCHAR(100),
    EXCLUDE USING GIST (network inet_ops WITH &&)
);

INSERT INTO ip_allocations (network, organization) VALUES
    ('192.168.1.0/24', 'Department A'),
    ('192.168.2.0/24', 'Department B');

-- This will fail (overlapping network)
-- INSERT INTO ip_allocations (network, organization)
-- VALUES ('192.168.1.128/25', 'Department C');

-- Multi-column GIN index with btree_gin
CREATE TABLE products_search (
    id SERIAL PRIMARY KEY,
    name TEXT,
    category VARCHAR(50),
    price DECIMAL(10, 2),
    in_stock BOOLEAN
);

-- GIN index combining text search and btree columns
CREATE INDEX idx_products_gin ON products_search
USING GIN (to_tsvector('english', name), category, in_stock);

INSERT INTO products_search (name, category, price, in_stock) VALUES
    ('Laptop Computer', 'electronics', 999.99, true),
    ('Wireless Mouse', 'electronics', 29.99, true),
    ('Office Chair', 'furniture', 199.99, false);

-- Query using the composite GIN index
SELECT * FROM products_search
WHERE
    to_tsvector('english', name) @@ to_tsquery('laptop')
    AND category = 'electronics'
    AND in_stock = true;

-- Employee shift scheduling (no overlapping shifts)
CREATE TABLE employee_shifts (
    id SERIAL PRIMARY KEY,
    employee_id INT NOT NULL,
    shift_time TSTZRANGE NOT NULL,
    EXCLUDE USING GIST (
        employee_id WITH =,
        shift_time WITH &&
    )
);

INSERT INTO employee_shifts (employee_id, shift_time)
VALUES
    (1, tstzrange('2024-03-01 09:00', '2024-03-01 17:00')),
    (1, tstzrange('2024-03-02 09:00', '2024-03-02 17:00')),
    (2, tstzrange('2024-03-01 09:00', '2024-03-01 17:00'));
```

## tablefunc

### Theory
The tablefunc extension provides various table functions including crosstab for creating pivot tables, which transform rows into columns.

### Syntax

```sql
CREATE EXTENSION IF NOT EXISTS tablefunc;

-- Basic crosstab
crosstab(sql text) → setof record

-- Crosstab with predefined columns
crosstab(source_sql text, category_sql text) → setof record
```

### Examples

```sql
-- Install tablefunc
CREATE EXTENSION IF NOT EXISTS tablefunc;

-- Sample sales data
CREATE TABLE sales (
    id SERIAL PRIMARY KEY,
    product VARCHAR(50),
    month VARCHAR(10),
    amount DECIMAL(10, 2)
);

INSERT INTO sales (product, month, amount) VALUES
    ('Laptop', 'Jan', 50000),
    ('Laptop', 'Feb', 55000),
    ('Laptop', 'Mar', 60000),
    ('Mouse', 'Jan', 5000),
    ('Mouse', 'Feb', 5500),
    ('Mouse', 'Mar', 6000),
    ('Keyboard', 'Jan', 8000),
    ('Keyboard', 'Feb', 8500),
    ('Keyboard', 'Mar', 9000);

-- Basic crosstab (pivot)
SELECT * FROM crosstab(
    'SELECT product, month, amount FROM sales ORDER BY 1, 2',
    'SELECT DISTINCT month FROM sales ORDER BY 1'
) AS ct(product VARCHAR, jan DECIMAL, feb DECIMAL, mar DECIMAL);

-- Sales by region and quarter
CREATE TABLE regional_sales (
    id SERIAL PRIMARY KEY,
    region VARCHAR(50),
    quarter VARCHAR(10),
    revenue DECIMAL(12, 2)
);

INSERT INTO regional_sales (region, quarter, revenue) VALUES
    ('North', 'Q1', 100000),
    ('North', 'Q2', 120000),
    ('North', 'Q3', 115000),
    ('North', 'Q4', 130000),
    ('South', 'Q1', 80000),
    ('South', 'Q2', 85000),
    ('South', 'Q3', 90000),
    ('South', 'Q4', 95000),
    ('East', 'Q1', 110000),
    ('East', 'Q2', 115000),
    ('East', 'Q3', 120000),
    ('East', 'Q4', 125000);

-- Pivot by quarter
SELECT * FROM crosstab(
    'SELECT region, quarter, revenue FROM regional_sales ORDER BY 1, 2',
    $$VALUES ('Q1'), ('Q2'), ('Q3'), ('Q4')$$
) AS ct(
    region VARCHAR,
    q1 DECIMAL,
    q2 DECIMAL,
    q3 DECIMAL,
    q4 DECIMAL
);

-- Normal distribution table
SELECT * FROM normal_rand(1000, 100, 15) AS distribution;

-- connectby function for hierarchical data
CREATE TABLE employee_hierarchy (
    id INT PRIMARY KEY,
    name VARCHAR(50),
    manager_id INT
);

INSERT INTO employee_hierarchy VALUES
    (1, 'CEO', NULL),
    (2, 'VP Sales', 1),
    (3, 'VP Engineering', 1),
    (4, 'Sales Manager', 2),
    (5, 'Engineer Lead', 3),
    (6, 'Sales Rep', 4),
    (7, 'Engineer', 5);

SELECT * FROM connectby(
    'employee_hierarchy',
    'id',
    'manager_id',
    '1',
    0,
    '->'
) AS t(id INT, manager_id INT, level INT, path TEXT);
```

## citext

### Theory
The citext extension provides a case-insensitive text type. Comparisons and matching are case-insensitive, which is useful for emails, usernames, and other fields where case shouldn't matter.

### Syntax

```sql
CREATE EXTENSION IF NOT EXISTS citext;

-- Create column with citext type
column_name CITEXT
```

### Examples

```sql
-- Install citext
CREATE EXTENSION IF NOT EXISTS citext;

-- User table with case-insensitive email and username
CREATE TABLE app_users (
    id SERIAL PRIMARY KEY,
    username CITEXT UNIQUE NOT NULL,
    email CITEXT UNIQUE NOT NULL,
    full_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert users
INSERT INTO app_users (username, email, full_name) VALUES
    ('JohnDoe', 'john.doe@example.com', 'John Doe'),
    ('janedoe', 'JANE.DOE@EXAMPLE.COM', 'Jane Doe');

-- Case-insensitive lookup (all these work)
SELECT * FROM app_users WHERE username = 'johndoe';
SELECT * FROM app_users WHERE username = 'JOHNDOE';
SELECT * FROM app_users WHERE username = 'JohnDoe';

-- Email lookup (case-insensitive)
SELECT * FROM app_users WHERE email = 'john.doe@EXAMPLE.com';

-- This will fail due to unique constraint (case-insensitive)
-- INSERT INTO app_users (username, email, full_name)
-- VALUES ('JOHNDOE', 'different@example.com', 'Another John');

-- Comparison
SELECT
    username,
    username = 'johndoe' AS matches_lowercase,
    username = 'JOHNDOE' AS matches_uppercase
FROM app_users;

-- LIKE is also case-insensitive
SELECT username FROM app_users WHERE username LIKE 'john%';
SELECT username FROM app_users WHERE username LIKE 'JOHN%';

-- Regular expressions
SELECT username FROM app_users WHERE username ~ '^john';

-- Convert existing column to citext
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE
);

INSERT INTO tags (name) VALUES ('PostgreSQL'), ('Database'), ('SQL');

-- Migration
ALTER TABLE tags ALTER COLUMN name TYPE CITEXT;

-- Now case-insensitive
SELECT * FROM tags WHERE name = 'postgresql';
SELECT * FROM tags WHERE name = 'POSTGRESQL';
```

## pg_cron

### Theory
pg_cron is a PostgreSQL extension for scheduling SQL commands to run periodically, similar to cron but inside the database. Useful for maintenance tasks, data cleanup, reporting, and scheduled jobs.

Note: pg_cron requires special setup in postgresql.conf and typically runs in a dedicated database.

### Syntax

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule a job
SELECT cron.schedule('job_name', 'cron_schedule', 'SQL_command');

-- Unschedule a job
SELECT cron.unschedule('job_name');

-- View scheduled jobs
SELECT * FROM cron.job;
```

### Examples

```sql
-- Install pg_cron (requires postgresql.conf modification)
-- Add to postgresql.conf: shared_preload_libraries = 'pg_cron'
-- Restart PostgreSQL
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule vacuum every day at 3 AM
SELECT cron.schedule('daily-vacuum', '0 3 * * *', 'VACUUM ANALYZE;');

-- Delete old records every hour
SELECT cron.schedule(
    'cleanup-old-sessions',
    '0 * * * *',
    'DELETE FROM sessions WHERE expires_at < NOW()'
);

-- Refresh materialized view every 15 minutes
SELECT cron.schedule(
    'refresh-dashboard',
    '*/15 * * * *',
    'REFRESH MATERIALIZED VIEW CONCURRENTLY sales_dashboard;'
);

-- Daily backup at midnight
SELECT cron.schedule(
    'daily-backup',
    '0 0 * * *',
    $$pg_dump mydb > /backups/mydb_$(date +\%Y\%m\%d).sql$$
);

-- Weekly aggregation on Sunday at 1 AM
SELECT cron.schedule(
    'weekly-aggregation',
    '0 1 * * 0',
    'INSERT INTO weekly_stats SELECT * FROM calculate_weekly_stats()'
);

-- Run on specific database
SELECT cron.schedule_in_database(
    'job-name',
    '0 * * * *',
    'DELETE FROM temp_data WHERE created_at < NOW() - INTERVAL ''1 day''',
    'target_database'
);

-- View all scheduled jobs
SELECT
    jobid,
    schedule,
    command,
    nodename,
    nodeport,
    database,
    username,
    active
FROM cron.job;

-- View job run history
SELECT
    jobid,
    runid,
    job_pid,
    database,
    username,
    command,
    status,
    return_message,
    start_time,
    end_time
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 20;

-- Unschedule a job
SELECT cron.unschedule('daily-vacuum');

-- Unschedule by job ID
SELECT cron.unschedule(42);
```

## Common Mistakes

1. **Not checking extension availability before installation**
   ```sql
   -- Wrong: Fails if not available
   CREATE EXTENSION pg_stat_statements;

   -- Right: Check first
   SELECT * FROM pg_available_extensions WHERE name = 'pg_stat_statements';
   CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
   ```

2. **Installing pg_cron without proper configuration**
   ```sql
   -- Requires postgresql.conf modification first
   -- shared_preload_libraries = 'pg_cron'
   -- Must restart PostgreSQL
   ```

3. **Using wrong UUID function for PostgreSQL version**
   ```sql
   -- PostgreSQL 13+: Use built-in
   SELECT gen_random_uuid();

   -- Older versions: Need extension
   CREATE EXTENSION "uuid-ossp";
   SELECT uuid_generate_v4();
   ```

4. **Not creating appropriate indexes for pg_trgm**
   ```sql
   -- Wrong: Slow without index
   SELECT * FROM large_table WHERE name LIKE '%search%';

   -- Right: Create trigram index
   CREATE INDEX idx_name_trgm ON large_table USING GIN (name gin_trgm_ops);
   ```

5. **Storing passwords in plain text instead of hashing**
   ```sql
   -- Wrong: Plain text
   INSERT INTO users (username, password) VALUES ('user', 'password123');

   -- Right: Hashed with bcrypt
   INSERT INTO users (username, password_hash)
   VALUES ('user', crypt('password123', gen_salt('bf')));
   ```

6. **Not resetting pg_stat_statements periodically**
   ```sql
   -- Stats accumulate indefinitely, affecting performance
   -- Reset regularly
   SELECT pg_stat_statements_reset();
   ```

7. **Using wrong similarity threshold for fuzzy matching**
   ```sql
   -- Default 0.3 may be too high or too low
   SET pg_trgm.similarity_threshold = 0.2;  -- Adjust based on data
   ```

## Best Practices

1. **Check extension availability before use**
   ```sql
   SELECT * FROM pg_available_extensions
   WHERE name IN ('pg_stat_statements', 'pgcrypto', 'pg_trgm')
   ORDER BY name;
   ```

2. **Use IF NOT EXISTS for idempotent installation**
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
   CREATE EXTENSION IF NOT EXISTS pgcrypto;
   CREATE EXTENSION IF NOT EXISTS pg_trgm;
   ```

3. **Monitor pg_stat_statements regularly**
   ```sql
   -- Create monitoring view
   CREATE OR REPLACE VIEW slow_queries AS
   SELECT
       query,
       calls,
       total_exec_time,
       mean_exec_time,
       max_exec_time
   FROM pg_stat_statements
   WHERE mean_exec_time > 100  -- Queries slower than 100ms
   ORDER BY total_exec_time DESC;
   ```

4. **Use appropriate hash algorithms**
   ```sql
   -- Passwords: bcrypt (adaptive, slow by design)
   crypt(password, gen_salt('bf'))

   -- Data integrity: SHA-256
   digest(data, 'sha256')

   -- Fast hashing: MD5 (only for non-security uses)
   digest(data, 'md5')
   ```

5. **Create appropriate indexes for extensions**
   ```sql
   -- pg_trgm: GIN for similarity, GIST for distance ordering
   CREATE INDEX idx_name_gin ON table USING GIN (name gin_trgm_ops);
   CREATE INDEX idx_name_gist ON table USING GIST (name gist_trgm_ops);
   ```

6. **Document extension dependencies**
   ```sql
   COMMENT ON EXTENSION pg_stat_statements IS
   'Query performance tracking - requires shared_preload_libraries configuration';
   ```

7. **Use gen_random_uuid() for new projects (PostgreSQL 13+)**
   ```sql
   -- Prefer built-in over extension
   CREATE TABLE items (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       name TEXT
   );
   ```

8. **Tune pg_trgm similarity threshold per use case**
   ```sql
   -- Strict matching
   SET pg_trgm.similarity_threshold = 0.5;

   -- Loose matching (autocomplete)
   SET pg_trgm.similarity_threshold = 0.2;
   ```

## Practice Exercises

### Exercise 1: Query Performance Analysis
Create a comprehensive query performance monitoring system using pg_stat_statements.

**Requirements:**
1. Install pg_stat_statements extension
2. Create a view that shows the top 10 slowest queries
3. Create a function that returns queries with low cache hit ratio
4. Create a function to identify queries that should be optimized (high execution time and high call count)

**Solution:**
```sql
-- Install extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Top 10 slowest queries view
CREATE OR REPLACE VIEW top_slow_queries AS
SELECT
    LEFT(query, 100) AS query_preview,
    calls,
    ROUND(total_exec_time::numeric, 2) AS total_time_ms,
    ROUND(mean_exec_time::numeric, 2) AS avg_time_ms,
    ROUND(max_exec_time::numeric, 2) AS max_time_ms,
    ROUND((100 * total_exec_time / SUM(total_exec_time) OVER ())::numeric, 2) AS pct_total_time,
    rows
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY total_exec_time DESC
LIMIT 10;

-- Low cache hit ratio function
CREATE OR REPLACE FUNCTION queries_with_low_cache_hit()
RETURNS TABLE (
    query_preview TEXT,
    calls BIGINT,
    cache_hit_ratio NUMERIC,
    blocks_read BIGINT,
    blocks_hit BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        LEFT(query, 100)::TEXT,
        pg_stat_statements.calls,
        ROUND(
            100.0 * shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0),
            2
        ),
        shared_blks_read,
        shared_blks_hit
    FROM pg_stat_statements
    WHERE shared_blks_hit + shared_blks_read > 0
      AND shared_blks_hit::float / NULLIF(shared_blks_hit + shared_blks_read, 0) < 0.9
    ORDER BY shared_blks_read DESC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Queries needing optimization
CREATE OR REPLACE FUNCTION queries_needing_optimization()
RETURNS TABLE (
    query_preview TEXT,
    calls BIGINT,
    total_time_ms NUMERIC,
    avg_time_ms NUMERIC,
    optimization_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        LEFT(query, 100)::TEXT,
        pg_stat_statements.calls,
        ROUND(total_exec_time::numeric, 2),
        ROUND(mean_exec_time::numeric, 2),
        ROUND((pg_stat_statements.calls * mean_exec_time)::numeric, 2) AS opt_score
    FROM pg_stat_statements
    WHERE calls > 10
      AND mean_exec_time > 50
    ORDER BY (pg_stat_statements.calls * mean_exec_time) DESC
    LIMIT 15;
END;
$$ LANGUAGE plpgsql;

-- Test the functions
SELECT * FROM top_slow_queries;
SELECT * FROM queries_with_low_cache_hit();
SELECT * FROM queries_needing_optimization();
```

### Exercise 2: Fuzzy Search System
Build a product search system with fuzzy matching using pg_trgm.

**Requirements:**
1. Create a products table with name and description
2. Implement trigram indexes for fast fuzzy search
3. Create a search function that finds products by similarity
4. Implement autocomplete functionality
5. Compare performance with and without indexes

**Solution:**
```sql
-- Install extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create products table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    price DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO products (name, description, category, price) VALUES
    ('Apple MacBook Pro 16"', 'High-performance laptop with M3 chip', 'Electronics', 2499.99),
    ('Apple iPhone 15 Pro', 'Latest smartphone with A17 chip', 'Electronics', 999.99),
    ('Samsung Galaxy S24', 'Android flagship smartphone', 'Electronics', 899.99),
    ('Dell XPS 15', 'Premium Windows laptop', 'Electronics', 1799.99),
    ('Sony WH-1000XM5', 'Noise-cancelling headphones', 'Audio', 399.99),
    ('Bose QuietComfort 45', 'Premium wireless headphones', 'Audio', 329.99),
    ('Apple AirPods Pro', 'Wireless earbuds with ANC', 'Audio', 249.99),
    ('Logitech MX Master 3', 'Ergonomic wireless mouse', 'Accessories', 99.99);

-- Create trigram indexes
CREATE INDEX idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);
CREATE INDEX idx_products_desc_trgm ON products USING GIN (description gin_trgm_ops);
CREATE INDEX idx_products_name_gist ON products USING GIST (name gist_trgm_ops);

-- Fuzzy search function
CREATE OR REPLACE FUNCTION search_products(search_term TEXT, threshold REAL DEFAULT 0.3)
RETURNS TABLE (
    product_id INT,
    product_name VARCHAR,
    product_description TEXT,
    similarity_score REAL
) AS $$
BEGIN
    SET pg_trgm.similarity_threshold = threshold;

    RETURN QUERY
    SELECT
        id,
        name,
        description,
        GREATEST(
            similarity(name, search_term),
            similarity(COALESCE(description, ''), search_term)
        ) AS sim_score
    FROM products
    WHERE
        name % search_term
        OR description % search_term
    ORDER BY sim_score DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Autocomplete function
CREATE OR REPLACE FUNCTION autocomplete_products(prefix TEXT)
RETURNS TABLE (
    product_id INT,
    product_name VARCHAR,
    distance REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        id,
        name,
        name <-> prefix AS dist
    FROM products
    WHERE name ILIKE prefix || '%'
    ORDER BY dist
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Test fuzzy search
SELECT * FROM search_products('Appl laptop');
SELECT * FROM search_products('hedphones', 0.2);

-- Test autocomplete
SELECT * FROM autocomplete_products('App');
SELECT * FROM autocomplete_products('Sam');

-- Performance comparison
EXPLAIN ANALYZE
SELECT * FROM products WHERE name ILIKE '%macbook%';

EXPLAIN ANALYZE
SELECT * FROM products WHERE name % 'macbook'
ORDER BY similarity(name, 'macbook') DESC;
```

### Exercise 3: Secure User Authentication System
Build a complete user authentication system with password hashing and API token management.

**Requirements:**
1. Create users table with bcrypt password hashing
2. Implement secure password verification
3. Create API token system with expiration
4. Add password reset token functionality
5. Implement account lockout after failed attempts

**Solution:**
```sql
-- Install extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email CITEXT UNIQUE NOT NULL,
    username CITEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API tokens table
CREATE TABLE api_tokens (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    token_name VARCHAR(100),
    expires_at TIMESTAMP NOT NULL,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Password reset tokens
CREATE TABLE password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user function
CREATE OR REPLACE FUNCTION create_user(
    p_email TEXT,
    p_username TEXT,
    p_password TEXT
) RETURNS INT AS $$
DECLARE
    v_user_id INT;
BEGIN
    INSERT INTO users (email, username, password_hash)
    VALUES (
        p_email,
        p_username,
        crypt(p_password, gen_salt('bf', 10))
    )
    RETURNING id INTO v_user_id;

    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

-- Verify password function
CREATE OR REPLACE FUNCTION verify_password(
    p_username TEXT,
    p_password TEXT
) RETURNS TABLE (
    authenticated BOOLEAN,
    user_id INT,
    message TEXT
) AS $$
DECLARE
    v_user RECORD;
    v_max_attempts INT := 5;
    v_lockout_duration INTERVAL := '30 minutes';
BEGIN
    -- Get user
    SELECT * INTO v_user
    FROM users
    WHERE username = p_username OR email = p_username;

    -- User not found
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::INT, 'Invalid credentials'::TEXT;
        RETURN;
    END IF;

    -- Check if account is locked
    IF v_user.locked_until IS NOT NULL AND v_user.locked_until > NOW() THEN
        RETURN QUERY SELECT
            false,
            NULL::INT,
            'Account locked until ' || v_user.locked_until::TEXT;
        RETURN;
    END IF;

    -- Verify password
    IF v_user.password_hash = crypt(p_password, v_user.password_hash) THEN
        -- Success: reset failed attempts
        UPDATE users
        SET failed_login_attempts = 0,
            locked_until = NULL
        WHERE id = v_user.id;

        RETURN QUERY SELECT true, v_user.id, 'Authentication successful'::TEXT;
    ELSE
        -- Failed: increment attempts
        UPDATE users
        SET failed_login_attempts = failed_login_attempts + 1,
            locked_until = CASE
                WHEN failed_login_attempts + 1 >= v_max_attempts
                THEN NOW() + v_lockout_duration
                ELSE NULL
            END
        WHERE id = v_user.id;

        RETURN QUERY SELECT
            false,
            NULL::INT,
            'Invalid credentials. Attempts: ' || (v_user.failed_login_attempts + 1)::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create API token function
CREATE OR REPLACE FUNCTION create_api_token(
    p_user_id INT,
    p_token_name TEXT DEFAULT 'API Token',
    p_expires_days INT DEFAULT 30
) RETURNS TEXT AS $$
DECLARE
    v_token TEXT;
    v_token_hash TEXT;
BEGIN
    -- Generate random token
    v_token := encode(gen_random_bytes(32), 'hex');
    v_token_hash := encode(digest(v_token, 'sha256'), 'hex');

    -- Store hashed token
    INSERT INTO api_tokens (user_id, token_hash, token_name, expires_at)
    VALUES (
        p_user_id,
        v_token_hash,
        p_token_name,
        NOW() + (p_expires_days || ' days')::INTERVAL
    );

    -- Return plain token (only time it's visible)
    RETURN v_token;
END;
$$ LANGUAGE plpgsql;

-- Verify API token function
CREATE OR REPLACE FUNCTION verify_api_token(p_token TEXT)
RETURNS TABLE (
    valid BOOLEAN,
    user_id INT
) AS $$
DECLARE
    v_token_hash TEXT;
    v_token_record RECORD;
BEGIN
    v_token_hash := encode(digest(p_token, 'sha256'), 'hex');

    SELECT * INTO v_token_record
    FROM api_tokens t
    JOIN users u ON t.user_id = u.id
    WHERE t.token_hash = v_token_hash
      AND t.expires_at > NOW()
      AND u.is_active = true;

    IF FOUND THEN
        -- Update last used
        UPDATE api_tokens
        SET last_used_at = NOW()
        WHERE token_hash = v_token_hash;

        RETURN QUERY SELECT true, v_token_record.user_id;
    ELSE
        RETURN QUERY SELECT false, NULL::INT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Test the system
-- Create user
SELECT create_user('john@example.com', 'johndoe', 'SecurePass123!');

-- Verify password (correct)
SELECT * FROM verify_password('johndoe', 'SecurePass123!');

-- Verify password (wrong)
SELECT * FROM verify_password('johndoe', 'WrongPassword');

-- Create API token
SELECT create_api_token(1, 'Mobile App', 90);

-- Clean up expired tokens
DELETE FROM api_tokens WHERE expires_at < NOW();
DELETE FROM password_reset_tokens WHERE expires_at < NOW() OR used_at IS NOT NULL;
```

## Summary

PostgreSQL extensions significantly extend database capabilities:
- **pg_stat_statements**: Query performance monitoring and optimization
- **pgcrypto**: Cryptographic functions for security
- **UUID generation**: Globally unique identifiers
- **pg_trgm**: Fuzzy text search and similarity matching
- **btree_gist/btree_gin**: Advanced indexing and exclusion constraints
- **tablefunc**: Pivot tables and hierarchical queries
- **citext**: Case-insensitive text handling
- **pg_cron**: Database job scheduling

Choose extensions based on your specific needs and always consider performance implications.
