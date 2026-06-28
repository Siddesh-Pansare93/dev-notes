# Configuration Tuning

## Theory

PostgreSQL's default configuration is intentionally conservative to work on minimal hardware. For production systems with adequate resources, tuning configuration parameters can dramatically improve performance. Understanding what each parameter does and how to tune it for your workload is essential for optimal database performance.

### Key Concepts

**postgresql.conf**: The main configuration file where most parameters are set. Typically located in the data directory or /etc/postgresql/.

**Memory Architecture**: PostgreSQL uses multiple memory areas:
- **Shared Buffers**: Shared memory for caching data pages
- **Work Memory**: Per-operation memory for sorts, hashes, and temp tables
- **Maintenance Work Memory**: Memory for VACUUM, CREATE INDEX, etc.
- **WAL Buffers**: Buffer for Write-Ahead Log before flushing to disk
- **OS Cache**: Operating system's file cache (outside PostgreSQL)

**Configuration Categories**:
1. **Memory Settings**: Control memory allocation
2. **WAL Settings**: Write-Ahead Log configuration
3. **Checkpoint Settings**: When and how to checkpoint
4. **Query Planner Settings**: Influence query optimization
5. **Logging Settings**: What and how to log
6. **Connection Settings**: Connection limits and authentication

**Parameter Contexts**:
- **postmaster**: Requires server restart
- **sighup**: Reloadable with `pg_reload_conf()` or SIGHUP
- **superuser**: Superuser can change in session
- **user**: Any user can change in session

**ALTER SYSTEM**: Command to modify configuration persistently without editing files (writes to postgresql.auto.conf).

**pg_reload_conf()**: Function to reload configuration without restart (for SIGHUP parameters).

### Why Configuration Tuning Matters

- **Performance**: Proper memory allocation improves query speed
- **Stability**: Prevents OOM kills and crashes
- **Resource Utilization**: Maximizes use of available hardware
- **Workload Optimization**: Different workloads need different settings
- **Scalability**: Supports more concurrent connections and larger datasets

### Common Tuning Scenarios

**OLTP (Online Transaction Processing)**:
- Many small transactions
- Focus: Connection handling, shared buffers, checkpoint frequency
- Typical: Lower work_mem, more connections

**OLAP (Online Analytical Processing)**:
- Large analytical queries
- Focus: Work memory, maintenance memory, parallel workers
- Typical: Higher work_mem, fewer connections

**Mixed Workload**:
- Balance between OLTP and OLAP
- Focus: Resource limits, connection pooling
- Typical: Moderate settings with query-specific tuning

## Syntax

### Viewing Configuration

```sql
-- Show all settings
SHOW ALL;

-- Show specific setting
SHOW shared_buffers;
SHOW max_connections;

-- View settings with details
SELECT name, setting, unit, context, short_desc
FROM pg_settings
WHERE name = 'shared_buffers';

-- Search for settings
SELECT name, setting, unit
FROM pg_settings
WHERE name LIKE '%mem%';

-- Show settings requiring restart
SELECT name, setting, context
FROM pg_settings
WHERE context = 'postmaster';

-- Show current configuration file location
SHOW config_file;

-- Show data directory
SHOW data_directory;
```

### Modifying Configuration

```sql
-- Session-level change (temporary)
SET work_mem = '256MB';
SET enable_seqscan = off;
RESET work_mem;
RESET ALL;

-- Transaction-level change
BEGIN;
SET LOCAL work_mem = '512MB';
-- Setting applies only in this transaction
COMMIT;

-- ALTER SYSTEM (writes to postgresql.auto.conf)
ALTER SYSTEM SET shared_buffers = '4GB';
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET work_mem = '64MB';

-- Reset ALTER SYSTEM setting
ALTER SYSTEM RESET shared_buffers;

-- Reload configuration (for SIGHUP parameters)
SELECT pg_reload_conf();

-- Or from command line:
-- pg_ctl reload
-- or: sudo systemctl reload postgresql
```

### Key Parameters

