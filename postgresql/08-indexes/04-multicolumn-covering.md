# Multi-Column and Covering Indexes

## Theory

### Multi-Column Indexes

A multi-column index (also called composite index) indexes multiple columns together in a single index structure. The order of columns in the index definition is critical and affects which queries can use the index.

**B-tree Multi-Column Structure:**
```
Index on (col1, col2, col3)
├── col1='A'
│   ├── col2='X', col3=1
│   ├── col2='X', col3=2
│   └── col2='Y', col3=1
├── col1='B'
│   ├── col2='X', col3=5
│   └── col2='Z', col3=3
```

The index is sorted first by col1, then by col2 within each col1 value, then by col3 within each col2 value.

### Leftmost Prefix Rule

PostgreSQL can use a multi-column index for queries that filter on:
- All indexed columns (most efficient)
- A left-side prefix of indexed columns

**Index:** `(col1, col2, col3)`

**Can use index:**
- WHERE col1 = ? AND col2 = ? AND col3 = ?
- WHERE col1 = ? AND col2 = ?
- WHERE col1 = ?
- WHERE col1 = ? ORDER BY col2, col3

**Cannot use index (or uses inefficiently):**
- WHERE col2 = ? (missing leftmost column)
- WHERE col3 = ? (missing leftmost columns)
- WHERE col1 = ? AND col3 = ? (gap in middle - only col1 used)
- ORDER BY col2 (missing leftmost column)

### Column Ordering Considerations

The order of columns in a multi-column index dramatically affects its effectiveness. General guidelines:

1. **Equality before range**: Columns with `=` should come before columns with `>`, `<`, `BETWEEN`
2. **High selectivity first**: More selective columns (fewer duplicates) should come first
3. **Most queried first**: Columns used in more queries should come earlier
4. **Cardinality**: Higher cardinality (more distinct values) typically first

**Example:**
```sql
-- Query: WHERE status = ? AND created_at > ?
-- status: 5 distinct values (low cardinality)
-- created_at: millions of distinct values (high cardinality)

-- GOOD: Equality first
CREATE INDEX idx_good ON orders (status, created_at);

-- BAD: Range first (less efficient)
CREATE INDEX idx_bad ON orders (created_at, status);
```

However, if most queries filter only on `created_at`, the "bad" index might actually be better for your workload. Always test with your actual query patterns.

### Covering Indexes (INCLUDE Clause)

A covering index contains all columns needed to answer a query, eliminating the need to access the table heap. PostgreSQL 11+ supports the INCLUDE clause to add non-indexed columns to an index.

**Syntax:**
```sql
CREATE INDEX idx_name ON table (indexed_cols) INCLUDE (non_indexed_cols);
```

**Benefits:**
- **Index-Only Scans**: Query can be satisfied entirely from index
- **No heap access**: Faster queries, less I/O
- **Smaller index**: INCLUDE columns aren't part of the index tree (just stored in leaf pages)

**INCLUDE vs regular multi-column index:**

```sql
-- Regular multi-column index
CREATE INDEX idx_regular ON users (email, name, phone);
-- All columns participate in index tree structure
-- Larger index, sorted by all three columns

-- Covering index with INCLUDE
CREATE INDEX idx_covering ON users (email) INCLUDE (name, phone);
-- Only email in index tree, name/phone stored in leaf pages
-- Smaller index, better for queries on just email
-- Still enables index-only scans for queries selecting name, phone
```

### Index-Only Scans

An index-only scan retrieves all needed data from the index without accessing the table. Requirements:

1. **All SELECT columns** must be in the index (including INCLUDE columns)
2. **All WHERE columns** must be in the index
3. **Visibility map** must be up-to-date (requires regular VACUUM)

**Visibility Map:**
- PostgreSQL must verify row visibility (MVCC)
- Visibility map tracks which pages contain only visible rows
- VACUUM updates visibility map
- If visibility map is stale, PostgreSQL must check heap (not index-only)

### Unique Indexes with INCLUDE

Unique indexes can use INCLUDE to enforce uniqueness on a subset of columns while still enabling index-only scans:

```sql
-- Unique on email, but include name for covering queries
CREATE UNIQUE INDEX idx_users_email ON users (email) INCLUDE (name);

-- Uniqueness enforced only on email
-- But SELECT email, name WHERE email = ? can be index-only
```

