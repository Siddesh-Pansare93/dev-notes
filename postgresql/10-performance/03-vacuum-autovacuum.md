# VACUUM and Autovacuum

## Theory

PostgreSQL uses Multi-Version Concurrency Control (MVCC) to handle concurrent transactions. MVCC creates new versions of rows on UPDATE and marks old versions as obsolete rather than modifying data in-place. These obsolete row versions are called "dead tuples" and must be cleaned up periodically to prevent table bloat and maintain performance.

### Key Concepts

**MVCC (Multi-Version Concurrency Control)**: PostgreSQL's concurrency mechanism that allows readers to never block writers and writers to never block readers by maintaining multiple versions of rows.

**Dead Tuples**: Obsolete row versions that are no longer visible to any transaction but still occupy disk space.

**VACUUM**: The process of reclaiming space occupied by dead tuples and updating statistics. Unlike most databases, PostgreSQL doesn't delete data immediately; VACUUM marks space as reusable.

**VACUUM vs VACUUM FULL**:
- VACUUM marks dead tuple space as reusable without locking the table
- VACUUM FULL rewrites the entire table, requires exclusive lock, but reclaims space immediately

**ANALYZE**: Collects statistics about data distribution in tables, which the query planner uses for optimization.

**Autovacuum Daemon**: Background process that automatically runs VACUUM and ANALYZE on tables based on activity thresholds.

**Transaction ID Wraparound**: PostgreSQL uses 32-bit transaction IDs. After ~2 billion transactions, IDs wrap around, which could cause data loss if not handled by VACUUM.

**Visibility Map**: Tracks which pages contain only tuples visible to all transactions, allowing VACUUM to skip them and enabling index-only scans.

**Free Space Map (FSM)**: Tracks available space in pages so INSERT and UPDATE can reuse dead tuple space.

### Why VACUUM Matters

- **Prevents bloat**: Without VACUUM, tables grow indefinitely as dead tuples accumulate
- **Maintains query performance**: Bloated tables require more I/O and slower scans
- **Updates statistics**: Accurate statistics lead to better query plans
- **Prevents transaction ID wraparound**: Critical for database integrity
- **Enables index-only scans**: Updates visibility map for better performance

## Syntax

```sql
-- Basic VACUUM (marks dead tuple space as reusable)
VACUUM;                              -- All tables
VACUUM table_name;                   -- Specific table
VACUUM VERBOSE table_name;           -- With progress output

-- VACUUM with ANALYZE (also updates statistics)
VACUUM ANALYZE;
VACUUM ANALYZE table_name;
VACUUM ANALYZE table_name (column1, column2);  -- Specific columns

-- VACUUM FULL (rewrites table, requires exclusive lock)
VACUUM FULL;
VACUUM FULL table_name;
VACUUM FULL VERBOSE ANALYZE table_name;

-- ANALYZE only (updates statistics without cleaning)
ANALYZE;
ANALYZE table_name;
ANALYZE table_name (column_name);

-- VACUUM options
VACUUM (FULL);                       -- Rewrite table
VACUUM (FREEZE);                     -- Freeze transaction IDs
VACUUM (ANALYZE);                    -- Also collect statistics
VACUUM (DISABLE_PAGE_SKIPPING);      -- Process all pages
VACUUM (SKIP_LOCKED);                -- Skip tables that can't be locked
VACUUM (INDEX_CLEANUP);              -- Clean up indexes (default: true)
VACUUM (TRUNCATE);                   -- Return disk space to OS (default: true)
VACUUM (PARALLEL n);                 -- Use n parallel workers (PostgreSQL 13+)

-- Autovacuum settings (table-level)
ALTER TABLE table_name SET (
    autovacuum_enabled = true,
    autovacuum_vacuum_threshold = 50,
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_threshold = 50,
    autovacuum_analyze_scale_factor = 0.05,
    autovacuum_vacuum_cost_delay = 20,
    autovacuum_vacuum_cost_limit = 200
);

-- View autovacuum settings
SELECT * FROM pg_settings WHERE name LIKE 'autovacuum%';

-- Reset table-level settings
ALTER TABLE table_name RESET (autovacuum_enabled);
```

