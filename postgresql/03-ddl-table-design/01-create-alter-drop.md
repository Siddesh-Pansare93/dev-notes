# CREATE, ALTER, and DROP Tables

## Theory

Data Definition Language (DDL) commands are fundamental to PostgreSQL database design. These commands allow you to create, modify, and remove database objects. Understanding DDL is essential for managing table structures, implementing schema changes, and maintaining database integrity.

The CREATE TABLE statement defines a new table's structure, including column names, data types, and constraints. ALTER TABLE modifies existing tables without losing data. DROP TABLE removes tables from the database. PostgreSQL provides additional features like IF NOT EXISTS clauses, CASCADE options, and table comments to enhance DDL operations.

Key concepts:
- **Tables** store data in rows and columns
- **Columns** have specific data types and optional constraints
- **Schema changes** can be performed on live tables with ALTER TABLE
- **Dependencies** must be considered when dropping tables
- **Metadata** like comments helps document your database schema

## Syntax

### CREATE TABLE

```sql
CREATE TABLE [IF NOT EXISTS] schema_name.table_name (
    column_name data_type [column_constraint [...]] [,...],
    [table_constraint [...]]
);
```

### ALTER TABLE

```sql
-- Add column
ALTER TABLE table_name ADD COLUMN column_name data_type [constraint];

-- Drop column
ALTER TABLE table_name DROP COLUMN column_name [CASCADE | RESTRICT];

-- Rename column
ALTER TABLE table_name RENAME COLUMN old_name TO new_name;

-- Change column type
ALTER TABLE table_name ALTER COLUMN column_name TYPE new_data_type [USING expression];

-- Set default value
ALTER TABLE table_name ALTER COLUMN column_name SET DEFAULT expression;

-- Drop default value
ALTER TABLE table_name ALTER COLUMN column_name DROP DEFAULT;

-- Set NOT NULL
ALTER TABLE table_name ALTER COLUMN column_name SET NOT NULL;

-- Drop NOT NULL
ALTER TABLE table_name ALTER COLUMN column_name DROP NOT NULL;

-- Rename table
ALTER TABLE old_table_name RENAME TO new_table_name;
```

### DROP TABLE

```sql
DROP TABLE [IF EXISTS] table_name [CASCADE | RESTRICT];
```

### COMMENT ON

```sql
COMMENT ON TABLE table_name IS 'comment text';
COMMENT ON COLUMN table_name.column_name IS 'comment text';
```

## Examples

### Basic Table Creation

```sql
-- Simple table with common data types
CREATE TABLE employees (
    employee_id INTEGER,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email VARCHAR(100),
    hire_date DATE,
    salary NUMERIC(10, 2)
);

-- Verify table creation
\d employees
```

### CREATE TABLE with IF NOT EXISTS

```sql
-- Safe table creation (won't error if table exists)
CREATE TABLE IF NOT EXISTS departments (
    dept_id SERIAL PRIMARY KEY,
    dept_name VARCHAR(100) NOT NULL,
    location VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Try creating again - no error
CREATE TABLE IF NOT EXISTS departments (
    dept_id SERIAL PRIMARY KEY,
    dept_name VARCHAR(100) NOT NULL
);
```

### Adding Columns

```sql
-- Add a single column
ALTER TABLE employees
ADD COLUMN phone_number VARCHAR(20);

-- Add multiple columns in one statement
ALTER TABLE employees
ADD COLUMN department_id INTEGER,
ADD COLUMN manager_id INTEGER,
ADD COLUMN is_active BOOLEAN DEFAULT true;

-- Add column with NOT NULL and default (for existing data)
ALTER TABLE employees
ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active';
```

### Dropping Columns

```sql
-- Drop a single column
ALTER TABLE employees
DROP COLUMN phone_number;

-- Drop column with CASCADE (removes dependent objects)
ALTER TABLE employees
DROP COLUMN department_id CASCADE;

-- Drop column with RESTRICT (fails if dependencies exist, default behavior)
ALTER TABLE employees
DROP COLUMN manager_id RESTRICT;

-- Drop multiple columns
ALTER TABLE employees
DROP COLUMN is_active,
DROP COLUMN status;
```

### Renaming Columns

