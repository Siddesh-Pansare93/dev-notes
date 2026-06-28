# Real-World Database Schemas

## Theory

This guide provides complete, production-ready schema examples for common application types. Each schema includes:

1. Complete CREATE TABLE statements
2. Proper indexes for performance
3. Foreign key relationships
4. Check constraints for data integrity
5. Key queries for common operations
6. Best practices specific to that domain

### Design Principles

- **Normalization**: Schemas are normalized to 3NF unless denormalization is justified
- **Scalability**: Designed with growth in mind (indexes, partitioning considerations)
- **Integrity**: Extensive use of constraints to maintain data quality
- **Performance**: Indexes on foreign keys and frequently queried columns
- **Flexibility**: JSONB columns for flexible attributes where appropriate

## E-Commerce Platform Schema

### Overview

A complete e-commerce system supporting products, orders, customers, payments, and reviews.

### Core Tables

```sql
-- ============================================================================
-- CUSTOMERS AND AUTHENTICATION
-- ============================================================================

CREATE TABLE customers (
    customer_id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    status TEXT DEFAULT 'active',
    email_verified BOOLEAN DEFAULT false,
    CHECK (status IN ('active', 'suspended', 'deleted'))
);

CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_status ON customers(status) WHERE status = 'active';

-- ============================================================================
-- ADDRESSES
-- ============================================================================

CREATE TABLE addresses (
    address_id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    address_type TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    recipient_name TEXT NOT NULL,
    street_address TEXT NOT NULL,
    street_address_2 TEXT,
    city TEXT NOT NULL,
    state_province TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'USA',
    phone TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (address_type IN ('billing', 'shipping'))
);

CREATE INDEX idx_addresses_customer ON addresses(customer_id);
CREATE INDEX idx_addresses_default ON addresses(customer_id, is_default) WHERE is_default = true;

-- ============================================================================
-- PRODUCT CATALOG
-- ============================================================================

CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    category_name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    parent_category_id INT REFERENCES categories(category_id),
    description TEXT,
    image_url TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_categories_parent ON categories(parent_category_id);
CREATE INDEX idx_categories_active ON categories(is_active) WHERE is_active = true;

CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    sku TEXT UNIQUE NOT NULL,
    product_name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    long_description TEXT,
    base_price NUMERIC(10, 2) NOT NULL,
    sale_price NUMERIC(10, 2),
    cost NUMERIC(10, 2),  -- For profit calculations
    stock_quantity INT NOT NULL DEFAULT 0,
    reserved_quantity INT NOT NULL DEFAULT 0,  -- In pending orders
    low_stock_threshold INT DEFAULT 10,
    weight NUMERIC(8, 2),  -- For shipping calculations
    dimensions JSONB,  -- {length, width, height}
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP,
    CHECK (base_price >= 0),
    CHECK (sale_price IS NULL OR sale_price >= 0),
    CHECK (sale_price IS NULL OR sale_price < base_price),
    CHECK (stock_quantity >= 0),
    CHECK (reserved_quantity >= 0),
    CHECK (reserved_quantity <= stock_quantity)
);

CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_active ON products(is_active) WHERE is_active = true;
CREATE INDEX idx_products_featured ON products(is_featured) WHERE is_featured = true;
CREATE INDEX idx_products_price ON products(base_price);

CREATE TABLE product_categories (
    product_id INT REFERENCES products(product_id) ON DELETE CASCADE,
    category_id INT REFERENCES categories(category_id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, category_id)
);

CREATE INDEX idx_product_categories_category ON product_categories(category_id);

CREATE TABLE product_images (
    image_id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    alt_text TEXT,
    display_order INT DEFAULT 0,
    is_primary BOOLEAN DEFAULT false
);

CREATE INDEX idx_product_images_product ON product_images(product_id);

-- Product variants (e.g., size, color)
CREATE TABLE product_variants (
    variant_id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    sku TEXT UNIQUE NOT NULL,
    variant_name TEXT NOT NULL,
    attributes JSONB NOT NULL,  -- {color: "Red", size: "L"}
    price_adjustment NUMERIC(10, 2) DEFAULT 0,
    stock_quantity INT NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_variants_product ON product_variants(product_id);
CREATE INDEX idx_variants_attributes ON product_variants USING GIN (attributes);

-- ============================================================================
-- SHOPPING CART
-- ============================================================================

CREATE TABLE shopping_carts (
    cart_id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(customer_id) ON DELETE CASCADE,
    session_id TEXT,  -- For guest users
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP + INTERVAL '30 days',
    CONSTRAINT cart_owner_check CHECK (
        (customer_id IS NOT NULL AND session_id IS NULL) OR
        (customer_id IS NULL AND session_id IS NOT NULL)
    )
);

CREATE INDEX idx_carts_customer ON shopping_carts(customer_id);
CREATE INDEX idx_carts_session ON shopping_carts(session_id);
CREATE INDEX idx_carts_expires ON shopping_carts(expires_at);

CREATE TABLE cart_items (
    cart_item_id SERIAL PRIMARY KEY,
    cart_id INT NOT NULL REFERENCES shopping_carts(cart_id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(product_id),
    variant_id INT REFERENCES product_variants(variant_id),
    quantity INT NOT NULL CHECK (quantity > 0),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cart_id, product_id, variant_id)
);

CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX idx_cart_items_product ON cart_items(product_id);

-- ============================================================================
-- ORDERS
-- ============================================================================

CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,
    customer_id INT NOT NULL REFERENCES customers(customer_id),
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'pending',

    -- Pricing
    subtotal NUMERIC(10, 2) NOT NULL,
    tax_amount NUMERIC(10, 2) DEFAULT 0,
    shipping_cost NUMERIC(10, 2) DEFAULT 0,
    discount_amount NUMERIC(10, 2) DEFAULT 0,
    total_amount NUMERIC(10, 2) NOT NULL,

    -- Addresses (denormalized snapshot)
    shipping_address_id INT REFERENCES addresses(address_id),
    shipping_address JSONB NOT NULL,  -- Snapshot of address at order time
    billing_address JSONB NOT NULL,

    -- Shipping
    shipping_method TEXT,
    tracking_number TEXT,
    shipped_at TIMESTAMP,
    delivered_at TIMESTAMP,

    -- Notes
    customer_notes TEXT,
    internal_notes TEXT,

    -- Timestamps
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP,

    CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
    CHECK (total_amount >= 0),
    CHECK (subtotal >= 0),
    CHECK (tax_amount >= 0),
    CHECK (shipping_cost >= 0),
    CHECK (discount_amount >= 0)
);

CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_date ON orders(order_date DESC);
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_tracking ON orders(tracking_number) WHERE tracking_number IS NOT NULL;

CREATE TABLE order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(product_id),
    variant_id INT REFERENCES product_variants(variant_id),

    -- Snapshot at time of order
    product_name TEXT NOT NULL,
    product_sku TEXT NOT NULL,
    variant_attributes JSONB,

    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL,
    tax_amount NUMERIC(10, 2) DEFAULT 0,
    total NUMERIC(10, 2) NOT NULL,

    UNIQUE(order_id, product_id, variant_id)
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

-- ============================================================================
-- PAYMENTS
-- ============================================================================

CREATE TABLE payments (
    payment_id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(order_id),
    payment_method TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'pending',
    transaction_id TEXT,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    gateway_response JSONB,  -- Store full gateway response
    CHECK (payment_method IN ('credit_card', 'debit_card', 'paypal', 'stripe', 'bank_transfer')),
    CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    CHECK (amount > 0)
);

CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_transaction ON payments(transaction_id);

-- ============================================================================
-- DISCOUNT CODES
-- ============================================================================

CREATE TABLE discount_codes (
    code_id SERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    discount_type TEXT NOT NULL,
    discount_value NUMERIC(10, 2) NOT NULL,
    min_purchase_amount NUMERIC(10, 2),
    max_discount_amount NUMERIC(10, 2),
    usage_limit INT,
    usage_count INT DEFAULT 0,
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    CHECK (discount_type IN ('percentage', 'fixed_amount', 'free_shipping')),
    CHECK (discount_value > 0),
    CHECK (usage_count >= 0),
    CHECK (usage_limit IS NULL OR usage_count <= usage_limit)
);

CREATE INDEX idx_discount_codes_code ON discount_codes(code) WHERE is_active = true;
CREATE INDEX idx_discount_codes_active ON discount_codes(is_active, valid_from, valid_until);

-- Track which customers used which codes
CREATE TABLE discount_code_usage (
    usage_id SERIAL PRIMARY KEY,
    code_id INT NOT NULL REFERENCES discount_codes(code_id),
    customer_id INT NOT NULL REFERENCES customers(customer_id),
    order_id INT NOT NULL REFERENCES orders(order_id),
    discount_amount NUMERIC(10, 2) NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_code_usage_code ON discount_code_usage(code_id);
CREATE INDEX idx_code_usage_customer ON discount_code_usage(customer_id);

-- ============================================================================
-- REVIEWS AND RATINGS
-- ============================================================================

CREATE TABLE product_reviews (
    review_id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    customer_id INT NOT NULL REFERENCES customers(customer_id),
    order_id INT REFERENCES orders(order_id),  -- Verified purchase
    rating INT NOT NULL,
    title TEXT,
    review_text TEXT,
    is_verified_purchase BOOLEAN DEFAULT false,
    is_approved BOOLEAN DEFAULT false,
    helpful_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (rating BETWEEN 1 AND 5),
    CHECK (helpful_count >= 0),
    UNIQUE(product_id, customer_id, order_id)
);

CREATE INDEX idx_reviews_product ON product_reviews(product_id);
CREATE INDEX idx_reviews_customer ON product_reviews(customer_id);
CREATE INDEX idx_reviews_approved ON product_reviews(is_approved) WHERE is_approved = true;

-- ============================================================================
-- INVENTORY TRACKING
-- ============================================================================

CREATE TABLE inventory_transactions (
    transaction_id BIGSERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES products(product_id),
    variant_id INT REFERENCES product_variants(variant_id),
    transaction_type TEXT NOT NULL,
    quantity_change INT NOT NULL,
    quantity_after INT NOT NULL,
    reference_id INT,  -- order_id, return_id, etc.
    reference_type TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    CHECK (transaction_type IN ('purchase', 'sale', 'return', 'adjustment', 'damaged'))
);

CREATE INDEX idx_inventory_product ON inventory_transactions(product_id, created_at DESC);
CREATE INDEX idx_inventory_reference ON inventory_transactions(reference_type, reference_id);
```