### Multi-Column vs Separate Indexes

**Use multi-column index when:**
- Queries frequently filter on multiple columns together
- Column order matches leftmost prefix rule
- Need to sort by multiple columns

**Use separate indexes when:**
- Queries filter on columns independently
- Different query patterns need different column orders
- PostgreSQL can combine indexes with Bitmap Index Scan

**Index Merge (Bitmap Scan):**
PostgreSQL can combine multiple single-column indexes using BitmapAnd and BitmapOr:

```sql
-- Separate indexes
CREATE INDEX idx_col1 ON table (col1);
CREATE INDEX idx_col2 ON table (col2);

-- Query can use both via Bitmap Index Scan
SELECT * FROM table WHERE col1 = ? AND col2 = ?;
-- BitmapAnd
--   -> Bitmap Index Scan on idx_col1
--   -> Bitmap Index Scan on idx_col2
```

Bitmap scans are less efficient than a proper multi-column index but allow flexibility.

## Syntax

### Creating Multi-Column Indexes

```sql
-- Basic multi-column index
CREATE INDEX idx_name ON table_name (col1, col2, col3);

-- With specific column order
CREATE INDEX idx_name ON table_name (frequently_queried_col, less_frequent_col);

-- Equality before range
CREATE INDEX idx_name ON table_name (status, created_at);

-- High selectivity first
CREATE INDEX idx_name ON table_name (email, last_name);

-- Unique multi-column
CREATE UNIQUE INDEX idx_name ON table_name (col1, col2);
```

### Creating Covering Indexes

```sql
-- Basic covering index
CREATE INDEX idx_name ON table_name (key_col) INCLUDE (value_col1, value_col2);

-- Multi-column key with INCLUDE
CREATE INDEX idx_name ON table_name (col1, col2) INCLUDE (col3, col4, col5);

-- Unique with INCLUDE
CREATE UNIQUE INDEX idx_name ON table_name (unique_col) INCLUDE (other_cols);

-- Covering index on expression
CREATE INDEX idx_name ON table_name (LOWER(email)) INCLUDE (name, created_at);

-- Partial covering index
CREATE INDEX idx_name ON table_name (status) INCLUDE (amount, created_at)
WHERE status IN ('pending', 'processing');
```

### Checking for Index-Only Scans

```sql
-- Use EXPLAIN to see if index-only scan is possible
EXPLAIN (ANALYZE, BUFFERS)
SELECT col1, col2 FROM table WHERE col1 = ?;

-- Look for: "Index Only Scan using idx_name"
-- Check "Heap Fetches: N" (should be 0 or very low)

-- If "Index Scan" instead of "Index Only Scan":
-- 1. Some columns not in index (add to INCLUDE)
-- 2. Visibility map not updated (run VACUUM)
```

## Examples

### Example 1: Multi-Column Index Column Ordering

```sql
-- Create orders table
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    status VARCHAR(20),
    total_amount NUMERIC(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert test data
INSERT INTO orders (customer_id, status, total_amount, created_at)
SELECT
    (random() * 10000)::INTEGER,
    (ARRAY['pending', 'processing', 'shipped', 'delivered', 'cancelled'])[1 + (i % 5)],
    (random() * 1000)::NUMERIC(10, 2),
    CURRENT_TIMESTAMP - (random() * 365 || ' days')::INTERVAL
FROM generate_series(1, 500000) AS i;

ANALYZE orders;

-- Common query pattern: status + date range
-- status: 5 distinct values (low cardinality, equality)
-- created_at: 500K distinct values (high cardinality, range)

-- Strategy 1: Equality first (status before created_at)
CREATE INDEX idx_orders_status_date ON orders (status, created_at);

EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM orders
WHERE status = 'pending' AND created_at > CURRENT_DATE - INTERVAL '7 days';
-- Index Scan using idx_orders_status_date
-- Efficient: Finds all 'pending', then filters by date within that subset

-- Strategy 2: High cardinality first (created_at before status) - for comparison
CREATE INDEX idx_orders_date_status ON orders (created_at, status);

EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM orders
WHERE status = 'pending' AND created_at > CURRENT_DATE - INTERVAL '7 days';
-- Might use idx_orders_date_status, but less efficiently
-- Scans all recent dates, then filters by status

-- Test leftmost prefix rule
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM orders WHERE status = 'pending';
-- Uses idx_orders_status_date (leftmost column)

EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM orders WHERE created_at > CURRENT_DATE - INTERVAL '7 days';
-- Uses idx_orders_date_status (leftmost column)
-- Or idx_orders_status_date if planner determines it's more efficient

-- Query with only second column
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM orders WHERE created_at > CURRENT_DATE - INTERVAL '7 days';
-- Cannot efficiently use idx_orders_status_date (created_at is not leftmost)

-- Compare index sizes
SELECT
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE tablename = 'orders'
ORDER BY indexname;
```

