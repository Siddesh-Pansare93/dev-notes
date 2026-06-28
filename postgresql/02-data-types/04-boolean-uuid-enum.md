# Boolean, UUID, and Enum Types

## Theory

PostgreSQL provides several specialized data types that handle specific use cases efficiently. These types offer type safety, improved performance, and clearer intent in database design.

### BOOLEAN Type

The BOOLEAN type represents true/false values with three possible states:
- **TRUE**: Represented as true, 't', 'true', 'y', 'yes', 'on', '1'
- **FALSE**: Represented as false, 'f', 'false', 'n', 'no', 'off', '0'
- **NULL**: Unknown or missing value

**Storage**: 1 byte

PostgreSQL's boolean implementation is flexible with input but strict with storage, accepting multiple representations of true/false but storing them uniformly.

### UUID Type

UUID (Universally Unique Identifier) is a 128-bit identifier that is globally unique without central coordination.

**Storage**: 16 bytes

**Advantages**:
- Globally unique without coordination
- Can be generated client-side
- Better for distributed systems
- Harder to guess (security through obscurity)

**Disadvantages**:
- Larger than INTEGER (16 bytes vs 4 bytes)
- Random UUIDs hurt index locality
- Less human-readable

**UUID Versions**:
- **v1**: Timestamp-based (reveals creation time and MAC address)
- **v4**: Random (most common, using `gen_random_uuid()`)
- **v5/v3**: Namespace-based (deterministic)
- **v7**: Timestamp-ordered (new, better for indexes)

### ENUM Types

Enumerated types are user-defined types consisting of a static, ordered set of values.

**Storage**: 4 bytes

**Advantages**:
- Type safety at database level
- Clear intent and documentation
- Compact storage
- Ordered values

**Disadvantages**:
- Schema changes required to modify values
- Cannot easily add values in middle
- Harder to share across databases

**Use Cases**: Status codes, priority levels, categories with fixed values

## Syntax

### BOOLEAN Syntax

```sql
-- Create table with boolean columns
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    is_admin BOOLEAN DEFAULT false
);

-- Boolean expressions
WHERE is_active = true
WHERE is_active  -- Shorthand for = true
WHERE NOT is_admin
WHERE is_verified IS NULL
```

### UUID Syntax

```sql
-- Create table with UUID
CREATE TABLE entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100)
);

-- UUID as foreign key
CREATE TABLE related (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID REFERENCES entities(id)
);

-- Explicit UUID value
INSERT INTO entities (id, name)
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Test');
```

### ENUM Syntax

```sql
-- Create enum type
CREATE TYPE status_type AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

-- Use enum in table
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    status status_type DEFAULT 'pending'
);

-- Insert enum values
INSERT INTO orders (status) VALUES ('approved');

-- Query enum values
SELECT * FROM orders WHERE status = 'pending';

-- List all enum values
SELECT enum_range(NULL::status_type);
```

## Examples

### BOOLEAN Examples

```sql
-- Create table with boolean flags
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    is_available BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    requires_shipping BOOLEAN DEFAULT true,
    is_digital BOOLEAN DEFAULT false
);

-- Insert with various boolean representations
INSERT INTO products (name, is_available, is_featured, requires_shipping, is_digital)
VALUES
    ('Laptop', true, false, true, false),
    ('E-book', 't', 'f', 'no', 'yes'),  -- Alternative representations
    ('Software License', 1, 0, 0, 1),   -- Numeric representations
    ('Desk Chair', 'on', 'off', 'yes', 'no');  -- Text representations

-- Query boolean columns
SELECT name, is_available, is_featured
FROM products
WHERE is_available = true;

-- Shorthand boolean queries
SELECT name FROM products WHERE is_featured;  -- TRUE
SELECT name FROM products WHERE NOT is_digital;  -- FALSE
SELECT name FROM products WHERE is_available IS NOT NULL;

-- Boolean operations
SELECT
    name,
    is_available,
    is_featured,
    is_available AND is_featured AS available_and_featured,
    is_available OR is_featured AS available_or_featured,
    NOT is_digital AS is_physical
FROM products;

-- Counting booleans
SELECT
    COUNT(*) AS total_products,
    COUNT(*) FILTER (WHERE is_available) AS available_count,
    COUNT(*) FILTER (WHERE is_featured) AS featured_count,
    COUNT(*) FILTER (WHERE is_digital) AS digital_count
FROM products;

-- Toggle boolean
UPDATE products
SET is_featured = NOT is_featured
WHERE product_id = 1;

-- Conditional boolean logic
SELECT
    name,
    CASE
        WHEN is_digital THEN 'Digital Product'
        WHEN requires_shipping THEN 'Physical Product'
        ELSE 'Unknown'
    END AS product_type
FROM products;
```

