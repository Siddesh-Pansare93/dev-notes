# Constraints

## Theory

Constraints are rules enforced by PostgreSQL to maintain data integrity and consistency. They define what values are acceptable in columns and tables, preventing invalid data from being inserted or updated. Constraints are fundamental to database design and help ensure business rules are consistently applied at the database level.

PostgreSQL supports several types of constraints:
- **PRIMARY KEY**: Uniquely identifies each row in a table
- **FOREIGN KEY**: Enforces referential integrity between tables
- **UNIQUE**: Ensures all values in a column or group of columns are distinct
- **CHECK**: Validates that values meet specific conditions
- **NOT NULL**: Requires a column to have a value
- **EXCLUDE**: Prevents overlapping values (particularly useful for ranges)

Constraints can be defined at the column level (column constraints) or at the table level (table constraints). Table-level constraints are necessary for multi-column constraints like composite primary keys.

Understanding constraint actions (CASCADE, RESTRICT, SET NULL, SET DEFAULT) and timing (DEFERRABLE) is crucial for managing complex data relationships.

## Syntax

### PRIMARY KEY

```sql
-- Column-level
CREATE TABLE table_name (
    id INTEGER PRIMARY KEY
);

-- Table-level (required for composite keys)
CREATE TABLE table_name (
    col1 INTEGER,
    col2 INTEGER,
    PRIMARY KEY (col1, col2)
);

-- Named constraint
CREATE TABLE table_name (
    id INTEGER,
    CONSTRAINT pk_table_name PRIMARY KEY (id)
);
```

### FOREIGN KEY

```sql
-- Column-level
CREATE TABLE child_table (
    id INTEGER PRIMARY KEY,
    parent_id INTEGER REFERENCES parent_table(id)
);

-- Table-level with actions
CREATE TABLE child_table (
    id INTEGER PRIMARY KEY,
    parent_id INTEGER,
    FOREIGN KEY (parent_id) REFERENCES parent_table(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- Named constraint with options
CREATE TABLE child_table (
    id INTEGER PRIMARY KEY,
    parent_id INTEGER,
    CONSTRAINT fk_child_parent FOREIGN KEY (parent_id)
        REFERENCES parent_table(id)
        ON DELETE SET NULL
        ON UPDATE RESTRICT
        DEFERRABLE INITIALLY DEFERRED
);
```

### UNIQUE

```sql
-- Column-level
CREATE TABLE table_name (
    email VARCHAR(100) UNIQUE
);

-- Table-level (multi-column)
CREATE TABLE table_name (
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    birth_date DATE,
    UNIQUE (first_name, last_name, birth_date)
);

-- Named constraint
CREATE TABLE table_name (
    email VARCHAR(100),
    CONSTRAINT uq_email UNIQUE (email)
);
```

### CHECK

```sql
-- Column-level
CREATE TABLE table_name (
    age INTEGER CHECK (age >= 0)
);

-- Table-level
CREATE TABLE table_name (
    price NUMERIC(10, 2),
    discount_price NUMERIC(10, 2),
    CHECK (discount_price < price)
);

-- Named constraint
CREATE TABLE table_name (
    status VARCHAR(20),
    CONSTRAINT chk_valid_status CHECK (status IN ('active', 'inactive', 'pending'))
);
```

### EXCLUDE

```sql
CREATE TABLE table_name (
    id INTEGER PRIMARY KEY,
    during TSRANGE,
    EXCLUDE USING GIST (during WITH &&)
);
```

### Adding/Dropping Constraints

```sql
-- Add constraint
ALTER TABLE table_name ADD CONSTRAINT constraint_name constraint_definition;

-- Drop constraint
ALTER TABLE table_name DROP CONSTRAINT constraint_name [CASCADE | RESTRICT];
```

## Examples

### PRIMARY KEY Constraints