```sql
-- Rename a column
ALTER TABLE employees
RENAME COLUMN first_name TO given_name;

-- Rename multiple columns (separate statements required)
ALTER TABLE employees
RENAME COLUMN last_name TO family_name;

ALTER TABLE employees
RENAME COLUMN email TO email_address;
```

### Changing Column Data Types

```sql
-- Simple type change
ALTER TABLE employees
ALTER COLUMN salary TYPE NUMERIC(12, 2);

-- Type change with USING clause for conversion
ALTER TABLE employees
ALTER COLUMN employee_id TYPE BIGINT;

-- Convert text to integer with USING
ALTER TABLE employees
ADD COLUMN temp_id VARCHAR(10);

UPDATE employees SET temp_id = '1000';

ALTER TABLE employees
ALTER COLUMN temp_id TYPE INTEGER USING temp_id::INTEGER;

-- Complex conversion example
CREATE TABLE product_prices (
    product_id SERIAL PRIMARY KEY,
    price VARCHAR(20)
);

INSERT INTO product_prices (price) VALUES ('$19.99'), ('$29.99'), ('$9.50');

-- Convert price from VARCHAR to NUMERIC
ALTER TABLE product_prices
ALTER COLUMN price TYPE NUMERIC(10, 2)
USING REPLACE(price, '$', '')::NUMERIC;

SELECT * FROM product_prices;
```

### Setting and Dropping Defaults

```sql
-- Set default value for existing column
ALTER TABLE employees
ALTER COLUMN hire_date SET DEFAULT CURRENT_DATE;

-- Set default using function
ALTER TABLE employees
ALTER COLUMN given_name SET DEFAULT 'Unknown';

-- Drop default value
ALTER TABLE employees
ALTER COLUMN hire_date DROP DEFAULT;

-- Verify defaults
INSERT INTO employees (employee_id) VALUES (1001);
SELECT * FROM employees WHERE employee_id = 1001;
```

### Setting and Dropping NOT NULL

```sql
-- Add NOT NULL constraint
ALTER TABLE employees
ALTER COLUMN email_address SET NOT NULL;

-- Remove NOT NULL constraint
ALTER TABLE employees
ALTER COLUMN email_address DROP NOT NULL;

-- Safe way to add NOT NULL: first update nulls, then add constraint
UPDATE employees SET email_address = 'unknown@example.com' WHERE email_address IS NULL;
ALTER TABLE employees ALTER COLUMN email_address SET NOT NULL;
```

### Renaming Tables

```sql
-- Rename a table
ALTER TABLE employees
RENAME TO staff_members;

-- Rename back
ALTER TABLE staff_members
RENAME TO employees;
```

### Dropping Tables

```sql
-- Drop a table
DROP TABLE departments;

-- Drop table safely (no error if doesn't exist)
DROP TABLE IF EXISTS departments;

-- Create tables with dependencies
CREATE TABLE departments (
    dept_id SERIAL PRIMARY KEY,
    dept_name VARCHAR(100)
);

CREATE TABLE employees_new (
    emp_id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    dept_id INTEGER REFERENCES departments(dept_id)
);

-- This will fail due to foreign key constraint
DROP TABLE departments;

-- This succeeds - removes dependent objects too
DROP TABLE departments CASCADE;

-- RESTRICT explicitly prevents dropping if dependencies exist (default)
CREATE TABLE test_table (id SERIAL PRIMARY KEY);
DROP TABLE test_table RESTRICT;
```

### Table and Column Comments

```sql
-- Create a well-documented table
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    product_name VARCHAR(200) NOT NULL,
    category VARCHAR(50),
    price NUMERIC(10, 2),
    stock_quantity INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add table comment
COMMENT ON TABLE products IS 'Master table for all products in inventory system. Updated in real-time by POS and warehouse systems.';

-- Add column comments
COMMENT ON COLUMN products.product_id IS 'Unique identifier for each product';
COMMENT ON COLUMN products.product_name IS 'Official product name as it appears in catalog';
COMMENT ON COLUMN products.category IS 'Product category code. References category lookup table.';
COMMENT ON COLUMN products.price IS 'Current retail price in USD. Updated nightly by pricing system.';
COMMENT ON COLUMN products.stock_quantity IS 'Current available stock across all warehouses';
COMMENT ON COLUMN products.created_at IS 'Timestamp when product was first added to system';

-- View comments
\d+ products

-- Remove a comment (set to NULL)
COMMENT ON COLUMN products.category IS NULL;
```

