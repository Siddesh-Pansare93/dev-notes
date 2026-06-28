# Array Types

## Theory

PostgreSQL allows columns to be defined as variable-length multidimensional arrays. This powerful feature enables storing multiple values in a single field, which can be useful for certain use cases while maintaining relational database principles.

### Array Basics

- **Any data type** can be made into an array (INTEGER[], TEXT[], DATE[], etc.)
- Arrays can be **multidimensional** (though rarely used beyond 2D)
- Arrays are **1-indexed** (first element is [1], not [0])
- Arrays can contain **NULL elements**
- **Variable length** (no size limit required)
- Storage is efficient for small arrays

### When to Use Arrays

**Good use cases**:
- Storing tags, labels, or categories
- Phone numbers, email addresses (multiple per entity)
- Simple lists where order matters
- Avoiding joins for simple collections
- Denormalization for performance

**When NOT to use arrays**:
- Complex relationships (use proper foreign keys)
- When you need to query individual elements frequently
- When array elements need their own attributes
- Large collections (consider separate table)

### Array vs Separate Table

```
Array approach:
users: id | name | emails[]
1 | Alice | {alice@work.com, alice@personal.com}

Relational approach:
users: id | name
1 | Alice

user_emails: id | user_id | email
1 | 1 | alice@work.com
2 | 1 | alice@personal.com
```

### Performance Considerations

- **Small arrays**: Fast, efficient storage
- **Large arrays**: Consider separate table
- **Frequent element queries**: Use GIN index
- **Contains/overlap queries**: GIN index is essential

## Syntax

### Declaring Arrays

```sql
-- Array column declaration
CREATE TABLE example (
    id SERIAL PRIMARY KEY,
    tags TEXT[],                    -- Text array
    scores INTEGER[],               -- Integer array
    prices NUMERIC(10,2)[],         -- Numeric array
    matrix INTEGER[][]              -- 2D array
);

-- Array with size (not enforced, just documentation)
CREATE TABLE sized_arrays (
    fixed_array INTEGER[3]          -- Size not enforced!
);
```

### Array Literals

```sql
-- Array literal syntax
SELECT ARRAY[1, 2, 3, 4, 5];
SELECT '{1, 2, 3}'::INTEGER[];

-- Text arrays
SELECT ARRAY['apple', 'banana', 'cherry'];
SELECT '{"apple", "banana", "cherry"}'::TEXT[];

-- Empty array
SELECT ARRAY[]::INTEGER[];
SELECT '{}'::TEXT[];

-- NULL in array
SELECT ARRAY[1, NULL, 3];
```

### Array Construction

```sql
-- ARRAY constructor
SELECT ARRAY[1, 2, 3];

-- Array from subquery
SELECT ARRAY(SELECT id FROM users LIMIT 5);

-- String to array
SELECT STRING_TO_ARRAY('a,b,c', ',');
SELECT STRING_TO_ARRAY('a-b-c', '-');
```

## Examples

### Basic Array Operations

```sql
-- Create table with arrays
CREATE TABLE articles (
    article_id SERIAL PRIMARY KEY,
    title VARCHAR(200),
    tags TEXT[],
    view_counts INTEGER[],
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Insert with array literals
INSERT INTO articles (title, tags, view_counts)
VALUES
    ('PostgreSQL Arrays', ARRAY['postgresql', 'database', 'tutorial'], ARRAY[100, 150, 200]),
    ('Python Basics', ARRAY['python', 'programming', 'tutorial'], ARRAY[50, 75, 90]),
    ('Web Development', ARRAY['web', 'javascript', 'html', 'css'], ARRAY[80, 95, 110, 125]);

-- Insert with string literal
INSERT INTO articles (title, tags)
VALUES ('SQL Tips', '{"sql", "tips", "database"}');

-- Query arrays
SELECT title, tags FROM articles;

-- Access array elements (1-indexed!)
SELECT
    title,
    tags[1] AS first_tag,
    tags[2] AS second_tag,
    tags[array_length(tags, 1)] AS last_tag  -- Last element
FROM articles;

-- Array slicing
SELECT
    title,
    tags[1:2] AS first_two_tags,
    tags[2:4] AS middle_tags
FROM articles;
```

