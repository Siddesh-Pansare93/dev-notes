# EXPLAIN and EXPLAIN ANALYZE

## Theory

EXPLAIN is PostgreSQL's query planning and execution analysis tool. It shows how the query planner intends to execute a query, revealing the steps, estimated costs, and execution strategies. EXPLAIN ANALYZE goes further by actually executing the query and providing real-time statistics.

### Key Concepts

**Query Planner**: PostgreSQL's optimizer that determines the most efficient way to execute a query based on statistics, indexes, and table structure.

**Query Plan**: A tree of plan nodes representing operations like scans, joins, sorts, and aggregations.

**Cost Model**: PostgreSQL uses arbitrary cost units (not milliseconds) to estimate query expense. Costs represent disk I/O and CPU processing estimates.

**Execution Nodes**: Different operation types the planner can use:
- Sequential Scan: Full table scan
- Index Scan: Using an index to find specific rows
- Index Only Scan: Reading data directly from index
- Bitmap Heap Scan: Index scan for multiple rows
- Nested Loop: Join algorithm for small datasets
- Hash Join: Join algorithm using hash tables
- Merge Join: Join algorithm for pre-sorted data
- Sort: Ordering operation
- Aggregate: GROUP BY or aggregate function processing

**Buffer Usage**: Tracks how many blocks were read from shared buffers (cache) vs disk.

**MVCC Impact**: Due to Multi-Version Concurrency Control, the planner must account for tuple visibility and dead tuples.

### Why EXPLAIN Matters

Understanding query plans helps you:
- Identify missing or unused indexes
- Spot inefficient join strategies
- Detect full table scans on large tables
- Find operations causing high memory or disk usage
- Optimize query performance systematically

## Syntax

```sql
-- Basic EXPLAIN (doesn't execute query)
EXPLAIN query;

-- EXPLAIN ANALYZE (executes query and shows actual times)
EXPLAIN ANALYZE query;

-- EXPLAIN with options
EXPLAIN (option1 [value], option2 [value], ...) query;

-- Common options
EXPLAIN (ANALYZE, BUFFERS) query;
EXPLAIN (ANALYZE, VERBOSE) query;
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) query;
EXPLAIN (ANALYZE, BUFFERS, FORMAT YAML) query;
EXPLAIN (ANALYZE, BUFFERS, FORMAT XML) query;
EXPLAIN (ANALYZE, COSTS, TIMING) query;

-- Options explained
ANALYZE    -- Actually execute the query and show real statistics
VERBOSE    -- Display additional information
COSTS      -- Include cost estimates (default: true)
BUFFERS    -- Show buffer usage statistics
TIMING     -- Include actual timing of each node (default: true when ANALYZE)
SUMMARY    -- Include summary statistics (default: true when ANALYZE)
SETTINGS   -- Include configuration settings that affect query planning
WAL        -- Include WAL generation statistics
FORMAT     -- Output format: TEXT (default), JSON, YAML, XML
```

### Reading Plan Output

```
Plan Node Name
  (cost=startup_cost..total_cost rows=estimated_rows width=estimated_bytes)
  (actual time=first_row..last_row rows=actual_rows loops=times_executed)
```

- **startup_cost**: Cost to get first row
- **total_cost**: Cost to get all rows
- **rows**: Estimated number of rows
- **width**: Estimated average row size in bytes
- **actual time**: Actual time in milliseconds (first row..last row)
- **actual rows**: Actual number of rows returned
- **loops**: Number of times node was executed

## Examples

### Example 1: Basic EXPLAIN

```sql
-- Create sample table
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    department VARCHAR(50),
    salary DECIMAL(10,2),
    hire_date DATE
);

-- Insert sample data
INSERT INTO employees (name, department, salary, hire_date)
SELECT
    'Employee ' || i,
    CASE (i % 5)
        WHEN 0 THEN 'Engineering'
        WHEN 1 THEN 'Sales'
        WHEN 2 THEN 'Marketing'
        WHEN 3 THEN 'HR'
        ELSE 'Finance'
    END,
    30000 + (i % 100) * 1000,
    '2020-01-01'::date + (i % 1000)
FROM generate_series(1, 10000) i;

-- Basic EXPLAIN
EXPLAIN SELECT * FROM employees WHERE department = 'Engineering';

-- Output shows:
-- Seq Scan on employees  (cost=0.00..180.00 rows=2000 width=...)
--   Filter: ((department)::text = 'Engineering'::text)
```

### Example 2: EXPLAIN ANALYZE