### Key Queries

```sql
-- ============================================================================
-- COMMON E-COMMERCE QUERIES
-- ============================================================================

-- 1. Get product details with category and images
SELECT
    p.product_id,
    p.product_name,
    p.base_price,
    p.sale_price,
    p.stock_quantity,
    array_agg(DISTINCT c.category_name) as categories,
    (SELECT image_url FROM product_images WHERE product_id = p.product_id AND is_primary = true LIMIT 1) as primary_image,
    COUNT(DISTINCT pr.review_id) as review_count,
    AVG(pr.rating) as avg_rating
FROM products p
LEFT JOIN product_categories pc ON p.product_id = pc.product_id
LEFT JOIN categories c ON pc.category_id = c.category_id
LEFT JOIN product_reviews pr ON p.product_id = pr.product_id AND pr.is_approved = true
WHERE p.is_active = true
GROUP BY p.product_id
ORDER BY p.product_name;

-- 2. Get customer order history
SELECT
    o.order_number,
    o.order_date,
    o.status,
    o.total_amount,
    COUNT(oi.order_item_id) as item_count
FROM orders o
LEFT JOIN order_items oi ON o.order_id = oi.order_id
WHERE o.customer_id = 1
GROUP BY o.order_id, o.order_number, o.order_date, o.status, o.total_amount
ORDER BY o.order_date DESC;

-- 3. Calculate cart total
SELECT
    sc.cart_id,
    SUM(
        CASE
            WHEN p.sale_price IS NOT NULL THEN p.sale_price * ci.quantity
            ELSE p.base_price * ci.quantity
        END
    ) as cart_total,
    COUNT(ci.cart_item_id) as item_count
FROM shopping_carts sc
JOIN cart_items ci ON sc.cart_id = ci.cart_id
JOIN products p ON ci.product_id = p.product_id
WHERE sc.customer_id = 1
GROUP BY sc.cart_id;

-- 4. Top selling products
SELECT
    p.product_name,
    SUM(oi.quantity) as units_sold,
    SUM(oi.total) as revenue
FROM order_items oi
JOIN products p ON oi.product_id = p.product_id
JOIN orders o ON oi.order_id = o.order_id
WHERE o.status IN ('delivered', 'shipped')
    AND o.order_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY p.product_id, p.product_name
ORDER BY revenue DESC
LIMIT 10;

-- 5. Low stock alert
SELECT
    product_name,
    sku,
    stock_quantity,
    reserved_quantity,
    stock_quantity - reserved_quantity as available_quantity,
    low_stock_threshold
FROM products
WHERE stock_quantity <= low_stock_threshold
    AND is_active = true
ORDER BY stock_quantity;

-- 6. Customer lifetime value
SELECT
    c.customer_id,
    c.email,
    c.first_name || ' ' || c.last_name as name,
    COUNT(o.order_id) as order_count,
    SUM(o.total_amount) as lifetime_value,
    AVG(o.total_amount) as avg_order_value,
    MAX(o.order_date) as last_order_date
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id
    AND o.status IN ('delivered', 'shipped')
GROUP BY c.customer_id, c.email, c.first_name, c.last_name
HAVING COUNT(o.order_id) > 0
ORDER BY lifetime_value DESC;

-- 7. Apply discount code to order
CREATE OR REPLACE FUNCTION apply_discount(
    p_order_id INT,
    p_code TEXT
)
RETURNS NUMERIC AS $$
DECLARE
    v_code_id INT;
    v_discount_type TEXT;
    v_discount_value NUMERIC;
    v_min_purchase NUMERIC;
    v_max_discount NUMERIC;
    v_subtotal NUMERIC;
    v_discount_amount NUMERIC;
BEGIN
    -- Validate code
    SELECT code_id, discount_type, discount_value, min_purchase_amount, max_discount_amount
    INTO v_code_id, v_discount_type, v_discount_value, v_min_purchase, v_max_discount
    FROM discount_codes
    WHERE code = p_code
        AND is_active = true
        AND (valid_from IS NULL OR valid_from <= CURRENT_TIMESTAMP)
        AND (valid_until IS NULL OR valid_until >= CURRENT_TIMESTAMP)
        AND (usage_limit IS NULL OR usage_count < usage_limit);

    IF v_code_id IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired discount code';
    END IF;

    -- Get order subtotal
    SELECT subtotal INTO v_subtotal FROM orders WHERE order_id = p_order_id;

    -- Check minimum purchase
    IF v_min_purchase IS NOT NULL AND v_subtotal < v_min_purchase THEN
        RAISE EXCEPTION 'Minimum purchase amount not met';
    END IF;

    -- Calculate discount
    IF v_discount_type = 'percentage' THEN
        v_discount_amount := v_subtotal * (v_discount_value / 100);
    ELSIF v_discount_type = 'fixed_amount' THEN
        v_discount_amount := v_discount_value;
    ELSIF v_discount_type = 'free_shipping' THEN
        v_discount_amount := (SELECT shipping_cost FROM orders WHERE order_id = p_order_id);
    END IF;

    -- Apply max discount cap
    IF v_max_discount IS NOT NULL AND v_discount_amount > v_max_discount THEN
        v_discount_amount := v_max_discount;
    END IF;

    -- Update order
    UPDATE orders
    SET discount_amount = v_discount_amount,
        total_amount = subtotal + tax_amount + shipping_cost - v_discount_amount
    WHERE order_id = p_order_id;

    -- Update code usage
    UPDATE discount_codes
    SET usage_count = usage_count + 1
    WHERE code_id = v_code_id;

    RETURN v_discount_amount;
END;
$$ LANGUAGE plpgsql;
```

