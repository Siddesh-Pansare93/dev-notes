# 15. Transactions and Locking in Practice

> **Level:** Beginner-friendly | **Databases covered:** PostgreSQL, MySQL, SQL Server, Oracle

---

## What Is a Transaction?

Imagine you are transferring $500 from your savings account to your checking account. This involves two steps:

1. Deduct $500 from savings.
2. Add $500 to checking.

What happens if the database crashes between step 1 and step 2? You lose $500 — it simply vanishes. A **transaction** prevents this by grouping both steps into a single all-or-nothing unit. Either both succeed, or neither happens.

A transaction follows the **ACID** properties:

| Property | Meaning |
|---|---|
| **A**tomicity | All steps succeed or none do |
| **C**onsistency | Data moves from one valid state to another |
| **I**solation | Concurrent transactions do not interfere with each other |
| **D**urability | Once committed, changes survive crashes |

---

## Transaction Syntax

Transaction syntax is one of the few areas where databases differ meaningfully.

```sql
-- PostgreSQL / MySQL
BEGIN;
  UPDATE accounts SET balance = balance - 500 WHERE id = 1;
  UPDATE accounts SET balance = balance + 500 WHERE id = 2;
COMMIT;

-- SQL Server
BEGIN TRANSACTION;
  UPDATE accounts SET balance = balance - 500 WHERE id = 1;
  UPDATE accounts SET balance = balance + 500 WHERE id = 2;
COMMIT TRANSACTION;

-- Oracle
-- No BEGIN needed. Transactions start implicitly on the first DML statement.
UPDATE accounts SET balance = balance - 500 WHERE id = 1;
UPDATE accounts SET balance = balance + 500 WHERE id = 2;
COMMIT;
```

To undo everything since the transaction started:

```sql
-- PostgreSQL / MySQL
ROLLBACK;

-- SQL Server
ROLLBACK TRANSACTION;

-- Oracle
ROLLBACK;
```

---

## Savepoints — Partial Rollbacks

A **savepoint** is a bookmark inside a transaction. You can roll back to a savepoint without discarding the entire transaction.

```sql
-- PostgreSQL / MySQL / Oracle
BEGIN;
  INSERT INTO orders (product, qty) VALUES ('Widget', 10);
  SAVEPOINT after_order;

  INSERT INTO shipments (order_id, address) VALUES (99, '123 Main St');
  -- Something went wrong with shipment only
  ROLLBACK TO SAVEPOINT after_order;

  -- The order INSERT is still alive; only the shipment was rolled back
COMMIT;

-- SQL Server uses different keywords
BEGIN TRANSACTION;
  INSERT INTO orders (product, qty) VALUES ('Widget', 10);
  SAVE TRANSACTION after_order;

  INSERT INTO shipments (order_id, address) VALUES (99, '123 Main St');
  ROLLBACK TRANSACTION after_order;  -- rolls back only to the savepoint

COMMIT TRANSACTION;
```

> **Key insight:** After `ROLLBACK TO SAVEPOINT`, the transaction is still open. You must still `COMMIT` or `ROLLBACK` the whole thing.

---

## Locking

When multiple users hit the database at the same time, the database uses **locks** to keep data consistent. There are two fundamental lock types:

| Lock Type | Who can hold it | Blocks |
|---|---|---|
| **Shared (read) lock** | Many readers simultaneously | Writers |
| **Exclusive (write) lock** | Only one writer | All readers and writers |

Normally the database acquires and releases locks automatically. But sometimes you need to control locking explicitly.

---

## SELECT FOR UPDATE — Lock Rows You Plan to Modify

When you read a row and intend to update it, another transaction could change that row between your `SELECT` and your `UPDATE`. `SELECT FOR UPDATE` grabs an exclusive lock on the rows immediately at read time.

```sql
-- PostgreSQL / Oracle / MySQL
BEGIN;
SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;
-- Row is now locked. Other transactions that try SELECT FOR UPDATE on this row will wait.
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
COMMIT;

-- SQL Server uses query hints instead
BEGIN TRANSACTION;
SELECT balance FROM accounts WITH (UPDLOCK, ROWLOCK) WHERE id = 1;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
COMMIT TRANSACTION;
```

