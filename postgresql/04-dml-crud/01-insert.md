# INSERT Operations in PostgreSQL

## Table of Contents
- [Theory](#theory)
- [Syntax](#syntax)
- [Examples](#examples)
- [Common Mistakes](#common-mistakes)
- [Best Practices](#best-practices)
- [Practice Exercises](#practice-exercises)

## Theory

### What is INSERT?

INSERT is a Data Manipulation Language (DML) command used to add new rows to a table. PostgreSQL provides several powerful INSERT variants that go beyond simple row insertion, including conflict resolution, bulk loading, and returning inserted values.

### Key Concepts

1. **Single Row Insert**: Insert one record at a time
2. **Multi-Row Insert**: Insert multiple records in one statement
3. **INSERT ... SELECT**: Insert data from query results
4. **UPSERT**: INSERT with conflict resolution (ON CONFLICT)
5. **RETURNING**: Retrieve values from inserted rows
6. **COPY**: Bulk data loading for performance
7. **DEFAULT Values**: Let PostgreSQL assign default values

### Why INSERT Matters

- Foundation of data creation in relational databases
- Critical for application data persistence
- Performance implications for bulk operations
- Data integrity through constraint validation

### INSERT Execution Flow

1. Parse SQL statement
2. Validate column names and data types
3. Check constraints (NOT NULL, CHECK, etc.)
4. Execute any triggers (BEFORE INSERT)
5. Insert row(s) into table
6. Check foreign key constraints
7. Execute AFTER INSERT triggers
8. Update indexes
9. Return result or RETURNING data

## Syntax

### Basic INSERT Syntax

```sql
-- Single row with column specification
INSERT INTO table_name (column1, column2, column3)
VALUES (value1, value2, value3);

-- Single row without column specification (all columns)
INSERT INTO table_name
VALUES (value1, value2, value3, value4);

-- Multiple rows
INSERT INTO table_name (column1, column2)
VALUES
    (value1a, value2a),
    (value1b, value2b),
    (value1c, value2c);
```

### INSERT ... SELECT Syntax

```sql
INSERT INTO target_table (column1, column2)
SELECT column1, column2
FROM source_table
WHERE condition;
```

### INSERT ... ON CONFLICT Syntax

```sql
-- Do nothing on conflict
INSERT INTO table_name (column1, column2)
VALUES (value1, value2)
ON CONFLICT (conflict_column) DO NOTHING;

-- Update on conflict (UPSERT)
INSERT INTO table_name (column1, column2, column3)
VALUES (value1, value2, value3)
ON CONFLICT (conflict_column)
DO UPDATE SET
    column2 = EXCLUDED.column2,
    column3 = EXCLUDED.column3;

-- Conflict with constraint name
INSERT INTO table_name (column1, column2)
VALUES (value1, value2)
ON CONFLICT ON CONSTRAINT constraint_name
DO UPDATE SET column2 = EXCLUDED.column2;
```

### INSERT with RETURNING Syntax

```sql
INSERT INTO table_name (column1, column2)
VALUES (value1, value2)
RETURNING *;

-- Return specific columns
INSERT INTO table_name (column1, column2)
VALUES (value1, value2)
RETURNING id, created_at;

-- Return computed values
INSERT INTO table_name (column1, column2)
VALUES (value1, value2)
RETURNING id, column1 || ' ' || column2 AS full_name;
```

### DEFAULT Values Syntax

```sql
-- Use DEFAULT keyword
INSERT INTO table_name (column1, column2, column3)
VALUES (value1, DEFAULT, value3);

-- Omit columns with defaults
INSERT INTO table_name (column1)
VALUES (value1);

-- Explicit DEFAULT for all columns
INSERT INTO table_name DEFAULT VALUES;
```

### COPY Syntax (Bulk Loading)

```sql
-- Copy from file
COPY table_name (column1, column2)
FROM '/path/to/file.csv'
WITH (FORMAT csv, HEADER true, DELIMITER ',');

-- Copy from stdin (programmatic)
COPY table_name (column1, column2)
FROM STDIN
WITH (FORMAT csv);
```

## Examples

### Example 1: Basic Single Row Insert

```sql
-- Create a sample table
CREATE TABLE employees (
    employee_id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE,
    hire_date DATE DEFAULT CURRENT_DATE,
    salary NUMERIC(10, 2),
    department_id INTEGER
);

-- Insert a single employee
INSERT INTO employees (first_name, last_name, email, salary, department_id)
VALUES ('John', 'Doe', 'john.doe@company.com', 75000.00, 1);

-- Insert with DEFAULT for hire_date
INSERT INTO employees (first_name, last_name, email, hire_date, salary, department_id)
VALUES ('Jane', 'Smith', 'jane.smith@company.com', DEFAULT, 80000.00, 2);

-- Verify inserts
SELECT * FROM employees;
```

### Example 2: Multiple Row Insert

```sql
-- Insert multiple employees in one statement
INSERT INTO employees (first_name, last_name, email, salary, department_id)
VALUES
    ('Alice', 'Johnson', 'alice.johnson@company.com', 70000.00, 1),
    ('Bob', 'Williams', 'bob.williams@company.com', 72000.00, 2),
    ('Carol', 'Brown', 'carol.brown@company.com', 68000.00, 1),
    ('David', 'Miller', 'david.miller@company.com', 85000.00, 3);

-- Insert with some DEFAULT values
INSERT INTO employees (first_name, last_name, email, department_id)
VALUES
    ('Eve', 'Davis', 'eve.davis@company.com', 1),
    ('Frank', 'Wilson', 'frank.wilson@company.com', 2);
```

### Example 3: INSERT ... SELECT

```sql
-- Create archive table
CREATE TABLE employees_archive (
    employee_id INTEGER,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email VARCHAR(100),
    hire_date DATE,
    salary NUMERIC(10, 2),
    department_id INTEGER,
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert employees hired before a certain date
INSERT INTO employees_archive
    (employee_id, first_name, last_name, email, hire_date, salary, department_id)
SELECT
    employee_id, first_name, last_name, email, hire_date, salary, department_id
FROM employees
WHERE hire_date < '2024-01-01';

-- Insert with aggregation
CREATE TABLE department_stats (
    department_id INTEGER,
    employee_count INTEGER,
    avg_salary NUMERIC(10, 2),
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO department_stats (department_id, employee_count, avg_salary)
SELECT
    department_id,
    COUNT(*) as employee_count,
    AVG(salary) as avg_salary
FROM employees
WHERE department_id IS NOT NULL
GROUP BY department_id;
```

### Example 4: INSERT ... ON CONFLICT DO NOTHING

```sql
-- Create a products table with unique constraint
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    price NUMERIC(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Initial insert
INSERT INTO products (sku, name, price)
VALUES ('SKU-001', 'Widget A', 19.99);

-- Try to insert duplicate SKU - will fail without ON CONFLICT
-- This would cause an error:
-- INSERT INTO products (sku, name, price)
-- VALUES ('SKU-001', 'Widget A Duplicate', 29.99);

-- Insert with conflict handling - ignore duplicates
INSERT INTO products (sku, name, price)
VALUES ('SKU-001', 'Widget A Duplicate', 29.99)
ON CONFLICT (sku) DO NOTHING;

-- Insert multiple with conflict handling
INSERT INTO products (sku, name, price)
VALUES
    ('SKU-001', 'Widget A', 19.99),
    ('SKU-002', 'Widget B', 29.99),
    ('SKU-003', 'Widget C', 39.99)
ON CONFLICT (sku) DO NOTHING;

-- Verify results
SELECT * FROM products ORDER BY product_id;
```

### Example 5: INSERT ... ON CONFLICT DO UPDATE (UPSERT)

```sql
-- Create inventory table
CREATE TABLE inventory (
    product_id INTEGER PRIMARY KEY,
    quantity INTEGER NOT NULL DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Initial inventory
INSERT INTO inventory (product_id, quantity)
VALUES (1, 100);

-- UPSERT: Insert or update if exists
INSERT INTO inventory (product_id, quantity, last_updated)
VALUES (1, 50, CURRENT_TIMESTAMP)
ON CONFLICT (product_id)
DO UPDATE SET
    quantity = inventory.quantity + EXCLUDED.quantity,
    last_updated = EXCLUDED.last_updated;

-- Verify: quantity should be 150 (100 + 50)
SELECT * FROM inventory WHERE product_id = 1;

-- UPSERT multiple items
INSERT INTO inventory (product_id, quantity)
VALUES
    (1, 25),
    (2, 75),
    (3, 100)
ON CONFLICT (product_id)
DO UPDATE SET
    quantity = inventory.quantity + EXCLUDED.quantity,
    last_updated = CURRENT_TIMESTAMP;

-- Using WHERE clause in DO UPDATE
INSERT INTO inventory (product_id, quantity)
VALUES (1, 1000)
ON CONFLICT (product_id)
DO UPDATE SET
    quantity = EXCLUDED.quantity,
    last_updated = CURRENT_TIMESTAMP
WHERE inventory.quantity < EXCLUDED.quantity; -- Only update if new is larger
```

### Example 6: INSERT with RETURNING

```sql
-- Create orders table
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_amount NUMERIC(10, 2),
    status VARCHAR(20) DEFAULT 'pending'
);

-- Insert and return generated ID
INSERT INTO orders (customer_id, total_amount)
VALUES (101, 299.99)
RETURNING order_id;

-- Insert and return multiple columns
INSERT INTO orders (customer_id, total_amount)
VALUES (102, 450.00)
RETURNING order_id, order_date, status;

-- Insert multiple and return all data
INSERT INTO orders (customer_id, total_amount)
VALUES
    (103, 125.50),
    (104, 780.25),
    (105, 95.00)
RETURNING *;

-- Insert with RETURNING and computation
INSERT INTO orders (customer_id, total_amount)
VALUES (106, 350.00)
RETURNING
    order_id,
    customer_id,
    total_amount,
    total_amount * 0.08 AS tax_amount,
    total_amount * 1.08 AS total_with_tax;
```

### Example 7: DEFAULT Values

```sql
-- Create table with various defaults
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    login_count INTEGER DEFAULT 0,
    account_type VARCHAR(20) DEFAULT 'standard'
);

-- Insert using DEFAULT keyword
INSERT INTO users (username, email, is_active, created_at)
VALUES ('user1', 'user1@example.com', DEFAULT, DEFAULT);

-- Insert omitting columns with defaults
INSERT INTO users (username, email)
VALUES ('user2', 'user2@example.com');

-- Insert all defaults
INSERT INTO users (username) VALUES ('user3');

-- Mix explicit values and defaults
INSERT INTO users (username, email, is_active, account_type)
VALUES ('user4', 'user4@example.com', false, 'premium');

-- Insert DEFAULT VALUES (uses all column defaults)
-- Note: This requires all columns to have defaults or allow NULL
CREATE TABLE log_entries (
    log_id SERIAL PRIMARY KEY,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    log_level VARCHAR(10) DEFAULT 'INFO'
);

INSERT INTO log_entries DEFAULT VALUES;

-- Verify
SELECT * FROM users;
SELECT * FROM log_entries;
```

### Example 8: COPY for Bulk Loading

```sql
-- Create a table for bulk import
CREATE TABLE sales_data (
    sale_id SERIAL PRIMARY KEY,
    sale_date DATE,
    product_name VARCHAR(100),
    quantity INTEGER,
    unit_price NUMERIC(10, 2)
);

-- Example 1: Using COPY FROM STDIN (programmatic approach)
-- In psql or application code:
COPY sales_data (sale_date, product_name, quantity, unit_price)
FROM STDIN
WITH (FORMAT csv, DELIMITER ',');
-- Then paste or send data:
-- 2024-01-15,Widget A,10,19.99
-- 2024-01-16,Widget B,5,29.99
-- 2024-01-17,Widget C,8,39.99
-- End with \. (in psql) or EOF

-- Example 2: Copy from file (requires file system access)
-- COPY sales_data (sale_date, product_name, quantity, unit_price)
-- FROM '/path/to/sales.csv'
-- WITH (FORMAT csv, HEADER true, DELIMITER ',', NULL 'NULL');

-- Alternative: Using \copy in psql (client-side)
-- \copy sales_data (sale_date, product_name, quantity, unit_price) FROM 'sales.csv' WITH (FORMAT csv, HEADER true);

-- For demonstration, use INSERT instead
INSERT INTO sales_data (sale_date, product_name, quantity, unit_price)
VALUES
    ('2024-01-15', 'Widget A', 10, 19.99),
    ('2024-01-16', 'Widget B', 5, 29.99),
    ('2024-01-17', 'Widget C', 8, 39.99),
    ('2024-01-18', 'Widget A', 15, 19.99),
    ('2024-01-19', 'Widget D', 3, 49.99);

SELECT * FROM sales_data;
```

## Common Mistakes

### Mistake 1: Not Specifying Column Names

```sql
-- BAD: Relies on column order
INSERT INTO employees
VALUES (1, 'John', 'Doe', 'john@example.com', '2024-01-01', 50000, 1);
-- Breaks if table structure changes

-- GOOD: Explicit column names
INSERT INTO employees (first_name, last_name, email, salary, department_id)
VALUES ('John', 'Doe', 'john@example.com', 50000, 1);
```

### Mistake 2: Ignoring SERIAL/AUTO-INCREMENT Columns

```sql
-- BAD: Manually providing SERIAL value
INSERT INTO employees (employee_id, first_name, last_name)
VALUES (1, 'John', 'Doe');
-- Can cause sequence to get out of sync

-- GOOD: Let PostgreSQL handle SERIAL
INSERT INTO employees (first_name, last_name)
VALUES ('John', 'Doe');
```

### Mistake 3: Using ON CONFLICT Without Index

```sql
-- BAD: No unique constraint or index on email
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(100)
);

-- This will fail:
-- INSERT INTO users (email) VALUES ('test@example.com')
-- ON CONFLICT (email) DO NOTHING;
-- Error: there is no unique or exclusion constraint matching the ON CONFLICT specification

-- GOOD: Create unique constraint first
ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);

-- Now this works:
INSERT INTO users (email) VALUES ('test@example.com')
ON CONFLICT (email) DO NOTHING;
```

### Mistake 4: Forgetting EXCLUDED in ON CONFLICT DO UPDATE

```sql
-- BAD: Reference wrong value
INSERT INTO inventory (product_id, quantity)
VALUES (1, 50)
ON CONFLICT (product_id)
DO UPDATE SET quantity = quantity + 50; -- Uses old value, not new
-- This adds 50 to existing quantity, not the new value

-- GOOD: Use EXCLUDED to reference new values
INSERT INTO inventory (product_id, quantity)
VALUES (1, 50)
ON CONFLICT (product_id)
DO UPDATE SET quantity = EXCLUDED.quantity;
```

### Mistake 5: Inefficient Bulk Inserts

```sql
-- BAD: Multiple single inserts
INSERT INTO products (name, price) VALUES ('Product 1', 10.00);
INSERT INTO products (name, price) VALUES ('Product 2', 20.00);
INSERT INTO products (name, price) VALUES ('Product 3', 30.00);
-- Each statement is a separate transaction

-- GOOD: Single multi-row insert
INSERT INTO products (name, price)
VALUES
    ('Product 1', 10.00),
    ('Product 2', 20.00),
    ('Product 3', 30.00);

-- BEST: Use COPY for very large datasets (1000+ rows)
```

## Best Practices

### 1. Always Specify Column Names

```sql
-- Explicit and maintainable
INSERT INTO employees (first_name, last_name, email, department_id)
VALUES ('John', 'Doe', 'john@example.com', 1);
```

### 2. Use Multi-Row INSERT for Better Performance

```sql
-- Insert multiple rows in one statement
INSERT INTO employees (first_name, last_name, email)
VALUES
    ('Alice', 'Johnson', 'alice@example.com'),
    ('Bob', 'Smith', 'bob@example.com'),
    ('Carol', 'Williams', 'carol@example.com');
```

### 3. Use RETURNING to Get Generated Values

```sql
-- Get auto-generated ID
INSERT INTO orders (customer_id, total)
VALUES (1, 100.00)
RETURNING order_id;

-- Use in application code to avoid extra SELECT
```

### 4. Use ON CONFLICT for Idempotent Operations

```sql
-- Safe to run multiple times
INSERT INTO user_preferences (user_id, theme, language)
VALUES (1, 'dark', 'en')
ON CONFLICT (user_id)
DO UPDATE SET
    theme = EXCLUDED.theme,
    language = EXCLUDED.language;
```

### 5. Use COPY for Bulk Data Loading

```sql
-- For large datasets (1000+ rows), use COPY
COPY products (sku, name, price)
FROM '/path/to/products.csv'
WITH (FORMAT csv, HEADER true);

-- COPY is 5-10x faster than INSERT for bulk operations
```

### 6. Leverage DEFAULT Values

```sql
-- Define sensible defaults at table level
CREATE TABLE audit_log (
    log_id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) DEFAULT CURRENT_USER
);

-- Simpler inserts
INSERT INTO audit_log (event_type, event_data)
VALUES ('user_login', '{"user_id": 123}');
```

### 7. Use Transactions for Multi-Table Inserts

```sql
-- Ensure consistency across related tables
BEGIN;

INSERT INTO customers (name, email)
VALUES ('John Doe', 'john@example.com')
RETURNING customer_id;

-- Use returned customer_id in next insert
INSERT INTO orders (customer_id, total)
VALUES (1, 100.00); -- Use the returned ID

COMMIT;
```

## Practice Exercises

### Exercise 1: Product Catalog Management

Create a product catalog system with the following requirements:

```sql
-- Create the tables
CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    category_id INTEGER REFERENCES categories(category_id),
    stock_quantity INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Your tasks:
-- 1. Insert 3 categories
-- 2. Insert 5 products across different categories
-- 3. Use INSERT ... SELECT to copy products from category 1 to a new category
-- 4. Implement UPSERT to update stock quantity (add to existing if product exists)
-- 5. Use RETURNING to get all inserted product IDs and names
```

### Exercise 2: User Activity Tracking

Build a user activity tracking system:

```sql
-- Create the tables
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    last_login TIMESTAMP,
    login_count INTEGER DEFAULT 0
);

CREATE TABLE activity_log (
    activity_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    activity_type VARCHAR(50) NOT NULL,
    activity_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Your tasks:
-- 1. Insert 3 users
-- 2. Implement a user login that:
--    - Inserts user if not exists
--    - Updates last_login and increments login_count if exists
--    - All in one INSERT ... ON CONFLICT statement
-- 3. Insert activity log entries for each login using RETURNING from the user insert
-- 4. Insert a batch of 10 activity log entries using multi-row INSERT
```

### Exercise 3: Order Processing System

Create an order processing system with inventory management:

```sql
-- Create the tables
CREATE TABLE inventory (
    product_id INTEGER PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL,
    available_quantity INTEGER NOT NULL DEFAULT 0,
    reserved_quantity INTEGER NOT NULL DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    customer_email VARCHAR(100) NOT NULL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending'
);

CREATE TABLE order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(order_id),
    product_id INTEGER REFERENCES inventory(product_id),
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL
);

-- Your tasks:
-- 1. Populate inventory with 5 products
-- 2. Create an order with multiple items using:
--    - INSERT into orders with RETURNING
--    - INSERT multiple order_items using the returned order_id
-- 3. Update inventory to reserve quantities using INSERT ... ON CONFLICT
-- 4. Handle a scenario where the same order is submitted twice
--    (use ON CONFLICT to prevent duplicates)
```

## Summary

INSERT operations in PostgreSQL offer powerful features beyond simple data insertion:

- **Multi-row inserts** improve performance for batch operations
- **INSERT ... SELECT** enables efficient data transformation and migration
- **ON CONFLICT** provides elegant handling of unique constraint violations
- **RETURNING** eliminates the need for separate SELECT queries
- **COPY** offers maximum performance for bulk data loading
- **DEFAULT values** simplify application code and ensure consistency

Mastering these INSERT variants is essential for building efficient, robust database applications. Practice with different scenarios to understand when to use each approach.

## Related Topics

- [SELECT Basics](./02-select-basics.md) - Querying inserted data
- [UPDATE and DELETE](./03-update-delete.md) - Modifying and removing data
- [Transactions](./05-transactions.md) - Managing data consistency
- [Data Types](../03-ddl-schema/02-data-types.md) - Understanding data types for INSERT
- [Constraints](../03-ddl-schema/03-constraints.md) - Validation during INSERT
