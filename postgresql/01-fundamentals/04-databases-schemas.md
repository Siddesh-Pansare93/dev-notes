# Databases and Schemas

## Overview

This module covers PostgreSQL databases and schemas, including how to create, manage, and organize database objects using schemas for effective namespace management and multi-tenancy.

---

## Theory

### Understanding Databases vs Schemas

PostgreSQL has a two-level organization hierarchy:

```
PostgreSQL Cluster (Server Instance)
├── Database: postgres (default)
├── Database: myapp_dev
│   ├── Schema: public (default)
│   │   ├── Table: users
│   │   ├── Table: orders
│   │   └── View: active_users
│   ├── Schema: reporting
│   │   ├── Table: daily_stats
│   │   └── View: monthly_summary
│   └── Schema: archive
│       └── Table: old_orders
├── Database: myapp_test
│   └── Schema: public
│       └── Table: test_data
└── Database: myapp_prod
    ├── Schema: public
    └── Schema: audit
```

**Key Differences:**

| Aspect | Database | Schema |
|--------|----------|--------|
| **Isolation** | Complete isolation | Shared within database |
| **Cross-access** | Cannot query across databases | Can query across schemas |
| **Connections** | One connection = one database | Can access multiple schemas |
| **Users** | Separate per database | Shared within database |
| **Performance** | Separate shared buffers overhead | Lightweight namespace |
| **Use Case** | Separate applications | Organize within application |

### Databases in PostgreSQL

A **database** is a complete, isolated collection of data:

**Characteristics:**
- **Isolation**: Cannot join tables across databases in a single query
- **Connection Target**: Each connection connects to exactly one database
- **Ownership**: Each database has an owner
- **Template System**: New databases created from templates
- **Catalog**: Each database has its own system catalogs (pg_tables, etc.)

**Common Use Cases:**
- Separate applications (e.g., app1_db, app2_db)
- Environment separation (dev, test, prod)
- Multi-tenant architecture (one database per tenant)
- Logical separation of unrelated data

**System Databases:**
- **postgres**: Default database for administrative tasks
- **template0**: Pristine template (never modify)
- **template1**: Default template for new databases (can customize)

### Schemas in PostgreSQL

A **schema** is a namespace within a database:

**Characteristics:**
- **Namespace**: Groups database objects (tables, views, functions)
- **Access Control**: Can grant permissions per schema
- **Name Resolution**: Objects referenced by schema.object_name
- **Default Schema**: "public" schema created automatically
- **Search Path**: Determines which schema is searched first

**Common Use Cases:**
- Logical organization (public, private, staging)
- Module separation (user_mgmt, billing, reporting)
- Multi-tenancy (tenant1, tenant2, tenant3)
- Versioning (v1, v2, v3)
- Security boundaries (sensitive_data, public_data)

### The public Schema

Every database starts with a "public" schema:

**Default Behavior:**
- Created automatically in new databases
- Accessible to all users by default (PostgreSQL 14+ changed this)
- Default schema for object creation
- First in default search_path

**Security Changes in PostgreSQL 15:**
- PUBLIC role no longer has CREATE privilege on public schema
- Prevents untrusted users from creating objects
- More secure default configuration

### Search Path

The **search_path** determines schema lookup order:

**Default Search Path:**
```sql
SHOW search_path;
-- Output: "$user", public
```

**How It Works:**
1. PostgreSQL looks for a schema matching the current user name
2. If not found, looks in "public" schema
3. If still not found, returns error

**Example:**
```sql
-- Current search_path: public, reporting

-- This query searches in order:
SELECT * FROM sales;

-- Looks for:
-- 1. public.sales
-- 2. reporting.sales
-- 3. Error if not found in either
```

### Schema-Based Multi-Tenancy

Use schemas to isolate tenant data within a single database:

**Advantages:**
- Easier backup/restore (single database)
- Efficient resource usage (shared PostgreSQL instance)
- Simpler maintenance (one codebase)
- Can query across tenants if needed

**Disadvantages:**
- Less isolation than separate databases
- Schema-qualified queries needed
- More complex permission management
- Shared resource limits (connections, memory)

**Implementation Pattern:**
```sql
-- Create schema per tenant
CREATE SCHEMA tenant_acme;
CREATE SCHEMA tenant_globex;

-- Create tables in each schema
CREATE TABLE tenant_acme.users (...);
CREATE TABLE tenant_globex.users (...);

-- Set search_path per connection
SET search_path TO tenant_acme;
SELECT * FROM users;  -- Accesses tenant_acme.users
```

---

## Syntax

### Database DDL

```sql
-- Create database
CREATE DATABASE name
    [ WITH ]
    [ OWNER [=] user_name ]
    [ TEMPLATE [=] template ]
    [ ENCODING [=] encoding ]
    [ LOCALE [=] locale ]
    [ LC_COLLATE [=] lc_collate ]
    [ LC_CTYPE [=] lc_ctype ]
    [ TABLESPACE [=] tablespace_name ]
    [ ALLOW_CONNECTIONS [=] allowconn ]
    [ CONNECTION LIMIT [=] connlimit ]
    [ IS_TEMPLATE [=] istemplate ];

-- Alter database
ALTER DATABASE name RENAME TO new_name;
ALTER DATABASE name OWNER TO new_owner;
ALTER DATABASE name SET configuration_parameter { TO | = } { value | DEFAULT };
ALTER DATABASE name CONNECTION LIMIT connlimit;

-- Drop database
DROP DATABASE [ IF EXISTS ] name [ WITH ( FORCE ) ];
```

