# Partial and Expression Indexes

## Theory

### Partial Indexes

A partial index is an index built over a subset of a table, defined by a WHERE clause. Only rows satisfying the WHERE condition are included in the index.

**Benefits:**
- **Smaller index size**: Only indexes relevant rows
- **Faster updates**: Index only maintained for matching rows
- **Better query performance**: More focused, higher cache hit ratio
- **Cost-effective**: Index exactly what you query

**Use cases:**
- Indexing active/current records (WHERE is_active = true)
- Indexing non-null values (WHERE column IS NOT NULL)
- Indexing specific statuses (WHERE status = 'pending')
- Indexing recent data (WHERE created_at > certain_date)
- Soft-deleted records (WHERE deleted_at IS NULL)

**How PostgreSQL uses partial indexes:**
- Query planner checks if query WHERE clause is compatible with index WHERE clause
- Index is used only if query is guaranteed to match index predicate
- Query WHERE can be more restrictive than index WHERE (but not less)

### Expression Indexes

An expression index (also called functional index) indexes the result of an expression or function, rather than column values directly.

**Benefits:**
- **Query optimization**: Pre-compute expensive operations
- **Case-insensitive searches**: Index LOWER(column)
- **Date truncation**: Index date_trunc('day', timestamp)
- **JSON extraction**: Index specific JSONB keys
- **Computed values**: Index mathematical expressions

**Common expressions:**
- String functions: LOWER(), UPPER(), TRIM(), SUBSTRING()
- Date functions: date_trunc(), EXTRACT()
- Mathematical: ABS(), ROUND()
- JSONB operators: ->, ->>, #>
- Type casts: column::text
- Concatenation: column1 || column2

**Important:**
- Expression in query must EXACTLY match indexed expression
- IMMUTABLE functions only (deterministic, no database access)
- Expression computed at INSERT/UPDATE time (write penalty)

### Combining Partial + Expression Indexes

You can combine both techniques for maximum optimization:
```sql
CREATE INDEX idx_name ON table (LOWER(email)) WHERE is_active = true;
```

This indexes lowercased emails, but only for active users - smallest, most targeted index possible.

### Performance Considerations

**Partial indexes:**
- Trade-off: Smaller index vs query planner complexity
- Best when subset is small (< 10-20% of table)
- Most effective with highly selective predicates

**Expression indexes:**
- Trade-off: Query performance vs write performance
- Best for frequently executed queries with same expression
- Consider expression complexity (simple is better)

## Syntax

### Partial Indexes

```sql
-- Basic partial index
CREATE INDEX index_name ON table_name (column_name)
WHERE condition;

-- Multi-column partial index
CREATE INDEX index_name ON table_name (col1, col2)
WHERE condition;

-- With complex WHERE clause
CREATE INDEX index_name ON table_name (column_name)
WHERE condition1 AND condition2;

-- Common patterns
CREATE INDEX idx_active ON users (user_id) WHERE is_active = true;
CREATE INDEX idx_not_null ON users (email) WHERE email IS NOT NULL;
CREATE INDEX idx_recent ON orders (order_id) WHERE created_at > '2024-01-01';
CREATE INDEX idx_pending ON tasks (task_id) WHERE status IN ('pending', 'in_progress');
```

### Expression Indexes

```sql
-- Basic expression index
CREATE INDEX index_name ON table_name (expression);

-- Common expressions
CREATE INDEX idx_lower_email ON users (LOWER(email));
CREATE INDEX idx_date_only ON events (DATE(timestamp));
CREATE INDEX idx_year_month ON logs (date_trunc('month', created_at));

-- JSONB extraction
CREATE INDEX idx_json_field ON documents ((data->>'field_name'));
CREATE INDEX idx_json_nested ON documents ((data->'user'->>'email'));

-- Mathematical expression
CREATE INDEX idx_total ON orders ((quantity * unit_price));

-- Concatenation
CREATE INDEX idx_full_name ON users ((first_name || ' ' || last_name));

-- Type cast
CREATE INDEX idx_as_text ON records ((id::text));
```

