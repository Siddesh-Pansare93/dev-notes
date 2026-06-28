# Connection Pooling

## Theory

PostgreSQL uses a process-per-connection architecture where each client connection spawns a separate backend process. This architecture provides strong isolation but comes with significant overhead when handling many concurrent connections. Connection pooling solves this by maintaining a pool of reusable connections, dramatically reducing connection overhead and improving scalability.

### Key Concepts

**Process-Per-Connection**: PostgreSQL's architecture where each client connection creates a new operating system process. This provides isolation but consumes significant resources (memory, CPU for process creation/destruction).

**Connection Overhead**: The cost of establishing a new connection includes:
- TCP handshake
- SSL negotiation (if enabled)
- Authentication
- Backend process creation (~5-10 MB memory per connection)
- Session initialization

**Connection Pooling**: Maintaining a pool of pre-established database connections that can be reused by multiple clients, amortizing connection overhead across many requests.

**Connection Pool Modes**:
- **Session Pooling**: Client gets exclusive connection for entire session (until disconnect)
- **Transaction Pooling**: Connection returned to pool after each transaction (most common)
- **Statement Pooling**: Connection returned after each statement (rare, breaks multi-statement transactions)

**PgBouncer**: Lightweight connection pooler for PostgreSQL, written in C, acts as a proxy between clients and database servers.

**Pgpool-II**: More feature-rich middleware with pooling, load balancing, replication, and query caching capabilities.

**max_connections**: PostgreSQL configuration parameter limiting total connections. Default is typically 100-200, which can be too low for high-concurrency applications.

**Connection Exhaustion**: When max_connections is reached, new connections are rejected with "too many connections" error.

### Why Connection Pooling Matters

- **Reduces Overhead**: Eliminates repeated connection/disconnection costs
- **Improves Scalability**: Supports thousands of application connections with hundreds of database connections
- **Better Resource Usage**: Fewer database processes mean less memory and CPU usage
- **Faster Response**: Reusing connections is much faster than creating new ones
- **Connection Limiting**: Protects database from connection exhaustion

### Typical Connection Overhead

Without pooling:
- Connection creation: 10-50ms
- Memory per connection: 5-10 MB
- Max practical connections: 200-500 (depending on hardware)

With pooling:
- Connection reuse: <1ms
- Memory per pool connection: 5-10 MB
- Application connections: 1000s-10000s (with much fewer database connections)

## Syntax

### PgBouncer Configuration

```ini
# /etc/pgbouncer/pgbouncer.ini

[databases]
# Database connection strings
mydb = host=localhost port=5432 dbname=mydb
mydb_ro = host=replica.example.com port=5432 dbname=mydb

# Fallback parameters for all databases
* = host=localhost

[pgbouncer]
# Connection pooling mode
pool_mode = transaction  # session | transaction | statement

# Listen address and port
listen_addr = *
listen_port = 6432

# Authentication
auth_type = md5  # or scram-sha-256, trust, cert, etc.
auth_file = /etc/pgbouncer/userlist.txt

# Pool size settings
default_pool_size = 25          # Connections per user+database pair
min_pool_size = 5               # Minimum connections to keep open
reserve_pool_size = 5           # Additional connections for emergency
max_client_conn = 1000          # Maximum client connections
max_db_connections = 100        # Total connections to database
max_user_connections = 100      # Connections per user

# Timeouts (in seconds)
server_idle_timeout = 600       # Close unused server connections
server_lifetime = 3600          # Reconnect after this time
server_connect_timeout = 15     # Timeout for new connections
query_timeout = 0               # Query timeout (0 = disabled)
query_wait_timeout = 120        # Wait time for connection from pool
client_idle_timeout = 0         # Disconnect idle clients
idle_transaction_timeout = 0    # Disconnect idle transactions

# Logging
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1
admin_users = postgres
stats_users = postgres
```

### PgBouncer User Authentication File

```txt
# /etc/pgbouncer/userlist.txt
# Format: "username" "password"
"myuser" "md5d8578edf8458ce06fbc5bb76a58c5ca4"
"appuser" "md5a3f5d2b4c1e6f7a8b9c0d1e2f3a4b5c6"
```

### PgBouncer Admin Commands

