# Aggregate Functions

## Theory

Aggregate functions perform calculations on a set of values and return a single result. They are fundamental to data analysis and reporting in SQL, allowing you to summarize large datasets into meaningful metrics. PostgreSQL provides a rich set of built-in aggregate functions and supports custom aggregates.

Key concepts:
- **Reduction**: Aggregates reduce multiple rows to a single value
- **NULL handling**: Most aggregates ignore NULL values (except COUNT(*))
- **DISTINCT**: Many aggregates support DISTINCT to eliminate duplicates before aggregation
- **FILTER clause**: PostgreSQL extension to conditionally aggregate rows
- **Grouping context**: Aggregates can operate on entire tables or groups created by GROUP BY

Common use cases:
- Statistical analysis (averages, counts, sums)
- Data quality checks (finding minimums, maximums)
- Report generation (totals, subtotals)
- Data transformation (collecting values into arrays or JSON)

## Syntax

### Basic Aggregate Functions

```sql
-- Counting functions
COUNT(*) -- Count all rows including NULLs
COUNT(column_name) -- Count non-NULL values
COUNT(DISTINCT column_name) -- Count unique non-NULL values

-- Numeric aggregates
SUM(numeric_column) -- Sum of all non-NULL values
AVG(numeric_column) -- Average of non-NULL values
MIN(column_name) -- Minimum value (works on any orderable type)
MAX(column_name) -- Maximum value (works on any orderable type)

-- Statistical functions
STDDEV(numeric_column) -- Sample standard deviation
VARIANCE(numeric_column) -- Sample variance
```

### Boolean Aggregates

```sql
bool_and(boolean_expression) -- True if all values are true
bool_or(boolean_expression) -- True if any value is true
```

### Array and String Aggregates

```sql
array_agg(expression [ORDER BY ...]) -- Collect values into array
string_agg(expression, delimiter [ORDER BY ...]) -- Concatenate strings
```

### JSON Aggregates

```sql
jsonb_agg(expression [ORDER BY ...]) -- Collect values into JSON array
jsonb_object_agg(key, value) -- Build JSON object from key-value pairs
```

### FILTER Clause

```sql
aggregate_function(...) FILTER (WHERE condition)
```

## Examples

### COUNT Variants and Their Differences

```sql
-- Create sample data with NULLs
CREATE TEMP TABLE orders (
    order_id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    amount DECIMAL(10,2),
    status VARCHAR(20)
);

INSERT INTO orders (customer_id, amount, status) VALUES
(1, 100.00, 'completed'),
(1, NULL, 'pending'),
(2, 200.00, 'completed'),
(2, 150.00, 'completed'),
(NULL, 50.00, 'completed'),
(3, NULL, NULL),
(3, 300.00, 'cancelled');

-- Different COUNT behaviors
SELECT
    COUNT(*) AS total_rows,                    -- 7 (all rows)
    COUNT(customer_id) AS non_null_customers,  -- 6 (excludes NULL)
    COUNT(amount) AS non_null_amounts,         -- 5 (excludes NULLs)
    COUNT(DISTINCT customer_id) AS unique_customers, -- 3 (unique non-NULL)
    COUNT(DISTINCT status) AS unique_statuses  -- 3 (completed, pending, cancelled)
FROM orders;

-- Count with conditions
SELECT
    COUNT(*) FILTER (WHERE status = 'completed') AS completed_orders,
    COUNT(*) FILTER (WHERE amount > 100) AS large_orders,
    COUNT(DISTINCT customer_id) FILTER (WHERE amount IS NOT NULL) AS customers_with_amounts
FROM orders;
```

### SUM, AVG, MIN, MAX with NULL Handling