### Schema DDL

```sql
-- Create schema
CREATE SCHEMA [ IF NOT EXISTS ] schema_name
    [ AUTHORIZATION role_specification ]
    [ schema_element [ ... ] ];

-- Create schema with objects
CREATE SCHEMA schema_name
    CREATE TABLE table_name (...)
    CREATE VIEW view_name AS ...;

-- Alter schema
ALTER SCHEMA name RENAME TO new_name;
ALTER SCHEMA name OWNER TO new_owner;

-- Drop schema
DROP SCHEMA [ IF EXISTS ] name [ CASCADE | RESTRICT ];

-- Set search path
SET search_path TO schema_name [, ...];
ALTER DATABASE dbname SET search_path TO schema_name [, ...];
ALTER ROLE username SET search_path TO schema_name [, ...];
```

---

## Examples

### Example 1: Database Management

```sql
-- List all databases
\l

-- Or using SQL
SELECT
    datname AS database_name,
    pg_catalog.pg_get_userbyid(datdba) AS owner,
    pg_encoding_to_char(encoding) AS encoding,
    datcollate AS collate,
    datctype AS ctype,
    pg_size_pretty(pg_database_size(datname)) AS size,
    datconnlimit AS connection_limit
FROM pg_catalog.pg_database
ORDER BY datname;

-- Create a new database
CREATE DATABASE bookstore
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0
    CONNECTION LIMIT = 100;

-- Connect to the new database
\c bookstore

-- Check current database
SELECT current_database();

-- Rename database (must not be connected to it)
\c postgres
ALTER DATABASE bookstore RENAME TO bookstore_v2;

-- Change database owner
ALTER DATABASE bookstore_v2 OWNER TO app_owner;

-- Set default schema search path for database
ALTER DATABASE bookstore_v2 SET search_path TO public, reporting;

-- Limit connections
ALTER DATABASE bookstore_v2 CONNECTION LIMIT 50;

-- Drop database (must not be connected to it, no active connections)
DROP DATABASE IF EXISTS bookstore_v2;

-- Force drop (PostgreSQL 13+, terminates active connections)
DROP DATABASE bookstore_v2 WITH (FORCE);
```

**Sample Output:**
```
  database_name   |  owner   | encoding |   collate   |    ctype    |  size   | connection_limit
------------------+----------+----------+-------------+-------------+---------+------------------
 postgres         | postgres | UTF8     | en_US.UTF-8 | en_US.UTF-8 | 8897 kB |               -1
 template0        | postgres | UTF8     | en_US.UTF-8 | en_US.UTF-8 | 8745 kB |               -1
 template1        | postgres | UTF8     | en_US.UTF-8 | en_US.UTF-8 | 8745 kB |               -1
 bookstore        | postgres | UTF8     | en_US.UTF-8 | en_US.UTF-8 | 8745 kB |              100
```

### Example 2: Schema Creation and Organization

```sql
-- Create a database for the example
CREATE DATABASE company_db;
\c company_db

-- Create schemas for different application modules
CREATE SCHEMA hr;
CREATE SCHEMA finance;
CREATE SCHEMA sales;
CREATE SCHEMA reporting;

-- Create schema with authorization
CREATE SCHEMA inventory AUTHORIZATION inventory_manager;

-- List all schemas
\dn

-- Or using SQL
SELECT
    schema_name,
    schema_owner
FROM information_schema.schemata
WHERE schema_name NOT LIKE 'pg_%'
  AND schema_name != 'information_schema'
ORDER BY schema_name;

-- Create tables in different schemas
CREATE TABLE hr.employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    department VARCHAR(50),
    hire_date DATE DEFAULT CURRENT_DATE
);

CREATE TABLE finance.invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    issue_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'pending'
);

CREATE TABLE sales.orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    order_date DATE DEFAULT CURRENT_DATE,
    total_amount NUMERIC(10, 2) NOT NULL
);

-- Create view in reporting schema that joins across schemas
CREATE VIEW reporting.employee_orders AS
SELECT
    e.id AS employee_id,
    e.name AS employee_name,
    COUNT(o.id) AS order_count,
    COALESCE(SUM(o.total_amount), 0) AS total_sales
FROM hr.employees e
LEFT JOIN sales.orders o ON e.id = o.customer_id
GROUP BY e.id, e.name;

-- List all tables with their schemas
SELECT
    schemaname AS schema,
    tablename AS table_name,
    pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY schemaname, tablename;
```

**Sample Output:**
```
  schema   |   table_name   |  size
-----------+----------------+---------
 finance   | invoices       | 8192 bytes
 hr        | employees      | 8192 bytes
 sales     | orders         | 8192 bytes
```

### Example 3: Search Path Management