### Array Functions

```sql
-- array_length: Get array length
SELECT
    title,
    array_length(tags, 1) AS tag_count  -- 1 is dimension
FROM articles;

-- array_position: Find element position
SELECT
    title,
    array_position(tags, 'postgresql') AS postgres_position
FROM articles;

-- array_positions: Find all positions (duplicates)
SELECT array_positions(ARRAY[1, 2, 3, 2, 1], 2);  -- {2, 4}

-- array_append: Add element to end
SELECT
    title,
    array_append(tags, 'featured') AS updated_tags
FROM articles
WHERE article_id = 1;

-- array_prepend: Add element to beginning
SELECT array_prepend('new', ARRAY['old', 'older']);  -- {new, old, older}

-- array_cat: Concatenate arrays
SELECT array_cat(ARRAY[1, 2], ARRAY[3, 4]);  -- {1, 2, 3, 4}

-- array_remove: Remove all occurrences
SELECT array_remove(ARRAY[1, 2, 3, 2, 1], 2);  -- {1, 3, 1}

-- array_replace: Replace all occurrences
SELECT array_replace(ARRAY[1, 2, 3, 2], 2, 99);  -- {1, 99, 3, 99}

-- cardinality: Total number of elements (works with multidimensional)
SELECT cardinality(ARRAY[1, 2, 3]);  -- 3
SELECT cardinality(ARRAY[[1, 2], [3, 4]]);  -- 4
```

### Array Operators

```sql
-- Concatenation operator ||
SELECT ARRAY[1, 2] || ARRAY[3, 4];  -- {1, 2, 3, 4}
SELECT ARRAY[1, 2] || 3;            -- {1, 2, 3}
SELECT 0 || ARRAY[1, 2];            -- {0, 1, 2}

-- Update using concatenation
UPDATE articles
SET tags = tags || 'popular'
WHERE article_id = 1;

-- Contains @>
SELECT title
FROM articles
WHERE tags @> ARRAY['postgresql'];  -- Has 'postgresql'

SELECT title
FROM articles
WHERE tags @> ARRAY['postgresql', 'database'];  -- Has both

-- Contained by <@
SELECT ARRAY['a', 'b'] <@ ARRAY['a', 'b', 'c'];  -- true

-- Overlap &&
SELECT title
FROM articles
WHERE tags && ARRAY['python', 'javascript'];  -- Has any of these

-- Equality
SELECT ARRAY[1, 2, 3] = ARRAY[1, 2, 3];  -- true
SELECT ARRAY[1, 2, 3] = ARRAY[3, 2, 1];  -- false (order matters)
```

### ANY and ALL

```sql
-- ANY: Match any element
SELECT title
FROM articles
WHERE 'postgresql' = ANY(tags);

SELECT title
FROM articles
WHERE 'tutorial' = ANY(tags);

-- ALL: Match all elements
SELECT ARRAY[2, 4, 6] AS numbers
WHERE 2 = ALL(ARRAY[2, 2, 2]);  -- true

-- Comparison with ANY
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    prices NUMERIC(10, 2)[]  -- Historical prices
);

INSERT INTO products (name, prices)
VALUES
    ('Laptop', ARRAY[999.99, 899.99, 799.99]),
    ('Mouse', ARRAY[29.99, 24.99, 19.99]);

-- Products with any price > 800
SELECT name
FROM products
WHERE 800 < ANY(prices);

-- Products where all prices > 20
SELECT name
FROM products
WHERE 20 < ALL(prices);
```

### ARRAY_AGG and UNNEST

