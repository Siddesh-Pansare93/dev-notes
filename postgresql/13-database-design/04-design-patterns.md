# Database Design Patterns

## Theory

Database design patterns are reusable solutions to common data modeling problems. They provide proven approaches for handling specific scenarios like flexible attributes, polymorphic relationships, audit trails, and soft deletes.

### When to Use Design Patterns

1. **Flexibility Requirements**: When schema needs to adapt to changing requirements
2. **Complex Relationships**: When standard foreign keys aren't sufficient
3. **Auditing Needs**: When you need to track all data changes
4. **Soft Delete Requirements**: When data should be hidden but not destroyed
5. **State Management**: When entities go through defined state transitions

### Trade-offs

**Benefits:**
- Handle edge cases and complex requirements
- Proven solutions with known behavior
- Make code more maintainable

**Costs:**
- Added complexity
- Potential performance overhead
- May violate pure normalization
- Require more sophisticated queries

## Entity-Attribute-Value (EAV) Pattern

### Theory

EAV stores attributes as rows rather than columns, allowing entities to have different sets of attributes without schema changes.

### When to Use EAV

1. Entities with highly variable attributes
2. Sparse data (most attributes are NULL)
3. Frequent schema changes needed
4. User-defined fields

### When NOT to Use EAV

1. When attributes are known and stable
2. When performance is critical
3. When you need strong type checking
4. When you need complex queries on attributes

### Traditional EAV Implementation

```sql
-- EAV: Entity-Attribute-Value pattern
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    product_name TEXT NOT NULL,
    category TEXT
);

CREATE TABLE attributes (
    attribute_id SERIAL PRIMARY KEY,
    attribute_name TEXT UNIQUE NOT NULL,
    data_type TEXT NOT NULL,  -- text, number, date, boolean
    CHECK (data_type IN ('text', 'number', 'date', 'boolean'))
);

CREATE TABLE product_attributes (
    product_id INT REFERENCES products(product_id) ON DELETE CASCADE,
    attribute_id INT REFERENCES attributes(attribute_id),
    value_text TEXT,
    value_number NUMERIC,
    value_date DATE,
    value_boolean BOOLEAN,
    PRIMARY KEY (product_id, attribute_id),
    -- Ensure only one value column is populated
    CHECK (
        (value_text IS NOT NULL)::int +
        (value_number IS NOT NULL)::int +
        (value_date IS NOT NULL)::int +
        (value_boolean IS NOT NULL)::int = 1
    )
);

CREATE INDEX idx_product_attrs_product ON product_attributes(product_id);
CREATE INDEX idx_product_attrs_attribute ON product_attributes(attribute_id);

-- Sample data
INSERT INTO attributes (attribute_name, data_type) VALUES
('Color', 'text'),
('Weight', 'number'),
('Waterproof', 'boolean'),
('Release Date', 'date');

INSERT INTO products (product_name, category) VALUES
('Laptop Pro', 'Electronics'),
('Backpack', 'Accessories');

-- Laptop has: Color, Weight, Release Date
INSERT INTO product_attributes (product_id, attribute_id, value_text) VALUES
(1, 1, 'Silver');

INSERT INTO product_attributes (product_id, attribute_id, value_number) VALUES
(1, 2, 1.5);

INSERT INTO product_attributes (product_id, attribute_id, value_date) VALUES
(1, 4, '2024-01-15');

-- Backpack has: Color, Waterproof
INSERT INTO product_attributes (product_id, attribute_id, value_text) VALUES
(2, 1, 'Black');

INSERT INTO product_attributes (product_id, attribute_id, value_boolean) VALUES
(2, 3, true);

-- Query: Get all attributes for a product (complex!)
SELECT
    p.product_name,
    a.attribute_name,
    COALESCE(
        pa.value_text,
        pa.value_number::text,
        pa.value_date::text,
        pa.value_boolean::text
    ) as value
FROM products p
JOIN product_attributes pa ON p.product_id = pa.product_id
JOIN attributes a ON pa.attribute_id = a.attribute_id
WHERE p.product_id = 1;

-- Query: Find products by attribute (very complex!)
SELECT DISTINCT p.product_id, p.product_name
FROM products p
JOIN product_attributes pa ON p.product_id = pa.product_id
JOIN attributes a ON pa.attribute_id = a.attribute_id
WHERE a.attribute_name = 'Color' AND pa.value_text = 'Silver';
```

### JSONB Alternative (Recommended)

