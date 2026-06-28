# SaaS Multi-Tenant Database Design

## Table of Contents
- [Introduction](#introduction)
- [Multi-Tenancy Strategies](#multi-tenancy-strategies)
- [Tenant Management](#tenant-management)
- [User and Role Management](#user-and-role-management)
- [Subscriptions and Billing](#subscriptions-and-billing)
- [Usage Tracking and Metering](#usage-tracking-and-metering)
- [Feature Flags](#feature-flags)
- [API Key Management](#api-key-management)
- [Audit Logging](#audit-logging)
- [Row-Level Security Implementation](#row-level-security-implementation)
- [Key Queries](#key-queries)
- [Performance Considerations](#performance-considerations)
- [Common Mistakes](#common-mistakes)
- [Best Practices](#best-practices)
- [Practice Exercises](#practice-exercises)

## Introduction

### Theory
A SaaS (Software as a Service) multi-tenant database architecture allows multiple organizations (tenants) to share the same database infrastructure while maintaining data isolation and security. This design uses the **shared-table with Row-Level Security (RLS)** approach.

**Key Requirements:**
- Complete data isolation between tenants
- Flexible subscription and billing models
- Usage tracking and quota enforcement
- Role-based access control (RBAC)
- API authentication and rate limiting
- Comprehensive audit logging
- Scalable architecture

**Multi-Tenancy Approaches:**
1. **Separate Database per Tenant**: Complete isolation, expensive
2. **Separate Schema per Tenant**: Good isolation, moderate cost
3. **Shared Tables with RLS**: Cost-effective, requires careful implementation (our choice)

## Multi-Tenancy Strategies

### Theory
The shared-table approach uses PostgreSQL's Row-Level Security to enforce tenant isolation at the database level, ensuring tenants can only access their own data.

**Advantages:**
- Cost-effective (single database)
- Easy to deploy and maintain
- Simplified backups and upgrades
- Efficient resource utilization

**Challenges:**
- Requires careful RLS policy design
- Must prevent cross-tenant data leaks
- Performance tuning needed for large tenants

## Tenant Management

### Schema

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tenants (organizations)
CREATE TABLE tenants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    domain VARCHAR(255) UNIQUE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled', 'trial')),
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    trial_ends_at TIMESTAMP,
    suspended_at TIMESTAMP,
    cancelled_at TIMESTAMP
);

CREATE INDEX idx_tenants_slug ON tenants (slug);
CREATE INDEX idx_tenants_domain ON tenants (domain);
CREATE INDEX idx_tenants_status ON tenants (status);

-- Tenant settings template
COMMENT ON COLUMN tenants.settings IS 'JSON containing tenant-specific settings: {
    "timezone": "America/New_York",
    "locale": "en_US",
    "branding": {
        "logo_url": "https://...",
        "primary_color": "#3490dc"
    },
    "features": {
        "advanced_analytics": true,
        "api_access": true
    }
}';
```

### Examples

```sql
-- Create tenant
INSERT INTO tenants (name, slug, domain, status, trial_ends_at, settings)
VALUES (
    'Acme Corporation',
    'acme-corp',
    'acme.example.com',
    'trial',
    CURRENT_TIMESTAMP + INTERVAL '14 days',
    '{
        "timezone": "America/New_York",
        "locale": "en_US",
        "branding": {
            "logo_url": "https://cdn.example.com/acme-logo.png",
            "primary_color": "#0066cc"
        }
    }'::JSONB
);

-- Update tenant status
UPDATE tenants
SET
    status = 'active',
    trial_ends_at = NULL,
    updated_at = CURRENT_TIMESTAMP
WHERE slug = 'acme-corp';

-- Suspend tenant
UPDATE tenants
SET
    status = 'suspended',
    suspended_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
WHERE id = 1;

-- Get tenant by domain
SELECT * FROM tenants WHERE domain = 'acme.example.com';
```

## User and Role Management

### Schema

```sql
-- Users (belongs to tenants)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'invited')),
    email_verified BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP,
    last_login_ip INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, email)
);

CREATE INDEX idx_users_tenant ON users (tenant_id);
CREATE INDEX idx_users_email ON users (tenant_id, email);
CREATE INDEX idx_users_status ON users (tenant_id, status);

-- Roles
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false, -- Built-in roles
    permissions JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, name)
);

CREATE INDEX idx_roles_tenant ON roles (tenant_id);

-- User role assignments
CREATE TABLE user_roles (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    granted_by INT REFERENCES users(id),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, role_id)
);

CREATE INDEX idx_user_roles_user ON user_roles (user_id);
CREATE INDEX idx_user_roles_role ON user_roles (role_id);

-- Permissions (optional granular permissions)
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    resource VARCHAR(100) NOT NULL, -- e.g., 'projects', 'users'
    action VARCHAR(50) NOT NULL, -- e.g., 'create', 'read', 'update', 'delete'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_permissions_resource ON permissions (resource, action);
```

### Examples

```sql
-- Create default roles for tenant
INSERT INTO roles (tenant_id, name, description, is_system, permissions) VALUES
    (1, 'Admin', 'Full access to all features', true, '["*"]'::JSONB),
    (1, 'Member', 'Standard user access', true, '["projects.read", "projects.create", "tasks.create", "tasks.update"]'::JSONB),
    (1, 'Viewer', 'Read-only access', true, '["projects.read", "tasks.read"]'::JSONB);

-- Create user
INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, status)
VALUES (
    1,
    'john@acme.example.com',
    crypt('SecurePassword123!', gen_salt('bf')),
    'John',
    'Doe',
    'active'
);

-- Assign role to user
INSERT INTO user_roles (user_id, role_id, granted_by)
VALUES (1, 1, NULL); -- Admin role

-- Get user with roles and permissions
SELECT
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    json_agg(json_build_object(
        'role_id', r.id,
        'role_name', r.name,
        'permissions', r.permissions
    )) AS roles
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE u.id = 1 AND u.tenant_id = 1
GROUP BY u.id;

-- Check if user has permission
CREATE OR REPLACE FUNCTION user_has_permission(
    p_user_id INT,
    p_permission VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
    v_has_permission BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM users u
        JOIN user_roles ur ON u.id = ur.user_id
        JOIN roles r ON ur.role_id = r.id
        WHERE u.id = p_user_id
          AND (
              r.permissions @> '["*"]'::JSONB OR
              r.permissions @> json_build_array(p_permission)::JSONB
          )
    ) INTO v_has_permission;

    RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test permission check
SELECT user_has_permission(1, 'projects.create');
```

## Subscriptions and Billing

### Schema

```sql
-- Subscription plans
CREATE TABLE subscription_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10, 2) NOT NULL,
    price_yearly DECIMAL(10, 2),
    billing_interval VARCHAR(20) DEFAULT 'monthly' CHECK (billing_interval IN ('monthly', 'yearly')),
    trial_days INT DEFAULT 14,
    features JSONB DEFAULT '{}',
    limits JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_plans_active ON subscription_plans (is_active, display_order);

-- Plan features and limits template
COMMENT ON COLUMN subscription_plans.features IS 'Available features: {
    "api_access": true,
    "advanced_analytics": true,
    "custom_branding": true,
    "priority_support": true
}';

COMMENT ON COLUMN subscription_plans.limits IS 'Usage limits: {
    "max_users": 10,
    "max_projects": 50,
    "max_storage_gb": 100,
    "max_api_calls_per_month": 10000
}';

-- Subscriptions
CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan_id INT NOT NULL REFERENCES subscription_plans(id),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN (
        'active', 'cancelled', 'past_due', 'trialing', 'paused'
    )),
    billing_interval VARCHAR(20) NOT NULL,
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,
    trial_ends_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    payment_provider VARCHAR(50), -- stripe, paypal, etc.
    payment_provider_subscription_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subscriptions_tenant ON subscriptions (tenant_id);