### NULL Handling with BOOLEAN

```sql
-- Create table allowing NULL booleans
CREATE TABLE user_preferences (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50),
    email_notifications BOOLEAN,  -- NULL means not set
    sms_notifications BOOLEAN,
    push_notifications BOOLEAN
);

INSERT INTO user_preferences (username, email_notifications, sms_notifications)
VALUES
    ('alice', true, false),
    ('bob', NULL, NULL),  -- Not configured
    ('charlie', false, true);

-- Three-value logic
SELECT
    username,
    email_notifications,
    email_notifications IS NULL AS not_configured,
    COALESCE(email_notifications, false) AS email_with_default
FROM user_preferences;

-- Count NULL values
SELECT
    COUNT(*) AS total_users,
    COUNT(email_notifications) AS configured_email,
    COUNT(*) - COUNT(email_notifications) AS unconfigured_email
FROM user_preferences;
```

### UUID Examples

```sql
-- Enable UUID generation (if not already enabled)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- Older method
-- Modern PostgreSQL 13+ has gen_random_uuid() built-in

-- Create table with UUID primary key
CREATE TABLE customers (
    customer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE,
    full_name VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create related table
CREATE TABLE customer_orders (
    order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(customer_id),
    order_total NUMERIC(10, 2),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Insert with auto-generated UUIDs
INSERT INTO customers (email, full_name)
VALUES
    ('alice@example.com', 'Alice Johnson'),
    ('bob@example.com', 'Bob Smith');

-- Get the generated UUIDs
SELECT customer_id, email, full_name FROM customers;

-- Insert with explicit UUID
INSERT INTO customers (customer_id, email, full_name)
VALUES
    ('550e8400-e29b-41d4-a716-446655440000', 'charlie@example.com', 'Charlie Brown');

-- Insert orders
INSERT INTO customer_orders (customer_id, order_total)
SELECT customer_id, 99.99
FROM customers
WHERE email = 'alice@example.com';

-- Query with UUID joins
SELECT
    c.full_name,
    c.email,
    o.order_id,
    o.order_total
FROM customers c
JOIN customer_orders o ON c.customer_id = o.customer_id;

-- Generate UUID without inserting
SELECT gen_random_uuid();

-- UUID comparisons (useful but order is arbitrary)
SELECT
    customer_id,
    email
FROM customers
ORDER BY customer_id;

-- UUID to string and back
SELECT
    customer_id::TEXT AS uuid_string,
    customer_id::TEXT::UUID AS back_to_uuid
FROM customers
LIMIT 1;
```

### UUID vs SERIAL Comparison

