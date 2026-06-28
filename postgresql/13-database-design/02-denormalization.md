# Database Denormalization

## Theory

Denormalization is the process of intentionally introducing redundancy into a normalized database to improve read performance. It trades write complexity and storage space for faster queries by reducing the number of joins needed.

### When to Denormalize

1. **Read-Heavy Workloads**: When reads vastly outnumber writes (90%+ read operations)
2. **Performance Bottlenecks**: When queries with many joins become too slow
3. **Reporting Requirements**: When aggregate data is frequently needed
4. **Caching Requirements**: When the same computed values are requested repeatedly
5. **Horizontal Scaling**: When you need to partition data and avoid cross-partition joins

### Trade-offs

**Benefits:**
- Faster read queries (fewer joins)
- Simpler queries for common operations
- Better performance for analytical workloads
- Easier data partitioning

**Costs:**
- Increased storage requirements
- More complex write operations
- Risk of data inconsistency
- More difficult maintenance
- Potential for stale data

### Denormalization Strategies

1. **Calculated/Cached Columns**: Store computed values
2. **Materialized Views**: Precompute complex queries
3. **Summary/Aggregate Tables**: Store rolled-up data
4. **Denormalized JSONB Columns**: Embed related data
5. **Redundant Foreign Data**: Duplicate frequently accessed fields

## Calculated/Cached Columns

### Examples

```sql
-- Setup: Normalized schema
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL,
    order_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'pending'
);

CREATE TABLE order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(order_id) ON DELETE CASCADE,
    product_id INT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL
);

-- Denormalized: Add cached total to orders table
ALTER TABLE orders ADD COLUMN total_amount NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN item_count INT DEFAULT 0;

-- Trigger to maintain cached values
CREATE OR REPLACE FUNCTION update_order_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE orders
    SET
        total_amount = (
            SELECT COALESCE(SUM(quantity * unit_price), 0)
            FROM order_items
            WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
        ),
        item_count = (
            SELECT COALESCE(COUNT(*), 0)
            FROM order_items
            WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
        )
    WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_order_totals
AFTER INSERT OR UPDATE OR DELETE ON order_items
FOR EACH ROW EXECUTE FUNCTION update_order_totals();

-- Test the denormalization
INSERT INTO orders (customer_id) VALUES (1) RETURNING order_id;

INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
(1, 101, 2, 29.99),
(1, 102, 1, 149.99);

-- Fast query without joins
SELECT order_id, total_amount, item_count
FROM orders
WHERE order_id = 1;

-- Update triggers recalculation
UPDATE order_items SET quantity = 3 WHERE order_id = 1 AND product_id = 101;

SELECT order_id, total_amount, item_count FROM orders WHERE order_id = 1;
```

### Running Totals and Counters

```sql
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    -- Denormalized counters
    post_count INT DEFAULT 0,
    follower_count INT DEFAULT 0,
    following_count INT DEFAULT 0
);

CREATE TABLE posts (
    post_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE follows (
    follower_id INT REFERENCES users(user_id),
    following_id INT REFERENCES users(user_id),
    followed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, following_id),
    CHECK (follower_id != following_id)
);

-- Maintain post_count
CREATE OR REPLACE FUNCTION update_post_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE users SET post_count = post_count + 1 WHERE user_id = NEW.user_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE users SET post_count = post_count - 1 WHERE user_id = OLD.user_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_post_count
AFTER INSERT OR DELETE ON posts
FOR EACH ROW EXECUTE FUNCTION update_post_count();

-- Maintain follower/following counts
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE users SET following_count = following_count + 1 WHERE user_id = NEW.follower_id;
        UPDATE users SET follower_count = follower_count + 1 WHERE user_id = NEW.following_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE users SET following_count = following_count - 1 WHERE user_id = OLD.follower_id;
        UPDATE users SET follower_count = follower_count - 1 WHERE user_id = OLD.following_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_follow_counts
AFTER INSERT OR DELETE ON follows
FOR EACH ROW EXECUTE FUNCTION update_follow_counts();

-- Test
INSERT INTO users (username, email) VALUES
('alice', 'alice@example.com'),
('bob', 'bob@example.com');

INSERT INTO posts (user_id, content) VALUES (1, 'Hello world!');
INSERT INTO follows (follower_id, following_id) VALUES (2, 1);

SELECT username, post_count, follower_count, following_count
FROM users;
```