```sql
-- Better approach: Use JSONB instead of EAV
CREATE TABLE products_jsonb (
    product_id SERIAL PRIMARY KEY,
    product_name TEXT NOT NULL,
    category TEXT,
    attributes JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_products_attrs ON products_jsonb USING GIN (attributes);

-- Insert with flexible attributes
INSERT INTO products_jsonb (product_name, category, attributes) VALUES
('Laptop Pro', 'Electronics', jsonb_build_object(
    'color', 'Silver',
    'weight', 1.5,
    'release_date', '2024-01-15',
    'screen_size', 15
)),
('Backpack', 'Accessories', jsonb_build_object(
    'color', 'Black',
    'waterproof', true,
    'capacity', '30L'
));

-- Query: Get all attributes (simple!)
SELECT product_name, attributes
FROM products_jsonb
WHERE product_id = 1;

-- Query: Find by attribute (simple!)
SELECT product_name, attributes->>'color' as color
FROM products_jsonb
WHERE attributes->>'color' = 'Silver';

-- Query: Find products with specific attribute existing
SELECT product_name
FROM products_jsonb
WHERE attributes ? 'waterproof';

-- Query: Numeric comparison on JSONB attribute
SELECT product_name, (attributes->>'weight')::numeric as weight
FROM products_jsonb
WHERE (attributes->>'weight')::numeric < 2.0;

-- Add new attribute without schema change
UPDATE products_jsonb
SET attributes = attributes || jsonb_build_object('warranty_years', 3)
WHERE product_id = 1;
```

### Hybrid Approach

```sql
-- Store common attributes as columns, flexible ones in JSONB
CREATE TABLE products_hybrid (
    product_id SERIAL PRIMARY KEY,
    product_name TEXT NOT NULL,
    category TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,  -- Common attribute
    stock_quantity INT NOT NULL,     -- Common attribute
    -- Flexible attributes in JSONB
    specs JSONB DEFAULT '{}'::jsonb,
    -- Constraints on common attributes
    CHECK (price >= 0),
    CHECK (stock_quantity >= 0)
);

CREATE INDEX idx_products_specs ON products_hybrid USING GIN (specs);
CREATE INDEX idx_products_category ON products_hybrid(category);
CREATE INDEX idx_products_price ON products_hybrid(price);

INSERT INTO products_hybrid (product_name, category, price, stock_quantity, specs) VALUES
('Laptop Pro', 'Electronics', 1299.99, 50, jsonb_build_object(
    'brand', 'TechCorp',
    'cpu', 'Intel i7',
    'ram_gb', 16,
    'storage_gb', 512
)),
('Backpack', 'Accessories', 59.99, 100, jsonb_build_object(
    'brand', 'OutdoorGear',
    'material', 'Nylon',
    'capacity_liters', 30
));
```

## Polymorphic Associations

### Theory

Polymorphic associations allow a table to belong to multiple different parent tables. For example, comments can be on posts, photos, or videos.

### Pattern 1: Type + ID Columns

```sql
-- Polymorphic pattern: commentable_type + commentable_id
CREATE TABLE posts (
    post_id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE photos (
    photo_id SERIAL PRIMARY KEY,
    url TEXT NOT NULL,
    caption TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE comments (
    comment_id SERIAL PRIMARY KEY,
    commentable_type TEXT NOT NULL,  -- 'post' or 'photo'
    commentable_id INT NOT NULL,     -- ID in respective table
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (commentable_type IN ('post', 'photo'))
);

-- NOTE: Cannot use foreign key constraints with this pattern!
-- No referential integrity enforcement

CREATE INDEX idx_comments_polymorphic ON comments(commentable_type, commentable_id);

-- Sample data
INSERT INTO posts (content) VALUES ('My first post!');
INSERT INTO photos (url, caption) VALUES ('https://example.com/photo.jpg', 'Sunset');

INSERT INTO comments (commentable_type, commentable_id, user_id, content) VALUES
('post', 1, 1, 'Great post!'),
('photo', 1, 2, 'Beautiful photo!');

-- Query comments for a post
SELECT c.content, c.created_at
FROM comments c
WHERE c.commentable_type = 'post' AND c.commentable_id = 1;

-- Query with JOIN (must know type)
SELECT p.content as post_content, c.content as comment_content
FROM posts p
JOIN comments c ON c.commentable_type = 'post' AND c.commentable_id = p.post_id;

-- Problem: Can insert invalid IDs with no FK constraint!
INSERT INTO comments (commentable_type, commentable_id, user_id, content) VALUES
('post', 99999, 1, 'Comment on non-existent post');  -- No error!
```

### Pattern 2: Separate Foreign Keys (Recommended)

