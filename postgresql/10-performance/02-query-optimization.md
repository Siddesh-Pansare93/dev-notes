# Query Optimization

## Theory

Query optimization is the process of rewriting queries and structuring data access patterns to minimize execution time and resource usage. PostgreSQL's query planner is sophisticated, but understanding how to write efficient queries and avoid common anti-patterns is crucial for application performance.

### Key Concepts

**Query Planner**: PostgreSQL's cost-based optimizer that evaluates multiple execution strategies and chooses the one with the lowest estimated cost.

**Selectivity**: The fraction of rows that match a WHERE clause condition. High selectivity (few matching rows) favors index scans; low selectivity favors sequential scans.

**Index Selectivity**: How well an index narrows down results. Unique indexes have perfect selectivity; non-unique indexes vary.

**Query Rewriting**: Transforming a query into a logically equivalent but more efficient form.

**Predicate Pushdown**: Moving filter conditions as early as possible in the execution plan to reduce processed data.

**Join Order**: The sequence in which tables are joined affects performance. PostgreSQL tries to join smaller result sets first.

**Materialization**: Some operations (like CTEs in PostgreSQL < 12, or WITH MATERIALIZED) force result computation and storage before use.

**Statistics**: PostgreSQL maintains statistics about data distribution, which the planner uses for cost estimation. Outdated statistics lead to poor plans.

### Why Query Optimization Matters

- **Response Time**: Slow queries impact user experience
- **Resource Usage**: Inefficient queries consume CPU, memory, and I/O
- **Scalability**: Optimized queries handle growing data volumes better
- **Cost**: Cloud environments charge for resources consumed
- **Concurrency**: Faster queries release locks sooner, improving throughput

## Syntax

### Basic Optimization Patterns

```sql
-- Avoid SELECT * (retrieves unnecessary columns)
SELECT * FROM table;                    -- Avoid
SELECT col1, col2 FROM table;          -- Prefer

-- Avoid unnecessary DISTINCT
SELECT DISTINCT col FROM table;         -- Only when needed

-- Use EXISTS instead of IN for correlated subqueries
SELECT * FROM t1 WHERE id IN (SELECT fk FROM t2 WHERE t2.x = t1.x);     -- Slower
SELECT * FROM t1 WHERE EXISTS (SELECT 1 FROM t2 WHERE t2.fk = t1.id AND t2.x = t1.x); -- Faster

-- Avoid functions on indexed columns in WHERE
SELECT * FROM table WHERE UPPER(name) = 'JOHN';           -- Can't use index
SELECT * FROM table WHERE name = 'JOHN' OR name = 'john'; -- Can use index
-- Or create functional index:
CREATE INDEX idx_name_upper ON table(UPPER(name));

-- Use proper data types to avoid implicit casts
SELECT * FROM table WHERE id = '123';   -- May cause index scan to be avoided
SELECT * FROM table WHERE id = 123;     -- Proper type

-- Pagination: keyset vs OFFSET
SELECT * FROM table ORDER BY id LIMIT 10 OFFSET 10000;    -- Slow for large offsets
SELECT * FROM table WHERE id > 10000 ORDER BY id LIMIT 10; -- Faster keyset pagination
```

### CTE Optimization

```sql
-- PostgreSQL 12+: CTEs are inlined by default
WITH cte AS (
    SELECT * FROM table WHERE condition
)
SELECT * FROM cte WHERE another_condition;

-- Force materialization when needed
WITH cte AS MATERIALIZED (
    SELECT expensive_computation() FROM table
)
SELECT * FROM cte
UNION ALL
SELECT * FROM cte; -- Reuses materialized result

-- Prevent inlining when it hurts performance
WITH cte AS NOT MATERIALIZED (
    SELECT * FROM table WHERE condition
)
SELECT * FROM cte;
```

### Planner Settings (for testing)

```sql
-- Temporarily disable scan types to test alternatives
SET enable_seqscan = off;
SET enable_indexscan = off;
SET enable_bitmapscan = off;
SET enable_hashjoin = off;
SET enable_mergejoin = off;
SET enable_nestloop = off;

-- Reset to defaults
RESET enable_seqscan;
-- Or reset all
RESET ALL;
```

## Examples

### Example 1: Avoiding SELECT *