### Combining Partial and Expression

```sql
-- Expression index on subset of rows
CREATE INDEX index_name ON table_name (expression)
WHERE condition;

-- Examples
CREATE INDEX idx_lower_email_active ON users (LOWER(email))
WHERE is_active = true;

CREATE INDEX idx_month_recent ON events (date_trunc('month', timestamp))
WHERE timestamp > CURRENT_DATE - INTERVAL '1 year';

CREATE INDEX idx_json_active ON documents ((data->>'status'))
WHERE (data->>'active')::boolean = true;
```

### Querying with Indexes

```sql
-- For partial index to be used, query WHERE must be compatible
-- Index: WHERE is_active = true
SELECT * FROM users WHERE is_active = true AND name = 'John';  -- Can use index
SELECT * FROM users WHERE name = 'John';  -- Cannot use index (might have inactive users)

-- For expression index, query must use EXACT expression
-- Index: LOWER(email)
SELECT * FROM users WHERE LOWER(email) = 'john@example.com';  -- Uses index
SELECT * FROM users WHERE email = 'john@example.com';  -- Does NOT use index
```

## Examples

### Example 1: Partial Index for Active Records

```sql
-- Create users table with active/inactive flag
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Insert test data: 90% active, 10% inactive
INSERT INTO users (username, email, is_active, created_at, last_login)
SELECT
    'user' || i,
    'user' || i || '@example.com',
    random() > 0.1,  -- 90% true
    CURRENT_TIMESTAMP - (random() * 730 || ' days')::INTERVAL,
    CURRENT_TIMESTAMP - (random() * 30 || ' days')::INTERVAL
FROM generate_series(1, 100000) AS i;

-- Full index on email (includes inactive users)
CREATE INDEX idx_users_email_full ON users (email);

-- Partial index on email (only active users)
CREATE INDEX idx_users_email_active ON users (email)
WHERE is_active = true;

-- Compare index sizes
SELECT
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    idx_scan,
    idx_tup_read
FROM pg_stat_user_indexes
WHERE tablename = 'users' AND indexname LIKE '%email%'
ORDER BY pg_relation_size(indexrelid) DESC;
-- idx_users_email_full: ~4.3 MB
-- idx_users_email_active: ~3.9 MB (10% smaller)

-- Query that uses partial index
EXPLAIN ANALYZE
SELECT * FROM users WHERE is_active = true AND email = 'user50000@example.com';
-- Index Scan using idx_users_email_active

-- Query that CANNOT use partial index (might include inactive users)
EXPLAIN ANALYZE
SELECT * FROM users WHERE email = 'user50000@example.com';
-- Index Scan using idx_users_email_full (uses full index instead)

-- Most queries in the application only care about active users
-- Partial index is smaller and faster for this common case
```

### Example 2: Partial Index for Non-NULL Values

```sql
-- Create products table where some don't have SKU
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    sku VARCHAR(50),  -- NULL for products without SKU
    category VARCHAR(50),
    price NUMERIC(10, 2)
);

-- Insert data: 70% have SKU, 30% don't
INSERT INTO products (name, sku, category, price)
SELECT
    'Product ' || i,
    CASE WHEN random() > 0.3 THEN 'SKU-' || LPAD(i::TEXT, 8, '0') ELSE NULL END,
    (ARRAY['Electronics', 'Clothing', 'Food', 'Books'])[1 + (i % 4)],
    (random() * 1000)::NUMERIC(10, 2)
FROM generate_series(1, 100000) AS i;

-- Full index (includes NULLs)
CREATE INDEX idx_products_sku_full ON products (sku);

-- Partial index (only non-NULL SKUs)
CREATE INDEX idx_products_sku_not_null ON products (sku)
WHERE sku IS NOT NULL;

-- Compare sizes
SELECT
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE tablename = 'products' AND indexname LIKE '%sku%';
-- idx_products_sku_full: ~3.5 MB
-- idx_products_sku_not_null: ~2.5 MB (30% smaller)

-- Query for specific SKU (uses partial index)
EXPLAIN ANALYZE
SELECT * FROM products WHERE sku = 'SKU-00050000';
-- Index Scan using idx_products_sku_not_null

-- Find products without SKU (cannot use partial index)
EXPLAIN ANALYZE
SELECT * FROM products WHERE sku IS NULL;
-- Seq Scan (or different index if created)

-- If you frequently query both NULL and non-NULL, consider:
CREATE INDEX idx_products_sku_null ON products (product_id) WHERE sku IS NULL;
-- Small index for NULL values
```