```sql
-- Better: Separate nullable foreign keys with CHECK constraint
CREATE TABLE comments_better (
    comment_id SERIAL PRIMARY KEY,
    post_id INT REFERENCES posts(post_id) ON DELETE CASCADE,
    photo_id INT REFERENCES photos(photo_id) ON DELETE CASCADE,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Exactly one must be set
    CHECK (
        (post_id IS NOT NULL)::int +
        (photo_id IS NOT NULL)::int = 1
    )
);

CREATE INDEX idx_comments_post ON comments_better(post_id) WHERE post_id IS NOT NULL;
CREATE INDEX idx_comments_photo ON comments_better(photo_id) WHERE photo_id IS NOT NULL;

INSERT INTO comments_better (post_id, user_id, content) VALUES
(1, 1, 'Great post!');

INSERT INTO comments_better (photo_id, user_id, content) VALUES
(1, 2, 'Beautiful photo!');

-- Query comments for a post
SELECT content FROM comments_better WHERE post_id = 1;

-- Cannot insert invalid ID (FK constraint)
-- INSERT INTO comments_better (post_id, user_id, content) VALUES (99999, 1, 'Fail');
-- ERROR: foreign key violation

-- Get comment with parent (UNION approach)
SELECT 'post' as type, p.content as parent_content, c.content as comment_content
FROM comments_better c
JOIN posts p ON c.post_id = p.post_id
WHERE c.post_id IS NOT NULL

UNION ALL

SELECT 'photo' as type, ph.caption as parent_content, c.content as comment_content
FROM comments_better c
JOIN photos ph ON c.photo_id = ph.photo_id
WHERE c.photo_id IS NOT NULL;
```

### Pattern 3: Separate Tables (Most Normalized)

```sql
-- Most normalized: Separate junction tables
CREATE TABLE post_comments (
    comment_id SERIAL PRIMARY KEY,
    post_id INT NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE photo_comments (
    comment_id SERIAL PRIMARY KEY,
    photo_id INT NOT NULL REFERENCES photos(photo_id) ON DELETE CASCADE,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_post_comments_post ON post_comments(post_id);
CREATE INDEX idx_photo_comments_photo ON photo_comments(photo_id);

-- Advantages:
-- - Strong referential integrity
-- - Each table can have specific columns
-- - Easier to query and index

-- Disadvantages:
-- - More tables to manage
-- - Queries across all comment types require UNION

-- Get all comments for a user
SELECT 'post' as type, content, created_at FROM post_comments WHERE user_id = 1
UNION ALL
SELECT 'photo' as type, content, created_at FROM photo_comments WHERE user_id = 1
ORDER BY created_at DESC;
```

## Audit Trail Pattern

### Pattern 1: Audit Table with Triggers

```sql
CREATE TABLE customers (
    customer_id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit table to track all changes
CREATE TABLE customers_audit (
    audit_id BIGSERIAL PRIMARY KEY,
    customer_id INT NOT NULL,
    operation TEXT NOT NULL,  -- INSERT, UPDATE, DELETE
    old_data JSONB,
    new_data JSONB,
    changed_by TEXT,  -- Could be FK to users table
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    changed_columns TEXT[]  -- Array of changed column names
);

CREATE INDEX idx_customers_audit_customer ON customers_audit(customer_id);
CREATE INDEX idx_customers_audit_time ON customers_audit(changed_at);
CREATE INDEX idx_customers_audit_user ON customers_audit(changed_by);

-- Trigger function to log changes
CREATE OR REPLACE FUNCTION audit_customers()
RETURNS TRIGGER AS $$
DECLARE
    changed_cols TEXT[] := '{}';
    col TEXT;
BEGIN
    -- Detect which columns changed (for UPDATE)
    IF TG_OP = 'UPDATE' THEN
        FOR col IN
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'customers'
                AND column_name NOT IN ('updated_at')
        LOOP
            IF to_jsonb(OLD)->>col IS DISTINCT FROM to_jsonb(NEW)->>col THEN
                changed_cols := array_append(changed_cols, col);
            END IF;
        END LOOP;
    END IF;

    -- Log the change
    INSERT INTO customers_audit (
        customer_id,
        operation,
        old_data,
        new_data,
        changed_by,
        changed_columns
    ) VALUES (
        COALESCE(NEW.customer_id, OLD.customer_id),
        TG_OP,
        CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
        current_user,
        CASE WHEN TG_OP = 'UPDATE' THEN changed_cols ELSE NULL END
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_customers
AFTER INSERT OR UPDATE OR DELETE ON customers
FOR EACH ROW EXECUTE FUNCTION audit_customers();

-- Test audit trail
INSERT INTO customers (email, first_name, last_name) VALUES
('john@example.com', 'John', 'Doe');

UPDATE customers SET last_name = 'Smith' WHERE email = 'john@example.com';

UPDATE customers SET status = 'inactive' WHERE email = 'john@example.com';

-- View audit history
SELECT
    audit_id,
    operation,
    new_data->>'email' as email,
    new_data->>'first_name' as first_name,
    new_data->>'last_name' as last_name,
    changed_columns,
    changed_at
FROM customers_audit
WHERE customer_id = 1
ORDER BY changed_at;

-- Find who made changes
SELECT
    changed_by,
    COUNT(*) as change_count
FROM customers_audit
GROUP BY changed_by;

-- Reconstruct historical state
SELECT
    audit_id,
    changed_at,
    COALESCE(new_data->>'status', old_data->>'status') as status_at_time
FROM customers_audit
WHERE customer_id = 1
ORDER BY changed_at DESC;
```

