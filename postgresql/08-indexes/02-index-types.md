# Index Types

## Theory

PostgreSQL supports multiple index types, each optimized for different data structures and query patterns. Choosing the right index type can dramatically improve performance for specific workloads.

### Index Type Overview

| Index Type | Best For | Supports | Operations |
|------------|----------|----------|------------|
| **B-tree** | General purpose, ordered data | All data types | =, <, <=, >, >=, BETWEEN, IN, IS NULL, ORDER BY |
| **Hash** | Equality only | Simple types | = only |
| **GiST** | Geometric, ranges, full-text | Complex types | Overlaps, contains, etc. |
| **SP-GiST** | Non-balanced structures | Points, ranges, text | Similar to GiST |
| **GIN** | Multiple values per row | Arrays, JSONB, tsvector | Contains, exists, @@ |
| **BRIN** | Large sequential tables | Ordered data | Range queries on clustered data |

### B-tree (Balanced Tree) - Default

B-tree is the default and most commonly used index type in PostgreSQL.

**Characteristics:**
- Self-balancing tree structure
- Maintains data in sorted order
- O(log n) search, insertion, and deletion
- Supports equality and range queries
- Works with all sortable data types

**When to use:**
- Default choice for most scenarios
- Columns frequently used in WHERE, JOIN, ORDER BY
- Range queries (>, <, BETWEEN)
- Pattern matching with left-anchored LIKE ('ABC%')
- Sorted output required

**Internal structure:**
- Root node points to intermediate nodes
- Intermediate nodes point to leaf nodes or other intermediate nodes
- Leaf nodes contain actual index keys and pointers to table rows
- All leaf nodes are at the same depth (balanced)

### Hash Index

Hash indexes use a hash function to distribute values across buckets.

**Characteristics:**
- Since PostgreSQL 10: WAL-logged (crash-safe)
- Smaller than B-tree for large keys
- Only supports equality (=) operator
- Cannot be used for ORDER BY
- No advantage over B-tree in most cases

**When to use:**
- Long text strings with only equality comparisons
- Hash joins on large keys
- Generally, B-tree is still preferred

**Limitations:**
- No range queries
- No sorting
- No pattern matching
- Limited real-world advantages over B-tree

### GiST (Generalized Search Tree)

GiST is a framework for building custom index types for complex data.

**Characteristics:**
- Extensible index structure
- Lossy index (may require rechecking heap)
- Built-in support for geometric types, ranges, full-text search
- Can index complex predicates

**When to use:**
- Geometric data (points, boxes, polygons, circles)
- Range types (daterange, int4range, etc.)
- Full-text search (tsvector)
- PostGIS spatial data
- Nearest-neighbor searches (ORDER BY <-> for distance)

**Built-in operator classes:**
- `point_ops`, `box_ops`, `circle_ops` (geometric)
- `range_ops` (range types)
- `tsvector_ops` (full-text search)
- `inet_ops` (network addresses)

### SP-GiST (Space-Partitioned GiST)

SP-GiST supports non-balanced partitioned search trees.

**Characteristics:**
- For data with non-balanced clustering
- Quad-trees, k-d trees, radix trees
- Often more efficient than GiST for specific data

**When to use:**
- Point data (2D coordinates)
- IP addresses (inet type)
- Text with prefix searches
- Phone numbers
- Data naturally organized in hierarchical partitions

**Advantages over GiST:**
- Better for point data
- More efficient space partitioning
- Faster for certain query patterns

### GIN (Generalized Inverted Index)

GIN indexes multiple values per row (inverted index).

**Characteristics:**
- Maps values to row IDs (inverted structure)
- Optimized for cases where single row contains many values
- Slower to build and update than B-tree
- Much faster for searching multi-value columns

**When to use:**
- JSONB columns (queries on nested data)
- Array columns
- Full-text search (tsvector)
- Queries using @>, ?, ?&, ?|, @@ operators
- "Does this row contain X?" type queries

**GIN structure:**
- Entry tree: Sorted unique values
- Posting tree/list: Row IDs containing each value
- Fast lookups, slower updates

