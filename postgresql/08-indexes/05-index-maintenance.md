# Index Maintenance

## Theory

### Index Bloat

Index bloat occurs when an index contains dead tuples or empty space that is no longer used, making the index larger than necessary.

**Causes of index bloat:**
1. **UPDATE and DELETE operations**: Create dead index entries
2. **Frequent modifications**: Pages split, leaving empty space
3. **Long-running transactions**: Prevent cleanup of dead tuples
4. **Insufficient autovacuum**: Dead tuples not removed quickly enough
5. **High write volume**: Faster bloat accumulation than cleanup

**Effects of bloat:**
- Slower index scans (more pages to read)
- Wasted disk space
- Reduced cache efficiency (bloated index uses more cache)
- Slower INSERT/UPDATE (navigating bloated tree)

**Detecting bloat:**
- Extension: `pgstattuple` provides detailed index statistics
- Queries: Compare logical size vs physical size
- Monitoring: Track index size growth over time

### REINDEX

REINDEX rebuilds an index from scratch, eliminating bloat and fragmentation.

**Types:**
```sql
REINDEX INDEX index_name;          -- Single index
REINDEX TABLE table_name;          -- All indexes on table
REINDEX SCHEMA schema_name;        -- All indexes in schema
REINDEX DATABASE database_name;    -- All indexes in database (must be alone in DB)
REINDEX SYSTEM database_name;      -- System catalogs only
```

**REINDEX behaviors:**
- Acquires EXCLUSIVE lock (blocks reads and writes)
- Drops old index after building new one
- Validates data during rebuild
- Resets index statistics

**REINDEX CONCURRENTLY (PostgreSQL 12+):**
```sql
REINDEX INDEX CONCURRENTLY index_name;
REINDEX TABLE CONCURRENTLY table_name;
```

**Benefits:**
- Does NOT block reads or writes
- Builds new index alongside old one
- Swaps atomically when complete

**Trade-offs:**
- Takes longer than regular REINDEX
- Requires more disk space (two indexes temporarily)
- Can fail (leaves invalid index, must retry)
- Cannot be run inside transaction block

### pg_stat_user_indexes

System view providing index usage statistics per index.

**Key columns:**
- `idx_scan`: Number of index scans initiated
- `idx_tup_read`: Number of index entries returned by scans
- `idx_tup_fetch`: Number of live table rows fetched by simple index scans
- `idx_blks_read`: Disk blocks read
- `idx_blks_hit`: Disk blocks found in cache

**Calculating index efficiency:**
```sql
-- Cache hit ratio
SELECT idx_blks_hit::NUMERIC / NULLIF(idx_blks_hit + idx_blks_read, 0) AS cache_hit_ratio;

-- Unused indexes (never scanned)
SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0;
```

### Finding Unused Indexes

Indexes consume resources (disk, memory, write overhead) even when unused.

**Criteria for "unused":**
- `idx_scan = 0` (never used since stats reset)
- Very low scan count relative to table activity
- Created for one-off query, no longer needed

**Before dropping:**
- Monitor for sufficient period (weeks/months)
- Check if index used for UNIQUE constraint
- Consider seasonal/periodic queries
- Document decision

### Duplicate Index Detection

Duplicate or redundant indexes waste resources.

**Types of duplicates:**
1. **Exact duplicates**: Same columns, same order, same type
2. **Prefix duplicates**: Index on (a, b, c) makes index on (a, b) redundant
3. **Functional duplicates**: Index on column and UNIQUE constraint on same column

### Index Size Monitoring

**Functions:**
- `pg_relation_size(index_name)`: Index size in bytes
- `pg_size_pretty(bytes)`: Human-readable size
- `pg_total_relation_size(table_name)`: Table + all indexes + TOAST

**Monitoring approach:**
- Track index size over time
- Alert on rapid growth (may indicate bloat)
- Compare index size to table size (typical: 20-50%)
- Identify disproportionately large indexes

### Autovacuum and Index Maintenance

**Autovacuum's role:**
- Removes dead tuples from indexes
- Updates visibility map (enables index-only scans)
- Updates statistics (helps query planner)
- Prevents transaction ID wraparound

