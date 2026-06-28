# Table Inheritance

## Theory

Table inheritance is a PostgreSQL-specific feature that allows tables to inherit columns and constraints from parent tables. This creates a hierarchy of tables where child tables automatically include all columns from their parent tables, plus any additional columns they define.

While table inheritance may seem similar to object-oriented inheritance, it's important to understand it's primarily a schema organization tool rather than a full OOP implementation. Inheritance in PostgreSQL:

- Automatically propagates column definitions from parent to child tables
- Allows queries on parent tables to include data from child tables (by default)
- Provides the ONLY keyword to query just the parent table
- Does not inherit indexes, unique constraints, or primary keys (a significant limitation)
- Does not automatically create foreign key relationships

**Important Note**: Table inheritance is considered a legacy feature. For most use cases, especially partitioning, PostgreSQL's modern **declarative partitioning** (introduced in PostgreSQL 10) is strongly recommended. Declarative partitioning provides better performance, automatic constraint management, and more robust query optimization.

Key concepts:
- **Parent table**: The base table that defines common columns
- **Child table**: Inherits parent columns using INHERITS clause
- **ONLY keyword**: Queries just the specified table, excluding children
- **CHECK constraints**: Can be inherited but may cause issues
- **Indexes and primary keys**: Not inherited (must be recreated on each child)

## Syntax

### Creating Inheritance Hierarchy

```sql
-- Create parent table
CREATE TABLE parent_table (
    column1 data_type,
    column2 data_type
);

-- Create child table inheriting from parent
CREATE TABLE child_table (
    additional_column data_type
) INHERITS (parent_table);

-- Multiple inheritance (rarely used)
CREATE TABLE child_table () INHERITS (parent1, parent2);
```

### Querying with Inheritance

```sql
-- Query parent and all children (default behavior)
SELECT * FROM parent_table;

-- Query only the parent table, exclude children
SELECT * FROM ONLY parent_table;
```

### Removing Inheritance

```sql
-- Remove inheritance relationship
ALTER TABLE child_table NO INHERIT parent_table;

-- Add inheritance to existing table
ALTER TABLE child_table INHERIT parent_table;
```

## Examples

### Basic Inheritance

```sql
-- Create parent table for all employees
CREATE TABLE employees (
    employee_id SERIAL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100),
    hire_date DATE DEFAULT CURRENT_DATE,
    salary NUMERIC(10, 2)
);

-- Create child table for managers (inherits all employee columns)
CREATE TABLE managers (
    department VARCHAR(100),
    management_level INTEGER
) INHERITS (employees);

-- Create child table for salespeople
CREATE TABLE salespeople (
    territory VARCHAR(100),
    commission_rate NUMERIC(5, 2)
) INHERITS (employees);

-- View table structures
\d employees
\d managers
\d salespeople

-- Insert data into parent table
INSERT INTO employees (first_name, last_name, email, salary)
VALUES ('John', 'Doe', 'john.doe@company.com', 50000);

-- Insert data into child tables
INSERT INTO managers (first_name, last_name, email, salary, department, management_level)
VALUES ('Alice', 'Smith', 'alice.smith@company.com', 80000, 'Engineering', 2);

INSERT INTO salespeople (first_name, last_name, email, salary, territory, commission_rate)
VALUES ('Bob', 'Johnson', 'bob.j@company.com', 60000, 'Northeast', 5.5);

-- Query all employees (includes children)
SELECT employee_id, first_name, last_name, salary FROM employees;

-- Query only employees table (excludes children)
SELECT employee_id, first_name, last_name, salary FROM ONLY employees;

-- Query specific child table
SELECT first_name, last_name, department FROM managers;
```

### Identifying Table Source

```sql
-- Add tableoid to see which table the row comes from
SELECT
    tableoid::regclass AS table_name,
    first_name,
    last_name,
    salary
FROM employees;

-- Filter by specific table
SELECT first_name, last_name
FROM employees
WHERE tableoid = 'managers'::regclass;
```

### Inheritance with CHECK Constraints

