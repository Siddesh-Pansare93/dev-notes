# GROUP BY and HAVING

## Theory

The GROUP BY clause divides query results into groups of rows, enabling aggregation within each group rather than across the entire result set. HAVING filters groups after aggregation, while WHERE filters rows before aggregation. Together, they provide powerful tools for data analysis and reporting.

Key concepts:
- **Grouping**: Rows with the same values in GROUP BY columns form a group
- **Aggregation context**: Each group is treated as a unit for aggregate functions
- **Select list restriction**: Non-aggregated columns in SELECT must appear in GROUP BY
- **Execution order**: WHERE → GROUP BY → aggregate functions → HAVING → SELECT → ORDER BY
- **Advanced grouping**: GROUPING SETS, CUBE, and ROLLUP create multiple grouping levels in one query

PostgreSQL extensions:
- **GROUP BY aliases**: Can reference SELECT list column aliases (non-standard SQL)
- **GROUPING() function**: Identifies super-aggregate rows in CUBE/ROLLUP results
- **Flexible grouping**: Rich support for complex grouping patterns

## Syntax

### Basic GROUP BY

```sql
SELECT column1, column2, aggregate_function(column3)
FROM table_name
WHERE condition  -- Filters rows before grouping
GROUP BY column1, column2
HAVING aggregate_condition  -- Filters groups after aggregation
ORDER BY column1;
```

### GROUP BY with Expressions

```sql
GROUP BY expression
GROUP BY EXTRACT(year FROM date_column)
GROUP BY CASE WHEN ... THEN ... END
```

### GROUPING SETS

```sql
GROUP BY GROUPING SETS (
    (column1, column2),  -- First grouping
    (column1),           -- Second grouping
    ()                   -- Grand total
)
```

### ROLLUP

```sql
-- Creates hierarchical groupings from left to right
GROUP BY ROLLUP(column1, column2, column3)
-- Equivalent to:
-- GROUP BY GROUPING SETS (
--     (column1, column2, column3),
--     (column1, column2),
--     (column1),
--     ()
-- )
```

### CUBE

```sql
-- Creates all possible combinations of groupings
GROUP BY CUBE(column1, column2)
-- Equivalent to:
-- GROUP BY GROUPING SETS (
--     (column1, column2),
--     (column1),
--     (column2),
--     ()
-- )
```

### GROUPING() Function

```sql
SELECT
    column1,
    column2,
    GROUPING(column1) AS is_column1_aggregated,
    GROUPING(column2) AS is_column2_aggregated,
    SUM(amount)
FROM table_name
GROUP BY ROLLUP(column1, column2);
```

## Examples

### Single Column GROUP BY

```sql
-- Create sample sales data
CREATE TEMP TABLE sales (
    sale_id SERIAL PRIMARY KEY,
    sale_date DATE,
    product_name VARCHAR(100),
    category VARCHAR(50),
    region VARCHAR(50),
    quantity INTEGER,
    amount DECIMAL(10,2)
);

INSERT INTO sales (sale_date, product_name, category, region, quantity, amount) VALUES
('2024-01-01', 'Laptop', 'Electronics', 'North', 2, 2000.00),
('2024-01-01', 'Mouse', 'Electronics', 'North', 5, 125.00),
('2024-01-02', 'Desk', 'Furniture', 'South', 1, 300.00),
('2024-01-02', 'Chair', 'Furniture', 'South', 4, 800.00),
('2024-01-03', 'Laptop', 'Electronics', 'North', 1, 1000.00),
('2024-01-03', 'Monitor', 'Electronics', 'South', 3, 900.00);

-- Group by category
SELECT
    category,
    COUNT(*) AS sale_count,
    SUM(quantity) AS total_quantity,
    SUM(amount) AS total_revenue,
    AVG(amount) AS avg_sale_amount,
    MIN(amount) AS min_sale,
    MAX(amount) AS max_sale
FROM sales
GROUP BY category
ORDER BY total_revenue DESC;
```

### Multiple Column GROUP BY