### Example 3: Partial Index for Specific Statuses

```sql
-- Create orders table with various statuses
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    total_amount NUMERIC(10, 2),
    status VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert data with realistic status distribution
INSERT INTO orders (customer_id, total_amount, status, created_at)
SELECT
    (random() * 10000)::INTEGER,
    (random() * 1000)::NUMERIC(10, 2),
    CASE
        WHEN random() < 0.05 THEN 'pending'      -- 5%
        WHEN random() < 0.10 THEN 'processing'   -- 5%
        WHEN random() < 0.20 THEN 'shipped'      -- 10%
        WHEN random() < 0.90 THEN 'delivered'    -- 70%
        ELSE 'cancelled'                          -- 10%
    END,
    CURRENT_TIMESTAMP - (random() * 365 || ' days')::INTERVAL
FROM generate_series(1, 500000) AS i;

-- Full index on status
CREATE INDEX idx_orders_status_full ON orders (status, created_at);

-- Partial indexes for actionable statuses only
CREATE INDEX idx_orders_pending ON orders (order_id, created_at)
WHERE status = 'pending';

CREATE INDEX idx_orders_processing ON orders (order_id, customer_id)
WHERE status = 'processing';

CREATE INDEX idx_orders_shipped ON orders (order_id, created_at)
WHERE status = 'shipped';

-- Compare sizes
SELECT
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    ROUND(100.0 * pg_relation_size(indexrelid) / pg_relation_size('orders'), 2) AS pct_of_table
FROM pg_stat_user_indexes
WHERE tablename = 'orders' AND indexname LIKE '%status%'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Query for pending orders (uses partial index)
EXPLAIN ANALYZE
SELECT * FROM orders
WHERE status = 'pending'
ORDER BY created_at
LIMIT 100;
-- Index Scan using idx_orders_pending (very small, fast)

-- Application dashboard queries actionable statuses frequently
-- 70% delivered orders are rarely queried - no need to index them
```

### Example 4: Expression Index for Case-Insensitive Search

```sql
-- Create customers table
CREATE TABLE customers (
    customer_id SERIAL PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    phone VARCHAR(20)
);

-- Insert data with mixed case
INSERT INTO customers (email, first_name, last_name, phone)
SELECT
    (ARRAY['User', 'user', 'USER', 'UsEr'])[1 + (i % 4)] || i || '@' ||
    (ARRAY['gmail.com', 'Yahoo.Com', 'OUTLOOK.com', 'example.COM'])[1 + (i % 4)],
    'First' || i,
    'Last' || i,
    '+1-555-' || LPAD(i::TEXT, 7, '0')
FROM generate_series(1, 100000) AS i;

-- WITHOUT expression index - case-sensitive search doesn't work
SELECT * FROM customers WHERE email = 'user50000@gmail.com';
-- Returns nothing if actual case is 'User50000@Gmail.com'

-- Case-insensitive query without index (slow)
EXPLAIN ANALYZE
SELECT * FROM customers WHERE LOWER(email) = LOWER('User50000@Gmail.com');
-- Seq Scan (must compute LOWER(email) for every row)

-- Create expression index
CREATE INDEX idx_customers_email_lower ON customers (LOWER(email));

-- Same query now uses index (fast)
EXPLAIN ANALYZE
SELECT * FROM customers WHERE LOWER(email) = LOWER('User50000@Gmail.com');
-- Index Scan using idx_customers_email_lower

-- Query must use EXACT expression as index
EXPLAIN ANALYZE
SELECT * FROM customers WHERE UPPER(email) = 'USER50000@GMAIL.COM';
-- Seq Scan (UPPER doesn't match LOWER index)

-- For uniqueness with case-insensitivity
CREATE UNIQUE INDEX idx_customers_email_unique_lower ON customers (LOWER(email));
-- Prevents 'user@example.com' and 'User@Example.com' from both existing
```