```conf
# Memory Settings
shared_buffers = 4GB              # 25% of RAM (requires restart)
effective_cache_size = 12GB       # 50-75% of RAM (planner hint only)
work_mem = 64MB                   # Per-operation memory
maintenance_work_mem = 1GB        # For VACUUM, CREATE INDEX
temp_buffers = 32MB               # Per-session temp table buffers

# WAL Settings
wal_buffers = 16MB                # Usually auto-tuned
min_wal_size = 2GB                # Minimum WAL size
max_wal_size = 8GB                # Maximum before checkpoint

# Checkpoint Settings
checkpoint_timeout = 15min        # Time between checkpoints
checkpoint_completion_target = 0.9 # Fraction of interval to spread checkpoint
checkpoint_warning = 30s          # Warn if checkpoints too frequent

# Query Planner Settings
random_page_cost = 1.1            # Cost of random page (SSD: 1.1, HDD: 4.0)
effective_io_concurrency = 200    # Concurrent I/O operations (SSD)
default_statistics_target = 100   # Statistics detail level

# Parallel Query Settings
max_worker_processes = 8          # Maximum background processes
max_parallel_workers_per_gather = 4  # Parallel workers per query
max_parallel_workers = 8          # Total parallel workers
parallel_setup_cost = 1000        # Cost of starting parallel workers
parallel_tuple_cost = 0.1         # Cost per tuple in parallel query

# Connection Settings
max_connections = 100             # Maximum connections (requires restart)
superuser_reserved_connections = 3  # Reserved for superuser

# Logging Settings
log_min_duration_statement = 1000 # Log queries > 1 second
log_statement = 'none'            # none, ddl, mod, all
log_line_prefix = '%t [%p]: '     # Log line format
log_checkpoints = on              # Log checkpoint activity
log_connections = off             # Log connections
log_disconnections = off          # Log disconnections
log_lock_waits = on              # Log lock waits

# Autovacuum Settings (covered in 03-vacuum-autovacuum.md)
autovacuum = on
autovacuum_max_workers = 3
autovacuum_naptime = 1min

# Performance Features
huge_pages = try                  # Use huge pages if available
full_page_writes = on             # Write full pages after checkpoint
synchronous_commit = on           # Wait for WAL write (on, remote_write, local, off)
```

## Examples

### Example 1: Basic Configuration Review

```sql
-- Check current memory settings
SELECT
    name,
    setting,
    unit,
    context,
    CASE
        WHEN unit = '8kB' THEN pg_size_pretty((setting::BIGINT * 8192))
        WHEN unit = 'kB' THEN pg_size_pretty((setting::BIGINT * 1024))
        WHEN unit = 'MB' THEN pg_size_pretty((setting::BIGINT * 1024 * 1024))
        ELSE setting || COALESCE(unit, '')
    END as formatted_value
FROM pg_settings
WHERE name IN (
    'shared_buffers',
    'effective_cache_size',
    'work_mem',
    'maintenance_work_mem',
    'wal_buffers',
    'temp_buffers'
)
ORDER BY name;

-- Check which settings require restart
SELECT
    name,
    setting,
    unit,
    context
FROM pg_settings
WHERE context = 'postmaster'
  AND name IN (
    'shared_buffers',
    'max_connections',
    'huge_pages',
    'max_worker_processes'
)
ORDER BY name;
```

### Example 2: Tuning shared_buffers

```sql
-- Check current shared_buffers
SHOW shared_buffers;

-- View shared buffer statistics
SELECT
    setting as shared_buffers_blocks,
    pg_size_pretty((setting::BIGINT * 8192)) as shared_buffers_size
FROM pg_settings
WHERE name = 'shared_buffers';

-- Check buffer hit ratio (should be > 90%)
SELECT
    sum(blks_hit) as buffer_hits,
    sum(blks_read) as disk_reads,
    sum(blks_hit) + sum(blks_read) as total_reads,
    ROUND(
        100.0 * sum(blks_hit) / NULLIF(sum(blks_hit) + sum(blks_read), 0),
        2
    ) as hit_ratio_pct
FROM pg_stat_database;

-- If hit ratio < 90%, consider increasing shared_buffers

-- Recommended: 25% of RAM
-- Example: 16GB RAM -> shared_buffers = 4GB
-- ALTER SYSTEM SET shared_buffers = '4GB';
-- Requires restart!

-- Check system memory
-- On Linux: free -h
-- On Windows: systeminfo | findstr Memory
```

### Example 3: Tuning work_mem