**GIN variants:**
- **Regular GIN**: Stores all values, larger but faster queries
- **GIN with fastupdate**: Buffers updates, faster writes
- **GIN (jsonb_path_ops)**: Optimized for JSONB contains (@>)

### BRIN (Block Range Index)

BRIN stores summary information about physical block ranges.

**Characteristics:**
- Very small index size (1000x smaller than B-tree)
- Works best on naturally ordered data (timestamps, sequential IDs)
- Stores min/max values per block range
- Scans fewer blocks, not specific rows
- Lossy - requires rechecking heap

**When to use:**
- Very large tables (> 100GB)
- Data inserted in chronological/sequential order
- Columns correlated with physical storage (timestamp, ID)
- Log tables, time-series data, append-only tables
- When storage space is critical

**Trade-offs:**
- Tiny storage footprint
- Much slower than B-tree for random data
- Requires data to be physically clustered

## Syntax

### Creating Different Index Types

```sql
-- B-tree (default - USING btree is optional)
CREATE INDEX idx_name ON table_name (column_name);
CREATE INDEX idx_name ON table_name USING btree (column_name);

-- Hash
CREATE INDEX idx_name ON table_name USING hash (column_name);

-- GiST
CREATE INDEX idx_name ON table_name USING gist (column_name);

-- SP-GiST
CREATE INDEX idx_name ON table_name USING spgist (column_name);

-- GIN
CREATE INDEX idx_name ON table_name USING gin (column_name);

-- BRIN
CREATE INDEX idx_name ON table_name USING brin (column_name);

-- With specific operator class
CREATE INDEX idx_name ON table_name USING gist (column_name gist_trgm_ops);
CREATE INDEX idx_name ON table_name USING gin (column_name jsonb_path_ops);

-- With storage parameters
CREATE INDEX idx_name ON table_name USING gin (column_name)
WITH (fastupdate = on, gin_pending_list_limit = 4096);

CREATE INDEX idx_name ON table_name USING brin (column_name)
WITH (pages_per_range = 128);
```

## Examples

### Example 1: B-tree Index (Default)

```sql
-- Create table for B-tree demonstration
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE,
    email VARCHAR(100),
    age INTEGER,
    registration_date TIMESTAMP,
    last_login TIMESTAMP,
    account_balance NUMERIC(12, 2)
);

-- Insert test data
INSERT INTO users (username, email, age, registration_date, last_login, account_balance)
SELECT
    'user' || i,
    'user' || i || '@example.com',
    18 + (random() * 62)::INTEGER,
    CURRENT_TIMESTAMP - (random() * 1825 || ' days')::INTERVAL,
    CURRENT_TIMESTAMP - (random() * 30 || ' days')::INTERVAL,
    (random() * 10000)::NUMERIC(12, 2)
FROM generate_series(1, 100000) AS i;

-- B-tree indexes for different query patterns
CREATE INDEX idx_users_email ON users(email);              -- Equality
CREATE INDEX idx_users_age ON users(age);                  -- Range queries
CREATE INDEX idx_users_reg_date ON users(registration_date); -- Range + ORDER BY

-- Test equality query
EXPLAIN ANALYZE
SELECT * FROM users WHERE email = 'user50000@example.com';
-- Index Scan using idx_users_email

-- Test range query
EXPLAIN ANALYZE
SELECT * FROM users WHERE age BETWEEN 25 AND 35;
-- Bitmap Index Scan on idx_users_age (or Index Scan if very selective)

-- Test ORDER BY with range
EXPLAIN ANALYZE
SELECT * FROM users
WHERE registration_date > CURRENT_DATE - INTERVAL '30 days'
ORDER BY registration_date;
-- Index Scan using idx_users_reg_date (scan already sorted!)

-- Test pattern matching (B-tree supports left-anchored LIKE)
CREATE INDEX idx_users_username ON users(username);
EXPLAIN ANALYZE
SELECT * FROM users WHERE username LIKE 'user123%';
-- Index Scan using idx_users_username (B-tree can optimize this)

-- This won't use index (not left-anchored)
EXPLAIN ANALYZE
SELECT * FROM users WHERE username LIKE '%123';
-- Seq Scan (B-tree cannot help with trailing wildcards)
```