```sql
-- Numeric aggregates ignore NULLs
SELECT
    SUM(amount) AS total_revenue,              -- 800.00 (sum of 5 non-NULL values)
    AVG(amount) AS avg_order_value,            -- 160.00 (800/5, not 800/7)
    MIN(amount) AS smallest_order,             -- 50.00
    MAX(amount) AS largest_order,              -- 300.00
    COUNT(*) AS total_orders,
    COUNT(amount) AS orders_with_amount
FROM orders;

-- COALESCE to treat NULL as 0 for SUM
SELECT
    SUM(amount) AS sum_excluding_nulls,        -- 800.00
    SUM(COALESCE(amount, 0)) AS sum_treating_nulls_as_zero -- 800.00
FROM orders;

-- AVG can be misleading with NULLs
SELECT
    AVG(amount) AS avg_ignoring_nulls,         -- 160.00
    SUM(amount) / COUNT(*) AS avg_treating_nulls_as_zero, -- 114.29
    SUM(amount) / NULLIF(COUNT(*), 0) AS safe_average
FROM orders;
```

### Boolean Aggregates

```sql
-- Create validation data
CREATE TEMP TABLE product_checks (
    product_id INTEGER,
    check_name VARCHAR(50),
    passed BOOLEAN
);

INSERT INTO product_checks VALUES
(1, 'quality', true),
(1, 'safety', true),
(1, 'packaging', true),
(2, 'quality', true),
(2, 'safety', false),
(2, 'packaging', true),
(3, 'quality', false),
(3, 'safety', false);

-- Boolean aggregates per product
SELECT
    product_id,
    bool_and(passed) AS all_checks_passed,     -- true only if ALL are true
    bool_or(passed) AS any_check_passed,       -- true if ANY is true
    COUNT(*) FILTER (WHERE passed) AS passed_count,
    COUNT(*) FILTER (WHERE NOT passed) AS failed_count
FROM product_checks
GROUP BY product_id
ORDER BY product_id;

-- Result:
-- product_id | all_checks_passed | any_check_passed | passed_count | failed_count
-- 1          | true              | true             | 3            | 0
-- 2          | false             | true             | 2            | 1
-- 3          | false             | false            | 0            | 2
```

### array_agg: Collecting Values into Arrays

```sql
-- Create sample data
CREATE TEMP TABLE user_logins (
    user_id INTEGER,
    login_date DATE,
    ip_address INET
);

INSERT INTO user_logins VALUES
(1, '2024-01-01', '192.168.1.1'),
(1, '2024-01-02', '192.168.1.1'),
(1, '2024-01-03', '192.168.1.5'),
(2, '2024-01-01', '10.0.0.1'),
(2, '2024-01-02', '10.0.0.2');

-- Collect all login dates per user
SELECT
    user_id,
    array_agg(login_date ORDER BY login_date) AS login_dates,
    array_agg(DISTINCT ip_address) AS unique_ips,
    COUNT(*) AS login_count
FROM user_logins
GROUP BY user_id;

-- Advanced: array_agg with complex expressions
SELECT
    user_id,
    array_agg(login_date::TEXT || ' from ' || ip_address::TEXT
              ORDER BY login_date DESC) AS login_details
FROM user_logins
GROUP BY user_id;
```

### string_agg: String Concatenation with Delimiters

```sql
-- Create tags data
CREATE TEMP TABLE article_tags (
    article_id INTEGER,
    tag VARCHAR(50),
    priority INTEGER
);

INSERT INTO article_tags VALUES
(1, 'postgresql', 1),
(1, 'database', 2),
(1, 'sql', 3),
(2, 'python', 1),
(2, 'programming', 2),
(3, 'postgresql', 1);

-- Concatenate tags with different delimiters and ordering
SELECT
    article_id,
    string_agg(tag, ', ' ORDER BY priority) AS tags_by_priority,
    string_agg(tag, ' | ' ORDER BY tag) AS tags_alphabetical,
    string_agg(UPPER(tag), '-' ORDER BY priority) AS tags_uppercase_dashed
FROM article_tags
GROUP BY article_id
ORDER BY article_id;

-- Creating formatted output
SELECT
    article_id,
    string_agg(
        format('#%s (priority: %s)', tag, priority),
        E'\n'  -- newline delimiter
        ORDER BY priority
    ) AS formatted_tags
FROM article_tags
GROUP BY article_id;
```