```sql
-- Group by category and region
SELECT
    category,
    region,
    COUNT(*) AS sale_count,
    SUM(amount) AS total_revenue,
    AVG(amount) AS avg_revenue,
    string_agg(product_name, ', ' ORDER BY product_name) AS products_sold
FROM sales
GROUP BY category, region
ORDER BY category, region;

-- Group by multiple columns with different aggregations
SELECT
    category,
    region,
    COUNT(DISTINCT product_name) AS unique_products,
    COUNT(DISTINCT sale_date) AS days_with_sales,
    SUM(quantity) AS units_sold,
    SUM(amount) AS revenue,
    ROUND(SUM(amount) / NULLIF(SUM(quantity), 0), 2) AS avg_unit_price
FROM sales
GROUP BY category, region;
```

### GROUP BY with Expressions

```sql
-- Group by date parts
SELECT
    EXTRACT(YEAR FROM sale_date) AS year,
    EXTRACT(MONTH FROM sale_date) AS month,
    COUNT(*) AS sale_count,
    SUM(amount) AS monthly_revenue
FROM sales
GROUP BY EXTRACT(YEAR FROM sale_date), EXTRACT(MONTH FROM sale_date)
ORDER BY year, month;

-- Group by calculated expressions
SELECT
    CASE
        WHEN amount < 500 THEN 'Small'
        WHEN amount < 1500 THEN 'Medium'
        ELSE 'Large'
    END AS sale_size,
    COUNT(*) AS count,
    SUM(amount) AS total_revenue,
    AVG(amount) AS avg_amount
FROM sales
GROUP BY CASE
    WHEN amount < 500 THEN 'Small'
    WHEN amount < 1500 THEN 'Medium'
    ELSE 'Large'
END
ORDER BY sale_size;

-- Group by truncated timestamps
SELECT
    DATE_TRUNC('day', sale_date) AS sale_day,
    COUNT(*) AS daily_sales,
    SUM(amount) AS daily_revenue
FROM sales
GROUP BY DATE_TRUNC('day', sale_date)
ORDER BY sale_day;
```

### HAVING vs WHERE: Critical Differences

```sql
-- WHERE filters rows BEFORE grouping
SELECT
    category,
    COUNT(*) AS sale_count,
    SUM(amount) AS total_revenue
FROM sales
WHERE amount > 500  -- Filters individual sales > 500
GROUP BY category;

-- HAVING filters groups AFTER aggregation
SELECT
    category,
    COUNT(*) AS sale_count,
    SUM(amount) AS total_revenue
FROM sales
GROUP BY category
HAVING SUM(amount) > 1000;  -- Filters categories with total revenue > 1000

-- Combining WHERE and HAVING
SELECT
    category,
    region,
    COUNT(*) AS sale_count,
    SUM(amount) AS total_revenue
FROM sales
WHERE sale_date >= '2024-01-02'  -- Filter rows first
GROUP BY category, region
HAVING COUNT(*) >= 2  -- Then filter groups
ORDER BY total_revenue DESC;

-- Common pattern: filtering on different criteria
SELECT
    region,
    COUNT(*) AS electronics_sales,
    SUM(amount) AS electronics_revenue
FROM sales
WHERE category = 'Electronics'  -- Row-level filter
GROUP BY region
HAVING SUM(amount) > 500  -- Group-level filter
ORDER BY electronics_revenue DESC;
```

### HAVING with Complex Conditions

```sql
-- Multiple HAVING conditions
SELECT
    category,
    COUNT(*) AS sale_count,
    SUM(amount) AS total_revenue,
    AVG(amount) AS avg_revenue
FROM sales
GROUP BY category
HAVING COUNT(*) >= 2  -- At least 2 sales
   AND SUM(amount) > 1000  -- Total revenue > 1000
   AND AVG(amount) > 300;  -- Average sale > 300

-- HAVING with subqueries
SELECT
    category,
    SUM(amount) AS total_revenue
FROM sales
GROUP BY category
HAVING SUM(amount) > (
    SELECT AVG(category_revenue)
    FROM (
        SELECT SUM(amount) AS category_revenue
        FROM sales
        GROUP BY category
    ) AS category_totals
);

-- HAVING with FILTER clause
SELECT
    region,
    COUNT(*) AS total_sales,
    COUNT(*) FILTER (WHERE category = 'Electronics') AS electronics_sales,
    SUM(amount) AS total_revenue
FROM sales
GROUP BY region
HAVING COUNT(*) FILTER (WHERE category = 'Electronics') > 0;
```

