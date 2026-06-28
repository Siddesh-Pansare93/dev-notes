# PL/pgSQL - PostgreSQL Procedural Language

## Table of Contents
- [Theory](#theory)
- [Syntax](#syntax)
- [Examples](#examples)
- [Common Mistakes](#common-mistakes)
- [Best Practices](#best-practices)
- [Practice Exercises](#practice-exercises)

## Theory

### What is PL/pgSQL?

PL/pgSQL (Procedural Language/PostgreSQL) is PostgreSQL's primary procedural programming language. It extends SQL with:
- Variables and assignments
- Control flow (IF, LOOP, CASE)
- Exception handling
- Dynamic SQL execution
- Complex logic that SQL alone cannot express

### When to Use PL/pgSQL

**Use PL/pgSQL when you need:**
- Complex conditional logic
- Loops and iterations
- Exception handling
- Multiple SQL statements with shared state
- Dynamic SQL construction
- Trigger functions

**Use SQL functions when:**
- Logic is simple and can be expressed in a single SQL query
- Performance is critical (SQL functions can be inlined)
- No procedural constructs needed

### PL/pgSQL Function Structure

```
CREATE FUNCTION name(parameters)
RETURNS type
LANGUAGE plpgsql
AS $$
DECLARE
    -- Variable declarations
BEGIN
    -- Executable statements
    -- Return statement
EXCEPTION
    -- Exception handlers
END;
$$;
```

### Variable Scope

- Variables declared in DECLARE are local to that block
- Nested blocks can shadow outer variables
- Parameters are visible throughout the function
- %TYPE and %ROWTYPE link variables to database schema

### Return Mechanisms

- **RETURN**: Returns a single value and exits
- **RETURN NEXT**: Adds a row to result set, continues execution
- **RETURN QUERY**: Adds query results to result set
- **RETURN**: In procedures, just exits (no value)

## Syntax

### Basic Function Structure

```sql
CREATE OR REPLACE FUNCTION function_name(param1 type1, ...)
RETURNS return_type
LANGUAGE plpgsql
AS $$
DECLARE
    variable_name data_type [:= initial_value];
BEGIN
    -- Statements
    RETURN value;
END;
$$;
```

### Variable Declaration

```sql
DECLARE
    -- Basic declaration
    counter integer;
    total numeric := 0;

    -- Using %TYPE
    product_price products.price%TYPE;

    -- Using %ROWTYPE
    product_row products%ROWTYPE;

    -- RECORD type
    rec RECORD;

    -- Constants
    tax_rate CONSTANT numeric := 0.08;

    -- Arrays
    numbers integer[];
```

### Control Structures

```sql
-- IF statement
IF condition THEN
    statements;
ELSIF condition THEN
    statements;
ELSE
    statements;
END IF;

-- CASE statement
CASE expression
    WHEN value1 THEN statements;
    WHEN value2 THEN statements;
    ELSE statements;
END CASE;

-- CASE expression
variable := CASE
    WHEN condition THEN value1
    WHEN condition THEN value2
    ELSE value3
END;

-- Simple LOOP
LOOP
    statements;
    EXIT WHEN condition;
END LOOP;

-- WHILE loop
WHILE condition LOOP
    statements;
END LOOP;

-- FOR integer loop
FOR counter IN [REVERSE] start..end [BY step] LOOP
    statements;
END LOOP;

-- FOR query loop
FOR record IN query LOOP
    statements;
END LOOP;

-- FOREACH array loop
FOREACH element IN ARRAY array_variable LOOP
    statements;
END LOOP;
```

### Exception Handling

```sql
BEGIN
    statements;
EXCEPTION
    WHEN exception_name THEN
        handler_statements;
    WHEN OTHERS THEN
        handler_statements;
END;
```

### Dynamic SQL

```sql
-- EXECUTE for dynamic SQL
EXECUTE 'SQL statement' INTO variable;

-- Using format() for safety
EXECUTE format('SELECT * FROM %I WHERE %I = %L',
    table_name, column_name, value);

-- USING clause
EXECUTE 'SELECT * FROM table WHERE id = $1' USING variable;
```

## Examples

### Example 1: Basic Variable Declaration and Assignment

```sql
-- Create a simple function with variables
CREATE OR REPLACE FUNCTION calculate_order_total(
    order_id integer
)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
    subtotal numeric := 0;
    tax_amount numeric;
    shipping numeric := 10.00;
    total numeric;
    tax_rate CONSTANT numeric := 0.08;
BEGIN
    -- Calculate subtotal (simplified - would normally query order items)
    subtotal := 150.50;

    -- Calculate tax
    tax_amount := subtotal * tax_rate;

    -- Calculate total
    total := subtotal + tax_amount + shipping;

    RETURN total;
END;
$$;

-- Test
SELECT calculate_order_total(1);
-- Result: ~172.54
```

### Example 2: Using %TYPE and %ROWTYPE

```sql
-- Create sample table
CREATE TABLE IF NOT EXISTS employees (
    employee_id serial PRIMARY KEY,
    first_name text NOT NULL,
    last_name text NOT NULL,
    salary numeric(10,2) NOT NULL,
    department text NOT NULL
);

INSERT INTO employees (first_name, last_name, salary, department) VALUES
('John', 'Doe', 75000, 'Engineering'),
('Jane', 'Smith', 82000, 'Engineering'),
('Bob', 'Johnson', 68000, 'Sales');

-- Function using %TYPE and %ROWTYPE
CREATE OR REPLACE FUNCTION get_employee_info(emp_id integer)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    -- Variable linked to column type
    emp_salary employees.salary%TYPE;

    -- Variable for entire row
    emp_row employees%ROWTYPE;

    result text;
BEGIN
    -- Fetch employee data
    SELECT * INTO emp_row
    FROM employees
    WHERE employee_id = emp_id;

    -- Check if found
    IF NOT FOUND THEN
        RETURN 'Employee not found';
    END IF;

    -- Build result string
    result := format('%s %s earns $%s in %s department',
        emp_row.first_name,
        emp_row.last_name,
        emp_row.salary,
        emp_row.department
    );

    RETURN result;
END;
$$;

-- Test
SELECT get_employee_info(1);
-- Result: "John Doe earns $75000.00 in Engineering department"
```

### Example 3: IF/ELSIF/ELSE Statement

```sql
-- Function with conditional logic
CREATE OR REPLACE FUNCTION categorize_salary(salary numeric)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    category text;
BEGIN
    IF salary IS NULL THEN
        category := 'Unknown';
    ELSIF salary < 50000 THEN
        category := 'Entry Level';
    ELSIF salary >= 50000 AND salary < 80000 THEN
        category := 'Mid Level';
    ELSIF salary >= 80000 AND salary < 120000 THEN
        category := 'Senior Level';
    ELSE
        category := 'Executive';
    END IF;

    RETURN category;
END;
$$;

-- Test
SELECT
    first_name,
    salary,
    categorize_salary(salary) AS category
FROM employees;
```

### Example 4: CASE Statement

```sql
-- Function using CASE
CREATE OR REPLACE FUNCTION get_bonus_multiplier(dept text)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
    multiplier numeric;
BEGIN
    -- CASE statement
    CASE dept
        WHEN 'Sales' THEN
            multiplier := 0.15;
        WHEN 'Engineering' THEN
            multiplier := 0.10;
        WHEN 'Management' THEN
            multiplier := 0.20;
        ELSE
            multiplier := 0.05;
    END CASE;

    RETURN multiplier;
END;
$$;

-- Function using CASE expression
CREATE OR REPLACE FUNCTION calculate_bonus(emp_id integer)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
    emp_record employees%ROWTYPE;
    bonus numeric;
    multiplier numeric;
BEGIN
    SELECT * INTO emp_record
    FROM employees
    WHERE employee_id = emp_id;

    -- CASE expression in assignment
    multiplier := CASE
        WHEN emp_record.salary > 100000 THEN 0.20
        WHEN emp_record.salary > 75000 THEN 0.15
        WHEN emp_record.salary > 50000 THEN 0.10
        ELSE 0.05
    END;

    bonus := emp_record.salary * multiplier;

    RETURN bonus;
END;
$$;

-- Test
SELECT
    first_name,
    salary,
    calculate_bonus(employee_id) AS bonus
FROM employees;
```

### Example 5: Simple LOOP with EXIT

```sql
-- Function using LOOP
CREATE OR REPLACE FUNCTION fibonacci(n integer)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    counter integer := 1;
    fib_prev integer := 0;
    fib_curr integer := 1;
    fib_next integer;
BEGIN
    IF n <= 0 THEN
        RETURN 0;
    ELSIF n = 1 THEN
        RETURN 1;
    END IF;

    LOOP
        EXIT WHEN counter >= n;

        fib_next := fib_prev + fib_curr;
        fib_prev := fib_curr;
        fib_curr := fib_next;
        counter := counter + 1;
    END LOOP;

    RETURN fib_curr;
END;
$$;

-- Test
SELECT generate_series(0, 10) AS n, fibonacci(generate_series(0, 10)) AS fib;
```

### Example 6: WHILE Loop

```sql
-- Function to calculate factorial
CREATE OR REPLACE FUNCTION factorial(n integer)
RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE
    result bigint := 1;
    counter integer := n;
BEGIN
    IF n < 0 THEN
        RAISE EXCEPTION 'Factorial not defined for negative numbers';
    END IF;

    IF n = 0 OR n = 1 THEN
        RETURN 1;
    END IF;

    WHILE counter > 1 LOOP
        result := result * counter;
        counter := counter - 1;
    END LOOP;

    RETURN result;
END;
$$;

-- Test
SELECT n, factorial(n)
FROM generate_series(0, 10) AS n;
```

### Example 7: FOR Integer Loop

```sql
-- Function using FOR loop
CREATE OR REPLACE FUNCTION sum_range(start_num integer, end_num integer)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    total integer := 0;
    i integer;
BEGIN
    FOR i IN start_num..end_num LOOP
        total := total + i;
    END LOOP;

    RETURN total;
END;
$$;

-- Test
SELECT sum_range(1, 100);  -- Sum of 1 to 100
-- Result: 5050

-- REVERSE loop example
CREATE OR REPLACE FUNCTION countdown(start_num integer)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    result text := '';
    i integer;
BEGIN
    FOR i IN REVERSE start_num..1 LOOP
        result := result || i::text;
        IF i > 1 THEN
            result := result || ', ';
        END IF;
    END LOOP;

    RETURN result;
END;
$$;

-- Test
SELECT countdown(10);
-- Result: "10, 9, 8, 7, 6, 5, 4, 3, 2, 1"
```

### Example 8: FOR Query Loop

```sql
-- Function iterating over query results
CREATE OR REPLACE FUNCTION get_department_summary()
RETURNS TABLE(
    department text,
    employee_count bigint,
    avg_salary numeric,
    total_payroll numeric
)
LANGUAGE plpgsql
AS $$
DECLARE
    dept_record RECORD;
BEGIN
    FOR dept_record IN
        SELECT DISTINCT department FROM employees
    LOOP
        RETURN QUERY
        SELECT
            dept_record.department,
            COUNT(*)::bigint,
            ROUND(AVG(salary), 2),
            ROUND(SUM(salary), 2)
        FROM employees
        WHERE department = dept_record.department;
    END LOOP;

    RETURN;
END;
$$;

-- Test
SELECT * FROM get_department_summary();
```

### Example 9: FOREACH Array Loop

```sql
-- Function processing array elements
CREATE OR REPLACE FUNCTION sum_array(numbers integer[])
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    total integer := 0;
    num integer;
BEGIN
    FOREACH num IN ARRAY numbers LOOP
        total := total + num;
    END LOOP;

    RETURN total;
END;
$$;

-- Test
SELECT sum_array(ARRAY[1, 2, 3, 4, 5]);
-- Result: 15

-- More complex array processing
CREATE OR REPLACE FUNCTION filter_positive(numbers integer[])
RETURNS integer[]
LANGUAGE plpgsql
AS $$
DECLARE
    result integer[] := ARRAY[]::integer[];
    num integer;
BEGIN
    FOREACH num IN ARRAY numbers LOOP
        IF num > 0 THEN
            result := array_append(result, num);
        END IF;
    END LOOP;

    RETURN result;
END;
$$;

-- Test
SELECT filter_positive(ARRAY[-2, -1, 0, 1, 2, 3]);
-- Result: {1, 2, 3}
```

### Example 10: RETURN NEXT and RETURN QUERY

```sql
-- Function using RETURN NEXT
CREATE OR REPLACE FUNCTION generate_squares(max_num integer)
RETURNS TABLE(number integer, square integer)
LANGUAGE plpgsql
AS $$
DECLARE
    i integer;
BEGIN
    FOR i IN 1..max_num LOOP
        number := i;
        square := i * i;
        RETURN NEXT;  -- Add current row to result
    END LOOP;

    RETURN;  -- Exit function
END;
$$;

-- Test
SELECT * FROM generate_squares(5);

-- Function using RETURN QUERY
CREATE OR REPLACE FUNCTION get_high_earners(min_salary numeric)
RETURNS TABLE(
    full_name text,
    salary numeric,
    department text
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        first_name || ' ' || last_name,
        e.salary,
        e.department
    FROM employees e
    WHERE e.salary >= min_salary
    ORDER BY e.salary DESC;
END;
$$;

-- Test
SELECT * FROM get_high_earners(70000);
```

### Example 11: RAISE - Messages and Exceptions

```sql
-- Function demonstrating RAISE
CREATE OR REPLACE FUNCTION divide_numbers(
    numerator numeric,
    denominator numeric
)
RETURNS numeric
LANGUAGE plpgsql
AS $$
BEGIN
    -- RAISE NOTICE - informational message
    RAISE NOTICE 'Dividing % by %', numerator, denominator;

    -- RAISE WARNING - warning message
    IF denominator = 0 THEN
        RAISE WARNING 'Division by zero attempted';
    END IF;

    -- RAISE EXCEPTION - stop execution
    IF denominator = 0 THEN
        RAISE EXCEPTION 'Cannot divide by zero'
            USING HINT = 'Please provide a non-zero denominator';
    END IF;

    RETURN numerator / denominator;
END;
$$;

-- Test
SELECT divide_numbers(10, 2);  -- Works, shows NOTICE
-- SELECT divide_numbers(10, 0);  -- Raises exception

-- Different severity levels
CREATE OR REPLACE FUNCTION demonstrate_raise()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE DEBUG 'Debug message (usually not shown)';
    RAISE LOG 'Log message (goes to server log)';
    RAISE INFO 'Info message';
    RAISE NOTICE 'Notice message';
    RAISE WARNING 'Warning message';
    -- RAISE EXCEPTION 'Error message';  -- Would stop execution
END;
$$;

-- Test
SELECT demonstrate_raise();
```

### Example 12: Exception Handling

```sql
-- Function with exception handling
CREATE OR REPLACE FUNCTION safe_divide(
    numerator numeric,
    denominator numeric
)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
    result numeric;
BEGIN
    BEGIN
        result := numerator / denominator;
        RETURN result;
    EXCEPTION
        WHEN division_by_zero THEN
            RAISE NOTICE 'Division by zero, returning NULL';
            RETURN NULL;
        WHEN OTHERS THEN
            RAISE WARNING 'Unexpected error: %', SQLERRM;
            RETURN NULL;
    END;
END;
$$;

-- Test
SELECT safe_divide(10, 2);   -- Returns 5
SELECT safe_divide(10, 0);   -- Returns NULL with notice

-- More comprehensive exception handling
CREATE OR REPLACE FUNCTION insert_employee(
    p_first_name text,
    p_last_name text,
    p_salary numeric,
    p_department text
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    new_id integer;
    error_message text;
BEGIN
    INSERT INTO employees (first_name, last_name, salary, department)
    VALUES (p_first_name, p_last_name, p_salary, p_department)
    RETURNING employee_id INTO new_id;

    RETURN new_id;
EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'Duplicate employee detected';
    WHEN not_null_violation THEN
        RAISE EXCEPTION 'Required field is missing';
    WHEN check_violation THEN
        RAISE EXCEPTION 'Data validation failed';
    WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
        RAISE EXCEPTION 'Unexpected error: %', error_message;
END;
$$;
```

### Example 13: GET DIAGNOSTICS

```sql
-- Function using GET DIAGNOSTICS
CREATE OR REPLACE FUNCTION update_salaries_by_department(
    dept text,
    increase_percent numeric
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    rows_affected integer;
BEGIN
    UPDATE employees
    SET salary = salary * (1 + increase_percent / 100)
    WHERE department = dept;

    -- Get number of affected rows
    GET DIAGNOSTICS rows_affected = ROW_COUNT;

    RAISE NOTICE 'Updated % employees in % department',
        rows_affected, dept;

    RETURN rows_affected;
END;
$$;

-- Test
SELECT update_salaries_by_department('Engineering', 5);

-- GET DIAGNOSTICS in exception handler
CREATE OR REPLACE FUNCTION diagnose_error()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    error_msg text;
    error_detail text;
    error_hint text;
BEGIN
    -- Deliberately cause an error
    PERFORM 1 / 0;
EXCEPTION
    WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS
            error_msg = MESSAGE_TEXT,
            error_detail = PG_EXCEPTION_DETAIL,
            error_hint = PG_EXCEPTION_HINT;

        RAISE NOTICE 'Error: %', error_msg;
        RAISE NOTICE 'Detail: %', error_detail;
        RAISE NOTICE 'Hint: %', error_hint;
END;
$$;
```

### Example 14: PERFORM (Execute Without Result)

```sql
-- Create audit log table
CREATE TABLE IF NOT EXISTS audit_log (
    log_id serial PRIMARY KEY,
    action text NOT NULL,
    performed_at timestamp DEFAULT now()
);

-- Function using PERFORM
CREATE OR REPLACE FUNCTION process_order(order_id integer)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- PERFORM executes query but discards result
    -- Used when you need to call a function but don't need the return value
    PERFORM pg_sleep(0.1);  -- Simulate processing

    -- Log the action (don't need to capture result)
    PERFORM insert_audit_log('Order ' || order_id || ' processed');

    RAISE NOTICE 'Order % processed', order_id;
END;
$$;

-- Helper function
CREATE OR REPLACE FUNCTION insert_audit_log(message text)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    new_id integer;
BEGIN
    INSERT INTO audit_log (action)
    VALUES (message)
    RETURNING log_id INTO new_id;

    RETURN new_id;
END;
$$;

-- Test
SELECT process_order(123);
SELECT * FROM audit_log;
```

### Example 15: EXECUTE - Dynamic SQL

```sql
-- Function with dynamic SQL
CREATE OR REPLACE FUNCTION count_table_rows(table_name text)
RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE
    row_count bigint;
BEGIN
    -- Use EXECUTE for dynamic SQL
    EXECUTE format('SELECT COUNT(*) FROM %I', table_name)
    INTO row_count;

    RETURN row_count;
END;
$$;

-- Test
SELECT count_table_rows('employees');

-- More complex dynamic SQL with parameters
CREATE OR REPLACE FUNCTION dynamic_filter(
    p_table_name text,
    p_column_name text,
    p_value text
)
RETURNS TABLE(result json)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY EXECUTE format(
        'SELECT row_to_json(t) FROM %I t WHERE %I = $1',
        p_table_name,
        p_column_name
    ) USING p_value;
END;
$$;

-- Test
SELECT * FROM dynamic_filter('employees', 'department', 'Engineering');
```

### Example 16: format() for Safe Dynamic SQL

```sql
-- Unsafe dynamic SQL (vulnerable to SQL injection)
CREATE OR REPLACE FUNCTION unsafe_search(table_name text, search_term text)
RETURNS SETOF record
LANGUAGE plpgsql
AS $$
BEGIN
    -- DON'T DO THIS!
    -- EXECUTE 'SELECT * FROM ' || table_name || ' WHERE name = ' || search_term;
    RETURN;
END;
$$;

-- Safe dynamic SQL with format()
CREATE OR REPLACE FUNCTION safe_search(
    p_table_name text,
    p_column_name text,
    p_search_value text
)
RETURNS TABLE(result json)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY EXECUTE format(
        'SELECT row_to_json(t) FROM %I t WHERE %I = %L',
        p_table_name,    -- %I for identifiers (quoted)
        p_column_name,   -- %I for identifiers
        p_search_value   -- %L for literals (escaped)
    );
END;
$$;

-- format() specifiers:
-- %I - identifier (table/column names) - adds quotes
-- %L - literal value - properly escapes
-- %s - unquoted string
```

## Common Mistakes

### 1. Forgetting FOUND Check After SELECT INTO

```sql
-- WRONG: No check if row was found
CREATE OR REPLACE FUNCTION bad_lookup(emp_id integer)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    emp_name text;
BEGIN
    SELECT first_name INTO emp_name
    FROM employees
    WHERE employee_id = emp_id;

    RETURN emp_name;  -- Could be NULL even if employee doesn't exist
END;
$$;

-- CORRECT: Check FOUND variable
CREATE OR REPLACE FUNCTION good_lookup(emp_id integer)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    emp_name text;
BEGIN
    SELECT first_name INTO emp_name
    FROM employees
    WHERE employee_id = emp_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Employee % not found', emp_id;
    END IF;

    RETURN emp_name;
END;
$$;
```

### 2. SQL Injection in Dynamic SQL

```sql
-- WRONG: Concatenating user input
CREATE OR REPLACE FUNCTION vulnerable(col_name text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    EXECUTE 'SELECT * FROM employees WHERE ' || col_name || ' = 1';
END;
$$;

-- CORRECT: Use format() with %I and %L
CREATE OR REPLACE FUNCTION secure(col_name text, col_value text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    EXECUTE format('SELECT * FROM employees WHERE %I = %L',
        col_name, col_value);
END;
$$;
```

### 3. Not Returning in All Code Paths

```sql
-- WRONG: Missing RETURN in some paths
CREATE OR REPLACE FUNCTION bad_return(value integer)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
    IF value > 0 THEN
        RETURN 'Positive';
    ELSIF value < 0 THEN
        RETURN 'Negative';
    END IF;
    -- Missing RETURN for value = 0
END;
$$;

-- CORRECT: All paths return
CREATE OR REPLACE FUNCTION good_return(value integer)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
    IF value > 0 THEN
        RETURN 'Positive';
    ELSIF value < 0 THEN
        RETURN 'Negative';
    ELSE
        RETURN 'Zero';
    END IF;
END;
$$;
```

### 4. Confusing := (Assignment) with = (Comparison)

```sql
-- WRONG: Using = for assignment
CREATE OR REPLACE FUNCTION wrong_assignment()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    counter integer;
BEGIN
    counter = 10;  -- This is a comparison, not assignment!
    RETURN counter;  -- Returns NULL
END;
$$;

-- CORRECT: Use := for assignment
CREATE OR REPLACE FUNCTION correct_assignment()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    counter integer;
BEGIN
    counter := 10;  -- Correct assignment
    RETURN counter;  -- Returns 10
END;
$$;
```

## Best Practices

### 1. Use Meaningful Variable Names

```sql
-- Bad: Cryptic names
CREATE OR REPLACE FUNCTION calc(x numeric, y numeric)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
    z numeric;
BEGIN
    z := x * y;
    RETURN z;
END;
$$;

-- Good: Descriptive names
CREATE OR REPLACE FUNCTION calculate_total_price(
    unit_price numeric,
    quantity numeric
)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
    total_price numeric;
BEGIN
    total_price := unit_price * quantity;
    RETURN total_price;
END;
$$;
```

### 2. Handle Exceptions Appropriately

```sql
-- Good: Specific exception handling with logging
CREATE OR REPLACE FUNCTION safe_update_employee(
    emp_id integer,
    new_salary numeric
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE employees
    SET salary = new_salary
    WHERE employee_id = emp_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Employee % not found', emp_id;
    END IF;
EXCEPTION
    WHEN check_violation THEN
        RAISE EXCEPTION 'Invalid salary amount: %', new_salary;
    WHEN OTHERS THEN
        RAISE LOG 'Unexpected error updating employee %: %',
            emp_id, SQLERRM;
        RAISE;
END;
$$;
```

### 3. Use RETURNS TABLE Over OUT Parameters

```sql
-- Less preferred: Multiple OUT parameters
CREATE OR REPLACE FUNCTION get_stats_out(
    OUT total_count bigint,
    OUT avg_value numeric,
    OUT max_value numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
    SELECT COUNT(*), AVG(salary), MAX(salary)
    INTO total_count, avg_value, max_value
    FROM employees;
END;
$$;

-- Preferred: RETURNS TABLE
CREATE OR REPLACE FUNCTION get_stats_table()
RETURNS TABLE(
    total_count bigint,
    avg_value numeric,
    max_value numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT COUNT(*), AVG(salary), MAX(salary)
    FROM employees;
END;
$$;
```

### 4. Comment Complex Logic

```sql
CREATE OR REPLACE FUNCTION complex_calculation(input_value numeric)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
    result numeric;
    adjustment numeric;
BEGIN
    -- Calculate base adjustment using logarithmic scale
    -- Formula based on business requirement BR-2024-15
    adjustment := ln(input_value + 1) * 10;

    -- Apply progressive multiplier for values over threshold
    IF input_value > 1000 THEN
        adjustment := adjustment * 1.5;
    END IF;

    result := input_value + adjustment;

    RETURN result;
END;
$$;
```

### 5. Use STRICT When Appropriate

```sql
-- Handle NULL inputs explicitly
CREATE OR REPLACE FUNCTION multiply(a numeric, b numeric)
RETURNS numeric
LANGUAGE plpgsql
STRICT  -- Returns NULL if any input is NULL
AS $$
BEGIN
    RETURN a * b;
END;
$$;
```

## Practice Exercises

### Exercise 1: Employee Promotion System

Create a function that promotes employees based on performance.

**Requirements:**
1. Function `promote_employee(emp_id integer, performance_score numeric)`
2. If score >= 90: Increase salary by 15%, set department to 'Management'
3. If score >= 75: Increase salary by 10%
4. If score >= 60: Increase salary by 5%
5. If score < 60: No promotion, raise notice
6. Return the new salary
7. Use proper exception handling
8. Log promotion to audit_log table

**Test Cases:**
```sql
SELECT promote_employee(1, 95);  -- Should promote to Management
SELECT promote_employee(2, 80);  -- Should get 10% raise
SELECT promote_employee(3, 50);  -- Should get notice
```

### Exercise 2: Fibonacci Generator with Memoization

Create a function that generates Fibonacci numbers efficiently.

**Requirements:**
1. Function `generate_fibonacci(n integer)` returning TABLE(position integer, value bigint)
2. Use RETURN NEXT to build result set
3. Add RAISE NOTICE for progress every 10 numbers
4. Handle invalid input (n < 0) with exception
5. For n > 50, raise warning about large output

**Test Cases:**
```sql
SELECT * FROM generate_fibonacci(10);
SELECT * FROM generate_fibonacci(20);
SELECT * FROM generate_fibonacci(-5);  -- Should raise exception
```

### Exercise 3: Dynamic Report Generator

Create a function that generates reports from any table.

**Requirements:**
1. Function `generate_report(table_name text, filter_column text, filter_value text)`
2. Returns TABLE(row_data json)
3. Use dynamic SQL with format() for safety
4. Validate that table exists (query pg_tables)
5. Validate that column exists
6. Handle exceptions appropriately
7. Use EXECUTE with USING clause for parameterization

**Test Cases:**
```sql
SELECT * FROM generate_report('employees', 'department', 'Engineering');
SELECT * FROM generate_report('invalid_table', 'col', 'val');  -- Should handle gracefully
```

## Summary

PL/pgSQL provides powerful procedural programming capabilities for PostgreSQL:

- Use DECLARE for variables, %TYPE and %ROWTYPE for schema-linked types
- Control flow with IF, CASE, LOOP, WHILE, FOR
- RETURN NEXT/QUERY for set-returning functions
- RAISE for messages and exceptions
- Exception handling with BEGIN/EXCEPTION blocks
- GET DIAGNOSTICS for error information
- PERFORM for executing without capturing results
- EXECUTE with format() for safe dynamic SQL

For simpler logic, prefer [SQL Functions](01-sql-functions.md). For transaction control, see [Stored Procedures](03-stored-procedures.md). For automatic execution, see [Triggers](04-triggers.md).
