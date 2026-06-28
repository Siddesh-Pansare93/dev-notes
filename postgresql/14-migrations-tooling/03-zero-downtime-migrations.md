# Zero-Downtime Migrations

## Theory

### Why Zero-Downtime Matters

In production systems, database downtime means:
- Service unavailability for users
- Revenue loss
- SLA violations
- Damaged reputation
- Disrupted business operations

Zero-downtime migrations enable continuous availability by applying schema changes without:
- Blocking reads or writes
- Requiring application shutdown
- Causing query timeouts
- Locking tables for extended periods

This is critical for:
- 24/7 services
- High-traffic applications
- Multi-region deployments
- Microservices architectures
- Continuous deployment pipelines

### Dangerous Operations

PostgreSQL uses different lock types for DDL operations. Some require exclusive locks that block all operations:

**ACCESS EXCLUSIVE locks** (blocks reads and writes):
- `ALTER TABLE ... ADD COLUMN ... NOT NULL` (without default in PG10-)
- `ALTER TABLE ... ALTER COLUMN TYPE` (most type changes)
- `DROP TABLE`
- `TRUNCATE`
- `VACUUM FULL`
- Adding constraints (without `NOT VALID`)

**SHARE UPDATE EXCLUSIVE locks** (blocks schema changes):
- `CREATE INDEX` (non-concurrent)
- `VACUUM`

**SHARE locks** (blocks writes):
- `CREATE INDEX` on referenced table

### Lock Duration Impact

The danger is not just the lock type, but the duration:

```sql
-- Dangerous: Locks large table for hours
ALTER TABLE large_table ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending';

-- On a 100M row table, this could take:
-- - Minutes to hours to rewrite table
-- - Blocks all reads and writes
-- - Causes query timeout cascades
-- - May cause application outages
```

### Safe Migration Principles

1. **Minimize lock time**: Use operations that acquire locks briefly
2. **Non-blocking indexes**: Create indexes concurrently
3. **Multi-step changes**: Break dangerous operations into safe steps
4. **Backward compatibility**: Ensure old and new app versions work together
5. **Gradual rollout**: Deploy schema changes before/after app changes
6. **Monitoring**: Track locks, replication lag, and query performance
7. **Rollback plan**: Be able to revert without data loss

## Safe Patterns

### Adding Columns

**Dangerous**:
```sql
-- PG10 and earlier: Rewrites entire table
ALTER TABLE users ADD COLUMN phone VARCHAR(20) NOT NULL DEFAULT '';

-- Blocks reads/writes for minutes/hours on large tables
```

**Safe Pattern**:
```sql
-- Step 1: Add column as nullable (fast, metadata-only in PG11+)
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
-- Lock duration: milliseconds

-- Step 2: Backfill in small batches (no locks)
DO $$
DECLARE
  batch_size INTEGER := 1000;
  affected INTEGER;
BEGIN
  LOOP
    UPDATE users
    SET phone = ''
    WHERE id IN (
      SELECT id FROM users
      WHERE phone IS NULL
      LIMIT batch_size
    );

    GET DIAGNOSTICS affected = ROW_COUNT;
    EXIT WHEN affected = 0;

    -- Pause between batches to reduce load
    PERFORM pg_sleep(0.1);
  END LOOP;
END $$;

-- Step 3: Add NOT NULL constraint (fast with existing data)
ALTER TABLE users ALTER COLUMN phone SET NOT NULL;
-- Lock duration: milliseconds (PG12+ validates existing data quickly)
```

### Adding Columns with Defaults (PG11+)

PostgreSQL 11+ optimizes adding columns with defaults:

```sql
-- Fast in PG11+: No table rewrite, metadata-only
ALTER TABLE users ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active';
-- Lock duration: milliseconds

-- PG11+ stores the default in catalog, applies it on read
-- No rewrite needed for existing rows
```

### Changing Column Types

**Dangerous**:
```sql
-- Rewrites entire table
ALTER TABLE users ALTER COLUMN email TYPE TEXT;
```

**Safe Pattern 1: Compatible Type Changes**:
```sql
-- Safe: VARCHAR to TEXT (no rewrite in PostgreSQL)
ALTER TABLE users ALTER COLUMN email TYPE TEXT;

-- Safe: Increasing VARCHAR length (metadata-only)
ALTER TABLE users ALTER COLUMN username TYPE VARCHAR(100);
```