### Example 2: Hash Index

```sql
-- Create table with long text keys
CREATE TABLE api_keys (
    api_key_id SERIAL PRIMARY KEY,
    api_key_hash VARCHAR(64),  -- SHA-256 hash
    user_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- Insert test data
INSERT INTO api_keys (api_key_hash, user_id, expires_at)
SELECT
    md5(random()::TEXT || i::TEXT),
    (random() * 100000)::INTEGER,
    CURRENT_TIMESTAMP + (random() * 365 || ' days')::INTERVAL
FROM generate_series(1, 100000) AS i;

-- Create hash index
CREATE INDEX idx_api_keys_hash ON api_keys USING hash (api_key_hash);

-- Test equality lookup
EXPLAIN ANALYZE
SELECT * FROM api_keys WHERE api_key_hash = 'abc123def456';
-- Index Scan using idx_api_keys_hash

-- Hash index does NOT support range queries
EXPLAIN ANALYZE
SELECT * FROM api_keys WHERE api_key_hash > 'a';
-- Seq Scan (hash index cannot be used)

-- Compare with B-tree
CREATE INDEX idx_api_keys_btree ON api_keys USING btree (api_key_hash);

-- Check sizes
SELECT
    pg_size_pretty(pg_relation_size('idx_api_keys_hash')) AS hash_size,
    pg_size_pretty(pg_relation_size('idx_api_keys_btree')) AS btree_size;
-- Hash is slightly smaller, but B-tree is usually faster overall
```

### Example 3: GiST Index for Geometric Data

```sql
-- Create table with geometric data
CREATE TABLE locations (
    location_id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    coordinates POINT,
    service_area CIRCLE,
    boundary BOX
);

-- Insert test data (random points in a 1000x1000 grid)
INSERT INTO locations (name, coordinates, service_area, boundary)
SELECT
    'Location ' || i,
    point(random() * 1000, random() * 1000),
    circle(point(random() * 1000, random() * 1000), 50 + random() * 50),
    box(point(random() * 1000, random() * 1000), point(random() * 1000, random() * 1000))
FROM generate_series(1, 10000) AS i;

-- Create GiST indexes
CREATE INDEX idx_locations_coords ON locations USING gist (coordinates);
CREATE INDEX idx_locations_area ON locations USING gist (service_area);

-- Find locations near a point (distance operator <->)
EXPLAIN ANALYZE
SELECT name, coordinates
FROM locations
ORDER BY coordinates <-> point(500, 500)
LIMIT 10;
-- Index Scan using idx_locations_coords (nearest neighbor search)

-- Find locations within a box
EXPLAIN ANALYZE
SELECT name, coordinates
FROM locations
WHERE coordinates <@ box '((400,400),(600,600))';
-- Index Scan using idx_locations_coords (containment)

-- Find overlapping service areas
EXPLAIN ANALYZE
SELECT name, service_area
FROM locations
WHERE service_area && circle '<(500,500),100>';
-- Index Scan using idx_locations_area (overlap operator)
```

### Example 4: GIN Index for JSONB and Arrays