```sql
-- Create test table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50),
    email VARCHAR(100),
    password_hash VARCHAR(255),
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    bio TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    last_login TIMESTAMP,
    settings JSONB
);

INSERT INTO users (username, email, password_hash, first_name, last_name, bio)
SELECT
    'user' || i,
    'user' || i || '@example.com',
    md5(random()::text),
    'First' || i,
    'Last' || i,
    repeat('Biography text ', 50)
FROM generate_series(1, 100000) i;

-- Bad: SELECT * retrieves all columns including large TEXT and JSONB
EXPLAIN ANALYZE
SELECT * FROM users WHERE username = 'user12345';

-- Good: Select only needed columns
EXPLAIN ANALYZE
SELECT id, username, email, first_name, last_name
FROM users WHERE username = 'user12345';

-- Compare "width" in EXPLAIN output
-- SELECT * might show width=500+
-- Selective SELECT might show width=150
```

### Example 2: Unnecessary DISTINCT

```sql
-- Create orders table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    order_date DATE,
    total_amount DECIMAL(10,2)
);

INSERT INTO orders (customer_id, order_date, total_amount)
SELECT
    (random() * 10000)::INTEGER + 1,
    '2023-01-01'::date + (random() * 365)::INTEGER,
    (random() * 1000)::DECIMAL(10,2)
FROM generate_series(1, 500000) i;

CREATE INDEX idx_orders_customer ON orders(customer_id);

-- Bad: DISTINCT when not needed (customer_id is already unique per customer)
EXPLAIN ANALYZE
SELECT DISTINCT customer_id
FROM orders
WHERE order_date >= '2023-01-01';
-- Adds HashAggregate or Sort node

-- Good: Use GROUP BY when aggregating
EXPLAIN ANALYZE
SELECT customer_id, COUNT(*), SUM(total_amount)
FROM orders
WHERE order_date >= '2023-01-01'
GROUP BY customer_id;

-- Good: Remove DISTINCT if uniqueness is guaranteed
CREATE TABLE customer_preferences (
    customer_id INTEGER PRIMARY KEY,
    preference VARCHAR(50)
);

-- DISTINCT is unnecessary here
SELECT customer_id FROM customer_preferences WHERE preference = 'email';
```

### Example 3: EXISTS vs IN vs JOIN

```sql
-- Create tables
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    country VARCHAR(50)
);

CREATE TABLE orders_exist_test (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    amount DECIMAL(10,2)
);

INSERT INTO customers (name, country)
SELECT 'Customer ' || i,
       CASE (i % 5)
           WHEN 0 THEN 'USA'
           WHEN 1 THEN 'Canada'
           WHEN 2 THEN 'UK'
           ELSE 'Germany'
       END
FROM generate_series(1, 50000) i;

INSERT INTO orders_exist_test (customer_id, amount)
SELECT
    (random() * 50000)::INTEGER + 1,
    (random() * 1000)::DECIMAL(10,2)
FROM generate_series(1, 200000) i;

CREATE INDEX idx_orders_customer_exists ON orders_exist_test(customer_id);

-- Method 1: IN with subquery (can be slow for large sets)
EXPLAIN ANALYZE
SELECT * FROM customers
WHERE id IN (SELECT customer_id FROM orders_exist_test WHERE amount > 500);

-- Method 2: EXISTS (often faster, stops at first match)
EXPLAIN ANALYZE
SELECT * FROM customers c
WHERE EXISTS (
    SELECT 1 FROM orders_exist_test o
    WHERE o.customer_id = c.id AND o.amount > 500
);

-- Method 3: JOIN with DISTINCT (if you need order data)
EXPLAIN ANALYZE
SELECT DISTINCT c.*
FROM customers c
JOIN orders_exist_test o ON c.id = o.customer_id
WHERE o.amount > 500;

-- Method 4: Semi-join (PostgreSQL can optimize IN to this)
EXPLAIN ANALYZE
SELECT * FROM customers
WHERE id = ANY(SELECT customer_id FROM orders_exist_test WHERE amount > 500);
```

### Example 4: Function Calls in WHERE Clause