```sql
-- Check current work_mem
SHOW work_mem;

-- Work_mem is per-operation!
-- Total usage can be: work_mem * max_connections * operations_per_query

-- Find queries using temporary files (work_mem too small)
SELECT
    query,
    calls,
    total_time,
    temp_blks_written,
    temp_blks_read,
    pg_size_pretty(temp_blks_written * 8192) as temp_data_written
FROM pg_stat_statements
WHERE temp_blks_written > 0
ORDER BY temp_blks_written DESC
LIMIT 10;

-- If temp_blks_written is high, increase work_mem for specific queries
-- or globally

-- Session-level increase for analytical query
SET work_mem = '512MB';
SELECT large_query...;
RESET work_mem;

-- Global increase (be careful with max_connections!)
-- ALTER SYSTEM SET work_mem = '64MB';
-- SELECT pg_reload_conf();

-- Calculate safe work_mem:
-- work_mem = Total RAM / (max_connections * avg_operations_per_query * 2)
-- Example: 16GB / (100 connections * 3 operations * 2) = 27MB
```

### Example 4: Tuning maintenance_work_mem

```sql
-- Check current setting
SHOW maintenance_work_mem;

-- Maintenance operations: VACUUM, CREATE INDEX, ALTER TABLE

-- Monitor autovacuum memory usage
SELECT
    name,
    setting,
    unit,
    pg_size_pretty((setting::BIGINT * 1024)) as formatted
FROM pg_settings
WHERE name IN ('maintenance_work_mem', 'autovacuum_work_mem');

-- Increase for faster index creation
SET maintenance_work_mem = '2GB';
CREATE INDEX CONCURRENTLY idx_large_table_col ON large_table(col);
RESET maintenance_work_mem;

-- Global setting (1GB is common for servers with 16GB+ RAM)
-- ALTER SYSTEM SET maintenance_work_mem = '1GB';
-- SELECT pg_reload_conf();

-- Test index creation speed
\timing on
SET maintenance_work_mem = '256MB';
CREATE INDEX test_idx_1 ON test_table(col);
DROP INDEX test_idx_1;

SET maintenance_work_mem = '2GB';
CREATE INDEX test_idx_2 ON test_table(col);
DROP INDEX test_idx_2;
\timing off
```

### Example 5: Tuning effective_cache_size

```sql
-- Check current setting
SHOW effective_cache_size;

-- This is a hint to the query planner, not actual memory allocation
-- Set to 50-75% of total RAM

-- Check available system memory
-- The planner uses this to estimate if data fits in cache

-- Recommended: 50% of RAM for dedicated DB server
-- Example: 16GB RAM -> effective_cache_size = 8GB
ALTER SYSTEM SET effective_cache_size = '8GB';
SELECT pg_reload_conf();

-- Test impact on query plans
EXPLAIN (ANALYZE, BUFFERS) SELECT ...;

-- Higher effective_cache_size makes planner prefer index scans
-- because it assumes data is likely cached
```

### Example 6: Checkpoint Tuning

```sql
-- Check current checkpoint settings
SELECT name, setting, unit
FROM pg_settings
WHERE name LIKE 'checkpoint%' OR name LIKE '%wal%'
ORDER BY name;

-- Monitor checkpoint activity
SELECT
    checkpoints_timed,
    checkpoints_req,
    checkpoint_write_time,
    checkpoint_sync_time,
    buffers_checkpoint,
    buffers_clean,
    buffers_backend,
    ROUND(100.0 * checkpoints_req / NULLIF(checkpoints_timed + checkpoints_req, 0), 2) as req_pct
FROM pg_stat_bgwriter;

-- If req_pct > 10%, checkpoints happening too frequently
-- Increase max_wal_size

-- Recommended settings for high-write workload:
ALTER SYSTEM SET max_wal_size = '4GB';
ALTER SYSTEM SET min_wal_size = '1GB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET checkpoint_timeout = '15min';
SELECT pg_reload_conf();

-- Monitor checkpoint warnings in logs
-- If you see "checkpoints are occurring too frequently", increase max_wal_size

-- Enable checkpoint logging
ALTER SYSTEM SET log_checkpoints = on;
SELECT pg_reload_conf();

-- Check PostgreSQL logs for checkpoint info:
-- LOG: checkpoint starting: time
-- LOG: checkpoint complete: wrote X buffers, Y seconds
```

