# JSON and JSONB Types

## Theory

PostgreSQL provides two data types for storing JSON (JavaScript Object Notation) data: JSON and JSONB. These types are essential for handling semi-structured data, API responses, and flexible schema designs.

### JSON vs JSONB

**JSON Type**:
- Stores exact copy of input text
- Preserves formatting, whitespace, and key order
- Faster to insert (no processing)
- Slower to query (requires reparsing)
- Preserves duplicate keys
- Storage: Text representation

**JSONB Type (Recommended)**:
- Stores decomposed binary format
- Removes whitespace, doesn't preserve key order
- Slower to insert (preprocessing)
- **Much faster to query** (no reparsing needed)
- Removes duplicate keys (keeps last)
- **Supports indexing** (GIN, B-tree on expressions)
- Storage: Binary representation

### When to Use JSON vs JSONB

**Use JSONB when**:
- You need to query or index the data (99% of cases)
- Performance is important
- You need operators like containment (@>, <@)

**Use JSON when**:
- You need exact text preservation
- You only store and retrieve (no querying)
- You need to preserve key order

### Storage Considerations

- Both support documents up to ~1GB (with TOAST)
- JSONB is larger than JSON due to indexing metadata
- JSONB may compress better with TOAST
- **Best practice**: Use JSONB unless you have specific reasons not to

### Indexing

JSONB supports powerful indexing:
- **GIN (Generalized Inverted Index)**: For containment queries (@>, ?, ?|, ?&)
- **B-tree on expressions**: For specific key lookups
- **GIN with jsonb_path_ops**: Optimized for @> queries

## Syntax

### Basic Type Definitions

```sql
-- JSON column
CREATE TABLE events (
    event_id SERIAL PRIMARY KEY,
    event_data JSON
);

-- JSONB column (recommended)
CREATE TABLE events_binary (
    event_id SERIAL PRIMARY KEY,
    event_data JSONB
);

-- Multiple JSONB columns
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    name VARCHAR(200),
    attributes JSONB,
    metadata JSONB
);
```

### Inserting JSON

```sql
-- Insert JSON as string
INSERT INTO events_binary (event_data)
VALUES ('{"name": "User Login", "timestamp": "2024-06-15T10:30:00Z"}');

-- Insert with JSON constructor
INSERT INTO events_binary (event_data)
VALUES (jsonb_build_object('name', 'Page View', 'page', '/home'));
```

### Operators

```sql
-- -> Get JSON object field (returns JSON)
SELECT event_data -> 'name' FROM events_binary;

-- ->> Get JSON object field as text
SELECT event_data ->> 'name' FROM events_binary;

-- #> Get JSON object at path (returns JSON)
SELECT event_data #> '{user,address,city}' FROM events_binary;

-- #>> Get JSON object at path as text
SELECT event_data #>> '{user,address,city}' FROM events_binary;

-- @> Contains (left contains right)
SELECT * FROM events_binary WHERE event_data @> '{"name": "User Login"}';

-- <@ Is contained by (left is contained in right)
SELECT * FROM events_binary WHERE '{"name": "User Login"}' <@ event_data;

-- ? Does key exist
SELECT * FROM events_binary WHERE event_data ? 'name';

-- ?| Do any keys exist
SELECT * FROM events_binary WHERE event_data ?| array['name', 'timestamp'];

-- ?& Do all keys exist
SELECT * FROM events_binary WHERE event_data ?& array['name', 'timestamp'];
```

## Examples

### Basic JSON Operations