## SaaS Platform Schema

### Overview

Multi-tenant SaaS application with subscriptions, user management, and feature access control.

### Core Tables

```sql
-- ============================================================================
-- TENANTS (Organizations)
-- ============================================================================

CREATE TABLE tenants (
    tenant_id SERIAL PRIMARY KEY,
    tenant_name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    subdomain TEXT UNIQUE,
    custom_domain TEXT UNIQUE,
    logo_url TEXT,
    settings JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    trial_ends_at TIMESTAMP,
    CHECK (status IN ('trial', 'active', 'suspended', 'cancelled'))
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(status);

-- ============================================================================
-- SUBSCRIPTION PLANS
-- ============================================================================

CREATE TABLE plans (
    plan_id SERIAL PRIMARY KEY,
    plan_name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    price_monthly NUMERIC(10, 2) NOT NULL,
    price_yearly NUMERIC(10, 2),
    trial_days INT DEFAULT 14,
    max_users INT,
    max_projects INT,
    storage_gb INT,
    features JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    display_order INT DEFAULT 0
);

CREATE TABLE plan_features (
    feature_id SERIAL PRIMARY KEY,
    feature_name TEXT UNIQUE NOT NULL,
    feature_key TEXT UNIQUE NOT NULL,
    description TEXT,
    feature_type TEXT DEFAULT 'boolean',
    CHECK (feature_type IN ('boolean', 'numeric', 'string'))
);

CREATE TABLE plan_feature_access (
    plan_id INT REFERENCES plans(plan_id) ON DELETE CASCADE,
    feature_id INT REFERENCES plan_features(feature_id) ON DELETE CASCADE,
    feature_value TEXT NOT NULL,  -- 'true', '100', etc.
    PRIMARY KEY (plan_id, feature_id)
);

-- ============================================================================
-- SUBSCRIPTIONS
-- ============================================================================

CREATE TABLE subscriptions (
    subscription_id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    plan_id INT NOT NULL REFERENCES plans(plan_id),
    status TEXT DEFAULT 'active',
    billing_cycle TEXT DEFAULT 'monthly',
    price NUMERIC(10, 2) NOT NULL,
    currency TEXT DEFAULT 'USD',

    current_period_start DATE NOT NULL,
    current_period_end DATE NOT NULL,
    trial_ends_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    ended_at TIMESTAMP,

    stripe_subscription_id TEXT UNIQUE,
    stripe_customer_id TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CHECK (status IN ('trialing', 'active', 'past_due', 'cancelled', 'unpaid')),
    CHECK (billing_cycle IN ('monthly', 'yearly'))
);

CREATE INDEX idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_period_end ON subscriptions(current_period_end);

-- ============================================================================
-- USERS
-- ============================================================================

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'member',
    status TEXT DEFAULT 'active',
    last_login TIMESTAMP,
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    invited_by INT REFERENCES users(user_id),
    invited_at TIMESTAMP,
    UNIQUE(tenant_id, email),
    CHECK (role IN ('owner', 'admin', 'member', 'guest')),
    CHECK (status IN ('active', 'inactive', 'suspended'))
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================================
-- PROJECTS (Core SaaS Resource)
-- ============================================================================

CREATE TABLE projects (
    project_id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    project_name TEXT NOT NULL,
    description TEXT,
    owner_id INT NOT NULL REFERENCES users(user_id),
    status TEXT DEFAULT 'active',
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMP,
    CHECK (status IN ('active', 'archived', 'deleted'))
);

CREATE INDEX idx_projects_tenant ON projects(tenant_id);
CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_status ON projects(status);

CREATE TABLE project_members (
    project_id INT REFERENCES projects(project_id) ON DELETE CASCADE,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    role TEXT DEFAULT 'viewer',
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    added_by INT REFERENCES users(user_id),
    PRIMARY KEY (project_id, user_id),
    CHECK (role IN ('owner', 'editor', 'viewer'))
);

CREATE INDEX idx_project_members_user ON project_members(user_id);

-- ============================================================================
-- BILLING
-- ============================================================================

CREATE TABLE invoices (
    invoice_id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(tenant_id),
    subscription_id INT REFERENCES subscriptions(subscription_id),
    invoice_number TEXT UNIQUE NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    tax_amount NUMERIC(10, 2) DEFAULT 0,
    total_amount NUMERIC(10, 2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'pending',
    due_date DATE NOT NULL,
    paid_at TIMESTAMP,
    invoice_date DATE DEFAULT CURRENT_DATE,
    stripe_invoice_id TEXT UNIQUE,
    pdf_url TEXT,
    CHECK (status IN ('draft', 'pending', 'paid', 'void', 'uncollectible'))
);

CREATE INDEX idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);

CREATE TABLE invoice_items (
    item_id SERIAL PRIMARY KEY,
    invoice_id INT NOT NULL REFERENCES invoices(invoice_id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(10, 2) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL
);

-- ============================================================================
-- USAGE TRACKING
-- ============================================================================

CREATE TABLE usage_records (
    usage_id BIGSERIAL PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(tenant_id),
    user_id INT REFERENCES users(user_id),
    metric_name TEXT NOT NULL,
    metric_value NUMERIC NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

CREATE INDEX idx_usage_tenant_metric ON usage_records(tenant_id, metric_name, recorded_at DESC);

-- Materialized view for usage summary
CREATE MATERIALIZED VIEW tenant_usage_summary AS
SELECT
    t.tenant_id,
    t.tenant_name,
    COUNT(DISTINCT u.user_id) as user_count,
    COUNT(DISTINCT p.project_id) as project_count,
    s.plan_id,
    pl.plan_name,
    s.status as subscription_status
FROM tenants t
LEFT JOIN users u ON t.tenant_id = u.tenant_id AND u.status = 'active'
LEFT JOIN projects p ON t.tenant_id = p.tenant_id AND p.status = 'active'
LEFT JOIN subscriptions s ON t.tenant_id = s.tenant_id AND s.status IN ('trialing', 'active')
LEFT JOIN plans pl ON s.plan_id = pl.plan_id
GROUP BY t.tenant_id, t.tenant_name, s.plan_id, pl.plan_name, s.status;

CREATE UNIQUE INDEX ON tenant_usage_summary(tenant_id);

-- ============================================================================
-- ACTIVITY LOG
-- ============================================================================

CREATE TABLE activity_log (
    activity_id BIGSERIAL PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(tenant_id),
    user_id INT REFERENCES users(user_id),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id INT,
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_tenant_time ON activity_log(tenant_id, created_at DESC);
CREATE INDEX idx_activity_user_time ON activity_log(user_id, created_at DESC);
CREATE INDEX idx_activity_resource ON activity_log(resource_type, resource_id);
```

