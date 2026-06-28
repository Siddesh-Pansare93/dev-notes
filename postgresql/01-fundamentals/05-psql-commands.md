# psql Commands and Meta-Commands

## Overview

This module covers the psql command-line interface, including connection methods, essential meta-commands (backslash commands), running SQL scripts, output formatting, and configuration through .psqlrc.

---

## Theory

### What is psql?

**psql** is PostgreSQL's interactive terminal-based front-end. It allows you to:

- Type SQL queries and see results
- Execute meta-commands (backslash commands)
- Run SQL scripts from files
- Export and import data
- Format query output
- Automate tasks through scripting

**Key Features:**
- **Tab Completion**: Auto-complete table names, column names, SQL keywords
- **Command History**: Recall previous commands with arrow keys
- **Scripting**: Run batch SQL files
- **Variables**: Define and use psql variables
- **Conditional Logic**: Use \if, \elif, \else for scripting
- **Output Formats**: HTML, CSV, aligned, unaligned, etc.

### psql vs GUI Tools

| Feature | psql | pgAdmin / GUI Tools |
|---------|------|---------------------|
| **Speed** | Very fast (keyboard-driven) | Slower (mouse-driven) |
| **Scriptability** | Excellent | Limited |
| **Learning Curve** | Steeper | Gentler |
| **Remote Access** | SSH-friendly | Requires GUI/VNC |
| **Automation** | Easy (shell scripts) | Difficult |
| **Visual Design** | No | Yes (ER diagrams, etc.) |
| **Best For** | Power users, automation, production | Beginners, visual exploration |

### Meta-Commands (Backslash Commands)