```sql
-- Connect to pgbouncer admin console
psql -p 6432 -U postgres pgbouncer

-- Show pool statistics
SHOW POOLS;

-- Show client connections
SHOW CLIENTS;

-- Show server connections
SHOW SERVERS;

-- Show databases
SHOW DATABASES;

-- Show configuration
SHOW CONFIG;

-- Show statistics
SHOW STATS;

-- Show statistics reset
SHOW STATS_TOTALS;

-- Reload configuration
RELOAD;

-- Pause all connections
PAUSE;

-- Resume all connections
RESUME;

-- Disconnect all clients
KILL database_name;

-- Shutdown pgbouncer
SHUTDOWN;
```

### Connection Pool Sizing Formula

```
Optimal Pool Size Formula:
pool_size = ((core_count * 2) + effective_spindle_count)

Where:
- core_count: Number of CPU cores
- effective_spindle_count: Number of disks (or equivalent for SSD)

Example:
- 8 CPU cores
- 2 disks (or SSD)
pool_size = (8 * 2) + 2 = 18

For web applications:
database_connections = application_instances * connections_per_instance
```

## Examples

### Example 1: Understanding Connection Overhead

```sql
-- Check current connection count
SELECT COUNT(*) FROM pg_stat_activity;

-- View active connections with details
SELECT
    pid,
    usename,
    application_name,
    client_addr,
    backend_start,
    state,
    state_change,
    query_start,
    query
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY backend_start;

-- Check max_connections setting
SHOW max_connections;

-- Check memory per connection (approximate)
SELECT
    pg_size_pretty(SUM(pg_database_size(datname))) as total_db_size,
    COUNT(*) as connection_count
FROM pg_stat_activity
JOIN pg_database ON pg_stat_activity.datname = pg_database.datname;

-- Simulate connection overhead
-- Time to create new connection (run from application)
\timing on
\connect postgres
-- Shows connection time

-- Create many connections to demonstrate overhead
DO $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
BEGIN
    start_time := clock_timestamp();

    -- Connection info is in pg_stat_activity
    PERFORM COUNT(*) FROM pg_stat_activity;

    end_time := clock_timestamp();
    RAISE NOTICE 'Query time: %', (end_time - start_time);
END $$;
```

### Example 2: Basic PgBouncer Setup

```bash
# Install PgBouncer (Ubuntu/Debian)
sudo apt-get install pgbouncer

# Create configuration directory
sudo mkdir -p /etc/pgbouncer

# Create pgbouncer.ini
sudo cat > /etc/pgbouncer/pgbouncer.ini << 'EOF'
[databases]
mydb = host=localhost port=5432 dbname=mydb

[pgbouncer]
listen_addr = *
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 20
log_connections = 1
log_disconnections = 1
EOF

# Create user list (get password hash from PostgreSQL)
# First, get password hash from PostgreSQL:
# SELECT 'md5' || md5('password' || 'username');
sudo cat > /etc/pgbouncer/userlist.txt << 'EOF'
"myuser" "md5d8578edf8458ce06fbc5bb76a58c5ca4"
EOF

# Set permissions
sudo chown postgres:postgres /etc/pgbouncer/pgbouncer.ini
sudo chown postgres:postgres /etc/pgbouncer/userlist.txt
sudo chmod 640 /etc/pgbouncer/userlist.txt

# Start PgBouncer
sudo systemctl start pgbouncer
sudo systemctl enable pgbouncer

# Check status
sudo systemctl status pgbouncer
```

### Example 3: Testing PgBouncer

```sql
-- Connect through PgBouncer (port 6432)
psql -h localhost -p 6432 -U myuser -d mydb

-- Regular query (connection from pool)
SELECT NOW(), pg_backend_pid();

-- Check you're connected through PgBouncer
SHOW server_version;  -- Should work
SHOW pool_mode;       -- Should work in admin console

-- Connect to admin console
psql -p 6432 -U postgres pgbouncer

-- View pool statistics
SHOW POOLS;
-- Output shows:
-- database | user   | cl_active | cl_waiting | sv_active | sv_idle | sv_used | sv_tested | sv_login | maxwait
-- mydb     | myuser | 1         | 0          | 1         | 4       | 0       | 0         | 0        | 0

-- Show active clients
SHOW CLIENTS;

-- Show server connections
SHOW SERVERS;

-- Show statistics
SHOW STATS;
-- Output includes:
-- - total_xact_count: Total transactions
-- - total_query_count: Total queries
-- - total_received/sent: Bytes transferred
-- - avg_xact_time: Average transaction time
```

