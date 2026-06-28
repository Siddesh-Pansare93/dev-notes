# Multi-Tenant Database Design

## Theory

Multi-tenancy is an architecture where a single instance of software serves multiple tenants (customers/organizations). Each tenant's data is isolated from others, but they share the same application infrastructure.

### Multi-Tenancy Goals

1. **Data Isolation**: Each tenant's data is secure and separate
2. **Cost Efficiency**: Shared infrastructure reduces costs
3. **Scalability**: Support many tenants on shared resources
4. **Maintenance**: Deploy updates once for all tenants
5. **Customization**: Allow tenant-specific configurations

### Three Main Approaches

**1. Separate Database Per Tenant**
- Complete isolation
- Easiest to secure
- Most expensive
- Hard to scale beyond hundreds of tenants

**2. Shared Database, Separate Schema Per Tenant**
- Good isolation
- Moderate cost
- PostgreSQL search_path makes this elegant
- Can support thousands of tenants

**3. Shared Database, Shared Schema with Tenant ID**
- Maximum density
- Lowest cost
- Most complex queries
- Can support millions of tenants

## Approach 1: Separate Database Per Tenant

### Theory

Each tenant gets their own PostgreSQL database. Complete isolation, but higher operational overhead.

### Implementation

```sql
-- Master database: Tracks tenants and their databases
CREATE TABLE tenants (
    tenant_id SERIAL PRIMARY KEY,
    tenant_name TEXT UNIQUE NOT NULL,
    database_name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'active',
    plan_type TEXT,  -- 'free', 'basic', 'premium'
    CHECK (status IN ('active', 'suspended', 'deleted'))
);

CREATE TABLE tenant_connections (
    tenant_id INT PRIMARY KEY REFERENCES tenants(tenant_id),
    host TEXT NOT NULL,
    port INT DEFAULT 5432,
    username TEXT NOT NULL,
    connection_limit INT DEFAULT 20
);

-- Function to create new tenant database
CREATE OR REPLACE FUNCTION create_tenant_database(
    p_tenant_name TEXT,
    p_plan_type TEXT DEFAULT 'basic'
)
RETURNS TEXT AS $$
DECLARE
    v_db_name TEXT;
    v_tenant_id INT;
BEGIN
    -- Generate database name (alphanumeric only)
    v_db_name := 'tenant_' || regexp_replace(lower(p_tenant_name), '[^a-z0-9]', '', 'g');

    -- Create tenant record
    INSERT INTO tenants (tenant_name, database_name, plan_type)
    VALUES (p_tenant_name, v_db_name, p_plan_type)
    RETURNING tenant_id INTO v_tenant_id;

    -- Create the actual database (must be done outside transaction)
    -- In practice, this would be done by application code
    -- EXECUTE format('CREATE DATABASE %I', v_db_name);

    RETURN v_db_name;
END;
$$ LANGUAGE plpgsql;

-- Usage
SELECT create_tenant_database('Acme Corp', 'premium');
SELECT create_tenant_database('Beta Inc', 'basic');

-- Application logic to connect to tenant database:
-- 1. Query tenants table to get database_name
-- 2. Connect to that specific database
-- 3. All queries run in tenant's isolated database
```

### Schema Template for Tenant Databases

```sql
-- This schema is created in each tenant database
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    username TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE projects (
    project_id SERIAL PRIMARY KEY,
    project_name TEXT NOT NULL,
    owner_id INT REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tasks (
    task_id SERIAL PRIMARY KEY,
    project_id INT REFERENCES projects(project_id),
    title TEXT NOT NULL,
    status TEXT DEFAULT 'todo',
    assigned_to INT REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Each tenant database is completely isolated
```

### Pros and Cons

**Advantages:**
- Complete data isolation
- Easy to backup/restore individual tenants
- Can customize schema per tenant
- Easy to move tenant to different server
- Clear security boundary

