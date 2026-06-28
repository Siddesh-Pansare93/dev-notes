# Text Types

## Theory

PostgreSQL provides several character and text data types for storing strings. Understanding the differences between these types is crucial for optimal database design, though in PostgreSQL the performance differences are minimal.

### Text Type Categories

1. **CHAR(n) / CHARACTER(n)**: Fixed-length character string
   - Always uses exactly n characters (space-padded)
   - Storage: n bytes (plus overhead if > 126 bytes)
   - Rarely used in modern PostgreSQL

2. **VARCHAR(n) / CHARACTER VARYING(n)**: Variable-length character string with limit
   - Stores up to n characters
   - Storage: actual string length + 1 or 4 bytes overhead
   - Common for constrained fields

3. **TEXT**: Variable-length character string (unlimited)
   - No length limit (up to ~1GB)
   - Storage: actual string length + 1 or 4 bytes overhead
   - **Performance: Identical to VARCHAR** in PostgreSQL

### Important PostgreSQL Specifics

Unlike many databases, PostgreSQL's TEXT type has **no performance penalty** compared to VARCHAR. The choice between VARCHAR(n) and TEXT is primarily about validation:
- Use VARCHAR(n) when you want database-level length enforcement
- Use TEXT when the application handles validation

### Storage Details

- Strings up to 126 bytes: 1 byte overhead
- Strings > 126 bytes: 4 bytes overhead
- Very long strings (>~2KB) may be compressed automatically (TOAST)
- Actual characters stored (except CHAR which pads with spaces)

### Character Sets and Collation

PostgreSQL databases have:
- **Encoding**: Character set (UTF-8, LATIN1, etc.)
- **Collation**: Sorting and comparison rules (en_US, C, POSIX)
- Collation affects ORDER BY, comparison operators, and indexes

## Syntax

### Basic Type Definitions

```sql
-- Fixed-length (avoid unless specifically needed)
CREATE TABLE example1 (
    code CHAR(5),              -- Always 5 characters
    country_code CHARACTER(2)  -- Always 2 characters
);

-- Variable-length with limit
CREATE TABLE example2 (
    username VARCHAR(50),      -- Up to 50 characters
    email CHARACTER VARYING(255)
);

-- Unlimited text
CREATE TABLE example3 (
    description TEXT,
    content TEXT
);
```

### Collation

```sql
-- Table-level collation
CREATE TABLE names (
    id SERIAL PRIMARY KEY,
    name TEXT COLLATE "en_US"
);

-- Column-level collation
CREATE TABLE multilingual (
    english_name TEXT COLLATE "en_US",
    french_name TEXT COLLATE "fr_FR",
    german_name TEXT COLLATE "de_DE"
);

-- Query with specific collation
SELECT * FROM users
ORDER BY name COLLATE "C";  -- C collation (byte order, fastest)
```

### String Literals

```sql
-- Standard string literals
SELECT 'Hello, World!';
SELECT 'It''s a string';  -- Escape single quote with double quote

-- Dollar-quoted strings (useful for complex text)
SELECT $$It's easier with dollar quotes$$;
SELECT $tag$Multi-line
text with 'quotes' and "quotes"$tag$;

-- Escape string literals (E prefix)
SELECT E'Line 1\nLine 2\tTabbed';
```

## Examples

### CHAR vs VARCHAR vs TEXT

