# Hierarchical Data in PostgreSQL

## Theory

Hierarchical data represents tree structures where entities have parent-child relationships. Common examples include organizational charts, category trees, file systems, and comment threads.

### Common Use Cases

1. **Organizational Charts**: Employees reporting to managers
2. **Product Categories**: Nested categories and subcategories
3. **Comments**: Threaded discussion replies
4. **File Systems**: Folders containing files and subfolders
5. **Menu Structures**: Nested navigation menus
6. **Bill of Materials**: Parts containing sub-parts

### Challenges

- Querying entire tree or subtree
- Finding path from root to node
- Moving nodes and subtrees
- Maintaining data integrity
- Performance at scale

## Adjacency List Model

### Theory

The simplest approach: each node has a `parent_id` column pointing to its parent. The root node has `parent_id = NULL`.

### Implementation

```sql
CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    category_name TEXT NOT NULL,
    parent_id INT REFERENCES categories(category_id) ON DELETE CASCADE,
    display_order INT DEFAULT 0
);

CREATE INDEX idx_categories_parent ON categories(parent_id);

-- Sample hierarchical data
INSERT INTO categories (category_id, category_name, parent_id) VALUES
(1, 'Electronics', NULL),
    (2, 'Computers', 1),
        (3, 'Laptops', 2),
        (4, 'Desktops', 2),
        (5, 'Tablets', 2),
    (6, 'Audio', 1),
        (7, 'Headphones', 6),
        (8, 'Speakers', 6),
(9, 'Clothing', NULL),
    (10, 'Men', 9),
        (11, 'Shirts', 10),
        (12, 'Pants', 10),
    (13, 'Women', 9);

-- Find immediate children
SELECT category_name
FROM categories
WHERE parent_id = 1;  -- Electronics

-- Find root categories
SELECT category_name
FROM categories
WHERE parent_id IS NULL;
```

### Recursive Queries with CTEs

```sql
-- Get entire subtree (all descendants)
WITH RECURSIVE category_tree AS (
    -- Base case: start with Electronics
    SELECT category_id, category_name, parent_id, 1 as level
    FROM categories
    WHERE category_id = 1

    UNION ALL

    -- Recursive case: get children
    SELECT c.category_id, c.category_name, c.parent_id, ct.level + 1
    FROM categories c
    JOIN category_tree ct ON c.parent_id = ct.category_id
)
SELECT
    REPEAT('  ', level - 1) || category_name as tree_view,
    level
FROM category_tree
ORDER BY level, category_name;

-- Get path from root to node
WITH RECURSIVE category_path AS (
    -- Base case: start with specific node (Laptops)
    SELECT category_id, category_name, parent_id, category_name as path
    FROM categories
    WHERE category_id = 3

    UNION ALL

    -- Recursive case: go up to parent
    SELECT c.category_id, c.category_name, c.parent_id, c.category_name || ' > ' || cp.path
    FROM categories c
    JOIN category_path cp ON c.category_id = cp.parent_id
)
SELECT path
FROM category_path
WHERE parent_id IS NULL;  -- Root node

-- Count descendants for each category
WITH RECURSIVE descendant_count AS (
    SELECT category_id, category_id as descendant_id
    FROM categories

    UNION ALL

    SELECT dc.category_id, c.category_id
    FROM categories c
    JOIN descendant_count dc ON c.parent_id = dc.descendant_id
)
SELECT
    c.category_name,
    COUNT(dc.descendant_id) - 1 as descendant_count  -- -1 to exclude self
FROM categories c
LEFT JOIN descendant_count dc ON c.category_id = dc.category_id
GROUP BY c.category_id, c.category_name
ORDER BY c.category_id;
```

### Pros and Cons

**Advantages:**
- Simple to understand and implement
- Easy to insert/update/delete nodes
- Flexible structure
- Works well for small to medium trees

**Disadvantages:**
- Requires recursive queries (can be slow)
- No direct way to query depth
- Moving subtrees requires multiple updates
- Can be slow for deep trees

## Materialized Path (Path Enumeration)

### Theory

Store the full path from root to each node as a string. Makes queries faster but updates more complex.

### Implementation

