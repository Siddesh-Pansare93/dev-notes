# Subqueries in PostgreSQL

## Table of Contents
- [Theory](#theory)
- [Syntax](#syntax)
- [Examples](#examples)
- [Common Mistakes](#common-mistakes)
- [Best Practices](#best-practices)
- [Practice Exercises](#practice-exercises)

## Theory

### What are Subqueries?

A subquery is a query nested inside another query. Subqueries can appear in SELECT, FROM, WHERE, and HAVING clauses. They provide a way to perform multi-step operations in a single SQL statement.

### Types of Subqueries

1. **Scalar Subqueries**: Return a single value (one row, one column)
2. **Row Subqueries**: Return a single row with multiple columns
3. **Table Subqueries**: Return multiple rows and columns (also called derived tables)
4. **Correlated Subqueries**: Reference columns from the outer query
5. **Non-Correlated Subqueries**: Independent of outer query

### Subquery Locations

- **SELECT clause**: Scalar subqueries for computed columns
- **FROM clause**: Table subqueries as derived tables
- **WHERE clause**: Filter based on subquery results (IN, EXISTS, ANY, ALL)
- **HAVING clause**: Filter grouped results

### Performance Considerations

- **EXISTS vs IN**: EXISTS often faster for correlated subqueries
- **JOIN vs Subquery**: Joins typically faster, but subqueries more readable
- **Materialization**: PostgreSQL may materialize subqueries or inline them
- **Correlated Subqueries**: Execute once per outer row (can be slow)

### When to Use Subqueries vs Joins

**Use Subqueries When:**
- Checking existence (EXISTS)
- Need aggregates from related tables
- Logic is clearer with nested approach
- Need to filter before joining

**Use Joins When:**
- Returning columns from multiple tables
- Performance is critical
- Relationship is straightforward
- Need to avoid repeated execution

## Syntax

### Scalar Subquery (Single Value)

```sql
SELECT column,
       (SELECT aggregate FROM table2 WHERE condition) as computed
FROM table1;
```

### Row Subquery

```sql
SELECT *
FROM table1
WHERE (column1, column2) = (SELECT col1, col2 FROM table2 WHERE condition);
```

### Table Subquery in FROM (Derived Table)

```sql
SELECT columns
FROM (
    SELECT columns FROM table WHERE condition
) AS subquery_alias
WHERE subquery_condition;
```

### Subquery with IN

```sql
SELECT columns
FROM table
WHERE column IN (SELECT column FROM other_table WHERE condition);
```

### Subquery with EXISTS

```sql
SELECT columns
FROM table t1
WHERE EXISTS (
    SELECT 1 FROM other_table t2
    WHERE t2.foreign_key = t1.primary_key
    AND t2.condition
);
```

### Subquery with NOT EXISTS

```sql
SELECT columns
FROM table t1
WHERE NOT EXISTS (
    SELECT 1 FROM other_table t2
    WHERE t2.foreign_key = t1.primary_key
);
```

### Subquery with ANY/SOME

```sql
SELECT columns
FROM table
WHERE column > ANY (SELECT column FROM other_table);
-- TRUE if condition is true for at least one value
```

### Subquery with ALL

```sql
SELECT columns
FROM table
WHERE column > ALL (SELECT column FROM other_table);
-- TRUE if condition is true for all values
```

### Correlated Subquery

```sql
SELECT t1.column,
       (SELECT COUNT(*) FROM table2 t2
        WHERE t2.foreign_key = t1.primary_key) as count
FROM table1 t1;
```

## Examples

### Setup Tables

```sql
-- Use same tables from joins lesson
CREATE TABLE departments (
    department_id SERIAL PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL,
    location VARCHAR(100)
);

CREATE TABLE employees (
    employee_id SERIAL PRIMARY KEY,
    employee_name VARCHAR(100) NOT NULL,
    department_id INTEGER REFERENCES departments(department_id),
    manager_id INTEGER REFERENCES employees(employee_id),
    salary NUMERIC(10, 2),
    hire_date DATE
);

CREATE TABLE projects (
    project_id SERIAL PRIMARY KEY,
    project_name VARCHAR(100) NOT NULL,
    budget NUMERIC(12, 2)
);

CREATE TABLE employee_projects (
    employee_id INTEGER REFERENCES employees(employee_id),
    project_id INTEGER REFERENCES projects(project_id),
    role VARCHAR(50),
    hours_allocated INTEGER,
    PRIMARY KEY (employee_id, project_id)
);

-- Insert sample data
INSERT INTO departments (department_name, location) VALUES
    ('Engineering', 'San Francisco'),
    ('Marketing', 'New York'),
    ('Sales', 'Chicago'),
    ('HR', 'San Francisco'),
    ('Finance', 'New York');

INSERT INTO employees (employee_name, department_id, manager_id, salary, hire_date) VALUES
    ('Alice Johnson', 1, NULL, 150000, '2020-01-15'),
    ('Bob Smith', 1, 1, 120000, '2020-03-20'),
    ('Carol White', 2, 1, 95000, '2021-02-10'),
    ('David Brown', 1, 2, 105000, '2021-06-01'),
    ('Eve Davis', 2, 3, 85000, '2022-01-15'),
    ('Frank Miller', 3, 1, 90000, '2020-08-10'),
    ('Grace Lee', NULL, NULL, 80000, '2023-03-01');

INSERT INTO projects (project_name, budget) VALUES
    ('Website Redesign', 500000),
    ('Mobile App', 750000),
    ('Data Migration', 300000),
    ('Marketing Campaign', 200000);

INSERT INTO employee_projects (employee_id, project_id, role, hours_allocated) VALUES
    (1, 1, 'Lead', 160),
    (2, 1, 'Developer', 320),
    (2, 2, 'Developer', 160),
    (4, 2, 'Developer', 320),
    (3, 4, 'Manager', 120),
    (5, 4, 'Coordinator', 200);
```

### Example 1: Scalar Subquery - Compare to Average

```sql
-- Show employees earning more than department average
SELECT
    employee_name,
    salary,
    (SELECT AVG(salary) FROM employees) as company_avg,
    salary - (SELECT AVG(salary) FROM employees) as diff_from_avg
FROM employees
WHERE salary > (SELECT AVG(salary) FROM employees)
ORDER BY salary DESC;

/*
Result:
employee_name  | salary    | company_avg      | diff_from_avg
---------------+-----------+------------------+---------------
Alice Johnson  | 150000.00 | 103571.428571... | 46428.571428...
Bob Smith      | 120000.00 | 103571.428571... | 16428.571428...
David Brown    | 105000.00 | 103571.428571... | 1428.571428...
*/
```

### Example 2: Scalar Subquery in SELECT - Correlated

```sql
-- Show each employee with count of direct reports
SELECT
    e.employee_name,
    e.salary,
    (SELECT COUNT(*)
     FROM employees subordinates
     WHERE subordinates.manager_id = e.employee_id) as direct_reports
FROM employees e
ORDER BY direct_reports DESC, e.employee_name;

/*
Result:
employee_name  | salary    | direct_reports
---------------+-----------+---------------
Alice Johnson  | 150000.00 | 3
Bob Smith      | 120000.00 | 1
Carol White    | 95000.00  | 1
David Brown    | 105000.00 | 0
Eve Davis      | 85000.00  | 0
Frank Miller   | 90000.00  | 0
Grace Lee      | 80000.00  | 0
*/
```

### Example 3: Subquery with IN - Simple Filter

```sql
-- Find employees working on high-budget projects (> $500k)
SELECT
    employee_name,
    salary,
    department_id
FROM employees
WHERE employee_id IN (
    SELECT employee_id
    FROM employee_projects ep
    JOIN projects p ON ep.project_id = p.project_id
    WHERE p.budget > 500000
)
ORDER BY employee_name;

/*
Result:
employee_name  | salary    | department_id
---------------+-----------+--------------
Alice Johnson  | 150000.00 | 1
Bob Smith      | 120000.00 | 1
David Brown    | 105000.00 | 1
*/
```

### Example 4: Subquery with NOT IN - Find Missing Items

```sql
-- Find employees NOT working on any projects
SELECT
    employee_name,
    salary
FROM employees
WHERE employee_id NOT IN (
    SELECT employee_id
    FROM employee_projects
    WHERE employee_id IS NOT NULL  -- Important: handle NULLs
)
ORDER BY employee_name;

/*
Result:
employee_name  | salary
---------------+---------
Alice Johnson  | 150000.00  -- Wait, Alice IS in a project!
*/

-- PROBLEM: NOT IN with NULLs can give unexpected results
-- Better approach with NOT EXISTS (see Example 5)
```

### Example 5: EXISTS vs IN - Better Performance

```sql
-- Find employees working on projects (EXISTS version)
SELECT
    e.employee_name,
    e.salary
FROM employees e
WHERE EXISTS (
    SELECT 1
    FROM employee_projects ep
    WHERE ep.employee_id = e.employee_id
)
ORDER BY e.employee_name;

/*
Result:
employee_name  | salary
---------------+---------
Alice Johnson  | 150000.00
Bob Smith      | 120000.00
Carol White    | 95000.00
David Brown    | 105000.00
Eve Davis      | 85000.00
*/

-- NOT EXISTS for employees without projects
SELECT
    e.employee_name,
    e.salary
FROM employees e
WHERE NOT EXISTS (
    SELECT 1
    FROM employee_projects ep
    WHERE ep.employee_id = e.employee_id
)
ORDER BY e.employee_name;

/*
Result:
employee_name  | salary
---------------+---------
Frank Miller   | 90000.00
Grace Lee      | 80000.00
*/
```

### Example 6: Subquery in FROM - Derived Table

```sql
-- Find departments with average salary > $100k
SELECT
    d.department_name,
    dept_stats.avg_salary,
    dept_stats.employee_count
FROM departments d
JOIN (
    SELECT
        department_id,
        AVG(salary) as avg_salary,
        COUNT(*) as employee_count
    FROM employees
    WHERE department_id IS NOT NULL
    GROUP BY department_id
) dept_stats ON d.department_id = dept_stats.department_id
WHERE dept_stats.avg_salary > 100000
ORDER BY dept_stats.avg_salary DESC;

/*
Result:
department_name | avg_salary | employee_count
----------------+------------+---------------
Engineering     | 125000.00  | 3
*/
```

### Example 7: Subquery in HAVING - Filter Aggregates

```sql
-- Find departments where average salary > company average
SELECT
    d.department_name,
    AVG(e.salary) as dept_avg_salary,
    COUNT(e.employee_id) as employee_count
FROM departments d
JOIN employees e ON d.department_id = e.department_id
GROUP BY d.department_id, d.department_name
HAVING AVG(e.salary) > (
    SELECT AVG(salary)
    FROM employees
)
ORDER BY dept_avg_salary DESC;

/*
Result:
department_name | dept_avg_salary | employee_count
----------------+-----------------+---------------
Engineering     | 125000.00       | 3
*/
```

### Example 8: Correlated Subquery - Row-by-Row Comparison

```sql
-- Find employees earning more than their department's average
SELECT
    e.employee_name,
    e.salary,
    d.department_name,
    (SELECT AVG(salary)
     FROM employees e2
     WHERE e2.department_id = e.department_id) as dept_avg
FROM employees e
JOIN departments d ON e.department_id = d.department_id
WHERE e.salary > (
    SELECT AVG(salary)
    FROM employees e2
    WHERE e2.department_id = e.department_id
)
ORDER BY d.department_name, e.salary DESC;

/*
Result:
employee_name  | salary    | department_name | dept_avg
---------------+-----------+-----------------+----------
Alice Johnson  | 150000.00 | Engineering     | 125000.00
Bob Smith      | 120000.00 | Engineering     | 125000.00
Carol White    | 95000.00  | Marketing       | 90000.00
*/
```

### Example 9: ANY and ALL Operators

```sql
-- Find employees earning more than ANY marketing employee
SELECT
    employee_name,
    salary,
    department_id
FROM employees
WHERE salary > ANY (
    SELECT salary
    FROM employees
    WHERE department_id = 2  -- Marketing
)
AND department_id != 2
ORDER BY salary DESC;

/*
Result: Employees earning more than at least one Marketing employee
employee_name  | salary    | department_id
---------------+-----------+--------------
Alice Johnson  | 150000.00 | 1
Bob Smith      | 120000.00 | 1
David Brown    | 105000.00 | 1
Frank Miller   | 90000.00  | 3
*/

-- Find employees earning more than ALL marketing employees
SELECT
    employee_name,
    salary,
    department_id
FROM employees
WHERE salary > ALL (
    SELECT salary
    FROM employees
    WHERE department_id = 2  -- Marketing
)
AND department_id != 2
ORDER BY salary DESC;

/*
Result: Employees earning more than every Marketing employee
employee_name  | salary    | department_id
---------------+-----------+--------------
Alice Johnson  | 150000.00 | 1
Bob Smith      | 120000.00 | 1
David Brown    | 105000.00 | 1
*/
```

### Example 10: Multiple Levels of Subqueries

```sql
-- Find projects with budget higher than average budget of projects
-- that have Engineering employees assigned
SELECT
    project_name,
    budget
FROM projects
WHERE budget > (
    SELECT AVG(p2.budget)
    FROM projects p2
    WHERE p2.project_id IN (
        SELECT DISTINCT ep.project_id
        FROM employee_projects ep
        JOIN employees e ON ep.employee_id = e.employee_id
        WHERE e.department_id = 1  -- Engineering
    )
)
ORDER BY budget DESC;

/*
Result:
project_name     | budget
-----------------+-----------
Mobile App       | 750000.00
Website Redesign | 500000.00
(Both are higher than avg of (750000 + 500000) / 2 = 625000)
*/
```

### Example 11: Subquery vs JOIN Performance Comparison

```sql
-- Subquery approach
EXPLAIN ANALYZE
SELECT
    e.employee_name,
    (SELECT d.department_name
     FROM departments d
     WHERE d.department_id = e.department_id) as dept_name
FROM employees e
WHERE e.employee_id IN (
    SELECT employee_id FROM employee_projects
);

-- JOIN approach (usually faster)
EXPLAIN ANALYZE
SELECT DISTINCT
    e.employee_name,
    d.department_name
FROM employees e
JOIN employee_projects ep ON e.employee_id = ep.employee_id
LEFT JOIN departments d ON e.department_id = d.department_id;

-- Compare execution times and plans
```

### Example 12: Rewriting Subquery as JOIN

```sql
-- Subquery version (less efficient)
SELECT
    p.project_name,
    p.budget
FROM projects p
WHERE p.project_id IN (
    SELECT ep.project_id
    FROM employee_projects ep
    JOIN employees e ON ep.employee_id = e.employee_id
    WHERE e.department_id = 1
);

-- JOIN version (more efficient)
SELECT DISTINCT
    p.project_name,
    p.budget
FROM projects p
JOIN employee_projects ep ON p.project_id = ep.project_id
JOIN employees e ON ep.employee_id = e.employee_id
WHERE e.department_id = 1;

/*
Both return same result:
project_name     | budget
-----------------+-----------
Mobile App       | 750000.00
Website Redesign | 500000.00
*/
```

### Example 13: Common Table Expression (CTE) Alternative

```sql
-- Complex subquery
SELECT
    e.employee_name,
    e.salary,
    dept_avg.avg_salary as dept_average
FROM employees e
JOIN (
    SELECT department_id, AVG(salary) as avg_salary
    FROM employees
    GROUP BY department_id
) dept_avg ON e.department_id = dept_avg.department_id
WHERE e.salary > dept_avg.avg_salary;

-- Same logic with CTE (more readable)
WITH dept_averages AS (
    SELECT
        department_id,
        AVG(salary) as avg_salary
    FROM employees
    GROUP BY department_id
)
SELECT
    e.employee_name,
    e.salary,
    da.avg_salary as dept_average
FROM employees e
JOIN dept_averages da ON e.department_id = da.department_id
WHERE e.salary > da.avg_salary;

/*
Result:
employee_name  | salary    | dept_average
---------------+-----------+--------------
Alice Johnson  | 150000.00 | 125000.00
Carol White    | 95000.00  | 90000.00
*/
```

### Example 14: Subquery with Window Function Alternative

```sql
-- Correlated subquery to find rank
SELECT
    e.employee_name,
    e.salary,
    (SELECT COUNT(*)
     FROM employees e2
     WHERE e2.department_id = e.department_id
     AND e2.salary >= e.salary) as salary_rank
FROM employees e
WHERE e.department_id IS NOT NULL
ORDER BY e.department_id, salary_rank;

-- Window function alternative (better performance)
SELECT
    employee_name,
    salary,
    RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) as salary_rank
FROM employees
WHERE department_id IS NOT NULL
ORDER BY department_id, salary_rank;

/*
Result:
employee_name  | salary    | salary_rank
---------------+-----------+------------
Alice Johnson  | 150000.00 | 1
Bob Smith      | 120000.00 | 2
David Brown    | 105000.00 | 3
Carol White    | 95000.00  | 1
Eve Davis      | 85000.00  | 2
Frank Miller   | 90000.00  | 1
*/
```

## Common Mistakes

### 1. NOT IN with NULL Values

```sql
-- WRONG: NOT IN returns no results if subquery contains NULL
SELECT employee_name
FROM employees
WHERE department_id NOT IN (
    SELECT department_id FROM departments WHERE location = 'London'
);
-- If subquery returns NULL, entire result is empty!

-- CORRECT: Use NOT EXISTS or filter NULLs
SELECT employee_name
FROM employees e
WHERE NOT EXISTS (
    SELECT 1 FROM departments d
    WHERE d.department_id = e.department_id
    AND d.location = 'London'
);
```

### 2. Forgetting Subquery Alias in FROM

```sql
-- WRONG: Missing alias
SELECT *
FROM (
    SELECT department_id, AVG(salary) as avg_sal
    FROM employees
    GROUP BY department_id
)
WHERE avg_sal > 100000;
-- Error: subquery in FROM must have an alias

-- CORRECT: Add alias
SELECT *
FROM (
    SELECT department_id, AVG(salary) as avg_sal
    FROM employees
    GROUP BY department_id
) AS dept_averages
WHERE avg_sal > 100000;
```

### 3. Scalar Subquery Returning Multiple Rows

```sql
-- WRONG: Subquery returns multiple values
SELECT
    employee_name,
    (SELECT department_name FROM departments) as dept
FROM employees;
-- Error: more than one row returned by a subquery used as an expression

-- CORRECT: Ensure single value with proper join condition
SELECT
    employee_name,
    (SELECT department_name FROM departments d
     WHERE d.department_id = e.department_id) as dept
FROM employees e;
```

### 4. Inefficient Correlated Subquery

```sql
-- INEFFICIENT: Correlated subquery executes for each row
SELECT
    e.employee_name,
    (SELECT COUNT(*) FROM employee_projects ep
     WHERE ep.employee_id = e.employee_id) as project_count
FROM employees e;

-- BETTER: Use LEFT JOIN with GROUP BY
SELECT
    e.employee_name,
    COUNT(ep.project_id) as project_count
FROM employees e
LEFT JOIN employee_projects ep ON e.employee_id = ep.employee_id
GROUP BY e.employee_id, e.employee_name;
```

### 5. Missing Correlation in Correlated Subquery

```sql
-- WRONG: Forgot to correlate
SELECT employee_name
FROM employees e
WHERE salary > (
    SELECT AVG(salary)
    FROM employees
    -- Missing: WHERE department_id = e.department_id
);

-- CORRECT: Add correlation
SELECT employee_name
FROM employees e
WHERE salary > (
    SELECT AVG(salary)
    FROM employees e2
    WHERE e2.department_id = e.department_id
);
```

## Best Practices

### 1. Use EXISTS Instead of IN for Better Performance

```sql
-- PREFER: EXISTS (short-circuits on first match)
SELECT employee_name
FROM employees e
WHERE EXISTS (
    SELECT 1 FROM employee_projects ep
    WHERE ep.employee_id = e.employee_id
);

-- AVOID: IN (may scan entire subquery)
SELECT employee_name
FROM employees
WHERE employee_id IN (
    SELECT employee_id FROM employee_projects
);
```

### 2. Use CTEs for Complex Subqueries

```sql
-- Complex nested subqueries (hard to read)
SELECT * FROM (
    SELECT department_id, AVG(salary) as avg_sal
    FROM (
        SELECT * FROM employees WHERE hire_date > '2021-01-01'
    ) recent_emp
    GROUP BY department_id
) dept_avg WHERE avg_sal > 90000;

-- Better with CTEs
WITH recent_employees AS (
    SELECT * FROM employees WHERE hire_date > '2021-01-01'
),
department_averages AS (
    SELECT department_id, AVG(salary) as avg_sal
    FROM recent_employees
    GROUP BY department_id
)
SELECT * FROM department_averages WHERE avg_sal > 90000;
```

### 3. Consider Joins Instead of Scalar Subqueries

```sql
-- Multiple scalar subqueries (inefficient)
SELECT
    e.employee_name,
    (SELECT department_name FROM departments d
     WHERE d.department_id = e.department_id),
    (SELECT COUNT(*) FROM employee_projects ep
     WHERE ep.employee_id = e.employee_id)
FROM employees e;

-- Single JOIN (more efficient)
SELECT
    e.employee_name,
    d.department_name,
    COUNT(ep.project_id)
FROM employees e
LEFT JOIN departments d ON e.department_id = d.department_id
LEFT JOIN employee_projects ep ON e.employee_id = ep.employee_id
GROUP BY e.employee_id, e.employee_name, d.department_name;
```

### 4. Use LIMIT in Subqueries When Appropriate

```sql
-- Get highest paid employee's salary for comparison
SELECT employee_name, salary
FROM employees
WHERE salary = (
    SELECT salary FROM employees ORDER BY salary DESC LIMIT 1
);
```

### 5. Add Comments for Complex Subqueries

```sql
SELECT
    p.project_name,
    p.budget,
    -- Count of Engineering employees on this project
    (SELECT COUNT(*)
     FROM employee_projects ep
     JOIN employees e ON ep.employee_id = e.employee_id
     WHERE ep.project_id = p.project_id
     AND e.department_id = 1) as eng_count
FROM projects p;
```

## Practice Exercises

### Exercise 1: Nested Aggregation Query

Write a query using subqueries that finds departments where the highest-paid employee earns more than twice the company's average salary. Return department name, highest salary in that department, and the company average.

<details>
<summary>Solution</summary>

```sql
WITH company_avg AS (
    SELECT AVG(salary) as avg_salary FROM employees
)
SELECT
    d.department_name,
    (SELECT MAX(salary)
     FROM employees e
     WHERE e.department_id = d.department_id) as highest_salary,
    ca.avg_salary as company_average
FROM departments d
CROSS JOIN company_avg ca
WHERE (
    SELECT MAX(salary)
    FROM employees e
    WHERE e.department_id = d.department_id
) > (2 * ca.avg_salary);

/*
Result:
department_name | highest_salary | company_average
----------------+----------------+-----------------
Engineering     | 150000.00      | 103571.43
*/

-- Alternative without CTE
SELECT
    d.department_name,
    (SELECT MAX(salary)
     FROM employees e
     WHERE e.department_id = d.department_id) as highest_salary,
    (SELECT AVG(salary) FROM employees) as company_average
FROM departments d
WHERE (
    SELECT MAX(salary)
    FROM employees e
    WHERE e.department_id = d.department_id
) > 2 * (SELECT AVG(salary) FROM employees);
```
</details>

### Exercise 2: Find Employees With Above-Average Project Load

Write a query that finds employees who are assigned to more projects than the average number of projects per employee. Use a correlated subquery in the WHERE clause. Show employee name, number of projects, and the average.

<details>
<summary>Solution</summary>

```sql
SELECT
    e.employee_name,
    (SELECT COUNT(*)
     FROM employee_projects ep
     WHERE ep.employee_id = e.employee_id) as project_count,
    (SELECT AVG(project_count)::NUMERIC(10,2)
     FROM (
         SELECT employee_id, COUNT(*) as project_count
         FROM employee_projects
         GROUP BY employee_id
     ) counts) as average_projects
FROM employees e
WHERE (
    SELECT COUNT(*)
    FROM employee_projects ep
    WHERE ep.employee_id = e.employee_id
) > (
    SELECT AVG(project_count)
    FROM (
        SELECT COUNT(*) as project_count
        FROM employee_projects
        GROUP BY employee_id
    ) counts
)
ORDER BY project_count DESC;

/*
Result:
employee_name | project_count | average_projects
--------------+---------------+-----------------
Bob Smith     | 2             | 1.17
*/
```
</details>

### Exercise 3: Complex Subquery with EXISTS

Write a query that finds projects that have at least one employee from every department that has employees. Use EXISTS in your solution.

Hint: Use NOT EXISTS with a double negative pattern.

<details>
<summary>Solution</summary>

```sql
-- Find projects that have representation from all populated departments
SELECT
    p.project_name,
    p.budget
FROM projects p
WHERE NOT EXISTS (
    -- Find departments with employees
    SELECT d.department_id
    FROM departments d
    WHERE EXISTS (
        SELECT 1 FROM employees e
        WHERE e.department_id = d.department_id
    )
    AND NOT EXISTS (
        -- Check if this project has someone from this department
        SELECT 1
        FROM employee_projects ep
        JOIN employees e ON ep.employee_id = e.employee_id
        WHERE ep.project_id = p.project_id
        AND e.department_id = d.department_id
    )
);

/*
Result:
Currently no project has employees from all 3 populated departments
(Engineering, Marketing, Sales)

Let's verify by checking project coverage:
*/

SELECT
    p.project_name,
    STRING_AGG(DISTINCT d.department_name, ', ') as departments
FROM projects p
JOIN employee_projects ep ON p.project_id = ep.project_id
JOIN employees e ON ep.employee_id = e.employee_id
LEFT JOIN departments d ON e.department_id = d.department_id
GROUP BY p.project_id, p.project_name;

/*
project_name        | departments
--------------------+------------
Marketing Campaign  | Marketing
Mobile App          | Engineering
Website Redesign    | Engineering
*/
```
</details>

## Related Topics

- [Joins](./01-joins.md) - Alternative to subqueries for combining tables
- [Set Operations](./03-set-operations.md) - UNION, INTERSECT, EXCEPT
- [LATERAL Joins](./04-lateral-joins.md) - Advanced subquery technique
- [Window Functions](../06-advanced-sql/02-window-functions.md) - Alternative to correlated subqueries
- [Common Table Expressions](../06-advanced-sql/01-ctes.md) - Cleaner subquery syntax

## Additional Resources

- [PostgreSQL Documentation: Subqueries](https://www.postgresql.org/docs/current/functions-subquery.html)
- [PostgreSQL Documentation: Scalar Subqueries](https://www.postgresql.org/docs/current/sql-expressions.html#SQL-SYNTAX-SCALAR-SUBQUERIES)
- [Query Optimization: Subquery vs JOIN](https://www.postgresql.org/docs/current/queries-table-expressions.html)