psql meta-commands start with a backslash (`\`) and provide shortcuts for common tasks:

**Categories:**
- **Information Commands**: `\l`, `\dt`, `\d`, `\du` (list objects)
- **Execution Commands**: `\i`, `\ir`, `\o` (run scripts, redirect output)
- **Display Commands**: `\x`, `\a`, `\t` (format output)
- **Connection Commands**: `\c`, `\conninfo` (manage connections)
- **Editor Commands**: `\e`, `\ef` (edit queries, functions)
- **Copy Commands**: `\copy` (import/export data)
- **Help Commands**: `\?`, `\h` (get help)

### .psqlrc Configuration File

The `.psqlrc` file allows you to customize psql startup behavior:

**Location:**
- **Linux/macOS**: `~/.psqlrc`
- **Windows**: `%APPDATA%\postgresql\.psqlrc`

**Common Uses:**
- Set default formatting options
- Define custom prompts
- Create aliases (using `\set`)
- Auto-execute SQL on startup
- Configure history settings

---

## Syntax

### Connecting to PostgreSQL

```bash
psql [OPTION]... [DBNAME [USERNAME]]

# Basic connection
psql                              # Connect to default database as current user
psql -U username                  # Specify username
psql -d dbname                    # Specify database
psql -h hostname                  # Specify host
psql -p 5432                      # Specify port

# Full connection
psql -h localhost -p 5432 -U postgres -d myapp

# Connection string (URI)
psql postgresql://username:password@hostname:port/database
psql "postgresql://postgres@localhost/myapp?sslmode=require"
```

### Meta-Command Syntax

```sql
-- Information commands
\l[+]              -- List databases (+ for more details)
\dt[+] [PATTERN]   -- List tables
\d[+] TABLE        -- Describe table
\dn[+]             -- List schemas
\du[+]             -- List roles
\df[+]             -- List functions
\dv[+]             -- List views

-- Execution commands
\i FILENAME        -- Execute SQL from file
\ir FILENAME       -- Execute SQL from file (relative to current script)
\o [FILENAME]      -- Redirect output to file
\! COMMAND         -- Execute shell command

-- Display commands
\x [on|off|auto]   -- Toggle expanded display
\a                 -- Toggle aligned/unaligned mode
\t [on|off]        -- Toggle tuples only (no headers)
\pset OPTION VALUE -- Set output options

-- Connection commands
\c[onnect] [DBNAME [USERNAME] [HOST] [PORT]]
\conninfo          -- Display current connection info

-- Editor commands
\e [FILENAME]      -- Edit query in external editor
\ef [FUNCTION]     -- Edit function definition

-- Copy commands
\copy TABLE FROM 'file.csv' CSV HEADER
\copy (SELECT ...) TO 'file.csv' CSV HEADER

-- Help commands
\?                 -- Help on meta-commands
\h [COMMAND]       -- Help on SQL command
```

---

## Examples

### Example 1: Basic psql Navigation

```bash
# Connect to PostgreSQL
psql -U postgres

# Or connect to specific database
psql -U postgres -d myapp
```

```sql
-- Check current connection
\conninfo
-- Output: You are connected to database "myapp" as user "postgres" via socket in "/var/run/postgresql" at port "5432".

-- List all databases
\l

-- Switch to different database
\c postgres
-- Output: You are now connected to database "postgres" as user "postgres".

-- List all schemas
\dn

-- List all tables in current database
\dt

-- List tables with more details
\dt+

-- List tables matching a pattern
\dt user*

-- List tables in specific schema
\dt public.*

-- Describe a specific table
\d users

-- Describe table with more details (indexes, constraints, etc.)
\d+ users

-- List all views
\dv

-- List all functions
\df

-- List all roles/users
\du

-- Get help on meta-commands
\?

-- Get help on SQL command
\h CREATE TABLE
\h SELECT

-- Quit psql
\q
```

**Sample Output:**
```
myapp=# \dt
             List of relations
 Schema |    Name     | Type  |  Owner
--------+-------------+-------+----------
 public | users       | table | postgres
 public | posts       | table | postgres
 public | comments    | table | postgres
(3 rows)

myapp=# \d users
                                       Table "public.users"
   Column   |            Type             | Collation | Nullable |              Default
------------+-----------------------------+-----------+----------+------------------------------------
 id         | integer                     |           | not null | nextval('users_id_seq'::regclass)
 username   | character varying(50)       |           | not null |
 email      | character varying(100)      |           | not null |
 created_at | timestamp without time zone |           |          | CURRENT_TIMESTAMP
Indexes:
    "users_pkey" PRIMARY KEY, btree (id)
    "users_email_key" UNIQUE CONSTRAINT, btree (email)
    "users_username_key" UNIQUE CONSTRAINT, btree (username)
Referenced by:
    TABLE "posts" CONSTRAINT "posts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id)
```

### Example 2: Running SQL Scripts

Create a file `create_schema.sql`:

```sql
-- create_schema.sql
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    price NUMERIC(10, 2) NOT NULL,
    stock INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO categories (name, description) VALUES
    ('Electronics', 'Electronic devices and accessories'),
    ('Books', 'Physical and digital books'),
    ('Clothing', 'Apparel and accessories');

INSERT INTO products (name, category_id, price, stock) VALUES
    ('Laptop', 1, 999.99, 50),
    ('USB Cable', 1, 9.99, 200),
    ('PostgreSQL Guide', 2, 49.99, 100),
    ('T-Shirt', 3, 19.99, 150);

-- Show results
SELECT c.name AS category, COUNT(p.id) AS product_count
FROM categories c
LEFT JOIN products p ON c.id = p.category_id
GROUP BY c.name
ORDER BY c.name;
```

Execute the script:

```bash
# Method 1: From command line
psql -U postgres -d myapp -f create_schema.sql

# Method 2: From within psql
psql -U postgres -d myapp
```

```sql
\i /path/to/create_schema.sql

-- Or use relative path (relative to current script location)
\ir create_schema.sql

-- Verify execution
\dt
SELECT * FROM categories;
SELECT * FROM products;
```

### Example 3: Output Formatting and Redirection

```sql
-- Connect to database
\c myapp

-- Create sample data
CREATE TABLE IF NOT EXISTS sales (
    id SERIAL PRIMARY KEY,
    product_name VARCHAR(100),
    quantity INTEGER,
    price NUMERIC(10, 2),
    sale_date DATE
);

INSERT INTO sales (product_name, quantity, price, sale_date) VALUES
    ('Laptop', 5, 999.99, '2024-01-15'),
    ('Mouse', 20, 19.99, '2024-01-16'),
    ('Keyboard', 15, 49.99, '2024-01-17'),
    ('Monitor', 8, 299.99, '2024-01-18');

-- Default aligned output
SELECT * FROM sales;

-- Toggle expanded display (vertical format)
\x
SELECT * FROM sales WHERE id = 1;

-- Sample expanded output:
-- -[ RECORD 1 ]--+----------
-- id             | 1
-- product_name   | Laptop
-- quantity       | 5
-- price          | 999.99
-- sale_date      | 2024-01-15

-- Turn off expanded display
\x off

-- Toggle between aligned and unaligned
\a
SELECT * FROM sales;
\a  -- Back to aligned

-- Show only tuples (no headers or row count)
\t
SELECT product_name FROM sales;
\t  -- Back to normal

-- Set specific output format
\pset format aligned     -- Default table format
\pset format unaligned   -- Pipe-separated
\pset format csv         -- CSV format
\pset format html        -- HTML table
\pset format latex       -- LaTeX table

-- Set CSV format with specific delimiter
\pset format csv
\pset fieldsep ','
SELECT * FROM sales;

-- Redirect output to file
\o /tmp/sales_report.csv
\pset format csv
SELECT * FROM sales;
\o  -- Stop redirecting (back to stdout)

-- Redirect to file with headers
\o /tmp/sales_with_headers.csv
\pset format csv
\pset tuples_only off
SELECT product_name, quantity, price FROM sales;
\o

-- Set border style
\pset border 0   -- No border
\pset border 1   -- Internal borders only
\pset border 2   -- Full borders (default)

-- Set null display
\pset null '(null)'
SELECT product_name, quantity, NULL AS discount FROM sales LIMIT 1;

-- Set footer (row count)
\pset footer off
SELECT * FROM sales;
\pset footer on

-- Set title
\pset title 'Sales Report - January 2024'
SELECT * FROM sales;
```

### Example 4: Using \copy for Data Import/Export

```sql
-- Create test table
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email VARCHAR(100),
    salary NUMERIC(10, 2),
    hire_date DATE
);