### JSON Aggregates

```sql
-- Create product reviews
CREATE TEMP TABLE reviews (
    product_id INTEGER,
    reviewer_name VARCHAR(100),
    rating INTEGER,
    comment TEXT,
    review_date DATE
);

INSERT INTO reviews VALUES
(1, 'Alice', 5, 'Excellent product!', '2024-01-15'),
(1, 'Bob', 4, 'Good quality', '2024-01-16'),
(1, 'Carol', 5, 'Highly recommend', '2024-01-17'),
(2, 'Dave', 3, 'Average', '2024-01-15'),
(2, 'Eve', 2, 'Not satisfied', '2024-01-16');

-- Aggregate reviews into JSON array
SELECT
    product_id,
    jsonb_agg(
        jsonb_build_object(
            'reviewer', reviewer_name,
            'rating', rating,
            'comment', comment,
            'date', review_date
        ) ORDER BY review_date DESC
    ) AS reviews,
    AVG(rating) AS avg_rating
FROM reviews
GROUP BY product_id;

-- Build JSON objects from key-value pairs
CREATE TEMP TABLE product_attributes (
    product_id INTEGER,
    attribute_name VARCHAR(50),
    attribute_value TEXT
);

INSERT INTO product_attributes VALUES
(1, 'color', 'blue'),
(1, 'size', 'large'),
(1, 'weight', '2.5kg'),
(2, 'color', 'red'),
(2, 'warranty', '2 years');

SELECT
    product_id,
    jsonb_object_agg(attribute_name, attribute_value) AS attributes
FROM product_attributes
GROUP BY product_id;
```

### FILTER Clause for Conditional Aggregation

```sql
-- Create sales data
CREATE TEMP TABLE sales (
    sale_id SERIAL PRIMARY KEY,
    sale_date DATE,
    amount DECIMAL(10,2),
    region VARCHAR(50),
    product_category VARCHAR(50)
);

INSERT INTO sales (sale_date, amount, region, product_category) VALUES
('2024-01-01', 100, 'North', 'Electronics'),
('2024-01-01', 200, 'North', 'Clothing'),
('2024-01-02', 150, 'South', 'Electronics'),
('2024-01-02', 300, 'South', 'Furniture'),
('2024-01-03', 250, 'North', 'Electronics'),
('2024-01-03', 100, 'South', 'Clothing');

-- Multiple conditional aggregates in one query
SELECT
    COUNT(*) AS total_sales,
    COUNT(*) FILTER (WHERE region = 'North') AS north_sales,
    COUNT(*) FILTER (WHERE region = 'South') AS south_sales,
    SUM(amount) AS total_revenue,
    SUM(amount) FILTER (WHERE region = 'North') AS north_revenue,
    SUM(amount) FILTER (WHERE region = 'South') AS south_revenue,
    AVG(amount) FILTER (WHERE product_category = 'Electronics') AS avg_electronics_sale,
    MAX(amount) FILTER (WHERE sale_date = '2024-01-02') AS max_sale_jan_2
FROM sales;

-- FILTER is cleaner than CASE WHEN for multiple conditions
SELECT
    product_category,
    COUNT(*) AS total_sales,
    SUM(amount) FILTER (WHERE amount > 150) AS high_value_revenue,
    SUM(amount) FILTER (WHERE amount <= 150) AS low_value_revenue,
    AVG(amount) FILTER (WHERE region = 'North') AS avg_north,
    AVG(amount) FILTER (WHERE region = 'South') AS avg_south
FROM sales
GROUP BY product_category;
```

### NULL Handling in Aggregates