```sql
-- Create table with JSONB and array columns
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    tags TEXT[],
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert test data with arrays and JSONB
INSERT INTO products (name, tags, metadata)
SELECT
    'Product ' || i,
    ARRAY['tag' || (i % 10), 'tag' || (i % 20), 'tag' || (i % 30)],
    jsonb_build_object(
        'price', (random() * 1000)::NUMERIC(10, 2),
        'category', (ARRAY['Electronics', 'Clothing', 'Food', 'Books'])[1 + (i % 4)],
        'specs', jsonb_build_object(
            'weight', (random() * 10)::NUMERIC(5, 2),
            'color', (ARRAY['red', 'blue', 'green', 'black'])[1 + (i % 4)]
        ),
        'in_stock', random() > 0.2
    )
FROM generate_series(1, 50000) AS i;

-- Create GIN indexes
CREATE INDEX idx_products_tags ON products USING gin (tags);
CREATE INDEX idx_products_metadata ON products USING gin (metadata);

-- Alternative: jsonb_path_ops (smaller, faster, but only for @> operator)
CREATE INDEX idx_products_metadata_path ON products USING gin (metadata jsonb_path_ops);

-- Array contains query
EXPLAIN ANALYZE
SELECT * FROM products WHERE tags @> ARRAY['tag5'];
-- Bitmap Index Scan on idx_products_tags

-- Array overlap query
EXPLAIN ANALYZE
SELECT * FROM products WHERE tags && ARRAY['tag1', 'tag2'];
-- Bitmap Index Scan on idx_products_tags

-- JSONB contains query (default GIN)
EXPLAIN ANALYZE
SELECT * FROM products WHERE metadata @> '{"category": "Electronics"}';
-- Bitmap Index Scan on idx_products_metadata

-- JSONB nested query
EXPLAIN ANALYZE
SELECT * FROM products WHERE metadata @> '{"specs": {"color": "red"}}';
-- Bitmap Index Scan on idx_products_metadata

-- JSONB key existence
EXPLAIN ANALYZE
SELECT * FROM products WHERE metadata ? 'price';
-- Bitmap Index Scan on idx_products_metadata

-- Compare index sizes
SELECT
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE tablename = 'products';
-- jsonb_path_ops is typically 20-40% smaller than default GIN
```

### Example 5: SP-GiST Index for IP Addresses

```sql
-- Create table for network access logs
CREATE TABLE access_logs (
    log_id SERIAL PRIMARY KEY,
    ip_address INET,
    request_path VARCHAR(255),
    status_code INTEGER,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert test data with IP addresses
INSERT INTO access_logs (ip_address, request_path, status_code)
SELECT
    ('192.168.' || (i % 256) || '.' || (i % 256))::INET,
    '/path/' || (i % 100),
    (ARRAY[200, 201, 301, 400, 404, 500])[1 + (i % 6)]
FROM generate_series(1, 100000) AS i;

-- Create SP-GiST index (better for inet than B-tree or GiST)
CREATE INDEX idx_access_logs_ip_spgist ON access_logs USING spgist (ip_address);

-- For comparison, create B-tree index
CREATE INDEX idx_access_logs_ip_btree ON access_logs USING btree (ip_address);

-- Query for specific IP
EXPLAIN ANALYZE
SELECT * FROM access_logs WHERE ip_address = '192.168.100.100';
-- Index Scan using idx_access_logs_ip_spgist

-- Query for IP range (subnet)
EXPLAIN ANALYZE
SELECT * FROM access_logs WHERE ip_address << '192.168.100.0/24';
-- Bitmap Index Scan on idx_access_logs_ip_spgist

-- Compare index sizes
SELECT
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE tablename = 'access_logs'
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Example 6: BRIN Index for Time-Series Data

```sql
-- Create large time-series table (sensor readings)
CREATE TABLE sensor_readings (
    reading_id BIGSERIAL PRIMARY KEY,
    sensor_id INTEGER,
    temperature NUMERIC(5, 2),
    humidity NUMERIC(5, 2),
    timestamp TIMESTAMP,
    location VARCHAR(50)
);

-- Insert 10 million rows in chronological order (typical time-series pattern)
INSERT INTO sensor_readings (sensor_id, temperature, humidity, timestamp, location)
SELECT
    (random() * 1000)::INTEGER,
    (15 + random() * 20)::NUMERIC(5, 2),
    (30 + random() * 50)::NUMERIC(5, 2),
    CURRENT_TIMESTAMP - ((10000000 - i) || ' minutes')::INTERVAL,
    'Location ' || (i % 100)
FROM generate_series(1, 10000000) AS i;

-- Check table size
SELECT pg_size_pretty(pg_relation_size('sensor_readings')) AS table_size;
-- Approximately 600-800 MB