```sql
-- EXPLAIN ANALYZE actually runs the query
EXPLAIN ANALYZE
SELECT * FROM employees WHERE salary > 75000;

-- Output includes actual execution statistics:
-- Seq Scan on employees  (cost=0.00..180.00 rows=2500 width=48)
--                        (actual time=0.015..2.145 rows=2600 loops=1)
--   Filter: (salary > 75000)
--   Rows Removed by Filter: 7400
-- Planning Time: 0.123 ms
-- Execution Time: 2.456 ms
```

### Example 3: Index Scan vs Sequential Scan

```sql
-- Without index - Sequential Scan
EXPLAIN ANALYZE
SELECT * FROM employees WHERE department = 'Engineering';

-- Create index
CREATE INDEX idx_employees_department ON employees(department);

-- With index - Index Scan or Bitmap Heap Scan
EXPLAIN ANALYZE
SELECT * FROM employees WHERE department = 'Engineering';

-- Index Scan output:
-- Index Scan using idx_employees_department on employees
--   (cost=0.29..120.45 rows=2000 width=48)
--   (actual time=0.018..0.856 rows=2000 loops=1)
--   Index Cond: ((department)::text = 'Engineering'::text)
```

### Example 4: BUFFERS Option

```sql
-- Show buffer usage
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM employees WHERE salary > 50000;

-- Output includes buffer statistics:
-- Seq Scan on employees  (cost=0.00..180.00 rows=5000 width=48)
--                        (actual time=0.012..1.856 rows=5100 loops=1)
--   Filter: (salary > 50000)
--   Rows Removed by Filter: 4900
--   Buffers: shared hit=80
-- Planning:
--   Buffers: shared hit=8
-- Planning Time: 0.234 ms
-- Execution Time: 2.145 ms

-- Buffers explained:
-- shared hit = blocks found in cache
-- shared read = blocks read from disk
-- shared dirtied = blocks modified
-- shared written = blocks written to disk
```

### Example 5: JOIN Operations

```sql
-- Create related table
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50),
    budget DECIMAL(12,2)
);

INSERT INTO departments (name, budget)
VALUES
    ('Engineering', 1000000),
    ('Sales', 750000),
    ('Marketing', 500000),
    ('HR', 300000),
    ('Finance', 600000);

-- Add foreign key
ALTER TABLE employees ADD COLUMN dept_id INTEGER;
UPDATE employees e SET dept_id = d.id
FROM departments d WHERE e.department = d.name;

CREATE INDEX idx_employees_dept_id ON employees(dept_id);

-- Nested Loop Join (small tables)
EXPLAIN ANALYZE
SELECT e.name, d.name, d.budget
FROM employees e
JOIN departments d ON e.dept_id = d.id
WHERE d.budget > 500000;

-- Output shows join strategy:
-- Nested Loop  (cost=0.29..245.67 rows=4000 width=...)
--              (actual time=0.025..3.456 rows=4000 loops=1)
--   ->  Seq Scan on departments d  (cost=0.00..1.06 rows=2 width=...)
--       Filter: (budget > 500000)
--   ->  Index Scan using idx_employees_dept_id on employees e
--       Index Cond: (dept_id = d.id)
```

### Example 6: Hash Join

```sql
-- Create larger table for hash join demonstration
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER,
    order_date DATE,
    amount DECIMAL(10,2)
);

INSERT INTO orders (employee_id, order_date, amount)
SELECT
    (random() * 10000)::INTEGER + 1,
    '2023-01-01'::date + (random() * 365)::INTEGER,
    (random() * 10000)::DECIMAL(10,2)
FROM generate_series(1, 50000);

CREATE INDEX idx_orders_employee_id ON orders(employee_id);

-- Hash Join for larger datasets
EXPLAIN (ANALYZE, BUFFERS)
SELECT e.name, COUNT(o.id), SUM(o.amount)
FROM employees e
JOIN orders o ON e.id = o.employee_id
GROUP BY e.name;

-- Output shows Hash Join:
-- HashAggregate  (cost=1250.00..1275.00 rows=2000 width=...)
--   Group Key: e.name
--   ->  Hash Join  (cost=250.00..1125.00 rows=50000 width=...)
--     Hash Cond: (o.employee_id = e.id)
--     ->  Seq Scan on orders o
--     ->  Hash  (cost=180.00..180.00 rows=10000 width=...)
--       ->  Seq Scan on employees e
```

### Example 7: Sort Operations

```sql
-- Sort operation
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM employees
ORDER BY salary DESC, name
LIMIT 100;

-- Output shows Sort node:
-- Limit  (cost=789.14..791.39 rows=100 width=48)
--   ->  Sort  (cost=789.14..814.14 rows=10000 width=48)
--     Sort Key: salary DESC, name
--     Sort Method: top-N heapsort  Memory: 25kB
--     ->  Seq Scan on employees
```