```sql
-- Create comparison table
CREATE TABLE text_comparison (
    id SERIAL PRIMARY KEY,
    char_col CHAR(10),
    varchar_col VARCHAR(10),
    text_col TEXT
);

-- Insert same data
INSERT INTO text_comparison (char_col, varchar_col, text_col)
VALUES ('Hello', 'Hello', 'Hello');

-- Check actual storage (length and octet_length)
SELECT
    char_col,
    varchar_col,
    text_col,
    LENGTH(char_col) AS char_len,
    LENGTH(varchar_col) AS varchar_len,
    LENGTH(text_col) AS text_len,
    OCTET_LENGTH(char_col) AS char_bytes,
    OCTET_LENGTH(varchar_col) AS varchar_bytes,
    OCTET_LENGTH(text_col) AS text_bytes
FROM text_comparison;

-- CHAR pads with spaces
SELECT
    char_col = 'Hello' AS char_equals,      -- true (trailing spaces ignored)
    char_col = 'Hello     ' AS char_padded, -- true
    varchar_col = 'Hello' AS varchar_equals, -- true
    varchar_col = 'Hello     ' AS varchar_padded -- false
FROM text_comparison;

-- Demonstrate CHAR space padding
INSERT INTO text_comparison (char_col) VALUES ('ABC');
SELECT CONCAT('[', char_col, ']') AS char_with_brackets FROM text_comparison;
```

### String Functions Overview

```sql
-- Sample data
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email VARCHAR(100),
    bio TEXT
);

INSERT INTO users (first_name, last_name, email, bio)
VALUES
    ('John', 'Doe', 'john.doe@example.com', 'Software developer from New York'),
    ('Jane', 'Smith', 'JANE.SMITH@EXAMPLE.COM', 'Data scientist passionate about ML'),
    ('Bob', 'Johnson', 'bob@company.org', 'Product manager with 10 years experience');

-- Length functions
SELECT
    first_name,
    LENGTH(first_name) AS char_length,
    CHAR_LENGTH(first_name) AS char_length2,  -- Same as LENGTH
    OCTET_LENGTH(first_name) AS byte_length
FROM users;

-- Case conversion
SELECT
    email,
    LOWER(email) AS lowercase,
    UPPER(email) AS uppercase,
    INITCAP(email) AS initcap
FROM users;

-- Concatenation
SELECT
    first_name || ' ' || last_name AS full_name,
    CONCAT(first_name, ' ', last_name) AS full_name2,
    CONCAT_WS(' ', first_name, last_name) AS full_name3  -- With separator
FROM users;

-- Trimming
SELECT
    '  spaces  ' AS original,
    LTRIM('  spaces  ') AS left_trimmed,
    RTRIM('  spaces  ') AS right_trimmed,
    TRIM('  spaces  ') AS both_trimmed,
    TRIM(BOTH 'x' FROM 'xxxHelloxxx') AS custom_trim;

-- Substring operations
SELECT
    email,
    SUBSTRING(email FROM 1 FOR 4) AS first_4,
    SUBSTRING(email FROM POSITION('@' IN email) + 1) AS domain,
    LEFT(email, 4) AS left_4,
    RIGHT(email, 4) AS right_4
FROM users;

-- Position and search
SELECT
    email,
    POSITION('@' IN email) AS at_position,
    STRPOS(email, '@') AS at_position2  -- Same as POSITION
FROM users;

-- Replace
SELECT
    email,
    REPLACE(email, '.com', '.org') AS replaced,
    TRANSLATE(email, 'aeiou', '12345') AS translated  -- Character mapping
FROM users;

-- Padding
SELECT
    first_name,
    LPAD(first_name, 10, '*') AS left_padded,
    RPAD(first_name, 10, '*') AS right_padded
FROM users;

-- Repeat and reverse
SELECT
    first_name,
    REPEAT(first_name, 3) AS repeated,
    REVERSE(first_name) AS reversed
FROM users;
```

### Pattern Matching Introduction