CREATE INDEX idx_subscriptions_status ON subscriptions (status, current_period_end);

-- Invoice records
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    subscription_id INT REFERENCES subscriptions(id),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN (
        'draft', 'pending', 'paid', 'failed', 'refunded'
    )),
    amount DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    billing_reason VARCHAR(50), -- subscription_create, subscription_cycle, etc.
    payment_provider VARCHAR(50),
    payment_provider_invoice_id VARCHAR(255),
    paid_at TIMESTAMP,
    due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invoices_tenant ON invoices (tenant_id, created_at DESC);
CREATE INDEX idx_invoices_subscription ON invoices (subscription_id);
CREATE INDEX idx_invoices_status ON invoices (status, due_date);
```

### Examples

```sql
-- Create subscription plans
INSERT INTO subscription_plans (name, slug, description, price_monthly, price_yearly, features, limits) VALUES
    (
        'Starter',
        'starter',
        'Perfect for small teams',
        29.00,
        290.00,
        '{"api_access": false, "advanced_analytics": false}'::JSONB,
        '{"max_users": 5, "max_projects": 10, "max_storage_gb": 10, "max_api_calls_per_month": 1000}'::JSONB
    ),
    (
        'Professional',
        'professional',
        'For growing businesses',
        99.00,
        990.00,
        '{"api_access": true, "advanced_analytics": true, "custom_branding": false}'::JSONB,
        '{"max_users": 25, "max_projects": 100, "max_storage_gb": 100, "max_api_calls_per_month": 50000}'::JSONB
    ),
    (
        'Enterprise',
        'enterprise',
        'Unlimited power',
        299.00,
        2990.00,
        '{"api_access": true, "advanced_analytics": true, "custom_branding": true, "priority_support": true}'::JSONB,
        '{"max_users": -1, "max_projects": -1, "max_storage_gb": 1000, "max_api_calls_per_month": -1}'::JSONB
    );