---

## SELECT FOR SHARE — Lock Rows for Reading

Sometimes you want to say "I am reading this row, and nobody should change it until I am done, but other readers are fine."

```sql
-- PostgreSQL
SELECT * FROM products WHERE id = 42 FOR SHARE;

-- MySQL
SELECT * FROM products WHERE id = 42 LOCK IN SHARE MODE;

-- SQL Server (use HOLDLOCK hint which holds a shared lock until end of transaction)
SELECT * FROM products WITH (HOLDLOCK, ROWLOCK) WHERE id = 42;

-- Oracle
-- Oracle does not support a direct equivalent of SELECT FOR SHARE;
-- use FOR UPDATE if exclusive locking is acceptable, or rely on MVCC for reads.
```

---

## SKIP LOCKED — The Job Queue Pattern

Imagine a jobs table where multiple worker processes pull tasks off the queue. Without special handling, two workers could grab the same job. `SKIP LOCKED` tells the database: "Give me a row that is **not** already locked by anyone else, and skip right past the locked ones."

```sql
-- PostgreSQL / MySQL 8+ / Oracle / SQL Server 2019+
BEGIN;
SELECT id, payload
FROM jobs
WHERE status = 'pending'
ORDER BY created_at
LIMIT 1
FOR UPDATE SKIP LOCKED;

-- Process the job here...
UPDATE jobs SET status = 'done' WHERE id = :fetched_id;
COMMIT;
```

This pattern works identically across PostgreSQL, MySQL 8+, Oracle, and SQL Server — one of the rare cases of full cross-database compatibility.

> **Why it matters:** Without `SKIP LOCKED`, workers would pile up waiting for each other's locks. With it, each worker immediately moves on to the next available job.

---

## NOWAIT — Fail Fast Instead of Waiting

By default, if a row is locked, your query waits until the lock is released. `NOWAIT` changes this: if the row is already locked, return an error immediately instead of waiting.

```sql
-- PostgreSQL / MySQL 8+ / Oracle
SELECT * FROM accounts WHERE id = 1 FOR UPDATE NOWAIT;
-- Error: could not obtain lock on row in relation "accounts"

-- SQL Server
SELECT * FROM accounts WITH (UPDLOCK, ROWLOCK, NOWAIT) WHERE id = 1;
```

Use `NOWAIT` when waiting would make the user experience worse than showing a "try again" message.

---

## Table Locks — Use Sparingly

Row-level locks are fine-grained and usually what you want. Occasionally you need to lock an entire table — for example, during a bulk load or schema migration.

```sql
-- PostgreSQL
LOCK TABLE products IN EXCLUSIVE MODE;

-- MySQL
LOCK TABLES products WRITE;
-- (remember to unlock when done)
UNLOCK TABLES;

-- SQL Server
SELECT * FROM products WITH (TABLOCKX);  -- TABLOCKX = exclusive table lock

-- Oracle
LOCK TABLE products IN EXCLUSIVE MODE;
```

> **Warning:** Table locks block all concurrent readers and writers. In production, a table lock on a busy table can cause a cascade of timeouts. Prefer row-level locks whenever possible.

---

## Deadlocks

A **deadlock** occurs when two transactions are each waiting for a lock the other holds, so neither can proceed.

**Example:**

| Time | Transaction A | Transaction B |
|---|---|---|
| T1 | Locks row 1 | Locks row 2 |
| T2 | Tries to lock row 2 — **waits** | Tries to lock row 1 — **waits** |
| T3 | Stuck forever | Stuck forever |

**Detection and Resolution**

All major databases detect deadlocks automatically by looking for cycles in the lock-wait graph. When a deadlock is found, the database picks one transaction as the "victim" and rolls it back, freeing the other to continue. Your application receives an error and should retry the transaction.

**Prevention Strategies**

1. **Always access tables and rows in the same order.** If Transaction A always locks `accounts` before `orders`, and Transaction B does the same, they can never deadlock each other.

2. **Keep transactions short.** The longer a transaction holds locks, the higher the chance of deadlock.