```sql
CREATE TABLE categories_path (
    category_id SERIAL PRIMARY KEY,
    category_name TEXT NOT NULL,
    parent_id INT REFERENCES categories_path(category_id),
    path TEXT NOT NULL,  -- Materialized path like '1.2.3'
    level INT NOT NULL,
    UNIQUE(path)
);

CREATE INDEX idx_categories_path ON categories_path(path);
CREATE INDEX idx_categories_parent ON categories_path(parent_id);

-- Insert with path calculation
CREATE OR REPLACE FUNCTION calculate_category_path()
RETURNS TRIGGER AS $$
DECLARE
    parent_path TEXT;
    parent_level INT;
BEGIN
    IF NEW.parent_id IS NULL THEN
        -- Root node
        NEW.path := NEW.category_id::TEXT;
        NEW.level := 1;
    ELSE
        -- Get parent's path and level
        SELECT path, level INTO parent_path, parent_level
        FROM categories_path
        WHERE category_id = NEW.parent_id;

        IF parent_path IS NULL THEN
            RAISE EXCEPTION 'Parent category % not found', NEW.parent_id;
        END IF;

        NEW.path := parent_path || '.' || NEW.category_id::TEXT;
        NEW.level := parent_level + 1;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calculate_path
BEFORE INSERT ON categories_path
FOR EACH ROW EXECUTE FUNCTION calculate_category_path();

-- Insert data
INSERT INTO categories_path (category_id, category_name, parent_id) VALUES
(1, 'Electronics', NULL);

INSERT INTO categories_path (category_id, category_name, parent_id) VALUES
(2, 'Computers', 1),
(3, 'Audio', 1);

INSERT INTO categories_path (category_id, category_name, parent_id) VALUES
(4, 'Laptops', 2),
(5, 'Desktops', 2),
(6, 'Headphones', 3);

SELECT category_id, category_name, path, level FROM categories_path ORDER BY path;

-- Query: Get all descendants (simple LIKE query!)
SELECT category_name, path, level
FROM categories_path
WHERE path LIKE '1.2%'  -- All descendants of Computers (id=2)
ORDER BY path;

-- Query: Get ancestors (also simple!)
SELECT category_name, path, level
FROM categories_path
WHERE '1.2.4' LIKE path || '%'  -- All ancestors of Laptops
ORDER BY level;

-- Query: Get immediate children
SELECT category_name
FROM categories_path
WHERE parent_id = 2;

-- Query: Get siblings
SELECT category_name
FROM categories_path
WHERE parent_id = (SELECT parent_id FROM categories_path WHERE category_id = 4)
    AND category_id != 4;
```

### Moving Nodes

```sql
-- Function to move a node (updates all descendant paths)
CREATE OR REPLACE FUNCTION move_category(
    p_category_id INT,
    p_new_parent_id INT
)
RETURNS void AS $$
DECLARE
    v_old_path TEXT;
    v_new_path TEXT;
    v_new_level INT;
BEGIN
    -- Get current path
    SELECT path INTO v_old_path
    FROM categories_path
    WHERE category_id = p_category_id;

    -- Calculate new path
    IF p_new_parent_id IS NULL THEN
        v_new_path := p_category_id::TEXT;
        v_new_level := 1;
    ELSE
        SELECT path || '.' || p_category_id, level + 1
        INTO v_new_path, v_new_level
        FROM categories_path
        WHERE category_id = p_new_parent_id;
    END IF;

    -- Update the node and all descendants
    UPDATE categories_path
    SET
        path = v_new_path || substring(path from length(v_old_path) + 1),
        level = level - (SELECT level FROM categories_path WHERE category_id = p_category_id) + v_new_level,
        parent_id = CASE WHEN category_id = p_category_id THEN p_new_parent_id ELSE parent_id END
    WHERE path LIKE v_old_path || '%';
END;
$$ LANGUAGE plpgsql;

-- Move Laptops from Computers to Audio
SELECT move_category(4, 3);

SELECT category_name, path, level FROM categories_path ORDER BY path;
```

### Pros and Cons

**Advantages:**
- Fast ancestor/descendant queries (simple LIKE)
- No recursive queries needed
- Easy to get level/depth
- Good for read-heavy workloads

**Disadvantages:**
- More complex inserts/updates
- Moving subtrees requires updating many rows
- Path length limit (TEXT type, but practical limit exists)
- Ordering can be tricky

## ltree Extension

### Theory

PostgreSQL's `ltree` extension provides optimized support for materialized path with special operators and indexing.

### Setup and Basic Usage