**Safe Pattern 2: Multi-Step for Incompatible Changes**:
```sql
-- Example: Change phone from VARCHAR to custom type

-- Step 1: Add new column
ALTER TABLE users ADD COLUMN phone_new VARCHAR(20);

-- Step 2: Backfill in batches
UPDATE users SET phone_new = phone WHERE phone_new IS NULL LIMIT 1000;
-- Repeat in batches

-- Step 3: Deploy app version that reads phone_new, writes both

-- Step 4: Once all apps updated, drop old column
ALTER TABLE users DROP COLUMN phone;

-- Step 5: Rename new column
ALTER TABLE users RENAME COLUMN phone_new TO phone;
```

### Creating Indexes Concurrently

**Dangerous**:
```sql
-- Locks table, blocks writes
CREATE INDEX idx_users_email ON users(email);
```

**Safe Pattern**:
```sql
-- Does not block reads or writes (takes longer)
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);

-- Important: Cannot run inside a transaction
-- Check for invalid indexes if interrupted:
SELECT * FROM pg_indexes WHERE indexdef LIKE '%INVALID%';

-- Drop invalid index and retry
DROP INDEX CONCURRENTLY IF EXISTS idx_users_email;
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
```

### Adding Constraints

**Dangerous**:
```sql
-- Acquires SHARE ROW EXCLUSIVE lock, validates all rows immediately
ALTER TABLE orders ADD CONSTRAINT check_positive_amount CHECK (amount > 0);
```

**Safe Pattern: Two-Phase Constraint Addition**:
```sql
-- Step 1: Add constraint as NOT VALID (fast, doesn't validate existing data)
ALTER TABLE orders ADD CONSTRAINT check_positive_amount
CHECK (amount > 0) NOT VALID;
-- Lock duration: milliseconds
-- New/updated rows are validated immediately

-- Step 2: Validate existing data (can be killed and restarted)
ALTER TABLE orders VALIDATE CONSTRAINT check_positive_amount;
-- Uses SHARE UPDATE EXCLUSIVE lock (allows reads/writes, blocks schema changes)
-- Scans table in chunks, can be slow but doesn't block operations
```

### Adding Foreign Keys

**Dangerous**:
```sql
-- Locks both tables
ALTER TABLE posts ADD CONSTRAINT fk_posts_users
FOREIGN KEY (user_id) REFERENCES users(id);
```

**Safe Pattern**:
```sql
-- Step 1: Add as NOT VALID
ALTER TABLE posts ADD CONSTRAINT fk_posts_users
FOREIGN KEY (user_id) REFERENCES users(id) NOT VALID;
-- Lock duration: milliseconds

-- Step 2: Validate (allows concurrent operations)
ALTER TABLE posts VALIDATE CONSTRAINT fk_posts_users;
-- Locks: SHARE UPDATE EXCLUSIVE (allows reads/writes)
```

### Adding NOT NULL Constraints

**Dangerous**:
```sql
-- Scans entire table with exclusive lock
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
```

**Safe Pattern**:
```sql
-- Step 1: Add CHECK constraint as NOT VALID
ALTER TABLE users ADD CONSTRAINT users_email_not_null
CHECK (email IS NOT NULL) NOT VALID;

-- Step 2: Validate constraint (scans table, allows concurrent operations)
ALTER TABLE users VALIDATE CONSTRAINT users_email_not_null;

-- Step 3: Set NOT NULL (fast, constraint already validated)
ALTER TABLE users ALTER COLUMN email SET NOT NULL;

-- Step 4: Drop redundant CHECK constraint
ALTER TABLE users DROP CONSTRAINT users_email_not_null;
```

### Renaming Columns/Tables

**Dangerous for apps**:
```sql
-- Fast database operation, but breaks running app code
ALTER TABLE users RENAME COLUMN username TO user_name;
```

**Safe Pattern: Views for Compatibility**:
```sql
-- Step 1: Add new column
ALTER TABLE users ADD COLUMN user_name VARCHAR(50);

-- Step 2: Backfill
UPDATE users SET user_name = username WHERE user_name IS NULL;

-- Step 3: Create view with old name
CREATE VIEW users_compat AS
SELECT
  id,
  user_name AS username,  -- old name
  email,
  created_at
FROM users;

-- Step 4: Deploy new app version using user_name

-- Step 5: Drop view and old column
DROP VIEW users_compat;
ALTER TABLE users DROP COLUMN username;
```