```sql
-- Create table with mixed case data
CREATE TABLE persons (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email VARCHAR(100),
    birth_date DATE
);

INSERT INTO persons (first_name, last_name, email, birth_date)
SELECT
    CASE (random() * 3)::INTEGER
        WHEN 0 THEN 'John'
        WHEN 1 THEN 'JOHN'
        ELSE 'john'
    END,
    'Doe' || i,
    'user' || i || '@example.com',
    '1970-01-01'::date + (random() * 18250)::INTEGER
FROM generate_series(1, 100000) i;

CREATE INDEX idx_persons_firstname ON persons(first_name);

-- Bad: Function prevents index use
EXPLAIN ANALYZE
SELECT * FROM persons WHERE UPPER(first_name) = 'JOHN';
-- Shows Seq Scan with Filter

-- Solution 1: Use OR for known cases
EXPLAIN ANALYZE
SELECT * FROM persons
WHERE first_name IN ('John', 'JOHN', 'john');
-- Can use index

-- Solution 2: Create functional index
CREATE INDEX idx_persons_firstname_upper ON persons(UPPER(first_name));
EXPLAIN ANALYZE
SELECT * FROM persons WHERE UPPER(first_name) = 'JOHN';
-- Now uses Index Scan on idx_persons_firstname_upper

-- Bad: Date extraction prevents index use
EXPLAIN ANALYZE
SELECT * FROM persons WHERE EXTRACT(YEAR FROM birth_date) = 1990;

-- Good: Use range query
EXPLAIN ANALYZE
SELECT * FROM persons
WHERE birth_date >= '1990-01-01' AND birth_date < '1991-01-01';
-- Can use index on birth_date
CREATE INDEX idx_persons_birthdate ON persons(birth_date);
```

### Example 5: Implicit Type Conversions

```sql
-- Create table with integer ID
CREATE TABLE products_type (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100),
    sku VARCHAR(50)
);

INSERT INTO products_type (id, name, sku)
SELECT i, 'Product ' || i, 'SKU-' || i
FROM generate_series(1, 100000) i;

-- Bad: String comparison on integer column
EXPLAIN ANALYZE
SELECT * FROM products_type WHERE id = '12345';
-- May prevent index use or require type conversion

-- Good: Use correct type
EXPLAIN ANALYZE
SELECT * FROM products_type WHERE id = 12345;
-- Uses index efficiently

-- Similarly for other types
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    event_data JSONB,
    created_at TIMESTAMP
);

-- Bad: Comparing timestamp to date (implicit cast)
SELECT * FROM events WHERE created_at = CURRENT_DATE;

-- Good: Explicit range
SELECT * FROM events
WHERE created_at >= CURRENT_DATE
  AND created_at < CURRENT_DATE + INTERVAL '1 day';
```

### Example 6: NOT IN with NULLs

```sql
-- Create test tables
CREATE TABLE all_products (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100)
);

CREATE TABLE sold_products (
    product_id INTEGER
);

INSERT INTO all_products (id, name)
SELECT i, 'Product ' || i FROM generate_series(1, 1000) i;

INSERT INTO sold_products (product_id)
SELECT (random() * 1000)::INTEGER FROM generate_series(1, 500);

-- Add a NULL value
INSERT INTO sold_products (product_id) VALUES (NULL);

-- Bad: NOT IN returns empty set if subquery contains NULL
EXPLAIN ANALYZE
SELECT * FROM all_products
WHERE id NOT IN (SELECT product_id FROM sold_products);
-- Returns 0 rows due to NULL!

-- Good: Use NOT EXISTS
EXPLAIN ANALYZE
SELECT * FROM all_products ap
WHERE NOT EXISTS (
    SELECT 1 FROM sold_products sp
    WHERE sp.product_id = ap.id
);

-- Or: Explicitly exclude NULLs
EXPLAIN ANALYZE
SELECT * FROM all_products
WHERE id NOT IN (SELECT product_id FROM sold_products WHERE product_id IS NOT NULL);
```

### Example 7: CTE Optimization (PostgreSQL 12+)