```sql
-- Enable ltree extension
CREATE EXTENSION IF NOT EXISTS ltree;

CREATE TABLE categories_ltree (
    category_id SERIAL PRIMARY KEY,
    category_name TEXT NOT NULL,
    parent_id INT REFERENCES categories_ltree(category_id),
    path ltree NOT NULL
);

-- GiST index for ltree (enables fast queries)
CREATE INDEX idx_categories_ltree_path ON categories_ltree USING GIST (path);
CREATE INDEX idx_categories_ltree_parent ON categories_ltree(parent_id);

-- Insert data
INSERT INTO categories_ltree (category_id, category_name, parent_id, path) VALUES
(1, 'Electronics', NULL, 'electronics'),
(2, 'Computers', 1, 'electronics.computers'),
(3, 'Audio', 1, 'electronics.audio'),
(4, 'Laptops', 2, 'electronics.computers.laptops'),
(5, 'Desktops', 2, 'electronics.computers.desktops'),
(6, 'Headphones', 3, 'electronics.audio.headphones'),
(7, 'Gaming_Laptops', 4, 'electronics.computers.laptops.gaming_laptops');

-- Automatic path calculation trigger
CREATE OR REPLACE FUNCTION calculate_ltree_path()
RETURNS TRIGGER AS $$
DECLARE
    parent_path ltree;
    slug TEXT;
BEGIN
    IF NEW.parent_id IS NULL THEN
        -- Root node: use slugified name
        slug := lower(regexp_replace(NEW.category_name, '[^a-zA-Z0-9]', '_', 'g'));
        NEW.path := slug::ltree;
    ELSE
        -- Get parent's path
        SELECT path INTO parent_path
        FROM categories_ltree
        WHERE category_id = NEW.parent_id;

        IF parent_path IS NULL THEN
            RAISE EXCEPTION 'Parent category not found';
        END IF;

        slug := lower(regexp_replace(NEW.category_name, '[^a-zA-Z0-9]', '_', 'g'));
        NEW.path := parent_path || slug::ltree;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calculate_ltree
BEFORE INSERT OR UPDATE ON categories_ltree
FOR EACH ROW EXECUTE FUNCTION calculate_ltree_path();

-- Now inserts automatically calculate path
DELETE FROM categories_ltree;

INSERT INTO categories_ltree (category_id, category_name, parent_id) VALUES
(1, 'Electronics', NULL);

INSERT INTO categories_ltree (category_id, category_name, parent_id) VALUES
(2, 'Computers', 1),
(3, 'Audio', 1);

INSERT INTO categories_ltree (category_id, category_name, parent_id) VALUES
(4, 'Laptops', 2),
(5, 'Desktops', 2);

SELECT category_id, category_name, path FROM categories_ltree;
```

### ltree Operators

```sql
-- Ancestor operators
-- @ > (is ancestor of)
SELECT category_name
FROM categories_ltree
WHERE path @> 'electronics.computers';  -- All ancestors of Computers

-- < @ (is descendant of)
SELECT category_name, path
FROM categories_ltree
WHERE path <@ 'electronics.computers';  -- All descendants of Computers

-- Match pattern with *
SELECT category_name, path
FROM categories_ltree
WHERE path ~ 'electronics.*';  -- First level children

SELECT category_name, path
FROM categories_ltree
WHERE path ~ 'electronics.*{1,2}';  -- Up to 2 levels deep

-- Get level/depth
SELECT category_name, nlevel(path) as depth
FROM categories_ltree
ORDER BY path;

-- Get immediate children
SELECT category_name
FROM categories_ltree
WHERE path ~ 'electronics.*{1}'  -- Exactly 1 level below electronics
    AND path != 'electronics';

-- Lowest Common Ancestor
SELECT lca('electronics.computers.laptops', 'electronics.computers.desktops');
-- Returns: electronics.computers

-- Subpath
SELECT subpath('electronics.computers.laptops', 0, 2);
-- Returns: electronics.computers
```

### Advanced ltree Queries

```sql
-- Full-text search on path
SELECT category_name, path
FROM categories_ltree
WHERE path::text ILIKE '%laptop%';

-- Count depth for each node
SELECT
    category_name,
    path,
    nlevel(path) as depth,
    nlevel(path) - 1 as level_from_root
FROM categories_ltree
ORDER BY path;

-- Find all leaf nodes (no children)
SELECT c.category_name, c.path
FROM categories_ltree c
WHERE NOT EXISTS (
    SELECT 1 FROM categories_ltree child
    WHERE child.path <@ c.path AND child.path != c.path
);

-- Get breadcrumb trail
SELECT
    category_name,
    path,
    regexp_split_to_array(path::text, '\.') as breadcrumb_array
FROM categories_ltree
WHERE category_id = 7;
```

### Pros and Cons

**Advantages:**
- Very fast queries with GiST index
- Rich set of operators
- Optimized for hierarchical data
- Good for large trees

**Disadvantages:**
- Requires PostgreSQL extension
- Path syntax restrictions (labels must be alphanumeric)
- Moving nodes still requires updates
- Less portable than pure SQL

## Nested Sets Model

### Theory

Each node stores `left` and `right` values that define its position in the tree. Allows very fast subtree queries but complex inserts/moves.

### Implementation