### GROUP BY with Aliases (PostgreSQL Extension)

```sql
-- PostgreSQL allows GROUP BY to reference SELECT list aliases
SELECT
    EXTRACT(YEAR FROM sale_date) AS year,
    EXTRACT(MONTH FROM sale_date) AS month,
    SUM(amount) AS monthly_revenue
FROM sales
GROUP BY year, month  -- Using aliases instead of repeating expressions
ORDER BY year, month;

-- More complex example
SELECT
    CASE
        WHEN amount < 500 THEN 'Small'
        WHEN amount < 1500 THEN 'Medium'
        ELSE 'Large'
    END AS sale_category,
    region,
    COUNT(*) AS count
FROM sales
GROUP BY sale_category, region  -- Using alias
ORDER BY sale_category, region;

-- Note: This is a PostgreSQL extension; standard SQL requires repeating the expression
```

### GROUPING SETS: Multiple Grouping Levels

```sql
-- Create more detailed sales data
CREATE TEMP TABLE detailed_sales (
    sale_date DATE,
    region VARCHAR(50),
    category VARCHAR(50),
    product VARCHAR(100),
    amount DECIMAL(10,2)
);

INSERT INTO detailed_sales VALUES
('2024-01-01', 'North', 'Electronics', 'Laptop', 1000),
('2024-01-01', 'North', 'Electronics', 'Mouse', 25),
('2024-01-01', 'South', 'Furniture', 'Desk', 300),
('2024-01-02', 'North', 'Furniture', 'Chair', 200),
('2024-01-02', 'South', 'Electronics', 'Monitor', 400);

-- Multiple groupings in one query
SELECT
    region,
    category,
    COUNT(*) AS sale_count,
    SUM(amount) AS total_revenue,
    GROUPING(region) AS region_grouping,
    GROUPING(category) AS category_grouping
FROM detailed_sales
GROUP BY GROUPING SETS (
    (region, category),  -- Sales by region and category
    (region),            -- Sales by region only
    (category),          -- Sales by category only
    ()                   -- Grand total
)
ORDER BY region NULLS LAST, category NULLS LAST;

-- GROUPING SETS allows non-hierarchical groupings
SELECT
    region,
    product,
    SUM(amount) AS revenue
FROM detailed_sales
GROUP BY GROUPING SETS (
    (region, product),   -- Detail level
    (region),            -- Region subtotal
    (product),           -- Product subtotal
    ()                   -- Grand total
)
ORDER BY region NULLS LAST, product NULLS LAST;
```

### ROLLUP: Hierarchical Subtotals

```sql
-- ROLLUP creates hierarchical groupings from left to right
SELECT
    region,
    category,
    product,
    SUM(amount) AS total_revenue,
    COUNT(*) AS sale_count
FROM detailed_sales
GROUP BY ROLLUP(region, category, product)
ORDER BY region NULLS LAST, category NULLS LAST, product NULLS LAST;

-- This creates:
-- (region, category, product) - Detail
-- (region, category) - Category subtotal per region
-- (region) - Region total
-- () - Grand total

-- Two-level ROLLUP
SELECT
    region,
    category,
    SUM(amount) AS total_revenue,
    GROUPING(region) AS is_region_total,
    GROUPING(category) AS is_category_total
FROM detailed_sales
GROUP BY ROLLUP(region, category)
ORDER BY region NULLS LAST, category NULLS LAST;
```

### CUBE: All Possible Grouping Combinations