**Disadvantages:**
- High resource overhead (connection pools per DB)
- Expensive for many tenants
- Schema migrations must run on all databases
- Difficult to query across tenants
- Database connection limit becomes bottleneck

## Approach 2: Separate Schema Per Tenant

### Theory

All tenants share one database, but each has their own schema. PostgreSQL's `search_path` makes this approach elegant.

### Implementation

```sql
-- In the shared database
CREATE TABLE tenants (
    tenant_id SERIAL PRIMARY KEY,
    tenant_name TEXT UNIQUE NOT NULL,
    schema_name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'active',
    CHECK (status IN ('active', 'suspended', 'deleted'))
);

CREATE INDEX idx_tenants_schema ON tenants(schema_name);

-- Function to create new tenant schema
CREATE OR REPLACE FUNCTION create_tenant_schema(p_tenant_name TEXT)
RETURNS TEXT AS $$
DECLARE
    v_schema_name TEXT;
    v_tenant_id INT;
BEGIN
    -- Generate schema name
    v_schema_name := 'tenant_' || regexp_replace(lower(p_tenant_name), '[^a-z0-9]', '', 'g');

    -- Create tenant record
    INSERT INTO tenants (tenant_name, schema_name)
    VALUES (p_tenant_name, v_schema_name)
    RETURNING tenant_id INTO v_tenant_id;

    -- Create schema
    EXECUTE format('CREATE SCHEMA %I', v_schema_name);

    -- Create tables in new schema (template)
    EXECUTE format('
        CREATE TABLE %I.users (
            user_id SERIAL PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            username TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )', v_schema_name);

    EXECUTE format('
        CREATE TABLE %I.projects (
            project_id SERIAL PRIMARY KEY,
            project_name TEXT NOT NULL,
            owner_id INT REFERENCES %I.users(user_id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )', v_schema_name, v_schema_name);

    EXECUTE format('
        CREATE TABLE %I.tasks (
            task_id SERIAL PRIMARY KEY,
            project_id INT REFERENCES %I.projects(project_id),
            title TEXT NOT NULL,
            status TEXT DEFAULT ''todo'',
            assigned_to INT REFERENCES %I.users(user_id)
        )', v_schema_name, v_schema_name, v_schema_name);

    RETURN v_schema_name;
END;
$$ LANGUAGE plpgsql;

-- Create tenants
SELECT create_tenant_schema('Acme Corp');
SELECT create_tenant_schema('Beta Inc');
SELECT create_tenant_schema('Gamma LLC');

-- List all tenant schemas
SELECT tenant_id, tenant_name, schema_name, status
FROM tenants
ORDER BY created_at DESC;
```

### Using search_path for Tenant Context

```sql
-- Function to set tenant context
CREATE OR REPLACE FUNCTION set_tenant_context(p_tenant_id INT)
RETURNS void AS $$
DECLARE
    v_schema_name TEXT;
BEGIN
    SELECT schema_name INTO v_schema_name
    FROM tenants
    WHERE tenant_id = p_tenant_id AND status = 'active';

    IF v_schema_name IS NULL THEN
        RAISE EXCEPTION 'Invalid or inactive tenant: %', p_tenant_id;
    END IF;

    -- Set search_path to tenant schema
    EXECUTE format('SET search_path TO %I, public', v_schema_name);
END;
$$ LANGUAGE plpgsql;

-- In application code:
-- 1. Identify tenant (from subdomain, user session, API key, etc.)
-- 2. Call set_tenant_context(tenant_id)
-- 3. All subsequent queries use tenant's schema

-- Example usage
BEGIN;
    SELECT set_tenant_context(1);  -- Acme Corp

    -- These queries automatically use tenant_acmecorp schema
    INSERT INTO users (email, username) VALUES ('alice@acme.com', 'alice');
    INSERT INTO projects (project_name, owner_id) VALUES ('Website Redesign', 1);

    SELECT * FROM projects;  -- Queries tenant_acmecorp.projects
COMMIT;

BEGIN;
    SELECT set_tenant_context(2);  -- Beta Inc

    INSERT INTO users (email, username) VALUES ('bob@beta.com', 'bob');
    SELECT * FROM projects;  -- Queries tenant_betainc.projects (different data)
COMMIT;
```