```sql
-- Single column primary key
CREATE TABLE customers (
    customer_id SERIAL PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL,
    email VARCHAR(100)
);

-- Composite primary key
CREATE TABLE order_items (
    order_id INTEGER,
    product_id INTEGER,
    quantity INTEGER NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    PRIMARY KEY (order_id, product_id)
);

-- Named primary key constraint
CREATE TABLE employees (
    employee_id INTEGER,
    ssn VARCHAR(11),
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    CONSTRAINT pk_employees PRIMARY KEY (employee_id)
);

-- Adding primary key to existing table
CREATE TABLE departments (
    dept_id INTEGER,
    dept_name VARCHAR(100)
);

ALTER TABLE departments
ADD CONSTRAINT pk_departments PRIMARY KEY (dept_id);

-- Verify constraints
\d customers
\d order_items
```

### FOREIGN KEY Constraints

```sql
-- Create parent table
CREATE TABLE authors (
    author_id SERIAL PRIMARY KEY,
    author_name VARCHAR(100) NOT NULL,
    country VARCHAR(50)
);

-- Create child table with foreign key
CREATE TABLE books (
    book_id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    author_id INTEGER REFERENCES authors(author_id),
    published_year INTEGER
);

-- Insert test data
INSERT INTO authors (author_name, country) VALUES
    ('George Orwell', 'UK'),
    ('Jane Austen', 'UK');

INSERT INTO books (title, author_id, published_year) VALUES
    ('1984', 1, 1949),
    ('Pride and Prejudice', 2, 1813);

-- This fails - violates foreign key constraint
INSERT INTO books (title, author_id, published_year) VALUES
    ('Unknown Book', 999, 2020);
```

### Foreign Key Actions: ON DELETE CASCADE

```sql
-- Create tables with CASCADE delete
CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL
);

CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    product_name VARCHAR(200) NOT NULL,
    category_id INTEGER,
    CONSTRAINT fk_products_categories
        FOREIGN KEY (category_id)
        REFERENCES categories(category_id)
        ON DELETE CASCADE
);

-- Insert data
INSERT INTO categories (category_name) VALUES ('Electronics'), ('Books');
INSERT INTO products (product_name, category_id) VALUES
    ('Laptop', 1),
    ('Tablet', 1),
    ('Novel', 2);

-- Delete category - products are also deleted
DELETE FROM categories WHERE category_id = 1;

-- Check results - Electronics products are gone
SELECT * FROM products;
```

### Foreign Key Actions: ON DELETE SET NULL

```sql
CREATE TABLE managers (
    manager_id SERIAL PRIMARY KEY,
    manager_name VARCHAR(100) NOT NULL
);

CREATE TABLE employees (
    employee_id SERIAL PRIMARY KEY,
    employee_name VARCHAR(100) NOT NULL,
    manager_id INTEGER,
    CONSTRAINT fk_employees_managers
        FOREIGN KEY (manager_id)
        REFERENCES managers(manager_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

-- Insert data
INSERT INTO managers (manager_name) VALUES ('Alice'), ('Bob');
INSERT INTO employees (employee_name, manager_id) VALUES
    ('Charlie', 1),
    ('David', 1),
    ('Eve', 2);

-- Delete manager - employees' manager_id becomes NULL
DELETE FROM managers WHERE manager_id = 1;

SELECT * FROM employees;
```

### Foreign Key Actions: ON DELETE RESTRICT

```sql
CREATE TABLE suppliers (
    supplier_id SERIAL PRIMARY KEY,
    supplier_name VARCHAR(100) NOT NULL
);

CREATE TABLE inventory (
    item_id SERIAL PRIMARY KEY,
    item_name VARCHAR(200),
    supplier_id INTEGER,
    CONSTRAINT fk_inventory_suppliers
        FOREIGN KEY (supplier_id)
        REFERENCES suppliers(supplier_id)
        ON DELETE RESTRICT  -- This is the default
);

-- Insert data
INSERT INTO suppliers (supplier_name) VALUES ('Acme Corp');
INSERT INTO inventory (item_name, supplier_id) VALUES ('Widget', 1);

-- This fails - cannot delete supplier with dependent inventory
DELETE FROM suppliers WHERE supplier_id = 1;

-- Must delete inventory first
DELETE FROM inventory WHERE supplier_id = 1;
DELETE FROM suppliers WHERE supplier_id = 1;
```