## Materialized Views

### Basic Materialized Views

```sql
-- Complex query that we want to cache
CREATE MATERIALIZED VIEW daily_sales_summary AS
SELECT
    order_date,
    COUNT(DISTINCT order_id) as order_count,
    COUNT(DISTINCT customer_id) as customer_count,
    SUM(total_amount) as total_revenue,
    AVG(total_amount) as avg_order_value,
    MAX(total_amount) as max_order_value
FROM orders
WHERE status = 'completed'
GROUP BY order_date
ORDER BY order_date DESC;

-- Create index on materialized view
CREATE UNIQUE INDEX idx_daily_sales_date ON daily_sales_summary(order_date);

-- Query is now instant
SELECT * FROM daily_sales_summary
WHERE order_date >= CURRENT_DATE - INTERVAL '30 days';

-- Refresh the materialized view
REFRESH MATERIALIZED VIEW daily_sales_summary;

-- Concurrent refresh (allows reads during refresh)
REFRESH MATERIALIZED VIEW CONCURRENTLY daily_sales_summary;
```

### Scheduled Refresh with pg_cron

```sql
-- Product performance materialized view
CREATE MATERIALIZED VIEW product_performance AS
SELECT
    p.product_id,
    p.product_name,
    COUNT(DISTINCT oi.order_id) as times_ordered,
    SUM(oi.quantity) as total_quantity_sold,
    SUM(oi.quantity * oi.unit_price) as total_revenue,
    AVG(oi.unit_price) as avg_price,
    MAX(o.order_date) as last_ordered_date
FROM products p
LEFT JOIN order_items oi ON p.product_id = oi.product_id
LEFT JOIN orders o ON oi.order_id = o.order_id
WHERE o.status = 'completed' OR o.status IS NULL
GROUP BY p.product_id, p.product_name;

CREATE INDEX idx_product_perf_revenue ON product_performance(total_revenue DESC);

-- Manual refresh function
CREATE OR REPLACE FUNCTION refresh_product_performance()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY product_performance;
END;
$$ LANGUAGE plpgsql;

-- Schedule with pg_cron (if available)
-- SELECT cron.schedule('refresh-product-perf', '0 */6 * * *', 'SELECT refresh_product_performance()');

-- Or use a trigger-based approach for near real-time updates
CREATE OR REPLACE FUNCTION queue_materialized_view_refresh()
RETURNS TRIGGER AS $$
BEGIN
    -- In production, you might queue this to a background job
    -- For now, we'll just note that a refresh is needed
    PERFORM pg_notify('refresh_needed', 'product_performance');
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_queue_product_perf_refresh
AFTER INSERT OR UPDATE OR DELETE ON order_items
FOR EACH STATEMENT EXECUTE FUNCTION queue_materialized_view_refresh();
```

## Summary/Aggregate Tables

### Pre-aggregated Analytics

```sql
-- User activity summary table
CREATE TABLE user_activity_summary (
    user_id INT PRIMARY KEY REFERENCES users(user_id),
    last_login TIMESTAMP,
    login_count INT DEFAULT 0,
    total_orders INT DEFAULT 0,
    total_spent NUMERIC(12, 2) DEFAULT 0,
    avg_order_value NUMERIC(10, 2) DEFAULT 0,
    last_order_date DATE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Initialize from existing data
INSERT INTO user_activity_summary (user_id, total_orders, total_spent, avg_order_value, last_order_date)
SELECT
    customer_id,
    COUNT(*) as total_orders,
    SUM(total_amount) as total_spent,
    AVG(total_amount) as avg_order_value,
    MAX(order_date) as last_order_date
FROM orders
WHERE status = 'completed'
GROUP BY customer_id
ON CONFLICT (user_id) DO UPDATE
SET
    total_orders = EXCLUDED.total_orders,
    total_spent = EXCLUDED.total_spent,
    avg_order_value = EXCLUDED.avg_order_value,
    last_order_date = EXCLUDED.last_order_date,
    updated_at = CURRENT_TIMESTAMP;

-- Maintain with triggers
CREATE OR REPLACE FUNCTION update_user_activity_summary()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        IF NEW.status = 'completed' THEN
            INSERT INTO user_activity_summary (user_id, total_orders, total_spent, last_order_date)
            SELECT
                customer_id,
                COUNT(*),
                SUM(total_amount),
                MAX(order_date)
            FROM orders
            WHERE customer_id = NEW.customer_id AND status = 'completed'
            GROUP BY customer_id
            ON CONFLICT (user_id) DO UPDATE
            SET
                total_orders = EXCLUDED.total_orders,
                total_spent = EXCLUDED.total_spent,
                avg_order_value = EXCLUDED.total_spent / NULLIF(EXCLUDED.total_orders, 0),
                last_order_date = EXCLUDED.last_order_date,
                updated_at = CURRENT_TIMESTAMP;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_user_activity
AFTER INSERT OR UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION update_user_activity_summary();

-- Fast queries for user segments
SELECT COUNT(*) as vip_customers
FROM user_activity_summary
WHERE total_spent > 10000;

SELECT COUNT(*) as churned_customers
FROM user_activity_summary
WHERE last_order_date < CURRENT_DATE - INTERVAL '6 months';
```

