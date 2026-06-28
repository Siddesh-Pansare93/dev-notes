# Set Operations in PostgreSQL

## Table of Contents
- [Theory](#theory)
- [Syntax](#syntax)
- [Examples](#examples)
- [Common Mistakes](#common-mistakes)
- [Best Practices](#best-practices)
- [Practice Exercises](#practice-exercises)

## Theory

### What are Set Operations?

Set operations combine the results of two or more SELECT statements into a single result set. They treat query results as mathematical sets, performing operations like union, intersection, and difference.

### Types of Set Operations

1. **UNION**: Combines results, removing duplicates
2. **UNION ALL**: Combines results, keeping duplicates (faster)
3. **INTERSECT**: Returns only rows present in both result sets
4. **EXCEPT**: Returns rows from first query not in second query

### Visual Representation

```
Query A Results    Query B Results
┌────────────┐    ┌────────────┐
│  1, 'a'    │    │  2, 'b'    │
│  2, 'b'    │    │  3, 'c'    │
│  3, 'c'    │    │  4, 'd'    │
└────────────┘    └────────────┘

UNION (remove duplicates):
Result: (1,'a'), (2,'b'), (3,'c'), (4,'d')

UNION ALL (keep duplicates):
Result: (1,'a'), (2,'b'), (3,'c'), (2,'b'), (3,'c'), (4,'d')

INTERSECT (common rows):
Result: (2,'b'), (3,'c')

EXCEPT (in A but not B):
Result: (1,'a')
```

### Column Matching Rules

1. **Same number of columns**: Both queries must return same column count
2. **Compatible data types**: Corresponding columns must have compatible types
3. **Column names**: Taken from first query
4. **Order matters**: Columns matched by position, not name

### Performance Characteristics

- **UNION**: Requires sorting/hashing to remove duplicates (slower)
- **UNION ALL**: No duplicate removal (faster, preferred when duplicates OK)
- **INTERSECT**: Similar performance to UNION
- **EXCEPT**: Similar performance to UNION
- Large result sets benefit from indexes on involved columns

### When to Use Set Operations

**Use Set Operations When:**
- Combining similar data from different tables
- Finding differences between datasets
- Merging results from complex queries
- Data analysis and reporting

**Use Joins Instead When:**
- Need columns from multiple tables in same row
- Relationships between tables are important
- Performance is critical (joins usually faster)

## Syntax

### UNION

```sql
-- Remove duplicates
SELECT columns FROM table1
UNION
SELECT columns FROM table2;
```

### UNION ALL

```sql
-- Keep duplicates (faster)
SELECT columns FROM table1
UNION ALL
SELECT columns FROM table2;
```

### INTERSECT

```sql
-- Only rows in both
SELECT columns FROM table1
INTERSECT
SELECT columns FROM table2;
```

### EXCEPT

```sql
-- Rows in first but not second
SELECT columns FROM table1
EXCEPT
SELECT columns FROM table2;
```

### ORDER BY with Set Operations

```sql
-- ORDER BY applies to entire result
SELECT columns FROM table1
UNION
SELECT columns FROM table2
ORDER BY column_name;

-- Cannot order individual queries (use subquery if needed)
```

### Multiple Set Operations

```sql
-- Parentheses for clarity (evaluated left to right)
SELECT columns FROM table1
UNION
SELECT columns FROM table2
INTERSECT
SELECT columns FROM table3;

-- Explicit grouping
(SELECT columns FROM table1 UNION SELECT columns FROM table2)
INTERSECT
SELECT columns FROM table3;
```

### WITH ORDINALITY

```sql
-- Add row numbers to set operation result
SELECT * FROM (
    SELECT name FROM table1
    UNION ALL
    SELECT name FROM table2
) AS combined WITH ORDINALITY;
```

## Examples

### Setup Tables

```sql
-- Create sample tables for demonstrations
CREATE TABLE current_employees (
    employee_id INTEGER PRIMARY KEY,
    employee_name VARCHAR(100),
    department VARCHAR(50),
    email VARCHAR(100),
    hire_date DATE
);

CREATE TABLE former_employees (
    employee_id INTEGER PRIMARY KEY,
    employee_name VARCHAR(100),
    department VARCHAR(50),
    email VARCHAR(100),
    termination_date DATE
);

CREATE TABLE contractors (
    contractor_id INTEGER PRIMARY KEY,
    contractor_name VARCHAR(100),
    department VARCHAR(50),
    email VARCHAR(100),
    contract_start DATE
);

CREATE TABLE remote_workers (
    worker_id INTEGER PRIMARY KEY,
    worker_name VARCHAR(100),
    department VARCHAR(50),
    email VARCHAR(100),
    location VARCHAR(100)
);

-- Insert sample data
INSERT INTO current_employees VALUES
    (1, 'Alice Johnson', 'Engineering', 'alice@company.com', '2020-01-15'),
    (2, 'Bob Smith', 'Engineering', 'bob@company.com', '2020-03-20'),
    (3, 'Carol White', 'Marketing', 'carol@company.com', '2021-02-10'),
    (4, 'David Brown', 'Engineering', 'david@company.com', '2021-06-01'),
    (5, 'Eve Davis', 'Marketing', 'eve@company.com', '2022-01-15');

INSERT INTO former_employees VALUES
    (101, 'Frank Miller', 'Sales', 'frank@company.com', '2023-12-31'),
    (102, 'Grace Lee', 'Engineering', 'grace@company.com', '2023-11-30'),
    (103, 'Henry Wilson', 'Marketing', 'henry@company.com', '2023-10-15');

INSERT INTO contractors VALUES
    (201, 'Bob Smith', 'Engineering', 'bob@company.com', '2023-01-01'),
    (202, 'Ivy Chen', 'Design', 'ivy@contractor.com', '2023-06-01'),
    (203, 'Jack Davis', 'Engineering', 'jack@contractor.com', '2023-09-01');

INSERT INTO remote_workers VALUES
    (301, 'Alice Johnson', 'Engineering', 'alice@company.com', 'Remote-US'),
    (302, 'Carol White', 'Marketing', 'carol@company.com', 'Remote-EU'),
    (303, 'Kelly Brown', 'Sales', 'kelly@company.com', 'Remote-APAC');

-- Additional tables for examples
CREATE TABLE sales_q1_2024 (
    sale_id INTEGER,
    product_name VARCHAR(100),
    amount NUMERIC(10, 2),
    customer_id INTEGER
);

CREATE TABLE sales_q2_2024 (
    sale_id INTEGER,
    product_name VARCHAR(100),
    amount NUMERIC(10, 2),
    customer_id INTEGER
);

INSERT INTO sales_q1_2024 VALUES
    (1, 'Widget A', 1000.00, 101),
    (2, 'Widget B', 1500.00, 102),
    (3, 'Widget A', 2000.00, 103),
    (4, 'Gadget X', 3000.00, 101);

INSERT INTO sales_q2_2024 VALUES
    (5, 'Widget A', 1200.00, 104),
    (6, 'Widget B', 1800.00, 102),
    (7, 'Gadget Y', 2500.00, 105),
    (8, 'Widget A', 2200.00, 103);
```

### Example 1: UNION - Combine All Employees

```sql
-- Get complete list of all people (current, former, contractors)
SELECT
    employee_id as id,
    employee_name as name,
    department,
    email,
    'Current Employee' as status
FROM current_employees

UNION

SELECT
    employee_id,
    employee_name,
    department,
    email,
    'Former Employee'
FROM former_employees

UNION

SELECT
    contractor_id,
    contractor_name,
    department,
    email,
    'Contractor'
FROM contractors

ORDER BY name;

/*
Result (duplicates removed):
id  | name          | department  | email              | status
----+---------------+-------------+--------------------+-----------------
1   | Alice Johnson | Engineering | alice@company.com  | Current Employee
2   | Bob Smith     | Engineering | bob@company.com    | Current Employee
3   | Carol White   | Marketing   | carol@company.com  | Current Employee
4   | David Brown   | Engineering | david@company.com  | Current Employee
5   | Eve Davis     | Marketing   | eve@company.com    | Current Employee
101 | Frank Miller  | Sales       | frank@company.com  | Former Employee
102 | Grace Lee     | Engineering | grace@company.com  | Former Employee
103 | Henry Wilson  | Marketing   | henry@company.com  | Former Employee
202 | Ivy Chen      | Design      | ivy@contractor.com | Contractor
203 | Jack Davis    | Engineering | jack@contractor.com| Contractor

Note: Bob Smith appears once despite being in both tables (UNION removes duplicates)
*/
```

### Example 2: UNION ALL - Keep Duplicates

```sql
-- Show all records including duplicates (Bob Smith in both tables)
SELECT
    employee_name as name,
    department,
    'Current' as source
FROM current_employees

UNION ALL

SELECT
    contractor_name,
    department,
    'Contractor'
FROM contractors

ORDER BY name, source;

/*
Result (duplicates kept):
name          | department  | source
--------------+-------------+-----------
Alice Johnson | Engineering | Current
Bob Smith     | Engineering | Contractor
Bob Smith     | Engineering | Current      -- Duplicate kept
Carol White   | Marketing   | Current
David Brown   | Engineering | Current
Eve Davis     | Marketing   | Current
Ivy Chen      | Design      | Contractor
Jack Davis    | Engineering | Contractor

Bob Smith appears twice (once as employee, once as contractor)
*/
```

### Example 3: INTERSECT - Find Common Elements

```sql
-- Find people who are both current employees AND remote workers
SELECT employee_name, email
FROM current_employees

INTERSECT

SELECT worker_name, email
FROM remote_workers

ORDER BY employee_name;

/*
Result: Only those in both tables
employee_name | email
--------------+-------------------
Alice Johnson | alice@company.com
Carol White   | carol@company.com
*/
```

### Example 4: EXCEPT - Find Differences

```sql
-- Find current employees who are NOT remote workers
SELECT
    employee_name,
    email,
    department
FROM current_employees

EXCEPT

SELECT
    worker_name,
    email,
    department
FROM remote_workers

ORDER BY employee_name;

/*
Result: Employees not in remote_workers table
employee_name | email              | department
--------------+--------------------+------------
Bob Smith     | bob@company.com    | Engineering
David Brown   | david@company.com  | Engineering
Eve Davis     | eve@company.com    | Marketing
*/

-- Reverse: Remote workers not in current employees
SELECT worker_name, email, department
FROM remote_workers

EXCEPT

SELECT employee_name, email, department
FROM current_employees

ORDER BY worker_name;

/*
Result:
worker_name  | email             | department
-------------+-------------------+-----------
Kelly Brown  | kelly@company.com | Sales
*/
```

### Example 5: Column Count Must Match

```sql
-- WRONG: Different column counts
SELECT employee_name, email
FROM current_employees
UNION
SELECT employee_name, email, department
FROM former_employees;
-- ERROR: each UNION query must have the same number of columns

-- CORRECT: Same column count
SELECT employee_name, email, department
FROM current_employees
UNION
SELECT employee_name, email, department
FROM former_employees;

-- Or use NULL for missing columns
SELECT employee_name, email, NULL as hire_date
FROM former_employees
UNION
SELECT employee_name, email, hire_date
FROM current_employees;
```

### Example 6: Data Type Compatibility

```sql
-- Types must be compatible (PostgreSQL coerces when possible)
SELECT
    employee_id::TEXT as id,  -- Convert to text
    employee_name
FROM current_employees

UNION

SELECT
    'C-' || contractor_id::TEXT,  -- Format as text
    contractor_name
FROM contractors

ORDER BY id;

/*
Result:
id   | employee_name
-----+---------------
1    | Alice Johnson
2    | Bob Smith
3    | Carol White
4    | David Brown
5    | Eve Davis
C-201| Bob Smith
C-202| Ivy Chen
C-203| Jack Davis
*/
```

### Example 7: Combining Aggregated Results

```sql
-- Compare sales across quarters
SELECT
    'Q1 2024' as quarter,
    COUNT(*) as total_sales,
    SUM(amount) as total_revenue,
    AVG(amount) as avg_sale
FROM sales_q1_2024

UNION ALL

SELECT
    'Q2 2024',
    COUNT(*),
    SUM(amount),
    AVG(amount)
FROM sales_q2_2024

ORDER BY quarter;

/*
Result:
quarter  | total_sales | total_revenue | avg_sale
---------+-------------+---------------+----------
Q1 2024  | 4           | 7500.00       | 1875.00
Q2 2024  | 4           | 7700.00       | 1925.00
*/
```

### Example 8: Finding Unique to Each Set

```sql
-- Products sold in Q1 but not Q2
SELECT DISTINCT product_name
FROM sales_q1_2024

EXCEPT

SELECT DISTINCT product_name
FROM sales_q2_2024

ORDER BY product_name;

/*
Result:
product_name
------------
Gadget X
*/

-- Products sold in Q2 but not Q1
SELECT DISTINCT product_name
FROM sales_q2_2024

EXCEPT

SELECT DISTINCT product_name
FROM sales_q1_2024

ORDER BY product_name;

/*
Result:
product_name
------------
Gadget Y
*/

-- Products sold in both quarters
SELECT DISTINCT product_name
FROM sales_q1_2024

INTERSECT

SELECT DISTINCT product_name
FROM sales_q2_2024

ORDER BY product_name;

/*
Result:
product_name
------------
Widget A
Widget B
*/
```

### Example 9: Complex Set Operations

```sql
-- Find departments with current employees OR contractors, but NOT remote workers
(
    SELECT department FROM current_employees
    UNION
    SELECT department FROM contractors
)
EXCEPT
SELECT department FROM remote_workers

ORDER BY department;

/*
Result:
department
-----------
Design
(Engineering and Marketing excluded - they have remote workers)
*/
```

### Example 10: ORDER BY with Set Operations

```sql
-- ORDER BY uses column names from first query
SELECT
    employee_name as full_name,
    department as dept,
    hire_date as start_date
FROM current_employees

UNION ALL

SELECT
    contractor_name,
    department,
    contract_start
FROM contractors

ORDER BY start_date DESC, full_name;

/*
Result: Ordered by start_date from combined results
full_name     | dept        | start_date
--------------+-------------+------------
Jack Davis    | Engineering | 2023-09-01
Ivy Chen      | Design      | 2023-06-01
Bob Smith     | Engineering | 2023-01-01
Eve Davis     | Marketing   | 2022-01-15
David Brown   | Engineering | 2021-06-01
...
*/
```

### Example 11: Using Set Operations for Data Quality

```sql
-- Find email addresses that appear in multiple tables (potential duplicates)
SELECT email, COUNT(*) as occurrence_count
FROM (
    SELECT email FROM current_employees
    UNION ALL
    SELECT email FROM contractors
    UNION ALL
    SELECT email FROM remote_workers
) all_emails
GROUP BY email
HAVING COUNT(*) > 1
ORDER BY occurrence_count DESC;

/*
Result:
email              | occurrence_count
-------------------+-----------------
alice@company.com  | 2
carol@company.com  | 2
bob@company.com    | 2
*/
```

### Example 12: Symmetric Difference (XOR)

```sql
-- Find rows unique to either table (not in both)
-- (A UNION B) EXCEPT (A INTERSECT B)
(
    SELECT employee_name, email FROM current_employees
    UNION
    SELECT worker_name, email FROM remote_workers
)
EXCEPT
(
    SELECT employee_name, email FROM current_employees
    INTERSECT
    SELECT worker_name, email FROM remote_workers
)
ORDER BY employee_name;

/*
Result: People in only one table
employee_name | email
--------------+-------------------
Bob Smith     | bob@company.com
David Brown   | david@company.com
Eve Davis     | eve@company.com
Kelly Brown   | kelly@company.com
*/
```

### Example 13: Combining with CTEs

```sql
-- More readable complex set operations with CTEs
WITH
    all_engineering AS (
        SELECT employee_name as name, 'Employee' as type
        FROM current_employees
        WHERE department = 'Engineering'

        UNION ALL

        SELECT contractor_name, 'Contractor'
        FROM contractors
        WHERE department = 'Engineering'
    ),
    remote_engineering AS (
        SELECT worker_name as name
        FROM remote_workers
        WHERE department = 'Engineering'
    )
SELECT
    ae.name,
    ae.type,
    CASE
        WHEN re.name IS NOT NULL THEN 'Yes'
        ELSE 'No'
    END as is_remote
FROM all_engineering ae
LEFT JOIN remote_engineering re ON ae.name = re.name
ORDER BY ae.type, ae.name;

/*
Result:
name          | type       | is_remote
--------------+------------+----------
Bob Smith     | Contractor | No
Alice Johnson | Employee   | Yes
Bob Smith     | Employee   | No
David Brown   | Employee   | No
Jack Davis    | Contractor | No
*/
```

### Example 14: Set Operations in Subqueries

```sql
-- Use set operation result as subquery
SELECT
    dept_name,
    emp_count
FROM (
    SELECT department as dept_name, COUNT(*) as emp_count
    FROM (
        SELECT department FROM current_employees
        UNION ALL
        SELECT department FROM contractors
    ) all_workers
    GROUP BY department
) dept_counts
WHERE emp_count >= 2
ORDER BY emp_count DESC;

/*
Result:
dept_name   | emp_count
------------+----------
Engineering | 5
Marketing   | 2
*/
```

## Common Mistakes

### 1. Forgetting Column Compatibility

```sql
-- WRONG: Column count mismatch
SELECT employee_name, email
FROM current_employees
UNION
SELECT employee_id, employee_name, email
FROM former_employees;
-- ERROR: each UNION query must have the same number of columns

-- CORRECT: Match column counts
SELECT employee_name, email
FROM current_employees
UNION
SELECT employee_name, email
FROM former_employees;
```

### 2. Using UNION When UNION ALL is Sufficient

```sql
-- INEFFICIENT: UNION removes duplicates (expensive)
SELECT department FROM current_employees
UNION
SELECT department FROM contractors;

-- EFFICIENT: Use UNION ALL if duplicates are OK or impossible
SELECT DISTINCT department FROM (
    SELECT department FROM current_employees
    UNION ALL
    SELECT department FROM contractors
) all_depts;
```

### 3. Incorrect ORDER BY Column References

```sql
-- WRONG: Referencing second query's column name
SELECT employee_name as name FROM current_employees
UNION
SELECT worker_name FROM remote_workers
ORDER BY worker_name;
-- ERROR: column "worker_name" does not exist

-- CORRECT: Use first query's column names
SELECT employee_name as name FROM current_employees
UNION
SELECT worker_name FROM remote_workers
ORDER BY name;
```

### 4. Expecting Specific Row Order Without ORDER BY

```sql
-- WRONG: Assuming result order
SELECT * FROM current_employees
UNION ALL
SELECT * FROM former_employees;
-- No guaranteed order!

-- CORRECT: Always use ORDER BY for specific order
SELECT * FROM current_employees
UNION ALL
SELECT * FROM former_employees
ORDER BY employee_id;
```

### 5. Not Handling NULL Values Properly

```sql
-- May produce unexpected results with NULLs
SELECT department FROM current_employees
INTERSECT
SELECT department FROM contractors;
-- NULLs are treated as equal in set operations

-- Be explicit if needed
SELECT department FROM current_employees WHERE department IS NOT NULL
INTERSECT
SELECT department FROM contractors WHERE department IS NOT NULL;
```

## Best Practices

### 1. Use UNION ALL When Duplicates Don't Matter

```sql
-- PREFER: UNION ALL (faster, no duplicate check)
SELECT employee_name FROM current_employees
UNION ALL
SELECT contractor_name FROM contractors;

-- AVOID: UNION unless duplicates must be removed
SELECT employee_name FROM current_employees
UNION
SELECT contractor_name FROM contractors;
```

### 2. Make Column Names Consistent

```sql
-- Use descriptive aliases in first query
SELECT
    employee_id as id,
    employee_name as name,
    'Current' as status
FROM current_employees

UNION ALL

SELECT
    contractor_id,
    contractor_name,
    'Contractor'
FROM contractors;
```

### 3. Add Source Indicators

```sql
-- Add column to identify data source
SELECT
    employee_name,
    department,
    'current_employees' as source_table
FROM current_employees

UNION ALL

SELECT
    contractor_name,
    department,
    'contractors'
FROM contractors;
```

### 4. Use Parentheses for Complex Operations

```sql
-- Clear grouping with parentheses
(SELECT email FROM current_employees
 UNION
 SELECT email FROM contractors)
EXCEPT
SELECT email FROM remote_workers;
```

### 5. Consider Performance with Large Datasets

```sql
-- Use indexes on columns involved in set operations
CREATE INDEX idx_current_emp_email ON current_employees(email);
CREATE INDEX idx_contractors_email ON contractors(email);

-- Filter before combining to reduce dataset size
SELECT email FROM current_employees WHERE department = 'Engineering'
UNION
SELECT email FROM contractors WHERE department = 'Engineering';
```

### 6. Use CTEs for Readability

```sql
-- Complex set operations are clearer with CTEs
WITH
    current_eng AS (
        SELECT * FROM current_employees WHERE department = 'Engineering'
    ),
    contractor_eng AS (
        SELECT * FROM contractors WHERE department = 'Engineering'
    )
SELECT employee_name as name FROM current_eng
UNION ALL
SELECT contractor_name FROM contractor_eng;
```

## Practice Exercises

### Exercise 1: Complete Personnel Report

Create a comprehensive report that shows all people associated with the company (current employees, former employees, contractors, and remote workers). Include columns for: name, type (employee/contractor/former/remote), department, and contact email. Order by type and name. Ensure no duplicates.

<details>
<summary>Solution</summary>

```sql
SELECT
    employee_name as name,
    'Current Employee' as person_type,
    department,
    email
FROM current_employees

UNION

SELECT
    employee_name,
    'Former Employee',
    department,
    email
FROM former_employees

UNION

SELECT
    contractor_name,
    'Contractor',
    department,
    email
FROM contractors

UNION

SELECT
    worker_name,
    'Remote Worker',
    department,
    email
FROM remote_workers

ORDER BY person_type, name;

/*
Result:
name          | person_type       | department  | email
--------------+-------------------+-------------+-------------------
Bob Smith     | Contractor        | Engineering | bob@company.com
Ivy Chen      | Contractor        | Design      | ivy@contractor.com
Jack Davis    | Contractor        | Engineering | jack@contractor.com
Alice Johnson | Current Employee  | Engineering | alice@company.com
Bob Smith     | Current Employee  | Engineering | bob@company.com
Carol White   | Current Employee  | Marketing   | carol@company.com
David Brown   | Current Employee  | Engineering | david@company.com
Eve Davis     | Current Employee  | Marketing   | eve@company.com
...
*/
```
</details>

### Exercise 2: Quarter-over-Quarter Product Analysis

Using the sales tables, create a report showing:
- Products sold only in Q1
- Products sold only in Q2
- Products sold in both quarters
- For products in both, show total sales and revenue for each quarter

Use set operations and label each category clearly.

<details>
<summary>Solution</summary>

```sql
-- Products only in Q1
SELECT
    'Q1 Only' as category,
    product_name,
    COUNT(*) as sales_count,
    SUM(amount) as revenue
FROM sales_q1_2024
WHERE product_name IN (
    SELECT product_name FROM sales_q1_2024
    EXCEPT
    SELECT product_name FROM sales_q2_2024
)
GROUP BY product_name

UNION ALL

-- Products only in Q2
SELECT
    'Q2 Only',
    product_name,
    COUNT(*),
    SUM(amount)
FROM sales_q2_2024
WHERE product_name IN (
    SELECT product_name FROM sales_q2_2024
    EXCEPT
    SELECT product_name FROM sales_q1_2024
)
GROUP BY product_name

UNION ALL

-- Products in both - Q1
SELECT
    'Both (Q1)',
    product_name,
    COUNT(*),
    SUM(amount)
FROM sales_q1_2024
WHERE product_name IN (
    SELECT product_name FROM sales_q1_2024
    INTERSECT
    SELECT product_name FROM sales_q2_2024
)
GROUP BY product_name

UNION ALL

-- Products in both - Q2
SELECT
    'Both (Q2)',
    product_name,
    COUNT(*),
    SUM(amount)
FROM sales_q2_2024
WHERE product_name IN (
    SELECT product_name FROM sales_q1_2024
    INTERSECT
    SELECT product_name FROM sales_q2_2024
)
GROUP BY product_name

ORDER BY category, product_name;

/*
Result:
category   | product_name | sales_count | revenue
-----------+--------------+-------------+---------
Both (Q1)  | Widget A     | 2           | 3000.00
Both (Q1)  | Widget B     | 1           | 1500.00
Both (Q2)  | Widget A     | 2           | 3400.00
Both (Q2)  | Widget B     | 1           | 1800.00
Q1 Only    | Gadget X     | 1           | 3000.00
Q2 Only    | Gadget Y     | 1           | 2500.00
*/
```
</details>

### Exercise 3: Department Coverage Analysis

Write a query that identifies which departments have presence in each category (current employees, contractors, remote workers). Show department name and indicate presence with 'Yes'/'No' for each category. Use set operations to find unique departments first.

<details>
<summary>Solution</summary>

```sql
WITH all_departments AS (
    SELECT DISTINCT department FROM current_employees
    UNION
    SELECT DISTINCT department FROM contractors
    UNION
    SELECT DISTINCT department FROM remote_workers
)
SELECT
    ad.department,
    CASE WHEN EXISTS (
        SELECT 1 FROM current_employees ce WHERE ce.department = ad.department
    ) THEN 'Yes' ELSE 'No' END as has_employees,
    CASE WHEN EXISTS (
        SELECT 1 FROM contractors c WHERE c.department = ad.department
    ) THEN 'Yes' ELSE 'No' END as has_contractors,
    CASE WHEN EXISTS (
        SELECT 1 FROM remote_workers rw WHERE rw.department = ad.department
    ) THEN 'Yes' ELSE 'No' END as has_remote
FROM all_departments ad
ORDER BY ad.department;

/*
Result:
department  | has_employees | has_contractors | has_remote
------------+---------------+-----------------+-----------
Design      | No            | Yes             | No
Engineering | Yes           | Yes             | Yes
Marketing   | Yes           | No              | Yes
Sales       | No            | No              | Yes
*/
```
</details>

## Related Topics

- [Joins](./01-joins.md) - Combining tables horizontally
- [Subqueries](./02-subqueries.md) - Nested queries
- [Common Table Expressions](../06-advanced-sql/01-ctes.md) - Readable complex queries
- [Window Functions](../06-advanced-sql/02-window-functions.md) - Advanced analytics

## Additional Resources

- [PostgreSQL Documentation: Set Operations](https://www.postgresql.org/docs/current/queries-union.html)
- [PostgreSQL Documentation: Combining Queries](https://www.postgresql.org/docs/current/typeconv-union-case.html)
- [Set Theory and SQL](https://www.postgresql.org/docs/current/functions-comparison.html)