```sql
-- Create sales data
CREATE TABLE sales (
    id SERIAL PRIMARY KEY,
    product_id INTEGER,
    sale_date DATE,
    quantity INTEGER,
    price DECIMAL(10,2)
);

INSERT INTO sales (product_id, sale_date, quantity, price)
SELECT
    (random() * 1000)::INTEGER + 1,
    '2023-01-01'::date + (random() * 365)::INTEGER,
    (random() * 10)::INTEGER + 1,
    (random() * 100)::DECIMAL(10,2)
FROM generate_series(1, 500000) i;

CREATE INDEX idx_sales_product ON sales(product_id);
CREATE INDEX idx_sales_date ON sales(sale_date);

-- Default: CTE is inlined (optimized)
EXPLAIN ANALYZE
WITH recent_sales AS (
    SELECT * FROM sales WHERE sale_date >= '2023-06-01'
)
SELECT product_id, SUM(quantity * price)
FROM recent_sales
WHERE quantity > 5
GROUP BY product_id;

-- Force materialization for expensive operations used multiple times
EXPLAIN ANALYZE
WITH expensive_calc AS MATERIALIZED (
    SELECT
        product_id,
        AVG(price) as avg_price,
        COUNT(*) as sale_count
    FROM sales
    GROUP BY product_id
)
SELECT * FROM expensive_calc WHERE avg_price > 50
UNION ALL
SELECT * FROM expensive_calc WHERE sale_count > 100;
-- Materialized CTE is computed once and reused

-- Prevent inlining when it creates bad plans
WITH raw_data AS NOT MATERIALIZED (
    SELECT * FROM sales WHERE sale_date >= CURRENT_DATE - INTERVAL '7 days'
)
SELECT * FROM raw_data WHERE quantity > 3;
```

### Example 8: Pagination Strategies

```sql
-- Create large dataset
CREATE TABLE articles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200),
    author VARCHAR(100),
    published_at TIMESTAMP,
    view_count INTEGER
);

INSERT INTO articles (title, author, published_at, view_count)
SELECT
    'Article ' || i,
    'Author ' || ((i % 100) + 1),
    '2020-01-01'::timestamp + (i || ' seconds')::INTERVAL,
    (random() * 10000)::INTEGER
FROM generate_series(1, 1000000) i;

CREATE INDEX idx_articles_published ON articles(published_at);

-- Bad: OFFSET for large values (scans and discards rows)
EXPLAIN ANALYZE
SELECT id, title, published_at
FROM articles
ORDER BY published_at DESC
LIMIT 20 OFFSET 100000;
-- Still needs to process 100,000+ rows

-- Good: Keyset pagination (cursor-based)
-- First page
EXPLAIN ANALYZE
SELECT id, title, published_at
FROM articles
ORDER BY published_at DESC, id DESC
LIMIT 20;

-- Next page (using last seen published_at and id)
EXPLAIN ANALYZE
SELECT id, title, published_at
FROM articles
WHERE (published_at, id) < ('2023-05-15 10:30:00', 750000)
ORDER BY published_at DESC, id DESC
LIMIT 20;
-- Much faster, scans only needed rows

-- For forward/backward pagination
CREATE INDEX idx_articles_published_id ON articles(published_at DESC, id DESC);
```

### Example 9: Batch Processing

```sql
-- Instead of updating rows one by one
-- Bad: N individual queries
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN SELECT id FROM articles WHERE view_count < 100 LOOP
        UPDATE articles SET view_count = view_count + 1 WHERE id = rec.id;
    END LOOP;
END $$;

-- Good: Batch update
UPDATE articles
SET view_count = view_count + 1
WHERE view_count < 100;

-- For complex logic requiring iteration
-- Good: Use batch operations with temporary tables
CREATE TEMP TABLE ids_to_update AS
SELECT id FROM articles WHERE view_count < 100;

UPDATE articles a
SET view_count = view_count + 1
FROM ids_to_update t
WHERE a.id = t.id;

-- Or use UPDATE with subquery
UPDATE articles
SET view_count = subq.new_count
FROM (
    SELECT id, view_count * 2 as new_count
    FROM articles
    WHERE view_count < 100
) subq
WHERE articles.id = subq.id;
```

### Example 10: Using pg_stats for Query Planning