### Time-series Rollups

```sql
-- Hourly metrics table
CREATE TABLE hourly_metrics (
    metric_hour TIMESTAMP PRIMARY KEY,
    order_count INT DEFAULT 0,
    revenue NUMERIC(12, 2) DEFAULT 0,
    unique_customers INT DEFAULT 0,
    avg_order_value NUMERIC(10, 2) DEFAULT 0
);

-- Daily rollup from hourly
CREATE TABLE daily_metrics (
    metric_date DATE PRIMARY KEY,
    order_count INT DEFAULT 0,
    revenue NUMERIC(12, 2) DEFAULT 0,
    unique_customers INT DEFAULT 0,
    avg_order_value NUMERIC(10, 2) DEFAULT 0
);

-- Monthly rollup from daily
CREATE TABLE monthly_metrics (
    metric_month DATE PRIMARY KEY,  -- First day of month
    order_count INT DEFAULT 0,
    revenue NUMERIC(12, 2) DEFAULT 0,
    unique_customers INT DEFAULT 0,
    avg_order_value NUMERIC(10, 2) DEFAULT 0
);

-- Function to rollup hourly metrics
CREATE OR REPLACE FUNCTION rollup_hourly_metrics(p_hour TIMESTAMP)
RETURNS void AS $$
BEGIN
    INSERT INTO hourly_metrics (metric_hour, order_count, revenue, unique_customers, avg_order_value)
    SELECT
        date_trunc('hour', order_date + created_at::time) as metric_hour,
        COUNT(*) as order_count,
        SUM(total_amount) as revenue,
        COUNT(DISTINCT customer_id) as unique_customers,
        AVG(total_amount) as avg_order_value
    FROM orders
    WHERE date_trunc('hour', order_date + created_at::time) = p_hour
        AND status = 'completed'
    GROUP BY metric_hour
    ON CONFLICT (metric_hour) DO UPDATE
    SET
        order_count = EXCLUDED.order_count,
        revenue = EXCLUDED.revenue,
        unique_customers = EXCLUDED.unique_customers,
        avg_order_value = EXCLUDED.avg_order_value;
END;
$$ LANGUAGE plpgsql;

-- Rollup daily from hourly
CREATE OR REPLACE FUNCTION rollup_daily_metrics(p_date DATE)
RETURNS void AS $$
BEGIN
    INSERT INTO daily_metrics (metric_date, order_count, revenue, unique_customers)
    SELECT
        p_date,
        SUM(order_count),
        SUM(revenue),
        -- Can't just sum unique customers, need to query original data
        (SELECT COUNT(DISTINCT customer_id)
         FROM orders
         WHERE order_date = p_date AND status = 'completed')
    FROM hourly_metrics
    WHERE date_trunc('day', metric_hour) = p_date
    ON CONFLICT (metric_date) DO UPDATE
    SET
        order_count = EXCLUDED.order_count,
        revenue = EXCLUDED.revenue,
        unique_customers = EXCLUDED.unique_customers,
        avg_order_value = EXCLUDED.revenue / NULLIF(EXCLUDED.order_count, 0);
END;
$$ LANGUAGE plpgsql;
```

## Denormalized JSONB Columns

### Embedding Related Data