**Autovacuum configuration (postgresql.conf):**
```ini
autovacuum = on  # Enable autovacuum daemon
autovacuum_max_workers = 3  # Parallel workers
autovacuum_naptime = 60s  # Time between runs

# Per-table thresholds
autovacuum_vacuum_threshold = 50  # Minimum dead tuples
autovacuum_vacuum_scale_factor = 0.2  # 20% of table size
```

**When autovacuum runs on a table:**
```
dead_tuples > (autovacuum_vacuum_threshold + autovacuum_vacuum_scale_factor * tuples)
```

**Manual tuning per table:**
```sql
ALTER TABLE table_name SET (autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE table_name SET (autovacuum_vacuum_threshold = 100);
```

### Monitoring Index Health

**Health indicators:**
1. **Bloat percentage**: > 30% indicates problem
2. **Cache hit ratio**: < 90% may need investigation
3. **Index scans**: Increasing usage is good
4. **Size growth**: Steady growth normal, spikes concerning
5. **Fragmentation**: High leaf page density is good

**Tools:**
- `pgstattuple` extension
- `pg_stat_user_indexes` view
- Custom monitoring queries
- External tools: pgBadger, pg_stat_statements

## Syntax

### Installing pgstattuple Extension

```sql
-- Install extension (requires superuser)
CREATE EXTENSION pgstattuple;

-- Check index bloat
SELECT * FROM pgstatindex('index_name');

-- Check table bloat
SELECT * FROM pgstattuple('table_name');

-- Tuple-level statistics
SELECT * FROM pgstatginindex('gin_index_name');
```

### REINDEX Commands

```sql
-- Reindex single index (blocks reads/writes)
REINDEX INDEX index_name;

-- Reindex all indexes on table
REINDEX TABLE table_name;

-- Reindex all indexes in schema
REINDEX SCHEMA schema_name;

-- Reindex concurrently (doesn't block, PostgreSQL 12+)
REINDEX INDEX CONCURRENTLY index_name;
REINDEX TABLE CONCURRENTLY table_name;

-- Reindex with verbose output
REINDEX (VERBOSE) INDEX index_name;
```

### Querying pg_stat_user_indexes

```sql
-- Basic index statistics
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Detailed statistics with sizes
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    pg_size_pretty(pg_relation_size(relid)) AS table_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Finding Unused Indexes

```sql
-- Indexes never used since stats reset
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
    AND idx_scan = 0
    AND indexrelname NOT LIKE '%_pkey'  -- Exclude primary keys
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Detecting Duplicate Indexes

```sql
-- Find indexes on same table with same columns
SELECT
    pg_size_pretty(SUM(pg_relation_size(idx))::BIGINT) AS size,
    (array_agg(idx))[1] AS idx1,
    (array_agg(idx))[2] AS idx2,
    (array_agg(idx))[3] AS idx3,
    (array_agg(idx))[4] AS idx4
FROM (
    SELECT
        indexrelid::regclass AS idx,
        (indrelid::text || E'\n' || indclass::text || E'\n' ||
         indkey::text || E'\n' || COALESCE(indexprs::text, '') || E'\n' ||
         COALESCE(indpred::text, '')) AS key
    FROM pg_index
) sub
GROUP BY key
HAVING COUNT(*) > 1
ORDER BY SUM(pg_relation_size(idx)) DESC;
```

### Monitoring Index Size

```sql
-- All indexes sorted by size
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    pg_size_pretty(pg_relation_size(relid)) AS table_size,
    ROUND(100.0 * pg_relation_size(indexrelid) / NULLIF(pg_relation_size(relid), 0), 2) AS index_pct
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;
```

## Examples

### Example 1: Detecting and Fixing Index Bloat