```sql
CREATE TABLE categories_nested (
    category_id SERIAL PRIMARY KEY,
    category_name TEXT NOT NULL,
    lft INT NOT NULL,
    rgt INT NOT NULL,
    CHECK (lft < rgt)
);

CREATE UNIQUE INDEX idx_categories_lft ON categories_nested(lft);
CREATE UNIQUE INDEX idx_categories_rgt ON categories_nested(rgt);

-- Manually insert with calculated lft/rgt values
-- Tree structure:
--   Electronics (1,16)
--     Computers (2,9)
--       Laptops (3,4)
--       Desktops (5,6)
--       Tablets (7,8)
--     Audio (10,15)
--       Headphones (11,12)
--       Speakers (13,14)

INSERT INTO categories_nested (category_id, category_name, lft, rgt) VALUES
(1, 'Electronics', 1, 16),
(2, 'Computers', 2, 9),
(3, 'Laptops', 3, 4),
(4, 'Desktops', 5, 6),
(5, 'Tablets', 7, 8),
(6, 'Audio', 10, 15),
(7, 'Headphones', 11, 12),
(8, 'Speakers', 13, 14);

-- Query: Get entire subtree (very fast!)
SELECT category_name, lft, rgt
FROM categories_nested
WHERE lft >= 2 AND rgt <= 9  -- All nodes within Computers
ORDER BY lft;

-- Query: Get all ancestors
SELECT parent.category_name
FROM categories_nested AS node
JOIN categories_nested AS parent ON node.lft BETWEEN parent.lft AND parent.rgt
WHERE node.category_id = 3  -- Laptops
ORDER BY parent.lft;

-- Query: Get immediate children
SELECT child.category_name
FROM categories_nested AS child
JOIN categories_nested AS parent ON child.lft BETWEEN parent.lft AND parent.rgt
WHERE parent.category_id = 2  -- Computers
    AND NOT EXISTS (
        SELECT 1 FROM categories_nested AS mid
        WHERE mid.lft BETWEEN parent.lft AND parent.rgt
            AND child.lft BETWEEN mid.lft AND mid.rgt
            AND mid.category_id NOT IN (parent.category_id, child.category_id)
    );

-- Calculate depth
SELECT
    node.category_name,
    COUNT(parent.category_id) - 1 as depth
FROM categories_nested AS node
JOIN categories_nested AS parent ON node.lft BETWEEN parent.lft AND parent.rgt
GROUP BY node.category_id, node.category_name, node.lft
ORDER BY node.lft;

-- Check if node is leaf
SELECT
    category_name,
    CASE WHEN rgt = lft + 1 THEN 'Leaf' ELSE 'Branch' END as node_type
FROM categories_nested;
```

### Inserting Nodes (Complex)

```sql
-- Function to insert new category
CREATE OR REPLACE FUNCTION insert_nested_category(
    p_category_name TEXT,
    p_parent_id INT
)
RETURNS INT AS $$
DECLARE
    v_parent_rgt INT;
    v_new_id INT;
BEGIN
    -- Get parent's right value
    SELECT rgt INTO v_parent_rgt
    FROM categories_nested
    WHERE category_id = p_parent_id;

    IF v_parent_rgt IS NULL THEN
        RAISE EXCEPTION 'Parent category not found';
    END IF;

    -- Make room for new node
    UPDATE categories_nested
    SET rgt = rgt + 2
    WHERE rgt >= v_parent_rgt;

    UPDATE categories_nested
    SET lft = lft + 2
    WHERE lft >= v_parent_rgt;

    -- Insert new node
    INSERT INTO categories_nested (category_name, lft, rgt)
    VALUES (p_category_name, v_parent_rgt, v_parent_rgt + 1)
    RETURNING category_id INTO v_new_id;

    RETURN v_new_id;
END;
$$ LANGUAGE plpgsql;

-- Insert new category under Computers
SELECT insert_nested_category('Monitors', 2);

SELECT category_name, lft, rgt FROM categories_nested ORDER BY lft;
```

### Pros and Cons

**Advantages:**
- Very fast subtree queries (no recursion)
- Fast to find all ancestors
- Efficient for read-heavy workloads
- Good for display trees

**Disadvantages:**
- Complex inserts/deletes/moves (many rows updated)
- Hard to maintain
- Not intuitive
- Write-heavy workloads are slow

## Closure Table Pattern

### Theory

Store all ancestor-descendant relationships explicitly in a separate table. Most flexible but requires more storage.

### Implementation