### Example 7: Random Page Cost (SSD vs HDD)

```sql
-- Check current setting
SHOW random_page_cost;
SHOW seq_page_cost;

-- Default random_page_cost = 4.0 (assumes HDD)
-- For SSD, random access is much cheaper

-- For SSD:
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;
SELECT pg_reload_conf();

-- For HDD:
-- random_page_cost = 4.0 (default)
-- effective_io_concurrency = 2

-- Test impact on index usage
CREATE TABLE test_random_cost AS
SELECT generate_series(1, 1000000) as id, md5(random()::text) as data;
CREATE INDEX idx_test_random ON test_random_cost(id);
ANALYZE test_random_cost;

-- High random_page_cost (HDD assumption)
SET random_page_cost = 4.0;
EXPLAIN SELECT * FROM test_random_cost WHERE id < 100000;

-- Low random_page_cost (SSD assumption)
SET random_page_cost = 1.1;
EXPLAIN SELECT * FROM test_random_cost WHERE id < 100000;

-- Compare: SSD setting should prefer index scan more often
```

### Example 8: Parallel Query Settings

```sql
-- Check current parallel settings
SELECT name, setting, unit
FROM pg_settings
WHERE name LIKE '%parallel%' OR name LIKE '%worker%'
ORDER BY name;

-- Enable parallel query for testing
SET max_parallel_workers_per_gather = 4;
SET parallel_setup_cost = 1000;
SET parallel_tuple_cost = 0.1;

-- Test parallel query
EXPLAIN (ANALYZE, BUFFERS)
SELECT COUNT(*) FROM large_table;

-- Look for "Parallel Seq Scan" or "Gather" nodes

-- Recommended settings for 8-core system:
ALTER SYSTEM SET max_worker_processes = 8;
ALTER SYSTEM SET max_parallel_workers = 8;
ALTER SYSTEM SET max_parallel_workers_per_gather = 4;
SELECT pg_reload_conf();

-- For max_worker_processes, requires restart
-- ALTER SYSTEM SET max_worker_processes = 8;
-- Then restart PostgreSQL

-- Disable parallel query for specific query
SET max_parallel_workers_per_gather = 0;
SELECT ...;
RESET max_parallel_workers_per_gather;
```

### Example 9: Logging Configuration

```sql
-- Check current logging settings
SELECT name, setting, unit
FROM pg_settings
WHERE name LIKE 'log%'
ORDER BY name;

-- Configure slow query logging
ALTER SYSTEM SET log_min_duration_statement = 1000;  -- 1 second
ALTER SYSTEM SET log_statement = 'none';
ALTER SYSTEM SET log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h ';
ALTER SYSTEM SET log_checkpoints = on;
ALTER SYSTEM SET log_connections = off;
ALTER SYSTEM SET log_disconnections = off;
ALTER SYSTEM SET log_lock_waits = on;
ALTER SYSTEM SET log_temp_files = 0;  -- Log all temp files
SELECT pg_reload_conf();

-- For detailed logging (development only):
ALTER SYSTEM SET log_statement = 'all';  -- Log all statements
ALTER SYSTEM SET log_duration = on;      -- Log duration of all statements
SELECT pg_reload_conf();

-- View log location
SHOW log_directory;
SHOW log_filename;
SHOW data_directory;

-- On Linux, logs typically in:
-- /var/log/postgresql/postgresql-*.log
-- Or in data_directory/log/
```

### Example 10: Huge Pages

```sql
-- Check huge pages support (Linux)
SHOW huge_pages;

-- Check if huge pages are being used
-- On Linux:
-- cat /proc/meminfo | grep Huge

-- Enable huge pages
ALTER SYSTEM SET huge_pages = 'on';  -- or 'try'
-- Requires restart

-- huge_pages settings:
-- - 'on': Requires huge pages, fails if unavailable
-- - 'try': Uses huge pages if available
-- - 'off': Doesn't use huge pages

-- Configure huge pages on Linux:
-- 1. Calculate required pages:
--    huge_pages_needed = shared_buffers / 2MB
--    Example: 4GB / 2MB = 2048 pages

-- 2. Set in /etc/sysctl.conf:
--    vm.nr_hugepages = 2048

-- 3. Reload sysctl:
--    sudo sysctl -p

-- 4. Restart PostgreSQL

-- Verify huge pages in use:
-- grep -i huge /proc/meminfo
```