### Expanding/Contracting Pattern

For major schema changes, use the expand/contract pattern:

**Expand Phase** (make schema backward compatible):
1. Add new columns/tables (nullable)
2. Deploy app version that writes to both old and new schema
3. Backfill new columns from old columns
4. Add constraints to new columns

**Contract Phase** (remove old schema):
1. Deploy app version that only uses new schema
2. Drop old columns/tables
3. Rename new columns if needed

Example:
```sql
-- EXPAND: Split name into first_name and last_name

-- Step 1: Add new columns
ALTER TABLE users ADD COLUMN first_name VARCHAR(50);
ALTER TABLE users ADD COLUMN last_name VARCHAR(50);

-- Step 2: Backfill
UPDATE users
SET
  first_name = SPLIT_PART(name, ' ', 1),
  last_name = SPLIT_PART(name, ' ', 2)
WHERE first_name IS NULL;

-- Step 3: Deploy app v2 that writes both name and first_name/last_name

-- Step 4: Add NOT NULL constraints
ALTER TABLE users ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE users ALTER COLUMN last_name SET NOT NULL;

-- CONTRACT: Remove old column

-- Step 5: Deploy app v3 that only uses first_name/last_name

-- Step 6: Drop old column
ALTER TABLE users DROP COLUMN name;
```

### Batch Operations for Large Data Changes

**Dangerous**:
```sql
-- Single transaction, holds locks for hours
UPDATE large_table SET status = 'migrated' WHERE status = 'pending';
```

**Safe Pattern**:
```sql
-- Process in batches with pauses
DO $$
DECLARE
  batch_size INTEGER := 5000;
  affected INTEGER;
  total_updated INTEGER := 0;
BEGIN
  LOOP
    -- Update one batch
    UPDATE large_table
    SET status = 'migrated'
    WHERE id IN (
      SELECT id
      FROM large_table
      WHERE status = 'pending'
      LIMIT batch_size
    );

    GET DIAGNOSTICS affected = ROW_COUNT;
    total_updated := total_updated + affected;

    -- Log progress
    RAISE NOTICE 'Updated % rows (total: %)', affected, total_updated;

    -- Exit when no more rows
    EXIT WHEN affected = 0;

    -- Commit this batch
    COMMIT;

    -- Pause to reduce load (100ms)
    PERFORM pg_sleep(0.1);
  END LOOP;
END $$;
```

### Feature Flags for Migrations

Use feature flags to decouple schema changes from code changes:

```sql
-- Add feature flag table
CREATE TABLE feature_flags (
  name VARCHAR(50) PRIMARY KEY,
  enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable new feature gradually
INSERT INTO feature_flags (name, enabled) VALUES ('use_new_schema', FALSE);

-- In application code:
-- if (featureFlags.isEnabled('use_new_schema')) {
--   // Use new schema
-- } else {
--   // Use old schema
-- }
```

### Using pg_repack for Table Rewrites

For operations that require full table rewrites, use `pg_repack`:

```bash
# Install pg_repack extension
CREATE EXTENSION pg_repack;

# Repack table (online, minimal locking)
pg_repack -t large_table -d mydb

# Benefits:
# - Creates new table with new structure
# - Copies data in background
# - Swaps tables with brief lock at end
# - Minimal downtime (seconds, not hours)
```

### Lock Timeout Settings

Prevent migrations from waiting indefinitely for locks:

```sql
-- Set lock timeout for migration session
SET lock_timeout = '5s';

-- Migration will fail fast if lock not acquired within 5 seconds
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);

-- For critical migrations, use statement timeout too
SET statement_timeout = '30min';
```

## Syntax

### Creating Concurrent Index

```sql
-- Basic concurrent index
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);

-- Concurrent unique index
CREATE UNIQUE INDEX CONCURRENTLY idx_users_username ON users(username);

-- Concurrent partial index
CREATE INDEX CONCURRENTLY idx_active_users
ON users(created_at) WHERE status = 'active';

-- Check for invalid indexes
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE indexdef LIKE '%INVALID%';
```