```sql
CREATE TABLE categories_closure (
    category_id SERIAL PRIMARY KEY,
    category_name TEXT NOT NULL
);

CREATE TABLE category_tree_paths (
    ancestor_id INT REFERENCES categories_closure(category_id) ON DELETE CASCADE,
    descendant_id INT REFERENCES categories_closure(category_id) ON DELETE CASCADE,
    depth INT NOT NULL CHECK (depth >= 0),
    PRIMARY KEY (ancestor_id, descendant_id)
);

CREATE INDEX idx_tree_paths_ancestor ON category_tree_paths(ancestor_id);
CREATE INDEX idx_tree_paths_descendant ON category_tree_paths(descendant_id);
CREATE INDEX idx_tree_paths_depth ON category_tree_paths(depth);

-- Insert categories
INSERT INTO categories_closure (category_id, category_name) VALUES
(1, 'Electronics'),
(2, 'Computers'),
(3, 'Audio'),
(4, 'Laptops'),
(5, 'Desktops'),
(6, 'Headphones');

-- Insert closure table relationships
-- Each node is its own ancestor at depth 0
INSERT INTO category_tree_paths (ancestor_id, descendant_id, depth) VALUES
-- Self-references
(1, 1, 0), (2, 2, 0), (3, 3, 0), (4, 4, 0), (5, 5, 0), (6, 6, 0),
-- Electronics > Computers
(1, 2, 1),
-- Electronics > Audio
(1, 3, 1),
-- Computers > Laptops
(2, 4, 1),
-- Electronics > Laptops (transitive)
(1, 4, 2),
-- Computers > Desktops
(2, 5, 1),
-- Electronics > Desktops (transitive)
(1, 5, 2),
-- Audio > Headphones
(3, 6, 1),
-- Electronics > Headphones (transitive)
(1, 6, 2);

-- Query: Get all descendants
SELECT c.category_name, tp.depth
FROM category_tree_paths tp
JOIN categories_closure c ON tp.descendant_id = c.category_id
WHERE tp.ancestor_id = 1  -- Electronics
    AND tp.depth > 0  -- Exclude self
ORDER BY tp.depth, c.category_name;

-- Query: Get all ancestors
SELECT c.category_name, tp.depth
FROM category_tree_paths tp
JOIN categories_closure c ON tp.ancestor_id = c.category_id
WHERE tp.descendant_id = 4  -- Laptops
    AND tp.depth > 0
ORDER BY tp.depth DESC;

-- Query: Get immediate children
SELECT c.category_name
FROM category_tree_paths tp
JOIN categories_closure c ON tp.descendant_id = c.category_id
WHERE tp.ancestor_id = 2  -- Computers
    AND tp.depth = 1;

-- Query: Get siblings
SELECT c.category_name
FROM categories_closure c
WHERE c.category_id IN (
    SELECT tp.descendant_id
    FROM category_tree_paths tp
    WHERE tp.ancestor_id = (
        SELECT ancestor_id
        FROM category_tree_paths
        WHERE descendant_id = 4 AND depth = 1
    ) AND tp.depth = 1
) AND c.category_id != 4;
```

### Inserting with Triggers

```sql
-- Function to maintain closure table
CREATE OR REPLACE FUNCTION maintain_closure_table()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Insert self-reference
        INSERT INTO category_tree_paths (ancestor_id, descendant_id, depth)
        VALUES (NEW.category_id, NEW.category_id, 0);

        -- If has parent (stored in temp table or passed somehow)
        -- This is a simplified example
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Better: explicit function to add child
CREATE OR REPLACE FUNCTION add_category_child(
    p_category_name TEXT,
    p_parent_id INT
)
RETURNS INT AS $$
DECLARE
    v_new_id INT;
BEGIN
    -- Insert new category
    INSERT INTO categories_closure (category_name)
    VALUES (p_category_name)
    RETURNING category_id INTO v_new_id;

    -- Insert self-reference
    INSERT INTO category_tree_paths (ancestor_id, descendant_id, depth)
    VALUES (v_new_id, v_new_id, 0);

    -- Insert relationships with all ancestors
    INSERT INTO category_tree_paths (ancestor_id, descendant_id, depth)
    SELECT ancestor_id, v_new_id, depth + 1
    FROM category_tree_paths
    WHERE descendant_id = p_parent_id;

    RETURN v_new_id;
END;
$$ LANGUAGE plpgsql;

-- Add new category
SELECT add_category_child('Gaming Laptops', 4);

-- Verify
SELECT c.category_name, tp.depth
FROM category_tree_paths tp
JOIN categories_closure c ON tp.ancestor_id = c.category_id
WHERE tp.descendant_id = (SELECT category_id FROM categories_closure WHERE category_name = 'Gaming Laptops')
ORDER BY tp.depth DESC;
```

### Moving Subtrees

```sql
-- Function to move subtree
CREATE OR REPLACE FUNCTION move_subtree(
    p_node_id INT,
    p_new_parent_id INT
)
RETURNS void AS $$
BEGIN
    -- Delete old paths (except self-reference and paths within subtree)
    DELETE FROM category_tree_paths
    WHERE descendant_id IN (
        SELECT descendant_id
        FROM category_tree_paths
        WHERE ancestor_id = p_node_id
    )
    AND ancestor_id NOT IN (
        SELECT descendant_id
        FROM category_tree_paths
        WHERE ancestor_id = p_node_id
    );

    -- Insert new paths
    INSERT INTO category_tree_paths (ancestor_id, descendant_id, depth)
    SELECT parent_paths.ancestor_id, subtree_paths.descendant_id,
           parent_paths.depth + subtree_paths.depth + 1
    FROM category_tree_paths parent_paths
    CROSS JOIN category_tree_paths subtree_paths
    WHERE parent_paths.descendant_id = p_new_parent_id
        AND subtree_paths.ancestor_id = p_node_id;
END;
$$ LANGUAGE plpgsql;
```

