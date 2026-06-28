# Partition Strategies

## Table of Contents
- [Theory](#theory)
- [Syntax](#syntax)
- [Examples](#examples)
- [Common Mistakes](#common-mistakes)
- [Best Practices](#best-practices)
- [Practice Exercises](#practice-exercises)

## Theory

### When to Partition Tables

Partitioning is not always the right solution. Understanding when to partition is critical for database performance and maintainability.

**Indicators for Partitioning:**

1. **Table Size**: Tables exceeding 10-100 GB are candidates
2. **Query Patterns**: Queries frequently filter on specific columns (dates, categories)
3. **Data Lifecycle**: Regular archival or deletion of data ranges
4. **Performance Issues**: Slow queries, index bloat, vacuum problems
5. **Maintenance Windows**: Difficulty completing maintenance operations
6. **Historical Data**: Clear time-based or categorical divisions in data

**When NOT to Partition:**

1. **Small Tables**: Tables under a few GB rarely benefit
2. **Random Access**: Queries without partition key in WHERE clause
3. **Uniform Access**: All data accessed equally frequently
4. **Complex Queries**: Many cross-partition joins
5. **Limited Resources**: Overhead of managing many partitions

### Choosing the Right Partition Key

The partition key is the most critical decision in partition strategy. It should:

- **Align with Query Patterns**: Use columns in WHERE clauses
- **Provide Even Distribution**: Avoid hotspot partitions
- **Support Data Lifecycle**: Enable easy archival/deletion
- **Be Immutable**: Rarely or never updated
- **Be Simple**: Single column preferred over composite keys

**Common Partition Keys:**
- **Timestamps**: created_at, order_date, event_time
- **Geographic**: region, country, timezone
- **Categories**: status, type, department
- **Identifiers**: user_id, tenant_id, account_id

### Time-based Partitioning Strategies

Time-based partitioning is the most common approach, especially for:
- Event logs
- Transaction records
- Time-series data
- Audit trails
- Sensor readings

**Partition Granularity:**

- **Yearly**: Long-term archives, slow-growing data
- **Quarterly**: Moderate growth, quarterly reporting
- **Monthly**: Most common, balanced size and manageability
- **Weekly**: High-volume systems, retail/e-commerce
- **Daily**: Very high-volume, log aggregation, IoT
- **Hourly**: Extreme volumes, real-time analytics

**Selection Criteria:**
- Expected partition size (target 10-100 GB)
- Data retention period
- Query time ranges
- Maintenance overhead tolerance

### Geographic Partitioning

Partitioning by location benefits:
- Multi-region applications
- Compliance requirements (GDPR, data residency)
- Latency optimization with distributed databases
- Regional business reporting

**Approaches:**
- **Country/Region**: Customer data by country
- **Continent**: Global applications with regional focus
- **Timezone**: Time-sensitive data with geographic component
- **Data Center**: Physical distribution alignment

### Tenant-based Partitioning (Multi-tenancy)

For SaaS applications serving multiple customers:

**Benefits:**
- **Isolation**: Separate customer data physically
- **Performance**: Queries only scan relevant tenant partition
- **Backup/Restore**: Per-tenant operations
- **Compliance**: Easier data deletion for GDPR
- **Resource Allocation**: Different storage tiers per tenant

**Considerations:**
- Uneven tenant sizes
- New tenant partition creation
- Cross-tenant reporting queries
- Tenant migration complexity

### Number of Partitions

**Guidelines:**
- **Minimum**: Don't partition unless you have 3+ natural divisions
- **Optimal Range**: 10-100 partitions for most systems
- **Maximum Practical**: 1000-10000 partitions (PostgreSQL can handle more, but complexity grows)
- **Planning**: Account for future growth

**Limits:**
- PostgreSQL has no hard limit on partition count
- More partitions = more overhead (planning, metadata)
- Each partition adds to query planning time
- Operating system file limits may apply

### Partitioning vs Indexes

Partitioning and indexes serve different purposes:

**Partitioning:**
- Divides data physically
- Best for range scans and data lifecycle
- Reduces index size per partition
- Enables partition pruning

**Indexes:**
- Point to specific rows
- Best for selective queries
- Work across all partitions
- Essential for joins and lookups

**Combined Strategy:**
- Partition on lifecycle column (date)
- Index on query columns (customer_id, status)
- Smaller partition indexes = faster scans
- Consider index size vs partition count

### Migration from Non-partitioned to Partitioned

Converting existing tables to partitioned tables requires planning:

**Approaches:**

1. **Create New Table, Copy Data**: Safest, requires downtime or replication
2. **Attach Existing Table as Partition**: Fast, but limited flexibility
3. **Incremental Migration**: Partition new data, keep historical data separate
4. **Logical Replication**: Zero-downtime using publications/subscriptions

**Steps:**
1. Analyze current table structure and data distribution
2. Design partition scheme
3. Create partitioned table structure
4. Plan data migration strategy
5. Migrate application queries
6. Test thoroughly
7. Execute migration
8. Monitor and validate

### Real-world Partitioning Examples

**1. Application Event Logs**
- Partition by day or hour
- Retain 30-90 days
- Drop old partitions daily
- High insert volume, rare updates

**2. E-commerce Orders**
- Partition by order date (monthly)
- Retain all historical data
- Query patterns: recent orders, date ranges
- Join with order_items on matching partition key

**3. Time-series Sensor Data**
- Partition by timestamp (hourly or daily)
- Massive insert volume
- Aggregation queries over time ranges
- Archive old data to cold storage

**4. Multi-tenant SaaS**
- Partition by tenant_id (hash or list)
- Sub-partition by date
- Isolation and performance
- Per-tenant backup/restore

**5. Audit Trails**
- Partition by audit timestamp (monthly)
- Regulatory retention (7 years)
- Write-once, rarely queried
- Archive old partitions to compliance storage

## Syntax

### Analyzing Table for Partitioning Candidates

```sql
-- Check table size
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) -
                   pg_relation_size(schemaname||'.'||tablename)) AS index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Analyze data distribution by potential partition keys
SELECT
    DATE_TRUNC('month', created_at) AS month,
    COUNT(*) AS row_count,
    pg_size_pretty(COUNT(*) * 1000) AS estimated_size  -- Rough estimate
FROM large_table
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month;
```

### Partitioning Configuration Settings

```sql
-- Enable constraint exclusion (partition pruning)
SET constraint_exclusion = partition;  -- or 'on' for all tables

-- Enable partition-wise operations
SET enable_partitionwise_join = on;
SET enable_partitionwise_aggregate = on;

-- Adjust planner settings for partitioned tables
SET max_parallel_workers_per_gather = 4;  -- Parallelism across partitions
```

## Examples

### Example 1: Monthly Time-based Partitioning for Orders

```sql
-- Scenario: E-commerce platform with growing order volume
-- Current: 50GB table, 10M orders, 100K orders/month
-- Strategy: Partition by order_date (monthly)

-- Step 1: Analyze existing data distribution
CREATE TABLE orders_original (
    order_id BIGSERIAL PRIMARY KEY,
    order_date TIMESTAMP NOT NULL,
    customer_id INTEGER NOT NULL,
    status VARCHAR(20),
    total_amount NUMERIC(10, 2)
);

-- Insert sample data
INSERT INTO orders_original (order_date, customer_id, status, total_amount)
SELECT
    TIMESTAMP '2023-01-01 00:00:00' + (random() * INTERVAL '12 months'),
    (random() * 10000)::INTEGER,
    (ARRAY['pending', 'processing', 'shipped', 'delivered', 'cancelled'])[floor(random() * 5 + 1)],
    (random() * 1000)::NUMERIC(10, 2)
FROM generate_series(1, 100000);

-- Analyze distribution
SELECT
    DATE_TRUNC('month', order_date) AS month,
    COUNT(*) AS order_count,
    COUNT(DISTINCT customer_id) AS unique_customers,
    pg_size_pretty(COUNT(*) * 200) AS estimated_size  -- Assuming 200 bytes per row
FROM orders_original
GROUP BY DATE_TRUNC('month', order_date)
ORDER BY month;

-- Step 2: Create partitioned table
CREATE TABLE orders (
    order_id BIGSERIAL,
    order_date TIMESTAMP NOT NULL,
    customer_id INTEGER NOT NULL,
    status VARCHAR(20),
    total_amount NUMERIC(10, 2),
    PRIMARY KEY (order_id, order_date)
) PARTITION BY RANGE (order_date);

-- Step 3: Create historical partitions
DO $$
DECLARE
    start_date DATE := '2023-01-01';
    end_date DATE := '2024-01-01';
    current_date DATE := start_date;
    partition_name TEXT;
BEGIN
    WHILE current_date < end_date LOOP
        partition_name := 'orders_' || to_char(current_date, 'YYYY_MM');

        EXECUTE format(
            'CREATE TABLE %I PARTITION OF orders FOR VALUES FROM (%L) TO (%L)',
            partition_name,
            current_date,
            current_date + INTERVAL '1 month'
        );

        -- Create indexes on each partition
        EXECUTE format('CREATE INDEX idx_%I_customer ON %I (customer_id)', partition_name, partition_name);
        EXECUTE format('CREATE INDEX idx_%I_status ON %I (status)', partition_name, partition_name);

        current_date := current_date + INTERVAL '1 month';
    END LOOP;
END $$;

-- Step 4: Migrate data
INSERT INTO orders SELECT * FROM orders_original;

-- Step 5: Verify and compare performance
-- Original table query
EXPLAIN ANALYZE
SELECT * FROM orders_original
WHERE order_date >= '2023-06-01' AND order_date < '2023-07-01'
  AND customer_id = 5000;

-- Partitioned table query (shows partition pruning)
EXPLAIN ANALYZE
SELECT * FROM orders
WHERE order_date >= '2023-06-01' AND order_date < '2023-07-01'
  AND customer_id = 5000;

-- Drop original table after validation
-- DROP TABLE orders_original;
```

### Example 2: Daily Partitioning for High-Volume Logs

```sql
-- Scenario: Application logging 1M+ events/day
-- Retention: 30 days
-- Strategy: Daily partitions, automatic creation and cleanup

-- Create partitioned log table
CREATE TABLE application_events (
    event_id BIGSERIAL,
    event_timestamp TIMESTAMP NOT NULL,
    event_type VARCHAR(50),
    severity VARCHAR(20),
    user_id INTEGER,
    message TEXT,
    metadata JSONB,
    PRIMARY KEY (event_id, event_timestamp)
) PARTITION BY RANGE (event_timestamp);

-- Function to create daily partition for a specific date
CREATE OR REPLACE FUNCTION create_daily_log_partition(target_date DATE)
RETURNS TEXT AS $$
DECLARE
    partition_name TEXT;
    start_ts TIMESTAMP;
    end_ts TIMESTAMP;
BEGIN
    partition_name := 'application_events_' || to_char(target_date, 'YYYY_MM_DD');
    start_ts := target_date::TIMESTAMP;
    end_ts := (target_date + INTERVAL '1 day')::TIMESTAMP;

    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = partition_name) THEN
        RETURN 'Partition ' || partition_name || ' already exists';
    END IF;

    EXECUTE format(
        'CREATE TABLE %I PARTITION OF application_events FOR VALUES FROM (%L) TO (%L)',
        partition_name, start_ts, end_ts
    );

    -- Create indexes
    EXECUTE format('CREATE INDEX idx_%I_type ON %I (event_type)', partition_name, partition_name);
    EXECUTE format('CREATE INDEX idx_%I_user ON %I (user_id)', partition_name, partition_name);

    RETURN 'Created partition ' || partition_name;
END;
$$ LANGUAGE plpgsql;

-- Function to create partitions for next N days
CREATE OR REPLACE FUNCTION ensure_future_log_partitions(days_ahead INTEGER DEFAULT 7)
RETURNS INTEGER AS $$
DECLARE
    current_day DATE := CURRENT_DATE;
    created_count INTEGER := 0;
    i INTEGER;
BEGIN
    FOR i IN 0..days_ahead LOOP
        IF create_daily_log_partition(current_day + i) LIKE 'Created%' THEN
            created_count := created_count + 1;
        END IF;
    END LOOP;

    RETURN created_count;
END;
$$ LANGUAGE plpgsql;

-- Function to drop partitions older than retention period
CREATE OR REPLACE FUNCTION cleanup_old_log_partitions(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    partition_rec RECORD;
    cutoff_date DATE;
    partition_date DATE;
    dropped_count INTEGER := 0;
BEGIN
    cutoff_date := CURRENT_DATE - retention_days;

    FOR partition_rec IN
        SELECT c.relname
        FROM pg_inherits i
        JOIN pg_class parent ON i.inhparent = parent.oid
        JOIN pg_class c ON i.inhrelid = c.oid
        WHERE parent.relname = 'application_events'
          AND c.relname ~ 'application_events_\d{4}_\d{2}_\d{2}'
    LOOP
        -- Extract date from partition name
        partition_date := to_date(
            regexp_replace(partition_rec.relname, 'application_events_(\d{4})_(\d{2})_(\d{2})', '\1-\2-\3'),
            'YYYY-MM-DD'
        );

        IF partition_date < cutoff_date THEN
            EXECUTE 'DROP TABLE ' || partition_rec.relname;
            dropped_count := dropped_count + 1;
            RAISE NOTICE 'Dropped partition: %', partition_rec.relname;
        END IF;
    END LOOP;

    RETURN dropped_count;
END;
$$ LANGUAGE plpgsql;

-- Initial setup: Create partitions for last 7 days and next 7 days
SELECT ensure_future_log_partitions(7);

DO $$
DECLARE
    i INTEGER;
BEGIN
    FOR i IN 1..7 LOOP
        PERFORM create_daily_log_partition(CURRENT_DATE - i);
    END LOOP;
END $$;

-- Insert sample log data
INSERT INTO application_events (event_timestamp, event_type, severity, user_id, message, metadata)
SELECT
    CURRENT_TIMESTAMP - (random() * INTERVAL '7 days'),
    (ARRAY['login', 'logout', 'api_call', 'error', 'warning'])[floor(random() * 5 + 1)],
    (ARRAY['info', 'warning', 'error', 'critical'])[floor(random() * 4 + 1)],
    (random() * 1000)::INTEGER,
    'Sample event message',
    jsonb_build_object('ip', '192.168.1.' || (random() * 255)::INTEGER)
FROM generate_series(1, 50000);

-- Query with partition pruning (only scans today's partition)
EXPLAIN ANALYZE
SELECT event_type, COUNT(*)
FROM application_events
WHERE event_timestamp >= CURRENT_DATE
  AND event_timestamp < CURRENT_DATE + INTERVAL '1 day'
GROUP BY event_type;

-- Schedule these functions via cron or pg_cron:
-- Daily: SELECT ensure_future_log_partitions(7);
-- Daily: SELECT cleanup_old_log_partitions(30);
```

### Example 3: Multi-tenant Hash Partitioning

```sql
-- Scenario: SaaS platform with 1000+ tenants
-- Even distribution needed, no specific tenant size requirements
-- Strategy: Hash partitioning on tenant_id

-- Create hash-partitioned tenant data table
CREATE TABLE tenant_records (
    record_id BIGSERIAL,
    tenant_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    record_type VARCHAR(50),
    data JSONB,
    PRIMARY KEY (record_id, tenant_id)
) PARTITION BY HASH (tenant_id);

-- Create 16 hash partitions (power of 2 for even distribution)
DO $$
DECLARE
    i INTEGER;
    partition_name TEXT;
BEGIN
    FOR i IN 0..15 LOOP
        partition_name := 'tenant_records_p' || lpad(i::TEXT, 2, '0');

        EXECUTE format(
            'CREATE TABLE %I PARTITION OF tenant_records FOR VALUES WITH (MODULUS 16, REMAINDER %s)',
            partition_name, i
        );

        -- Create indexes on each partition
        EXECUTE format('CREATE INDEX idx_%I_created ON %I (created_at)', partition_name, partition_name);
        EXECUTE format('CREATE INDEX idx_%I_type ON %I (record_type)', partition_name, partition_name);
    END LOOP;
END $$;

-- Insert sample data for multiple tenants
INSERT INTO tenant_records (tenant_id, record_type, data)
SELECT
    (random() * 1000)::INTEGER AS tenant_id,
    (ARRAY['order', 'invoice', 'customer', 'product'])[floor(random() * 4 + 1)],
    jsonb_build_object('value', random() * 1000, 'status', 'active')
FROM generate_series(1, 100000);

-- Verify distribution across partitions
SELECT
    tableoid::regclass AS partition_name,
    COUNT(*) AS record_count,
    COUNT(DISTINCT tenant_id) AS tenant_count,
    MIN(tenant_id) AS min_tenant,
    MAX(tenant_id) AS max_tenant,
    pg_size_pretty(pg_total_relation_size(tableoid)) AS partition_size
FROM tenant_records
GROUP BY tableoid
ORDER BY partition_name;

-- Query for specific tenant (partition pruning works)
EXPLAIN ANALYZE
SELECT record_type, COUNT(*)
FROM tenant_records
WHERE tenant_id = 42
GROUP BY record_type;

-- Analysis: Should show only one partition scanned
```

### Example 4: Geographic List Partitioning

```sql
-- Scenario: Global customer base with regional compliance requirements
-- Strategy: LIST partition by region

-- Create region-partitioned customer table
CREATE TABLE customers (
    customer_id BIGSERIAL,
    email VARCHAR(255) NOT NULL,
    region VARCHAR(50) NOT NULL,
    country VARCHAR(50) NOT NULL,
    signup_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(20),
    data JSONB
) PARTITION BY LIST (region);

-- Create regional partitions
CREATE TABLE customers_north_america PARTITION OF customers
    FOR VALUES IN ('US', 'Canada', 'Mexico');

CREATE TABLE customers_europe PARTITION OF customers
    FOR VALUES IN ('UK', 'Germany', 'France', 'Spain', 'Italy', 'Netherlands');

CREATE TABLE customers_asia_pacific PARTITION OF customers
    FOR VALUES IN ('China', 'Japan', 'Australia', 'India', 'Singapore');

CREATE TABLE customers_latin_america PARTITION OF customers
    FOR VALUES IN ('Brazil', 'Argentina', 'Chile', 'Colombia');

CREATE TABLE customers_other PARTITION OF customers DEFAULT;

-- Create region-specific indexes
CREATE INDEX idx_customers_na_email ON customers_north_america (email);
CREATE INDEX idx_customers_eu_email ON customers_europe (email);
CREATE INDEX idx_customers_ap_email ON customers_asia_pacific (email);
CREATE INDEX idx_customers_la_email ON customers_latin_america (email);

-- Insert sample customer data
INSERT INTO customers (email, region, country, status, data)
VALUES
    ('alice@us.com', 'US', 'United States', 'active', '{"gdpr": false}'),
    ('bob@uk.com', 'UK', 'United Kingdom', 'active', '{"gdpr": true}'),
    ('charlie@jp.com', 'Japan', 'Japan', 'active', '{"gdpr": false}'),
    ('diana@br.com', 'Brazil', 'Brazil', 'active', '{"gdpr": false}'),
    ('eve@de.com', 'Germany', 'Germany', 'active', '{"gdpr": true}');

-- Regional analysis (only scans relevant partition)
SELECT
    country,
    COUNT(*) AS customer_count,
    COUNT(*) FILTER (WHERE status = 'active') AS active_count
FROM customers
WHERE region IN ('UK', 'Germany', 'France')
GROUP BY country;

-- GDPR compliance query (only EU partition)
SELECT customer_id, email, country, data
FROM customers
WHERE region IN ('UK', 'Germany', 'France', 'Spain')
  AND data->>'gdpr' = 'true';
```

### Example 5: Hybrid Partitioning (Geographic + Time)

```sql
-- Scenario: Global transaction processing with regional compliance and time-based archival
-- Strategy: LIST partition by region, sub-partition by month

-- Create hybrid partitioned table
CREATE TABLE transactions (
    transaction_id BIGSERIAL,
    transaction_date TIMESTAMP NOT NULL,
    region VARCHAR(50) NOT NULL,
    customer_id INTEGER,
    amount NUMERIC(12, 2),
    currency VARCHAR(3),
    status VARCHAR(20),
    PRIMARY KEY (transaction_id, region, transaction_date)
) PARTITION BY LIST (region);

-- Create regional partitions with time-based sub-partitioning
CREATE TABLE transactions_us PARTITION OF transactions
    FOR VALUES IN ('US')
    PARTITION BY RANGE (transaction_date);

CREATE TABLE transactions_eu PARTITION OF transactions
    FOR VALUES IN ('EU')
    PARTITION BY RANGE (transaction_date);

CREATE TABLE transactions_ap PARTITION OF transactions
    FOR VALUES IN ('AP')
    PARTITION BY RANGE (transaction_date);

-- Create monthly sub-partitions for each region (2024 Q1)
CREATE TABLE transactions_us_2024_01 PARTITION OF transactions_us
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE transactions_us_2024_02 PARTITION OF transactions_us
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

CREATE TABLE transactions_us_2024_03 PARTITION OF transactions_us
    FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');

CREATE TABLE transactions_eu_2024_01 PARTITION OF transactions_eu
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE transactions_eu_2024_02 PARTITION OF transactions_eu
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

CREATE TABLE transactions_eu_2024_03 PARTITION OF transactions_eu
    FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');

CREATE TABLE transactions_ap_2024_01 PARTITION OF transactions_ap
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE transactions_ap_2024_02 PARTITION OF transactions_ap
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

CREATE TABLE transactions_ap_2024_03 PARTITION OF transactions_ap
    FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');

-- Insert sample data
INSERT INTO transactions (transaction_date, region, customer_id, amount, currency, status)
SELECT
    TIMESTAMP '2024-01-01 00:00:00' + (random() * INTERVAL '90 days'),
    (ARRAY['US', 'EU', 'AP'])[floor(random() * 3 + 1)],
    (random() * 10000)::INTEGER,
    (random() * 10000)::NUMERIC(12, 2),
    CASE
        WHEN random() < 0.33 THEN 'USD'
        WHEN random() < 0.66 THEN 'EUR'
        ELSE 'JPY'
    END,
    (ARRAY['pending', 'completed', 'failed'])[floor(random() * 3 + 1)]
FROM generate_series(1, 50000);

-- Query with dual partition pruning (region + time)
EXPLAIN ANALYZE
SELECT
    DATE_TRUNC('day', transaction_date) AS day,
    COUNT(*) AS transaction_count,
    SUM(amount) AS total_amount
FROM transactions
WHERE region = 'EU'
  AND transaction_date >= '2024-02-01'
  AND transaction_date < '2024-03-01'
  AND status = 'completed'
GROUP BY DATE_TRUNC('day', transaction_date)
ORDER BY day;

-- Regional monthly summary
SELECT
    region,
    DATE_TRUNC('month', transaction_date) AS month,
    COUNT(*) AS count,
    SUM(amount) AS total,
    AVG(amount) AS avg_amount
FROM transactions
WHERE transaction_date >= '2024-01-01' AND transaction_date < '2024-04-01'
GROUP BY region, DATE_TRUNC('month', transaction_date)
ORDER BY region, month;
```

### Example 6: Migration from Non-partitioned to Partitioned Table

```sql
-- Scenario: Existing large table needs partitioning
-- Strategy: Create partitioned table, migrate incrementally

-- Step 1: Existing large table
CREATE TABLE orders_old (
    order_id BIGSERIAL PRIMARY KEY,
    order_date TIMESTAMP NOT NULL,
    customer_id INTEGER NOT NULL,
    total_amount NUMERIC(10, 2),
    status VARCHAR(20)
);

-- Simulate existing data
INSERT INTO orders_old (order_date, customer_id, total_amount, status)
SELECT
    TIMESTAMP '2023-01-01 00:00:00' + (random() * INTERVAL '18 months'),
    (random() * 10000)::INTEGER,
    (random() * 1000)::NUMERIC(10, 2),
    (ARRAY['pending', 'completed', 'cancelled'])[floor(random() * 3 + 1)]
FROM generate_series(1, 100000);

-- Step 2: Create new partitioned table with same structure
CREATE TABLE orders_new (
    order_id BIGSERIAL,
    order_date TIMESTAMP NOT NULL,
    customer_id INTEGER NOT NULL,
    total_amount NUMERIC(10, 2),
    status VARCHAR(20),
    PRIMARY KEY (order_id, order_date)
) PARTITION BY RANGE (order_date);

-- Step 3: Create partitions
DO $$
DECLARE
    start_date TIMESTAMP := '2023-01-01';
    end_date TIMESTAMP := '2024-07-01';
    current_date TIMESTAMP := start_date;
    partition_name TEXT;
BEGIN
    WHILE current_date < end_date LOOP
        partition_name := 'orders_new_' || to_char(current_date, 'YYYY_MM');

        EXECUTE format(
            'CREATE TABLE %I PARTITION OF orders_new FOR VALUES FROM (%L) TO (%L)',
            partition_name,
            current_date,
            current_date + INTERVAL '1 month'
        );

        current_date := current_date + INTERVAL '1 month';
    END LOOP;
END $$;

-- Step 4: Migration strategy - incremental copy
-- Start with oldest data (least likely to be accessed during migration)
DO $$
DECLARE
    batch_size INTEGER := 10000;
    offset_value INTEGER := 0;
    rows_copied INTEGER;
    min_date TIMESTAMP := '2023-01-01';
    max_date TIMESTAMP := '2023-02-01';
BEGIN
    LOOP
        -- Copy batch
        INSERT INTO orders_new
        SELECT * FROM orders_old
        WHERE order_date >= min_date AND order_date < max_date
        ORDER BY order_id
        LIMIT batch_size OFFSET offset_value;

        GET DIAGNOSTICS rows_copied = ROW_COUNT;

        EXIT WHEN rows_copied = 0;

        offset_value := offset_value + batch_size;

        RAISE NOTICE 'Copied % rows, total offset: %', rows_copied, offset_value;

        -- Optional: Commit periodically if this is a long transaction
    END LOOP;
END $$;

-- Step 5: Create indexes on new table
CREATE INDEX idx_orders_new_customer ON orders_new (customer_id);
CREATE INDEX idx_orders_new_status ON orders_new (status);

-- Step 6: Verify data integrity
SELECT
    COUNT(*) AS old_count,
    (SELECT COUNT(*) FROM orders_new) AS new_count,
    COUNT(*) - (SELECT COUNT(*) FROM orders_new) AS difference
FROM orders_old;

-- Step 7: Switch application to new table (requires application update)
-- Then rename tables
BEGIN;
ALTER TABLE orders_old RENAME TO orders_archive;
ALTER TABLE orders_new RENAME TO orders;
COMMIT;

-- Step 8: Drop old table after validation period
-- DROP TABLE orders_archive;
```

### Example 7: Partition Strategy Comparison

```sql
-- Compare different partition strategies for same data

-- Dataset: 1 year of daily sales data
CREATE TEMP TABLE sales_data AS
SELECT
    generate_series AS sale_id,
    TIMESTAMP '2023-01-01 00:00:00' + (random() * INTERVAL '365 days') AS sale_date,
    (random() * 1000)::INTEGER AS customer_id,
    (random() * 1000)::NUMERIC(10, 2) AS amount
FROM generate_series(1, 100000);

-- Strategy 1: Monthly partitioning
CREATE TABLE sales_monthly (
    sale_id INTEGER,
    sale_date TIMESTAMP NOT NULL,
    customer_id INTEGER,
    amount NUMERIC(10, 2),
    PRIMARY KEY (sale_id, sale_date)
) PARTITION BY RANGE (sale_date);

-- Create 12 monthly partitions
DO $$
DECLARE
    i INTEGER;
    partition_name TEXT;
    start_date TIMESTAMP;
    end_date TIMESTAMP;
BEGIN
    FOR i IN 0..11 LOOP
        start_date := TIMESTAMP '2023-01-01' + (i || ' months')::INTERVAL;
        end_date := start_date + INTERVAL '1 month';
        partition_name := 'sales_monthly_' || to_char(start_date, 'YYYY_MM');

        EXECUTE format(
            'CREATE TABLE %I PARTITION OF sales_monthly FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );
    END LOOP;
END $$;

INSERT INTO sales_monthly SELECT * FROM sales_data;

-- Strategy 2: Quarterly partitioning
CREATE TABLE sales_quarterly (
    sale_id INTEGER,
    sale_date TIMESTAMP NOT NULL,
    customer_id INTEGER,
    amount NUMERIC(10, 2),
    PRIMARY KEY (sale_id, sale_date)
) PARTITION BY RANGE (sale_date);

-- Create 4 quarterly partitions
CREATE TABLE sales_q1 PARTITION OF sales_quarterly
    FOR VALUES FROM ('2023-01-01') TO ('2023-04-01');
CREATE TABLE sales_q2 PARTITION OF sales_quarterly
    FOR VALUES FROM ('2023-04-01') TO ('2023-07-01');
CREATE TABLE sales_q3 PARTITION OF sales_quarterly
    FOR VALUES FROM ('2023-07-01') TO ('2023-10-01');
CREATE TABLE sales_q4 PARTITION OF sales_quarterly
    FOR VALUES FROM ('2023-10-01') TO ('2024-01-01');

INSERT INTO sales_quarterly SELECT * FROM sales_data;

-- Compare query performance
-- Test 1: Single day query
EXPLAIN (ANALYZE, BUFFERS)
SELECT COUNT(*), SUM(amount)
FROM sales_monthly
WHERE sale_date >= '2023-06-15' AND sale_date < '2023-06-16';

EXPLAIN (ANALYZE, BUFFERS)
SELECT COUNT(*), SUM(amount)
FROM sales_quarterly
WHERE sale_date >= '2023-06-15' AND sale_date < '2023-06-16';

-- Test 2: Month-long query
EXPLAIN (ANALYZE, BUFFERS)
SELECT DATE_TRUNC('day', sale_date), COUNT(*), SUM(amount)
FROM sales_monthly
WHERE sale_date >= '2023-06-01' AND sale_date < '2023-07-01'
GROUP BY DATE_TRUNC('day', sale_date);

EXPLAIN (ANALYZE, BUFFERS)
SELECT DATE_TRUNC('day', sale_date), COUNT(*), SUM(amount)
FROM sales_quarterly
WHERE sale_date >= '2023-06-01' AND sale_date < '2023-07-01'
GROUP BY DATE_TRUNC('day', sale_date);

-- Compare partition counts and sizes
SELECT
    'Monthly' AS strategy,
    COUNT(*) AS partition_count,
    pg_size_pretty(SUM(pg_total_relation_size(c.oid))) AS total_size
FROM pg_class c
WHERE c.relname LIKE 'sales_monthly%'

UNION ALL

SELECT
    'Quarterly' AS strategy,
    COUNT(*) AS partition_count,
    pg_size_pretty(SUM(pg_total_relation_size(c.oid))) AS total_size
FROM pg_class c
WHERE c.relname LIKE 'sales_q%';
```

## Common Mistakes

### 1. Over-partitioning Small Tables

```sql
-- WRONG: Partitioning a 1GB table into 365 daily partitions
-- Each partition would be tiny (~3MB), overhead exceeds benefits

-- CORRECT: Only partition when partitions will be reasonably sized (10GB+)
-- Or when there are clear operational benefits (data lifecycle)
```

### 2. Poor Partition Key Choice

```sql
-- WRONG: Partitioning on rarely-used column
CREATE TABLE orders (...) PARTITION BY RANGE (created_by_user_id);
-- Queries filter by order_date, not created_by_user_id

-- CORRECT: Partition on frequently filtered column
CREATE TABLE orders (...) PARTITION BY RANGE (order_date);
```

### 3. Not Including Partition Key in Queries

```sql
-- BAD: Query without partition key (scans all partitions)
SELECT * FROM orders WHERE customer_id = 123;

-- GOOD: Include partition key for partition pruning
SELECT * FROM orders
WHERE order_date >= '2024-01-01' AND order_date < '2024-02-01'
  AND customer_id = 123;
```

### 4. Uneven Partition Sizes

```sql
-- WRONG: Using LIST partitioning without considering distribution
CREATE TABLE products PARTITION BY LIST (category);
CREATE TABLE products_electronics PARTITION OF products
    FOR VALUES IN ('electronics');  -- 90% of products
CREATE TABLE products_books PARTITION OF products
    FOR VALUES IN ('books');  -- 5% of products
CREATE TABLE products_other PARTITION OF products
    FOR VALUES IN ('other');  -- 5% of products

-- CORRECT: Use HASH partitioning for even distribution
CREATE TABLE products PARTITION BY HASH (product_id);
```

### 5. Not Planning for Future Partitions

```sql
-- WRONG: Only creating partitions as needed
-- Leads to insert failures when data arrives for non-existent partition

-- CORRECT: Proactively create future partitions
SELECT ensure_future_partitions(30);  -- Create next 30 days
```

### 6. Ignoring Partition Maintenance

```sql
-- WRONG: Never dropping old partitions
-- Database grows indefinitely, performance degrades

-- CORRECT: Implement regular partition cleanup
-- Schedule: SELECT cleanup_old_partitions(90);
```

## Best Practices

### 1. Define Clear Partitioning Goals

Before partitioning, document:
- Primary goal (performance, maintenance, compliance)
- Expected partition sizes and count
- Query patterns and partition key usage
- Retention and archival requirements
- Growth projections

### 2. Start with Coarse Granularity

```sql
-- Start with quarterly or monthly, not daily
-- Can always sub-partition later if needed

CREATE TABLE events PARTITION BY RANGE (event_date);
CREATE TABLE events_2024_q1 PARTITION OF events
    FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');

-- Later, if Q1 becomes too large, sub-partition it
```

### 3. Automate Partition Management

```sql
-- Create scheduled job (pg_cron or external scheduler)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Daily job to create future partitions
SELECT cron.schedule('create-partitions', '0 2 * * *', $$
    SELECT ensure_future_partitions('events', 7)
$$);

-- Weekly job to archive old partitions
SELECT cron.schedule('archive-partitions', '0 3 * * 0', $$
    SELECT archive_old_partitions('events', 90)
$$);
```

### 4. Monitor Partition Health

```sql
-- Create monitoring view
CREATE OR REPLACE VIEW partition_health AS
SELECT
    parent.relname AS table_name,
    child.relname AS partition_name,
    pg_size_pretty(pg_total_relation_size(child.oid)) AS size,
    (SELECT COUNT(*) FROM ONLY child.*) AS estimated_rows,
    pg_get_expr(child.relpartbound, child.oid) AS bounds
FROM pg_inherits i
JOIN pg_class parent ON i.inhparent = parent.oid
JOIN pg_class child ON i.inhrelid = child.oid
WHERE parent.relkind = 'p'
ORDER BY parent.relname, child.relname;

-- Regular check
SELECT * FROM partition_health
WHERE size > '100 GB'  -- Alert on large partitions
   OR estimated_rows = 0;  -- Alert on empty partitions
```

### 5. Test Before Production Deployment

```sql
-- Create test partitioned table
CREATE TABLE test_partitioned (...) PARTITION BY RANGE (...);

-- Load representative data
INSERT INTO test_partitioned SELECT * FROM production_sample LIMIT 100000;

-- Compare query performance
EXPLAIN (ANALYZE, BUFFERS) SELECT ... FROM original_table WHERE ...;
EXPLAIN (ANALYZE, BUFFERS) SELECT ... FROM test_partitioned WHERE ...;

-- Validate partition pruning
EXPLAIN SELECT ... FROM test_partitioned WHERE ...;
-- Look for "Partitions removed: N" in output
```

### 6. Document Partition Strategy

```sql
-- Create metadata table
CREATE TABLE partition_metadata (
    table_name VARCHAR(100) PRIMARY KEY,
    partition_type VARCHAR(20),
    partition_key VARCHAR(100),
    partition_interval VARCHAR(50),
    retention_days INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

INSERT INTO partition_metadata VALUES
('orders', 'RANGE', 'order_date', 'monthly', 730, CURRENT_TIMESTAMP,
 'Monthly partitions, 2-year retention, auto-create 3 months ahead');
```

### 7. Consider Index Strategy

```sql
-- Create indexes on partitioned table (applies to all partitions)
CREATE INDEX idx_orders_customer ON orders (customer_id);

-- For partition-specific needs, create individually
CREATE INDEX idx_orders_2024_01_express ON orders_2024_01 (shipping_method)
WHERE shipping_method = 'express';
```

## Practice Exercises

### Exercise 1: Design Partitioning Strategy for E-commerce Platform

Given requirements:
- 500K orders per month, growing 20% annually
- 90% of queries filter by order_date (last 30 days)
- 5% of queries are reports on specific date ranges
- Legal requirement: keep data for 7 years
- Currently 50 GB table

Design and implement a partitioning strategy.

**Solution:**

```sql
-- Analysis:
-- - Current: 50GB / 6M orders = ~8KB per order
-- - Monthly growth: 500K orders × 8KB = 4GB/month
-- - After 1 year: 50GB + (12 × 4GB) = 98GB
-- - After 7 years: ~400GB
-- - Monthly partitions: 4GB each (good size)
-- - Total partitions: 84 (7 years × 12 months) - manageable

-- Strategy: RANGE partitioning by order_date, monthly granularity

-- Step 1: Create partitioned table
CREATE TABLE orders (
    order_id BIGSERIAL,
    order_date TIMESTAMP NOT NULL,
    customer_id INTEGER NOT NULL,
    order_status VARCHAR(20),
    subtotal NUMERIC(10, 2),
    tax NUMERIC(10, 2),
    total NUMERIC(10, 2),
    shipping_address JSONB,
    PRIMARY KEY (order_id, order_date)
) PARTITION BY RANGE (order_date);

-- Step 2: Create historical partitions (last 7 years)
CREATE OR REPLACE FUNCTION create_historical_order_partitions()
RETURNS INTEGER AS $$
DECLARE
    start_date DATE := DATE_TRUNC('month', CURRENT_DATE - INTERVAL '7 years');
    end_date DATE := DATE_TRUNC('month', CURRENT_DATE + INTERVAL '3 months');
    current_date DATE := start_date;
    partition_name TEXT;
    created_count INTEGER := 0;
BEGIN
    WHILE current_date < end_date LOOP
        partition_name := 'orders_' || to_char(current_date, 'YYYY_MM');

        IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = partition_name) THEN
            EXECUTE format(
                'CREATE TABLE %I PARTITION OF orders FOR VALUES FROM (%L) TO (%L)',
                partition_name,
                current_date,
                current_date + INTERVAL '1 month'
            );

            -- Create indexes
            EXECUTE format('CREATE INDEX idx_%I_customer ON %I (customer_id)', partition_name, partition_name);
            EXECUTE format('CREATE INDEX idx_%I_status ON %I (order_status)', partition_name, partition_name);

            created_count := created_count + 1;
        END IF;

        current_date := current_date + INTERVAL '1 month';
    END LOOP;

    RETURN created_count;
END;
$$ LANGUAGE plpgsql;

SELECT create_historical_order_partitions();

-- Step 3: Automation - create future partitions
CREATE OR REPLACE FUNCTION maintain_order_partitions()
RETURNS TABLE(operation TEXT, details TEXT) AS $$
BEGIN
    -- Create future partitions (3 months ahead)
    operation := 'CREATE';
    details := 'Created ' || create_historical_order_partitions() || ' partitions';
    RETURN NEXT;

    -- Archive old partitions (older than 7 years to archive schema)
    DECLARE
        partition_rec RECORD;
        cutoff_date DATE := CURRENT_DATE - INTERVAL '7 years';
        archived_count INTEGER := 0;
    BEGIN
        FOR partition_rec IN
            SELECT c.relname
            FROM pg_inherits i
            JOIN pg_class parent ON i.inhparent = parent.oid
            JOIN pg_class c ON i.inhrelid = c.oid
            WHERE parent.relname = 'orders' AND c.relname ~ 'orders_\d{4}_\d{2}'
        LOOP
            DECLARE
                partition_date DATE;
            BEGIN
                partition_date := to_date(
                    regexp_replace(partition_rec.relname, 'orders_(\d{4})_(\d{2})', '\1-\2-01'),
                    'YYYY-MM-DD'
                );

                IF partition_date < cutoff_date THEN
                    EXECUTE 'ALTER TABLE orders DETACH PARTITION ' || partition_rec.relname || ' CONCURRENTLY';
                    EXECUTE 'ALTER TABLE ' || partition_rec.relname || ' SET SCHEMA archive';
                    archived_count := archived_count + 1;
                END IF;
            END;
        END LOOP;

        operation := 'ARCHIVE';
        details := 'Archived ' || archived_count || ' old partitions';
        RETURN NEXT;
    END;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Schedule maintenance (requires pg_cron)
-- SELECT cron.schedule('maintain-order-partitions', '0 1 1 * *', $$SELECT * FROM maintain_order_partitions()$$);

-- Step 5: Create monitoring
CREATE OR REPLACE VIEW orders_partition_summary AS
SELECT
    c.relname AS partition_name,
    pg_size_pretty(pg_total_relation_size(c.oid)) AS size,
    CASE
        WHEN c.relname ~ '_(\d{4})_(\d{2})' THEN
            to_date(regexp_replace(c.relname, 'orders_(\d{4})_(\d{2})', '\1-\2-01'), 'YYYY-MM-DD')
    END AS partition_month,
    pg_get_expr(c.relpartbound, c.oid) AS bounds
FROM pg_inherits i
JOIN pg_class parent ON i.inhparent = parent.oid
JOIN pg_class c ON i.inhrelid = c.oid
WHERE parent.relname = 'orders'
ORDER BY partition_month DESC;

-- Monitor partition health
SELECT
    partition_month,
    partition_name,
    size,
    CASE
        WHEN partition_month < CURRENT_DATE - INTERVAL '7 years' THEN 'SHOULD ARCHIVE'
        WHEN partition_month > CURRENT_DATE + INTERVAL '2 months' THEN 'FUTURE'
        ELSE 'ACTIVE'
    END AS status
FROM orders_partition_summary;
```

### Exercise 2: Optimize Existing Partitioned Table

Given: A partitioned logs table with daily partitions, but queries are slow. Optimize it.

**Solution:**

```sql
-- Current setup (problematic)
CREATE TABLE logs_current (
    log_id BIGSERIAL,
    log_timestamp TIMESTAMP NOT NULL,
    application VARCHAR(50),
    severity VARCHAR(20),
    message TEXT,
    PRIMARY KEY (log_id, log_timestamp)
) PARTITION BY RANGE (log_timestamp);

-- Daily partitions exist for last 90 days (90 partitions)
-- Problem: Too many small partitions, queries scan multiple partitions

-- Step 1: Analyze query patterns
-- Most queries: Last 7 days, filter by application and severity
-- Retention: 90 days

-- Step 2: Optimization strategy
-- Change to weekly partitions (13 instead of 90)
-- Add appropriate indexes

-- Create new optimized table
CREATE TABLE logs_optimized (
    log_id BIGSERIAL,
    log_timestamp TIMESTAMP NOT NULL,
    application VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    message TEXT,
    metadata JSONB,
    PRIMARY KEY (log_id, log_timestamp)
) PARTITION BY RANGE (log_timestamp);

-- Create weekly partitions
CREATE OR REPLACE FUNCTION create_weekly_log_partitions()
RETURNS INTEGER AS $$
DECLARE
    start_date DATE := DATE_TRUNC('week', CURRENT_DATE - INTERVAL '90 days');
    end_date DATE := DATE_TRUNC('week', CURRENT_DATE + INTERVAL '14 days');
    current_date DATE := start_date;
    partition_name TEXT;
    created_count INTEGER := 0;
BEGIN
    WHILE current_date < end_date LOOP
        partition_name := 'logs_optimized_' || to_char(current_date, 'IYYY_IW');  -- ISO year and week

        IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = partition_name) THEN
            EXECUTE format(
                'CREATE TABLE %I PARTITION OF logs_optimized FOR VALUES FROM (%L) TO (%L)',
                partition_name,
                current_date,
                current_date + INTERVAL '1 week'
            );

            -- Optimized indexes based on query patterns
            EXECUTE format('CREATE INDEX idx_%I_app_sev ON %I (application, severity)', partition_name, partition_name);
            EXECUTE format('CREATE INDEX idx_%I_timestamp ON %I (log_timestamp) WHERE severity IN (''ERROR'', ''CRITICAL'')', partition_name, partition_name);

            created_count := created_count + 1;
        END IF;

        current_date := current_date + INTERVAL '1 week';
    END LOOP;

    RETURN created_count;
END;
$$ LANGUAGE plpgsql;

SELECT create_weekly_log_partitions();

-- Insert sample data
INSERT INTO logs_optimized (log_timestamp, application, severity, message, metadata)
SELECT
    CURRENT_TIMESTAMP - (random() * INTERVAL '90 days'),
    (ARRAY['api', 'web', 'worker', 'scheduler'])[floor(random() * 4 + 1)],
    (ARRAY['INFO', 'WARN', 'ERROR', 'CRITICAL'])[floor(random() * 4 + 1)],
    'Sample log message',
    jsonb_build_object('host', 'server-' || floor(random() * 10))
FROM generate_series(1, 100000);

-- Compare performance
-- Old: Scans up to 7 daily partitions for 7-day query
-- New: Scans 1-2 weekly partitions for 7-day query

EXPLAIN (ANALYZE, BUFFERS)
SELECT application, severity, COUNT(*)
FROM logs_optimized
WHERE log_timestamp >= CURRENT_TIMESTAMP - INTERVAL '7 days'
  AND application = 'api'
  AND severity IN ('ERROR', 'CRITICAL')
GROUP BY application, severity;

-- Verify partition count reduction
SELECT COUNT(*) AS partition_count
FROM pg_inherits i
JOIN pg_class parent ON i.inhparent = parent.oid
JOIN pg_class child ON i.inhrelid = child.oid
WHERE parent.relname = 'logs_optimized';
-- Should show ~13 partitions vs 90 previously
```

### Exercise 3: Design Multi-level Partitioning for IoT Sensor Data

Requirements:
- 10K sensors sending readings every minute
- Data: sensor_id, timestamp, temperature, humidity, location
- Queries: Usually by location, then time range
- Retention: 2 years
- Expected volume: 10K × 60 × 24 × 365 = 5.2B rows/year

**Solution:**

```sql
-- Strategy: LIST partition by location, sub-partition by month
-- Rationale: Queries filter by location first, then time range

-- Step 1: Create multi-level partitioned table
CREATE TABLE sensor_readings (
    reading_id BIGSERIAL,
    sensor_id INTEGER NOT NULL,
    reading_timestamp TIMESTAMP NOT NULL,
    temperature NUMERIC(5, 2),
    humidity NUMERIC(5, 2),
    location VARCHAR(50) NOT NULL,
    PRIMARY KEY (reading_id, location, reading_timestamp)
) PARTITION BY LIST (location);

-- Step 2: Create location partitions with time sub-partitioning
CREATE TABLE sensor_readings_building_a PARTITION OF sensor_readings
    FOR VALUES IN ('Building A')
    PARTITION BY RANGE (reading_timestamp);

CREATE TABLE sensor_readings_building_b PARTITION OF sensor_readings
    FOR VALUES IN ('Building B')
    PARTITION BY RANGE (reading_timestamp);

CREATE TABLE sensor_readings_building_c PARTITION OF sensor_readings
    FOR VALUES IN ('Building C')
    PARTITION BY RANGE (reading_timestamp);

-- Step 3: Create monthly sub-partitions
CREATE OR REPLACE FUNCTION create_sensor_subpartitions(
    location_name TEXT,
    start_year INTEGER,
    months INTEGER
) RETURNS INTEGER AS $$
DECLARE
    current_month DATE := make_date(start_year, 1, 1);
    partition_name TEXT;
    subpartition_name TEXT;
    created_count INTEGER := 0;
    i INTEGER;
BEGIN
    -- Determine parent partition name
    partition_name := 'sensor_readings_' || lower(replace(location_name, ' ', '_'));

    FOR i IN 0..(months - 1) LOOP
        subpartition_name := partition_name || '_' || to_char(current_month + (i || ' months')::INTERVAL, 'YYYY_MM');

        IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = subpartition_name) THEN
            EXECUTE format(
                'CREATE TABLE %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
                subpartition_name,
                partition_name,
                current_month + (i || ' months')::INTERVAL,
                current_month + ((i + 1) || ' months')::INTERVAL
            );

            -- Create indexes optimized for sensor queries
            EXECUTE format('CREATE INDEX idx_%I_sensor_ts ON %I (sensor_id, reading_timestamp)', subpartition_name, subpartition_name);

            created_count := created_count + 1;
        END IF;
    END LOOP;

    RETURN created_count;
END;
$$ LANGUAGE plpgsql;

-- Create 24 months of partitions for each location
SELECT create_sensor_subpartitions('Building A', 2023, 24);
SELECT create_sensor_subpartitions('Building B', 2023, 24);
SELECT create_sensor_subpartitions('Building C', 2023, 24);

-- Step 4: Insert sample sensor data
INSERT INTO sensor_readings (sensor_id, reading_timestamp, temperature, humidity, location)
SELECT
    (random() * 10000)::INTEGER,
    TIMESTAMP '2023-01-01 00:00:00' + (random() * INTERVAL '365 days'),
    (random() * 50 - 10)::NUMERIC(5, 2),  -- -10 to 40 degrees
    (random() * 100)::NUMERIC(5, 2),       -- 0 to 100% humidity
    (ARRAY['Building A', 'Building B', 'Building C'])[floor(random() * 3 + 1)]
FROM generate_series(1, 500000);

-- Step 5: Optimized query (dual partition pruning)
EXPLAIN (ANALYZE, BUFFERS)
SELECT
    DATE_TRUNC('hour', reading_timestamp) AS hour,
    AVG(temperature) AS avg_temp,
    AVG(humidity) AS avg_humidity,
    COUNT(*) AS reading_count
FROM sensor_readings
WHERE location = 'Building A'
  AND reading_timestamp >= '2023-06-01'
  AND reading_timestamp < '2023-07-01'
  AND sensor_id = 1234
GROUP BY DATE_TRUNC('hour', reading_timestamp)
ORDER BY hour;

-- Should only scan: sensor_readings_building_a_2023_06 partition

-- Step 6: Maintenance function
CREATE OR REPLACE FUNCTION maintain_sensor_partitions()
RETURNS TABLE(location TEXT, created INTEGER, archived INTEGER) AS $$
DECLARE
    loc_rec RECORD;
    created_cnt INTEGER;
    archived_cnt INTEGER := 0;
    cutoff_date DATE := CURRENT_DATE - INTERVAL '2 years';
BEGIN
    FOR loc_rec IN SELECT DISTINCT location FROM (VALUES ('Building A'), ('Building B'), ('Building C')) AS t(location)
    LOOP
        -- Create next 3 months
        created_cnt := create_sensor_subpartitions(loc_rec.location, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, 3);

        -- TODO: Archive old partitions
        -- archived_cnt := archive_old_sensor_partitions(loc_rec.location, cutoff_date);

        location := loc_rec.location;
        created := created_cnt;
        archived := archived_cnt;
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run maintenance
SELECT * FROM maintain_sensor_partitions();

-- Step 7: Monitoring view
CREATE OR REPLACE VIEW sensor_partition_health AS
SELECT
    split_part(c.relname, '_', 3) AS location,
    to_date(split_part(c.relname, '_', 4) || '-' || split_part(c.relname, '_', 5) || '-01', 'YYYY-MM-DD') AS month,
    c.relname AS partition_name,
    pg_size_pretty(pg_total_relation_size(c.oid)) AS size,
    pg_total_relation_size(c.oid) AS size_bytes
FROM pg_inherits i
JOIN pg_class c ON i.inhrelid = c.oid
WHERE c.relname ~ 'sensor_readings_building_[abc]_\d{4}_\d{2}'
ORDER BY location, month DESC;

SELECT * FROM sensor_partition_health;
```

---

**Related Topics:**
- [Partition Basics](./01-partition-basics.md)
- [Partition Management](./02-partition-management.md)
- [Query Performance](../08-query-performance/01-explain-analyze.md)
- [Indexes](../05-indexes/01-index-types.md)