```sql
-- View statistics for a table
SELECT
    attname,
    n_distinct,
    most_common_vals,
    most_common_freqs,
    correlation
FROM pg_stats
WHERE tablename = 'articles' AND schemaname = 'public';

-- Check if statistics are outdated
SELECT
    schemaname,
    tablename,
    last_analyze,
    last_autoanalyze,
    n_live_tup,
    n_dead_tup
FROM pg_stat_user_tables
WHERE tablename = 'articles';

-- Update statistics manually
ANALYZE articles;

-- Set statistics target for important columns
ALTER TABLE articles ALTER COLUMN author SET STATISTICS 1000;
ANALYZE articles;
-- Collects more detailed statistics (default is 100)
```

### Example 11: Join Order Optimization

```sql
-- Create three tables with different sizes
CREATE TABLE small_lookup (
    id SERIAL PRIMARY KEY,
    value VARCHAR(50)
);

CREATE TABLE medium_table (
    id SERIAL PRIMARY KEY,
    lookup_id INTEGER,
    data VARCHAR(100)
);

CREATE TABLE large_table (
    id SERIAL PRIMARY KEY,
    medium_id INTEGER,
    info TEXT
);

INSERT INTO small_lookup (value)
SELECT 'Lookup ' || i FROM generate_series(1, 100) i;

INSERT INTO medium_table (lookup_id, data)
SELECT
    (random() * 100)::INTEGER + 1,
    'Data ' || i
FROM generate_series(1, 10000) i;

INSERT INTO large_table (medium_id, info)
SELECT
    (random() * 10000)::INTEGER + 1,
    'Info ' || i
FROM generate_series(1, 1000000) i;

CREATE INDEX idx_medium_lookup ON medium_table(lookup_id);
CREATE INDEX idx_large_medium ON large_table(medium_id);

-- PostgreSQL usually optimizes join order automatically
EXPLAIN ANALYZE
SELECT l.value, m.data, COUNT(*)
FROM small_lookup l
JOIN medium_table m ON l.id = m.lookup_id
JOIN large_table lt ON m.id = lt.medium_id
GROUP BY l.value, m.data;

-- Check the join order in EXPLAIN output
-- Should join small_lookup -> medium_table -> large_table
-- Reducing result set at each step

-- Force different join order (usually not needed)
SET join_collapse_limit = 1;
EXPLAIN ANALYZE
SELECT l.value, m.data, COUNT(*)
FROM small_lookup l
JOIN medium_table m ON l.id = m.lookup_id
JOIN large_table lt ON m.id = lt.medium_id
GROUP BY l.value, m.data;
RESET join_collapse_limit;
```

### Example 12: Planner Settings for Testing

```sql
-- Test query with different scan methods
-- Original plan
EXPLAIN ANALYZE
SELECT * FROM articles WHERE view_count > 5000;

-- Force bitmap scan
SET enable_seqscan = off;
EXPLAIN ANALYZE
SELECT * FROM articles WHERE view_count > 5000;

-- Force index scan
SET enable_bitmapscan = off;
EXPLAIN ANALYZE
SELECT * FROM articles WHERE view_count > 5000;

-- Reset
RESET enable_seqscan;
RESET enable_bitmapscan;

-- Test join strategies
CREATE INDEX idx_articles_author ON articles(author);

-- Default
EXPLAIN ANALYZE
SELECT a1.title, a2.title
FROM articles a1
JOIN articles a2 ON a1.author = a2.author
WHERE a1.id < a2.id
LIMIT 100;

-- Force merge join
SET enable_hashjoin = off;
SET enable_nestloop = off;
EXPLAIN ANALYZE
SELECT a1.title, a2.title
FROM articles a1
JOIN articles a2 ON a1.author = a2.author
WHERE a1.id < a2.id
LIMIT 100;

RESET ALL;
```

## Common Mistakes

### 1. Using SELECT * Everywhere
```sql
-- Wrong: Retrieves unnecessary data
SELECT * FROM large_table WHERE id = 123;

-- Right: Select only needed columns
SELECT id, name, email FROM large_table WHERE id = 123;
```

### 2. Overusing DISTINCT
```sql
-- Wrong: DISTINCT when not needed
SELECT DISTINCT user_id FROM orders WHERE status = 'completed';

-- Right: Only use when duplicates possible and unwanted
SELECT user_id FROM orders WHERE status = 'completed';
```

### 3. Functions on Indexed Columns
```sql
-- Wrong: Can't use index
SELECT * FROM users WHERE LOWER(email) = 'test@example.com';

-- Right: Use functional index or avoid function
CREATE INDEX idx_email_lower ON users(LOWER(email));
-- Or store normalized data
```