### Pros and Cons

**Advantages:**
- Fast queries (no recursion needed)
- Easy to find ancestors, descendants, depth
- Moving nodes is straightforward
- Most flexible approach

**Disadvantages:**
- More storage (O(n²) in worst case)
- More complex to maintain
- Many rows for deep trees
- Deletes can cascade to many rows

## Performance Comparison

### Read Performance

| Operation | Adjacency List | Materialized Path | ltree | Nested Sets | Closure Table |
|-----------|----------------|-------------------|-------|-------------|---------------|
| Get Children | Fast | Fast | Fast | Medium | Fast |
| Get Subtree | Slow (recursive) | Fast | Fast | Very Fast | Fast |
| Get Ancestors | Slow (recursive) | Fast | Fast | Fast | Fast |
| Get Depth | Slow | Fast | Fast | Medium | Fast |

### Write Performance

| Operation | Adjacency List | Materialized Path | ltree | Nested Sets | Closure Table |
|-----------|----------------|-------------------|-------|-------------|---------------|
| Insert | Fast | Medium | Medium | Slow | Medium |
| Move | Fast | Slow | Slow | Very Slow | Medium |
| Delete | Fast | Fast | Fast | Slow | Medium |

## Practical Examples

### Organizational Chart

```sql
CREATE TABLE employees_org (
    employee_id SERIAL PRIMARY KEY,
    employee_name TEXT NOT NULL,
    title TEXT,
    manager_id INT REFERENCES employees_org(employee_id),
    hire_date DATE DEFAULT CURRENT_DATE
);

CREATE INDEX idx_employees_manager ON employees_org(manager_id);

INSERT INTO employees_org (employee_id, employee_name, title, manager_id) VALUES
(1, 'Alice CEO', 'Chief Executive Officer', NULL),
(2, 'Bob VP', 'VP of Engineering', 1),
(3, 'Carol VP', 'VP of Sales', 1),
(4, 'Dave Manager', 'Engineering Manager', 2),
(5, 'Eve Manager', 'Sales Manager', 3),
(6, 'Frank Developer', 'Senior Developer', 4),
(7, 'Grace Developer', 'Developer', 4),
(8, 'Henry Sales', 'Sales Representative', 5);

-- Query: Full org chart
WITH RECURSIVE org_chart AS (
    SELECT employee_id, employee_name, title, manager_id, 1 as level, employee_name as path
    FROM employees_org
    WHERE manager_id IS NULL

    UNION ALL

    SELECT e.employee_id, e.employee_name, e.title, e.manager_id, oc.level + 1,
           oc.path || ' > ' || e.employee_name
    FROM employees_org e
    JOIN org_chart oc ON e.manager_id = oc.employee_id
)
SELECT
    REPEAT('  ', level - 1) || employee_name as org_structure,
    title,
    level
FROM org_chart
ORDER BY path;

-- Query: All reports under a manager (direct and indirect)
WITH RECURSIVE reports AS (
    SELECT employee_id, employee_name, manager_id
    FROM employees_org
    WHERE employee_id = 2  -- Bob VP

    UNION ALL

    SELECT e.employee_id, e.employee_name, e.manager_id
    FROM employees_org e
    JOIN reports r ON e.manager_id = r.employee_id
)
SELECT employee_name, manager_id
FROM reports
WHERE employee_id != 2;

-- Query: Management chain for an employee
WITH RECURSIVE management_chain AS (
    SELECT employee_id, employee_name, manager_id, title, 0 as level
    FROM employees_org
    WHERE employee_id = 6  -- Frank

    UNION ALL

    SELECT e.employee_id, e.employee_name, e.manager_id, e.title, mc.level + 1
    FROM employees_org e
    JOIN management_chain mc ON e.employee_id = mc.manager_id
)
SELECT employee_name, title, level
FROM management_chain
ORDER BY level DESC;
```

### Product Categories with ltree