### Schema Migrations for All Tenants

```sql
-- Function to run migration across all tenant schemas
CREATE OR REPLACE FUNCTION migrate_all_tenants(p_migration_sql TEXT)
RETURNS TABLE(schema_name TEXT, success BOOLEAN, error_message TEXT) AS $$
DECLARE
    v_tenant RECORD;
BEGIN
    FOR v_tenant IN SELECT schema_name FROM tenants WHERE status = 'active'
    LOOP
        BEGIN
            EXECUTE format('SET search_path TO %I', v_tenant.schema_name);
            EXECUTE p_migration_sql;

            schema_name := v_tenant.schema_name;
            success := TRUE;
            error_message := NULL;
            RETURN NEXT;
        EXCEPTION WHEN OTHERS THEN
            schema_name := v_tenant.schema_name;
            success := FALSE;
            error_message := SQLERRM;
            RETURN NEXT;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Add a column to all tenant schemas
SELECT * FROM migrate_all_tenants('
    ALTER TABLE tasks ADD COLUMN priority INT DEFAULT 3
');

-- Create an index in all tenant schemas
SELECT * FROM migrate_all_tenants('
    CREATE INDEX idx_tasks_status ON tasks(status)
');
```

### Pros and Cons

**Advantages:**
- Good data isolation (schema-level)
- One connection pool for all tenants
- Easy to backup individual tenants (pg_dump schema)
- Can query across tenants if needed
- Lower resource overhead than separate DBs

**Disadvantages:**
- Migrations must run on all schemas
- Schema limit in PostgreSQL (~2 billion, but practical limit lower)
- More complex than shared tables
- Can't easily shard across servers

## Approach 3: Shared Tables with Tenant ID

### Theory

All tenants share the same tables. Every row has a `tenant_id` column. Use Row Level Security (RLS) to enforce isolation.

### Implementation

```sql
-- Shared tenant table
CREATE TABLE tenants (
    tenant_id SERIAL PRIMARY KEY,
    tenant_name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'active',
    plan_type TEXT,
    settings JSONB DEFAULT '{}'::jsonb
);

-- Shared user table with tenant_id
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(tenant_id),
    email TEXT NOT NULL,
    username TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, email)  -- Email unique per tenant
);

CREATE INDEX idx_users_tenant ON users(tenant_id);

-- Shared projects table
CREATE TABLE projects (
    project_id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(tenant_id),
    project_name TEXT NOT NULL,
    owner_id INT NOT NULL REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_projects_tenant ON projects(tenant_id);

-- Shared tasks table
CREATE TABLE tasks (
    task_id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(tenant_id),
    project_id INT NOT NULL REFERENCES projects(project_id),
    title TEXT NOT NULL,
    status TEXT DEFAULT 'todo',
    assigned_to INT REFERENCES users(user_id)
);

CREATE INDEX idx_tasks_tenant ON tasks(tenant_id);
CREATE INDEX idx_tasks_project ON tasks(project_id);

-- Sample tenants
INSERT INTO tenants (tenant_name, plan_type) VALUES
('Acme Corp', 'premium'),
('Beta Inc', 'basic'),
('Gamma LLC', 'basic');
```

### Row Level Security (RLS)