### Example 2: Covering Index with INCLUDE

```sql
-- Create users table
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(100) UNIQUE,
    username VARCHAR(50),
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert test data
INSERT INTO users (email, username, first_name, last_name, phone, address)
SELECT
    'user' || i || '@example.com',
    'user' || i,
    'First' || i,
    'Last' || i,
    '+1-555-' || LPAD(i::TEXT, 7, '0'),
    i || ' Main St, City, State ' || LPAD((i % 100000)::TEXT, 5, '0')
FROM generate_series(1, 200000) AS i;

-- Ensure visibility map is updated
VACUUM ANALYZE users;

-- Common query: Look up user by email, return name and phone
-- WITHOUT covering index
CREATE INDEX idx_users_email_basic ON users (email);

EXPLAIN (ANALYZE, BUFFERS)
SELECT email, first_name, last_name, phone
FROM users
WHERE email = 'user100000@example.com';
-- Index Scan using idx_users_email_basic
-- Heap Fetches: 1 (must access table to get first_name, last_name, phone)

-- WITH covering index
CREATE INDEX idx_users_email_covering ON users (email)
INCLUDE (first_name, last_name, phone);

EXPLAIN (ANALYZE, BUFFERS)
SELECT email, first_name, last_name, phone
FROM users
WHERE email = 'user100000@example.com';
-- Index Only Scan using idx_users_email_covering
-- Heap Fetches: 0 (all data in index!)

-- Query selecting columns NOT in INCLUDE
EXPLAIN (ANALYZE, BUFFERS)
SELECT email, first_name, address
FROM users
WHERE email = 'user100000@example.com';
-- Index Scan using idx_users_email_covering (needs heap for address)
-- Heap Fetches: 1

-- Compare index sizes
SELECT
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE tablename = 'users' AND indexname LIKE '%email%'
ORDER BY pg_relation_size(indexrelid) DESC;
-- idx_users_email_covering is larger (stores extra columns)
-- But enables index-only scans (trades space for speed)
```

### Example 3: Multi-Column Index vs Separate Indexes

```sql
-- Create products table
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    category VARCHAR(50),
    brand VARCHAR(50),
    price NUMERIC(10, 2),
    in_stock BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert test data
INSERT INTO products (category, brand, price, in_stock, created_at)
SELECT
    (ARRAY['Electronics', 'Clothing', 'Food', 'Books', 'Toys'])[1 + (i % 5)],
    'Brand' || (i % 50),
    (random() * 1000)::NUMERIC(10, 2),
    random() > 0.2,  -- 80% in stock
    CURRENT_TIMESTAMP - (random() * 730 || ' days')::INTERVAL
FROM generate_series(1, 200000) AS i;

ANALYZE products;

-- Scenario 1: Separate indexes
CREATE INDEX idx_products_category ON products (category);
CREATE INDEX idx_products_brand ON products (brand);
CREATE INDEX idx_products_stock ON products (in_stock);

-- Query using multiple conditions
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM products
WHERE category = 'Electronics' AND brand = 'Brand10' AND in_stock = true;
-- BitmapAnd
--   -> Bitmap Index Scan on idx_products_category
--   -> Bitmap Index Scan on idx_products_brand
--   -> Bitmap Index Scan on idx_products_stock
-- PostgreSQL combines all three indexes

-- Scenario 2: Multi-column index
CREATE INDEX idx_products_cat_brand_stock ON products (category, brand, in_stock);

EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM products
WHERE category = 'Electronics' AND brand = 'Brand10' AND in_stock = true;
-- Index Scan using idx_products_cat_brand_stock (more efficient)

-- Test leftmost prefix
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM products WHERE category = 'Electronics';
-- Uses idx_products_cat_brand_stock (leftmost column)

EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM products WHERE category = 'Electronics' AND brand = 'Brand10';
-- Uses idx_products_cat_brand_stock (leftmost prefix)

-- Query on non-leftmost column only
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM products WHERE brand = 'Brand10';
-- Uses idx_products_brand (separate index)
-- Cannot use idx_products_cat_brand_stock efficiently

-- Conclusion: Multi-column index is better for full query
-- Separate indexes provide flexibility for partial queries
-- Space vs flexibility trade-off
```

