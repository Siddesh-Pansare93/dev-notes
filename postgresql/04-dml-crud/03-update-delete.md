# UPDATE and DELETE Operations in PostgreSQL

## Table of Contents
- [Theory](#theory)
- [Syntax](#syntax)
- [Examples](#examples)
- [Common Mistakes](#common-mistakes)
- [Best Practices](#best-practices)
- [Practice Exercises](#practice-exercises)

## Theory

### What are UPDATE and DELETE?

UPDATE and DELETE are DML (Data Manipulation Language) commands that modify existing data:

- **UPDATE**: Modifies existing rows in a table
- **DELETE**: Removes rows from a table
- **TRUNCATE**: Quickly removes all rows (DDL operation, not DML)

These operations are potentially destructive and should be used with care, especially in production environments.

### Key Concepts

1. **UPDATE with SET**: Modify column values
2. **UPDATE with FROM**: Join-based updates using other tables
3. **UPDATE with Subquery**: Use query results to update values
4. **DELETE with WHERE**: Remove specific rows
5. **DELETE with USING**: Join-based deletion
6. **TRUNCATE**: Fast table clearing
7. **RETURNING**: Get modified/deleted data back
8. **Multi-table Operations**: Affect multiple tables in one statement

### UPDATE vs DELETE vs TRUNCATE

| Feature | UPDATE | DELETE | TRUNCATE |
|---------|--------|--------|----------|
| Modifies data | Yes | No (removes) | No (removes) |
| WHERE clause | Yes | Yes | No (all rows) |
| Triggers | Fires | Fires | May not fire |
| Rollback | Yes | Yes | Yes (if in transaction) |
| Speed | Moderate | Moderate | Very fast |
| Returns rows | Can (RETURNING) | Can (RETURNING) | No |
| Resets SERIAL | No | No | Yes |
| Vacuum needed | Yes | Yes | No |

### Safety Considerations

- Always use WHERE clause (unless you intend to affect all rows)
- Test with SELECT first to verify which rows will be affected
- Use transactions for safety (BEGIN/COMMIT/ROLLBACK)
- Consider using RETURNING to verify changes
- Be cautious with cascading deletes (foreign keys)

## Syntax

### UPDATE Syntax

```sql
-- Basic UPDATE
UPDATE table_name
SET column1 = value1,
    column2 = value2
WHERE condition;

-- UPDATE with FROM (join-based)
UPDATE table1
SET column1 = table2.column1
FROM table2
WHERE table1.id = table2.id;

-- UPDATE with subquery
UPDATE table_name
SET column1 = (SELECT value FROM other_table WHERE condition)
WHERE condition;

-- UPDATE with RETURNING
UPDATE table_name
SET column1 = value1
WHERE condition
RETURNING *;
```

### DELETE Syntax

```sql
-- Basic DELETE
DELETE FROM table_name
WHERE condition;

-- DELETE with USING (join-based)
DELETE FROM table1
USING table2
WHERE table1.id = table2.id
  AND table2.condition = value;

-- DELETE with subquery
DELETE FROM table_name
WHERE column IN (SELECT column FROM other_table WHERE condition);

-- DELETE with RETURNING
DELETE FROM table_name
WHERE condition
RETURNING *;
```

### TRUNCATE Syntax

```sql
-- Basic TRUNCATE
TRUNCATE table_name;

-- TRUNCATE with cascade
TRUNCATE table_name CASCADE;

-- TRUNCATE multiple tables
TRUNCATE table1, table2, table3;

-- TRUNCATE with RESTART IDENTITY (reset sequences)
TRUNCATE table_name RESTART IDENTITY;

-- TRUNCATE with options
TRUNCATE table_name RESTART IDENTITY CASCADE;
```

## Examples

### Example 1: Basic UPDATE

```sql
-- Create sample table
CREATE TABLE employees (
    employee_id SERIAL PRIMARY KEY,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email VARCHAR(100),
    salary NUMERIC(10, 2),
    department VARCHAR(50),
    hire_date DATE,
    is_active BOOLEAN DEFAULT true,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO employees (first_name, last_name, email, salary, department, hire_date)
VALUES
    ('John', 'Doe', 'john.doe@company.com', 75000, 'Engineering', '2020-01-15'),
    ('Jane', 'Smith', 'jane.smith@company.com', 80000, 'Engineering', '2020-03-20'),
    ('Bob', 'Johnson', 'bob.johnson@company.com', 65000, 'Sales', '2019-07-10'),
    ('Alice', 'Williams', 'alice.williams@company.com', 70000, 'Marketing', '2021-02-01'),
    ('Charlie', 'Brown', 'charlie.brown@company.com', 72000, 'Engineering', '2021-06-15');

-- Update single column for one employee
UPDATE employees
SET salary = 78000
WHERE employee_id = 1;

-- Update multiple columns
UPDATE employees
SET salary = 82000,
    last_updated = CURRENT_TIMESTAMP
WHERE employee_id = 2;

-- Update based on condition
UPDATE employees
SET salary = salary * 1.05
WHERE department = 'Engineering';

-- Update with calculation
UPDATE employees
SET salary = salary * 1.10,
    last_updated = CURRENT_TIMESTAMP
WHERE hire_date < '2021-01-01';

-- Verify updates
SELECT employee_id, first_name, last_name, salary, department
FROM employees
ORDER BY employee_id;
```

### Example 2: UPDATE with FROM (Join-based Update)

```sql
-- Create related tables
CREATE TABLE departments (
    department_id SERIAL PRIMARY KEY,
    department_name VARCHAR(50) UNIQUE,
    budget NUMERIC(12, 2),
    manager_id INTEGER
);

CREATE TABLE employees_v2 (
    employee_id SERIAL PRIMARY KEY,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    department_name VARCHAR(50),
    salary NUMERIC(10, 2),
    bonus_percentage NUMERIC(5, 2) DEFAULT 0
);

-- Insert data
INSERT INTO departments (department_name, budget, manager_id)
VALUES
    ('Engineering', 1000000, 1),
    ('Sales', 750000, 3),
    ('Marketing', 500000, 4);

INSERT INTO employees_v2 (first_name, last_name, department_name, salary)
VALUES
    ('John', 'Doe', 'Engineering', 75000),
    ('Jane', 'Smith', 'Engineering', 80000),
    ('Bob', 'Johnson', 'Sales', 65000),
    ('Alice', 'Williams', 'Marketing', 70000);

-- Update employees based on department budget
UPDATE employees_v2 AS e
SET bonus_percentage =
    CASE
        WHEN d.budget > 900000 THEN 15.0
        WHEN d.budget > 600000 THEN 10.0
        ELSE 5.0
    END
FROM departments AS d
WHERE e.department_name = d.department_name;

-- Verify
SELECT first_name, last_name, department_name, salary, bonus_percentage
FROM employees_v2;

-- Update with multiple table join
CREATE TABLE performance_reviews (
    review_id SERIAL PRIMARY KEY,
    employee_id INTEGER,
    rating NUMERIC(3, 2),
    review_date DATE
);

INSERT INTO performance_reviews (employee_id, rating, review_date)
VALUES
    (1, 4.5, '2023-12-01'),
    (2, 4.8, '2023-12-01'),
    (3, 3.2, '2023-12-01'),
    (4, 4.0, '2023-12-01');

-- Update salary based on performance rating
UPDATE employees_v2 AS e
SET salary = salary * (1 + (pr.rating / 10)),
    bonus_percentage = bonus_percentage + (pr.rating * 2)
FROM performance_reviews AS pr
WHERE e.employee_id = pr.employee_id
  AND pr.review_date >= '2023-01-01';

SELECT employee_id, first_name, last_name, salary, bonus_percentage
FROM employees_v2;
```

### Example 3: UPDATE with Subquery

```sql
-- Create order tables
CREATE TABLE customers (
    customer_id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    total_spent NUMERIC(10, 2) DEFAULT 0,
    loyalty_tier VARCHAR(20) DEFAULT 'Bronze'
);

CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(customer_id),
    order_date DATE,
    total_amount NUMERIC(10, 2)
);

-- Insert data
INSERT INTO customers (name, email)
VALUES
    ('Alice Johnson', 'alice@example.com'),
    ('Bob Smith', 'bob@example.com'),
    ('Carol White', 'carol@example.com');

INSERT INTO orders (customer_id, order_date, total_amount)
VALUES
    (1, '2024-01-15', 150.00),
    (1, '2024-02-20', 200.00),
    (1, '2024-03-10', 175.00),
    (2, '2024-01-20', 75.00),
    (2, '2024-02-15', 100.00),
    (3, '2024-03-01', 500.00);

-- Update total_spent using subquery
UPDATE customers
SET total_spent = (
    SELECT COALESCE(SUM(total_amount), 0)
    FROM orders
    WHERE orders.customer_id = customers.customer_id
);

-- Update loyalty tier based on total spent
UPDATE customers
SET loyalty_tier =
    CASE
        WHEN total_spent >= 500 THEN 'Platinum'
        WHEN total_spent >= 300 THEN 'Gold'
        WHEN total_spent >= 150 THEN 'Silver'
        ELSE 'Bronze'
    END;

-- Verify
SELECT customer_id, name, total_spent, loyalty_tier FROM customers;

-- Update using EXISTS subquery
UPDATE customers
SET loyalty_tier = 'VIP'
WHERE EXISTS (
    SELECT 1
    FROM orders
    WHERE orders.customer_id = customers.customer_id
      AND total_amount > 400
);

SELECT * FROM customers;
```

### Example 4: UPDATE with RETURNING

```sql
-- Update and return affected rows
UPDATE employees
SET salary = salary * 1.07
WHERE department = 'Engineering'
RETURNING employee_id, first_name, last_name, salary;

-- Update and return specific columns with calculations
UPDATE employees
SET salary = salary * 1.10,
    last_updated = CURRENT_TIMESTAMP
WHERE hire_date < '2020-06-01'
RETURNING
    employee_id,
    first_name || ' ' || last_name AS full_name,
    salary AS new_salary,
    salary / 12 AS monthly_salary;

-- Update and store results in another table
CREATE TABLE salary_changes (
    change_id SERIAL PRIMARY KEY,
    employee_id INTEGER,
    old_salary NUMERIC(10, 2),
    new_salary NUMERIC(10, 2),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Using CTE to capture old and new values
WITH updated AS (
    UPDATE employees
    SET salary = salary * 1.05
    WHERE department = 'Sales'
    RETURNING employee_id, salary
)
INSERT INTO salary_changes (employee_id, new_salary)
SELECT employee_id, salary FROM updated;
```

### Example 5: Basic DELETE

```sql
-- Create test data
CREATE TABLE temp_employees AS SELECT * FROM employees;

-- Delete single row
DELETE FROM temp_employees
WHERE employee_id = 1;

-- Delete based on condition
DELETE FROM temp_employees
WHERE department = 'Marketing';

-- Delete with multiple conditions
DELETE FROM temp_employees
WHERE salary < 70000 AND hire_date > '2021-01-01';

-- Delete using IN clause
DELETE FROM temp_employees
WHERE employee_id IN (2, 3, 4);

-- Verify remaining rows
SELECT * FROM temp_employees;

-- Delete with date comparison
DELETE FROM orders
WHERE order_date < '2024-01-01';

-- Delete all rows (dangerous without WHERE)
-- DELETE FROM temp_employees; -- Be careful!
```

### Example 6: DELETE with USING (Join-based Delete)

```sql
-- Create test tables
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    category_id INTEGER,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(50),
    is_discontinued BOOLEAN DEFAULT false
);

-- Insert test data
INSERT INTO categories (category_name, is_discontinued)
VALUES
    ('Electronics', false),
    ('Clothing', false),
    ('Books', true),
    ('Toys', true);

INSERT INTO products (name, category_id, is_active)
VALUES
    ('Laptop', 1, true),
    ('T-Shirt', 2, true),
    ('Novel', 3, true),
    ('Action Figure', 4, true),
    ('Tablet', 1, true);

-- Delete products in discontinued categories
DELETE FROM products
USING categories
WHERE products.category_id = categories.category_id
  AND categories.is_discontinued = true;

-- Verify deletion
SELECT * FROM products;

-- Delete with multiple table joins
CREATE TABLE inventory (
    inventory_id SERIAL PRIMARY KEY,
    product_id INTEGER,
    quantity INTEGER
);

INSERT INTO inventory (product_id, quantity)
VALUES (1, 0), (2, 5), (5, 0);

-- Delete products with zero inventory
DELETE FROM products
USING inventory
WHERE products.product_id = inventory.product_id
  AND inventory.quantity = 0;

SELECT * FROM products;
```

### Example 7: DELETE with RETURNING

```sql
-- Recreate employees for testing
DROP TABLE IF EXISTS temp_employees;
CREATE TABLE temp_employees AS SELECT * FROM employees;

-- Delete and return deleted rows
DELETE FROM temp_employees
WHERE department = 'Engineering'
RETURNING *;

-- Delete and return specific columns
DELETE FROM temp_employees
WHERE salary < 70000
RETURNING employee_id, first_name, last_name, salary, department;

-- Archive deleted rows
CREATE TABLE archived_employees (
    employee_id INTEGER,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email VARCHAR(100),
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Delete and insert into archive
WITH deleted AS (
    DELETE FROM temp_employees
    WHERE hire_date < '2020-01-01'
    RETURNING employee_id, first_name, last_name, email
)
INSERT INTO archived_employees (employee_id, first_name, last_name, email)
SELECT employee_id, first_name, last_name, email FROM deleted;

-- Verify archive
SELECT * FROM archived_employees;
```

### Example 8: TRUNCATE vs DELETE

```sql
-- Create test table
CREATE TABLE test_truncate (
    id SERIAL PRIMARY KEY,
    data VARCHAR(100)
);

INSERT INTO test_truncate (data)
SELECT 'Row ' || generate_series(1, 1000);

-- Check sequence value
SELECT currval('test_truncate_id_seq');

-- DELETE removes rows but doesn't reset sequence
DELETE FROM test_truncate;

-- Insert after DELETE
INSERT INTO test_truncate (data) VALUES ('After DELETE');
SELECT * FROM test_truncate; -- ID continues from last value

-- Recreate data
DELETE FROM test_truncate;
INSERT INTO test_truncate (data)
SELECT 'Row ' || generate_series(1, 1000);

-- TRUNCATE removes all rows and can reset sequence
TRUNCATE test_truncate RESTART IDENTITY;

-- Insert after TRUNCATE
INSERT INTO test_truncate (data) VALUES ('After TRUNCATE');
SELECT * FROM test_truncate; -- ID starts from 1

-- TRUNCATE is much faster for large tables
CREATE TABLE large_table (
    id SERIAL PRIMARY KEY,
    data TEXT
);

INSERT INTO large_table (data)
SELECT md5(random()::text) FROM generate_series(1, 100000);

-- Fast removal
TRUNCATE large_table;

-- TRUNCATE with CASCADE (removes dependent table data)
CREATE TABLE parent_table (
    parent_id SERIAL PRIMARY KEY,
    name VARCHAR(50)
);

CREATE TABLE child_table (
    child_id SERIAL PRIMARY KEY,
    parent_id INTEGER REFERENCES parent_table(parent_id),
    data VARCHAR(100)
);

INSERT INTO parent_table (name) VALUES ('Parent 1'), ('Parent 2');
INSERT INTO child_table (parent_id, data) VALUES (1, 'Child 1'), (2, 'Child 2');

-- This would fail without CASCADE
-- TRUNCATE parent_table;

-- With CASCADE, truncates both tables
TRUNCATE parent_table CASCADE;

SELECT * FROM parent_table;
SELECT * FROM child_table; -- Also empty
```

### Example 9: Multi-table Operations

```sql
-- Create test schema
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50),
    email VARCHAR(100),
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE user_sessions (
    session_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    login_time TIMESTAMP,
    logout_time TIMESTAMP
);

CREATE TABLE user_preferences (
    preference_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    theme VARCHAR(20),
    notifications BOOLEAN
);

-- Insert test data
INSERT INTO users (username, email, is_active)
VALUES
    ('john_doe', 'john@example.com', true),
    ('jane_smith', 'jane@example.com', false),
    ('bob_jones', 'bob@example.com', true);

INSERT INTO user_sessions (user_id, login_time)
VALUES (1, NOW() - INTERVAL '2 hours'), (2, NOW() - INTERVAL '5 days');

INSERT INTO user_preferences (user_id, theme, notifications)
VALUES (1, 'dark', true), (2, 'light', false), (3, 'dark', true);

-- Deactivate users and delete their sessions
BEGIN;

-- Update users
UPDATE users
SET is_active = false
WHERE user_id IN (
    SELECT user_id
    FROM user_sessions
    WHERE login_time < NOW() - INTERVAL '3 days'
);

-- Delete old sessions
DELETE FROM user_sessions
WHERE login_time < NOW() - INTERVAL '3 days';

COMMIT;

-- Cascade delete (remove user and all related data)
DELETE FROM users WHERE user_id = 2;
-- Sessions and preferences with foreign keys ON DELETE CASCADE would also be deleted
```

### Example 10: Conditional Updates

```sql
-- Update with CASE expressions
UPDATE employees
SET salary =
    CASE
        WHEN department = 'Engineering' THEN salary * 1.10
        WHEN department = 'Sales' THEN salary * 1.08
        WHEN department = 'Marketing' THEN salary * 1.06
        ELSE salary * 1.05
    END,
    last_updated = CURRENT_TIMESTAMP;

-- Update with multiple CASE expressions
UPDATE employees
SET
    salary = salary * (
        CASE
            WHEN hire_date < '2020-01-01' THEN 1.10
            WHEN hire_date < '2022-01-01' THEN 1.07
            ELSE 1.05
        END
    ),
    bonus_percentage = (
        CASE
            WHEN salary > 80000 THEN 15.0
            WHEN salary > 70000 THEN 12.0
            ELSE 10.0
        END
    );

-- Conditional UPDATE with WHERE
UPDATE employees
SET is_active = false
WHERE hire_date < '2019-01-01'
  AND salary < 60000;
```

## Common Mistakes

### Mistake 1: Forgetting WHERE Clause

```sql
-- DANGER: Updates all rows!
UPDATE employees SET salary = 100000;

-- GOOD: Update specific rows
UPDATE employees SET salary = 100000 WHERE employee_id = 1;

-- BEST: Test with SELECT first
SELECT * FROM employees WHERE employee_id = 1;
UPDATE employees SET salary = 100000 WHERE employee_id = 1;
```

### Mistake 2: Not Using Transactions for Critical Updates

```sql
-- BAD: No transaction, can't rollback
UPDATE employees SET salary = salary * 1.10 WHERE department = 'Engineering';
-- Oops! Wrong department!

-- GOOD: Use transaction
BEGIN;
UPDATE employees SET salary = salary * 1.10 WHERE department = 'Engineering';
-- Review changes
SELECT * FROM employees WHERE department = 'Engineering';
-- If wrong: ROLLBACK; If correct: COMMIT;
ROLLBACK;
```

### Mistake 3: Circular UPDATE Dependencies

```sql
-- BAD: Can create inconsistent state
UPDATE employees SET salary = salary + 1000 WHERE employee_id = 1;
UPDATE employees SET salary = salary - 1000 WHERE employee_id = 1;
-- These should be in same statement

-- GOOD: Single atomic UPDATE
UPDATE employees
SET salary =
    CASE
        WHEN employee_id = 1 THEN salary + 1000
        WHEN employee_id = 2 THEN salary - 1000
        ELSE salary
    END
WHERE employee_id IN (1, 2);
```

### Mistake 4: DELETE vs TRUNCATE for Large Tables

```sql
-- BAD: Slow for large tables, generates lots of WAL
DELETE FROM large_table;

-- GOOD: Fast, minimal overhead (if appropriate)
TRUNCATE large_table;

-- Note: TRUNCATE cannot have WHERE clause
-- Use DELETE if you need conditional removal
```

### Mistake 5: Not Considering Foreign Key Constraints

```sql
-- BAD: Might fail due to foreign key constraint
DELETE FROM departments WHERE department_id = 1;
-- Error if employees reference this department

-- GOOD: Delete dependents first or use CASCADE
DELETE FROM employees WHERE department_id = 1;
DELETE FROM departments WHERE department_id = 1;

-- OR: Set up foreign key with CASCADE
-- CREATE TABLE employees (
--     ...
--     department_id INTEGER REFERENCES departments ON DELETE CASCADE
-- );
```

## Best Practices

### 1. Always Use WHERE Clause (Unless You Really Mean All Rows)

```sql
-- Explicit and safe
UPDATE employees SET is_active = false WHERE employee_id = 1;
DELETE FROM temp_data WHERE created_at < NOW() - INTERVAL '30 days';
```

### 2. Test with SELECT Before UPDATE/DELETE

```sql
-- First: SELECT to verify what will be affected
SELECT * FROM employees WHERE department = 'Engineering' AND salary < 70000;

-- Then: UPDATE if results look correct
UPDATE employees
SET salary = 70000
WHERE department = 'Engineering' AND salary < 70000;
```

### 3. Use Transactions for Safety

```sql
BEGIN;

UPDATE employees SET salary = salary * 1.10 WHERE department = 'Engineering';

-- Review changes
SELECT * FROM employees WHERE department = 'Engineering';

-- If correct: COMMIT, if wrong: ROLLBACK
COMMIT;
```

### 4. Use RETURNING to Verify Changes

```sql
UPDATE employees
SET salary = salary * 1.05
WHERE employee_id = 1
RETURNING employee_id, first_name, last_name, salary;
```

### 5. Archive Before Deleting Important Data

```sql
-- Create archive table
CREATE TABLE archived_orders AS
SELECT * FROM orders WHERE false;

-- Archive old data
INSERT INTO archived_orders
SELECT * FROM orders WHERE order_date < '2023-01-01';

-- Then delete
DELETE FROM orders WHERE order_date < '2023-01-01';
```

### 6. Use TRUNCATE for Clearing Tables

```sql
-- Fast way to clear table
TRUNCATE TABLE temp_table RESTART IDENTITY;

-- Much faster than DELETE for large tables
```

### 7. Be Careful with NULL in Updates

```sql
-- Explicit NULL check
UPDATE employees
SET email = 'unknown@company.com'
WHERE email IS NULL;

-- Not: WHERE email = NULL (won't work)
```

## Practice Exercises

### Exercise 1: Employee Salary Adjustments

```sql
-- Use the employees table from examples

-- Tasks:
-- 1. Give a 7% raise to all employees hired before 2021
-- 2. Update the department to 'Engineering-Senior' for Engineering employees earning > 75000
-- 3. Set is_active = false for employees with salary < 65000
-- 4. Update emails to lowercase using LOWER() function
-- 5. Give an additional 5% raise to employees in Engineering, return their new salaries
-- 6. Delete all inactive employees (is_active = false)
-- 7. Archive employees hired before 2020 to archived_employees table, then delete them
```

### Exercise 2: Order Management System

```sql
-- Create test data
CREATE TABLE order_status_log (
    log_id SERIAL PRIMARY KEY,
    order_id INTEGER,
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tasks:
-- 1. Update all 'pending' orders to 'processing' for orders placed > 3 days ago
-- 2. Delete orders with status 'cancelled' that are older than 90 days
-- 3. Update order total_amount by applying a 10% discount for VIP customers
-- 4. Track status changes: when updating order status, insert old and new status into log
-- 5. Delete orders with total_amount = 0 and return their order_ids
-- 6. Update customer total_spent based on their completed orders sum
-- 7. Set all 'processing' orders to 'shipped' and log the change
```

### Exercise 3: Product Inventory Management

```sql
-- Create tables
CREATE TABLE stock_movements (
    movement_id SERIAL PRIMARY KEY,
    product_id INTEGER,
    quantity_change INTEGER,
    movement_type VARCHAR(20),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tasks:
-- 1. Update product quantities based on stock_movements (sum of quantity_change)
-- 2. Delete products with is_active = false and stock_quantity = 0
-- 3. Update product prices: increase by 5% for products with stock < 20
-- 4. Set is_active = false for products not sold in last 6 months (use orders table)
-- 5. Delete duplicate products (same name, keep the one with lowest product_id)
-- 6. Update product category based on price ranges
-- 7. Truncate stock_movements table and restart the ID sequence
```

## Summary

UPDATE and DELETE are powerful operations for data modification and removal:

- **UPDATE** modifies existing rows, supports joins and subqueries
- **DELETE** removes rows, can use USING for join-based deletion
- **TRUNCATE** quickly removes all rows, resets sequences
- **RETURNING** allows you to retrieve affected rows
- **Transactions** provide safety for critical operations
- **WHERE clause** is essential for targeting specific rows

Always exercise caution with these operations, especially in production. Test with SELECT first, use transactions, and consider archiving before deletion.

## Related Topics

- [INSERT Operations](./01-insert.md) - Adding new data
- [SELECT Basics](./02-select-basics.md) - Querying data to update/delete
- [Transactions](./05-transactions.md) - Safe multi-operation changes
- [Constraints](../03-ddl-schema/03-constraints.md) - Foreign key cascades
- [Triggers](../08-advanced/03-triggers.md) - Automated actions on UPDATE/DELETE
