# SQL Functions

## Table of Contents
- [Theory](#theory)
- [Syntax](#syntax)
- [Examples](#examples)
- [Common Mistakes](#common-mistakes)
- [Best Practices](#best-practices)
- [Practice Exercises](#practice-exercises)

## Theory

### What are SQL Functions?

SQL functions are named, reusable database objects that encapsulate SQL logic. They accept parameters, perform operations, and return results. PostgreSQL supports several procedural languages, but SQL functions use pure SQL syntax.

### Key Characteristics

1. **Language**: Written entirely in SQL without procedural constructs
2. **Performance**: Can be inlined by the query planner for optimization
3. **Return Types**: Scalar values, composite types, sets, or tables
4. **Determinism**: Can be marked as IMMUTABLE, STABLE, or VOLATILE
5. **Parallelism**: Can be marked as PARALLEL SAFE for parallel execution

### SQL Functions vs Views

- **Views**: Always return a result set, no parameters, SELECT only
- **Functions**: Accept parameters, can modify data, more flexible return types
- **Inline-able**: Simple SQL functions can be inlined like views for performance

### Function Categories by Volatility

1. **IMMUTABLE**: Same inputs always produce same outputs, no database modifications
   - Examples: Mathematical functions, string manipulation
   - Can be optimized aggressively by planner

2. **STABLE**: Same inputs produce same outputs within a transaction
   - Examples: Functions using current_date, reading from tables
   - Cannot be optimized as aggressively as IMMUTABLE

3. **VOLATILE**: Output can change even with same inputs
   - Examples: Functions using random(), modifying data
   - Default category, least optimizable

### Parameter Modes

- **IN**: Input parameter (default)
- **OUT**: Output parameter, doesn't need RETURN value
- **INOUT**: Both input and output
- **VARIADIC**: Accepts variable number of arguments

## Syntax

### Basic CREATE FUNCTION

```sql
CREATE [OR REPLACE] FUNCTION function_name(parameter_list)
RETURNS return_type
LANGUAGE SQL
[IMMUTABLE | STABLE | VOLATILE]
[PARALLEL {SAFE | UNSAFE | RESTRICTED}]
[CALLED ON NULL INPUT | RETURNS NULL ON NULL INPUT | STRICT]
AS $$
    -- SQL statements
$$;
```

### Parameter Syntax

```sql
-- Named parameters
CREATE FUNCTION func(param_name data_type, ...)

-- Parameter modes
CREATE FUNCTION func(
    IN input_param data_type,
    OUT output_param data_type,
    INOUT inout_param data_type,
    VARIADIC var_param data_type[]
)

-- Default values
CREATE FUNCTION func(param data_type DEFAULT default_value)
```

### Return Types

```sql
-- Scalar return
RETURNS integer

-- Composite type
RETURNS table_name

-- Set of values
RETURNS SETOF data_type

-- Table definition
RETURNS TABLE(column_name data_type, ...)

-- Generic type
RETURNS anyelement
```

### Dropping Functions

```sql
-- Drop specific function
DROP FUNCTION [IF EXISTS] function_name(parameter_types);

-- Drop with cascade
DROP FUNCTION function_name(parameter_types) CASCADE;
```

## Examples

### Example 1: Simple Scalar Function

```sql
-- Create a function to calculate circle area
CREATE OR REPLACE FUNCTION calculate_area(radius numeric)
RETURNS numeric
LANGUAGE SQL
IMMUTABLE
PARALLEL SAFE
AS $$
    SELECT 3.14159 * radius * radius;
$$;

-- Test the function
SELECT calculate_area(5);
-- Result: 78.53975

SELECT calculate_area(10.5);
-- Result: 346.36053

-- Use in a query
SELECT
    generate_series(1, 5) AS radius,
    calculate_area(generate_series(1, 5)) AS area;
```

### Example 2: Function with Multiple Parameters

```sql
-- Create a function to calculate rectangle area
CREATE OR REPLACE FUNCTION rectangle_area(
    length numeric,
    width numeric
)
RETURNS numeric
LANGUAGE SQL
IMMUTABLE
PARALLEL SAFE
RETURN length * width;  -- Simplified syntax for single expression

-- Test
SELECT rectangle_area(10, 5);
-- Result: 50

SELECT rectangle_area(7.5, 4.2);
-- Result: 31.5
```

### Example 3: Function with Default Parameters

```sql
-- Create a function with default tax rate
CREATE OR REPLACE FUNCTION calculate_total(
    subtotal numeric,
    tax_rate numeric DEFAULT 0.08
)
RETURNS numeric
LANGUAGE SQL
IMMUTABLE
AS $$
    SELECT subtotal + (subtotal * tax_rate);
$$;

-- Call with both parameters
SELECT calculate_total(100, 0.10);
-- Result: 110

-- Call with default tax rate
SELECT calculate_total(100);
-- Result: 108
```

### Example 4: VARIADIC Parameters

```sql
-- Create a function to sum variable number of integers
CREATE OR REPLACE FUNCTION sum_all(VARIADIC numbers integer[])
RETURNS integer
LANGUAGE SQL
IMMUTABLE
PARALLEL SAFE
AS $$
    SELECT sum(n) FROM unnest(numbers) AS n;
$$;

-- Test with different number of arguments
SELECT sum_all(1, 2, 3);
-- Result: 6

SELECT sum_all(10, 20, 30, 40, 50);
-- Result: 150

-- Can also pass an array
SELECT sum_all(VARIADIC ARRAY[1, 2, 3, 4]);
-- Result: 10
```

### Example 5: OUT Parameters

```sql
-- Create a function with OUT parameters
CREATE OR REPLACE FUNCTION get_circle_measurements(
    IN radius numeric,
    OUT area numeric,
    OUT circumference numeric
)
LANGUAGE SQL
IMMUTABLE
AS $$
    SELECT
        3.14159 * radius * radius,
        2 * 3.14159 * radius;
$$;

-- Call and get both outputs
SELECT * FROM get_circle_measurements(5);
-- Result: area = 78.53975, circumference = 31.4159

-- Use in a query
SELECT
    r AS radius,
    (get_circle_measurements(r)).*
FROM generate_series(1, 5) AS r;
```

### Example 6: RETURNS TABLE

```sql
-- Create sample products table
CREATE TABLE IF NOT EXISTS products (
    product_id serial PRIMARY KEY,
    name text NOT NULL,
    category text NOT NULL,
    price numeric(10,2) NOT NULL,
    stock integer NOT NULL
);

INSERT INTO products (name, category, price, stock) VALUES
('Laptop', 'Electronics', 999.99, 50),
('Mouse', 'Electronics', 29.99, 200),
('Desk', 'Furniture', 299.99, 30),
('Chair', 'Furniture', 199.99, 45),
('Monitor', 'Electronics', 349.99, 75);

-- Create a function returning a table
CREATE OR REPLACE FUNCTION get_products_by_category(cat text)
RETURNS TABLE(
    product_id integer,
    name text,
    price numeric,
    stock integer
)
LANGUAGE SQL
STABLE
AS $$
    SELECT product_id, name, price, stock
    FROM products
    WHERE category = cat
    ORDER BY price DESC;
$$;

-- Call the function
SELECT * FROM get_products_by_category('Electronics');

-- Use in joins
SELECT
    p.name,
    p.price,
    p.price * 1.08 AS price_with_tax
FROM get_products_by_category('Furniture') AS p
WHERE p.stock > 0;
```

### Example 7: RETURNS SETOF

```sql
-- Create a function returning a set of composite type
CREATE OR REPLACE FUNCTION get_expensive_products(min_price numeric)
RETURNS SETOF products
LANGUAGE SQL
STABLE
AS $$
    SELECT *
    FROM products
    WHERE price >= min_price
    ORDER BY price DESC;
$$;

-- Call the function
SELECT * FROM get_expensive_products(200);

-- Access specific columns
SELECT name, price
FROM get_expensive_products(100);
```

### Example 8: STABLE Function (Uses Database State)

```sql
-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    order_id serial PRIMARY KEY,
    customer_id integer NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    order_date date NOT NULL DEFAULT current_date
);

INSERT INTO orders (customer_id, total_amount, order_date) VALUES
(1, 150.00, '2024-01-15'),
(2, 200.00, '2024-01-20'),
(1, 300.00, '2024-01-25'),
(3, 450.00, '2024-02-01');

-- Function to get customer total for current month
CREATE OR REPLACE FUNCTION get_customer_monthly_total(cust_id integer)
RETURNS numeric
LANGUAGE SQL
STABLE  -- Uses current_date, stable within transaction
AS $$
    SELECT COALESCE(SUM(total_amount), 0)
    FROM orders
    WHERE customer_id = cust_id
      AND date_trunc('month', order_date) = date_trunc('month', current_date);
$$;

-- Test
SELECT get_customer_monthly_total(1);
```

### Example 9: Function Overloading

```sql
-- Create overloaded functions with different parameter types
CREATE OR REPLACE FUNCTION format_price(price numeric)
RETURNS text
LANGUAGE SQL
IMMUTABLE
AS $$
    SELECT '$' || price::text;
$$;

CREATE OR REPLACE FUNCTION format_price(
    price numeric,
    currency text
)
RETURNS text
LANGUAGE SQL
IMMUTABLE
AS $$
    SELECT currency || price::text;
$$;

CREATE OR REPLACE FUNCTION format_price(
    price numeric,
    currency text,
    decimals integer
)
RETURNS text
LANGUAGE SQL
IMMUTABLE
AS $$
    SELECT currency || ROUND(price, decimals)::text;
$$;

-- Test overloaded functions
SELECT format_price(99.99);
-- Result: $99.99

SELECT format_price(99.99, '€');
-- Result: €99.99

SELECT format_price(99.999, '$', 2);
-- Result: $100.00
```

### Example 10: STRICT (RETURNS NULL ON NULL INPUT)

```sql
-- Without STRICT - handles NULL explicitly
CREATE OR REPLACE FUNCTION safe_divide(
    numerator numeric,
    denominator numeric
)
RETURNS numeric
LANGUAGE SQL
IMMUTABLE
AS $$
    SELECT CASE
        WHEN denominator IS NULL OR denominator = 0 THEN NULL
        ELSE numerator / denominator
    END;
$$;

-- With STRICT - returns NULL automatically if any input is NULL
CREATE OR REPLACE FUNCTION strict_divide(
    numerator numeric,
    denominator numeric
)
RETURNS numeric
LANGUAGE SQL
IMMUTABLE
STRICT  -- Same as RETURNS NULL ON NULL INPUT
AS $$
    SELECT CASE
        WHEN denominator = 0 THEN NULL
        ELSE numerator / denominator
    END;
$$;

-- Test
SELECT safe_divide(10, 2);    -- 5
SELECT safe_divide(10, NULL);  -- NULL (handled by CASE)
SELECT strict_divide(10, 2);   -- 5
SELECT strict_divide(10, NULL); -- NULL (not executed)
```

### Example 11: Inline-able SQL Functions

```sql
-- Simple SQL function that can be inlined
CREATE OR REPLACE FUNCTION is_recent_order(order_date date)
RETURNS boolean
LANGUAGE SQL
IMMUTABLE
PARALLEL SAFE
AS $$
    SELECT order_date >= current_date - interval '30 days';
$$;

-- The planner can inline this into the query
SELECT *
FROM orders
WHERE is_recent_order(order_date);

-- Effectively becomes:
-- SELECT * FROM orders
-- WHERE order_date >= current_date - interval '30 days';

-- View execution plan
EXPLAIN SELECT * FROM orders WHERE is_recent_order(order_date);
```

### Example 12: Complex Function with Aggregation

```sql
-- Create a function to calculate statistics
CREATE OR REPLACE FUNCTION product_stats(cat text)
RETURNS TABLE(
    category text,
    product_count bigint,
    avg_price numeric,
    total_value numeric,
    min_price numeric,
    max_price numeric
)
LANGUAGE SQL
STABLE
AS $$
    SELECT
        cat,
        COUNT(*),
        ROUND(AVG(price), 2),
        ROUND(SUM(price * stock), 2),
        MIN(price),
        MAX(price)
    FROM products
    WHERE category = cat
    GROUP BY category;
$$;

-- Test
SELECT * FROM product_stats('Electronics');

-- Use with UNION
SELECT * FROM product_stats('Electronics')
UNION ALL
SELECT * FROM product_stats('Furniture');
```

## Common Mistakes

### 1. Wrong Volatility Classification

```sql
-- WRONG: Marking volatile function as IMMUTABLE
CREATE OR REPLACE FUNCTION bad_random_number()
RETURNS integer
LANGUAGE SQL
IMMUTABLE  -- Wrong! Uses random()
AS $$
    SELECT (random() * 100)::integer;
$$;

-- CORRECT: Mark as VOLATILE (default)
CREATE OR REPLACE FUNCTION good_random_number()
RETURNS integer
LANGUAGE SQL
VOLATILE
AS $$
    SELECT (random() * 100)::integer;
$$;
```

### 2. Forgetting Parameter Types in DROP

```sql
-- WRONG: Ambiguous when function is overloaded
DROP FUNCTION format_price;

-- CORRECT: Specify parameter types
DROP FUNCTION format_price(numeric);
DROP FUNCTION format_price(numeric, text);
```

### 3. Confusing RETURNS SETOF vs RETURNS TABLE

```sql
-- RETURNS SETOF requires existing type
CREATE OR REPLACE FUNCTION get_all_products()
RETURNS SETOF products  -- Must match existing table
LANGUAGE SQL
AS $$
    SELECT * FROM products;
$$;

-- RETURNS TABLE defines its own structure
CREATE OR REPLACE FUNCTION get_product_summary()
RETURNS TABLE(name text, price numeric)  -- Custom columns
LANGUAGE SQL
AS $$
    SELECT name, price FROM products;
$$;
```

### 4. Not Using STRICT When Appropriate

```sql
-- Inefficient: Checks NULL manually
CREATE OR REPLACE FUNCTION add_numbers(a integer, b integer)
RETURNS integer
LANGUAGE SQL
AS $$
    SELECT CASE WHEN a IS NULL OR b IS NULL THEN NULL ELSE a + b END;
$$;

-- Better: Use STRICT
CREATE OR REPLACE FUNCTION add_numbers(a integer, b integer)
RETURNS integer
LANGUAGE SQL
STRICT
AS $$
    SELECT a + b;
$$;
```

### 5. Incorrect OUT Parameter Usage

```sql
-- WRONG: Trying to return value with OUT parameters
CREATE OR REPLACE FUNCTION wrong_out(
    IN x integer,
    OUT y integer
)
RETURNS integer  -- Don't need RETURNS with OUT
LANGUAGE SQL
AS $$
    SELECT x * 2;
$$;

-- CORRECT: No RETURNS clause needed
CREATE OR REPLACE FUNCTION correct_out(
    IN x integer,
    OUT y integer
)
LANGUAGE SQL
AS $$
    SELECT x * 2;
$$;
```

## Best Practices

### 1. Choose Appropriate Volatility

```sql
-- IMMUTABLE for pure functions
CREATE OR REPLACE FUNCTION square(x numeric)
RETURNS numeric
LANGUAGE SQL
IMMUTABLE
PARALLEL SAFE
RETURN x * x;

-- STABLE for functions reading database
CREATE OR REPLACE FUNCTION get_product_count(cat text)
RETURNS bigint
LANGUAGE SQL
STABLE
AS $$
    SELECT COUNT(*) FROM products WHERE category = cat;
$$;

-- VOLATILE for data modification
CREATE OR REPLACE FUNCTION create_audit_log(message text)
RETURNS void
LANGUAGE SQL
VOLATILE
AS $$
    INSERT INTO audit_log(message, created_at)
    VALUES (message, now());
$$;
```

### 2. Use Named Parameters for Clarity

```sql
-- Good: Clear parameter names
CREATE OR REPLACE FUNCTION calculate_discount(
    original_price numeric,
    discount_percent numeric
)
RETURNS numeric
LANGUAGE SQL
IMMUTABLE
AS $$
    SELECT original_price * (1 - discount_percent / 100);
$$;

-- Better: Use parameter names in SQL
CREATE OR REPLACE FUNCTION apply_discount(
    p_price numeric,
    p_discount numeric
)
RETURNS numeric
LANGUAGE SQL
IMMUTABLE
AS $$
    SELECT p_price * (1 - p_discount / 100);
$$;
```

### 3. Document Your Functions

```sql
-- Add comments to functions
CREATE OR REPLACE FUNCTION calculate_tax(
    amount numeric,
    rate numeric DEFAULT 0.08
)
RETURNS numeric
LANGUAGE SQL
IMMUTABLE
AS $$
    SELECT amount * rate;
$$;

COMMENT ON FUNCTION calculate_tax(numeric, numeric) IS
'Calculates tax amount for a given amount and tax rate.
Parameters:
  - amount: The base amount to calculate tax on
  - rate: Tax rate as a decimal (default 0.08 for 8%)
Returns: The tax amount';
```

### 4. Use PARALLEL SAFE When Possible

```sql
-- Enable parallel execution for better performance
CREATE OR REPLACE FUNCTION expensive_calculation(n integer)
RETURNS numeric
LANGUAGE SQL
IMMUTABLE
PARALLEL SAFE  -- Can be used in parallel workers
AS $$
    SELECT SUM(i * i) FROM generate_series(1, n) AS i;
$$;
```

### 5. Prefer SQL Functions for Simple Logic

```sql
-- SQL function: Simple, inline-able, performant
CREATE OR REPLACE FUNCTION is_adult(age integer)
RETURNS boolean
LANGUAGE SQL
IMMUTABLE
RETURN age >= 18;

-- Don't use PL/pgSQL for simple logic like this
```

## Practice Exercises

### Exercise 1: Temperature Converter

Create functions to convert temperatures between Celsius, Fahrenheit, and Kelvin.

**Requirements:**
1. Create `celsius_to_fahrenheit(numeric)` returning numeric
2. Create `fahrenheit_to_celsius(numeric)` returning numeric
3. Create `celsius_to_kelvin(numeric)` returning numeric
4. Create an overloaded function `convert_temperature(numeric, text, text)` that accepts value, from_unit, and to_unit
5. All functions should be IMMUTABLE and PARALLEL SAFE

**Test Cases:**
```sql
SELECT celsius_to_fahrenheit(0);    -- Should return 32
SELECT fahrenheit_to_celsius(212);  -- Should return 100
SELECT celsius_to_kelvin(0);        -- Should return 273.15
SELECT convert_temperature(100, 'C', 'F');  -- Should return 212
SELECT convert_temperature(32, 'F', 'C');   -- Should return 0
```

### Exercise 2: Text Analysis Function

Create a function that analyzes text and returns statistics.

**Requirements:**
1. Create function `analyze_text(text)` that returns a table with:
   - character_count (integer)
   - word_count (integer)
   - sentence_count (integer, count periods)
   - avg_word_length (numeric, rounded to 2 decimals)
2. Should handle NULL input gracefully (use STRICT or manual check)
3. Mark with appropriate volatility

**Test Cases:**
```sql
SELECT * FROM analyze_text('Hello world. This is a test.');
-- Should return reasonable statistics

SELECT * FROM analyze_text('PostgreSQL is powerful. Functions are great!');
```

### Exercise 3: Date Range Generator

Create functions to work with date ranges.

**Requirements:**
1. Create `get_weekdays(start_date date, end_date date)` returning SETOF date
   - Should return only Monday-Friday dates in the range
2. Create `get_business_day_count(start_date date, end_date date)` returning integer
   - Count weekdays between dates
3. Create `add_business_days(start_date date, days_to_add integer)` returning date
   - Add business days (skip weekends)
4. Mark with appropriate volatility and parallelism

**Test Cases:**
```sql
SELECT * FROM get_weekdays('2024-01-01', '2024-01-15');
SELECT get_business_day_count('2024-01-01', '2024-01-31');
SELECT add_business_days('2024-01-05', 5);  -- Should skip weekend if applicable
```

## Summary

SQL functions provide a powerful way to encapsulate reusable logic in PostgreSQL. Key takeaways:

- Use appropriate volatility (IMMUTABLE/STABLE/VOLATILE) for optimization
- Mark functions as PARALLEL SAFE when possible for performance
- Leverage STRICT for NULL handling
- Use function overloading for flexible APIs
- Prefer SQL functions over PL/pgSQL for simple logic
- Choose between RETURNS SETOF and RETURNS TABLE based on needs
- Document functions with COMMENT ON

For more procedural logic, see [PL/pgSQL](02-plpgsql.md). For modifying functions with transaction control, see [Stored Procedures](03-stored-procedures.md).