```sql
-- Demonstrate NULL behavior
CREATE TEMP TABLE measurements (
    id SERIAL PRIMARY KEY,
    sensor_id INTEGER,
    value DECIMAL(10,2)
);

INSERT INTO measurements (sensor_id, value) VALUES
(1, 10.5),
(1, NULL),
(1, 20.3),
(2, NULL),
(2, NULL),
(3, 5.0);

-- NULL handling varies by function
SELECT
    sensor_id,
    COUNT(*) AS total_readings,
    COUNT(value) AS non_null_readings,
    SUM(value) AS sum_ignores_nulls,
    AVG(value) AS avg_ignores_nulls,
    MIN(value) AS min_ignores_nulls,
    MAX(value) AS max_ignores_nulls,
    array_agg(value) AS array_includes_nulls,  -- Arrays preserve NULLs
    array_agg(value) FILTER (WHERE value IS NOT NULL) AS array_no_nulls
FROM measurements
GROUP BY sensor_id
ORDER BY sensor_id;

-- Handling all-NULL groups
SELECT
    sensor_id,
    COALESCE(AVG(value), 0) AS avg_with_default,
    COALESCE(SUM(value), 0) AS sum_with_default
FROM measurements
GROUP BY sensor_id;
```

### Statistical Aggregates

```sql
-- Create test scores
CREATE TEMP TABLE test_scores (
    student_id INTEGER,
    subject VARCHAR(50),
    score INTEGER
);

INSERT INTO test_scores VALUES
(1, 'Math', 85),
(2, 'Math', 90),
(3, 'Math', 78),
(4, 'Math', 92),
(5, 'Math', 88),
(1, 'Science', 80),
(2, 'Science', 95),
(3, 'Science', 70);

-- Statistical analysis per subject
SELECT
    subject,
    COUNT(*) AS student_count,
    AVG(score) AS mean_score,
    STDDEV(score) AS std_deviation,
    VARIANCE(score) AS variance,
    MIN(score) AS min_score,
    MAX(score) AS max_score,
    MAX(score) - MIN(score) AS score_range,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY score) AS median_score,
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY score) AS q1,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY score) AS q3
FROM test_scores
GROUP BY subject;
```

### Custom Aggregates Introduction

```sql
-- PostgreSQL allows creating custom aggregate functions
-- Example: median aggregate (conceptual - use PERCENTILE_CONT in practice)

-- Custom aggregate for concatenating with custom separator
CREATE TEMP TABLE events (
    session_id INTEGER,
    event_name VARCHAR(50),
    event_order INTEGER
);

INSERT INTO events VALUES
(1, 'login', 1),
(1, 'view_product', 2),
(1, 'add_to_cart', 3),
(1, 'checkout', 4),
(2, 'login', 1),
(2, 'search', 2);

-- Using built-in aggregates to simulate custom behavior
SELECT
    session_id,
    string_agg(event_name, ' -> ' ORDER BY event_order) AS user_journey,
    array_agg(event_name ORDER BY event_order) AS event_sequence,
    COUNT(*) AS event_count
FROM events
GROUP BY session_id;
```

### Combining Multiple Aggregates

```sql
-- Create comprehensive sales analysis
CREATE TEMP TABLE daily_sales (
    sale_date DATE,
    store_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    unit_price DECIMAL(10,2)
);

INSERT INTO daily_sales VALUES
('2024-01-01', 1, 101, 5, 10.00),
('2024-01-01', 1, 102, 3, 20.00),
('2024-01-01', 2, 101, 2, 10.00),
('2024-01-02', 1, 101, 4, 10.00),
('2024-01-02', 2, 102, 1, 20.00);

-- Comprehensive aggregate analysis
SELECT
    store_id,
    COUNT(DISTINCT sale_date) AS days_active,
    COUNT(DISTINCT product_id) AS products_sold,
    COUNT(*) AS transaction_count,
    SUM(quantity) AS total_units_sold,
    SUM(quantity * unit_price) AS total_revenue,
    AVG(quantity * unit_price) AS avg_transaction_value,
    MIN(quantity * unit_price) AS min_transaction,
    MAX(quantity * unit_price) AS max_transaction,
    array_agg(DISTINCT product_id ORDER BY product_id) AS product_list,
    string_agg(DISTINCT sale_date::TEXT, ', ' ORDER BY sale_date::TEXT) AS active_dates
FROM daily_sales
GROUP BY store_id
ORDER BY store_id;
```