### Pattern 2: Temporal Tables (System Versioning)

```sql
-- PostgreSQL doesn't have built-in temporal tables like SQL Server
-- But we can implement similar functionality

CREATE TABLE employees_current (
    employee_id SERIAL PRIMARY KEY,
    employee_name TEXT NOT NULL,
    department TEXT,
    salary NUMERIC(10, 2),
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_to TIMESTAMP DEFAULT 'infinity'::timestamp
);

CREATE TABLE employees_history (
    history_id BIGSERIAL PRIMARY KEY,
    employee_id INT NOT NULL,
    employee_name TEXT NOT NULL,
    department TEXT,
    salary NUMERIC(10, 2),
    valid_from TIMESTAMP NOT NULL,
    valid_to TIMESTAMP NOT NULL
);

CREATE INDEX idx_employees_history_emp ON employees_history(employee_id);
CREATE INDEX idx_employees_history_time ON employees_history(valid_from, valid_to);

-- Trigger to maintain history
CREATE OR REPLACE FUNCTION maintain_employee_history()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- Close out old record
        UPDATE employees_current
        SET valid_to = CURRENT_TIMESTAMP
        WHERE employee_id = OLD.employee_id;

        -- Archive to history
        INSERT INTO employees_history (employee_id, employee_name, department, salary, valid_from, valid_to)
        VALUES (OLD.employee_id, OLD.employee_name, OLD.department, OLD.salary, OLD.valid_from, CURRENT_TIMESTAMP);

        -- Start new period
        NEW.valid_from := CURRENT_TIMESTAMP;
        NEW.valid_to := 'infinity'::timestamp;
    ELSIF TG_OP = 'DELETE' THEN
        -- Archive to history
        INSERT INTO employees_history (employee_id, employee_name, department, salary, valid_from, valid_to)
        VALUES (OLD.employee_id, OLD.employee_name, OLD.department, OLD.salary, OLD.valid_from, CURRENT_TIMESTAMP);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_employee_history
BEFORE UPDATE OR DELETE ON employees_current
FOR EACH ROW EXECUTE FUNCTION maintain_employee_history();

-- Test
INSERT INTO employees_current (employee_name, department, salary) VALUES
('Alice Johnson', 'Engineering', 85000);

-- Make changes
UPDATE employees_current SET salary = 90000 WHERE employee_id = 1;
UPDATE employees_current SET department = 'Management' WHERE employee_id = 1;

-- View current state
SELECT * FROM employees_current WHERE employee_id = 1;

-- View historical states
SELECT * FROM employees_history WHERE employee_id = 1 ORDER BY valid_from;

-- Query: What was the salary at a specific point in time?
SELECT employee_name, salary
FROM employees_history
WHERE employee_id = 1
    AND valid_from <= '2024-01-15'::timestamp
    AND valid_to > '2024-01-15'::timestamp;

-- View complete history (union of current and historical)
SELECT employee_id, employee_name, salary, valid_from, valid_to
FROM employees_history
WHERE employee_id = 1
UNION ALL
SELECT employee_id, employee_name, salary, valid_from, valid_to
FROM employees_current
WHERE employee_id = 1
ORDER BY valid_from;
```

## Soft Delete Pattern

### Basic Soft Delete

```sql
CREATE TABLE articles (
    article_id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    author_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP  -- NULL = not deleted, timestamp = when deleted
);

CREATE INDEX idx_articles_deleted ON articles(deleted_at);

-- View for active (non-deleted) articles
CREATE VIEW articles_active AS
SELECT * FROM articles WHERE deleted_at IS NULL;

-- Insert articles
INSERT INTO articles (title, content, author_id) VALUES
('Introduction to PostgreSQL', 'Content here...', 1),
('Advanced Queries', 'More content...', 1);

-- Soft delete
UPDATE articles SET deleted_at = CURRENT_TIMESTAMP WHERE article_id = 1;

-- Query only active articles
SELECT * FROM articles_active;

-- Query all including deleted
SELECT * FROM articles;

-- Restore deleted article
UPDATE articles SET deleted_at = NULL WHERE article_id = 1;

-- Permanently delete (hard delete) old soft-deleted records
DELETE FROM articles
WHERE deleted_at IS NOT NULL
    AND deleted_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
```