### Example 4: Pool Mode Comparison

```sql
-- SESSION MODE
-- In pgbouncer.ini: pool_mode = session
-- Connect and test

-- Connection 1
psql -h localhost -p 6432 -U myuser -d mydb
SELECT pg_backend_pid();  -- Note PID
BEGIN;
SELECT 1;
-- Don't commit yet

-- Connection 2 (new terminal)
psql -h localhost -p 6432 -U myuser -d mydb
SELECT pg_backend_pid();  -- Different PID (new backend process)

-- TRANSACTION MODE (recommended)
-- In pgbouncer.ini: pool_mode = transaction

-- Connection 1
psql -h localhost -p 6432 -U myuser -d mydb
SELECT pg_backend_pid();  -- Note PID
BEGIN;
SELECT 1;
COMMIT;
SELECT pg_backend_pid();  -- May be different PID (reuses connections)

-- STATEMENT MODE (rarely used)
-- In pgbouncer.ini: pool_mode = statement
-- WARNING: Breaks multi-statement transactions!

-- This will fail in statement mode:
BEGIN;
SELECT 1;
SELECT 2;  -- May use different backend!
COMMIT;    -- Transaction lost
```

### Example 5: Connection Pool Sizing

```sql
-- Calculate optimal pool size
-- Server has 8 CPU cores, SSD storage

-- Formula: (cores * 2) + effective_spindle_count
-- (8 * 2) + 1 = 17 connections

-- In pgbouncer.ini:
-- default_pool_size = 17
-- max_db_connections = 100 (total limit)
-- max_client_conn = 1000 (client connections)

-- Ratio: 1000 clients / 17 database connections = ~59:1

-- Monitor pool utilization
-- In admin console:
SHOW POOLS;

-- If sv_active + sv_idle ≈ default_pool_size consistently,
-- and cl_waiting > 0, increase pool size

-- If sv_idle is always high, decrease pool size
```

### Example 6: Monitoring PgBouncer

```sql
-- Connect to admin console
psql -p 6432 -U postgres pgbouncer

-- Show comprehensive statistics
SHOW STATS;

-- Key metrics to monitor:
-- - total_xact_count: Number of transactions
-- - total_query_count: Number of queries
-- - total_wait_time: Time clients waited for connection
-- - avg_wait_time: Average wait time
-- - avg_query_time: Average query duration

-- Show pool status
SHOW POOLS;

-- Monitor waiting clients
SELECT database, user, cl_waiting
FROM (SELECT * FROM pgbouncer.pools) AS pools
WHERE cl_waiting > 0;

-- Show detailed client connections
SHOW CLIENTS;

-- Show server-side connections
SHOW SERVERS;

-- Calculate pool utilization
SELECT
    database,
    user,
    (sv_active::FLOAT / NULLIF(sv_active + sv_idle, 0) * 100)::NUMERIC(5,2) as utilization_pct,
    sv_active,
    sv_idle,
    cl_active,
    cl_waiting
FROM pgbouncer.pools;
```

### Example 7: Handling Connection Limits

```sql
-- Check current PostgreSQL connection limit
SHOW max_connections;  -- e.g., 100

-- Check active connections
SELECT COUNT(*) FROM pg_stat_activity;

-- View connections by database
SELECT
    datname,
    COUNT(*) as connections,
    (SELECT setting::INT FROM pg_settings WHERE name = 'max_connections') as max_conn,
    ROUND(100.0 * COUNT(*) / (SELECT setting::INT FROM pg_settings WHERE name = 'max_connections'), 2) as pct_used
FROM pg_stat_activity
GROUP BY datname;

-- Connection exhaustion simulation
-- When max_connections reached, new connections fail:
-- ERROR: too many connections for role "user"
-- ERROR: sorry, too many clients already

-- Solution: Increase max_connections (requires restart)
-- In postgresql.conf:
-- max_connections = 200

-- Or use connection pooling to handle more clients with fewer database connections

-- Check reserved connections for superuser
SHOW superuser_reserved_connections;  -- Default 3

-- Total connections = max_connections - superuser_reserved_connections
```

### Example 8: Application-Level Pooling