### Example 5: Expression Index for Date Truncation

```sql
-- Create events table
CREATE TABLE events (
    event_id SERIAL PRIMARY KEY,
    event_type VARCHAR(50),
    user_id INTEGER,
    event_timestamp TIMESTAMP,
    data JSONB
);

-- Insert 1 million events over 2 years
INSERT INTO events (event_type, user_id, event_timestamp, data)
SELECT
    (ARRAY['login', 'logout', 'purchase', 'view'])[1 + (i % 4)],
    (random() * 100000)::INTEGER,
    CURRENT_TIMESTAMP - (random() * 730 || ' days')::INTERVAL,
    jsonb_build_object('value', (random() * 1000)::NUMERIC(10, 2))
FROM generate_series(1, 1000000) AS i;

-- Common query: events by day
-- Without index - slow
EXPLAIN ANALYZE
SELECT date_trunc('day', event_timestamp) AS day, COUNT(*)
FROM events
WHERE date_trunc('day', event_timestamp) = '2025-06-15'
GROUP BY day;
-- Seq Scan (computes date_trunc for every row)

-- Create expression index
CREATE INDEX idx_events_day ON events (date_trunc('day', event_timestamp));

-- Same query now uses index
EXPLAIN ANALYZE
SELECT date_trunc('day', event_timestamp) AS day, COUNT(*)
FROM events
WHERE date_trunc('day', event_timestamp) = '2025-06-15'
GROUP BY day;
-- Bitmap Index Scan on idx_events_day

-- Monthly aggregation
CREATE INDEX idx_events_month ON events (date_trunc('month', event_timestamp));

EXPLAIN ANALYZE
SELECT date_trunc('month', event_timestamp) AS month, COUNT(*)
FROM events
WHERE date_trunc('month', event_timestamp) >= '2025-01-01'
    AND date_trunc('month', event_timestamp) < '2026-01-01'
GROUP BY month
ORDER BY month;
-- Index Scan using idx_events_month

-- Extract year
CREATE INDEX idx_events_year ON events (EXTRACT(YEAR FROM event_timestamp));

SELECT EXTRACT(YEAR FROM event_timestamp) AS year, COUNT(*)
FROM events
WHERE EXTRACT(YEAR FROM event_timestamp) = 2025
GROUP BY year;
```

### Example 6: Expression Index for JSONB Fields

