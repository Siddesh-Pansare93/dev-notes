# E-Commerce Database Design

## Table of Contents
- [Introduction](#introduction)
- [Database Schema Overview](#database-schema-overview)
- [User Management](#user-management)
- [Product Catalog](#product-catalog)
- [Shopping Cart](#shopping-cart)
- [Order Management](#order-management)
- [Payment System](#payment-system)
- [Reviews and Ratings](#reviews-and-ratings)
- [Wishlist](#wishlist)
- [Coupons and Discounts](#coupons-and-discounts)
- [Key Queries](#key-queries)
- [Triggers and Automation](#triggers-and-automation)
- [Performance Optimization](#performance-optimization)
- [Common Mistakes](#common-mistakes)
- [Best Practices](#best-practices)
- [Practice Exercises](#practice-exercises)

## Introduction

### Theory
A comprehensive e-commerce database must handle:
- User authentication and profiles
- Product catalog with variants and inventory
- Shopping cart functionality
- Order processing and fulfillment
- Payment processing
- Customer reviews and ratings
- Promotional pricing and discounts

This design implements a production-ready e-commerce system with proper normalization, constraints, indexes, and business logic.

## Database Schema Overview

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "ltree";

-- Schema for organizing tables
CREATE SCHEMA IF NOT EXISTS ecommerce;
SET search_path TO ecommerce, public;
```

## User Management

### Theory
User management handles authentication, profiles, and addresses. Uses secure password hashing and supports multiple addresses per user.

### Schema

```sql
-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_active ON users (is_active) WHERE is_active = true;

-- User addresses
CREATE TABLE addresses (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    address_type VARCHAR(20) NOT NULL CHECK (address_type IN ('billing', 'shipping', 'both')),
    is_default BOOLEAN DEFAULT false,
    recipient_name VARCHAR(200),
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_addresses_user ON addresses (user_id);
CREATE INDEX idx_addresses_default ON addresses (user_id, is_default) WHERE is_default = true;

-- User sessions
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user ON user_sessions (user_id);
CREATE INDEX idx_sessions_expires ON user_sessions (expires_at);
```

### Examples

```sql
-- Create user with hashed password
INSERT INTO users (email, password_hash, first_name, last_name, phone)
VALUES (
    'john.doe@example.com',
    crypt('SecurePassword123!', gen_salt('bf')),
    'John',
    'Doe',
    '+1-555-0100'
);

-- Add addresses
INSERT INTO addresses (user_id, address_type, is_default, recipient_name, address_line1, city, state, postal_code, country, phone)
VALUES
    (1, 'both', true, 'John Doe', '123 Main St', 'New York', 'NY', '10001', 'USA', '+1-555-0100'),
    (1, 'shipping', false, 'John Doe', '456 Work Ave', 'New York', 'NY', '10002', 'USA', '+1-555-0100');

-- Verify user login
SELECT
    id,
    email,
    first_name,
    last_name,
    password_hash = crypt('SecurePassword123!', password_hash) AS password_valid
FROM users
WHERE email = 'john.doe@example.com' AND is_active = true;

-- Get user with default addresses
SELECT
    u.*,
    json_agg(json_build_object(
        'id', a.id,
        'type', a.address_type,
        'address', a.address_line1 || ', ' || a.city || ', ' || a.state || ' ' || a.postal_code
    )) FILTER (WHERE a.id IS NOT NULL) AS addresses
FROM users u
LEFT JOIN addresses a ON u.id = a.user_id
WHERE u.id = 1
GROUP BY u.id;
```

## Product Catalog

### Theory
Product catalog uses ltree for hierarchical categories, supports product variants (size, color), and tracks inventory levels.

### Schema

```sql
-- Product categories (hierarchical using ltree)
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    path LTREE NOT NULL UNIQUE,
    description TEXT,
    image_url VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_categories_path ON categories USING GIST (path);
CREATE INDEX idx_categories_slug ON categories (slug);

-- Products
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    category_id INT REFERENCES categories(id),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    description TEXT,
    short_description VARCHAR(500),
    sku VARCHAR(100) UNIQUE NOT NULL,
    base_price DECIMAL(10, 2) NOT NULL CHECK (base_price >= 0),
    compare_at_price DECIMAL(10, 2) CHECK (compare_at_price >= base_price),
    cost_price DECIMAL(10, 2) CHECK (cost_price >= 0),
    weight_kg DECIMAL(8, 3),
    dimensions_cm VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    requires_shipping BOOLEAN DEFAULT true,
    taxable BOOLEAN DEFAULT true,
    meta_title VARCHAR(200),
    meta_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_category ON products (category_id);
CREATE INDEX idx_products_slug ON products (slug);
CREATE INDEX idx_products_sku ON products (sku);
CREATE INDEX idx_products_active ON products (is_active) WHERE is_active = true;
CREATE INDEX idx_products_featured ON products (is_featured) WHERE is_featured = true;

-- Product images
CREATE TABLE product_images (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url VARCHAR(255) NOT NULL,
    alt_text VARCHAR(255),
    display_order INT DEFAULT 0,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_product_images_product ON product_images (product_id, display_order);

-- Product variants (size, color, etc.)
CREATE TABLE product_variants (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(100) UNIQUE NOT NULL,
    variant_name VARCHAR(100) NOT NULL, -- e.g., "Large / Red"
    option1_name VARCHAR(50), -- e.g., "Size"
    option1_value VARCHAR(50), -- e.g., "Large"
    option2_name VARCHAR(50), -- e.g., "Color"
    option2_value VARCHAR(50), -- e.g., "Red"
    option3_name VARCHAR(50),
    option3_value VARCHAR(50),
    price_adjustment DECIMAL(10, 2) DEFAULT 0,
    weight_kg DECIMAL(8, 3),
    barcode VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_variants_product ON product_variants (product_id);
CREATE INDEX idx_variants_sku ON product_variants (sku);

-- Inventory tracking
CREATE TABLE inventory (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    variant_id INT REFERENCES product_variants(id) ON DELETE CASCADE,
    warehouse_location VARCHAR(100),
    quantity INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    reserved_quantity INT NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
    reorder_point INT DEFAULT 10,
    reorder_quantity INT DEFAULT 50,
    last_restocked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT product_or_variant CHECK (
        (product_id IS NOT NULL AND variant_id IS NULL) OR
        (product_id IS NULL AND variant_id IS NOT NULL)
    ),
    CONSTRAINT valid_reserved CHECK (reserved_quantity <= quantity)
);

CREATE INDEX idx_inventory_product ON inventory (product_id);
CREATE INDEX idx_inventory_variant ON inventory (variant_id);
CREATE INDEX idx_inventory_low_stock ON inventory (quantity) WHERE quantity <= reorder_point;
```

### Examples

```sql
-- Create category hierarchy
INSERT INTO categories (name, slug, path) VALUES
    ('Electronics', 'electronics', 'electronics'),
    ('Computers', 'computers', 'electronics.computers'),
    ('Laptops', 'laptops', 'electronics.computers.laptops'),
    ('Desktops', 'desktops', 'electronics.computers.desktops'),
    ('Phones', 'phones', 'electronics.phones'),
    ('Clothing', 'clothing', 'clothing'),
    ('Men', 'men', 'clothing.men'),
    ('Women', 'women', 'clothing.women');

-- Create products
INSERT INTO products (category_id, name, slug, description, sku, base_price, compare_at_price, is_featured)
VALUES
    (3, 'MacBook Pro 16"', 'macbook-pro-16', 'High-performance laptop with M3 chip', 'TECH-MBP-16-001', 2499.99, 2799.99, true),
    (5, 'iPhone 15 Pro', 'iphone-15-pro', 'Latest flagship smartphone', 'TECH-IP15P-001', 999.99, 1099.99, true),
    (7, 'Classic Cotton T-Shirt', 'classic-cotton-tshirt', 'Comfortable everyday t-shirt', 'CLOTH-TSHIRT-001', 24.99, NULL, false);

-- Add product images
INSERT INTO product_images (product_id, image_url, alt_text, display_order, is_primary) VALUES
    (1, 'https://cdn.example.com/mbp-16-1.jpg', 'MacBook Pro 16 front view', 0, true),
    (1, 'https://cdn.example.com/mbp-16-2.jpg', 'MacBook Pro 16 side view', 1, false);

-- Add product variants (t-shirt sizes and colors)
INSERT INTO product_variants (product_id, sku, variant_name, option1_name, option1_value, option2_name, option2_value, price_adjustment)
VALUES
    (3, 'CLOTH-TSHIRT-001-S-BLK', 'Small / Black', 'Size', 'S', 'Color', 'Black', 0),
    (3, 'CLOTH-TSHIRT-001-M-BLK', 'Medium / Black', 'Size', 'M', 'Color', 'Black', 0),
    (3, 'CLOTH-TSHIRT-001-L-BLK', 'Large / Black', 'Size', 'L', 'Color', 'Black', 0),
    (3, 'CLOTH-TSHIRT-001-S-WHT', 'Small / White', 'Size', 'S', 'Color', 'White', 0),
    (3, 'CLOTH-TSHIRT-001-M-WHT', 'Medium / White', 'Size', 'M', 'Color', 'White', 0);

-- Add inventory
INSERT INTO inventory (product_id, warehouse_location, quantity, reorder_point, reorder_quantity) VALUES
    (1, 'Main Warehouse', 50, 10, 20),
    (2, 'Main Warehouse', 100, 20, 50);

INSERT INTO inventory (variant_id, warehouse_location, quantity, reorder_point, reorder_quantity) VALUES
    (1, 'Main Warehouse', 100, 20, 100),
    (2, 'Main Warehouse', 150, 30, 150),
    (3, 'Main Warehouse', 120, 25, 120);

-- Query category tree
SELECT
    id,
    name,
    nlevel(path) AS level,
    path::TEXT
FROM categories
ORDER BY path;

-- Get all products in category and subcategories
SELECT
    p.id,
    p.name,
    p.base_price,
    c.name AS category_name
FROM products p
JOIN categories c ON p.category_id = c.id
WHERE c.path <@ 'electronics.computers'
  AND p.is_active = true
ORDER BY p.name;

-- Get product with variants and inventory
SELECT
    p.id,
    p.name,
    p.base_price,
    json_agg(json_build_object(
        'id', pv.id,
        'name', pv.variant_name,
        'sku', pv.sku,
        'price', p.base_price + pv.price_adjustment,
        'in_stock', i.quantity - i.reserved_quantity > 0,
        'available_quantity', i.quantity - i.reserved_quantity
    ) ORDER BY pv.id) FILTER (WHERE pv.id IS NOT NULL) AS variants
FROM products p
LEFT JOIN product_variants pv ON p.id = pv.product_id
LEFT JOIN inventory i ON pv.id = i.variant_id
WHERE p.id = 3
GROUP BY p.id;
```

## Shopping Cart

### Theory
Shopping cart stores temporary selections before checkout. Carts can be anonymous (session-based) or associated with logged-in users.

### Schema

```sql
-- Shopping carts
CREATE TABLE carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255), -- For anonymous users
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_or_session CHECK (
        (user_id IS NOT NULL AND session_id IS NULL) OR
        (user_id IS NULL AND session_id IS NOT NULL)
    )
);

CREATE INDEX idx_carts_user ON carts (user_id);
CREATE INDEX idx_carts_session ON carts (session_id);
CREATE INDEX idx_carts_expires ON carts (expires_at);

-- Cart items
CREATE TABLE cart_items (
    id SERIAL PRIMARY KEY,
    cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    variant_id INT REFERENCES product_variants(id) ON DELETE SET NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    price DECIMAL(10, 2) NOT NULL, -- Price at time of adding
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (cart_id, product_id, variant_id)
);

CREATE INDEX idx_cart_items_cart ON cart_items (cart_id);
```

### Examples

```sql
-- Create cart for logged-in user
INSERT INTO carts (user_id)
VALUES (1)
RETURNING id;

-- Add items to cart
INSERT INTO cart_items (cart_id, product_id, variant_id, quantity, price)
VALUES
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 1, NULL, 1, 2499.99),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 3, 2, 2, 24.99);

-- Update cart item quantity
UPDATE cart_items
SET quantity = 3, updated_at = CURRENT_TIMESTAMP
WHERE cart_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  AND product_id = 3
  AND variant_id = 2;

-- Get cart with items
SELECT
    c.id AS cart_id,
    json_agg(json_build_object(
        'item_id', ci.id,
        'product_id', p.id,
        'product_name', p.name,
        'variant', CASE WHEN pv.id IS NOT NULL THEN pv.variant_name ELSE NULL END,
        'quantity', ci.quantity,
        'unit_price', ci.price,
        'line_total', ci.quantity * ci.price
    )) AS items,
    SUM(ci.quantity * ci.price) AS cart_total
FROM carts c
JOIN cart_items ci ON c.id = ci.cart_id
JOIN products p ON ci.product_id = p.id
LEFT JOIN product_variants pv ON ci.variant_id = pv.id
WHERE c.user_id = 1
GROUP BY c.id;

-- Remove item from cart
DELETE FROM cart_items
WHERE cart_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  AND id = 1;

-- Clear cart
DELETE FROM cart_items
WHERE cart_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

-- Delete expired carts
DELETE FROM carts
WHERE expires_at < CURRENT_TIMESTAMP;
```

## Order Management

### Theory
Orders represent completed purchases with order items, shipping information, and status tracking through the fulfillment lifecycle.

### Schema

```sql
-- Orders
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id INT REFERENCES users(id),
    email VARCHAR(255) NOT NULL, -- For guest checkout
    billing_address_id INT REFERENCES addresses(id),
    shipping_address_id INT REFERENCES addresses(id),
    subtotal DECIMAL(10, 2) NOT NULL,
    shipping_cost DECIMAL(10, 2) DEFAULT 0,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'
    )),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN (
        'pending', 'paid', 'failed', 'refunded', 'partially_refunded'
    )),
    fulfillment_status VARCHAR(20) DEFAULT 'unfulfilled' CHECK (fulfillment_status IN (
        'unfulfilled', 'partially_fulfilled', 'fulfilled'
    )),
    notes TEXT,
    customer_notes TEXT,
    tracking_number VARCHAR(100),
    carrier VARCHAR(100),
    shipped_at TIMESTAMP,
    delivered_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_user ON orders (user_id);
CREATE INDEX idx_orders_number ON orders (order_number);
CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_orders_created ON orders (created_at DESC);

-- Order items
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id),
    variant_id INT REFERENCES product_variants(id),
    product_name VARCHAR(200) NOT NULL, -- Snapshot at order time
    variant_name VARCHAR(100),
    sku VARCHAR(100) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_items_order ON order_items (order_id);
CREATE INDEX idx_order_items_product ON order_items (product_id);

-- Order status history
CREATE TABLE order_status_history (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL,
    comment TEXT,
    notified BOOLEAN DEFAULT false,
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_status_history_order ON order_status_history (order_id, created_at);
```

### Examples

```sql
-- Generate unique order number
CREATE SEQUENCE order_number_seq START 10000;

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS VARCHAR AS $$
BEGIN
    RETURN 'ORD-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(nextval('order_number_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Create order from cart
WITH cart_data AS (
    SELECT
        c.user_id,
        u.email,
        SUM(ci.quantity * ci.price) AS subtotal
    FROM carts c
    JOIN users u ON c.user_id = u.id
    JOIN cart_items ci ON c.id = ci.cart_id
    WHERE c.id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
    GROUP BY c.user_id, u.email
),
new_order AS (
    INSERT INTO orders (
        order_number,
        user_id,
        email,
        billing_address_id,
        shipping_address_id,
        subtotal,
        shipping_cost,
        tax_amount,
        total_amount
    )
    SELECT
        generate_order_number(),
        user_id,
        email,
        1, -- billing address
        1, -- shipping address
        subtotal,
        10.00, -- shipping
        subtotal * 0.08, -- 8% tax
        subtotal + 10.00 + (subtotal * 0.08)
    FROM cart_data
    RETURNING *
)
INSERT INTO order_items (
    order_id,
    product_id,
    variant_id,
    product_name,
    variant_name,
    sku,
    quantity,
    unit_price,
    total_amount
)
SELECT
    no.id,
    ci.product_id,
    ci.variant_id,
    p.name,
    pv.variant_name,
    COALESCE(pv.sku, p.sku),
    ci.quantity,
    ci.price,
    ci.quantity * ci.price
FROM new_order no
CROSS JOIN cart_items ci
JOIN products p ON ci.product_id = p.id
LEFT JOIN product_variants pv ON ci.variant_id = pv.id
WHERE ci.cart_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
RETURNING *;

-- Get order details
SELECT
    o.id,
    o.order_number,
    o.status,
    o.total_amount,
    o.created_at,
    json_build_object(
        'name', u.first_name || ' ' || u.last_name,
        'email', u.email
    ) AS customer,
    json_agg(json_build_object(
        'product_name', oi.product_name,
        'variant', oi.variant_name,
        'quantity', oi.quantity,
        'unit_price', oi.unit_price,
        'total', oi.total_amount
    )) AS items
FROM orders o
LEFT JOIN users u ON o.user_id = u.id
JOIN order_items oi ON o.id = oi.order_id
WHERE o.id = 1
GROUP BY o.id, u.first_name, u.last_name, u.email;

-- Update order status
UPDATE orders
SET
    status = 'shipped',
    fulfillment_status = 'fulfilled',
    tracking_number = '1Z999AA10123456784',
    carrier = 'UPS',
    shipped_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
WHERE id = 1;

-- Add status history
INSERT INTO order_status_history (order_id, status, comment)
VALUES (1, 'shipped', 'Order shipped via UPS');

-- Cancel order
UPDATE orders
SET
    status = 'cancelled',
    cancelled_at = CURRENT_TIMESTAMP,
    cancellation_reason = 'Customer request',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 1 AND status IN ('pending', 'processing');
```

## Payment System

### Theory
Payment system tracks payment methods and transactions. Sensitive payment data should be tokenized through payment gateway (Stripe, PayPal).

### Schema

```sql
-- Payment methods
CREATE TABLE payment_methods (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN (
        'credit_card', 'debit_card', 'paypal', 'bank_account'
    )),
    provider VARCHAR(50), -- Stripe, PayPal, etc.
    provider_payment_method_id VARCHAR(255), -- External token
    is_default BOOLEAN DEFAULT false,
    card_last4 VARCHAR(4),
    card_brand VARCHAR(20),
    card_exp_month INT,
    card_exp_year INT,
    billing_address_id INT REFERENCES addresses(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_methods_user ON payment_methods (user_id);

-- Payment transactions
CREATE TABLE payment_transactions (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(id),
    payment_method_id INT REFERENCES payment_methods(id),
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN (
        'charge', 'refund', 'authorization', 'capture'
    )),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending', 'processing', 'succeeded', 'failed', 'cancelled'
    )),
    provider VARCHAR(50), -- Stripe, PayPal, etc.
    provider_transaction_id VARCHAR(255), -- External transaction ID
    error_code VARCHAR(50),
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_transactions_order ON payment_transactions (order_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions (status);
CREATE INDEX idx_payment_transactions_created ON payment_transactions (created_at DESC);
```

### Examples

```sql
-- Add payment method (tokenized)
INSERT INTO payment_methods (
    user_id,
    payment_type,
    provider,
    provider_payment_method_id,
    is_default,
    card_last4,
    card_brand,
    card_exp_month,
    card_exp_year,
    billing_address_id
)
VALUES (
    1,
    'credit_card',
    'stripe',
    'pm_1234567890',
    true,
    '4242',
    'Visa',
    12,
    2025,
    1
);

-- Record payment transaction
INSERT INTO payment_transactions (
    order_id,
    payment_method_id,
    transaction_type,
    amount,
    status,
    provider,
    provider_transaction_id
)
VALUES (
    1,
    1,
    'charge',
    2549.99,
    'succeeded',
    'stripe',
    'ch_1234567890'
);

-- Update order payment status
UPDATE orders
SET payment_status = 'paid', updated_at = CURRENT_TIMESTAMP
WHERE id = 1;

-- Process refund
INSERT INTO payment_transactions (
    order_id,
    payment_method_id,
    transaction_type,
    amount,
    status,
    provider,
    provider_transaction_id
)
VALUES (
    1,
    1,
    'refund',
    2549.99,
    'succeeded',
    'stripe',
    're_1234567890'
);

UPDATE orders
SET payment_status = 'refunded', updated_at = CURRENT_TIMESTAMP
WHERE id = 1;

-- Get payment history for order
SELECT
    pt.id,
    pt.transaction_type,
    pt.amount,
    pt.status,
    pt.provider,
    pt.created_at
FROM payment_transactions pt
WHERE pt.order_id = 1
ORDER BY pt.created_at DESC;
```

## Reviews and Ratings

### Schema

```sql
-- Product reviews
CREATE TABLE product_reviews (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id INT REFERENCES orders(id), -- Verified purchase
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title VARCHAR(200),
    review_text TEXT,
    is_verified_purchase BOOLEAN DEFAULT false,
    is_approved BOOLEAN DEFAULT false,
    helpful_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (product_id, user_id)
);

CREATE INDEX idx_reviews_product ON product_reviews (product_id, is_approved);
CREATE INDEX idx_reviews_user ON product_reviews (user_id);
CREATE INDEX idx_reviews_rating ON product_reviews (product_id, rating);

-- Review helpfulness votes
CREATE TABLE review_votes (
    id SERIAL PRIMARY KEY,
    review_id INT NOT NULL REFERENCES product_reviews(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_helpful BOOLEAN NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (review_id, user_id)
);

CREATE INDEX idx_review_votes_review ON review_votes (review_id);
```

### Examples

```sql
-- Add product review
INSERT INTO product_reviews (
    product_id,
    user_id,
    order_id,
    rating,
    title,
    review_text,
    is_verified_purchase,
    is_approved
)
VALUES (
    1,
    1,
    1,
    5,
    'Excellent laptop!',
    'This MacBook Pro is amazing. Fast, beautiful display, and great battery life.',
    true,
    true
);

-- Vote review as helpful
INSERT INTO review_votes (review_id, user_id, is_helpful)
VALUES (1, 2, true)
ON CONFLICT (review_id, user_id) DO UPDATE
SET is_helpful = EXCLUDED.is_helpful;

-- Update helpful count
UPDATE product_reviews
SET helpful_count = (
    SELECT COUNT(*) FROM review_votes
    WHERE review_id = 1 AND is_helpful = true
)
WHERE id = 1;

-- Get product reviews with aggregates
SELECT
    p.id,
    p.name,
    COUNT(pr.id) AS review_count,
    ROUND(AVG(pr.rating)::numeric, 2) AS avg_rating,
    COUNT(*) FILTER (WHERE pr.rating = 5) AS five_star,
    COUNT(*) FILTER (WHERE pr.rating = 4) AS four_star,
    COUNT(*) FILTER (WHERE pr.rating = 3) AS three_star,
    COUNT(*) FILTER (WHERE pr.rating = 2) AS two_star,
    COUNT(*) FILTER (WHERE pr.rating = 1) AS one_star
FROM products p
LEFT JOIN product_reviews pr ON p.id = pr.product_id AND pr.is_approved = true
WHERE p.id = 1
GROUP BY p.id, p.name;

-- Get reviews for product
SELECT
    pr.id,
    pr.rating,
    pr.title,
    pr.review_text,
    pr.is_verified_purchase,
    pr.helpful_count,
    pr.created_at,
    u.first_name || ' ' || SUBSTRING(u.last_name, 1, 1) || '.' AS reviewer_name
FROM product_reviews pr
JOIN users u ON pr.user_id = u.id
WHERE pr.product_id = 1 AND pr.is_approved = true
ORDER BY pr.helpful_count DESC, pr.created_at DESC;
```

## Wishlist

### Schema

```sql
-- Wishlists
CREATE TABLE wishlists (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) DEFAULT 'My Wishlist',
    is_default BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wishlists_user ON wishlists (user_id);

-- Wishlist items
CREATE TABLE wishlist_items (
    id SERIAL PRIMARY KEY,
    wishlist_id INT NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id INT REFERENCES product_variants(id) ON DELETE SET NULL,
    priority INT DEFAULT 0,
    notes TEXT,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (wishlist_id, product_id, variant_id)
);

CREATE INDEX idx_wishlist_items_wishlist ON wishlist_items (wishlist_id);
CREATE INDEX idx_wishlist_items_product ON wishlist_items (product_id);
```

### Examples

```sql
-- Create wishlist
INSERT INTO wishlists (user_id, name, is_default)
VALUES (1, 'My Wishlist', true);

-- Add item to wishlist
INSERT INTO wishlist_items (wishlist_id, product_id, variant_id, priority)
VALUES (1, 2, NULL, 1)
ON CONFLICT (wishlist_id, product_id, variant_id) DO NOTHING;

-- Get wishlist with items
SELECT
    w.id,
    w.name,
    json_agg(json_build_object(
        'product_id', p.id,
        'product_name', p.name,
        'price', p.base_price,
        'variant', pv.variant_name,
        'in_stock', CASE
            WHEN i.quantity - i.reserved_quantity > 0 THEN true
            ELSE false
        END
    ) ORDER BY wi.priority DESC, wi.added_at DESC) AS items
FROM wishlists w
JOIN wishlist_items wi ON w.id = wi.wishlist_id
JOIN products p ON wi.product_id = p.id
LEFT JOIN product_variants pv ON wi.variant_id = pv.id
LEFT JOIN inventory i ON (
    (wi.variant_id IS NULL AND i.product_id = p.id) OR
    (wi.variant_id IS NOT NULL AND i.variant_id = wi.variant_id)
)
WHERE w.user_id = 1 AND w.is_default = true
GROUP BY w.id, w.name;

-- Remove from wishlist
DELETE FROM wishlist_items
WHERE wishlist_id = 1 AND product_id = 2;
```

## Coupons and Discounts

### Schema

```sql
-- Coupons
CREATE TABLE coupons (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount', 'free_shipping')),
    discount_value DECIMAL(10, 2) NOT NULL,
    min_purchase_amount DECIMAL(10, 2),
    max_discount_amount DECIMAL(10, 2),
    usage_limit INT,
    usage_count INT DEFAULT 0,
    per_user_limit INT DEFAULT 1,
    starts_at TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    applies_to VARCHAR(20) DEFAULT 'all' CHECK (applies_to IN ('all', 'specific_products', 'specific_categories')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_coupons_code ON coupons (code) WHERE is_active = true;
CREATE INDEX idx_coupons_active ON coupons (is_active, expires_at);

-- Coupon usage tracking
CREATE TABLE coupon_usage (
    id SERIAL PRIMARY KEY,
    coupon_id INT NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id),
    order_id INT REFERENCES orders(id),
    discount_amount DECIMAL(10, 2) NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_coupon_usage_coupon ON coupon_usage (coupon_id);
CREATE INDEX idx_coupon_usage_user ON coupon_usage (user_id);
CREATE INDEX idx_coupon_usage_order ON coupon_usage (order_id);
```

### Examples

```sql
-- Create coupons
INSERT INTO coupons (code, description, discount_type, discount_value, min_purchase_amount, usage_limit, expires_at, is_active)
VALUES
    ('WELCOME10', '10% off first order', 'percentage', 10, 50.00, 1000, '2024-12-31 23:59:59', true),
    ('SAVE20', '$20 off orders over $100', 'fixed_amount', 20.00, 100.00, 500, '2024-12-31 23:59:59', true),
    ('FREESHIP', 'Free shipping', 'free_shipping', 0, 0, NULL, '2024-12-31 23:59:59', true);

-- Validate and apply coupon
CREATE OR REPLACE FUNCTION validate_coupon(
    p_code VARCHAR,
    p_user_id INT,
    p_order_total DECIMAL
)
RETURNS TABLE (
    valid BOOLEAN,
    discount_amount DECIMAL,
    message TEXT
) AS $$
DECLARE
    v_coupon RECORD;
    v_user_usage_count INT;
    v_discount DECIMAL;
BEGIN
    -- Get coupon
    SELECT * INTO v_coupon
    FROM coupons
    WHERE code = p_code
      AND is_active = true
      AND (starts_at IS NULL OR starts_at <= CURRENT_TIMESTAMP)
      AND (expires_at IS NULL OR expires_at >= CURRENT_TIMESTAMP)
      AND (usage_limit IS NULL OR usage_count < usage_limit);

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 0::DECIMAL, 'Invalid or expired coupon'::TEXT;
        RETURN;
    END IF;

    -- Check minimum purchase
    IF v_coupon.min_purchase_amount IS NOT NULL AND p_order_total < v_coupon.min_purchase_amount THEN
        RETURN QUERY SELECT
            false,
            0::DECIMAL,
            'Minimum purchase amount of $' || v_coupon.min_purchase_amount || ' required'::TEXT;
        RETURN;
    END IF;

    -- Check per-user limit
    SELECT COUNT(*) INTO v_user_usage_count
    FROM coupon_usage
    WHERE coupon_id = v_coupon.id AND user_id = p_user_id;

    IF v_user_usage_count >= v_coupon.per_user_limit THEN
        RETURN QUERY SELECT false, 0::DECIMAL, 'Coupon usage limit reached'::TEXT;
        RETURN;
    END IF;

    -- Calculate discount
    IF v_coupon.discount_type = 'percentage' THEN
        v_discount := p_order_total * (v_coupon.discount_value / 100);
        IF v_coupon.max_discount_amount IS NOT NULL THEN
            v_discount := LEAST(v_discount, v_coupon.max_discount_amount);
        END IF;
    ELSIF v_coupon.discount_type = 'fixed_amount' THEN
        v_discount := LEAST(v_coupon.discount_value, p_order_total);
    ELSE
        v_discount := 0; -- free_shipping handled separately
    END IF;

    RETURN QUERY SELECT true, ROUND(v_discount, 2), 'Coupon applied successfully'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Test coupon validation
SELECT * FROM validate_coupon('WELCOME10', 1, 100.00);
SELECT * FROM validate_coupon('SAVE20', 1, 150.00);
```

## Key Queries

### Examples

```sql
-- Product search with filters
CREATE OR REPLACE FUNCTION search_products(
    p_search_term TEXT DEFAULT NULL,
    p_category_path LTREE DEFAULT NULL,
    p_min_price DECIMAL DEFAULT NULL,
    p_max_price DECIMAL DEFAULT NULL,
    p_min_rating DECIMAL DEFAULT NULL,
    p_in_stock_only BOOLEAN DEFAULT false,
    p_sort_by VARCHAR DEFAULT 'relevance',
    p_limit INT DEFAULT 20,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    product_id INT,
    product_name VARCHAR,
    slug VARCHAR,
    price DECIMAL,
    category_name VARCHAR,
    avg_rating DECIMAL,
    review_count BIGINT,
    in_stock BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.name,
        p.slug,
        p.base_price,
        c.name,
        ROUND(AVG(pr.rating)::numeric, 2) AS avg_rat,
        COUNT(pr.id) AS rev_count,
        CASE
            WHEN SUM(i.quantity - i.reserved_quantity) > 0 THEN true
            ELSE false
        END AS stock
    FROM products p
    JOIN categories c ON p.category_id = c.id
    LEFT JOIN product_reviews pr ON p.id = pr.product_id AND pr.is_approved = true
    LEFT JOIN inventory i ON p.id = i.product_id
    WHERE
        p.is_active = true
        AND (p_search_term IS NULL OR p.name ILIKE '%' || p_search_term || '%')
        AND (p_category_path IS NULL OR c.path <@ p_category_path)
        AND (p_min_price IS NULL OR p.base_price >= p_min_price)
        AND (p_max_price IS NULL OR p.base_price <= p_max_price)
        AND (NOT p_in_stock_only OR EXISTS (
            SELECT 1 FROM inventory WHERE product_id = p.id AND quantity - reserved_quantity > 0
        ))
    GROUP BY p.id, c.name
    HAVING (p_min_rating IS NULL OR AVG(pr.rating) >= p_min_rating)
    ORDER BY
        CASE WHEN p_sort_by = 'price_asc' THEN p.base_price END ASC,
        CASE WHEN p_sort_by = 'price_desc' THEN p.base_price END DESC,
        CASE WHEN p_sort_by = 'rating' THEN AVG(pr.rating) END DESC NULLS LAST,
        CASE WHEN p_sort_by = 'newest' THEN p.created_at END DESC,
        p.is_featured DESC,
        p.name
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Order history for user
SELECT
    o.id,
    o.order_number,
    o.status,
    o.total_amount,
    o.created_at,
    COUNT(oi.id) AS item_count
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.user_id = 1
GROUP BY o.id
ORDER BY o.created_at DESC;

-- Sales report by date range
SELECT
    DATE(o.created_at) AS order_date,
    COUNT(DISTINCT o.id) AS orders,
    COUNT(oi.id) AS items_sold,
    SUM(o.total_amount) AS revenue,
    AVG(o.total_amount) AS avg_order_value
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
WHERE o.created_at >= '2024-01-01'
  AND o.created_at < '2024-02-01'
  AND o.status NOT IN ('cancelled', 'refunded')
GROUP BY DATE(o.created_at)
ORDER BY order_date;

-- Inventory low stock alert
SELECT
    p.id,
    p.name,
    p.sku,
    i.quantity,
    i.reserved_quantity,
    i.quantity - i.reserved_quantity AS available,
    i.reorder_point
FROM products p
JOIN inventory i ON p.id = i.product_id
WHERE i.quantity - i.reserved_quantity <= i.reorder_point
ORDER BY i.quantity - i.reserved_quantity;

-- Top selling products
SELECT
    p.id,
    p.name,
    SUM(oi.quantity) AS units_sold,
    SUM(oi.total_amount) AS revenue
FROM products p
JOIN order_items oi ON p.id = oi.product_id
JOIN orders o ON oi.order_id = o.id
WHERE o.created_at >= CURRENT_DATE - INTERVAL '30 days'
  AND o.status NOT IN ('cancelled', 'refunded')
GROUP BY p.id, p.name
ORDER BY units_sold DESC
LIMIT 10;
```

## Triggers and Automation

### Examples

```sql
-- Update product updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Reserve inventory when order is created
CREATE OR REPLACE FUNCTION reserve_inventory_on_order()
RETURNS TRIGGER AS $$
BEGIN
    -- Reserve inventory for product
    IF NEW.product_id IS NOT NULL THEN
        UPDATE inventory
        SET reserved_quantity = reserved_quantity + NEW.quantity
        WHERE product_id = NEW.product_id;
    END IF;

    -- Reserve inventory for variant
    IF NEW.variant_id IS NOT NULL THEN
        UPDATE inventory
        SET reserved_quantity = reserved_quantity + NEW.quantity
        WHERE variant_id = NEW.variant_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reserve_inventory_trigger
AFTER INSERT ON order_items
FOR EACH ROW
EXECUTE FUNCTION reserve_inventory_on_order();

-- Deduct inventory when order is shipped
CREATE OR REPLACE FUNCTION deduct_inventory_on_ship()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'shipped' AND OLD.status != 'shipped' THEN
        -- Deduct from inventory and unreserve
        UPDATE inventory i
        SET
            quantity = quantity - oi.quantity,
            reserved_quantity = reserved_quantity - oi.quantity
        FROM order_items oi
        WHERE oi.order_id = NEW.id
          AND (
              (oi.product_id IS NOT NULL AND i.product_id = oi.product_id) OR
              (oi.variant_id IS NOT NULL AND i.variant_id = oi.variant_id)
          );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deduct_inventory_trigger
AFTER UPDATE ON orders
FOR EACH ROW
WHEN (NEW.status = 'shipped' AND OLD.status != 'shipped')
EXECUTE FUNCTION deduct_inventory_on_ship();

-- Calculate order totals
CREATE OR REPLACE FUNCTION calculate_order_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_subtotal DECIMAL;
BEGIN
    -- Calculate subtotal from order items
    SELECT COALESCE(SUM(total_amount), 0) INTO v_subtotal
    FROM order_items
    WHERE order_id = NEW.id;

    -- Update order totals
    UPDATE orders
    SET
        subtotal = v_subtotal,
        total_amount = v_subtotal + shipping_cost + tax_amount - discount_amount
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_order_totals_trigger
AFTER INSERT OR UPDATE OR DELETE ON order_items
FOR EACH ROW
EXECUTE FUNCTION calculate_order_totals();

-- Update coupon usage count
CREATE OR REPLACE FUNCTION update_coupon_usage_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE coupons
    SET usage_count = usage_count + 1
    WHERE id = NEW.coupon_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_coupon_usage_trigger
AFTER INSERT ON coupon_usage
FOR EACH ROW
EXECUTE FUNCTION update_coupon_usage_count();
```

## Performance Optimization

### Examples

```sql
-- Create materialized view for popular products
CREATE MATERIALIZED VIEW popular_products AS
SELECT
    p.id,
    p.name,
    p.slug,
    p.base_price,
    COUNT(DISTINCT o.id) AS order_count,
    SUM(oi.quantity) AS units_sold,
    SUM(oi.total_amount) AS revenue,
    AVG(pr.rating) AS avg_rating,
    COUNT(pr.id) AS review_count
FROM products p
LEFT JOIN order_items oi ON p.id = oi.product_id
LEFT JOIN orders o ON oi.order_id = o.id AND o.status NOT IN ('cancelled', 'refunded')
LEFT JOIN product_reviews pr ON p.id = pr.product_id AND pr.is_approved = true
WHERE p.is_active = true
GROUP BY p.id;

CREATE INDEX idx_popular_products_sold ON popular_products (units_sold DESC);
CREATE INDEX idx_popular_products_revenue ON popular_products (revenue DESC);

-- Refresh periodically
REFRESH MATERIALIZED VIEW CONCURRENTLY popular_products;

-- Composite indexes for common queries
CREATE INDEX idx_orders_user_status_date ON orders (user_id, status, created_at DESC);
CREATE INDEX idx_order_items_product_created ON order_items (product_id, created_at DESC);
CREATE INDEX idx_products_category_active ON products (category_id, is_active) WHERE is_active = true;

-- Partial index for active carts
CREATE INDEX idx_active_carts ON carts (user_id, updated_at) WHERE expires_at > CURRENT_TIMESTAMP;

-- ANALYZE tables regularly
ANALYZE products;
ANALYZE orders;
ANALYZE order_items;
```

## Common Mistakes

1. **Not using transactions for order creation**
2. **Insufficient inventory validation**
3. **Not tracking order status history**
4. **Storing credit card data directly**
5. **Missing indexes on foreign keys**
6. **Not handling concurrent cart/inventory updates**
7. **Calculating totals in application instead of triggers**

## Best Practices

1. **Use transactions for multi-table operations**
2. **Validate inventory before order completion**
3. **Snapshot product data in orders (prices, names)**
4. **Use triggers for automatic calculations**
5. **Implement soft deletes for orders and products**
6. **Create indexes on frequently queried columns**
7. **Use materialized views for reporting**
8. **Implement proper audit logging**

## Practice Exercises

### Exercise 1: Checkout Flow
Implement complete checkout process: validate cart, apply coupon, create order, process payment, update inventory.

### Exercise 2: Inventory Management
Create low stock alerts, reorder suggestions, and inventory adjustment functions.

### Exercise 3: Customer Analytics
Build customer lifetime value calculation, purchase frequency analysis, and personalized product recommendations.

## Summary

This e-commerce database design provides:
- Complete user authentication and profile management
- Hierarchical product catalog with variants
- Shopping cart and wishlist functionality
- Order processing with status tracking
- Payment integration framework
- Review and rating system
- Flexible discount and coupon system
- Automated inventory management
- Comprehensive reporting capabilities

The schema is production-ready with proper constraints, indexes, and business logic implementation.
