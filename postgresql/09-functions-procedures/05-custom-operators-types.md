# Custom Operators & Types

## Table of Contents
- [Theory](#theory)
- [Syntax](#syntax)
- [Examples](#examples)
- [Common Mistakes](#common-mistakes)
- [Best Practices](#best-practices)
- [Practice Exercises](#practice-exercises)

## Theory

### Custom Types

PostgreSQL allows you to create custom data types to model domain-specific data more accurately. This improves data integrity and makes your schema more expressive.

#### Type Categories

1. **Composite Types**: User-defined structure with multiple fields
   - Like a table structure but usable as a column type
   - Can be used in functions, tables, and queries

2. **Enumerated Types (ENUM)**: Predefined set of values
   - Ordered list of string values
   - Type-safe, more efficient than strings
   - Values stored as integers internally

3. **Domain Types**: Constrained base types
   - Adds constraints to existing types
   - Can have CHECK constraints
   - Can have DEFAULT values
   - Reusable validation logic

4. **Range Types**: Built-in but can be customized
   - int4range, int8range, numrange, tsrange, daterange
   - Can create custom range types

### Domains vs CHECK Constraints

**Domains**:
- Reusable across tables
- Named type that documents intent
- Single definition, multiple uses
- Can be altered globally
- Better for common validations (email, phone, postal codes)

**CHECK Constraints**:
- Per-table definition
- More flexible (can reference multiple columns)
- Can't be reused across tables
- Better for table-specific rules

### Custom Operators

Operators are symbolic functions (like +, -, =) that can be overloaded or created new. They make code more expressive and readable.

**Use Cases**:
- Mathematical operations on custom types
- Geometric operations
- Text pattern matching
- Full-text search
- Custom comparison logic

### Operator Classes

Operator classes define how operators work with indexes. Required for custom types to be indexable with specific index types (B-tree, GiST, GIN, etc.).

## Syntax

### CREATE TYPE - Composite

```sql
CREATE TYPE type_name AS (
    field_name1 data_type1,
    field_name2 data_type2,
    ...
);
```

### CREATE TYPE - ENUM

```sql
CREATE TYPE type_name AS ENUM (
    'value1',
    'value2',
    ...
);
```

### CREATE DOMAIN

```sql
CREATE DOMAIN domain_name AS data_type
    [DEFAULT default_value]
    [CHECK (constraint_expression)]
    [COLLATION collation];
```

### ALTER TYPE

```sql
-- Add value to ENUM
ALTER TYPE enum_name ADD VALUE 'new_value' [BEFORE 'existing_value' | AFTER 'existing_value'];

-- Rename value (PostgreSQL 10+)
ALTER TYPE enum_name RENAME VALUE 'old_value' TO 'new_value';

-- Rename type
ALTER TYPE type_name RENAME TO new_name;

-- Change owner
ALTER TYPE type_name OWNER TO new_owner;
```

### CREATE OPERATOR

```sql
CREATE OPERATOR operator_symbol (
    PROCEDURE = function_name,
    LEFTARG = left_type,
    RIGHTARG = right_type,
    [COMMUTATOR = commutator_op,]
    [NEGATOR = negator_op,]
    [RESTRICT = restriction_proc,]
    [JOIN = join_proc,]
    [HASHES,]
    [MERGES]
);
```

### DROP TYPE/DOMAIN/OPERATOR

```sql
DROP TYPE [IF EXISTS] type_name [CASCADE];
DROP DOMAIN [IF EXISTS] domain_name [CASCADE];
DROP OPERATOR [IF EXISTS] operator_name (left_type, right_type) [CASCADE];
```

## Examples

### Example 1: Composite Type - Address

```sql
-- Create composite type for addresses
CREATE TYPE address AS (
    street text,
    city text,
    state char(2),
    zip_code text,
    country text
);

-- Create table using composite type
CREATE TABLE IF NOT EXISTS customers (
    customer_id serial PRIMARY KEY,
    name text NOT NULL,
    email text UNIQUE NOT NULL,
    billing_address address,
    shipping_address address
);

-- Insert data with composite types
INSERT INTO customers (name, email, billing_address, shipping_address)
VALUES (
    'John Doe',
    'john@example.com',
    ROW('123 Main St', 'Springfield', 'IL', '62701', 'USA'),
    ROW('456 Oak Ave', 'Chicago', 'IL', '60601', 'USA')
);

-- Another syntax using type constructor
INSERT INTO customers (name, email, billing_address, shipping_address)
VALUES (
    'Jane Smith',
    'jane@example.com',
    ('789 Elm St', 'Portland', 'OR', '97201', 'USA')::address,
    ('789 Elm St', 'Portland', 'OR', '97201', 'USA')::address
);

-- Query composite type fields
SELECT
    name,
    (billing_address).city AS billing_city,
    (billing_address).state AS billing_state,
    (shipping_address).city AS shipping_city
FROM customers;

-- Query with composite type in WHERE
SELECT name
FROM customers
WHERE (billing_address).state = 'IL';

-- Update specific field in composite type
UPDATE customers
SET billing_address.zip_code = '62702'
WHERE customer_id = 1;

-- Access all fields
SELECT name, billing_address.*
FROM customers;
```

### Example 2: Enumerated Type - Order Status

```sql
-- Create ENUM type for order status
CREATE TYPE order_status AS ENUM (
    'pending',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'refunded'
);

-- Create table using ENUM
CREATE TABLE IF NOT EXISTS customer_orders_enum (
    order_id serial PRIMARY KEY,
    customer_id integer NOT NULL,
    status order_status NOT NULL DEFAULT 'pending',
    total_amount numeric(10,2) NOT NULL,
    created_at timestamp DEFAULT now()
);

-- Insert with ENUM values
INSERT INTO customer_orders_enum (customer_id, status, total_amount)
VALUES
    (1, 'pending', 150.00),
    (2, 'processing', 200.00),
    (1, 'shipped', 175.00);

-- Query with ENUM
SELECT order_id, status, total_amount
FROM customer_orders_enum
WHERE status = 'pending';

-- ENUM values are ordered
SELECT order_id, status
FROM customer_orders_enum
WHERE status > 'processing'
ORDER BY status;

-- Get all ENUM values
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'order_status'::regtype
ORDER BY enumsortorder;

-- Add new ENUM value
ALTER TYPE order_status ADD VALUE 'on_hold' AFTER 'processing';

-- Test new value
INSERT INTO customer_orders_enum (customer_id, status, total_amount)
VALUES (3, 'on_hold', 125.00);

SELECT DISTINCT status FROM customer_orders_enum ORDER BY status;
```

### Example 3: Domain - Email Validation

```sql
-- Create domain for email addresses
CREATE DOMAIN email AS text
CHECK (
    VALUE ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
);

-- Create domain for phone numbers (US format)
CREATE DOMAIN us_phone AS text
CHECK (
    VALUE ~ '^\d{3}-\d{3}-\d{4}$'
);

-- Create domain for positive money
CREATE DOMAIN positive_money AS numeric(10,2)
CHECK (VALUE > 0);

-- Create table using domains
CREATE TABLE IF NOT EXISTS contacts (
    contact_id serial PRIMARY KEY,
    name text NOT NULL,
    email_address email,  -- Using email domain
    phone us_phone,        -- Using phone domain
    account_balance positive_money  -- Using positive_money domain
);

-- Valid insert
INSERT INTO contacts (name, email_address, phone, account_balance)
VALUES ('John Doe', 'john.doe@example.com', '555-123-4567', 100.50);

-- Invalid email (will fail)
-- INSERT INTO contacts (name, email_address, phone, account_balance)
-- VALUES ('Bad Email', 'not-an-email', '555-123-4567', 100.50);

-- Invalid phone (will fail)
-- INSERT INTO contacts (name, email_address, phone, account_balance)
-- VALUES ('Bad Phone', 'good@example.com', '5551234567', 100.50);

-- Invalid balance (will fail)
-- INSERT INTO contacts (name, email_address, phone, account_balance)
-- VALUES ('Bad Balance', 'good@example.com', '555-123-4567', -10.00);

-- View successful insert
SELECT * FROM contacts;
```

### Example 4: Domain with DEFAULT Value

```sql
-- Create domain with default
CREATE DOMAIN priority_level AS text
DEFAULT 'medium'
CHECK (VALUE IN ('low', 'medium', 'high', 'urgent'));

-- Create domain for percentage
CREATE DOMAIN percentage AS numeric(5,2)
DEFAULT 0
CHECK (VALUE >= 0 AND VALUE <= 100);

-- Create table using domains with defaults
CREATE TABLE IF NOT EXISTS tasks (
    task_id serial PRIMARY KEY,
    title text NOT NULL,
    priority priority_level,  -- Will default to 'medium'
    completion_percent percentage  -- Will default to 0
);

-- Insert without specifying domain columns
INSERT INTO tasks (title)
VALUES ('Write documentation');

-- Insert with specific values
INSERT INTO tasks (title, priority, completion_percent)
VALUES ('Review code', 'high', 75.50);

-- View with defaults applied
SELECT * FROM tasks;

-- Invalid priority (will fail)
-- INSERT INTO tasks (title, priority)
-- VALUES ('Bad Priority', 'critical');

-- Invalid percentage (will fail)
-- INSERT INTO tasks (title, completion_percent)
-- VALUES ('Bad Percentage', 150);
```

### Example 5: Complex Domain - Postal Code

```sql
-- Create domain for US ZIP codes (5 or 9 digits)
CREATE DOMAIN us_postal_code AS text
CHECK (
    VALUE ~ '^\d{5}$' OR VALUE ~ '^\d{5}-\d{4}$'
);

-- Create domain for Canadian postal codes
CREATE DOMAIN ca_postal_code AS text
CHECK (
    VALUE ~ '^[A-Z]\d[A-Z] \d[A-Z]\d$'
);

-- Test US postal codes
CREATE TABLE IF NOT EXISTS us_locations (
    location_id serial PRIMARY KEY,
    name text,
    zip us_postal_code
);

INSERT INTO us_locations (name, zip) VALUES
    ('Location 1', '12345'),
    ('Location 2', '12345-6789');

-- Test Canadian postal codes
CREATE TABLE IF NOT EXISTS ca_locations (
    location_id serial PRIMARY KEY,
    name text,
    postal_code ca_postal_code
);

INSERT INTO ca_locations (name, postal_code) VALUES
    ('Location 1', 'A1B 2C3'),
    ('Location 2', 'X9Y 8Z7');

SELECT * FROM us_locations;
SELECT * FROM ca_locations;
```

### Example 6: Composite Type with Functions

```sql
-- Create complex number type
CREATE TYPE complex_number AS (
    real numeric,
    imaginary numeric
);

-- Function to add complex numbers
CREATE OR REPLACE FUNCTION complex_add(
    a complex_number,
    b complex_number
)
RETURNS complex_number
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    RETURN ROW(
        a.real + b.real,
        a.imaginary + b.imaginary
    )::complex_number;
END;
$$;

-- Function to multiply complex numbers
CREATE OR REPLACE FUNCTION complex_multiply(
    a complex_number,
    b complex_number
)
RETURNS complex_number
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    RETURN ROW(
        (a.real * b.real) - (a.imaginary * b.imaginary),
        (a.real * b.imaginary) + (a.imaginary * b.real)
    )::complex_number;
END;
$$;

-- Function to format complex number
CREATE OR REPLACE FUNCTION complex_to_string(c complex_number)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF c.imaginary >= 0 THEN
        RETURN format('%s + %si', c.real, c.imaginary);
    ELSE
        RETURN format('%s - %si', c.real, abs(c.imaginary));
    END IF;
END;
$$;

-- Test complex number operations
SELECT complex_to_string(
    complex_add(
        ROW(3, 4)::complex_number,
        ROW(1, 2)::complex_number
    )
);  -- Result: "4 + 6i"

SELECT complex_to_string(
    complex_multiply(
        ROW(3, 2)::complex_number,
        ROW(1, 4)::complex_number
    )
);  -- Result: "-5 + 14i"
```

### Example 7: Custom Operator - Complex Addition

```sql
-- Create operator for complex number addition
CREATE OPERATOR + (
    PROCEDURE = complex_add,
    LEFTARG = complex_number,
    RIGHTARG = complex_number,
    COMMUTATOR = +
);

-- Create operator for complex number multiplication
CREATE OPERATOR * (
    PROCEDURE = complex_multiply,
    LEFTARG = complex_number,
    RIGHTARG = complex_number,
    COMMUTATOR = *
);

-- Test operators
SELECT complex_to_string(
    ROW(3, 4)::complex_number + ROW(1, 2)::complex_number
);  -- "4 + 6i"

SELECT complex_to_string(
    ROW(2, 3)::complex_number * ROW(4, 1)::complex_number
);  -- "5 + 14i"

-- Chain operations
SELECT complex_to_string(
    (ROW(1, 1)::complex_number + ROW(2, 2)::complex_number) *
    ROW(3, 0)::complex_number
);  -- "9 + 9i"
```

### Example 8: Custom Text Operator - Contains Pattern

```sql
-- Function to check if text contains pattern (case-insensitive)
CREATE OR REPLACE FUNCTION text_contains_ci(
    text_value text,
    pattern text
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    RETURN lower(text_value) LIKE '%' || lower(pattern) || '%';
END;
$$;

-- Create custom operator
CREATE OPERATOR ~~ (
    PROCEDURE = text_contains_ci,
    LEFTARG = text,
    RIGHTARG = text
);

-- Create test table
CREATE TABLE IF NOT EXISTS documents (
    doc_id serial PRIMARY KEY,
    title text,
    content text
);

INSERT INTO documents (title, content) VALUES
    ('PostgreSQL Guide', 'This is a comprehensive guide to PostgreSQL'),
    ('SQL Basics', 'Learn SQL from scratch'),
    ('Advanced Topics', 'Deep dive into POSTGRESQL internals');

-- Test custom operator
SELECT title
FROM documents
WHERE content ~~ 'postgresql';  -- Case-insensitive search

-- Compare with standard ILIKE
SELECT title
FROM documents
WHERE content ILIKE '%postgresql%';
```

### Example 9: Range Type with Custom Domain

```sql
-- Create domain for valid dates (not in far future)
CREATE DOMAIN valid_date AS date
CHECK (
    VALUE >= '1900-01-01' AND
    VALUE <= current_date + interval '10 years'
);

-- Create table with date range
CREATE TABLE IF NOT EXISTS events (
    event_id serial PRIMARY KEY,
    event_name text NOT NULL,
    event_period daterange NOT NULL,
    start_date valid_date GENERATED ALWAYS AS (lower(event_period)) STORED,
    end_date valid_date GENERATED ALWAYS AS (upper(event_period)) STORED
);

-- Insert events
INSERT INTO events (event_name, event_period) VALUES
    ('Conference 2024', '[2024-06-01,2024-06-03]'),
    ('Workshop', '[2024-07-15,2024-07-16]'),
    ('Webinar Series', '[2024-08-01,2024-08-31]');

-- Query overlapping events
SELECT e1.event_name AS event1, e2.event_name AS event2
FROM events e1
JOIN events e2 ON e1.event_id < e2.event_id
WHERE e1.event_period && e2.event_period;  -- Overlaps operator

-- Find events containing specific date
SELECT event_name, event_period
FROM events
WHERE event_period @> '2024-06-02'::date;  -- Contains operator

-- Find current events
SELECT event_name
FROM events
WHERE event_period @> current_date;
```

### Example 10: Altering Domains

```sql
-- Create initial domain
CREATE DOMAIN product_code AS text
CHECK (VALUE ~ '^[A-Z]{3}-\d{4}$');

-- Create table using domain
CREATE TABLE IF NOT EXISTS products_domain (
    product_id serial PRIMARY KEY,
    code product_code,
    name text
);

-- Insert valid data
INSERT INTO products_domain (code, name)
VALUES ('ABC-1234', 'Product 1');

-- Add additional constraint to domain
ALTER DOMAIN product_code
ADD CONSTRAINT code_prefix_valid
CHECK (substring(VALUE, 1, 3) IN ('ABC', 'XYZ', 'DEF'));

-- This now fails (invalid prefix)
-- INSERT INTO products_domain (code, name)
-- VALUES ('QQQ-5678', 'Product 2');

-- This succeeds
INSERT INTO products_domain (code, name)
VALUES ('XYZ-5678', 'Product 2');

-- Drop constraint
ALTER DOMAIN product_code
DROP CONSTRAINT code_prefix_valid;

-- Change domain default
ALTER DOMAIN priority_level SET DEFAULT 'high';

-- Remove domain default
ALTER DOMAIN priority_level DROP DEFAULT;
```

### Example 11: Composite Type in Array

```sql
-- Create type for coordinates
CREATE TYPE point_2d AS (
    x numeric,
    y numeric
);

-- Create table with array of composite types
CREATE TABLE IF NOT EXISTS polygons (
    polygon_id serial PRIMARY KEY,
    name text,
    vertices point_2d[]
);

-- Insert polygon (triangle)
INSERT INTO polygons (name, vertices) VALUES (
    'Triangle',
    ARRAY[
        ROW(0, 0)::point_2d,
        ROW(3, 0)::point_2d,
        ROW(1.5, 2.6)::point_2d
    ]
);

-- Insert polygon (square)
INSERT INTO polygons (name, vertices) VALUES (
    'Square',
    ARRAY[
        ROW(0, 0)::point_2d,
        ROW(1, 0)::point_2d,
        ROW(1, 1)::point_2d,
        ROW(0, 1)::point_2d
    ]
);

-- Query vertices
SELECT
    name,
    array_length(vertices, 1) AS vertex_count,
    vertices[1] AS first_vertex
FROM polygons;

-- Function to calculate perimeter (simplified)
CREATE OR REPLACE FUNCTION calculate_perimeter(vertices point_2d[])
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    total numeric := 0;
    i integer;
    p1 point_2d;
    p2 point_2d;
BEGIN
    FOR i IN 1..array_length(vertices, 1) LOOP
        p1 := vertices[i];
        IF i = array_length(vertices, 1) THEN
            p2 := vertices[1];
        ELSE
            p2 := vertices[i + 1];
        END IF;

        total := total + sqrt(
            power(p2.x - p1.x, 2) + power(p2.y - p1.y, 2)
        );
    END LOOP;

    RETURN total;
END;
$$;

-- Calculate perimeters
SELECT
    name,
    ROUND(calculate_perimeter(vertices), 2) AS perimeter
FROM polygons;
```

### Example 12: Nested Composite Types

```sql
-- Create nested composite types
CREATE TYPE person_name AS (
    first_name text,
    middle_name text,
    last_name text
);

CREATE TYPE person_contact AS (
    email text,
    phone text
);

CREATE TYPE person AS (
    name person_name,
    contact person_contact,
    birth_date date
);

-- Create table using nested type
CREATE TABLE IF NOT EXISTS people (
    person_id serial PRIMARY KEY,
    person_data person
);

-- Insert with nested composite
INSERT INTO people (person_data) VALUES (
    ROW(
        ROW('John', 'Q', 'Doe')::person_name,
        ROW('john@example.com', '555-1234')::person_contact,
        '1990-01-15'
    )::person
);

-- Query nested fields
SELECT
    (person_data).name.first_name AS first_name,
    (person_data).name.last_name AS last_name,
    (person_data).contact.email AS email
FROM people;

-- Update nested field
UPDATE people
SET person_data.contact.phone = '555-5678'
WHERE person_id = 1;

-- Expand all fields
SELECT
    person_id,
    (person_data.name).*,
    (person_data.contact).*,
    person_data.birth_date
FROM people;
```

### Example 13: Domain for URL Validation

```sql
-- Create domain for URLs
CREATE DOMAIN url AS text
CHECK (
    VALUE ~ '^https?://[A-Za-z0-9.-]+\.[A-Za-z]{2,}(/.*)?$'
);

-- Create domain for slug (URL-friendly identifier)
CREATE DOMAIN slug AS text
CHECK (
    VALUE ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND
    length(VALUE) BETWEEN 3 AND 100
);

-- Create table
CREATE TABLE IF NOT EXISTS pages (
    page_id serial PRIMARY KEY,
    page_slug slug UNIQUE NOT NULL,
    page_url url,
    title text NOT NULL
);

-- Valid inserts
INSERT INTO pages (page_slug, page_url, title) VALUES
    ('home-page', 'https://example.com/', 'Home'),
    ('about-us', 'https://example.com/about', 'About Us'),
    ('contact-form', 'http://example.com/contact', 'Contact');

-- Invalid slug (uppercase)
-- INSERT INTO pages (page_slug, page_url, title)
-- VALUES ('Bad-Slug', 'https://example.com/', 'Test');

-- Invalid URL
-- INSERT INTO pages (page_slug, page_url, title)
-- VALUES ('test', 'not-a-url', 'Test');

SELECT * FROM pages;
```

### Example 14: ENUM with State Machine

```sql
-- Create ENUM for workflow states
CREATE TYPE workflow_state AS ENUM (
    'draft',
    'submitted',
    'under_review',
    'approved',
    'rejected',
    'published'
);

-- Create table
CREATE TABLE IF NOT EXISTS articles_workflow (
    article_id serial PRIMARY KEY,
    title text NOT NULL,
    current_state workflow_state DEFAULT 'draft',
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

-- Function to validate state transitions
CREATE OR REPLACE FUNCTION validate_workflow_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Define valid transitions
    IF OLD.current_state = 'draft' AND
       NEW.current_state NOT IN ('submitted', 'draft') THEN
        RAISE EXCEPTION 'Invalid transition from draft to %', NEW.current_state;
    END IF;

    IF OLD.current_state = 'submitted' AND
       NEW.current_state NOT IN ('under_review', 'submitted') THEN
        RAISE EXCEPTION 'Invalid transition from submitted to %', NEW.current_state;
    END IF;

    IF OLD.current_state = 'under_review' AND
       NEW.current_state NOT IN ('approved', 'rejected', 'under_review') THEN
        RAISE EXCEPTION 'Invalid transition from under_review to %', NEW.current_state;
    END IF;

    IF OLD.current_state = 'approved' AND
       NEW.current_state NOT IN ('published', 'approved') THEN
        RAISE EXCEPTION 'Invalid transition from approved to %', NEW.current_state;
    END IF;

    IF OLD.current_state IN ('rejected', 'published') THEN
        RAISE EXCEPTION 'Cannot transition from terminal state %', OLD.current_state;
    END IF;

    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER trigger_validate_workflow
    BEFORE UPDATE OF current_state ON articles_workflow
    FOR EACH ROW
    WHEN (OLD.current_state IS DISTINCT FROM NEW.current_state)
    EXECUTE FUNCTION validate_workflow_transition();

-- Test workflow
INSERT INTO articles_workflow (title)
VALUES ('Test Article');

UPDATE articles_workflow SET current_state = 'submitted' WHERE article_id = 1;
UPDATE articles_workflow SET current_state = 'under_review' WHERE article_id = 1;
UPDATE articles_workflow SET current_state = 'approved' WHERE article_id = 1;
UPDATE articles_workflow SET current_state = 'published' WHERE article_id = 1;

-- Invalid transition (will fail)
-- UPDATE articles_workflow SET current_state = 'draft' WHERE article_id = 1;

SELECT * FROM articles_workflow;
```

## Common Mistakes

### 1. Not Using CASCADE When Dropping Types

```sql
-- Create type
CREATE TYPE test_type AS (field1 text);

-- Create table using type
CREATE TABLE test_table (id serial, data test_type);

-- WRONG: Try to drop type without CASCADE
-- DROP TYPE test_type;  -- Error: type is used by table

-- CORRECT: Use CASCADE or drop dependents first
DROP TYPE test_type CASCADE;

-- Or drop table first
-- DROP TABLE test_table;
-- DROP TYPE test_type;
```

### 2. Trying to Modify ENUM Values

```sql
-- WRONG: Can't UPDATE existing ENUM value
-- ALTER TYPE order_status RENAME VALUE 'shipped' TO 'in_transit';
-- This works in PostgreSQL 10+ but not in earlier versions

-- CORRECT: For older versions, create new type and migrate
-- 1. Create new type
-- 2. Add column with new type
-- 3. Migrate data
-- 4. Drop old column
-- 5. Rename new column
```

### 3. Circular Dependencies in Composite Types

```sql
-- WRONG: Circular reference
-- CREATE TYPE type_a AS (field type_b);
-- CREATE TYPE type_b AS (field type_a);  -- Error!

-- CORRECT: Use intermediate type or restructure
CREATE TYPE shared_fields AS (
    id integer,
    name text
);

CREATE TYPE type_a AS (
    shared shared_fields,
    a_specific text
);

CREATE TYPE type_b AS (
    shared shared_fields,
    b_specific integer
);
```

### 4. Not Validating Domain Constraints Before Creating

```sql
-- WRONG: Create domain then discover existing data violates it
-- CREATE DOMAIN positive_int AS integer CHECK (VALUE > 0);
-- ALTER TABLE existing_table ALTER COLUMN amount TYPE positive_int;
-- Error if existing_table has amount <= 0

-- CORRECT: Validate first
SELECT COUNT(*)
FROM existing_table
WHERE amount <= 0;

-- Clean data, then create domain
-- UPDATE existing_table SET amount = 1 WHERE amount <= 0;
```

### 5. Overusing Custom Operators

```sql
-- WRONG: Custom operator that's not intuitive
CREATE OPERATOR ?! (
    PROCEDURE = some_obscure_function,
    LEFTARG = text,
    RIGHTARG = integer
);

-- CORRECT: Use clear function names instead
-- Only create operators for mathematical or widely-understood operations
CREATE FUNCTION check_text_length(text, integer) RETURNS boolean ...;
```

## Best Practices

### 1. Use Domains for Common Validations

```sql
-- Good: Reusable validation logic
CREATE DOMAIN email AS text
CHECK (VALUE ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

CREATE DOMAIN phone AS text
CHECK (VALUE ~ '^\d{3}-\d{3}-\d{4}$');

CREATE DOMAIN positive_money AS numeric(10,2)
CHECK (VALUE > 0);

-- Use across multiple tables
CREATE TABLE customers (
    customer_id serial PRIMARY KEY,
    email email,
    phone phone
);

CREATE TABLE suppliers (
    supplier_id serial PRIMARY KEY,
    email email,
    phone phone
);
```

### 2. Name Types Descriptively

```sql
-- Good: Clear, descriptive names
CREATE TYPE customer_address AS (
    street text,
    city text,
    postal_code text
);

CREATE TYPE order_status_enum AS ENUM (
    'pending',
    'processing',
    'completed'
);

-- Bad: Vague names
-- CREATE TYPE addr AS (...);
-- CREATE TYPE status AS ENUM (...);
```

### 3. Document Custom Types

```sql
-- Good: Add comments
CREATE DOMAIN email AS text
CHECK (VALUE ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

COMMENT ON DOMAIN email IS
'Email address validated with regex pattern.
Format: username@domain.tld
Allows alphanumeric, dots, underscores, percent, plus, hyphen in username.
Requires at least 2-character TLD.';

CREATE TYPE complex_number AS (
    real numeric,
    imaginary numeric
);

COMMENT ON TYPE complex_number IS
'Complex number representation with real and imaginary components.
Use with complex_add, complex_multiply functions and +, * operators.';
```

### 4. Plan ENUM Values Carefully

```sql
-- Good: Include room for expansion
CREATE TYPE priority AS ENUM (
    'lowest',
    'low',
    'medium',
    'high',
    'highest',
    'critical'
);

-- Add new value between existing ones
ALTER TYPE priority ADD VALUE 'urgent' AFTER 'highest';

-- Bad: No room to add values in logical order
-- CREATE TYPE priority AS ENUM ('low', 'high');
-- Hard to add 'medium' now (can only add at end or with specific BEFORE/AFTER)
```

### 5. Validate Domains with Comprehensive Patterns

```sql
-- Good: Comprehensive validation
CREATE DOMAIN us_phone AS text
CHECK (
    -- Allow formats: 555-123-4567, (555) 123-4567, 555.123.4567, 5551234567
    VALUE ~ '^\d{3}-\d{3}-\d{4}$' OR
    VALUE ~ '^\(\d{3}\) \d{3}-\d{4}$' OR
    VALUE ~ '^\d{3}\.\d{3}\.\d{4}$' OR
    VALUE ~ '^\d{10}$'
);

-- Or normalize format with trigger/function
CREATE DOMAIN normalized_phone AS text
CHECK (VALUE ~ '^\d{10}$');

CREATE OR REPLACE FUNCTION normalize_phone(input text)
RETURNS normalized_phone
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    RETURN regexp_replace(input, '[^0-9]', '', 'g')::normalized_phone;
END;
$$;
```

## Practice Exercises

### Exercise 1: Geographic Type System

Create a comprehensive geographic type system.

**Requirements:**
1. Create composite types for:
   - `coordinates` (latitude, longitude with validation -90 to 90, -180 to 180)
   - `geo_address` (street, city, state, country, postal_code, coordinates)
2. Create domains for:
   - `latitude` with CHECK constraint
   - `longitude` with CHECK constraint
   - `country_code` (2-character ISO codes)
3. Create functions:
   - `calculate_distance(coordinates, coordinates)` returning km
   - `format_address(geo_address)` returning formatted text
4. Create table `locations` using these types
5. Insert test data for multiple locations
6. Query locations within distance from point

**Test Cases:**
```sql
INSERT INTO locations (name, address) VALUES (...);
SELECT * FROM locations WHERE calculate_distance(address.coords, point) < 100;
```

### Exercise 2: Multi-Currency Money System

Create a type-safe multi-currency system.

**Requirements:**
1. Create ENUM `currency_code` (USD, EUR, GBP, JPY, etc.)
2. Create composite type `money_value` (amount numeric, currency currency_code)
3. Create domain `positive_amount` for amount validation
4. Create functions:
   - `format_money(money_value)` with currency symbols
   - `convert_currency(money_value, target_currency)` with exchange rates table
5. Create operator `+` for same-currency addition (error on different currencies)
6. Create table for transactions using money_value
7. Add validation trigger for same-currency operations

**Test Cases:**
```sql
SELECT format_money(ROW(100.50, 'USD')::money_value);  -- "$100.50"
SELECT convert_currency(ROW(100, 'USD')::money_value, 'EUR');
```

### Exercise 3: Versioned Document System

Create a type system for document versioning.

**Requirements:**
1. Create ENUM `document_status` (draft, review, approved, published, archived)
2. Create composite type `version_info` (version_number integer, created_at timestamp, created_by text)
3. Create composite type `document` (content text, status document_status, version version_info)
4. Create domain `version_number` ensuring positive integers
5. Create table `documents` with document type and array of historical versions
6. Create functions:
   - `create_new_version(document_id, new_content, author)` returns document
   - `get_version_history(document_id)` returns table
   - `rollback_version(document_id, target_version)`
7. Add triggers to prevent status downgrades (published -> draft)

**Test Cases:**
```sql
INSERT INTO documents (title, current_doc) VALUES (...);
SELECT create_new_version(1, 'Updated content', 'user');
SELECT * FROM get_version_history(1);
```

## Summary

Custom types and operators in PostgreSQL provide powerful ways to model domain-specific data:

**Composite Types**:
- Model complex structures
- Reusable across tables
- Can be nested and used in arrays

**ENUM Types**:
- Type-safe enumerated values
- Efficient storage
- Ordered comparisons
- Plan values carefully (hard to change)

**Domain Types**:
- Constrained base types
- Reusable validation logic
- Better than per-column CHECK constraints
- Can have defaults

**Custom Operators**:
- Make code more expressive
- Best for mathematical operations
- Require supporting functions
- Use sparingly and intuitively

**Best Practices**:
- Use domains for common validations (email, phone, etc.)
- Document custom types thoroughly
- Name types descriptively
- Plan ENUM values with room for expansion
- Validate before applying domains to existing data

For using these types in functions, see [SQL Functions](01-sql-functions.md) and [PL/pgSQL](02-plpgsql.md). For validation triggers, see [Triggers](04-triggers.md).