```sql
-- Serial approach (traditional)
CREATE TABLE items_serial (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100)
);

-- UUID approach (modern, distributed)
CREATE TABLE items_uuid (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100)
);

-- Insert into both
INSERT INTO items_serial (name) VALUES ('Item A'), ('Item B'), ('Item C');
INSERT INTO items_uuid (name) VALUES ('Item A'), ('Item B'), ('Item C');

-- Compare storage
SELECT
    'SERIAL' AS type,
    pg_column_size(id) AS id_size,
    pg_column_size(name) AS name_size
FROM items_serial
LIMIT 1

UNION ALL

SELECT
    'UUID' AS type,
    pg_column_size(id) AS id_size,
    pg_column_size(name) AS name_size
FROM items_uuid
LIMIT 1;

-- Predictability
SELECT id FROM items_serial;  -- Predictable: 1, 2, 3
SELECT id FROM items_uuid;    -- Random UUIDs
```

### ENUM Examples

```sql
-- Create enum types
CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'review', 'done', 'cancelled');

-- Create table using enums
CREATE TABLE tasks (
    task_id SERIAL PRIMARY KEY,
    title VARCHAR(200),
    description TEXT,
    priority priority_level DEFAULT 'medium',
    status task_status DEFAULT 'todo',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Insert with enum values
INSERT INTO tasks (title, priority, status)
VALUES
    ('Fix bug in login', 'critical', 'in_progress'),
    ('Update documentation', 'low', 'todo'),
    ('Code review PR #123', 'high', 'review'),
    ('Deploy to production', 'critical', 'done');

-- Query by enum values
SELECT title, priority, status
FROM tasks
WHERE priority = 'critical';

SELECT title, status
FROM tasks
WHERE status IN ('todo', 'in_progress');

-- Enum ordering (follows definition order)
SELECT title, priority
FROM tasks
ORDER BY priority DESC;  -- critical > high > medium > low

-- List all enum values
SELECT unnest(enum_range(NULL::priority_level)) AS priority_levels;
SELECT unnest(enum_range(NULL::task_status)) AS task_statuses;

-- Get enum value range
SELECT enum_first(NULL::priority_level) AS first_priority;
SELECT enum_last(NULL::priority_level) AS last_priority;

-- Enum comparison
SELECT
    'high'::priority_level > 'medium'::priority_level AS high_gt_medium,
    'critical'::priority_level >= 'high'::priority_level AS critical_gte_high;

-- Count by enum values
SELECT
    status,
    COUNT(*) AS task_count
FROM tasks
GROUP BY status
ORDER BY status;

-- Conditional logic with enums
SELECT
    title,
    priority,
    CASE priority
        WHEN 'critical' THEN 'Urgent - Handle immediately'
        WHEN 'high' THEN 'Important - Handle today'
        WHEN 'medium' THEN 'Normal - Handle this week'
        WHEN 'low' THEN 'Low - Handle when available'
    END AS priority_description
FROM tasks;
```

### Modifying ENUMs

```sql
-- Add new value to enum (at end)
ALTER TYPE task_status ADD VALUE 'blocked';
ALTER TYPE task_status ADD VALUE 'archived';

-- Add value before existing value
ALTER TYPE priority_level ADD VALUE 'urgent' BEFORE 'critical';

-- Add value after existing value
ALTER TYPE priority_level ADD VALUE 'trivial' AFTER 'low';

-- View updated enum
SELECT unnest(enum_range(NULL::priority_level)) AS updated_priorities;

-- Cannot remove or reorder enum values without recreating type
-- Workaround: Create new type, migrate data, drop old type

-- Example migration
CREATE TYPE priority_level_new AS ENUM ('trivial', 'low', 'medium', 'high', 'critical');

ALTER TABLE tasks
ALTER COLUMN priority TYPE priority_level_new
USING priority::TEXT::priority_level_new;

DROP TYPE priority_level;
ALTER TYPE priority_level_new RENAME TO priority_level;
```

### ENUM Caveats and Alternatives