### Example 8: Bitmap Heap Scan

```sql
-- Bitmap scan for multiple matching rows
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM employees
WHERE department IN ('Engineering', 'Sales', 'Marketing');

-- Output shows Bitmap Heap Scan:
-- Bitmap Heap Scan on employees  (cost=68.50..350.25 rows=6000 width=48)
--   Recheck Cond: (department = ANY ('{Engineering,Sales,Marketing}'))
--   Heap Blocks: exact=75
--   Buffers: shared hit=80
--   ->  Bitmap Index Scan on idx_employees_department
--     Index Cond: (department = ANY ('{...}'))
--     Buffers: shared hit=5
```

### Example 9: Index Only Scan

```sql
-- Create covering index
CREATE INDEX idx_employees_dept_salary ON employees(department, salary);

-- Run VACUUM to update visibility map
VACUUM ANALYZE employees;

-- Index Only Scan (no heap access needed)
EXPLAIN (ANALYZE, BUFFERS)
SELECT department, MAX(salary)
FROM employees
GROUP BY department;

-- Output shows Index Only Scan:
-- HashAggregate  (cost=250.00..252.00 rows=5 width=...)
--   Group Key: department
--   ->  Index Only Scan using idx_employees_dept_salary
--     Heap Fetches: 0  -- No heap access needed!
--     Buffers: shared hit=45
```

### Example 10: JSON Format Output

```sql
-- JSON format for programmatic analysis
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT * FROM employees WHERE salary > 60000;

-- Returns JSON structure:
-- [
--   {
--     "Plan": {
--       "Node Type": "Seq Scan",
--       "Relation Name": "employees",
--       "Alias": "employees",
--       "Startup Cost": 0.00,
--       "Total Cost": 180.00,
--       "Plan Rows": 4000,
--       "Plan Width": 48,
--       "Actual Startup Time": 0.015,
--       "Actual Total Time": 2.145,
--       "Actual Rows": 4100,
--       "Actual Loops": 1,
--       "Filter": "(salary > 60000)",
--       "Rows Removed by Filter": 5900,
--       "Shared Hit Blocks": 80
--     },
--     "Planning Time": 0.123,
--     "Execution Time": 2.456
--   }
-- ]
```

### Example 11: auto_explain Extension

```sql
-- Enable auto_explain to log slow queries automatically
-- Add to postgresql.conf or enable in session:

-- Load extension (requires superuser)
LOAD 'auto_explain';

-- Configure auto_explain (session level)
SET auto_explain.log_min_duration = 100; -- Log queries taking > 100ms
SET auto_explain.log_analyze = true;
SET auto_explain.log_buffers = true;
SET auto_explain.log_timing = true;
SET auto_explain.log_verbose = true;
SET auto_explain.log_nested_statements = true;

-- Now slow queries will be automatically logged
SELECT * FROM employees e
JOIN orders o ON e.id = o.employee_id
WHERE e.salary > 70000
ORDER BY o.amount DESC;

-- Check PostgreSQL logs for auto_explain output
```

### Example 12: Comparing Estimates vs Actuals

```sql
-- Run with ANALYZE to see estimation accuracy
EXPLAIN ANALYZE
SELECT department, AVG(salary)
FROM employees
WHERE hire_date > '2022-01-01'
GROUP BY department;

-- Look for mismatches between estimated rows and actual rows:
-- HashAggregate  (cost=195.00..197.00 rows=5 width=...)
--                (actual time=2.145..2.156 rows=5 loops=1)
--   Group Key: department
--   ->  Seq Scan on employees  (cost=0.00..180.00 rows=1500 width=...)
--                              (actual time=0.015..1.856 rows=1800 loops=1)
--     Filter: (hire_date > '2022-01-01')

-- If estimates are way off, run ANALYZE
ANALYZE employees;
```

## Common Mistakes

### 1. Not Using ANALYZE When Needed
```sql
-- Wrong: Just looking at estimates
EXPLAIN SELECT * FROM employees WHERE salary > 50000;

-- Right: Actually measure performance
EXPLAIN ANALYZE SELECT * FROM employees WHERE salary > 50000;
```

### 2. Running EXPLAIN ANALYZE on Destructive Queries in Production
```sql
-- Dangerous: ANALYZE actually executes the query!
EXPLAIN ANALYZE DELETE FROM employees WHERE salary < 30000;
-- This WILL delete the data!

-- Safe: Use EXPLAIN only, or wrap in transaction
BEGIN;
EXPLAIN ANALYZE DELETE FROM employees WHERE salary < 30000;
ROLLBACK;
```