```sql
-- View current search path
SHOW search_path;
-- Default: "$user", public

-- Create schemas for demonstration
CREATE SCHEMA app;
CREATE SCHEMA legacy;
CREATE SCHEMA staging;

-- Create tables with same name in different schemas
CREATE TABLE public.users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50),
    source VARCHAR(20) DEFAULT 'public'
);

CREATE TABLE app.users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50),
    source VARCHAR(20) DEFAULT 'app'
);

CREATE TABLE legacy.users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50),
    source VARCHAR(20) DEFAULT 'legacy'
);

-- Insert test data
INSERT INTO public.users (username) VALUES ('public_user');
INSERT INTO app.users (username) VALUES ('app_user');
INSERT INTO legacy.users (username) VALUES ('legacy_user');

-- Query without schema qualification (uses search_path)
SELECT * FROM users;
-- Returns data from public.users (default)

-- Change search path for current session
SET search_path TO app, public;

-- Now this query returns from app.users
SELECT * FROM users;

-- Explicitly qualify schema to access others
SELECT * FROM legacy.users;
SELECT * FROM public.users;

-- Set search path for specific user
ALTER ROLE myuser SET search_path TO app, staging, public;

-- Set search path for entire database
ALTER DATABASE company_db SET search_path TO app, public;

-- View search path for all users
SELECT
    COALESCE(rolname, 'database default') AS role,
    COALESCE(setconfig::TEXT, current_setting('search_path')) AS search_path
FROM pg_roles
LEFT JOIN pg_db_role_setting ON pg_roles.oid = setrole
WHERE setdatabase = (SELECT oid FROM pg_database WHERE datname = current_database())
   OR setrole IS NULL
LIMIT 10;

-- Reset to default
RESET search_path;

-- Clean up
DROP TABLE public.users, app.users, legacy.users CASCADE;
DROP SCHEMA app, legacy, staging CASCADE;
```

### Example 4: Schema Permissions and Security

```sql
-- Create schemas for different security levels
CREATE SCHEMA public_data;
CREATE SCHEMA internal_data;
CREATE SCHEMA confidential_data;

-- Create roles
CREATE ROLE app_user LOGIN PASSWORD 'app_pass';
CREATE ROLE internal_user LOGIN PASSWORD 'internal_pass';
CREATE ROLE admin_user LOGIN PASSWORD 'admin_pass';

-- Grant schema usage
GRANT USAGE ON SCHEMA public_data TO app_user;
GRANT USAGE ON SCHEMA internal_data TO internal_user;
GRANT USAGE ON SCHEMA confidential_data TO admin_user;

-- Create tables
CREATE TABLE public_data.products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    price NUMERIC(10, 2)
);

CREATE TABLE internal_data.sales_data (
    id SERIAL PRIMARY KEY,
    product_id INTEGER,
    quantity INTEGER,
    sale_date DATE
);

CREATE TABLE confidential_data.employee_salaries (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER,
    salary NUMERIC(10, 2),
    effective_date DATE
);

-- Grant table permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public_data TO app_user;
GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA internal_data TO internal_user;
GRANT ALL ON ALL TABLES IN SCHEMA confidential_data TO admin_user;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public_data
    GRANT SELECT ON TABLES TO app_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA internal_data
    GRANT SELECT, INSERT ON TABLES TO internal_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA confidential_data
    GRANT ALL ON TABLES TO admin_user;

-- View schema permissions
SELECT
    nspname AS schema_name,
    nspowner::regrole AS owner,
    nspacl AS access_privileges
FROM pg_namespace
WHERE nspname IN ('public_data', 'internal_data', 'confidential_data');

-- Test permissions (connect as app_user)
SET ROLE app_user;
SELECT * FROM public_data.products;  -- Works
-- SELECT * FROM confidential_data.employee_salaries;  -- Permission denied

-- Reset role
RESET ROLE;

-- Clean up
DROP SCHEMA public_data, internal_data, confidential_data CASCADE;
DROP ROLE app_user, internal_user, admin_user;
```

### Example 5: Multi-Tenant Schema Architecture