### Foreign Key Actions: ON DELETE SET DEFAULT

```sql
CREATE TABLE warehouses (
    warehouse_id SERIAL PRIMARY KEY,
    warehouse_name VARCHAR(100) NOT NULL
);

-- Insert default warehouse
INSERT INTO warehouses (warehouse_id, warehouse_name) VALUES (0, 'Unassigned');

CREATE TABLE stock_items (
    item_id SERIAL PRIMARY KEY,
    item_name VARCHAR(200),
    warehouse_id INTEGER DEFAULT 0,
    CONSTRAINT fk_stock_warehouses
        FOREIGN KEY (warehouse_id)
        REFERENCES warehouses(warehouse_id)
        ON DELETE SET DEFAULT
);

-- Insert data
INSERT INTO warehouses (warehouse_name) VALUES ('Warehouse A'), ('Warehouse B');
INSERT INTO stock_items (item_name, warehouse_id) VALUES
    ('Item 1', 1),
    ('Item 2', 2);

-- Delete warehouse - items go to default warehouse
DELETE FROM warehouses WHERE warehouse_id = 1;

SELECT * FROM stock_items;
```

### DEFERRABLE Constraints

```sql
-- Create tables with deferrable foreign keys
CREATE TABLE nodes (
    node_id INTEGER PRIMARY KEY,
    parent_node_id INTEGER,
    node_name VARCHAR(100),
    CONSTRAINT fk_nodes_parent
        FOREIGN KEY (parent_node_id)
        REFERENCES nodes(node_id)
        DEFERRABLE INITIALLY DEFERRED
);

-- Without deferrable, this would be difficult
BEGIN;
    -- Insert child before parent would normally fail
    -- But with DEFERRABLE INITIALLY DEFERRED, constraint checked at commit
    INSERT INTO nodes VALUES (2, 1, 'Child');
    INSERT INTO nodes VALUES (1, NULL, 'Parent');
COMMIT;

SELECT * FROM nodes;

-- Can also defer specific transaction
BEGIN;
    SET CONSTRAINTS fk_nodes_parent DEFERRED;
    INSERT INTO nodes VALUES (4, 3, 'Child 2');
    INSERT INTO nodes VALUES (3, NULL, 'Parent 2');
COMMIT;
```

### UNIQUE Constraints

```sql
-- Single column unique constraint
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL
);

-- Multi-column unique constraint
CREATE TABLE course_enrollments (
    enrollment_id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    semester VARCHAR(20) NOT NULL,
    UNIQUE (student_id, course_id, semester)
);

-- Named unique constraint
CREATE TABLE phone_numbers (
    id SERIAL PRIMARY KEY,
    country_code VARCHAR(5),
    number VARCHAR(20),
    CONSTRAINT uq_phone UNIQUE (country_code, number)
);

-- Test unique constraint
INSERT INTO users (username, email) VALUES ('john_doe', 'john@example.com');

-- This fails - duplicate username
INSERT INTO users (username, email) VALUES ('john_doe', 'john2@example.com');

-- NULL values are allowed with UNIQUE (multiple NULLs allowed)
INSERT INTO users (username, email) VALUES ('jane_doe', NULL);
INSERT INTO users (username, email) VALUES ('bob_smith', NULL);

SELECT * FROM users;
```

### CHECK Constraints