### Soft Delete with Unique Constraints

```sql
-- Problem: Unique constraint on email prevents re-using email after soft delete
CREATE TABLE users_soft (
    user_id SERIAL PRIMARY KEY,
    email TEXT NOT NULL,  -- Want unique, but only for active users
    username TEXT NOT NULL,
    deleted_at TIMESTAMP,
    UNIQUE(email)  -- This prevents re-using email!
);

-- Solution 1: Partial unique index
DROP TABLE IF EXISTS users_soft;

CREATE TABLE users_soft (
    user_id SERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    username TEXT NOT NULL,
    deleted_at TIMESTAMP
);

-- Unique only for active (non-deleted) users
CREATE UNIQUE INDEX idx_users_email_active
ON users_soft(email)
WHERE deleted_at IS NULL;

-- Now we can soft delete and reuse email
INSERT INTO users_soft (email, username) VALUES ('john@example.com', 'john');
UPDATE users_soft SET deleted_at = CURRENT_TIMESTAMP WHERE email = 'john@example.com';
INSERT INTO users_soft (email, username) VALUES ('john@example.com', 'john_new');  -- Works!

-- Solution 2: Append timestamp to email on delete
CREATE TABLE users_soft_v2 (
    user_id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    username TEXT NOT NULL,
    deleted_at TIMESTAMP
);

CREATE OR REPLACE FUNCTION append_delete_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
        NEW.email := NEW.email || '_deleted_' || EXTRACT(EPOCH FROM NEW.deleted_at)::TEXT;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_append_delete_timestamp
BEFORE UPDATE ON users_soft_v2
FOR EACH ROW EXECUTE FUNCTION append_delete_timestamp();

INSERT INTO users_soft_v2 (email, username) VALUES ('jane@example.com', 'jane');
UPDATE users_soft_v2 SET deleted_at = CURRENT_TIMESTAMP WHERE email = 'jane@example.com';
-- Email is now 'jane@example.com_deleted_1234567890'
INSERT INTO users_soft_v2 (email, username) VALUES ('jane@example.com', 'jane_new');
```

### Soft Delete with Foreign Keys

```sql
CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    category_name TEXT NOT NULL,
    deleted_at TIMESTAMP
);

CREATE TABLE products_soft (
    product_id SERIAL PRIMARY KEY,
    product_name TEXT NOT NULL,
    category_id INT REFERENCES categories(category_id),
    deleted_at TIMESTAMP
);

-- Create views that only show active records
CREATE VIEW categories_active AS
SELECT * FROM categories WHERE deleted_at IS NULL;

CREATE VIEW products_active AS
SELECT * FROM products_soft WHERE deleted_at IS NULL;

-- Soft delete cascade function
CREATE OR REPLACE FUNCTION soft_delete_cascade_products()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
        -- Soft delete all products in this category
        UPDATE products_soft
        SET deleted_at = NEW.deleted_at
        WHERE category_id = NEW.category_id
            AND deleted_at IS NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_soft_delete_cascade
AFTER UPDATE ON categories
FOR EACH ROW EXECUTE FUNCTION soft_delete_cascade_products();

-- Test
INSERT INTO categories (category_name) VALUES ('Electronics');
INSERT INTO products_soft (product_name, category_id) VALUES ('Laptop', 1), ('Phone', 1);

-- Soft delete category (cascades to products)
UPDATE categories SET deleted_at = CURRENT_TIMESTAMP WHERE category_id = 1;

SELECT * FROM products_active;  -- Empty (products soft deleted)
SELECT * FROM products_soft;     -- Shows soft deleted products
```

## State Machine Pattern

### Order Status State Machine