```sql
-- Create related tables
CREATE TABLE authors (
    author_id SERIAL PRIMARY KEY,
    name VARCHAR(100)
);

CREATE TABLE books (
    book_id SERIAL PRIMARY KEY,
    author_id INTEGER REFERENCES authors(author_id),
    title VARCHAR(200)
);

INSERT INTO authors (name) VALUES ('Alice'), ('Bob'), ('Carol');

INSERT INTO books (author_id, title) VALUES
    (1, 'Database Design'),
    (1, 'SQL Mastery'),
    (1, 'PostgreSQL Deep Dive'),
    (2, 'Python Programming'),
    (2, 'Web Development'),
    (3, 'JavaScript Essentials');

-- ARRAY_AGG: Aggregate values into array
SELECT
    a.name,
    ARRAY_AGG(b.title) AS books,
    ARRAY_AGG(b.title ORDER BY b.title) AS books_sorted
FROM authors a
LEFT JOIN books b ON a.author_id = b.author_id
GROUP BY a.author_id, a.name;

-- UNNEST: Expand array to rows
SELECT
    title,
    UNNEST(tags) AS individual_tag
FROM articles;

-- UNNEST with ordinality (includes position)
SELECT
    title,
    tag,
    tag_position
FROM articles,
     UNNEST(tags) WITH ORDINALITY AS t(tag, tag_position);

-- UNNEST multiple arrays together
SELECT
    UNNEST(ARRAY['a', 'b', 'c']) AS letter,
    UNNEST(ARRAY[1, 2, 3]) AS number;
```

### Array Aggregation Examples

```sql
-- Create sample data
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    product_name VARCHAR(100),
    quantity INTEGER
);

INSERT INTO orders (customer_id, product_name, quantity) VALUES
    (1, 'Laptop', 1),
    (1, 'Mouse', 2),
    (1, 'Keyboard', 1),
    (2, 'Monitor', 1),
    (2, 'Cable', 3);

-- Aggregate products per customer
SELECT
    customer_id,
    ARRAY_AGG(product_name) AS products,
    ARRAY_AGG(quantity) AS quantities,
    SUM(quantity) AS total_items
FROM orders
GROUP BY customer_id;

-- Aggregate with filtering
SELECT
    customer_id,
    ARRAY_AGG(product_name) FILTER (WHERE quantity > 1) AS multi_quantity_products
FROM orders
GROUP BY customer_id;

-- Array of distinct values
SELECT
    customer_id,
    ARRAY_AGG(DISTINCT product_name ORDER BY product_name) AS unique_products
FROM orders
GROUP BY customer_id;
```

### Multidimensional Arrays

```sql
-- Create 2D array
CREATE TABLE matrices (
    matrix_id SERIAL PRIMARY KEY,
    data INTEGER[][]
);

-- Insert 2D array
INSERT INTO matrices (data)
VALUES
    (ARRAY[[1, 2, 3], [4, 5, 6]]),
    (ARRAY[[10, 20], [30, 40], [50, 60]]);

-- Access elements
SELECT
    data[1][1] AS top_left,
    data[1][2] AS top_middle,
    data[2][1] AS bottom_left
FROM matrices
WHERE matrix_id = 1;

-- Get dimensions
SELECT
    array_length(data, 1) AS rows,
    array_length(data, 2) AS cols
FROM matrices;

-- Note: Multidimensional arrays are rarely used in practice
-- Consider JSONB or separate tables for complex structures
```

### Indexing Arrays with GIN

```sql
-- Create GIN index for array containment queries
CREATE INDEX idx_articles_tags ON articles USING GIN (tags);

-- Now these queries use the index
EXPLAIN ANALYZE
SELECT title FROM articles WHERE tags @> ARRAY['postgresql'];

EXPLAIN ANALYZE
SELECT title FROM articles WHERE tags && ARRAY['python', 'javascript'];

-- Index for array elements
CREATE INDEX idx_articles_tags_elements ON articles USING GIN (tags array_ops);

-- Example: Search for specific tag
SELECT title
FROM articles
WHERE 'postgresql' = ANY(tags);
```

### Practical Application: Tagging System