-- Export data to CSV
\copy employees TO '/tmp/employees.csv' CSV HEADER

-- Export with specific columns
\copy employees (first_name, last_name, email) TO '/tmp/employee_contacts.csv' CSV HEADER

-- Export query results
\copy (SELECT first_name, last_name, salary FROM employees WHERE salary > 50000) TO '/tmp/high_earners.csv' CSV HEADER

-- Import from CSV
\copy employees FROM '/tmp/employees.csv' CSV HEADER

-- Import with specific delimiter
\copy employees FROM '/tmp/employees.tsv' DELIMITER E'\t' CSV HEADER

-- Import specific columns
\copy employees (first_name, last_name, email) FROM '/tmp/new_employees.csv' CSV HEADER

-- Import with NULL handling
\copy employees FROM '/tmp/employees.csv' CSV HEADER NULL 'NULL'
```

**Create sample CSV file** (`employees.csv`):
```csv
first_name,last_name,email,salary,hire_date
John,Doe,john@example.com,75000.00,2023-01-15
Jane,Smith,jane@example.com,82000.00,2023-02-20
Bob,Johnson,bob@example.com,68000.00,2023-03-10
```

```sql
-- Import the CSV
\copy employees (first_name, last_name, email, salary, hire_date) FROM '/path/to/employees.csv' CSV HEADER

-- Verify import
SELECT * FROM employees;
```

### Example 5: Using the Editor (\e and \ef)

```sql
-- Edit last query in external editor
SELECT * FROM users WHERE created_at > '2024-01-01';
\e
-- Opens last query in $EDITOR (vim, nano, etc.)
-- Edit and save to execute

-- Edit query buffer and save to file
\e /tmp/my_query.sql
-- Opens editor with empty buffer or file content
-- Save to execute immediately

-- Edit a function
CREATE OR REPLACE FUNCTION calculate_total(p_quantity INTEGER, p_price NUMERIC)
RETURNS NUMERIC AS $$
BEGIN
    RETURN p_quantity * p_price;
END;
$$ LANGUAGE plpgsql;