```sql
-- CUBE creates all possible combinations
SELECT
    region,
    category,
    SUM(amount) AS total_revenue,
    COUNT(*) AS sale_count,
    GROUPING(region) AS region_null,
    GROUPING(category) AS category_null
FROM detailed_sales
GROUP BY CUBE(region, category)
ORDER BY region NULLS LAST, category NULLS LAST;

-- This creates:
-- (region, category) - Both dimensions
-- (region) - Region only
-- (category) - Category only
-- () - Grand total

-- CUBE with three dimensions (8 combinations)
SELECT
    region,
    category,
    sale_date,
    SUM(amount) AS total_revenue
FROM detailed_sales
GROUP BY CUBE(region, category, sale_date)
ORDER BY region NULLS LAST, category NULLS LAST, sale_date NULLS LAST;
```

### GROUPING() Function: Identifying Aggregation Levels

```sql
-- GROUPING() returns 1 if column is aggregated, 0 if not
SELECT
    region,
    category,
    SUM(amount) AS total_revenue,
    GROUPING(region) AS region_is_aggregated,
    GROUPING(category) AS category_is_aggregated,
    CASE
        WHEN GROUPING(region) = 0 AND GROUPING(category) = 0
            THEN 'Region-Category Detail'
        WHEN GROUPING(region) = 0 AND GROUPING(category) = 1
            THEN 'Region Total'
        WHEN GROUPING(region) = 1 AND GROUPING(category) = 0
            THEN 'Category Total'
        WHEN GROUPING(region) = 1 AND GROUPING(category) = 1
            THEN 'Grand Total'
    END AS aggregation_level
FROM detailed_sales
GROUP BY CUBE(region, category)
ORDER BY GROUPING(region), GROUPING(category), region, category;

-- Use GROUPING() to replace NULLs in super-aggregates
SELECT
    COALESCE(region, 'ALL REGIONS') AS region,
    COALESCE(category, 'ALL CATEGORIES') AS category,
    SUM(amount) AS total_revenue
FROM detailed_sales
GROUP BY CUBE(region, category)
ORDER BY region NULLS LAST, category NULLS LAST;

-- Better: Use GROUPING() to distinguish NULL data from NULL aggregation
SELECT
    CASE
        WHEN GROUPING(region) = 1 THEN 'ALL REGIONS'
        ELSE COALESCE(region, 'Unknown')
    END AS region,
    CASE
        WHEN GROUPING(category) = 1 THEN 'ALL CATEGORIES'
        ELSE COALESCE(category, 'Unknown')
    END AS category,
    SUM(amount) AS total_revenue
FROM detailed_sales
GROUP BY CUBE(region, category);
```

### Common Grouping Patterns

```sql
-- Pattern 1: Top N groups
SELECT
    category,
    SUM(amount) AS total_revenue
FROM sales
GROUP BY category
ORDER BY total_revenue DESC
LIMIT 3;

-- Pattern 2: Groups meeting threshold
SELECT
    region,
    COUNT(*) AS sale_count,
    SUM(amount) AS total_revenue
FROM sales
GROUP BY region
HAVING SUM(amount) > 1000
ORDER BY total_revenue DESC;

-- Pattern 3: Percentage of total
SELECT
    category,
    SUM(amount) AS category_revenue,
    SUM(amount) * 100.0 / SUM(SUM(amount)) OVER () AS pct_of_total
FROM sales
GROUP BY category
ORDER BY category_revenue DESC;

-- Pattern 4: Running totals by group
SELECT
    category,
    sale_date,
    SUM(amount) AS daily_revenue,
    SUM(SUM(amount)) OVER (
        PARTITION BY category
        ORDER BY sale_date
    ) AS running_total
FROM sales
GROUP BY category, sale_date
ORDER BY category, sale_date;

-- Pattern 5: Comparing to group average
WITH category_avg AS (
    SELECT
        category,
        AVG(amount) AS avg_amount
    FROM sales
    GROUP BY category
)
SELECT
    s.category,
    s.product_name,
    s.amount,
    ca.avg_amount,
    s.amount - ca.avg_amount AS diff_from_avg
FROM sales s
JOIN category_avg ca ON s.category = ca.category
ORDER BY s.category, s.amount DESC;
```