```sql
-- Create comprehensive tagging system
CREATE TABLE blog_posts (
    post_id SERIAL PRIMARY KEY,
    title VARCHAR(200),
    content TEXT,
    tags TEXT[],
    category_ids INTEGER[],
    related_post_ids INTEGER[],
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(50)
);

-- Create indexes
CREATE INDEX idx_blog_tags ON blog_posts USING GIN (tags);
CREATE INDEX idx_blog_categories ON blog_posts USING GIN (category_ids);

-- Insert categories
INSERT INTO categories (category_name) VALUES
    ('Technology'), ('Programming'), ('Database'), ('Web Development');

-- Insert blog posts
INSERT INTO blog_posts (title, content, tags, category_ids, related_post_ids)
VALUES
    ('PostgreSQL Array Types',
     'Detailed guide on PostgreSQL arrays...',
     ARRAY['postgresql', 'arrays', 'data-types', 'advanced'],
     ARRAY[1, 2, 3],
     ARRAY[]::INTEGER[]),
    ('Python Lists vs PostgreSQL Arrays',
     'Comparison between Python lists and PostgreSQL arrays...',
     ARRAY['python', 'postgresql', 'comparison'],
     ARRAY[1, 2],
     ARRAY[1]),
    ('Building Web Apps',
     'Modern web application development...',
     ARRAY['web', 'javascript', 'react', 'nodejs'],
     ARRAY[1, 4],
     ARRAY[]::INTEGER[]);

-- Search by single tag
SELECT title, tags
FROM blog_posts
WHERE tags @> ARRAY['postgresql'];

-- Search by multiple tags (AND)
SELECT title, tags
FROM blog_posts
WHERE tags @> ARRAY['postgresql', 'arrays'];

-- Search by any tag (OR)
SELECT title, tags
FROM blog_posts
WHERE tags && ARRAY['python', 'javascript'];

-- Count posts by tag
SELECT
    tag,
    COUNT(*) AS post_count
FROM blog_posts,
     UNNEST(tags) AS tag
GROUP BY tag
ORDER BY post_count DESC;

-- Posts with categories
SELECT
    p.title,
    ARRAY_AGG(c.category_name) AS categories
FROM blog_posts p
JOIN categories c ON c.category_id = ANY(p.category_ids)
GROUP BY p.post_id, p.title;

-- Add tag to post
UPDATE blog_posts
SET tags = array_append(tags, 'tutorial')
WHERE post_id = 1;

-- Remove tag from post
UPDATE blog_posts
SET tags = array_remove(tags, 'tutorial')
WHERE post_id = 1;

-- Related posts query
SELECT
    p1.title AS post,
    p2.title AS related_post
FROM blog_posts p1
JOIN blog_posts p2 ON p2.post_id = ANY(p1.related_post_ids)
WHERE p1.post_id = 2;

-- Tag cloud (all unique tags with counts)
SELECT
    tag,
    COUNT(*) AS frequency
FROM (
    SELECT UNNEST(tags) AS tag
    FROM blog_posts
) AS all_tags
GROUP BY tag
ORDER BY frequency DESC, tag;
```

### Array of Composite Types

```sql
-- Create composite type
CREATE TYPE contact_info AS (
    type VARCHAR(20),
    value VARCHAR(100)
);

-- Use array of composite types
CREATE TABLE persons (
    person_id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    contacts contact_info[]
);

-- Insert data
INSERT INTO persons (name, contacts)
VALUES
    ('Alice', ARRAY[
        ROW('email', 'alice@work.com')::contact_info,
        ROW('email', 'alice@personal.com')::contact_info,
        ROW('phone', '+1-555-0100')::contact_info
    ]),
    ('Bob', ARRAY[
        ROW('email', 'bob@example.com')::contact_info,
        ROW('phone', '+1-555-0200')::contact_info
    ]);

-- Query composite array
SELECT
    name,
    (UNNEST(contacts)).*
FROM persons;

-- Filter by composite field
SELECT name
FROM persons
WHERE EXISTS (
    SELECT 1
    FROM UNNEST(contacts) AS c
    WHERE c.type = 'email'
      AND c.value LIKE '%work%'
);
```

