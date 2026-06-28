# Logical Replication

## Theory

### Logical vs Physical Replication

PostgreSQL supports two types of replication:

**Physical Replication** (covered in [01-replication-basics.md](01-replication-basics.md)):
- Replicates entire database cluster
- Byte-by-byte copy of data files via WAL
- All databases replicated
- Standby must be same PostgreSQL version and architecture
- Standby is read-only (hot standby)
- Use case: High availability, disaster recovery, read scaling

**Logical Replication**:
- Replicates specific tables or databases
- Row-level changes (INSERT, UPDATE, DELETE)
- Subscriber can have different structure (extra indexes, columns)
- Can replicate between different PostgreSQL versions
- Subscriber is read-write
- Use case: Selective replication, version upgrades, data distribution

**Comparison**:

| Feature | Physical | Logical |
|---------|----------|---------|
| Granularity | Entire cluster | Tables/databases |
| Standby writable | No (read-only) | Yes (read-write) |
| Version compatibility | Same version | Different versions (with limits) |
| DDL replication | Yes | No (manual) |
| Overhead | Lower | Higher |
| Filtering | No | Yes (tables, rows) |
| Conflicts | No | Possible |

### How Logical Replication Works

**Architecture**:
```
Publisher (Source)
  └─> Publication (defines what to replicate)
        └─> Logical Decoding (converts WAL to logical changes)
              └─> Walsender (streams changes)
                    └─> Network
                          └─> Walreceiver (on subscriber)
                                └─> Apply Worker (applies changes)
                                      └─> Subscription
                                            └─> Subscriber Tables
```

**Process**:
1. Publisher defines a publication (set of tables)
2. Subscriber creates a subscription (connects to publisher)
3. Initial data copy (optional, enabled by default)
4. Publisher decodes WAL into logical changes
5. Changes streamed to subscriber
6. Subscriber applies changes to its tables

**Logical Decoding**:
- Converts binary WAL to logical format (row changes)
- Enabled by `wal_level = logical`
- Creates replication slot on publisher
- Tracks subscriber progress

### CREATE PUBLICATION

Publications are created on the publisher to define what data to replicate.

**Publication Types**:

1. **All tables in database**:
   ```sql
   CREATE PUBLICATION pub_all FOR ALL TABLES;
   ```

2. **Specific tables**:
   ```sql
   CREATE PUBLICATION pub_users FOR TABLE users, orders;
   ```

3. **Tables with specific operations**:
   ```sql
   CREATE PUBLICATION pub_insert_only FOR TABLE logs
   WITH (publish = 'insert');
   ```

**Publication Options**:
- `publish`: Which operations to publish (INSERT, UPDATE, DELETE, TRUNCATE)
- `publish_via_partition_root`: Publish changes through partition root

### CREATE SUBSCRIPTION

Subscriptions are created on the subscriber to receive data from publisher.

**Connection**:
- Uses standard PostgreSQL connection string
- Requires replication permissions on publisher
- Creates replication slot on publisher automatically

**Options**:
- `copy_data`: Whether to copy initial data (default: true)
- `create_slot`: Whether to create replication slot (default: true)
- `enabled`: Start replication immediately (default: true)
- `synchronous_commit`: Sync commit setting for subscription

### Replicating Specific Tables

Logical replication allows fine-grained control:

**Include only specific tables**:
```sql
-- Publisher
CREATE PUBLICATION pub_critical FOR TABLE users, orders;

-- Subscriber
CREATE SUBSCRIPTION sub_critical
CONNECTION 'host=publisher dbname=mydb user=replicator'
PUBLICATION pub_critical;
```

**Multiple publications in one subscription**:
```sql
-- Subscriber can subscribe to multiple publications
CREATE SUBSCRIPTION sub_combined
CONNECTION 'host=publisher dbname=mydb user=replicator'
PUBLICATION pub_users, pub_orders;
```

**Different table structures**:
Subscriber can have additional columns or indexes:
```sql
-- Publisher: users (id, name)
-- Subscriber: users (id, name, created_at, extra_index)
-- Replication works; extra columns use defaults
```

### Row Filtering (PostgreSQL 15+)

PostgreSQL 15 introduced row-level filtering in publications:

```sql
-- Replicate only active users
CREATE PUBLICATION pub_active_users
FOR TABLE users WHERE (status = 'active');

-- Replicate recent orders
CREATE PUBLICATION pub_recent_orders
FOR TABLE orders WHERE (created_at > NOW() - INTERVAL '30 days');
```

**Limitations**:
- Filter cannot reference other tables
- Filter must be deterministic
- No subqueries or volatile functions

### Initial Data Copy

When a subscription is created, PostgreSQL copies existing data:

**Process**:
1. Subscriber creates replication slot on publisher
2. Subscriber takes snapshot of publisher tables
3. Subscriber copies all existing rows
4. Subscriber applies ongoing changes from replication slot

**Options**:
```sql
-- Skip initial copy (tables must exist and be empty)
CREATE SUBSCRIPTION sub_no_copy
CONNECTION 'host=publisher dbname=mydb user=replicator'
PUBLICATION pub_users
WITH (copy_data = false);

-- Refresh subscription to copy new tables
ALTER SUBSCRIPTION sub_users REFRESH PUBLICATION WITH (copy_data = true);
```

### DDL Not Replicated

**Important limitation**: Logical replication does NOT replicate DDL:

**Not replicated automatically**:
- CREATE TABLE
- ALTER TABLE (add column, change type, etc.)
- CREATE INDEX
- DROP TABLE
- TRUNCATE (unless explicitly published)

**Workaround**:
1. Apply DDL manually on both publisher and subscriber
2. Use migration tools to keep schemas in sync
3. Use triggers or event-driven systems

**Example**:
```sql
-- On publisher
ALTER TABLE users ADD COLUMN phone VARCHAR(20);

-- Must also run on subscriber
ALTER TABLE users ADD COLUMN phone VARCHAR(20);

-- New data will replicate correctly
```

### Use Cases

**1. Selective Replication**:
```sql
-- Replicate only user-facing tables to read replica
-- Exclude internal/admin tables
CREATE PUBLICATION pub_public FOR TABLE users, products, orders;
```

**2. Major Version Upgrade**:
```sql
-- Set up logical replication from PG 13 to PG 16
-- Minimal downtime migration
-- Switch applications to new server
-- Drop old server
```

**3. Cross-Region Data Distribution**:
```sql
-- US datacenter publishes to EU datacenter
-- Each region has writable database
-- Selective replication of shared data
```

**4. Multi-Tenant Data Isolation**:
```sql
-- Replicate specific customer data to dedicated database
CREATE PUBLICATION pub_customer_123
FOR TABLE orders WHERE (customer_id = 123);
```

**5. Data Warehousing**:
```sql
-- Replicate transactional data to analytics database
-- Subscriber can have materialized views, different indexes
CREATE PUBLICATION pub_analytics FOR ALL TABLES;
```

### Conflict Handling

Since subscribers are read-write, conflicts can occur:

**Conflict Types**:

1. **Insert Conflict**: Row with same primary key already exists
2. **Update Conflict**: Row to update doesn't exist or was modified
3. **Delete Conflict**: Row to delete doesn't exist

**Default Behavior**:
- Replication stops on conflict
- Error logged
- Manual intervention required

**Resolution**:
```sql
-- View subscription status
SELECT * FROM pg_stat_subscription;

-- If stuck due to conflict, fix data and retry
-- Option 1: Fix data on subscriber
DELETE FROM users WHERE id = 123;  -- Remove conflicting row

-- Option 2: Skip conflict (advance replication slot)
-- Use with caution!
SELECT pg_replication_origin_advance('pg_16395', '0/123ABCD');
```

**Prevention**:
- Don't write to replicated tables on subscriber
- Use partitioning to separate write targets
- Use different schemas for local vs replicated data

### Monitoring Logical Replication

**Key Views**:

1. **pg_publication**: Publications on publisher
2. **pg_publication_tables**: Tables in each publication
3. **pg_subscription**: Subscriptions on subscriber
4. **pg_stat_subscription**: Subscription status and lag
5. **pg_replication_slots**: Replication slots (on publisher)

**Important Metrics**:
- Replication lag (time and bytes)
- Subscription state (initializing, catchup, streaming)
- Conflicts and errors
- Replication slot disk usage

## Syntax

### Publication Commands