```sql
-- Parent table with CHECK constraint
CREATE TABLE products (
    product_id SERIAL,
    product_name VARCHAR(200) NOT NULL,
    price NUMERIC(10, 2) CHECK (price > 0),
    category VARCHAR(50)
);

-- Child table inherits CHECK constraint
CREATE TABLE electronics (
    warranty_months INTEGER,
    power_consumption_watts INTEGER
) INHERITS (products);

-- Insert valid data
INSERT INTO electronics (product_name, price, category, warranty_months)
VALUES ('Laptop', 999.99, 'Computers', 12);

-- This fails - violates inherited CHECK constraint
-- INSERT INTO electronics (product_name, price, category, warranty_months)
-- VALUES ('Tablet', -100, 'Computers', 6);

-- View constraints
\d+ electronics
```

### Limitations: No Inherited Indexes

```sql
-- Create parent with index
CREATE TABLE documents (
    doc_id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    created_at TIMESTAMP DEFAULT now(),
    content TEXT
);

-- Create index on parent
CREATE INDEX idx_documents_created ON documents(created_at);

-- Child table
CREATE TABLE contracts (
    contract_number VARCHAR(50),
    expiration_date DATE
) INHERITS (documents);

-- Insert data into child
INSERT INTO contracts (title, content, contract_number, expiration_date)
VALUES ('Service Agreement', 'Contract text...', 'CNT-001', '2025-12-31');

-- Indexes NOT inherited - need to create separately
-- \d contracts shows no index on created_at

-- Must create index on child table manually
CREATE INDEX idx_contracts_created ON contracts(created_at);
```

### Limitations: No Inherited Primary Keys

```sql
-- Parent with primary key
CREATE TABLE base_records (
    record_id SERIAL PRIMARY KEY,
    record_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT now()
);

-- Child does NOT inherit primary key
CREATE TABLE specific_records (
    record_type VARCHAR(50)
) INHERITS (base_records);

-- Must add primary key to child separately
ALTER TABLE specific_records ADD PRIMARY KEY (record_id);

-- Insert test data
INSERT INTO specific_records (record_name, record_type)
VALUES ('Record A', 'TypeX');

-- Check constraints
\d base_records
\d specific_records
```

### Limitations: Foreign Key Complications

```sql
-- Create reference table
CREATE TABLE departments (
    dept_id SERIAL PRIMARY KEY,
    dept_name VARCHAR(100)
);

-- Parent table
CREATE TABLE workers (
    worker_id SERIAL PRIMARY KEY,
    worker_name VARCHAR(100),
    dept_id INTEGER REFERENCES departments(dept_id)
);

-- Child table inherits structure but NOT the FK constraint
CREATE TABLE contractors (
    contract_end_date DATE
) INHERITS (workers);

-- The foreign key on workers does NOT apply to contractors table
-- Must add FK to contractors separately
ALTER TABLE contractors
ADD CONSTRAINT fk_contractors_dept
FOREIGN KEY (dept_id) REFERENCES departments(dept_id);

-- Also note: Cannot create FK that references parent table including children
-- This limitation makes inheritance problematic for relational integrity
```

### UPDATE and DELETE with Inheritance

```sql
-- Create simple hierarchy
CREATE TABLE animals (
    animal_id SERIAL,
    name VARCHAR(100),
    age INTEGER
);

CREATE TABLE dogs (
    breed VARCHAR(50)
) INHERITS (animals);

CREATE TABLE cats (
    indoor_only BOOLEAN
) INHERITS (animals);

-- Insert data
INSERT INTO dogs (name, age, breed) VALUES ('Buddy', 5, 'Golden Retriever');
INSERT INTO dogs (name, age, breed) VALUES ('Max', 3, 'Beagle');
INSERT INTO cats (name, age, indoor_only) VALUES ('Whiskers', 7, true);

-- Update affects children by default
UPDATE animals SET age = age + 1;

SELECT tableoid::regclass, name, age FROM animals;

-- Update ONLY parent (no children affected)
UPDATE ONLY animals SET age = 0 WHERE name = 'NonExistent';

-- Delete affects children by default
DELETE FROM animals WHERE age > 6;

SELECT tableoid::regclass, name, age FROM animals;

-- Delete ONLY from parent
DELETE FROM ONLY animals WHERE animal_id = 1;
```