3. **Use `SELECT FOR UPDATE` early.** Acquire all the locks you need at the start of the transaction, not scattered throughout.

4. **Use lower isolation levels when safe** (see next section) — fewer locks means fewer deadlocks.

**Lock Timeout Settings**

Rather than waiting forever, set a timeout after which a blocked lock attempt fails with an error:

```sql
-- PostgreSQL
SET lock_timeout = '5s';

-- MySQL
SET innodb_lock_wait_timeout = 5;  -- seconds

-- SQL Server
SET LOCK_TIMEOUT 5000;  -- milliseconds

-- Oracle
-- Use WAIT clause directly on the statement
SELECT * FROM accounts WHERE id = 1 FOR UPDATE WAIT 5;
```

---

## Isolation Levels in Practice

Isolation levels control how much one transaction can see of what other **concurrent** transactions are doing. Higher isolation = more safety, more locking, less concurrency. Lower isolation = more concurrency, but more anomalies are possible.

### The Four Standard Levels

| Isolation Level | Dirty Read | Non-Repeatable Read | Phantom Read |
|---|---|---|---|
| READ UNCOMMITTED | Possible | Possible | Possible |
| READ COMMITTED | Safe | Possible | Possible |
| REPEATABLE READ | Safe | Safe | Possible (MySQL: safe) |
| SERIALIZABLE | Safe | Safe | Safe |

**Dirty Read:** You read data another uncommitted transaction wrote. If that transaction rolls back, you read data that never officially existed.

**Non-Repeatable Read:** You read a row twice in one transaction and get different values because another transaction committed a change in between.

**Phantom Read:** You run the same query twice and get different rows because another transaction inserted or deleted rows that match your filter.

### Setting the Isolation Level

```sql
-- PostgreSQL
BEGIN;
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
-- ... your queries ...
COMMIT;

-- MySQL
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
BEGIN;
-- ... your queries ...
COMMIT;

-- SQL Server
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
BEGIN TRANSACTION;
-- ... your queries ...
COMMIT TRANSACTION;

-- Oracle
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
-- ... your queries ...
COMMIT;
```

> **Defaults:** PostgreSQL = READ COMMITTED. MySQL InnoDB = REPEATABLE READ. SQL Server = READ COMMITTED. Oracle = READ COMMITTED.

### Practical Demonstration

```sql
-- Session A: REPEATABLE READ
BEGIN;
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
SELECT COUNT(*) FROM products WHERE category = 'Electronics';
-- Returns: 42

-- Session B (concurrent): inserts a new electronics product and commits
INSERT INTO products (name, category) VALUES ('New Gadget', 'Electronics');
COMMIT;

-- Session A: same query again
SELECT COUNT(*) FROM products WHERE category = 'Electronics';
-- PostgreSQL/MySQL REPEATABLE READ: still returns 42 (phantom prevented)
-- SQL Server READ COMMITTED: would return 43 (phantom visible)
COMMIT;
```

---

## Advisory Locks (PostgreSQL Only)

PostgreSQL has a unique feature called **advisory locks** — application-level locks that are not tied to any table row. You invent a lock ID (any integer), and use it to coordinate work across processes.

```sql
-- Try to acquire an advisory lock (non-blocking, returns true/false)
SELECT pg_try_advisory_lock(12345);
-- Returns true if lock was acquired, false if another session holds it

-- Acquire with blocking (waits until available)
SELECT pg_advisory_lock(12345);

-- Release the lock
SELECT pg_advisory_unlock(12345);

-- Session-level lock (released when session disconnects)
SELECT pg_advisory_lock(42);

-- Transaction-level lock (released automatically at COMMIT/ROLLBACK)
SELECT pg_try_advisory_xact_lock(42);
```

**Use case:** Preventing two application servers from running the same scheduled job simultaneously, without creating a dedicated jobs-lock table.

---

## Real-World Examples

### Bank Transfer with Proper Transaction