## Examples

### Example 1: Understanding Dead Tuples

```sql
-- Create test table
CREATE TABLE vacuum_test (
    id SERIAL PRIMARY KEY,
    data VARCHAR(100),
    value INTEGER,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert data
INSERT INTO vacuum_test (data, value)
SELECT 'Data ' || i, i
FROM generate_series(1, 100000) i;

-- Check initial statistics
SELECT
    schemaname,
    tablename,
    n_live_tup,
    n_dead_tup,
    n_mod_since_analyze,
    last_vacuum,
    last_autovacuum,
    last_analyze
FROM pg_stat_user_tables
WHERE tablename = 'vacuum_test';

-- Update many rows (creates dead tuples)
UPDATE vacuum_test SET value = value + 1 WHERE id <= 50000;

-- Check dead tuples
SELECT
    schemaname,
    tablename,
    n_live_tup,
    n_dead_tup,
    n_mod_since_analyze,
    last_vacuum
FROM pg_stat_user_tables
WHERE tablename = 'vacuum_test';
-- n_dead_tup should show ~50,000

-- Check table size
SELECT
    pg_size_pretty(pg_total_relation_size('vacuum_test')) as total_size,
    pg_size_pretty(pg_relation_size('vacuum_test')) as table_size,
    pg_size_pretty(pg_indexes_size('vacuum_test')) as indexes_size;
```

### Example 2: Running VACUUM

```sql
-- Run VACUUM to clean dead tuples
VACUUM VERBOSE vacuum_test;

-- Output shows:
-- INFO: vacuuming "public.vacuum_test"
-- INFO: table "vacuum_test": found 50000 removable, 100000 nonremovable row versions
-- INFO: "vacuum_test": removed 50000 dead item identifiers
-- INFO: "vacuum_test": truncated 885 to 443 pages
-- DETAIL: CPU: user: 0.15 s, system: 0.03 s, elapsed: 0.18 s

-- Check statistics again
SELECT
    n_live_tup,
    n_dead_tup,
    last_vacuum,
    vacuum_count
FROM pg_stat_user_tables
WHERE tablename = 'vacuum_test';
-- n_dead_tup should be 0 or very low

-- Check size again
SELECT
    pg_size_pretty(pg_total_relation_size('vacuum_test')) as total_size;
-- Size might be same or slightly smaller (space marked reusable, not released)
```

### Example 3: VACUUM FULL

```sql
-- Create highly bloated table
CREATE TABLE bloated_table (
    id SERIAL PRIMARY KEY,
    data TEXT
);

INSERT INTO bloated_table (data)
SELECT repeat('X', 1000)
FROM generate_series(1, 100000);

-- Check initial size
SELECT pg_size_pretty(pg_relation_size('bloated_table')) as size;

-- Update all rows multiple times (creates lots of dead tuples)
UPDATE bloated_table SET data = repeat('Y', 1000);
UPDATE bloated_table SET data = repeat('Z', 1000);
UPDATE bloated_table SET data = repeat('A', 1000);

-- Check bloated size
SELECT pg_size_pretty(pg_relation_size('bloated_table')) as size;
-- Should be much larger

-- Regular VACUUM
VACUUM VERBOSE bloated_table;
SELECT pg_size_pretty(pg_relation_size('bloated_table')) as size;
-- Size remains large (space reusable but not released)

-- VACUUM FULL (requires exclusive lock)
VACUUM FULL VERBOSE bloated_table;
SELECT pg_size_pretty(pg_relation_size('bloated_table')) as size;
-- Size should be much smaller

-- Note: VACUUM FULL locks the table, blocking all operations
-- Use only during maintenance windows or on low-traffic tables
```