```sql
CREATE TABLE orders_stateful (
    order_id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL,
    total_amount NUMERIC(10, 2),
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Valid states
    CHECK (status IN (
        'pending',       -- Initial state
        'confirmed',     -- Payment received
        'processing',    -- Being prepared
        'shipped',       -- On the way
        'delivered',     -- Completed successfully
        'cancelled',     -- Cancelled by user or system
        'refunded'       -- Money returned
    ))
);

-- State transition log
CREATE TABLE order_state_transitions (
    transition_id BIGSERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders_stateful(order_id),
    from_status TEXT,
    to_status TEXT NOT NULL,
    transition_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    transitioned_by TEXT,
    notes TEXT
);

CREATE INDEX idx_transitions_order ON order_state_transitions(order_id);

-- Valid state transitions
CREATE TABLE valid_state_transitions (
    from_status TEXT NOT NULL,
    to_status TEXT NOT NULL,
    PRIMARY KEY (from_status, to_status)
);

INSERT INTO valid_state_transitions (from_status, to_status) VALUES
('pending', 'confirmed'),
('pending', 'cancelled'),
('confirmed', 'processing'),
('confirmed', 'cancelled'),
('processing', 'shipped'),
('processing', 'cancelled'),
('shipped', 'delivered'),
('shipped', 'cancelled'),  -- Can cancel if not delivered
('delivered', 'refunded'),
('cancelled', 'pending');  -- Allow restart

-- Trigger to enforce state transitions and log them
CREATE OR REPLACE FUNCTION enforce_order_state_machine()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if transition is valid
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        IF NOT EXISTS (
            SELECT 1 FROM valid_state_transitions
            WHERE from_status = OLD.status AND to_status = NEW.status
        ) THEN
            RAISE EXCEPTION 'Invalid state transition from % to %', OLD.status, NEW.status;
        END IF;

        -- Log the transition
        INSERT INTO order_state_transitions (order_id, from_status, to_status, transitioned_by)
        VALUES (NEW.order_id, OLD.status, NEW.status, current_user);
    END IF;

    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_order_state_machine
BEFORE UPDATE ON orders_stateful
FOR EACH ROW EXECUTE FUNCTION enforce_order_state_machine();

-- Test valid transitions
INSERT INTO orders_stateful (customer_id, total_amount) VALUES (1, 99.99);

UPDATE orders_stateful SET status = 'confirmed' WHERE order_id = 1;  -- OK
UPDATE orders_stateful SET status = 'processing' WHERE order_id = 1; -- OK
UPDATE orders_stateful SET status = 'shipped' WHERE order_id = 1;    -- OK

-- Test invalid transition
-- UPDATE orders_stateful SET status = 'pending' WHERE order_id = 1;
-- ERROR: Invalid state transition from shipped to pending

-- View state history
SELECT
    order_id,
    from_status,
    to_status,
    transition_at,
    transitioned_by
FROM order_state_transitions
WHERE order_id = 1
ORDER BY transition_at;

-- Query orders by state
SELECT order_id, status, created_at
FROM orders_stateful
WHERE status IN ('processing', 'shipped')
ORDER BY created_at;
```

## Tagging/Categorization Patterns

### Pattern 1: Simple Many-to-Many

```sql
CREATE TABLE blog_posts (
    post_id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tags (
    tag_id SERIAL PRIMARY KEY,
    tag_name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE post_tags (
    post_id INT REFERENCES blog_posts(post_id) ON DELETE CASCADE,
    tag_id INT REFERENCES tags(tag_id) ON DELETE CASCADE,
    tagged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id, tag_id)
);

CREATE INDEX idx_post_tags_post ON post_tags(post_id);
CREATE INDEX idx_post_tags_tag ON post_tags(tag_id);

-- Sample data
INSERT INTO tags (tag_name, slug) VALUES
('PostgreSQL', 'postgresql'),
('Database', 'database'),
('Tutorial', 'tutorial');

INSERT INTO blog_posts (title, content) VALUES
('Introduction to PostgreSQL', 'Content about PostgreSQL...');

INSERT INTO post_tags (post_id, tag_id) VALUES
(1, 1), (1, 2), (1, 3);

-- Query posts by tag
SELECT p.title, p.created_at
FROM blog_posts p
JOIN post_tags pt ON p.post_id = pt.post_id
JOIN tags t ON pt.tag_id = t.tag_id
WHERE t.slug = 'postgresql';

-- Query tags for a post
SELECT t.tag_name
FROM tags t
JOIN post_tags pt ON t.tag_id = pt.tag_id
WHERE pt.post_id = 1;

-- Query posts with multiple tags (AND condition)
SELECT p.post_id, p.title
FROM blog_posts p
WHERE EXISTS (
    SELECT 1 FROM post_tags pt
    JOIN tags t ON pt.tag_id = t.tag_id
    WHERE pt.post_id = p.post_id AND t.slug = 'postgresql'
) AND EXISTS (
    SELECT 1 FROM post_tags pt
    JOIN tags t ON pt.tag_id = t.tag_id
    WHERE pt.post_id = p.post_id AND t.slug = 'tutorial'
);

-- Popular tags
SELECT t.tag_name, COUNT(pt.post_id) as post_count
FROM tags t
LEFT JOIN post_tags pt ON t.tag_id = pt.tag_id
GROUP BY t.tag_id, t.tag_name
ORDER BY post_count DESC
LIMIT 10;
```

### Pattern 2: Hierarchical Tags