```sql
-- Install pgstattuple extension
CREATE EXTENSION IF NOT EXISTS pgstattuple;

-- Create test table with heavy updates (causes bloat)
CREATE TABLE user_sessions (
    session_id SERIAL PRIMARY KEY,
    user_id INTEGER,
    session_token VARCHAR(64),
    last_activity TIMESTAMP,
    ip_address INET
);

-- Insert initial data
INSERT INTO user_sessions (user_id, session_token, last_activity, ip_address)
SELECT
    (random() * 10000)::INTEGER,
    md5(random()::TEXT),
    CURRENT_TIMESTAMP - (random() * 30 || ' days')::INTERVAL,
    ('192.168.' || (i % 256) || '.' || (i % 256))::INET
FROM generate_series(1, 100000) AS i;

-- Create index
CREATE INDEX idx_sessions_user ON user_sessions (user_id);

-- Check initial index statistics
SELECT * FROM pgstatindex('idx_sessions_user');
-- leaf_fragmentation: ~0% (new index, no fragmentation)
-- avg_leaf_density: ~90% (well-packed)

-- Simulate heavy UPDATE load (causes bloat)
UPDATE user_sessions SET last_activity = CURRENT_TIMESTAMP WHERE session_id % 2 = 0;
UPDATE user_sessions SET last_activity = CURRENT_TIMESTAMP WHERE session_id % 3 = 0;
UPDATE user_sessions SET last_activity = CURRENT_TIMESTAMP WHERE session_id % 5 = 0;
UPDATE user_sessions SET last_activity = CURRENT_TIMESTAMP WHERE session_id % 7 = 0;

-- Delete many rows
DELETE FROM user_sessions WHERE session_id % 10 = 0;

-- Check index statistics again
SELECT
    version,
    tree_level,
    index_size,
    root_block_no,
    internal_pages,
    leaf_pages,
    empty_pages,
    deleted_pages,
    avg_leaf_density,
    leaf_fragmentation
FROM pgstatindex('idx_sessions_user');
-- leaf_fragmentation: Higher (fragmented by updates/deletes)
-- avg_leaf_density: Lower (less packed, more empty space)
-- deleted_pages: Dead pages waiting for reuse

-- Calculate bloat percentage
SELECT
    pg_size_pretty(pg_relation_size('idx_sessions_user')) AS current_size,
    ROUND(100 - avg_leaf_density, 2) AS bloat_pct,
    CASE
        WHEN avg_leaf_density > 70 THEN 'Healthy'
        WHEN avg_leaf_density > 50 THEN 'Moderate bloat'
        ELSE 'Significant bloat - consider REINDEX'
    END AS recommendation
FROM pgstatindex('idx_sessions_user');

-- REINDEX to eliminate bloat
REINDEX INDEX idx_sessions_user;

-- Check after REINDEX
SELECT
    pg_size_pretty(pg_relation_size('idx_sessions_user')) AS new_size,
    avg_leaf_density,
    leaf_fragmentation
FROM pgstatindex('idx_sessions_user');
-- avg_leaf_density: ~90% (back to healthy)
-- leaf_fragmentation: ~0%
-- Size likely reduced
```

### Example 2: REINDEX CONCURRENTLY

```sql
-- Create large table (simulating production)
CREATE TABLE large_table (
    id SERIAL PRIMARY KEY,
    data VARCHAR(100),
    status VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert 1 million rows
INSERT INTO large_table (data, status)
SELECT
    'Data ' || i,
    (ARRAY['active', 'inactive', 'pending'])[1 + (i % 3)]
FROM generate_series(1, 1000000) AS i;

-- Create index
CREATE INDEX idx_large_status ON large_table (status);

-- Simulate updates to cause bloat
UPDATE large_table SET status = 'active' WHERE id % 5 = 0;

-- Check index size before REINDEX
SELECT pg_size_pretty(pg_relation_size('idx_large_status')) AS size_before;

-- Regular REINDEX (blocks reads/writes - DON'T DO IN PRODUCTION!)
-- REINDEX INDEX idx_large_status;  -- Locks table!

-- REINDEX CONCURRENTLY (safe for production)
REINDEX INDEX CONCURRENTLY idx_large_status;
-- No locks held, reads/writes continue
-- Takes longer but production stays online

-- Check index size after REINDEX
SELECT pg_size_pretty(pg_relation_size('idx_large_status')) AS size_after;

-- Verify index is valid
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE indexname = 'idx_large_status';

-- Check if index was marked invalid (rare, but possible with CONCURRENTLY)
SELECT
    indexname,
    indexrelid::regclass,
    indisvalid,
    indisready
FROM pg_index
JOIN pg_class ON pg_class.oid = pg_index.indexrelid
WHERE pg_class.relname = 'idx_large_status';
-- indisvalid should be true
-- If false, drop and recreate: DROP INDEX CONCURRENTLY ...; CREATE INDEX ...
```