-- Create BRIN index on timestamp (data is naturally ordered)
CREATE INDEX idx_sensor_brin_timestamp ON sensor_readings
USING brin (timestamp) WITH (pages_per_range = 128);

-- For comparison, create B-tree index
CREATE INDEX idx_sensor_btree_timestamp ON sensor_readings
USING btree (timestamp);

-- Compare index sizes
SELECT
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size,
    pg_size_pretty(pg_relation_size('sensor_readings')) AS table_size,
    ROUND(100.0 * pg_relation_size(indexrelid) / pg_relation_size('sensor_readings'), 2) AS pct_of_table
FROM pg_stat_user_indexes
WHERE tablename = 'sensor_readings'
ORDER BY indexrelid::regclass::text;
-- BRIN: ~200 KB (0.03% of table)
-- B-tree: ~200 MB (25-30% of table)
-- BRIN is ~1000x smaller!

-- Query recent data (common pattern for time-series)
EXPLAIN ANALYZE
SELECT AVG(temperature) FROM sensor_readings
WHERE timestamp > CURRENT_TIMESTAMP - INTERVAL '1 hour';
-- Bitmap Index Scan on idx_sensor_brin_timestamp

-- Set work_mem to avoid hash aggregation interference
SET work_mem = '256MB';

-- Query with both indexes (PostgreSQL will choose based on cost)
SET enable_seqscan = off;  -- Force index usage for comparison

EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM sensor_readings WHERE timestamp BETWEEN '2026-01-01' AND '2026-01-02';