### Key Queries

```sql
-- Check if tenant has access to feature
CREATE OR REPLACE FUNCTION tenant_has_feature(
    p_tenant_id INT,
    p_feature_key TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM subscriptions s
        JOIN plan_feature_access pfa ON s.plan_id = pfa.plan_id
        JOIN plan_features pf ON pfa.feature_id = pf.feature_id
        WHERE s.tenant_id = p_tenant_id
            AND s.status IN ('trialing', 'active')
            AND pf.feature_key = p_feature_key
            AND pfa.feature_value = 'true'
    );
END;
$$ LANGUAGE plpgsql;

-- Get tenant's current usage vs limits
SELECT
    t.tenant_name,
    COUNT(DISTINCT u.user_id) as current_users,
    p.max_users as user_limit,
    COUNT(DISTINCT pr.project_id) as current_projects,
    p.max_projects as project_limit
FROM tenants t
JOIN subscriptions s ON t.tenant_id = s.tenant_id AND s.status = 'active'
JOIN plans p ON s.plan_id = p.plan_id
LEFT JOIN users u ON t.tenant_id = u.tenant_id AND u.status = 'active'
LEFT JOIN projects pr ON t.tenant_id = pr.tenant_id AND pr.status = 'active'
WHERE t.tenant_id = 1
GROUP BY t.tenant_id, t.tenant_name, p.max_users, p.max_projects;

-- Revenue MRR (Monthly Recurring Revenue)
SELECT
    DATE_TRUNC('month', current_period_start) as month,
    COUNT(DISTINCT tenant_id) as active_subscriptions,
    SUM(CASE WHEN billing_cycle = 'monthly' THEN price
             WHEN billing_cycle = 'yearly' THEN price / 12
        END) as mrr
FROM subscriptions
WHERE status IN ('trialing', 'active')
GROUP BY month
ORDER BY month DESC;
```