### Adding Constraint with NOT VALID

```sql
-- Add CHECK constraint
ALTER TABLE orders
ADD CONSTRAINT check_positive_amount CHECK (amount > 0) NOT VALID;

-- Add FOREIGN KEY constraint
ALTER TABLE posts
ADD CONSTRAINT fk_posts_users
FOREIGN KEY (user_id) REFERENCES users(id) NOT VALID;

-- Validate constraint later
ALTER TABLE orders VALIDATE CONSTRAINT check_positive_amount;
ALTER TABLE posts VALIDATE CONSTRAINT fk_posts_users;
```

### Lock Monitoring

```sql
-- View current locks
SELECT
  locktype,
  database,
  relation::regclass,
  mode,
  granted,
  pid,
  query
FROM pg_locks
JOIN pg_stat_activity USING (pid)
WHERE NOT granted
ORDER BY relation;

-- View blocking queries
SELECT
  blocked.pid AS blocked_pid,
  blocked.query AS blocked_query,
  blocking.pid AS blocking_pid,
  blocking.query AS blocking_query
FROM pg_stat_activity blocked
JOIN pg_stat_activity blocking
  ON blocking.pid = ANY(pg_blocking_pids(blocked.pid))
WHERE blocked.wait_event_type = 'Lock';
```

## Examples

### Example 1: Safe Column Addition to Large Table

```sql
-- Scenario: Add mandatory 'country' column to 100M row users table

-- STEP 1: Add nullable column (fast, metadata-only in PG11+)
BEGIN;
SET lock_timeout = '2s';
ALTER TABLE users ADD COLUMN country VARCHAR(2);
COMMIT;
-- Duration: < 100ms

-- STEP 2: Backfill in batches (no locks)
DO $$
DECLARE
  batch_size INTEGER := 10000;
  affected INTEGER;
  total_updated INTEGER := 0;
  start_time TIMESTAMP;
BEGIN
  start_time := clock_timestamp();

  LOOP
    UPDATE users
    SET country = 'US'  -- Default value
    WHERE id IN (
      SELECT id FROM users
      WHERE country IS NULL
      ORDER BY id
      LIMIT batch_size
    );

    GET DIAGNOSTICS affected = ROW_COUNT;
    total_updated := total_updated + affected;

    EXIT WHEN affected = 0;

    -- Log progress every 100k rows
    IF total_updated % 100000 = 0 THEN
      RAISE NOTICE 'Updated % rows in %',
        total_updated,
        clock_timestamp() - start_time;
    END IF;

    -- Commit each batch
    COMMIT;

    -- Brief pause to reduce load
    PERFORM pg_sleep(0.05);
  END LOOP;

  RAISE NOTICE 'Total updated: % rows in %',
    total_updated,
    clock_timestamp() - start_time;
END $$;

-- STEP 3: Add NOT NULL constraint (fast, data already populated)
BEGIN;
SET lock_timeout = '2s';
ALTER TABLE users ALTER COLUMN country SET NOT NULL;
COMMIT;
-- Duration: < 100ms

-- STEP 4: Add index concurrently (no blocking)
CREATE INDEX CONCURRENTLY idx_users_country ON users(country);
-- Duration: Several minutes, but non-blocking
```

### Example 2: Zero-Downtime Foreign Key Addition

```sql
-- Scenario: Add foreign key from posts(user_id) to users(id)
-- posts table: 500M rows
-- users table: 10M rows

-- STEP 1: Create index on foreign key column (prevents lock on validation)
CREATE INDEX CONCURRENTLY idx_posts_user_id ON posts(user_id);
-- Duration: ~10-30 minutes, non-blocking

-- STEP 2: Add constraint as NOT VALID (fast)
BEGIN;
SET lock_timeout = '2s';
ALTER TABLE posts
ADD CONSTRAINT fk_posts_users
FOREIGN KEY (user_id) REFERENCES users(id)
NOT VALID;
COMMIT;
-- Duration: < 100ms
-- Note: New rows will be validated, existing rows not yet checked

-- STEP 3: Validate constraint (slow but non-blocking)
SET statement_timeout = '2h';
ALTER TABLE posts VALIDATE CONSTRAINT fk_posts_users;
-- Duration: ~10-30 minutes
-- Lock: SHARE UPDATE EXCLUSIVE (allows reads/writes, blocks schema changes)
-- Can be canceled and restarted without issues
```