```sql
-- Create documents table with JSONB data
CREATE TABLE documents (
    doc_id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    content JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert documents with nested JSONB
INSERT INTO documents (title, content)
SELECT
    'Document ' || i,
    jsonb_build_object(
        'author', jsonb_build_object(
            'name', 'Author ' || (i % 1000),
            'email', 'author' || (i % 1000) || '@example.com',
            'id', (i % 1000)
        ),
        'metadata', jsonb_build_object(
            'category', (ARRAY['tech', 'business', 'science', 'arts'])[1 + (i % 4)],
            'status', (ARRAY['draft', 'published', 'archived'])[1 + (i % 3)],
            'views', (random() * 10000)::INTEGER
        ),
        'tags', jsonb_build_array('tag' || (i % 50), 'tag' || (i % 100))
    )
FROM generate_series(1, 100000) AS i;

-- Query without index - slow
EXPLAIN ANALYZE
SELECT * FROM documents
WHERE content->'author'->>'name' = 'Author 500';
-- Seq Scan (extracts JSON field from every row)

-- Create expression index on nested JSONB field
CREATE INDEX idx_docs_author_name ON documents ((content->'author'->>'name'));

-- Same query now uses index
EXPLAIN ANALYZE
SELECT * FROM documents
WHERE content->'author'->>'name' = 'Author 500';
-- Index Scan using idx_docs_author_name

-- Index on category (useful for filtering)
CREATE INDEX idx_docs_category ON documents ((content->'metadata'->>'category'));

-- Query by category
EXPLAIN ANALYZE
SELECT * FROM documents
WHERE content->'metadata'->>'category' = 'tech';
-- Index Scan using idx_docs_category

-- Combined: expression + partial index
CREATE INDEX idx_docs_published_category ON documents ((content->'metadata'->>'category'))
WHERE content->'metadata'->>'status' = 'published';
-- Only indexes categories for published documents

-- Numeric JSONB field
CREATE INDEX idx_docs_views ON documents (((content->'metadata'->>'views')::INTEGER));

SELECT * FROM documents
WHERE (content->'metadata'->>'views')::INTEGER > 5000
ORDER BY (content->'metadata'->>'views')::INTEGER DESC
LIMIT 10;
```

### Example 7: Complex Combined Example

```sql
-- Create application logs table
CREATE TABLE app_logs (
    log_id BIGSERIAL PRIMARY KEY,
    application VARCHAR(50),
    log_level VARCHAR(10),
    message TEXT,
    user_email VARCHAR(100),
    request_path VARCHAR(255),
    response_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

-- Insert 2 million logs
INSERT INTO app_logs (application, log_level, message, user_email, request_path, response_time_ms, created_at, metadata)
SELECT
    (ARRAY['web', 'api', 'worker', 'scheduler'])[1 + (i % 4)],
    CASE
        WHEN random() < 0.70 THEN 'INFO'
        WHEN random() < 0.90 THEN 'WARN'
        ELSE 'ERROR'
    END,
    'Log message ' || i,
    'user' || (i % 10000) || '@example.com',
    '/path/' || (i % 100),
    (random() * 5000)::INTEGER,
    CURRENT_TIMESTAMP - (random() * 90 || ' days')::INTERVAL,
    jsonb_build_object(
        'ip', '192.168.' || (i % 256) || '.' || (i % 256),
        'user_agent', 'Browser/' || (i % 10)
    )
FROM generate_series(1, 2000000) AS i;

-- Strategy: Most queries are for recent errors and warnings
-- Don't need to index INFO logs (70% of data)

-- Partial index: Recent errors only
CREATE INDEX idx_logs_recent_errors ON app_logs (created_at, application)
WHERE log_level = 'ERROR' AND created_at > CURRENT_DATE - INTERVAL '30 days';

-- Partial index: Recent warnings only
CREATE INDEX idx_logs_recent_warnings ON app_logs (created_at, application)
WHERE log_level = 'WARN' AND created_at > CURRENT_DATE - INTERVAL '30 days';

-- Expression + Partial: Case-insensitive email search for errors
CREATE INDEX idx_logs_email_errors ON app_logs (LOWER(user_email))
WHERE log_level IN ('ERROR', 'WARN');

-- Expression + Partial: Daily aggregation for recent data
CREATE INDEX idx_logs_daily_recent ON app_logs (date_trunc('day', created_at), log_level)
WHERE created_at > CURRENT_DATE - INTERVAL '90 days';

-- Expression: JSONB IP address extraction
CREATE INDEX idx_logs_ip ON app_logs ((metadata->>'ip'))
WHERE log_level = 'ERROR';

-- Compare index sizes
SELECT
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    pg_size_pretty(pg_relation_size('app_logs')) AS table_size
FROM pg_stat_user_indexes
WHERE tablename = 'app_logs'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Test queries
EXPLAIN ANALYZE
SELECT * FROM app_logs
WHERE log_level = 'ERROR'
    AND created_at > CURRENT_DATE - INTERVAL '7 days'
ORDER BY created_at DESC;
-- Uses idx_logs_recent_errors

EXPLAIN ANALYZE
SELECT * FROM app_logs
WHERE LOWER(user_email) = 'user1234@example.com'
    AND log_level = 'ERROR';
-- Uses idx_logs_email_errors
```