```sql
-- LIKE operator (case-sensitive)
SELECT first_name, last_name
FROM users
WHERE email LIKE '%@example.com';

SELECT first_name
FROM users
WHERE first_name LIKE 'J%';  -- Starts with J

SELECT first_name
FROM users
WHERE first_name LIKE '%n';  -- Ends with n

SELECT first_name
FROM users
WHERE first_name LIKE '_o%';  -- Second letter is 'o'

-- ILIKE operator (case-insensitive, PostgreSQL-specific)
SELECT email
FROM users
WHERE email ILIKE '%EXAMPLE%';

-- SIMILAR TO (SQL standard regex-like)
SELECT email
FROM users
WHERE email SIMILAR TO '%@(example|company)%';

-- Regular expressions (POSIX)
SELECT email
FROM users
WHERE email ~ '@example\.com$';  -- ~ is case-sensitive

SELECT email
FROM users
WHERE email ~* '@EXAMPLE\.COM$';  -- ~* is case-insensitive

-- Pattern matching with multiple conditions
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    sku VARCHAR(20),
    name TEXT
);

INSERT INTO products (sku, name) VALUES
    ('LAP-001', 'Laptop Pro 15"'),
    ('LAP-002', 'Laptop Air 13"'),
    ('MOU-001', 'Wireless Mouse'),
    ('KEY-001', 'Mechanical Keyboard');

SELECT name
FROM products
WHERE sku LIKE 'LAP-%'
   OR name ILIKE '%laptop%';
```

### Collation Examples

```sql
-- Create table with different collations
CREATE TABLE sorted_names (
    id SERIAL PRIMARY KEY,
    name_c TEXT COLLATE "C",
    name_default TEXT
);

INSERT INTO sorted_names (name_c, name_default)
VALUES
    ('Ångström', 'Ångström'),
    ('Apple', 'Apple'),
    ('Zebra', 'Zebra'),
    ('café', 'café'),
    ('Banana', 'Banana');

-- Different sort orders
SELECT name_c FROM sorted_names ORDER BY name_c;  -- Byte order
SELECT name_default FROM sorted_names ORDER BY name_default;  -- Locale-aware

-- Comparison with collation
SELECT
    'a' = 'A' AS default_comparison,
    'a' COLLATE "C" = 'A' COLLATE "C" AS c_collation,
    'café' = 'cafe' AS accent_sensitive;

-- Show database encoding and collation
SELECT
    pg_encoding_to_char(encoding) AS encoding,
    datcollate AS collation,
    datctype AS ctype
FROM pg_database
WHERE datname = current_database();
```

### Full-Text Search Preview

```sql
-- Basic text search (full coverage in advanced topics)
CREATE TABLE articles (
    article_id SERIAL PRIMARY KEY,
    title TEXT,
    content TEXT,
    search_vector tsvector
);

INSERT INTO articles (title, content) VALUES
    ('PostgreSQL Basics', 'Learn the fundamentals of PostgreSQL database'),
    ('Advanced SQL', 'Deep dive into complex SQL queries and optimization'),
    ('Python Programming', 'Introduction to Python programming language');

-- Simple text search
SELECT title
FROM articles
WHERE content ILIKE '%PostgreSQL%';

-- Using text search (more efficient for large datasets)
UPDATE articles
SET search_vector = to_tsvector('english', title || ' ' || content);

SELECT title
FROM articles
WHERE search_vector @@ to_tsquery('english', 'PostgreSQL');
```

### Practical Application: User Management

```sql
-- Comprehensive user management system
CREATE TABLE app_users (
    user_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username VARCHAR(30) UNIQUE NOT NULL CHECK (LENGTH(username) >= 3),
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    display_name TEXT,
    bio TEXT,
    website VARCHAR(200),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Add constraint for email validation
ALTER TABLE app_users
ADD CONSTRAINT valid_email
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$');

-- Insert sample users
INSERT INTO app_users (username, email, first_name, last_name, bio)
VALUES
    ('johndoe', 'john.doe@example.com', 'John', 'Doe', 'Passionate about technology and innovation'),
    ('janesmith', 'jane.smith@example.com', 'Jane', 'Smith', 'Data scientist | ML enthusiast'),
    ('bobdev', 'bob@devcompany.io', 'Bob', 'Johnson', 'Building the future, one line of code at a time');

-- Generate display names
UPDATE app_users
SET display_name = first_name || ' ' || last_name
WHERE display_name IS NULL;

-- Search users
SELECT username, email, display_name
FROM app_users
WHERE display_name ILIKE '%smith%'
   OR bio ILIKE '%data%';

-- Extract domain from email
SELECT
    username,
    email,
    SUBSTRING(email FROM POSITION('@' IN email) + 1) AS email_domain
FROM app_users;

-- Format user profiles
SELECT
    UPPER(username) AS username_upper,
    INITCAP(display_name) AS formatted_name,
    LEFT(bio, 50) || '...' AS bio_preview
FROM app_users;
```