### Example 3: Safe Type Change with Expanding/Contracting

```sql
-- Scenario: Change users.age from INTEGER to VARCHAR(3) to support '18+'
-- users table: 50M rows

-- EXPAND PHASE

-- Step 1: Add new column
ALTER TABLE users ADD COLUMN age_new VARCHAR(3);

-- Step 2: Backfill in batches
DO $$
DECLARE
  batch_size INTEGER := 10000;
  affected INTEGER;
BEGIN
  LOOP
    UPDATE users
    SET age_new = age::TEXT
    WHERE id IN (
      SELECT id FROM users
      WHERE age_new IS NULL AND age IS NOT NULL
      LIMIT batch_size
    );

    GET DIAGNOSTICS affected = ROW_COUNT;
    EXIT WHEN affected = 0;

    COMMIT;
    PERFORM pg_sleep(0.05);
  END LOOP;
END $$;

-- Step 3: Create trigger to keep columns in sync during transition
CREATE OR REPLACE FUNCTION sync_user_age()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.age IS NOT NULL THEN
      NEW.age_new := NEW.age::TEXT;
    END IF;
    IF NEW.age_new IS NOT NULL AND NEW.age_new ~ '^\d+$' THEN
      NEW.age := NEW.age_new::INTEGER;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_user_age
BEFORE INSERT OR UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION sync_user_age();

-- Step 4: Deploy app v2 that reads age_new, writes both columns

-- Step 5: Once backfill complete, deploy app v3 that only uses age_new

-- CONTRACT PHASE

-- Step 6: Drop trigger and old column
DROP TRIGGER trigger_sync_user_age ON users;
DROP FUNCTION sync_user_age();
ALTER TABLE users DROP COLUMN age;

-- Step 7: Rename new column
ALTER TABLE users RENAME COLUMN age_new TO age;

-- Step 8: Add index if needed
CREATE INDEX CONCURRENTLY idx_users_age ON users(age);
```

### Example 4: Adding NOT NULL with Validation

```sql
-- Scenario: Make users.email NOT NULL on 100M row table

-- Step 1: Add CHECK constraint as NOT VALID
ALTER TABLE users
ADD CONSTRAINT users_email_not_null
CHECK (email IS NOT NULL) NOT VALID;
-- Duration: < 10ms

-- Step 2: Fix any NULL values
UPDATE users SET email = 'unknown@example.com' WHERE email IS NULL;

-- Step 3: Validate constraint (scans table, but allows concurrent operations)
SET statement_timeout = '1h';
ALTER TABLE users VALIDATE CONSTRAINT users_email_not_null;
-- Duration: 5-20 minutes
-- Allows reads/writes, blocks only schema changes

-- Step 4: Set NOT NULL (fast since constraint already validated)
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
-- Duration: < 10ms

-- Step 5: Drop redundant CHECK constraint
ALTER TABLE users DROP CONSTRAINT users_email_not_null;
```

## Common Mistakes

### 1. Running CREATE INDEX Without CONCURRENTLY

**Wrong**:
```sql
-- Blocks all writes to users table
CREATE INDEX idx_users_email ON users(email);
```

**Correct**:
```sql
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
```

### 2. Adding NOT NULL Without Backfilling

**Wrong**:
```sql
ALTER TABLE users ADD COLUMN country VARCHAR(2) NOT NULL DEFAULT 'US';
-- On PG10 and earlier: Rewrites entire table!
```

**Correct**:
```sql
-- Add nullable, backfill, then set NOT NULL
ALTER TABLE users ADD COLUMN country VARCHAR(2);
UPDATE users SET country = 'US' WHERE country IS NULL;  -- in batches
ALTER TABLE users ALTER COLUMN country SET NOT NULL;
```

### 3. Validating Constraints in Single Transaction

**Wrong**:
```sql
BEGIN;
ALTER TABLE posts ADD CONSTRAINT fk_posts_users
  FOREIGN KEY (user_id) REFERENCES users(id);
-- Other migrations...
COMMIT;
-- Holds locks for entire transaction duration
```