### Example 3: Finding Unused Indexes

```sql
-- Create table with multiple indexes
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    sku VARCHAR(50),
    category VARCHAR(50),
    price NUMERIC(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert data
INSERT INTO products (name, sku, category, price)
SELECT
    'Product ' || i,
    'SKU-' || LPAD(i::TEXT, 10, '0'),
    (ARRAY['Electronics', 'Clothing', 'Food'])[1 + (i % 3)],
    (random() * 1000)::NUMERIC(10, 2)
FROM generate_series(1, 100000) AS i;

-- Create multiple indexes (some useful, some not)
CREATE INDEX idx_products_name ON products (name);
CREATE INDEX idx_products_sku ON products (sku);
CREATE INDEX idx_products_category ON products (category);
CREATE INDEX idx_products_price ON products (price);
CREATE INDEX idx_products_created ON products (created_at);

-- Reset statistics
SELECT pg_stat_reset();

-- Simulate typical application queries (some indexes used, some not)
SELECT * FROM products WHERE sku = 'SKU-0000050000';
SELECT * FROM products WHERE category = 'Electronics';
SELECT * FROM products WHERE category = 'Electronics' ORDER BY created_at DESC;
-- (Notice: name and price indexes not used)

-- Find unused indexes
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    pg_size_pretty(pg_relation_size(relid)) AS table_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
    AND tablename = 'products'
    AND idx_scan = 0
    AND indexrelname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;
-- idx_products_name: 0 scans (unused!)
-- idx_products_price: 0 scans (unused!)

-- Before dropping, monitor for longer period (weeks/months in production)
-- Document when index was created and why
-- Consider if index is for seasonal/periodic queries

-- Drop unused indexes (saves space, improves write performance)
DROP INDEX idx_products_name;
DROP INDEX idx_products_price;

-- Check space saved
SELECT
    pg_size_pretty(pg_total_relation_size('products')) AS total_size,
    COUNT(*) FILTER (WHERE idx_scan > 0) AS used_indexes,
    COUNT(*) FILTER (WHERE idx_scan = 0) AS unused_indexes
FROM pg_stat_user_indexes
WHERE tablename = 'products';
```

### Example 4: Detecting Duplicate Indexes

```sql
-- Create table
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    status VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create duplicate/redundant indexes (accidentally)
CREATE INDEX idx_orders_customer1 ON orders (customer_id);
CREATE INDEX idx_orders_customer2 ON orders (customer_id);  -- Exact duplicate!

-- Create prefix duplicate
CREATE INDEX idx_orders_cust_status ON orders (customer_id, status);
-- This makes idx_orders_customer1 somewhat redundant (leftmost prefix)

-- Create unique constraint (creates implicit index)
ALTER TABLE orders ADD CONSTRAINT orders_status_unique UNIQUE (status);
-- Now there's an implicit unique index on status

-- Query to find exact duplicates
WITH index_details AS (
    SELECT
        indexrelid::regclass AS index_name,
        indrelid::regclass AS table_name,
        indkey::text AS columns,
        pg_relation_size(indexrelid) AS size_bytes
    FROM pg_index
    WHERE indrelid::regclass::text NOT LIKE 'pg_%'
)
SELECT
    array_agg(index_name) AS duplicate_indexes,
    table_name,
    columns,
    pg_size_pretty(SUM(size_bytes)) AS wasted_space
FROM index_details
GROUP BY table_name, columns
HAVING COUNT(*) > 1
ORDER BY SUM(size_bytes) DESC;
-- Shows: idx_orders_customer1 and idx_orders_customer2 are duplicates

-- Find prefix duplicates (more complex)
SELECT
    a.indexname AS redundant_index,
    b.indexname AS covers_it,
    pg_size_pretty(pg_relation_size(a.indexrelid)) AS wasted_space
FROM pg_stat_user_indexes a
JOIN pg_stat_user_indexes b ON a.tablename = b.tablename
WHERE a.indexrelid <> b.indexrelid
    AND a.schemaname = 'public'
    AND b.schemaname = 'public'
    -- This is simplified; real query would parse pg_index.indkey
ORDER BY pg_relation_size(a.indexrelid) DESC;

-- Drop exact duplicate
DROP INDEX idx_orders_customer2;

-- Consider: Keep idx_orders_cust_status, drop idx_orders_customer1?
-- Depends on query patterns:
-- - If queries often filter by customer_id alone: Keep both
-- - If queries always filter by customer_id + status: Drop single-column index
```