### String Aggregation

```sql
-- Sample data: tags for articles
CREATE TABLE tags (
    tag_id SERIAL PRIMARY KEY,
    article_id INTEGER,
    tag_name VARCHAR(50)
);

INSERT INTO tags (article_id, tag_name) VALUES
    (1, 'database'),
    (1, 'postgresql'),
    (1, 'sql'),
    (2, 'sql'),
    (2, 'optimization'),
    (2, 'performance'),
    (3, 'programming'),
    (3, 'python'),
    (3, 'tutorial');

-- Aggregate tags into single string
SELECT
    article_id,
    STRING_AGG(tag_name, ', ' ORDER BY tag_name) AS all_tags
FROM tags
GROUP BY article_id;

-- With custom formatting
SELECT
    article_id,
    '#' || STRING_AGG(tag_name, ' #' ORDER BY tag_name) AS hashtags
FROM tags
GROUP BY article_id;
```

### Advanced String Manipulation

```sql
-- Create table for demonstrations
CREATE TABLE text_demo (
    id SERIAL PRIMARY KEY,
    data TEXT
);

INSERT INTO text_demo (data) VALUES
    ('  PostgreSQL  is  awesome  '),
    ('Multiple    spaces    here'),
    ('Email: contact@example.com'),
    ('Phone: (555) 123-4567');

-- Clean up multiple spaces
SELECT
    data AS original,
    REGEXP_REPLACE(data, '\s+', ' ', 'g') AS cleaned,
    TRIM(REGEXP_REPLACE(data, '\s+', ' ', 'g')) AS trimmed_cleaned
FROM text_demo;

-- Extract patterns
SELECT
    data,
    (REGEXP_MATCHES(data, '([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})', 'i'))[1] AS email,
    (REGEXP_MATCHES(data, '\((\d{3})\)\s*(\d{3})-(\d{4})'))[1] AS area_code
FROM text_demo;

-- Split strings into arrays (advanced)
SELECT
    'a,b,c,d'::TEXT AS original,
    STRING_TO_ARRAY('a,b,c,d', ',') AS string_array;

-- Join arrays back
SELECT ARRAY_TO_STRING(ARRAY['a', 'b', 'c'], ', ') AS joined;
```

## Common Mistakes

### 1. Using CHAR When Not Needed

```sql
-- MISTAKE: Using CHAR for variable-length data
CREATE TABLE users_bad (
    username CHAR(50)  -- Wastes space, adds trailing spaces
);

-- BETTER: Use VARCHAR or TEXT
CREATE TABLE users_good (
    username VARCHAR(50)  -- Or TEXT
);
```

### 2. Arbitrary VARCHAR Limits

```sql
-- MISTAKE: Random VARCHAR limits without reason
CREATE TABLE articles_bad (
    title VARCHAR(200),   -- Why 200? Why not 199 or 201?
    content VARCHAR(5000) -- Why not TEXT?
);

-- BETTER: Use meaningful limits or TEXT
CREATE TABLE articles_good (
    title VARCHAR(200),   -- Business rule: titles must be < 200 chars
    content TEXT          -- No arbitrary limit
);
```

### 3. Forgetting Case Sensitivity

```sql
-- MISTAKE: Case-sensitive search
SELECT * FROM users WHERE email = 'JOHN@EXAMPLE.COM';  -- Might miss john@example.com

-- BETTER: Use LOWER/UPPER or ILIKE
SELECT * FROM users WHERE LOWER(email) = LOWER('JOHN@EXAMPLE.COM');
SELECT * FROM users WHERE email ILIKE 'JOHN@EXAMPLE.COM';
```