```sql
-- Create publication for all tables
CREATE PUBLICATION pub_all_tables FOR ALL TABLES;

-- Create publication for specific tables
CREATE PUBLICATION pub_users_orders FOR TABLE users, orders;

-- Create publication with operation filter
CREATE PUBLICATION pub_insert_update FOR TABLE logs
WITH (publish = 'insert, update');

-- Create publication with row filter (PG15+)
CREATE PUBLICATION pub_active_users FOR TABLE users
WHERE (status = 'active');

-- Add tables to existing publication
ALTER PUBLICATION pub_users_orders ADD TABLE products;

-- Remove tables from publication
ALTER PUBLICATION pub_users_orders DROP TABLE products;

-- Set which operations to publish
ALTER PUBLICATION pub_logs SET (publish = 'insert');

-- Drop publication
DROP PUBLICATION pub_users_orders;

-- View publications
SELECT * FROM pg_publication;

-- View tables in publication
SELECT * FROM pg_publication_tables WHERE pubname = 'pub_users_orders';
```

### Subscription Commands

```sql
-- Create subscription with initial data copy
CREATE SUBSCRIPTION sub_users
CONNECTION 'host=publisher.example.com port=5432 dbname=mydb user=replicator password=secret'
PUBLICATION pub_users;

-- Create subscription without initial copy
CREATE SUBSCRIPTION sub_users
CONNECTION 'host=publisher.example.com dbname=mydb user=replicator'
PUBLICATION pub_users
WITH (copy_data = false);

-- Create disabled subscription (enable later)
CREATE SUBSCRIPTION sub_users
CONNECTION 'host=publisher.example.com dbname=mydb user=replicator'
PUBLICATION pub_users
WITH (enabled = false);

-- Enable subscription
ALTER SUBSCRIPTION sub_users ENABLE;

-- Disable subscription (pause replication)
ALTER SUBSCRIPTION sub_users DISABLE;

-- Refresh publication (after adding tables to publication)
ALTER SUBSCRIPTION sub_users REFRESH PUBLICATION;

-- Refresh with data copy for new tables
ALTER SUBSCRIPTION sub_users REFRESH PUBLICATION WITH (copy_data = true);

-- Change connection string
ALTER SUBSCRIPTION sub_users CONNECTION 'host=new-publisher.example.com dbname=mydb user=replicator';

-- Drop subscription
DROP SUBSCRIPTION sub_users;

-- View subscriptions
SELECT * FROM pg_subscription;

-- View subscription status
SELECT
  subname,
  pid,
  received_lsn,
  latest_end_lsn,
  latest_end_time,
  last_msg_send_time,
  last_msg_receipt_time
FROM pg_stat_subscription;
```

### Replication User Setup

```sql
-- On publisher, create replication user
CREATE ROLE replicator WITH LOGIN REPLICATION PASSWORD 'secure_password_2026';

-- Grant permissions on published tables
GRANT SELECT ON TABLE users, orders TO replicator;

-- For ALL TABLES publication
GRANT SELECT ON ALL TABLES IN SCHEMA public TO replicator;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO replicator;

-- Edit pg_hba.conf on publisher to allow connection
-- host    mydb    replicator    subscriber_ip/32    scram-sha-256
```

### Monitoring Queries

```sql
-- On publisher: View replication slots
SELECT
  slot_name,
  slot_type,
  active,
  pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) AS lag_bytes
FROM pg_replication_slots
WHERE slot_type = 'logical';

-- On subscriber: View subscription lag
SELECT
  subname,
  pid,
  latest_end_time,
  NOW() - latest_end_time AS time_lag,
  pg_wal_lsn_diff(latest_end_lsn, received_lsn) AS byte_lag
FROM pg_stat_subscription;

-- On subscriber: Check for errors
SELECT * FROM pg_stat_subscription WHERE pid IS NULL;  -- Not running

-- View replication origin
SELECT * FROM pg_replication_origin_status;
```

## Examples

### Example 1: Basic Logical Replication Setup

Replicate `users` and `orders` tables from publisher to subscriber.

**Step 1: Configure Publisher**