## Common Mistakes

### 1. Query Doesn't Match Partial Index Predicate

```sql
-- Create partial index
CREATE INDEX idx_users_active ON users (email) WHERE is_active = true;

-- BAD: Query might include inactive users (planner won't use index)
SELECT * FROM users WHERE email = 'john@example.com';
-- Seq Scan or different index

-- GOOD: Query explicitly filters for active users
SELECT * FROM users WHERE email = 'john@example.com' AND is_active = true;
-- Index Scan using idx_users_active
```

### 2. Query Expression Doesn't Match Index Expression

```sql
-- Create expression index
CREATE INDEX idx_users_lower_email ON users (LOWER(email));

-- BAD: Different function
SELECT * FROM users WHERE UPPER(email) = 'JOHN@EXAMPLE.COM';
-- Seq Scan (UPPER != LOWER)

-- BAD: Different expression order
SELECT * FROM users WHERE TRIM(LOWER(email)) = 'john@example.com';
-- Seq Scan (TRIM(LOWER(x)) != LOWER(x))

-- GOOD: Exact match
SELECT * FROM users WHERE LOWER(email) = 'john@example.com';
-- Index Scan using idx_users_lower_email
```

### 3. Using Volatile or Stable Functions in Expression Index

```sql
-- BAD: CURRENT_DATE is STABLE (changes during the day)
CREATE INDEX idx_bad ON events (event_date - CURRENT_DATE);
-- ERROR or unexpected behavior

-- BAD: random() is VOLATILE
CREATE INDEX idx_bad ON data (random());
-- ERROR: functions in index expression must be marked IMMUTABLE

-- GOOD: IMMUTABLE functions only
CREATE INDEX idx_good ON events (date_trunc('day', event_timestamp));
-- OK: date_trunc is IMMUTABLE
```

### 4. Overly Narrow Partial Index

```sql
-- BAD: Too specific (might need to change code)
CREATE INDEX idx_users_jan_2025 ON users (user_id)
WHERE created_at >= '2025-01-01' AND created_at < '2025-02-01';
-- Only works for one month! Must create new index every month.

-- GOOD: More flexible
CREATE INDEX idx_users_recent ON users (created_at, user_id)
WHERE created_at > CURRENT_DATE - INTERVAL '90 days';
-- Or use BRIN for time-series data
```

### 5. Not Analyzing After Creating Index

```sql
-- Create index
CREATE INDEX idx_products_lower_name ON products (LOWER(name))
WHERE is_available = true;

-- BAD: Don't run ANALYZE
-- Planner has no statistics about the index

-- GOOD: Update statistics
ANALYZE products;
-- Now planner knows about index and can make informed decisions
```

## Best Practices

### 1. Use Partial Indexes for Subset Queries

```sql
-- If 90% of queries filter on is_active = true
CREATE INDEX idx_users_active_email ON users (email)
WHERE is_active = true;

-- Smaller, faster, more cache-friendly than full index
```

### 2. Document Complex Indexes

```sql
-- Comment on why index exists and how it's used
CREATE INDEX idx_orders_pending ON orders (created_at, customer_id)
WHERE status IN ('pending', 'processing');

COMMENT ON INDEX idx_orders_pending IS
'Partial index for dashboard queries showing active orders. Covers ~10% of all orders. Used by: daily_pending_orders_report, customer_pending_orders_view.';
```