### 4. Inefficient Pattern Matching

```sql
-- MISTAKE: Leading wildcard prevents index usage
SELECT * FROM users WHERE email LIKE '%@example.com';  -- Can't use index

-- BETTER: Trailing wildcard can use index
SELECT * FROM users WHERE email LIKE 'john%';  -- Can use index

-- OR: Use specialized index for pattern matching
CREATE INDEX idx_email_pattern ON users USING gin (email gin_trgm_ops);
-- Requires: CREATE EXTENSION pg_trgm;
```

### 5. Not Handling NULL in Concatenation

```sql
-- MISTAKE: Concatenation with NULL returns NULL
SELECT first_name || ' ' || last_name AS full_name
FROM users;  -- Returns NULL if either is NULL

-- BETTER: Use CONCAT or COALESCE
SELECT CONCAT(first_name, ' ', last_name) AS full_name FROM users;
SELECT COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') AS full_name FROM users;
```

### 6. Improper Escaping

```sql
-- MISTAKE: Not escaping single quotes
-- INSERT INTO users (name) VALUES ('O'Reilly');  -- Syntax error

-- BETTER: Escape with double single quote
INSERT INTO users (name) VALUES ('O''Reilly');

-- OR: Use dollar quoting
INSERT INTO users (name) VALUES ($$O'Reilly$$);
```

## Best Practices

### 1. Choose TEXT Over VARCHAR for Most Cases

```sql
-- Modern PostgreSQL best practice
CREATE TABLE content (
    title TEXT,        -- No arbitrary limit
    body TEXT,         -- Let application validate
    excerpt TEXT
);

-- Use VARCHAR only when there's a real business constraint
CREATE TABLE usernames (
    username VARCHAR(30) CHECK (LENGTH(username) >= 3)  -- Business rule
);
```

### 2. Always Normalize Email Addresses

```sql
-- Store emails in lowercase
CREATE TABLE users (
    email VARCHAR(255) NOT NULL
);

-- Use trigger or application logic to lowercase
CREATE OR REPLACE FUNCTION lowercase_email()
RETURNS TRIGGER AS $$
BEGIN
    NEW.email = LOWER(NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_lowercase
BEFORE INSERT OR UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION lowercase_email();
```

### 3. Use Constraints for Validation

```sql
CREATE TABLE contacts (
    email VARCHAR(255) CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
    phone VARCHAR(20) CHECK (phone ~ '^\+?[1-9]\d{1,14}$'),
    zip_code VARCHAR(10) CHECK (zip_code ~ '^\d{5}(-\d{4})?$')
);
```

### 4. Index Text Columns Appropriately

```sql
-- Standard B-tree index for exact matches and prefix searches
CREATE INDEX idx_email ON users (email);

-- Trigram index for pattern matching (requires pg_trgm extension)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_name_trgm ON users USING gin (name gin_trgm_ops);

-- Full-text search index
CREATE INDEX idx_content_fts ON articles USING gin (to_tsvector('english', content));
```

### 5. Use String Functions Efficiently

```sql
-- Good: Use built-in functions
SELECT CONCAT_WS(' ', first_name, middle_name, last_name) AS full_name;

-- Avoid: Complex string manipulation in queries (do in application if possible)
```

### 6. Trim User Input

```sql
-- Always trim user-provided text
INSERT INTO users (username, email)
VALUES (TRIM('  username  '), LOWER(TRIM('  Email@Example.com  ')));
```

## Practice Exercises

### Exercise 1: User Profile System

Create a user profile system with proper text handling:

Requirements:
1. Create a users table with username, email, first_name, last_name, bio
2. Add appropriate constraints (email format, username length)
3. Insert 5 sample users
4. Write queries to:
   - Find all users with emails from a specific domain
   - Create full names from first and last names
   - Search bios for keywords (case-insensitive)
   - Extract email domains and count users per domain

<details>
<summary>Solution</summary>