### Adding and Removing Inheritance

```sql
-- Create independent tables
CREATE TABLE vehicles (
    vehicle_id SERIAL PRIMARY KEY,
    make VARCHAR(50),
    model VARCHAR(50),
    year INTEGER
);

CREATE TABLE trucks (
    truck_id SERIAL PRIMARY KEY,
    payload_capacity INTEGER,
    make VARCHAR(50),
    model VARCHAR(50),
    year INTEGER
);

-- Add inheritance relationship
ALTER TABLE trucks INHERIT vehicles;

-- Insert data
INSERT INTO trucks (make, model, year, payload_capacity)
VALUES ('Ford', 'F-150', 2024, 3000);

-- Query parent includes child
SELECT * FROM vehicles;

-- Remove inheritance
ALTER TABLE trucks NO INHERIT vehicles;

-- Now query parent excludes child
SELECT * FROM vehicles;
```

### Multi-level Inheritance Hierarchy

```sql
-- Three-level hierarchy
CREATE TABLE living_things (
    scientific_name VARCHAR(200),
    discovered_date DATE
);

CREATE TABLE animals_living (
    diet VARCHAR(50)
) INHERITS (living_things);

CREATE TABLE mammals (
    gestation_days INTEGER
) INHERITS (animals_living);

-- Insert at different levels
INSERT INTO living_things (scientific_name, discovered_date)
VALUES ('Plantus Genericius', '1800-01-01');

INSERT INTO animals_living (scientific_name, discovered_date, diet)
VALUES ('Reptilus Genericius', '1850-06-15', 'carnivore');

INSERT INTO mammals (scientific_name, discovered_date, diet, gestation_days)
VALUES ('Canis lupus', '1758-01-01', 'carnivore', 63);

-- Query at top level sees all descendants
SELECT scientific_name, diet, gestation_days FROM living_things;

-- Query at middle level sees itself and descendants
SELECT scientific_name, diet, gestation_days FROM animals_living;

-- Query with ONLY at each level
SELECT 'living_things' as level, COUNT(*) FROM ONLY living_things
UNION ALL
SELECT 'animals_living', COUNT(*) FROM ONLY animals_living
UNION ALL
SELECT 'mammals', COUNT(*) FROM ONLY mammals;
```

### Inheritance vs Declarative Partitioning Comparison

```sql
-- OLD WAY: Table Inheritance (not recommended for partitioning)
CREATE TABLE measurements_inherited (
    measurement_id SERIAL,
    measured_at TIMESTAMP NOT NULL,
    sensor_id INTEGER,
    value NUMERIC(10, 2),
    CHECK (measured_at >= DATE '2024-01-01' AND measured_at < DATE '2024-02-01')
);

CREATE TABLE measurements_2024_02 (
    CHECK (measured_at >= DATE '2024-02-01' AND measured_at < DATE '2024-03-01')
) INHERITS (measurements_inherited);

-- Issues with inheritance:
-- 1. Must manually maintain CHECK constraints
-- 2. No automatic constraint exclusion optimization
-- 3. Indexes not inherited
-- 4. Can accidentally insert wrong data into wrong partition

-- NEW WAY: Declarative Partitioning (recommended)
CREATE TABLE measurements_partitioned (
    measurement_id SERIAL,
    measured_at TIMESTAMP NOT NULL,
    sensor_id INTEGER,
    value NUMERIC(10, 2)
) PARTITION BY RANGE (measured_at);

CREATE TABLE measurements_partitioned_2024_01
PARTITION OF measurements_partitioned
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE measurements_partitioned_2024_02
PARTITION OF measurements_partitioned
FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Benefits:
-- 1. Automatic constraint management
-- 2. Better query optimization
-- 3. Indexes automatically created
-- 4. Cannot insert into wrong partition

-- See Module 11 for full declarative partitioning coverage
```

## Common Mistakes

### 1. Expecting Indexes to be Inherited

```sql
-- WRONG: Thinking child inherits parent's indexes
CREATE TABLE parent_with_index (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100)
);

CREATE INDEX idx_parent_name ON parent_with_index(name);

CREATE TABLE child_no_index () INHERITS (parent_with_index);

-- Queries on child will be slow - no index!
-- CORRECT: Create index on child too
CREATE INDEX idx_child_name ON child_no_index(name);
```