### Example 5: Comprehensive Index Health Report

```sql
-- Create comprehensive index health monitoring query
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    pg_size_pretty(pg_relation_size(relid)) AS table_size,
    ROUND(100.0 * pg_relation_size(indexrelid) / NULLIF(pg_relation_size(relid), 0), 2) AS index_to_table_pct,
    ROUND(100.0 * idx_blks_hit / NULLIF(idx_blks_hit + idx_blks_read, 0), 2) AS cache_hit_pct,
    CASE
        WHEN idx_scan = 0 THEN 'UNUSED - Consider dropping'
        WHEN idx_scan < 10 THEN 'Low usage - Monitor'
        WHEN pg_relation_size(indexrelid) > pg_relation_size(relid) THEN 'Larger than table - Investigate'
        WHEN idx_blks_hit::NUMERIC / NULLIF(idx_blks_hit + idx_blks_read, 0) < 0.90 THEN 'Low cache hit - May need more memory'
        ELSE 'Healthy'
    END AS health_status
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Example 6: Autovacuum Monitoring and Tuning

```sql
-- Create table that needs frequent vacuuming
CREATE TABLE events (
    event_id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(50),
    data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert data
INSERT INTO events (event_type, data)
SELECT
    (ARRAY['click', 'view', 'purchase'])[1 + (i % 3)],
    jsonb_build_object('value', random() * 100)
FROM generate_series(1, 1000000) AS i;

-- Create index
CREATE INDEX idx_events_type ON events (event_type);
CREATE INDEX idx_events_created ON events (created_at);

-- Check autovacuum settings for this table
SELECT
    relname,
    reloptions
FROM pg_class
WHERE relname = 'events';
-- NULL means using default settings

-- Check last vacuum/analyze times
SELECT
    schemaname,
    relname,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze,
    n_dead_tup,
    n_live_tup,
    ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup, 0), 2) AS dead_tup_pct
FROM pg_stat_user_tables
WHERE relname = 'events';

-- Simulate heavy UPDATE/DELETE load
UPDATE events SET data = jsonb_build_object('value', 999) WHERE event_id % 10 = 0;
DELETE FROM events WHERE event_id % 20 = 0;

-- Check dead tuples
SELECT
    relname,
    n_dead_tup,
    n_live_tup,
    ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup, 0), 2) AS dead_pct
FROM pg_stat_user_tables
WHERE relname = 'events';
-- High dead tuple percentage

-- Manual VACUUM (autovacuum will eventually do this)
VACUUM VERBOSE events;

-- For write-heavy table, tune autovacuum to run more frequently
ALTER TABLE events SET (autovacuum_vacuum_scale_factor = 0.05);  -- Default 0.2
ALTER TABLE events SET (autovacuum_vacuum_threshold = 100);      -- Default 50

-- Verify settings
SELECT
    relname,
    reloptions
FROM pg_class
WHERE relname = 'events';
-- reloptions: {autovacuum_vacuum_scale_factor=0.05, autovacuum_vacuum_threshold=100}

-- Monitor autovacuum activity
SELECT
    schemaname,
    relname,
    last_autovacuum,
    autovacuum_count
FROM pg_stat_user_tables
WHERE relname = 'events';
```

### Example 7: Index Size Growth Tracking

```sql
-- Create table to track index sizes over time
CREATE TABLE index_size_history (
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    schemaname VARCHAR(50),
    tablename VARCHAR(100),
    indexname VARCHAR(100),
    index_size_bytes BIGINT,
    table_size_bytes BIGINT
);

-- Function to record current sizes
CREATE OR REPLACE FUNCTION record_index_sizes() RETURNS void AS $$
BEGIN
    INSERT INTO index_size_history (schemaname, tablename, indexname, index_size_bytes, table_size_bytes)
    SELECT
        schemaname,
        tablename,
        indexname,
        pg_relation_size(indexrelid),
        pg_relation_size(relid)
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public';
END;
$$ LANGUAGE plpgsql;