### Partial ROLLUP and CUBE

```sql
-- Combine regular GROUP BY with ROLLUP
SELECT
    sale_date,
    region,
    category,
    SUM(amount) AS revenue
FROM detailed_sales
GROUP BY sale_date, ROLLUP(region, category)
-- Groups by date, then rolls up region and category within each date
ORDER BY sale_date, region NULLS LAST, category NULLS LAST;

-- Multiple GROUPING SETS combined
SELECT
    region,
    category,
    sale_date,
    SUM(amount) AS revenue
FROM detailed_sales
GROUP BY GROUPING SETS (
    (region, category, sale_date),
    (region, category),
    (category, sale_date),
    ()
)
ORDER BY region NULLS LAST, category NULLS LAST, sale_date NULLS LAST;
```

### GROUP BY with CTEs for Complex Analysis

```sql
-- Multi-level aggregation using CTEs
WITH daily_stats AS (
    -- First level: daily stats by region
    SELECT
        sale_date,
        region,
        COUNT(*) AS daily_sales,
        SUM(amount) AS daily_revenue
    FROM sales
    GROUP BY sale_date, region
),
region_summary AS (
    -- Second level: aggregate daily stats
    SELECT
        region,
        COUNT(*) AS active_days,
        AVG(daily_revenue) AS avg_daily_revenue,
        MAX(daily_revenue) AS peak_daily_revenue,
        SUM(daily_revenue) AS total_revenue
    FROM daily_stats
    GROUP BY region
)
SELECT
    region,
    active_days,
    ROUND(avg_daily_revenue, 2) AS avg_daily_revenue,
    peak_daily_revenue,
    total_revenue,
    ROUND(peak_daily_revenue / NULLIF(avg_daily_revenue, 0), 2) AS peak_to_avg_ratio
FROM region_summary
ORDER BY total_revenue DESC;
```

### GROUP BY with LATERAL Joins

```sql
-- Get top products per category
SELECT
    c.category,
    c.total_sales,
    top_products.product_list
FROM (
    SELECT
        category,
        COUNT(*) AS total_sales
    FROM sales
    GROUP BY category
) c
CROSS JOIN LATERAL (
    SELECT string_agg(product_name, ', ' ORDER BY amount DESC) AS product_list
    FROM (
        SELECT DISTINCT product_name, amount
        FROM sales s2
        WHERE s2.category = c.category
        ORDER BY amount DESC
        LIMIT 3
    ) top
) top_products
ORDER BY c.total_sales DESC;
```

## Common Mistakes

### Mistake 1: Selecting Non-Grouped Columns

```sql
-- WRONG: Selecting column not in GROUP BY or aggregate
SELECT
    category,
    product_name,  -- ERROR: must be in GROUP BY or aggregate
    SUM(amount)
FROM sales
GROUP BY category;

-- CORRECT: Include column in GROUP BY
SELECT
    category,
    product_name,
    SUM(amount)
FROM sales
GROUP BY category, product_name;

-- CORRECT: Use aggregate function
SELECT
    category,
    string_agg(DISTINCT product_name, ', ') AS products,
    SUM(amount)
FROM sales
GROUP BY category;
```

### Mistake 2: Using WHERE Instead of HAVING

```sql
-- WRONG: Filtering on aggregate in WHERE
SELECT category, SUM(amount)
FROM sales
WHERE SUM(amount) > 1000  -- ERROR: Cannot use aggregate in WHERE
GROUP BY category;

-- CORRECT: Use HAVING for aggregate conditions
SELECT category, SUM(amount)
FROM sales
GROUP BY category
HAVING SUM(amount) > 1000;
```

### Mistake 3: Confusing GROUPING() Return Values

```sql
-- WRONG: Assuming GROUPING() returns boolean
SELECT region, category, SUM(amount)
FROM sales
GROUP BY CUBE(region, category)
HAVING GROUPING(region) = true;  -- ERROR: Returns 0 or 1, not boolean

-- CORRECT: Compare to 0 or 1
SELECT region, category, SUM(amount)
FROM sales
GROUP BY CUBE(region, category)
HAVING GROUPING(region) = 1;
```