### Example 11: Synchronous Commit Levels

```sql
-- Check current setting
SHOW synchronous_commit;

-- Synchronous commit levels:
-- - on: Wait for WAL write to disk (default, safest)
-- - remote_write: Wait for WAL send to replica, not disk write
-- - local: Wait for local WAL write only
-- - off: Don't wait for WAL write (fastest, risk of data loss)

-- For high-throughput, low-criticality data
SET synchronous_commit = off;
INSERT INTO logs SELECT ...;
RESET synchronous_commit;

-- Global setting (use carefully)
-- ALTER SYSTEM SET synchronous_commit = 'local';
-- SELECT pg_reload_conf();

-- Test performance impact
\timing on

SET synchronous_commit = on;
INSERT INTO test_table SELECT generate_series(1, 10000), md5(random()::text);
-- Note time

TRUNCATE test_table;

SET synchronous_commit = off;
INSERT INTO test_table SELECT generate_series(1, 10000), md5(random()::text);
-- Should be faster

\timing off
RESET synchronous_commit;

-- Note: synchronous_commit = off can lose recent transactions
-- if server crashes (up to wal_writer_delay worth of data)
```

### Example 12: Complete Production Configuration

```conf
# postgresql.conf - Production configuration for 16GB RAM, 8-core server, SSD

# CONNECTION
max_connections = 100
superuser_reserved_connections = 3

# MEMORY
shared_buffers = 4GB                    # 25% of RAM
effective_cache_size = 12GB             # 75% of RAM
work_mem = 64MB                         # Tune based on workload
maintenance_work_mem = 1GB              # 1GB for large tables
temp_buffers = 32MB

# WAL
wal_buffers = 16MB
min_wal_size = 2GB
max_wal_size = 8GB
wal_compression = on

# CHECKPOINTS
checkpoint_timeout = 15min
checkpoint_completion_target = 0.9
checkpoint_warning = 30s

# QUERY PLANNER
random_page_cost = 1.1                  # SSD
effective_io_concurrency = 200          # SSD
default_statistics_target = 100

# PARALLEL QUERY
max_worker_processes = 8
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
parallel_setup_cost = 1000
parallel_tuple_cost = 0.1

# LOGGING
log_min_duration_statement = 1000       # Log slow queries (1 sec)
log_checkpoints = on
log_connections = off
log_disconnections = off
log_lock_waits = on
log_temp_files = 0
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a '
log_timezone = 'UTC'

# AUTOVACUUM
autovacuum = on
autovacuum_max_workers = 3
autovacuum_naptime = 1min

# PERFORMANCE
huge_pages = try
synchronous_commit = on
full_page_writes = on

# LOCALE
lc_messages = 'en_US.UTF-8'
lc_monetary = 'en_US.UTF-8'
lc_numeric = 'en_US.UTF-8'
lc_time = 'en_US.UTF-8'
default_text_search_config = 'pg_catalog.english'
```

## Common Mistakes

### 1. Setting shared_buffers Too High
```conf
# Wrong: More than 40% of RAM
shared_buffers = 12GB  # On 16GB system

# Right: 25% of RAM
shared_buffers = 4GB  # On 16GB system
```

### 2. Not Considering work_mem × max_connections
```conf
# Wrong: work_mem too high
work_mem = 1GB
max_connections = 100
# Potential memory: 100GB!

# Right: Conservative work_mem
work_mem = 64MB
max_connections = 100
# Potential memory: 6.4GB (more realistic)
```

### 3. Using HDD Settings on SSD
```conf
# Wrong: Default for SSD
random_page_cost = 4.0  # HDD setting

# Right: Tuned for SSD
random_page_cost = 1.1
effective_io_concurrency = 200
```

### 4. Not Reloading After Changes
```sql
-- Wrong: Change setting but don't reload
ALTER SYSTEM SET work_mem = '128MB';
-- Setting not active!

-- Right: Reload configuration
ALTER SYSTEM SET work_mem = '128MB';
SELECT pg_reload_conf();
```