### Example 4: ANALYZE and Statistics

```sql
-- Create table with varied data distribution
CREATE TABLE products_stats (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50),
    price DECIMAL(10,2),
    stock INTEGER,
    created_at TIMESTAMP
);

-- Insert data with skewed distribution
INSERT INTO products_stats (category, price, stock, created_at)
SELECT
    CASE
        WHEN i <= 80000 THEN 'Electronics'
        WHEN i <= 90000 THEN 'Clothing'
        WHEN i <= 95000 THEN 'Books'
        ELSE 'Other'
    END,
    (random() * 1000)::DECIMAL(10,2),
    (random() * 100)::INTEGER,
    '2020-01-01'::timestamp + (random() * 1460 || ' days')::INTERVAL
FROM generate_series(1, 100000) i;

-- Check statistics before ANALYZE
SELECT
    tablename,
    attname,
    n_distinct,
    most_common_vals,
    most_common_freqs,
    correlation
FROM pg_stats
WHERE tablename = 'products_stats' AND attname = 'category';

-- Run ANALYZE
ANALYZE products_stats;

-- Check statistics after ANALYZE
SELECT
    attname,
    n_distinct,
    most_common_vals,
    most_common_freqs,
    correlation
FROM pg_stats
WHERE tablename = 'products_stats' AND attname = 'category';

-- Should show:
-- n_distinct: ~4 (number of distinct values)
-- most_common_vals: {Electronics, Clothing, Books, Other}
-- most_common_freqs: {0.8, 0.1, 0.05, 0.05} (approximate)

-- Test query plan with updated statistics
CREATE INDEX idx_products_category ON products_stats(category);
EXPLAIN ANALYZE SELECT * FROM products_stats WHERE category = 'Electronics';
-- Should use appropriate plan based on selectivity
```

### Example 5: Autovacuum Monitoring

```sql
-- View autovacuum activity
SELECT
    schemaname,
    tablename,
    n_live_tup,
    n_dead_tup,
    ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) as dead_pct,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze,
    vacuum_count,
    autovacuum_count,
    analyze_count,
    autoanalyze_count
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;

-- Check autovacuum settings
SELECT name, setting, unit, short_desc
FROM pg_settings
WHERE name LIKE 'autovacuum%'
ORDER BY name;

-- Monitor active vacuum operations
SELECT
    pid,
    usename,
    datname,
    state,
    query,
    query_start,
    state_change
FROM pg_stat_activity
WHERE query LIKE '%VACUUM%' OR query LIKE '%autovacuum%';

-- View autovacuum worker activity
SELECT
    pid,
    wait_event_type,
    wait_event,
    state,
    query_start,
    query
FROM pg_stat_activity
WHERE backend_type = 'autovacuum worker';
```

### Example 6: Autovacuum Threshold Calculation

```sql
-- Create table to demonstrate autovacuum threshold
CREATE TABLE auto_vacuum_demo (
    id SERIAL PRIMARY KEY,
    data VARCHAR(100)
);

-- Insert 10,000 rows
INSERT INTO auto_vacuum_demo (data)
SELECT 'Data ' || i FROM generate_series(1, 10000) i;

-- Check current settings and threshold
SELECT
    relname,
    n_live_tup,
    n_dead_tup,
    -- Calculate autovacuum threshold
    COALESCE((SELECT setting::INTEGER FROM pg_settings WHERE name = 'autovacuum_vacuum_threshold'), 50) +
    COALESCE((SELECT setting::NUMERIC FROM pg_settings WHERE name = 'autovacuum_vacuum_scale_factor'), 0.2) * n_live_tup
    AS autovacuum_threshold
FROM pg_stat_user_tables
WHERE relname = 'auto_vacuum_demo';

-- Formula: threshold + (scale_factor * live_tuples)
-- Default: 50 + (0.2 * 10000) = 2050 dead tuples needed

-- Update 2100 rows to trigger autovacuum
UPDATE auto_vacuum_demo SET data = 'Updated' WHERE id <= 2100;

-- Monitor for autovacuum (may take a few seconds)
SELECT
    relname,
    n_dead_tup,
    last_autovacuum
FROM pg_stat_user_tables
WHERE relname = 'auto_vacuum_demo';

-- Check autovacuum daemon status
SHOW autovacuum;  -- Should be 'on'
```