### Complex ALTER TABLE Example

```sql
-- Create initial table
CREATE TABLE orders (
    id INTEGER,
    customer_name VARCHAR(100),
    order_date DATE,
    total VARCHAR(20)
);

-- Multiple modifications
ALTER TABLE orders
    ADD COLUMN order_id SERIAL PRIMARY KEY,
    ALTER COLUMN id DROP NOT NULL,
    RENAME COLUMN id TO legacy_id,
    ALTER COLUMN total TYPE NUMERIC(10, 2) USING REPLACE(total, '$', '')::NUMERIC,
    ADD COLUMN status VARCHAR(20) DEFAULT 'pending',
    ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add comments
COMMENT ON TABLE orders IS 'Customer orders table';
COMMENT ON COLUMN orders.legacy_id IS 'Old ID from previous system - to be removed in v2.0';
```

## Common Mistakes

### 1. Dropping Columns Without Considering Dependencies

```sql
-- WRONG: Drops column that other objects depend on, causing errors
CREATE TABLE users (user_id SERIAL PRIMARY KEY, username VARCHAR(50));
CREATE TABLE posts (post_id SERIAL, user_id INTEGER REFERENCES users(user_id));

-- This fails
ALTER TABLE users DROP COLUMN user_id;

-- CORRECT: Use CASCADE if you want to drop dependencies
ALTER TABLE users DROP COLUMN user_id CASCADE;
-- Or remove dependencies first manually
```

### 2. Changing Column Type Without USING Clause

```sql
-- WRONG: Can't automatically convert incompatible types
CREATE TABLE measurements (id SERIAL, value VARCHAR(20));
INSERT INTO measurements (value) VALUES ('123abc');

-- This fails if data isn't cleanly convertible
ALTER TABLE measurements ALTER COLUMN value TYPE INTEGER;

-- CORRECT: Use USING clause for conversion logic
ALTER TABLE measurements ALTER COLUMN value TYPE INTEGER
USING REGEXP_REPLACE(value, '[^0-9]', '', 'g')::INTEGER;
```

### 3. Adding NOT NULL to Column with Existing NULLs

```sql
-- WRONG: Adding NOT NULL when NULLs exist
CREATE TABLE customers (id SERIAL, email VARCHAR(100));
INSERT INTO customers (id) VALUES (1), (2);

-- This fails
ALTER TABLE customers ALTER COLUMN email SET NOT NULL;

-- CORRECT: Handle NULLs first
UPDATE customers SET email = 'unknown@example.com' WHERE email IS NULL;
ALTER TABLE customers ALTER COLUMN email SET NOT NULL;
```

### 4. Forgetting IF NOT EXISTS / IF EXISTS

```sql
-- WRONG: Script fails on re-run
CREATE TABLE settings (key VARCHAR(50), value TEXT);

-- CORRECT: Idempotent DDL
CREATE TABLE IF NOT EXISTS settings (key VARCHAR(50), value TEXT);
DROP TABLE IF EXISTS old_settings;
```

### 5. Not Using Transactions for Complex Schema Changes

```sql
-- WRONG: Partial changes if one statement fails
ALTER TABLE employees ADD COLUMN bonus NUMERIC(10, 2);
ALTER TABLE employees ADD COLUMN commission NUMERIC(10, 2);
-- If this fails, previous changes remain
ALTER TABLE employees ADD COLUMN invalid_ref INTEGER REFERENCES nonexistent(id);

-- CORRECT: Use transactions
BEGIN;
ALTER TABLE employees ADD COLUMN bonus NUMERIC(10, 2);
ALTER TABLE employees ADD COLUMN commission NUMERIC(10, 2);
ALTER TABLE employees ADD COLUMN dept_id INTEGER;
COMMIT;
```

## Best Practices

### 1. Use Descriptive Names