### 3. Test Query Plans

```sql
-- Always verify index is being used
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM users WHERE LOWER(email) = 'test@example.com';

-- Check:
-- 1. Is index being used?
-- 2. Are buffers hit (cached) or read (disk)?
-- 3. Is execution time acceptable?
```

### 4. Keep Expressions Simple

```sql
-- BAD: Complex expression (hard to maintain, slower writes)
CREATE INDEX idx_complex ON data (
    CASE
        WHEN value > 100 THEN 'high'
        WHEN value > 50 THEN 'medium'
        ELSE 'low'
    END
);

-- GOOD: Simple expression
CREATE INDEX idx_simple ON data (LOWER(status));

-- For complex logic, consider a generated column + regular index
ALTER TABLE data ADD COLUMN value_category VARCHAR(10)
    GENERATED ALWAYS AS (
        CASE WHEN value > 100 THEN 'high'
             WHEN value > 50 THEN 'medium'
             ELSE 'low' END
    ) STORED;
CREATE INDEX idx_category ON data (value_category);
```

### 5. Monitor Partial Index Effectiveness

```sql
-- Check if partial index is actually smaller
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    idx_scan,
    idx_tup_read
FROM pg_stat_user_indexes
WHERE tablename = 'your_table'
ORDER BY pg_relation_size(indexrelid) DESC;

-- If partial index isn't significantly smaller, reconsider if it's worth it
```

## Practice Exercises

### Exercise 1: Optimize E-commerce Order Queries

```sql
-- Create orders table with realistic data distribution
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    customer_email VARCHAR(100),
    total_amount NUMERIC(10, 2),
    status VARCHAR(20),
    payment_status VARCHAR(20),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Insert 1M orders with distribution:
-- - 5% pending, 10% processing, 15% shipped, 65% delivered, 5% cancelled
-- - 90% paid, 5% pending_payment, 5% refunded
INSERT INTO orders (customer_email, total_amount, status, payment_status, created_at, updated_at)
SELECT
    'customer' || (i % 50000) || '@' ||
        (ARRAY['gmail.com', 'yahoo.com', 'outlook.com'])[1 + (i % 3)],
    (random() * 500)::NUMERIC(10, 2),
    CASE
        WHEN random() < 0.05 THEN 'pending'
        WHEN random() < 0.15 THEN 'processing'
        WHEN random() < 0.30 THEN 'shipped'
        WHEN random() < 0.95 THEN 'delivered'
        ELSE 'cancelled'
    END,
    CASE
        WHEN random() < 0.90 THEN 'paid'
        WHEN random() < 0.95 THEN 'pending_payment'
        ELSE 'refunded'
    END,
    CURRENT_TIMESTAMP - (random() * 365 || ' days')::INTERVAL,
    CURRENT_TIMESTAMP - (random() * 30 || ' days')::INTERVAL
FROM generate_series(1, 1000000) AS i;

-- Tasks:
-- 1. Create partial index for "actionable" orders (pending, processing, shipped)
--    Most queries don't care about delivered orders

-- 2. Create expression index for case-insensitive email search
--    (users might type email with different case)

-- 3. Create partial + expression index for recent unpaid orders
--    (common query for payment follow-up)

-- 4. Test these queries and verify indexes are used:
--    a) SELECT * FROM orders WHERE status = 'pending' ORDER BY created_at;
--    b) SELECT * FROM orders WHERE LOWER(customer_email) = 'customer123@gmail.com';
--    c) SELECT * FROM orders WHERE payment_status = 'pending_payment'
--       AND created_at > CURRENT_DATE - INTERVAL '7 days';

-- 5. Compare index sizes with equivalent full indexes
```

### Exercise 2: Log Table Optimization