-- Create subscription for tenant
INSERT INTO subscriptions (
    tenant_id,
    plan_id,
    billing_interval,
    current_period_start,
    current_period_end,
    trial_ends_at,
    status
)
VALUES (
    1,
    2, -- Professional plan
    'monthly',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP + INTERVAL '1 month',
    CURRENT_TIMESTAMP + INTERVAL '14 days',
    'trialing'
);

-- Create invoice
INSERT INTO invoices (
    tenant_id,
    subscription_id,
    invoice_number,
    status,
    amount,
    tax_amount,
    total_amount,
    billing_reason,
    due_date
)
VALUES (
    1,
    1,
    'INV-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-0001',
    'pending',
    99.00,
    7.92, -- 8% tax
    106.92,
    'subscription_cycle',
    CURRENT_DATE + INTERVAL '7 days'
);

-- Get active subscription for tenant
SELECT
    s.*,
    sp.name AS plan_name,
    sp.features,
    sp.limits
FROM subscriptions s
JOIN subscription_plans sp ON s.plan_id = sp.id
WHERE s.tenant_id = 1
  AND s.status IN ('active', 'trialing')
ORDER BY s.created_at DESC
LIMIT 1;

-- Check if tenant has feature
CREATE OR REPLACE FUNCTION tenant_has_feature(
    p_tenant_id INT,
    p_feature VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
    v_has_feature BOOLEAN;
BEGIN
    SELECT COALESCE(
        (sp.features->p_feature)::BOOLEAN,
        false
    ) INTO v_has_feature
    FROM subscriptions s
    JOIN subscription_plans sp ON s.plan_id = sp.id
    WHERE s.tenant_id = p_tenant_id
      AND s.status IN ('active', 'trialing')
    ORDER BY s.created_at DESC
    LIMIT 1;

    RETURN COALESCE(v_has_feature, false);
END;
$$ LANGUAGE plpgsql;

-- Test feature check
SELECT tenant_has_feature(1, 'api_access');

-- Check usage limit
CREATE OR REPLACE FUNCTION get_tenant_limit(
    p_tenant_id INT,
    p_limit_key VARCHAR
)
RETURNS INT AS $$
DECLARE
    v_limit INT;
BEGIN
    SELECT (sp.limits->p_limit_key)::INT INTO v_limit
    FROM subscriptions s
    JOIN subscription_plans sp ON s.plan_id = sp.id
    WHERE s.tenant_id = p_tenant_id
      AND s.status IN ('active', 'trialing')
    ORDER BY s.created_at DESC
    LIMIT 1;

    RETURN COALESCE(v_limit, 0);
END;
$$ LANGUAGE plpgsql;

-- Test limit check
SELECT get_tenant_limit(1, 'max_users');
```

## Usage Tracking and Metering

### Schema

```sql
-- Usage metrics tracking
CREATE TABLE usage_metrics (
    id BIGSERIAL PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC NOT NULL DEFAULT 1,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    metadata JSONB DEFAULT '{}',
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usage_metrics_tenant_period ON usage_metrics (tenant_id, period_start, period_end);
CREATE INDEX idx_usage_metrics_name ON usage_metrics (metric_name, period_start);

-- Aggregated usage (daily rollup)
CREATE TABLE usage_aggregates (
    id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL,
    usage_date DATE NOT NULL,
    total_usage NUMERIC NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, metric_name, usage_date)
);

CREATE INDEX idx_usage_aggregates_tenant_date ON usage_aggregates (tenant_id, usage_date DESC);

-- Quota tracking
CREATE TABLE quota_usage (
    id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    quota_name VARCHAR(100) NOT NULL,
    current_usage INT NOT NULL DEFAULT 0,
    quota_limit INT NOT NULL,
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, quota_name, period_start)
);