## Common Mistakes

### 1. Forgetting Arrays are 1-Indexed

```sql
-- MISTAKE: Using 0-based indexing
SELECT tags[0] FROM articles;  -- Returns NULL (no element at 0)

-- CORRECT: Use 1-based indexing
SELECT tags[1] FROM articles;  -- First element
```

### 2. Not Using GIN Index

```sql
-- MISTAKE: Querying arrays without index
SELECT * FROM articles WHERE 'postgresql' = ANY(tags);  -- Slow on large tables

-- BETTER: Create GIN index
CREATE INDEX idx_tags ON articles USING GIN (tags);
```

### 3. Using Arrays Instead of Proper Normalization

```sql
-- MISTAKE: Storing complex related data in arrays
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    items TEXT[],  -- Product names
    quantities INTEGER[],
    prices NUMERIC[]
);

-- BETTER: Use proper foreign keys
CREATE TABLE order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(order_id),
    product_id INTEGER REFERENCES products(product_id),
    quantity INTEGER,
    price NUMERIC
);
```

### 4. Comparing Arrays Without Considering Order

```sql
-- MISTAKE: Expecting unordered comparison
SELECT ARRAY[1, 2, 3] = ARRAY[3, 2, 1];  -- false (order matters)

-- If you need unordered comparison, sort first
SELECT
    ARRAY(SELECT UNNEST(ARRAY[1, 2, 3]) ORDER BY 1) =
    ARRAY(SELECT UNNEST(ARRAY[3, 2, 1]) ORDER BY 1);  -- true
```

### 5. Not Handling Empty Arrays

```sql
-- MISTAKE: Not checking for empty arrays
SELECT array_length(ARRAY[]::INTEGER[], 1);  -- Returns NULL, not 0!

-- BETTER: Use COALESCE
SELECT COALESCE(array_length(tags, 1), 0) AS tag_count FROM articles;

-- OR: Use cardinality (returns 0 for empty)
SELECT cardinality(tags) AS tag_count FROM articles;
```

### 6. Mixing NULLs and Arrays

```sql
-- MISTAKE: Confusion between NULL array and empty array
INSERT INTO articles (tags) VALUES (NULL);  -- NULL array
INSERT INTO articles (tags) VALUES (ARRAY[]::TEXT[]);  -- Empty array

-- Check for NULL vs empty
SELECT
    tags IS NULL AS is_null,
    tags = ARRAY[]::TEXT[] AS is_empty,
    COALESCE(cardinality(tags), 0) AS element_count
FROM articles;
```

## Best Practices

### 1. Use Arrays for Simple Collections

```sql
-- Good use case: tags, labels
CREATE TABLE items (
    item_id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    tags TEXT[]
);
```

### 2. Always Create GIN Index for Queries

```sql
-- Essential for array queries
CREATE INDEX idx_array_column ON table_name USING GIN (array_column);
```

### 3. Use ARRAY_AGG for Aggregation

```sql
-- Efficient aggregation
SELECT
    category,
    ARRAY_AGG(product_name ORDER BY product_name) AS products
FROM products
GROUP BY category;
```

### 4. Validate Array Length

```sql
-- Add constraints for array size
ALTER TABLE limited_items
ADD CONSTRAINT check_tags_limit
CHECK (cardinality(tags) <= 10);
```

### 5. Use UNNEST for Set Operations

```sql
-- Expand arrays for analysis
SELECT DISTINCT UNNEST(tags) AS unique_tags
FROM articles
ORDER BY unique_tags;
```

### 6. Consider JSONB for Complex Structures

```sql
-- Arrays for simple lists
CREATE TABLE simple (
    tags TEXT[]
);

-- JSONB for complex nested structures
CREATE TABLE complex (
    metadata JSONB
);
```