```sql
-- Simple CHECK constraints
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    product_name VARCHAR(200) NOT NULL,
    price NUMERIC(10, 2) CHECK (price > 0),
    stock_quantity INTEGER CHECK (stock_quantity >= 0),
    rating NUMERIC(2, 1) CHECK (rating >= 0 AND rating <= 5)
);

-- Multi-column CHECK constraint
CREATE TABLE discounts (
    discount_id SERIAL PRIMARY KEY,
    product_id INTEGER,
    original_price NUMERIC(10, 2),
    discounted_price NUMERIC(10, 2),
    CONSTRAINT chk_discount_valid CHECK (discounted_price < original_price)
);

-- CHECK with IN clause
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    status VARCHAR(20) NOT NULL,
    CONSTRAINT chk_status CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled'))
);

-- Complex CHECK constraint
CREATE TABLE events (
    event_id SERIAL PRIMARY KEY,
    event_name VARCHAR(200),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    CONSTRAINT chk_date_range CHECK (end_date >= start_date)
);

-- Test CHECK constraints
INSERT INTO products (product_name, price, stock_quantity, rating)
VALUES ('Laptop', 999.99, 10, 4.5);

-- This fails - negative price
INSERT INTO products (product_name, price, stock_quantity, rating)
VALUES ('Phone', -500, 5, 4.0);

-- This fails - rating out of range
INSERT INTO products (product_name, price, stock_quantity, rating)
VALUES ('Tablet', 299.99, 8, 6.0);
```

### EXCLUDE Constraints

```sql
-- Install btree_gist extension (needed for EXCLUDE)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Room booking system - prevent overlapping reservations
CREATE TABLE room_bookings (
    booking_id SERIAL PRIMARY KEY,
    room_number INTEGER NOT NULL,
    booked_during TSRANGE NOT NULL,
    guest_name VARCHAR(100),
    EXCLUDE USING GIST (room_number WITH =, booked_during WITH &&)
);

-- First booking succeeds
INSERT INTO room_bookings (room_number, booked_during, guest_name)
VALUES (101, '[2024-01-01 14:00, 2024-01-01 16:00)'::TSRANGE, 'Alice');

-- Second booking in different room succeeds
INSERT INTO room_bookings (room_number, booked_during, guest_name)
VALUES (102, '[2024-01-01 14:00, 2024-01-01 16:00)'::TSRANGE, 'Bob');

-- This fails - overlapping time for same room
INSERT INTO room_bookings (room_number, booked_during, guest_name)
VALUES (101, '[2024-01-01 15:00, 2024-01-01 17:00)'::TSRANGE, 'Charlie');

-- This succeeds - adjacent but not overlapping
INSERT INTO room_bookings (room_number, booked_during, guest_name)
VALUES (101, '[2024-01-01 16:00, 2024-01-01 18:00)'::TSRANGE, 'Charlie');

-- Conference room scheduling with EXCLUDE
CREATE TABLE conference_rooms (
    reservation_id SERIAL PRIMARY KEY,
    room_id INTEGER,
    reserved_period DATERANGE,
    organizer VARCHAR(100),
    EXCLUDE USING GIST (room_id WITH =, reserved_period WITH &&)
);
```

### Constraint Naming Conventions

```sql
-- Good naming convention for constraints
CREATE TABLE employee_records (
    -- Primary key: pk_tablename
    employee_id SERIAL,
    CONSTRAINT pk_employee_records PRIMARY KEY (employee_id),

    -- Foreign key: fk_tablename_referenced_table
    department_id INTEGER,
    CONSTRAINT fk_employee_records_departments
        FOREIGN KEY (department_id)
        REFERENCES departments(dept_id),

    -- Unique: uq_tablename_columnname
    email VARCHAR(100),
    CONSTRAINT uq_employee_records_email UNIQUE (email),

    -- Check: chk_tablename_columnname or chk_tablename_description
    salary NUMERIC(10, 2),
    CONSTRAINT chk_employee_records_salary_positive CHECK (salary > 0),

    hire_date DATE,
    termination_date DATE,
    CONSTRAINT chk_employee_records_dates CHECK (termination_date IS NULL OR termination_date >= hire_date)
);
```

### Adding and Dropping Constraints