## Social Media Platform Schema

### Overview

Social network with posts, comments, likes, follows, and messaging.

```sql
-- ============================================================================
-- USERS
-- ============================================================================

CREATE TABLE users_social (
    user_id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    cover_photo_url TEXT,
    location TEXT,
    website TEXT,
    birth_date DATE,
    is_verified BOOLEAN DEFAULT false,
    is_private BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Denormalized counters for performance
    follower_count INT DEFAULT 0,
    following_count INT DEFAULT 0,
    post_count INT DEFAULT 0,

    CHECK (follower_count >= 0),
    CHECK (following_count >= 0),
    CHECK (post_count >= 0)
);

CREATE INDEX idx_users_username ON users_social(username);
CREATE INDEX idx_users_email ON users_social(email);

-- ============================================================================
-- FOLLOWS
-- ============================================================================

CREATE TABLE follows (
    follower_id INT REFERENCES users_social(user_id) ON DELETE CASCADE,
    following_id INT REFERENCES users_social(user_id) ON DELETE CASCADE,
    followed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, following_id),
    CHECK (follower_id != following_id)
);

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);

-- ============================================================================
-- POSTS
-- ============================================================================

CREATE TABLE posts (
    post_id BIGSERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users_social(user_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    media_urls TEXT[],
    visibility TEXT DEFAULT 'public',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP,

    -- Denormalized counters
    like_count INT DEFAULT 0,
    comment_count INT DEFAULT 0,
    share_count INT DEFAULT 0,

    CHECK (visibility IN ('public', 'followers', 'private')),
    CHECK (like_count >= 0),
    CHECK (comment_count >= 0),
    CHECK (share_count >= 0)
);

CREATE INDEX idx_posts_user ON posts(user_id, created_at DESC);
CREATE INDEX idx_posts_created ON posts(created_at DESC);

-- ============================================================================
-- COMMENTS
-- ============================================================================

CREATE TABLE comments (
    comment_id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users_social(user_id) ON DELETE CASCADE,
    parent_comment_id BIGINT REFERENCES comments(comment_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    like_count INT DEFAULT 0,
    CHECK (like_count >= 0)
);

CREATE INDEX idx_comments_post ON comments(post_id, created_at);
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comments_parent ON comments(parent_comment_id);

-- ============================================================================
-- LIKES
-- ============================================================================

CREATE TABLE post_likes (
    user_id INT REFERENCES users_social(user_id) ON DELETE CASCADE,
    post_id BIGINT REFERENCES posts(post_id) ON DELETE CASCADE,
    liked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, post_id)
);

CREATE INDEX idx_post_likes_post ON post_likes(post_id);

CREATE TABLE comment_likes (
    user_id INT REFERENCES users_social(user_id) ON DELETE CASCADE,
    comment_id BIGINT REFERENCES comments(comment_id) ON DELETE CASCADE,
    liked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, comment_id)
);

-- ============================================================================
-- HASHTAGS
-- ============================================================================

CREATE TABLE hashtags (
    hashtag_id SERIAL PRIMARY KEY,
    tag TEXT UNIQUE NOT NULL,
    use_count INT DEFAULT 0,
    CHECK (use_count >= 0)
);

CREATE INDEX idx_hashtags_tag ON hashtags(tag);

CREATE TABLE post_hashtags (
    post_id BIGINT REFERENCES posts(post_id) ON DELETE CASCADE,
    hashtag_id INT REFERENCES hashtags(hashtag_id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, hashtag_id)
);

CREATE INDEX idx_post_hashtags_hashtag ON post_hashtags(hashtag_id);

-- ============================================================================
-- MESSAGES
-- ============================================================================

CREATE TABLE conversations (
    conversation_id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE conversation_participants (
    conversation_id BIGINT REFERENCES conversations(conversation_id) ON DELETE CASCADE,
    user_id INT REFERENCES users_social(user_id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_read_at TIMESTAMP,
    PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX idx_conv_participants_user ON conversation_participants(user_id);

CREATE TABLE messages (
    message_id BIGSERIAL PRIMARY KEY,
    conversation_id BIGINT NOT NULL REFERENCES conversations(conversation_id) ON DELETE CASCADE,
    sender_id INT NOT NULL REFERENCES users_social(user_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

CREATE TABLE notifications (
    notification_id BIGSERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users_social(user_id) ON DELETE CASCADE,
    actor_id INT REFERENCES users_social(user_id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,
    resource_type TEXT,
    resource_id BIGINT,
    content TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (notification_type IN ('like', 'comment', 'follow', 'mention', 'message'))
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- ============================================================================
-- FEED GENERATION (Denormalized for performance)
-- ============================================================================

CREATE TABLE user_feeds (
    feed_id BIGSERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users_social(user_id) ON DELETE CASCADE,
    post_id BIGINT NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    post_created_at TIMESTAMP NOT NULL,
    feed_score NUMERIC DEFAULT 0,  -- For ranking algorithm
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_user_feeds_user_post ON user_feeds(user_id, post_id);
CREATE INDEX idx_user_feeds_user_time ON user_feeds(user_id, post_created_at DESC);
```