### Example 4: Unique Index with INCLUDE

```sql
-- Create table where email is unique but we often query name too
CREATE TABLE members (
    member_id SERIAL PRIMARY KEY,
    email VARCHAR(100),
    name VARCHAR(100),
    membership_level VARCHAR(20),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert test data
INSERT INTO members (email, name, membership_level)
SELECT
    'member' || i || '@example.com',
    'Member Name ' || i,
    (ARRAY['bronze', 'silver', 'gold', 'platinum'])[1 + (i % 4)]
FROM generate_series(1, 100000) AS i;

VACUUM ANALYZE members;

-- Unique index on email, INCLUDE name for covering queries
CREATE UNIQUE INDEX idx_members_email_name ON members (email) INCLUDE (name, membership_level);

-- Test uniqueness (only enforced on email, not INCLUDE columns)
INSERT INTO members (email, name) VALUES ('test@example.com', 'Test User');
-- OK

INSERT INTO members (email, name) VALUES ('test@example.com', 'Different Name');
-- ERROR: duplicate key value violates unique constraint
-- Uniqueness applies only to email (not name)

-- Query with index-only scan
EXPLAIN (ANALYZE, BUFFERS)
SELECT email, name, membership_level
FROM members
WHERE email = 'member50000@example.com';
-- Index Only Scan using idx_members_email_name
-- Heap Fetches: 0

-- Query selecting column not in INCLUDE
EXPLAIN (ANALYZE, BUFFERS)
SELECT email, name, joined_at
FROM members
WHERE email = 'member50000@example.com';
-- Index Scan using idx_members_email_name (needs heap for joined_at)
-- Heap Fetches: 1
```

### Example 5: Index-Only Scan Requirements

```sql
-- Create table to demonstrate index-only scan requirements
CREATE TABLE analytics (
    event_id BIGSERIAL PRIMARY KEY,
    user_id INTEGER,
    event_type VARCHAR(50),
    value NUMERIC(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert test data
INSERT INTO analytics (user_id, event_type, value)
SELECT
    (random() * 100000)::INTEGER,
    (ARRAY['click', 'view', 'purchase', 'signup'])[1 + (i % 4)],
    (random() * 100)::NUMERIC(10, 2)
FROM generate_series(1, 1000000) AS i;

-- Create covering index
CREATE INDEX idx_analytics_user_type ON analytics (user_id, event_type)
INCLUDE (value);

-- WITHOUT VACUUM - visibility map is not updated
EXPLAIN (ANALYZE, BUFFERS)
SELECT user_id, event_type, value
FROM analytics
WHERE user_id = 50000 AND event_type = 'purchase';
-- Index Scan (not Index Only Scan)
-- Heap Fetches: >0 (must check visibility)

-- Run VACUUM to update visibility map
VACUUM analytics;

-- WITH VACUUM - visibility map is updated
EXPLAIN (ANALYZE, BUFFERS)
SELECT user_id, event_type, value
FROM analytics
WHERE user_id = 50000 AND event_type = 'purchase';
-- Index Only Scan using idx_analytics_user_type
-- Heap Fetches: 0 or very low

-- Modify some rows (creates dead tuples)
UPDATE analytics SET value = value + 1 WHERE event_id % 10 = 0;

-- Visibility map is now stale for updated pages
EXPLAIN (ANALYZE, BUFFERS)
SELECT user_id, event_type, value
FROM analytics
WHERE user_id = 50000 AND event_type = 'purchase';
-- Index Only Scan using idx_analytics_user_type
-- Heap Fetches: >0 (some pages need visibility check)

-- VACUUM again to update visibility map
VACUUM analytics;

-- Back to index-only scan with minimal heap fetches
EXPLAIN (ANALYZE, BUFFERS)
SELECT user_id, event_type, value
FROM analytics
WHERE user_id = 50000 AND event_type = 'purchase';
-- Index Only Scan using idx_analytics_user_type
-- Heap Fetches: 0
```