### 2. Expecting Primary Keys to Work Across Hierarchy

```sql
-- WRONG: Thinking PK prevents duplicates across hierarchy
CREATE TABLE items (
    item_id SERIAL PRIMARY KEY,
    item_name VARCHAR(100)
);

CREATE TABLE special_items () INHERITS (items);

INSERT INTO items (item_id, item_name) VALUES (1, 'Item A');
INSERT INTO special_items (item_id, item_name) VALUES (1, 'Item B'); -- Allowed! Duplicate PK!

-- CORRECT: If you need unique IDs across hierarchy, use sequences carefully
-- or better yet, use declarative partitioning instead
```

### 3. Not Using ONLY When Required

```sql
CREATE TABLE all_products (product_name VARCHAR(100), price NUMERIC(10,2));
CREATE TABLE discounted () INHERITS (all_products);

INSERT INTO all_products VALUES ('A', 100);
INSERT INTO discounted VALUES ('B', 50);

-- WRONG: Forgot ONLY, updates both parent and child
UPDATE all_products SET price = price * 1.1;

-- CORRECT: Use ONLY to update just parent
UPDATE ONLY all_products SET price = price * 1.1;
```

### 4. Using Inheritance for Partitioning (Outdated)

```sql
-- WRONG: Using inheritance for partitioning (old method, error-prone)
CREATE TABLE logs (log_date DATE, message TEXT);
CREATE TABLE logs_2024_01 (CHECK (log_date >= '2024-01-01' AND log_date < '2024-02-01')) INHERITS (logs);

-- CORRECT: Use declarative partitioning
CREATE TABLE logs_partitioned (log_date DATE, message TEXT) PARTITION BY RANGE (log_date);
CREATE TABLE logs_partitioned_2024_01 PARTITION OF logs_partitioned
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

### 5. Foreign Keys Referencing Parent Tables

```sql
-- WRONG: Foreign keys don't work well with inheritance
CREATE TABLE categories (cat_id SERIAL PRIMARY KEY, cat_name VARCHAR(100));
CREATE TABLE all_items (item_id SERIAL PRIMARY KEY, cat_id INTEGER REFERENCES categories);
CREATE TABLE special_items () INHERITS (all_items);

-- Foreign key on all_items doesn't prevent invalid cat_id in special_items table
-- This is a major limitation of inheritance
```

## Best Practices

### 1. Prefer Declarative Partitioning Over Inheritance

```sql
-- Instead of inheritance for time-series data, use partitioning
CREATE TABLE sensor_data (
    sensor_id INTEGER,
    reading_time TIMESTAMP,
    value NUMERIC(10, 2)
) PARTITION BY RANGE (reading_time);

-- See Module 11 for complete partitioning guide
```

### 2. If Using Inheritance, Document Limitations

```sql
CREATE TABLE base_entities (
    entity_id SERIAL,
    entity_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT now()
);

COMMENT ON TABLE base_entities IS
'Base table for entity inheritance. WARNING: Indexes, primary keys, and foreign keys are NOT inherited.
Each child table must define these constraints separately.';

CREATE TABLE derived_entities (
    entity_type VARCHAR(50)
) INHERITS (base_entities);

-- Explicitly add constraints to child
ALTER TABLE derived_entities ADD PRIMARY KEY (entity_id);
```

### 3. Always Create Indexes on Child Tables

```sql
CREATE TABLE parent_events (
    event_id SERIAL PRIMARY KEY,
    event_time TIMESTAMP,
    event_type VARCHAR(50)
);

CREATE INDEX idx_parent_events_time ON parent_events(event_time);

CREATE TABLE child_events (
    additional_data JSONB
) INHERITS (parent_events);

-- Best practice: Immediately create matching indexes
ALTER TABLE child_events ADD PRIMARY KEY (event_id);
CREATE INDEX idx_child_events_time ON child_events(event_time);
```

### 4. Use ONLY Explicitly When Appropriate

```sql
-- Be explicit about whether you want child data
CREATE TABLE accounts (account_id SERIAL, balance NUMERIC(10,2));
CREATE TABLE savings_accounts () INHERITS (accounts);
CREATE TABLE checking_accounts () INHERITS (accounts);