### Example 7: Table-Level Autovacuum Tuning

```sql
-- Create high-churn table (frequent updates)
CREATE TABLE high_activity (
    id SERIAL PRIMARY KEY,
    status VARCHAR(20),
    data TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Set aggressive autovacuum for this table
ALTER TABLE high_activity SET (
    autovacuum_vacuum_threshold = 100,          -- Lower threshold
    autovacuum_vacuum_scale_factor = 0.05,      -- More aggressive (default 0.2)
    autovacuum_analyze_threshold = 50,
    autovacuum_analyze_scale_factor = 0.02,
    autovacuum_vacuum_cost_delay = 10           -- Faster vacuum (default 20ms)
);

-- View table-specific settings
SELECT
    relname,
    reloptions
FROM pg_class
WHERE relname = 'high_activity';

-- Create low-activity table
CREATE TABLE archive_data (
    id SERIAL PRIMARY KEY,
    archived_data TEXT,
    archived_at TIMESTAMP
);

-- Disable or reduce autovacuum frequency
ALTER TABLE archive_data SET (
    autovacuum_vacuum_scale_factor = 0.5,       -- Less aggressive
    autovacuum_analyze_scale_factor = 0.5,
    autovacuum_vacuum_cost_delay = 50           -- Slower vacuum
);

-- Disable autovacuum completely (not recommended)
ALTER TABLE archive_data SET (
    autovacuum_enabled = false
);

-- Reset to defaults
ALTER TABLE archive_data RESET (autovacuum_enabled);
```

### Example 8: Transaction ID Wraparound

```sql
-- Check age of tables (transaction IDs until wraparound)
SELECT
    schemaname,
    tablename,
    age(relfrozenxid) as xid_age,
    (SELECT setting::INTEGER FROM pg_settings WHERE name = 'autovacuum_freeze_max_age') as freeze_max_age,
    ROUND(100.0 * age(relfrozenxid) / (SELECT setting::INTEGER FROM pg_settings WHERE name = 'autovacuum_freeze_max_age'), 2) as pct_to_wraparound
FROM pg_stat_user_tables
JOIN pg_class ON pg_stat_user_tables.relid = pg_class.oid
ORDER BY age(relfrozenxid) DESC;

-- Check database age
SELECT
    datname,
    age(datfrozenxid) as xid_age,
    (SELECT setting::INTEGER FROM pg_settings WHERE name = 'autovacuum_freeze_max_age') as freeze_max_age
FROM pg_database
ORDER BY age(datfrozenxid) DESC;

-- Aggressive VACUUM to prevent wraparound
VACUUM FREEZE vacuum_test;

-- Check frozen transaction ID after VACUUM FREEZE
SELECT
    schemaname,
    tablename,
    age(relfrozenxid) as xid_age
FROM pg_stat_user_tables
WHERE tablename = 'vacuum_test';
-- xid_age should be very low
```

### Example 9: Monitoring Bloat

```sql
-- Query to estimate table bloat
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    n_live_tup,
    n_dead_tup,
    ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_pct,
    last_vacuum,
    last_autovacuum
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC;

-- Detailed bloat estimation query
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    n_live_tup,
    n_dead_tup,
    ROUND(
        CASE
            WHEN n_live_tup + n_dead_tup = 0 THEN 0
            ELSE (n_dead_tup::NUMERIC / (n_live_tup + n_dead_tup)) * 100
        END, 2
    ) AS bloat_percentage,
    last_autovacuum,
    CASE
        WHEN last_autovacuum IS NULL THEN 'Never'
        WHEN last_autovacuum < NOW() - INTERVAL '1 day' THEN 'Over 1 day ago'
        WHEN last_autovacuum < NOW() - INTERVAL '1 hour' THEN 'Over 1 hour ago'
        ELSE 'Recent'
    END AS autovacuum_status
FROM pg_stat_user_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY n_dead_tup DESC;
```