```python
# Python example using psycopg2 with connection pooling

from psycopg2 import pool

# Create connection pool
connection_pool = pool.SimpleConnectionPool(
    minconn=5,      # Minimum connections
    maxconn=20,     # Maximum connections
    host="localhost",
    port=5432,
    database="mydb",
    user="myuser",
    password="mypass"
)

# Get connection from pool
def execute_query(query):
    conn = connection_pool.getconn()
    try:
        cursor = conn.cursor()
        cursor.execute(query)
        result = cursor.fetchall()
        cursor.close()
        conn.commit()
        return result
    finally:
        # Return connection to pool
        connection_pool.putconn(conn)

# Usage
result = execute_query("SELECT * FROM users LIMIT 10")

# Close all connections when done
connection_pool.closeall()
```

```javascript
// Node.js example using pg with pooling

const { Pool } = require('pg');

// Create connection pool
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mydb',
    user: 'myuser',
    password: 'mypass',
    max: 20,                  // Maximum connections
    min: 5,                   // Minimum connections
    idleTimeoutMillis: 30000, // Close idle connections after 30s
    connectionTimeoutMillis: 2000 // Timeout when waiting for connection
});

// Execute query
async function executeQuery(query) {
    const client = await pool.connect();
    try {
        const result = await client.query(query);
        return result.rows;
    } finally {
        client.release(); // Return to pool
    }
}

// Usage
(async () => {
    const users = await executeQuery('SELECT * FROM users LIMIT 10');
    console.log(users);
})();

// Graceful shutdown
process.on('SIGINT', async () => {
    await pool.end();
    process.exit();
});
```

### Example 9: PgBouncer with Multiple Databases

```ini
# /etc/pgbouncer/pgbouncer.ini

[databases]
# Production database
prod_db = host=prod-db.example.com port=5432 dbname=production

# Read replica
prod_db_ro = host=replica.example.com port=5432 dbname=production

# Development database
dev_db = host=localhost port=5432 dbname=development

# Analytics database (larger pool)
analytics = host=analytics-db.example.com port=5432 dbname=analytics pool_size=50

# Fallback for other databases
* = host=localhost port=5432

[pgbouncer]
pool_mode = transaction
listen_addr = *
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

# Default pool size
default_pool_size = 20

# Per-database pool overrides set above in connection string
```

```sql
-- Connect to different databases through same PgBouncer instance
psql -h localhost -p 6432 -U appuser -d prod_db
psql -h localhost -p 6432 -U appuser -d prod_db_ro
psql -h localhost -p 6432 -U analyst -d analytics
```

### Example 10: Handling Prepared Statements

```sql
-- Prepared statements in TRANSACTION mode
-- PgBouncer discards prepared statements when returning connection to pool

-- Connect through PgBouncer
psql -h localhost -p 6432 -U myuser -d mydb

-- This works within a transaction:
BEGIN;
PREPARE user_query AS SELECT * FROM users WHERE id = $1;
EXECUTE user_query(123);
COMMIT;

-- This fails across transactions in transaction pool mode:
PREPARE global_query AS SELECT * FROM users WHERE id = $1;
-- Connection returned to pool after PREPARE
EXECUTE global_query(123);  -- ERROR: prepared statement does not exist

-- Solution 1: Use session pool mode (less efficient)
-- pool_mode = session

-- Solution 2: Use PQexecParams in application (unnamed prepared statements)
-- These are automatically deallocated

-- Solution 3: Use server-side prepared statements with explicit names
-- Not recommended with transaction pooling
```

### Example 11: Connection Pooling Metrics

```sql
-- Create monitoring view for connection pool health

-- PostgreSQL side: Monitor connection usage
CREATE OR REPLACE VIEW connection_stats AS
SELECT
    (SELECT setting::INT FROM pg_settings WHERE name = 'max_connections') as max_connections,
    (SELECT COUNT(*) FROM pg_stat_activity) as current_connections,
    (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
    (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'idle') as idle_connections,
    (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'idle in transaction') as idle_in_transaction,
    (SELECT COUNT(*) FROM pg_stat_activity WHERE wait_event_type IS NOT NULL) as waiting_connections;

SELECT * FROM connection_stats;

-- In PgBouncer admin console:
SHOW POOLS;
SHOW STATS;

-- Calculate key metrics:
-- 1. Pool utilization = sv_active / (sv_active + sv_idle)
-- 2. Client queue depth = cl_waiting
-- 3. Average wait time = avg_wait_time
-- 4. Connection reuse rate = total_xact_count / total connections
```

### Example 12: Troubleshooting Connection Issues