```sql
-- ENUM limitation: Cannot easily share across databases
-- Alternative 1: Lookup table
CREATE TABLE priority_levels (
    priority_id SERIAL PRIMARY KEY,
    priority_name VARCHAR(20) UNIQUE NOT NULL,
    sort_order INTEGER
);

INSERT INTO priority_levels (priority_name, sort_order)
VALUES
    ('low', 1),
    ('medium', 2),
    ('high', 3),
    ('critical', 4);

CREATE TABLE tasks_lookup (
    task_id SERIAL PRIMARY KEY,
    title VARCHAR(200),
    priority_id INTEGER REFERENCES priority_levels(priority_id)
);

-- Alternative 2: Check constraint
CREATE TABLE tasks_constrained (
    task_id SERIAL PRIMARY KEY,
    title VARCHAR(200),
    priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high', 'critical'))
);

-- Comparison
-- ENUM: Type-safe, compact (4 bytes), ordered, but inflexible
-- Lookup table: Flexible, can add metadata, but requires joins
-- Check constraint: Simple, but no ordering guarantee, no type safety
```

### Combined Example: User Management System

```sql
-- Create enum types
CREATE TYPE user_role AS ENUM ('guest', 'user', 'moderator', 'admin');
CREATE TYPE account_status AS ENUM ('pending', 'active', 'suspended', 'deleted');

-- Create users table with all three special types
CREATE TABLE system_users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role user_role DEFAULT 'user',
    status account_status DEFAULT 'pending',
    is_verified BOOLEAN DEFAULT false,
    is_newsletter_subscribed BOOLEAN DEFAULT false,
    is_two_factor_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMPTZ
);

-- Insert sample users
INSERT INTO system_users (username, email, role, status, is_verified)
VALUES
    ('admin_user', 'admin@example.com', 'admin', 'active', true),
    ('john_doe', 'john@example.com', 'user', 'active', true),
    ('jane_smith', 'jane@example.com', 'moderator', 'active', true),
    ('pending_user', 'pending@example.com', 'user', 'pending', false);

-- Complex query combining all types
SELECT
    user_id,
    username,
    email,
    role,
    status,
    is_verified,
    is_two_factor_enabled,
    CASE
        WHEN status = 'active' AND is_verified THEN 'Full Access'
        WHEN status = 'active' AND NOT is_verified THEN 'Limited Access'
        WHEN status = 'pending' THEN 'Awaiting Activation'
        ELSE 'No Access'
    END AS access_level
FROM system_users
ORDER BY role DESC, username;

-- Statistics
SELECT
    role,
    status,
    COUNT(*) AS user_count,
    COUNT(*) FILTER (WHERE is_verified) AS verified_count,
    COUNT(*) FILTER (WHERE is_two_factor_enabled) AS two_factor_count
FROM system_users
GROUP BY role, status
ORDER BY role, status;

-- Admin users with full security
SELECT username, email
FROM system_users
WHERE role = 'admin'
  AND status = 'active'
  AND is_verified = true
  AND is_two_factor_enabled = true;
```

## Common Mistakes

### 1. Treating NULL as FALSE

```sql
-- MISTAKE: Assuming NULL is false
SELECT * FROM products WHERE is_featured;  -- Excludes NULL

-- BETTER: Handle NULL explicitly
SELECT * FROM products WHERE is_featured = true;
SELECT * FROM products WHERE COALESCE(is_featured, false) = true;
```

### 2. Using VARCHAR for UUIDs

```sql
-- MISTAKE: Storing UUID as string
CREATE TABLE bad_uuids (
    id VARCHAR(36)  -- 36 bytes + overhead
);

-- BETTER: Use UUID type
CREATE TABLE good_uuids (
    id UUID  -- 16 bytes
);
```

### 3. Hardcoding ENUM Values

```sql
-- MISTAKE: Hardcoding strings instead of using enum
SELECT * FROM tasks WHERE status = 'in_progress';  -- Typo prone

-- BETTER: Use enum casting (compile-time checking)
SELECT * FROM tasks WHERE status = 'in_progress'::task_status;
```

### 4. Overusing ENUMs