### Example 10: VACUUM Progress Monitoring (PostgreSQL 12+)

```sql
-- In one session, start a long VACUUM
VACUUM VERBOSE products_stats;

-- In another session, monitor progress
SELECT
    pid,
    datname,
    relid::regclass as table_name,
    phase,
    heap_blks_total,
    heap_blks_scanned,
    heap_blks_vacuumed,
    index_vacuum_count,
    max_dead_tuples,
    num_dead_tuples,
    ROUND(100.0 * heap_blks_scanned / NULLIF(heap_blks_total, 0), 2) as pct_complete
FROM pg_stat_progress_vacuum;

-- Phases include:
-- initializing, scanning heap, vacuuming indexes, vacuuming heap,
-- cleaning up indexes, truncating heap, performing final cleanup
```

### Example 11: Preventing Autovacuum Interference

```sql
-- Check for long-running transactions blocking autovacuum
SELECT
    pid,
    usename,
    application_name,
    state,
    query_start,
    state_change,
    NOW() - query_start as duration,
    query
FROM pg_stat_activity
WHERE state != 'idle'
  AND NOW() - query_start > INTERVAL '5 minutes'
ORDER BY query_start;

-- Long-running transactions prevent VACUUM from cleaning dead tuples
-- visible to those transactions

-- Check for idle in transaction connections
SELECT
    pid,
    usename,
    application_name,
    state,
    state_change,
    NOW() - state_change as idle_duration,
    query
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND NOW() - state_change > INTERVAL '10 minutes';

-- Terminate problematic idle transactions (if safe)
-- SELECT pg_terminate_backend(pid);
```

### Example 12: Autovacuum Cost-Based Delay

```sql
-- View autovacuum cost settings
SELECT
    name,
    setting,
    unit,
    short_desc
FROM pg_settings
WHERE name LIKE 'autovacuum%cost%' OR name LIKE 'vacuum_cost%'
ORDER BY name;

-- Key settings:
-- autovacuum_vacuum_cost_delay: sleep time after hitting cost limit
-- autovacuum_vacuum_cost_limit: cost limit before sleeping
-- vacuum_cost_page_hit: cost of page in buffer cache (default 1)
-- vacuum_cost_page_miss: cost of page not in cache (default 10)
-- vacuum_cost_page_dirty: cost of dirtying a page (default 20)

-- Increase autovacuum aggressiveness (process more before sleeping)
-- In postgresql.conf or ALTER SYSTEM:
-- autovacuum_vacuum_cost_limit = 400 (default 200)
-- autovacuum_vacuum_cost_delay = 10 (default 20ms)

-- For specific table, make autovacuum faster
ALTER TABLE high_activity SET (
    autovacuum_vacuum_cost_delay = 5,
    autovacuum_vacuum_cost_limit = 500
);
```

## Common Mistakes

### 1. Never Running VACUUM Manually on High-Activity Tables
```sql
-- Wrong: Relying only on autovacuum for very high-churn tables
-- Autovacuum may not keep up

-- Right: Supplement with manual VACUUM during low-traffic periods
VACUUM ANALYZE high_activity_table;
```

### 2. Using VACUUM FULL Too Often
```sql
-- Wrong: Regular VACUUM FULL
VACUUM FULL table_name; -- Locks table, very slow

-- Right: Use regular VACUUM, reserve FULL for rare maintenance
VACUUM table_name;
```