**Correct**:
```sql
-- Separate transaction, allows progress monitoring
ALTER TABLE posts ADD CONSTRAINT fk_posts_users
  FOREIGN KEY (user_id) REFERENCES users(id) NOT VALID;

-- Later, in separate session
ALTER TABLE posts VALIDATE CONSTRAINT fk_posts_users;
```

### 4. Not Setting Lock Timeout

**Wrong**:
```sql
-- May wait indefinitely for lock
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
```

**Correct**:
```sql
SET lock_timeout = '5s';
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
-- Fails fast if lock not acquired
```

### 5. Creating Concurrent Index in Transaction

**Wrong**:
```sql
BEGIN;
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
COMMIT;
-- ERROR: CREATE INDEX CONCURRENTLY cannot run inside a transaction block
```

**Correct**:
```sql
-- Run outside transaction
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
```

### 6. Not Checking for Invalid Indexes

**Wrong**:
```sql
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
-- If interrupted, index may be INVALID
-- App assumes index exists and is usable
```

**Correct**:
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email);

-- Check for invalid indexes
SELECT indexname FROM pg_indexes WHERE indexdef LIKE '%INVALID%';

-- Clean up if needed
DROP INDEX CONCURRENTLY IF EXISTS idx_users_email;
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
```

## Best Practices

### 1. Always Use CONCURRENTLY for Indexes

```sql
-- Production standard
CREATE INDEX CONCURRENTLY idx_name ON table_name(column_name);

-- Exception: Small tables or maintenance windows
-- CREATE INDEX idx_name ON small_table(column);
```

### 2. Set Timeouts for All DDL

```sql
-- At session level
SET lock_timeout = '5s';
SET statement_timeout = '30min';

-- Or per statement
BEGIN;
SET LOCAL lock_timeout = '2s';
ALTER TABLE users ADD COLUMN status VARCHAR(20);
COMMIT;
```

### 3. Monitor Locks During Migrations

```sql
-- In separate session, monitor locks
SELECT
  NOW(),
  locktype,
  relation::regclass,
  mode,
  granted,
  pid
FROM pg_locks
WHERE NOT granted
ORDER BY relation;

-- Set up alerting for long-running locks
```

### 4. Use Multi-Step Patterns for Large Changes

Break dangerous operations into safe steps:
1. Add new columns (nullable)
2. Backfill data
3. Add constraints (NOT VALID)
4. Validate constraints
5. Set NOT NULL
6. Create indexes (CONCURRENTLY)

### 5. Test on Production-Sized Data

```bash
# Restore production dump to staging
pg_dump -Fc production_db > prod_dump.backup
pg_restore -d staging_db prod_dump.backup

# Test migration timing
\timing on
\i migration.sql
```

### 6. Plan for Rollback

Document rollback procedures:
```sql
-- Migration: add_user_roles.sql
-- Rollback: If issues occur, run rollback_user_roles.sql
-- Note: Rollback will drop role column and data
```

### 7. Communicate During Migrations

- Notify team before starting
- Monitor application metrics
- Watch error rates and latency
- Keep rollback script ready
- Document actual vs expected duration

## Practice Exercises

### Exercise 1: Safe Migration for User Profiles

Add a `profile_data JSONB` column to a 50M row users table without downtime.

**Solution**:

```sql
-- Step 1: Add nullable JSONB column (fast in PG11+)
BEGIN;
SET lock_timeout = '2s';
ALTER TABLE users ADD COLUMN profile_data JSONB;
COMMIT;

-- Step 2: Backfill with default empty object in batches
DO $$
DECLARE
  batch_size INTEGER := 10000;
  affected INTEGER;
BEGIN
  LOOP
    UPDATE users
    SET profile_data = '{}'::JSONB
    WHERE id IN (
      SELECT id FROM users
      WHERE profile_data IS NULL
      LIMIT batch_size
    );

    GET DIAGNOSTICS affected = ROW_COUNT;
    EXIT WHEN affected = 0;
    COMMIT;
    PERFORM pg_sleep(0.1);
  END LOOP;
END $$;

-- Step 3: Set NOT NULL
BEGIN;
SET lock_timeout = '2s';
ALTER TABLE users ALTER COLUMN profile_data SET NOT NULL;
COMMIT;