### Mistake 4: Ordering of Grouping Sets

```sql
-- WRONG: Assuming order doesn't matter in ROLLUP
GROUP BY ROLLUP(region, category)  -- Different from next line
GROUP BY ROLLUP(category, region)  -- Creates different hierarchy

-- CORRECT: Be intentional about hierarchy
GROUP BY ROLLUP(region, category)  -- Region → Category → Grand Total
```

### Mistake 5: Not Handling NULLs in GROUP BY

```sql
-- WRONG: Not distinguishing NULL values from aggregated NULLs
SELECT
    region,
    category,
    SUM(amount)
FROM sales
GROUP BY CUBE(region, category);
-- Can't tell if NULL is real data or super-aggregate

-- CORRECT: Use GROUPING() to distinguish
SELECT
    CASE WHEN GROUPING(region) = 1 THEN 'ALL' ELSE COALESCE(region, 'Unknown') END,
    CASE WHEN GROUPING(category) = 1 THEN 'ALL' ELSE COALESCE(category, 'Unknown') END,
    SUM(amount)
FROM sales
GROUP BY CUBE(region, category);
```

### Mistake 6: Inefficient Multiple Queries Instead of GROUPING SETS

```sql
-- WRONG: Multiple queries for different groupings
SELECT region, SUM(amount) FROM sales GROUP BY region
UNION ALL
SELECT category, SUM(amount) FROM sales GROUP BY category;
-- Scans table multiple times

-- CORRECT: Single query with GROUPING SETS
SELECT
    region,
    category,
    SUM(amount)
FROM sales
GROUP BY GROUPING SETS ((region), (category));
-- Single table scan
```

## Best Practices

### 1. Use Meaningful GROUP BY Column Order

Order GROUP BY columns by cardinality (highest to lowest) for better performance.

```sql
-- Good: High cardinality first
SELECT
    customer_id,    -- High cardinality
    region,         -- Medium cardinality
    status,         -- Low cardinality
    COUNT(*)
FROM orders
GROUP BY customer_id, region, status;
```

### 2. Prefer HAVING Over WHERE for Post-Aggregation Filtering

```sql
-- Good: Clear separation of concerns
SELECT
    category,
    COUNT(*) AS sale_count,
    SUM(amount) AS revenue
FROM sales
WHERE sale_date >= '2024-01-01'  -- Filter rows before grouping
GROUP BY category
HAVING COUNT(*) >= 5             -- Filter groups after aggregation
ORDER BY revenue DESC;
```

### 3. Use GROUPING SETS Instead of UNION for Multiple Groupings

```sql
-- Good: Single scan with GROUPING SETS
SELECT
    region,
    category,
    SUM(amount) AS revenue
FROM sales
GROUP BY GROUPING SETS (
    (region, category),
    (region),
    ()
)
ORDER BY region NULLS LAST, category NULLS LAST;

-- Avoid: Multiple queries with UNION (scans table multiple times)
```

### 4. Always Use GROUPING() with CUBE/ROLLUP

```sql
-- Good: Clear identification of aggregation levels
SELECT
    CASE WHEN GROUPING(region) = 1 THEN 'Total' ELSE region END AS region,
    CASE WHEN GROUPING(category) = 1 THEN 'Total' ELSE category END AS category,
    SUM(amount) AS revenue,
    GROUPING(region) || GROUPING(category) AS grouping_level
FROM sales
GROUP BY ROLLUP(region, category);
```

### 5. Document Complex Groupings

```sql
-- Good: Comments explain grouping logic
SELECT
    region,
    category,
    SUM(amount) AS revenue
FROM sales
GROUP BY GROUPING SETS (
    (region, category),  -- Detail: sales by region and category
    (region),            -- Subtotal: regional totals across all categories
    (category),          -- Subtotal: category totals across all regions
    ()                   -- Grand total: all sales
)
ORDER BY region NULLS LAST, category NULLS LAST;
```