### Key Queries

```sql
-- Get user's feed (posts from followed users)
SELECT
    p.post_id,
    p.content,
    p.created_at,
    u.username,
    u.avatar_url,
    p.like_count,
    p.comment_count,
    EXISTS(SELECT 1 FROM post_likes WHERE user_id = 1 AND post_id = p.post_id) as user_liked
FROM posts p
JOIN users_social u ON p.user_id = u.user_id
WHERE p.user_id IN (
    SELECT following_id FROM follows WHERE follower_id = 1
)
    AND p.visibility IN ('public', 'followers')
ORDER BY p.created_at DESC
LIMIT 20;

-- Get trending hashtags
SELECT
    t.tag,
    COUNT(pt.post_id) as recent_use_count
FROM hashtags t
JOIN post_hashtags pt ON t.hashtag_id = pt.hashtag_id
JOIN posts p ON pt.post_id = p.post_id
WHERE p.created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY t.hashtag_id, t.tag
ORDER BY recent_use_count DESC
LIMIT 10;

-- Get user profile with stats
SELECT
    u.username,
    u.display_name,
    u.bio,
    u.follower_count,
    u.following_count,
    u.post_count,
    EXISTS(SELECT 1 FROM follows WHERE follower_id = 1 AND following_id = u.user_id) as is_following
FROM users_social u
WHERE u.user_id = 123;
```

