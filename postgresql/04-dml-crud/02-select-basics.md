# SELECT Basics in PostgreSQL

## Table of Contents
- [Theory](#theory)
- [Syntax](#syntax)
- [Examples](#examples)
- [Common Mistakes](#common-mistakes)
- [Best Practices](#best-practices)
- [Practice Exercises](#practice-exercises)

## Theory

### What is SELECT?

SELECT is the most fundamental SQL command for retrieving data from database tables. It allows you to query, filter, sort, and transform data according to your needs. SELECT is a read-only operation that doesn't modify the database.

### Key Concepts

1. **Column Selection**: Choose specific columns or all columns (*)
2. **Aliases**: Rename columns or tables for readability
3. **DISTINCT**: Remove duplicate rows from results
4. **WHERE Clause**: Filter rows based on conditions
5. **Comparison Operators**: =, !=, <, >, <=, >=
6. **Logical Operators**: AND, OR, NOT
7. **ORDER BY**: Sort results in ascending or descending order
8. **LIMIT/OFFSET**: Pagination and result limiting
9. **FETCH FIRST**: SQL standard alternative to LIMIT

### SELECT Execution Order

Understanding the logical execution order helps write better queries:

1. FROM - Identify source tables
2. WHERE - Filter rows
3. SELECT - Choose columns
4. DISTINCT - Remove duplicates
5. ORDER BY - Sort results
6. LIMIT/OFFSET - Limit result set

Note: This is the logical order, not necessarily the physical execution order (query optimizer may reorder).

### NULL Handling in SELECT

- NULL represents unknown or missing data
- NULL != NULL (NULL is not equal to NULL)
- Use IS NULL and IS NOT NULL for NULL checks
- NULL affects sorting with NULLS FIRST/LAST

## Syntax

### Basic SELECT Syntax

```sql
-- Select all columns
SELECT * FROM table_name;

-- Select specific columns
SELECT column1, column2, column3 FROM table_name;

-- Select with aliases
SELECT column1 AS alias1, column2 AS alias2 FROM table_name;

-- Select distinct values
SELECT DISTINCT column1 FROM table_name;
```

### WHERE Clause Syntax

```sql
-- Basic WHERE
SELECT columns FROM table_name
WHERE condition;

-- Multiple conditions with AND/OR
SELECT columns FROM table_name
WHERE condition1 AND condition2 OR condition3;

-- NOT operator
SELECT columns FROM table_name
WHERE NOT condition;
```

### Comparison Operators

```sql
-- Equal
SELECT * FROM table_name WHERE column = value;

-- Not equal
SELECT * FROM table_name WHERE column != value;
SELECT * FROM table_name WHERE column <> value;

-- Greater than, Less than
SELECT * FROM table_name WHERE column > value;
SELECT * FROM table_name WHERE column < value;

-- Greater than or equal, Less than or equal
SELECT * FROM table_name WHERE column >= value;
SELECT * FROM table_name WHERE column <= value;
```

### ORDER BY Syntax

```sql
-- Ascending order (default)
SELECT columns FROM table_name
ORDER BY column1 ASC;

-- Descending order
SELECT columns FROM table_name
ORDER BY column1 DESC;

-- Multiple columns
SELECT columns FROM table_name
ORDER BY column1 ASC, column2 DESC;

-- NULL handling
SELECT columns FROM table_name
ORDER BY column1 NULLS FIRST;

SELECT columns FROM table_name
ORDER BY column1 NULLS LAST;
```

### LIMIT and OFFSET Syntax

```sql
-- Limit number of rows
SELECT columns FROM table_name
LIMIT n;

-- Skip rows and limit
SELECT columns FROM table_name
LIMIT n OFFSET m;

-- Alternative: OFFSET before LIMIT
SELECT columns FROM table_name
OFFSET m LIMIT n;
```

### FETCH FIRST Syntax (SQL Standard)

```sql
-- Fetch first N rows
SELECT columns FROM table_name
FETCH FIRST n ROWS ONLY;

-- With OFFSET
SELECT columns FROM table_name
OFFSET m ROWS
FETCH FIRST n ROWS ONLY;

-- Fetch with percentage (PostgreSQL 13+)
SELECT columns FROM table_name
FETCH FIRST 10 PERCENT ROWS ONLY;
```

### SELECT INTO vs CREATE TABLE AS

```sql
-- SELECT INTO (creates new table)
SELECT column1, column2
INTO new_table
FROM existing_table
WHERE condition;

-- CREATE TABLE AS (more flexible)
CREATE TABLE new_table AS
SELECT column1, column2
FROM existing_table
WHERE condition;

-- CREATE TABLE AS with no data
CREATE TABLE new_table AS
SELECT column1, column2
FROM existing_table
WHERE false; -- Creates structure only
```

## Examples

### Example 1: Basic Column Selection

```sql
-- Create sample table
CREATE TABLE employees (
    employee_id SERIAL PRIMARY KEY,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email VARCHAR(100),
    phone VARCHAR(20),
    hire_date DATE,
    salary NUMERIC(10, 2),
    department VARCHAR(50),
    manager_id INTEGER
);

-- Insert sample data
INSERT INTO employees (first_name, last_name, email, phone, hire_date, salary, department, manager_id)
VALUES
    ('John', 'Doe', 'john.doe@company.com', '555-0001', '2020-01-15', 75000, 'Engineering', NULL),
    ('Jane', 'Smith', 'jane.smith@company.com', '555-0002', '2020-03-20', 80000, 'Engineering', 1),
    ('Bob', 'Johnson', 'bob.johnson@company.com', '555-0003', '2019-07-10', 65000, 'Sales', NULL),
    ('Alice', 'Williams', 'alice.williams@company.com', '555-0004', '2021-02-01', 70000, 'Marketing', NULL),
    ('Charlie', 'Brown', 'charlie.brown@company.com', '555-0005', '2021-06-15', 72000, 'Engineering', 1),
    ('Diana', 'Miller', 'diana.miller@company.com', '555-0006', '2022-01-10', 68000, 'Sales', 3),
    ('Eve', 'Davis', 'eve.davis@company.com', NULL, '2022-04-01', 71000, 'Marketing', 4),
    ('Frank', 'Wilson', 'frank.wilson@company.com', '555-0008', '2023-01-15', 69000, 'Sales', 3);

-- Select all columns
SELECT * FROM employees;

-- Select specific columns
SELECT first_name, last_name, email FROM employees;

-- Select with computation
SELECT first_name, last_name, salary, salary * 12 AS annual_salary FROM employees;
```

### Example 2: Column Aliases

```sql
-- Simple aliases
SELECT
    first_name AS "First Name",
    last_name AS "Last Name",
    email AS "Email Address"
FROM employees;

-- Aliases without AS keyword (less recommended)
SELECT
    first_name "First Name",
    last_name "Last Name"
FROM employees;

-- Computed column aliases
SELECT
    first_name || ' ' || last_name AS full_name,
    department AS dept,
    salary * 1.1 AS salary_with_10_percent_raise
FROM employees;

-- Table aliases
SELECT
    e.first_name,
    e.last_name,
    e.department
FROM employees AS e;

-- Using aliases in ORDER BY
SELECT
    first_name,
    last_name,
    salary * 12 AS annual_salary
FROM employees
ORDER BY annual_salary DESC;
```

### Example 3: DISTINCT

```sql
-- Get unique departments
SELECT DISTINCT department FROM employees;

-- DISTINCT on multiple columns
SELECT DISTINCT department, manager_id FROM employees;

-- Count distinct values
SELECT COUNT(DISTINCT department) AS department_count FROM employees;

-- DISTINCT with ORDER BY
SELECT DISTINCT department
FROM employees
ORDER BY department;

-- DISTINCT vs ALL (ALL is default)
SELECT ALL department FROM employees; -- Shows duplicates
SELECT DISTINCT department FROM employees; -- No duplicates
```

### Example 4: WHERE Clause with Comparison Operators

```sql
-- Equal to
SELECT * FROM employees WHERE department = 'Engineering';

-- Not equal to
SELECT * FROM employees WHERE department != 'Sales';
SELECT * FROM employees WHERE department <> 'Sales'; -- Same as !=

-- Greater than
SELECT first_name, last_name, salary
FROM employees
WHERE salary > 70000;

-- Less than or equal
SELECT first_name, last_name, hire_date
FROM employees
WHERE hire_date <= '2021-01-01';

-- Between (inclusive)
SELECT first_name, last_name, salary
FROM employees
WHERE salary BETWEEN 68000 AND 75000;

-- Numeric comparisons
SELECT * FROM employees WHERE employee_id >= 5;
```

### Example 5: Logical Operators (AND, OR, NOT)

```sql
-- AND: Both conditions must be true
SELECT first_name, last_name, department, salary
FROM employees
WHERE department = 'Engineering' AND salary > 70000;

-- OR: At least one condition must be true
SELECT first_name, last_name, department
FROM employees
WHERE department = 'Sales' OR department = 'Marketing';

-- NOT: Negates a condition
SELECT first_name, last_name, department
FROM employees
WHERE NOT department = 'Engineering';

-- Combining AND, OR with parentheses
SELECT first_name, last_name, department, salary
FROM employees
WHERE (department = 'Engineering' OR department = 'Sales')
  AND salary > 70000;

-- Complex logical expression
SELECT first_name, last_name, hire_date, salary
FROM employees
WHERE hire_date >= '2021-01-01'
  AND (salary > 70000 OR department = 'Engineering')
  AND NOT manager_id IS NULL;
```

### Example 6: ORDER BY

```sql
-- Ascending order (default)
SELECT first_name, last_name, salary
FROM employees
ORDER BY salary ASC;

-- Descending order
SELECT first_name, last_name, salary
FROM employees
ORDER BY salary DESC;

-- Multiple columns
SELECT first_name, last_name, department, salary
FROM employees
ORDER BY department ASC, salary DESC;

-- Order by column position (not recommended)
SELECT first_name, last_name, salary
FROM employees
ORDER BY 3 DESC; -- Orders by 3rd column (salary)

-- Order by computed column
SELECT first_name, last_name, salary, salary * 12 AS annual_salary
FROM employees
ORDER BY annual_salary DESC;

-- Order by expression
SELECT first_name, last_name, hire_date
FROM employees
ORDER BY EXTRACT(YEAR FROM hire_date), last_name;
```

### Example 7: NULL Handling in ORDER BY

```sql
-- Insert employee with NULL phone
-- (Already exists from initial data: Eve Davis has NULL phone)

-- Default NULL ordering (NULLS LAST in ASC, NULLS FIRST in DESC)
SELECT first_name, last_name, phone
FROM employees
ORDER BY phone;

-- Explicit NULLS FIRST
SELECT first_name, last_name, phone
FROM employees
ORDER BY phone NULLS FIRST;

-- Explicit NULLS LAST
SELECT first_name, last_name, phone
FROM employees
ORDER BY phone DESC NULLS LAST;

-- NULL handling with multiple columns
SELECT first_name, last_name, manager_id, salary
FROM employees
ORDER BY manager_id NULLS FIRST, salary DESC;
```

### Example 8: LIMIT and OFFSET

```sql
-- Get first 3 employees
SELECT first_name, last_name, hire_date
FROM employees
ORDER BY hire_date
LIMIT 3;

-- Get top 5 highest paid employees
SELECT first_name, last_name, salary
FROM employees
ORDER BY salary DESC
LIMIT 5;

-- Pagination: Skip first 3, get next 3
SELECT first_name, last_name, hire_date
FROM employees
ORDER BY hire_date
LIMIT 3 OFFSET 3;

-- Alternative OFFSET syntax
SELECT first_name, last_name, hire_date
FROM employees
ORDER BY hire_date
OFFSET 3 LIMIT 3;

-- Page 2 with page size 4
SELECT first_name, last_name, salary
FROM employees
ORDER BY employee_id
LIMIT 4 OFFSET 4; -- OFFSET = (page_number - 1) * page_size
```

### Example 9: FETCH FIRST (SQL Standard)

```sql
-- Fetch first 5 rows
SELECT first_name, last_name, salary
FROM employees
ORDER BY salary DESC
FETCH FIRST 5 ROWS ONLY;

-- FETCH FIRST with OFFSET
SELECT first_name, last_name, hire_date
FROM employees
ORDER BY hire_date
OFFSET 2 ROWS
FETCH FIRST 3 ROWS ONLY;

-- FETCH NEXT (synonym for FETCH FIRST)
SELECT first_name, last_name, department
FROM employees
FETCH NEXT 4 ROWS ONLY;

-- ROW vs ROWS (both valid)
SELECT first_name, last_name
FROM employees
FETCH FIRST 1 ROW ONLY; -- Singular for 1

-- WITH TIES (include rows with same sort value as last row)
SELECT first_name, last_name, salary
FROM employees
ORDER BY salary DESC
FETCH FIRST 3 ROWS WITH TIES;
```

### Example 10: SELECT INTO and CREATE TABLE AS

```sql
-- SELECT INTO (creates new table)
SELECT first_name, last_name, department, salary
INTO high_earners
FROM employees
WHERE salary > 70000;

-- Verify new table
SELECT * FROM high_earners;

-- CREATE TABLE AS (more flexible)
CREATE TABLE engineering_team AS
SELECT employee_id, first_name, last_name, email, salary
FROM employees
WHERE department = 'Engineering';

-- CREATE TABLE AS with no data (structure only)
CREATE TABLE employees_template AS
SELECT *
FROM employees
WHERE false; -- Never true, so no rows copied

-- Verify structure
SELECT * FROM employees_template;

-- CREATE TABLE AS with computed columns
CREATE TABLE employee_summary AS
SELECT
    department,
    COUNT(*) AS employee_count,
    AVG(salary) AS avg_salary,
    MIN(salary) AS min_salary,
    MAX(salary) AS max_salary
FROM employees
GROUP BY department;

SELECT * FROM employee_summary;
```

### Example 11: Complex WHERE Conditions

```sql
-- Multiple AND conditions
SELECT first_name, last_name, department, salary, hire_date
FROM employees
WHERE department = 'Engineering'
  AND salary >= 70000
  AND hire_date >= '2020-01-01';

-- OR with proper grouping
SELECT first_name, last_name, department, salary
FROM employees
WHERE (department = 'Engineering' AND salary > 75000)
   OR (department = 'Sales' AND salary > 65000);

-- IS NULL and IS NOT NULL
SELECT first_name, last_name, phone
FROM employees
WHERE phone IS NULL;

SELECT first_name, last_name, manager_id
FROM employees
WHERE manager_id IS NOT NULL;

-- Combining NULL checks with other conditions
SELECT first_name, last_name, department, phone
FROM employees
WHERE department = 'Marketing'
  AND phone IS NOT NULL;
```

### Example 12: Practical Query Patterns

```sql
-- Find recently hired employees
SELECT first_name, last_name, hire_date, department
FROM employees
WHERE hire_date >= CURRENT_DATE - INTERVAL '1 year'
ORDER BY hire_date DESC;

-- Find employees in specific salary range by department
SELECT department, first_name, last_name, salary
FROM employees
WHERE department IN ('Engineering', 'Sales')
  AND salary BETWEEN 70000 AND 80000
ORDER BY department, salary DESC;

-- Get employee list with formatted names
SELECT
    employee_id,
    UPPER(last_name) || ', ' || INITCAP(first_name) AS formatted_name,
    email,
    department
FROM employees
ORDER BY last_name, first_name;

-- Find top earner in each department (using window function preview)
SELECT DISTINCT ON (department)
    department,
    first_name,
    last_name,
    salary
FROM employees
ORDER BY department, salary DESC;
```

## Common Mistakes

### Mistake 1: Using * in Production Queries

```sql
-- BAD: Selects all columns, wastes bandwidth
SELECT * FROM employees WHERE department = 'Engineering';

-- GOOD: Select only needed columns
SELECT employee_id, first_name, last_name, email
FROM employees
WHERE department = 'Engineering';
```

### Mistake 2: Forgetting WHERE with Dangerous Operations

```sql
-- BAD: Creates copy of entire table
SELECT * INTO employees_backup FROM employees;
-- Could be huge and slow

-- GOOD: Be specific about what you're copying
SELECT * INTO recent_hires
FROM employees
WHERE hire_date >= '2023-01-01';
```

### Mistake 3: Wrong NULL Comparison

```sql
-- BAD: Will not return rows where phone is NULL
SELECT * FROM employees WHERE phone = NULL;

-- GOOD: Use IS NULL
SELECT * FROM employees WHERE phone IS NULL;

-- BAD: Will not exclude NULLs
SELECT * FROM employees WHERE phone != NULL;

-- GOOD: Use IS NOT NULL
SELECT * FROM employees WHERE phone IS NOT NULL;
```

### Mistake 4: Incorrect Operator Precedence

```sql
-- BAD: AND has higher precedence than OR
SELECT * FROM employees
WHERE department = 'Engineering' OR department = 'Sales' AND salary > 70000;
-- This means: Engineering (any salary) OR (Sales with salary > 70000)

-- GOOD: Use parentheses for clarity
SELECT * FROM employees
WHERE (department = 'Engineering' OR department = 'Sales')
  AND salary > 70000;
```

### Mistake 5: ORDER BY Without LIMIT Can Be Slow

```sql
-- BAD: Sorting entire table when you only need top 10
SELECT * FROM large_table ORDER BY created_at DESC;
-- Then taking only first 10 in application

-- GOOD: Use LIMIT in database
SELECT * FROM large_table
ORDER BY created_at DESC
LIMIT 10;
```

### Mistake 6: Using Column Alias in WHERE

```sql
-- BAD: Cannot use alias in WHERE clause
SELECT first_name, last_name, salary * 12 AS annual_salary
FROM employees
WHERE annual_salary > 800000; -- ERROR: column "annual_salary" does not exist

-- GOOD: Repeat expression or use subquery
SELECT first_name, last_name, salary * 12 AS annual_salary
FROM employees
WHERE salary * 12 > 800000;

-- ALTERNATIVE: Use subquery
SELECT * FROM (
    SELECT first_name, last_name, salary * 12 AS annual_salary
    FROM employees
) AS subquery
WHERE annual_salary > 800000;
```

## Best Practices

### 1. Select Only Needed Columns

```sql
-- Efficient: Only required data
SELECT employee_id, first_name, last_name, email
FROM employees
WHERE department = 'Engineering';

-- Avoid: SELECT * in production
```

### 2. Use Meaningful Aliases

```sql
-- Clear and readable
SELECT
    e.first_name AS employee_first_name,
    e.last_name AS employee_last_name,
    e.salary * 12 AS annual_salary_usd,
    e.department AS dept_name
FROM employees AS e
WHERE e.hire_date >= '2020-01-01';
```

### 3. Always Use ORDER BY for Consistent Results

```sql
-- Without ORDER BY, row order is undefined
SELECT * FROM employees LIMIT 10; -- Unpredictable order

-- With ORDER BY, results are consistent
SELECT * FROM employees
ORDER BY employee_id
LIMIT 10;
```

### 4. Use LIMIT for Large Result Sets

```sql
-- Prevent accidentally returning millions of rows
SELECT * FROM large_table
WHERE status = 'active'
ORDER BY created_at DESC
LIMIT 1000;
```

### 5. Be Explicit with NULL Handling

```sql
-- Clear intent
SELECT first_name, last_name, phone
FROM employees
WHERE phone IS NOT NULL
ORDER BY last_name NULLS LAST;
```

### 6. Use Parentheses for Complex Conditions

```sql
-- Clear and unambiguous
SELECT * FROM employees
WHERE (department = 'Engineering' OR department = 'IT')
  AND (salary > 70000 AND hire_date >= '2020-01-01');
```

### 7. Prefer FETCH FIRST for Portability

```sql
-- SQL standard (works on multiple databases)
SELECT * FROM employees
ORDER BY hire_date DESC
FETCH FIRST 10 ROWS ONLY;

-- PostgreSQL-specific (less portable)
SELECT * FROM employees
ORDER BY hire_date DESC
LIMIT 10;
```

## Practice Exercises

### Exercise 1: Employee Analysis

Using the employees table created in the examples:

```sql
-- Tasks:
-- 1. Find all employees hired in 2021, sorted by hire date
-- 2. List employees earning between 68000 and 75000, show full name and salary
-- 3. Get the top 3 highest-paid employees with their departments
-- 4. Find employees without a manager (manager_id IS NULL)
-- 5. List unique departments sorted alphabetically
-- 6. Create a query showing employee name, salary, and a calculated bonus (10% of salary)
-- 7. Find employees in Engineering or Sales departments earning > 70000
-- 8. Get the second page of employees (rows 6-10) sorted by last name
```

### Exercise 2: Product Catalog Queries

```sql
-- Create sample data
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    price NUMERIC(10, 2),
    stock_quantity INTEGER,
    supplier_id INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO products (name, category, price, stock_quantity, supplier_id, is_active)
VALUES
    ('Laptop Pro 15', 'Electronics', 1299.99, 50, 1, true),
    ('Wireless Mouse', 'Electronics', 29.99, 200, 1, true),
    ('Office Chair', 'Furniture', 249.99, 30, 2, true),
    ('Standing Desk', 'Furniture', 599.99, 15, 2, true),
    ('USB-C Cable', 'Electronics', 12.99, 500, 1, true),
    ('Monitor 27"', 'Electronics', 349.99, 75, 3, true),
    ('Desk Lamp', 'Furniture', 45.99, 100, 2, false),
    ('Keyboard Mechanical', 'Electronics', 129.99, 80, 1, true),
    ('Bookshelf', 'Furniture', 179.99, 20, 2, true),
    ('Webcam HD', 'Electronics', 79.99, 60, 3, true);

-- Tasks:
-- 1. Find all active products in the Electronics category
-- 2. List products priced between $50 and $300, sorted by price descending
-- 3. Get products with low stock (quantity < 50) ordered by quantity
-- 4. Find the 5 most expensive products with their names and prices
-- 5. List all categories (unique values) sorted alphabetically
-- 6. Create a view showing product name, price, and calculated tax (8%)
-- 7. Find inactive products or products out of stock (quantity = 0)
-- 8. Get furniture products with stock > 20, show name and quantity
```

### Exercise 3: Customer Order Analysis

```sql
-- Create sample data
CREATE TABLE customers (
    customer_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    city VARCHAR(50),
    state VARCHAR(2),
    signup_date DATE DEFAULT CURRENT_DATE
);

CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(customer_id),
    order_date DATE DEFAULT CURRENT_DATE,
    total_amount NUMERIC(10, 2),
    status VARCHAR(20)
);

INSERT INTO customers (name, email, city, state, signup_date)
VALUES
    ('Alice Johnson', 'alice@example.com', 'New York', 'NY', '2023-01-15'),
    ('Bob Smith', 'bob@example.com', 'Los Angeles', 'CA', '2023-02-20'),
    ('Carol White', 'carol@example.com', 'Chicago', 'IL', '2023-03-10'),
    ('David Brown', 'david@example.com', 'New York', 'NY', '2023-04-05'),
    ('Eve Davis', 'eve@example.com', 'Houston', 'TX', '2023-05-12');

INSERT INTO orders (customer_id, order_date, total_amount, status)
VALUES
    (1, '2023-06-01', 150.00, 'completed'),
    (1, '2023-07-15', 200.00, 'completed'),
    (2, '2023-06-10', 75.00, 'completed'),
    (2, '2023-08-20', 300.00, 'pending'),
    (3, '2023-07-01', 125.00, 'completed'),
    (4, '2023-08-05', 450.00, 'shipped'),
    (5, '2023-08-10', 95.00, 'completed');

-- Tasks:
-- 1. Find all customers from New York, sorted by name
-- 2. List all completed orders over $100, show order_id and total_amount
-- 3. Get the 3 most recent orders regardless of status
-- 4. Find customers who signed up in 2023 Q2 (April-June)
-- 5. List orders with status 'pending' or 'shipped', sorted by order_date
-- 6. Create a table of high-value orders (> $200) with customer IDs
-- 7. Find customers from CA or TX who signed up after March 1, 2023
-- 8. Get orders from page 2 (rows 4-6) sorted by total_amount descending
```

## Summary

SELECT is the foundation of data retrieval in SQL. Key takeaways:

- **Column selection**: Choose specific columns, avoid SELECT * in production
- **Aliases**: Improve readability with meaningful names
- **DISTINCT**: Remove duplicates when needed
- **WHERE**: Filter data efficiently at the database level
- **Logical operators**: Combine conditions with AND, OR, NOT
- **ORDER BY**: Control result ordering, handle NULLs explicitly
- **LIMIT/OFFSET**: Implement pagination and limit result sets
- **FETCH FIRST**: SQL standard alternative for portability

Understanding these SELECT fundamentals is essential for effective database querying and forms the basis for more advanced operations.

## Related Topics

- [INSERT Operations](./01-insert.md) - Adding data to query
- [Filtering Operators](./04-filtering-operators.md) - Advanced WHERE conditions
- [UPDATE and DELETE](./03-update-delete.md) - Modifying queried data
- [Joins](../05-joins-subqueries/01-joins.md) - Querying multiple tables
- [Aggregate Functions](../05-joins-subqueries/03-aggregation.md) - Summarizing data
