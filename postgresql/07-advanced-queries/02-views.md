# Views and Materialized Views

## Table of Contents
- [Theory](#theory)
- [Syntax](#syntax)
- [Examples](#examples)
- [Common Mistakes](#common-mistakes)
- [Best Practices](#best-practices)
- [Practice Exercises](#practice-exercises)

## Theory

### What are Views?

A view is a stored query that appears as a virtual table. It doesn't store data itself but provides a named query that can be referenced like a table. Views are useful for:

- **Simplifying complex queries**: Hide complexity behind a simple interface
- **Security**: Restrict access to specific columns or rows
- **Abstraction**: Create stable API even when underlying schema changes
- **Reusability**: Define once, use many times
- **Encapsulation**: Hide implementation details

### View Types

**Regular Views (Virtual Views)**:
- Query is executed every time the view is referenced
- Always shows current data
- No storage overhead
- Performance depends on underlying query complexity

**Materialized Views**:
- Query results are stored physically
- Must be refreshed to see updated data
- Can be indexed for better performance
- Trade-off: staleness vs. query performance

### Updatable Views

PostgreSQL automatically allows INSERT, UPDATE, and DELETE operations on simple views that:
- Reference exactly one table
- Don't use GROUP BY, HAVING, LIMIT, OFFSET, DISTINCT, UNION, etc.
- Don't use aggregate or window functions

For complex views, you need INSTEAD OF triggers to make them updatable.

### View Dependencies

Views depend on underlying tables and other views. PostgreSQL tracks these dependencies and prevents dropping objects that views depend on (unless CASCADE is used).

## Syntax

### Creating Views

```sql
-- Basic view
CREATE VIEW view_name AS
SELECT ...;

-- Replace existing view
CREATE OR REPLACE VIEW view_name AS
SELECT ...;

-- View with column aliases
CREATE VIEW view_name (column1, column2) AS
SELECT ...;

-- View with CHECK OPTION
CREATE VIEW view_name AS
SELECT ...
WITH CHECK OPTION;

-- View with LOCAL/CASCADED CHECK OPTION
CREATE VIEW view_name AS
SELECT ...
WITH LOCAL CHECK OPTION;

CREATE VIEW view_name AS
SELECT ...
WITH CASCADED CHECK OPTION;
```

### Dropping Views

```sql
-- Drop single view
DROP VIEW view_name;

-- Drop if exists
DROP VIEW IF EXISTS view_name;

-- Drop with dependencies
DROP VIEW view_name CASCADE;

-- Drop multiple views
DROP VIEW view1, view2, view3;
```

### Materialized Views

```sql
-- Create materialized view
CREATE MATERIALIZED VIEW mv_name AS
SELECT ...
[WITH [NO] DATA];

-- Refresh materialized view
REFRESH MATERIALIZED VIEW mv_name;

-- Refresh concurrently (requires unique index)
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_name;

-- Drop materialized view
DROP MATERIALIZED VIEW mv_name;
```

### Security Barrier Views

```sql
-- Create security barrier view
CREATE VIEW secure_view
WITH (security_barrier = true) AS
SELECT ...;
```

## Examples

### Example 1: Basic Views for Simplification

```sql
-- Setup tables
CREATE TABLE customers (
    customer_id SERIAL PRIMARY KEY,
    customer_name TEXT,
    email TEXT,
    country TEXT,
    status TEXT
);

CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(customer_id),
    order_date DATE,
    total_amount NUMERIC(10, 2),
    status TEXT
);

INSERT INTO customers (customer_name, email, country, status) VALUES
('John Doe', 'john@example.com', 'USA', 'active'),
('Jane Smith', 'jane@example.com', 'Canada', 'active'),
('Bob Johnson', 'bob@example.com', 'USA', 'inactive'),
('Alice Williams', 'alice@example.com', 'UK', 'active');

INSERT INTO orders (customer_id, order_date, total_amount, status) VALUES
(1, '2024-01-15', 150.00, 'completed'),
(1, '2024-01-20', 200.00, 'completed'),
(2, '2024-01-18', 350.00, 'completed'),
(2, '2024-01-25', 120.00, 'pending'),
(4, '2024-01-22', 500.00, 'completed');

-- Create simple view
CREATE VIEW active_customers AS
SELECT
    customer_id,
    customer_name,
    email,
    country
FROM customers
WHERE status = 'active';

-- Use the view
SELECT * FROM active_customers WHERE country = 'USA';

-- Create view with aggregated data
CREATE VIEW customer_order_summary AS
SELECT
    c.customer_id,
    c.customer_name,
    c.email,
    COUNT(o.order_id) AS total_orders,
    COALESCE(SUM(o.total_amount), 0) AS total_spent,
    MAX(o.order_date) AS last_order_date
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id
WHERE c.status = 'active'
GROUP BY c.customer_id, c.customer_name, c.email;

-- Query the view
SELECT * FROM customer_order_summary
WHERE total_spent > 100
ORDER BY total_spent DESC;
```

### Example 2: CREATE OR REPLACE VIEW

```sql
-- Initial view
CREATE VIEW order_stats AS
SELECT
    customer_id,
    COUNT(*) AS order_count,
    SUM(total_amount) AS total_amount
FROM orders
GROUP BY customer_id;

-- Later, update to include more metrics
CREATE OR REPLACE VIEW order_stats AS
SELECT
    customer_id,
    COUNT(*) AS order_count,
    SUM(total_amount) AS total_amount,
    AVG(total_amount) AS avg_amount,
    MIN(order_date) AS first_order,
    MAX(order_date) AS last_order
FROM orders
GROUP BY customer_id;

-- Verify the updated view
SELECT * FROM order_stats;
```

### Example 3: Updatable Views

```sql
-- Create simple updatable view
CREATE VIEW usa_customers AS
SELECT
    customer_id,
    customer_name,
    email,
    country
FROM customers
WHERE country = 'USA';

-- This works because it's a simple view
INSERT INTO usa_customers (customer_name, email, country)
VALUES ('Mike Davis', 'mike@example.com', 'USA');

UPDATE usa_customers
SET customer_name = 'Michael Davis'
WHERE email = 'mike@example.com';

-- View the results
SELECT * FROM usa_customers;
SELECT * FROM customers WHERE country = 'USA';

-- Problem: Can insert non-USA customers through the view
INSERT INTO usa_customers (customer_name, email, country)
VALUES ('Pierre Dubois', 'pierre@example.com', 'France');

-- This succeeds but violates the view's logic!
SELECT * FROM usa_customers;  -- Pierre is not shown
SELECT * FROM customers WHERE customer_name = 'Pierre Dubois';  -- But exists in base table
```

### Example 4: WITH CHECK OPTION

```sql
-- Drop and recreate with CHECK OPTION
DROP VIEW usa_customers;

CREATE VIEW usa_customers AS
SELECT
    customer_id,
    customer_name,
    email,
    country,
    status
FROM customers
WHERE country = 'USA'
WITH CHECK OPTION;

-- Now this will fail
INSERT INTO usa_customers (customer_name, email, country, status)
VALUES ('Pierre Dubois', 'pierre@example.com', 'France', 'active');
-- ERROR: new row violates check option for view "usa_customers"

-- This succeeds
INSERT INTO usa_customers (customer_name, email, country, status)
VALUES ('Sarah Connor', 'sarah@example.com', 'USA', 'active');

-- Updates that violate the condition also fail
UPDATE usa_customers
SET country = 'Canada'
WHERE customer_name = 'Sarah Connor';
-- ERROR: new row violates check option for view "usa_customers"

SELECT * FROM usa_customers;
```

### Example 5: Materialized Views

```sql
-- Create complex aggregation
CREATE MATERIALIZED VIEW daily_sales_summary AS
SELECT
    order_date,
    COUNT(*) AS order_count,
    SUM(total_amount) AS total_sales,
    AVG(total_amount) AS avg_order_value,
    MIN(total_amount) AS min_order,
    MAX(total_amount) AS max_order
FROM orders
WHERE status = 'completed'
GROUP BY order_date
ORDER BY order_date;

-- Query the materialized view (fast!)
SELECT * FROM daily_sales_summary;

-- Add new data
INSERT INTO orders (customer_id, order_date, total_amount, status) VALUES
(1, CURRENT_DATE, 450.00, 'completed'),
(2, CURRENT_DATE, 300.00, 'completed');

-- Materialized view still shows old data
SELECT * FROM daily_sales_summary WHERE order_date = CURRENT_DATE;
-- Returns no rows (or old data)

-- Refresh to see new data
REFRESH MATERIALIZED VIEW daily_sales_summary;

-- Now we see the new data
SELECT * FROM daily_sales_summary WHERE order_date = CURRENT_DATE;
```

### Example 6: Indexing Materialized Views

```sql
-- Create materialized view for product sales analysis
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    product_name TEXT,
    category TEXT,
    price NUMERIC(10, 2)
);

CREATE TABLE order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(order_id),
    product_id INT REFERENCES products(product_id),
    quantity INT,
    unit_price NUMERIC(10, 2)
);

INSERT INTO products (product_name, category, price) VALUES
('Laptop', 'Electronics', 1200),
('Mouse', 'Electronics', 25),
('Desk', 'Furniture', 350),
('Chair', 'Furniture', 200),
('Monitor', 'Electronics', 300);

INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
(1, 1, 1, 1200),
(1, 2, 2, 25),
(2, 3, 1, 350),
(3, 1, 2, 1200),
(3, 5, 1, 300);

-- Create materialized view
CREATE MATERIALIZED VIEW product_sales_summary AS
SELECT
    p.product_id,
    p.product_name,
    p.category,
    COUNT(oi.order_item_id) AS times_sold,
    SUM(oi.quantity) AS total_quantity_sold,
    SUM(oi.quantity * oi.unit_price) AS total_revenue
FROM products p
LEFT JOIN order_items oi ON p.product_id = oi.product_id
GROUP BY p.product_id, p.product_name, p.category;

-- Create indexes on materialized view
CREATE INDEX idx_product_sales_category ON product_sales_summary(category);
CREATE INDEX idx_product_sales_revenue ON product_sales_summary(total_revenue);
CREATE UNIQUE INDEX idx_product_sales_id ON product_sales_summary(product_id);

-- Fast queries using indexes
SELECT * FROM product_sales_summary
WHERE category = 'Electronics'
ORDER BY total_revenue DESC;

-- Now we can use REFRESH CONCURRENTLY (requires unique index)
INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
(4, 2, 5, 25);

-- Refresh without locking the view
REFRESH MATERIALIZED VIEW CONCURRENTLY product_sales_summary;

SELECT * FROM product_sales_summary WHERE product_name = 'Mouse';
```

### Example 7: Security Barrier Views

```sql
-- Create sensitive data table
CREATE TABLE employee_salaries (
    employee_id INT PRIMARY KEY,
    employee_name TEXT,
    department TEXT,
    salary NUMERIC(10, 2),
    ssn TEXT  -- Sensitive!
);

INSERT INTO employee_salaries VALUES
(1, 'Alice', 'Engineering', 120000, '123-45-6789'),
(2, 'Bob', 'Engineering', 110000, '234-56-7890'),
(3, 'Carol', 'Sales', 95000, '345-67-8901'),
(4, 'David', 'Sales', 90000, '456-78-9012');

-- Regular view (potential security issue)
CREATE VIEW employee_public AS
SELECT
    employee_id,
    employee_name,
    department,
    salary
FROM employee_salaries
WHERE department = 'Engineering';

-- Without security_barrier, optimizer might push predicates down
-- potentially exposing filtered data
SELECT * FROM employee_public WHERE salary > 100000;

-- Security barrier view (safer for row-level security)
CREATE VIEW employee_public_secure
WITH (security_barrier = true) AS
SELECT
    employee_id,
    employee_name,
    department,
    'REDACTED' AS ssn_partial
FROM employee_salaries
WHERE department = 'Engineering';

-- The security_barrier ensures predicates don't leak information
SELECT * FROM employee_public_secure WHERE employee_name LIKE '%';
```

### Example 8: Views for API Abstraction

```sql
-- Original schema
CREATE TABLE user_accounts (
    user_id SERIAL PRIMARY KEY,
    username TEXT,
    password_hash TEXT,
    email TEXT,
    created_at TIMESTAMP,
    last_login TIMESTAMP
);

-- Create API view that hides sensitive fields
CREATE VIEW api_users AS
SELECT
    user_id,
    username,
    email,
    created_at,
    last_login,
    CASE
        WHEN last_login > CURRENT_TIMESTAMP - INTERVAL '30 days'
        THEN 'active'
        ELSE 'inactive'
    END AS status
FROM user_accounts;

-- Application only accesses api_users, not user_accounts
-- This allows schema changes without breaking the API

-- Later: add new column to base table
ALTER TABLE user_accounts ADD COLUMN phone TEXT;

-- Update view to include it
CREATE OR REPLACE VIEW api_users AS
SELECT
    user_id,
    username,
    email,
    phone,  -- New field
    created_at,
    last_login,
    CASE
        WHEN last_login > CURRENT_TIMESTAMP - INTERVAL '30 days'
        THEN 'active'
        ELSE 'inactive'
    END AS status
FROM user_accounts;
-- Applications using the view automatically get the new field
```

### Example 9: View Dependency Management

```sql
-- Create base view
CREATE VIEW base_customers AS
SELECT customer_id, customer_name, email, country
FROM customers
WHERE status = 'active';

-- Create dependent view
CREATE VIEW premium_customers AS
SELECT
    bc.customer_id,
    bc.customer_name,
    bc.email,
    cos.total_spent
FROM base_customers bc
JOIN customer_order_summary cos ON bc.customer_id = cos.customer_id
WHERE cos.total_spent > 500;

-- Try to drop base view
DROP VIEW base_customers;
-- ERROR: cannot drop view base_customers because other objects depend on it

-- Check dependencies
SELECT
    dependent_ns.nspname AS dependent_schema,
    dependent_view.relname AS dependent_view,
    source_ns.nspname AS source_schema,
    source_table.relname AS source_table
FROM pg_depend
JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid
JOIN pg_class AS dependent_view ON pg_rewrite.ev_class = dependent_view.oid
JOIN pg_class AS source_table ON pg_depend.refobjid = source_table.oid
JOIN pg_namespace AS dependent_ns ON dependent_ns.oid = dependent_view.relnamespace
JOIN pg_namespace AS source_ns ON source_ns.oid = source_table.relnamespace
WHERE source_table.relname = 'base_customers'
AND dependent_view.relname <> source_table.relname;

-- Drop with cascade
DROP VIEW base_customers CASCADE;
-- NOTICE: drop cascades to view premium_customers

-- Both views are now gone
SELECT * FROM base_customers;  -- ERROR
SELECT * FROM premium_customers;  -- ERROR
```

### Example 10: Materialized View Refresh Strategies

```sql
-- Create large fact table simulation
CREATE TABLE page_views (
    page_view_id SERIAL PRIMARY KEY,
    user_id INT,
    page_url TEXT,
    viewed_at TIMESTAMP,
    session_id TEXT
);

-- Insert sample data
INSERT INTO page_views (user_id, page_url, viewed_at, session_id)
SELECT
    (random() * 1000)::INT,
    '/page' || (random() * 100)::INT,
    CURRENT_TIMESTAMP - (random() * INTERVAL '30 days'),
    md5(random()::TEXT)
FROM generate_series(1, 100000);

-- Create materialized view for analytics
CREATE MATERIALIZED VIEW hourly_page_views AS
SELECT
    DATE_TRUNC('hour', viewed_at) AS hour,
    COUNT(*) AS page_views,
    COUNT(DISTINCT user_id) AS unique_users,
    COUNT(DISTINCT session_id) AS unique_sessions
FROM page_views
GROUP BY DATE_TRUNC('hour', viewed_at)
ORDER BY hour DESC;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX idx_hourly_page_views_hour ON hourly_page_views(hour);

-- Strategy 1: Full refresh (locks view, fast for small data)
REFRESH MATERIALIZED VIEW hourly_page_views;

-- Strategy 2: Concurrent refresh (no lock, but requires unique index)
REFRESH MATERIALIZED VIEW CONCURRENTLY hourly_page_views;

-- Strategy 3: Scheduled refresh (using cron or pg_cron extension)
-- In practice, you'd set up a cron job or use pg_cron:
-- SELECT cron.schedule('refresh-hourly-views', '0 * * * *',
--   'REFRESH MATERIALIZED VIEW CONCURRENTLY hourly_page_views');

-- Strategy 4: Incremental update pattern (manual approach)
-- Store last refresh time
CREATE TABLE mv_refresh_log (
    mv_name TEXT PRIMARY KEY,
    last_refresh TIMESTAMP
);

INSERT INTO mv_refresh_log VALUES ('hourly_page_views', CURRENT_TIMESTAMP);

-- Later, only process new data (requires manual implementation)
-- This is advanced and typically done with triggers or application logic
```

### Example 11: View with Complex Business Logic

```sql
-- Create orders and returns tables
CREATE TABLE order_returns (
    return_id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(order_id),
    return_date DATE,
    refund_amount NUMERIC(10, 2),
    reason TEXT
);

-- Complex business logic view
CREATE VIEW customer_health_score AS
SELECT
    c.customer_id,
    c.customer_name,
    c.email,
    COALESCE(o.order_count, 0) AS total_orders,
    COALESCE(o.total_spent, 0) AS lifetime_value,
    COALESCE(r.return_count, 0) AS total_returns,
    COALESCE(r.return_amount, 0) AS total_refunded,
    CASE
        WHEN o.order_count IS NULL THEN 0
        WHEN r.return_count IS NULL THEN 100
        ELSE GREATEST(0, 100 - (r.return_count::NUMERIC / o.order_count * 100))
    END AS health_score,
    CASE
        WHEN o.total_spent > 1000 AND COALESCE(r.return_count, 0) = 0 THEN 'VIP'
        WHEN o.total_spent > 500 THEN 'Premium'
        WHEN o.order_count >= 3 THEN 'Regular'
        WHEN o.order_count >= 1 THEN 'New'
        ELSE 'Prospect'
    END AS customer_tier,
    CASE
        WHEN o.last_order > CURRENT_DATE - INTERVAL '30 days' THEN 'Active'
        WHEN o.last_order > CURRENT_DATE - INTERVAL '90 days' THEN 'At Risk'
        WHEN o.last_order IS NOT NULL THEN 'Churned'
        ELSE 'Never Purchased'
    END AS engagement_status
FROM customers c
LEFT JOIN (
    SELECT
        customer_id,
        COUNT(*) AS order_count,
        SUM(total_amount) AS total_spent,
        MAX(order_date) AS last_order
    FROM orders
    WHERE status = 'completed'
    GROUP BY customer_id
) o ON c.customer_id = o.customer_id
LEFT JOIN (
    SELECT
        o.customer_id,
        COUNT(*) AS return_count,
        SUM(r.refund_amount) AS return_amount
    FROM order_returns r
    JOIN orders o ON r.order_id = o.order_id
    GROUP BY o.customer_id
) r ON c.customer_id = r.customer_id
WHERE c.status = 'active';

-- Use the complex view simply
SELECT
    customer_tier,
    engagement_status,
    COUNT(*) AS customer_count,
    AVG(health_score) AS avg_health_score,
    SUM(lifetime_value) AS total_ltv
FROM customer_health_score
GROUP BY customer_tier, engagement_status
ORDER BY customer_tier, engagement_status;
```

## Common Mistakes

### 1. Not Using CREATE OR REPLACE for View Updates

```sql
-- WRONG: Have to drop first
DROP VIEW my_view;
CREATE VIEW my_view AS SELECT ...;

-- CORRECT: Use CREATE OR REPLACE
CREATE OR REPLACE VIEW my_view AS SELECT ...;
```

### 2. Forgetting to Refresh Materialized Views

```sql
-- Create materialized view
CREATE MATERIALIZED VIEW sales_summary AS
SELECT DATE(order_date), SUM(total_amount)
FROM orders GROUP BY DATE(order_date);

-- Add new data
INSERT INTO orders (order_date, total_amount) VALUES (CURRENT_DATE, 100);

-- WRONG: Query without refreshing
SELECT * FROM sales_summary WHERE date = CURRENT_DATE;
-- Returns stale data!

-- CORRECT: Refresh first
REFRESH MATERIALIZED VIEW sales_summary;
SELECT * FROM sales_summary WHERE date = CURRENT_DATE;
```

### 3. Creating Materialized Views Without Unique Indexes

```sql
-- Create materialized view
CREATE MATERIALIZED VIEW product_stats AS
SELECT product_id, COUNT(*) FROM order_items GROUP BY product_id;

-- WRONG: Try concurrent refresh without unique index
REFRESH MATERIALIZED VIEW CONCURRENTLY product_stats;
-- ERROR: cannot refresh materialized view "product_stats" concurrently

-- CORRECT: Create unique index first
CREATE UNIQUE INDEX idx_product_stats_id ON product_stats(product_id);
REFRESH MATERIALIZED VIEW CONCURRENTLY product_stats;
```

### 4. Not Using WITH CHECK OPTION for Restrictive Views

```sql
-- WRONG: View without check option
CREATE VIEW active_users AS
SELECT * FROM users WHERE status = 'active';

-- This succeeds but violates view logic
INSERT INTO active_users (username, status) VALUES ('test', 'inactive');

-- CORRECT: Use WITH CHECK OPTION
CREATE VIEW active_users AS
SELECT * FROM users WHERE status = 'active'
WITH CHECK OPTION;

-- Now this fails as expected
INSERT INTO active_users (username, status) VALUES ('test', 'inactive');
```

### 5. Creating Circular View Dependencies

```sql
-- WRONG: Circular dependency
CREATE VIEW view_a AS SELECT * FROM view_b;
CREATE VIEW view_b AS SELECT * FROM view_a;
-- ERROR: infinite recursion

-- CORRECT: Ensure one-way dependency chain
CREATE VIEW base_view AS SELECT * FROM table1;
CREATE VIEW derived_view AS SELECT * FROM base_view;
```

## Best Practices

### 1. Use Views for Consistent Business Logic

```sql
-- Define business logic once
CREATE VIEW active_high_value_customers AS
SELECT
    customer_id,
    customer_name,
    total_spent
FROM customer_order_summary
WHERE
    total_spent > 1000
    AND last_order_date > CURRENT_DATE - INTERVAL '90 days';

-- Use consistently across application
SELECT * FROM active_high_value_customers;
```

### 2. Name Views Clearly

```sql
-- Good names indicate purpose and content
CREATE VIEW v_active_customers AS ...;          -- 'v_' prefix for views
CREATE MATERIALIZED VIEW mv_daily_sales AS ...; -- 'mv_' prefix for materialized views
CREATE VIEW rpt_monthly_revenue AS ...;         -- 'rpt_' for reporting views
```

### 3. Document Complex Views

```sql
-- Add comments to views
COMMENT ON VIEW customer_health_score IS
'Customer segmentation view combining orders, returns, and engagement metrics.
Updated: 2024-01-15
Owner: Analytics Team
Refresh: Real-time (regular view)';

COMMENT ON MATERIALIZED VIEW daily_sales_summary IS
'Aggregated daily sales metrics for reporting dashboard.
Refresh: Hourly via cron job
Dependencies: orders table
Performance: Indexed on order_date';
```

### 4. Index Materialized Views Appropriately

```sql
-- Create materialized view
CREATE MATERIALIZED VIEW customer_analytics AS
SELECT ...;

-- Add indexes based on query patterns
CREATE INDEX idx_ca_customer_id ON customer_analytics(customer_id);
CREATE INDEX idx_ca_date ON customer_analytics(analysis_date);
CREATE INDEX idx_ca_segment ON customer_analytics(customer_segment);

-- For concurrent refresh, need unique index
CREATE UNIQUE INDEX idx_ca_unique ON customer_analytics(customer_id, analysis_date);
```

### 5. Use Materialized Views for Expensive Queries

```sql
-- If this query is slow and run frequently
SELECT
    complex_aggregations...
FROM large_table
JOIN another_large_table
WHERE expensive_conditions;

-- Make it a materialized view
CREATE MATERIALIZED VIEW fast_analytics AS
SELECT
    complex_aggregations...
FROM large_table
JOIN another_large_table
WHERE expensive_conditions;

-- Set up periodic refresh
-- REFRESH MATERIALIZED VIEW CONCURRENTLY fast_analytics;
```

### 6. Consider View Security

```sql
-- For row-level security, use security_barrier
CREATE VIEW department_data
WITH (security_barrier = true) AS
SELECT *
FROM sensitive_table
WHERE department_id = current_setting('app.current_department')::INT;

-- Grant limited access
GRANT SELECT ON department_data TO department_users;
```

### 7. Plan Materialized View Refresh Strategy

```sql
-- For near-real-time data: use triggers or frequent cron
-- For daily reports: refresh nightly during off-peak
-- For analytical dashboards: refresh hourly

-- Example: Create refresh function
CREATE OR REPLACE FUNCTION refresh_all_mv()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY hourly_page_views;
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_sales_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY product_sales_summary;
END;
$$ LANGUAGE plpgsql;

-- Schedule with pg_cron (if installed)
-- SELECT cron.schedule('refresh-materialized-views', '0 * * * *',
--   'SELECT refresh_all_mv()');
```

## Practice Exercises

### Exercise 1: Create a Multi-Level View Hierarchy

Create a hierarchy of views for an e-commerce reporting system:

1. Base view: `v_order_details` - Combines orders, order_items, products, and customers
2. Aggregation view: `v_customer_metrics` - Customer-level aggregations
3. Materialized view: `mv_daily_dashboard` - Daily dashboard metrics with indexes
4. Implement proper refresh strategy for the materialized view

```sql
-- Setup schema (if needed)
-- Tables: customers, orders, order_items, products
-- Your task: Create the view hierarchy
```

### Exercise 2: Implement Updatable View with Business Rules

Create an updatable view for managing product inventory that:

1. Shows only products with stock > 0
2. Uses WITH CHECK OPTION to prevent negative stock
3. Includes computed column for stock status (Low/Medium/High)
4. Test INSERT, UPDATE, and DELETE operations
5. Show what happens when trying to update stock to 0

```sql
-- Setup
CREATE TABLE product_inventory (
    product_id SERIAL PRIMARY KEY,
    product_name TEXT,
    stock_quantity INT,
    reorder_level INT,
    price NUMERIC(10, 2)
);

-- Your task: Create the updatable view and test it
```

### Exercise 3: Materialized View Performance Optimization

Given a slow analytical query:

1. Create an appropriate materialized view
2. Add indexes to optimize common query patterns
3. Implement concurrent refresh capability
4. Compare query performance before/after
5. Create a refresh log to track refresh times

```sql
-- Setup: Large dataset
CREATE TABLE web_events (
    event_id SERIAL PRIMARY KEY,
    user_id INT,
    event_type TEXT,
    page_url TEXT,
    event_timestamp TIMESTAMP,
    session_id TEXT,
    country TEXT
);

-- Insert test data
INSERT INTO web_events (user_id, event_type, page_url, event_timestamp, session_id, country)
SELECT
    (random() * 10000)::INT,
    (ARRAY['page_view', 'click', 'signup', 'purchase'])[floor(random() * 4 + 1)],
    '/page' || (random() * 50)::INT,
    CURRENT_TIMESTAMP - (random() * INTERVAL '60 days'),
    md5((random() * 1000)::TEXT),
    (ARRAY['USA', 'UK', 'Canada', 'Germany', 'France'])[floor(random() * 5 + 1)]
FROM generate_series(1, 500000);

-- Slow query to optimize
SELECT
    DATE(event_timestamp) AS event_date,
    country,
    event_type,
    COUNT(*) AS event_count,
    COUNT(DISTINCT user_id) AS unique_users,
    COUNT(DISTINCT session_id) AS unique_sessions
FROM web_events
GROUP BY DATE(event_timestamp), country, event_type
ORDER BY event_date DESC, country, event_type;

-- Your task: Create optimized materialized view with indexes
```

## Summary

Views and materialized views are essential PostgreSQL features for abstraction, security, and performance:

**Regular Views**:
- Virtual tables with no storage overhead
- Always show current data
- Use for simplification, security, and API abstraction
- Can be updatable for simple cases

**Materialized Views**:
- Physically store query results
- Require explicit refresh
- Can be indexed for performance
- Use CONCURRENTLY for non-blocking refresh

**Best Practices**:
- Use CREATE OR REPLACE for easy updates
- Add WITH CHECK OPTION for data integrity
- Index materialized views based on query patterns
- Document complex views
- Plan refresh strategies for materialized views
- Use security_barrier for row-level security

For related advanced query topics, see:
- [Common Table Expressions](01-cte.md)
- [Conditional Expressions](03-conditional-expressions.md)
- [Full-Text Search](04-full-text-search.md)
