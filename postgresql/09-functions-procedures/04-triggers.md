# Triggers

## Table of Contents
- [Theory](#theory)
- [Syntax](#syntax)
- [Examples](#examples)
- [Common Mistakes](#common-mistakes)
- [Best Practices](#best-practices)
- [Practice Exercises](#practice-exercises)

## Theory

### What are Triggers?

Triggers are database objects that automatically execute a specified function when certain events occur on a table or view. They enable reactive programming at the database level, automatically responding to data changes.

### Trigger Components

1. **Trigger Event**: INSERT, UPDATE, DELETE, or TRUNCATE
2. **Trigger Timing**: BEFORE, AFTER, or INSTEAD OF
3. **Trigger Level**: FOR EACH ROW or FOR EACH STATEMENT
4. **Trigger Function**: PL/pgSQL function that returns `trigger` type

### Trigger Timing

- **BEFORE**: Executes before the operation
  - Can modify NEW values (for INSERT/UPDATE)
  - Can prevent operation by returning NULL
  - Useful for validation, default values, normalization

- **AFTER**: Executes after the operation
  - Cannot modify data of triggering statement
  - Useful for auditing, cascading changes, notifications
  - Can see final state of data

- **INSTEAD OF**: Replaces the operation (views only)
  - Only available on views
  - Defines what happens instead of INSERT/UPDATE/DELETE

### Trigger Level

- **FOR EACH ROW**: Fires once per affected row
  - Has access to OLD and NEW records
  - More resource intensive for bulk operations
  - Use when you need row-specific logic

- **FOR EACH STATEMENT**: Fires once per statement
  - No access to OLD and NEW
  - More efficient for bulk operations
  - Use for statement-level validation or logging

### Special Variables

- **NEW**: New row for INSERT/UPDATE (NULL for DELETE)
- **OLD**: Old row for UPDATE/DELETE (NULL for INSERT)
- **TG_OP**: Operation type ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
- **TG_NAME**: Trigger name
- **TG_TABLE_NAME**: Table name
- **TG_TABLE_SCHEMA**: Schema name
- **TG_WHEN**: 'BEFORE', 'AFTER', or 'INSTEAD OF'
- **TG_LEVEL**: 'ROW' or 'STATEMENT'

### Common Trigger Patterns

1. **Audit Logging**: Track who changed what and when
2. **Timestamp Management**: Auto-update updated_at columns
3. **Data Validation**: Enforce complex business rules
4. **Denormalization**: Maintain summary tables
5. **Cascading Changes**: Update related records
6. **Notifications**: Send alerts on data changes

## Syntax

### CREATE TRIGGER

```sql
CREATE TRIGGER trigger_name
    {BEFORE | AFTER | INSTEAD OF} {INSERT | UPDATE | DELETE | TRUNCATE}
    ON table_name
    [FOR EACH {ROW | STATEMENT}]
    [WHEN (condition)]
    EXECUTE FUNCTION function_name();
```

### Trigger Function

```sql
CREATE OR REPLACE FUNCTION trigger_function_name()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Access OLD and NEW
    -- Perform logic
    -- Return NEW (BEFORE ROW), OLD (BEFORE ROW DELETE), or NULL
    RETURN NEW;  -- or OLD, or NULL
END;
$$;
```

### Managing Triggers

```sql
-- Disable trigger
ALTER TABLE table_name DISABLE TRIGGER trigger_name;

-- Enable trigger
ALTER TABLE table_name ENABLE TRIGGER trigger_name;

-- Disable all triggers on table
ALTER TABLE table_name DISABLE TRIGGER ALL;

-- Enable all triggers on table
ALTER TABLE table_name ENABLE TRIGGER ALL;

-- Drop trigger
DROP TRIGGER [IF EXISTS] trigger_name ON table_name;
```

### Trigger Execution Order

```sql
-- Set trigger order (executed in alphabetical order by default)
-- Use naming convention: trigger_10_name, trigger_20_name, etc.

-- Or create dependencies
CREATE TRIGGER trigger_second
    AFTER INSERT ON table_name
    FOR EACH ROW
    EXECUTE FUNCTION second_function();
```

## Examples

### Example 1: Automatic Timestamp - updated_at

```sql
-- Create sample table
CREATE TABLE IF NOT EXISTS articles (
    article_id serial PRIMARY KEY,
    title text NOT NULL,
    content text,
    author text NOT NULL,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

-- Create trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER trigger_update_article_timestamp
    BEFORE UPDATE ON articles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Test
INSERT INTO articles (title, content, author)
VALUES ('First Article', 'Content here', 'John Doe');

SELECT article_id, title, created_at, updated_at FROM articles;

-- Wait a moment and update
SELECT pg_sleep(2);

UPDATE articles
SET content = 'Updated content'
WHERE article_id = 1;

-- Check updated_at changed
SELECT article_id, title, created_at, updated_at FROM articles;
```

### Example 2: Audit Logging

```sql
-- Create audit log table
CREATE TABLE IF NOT EXISTS audit_log (
    audit_id serial PRIMARY KEY,
    table_name text NOT NULL,
    operation text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_by text DEFAULT current_user,
    changed_at timestamp DEFAULT now()
);

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, operation, new_data)
        VALUES (TG_TABLE_NAME, TG_OP, row_to_json(NEW)::jsonb);
        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, operation, old_data, new_data)
        VALUES (TG_TABLE_NAME, TG_OP,
                row_to_json(OLD)::jsonb,
                row_to_json(NEW)::jsonb);
        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, operation, old_data)
        VALUES (TG_TABLE_NAME, TG_OP, row_to_json(OLD)::jsonb);
        RETURN OLD;
    END IF;
END;
$$;

-- Create trigger on articles
CREATE TRIGGER trigger_audit_articles
    AFTER INSERT OR UPDATE OR DELETE ON articles
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

-- Test
INSERT INTO articles (title, content, author)
VALUES ('Second Article', 'More content', 'Jane Smith');

UPDATE articles SET title = 'Modified Article' WHERE article_id = 2;

DELETE FROM articles WHERE article_id = 2;

-- Check audit log
SELECT
    audit_id,
    table_name,
    operation,
    changed_by,
    changed_at,
    new_data->>'title' as new_title,
    old_data->>'title' as old_title
FROM audit_log
ORDER BY audit_id DESC;
```

### Example 3: Data Validation

```sql
-- Create employees table
CREATE TABLE IF NOT EXISTS employees_with_validation (
    employee_id serial PRIMARY KEY,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text NOT NULL,
    salary numeric(10,2) NOT NULL,
    hire_date date NOT NULL DEFAULT current_date,
    department text NOT NULL
);

-- Validation trigger function
CREATE OR REPLACE FUNCTION validate_employee()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Validate email format
    IF NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RAISE EXCEPTION 'Invalid email format: %', NEW.email;
    END IF;

    -- Validate salary range
    IF NEW.salary < 0 THEN
        RAISE EXCEPTION 'Salary cannot be negative: %', NEW.salary;
    END IF;

    IF NEW.salary > 1000000 THEN
        RAISE EXCEPTION 'Salary exceeds maximum allowed: %', NEW.salary;
    END IF;

    -- Validate hire date not in future
    IF NEW.hire_date > current_date THEN
        RAISE EXCEPTION 'Hire date cannot be in the future: %', NEW.hire_date;
    END IF;

    -- Normalize email to lowercase
    NEW.email = lower(NEW.email);

    -- Capitalize names
    NEW.first_name = initcap(NEW.first_name);
    NEW.last_name = initcap(NEW.last_name);

    RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER trigger_validate_employee
    BEFORE INSERT OR UPDATE ON employees_with_validation
    FOR EACH ROW
    EXECUTE FUNCTION validate_employee();

-- Test valid insert
INSERT INTO employees_with_validation
(first_name, last_name, email, salary, department)
VALUES ('john', 'doe', 'JOHN.DOE@EXAMPLE.COM', 75000, 'Engineering');

-- Check normalization worked
SELECT * FROM employees_with_validation;

-- Test invalid email (will fail)
-- INSERT INTO employees_with_validation
-- (first_name, last_name, email, salary, department)
-- VALUES ('Jane', 'Smith', 'invalid-email', 80000, 'Sales');

-- Test negative salary (will fail)
-- INSERT INTO employees_with_validation
-- (first_name, last_name, email, salary, department)
-- VALUES ('Bob', 'Johnson', 'bob@example.com', -5000, 'HR');
```

### Example 4: Denormalization - Maintaining Summary Tables

```sql
-- Create orders table
CREATE TABLE IF NOT EXISTS customer_orders (
    order_id serial PRIMARY KEY,
    customer_id integer NOT NULL,
    order_amount numeric(10,2) NOT NULL,
    order_date date DEFAULT current_date
);

-- Create summary table
CREATE TABLE IF NOT EXISTS customer_summary (
    customer_id integer PRIMARY KEY,
    total_orders integer DEFAULT 0,
    total_spent numeric(10,2) DEFAULT 0,
    last_order_date date,
    updated_at timestamp DEFAULT now()
);

-- Trigger function to maintain summary
CREATE OR REPLACE FUNCTION update_customer_summary()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Insert or update summary
        INSERT INTO customer_summary (
            customer_id,
            total_orders,
            total_spent,
            last_order_date
        )
        VALUES (
            NEW.customer_id,
            1,
            NEW.order_amount,
            NEW.order_date
        )
        ON CONFLICT (customer_id) DO UPDATE SET
            total_orders = customer_summary.total_orders + 1,
            total_spent = customer_summary.total_spent + NEW.order_amount,
            last_order_date = GREATEST(
                customer_summary.last_order_date,
                NEW.order_date
            ),
            updated_at = now();

    ELSIF TG_OP = 'UPDATE' THEN
        -- Adjust summary for the difference
        UPDATE customer_summary SET
            total_spent = total_spent - OLD.order_amount + NEW.order_amount,
            last_order_date = (
                SELECT MAX(order_date)
                FROM customer_orders
                WHERE customer_id = NEW.customer_id
            ),
            updated_at = now()
        WHERE customer_id = NEW.customer_id;

    ELSIF TG_OP = 'DELETE' THEN
        -- Recalculate summary
        UPDATE customer_summary SET
            total_orders = total_orders - 1,
            total_spent = total_spent - OLD.order_amount,
            last_order_date = (
                SELECT MAX(order_date)
                FROM customer_orders
                WHERE customer_id = OLD.customer_id
            ),
            updated_at = now()
        WHERE customer_id = OLD.customer_id;

        -- Delete summary if no orders left
        DELETE FROM customer_summary
        WHERE customer_id = OLD.customer_id
        AND total_orders = 0;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger
CREATE TRIGGER trigger_update_customer_summary
    AFTER INSERT OR UPDATE OR DELETE ON customer_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_summary();

-- Test
INSERT INTO customer_orders (customer_id, order_amount)
VALUES
    (1, 100.00),
    (1, 150.00),
    (2, 200.00);

-- Check summary
SELECT * FROM customer_summary;

-- Update order
UPDATE customer_orders SET order_amount = 175.00 WHERE order_id = 1;

-- Delete order
DELETE FROM customer_orders WHERE order_id = 2;

-- Check summary again
SELECT * FROM customer_summary;
```

### Example 5: Conditional Trigger with WHEN Clause

```sql
-- Trigger only fires when specific condition is met
CREATE OR REPLACE FUNCTION log_high_value_orders()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO audit_log (table_name, operation, new_data)
    VALUES (
        TG_TABLE_NAME,
        'HIGH_VALUE_ORDER',
        jsonb_build_object(
            'order_id', NEW.order_id,
            'customer_id', NEW.customer_id,
            'amount', NEW.order_amount
        )
    );

    RETURN NEW;
END;
$$;

-- Trigger only for orders over $500
CREATE TRIGGER trigger_log_high_value_orders
    AFTER INSERT OR UPDATE ON customer_orders
    FOR EACH ROW
    WHEN (NEW.order_amount > 500)
    EXECUTE FUNCTION log_high_value_orders();

-- Test
INSERT INTO customer_orders (customer_id, order_amount)
VALUES
    (3, 50.00),   -- Won't trigger
    (3, 750.00);  -- Will trigger

SELECT * FROM audit_log WHERE operation = 'HIGH_VALUE_ORDER';
```

### Example 6: Preventing DELETE with BEFORE Trigger

```sql
-- Create protected articles table
CREATE TABLE IF NOT EXISTS protected_articles (
    article_id serial PRIMARY KEY,
    title text NOT NULL,
    content text,
    is_protected boolean DEFAULT false,
    created_at timestamp DEFAULT now()
);

-- Function to prevent deletion of protected articles
CREATE OR REPLACE FUNCTION prevent_protected_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.is_protected THEN
        RAISE EXCEPTION 'Cannot delete protected article: %', OLD.title;
    END IF;

    RETURN OLD;
END;
$$;

-- Create trigger
CREATE TRIGGER trigger_prevent_protected_delete
    BEFORE DELETE ON protected_articles
    FOR EACH ROW
    EXECUTE FUNCTION prevent_protected_delete();

-- Test
INSERT INTO protected_articles (title, content, is_protected)
VALUES
    ('Regular Article', 'Can be deleted', false),
    ('Protected Article', 'Cannot be deleted', true);

-- This will work
DELETE FROM protected_articles WHERE article_id = 1;

-- This will fail
-- DELETE FROM protected_articles WHERE article_id = 2;
```

### Example 7: Statement-Level Trigger

```sql
-- Statement-level trigger for bulk operation logging
CREATE OR REPLACE FUNCTION log_bulk_operation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO audit_log (table_name, operation, new_data)
    VALUES (
        TG_TABLE_NAME,
        TG_OP || '_STATEMENT',
        jsonb_build_object(
            'timestamp', now(),
            'user', current_user
        )
    );

    RETURN NULL;  -- Return value ignored for AFTER STATEMENT triggers
END;
$$;

-- Create statement-level trigger
CREATE TRIGGER trigger_log_bulk_articles
    AFTER INSERT OR UPDATE OR DELETE ON articles
    FOR EACH STATEMENT
    EXECUTE FUNCTION log_bulk_operation();

-- Test with bulk insert
INSERT INTO articles (title, content, author)
VALUES
    ('Article 1', 'Content 1', 'Author 1'),
    ('Article 2', 'Content 2', 'Author 2'),
    ('Article 3', 'Content 3', 'Author 3');

-- Only one log entry for the entire statement
SELECT * FROM audit_log WHERE operation LIKE '%STATEMENT%';
```

### Example 8: INSTEAD OF Trigger on View

```sql
-- Create base tables
CREATE TABLE IF NOT EXISTS authors (
    author_id serial PRIMARY KEY,
    author_name text NOT NULL,
    email text UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS books (
    book_id serial PRIMARY KEY,
    title text NOT NULL,
    author_id integer REFERENCES authors(author_id),
    isbn text UNIQUE,
    published_date date
);

-- Create view
CREATE OR REPLACE VIEW author_books AS
SELECT
    b.book_id,
    b.title,
    b.isbn,
    b.published_date,
    a.author_id,
    a.author_name,
    a.email
FROM books b
JOIN authors a ON b.author_id = a.author_id;

-- INSTEAD OF INSERT trigger function
CREATE OR REPLACE FUNCTION insert_author_book()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_author_id integer;
BEGIN
    -- Check if author exists
    SELECT author_id INTO v_author_id
    FROM authors
    WHERE email = NEW.email;

    -- Create author if doesn't exist
    IF NOT FOUND THEN
        INSERT INTO authors (author_name, email)
        VALUES (NEW.author_name, NEW.email)
        RETURNING author_id INTO v_author_id;
    END IF;

    -- Insert book
    INSERT INTO books (title, author_id, isbn, published_date)
    VALUES (NEW.title, v_author_id, NEW.isbn, NEW.published_date);

    RETURN NEW;
END;
$$;

-- Create INSTEAD OF trigger
CREATE TRIGGER trigger_insert_author_book
    INSTEAD OF INSERT ON author_books
    FOR EACH ROW
    EXECUTE FUNCTION insert_author_book();

-- Test: Insert through view
INSERT INTO author_books (title, isbn, published_date, author_name, email)
VALUES ('PostgreSQL Mastery', '978-1234567890', '2024-01-15',
        'John Doe', 'john.doe@example.com');

-- Insert another book by same author
INSERT INTO author_books (title, isbn, published_date, author_name, email)
VALUES ('Advanced SQL', '978-0987654321', '2024-02-20',
        'John Doe', 'john.doe@example.com');

-- Check results
SELECT * FROM author_books;
SELECT * FROM authors;
SELECT * FROM books;
```

### Example 9: Cascading Update Trigger

```sql
-- Create related tables
CREATE TABLE IF NOT EXISTS categories (
    category_id serial PRIMARY KEY,
    category_name text UNIQUE NOT NULL,
    product_count integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
    product_id serial PRIMARY KEY,
    product_name text NOT NULL,
    category_id integer REFERENCES categories(category_id),
    price numeric(10,2)
);

-- Trigger to maintain product count
CREATE OR REPLACE FUNCTION update_category_product_count()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE categories
        SET product_count = product_count + 1
        WHERE category_id = NEW.category_id;

    ELSIF TG_OP = 'DELETE' THEN
        UPDATE categories
        SET product_count = product_count - 1
        WHERE category_id = OLD.category_id;

    ELSIF TG_OP = 'UPDATE' AND OLD.category_id != NEW.category_id THEN
        UPDATE categories
        SET product_count = product_count - 1
        WHERE category_id = OLD.category_id;

        UPDATE categories
        SET product_count = product_count + 1
        WHERE category_id = NEW.category_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger
CREATE TRIGGER trigger_update_category_count
    AFTER INSERT OR UPDATE OR DELETE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_category_product_count();

-- Test
INSERT INTO categories (category_name) VALUES ('Electronics'), ('Furniture');

INSERT INTO products (product_name, category_id, price)
VALUES
    ('Laptop', 1, 999.99),
    ('Mouse', 1, 29.99),
    ('Desk', 2, 299.99);

SELECT * FROM categories;

-- Move product to different category
UPDATE products SET category_id = 2 WHERE product_id = 1;

SELECT * FROM categories;
```

### Example 10: Multiple Triggers - Execution Order

```sql
-- Create triggers that execute in order
CREATE OR REPLACE FUNCTION log_trigger_step(step text)
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE NOTICE 'Trigger step: %', step;
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Triggers execute in alphabetical order by default
CREATE TRIGGER a_first_trigger
    BEFORE INSERT ON articles
    FOR EACH ROW
    EXECUTE FUNCTION log_trigger_step('A - First');

CREATE TRIGGER b_second_trigger
    BEFORE INSERT ON articles
    FOR EACH ROW
    EXECUTE FUNCTION log_trigger_step('B - Second');

CREATE TRIGGER c_third_trigger
    BEFORE INSERT ON articles
    FOR EACH ROW
    EXECUTE FUNCTION log_trigger_step('C - Third');

-- Test
INSERT INTO articles (title, content, author)
VALUES ('Test Order', 'Testing trigger order', 'Test Author');

-- Clean up test triggers
DROP TRIGGER a_first_trigger ON articles;
DROP TRIGGER b_second_trigger ON articles;
DROP TRIGGER c_third_trigger ON articles;
```

### Example 11: Event Trigger (DDL Trigger)

```sql
-- Create table to log DDL changes
CREATE TABLE IF NOT EXISTS ddl_log (
    log_id serial PRIMARY KEY,
    event_type text NOT NULL,
    object_type text,
    schema_name text,
    object_name text,
    command_tag text,
    executed_by text DEFAULT current_user,
    executed_at timestamp DEFAULT now()
);

-- Event trigger function
CREATE OR REPLACE FUNCTION log_ddl_changes()
RETURNS event_trigger
LANGUAGE plpgsql
AS $$
DECLARE
    obj record;
BEGIN
    FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands()
    LOOP
        INSERT INTO ddl_log (
            event_type,
            object_type,
            schema_name,
            object_name,
            command_tag
        )
        VALUES (
            TG_EVENT,
            obj.object_type,
            obj.schema_name,
            obj.object_identity,
            TG_TAG
        );
    END LOOP;
END;
$$;

-- Create event trigger
CREATE EVENT TRIGGER trigger_log_ddl
    ON ddl_command_end
    EXECUTE FUNCTION log_ddl_changes();

-- Test by creating objects
CREATE TABLE test_ddl_trigger (id serial);

ALTER TABLE test_ddl_trigger ADD COLUMN name text;

-- Check DDL log
SELECT * FROM ddl_log ORDER BY log_id DESC;

-- Clean up
DROP EVENT TRIGGER trigger_log_ddl;
DROP TABLE test_ddl_trigger;
```

## Common Mistakes

### 1. Forgetting to RETURN in BEFORE Triggers

```sql
-- WRONG: No RETURN in BEFORE trigger
CREATE OR REPLACE FUNCTION bad_before_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    -- Forgot RETURN! Row won't be inserted/updated
END;
$$;

-- CORRECT: Always RETURN NEW or OLD
CREATE OR REPLACE FUNCTION good_before_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;
```

### 2. Modifying NEW in AFTER Trigger

```sql
-- WRONG: Trying to modify NEW in AFTER trigger
CREATE OR REPLACE FUNCTION bad_after_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.some_column = 'value';  -- Has no effect!
    RETURN NEW;
END;
$$;

-- CORRECT: Use BEFORE trigger for modifications
CREATE TRIGGER good_trigger
    BEFORE INSERT OR UPDATE ON table_name
    FOR EACH ROW
    EXECUTE FUNCTION modify_new_trigger();
```

### 3. Infinite Trigger Loops

```sql
-- WRONG: Trigger that causes infinite loop
CREATE OR REPLACE FUNCTION bad_loop_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE articles SET updated_at = now()
    WHERE article_id = NEW.article_id;  -- Triggers itself!
    RETURN NEW;
END;
$$;

-- CORRECT: Modify NEW directly in BEFORE trigger
CREATE OR REPLACE FUNCTION good_update_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;
```

### 4. Not Handling NULL in OLD/NEW

```sql
-- WRONG: Assuming OLD/NEW always exists
CREATE OR REPLACE FUNCTION bad_null_handling()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.status != NEW.status THEN  -- Fails on INSERT (OLD is NULL)
        -- Do something
    END IF;
    RETURN NEW;
END;
$$;

-- CORRECT: Check for NULL
CREATE OR REPLACE FUNCTION good_null_handling()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        -- Do something
    END IF;
    RETURN NEW;
END;
$$;
```

### 5. Using RETURN NEW for DELETE

```sql
-- WRONG: RETURN NEW in DELETE trigger
CREATE OR REPLACE FUNCTION bad_delete_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Log deletion
    RETURN NEW;  -- NEW is NULL for DELETE!
END;
$$;

-- CORRECT: RETURN OLD for DELETE
CREATE OR REPLACE FUNCTION good_delete_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Log deletion
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;
```

## Best Practices

### 1. Use Naming Conventions

```sql
-- Good: Clear naming convention
-- Pattern: trigger_{order}_{table}_{purpose}
CREATE TRIGGER trigger_10_articles_update_timestamp
    BEFORE UPDATE ON articles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_20_articles_audit_log
    AFTER INSERT OR UPDATE OR DELETE ON articles
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();
```

### 2. Keep Triggers Simple and Fast

```sql
-- Good: Simple, focused trigger
CREATE OR REPLACE FUNCTION simple_audit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO audit_log (table_name, operation, changed_at)
    VALUES (TG_TABLE_NAME, TG_OP, now());
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Avoid: Complex logic that slows down operations
-- Move complex logic to background jobs or procedures
```

### 3. Use WHEN Clause for Optimization

```sql
-- Good: Filter before trigger fires
CREATE TRIGGER trigger_validate_price_change
    BEFORE UPDATE ON products
    FOR EACH ROW
    WHEN (OLD.price IS DISTINCT FROM NEW.price)
    EXECUTE FUNCTION validate_price_change();

-- Avoids trigger execution when price hasn't changed
```

### 4. Document Trigger Behavior

```sql
CREATE OR REPLACE FUNCTION documented_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
/*
 * Purpose: Maintains customer summary statistics
 * Fires: AFTER INSERT/UPDATE/DELETE on customer_orders
 * Side Effects:
 *   - Updates customer_summary table
 *   - May create new customer_summary row
 *   - May delete customer_summary row if no orders remain
 * Dependencies: customer_summary table must exist
 */
BEGIN
    -- Implementation
    RETURN COALESCE(NEW, OLD);
END;
$$;
```

### 5. Handle Errors Gracefully

```sql
-- Good: Error handling in triggers
CREATE OR REPLACE FUNCTION safe_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    BEGIN
        -- Attempt operation
        INSERT INTO audit_log (table_name, operation)
        VALUES (TG_TABLE_NAME, TG_OP);
    EXCEPTION
        WHEN OTHERS THEN
            -- Log error but don't fail the original operation
            RAISE WARNING 'Audit log failed: %', SQLERRM;
    END;

    RETURN COALESCE(NEW, OLD);
END;
$$;
```

## Practice Exercises

### Exercise 1: Comprehensive Audit System

Create a complete audit system with column-level change tracking.

**Requirements:**
1. Create audit table storing old/new values for each column
2. Trigger function that compares OLD and NEW
3. Only log columns that actually changed
4. Store changes as JSON: `{"column": {"old": value, "new": value}}`
5. Include user, timestamp, and operation type
6. Handle INSERT (no old values) and DELETE (no new values)
7. Test with multi-column updates

**Test Cases:**
```sql
UPDATE articles SET title = 'New Title', content = 'New Content' WHERE article_id = 1;
-- Should log both changes separately

UPDATE articles SET title = 'New Title' WHERE article_id = 1;
-- Should only log title change
```

### Exercise 2: Soft Delete System

Implement soft deletes with triggers.

**Requirements:**
1. Add `deleted_at` timestamp column to tables
2. Create trigger that PREVENTS actual DELETE
3. Instead, SET deleted_at = now() and RETURN NULL to cancel DELETE
4. Create views that filter out soft-deleted records
5. Create function to hard delete old soft-deleted records
6. Handle UPDATE and SELECT to respect soft deletes

**Test Cases:**
```sql
DELETE FROM articles WHERE article_id = 1;
-- Should set deleted_at, not actually delete

SELECT * FROM articles;
-- Should not show soft-deleted records (use view)
```

### Exercise 3: Complex Denormalization

Create triggers to maintain multiple related summary tables.

**Requirements:**
1. Tables: orders, order_items, product_stats, customer_stats, daily_stats
2. When order_item inserted: Update product_stats, customer_stats, daily_stats
3. Handle INSERT, UPDATE (quantity/price changes), DELETE
4. Use transactions properly
5. Add validation (no negative quantities, etc.)
6. Include error handling for constraint violations
7. Log all summary updates

**Test Cases:**
```sql
INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (1, 1, 5, 100);
-- Check all three stats tables updated correctly

UPDATE order_items SET quantity = 10 WHERE item_id = 1;
-- Check stats reflect new quantity

DELETE FROM order_items WHERE item_id = 1;
-- Check stats decremented correctly
```

## Summary

Triggers provide powerful reactive programming capabilities in PostgreSQL:

- Use BEFORE triggers to modify data before it's committed
- Use AFTER triggers for auditing and cascading changes
- Use INSTEAD OF triggers to make views updatable
- Leverage NEW and OLD records for row-level logic
- Use WHEN clause to optimize trigger execution
- Keep triggers simple and fast
- Handle errors gracefully to avoid blocking operations
- Name triggers consistently for maintainability
- Document trigger behavior and side effects

For the functions that triggers execute, see [PL/pgSQL](02-plpgsql.md). For related automation with transaction control, see [Stored Procedures](03-stored-procedures.md). For custom data types to use with triggers, see [Custom Types](05-custom-operators-types.md).