```sql
CREATE TABLE hierarchical_tags (
    tag_id SERIAL PRIMARY KEY,
    tag_name TEXT NOT NULL,
    parent_tag_id INT REFERENCES hierarchical_tags(tag_id),
    level INT,
    path TEXT  -- Denormalized path for queries
);

CREATE INDEX idx_hier_tags_parent ON hierarchical_tags(parent_tag_id);

INSERT INTO hierarchical_tags (tag_name, parent_tag_id, level, path) VALUES
('Technology', NULL, 1, 'Technology'),
('Databases', 1, 2, 'Technology > Databases'),
('PostgreSQL', 2, 3, 'Technology > Databases > PostgreSQL'),
('MySQL', 2, 3, 'Technology > Databases > MySQL'),
('Programming', 1, 2, 'Technology > Programming'),
('Python', 5, 3, 'Technology > Programming > Python');

-- Find all descendant tags
WITH RECURSIVE tag_tree AS (
    SELECT tag_id, tag_name, parent_tag_id, 0 as depth
    FROM hierarchical_tags
    WHERE tag_id = 2  -- Databases

    UNION ALL

    SELECT t.tag_id, t.tag_name, t.parent_tag_id, tt.depth + 1
    FROM hierarchical_tags t
    JOIN tag_tree tt ON t.parent_tag_id = tt.tag_id
)
SELECT REPEAT('  ', depth) || tag_name as tag_hierarchy
FROM tag_tree
ORDER BY tag_name;
```

### Pattern 3: JSONB Array of Tags

```sql
CREATE TABLE posts_with_tags (
    post_id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    tags TEXT[] DEFAULT '{}',  -- Simple array
    metadata JSONB DEFAULT '{}'::jsonb  -- More complex tagging
);

CREATE INDEX idx_posts_tags ON posts_with_tags USING GIN (tags);
CREATE INDEX idx_posts_metadata ON posts_with_tags USING GIN (metadata);

INSERT INTO posts_with_tags (title, content, tags, metadata) VALUES
('PostgreSQL Tutorial', 'Content...', ARRAY['postgresql', 'database', 'tutorial'], jsonb_build_object(
    'tags', jsonb_build_array(
        jsonb_build_object('name', 'postgresql', 'weight', 10),
        jsonb_build_object('name', 'database', 'weight', 5)
    ),
    'categories', jsonb_build_array('tutorial', 'technical')
));

-- Find posts with specific tag
SELECT title FROM posts_with_tags WHERE 'postgresql' = ANY(tags);

-- Find posts with any of multiple tags
SELECT title FROM posts_with_tags WHERE tags && ARRAY['postgresql', 'mysql'];

-- Find posts with all specified tags
SELECT title FROM posts_with_tags WHERE tags @> ARRAY['postgresql', 'database'];
```

## Common Mistakes

### 1. Overusing EAV

```sql
-- DON'T: Use EAV when attributes are known and stable
-- If all products have the same 10 attributes, use columns!

-- DO: Use regular columns for known attributes
CREATE TABLE products_good (
    product_id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    weight NUMERIC,
    color TEXT
);
```

### 2. Polymorphic Without Constraints

```sql
-- DON'T: Type+ID pattern without validation
CREATE TABLE bad_comments (
    comment_id SERIAL PRIMARY KEY,
    target_type TEXT,
    target_id INT  -- No FK, no validation!
);

-- DO: Use separate FKs with CHECK constraint
CREATE TABLE good_comments (
    comment_id SERIAL PRIMARY KEY,
    post_id INT REFERENCES posts(post_id),
    photo_id INT REFERENCES photos(photo_id),
    CHECK ((post_id IS NOT NULL)::int + (photo_id IS NOT NULL)::int = 1)
);
```

### 3. Not Indexing Soft Delete Column

```sql
-- DON'T: Forget index on deleted_at
CREATE TABLE items (
    item_id SERIAL PRIMARY KEY,
    name TEXT,
    deleted_at TIMESTAMP
);
-- Every query for active items does full table scan!

-- DO: Add index
CREATE INDEX idx_items_deleted ON items(deleted_at);
-- Or partial index for active items
CREATE INDEX idx_items_active ON items(item_id) WHERE deleted_at IS NULL;
```

## Best Practices

### 1. Document Pattern Usage

```sql
COMMENT ON TABLE product_attributes IS
'EAV pattern for flexible product attributes. Use JSONB alternative in products_jsonb table for better performance.';

COMMENT ON COLUMN comments_better.post_id IS
'Polymorphic association: exactly one of post_id or photo_id must be set (enforced by CHECK constraint).';
```

### 2. Provide Helper Functions

```sql
-- Helper to get active records
CREATE OR REPLACE FUNCTION get_active_items()
RETURNS SETOF items AS $$
BEGIN
    RETURN QUERY SELECT * FROM items WHERE deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Helper to soft delete
CREATE OR REPLACE FUNCTION soft_delete_item(p_item_id INT)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE items SET deleted_at = CURRENT_TIMESTAMP WHERE item_id = p_item_id;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;
```