```sql
-- MISTAKE: Using enum for frequently changing values
CREATE TYPE country_code AS ENUM ('US', 'UK', 'CA'...);  -- 200+ countries!

-- BETTER: Use lookup table for large or changing sets
CREATE TABLE countries (
    code CHAR(2) PRIMARY KEY,
    name VARCHAR(100)
);
```

### 5. Not Considering ENUM Order

```sql
-- MISTAKE: Assuming alphabetical order
CREATE TYPE size AS ENUM ('small', 'large', 'medium');  -- Wrong order!

-- BETTER: Define in logical order
CREATE TYPE size AS ENUM ('small', 'medium', 'large');
```

### 6. Boolean in CHECK Constraints

```sql
-- MISTAKE: Redundant boolean check
CREATE TABLE redundant (
    is_active BOOLEAN CHECK (is_active IN (true, false))  -- Unnecessary
);

-- BETTER: Boolean already constrains to true/false/null
CREATE TABLE correct (
    is_active BOOLEAN NOT NULL  -- NULL constraint if needed
);
```

## Best Practices

### 1. Use BOOLEAN for Flags

```sql
-- Clear and efficient
CREATE TABLE settings (
    is_enabled BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false
);
```

### 2. Default BOOLEAN to NOT NULL

```sql
-- Avoid NULL for simple flags
CREATE TABLE users (
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_verified BOOLEAN NOT NULL DEFAULT false
);
```

### 3. Use UUID for Distributed Systems

```sql
-- Good for microservices, multi-region deployments
CREATE TABLE entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);
```

### 4. Use SERIAL for Single-Database Systems

```sql
-- Simpler and smaller when you don't need distribution
CREATE TABLE items (
    id SERIAL PRIMARY KEY
);
```

### 5. Document ENUM Values

```sql
-- Comment on enum types
COMMENT ON TYPE priority_level IS 'Task priority levels: low, medium, high, critical';

-- Or use descriptive names
CREATE TYPE user_subscription_tier AS ENUM ('free', 'basic', 'premium', 'enterprise');
```

### 6. Use Lookup Tables for Complex Enums

```sql
-- When you need metadata or frequent changes
CREATE TABLE statuses (
    status_id SERIAL PRIMARY KEY,
    status_code VARCHAR(20) UNIQUE,
    display_name VARCHAR(50),
    description TEXT,
    sort_order INTEGER,
    is_active BOOLEAN DEFAULT true
);
```

## Practice Exercises

### Exercise 1: Feature Flag System

Create a feature flag management system:

Requirements:
1. Create table with feature flags using UUIDs
2. Track enabled/disabled status, environment flags
3. Query features by status
4. Implement feature toggle functionality
5. Track feature usage statistics

<details>
<summary>Solution</summary>

```sql
-- Create feature flags table
CREATE TABLE feature_flags (
    flag_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flag_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    is_enabled_prod BOOLEAN NOT NULL DEFAULT false,
    is_enabled_staging BOOLEAN NOT NULL DEFAULT true,
    is_enabled_dev BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample feature flags
INSERT INTO feature_flags (flag_name, description, is_enabled, is_enabled_prod)
VALUES
    ('new_dashboard', 'New user dashboard UI', true, false),
    ('beta_checkout', 'Beta checkout flow', true, false),
    ('dark_mode', 'Dark mode theme', true, true),
    ('ai_recommendations', 'AI-powered recommendations', false, false);

-- Query enabled features
SELECT flag_name, description
FROM feature_flags
WHERE is_enabled = true
ORDER BY flag_name;

-- Environment-specific features
SELECT
    flag_name,
    is_enabled_dev AS dev,
    is_enabled_staging AS staging,
    is_enabled_prod AS prod
FROM feature_flags
ORDER BY flag_name;

-- Toggle feature
UPDATE feature_flags
SET is_enabled = NOT is_enabled,
    updated_at = CURRENT_TIMESTAMP
WHERE flag_name = 'new_dashboard';

-- Statistics
SELECT
    COUNT(*) AS total_flags,
    COUNT(*) FILTER (WHERE is_enabled) AS enabled_count,
    COUNT(*) FILTER (WHERE is_enabled_prod) AS prod_enabled_count,
    ROUND(100.0 * COUNT(*) FILTER (WHERE is_enabled) / COUNT(*), 2) AS enabled_percentage
FROM feature_flags;

-- Features not in production
SELECT flag_name, description
FROM feature_flags
WHERE is_enabled = true
  AND is_enabled_prod = false;
```