-- Explicit: Get all account types
SELECT SUM(balance) FROM accounts;

-- Explicit: Get only parent table data
SELECT SUM(balance) FROM ONLY accounts;
```

### 5. Consider Alternatives to Inheritance

```sql
-- Instead of inheritance, consider:

-- Option 1: Single table with type discriminator
CREATE TABLE all_employees (
    employee_id SERIAL PRIMARY KEY,
    employee_type VARCHAR(20) NOT NULL, -- 'manager', 'salesperson', 'staff'
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    -- Manager fields (nullable)
    department VARCHAR(100),
    management_level INTEGER,
    -- Salesperson fields (nullable)
    territory VARCHAR(100),
    commission_rate NUMERIC(5, 2),
    CHECK (
        (employee_type = 'manager' AND department IS NOT NULL) OR
        (employee_type = 'salesperson' AND territory IS NOT NULL) OR
        (employee_type = 'staff')
    )
);

-- Option 2: Separate tables with foreign keys (more normalized)
CREATE TABLE employees_normalized (
    employee_id SERIAL PRIMARY KEY,
    first_name VARCHAR(50),
    last_name VARCHAR(50)
);

CREATE TABLE manager_details (
    employee_id INTEGER PRIMARY KEY REFERENCES employees_normalized,
    department VARCHAR(100),
    management_level INTEGER
);

CREATE TABLE salesperson_details (
    employee_id INTEGER PRIMARY KEY REFERENCES employees_normalized,
    territory VARCHAR(100),
    commission_rate NUMERIC(5, 2)
);
```

## Practice Exercises

### Exercise 1: Basic Inheritance Hierarchy

Create a simple vehicle hierarchy using inheritance:

1. Create a `vehicles` parent table with: vehicle_id, make, model, year, color
2. Create `cars` child table inheriting from vehicles, add: num_doors, trunk_capacity
3. Create `motorcycles` child table inheriting from vehicles, add: engine_cc, has_sidecar
4. Insert 2 records into vehicles, 2 into cars, 2 into motorcycles
5. Query all vehicles (including children)
6. Query ONLY vehicles (excluding children)
7. Write a query that shows which table each row comes from using tableoid
8. Create appropriate indexes on the child tables
9. Demonstrate the limitation of primary keys not being inherited

```sql
-- Your solution here
```

### Exercise 2: Inheritance Limitations

Explore and document inheritance limitations:

1. Create a `customers` table with customer_id (PRIMARY KEY), customer_name, email (UNIQUE)
2. Create a `vip_customers` child table with additional columns: loyalty_points, tier_level
3. Try to insert duplicate customer_id values in parent and child - document what happens
4. Create an index on email in parent, check if child has it
5. Try to create a foreign key in another table that references customers (including children) - document challenges
6. Write queries demonstrating UPDATE and DELETE behavior with and without ONLY
7. Remove and re-add the inheritance relationship using ALTER TABLE

```sql
-- Your solution here
```

### Exercise 3: Migration from Inheritance to Partitioning

Understand why declarative partitioning is better:

1. Create an old-style inheritance-based partitioning setup:
   - Parent table `orders_old` with order_id, order_date, amount
   - Child tables for Q1, Q2, Q3 2024 using CHECK constraints
   - Manually create indexes on each child table
2. Create equivalent declarative partitioning setup:
   - Partitioned table `orders_new`
   - Partitions for Q1, Q2, Q3 2024
3. Insert the same sample data into both
4. Compare the ease of querying, maintaining constraints, and managing indexes
5. Write a summary comment explaining why declarative partitioning is superior
6. Note: See Module 11 for complete partitioning coverage

```sql
-- Your solution here
```

---

**Cross-references:**
- For table creation, see [CREATE, ALTER, DROP](./01-create-alter-drop.md)
- For constraints on inherited tables, see [Constraints](./02-constraints.md)
- For modern declarative partitioning (recommended over inheritance), see Module 11
- For indexes that need to be created on child tables, see Module 06
- For performance implications, see Module 10