### 3. Disabling Autovacuum
```sql
-- Wrong: Disabling autovacuum to "improve performance"
ALTER TABLE table_name SET (autovacuum_enabled = false);

-- Right: Tune autovacuum parameters instead
ALTER TABLE table_name SET (
    autovacuum_vacuum_scale_factor = 0.05
);
```

### 4. Ignoring Dead Tuple Warnings
```sql
-- Wrong: Ignoring high dead tuple counts
-- Check pg_stat_user_tables regularly

-- Right: Investigate and tune autovacuum or run manual VACUUM
```

### 5. Not Running ANALYZE After Bulk Changes
```sql
-- Wrong: Large INSERT/UPDATE without ANALYZE
INSERT INTO table_name SELECT ... FROM large_source;

-- Right: Run ANALYZE to update statistics
INSERT INTO table_name SELECT ... FROM large_source;
ANALYZE table_name;
```

### 6. Long-Running Transactions Blocking Cleanup
```sql
-- Wrong: Leaving transactions open
BEGIN;
SELECT * FROM table_name;
-- ... application does other work for hours ...

-- Right: Keep transactions short
BEGIN;
SELECT * FROM table_name;
-- ... quick processing ...
COMMIT;
```

### 7. Not Monitoring Autovacuum Activity
```sql
-- Wrong: Never checking autovacuum status
-- Results in bloat and performance issues

-- Right: Regular monitoring
SELECT tablename, last_autovacuum, n_dead_tup
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;
```

## Best Practices

### 1. Let Autovacuum Run
Keep autovacuum enabled (default). It handles most cleanup automatically.

### 2. Tune Autovacuum for Workload
```sql
-- High-churn tables: more aggressive
ALTER TABLE busy_table SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_vacuum_threshold = 100
);

-- Low-activity tables: less aggressive
ALTER TABLE archive_table SET (
    autovacuum_vacuum_scale_factor = 0.3
);
```

### 3. Monitor Dead Tuples Regularly
```sql
-- Weekly check for bloat
SELECT tablename, n_live_tup, n_dead_tup, last_autovacuum
FROM pg_stat_user_tables
WHERE n_dead_tup > 10000
ORDER BY n_dead_tup DESC;
```

### 4. Run ANALYZE After Bulk Operations
Always run ANALYZE after large INSERT, UPDATE, DELETE, or COPY operations.

### 5. Schedule Manual VACUUM During Maintenance Windows
For very large or active tables, supplement autovacuum with scheduled VACUUM.

### 6. Keep Transactions Short
Long transactions prevent VACUUM from cleaning tuples, causing bloat.

### 7. Monitor Transaction ID Age
```sql
-- Alert when approaching wraparound
SELECT
    tablename,
    age(relfrozenxid),
    (age(relfrozenxid)::float / 2000000000 * 100)::int as pct_toward_wraparound
FROM pg_stat_user_tables
JOIN pg_class ON pg_stat_user_tables.relid = pg_class.oid
WHERE age(relfrozenxid) > 1000000000
ORDER BY age(relfrozenxid) DESC;
```

### 8. Use VACUUM FREEZE Before Major Upgrades
Prevents wraparound issues and improves upgrade performance.

### 9. Consider toast_tuple_target for Large Columns
```sql
-- For tables with large TEXT/JSONB columns
ALTER TABLE table_name SET (toast_tuple_target = 8160);
-- Reduces bloat in TOAST tables
```

### 10. Monitor Autovacuum Workers
```sql
-- Ensure enough workers for workload
SHOW autovacuum_max_workers; -- Default 3
-- Increase if tables frequently have high dead tuple counts
```

### 11. Use VERBOSE for Diagnostics
```sql
VACUUM VERBOSE table_name;
-- Provides detailed output about what VACUUM did
```

### 12. Set Statement Timeout for Manual VACUUM
```sql
SET statement_timeout = '1h';
VACUUM VERBOSE large_table;
RESET statement_timeout;
```

## Practice Exercises

### Exercise 1: Monitoring and Analyzing Bloat