</details>

### Exercise 2: Order Management with ENUMs

Create an order management system using enums:

Requirements:
1. Create appropriate enum types for order status, payment status, shipping method
2. Create orders table with UUID primary keys
3. Insert sample orders with various statuses
4. Query orders by status and priority
5. Calculate statistics by status

<details>
<summary>Solution</summary>

```sql
-- Create enum types
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'authorized', 'captured', 'failed', 'refunded');
CREATE TYPE shipping_method AS ENUM ('standard', 'express', 'overnight', 'pickup');

-- Create orders table
CREATE TABLE orders (
    order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_email VARCHAR(255),
    order_status order_status DEFAULT 'pending',
    payment_status payment_status DEFAULT 'pending',
    shipping_method shipping_method,
    total_amount NUMERIC(10, 2),
    is_gift BOOLEAN DEFAULT false,
    requires_signature BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample orders
INSERT INTO orders (customer_email, order_status, payment_status, shipping_method, total_amount, is_gift)
VALUES
    ('alice@example.com', 'delivered', 'captured', 'standard', 99.99, false),
    ('bob@example.com', 'processing', 'authorized', 'express', 199.99, true),
    ('charlie@example.com', 'pending', 'pending', 'overnight', 49.99, false),
    ('diana@example.com', 'shipped', 'captured', 'standard', 79.99, false),
    ('eve@example.com', 'cancelled', 'refunded', 'express', 149.99, false);

-- Query by status
SELECT order_id, customer_email, total_amount
FROM orders
WHERE order_status = 'processing'
   OR order_status = 'shipped';

-- Orders needing attention (pending payment or processing)
SELECT
    order_id,
    customer_email,
    order_status,
    payment_status,
    total_amount
FROM orders
WHERE order_status IN ('pending', 'processing')
   OR payment_status = 'pending'
ORDER BY created_at;

-- Statistics by status
SELECT
    order_status,
    COUNT(*) AS order_count,
    SUM(total_amount) AS total_revenue,
    AVG(total_amount) AS avg_order_value
FROM orders
GROUP BY order_status
ORDER BY order_status;

-- Gift orders with express shipping
SELECT order_id, customer_email, total_amount
FROM orders
WHERE is_gift = true
  AND shipping_method IN ('express', 'overnight');

-- Order pipeline report
SELECT
    order_status,
    payment_status,
    COUNT(*) AS count
FROM orders
GROUP BY order_status, payment_status
ORDER BY order_status, payment_status;
```

</details>

### Exercise 3: Multi-Tenant SaaS Application

Create a multi-tenant application structure:

Requirements:
1. Use UUIDs for all primary keys
2. Create tenants table with boolean feature flags
3. Create users table with roles (enum) and status (enum)
4. Implement proper foreign key relationships
5. Query users with specific permissions and flags

<details>
<summary>Solution</summary>