```sql
-- Enable RLS on all tenant tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create a function to get current tenant from session variable
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS INT AS $$
BEGIN
    RETURN current_setting('app.tenant_id', TRUE)::INT;
EXCEPTION
    WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create RLS policies
CREATE POLICY tenant_isolation_policy ON users
    USING (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_policy ON projects
    USING (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_policy ON tasks
    USING (tenant_id = current_tenant_id());

-- For INSERT, UPDATE, DELETE (if needed)
CREATE POLICY tenant_insert_policy ON users
    FOR INSERT
    WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY tenant_insert_policy ON projects
    FOR INSERT
    WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY tenant_insert_policy ON tasks
    FOR INSERT
    WITH CHECK (tenant_id = current_tenant_id());

-- Usage: Set tenant context before queries
-- In application, after authentication:
SET app.tenant_id = '1';  -- Acme Corp

-- Now all queries are automatically filtered by tenant_id
INSERT INTO users (tenant_id, email, username)
VALUES (current_tenant_id(), 'alice@acme.com', 'alice');

INSERT INTO projects (tenant_id, project_name, owner_id)
VALUES (current_tenant_id(), 'Website Redesign', 1);

-- This query only returns data for tenant_id = 1
SELECT * FROM projects;

-- Switch tenant
SET app.tenant_id = '2';  -- Beta Inc

-- Now sees only Beta Inc's data
SELECT * FROM projects;  -- Different results

-- Cross-tenant queries require superuser or bypassing RLS
```

### Additional Safeguards

```sql
-- Trigger to auto-set tenant_id on INSERT
CREATE OR REPLACE FUNCTION set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        NEW.tenant_id := current_tenant_id();
    END IF;

    IF NEW.tenant_id != current_tenant_id() THEN
        RAISE EXCEPTION 'Cannot insert data for different tenant';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_tenant_id_users
BEFORE INSERT ON users
FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER trg_set_tenant_id_projects
BEFORE INSERT ON projects
FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER trg_set_tenant_id_tasks
BEFORE INSERT ON tasks
FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

-- Prevent cross-tenant foreign keys
CREATE OR REPLACE FUNCTION check_tenant_fk()
RETURNS TRIGGER AS $$
DECLARE
    v_parent_tenant_id INT;
BEGIN
    -- Check project belongs to same tenant
    IF TG_TABLE_NAME = 'tasks' AND NEW.project_id IS NOT NULL THEN
        SELECT tenant_id INTO v_parent_tenant_id
        FROM projects
        WHERE project_id = NEW.project_id;

        IF v_parent_tenant_id != NEW.tenant_id THEN
            RAISE EXCEPTION 'Cross-tenant reference not allowed';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_tenant_fk_tasks
BEFORE INSERT OR UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION check_tenant_fk();
```

### Pros and Cons

**Advantages:**
- Maximum tenant density
- Single schema to maintain
- Easy to implement features across all tenants
- Can shard/partition by tenant_id
- Works well for millions of tenants

**Disadvantages:**
- Risk of tenant data leakage (must be very careful)
- All queries need WHERE tenant_id = X
- Can't easily customize schema per tenant
- Large tables need partitioning
- Harder to backup individual tenants

## Hybrid Approaches

### Separate DB for Large Tenants, Shared for Small

```sql
CREATE TABLE tenants (
    tenant_id SERIAL PRIMARY KEY,
    tenant_name TEXT UNIQUE NOT NULL,
    deployment_type TEXT NOT NULL,  -- 'dedicated_db', 'shared_schema', 'shared_table'
    database_name TEXT,  -- Only for dedicated_db
    schema_name TEXT,    -- Only for shared_schema
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    plan_type TEXT,
    CHECK (deployment_type IN ('dedicated_db', 'shared_schema', 'shared_table'))
);

-- Route query based on deployment type
CREATE OR REPLACE FUNCTION get_tenant_connection_info(p_tenant_id INT)
RETURNS TABLE(
    deployment_type TEXT,
    connection_details JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.deployment_type,
        CASE t.deployment_type
            WHEN 'dedicated_db' THEN jsonb_build_object('database', t.database_name)
            WHEN 'shared_schema' THEN jsonb_build_object('schema', t.schema_name)
            WHEN 'shared_table' THEN jsonb_build_object('tenant_id', t.tenant_id)
        END
    FROM tenants t
    WHERE t.tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql;

-- Application logic uses this to connect appropriately
SELECT * FROM get_tenant_connection_info(1);
```