-- BRIN is chosen for range queries on chronologically ordered data
-- Note: BRIN scans more blocks than B-tree but index itself is much smaller
```

### Example 7: Choosing the Right Index Type

```sql
-- Comparative example showing when to use each index type
CREATE TABLE analytics_events (
    event_id BIGSERIAL PRIMARY KEY,
    user_id INTEGER,
    event_type VARCHAR(50),
    event_data JSONB,
    tags TEXT[],
    ip_address INET,
    location POINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert diverse data
INSERT INTO analytics_events (user_id, event_type, event_data, tags, ip_address, location)
SELECT
    (random() * 100000)::INTEGER,
    (ARRAY['click', 'view', 'purchase', 'signup', 'logout'])[1 + (i % 5)],
    jsonb_build_object(
        'page', '/page/' || (i % 100),
        'duration', (random() * 300)::INTEGER,
        'referrer', 'ref' || (i % 50)
    ),
    ARRAY['tag' || (i % 20), 'tag' || (i % 30)],
    ('10.' || (i % 256) || '.' || (i % 256) || '.1')::INET,
    point(random() * 360 - 180, random() * 180 - 90),
    CURRENT_TIMESTAMP - ((1000000 - i) || ' seconds')::INTERVAL
FROM generate_series(1, 1000000) AS i;

-- Choose appropriate index type for each column:

-- B-tree: General-purpose, equality and range
CREATE INDEX idx_events_user_id ON analytics_events USING btree (user_id);
CREATE INDEX idx_events_type ON analytics_events USING btree (event_type);

-- BRIN: Timestamp in chronological order
CREATE INDEX idx_events_created_brin ON analytics_events
USING brin (created_at) WITH (pages_per_range = 128);

-- GIN: Multi-value columns (JSONB, arrays)
CREATE INDEX idx_events_data ON analytics_events USING gin (event_data);
CREATE INDEX idx_events_tags ON analytics_events USING gin (tags);

-- SP-GiST: Network addresses
CREATE INDEX idx_events_ip ON analytics_events USING spgist (ip_address);

-- GiST: Geometric data
CREATE INDEX idx_events_location ON analytics_events USING gist (location);

-- Analyze to update statistics
ANALYZE analytics_events;

-- Compare all indexes
SELECT
    indexname,
    indexdef,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_indexes
JOIN pg_stat_user_indexes USING (indexname)
WHERE tablename = 'analytics_events'
ORDER BY pg_relation_size(indexrelid) DESC;
```

## Common Mistakes

### 1. Using Hash When B-tree Would Be Better

```sql
-- BAD: Hash index for column that needs range queries
CREATE INDEX idx_users_age_hash ON users USING hash (age);

-- This query won't use the hash index!
SELECT * FROM users WHERE age > 30;
-- Seq Scan (hash only supports =)

-- GOOD: Use B-tree (supports both equality and ranges)
CREATE INDEX idx_users_age_btree ON users USING btree (age);
```

### 2. Wrong GIN Operator Class for JSONB

```sql
-- Create test table
CREATE TABLE docs (doc_id SERIAL PRIMARY KEY, data JSONB);

-- BAD: Using default GIN for simple containment queries
CREATE INDEX idx_docs_data ON docs USING gin (data);
-- Larger index, unnecessary features

-- GOOD: Use jsonb_path_ops for @> queries (20-40% smaller, faster)
CREATE INDEX idx_docs_data_path ON docs USING gin (data jsonb_path_ops);

-- jsonb_path_ops supports: @>
-- Default GIN supports: @>, ?, ?&, ?|, @?
-- Choose based on your query patterns
```

### 3. BRIN on Unordered Data

```sql
-- BAD: BRIN on randomly distributed data
CREATE TABLE random_data (id SERIAL PRIMARY KEY, value INTEGER);
INSERT INTO random_data (value) SELECT (random() * 1000000)::INTEGER FROM generate_series(1, 1000000);

CREATE INDEX idx_random_brin ON random_data USING brin (value);

-- BRIN is ineffective - must scan almost all blocks
EXPLAIN ANALYZE SELECT * FROM random_data WHERE value = 500000;
-- Bitmap Heap Scan, but scans huge number of blocks

-- GOOD: BRIN only for naturally ordered data
CREATE TABLE ordered_data (id SERIAL PRIMARY KEY, timestamp TIMESTAMP);
INSERT INTO ordered_data (timestamp)
SELECT CURRENT_TIMESTAMP - ((1000000 - i) || ' seconds')::INTERVAL
FROM generate_series(1, 1000000) AS i;

CREATE INDEX idx_ordered_brin ON ordered_data USING brin (timestamp);
-- BRIN is very effective here
```

### 4. Not Considering Index Size vs Performance Trade-offs

```sql
-- On a 10M row table with timestamps:

-- B-tree: ~250 MB index, very fast queries
-- BRIN: ~500 KB index, slightly slower queries

-- BAD: Always using B-tree without considering size
CREATE INDEX idx_huge_logs_timestamp ON huge_logs USING btree (timestamp);
-- 250 MB index on a 1 GB table

-- GOOD: Consider BRIN for ordered data when space matters
CREATE INDEX idx_huge_logs_timestamp_brin ON huge_logs
USING brin (timestamp) WITH (pages_per_range = 128);
-- 500 KB index, acceptable performance for range queries
```

### 5. Using Wrong Index for Full-Text Search

```sql
-- BAD: B-tree on tsvector (won't work well)
CREATE TABLE articles (id SERIAL PRIMARY KEY, title TEXT, body TEXT, tsv tsvector);
CREATE INDEX idx_articles_tsv_btree ON articles USING btree (tsv);

-- This query won't use the index effectively
SELECT * FROM articles WHERE tsv @@ to_tsquery('postgresql');

-- GOOD: GIN for full-text search
CREATE INDEX idx_articles_tsv_gin ON articles USING gin (tsv);
-- Much faster for @@ operator
```

## Best Practices

### 1. Choose Index Type Based on Data and Queries

```sql
-- Decision tree:
-- 1. General purpose (equality, range, ORDER BY)? -> B-tree
-- 2. Multi-value per row (JSONB, arrays, full-text)? -> GIN
-- 3. Geometric data, nearest-neighbor? -> GiST
-- 4. Network addresses, text prefixes? -> SP-GiST
-- 5. Huge table, chronological data, range queries? -> BRIN
-- 6. Only equality on large keys? -> Maybe Hash (but B-tree usually better)
```

### 2. Monitor Index Effectiveness

```sql
-- Check if indexes are being used
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
ORDER BY pg_relation_size(indexrelid) DESC;

-- If idx_scan = 0, consider dropping the index
```

### 3. Use Appropriate Storage Parameters

```sql
-- GIN with fastupdate for write-heavy workloads
CREATE INDEX idx_products_tags ON products USING gin (tags)
WITH (fastupdate = on, gin_pending_list_limit = 4096);

-- BRIN with appropriate pages_per_range
-- Smaller = more precise, larger index, slower inserts
-- Larger = less precise, smaller index, faster inserts
CREATE INDEX idx_logs_timestamp ON logs USING brin (timestamp)
WITH (pages_per_range = 128);  -- Default is 128, tune based on data
```

### 4. Test Before Deploying

```sql
-- Always test with EXPLAIN ANALYZE
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM table WHERE condition;

-- Compare different index types on a copy of production data
-- Measure: query time, index size, build time, write impact
```

### 5. Document Index Choices

```sql
-- Comment on indexes to explain the choice
COMMENT ON INDEX idx_logs_timestamp_brin IS
'BRIN index for chronologically ordered log data. ~1000x smaller than B-tree with acceptable query performance for range scans.';

COMMENT ON INDEX idx_products_metadata_path IS
'GIN index with jsonb_path_ops for containment queries (@>). 30% smaller than default GIN operator class.';
```

## Practice Exercises

### Exercise 1: Index Type Selection

Given different query patterns, choose the appropriate index type.

```sql
-- Create a multi-purpose table
CREATE TABLE events (
    event_id BIGSERIAL PRIMARY KEY,
    user_id INTEGER,
    event_type VARCHAR(50),
    event_timestamp TIMESTAMP,
    metadata JSONB,
    tags TEXT[],
    ip_address INET,
    geo_location POINT
);

-- Insert 1M rows in chronological order
INSERT INTO events (user_id, event_type, event_timestamp, metadata, tags, ip_address, geo_location)
SELECT
    (random() * 100000)::INTEGER,
    (ARRAY['login', 'logout', 'purchase', 'view', 'click'])[1 + (i % 5)],
    CURRENT_TIMESTAMP - ((1000000 - i) || ' seconds')::INTERVAL,
    jsonb_build_object('amount', (random() * 1000)::NUMERIC(10,2), 'category', 'cat' || (i % 10)),
    ARRAY['tag' || (i % 50), 'tag' || (i % 100)],
    ('192.168.' || (i % 256) || '.' || (i % 256))::INET,
    point(random() * 360 - 180, random() * 180 - 90)
FROM generate_series(1, 1000000) AS i;

-- Task: Create optimal indexes for these query patterns:

-- Query 1: Find events by specific user (equality)
-- SELECT * FROM events WHERE user_id = ?;

-- Query 2: Find events in date range (range query on ordered data)
-- SELECT * FROM events WHERE event_timestamp BETWEEN ? AND ?;

-- Query 3: Find events with specific metadata (JSONB containment)
-- SELECT * FROM events WHERE metadata @> '{"category": "cat5"}';

-- Query 4: Find events with any of several tags (array overlap)
-- SELECT * FROM events WHERE tags && ARRAY['tag10', 'tag20'];

-- Query 5: Find events from specific IP subnet (network range)
-- SELECT * FROM events WHERE ip_address << '192.168.1.0/24';

-- Query 6: Find events near a location (geometric nearest-neighbor)
-- SELECT * FROM events ORDER BY geo_location <-> point(0, 0) LIMIT 10;

-- Create the indexes, then verify with EXPLAIN ANALYZE
-- Compare index sizes and query performance
```

### Exercise 2: BRIN vs B-tree Trade-off Analysis

Compare BRIN and B-tree indexes for time-series data.

```sql
-- Create large time-series table
CREATE TABLE metrics (
    metric_id BIGSERIAL PRIMARY KEY,
    metric_name VARCHAR(50),
    value NUMERIC(10, 2),
    timestamp TIMESTAMP
);

-- Insert 5M rows in chronological order
INSERT INTO metrics (metric_name, value, timestamp)
SELECT
    'metric_' || (i % 100),
    (random() * 1000)::NUMERIC(10, 2),
    CURRENT_TIMESTAMP - ((5000000 - i) || ' seconds')::INTERVAL
FROM generate_series(1, 5000000) AS i;

-- Task 1: Create both index types
-- CREATE INDEX idx_metrics_ts_btree ON metrics USING btree (timestamp);
-- CREATE INDEX idx_metrics_ts_brin ON metrics USING brin (timestamp) WITH (pages_per_range = ?);

-- Task 2: Compare sizes
-- Write query to show index sizes and percentage of table size

-- Task 3: Test query performance for different date ranges
-- A) Last hour (very selective)
-- B) Last day (moderately selective)
-- C) Last month (less selective)