### 3. Ignoring Large Estimate vs Actual Differences
```sql
-- If you see this:
-- Seq Scan  (cost=0.00..100.00 rows=5000 width=48)
--           (actual time=0.015..2.145 rows=50 loops=1)
-- Estimated 5000 rows, got only 50!

-- Fix: Update statistics
ANALYZE employees;
```

### 4. Not Checking BUFFERS
```sql
-- Incomplete analysis
EXPLAIN ANALYZE SELECT * FROM employees;

-- Better: Shows cache hits vs disk reads
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM employees;
-- If you see "shared read" instead of "shared hit", data is coming from disk
```

### 5. Misunderstanding Cost Units
```sql
-- Wrong assumption: "cost=100" means 100ms
-- Cost units are arbitrary, not time!

-- Right: Use actual time from EXPLAIN ANALYZE
-- Execution Time: 2.456 ms  <- This is real time
```

### 6. Forgetting About loops
```sql
-- This node ran 1000 times!
-- Nested Loop  (cost=0.29..8.31 rows=1 width=48)
--              (actual time=0.015..0.025 rows=1 loops=1000)

-- Total time = 0.025 ms * 1000 loops = 25 ms
-- Always multiply actual time by loops!
```

### 7. Not Considering VACUUM for Index Only Scans
```sql
-- Index Only Scan but still accessing heap
EXPLAIN ANALYZE
SELECT department FROM employees;

-- Heap Fetches: 9500  <- Not truly "index only"

-- Fix: Run VACUUM to update visibility map
VACUUM employees;
-- Now: Heap Fetches: 0
```

## Best Practices

### 1. Always Use ANALYZE for Real Performance Issues
When investigating slow queries in development/staging, use EXPLAIN ANALYZE to get actual timing and row counts.

### 2. Include BUFFERS for I/O Analysis
```sql
EXPLAIN (ANALYZE, BUFFERS) query;
-- Shows whether data is cached or requires disk reads
```

### 3. Look for These Red Flags
- Sequential scans on large tables when filtering for specific rows
- Estimated rows wildly different from actual rows
- High "Rows Removed by Filter" counts
- Expensive sorts that could use indexes
- Nested loops with high loop counts on large tables

### 4. Use Transactions for Destructive Queries
```sql
BEGIN;
EXPLAIN ANALYZE DELETE FROM table WHERE condition;
-- Review the plan
ROLLBACK; -- or COMMIT if satisfied
```

### 5. Keep Statistics Updated
Run ANALYZE regularly, especially after significant data changes:
```sql
ANALYZE; -- All tables
ANALYZE employees; -- Specific table
```

### 6. Use JSON Format for Tooling
```sql
EXPLAIN (ANALYZE, FORMAT JSON) query;
-- Easier to parse programmatically
```

### 7. Enable auto_explain for Production Monitoring
Set it to log only slow queries:
```sql
-- In postgresql.conf
shared_preload_libraries = 'auto_explain'
auto_explain.log_min_duration = 1000 -- 1 second
auto_explain.log_analyze = true
auto_explain.log_buffers = true
```

### 8. Focus on Highest Cost Nodes First
When optimizing, start with the most expensive nodes (highest cost or actual time).

### 9. Consider Work_mem for Sort and Hash Operations
If you see "Sort Method: external merge Disk", increase work_mem:
```sql
SET work_mem = '256MB';
EXPLAIN ANALYZE SELECT * FROM employees ORDER BY salary;
```

### 10. Compare Different Query Formulations
```sql
-- Test multiple approaches
EXPLAIN ANALYZE SELECT ... WHERE id IN (SELECT ...);
EXPLAIN ANALYZE SELECT ... WHERE EXISTS (SELECT ...);
EXPLAIN ANALYZE SELECT ... JOIN ... ON ...;
-- Choose the one with best actual performance
```

## Practice Exercises

### Exercise 1: Analyzing Index Usage
Create a table with 100,000 rows and compare query plans with and without indexes.

```sql
-- Create table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    category VARCHAR(50),
    price DECIMAL(10,2),
    stock_quantity INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert data
INSERT INTO products (name, category, price, stock_quantity)
SELECT
    'Product ' || i,
    CASE (i % 10)
        WHEN 0 THEN 'Electronics'
        WHEN 1 THEN 'Clothing'
        WHEN 2 THEN 'Books'
        WHEN 3 THEN 'Food'
        WHEN 4 THEN 'Toys'
        ELSE 'Home'
    END,
    (random() * 1000)::DECIMAL(10,2),
    (random() * 100)::INTEGER
FROM generate_series(1, 100000) i;

-- Tasks:
-- 1. Run EXPLAIN ANALYZE on: SELECT * FROM products WHERE category = 'Electronics';
-- 2. Note the execution time and scan type
-- 3. Create an index on category
-- 4. Run the same query again with EXPLAIN ANALYZE
-- 5. Compare the results - what changed?
-- 6. Use BUFFERS option to see cache hits
```