```sql
-- Create table
CREATE TABLE user_profiles (
    user_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username VARCHAR(30) UNIQUE NOT NULL CHECK (LENGTH(username) BETWEEN 3 AND 30),
    email VARCHAR(255) UNIQUE NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    bio TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample users
INSERT INTO user_profiles (username, email, first_name, last_name, bio)
VALUES
    ('techguru', 'alice@techcorp.com', 'Alice', 'Anderson', 'Technology enthusiast and software architect'),
    ('datawiz', 'bob@datatech.com', 'Bob', 'Baker', 'Data scientist specializing in machine learning'),
    ('devjane', 'jane@techcorp.com', 'Jane', 'Cooper', 'Full-stack developer passionate about open source'),
    ('cloudking', 'charlie@cloudserv.io', 'Charlie', 'Davis', 'Cloud infrastructure engineer'),
    ('codequeen', 'diana@techcorp.com', 'Diana', 'Evans', 'Senior developer and tech blogger');

-- Find users from techcorp.com
SELECT username, email, first_name, last_name
FROM user_profiles
WHERE email LIKE '%@techcorp.com';

-- Create full names
SELECT
    username,
    CONCAT_WS(' ', first_name, last_name) AS full_name,
    email
FROM user_profiles
ORDER BY last_name, first_name;

-- Search bios for keywords
SELECT username, first_name, last_name, bio
FROM user_profiles
WHERE bio ILIKE '%developer%'
   OR bio ILIKE '%engineer%';

-- Extract domains and count users
SELECT
    SUBSTRING(email FROM POSITION('@' IN email) + 1) AS email_domain,
    COUNT(*) AS user_count
FROM user_profiles
GROUP BY email_domain
ORDER BY user_count DESC;
```

</details>

### Exercise 2: Product Catalog with Search

Create a product catalog with advanced text search capabilities:

Requirements:
1. Create a products table with SKU, name, description, category
2. Insert at least 10 products across different categories
3. Implement queries for:
   - Search products by name or description (case-insensitive)
   - Find products by SKU pattern (e.g., all laptops start with 'LAP-')
   - Create URL-friendly slugs from product names
   - List products grouped by category with comma-separated names

<details>
<summary>Solution</summary>

```sql
-- Create products table
CREATE TABLE product_catalog (
    product_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sku VARCHAR(20) UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL
);

-- Insert sample products
INSERT INTO product_catalog (sku, name, description, category)
VALUES
    ('LAP-001', 'Premium Laptop Pro', 'High-performance laptop for professionals', 'Laptops'),
    ('LAP-002', 'Budget Laptop Air', 'Affordable lightweight laptop', 'Laptops'),
    ('LAP-003', 'Gaming Laptop X', 'Ultimate gaming performance', 'Laptops'),
    ('MOU-001', 'Wireless Mouse', 'Ergonomic wireless mouse with USB receiver', 'Accessories'),
    ('MOU-002', 'Gaming Mouse RGB', 'RGB gaming mouse with programmable buttons', 'Accessories'),
    ('KEY-001', 'Mechanical Keyboard', 'Premium mechanical keyboard with backlight', 'Accessories'),
    ('MON-001', '27" 4K Monitor', 'Ultra HD 4K display for professionals', 'Monitors'),
    ('MON-002', 'Ultrawide Monitor', 'Curved ultrawide monitor for immersive experience', 'Monitors'),
    ('HDP-001', 'Wireless Headphones', 'Noise-cancelling Bluetooth headphones', 'Audio'),
    ('SPK-001', 'Bluetooth Speaker', 'Portable waterproof speaker', 'Audio');

-- Search products by name or description
SELECT sku, name, description, category
FROM product_catalog
WHERE name ILIKE '%laptop%'
   OR description ILIKE '%laptop%'
ORDER BY name;

-- Find products by SKU pattern
SELECT sku, name, category
FROM product_catalog
WHERE sku LIKE 'LAP-%';

-- Create URL-friendly slugs
SELECT
    name,
    LOWER(REPLACE(TRIM(name), ' ', '-')) AS slug,
    LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g')) AS clean_slug
FROM product_catalog;

-- List products grouped by category
SELECT
    category,
    COUNT(*) AS product_count,
    STRING_AGG(name, ', ' ORDER BY name) AS products
FROM product_catalog
GROUP BY category
ORDER BY category;
```