-- Edit the function
\ef calculate_total
-- Opens function definition in editor
-- Make changes, save to replace function

-- Create a new function in editor
\ef new_function_name
-- Opens template for new function
```

### Example 6: Timing Queries

```sql
-- Enable query timing
\timing

-- Run queries and see execution time
SELECT COUNT(*) FROM users;
-- Output:
-- count
-- -------
--  10000
-- (1 row)
--
-- Time: 45.123 ms

CREATE INDEX idx_users_email ON users(email);
-- Time: 234.567 ms

SELECT * FROM users WHERE email = 'alice@example.com';
-- Time: 2.345 ms (fast with index)

-- Disable timing
\timing off
```

### Example 7: Using psql Variables

```sql
-- Set a variable
\set myvar 'Hello, PostgreSQL!'

-- Use the variable
SELECT :'myvar' AS message;

-- Set numeric variable
\set limit 10

-- Use in query (unquoted for numbers)
SELECT * FROM users LIMIT :limit;

-- Set variable from query result
SELECT COUNT(*) AS total FROM users \gset

-- Now use the variable
\echo :total

-- Conditional variables
\set ON_ERROR_STOP on   -- Stop on first error (useful in scripts)
\set ON_ERROR_ROLLBACK on  -- Auto rollback on error

-- Built-in variables
\set
-- Shows all psql variables

-- Useful built-in variables:
-- :DBNAME, :USER, :HOST, :PORT, :VERSION

\echo 'Connected to' :DBNAME 'as' :USER

-- Use variables in scripting
\set table_name users
\set condition 'created_at > ''2024-01-01'''

SELECT * FROM :table_name WHERE :condition;
```

### Example 8: Advanced psql Features

```sql
-- Watch a query (refresh every 2 seconds)
\watch 2
SELECT COUNT(*), NOW() FROM users;
-- Press Ctrl+C to stop

-- Execute shell command
\! ls -la /var/lib/postgresql
\! pwd

-- Change output encoding
\encoding UTF8

-- Set client encoding
SET client_encoding TO 'UTF8';

-- Transaction control
BEGIN;
\set ON_ERROR_ROLLBACK on
UPDATE users SET name = 'Test' WHERE id = 1;
-- If error occurs, only this statement is rolled back
UPDATE users SET invalid_column = 'Test' WHERE id = 2;  -- Error
-- Transaction still active, can continue or rollback
ROLLBACK;

-- Include file conditionally
\if :{?production}
    \i production_config.sql
\else
    \i development_config.sql
\endif

-- Set ECHO to see commands being executed
\set ECHO all
SELECT * FROM users LIMIT 5;
\set ECHO none

-- Use \gx for one-time expanded output
SELECT * FROM users WHERE id = 1 \gx

-- Execute query and save to variable
SELECT COUNT(*) FROM users \gset user_
\echo :user_count
```

---

## Common Mistakes

### Mistake 1: Forgetting Semicolon in SQL vs Meta-Commands

**Wrong:**
```sql
-- Forgetting semicolon for SQL
SELECT * FROM users
\dt  -- This becomes part of the SELECT, causing error
```

**Correct:**
```sql
-- SQL statements need semicolon
SELECT * FROM users;

-- Meta-commands do NOT need semicolon
\dt
\l
\d users
```

### Mistake 2: Using Wrong Path Separator on Windows

**Wrong:**
```sql
-- Windows path with single backslash (gets interpreted as escape)
\i C:\Users\myuser\query.sql
-- Error or unexpected behavior
```

**Correct:**
```sql
-- Option 1: Use forward slashes
\i C:/Users/myuser/query.sql

-- Option 2: Escape backslashes
\i C:\\Users\\myuser\\query.sql

-- Option 3: Use quotes for paths with spaces
\i 'C:/Users/my user/query.sql'
```

### Mistake 3: Confusing \copy with COPY

**Wrong:**
```sql
-- Using COPY from psql (requires superuser, server-side file access)
COPY users FROM '/tmp/users.csv' CSV HEADER;
-- Error: must be superuser or a member of pg_read_server_files
```

**Correct:**
```sql
-- Use \copy (client-side, no superuser needed)
\copy users FROM '/tmp/users.csv' CSV HEADER