```sql
-- Create database for multi-tenant SaaS application
CREATE DATABASE saas_platform;
\c saas_platform

-- Create a shared/public schema for common data
CREATE SCHEMA shared;

-- Create tables in shared schema
CREATE TABLE shared.plans (
    id SERIAL PRIMARY KEY,
    plan_name VARCHAR(50) UNIQUE NOT NULL,
    max_users INTEGER,
    price_monthly NUMERIC(10, 2)
);

INSERT INTO shared.plans (plan_name, max_users, price_monthly) VALUES
    ('Free', 5, 0.00),
    ('Starter', 20, 29.99),
    ('Professional', 100, 99.99),
    ('Enterprise', -1, 499.99);

-- Function to create tenant schema
CREATE OR REPLACE FUNCTION create_tenant_schema(tenant_name TEXT)
RETURNS VOID AS $$
BEGIN
    -- Create schema
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', tenant_name);

    -- Create tenant-specific tables
    EXECUTE format('
        CREATE TABLE %I.users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )', tenant_name);

    EXECUTE format('
        CREATE TABLE %I.documents (
            id SERIAL PRIMARY KEY,
            title VARCHAR(200) NOT NULL,
            content TEXT,
            user_id INTEGER REFERENCES %I.users(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )', tenant_name, tenant_name);

    EXECUTE format('
        CREATE TABLE %I.settings (
            key VARCHAR(50) PRIMARY KEY,
            value TEXT
        )', tenant_name);

    RAISE NOTICE 'Tenant schema % created successfully', tenant_name;
END;
$$ LANGUAGE plpgsql;

-- Create multiple tenant schemas
SELECT create_tenant_schema('tenant_acme');
SELECT create_tenant_schema('tenant_globex');
SELECT create_tenant_schema('tenant_initech');

-- Create tenant metadata table
CREATE TABLE shared.tenants (
    id SERIAL PRIMARY KEY,
    tenant_name VARCHAR(50) UNIQUE NOT NULL,
    schema_name VARCHAR(50) UNIQUE NOT NULL,
    plan_id INTEGER REFERENCES shared.plans(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

INSERT INTO shared.tenants (tenant_name, schema_name, plan_id) VALUES
    ('Acme Corporation', 'tenant_acme', 3),
    ('Globex Corporation', 'tenant_globex', 2),
    ('Initech', 'tenant_initech', 1);

-- Create role per tenant
CREATE ROLE tenant_acme_user LOGIN PASSWORD 'acme_pass';
CREATE ROLE tenant_globex_user LOGIN PASSWORD 'globex_pass';

-- Grant access to their respective schemas only
GRANT USAGE ON SCHEMA tenant_acme TO tenant_acme_user;
GRANT ALL ON ALL TABLES IN SCHEMA tenant_acme TO tenant_acme_user;
GRANT USAGE ON SCHEMA tenant_globex TO tenant_globex_user;
GRANT ALL ON ALL TABLES IN SCHEMA tenant_globex TO tenant_globex_user;

-- All tenants can read shared data
GRANT USAGE ON SCHEMA shared TO tenant_acme_user, tenant_globex_user;
GRANT SELECT ON ALL TABLES IN SCHEMA shared TO tenant_acme_user, tenant_globex_user;

-- Set default search path per tenant
ALTER ROLE tenant_acme_user SET search_path TO tenant_acme, shared;
ALTER ROLE tenant_globex_user SET search_path TO tenant_globex, shared;

-- Insert tenant-specific data
SET search_path TO tenant_acme, shared;
INSERT INTO users (username, email) VALUES ('john_acme', 'john@acme.com');
INSERT INTO documents (title, content, user_id) VALUES ('Welcome', 'Welcome to Acme!', 1);

SET search_path TO tenant_globex, shared;
INSERT INTO users (username, email) VALUES ('jane_globex', 'jane@globex.com');
INSERT INTO documents (title, content, user_id) VALUES ('Getting Started', 'Globex guide', 1);

-- View all tenant data (admin view)
SELECT
    t.tenant_name,
    t.schema_name,
    p.plan_name,
    (SELECT COUNT(*) FROM information_schema.tables
     WHERE table_schema = t.schema_name) AS table_count
FROM shared.tenants t
JOIN shared.plans p ON t.plan_id = p.id
ORDER BY t.tenant_name;

-- Query across tenants (admin only)
SELECT 'tenant_acme' AS tenant, COUNT(*) AS user_count FROM tenant_acme.users
UNION ALL
SELECT 'tenant_globex', COUNT(*) FROM tenant_globex.users
UNION ALL
SELECT 'tenant_initech', COUNT(*) FROM tenant_initech.users;
```

**Sample Output:**
```
     tenant_name      |  schema_name   |  plan_name   | table_count
----------------------+----------------+--------------+-------------
 Acme Corporation     | tenant_acme    | Professional |           3
 Globex Corporation   | tenant_globex  | Starter      |           3
 Initech              | tenant_initech | Free         |           3

    tenant     | user_count
---------------+------------
 tenant_acme   |          1
 tenant_globex |          1
 tenant_initech|          0
```

### Example 6: Schema-Based Versioning

```sql
-- Create database
CREATE DATABASE api_service;
\c api_service

-- Create schemas for different API versions
CREATE SCHEMA api_v1;
CREATE SCHEMA api_v2;
CREATE SCHEMA api_v3_beta;

-- Version 1 schema (original)
CREATE TABLE api_v1.users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100)
);

-- Version 2 schema (added phone, split name)
CREATE TABLE api_v2.users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email VARCHAR(100),
    phone VARCHAR(20)
);

-- Version 3 schema (added JSON metadata)
CREATE TABLE api_v3_beta.users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email VARCHAR(100),
    phone VARCHAR(20),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create views in older versions that map to newer schema
CREATE VIEW api_v1.users_from_v2 AS
SELECT
    id,
    first_name || ' ' || last_name AS name,
    email
FROM api_v2.users;

-- Migration function to copy data between versions
CREATE OR REPLACE FUNCTION migrate_v1_to_v2()
RETURNS INTEGER AS $$
DECLARE
    rows_migrated INTEGER;
BEGIN
    INSERT INTO api_v2.users (first_name, last_name, email)
    SELECT
        SPLIT_PART(name, ' ', 1) AS first_name,
        SPLIT_PART(name, ' ', 2) AS last_name,
        email
    FROM api_v1.users
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS rows_migrated = ROW_COUNT;
    RETURN rows_migrated;
END;
$$ LANGUAGE plpgsql;

-- Test the versions
INSERT INTO api_v1.users (name, email) VALUES ('John Doe', 'john@example.com');
INSERT INTO api_v2.users (first_name, last_name, email, phone)
    VALUES ('Jane', 'Smith', 'jane@example.com', '+1-555-0100');
INSERT INTO api_v3_beta.users (first_name, last_name, email, phone, metadata)
    VALUES ('Bob', 'Johnson', 'bob@example.com', '+1-555-0101', '{"source": "api"}');

-- View data from different versions
SELECT 'v1' AS version, * FROM api_v1.users
UNION ALL
SELECT 'v2', id, first_name || ' ' || last_name, email FROM api_v2.users
UNION ALL
SELECT 'v3', id, first_name || ' ' || last_name, email FROM api_v3_beta.users;

-- Application can set search_path based on API version requested
-- v1 clients:
SET search_path TO api_v1;
-- v2 clients:
SET search_path TO api_v2;
-- v3 beta clients:
SET search_path TO api_v3_beta;
```