```sql
-- Create table for user profiles
CREATE TABLE user_profiles (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE,
    profile JSONB
);

-- Insert profiles with various structures
INSERT INTO user_profiles (username, profile)
VALUES
    ('alice', '{"age": 28, "city": "New York", "interests": ["coding", "hiking", "photography"]}'),
    ('bob', '{"age": 35, "city": "San Francisco", "interests": ["gaming", "cooking"], "premium": true}'),
    ('charlie', '{"age": 22, "city": "Austin", "interests": ["music", "art"]}');

-- Retrieve entire JSON
SELECT username, profile FROM user_profiles;

-- Extract specific field (as JSON)
SELECT username, profile -> 'age' AS age_json FROM user_profiles;

-- Extract specific field (as text)
SELECT username, profile ->> 'age' AS age_text FROM user_profiles;

-- Extract and cast to appropriate type
SELECT
    username,
    (profile ->> 'age')::INTEGER AS age,
    profile ->> 'city' AS city
FROM user_profiles;

-- Extract nested values
INSERT INTO user_profiles (username, profile)
VALUES ('david', '{
    "age": 30,
    "city": "Boston",
    "address": {
        "street": "123 Main St",
        "zip": "02101"
    }
}');

SELECT
    username,
    profile #>> '{address,street}' AS street,
    profile #>> '{address,zip}' AS zip_code
FROM user_profiles
WHERE username = 'david';

-- Extract array elements
SELECT
    username,
    profile -> 'interests' AS interests_json,
    profile -> 'interests' -> 0 AS first_interest,
    profile -> 'interests' ->> 1 AS second_interest_text
FROM user_profiles;
```

### Containment Queries

```sql
-- Find users with specific attribute
SELECT username
FROM user_profiles
WHERE profile @> '{"city": "New York"}';

-- Find users with nested attribute
SELECT username
FROM user_profiles
WHERE profile @> '{"address": {"zip": "02101"}}';

-- Check if contained in
SELECT username
FROM user_profiles
WHERE '{"city": "Austin"}' <@ profile;

-- Find premium users
SELECT username
FROM user_profiles
WHERE profile @> '{"premium": true}';

-- Complex containment
SELECT username
FROM user_profiles
WHERE profile @> '{"interests": ["coding"]}';
```

### Existence Queries

```sql
-- Users with 'premium' key
SELECT username
FROM user_profiles
WHERE profile ? 'premium';

-- Users with address information
SELECT username
FROM user_profiles
WHERE profile ? 'address';

-- Users with any of these keys
SELECT username
FROM user_profiles
WHERE profile ?| array['premium', 'vip', 'subscriber'];

-- Users with all of these keys
SELECT username
FROM user_profiles
WHERE profile ?& array['age', 'city'];
```

### Modifying JSONB

```sql
-- jsonb_set: Update value at path
UPDATE user_profiles
SET profile = jsonb_set(profile, '{age}', '29')
WHERE username = 'alice';

-- Add new field
UPDATE user_profiles
SET profile = jsonb_set(profile, '{premium}', 'true')
WHERE username = 'charlie';

-- Update nested field
UPDATE user_profiles
SET profile = jsonb_set(profile, '{address,street}', '"456 Oak Ave"')
WHERE username = 'david';

-- Create nested object if doesn't exist
UPDATE user_profiles
SET profile = jsonb_set(
    profile,
    '{preferences,notifications}',
    'true',
    true  -- create_missing = true
)
WHERE username = 'alice';

-- jsonb_insert: Insert value at path
UPDATE user_profiles
SET profile = jsonb_insert(
    profile,
    '{interests,0}',  -- Insert at beginning of array
    '"reading"'
)
WHERE username = 'bob';

-- Concatenation operator ||
UPDATE user_profiles
SET profile = profile || '{"newsletter": true}'
WHERE username = 'alice';

-- Remove key
UPDATE user_profiles
SET profile = profile - 'newsletter'
WHERE username = 'alice';

-- Remove nested key
UPDATE user_profiles
SET profile = profile #- '{preferences,notifications}'
WHERE username = 'alice';
```

### JSONB Functions

```sql
-- jsonb_build_object: Create JSON object
SELECT jsonb_build_object(
    'name', 'Alice',
    'age', 28,
    'active', true
) AS user_object;

-- jsonb_build_array: Create JSON array
SELECT jsonb_build_array(
    'apple',
    'banana',
    'cherry'
) AS fruits;

-- jsonb_object: Create object from text arrays
SELECT jsonb_object(
    ARRAY['name', 'age', 'city'],
    ARRAY['Alice', '28', 'NYC']
) AS user_from_arrays;

-- jsonb_agg: Aggregate to JSONB array
SELECT jsonb_agg(profile) AS all_profiles
FROM user_profiles;

-- jsonb_object_agg: Aggregate to JSONB object
SELECT jsonb_object_agg(username, profile) AS users_object
FROM user_profiles;

-- to_jsonb: Convert row to JSONB
CREATE TABLE simple_users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50),
    email VARCHAR(100)
);

INSERT INTO simple_users (name, email)
VALUES ('Alice', 'alice@example.com');

SELECT to_jsonb(simple_users) AS user_json
FROM simple_users;

-- row_to_json with nested data
SELECT jsonb_build_object(
    'user', to_jsonb(u.*),
    'profile_age', u.profile ->> 'age'
) AS combined
FROM user_profiles u
WHERE username = 'alice';
```