```sql
-- Create table without constraints
CREATE TABLE invoices (
    invoice_id INTEGER,
    customer_id INTEGER,
    invoice_date DATE,
    total_amount NUMERIC(10, 2),
    status VARCHAR(20)
);

-- Add primary key
ALTER TABLE invoices
ADD CONSTRAINT pk_invoices PRIMARY KEY (invoice_id);

-- Add foreign key
ALTER TABLE invoices
ADD CONSTRAINT fk_invoices_customers
    FOREIGN KEY (customer_id)
    REFERENCES customers(customer_id)
    ON DELETE RESTRICT;

-- Add check constraint
ALTER TABLE invoices
ADD CONSTRAINT chk_invoices_amount
    CHECK (total_amount >= 0);

-- Add unique constraint
ALTER TABLE invoices
ADD CONSTRAINT uq_invoices_date_customer
    UNIQUE (customer_id, invoice_date);

-- Add NOT NULL constraint (different syntax)
ALTER TABLE invoices
ALTER COLUMN invoice_date SET NOT NULL;

-- Drop constraints
ALTER TABLE invoices DROP CONSTRAINT chk_invoices_amount;
ALTER TABLE invoices DROP CONSTRAINT uq_invoices_date_customer;

-- Drop foreign key with CASCADE (drops dependent objects)
ALTER TABLE invoices DROP CONSTRAINT fk_invoices_customers CASCADE;

-- View all constraints
\d invoices
```

### Self-Referencing Foreign Keys

```sql
-- Employee hierarchy table
CREATE TABLE employees_hierarchy (
    employee_id SERIAL PRIMARY KEY,
    employee_name VARCHAR(100) NOT NULL,
    manager_id INTEGER,
    CONSTRAINT fk_employees_manager
        FOREIGN KEY (manager_id)
        REFERENCES employees_hierarchy(employee_id)
        ON DELETE SET NULL
);

-- Insert CEO (no manager)
INSERT INTO employees_hierarchy (employee_name, manager_id)
VALUES ('CEO Alice', NULL);

-- Insert managers reporting to CEO
INSERT INTO employees_hierarchy (employee_name, manager_id)
VALUES ('Manager Bob', 1), ('Manager Carol', 1);

-- Insert employees reporting to managers
INSERT INTO employees_hierarchy (employee_name, manager_id)
VALUES ('Employee Dave', 2), ('Employee Eve', 2), ('Employee Frank', 3);

-- Query hierarchy
SELECT
    e.employee_name,
    m.employee_name AS manager_name
FROM employees_hierarchy e
LEFT JOIN employees_hierarchy m ON e.manager_id = m.employee_id;
```

## Common Mistakes

### 1. Not Naming Constraints

```sql
-- WRONG: Unnamed constraints get auto-generated names
CREATE TABLE bad_example (
    id INTEGER PRIMARY KEY,
    email VARCHAR(100) UNIQUE,
    age INTEGER CHECK (age > 0)
);

-- CORRECT: Named constraints are easier to manage
CREATE TABLE good_example (
    id INTEGER,
    email VARCHAR(100),
    age INTEGER,
    CONSTRAINT pk_good_example PRIMARY KEY (id),
    CONSTRAINT uq_good_example_email UNIQUE (email),
    CONSTRAINT chk_good_example_age CHECK (age > 0)
);

-- Dropping unnamed constraint is harder
-- \d bad_example  -- find the generated name
-- ALTER TABLE bad_example DROP CONSTRAINT bad_example_age_check;
```

### 2. Choosing Wrong ON DELETE Action

```sql
-- WRONG: Using CASCADE when you should preserve data
CREATE TABLE customers_wrong (
    customer_id SERIAL PRIMARY KEY,
    customer_name VARCHAR(100)
);

CREATE TABLE orders_wrong (
    order_id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers_wrong(customer_id) ON DELETE CASCADE
);

-- Deleting customer deletes all their orders (probably not desired for audit purposes)

-- CORRECT: Use RESTRICT or SET NULL for historical records
CREATE TABLE orders_correct (
    order_id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(customer_id) ON DELETE RESTRICT
);
```

### 3. Forgetting to Handle NULL in UNIQUE Constraints