```sql
-- Check for connection leaks (idle in transaction)
SELECT
    pid,
    usename,
    application_name,
    client_addr,
    state,
    state_change,
    NOW() - state_change as duration,
    query
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND NOW() - state_change > INTERVAL '5 minutes'
ORDER BY state_change;

-- Kill leaked connections (use cautiously)
-- SELECT pg_terminate_backend(pid) FROM pg_stat_activity
-- WHERE state = 'idle in transaction' AND ...;

-- Check for connection exhaustion
SELECT
    COUNT(*) as current,
    (SELECT setting::INT FROM pg_settings WHERE name = 'max_connections') as max,
    (SELECT setting::INT FROM pg_settings WHERE name = 'superuser_reserved_connections') as reserved,
    (SELECT setting::INT FROM pg_settings WHERE name = 'max_connections')::INT -
    (SELECT setting::INT FROM pg_settings WHERE name = 'superuser_reserved_connections')::INT as available_to_users,
    COUNT(*) >= (SELECT setting::INT FROM pg_settings WHERE name = 'max_connections')::INT -
                (SELECT setting::INT FROM pg_settings WHERE name = 'superuser_reserved_connections')::INT as exhausted
FROM pg_stat_activity;

-- In PgBouncer: Check for waiting clients
SHOW POOLS;
-- If cl_waiting > 0 consistently, increase pool size

-- Check PgBouncer logs for errors
-- tail -f /var/log/postgresql/pgbouncer.log
```

## Common Mistakes

### 1. Not Using Connection Pooling
```sql
-- Wrong: Every request creates new connection
-- Application code creates connection per request
connect() -> query() -> disconnect()

-- Right: Use connection pooling
-- get_from_pool() -> query() -> return_to_pool()
```

### 2. Pool Size Too Large
```ini
# Wrong: Oversized pool
default_pool_size = 500

# Right: Size based on formula
default_pool_size = 20  # For typical 8-core server
```

### 3. Using Session Mode When Not Needed
```ini
# Wrong: Session mode for stateless applications
pool_mode = session  # Reduces pooling benefits

# Right: Transaction mode for most applications
pool_mode = transaction
```

### 4. Not Handling Prepared Statements
```sql
-- Wrong: Using prepared statements with transaction pooling
PREPARE stmt AS SELECT ...;  -- Lost when connection returned to pool

-- Right: Use unnamed prepared statements or session pooling
```

### 5. Ignoring Connection Leaks
```sql
-- Wrong: Leaving connections in "idle in transaction" state
BEGIN;
SELECT ...;
-- Application crashes, connection never commits/rollbacks

-- Right: Use timeouts and proper error handling
SET idle_in_transaction_session_timeout = '5min';
```

### 6. Not Monitoring Pool Health
```sql
-- Wrong: Never checking pool statistics
-- Leads to performance issues

-- Right: Regular monitoring
SHOW POOLS;
SHOW STATS;
```

### 7. Inadequate max_connections
```conf
# Wrong: Default max_connections with high-traffic application
max_connections = 100

# Right: Increase max_connections (with pooling, can be moderate)
max_connections = 200  # Actual connections
# Then use pooler to handle 1000s of application connections
```

## Best Practices

### 1. Always Use Connection Pooling
For production applications handling concurrent users, connection pooling is essential.

### 2. Use Transaction Pooling Mode
Transaction mode provides best balance of performance and compatibility for most applications.

### 3. Size Pool Appropriately
```
pool_size = (cores * 2) + effective_spindle_count
```
Typical: 15-25 connections per database

### 4. Set Reasonable Timeouts
```ini
# PgBouncer
server_idle_timeout = 600        # 10 minutes
query_wait_timeout = 120         # 2 minutes
idle_transaction_timeout = 0     # Use PostgreSQL setting instead
```

```sql
-- PostgreSQL
ALTER SYSTEM SET idle_in_transaction_session_timeout = '5min';
ALTER SYSTEM SET statement_timeout = '30min';
```

### 5. Monitor Pool Utilization
Regularly check SHOW POOLS for:
- cl_waiting (should be near 0)
- sv_idle (should have some idle connections)
- avg_wait_time (should be very low)

### 6. Use Application-Level Pooling When Appropriate
For single-server applications, application-level pooling may be simpler than PgBouncer.

### 7. Configure Authentication Properly
Use scram-sha-256 for better security:
```ini
auth_type = scram-sha-256
```