```sql
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    product_name TEXT NOT NULL,
    description TEXT,
    base_price NUMERIC(10, 2) NOT NULL
);

CREATE TABLE product_categories (
    category_id SERIAL PRIMARY KEY,
    category_name TEXT UNIQUE NOT NULL,
    parent_category_id INT REFERENCES product_categories(category_id)
);

CREATE TABLE product_category_mappings (
    product_id INT REFERENCES products(product_id),
    category_id INT REFERENCES product_categories(category_id),
    PRIMARY KEY (product_id, category_id)
);

-- Denormalized product catalog with embedded category data
CREATE TABLE product_catalog_denormalized (
    product_id INT PRIMARY KEY REFERENCES products(product_id),
    product_data JSONB NOT NULL,
    -- GIN index for fast JSONB queries
    CONSTRAINT valid_product_data CHECK (
        product_data ? 'name' AND
        product_data ? 'price' AND
        product_data ? 'categories'
    )
);

CREATE INDEX idx_product_catalog_jsonb ON product_catalog_denormalized USING GIN (product_data);
CREATE INDEX idx_product_catalog_categories ON product_catalog_denormalized USING GIN ((product_data->'categories'));

-- Function to rebuild denormalized catalog
CREATE OR REPLACE FUNCTION rebuild_product_catalog()
RETURNS void AS $$
BEGIN
    TRUNCATE product_catalog_denormalized;

    INSERT INTO product_catalog_denormalized (product_id, product_data)
    SELECT
        p.product_id,
        jsonb_build_object(
            'name', p.product_name,
            'description', p.description,
            'price', p.base_price,
            'categories', COALESCE(
                (SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', c.category_id,
                        'name', c.category_name
                    )
                )
                FROM product_category_mappings pcm
                JOIN product_categories c ON pcm.category_id = c.category_id
                WHERE pcm.product_id = p.product_id),
                '[]'::jsonb
            ),
            'updated_at', CURRENT_TIMESTAMP
        )
    FROM products p;
END;
$$ LANGUAGE plpgsql;

-- Sample data
INSERT INTO product_categories (category_name) VALUES
('Electronics'), ('Computers'), ('Accessories');

INSERT INTO products (product_name, description, base_price) VALUES
('Laptop Pro', '15-inch professional laptop', 1299.99),
('Wireless Mouse', 'Ergonomic wireless mouse', 29.99);

INSERT INTO product_category_mappings VALUES (1, 1), (1, 2), (2, 1), (2, 3);

SELECT rebuild_product_catalog();

-- Fast queries without joins
SELECT product_data->>'name' as name, product_data->>'price' as price
FROM product_catalog_denormalized
WHERE product_data->'categories' @> '[{"name": "Electronics"}]';

-- Full-text search on JSONB
SELECT product_data
FROM product_catalog_denormalized
WHERE product_data->>'description' ILIKE '%wireless%';
```

### Event Sourcing Pattern

```sql
-- Store denormalized event data
CREATE TABLE user_events (
    event_id BIGSERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    event_type TEXT NOT NULL,
    event_data JSONB NOT NULL,
    event_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Denormalized user info at time of event
    user_snapshot JSONB
);

CREATE INDEX idx_user_events_user_type ON user_events(user_id, event_type);
CREATE INDEX idx_user_events_timestamp ON user_events(event_timestamp);
CREATE INDEX idx_user_events_data ON user_events USING GIN (event_data);

-- Log event with user snapshot
CREATE OR REPLACE FUNCTION log_user_event(
    p_user_id INT,
    p_event_type TEXT,
    p_event_data JSONB
)
RETURNS BIGINT AS $$
DECLARE
    v_event_id BIGINT;
    v_user_snapshot JSONB;
BEGIN
    -- Capture user state at event time
    SELECT jsonb_build_object(
        'username', username,
        'email', email,
        'post_count', post_count,
        'follower_count', follower_count
    )
    INTO v_user_snapshot
    FROM users
    WHERE user_id = p_user_id;

    INSERT INTO user_events (user_id, event_type, event_data, user_snapshot)
    VALUES (p_user_id, p_event_type, p_event_data, v_user_snapshot)
    RETURNING event_id INTO v_event_id;

    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- Usage
SELECT log_user_event(
    1,
    'order_placed',
    jsonb_build_object(
        'order_id', 12345,
        'total', 99.99,
        'items', jsonb_build_array('item1', 'item2')
    )
);

-- Query events with user context
SELECT
    event_type,
    event_data,
    user_snapshot->>'username' as username_at_event_time,
    event_timestamp
FROM user_events
WHERE user_id = 1
ORDER BY event_timestamp DESC
LIMIT 10;
```