```sql
-- NULLs are allowed in UNIQUE constraints
CREATE TABLE products_unique (
    product_id SERIAL PRIMARY KEY,
    sku VARCHAR(50) UNIQUE  -- Multiple NULLs allowed!
);

INSERT INTO products_unique (sku) VALUES (NULL), (NULL);  -- This works

-- If you need to prevent NULLs, combine with NOT NULL
CREATE TABLE products_better (
    product_id SERIAL PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL
);
```

### 4. CHECK Constraint on Wrong Table

```sql
-- WRONG: Can't reference other tables in CHECK
CREATE TABLE wrong_check (
    product_id INTEGER,
    category_id INTEGER,
    CHECK (category_id IN (SELECT category_id FROM categories))  -- NOT SUPPORTED
);

-- CORRECT: Use FOREIGN KEY instead
CREATE TABLE correct_check (
    product_id INTEGER,
    category_id INTEGER REFERENCES categories(category_id)
);
```

### 5. Not Considering Constraint Validation on Existing Data

```sql
CREATE TABLE legacy_data (
    id SERIAL PRIMARY KEY,
    age INTEGER
);

INSERT INTO legacy_data (age) VALUES (-5), (150), (NULL);

-- This fails if existing data violates constraint
ALTER TABLE legacy_data ADD CONSTRAINT chk_age CHECK (age BETWEEN 0 AND 120);

-- CORRECT: Clean data first
UPDATE legacy_data SET age = 0 WHERE age < 0;
UPDATE legacy_data SET age = 120 WHERE age > 120;
ALTER TABLE legacy_data ADD CONSTRAINT chk_age CHECK (age BETWEEN 0 AND 120);
```

## Best Practices

### 1. Always Name Your Constraints

```sql
CREATE TABLE best_practice_table (
    id INTEGER,
    email VARCHAR(100),
    status VARCHAR(20),
    created_at TIMESTAMP,
    CONSTRAINT pk_best_practice PRIMARY KEY (id),
    CONSTRAINT uq_best_practice_email UNIQUE (email),
    CONSTRAINT chk_best_practice_status CHECK (status IN ('active', 'inactive'))
);
```

### 2. Use Descriptive CHECK Constraints

```sql
CREATE TABLE orders_best (
    order_id SERIAL PRIMARY KEY,
    order_date DATE NOT NULL,
    ship_date DATE,
    status VARCHAR(20) NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    CONSTRAINT chk_orders_ship_after_order CHECK (ship_date IS NULL OR ship_date >= order_date),
    CONSTRAINT chk_orders_valid_status CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
    CONSTRAINT chk_orders_positive_amount CHECK (total_amount > 0)
);
```

### 3. Choose Appropriate Foreign Key Actions

```sql
-- For historical/audit data: RESTRICT
CREATE TABLE transactions (
    transaction_id SERIAL PRIMARY KEY,
    account_id INTEGER,
    CONSTRAINT fk_transactions_accounts
        FOREIGN KEY (account_id) REFERENCES accounts(account_id)
        ON DELETE RESTRICT  -- Don't allow account deletion with transactions
);

-- For dependent data: CASCADE
CREATE TABLE order_line_items (
    item_id SERIAL PRIMARY KEY,
    order_id INTEGER,
    CONSTRAINT fk_items_orders
        FOREIGN KEY (order_id) REFERENCES orders(order_id)
        ON DELETE CASCADE  -- Delete items when order is deleted
);

-- For optional relationships: SET NULL
CREATE TABLE employees_best (
    employee_id SERIAL PRIMARY KEY,
    manager_id INTEGER,
    CONSTRAINT fk_employees_manager
        FOREIGN KEY (manager_id) REFERENCES employees_best(employee_id)
        ON DELETE SET NULL  -- Employee remains if manager is deleted
);
```

### 4. Combine UNIQUE with NOT NULL When Appropriate

```sql
CREATE TABLE user_accounts (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,  -- Username must be unique and required
    email VARCHAR(100) UNIQUE NOT NULL,     -- Email must be unique and required
    phone VARCHAR(20) UNIQUE                -- Phone can be NULL, but if provided must be unique
);
```