### 8. Plan for Connection Limits
```
Database max_connections = (pool_size * app_instances) + admin_reserve
Example: (20 * 10) + 20 = 220
```

### 9. Implement Health Checks
Monitor PgBouncer and PostgreSQL connection counts to detect issues early.

### 10. Use Multiple Pools for Different Workloads
```ini
[databases]
app_db = host=db port=5432 dbname=app pool_size=20
analytics = host=db port=5432 dbname=app pool_size=5
```

### 11. Document Pool Configuration
Keep clear documentation of pool sizing decisions and monitoring procedures.

### 12. Test Failover Behavior
Ensure application handles pool exhaustion and connection failures gracefully.

## Practice Exercises

### Exercise 1: Connection Overhead Measurement

```sql
-- Tasks:
-- 1. Measure time to create 100 sequential connections (without pooling)
-- 2. Measure time to execute 100 queries through PgBouncer (with pooling)
-- 3. Compare total time and per-operation overhead
-- 4. Calculate speedup factor
-- 5. Monitor memory usage during both tests

-- Test script (run from shell):
-- Without pooling:
time for i in {1..100}; do
    psql -h localhost -p 5432 -U myuser -d mydb -c "SELECT 1" > /dev/null
done

-- With pooling:
time for i in {1..100}; do
    psql -h localhost -p 6432 -U myuser -d mydb -c "SELECT 1" > /dev/null
done

-- Document:
-- - Time without pooling: _____ seconds
-- - Time with pooling: _____ seconds
-- - Speedup: _____ x
-- - Overhead per connection: _____ ms
```

### Exercise 2: Pool Sizing Optimization

```sql
-- Setup: Create test workload
CREATE TABLE workload_test (
    id SERIAL PRIMARY KEY,
    data TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tasks:
-- 1. Configure PgBouncer with pool_size = 5
-- 2. Run concurrent load (50 clients, 1000 queries each)
-- 3. Monitor SHOW POOLS for cl_waiting
-- 4. Gradually increase pool size (10, 15, 20, 25)
-- 5. At each size, measure:
--    - Average query time (SHOW STATS)
--    - Client wait time (avg_wait_time)
--    - Pool utilization (sv_active / total)
-- 6. Find optimal pool size where:
--    - cl_waiting is minimal
--    - avg_wait_time is low
--    - Increasing further shows no improvement
-- 7. Document optimal pool size and reasoning

-- Load testing script (use pgbench or custom script):
-- pgbench -h localhost -p 6432 -U myuser -d mydb -c 50 -t 1000
```

### Exercise 3: Connection Pool Monitoring Dashboard

```sql
-- Create monitoring queries for connection pool health

-- Task 1: Write query showing PostgreSQL connection status
-- Should show: total connections, active, idle, idle in transaction,
-- max_connections, percentage used

-- Task 2: Create PgBouncer statistics query
-- Connect to admin console and show:
-- - Pool utilization per database
-- - Client wait times
-- - Transaction counts
-- - Average query times

-- Task 3: Create alerting thresholds
-- Define alerts for:
-- - Connection usage > 80%
-- - Pool utilization > 90%
-- - Average wait time > 100ms
-- - Idle in transaction > 5 minutes

-- Task 4: Write query to identify connection leaks
-- Find connections idle in transaction for > 10 minutes

-- Task 5: Create health check query
-- Single query that returns:
-- - Database connection health (green/yellow/red)
-- - Pool health (green/yellow/red)
-- - Connection leak count
-- - Recommendation (OK, increase pool, investigate leaks, etc.)
```

## Summary

Connection pooling is critical for PostgreSQL application scalability and performance. Key points:

- PostgreSQL's process-per-connection architecture has significant overhead
- Connection pooling reuses connections, reducing overhead and improving scalability
- PgBouncer is the most popular lightweight connection pooler
- Transaction pooling mode is recommended for most applications
- Pool size should be modest: (cores * 2) + disk_count
- Monitor pool utilization, waiting clients, and connection leaks
- Application-level pooling is an alternative for single-server deployments
- Always set appropriate timeouts to prevent connection leaks
- Plan max_connections = (pool_size * app_instances) + overhead
- Use session pooling only when application requires persistent session state

Related topics:
- [Query Optimization](./02-query-optimization.md)
- [Configuration Tuning](./05-configuration-tuning.md)
- [EXPLAIN and EXPLAIN ANALYZE](./01-explain-analyze.md)
