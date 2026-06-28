# Partition Management

## Table of Contents
- [Theory](#theory)
- [Syntax](#syntax)
- [Examples](#examples)
- [Common Mistakes](#common-mistakes)
- [Best Practices](#best-practices)
- [Practice Exercises](#practice-exercises)

## Theory

### Partition Lifecycle Management

Managing partitioned tables involves operations beyond initial creation:

- **Attaching and Detaching Partitions**: Adding or removing partitions from a partitioned table
- **Default Partitions**: Catch-all partitions for data that doesn't match other partitions
- **Sub-partitioning**: Creating multi-level partition hierarchies
- **Automated Partition Creation**: Strategies for automatically creating partitions as needed
- **Data Lifecycle**: Archiving or dropping old partitions for data retention policies
- **Moving Data**: Transferring data between partitions or tables
- **Partition-wise Operations**: Enabling parallel operations across partitions

### ATTACH PARTITION

The ATTACH PARTITION command adds an existing table as a partition to a partitioned table. This is useful for:

- Adding pre-populated data to a partitioned table
- Converting existing tables to partitions
- Loading historical data efficiently
- Performing bulk operations on data before attaching

When attaching, PostgreSQL validates that all rows in the table satisfy the partition constraint. This validation can be skipped (and performed later) for faster attachment.

### DETACH PARTITION

The DETACH PARTITION command removes a partition from a partitioned table, converting it to a standalone table. Benefits include:

- **Archiving old data**: Detach and move to archive storage
- **Data migration**: Move data to different table structures
- **Performance**: Remove partitions from queries without deleting data
- **CONCURRENTLY (PostgreSQL 14+)**: Allows detaching without blocking concurrent queries

### Default Partitions

A default partition stores rows that don't match any other partition. This:

- Prevents insert failures for unexpected values
- Acts as a safety net during partition transitions
- Can be queried to find data needing proper classification
- Has performance implications (always scanned unless explicitly excluded)

### Sub-partitioning (Multi-level Partitioning)

Sub-partitioning creates a hierarchy where partitions are themselves partitioned tables. Common patterns:

- **Two-level**: Partition by year, then by month
- **Geographic + Time**: Partition by region, then by date
- **Category + Range**: Partition by type, then by ID range

Sub-partitioning provides finer data organization but increases complexity.

### Automatic Partition Creation

PostgreSQL doesn't natively create partitions automatically, but strategies include:

- **Scheduled scripts**: Cron jobs or scheduled tasks that create upcoming partitions
- **Triggers/Functions**: Application-level logic to create partitions on demand
- **Extensions**: pg_partman extension for automated partition management
- **Application logic**: Create partitions at application startup or deployment

### Partition-wise Join and Aggregation

Partition-wise operations allow PostgreSQL to process each partition independently and in parallel:

- **enable_partitionwise_join**: Join corresponding partitions separately
- **enable_partitionwise_aggregate**: Aggregate each partition independently
- Improves parallelism and performance for large partitioned tables
- Requires matching partition schemes on joined tables

## Syntax

### ATTACH PARTITION

```sql
-- Basic attach
ALTER TABLE parent_table
ATTACH PARTITION partition_name FOR VALUES partition_bound_spec;

-- For RANGE partitioning
ALTER TABLE parent_table
ATTACH PARTITION partition_name FOR VALUES FROM (start) TO (end);

-- For LIST partitioning
ALTER TABLE parent_table
ATTACH PARTITION partition_name FOR VALUES IN (value1, value2, ...);

-- For HASH partitioning
ALTER TABLE parent_table
ATTACH PARTITION partition_name FOR VALUES WITH (MODULUS x, REMAINDER y);
```

### DETACH PARTITION

```sql
-- Detach partition (blocks concurrent queries)
ALTER TABLE parent_table
DETACH PARTITION partition_name;

-- Detach concurrently (PostgreSQL 14+, non-blocking)
ALTER TABLE parent_table
DETACH PARTITION partition_name CONCURRENTLY;

-- Finalize a concurrent detach if interrupted
ALTER TABLE parent_table
DETACH PARTITION partition_name FINALIZE;
```

### Default Partition

```sql
-- Create default partition
CREATE TABLE partition_default PARTITION OF parent_table DEFAULT;

-- Or attach existing table as default
ALTER TABLE parent_table
ATTACH PARTITION partition_default DEFAULT;
```

### Sub-partitioning

```sql
-- Create partitioned table
CREATE TABLE parent (...) PARTITION BY RANGE (column1);

-- Create partition that is itself partitioned
CREATE TABLE parent_partition PARTITION OF parent
FOR VALUES FROM (start) TO (end)
PARTITION BY LIST (column2);

-- Create sub-partitions
CREATE TABLE parent_partition_sub1 PARTITION OF parent_partition
FOR VALUES IN (value1, value2);
```

### Partition-wise Settings

```sql
-- Enable partition-wise join
SET enable_partitionwise_join = on;

-- Enable partition-wise aggregation
SET enable_partitionwise_aggregate = on;
```

## Examples

### Example 1: Attaching a Pre-loaded Partition

```sql
-- Create partitioned sales table
CREATE TABLE sales (
    sale_id BIGSERIAL,
    sale_date DATE NOT NULL,
    amount NUMERIC(10, 2),
    customer_id INTEGER
) PARTITION BY RANGE (sale_date);

-- Create existing partitions
CREATE TABLE sales_2024_01 PARTITION OF sales
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Create standalone table with February data
CREATE TABLE sales_2024_02_temp (
    sale_id BIGSERIAL,
    sale_date DATE NOT NULL,
    amount NUMERIC(10, 2),
    customer_id INTEGER
);

-- Load data into temporary table (fast, no partition overhead)
INSERT INTO sales_2024_02_temp (sale_date, amount, customer_id)
SELECT
    DATE '2024-02-01' + (random() * 27)::INTEGER,
    (random() * 1000)::NUMERIC(10, 2),
    (random() * 1000)::INTEGER
FROM generate_series(1, 100000);

-- Create index before attaching (more efficient)
CREATE INDEX idx_sales_2024_02_temp_date ON sales_2024_02_temp (sale_date);

-- Attach as partition (validates all rows match constraint)
ALTER TABLE sales
ATTACH PARTITION sales_2024_02_temp
FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Rename for consistency
ALTER TABLE sales_2024_02_temp RENAME TO sales_2024_02;

-- Verify data
SELECT COUNT(*) FROM sales WHERE sale_date >= '2024-02-01' AND sale_date < '2024-03-01';

-- Check partition information
SELECT
    parent.relname AS parent_table,
    child.relname AS partition_name,
    pg_get_expr(child.relpartbound, child.oid) AS partition_bounds
FROM pg_inherits
JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
JOIN pg_class child ON pg_inherits.inhrelid = child.oid
WHERE parent.relname = 'sales';
```

### Example 2: Detaching a Partition for Archival

```sql
-- Create partitioned log table
CREATE TABLE application_logs (
    log_id BIGSERIAL,
    log_date DATE NOT NULL,
    log_level VARCHAR(20),
    message TEXT,
    user_id INTEGER
) PARTITION BY RANGE (log_date);

-- Create monthly partitions for 2023 and 2024
CREATE TABLE logs_2023_12 PARTITION OF application_logs
    FOR VALUES FROM ('2023-12-01') TO ('2024-01-01');

CREATE TABLE logs_2024_01 PARTITION OF application_logs
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE logs_2024_02 PARTITION OF application_logs
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Insert sample data
INSERT INTO application_logs (log_date, log_level, message, user_id)
VALUES
    ('2023-12-15', 'INFO', 'User login', 101),
    ('2024-01-10', 'ERROR', 'Connection timeout', 102),
    ('2024-02-05', 'WARN', 'High memory usage', 103);

-- Detach old partition (December 2023) for archival
-- Use CONCURRENTLY to avoid blocking queries (PG 14+)
ALTER TABLE application_logs
DETACH PARTITION logs_2023_12 CONCURRENTLY;

-- After detach completes, the table is standalone
-- Move to archive schema
CREATE SCHEMA IF NOT EXISTS archive;
ALTER TABLE logs_2023_12 SET SCHEMA archive;

-- Optional: Compress archived data
-- CREATE TABLE archive.logs_2023_12_compressed AS
-- SELECT * FROM archive.logs_2023_12;
-- DROP TABLE archive.logs_2023_12;

-- Verify partition is detached
SELECT COUNT(*) FROM application_logs WHERE log_date >= '2023-12-01' AND log_date < '2024-01-01';
-- Returns 0, data is in archive.logs_2023_12

SELECT COUNT(*) FROM archive.logs_2023_12;
-- Returns 1
```

### Example 3: Default Partition

```sql
-- Create orders table partitioned by status
CREATE TABLE orders (
    order_id BIGSERIAL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL,
    customer_id INTEGER,
    amount NUMERIC(10, 2)
) PARTITION BY LIST (status);

-- Create specific status partitions
CREATE TABLE orders_pending PARTITION OF orders
    FOR VALUES IN ('pending', 'processing');

CREATE TABLE orders_completed PARTITION OF orders
    FOR VALUES IN ('completed', 'shipped');

CREATE TABLE orders_cancelled PARTITION OF orders
    FOR VALUES IN ('cancelled', 'refunded');

-- Create default partition for any other status
CREATE TABLE orders_other PARTITION OF orders DEFAULT;

-- Insert data with various statuses
INSERT INTO orders (status, customer_id, amount)
VALUES
    ('pending', 101, 500.00),
    ('completed', 102, 750.00),
    ('on_hold', 103, 300.00),        -- Goes to default partition
    ('pending_approval', 104, 450.00); -- Goes to default partition

-- Query default partition to find unexpected statuses
SELECT status, COUNT(*), SUM(amount)
FROM orders_other
GROUP BY status;

-- Once we know about new statuses, create proper partitions
CREATE TABLE orders_on_hold PARTITION OF orders
    FOR VALUES IN ('on_hold', 'pending_approval');

-- Move data from default to new partition
-- First, we need to detach default partition
ALTER TABLE orders DETACH PARTITION orders_other;

-- Move data to proper partition
INSERT INTO orders SELECT * FROM orders_other WHERE status IN ('on_hold', 'pending_approval');
DELETE FROM orders_other WHERE status IN ('on_hold', 'pending_approval');

-- Re-attach default partition
ALTER TABLE orders ATTACH PARTITION orders_other DEFAULT;
```

### Example 4: Sub-partitioning (Two-level Partitioning)

```sql
-- Create table partitioned by year, then by month
CREATE TABLE sensor_data (
    sensor_id INTEGER NOT NULL,
    reading_time TIMESTAMP NOT NULL,
    temperature NUMERIC(5, 2),
    humidity NUMERIC(5, 2),
    location VARCHAR(100)
) PARTITION BY RANGE (reading_time);

-- Create 2024 partition, sub-partitioned by month
CREATE TABLE sensor_data_2024 PARTITION OF sensor_data
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01')
    PARTITION BY RANGE (reading_time);

-- Create monthly sub-partitions for 2024
CREATE TABLE sensor_data_2024_q1 PARTITION OF sensor_data_2024
    FOR VALUES FROM ('2024-01-01') TO ('2024-04-01')
    PARTITION BY RANGE (reading_time);

-- Create monthly partitions within Q1
CREATE TABLE sensor_data_2024_01 PARTITION OF sensor_data_2024_q1
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE sensor_data_2024_02 PARTITION OF sensor_data_2024_q1
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

CREATE TABLE sensor_data_2024_03 PARTITION OF sensor_data_2024_q1
    FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');

-- Create Q2 with monthly partitions
CREATE TABLE sensor_data_2024_q2 PARTITION OF sensor_data_2024
    FOR VALUES FROM ('2024-04-01') TO ('2024-07-01')
    PARTITION BY RANGE (reading_time);

CREATE TABLE sensor_data_2024_04 PARTITION OF sensor_data_2024_q2
    FOR VALUES FROM ('2024-04-01') TO ('2024-05-01');

CREATE TABLE sensor_data_2024_05 PARTITION OF sensor_data_2024_q2
    FOR VALUES FROM ('2024-05-01') TO ('2024-06-01');

CREATE TABLE sensor_data_2024_06 PARTITION OF sensor_data_2024_q2
    FOR VALUES FROM ('2024-06-01') TO ('2024-07-01');

-- Insert test data
INSERT INTO sensor_data (sensor_id, reading_time, temperature, humidity, location)
VALUES
    (1, '2024-01-15 10:00:00', 22.5, 65.0, 'Building A'),
    (2, '2024-02-20 14:30:00', 21.0, 70.0, 'Building B'),
    (3, '2024-05-10 09:15:00', 24.5, 60.0, 'Building C');

-- Query with partition pruning across sub-partitions
EXPLAIN SELECT * FROM sensor_data
WHERE reading_time >= '2024-02-01' AND reading_time < '2024-03-01';

-- View partition hierarchy
WITH RECURSIVE partition_tree AS (
    SELECT c.oid, c.relname, 0 AS level, c.relname::TEXT AS path
    FROM pg_class c
    WHERE c.relname = 'sensor_data'

    UNION ALL

    SELECT c.oid, c.relname, pt.level + 1, pt.path || ' -> ' || c.relname
    FROM partition_tree pt
    JOIN pg_inherits i ON i.inhparent = pt.oid
    JOIN pg_class c ON c.oid = i.inhrelid
)
SELECT
    REPEAT('  ', level) || relname AS partition_hierarchy,
    level
FROM partition_tree
ORDER BY path;
```

### Example 5: Automated Partition Creation with Function

```sql
-- Create partitioned table for daily logs
CREATE TABLE daily_logs (
    log_id BIGSERIAL,
    log_timestamp TIMESTAMP NOT NULL,
    log_level VARCHAR(20),
    message TEXT
) PARTITION BY RANGE (log_timestamp);

-- Function to create daily partitions for a given month
CREATE OR REPLACE FUNCTION create_daily_partitions(
    target_year INTEGER,
    target_month INTEGER
) RETURNS INTEGER AS $$
DECLARE
    partition_date DATE;
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
    partitions_created INTEGER := 0;
BEGIN
    -- First day of the month
    partition_date := make_date(target_year, target_month, 1);

    -- Loop through each day of the month
    WHILE EXTRACT(MONTH FROM partition_date) = target_month LOOP
        -- Generate partition name
        partition_name := 'daily_logs_' || to_char(partition_date, 'YYYY_MM_DD');

        -- Define partition bounds
        start_date := partition_date;
        end_date := partition_date + INTERVAL '1 day';

        -- Check if partition already exists
        IF NOT EXISTS (
            SELECT 1 FROM pg_class WHERE relname = partition_name
        ) THEN
            -- Create partition
            EXECUTE format(
                'CREATE TABLE %I PARTITION OF daily_logs FOR VALUES FROM (%L) TO (%L)',
                partition_name,
                start_date,
                end_date
            );

            partitions_created := partitions_created + 1;
        END IF;

        -- Next day
        partition_date := partition_date + INTERVAL '1 day';
    END LOOP;

    RETURN partitions_created;
END;
$$ LANGUAGE plpgsql;

-- Create partitions for January 2024
SELECT create_daily_partitions(2024, 1);

-- Create partitions for next 3 months
DO $$
DECLARE
    current_month DATE := DATE_TRUNC('month', CURRENT_DATE);
    i INTEGER;
BEGIN
    FOR i IN 0..2 LOOP
        PERFORM create_daily_partitions(
            EXTRACT(YEAR FROM current_month + (i || ' months')::INTERVAL)::INTEGER,
            EXTRACT(MONTH FROM current_month + (i || ' months')::INTERVAL)::INTEGER
        );
    END LOOP;
END $$;

-- Insert test data
INSERT INTO daily_logs (log_timestamp, log_level, message)
VALUES
    ('2024-01-15 10:30:00', 'INFO', 'Application started'),
    ('2024-01-15 14:45:00', 'ERROR', 'Database connection failed');

-- Verify partitions created
SELECT tablename
FROM pg_tables
WHERE tablename LIKE 'daily_logs_2024_01%'
ORDER BY tablename;
```

### Example 6: Moving Data Between Partitions

```sql
-- Create customer table partitioned by status
CREATE TABLE customers (
    customer_id BIGSERIAL,
    name VARCHAR(100),
    status VARCHAR(20) NOT NULL,
    signup_date DATE,
    last_order_date DATE
) PARTITION BY LIST (status);

-- Create partitions
CREATE TABLE customers_active PARTITION OF customers
    FOR VALUES IN ('active');

CREATE TABLE customers_inactive PARTITION OF customers
    FOR VALUES IN ('inactive');

CREATE TABLE customers_churned PARTITION OF customers
    FOR VALUES IN ('churned');

-- Insert test data
INSERT INTO customers (name, status, signup_date, last_order_date)
VALUES
    ('Alice', 'active', '2023-01-15', '2024-02-01'),
    ('Bob', 'active', '2023-03-20', '2023-12-15'),
    ('Charlie', 'inactive', '2022-06-10', '2023-06-01');

-- Identify customers to move (active but no orders in 90 days)
WITH customers_to_move AS (
    SELECT customer_id, name, signup_date, last_order_date
    FROM customers_active
    WHERE last_order_date < CURRENT_DATE - INTERVAL '90 days'
)
SELECT * FROM customers_to_move;

-- Move customers from active to inactive
-- Step 1: Detach the source partition to avoid constraint issues
ALTER TABLE customers DETACH PARTITION customers_active;

-- Step 2: Update status in detached table
UPDATE customers_active
SET status = 'inactive'
WHERE last_order_date < CURRENT_DATE - INTERVAL '90 days';

-- Step 3: Move updated rows to inactive partition
INSERT INTO customers_inactive
SELECT * FROM customers_active WHERE status = 'inactive';

-- Step 4: Delete moved rows from source
DELETE FROM customers_active WHERE status = 'inactive';

-- Step 5: Re-attach the partition
ALTER TABLE customers ATTACH PARTITION customers_active
    FOR VALUES IN ('active');

-- Verify the move
SELECT status, COUNT(*) FROM customers GROUP BY status;
```

### Example 7: Partition-wise Join and Aggregation

```sql
-- Create sales table partitioned by year
CREATE TABLE sales_by_year (
    sale_id BIGSERIAL,
    sale_date DATE NOT NULL,
    product_id INTEGER,
    amount NUMERIC(10, 2)
) PARTITION BY RANGE (sale_date);

CREATE TABLE sales_2023 PARTITION OF sales_by_year
    FOR VALUES FROM ('2023-01-01') TO ('2024-01-01');

CREATE TABLE sales_2024 PARTITION OF sales_by_year
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- Create returns table with matching partition scheme
CREATE TABLE returns_by_year (
    return_id BIGSERIAL,
    return_date DATE NOT NULL,
    sale_id BIGINT,
    refund_amount NUMERIC(10, 2)
) PARTITION BY RANGE (return_date);

CREATE TABLE returns_2023 PARTITION OF returns_by_year
    FOR VALUES FROM ('2023-01-01') TO ('2024-01-01');

CREATE TABLE returns_2024 PARTITION OF returns_by_year
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- Insert sample data
INSERT INTO sales_by_year (sale_date, product_id, amount)
SELECT
    DATE '2023-01-01' + (random() * 730)::INTEGER,
    (random() * 100)::INTEGER,
    (random() * 1000)::NUMERIC(10, 2)
FROM generate_series(1, 10000);

INSERT INTO returns_by_year (return_date, sale_id, refund_amount)
SELECT
    DATE '2023-01-01' + (random() * 730)::INTEGER,
    (random() * 10000)::INTEGER,
    (random() * 500)::NUMERIC(10, 2)
FROM generate_series(1, 1000);

-- Enable partition-wise operations
SET enable_partitionwise_join = on;
SET enable_partitionwise_aggregate = on;

-- Partition-wise join (each year's partitions joined separately)
EXPLAIN (COSTS OFF)
SELECT
    EXTRACT(YEAR FROM s.sale_date) AS year,
    COUNT(*) AS total_sales,
    COUNT(r.return_id) AS total_returns
FROM sales_by_year s
LEFT JOIN returns_by_year r ON s.sale_id = r.sale_id
    AND EXTRACT(YEAR FROM s.sale_date) = EXTRACT(YEAR FROM r.return_date)
GROUP BY EXTRACT(YEAR FROM s.sale_date);

-- Partition-wise aggregation
EXPLAIN (COSTS OFF)
SELECT
    EXTRACT(YEAR FROM sale_date) AS year,
    EXTRACT(MONTH FROM sale_date) AS month,
    COUNT(*) AS sale_count,
    SUM(amount) AS total_amount
FROM sales_by_year
GROUP BY EXTRACT(YEAR FROM sale_date), EXTRACT(MONTH FROM sale_date);
```

### Example 8: Dropping Old Partitions (Data Lifecycle)

```sql
-- Create events table with retention policy
CREATE TABLE events (
    event_id BIGSERIAL,
    event_timestamp TIMESTAMP NOT NULL,
    event_type VARCHAR(50),
    event_data JSONB
) PARTITION BY RANGE (event_timestamp);

-- Create monthly partitions
CREATE TABLE events_2023_10 PARTITION OF events
    FOR VALUES FROM ('2023-10-01') TO ('2023-11-01');

CREATE TABLE events_2023_11 PARTITION OF events
    FOR VALUES FROM ('2023-11-01') TO ('2023-12-01');

CREATE TABLE events_2023_12 PARTITION OF events
    FOR VALUES FROM ('2023-12-01') TO ('2024-01-01');

CREATE TABLE events_2024_01 PARTITION OF events
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE events_2024_02 PARTITION OF events
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Function to drop partitions older than retention period
CREATE OR REPLACE FUNCTION cleanup_old_partitions(
    table_name TEXT,
    retention_days INTEGER
) RETURNS INTEGER AS $$
DECLARE
    partition_record RECORD;
    partitions_dropped INTEGER := 0;
    cutoff_date DATE;
BEGIN
    cutoff_date := CURRENT_DATE - retention_days;

    -- Find partitions to drop
    FOR partition_record IN
        SELECT
            child.relname AS partition_name,
            pg_get_expr(child.relpartbound, child.oid) AS bounds
        FROM pg_inherits
        JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
        JOIN pg_class child ON pg_inherits.inhrelid = child.oid
        WHERE parent.relname = table_name
    LOOP
        -- Extract date from partition bounds (simple heuristic)
        -- In production, use more robust parsing
        IF partition_record.bounds ~ '\d{4}-\d{2}-\d{2}' THEN
            DECLARE
                partition_date DATE;
            BEGIN
                -- Extract first date from bounds
                partition_date := (regexp_match(partition_record.bounds, '(\d{4}-\d{2}-\d{2})'))[1]::DATE;

                IF partition_date < cutoff_date THEN
                    EXECUTE 'DROP TABLE ' || quote_ident(partition_record.partition_name);
                    partitions_dropped := partitions_dropped + 1;
                    RAISE NOTICE 'Dropped partition: %', partition_record.partition_name;
                END IF;
            END;
        END IF;
    END LOOP;

    RETURN partitions_dropped;
END;
$$ LANGUAGE plpgsql;

-- Drop partitions older than 90 days
SELECT cleanup_old_partitions('events', 90);

-- Alternative: Detach before dropping (safer, allows recovery)
CREATE OR REPLACE FUNCTION archive_old_partitions(
    table_name TEXT,
    retention_days INTEGER,
    archive_schema TEXT DEFAULT 'archive'
) RETURNS INTEGER AS $$
DECLARE
    partition_record RECORD;
    partitions_archived INTEGER := 0;
    cutoff_date DATE;
BEGIN
    cutoff_date := CURRENT_DATE - retention_days;

    -- Ensure archive schema exists
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', archive_schema);

    FOR partition_record IN
        SELECT child.relname AS partition_name
        FROM pg_inherits
        JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
        JOIN pg_class child ON pg_inherits.inhrelid = child.oid
        WHERE parent.relname = table_name
    LOOP
        -- Detach partition
        EXECUTE format('ALTER TABLE %I DETACH PARTITION %I',
            table_name, partition_record.partition_name);

        -- Move to archive schema
        EXECUTE format('ALTER TABLE %I SET SCHEMA %I',
            partition_record.partition_name, archive_schema);

        partitions_archived := partitions_archived + 1;
        RAISE NOTICE 'Archived partition: %', partition_record.partition_name;
    END LOOP;

    RETURN partitions_archived;
END;
$$ LANGUAGE plpgsql;
```

## Common Mistakes

### 1. Attaching Partition with Invalid Data

```sql
-- WRONG: Attaching table with data outside partition bounds
CREATE TABLE sales_2024_02_bad (
    sale_id BIGSERIAL,
    sale_date DATE NOT NULL,
    amount NUMERIC(10, 2)
);

INSERT INTO sales_2024_02_bad (sale_date, amount)
VALUES ('2024-03-15', 500.00);  -- Date outside Feb range

-- This will fail
ALTER TABLE sales
ATTACH PARTITION sales_2024_02_bad
FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
-- Error: partition constraint is violated by some row
```

### 2. Detaching Partition Without Concurrent Option

```sql
-- WRONG: Detaching during heavy queries (blocks access)
ALTER TABLE large_table DETACH PARTITION old_partition;
-- This locks the table and blocks all queries

-- CORRECT: Use CONCURRENTLY (PG 14+)
ALTER TABLE large_table DETACH PARTITION old_partition CONCURRENTLY;
```

### 3. Creating Default Partition After Other Partitions

```sql
-- WRONG: Can't attach default partition if data already violates
CREATE TABLE orders_default PARTITION OF orders DEFAULT;
-- If there's existing data that doesn't match any partition,
-- you can't create a default partition

-- CORRECT: Create default partition first or ensure all data is covered
```

### 4. Not Considering Default Partition Performance

```sql
-- WRONG: Default partition scanned for all queries without partition key
SELECT * FROM orders WHERE customer_id = 123;
-- Scans ALL partitions including default

-- CORRECT: Always include partition key in WHERE clause
SELECT * FROM orders WHERE status = 'pending' AND customer_id = 123;
```

### 5. Sub-partitioning Misalignment

```sql
-- WRONG: Sub-partition bounds exceeding parent bounds
CREATE TABLE data_2024 PARTITION OF data
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01')
    PARTITION BY RANGE (event_date);

-- This will fail - goes beyond parent bound
CREATE TABLE data_2024_13 PARTITION OF data_2024
    FOR VALUES FROM ('2024-12-01') TO ('2025-02-01');
```

## Best Practices

### 1. Create Future Partitions Proactively

```sql
-- Automate creation of future partitions
-- Schedule this to run monthly
DO $$
DECLARE
    next_month DATE := DATE_TRUNC('month', CURRENT_DATE + INTERVAL '3 months');
    partition_name TEXT;
BEGIN
    partition_name := 'sales_' || to_char(next_month, 'YYYY_MM');

    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = partition_name) THEN
        EXECUTE format(
            'CREATE TABLE %I PARTITION OF sales FOR VALUES FROM (%L) TO (%L)',
            partition_name,
            next_month,
            next_month + INTERVAL '1 month'
        );
    END IF;
END $$;
```

### 2. Use DETACH CONCURRENTLY for Production

```sql
-- Always use CONCURRENTLY in production environments
ALTER TABLE events DETACH PARTITION events_old CONCURRENTLY;

-- Monitor detach progress
SELECT * FROM pg_stat_progress_detach_partition;
```

### 3. Test Partition Constraints Before Attaching

```sql
-- Validate data before attaching
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_count
    FROM staging_table
    WHERE NOT (column_date >= '2024-02-01' AND column_date < '2024-03-01');

    IF invalid_count > 0 THEN
        RAISE EXCEPTION 'Found % rows outside partition bounds', invalid_count;
    END IF;

    ALTER TABLE main_table
    ATTACH PARTITION staging_table
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
END $$;
```

### 4. Document Partition Maintenance Schedule

```sql
-- Create table to track partition maintenance
CREATE TABLE partition_maintenance_log (
    log_id SERIAL PRIMARY KEY,
    table_name VARCHAR(100),
    operation VARCHAR(50),
    partition_name VARCHAR(100),
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    rows_affected BIGINT,
    notes TEXT
);

-- Log partition operations
INSERT INTO partition_maintenance_log (table_name, operation, partition_name, notes)
VALUES ('sales', 'CREATE', 'sales_2024_03', 'Automated monthly creation');
```

### 5. Monitor Partition Sizes

```sql
-- Create view for partition monitoring
CREATE OR REPLACE VIEW partition_sizes AS
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Regular monitoring query
SELECT * FROM partition_sizes WHERE tablename LIKE 'sales_%';
```

### 6. Use Appropriate Partition-wise Settings

```sql
-- For systems with matching partition schemes
ALTER SYSTEM SET enable_partitionwise_join = on;
ALTER SYSTEM SET enable_partitionwise_aggregate = on;

-- Reload configuration
SELECT pg_reload_conf();

-- Or set per session for testing
SET enable_partitionwise_join = on;
```

## Practice Exercises

### Exercise 1: Complete Partition Lifecycle Management

Implement a complete partition lifecycle for a logging system:

1. Create a `system_logs` table partitioned by date
2. Create a function to automatically create next month's partitions
3. Insert sample data spanning multiple months
4. Implement a retention policy that archives partitions older than 90 days
5. Test detaching and re-attaching a partition

**Solution:**

```sql
-- Step 1: Create partitioned table
CREATE TABLE system_logs (
    log_id BIGSERIAL,
    log_timestamp TIMESTAMP NOT NULL,
    log_level VARCHAR(20),
    application VARCHAR(100),
    message TEXT,
    PRIMARY KEY (log_id, log_timestamp)
) PARTITION BY RANGE (log_timestamp);

-- Step 2: Function to create next month's partition
CREATE OR REPLACE FUNCTION create_next_month_partition()
RETURNS TEXT AS $$
DECLARE
    next_month DATE;
    partition_name TEXT;
    month_after DATE;
BEGIN
    -- Get first day of next month
    next_month := DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month');
    month_after := next_month + INTERVAL '1 month';

    -- Generate partition name
    partition_name := 'system_logs_' || to_char(next_month, 'YYYY_MM');

    -- Check if partition exists
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = partition_name) THEN
        RETURN 'Partition ' || partition_name || ' already exists';
    END IF;

    -- Create partition
    EXECUTE format(
        'CREATE TABLE %I PARTITION OF system_logs FOR VALUES FROM (%L) TO (%L)',
        partition_name,
        next_month,
        month_after
    );

    -- Create indexes
    EXECUTE format('CREATE INDEX idx_%I_level ON %I (log_level)', partition_name, partition_name);
    EXECUTE format('CREATE INDEX idx_%I_app ON %I (application)', partition_name, partition_name);

    RETURN 'Created partition ' || partition_name;
END;
$$ LANGUAGE plpgsql;

-- Create partitions for current and next 2 months
CREATE TABLE system_logs_2024_01 PARTITION OF system_logs
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE system_logs_2024_02 PARTITION OF system_logs
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

SELECT create_next_month_partition();

-- Step 3: Insert sample data
INSERT INTO system_logs (log_timestamp, log_level, application, message)
SELECT
    TIMESTAMP '2024-01-01 00:00:00' + (random() * INTERVAL '90 days'),
    (ARRAY['INFO', 'WARN', 'ERROR', 'DEBUG'])[floor(random() * 4 + 1)],
    (ARRAY['web', 'api', 'worker', 'scheduler'])[floor(random() * 4 + 1)],
    'Sample log message ' || generate_series
FROM generate_series(1, 10000);

-- Step 4: Implement retention policy
CREATE SCHEMA IF NOT EXISTS archive;

CREATE OR REPLACE FUNCTION archive_old_log_partitions(retention_days INTEGER)
RETURNS TABLE(partition_name TEXT, action TEXT) AS $$
DECLARE
    partition_rec RECORD;
    cutoff_date DATE;
    partition_month DATE;
BEGIN
    cutoff_date := CURRENT_DATE - retention_days;

    FOR partition_rec IN
        SELECT
            c.relname AS pname,
            pg_get_expr(c.relpartbound, c.oid) AS bounds
        FROM pg_inherits i
        JOIN pg_class parent ON i.inhparent = parent.oid
        JOIN pg_class c ON i.inhrelid = c.oid
        WHERE parent.relname = 'system_logs'
    LOOP
        -- Extract partition month from name
        IF partition_rec.pname ~ 'system_logs_\d{4}_\d{2}' THEN
            partition_month := to_date(
                regexp_replace(partition_rec.pname, 'system_logs_(\d{4})_(\d{2})', '\1-\2-01'),
                'YYYY-MM-DD'
            );

            IF partition_month < cutoff_date THEN
                -- Detach partition
                EXECUTE format('ALTER TABLE system_logs DETACH PARTITION %I CONCURRENTLY',
                    partition_rec.pname);

                -- Move to archive schema
                EXECUTE format('ALTER TABLE %I SET SCHEMA archive', partition_rec.pname);

                partition_name := partition_rec.pname;
                action := 'Archived to archive schema';
                RETURN NEXT;
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run retention policy (archive partitions older than 90 days)
SELECT * FROM archive_old_log_partitions(90);

-- Step 5: Test detach and re-attach
-- Detach February partition
ALTER TABLE system_logs DETACH PARTITION system_logs_2024_02 CONCURRENTLY;

-- Verify it's detached
SELECT COUNT(*) FROM system_logs WHERE log_timestamp >= '2024-02-01' AND log_timestamp < '2024-03-01';
-- Returns 0

-- Re-attach
ALTER TABLE system_logs ATTACH PARTITION system_logs_2024_02
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Verify re-attached
SELECT COUNT(*) FROM system_logs WHERE log_timestamp >= '2024-02-01' AND log_timestamp < '2024-03-01';
-- Returns actual count
```

### Exercise 2: Sub-partitioned Multi-tenant System

Create a multi-level partitioning scheme for a SaaS application:

1. Create `tenant_data` partitioned by tenant_id (HASH) with 4 partitions
2. Sub-partition each tenant partition by date (RANGE - monthly)
3. Create a function to add monthly sub-partitions for all tenant partitions
4. Insert data and verify distribution
5. Query data with partition pruning verification

**Solution:**

```sql
-- Step 1: Create hash-partitioned table
CREATE TABLE tenant_data (
    id BIGSERIAL,
    tenant_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL,
    data_type VARCHAR(50),
    payload JSONB,
    PRIMARY KEY (id, tenant_id, created_at)
) PARTITION BY HASH (tenant_id);

-- Step 2: Create hash partitions with range sub-partitioning
CREATE TABLE tenant_data_p0 PARTITION OF tenant_data
    FOR VALUES WITH (MODULUS 4, REMAINDER 0)
    PARTITION BY RANGE (created_at);

CREATE TABLE tenant_data_p1 PARTITION OF tenant_data
    FOR VALUES WITH (MODULUS 4, REMAINDER 1)
    PARTITION BY RANGE (created_at);

CREATE TABLE tenant_data_p2 PARTITION OF tenant_data
    FOR VALUES WITH (MODULUS 4, REMAINDER 2)
    PARTITION BY RANGE (created_at);

CREATE TABLE tenant_data_p3 PARTITION OF tenant_data
    FOR VALUES WITH (MODULUS 4, REMAINDER 3)
    PARTITION BY RANGE (created_at);

-- Create initial monthly sub-partitions for 2024
CREATE TABLE tenant_data_p0_2024_01 PARTITION OF tenant_data_p0
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE tenant_data_p1_2024_01 PARTITION OF tenant_data_p1
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE tenant_data_p2_2024_01 PARTITION OF tenant_data_p2
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE tenant_data_p3_2024_01 PARTITION OF tenant_data_p3
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Step 3: Function to add monthly sub-partitions
CREATE OR REPLACE FUNCTION create_tenant_subpartitions(target_month DATE)
RETURNS INTEGER AS $$
DECLARE
    partition_num INTEGER;
    partition_name TEXT;
    subpartition_name TEXT;
    start_date DATE;
    end_date DATE;
    created_count INTEGER := 0;
BEGIN
    start_date := DATE_TRUNC('month', target_month);
    end_date := start_date + INTERVAL '1 month';

    -- Create sub-partition for each hash partition
    FOR partition_num IN 0..3 LOOP
        partition_name := 'tenant_data_p' || partition_num;
        subpartition_name := partition_name || '_' || to_char(start_date, 'YYYY_MM');

        -- Check if sub-partition exists
        IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = subpartition_name) THEN
            EXECUTE format(
                'CREATE TABLE %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
                subpartition_name,
                partition_name,
                start_date,
                end_date
            );
            created_count := created_count + 1;
        END IF;
    END LOOP;

    RETURN created_count;
END;
$$ LANGUAGE plpgsql;

-- Create February partitions
SELECT create_tenant_subpartitions('2024-02-01');

-- Create March partitions
SELECT create_tenant_subpartitions('2024-03-01');

-- Step 4: Insert data and verify distribution
INSERT INTO tenant_data (tenant_id, created_at, data_type, payload)
SELECT
    (random() * 20)::INTEGER AS tenant_id,
    TIMESTAMP '2024-01-01 00:00:00' + (random() * INTERVAL '60 days') AS created_at,
    (ARRAY['order', 'customer', 'product', 'invoice'])[floor(random() * 4 + 1)] AS data_type,
    jsonb_build_object('value', random() * 1000) AS payload
FROM generate_series(1, 1000);

-- Verify distribution across partitions
SELECT
    tableoid::regclass AS partition_name,
    COUNT(*) AS row_count,
    MIN(created_at) AS earliest_date,
    MAX(created_at) AS latest_date
FROM tenant_data
GROUP BY tableoid
ORDER BY partition_name;

-- Step 5: Query with partition pruning
EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM tenant_data
WHERE tenant_id = 5
  AND created_at >= '2024-02-01'
  AND created_at < '2024-03-01';

-- Summary by tenant and month
SELECT
    tenant_id,
    DATE_TRUNC('month', created_at) AS month,
    data_type,
    COUNT(*) AS record_count
FROM tenant_data
WHERE tenant_id IN (1, 2, 3)
  AND created_at >= '2024-01-01'
  AND created_at < '2024-03-01'
GROUP BY tenant_id, DATE_TRUNC('month', created_at), data_type
ORDER BY tenant_id, month, data_type;
```

### Exercise 3: Partition-wise Join Performance

Create two partitioned tables with matching schemes and compare performance:

1. Create `orders` and `order_items` tables partitioned by order_date
2. Insert substantial data
3. Compare join performance with and without partition-wise join
4. Analyze the query plans

**Solution:**

```sql
-- Step 1: Create matching partitioned tables
CREATE TABLE orders (
    order_id BIGSERIAL,
    order_date DATE NOT NULL,
    customer_id INTEGER NOT NULL,
    total_amount NUMERIC(10, 2),
    PRIMARY KEY (order_id, order_date)
) PARTITION BY RANGE (order_date);

CREATE TABLE order_items (
    item_id BIGSERIAL,
    order_id BIGINT NOT NULL,
    order_date DATE NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER,
    price NUMERIC(10, 2),
    PRIMARY KEY (item_id, order_date)
) PARTITION BY RANGE (order_date);

-- Create quarterly partitions for 2024
CREATE TABLE orders_2024_q1 PARTITION OF orders
    FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');

CREATE TABLE orders_2024_q2 PARTITION OF orders
    FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');

CREATE TABLE order_items_2024_q1 PARTITION OF order_items
    FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');

CREATE TABLE order_items_2024_q2 PARTITION OF order_items
    FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');

-- Step 2: Insert substantial data
INSERT INTO orders (order_date, customer_id, total_amount)
SELECT
    DATE '2024-01-01' + (random() * 180)::INTEGER,
    (random() * 1000)::INTEGER,
    (random() * 5000)::NUMERIC(10, 2)
FROM generate_series(1, 50000);

INSERT INTO order_items (order_id, order_date, product_id, quantity, price)
SELECT
    o.order_id,
    o.order_date,
    (random() * 500)::INTEGER,
    (random() * 10 + 1)::INTEGER,
    (random() * 100)::NUMERIC(10, 2)
FROM orders o
CROSS JOIN LATERAL generate_series(1, (random() * 5 + 1)::INTEGER);

-- Create indexes
CREATE INDEX idx_orders_customer ON orders (customer_id);
CREATE INDEX idx_order_items_order ON order_items (order_id);

-- Step 3 & 4: Compare performance

-- Disable partition-wise join
SET enable_partitionwise_join = off;

EXPLAIN (ANALYZE, BUFFERS)
SELECT
    o.order_id,
    o.order_date,
    o.total_amount,
    COUNT(oi.item_id) AS item_count,
    SUM(oi.quantity * oi.price) AS calculated_total
FROM orders o
JOIN order_items oi ON o.order_id = oi.order_id AND o.order_date = oi.order_date
WHERE o.order_date >= '2024-04-01' AND o.order_date < '2024-07-01'
GROUP BY o.order_id, o.order_date, o.total_amount
HAVING COUNT(oi.item_id) > 3;

-- Enable partition-wise join
SET enable_partitionwise_join = on;
SET enable_partitionwise_aggregate = on;

EXPLAIN (ANALYZE, BUFFERS)
SELECT
    o.order_id,
    o.order_date,
    o.total_amount,
    COUNT(oi.item_id) AS item_count,
    SUM(oi.quantity * oi.price) AS calculated_total
FROM orders o
JOIN order_items oi ON o.order_id = oi.order_id AND o.order_date = oi.order_date
WHERE o.order_date >= '2024-04-01' AND o.order_date < '2024-07-01'
GROUP BY o.order_id, o.order_date, o.total_amount
HAVING COUNT(oi.item_id) > 3;

-- Analysis: Check for "Append" nodes in plan showing parallel partition processing
```

---

**Related Topics:**
- [Partition Basics](./01-partition-basics.md)
- [Partition Strategies](./03-partition-strategies.md)
- [Performance Tuning](../08-query-performance/02-query-optimization.md)
- [Maintenance](../09-maintenance/01-vacuum-analyze.md)