## Common Mistakes

### Mistake 1: Confusing COUNT(*) with COUNT(column)

```sql
-- WRONG: Assuming COUNT(column) counts all rows
SELECT COUNT(amount) FROM orders;  -- Excludes NULLs!

-- CORRECT: Use COUNT(*) to count all rows
SELECT COUNT(*) FROM orders;

-- CORRECT: Be explicit about NULL handling
SELECT
    COUNT(*) AS total_orders,
    COUNT(amount) AS orders_with_amount,
    COUNT(*) - COUNT(amount) AS orders_without_amount
FROM orders;
```

### Mistake 2: Forgetting NULL Handling in AVG

```sql
-- WRONG: Not accounting for NULL values in average
SELECT AVG(rating) FROM reviews;  -- Ignores NULLs, may not be what you want

-- CORRECT: Be explicit about what you're averaging
SELECT
    AVG(rating) AS avg_of_rated,
    AVG(COALESCE(rating, 0)) AS avg_treating_null_as_zero,
    SUM(rating)::FLOAT / NULLIF(COUNT(*), 0) AS avg_including_null_as_zero
FROM reviews;
```

### Mistake 3: Using DISTINCT in Wrong Place

```sql
-- WRONG: DISTINCT applies to entire result set, not aggregate
SELECT DISTINCT COUNT(customer_id) FROM orders GROUP BY status;

-- CORRECT: DISTINCT inside aggregate function
SELECT COUNT(DISTINCT customer_id) FROM orders;

-- CORRECT: DISTINCT in result set when needed
SELECT DISTINCT status, COUNT(*) FROM orders GROUP BY status;
```

### Mistake 4: Incorrect FILTER Syntax

```sql
-- WRONG: FILTER without aggregate function
SELECT * FROM sales FILTER (WHERE region = 'North');  -- Syntax error

-- WRONG: WHERE instead of FILTER in aggregate context
SELECT COUNT(WHERE region = 'North') FROM sales;  -- Syntax error

-- CORRECT: FILTER with aggregate
SELECT COUNT(*) FILTER (WHERE region = 'North') FROM sales;

-- CORRECT: Use WHERE for row filtering
SELECT COUNT(*) FROM sales WHERE region = 'North';
```

### Mistake 5: Ignoring ORDER BY in array_agg and string_agg

```sql
-- WRONG: No ORDER BY - unpredictable order
SELECT user_id, array_agg(login_date) FROM user_logins GROUP BY user_id;

-- CORRECT: Explicit ordering
SELECT user_id, array_agg(login_date ORDER BY login_date DESC)
FROM user_logins GROUP BY user_id;
```

### Mistake 6: Not Handling Empty Groups

```sql
-- WRONG: Assuming aggregates always return non-NULL
SELECT AVG(value) FROM measurements WHERE sensor_id = 999;  -- Returns NULL if no rows

-- CORRECT: Provide defaults for empty results
SELECT COALESCE(AVG(value), 0) FROM measurements WHERE sensor_id = 999;
SELECT AVG(value), COUNT(*) FROM measurements WHERE sensor_id = 999;  -- Check count too
```

## Best Practices

### 1. Be Explicit About NULL Handling

Always consider how NULLs affect your aggregates and document your assumptions.

```sql
-- Good: Clear intent with NULL handling
SELECT
    product_id,
    COUNT(*) AS total_reviews,
    COUNT(rating) AS rated_reviews,
    COUNT(*) - COUNT(rating) AS unrated_reviews,
    ROUND(AVG(rating), 2) AS avg_rating,
    COALESCE(AVG(rating), 0) AS avg_rating_or_zero
FROM reviews
GROUP BY product_id;
```

### 2. Use FILTER for Cleaner Conditional Aggregates

FILTER is more readable than CASE WHEN for conditional aggregation.