## Redundant Foreign Data

### Denormalizing Frequently Accessed Fields

```sql
-- Orders with denormalized customer data
CREATE TABLE orders_with_customer_info (
    order_id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL REFERENCES users(user_id),
    -- Denormalized customer info (snapshot at order time)
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    shipping_address TEXT NOT NULL,
    -- Order details
    order_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'pending',
    total_amount NUMERIC(10, 2)
);

-- Trigger to populate denormalized fields
CREATE OR REPLACE FUNCTION populate_order_customer_info()
RETURNS TRIGGER AS $$
BEGIN
    SELECT
        username,
        email
    INTO
        NEW.customer_name,
        NEW.customer_email
    FROM users
    WHERE user_id = NEW.customer_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_populate_order_customer
BEFORE INSERT ON orders_with_customer_info
FOR EACH ROW
WHEN (NEW.customer_name IS NULL)
EXECUTE FUNCTION populate_order_customer_info();

-- Now queries don't need to join
INSERT INTO orders_with_customer_info (customer_id, shipping_address, total_amount)
VALUES (1, '123 Main St, New York, NY 10001', 149.99);

SELECT order_id, customer_name, customer_email, total_amount
FROM orders_with_customer_info
WHERE order_id = 1;
-- No join needed!
```

## Common Mistakes

### 1. Denormalizing Without Measurement

```sql
-- DON'T: Denormalize without proving it's needed
-- First, measure actual query performance

-- DO: Use EXPLAIN ANALYZE to identify bottlenecks
EXPLAIN ANALYZE
SELECT o.order_id, c.customer_name, SUM(oi.quantity * oi.unit_price)
FROM orders o
JOIN users c ON o.customer_id = c.user_id
JOIN order_items oi ON o.order_id = oi.order_id
GROUP BY o.order_id, c.customer_name;

-- Only denormalize if this is slow AND frequently executed
```

### 2. Not Maintaining Denormalized Data

```sql
-- WRONG: Denormalized field without trigger
CREATE TABLE products_wrong (
    product_id SERIAL PRIMARY KEY,
    review_count INT DEFAULT 0,
    avg_rating NUMERIC(3, 2) DEFAULT 0
);
-- If you update reviews, these fields become stale!

-- RIGHT: Always maintain denormalized data
CREATE OR REPLACE FUNCTION update_product_ratings()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE products_wrong
    SET
        review_count = (SELECT COUNT(*) FROM reviews WHERE product_id = NEW.product_id),
        avg_rating = (SELECT AVG(rating) FROM reviews WHERE product_id = NEW.product_id)
    WHERE product_id = NEW.product_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 3. Denormalizing Write-Heavy Tables

```sql
-- BAD: Denormalizing data that changes frequently
CREATE TABLE real_time_sensor_data (
    sensor_id INT,
    reading_time TIMESTAMP,
    temperature NUMERIC,
    -- DON'T: Add expensive aggregates to high-frequency insert table
    avg_temp_last_hour NUMERIC,  -- Recalculated on every insert!
    PRIMARY KEY (sensor_id, reading_time)
);

-- BETTER: Keep raw data normalized, use separate aggregate table
CREATE TABLE sensor_readings (
    sensor_id INT,
    reading_time TIMESTAMP,
    temperature NUMERIC,
    PRIMARY KEY (sensor_id, reading_time)
);

CREATE TABLE sensor_hourly_stats (
    sensor_id INT,
    hour_start TIMESTAMP,
    avg_temp NUMERIC,
    min_temp NUMERIC,
    max_temp NUMERIC,
    PRIMARY KEY (sensor_id, hour_start)
);
```

### 4. Inconsistent Denormalized Data

```sql
-- Problem: Multiple update paths can cause inconsistency
CREATE TABLE orders_problem (
    order_id SERIAL PRIMARY KEY,
    total_amount NUMERIC(10, 2)
);