## Content Management System (CMS)

### Overview

Flexible CMS with pages, blocks, media library, and multi-author support.

```sql
-- ============================================================================
-- AUTHORS/USERS
-- ============================================================================

CREATE TABLE authors (
    author_id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'author',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (role IN ('admin', 'editor', 'author', 'contributor')),
    CHECK (status IN ('active', 'inactive'))
);

-- ============================================================================
-- PAGES
-- ============================================================================

CREATE TABLE pages (
    page_id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    meta_description TEXT,
    meta_keywords TEXT[],
    author_id INT NOT NULL REFERENCES authors(author_id),
    template TEXT DEFAULT 'default',
    status TEXT DEFAULT 'draft',
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    parent_page_id INT REFERENCES pages(page_id),
    display_order INT DEFAULT 0,
    settings JSONB DEFAULT '{}'::jsonb,
    CHECK (status IN ('draft', 'published', 'archived'))
);

CREATE INDEX idx_pages_slug ON pages(slug);
CREATE INDEX idx_pages_status ON pages(status);
CREATE INDEX idx_pages_published ON pages(published_at DESC) WHERE status = 'published';

-- ============================================================================
-- CONTENT BLOCKS
-- ============================================================================

CREATE TABLE content_blocks (
    block_id SERIAL PRIMARY KEY,
    page_id INT NOT NULL REFERENCES pages(page_id) ON DELETE CASCADE,
    block_type TEXT NOT NULL,
    content JSONB NOT NULL,  -- Flexible block content
    display_order INT DEFAULT 0,
    is_visible BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}'::jsonb,
    CHECK (block_type IN ('text', 'image', 'video', 'code', 'quote', 'gallery', 'embed'))
);

CREATE INDEX idx_blocks_page ON content_blocks(page_id, display_order);

-- ============================================================================
-- MEDIA LIBRARY
-- ============================================================================

CREATE TABLE media (
    media_id SERIAL PRIMARY KEY,
    uploaded_by INT NOT NULL REFERENCES authors(author_id),
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    alt_text TEXT,
    caption TEXT,
    width INT,
    height INT,
    metadata JSONB DEFAULT '{}'::jsonb,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (file_type IN ('image', 'video', 'document', 'audio'))
);

CREATE INDEX idx_media_type ON media(file_type);
CREATE INDEX idx_media_uploaded ON media(uploaded_at DESC);

-- ============================================================================
-- CATEGORIES AND TAGS
-- ============================================================================

CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    category_name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    parent_category_id INT REFERENCES categories(category_id)
);

CREATE TABLE tags (
    tag_id SERIAL PRIMARY KEY,
    tag_name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL
);

CREATE TABLE page_categories (
    page_id INT REFERENCES pages(page_id) ON DELETE CASCADE,
    category_id INT REFERENCES categories(category_id) ON DELETE CASCADE,
    PRIMARY KEY (page_id, category_id)
);

CREATE TABLE page_tags (
    page_id INT REFERENCES pages(page_id) ON DELETE CASCADE,
    tag_id INT REFERENCES tags(tag_id) ON DELETE CASCADE,
    PRIMARY KEY (page_id, tag_id)
);

-- ============================================================================
-- REVISIONS
-- ============================================================================

CREATE TABLE page_revisions (
    revision_id BIGSERIAL PRIMARY KEY,
    page_id INT NOT NULL REFERENCES pages(page_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content JSONB NOT NULL,  -- Snapshot of all blocks
    author_id INT NOT NULL REFERENCES authors(author_id),
    revision_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_revisions_page ON page_revisions(page_id, created_at DESC);

-- ============================================================================
-- MENUS
-- ============================================================================

CREATE TABLE menus (
    menu_id SERIAL PRIMARY KEY,
    menu_name TEXT UNIQUE NOT NULL,
    location TEXT
);

CREATE TABLE menu_items (
    item_id SERIAL PRIMARY KEY,
    menu_id INT NOT NULL REFERENCES menus(menu_id) ON DELETE CASCADE,
    parent_item_id INT REFERENCES menu_items(item_id),
    label TEXT NOT NULL,
    url TEXT,
    page_id INT REFERENCES pages(page_id),
    display_order INT DEFAULT 0,
    is_visible BOOLEAN DEFAULT true,
    target TEXT DEFAULT '_self'
);

CREATE INDEX idx_menu_items_menu ON menu_items(menu_id, display_order);
```