### 4. NOT IN with Nullable Columns
```sql
-- Wrong: Returns no rows if subquery contains NULL
SELECT * FROM products WHERE id NOT IN (SELECT product_id FROM deleted);

-- Right: Use NOT EXISTS
SELECT * FROM products p
WHERE NOT EXISTS (SELECT 1 FROM deleted d WHERE d.product_id = p.id);
```

### 5. Large OFFSET Values
```sql
-- Wrong: Inefficient for large offsets
SELECT * FROM data ORDER BY id LIMIT 10 OFFSET 100000;

-- Right: Use keyset pagination
SELECT * FROM data WHERE id > 100000 ORDER BY id LIMIT 10;
```

### 6. Outdated Statistics
```sql
-- Wrong: Never running ANALYZE
-- Leads to poor query plans

-- Right: Regular ANALYZE, especially after bulk changes
ANALYZE table_name;
```

### 7. Unnecessary Subqueries
```sql
-- Wrong: Correlated subquery in SELECT
SELECT
    p.*,
    (SELECT COUNT(*) FROM orders WHERE product_id = p.id) as order_count
FROM products p;

-- Right: Use JOIN
SELECT
    p.*,
    COUNT(o.id) as order_count
FROM products p
LEFT JOIN orders o ON p.id = o.product_id
GROUP BY p.id;
```

## Best Practices

### 1. Always Select Only Needed Columns
Avoid SELECT * except in development. Specify columns explicitly to reduce data transfer and memory usage.

### 2. Create Appropriate Indexes
Index columns used in WHERE, JOIN, and ORDER BY clauses, but avoid over-indexing (slows writes).

### 3. Keep Statistics Updated
```sql
-- Auto-vacuum usually handles this, but after bulk operations:
ANALYZE table_name;
```

### 4. Use EXISTS for Existence Checks
EXISTS is often faster than IN for correlated subqueries because it stops at the first match.

### 5. Avoid Functions on Indexed Columns in WHERE
Either rewrite the query or create a functional index.

### 6. Use Proper Data Types
Avoid implicit type conversions by using the correct data types in queries.

### 7. Implement Keyset Pagination
For large datasets, cursor-based pagination is much more efficient than OFFSET.

### 8. Batch Operations When Possible
Update or delete multiple rows in single queries rather than looping.

### 9. Use EXPLAIN ANALYZE
Always test query performance with EXPLAIN ANALYZE before deploying to production.

### 10. Monitor Query Performance
```sql
-- Enable slow query logging
ALTER SYSTEM SET log_min_duration_statement = 1000; -- 1 second
SELECT pg_reload_conf();
```

### 11. Consider Partial Indexes
```sql
-- Index only relevant rows
CREATE INDEX idx_active_users ON users(email) WHERE active = true;
```

### 12. Use Covering Indexes When Appropriate
```sql
-- Include columns used in SELECT
CREATE INDEX idx_users_email_name ON users(email) INCLUDE (first_name, last_name);
```

## Practice Exercises

### Exercise 1: Optimizing a Slow Query
```sql
-- Setup
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    transaction_type VARCHAR(50),
    amount DECIMAL(10,2),
    created_at TIMESTAMP,
    status VARCHAR(20),
    description TEXT
);

INSERT INTO transactions (user_id, transaction_type, amount, created_at, status, description)
SELECT
    (random() * 50000)::INTEGER + 1,
    CASE (random() * 3)::INTEGER
        WHEN 0 THEN 'deposit'
        WHEN 1 THEN 'withdrawal'
        ELSE 'transfer'
    END,
    (random() * 10000)::DECIMAL(10,2),
    '2020-01-01'::timestamp + (random() * 1460 || ' days')::INTERVAL,
    CASE (random() * 2)::INTEGER
        WHEN 0 THEN 'completed'
        ELSE 'pending'
    END,
    'Transaction description ' || generate_series
FROM generate_series(1, 1000000);

-- Slow query
SELECT *
FROM transactions
WHERE EXTRACT(YEAR FROM created_at) = 2023
  AND UPPER(status) = 'COMPLETED'
  AND transaction_type IN ('deposit', 'withdrawal')
ORDER BY amount DESC
LIMIT 100;

-- Tasks:
-- 1. Run EXPLAIN ANALYZE on the query
-- 2. Identify problems (functions on columns, SELECT *, etc.)
-- 3. Rewrite the query to be more efficient
-- 4. Create appropriate indexes
-- 5. Compare performance before and after
-- 6. Measure improvement percentage
```