CREATE INDEX idx_quota_usage_tenant ON quota_usage (tenant_id, period_start);
```

### Examples

```sql
-- Record usage event
INSERT INTO usage_metrics (tenant_id, metric_name, metric_value, period_start, period_end, metadata)
VALUES (
    1,
    'api_calls',
    1,
    DATE_TRUNC('month', CURRENT_DATE),
    DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day',
    '{"endpoint": "/api/v1/projects", "method": "GET"}'::JSONB
);

-- Increment quota usage
INSERT INTO quota_usage (tenant_id, quota_name, current_usage, quota_limit, period_start, period_end)
VALUES (
    1,
    'api_calls_monthly',
    1,
    50000,
    DATE_TRUNC('month', CURRENT_TIMESTAMP),
    DATE_TRUNC('month', CURRENT_TIMESTAMP) + INTERVAL '1 month'
)
ON CONFLICT (tenant_id, quota_name, period_start) DO UPDATE
SET current_usage = quota_usage.current_usage + 1,
    last_updated = CURRENT_TIMESTAMP;

-- Check quota
CREATE OR REPLACE FUNCTION check_quota(
    p_tenant_id INT,
    p_quota_name VARCHAR,
    p_increment INT DEFAULT 1
)
RETURNS TABLE (
    within_quota BOOLEAN,
    current_usage INT,
    quota_limit INT,
    usage_percentage NUMERIC
) AS $$
DECLARE
    v_period_start TIMESTAMP;
    v_period_end TIMESTAMP;
    v_limit INT;
BEGIN
    -- Determine period
    v_period_start := DATE_TRUNC('month', CURRENT_TIMESTAMP);
    v_period_end := v_period_start + INTERVAL '1 month';

    -- Get quota limit from subscription
    SELECT get_tenant_limit(p_tenant_id, p_quota_name) INTO v_limit;

    -- Get or create quota record
    INSERT INTO quota_usage (tenant_id, quota_name, current_usage, quota_limit, period_start, period_end)
    VALUES (p_tenant_id, p_quota_name, 0, v_limit, v_period_start, v_period_end)
    ON CONFLICT (tenant_id, quota_name, period_start) DO NOTHING;

    -- Return quota status
    RETURN QUERY
    SELECT
        CASE
            WHEN qu.quota_limit = -1 THEN true -- Unlimited
            WHEN qu.current_usage + p_increment <= qu.quota_limit THEN true
            ELSE false
        END,
        qu.current_usage,
        qu.quota_limit,
        CASE
            WHEN qu.quota_limit = -1 THEN 0::NUMERIC
            WHEN qu.quota_limit = 0 THEN 100::NUMERIC
            ELSE ROUND((qu.current_usage::NUMERIC / qu.quota_limit * 100), 2)
        END
    FROM quota_usage qu
    WHERE qu.tenant_id = p_tenant_id
      AND qu.quota_name = p_quota_name
      AND qu.period_start = v_period_start;
END;
$$ LANGUAGE plpgsql;

-- Test quota check
SELECT * FROM check_quota(1, 'max_api_calls_per_month', 1);

-- Aggregate daily usage
INSERT INTO usage_aggregates (tenant_id, metric_name, usage_date, total_usage)
SELECT
    tenant_id,
    metric_name,
    DATE(recorded_at),
    SUM(metric_value)
FROM usage_metrics
WHERE recorded_at >= CURRENT_DATE - INTERVAL '1 day'
  AND recorded_at < CURRENT_DATE
