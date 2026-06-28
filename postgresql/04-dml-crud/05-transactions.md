# Transactions in PostgreSQL

## Table of Contents
- [Theory](#theory)
- [Syntax](#syntax)
- [Examples](#examples)
- [Common Mistakes](#common-mistakes)
- [Best Practices](#best-practices)
- [Practice Exercises](#practice-exercises)

## Theory

### What are Transactions?

A transaction is a sequence of one or more SQL operations that are executed as a single unit of work. Transactions ensure data integrity and consistency by guaranteeing that either all operations succeed together or none of them take effect (all-or-nothing principle).

### ACID Properties

Transactions must satisfy four critical properties known as ACID:

1. **Atomicity**: All operations in a transaction succeed or all fail. No partial updates.
2. **Consistency**: A transaction brings the database from one valid state to another, maintaining all integrity constraints.
3. **Isolation**: Concurrent transactions don't interfere with each other. The results are the same as if transactions ran sequentially.
4. **Durability**: Once committed, changes persist even if the system crashes.

### Transaction Lifecycle

```
BEGIN → Execute SQL statements → COMMIT (success)
                               → ROLLBACK (failure/abort)
```

### Why Transactions Matter

- **Data Integrity**: Prevent partial updates that leave data in inconsistent state
- **Error Recovery**: Undo changes when errors occur
- **Concurrent Access**: Allow multiple users to work simultaneously
- **Business Logic**: Enforce multi-step operations as atomic units
- **Audit Trail**: Clear boundaries for tracking changes

### Autocommit Behavior

By default, PostgreSQL operates in autocommit mode:
- Each individual SQL statement is automatically wrapped in a transaction
- Committed immediately upon successful execution
- Cannot be rolled back once executed

To group multiple statements, use explicit transactions with BEGIN/COMMIT.

### Transaction Isolation Levels

PostgreSQL supports four isolation levels (from least to most strict):

1. **READ UNCOMMITTED**: Not truly supported; behaves like READ COMMITTED
2. **READ COMMITTED** (default): Sees only committed data; queries see latest committed data
3. **REPEATABLE READ**: Sees snapshot from transaction start; prevents non-repeatable reads
4. **SERIALIZABLE**: Strictest; transactions appear to execute serially

### Common Concurrency Issues

| Issue | Description | Prevented By |
|-------|-------------|--------------|
| Dirty Read | Reading uncommitted data | READ COMMITTED+ |
| Non-repeatable Read | Same query returns different results | REPEATABLE READ+ |
| Phantom Read | New rows appear in query results | SERIALIZABLE |
| Lost Update | Concurrent updates overwrite each other | Locking, SERIALIZABLE |

### Deadlocks

A deadlock occurs when two or more transactions are waiting for each other to release locks:
- Transaction A holds Lock 1, wants Lock 2
- Transaction B holds Lock 2, wants Lock 1
- PostgreSQL automatically detects and aborts one transaction

## Syntax

### Basic Transaction Control

```sql
-- Start a transaction
BEGIN;
-- or
START TRANSACTION;

-- Commit changes
COMMIT;

-- Rollback changes
ROLLBACK;
-- or
ABORT;
```

### Savepoints

```sql
-- Create a savepoint
SAVEPOINT savepoint_name;

-- Rollback to savepoint (undo changes after savepoint)
ROLLBACK TO SAVEPOINT savepoint_name;

-- Release savepoint (remove savepoint, keep changes)
RELEASE SAVEPOINT savepoint_name;
```

### Setting Transaction Isolation Level

```sql
-- For single transaction
BEGIN TRANSACTION ISOLATION LEVEL level_name;
-- or
BEGIN;
SET TRANSACTION ISOLATION LEVEL level_name;

-- For current session
SET SESSION CHARACTERISTICS AS TRANSACTION ISOLATION LEVEL level_name;

-- For specific transaction properties
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
```

### Transaction Modes

```sql
-- Read-only transaction
BEGIN TRANSACTION READ ONLY;

-- Read-write transaction (default)
BEGIN TRANSACTION READ WRITE;

-- Deferrable transaction (SERIALIZABLE only)
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE DEFERRABLE;
```

## Examples

### Example 1: Basic Transaction with COMMIT

```sql
-- Create sample tables
CREATE TABLE accounts (
    account_id SERIAL PRIMARY KEY,
    account_holder VARCHAR(100),
    balance NUMERIC(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transactions (
    transaction_id SERIAL PRIMARY KEY,
    from_account INTEGER REFERENCES accounts(account_id),
    to_account INTEGER REFERENCES accounts(account_id),
    amount NUMERIC(10, 2),
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

-- Insert initial data
INSERT INTO accounts (account_holder, balance)
VALUES
    ('Alice Johnson', 1000.00),
    ('Bob Smith', 500.00),
    ('Carol White', 750.00);

-- Basic transaction: Transfer money between accounts
BEGIN;

-- Deduct from sender
UPDATE accounts
SET balance = balance - 100.00
WHERE account_id = 1;

-- Add to receiver
UPDATE accounts
SET balance = balance + 100.00
WHERE account_id = 2;

-- Record the transaction
INSERT INTO transactions (from_account, to_account, amount, description)
VALUES (1, 2, 100.00, 'Transfer from Alice to Bob');

-- Commit the transaction
COMMIT;

-- Verify results
SELECT account_id, account_holder, balance FROM accounts;
SELECT * FROM transactions;
```

### Example 2: Transaction with ROLLBACK

```sql
-- Start a transaction
BEGIN;

-- Attempt to transfer more than available balance
UPDATE accounts
SET balance = balance - 1500.00
WHERE account_id = 1;

-- Check the balance (will be negative!)
SELECT account_id, account_holder, balance FROM accounts WHERE account_id = 1;

-- This violates business rules, so rollback
ROLLBACK;

-- Verify balance is unchanged
SELECT account_id, account_holder, balance FROM accounts WHERE account_id = 1;

-- Better approach: Add constraint to prevent negative balance
ALTER TABLE accounts ADD CONSTRAINT positive_balance CHECK (balance >= 0);

-- Now try the same invalid transaction
BEGIN;

UPDATE accounts
SET balance = balance - 1500.00
WHERE account_id = 1;
-- ERROR: new row violates check constraint "positive_balance"

-- Transaction automatically aborted, but good practice to explicitly rollback
ROLLBACK;
```

### Example 3: Savepoints and Partial Rollback

```sql
-- Complex transaction with multiple steps
BEGIN;

-- Step 1: Create a new account
INSERT INTO accounts (account_holder, balance)
VALUES ('David Brown', 0.00)
RETURNING account_id; -- Let's say it returns 4

-- Create first savepoint
SAVEPOINT after_account_creation;

-- Step 2: Initial deposit
UPDATE accounts
SET balance = balance + 500.00
WHERE account_id = 4;

-- Create second savepoint
SAVEPOINT after_initial_deposit;

-- Step 3: Transfer from another account
UPDATE accounts
SET balance = balance - 200.00
WHERE account_id = 1;

UPDATE accounts
SET balance = balance + 200.00
WHERE account_id = 4;

-- Check current state
SELECT account_id, account_holder, balance FROM accounts WHERE account_id IN (1, 4);

-- Oops! Let's undo the transfer but keep the deposit
ROLLBACK TO SAVEPOINT after_initial_deposit;

-- Check state after partial rollback
SELECT account_id, account_holder, balance FROM accounts WHERE account_id IN (1, 4);

-- Continue with different operation
UPDATE accounts
SET balance = balance + 50.00
WHERE account_id = 4;

-- Release savepoint (no longer needed)
RELEASE SAVEPOINT after_initial_deposit;

-- Commit everything
COMMIT;

-- Final verification
SELECT account_id, account_holder, balance FROM accounts ORDER BY account_id;
```

### Example 4: Autocommit vs Explicit Transactions

```sql
-- Autocommit mode (default)
-- Each statement is a separate transaction

UPDATE accounts SET balance = balance + 10 WHERE account_id = 1;
-- Immediately committed, cannot be rolled back

UPDATE accounts SET balance = balance + 10 WHERE account_id = 2;
-- Separate transaction, also committed

-- If second update fails, first one is still committed!

-- Explicit transaction
BEGIN;

UPDATE accounts SET balance = balance + 10 WHERE account_id = 1;
UPDATE accounts SET balance = balance + 10 WHERE account_id = 2;
UPDATE accounts SET balance = balance + 10 WHERE account_id = 3;

-- All succeed together or all fail
COMMIT;

-- Demonstrating autocommit issue
CREATE TABLE test_autocommit (
    id SERIAL PRIMARY KEY,
    value INTEGER
);

-- These are separate transactions
INSERT INTO test_autocommit (value) VALUES (1);
INSERT INTO test_autocommit (value) VALUES (2);
INSERT INTO test_autocommit (value) VALUES ('invalid'); -- Error! But previous inserts are committed

-- Check what was inserted
SELECT * FROM test_autocommit; -- Shows 1 and 2

-- With explicit transaction
DELETE FROM test_autocommit;

BEGIN;
INSERT INTO test_autocommit (value) VALUES (10);
INSERT INTO test_autocommit (value) VALUES (20);
INSERT INTO test_autocommit (value) VALUES ('invalid'); -- Error!
COMMIT; -- Cannot commit due to error

-- Check what was inserted
SELECT * FROM test_autocommit; -- Shows nothing, all rolled back
```

### Example 5: Transaction Isolation Levels - READ COMMITTED

```sql
-- READ COMMITTED (default isolation level)
-- Transaction sees only committed data
-- Non-repeatable reads are possible

-- Session 1
BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED;

SELECT balance FROM accounts WHERE account_id = 1;
-- Returns: 900.00

-- Session 2 (in parallel)
BEGIN;
UPDATE accounts SET balance = 950.00 WHERE account_id = 1;
COMMIT;

-- Back to Session 1
SELECT balance FROM accounts WHERE account_id = 1;
-- Returns: 950.00 (different from first SELECT!)
-- This is a non-repeatable read

COMMIT;

-- Demonstration in single session with concurrent simulation
CREATE TABLE inventory (
    product_id SERIAL PRIMARY KEY,
    product_name VARCHAR(100),
    quantity INTEGER
);

INSERT INTO inventory (product_name, quantity)
VALUES ('Widget', 100);

-- Session 1 starts
BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED;

SELECT quantity FROM inventory WHERE product_id = 1;
-- Returns: 100

-- Simulate another session updating
-- (In real scenario, this would be another connection)
-- Session 2 would do:
-- BEGIN;
-- UPDATE inventory SET quantity = 90 WHERE product_id = 1;
-- COMMIT;

-- For demonstration, we'll commit Session 1 first
COMMIT;
```

### Example 6: Transaction Isolation Levels - REPEATABLE READ

```sql
-- REPEATABLE READ: Sees snapshot from transaction start
-- Prevents non-repeatable reads
-- But phantom reads can still occur

-- Clean up and reset
DELETE FROM inventory;
INSERT INTO inventory (product_name, quantity)
VALUES ('Widget', 100);

-- Session 1
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ;

SELECT quantity FROM inventory WHERE product_id = 1;
-- Returns: 100

-- Session 2 (simulate in another terminal/session)
-- BEGIN;
-- UPDATE inventory SET quantity = 90 WHERE product_id = 1;
-- COMMIT;

-- Back to Session 1 (same transaction)
SELECT quantity FROM inventory WHERE product_id = 1;
-- Still returns: 100 (sees snapshot from transaction start)

-- Try to update based on old snapshot
UPDATE inventory SET quantity = quantity - 10 WHERE product_id = 1;
-- ERROR: could not serialize access due to concurrent update
-- PostgreSQL detects conflict and aborts transaction

ROLLBACK;

-- Demonstration with phantom reads
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    category VARCHAR(50),
    price NUMERIC(10, 2)
);

INSERT INTO products (category, price)
VALUES ('Electronics', 100), ('Electronics', 200);

-- Session 1
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ;

SELECT COUNT(*) FROM products WHERE category = 'Electronics';
-- Returns: 2

-- Session 2 inserts new row
-- BEGIN;
-- INSERT INTO products (category, price) VALUES ('Electronics', 300);
-- COMMIT;

-- Session 1 repeats query
SELECT COUNT(*) FROM products WHERE category = 'Electronics';
-- Still returns: 2 (no phantom read in PostgreSQL REPEATABLE READ)

COMMIT;
```

### Example 7: Transaction Isolation Levels - SERIALIZABLE

```sql
-- SERIALIZABLE: Strictest isolation
-- Transactions appear to execute serially
-- Prevents all concurrency issues but may cause more conflicts

-- Create test table
CREATE TABLE bank_totals (
    total_id INTEGER PRIMARY KEY,
    total_amount NUMERIC(12, 2)
);

INSERT INTO bank_totals (total_id, total_amount)
VALUES (1, 2250.00); -- Sum of all account balances

-- Session 1: Calculate and update total
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;

SELECT SUM(balance) AS calculated_total FROM accounts;

UPDATE bank_totals
SET total_amount = (SELECT SUM(balance) FROM accounts)
WHERE total_id = 1;

-- Don't commit yet...

-- Session 2: Update an account (simulate in another session)
-- BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
-- UPDATE accounts SET balance = balance + 100 WHERE account_id = 1;
-- COMMIT;

-- Back to Session 1: Try to commit
COMMIT;
-- If Session 2 committed first, Session 1 might get:
-- ERROR: could not serialize access due to read/write dependencies

-- One transaction will be aborted to prevent inconsistency
ROLLBACK;

-- Practical example: Prevent double-booking
CREATE TABLE event_seats (
    seat_id INTEGER PRIMARY KEY,
    is_booked BOOLEAN DEFAULT false,
    booked_by VARCHAR(100)
);

INSERT INTO event_seats (seat_id, is_booked)
SELECT generate_series(1, 10), false;

-- Session 1: Try to book seat 5
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;

SELECT is_booked FROM event_seats WHERE seat_id = 5;
-- Returns: false

-- Session 2: Also tries to book seat 5
-- BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
-- SELECT is_booked FROM event_seats WHERE seat_id = 5;
-- Returns: false

-- Session 1: Book the seat
UPDATE event_seats
SET is_booked = true, booked_by = 'Alice'
WHERE seat_id = 5 AND is_booked = false;

COMMIT;

-- Session 2: Try to commit
-- UPDATE event_seats SET is_booked = true, booked_by = 'Bob'
-- WHERE seat_id = 5 AND is_booked = false;
-- COMMIT;
-- ERROR: could not serialize access
-- One transaction succeeds, other is aborted
```

### Example 8: SET TRANSACTION Command

```sql
-- Set isolation level for current transaction
BEGIN;
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;

SELECT * FROM accounts;
UPDATE accounts SET balance = balance + 10 WHERE account_id = 1;

COMMIT;

-- Set as read-only
BEGIN;
SET TRANSACTION READ ONLY;

SELECT * FROM accounts; -- Works
-- UPDATE accounts SET balance = 100; -- ERROR: cannot execute UPDATE in read-only transaction

COMMIT;

-- Set multiple properties
BEGIN;
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;

SELECT SUM(balance) FROM accounts; -- Safe, consistent snapshot

COMMIT;

-- Set for entire session
SET SESSION CHARACTERISTICS AS TRANSACTION ISOLATION LEVEL REPEATABLE READ;

-- All subsequent transactions use REPEATABLE READ
BEGIN;
SELECT * FROM accounts;
COMMIT;

-- Reset to default
SET SESSION CHARACTERISTICS AS TRANSACTION ISOLATION LEVEL READ COMMITTED;
```

### Example 9: Deadlock Detection and Handling

```sql
-- Create test tables
CREATE TABLE resource_a (
    id INTEGER PRIMARY KEY,
    value INTEGER
);

CREATE TABLE resource_b (
    id INTEGER PRIMARY KEY,
    value INTEGER
);

INSERT INTO resource_a (id, value) VALUES (1, 100);
INSERT INTO resource_b (id, value) VALUES (1, 200);

-- Session 1
BEGIN;
UPDATE resource_a SET value = 110 WHERE id = 1; -- Locks resource_a
-- Don't commit yet...

-- Session 2 (in another terminal)
-- BEGIN;
-- UPDATE resource_b SET value = 210 WHERE id = 1; -- Locks resource_b

-- Session 1: Try to update resource_b
UPDATE resource_b SET value = 220 WHERE id = 1;
-- Waits for Session 2 to release lock...

-- Session 2: Try to update resource_a
-- UPDATE resource_a SET value = 120 WHERE id = 1;
-- Waits for Session 1 to release lock...

-- DEADLOCK! PostgreSQL detects and aborts one transaction:
-- ERROR: deadlock detected
-- DETAIL: Process 1234 waits for ShareLock on transaction 5678; blocked by process 5678.
-- Process 5678 waits for ShareLock on transaction 1234; blocked by process 1234.

-- One transaction succeeds, the other is aborted
ROLLBACK;

-- How to avoid deadlocks:
-- 1. Always access resources in the same order
BEGIN;
UPDATE resource_a SET value = 110 WHERE id = 1;
UPDATE resource_b SET value = 220 WHERE id = 1;
COMMIT;

-- Session 2 should also access in same order
-- BEGIN;
-- UPDATE resource_a SET value = 120 WHERE id = 1; -- Waits for Session 1
-- UPDATE resource_b SET value = 230 WHERE id = 1;
-- COMMIT;

-- No deadlock! Session 2 waits for Session 1 to complete
```

### Example 10: Advisory Locks

```sql
-- Advisory locks are application-level locks
-- Useful for coordinating access to external resources

-- Session-level advisory lock
SELECT pg_advisory_lock(12345);

-- Lock acquired, do some work
UPDATE accounts SET balance = balance + 100 WHERE account_id = 1;

-- Release lock
SELECT pg_advisory_unlock(12345);

-- Transaction-level advisory lock (auto-released on commit)
BEGIN;

SELECT pg_advisory_xact_lock(12345);

-- Do work while holding lock
UPDATE accounts SET balance = balance + 50 WHERE account_id = 2;

COMMIT; -- Lock automatically released

-- Try lock (non-blocking)
SELECT pg_try_advisory_lock(12345);
-- Returns: true (acquired) or false (already locked)

-- Multiple locks using two integers (useful for table_id, row_id)
SELECT pg_advisory_lock(1, 100); -- Lock for table 1, row 100

-- Do work
UPDATE accounts SET balance = balance + 25 WHERE account_id = 1;

-- Release
SELECT pg_advisory_unlock(1, 100);

-- Practical example: Prevent concurrent job execution
CREATE TABLE scheduled_jobs (
    job_id INTEGER PRIMARY KEY,
    job_name VARCHAR(100),
    last_run TIMESTAMP,
    status VARCHAR(20)
);

INSERT INTO scheduled_jobs (job_id, job_name, last_run, status)
VALUES (1, 'daily_backup', NULL, 'pending');

-- Job execution with advisory lock
DO $$
BEGIN
    -- Try to acquire lock for job 1
    IF pg_try_advisory_lock(1) THEN
        -- Lock acquired, run the job
        UPDATE scheduled_jobs
        SET last_run = NOW(), status = 'running'
        WHERE job_id = 1;

        -- Simulate job work
        PERFORM pg_sleep(1);

        -- Job complete
        UPDATE scheduled_jobs
        SET status = 'completed'
        WHERE job_id = 1;

        -- Release lock
        PERFORM pg_advisory_unlock(1);
    ELSE
        -- Lock not acquired, job already running
        RAISE NOTICE 'Job already running';
    END IF;
END $$;
```

### Example 11: Practical Transaction Patterns

```sql
-- Pattern 1: Idempotent transaction (safe to retry)
CREATE OR REPLACE FUNCTION transfer_money(
    p_from_account INTEGER,
    p_to_account INTEGER,
    p_amount NUMERIC
) RETURNS VOID AS $$
BEGIN
    -- Check sufficient balance
    IF (SELECT balance FROM accounts WHERE account_id = p_from_account) < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;

    -- Deduct from sender
    UPDATE accounts
    SET balance = balance - p_amount
    WHERE account_id = p_from_account;

    -- Add to receiver
    UPDATE accounts
    SET balance = balance + p_amount
    WHERE account_id = p_to_account;

    -- Log transaction
    INSERT INTO transactions (from_account, to_account, amount, description)
    VALUES (p_from_account, p_to_account, p_amount, 'Money transfer');

    RAISE NOTICE 'Transfer successful';
END;
$$ LANGUAGE plpgsql;

-- Use in transaction
BEGIN;
SELECT transfer_money(1, 2, 50.00);
COMMIT;

-- Pattern 2: Optimistic locking with version numbers
CREATE TABLE documents (
    doc_id SERIAL PRIMARY KEY,
    content TEXT,
    version INTEGER DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO documents (content) VALUES ('Initial content');

-- Update with version check
BEGIN;

-- Read current version
SELECT doc_id, content, version FROM documents WHERE doc_id = 1;
-- Returns: doc_id=1, content='Initial content', version=1

-- Update only if version matches (no one else updated)
UPDATE documents
SET content = 'Updated content',
    version = version + 1,
    updated_at = CURRENT_TIMESTAMP
WHERE doc_id = 1 AND version = 1;

-- Check if update succeeded
GET DIAGNOSTICS updated_rows = ROW_COUNT;
IF updated_rows = 0 THEN
    RAISE EXCEPTION 'Document was modified by another user';
END IF;

COMMIT;

-- Pattern 3: Batch processing with error handling
DO $$
DECLARE
    r RECORD;
    error_count INTEGER := 0;
BEGIN
    FOR r IN SELECT account_id FROM accounts LOOP
        BEGIN
            -- Process each account in its own subtransaction
            UPDATE accounts
            SET balance = balance * 1.05
            WHERE account_id = r.account_id;
        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
            RAISE NOTICE 'Error processing account %: %', r.account_id, SQLERRM;
        END;
    END LOOP;

    RAISE NOTICE 'Processed with % errors', error_count;
END $$;
```

## Common Mistakes

### Mistake 1: Forgetting to COMMIT

```sql
-- BAD: Changes are lost when session ends
BEGIN;
UPDATE accounts SET balance = balance + 100 WHERE account_id = 1;
-- Session ends without COMMIT or ROLLBACK
-- Changes are rolled back!

-- GOOD: Always commit or rollback
BEGIN;
UPDATE accounts SET balance = balance + 100 WHERE account_id = 1;
COMMIT;
```

### Mistake 2: Long-Running Transactions

```sql
-- BAD: Holding locks for too long
BEGIN;
UPDATE accounts SET balance = balance + 10;
-- Long processing, user input, sleep, etc.
SELECT pg_sleep(300); -- 5 minutes!
COMMIT;
-- Blocks other transactions

-- GOOD: Keep transactions short
BEGIN;
UPDATE accounts SET balance = balance + 10;
COMMIT;
-- Do non-database work outside transaction
```

### Mistake 3: Not Handling Deadlocks

```sql
-- BAD: No retry logic
BEGIN;
UPDATE resource_a SET value = 1;
UPDATE resource_b SET value = 2;
COMMIT;
-- May fail with deadlock error

-- GOOD: Retry on deadlock (in application code)
-- CREATE OR REPLACE FUNCTION with_retry()...
-- EXCEPTION WHEN deadlock_detected THEN
--   RETRY with exponential backoff
```

### Mistake 4: Using Wrong Isolation Level

```sql
-- BAD: Using SERIALIZABLE for all transactions
-- Causes unnecessary conflicts and retries
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
SELECT * FROM accounts; -- Simple read
COMMIT;

-- GOOD: Use READ COMMITTED for simple queries
BEGIN; -- Defaults to READ COMMITTED
SELECT * FROM accounts;
COMMIT;

-- Use SERIALIZABLE only when needed
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
-- Complex logic requiring serialization
COMMIT;
```

### Mistake 5: Not Using Savepoints for Complex Logic

```sql
-- BAD: One error rolls back everything
BEGIN;
INSERT INTO accounts (account_holder, balance) VALUES ('New User', 0);
-- 10 more operations...
UPDATE accounts SET balance = 'invalid'; -- Error!
ROLLBACK; -- All operations lost!

-- GOOD: Use savepoints
BEGIN;
INSERT INTO accounts (account_holder, balance) VALUES ('New User', 0);
SAVEPOINT after_insert;
-- More operations with individual savepoints
COMMIT;
```

## Best Practices

### 1. Keep Transactions Short

```sql
-- Do this
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE account_id = 1;
UPDATE accounts SET balance = balance + 100 WHERE account_id = 2;
COMMIT;

-- Not this
BEGIN;
-- Complex calculations, external API calls, user input...
-- Hours of processing...
COMMIT;
```

### 2. Use Appropriate Isolation Level

```sql
-- Default (READ COMMITTED) for most cases
BEGIN;
SELECT * FROM accounts;
UPDATE accounts SET balance = balance + 10;
COMMIT;

-- REPEATABLE READ for consistent reporting
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ;
SELECT SUM(balance) FROM accounts; -- Snapshot
-- More queries on same snapshot
COMMIT;

-- SERIALIZABLE only when absolutely needed
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
-- Critical business logic requiring serialization
COMMIT;
```

### 3. Always Handle Exceptions

```sql
-- In application code or stored procedures
BEGIN;
    -- Operations
    UPDATE accounts SET balance = balance - 100 WHERE account_id = 1;
    COMMIT;
EXCEPTION WHEN OTHERS THEN
    ROLLBACK;
    RAISE NOTICE 'Transaction failed: %', SQLERRM;
END;
```

### 4. Use Savepoints for Complex Transactions

```sql
BEGIN;

INSERT INTO parent_table (data) VALUES ('parent');
SAVEPOINT after_parent;

BEGIN
    INSERT INTO child_table (data) VALUES ('child');
EXCEPTION WHEN OTHERS THEN
    ROLLBACK TO SAVEPOINT after_parent;
    -- Parent insert is preserved
END;

COMMIT;
```

### 5. Access Resources in Consistent Order

```sql
-- Always access tables in same order to prevent deadlocks
BEGIN;
UPDATE accounts WHERE account_id = 1;
UPDATE accounts WHERE account_id = 2;
COMMIT;

-- All transactions should use same ordering
```

### 6. Use Read-Only Transactions for Reports

```sql
-- Prevent accidental modifications
BEGIN TRANSACTION READ ONLY;
SELECT * FROM accounts;
SELECT * FROM transactions;
-- Cannot UPDATE/DELETE/INSERT
COMMIT;
```

### 7. Monitor Lock Waits

```sql
-- Check for blocked queries
SELECT
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_statement,
    blocking_activity.query AS blocking_statement
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks
    ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

## Practice Exercises

### Exercise 1: Banking Transactions

```sql
-- Create tables for banking system
-- Implement:
-- 1. Money transfer with validation (sufficient balance check)
-- 2. Rollback if transfer fails
-- 3. Use savepoints for batch transfers
-- 4. Handle concurrent transfers to same account
-- 5. Create audit log of all successful transfers
-- 6. Implement transaction retry on deadlock
```

### Exercise 2: E-commerce Order Processing

```sql
-- Create orders and inventory tables
-- Implement:
-- 1. Create order and reduce inventory atomically
-- 2. Rollback if inventory insufficient
-- 3. Use SERIALIZABLE to prevent double-booking of last item
-- 4. Implement order cancellation with inventory restoration
-- 5. Use savepoints for multi-item orders
-- 6. Handle concurrent orders for same product
```

### Exercise 3: Seat Reservation System

```sql
-- Create events and bookings tables
-- Implement:
-- 1. Reserve seat with conflict detection
-- 2. Prevent double-booking using appropriate isolation level
-- 3. Implement waitlist if seat unavailable
-- 4. Cancel reservation and free seat
-- 5. Use advisory locks for external payment processing
-- 6. Handle timeout scenarios (release reservation after 10 minutes)
```

## Summary

Transactions are fundamental to database integrity and consistency:

- **ACID properties** ensure reliable data management
- **BEGIN/COMMIT/ROLLBACK** control transaction boundaries
- **Savepoints** enable partial rollback in complex transactions
- **Isolation levels** balance consistency vs. concurrency
- **Deadlock detection** automatically resolves conflicts
- **Advisory locks** coordinate application-level resources

Understanding transactions is essential for building robust, concurrent database applications. Choose appropriate isolation levels, keep transactions short, and always handle exceptions properly.

## Related Topics

- [INSERT Operations](./01-insert.md) - Atomic data insertion
- [UPDATE and DELETE](./03-update-delete.md) - Modifying data safely
- [Constraints](../03-ddl-schema/03-constraints.md) - Enforcing data integrity
- [Indexes](../06-performance/01-indexes.md) - Locking and performance
- [Concurrency](../08-advanced/05-concurrency.md) - Advanced concurrency patterns