### Working with Arrays

```sql
-- jsonb_array_elements: Expand array to rows
SELECT
    username,
    jsonb_array_elements(profile -> 'interests') AS interest
FROM user_profiles
WHERE profile ? 'interests';

-- jsonb_array_elements_text: Expand to text
SELECT
    username,
    jsonb_array_elements_text(profile -> 'interests') AS interest_text
FROM user_profiles
WHERE profile ? 'interests';

-- jsonb_array_length: Get array length
SELECT
    username,
    jsonb_array_length(profile -> 'interests') AS interest_count
FROM user_profiles
WHERE profile ? 'interests';

-- Filter array elements
SELECT
    username,
    interest
FROM user_profiles,
     jsonb_array_elements_text(profile -> 'interests') AS interest
WHERE interest LIKE '%ing%';

-- Aggregate array elements
SELECT
    STRING_AGG(interest, ', ') AS all_interests
FROM user_profiles,
     jsonb_array_elements_text(profile -> 'interests') AS interest;
```

### JSONB Keys and Values

```sql
-- jsonb_each: Get key-value pairs as JSON
SELECT
    username,
    jsonb_each(profile)
FROM user_profiles
WHERE username = 'alice';

-- jsonb_each_text: Get key-value pairs as text
SELECT
    username,
    key,
    value
FROM user_profiles,
     jsonb_each_text(profile)
WHERE username = 'alice';

-- jsonb_object_keys: Get all keys
SELECT DISTINCT jsonb_object_keys(profile) AS profile_keys
FROM user_profiles;

-- Count keys per user
SELECT
    username,
    COUNT(*) AS key_count
FROM user_profiles,
     jsonb_object_keys(profile)
GROUP BY username;
```

### SQL/JSON Path Queries (PostgreSQL 12+)

```sql
-- jsonb_path_query: Query using JSON path
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    data JSONB
);

INSERT INTO products (data)
VALUES
    ('{"name": "Laptop", "price": 999, "specs": {"ram": "16GB", "cpu": "i7"}}'),
    ('{"name": "Mouse", "price": 29, "specs": {"dpi": 1600}}'),
    ('{"name": "Monitor", "price": 399, "specs": {"size": "27inch", "resolution": "4K"}}');

-- Basic path query
SELECT
    data ->> 'name' AS product,
    jsonb_path_query(data, '$.price') AS price
FROM products;

-- Path with filter
SELECT
    data ->> 'name' AS product,
    data -> 'price' AS price
FROM products
WHERE jsonb_path_exists(data, '$.price ? (@ > 100)');

-- jsonb_path_query_array: Return results as array
SELECT jsonb_path_query_array(
    '[{"name": "Alice", "age": 28}, {"name": "Bob", "age": 35}]',
    '$[*].name'
) AS names;

-- Complex path expressions
SELECT
    data ->> 'name' AS product,
    jsonb_path_query(data, '$.specs.*') AS spec_value
FROM products
WHERE data ->> 'name' = 'Laptop';
```

### Indexing JSONB

```sql
-- GIN index for general containment queries
CREATE INDEX idx_profile_gin ON user_profiles USING GIN (profile);

-- Test containment with index
EXPLAIN ANALYZE
SELECT username
FROM user_profiles
WHERE profile @> '{"city": "New York"}';

-- GIN index with jsonb_path_ops (smaller, faster for @>)
CREATE INDEX idx_profile_path_ops ON user_profiles USING GIN (profile jsonb_path_ops);

-- B-tree index on specific key
CREATE INDEX idx_profile_age ON user_profiles ((profile ->> 'age'));

-- Query using expression index
SELECT username, profile ->> 'age' AS age
FROM user_profiles
WHERE profile ->> 'age' = '28';

-- Partial index for specific conditions
CREATE INDEX idx_premium_users ON user_profiles (username)
WHERE profile @> '{"premium": true}';

-- Multi-column index
CREATE INDEX idx_username_city ON user_profiles (username, (profile ->> 'city'));
```