```sql
-- On publisher database

-- Ensure wal_level is logical (requires restart)
-- Check current setting
SHOW wal_level;

-- If not 'logical', edit postgresql.conf:
-- wal_level = logical
-- Then restart: sudo systemctl restart postgresql

-- Create replication user
CREATE ROLE replicator WITH LOGIN REPLICATION PASSWORD 'rep_pass_2026';

-- Grant permissions on tables
GRANT SELECT ON TABLE users, orders TO replicator;

-- Create publication
CREATE PUBLICATION pub_users_orders FOR TABLE users, orders;

-- Verify publication
SELECT * FROM pg_publication_tables WHERE pubname = 'pub_users_orders';
```

**Step 2: Edit pg_hba.conf on Publisher**

```bash
# Add to pg_hba.conf
# host    mydb    replicator    192.168.1.20/32    scram-sha-256

# Reload configuration
sudo systemctl reload postgresql
```

**Step 3: Create Tables on Subscriber**

```sql
-- On subscriber database
-- Tables must exist before creating subscription

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  amount DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Step 4: Create Subscription on Subscriber**

```sql
-- On subscriber database

CREATE SUBSCRIPTION sub_users_orders
CONNECTION 'host=192.168.1.10 port=5432 dbname=mydb user=replicator password=rep_pass_2026'
PUBLICATION pub_users_orders;

-- Check subscription status
SELECT
  subname,
  pid,
  received_lsn,
  latest_end_time
FROM pg_stat_subscription;
```

**Step 5: Test Replication**

```sql
-- On publisher
INSERT INTO users (username, email) VALUES
  ('alice', 'alice@example.com'),
  ('bob', 'bob@example.com');

INSERT INTO orders (user_id, amount) VALUES
  (1, 99.99),
  (2, 49.50);

-- On subscriber (wait a second)
SELECT * FROM users;
SELECT * FROM orders;
-- Should see replicated data
```

### Example 2: Selective Replication with Row Filtering (PG15+)

Replicate only active users and recent orders.

```sql
-- On publisher

-- Create publication with row filters
CREATE PUBLICATION pub_active_data FOR
  TABLE users WHERE (status = 'active'),
  TABLE orders WHERE (created_at > NOW() - INTERVAL '90 days');

-- Verify filters
SELECT
  schemaname,
  tablename,
  pubname,
  prrelid::regclass,
  prqual
FROM pg_publication_tables
JOIN pg_publication_rel ON (prpubid = (SELECT oid FROM pg_publication WHERE pubname = 'pub_active_data'));

-- On subscriber

-- Create subscription
CREATE SUBSCRIPTION sub_active_data
CONNECTION 'host=publisher dbname=mydb user=replicator password=secret'
PUBLICATION pub_active_data;

-- Test: Insert on publisher
INSERT INTO users (username, email, status) VALUES
  ('charlie', 'charlie@example.com', 'active'),
  ('dave', 'dave@example.com', 'inactive');

-- On subscriber: Only charlie should appear
SELECT * FROM users;
```

### Example 3: Multi-Directional Replication

Set up bidirectional replication between two databases (with conflict potential).

**Database A**:

```sql
-- Create publication
CREATE PUBLICATION pub_db_a FOR TABLE shared_table;

-- Create subscription to DB B
CREATE SUBSCRIPTION sub_from_db_b
CONNECTION 'host=db-b.example.com dbname=mydb user=replicator password=secret'
PUBLICATION pub_db_b;
```

**Database B**:

```sql
-- Create publication
CREATE PUBLICATION pub_db_b FOR TABLE shared_table;

-- Create subscription to DB A
CREATE SUBSCRIPTION sub_from_db_a
CONNECTION 'host=db-a.example.com dbname=mydb user=replicator password=secret'
PUBLICATION pub_db_a;
```

**Conflict Prevention**:

```sql
-- Option 1: Partition writes by ID range
-- DB A: Only insert IDs 1-1000000
-- DB B: Only insert IDs 1000001-2000000

-- Option 2: Use different columns
-- DB A: Only updates column_a
-- DB B: Only updates column_b

-- Option 3: Use application-level coordination
-- Ensure only one DB writes to any given row
```

### Example 4: PostgreSQL Version Upgrade with Logical Replication

Upgrade from PostgreSQL 13 to PostgreSQL 16 with minimal downtime.

**Step 1: Prepare PG16 Subscriber**

```bash
# Install PostgreSQL 16
# Create database with same schema as PG13
# Use pg_dump --schema-only from PG13