### 6. Use CTEs for Multi-Level Aggregations

```sql
-- Good: Readable multi-stage aggregation
WITH daily_totals AS (
    SELECT
        region,
        DATE_TRUNC('day', sale_date) AS day,
        SUM(amount) AS daily_revenue
    FROM sales
    GROUP BY region, DATE_TRUNC('day', sale_date)
)
SELECT
    region,
    AVG(daily_revenue) AS avg_daily_revenue,
    MAX(daily_revenue) AS peak_day_revenue
FROM daily_totals
GROUP BY region;
```

### 7. Consider Performance with Large CUBE Operations

```sql
-- CUBE(a,b,c) creates 2^3 = 8 groupings
-- CUBE(a,b,c,d) creates 2^4 = 16 groupings
-- Be cautious with high-dimension CUBEs

-- Good: Use GROUPING SETS for specific combinations
GROUP BY GROUPING SETS (
    (a, b, c),
    (a, b),
    (a),
    ()
)
-- Instead of CUBE(a,b,c) if you don't need all combinations
```

## Practice Exercises

### Exercise 1: Sales Performance Report

Create a comprehensive sales report with multiple grouping levels:
- Total sales and revenue by region
- Breakdown by category within each region
- Identify regions and categories with above-average performance
- Use HAVING to filter out low-performing groups

```sql
-- Use the sales table created earlier
-- Your query should:
-- 1. Group by region and category
-- 2. Calculate count, sum, average, min, max for each group
-- 3. Filter to show only groups with at least 2 sales
-- 4. Filter to show only groups with total revenue > 500
-- 5. Order by region and total revenue descending

-- Your query here
```

### Exercise 2: Multi-Dimensional Analysis with CUBE

Create a sales cube analysis showing all possible aggregation combinations:
- Use the detailed_sales table
- Group by region, category, and sale_date using CUBE
- Add a column identifying the aggregation level using GROUPING()
- Replace NULL values appropriately based on whether they're super-aggregates
- Calculate both count and sum for each group

```sql
-- Your query should:
-- 1. Use CUBE to create all grouping combinations
-- 2. Use GROUPING() to identify aggregation levels
-- 3. Create a descriptive label for each aggregation level
-- 4. Replace NULLs appropriately using CASE and GROUPING()
-- 5. Order results logically

-- Your query here
```

### Exercise 3: Hierarchical Sales Report with ROLLUP

Create a hierarchical report showing sales totals and subtotals:
- Use ROLLUP to create region → category → product hierarchy
- Calculate revenue, count, and average for each level
- Add percentage of parent level for each row
- Use GROUPING() to format the output appropriately

```sql
-- Setup
CREATE TEMP TABLE hierarchical_sales AS
SELECT * FROM detailed_sales;

-- Your query should:
-- 1. Use ROLLUP(region, category, product)
-- 2. Calculate totals at each level
-- 3. Use GROUPING() to identify hierarchy level
-- 4. Format output with clear indicators of aggregation level
-- 5. Calculate percentage contribution at each level

-- Your query here
```

## Summary

GROUP BY and HAVING provide powerful tools for data aggregation and analysis:

- **GROUP BY**: Divides rows into groups for aggregation
  - Can group by columns, expressions, or aliases (PostgreSQL extension)
  - Execution order: WHERE → GROUP BY → aggregates → HAVING → SELECT

- **HAVING**: Filters groups after aggregation
  - Use WHERE for row-level filtering
  - Use HAVING for group-level filtering on aggregates

- **Advanced grouping**: GROUPING SETS, CUBE, ROLLUP
  - GROUPING SETS: Arbitrary grouping combinations
  - ROLLUP: Hierarchical subtotals (left to right)
  - CUBE: All possible grouping combinations

- **GROUPING() function**: Identifies super-aggregate rows
  - Returns 1 if column is aggregated, 0 if not
  - Essential for distinguishing NULL data from aggregated NULLs

Previous: [Aggregate Functions](./01-aggregate-functions.md) | Next: [Window Functions](./03-window-functions.md)