### Shared Core Tables, Separate Custom Tables

```sql
-- Core tables shared with tenant_id
CREATE TABLE shared_users (
    user_id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL,
    email TEXT NOT NULL,
    username TEXT NOT NULL
);

-- But allow custom tables per tenant in separate schemas
-- Tenant 1 creates custom schema for their extensions
CREATE SCHEMA tenant_acmecorp_custom;

CREATE TABLE tenant_acmecorp_custom.custom_fields (
    record_id INT PRIMARY KEY,
    field1 TEXT,
    field2 INT,
    field3 JSONB
);
```

## Tenant Isolation Testing

### Test for Data Leakage

```sql
-- Function to test RLS policies
CREATE OR REPLACE FUNCTION test_tenant_isolation()
RETURNS TABLE(
    test_name TEXT,
    passed BOOLEAN,
    details TEXT
) AS $$
DECLARE
    v_tenant1_count INT;
    v_tenant2_count INT;
BEGIN
    -- Test 1: Tenant 1 can't see Tenant 2 data
    SET app.tenant_id = '1';
    SELECT COUNT(*) INTO v_tenant1_count FROM users WHERE tenant_id = 2;

    test_name := 'Tenant 1 cannot see Tenant 2 users';
    passed := (v_tenant1_count = 0);
    details := format('Found %s users from other tenant', v_tenant1_count);
    RETURN NEXT;

    -- Test 2: Tenant 2 can't see Tenant 1 data
    SET app.tenant_id = '2';
    SELECT COUNT(*) INTO v_tenant2_count FROM users WHERE tenant_id = 1;

    test_name := 'Tenant 2 cannot see Tenant 1 users';
    passed := (v_tenant2_count = 0);
    details := format('Found %s users from other tenant', v_tenant2_count);
    RETURN NEXT;

    -- Test 3: Can only insert into own tenant
    BEGIN
        SET app.tenant_id = '1';
        INSERT INTO users (tenant_id, email, username)
        VALUES (2, 'hack@example.com', 'hacker');

        test_name := 'Cannot insert into other tenant';
        passed := FALSE;
        details := 'Successfully inserted into wrong tenant (SECURITY ISSUE!)';
        RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
        test_name := 'Cannot insert into other tenant';
        passed := TRUE;
        details := 'Correctly blocked cross-tenant insert';
        RETURN NEXT;
    END;
END;
$$ LANGUAGE plpgsql;

-- Run isolation tests
SELECT * FROM test_tenant_isolation();
```

## Migration Strategies

### Migrating from Single Tenant to Multi-Tenant

```sql
-- Step 1: Add tenant_id column (nullable initially)
ALTER TABLE users ADD COLUMN tenant_id INT REFERENCES tenants(tenant_id);
ALTER TABLE projects ADD COLUMN tenant_id INT;
ALTER TABLE tasks ADD COLUMN tenant_id INT;

-- Step 2: Create first tenant for existing data
INSERT INTO tenants (tenant_name, plan_type)
VALUES ('Legacy Data', 'premium')
RETURNING tenant_id;  -- Let's say this returns 1

-- Step 3: Backfill tenant_id for existing data
UPDATE users SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE projects SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE tasks SET tenant_id = 1 WHERE tenant_id IS NULL;

-- Step 4: Make tenant_id NOT NULL
ALTER TABLE users ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE projects ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN tenant_id SET NOT NULL;

-- Step 5: Add indexes
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_projects_tenant ON projects(tenant_id);
CREATE INDEX idx_tasks_tenant ON tasks(tenant_id);

-- Step 6: Enable RLS (see RLS section above)
-- Step 7: Update application code to set tenant context
```

### Migrating Between Multi-Tenant Approaches