## Practice Exercises

### Exercise 1: Social Media Tags

Create a social media post system with tags and hashtags:

Requirements:
1. Create posts table with tags array
2. Insert posts with various tags
3. Find posts by single tag, multiple tags, any tag
4. Generate tag cloud with frequencies
5. Find related posts (posts sharing tags)

<details>
<summary>Solution</summary>

```sql
-- Create posts table
CREATE TABLE social_posts (
    post_id SERIAL PRIMARY KEY,
    author VARCHAR(100),
    content TEXT,
    hashtags TEXT[],
    mentions TEXT[],
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create GIN index
CREATE INDEX idx_hashtags ON social_posts USING GIN (hashtags);
CREATE INDEX idx_mentions ON social_posts USING GIN (mentions);

-- Insert sample posts
INSERT INTO social_posts (author, content, hashtags, mentions) VALUES
('alice', 'Learning PostgreSQL arrays! #database #postgresql',
 ARRAY['database', 'postgresql', 'learning'], ARRAY[]::TEXT[]),
('bob', 'Great tutorial on PostgreSQL by @alice #postgresql #tutorial',
 ARRAY['postgresql', 'tutorial'], ARRAY['alice']),
('charlie', 'Arrays vs JSONB comparison #postgresql #database #performance',
 ARRAY['postgresql', 'database', 'performance'], ARRAY[]::TEXT[]),
('alice', 'Web development tips #webdev #javascript #frontend',
 ARRAY['webdev', 'javascript', 'frontend'], ARRAY[]::TEXT[]),
('bob', 'Shoutout to @alice and @charlie for great content! #community',
 ARRAY['community'], ARRAY['alice', 'charlie']);

-- Find posts by single tag
SELECT author, content, hashtags
FROM social_posts
WHERE hashtags @> ARRAY['postgresql'];

-- Find posts with multiple tags (AND)
SELECT author, content
FROM social_posts
WHERE hashtags @> ARRAY['postgresql', 'database'];

-- Find posts with any tag (OR)
SELECT author, content, hashtags
FROM social_posts
WHERE hashtags && ARRAY['webdev', 'javascript', 'frontend'];

-- Tag cloud (frequency count)
SELECT
    hashtag,
    COUNT(*) AS frequency
FROM social_posts,
     UNNEST(hashtags) AS hashtag
GROUP BY hashtag
ORDER BY frequency DESC, hashtag;

-- Posts mentioning specific user
SELECT author, content
FROM social_posts
WHERE 'alice' = ANY(mentions);

-- Related posts (sharing at least one hashtag)
SELECT DISTINCT
    p1.post_id,
    p1.author,
    p1.content,
    p2.post_id AS related_post_id,
    p2.author AS related_author
FROM social_posts p1
JOIN social_posts p2
  ON p1.post_id != p2.post_id
  AND p1.hashtags && p2.hashtags
WHERE p1.post_id = 1
ORDER BY p1.post_id;

-- Most active taggers
SELECT
    author,
    COUNT(*) AS post_count,
    SUM(cardinality(hashtags)) AS total_tags,
    AVG(cardinality(hashtags))::NUMERIC(10,2) AS avg_tags_per_post
FROM social_posts
GROUP BY author
ORDER BY total_tags DESC;
```

</details>

### Exercise 2: Product Inventory with Multiple Locations

Create inventory system tracking products across warehouses:

Requirements:
1. Store available sizes, colors as arrays
2. Track warehouse location IDs in array
3. Query products by availability criteria
4. Find products available in specific warehouses
5. Aggregate inventory data

<details>
<summary>Solution</summary>