### Example 6: Selectivity and Column Ordering

```sql
-- Create table with columns of different selectivity
CREATE TABLE transactions (
    transaction_id SERIAL PRIMARY KEY,
    user_id INTEGER,              -- 100K distinct values (high selectivity)
    transaction_type VARCHAR(20), -- 5 distinct values (low selectivity)
    status VARCHAR(20),           -- 4 distinct values (low selectivity)
    amount NUMERIC(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert 2 million rows
INSERT INTO transactions (user_id, transaction_type, status, amount, created_at)
SELECT
    (random() * 100000)::INTEGER,
    (ARRAY['purchase', 'refund', 'transfer', 'deposit', 'withdrawal'])[1 + (i % 5)],
    (ARRAY['pending', 'completed', 'failed', 'cancelled'])[1 + (i % 4)],
    (random() * 5000)::NUMERIC(10, 2),
    CURRENT_TIMESTAMP - (random() * 730 || ' days')::INTERVAL
FROM generate_series(1, 2000000) AS i;

ANALYZE transactions;

-- Check selectivity (distinct values / total rows)
SELECT
    COUNT(DISTINCT user_id) AS distinct_users,
    COUNT(DISTINCT transaction_type) AS distinct_types,
    COUNT(DISTINCT status) AS distinct_statuses,
    COUNT(*) AS total_rows,
    ROUND(COUNT(DISTINCT user_id)::NUMERIC / COUNT(*), 4) AS user_selectivity,
    ROUND(COUNT(DISTINCT transaction_type)::NUMERIC / COUNT(*), 6) AS type_selectivity,
    ROUND(COUNT(DISTINCT status)::NUMERIC / COUNT(*), 6) AS status_selectivity
FROM transactions;
-- user_selectivity: ~0.05 (high)
-- type_selectivity: ~0.000003 (low)
-- status_selectivity: ~0.000002 (low)

-- Common query: filter by type and status, lookup by user
SELECT * FROM transactions
WHERE transaction_type = 'purchase' AND status = 'completed' AND user_id = 50000;

-- Strategy 1: High selectivity first (user_id)
CREATE INDEX idx_tx_user_type_status ON transactions (user_id, transaction_type, status);

EXPLAIN ANALYZE
SELECT * FROM transactions
WHERE transaction_type = 'purchase' AND status = 'completed' AND user_id = 50000;
-- Index Scan using idx_tx_user_type_status
-- Very efficient: Narrow down to user first, then filter

-- Strategy 2: Low selectivity first (type, status)
CREATE INDEX idx_tx_type_status_user ON transactions (transaction_type, status, user_id);

EXPLAIN ANALYZE
SELECT * FROM transactions
WHERE transaction_type = 'purchase' AND status = 'completed' AND user_id = 50000;
-- Index Scan using idx_tx_type_status_user
-- Less efficient: Scans many rows (20% are 'purchase', 25% are 'completed')

-- Compare with EXPLAIN (ANALYZE, BUFFERS) for I/O metrics
-- idx_tx_user_type_status will show fewer buffer reads
```

### Example 7: Complex Covering Index Example

