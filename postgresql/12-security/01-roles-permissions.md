# Roles and Permissions

## Table of Contents
- [Theory](#theory)
- [Syntax](#syntax)
- [Examples](#examples)
- [Common Mistakes](#common-mistakes)
- [Best Practices](#best-practices)
- [Practice Exercises](#practice-exercises)

## Theory

### PostgreSQL Role System

In PostgreSQL, **roles** are the foundation of the security model. A role can be thought of as a database user, a group of users, or both. Roles have:

- **Attributes**: LOGIN, SUPERUSER, CREATEDB, CREATEROLE, etc.
- **Privileges**: Permissions on database objects (tables, schemas, functions)
- **Membership**: Roles can be members of other roles (inheritance)

### CREATE ROLE vs CREATE USER

**Historical Context:**
- `CREATE USER` is an alias for `CREATE ROLE` with the `LOGIN` attribute
- Both create roles, but `CREATE USER` automatically grants LOGIN

**Modern Practice:**
- Use `CREATE ROLE` for groups/collections of privileges
- Use `CREATE USER` for actual user accounts (or `CREATE ROLE ... WITH LOGIN`)

```sql
-- These are equivalent:
CREATE USER alice WITH PASSWORD 'secret';
CREATE ROLE alice WITH LOGIN PASSWORD 'secret';
```

### Role Attributes

**LOGIN**: Allows the role to connect to the database
- Roles without LOGIN are typically used as groups

**SUPERUSER**: Bypasses all permission checks
- Has unrestricted access to all database objects
- Can modify system catalogs
- Should be used sparingly

**CREATEDB**: Allows creating databases

**CREATEROLE**: Allows creating, altering, and dropping other roles
- Cannot create SUPERUSER roles unless the role itself is SUPERUSER

**REPLICATION**: Allows initiating streaming replication

**BYPASSRLS**: Allows bypassing row-level security policies

**CONNECTION LIMIT**: Limits concurrent connections for the role

**PASSWORD**: Sets authentication password

**VALID UNTIL**: Password expiration timestamp

### Role Membership and Inheritance

Roles can be members of other roles, creating a hierarchy:

- **Group Roles**: Roles that contain other roles (no LOGIN typically)
- **Member Roles**: Roles that are members of group roles
- **INHERIT**: Members automatically inherit privileges of group roles
- **NOINHERIT**: Members must explicitly `SET ROLE` to use group privileges

**Inheritance Behavior:**
```
Role A (INHERIT) is member of Role B
→ Role A automatically has all privileges of Role B

Role C (NOINHERIT) is member of Role D
→ Role C must execute SET ROLE D to use Role D's privileges
```

### SET ROLE

`SET ROLE` allows switching the current session to operate as a different role:

- Must be a member of the target role
- Useful for testing permissions
- Required for NOINHERIT roles to use group privileges
- Can be used to reduce privileges temporarily

### Privilege Types

**Table/View Privileges:**
- **SELECT**: Read data
- **INSERT**: Add rows
- **UPDATE**: Modify existing rows
- **DELETE**: Remove rows
- **TRUNCATE**: Efficiently remove all rows
- **REFERENCES**: Create foreign keys
- **TRIGGER**: Create triggers
- **ALL**: All available privileges

**Schema Privileges:**
- **USAGE**: Access objects within the schema
- **CREATE**: Create new objects in the schema

**Database Privileges:**
- **CONNECT**: Connect to the database
- **CREATE**: Create schemas in the database
- **TEMPORARY**: Create temporary tables

**Function/Procedure Privileges:**
- **EXECUTE**: Execute the function or procedure

**Sequence Privileges:**
- **USAGE**: Use currval and nextval
- **SELECT**: Use currval
- **UPDATE**: Use nextval and setval

### GRANT and REVOKE

**GRANT**: Provides privileges to roles
**REVOKE**: Removes privileges from roles

Both support:
- Multiple privileges at once
- Multiple roles at once
- Granting to PUBLIC (all roles)
- WITH GRANT OPTION (allows recipient to grant to others)
- CASCADE (revokes dependent privileges)

### ALTER DEFAULT PRIVILEGES

Sets default privileges for objects created in the future:

- Applies to specific object types (tables, sequences, functions)
- Can be scoped to specific schemas
- Affects only objects created after the command
- Essential for consistent permission management

### Predefined Roles (PostgreSQL 14+)

PostgreSQL provides predefined roles for common administrative tasks:

- **pg_read_all_data**: Read all tables, views, and sequences
- **pg_write_all_data**: Write to all tables, views, and sequences
- **pg_read_all_settings**: Read all configuration parameters
- **pg_read_all_stats**: Read all pg_stat_* views
- **pg_signal_backend**: Send signals to other backends
- **pg_monitor**: Read/execute monitoring views and functions

These simplify granting broad access without SUPERUSER.

## Syntax

### Creating Roles

```sql
-- Basic role
CREATE ROLE role_name;

-- Role with LOGIN (user account)
CREATE ROLE role_name WITH LOGIN PASSWORD 'password';
-- OR
CREATE USER role_name WITH PASSWORD 'password';

-- Role with multiple attributes
CREATE ROLE role_name WITH
    LOGIN
    PASSWORD 'password'
    CREATEDB
    VALID UNTIL '2025-12-31';

-- Role with connection limit
CREATE ROLE role_name WITH LOGIN CONNECTION LIMIT 5;
```

### Altering Roles

```sql
-- Change password
ALTER ROLE role_name WITH PASSWORD 'new_password';

-- Add attributes
ALTER ROLE role_name WITH CREATEDB CREATEROLE;

-- Remove attributes
ALTER ROLE role_name WITH NOCREATEDB;

-- Set connection limit
ALTER ROLE role_name CONNECTION LIMIT 10;

-- Set role-specific configuration
ALTER ROLE role_name SET search_path = myschema, public;
```

### Role Membership

```sql
-- Grant role membership
GRANT group_role TO member_role;

-- Grant with admin option (can grant to others)
GRANT group_role TO member_role WITH ADMIN OPTION;

-- Revoke role membership
REVOKE group_role FROM member_role;
```

### Granting Privileges

```sql
-- Table privileges
GRANT SELECT, INSERT, UPDATE, DELETE ON table_name TO role_name;
GRANT ALL PRIVILEGES ON table_name TO role_name;

-- All tables in schema
GRANT SELECT ON ALL TABLES IN SCHEMA schema_name TO role_name;

-- Schema privileges
GRANT USAGE ON SCHEMA schema_name TO role_name;
GRANT CREATE ON SCHEMA schema_name TO role_name;

-- Database privileges
GRANT CONNECT ON DATABASE db_name TO role_name;
GRANT CREATE ON DATABASE db_name TO role_name;

-- Function privileges
GRANT EXECUTE ON FUNCTION function_name(arg_types) TO role_name;

-- Sequence privileges
GRANT USAGE, SELECT ON SEQUENCE seq_name TO role_name;

-- Grant with ability to grant to others
GRANT SELECT ON table_name TO role_name WITH GRANT OPTION;
```

### Revoking Privileges

```sql
-- Revoke specific privileges
REVOKE SELECT, INSERT ON table_name FROM role_name;

-- Revoke all privileges
REVOKE ALL PRIVILEGES ON table_name FROM role_name;

-- Revoke with cascade (removes dependent grants)
REVOKE SELECT ON table_name FROM role_name CASCADE;

-- Revoke grant option only
REVOKE GRANT OPTION FOR SELECT ON table_name FROM role_name;
```

### Default Privileges

```sql
-- Set default privileges for new tables created by role_name
ALTER DEFAULT PRIVILEGES FOR ROLE role_name
    IN SCHEMA schema_name
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO target_role;

-- Set default privileges for sequences
ALTER DEFAULT PRIVILEGES FOR ROLE role_name
    IN SCHEMA schema_name
    GRANT USAGE, SELECT ON SEQUENCES TO target_role;

-- Set default privileges for functions
ALTER DEFAULT PRIVILEGES FOR ROLE role_name
    IN SCHEMA schema_name
    GRANT EXECUTE ON FUNCTIONS TO target_role;
```

### SET ROLE

```sql
-- Switch to another role
SET ROLE role_name;

-- Switch back to original role
RESET ROLE;
-- OR
SET ROLE NONE;
```

### Viewing Roles and Privileges

```sql
-- List all roles
\du
SELECT * FROM pg_roles;

-- Current role
SELECT current_user, session_user;

-- Roles current user is a member of
SELECT * FROM pg_roles WHERE oid IN (SELECT roleid FROM pg_auth_members WHERE member = (SELECT oid FROM pg_roles WHERE rolname = current_user));

-- Table privileges
\dp table_name
SELECT * FROM information_schema.table_privileges WHERE table_name = 'table_name';

-- Schema privileges
\dn+
SELECT * FROM information_schema.schema_privileges;
```

## Examples

### Example 1: Creating User Accounts with Different Permissions

```sql
-- Create application database
CREATE DATABASE app_db;
\c app_db

-- Create schema for application
CREATE SCHEMA app;

-- Create different user roles

-- 1. Admin user - can manage database objects
CREATE ROLE admin_user WITH
    LOGIN
    PASSWORD 'admin_secure_password'
    CREATEDB
    CREATEROLE
    VALID UNTIL 'infinity';

-- 2. Application user - read/write access to app data
CREATE ROLE app_user WITH
    LOGIN
    PASSWORD 'app_secure_password'
    CONNECTION LIMIT 50;

-- 3. Read-only user - for reporting/analytics
CREATE ROLE readonly_user WITH
    LOGIN
    PASSWORD 'readonly_password'
    CONNECTION LIMIT 10;

-- 4. Backup user - for backup operations
CREATE ROLE backup_user WITH
    LOGIN
    PASSWORD 'backup_password'
    REPLICATION;

-- Grant database connection to all users
GRANT CONNECT ON DATABASE app_db TO admin_user, app_user, readonly_user, backup_user;

-- Grant schema usage
GRANT USAGE ON SCHEMA app TO admin_user, app_user, readonly_user;

-- Grant schema creation to admin
GRANT CREATE ON SCHEMA app TO admin_user;

-- Create sample table
SET ROLE admin_user;
CREATE TABLE app.users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE app.orders (
    order_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES app.users(user_id),
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_amount NUMERIC(10, 2)
);

RESET ROLE;

-- Grant appropriate permissions

-- App user: Full CRUD on all tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app TO app_user;

-- Readonly user: SELECT only
GRANT SELECT ON ALL TABLES IN SCHEMA app TO readonly_user;

-- Test permissions
SET ROLE app_user;
INSERT INTO app.users (username, email) VALUES ('alice', 'alice@example.com');
SELECT * FROM app.users;

SET ROLE readonly_user;
SELECT * FROM app.users;
-- This will fail:
-- INSERT INTO app.users (username, email) VALUES ('bob', 'bob@example.com');

RESET ROLE;
```

### Example 2: Role Groups and Membership

```sql
-- Create role groups for different access levels

-- 1. Create group roles (no LOGIN)
CREATE ROLE developers;
CREATE ROLE analysts;
CREATE ROLE managers;

-- 2. Create individual user accounts
CREATE ROLE alice WITH LOGIN PASSWORD 'alice_pass';
CREATE ROLE bob WITH LOGIN PASSWORD 'bob_pass';
CREATE ROLE charlie WITH LOGIN PASSWORD 'charlie_pass';

-- 3. Grant role memberships
GRANT developers TO alice;
GRANT developers TO bob;
GRANT analysts TO charlie;
GRANT managers TO alice;  -- Alice is both developer and manager

-- 4. Create tables and schemas
CREATE SCHEMA development;
CREATE SCHEMA analytics;
CREATE SCHEMA management;

CREATE TABLE development.projects (
    project_id SERIAL PRIMARY KEY,
    project_name VARCHAR(100),
    status VARCHAR(20)
);

CREATE TABLE analytics.reports (
    report_id SERIAL PRIMARY KEY,
    report_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE management.budgets (
    budget_id SERIAL PRIMARY KEY,
    department VARCHAR(50),
    amount NUMERIC(12, 2)
);

-- 5. Grant privileges to group roles

-- Developers: Full access to development schema
GRANT USAGE, CREATE ON SCHEMA development TO developers;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA development TO developers;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA development TO developers;

-- Analysts: Read access to development, full access to analytics
GRANT USAGE ON SCHEMA development TO analysts;
GRANT SELECT ON ALL TABLES IN SCHEMA development TO analysts;
GRANT USAGE, CREATE ON SCHEMA analytics TO analysts;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA analytics TO analysts;

-- Managers: Read access to all schemas
GRANT USAGE ON SCHEMA development, analytics, management TO managers;
GRANT SELECT ON ALL TABLES IN SCHEMA development TO managers;
GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO managers;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA management TO managers;

-- 6. Set default privileges for future objects

-- Tables created by developers are accessible to analysts (read-only)
ALTER DEFAULT PRIVILEGES FOR ROLE alice, bob IN SCHEMA development
    GRANT SELECT ON TABLES TO analysts;

-- Tables created by analysts are accessible to managers
ALTER DEFAULT PRIVILEGES FOR ROLE charlie IN SCHEMA analytics
    GRANT SELECT ON TABLES TO managers;

-- 7. Test role inheritance
SET ROLE alice;
SELECT current_user;  -- alice
-- Alice inherits developers and managers privileges automatically

INSERT INTO development.projects (project_name, status) VALUES ('New App', 'active');
SELECT * FROM development.projects;
SELECT * FROM analytics.reports;  -- Can read via managers role
SELECT * FROM management.budgets;  -- Can read/write via managers role

-- Test Charlie (analyst)
SET ROLE charlie;
SELECT * FROM development.projects;  -- Can read via analysts role
-- Cannot write to development:
-- INSERT INTO development.projects (project_name, status) VALUES ('Test', 'active');

RESET ROLE;
```

### Example 3: Using SET ROLE with NOINHERIT

```sql
-- Create roles with NOINHERIT to control privilege access

-- Create group role
CREATE ROLE sensitive_data_access;

-- Create user with NOINHERIT
CREATE ROLE david WITH
    LOGIN
    PASSWORD 'david_pass'
    NOINHERIT;  -- Must explicitly SET ROLE to use group privileges

-- Grant membership
GRANT sensitive_data_access TO david;

-- Create sensitive table
CREATE SCHEMA confidential;
CREATE TABLE confidential.salaries (
    employee_id INTEGER PRIMARY KEY,
    employee_name VARCHAR(100),
    salary NUMERIC(10, 2)
);

-- Grant access to sensitive_data_access role
GRANT USAGE ON SCHEMA confidential TO sensitive_data_access;
GRANT SELECT ON confidential.salaries TO sensitive_data_access;

-- Test NOINHERIT behavior
SET ROLE david;

-- This fails - david doesn't inherit privileges automatically
-- SELECT * FROM confidential.salaries;

-- Must explicitly set role to access
SET ROLE sensitive_data_access;
SELECT * FROM confidential.salaries;  -- Now works

-- Check current role vs session user
SELECT current_user, session_user;
-- current_user: sensitive_data_access
-- session_user: david

-- Reset to original role
RESET ROLE;
```

### Example 4: ALTER DEFAULT PRIVILEGES for Application

```sql
-- Setup for multi-tenant application with automatic permissions

-- Create schemas
CREATE SCHEMA tenant_shared;
CREATE SCHEMA tenant_a;
CREATE SCHEMA tenant_b;

-- Create roles
CREATE ROLE app_owner WITH LOGIN PASSWORD 'owner_pass' CREATEDB CREATEROLE;
CREATE ROLE app_service WITH LOGIN PASSWORD 'service_pass';
CREATE ROLE tenant_a_user WITH LOGIN PASSWORD 'tenant_a_pass';
CREATE ROLE tenant_b_user WITH LOGIN PASSWORD 'tenant_b_pass';

-- Grant schema access
GRANT USAGE ON SCHEMA tenant_shared TO app_service, tenant_a_user, tenant_b_user;
GRANT USAGE ON SCHEMA tenant_a TO app_service, tenant_a_user;
GRANT USAGE ON SCHEMA tenant_b TO app_service, tenant_b_user;

-- Set up default privileges for shared schema
-- Any table created by app_owner in tenant_shared is accessible to app_service
ALTER DEFAULT PRIVILEGES FOR ROLE app_owner IN SCHEMA tenant_shared
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_service;

ALTER DEFAULT PRIVILEGES FOR ROLE app_owner IN SCHEMA tenant_shared
    GRANT USAGE, SELECT ON SEQUENCES TO app_service;

-- Tenant-specific default privileges
ALTER DEFAULT PRIVILEGES FOR ROLE app_owner IN SCHEMA tenant_a
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO tenant_a_user;

ALTER DEFAULT PRIVILEGES FOR ROLE app_owner IN SCHEMA tenant_b
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO tenant_b_user;

-- Create tables as app_owner
SET ROLE app_owner;

CREATE TABLE tenant_shared.products (
    product_id SERIAL PRIMARY KEY,
    product_name VARCHAR(100),
    price NUMERIC(10, 2)
);

CREATE TABLE tenant_a.orders (
    order_id SERIAL PRIMARY KEY,
    product_id INTEGER,
    quantity INTEGER
);

CREATE TABLE tenant_b.orders (
    order_id SERIAL PRIMARY KEY,
    product_id INTEGER,
    quantity INTEGER
);

RESET ROLE;

-- Verify permissions automatically applied
SET ROLE app_service;
SELECT * FROM tenant_shared.products;  -- Works due to default privileges
INSERT INTO tenant_shared.products (product_name, price) VALUES ('Widget', 19.99);

SET ROLE tenant_a_user;
SELECT * FROM tenant_shared.products;  -- Works
INSERT INTO tenant_a.orders (product_id, quantity) VALUES (1, 5);  -- Works
-- SELECT * FROM tenant_b.orders;  -- Fails - no access

SET ROLE tenant_b_user;
INSERT INTO tenant_b.orders (product_id, quantity) VALUES (1, 3);  -- Works
-- SELECT * FROM tenant_a.orders;  -- Fails - no access

RESET ROLE;
```

### Example 5: Using Predefined Roles

```sql
-- PostgreSQL 14+ predefined roles

-- Create monitoring user using predefined roles
CREATE ROLE monitoring_user WITH LOGIN PASSWORD 'monitor_pass';

-- Grant read-only access to all data
GRANT pg_read_all_data TO monitoring_user;

-- Grant access to monitoring views
GRANT pg_monitor TO monitoring_user;

-- Test monitoring capabilities
SET ROLE monitoring_user;

-- Can read all tables
SELECT * FROM pg_stat_user_tables;
SELECT * FROM pg_stat_activity;

-- Can read configuration
SHOW all;

-- Cannot write data
-- CREATE TABLE test (id INT);  -- Fails

RESET ROLE;

-- Create read-write application user
CREATE ROLE app_readwrite WITH LOGIN PASSWORD 'rw_pass';

-- Grant read and write access to all data
GRANT pg_read_all_data TO app_readwrite;
GRANT pg_write_all_data TO app_readwrite;

SET ROLE app_readwrite;

-- Can read and write (but not create new tables)
-- Need additional CREATE privileges for that

RESET ROLE;
```

### Example 6: Complex Permission Hierarchy

```sql
-- Real-world scenario: E-commerce platform with multiple roles

-- 1. Create role hierarchy
CREATE ROLE ecommerce_admin;
CREATE ROLE ecommerce_developer;
CREATE ROLE ecommerce_analyst;
CREATE ROLE ecommerce_support;
CREATE ROLE ecommerce_customer_service;

-- 2. Create individual users
CREATE ROLE admin_john WITH LOGIN PASSWORD 'john_pass';
CREATE ROLE dev_alice WITH LOGIN PASSWORD 'alice_pass';
CREATE ROLE analyst_bob WITH LOGIN PASSWORD 'bob_pass';
CREATE ROLE support_charlie WITH LOGIN PASSWORD 'charlie_pass';
CREATE ROLE cs_diana WITH LOGIN PASSWORD 'diana_pass';

-- 3. Grant role memberships
GRANT ecommerce_admin TO admin_john WITH ADMIN OPTION;
GRANT ecommerce_developer TO dev_alice;
GRANT ecommerce_analyst TO analyst_bob;
GRANT ecommerce_support TO support_charlie;
GRANT ecommerce_customer_service TO cs_diana;

-- 4. Create schemas and tables
CREATE SCHEMA ecom;

CREATE TABLE ecom.customers (
    customer_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ecom.orders (
    order_id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES ecom.customers(customer_id),
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20),
    total_amount NUMERIC(10, 2)
);

CREATE TABLE ecom.order_items (
    item_id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES ecom.orders(order_id),
    product_name VARCHAR(100),
    quantity INTEGER,
    price NUMERIC(10, 2)
);

CREATE TABLE ecom.audit_log (
    log_id SERIAL PRIMARY KEY,
    table_name VARCHAR(100),
    action VARCHAR(20),
    user_name VARCHAR(100),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    details JSONB
);

-- 5. Grant permissions by role

-- Admin: Full access to everything
GRANT ALL PRIVILEGES ON SCHEMA ecom TO ecommerce_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA ecom TO ecommerce_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA ecom TO ecommerce_admin;

-- Developer: Full access except password hashes and audit logs
GRANT USAGE, CREATE ON SCHEMA ecom TO ecommerce_developer;
GRANT SELECT, INSERT, UPDATE, DELETE ON ecom.customers TO ecommerce_developer;
GRANT ALL PRIVILEGES ON ecom.orders, ecom.order_items TO ecommerce_developer;
GRANT SELECT ON ecom.audit_log TO ecommerce_developer;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ecom TO ecommerce_developer;

-- Revoke password access from developers
REVOKE ALL ON ecom.customers FROM ecommerce_developer;
GRANT SELECT (customer_id, email, first_name, last_name, created_at),
      INSERT (email, password_hash, first_name, last_name),
      UPDATE (email, first_name, last_name) ON ecom.customers TO ecommerce_developer;

-- Analyst: Read-only access to all tables
GRANT USAGE ON SCHEMA ecom TO ecommerce_analyst;
GRANT SELECT ON ALL TABLES IN SCHEMA ecom TO ecommerce_analyst;

-- Support: Read access to customers and orders, can update order status
GRANT USAGE ON SCHEMA ecom TO ecommerce_support;
GRANT SELECT ON ecom.customers, ecom.orders, ecom.order_items TO ecommerce_support;
GRANT UPDATE (status) ON ecom.orders TO ecommerce_support;

-- Customer Service: Similar to support but can update customer info
GRANT USAGE ON SCHEMA ecom TO ecommerce_customer_service;
GRANT SELECT ON ecom.customers, ecom.orders, ecom.order_items TO ecommerce_customer_service;
GRANT UPDATE (email, first_name, last_name) ON ecom.customers TO ecommerce_customer_service;
GRANT UPDATE (status) ON ecom.orders TO ecommerce_customer_service;

-- 6. Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA ecom
    GRANT SELECT ON TABLES TO ecommerce_analyst;

ALTER DEFAULT PRIVILEGES IN SCHEMA ecom
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ecommerce_developer;

-- 7. Test permissions
SET ROLE support_charlie;
SELECT * FROM ecom.orders WHERE order_id = 1;
UPDATE ecom.orders SET status = 'shipped' WHERE order_id = 1;  -- Works
-- UPDATE ecom.orders SET total_amount = 100 WHERE order_id = 1;  -- Fails

SET ROLE analyst_bob;
SELECT customer_id, email, COUNT(*)
FROM ecom.customers c
JOIN ecom.orders o ON c.customer_id = o.customer_id
GROUP BY customer_id, email;
-- INSERT INTO ecom.customers (...) VALUES (...);  -- Fails

RESET ROLE;
```

### Example 7: Auditing Role and Permission Usage

```sql
-- Create audit system for role usage

-- Audit table
CREATE TABLE security_audit (
    audit_id SERIAL PRIMARY KEY,
    event_type VARCHAR(50),
    role_name VARCHAR(100),
    object_name VARCHAR(200),
    action VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN,
    details TEXT
);

-- Function to log permission checks
CREATE OR REPLACE FUNCTION log_permission_check()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO security_audit (event_type, role_name, object_name, action, success, details)
    VALUES (
        TG_OP,
        current_user,
        TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
        TG_OP,
        true,
        'Row affected: ' || COALESCE(NEW.*, OLD.*)::TEXT
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply audit trigger to sensitive tables
CREATE TRIGGER audit_customers
    AFTER INSERT OR UPDATE OR DELETE ON ecom.customers
    FOR EACH ROW EXECUTE FUNCTION log_permission_check();

CREATE TRIGGER audit_orders
    AFTER INSERT OR UPDATE OR DELETE ON ecom.orders
    FOR EACH ROW EXECUTE FUNCTION log_permission_check();

-- Query to review role permissions
CREATE OR REPLACE VIEW role_permission_summary AS
SELECT
    r.rolname AS role_name,
    r.rolsuper AS is_superuser,
    r.rolcreaterole AS can_create_roles,
    r.rolcreatedb AS can_create_databases,
    r.rolcanlogin AS can_login,
    r.rolconnlimit AS connection_limit,
    ARRAY(
        SELECT b.rolname
        FROM pg_auth_members m
        JOIN pg_roles b ON m.roleid = b.oid
        WHERE m.member = r.oid
    ) AS member_of
FROM pg_roles r
WHERE r.rolname NOT LIKE 'pg_%'
ORDER BY r.rolname;

SELECT * FROM role_permission_summary;

-- View current active sessions by role
SELECT
    usename AS role_name,
    COUNT(*) AS active_connections,
    array_agg(DISTINCT application_name) AS applications,
    array_agg(DISTINCT client_addr::TEXT) AS client_addresses
FROM pg_stat_activity
WHERE usename IS NOT NULL
GROUP BY usename
ORDER BY active_connections DESC;
```

## Common Mistakes

### 1. Not Granting USAGE on Schema

```sql
-- WRONG: Granting table privileges without schema USAGE
GRANT SELECT ON my_table TO user_role;
-- User still can't access - needs USAGE on schema first

-- CORRECT:
GRANT USAGE ON SCHEMA public TO user_role;
GRANT SELECT ON my_table TO user_role;
```

### 2. Forgetting Sequence Permissions

```sql
-- WRONG: Only granting table INSERT
GRANT INSERT ON users TO app_user;
-- INSERT will fail if table has SERIAL column - no sequence access

-- CORRECT:
GRANT INSERT ON users TO app_user;
GRANT USAGE, SELECT ON SEQUENCE users_id_seq TO app_user;
-- OR for all sequences:
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
```

### 3. Not Using ALTER DEFAULT PRIVILEGES

```sql
-- WRONG: Only granting on existing tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;
-- New tables created later won't be accessible

-- CORRECT: Also set default privileges
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT ON TABLES TO readonly_user;
```

### 4. Granting Excessive Permissions

```sql
-- WRONG: Granting SUPERUSER for routine tasks
ALTER ROLE app_user WITH SUPERUSER;

-- CORRECT: Grant specific privileges needed
GRANT pg_read_all_data TO app_user;
-- Or specific table permissions
```

### 5. Not Understanding Public Access

```sql
-- WRONG: Assuming tables are private by default
CREATE TABLE sensitive_data (id INT, secret TEXT);
-- By default, PUBLIC has EXECUTE on functions and may have other access

-- CORRECT: Revoke public access if needed
REVOKE ALL ON sensitive_data FROM PUBLIC;
GRANT SELECT ON sensitive_data TO authorized_role;
```

### 6. Confusing Role Membership with Privileges

```sql
-- WRONG: Thinking role membership grants all privileges
CREATE ROLE group_role;
GRANT group_role TO user_role;
-- user_role has no privileges unless group_role has privileges

-- CORRECT: Grant privileges to the group role
GRANT SELECT ON table_name TO group_role;
GRANT group_role TO user_role;
```

## Best Practices

### 1. Principle of Least Privilege

Grant only the minimum permissions needed for each role:

```sql
-- Good: Specific permissions
GRANT SELECT (customer_id, email, first_name) ON customers TO support_role;
GRANT UPDATE (status) ON orders TO support_role;

-- Avoid: Broad permissions
-- GRANT ALL ON ALL TABLES TO support_role;
```

### 2. Use Role Groups

Organize permissions using role groups rather than granting to individual users:

```sql
-- Create logical groupings
CREATE ROLE readonly_users;
CREATE ROLE readwrite_users;
CREATE ROLE admin_users;

-- Grant privileges to groups
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_users;

-- Assign users to groups
GRANT readonly_users TO user1, user2, user3;
```

### 3. Separate Application and Admin Roles

```sql
-- Application role - limited privileges
CREATE ROLE app_role WITH LOGIN PASSWORD 'app_pass';
GRANT CONNECT ON DATABASE mydb TO app_role;
GRANT USAGE ON SCHEMA public TO app_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_role;

-- Admin role - for schema changes
CREATE ROLE admin_role WITH LOGIN PASSWORD 'admin_pass' CREATEDB CREATEROLE;
```

### 4. Use ALTER DEFAULT PRIVILEGES Consistently

```sql
-- Set up default privileges for all object types
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO app_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT EXECUTE ON FUNCTIONS TO app_role;
```

### 5. Regularly Audit Permissions

```sql
-- Create view to review permissions
CREATE OR REPLACE VIEW permission_audit AS
SELECT
    grantee,
    table_schema,
    table_name,
    string_agg(privilege_type, ', ') AS privileges
FROM information_schema.table_privileges
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
GROUP BY grantee, table_schema, table_name
ORDER BY grantee, table_schema, table_name;

-- Review regularly
SELECT * FROM permission_audit WHERE grantee = 'app_role';
```

### 6. Document Role Purposes

```sql
-- Use COMMENT to document role purposes
COMMENT ON ROLE app_role IS 'Application service account - read/write access to application tables';
COMMENT ON ROLE readonly_role IS 'Read-only access for reporting and analytics';
COMMENT ON ROLE admin_role IS 'Database administrator role for schema management';

-- View comments
SELECT rolname, pg_catalog.shobj_description(oid, 'pg_authid') AS description
FROM pg_roles
WHERE rolname NOT LIKE 'pg_%';
```

### 7. Use Strong Password Policies

```sql
-- Set password requirements
ALTER ROLE app_user WITH PASSWORD 'ComplexP@ssw0rd!2024' VALID UNTIL '2025-12-31';

-- Expire passwords regularly
ALTER ROLE app_user VALID UNTIL '2024-12-31';

-- Consider using certificate authentication instead of passwords (see 03-authentication.md)
```

## Practice Exercises

### Exercise 1: Multi-tier Application Security

Create a complete role structure for a web application with different access levels:

1. Create database and schemas for development, staging, and production
2. Create role groups: developers, testers, app_services, analysts, admins
3. Create individual user accounts and assign to groups
4. Set up appropriate permissions for each group
5. Test access from each role perspective

**Solution:**

```sql
-- Step 1: Create databases and schemas
CREATE DATABASE webapp;
\c webapp

CREATE SCHEMA dev;
CREATE SCHEMA staging;
CREATE SCHEMA prod;

-- Step 2: Create role groups
CREATE ROLE developers;
CREATE ROLE testers;
CREATE ROLE app_services;
CREATE ROLE analysts;
CREATE ROLE admins;

-- Step 3: Create individual users
CREATE ROLE alice WITH LOGIN PASSWORD 'alice_dev_pass';
CREATE ROLE bob WITH LOGIN PASSWORD 'bob_test_pass';
CREATE ROLE app_api WITH LOGIN PASSWORD 'api_service_pass';
CREATE ROLE charlie WITH LOGIN PASSWORD 'charlie_analyst_pass';
CREATE ROLE diana WITH LOGIN PASSWORD 'diana_admin_pass';

-- Grant role memberships
GRANT developers TO alice;
GRANT testers TO bob;
GRANT app_services TO app_api;
GRANT analysts TO charlie;
GRANT admins TO diana WITH ADMIN OPTION;

-- Step 4: Set up permissions

-- Admins: Full access to all schemas
GRANT ALL PRIVILEGES ON SCHEMA dev, staging, prod TO admins;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA dev, staging, prod TO admins;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA dev, staging, prod TO admins;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA dev, staging, prod TO admins;

-- Developers: Full access to dev, read access to staging
GRANT ALL PRIVILEGES ON SCHEMA dev TO developers;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA dev TO developers;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA dev TO developers;
GRANT USAGE ON SCHEMA staging TO developers;
GRANT SELECT ON ALL TABLES IN SCHEMA staging TO developers;

-- Testers: Full access to staging, read access to dev
GRANT ALL PRIVILEGES ON SCHEMA staging TO testers;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA staging TO testers;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA staging TO testers;
GRANT USAGE ON SCHEMA dev TO testers;
GRANT SELECT ON ALL TABLES IN SCHEMA dev TO testers;

-- App Services: Read/write to prod, read to staging
GRANT USAGE ON SCHEMA prod, staging TO app_services;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA prod TO app_services;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA prod TO app_services;
GRANT SELECT ON ALL TABLES IN SCHEMA staging TO app_services;

-- Analysts: Read-only to all schemas
GRANT USAGE ON SCHEMA dev, staging, prod TO analysts;
GRANT SELECT ON ALL TABLES IN SCHEMA dev, staging, prod TO analysts;

-- Set default privileges
ALTER DEFAULT PRIVILEGES FOR ROLE alice IN SCHEMA dev
    GRANT SELECT ON TABLES TO testers, analysts;

ALTER DEFAULT PRIVILEGES FOR ROLE bob IN SCHEMA staging
    GRANT SELECT ON TABLES TO app_services, analysts;

ALTER DEFAULT PRIVILEGES FOR ROLE diana IN SCHEMA prod
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_services;

-- Create sample tables
SET ROLE diana;

CREATE TABLE prod.users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE,
    email VARCHAR(255)
);

CREATE TABLE prod.sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER REFERENCES prod.users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

RESET ROLE;

-- Step 5: Test access

-- Test developer (alice) - can access dev, read staging
SET ROLE alice;
-- SELECT * FROM dev.test_table;  -- Would work if table existed
-- SELECT * FROM staging.test_table;  -- Read-only access
-- SELECT * FROM prod.users;  -- Should fail - no access

-- Test app service (app_api) - can read/write prod
SET ROLE app_api;
INSERT INTO prod.users (username, email) VALUES ('testuser', 'test@example.com');
SELECT * FROM prod.users;
-- CREATE TABLE prod.new_table (...);  -- Should fail - no CREATE privilege

-- Test analyst (charlie) - read-only everywhere
SET ROLE charlie;
SELECT * FROM prod.users;
-- INSERT INTO prod.users (...);  -- Should fail

RESET ROLE;

-- Audit current permissions
SELECT
    r.rolname,
    ARRAY_AGG(r2.rolname) AS member_of,
    r.rolcanlogin
FROM pg_roles r
LEFT JOIN pg_auth_members m ON r.oid = m.member
LEFT JOIN pg_roles r2 ON m.roleid = r2.oid
WHERE r.rolname IN ('alice', 'bob', 'app_api', 'charlie', 'diana')
GROUP BY r.rolname, r.rolcanlogin;
```

### Exercise 2: Implement Row-Level Security Preparation

Set up roles for a row-level security scenario (detailed RLS in next file):

1. Create a multi-tenant application structure
2. Create tenant-specific roles
3. Set up application role that can access all tenants
4. Configure column-level permissions for sensitive data

**Solution:**

```sql
-- Step 1: Create multi-tenant structure
CREATE TABLE tenants (
    tenant_id SERIAL PRIMARY KEY,
    tenant_name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tenant_users (
    user_id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(tenant_id),
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50),
    salary NUMERIC(10, 2),  -- Sensitive data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, username)
);

CREATE TABLE tenant_data (
    data_id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(tenant_id),
    data_type VARCHAR(50),
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample tenants
INSERT INTO tenants (tenant_name) VALUES ('Acme Corp'), ('TechStart Inc'), ('Global Services');

-- Step 2: Create tenant-specific roles
CREATE ROLE tenant_acme WITH LOGIN PASSWORD 'acme_pass';
CREATE ROLE tenant_techstart WITH LOGIN PASSWORD 'techstart_pass';
CREATE ROLE tenant_global WITH LOGIN PASSWORD 'global_pass';

-- Step 3: Create application role with full access
CREATE ROLE app_admin WITH LOGIN PASSWORD 'app_admin_pass';

-- Grant basic schema access
GRANT USAGE ON SCHEMA public TO tenant_acme, tenant_techstart, tenant_global, app_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_admin;

-- Step 4: Configure column-level permissions for tenant roles
-- Tenants can see most columns but NOT salary

-- Grant row-level access (will be filtered by RLS policies later)
GRANT SELECT (user_id, tenant_id, username, email, role, created_at),
      INSERT (tenant_id, username, email, password_hash, role),
      UPDATE (username, email, password_hash, role)
      ON tenant_users TO tenant_acme, tenant_techstart, tenant_global;

GRANT SELECT, INSERT, UPDATE, DELETE ON tenant_data TO tenant_acme, tenant_techstart, tenant_global;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO tenant_acme, tenant_techstart, tenant_global;

-- App admin can see everything including salary
GRANT SELECT, INSERT, UPDATE, DELETE ON tenant_users TO app_admin;

-- Create function to set current tenant context (for RLS)
CREATE OR REPLACE FUNCTION set_current_tenant(tid INTEGER)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_tenant_id', tid::TEXT, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION set_current_tenant TO tenant_acme, tenant_techstart, tenant_global, app_admin;

-- Insert sample data
INSERT INTO tenant_users (tenant_id, username, email, password_hash, role, salary)
VALUES
    (1, 'alice', 'alice@acme.com', 'hash1', 'admin', 75000),
    (1, 'bob', 'bob@acme.com', 'hash2', 'user', 55000),
    (2, 'charlie', 'charlie@techstart.com', 'hash3', 'admin', 80000),
    (3, 'diana', 'diana@global.com', 'hash4', 'user', 60000);

INSERT INTO tenant_data (tenant_id, data_type, content)
VALUES
    (1, 'document', 'Acme confidential data'),
    (2, 'document', 'TechStart confidential data'),
    (3, 'document', 'Global confidential data');

-- Test column-level security
SET ROLE tenant_acme;

-- Can see allowed columns
SELECT user_id, username, email, role FROM tenant_users WHERE tenant_id = 1;

-- Cannot see salary column
-- SELECT salary FROM tenant_users;  -- Fails

-- Can insert without salary
INSERT INTO tenant_users (tenant_id, username, email, password_hash, role)
VALUES (1, 'newuser', 'new@acme.com', 'hash5', 'user');

SET ROLE app_admin;

-- App admin can see everything
SELECT * FROM tenant_users;

RESET ROLE;
```

### Exercise 3: Permission Inheritance and Testing

Create a complex role hierarchy and test inheritance behavior:

1. Create a 3-level role hierarchy
2. Test INHERIT vs NOINHERIT behavior
3. Use SET ROLE to switch contexts
4. Create a permission testing function

**Solution:**

```sql
-- Step 1: Create 3-level hierarchy

-- Level 1: Base permissions
CREATE ROLE read_basic;
CREATE ROLE write_basic;

-- Level 2: Department roles
CREATE ROLE finance_team;
CREATE ROLE engineering_team;

-- Level 3: Individual users
CREATE ROLE user_inherit WITH LOGIN PASSWORD 'inherit_pass' INHERIT;
CREATE ROLE user_noinherit WITH LOGIN PASSWORD 'noinherit_pass' NOINHERIT;

-- Build hierarchy
GRANT read_basic TO finance_team;
GRANT write_basic TO engineering_team;
GRANT read_basic, write_basic TO engineering_team;  -- Engineers can read and write

GRANT finance_team TO user_inherit;
GRANT engineering_team TO user_noinherit;

-- Create test tables
CREATE TABLE public_data (id SERIAL PRIMARY KEY, value TEXT);
CREATE TABLE restricted_data (id SERIAL PRIMARY KEY, value TEXT);

-- Grant permissions to base roles
GRANT SELECT ON public_data TO read_basic;
GRANT INSERT, UPDATE ON public_data TO write_basic;
GRANT SELECT ON restricted_data TO write_basic;  -- Only write_basic can see restricted

INSERT INTO public_data (value) VALUES ('public info 1'), ('public info 2');
INSERT INTO restricted_data (value) VALUES ('restricted info 1');

-- Step 2 & 3: Test INHERIT vs NOINHERIT

-- Test INHERIT user
SET ROLE user_inherit;
SELECT current_user, session_user;

-- Can automatically access due to inheritance
SELECT * FROM public_data;  -- Works via read_basic -> finance_team -> user_inherit

-- Cannot access restricted_data (finance_team doesn't have write_basic)
-- SELECT * FROM restricted_data;  -- Fails

RESET ROLE;

-- Test NOINHERIT user
SET ROLE user_noinherit;
SELECT current_user, session_user;

-- Cannot access automatically - must SET ROLE to use permissions
-- SELECT * FROM public_data;  -- Fails - no automatic inheritance

-- Must explicitly set role
SET ROLE engineering_team;
SELECT current_user, session_user;
-- current_user: engineering_team
-- session_user: user_noinherit

-- Now can access
SELECT * FROM public_data;
SELECT * FROM restricted_data;

RESET ROLE;

-- Step 4: Create permission testing function
CREATE OR REPLACE FUNCTION test_permission(
    target_table TEXT,
    permission_type TEXT  -- 'SELECT', 'INSERT', 'UPDATE', 'DELETE'
)
RETURNS TABLE(
    current_role TEXT,
    has_permission BOOLEAN,
    test_result TEXT
) AS $$
DECLARE
    test_query TEXT;
    can_execute BOOLEAN := false;
BEGIN
    current_role := current_user;

    -- Build test query based on permission type
    CASE permission_type
        WHEN 'SELECT' THEN
            test_query := 'SELECT 1 FROM ' || target_table || ' LIMIT 1';
        WHEN 'INSERT' THEN
            test_query := 'INSERT INTO ' || target_table || ' DEFAULT VALUES';
        WHEN 'UPDATE' THEN
            test_query := 'UPDATE ' || target_table || ' SET id = id WHERE false';
        WHEN 'DELETE' THEN
            test_query := 'DELETE FROM ' || target_table || ' WHERE false';
        ELSE
            RAISE EXCEPTION 'Invalid permission type: %', permission_type;
    END CASE;

    -- Try to execute
    BEGIN
        EXECUTE test_query;
        can_execute := true;
        test_result := 'SUCCESS: Can execute ' || permission_type || ' on ' || target_table;
    EXCEPTION WHEN insufficient_privilege THEN
        can_execute := false;
        test_result := 'DENIED: Cannot execute ' || permission_type || ' on ' || target_table;
    END;

    has_permission := can_execute;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Grant execute to test users
GRANT EXECUTE ON FUNCTION test_permission TO user_inherit, user_noinherit, finance_team, engineering_team;

-- Test permissions
SET ROLE user_inherit;
SELECT * FROM test_permission('public_data', 'SELECT');
SELECT * FROM test_permission('restricted_data', 'SELECT');

SET ROLE user_noinherit;
SELECT * FROM test_permission('public_data', 'SELECT');  -- Should fail

SET ROLE engineering_team;
SELECT * FROM test_permission('public_data', 'SELECT');  -- Should succeed
SELECT * FROM test_permission('restricted_data', 'SELECT');  -- Should succeed

RESET ROLE;

-- Summary of role hierarchy
WITH RECURSIVE role_tree AS (
    SELECT
        oid,
        rolname,
        0 AS level,
        rolname::TEXT AS path
    FROM pg_roles
    WHERE rolname IN ('read_basic', 'write_basic')

    UNION ALL

    SELECT
        r.oid,
        r.rolname,
        rt.level + 1,
        rt.path || ' -> ' || r.rolname
    FROM role_tree rt
    JOIN pg_auth_members m ON rt.oid = m.roleid
    JOIN pg_roles r ON m.member = r.oid
)
SELECT
    level,
    rolname,
    path
FROM role_tree
ORDER BY path;
```

---

**Related Topics:**
- [Row-Level Security](./02-row-level-security.md)
- [Authentication Methods](./03-authentication.md)
- [Data Encryption](./04-data-encryption.md)
