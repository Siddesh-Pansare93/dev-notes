# Stored Procedures

## Table of Contents
- [Theory](#theory)
- [Syntax](#syntax)
- [Examples](#examples)
- [Common Mistakes](#common-mistakes)
- [Best Practices](#best-practices)
- [Practice Exercises](#practice-exercises)

## Theory

### What are Stored Procedures?

Stored procedures are database objects similar to functions but with key differences. Introduced in PostgreSQL 11, procedures support transaction control (COMMIT/ROLLBACK) within their body, which functions cannot do.

### Functions vs Procedures

| Feature | Functions | Procedures |
|---------|-----------|------------|
| **Transaction Control** | Cannot COMMIT/ROLLBACK | Can COMMIT/ROLLBACK |
| **Return Value** | Must return a value | No return value |
| **Invocation** | SELECT function_name() | CALL procedure_name() |
| **Use in Queries** | Can be used in SELECT | Cannot be used in SELECT |
| **OUT Parameters** | Supported | Supported |
| **RETURN Statement** | Returns value | Returns to caller (no value) |

### When to Use Procedures

**Use Procedures when:**
- You need transaction control (COMMIT/ROLLBACK)
- Performing data maintenance or batch operations
- Implementing multi-step processes with intermediate commits
- Long-running operations that need to commit incrementally
- Migration or ETL operations

**Use Functions when:**
- You need to return a value
- Using in SELECT queries
- Computation or transformation logic
- Set-returning operations
- No transaction control needed

### Transaction Control in Procedures

Procedures can contain multiple transactions:
- COMMIT: Commits current transaction, starts new one
- ROLLBACK: Rolls back current transaction, starts new one
- Each COMMIT/ROLLBACK is a transaction boundary
- Useful for batch processing to avoid long-running transactions

### Limitations

- Cannot be called from functions (functions cannot control transactions)
- Cannot be used in SQL expressions
- Must be called with CALL statement
- Cannot be used as table functions in FROM clause

## Syntax

### Basic CREATE PROCEDURE

```sql
CREATE [OR REPLACE] PROCEDURE procedure_name(parameter_list)
LANGUAGE plpgsql
AS $$
DECLARE
    -- Variable declarations
BEGIN
    -- Statements
    -- COMMIT; or ROLLBACK; allowed
END;
$$;
```

### Parameters

```sql
-- IN parameters (default)
CREATE PROCEDURE proc(IN param1 type1, ...)

-- OUT parameters
CREATE PROCEDURE proc(OUT param1 type1, ...)

-- INOUT parameters
CREATE PROCEDURE proc(INOUT param1 type1, ...)

-- Mixed parameters
CREATE PROCEDURE proc(
    IN input_param type1,
    OUT output_param type2,
    INOUT inout_param type3
)
```

### Calling Procedures

```sql
-- Simple call
CALL procedure_name(arguments);

-- With OUT parameters
CALL procedure_name(input_value, output_variable);

-- Anonymous block
DO $$
DECLARE
    result integer;
BEGIN
    CALL procedure_name(123, result);
    RAISE NOTICE 'Result: %', result;
END;
$$;
```

### Transaction Control

```sql
CREATE PROCEDURE example()
LANGUAGE plpgsql
AS $$
BEGIN
    -- First transaction
    INSERT INTO table1 VALUES (...);
    COMMIT;

    -- Second transaction
    INSERT INTO table2 VALUES (...);
    COMMIT;

    -- Third transaction
    UPDATE table3 SET ...;
    ROLLBACK;  -- Undo this update
END;
$$;
```

### Dropping Procedures

```sql
DROP PROCEDURE [IF EXISTS] procedure_name(parameter_types);
DROP PROCEDURE procedure_name(parameter_types) CASCADE;
```

## Examples

### Example 1: Basic Procedure

```sql
-- Create a simple procedure
CREATE OR REPLACE PROCEDURE greet_user(user_name text)
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE NOTICE 'Hello, %!', user_name;
END;
$$;

-- Call the procedure
CALL greet_user('Alice');
-- Output: NOTICE: Hello, Alice!

CALL greet_user('Bob');
-- Output: NOTICE: Hello, Bob!
```

### Example 2: Procedure with OUT Parameters

```sql
-- Create sample data
CREATE TABLE IF NOT EXISTS sales (
    sale_id serial PRIMARY KEY,
    product_id integer NOT NULL,
    quantity integer NOT NULL,
    price numeric(10,2) NOT NULL,
    sale_date date NOT NULL DEFAULT current_date
);

INSERT INTO sales (product_id, quantity, price, sale_date) VALUES
(1, 5, 100.00, '2024-01-15'),
(2, 3, 150.00, '2024-01-16'),
(1, 2, 100.00, '2024-01-17'),
(3, 7, 75.00, '2024-01-18');

-- Procedure with OUT parameters
CREATE OR REPLACE PROCEDURE calculate_sales_stats(
    IN product_id integer,
    OUT total_quantity bigint,
    OUT total_revenue numeric,
    OUT avg_price numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
    SELECT
        COALESCE(SUM(quantity), 0),
        COALESCE(SUM(quantity * price), 0),
        COALESCE(AVG(price), 0)
    INTO total_quantity, total_revenue, avg_price
    FROM sales
    WHERE sales.product_id = calculate_sales_stats.product_id;
END;
$$;

-- Call with OUT parameters
DO $$
DECLARE
    qty bigint;
    revenue numeric;
    avg_p numeric;
BEGIN
    CALL calculate_sales_stats(1, qty, revenue, avg_p);
    RAISE NOTICE 'Product 1 - Quantity: %, Revenue: $%, Avg Price: $%',
        qty, revenue, avg_p;
END;
$$;
```

### Example 3: Procedure with INOUT Parameters

```sql
-- Procedure with INOUT parameter
CREATE OR REPLACE PROCEDURE apply_discount(
    INOUT price numeric,
    IN discount_percent numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Validate discount
    IF discount_percent < 0 OR discount_percent > 100 THEN
        RAISE EXCEPTION 'Discount must be between 0 and 100';
    END IF;

    -- Apply discount to price
    price := price * (1 - discount_percent / 100);

    RAISE NOTICE 'Discount applied: %%, New price: $%',
        discount_percent, price;
END;
$$;

-- Call with INOUT parameter
DO $$
DECLARE
    product_price numeric := 100.00;
BEGIN
    RAISE NOTICE 'Original price: $%', product_price;
    CALL apply_discount(product_price, 20);
    RAISE NOTICE 'Final price: $%', product_price;
END;
$$;
```

### Example 4: Transaction Control - Batch Processing

```sql
-- Create log table
CREATE TABLE IF NOT EXISTS process_log (
    log_id serial PRIMARY KEY,
    message text NOT NULL,
    logged_at timestamp DEFAULT now()
);

-- Create staging table
CREATE TABLE IF NOT EXISTS sales_staging (
    id serial PRIMARY KEY,
    product_id integer,
    quantity integer,
    price numeric,
    processed boolean DEFAULT false
);

INSERT INTO sales_staging (product_id, quantity, price) VALUES
(1, 10, 50.00),
(2, 5, 75.00),
(3, 8, 60.00),
(4, 3, 100.00),
(5, 12, 45.00);

-- Procedure with transaction control
CREATE OR REPLACE PROCEDURE process_sales_batch(batch_size integer DEFAULT 10)
LANGUAGE plpgsql
AS $$
DECLARE
    staging_record RECORD;
    processed_count integer := 0;
    error_count integer := 0;
BEGIN
    FOR staging_record IN
        SELECT * FROM sales_staging
        WHERE NOT processed
        ORDER BY id
        LIMIT batch_size
    LOOP
        BEGIN
            -- Process individual record
            INSERT INTO sales (product_id, quantity, price)
            VALUES (staging_record.product_id,
                    staging_record.quantity,
                    staging_record.price);

            -- Mark as processed
            UPDATE sales_staging
            SET processed = true
            WHERE id = staging_record.id;

            processed_count := processed_count + 1;

            -- Commit after each record (incremental commit)
            COMMIT;

            RAISE NOTICE 'Processed record %', staging_record.id;

        EXCEPTION
            WHEN OTHERS THEN
                -- Rollback this record
                ROLLBACK;
                error_count := error_count + 1;

                -- Log error
                INSERT INTO process_log (message)
                VALUES ('Error processing record ' || staging_record.id ||
                        ': ' || SQLERRM);
                COMMIT;
        END;
    END LOOP;

    -- Final summary
    INSERT INTO process_log (message)
    VALUES (format('Batch complete. Processed: %s, Errors: %s',
                   processed_count, error_count));
    COMMIT;

    RAISE NOTICE 'Batch processing complete. Processed: %, Errors: %',
        processed_count, error_count;
END;
$$;

-- Run batch processing
CALL process_sales_batch(10);

-- Check results
SELECT * FROM process_log ORDER BY log_id DESC LIMIT 5;
SELECT * FROM sales_staging WHERE processed = true;
```

### Example 5: Large Data Migration with Commits

```sql
-- Create archive tables
CREATE TABLE IF NOT EXISTS sales_archive (
    LIKE sales INCLUDING ALL
);

-- Procedure to archive old sales
CREATE OR REPLACE PROCEDURE archive_old_sales(
    cutoff_date date,
    batch_size integer DEFAULT 1000
)
LANGUAGE plpgsql
AS $$
DECLARE
    total_archived integer := 0;
    batch_count integer;
BEGIN
    RAISE NOTICE 'Starting archive process for sales before %', cutoff_date;

    LOOP
        -- Move records in batches
        WITH moved_records AS (
            DELETE FROM sales
            WHERE sale_date < cutoff_date
            AND sale_id IN (
                SELECT sale_id
                FROM sales
                WHERE sale_date < cutoff_date
                LIMIT batch_size
            )
            RETURNING *
        )
        INSERT INTO sales_archive
        SELECT * FROM moved_records;

        -- Get count of records moved in this batch
        GET DIAGNOSTICS batch_count = ROW_COUNT;

        -- Exit if no more records
        EXIT WHEN batch_count = 0;

        total_archived := total_archived + batch_count;

        -- Commit after each batch
        COMMIT;

        RAISE NOTICE 'Archived % records (total: %)',
            batch_count, total_archived;

        -- Optional: Add delay between batches to reduce load
        PERFORM pg_sleep(0.1);
    END LOOP;

    -- Log final results
    INSERT INTO process_log (message)
    VALUES (format('Archived %s sales records before %s',
                   total_archived, cutoff_date));
    COMMIT;

    RAISE NOTICE 'Archive complete. Total archived: %', total_archived;
END;
$$;

-- Run archival
CALL archive_old_sales('2024-01-17', 2);
```

### Example 6: Procedure Calling Another Procedure

```sql
-- Helper procedure
CREATE OR REPLACE PROCEDURE log_message(
    msg text,
    msg_level text DEFAULT 'INFO'
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO process_log (message)
    VALUES (format('[%s] %s', msg_level, msg));
    COMMIT;
END;
$$;

-- Main procedure that calls helper
CREATE OR REPLACE PROCEDURE cleanup_old_data(days_to_keep integer)
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count integer;
    cutoff_date date;
BEGIN
    cutoff_date := current_date - days_to_keep;

    CALL log_message('Starting cleanup process', 'INFO');

    -- Delete old staging records
    DELETE FROM sales_staging
    WHERE id IN (
        SELECT id FROM sales_staging LIMIT 100
    );

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    CALL log_message(
        format('Deleted %s staging records', deleted_count),
        'INFO'
    );

    COMMIT;

    CALL log_message('Cleanup complete', 'INFO');
END;
$$;

-- Run cleanup
CALL cleanup_old_data(30);
```

### Example 7: Error Handling in Procedures

```sql
-- Procedure with comprehensive error handling
CREATE OR REPLACE PROCEDURE safe_update_sales(
    IN sale_id integer,
    IN new_quantity integer,
    IN new_price numeric,
    OUT success boolean,
    OUT error_message text
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Initialize
    success := false;
    error_message := NULL;

    -- Validation
    IF new_quantity <= 0 THEN
        error_message := 'Quantity must be positive';
        RETURN;
    END IF;

    IF new_price <= 0 THEN
        error_message := 'Price must be positive';
        RETURN;
    END IF;

    -- Perform update
    BEGIN
        UPDATE sales
        SET quantity = new_quantity,
            price = new_price
        WHERE sales.sale_id = safe_update_sales.sale_id;

        IF NOT FOUND THEN
            error_message := format('Sale %s not found', sale_id);
            RETURN;
        END IF;

        COMMIT;
        success := true;

    EXCEPTION
        WHEN OTHERS THEN
            ROLLBACK;
            error_message := SQLERRM;
            success := false;
    END;
END;
$$;

-- Test the procedure
DO $$
DECLARE
    is_success boolean;
    err_msg text;
BEGIN
    CALL safe_update_sales(1, 10, 150.00, is_success, err_msg);

    IF is_success THEN
        RAISE NOTICE 'Update successful';
    ELSE
        RAISE NOTICE 'Update failed: %', err_msg;
    END IF;
END;
$$;
```

### Example 8: Migrating from Function to Procedure

```sql
-- Original function (cannot use COMMIT/ROLLBACK)
CREATE OR REPLACE FUNCTION old_process_orders()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    processed integer := 0;
BEGIN
    -- All processing in single transaction
    -- Problem: Long running, holds locks
    UPDATE sales SET processed = true WHERE NOT processed;
    GET DIAGNOSTICS processed = ROW_COUNT;
    RETURN processed;
END;
$$;

-- Migrated to procedure (with incremental commits)
CREATE OR REPLACE PROCEDURE new_process_orders(
    OUT total_processed integer
)
LANGUAGE plpgsql
AS $$
DECLARE
    sale_rec RECORD;
    batch_count integer := 0;
BEGIN
    total_processed := 0;

    FOR sale_rec IN
        SELECT sale_id FROM sales WHERE NOT processed
    LOOP
        UPDATE sales
        SET processed = true
        WHERE sale_id = sale_rec.sale_id;

        total_processed := total_processed + 1;
        batch_count := batch_count + 1;

        -- Commit every 100 records
        IF batch_count >= 100 THEN
            COMMIT;
            batch_count := 0;
            RAISE NOTICE 'Committed batch, total processed: %',
                total_processed;
        END IF;
    END LOOP;

    -- Final commit
    IF batch_count > 0 THEN
        COMMIT;
    END IF;
END;
$$;

-- Call the new procedure
DO $$
DECLARE
    processed_count integer;
BEGIN
    CALL new_process_orders(processed_count);
    RAISE NOTICE 'Total processed: %', processed_count;
END;
$$;
```

### Example 9: Autonomous Transaction Pattern

```sql
-- Procedure for autonomous logging (always commits)
CREATE OR REPLACE PROCEDURE autonomous_log(
    msg text,
    level text DEFAULT 'INFO'
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO process_log (message)
    VALUES (format('[%s] %s', level, msg));

    -- Always commit the log, even if caller rolls back
    COMMIT;
END;
$$;

-- Main procedure that uses autonomous logging
CREATE OR REPLACE PROCEDURE risky_operation()
LANGUAGE plpgsql
AS $$
BEGIN
    CALL autonomous_log('Starting risky operation', 'INFO');

    -- Do some work
    INSERT INTO sales (product_id, quantity, price)
    VALUES (999, 1, 99.99);

    -- Simulate error
    IF random() > 0.5 THEN
        CALL autonomous_log('Operation failed', 'ERROR');
        RAISE EXCEPTION 'Random failure';
    END IF;

    CALL autonomous_log('Operation succeeded', 'INFO');
    COMMIT;
EXCEPTION
    WHEN OTHERS THEN
        -- Even though we rollback, logs are preserved
        ROLLBACK;
        CALL autonomous_log('Exception handled: ' || SQLERRM, 'ERROR');
        RAISE;
END;
$$;

-- Test
CALL risky_operation();
SELECT * FROM process_log ORDER BY log_id DESC;
```

### Example 10: Vacuum and Maintenance Procedure

```sql
-- Maintenance procedure
CREATE OR REPLACE PROCEDURE perform_maintenance(
    OUT tables_vacuumed integer,
    OUT tables_analyzed integer
)
LANGUAGE plpgsql
AS $$
DECLARE
    table_rec RECORD;
BEGIN
    tables_vacuumed := 0;
    tables_analyzed := 0;

    CALL log_message('Starting maintenance', 'INFO');

    -- Get all user tables
    FOR table_rec IN
        SELECT schemaname, tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        BEGIN
            -- Vacuum table
            EXECUTE format('VACUUM %I.%I',
                table_rec.schemaname,
                table_rec.tablename);
            tables_vacuumed := tables_vacuumed + 1;

            -- Analyze table
            EXECUTE format('ANALYZE %I.%I',
                table_rec.schemaname,
                table_rec.tablename);
            tables_analyzed := tables_analyzed + 1;

            CALL log_message(
                format('Maintained table %s', table_rec.tablename),
                'INFO'
            );

            -- Commit after each table
            COMMIT;

        EXCEPTION
            WHEN OTHERS THEN
                CALL log_message(
                    format('Error maintaining %s: %s',
                           table_rec.tablename, SQLERRM),
                    'ERROR'
                );
                ROLLBACK;
        END;
    END LOOP;

    CALL log_message(
        format('Maintenance complete. Vacuumed: %s, Analyzed: %s',
               tables_vacuumed, tables_analyzed),
        'INFO'
    );
END;
$$;

-- Run maintenance
DO $$
DECLARE
    vac_count integer;
    analyze_count integer;
BEGIN
    CALL perform_maintenance(vac_count, analyze_count);
    RAISE NOTICE 'Vacuumed: %, Analyzed: %', vac_count, analyze_count;
END;
$$;
```

## Common Mistakes

### 1. Trying to Return a Value

```sql
-- WRONG: Procedures don't return values
CREATE OR REPLACE PROCEDURE wrong_return()
RETURNS integer  -- Error!
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN 42;
END;
$$;

-- CORRECT: Use OUT parameter
CREATE OR REPLACE PROCEDURE correct_return(
    OUT result integer
)
LANGUAGE plpgsql
AS $$
BEGIN
    result := 42;
END;
$$;
```

### 2. Using Procedure in SELECT

```sql
-- WRONG: Cannot use procedure in SELECT
SELECT my_procedure();  -- Error!

-- CORRECT: Use CALL
CALL my_procedure();
```

### 3. Calling Procedure from Function

```sql
-- WRONG: Functions cannot call procedures
CREATE OR REPLACE FUNCTION bad_function()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    CALL my_procedure();  -- Error! Cannot control transactions
END;
$$;

-- CORRECT: Use procedure that calls procedure
CREATE OR REPLACE PROCEDURE good_procedure()
LANGUAGE plpgsql
AS $$
BEGIN
    CALL my_procedure();  -- OK
END;
$$;
```

### 4. Forgetting COMMIT After Operations

```sql
-- WRONG: Changes not committed
CREATE OR REPLACE PROCEDURE missing_commit()
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO process_log (message) VALUES ('Test');
    -- Forgot COMMIT - changes might not persist
END;
$$;

-- CORRECT: Explicit COMMIT
CREATE OR REPLACE PROCEDURE with_commit()
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO process_log (message) VALUES ('Test');
    COMMIT;
END;
$$;
```

### 5. Not Handling ROLLBACK State

```sql
-- WRONG: Assuming transaction is still active after ROLLBACK
CREATE OR REPLACE PROCEDURE bad_rollback_handling()
LANGUAGE plpgsql
AS $$
DECLARE
    temp_value integer;
BEGIN
    INSERT INTO sales (product_id, quantity, price)
    VALUES (1, 5, 100);

    ROLLBACK;

    -- temp_value from before ROLLBACK is lost
    -- Need to re-establish state after ROLLBACK
END;
$$;

-- CORRECT: Re-initialize after transaction boundary
CREATE OR REPLACE PROCEDURE good_rollback_handling()
LANGUAGE plpgsql
AS $$
DECLARE
    temp_value integer;
BEGIN
    INSERT INTO sales (product_id, quantity, price)
    VALUES (1, 5, 100);

    ROLLBACK;

    -- Re-query or re-initialize state as needed
    SELECT COUNT(*) INTO temp_value FROM sales;
END;
$$;
```

## Best Practices

### 1. Use Procedures for Batch Operations

```sql
-- Good: Incremental commits for large batch
CREATE OR REPLACE PROCEDURE batch_process(
    batch_size integer DEFAULT 1000
)
LANGUAGE plpgsql
AS $$
DECLARE
    processed integer := 0;
    batch_count integer;
BEGIN
    LOOP
        -- Process batch
        WITH updated AS (
            UPDATE sales
            SET processed = true
            WHERE sale_id IN (
                SELECT sale_id FROM sales
                WHERE NOT processed
                LIMIT batch_size
            )
            RETURNING sale_id
        )
        SELECT COUNT(*) INTO batch_count FROM updated;

        EXIT WHEN batch_count = 0;

        processed := processed + batch_count;
        COMMIT;  -- Commit each batch

        RAISE NOTICE 'Processed batch of % records', batch_count;
    END LOOP;
END;
$$;
```

### 2. Always Log Important Operations

```sql
-- Good: Comprehensive logging
CREATE OR REPLACE PROCEDURE important_operation(
    operation_id integer
)
LANGUAGE plpgsql
AS $$
BEGIN
    CALL log_message(
        format('Starting operation %s', operation_id),
        'INFO'
    );

    BEGIN
        -- Do work
        PERFORM pg_sleep(1);
        COMMIT;

        CALL log_message(
            format('Completed operation %s', operation_id),
            'INFO'
        );
    EXCEPTION
        WHEN OTHERS THEN
            ROLLBACK;
            CALL log_message(
                format('Failed operation %s: %s', operation_id, SQLERRM),
                'ERROR'
            );
            RAISE;
    END;
END;
$$;
```

### 3. Use OUT Parameters for Status

```sql
-- Good: Clear status reporting
CREATE OR REPLACE PROCEDURE execute_with_status(
    IN input_data text,
    OUT success boolean,
    OUT message text,
    OUT rows_affected integer
)
LANGUAGE plpgsql
AS $$
BEGIN
    success := false;
    rows_affected := 0;

    BEGIN
        -- Perform operation
        INSERT INTO process_log (message) VALUES (input_data);
        GET DIAGNOSTICS rows_affected = ROW_COUNT;

        COMMIT;
        success := true;
        message := 'Operation completed successfully';
    EXCEPTION
        WHEN OTHERS THEN
            ROLLBACK;
            message := 'Error: ' || SQLERRM;
    END;
END;
$$;
```

### 4. Document Transaction Boundaries

```sql
-- Good: Clear documentation
CREATE OR REPLACE PROCEDURE documented_procedure()
LANGUAGE plpgsql
AS $$
/*
 * Process sales in batches with intermediate commits.
 *
 * Transaction Boundaries:
 * - Commits after each batch of 100 records
 * - Rolls back individual failed records
 * - Final commit after all batches
 *
 * Side Effects:
 * - Inserts log entries (committed independently)
 * - Updates sales.processed flag
 */
BEGIN
    -- Implementation
    NULL;
END;
$$;
```

### 5. Validate Before Committing

```sql
-- Good: Validation before commit
CREATE OR REPLACE PROCEDURE safe_data_load(
    source_table text,
    target_table text
)
LANGUAGE plpgsql
AS $$
DECLARE
    source_count bigint;
    loaded_count bigint;
BEGIN
    -- Get source count
    EXECUTE format('SELECT COUNT(*) FROM %I', source_table)
    INTO source_count;

    -- Load data
    EXECUTE format(
        'INSERT INTO %I SELECT * FROM %I',
        target_table, source_table
    );

    GET DIAGNOSTICS loaded_count = ROW_COUNT;

    -- Validate
    IF loaded_count != source_count THEN
        ROLLBACK;
        RAISE EXCEPTION 'Data mismatch: expected %, loaded %',
            source_count, loaded_count;
    END IF;

    COMMIT;

    CALL log_message(
        format('Loaded % records from % to %',
               loaded_count, source_table, target_table),
        'INFO'
    );
END;
$$;
```

## Practice Exercises

### Exercise 1: Data Archival System

Create a procedure to archive old data with proper transaction control.

**Requirements:**
1. Procedure `archive_data(table_name text, archive_table text, days_old integer, batch_size integer)`
2. Archive records older than `days_old` from `table_name` to `archive_table`
3. Process in batches of `batch_size`
4. Commit after each batch
5. Log start, progress (every 5 batches), and completion
6. Use OUT parameters for total_archived, batches_processed, errors_encountered
7. Handle errors gracefully, continue processing

**Test Cases:**
```sql
CALL archive_data('sales', 'sales_archive', 365, 100);
SELECT * FROM process_log WHERE message LIKE '%archive%';
```

### Exercise 2: Multi-Table Cleanup

Create a procedure that cleans up related data across multiple tables.

**Requirements:**
1. Procedure `cleanup_orphaned_records(OUT cleanup_summary json)`
2. Find and delete orphaned records in related tables
3. Use separate transaction for each table cleanup
4. Build JSON summary of cleaned records per table
5. Log each cleanup operation
6. If any table cleanup fails, continue with others

**Test Cases:**
```sql
DECLARE
    summary json;
BEGIN
    CALL cleanup_orphaned_records(summary);
    RAISE NOTICE 'Cleanup summary: %', summary;
END;
```

### Exercise 3: Scheduled Maintenance Procedure

Create a comprehensive maintenance procedure.

**Requirements:**
1. Procedure `run_scheduled_maintenance(OUT maintenance_report text)`
2. Perform in sequence:
   - Vacuum old tables
   - Reindex fragmented indexes
   - Update table statistics
   - Archive old logs
   - Clean up temp data
3. Each step is a separate transaction
4. Build detailed text report of all operations
5. Continue even if individual steps fail
6. Log all operations with timestamps

**Test Cases:**
```sql
DECLARE
    report text;
BEGIN
    CALL run_scheduled_maintenance(report);
    RAISE NOTICE '%', report;
END;
```

## Summary

Stored procedures in PostgreSQL provide powerful capabilities for transaction control and batch processing:

- Use procedures when you need COMMIT/ROLLBACK control
- Leverage OUT parameters instead of RETURN values
- Process large datasets in batches with incremental commits
- Always log important operations for audit trail
- Handle errors gracefully with exception blocks
- Validate data before committing
- Document transaction boundaries clearly

For simpler logic without transaction control, use [Functions](01-sql-functions.md) or [PL/pgSQL Functions](02-plpgsql.md). For automatic execution on data changes, see [Triggers](04-triggers.md).