### 3. Consider Performance Impact

Always benchmark pattern implementations against simpler alternatives.

## Practice Exercises

### Exercise 1: Implement Product Variants

Create a flexible product variant system using appropriate patterns.

**Solution:**

```sql
-- Use JSONB for flexible variant attributes
CREATE TABLE products_variants (
    product_id SERIAL PRIMARY KEY,
    base_product_name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    base_price NUMERIC(10, 2) NOT NULL,
    variant_attributes JSONB DEFAULT '{}'::jsonb,
    stock_quantity INT DEFAULT 0,
    CHECK (base_price >= 0),
    CHECK (stock_quantity >= 0)
);

CREATE INDEX idx_variants_attrs ON products_variants USING GIN (variant_attributes);

-- T-shirt variants
INSERT INTO products_variants (base_product_name, sku, base_price, variant_attributes) VALUES
('T-Shirt', 'TSHIRT-RED-S', 19.99, '{"color": "Red", "size": "S"}'),
('T-Shirt', 'TSHIRT-RED-M', 19.99, '{"color": "Red", "size": "M"}'),
('T-Shirt', 'TSHIRT-BLUE-L', 19.99, '{"color": "Blue", "size": "L"}');

-- Laptop variants
INSERT INTO products_variants (base_product_name, sku, base_price, variant_attributes) VALUES
('Laptop Pro', 'LAPTOP-16GB-512GB', 1299.99, '{"ram_gb": 16, "storage_gb": 512, "color": "Silver"}'),
('Laptop Pro', 'LAPTOP-32GB-1TB', 1799.99, '{"ram_gb": 32, "storage_gb": 1024, "color": "Space Gray"}');

-- Find all red t-shirts
SELECT base_product_name, sku, variant_attributes
FROM products_variants
WHERE base_product_name = 'T-Shirt'
    AND variant_attributes->>'color' = 'Red';

-- Find laptops with >= 32GB RAM
SELECT sku, base_price, variant_attributes
FROM products_variants
WHERE base_product_name = 'Laptop Pro'
    AND (variant_attributes->>'ram_gb')::int >= 32;
```

### Exercise 2: Build Activity Feed

Create an activity feed that shows different types of activities (posts, comments, likes).

**Solution:**

```sql
-- Use separate tables with UNION for querying
CREATE TABLE user_posts_activity (
    post_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_comments_activity (
    comment_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    post_id INT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_likes_activity (
    like_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    post_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create unified activity feed view
CREATE VIEW user_activity_feed AS
    SELECT
        'post' as activity_type,
        post_id as activity_id,
        user_id,
        content as description,
        created_at
    FROM user_posts_activity

    UNION ALL

    SELECT
        'comment' as activity_type,
        comment_id,
        user_id,
        'Commented: ' || content,
        created_at
    FROM user_comments_activity

    UNION ALL

    SELECT
        'like' as activity_type,
        like_id,
        user_id,
        'Liked a post',
        created_at
    FROM user_likes_activity;

-- Get recent activity for a user
SELECT activity_type, description, created_at
FROM user_activity_feed
WHERE user_id = 1
ORDER BY created_at DESC
LIMIT 20;
```

### Exercise 3: Implement Approval Workflow

Create an approval workflow state machine for documents.

**Solution:**

```sql
CREATE TABLE documents (
    document_id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    author_id INT NOT NULL,
    status TEXT DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'published'))
);

CREATE TABLE document_approvals (
    approval_id SERIAL PRIMARY KEY,
    document_id INT REFERENCES documents(document_id),
    approver_id INT NOT NULL,
    from_status TEXT,
    to_status TEXT,
    comments TEXT,
    approved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- State transitions
CREATE TABLE document_state_transitions (
    from_status TEXT,
    to_status TEXT,
    required_role TEXT,  -- who can make this transition
    PRIMARY KEY (from_status, to_status)
);

INSERT INTO document_state_transitions VALUES
('draft', 'submitted', 'author'),
('submitted', 'under_review', 'reviewer'),
('submitted', 'draft', 'author'),
('under_review', 'approved', 'reviewer'),
('under_review', 'rejected', 'reviewer'),
('approved', 'published', 'publisher'),
('rejected', 'draft', 'author');

-- See state machine pattern above for trigger implementation
```

## Related Topics

- [Normalization](./01-normalization.md)
- [JSONB Data Type](../05-data-types/05-json-jsonb.md)
- [Triggers](../10-triggers/01-trigger-basics.md)
- [Check Constraints](../04-constraints/03-check-constraints.md)
- [Indexes](../07-indexes/01-index-basics.md)