```sql
-- Good: Using FILTER
SELECT
    region,
    COUNT(*) FILTER (WHERE amount > 1000) AS large_sales,
    COUNT(*) FILTER (WHERE amount <= 1000) AS small_sales,
    SUM(amount) FILTER (WHERE status = 'completed') AS completed_revenue
FROM sales
GROUP BY region;

-- Avoid: Using CASE WHEN (more verbose)
SELECT
    region,
    COUNT(CASE WHEN amount > 1000 THEN 1 END) AS large_sales,
    SUM(CASE WHEN status = 'completed' THEN amount END) AS completed_revenue
FROM sales
GROUP BY region;
```

### 3. Always ORDER BY in array_agg and string_agg

Ensure predictable, repeatable results.

```sql
-- Good: Explicit ordering
SELECT
    category,
    array_agg(product_name ORDER BY product_name) AS products,
    string_agg(product_name, ', ' ORDER BY price DESC) AS products_by_price
FROM products
GROUP BY category;
```

### 4. Use Appropriate Aggregate for the Task

Choose the right aggregate function for your data type and purpose.

```sql
-- Good: Using specialized aggregates
SELECT
    customer_id,
    COUNT(*) AS order_count,
    SUM(amount) AS total_spent,
    AVG(amount) AS avg_order_value,
    array_agg(order_id ORDER BY order_date DESC) AS recent_orders,
    jsonb_agg(jsonb_build_object('id', order_id, 'amount', amount)) AS order_details
FROM orders
GROUP BY customer_id;
```

### 5. Consider Performance with DISTINCT

DISTINCT in aggregates requires sorting/hashing and can be expensive.

```sql
-- Consider performance implications
SELECT
    COUNT(DISTINCT customer_id) AS unique_customers,  -- Can be slow on large datasets
    COUNT(*) AS total_orders
FROM orders;

-- For very large datasets, consider approximate counts
SELECT
    approx_count_distinct(customer_id) AS approx_unique_customers  -- PostgreSQL extension
FROM orders;
```

### 6. Document Complex Aggregations

Add comments to explain non-obvious aggregate logic.

```sql
-- Good: Documented aggregation logic
SELECT
    product_id,
    -- Calculate completion rate: completed orders / total orders
    COUNT(*) FILTER (WHERE status = 'completed')::FLOAT /
        NULLIF(COUNT(*), 0) * 100 AS completion_rate_pct,
    -- Weighted average based on quantity
    SUM(rating * quantity) / NULLIF(SUM(quantity), 0) AS weighted_avg_rating
FROM orders
GROUP BY product_id;
```

### 7. Use CTEs for Complex Multi-Level Aggregations

Break down complex aggregations into readable steps.

```sql
-- Good: Using CTE for clarity
WITH daily_stats AS (
    SELECT
        sale_date,
        region,
        COUNT(*) AS sale_count,
        SUM(amount) AS daily_revenue
    FROM sales
    GROUP BY sale_date, region
)
SELECT
    region,
    AVG(daily_revenue) AS avg_daily_revenue,
    MAX(daily_revenue) AS peak_daily_revenue,
    array_agg(sale_date ORDER BY daily_revenue DESC) AS top_days
FROM daily_stats
GROUP BY region;
```

## Practice Exercises

### Exercise 1: Customer Order Analysis

Write a query to analyze customer ordering behavior with the following requirements:
- Count total orders per customer
- Calculate total amount spent and average order value
- Find the date of first and last order
- List all order statuses as an array
- Count how many orders were above the customer's average
- Find the customer's most common order status

```sql
-- Create sample data
CREATE TEMP TABLE customer_orders (
    order_id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    order_date DATE,
    amount DECIMAL(10,2),
    status VARCHAR(20)
);

INSERT INTO customer_orders (customer_id, order_date, amount, status) VALUES
(1, '2024-01-01', 100, 'completed'),
(1, '2024-01-05', 150, 'completed'),
(1, '2024-01-10', 200, 'completed'),
(1, '2024-01-15', 80, 'cancelled'),
(2, '2024-01-02', 300, 'completed'),
(2, '2024-01-08', 250, 'pending'),
(2, '2024-01-12', 400, 'completed'),
(3, '2024-01-03', 500, 'completed');

-- Your query here
-- Expected output should include customer_id and the metrics listed above
```