### Exercise 2: Join Strategy Analysis
Investigate different join strategies based on table sizes.

```sql
-- Create tables
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100)
);

CREATE TABLE purchases (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    product_id INTEGER,
    purchase_date DATE,
    quantity INTEGER
);

-- Insert customers (10,000 rows)
INSERT INTO customers (name, email)
SELECT
    'Customer ' || i,
    'customer' || i || '@example.com'
FROM generate_series(1, 10000) i;

-- Insert purchases (500,000 rows)
INSERT INTO purchases (customer_id, product_id, purchase_date, quantity)
SELECT
    (random() * 10000)::INTEGER + 1,
    (random() * 100000)::INTEGER + 1,
    '2023-01-01'::date + (random() * 730)::INTEGER,
    (random() * 10)::INTEGER + 1
FROM generate_series(1, 500000) i;

-- Tasks:
-- 1. Run EXPLAIN ANALYZE on:
--    SELECT c.name, COUNT(p.id)
--    FROM customers c
--    JOIN purchases p ON c.id = p.customer_id
--    GROUP BY c.name;
-- 2. Identify the join strategy used (Nested Loop, Hash Join, or Merge Join)
-- 3. Add appropriate indexes and rerun
-- 4. Compare execution times and strategies
-- 5. Try adding WHERE clause to filter results and observe plan changes
```

### Exercise 3: Identifying and Fixing Slow Query
Debug a slow query using EXPLAIN ANALYZE and optimize it.

```sql
-- Setup
CREATE TABLE blog_posts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200),
    content TEXT,
    author_id INTEGER,
    published_date DATE,
    view_count INTEGER,
    is_published BOOLEAN
);

CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER,
    user_id INTEGER,
    comment_text TEXT,
    created_at TIMESTAMP
);

-- Insert data
INSERT INTO blog_posts (title, content, author_id, published_date, view_count, is_published)
SELECT
    'Post ' || i,
    'Content for post ' || i || ' with lots of text...',
    (random() * 100)::INTEGER + 1,
    '2020-01-01'::date + (random() * 1460)::INTEGER,
    (random() * 10000)::INTEGER,
    random() > 0.2
FROM generate_series(1, 50000) i;

INSERT INTO comments (post_id, user_id, comment_text, created_at)
SELECT
    (random() * 50000)::INTEGER + 1,
    (random() * 1000)::INTEGER + 1,
    'Comment text ' || i,
    '2020-01-01'::timestamp + (random() * 1460 || ' days')::INTERVAL
FROM generate_series(1, 200000) i;

-- Slow query
SELECT
    bp.title,
    bp.view_count,
    COUNT(c.id) as comment_count
FROM blog_posts bp
LEFT JOIN comments c ON bp.id = c.post_id
WHERE
    bp.is_published = true
    AND EXTRACT(YEAR FROM bp.published_date) = 2023
GROUP BY bp.id, bp.title, bp.view_count
ORDER BY bp.view_count DESC
LIMIT 20;

-- Tasks:
-- 1. Run EXPLAIN (ANALYZE, BUFFERS) on the query above
-- 2. Identify the slowest operations
-- 3. Look for sequential scans, sorts, high filter removal
-- 4. Create appropriate indexes to optimize the query
-- 5. Rewrite query if needed (e.g., date comparison)
-- 6. Measure improvement in execution time
-- 7. Explain why your optimizations helped
```

## Summary

EXPLAIN and EXPLAIN ANALYZE are essential tools for understanding and optimizing PostgreSQL query performance. EXPLAIN shows the planner's intended strategy, while EXPLAIN ANALYZE provides actual execution statistics. Key points to remember:

- Use EXPLAIN ANALYZE for real performance measurement
- Include BUFFERS to understand I/O patterns
- Compare estimated vs actual rows to detect stale statistics
- Look for sequential scans, expensive sorts, and inefficient joins
- Keep statistics updated with ANALYZE
- Use auto_explain extension for production monitoring
- Always wrap destructive queries in transactions when using EXPLAIN ANALYZE

For more performance topics, see:
- [Query Optimization](./02-query-optimization.md)
- [VACUUM and Autovacuum](./03-vacuum-autovacuum.md)
- [Configuration Tuning](./05-configuration-tuning.md)