-- COPY is for server-side files (superuser only)
-- \copy is for client-side files (any user)
```

### Mistake 4: Not Redirecting Output Back to Stdout

**Wrong:**
```sql
\o /tmp/output.txt
SELECT * FROM users;
-- Output goes to file

SELECT * FROM products;
-- Still going to file!

\q  -- Quit, output still redirected for next session
```

**Correct:**
```sql
\o /tmp/output.txt
SELECT * FROM users;

-- Redirect back to stdout
\o

-- Now output appears in terminal
SELECT * FROM products;
```

### Mistake 5: Forgetting to Turn Off Extended Display

**Wrong:**
```sql
\x
SELECT * FROM large_table;
-- Expanded display makes this unreadable for many rows

-- User forgets \x is on and keeps getting expanded output
```

**Correct:**
```sql
-- Use auto mode (expands only for wide results)
\x auto

-- Or toggle off when done
\x on
SELECT * FROM users WHERE id = 1;  -- Nice expanded view
\x off
SELECT * FROM users;  -- Back to table format
```

---

## Best Practices

### 1. Create a Useful .psqlrc

Create `~/.psqlrc` (Linux/macOS) or `%APPDATA%\postgresql\.psqlrc` (Windows):

```sql
-- .psqlrc - PostgreSQL client configuration

-- Better prompt showing database, user, and transaction status
\set PROMPT1 '%n@%/%R%x%# '
-- %n = username
-- %/ = database name
-- %R = transaction status (=, ^, !)
-- %x = transaction depth
-- %# = # for superuser, > otherwise

-- Even better prompt with colors (requires terminal support)
\set PROMPT1 '%[%033[1;32m%]%n@%/%[%033[0m%]%R%x%# '

-- Enable expanded display auto mode
\x auto

-- Set null display to something visible
\pset null '(null)'

-- Always show query timing
\timing on

-- Show more context in errors
\set VERBOSITY verbose

-- Enable error rollback
\set ON_ERROR_ROLLBACK interactive

-- Command history settings
\set HISTFILE ~/.psql_history- :DBNAME
\set HISTCONTROL ignoredups
\set HISTSIZE 10000

-- Set editor (if not already in environment)
\setenv EDITOR vim

-- Useful aliases using variables
\set version 'SELECT version();'
\set databases '\l+'
\set tables '\dt+'
\set schemas '\dn+'
\set connections 'SELECT datname, usename, application_name, client_addr, state FROM pg_stat_activity;'
\set locks 'SELECT relation::regclass, mode, granted FROM pg_locks WHERE NOT granted;'
\set slow_queries 'SELECT pid, now() - query_start AS duration, state, query FROM pg_stat_activity WHERE state != ''idle'' ORDER BY duration DESC;'

-- Table sizes
\set table_sizes 'SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||''.''||tablename)) AS size FROM pg_tables WHERE schemaname NOT IN (''pg_catalog'', ''information_schema'') ORDER BY pg_total_relation_size(schemaname||''.''||tablename) DESC;'

-- Welcome message
\echo 'Welcome to PostgreSQL!'
\echo 'Useful aliases: :version :databases :tables :connections :locks :slow_queries :table_sizes'
\echo 'Use \\? for help on psql commands, \\h for SQL help'
```

**Usage:**
```sql
-- After creating .psqlrc, restart psql
psql -U postgres

-- Use the aliases
:version
:databases
:connections
:table_sizes
```

### 2. Use ON_ERROR_STOP in Scripts

```sql
-- At the beginning of SQL scripts
\set ON_ERROR_STOP on

-- Now script stops on first error
BEGIN;
CREATE TABLE users (id SERIAL PRIMARY KEY);
INSERT INTO users (nonexistent_column) VALUES (1);  -- Error, script stops
-- The rest of the script is not executed
COMMIT;

-- This prevents cascading errors and data corruption
```

### 3. Organize Scripts with \ir

Create modular scripts:

**main.sql:**
```sql
\set ON_ERROR_STOP on

BEGIN;

\echo 'Creating schema...'
\ir schema/tables.sql

\echo 'Loading seed data...'
\ir data/seed.sql