-- Task 4: Measure build time
-- Use \timing in psql or pg_stat_statements

-- Task 5: Test impact on writes
-- INSERT 10000 new rows and measure time with each index

-- Questions to answer:
-- - When is BRIN faster than B-tree?
-- - When is B-tree worth the extra space?
-- - What pages_per_range setting is optimal?
```

### Exercise 3: GIN Operator Class Comparison

Compare default GIN vs jsonb_path_ops for JSONB data.

```sql
-- Create table with JSONB column
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    product_data JSONB
);

-- Insert 100K products with nested JSONB
INSERT INTO products (product_data)
SELECT
    jsonb_build_object(
        'name', 'Product ' || i,
        'price', (random() * 1000)::NUMERIC(10, 2),
        'category', (ARRAY['electronics', 'clothing', 'food', 'books'])[1 + (i % 4)],
        'specs', jsonb_build_object(
            'weight', (random() * 10)::NUMERIC(5, 2),
            'color', (ARRAY['red', 'blue', 'green'])[1 + (i % 3)],
            'featured', random() > 0.8
        ),
        'tags', jsonb_build_array('tag' || (i % 20), 'tag' || (i % 30))
    )
FROM generate_series(1, 100000) AS i;

-- Task 1: Create both index types
-- CREATE INDEX idx_products_data_default ON products USING gin (product_data);
-- CREATE INDEX idx_products_data_path ON products USING gin (product_data jsonb_path_ops);