```sql
-- Function to migrate tenant from shared to dedicated schema
CREATE OR REPLACE FUNCTION migrate_tenant_to_schema(p_tenant_id INT)
RETURNS TEXT AS $$
DECLARE
    v_schema_name TEXT;
    v_tenant_name TEXT;
BEGIN
    SELECT tenant_name INTO v_tenant_name
    FROM tenants
    WHERE tenant_id = p_tenant_id;

    v_schema_name := create_tenant_schema(v_tenant_name);

    -- Copy data from shared tables to new schema
    EXECUTE format('
        INSERT INTO %I.users
        SELECT user_id, email, username, created_at
        FROM users
        WHERE tenant_id = $1
    ', v_schema_name) USING p_tenant_id;

    EXECUTE format('
        INSERT INTO %I.projects
        SELECT project_id, project_name, owner_id, created_at
        FROM projects
        WHERE tenant_id = $1
    ', v_schema_name) USING p_tenant_id;

    -- Delete from shared tables (or mark as migrated)
    -- DELETE FROM users WHERE tenant_id = p_tenant_id;
    -- DELETE FROM projects WHERE tenant_id = p_tenant_id;

    RETURN v_schema_name;
END;
$$ LANGUAGE plpgsql;
```

## Common Mistakes

### 1. Forgetting to Filter by tenant_id

```sql
-- WRONG: Missing tenant filter
SELECT * FROM users WHERE email = 'alice@example.com';

-- RIGHT: Always filter by tenant
SELECT * FROM users
WHERE tenant_id = current_tenant_id()
    AND email = 'alice@example.com';

-- BETTER: Use RLS so you can't forget
```

### 2. Not Indexing tenant_id

```sql
-- WRONG: No index on tenant_id
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL,
    customer_id INT
);
-- Every query does full table scan!

-- RIGHT: Composite index starting with tenant_id
CREATE INDEX idx_orders_tenant_customer ON orders(tenant_id, customer_id);
```

### 3. Allowing Cross-Tenant Foreign Keys

```sql
-- WRONG: FK without tenant check
CREATE TABLE tasks (
    task_id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL,
    project_id INT REFERENCES projects(project_id)  -- No tenant check!
);

-- RIGHT: Add trigger to validate tenant matches (see above)
```

## Best Practices

### 1. Choose Based on Scale

- **< 100 tenants**: Separate databases acceptable
- **100-10,000 tenants**: Separate schemas ideal
- **> 10,000 tenants**: Shared tables with RLS required

### 2. Always Use Connection Pooling

```sql
-- Configure pgBouncer or similar
-- Pool mode: transaction (not session) for multi-tenant
-- Ensure tenant_id is reset between transactions
```

### 3. Partition Large Tables by tenant_id

```sql
CREATE TABLE events (
    event_id BIGSERIAL,
    tenant_id INT NOT NULL,
    event_type TEXT,
    event_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) PARTITION BY HASH (tenant_id);

CREATE TABLE events_p0 PARTITION OF events FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE events_p1 PARTITION OF events FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE events_p2 PARTITION OF events FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE events_p3 PARTITION OF events FOR VALUES WITH (MODULUS 4, REMAINDER 3);
```

### 4. Monitor Per-Tenant Usage

```sql
CREATE TABLE tenant_usage_stats (
    stat_id BIGSERIAL PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(tenant_id),
    metric_name TEXT NOT NULL,
    metric_value NUMERIC,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usage_tenant_time ON tenant_usage_stats(tenant_id, recorded_at DESC);

-- Record usage periodically
INSERT INTO tenant_usage_stats (tenant_id, metric_name, metric_value)
SELECT tenant_id, 'user_count', COUNT(*)
FROM users
GROUP BY tenant_id;
```

## Practice Exercises

### Exercise 1: Implement Schema-Per-Tenant

Create a schema-per-tenant system for a simple CRM.

**Solution:**