```sql
-- Create orders table with order items
CREATE TABLE order_items (
    item_id BIGSERIAL PRIMARY KEY,
    order_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    unit_price NUMERIC(10, 2),
    discount_pct NUMERIC(5, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert 5 million order items
INSERT INTO order_items (order_id, product_id, quantity, unit_price, discount_pct)
SELECT
    (i / 5) + 1,  -- Each order has ~5 items
    (random() * 10000)::INTEGER,
    (random() * 10 + 1)::INTEGER,
    (random() * 100)::NUMERIC(10, 2),
    (ARRAY[0, 5, 10, 15, 20])[1 + (i % 5)]
FROM generate_series(1, 5000000) AS i;

VACUUM ANALYZE order_items;

-- Common query: Get all items for an order with calculated total
-- SELECT order_id, product_id, quantity, unit_price, discount_pct,
--        (quantity * unit_price * (1 - discount_pct / 100)) AS total
-- FROM order_items WHERE order_id = ?;

-- Create covering index with all needed columns
CREATE INDEX idx_order_items_covering ON order_items (order_id)
INCLUDE (product_id, quantity, unit_price, discount_pct);

-- Test index-only scan
EXPLAIN (ANALYZE, BUFFERS)
SELECT
    order_id,
    product_id,
    quantity,
    unit_price,
    discount_pct,
    (quantity * unit_price * (1 - discount_pct / 100)) AS total
FROM order_items
WHERE order_id = 500000;
-- Index Only Scan using idx_order_items_covering
-- Heap Fetches: 0

-- Compare sizes
SELECT
    pg_size_pretty(pg_relation_size('order_items')) AS table_size,
    pg_size_pretty(pg_relation_size('idx_order_items_covering')) AS index_size,
    ROUND(100.0 * pg_relation_size('idx_order_items_covering') /
          pg_relation_size('order_items'), 2) AS index_pct
FROM pg_class WHERE relname = 'order_items';
-- Index with INCLUDE is larger but enables index-only scans

-- Aggregation query (also benefits from covering index)
EXPLAIN (ANALYZE, BUFFERS)
SELECT
    order_id,
    SUM(quantity * unit_price * (1 - discount_pct / 100)) AS order_total
FROM order_items
WHERE order_id = 500000
GROUP BY order_id;
-- Index Only Scan using idx_order_items_covering
-- Heap Fetches: 0
```

## Common Mistakes

### 1. Wrong Column Order in Multi-Column Index

```sql
-- Query: WHERE status = 'active' AND user_id = 123
-- status: Low cardinality (3 values)
-- user_id: High cardinality (1M values)

-- BAD: Low cardinality first
CREATE INDEX idx_bad ON users (status, user_id);
-- Scans many rows (33% for each status value)

-- GOOD: High cardinality first
CREATE INDEX idx_good ON users (user_id, status);
-- Scans very few rows (user_id is highly selective)

-- BUT: If query is always "WHERE status = ?" then idx_bad might be better
-- Always test with your actual query patterns!
```

### 2. Querying Non-Leftmost Columns

```sql
-- Index on (col1, col2, col3)
CREATE INDEX idx_multi ON table (col1, col2, col3);

-- BAD: Query only col2 (cannot use index efficiently)
SELECT * FROM table WHERE col2 = 'value';
-- Seq Scan or needs separate index on col2

-- GOOD: Query starts with col1
SELECT * FROM table WHERE col1 = 'value' AND col2 = 'value';
-- Index Scan using idx_multi
```

### 3. Too Many INCLUDE Columns

```sql
-- BAD: Including too many columns (index becomes huge)
CREATE INDEX idx_bloated ON users (email)
INCLUDE (name, address, phone, bio, preferences, settings, metadata);
-- Index might be larger than table itself!

-- GOOD: Only include frequently queried columns
CREATE INDEX idx_focused ON users (email)
INCLUDE (name, phone);
-- Smaller index, still useful for common queries
```

### 4. Not Running VACUUM for Index-Only Scans

```sql
-- Create covering index
CREATE INDEX idx_covering ON users (email) INCLUDE (name);

-- Query shows "Index Scan" not "Index Only Scan"
EXPLAIN SELECT email, name FROM users WHERE email = 'test@example.com';
-- Index Scan (not Index Only Scan)

-- Forgot to VACUUM!
VACUUM users;

-- Now it's an Index Only Scan
EXPLAIN SELECT email, name FROM users WHERE email = 'test@example.com';
-- Index Only Scan using idx_covering
```

### 5. Duplicate Indexes with Different Column Orders

```sql
-- BAD: Creating multiple similar indexes
CREATE INDEX idx1 ON orders (customer_id, status, created_at);
CREATE INDEX idx2 ON orders (customer_id, created_at);  -- Redundant!
-- idx1 can serve queries on (customer_id) and (customer_id, status)
-- idx2 is wasteful

-- GOOD: One well-designed index
CREATE INDEX idx_orders ON orders (customer_id, status, created_at);
-- Serves: (customer_id), (customer_id, status), (customer_id, status, created_at)
```

## Best Practices

### 1. Order Columns by Query Pattern