```sql
-- Works in PostgreSQL / MySQL (adapt BEGIN syntax for SQL Server / Oracle)
BEGIN;

-- Lock both rows upfront to prevent deadlock (always lock in ID order)
SELECT id, balance FROM accounts WHERE id IN (1, 2) ORDER BY id FOR UPDATE;

-- Check sufficient funds
-- (application checks the result here before proceeding)

UPDATE accounts SET balance = balance - 500 WHERE id = 1;
UPDATE accounts SET balance = balance + 500 WHERE id = 2;

-- Record the transfer
INSERT INTO transfer_log (from_id, to_id, amount, transferred_at)
VALUES (1, 2, 500, NOW());

COMMIT;
-- On any error: ROLLBACK;
```

### Job Queue with SKIP LOCKED

```sql
-- Worker process picks one pending job without blocking other workers
BEGIN;

SELECT id, payload, retry_count
FROM job_queue
WHERE status = 'pending'
  AND scheduled_at <= NOW()
ORDER BY priority DESC, scheduled_at ASC
LIMIT 1
FOR UPDATE SKIP LOCKED;

-- If a row was returned, mark it in-progress
UPDATE job_queue
SET status = 'processing', started_at = NOW(), worker_id = :my_worker_id
WHERE id = :fetched_id;

COMMIT;
-- Worker now processes job_queue row :fetched_id independently
```

### Optimistic Locking with a Version Column

Instead of locking rows at read time, **optimistic locking** detects conflicts at write time. It is useful when conflicts are rare and you want maximum read concurrency.

```sql
-- 1. Read the row and note the version
SELECT id, balance, version FROM accounts WHERE id = 1;
-- Returns: id=1, balance=1000, version=7

-- 2. Update ONLY if version hasn't changed (meaning nobody else edited it)
UPDATE accounts
SET balance = balance - 100,
    version = version + 1       -- bump the version
WHERE id = 1
  AND version = 7;              -- optimistic check

-- 3. Check how many rows were updated
-- If 0 rows updated: someone else changed the row — retry or show conflict error
-- If 1 row updated: success
```

This approach requires zero extra locks for reads but must handle the "0 rows updated" case in application code.

---

## Key Takeaways

- A **transaction** groups SQL statements into an all-or-nothing unit. Use `BEGIN` / `COMMIT` (or the database-specific equivalent) every time you modify related data together.
- **Savepoints** let you roll back part of a transaction without losing all the work done before the savepoint.
- **Shared locks** allow many readers; **exclusive locks** allow one writer and block everyone else.
- `SELECT FOR UPDATE` is the go-to tool for locking rows you are about to modify.
- `SKIP LOCKED` and `NOWAIT` are power tools for job queues and fast-fail scenarios respectively.
- **Deadlocks** are automatically detected and resolved, but you should still design your transactions to access resources in a consistent order.
- **Isolation levels** trade concurrency against correctness. Start with the default (usually READ COMMITTED), and upgrade to REPEATABLE READ or SERIALIZABLE only when you see real anomalies.
- PostgreSQL's **advisory locks** give you application-level coordination without touching your data tables.

---

## Quiz

**Q1.** You run `SELECT balance FROM accounts WHERE id = 5 FOR UPDATE` and then decide you do not need to change anything. What should you do?

A) Nothing — the lock releases automatically after the SELECT.
B) Run `ROLLBACK` or `COMMIT` to end the transaction and release the lock.
C) Run `UNLOCK ROW 5`.

**Q2.** Two workers are pulling jobs from a `job_queue` table. Worker A locks row 101. Worker B runs `SELECT ... FOR UPDATE SKIP LOCKED`. What happens to row 101 from Worker B's perspective?

A) Worker B waits until Worker A releases the lock.
B) Worker B gets an error immediately.
C) Worker B skips row 101 and picks the next available unlocked row.

**Q3.** You are on `REPEATABLE READ` isolation and run the same `SELECT COUNT(*)` query twice in the same transaction. Between your two queries, another session inserts a matching row and commits. What count do you see the second time in PostgreSQL?

A) The new higher count, because the other session committed.
B) The original count, because REPEATABLE READ prevents phantom reads in PostgreSQL.
C) An error, because the data changed.

**Answers:** Q1 = B, Q2 = C, Q3 = B

---

*Next chapter: Indexes and Query Performance*
