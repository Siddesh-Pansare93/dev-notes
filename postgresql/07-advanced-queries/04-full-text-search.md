# Full-Text Search

## Table of Contents
- [Theory](#theory)
- [Syntax](#syntax)
- [Examples](#examples)
- [Common Mistakes](#common-mistakes)
- [Best Practices](#best-practices)
- [Practice Exercises](#practice-exercises)

## Theory

### What is Full-Text Search?

Full-Text Search (FTS) is PostgreSQL's built-in capability for searching natural language documents. It provides linguistic search that understands word variations, relevance ranking, and efficient indexing for large text collections.

### Why FTS Over LIKE/Regex?

**LIKE/ILIKE Limitations**:
- No linguistic understanding (can't match "running" to "run")
- No relevance ranking
- Poor performance on large datasets (can't use indexes effectively)
- No support for complex queries (AND, OR, NOT, phrase searches)

**Regex Limitations**:
- Complex and error-prone for natural language
- No linguistic processing
- Very slow on large datasets
- No relevance ranking

**FTS Advantages**:
- **Linguistic processing**: Stemming, stop words, synonyms
- **Relevance ranking**: Results sorted by match quality
- **Performance**: Optimized with GIN/GiST indexes
- **Rich query syntax**: Boolean operators, phrase search, proximity
- **Multi-language support**: 20+ built-in language configurations

### Core FTS Concepts

**tsvector**: Document representation
- Normalized, sorted list of lexemes (words)
- Position information preserved
- Weights (A, B, C, D) for importance

**tsquery**: Search query representation
- Boolean operations: AND (&), OR (|), NOT (!)
- Phrase search: adjacent word matching
- Proximity: words within N positions

**Text Search Configuration**: Language-specific rules
- Tokenization: breaking text into words
- Stemming: reducing words to root form
- Stop words: filtering common words

### FTS Data Types

**tsvector**: `'fat':1 'cat':2 'rat':3`
**tsquery**: `'fat' & 'cat'` or `'run' | 'walk'`

## Syntax

### Basic FTS Functions

```sql
-- Convert text to tsvector
to_tsvector(config, document)
to_tsvector(document)  -- Uses default config

-- Convert text to tsquery
to_tsquery(config, query)
plainto_tsquery(config, query)      -- Plain text to query
phraseto_tsquery(config, query)     -- Phrase search
websearch_to_tsquery(config, query) -- Web-style search (PG11+)

-- Match operator
tsvector @@ tsquery

-- Ranking
ts_rank(tsvector, tsquery)
ts_rank_cd(tsvector, tsquery)  -- Cover density ranking

-- Highlighting
ts_headline(config, document, query, options)
```

### Creating Indexes

```sql
-- GIN index on tsvector column
CREATE INDEX idx_fts ON table_name USING GIN(tsvector_column);

-- Functional index
CREATE INDEX idx_fts ON table_name USING GIN(to_tsvector('english', column_name));

-- GiST index (supports UPDATE better)
CREATE INDEX idx_fts ON table_name USING GiST(tsvector_column);
```

### Text Search Configurations

```sql
-- Show available configurations
SELECT cfgname FROM pg_ts_config;

-- Set default configuration
SET default_text_search_config = 'pg_catalog.english';

-- Create custom configuration
CREATE TEXT SEARCH CONFIGURATION my_config (COPY = english);
```

## Examples

### Example 1: Basic Full-Text Search

```sql
-- Setup documents table
CREATE TABLE articles (
    article_id SERIAL PRIMARY KEY,
    title TEXT,
    content TEXT,
    author TEXT,
    published_date DATE
);

INSERT INTO articles (title, content, author, published_date) VALUES
('Introduction to PostgreSQL', 'PostgreSQL is a powerful open-source relational database. It supports advanced features like full-text search, JSON, and more.', 'Alice', '2024-01-15'),
('Full-Text Search Guide', 'Full-text search in PostgreSQL allows you to search documents efficiently. It uses tsvector and tsquery types.', 'Bob', '2024-01-20'),
('Database Performance', 'Optimizing database performance requires proper indexing, query optimization, and resource management.', 'Carol', '2024-01-25'),
('Advanced SQL Queries', 'Advanced SQL includes CTEs, window functions, and complex joins. These features make PostgreSQL powerful.', 'David', '2024-02-01'),
('JSON in PostgreSQL', 'PostgreSQL has excellent JSON support with jsonb type. You can query and index JSON data efficiently.', 'Alice', '2024-02-05');

-- Simple full-text search
SELECT
    title,
    author
FROM articles
WHERE to_tsvector('english', content) @@ to_tsquery('english', 'PostgreSQL');

-- Search in multiple columns
SELECT
    title,
    author
FROM articles
WHERE
    to_tsvector('english', title || ' ' || content)
    @@ to_tsquery('english', 'database');

-- Using plainto_tsquery (easier for user input)
SELECT
    title,
    author
FROM articles
WHERE
    to_tsvector('english', content)
    @@ plainto_tsquery('english', 'full text search');
```

### Example 2: tsquery Variants

```sql
-- to_tsquery: Requires proper syntax with operators
SELECT
    title,
    to_tsquery('english', 'PostgreSQL & database') AS query1
FROM articles
WHERE
    to_tsvector('english', content)
    @@ to_tsquery('english', 'PostgreSQL & database')
LIMIT 1;

-- plainto_tsquery: Converts plain text (AND between words)
SELECT
    title,
    plainto_tsquery('english', 'PostgreSQL database') AS query2
FROM articles
WHERE
    to_tsvector('english', content)
    @@ plainto_tsquery('english', 'PostgreSQL database')
LIMIT 1;

-- phraseto_tsquery: Phrase search (words must be adjacent)
SELECT
    title,
    phraseto_tsquery('english', 'full text search') AS query3
FROM articles
WHERE
    to_tsvector('english', content)
    @@ phraseto_tsquery('english', 'full text search')
LIMIT 1;

-- websearch_to_tsquery: Web-style search (PG11+)
-- Supports: "quoted phrases", OR, -, etc.
SELECT
    title,
    websearch_to_tsquery('english', '"full text" OR json') AS query4
FROM articles
WHERE
    to_tsvector('english', content)
    @@ websearch_to_tsquery('english', '"full text" OR json');

-- Show the difference in parsing
SELECT
    to_tsquery('english', 'PostgreSQL & database') AS strict_syntax,
    plainto_tsquery('english', 'PostgreSQL database') AS plain_text,
    phraseto_tsquery('english', 'PostgreSQL database') AS phrase,
    websearch_to_tsquery('english', 'PostgreSQL database') AS websearch;
```

### Example 3: Relevance Ranking with ts_rank

```sql
-- Search with relevance ranking
SELECT
    title,
    author,
    ts_rank(
        to_tsvector('english', title || ' ' || content),
        plainto_tsquery('english', 'PostgreSQL database')
    ) AS rank
FROM articles
WHERE
    to_tsvector('english', title || ' ' || content)
    @@ plainto_tsquery('english', 'PostgreSQL database')
ORDER BY rank DESC;

-- ts_rank_cd (cover density) - considers proximity
SELECT
    title,
    ts_rank(
        to_tsvector('english', content),
        plainto_tsquery('english', 'PostgreSQL database')
    ) AS rank_default,
    ts_rank_cd(
        to_tsvector('english', content),
        plainto_tsquery('english', 'PostgreSQL database')
    ) AS rank_cover_density
FROM articles
WHERE
    to_tsvector('english', content)
    @@ plainto_tsquery('english', 'PostgreSQL database')
ORDER BY rank_cover_density DESC;

-- Normalization options for ts_rank
-- 0: Default
-- 1: Divide by (1 + log(document length))
-- 2: Divide by document length
-- 4: Divide by harmonic mean of match positions
-- 8: Divide by number of unique words
-- 16: Divide by 1 + log(number of unique words)
-- 32: Divide by rank itself + 1

SELECT
    title,
    ts_rank(
        to_tsvector('english', content),
        plainto_tsquery('english', 'PostgreSQL'),
        1  -- Normalize by document length
    ) AS normalized_rank
FROM articles
WHERE
    to_tsvector('english', content)
    @@ plainto_tsquery('english', 'PostgreSQL')
ORDER BY normalized_rank DESC;
```

### Example 4: Highlighting Results with ts_headline

```sql
-- Basic headline generation
SELECT
    title,
    ts_headline(
        'english',
        content,
        plainto_tsquery('english', 'PostgreSQL database'),
        'MaxWords=50, MinWords=25'
    ) AS snippet
FROM articles
WHERE
    to_tsvector('english', content)
    @@ plainto_tsquery('english', 'PostgreSQL database');

-- Custom highlighting options
SELECT
    title,
    ts_headline(
        'english',
        content,
        plainto_tsquery('english', 'full text search'),
        'StartSel=<mark>, StopSel=</mark>, MaxFragments=2, FragmentDelimiter=" ... "'
    ) AS highlighted_snippet
FROM articles
WHERE
    to_tsvector('english', content)
    @@ plainto_tsquery('english', 'full text search');

-- Show context around matches
SELECT
    title,
    ts_headline(
        'english',
        content,
        plainto_tsquery('english', 'PostgreSQL'),
        'MaxWords=20, MinWords=10, ShortWord=3, HighlightAll=false'
    ) AS context
FROM articles
WHERE
    to_tsvector('english', content)
    @@ plainto_tsquery('english', 'PostgreSQL')
ORDER BY
    ts_rank(to_tsvector('english', content), plainto_tsquery('english', 'PostgreSQL'))
    DESC;
```

### Example 5: Stored tsvector Column with Trigger

```sql
-- Add tsvector column
ALTER TABLE articles ADD COLUMN content_search tsvector;

-- Populate existing rows
UPDATE articles
SET content_search = to_tsvector('english', title || ' ' || content);

-- Create trigger function to maintain tsvector
CREATE OR REPLACE FUNCTION articles_search_trigger() RETURNS trigger AS $$
BEGIN
    NEW.content_search :=
        to_tsvector('english', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.content, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER articles_search_update
    BEFORE INSERT OR UPDATE OF title, content
    ON articles
    FOR EACH ROW
    EXECUTE FUNCTION articles_search_trigger();

-- Create GIN index
CREATE INDEX idx_articles_search ON articles USING GIN(content_search);

-- Now searches are much faster
EXPLAIN ANALYZE
SELECT
    title,
    author,
    ts_rank(content_search, plainto_tsquery('english', 'PostgreSQL')) AS rank
FROM articles
WHERE content_search @@ plainto_tsquery('english', 'PostgreSQL')
ORDER BY rank DESC;

-- Test trigger with insert
INSERT INTO articles (title, content, author, published_date)
VALUES ('Trigger Test', 'This article tests the automatic tsvector update trigger.', 'Eve', CURRENT_DATE);

-- Verify tsvector was populated
SELECT title, content_search FROM articles WHERE title = 'Trigger Test';
```

### Example 6: Multi-Column Full-Text Search

```sql
-- Create products table
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    product_name TEXT,
    description TEXT,
    category TEXT,
    tags TEXT[],
    specs JSONB
);

INSERT INTO products (product_name, description, category, tags, specs) VALUES
('Gaming Laptop Pro', 'High-performance laptop for gaming and content creation with RTX graphics', 'Electronics', ARRAY['gaming', 'laptop', 'nvidia'], '{"cpu": "Intel i9", "ram": "32GB", "storage": "1TB SSD"}'),
('Wireless Mouse', 'Ergonomic wireless mouse with precision tracking', 'Electronics', ARRAY['mouse', 'wireless', 'ergonomic'], '{"dpi": "16000", "buttons": "8"}'),
('Standing Desk', 'Adjustable height standing desk for home office', 'Furniture', ARRAY['desk', 'standing', 'adjustable'], '{"height_range": "60-120cm", "material": "bamboo"}'),
('Mechanical Keyboard', 'RGB mechanical keyboard with cherry MX switches', 'Electronics', ARRAY['keyboard', 'mechanical', 'rgb'], '{"switches": "Cherry MX Blue", "layout": "TKL"}'),
('Office Chair', 'Ergonomic office chair with lumbar support', 'Furniture', ARRAY['chair', 'ergonomic', 'office'], '{"max_weight": "150kg", "adjustable": "yes"}');

-- Add weighted tsvector column
ALTER TABLE products ADD COLUMN search_vector tsvector;

-- Update with weights (A=highest, D=lowest)
UPDATE products
SET search_vector =
    setweight(to_tsvector('english', COALESCE(product_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(category, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(tags, ' '), '')), 'D');

-- Create trigger for automatic updates
CREATE OR REPLACE FUNCTION products_search_trigger() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.product_name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_search_update
    BEFORE INSERT OR UPDATE
    ON products
    FOR EACH ROW
    EXECUTE FUNCTION products_search_trigger();

-- Create GIN index
CREATE INDEX idx_products_search ON products USING GIN(search_vector);

-- Search with weighted ranking
SELECT
    product_name,
    category,
    ts_rank(search_vector, plainto_tsquery('english', 'ergonomic')) AS rank
FROM products
WHERE search_vector @@ plainto_tsquery('english', 'ergonomic')
ORDER BY rank DESC;

-- Product names match higher than descriptions
SELECT
    product_name,
    description,
    ts_rank(search_vector, plainto_tsquery('english', 'gaming')) AS rank
FROM products
WHERE search_vector @@ plainto_tsquery('english', 'gaming')
ORDER BY rank DESC;
```

### Example 7: Phrase Search and Proximity

```sql
-- Setup blog posts
CREATE TABLE blog_posts (
    post_id SERIAL PRIMARY KEY,
    title TEXT,
    body TEXT,
    search_vector tsvector
);

INSERT INTO blog_posts (title, body) VALUES
('PostgreSQL Tutorial', 'Learn PostgreSQL from scratch. PostgreSQL is an advanced database system.'),
('Database Design', 'Good database design is crucial for application performance and scalability.'),
('Full Text Search', 'PostgreSQL full text search is powerful. Full text search enables better search.'),
('SQL Performance', 'Optimize your SQL queries for better performance. SQL optimization is key.');

UPDATE blog_posts
SET search_vector = to_tsvector('english', title || ' ' || body);

-- Phrase search: exact word order
SELECT
    title,
    phraseto_tsquery('english', 'full text search') AS phrase_query
FROM blog_posts
WHERE search_vector @@ phraseto_tsquery('english', 'full text search');

-- Proximity search using <-> operator (adjacent)
SELECT
    title,
    body
FROM blog_posts
WHERE to_tsvector('english', body) @@ to_tsquery('english', 'full <-> text');

-- Proximity with distance (words within N positions)
-- <2> means within 2 positions
SELECT
    title,
    to_tsquery('english', 'PostgreSQL <2> database') AS proximity_query
FROM blog_posts
WHERE to_tsvector('english', body) @@ to_tsquery('english', 'PostgreSQL <2> database');

-- Combine proximity with boolean operators
SELECT
    title,
    body
FROM blog_posts
WHERE
    to_tsvector('english', body)
    @@ to_tsquery('english', '(full <-> text) | (SQL <-> performance)');
```

### Example 8: Complex Search Queries

```sql
-- Boolean operators: AND (&), OR (|), NOT (!)
SELECT
    title,
    to_tsquery('english', 'PostgreSQL & database') AS and_query
FROM blog_posts
WHERE search_vector @@ to_tsquery('english', 'PostgreSQL & database');

SELECT
    title,
    to_tsquery('english', 'PostgreSQL | MySQL') AS or_query
FROM blog_posts
WHERE search_vector @@ to_tsquery('english', 'PostgreSQL | MySQL');

SELECT
    title,
    to_tsquery('english', 'database & !design') AS not_query
FROM blog_posts
WHERE search_vector @@ to_tsquery('english', 'database & !design');

-- Complex nested queries
SELECT
    title,
    to_tsquery('english', '(PostgreSQL | database) & (search | query)') AS complex_query
FROM blog_posts
WHERE search_vector @@ to_tsquery('english', '(PostgreSQL | database) & (search | query)');

-- Prefix matching with :*
SELECT
    title,
    to_tsquery('english', 'optim:*') AS prefix_query
FROM blog_posts
WHERE search_vector @@ to_tsquery('english', 'optim:*');
-- Matches: optimize, optimization, optimal, etc.

-- Show matched terms
SELECT
    title,
    ts_headline('english', body, to_tsquery('english', 'optim:*'),
        'StartSel=<<, StopSel=>>') AS matched_text
FROM blog_posts
WHERE search_vector @@ to_tsquery('english', 'optim:*');
```

### Example 9: Multi-Language Support

```sql
-- Create table with language column
CREATE TABLE international_articles (
    article_id SERIAL PRIMARY KEY,
    title TEXT,
    content TEXT,
    language TEXT,
    search_vector tsvector
);

INSERT INTO international_articles (title, content, language) VALUES
('PostgreSQL Tutorial', 'PostgreSQL is a powerful database system', 'english'),
('Base de données', 'PostgreSQL est un système de base de données puissant', 'french'),
('Datenbank Tutorial', 'PostgreSQL ist ein leistungsfähiges Datenbanksystem', 'german'),
('Tutorial de Base de Datos', 'PostgreSQL es un sistema de base de datos potente', 'spanish');

-- Update with language-specific configurations
UPDATE international_articles
SET search_vector = to_tsvector(language::regconfig, content);

-- Create index
CREATE INDEX idx_intl_articles_search ON international_articles USING GIN(search_vector);

-- Search in English
SELECT title, language
FROM international_articles
WHERE
    language = 'english'
    AND search_vector @@ plainto_tsquery('english', 'database powerful');

-- Search in French
SELECT title, language
FROM international_articles
WHERE
    language = 'french'
    AND search_vector @@ plainto_tsquery('french', 'base données');

-- List available text search configurations
SELECT cfgname, cfgparser::regproc AS parser
FROM pg_ts_config
WHERE cfgname IN ('english', 'french', 'german', 'spanish', 'russian', 'italian');
```

### Example 10: Practical Search Implementation

```sql
-- Create complete search system for e-commerce
CREATE TABLE ecommerce_products (
    product_id SERIAL PRIMARY KEY,
    sku TEXT UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    brand TEXT,
    price NUMERIC(10, 2),
    tags TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    search_vector tsvector
);

-- Insert sample data
INSERT INTO ecommerce_products (sku, name, description, category, brand, price, tags) VALUES
('LAPTOP-001', 'UltraBook Pro 15', 'Lightweight laptop with 15-inch 4K display, Intel i7, 16GB RAM', 'Electronics', 'TechBrand', 1299.99, ARRAY['laptop', 'ultrabook', 'lightweight']),
('MOUSE-001', 'Precision Gaming Mouse', 'RGB gaming mouse with 16000 DPI sensor and programmable buttons', 'Electronics', 'GameGear', 79.99, ARRAY['mouse', 'gaming', 'rgb']),
('DESK-001', 'Executive Standing Desk', 'Electric height-adjustable desk with memory presets', 'Furniture', 'OfficePro', 599.99, ARRAY['desk', 'standing', 'electric']),
('CHAIR-001', 'Ergonomic Office Chair', 'Mesh office chair with lumbar support and adjustable armrests', 'Furniture', 'ComfortLine', 349.99, ARRAY['chair', 'ergonomic', 'mesh']),
('MONITOR-001', '27" 4K Professional Monitor', 'IPS panel with HDR support and USB-C connectivity', 'Electronics', 'ViewTech', 499.99, ARRAY['monitor', '4k', 'ips']);

-- Create comprehensive search vector with weights
UPDATE ecommerce_products
SET search_vector =
    setweight(to_tsvector('english', COALESCE(sku, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(brand, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(description, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(category, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(tags, ' '), '')), 'D');

-- Trigger for automatic updates
CREATE OR REPLACE FUNCTION ecommerce_search_trigger() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.sku, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.brand, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ecommerce_search_update
    BEFORE INSERT OR UPDATE
    ON ecommerce_products
    FOR EACH ROW
    EXECUTE FUNCTION ecommerce_search_trigger();

-- Create index
CREATE INDEX idx_ecommerce_search ON ecommerce_products USING GIN(search_vector);

-- Complete search function
CREATE OR REPLACE FUNCTION search_products(
    search_query TEXT,
    max_results INT DEFAULT 20
)
RETURNS TABLE (
    product_id INT,
    sku TEXT,
    name TEXT,
    description TEXT,
    price NUMERIC,
    relevance REAL,
    snippet TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.product_id,
        p.sku,
        p.name,
        p.description,
        p.price,
        ts_rank(p.search_vector, websearch_to_tsquery('english', search_query))::REAL AS relevance,
        ts_headline(
            'english',
            p.name || ' ' || COALESCE(p.description, ''),
            websearch_to_tsquery('english', search_query),
            'MaxWords=50, MinWords=20, StartSel=<b>, StopSel=</b>'
        ) AS snippet
    FROM ecommerce_products p
    WHERE
        p.is_active = true
        AND p.search_vector @@ websearch_to_tsquery('english', search_query)
    ORDER BY relevance DESC
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Test the search function
SELECT * FROM search_products('gaming mouse');
SELECT * FROM search_products('ergonomic office');
SELECT * FROM search_products('4K monitor OR laptop');
```

### Example 11: Autocomplete/Suggest Implementation

```sql
-- Create table for search suggestions
CREATE TABLE search_terms (
    term_id SERIAL PRIMARY KEY,
    term TEXT UNIQUE,
    search_count INT DEFAULT 0,
    last_searched TIMESTAMP
);

-- Function to track searches and provide suggestions
CREATE OR REPLACE FUNCTION autocomplete_search(
    prefix TEXT,
    max_suggestions INT DEFAULT 10
)
RETURNS TABLE (
    suggestion TEXT,
    popularity INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        term,
        search_count
    FROM search_terms
    WHERE term ILIKE prefix || '%'
    ORDER BY search_count DESC, term
    LIMIT max_suggestions;
END;
$$ LANGUAGE plpgsql;

-- Function to log search
CREATE OR REPLACE FUNCTION log_search(search_term TEXT)
RETURNS VOID AS $$
BEGIN
    INSERT INTO search_terms (term, search_count, last_searched)
    VALUES (LOWER(search_term), 1, CURRENT_TIMESTAMP)
    ON CONFLICT (term)
    DO UPDATE SET
        search_count = search_terms.search_count + 1,
        last_searched = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Simulate searches
SELECT log_search('gaming laptop');
SELECT log_search('gaming mouse');
SELECT log_search('gaming keyboard');
SELECT log_search('office chair');
SELECT log_search('office desk');
SELECT log_search('gaming laptop');  -- Duplicate to increase count

-- Test autocomplete
SELECT * FROM autocomplete_search('gam');
SELECT * FROM autocomplete_search('off');
```

### Example 12: FTS Performance Comparison

```sql
-- Create test table with 10,000 rows
CREATE TABLE fts_performance_test (
    id SERIAL PRIMARY KEY,
    content TEXT,
    search_vector tsvector
);

-- Insert test data
INSERT INTO fts_performance_test (content)
SELECT
    'This is test document number ' || i || '. It contains various words like PostgreSQL, database, search, performance, and optimization. ' ||
    'Some documents mention specific topics like ' ||
    CASE (i % 5)
        WHEN 0 THEN 'full-text search capabilities'
        WHEN 1 THEN 'query optimization techniques'
        WHEN 2 THEN 'database indexing strategies'
        WHEN 3 THEN 'PostgreSQL configuration tuning'
        ELSE 'general database administration'
    END || '.'
FROM generate_series(1, 10000) i;

-- Update tsvector
UPDATE fts_performance_test
SET search_vector = to_tsvector('english', content);

-- Compare performance: ILIKE vs FTS

-- 1. ILIKE (slow, no index)
EXPLAIN ANALYZE
SELECT id, content
FROM fts_performance_test
WHERE content ILIKE '%PostgreSQL%'
LIMIT 10;

-- 2. Regex (slow, no index)
EXPLAIN ANALYZE
SELECT id, content
FROM fts_performance_test
WHERE content ~ 'PostgreSQL'
LIMIT 10;

-- 3. FTS without index
EXPLAIN ANALYZE
SELECT id, content
FROM fts_performance_test
WHERE search_vector @@ plainto_tsquery('english', 'PostgreSQL')
LIMIT 10;

-- 4. Create GIN index
CREATE INDEX idx_fts_perf_test ON fts_performance_test USING GIN(search_vector);

-- 5. FTS with index (fast!)
EXPLAIN ANALYZE
SELECT id, content
FROM fts_performance_test
WHERE search_vector @@ plainto_tsquery('english', 'PostgreSQL')
LIMIT 10;

-- 6. Complex FTS query with ranking
EXPLAIN ANALYZE
SELECT
    id,
    ts_rank(search_vector, query) AS rank,
    ts_headline('english', content, query, 'MaxWords=20') AS snippet
FROM
    fts_performance_test,
    plainto_tsquery('english', 'PostgreSQL database optimization') query
WHERE search_vector @@ query
ORDER BY rank DESC
LIMIT 10;
```

## Common Mistakes

### 1. Not Using Correct tsquery Function

```sql
-- WRONG: to_tsquery with plain text (syntax error)
SELECT * FROM articles
WHERE search_vector @@ to_tsquery('english', 'full text search');
-- ERROR: syntax error in tsquery

-- CORRECT: Use plainto_tsquery for plain text
SELECT * FROM articles
WHERE search_vector @@ plainto_tsquery('english', 'full text search');

-- OR: Use proper to_tsquery syntax
SELECT * FROM articles
WHERE search_vector @@ to_tsquery('english', 'full & text & search');
```

### 2. Forgetting to Create Index

```sql
-- WRONG: Full-text search without index (slow!)
SELECT * FROM large_table
WHERE to_tsvector('english', content) @@ plainto_tsquery('english', 'search term');

-- CORRECT: Create GIN index first
CREATE INDEX idx_content_search ON large_table USING GIN(to_tsvector('english', content));
-- Or better: use a stored tsvector column with trigger
```

### 3. Not Normalizing Ranking Scores

```sql
-- WRONG: Comparing raw ranks from different document lengths
SELECT title, ts_rank(search_vector, query) AS rank
FROM articles, plainto_tsquery('english', 'PostgreSQL') query
WHERE search_vector @@ query
ORDER BY rank DESC;
-- Long documents get higher scores unfairly

-- CORRECT: Normalize by document length
SELECT
    title,
    ts_rank(search_vector, query, 1) AS normalized_rank  -- 1 = normalize by length
FROM articles, plainto_tsquery('english', 'PostgreSQL') query
WHERE search_vector @@ query
ORDER BY normalized_rank DESC;
```

### 4. Ignoring Language Configuration

```sql
-- WRONG: Using wrong language or default
SELECT to_tsvector('english', 'Le base de données');
-- French text with English stemmer produces poor results

-- CORRECT: Use appropriate language
SELECT to_tsvector('french', 'Le base de données');
```

### 5. Not Using Stored tsvector for Multi-Column Search

```sql
-- WRONG: Computing tsvector on every query (slow!)
SELECT *
FROM products
WHERE
    to_tsvector('english', name || ' ' || description || ' ' || category)
    @@ plainto_tsquery('english', 'search term');

-- CORRECT: Use stored tsvector column with trigger
-- (See Example 5 for implementation)
```

## Best Practices

### 1. Always Use Stored tsvector Columns for Production

```sql
-- Add tsvector column
ALTER TABLE table_name ADD COLUMN search_vector tsvector;

-- Create trigger to maintain it
CREATE TRIGGER maintain_search_vector
    BEFORE INSERT OR UPDATE
    ON table_name
    FOR EACH ROW
    EXECUTE FUNCTION update_search_vector_trigger();

-- Create GIN index
CREATE INDEX idx_search ON table_name USING GIN(search_vector);
```

### 2. Use Appropriate Weights for Multi-Column Search

```sql
-- Title is most important (A), then description (B), then tags (C)
UPDATE products
SET search_vector =
    setweight(to_tsvector('english', title), 'A') ||
    setweight(to_tsvector('english', description), 'B') ||
    setweight(to_tsvector('english', array_to_string(tags, ' ')), 'C');
```

### 3. Choose the Right tsquery Function

```sql
-- User-typed queries: Use plainto_tsquery or websearch_to_tsquery
SELECT * FROM articles
WHERE search_vector @@ plainto_tsquery('english', user_input);

-- Programmatic queries: Use to_tsquery with proper syntax
SELECT * FROM articles
WHERE search_vector @@ to_tsquery('english', 'postgres:* & (database | rdbms)');

-- Phrase searches: Use phraseto_tsquery
SELECT * FROM articles
WHERE search_vector @@ phraseto_tsquery('english', 'full text search');
```

### 4. Normalize Ranking Scores

```sql
-- Use normalization flag (1, 2, 4, 8, 16, or 32)
SELECT
    title,
    ts_rank(search_vector, query, 1) AS rank  -- Normalize by log(doc length)
FROM articles, plainto_tsquery('english', 'PostgreSQL') query
WHERE search_vector @@ query
ORDER BY rank DESC;
```

### 5. Use GIN Indexes (Not GiST) for Most Cases

```sql
-- GIN: Better for static data, faster searches
CREATE INDEX idx_gin ON table_name USING GIN(search_vector);

-- GiST: Better for frequently updated data, slower searches
CREATE INDEX idx_gist ON table_name USING GiST(search_vector);

-- For most applications: use GIN
```

### 6. Implement Search Analytics

```sql
-- Track searches for autocomplete and analytics
CREATE TABLE search_log (
    search_id SERIAL PRIMARY KEY,
    query TEXT,
    results_count INT,
    user_id INT,
    searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Log every search
INSERT INTO search_log (query, results_count, user_id)
VALUES (?, ?, ?);
```

### 7. Consider Using pg_trgm for Fuzzy Matching

```sql
-- Install extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Combine with FTS for typo tolerance
SELECT *
FROM products
WHERE
    search_vector @@ plainto_tsquery('english', 'search term')
    OR name % 'serch term'  -- Fuzzy match for typos
ORDER BY
    ts_rank(search_vector, plainto_tsquery('english', 'search term')) DESC;
```

## Practice Exercises

### Exercise 1: Build a Documentation Search System

Create a full-text search system for technical documentation:

1. Create a `documentation` table with sections, titles, and content
2. Implement weighted search (title > section > content)
3. Add tsvector column with automatic trigger updates
4. Create GIN index for performance
5. Implement a search function that returns ranked results with highlighted snippets
6. Test with various queries including boolean operators and phrases

```sql
-- Your task: Implement the complete documentation search system
-- Include tables, triggers, indexes, and search function
```

### Exercise 2: Multi-Language Product Search

Build a product search system supporting multiple languages:

1. Create products table with language column
2. Implement language-specific tsvector generation
3. Create search function that uses appropriate language configuration
4. Support searching in multiple languages simultaneously
5. Rank results with language preference (prefer user's language)

```sql
-- Your task: Create multi-language search system
-- Support at least: English, Spanish, French
```

### Exercise 3: Search Performance Optimization

Given a slow search query, optimize it:

1. Create test table with 100,000 documents
2. Measure baseline performance with ILIKE
3. Implement FTS without index and measure
4. Add GIN index and measure improvement
5. Implement stored tsvector column and measure
6. Compare all approaches and document findings
7. Create a monitoring view showing search performance metrics

```sql
-- Setup
CREATE TABLE search_performance_test (
    id SERIAL PRIMARY KEY,
    title TEXT,
    content TEXT
);

-- Insert 100,000 test documents
INSERT INTO search_performance_test (title, content)
SELECT
    'Document ' || i,
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ' ||
    'Document number ' || i || ' contains information about ' ||
    (ARRAY['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Cassandra'])[1 + i % 5] ||
    ' and discusses ' ||
    (ARRAY['performance', 'scalability', 'reliability', 'security', 'optimization'])[1 + i % 5] ||
    '. Additional content here with various technical terms and concepts.'
FROM generate_series(1, 100000) i;

-- Your task: Optimize search and measure performance
```

## Summary

Full-Text Search in PostgreSQL provides powerful, efficient text search capabilities:

**Key Components**:
- **tsvector**: Document representation with lexemes
- **tsquery**: Search query with boolean operators
- **Text Search Configurations**: Language-specific processing
- **Ranking**: ts_rank and ts_rank_cd for relevance
- **Highlighting**: ts_headline for search result snippets

**Essential Features**:
- Linguistic processing (stemming, stop words)
- Boolean operators (AND, OR, NOT)
- Phrase and proximity search
- Multi-language support
- GIN/GiST indexes for performance
- Weighting for multi-column search

**Best Practices**:
- Use stored tsvector columns with triggers
- Create GIN indexes for performance
- Use appropriate tsquery function for input type
- Normalize ranking scores
- Weight columns by importance
- Choose correct language configuration

**Performance**:
- FTS with GIN index: 100-1000x faster than ILIKE
- Essential for large text datasets
- Scales to millions of documents

For related advanced query topics, see:
- [Common Table Expressions](01-cte.md)
- [Views and Materialized Views](02-views.md)
- [Conditional Expressions](03-conditional-expressions.md)
