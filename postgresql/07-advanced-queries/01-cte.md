# Common Table Expressions (CTEs)

## Table of Contents
- [Theory](#theory)
- [Syntax](#syntax)
- [Examples](#examples)
- [Common Mistakes](#common-mistakes)
- [Best Practices](#best-practices)
- [Practice Exercises](#practice-exercises)

## Theory

### What are CTEs?

Common Table Expressions (CTEs) are temporary named result sets that exist only during the execution of a single SQL statement. They are defined using the `WITH` clause and provide a way to write more readable and maintainable complex queries.

### Benefits Over Subqueries

1. **Readability**: CTEs allow you to break complex queries into logical, named parts
2. **Reusability**: A single CTE can be referenced multiple times in the main query
3. **Maintainability**: Easier to debug and modify specific parts of complex queries
4. **Recursion**: CTEs support recursive queries, which subqueries cannot do
5. **Organization**: Helps organize query logic in a top-down, procedural manner

### CTE Types

**Non-Recursive CTEs**: Standard temporary result sets
**Recursive CTEs**: Self-referencing CTEs that can traverse hierarchical data

### CTE Materialization

PostgreSQL 12+ introduced optimization fences for CTEs:

- **MATERIALIZED**: Forces CTE evaluation once, stores result in memory/disk
- **NOT MATERIALIZED**: Allows optimizer to inline CTE (like a subquery)
- **Default behavior**: PostgreSQL 12+ treats CTEs as NOT MATERIALIZED unless recursive or used multiple times

### When to Use CTEs

- Breaking down complex queries into understandable steps
- Recursive operations (hierarchies, graphs, series generation)
- Multiple references to the same intermediate result
- Improving query readability for maintenance
- Data modification statements that need to reference their own results

## Syntax

### Basic CTE Syntax

```sql
WITH cte_name AS (
    SELECT ...
)
SELECT * FROM cte_name;
```

### Multiple CTEs

```sql
WITH
    cte1 AS (SELECT ...),
    cte2 AS (SELECT ...),
    cte3 AS (SELECT ... FROM cte1 JOIN cte2 ...)
SELECT * FROM cte3;
```

### Materialization Hints

```sql
-- Force materialization
WITH cte_name AS MATERIALIZED (
    SELECT ...
)
SELECT * FROM cte_name;

-- Prevent materialization (inline)
WITH cte_name AS NOT MATERIALIZED (
    SELECT ...
)
SELECT * FROM cte_name;
```

### Recursive CTE Syntax

```sql
WITH RECURSIVE cte_name AS (
    -- Base case (non-recursive term)
    SELECT ...

    UNION [ALL]

    -- Recursive term (references cte_name)
    SELECT ... FROM cte_name WHERE ...
)
SELECT * FROM cte_name;
```

### Cycle Detection (PostgreSQL 14+)

```sql
WITH RECURSIVE cte_name AS (
    SELECT ... , ARRAY[id] AS path
    UNION ALL
    SELECT ... , path || id
    FROM cte_name
    WHERE NOT id = ANY(path)  -- Manual cycle detection
)
SELECT * FROM cte_name;

-- Using CYCLE clause (PG14+)
WITH RECURSIVE cte_name AS (
    SELECT ...
    UNION ALL
    SELECT ...
)
CYCLE id SET is_cycle USING path
SELECT * FROM cte_name;
```

## Examples

### Example 1: Basic CTE for Readability

```sql
-- Without CTE (harder to read)
SELECT e.employee_name, e.salary
FROM employees e
WHERE e.salary > (
    SELECT AVG(salary) FROM employees WHERE department_id = e.department_id
);

-- With CTE (clearer intent)
WITH dept_avg_salaries AS (
    SELECT
        department_id,
        AVG(salary) AS avg_salary
    FROM employees
    GROUP BY department_id
)
SELECT
    e.employee_name,
    e.salary,
    d.avg_salary,
    e.salary - d.avg_salary AS difference
FROM employees e
JOIN dept_avg_salaries d ON e.department_id = d.department_id
WHERE e.salary > d.avg_salary;
```

### Example 2: Multiple CTEs

```sql
-- Analyzing sales performance with multiple CTEs
WITH
    monthly_sales AS (
        SELECT
            DATE_TRUNC('month', order_date) AS month,
            SUM(total_amount) AS total_sales,
            COUNT(*) AS order_count
        FROM orders
        WHERE order_date >= '2024-01-01'
        GROUP BY DATE_TRUNC('month', order_date)
    ),
    avg_metrics AS (
        SELECT
            AVG(total_sales) AS avg_monthly_sales,
            AVG(order_count) AS avg_monthly_orders
        FROM monthly_sales
    ),
    performance_comparison AS (
        SELECT
            ms.month,
            ms.total_sales,
            ms.order_count,
            am.avg_monthly_sales,
            am.avg_monthly_orders,
            CASE
                WHEN ms.total_sales > am.avg_monthly_sales THEN 'Above Average'
                WHEN ms.total_sales < am.avg_monthly_sales THEN 'Below Average'
                ELSE 'Average'
            END AS performance
        FROM monthly_sales ms
        CROSS JOIN avg_metrics am
    )
SELECT
    TO_CHAR(month, 'YYYY-MM') AS month,
    total_sales,
    order_count,
    ROUND(avg_monthly_sales, 2) AS avg_sales,
    performance
FROM performance_comparison
ORDER BY month;
```

### Example 3: CTE Materialization Control

```sql
-- Setup test table
CREATE TABLE large_table (
    id SERIAL PRIMARY KEY,
    category TEXT,
    value NUMERIC
);

INSERT INTO large_table (category, value)
SELECT
    'Category' || (random() * 10)::INT,
    random() * 1000
FROM generate_series(1, 1000000);

-- Default behavior (PG12+): NOT MATERIALIZED when used once
WITH filtered_data AS (
    SELECT * FROM large_table WHERE category = 'Category5'
)
SELECT COUNT(*) FROM filtered_data;

-- Force materialization (useful when CTE is expensive and used multiple times)
WITH filtered_data AS MATERIALIZED (
    SELECT category, AVG(value) AS avg_value
    FROM large_table
    GROUP BY category
)
SELECT
    f1.category,
    f1.avg_value,
    f2.avg_value
FROM filtered_data f1
CROSS JOIN filtered_data f2
WHERE f1.category < f2.category;

-- Prevent materialization (inline for optimization)
WITH small_filter AS NOT MATERIALIZED (
    SELECT id FROM large_table WHERE value > 500
)
SELECT *
FROM large_table l
WHERE l.id IN (SELECT id FROM small_filter);
```

### Example 4: Recursive CTE - Organization Chart

```sql
-- Setup employee hierarchy
CREATE TABLE employees_hierarchy (
    employee_id INT PRIMARY KEY,
    employee_name TEXT,
    manager_id INT,
    title TEXT,
    salary NUMERIC
);

INSERT INTO employees_hierarchy VALUES
(1, 'Alice CEO', NULL, 'CEO', 200000),
(2, 'Bob CTO', 1, 'CTO', 150000),
(3, 'Carol CFO', 1, 'CFO', 150000),
(4, 'David Dev Manager', 2, 'Engineering Manager', 120000),
(5, 'Eve Finance Manager', 3, 'Finance Manager', 110000),
(6, 'Frank Senior Dev', 4, 'Senior Developer', 100000),
(7, 'Grace Senior Dev', 4, 'Senior Developer', 100000),
(8, 'Henry Accountant', 5, 'Senior Accountant', 80000),
(9, 'Ivy Junior Dev', 6, 'Junior Developer', 70000),
(10, 'Jack Junior Dev', 7, 'Junior Developer', 70000);

-- Recursive query to show full org hierarchy
WITH RECURSIVE org_chart AS (
    -- Base case: top-level employees (no manager)
    SELECT
        employee_id,
        employee_name,
        manager_id,
        title,
        salary,
        1 AS level,
        employee_name AS path,
        ARRAY[employee_id] AS id_path
    FROM employees_hierarchy
    WHERE manager_id IS NULL

    UNION ALL

    -- Recursive term: employees with managers
    SELECT
        e.employee_id,
        e.employee_name,
        e.manager_id,
        e.title,
        e.salary,
        oc.level + 1,
        oc.path || ' > ' || e.employee_name,
        oc.id_path || e.employee_id
    FROM employees_hierarchy e
    JOIN org_chart oc ON e.manager_id = oc.employee_id
)
SELECT
    REPEAT('  ', level - 1) || employee_name AS org_structure,
    title,
    salary,
    level,
    path
FROM org_chart
ORDER BY id_path;
```

### Example 5: Recursive CTE - Tree Traversal

```sql
-- Setup category tree
CREATE TABLE categories (
    category_id INT PRIMARY KEY,
    category_name TEXT,
    parent_category_id INT
);

INSERT INTO categories VALUES
(1, 'Electronics', NULL),
(2, 'Computers', 1),
(3, 'Phones', 1),
(4, 'Laptops', 2),
(5, 'Desktops', 2),
(6, 'Gaming Laptops', 4),
(7, 'Business Laptops', 4),
(8, 'Smartphones', 3),
(9, 'Feature Phones', 3),
(10, 'Gaming Phones', 8);

-- Find all descendants of a category
WITH RECURSIVE category_tree AS (
    -- Base: start with 'Computers'
    SELECT
        category_id,
        category_name,
        parent_category_id,
        0 AS depth,
        ARRAY[category_id] AS path
    FROM categories
    WHERE category_name = 'Computers'

    UNION ALL

    -- Recursive: find children
    SELECT
        c.category_id,
        c.category_name,
        c.parent_category_id,
        ct.depth + 1,
        ct.path || c.category_id
    FROM categories c
    JOIN category_tree ct ON c.parent_category_id = ct.category_id
)
SELECT
    REPEAT('--', depth) || category_name AS category_hierarchy,
    depth,
    array_to_string(path, ' > ') AS path_ids
FROM category_tree
ORDER BY path;

-- Find all ancestors of a category (bottom-up)
WITH RECURSIVE category_ancestors AS (
    -- Base: start with 'Gaming Laptops'
    SELECT
        category_id,
        category_name,
        parent_category_id,
        0 AS levels_up
    FROM categories
    WHERE category_name = 'Gaming Laptops'

    UNION ALL

    -- Recursive: find parents
    SELECT
        c.category_id,
        c.category_name,
        c.parent_category_id,
        ca.levels_up + 1
    FROM categories c
    JOIN category_ancestors ca ON c.category_id = ca.parent_category_id
)
SELECT
    category_name,
    levels_up,
    CASE levels_up
        WHEN 0 THEN 'Self'
        WHEN 1 THEN 'Parent'
        WHEN 2 THEN 'Grandparent'
        ELSE 'Ancestor Level ' || levels_up
    END AS relationship
FROM category_ancestors
ORDER BY levels_up;
```

### Example 6: Recursive CTE - Generating Series

```sql
-- Generate date series for last 30 days
WITH RECURSIVE date_series AS (
    SELECT CURRENT_DATE - INTERVAL '29 days' AS date

    UNION ALL

    SELECT date + INTERVAL '1 day'
    FROM date_series
    WHERE date < CURRENT_DATE
)
SELECT
    date,
    TO_CHAR(date, 'Day') AS day_name,
    EXTRACT(DOW FROM date) AS day_of_week
FROM date_series
ORDER BY date;

-- Generate Fibonacci sequence
WITH RECURSIVE fibonacci AS (
    SELECT
        1 AS n,
        0::BIGINT AS fib_n,
        1::BIGINT AS fib_n_plus_1

    UNION ALL

    SELECT
        n + 1,
        fib_n_plus_1,
        fib_n + fib_n_plus_1
    FROM fibonacci
    WHERE n < 20
)
SELECT
    n,
    fib_n AS fibonacci_number
FROM fibonacci;
```

### Example 7: Cycle Detection (PostgreSQL 14+)

```sql
-- Setup graph with cycle
CREATE TABLE graph_nodes (
    node_id INT PRIMARY KEY,
    node_name TEXT
);

CREATE TABLE graph_edges (
    from_node INT REFERENCES graph_nodes(node_id),
    to_node INT REFERENCES graph_nodes(node_id),
    PRIMARY KEY (from_node, to_node)
);

INSERT INTO graph_nodes VALUES
(1, 'A'), (2, 'B'), (3, 'C'), (4, 'D'), (5, 'E');

INSERT INTO graph_edges VALUES
(1, 2), (2, 3), (3, 4), (4, 2), (3, 5);  -- Note: 2->3->4->2 is a cycle

-- Manual cycle detection (works in all versions)
WITH RECURSIVE graph_traversal AS (
    SELECT
        node_id,
        node_name,
        ARRAY[node_id] AS path,
        false AS has_cycle
    FROM graph_nodes
    WHERE node_id = 1

    UNION ALL

    SELECT
        n.node_id,
        n.node_name,
        gt.path || n.node_id,
        n.node_id = ANY(gt.path) AS has_cycle
    FROM graph_nodes n
    JOIN graph_edges e ON n.node_id = e.to_node
    JOIN graph_traversal gt ON e.from_node = gt.node_id
    WHERE NOT (n.node_id = ANY(gt.path))  -- Prevent infinite recursion
)
SELECT
    node_name,
    array_to_string(path, ' -> ') AS traversal_path,
    has_cycle
FROM graph_traversal
ORDER BY array_length(path, 1), path;

-- Using CYCLE clause (PostgreSQL 14+)
WITH RECURSIVE graph_traversal AS (
    SELECT
        node_id,
        node_name,
        ARRAY[node_name] AS path
    FROM graph_nodes
    WHERE node_id = 1

    UNION ALL

    SELECT
        n.node_id,
        n.node_name,
        gt.path || n.node_name
    FROM graph_nodes n
    JOIN graph_edges e ON n.node_id = e.to_node
    JOIN graph_traversal gt ON e.from_node = gt.node_id
)
CYCLE node_id SET is_cycle USING cycle_path
SELECT
    node_name,
    array_to_string(path, ' -> ') AS traversal_path,
    is_cycle,
    cycle_path
FROM graph_traversal
ORDER BY array_length(path, 1), path;
```

### Example 8: Practical Recursive Example - Bill of Materials

```sql
-- Setup parts and assemblies
CREATE TABLE parts (
    part_id INT PRIMARY KEY,
    part_name TEXT,
    unit_cost NUMERIC(10, 2)
);

CREATE TABLE part_assemblies (
    parent_part_id INT REFERENCES parts(part_id),
    child_part_id INT REFERENCES parts(part_id),
    quantity INT,
    PRIMARY KEY (parent_part_id, child_part_id)
);

INSERT INTO parts VALUES
(1, 'Bicycle', 0),
(2, 'Frame', 100),
(3, 'Wheel Assembly', 0),
(4, 'Wheel Rim', 30),
(5, 'Tire', 20),
(6, 'Spoke Set', 15),
(7, 'Handlebars', 25),
(8, 'Seat', 35);

INSERT INTO part_assemblies VALUES
(1, 2, 1),  -- Bicycle needs 1 Frame
(1, 3, 2),  -- Bicycle needs 2 Wheel Assemblies
(1, 7, 1),  -- Bicycle needs 1 Handlebars
(1, 8, 1),  -- Bicycle needs 1 Seat
(3, 4, 1),  -- Wheel Assembly needs 1 Rim
(3, 5, 1),  -- Wheel Assembly needs 1 Tire
(3, 6, 1);  -- Wheel Assembly needs 1 Spoke Set

-- Calculate total cost with BOM explosion
WITH RECURSIVE bom_explosion AS (
    -- Base: top-level product
    SELECT
        part_id,
        part_name,
        unit_cost,
        1 AS quantity,
        0 AS level,
        part_name AS path
    FROM parts
    WHERE part_name = 'Bicycle'

    UNION ALL

    -- Recursive: components
    SELECT
        p.part_id,
        p.part_name,
        p.unit_cost,
        bom.quantity * pa.quantity,
        bom.level + 1,
        bom.path || ' > ' || p.part_name
    FROM parts p
    JOIN part_assemblies pa ON p.part_id = pa.child_part_id
    JOIN bom_explosion bom ON pa.parent_part_id = bom.part_id
)
SELECT
    REPEAT('  ', level) || part_name AS component,
    quantity,
    unit_cost,
    quantity * unit_cost AS extended_cost,
    level,
    path
FROM bom_explosion
ORDER BY path;

-- Summary: total cost
WITH RECURSIVE bom_explosion AS (
    SELECT
        part_id,
        1 AS quantity,
        unit_cost
    FROM parts
    WHERE part_name = 'Bicycle'

    UNION ALL

    SELECT
        p.part_id,
        bom.quantity * pa.quantity,
        p.unit_cost
    FROM parts p
    JOIN part_assemblies pa ON p.part_id = pa.child_part_id
    JOIN bom_explosion bom ON pa.parent_part_id = bom.part_id
)
SELECT
    SUM(quantity * unit_cost) AS total_bicycle_cost
FROM bom_explosion
WHERE unit_cost > 0;  -- Only count leaf parts with actual costs
```

## Common Mistakes

### 1. Forgetting RECURSIVE Keyword

```sql
-- WRONG: Missing RECURSIVE keyword
WITH org_tree AS (
    SELECT employee_id, manager_id FROM employees WHERE manager_id IS NULL
    UNION ALL
    SELECT e.employee_id, e.manager_id
    FROM employees e JOIN org_tree o ON e.manager_id = o.employee_id
)
SELECT * FROM org_tree;  -- ERROR

-- CORRECT
WITH RECURSIVE org_tree AS (
    SELECT employee_id, manager_id FROM employees WHERE manager_id IS NULL
    UNION ALL
    SELECT e.employee_id, e.manager_id
    FROM employees e JOIN org_tree o ON e.manager_id = o.employee_id
)
SELECT * FROM org_tree;
```

### 2. Infinite Recursion

```sql
-- WRONG: No termination condition
WITH RECURSIVE infinite AS (
    SELECT 1 AS n
    UNION ALL
    SELECT n + 1 FROM infinite  -- Never stops!
)
SELECT * FROM infinite;  -- Will error after max recursion depth

-- CORRECT: Add termination condition
WITH RECURSIVE finite AS (
    SELECT 1 AS n
    UNION ALL
    SELECT n + 1 FROM finite WHERE n < 100
)
SELECT * FROM finite;
```

### 3. Using UNION Instead of UNION ALL in Recursive CTEs

```sql
-- WRONG: UNION removes duplicates (performance hit, may cause issues)
WITH RECURSIVE numbers AS (
    SELECT 1 AS n
    UNION  -- Should be UNION ALL
    SELECT n + 1 FROM numbers WHERE n < 1000
)
SELECT * FROM numbers;

-- CORRECT: Use UNION ALL unless you specifically need deduplication
WITH RECURSIVE numbers AS (
    SELECT 1 AS n
    UNION ALL
    SELECT n + 1 FROM numbers WHERE n < 1000
)
SELECT * FROM numbers;
```

### 4. Not Detecting Cycles in Graph Traversal

```sql
-- WRONG: Can cause infinite recursion if cycles exist
WITH RECURSIVE graph_walk AS (
    SELECT node_id, ARRAY[node_id] AS path FROM nodes WHERE node_id = 1
    UNION ALL
    SELECT e.to_node, gw.path || e.to_node
    FROM edges e JOIN graph_walk gw ON e.from_node = gw.node_id
    -- Missing cycle detection!
)
SELECT * FROM graph_walk;

-- CORRECT: Detect and prevent cycles
WITH RECURSIVE graph_walk AS (
    SELECT node_id, ARRAY[node_id] AS path FROM nodes WHERE node_id = 1
    UNION ALL
    SELECT e.to_node, gw.path || e.to_node
    FROM edges e JOIN graph_walk gw ON e.from_node = gw.node_id
    WHERE NOT e.to_node = ANY(gw.path)  -- Prevent cycles
)
SELECT * FROM graph_walk;
```

### 5. Over-Materializing CTEs

```sql
-- WRONG: Forcing materialization when not needed (PG12+)
WITH expensive_cte AS MATERIALIZED (
    SELECT * FROM small_table WHERE id = 123  -- Simple, fast query
)
SELECT * FROM expensive_cte;  -- Used only once, materialization overhead wasted

-- CORRECT: Let optimizer decide or use NOT MATERIALIZED
WITH expensive_cte AS NOT MATERIALIZED (
    SELECT * FROM small_table WHERE id = 123
)
SELECT * FROM expensive_cte;
```

## Best Practices

### 1. Use Descriptive CTE Names

```sql
-- Good: descriptive names
WITH
    high_value_customers AS (...),
    recent_orders AS (...),
    customer_lifetime_value AS (...)
SELECT ...;

-- Bad: cryptic names
WITH
    cte1 AS (...),
    temp AS (...),
    x AS (...)
SELECT ...;
```

### 2. Add Comments for Complex CTEs

```sql
WITH RECURSIVE employee_hierarchy AS (
    -- Base case: Find all C-level executives (no manager or reports to CEO)
    SELECT
        employee_id,
        employee_name,
        manager_id,
        1 AS level
    FROM employees
    WHERE manager_id IS NULL OR title LIKE 'C%O'

    UNION ALL

    -- Recursive case: Find direct reports at each level
    -- Stop at level 5 to prevent performance issues
    SELECT
        e.employee_id,
        e.employee_name,
        e.manager_id,
        eh.level + 1
    FROM employees e
    JOIN employee_hierarchy eh ON e.manager_id = eh.employee_id
    WHERE eh.level < 5
)
SELECT * FROM employee_hierarchy;
```

### 3. Always Include Termination Conditions in Recursive CTEs

```sql
WITH RECURSIVE countdown AS (
    SELECT 10 AS n
    UNION ALL
    SELECT n - 1
    FROM countdown
    WHERE n > 0  -- Essential termination condition
)
SELECT * FROM countdown;
```

### 4. Track Paths in Recursive Queries for Debugging

```sql
WITH RECURSIVE hierarchy AS (
    SELECT
        id,
        name,
        parent_id,
        ARRAY[id] AS path,  -- Track path
        ARRAY[name] AS name_path  -- Human-readable path
    FROM categories
    WHERE parent_id IS NULL

    UNION ALL

    SELECT
        c.id,
        c.name,
        c.parent_id,
        h.path || c.id,
        h.name_path || c.name
    FROM categories c
    JOIN hierarchy h ON c.parent_id = h.id
)
SELECT
    name,
    array_to_string(name_path, ' > ') AS full_path
FROM hierarchy;
```

### 5. Use CTEs for Data Modification Clarity

```sql
-- Clear multi-step modification with CTEs
WITH deleted_old_records AS (
    DELETE FROM orders
    WHERE created_at < CURRENT_DATE - INTERVAL '7 years'
    RETURNING *
),
archived_records AS (
    INSERT INTO orders_archive
    SELECT * FROM deleted_old_records
    RETURNING *
)
SELECT
    COUNT(*) AS archived_count,
    MIN(created_at) AS oldest_archived,
    MAX(created_at) AS newest_archived
FROM archived_records;
```

### 6. Consider Materialization for Multi-Use CTEs

```sql
-- CTE used multiple times: consider materializing
WITH expensive_aggregation AS MATERIALIZED (
    SELECT
        category,
        COUNT(*) AS count,
        AVG(price) AS avg_price
    FROM products
    GROUP BY category
)
SELECT
    e1.category AS cat1,
    e2.category AS cat2,
    e1.avg_price / e2.avg_price AS price_ratio
FROM expensive_aggregation e1
CROSS JOIN expensive_aggregation e2
WHERE e1.category <> e2.category;
```

### 7. Use Window Functions Instead of Self-Joining CTEs When Possible

```sql
-- Less efficient: CTE with self-join
WITH ranked_sales AS (
    SELECT
        salesperson,
        sale_amount,
        ROW_NUMBER() OVER (ORDER BY sale_amount DESC) AS rank
    FROM sales
)
SELECT * FROM ranked_sales WHERE rank <= 10;

-- More efficient: Direct window function (no CTE needed)
SELECT
    salesperson,
    sale_amount,
    ROW_NUMBER() OVER (ORDER BY sale_amount DESC) AS rank
FROM sales
QUALIFY rank <= 10;  -- PG with QUALIFY support, or use subquery
```

## Practice Exercises

### Exercise 1: Recursive Category Sales Analysis

Create a recursive query that:
1. Traverses a product category hierarchy
2. Calculates total sales for each category including all subcategories
3. Shows the percentage of sales each category represents
4. Includes the full category path

```sql
-- Setup
CREATE TABLE product_categories (
    category_id SERIAL PRIMARY KEY,
    category_name TEXT,
    parent_category_id INT REFERENCES product_categories(category_id)
);

CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    product_name TEXT,
    category_id INT REFERENCES product_categories(category_id),
    price NUMERIC(10, 2)
);

CREATE TABLE sales (
    sale_id SERIAL PRIMARY KEY,
    product_id INT REFERENCES products(product_id),
    quantity INT,
    sale_date DATE
);

-- Insert sample data
INSERT INTO product_categories (category_name, parent_category_id) VALUES
('All Products', NULL),
('Electronics', 1),
('Clothing', 1),
('Laptops', 2),
('Phones', 2),
('Mens', 3),
('Womens', 3);

INSERT INTO products (product_name, category_id, price) VALUES
('Gaming Laptop', 4, 1200),
('Business Laptop', 4, 900),
('iPhone', 5, 999),
('Android Phone', 5, 699),
('Mens Shirt', 6, 29.99),
('Mens Pants', 6, 49.99),
('Womens Dress', 7, 79.99);

INSERT INTO sales (product_id, quantity, sale_date) VALUES
(1, 5, '2024-01-15'),
(2, 3, '2024-01-16'),
(3, 10, '2024-01-17'),
(4, 7, '2024-01-18'),
(5, 20, '2024-01-19'),
(6, 15, '2024-01-20'),
(7, 25, '2024-01-21');

-- Your task: Write the recursive query here
```

### Exercise 2: Employee Reporting Chain with Salary Aggregation

Write a CTE-based query that:
1. Shows the complete reporting chain for each employee
2. Calculates the total salary cost for each manager (including all subordinates)
3. Shows span of control (number of direct and indirect reports)
4. Identifies the highest-paid person in each reporting chain

```sql
-- Use the employees_hierarchy table created earlier
-- Your task: Write the query here
```

### Exercise 3: Time Series Gap Filling

Create a query using CTEs that:
1. Generates a complete date series for the last 90 days
2. Left joins with actual sales data
3. Fills gaps with 0 for days with no sales
4. Calculates a 7-day moving average
5. Identifies the longest streak of days without sales

```sql
-- Setup
CREATE TABLE daily_sales (
    sale_date DATE PRIMARY KEY,
    total_amount NUMERIC(10, 2)
);

-- Insert sample data with gaps
INSERT INTO daily_sales (sale_date, total_amount) VALUES
('2024-01-01', 1500),
('2024-01-02', 2300),
('2024-01-05', 1800),  -- Gap: Jan 3-4
('2024-01-06', 2100),
('2024-01-10', 1900);  -- Gap: Jan 7-9

-- Your task: Write the query here
```

## Summary

Common Table Expressions are a powerful feature in PostgreSQL that improve query readability, enable recursive operations, and help organize complex SQL logic. Key takeaways:

- **Use CTEs** for breaking down complex queries into logical steps
- **Recursive CTEs** enable hierarchical and graph traversal queries
- **Materialization hints** (MATERIALIZED/NOT MATERIALIZED) control optimization in PostgreSQL 12+
- **Always include termination conditions** in recursive queries to prevent infinite loops
- **Track paths and detect cycles** when traversing graphs or hierarchies
- **Use descriptive names** and comments for maintainability

For more advanced query techniques, see:
- [Views and Materialized Views](02-views.md)
- [Conditional Expressions](03-conditional-expressions.md)
- [Full-Text Search](04-full-text-search.md)