### Practical Application: Product Catalog

```sql
-- Comprehensive product catalog
CREATE TABLE product_catalog (
    product_id SERIAL PRIMARY KEY,
    sku VARCHAR(50) UNIQUE,
    name VARCHAR(200),
    base_price NUMERIC(10, 2),
    attributes JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create GIN index
CREATE INDEX idx_product_attributes ON product_catalog USING GIN (attributes);

-- Insert products with varying attributes
INSERT INTO product_catalog (sku, name, base_price, attributes)
VALUES
    ('LAP-001', 'Premium Laptop', 1299.99, '{
        "category": "Electronics",
        "brand": "TechBrand",
        "specs": {
            "cpu": "Intel i7",
            "ram": "16GB",
            "storage": "512GB SSD",
            "screen": "15.6 inch"
        },
        "features": ["backlit keyboard", "fingerprint reader", "USB-C"],
        "colors": ["silver", "black"],
        "weight_kg": 1.8,
        "warranty_years": 2
    }'),
    ('MOU-001', 'Wireless Mouse', 29.99, '{
        "category": "Accessories",
        "brand": "TechBrand",
        "specs": {
            "dpi": 1600,
            "buttons": 5,
            "connectivity": "Bluetooth"
        },
        "features": ["ergonomic", "rechargeable"],
        "colors": ["black", "white", "blue"],
        "weight_g": 95
    }'),
    ('MON-001', '4K Monitor', 499.99, '{
        "category": "Electronics",
        "brand": "DisplayCo",
        "specs": {
            "size": "27 inch",
            "resolution": "3840x2160",
            "refresh_rate": "60Hz",
            "panel_type": "IPS"
        },
        "features": ["HDR", "height adjustable", "VESA mount"],
        "colors": ["black"],
        "weight_kg": 5.2,
        "warranty_years": 3
    }');

-- Find products by category
SELECT name, base_price
FROM product_catalog
WHERE attributes @> '{"category": "Electronics"}';

-- Find products by brand and category
SELECT name, base_price
FROM product_catalog
WHERE attributes @> '{"category": "Electronics", "brand": "TechBrand"}';

-- Find products with specific feature
SELECT name, base_price
FROM product_catalog
WHERE attributes @> '{"features": ["USB-C"]}';

-- Search nested specs
SELECT name, attributes #>> '{specs,cpu}' AS cpu
FROM product_catalog
WHERE attributes #>> '{specs,cpu}' LIKE '%i7%';

-- Products available in specific color
SELECT
    name,
    jsonb_array_elements_text(attributes -> 'colors') AS available_color
FROM product_catalog
WHERE attributes -> 'colors' ? 'black';

-- Aggregate features
SELECT
    attributes ->> 'category' AS category,
    COUNT(*) AS product_count,
    AVG(base_price) AS avg_price,
    jsonb_agg(DISTINCT attributes -> 'brand') AS brands
FROM product_catalog
GROUP BY attributes ->> 'category';

-- Complex filtering
SELECT
    name,
    base_price,
    attributes #>> '{specs,ram}' AS ram,
    attributes -> 'features' AS features
FROM product_catalog
WHERE attributes @> '{"category": "Electronics"}'
  AND (attributes ->> 'warranty_years')::INTEGER >= 2
  AND base_price < 1000
ORDER BY base_price DESC;
```

### JSONB vs Relational Design

```sql
-- When to use JSONB vs relational
-- JSONB approach (flexible schema)
CREATE TABLE orders_jsonb (
    order_id SERIAL PRIMARY KEY,
    customer_email VARCHAR(255),
    order_data JSONB
);

-- Relational approach (structured schema)
CREATE TABLE orders_relational (
    order_id SERIAL PRIMARY KEY,
    customer_email VARCHAR(255),
    order_date DATE,
    total NUMERIC(10, 2)
);

CREATE TABLE order_items (
    item_id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders_relational(order_id),
    product_name VARCHAR(200),
    quantity INTEGER,
    price NUMERIC(10, 2)
);

-- Hybrid approach (best of both worlds)
CREATE TABLE orders_hybrid (
    order_id SERIAL PRIMARY KEY,
    customer_email VARCHAR(255),
    order_date DATE,
    total NUMERIC(10, 2),
    shipping_address JSONB,  -- Flexible nested data
    metadata JSONB  -- Extra attributes without schema change
);
```