```sql
CREATE TABLE tenants (
    tenant_id SERIAL PRIMARY KEY,
    tenant_name TEXT UNIQUE NOT NULL,
    schema_name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION create_crm_tenant(p_tenant_name TEXT)
RETURNS TEXT AS $$
DECLARE
    v_schema_name TEXT;
BEGIN
    v_schema_name := 'crm_' || regexp_replace(lower(p_tenant_name), '[^a-z0-9]', '', 'g');

    INSERT INTO tenants (tenant_name, schema_name) VALUES (p_tenant_name, v_schema_name);

    EXECUTE format('CREATE SCHEMA %I', v_schema_name);

    EXECUTE format('
        CREATE TABLE %I.contacts (
            contact_id SERIAL PRIMARY KEY,
            first_name TEXT,
            last_name TEXT,
            email TEXT,
            phone TEXT,
            company TEXT
        )', v_schema_name);

    EXECUTE format('
        CREATE TABLE %I.deals (
            deal_id SERIAL PRIMARY KEY,
            contact_id INT REFERENCES %I.contacts(contact_id),
            deal_name TEXT,
            amount NUMERIC(12, 2),
            stage TEXT,
            close_date DATE
        )', v_schema_name, v_schema_name);

    RETURN v_schema_name;
END;
$$ LANGUAGE plpgsql;

SELECT create_crm_tenant('Acme Corp');
SELECT create_crm_tenant('Beta Inc');
```

### Exercise 2: Implement RLS for Shared Tables

Set up complete RLS for a shared-table multi-tenant blog platform.

**Solution:**

```sql
CREATE TABLE tenants (
    tenant_id SERIAL PRIMARY KEY,
    tenant_name TEXT UNIQUE NOT NULL
);

CREATE TABLE blog_posts (
    post_id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(tenant_id),
    title TEXT NOT NULL,
    content TEXT,
    author_id INT NOT NULL,
    published_at TIMESTAMP
);

CREATE TABLE blog_comments (
    comment_id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(tenant_id),
    post_id INT NOT NULL REFERENCES blog_posts(post_id),
    author_id INT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_policy ON blog_posts
    USING (tenant_id = current_setting('app.tenant_id')::INT);

CREATE POLICY tenant_policy ON blog_comments
    USING (tenant_id = current_setting('app.tenant_id')::INT);

INSERT INTO tenants (tenant_name) VALUES ('Tech Blog'), ('Food Blog');

SET app.tenant_id = '1';
INSERT INTO blog_posts (tenant_id, title, author_id) VALUES (1, 'PostgreSQL Tips', 1);

SET app.tenant_id = '2';
SELECT * FROM blog_posts;  -- Empty (different tenant)
```

### Exercise 3: Build Tenant Usage Dashboard

Create views and queries for monitoring tenant resource usage.

**Solution:**

```sql
CREATE MATERIALIZED VIEW tenant_usage_summary AS
SELECT
    t.tenant_id,
    t.tenant_name,
    COUNT(DISTINCT u.user_id) as user_count,
    COUNT(DISTINCT p.project_id) as project_count,
    COUNT(DISTINCT tk.task_id) as task_count,
    pg_size_pretty(pg_total_relation_size('users')) as estimated_size
FROM tenants t
LEFT JOIN users u ON t.tenant_id = u.tenant_id
LEFT JOIN projects p ON t.tenant_id = p.tenant_id
LEFT JOIN tasks tk ON t.tenant_id = tk.tenant_id
GROUP BY t.tenant_id, t.tenant_name;

CREATE UNIQUE INDEX ON tenant_usage_summary(tenant_id);

REFRESH MATERIALIZED VIEW tenant_usage_summary;

SELECT * FROM tenant_usage_summary ORDER BY user_count DESC;
```

## Related Topics

- [Row Level Security](../12-security/03-row-level-security.md)
- [Schema Management](../02-ddl/01-create-table.md)
- [Partitioning](../09-performance/03-partitioning.md)
- [Indexes](../07-indexes/01-index-basics.md)
- [Triggers](../10-triggers/01-trigger-basics.md)