-- Task 2: Compare index sizes

-- Task 3: Test these queries with EXPLAIN ANALYZE:
-- A) SELECT * FROM products WHERE product_data @> '{"category": "electronics"}';
-- B) SELECT * FROM products WHERE product_data @> '{"specs": {"color": "red"}}';
-- C) SELECT * FROM products WHERE product_data ? 'price';  -- Key existence
-- D) SELECT * FROM products WHERE product_data ?& ARRAY['name', 'price'];  -- Multiple keys

-- Task 4: Which queries work with jsonb_path_ops? Which require default GIN?

-- Task 5: Measure build time for each index

-- Conclusion: When should you use each operator class?
```

## Summary

PostgreSQL offers six index types, each optimized for different scenarios:

1. **B-tree**: Default choice for most scenarios, supports all standard comparison operators
2. **Hash**: Rarely used, only for equality on very large keys
3. **GiST**: Geometric data, ranges, full-text search, nearest-neighbor queries
4. **SP-GiST**: Network addresses, text prefixes, point data with natural partitioning
5. **GIN**: JSONB, arrays, full-text search - multi-value columns
6. **BRIN**: Very large chronologically ordered tables - minimal storage footprint

Key decision factors:
- **Data type and structure**: Arrays/JSONB → GIN, Geometric → GiST, IP → SP-GiST
- **Query patterns**: Equality/range → B-tree, Containment → GIN, Distance → GiST
- **Data ordering**: Chronological/sequential → BRIN, Random → B-tree
- **Storage constraints**: Space-critical → BRIN, Performance-critical → B-tree
- **Write patterns**: Write-heavy → Fewer/smaller indexes, Read-heavy → More indexes

Always test with production-like data and query patterns before choosing an index type.

Next: [Partial and Expression Indexes](03-partial-expression-idx.md) - Learn advanced indexing techniques to optimize specific query patterns.