-- If someone updates order_items but forgets to update orders.total_amount
-- Solution: Use triggers or application-level transactions

BEGIN;
    UPDATE order_items SET quantity = 5 WHERE order_item_id = 1;
    -- Must also update order total
    UPDATE orders SET total_amount = (
        SELECT SUM(quantity * unit_price) FROM order_items WHERE order_id = 1
    ) WHERE order_id = 1;
COMMIT;
```

## Best Practices

### 1. Document Denormalization

```sql
-- Always comment denormalized fields
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL,
    -- DENORMALIZED: Maintained by trg_update_order_totals trigger
    -- Updated whenever order_items change
    total_amount NUMERIC(10, 2) DEFAULT 0,
    item_count INT DEFAULT 0
);
```

### 2. Use Constraints to Protect Integrity

```sql
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    base_price NUMERIC(10, 2) NOT NULL,
    review_count INT DEFAULT 0,
    avg_rating NUMERIC(3, 2) DEFAULT 0,
    -- Constraints to protect denormalized data
    CHECK (review_count >= 0),
    CHECK (avg_rating >= 0 AND avg_rating <= 5),
    CHECK (review_count = 0 OR avg_rating > 0)
);
```

### 3. Provide Rebuild Functions

```sql
-- Always provide a way to rebuild denormalized data
CREATE OR REPLACE FUNCTION rebuild_all_order_totals()
RETURNS void AS $$
BEGIN
    UPDATE orders o
    SET
        total_amount = COALESCE((
            SELECT SUM(quantity * unit_price)
            FROM order_items
            WHERE order_id = o.order_id
        ), 0),
        item_count = COALESCE((
            SELECT COUNT(*)
            FROM order_items
            WHERE order_id = o.order_id
        ), 0);
END;
$$ LANGUAGE plpgsql;

-- Schedule periodic validation
CREATE OR REPLACE FUNCTION validate_order_totals()
RETURNS TABLE(order_id INT, stored_total NUMERIC, calculated_total NUMERIC) AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.order_id,
        o.total_amount,
        COALESCE(SUM(oi.quantity * oi.unit_price), 0) as calc_total
    FROM orders o
    LEFT JOIN order_items oi ON o.order_id = oi.order_id
    GROUP BY o.order_id, o.total_amount
    HAVING o.total_amount != COALESCE(SUM(oi.quantity * oi.unit_price), 0);
END;
$$ LANGUAGE plpgsql;
```

### 4. Consider Read Replicas First

```sql
-- Before denormalizing, consider if read replicas solve your problem
-- Read replicas provide:
-- - No denormalization complexity
-- - No data consistency issues
-- - Horizontal read scaling

-- Only denormalize if:
-- 1. Read replicas aren't sufficient
-- 2. You need single-query performance
-- 3. You can maintain data consistency
```

### 5. Use Materialized Views for Complex Reports

```sql
-- Prefer materialized views over manual denormalization
CREATE MATERIALIZED VIEW sales_dashboard AS
SELECT
    date_trunc('day', o.order_date) as sale_date,
    COUNT(DISTINCT o.order_id) as order_count,
    COUNT(DISTINCT o.customer_id) as customer_count,
    SUM(oi.quantity * oi.unit_price) as revenue,
    AVG(o.total_amount) as avg_order_value
FROM orders o
JOIN order_items oi ON o.order_id = oi.order_id
WHERE o.status = 'completed'
GROUP BY date_trunc('day', o.order_date);

CREATE UNIQUE INDEX ON sales_dashboard(sale_date);

-- Refresh on schedule
-- REFRESH MATERIALIZED VIEW CONCURRENTLY sales_dashboard;
```

## When NOT to Denormalize

### 1. Frequently Changing Data

Avoid denormalizing data that changes constantly, as the maintenance overhead will exceed the benefits.

### 2. Strong Consistency Requirements

Financial or regulatory data that must always be consistent should stay normalized.

### 3. Small Tables

Joining small tables is fast. Don't denormalize unless tables are large enough to cause performance issues.

### 4. Development/Prototyping Phase

Stay normalized during early development. Denormalize only after you understand your access patterns.

## Practice Exercises

### Exercise 1: Implement Cached Statistics

Create a denormalized statistics table for a blog platform:

```sql
CREATE TABLE blog_posts (
    post_id SERIAL PRIMARY KEY,
    author_id INT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE post_likes (
    user_id INT,
    post_id INT REFERENCES blog_posts(post_id) ON DELETE CASCADE,
    liked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, post_id)
);