\echo 'Creating indexes...'
\ir schema/indexes.sql

COMMIT;

\echo 'Setup complete!'
```

**schema/tables.sql:**
```sql
CREATE TABLE IF NOT EXISTS users (...);
CREATE TABLE IF NOT EXISTS posts (...);
```

**Run:**
```bash
psql -U postgres -d myapp -f main.sql
```

### 4. Use \watch for Monitoring

```sql
-- Monitor active connections (refresh every 5 seconds)
SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;
\watch 5

-- Monitor long-running queries
SELECT pid, now() - query_start AS duration, state, left(query, 50)
FROM pg_stat_activity
WHERE state != 'idle' AND query_start < now() - interval '1 minute'
ORDER BY duration DESC;
\watch 10

-- Press Ctrl+C to stop
```

### 5. Export Results Efficiently

```sql
-- Export to CSV with proper formatting
\pset format csv
\pset tuples_only on
\o /tmp/report.csv
SELECT * FROM sales WHERE sale_date >= CURRENT_DATE - 30;
\o
\pset tuples_only off
\pset format aligned

-- Or use \copy (simpler)
\copy (SELECT * FROM sales WHERE sale_date >= CURRENT_DATE - 30) TO '/tmp/report.csv' CSV HEADER
```

### 6. Use Tab Completion

```sql
-- Type partial name and press Tab
SELECT * FROM use<TAB>
-- Completes to: SELECT * FROM users

\d use<TAB>
-- Shows completions: users, user_sessions, etc.

SELECT id, user<TAB>
-- Shows column completions: username, user_email, etc.

-- Double-Tab to see all options
SELECT * FROM <TAB><TAB>
-- Shows all tables
```

---

## Practice Exercises

### Exercise 1: psql Navigation Mastery

**Task:** Practice navigating and exploring a database using psql meta-commands.

```bash
# Connect to PostgreSQL
psql -U postgres
```

```sql
-- 1. Create a test database
CREATE DATABASE psql_practice;
\c psql_practice

-- 2. Create multiple schemas
CREATE SCHEMA app;
CREATE SCHEMA reporting;
CREATE SCHEMA archive;

-- 3. Create tables in different schemas
CREATE TABLE app.customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE app.orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES app.customers(id),
    total NUMERIC(10, 2),
    order_date DATE DEFAULT CURRENT_DATE
);

CREATE VIEW reporting.customer_summary AS
SELECT c.id, c.name, COUNT(o.id) AS order_count, SUM(o.total) AS total_spent
FROM app.customers c
LEFT JOIN app.orders o ON c.id = o.customer_id
GROUP BY c.id, c.name;

-- 4. Practice meta-commands
\dn                           -- List schemas
\dt app.*                     -- List tables in app schema
\dv reporting.*               -- List views in reporting schema
\d app.customers              -- Describe customers table
\d+ app.orders                -- Describe orders with details
\dp app.customers             -- Show table permissions

-- 5. Connection info
\conninfo                     -- Current connection
\l                            -- List databases
\du                           -- List users

-- 6. Get help
\?                            -- psql command help
\h CREATE TABLE               -- SQL command help

-- 7. Use different schemas
SET search_path TO app;
\dt                           -- Shows app tables
SET search_path TO reporting;
\dt                           -- Shows reporting tables

-- Clean up
\c postgres
DROP DATABASE psql_practice;
```

**Challenge:**
- Find all foreign key relationships in a database using `\d+`
- List all indexes on a specific table
- Find the size of all tables using `\dt+`

### Exercise 2: Output Formatting and Export

**Task:** Create a sales report with various output formats.

```sql
-- Create sample data
CREATE TABLE sales (
    id SERIAL PRIMARY KEY,
    product VARCHAR(100),
    quantity INTEGER,
    unit_price NUMERIC(10, 2),
    sale_date DATE,
    region VARCHAR(50)
);

INSERT INTO sales (product, quantity, unit_price, sale_date, region)
SELECT
    'Product ' || (random() * 10)::int,
    (random() * 100)::int,
    (random() * 100)::numeric(10,2),
    CURRENT_DATE - (random() * 365)::int,
    CASE (random() * 3)::int
        WHEN 0 THEN 'North'
        WHEN 1 THEN 'South'
        ELSE 'West'
    END