---

## Common Mistakes

### Mistake 1: Trying to Query Across Databases

**Wrong:**
```sql
-- This does NOT work
SELECT *
FROM database1.public.users u
JOIN database2.public.orders o ON u.id = o.user_id;

-- Error: cross-database references are not implemented
```

**Correct:**
```sql
-- Option 1: Use schemas instead of databases
CREATE SCHEMA users_schema;
CREATE SCHEMA orders_schema;

CREATE TABLE users_schema.users (...);
CREATE TABLE orders_schema.orders (...);

-- Now this works
SELECT *
FROM users_schema.users u
JOIN orders_schema.orders o ON u.id = o.user_id;

-- Option 2: Use Foreign Data Wrapper (FDW) for cross-database queries
CREATE EXTENSION postgres_fdw;

CREATE SERVER remote_db
    FOREIGN DATA WRAPPER postgres_fdw
    OPTIONS (host 'localhost', dbname 'database2', port '5432');

CREATE USER MAPPING FOR current_user
    SERVER remote_db
    OPTIONS (user 'postgres', password 'password');

CREATE FOREIGN TABLE remote_orders (
    id INTEGER,
    user_id INTEGER,
    total NUMERIC
) SERVER remote_db OPTIONS (schema_name 'public', table_name 'orders');

-- Now this works
SELECT *
FROM users u
JOIN remote_orders o ON u.id = o.user_id;
```

### Mistake 2: Not Using IF EXISTS/IF NOT EXISTS

**Wrong:**
```sql
-- Fails if schema already exists
CREATE SCHEMA reporting;

-- Fails if schema doesn't exist
DROP SCHEMA analytics;
```

**Correct:**
```sql
-- Safe creation
CREATE SCHEMA IF NOT EXISTS reporting;

-- Safe deletion
DROP SCHEMA IF EXISTS analytics;

-- Same for databases
CREATE DATABASE IF NOT EXISTS myapp;
DROP DATABASE IF EXISTS old_database;
```

### Mistake 3: Forgetting CASCADE When Dropping

**Wrong:**
```sql
CREATE SCHEMA test_schema;
CREATE TABLE test_schema.test_table (id INTEGER);

-- This fails because schema is not empty
DROP SCHEMA test_schema;
-- ERROR: schema "test_schema" is not empty
```

**Correct:**
```sql
-- Option 1: Drop with CASCADE (removes all objects)
DROP SCHEMA test_schema CASCADE;

-- Option 2: Drop objects first, then schema
DROP TABLE test_schema.test_table;
DROP SCHEMA test_schema;

-- For databases
DROP DATABASE mydb;  -- Fails if connections exist

-- Force drop (PostgreSQL 13+)
DROP DATABASE mydb WITH (FORCE);
```

### Mistake 4: Not Setting Search Path Properly

**Wrong:**
```sql
-- User connects and tries to use app schema
\c myapp
SELECT * FROM users;  -- Might hit wrong schema!

-- Could be accessing public.users instead of app.users
```

**Correct:**
```sql
-- Set search path at database level
ALTER DATABASE myapp SET search_path TO app, public;

-- Or set for specific role
ALTER ROLE app_user SET search_path TO app, public;

-- Or set per session
SET search_path TO app, public;

-- Or always qualify schema
SELECT * FROM app.users;  -- Explicit and safe
```

### Mistake 5: Granting Permissions on Schema But Not Tables

**Wrong:**
```sql
CREATE SCHEMA reports;
CREATE TABLE reports.sales (id INTEGER, amount NUMERIC);

GRANT USAGE ON SCHEMA reports TO analyst;

-- User connects as analyst
SET ROLE analyst;
SELECT * FROM reports.sales;
-- ERROR: permission denied for table sales
```

**Correct:**
```sql
-- Grant schema usage
GRANT USAGE ON SCHEMA reports TO analyst;

-- Grant table permissions
GRANT SELECT ON ALL TABLES IN SCHEMA reports TO analyst;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA reports
    GRANT SELECT ON TABLES TO analyst;

-- Or grant everything at once
GRANT USAGE ON SCHEMA reports TO analyst;
GRANT SELECT ON ALL TABLES IN SCHEMA reports TO analyst;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA reports TO analyst;
ALTER DEFAULT PRIVILEGES IN SCHEMA reports
    GRANT SELECT ON TABLES TO analyst;
```

---

## Best Practices

### 1. Choose Databases vs Schemas Appropriately

```sql
-- Use separate DATABASES for:
-- - Completely different applications
-- - Different clients/customers (high security requirements)
-- - Need for complete isolation

CREATE DATABASE app1;
CREATE DATABASE app2;

-- Use SCHEMAS for:
-- - Organizing within an application
-- - Multi-tenancy with moderate isolation
-- - Versioning, staging, reporting

CREATE DATABASE myapp;
\c myapp
CREATE SCHEMA production;
CREATE SCHEMA staging;
CREATE SCHEMA reporting;
CREATE SCHEMA archive;
```

### 2. Use Meaningful Schema Names

