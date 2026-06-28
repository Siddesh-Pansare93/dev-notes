# Partition Basics

## Table of Contents
- [Theory](#theory)
- [Syntax](#syntax)
- [Examples](#examples)
- [Common Mistakes](#common-mistakes)
- [Best Practices](#best-practices)
- [Practice Exercises](#practice-exercises)

## Theory

### What is Table Partitioning?

Partitioning is a database design technique that divides a large table into smaller, more manageable pieces called partitions, while still treating it as a single table from the SQL perspective. Each partition is a separate physical table that stores a subset of the data.

### Why Partition Tables?

**Performance Benefits:**
- **Query Performance**: Partition pruning allows PostgreSQL to scan only relevant partitions instead of the entire table
- **Faster Bulk Operations**: Loading or deleting data from specific partitions is faster than operating on the whole table
- **Improved Index Efficiency**: Smaller indexes on each partition are faster to scan and maintain
- **Parallel Processing**: Queries can be parallelized across partitions

**Maintenance Benefits:**
- **Data Lifecycle Management**: Easily drop old partitions to remove historical data
- **Easier Backups**: Back up or restore individual partitions
- **Vacuum Efficiency**: Vacuum operations on smaller partitions are faster
- **Storage Management**: Place partitions on different tablespaces/storage devices

**When to Consider Partitioning:**
- Tables larger than a few hundred GB
- Data with natural divisions (time periods, geographic regions, categories)
- Regular archival or deletion of old data
- Query patterns that target specific data ranges

### Declarative Partitioning (PostgreSQL 10+)

PostgreSQL 10 introduced declarative partitioning, a native partitioning method that is simpler and more efficient than the older inheritance-based partitioning. With declarative partitioning:

- PostgreSQL automatically routes data to the correct partition
- Query planner can use partition pruning to exclude irrelevant partitions
- Supports three partitioning methods: RANGE, LIST, and HASH

### Partitioning Methods

**1. RANGE Partitioning**
- Divides data based on a range of values
- Common for time-series data (dates) or sequential IDs
- Each partition covers a non-overlapping range

**2. LIST Partitioning**
- Divides data based on discrete values
- Common for categories, status codes, regions, or other enumerated values
- Each partition contains specific values

**3. HASH Partitioning**
- Divides data using a hash function
- Provides even distribution when no natural partitioning key exists
- Number of partitions is typically a power of 2

### Partition Pruning

Partition pruning is the optimization where PostgreSQL excludes (prunes) partitions that cannot contain rows matching the query's WHERE clause. This happens at query planning time when possible, or at execution time for runtime-determined values.

### Constraints and Indexes

- Partition-specific constraints are automatically created based on partition bounds
- Indexes must be created on each partition individually (or on the partitioned table)
- Creating an index on a partitioned table automatically creates indexes on all existing and future partitions
- Unique constraints must include the partition key

## Syntax

### Creating a Partitioned Table

```sql
-- Basic syntax
CREATE TABLE table_name (
    column1 datatype,
    column2 datatype,
    ...
) PARTITION BY {RANGE | LIST | HASH} (partition_key);
```

### RANGE Partitioning

```sql
-- Create partitioned table
CREATE TABLE table_name (...) PARTITION BY RANGE (column_name);

-- Create partition
CREATE TABLE partition_name PARTITION OF table_name
    FOR VALUES FROM (start_value) TO (end_value);

-- MINVALUE and MAXVALUE for unbounded ranges
CREATE TABLE partition_name PARTITION OF table_name
    FOR VALUES FROM (MINVALUE) TO (end_value);
```

### LIST Partitioning

```sql
-- Create partitioned table
CREATE TABLE table_name (...) PARTITION BY LIST (column_name);

-- Create partition
CREATE TABLE partition_name PARTITION OF table_name
    FOR VALUES IN (value1, value2, value3);
```

### HASH Partitioning

```sql
-- Create partitioned table
CREATE TABLE table_name (...) PARTITION BY HASH (column_name);

-- Create partition (modulus and remainder)
CREATE TABLE partition_name PARTITION OF table_name
    FOR VALUES WITH (MODULUS modulus_value, REMAINDER remainder_value);
```

### Creating Indexes on Partitioned Tables

```sql
-- Index on partitioned table (automatically creates on all partitions)
CREATE INDEX idx_name ON partitioned_table (column_name);

-- Index on specific partition
CREATE INDEX idx_name ON partition_name (column_name);
```

## Examples

### Example 1: RANGE Partitioning by Date

```sql
-- Create a sales table partitioned by order date (monthly partitions)
CREATE TABLE sales (
    sale_id BIGSERIAL,
    sale_date DATE NOT NULL,
    customer_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    region VARCHAR(50)
) PARTITION BY RANGE (sale_date);

-- Create partitions for 2024
CREATE TABLE sales_2024_01 PARTITION OF sales
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE sales_2024_02 PARTITION OF sales
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

CREATE TABLE sales_2024_03 PARTITION OF sales
    FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');

CREATE TABLE sales_2024_04 PARTITION OF sales
    FOR VALUES FROM ('2024-04-01') TO ('2024-05-01');

-- Create indexes on the partitioned table
CREATE INDEX idx_sales_date ON sales (sale_date);
CREATE INDEX idx_sales_customer ON sales (customer_id);

-- Insert data (automatically routed to correct partition)
INSERT INTO sales (sale_date, customer_id, product_id, amount, region)
VALUES
    ('2024-01-15', 101, 5001, 1250.00, 'North'),
    ('2024-02-20', 102, 5002, 850.50, 'South'),
    ('2024-03-10', 103, 5003, 2100.00, 'East'),
    ('2024-01-25', 104, 5004, 450.75, 'West');

-- Query with partition pruning (only scans sales_2024_02)
EXPLAIN SELECT * FROM sales WHERE sale_date = '2024-02-20';

-- Range query (scans only relevant partitions)
SELECT customer_id, SUM(amount) as total_sales
FROM sales
WHERE sale_date >= '2024-02-01' AND sale_date < '2024-04-01'
GROUP BY customer_id;

-- Verify data distribution across partitions
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename LIKE 'sales_%'
ORDER BY tablename;
```

### Example 2: RANGE Partitioning by ID

```sql
-- Create users table partitioned by user_id ranges
CREATE TABLE users (
    user_id BIGINT PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20)
) PARTITION BY RANGE (user_id);

-- Create partitions for different ID ranges
CREATE TABLE users_0_to_1m PARTITION OF users
    FOR VALUES FROM (0) TO (1000000);

CREATE TABLE users_1m_to_2m PARTITION OF users
    FOR VALUES FROM (1000000) TO (2000000);

CREATE TABLE users_2m_to_3m PARTITION OF users
    FOR VALUES FROM (2000000) TO (3000000);

-- Insert test data
INSERT INTO users (user_id, username, email, status)
VALUES
    (500000, 'user_500k', 'user500k@example.com', 'active'),
    (1500000, 'user_1.5m', 'user1.5m@example.com', 'active'),
    (2500000, 'user_2.5m', 'user2.5m@example.com', 'inactive');

-- Query with partition pruning
EXPLAIN SELECT * FROM users WHERE user_id = 1500000;

-- Query shows which partition is scanned
SELECT * FROM users WHERE user_id BETWEEN 1000000 AND 1100000;
```

### Example 3: LIST Partitioning by Status/Category

```sql
-- Create orders table partitioned by status
CREATE TABLE orders (
    order_id BIGSERIAL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    customer_id INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL,
    total_amount NUMERIC(10, 2)
) PARTITION BY LIST (status);

-- Create partitions for different statuses
CREATE TABLE orders_pending PARTITION OF orders
    FOR VALUES IN ('pending', 'processing');

CREATE TABLE orders_completed PARTITION OF orders
    FOR VALUES IN ('completed', 'shipped', 'delivered');

CREATE TABLE orders_cancelled PARTITION OF orders
    FOR VALUES IN ('cancelled', 'refunded');

-- Insert test data
INSERT INTO orders (customer_id, status, total_amount)
VALUES
    (101, 'pending', 500.00),
    (102, 'completed', 1200.00),
    (103, 'processing', 750.00),
    (104, 'cancelled', 300.00),
    (105, 'shipped', 900.00);

-- Query specific partition (only scans orders_completed)
SELECT * FROM orders WHERE status = 'completed';

-- Query multiple partitions
SELECT status, COUNT(*), SUM(total_amount)
FROM orders
WHERE status IN ('completed', 'shipped', 'delivered')
GROUP BY status;
```

### Example 4: LIST Partitioning by Region

```sql
-- Create customer_data table partitioned by region
CREATE TABLE customer_data (
    id BIGSERIAL,
    customer_name VARCHAR(100),
    region VARCHAR(50) NOT NULL,
    signup_date DATE,
    revenue NUMERIC(10, 2)
) PARTITION BY LIST (region);

-- Create regional partitions
CREATE TABLE customer_data_north_america PARTITION OF customer_data
    FOR VALUES IN ('US', 'Canada', 'Mexico');

CREATE TABLE customer_data_europe PARTITION OF customer_data
    FOR VALUES IN ('UK', 'Germany', 'France', 'Spain');

CREATE TABLE customer_data_asia PARTITION OF customer_data
    FOR VALUES IN ('China', 'Japan', 'India', 'Singapore');

-- Insert test data
INSERT INTO customer_data (customer_name, region, signup_date, revenue)
VALUES
    ('Acme Corp', 'US', '2024-01-15', 50000.00),
    ('British Ltd', 'UK', '2024-02-01', 30000.00),
    ('Tokyo Inc', 'Japan', '2024-01-20', 40000.00),
    ('Paris SA', 'France', '2024-03-01', 25000.00);

-- Regional analysis (scans only customer_data_europe)
SELECT region, COUNT(*), SUM(revenue)
FROM customer_data
WHERE region IN ('UK', 'Germany', 'France')
GROUP BY region;
```

### Example 5: HASH Partitioning

```sql
-- Create log_events table with hash partitioning
CREATE TABLE log_events (
    event_id BIGSERIAL,
    event_type VARCHAR(50),
    user_id INTEGER NOT NULL,
    event_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) PARTITION BY HASH (user_id);

-- Create 4 hash partitions (modulus = 4)
CREATE TABLE log_events_p0 PARTITION OF log_events
    FOR VALUES WITH (MODULUS 4, REMAINDER 0);

CREATE TABLE log_events_p1 PARTITION OF log_events
    FOR VALUES WITH (MODULUS 4, REMAINDER 1);

CREATE TABLE log_events_p2 PARTITION OF log_events
    FOR VALUES WITH (MODULUS 4, REMAINDER 2);

CREATE TABLE log_events_p3 PARTITION OF log_events
    FOR VALUES WITH (MODULUS 4, REMAINDER 3);

-- Insert test data (distributed across partitions by hash of user_id)
INSERT INTO log_events (event_type, user_id, event_data)
VALUES
    ('login', 1001, '{"ip": "192.168.1.1"}'),
    ('purchase', 1002, '{"amount": 99.99}'),
    ('logout', 1003, '{"session_time": 3600}'),
    ('login', 1004, '{"ip": "192.168.1.2"}'),
    ('view', 1005, '{"page": "/products"}');

-- Check distribution across partitions
SELECT
    tableoid::regclass AS partition_name,
    COUNT(*) AS row_count
FROM log_events
GROUP BY tableoid
ORDER BY partition_name;

-- Query by user_id (partition pruning works for equality)
EXPLAIN SELECT * FROM log_events WHERE user_id = 1002;
```

### Example 6: Partitioned Table with Constraints

```sql
-- Create partitioned table with constraints
CREATE TABLE sensor_readings (
    sensor_id INTEGER NOT NULL,
    reading_time TIMESTAMP NOT NULL,
    temperature NUMERIC(5, 2) CHECK (temperature >= -50 AND temperature <= 150),
    humidity NUMERIC(5, 2) CHECK (humidity >= 0 AND humidity <= 100),
    location VARCHAR(100)
) PARTITION BY RANGE (reading_time);

-- Create partitions
CREATE TABLE sensor_readings_2024_q1 PARTITION OF sensor_readings
    FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');

CREATE TABLE sensor_readings_2024_q2 PARTITION OF sensor_readings
    FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');

-- Constraints are inherited by partitions
INSERT INTO sensor_readings (sensor_id, reading_time, temperature, humidity, location)
VALUES (1, '2024-02-15 10:00:00', 22.5, 65.0, 'Building A');

-- This will fail due to CHECK constraint
-- INSERT INTO sensor_readings (sensor_id, reading_time, temperature, humidity, location)
-- VALUES (2, '2024-02-16 11:00:00', 200.0, 65.0, 'Building B');

-- Add additional constraint to a specific partition
ALTER TABLE sensor_readings_2024_q1
ADD CONSTRAINT check_q1_location
CHECK (location IN ('Building A', 'Building B', 'Building C'));
```

### Example 7: Querying Partition Information

```sql
-- View all partitions of a partitioned table
SELECT
    nmsp_parent.nspname AS parent_schema,
    parent.relname AS parent_table,
    nmsp_child.nspname AS partition_schema,
    child.relname AS partition_name,
    pg_get_expr(child.relpartbound, child.oid) AS partition_expression
FROM pg_inherits
JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
JOIN pg_class child ON pg_inherits.inhrelid = child.oid
JOIN pg_namespace nmsp_parent ON nmsp_parent.oid = parent.relnamespace
JOIN pg_namespace nmsp_child ON nmsp_child.oid = child.relnamespace
WHERE parent.relname = 'sales'
ORDER BY partition_name;

-- Check partition strategy and key
SELECT
    c.relname AS table_name,
    CASE p.partstrat
        WHEN 'l' THEN 'LIST'
        WHEN 'r' THEN 'RANGE'
        WHEN 'h' THEN 'HASH'
    END AS partition_strategy,
    pg_get_partkeydef(c.oid) AS partition_key
FROM pg_class c
JOIN pg_partitioned_table p ON p.partrelid = c.oid
WHERE c.relname = 'sales';
```

## Common Mistakes

### 1. Not Including Partition Key in Unique Constraints

```sql
-- WRONG: Primary key without partition key
CREATE TABLE events (
    event_id BIGSERIAL PRIMARY KEY,  -- Error!
    event_date DATE NOT NULL,
    event_type VARCHAR(50)
) PARTITION BY RANGE (event_date);
-- Error: unique constraint on partitioned table must include all partitioning columns

-- CORRECT: Include partition key in primary key
CREATE TABLE events (
    event_id BIGSERIAL,
    event_date DATE NOT NULL,
    event_type VARCHAR(50),
    PRIMARY KEY (event_id, event_date)  -- Includes partition key
) PARTITION BY RANGE (event_date);
```

### 2. Overlapping or Missing Partition Ranges

```sql
-- WRONG: Overlapping ranges
CREATE TABLE data_2024_01 PARTITION OF data
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE data_2024_02 PARTITION OF data
    FOR VALUES FROM ('2024-01-15') TO ('2024-03-01');  -- Error: overlaps!

-- WRONG: Gap in ranges (no partition for Feb 15-28)
CREATE TABLE data_2024_02_first PARTITION OF data
    FOR VALUES FROM ('2024-02-01') TO ('2024-02-15');

CREATE TABLE data_2024_03 PARTITION OF data
    FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');
-- Insert for '2024-02-20' will fail - no matching partition
```

### 3. Inserting Data Outside Partition Bounds

```sql
-- Create partitions only for 2024
CREATE TABLE sales_2024_01 PARTITION OF sales
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- This will fail - no partition for 2025
INSERT INTO sales (sale_date, customer_id, product_id, amount)
VALUES ('2025-01-15', 101, 5001, 1250.00);
-- Error: no partition of relation "sales" found for row
```

### 4. Wrong Hash Partition Configuration

```sql
-- WRONG: Remainder >= Modulus
CREATE TABLE logs_p0 PARTITION OF logs
    FOR VALUES WITH (MODULUS 4, REMAINDER 5);  -- Error!

-- CORRECT: Remainder must be < Modulus
CREATE TABLE logs_p0 PARTITION OF logs
    FOR VALUES WITH (MODULUS 4, REMAINDER 0);
```

### 5. Not Using Partition Key in Queries

```sql
-- Bad: Query without partition key (scans all partitions)
SELECT * FROM sales WHERE customer_id = 101;

-- Good: Query with partition key (partition pruning)
SELECT * FROM sales
WHERE sale_date >= '2024-02-01' AND sale_date < '2024-03-01'
  AND customer_id = 101;
```

## Best Practices

### 1. Choose the Right Partition Key

- Select a column frequently used in WHERE clauses
- Choose a key with natural data divisions
- Consider query patterns and data access requirements
- For time-series data, use timestamp/date columns
- Ensure the partition key is immutable or rarely changes

### 2. Plan Partition Size

- Aim for partitions between 10GB and 100GB for optimal performance
- Too many small partitions increase overhead
- Too few large partitions reduce benefits
- Consider growth rate when planning partitions

### 3. Create Indexes Wisely

```sql
-- Create index on partitioned table (applies to all partitions)
CREATE INDEX idx_sales_customer ON sales (customer_id);

-- For different indexes on different partitions, create individually
CREATE INDEX idx_sales_2024_01_region ON sales_2024_01 (region);
```

### 4. Use Meaningful Partition Names

```sql
-- Good: Clear, descriptive names
CREATE TABLE sales_2024_01_january PARTITION OF sales
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Avoid: Generic names
CREATE TABLE sales_p1 PARTITION OF sales
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

### 5. Enable Partition Pruning

```sql
-- Enable constraint exclusion (should be ON by default)
SET constraint_exclusion = partition;

-- Verify partition pruning in EXPLAIN
EXPLAIN SELECT * FROM sales WHERE sale_date = '2024-02-15';
-- Look for "Partitions removed" in output
```

### 6. Monitor Partition Growth

```sql
-- Regular query to monitor partition sizes
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) -
                   pg_relation_size(schemaname||'.'||tablename)) AS index_size
FROM pg_tables
WHERE tablename LIKE 'sales_%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 7. Document Partition Strategy

- Document the partitioning scheme and maintenance schedule
- Set up automated partition creation scripts
- Plan for partition archival and deletion
- Test partition operations in non-production environments first

### 8. Use Table Inheritance Sparingly

- Prefer declarative partitioning over inheritance-based partitioning
- Declarative partitioning has better query optimization
- Inheritance-based partitioning is legacy and more complex

## Practice Exercises

### Exercise 1: Time-Series Event Partitioning

Create a partitioned table for application events with the following requirements:

1. Create a table called `app_events` with columns:
   - event_id (auto-incrementing)
   - event_timestamp (timestamp)
   - user_id (integer)
   - event_type (varchar)
   - event_data (jsonb)

2. Partition by RANGE on event_timestamp (daily partitions)

3. Create partitions for the first week of January 2024

4. Insert sample events across different days

5. Create appropriate indexes

6. Write a query that shows partition pruning in action

7. Query to count events by type for a specific day

**Solution:**

```sql
-- Step 1 & 2: Create partitioned table
CREATE TABLE app_events (
    event_id BIGSERIAL,
    event_timestamp TIMESTAMP NOT NULL,
    user_id INTEGER NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB,
    PRIMARY KEY (event_id, event_timestamp)
) PARTITION BY RANGE (event_timestamp);

-- Step 3: Create daily partitions for first week of January 2024
CREATE TABLE app_events_2024_01_01 PARTITION OF app_events
    FOR VALUES FROM ('2024-01-01 00:00:00') TO ('2024-01-02 00:00:00');

CREATE TABLE app_events_2024_01_02 PARTITION OF app_events
    FOR VALUES FROM ('2024-01-02 00:00:00') TO ('2024-01-03 00:00:00');

CREATE TABLE app_events_2024_01_03 PARTITION OF app_events
    FOR VALUES FROM ('2024-01-03 00:00:00') TO ('2024-01-04 00:00:00');

CREATE TABLE app_events_2024_01_04 PARTITION OF app_events
    FOR VALUES FROM ('2024-01-04 00:00:00') TO ('2024-01-05 00:00:00');

CREATE TABLE app_events_2024_01_05 PARTITION OF app_events
    FOR VALUES FROM ('2024-01-05 00:00:00') TO ('2024-01-06 00:00:00');

CREATE TABLE app_events_2024_01_06 PARTITION OF app_events
    FOR VALUES FROM ('2024-01-06 00:00:00') TO ('2024-01-07 00:00:00');

CREATE TABLE app_events_2024_01_07 PARTITION OF app_events
    FOR VALUES FROM ('2024-01-07 00:00:00') TO ('2024-01-08 00:00:00');

-- Step 4: Insert sample events
INSERT INTO app_events (event_timestamp, user_id, event_type, event_data)
VALUES
    ('2024-01-01 10:30:00', 1001, 'login', '{"ip": "192.168.1.1", "browser": "Chrome"}'),
    ('2024-01-01 14:15:00', 1002, 'purchase', '{"amount": 99.99, "product_id": 5001}'),
    ('2024-01-02 09:00:00', 1001, 'logout', '{"session_duration": 3600}'),
    ('2024-01-03 11:20:00', 1003, 'login', '{"ip": "192.168.1.5", "browser": "Firefox"}'),
    ('2024-01-03 15:45:00', 1002, 'view_product', '{"product_id": 5002}'),
    ('2024-01-04 08:30:00', 1004, 'signup', '{"referral": "google"}'),
    ('2024-01-05 16:00:00', 1001, 'login', '{"ip": "192.168.1.1", "browser": "Chrome"}'),
    ('2024-01-05 17:30:00', 1003, 'purchase', '{"amount": 149.99, "product_id": 5003}');

-- Step 5: Create indexes
CREATE INDEX idx_app_events_user ON app_events (user_id);
CREATE INDEX idx_app_events_type ON app_events (event_type);
CREATE INDEX idx_app_events_data ON app_events USING GIN (event_data);

-- Step 6: Query showing partition pruning
EXPLAIN (COSTS OFF, ANALYZE OFF)
SELECT * FROM app_events
WHERE event_timestamp >= '2024-01-03 00:00:00'
  AND event_timestamp < '2024-01-04 00:00:00';
-- Should show only app_events_2024_01_03 is scanned

-- Step 7: Count events by type for a specific day
SELECT
    event_type,
    COUNT(*) AS event_count,
    COUNT(DISTINCT user_id) AS unique_users
FROM app_events
WHERE event_timestamp >= '2024-01-03 00:00:00'
  AND event_timestamp < '2024-01-04 00:00:00'
GROUP BY event_type
ORDER BY event_count DESC;
```

### Exercise 2: Multi-Column LIST Partitioning

Create a customer orders table partitioned by country and priority:

1. Create a table called `customer_orders` with columns:
   - order_id (auto-incrementing)
   - order_date (date)
   - customer_id (integer)
   - country (varchar)
   - priority (varchar: 'high', 'medium', 'low')
   - amount (numeric)

2. Partition by LIST on country

3. Create partitions for: USA, Canada, UK, Germany

4. Insert sample data for different countries

5. Query to find all high-priority orders from USA

6. Compare performance with EXPLAIN

**Solution:**

```sql
-- Step 1 & 2: Create partitioned table
CREATE TABLE customer_orders (
    order_id BIGSERIAL,
    order_date DATE NOT NULL,
    customer_id INTEGER NOT NULL,
    country VARCHAR(50) NOT NULL,
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
    amount NUMERIC(10, 2) NOT NULL
) PARTITION BY LIST (country);

-- Step 3: Create country-based partitions
CREATE TABLE customer_orders_usa PARTITION OF customer_orders
    FOR VALUES IN ('USA', 'US');

CREATE TABLE customer_orders_canada PARTITION OF customer_orders
    FOR VALUES IN ('Canada', 'CA');

CREATE TABLE customer_orders_uk PARTITION OF customer_orders
    FOR VALUES IN ('UK', 'United Kingdom');

CREATE TABLE customer_orders_germany PARTITION OF customer_orders
    FOR VALUES IN ('Germany', 'DE');

-- Step 4: Insert sample data
INSERT INTO customer_orders (order_date, customer_id, country, priority, amount)
VALUES
    ('2024-01-15', 1001, 'USA', 'high', 1500.00),
    ('2024-01-16', 1002, 'Canada', 'medium', 800.00),
    ('2024-01-17', 1003, 'UK', 'low', 450.00),
    ('2024-01-18', 1004, 'USA', 'high', 2200.00),
    ('2024-01-19', 1005, 'Germany', 'medium', 1100.00),
    ('2024-01-20', 1006, 'USA', 'low', 600.00),
    ('2024-01-21', 1007, 'Canada', 'high', 1800.00),
    ('2024-01-22', 1008, 'UK', 'medium', 950.00);

-- Create indexes
CREATE INDEX idx_customer_orders_priority ON customer_orders (priority);
CREATE INDEX idx_customer_orders_date ON customer_orders (order_date);

-- Step 5: Query high-priority USA orders
SELECT
    order_id,
    order_date,
    customer_id,
    amount
FROM customer_orders
WHERE country = 'USA' AND priority = 'high'
ORDER BY order_date DESC;

-- Step 6: Compare with EXPLAIN
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM customer_orders WHERE country = 'USA';
-- Should only scan customer_orders_usa partition

-- Additional query: Summary by country and priority
SELECT
    country,
    priority,
    COUNT(*) AS order_count,
    SUM(amount) AS total_amount,
    AVG(amount) AS avg_amount
FROM customer_orders
GROUP BY country, priority
ORDER BY country, priority;
```

### Exercise 3: Hash Partitioning for User Data

Create a hash-partitioned table for distributed user session data:

1. Create a `user_sessions` table with:
   - session_id (uuid, primary key with user_id)
   - user_id (integer)
   - login_time (timestamp)
   - logout_time (timestamp, nullable)
   - ip_address (inet)
   - user_agent (text)

2. Partition by HASH on user_id into 8 partitions

3. Insert sample session data for various users

4. Verify even distribution across partitions

5. Query sessions for a specific user

**Solution:**

```sql
-- Step 1 & 2: Create hash-partitioned table
CREATE TABLE user_sessions (
    session_id UUID DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL,
    login_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    logout_time TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    PRIMARY KEY (session_id, user_id)
) PARTITION BY HASH (user_id);

-- Create 8 hash partitions
CREATE TABLE user_sessions_p0 PARTITION OF user_sessions
    FOR VALUES WITH (MODULUS 8, REMAINDER 0);

CREATE TABLE user_sessions_p1 PARTITION OF user_sessions
    FOR VALUES WITH (MODULUS 8, REMAINDER 1);

CREATE TABLE user_sessions_p2 PARTITION OF user_sessions
    FOR VALUES WITH (MODULUS 8, REMAINDER 2);

CREATE TABLE user_sessions_p3 PARTITION OF user_sessions
    FOR VALUES WITH (MODULUS 8, REMAINDER 3);

CREATE TABLE user_sessions_p4 PARTITION OF user_sessions
    FOR VALUES WITH (MODULUS 8, REMAINDER 4);

CREATE TABLE user_sessions_p5 PARTITION OF user_sessions
    FOR VALUES WITH (MODULUS 8, REMAINDER 5);

CREATE TABLE user_sessions_p6 PARTITION OF user_sessions
    FOR VALUES WITH (MODULUS 8, REMAINDER 6);

CREATE TABLE user_sessions_p7 PARTITION OF user_sessions
    FOR VALUES WITH (MODULUS 8, REMAINDER 7);

-- Step 3: Insert sample session data
INSERT INTO user_sessions (user_id, login_time, logout_time, ip_address, user_agent)
SELECT
    user_id,
    CURRENT_TIMESTAMP - (random() * INTERVAL '30 days'),
    CURRENT_TIMESTAMP - (random() * INTERVAL '29 days'),
    ('192.168.1.' || (random() * 255)::INTEGER)::INET,
    'Mozilla/5.0 (User ' || user_id || ')'
FROM generate_series(1, 100) AS user_id;

-- Step 4: Verify distribution
SELECT
    tableoid::regclass AS partition_name,
    COUNT(*) AS session_count,
    MIN(user_id) AS min_user_id,
    MAX(user_id) AS max_user_id
FROM user_sessions
GROUP BY tableoid
ORDER BY partition_name;

-- Step 5: Query sessions for specific user
EXPLAIN (ANALYZE, BUFFERS)
SELECT
    session_id,
    login_time,
    logout_time,
    EXTRACT(EPOCH FROM (logout_time - login_time)) AS session_duration_seconds
FROM user_sessions
WHERE user_id = 42
ORDER BY login_time DESC;

-- Find active sessions (no logout time)
SELECT
    user_id,
    session_id,
    login_time,
    ip_address
FROM user_sessions
WHERE logout_time IS NULL
ORDER BY login_time DESC;
```

---

**Related Topics:**
- [Partition Management](./02-partition-management.md)
- [Partition Strategies](./03-partition-strategies.md)
- [Indexes](../05-indexes/01-index-types.md)
- [Query Performance](../08-query-performance/01-explain-analyze.md)