FROM generate_series(1, 100);

-- 1. Default format
SELECT * FROM sales LIMIT 10;

-- 2. Expanded format (one record)
\x
SELECT * FROM sales WHERE id = 1;
\x off

-- 3. Export to CSV
\copy (SELECT region, SUM(quantity * unit_price) AS total_sales FROM sales GROUP BY region) TO '/tmp/sales_by_region.csv' CSV HEADER

-- 4. Format as HTML table
\pset format html
\o /tmp/sales_report.html
SELECT region, COUNT(*) AS transactions, SUM(quantity * unit_price) AS total
FROM sales
GROUP BY region
ORDER BY total DESC;
\o
\pset format aligned

-- 5. Unaligned format (pipe-separated)
\pset format unaligned
\pset fieldsep '|'
SELECT product, quantity, unit_price FROM sales LIMIT 5;
\pset format aligned

-- 6. Custom null display
UPDATE sales SET region = NULL WHERE id = 1;
\pset null '(no region)'
SELECT * FROM sales WHERE id = 1;
\pset null ''

-- 7. Monthly summary with formatting
\pset title 'Monthly Sales Summary'
\pset border 2
SELECT
    TO_CHAR(sale_date, 'YYYY-MM') AS month,
    COUNT(*) AS transactions,
    SUM(quantity * unit_price) AS total_sales,
    ROUND(AVG(quantity * unit_price), 2) AS avg_sale
FROM sales
GROUP BY TO_CHAR(sale_date, 'YYYY-MM')
ORDER BY month DESC
LIMIT 12;
```

**Expected Output in /tmp/sales_by_region.csv:**
```csv
region,total_sales
North,12345.67
South,23456.78
West,34567.89
```

### Exercise 3: Building a .psqlrc Configuration

**Task:** Create a comprehensive .psqlrc file.

Create `~/.psqlrc`:

```sql
-- .psqlrc - Custom PostgreSQL configuration

-- ============================================
-- PROMPT CONFIGURATION
-- ============================================
-- Show database, user, and transaction status
\set PROMPT1 '%[%033[1;34m%]%n@%[%033[1;32m%]%/%[%033[0m%]%R%x%# '
\set PROMPT2 '%[%033[1;34m%]...%[%033[0m%] '

-- ============================================
-- DISPLAY SETTINGS
-- ============================================
\x auto                        -- Auto-expand wide results
\pset null '¤'                 -- Show nulls distinctly
\pset border 2                 -- Full table borders
\pset linestyle unicode        -- Unicode line drawing
\timing on                     -- Always show query time
\set VERBOSITY verbose         -- Detailed error messages

-- ============================================
-- HISTORY SETTINGS
-- ============================================
\set HISTFILE ~/.psql_history- :DBNAME
\set HISTCONTROL ignoredups
\set HISTSIZE 10000

-- ============================================
-- ERROR HANDLING
-- ============================================
\set ON_ERROR_ROLLBACK interactive
\set ON_ERROR_STOP on

-- ============================================
-- USEFUL QUERIES AS VARIABLES
-- ============================================

-- System info
\set version 'SELECT version();'
\set uptime 'SELECT NOW() - pg_postmaster_start_time() AS uptime;'

-- Database info
\set databases 'SELECT datname, pg_size_pretty(pg_database_size(datname)) AS size FROM pg_database ORDER BY pg_database_size(datname) DESC;'
\set schemas 'SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT LIKE ''pg_%'' AND schema_name != ''information_schema'';'

-- Table info
\set tables 'SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||''.''||tablename)) AS size FROM pg_tables WHERE schemaname = ''public'' ORDER BY pg_total_relation_size(schemaname||''.''||tablename) DESC;'
\set table_sizes 'SELECT nspname AS schema, relname AS table, pg_size_pretty(pg_total_relation_size(C.oid)) AS size FROM pg_class C LEFT JOIN pg_namespace N ON (N.oid = C.relnamespace) WHERE nspname NOT IN (''pg_catalog'', ''information_schema'') AND C.relkind = ''r'' ORDER BY pg_total_relation_size(C.oid) DESC LIMIT 20;'