```sql
-- Good: Descriptive, purpose-driven names
CREATE SCHEMA user_management;
CREATE SCHEMA billing;
CREATE SCHEMA analytics;
CREATE SCHEMA api_v2;

-- Avoid: Generic or confusing names
CREATE SCHEMA schema1;  -- What is this?
CREATE SCHEMA temp;     -- Could be confused with temporary
CREATE SCHEMA data;     -- Too vague
```

### 3. Set Default Search Path

```sql
-- At database level (affects all users)
ALTER DATABASE myapp SET search_path TO app, shared, public;

-- Per role (affects specific users)
ALTER ROLE app_user SET search_path TO app, public;
ALTER ROLE reporting_user SET search_path TO reporting, public;
ALTER ROLE admin SET search_path TO app, reporting, archive, public;

-- Verify current setting
SHOW search_path;

-- View configured search paths
SELECT
    COALESCE(rolname, '(database)') AS role,
    COALESCE(setconfig::TEXT, 'default') AS search_path
FROM pg_roles
LEFT JOIN pg_db_role_setting ON pg_roles.oid = setrole
WHERE setdatabase = (SELECT oid FROM pg_database WHERE datname = current_database())
   OR rolname IN ('app_user', 'reporting_user');
```

### 4. Use Schemas for Multi-Tenancy Pattern

```sql
-- Template function for tenant creation
CREATE OR REPLACE FUNCTION provision_tenant(tenant_id TEXT)
RETURNS VOID AS $$
BEGIN
    -- Create schema
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', tenant_id);

    -- Create standard tables
    EXECUTE format('
        CREATE TABLE %I.users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(100) UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )', tenant_id);

    EXECUTE format('
        CREATE TABLE %I.settings (
            key VARCHAR(100) PRIMARY KEY,
            value JSONB
        )', tenant_id);

    -- Create role for tenant
    EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', tenant_id || '_user', gen_random_uuid()::TEXT);

    -- Grant permissions
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO %I', tenant_id, tenant_id || '_user');
    EXECUTE format('GRANT ALL ON ALL TABLES IN SCHEMA %I TO %I', tenant_id, tenant_id || '_user');
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT ALL ON TABLES TO %I',
                   tenant_id, tenant_id || '_user');

    -- Set search path
    EXECUTE format('ALTER ROLE %I SET search_path TO %I', tenant_id || '_user', tenant_id);

    RAISE NOTICE 'Tenant % provisioned successfully', tenant_id;
END;
$$ LANGUAGE plpgsql;

-- Use it
SELECT provision_tenant('customer_123');
SELECT provision_tenant('customer_456');
```

### 5. Document Schema Purpose

```sql
-- Use COMMENT to document schemas
CREATE SCHEMA reporting;
COMMENT ON SCHEMA reporting IS 'Read-only reporting views and materialized views for analytics';

CREATE SCHEMA archive;
COMMENT ON SCHEMA archive IS 'Historical data older than 2 years, partitioned by year';

CREATE SCHEMA staging;
COMMENT ON SCHEMA staging IS 'Temporary staging area for ETL processes, cleaned nightly';

-- View comments
SELECT
    nspname AS schema_name,
    obj_description(oid, 'pg_namespace') AS description
FROM pg_namespace
WHERE nspname NOT LIKE 'pg_%'
  AND nspname != 'information_schema'
ORDER BY nspname;
```

### 6. Regular Schema Auditing

```sql
-- Monitor schema growth
SELECT
    schemaname,
    COUNT(*) AS table_count,
    pg_size_pretty(SUM(pg_total_relation_size(schemaname || '.' || tablename))) AS total_size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
GROUP BY schemaname
ORDER BY SUM(pg_total_relation_size(schemaname || '.' || tablename)) DESC;

-- Find unused schemas (no tables)
SELECT nspname AS empty_schema
FROM pg_namespace n
WHERE nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
  AND nspname NOT LIKE 'pg_%'
  AND NOT EXISTS (
      SELECT 1 FROM pg_class c WHERE c.relnamespace = n.oid
  );

-- Find schemas with activity
SELECT
    schemaname,
    COUNT(DISTINCT tablename) AS tables,
    SUM(seq_scan + idx_scan) AS total_scans,
    MAX(last_vacuum) AS last_vacuum,
    MAX(last_autovacuum) AS last_autovacuum
FROM pg_stat_user_tables
GROUP BY schemaname
ORDER BY total_scans DESC;
```

---

## Practice Exercises

### Exercise 1: Database and Schema Creation

**Task:** Create a multi-environment setup for an application.