CREATE TABLE post_comments (
    comment_id SERIAL PRIMARY KEY,
    post_id INT REFERENCES blog_posts(post_id) ON DELETE CASCADE,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Task: Create post_statistics table with denormalized counts
-- Maintain: like_count, comment_count, last_activity_at
-- Write triggers to keep it updated
```

**Solution:**

```sql
CREATE TABLE post_statistics (
    post_id INT PRIMARY KEY REFERENCES blog_posts(post_id) ON DELETE CASCADE,
    like_count INT DEFAULT 0,
    comment_count INT DEFAULT 0,
    last_activity_at TIMESTAMP,
    CHECK (like_count >= 0),
    CHECK (comment_count >= 0)
);

-- Initialize for existing posts
INSERT INTO post_statistics (post_id, like_count, comment_count, last_activity_at)
SELECT
    p.post_id,
    COUNT(DISTINCT l.user_id) as like_count,
    COUNT(DISTINCT c.comment_id) as comment_count,
    GREATEST(
        p.published_at,
        MAX(l.liked_at),
        MAX(c.created_at)
    ) as last_activity_at
FROM blog_posts p
LEFT JOIN post_likes l ON p.post_id = l.post_id
LEFT JOIN post_comments c ON p.post_id = c.post_id
GROUP BY p.post_id, p.published_at;

-- Trigger for likes
CREATE OR REPLACE FUNCTION update_post_stats_likes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO post_statistics (post_id, like_count, last_activity_at)
        VALUES (NEW.post_id, 1, NEW.liked_at)
        ON CONFLICT (post_id) DO UPDATE
        SET like_count = post_statistics.like_count + 1,
            last_activity_at = GREATEST(post_statistics.last_activity_at, NEW.liked_at);
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE post_statistics
        SET like_count = like_count - 1
        WHERE post_id = OLD.post_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_stats_likes
AFTER INSERT OR DELETE ON post_likes
FOR EACH ROW EXECUTE FUNCTION update_post_stats_likes();

-- Similar trigger for comments
CREATE OR REPLACE FUNCTION update_post_stats_comments()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO post_statistics (post_id, comment_count, last_activity_at)
        VALUES (NEW.post_id, 1, NEW.created_at)
        ON CONFLICT (post_id) DO UPDATE
        SET comment_count = post_statistics.comment_count + 1,
            last_activity_at = GREATEST(post_statistics.last_activity_at, NEW.created_at);
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE post_statistics
        SET comment_count = comment_count - 1
        WHERE post_id = OLD.post_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_stats_comments
AFTER INSERT OR DELETE ON post_comments
FOR EACH ROW EXECUTE FUNCTION update_post_stats_comments();

-- Query trending posts
SELECT p.title, ps.like_count, ps.comment_count
FROM blog_posts p
JOIN post_statistics ps ON p.post_id = ps.post_id
WHERE ps.last_activity_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
ORDER BY ps.like_count + ps.comment_count DESC
LIMIT 10;
```

### Exercise 2: Create a Materialized Dashboard

Build a sales dashboard with materialized views:

```sql
-- Task: Create materialized views for:
-- 1. Daily sales metrics (revenue, order count, avg order value)
-- 2. Top 10 products by revenue (last 30 days)
-- 3. Customer segments (by total spend)
-- Include refresh functions and appropriate indexes
```

**Solution:**

```sql
-- 1. Daily sales metrics
CREATE MATERIALIZED VIEW daily_sales_metrics AS
SELECT
    order_date,
    COUNT(*) as order_count,
    COUNT(DISTINCT customer_id) as unique_customers,
    SUM(total_amount) as total_revenue,
    AVG(total_amount) as avg_order_value,
    MIN(total_amount) as min_order_value,
    MAX(total_amount) as max_order_value
FROM orders
WHERE status = 'completed'
GROUP BY order_date;

CREATE UNIQUE INDEX idx_daily_sales_date ON daily_sales_metrics(order_date DESC);

-- 2. Top products (last 30 days)
CREATE MATERIALIZED VIEW top_products_30d AS
SELECT
    p.product_id,
    p.product_name,
    COUNT(DISTINCT oi.order_id) as order_count,
    SUM(oi.quantity) as units_sold,
    SUM(oi.quantity * oi.unit_price) as total_revenue
FROM products p
JOIN order_items oi ON p.product_id = oi.product_id
JOIN orders o ON oi.order_id = o.order_id
WHERE o.order_date >= CURRENT_DATE - INTERVAL '30 days'
    AND o.status = 'completed'
GROUP BY p.product_id, p.product_name
ORDER BY total_revenue DESC
LIMIT 10;

CREATE UNIQUE INDEX idx_top_products_id ON top_products_30d(product_id);

-- 3. Customer segments
CREATE MATERIALIZED VIEW customer_segments AS
SELECT
    user_id,
    username,
    total_spent,
    CASE
        WHEN total_spent >= 10000 THEN 'VIP'
        WHEN total_spent >= 5000 THEN 'Premium'
        WHEN total_spent >= 1000 THEN 'Regular'
        ELSE 'New'
    END as segment,
    total_orders,
    last_order_date
FROM user_activity_summary;

CREATE INDEX idx_customer_segments_segment ON customer_segments(segment);
CREATE UNIQUE INDEX idx_customer_segments_user ON customer_segments(user_id);

-- Refresh all dashboards
CREATE OR REPLACE FUNCTION refresh_all_dashboards()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_sales_metrics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY top_products_30d;
    REFRESH MATERIALIZED VIEW CONCURRENTLY customer_segments;
END;
$$ LANGUAGE plpgsql;
```

### Exercise 3: JSONB Denormalization

Denormalize an order with all related data into JSONB:

```sql
-- Task: Create orders_denormalized table with JSONB column containing:
-- - Order details
-- - Customer info (snapshot)
-- - Array of line items with product details
-- - Shipping address
-- Write function to populate from normalized tables
```

**Solution:**

```sql
CREATE TABLE orders_denormalized_jsonb (
    order_id INT PRIMARY KEY,
    order_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_denorm_data ON orders_denormalized_jsonb USING GIN (order_data);
CREATE INDEX idx_orders_denorm_customer ON orders_denormalized_jsonb((order_data->>'customer_email'));

CREATE OR REPLACE FUNCTION denormalize_order(p_order_id INT)
RETURNS JSONB AS $$
DECLARE
    v_order_data JSONB;
BEGIN
    SELECT jsonb_build_object(
        'order_id', o.order_id,
        'order_date', o.order_date,
        'status', o.status,
        'customer', jsonb_build_object(
            'id', u.user_id,
            'name', u.username,
            'email', u.email
        ),
        'items', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'product_id', p.product_id,
                    'product_name', p.product_name,
                    'quantity', oi.quantity,
                    'unit_price', oi.unit_price,
                    'line_total', oi.quantity * oi.unit_price
                )
            )
            FROM order_items oi
            JOIN products p ON oi.product_id = p.product_id
            WHERE oi.order_id = o.order_id
        ),
        'totals', jsonb_build_object(
            'subtotal', o.total_amount,
            'tax', o.total_amount * 0.08,
            'total', o.total_amount * 1.08
        ),
        'shipping_address', a.street_address || ', ' || a.city || ', ' || a.state || ' ' || a.zip
    )
    INTO v_order_data
    FROM orders o
    JOIN users u ON o.customer_id = u.user_id
    LEFT JOIN addresses a ON o.shipping_address_id = a.address_id
    WHERE o.order_id = p_order_id;

    RETURN v_order_data;
END;
$$ LANGUAGE plpgsql;

-- Populate denormalized table
INSERT INTO orders_denormalized_jsonb (order_id, order_data)
SELECT order_id, denormalize_order(order_id)
FROM orders;

-- Query without joins
SELECT order_data->>'order_id', order_data->'customer'->>'name', order_data->'totals'->>'total'
FROM orders_denormalized_jsonb
WHERE order_data->>'status' = 'completed';
```

## Related Topics

- [Normalization](./01-normalization.md)
- [Materialized Views](../08-views/02-materialized-views.md)
- [Triggers](../10-triggers/01-trigger-basics.md)
- [JSONB](../05-data-types/05-json-jsonb.md)
- [Indexes](../07-indexes/01-index-basics.md)