```sql
-- Analyze your WHERE clauses
-- Most common query: WHERE col1 = ? AND col2 = ?
-- Less common: WHERE col1 = ?

-- Create index with most restrictive columns first
CREATE INDEX idx_optimized ON table (col1, col2);
-- Supports both query patterns via leftmost prefix
```

### 2. Use INCLUDE for Frequently Selected Columns

```sql
-- Query: SELECT a, b, c FROM table WHERE a = ?
-- a is filtered, b and c are just selected

-- Good covering index
CREATE INDEX idx_covering ON table (a) INCLUDE (b, c);
-- Smaller than indexing (a, b, c) but still enables index-only scan
```

### 3. Test Column Order with EXPLAIN

```sql
-- Try different column orders
CREATE INDEX idx_v1 ON table (col1, col2);
CREATE INDEX idx_v2 ON table (col2, col1);

-- Test with your actual queries
EXPLAIN (ANALYZE, BUFFERS) SELECT ... WHERE col1 = ? AND col2 = ?;

-- Keep the more efficient one, drop the other
-- Check: execution time, buffer reads, index scans
```

### 4. Monitor Index Usage

```sql
-- Check which indexes are actually used
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Drop unused multi-column indexes (they're expensive)
```

### 5. Prefer Simpler Indexes When Possible

```sql
-- If separate indexes work well enough, use them
-- Simpler, more flexible, easier to understand

-- Only create complex multi-column indexes when:
-- 1. Query performance requires it
-- 2. Single query pattern dominates
-- 3. You've measured the benefit
```

## Practice Exercises

### Exercise 1: Multi-Column Index Optimization

```sql
-- Create e-commerce orders table
CREATE TABLE ecommerce_orders (
    order_id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    product_category VARCHAR(50),
    status VARCHAR(20),
    payment_method VARCHAR(20),
    total_amount NUMERIC(10, 2),
    order_date DATE,
    ship_date DATE
);

-- Insert 1M orders with realistic distribution
INSERT INTO ecommerce_orders (customer_id, product_category, status, payment_method, total_amount, order_date, ship_date)
SELECT
    (random() * 100000)::INTEGER,
    (ARRAY['Electronics', 'Clothing', 'Food', 'Books', 'Toys'])[1 + (i % 5)],
    (ARRAY['pending', 'processing', 'shipped', 'delivered', 'cancelled'])[1 + (i % 5)],
    (ARRAY['credit_card', 'paypal', 'bank_transfer', 'crypto'])[1 + (i % 4)],
    (random() * 1000)::NUMERIC(10, 2),
    CURRENT_DATE - (random() * 730)::INTEGER,
    CURRENT_DATE - (random() * 700)::INTEGER
FROM generate_series(1, 1000000) AS i;

ANALYZE ecommerce_orders;

-- Common query patterns:
-- A) SELECT * FROM ecommerce_orders WHERE customer_id = ? AND status = ?;
-- B) SELECT * FROM ecommerce_orders WHERE status = ? AND order_date > ?;
-- C) SELECT * FROM ecommerce_orders WHERE product_category = ? AND status = ? ORDER BY order_date DESC;

-- Tasks:
-- 1. Calculate selectivity for each column (distinct values / total rows)
-- 2. Design optimal multi-column indexes for each query pattern
-- 3. Test with EXPLAIN (ANALYZE, BUFFERS)
-- 4. Compare different column orderings
-- 5. Determine: Can one index serve multiple queries via leftmost prefix?
```

### Exercise 2: Covering Index Design