```sql
-- Create tables
CREATE TABLE warehouses (
    warehouse_id SERIAL PRIMARY KEY,
    warehouse_name VARCHAR(100),
    location VARCHAR(100)
);

CREATE TABLE inventory_items (
    item_id SERIAL PRIMARY KEY,
    product_name VARCHAR(200),
    sku VARCHAR(50) UNIQUE,
    available_sizes TEXT[],
    available_colors TEXT[],
    warehouse_ids INTEGER[],
    prices_history NUMERIC(10,2)[],
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_sizes ON inventory_items USING GIN (available_sizes);
CREATE INDEX idx_colors ON inventory_items USING GIN (available_colors);
CREATE INDEX idx_warehouses ON inventory_items USING GIN (warehouse_ids);

-- Insert warehouses
INSERT INTO warehouses (warehouse_name, location) VALUES
('East Coast DC', 'New York'),
('West Coast DC', 'Los Angeles'),
('Central DC', 'Chicago'),
('South DC', 'Houston');

-- Insert inventory
INSERT INTO inventory_items (product_name, sku, available_sizes, available_colors, warehouse_ids, prices_history)
VALUES
('T-Shirt Classic', 'TSHIRT-001',
 ARRAY['S', 'M', 'L', 'XL'],
 ARRAY['black', 'white', 'blue', 'red'],
 ARRAY[1, 2, 3, 4],
 ARRAY[19.99, 24.99, 22.99]),
('Jeans Slim Fit', 'JEANS-001',
 ARRAY['28', '30', '32', '34', '36'],
 ARRAY['blue', 'black'],
 ARRAY[1, 3],
 ARRAY[49.99, 59.99, 54.99]),
('Sneakers Pro', 'SHOES-001',
 ARRAY['7', '8', '9', '10', '11'],
 ARRAY['white', 'black'],
 ARRAY[2, 4],
 ARRAY[89.99, 99.99, 94.99]);

-- Products available in size 'L' or 'XL'
SELECT product_name, available_sizes
FROM inventory_items
WHERE available_sizes && ARRAY['L', 'XL'];

-- Products available in black
SELECT product_name, available_colors
FROM inventory_items
WHERE available_colors @> ARRAY['black'];

-- Products in specific warehouse
SELECT product_name, warehouse_ids
FROM inventory_items
WHERE warehouse_ids @> ARRAY[1];

-- Products available on both coasts (warehouses 1 and 2)
SELECT product_name
FROM inventory_items
WHERE warehouse_ids @> ARRAY[1, 2];

-- All unique sizes across inventory
SELECT DISTINCT UNNEST(available_sizes) AS size
FROM inventory_items
ORDER BY size;

-- Products by warehouse
SELECT
    w.warehouse_name,
    ARRAY_AGG(i.product_name ORDER BY i.product_name) AS products,
    COUNT(*) AS product_count
FROM inventory_items i
JOIN warehouses w ON w.warehouse_id = ANY(i.warehouse_ids)
GROUP BY w.warehouse_id, w.warehouse_name
ORDER BY product_count DESC;

-- Price analysis
SELECT
    product_name,
    prices_history,
    prices_history[array_length(prices_history, 1)] AS current_price,
    prices_history[1] AS original_price,
    ROUND(
        (prices_history[array_length(prices_history, 1)] - prices_history[1]) / prices_history[1] * 100,
        2
    ) AS price_change_percent
FROM inventory_items;

-- Products with most size options
SELECT
    product_name,
    cardinality(available_sizes) AS size_count,
    available_sizes
FROM inventory_items
ORDER BY size_count DESC;
```

</details>

### Exercise 3: Course Prerequisites System

Create course management with prerequisites:

Requirements:
1. Store prerequisite course IDs in array
2. Store learning outcomes as array
3. Find courses without prerequisites
4. Find courses requiring specific prerequisites
5. Build prerequisite tree/path

<details>
<summary>Solution</summary>