```sql
-- Create databases for different environments
CREATE DATABASE myapp_dev
    ENCODING = 'UTF8'
    CONNECTION LIMIT = -1;

CREATE DATABASE myapp_test
    ENCODING = 'UTF8'
    CONNECTION LIMIT = 50;

CREATE DATABASE myapp_prod
    ENCODING = 'UTF8'
    CONNECTION LIMIT = 100;

-- Connect to development database
\c myapp_dev

-- Create schemas for organization
CREATE SCHEMA app;
CREATE SCHEMA reporting;
CREATE SCHEMA staging;

-- Create tables in app schema
CREATE TABLE app.users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE app.posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES app.users(id),
    title VARCHAR(200) NOT NULL,
    content TEXT,
    published BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create reporting view
CREATE VIEW reporting.user_stats AS
SELECT
    u.id,
    u.username,
    COUNT(p.id) AS post_count,
    COUNT(p.id) FILTER (WHERE p.published) AS published_count
FROM app.users u
LEFT JOIN app.posts p ON u.id = p.user_id
GROUP BY u.id, u.username;

-- Insert test data
INSERT INTO app.users (username, email) VALUES
    ('alice', 'alice@example.com'),
    ('bob', 'bob@example.com');

INSERT INTO app.posts (user_id, title, content, published) VALUES
    (1, 'First Post', 'Hello World', true),
    (1, 'Draft Post', 'Not ready yet', false),
    (2, 'Bob''s Post', 'My first post', true);

-- Query using different schemas
SELECT * FROM app.users;
SELECT * FROM reporting.user_stats;

-- List all schemas and their objects
SELECT
    n.nspname AS schema_name,
    COUNT(c.relname) AS object_count,
    string_agg(DISTINCT c.relkind::TEXT, ', ') AS object_types
FROM pg_namespace n
LEFT JOIN pg_class c ON n.oid = c.relnamespace
WHERE n.nspname IN ('app', 'reporting', 'staging')
GROUP BY n.nspname
ORDER BY n.nspname;
```

**Challenge:**
- Replicate the same schema structure in myapp_test and myapp_prod
- Create a script that can be run in any environment
- Add appropriate comments to schemas and tables

### Exercise 2: Multi-Tenant Implementation

**Task:** Build a schema-based multi-tenant system.

```sql
-- Create database
CREATE DATABASE saas_app;
\c saas_app

-- Create shared schema for common data
CREATE SCHEMA shared;

-- Tenant metadata table
CREATE TABLE shared.tenants (
    id SERIAL PRIMARY KEY,
    tenant_code VARCHAR(50) UNIQUE NOT NULL,
    tenant_name VARCHAR(200) NOT NULL,
    schema_name VARCHAR(63) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}'::jsonb
);

-- Function to create new tenant
CREATE OR REPLACE FUNCTION shared.create_tenant(
    p_tenant_code VARCHAR(50),
    p_tenant_name VARCHAR(200)
)
RETURNS INTEGER AS $$
DECLARE
    v_schema_name VARCHAR(63);
    v_tenant_id INTEGER;
BEGIN
    -- Generate schema name
    v_schema_name := 'tenant_' || p_tenant_code;

    -- Create tenant record
    INSERT INTO shared.tenants (tenant_code, tenant_name, schema_name)
    VALUES (p_tenant_code, p_tenant_name, v_schema_name)
    RETURNING id INTO v_tenant_id;

    -- Create schema
    EXECUTE format('CREATE SCHEMA %I', v_schema_name);

    -- Create tenant tables
    EXECUTE format('
        CREATE TABLE %I.users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(100) UNIQUE NOT NULL,
            full_name VARCHAR(200),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )', v_schema_name);

    EXECUTE format('
        CREATE TABLE %I.projects (
            id SERIAL PRIMARY KEY,
            name VARCHAR(200) NOT NULL,
            description TEXT,
            owner_id INTEGER REFERENCES %I.users(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )', v_schema_name, v_schema_name);

    EXECUTE format('
        CREATE TABLE %I.tasks (
            id SERIAL PRIMARY KEY,
            project_id INTEGER REFERENCES %I.projects(id),
            title VARCHAR(200) NOT NULL,
            description TEXT,
            status VARCHAR(20) DEFAULT ''pending'',
            assigned_to INTEGER REFERENCES %I.users(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )', v_schema_name, v_schema_name, v_schema_name);

    RAISE NOTICE 'Tenant % (ID: %) created with schema %', p_tenant_name, v_tenant_id, v_schema_name;

    RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql;

-- Create sample tenants
SELECT shared.create_tenant('acme', 'Acme Corporation');
SELECT shared.create_tenant('globex', 'Globex Industries');
SELECT shared.create_tenant('initech', 'Initech Inc');

-- Insert data for tenant_acme
SET search_path TO tenant_acme;

INSERT INTO users (email, full_name) VALUES
    ('john@acme.com', 'John Doe'),
    ('jane@acme.com', 'Jane Smith');

INSERT INTO projects (name, description, owner_id) VALUES
    ('Website Redesign', 'Redesign company website', 1),
    ('Mobile App', 'Build mobile application', 2);

INSERT INTO tasks (project_id, title, status, assigned_to) VALUES
    (1, 'Design mockups', 'completed', 1),
    (1, 'Implement frontend', 'in_progress', 2),
    (2, 'API development', 'pending', 1);

-- Insert data for tenant_globex
SET search_path TO tenant_globex;

INSERT INTO users (email, full_name) VALUES
    ('bob@globex.com', 'Bob Johnson');

INSERT INTO projects (name, description, owner_id) VALUES
    ('Data Migration', 'Migrate legacy data', 1);

-- Query across all tenants (admin view)
SELECT
    t.tenant_name,
    (SELECT COUNT(*) FROM information_schema.tables
     WHERE table_schema = t.schema_name) AS table_count,
    (EXECUTE format('SELECT COUNT(*) FROM %I.users', t.schema_name)) AS user_count
FROM shared.tenants t
WHERE t.is_active = true;

-- Function to get tenant statistics
CREATE OR REPLACE FUNCTION shared.tenant_stats(p_tenant_code VARCHAR(50))
RETURNS TABLE(
    metric VARCHAR(50),
    value BIGINT
) AS $$
DECLARE
    v_schema_name VARCHAR(63);
BEGIN
    SELECT schema_name INTO v_schema_name
    FROM shared.tenants
    WHERE tenant_code = p_tenant_code;

    RETURN QUERY EXECUTE format('
        SELECT ''users''::VARCHAR(50), COUNT(*)::BIGINT FROM %I.users
        UNION ALL
        SELECT ''projects'', COUNT(*) FROM %I.projects
        UNION ALL
        SELECT ''tasks'', COUNT(*) FROM %I.tasks
    ', v_schema_name, v_schema_name, v_schema_name);
END;
$$ LANGUAGE plpgsql;

-- Use the function
SELECT * FROM shared.tenant_stats('acme');
SELECT * FROM shared.tenant_stats('globex');
```