```sql
CREATE TABLE product_categories_ltree (
    category_id SERIAL PRIMARY KEY,
    category_name TEXT NOT NULL,
    path ltree NOT NULL,
    description TEXT
);

CREATE INDEX idx_product_cat_path ON product_categories_ltree USING GIST (path);

CREATE TABLE products_categorized (
    product_id SERIAL PRIMARY KEY,
    product_name TEXT NOT NULL,
    category_id INT REFERENCES product_categories_ltree(category_id),
    price NUMERIC(10, 2)
);

-- Insert categories
INSERT INTO product_categories_ltree (category_name, path, description) VALUES
('Electronics', 'electronics', 'Electronic devices'),
('Computers', 'electronics.computers', 'Computer equipment'),
('Laptops', 'electronics.computers.laptops', 'Portable computers'),
('Gaming', 'electronics.computers.laptops.gaming', 'Gaming laptops'),
('Business', 'electronics.computers.laptops.business', 'Business laptops'),
('Desktops', 'electronics.computers.desktops', 'Desktop computers');

-- Insert products
INSERT INTO products_categorized (product_name, category_id, price) VALUES
('Gaming Laptop X1', (SELECT category_id FROM product_categories_ltree WHERE path = 'electronics.computers.laptops.gaming'), 1999.99),
('Business Laptop Pro', (SELECT category_id FROM product_categories_ltree WHERE path = 'electronics.computers.laptops.business'), 1299.99),
('Desktop Workstation', (SELECT category_id FROM product_categories_ltree WHERE path = 'electronics.computers.desktops'), 2499.99);

-- Query: All products in Computers category and subcategories
SELECT p.product_name, pc.category_name, p.price
FROM products_categorized p
JOIN product_categories_ltree pc ON p.category_id = pc.category_id
WHERE pc.path <@ 'electronics.computers'
ORDER BY pc.path, p.product_name;

-- Query: Category breadcrumbs for a product
SELECT
    p.product_name,
    string_agg(pc_breadcrumb.category_name, ' > ' ORDER BY nlevel(pc_breadcrumb.path)) as breadcrumb
FROM products_categorized p
JOIN product_categories_ltree pc ON p.category_id = pc.category_id
JOIN product_categories_ltree pc_breadcrumb ON pc.path <@ pc_breadcrumb.path
WHERE p.product_id = 1
GROUP BY p.product_id, p.product_name;
```

## Common Mistakes

### 1. Not Preventing Cycles

```sql
-- WRONG: Allowing a node to be its own ancestor
UPDATE categories SET parent_id = 5 WHERE category_id = 1;
-- If 1 is ancestor of 5, this creates a cycle!

-- RIGHT: Add constraint or trigger
CREATE OR REPLACE FUNCTION prevent_cycle()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.parent_id IS NOT NULL THEN
        -- Check if new parent is a descendant
        IF EXISTS (
            WITH RECURSIVE descendants AS (
                SELECT category_id FROM categories WHERE category_id = NEW.category_id
                UNION ALL
                SELECT c.category_id FROM categories c
                JOIN descendants d ON c.parent_id = d.category_id
            )
            SELECT 1 FROM descendants WHERE category_id = NEW.parent_id
        ) THEN
            RAISE EXCEPTION 'Cannot create cycle in hierarchy';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_cycle
BEFORE UPDATE ON categories
FOR EACH ROW EXECUTE FUNCTION prevent_cycle();
```

### 2. Not Indexing Parent Column

```sql
-- Always index parent_id for adjacency list!
CREATE INDEX idx_categories_parent ON categories(parent_id);
```

### 3. Choosing Wrong Model for Use Case

- Use **Adjacency List** for simple, small trees with frequent writes
- Use **ltree/Materialized Path** for read-heavy workloads with moderate writes
- Use **Nested Sets** for read-only trees needing fast subtree queries
- Use **Closure Table** when you need maximum query flexibility

## Best Practices

### 1. Add Helper Functions

```sql
-- Function to get full path as string
CREATE OR REPLACE FUNCTION get_category_path(p_category_id INT)
RETURNS TEXT AS $$
DECLARE
    result TEXT;
BEGIN
    WITH RECURSIVE path AS (
        SELECT category_id, category_name, parent_id, category_name as full_path
        FROM categories
        WHERE category_id = p_category_id

        UNION ALL

        SELECT c.category_id, c.category_name, c.parent_id, c.category_name || ' > ' || p.full_path
        FROM categories c
        JOIN path p ON c.category_id = p.parent_id
    )
    SELECT full_path INTO result FROM path WHERE parent_id IS NULL;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

SELECT get_category_path(4);
```

### 2. Denormalize Depth/Level

```sql
ALTER TABLE categories ADD COLUMN level INT;

UPDATE categories SET level = (
    WITH RECURSIVE depth AS (
        SELECT category_id, 0 as lvl FROM categories WHERE parent_id IS NULL
        UNION ALL
        SELECT c.category_id, d.lvl + 1
        FROM categories c
        JOIN depth d ON c.parent_id = d.category_id
    )
    SELECT lvl FROM depth WHERE depth.category_id = categories.category_id
);
```