-- Activity monitoring
\set activity 'SELECT datname, usename, application_name, client_addr, state, query_start, LEFT(query, 60) AS query FROM pg_stat_activity WHERE state != ''idle'' ORDER BY query_start;'
\set connections 'SELECT datname, COUNT(*) FROM pg_stat_activity GROUP BY datname;'
\set locks 'SELECT relation::regclass, mode, granted, pid FROM pg_locks WHERE NOT granted;'
\set blocking 'SELECT blocked_locks.pid AS blocked_pid, blocking_locks.pid AS blocking_pid, blocked_activity.usename AS blocked_user, blocking_activity.usename AS blocking_user, blocked_activity.query AS blocked_statement FROM pg_catalog.pg_locks blocked_locks JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation AND blocking_locks.pid != blocked_locks.pid JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid WHERE NOT blocked_locks.granted;'

-- Performance
\set slow_queries 'SELECT pid, NOW() - query_start AS duration, state, LEFT(query, 100) AS query FROM pg_stat_activity WHERE state != ''idle'' AND query_start < NOW() - INTERVAL ''5 seconds'' ORDER BY duration DESC;'
\set cache_hit 'SELECT ''index hit rate'' AS metric, ROUND(SUM(idx_blks_hit) / NULLIF(SUM(idx_blks_hit + idx_blks_read), 0) * 100, 2) AS percentage FROM pg_statio_user_indexes UNION ALL SELECT ''table hit rate'', ROUND(SUM(heap_blks_hit) / NULLIF(SUM(heap_blks_hit + heap_blks_read), 0) * 100, 2) FROM pg_statio_user_tables;'

-- Maintenance
\set bloat 'SELECT schemaname, tablename, n_live_tup, n_dead_tup, ROUND(n_dead_tup::numeric / NULLIF(n_live_tup, 0) * 100, 2) AS dead_ratio FROM pg_stat_user_tables WHERE n_dead_tup > 1000 ORDER BY n_dead_tup DESC;'

-- ============================================
-- STARTUP MESSAGE
-- ============================================
\echo '\n'
\echo '╔═══════════════════════════════════════════════════════════╗'
\echo '║          PostgreSQL Interactive Terminal                 ║'
\echo '╚═══════════════════════════════════════════════════════════╝'
\echo ''
\echo 'Useful aliases (type :alias_name):'
\echo '  :version :uptime :databases :tables :table_sizes'
\echo '  :activity :connections :locks :blocking'
\echo '  :slow_queries :cache_hit :bloat'
\echo ''
\echo 'Meta-commands: \\? for help, \\h for SQL help'
\echo ''
```

**Test the configuration:**
```bash
psql -U postgres

# You should see the welcome message and colorized prompt

# Try the aliases
:version
:databases
:activity
:table_sizes
```

---

## Summary

Key takeaways:
- psql is a powerful command-line tool for PostgreSQL
- Meta-commands (backslash commands) provide quick access to information and utilities
- `\i` and `\ir` run SQL scripts; `\copy` imports/exports data
- Output formatting can be customized with `\pset`, `\x`, `\a`, `\t`
- `.psqlrc` allows permanent customization of psql behavior
- `\timing` shows query execution time
- `\e` and `\ef` open queries/functions in an external editor

**Next Steps:**
- [Numeric Types](../02-data-types/01-numeric-types.md) - Learn about PostgreSQL's data types
- [SELECT Queries](../03-sql-basics/01-select-queries.md) - Master SQL querying

---

## Additional Resources

- psql Documentation: https://www.postgresql.org/docs/current/app-psql.html
- psql Tips and Tricks: https://www.postgresql.org/docs/current/app-psql.html#APP-PSQL-META-COMMANDS
- .psqlrc Examples: https://www.citusdata.com/blog/2017/07/16/customizing-my-postgres-shell-using-psqlrc/

---

**Module:** 01-Fundamentals | **Previous:** [Databases and Schemas](./04-databases-schemas.md) | **Next:** [Data Types](../02-data-types/01-numeric-types.md)