```sql
-- Create enum types
CREATE TYPE subscription_tier AS ENUM ('free', 'starter', 'professional', 'enterprise');
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'member', 'guest');
CREATE TYPE user_status AS ENUM ('invited', 'active', 'inactive', 'suspended');

-- Create tenants table
CREATE TABLE tenants (
    tenant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_name VARCHAR(100) UNIQUE NOT NULL,
    subscription_tier subscription_tier DEFAULT 'free',
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_trial BOOLEAN NOT NULL DEFAULT false,
    has_custom_branding BOOLEAN DEFAULT false,
    has_api_access BOOLEAN DEFAULT false,
    has_sso BOOLEAN DEFAULT false,
    max_users INTEGER,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create users table
CREATE TABLE tenant_users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role user_role DEFAULT 'member',
    status user_status DEFAULT 'invited',
    is_verified BOOLEAN DEFAULT false,
    is_two_factor_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMPTZ,
    UNIQUE(tenant_id, email)
);

-- Insert sample tenants
INSERT INTO tenants (tenant_name, subscription_tier, has_api_access, has_sso, max_users)
VALUES
    ('Acme Corp', 'enterprise', true, true, NULL),
    ('Startup Inc', 'professional', true, false, 50),
    ('Small Business', 'starter', false, false, 10),
    ('Free User', 'free', false, false, 5);

-- Insert sample users
INSERT INTO tenant_users (tenant_id, email, full_name, role, status, is_verified)
SELECT
    tenant_id,
    'owner@' || LOWER(REPLACE(tenant_name, ' ', '')) || '.com',
    'Owner User',
    'owner',
    'active',
    true
FROM tenants;

INSERT INTO tenant_users (tenant_id, email, full_name, role, status, is_verified)
SELECT
    tenant_id,
    'admin@' || LOWER(REPLACE(tenant_name, ' ', '')) || '.com',
    'Admin User',
    'admin',
    'active',
    true
FROM tenants
WHERE subscription_tier != 'free';

-- Query enterprise tenants with SSO
SELECT
    tenant_name,
    subscription_tier,
    has_api_access,
    has_sso
FROM tenants
WHERE subscription_tier = 'enterprise'
  AND has_sso = true
  AND is_active = true;

-- Active users by tenant
SELECT
    t.tenant_name,
    t.subscription_tier,
    COUNT(u.user_id) AS active_user_count,
    t.max_users,
    CASE
        WHEN t.max_users IS NULL THEN 'Unlimited'
        WHEN COUNT(u.user_id) >= t.max_users THEN 'At Limit'
        ELSE 'Available'
    END AS user_slot_status
FROM tenants t
LEFT JOIN tenant_users u ON t.tenant_id = u.tenant_id AND u.status = 'active'
GROUP BY t.tenant_id, t.tenant_name, t.subscription_tier, t.max_users
ORDER BY active_user_count DESC;

-- Security-conscious users (verified + 2FA)
SELECT
    t.tenant_name,
    u.email,
    u.role,
    u.is_verified,
    u.is_two_factor_enabled
FROM tenant_users u
JOIN tenants t ON u.tenant_id = t.tenant_id
WHERE u.is_verified = true
  AND u.is_two_factor_enabled = true
  AND u.status = 'active';

-- Tenant feature matrix
SELECT
    tenant_name,
    subscription_tier,
    has_custom_branding,
    has_api_access,
    has_sso,
    is_trial
FROM tenants
ORDER BY
    CASE subscription_tier
        WHEN 'enterprise' THEN 4
        WHEN 'professional' THEN 3
        WHEN 'starter' THEN 2
        WHEN 'free' THEN 1
    END DESC;
```

</details>

## Related Topics

- [Numeric Types](01-numeric-types.md) - SERIAL for auto-incrementing IDs
- [Text Types](02-text-types.md) - VARCHAR for enum-like values
- [Special Types](07-special-types.md) - Composite types and other specialized types

## Additional Resources

- PostgreSQL Documentation: [Boolean Type](https://www.postgresql.org/docs/16/datatype-boolean.html)
- PostgreSQL Documentation: [UUID Type](https://www.postgresql.org/docs/16/datatype-uuid.html)
- PostgreSQL Documentation: [Enum Types](https://www.postgresql.org/docs/16/datatype-enum.html)
- PostgreSQL Documentation: [UUID Functions](https://www.postgresql.org/docs/16/functions-uuid.html)