### 3. Use Materialized Views for Complex Trees

```sql
CREATE MATERIALIZED VIEW category_hierarchy AS
WITH RECURSIVE tree AS (
    SELECT category_id, category_name, parent_id, 1 as level,
           ARRAY[category_id] as path_array,
           category_name as path_string
    FROM categories
    WHERE parent_id IS NULL

    UNION ALL

    SELECT c.category_id, c.category_name, c.parent_id, t.level + 1,
           t.path_array || c.category_id,
           t.path_string || ' > ' || c.category_name
    FROM categories c
    JOIN tree t ON c.parent_id = t.category_id
)
SELECT * FROM tree;

CREATE UNIQUE INDEX ON category_hierarchy(category_id);

REFRESH MATERIALIZED VIEW category_hierarchy;
```

## Practice Exercises

### Exercise 1: Build Comment Thread System

Implement threaded comments using adjacency list.

**Solution:**

```sql
CREATE TABLE comments_thread (
    comment_id SERIAL PRIMARY KEY,
    post_id INT NOT NULL,
    parent_comment_id INT REFERENCES comments_thread(comment_id),
    author_id INT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_comments_parent ON comments_thread(parent_comment_id);
CREATE INDEX idx_comments_post ON comments_thread(post_id);

-- Function to get comment thread
CREATE OR REPLACE FUNCTION get_comment_thread(p_post_id INT)
RETURNS TABLE(
    comment_id INT,
    parent_comment_id INT,
    content TEXT,
    level INT,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE thread AS (
        SELECT c.comment_id, c.parent_comment_id, c.content, 1 as level, c.created_at
        FROM comments_thread c
        WHERE c.post_id = p_post_id AND c.parent_comment_id IS NULL

        UNION ALL

        SELECT c.comment_id, c.parent_comment_id, c.content, t.level + 1, c.created_at
        FROM comments_thread c
        JOIN thread t ON c.parent_comment_id = t.comment_id
    )
    SELECT * FROM thread ORDER BY created_at;
END;
$$ LANGUAGE plpgsql;
```

### Exercise 2: File System Hierarchy

Model a file system with folders and files using ltree.

**Solution:**

```sql
CREATE TABLE filesystem (
    node_id SERIAL PRIMARY KEY,
    node_name TEXT NOT NULL,
    node_type TEXT NOT NULL CHECK (node_type IN ('folder', 'file')),
    path ltree NOT NULL,
    file_size BIGINT,  -- Only for files
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_filesystem_path ON filesystem USING GIST (path);

INSERT INTO filesystem (node_name, node_type, path) VALUES
('root', 'folder', 'root'),
('documents', 'folder', 'root.documents'),
('photos', 'folder', 'root.photos'),
('report.pdf', 'file', 'root.documents.report_pdf', 1024000),
('vacation.jpg', 'file', 'root.photos.vacation_jpg', 2048000);

-- Find all files in a folder
SELECT node_name, file_size
FROM filesystem
WHERE path <@ 'root.documents' AND node_type = 'file';

-- Get folder size (sum of all files in subtree)
SELECT SUM(file_size) as total_size
FROM filesystem
WHERE path <@ 'root.documents' AND node_type = 'file';
```

### Exercise 3: Build Bill of Materials (BOM)

Create a parts hierarchy where parts can contain sub-parts.

**Solution:**

```sql
CREATE TABLE parts (
    part_id SERIAL PRIMARY KEY,
    part_name TEXT NOT NULL,
    part_number TEXT UNIQUE NOT NULL
);

CREATE TABLE part_relationships (
    assembly_id INT REFERENCES parts(part_id),
    component_id INT REFERENCES parts(part_id),
    quantity INT NOT NULL,
    PRIMARY KEY (assembly_id, component_id)
);

-- Get full BOM for an assembly
WITH RECURSIVE bom AS (
    SELECT p.part_id, p.part_name, 1 as quantity, 1 as level
    FROM parts p
    WHERE p.part_id = 1  -- Top-level assembly

    UNION ALL

    SELECT p.part_id, p.part_name, pr.quantity * bom.quantity, bom.level + 1
    FROM part_relationships pr
    JOIN parts p ON pr.component_id = p.part_id
    JOIN bom ON pr.assembly_id = bom.part_id
)
SELECT REPEAT('  ', level - 1) || part_name as bom_structure, quantity
FROM bom
ORDER BY level;
```

## Related Topics

- [Recursive CTEs](../06-advanced-queries/04-recursive-queries.md)
- [Indexes](../07-indexes/01-index-basics.md)
- [Constraints](../04-constraints/02-foreign-keys.md)
- [ER Modeling](./03-er-modeling.md)
- [Design Patterns](./04-design-patterns.md)