```sql
-- Create courses table
CREATE TABLE courses (
    course_id SERIAL PRIMARY KEY,
    course_code VARCHAR(20) UNIQUE,
    course_name VARCHAR(200),
    prerequisite_ids INTEGER[],
    learning_outcomes TEXT[],
    tags TEXT[]
);

-- Create index
CREATE INDEX idx_prerequisites ON courses USING GIN (prerequisite_ids);
CREATE INDEX idx_tags ON courses USING GIN (tags);

-- Insert courses
INSERT INTO courses (course_code, course_name, prerequisite_ids, learning_outcomes, tags) VALUES
('CS101', 'Introduction to Programming',
 ARRAY[]::INTEGER[],
 ARRAY['Basic syntax', 'Variables and data types', 'Control structures'],
 ARRAY['beginner', 'programming', 'fundamentals']),
('CS102', 'Data Structures',
 ARRAY[1],
 ARRAY['Arrays and lists', 'Trees and graphs', 'Algorithm complexity'],
 ARRAY['intermediate', 'programming', 'algorithms']),
('CS201', 'Algorithms',
 ARRAY[1, 2],
 ARRAY['Sorting algorithms', 'Search algorithms', 'Dynamic programming'],
 ARRAY['intermediate', 'algorithms', 'optimization']),
('CS301', 'Database Systems',
 ARRAY[1],
 ARRAY['SQL queries', 'Database design', 'Transactions'],
 ARRAY['intermediate', 'databases', 'sql']),
('CS401', 'Advanced Databases',
 ARRAY[4],
 ARRAY['Query optimization', 'Distributed databases', 'NoSQL'],
 ARRAY['advanced', 'databases', 'performance']);

-- Courses without prerequisites (entry-level)
SELECT course_code, course_name
FROM courses
WHERE cardinality(prerequisite_ids) = 0;

-- Courses requiring specific course
SELECT course_code, course_name
FROM courses
WHERE prerequisite_ids @> ARRAY[1];

-- Courses requiring CS101 OR CS102
SELECT course_code, course_name
FROM courses
WHERE prerequisite_ids && ARRAY[1, 2];

-- All learning outcomes
SELECT DISTINCT UNNEST(learning_outcomes) AS learning_outcome
FROM courses
ORDER BY learning_outcome;

-- Learning outcomes per course
SELECT
    course_code,
    cardinality(learning_outcomes) AS outcome_count,
    learning_outcomes
FROM courses
ORDER BY outcome_count DESC;

-- Prerequisites tree
SELECT
    c.course_code,
    c.course_name,
    ARRAY_AGG(p.course_code ORDER BY p.course_code) AS prerequisite_courses
FROM courses c
LEFT JOIN courses p ON p.course_id = ANY(c.prerequisite_ids)
GROUP BY c.course_id, c.course_code, c.course_name
ORDER BY c.course_id;

-- Courses by tag
SELECT
    tag,
    ARRAY_AGG(course_code ORDER BY course_code) AS courses,
    COUNT(*) AS course_count
FROM courses,
     UNNEST(tags) AS tag
GROUP BY tag
ORDER BY course_count DESC;

-- Study path (all prerequisites for a course)
WITH RECURSIVE course_tree AS (
    -- Base case: target course
    SELECT course_id, course_code, prerequisite_ids, 0 AS level
    FROM courses
    WHERE course_code = 'CS401'

    UNION ALL

    -- Recursive case: prerequisites
    SELECT c.course_id, c.course_code, c.prerequisite_ids, ct.level + 1
    FROM courses c
    JOIN course_tree ct ON c.course_id = ANY(ct.prerequisite_ids)
)
SELECT DISTINCT course_code, level
FROM course_tree
ORDER BY level DESC, course_code;
```

</details>

## Related Topics

- [JSON and JSONB](05-json-jsonb.md) - Alternative for complex nested structures
- [Text Types](02-text-types.md) - TEXT[] is common array type
- [Numeric Types](01-numeric-types.md) - INTEGER[] for numeric arrays

## Additional Resources

- PostgreSQL Documentation: [Array Types](https://www.postgresql.org/docs/16/arrays.html)
- PostgreSQL Documentation: [Array Functions](https://www.postgresql.org/docs/16/functions-array.html)
- PostgreSQL Documentation: [GIN Indexes](https://www.postgresql.org/docs/16/gin-intro.html)