GROUP BY tenant_id, metric_name, DATE(recorded_at)
ON CONFLICT (tenant_id, metric_name, usage_date) DO UPDATE
SET total_usage = EXCLUDED.total_usage;

-- Get usage report
SELECT
    metric_name,
    usage_date,
    total_usage
FROM usage_aggregates
WHERE tenant_id = 1
  AND usage_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY metric_name, usage_date DESC;
```

## Feature Flags

### Schema

```sql
-- Feature flags
CREATE TABLE feature_flags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_global BOOLEAN DEFAULT false, -- Global or tenant-specific
    enabled_by_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tenant feature overrides
CREATE TABLE tenant_features (
    id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    feature_flag_id INT NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL,
    enabled_at TIMESTAMP,
    disabled_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    UNIQUE (tenant_id, feature_flag_id)
);

CREATE INDEX idx_tenant_features_tenant ON tenant_features (tenant_id);
CREATE INDEX idx_tenant_features_enabled ON tenant_features (tenant_id, is_enabled) WHERE is_enabled = true;
```

### Examples

```sql
-- Create feature flags
INSERT INTO feature_flags (name, description, enabled_by_default) VALUES
    ('advanced_reporting', 'Advanced analytics and reporting', false),
    ('beta_ui', 'New beta UI design', false),
    ('ai_assistant', 'AI-powered assistant', false),
    ('export_data', 'Data export functionality', true);

-- Enable feature for tenant
INSERT INTO tenant_features (tenant_id, feature_flag_id, is_enabled, enabled_at)
VALUES (1, 1, true, CURRENT_TIMESTAMP);