```sql
-- Create a high-churn table
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    session_token VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Insert initial data
INSERT INTO user_sessions (user_id, session_token)
SELECT
    (random() * 10000)::INTEGER,
    md5(random()::TEXT)
FROM generate_series(1, 100000);

-- Tasks:
-- 1. Check initial table size and tuple counts
-- 2. Simulate high-churn activity:
--    UPDATE user_sessions SET last_activity = NOW() WHERE id <= 50000;
--    (Run this 10 times)
-- 3. Monitor n_dead_tup growth in pg_stat_user_tables
-- 4. Check table size growth
-- 5. Run VACUUM and observe changes
-- 6. Run VACUUM FULL and compare results
-- 7. Calculate bloat percentage before and after
-- 8. Document when VACUUM FULL would be appropriate vs regular VACUUM
```

### Exercise 2: Autovacuum Tuning

```sql
-- Create three tables with different activity patterns
CREATE TABLE high_activity (
    id SERIAL PRIMARY KEY,
    data TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE medium_activity (
    id SERIAL PRIMARY KEY,
    data TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE low_activity (
    id SERIAL PRIMARY KEY,
    data TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert data into all tables
INSERT INTO high_activity (data)
SELECT 'Data ' || i FROM generate_series(1, 50000) i;

INSERT INTO medium_activity (data)
SELECT 'Data ' || i FROM generate_series(1, 50000) i;

INSERT INTO low_activity (data)
SELECT 'Data ' || i FROM generate_series(1, 50000) i;

-- Tasks:
-- 1. Configure aggressive autovacuum for high_activity table
--    (threshold: 50, scale_factor: 0.05)
-- 2. Configure moderate autovacuum for medium_activity table
--    (threshold: 100, scale_factor: 0.1)
-- 3. Configure relaxed autovacuum for low_activity table
--    (threshold: 200, scale_factor: 0.3)
-- 4. Calculate autovacuum threshold for each table
-- 5. Update enough rows in each table to trigger autovacuum
-- 6. Monitor when autovacuum runs on each table
-- 7. Compare autovacuum frequency and effectiveness
-- 8. Document optimal settings for each activity pattern
```

### Exercise 3: Transaction ID Wraparound Prevention

```sql
-- Create a table for wraparound testing
CREATE TABLE wraparound_test (
    id SERIAL PRIMARY KEY,
    data TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO wraparound_test (data)
SELECT 'Test data ' || i FROM generate_series(1, 100000) i;

-- Tasks:
-- 1. Check current age of table's relfrozenxid
-- 2. Check autovacuum_freeze_max_age setting
-- 3. Calculate how many transactions until wraparound danger
-- 4. Run VACUUM FREEZE on the table
-- 5. Check relfrozenxid age after VACUUM FREEZE
-- 6. Compare age before and after
-- 7. Write query to identify tables at risk (age > 1 billion)
-- 8. Create monitoring query that alerts at 50% of freeze_max_age
-- 9. Document wraparound prevention strategy
```

## Summary

VACUUM and autovacuum are critical for PostgreSQL performance and data integrity. Key takeaways:

- MVCC creates dead tuples that VACUUM must clean up
- Autovacuum runs automatically based on dead tuple thresholds
- Regular VACUUM marks space reusable; VACUUM FULL reclaims it but locks table
- ANALYZE updates statistics for query planner
- Monitor dead tuples, bloat, and autovacuum activity regularly
- Tune autovacuum per-table based on activity patterns
- Keep transactions short to allow effective cleanup
- Transaction ID wraparound requires regular VACUUM to prevent data loss
- Use VACUUM FREEZE before major upgrades
- Supplement autovacuum with manual VACUUM for very active tables

Related topics:
- [EXPLAIN and EXPLAIN ANALYZE](./01-explain-analyze.md)
- [Query Optimization](./02-query-optimization.md)
- [Configuration Tuning](./05-configuration-tuning.md)