-- Record baseline
SELECT record_index_sizes();

-- Simulate data growth
INSERT INTO events (event_type, data)
SELECT
    (ARRAY['click', 'view', 'purchase'])[1 + (i % 3)],
    jsonb_build_object('value', random() * 100)
FROM generate_series(1, 100000) AS i;

-- Record after growth
SELECT record_index_sizes();

-- Analyze growth over time
SELECT
    indexname,
    pg_size_pretty(MIN(index_size_bytes)) AS initial_size,
    pg_size_pretty(MAX(index_size_bytes)) AS current_size,
    pg_size_pretty(MAX(index_size_bytes) - MIN(index_size_bytes)) AS growth,
    ROUND(100.0 * (MAX(index_size_bytes) - MIN(index_size_bytes)) / NULLIF(MIN(index_size_bytes), 0), 2) AS growth_pct
FROM index_size_history
WHERE tablename = 'events'
GROUP BY indexname
ORDER BY MAX(index_size_bytes) - MIN(index_size_bytes) DESC;

-- Detect sudden growth (potential bloat indicator)
WITH size_changes AS (
    SELECT
        indexname,
        recorded_at,
        index_size_bytes,
        LAG(index_size_bytes) OVER (PARTITION BY indexname ORDER BY recorded_at) AS prev_size
    FROM index_size_history
    WHERE tablename = 'events'
)
SELECT
    indexname,
    recorded_at,
    pg_size_pretty(prev_size) AS previous_size,
    pg_size_pretty(index_size_bytes) AS current_size,
    pg_size_pretty(index_size_bytes - prev_size) AS growth,
    ROUND(100.0 * (index_size_bytes - prev_size) / NULLIF(prev_size, 0), 2) AS growth_pct
FROM size_changes
WHERE prev_size IS NOT NULL
    AND (index_size_bytes - prev_size) > 1048576  -- Growth > 1 MB
ORDER BY (index_size_bytes - prev_size) DESC;
-- Large sudden growth may indicate bloat or legitimate data growth
```

## Common Mistakes

### 1. Never Running VACUUM

```sql
-- BAD: Create covering index but never VACUUM
CREATE INDEX idx_covering ON users (email) INCLUDE (name);

-- Query shows Index Scan, not Index Only Scan
EXPLAIN SELECT email, name FROM users WHERE email = 'test@example.com';
-- Index Scan (not Index Only) - visibility map not updated

-- GOOD: VACUUM after creating covering index
VACUUM users;

-- Now it's Index Only Scan
EXPLAIN SELECT email, name FROM users WHERE email = 'test@example.com';
-- Index Only Scan using idx_covering
```

### 2. Using REINDEX Without CONCURRENTLY in Production

```sql
-- BAD: Regular REINDEX on production database
REINDEX INDEX idx_large_table;
-- Locks table! Users get errors!

-- GOOD: Use CONCURRENTLY
REINDEX INDEX CONCURRENTLY idx_large_table;
-- No locks, production continues
```

### 3. Ignoring Unused Indexes

```sql
-- BAD: Never check if indexes are used
-- Indexes created months ago, never scanned, wasting space

-- GOOD: Regular monitoring
SELECT
    indexname,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Drop after monitoring period confirms they're unused
```

### 4. Not Monitoring Index Bloat

```sql
-- BAD: Never check bloat, indexes grow unnecessarily

-- GOOD: Install pgstattuple and monitor
CREATE EXTENSION pgstattuple;

SELECT
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size,
    (SELECT ROUND(100 - avg_leaf_density, 2)
     FROM pgstatindex(indexrelid::regclass::text)) AS bloat_pct
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;

-- REINDEX when bloat > 30%
```

### 5. Resetting Statistics Too Often

```sql
-- BAD: Reset statistics frequently
SELECT pg_stat_reset();
-- Loses valuable usage data!

-- GOOD: Only reset if necessary (rare)
-- Keep statistics for long-term analysis
-- If needed, export stats before reset:
CREATE TABLE stats_backup AS
SELECT * FROM pg_stat_user_indexes;
```

## Best Practices

### 1. Regular Index Maintenance Schedule

```sql
-- Weekly: Check for unused indexes
-- Monthly: Check for bloat
-- Quarterly: Review all indexes, consider REINDEX for bloated ones

