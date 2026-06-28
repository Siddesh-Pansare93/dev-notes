# LATERAL Joins in PostgreSQL

## Table of Contents
- [Theory](#theory)
- [Syntax](#syntax)
- [Examples](#examples)
- [Common Mistakes](#common-mistakes)
- [Best Practices](#best-practices)
- [Practice Exercises](#practice-exercises)

## Theory

### What is LATERAL?

LATERAL is a special keyword that allows a subquery in the FROM clause to reference columns from tables that appear before it in the FROM list. It's like a "for-each" loop in SQL, where the subquery executes once for each row of the preceding table.

### Key Concepts

**Regular Subquery in FROM:**
- Cannot reference other tables in FROM clause
- Executes once, returns a table
- Independent of other tables

**LATERAL Subquery:**
- Can reference preceding tables
- Executes once per row of preceding table
- Dependent on preceding tables (correlated)

### Visual Representation

```
Regular JOIN:
table1           table2
┌─────┐         ┌─────┐
│ row1│ ────────│ all │
│ row2│         │rows │
│ row3│         └─────┘
└─────┘

LATERAL JOIN:
table1           LATERAL subquery
┌─────┐         ┌─────┐
│ row1│ ────────│query│ (using row1)
│ row2│ ────────│query│ (using row2)
│ row3│ ────────│query│ (using row3)
└─────┘         └─────┘
```

### Common Use Cases

1. **Top-N per Group**: Get top N rows for each group
2. **Set-Returning Functions**: Use functions like generate_series with table data
3. **Complex Calculations**: Per-row complex queries
4. **Dependent Lookups**: Different lookup based on row values
5. **Time-Series Analysis**: Window-based calculations

### LATERAL vs Regular Subquery

| Feature | Regular Subquery | LATERAL |
|---------|------------------|---------|
| Reference outer table | No | Yes |
| Execution | Once | Per outer row |
| Use in FROM | Yes | Yes |
| Correlated | No | Yes |
| Performance | Better for static | Better for per-row logic |

### Performance Characteristics

- LATERAL executes subquery for each row (can be expensive)
- Use indexes on columns referenced in LATERAL subquery
- LIMIT in LATERAL subquery can dramatically improve performance
- PostgreSQL optimizes well for common patterns (top-N)
- Consider alternatives (window functions) for large datasets

## Syntax

### Basic LATERAL Syntax

```sql
SELECT columns
FROM table1,
     LATERAL (
         SELECT columns
         FROM table2
         WHERE table2.column = table1.column
     ) AS subquery_alias;
```

### LATERAL with JOIN

```sql
SELECT columns
FROM table1
LEFT JOIN LATERAL (
    SELECT columns
    FROM table2
    WHERE table2.column = table1.column
    ORDER BY something
    LIMIT n
) AS subquery_alias ON true;
```

### LATERAL with Set-Returning Functions

```sql
SELECT columns
FROM table1,
     LATERAL generate_series(table1.start, table1.end) AS series(value);
```

### LATERAL with Multiple References

```sql
SELECT columns
FROM table1
JOIN table2 ON table1.id = table2.id
LEFT JOIN LATERAL (
    SELECT columns
    FROM table3
    WHERE table3.col1 = table1.col
      AND table3.col2 = table2.col
    LIMIT 1
) AS subquery ON true;
```

### Implicit LATERAL

```sql
-- Set-returning functions are implicitly LATERAL
SELECT t.*, series
FROM table1 t,
     generate_series(1, t.count) AS series;
```

## Examples

### Setup Tables

```sql
-- Create sample tables for demonstrations
CREATE TABLE departments (
    department_id SERIAL PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL,
    budget NUMERIC(12, 2)
);

CREATE TABLE employees (
    employee_id SERIAL PRIMARY KEY,
    employee_name VARCHAR(100) NOT NULL,
    department_id INTEGER REFERENCES departments(department_id),
    salary NUMERIC(10, 2),
    hire_date DATE,
    performance_rating NUMERIC(3, 2)
);

CREATE TABLE sales (
    sale_id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(employee_id),
    sale_date DATE,
    amount NUMERIC(10, 2),
    product_category VARCHAR(50)
);

CREATE TABLE performance_reviews (
    review_id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(employee_id),
    review_date DATE,
    rating NUMERIC(3, 2),
    comments TEXT
);

-- Insert sample data
INSERT INTO departments (department_name, budget) VALUES
    ('Sales', 2000000),
    ('Engineering', 3000000),
    ('Marketing', 1500000),
    ('Support', 1000000);

INSERT INTO employees (employee_name, department_id, salary, hire_date, performance_rating) VALUES
    ('Alice Johnson', 1, 85000, '2020-01-15', 4.5),
    ('Bob Smith', 1, 75000, '2020-03-20', 4.2),
    ('Carol White', 1, 95000, '2019-06-10', 4.8),
    ('David Brown', 2, 105000, '2021-02-01', 4.3),
    ('Eve Davis', 2, 110000, '2020-08-15', 4.6),
    ('Frank Miller', 2, 98000, '2021-05-20', 4.1),
    ('Grace Lee', 3, 88000, '2020-11-01', 4.4),
    ('Henry Wilson', 3, 82000, '2021-03-15', 4.0),
    ('Ivy Chen', 4, 65000, '2022-01-10', 4.2),
    ('Jack Davis', 4, 68000, '2021-09-01', 4.5);

INSERT INTO sales (employee_id, sale_date, amount, product_category) VALUES
    -- Alice (high performer)
    (1, '2024-01-05', 15000, 'Enterprise'),
    (1, '2024-01-12', 22000, 'Enterprise'),
    (1, '2024-02-03', 18000, 'Professional'),
    (1, '2024-02-15', 25000, 'Enterprise'),
    (1, '2024-03-01', 20000, 'Enterprise'),
    -- Bob (moderate)
    (2, '2024-01-08', 8000, 'Professional'),
    (2, '2024-01-20', 12000, 'Professional'),
    (2, '2024-02-10', 9000, 'Small Business'),
    -- Carol (top performer)
    (3, '2024-01-03', 30000, 'Enterprise'),
    (3, '2024-01-18', 28000, 'Enterprise'),
    (3, '2024-02-05', 35000, 'Enterprise'),
    (3, '2024-02-22', 32000, 'Enterprise'),
    (3, '2024-03-10', 40000, 'Enterprise'),
    -- Others
    (2, '2024-03-05', 11000, 'Professional'),
    (1, '2024-03-20', 19000, 'Professional');

INSERT INTO performance_reviews (employee_id, review_date, rating, comments) VALUES
    (1, '2023-01-15', 4.0, 'Good performance'),
    (1, '2023-07-15', 4.3, 'Improved sales'),
    (1, '2024-01-15', 4.5, 'Excellent quarter'),
    (2, '2023-03-20', 3.8, 'Meets expectations'),
    (2, '2023-09-20', 4.0, 'Steady improvement'),
    (2, '2024-01-20', 4.2, 'Good work'),
    (3, '2023-06-10', 4.5, 'Outstanding'),
    (3, '2023-12-10', 4.7, 'Top performer'),
    (3, '2024-02-10', 4.8, 'Exceptional results');
```

### Example 1: Top-N per Group - Latest Sale per Employee

```sql
-- Get the most recent sale for each employee using LATERAL
SELECT
    e.employee_name,
    e.department_id,
    recent_sales.sale_date,
    recent_sales.amount,
    recent_sales.product_category
FROM employees e
LEFT JOIN LATERAL (
    SELECT
        sale_date,
        amount,
        product_category
    FROM sales s
    WHERE s.employee_id = e.employee_id
    ORDER BY sale_date DESC
    LIMIT 1
) AS recent_sales ON true
ORDER BY e.employee_name;

/*
Result:
employee_name  | department_id | sale_date  | amount   | product_category
---------------+---------------+------------+----------+-----------------
Alice Johnson  | 1             | 2024-03-20 | 19000.00 | Professional
Bob Smith      | 1             | 2024-03-05 | 11000.00 | Professional
Carol White    | 1             | 2024-03-10 | 40000.00 | Enterprise
David Brown    | 2             | NULL       | NULL     | NULL
Eve Davis      | 2             | NULL       | NULL     | NULL
...
*/
```

### Example 2: Top-3 Sales per Employee

```sql
-- Get top 3 sales for each employee
SELECT
    e.employee_name,
    top_sales.sale_date,
    top_sales.amount,
    top_sales.rank
FROM employees e
CROSS JOIN LATERAL (
    SELECT
        sale_date,
        amount,
        ROW_NUMBER() OVER (ORDER BY amount DESC) as rank
    FROM sales s
    WHERE s.employee_id = e.employee_id
    ORDER BY amount DESC
    LIMIT 3
) AS top_sales
WHERE EXISTS (SELECT 1 FROM sales WHERE employee_id = e.employee_id)
ORDER BY e.employee_name, top_sales.rank;

/*
Result:
employee_name  | sale_date  | amount   | rank
---------------+------------+----------+-----
Alice Johnson  | 2024-02-15 | 25000.00 | 1
Alice Johnson  | 2024-01-12 | 22000.00 | 2
Alice Johnson  | 2024-03-01 | 20000.00 | 3
Bob Smith      | 2024-01-20 | 12000.00 | 1
Bob Smith      | 2024-03-05 | 11000.00 | 2
Bob Smith      | 2024-02-10 | 9000.00  | 3
Carol White    | 2024-03-10 | 40000.00 | 1
Carol White    | 2024-02-05 | 35000.00 | 2
Carol White    | 2024-02-22 | 32000.00 | 3
*/
```

### Example 3: LATERAL with generate_series - Date Range Expansion

```sql
-- Generate monthly summary for each department
SELECT
    d.department_name,
    months.month_start,
    COALESCE(SUM(s.amount), 0) as monthly_sales
FROM departments d
CROSS JOIN LATERAL (
    SELECT generate_series(
        '2024-01-01'::DATE,
        '2024-03-01'::DATE,
        '1 month'::INTERVAL
    )::DATE as month_start
) AS months
LEFT JOIN employees e ON e.department_id = d.department_id
LEFT JOIN sales s ON s.employee_id = e.employee_id
    AND DATE_TRUNC('month', s.sale_date) = months.month_start
GROUP BY d.department_id, d.department_name, months.month_start
ORDER BY d.department_name, months.month_start;

/*
Result: Shows sales by department and month (including zero months)
department_name | month_start | monthly_sales
----------------+-------------+--------------
Engineering     | 2024-01-01  | 0.00
Engineering     | 2024-02-01  | 0.00
Engineering     | 2024-03-01  | 0.00
Marketing       | 2024-01-01  | 0.00
Marketing       | 2024-02-01  | 0.00
Marketing       | 2024-03-01  | 0.00
Sales           | 2024-01-01  | 115000.00
Sales           | 2024-02-01  | 139000.00
Sales           | 2024-03-01  | 90000.00
...
*/
```

### Example 4: LATERAL with Multiple Table References

```sql
-- Get department info with top employee and their best sale
SELECT
    d.department_name,
    d.budget,
    top_emp.employee_name,
    top_emp.salary,
    top_emp.best_sale_amount
FROM departments d
LEFT JOIN LATERAL (
    SELECT
        e.employee_name,
        e.salary,
        (SELECT MAX(amount)
         FROM sales s
         WHERE s.employee_id = e.employee_id) as best_sale_amount
    FROM employees e
    WHERE e.department_id = d.department_id
    ORDER BY e.salary DESC
    LIMIT 1
) AS top_emp ON true
ORDER BY d.department_name;

/*
Result:
department_name | budget      | employee_name | salary    | best_sale_amount
----------------+-------------+---------------+-----------+-----------------
Engineering     | 3000000.00  | Eve Davis     | 110000.00 | NULL
Marketing       | 1500000.00  | Grace Lee     | 88000.00  | NULL
Sales           | 2000000.00  | Carol White   | 95000.00  | 40000.00
Support         | 1000000.00  | Jack Davis    | 68000.00  | NULL
*/
```

### Example 5: Performance Comparison - LATERAL vs Window Function

```sql
-- LATERAL approach for top 2 sales per employee
EXPLAIN ANALYZE
SELECT
    e.employee_name,
    top_sales.amount
FROM employees e
CROSS JOIN LATERAL (
    SELECT amount
    FROM sales s
    WHERE s.employee_id = e.employee_id
    ORDER BY amount DESC
    LIMIT 2
) AS top_sales;

-- Window function approach (usually faster for this pattern)
EXPLAIN ANALYZE
SELECT
    e.employee_name,
    s.amount
FROM employees e
JOIN (
    SELECT
        employee_id,
        amount,
        ROW_NUMBER() OVER (PARTITION BY employee_id ORDER BY amount DESC) as rn
    FROM sales
) s ON e.employee_id = s.employee_id AND s.rn <= 2;

-- Compare execution plans and times
```

### Example 6: Latest Review with Performance Trend

```sql
-- Get each employee with their latest review and trend
SELECT
    e.employee_name,
    e.department_id,
    latest_review.review_date,
    latest_review.rating as current_rating,
    latest_review.previous_rating,
    latest_review.rating - latest_review.previous_rating as rating_change
FROM employees e
LEFT JOIN LATERAL (
    SELECT
        pr.review_date,
        pr.rating,
        LAG(pr.rating) OVER (ORDER BY pr.review_date) as previous_rating
    FROM performance_reviews pr
    WHERE pr.employee_id = e.employee_id
    ORDER BY pr.review_date DESC
    LIMIT 1
) AS latest_review ON true
ORDER BY e.employee_name;

/*
Result:
employee_name  | department_id | review_date | current_rating | previous_rating | rating_change
---------------+---------------+-------------+----------------+-----------------+--------------
Alice Johnson  | 1             | 2024-01-15  | 4.50           | 4.30            | 0.20
Bob Smith      | 1             | 2024-01-20  | 4.20           | 4.00            | 0.20
Carol White    | 1             | 2024-02-10  | 4.80           | 4.70            | 0.10
David Brown    | 2             | NULL        | NULL           | NULL            | NULL
...
*/
```

### Example 7: LATERAL for Conditional Lookups

```sql
-- Different lookup logic based on employee's department
SELECT
    e.employee_name,
    e.department_id,
    dept_stats.stat_type,
    dept_stats.stat_value
FROM employees e
CROSS JOIN LATERAL (
    CASE
        WHEN e.department_id = 1 THEN
            -- For Sales: show sales performance
            (SELECT 'Total Sales' as stat_type,
                    SUM(amount)::TEXT as stat_value
             FROM sales s
             WHERE s.employee_id = e.employee_id)
        WHEN e.department_id = 2 THEN
            -- For Engineering: show years of service
            (SELECT 'Years of Service' as stat_type,
                    EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.hire_date))::TEXT
             FROM (SELECT 1) x)
        ELSE
            -- For others: show salary rank
            (SELECT 'Salary Rank' as stat_type,
                    RANK() OVER (ORDER BY salary DESC)::TEXT
             FROM employees e2
             WHERE e2.department_id = e.department_id
             AND e2.employee_id = e.employee_id)
    END
) AS dept_stats
ORDER BY e.department_id, e.employee_name;

/*
Result: Different stats based on department
employee_name  | department_id | stat_type       | stat_value
---------------+---------------+-----------------+-----------
Alice Johnson  | 1             | Total Sales     | 119000.00
Bob Smith      | 1             | Total Sales     | 40000.00
Carol White    | 1             | Total Sales     | 165000.00
David Brown    | 2             | Years of Service| 3
Eve Davis      | 2             | Years of Service| 4
Frank Miller   | 2             | Years of Service| 3
...
*/
```

### Example 8: Expanding Array to Rows with LATERAL

```sql
-- First, add a column to test with
ALTER TABLE departments ADD COLUMN focus_areas TEXT[];

UPDATE departments
SET focus_areas = ARRAY['Revenue', 'Growth', 'Innovation']
WHERE department_name = 'Sales';

UPDATE departments
SET focus_areas = ARRAY['Quality', 'Innovation', 'Efficiency']
WHERE department_name = 'Engineering';

UPDATE departments
SET focus_areas = ARRAY['Brand', 'Customer']
WHERE department_name = 'Marketing';

-- Now expand arrays to rows
SELECT
    d.department_name,
    focus.area,
    focus.position
FROM departments d
CROSS JOIN LATERAL unnest(d.focus_areas) WITH ORDINALITY AS focus(area, position)
ORDER BY d.department_name, focus.position;

/*
Result:
department_name | area        | position
----------------+-------------+---------
Engineering     | Quality     | 1
Engineering     | Innovation  | 2
Engineering     | Efficiency  | 3
Marketing       | Brand       | 1
Marketing       | Customer    | 2
Sales           | Revenue     | 1
Sales           | Growth      | 2
Sales           | Innovation  | 3
*/
```

### Example 9: Running Totals with LATERAL

```sql
-- Calculate running total of sales for each employee
SELECT
    e.employee_name,
    s.sale_date,
    s.amount,
    running.total
FROM employees e
JOIN sales s ON e.employee_id = s.employee_id
CROSS JOIN LATERAL (
    SELECT SUM(s2.amount) as total
    FROM sales s2
    WHERE s2.employee_id = e.employee_id
      AND s2.sale_date <= s.sale_date
) AS running
ORDER BY e.employee_name, s.sale_date;

/*
Result:
employee_name  | sale_date  | amount   | total
---------------+------------+----------+---------
Alice Johnson  | 2024-01-05 | 15000.00 | 15000.00
Alice Johnson  | 2024-01-12 | 22000.00 | 37000.00
Alice Johnson  | 2024-02-03 | 18000.00 | 55000.00
Alice Johnson  | 2024-02-15 | 25000.00 | 80000.00
Alice Johnson  | 2024-03-01 | 20000.00 | 100000.00
Alice Johnson  | 2024-03-20 | 19000.00 | 119000.00
...
*/
```

### Example 10: LATERAL with JSON Processing

```sql
-- Create a table with JSON data
CREATE TEMP TABLE employee_skills (
    employee_id INTEGER,
    skills JSONB
);

INSERT INTO employee_skills VALUES
    (1, '{"technical": ["SQL", "Excel"], "soft": ["Communication", "Leadership"]}'),
    (2, '{"technical": ["CRM", "Analytics"], "soft": ["Teamwork"]}'),
    (3, '{"technical": ["SQL", "Tableau", "Python"], "soft": ["Presentation", "Negotiation"]}');

-- Expand JSON skills to rows
SELECT
    e.employee_name,
    skill_info.skill_type,
    skill_info.skill
FROM employees e
JOIN employee_skills es ON e.employee_id = es.employee_id
CROSS JOIN LATERAL (
    SELECT 'technical' as skill_type, jsonb_array_elements_text(skills->'technical') as skill
    UNION ALL
    SELECT 'soft', jsonb_array_elements_text(skills->'soft')
) AS skill_info
ORDER BY e.employee_name, skill_info.skill_type, skill_info.skill;

/*
Result:
employee_name  | skill_type | skill
---------------+------------+--------------
Alice Johnson  | soft       | Communication
Alice Johnson  | soft       | Leadership
Alice Johnson  | technical  | Excel
Alice Johnson  | technical  | SQL
Bob Smith      | soft       | Teamwork
Bob Smith      | technical  | Analytics
Bob Smith      | technical  | CRM
Carol White    | soft       | Negotiation
Carol White    | soft       | Presentation
Carol White    | technical  | Python
Carol White    | technical  | SQL
Carol White    | technical  | Tableau
*/
```

### Example 11: Top-N-per-Group Pattern - Department Leaderboard

```sql
-- Show top 3 earners per department
SELECT
    d.department_name,
    top_earners.employee_name,
    top_earners.salary,
    top_earners.rank
FROM departments d
CROSS JOIN LATERAL (
    SELECT
        e.employee_name,
        e.salary,
        RANK() OVER (ORDER BY e.salary DESC) as rank
    FROM employees e
    WHERE e.department_id = d.department_id
    ORDER BY e.salary DESC
    LIMIT 3
) AS top_earners
ORDER BY d.department_name, top_earners.rank;

/*
Result:
department_name | employee_name | salary    | rank
----------------+---------------+-----------+-----
Engineering     | Eve Davis     | 110000.00 | 1
Engineering     | David Brown   | 105000.00 | 2
Engineering     | Frank Miller  | 98000.00  | 3
Marketing       | Grace Lee     | 88000.00  | 1
Marketing       | Henry Wilson  | 82000.00  | 2
Sales           | Carol White   | 95000.00  | 1
Sales           | Alice Johnson | 85000.00  | 2
Sales           | Bob Smith     | 75000.00  | 3
Support         | Jack Davis    | 68000.00  | 1
Support         | Ivy Chen      | 65000.00  | 2
*/
```

### Example 12: Time-Series Gap Filling

```sql
-- Find gaps in employee sales activity (months with no sales)
SELECT
    e.employee_name,
    all_months.month_date,
    CASE
        WHEN s.sale_count IS NULL THEN 'No Activity'
        ELSE s.sale_count::TEXT || ' sales'
    END as activity
FROM employees e
CROSS JOIN LATERAL (
    SELECT generate_series(
        DATE_TRUNC('month', MIN(sale_date)),
        DATE_TRUNC('month', MAX(sale_date)),
        '1 month'::INTERVAL
    ) as month_date
    FROM sales
    WHERE employee_id = e.employee_id
) AS all_months
LEFT JOIN LATERAL (
    SELECT COUNT(*) as sale_count
    FROM sales s
    WHERE s.employee_id = e.employee_id
      AND DATE_TRUNC('month', s.sale_date) = all_months.month_date
) AS s ON true
WHERE EXISTS (SELECT 1 FROM sales WHERE employee_id = e.employee_id)
ORDER BY e.employee_name, all_months.month_date;

/*
Result:
employee_name  | month_date           | activity
---------------+----------------------+------------
Alice Johnson  | 2024-01-01 00:00:00  | 2 sales
Alice Johnson  | 2024-02-01 00:00:00  | 2 sales
Alice Johnson  | 2024-03-01 00:00:00  | 2 sales
Bob Smith      | 2024-01-01 00:00:00  | 2 sales
Bob Smith      | 2024-02-01 00:00:00  | 1 sales
Bob Smith      | 2024-03-01 00:00:00  | 1 sales
Carol White    | 2024-01-01 00:00:00  | 2 sales
Carol White    | 2024-02-01 00:00:00  | 2 sales
Carol White    | 2024-03-01 00:00:00  | 1 sales
*/
```

### Example 13: LATERAL vs Correlated Subquery Performance

```sql
-- Correlated subquery approach
EXPLAIN ANALYZE
SELECT
    e.employee_name,
    (SELECT COUNT(*) FROM sales s WHERE s.employee_id = e.employee_id) as sale_count,
    (SELECT MAX(amount) FROM sales s WHERE s.employee_id = e.employee_id) as max_sale
FROM employees e;

-- LATERAL approach
EXPLAIN ANALYZE
SELECT
    e.employee_name,
    stats.sale_count,
    stats.max_sale
FROM employees e
LEFT JOIN LATERAL (
    SELECT
        COUNT(*) as sale_count,
        MAX(amount) as max_sale
    FROM sales s
    WHERE s.employee_id = e.employee_id
) AS stats ON true;

-- LATERAL is more efficient: single scan vs multiple scans
```

### Example 14: Complex Real-World Example - Employee Performance Dashboard

```sql
-- Comprehensive employee dashboard using LATERAL
SELECT
    e.employee_name,
    d.department_name,
    e.salary,

    -- Latest review info
    latest_review.review_date,
    latest_review.rating as current_rating,

    -- Sales performance (if applicable)
    sales_stats.total_sales,
    sales_stats.avg_sale,
    sales_stats.sale_count,

    -- Peer comparison
    peer_rank.salary_rank,
    peer_rank.dept_size

FROM employees e
JOIN departments d ON e.department_id = d.department_id

-- Latest review
LEFT JOIN LATERAL (
    SELECT review_date, rating
    FROM performance_reviews pr
    WHERE pr.employee_id = e.employee_id
    ORDER BY review_date DESC
    LIMIT 1
) AS latest_review ON true

-- Sales statistics
LEFT JOIN LATERAL (
    SELECT
        COUNT(*) as sale_count,
        SUM(amount) as total_sales,
        AVG(amount) as avg_sale
    FROM sales s
    WHERE s.employee_id = e.employee_id
) AS sales_stats ON true

-- Peer ranking
CROSS JOIN LATERAL (
    SELECT
        COUNT(*) as dept_size,
        (SELECT COUNT(*) + 1
         FROM employees e2
         WHERE e2.department_id = e.department_id
           AND e2.salary > e.salary) as salary_rank
    FROM employees e3
    WHERE e3.department_id = e.department_id
) AS peer_rank

ORDER BY d.department_name, e.employee_name;

/*
Result: Complete employee dashboard
employee_name | dept_name | salary | review_date | current_rating | total_sales | avg_sale | sale_count | salary_rank | dept_size
--------------+-----------+--------+-------------+----------------+-------------+----------+------------+-------------+----------
David Brown   | Engineer  | 105000 | NULL        | NULL           | NULL        | NULL     | NULL       | 2           | 3
Eve Davis     | Engineer  | 110000 | NULL        | NULL           | NULL        | NULL     | NULL       | 1           | 3
Frank Miller  | Engineer  | 98000  | NULL        | NULL           | NULL        | NULL     | NULL       | 3           | 3
...
*/
```

## Common Mistakes

### 1. Forgetting ON true with CROSS JOIN LATERAL

```sql
-- WRONG: Missing ON clause
SELECT e.employee_name, recent.sale_date
FROM employees e
LEFT JOIN LATERAL (
    SELECT sale_date FROM sales WHERE employee_id = e.employee_id
    ORDER BY sale_date DESC LIMIT 1
) AS recent;
-- ERROR: syntax error at or near ";"

-- CORRECT: Add ON true
SELECT e.employee_name, recent.sale_date
FROM employees e
LEFT JOIN LATERAL (
    SELECT sale_date FROM sales WHERE employee_id = e.employee_id
    ORDER BY sale_date DESC LIMIT 1
) AS recent ON true;
```

### 2. Using LATERAL When Not Needed

```sql
-- INEFFICIENT: LATERAL not needed (no reference to outer table)
SELECT e.employee_name, all_depts.dept_name
FROM employees e
CROSS JOIN LATERAL (
    SELECT department_name as dept_name FROM departments
) AS all_depts;

-- EFFICIENT: Regular CROSS JOIN
SELECT e.employee_name, d.department_name
FROM employees e
CROSS JOIN departments d;
```

### 3. Missing LIMIT in Top-N Queries

```sql
-- WRONG: No LIMIT (returns all matching rows)
SELECT e.employee_name, recent_sales.amount
FROM employees e
LEFT JOIN LATERAL (
    SELECT amount FROM sales
    WHERE employee_id = e.employee_id
    ORDER BY sale_date DESC
    -- Missing LIMIT
) AS recent_sales ON true;
-- Returns ALL sales per employee, not just most recent

-- CORRECT: Add LIMIT
SELECT e.employee_name, recent_sales.amount
FROM employees e
LEFT JOIN LATERAL (
    SELECT amount FROM sales
    WHERE employee_id = e.employee_id
    ORDER BY sale_date DESC
    LIMIT 1
) AS recent_sales ON true;
```

### 4. Not Handling Empty Results

```sql
-- May return unexpected results
SELECT e.employee_name,
       recent.sale_date
FROM employees e
CROSS JOIN LATERAL (
    SELECT sale_date FROM sales
    WHERE employee_id = e.employee_id
    ORDER BY sale_date DESC LIMIT 1
) AS recent;
-- Employees with no sales are excluded!

-- CORRECT: Use LEFT JOIN
SELECT e.employee_name,
       recent.sale_date
FROM employees e
LEFT JOIN LATERAL (
    SELECT sale_date FROM sales
    WHERE employee_id = e.employee_id
    ORDER BY sale_date DESC LIMIT 1
) AS recent ON true;
```

### 5. Performance Issues with Large Datasets

```sql
-- SLOW: LATERAL executes for every row without index
SELECT e.employee_name, avg_dept_sal.avg_sal
FROM employees e
CROSS JOIN LATERAL (
    SELECT AVG(salary) as avg_sal
    FROM employees e2
    WHERE e2.department_id = e.department_id
) AS avg_dept_sal;

-- BETTER: Use window function or JOIN
SELECT e.employee_name,
       AVG(e2.salary) OVER (PARTITION BY e.department_id) as avg_sal
FROM employees e;
```

## Best Practices

### 1. Use Indexes on Referenced Columns

```sql
-- Create indexes for LATERAL join columns
CREATE INDEX idx_sales_employee_date ON sales(employee_id, sale_date DESC);
CREATE INDEX idx_reviews_employee_date ON performance_reviews(employee_id, review_date DESC);

-- Now LATERAL queries will be much faster
SELECT e.employee_name, recent.sale_date
FROM employees e
LEFT JOIN LATERAL (
    SELECT sale_date FROM sales
    WHERE employee_id = e.employee_id
    ORDER BY sale_date DESC LIMIT 1
) AS recent ON true;
```

### 2. Always Use LIMIT for Top-N Queries

```sql
-- Get top 3 sales per employee
SELECT e.employee_name, top_sales.amount
FROM employees e
CROSS JOIN LATERAL (
    SELECT amount
    FROM sales
    WHERE employee_id = e.employee_id
    ORDER BY amount DESC
    LIMIT 3  -- Critical for performance
) AS top_sales;
```

### 3. Consider Alternatives for Simple Cases

```sql
-- For simple aggregates, window functions are often better
-- LATERAL approach
SELECT e.employee_name, dept_avg.avg_salary
FROM employees e
CROSS JOIN LATERAL (
    SELECT AVG(salary) as avg_salary
    FROM employees e2
    WHERE e2.department_id = e.department_id
) AS dept_avg;

-- BETTER: Window function
SELECT
    employee_name,
    AVG(salary) OVER (PARTITION BY department_id) as avg_salary
FROM employees;
```

### 4. Use Descriptive Aliases

```sql
-- Good: Clear alias names
SELECT e.employee_name, top_3_sales.amount
FROM employees e
CROSS JOIN LATERAL (
    SELECT amount FROM sales
    WHERE employee_id = e.employee_id
    ORDER BY amount DESC LIMIT 3
) AS top_3_sales;

-- Avoid: Cryptic aliases
SELECT e.employee_name, x.amount
FROM employees e
CROSS JOIN LATERAL (
    SELECT amount FROM sales
    WHERE employee_id = e.employee_id
    ORDER BY amount DESC LIMIT 3
) AS x;
```

### 5. Document Complex LATERAL Queries

```sql
-- Add comments for complex logic
SELECT
    e.employee_name,
    -- Get employee's sales performance metrics
    -- compared to department average
    perf_metrics.total_sales,
    perf_metrics.vs_dept_avg
FROM employees e
CROSS JOIN LATERAL (
    SELECT
        COALESCE(SUM(s.amount), 0) as total_sales,
        COALESCE(SUM(s.amount), 0) - (
            -- Department average sales per employee
            SELECT AVG(dept_total)
            FROM (
                SELECT employee_id, SUM(amount) as dept_total
                FROM sales s2
                JOIN employees e2 ON s2.employee_id = e2.employee_id
                WHERE e2.department_id = e.department_id
                GROUP BY employee_id
            ) dept_sales
        ) as vs_dept_avg
    FROM sales s
    WHERE s.employee_id = e.employee_id
) AS perf_metrics;
```

## Practice Exercises

### Exercise 1: Department Performance Trends

Create a query that shows each department with their top 2 performing employees (by total sales) and each employee's best sale month. Use LATERAL joins.

Expected output: department_name, employee_name, total_sales, best_month, best_month_sales

<details>
<summary>Solution</summary>

```sql
SELECT
    d.department_name,
    top_performers.employee_name,
    top_performers.total_sales,
    top_performers.best_month,
    top_performers.best_month_sales
FROM departments d
CROSS JOIN LATERAL (
    SELECT
        e.employee_name,
        COALESCE(SUM(s.amount), 0) as total_sales,
        best_month.month as best_month,
        best_month.month_sales as best_month_sales
    FROM employees e
    LEFT JOIN sales s ON e.employee_id = s.employee_id
    -- Get best month for this employee
    LEFT JOIN LATERAL (
        SELECT
            TO_CHAR(sale_date, 'YYYY-MM') as month,
            SUM(amount) as month_sales
        FROM sales s2
        WHERE s2.employee_id = e.employee_id
        GROUP BY TO_CHAR(sale_date, 'YYYY-MM')
        ORDER BY month_sales DESC
        LIMIT 1
    ) AS best_month ON true
    WHERE e.department_id = d.department_id
    GROUP BY e.employee_id, e.employee_name, best_month.month, best_month.month_sales
    ORDER BY total_sales DESC
    LIMIT 2
) AS top_performers
WHERE top_performers.total_sales > 0
ORDER BY d.department_name, top_performers.total_sales DESC;

/*
Result:
department_name | employee_name  | total_sales | best_month | best_month_sales
----------------+----------------+-------------+------------+-----------------
Sales           | Carol White    | 165000.00   | 2024-02    | 67000.00
Sales           | Alice Johnson  | 119000.00   | 2024-02    | 43000.00
*/
```
</details>

### Exercise 2: Activity Timeline Generator

Write a query that generates a complete timeline for each employee showing all months from their hire date to current date, indicating whether they had sales activity in each month. Use LATERAL with generate_series.

Expected output: employee_name, month, sales_count, sales_amount, status (Active/Inactive)

<details>
<summary>Solution</summary>

```sql
SELECT
    e.employee_name,
    timeline.month_date,
    COALESCE(monthly_sales.sale_count, 0) as sales_count,
    COALESCE(monthly_sales.total_amount, 0) as sales_amount,
    CASE
        WHEN monthly_sales.sale_count IS NULL THEN 'Inactive'
        ELSE 'Active'
    END as status
FROM employees e
CROSS JOIN LATERAL (
    SELECT generate_series(
        DATE_TRUNC('month', e.hire_date),
        DATE_TRUNC('month', CURRENT_DATE),
        '1 month'::INTERVAL
    )::DATE as month_date
) AS timeline
LEFT JOIN LATERAL (
    SELECT
        COUNT(*) as sale_count,
        SUM(amount) as total_amount
    FROM sales s
    WHERE s.employee_id = e.employee_id
      AND DATE_TRUNC('month', s.sale_date) = timeline.month_date
) AS monthly_sales ON true
WHERE e.employee_id IN (1, 2, 3)  -- Limit to sales employees
  AND timeline.month_date >= '2024-01-01'
ORDER BY e.employee_name, timeline.month_date;

/*
Result (sample):
employee_name  | month_date | sales_count | sales_amount | status
---------------+------------+-------------+--------------+--------
Alice Johnson  | 2024-01-01 | 2           | 37000.00     | Active
Alice Johnson  | 2024-02-01 | 2           | 43000.00     | Active
Alice Johnson  | 2024-03-01 | 2           | 39000.00     | Active
Bob Smith      | 2024-01-01 | 2           | 20000.00     | Active
Bob Smith      | 2024-02-01 | 1           | 9000.00      | Active
Bob Smith      | 2024-03-01 | 1           | 11000.00     | Active
...
*/
```
</details>

### Exercise 3: Comparative Analysis Query

Create a query showing each employee with:
- Their total sales
- The average sales of employees in their department
- The top performer in their department
- How they rank within their department

Use multiple LATERAL joins to gather this information.

<details>
<summary>Solution</summary>

```sql
SELECT
    e.employee_name,
    d.department_name,
    employee_sales.total_sales,
    dept_avg.avg_sales,
    top_performer.top_emp_name,
    top_performer.top_emp_sales,
    dept_rank.rank
FROM employees e
JOIN departments d ON e.department_id = d.department_id

-- Employee's own sales
LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(amount), 0) as total_sales
    FROM sales s
    WHERE s.employee_id = e.employee_id
) AS employee_sales ON true

-- Department average
CROSS JOIN LATERAL (
    SELECT AVG(emp_total)::NUMERIC(10,2) as avg_sales
    FROM (
        SELECT e2.employee_id, COALESCE(SUM(s.amount), 0) as emp_total
        FROM employees e2
        LEFT JOIN sales s ON e2.employee_id = s.employee_id
        WHERE e2.department_id = e.department_id
        GROUP BY e2.employee_id
    ) dept_sales
) AS dept_avg

-- Top performer in department
LEFT JOIN LATERAL (
    SELECT e3.employee_name as top_emp_name, SUM(s.amount) as top_emp_sales
    FROM employees e3
    JOIN sales s ON e3.employee_id = s.employee_id
    WHERE e3.department_id = e.department_id
    GROUP BY e3.employee_id, e3.employee_name
    ORDER BY SUM(s.amount) DESC
    LIMIT 1
) AS top_performer ON true

-- Employee's rank
CROSS JOIN LATERAL (
    SELECT COUNT(*) + 1 as rank
    FROM (
        SELECT e4.employee_id, COALESCE(SUM(s.amount), 0) as emp_total
        FROM employees e4
        LEFT JOIN sales s ON e4.employee_id = s.employee_id
        WHERE e4.department_id = e.department_id
        GROUP BY e4.employee_id
    ) ranked
    WHERE ranked.emp_total > employee_sales.total_sales
) AS dept_rank

ORDER BY d.department_name, dept_rank.rank;

/*
Result:
employee_name  | dept_name | total_sales | avg_sales | top_emp_name | top_emp_sales | rank
---------------+-----------+-------------+-----------+--------------+---------------+-----
Carol White    | Sales     | 165000.00   | 108000.00 | Carol White  | 165000.00     | 1
Alice Johnson  | Sales     | 119000.00   | 108000.00 | Carol White  | 165000.00     | 2
Bob Smith      | Sales     | 40000.00    | 108000.00 | Carol White  | 165000.00     | 3
...
*/
```
</details>

## Related Topics

- [Joins](./01-joins.md) - Foundation for understanding LATERAL
- [Subqueries](./02-subqueries.md) - LATERAL is a special type of subquery
- [Window Functions](../06-advanced-sql/02-window-functions.md) - Alternative for some LATERAL use cases
- [Common Table Expressions](../06-advanced-sql/01-ctes.md) - Can simplify complex LATERAL queries
- [Set-Returning Functions](../03-functions-and-operators/04-set-returning-functions.md) - Often used with LATERAL

## Additional Resources

- [PostgreSQL Documentation: LATERAL Subqueries](https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-LATERAL)
- [PostgreSQL Documentation: Set-Returning Functions](https://www.postgresql.org/docs/current/functions-srf.html)
- [Advanced SQL: LATERAL Join Examples](https://www.postgresql.org/docs/current/sql-select.html#SQL-FROM)
- [Performance Tuning: LATERAL vs Window Functions](https://wiki.postgresql.org/wiki/Window_Functions)