## Common Mistakes

### 1. Using JSON Instead of JSONB

```sql
-- MISTAKE: Using JSON when you need to query
CREATE TABLE events (
    data JSON  -- Slow queries, no indexing
);

-- BETTER: Use JSONB
CREATE TABLE events (
    data JSONB  -- Fast queries, indexable
);
```

### 2. Not Using Indexes

```sql
-- MISTAKE: Querying JSONB without index
SELECT * FROM products WHERE attributes @> '{"category": "Electronics"}';  -- Slow

-- BETTER: Add GIN index
CREATE INDEX idx_attributes ON products USING GIN (attributes);
```

### 3. Storing Everything in JSONB

```sql
-- MISTAKE: Putting all data in JSONB
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    data JSONB  -- email, name, created_at all in JSON
);

-- BETTER: Use columns for frequently queried fields
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE,  -- Indexed, constrained
    created_at TIMESTAMPTZ,
    extra_data JSONB  -- Optional attributes only
);
```

### 4. Incorrect Operator Usage

```sql
-- MISTAKE: Using -> when you need text
SELECT * FROM users WHERE profile -> 'age' = 28;  -- Won't work (JSON != integer)

-- BETTER: Use ->> and cast
SELECT * FROM users WHERE (profile ->> 'age')::INTEGER = 28;

-- OR: Compare as JSON
SELECT * FROM users WHERE profile @> '{"age": 28}';
```

### 5. Not Handling NULL

```sql
-- MISTAKE: Not checking for NULL
SELECT profile ->> 'age' FROM users;  -- NULL if key doesn't exist

-- BETTER: Use COALESCE
SELECT COALESCE(profile ->> 'age', 'Unknown') AS age FROM users;
```

### 6. Inefficient Path Queries

```sql
-- MISTAKE: Multiple separate queries
SELECT
    profile -> 'address' -> 'city',
    profile -> 'address' -> 'state',
    profile -> 'address' -> 'zip'
FROM users;

-- BETTER: Extract parent object once
SELECT
    profile -> 'address' AS address,
    profile #>> '{address,city}' AS city,
    profile #>> '{address,state}' AS state
FROM users;
```

## Best Practices

### 1. Use JSONB for Semi-Structured Data

```sql
-- Good use case: variable attributes
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    name VARCHAR(200),
    price NUMERIC(10, 2),
    attributes JSONB  -- Different per product type
);
```

### 2. Index Appropriately

```sql
-- General queries: GIN index
CREATE INDEX idx_data_gin ON table_name USING GIN (data);

-- Containment (@>) only: jsonb_path_ops
CREATE INDEX idx_data_path ON table_name USING GIN (data jsonb_path_ops);

-- Specific key: Expression index
CREATE INDEX idx_data_key ON table_name ((data ->> 'key'));
```

### 3. Validate JSONB Structure

```sql
-- Add check constraint for required keys
ALTER TABLE products
ADD CONSTRAINT products_attributes_check
CHECK (attributes ?& array['category', 'brand']);

-- Or use trigger for complex validation
CREATE OR REPLACE FUNCTION validate_product_attributes()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT (NEW.attributes ? 'category') THEN
        RAISE EXCEPTION 'category is required';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 4. Use Hybrid Design

```sql
-- Structured data in columns, flexible in JSONB
CREATE TABLE optimal_design (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE,  -- Queryable, constrained
    created_at TIMESTAMPTZ,
    preferences JSONB  -- User-specific, variable
);
```

### 5. Normalize When Appropriate

```sql
-- JSONB for truly flexible data
-- Relational for structured, frequently joined data

-- Good JSONB use
CREATE TABLE user_settings (
    user_id INTEGER PRIMARY KEY,
    preferences JSONB  -- Theme, language, notifications
);