# On PG13
pg_dump --schema-only mydb > schema.sql

# On PG16
psql mydb < schema.sql
```

**Step 2: Set Up Replication**

```sql
-- On PG13 (publisher)
ALTER SYSTEM SET wal_level = logical;
-- Restart PG13

CREATE ROLE replicator WITH LOGIN REPLICATION PASSWORD 'secret';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO replicator;

CREATE PUBLICATION pub_upgrade FOR ALL TABLES;

-- On PG16 (subscriber)
CREATE SUBSCRIPTION sub_from_pg13
CONNECTION 'host=pg13-server dbname=mydb user=replicator password=secret'
PUBLICATION pub_upgrade;

-- Wait for initial sync
SELECT * FROM pg_stat_subscription;
-- Wait until latest_end_time is recent (< 1 second ago)
```

**Step 3: Cutover**

```sql
-- 1. Stop application writes to PG13
-- 2. Wait for replication to catch up
SELECT NOW() - latest_end_time AS lag FROM pg_stat_subscription;
-- Should be < 1 second

-- 3. Disable subscription on PG16
ALTER SUBSCRIPTION sub_from_pg13 DISABLE;

-- 4. Point application to PG16
-- 5. Verify data
-- 6. Drop subscription after verification period
DROP SUBSCRIPTION sub_from_pg13;  -- On PG16
DROP PUBLICATION pub_upgrade;     -- On PG13
```

### Example 5: Monitoring Logical Replication

```sql
-- Create monitoring views

-- On publisher: Subscription lag and slot usage
CREATE VIEW logical_replication_publisher AS
SELECT
  slot_name,
  plugin,
  active,
  pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) AS lag_bytes,
  pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS lag,
  CASE
    WHEN NOT active THEN 'INACTIVE'
    WHEN pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) > 1073741824 THEN 'CRITICAL'
    WHEN pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) > 104857600 THEN 'WARNING'
    ELSE 'OK'
  END AS status
FROM pg_replication_slots
WHERE slot_type = 'logical';

-- On subscriber: Subscription health
CREATE VIEW logical_replication_subscriber AS
SELECT
  subname,
  pid,
  latest_end_time,
  NOW() - latest_end_time AS time_lag,
  received_lsn,
  latest_end_lsn,
  pg_wal_lsn_diff(latest_end_lsn, received_lsn) AS byte_lag,
  CASE
    WHEN pid IS NULL THEN 'NOT_RUNNING'
    WHEN NOW() - latest_end_time > INTERVAL '5 minutes' THEN 'CRITICAL'
    WHEN NOW() - latest_end_time > INTERVAL '1 minute' THEN 'WARNING'
    ELSE 'OK'
  END AS status
FROM pg_stat_subscription;

-- Query monitoring views
SELECT * FROM logical_replication_publisher;
SELECT * FROM logical_replication_subscriber;

-- Alert on issues
SELECT subname, status, time_lag
FROM logical_replication_subscriber
WHERE status != 'OK';
```

## Common Mistakes

### 1. Forgetting to Set wal_level = logical

**Wrong**:
```sql
-- wal_level = replica (default)
CREATE PUBLICATION pub_users FOR TABLE users;
-- Publication created, but won't work properly
```

**Correct**:
```sql
-- postgresql.conf
-- wal_level = logical
-- Restart PostgreSQL

CREATE PUBLICATION pub_users FOR TABLE users;
```

### 2. Not Creating Tables Before Subscription

**Wrong**:
```sql
-- On subscriber, create subscription before tables exist
CREATE SUBSCRIPTION sub_users ...;
-- ERROR: relation "users" does not exist
```

**Correct**:
```sql
-- Create tables first (or use copy_data = false if populating differently)
CREATE TABLE users (...);
CREATE SUBSCRIPTION sub_users ...;
```

### 3. Writing to Replicated Tables on Subscriber

**Wrong**:
```sql
-- On subscriber
INSERT INTO users (username, email) VALUES ('local', 'local@example.com');
-- Causes conflicts when publisher has same ID
```

**Correct**:
```sql
-- Don't write to replicated tables on subscriber
-- Or use separate schemas/partitions
```

### 4. Not Granting SELECT on Published Tables

**Wrong**:
```sql
-- Create publication without granting permissions
CREATE PUBLICATION pub_users FOR TABLE users;
-- Replication user cannot read table
```

**Correct**:
```sql
GRANT SELECT ON TABLE users TO replicator;
CREATE PUBLICATION pub_users FOR TABLE users;
```

### 5. Ignoring Replication Slot Disk Usage

**Wrong**:
```sql
-- Subscriber offline for days
-- Replication slot accumulates WAL
-- Disk fills up
```

**Correct**:
```sql
-- Monitor slot usage
SELECT
  slot_name,
  pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn))