-- Check if feature is enabled
CREATE OR REPLACE FUNCTION is_feature_enabled(
    p_tenant_id INT,
    p_feature_name VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
    v_enabled BOOLEAN;
BEGIN
    SELECT COALESCE(tf.is_enabled, ff.enabled_by_default, false)
    INTO v_enabled
    FROM feature_flags ff
    LEFT JOIN tenant_features tf ON ff.id = tf.feature_flag_id AND tf.tenant_id = p_tenant_id
    WHERE ff.name = p_feature_name;

    RETURN COALESCE(v_enabled, false);
END;
$$ LANGUAGE plpgsql;

-- Test feature flag
SELECT is_feature_enabled(1, 'advanced_reporting');

-- Get all features for tenant
SELECT
    ff.name,
    ff.description,
    COALESCE(tf.is_enabled, ff.enabled_by_default) AS is_enabled
FROM feature_flags ff
LEFT JOIN tenant_features tf ON ff.id = tf.feature_flag_id AND tf.tenant_id = 1
ORDER BY ff.name;
```

## API Key Management

### Schema

```sql
-- API keys
CREATE TABLE api_keys (
    id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    key_prefix VARCHAR(10) NOT NULL, -- First 8 chars for display
    key_hash TEXT NOT NULL UNIQUE, -- SHA-256 hash of full key
    scopes JSONB DEFAULT '["read"]', -- Permissions for this key
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP
);

CREATE INDEX idx_api_keys_tenant ON api_keys (tenant_id);
CREATE INDEX idx_api_keys_user ON api_keys (user_id);
CREATE INDEX idx_api_keys_active ON api_keys (key_hash) WHERE is_active = true;

-- API key usage tracking
CREATE TABLE api_key_usage (
    id BIGSERIAL PRIMARY KEY,
    api_key_id INT NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INT,
    ip_address INET,
    user_agent TEXT,
    request_duration_ms INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_api_key_usage_key_date ON api_key_usage (api_key_id, created_at DESC);
```

### Examples

```sql
-- Create API key
CREATE OR REPLACE FUNCTION create_api_key(
    p_tenant_id INT,
    p_user_id INT,
    p_name VARCHAR,
    p_scopes JSONB DEFAULT '["read"]',
    p_expires_days INT DEFAULT NULL
)
RETURNS TABLE (
    api_key_id INT,
    api_key TEXT
) AS $$
DECLARE
    v_key TEXT;
    v_key_hash TEXT;
    v_key_prefix VARCHAR(10);
    v_expires_at TIMESTAMP;
    v_api_key_id INT;
BEGIN
    -- Generate random API key
    v_key := 'sk_' || encode(gen_random_bytes(32), 'hex');
    v_key_prefix := SUBSTRING(v_key, 1, 10);
    v_key_hash := encode(digest(v_key, 'sha256'), 'hex');

    -- Set expiration
    IF p_expires_days IS NOT NULL THEN
        v_expires_at := CURRENT_TIMESTAMP + (p_expires_days || ' days')::INTERVAL;
    END IF;

    -- Insert API key
    INSERT INTO api_keys (tenant_id, user_id, name, key_prefix, key_hash, scopes, expires_at)
    VALUES (p_tenant_id, p_user_id, p_name, v_key_prefix, v_key_hash, p_scopes, v_expires_at)
    RETURNING id INTO v_api_key_id;

    RETURN QUERY SELECT v_api_key_id, v_key;
END;
$$ LANGUAGE plpgsql;

-- Generate API key
SELECT * FROM create_api_key(
    1, -- tenant_id
    1, -- user_id
    'Production API Key',
    '["read", "write"]'::JSONB,
    365 -- expires in 1 year
);

-- Verify API key
CREATE OR REPLACE FUNCTION verify_api_key(p_api_key TEXT)
RETURNS TABLE (
    valid BOOLEAN,
    tenant_id INT,
    user_id INT,
    scopes JSONB
) AS $$
DECLARE
    v_key_hash TEXT;
BEGIN
    v_key_hash := encode(digest(p_api_key, 'sha256'), 'hex');

    RETURN QUERY
    SELECT
        true,
        ak.tenant_id,
        ak.user_id,
        ak.scopes
    FROM api_keys ak
    WHERE ak.key_hash = v_key_hash
      AND ak.is_active = true
      AND (ak.expires_at IS NULL OR ak.expires_at > CURRENT_TIMESTAMP)
      AND ak.revoked_at IS NULL;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::INT, NULL::INT, NULL::JSONB;
    END IF;

    -- Update last used
    UPDATE api_keys
    SET last_used_at = CURRENT_TIMESTAMP
    WHERE key_hash = v_key_hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revoke API key
UPDATE api_keys
SET
    is_active = false,
    revoked_at = CURRENT_TIMESTAMP
WHERE id = 1;

-- Log API key usage
INSERT INTO api_key_usage (api_key_id, endpoint, method, status_code, ip_address, request_duration_ms)
VALUES (1, '/api/v1/projects', 'GET', 200, '192.168.1.100', 45);
```

## Audit Logging

### Schema

```sql
-- Audit log
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    tenant_id INT REFERENCES tenants(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- created, updated, deleted, etc.
    resource_type VARCHAR(100) NOT NULL, -- projects, users, etc.
    resource_id VARCHAR(100),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_log_tenant_date ON audit_log (tenant_id, created_at DESC);
CREATE INDEX idx_audit_log_user ON audit_log (user_id, created_at DESC);
CREATE INDEX idx_audit_log_resource ON audit_log (resource_type, resource_id);
CREATE INDEX idx_audit_log_action ON audit_log (action, created_at DESC);

-- Partition audit log by month (optional for high volume)
-- CREATE TABLE audit_log_2024_01 PARTITION OF audit_log
-- FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

### Examples

```sql
-- Log audit event
INSERT INTO audit_log (tenant_id, user_id, action, resource_type, resource_id, new_values, ip_address)
VALUES (
    1,
    1,
    'created',
    'project',
    '123',
    '{"name": "New Project", "status": "active"}'::JSONB,
    '192.168.1.100'
);

-- Log update with before/after
INSERT INTO audit_log (tenant_id, user_id, action, resource_type, resource_id, old_values, new_values)
VALUES (
    1,
    1,
    'updated',
    'project',
    '123',
    '{"status": "active"}'::JSONB,
    '{"status": "archived"}'::JSONB
);

-- Get audit trail for resource
SELECT
    al.created_at,
    u.email AS user_email,
    al.action,
    al.old_values,
    al.new_values
FROM audit_log al
LEFT JOIN users u ON al.user_id = u.id
WHERE al.tenant_id = 1
  AND al.resource_type = 'project'
  AND al.resource_id = '123'
ORDER BY al.created_at DESC;

-- Get user activity
SELECT
    DATE(created_at) AS activity_date,
    action,
    resource_type,
    COUNT(*) AS action_count
FROM audit_log
WHERE user_id = 1
  AND created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at), action, resource_type
ORDER BY activity_date DESC, action_count DESC;
```

## Row-Level Security Implementation

### Theory
RLS ensures tenant data isolation by automatically filtering queries to return only data belonging to the current tenant.

### Implementation

```sql
-- Enable RLS on all tenant tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Set current tenant context
CREATE OR REPLACE FUNCTION set_current_tenant(p_tenant_id INT)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.current_tenant_id', p_tenant_id::TEXT, false);
END;
$$ LANGUAGE plpgsql;

-- Get current tenant
CREATE OR REPLACE FUNCTION get_current_tenant()
RETURNS INT AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_tenant_id', true), '')::INT;
END;
$$ LANGUAGE plpgsql;

-- RLS policy for users table
CREATE POLICY tenant_isolation_policy ON users
    FOR ALL
    TO PUBLIC
    USING (tenant_id = get_current_tenant())
    WITH CHECK (tenant_id = get_current_tenant());

-- RLS policy for roles
CREATE POLICY tenant_isolation_policy ON roles
    FOR ALL
    TO PUBLIC
    USING (tenant_id = get_current_tenant())
    WITH CHECK (tenant_id = get_current_tenant());

-- RLS policy for subscriptions
CREATE POLICY tenant_isolation_policy ON subscriptions
    FOR ALL
    TO PUBLIC
    USING (tenant_id = get_current_tenant())
    WITH CHECK (tenant_id = get_current_tenant());

-- RLS policy for invoices
CREATE POLICY tenant_isolation_policy ON invoices
    FOR ALL
    TO PUBLIC
    USING (tenant_id = get_current_tenant())
    WITH CHECK (tenant_id = get_current_tenant());

-- RLS policy for API keys
CREATE POLICY tenant_isolation_policy ON api_keys
    FOR ALL
    TO PUBLIC
    USING (tenant_id = get_current_tenant())
    WITH CHECK (tenant_id = get_current_tenant());

-- RLS policy for audit log
CREATE POLICY tenant_isolation_policy ON audit_log
    FOR ALL
    TO PUBLIC
    USING (tenant_id = get_current_tenant())
    WITH CHECK (tenant_id = get_current_tenant());

-- Bypass RLS for superadmin operations
CREATE ROLE saas_admin;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
CREATE POLICY admin_all_access ON users
    FOR ALL
    TO saas_admin
    USING (true)
    WITH CHECK (true);
```

### Usage Examples

```sql
-- Set tenant context for session
SELECT set_current_tenant(1);

-- All queries now automatically filtered to tenant 1
SELECT * FROM users; -- Only returns users for tenant 1
SELECT * FROM roles; -- Only returns roles for tenant 1

-- Insert automatically includes tenant_id
INSERT INTO users (tenant_id, email, password_hash, first_name, last_name)
VALUES (get_current_tenant(), 'jane@acme.com', crypt('password', gen_salt('bf')), 'Jane', 'Smith');

-- Cannot access other tenant's data
SELECT set_current_tenant(2);
SELECT * FROM users WHERE tenant_id = 1; -- Returns nothing due to RLS

-- Clear tenant context
SELECT set_config('app.current_tenant_id', '', false);
```

## Key Queries

### Examples

```sql
-- Tenant dashboard
SELECT
    t.name AS tenant_name,
    t.status,
    sp.name AS plan_name,
    s.status AS subscription_status,
    (SELECT COUNT(*) FROM users WHERE tenant_id = t.id) AS user_count,
    (SELECT SUM(total_amount) FROM invoices WHERE tenant_id = t.id AND status = 'paid') AS total_revenue
FROM tenants t
LEFT JOIN subscriptions s ON t.id = s.tenant_id AND s.status = 'active'
LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
WHERE t.id = 1;

-- Usage vs limits
SELECT
    qu.quota_name,
    qu.current_usage,
    qu.quota_limit,
    CASE
        WHEN qu.quota_limit = -1 THEN 'Unlimited'
        ELSE ROUND((qu.current_usage::NUMERIC / qu.quota_limit * 100), 2) || '%'
    END AS usage_percentage
FROM quota_usage qu
WHERE qu.tenant_id = 1
  AND qu.period_start = DATE_TRUNC('month', CURRENT_TIMESTAMP);

-- Subscription renewal forecast
SELECT
    t.name AS tenant_name,
    s.current_period_end AS renewal_date,
    sp.price_monthly AS renewal_amount,
    DATE_PART('day', s.current_period_end - CURRENT_TIMESTAMP) AS days_until_renewal
FROM tenants t
JOIN subscriptions s ON t.id = s.tenant_id
JOIN subscription_plans sp ON s.plan_id = sp.id
WHERE s.status = 'active'
  AND s.current_period_end BETWEEN CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP + INTERVAL '30 days'
ORDER BY s.current_period_end;

-- MRR (Monthly Recurring Revenue)
SELECT
    SUM(CASE WHEN s.billing_interval = 'monthly' THEN sp.price_monthly
             WHEN s.billing_interval = 'yearly' THEN sp.price_yearly / 12
        END) AS mrr
FROM subscriptions s
JOIN subscription_plans sp ON s.plan_id = sp.id
WHERE s.status = 'active';

-- Churn analysis
SELECT
    DATE_TRUNC('month', cancelled_at) AS churn_month,
    COUNT(*) AS churned_subscriptions,
    SUM(sp.price_monthly) AS churned_mrr
FROM subscriptions s
JOIN subscription_plans sp ON s.plan_id = sp.id
WHERE s.cancelled_at IS NOT NULL
  AND s.cancelled_at >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', cancelled_at)
ORDER BY churn_month DESC;
```

## Performance Considerations

### Examples

```sql
-- Composite indexes for RLS performance
CREATE INDEX idx_users_tenant_active ON users (tenant_id, status) WHERE status = 'active';
CREATE INDEX idx_audit_log_tenant_created ON audit_log (tenant_id, created_at DESC);

-- Partitioning high-volume tables
CREATE TABLE audit_log_2024 PARTITION OF audit_log
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- Materialized view for tenant analytics
CREATE MATERIALIZED VIEW tenant_analytics AS
SELECT
    t.id AS tenant_id,
    t.name,
    COUNT(DISTINCT u.id) AS total_users,
    s.plan_id,
    sp.name AS plan_name,
    qu.current_usage AS api_calls_this_month
FROM tenants t
LEFT JOIN users u ON t.id = u.tenant_id
LEFT JOIN subscriptions s ON t.id = s.tenant_id AND s.status = 'active'
LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
LEFT JOIN quota_usage qu ON t.id = qu.tenant_id
    AND qu.quota_name = 'max_api_calls_per_month'
    AND qu.period_start = DATE_TRUNC('month', CURRENT_TIMESTAMP)
WHERE t.status = 'active'
GROUP BY t.id, s.plan_id, sp.name, qu.current_usage;

CREATE UNIQUE INDEX ON tenant_analytics (tenant_id);

-- Refresh periodically
REFRESH MATERIALIZED VIEW CONCURRENTLY tenant_analytics;
```

## Common Mistakes

1. **Not setting tenant context before queries**
2. **Forgetting to include tenant_id in all tables**
3. **Not testing RLS policies thoroughly**
4. **Inadequate quota enforcement**
5. **Missing indexes on tenant_id columns**
6. **Not handling subscription state transitions**
7. **Insufficient audit logging**

## Best Practices

1. **Always set tenant context at application layer**
2. **Use RLS for automatic tenant isolation**
3. **Implement comprehensive audit logging**
4. **Track and enforce usage quotas**
5. **Provide clear subscription lifecycle management**
6. **Use feature flags for gradual rollouts**
7. **Monitor per-tenant performance**
8. **Regular security audits of RLS policies**

## Practice Exercises

### Exercise 1: Tenant Onboarding Flow
Implement complete tenant registration: create tenant, default subscription, admin user, default roles.

### Exercise 2: Usage-Based Billing
Build system to track API usage, calculate overages, and generate invoices.

### Exercise 3: Multi-Tenant Reporting
Create analytics dashboard showing per-tenant usage, revenue, and health metrics.

## Summary

This SaaS multi-tenant database design provides:
- Complete tenant isolation with RLS
- Flexible subscription and billing system
- Comprehensive usage tracking and quota enforcement
- Role-based access control (RBAC)
- Feature flag system
- API key management
- Detailed audit logging
- Scalable architecture for thousands of tenants

The design is production-ready and follows SaaS industry best practices.
