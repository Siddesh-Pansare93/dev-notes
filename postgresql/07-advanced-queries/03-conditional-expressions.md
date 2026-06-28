# Conditional Expressions

## Table of Contents
- [Theory](#theory)
- [Syntax](#syntax)
- [Examples](#examples)
- [Common Mistakes](#common-mistakes)
- [Best Practices](#best-practices)
- [Practice Exercises](#practice-exercises)

## Theory

### What are Conditional Expressions?

Conditional expressions allow you to execute different logic based on conditions evaluated at query runtime. They're essential for data transformation, categorization, default value handling, and complex business logic within SQL queries.

### Types of Conditional Expressions

**CASE Expression**:
- Most versatile conditional expression
- Two forms: Simple CASE and Searched CASE
- Can be used in SELECT, WHERE, ORDER BY, HAVING, UPDATE, and more

**COALESCE**:
- Returns first non-NULL value from a list
- Commonly used for default values and NULL handling

**NULLIF**:
- Returns NULL if two expressions are equal
- Useful for preventing division by zero and normalizing data

**GREATEST / LEAST**:
- Returns largest/smallest value from a list
- Handles NULL values according to PostgreSQL rules

### Use Cases

1. **Data Categorization**: Grouping continuous values into buckets
2. **Conditional Aggregation**: Pivot-style queries and filtered aggregates
3. **NULL Handling**: Providing defaults and cleaning data
4. **Business Logic**: Implementing complex rules in queries
5. **Data Transformation**: Converting values based on conditions
6. **Dynamic Sorting**: Conditional ORDER BY logic

### CASE vs IF

- **CASE**: SQL standard, works in all query contexts
- **IF**: PL/pgSQL only, used in procedural code (functions, procedures)

## Syntax

### Simple CASE

```sql
CASE expression
    WHEN value1 THEN result1
    WHEN value2 THEN result2
    ...
    ELSE default_result
END
```

### Searched CASE

```sql
CASE
    WHEN condition1 THEN result1
    WHEN condition2 THEN result2
    ...
    ELSE default_result
END
```

### COALESCE

```sql
COALESCE(expression1, expression2, ..., expressionN)
-- Returns first non-NULL expression
```

### NULLIF

```sql
NULLIF(expression1, expression2)
-- Returns NULL if expression1 = expression2, else returns expression1
```

### GREATEST / LEAST

```sql
GREATEST(expression1, expression2, ..., expressionN)
-- Returns largest value

LEAST(expression1, expression2, ..., expressionN)
-- Returns smallest value
```

## Examples

### Example 1: Simple CASE Expression

```sql
-- Setup table
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    product_name TEXT,
    category TEXT,
    price NUMERIC(10, 2),
    stock_quantity INT
);

INSERT INTO products (product_name, category, price, stock_quantity) VALUES
('Laptop', 'Electronics', 1200, 15),
('Mouse', 'Electronics', 25, 150),
('Desk', 'Furniture', 350, 8),
('Chair', 'Furniture', 200, 12),
('Monitor', 'Electronics', 300, 25),
('Keyboard', 'Electronics', 75, 80),
('Bookshelf', 'Furniture', 180, 5);

-- Simple CASE: categorize by stock level
SELECT
    product_name,
    stock_quantity,
    CASE category
        WHEN 'Electronics' THEN 'Tech Product'
        WHEN 'Furniture' THEN 'Home Product'
        ELSE 'Other Product'
    END AS product_type
FROM products;
```

### Example 2: Searched CASE Expression

```sql
-- Searched CASE: complex conditions
SELECT
    product_name,
    price,
    stock_quantity,
    CASE
        WHEN stock_quantity = 0 THEN 'Out of Stock'
        WHEN stock_quantity < 10 THEN 'Low Stock'
        WHEN stock_quantity < 50 THEN 'Medium Stock'
        ELSE 'Well Stocked'
    END AS stock_status,
    CASE
        WHEN price < 50 THEN 'Budget'
        WHEN price < 200 THEN 'Mid-Range'
        WHEN price < 500 THEN 'Premium'
        ELSE 'Luxury'
    END AS price_tier
FROM products
ORDER BY price DESC;
```

### Example 3: CASE in WHERE Clause

```sql
-- Use CASE in WHERE to create complex filters
SELECT
    product_name,
    category,
    price,
    stock_quantity
FROM products
WHERE
    CASE category
        WHEN 'Electronics' THEN stock_quantity < 30
        WHEN 'Furniture' THEN stock_quantity < 10
        ELSE stock_quantity < 5
    END;

-- Dynamic filtering based on multiple conditions
SELECT
    product_name,
    price
FROM products
WHERE
    CASE
        WHEN category = 'Electronics' THEN price > 50
        WHEN category = 'Furniture' THEN price > 150
        ELSE price > 100
    END;
```

### Example 4: CASE in ORDER BY

```sql
-- Custom sorting logic
SELECT
    product_name,
    category,
    stock_quantity
FROM products
ORDER BY
    CASE category
        WHEN 'Electronics' THEN 1
        WHEN 'Furniture' THEN 2
        ELSE 3
    END,
    stock_quantity ASC;

-- Conditional ascending/descending sort
SELECT
    product_name,
    price,
    stock_quantity
FROM products
ORDER BY
    CASE
        WHEN category = 'Electronics' THEN price END DESC,
    CASE
        WHEN category = 'Furniture' THEN stock_quantity END ASC;
```

### Example 5: CASE in UPDATE

```sql
-- Conditional updates
UPDATE products
SET price = CASE
    WHEN category = 'Electronics' THEN price * 1.10  -- 10% increase
    WHEN category = 'Furniture' THEN price * 1.05     -- 5% increase
    ELSE price * 1.03                                  -- 3% increase
END;

-- Verify
SELECT product_name, category, price FROM products;

-- Multi-column conditional update
UPDATE products
SET
    price = CASE
        WHEN stock_quantity < 10 THEN price * 1.15  -- Low stock premium
        ELSE price
    END,
    stock_quantity = CASE
        WHEN stock_quantity < 10 THEN stock_quantity + 50  -- Reorder low stock
        ELSE stock_quantity
    END
WHERE category = 'Electronics';
```

### Example 6: Nested CASE Expressions

```sql
-- Setup orders table
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    customer_type TEXT,  -- 'new', 'regular', 'vip'
    order_amount NUMERIC(10, 2),
    items_count INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO orders (customer_type, order_amount, items_count) VALUES
('new', 150, 3),
('regular', 450, 8),
('vip', 1200, 15),
('new', 75, 2),
('vip', 3500, 25),
('regular', 280, 6);

-- Nested CASE for complex discount logic
SELECT
    order_id,
    customer_type,
    order_amount,
    items_count,
    CASE customer_type
        WHEN 'vip' THEN
            CASE
                WHEN order_amount > 1000 THEN order_amount * 0.80  -- 20% off
                WHEN order_amount > 500 THEN order_amount * 0.85   -- 15% off
                ELSE order_amount * 0.90                            -- 10% off
            END
        WHEN 'regular' THEN
            CASE
                WHEN order_amount > 500 THEN order_amount * 0.90   -- 10% off
                WHEN order_amount > 200 THEN order_amount * 0.95   -- 5% off
                ELSE order_amount
            END
        WHEN 'new' THEN
            CASE
                WHEN order_amount > 100 THEN order_amount * 0.90   -- 10% welcome discount
                ELSE order_amount * 0.95                            -- 5% welcome discount
            END
        ELSE order_amount
    END AS discounted_amount,
    CASE customer_type
        WHEN 'vip' THEN
            CASE
                WHEN order_amount > 1000 THEN '20%'
                WHEN order_amount > 500 THEN '15%'
                ELSE '10%'
            END
        WHEN 'regular' THEN
            CASE
                WHEN order_amount > 500 THEN '10%'
                WHEN order_amount > 200 THEN '5%'
                ELSE '0%'
            END
        WHEN 'new' THEN
            CASE
                WHEN order_amount > 100 THEN '10%'
                ELSE '5%'
            END
        ELSE '0%'
    END AS discount_rate
FROM orders;
```

### Example 7: CASE with Aggregates (Pivot Queries)

```sql
-- Pivot-style aggregation using CASE
SELECT
    customer_type,
    COUNT(*) AS total_orders,
    SUM(CASE WHEN order_amount < 100 THEN 1 ELSE 0 END) AS small_orders,
    SUM(CASE WHEN order_amount BETWEEN 100 AND 500 THEN 1 ELSE 0 END) AS medium_orders,
    SUM(CASE WHEN order_amount > 500 THEN 1 ELSE 0 END) AS large_orders,
    SUM(CASE WHEN order_amount < 100 THEN order_amount ELSE 0 END) AS small_orders_revenue,
    SUM(CASE WHEN order_amount BETWEEN 100 AND 500 THEN order_amount ELSE 0 END) AS medium_orders_revenue,
    SUM(CASE WHEN order_amount > 500 THEN order_amount ELSE 0 END) AS large_orders_revenue
FROM orders
GROUP BY customer_type
ORDER BY customer_type;

-- Monthly sales pivot
ALTER TABLE orders ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;

INSERT INTO orders (customer_type, order_amount, items_count, created_at) VALUES
('regular', 200, 4, '2024-01-15'),
('vip', 800, 12, '2024-01-20'),
('new', 150, 3, '2024-02-10'),
('regular', 350, 7, '2024-02-15'),
('vip', 1500, 20, '2024-03-05');

SELECT
    customer_type,
    SUM(CASE WHEN EXTRACT(MONTH FROM created_at) = 1 THEN order_amount ELSE 0 END) AS january_sales,
    SUM(CASE WHEN EXTRACT(MONTH FROM created_at) = 2 THEN order_amount ELSE 0 END) AS february_sales,
    SUM(CASE WHEN EXTRACT(MONTH FROM created_at) = 3 THEN order_amount ELSE 0 END) AS march_sales,
    SUM(order_amount) AS total_sales
FROM orders
GROUP BY customer_type;
```

### Example 8: COALESCE for NULL Handling

```sql
-- Setup table with NULLs
CREATE TABLE employees (
    employee_id SERIAL PRIMARY KEY,
    employee_name TEXT,
    email TEXT,
    phone TEXT,
    department TEXT,
    salary NUMERIC(10, 2),
    bonus NUMERIC(10, 2),
    commission NUMERIC(10, 2)
);

INSERT INTO employees (employee_name, email, phone, department, salary, bonus, commission) VALUES
('Alice', 'alice@company.com', '555-1234', 'Sales', 60000, 5000, 3000),
('Bob', 'bob@company.com', NULL, 'Engineering', 80000, NULL, NULL),
('Carol', NULL, '555-5678', 'Sales', 65000, 4000, 2500),
('David', 'david@company.com', '555-9012', 'Engineering', 85000, 6000, NULL),
('Eve', 'eve@company.com', NULL, 'HR', 55000, NULL, NULL);

-- COALESCE for default values
SELECT
    employee_name,
    COALESCE(email, 'no-email@company.com') AS email,
    COALESCE(phone, 'No phone on file') AS phone,
    salary,
    COALESCE(bonus, 0) AS bonus,
    COALESCE(commission, 0) AS commission,
    salary + COALESCE(bonus, 0) + COALESCE(commission, 0) AS total_compensation
FROM employees;

-- COALESCE chain for fallback values
SELECT
    employee_name,
    COALESCE(email, phone, 'No contact info') AS primary_contact
FROM employees;

-- COALESCE in calculations (prevent NULL propagation)
SELECT
    employee_name,
    department,
    salary,
    bonus,
    commission,
    salary * 1.0 + COALESCE(bonus, 0) * 1.0 + COALESCE(commission, 0) * 1.0 AS total_comp,
    -- Compare with NULL propagation:
    salary + bonus + commission AS total_comp_with_nulls  -- NULL if any component is NULL
FROM employees;
```

### Example 9: NULLIF to Prevent Division by Zero

```sql
-- Setup sales performance table
CREATE TABLE sales_performance (
    sales_person TEXT,
    calls_made INT,
    successful_calls INT,
    meetings_scheduled INT,
    deals_closed INT
);

INSERT INTO sales_performance VALUES
('Alice', 100, 45, 20, 8),
('Bob', 80, 30, 15, 6),
('Carol', 0, 0, 0, 0),  -- No activity
('David', 120, 50, 0, 0),  -- Calls but no meetings
('Eve', 90, 40, 18, 10);

-- Without NULLIF: Division by zero error
-- SELECT sales_person, deals_closed / calls_made FROM sales_performance;  -- ERROR for Carol

-- With NULLIF: Safe division
SELECT
    sales_person,
    calls_made,
    successful_calls,
    meetings_scheduled,
    deals_closed,
    ROUND(successful_calls::NUMERIC / NULLIF(calls_made, 0) * 100, 2) AS success_rate,
    ROUND(meetings_scheduled::NUMERIC / NULLIF(successful_calls, 0) * 100, 2) AS meeting_conversion_rate,
    ROUND(deals_closed::NUMERIC / NULLIF(meetings_scheduled, 0) * 100, 2) AS close_rate,
    COALESCE(
        ROUND(deals_closed::NUMERIC / NULLIF(calls_made, 0) * 100, 2),
        0
    ) AS overall_efficiency
FROM sales_performance;

-- NULLIF for data normalization (convert empty strings to NULL)
CREATE TABLE user_profiles (
    user_id SERIAL PRIMARY KEY,
    username TEXT,
    bio TEXT,
    website TEXT
);

INSERT INTO user_profiles (username, bio, website) VALUES
('alice', 'Software Engineer', 'https://alice.dev'),
('bob', '', ''),  -- Empty strings
('carol', 'Designer', 'https://carol.design'),
('david', '', NULL);

SELECT
    username,
    COALESCE(NULLIF(bio, ''), 'No bio provided') AS bio,
    COALESCE(NULLIF(website, ''), 'No website') AS website
FROM user_profiles;
```

### Example 10: GREATEST and LEAST

```sql
-- Setup inventory tracking
CREATE TABLE inventory_locations (
    product_id INT,
    warehouse_a_stock INT,
    warehouse_b_stock INT,
    warehouse_c_stock INT,
    online_stock INT
);

INSERT INTO inventory_locations VALUES
(1, 50, 30, 45, 100),
(2, 0, 15, 8, 25),
(3, 120, 80, 95, 200),
(4, 5, 0, 3, 10);

-- Find max and min stock across locations
SELECT
    product_id,
    warehouse_a_stock,
    warehouse_b_stock,
    warehouse_c_stock,
    online_stock,
    GREATEST(warehouse_a_stock, warehouse_b_stock, warehouse_c_stock, online_stock) AS max_stock_location,
    LEAST(warehouse_a_stock, warehouse_b_stock, warehouse_c_stock, online_stock) AS min_stock_location,
    warehouse_a_stock + warehouse_b_stock + warehouse_c_stock + online_stock AS total_stock
FROM inventory_locations;

-- GREATEST/LEAST with dates
CREATE TABLE project_deadlines (
    project_name TEXT,
    estimated_completion DATE,
    client_deadline DATE,
    internal_deadline DATE
);

INSERT INTO project_deadlines VALUES
('Project A', '2024-03-15', '2024-03-20', '2024-03-10'),
('Project B', '2024-04-01', '2024-03-25', '2024-03-28'),
('Project C', '2024-05-10', '2024-05-15', '2024-05-05');

SELECT
    project_name,
    estimated_completion,
    client_deadline,
    internal_deadline,
    LEAST(estimated_completion, client_deadline, internal_deadline) AS earliest_deadline,
    CASE
        WHEN LEAST(estimated_completion, client_deadline, internal_deadline) = internal_deadline
            THEN 'Internal Deadline First'
        WHEN LEAST(estimated_completion, client_deadline, internal_deadline) = client_deadline
            THEN 'Client Deadline First'
        ELSE 'Estimated Completion First'
    END AS critical_path
FROM project_deadlines;

-- GREATEST/LEAST with calculations
SELECT
    product_id,
    GREATEST(
        warehouse_a_stock * 1.0,
        warehouse_b_stock * 1.1,  -- Warehouse B has 10% markup
        warehouse_c_stock * 1.05,  -- Warehouse C has 5% markup
        online_stock * 0.95        -- Online has 5% discount
    ) AS best_adjusted_stock
FROM inventory_locations;
```

### Example 11: Complex Business Logic with Multiple Conditional Expressions

```sql
-- Setup customer orders with shipping
CREATE TABLE customer_orders (
    order_id SERIAL PRIMARY KEY,
    customer_tier TEXT,  -- 'bronze', 'silver', 'gold', 'platinum'
    order_total NUMERIC(10, 2),
    weight_kg NUMERIC(5, 2),
    destination_zone TEXT,  -- 'local', 'regional', 'national', 'international'
    is_express BOOLEAN,
    order_date DATE DEFAULT CURRENT_DATE
);

INSERT INTO customer_orders (customer_tier, order_total, weight_kg, destination_zone, is_express) VALUES
('gold', 450, 5.5, 'local', false),
('bronze', 85, 2.0, 'national', false),
('platinum', 1200, 15.0, 'international', true),
('silver', 220, 3.5, 'regional', false),
('gold', 650, 8.0, 'national', true),
('bronze', 45, 1.0, 'local', false);

-- Complex shipping cost calculation
SELECT
    order_id,
    customer_tier,
    order_total,
    weight_kg,
    destination_zone,
    is_express,
    -- Base shipping cost by zone
    CASE destination_zone
        WHEN 'local' THEN 5.00
        WHEN 'regional' THEN 12.00
        WHEN 'national' THEN 20.00
        WHEN 'international' THEN 50.00
        ELSE 15.00
    END AS base_shipping,
    -- Weight surcharge
    CASE
        WHEN weight_kg <= 2 THEN 0
        WHEN weight_kg <= 5 THEN 5.00
        WHEN weight_kg <= 10 THEN 12.00
        ELSE 25.00
    END AS weight_surcharge,
    -- Express fee
    CASE
        WHEN is_express THEN
            CASE destination_zone
                WHEN 'local' THEN 10.00
                WHEN 'regional' THEN 20.00
                WHEN 'national' THEN 35.00
                WHEN 'international' THEN 75.00
            END
        ELSE 0
    END AS express_fee,
    -- Customer tier discount
    CASE customer_tier
        WHEN 'platinum' THEN 1.00  -- 100% free shipping
        WHEN 'gold' THEN 0.50      -- 50% off shipping
        WHEN 'silver' THEN 0.25    -- 25% off shipping
        WHEN 'bronze' THEN 0.00    -- No discount
        ELSE 0.00
    END AS tier_discount_rate,
    -- Final calculation
    GREATEST(
        (CASE destination_zone
            WHEN 'local' THEN 5.00
            WHEN 'regional' THEN 12.00
            WHEN 'national' THEN 20.00
            WHEN 'international' THEN 50.00
            ELSE 15.00
        END +
        CASE
            WHEN weight_kg <= 2 THEN 0
            WHEN weight_kg <= 5 THEN 5.00
            WHEN weight_kg <= 10 THEN 12.00
            ELSE 25.00
        END +
        CASE
            WHEN is_express THEN
                CASE destination_zone
                    WHEN 'local' THEN 10.00
                    WHEN 'regional' THEN 20.00
                    WHEN 'national' THEN 35.00
                    WHEN 'international' THEN 75.00
                END
            ELSE 0
        END) *
        (1 - CASE customer_tier
            WHEN 'platinum' THEN 1.00
            WHEN 'gold' THEN 0.50
            WHEN 'silver' THEN 0.25
            WHEN 'bronze' THEN 0.00
            ELSE 0.00
        END),
        0  -- Minimum shipping cost
    ) AS final_shipping_cost
FROM customer_orders;
```

### Example 12: IF in PL/pgSQL vs CASE in SQL

```sql
-- SQL CASE expression (in query)
SELECT
    employee_name,
    CASE
        WHEN salary < 60000 THEN 'Junior'
        WHEN salary < 80000 THEN 'Mid-Level'
        ELSE 'Senior'
    END AS level
FROM employees;

-- PL/pgSQL IF statement (in function)
CREATE OR REPLACE FUNCTION get_employee_level(emp_salary NUMERIC)
RETURNS TEXT AS $$
DECLARE
    level_result TEXT;
BEGIN
    IF emp_salary < 60000 THEN
        level_result := 'Junior';
    ELSIF emp_salary < 80000 THEN
        level_result := 'Mid-Level';
    ELSE
        level_result := 'Senior';
    END IF;

    RETURN level_result;
END;
$$ LANGUAGE plpgsql;

-- Use the function
SELECT
    employee_name,
    salary,
    get_employee_level(salary) AS level
FROM employees;

-- CASE in PL/pgSQL (also valid)
CREATE OR REPLACE FUNCTION get_bonus_multiplier(dept TEXT)
RETURNS NUMERIC AS $$
BEGIN
    RETURN CASE dept
        WHEN 'Sales' THEN 1.5
        WHEN 'Engineering' THEN 1.2
        WHEN 'HR' THEN 1.0
        ELSE 1.1
    END;
END;
$$ LANGUAGE plpgsql;

SELECT
    employee_name,
    department,
    salary,
    COALESCE(bonus, 0) * get_bonus_multiplier(department) AS adjusted_bonus
FROM employees;
```

## Common Mistakes

### 1. Forgetting ELSE Clause

```sql
-- WRONG: No ELSE clause can lead to NULL
SELECT
    product_name,
    CASE
        WHEN price < 50 THEN 'Cheap'
        WHEN price < 200 THEN 'Moderate'
        -- Missing ELSE for price >= 200
    END AS price_category
FROM products;
-- Returns NULL for expensive products

-- CORRECT: Always include ELSE
SELECT
    product_name,
    CASE
        WHEN price < 50 THEN 'Cheap'
        WHEN price < 200 THEN 'Moderate'
        ELSE 'Expensive'
    END AS price_category
FROM products;
```

### 2. Incorrect COALESCE Usage with Different Types

```sql
-- WRONG: Type mismatch
SELECT COALESCE(NULL, 'default', 123);  -- ERROR: different types

-- CORRECT: All same type
SELECT COALESCE(NULL, 'default', '123');  -- Returns 'default'
SELECT COALESCE(NULL::INT, 0, 123);       -- Returns 0
```

### 3. NULLIF Arguments in Wrong Order

```sql
-- WRONG: Arguments reversed
SELECT NULLIF(0, column_value);  -- Returns 0 or NULL
-- Should be:
SELECT NULLIF(column_value, 0);  -- Returns column_value or NULL if it's 0

-- Example: Safe division
SELECT
    sales,
    NULLIF(quantity, 0),  -- CORRECT
    sales / NULLIF(quantity, 0) AS avg_price
FROM orders;
```

### 4. Not Handling NULL in GREATEST/LEAST

```sql
-- WRONG: NULL propagates
SELECT GREATEST(10, 20, NULL, 30);  -- Returns NULL

-- CORRECT: Filter NULLs first
SELECT GREATEST(10, 20, COALESCE(NULL, 0), 30);  -- Returns 30
```

### 5. Overlapping CASE Conditions

```sql
-- WRONG: Overlapping conditions (first match wins)
SELECT
    CASE
        WHEN price > 100 THEN 'Expensive'   -- Matches first for price = 150
        WHEN price > 150 THEN 'Very Expensive'  -- Never matches!
        ELSE 'Cheap'
    END
FROM products;

-- CORRECT: Order conditions from specific to general
SELECT
    CASE
        WHEN price > 150 THEN 'Very Expensive'
        WHEN price > 100 THEN 'Expensive'
        ELSE 'Cheap'
    END
FROM products;
```

## Best Practices

### 1. Use COALESCE for Simple NULL Handling

```sql
-- Good: Simple and readable
SELECT COALESCE(email, 'no-email@example.com') FROM users;

-- Overkill: CASE is unnecessary here
SELECT
    CASE WHEN email IS NULL THEN 'no-email@example.com' ELSE email END
FROM users;
```

### 2. Prefer Searched CASE for Complex Conditions

```sql
-- Good: Searched CASE for ranges
SELECT
    CASE
        WHEN age < 18 THEN 'Minor'
        WHEN age < 65 THEN 'Adult'
        ELSE 'Senior'
    END
FROM people;

-- Awkward: Simple CASE doesn't work well for ranges
-- Can't use simple CASE here
```

### 3. Use NULLIF to Prevent Division by Zero

```sql
-- Good practice
SELECT
    revenue,
    costs,
    revenue / NULLIF(costs, 0) AS profit_margin
FROM financials;
```

### 4. Order CASE Conditions Carefully

```sql
-- Put most specific conditions first
SELECT
    CASE
        WHEN status = 'cancelled' AND refund_issued THEN 'Refunded'
        WHEN status = 'cancelled' THEN 'Cancelled - No Refund'
        WHEN status = 'pending' THEN 'Pending'
        ELSE 'Completed'
    END
FROM orders;
```

### 5. Use CASE for Conditional Aggregation

```sql
-- Efficient pivot using CASE in aggregates
SELECT
    category,
    COUNT(*) AS total,
    COUNT(CASE WHEN price < 100 THEN 1 END) AS budget_count,
    COUNT(CASE WHEN price >= 100 THEN 1 END) AS premium_count
FROM products
GROUP BY category;
```

### 6. Combine COALESCE and NULLIF for Robust NULL Handling

```sql
-- Handle both NULL and zero
SELECT
    sales / COALESCE(NULLIF(quantity, 0), 1) AS avg_price
FROM orders;
```

### 7. Document Complex CASE Logic

```sql
-- Add comments for business rules
SELECT
    order_id,
    -- Customer tier discount logic: Platinum=100%, Gold=50%, Silver=25%, Bronze=0%
    CASE customer_tier
        WHEN 'platinum' THEN total * 0.00  -- Free
        WHEN 'gold' THEN total * 0.50
        WHEN 'silver' THEN total * 0.75
        ELSE total  -- Bronze and others pay full
    END AS discounted_total
FROM orders;
```

## Practice Exercises

### Exercise 1: Multi-Dimensional Product Categorization

Create a query that categorizes products based on multiple dimensions:

1. Price tier (Budget < $100, Mid-Range $100-$500, Premium > $500)
2. Stock status (Out of Stock, Critical < 10, Low < 50, Normal >= 50)
3. Category priority (Electronics = High, Furniture = Medium, Other = Low)
4. Reorder recommendation (YES/NO based on combination of factors)

Use CASE expressions to implement this logic.

```sql
-- Use the products table created earlier
-- Your task: Write the categorization query
```

### Exercise 2: Sales Commission Calculator

Create a complex commission calculation system:

1. Base commission rate varies by sales tier:
   - < $10,000: 5%
   - $10,000-$50,000: 7%
   - $50,000-$100,000: 10%
   - > $100,000: 12%

2. Bonus multipliers:
   - VIP customers: +2%
   - Express orders: +1%
   - Both: +3%

3. Handle NULL values appropriately with COALESCE
4. Prevent division by zero with NULLIF when calculating average deal size

```sql
-- Setup
CREATE TABLE sales_transactions (
    transaction_id SERIAL PRIMARY KEY,
    salesperson_id INT,
    customer_type TEXT,  -- 'regular', 'vip'
    is_express BOOLEAN,
    sale_amount NUMERIC(10, 2),
    deals_count INT,
    transaction_date DATE
);

INSERT INTO sales_transactions (salesperson_id, customer_type, is_express, sale_amount, deals_count, transaction_date) VALUES
(1, 'regular', false, 8500, 12, '2024-01-15'),
(1, 'vip', true, 45000, 5, '2024-01-20'),
(2, 'regular', false, 125000, 8, '2024-01-18'),
(3, 'vip', false, 35000, 0, '2024-01-22'),  -- Note: 0 deals (division by zero case)
(2, 'vip', true, 95000, 7, '2024-01-25');

-- Your task: Calculate commission with all rules applied
```

### Exercise 3: Dynamic Report with Conditional Pivoting

Create a sales report that pivots data by month and includes conditional formatting:

1. Show sales by customer type for each month (January, February, March)
2. Use CASE with aggregates to pivot the data
3. Add a "Performance" column using CASE:
   - "Excellent" if total > $5,000
   - "Good" if total > $2,000
   - "Needs Improvement" otherwise
4. Use GREATEST/LEAST to find best/worst performing month
5. Use COALESCE to handle missing months (show $0 instead of NULL)

```sql
-- Use the orders table, add more test data across different months
INSERT INTO orders (customer_type, order_amount, items_count, created_at) VALUES
('regular', 300, 5, '2024-01-10'),
('vip', 1200, 15, '2024-01-15'),
('new', 150, 3, '2024-02-05'),
('regular', 450, 8, '2024-02-12'),
('vip', 2000, 20, '2024-03-01'),
('new', 200, 4, '2024-03-10'),
('regular', 600, 10, '2024-03-15');

-- Your task: Create the pivoted report with conditional formatting
```

## Summary

Conditional expressions are fundamental tools for implementing business logic and data transformation in PostgreSQL:

**Key Expressions**:
- **CASE**: Most versatile, two forms (Simple and Searched)
- **COALESCE**: First non-NULL value, ideal for defaults
- **NULLIF**: Returns NULL on equality, prevents division by zero
- **GREATEST/LEAST**: Max/min values from list

**Common Use Cases**:
- Data categorization and bucketing
- Conditional aggregation (pivot queries)
- NULL handling and default values
- Complex business logic in queries
- Dynamic sorting and filtering

**Best Practices**:
- Always include ELSE in CASE
- Order conditions from specific to general
- Use COALESCE for simple NULL handling
- Combine NULLIF and COALESCE for robust calculations
- Document complex conditional logic

For related advanced query topics, see:
- [Common Table Expressions](01-cte.md)
- [Views and Materialized Views](02-views.md)
- [Full-Text Search](04-full-text-search.md)