```sql
-- Create application log table
CREATE TABLE application_logs (
    log_id BIGSERIAL PRIMARY KEY,
    application_name VARCHAR(50),
    log_level VARCHAR(10),
    logger_name VARCHAR(100),
    message TEXT,
    stack_trace TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    context JSONB
);

-- Insert 5M logs (70% INFO, 20% WARN, 10% ERROR)
INSERT INTO application_logs (application_name, log_level, logger_name, message, stack_trace, created_at, context)
SELECT
    (ARRAY['web-app', 'api-server', 'worker', 'cron'])[1 + (i % 4)],
    CASE
        WHEN random() < 0.70 THEN 'INFO'
        WHEN random() < 0.90 THEN 'WARN'
        ELSE 'ERROR'
    END,
    'com.example.Logger' || (i % 50),
    'Log message ' || i,
    CASE WHEN random() < 0.90 THEN NULL ELSE 'Stack trace...' END,
    CURRENT_TIMESTAMP - ((5000000 - i) || ' minutes')::INTERVAL,
    jsonb_build_object(
        'user_id', (i % 10000),
        'request_id', 'req-' || i,
        'duration_ms', (random() * 1000)::INTEGER
    )
FROM generate_series(1, 5000000) AS i;

-- Tasks:
-- 1. Most queries are for ERRORs in the last 7 days
--    Create appropriate partial index

-- 2. Queries often filter by day (daily error reports)
--    Create expression index for date truncation

-- 3. Queries search for specific user_id in JSONB context
--    Create expression index for JSONB extraction

-- 4. Combine: Index for errors by day in last 30 days
--    Use both partial and expression techniques

-- 5. Measure:
--    - Total index size vs table size
--    - Query performance improvement
--    - Which indexes are actually used (pg_stat_user_indexes)
```

### Exercise 3: Case-Insensitive Uniqueness

```sql
-- Create users table (emails should be unique case-insensitively)
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50),
    email VARCHAR(100),
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tasks:
-- 1. Create unique expression index to prevent:
--    'user@example.com' and 'User@Example.com' from both existing

-- 2. Test that duplicate case variations are rejected:
--    INSERT INTO users (email) VALUES ('test@example.com');
--    INSERT INTO users (email) VALUES ('Test@Example.com');  -- Should fail

-- 3. Create index for case-insensitive search
--    SELECT * FROM users WHERE LOWER(email) = LOWER(?);

-- 4. Create expression index for full name search (concatenation)
--    SELECT * FROM users WHERE LOWER(first_name || ' ' || last_name) = ?;

-- 5. Test and compare performance:
--    - Case-sensitive search (no index)
--    - Case-insensitive search (with expression index)
--    - Full name search (with expression index)
```

## Summary

Partial and expression indexes are powerful optimization techniques:

**Partial Indexes:**
- Index only subset of rows matching WHERE clause
- Benefits: Smaller size, faster updates, better cache efficiency
- Use for: Active records, non-NULL values, specific statuses, recent data
- Query WHERE must be compatible with index WHERE

**Expression Indexes:**
- Index result of function/expression, not column directly
- Benefits: Pre-computed values, optimizes repeated calculations
- Common uses: LOWER(), date_trunc(), JSONB extraction, type casts
- Query expression must EXACTLY match indexed expression
- Only IMMUTABLE functions allowed

**Combining Both:**
- Maximum optimization: smallest, most targeted index
- Example: `CREATE INDEX ON users (LOWER(email)) WHERE is_active = true;`
- Indexes only active users' lowercased emails

**Key Principles:**
1. Create indexes for actual query patterns
2. Use partial indexes when queries filter on specific subset
3. Use expression indexes when queries apply same function repeatedly
4. Test with EXPLAIN ANALYZE
5. Monitor with pg_stat_user_indexes
6. Keep expressions simple and IMMUTABLE
7. Document why index exists

These techniques can reduce index size by 50-90% while maintaining or improving query performance.

Next: [Multi-Column and Covering Indexes](04-multicolumn-covering.md) - Learn how to optimize queries with multiple columns and avoid table lookups.
