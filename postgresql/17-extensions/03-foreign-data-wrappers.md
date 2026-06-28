# Foreign Data Wrappers (FDW)

## Table of Contents
- [Introduction to Foreign Data Wrappers](#introduction-to-foreign-data-wrappers)
- [FDW Architecture](#fdw-architecture)
- [Setting Up Foreign Servers](#setting-up-foreign-servers)
- [postgres_fdw](#postgres_fdw)
- [file_fdw](#file_fdw)
- [Query Pushdown](#query-pushdown)
- [Performance Considerations](#performance-considerations)
- [Other FDW Extensions](#other-fdw-extensions)
- [Materialized Foreign Data](#materialized-foreign-data)
- [Security Considerations](#security-considerations)
- [Common Mistakes](#common-mistakes)
- [Best Practices](#best-practices)
- [Practice Exercises](#practice-exercises)

## Introduction to Foreign Data Wrappers

### Theory
Foreign Data Wrappers (FDW) allow PostgreSQL to access and query data stored in external data sources as if they were local tables. FDWs implement the SQL/MED (Management of External Data) standard, enabling:

- Querying remote PostgreSQL databases
- Reading CSV files and logs
- Connecting to other databases (MySQL, Oracle, MongoDB)
- Accessing REST APIs and web services
- Creating federated database systems

**Key Benefits:**
- Unified query interface across heterogeneous data sources
- Real-time access to external data
- No need for ETL processes for read operations
- Transparent to application code

**Use Cases:**
- Data integration from multiple sources
- Reporting across distributed databases
- Legacy system integration
- Microservices data aggregation

## FDW Architecture

### Theory
The FDW system consists of several components:

1. **Foreign Data Wrapper**: Extension that handles communication with external source
2. **Foreign Server**: Configuration defining connection to external system
3. **User Mapping**: Credentials mapping local users to remote users
4. **Foreign Table**: Virtual table definition matching external data structure

### Syntax

```sql
-- Install FDW extension
CREATE EXTENSION fdw_name;

-- Create foreign server
CREATE SERVER server_name
FOREIGN DATA WRAPPER fdw_name
OPTIONS (option 'value', ...);

-- Create user mapping
CREATE USER MAPPING FOR local_user
SERVER server_name
OPTIONS (user 'remote_user', password 'password');

-- Create foreign table
CREATE FOREIGN TABLE table_name (
    column_name data_type,
    ...
)
SERVER server_name
OPTIONS (option 'value', ...);

-- Import foreign schema
IMPORT FOREIGN SCHEMA remote_schema
FROM SERVER server_name
INTO local_schema;
```

## Setting Up Foreign Servers

### Examples

```sql
-- Check available FDW extensions
SELECT * FROM pg_available_extensions WHERE name LIKE '%fdw%';

-- Install postgres_fdw
CREATE EXTENSION IF NOT EXISTS postgres_fdw;

-- List installed FDWs
SELECT fdwname FROM pg_foreign_data_wrapper;

-- View foreign servers
SELECT srvname, fdwname, srvoptions
FROM pg_foreign_server fs
JOIN pg_foreign_data_wrapper fdw ON fs.srvfdw = fdw.oid;

-- View user mappings
SELECT
    um.umuser::regrole AS local_user,
    s.srvname AS server_name,
    um.umoptions
FROM pg_user_mapping um
JOIN pg_foreign_server s ON um.umserver = s.oid;

-- View foreign tables
SELECT
    foreign_table_schema,
    foreign_table_name,
    foreign_server_name
FROM information_schema.foreign_tables;
```

## postgres_fdw

### Theory
postgres_fdw is the most commonly used FDW, allowing PostgreSQL to query other PostgreSQL databases. It supports advanced features like join pushdown, aggregate pushdown, and WHERE clause pushdown for optimal performance.

### Syntax

```sql
-- Create server
CREATE SERVER remote_server
FOREIGN DATA WRAPPER postgres_fdw
OPTIONS (
    host 'remote_host',
    port '5432',
    dbname 'remote_db'
);

-- Create user mapping
CREATE USER MAPPING FOR current_user
SERVER remote_server
OPTIONS (
    user 'remote_user',
    password 'remote_password'
);

-- Create foreign table manually
CREATE FOREIGN TABLE remote_table (
    id INT,
    name TEXT
)
SERVER remote_server
OPTIONS (
    schema_name 'public',
    table_name 'table_name'
);

-- Or import entire schema
IMPORT FOREIGN SCHEMA public
FROM SERVER remote_server
INTO local_schema;
```

### Examples

```sql
-- Install postgres_fdw
CREATE EXTENSION IF NOT EXISTS postgres_fdw;

-- Create server for remote database
CREATE SERVER analytics_server
FOREIGN DATA WRAPPER postgres_fdw
OPTIONS (
    host 'analytics.example.com',
    port '5432',
    dbname 'analytics_db',
    fetch_size '10000'  -- Bulk fetch size
);

-- Create user mapping
CREATE USER MAPPING FOR CURRENT_USER
SERVER analytics_server
OPTIONS (
    user 'analytics_user',
    password 'secure_password'
);

-- Create local schema for foreign tables
CREATE SCHEMA IF NOT EXISTS remote_analytics;

-- Import entire schema
IMPORT FOREIGN SCHEMA public
FROM SERVER analytics_server
INTO remote_analytics;

-- Or create individual foreign tables
CREATE FOREIGN TABLE remote_analytics.sales (
    id BIGINT,
    order_date DATE,
    customer_id INT,
    product_id INT,
    quantity INT,
    total_amount DECIMAL(10, 2)
)
SERVER analytics_server
OPTIONS (
    schema_name 'public',
    table_name 'sales'
);

CREATE FOREIGN TABLE remote_analytics.customers (
    id INT,
    name VARCHAR(200),
    email VARCHAR(200),
    country VARCHAR(100)
)
SERVER analytics_server
OPTIONS (
    schema_name 'public',
    table_name 'customers'
);

-- Query foreign table (looks like local table)
SELECT * FROM remote_analytics.sales LIMIT 10;

-- Join local and remote data
CREATE TABLE local_products (
    id SERIAL PRIMARY KEY,
    product_name VARCHAR(200),
    category VARCHAR(100)
);

SELECT
    s.order_date,
    c.name AS customer_name,
    p.product_name,
    s.quantity,
    s.total_amount
FROM remote_analytics.sales s
JOIN remote_analytics.customers c ON s.customer_id = c.id
JOIN local_products p ON s.product_id = p.id
WHERE s.order_date >= CURRENT_DATE - INTERVAL '30 days';

-- Aggregate remote data
SELECT
    DATE_TRUNC('month', order_date) AS month,
    COUNT(*) AS order_count,
    SUM(total_amount) AS total_revenue
FROM remote_analytics.sales
WHERE order_date >= '2024-01-01'
GROUP BY DATE_TRUNC('month', order_date)
ORDER BY month;

-- Update remote data (if permissions allow)
UPDATE remote_analytics.customers
SET email = 'newemail@example.com'
WHERE id = 12345;

-- Insert into remote table
INSERT INTO remote_analytics.sales (order_date, customer_id, product_id, quantity, total_amount)
VALUES (CURRENT_DATE, 100, 50, 2, 99.98);

-- View foreign table definition
\d+ remote_analytics.sales

-- Check server options
SELECT
    srvname,
    srvoptions
FROM pg_foreign_server
WHERE srvname = 'analytics_server';

-- Modify server options
ALTER SERVER analytics_server
OPTIONS (ADD extensions 'postgres_fdw');

-- Drop foreign table
DROP FOREIGN TABLE IF EXISTS remote_analytics.sales;

-- Drop user mapping
DROP USER MAPPING IF EXISTS FOR CURRENT_USER SERVER analytics_server;

-- Drop server
DROP SERVER IF EXISTS analytics_server CASCADE;
```

## file_fdw

### Theory
file_fdw allows PostgreSQL to read data from files (CSV, text) as if they were tables. Useful for importing logs, reading external data feeds, and processing flat files without loading them into database.

### Syntax

```sql
-- Create server (usually just a placeholder)
CREATE SERVER file_server
FOREIGN DATA WRAPPER file_fdw;

-- Create foreign table pointing to file
CREATE FOREIGN TABLE file_table (
    column1 type,
    column2 type
)
SERVER file_server
OPTIONS (
    filename '/path/to/file.csv',
    format 'csv',
    header 'true',
    delimiter ',',
    null ''
);
```

### Examples

```sql
-- Install file_fdw
CREATE EXTENSION IF NOT EXISTS file_fdw;

-- Create file server
CREATE SERVER files
FOREIGN DATA WRAPPER file_fdw;

-- Read CSV file
CREATE FOREIGN TABLE sales_import (
    order_id INT,
    order_date DATE,
    customer_id INT,
    product_name VARCHAR(200),
    quantity INT,
    price DECIMAL(10, 2)
)
SERVER files
OPTIONS (
    filename '/var/lib/postgresql/data/sales.csv',
    format 'csv',
    header 'true',
    delimiter ',',
    null ''
);

-- Query CSV file
SELECT * FROM sales_import LIMIT 10;

-- Aggregate data from CSV
SELECT
    DATE_TRUNC('month', order_date) AS month,
    SUM(quantity * price) AS revenue
FROM sales_import
GROUP BY month
ORDER BY month;

-- Load CSV data into permanent table
CREATE TABLE sales AS
SELECT * FROM sales_import;

-- Read log files
CREATE FOREIGN TABLE application_logs (
    log_time TIMESTAMP,
    log_level VARCHAR(10),
    message TEXT,
    user_id INT
)
SERVER files
OPTIONS (
    filename '/var/log/app/application.log',
    format 'csv',
    delimiter '|'
);

-- Query logs
SELECT
    log_level,
    COUNT(*) AS count
FROM application_logs
WHERE log_time >= CURRENT_DATE
GROUP BY log_level;

-- Tab-delimited file
CREATE FOREIGN TABLE tsv_data (
    id INT,
    name TEXT,
    value NUMERIC
)
SERVER files
OPTIONS (
    filename '/data/export.tsv',
    format 'csv',
    header 'true',
    delimiter E'\t'
);

-- Read multiple files using PROGRAM option (PostgreSQL 10+)
CREATE FOREIGN TABLE combined_logs (
    timestamp TIMESTAMP,
    severity VARCHAR(20),
    message TEXT
)
SERVER files
OPTIONS (
    program 'cat /var/log/app/*.log',
    format 'csv'
);

-- Handle malformed CSV (skip errors)
CREATE FOREIGN TABLE error_tolerant_import (
    col1 TEXT,
    col2 TEXT,
    col3 TEXT
)
SERVER files
OPTIONS (
    filename '/data/messy_data.csv',
    format 'csv',
    header 'true'
);

-- Copy data from file to table efficiently
CREATE TABLE permanent_data AS
SELECT * FROM sales_import
WHERE order_date >= '2024-01-01';

-- Use in views for live data access
CREATE VIEW live_sales AS
SELECT
    order_id,
    order_date,
    customer_id,
    quantity * price AS total
FROM sales_import;
```

## Query Pushdown

### Theory
Query pushdown is a critical optimization where FDW pushes parts of the query (WHERE clauses, JOINs, aggregates) to the remote server, reducing data transfer and improving performance.

**Types of Pushdown:**
- **WHERE clause pushdown**: Filter on remote server
- **JOIN pushdown**: Execute joins remotely
- **Aggregate pushdown**: Calculate aggregates remotely
- **LIMIT pushdown**: Limit rows on remote server
- **ORDER BY pushdown**: Sort on remote server

### Examples

```sql
-- Setup for demonstration
CREATE EXTENSION IF NOT EXISTS postgres_fdw;

CREATE SERVER remote_db
FOREIGN DATA WRAPPER postgres_fdw
OPTIONS (host 'localhost', dbname 'remote', port '5432');

CREATE USER MAPPING FOR CURRENT_USER
SERVER remote_db
OPTIONS (user 'postgres', password 'password');

CREATE FOREIGN TABLE remote_orders (
    id BIGINT,
    customer_id INT,
    order_date DATE,
    total DECIMAL(10, 2),
    status VARCHAR(20)
)
SERVER remote_db
OPTIONS (schema_name 'public', table_name 'orders');

-- WHERE clause pushdown (GOOD - filter on remote)
EXPLAIN (VERBOSE, COSTS OFF)
SELECT * FROM remote_orders
WHERE order_date >= '2024-01-01' AND status = 'completed';
-- Shows: Remote SQL: SELECT ... WHERE (order_date >= ...) AND (status = ...)

-- JOIN pushdown (two remote tables)
CREATE FOREIGN TABLE remote_customers (
    id INT,
    name VARCHAR(200),
    country VARCHAR(100)
)
SERVER remote_db
OPTIONS (schema_name 'public', table_name 'customers');

-- Join executed on remote server
EXPLAIN (VERBOSE, COSTS OFF)
SELECT
    c.name,
    o.total
FROM remote_orders o
JOIN remote_customers c ON o.customer_id = c.id
WHERE o.order_date >= '2024-01-01';
-- Shows: Remote SQL: SELECT ... FROM orders o JOIN customers c ...

-- Aggregate pushdown
EXPLAIN (VERBOSE, COSTS OFF)
SELECT
    status,
    COUNT(*) AS order_count,
    SUM(total) AS total_revenue
FROM remote_orders
GROUP BY status;
-- Shows: Remote SQL: SELECT status, COUNT(*), SUM(total) ...

-- LIMIT pushdown
EXPLAIN (VERBOSE, COSTS OFF)
SELECT * FROM remote_orders
ORDER BY order_date DESC
LIMIT 100;
-- Shows: Remote SQL: ... ORDER BY order_date DESC LIMIT 100

-- Mixed local and remote (no join pushdown)
CREATE TABLE local_products (
    id INT PRIMARY KEY,
    name VARCHAR(200)
);

EXPLAIN (VERBOSE, COSTS OFF)
SELECT
    o.id,
    p.name
FROM remote_orders o
JOIN local_products p ON o.customer_id = p.id;
-- Join executed locally, all remote_orders rows fetched

-- Force local execution (use_remote_estimate)
ALTER SERVER remote_db
OPTIONS (ADD use_remote_estimate 'true');

-- Control fetch size for large result sets
ALTER SERVER remote_db
OPTIONS (ADD fetch_size '50000');

-- Disable join pushdown if needed
ALTER FOREIGN TABLE remote_orders
OPTIONS (ADD use_remote_estimate 'false');
```

## Performance Considerations

### Theory
FDW performance depends on:
- Network latency
- Query pushdown effectiveness
- Fetch size configuration
- Remote server performance
- Data volume

### Examples

```sql
-- Optimize fetch size for bulk operations
ALTER SERVER remote_db
OPTIONS (SET fetch_size '100000');

-- Use remote estimates for better query planning
ALTER SERVER remote_db
OPTIONS (SET use_remote_estimate 'true');

-- Analyze foreign tables for statistics
ANALYZE remote_orders;

-- Create local indexes on foreign key columns
CREATE INDEX idx_orders_customer ON local_orders (customer_id);

-- Materialize frequently accessed remote data
CREATE MATERIALIZED VIEW local_recent_orders AS
SELECT * FROM remote_orders
WHERE order_date >= CURRENT_DATE - INTERVAL '30 days';

CREATE INDEX idx_recent_orders_date ON local_recent_orders (order_date);

-- Refresh materialized view periodically
REFRESH MATERIALIZED VIEW CONCURRENTLY local_recent_orders;

-- Use batch operations for writes
BEGIN;
INSERT INTO remote_orders
SELECT * FROM staging_orders
WHERE processed = false;
UPDATE staging_orders SET processed = true;
COMMIT;

-- Parallel query (PostgreSQL 14+)
SET max_parallel_workers_per_gather = 4;

-- Async execution for multiple foreign servers
SELECT * FROM remote_orders_server1
UNION ALL
SELECT * FROM remote_orders_server2;

-- Benchmark query performance
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT
    customer_id,
    COUNT(*) AS order_count,
    SUM(total) AS total_spent
FROM remote_orders
WHERE order_date >= '2024-01-01'
GROUP BY customer_id
HAVING SUM(total) > 1000;

-- Compare local vs remote execution
-- Remote execution
EXPLAIN ANALYZE
SELECT COUNT(*) FROM remote_orders WHERE status = 'completed';

-- Materialized execution
EXPLAIN ANALYZE
SELECT COUNT(*) FROM local_recent_orders WHERE status = 'completed';
```

## Other FDW Extensions

### Theory
PostgreSQL ecosystem includes FDWs for many external systems:

- **mysql_fdw**: Connect to MySQL/MariaDB
- **oracle_fdw**: Connect to Oracle databases
- **mongo_fdw**: Connect to MongoDB
- **redis_fdw**: Connect to Redis
- **multicorn**: Framework for writing custom FDWs in Python
- **www_fdw**: Query web APIs
- **parquet_fdw**: Read Parquet files

### Examples

```sql
-- mysql_fdw (conceptual - requires installation)
/*
CREATE EXTENSION mysql_fdw;

CREATE SERVER mysql_server
FOREIGN DATA WRAPPER mysql_fdw
OPTIONS (
    host 'mysql.example.com',
    port '3306'
);

CREATE USER MAPPING FOR CURRENT_USER
SERVER mysql_server
OPTIONS (
    username 'mysql_user',
    password 'mysql_pass'
);

CREATE FOREIGN TABLE mysql_products (
    id INT,
    name VARCHAR(200),
    price DECIMAL(10, 2)
)
SERVER mysql_server
OPTIONS (
    dbname 'ecommerce',
    table_name 'products'
);
*/

-- mongo_fdw (conceptual)
/*
CREATE EXTENSION mongo_fdw;

CREATE SERVER mongo_server
FOREIGN DATA WRAPPER mongo_fdw
OPTIONS (
    address 'mongodb://mongo.example.com:27017',
    authentication_database 'admin'
);

CREATE USER MAPPING FOR CURRENT_USER
SERVER mongo_server
OPTIONS (
    username 'mongo_user',
    password 'mongo_pass'
);

CREATE FOREIGN TABLE mongo_users (
    _id NAME,
    name TEXT,
    email TEXT,
    created_at TIMESTAMP
)
SERVER mongo_server
OPTIONS (
    database 'app',
    collection 'users'
);
*/

-- multicorn (Python-based custom FDW)
/*
CREATE EXTENSION multicorn;

CREATE SERVER rss_server
FOREIGN DATA WRAPPER multicorn
OPTIONS (
    wrapper 'multicorn.rssfdw.RssFdw'
);

CREATE FOREIGN TABLE rss_feed (
    title TEXT,
    link TEXT,
    description TEXT,
    pubdate TIMESTAMP
)
SERVER rss_server
OPTIONS (
    url 'https://example.com/feed.xml'
);
*/

-- Practical example: Combining multiple data sources
CREATE VIEW unified_customers AS
SELECT
    id,
    name,
    email,
    'postgresql' AS source
FROM local_customers
UNION ALL
SELECT
    id,
    name,
    email,
    'remote_pg' AS source
FROM remote_customers;
-- UNION ALL
-- SELECT
--     id::INT,
--     name,
--     email,
--     'mysql' AS source
-- FROM mysql_customers;
```

## Materialized Foreign Data

### Theory
Materialized views can cache foreign data locally, improving query performance at the cost of freshness. Useful for:
- Frequently accessed remote data
- Slow remote queries
- Reducing remote server load
- Offline access to remote data

### Examples

```sql
-- Create materialized view from foreign table
CREATE MATERIALIZED VIEW cached_orders AS
SELECT
    o.id,
    o.order_date,
    o.total,
    c.name AS customer_name,
    c.country
FROM remote_orders o
JOIN remote_customers c ON o.customer_id = c.id
WHERE o.order_date >= CURRENT_DATE - INTERVAL '90 days';

-- Create indexes on materialized view
CREATE INDEX idx_cached_orders_date ON cached_orders (order_date);
CREATE INDEX idx_cached_orders_country ON cached_orders (country);

-- Query cached data (fast)
SELECT
    country,
    COUNT(*) AS order_count,
    SUM(total) AS revenue
FROM cached_orders
GROUP BY country
ORDER BY revenue DESC;

-- Refresh periodically (manual or scheduled)
REFRESH MATERIALIZED VIEW cached_orders;

-- Concurrent refresh (allows reads during refresh)
REFRESH MATERIALIZED VIEW CONCURRENTLY cached_orders;

-- Automatic refresh with pg_cron
/*
CREATE EXTENSION pg_cron;

SELECT cron.schedule(
    'refresh-cached-orders',
    '0 * * * *',  -- Every hour
    'REFRESH MATERIALIZED VIEW CONCURRENTLY cached_orders'
);
*/

-- Incremental refresh pattern
CREATE TABLE orders_cache (
    id BIGINT PRIMARY KEY,
    order_date DATE,
    total DECIMAL(10, 2),
    customer_name VARCHAR(200),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_cache_date ON orders_cache (order_date);

-- Function to incrementally update cache
CREATE OR REPLACE FUNCTION refresh_orders_cache()
RETURNS void AS $$
DECLARE
    last_sync TIMESTAMP;
BEGIN
    -- Get last sync time
    SELECT COALESCE(MAX(last_updated), '1970-01-01') INTO last_sync
    FROM orders_cache;

    -- Delete changed/deleted records
    DELETE FROM orders_cache
    WHERE id IN (
        SELECT id FROM remote_orders
        WHERE order_date >= last_sync::DATE - INTERVAL '7 days'
    );

    -- Insert new/updated records
    INSERT INTO orders_cache (id, order_date, total, customer_name)
    SELECT
        o.id,
        o.order_date,
        o.total,
        c.name
    FROM remote_orders o
    JOIN remote_customers c ON o.customer_id = c.id
    WHERE o.order_date >= last_sync::DATE - INTERVAL '7 days'
    ON CONFLICT (id) DO UPDATE SET
        order_date = EXCLUDED.order_date,
        total = EXCLUDED.total,
        customer_name = EXCLUDED.customer_name,
        last_updated = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Hybrid approach: recent data from remote, historical from cache
CREATE VIEW orders_hybrid AS
SELECT * FROM remote_orders
WHERE order_date >= CURRENT_DATE - INTERVAL '7 days'
UNION ALL
SELECT id, order_date, total, NULL::INT, NULL::VARCHAR(20)
FROM orders_cache
WHERE order_date < CURRENT_DATE - INTERVAL '7 days';
```

## Security Considerations

### Theory
FDW security is critical as it involves credentials and data access across systems.

**Security Best Practices:**
- Use password-less authentication when possible (SSL certs, peer auth)
- Store passwords securely (consider pg_hba.conf, connection service files)
- Restrict user mapping to specific roles
- Limit foreign table permissions
- Use SSL for remote connections
- Audit foreign data access

### Examples

```sql
-- Use connection service file instead of embedding passwords
-- ~/.pg_service.conf:
-- [remote_analytics]
-- host=analytics.example.com
-- port=5432
-- dbname=analytics
-- user=fdw_user
-- password=secure_password

CREATE SERVER analytics_server
FOREIGN DATA WRAPPER postgres_fdw
OPTIONS (service 'remote_analytics');

-- No password in user mapping
CREATE USER MAPPING FOR CURRENT_USER
SERVER analytics_server;

-- Use SSL for connections
CREATE SERVER secure_server
FOREIGN DATA WRAPPER postgres_fdw
OPTIONS (
    host 'remote.example.com',
    dbname 'production',
    port '5432',
    sslmode 'require',
    sslcert '/path/to/client-cert.pem',
    sslkey '/path/to/client-key.pem',
    sslrootcert '/path/to/ca-cert.pem'
);

-- Restrict access to foreign tables
CREATE ROLE fdw_reader;
GRANT USAGE ON FOREIGN SERVER analytics_server TO fdw_reader;
GRANT SELECT ON remote_analytics.sales TO fdw_reader;

-- Revoke write access
REVOKE INSERT, UPDATE, DELETE ON remote_analytics.sales FROM fdw_reader;

-- Create wrapper view with RLS
CREATE VIEW sales_view AS
SELECT * FROM remote_analytics.sales;

ALTER VIEW sales_view OWNER TO fdw_reader;
GRANT SELECT ON sales_view TO app_users;

-- Audit foreign table access
CREATE TABLE fdw_audit_log (
    id SERIAL PRIMARY KEY,
    username TEXT,
    foreign_table TEXT,
    operation TEXT,
    query_text TEXT,
    access_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger function for audit (simplified)
CREATE OR REPLACE FUNCTION log_fdw_access()
RETURNS event_trigger AS $$
BEGIN
    INSERT INTO fdw_audit_log (username, operation, query_text)
    VALUES (CURRENT_USER, TG_EVENT, current_query());
END;
$$ LANGUAGE plpgsql;

-- Use read-only user for foreign connections
-- On remote server:
-- CREATE ROLE fdw_readonly;
-- GRANT CONNECT ON DATABASE analytics TO fdw_readonly;
-- GRANT USAGE ON SCHEMA public TO fdw_readonly;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO fdw_readonly;

-- Encrypt sensitive data in foreign tables
CREATE VIEW encrypted_customer_data AS
SELECT
    id,
    name,
    pgp_sym_encrypt(email, 'encryption_key') AS encrypted_email
FROM remote_customers;
```

## Common Mistakes

1. **Not creating indexes on join columns**
   ```sql
   -- Wrong: No index, slow joins
   SELECT * FROM local_table l
   JOIN remote_table r ON l.id = r.local_id;

   -- Right: Index on join column
   CREATE INDEX idx_local_id ON local_table (id);
   ```

2. **Fetching too much data from remote**
   ```sql
   -- Wrong: Fetch all, filter locally
   SELECT * FROM remote_large_table WHERE local_condition;

   -- Right: Push filter to remote
   SELECT * FROM remote_large_table WHERE remote_column = 'value';
   ```

3. **Not using materialized views for slow queries**
   ```sql
   -- Wrong: Query remote every time
   SELECT * FROM complex_remote_join;

   -- Right: Materialize and refresh
   CREATE MATERIALIZED VIEW cached_complex_join AS
   SELECT * FROM complex_remote_join;
   ```

4. **Embedding passwords in code**
   ```sql
   -- Wrong: Password in database
   CREATE USER MAPPING FOR user SERVER srv
   OPTIONS (password 'plaintext');

   -- Right: Use service file or cert auth
   CREATE SERVER srv OPTIONS (service 'myservice');
   ```

5. **Not setting appropriate fetch_size**
   ```sql
   -- Default fetch_size may be too small
   -- Adjust based on query patterns
   ALTER SERVER remote_db OPTIONS (SET fetch_size '50000');
   ```

6. **Mixing local and remote aggregations inefficiently**
   ```sql
   -- Wrong: Aggregate after fetching all data
   SELECT customer_id, SUM(total)
   FROM remote_orders
   GROUP BY customer_id;

   -- Right: Let remote server aggregate
   -- (postgres_fdw does this automatically with pushdown)
   ```

## Best Practices

1. **Use materialized views for frequently accessed data**
   ```sql
   CREATE MATERIALIZED VIEW cached_data AS
   SELECT * FROM remote_expensive_query;

   CREATE INDEX idx_cached ON cached_data (key_column);

   -- Refresh during off-peak hours
   REFRESH MATERIALIZED VIEW CONCURRENTLY cached_data;
   ```

2. **Configure fetch_size based on workload**
   ```sql
   -- OLTP: smaller fetch size
   ALTER SERVER oltp_server OPTIONS (SET fetch_size '1000');

   -- Analytics: larger fetch size
   ALTER SERVER analytics_server OPTIONS (SET fetch_size '100000');
   ```

3. **Use connection pooling for remote servers**
   ```sql
   ALTER SERVER remote_db
   OPTIONS (ADD keep_connections 'off');  -- Close idle connections
   ```

4. **Monitor foreign query performance**
   ```sql
   -- Enable timing
   \timing

   -- Use EXPLAIN to verify pushdown
   EXPLAIN (VERBOSE, ANALYZE)
   SELECT * FROM remote_table WHERE condition;
   ```

5. **Separate read and write servers**
   ```sql
   CREATE SERVER read_replica
   FOREIGN DATA WRAPPER postgres_fdw
   OPTIONS (host 'replica.example.com', dbname 'app');

   CREATE SERVER write_primary
   FOREIGN DATA WRAPPER postgres_fdw
   OPTIONS (host 'primary.example.com', dbname 'app');
   ```

6. **Use async execution for multiple foreign servers**
   ```sql
   SET enable_async_append = on;

   SELECT * FROM server1_table
   UNION ALL
   SELECT * FROM server2_table;
   ```

## Practice Exercises

### Exercise 1: Multi-Database Analytics Platform
Create a federated analytics system combining data from multiple PostgreSQL databases.

**Requirements:**
1. Set up foreign servers for sales, inventory, and customer databases
2. Create unified views joining data across servers
3. Implement materialized views for performance
4. Create refresh strategy for materialized views
5. Build analytics queries leveraging query pushdown

**Solution:**
```sql
-- Install extension
CREATE EXTENSION IF NOT EXISTS postgres_fdw;

-- Create foreign servers
CREATE SERVER sales_db
FOREIGN DATA WRAPPER postgres_fdw
OPTIONS (
    host 'sales.example.com',
    port '5432',
    dbname 'sales',
    fetch_size '50000',
    use_remote_estimate 'true'
);

CREATE SERVER inventory_db
FOREIGN DATA WRAPPER postgres_fdw
OPTIONS (
    host 'inventory.example.com',
    port '5432',
    dbname 'inventory',
    fetch_size '50000',
    use_remote_estimate 'true'
);

CREATE SERVER customer_db
FOREIGN DATA WRAPPER postgres_fdw
OPTIONS (
    host 'customer.example.com',
    port '5432',
    dbname 'customers',
    fetch_size '50000',
    use_remote_estimate 'true'
);

-- Create user mappings
CREATE USER MAPPING FOR CURRENT_USER SERVER sales_db
OPTIONS (user 'analytics_user', password 'sales_pass');

CREATE USER MAPPING FOR CURRENT_USER SERVER inventory_db
OPTIONS (user 'analytics_user', password 'inventory_pass');

CREATE USER MAPPING FOR CURRENT_USER SERVER customer_db
OPTIONS (user 'analytics_user', password 'customer_pass');

-- Create schemas for foreign tables
CREATE SCHEMA IF NOT EXISTS fdw_sales;
CREATE SCHEMA IF NOT EXISTS fdw_inventory;
CREATE SCHEMA IF NOT EXISTS fdw_customers;

-- Import schemas
IMPORT FOREIGN SCHEMA public
LIMIT TO (orders, order_items, payments)
FROM SERVER sales_db
INTO fdw_sales;

IMPORT FOREIGN SCHEMA public
LIMIT TO (products, stock_levels, warehouses)
FROM SERVER inventory_db
INTO fdw_inventory;

IMPORT FOREIGN SCHEMA public
LIMIT TO (customers, addresses, preferences)
FROM SERVER customer_db
INTO fdw_customers;

-- Unified sales view
CREATE VIEW unified_sales AS
SELECT
    o.id AS order_id,
    o.order_date,
    o.status,
    c.id AS customer_id,
    c.name AS customer_name,
    c.email AS customer_email,
    oi.product_id,
    p.product_name,
    oi.quantity,
    oi.price,
    oi.quantity * oi.price AS line_total,
    s.quantity_available AS stock_level
FROM fdw_sales.orders o
JOIN fdw_sales.order_items oi ON o.id = oi.order_id
JOIN fdw_customers.customers c ON o.customer_id = c.id
JOIN fdw_inventory.products p ON oi.product_id = p.id
LEFT JOIN fdw_inventory.stock_levels s ON p.id = s.product_id;

-- Materialized view for recent sales analytics
CREATE MATERIALIZED VIEW recent_sales_analytics AS
SELECT
    order_date,
    customer_id,
    customer_name,
    product_id,
    product_name,
    SUM(quantity) AS total_quantity,
    SUM(line_total) AS total_revenue,
    COUNT(DISTINCT order_id) AS order_count
FROM unified_sales
WHERE order_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY order_date, customer_id, customer_name, product_id, product_name;

-- Indexes on materialized view
CREATE INDEX idx_recent_sales_date ON recent_sales_analytics (order_date);
CREATE INDEX idx_recent_sales_customer ON recent_sales_analytics (customer_id);
CREATE INDEX idx_recent_sales_product ON recent_sales_analytics (product_id);

-- Daily sales summary (heavily materialized)
CREATE MATERIALIZED VIEW daily_sales_summary AS
SELECT
    order_date,
    COUNT(DISTINCT order_id) AS orders,
    COUNT(DISTINCT customer_id) AS unique_customers,
    SUM(total_revenue) AS revenue,
    AVG(total_revenue) AS avg_order_value
FROM recent_sales_analytics
GROUP BY order_date
ORDER BY order_date;

CREATE INDEX idx_daily_summary_date ON daily_sales_summary (order_date);

-- Product performance view
CREATE MATERIALIZED VIEW product_performance AS
SELECT
    p.id,
    p.product_name,
    p.category,
    COUNT(DISTINCT o.order_id) AS times_ordered,
    SUM(oi.quantity) AS units_sold,
    SUM(oi.quantity * oi.price) AS total_revenue,
    AVG(oi.price) AS avg_price,
    s.quantity_available AS current_stock
FROM fdw_inventory.products p
LEFT JOIN fdw_sales.order_items oi ON p.id = oi.product_id
LEFT JOIN fdw_sales.orders o ON oi.order_id = o.id AND o.order_date >= CURRENT_DATE - INTERVAL '30 days'
LEFT JOIN fdw_inventory.stock_levels s ON p.id = s.product_id
GROUP BY p.id, p.product_name, p.category, s.quantity_available;

CREATE INDEX idx_product_perf_revenue ON product_performance (total_revenue DESC);

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY recent_sales_analytics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_sales_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY product_performance;

    RAISE NOTICE 'Analytics views refreshed at %', CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Test queries
-- Top customers last 30 days
SELECT
    customer_name,
    SUM(total_revenue) AS total_spent,
    COUNT(DISTINCT order_date) AS days_ordered
FROM recent_sales_analytics
WHERE order_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY customer_id, customer_name
ORDER BY total_spent DESC
LIMIT 10;

-- Product stock alerts
SELECT
    product_name,
    units_sold,
    current_stock,
    CASE
        WHEN current_stock < units_sold * 0.5 THEN 'CRITICAL'
        WHEN current_stock < units_sold THEN 'LOW'
        ELSE 'OK'
    END AS stock_status
FROM product_performance
WHERE units_sold > 0
ORDER BY current_stock::FLOAT / NULLIF(units_sold, 0);

-- Sales trend
SELECT
    order_date,
    revenue,
    revenue - LAG(revenue) OVER (ORDER BY order_date) AS daily_change,
    AVG(revenue) OVER (ORDER BY order_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS moving_avg_7day
FROM daily_sales_summary
ORDER BY order_date DESC
LIMIT 30;
```

### Exercise 2: Log Analysis System with file_fdw
Build a log analysis system that queries log files directly using file_fdw.

**Requirements:**
1. Create foreign tables for different log file formats
2. Implement log parsing and aggregation
3. Create materialized views for common queries
4. Build error detection and alerting queries
5. Implement log retention and archival patterns

**Solution:**
```sql
-- Install file_fdw
CREATE EXTENSION IF NOT EXISTS file_fdw;

-- Create file server
CREATE SERVER log_files
FOREIGN DATA WRAPPER file_fdw;

-- Application logs (CSV format)
CREATE FOREIGN TABLE application_logs (
    timestamp TIMESTAMP,
    level VARCHAR(10),
    logger VARCHAR(100),
    message TEXT,
    user_id INT,
    request_id UUID,
    duration_ms INT
)
SERVER log_files
OPTIONS (
    filename '/var/log/app/application.log',
    format 'csv',
    delimiter '|',
    header 'false',
    null ''
);

-- Access logs (Apache/Nginx format)
CREATE FOREIGN TABLE access_logs (
    ip_address INET,
    timestamp TIMESTAMP,
    method VARCHAR(10),
    path TEXT,
    status_code INT,
    response_size INT,
    user_agent TEXT,
    response_time_ms INT
)
SERVER log_files
OPTIONS (
    filename '/var/log/nginx/access.log',
    format 'csv',
    delimiter ' '
);

-- Error logs
CREATE FOREIGN TABLE error_logs (
    timestamp TIMESTAMP,
    error_level VARCHAR(20),
    error_code VARCHAR(50),
    error_message TEXT,
    stack_trace TEXT
)
SERVER log_files
OPTIONS (
    filename '/var/log/app/errors.log',
    format 'csv',
    delimiter '||'
);

-- Query recent errors
SELECT
    timestamp,
    level,
    logger,
    message
FROM application_logs
WHERE level IN ('ERROR', 'FATAL')
  AND timestamp >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
ORDER BY timestamp DESC;

-- Error rate by hour
SELECT
    DATE_TRUNC('hour', timestamp) AS hour,
    COUNT(*) FILTER (WHERE level = 'ERROR') AS errors,
    COUNT(*) FILTER (WHERE level = 'WARN') AS warnings,
    COUNT(*) AS total_logs,
    ROUND(100.0 * COUNT(*) FILTER (WHERE level = 'ERROR') / COUNT(*), 2) AS error_rate_pct
FROM application_logs
WHERE timestamp >= CURRENT_DATE
GROUP BY hour
ORDER BY hour DESC;

-- Slow requests
SELECT
    timestamp,
    user_id,
    message,
    duration_ms
FROM application_logs
WHERE duration_ms > 5000
  AND timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
ORDER BY duration_ms DESC
LIMIT 50;

-- HTTP status code distribution
SELECT
    status_code,
    COUNT(*) AS request_count,
    ROUND(AVG(response_time_ms)::numeric, 2) AS avg_response_time,
    MAX(response_time_ms) AS max_response_time
FROM access_logs
WHERE timestamp >= CURRENT_DATE
GROUP BY status_code
ORDER BY request_count DESC;

-- Top error messages
SELECT
    error_code,
    error_message,
    COUNT(*) AS occurrence_count,
    MIN(timestamp) AS first_seen,
    MAX(timestamp) AS last_seen
FROM error_logs
WHERE timestamp >= CURRENT_DATE
GROUP BY error_code, error_message
ORDER BY occurrence_count DESC
LIMIT 20;

-- Materialize recent logs for faster queries
CREATE MATERIALIZED VIEW recent_app_logs AS
SELECT * FROM application_logs
WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '7 days';

CREATE INDEX idx_recent_logs_timestamp ON recent_app_logs (timestamp);
CREATE INDEX idx_recent_logs_level ON recent_app_logs (level);
CREATE INDEX idx_recent_logs_user ON recent_app_logs (user_id);

-- Error summary view
CREATE MATERIALIZED VIEW daily_error_summary AS
SELECT
    DATE(timestamp) AS log_date,
    level,
    logger,
    COUNT(*) AS error_count,
    ARRAY_AGG(DISTINCT message) AS sample_messages
FROM application_logs
WHERE level IN ('ERROR', 'FATAL')
  AND timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(timestamp), level, logger;

CREATE INDEX idx_error_summary_date ON daily_error_summary (log_date DESC);

-- Performance monitoring view
CREATE VIEW performance_metrics AS
SELECT
    DATE_TRUNC('minute', timestamp) AS minute,
    COUNT(*) AS requests_per_minute,
    AVG(duration_ms) AS avg_duration,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95_duration,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_ms) AS p99_duration,
    MAX(duration_ms) AS max_duration
FROM application_logs
WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
  AND duration_ms IS NOT NULL
GROUP BY minute
ORDER BY minute DESC;

-- Alert detection function
CREATE OR REPLACE FUNCTION detect_log_anomalies()
RETURNS TABLE (
    alert_type TEXT,
    severity TEXT,
    description TEXT,
    count BIGINT
) AS $$
BEGIN
    -- High error rate
    RETURN QUERY
    SELECT
        'HIGH_ERROR_RATE'::TEXT,
        'CRITICAL'::TEXT,
        'Error rate exceeded 5% in last hour'::TEXT,
        COUNT(*)
    FROM application_logs
    WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
      AND level = 'ERROR'
    HAVING COUNT(*) > (
        SELECT COUNT(*) * 0.05
        FROM application_logs
        WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
    );

    -- Repeated errors
    RETURN QUERY
    SELECT
        'REPEATED_ERROR'::TEXT,
        'WARNING'::TEXT,
        'Same error occurred ' || COUNT(*) || ' times: ' || message,
        COUNT(*)
    FROM application_logs
    WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '15 minutes'
      AND level = 'ERROR'
    GROUP BY message
    HAVING COUNT(*) >= 10;

    -- Slow requests
    RETURN QUERY
    SELECT
        'SLOW_REQUESTS'::TEXT,
        'WARNING'::TEXT,
        'Requests slower than 10s detected'::TEXT,
        COUNT(*)
    FROM application_logs
    WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '15 minutes'
      AND duration_ms > 10000
    HAVING COUNT(*) > 5;
END;
$$ LANGUAGE plpgsql;

-- Test anomaly detection
SELECT * FROM detect_log_anomalies();

-- Refresh materialized views
SELECT cron.schedule(
    'refresh-log-views',
    '*/5 * * * *',  -- Every 5 minutes
    $$
    REFRESH MATERIALIZED VIEW CONCURRENTLY recent_app_logs;
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_error_summary;
    $$
);
```

### Exercise 3: Hybrid Local/Remote Data Architecture
Design a system that intelligently combines local and remote data based on access patterns.

**Requirements:**
1. Recent data from remote, historical data local
2. Automatic data aging and archival
3. Transparent view that queries both sources
4. Performance monitoring and optimization
5. Incremental sync strategy

**Solution:**
```sql
-- Local archived orders table
CREATE TABLE archived_orders (
    id BIGINT PRIMARY KEY,
    order_date DATE NOT NULL,
    customer_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20),
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_archived_orders_date ON archived_orders (order_date);
CREATE INDEX idx_archived_orders_customer ON archived_orders (customer_id);

-- Remote recent orders (foreign table)
CREATE SERVER production_db
FOREIGN DATA WRAPPER postgres_fdw
OPTIONS (host 'prod.example.com', dbname 'ecommerce', port '5432');

CREATE USER MAPPING FOR CURRENT_USER SERVER production_db
OPTIONS (user 'readonly_user', password 'secure_pass');

CREATE FOREIGN TABLE remote_recent_orders (
    id BIGINT,
    order_date DATE,
    customer_id INT,
    product_id INT,
    quantity INT,
    total_amount DECIMAL(10, 2),
    status VARCHAR(20),
    updated_at TIMESTAMP
)
SERVER production_db
OPTIONS (schema_name 'public', table_name 'orders');

-- Unified view (automatic routing)
CREATE VIEW all_orders AS
-- Recent orders from remote
SELECT
    id,
    order_date,
    customer_id,
    product_id,
    quantity,
    total_amount,
    status,
    'remote' AS data_source
FROM remote_recent_orders
WHERE order_date >= CURRENT_DATE - INTERVAL '90 days'
UNION ALL
-- Historical orders from local archive
SELECT
    id,
    order_date,
    customer_id,
    product_id,
    quantity,
    total_amount,
    status,
    'archive' AS data_source
FROM archived_orders
WHERE order_date < CURRENT_DATE - INTERVAL '90 days';

-- Archive old orders function
CREATE OR REPLACE FUNCTION archive_old_orders()
RETURNS TABLE (
    orders_archived BIGINT,
    date_range TEXT
) AS $$
DECLARE
    v_archived_count BIGINT;
    v_cutoff_date DATE;
BEGIN
    v_cutoff_date := CURRENT_DATE - INTERVAL '90 days';

    -- Copy old orders to archive
    WITH inserted AS (
        INSERT INTO archived_orders
        SELECT
            id,
            order_date,
            customer_id,
            product_id,
            quantity,
            total_amount,
            status,
            CURRENT_TIMESTAMP
        FROM remote_recent_orders
        WHERE order_date < v_cutoff_date
          AND id NOT IN (SELECT id FROM archived_orders)
        RETURNING *
    )
    SELECT COUNT(*) INTO v_archived_count FROM inserted;

    RETURN QUERY
    SELECT
        v_archived_count,
        'Orders before ' || v_cutoff_date || ' archived';
END;
$$ LANGUAGE plpgsql;

-- Incremental sync function
CREATE TABLE sync_log (
    id SERIAL PRIMARY KEY,
    sync_type VARCHAR(50),
    records_processed BIGINT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    status VARCHAR(20)
);

CREATE OR REPLACE FUNCTION incremental_sync_orders()
RETURNS void AS $$
DECLARE
    v_sync_id INT;
    v_last_sync TIMESTAMP;
    v_count BIGINT;
BEGIN
    -- Log sync start
    INSERT INTO sync_log (sync_type, started_at, status)
    VALUES ('incremental_orders', CURRENT_TIMESTAMP, 'running')
    RETURNING id INTO v_sync_id;

    -- Get last successful sync time
    SELECT COALESCE(MAX(completed_at), '1970-01-01')
    INTO v_last_sync
    FROM sync_log
    WHERE sync_type = 'incremental_orders' AND status = 'completed';

    -- Upsert changed records
    WITH upserted AS (
        INSERT INTO archived_orders
        SELECT
            id,
            order_date,
            customer_id,
            product_id,
            quantity,
            total_amount,
            status,
            CURRENT_TIMESTAMP
        FROM remote_recent_orders
        WHERE updated_at > v_last_sync
          AND order_date < CURRENT_DATE - INTERVAL '90 days'
        ON CONFLICT (id) DO UPDATE SET
            order_date = EXCLUDED.order_date,
            customer_id = EXCLUDED.customer_id,
            product_id = EXCLUDED.product_id,
            quantity = EXCLUDED.quantity,
            total_amount = EXCLUDED.total_amount,
            status = EXCLUDED.status,
            archived_at = CURRENT_TIMESTAMP
        RETURNING *
    )
    SELECT COUNT(*) INTO v_count FROM upserted;

    -- Log completion
    UPDATE sync_log
    SET
        records_processed = v_count,
        completed_at = CURRENT_TIMESTAMP,
        status = 'completed'
    WHERE id = v_sync_id;

    RAISE NOTICE 'Synced % orders', v_count;
END;
$$ LANGUAGE plpgsql;

-- Performance comparison query
CREATE OR REPLACE FUNCTION compare_query_performance()
RETURNS TABLE (
    query_type TEXT,
    source TEXT,
    execution_time_ms NUMERIC,
    rows_returned BIGINT
) AS $$
DECLARE
    v_start TIMESTAMP;
    v_end TIMESTAMP;
    v_count BIGINT;
BEGIN
    -- Query remote
    v_start := CLOCK_TIMESTAMP();
    SELECT COUNT(*) INTO v_count
    FROM remote_recent_orders
    WHERE order_date >= '2024-01-01';
    v_end := CLOCK_TIMESTAMP();

    RETURN QUERY
    SELECT
        'date_filter'::TEXT,
        'remote'::TEXT,
        EXTRACT(EPOCH FROM (v_end - v_start)) * 1000,
        v_count;

    -- Query local
    v_start := CLOCK_TIMESTAMP();
    SELECT COUNT(*) INTO v_count
    FROM archived_orders
    WHERE order_date >= '2023-01-01' AND order_date < '2023-12-31';
    v_end := CLOCK_TIMESTAMP();

    RETURN QUERY
    SELECT
        'date_filter'::TEXT,
        'local'::TEXT,
        EXTRACT(EPOCH FROM (v_end - v_start)) * 1000,
        v_count;

    -- Query hybrid
    v_start := CLOCK_TIMESTAMP();
    SELECT COUNT(*) INTO v_count
    FROM all_orders
    WHERE order_date >= '2023-01-01';
    v_end := CLOCK_TIMESTAMP();

    RETURN QUERY
    SELECT
        'date_filter'::TEXT,
        'hybrid'::TEXT,
        EXTRACT(EPOCH FROM (v_end - v_start)) * 1000,
        v_count;
END;
$$ LANGUAGE plpgsql;

-- Test performance
SELECT * FROM compare_query_performance();

-- Schedule archival and sync
-- SELECT cron.schedule('archive-orders', '0 2 * * *', 'SELECT archive_old_orders()');
-- SELECT cron.schedule('sync-orders', '0 */6 * * *', 'SELECT incremental_sync_orders()');

-- Analytics using hybrid view
SELECT
    DATE_TRUNC('month', order_date) AS month,
    COUNT(*) AS orders,
    SUM(total_amount) AS revenue,
    data_source
FROM all_orders
WHERE order_date >= '2023-01-01'
GROUP BY month, data_source
ORDER BY month, data_source;
```

## Summary

Foreign Data Wrappers provide powerful capabilities for accessing external data:
- **postgres_fdw**: Connect to remote PostgreSQL databases with query pushdown
- **file_fdw**: Query files (CSV, logs) directly
- **Query Pushdown**: Optimize performance by executing filters/joins remotely
- **Materialized Views**: Cache foreign data locally for performance
- **Security**: Use proper authentication and encryption
- **Hybrid Architectures**: Combine local and remote data intelligently

FDWs enable building federated databases and data integration platforms without complex ETL processes.