### Key Queries

```sql
-- Get published page with all content blocks
SELECT
    p.title,
    p.slug,
    p.published_at,
    a.username as author,
    json_agg(
        json_build_object(
            'block_type', cb.block_type,
            'content', cb.content,
            'order', cb.display_order
        ) ORDER BY cb.display_order
    ) as blocks
FROM pages p
JOIN authors a ON p.author_id = a.author_id
LEFT JOIN content_blocks cb ON p.page_id = cb.page_id AND cb.is_visible = true
WHERE p.slug = 'about-us' AND p.status = 'published'
GROUP BY p.page_id, p.title, p.slug, p.published_at, a.username;

-- Get menu with items
SELECT
    mi.item_id,
    mi.label,
    COALESCE(mi.url, '/pages/' || p.slug) as url,
    mi.parent_item_id,
    mi.display_order
FROM menu_items mi
LEFT JOIN pages p ON mi.page_id = p.page_id
WHERE mi.menu_id = 1 AND mi.is_visible = true
ORDER BY mi.display_order;
```

## Common Mistakes

1. **Not indexing foreign keys**: Always index FK columns
2. **Missing CHECK constraints**: Use constraints for data validation
3. **Storing calculated values**: Use views or compute on-the-fly unless performance critical
4. **No audit trail**: Consider audit tables for important data

## Best Practices

1. **Use SERIAL/BIGSERIAL for IDs**: Auto-incrementing primary keys
2. **Add timestamps**: created_at, updated_at on most tables
3. **Denormalize counters**: For high-traffic aggregates (likes, followers)
4. **Use JSONB for flexibility**: Settings, metadata, flexible attributes
5. **Soft deletes**: Add deleted_at instead of hard deletes
6. **Partition large tables**: Use partitioning for time-series data
7. **Add appropriate indexes**: Foreign keys, status columns, date ranges

## Practice Exercises

### Exercise 1: Add Wishlist Feature to E-Commerce

Add tables and queries for product wishlists.

**Solution:**

```sql
CREATE TABLE wishlists (
    wishlist_id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    wishlist_name TEXT DEFAULT 'My Wishlist',
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE wishlist_items (
    wishlist_id INT REFERENCES wishlists(wishlist_id) ON DELETE CASCADE,
    product_id INT REFERENCES products(product_id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    PRIMARY KEY (wishlist_id, product_id)
);

-- Get wishlist with product details
SELECT
    p.product_name,
    p.base_price,
    p.sale_price,
    wi.added_at
FROM wishlist_items wi
JOIN products p ON wi.product_id = p.product_id
WHERE wi.wishlist_id = 1
ORDER BY wi.added_at DESC;
```

### Exercise 2: Add Team Workspaces to SaaS

Allow multiple workspaces per tenant.

**Solution:**

```sql
CREATE TABLE workspaces (
    workspace_id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    workspace_name TEXT NOT NULL,
    description TEXT,
    created_by INT REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE workspace_members (
    workspace_id INT REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member',
    PRIMARY KEY (workspace_id, user_id)
);

ALTER TABLE projects ADD COLUMN workspace_id INT REFERENCES workspaces(workspace_id);
```

### Exercise 3: Add Story Feature to Social Media

Implement disappearing stories (24-hour posts).

**Solution:**

```sql
CREATE TABLE stories (
    story_id BIGSERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users_social(user_id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP + INTERVAL '24 hours',
    view_count INT DEFAULT 0,
    CHECK (media_type IN ('image', 'video'))
);

CREATE INDEX idx_stories_user ON stories(user_id, created_at DESC);
CREATE INDEX idx_stories_active ON stories(expires_at) WHERE expires_at > CURRENT_TIMESTAMP;

CREATE TABLE story_views (
    story_id BIGINT REFERENCES stories(story_id) ON DELETE CASCADE,
    viewer_id INT REFERENCES users_social(user_id) ON DELETE CASCADE,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (story_id, viewer_id)
);

-- Get active stories from followed users
SELECT
    s.story_id,
    s.media_url,
    u.username,
    s.created_at,
    s.view_count
FROM stories s
JOIN users_social u ON s.user_id = u.user_id
WHERE s.user_id IN (SELECT following_id FROM follows WHERE follower_id = 1)
    AND s.expires_at > CURRENT_TIMESTAMP
ORDER BY s.created_at DESC;
```

## Related Topics

- [Normalization](./01-normalization.md)
- [ER Modeling](./03-er-modeling.md)
- [Design Patterns](./04-design-patterns.md)
- [Indexes](../07-indexes/01-index-basics.md)
- [JSONB](../05-data-types/05-json-jsonb.md)
- [Triggers](../10-triggers/01-trigger-basics.md)