-- Script for weekly check:
SELECT
    indexname,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
    AND idx_scan < 100  -- Adjust threshold
ORDER BY pg_relation_size(indexrelid) DESC;
```

### 2. Use Monitoring Tools

```sql
-- Enable pg_stat_statements for query analysis
CREATE EXTENSION pg_stat_statements;

-- Monitor long-term trends
-- External tools: pgBadger, pgAdmin, Grafana + Prometheus
```

### 3. Document Index Decisions

```sql
-- Comment on indexes
COMMENT ON INDEX idx_orders_status IS
'Created 2025-01-15 for order dashboard queries. Used by: daily_orders_report, admin_panel. Do not drop without checking these queries.';

-- Track index creation reasons
CREATE TABLE index_metadata (
    indexname VARCHAR(100) PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    reason TEXT,
    related_queries TEXT
);
```

### 4. Automate Bloat Detection

```sql
-- Create monitoring view
CREATE OR REPLACE VIEW index_bloat_report AS
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    (SELECT ROUND(100 - avg_leaf_density, 2)
     FROM pgstatindex(indexrelid::regclass::text)) AS bloat_pct,
    CASE
        WHEN (SELECT avg_leaf_density FROM pgstatindex(indexrelid::regclass::text)) > 70 THEN 'OK'
        WHEN (SELECT avg_leaf_density FROM pgstatindex(indexrelid::regclass::text)) > 50 THEN 'Monitor'
        ELSE 'REINDEX recommended'
    END AS recommendation
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Query weekly
SELECT * FROM index_bloat_report WHERE recommendation = 'REINDEX recommended';
```

### 5. Test REINDEX Impact

```sql
-- Before REINDEX in production:
-- 1. Test on staging environment
-- 2. Estimate time: Large index can take hours
-- 3. Use CONCURRENTLY to avoid downtime
-- 4. Monitor disk space (CONCURRENTLY needs 2x space temporarily)
-- 5. Verify index is valid after REINDEX CONCURRENTLY