```sql
-- Good naming conventions
CREATE TABLE customer_orders (
    customer_order_id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    order_date DATE NOT NULL,
    total_amount NUMERIC(10, 2),
    shipping_address_line1 VARCHAR(200),
    shipping_address_line2 VARCHAR(200)
);
```

### 2. Always Document with Comments

```sql
CREATE TABLE user_sessions (
    session_id UUID PRIMARY KEY,
    user_id INTEGER NOT NULL,
    started_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL
);

COMMENT ON TABLE user_sessions IS 'Active user sessions. Cleaned up by background job every 24 hours.';
COMMENT ON COLUMN user_sessions.expires_at IS 'Session expiration time. After this time, session is invalid.';
```

### 3. Use IF NOT EXISTS / IF EXISTS for Idempotent Scripts

```sql
-- Safe deployment scripts
DROP TABLE IF EXISTS staging_imports;
CREATE TABLE staging_imports (
    id SERIAL PRIMARY KEY,
    data JSONB,
    imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4. Plan Schema Changes Carefully

```sql
-- Good approach: Add nullable column first, populate, then add constraint
ALTER TABLE users ADD COLUMN account_type VARCHAR(20);
UPDATE users SET account_type = 'standard' WHERE account_type IS NULL;
ALTER TABLE users ALTER COLUMN account_type SET NOT NULL;
ALTER TABLE users ALTER COLUMN account_type SET DEFAULT 'standard';
```

### 5. Use Explicit CASCADE/RESTRICT

```sql
-- Be explicit about behavior
DROP TABLE audit_logs RESTRICT; -- Safer default
DROP TABLE temp_import_data CASCADE; -- Intentional cleanup
```

### 6. Group Related Changes in Transactions

```sql
BEGIN;
    CREATE TABLE audit_log (
        id SERIAL PRIMARY KEY,
        table_name VARCHAR(100),
        action VARCHAR(20),
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    COMMENT ON TABLE audit_log IS 'Audit trail for all table modifications';

    -- Create related objects
    CREATE INDEX idx_audit_log_table ON audit_log(table_name);
    CREATE INDEX idx_audit_log_changed_at ON audit_log(changed_at);
COMMIT;
```

## Practice Exercises

### Exercise 1: Library Database Schema

Create a library management system with the following requirements:

1. Create a `books` table with columns: book_id (auto-incrementing primary key), title, author, isbn (13 characters), publication_year, available_copies (default 1)
2. Add a column `category` to books
3. Change `available_copies` to have a default value of 0
4. Rename `publication_year` to `published_year`
5. Add appropriate comments to the table and key columns
6. Create a `members` table with: member_id, full_name, email, join_date, membership_expires_date
7. Drop the books table safely even if it has dependencies

```sql
-- Your solution here
```

### Exercise 2: E-commerce Product Evolution

You're evolving a product catalog. Perform these changes:

1. Create a `products` table with: id (integer), name (varchar 100), price (varchar 20), description (text)
2. Convert price from VARCHAR to NUMERIC(10,2), assuming prices are stored as "$19.99"
3. Add columns: stock_quantity (integer, default 0), is_active (boolean, default true), created_at (timestamp, default current timestamp)
4. Rename the table to `product_catalog`
5. Add a `sku` column (varchar 50) that must not be null, but first populate existing rows with a generated value like 'SKU-' || id
6. Add comprehensive comments documenting the purpose of each column

```sql
-- Your solution here
```

### Exercise 3: Safe Schema Migration

Practice safe schema changes on a live system:

1. Create an `employees` table with: id, name, department, salary
2. You need to split `name` into `first_name` and `last_name`. Write a migration that:
   - Adds first_name and last_name columns
   - Populates them by splitting the name column (assume space-separated)
   - Makes them NOT NULL
   - Drops the original name column
3. Add a `manager_id` column that references the same table (self-referencing)
4. Document everything with comments
5. Wrap your migration in a transaction

```sql
-- Your solution here
```

---

**Cross-references:**
- For constraints on columns, see [Constraints](./02-constraints.md)
- For default values and generated columns, see [Default and Generated Values](./03-default-generated.md)
- For temporary tables, see [Temporary and Unlogged Tables](./05-temporary-unlogged.md)
- For data types, see Module 02
- For indexes on columns, see Module 06