**Expected Output:**
```
   metric   | value
------------+-------
 users      |     2
 projects   |     2
 tasks      |     3
```

### Exercise 3: Schema-Based Access Control

**Task:** Implement fine-grained access control using schemas.

```sql
-- Create database
CREATE DATABASE secure_app;
\c secure_app

-- Create schemas for different security levels
CREATE SCHEMA public_access;
CREATE SCHEMA internal_access;
CREATE SCHEMA restricted_access;

-- Create roles
CREATE ROLE guest_user LOGIN PASSWORD 'guest_pass';
CREATE ROLE employee_user LOGIN PASSWORD 'employee_pass';
CREATE ROLE admin_user LOGIN PASSWORD 'admin_pass';

-- Create tables in each schema
CREATE TABLE public_access.announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200),
    content TEXT,
    published_date DATE DEFAULT CURRENT_DATE
);

CREATE TABLE internal_access.projects (
    id SERIAL PRIMARY KEY,
    project_name VARCHAR(200),
    budget NUMERIC(12, 2),
    start_date DATE
);

CREATE TABLE restricted_access.salaries (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER,
    salary NUMERIC(10, 2),
    effective_date DATE
);

-- Grant permissions
-- Guest: read public only
GRANT USAGE ON SCHEMA public_access TO guest_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public_access TO guest_user;

-- Employee: read public, read/write internal
GRANT USAGE ON SCHEMA public_access TO employee_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public_access TO employee_user;
GRANT USAGE ON SCHEMA internal_access TO employee_user;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA internal_access TO employee_user;

-- Admin: full access to all
GRANT USAGE ON SCHEMA public_access, internal_access, restricted_access TO admin_user;
GRANT ALL ON ALL TABLES IN SCHEMA public_access TO admin_user;
GRANT ALL ON ALL TABLES IN SCHEMA internal_access TO admin_user;
GRANT ALL ON ALL TABLES IN SCHEMA restricted_access TO admin_user;

-- Set default privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA public_access GRANT SELECT ON TABLES TO guest_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA internal_access GRANT SELECT, INSERT, UPDATE ON TABLES TO employee_user;

-- Test access (run these individually as different users)
-- As guest_user:
SET ROLE guest_user;
SELECT * FROM public_access.announcements;  -- Works
-- SELECT * FROM internal_access.projects;   -- Permission denied
RESET ROLE;

-- As employee_user:
SET ROLE employee_user;
SELECT * FROM public_access.announcements;  -- Works
SELECT * FROM internal_access.projects;     -- Works
-- SELECT * FROM restricted_access.salaries; -- Permission denied
RESET ROLE;

-- As admin_user:
SET ROLE admin_user;
SELECT * FROM restricted_access.salaries;   -- Works
RESET ROLE;

-- Verify permissions
SELECT
    n.nspname AS schema,
    c.relname AS table_name,
    r.rolname AS role,
    CASE
        WHEN has_table_privilege(r.oid, c.oid, 'SELECT') THEN 'SELECT '
        ELSE ''
    END ||
    CASE
        WHEN has_table_privilege(r.oid, c.oid, 'INSERT') THEN 'INSERT '
        ELSE ''
    END ||
    CASE
        WHEN has_table_privilege(r.oid, c.oid, 'UPDATE') THEN 'UPDATE '
        ELSE ''
    END AS privileges
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
CROSS JOIN pg_roles r
WHERE n.nspname IN ('public_access', 'internal_access', 'restricted_access')
  AND c.relkind = 'r'
  AND r.rolname IN ('guest_user', 'employee_user', 'admin_user')
ORDER BY n.nspname, c.relname, r.rolname;
```

---

## Summary

Key concepts covered:
- Databases provide complete isolation; schemas provide namespace organization
- Schemas are lightweight and allow cross-schema queries
- The public schema is created by default but can be customized
- search_path determines which schema is used for unqualified object names
- Schema-based multi-tenancy is efficient for SaaS applications
- Proper permission management requires granting both schema USAGE and object privileges

**Next Steps:**
- [psql Commands](./05-psql-commands.md) - Master the PostgreSQL command-line interface
- [Data Types](../02-data-types/01-numeric-types.md) - Learn about PostgreSQL's rich type system

---

## Additional Resources

- PostgreSQL Schema Documentation: https://www.postgresql.org/docs/current/ddl-schemas.html
- Database Creation: https://www.postgresql.org/docs/current/sql-createdatabase.html
- Multi-Tenancy Patterns: https://www.postgresql.org/docs/current/ddl-schemas.html#DDL-SCHEMAS-PATTERNS

---

**Module:** 01-Fundamentals | **Previous:** [Architecture](./03-architecture.md) | **Next:** [psql Commands](./05-psql-commands.md)