</details>

### Exercise 3: Text Data Cleaning

You've received a dataset with messy text data. Clean it up:

Requirements:
1. Create a table with raw_text column
2. Insert data with various issues (extra spaces, mixed case, special characters)
3. Write queries to:
   - Remove extra whitespace
   - Standardize case
   - Extract email addresses using regex
   - Validate and clean phone numbers
   - Split comma-separated values into rows

<details>
<summary>Solution</summary>

```sql
-- Create table for messy data
CREATE TABLE raw_contacts (
    id SERIAL PRIMARY KEY,
    raw_text TEXT
);

-- Insert messy data
INSERT INTO raw_contacts (raw_text) VALUES
    ('  John   Doe  ,  john.doe@example.com  , (555)  123-4567  '),
    ('JANE SMITH,jane.smith@COMPANY.org,555-987-6543'),
    ('  Bob   Johnson  ,  bob@test.com  ,  555.111.2222  '),
    ('Alice  Anderson,alice.a@mail.io,(555) 444-5555');

-- Remove extra whitespace and normalize
SELECT
    id,
    raw_text AS original,
    TRIM(REGEXP_REPLACE(raw_text, '\s+', ' ', 'g')) AS cleaned
FROM raw_contacts;

-- Extract components
WITH cleaned AS (
    SELECT
        id,
        TRIM(REGEXP_REPLACE(raw_text, '\s+', ' ', 'g')) AS text
    FROM raw_contacts
)
SELECT
    id,
    SPLIT_PART(text, ',', 1) AS name,
    LOWER(TRIM(SPLIT_PART(text, ',', 2))) AS email,
    REGEXP_REPLACE(TRIM(SPLIT_PART(text, ',', 3)), '[^0-9]', '', 'g') AS phone_digits
FROM cleaned;

-- Validate email addresses
WITH cleaned AS (
    SELECT
        id,
        LOWER(TRIM(SPLIT_PART(TRIM(REGEXP_REPLACE(raw_text, '\s+', ' ', 'g')), ',', 2))) AS email
    FROM raw_contacts
)
SELECT
    id,
    email,
    CASE
        WHEN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'
        THEN 'Valid'
        ELSE 'Invalid'
    END AS email_status
FROM cleaned;

-- Format phone numbers consistently
WITH cleaned AS (
    SELECT
        id,
        REGEXP_REPLACE(TRIM(SPLIT_PART(raw_text, ',', 3)), '[^0-9]', '', 'g') AS digits
    FROM raw_contacts
)
SELECT
    id,
    digits,
    '(' || SUBSTRING(digits FROM 1 FOR 3) || ') ' ||
    SUBSTRING(digits FROM 4 FOR 3) || '-' ||
    SUBSTRING(digits FROM 7 FOR 4) AS formatted_phone
FROM cleaned
WHERE LENGTH(digits) = 10;
```

</details>

## Related Topics

- [Numeric Types](01-numeric-types.md) - Integer and decimal data types
- [Date/Time Types](03-date-time-types.md) - Temporal data types
- [Array Types](06-array-types.md) - Arrays can contain text elements

## Additional Resources

- PostgreSQL Documentation: [Character Types](https://www.postgresql.org/docs/16/datatype-character.html)
- PostgreSQL Documentation: [String Functions](https://www.postgresql.org/docs/16/functions-string.html)
- PostgreSQL Documentation: [Pattern Matching](https://www.postgresql.org/docs/16/functions-matching.html)
- PostgreSQL Documentation: [Collation](https://www.postgresql.org/docs/16/collation.html)