### 5. Document Complex Constraints

```sql
CREATE TABLE pricing_rules (
    rule_id SERIAL PRIMARY KEY,
    min_quantity INTEGER NOT NULL,
    max_quantity INTEGER,
    unit_price NUMERIC(10, 2) NOT NULL,
    CONSTRAINT chk_pricing_quantity_range
        CHECK (max_quantity IS NULL OR max_quantity >= min_quantity),
    CONSTRAINT chk_pricing_positive_price
        CHECK (unit_price > 0)
);

COMMENT ON CONSTRAINT chk_pricing_quantity_range ON pricing_rules IS
    'Ensures maximum quantity is greater than or equal to minimum quantity. NULL max_quantity means unlimited.';
```

### 6. Use EXCLUDE for Complex Overlap Prevention

```sql
-- Use EXCLUDE instead of complex triggers for overlap detection
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE employee_assignments (
    assignment_id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL,
    project_id INTEGER NOT NULL,
    assignment_period DATERANGE NOT NULL,
    -- Prevent same employee being assigned to multiple projects at same time
    EXCLUDE USING GIST (employee_id WITH =, assignment_period WITH &&)
);
```

## Practice Exercises

### Exercise 1: University Database

Design a university database with proper constraints:

1. Create a `departments` table with dept_id (PK), dept_name (unique, not null)
2. Create a `professors` table with prof_id (PK), prof_name, dept_id (FK to departments), hire_date, salary (must be > 0)
3. Create a `courses` table with course_id (PK), course_name, dept_id (FK), credits (between 1 and 6), max_students (> 0)
4. Create a `students` table with student_id (PK), student_name, email (unique, not null), enrollment_date
5. Create an `enrollments` table with student_id (FK), course_id (FK), enrollment_date, grade (A, B, C, D, F, or NULL), composite PK on (student_id, course_id)
6. Add appropriate ON DELETE and ON UPDATE actions
7. Add CHECK constraints to ensure grades are valid
8. Name all constraints following naming conventions

```sql
-- Your solution here
```

### Exercise 2: E-commerce Constraints

Build constraint-rich e-commerce tables:

1. Create a `customers` table with customer_id (PK), email (unique, not null), status ('active', 'suspended', 'deleted')
2. Create an `orders` table with order_id (PK), customer_id (FK with RESTRICT), order_date, status ('pending', 'paid', 'shipped', 'completed', 'cancelled'), total_amount (>= 0)
3. Create an `order_items` table with order_id (FK with CASCADE), product_id, quantity (> 0), unit_price (> 0), composite PK
4. Add a CHECK constraint ensuring shipped orders have total_amount > 0
5. Add a self-referencing FK in customers for referred_by_customer_id
6. Modify the constraints to make customer deletion soft (set status to 'deleted' instead of deleting rows)

```sql
-- Your solution here
```

### Exercise 3: Resource Scheduling with EXCLUDE

Create a resource scheduling system:

1. Install btree_gist extension
2. Create a `conference_rooms` table with room_id (PK), room_name, capacity
3. Create a `room_reservations` table with:
   - reservation_id (PK)
   - room_id (FK)
   - reserved_by (varchar)
   - reservation_period (TSRANGE)
   - EXCLUDE constraint preventing overlapping reservations for the same room
4. Create an `equipment` table with equipment_id (PK), equipment_name
5. Create an `equipment_bookings` table with similar structure and EXCLUDE constraint
6. Test by inserting overlapping and non-overlapping reservations
7. Add a CHECK constraint ensuring reservation_period has lower and upper bounds

```sql
-- Your solution here
```

---

**Cross-references:**
- For table creation syntax, see [CREATE, ALTER, DROP](./01-create-alter-drop.md)
- For default values and generated columns, see [Default and Generated Values](./03-default-generated.md)
- For indexes that support constraints, see Module 06
- For constraint validation in transactions, see Module 08
- For partitioning constraints, see Module 11