FROM pg_replication_slots;

-- Drop unused slots
SELECT pg_drop_replication_slot('unused_slot');
```

### 6. Assuming DDL Replicates

**Wrong**:
```sql
-- On publisher
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
-- Assume it replicates to subscriber - it doesn't!
```

**Correct**:
```sql
-- Apply DDL on both publisher and subscriber
-- On publisher
ALTER TABLE users ADD COLUMN phone VARCHAR(20);

-- On subscriber
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
```

## Best Practices

### 1. Always Set wal_level = logical

Even if not using logical replication yet:
```
wal_level = logical
```

Allows logical replication without restart later.

### 2. Monitor Replication Lag

```sql
-- Set up automated monitoring
SELECT
  subname,
  NOW() - latest_end_time AS lag
FROM pg_stat_subscription
WHERE NOW() - latest_end_time > INTERVAL '1 minute';
```

### 3. Use Row Filters to Reduce Data Volume (PG15+)

```sql
-- Only replicate what's needed
CREATE PUBLICATION pub_recent FOR TABLE orders
WHERE (created_at > NOW() - INTERVAL '90 days');
```

### 4. Keep Schemas in Sync

Use migration tools or scripts to ensure DDL is applied on both sides:
```bash
# Apply migration on both publisher and subscriber
psql -h publisher mydb < migration.sql
psql -h subscriber mydb < migration.sql
```

### 5. Test Conflict Resolution

Simulate conflicts in staging:
```sql
-- On subscriber, deliberately create conflict
INSERT INTO users (id, username, email) VALUES (1, 'conflict', 'conflict@example.com');

-- On publisher
INSERT INTO users (id, username, email) VALUES (1, 'real', 'real@example.com');

-- Observe and resolve conflict
```

### 6. Use Initial Schema Snapshot

```bash
# For large databases, use pg_dump for initial load
pg_dump -h publisher --schema-only mydb > schema.sql
psql -h subscriber mydb < schema.sql

# Then create subscription without initial copy
CREATE SUBSCRIPTION sub WITH (copy_data = false) ...;
```

### 7. Document Manual DDL Process

Create runbook for applying schema changes:
```
1. Apply DDL to publisher
2. Apply DDL to subscriber
3. Verify replication still working
4. Monitor for errors
```

## Practice Exercises

### Exercise 1: Set Up Filtered Replication for Multi-Tenant System

Replicate customer-specific data to separate databases.

**Solution**:

```sql
-- On main database (publisher)
-- Ensure wal_level = logical

-- Create publications for each customer
CREATE PUBLICATION pub_customer_100 FOR TABLE
  orders WHERE (customer_id = 100),
  order_items WHERE (customer_id = 100),
  invoices WHERE (customer_id = 100);

CREATE PUBLICATION pub_customer_200 FOR TABLE
  orders WHERE (customer_id = 200),
  order_items WHERE (customer_id = 200),
  invoices WHERE (customer_id = 200);

-- Create replication users
CREATE ROLE rep_customer_100 WITH LOGIN PASSWORD 'secure_pass_100';
GRANT SELECT ON orders, order_items, invoices TO rep_customer_100;

CREATE ROLE rep_customer_200 WITH LOGIN PASSWORD 'secure_pass_200';
GRANT SELECT ON orders, order_items, invoices TO rep_customer_200;

-- On customer 100 database (subscriber)
CREATE TABLE orders (...);
CREATE TABLE order_items (...);
CREATE TABLE invoices (...);

CREATE SUBSCRIPTION sub_customer_100
CONNECTION 'host=main-db dbname=maindb user=rep_customer_100 password=secure_pass_100'
PUBLICATION pub_customer_100;