### Exercise 2: Product Performance Dashboard

Create a comprehensive product performance report using multiple aggregate functions:
- Total units sold and revenue per product
- Number of unique customers who purchased each product
- Average, minimum, and maximum order quantity
- List of all order dates (comma-separated, chronological)
- JSON object containing detailed statistics
- Percentage of orders that were above average quantity

```sql
-- Create sample data
CREATE TEMP TABLE product_sales (
    sale_id SERIAL PRIMARY KEY,
    product_id INTEGER,
    product_name VARCHAR(100),
    customer_id INTEGER,
    sale_date DATE,
    quantity INTEGER,
    unit_price DECIMAL(10,2)
);

INSERT INTO product_sales (product_id, product_name, customer_id, sale_date, quantity, unit_price) VALUES
(1, 'Laptop', 101, '2024-01-01', 2, 1000.00),
(1, 'Laptop', 102, '2024-01-03', 1, 1000.00),
(1, 'Laptop', 103, '2024-01-05', 3, 1000.00),
(1, 'Laptop', 101, '2024-01-07', 1, 1000.00),
(2, 'Mouse', 101, '2024-01-02', 5, 25.00),
(2, 'Mouse', 102, '2024-01-04', 10, 25.00),
(2, 'Mouse', 104, '2024-01-06', 3, 25.00),
(3, 'Keyboard', 103, '2024-01-03', 2, 75.00);

-- Your query here
-- Use FILTER, jsonb_agg, string_agg, and statistical functions
```

### Exercise 3: Time-Series Data Quality Analysis

Analyze sensor data quality using various aggregate functions:
- Count total readings, NULL readings, and valid readings per sensor
- Calculate average, min, max of valid readings
- Identify if all readings passed validation (> 0 and < 100)
- Create an array of all reading values (excluding NULLs)
- Calculate standard deviation and variance
- Generate a JSON summary of each sensor's statistics

```sql
-- Create sample data
CREATE TEMP TABLE sensor_readings (
    reading_id SERIAL PRIMARY KEY,
    sensor_id INTEGER,
    reading_time TIMESTAMP,
    value DECIMAL(10,2),
    is_valid BOOLEAN
);

INSERT INTO sensor_readings (sensor_id, reading_time, value, is_valid) VALUES
(1, '2024-01-01 10:00:00', 23.5, true),
(1, '2024-01-01 11:00:00', 24.1, true),
(1, '2024-01-01 12:00:00', NULL, false),
(1, '2024-01-01 13:00:00', 25.3, true),
(2, '2024-01-01 10:00:00', 18.2, true),
(2, '2024-01-01 11:00:00', 150.0, false),
(2, '2024-01-01 12:00:00', 19.1, true),
(3, '2024-01-01 10:00:00', NULL, false),
(3, '2024-01-01 11:00:00', NULL, false);

-- Your query here
-- Use bool_and, bool_or, statistical aggregates, and JSON functions
```

## Summary

Aggregate functions are essential for data analysis in PostgreSQL. Key takeaways:

- **COUNT variants**: COUNT(*) counts all rows, COUNT(col) excludes NULLs, COUNT(DISTINCT col) counts unique values
- **NULL handling**: Most aggregates ignore NULLs; be explicit about this behavior
- **FILTER clause**: Enables conditional aggregation without verbose CASE statements
- **Array/String aggregates**: array_agg and string_agg collect values; always use ORDER BY
- **JSON aggregates**: jsonb_agg and jsonb_object_agg create structured JSON output
- **Boolean aggregates**: bool_and and bool_or for logical operations across rows
- **Statistical functions**: STDDEV, VARIANCE, PERCENTILE_CONT for advanced analysis

Next: Learn about [GROUP BY and HAVING clauses](./02-group-by-having.md) to organize aggregated data into meaningful groups.