-- Check if index is valid
SELECT indisvalid FROM pg_index
WHERE indexrelid = 'index_name'::regclass;
```

## Practice Exercises

### Exercise 1: Index Bloat Detection and Remediation

```sql
-- Create a table with heavy update activity
CREATE TABLE user_activity (
    activity_id BIGSERIAL PRIMARY KEY,
    user_id INTEGER,
    activity_type VARCHAR(50),
    activity_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert 500K rows
INSERT INTO user_activity (user_id, activity_type, activity_data)
SELECT
    (random() * 10000)::INTEGER,
    (ARRAY['login', 'logout', 'view', 'click', 'purchase'])[1 + (i % 5)],
    jsonb_build_object('value', random() * 100)
FROM generate_series(1, 500000) AS i;

-- Create indexes
CREATE INDEX idx_activity_user ON user_activity (user_id);
CREATE INDEX idx_activity_type ON user_activity (activity_type);
CREATE INDEX idx_activity_created ON user_activity (created_at);

-- Tasks:
-- 1. Install pgstattuple extension
-- 2. Check baseline index health (leaf_density, fragmentation)
-- 3. Simulate heavy updates (UPDATE 50% of rows multiple times)
-- 4. Simulate deletions (DELETE 20% of rows)
-- 5. Check index health again - how much bloat?
-- 6. REINDEX CONCURRENTLY the most bloated index
-- 7. Compare before/after sizes and performance
-- 8. Document bloat percentage and size savings
```

### Exercise 2: Unused Index Detection

```sql
-- Create a table with many indexes (simulating real application over time)
CREATE TABLE customers (
    customer_id SERIAL PRIMARY KEY,
    email VARCHAR(100),
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    city VARCHAR(50),
    state VARCHAR(2),
    zip VARCHAR(10),
    registration_date DATE,
    last_login TIMESTAMP,
    loyalty_points INTEGER
);

-- Insert data
INSERT INTO customers (email, first_name, last_name, city, state, zip, registration_date, last_login, loyalty_points)
SELECT
    'customer' || i || '@example.com',
    'First' || i,
    'Last' || i,
    'City' || (i % 100),
    (ARRAY['CA', 'NY', 'TX'])[1 + (i % 3)],
    LPAD((i % 100000)::TEXT, 5, '0'),
    CURRENT_DATE - (random() * 1825)::INTEGER,
    CURRENT_TIMESTAMP - (random() * 90 || ' days')::INTERVAL,
    (random() * 10000)::INTEGER
FROM generate_series(1, 100000) AS i;

-- Create many indexes (some will be unused)
CREATE INDEX idx_customers_email ON customers (email);
CREATE INDEX idx_customers_name ON customers (last_name, first_name);
CREATE INDEX idx_customers_city ON customers (city);
CREATE INDEX idx_customers_state ON customers (state);
CREATE INDEX idx_customers_zip ON customers (zip);
CREATE INDEX idx_customers_reg_date ON customers (registration_date);
CREATE INDEX idx_customers_last_login ON customers (last_login);
CREATE INDEX idx_customers_loyalty ON customers (loyalty_points);

-- Reset statistics
SELECT pg_stat_reset();

-- Simulate typical queries (only some indexes used)
SELECT * FROM customers WHERE email = 'customer50000@example.com';
SELECT * FROM customers WHERE last_name = 'Last50000';
SELECT * FROM customers WHERE last_login > CURRENT_TIMESTAMP - INTERVAL '7 days';

-- Tasks:
-- 1. Query pg_stat_user_indexes to find unused indexes
-- 2. Calculate wasted disk space from unused indexes
-- 3. Determine which indexes to drop (not primary key!)
-- 4. Before dropping, verify query plans don't break
-- 5. Drop unused indexes
-- 6. Measure disk space saved
-- 7. Document why each index was dropped
```

### Exercise 3: Index Size Monitoring and Growth Analysis

```sql
-- Create table for long-term monitoring
CREATE TABLE logs (
    log_id BIGSERIAL PRIMARY KEY,
    log_level VARCHAR(10),
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_logs_level ON logs (log_level);
CREATE INDEX idx_logs_created ON logs (created_at);

-- Tasks:
-- 1. Create index_size_tracking table to record sizes over time
-- 2. Insert baseline measurement
-- 3. Add 100K rows to logs table
-- 4. Record new measurement
-- 5. Add another 100K rows with 50% UPDATE activity
-- 6. Record measurement again
-- 7. Analyze growth patterns:
--    - Which index grew more?
--    - Is growth proportional to data growth?
--    - Any signs of bloat (disproportionate growth)?
-- 8. Create alert query for >20% growth in 24 hours
```

## Summary

Index maintenance is critical for long-term database performance:

**Index Bloat:**
- Caused by UPDATEs, DELETEs, page splits
- Detected with pgstattuple extension
- Remediated with REINDEX
- Monitor avg_leaf_density (healthy: >70%)

**REINDEX:**
- Regular: Fast but blocks reads/writes
- CONCURRENTLY: Slower but production-safe
- Rebuilds index, eliminates bloat
- Use after heavy UPDATE/DELETE activity

**Monitoring:**
- pg_stat_user_indexes: Usage statistics
- idx_scan: Number of times index used
- Unused indexes (idx_scan = 0): Wasted resources
- Cache hit ratio: Buffer efficiency

**Maintenance Tasks:**
- Find and drop unused indexes
- Detect duplicate indexes
- Monitor index sizes
- Check for bloat regularly
- VACUUM for visibility map updates

**Autovacuum:**
- Removes dead tuples
- Updates visibility map (enables index-only scans)
- Tune per-table if needed
- Monitor with pg_stat_user_tables

**Best Practices:**
1. Regular monitoring schedule
2. Use pgstattuple for bloat detection
3. REINDEX CONCURRENTLY in production
4. Drop unused indexes after monitoring period
5. Document index purposes
6. Automate health checks
7. VACUUM regularly for index-only scans

Proper index maintenance ensures optimal performance, minimal storage waste, and efficient resource utilization.

**Module Complete!** You've learned about index fundamentals, types, partial/expression indexes, multi-column/covering indexes, and maintenance. These skills are essential for database performance optimization.