### 5. Changing postmaster Settings Without Restart
```sql
-- Wrong: These require restart
ALTER SYSTEM SET shared_buffers = '8GB';
SELECT pg_reload_conf();
-- Doesn't take effect!

-- Right: Restart after changing
ALTER SYSTEM SET shared_buffers = '8GB';
-- Then: sudo systemctl restart postgresql
```

### 6. Disabling synchronous_commit Globally
```conf
# Wrong: Dangerous for critical data
synchronous_commit = off  # Risk of data loss

# Right: Use only for specific non-critical workloads
# Keep default 'on', use SET LOCAL for specific transactions
```

### 7. Inadequate Checkpoint Settings
```conf
# Wrong: Too small max_wal_size
max_wal_size = 1GB
# Causes frequent checkpoints on write-heavy workload

# Right: Sized for workload
max_wal_size = 4GB  # or higher for heavy writes
```

## Best Practices

### 1. Start with Conservative Settings
Begin with recommended defaults and adjust based on monitoring.

### 2. Use ALTER SYSTEM
Prefer ALTER SYSTEM over manual file editing for easier management.

```sql
ALTER SYSTEM SET parameter = value;
SELECT pg_reload_conf();
```

### 3. Monitor Before Tuning
Establish baselines before making changes:
- Buffer hit ratio
- Checkpoint frequency
- Temporary file usage
- Query performance

### 4. Document Changes
Keep a change log of configuration modifications and reasons.

### 5. Test in Non-Production First
Always test configuration changes in staging before production.

### 6. Follow Memory Guidelines
- shared_buffers: 25% of RAM (up to 40% max)
- effective_cache_size: 50-75% of RAM
- work_mem: Total RAM / (max_connections × avg_ops × 2)
- maintenance_work_mem: 1-2GB (more for very large tables)

### 7. Tune for Storage Type
SSD vs HDD requires different settings:

```conf
# SSD
random_page_cost = 1.1
effective_io_concurrency = 200

# HDD
random_page_cost = 4.0
effective_io_concurrency = 2
```

### 8. Enable Useful Logging
```conf
log_min_duration_statement = 1000  # Slow queries
log_checkpoints = on
log_lock_waits = on
log_temp_files = 0
```

### 9. Set Appropriate Timeouts
```conf
statement_timeout = 0  # Or reasonable limit
idle_in_transaction_session_timeout = 300000  # 5 minutes
```

### 10. Use Connection Pooling
Don't increase max_connections excessively; use connection pooling instead.

### 11. Regular Configuration Reviews
Periodically review configuration as workload changes.

### 12. Backup Configuration Files
```bash
# Before making changes
cp postgresql.conf postgresql.conf.backup
cp postgresql.auto.conf postgresql.auto.conf.backup
```

## Practice Exercises

### Exercise 1: Memory Configuration Analysis

```sql
-- Create monitoring script to analyze current memory configuration

-- Task 1: Write query showing all memory settings with formatted sizes
-- Include: shared_buffers, effective_cache_size, work_mem,
--          maintenance_work_mem, wal_buffers, temp_buffers

-- Task 2: Calculate potential maximum memory usage
-- Formula: (shared_buffers + (max_connections × (work_mem + temp_buffers)))

-- Task 3: Compare to system RAM and identify risks
-- Flag if potential usage > 80% of RAM

-- Task 4: Check buffer cache hit ratio
-- Query pg_stat_database for buffer hits vs reads
-- Calculate percentage, flag if < 90%

-- Task 5: Check for temporary file usage
-- Query pg_stat_database for temp_bytes
-- If high, recommend increasing work_mem

-- Task 6: Provide recommendations
-- Based on findings, suggest optimal settings for current workload

-- Sample query framework:
SELECT
    'shared_buffers' as parameter,
    setting as current_value,
    unit,
    -- Add calculations and recommendations
FROM pg_settings
WHERE name = 'shared_buffers';
```

### Exercise 2: Checkpoint Tuning

