# Filtering Operators in PostgreSQL

## Table of Contents
- [Theory](#theory)
- [Syntax](#syntax)
- [Examples](#examples)
- [Common Mistakes](#common-mistakes)
- [Best Practices](#best-practices)
- [Practice Exercises](#practice-exercises)

## Theory

### What are Filtering Operators?

Filtering operators are special SQL operators used in WHERE clauses to create complex conditions for selecting, updating, or deleting data. PostgreSQL provides a rich set of operators beyond basic comparison, including pattern matching, range checking, and set membership testing.

### Categories of Filtering Operators

1. **Set Membership**: IN, NOT IN, ANY, ALL
2. **Range Testing**: BETWEEN, NOT BETWEEN
3. **Pattern Matching**: LIKE, ILIKE, SIMILAR TO
4. **Regular Expressions**: ~, ~*, !~, !~*
5. **NULL Testing**: IS NULL, IS NOT NULL, IS DISTINCT FROM
6. **Existence Testing**: EXISTS, NOT EXISTS
7. **Array Operations**: ANY, ALL with arrays

### Why These Operators Matter

- More expressive than simple comparisons
- Better performance for specific use cases
- Clearer, more maintainable SQL code
- Essential for complex business logic
- Pattern matching for text search
- Handle NULL values correctly

### Performance Considerations

- IN with small lists: fast
- IN with subqueries: can be slow, consider EXISTS
- LIKE with leading wildcard (%abc): cannot use index
- LIKE with trailing wildcard (abc%): can use index
- Regular expressions: powerful but slower than LIKE
- EXISTS vs IN: EXISTS often faster for subqueries

## Syntax

### IN and NOT IN

```sql
-- Basic IN
SELECT * FROM table_name WHERE column IN (value1, value2, value3);

-- IN with subquery
SELECT * FROM table_name
WHERE column IN (SELECT column FROM other_table);

-- NOT IN
SELECT * FROM table_name WHERE column NOT IN (value1, value2);
```

### BETWEEN

```sql
-- BETWEEN (inclusive)
SELECT * FROM table_name
WHERE column BETWEEN lower_value AND upper_value;

-- NOT BETWEEN
SELECT * FROM table_name
WHERE column NOT BETWEEN lower_value AND upper_value;

-- BETWEEN with dates
SELECT * FROM table_name
WHERE date_column BETWEEN '2024-01-01' AND '2024-12-31';
```

### LIKE and ILIKE

```sql
-- LIKE (case-sensitive)
SELECT * FROM table_name WHERE column LIKE 'pattern';

-- ILIKE (case-insensitive, PostgreSQL-specific)
SELECT * FROM table_name WHERE column ILIKE 'pattern';

-- Wildcards:
-- % matches any sequence of characters
-- _ matches any single character
SELECT * FROM table_name WHERE column LIKE 'A%';  -- Starts with A
SELECT * FROM table_name WHERE column LIKE '%Z';  -- Ends with Z
SELECT * FROM table_name WHERE column LIKE '%abc%';  -- Contains abc
SELECT * FROM table_name WHERE column LIKE 'A_C';  -- A, any char, C
```

### SIMILAR TO (SQL Regular Expressions)

```sql
-- SIMILAR TO uses SQL standard regex syntax
SELECT * FROM table_name
WHERE column SIMILAR TO 'pattern';

-- Patterns:
-- % matches any string (like LIKE)
-- _ matches any single character
-- | for alternation (OR)
-- * for zero or more
-- + for one or more
-- ? for zero or one
-- [abc] character class
-- [a-z] character range
```

### POSIX Regular Expressions

```sql
-- ~ case-sensitive match
SELECT * FROM table_name WHERE column ~ 'regex_pattern';

-- ~* case-insensitive match
SELECT * FROM table_name WHERE column ~* 'regex_pattern';

-- !~ case-sensitive no match
SELECT * FROM table_name WHERE column !~ 'regex_pattern';

-- !~* case-insensitive no match
SELECT * FROM table_name WHERE column !~* 'regex_pattern';
```

### IS NULL / IS NOT NULL

```sql
-- IS NULL
SELECT * FROM table_name WHERE column IS NULL;

-- IS NOT NULL
SELECT * FROM table_name WHERE column IS NOT NULL;

-- IS DISTINCT FROM (NULL-safe comparison)
SELECT * FROM table_name WHERE column1 IS DISTINCT FROM column2;

-- IS NOT DISTINCT FROM (NULL-safe equality)
SELECT * FROM table_name WHERE column1 IS NOT DISTINCT FROM column2;
```

### EXISTS

```sql
-- EXISTS
SELECT * FROM table1
WHERE EXISTS (
    SELECT 1 FROM table2 WHERE table2.id = table1.id
);

-- NOT EXISTS
SELECT * FROM table1
WHERE NOT EXISTS (
    SELECT 1 FROM table2 WHERE table2.id = table1.id
);
```

### ANY and ALL

```sql
-- ANY with array
SELECT * FROM table_name WHERE column = ANY(ARRAY[1, 2, 3]);

-- ANY with subquery
SELECT * FROM table_name
WHERE column > ANY(SELECT column FROM other_table);

-- ALL with array
SELECT * FROM table_name WHERE column != ALL(ARRAY[1, 2, 3]);

-- ALL with subquery
SELECT * FROM table_name
WHERE column > ALL(SELECT column FROM other_table);
```

## Examples

### Example 1: IN and NOT IN

```sql
-- Create sample table
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    category VARCHAR(50),
    price NUMERIC(10, 2),
    supplier_id INTEGER,
    is_active BOOLEAN DEFAULT true
);

INSERT INTO products (name, category, price, supplier_id, is_active)
VALUES
    ('Laptop', 'Electronics', 999.99, 1, true),
    ('Mouse', 'Electronics', 29.99, 1, true),
    ('Desk', 'Furniture', 299.99, 2, true),
    ('Chair', 'Furniture', 199.99, 2, true),
    ('Monitor', 'Electronics', 349.99, 3, true),
    ('Lamp', 'Furniture', 49.99, 2, false),
    ('Keyboard', 'Electronics', 79.99, 1, true),
    ('Notebook', 'Stationery', 5.99, 4, true);

-- IN with values
SELECT name, category, price
FROM products
WHERE category IN ('Electronics', 'Furniture');

-- NOT IN with values
SELECT name, category
FROM products
WHERE category NOT IN ('Stationery');

-- IN with subquery
CREATE TABLE premium_suppliers (
    supplier_id INTEGER PRIMARY KEY,
    name VARCHAR(100)
);

INSERT INTO premium_suppliers (supplier_id, name)
VALUES (1, 'Tech Corp'), (3, 'Display Inc');

SELECT p.name, p.category, p.price
FROM products p
WHERE p.supplier_id IN (
    SELECT supplier_id FROM premium_suppliers
);

-- NOT IN with NULL caveat
CREATE TABLE discontinued_ids (
    product_id INTEGER
);

INSERT INTO discontinued_ids VALUES (1), (2), (NULL);

-- DANGER: NOT IN with NULL returns no rows!
SELECT name FROM products
WHERE product_id NOT IN (SELECT product_id FROM discontinued_ids);
-- Returns 0 rows because NULL is present

-- FIX: Filter out NULLs
SELECT name FROM products
WHERE product_id NOT IN (
    SELECT product_id FROM discontinued_ids WHERE product_id IS NOT NULL
);

-- ALTERNATIVE: Use NOT EXISTS
SELECT name FROM products p
WHERE NOT EXISTS (
    SELECT 1 FROM discontinued_ids d
    WHERE d.product_id = p.product_id
);
```

### Example 2: BETWEEN

```sql
-- Create orders table
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    order_date DATE,
    total_amount NUMERIC(10, 2),
    status VARCHAR(20)
);

INSERT INTO orders (customer_id, order_date, total_amount, status)
VALUES
    (1, '2024-01-15', 150.00, 'completed'),
    (2, '2024-02-20', 75.00, 'completed'),
    (1, '2024-03-10', 200.00, 'pending'),
    (3, '2024-04-05', 450.00, 'shipped'),
    (2, '2024-05-12', 95.00, 'completed'),
    (1, '2024-06-01', 300.00, 'completed'),
    (3, '2024-07-15', 180.00, 'pending');

-- BETWEEN with numbers
SELECT order_id, total_amount, status
FROM orders
WHERE total_amount BETWEEN 100 AND 300;

-- BETWEEN with dates
SELECT order_id, order_date, total_amount
FROM orders
WHERE order_date BETWEEN '2024-03-01' AND '2024-06-30';

-- NOT BETWEEN
SELECT order_id, total_amount
FROM orders
WHERE total_amount NOT BETWEEN 100 AND 200;

-- BETWEEN with timestamps
CREATE TABLE events (
    event_id SERIAL PRIMARY KEY,
    event_name VARCHAR(100),
    event_time TIMESTAMP
);

INSERT INTO events (event_name, event_time)
VALUES
    ('Login', '2024-01-15 08:30:00'),
    ('Purchase', '2024-01-15 14:20:00'),
    ('Logout', '2024-01-15 17:45:00');

SELECT event_name, event_time
FROM events
WHERE event_time BETWEEN '2024-01-15 09:00:00' AND '2024-01-15 18:00:00';

-- BETWEEN is inclusive on both ends
SELECT order_id, total_amount
FROM orders
WHERE total_amount BETWEEN 150 AND 150; -- Includes exactly 150

-- BETWEEN with ORDER BY
SELECT order_id, order_date, total_amount
FROM orders
WHERE total_amount BETWEEN 100 AND 300
ORDER BY total_amount DESC;
```

### Example 3: LIKE and ILIKE

```sql
-- Create employees table
CREATE TABLE employees (
    employee_id SERIAL PRIMARY KEY,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email VARCHAR(100),
    phone VARCHAR(20),
    job_title VARCHAR(100)
);

INSERT INTO employees (first_name, last_name, email, phone, job_title)
VALUES
    ('John', 'Doe', 'john.doe@company.com', '555-0001', 'Senior Developer'),
    ('Jane', 'Smith', 'jane.smith@company.com', '555-0002', 'Project Manager'),
    ('Bob', 'Johnson', 'bob.j@company.com', '555-0003', 'Developer'),
    ('Alice', 'Williams', 'alice.w@company.com', '555-0004', 'Senior Designer'),
    ('Charlie', 'Brown', 'charlie.brown@company.com', '555-0005', 'Developer'),
    ('Diana', 'Jones', 'diana.jones@company.com', '555-0006', 'QA Engineer');

-- LIKE: starts with
SELECT first_name, last_name
FROM employees
WHERE first_name LIKE 'J%';

-- LIKE: ends with
SELECT first_name, last_name, email
FROM employees
WHERE email LIKE '%company.com';

-- LIKE: contains
SELECT first_name, last_name, job_title
FROM employees
WHERE job_title LIKE '%Developer%';

-- LIKE: single character wildcard
SELECT first_name, last_name
FROM employees
WHERE first_name LIKE 'J__n'; -- John, Jean, etc.

-- ILIKE: case-insensitive
SELECT first_name, last_name, job_title
FROM employees
WHERE job_title ILIKE '%developer%'; -- Matches Developer, developer, DEVELOPER

-- LIKE vs ILIKE
SELECT first_name, last_name
FROM employees
WHERE first_name LIKE 'john'; -- No match (case-sensitive)

SELECT first_name, last_name
FROM employees
WHERE first_name ILIKE 'john'; -- Matches John

-- NOT LIKE
SELECT first_name, last_name, email
FROM employees
WHERE email NOT LIKE '%.%@%'; -- Emails without dot before @

-- Escape special characters
CREATE TABLE file_paths (
    path_id SERIAL PRIMARY KEY,
    file_path VARCHAR(255)
);

INSERT INTO file_paths (file_path)
VALUES
    ('/home/user/file_1.txt'),
    ('/home/user/file_2.txt'),
    ('/home/user/file%special.txt');

-- Find paths with underscore (escape with backslash)
SELECT file_path
FROM file_paths
WHERE file_path LIKE '%\_%' ESCAPE '\';

-- Find paths with percent sign
SELECT file_path
FROM file_paths
WHERE file_path LIKE '%\%%' ESCAPE '\';
```

### Example 4: SIMILAR TO

```sql
-- SIMILAR TO with alternation
SELECT first_name, last_name, job_title
FROM employees
WHERE job_title SIMILAR TO '%(Developer|Designer|Manager)%';

-- SIMILAR TO with character classes
SELECT first_name, last_name, phone
FROM employees
WHERE phone SIMILAR TO '555-[0-9][0-9][0-9][0-9]';

-- SIMILAR TO with quantifiers
CREATE TABLE product_codes (
    code_id SERIAL PRIMARY KEY,
    product_code VARCHAR(50)
);

INSERT INTO product_codes (product_code)
VALUES
    ('ABC-123'),
    ('XYZ-456'),
    ('AB-12'),
    ('ABCD-1234'),
    ('A1B2C3');

-- Match codes like ABC-123 (3 letters, hyphen, 3 digits)
SELECT product_code
FROM product_codes
WHERE product_code SIMILAR TO '[A-Z]{3}-[0-9]{3}';

-- Match codes with letters and numbers (no hyphen)
SELECT product_code
FROM product_codes
WHERE product_code SIMILAR TO '[A-Z0-9]+';

-- SIMILAR TO with optional parts
SELECT product_code
FROM product_codes
WHERE product_code SIMILAR TO '[A-Z]{2,4}-?[0-9]{2,4}';
```

### Example 5: POSIX Regular Expressions

```sql
-- Basic regex matching with ~
SELECT first_name, last_name, email
FROM employees
WHERE email ~ '^[a-z]+\.[a-z]+@company\.com$';

-- Case-insensitive regex with ~*
SELECT first_name, last_name
FROM employees
WHERE first_name ~* '^j'; -- Starts with J or j

-- Negated regex with !~
SELECT first_name, last_name, job_title
FROM employees
WHERE job_title !~ 'Developer'; -- Does not contain Developer (case-sensitive)

-- Negated case-insensitive with !~*
SELECT first_name, last_name, job_title
FROM employees
WHERE job_title !~* 'developer'; -- Does not contain developer (any case)

-- Advanced regex patterns
CREATE TABLE user_input (
    input_id SERIAL PRIMARY KEY,
    data VARCHAR(255)
);

INSERT INTO user_input (data)
VALUES
    ('user123@example.com'),
    ('invalid.email'),
    ('test@domain.co.uk'),
    ('123-456-7890'),
    ('(555) 123-4567');

-- Email validation regex
SELECT data
FROM user_input
WHERE data ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';

-- Phone number validation (US format)
SELECT data
FROM user_input
WHERE data ~ '^\d{3}-\d{3}-\d{4}$' OR data ~ '^\(\d{3}\) \d{3}-\d{4}$';

-- Extract pattern with regex
SELECT
    first_name,
    last_name,
    email,
    SUBSTRING(email FROM '^(.+)@') AS username
FROM employees
WHERE email ~ '@company\.com$';

-- Using regex with POSIX character classes
SELECT first_name, last_name
FROM employees
WHERE first_name ~ '^[[:upper:]][[:lower:]]+$'; -- Starts with uppercase, rest lowercase
```

### Example 6: IS NULL and IS DISTINCT FROM

```sql
-- Create table with nullable columns
CREATE TABLE contacts (
    contact_id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    notes TEXT
);

INSERT INTO contacts (name, email, phone, notes)
VALUES
    ('Alice Johnson', 'alice@example.com', '555-0001', 'VIP customer'),
    ('Bob Smith', 'bob@example.com', NULL, NULL),
    ('Carol White', NULL, '555-0003', 'Email pending'),
    ('David Brown', NULL, NULL, 'New contact'),
    ('Eve Davis', 'eve@example.com', '555-0005', NULL);

-- IS NULL
SELECT name, email, phone
FROM contacts
WHERE email IS NULL;

SELECT name, phone, notes
FROM contacts
WHERE notes IS NULL;

-- IS NOT NULL
SELECT name, email, phone
FROM contacts
WHERE phone IS NOT NULL;

-- Multiple NULL checks
SELECT name, email, phone
FROM contacts
WHERE email IS NULL AND phone IS NULL;

-- NULL in expressions
SELECT name, email, phone,
    CASE
        WHEN email IS NULL THEN 'No email'
        ELSE email
    END AS email_display
FROM contacts;

-- IS DISTINCT FROM (NULL-safe comparison)
SELECT
    c1.name AS name1,
    c2.name AS name2,
    c1.email AS email1,
    c2.email AS email2
FROM contacts c1
CROSS JOIN contacts c2
WHERE c1.contact_id < c2.contact_id
  AND c1.email IS DISTINCT FROM c2.email;

-- IS NOT DISTINCT FROM (NULL-safe equality)
SELECT name, email
FROM contacts
WHERE email IS NOT DISTINCT FROM NULL; -- Same as IS NULL

-- Difference between = and IS NOT DISTINCT FROM
SELECT name FROM contacts WHERE email = NULL; -- Returns 0 rows (wrong)
SELECT name FROM contacts WHERE email IS NULL; -- Correct
SELECT name FROM contacts WHERE email IS NOT DISTINCT FROM NULL; -- Also correct
```

### Example 7: EXISTS and NOT EXISTS

```sql
-- Create related tables
CREATE TABLE customers (
    customer_id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    city VARCHAR(50)
);

CREATE TABLE customer_orders (
    order_id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(customer_id),
    order_date DATE,
    total NUMERIC(10, 2)
);

INSERT INTO customers (name, email, city)
VALUES
    ('Alice Johnson', 'alice@example.com', 'New York'),
    ('Bob Smith', 'bob@example.com', 'Los Angeles'),
    ('Carol White', 'carol@example.com', 'Chicago'),
    ('David Brown', 'david@example.com', 'Houston');

INSERT INTO customer_orders (customer_id, order_date, total)
VALUES
    (1, '2024-01-15', 150.00),
    (1, '2024-02-20', 200.00),
    (2, '2024-03-10', 75.00),
    (3, '2024-04-05', 300.00);

-- EXISTS: Find customers who have orders
SELECT c.customer_id, c.name, c.email
FROM customers c
WHERE EXISTS (
    SELECT 1 FROM customer_orders o
    WHERE o.customer_id = c.customer_id
);

-- NOT EXISTS: Find customers without orders
SELECT c.customer_id, c.name, c.email
FROM customers c
WHERE NOT EXISTS (
    SELECT 1 FROM customer_orders o
    WHERE o.customer_id = c.customer_id
);

-- EXISTS with conditions
SELECT c.customer_id, c.name
FROM customers c
WHERE EXISTS (
    SELECT 1 FROM customer_orders o
    WHERE o.customer_id = c.customer_id
      AND o.total > 100
);

-- EXISTS vs IN performance
-- EXISTS is often faster for large datasets because it stops at first match

-- EXISTS (stops when first match found)
SELECT c.name
FROM customers c
WHERE EXISTS (
    SELECT 1 FROM customer_orders o
    WHERE o.customer_id = c.customer_id
);

-- IN (evaluates entire subquery)
SELECT c.name
FROM customers c
WHERE c.customer_id IN (
    SELECT customer_id FROM customer_orders
);

-- Complex EXISTS with multiple conditions
SELECT c.customer_id, c.name, c.city
FROM customers c
WHERE EXISTS (
    SELECT 1 FROM customer_orders o
    WHERE o.customer_id = c.customer_id
      AND o.order_date >= '2024-02-01'
      AND o.total > 150
);
```

### Example 8: ANY and ALL with Arrays

```sql
-- ANY with array
SELECT name, category, price
FROM products
WHERE category = ANY(ARRAY['Electronics', 'Furniture']);

-- Equivalent to IN
SELECT name, category, price
FROM products
WHERE category IN ('Electronics', 'Furniture');

-- ANY with comparison
CREATE TABLE test_scores (
    student_id SERIAL PRIMARY KEY,
    student_name VARCHAR(100),
    scores INTEGER[]
);

INSERT INTO test_scores (student_name, scores)
VALUES
    ('Alice', ARRAY[85, 90, 78, 92]),
    ('Bob', ARRAY[70, 75, 68, 72]),
    ('Carol', ARRAY[95, 98, 94, 96]);

-- Students with ANY score > 90
SELECT student_name, scores
FROM test_scores
WHERE 90 < ANY(scores);

-- Students with ALL scores > 80
SELECT student_name, scores
FROM test_scores
WHERE 80 < ALL(scores);

-- ALL: all values must satisfy condition
SELECT name, price
FROM products
WHERE price > ALL(ARRAY[100, 200, 300]); -- price > 300

-- ANY vs ALL
SELECT product_id, name, price
FROM products
WHERE price > ANY(ARRAY[50, 100, 150]); -- price > 50

SELECT product_id, name, price
FROM products
WHERE price > ALL(ARRAY[50, 100, 150]); -- price > 150
```

### Example 9: ANY and ALL with Subqueries

```sql
-- ANY with subquery
SELECT p.name, p.price
FROM products p
WHERE p.price > ANY(
    SELECT price FROM products WHERE category = 'Electronics'
);

-- Equivalent to using MAX
SELECT p.name, p.price
FROM products p
WHERE p.price > (
    SELECT MIN(price) FROM products WHERE category = 'Electronics'
);

-- ALL with subquery
SELECT p.name, p.price
FROM products p
WHERE p.price > ALL(
    SELECT price FROM products WHERE category = 'Stationery'
);

-- Equivalent to using MAX
SELECT p.name, p.price
FROM products p
WHERE p.price > (
    SELECT MAX(price) FROM products WHERE category = 'Stationery'
);

-- Practical example: Find customers who spent more than ANY New York customer
SELECT c.customer_id, c.name, SUM(o.total) as total_spent
FROM customers c
JOIN customer_orders o ON c.customer_id = o.customer_id
GROUP BY c.customer_id, c.name
HAVING SUM(o.total) > ANY(
    SELECT SUM(o2.total)
    FROM customers c2
    JOIN customer_orders o2 ON c2.customer_id = o2.customer_id
    WHERE c2.city = 'New York'
    GROUP BY c2.customer_id
);
```

### Example 10: Combining Multiple Filtering Operators

```sql
-- Complex query combining multiple operators
SELECT
    p.product_id,
    p.name,
    p.category,
    p.price
FROM products p
WHERE p.category IN ('Electronics', 'Furniture')
  AND p.price BETWEEN 50 AND 500
  AND p.name ILIKE '%a%'
  AND p.is_active = true
  AND EXISTS (
      SELECT 1 FROM customer_orders co
      WHERE co.customer_id = ANY(
          SELECT customer_id FROM customers WHERE city = 'New York'
      )
  );

-- Multiple pattern matching
SELECT employee_id, first_name, last_name, email, job_title
FROM employees
WHERE (job_title LIKE '%Senior%' OR job_title LIKE '%Manager%')
  AND email ~ '^[a-z]+\.[a-z]+@'
  AND phone IS NOT NULL
  AND first_name !~* '^[aeiou]'; -- Not starting with vowel

-- Range and pattern combination
SELECT order_id, customer_id, order_date, total_amount
FROM orders
WHERE order_date BETWEEN '2024-01-01' AND '2024-12-31'
  AND total_amount NOT BETWEEN 50 AND 100
  AND status = ANY(ARRAY['completed', 'shipped'])
  AND customer_id IN (
      SELECT customer_id FROM customers WHERE city LIKE 'New%'
  );
```

## Common Mistakes

### Mistake 1: NOT IN with NULL Values

```sql
-- BAD: Returns no rows if subquery contains NULL
SELECT * FROM products
WHERE product_id NOT IN (SELECT product_id FROM discontinued_ids);
-- If discontinued_ids has a NULL, this returns 0 rows!

-- GOOD: Filter out NULLs
SELECT * FROM products
WHERE product_id NOT IN (
    SELECT product_id FROM discontinued_ids WHERE product_id IS NOT NULL
);

-- BETTER: Use NOT EXISTS
SELECT * FROM products p
WHERE NOT EXISTS (
    SELECT 1 FROM discontinued_ids d WHERE d.product_id = p.product_id
);
```

### Mistake 2: Using = NULL Instead of IS NULL

```sql
-- BAD: Always returns no rows
SELECT * FROM contacts WHERE email = NULL;

-- GOOD: Use IS NULL
SELECT * FROM contacts WHERE email IS NULL;
```

### Mistake 3: Inefficient LIKE Patterns

```sql
-- BAD: Leading wildcard prevents index use
SELECT * FROM employees WHERE last_name LIKE '%son';

-- GOOD: Trailing wildcard can use index
SELECT * FROM employees WHERE last_name LIKE 'John%';

-- ALTERNATIVE: Use full-text search for complex patterns
-- CREATE INDEX idx_name_gin ON employees USING gin(to_tsvector('english', last_name));
```

### Mistake 4: Wrong BETWEEN Boundary

```sql
-- BAD: Excludes the end boundary for dates
SELECT * FROM orders
WHERE order_date >= '2024-01-01' AND order_date < '2024-01-31';
-- Misses 2024-01-31

-- GOOD: Use BETWEEN (inclusive)
SELECT * FROM orders
WHERE order_date BETWEEN '2024-01-01' AND '2024-01-31';
```

### Mistake 5: Case Sensitivity with LIKE

```sql
-- BAD: Case-sensitive, might miss matches
SELECT * FROM employees WHERE first_name LIKE 'john';
-- Won't match 'John'

-- GOOD: Use ILIKE for case-insensitive
SELECT * FROM employees WHERE first_name ILIKE 'john';
```

## Best Practices

### 1. Use EXISTS Instead of IN for Subqueries

```sql
-- BETTER: EXISTS (faster, stops at first match)
SELECT * FROM customers c
WHERE EXISTS (
    SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id
);

-- SLOWER: IN (evaluates entire subquery)
SELECT * FROM customers c
WHERE c.customer_id IN (SELECT customer_id FROM orders);
```

### 2. Use BETWEEN for Ranges

```sql
-- Clear and efficient
SELECT * FROM orders
WHERE total_amount BETWEEN 100 AND 500;

-- Less clear
SELECT * FROM orders
WHERE total_amount >= 100 AND total_amount <= 500;
```

### 3. Use ILIKE for Case-Insensitive Searches

```sql
-- PostgreSQL-specific, more efficient than LOWER()
SELECT * FROM employees WHERE first_name ILIKE 'john';

-- Avoid LOWER() unless necessary
-- SELECT * FROM employees WHERE LOWER(first_name) = 'john';
```

### 4. Be Careful with NOT IN and NULLs

```sql
-- Always filter NULLs with NOT IN
SELECT * FROM products
WHERE category NOT IN (
    SELECT category FROM excluded_categories WHERE category IS NOT NULL
);
```

### 5. Use Appropriate Pattern Matching

```sql
-- Simple patterns: Use LIKE/ILIKE
SELECT * FROM products WHERE name ILIKE 'laptop%';

-- Complex patterns: Use regex
SELECT * FROM products WHERE name ~ '^[A-Z]{3}-[0-9]{4}$';

-- Full-text search: Use tsvector/tsquery
-- For searching large text documents
```

### 6. Index for Pattern Matching

```sql
-- For LIKE 'prefix%' patterns
CREATE INDEX idx_name ON employees(name);

-- For full-text search
CREATE INDEX idx_name_fts ON employees USING gin(to_tsvector('english', name));

-- For regex patterns (PostgreSQL-specific)
CREATE INDEX idx_name_trgm ON employees USING gin(name gin_trgm_ops);
```

## Practice Exercises

### Exercise 1: Product Search System

```sql
-- Using the products table from examples

-- Tasks:
-- 1. Find products in Electronics or Furniture categories priced between $50-$300
-- 2. Find products with names containing 'book' (case-insensitive)
-- 3. Find active products NOT in categories: Stationery, Toys
-- 4. Find products where name matches pattern: 3 letters, hyphen, 3 digits
-- 5. Find products with supplier_id that exists in premium_suppliers table
-- 6. Find products with ANY price greater than the average Electronics price
-- 7. Find products where name starts with a vowel (use regex)
-- 8. Find products with NULL supplier_id or price > $500
```

### Exercise 2: Employee Directory Search

```sql
-- Tasks:
-- 1. Find employees with job titles containing 'Senior' or 'Manager'
-- 2. Find employees whose email does NOT match pattern: firstname.lastname@company.com
-- 3. Find employees with first names between 'A' and 'D' alphabetically
-- 4. Find employees where phone IS NOT NULL and job title is NOT 'Developer'
-- 5. Find employees whose first name starts with J and has exactly 4 letters
-- 6. Find employees without any direct reports (NOT EXISTS in manager_id)
-- 7. Find employees in departments that have ALL employees earning > $60,000
-- 8. Find employees whose email contains numbers (use regex)
```

### Exercise 3: Order Analysis

```sql
-- Tasks:
-- 1. Find orders placed in Q1 2024 (Jan-Mar) with total > $100
-- 2. Find customers who have orders with ANY status in ('pending', 'shipped')
-- 3. Find orders where customer city is DISTINCT FROM 'New York'
-- 4. Find orders placed by customers whose names start with 'A' or 'C'
-- 5. Find orders with totals NOT BETWEEN $50 AND $200
-- 6. Find customers who have ALL orders completed (no pending/shipped)
-- 7. Find orders from customers in cities matching pattern 'New%'
-- 8. Find orders where total > ANY order from customers in 'Los Angeles'
```

## Summary

PostgreSQL provides rich filtering operators for complex queries:

- **IN/NOT IN**: Set membership testing (watch for NULLs with NOT IN)
- **BETWEEN**: Inclusive range testing
- **LIKE/ILIKE**: Pattern matching with wildcards
- **SIMILAR TO**: SQL standard regex
- **~, ~*, !~, !~***: POSIX regular expressions
- **IS NULL/IS NOT NULL**: Proper NULL testing
- **IS DISTINCT FROM**: NULL-safe comparison
- **EXISTS**: Efficient existence checking
- **ANY/ALL**: Array and subquery comparisons

Choose the right operator for your use case, consider performance implications, and always handle NULL values correctly.

## Related Topics

- [SELECT Basics](./02-select-basics.md) - Foundation for filtering
- [UPDATE and DELETE](./03-update-delete.md) - Using filters for modifications
- [Joins](../05-joins-subqueries/01-joins.md) - Combining tables with filters
- [Subqueries](../05-joins-subqueries/02-subqueries.md) - Complex filtering logic
- [Full-Text Search](../08-advanced/04-full-text-search.md) - Advanced text searching