### Exercise 2: Pagination Performance
```sql
-- Setup
CREATE TABLE blog_entries (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200),
    content TEXT,
    author_id INTEGER,
    published_at TIMESTAMP,
    view_count INTEGER,
    featured BOOLEAN
);

INSERT INTO blog_entries (title, content, author_id, published_at, view_count, featured)
SELECT
    'Blog Post ' || i,
    repeat('Content for blog post ', 100),
    (random() * 1000)::INTEGER + 1,
    '2020-01-01'::timestamp + (i || ' hours')::INTERVAL,
    (random() * 10000)::INTEGER,
    random() > 0.9
FROM generate_series(1, 500000) i;

-- Tasks:
-- 1. Implement OFFSET-based pagination for page 1000 (rows 20000-20019)
-- 2. Measure performance with EXPLAIN ANALYZE
-- 3. Implement keyset/cursor-based pagination for the same page
-- 4. Compare performance
-- 5. Write a query that handles both forward and backward pagination
-- 6. Create appropriate indexes to optimize cursor pagination
```

### Exercise 3: Subquery vs JOIN Optimization
```sql
-- Setup
CREATE TABLE customers_opt (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    country VARCHAR(50),
    registration_date DATE
);

CREATE TABLE orders_opt (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    order_date DATE,
    total_amount DECIMAL(10,2),
    status VARCHAR(20)
);

INSERT INTO customers_opt (name, email, country, registration_date)
SELECT
    'Customer ' || i,
    'customer' || i || '@example.com',
    CASE (i % 5)
        WHEN 0 THEN 'USA'
        WHEN 1 THEN 'Canada'
        WHEN 2 THEN 'UK'
        WHEN 3 THEN 'Germany'
        ELSE 'France'
    END,
    '2020-01-01'::date + (random() * 1460)::INTEGER
FROM generate_series(1, 100000) i;

INSERT INTO orders_opt (customer_id, order_date, total_amount, status)
SELECT
    (random() * 100000)::INTEGER + 1,
    '2020-01-01'::date + (random() * 1460)::INTEGER,
    (random() * 1000)::DECIMAL(10,2),
    CASE (random() * 2)::INTEGER
        WHEN 0 THEN 'completed'
        ELSE 'pending'
    END
FROM generate_series(1, 500000) i;

-- Query: Find customers with high-value orders
-- Version 1: Subquery in SELECT
SELECT
    c.name,
    c.email,
    (SELECT COUNT(*) FROM orders_opt o WHERE o.customer_id = c.id) as order_count,
    (SELECT SUM(total_amount) FROM orders_opt o WHERE o.customer_id = c.id) as total_spent
FROM customers_opt c
WHERE c.country = 'USA';

-- Tasks:
-- 1. Run EXPLAIN ANALYZE on the subquery version
-- 2. Rewrite using JOINs and GROUP BY
-- 3. Compare performance
-- 4. Test with EXISTS vs IN for filtering customers with orders > 1000
-- 5. Create appropriate indexes
-- 6. Document which approach is fastest and why
```

## Summary

Query optimization is essential for PostgreSQL performance. Key principles include:

- Avoid SELECT * and retrieve only necessary columns
- Use appropriate indexes and avoid functions on indexed columns in WHERE clauses
- Prefer EXISTS over IN for correlated subqueries
- Use keyset pagination instead of large OFFSET values
- Keep statistics updated with ANALYZE
- Understand the difference between CTE materialization and inlining
- Batch operations when possible to reduce overhead
- Always measure with EXPLAIN ANALYZE
- Avoid implicit type conversions
- Be careful with NOT IN when NULLs are possible

Related topics:
- [EXPLAIN and EXPLAIN ANALYZE](./01-explain-analyze.md)
- [VACUUM and Autovacuum](./03-vacuum-autovacuum.md)
- [Configuration Tuning](./05-configuration-tuning.md)