```sql
-- Analyze and optimize checkpoint configuration

-- Task 1: Baseline checkpoint statistics
-- Query pg_stat_bgwriter for checkpoint counts and timing

-- Task 2: Calculate checkpoint frequency
-- checkpoints_req / (checkpoints_timed + checkpoints_req)
-- Target: < 10% requested checkpoints

-- Task 3: Enable checkpoint logging
ALTER SYSTEM SET log_checkpoints = on;
SELECT pg_reload_conf();

-- Task 4: Run write-heavy workload
CREATE TABLE checkpoint_test (id SERIAL, data TEXT);
INSERT INTO checkpoint_test (data)
SELECT md5(random()::text) FROM generate_series(1, 1000000);
UPDATE checkpoint_test SET data = md5(random()::text);

-- Task 5: Check logs for checkpoint warnings
-- Look for "checkpoints are occurring too frequently"

-- Task 6: Adjust max_wal_size if needed
-- Increase in increments of 1GB
-- Rerun workload and compare checkpoint frequency

-- Task 7: Monitor checkpoint I/O
-- Check checkpoint_write_time and checkpoint_sync_time
-- If high, adjust checkpoint_completion_target

-- Task 8: Document optimal settings
-- Record final max_wal_size, min_wal_size, checkpoint_timeout
-- Include reasoning and performance metrics
```

### Exercise 3: Complete Performance Tuning

```sql
-- Comprehensive tuning exercise for a sample workload

-- Setup: Create test database
CREATE DATABASE tuning_test;
\c tuning_test

CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    country VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    order_date DATE,
    total_amount DECIMAL(10,2),
    status VARCHAR(20)
);

-- Insert sample data
INSERT INTO customers (name, email, country)
SELECT
    'Customer ' || i,
    'customer' || i || '@example.com',
    CASE (i % 5)
        WHEN 0 THEN 'USA'
        WHEN 1 THEN 'Canada'
        WHEN 2 THEN 'UK'
        WHEN 3 THEN 'Germany'
        ELSE 'France'
    END
FROM generate_series(1, 100000) i;

INSERT INTO orders (customer_id, order_date, total_amount, status)
SELECT
    (random() * 100000)::INTEGER + 1,
    '2020-01-01'::date + (random() * 1460)::INTEGER,
    (random() * 1000)::DECIMAL(10,2),
    CASE (random() * 2)::INTEGER
        WHEN 0 THEN 'completed'
        ELSE 'pending'
    END
FROM generate_series(1, 1000000) i;

-- Tasks:
-- 1. Baseline performance measurement
--    - Run EXPLAIN ANALYZE on complex queries
--    - Measure buffer hit ratio
--    - Check temporary file usage
--    - Measure checkpoint frequency
--    - Record baseline metrics

-- 2. Identify bottlenecks
--    - Low buffer hit ratio -> increase shared_buffers
--    - Temp file usage -> increase work_mem
--    - Frequent checkpoints -> increase max_wal_size
--    - Seq scans on SSD -> adjust random_page_cost

-- 3. Apply configuration changes
--    - Use ALTER SYSTEM for each identified issue
--    - Document changes and reasoning
--    - Reload or restart as needed

-- 4. Re-measure performance
--    - Run same queries with EXPLAIN ANALYZE
--    - Compare execution times
--    - Verify bottlenecks resolved

-- 5. Fine-tune based on results
--    - Iterate on settings
--    - Find optimal balance
--    - Document final configuration

-- 6. Create performance report
--    - Before/after metrics
--    - Configuration changes made
--    - Performance improvement percentage
--    - Recommendations for production
```

## Summary

PostgreSQL configuration tuning is essential for production performance. Key takeaways:

- Default configuration is conservative; tune for your hardware and workload
- shared_buffers: 25% of RAM (max 40%)
- effective_cache_size: 50-75% of RAM (planner hint only)
- work_mem: Per-operation; total = work_mem × max_connections × operations
- maintenance_work_mem: 1-2GB for maintenance operations
- max_wal_size and checkpoint settings: Tune based on write workload
- random_page_cost: 1.1 for SSD, 4.0 for HDD
- Enable appropriate logging for troubleshooting
- Use ALTER SYSTEM for persistent changes
- Reload with pg_reload_conf() for SIGHUP parameters
- Restart required for postmaster parameters (shared_buffers, max_connections, etc.)
- Monitor before and after tuning to validate improvements
- Document all changes and reasoning

Related topics:
- [EXPLAIN and EXPLAIN ANALYZE](./01-explain-analyze.md)
- [Query Optimization](./02-query-optimization.md)
- [VACUUM and Autovacuum](./03-vacuum-autovacuum.md)
- [Connection Pooling](./04-connection-pooling.md)