```sql
-- Create blog posts table
CREATE TABLE blog_posts (
    post_id SERIAL PRIMARY KEY,
    author_id INTEGER,
    title VARCHAR(255),
    slug VARCHAR(255) UNIQUE,
    excerpt TEXT,
    content TEXT,
    published_at TIMESTAMP,
    view_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0
);

-- Insert 100K posts
INSERT INTO blog_posts (author_id, title, slug, excerpt, content, published_at, view_count, comment_count)
SELECT
    (random() * 1000)::INTEGER,
    'Blog Post Title ' || i,
    'blog-post-' || i,
    'This is the excerpt for post ' || i,
    'Full content of blog post ' || i || ' with lots of text...',
    CURRENT_TIMESTAMP - (random() * 730 || ' days')::INTERVAL,
    (random() * 10000)::INTEGER,
    (random() * 100)::INTEGER
FROM generate_series(1, 100000) AS i;

VACUUM ANALYZE blog_posts;

-- Common queries:
-- Q1: List posts by author (id, title, excerpt, published_at)
--     SELECT post_id, title, excerpt, published_at
--     FROM blog_posts WHERE author_id = ? ORDER BY published_at DESC;

-- Q2: Get post by slug (id, title, author_id, published_at)
--     SELECT post_id, title, author_id, published_at
--     FROM blog_posts WHERE slug = ?;

-- Q3: Popular posts (slug, title, view_count)
--     SELECT slug, title, view_count
--     FROM blog_posts ORDER BY view_count DESC LIMIT 10;

-- Tasks:
-- 1. Design covering indexes for each query to enable index-only scans
-- 2. Use INCLUDE clause appropriately
-- 3. Verify index-only scans with EXPLAIN (check Heap Fetches: 0)
-- 4. Compare index sizes with and without INCLUDE
-- 5. Measure query performance improvement
```

### Exercise 3: Multi-Column vs Separate Indexes

```sql
-- Create products inventory table
CREATE TABLE inventory (
    item_id SERIAL PRIMARY KEY,
    warehouse_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    last_restocked TIMESTAMP,
    low_stock_alert BOOLEAN
);

-- Insert 2M inventory records
INSERT INTO inventory (warehouse_id, product_id, quantity, last_restocked, low_stock_alert)
SELECT
    (i % 50) + 1,  -- 50 warehouses
    (random() * 10000)::INTEGER,
    (random() * 1000)::INTEGER,
    CURRENT_TIMESTAMP - (random() * 180 || ' days')::INTERVAL,
    random() > 0.8  -- 20% have low stock alert
FROM generate_series(1, 2000000) AS i;

ANALYZE inventory;

-- Different query patterns:
-- Q1: SELECT * FROM inventory WHERE warehouse_id = ? AND product_id = ?;
-- Q2: SELECT * FROM inventory WHERE warehouse_id = ?;
-- Q3: SELECT * FROM inventory WHERE product_id = ?;
-- Q4: SELECT * FROM inventory WHERE warehouse_id = ? AND low_stock_alert = true;

-- Tasks:
-- 1. Scenario A: Create multi-column index (warehouse_id, product_id)
--    Test which queries can use it (leftmost prefix rule)

-- 2. Scenario B: Create separate indexes on warehouse_id and product_id
--    Test if PostgreSQL uses bitmap scan to combine them

-- 3. Compare:
--    - Total index size (multi-column vs separate)
--    - Query performance for each query pattern
--    - Flexibility (which scenario handles more query patterns?)

-- 4. Decide: Multi-column or separate indexes for this workload?
```

## Summary

Multi-column and covering indexes are powerful optimization techniques:

**Multi-Column Indexes:**
- Index multiple columns in a single B-tree structure
- Column order is critical (leftmost prefix rule)
- Supports queries on leftmost prefix of columns
- Design based on query patterns and column selectivity

**Column Ordering Guidelines:**
1. Equality before range predicates
2. High selectivity before low selectivity
3. Most frequently queried first
4. Test with actual queries

**Covering Indexes (INCLUDE):**
- Add non-indexed columns for index-only scans
- INCLUDE columns stored in leaf pages only (smaller than full index)
- Enables queries to avoid heap access entirely
- Requires VACUUM to update visibility map

**Index-Only Scans:**
- Fastest scan type (no table access)
- Requirements: All columns in index, visibility map current
- Check "Heap Fetches" in EXPLAIN (should be 0)
- Trade index size for query speed

**Multi-Column vs Separate Indexes:**
- Multi-column: Better for specific query pattern, more restrictive
- Separate: More flexible, enables bitmap scans
- PostgreSQL can combine separate indexes with BitmapAnd/BitmapOr
- Choose based on query diversity and performance requirements

**Key Principles:**
1. Design indexes for actual query patterns
2. Test column orderings with EXPLAIN ANALYZE
3. Use INCLUDE for frequently selected columns
4. Monitor index usage and size
5. Balance specificity vs flexibility
6. VACUUM regularly for index-only scans

Next: [Index Maintenance](05-index-maintenance.md) - Learn how to monitor index health, detect bloat, and maintain indexes for optimal performance.