-- On customer 200 database (subscriber)
-- Similar setup for customer 200
```

### Exercise 2: Implement Logical Replication Monitoring

**Solution**:

```sql
-- On publisher, create monitoring schema
CREATE SCHEMA monitoring;

-- Function to check logical replication health
CREATE OR REPLACE FUNCTION monitoring.check_logical_replication()
RETURNS TABLE(
  subscription_name TEXT,
  status TEXT,
  lag_bytes BIGINT,
  lag_time INTERVAL,
  issue TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    slot_name::TEXT,
    CASE
      WHEN NOT active THEN 'INACTIVE'
      WHEN pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) > 1073741824 THEN 'CRITICAL'
      WHEN pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) > 104857600 THEN 'WARNING'
      ELSE 'OK'
    END,
    pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn),
    NULL::INTERVAL,
    CASE
      WHEN NOT active THEN 'Slot inactive - subscriber disconnected'
      WHEN pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) > 1073741824 THEN 'High WAL lag - check subscriber'
      ELSE NULL
    END
  FROM pg_replication_slots
  WHERE slot_type = 'logical';
END;
$$ LANGUAGE plpgsql;

-- On subscriber
CREATE OR REPLACE FUNCTION monitoring.check_subscription_health()
RETURNS TABLE(
  subscription TEXT,
  status TEXT,
  time_lag INTERVAL,
  byte_lag BIGINT,
  issue TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    subname::TEXT,
    CASE
      WHEN pid IS NULL THEN 'NOT_RUNNING'
      WHEN NOW() - latest_end_time > INTERVAL '5 minutes' THEN 'CRITICAL'
      WHEN NOW() - latest_end_time > INTERVAL '1 minute' THEN 'WARNING'
      ELSE 'OK'
    END,
    NOW() - latest_end_time,
    pg_wal_lsn_diff(latest_end_lsn, received_lsn),
    CASE
      WHEN pid IS NULL THEN 'Subscription worker not running'
      WHEN NOW() - latest_end_time > INTERVAL '5 minutes' THEN 'Severe replication lag'
      WHEN NOW() - latest_end_time > INTERVAL '1 minute' THEN 'Moderate replication lag'
      ELSE NULL
    END
  FROM pg_stat_subscription;
END;
$$ LANGUAGE plpgsql;

-- Query health checks
SELECT * FROM monitoring.check_logical_replication();  -- On publisher
SELECT * FROM monitoring.check_subscription_health();  -- On subscriber
```

### Exercise 3: Handle a Replication Conflict

Simulate and resolve a primary key conflict.

**Solution**:

```sql
-- Step 1: Set up replication (assume already configured)

-- Step 2: Create conflict scenario
-- On subscriber, insert a row that will conflict
BEGIN;
INSERT INTO users (id, username, email) VALUES (9999, 'conflict_user', 'conflict@example.com');
COMMIT;

-- Step 3: On publisher, insert same ID
INSERT INTO users (id, username, email) VALUES (9999, 'real_user', 'real@example.com');

-- Step 4: Check subscription status on subscriber
SELECT
  subname,
  pid,
  latest_end_time,
  NOW() - latest_end_time AS lag
FROM pg_stat_subscription;
-- lag will keep increasing (replication stuck)

-- Step 5: Check PostgreSQL logs for error
-- Look for: "duplicate key value violates unique constraint"

-- Step 6: Resolve conflict - Option A (keep subscriber version)
-- Disable subscription temporarily
ALTER SUBSCRIPTION sub_users DISABLE;

-- On publisher, update to match subscriber
UPDATE users SET username = 'conflict_user', email = 'conflict@example.com' WHERE id = 9999;

-- Re-enable subscription
ALTER SUBSCRIPTION sub_users ENABLE;

-- Step 7: Resolve conflict - Option B (keep publisher version)
-- Delete conflicting row on subscriber
DELETE FROM users WHERE id = 9999;

-- Subscription will automatically retry and succeed

-- Step 8: Verify replication resumed
SELECT * FROM pg_stat_subscription;
-- lag should be low again
```

These exercises demonstrate real-world logical replication scenarios including selective replication, monitoring, and conflict resolution.