-- Step 4: Create GIN index concurrently for JSONB queries
CREATE INDEX CONCURRENTLY idx_users_profile_data
ON users USING gin(profile_data);
```

### Exercise 2: Split Address Column

Split `address TEXT` into `street`, `city`, `state`, `zip` without downtime on 20M row table.

**Solution**:

```sql
-- EXPAND PHASE

-- Step 1: Add new columns
ALTER TABLE customers ADD COLUMN street VARCHAR(255);
ALTER TABLE customers ADD COLUMN city VARCHAR(100);
ALTER TABLE customers ADD COLUMN state VARCHAR(2);
ALTER TABLE customers ADD COLUMN zip VARCHAR(10);

-- Step 2: Create function to parse address
CREATE OR REPLACE FUNCTION parse_address(addr TEXT)
RETURNS TABLE(street TEXT, city TEXT, state TEXT, zip TEXT) AS $$
BEGIN
  -- Simplified parser (real implementation would be more robust)
  RETURN QUERY SELECT
    SPLIT_PART(addr, ',', 1)::TEXT,
    SPLIT_PART(addr, ',', 2)::TEXT,
    SPLIT_PART(SPLIT_PART(addr, ',', 3), ' ', 1)::TEXT,
    SPLIT_PART(SPLIT_PART(addr, ',', 3), ' ', 2)::TEXT;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 3: Backfill in batches
DO $$
DECLARE
  batch_size INTEGER := 5000;
  affected INTEGER;
BEGIN
  LOOP
    UPDATE customers c
    SET
      street = p.street,
      city = p.city,
      state = p.state,
      zip = p.zip
    FROM (
      SELECT
        id,
        (parse_address(address)).*
      FROM customers
      WHERE street IS NULL
      LIMIT batch_size
    ) p
    WHERE c.id = p.id;

    GET DIAGNOSTICS affected = ROW_COUNT;
    EXIT WHEN affected = 0;
    COMMIT;
    PERFORM pg_sleep(0.1);
  END LOOP;
END $$;

-- Step 4: Create trigger to keep in sync during transition
CREATE OR REPLACE FUNCTION sync_customer_address()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.address IS NOT NULL THEN
      SELECT * INTO NEW.street, NEW.city, NEW.state, NEW.zip
      FROM parse_address(NEW.address);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_customer_address
BEFORE INSERT OR UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION sync_customer_address();

-- Step 5: Create indexes concurrently
CREATE INDEX CONCURRENTLY idx_customers_city ON customers(city);
CREATE INDEX CONCURRENTLY idx_customers_state ON customers(state);
CREATE INDEX CONCURRENTLY idx_customers_zip ON customers(zip);

-- Step 6: Deploy app v2 that uses new columns

-- CONTRACT PHASE

-- Step 7: Drop trigger and old column
DROP TRIGGER trigger_sync_customer_address ON customers;
DROP FUNCTION sync_customer_address();
DROP FUNCTION parse_address(TEXT);
ALTER TABLE customers DROP COLUMN address;
```

### Exercise 3: Add Composite Foreign Key with Validation

Add a foreign key from `order_items(order_id, product_id)` to `products(id, category_id)` on a billion-row table.

**Solution**:

```sql
-- Step 1: Ensure indexes exist on both sides
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_order_product
ON order_items(order_id, product_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_id_category
ON products(id, category_id);

-- Step 2: Add constraint as NOT VALID
BEGIN;
SET lock_timeout = '5s';
ALTER TABLE order_items
ADD CONSTRAINT fk_order_items_products
FOREIGN KEY (product_id, category_id)
REFERENCES products(id, category_id)
NOT VALID;
COMMIT;
-- Duration: < 1 second

-- Step 3: Monitor validation progress (in separate session)
SELECT
  pid,
  NOW() - query_start AS duration,
  wait_event_type,
  wait_event,
  state,
  query
FROM pg_stat_activity
WHERE query LIKE '%VALIDATE CONSTRAINT%';

-- Step 4: Validate constraint (can take hours, but non-blocking)
SET statement_timeout = '6h';
ALTER TABLE order_items VALIDATE CONSTRAINT fk_order_items_products;
-- Duration: 1-3 hours on billion rows
-- Allows concurrent reads/writes
-- Can be canceled and restarted
```

These exercises demonstrate real-world zero-downtime migration patterns for large-scale production databases.