-- Bad JSONB use (should be relational)
-- Don't store order items in JSONB if you need to query/aggregate them
```

### 6. Use JSONB Functions

```sql
-- Build objects with functions
INSERT INTO logs (data)
VALUES (jsonb_build_object(
    'event', 'user_login',
    'timestamp', NOW(),
    'user_id', 123
));
```

## Practice Exercises

### Exercise 1: E-commerce Product Search

Create a product search system with flexible attributes:

Requirements:
1. Create products table with JSONB attributes
2. Insert products with varying schemas (electronics, clothing, books)
3. Create appropriate indexes
4. Query products by category, price range, and specific attributes
5. Implement faceted search (count products by attribute values)

<details>
<summary>Solution</summary>

```sql
-- Create products table
CREATE TABLE ecommerce_products (
    product_id SERIAL PRIMARY KEY,
    sku VARCHAR(50) UNIQUE,
    name VARCHAR(200),
    price NUMERIC(10, 2),
    attributes JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_product_attributes_gin ON ecommerce_products USING GIN (attributes);
CREATE INDEX idx_product_category ON ecommerce_products ((attributes ->> 'category'));
CREATE INDEX idx_product_price ON ecommerce_products (price);

-- Insert electronics
INSERT INTO ecommerce_products (sku, name, price, attributes) VALUES
('ELEC-001', 'Smartphone Pro', 899.99, '{
    "category": "Electronics",
    "subcategory": "Smartphones",
    "brand": "TechCo",
    "specs": {"storage": "256GB", "ram": "8GB", "screen": "6.5 inch"},
    "colors": ["black", "silver", "blue"],
    "features": ["5G", "wireless charging", "water resistant"]
}'),
('ELEC-002', 'Laptop Ultra', 1299.99, '{
    "category": "Electronics",
    "subcategory": "Laptops",
    "brand": "CompuBrand",
    "specs": {"storage": "512GB SSD", "ram": "16GB", "cpu": "i7"},
    "colors": ["silver"],
    "features": ["backlit keyboard", "fingerprint reader"]
}');

-- Insert clothing
INSERT INTO ecommerce_products (sku, name, price, attributes) VALUES
('CLTH-001', 'Cotton T-Shirt', 24.99, '{
    "category": "Clothing",
    "subcategory": "Shirts",
    "brand": "FashionCo",
    "sizes": ["S", "M", "L", "XL"],
    "colors": ["red", "blue", "black", "white"],
    "material": "100% Cotton"
}'),
('CLTH-002', 'Denim Jeans', 79.99, '{
    "category": "Clothing",
    "subcategory": "Pants",
    "brand": "DenimBrand",
    "sizes": ["28", "30", "32", "34"],
    "colors": ["blue", "black"],
    "material": "Denim",
    "fit": "slim"
}');

-- Insert books
INSERT INTO ecommerce_products (sku, name, price, attributes) VALUES
('BOOK-001', 'PostgreSQL Guide', 49.99, '{
    "category": "Books",
    "subcategory": "Technology",
    "author": "John Doe",
    "publisher": "Tech Publishing",
    "pages": 450,
    "isbn": "978-1234567890",
    "format": ["hardcover", "ebook"]
}');

-- Query by category
SELECT name, price, attributes ->> 'subcategory' AS subcategory
FROM ecommerce_products
WHERE attributes @> '{"category": "Electronics"}';

-- Query by price range and category
SELECT name, price
FROM ecommerce_products
WHERE attributes @> '{"category": "Clothing"}'
  AND price BETWEEN 20 AND 80
ORDER BY price;

-- Query by nested attribute
SELECT name, price, attributes #>> '{specs,ram}' AS ram
FROM ecommerce_products
WHERE attributes #>> '{specs,ram}' = '16GB';

-- Products with specific feature
SELECT name, attributes -> 'features' AS features
FROM ecommerce_products
WHERE attributes -> 'features' ? '5G';

-- Faceted search - count by category
SELECT
    attributes ->> 'category' AS category,
    COUNT(*) AS product_count,
    MIN(price) AS min_price,
    MAX(price) AS max_price,
    AVG(price)::NUMERIC(10,2) AS avg_price
FROM ecommerce_products
GROUP BY attributes ->> 'category';

-- Available colors across products
SELECT DISTINCT
    jsonb_array_elements_text(attributes -> 'colors') AS color
FROM ecommerce_products
WHERE attributes ? 'colors'
ORDER BY color;

-- Products by brand (count)
SELECT
    attributes ->> 'brand' AS brand,
    COUNT(*) AS product_count
FROM ecommerce_products
WHERE attributes ? 'brand'
GROUP BY attributes ->> 'brand'
ORDER BY product_count DESC;
```

</details>

### Exercise 2: Event Logging System

Create an event logging system with flexible event data:

Requirements:
1. Create events table with JSONB event_data
2. Log different event types (user_login, page_view, purchase, error)
3. Query events by type, user, and timeframe
4. Extract and aggregate event-specific data
5. Implement event analysis queries

<details>
<summary>Solution</summary>

```sql
-- Create events table
CREATE TABLE event_logs (
    event_id SERIAL PRIMARY KEY,
    event_type VARCHAR(50),
    user_id INTEGER,
    event_data JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_event_type ON event_logs (event_type);
CREATE INDEX idx_event_created ON event_logs (created_at);
CREATE INDEX idx_event_data_gin ON event_logs USING GIN (event_data);
CREATE INDEX idx_event_user ON event_logs (user_id);

-- Log user login events
INSERT INTO event_logs (event_type, user_id, event_data) VALUES
('user_login', 1, '{"ip": "192.168.1.100", "device": "mobile", "success": true}'),
('user_login', 2, '{"ip": "192.168.1.101", "device": "desktop", "success": true}'),
('user_login', 1, '{"ip": "192.168.1.100", "device": "mobile", "success": false, "reason": "invalid password"}');

-- Log page view events
INSERT INTO event_logs (event_type, user_id, event_data) VALUES
('page_view', 1, '{"page": "/products", "referrer": "/home", "duration_seconds": 45}'),
('page_view', 1, '{"page": "/cart", "referrer": "/products", "duration_seconds": 120}'),
('page_view', 2, '{"page": "/home", "referrer": null, "duration_seconds": 30}');

-- Log purchase events
INSERT INTO event_logs (event_type, user_id, event_data) VALUES
('purchase', 1, '{"order_id": "ORD-001", "total": 99.99, "items": 3, "payment_method": "credit_card"}'),
('purchase', 2, '{"order_id": "ORD-002", "total": 149.99, "items": 2, "payment_method": "paypal"}');

-- Log error events
INSERT INTO event_logs (event_type, user_id, event_data) VALUES
('error', 1, '{"error_code": "500", "message": "Internal server error", "endpoint": "/api/checkout"}');

-- Query events by type
SELECT event_id, user_id, event_data, created_at
FROM event_logs
WHERE event_type = 'user_login'
ORDER BY created_at DESC;

-- Failed login attempts
SELECT
    user_id,
    event_data ->> 'ip' AS ip_address,
    event_data ->> 'reason' AS failure_reason,
    created_at
FROM event_logs
WHERE event_type = 'user_login'
  AND event_data @> '{"success": false}';

-- Page views with duration
SELECT
    user_id,
    event_data ->> 'page' AS page,
    (event_data ->> 'duration_seconds')::INTEGER AS duration
FROM event_logs
WHERE event_type = 'page_view'
ORDER BY duration DESC;

-- Purchase analysis
SELECT
    COUNT(*) AS total_purchases,
    SUM((event_data ->> 'total')::NUMERIC) AS total_revenue,
    AVG((event_data ->> 'total')::NUMERIC)::NUMERIC(10,2) AS avg_order_value,
    jsonb_object_agg(
        event_data ->> 'payment_method',
        COUNT(*)
    ) AS payment_methods
FROM event_logs
WHERE event_type = 'purchase';

-- User activity summary
SELECT
    user_id,
    COUNT(*) FILTER (WHERE event_type = 'user_login') AS login_count,
    COUNT(*) FILTER (WHERE event_type = 'page_view') AS page_views,
    COUNT(*) FILTER (WHERE event_type = 'purchase') AS purchases
FROM event_logs
GROUP BY user_id;

-- Events in last 24 hours by type
SELECT
    event_type,
    COUNT(*) AS event_count
FROM event_logs
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY event_type
ORDER BY event_count DESC;
```

</details>

### Exercise 3: Configuration Management

Create a configuration management system with versioning:

Requirements:
1. Store application configurations as JSONB
2. Support multiple environments (dev, staging, prod)
3. Track configuration versions
4. Query and compare configurations
5. Implement configuration inheritance

<details>
<summary>Solution</summary>

```sql
-- Create configurations table
CREATE TABLE app_configurations (
    config_id SERIAL PRIMARY KEY,
    app_name VARCHAR(100),
    environment VARCHAR(20),
    version INTEGER,
    config_data JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(app_name, environment, version)
);

-- Create index
CREATE INDEX idx_config_data ON app_configurations USING GIN (config_data);

-- Insert base configuration
INSERT INTO app_configurations (app_name, environment, version, config_data) VALUES
('my_app', 'dev', 1, '{
    "database": {
        "host": "localhost",
        "port": 5432,
        "name": "myapp_dev"
    },
    "cache": {
        "enabled": true,
        "ttl_seconds": 300
    },
    "features": {
        "new_ui": true,
        "beta_features": true
    },
    "logging": {
        "level": "debug"
    }
}');

INSERT INTO app_configurations (app_name, environment, version, config_data) VALUES
('my_app', 'prod', 1, '{
    "database": {
        "host": "prod-db.example.com",
        "port": 5432,
        "name": "myapp_prod"
    },
    "cache": {
        "enabled": true,
        "ttl_seconds": 3600
    },
    "features": {
        "new_ui": false,
        "beta_features": false
    },
    "logging": {
        "level": "error"
    }
}');

-- Get active configuration
SELECT config_data
FROM app_configurations
WHERE app_name = 'my_app'
  AND environment = 'dev'
  AND is_active = true
ORDER BY version DESC
LIMIT 1;

-- Get specific configuration value
SELECT
    environment,
    config_data #>> '{database,host}' AS db_host,
    config_data #>> '{logging,level}' AS log_level
FROM app_configurations
WHERE app_name = 'my_app'
  AND is_active = true;

-- Compare configurations across environments
SELECT
    environment,
    config_data -> 'features' AS features
FROM app_configurations
WHERE app_name = 'my_app'
  AND is_active = true
ORDER BY environment;

-- Find differences
WITH dev_config AS (
    SELECT config_data FROM app_configurations
    WHERE app_name = 'my_app' AND environment = 'dev' AND is_active = true
),
prod_config AS (
    SELECT config_data FROM app_configurations
    WHERE app_name = 'my_app' AND environment = 'prod' AND is_active = true
)
SELECT
    'dev' AS env,
    jsonb_object_keys(d.config_data) AS key,
    d.config_data -> jsonb_object_keys(d.config_data) AS value
FROM dev_config d
WHERE NOT (d.config_data @> (SELECT config_data FROM prod_config));

-- Update configuration (create new version)
INSERT INTO app_configurations (app_name, environment, version, config_data)
SELECT
    app_name,
    environment,
    version + 1,
    config_data || '{"features": {"new_ui": true, "beta_features": true, "ai_assistant": true}}'
FROM app_configurations
WHERE app_name = 'my_app'
  AND environment = 'prod'
  AND is_active = true;

-- Configuration history
SELECT
    version,
    config_data -> 'features' AS features,
    created_at
FROM app_configurations
WHERE app_name = 'my_app'
  AND environment = 'prod'
ORDER BY version DESC;
```

</details>

## Related Topics

- [Array Types](06-array-types.md) - JSONB arrays vs PostgreSQL arrays
- [Text Types](02-text-types.md) - JSON stored as text vs JSONB
- [Special Types](07-special-types.md) - hstore as alternative key-value storage

## Additional Resources

- PostgreSQL Documentation: [JSON Types](https://www.postgresql.org/docs/16/datatype-json.html)
- PostgreSQL Documentation: [JSON Functions](https://www.postgresql.org/docs/16/functions-json.html)
- PostgreSQL Documentation: [JSON Path](https://www.postgresql.org/docs/16/functions-json.html#FUNCTIONS-SQLJSON-PATH)
- PostgreSQL Documentation: [GIN Indexes](https://www.postgresql.org/docs/16/gin-intro.html)
