# 🔍 Chapter 16: Full-Text Search and Advanced Features

> **Who this chapter is for:** You know the SQL basics — SELECT, JOIN, GROUP BY — and want to explore the powerful features that separate a production-grade database from a toy one. This chapter covers full-text search, arrays, ranges, extensions, and lateral joins. Most examples focus on PostgreSQL, with clear callouts when MySQL, SQL Server, or Oracle behave differently.

---

## 📋 Table of Contents

1. [Full-Text Search](#-full-text-search)
2. [Arrays (PostgreSQL)](#-arrays-postgresql)
3. [Ranges (PostgreSQL)](#-ranges-postgresql)
4. [Common Extensions](#-common-extensions)
5. [Lateral Joins](#-lateral-joins)
6. [Key Takeaways](#-key-takeaways)
7. [Quiz](#-quiz)

---

## 🔤 Full-Text Search

A `LIKE '%keyword%'` query works fine for small tables, but it cannot rank results by relevance, it ignores word forms (*run* vs *running*), and it cannot use an index efficiently. **Full-text search** solves all three problems.

Each database has its own approach. Here is a high-level comparison before diving in:

| Feature | PostgreSQL | MySQL | SQL Server |
|---|---|---|---|
| Index type | GIN on tsvector | FULLTEXT index | Full-Text catalog |
| Query syntax | `@@` operator | `MATCH ... AGAINST` | `CONTAINS()` / `FREETEXT()` |
| Relevance ranking | `ts_rank()` | Built-in score | `CONTAINSTABLE` |
| Highlighting | `ts_headline()` | Manual | Manual |

---

### PostgreSQL Full-Text Search

PostgreSQL has the most capable built-in full-text engine. Two special types power it:

| Type | Purpose |
|---|---|
| `tsvector` | A pre-processed, sorted list of lexemes (root word forms) with position info |
| `tsquery` | A search query that can use `&` (AND), `\|` (OR), `!` (NOT), and `<->` (phrase) operators |

#### Converting text to tsvector

```sql
-- PostgreSQL
SELECT to_tsvector('english', 'The quick brown fox jumps over the lazy dog');
-- Result: 'brown':3 'dog':9 'fox':4 'jump':5 'lazi':8 'quick':2
-- Notice: stop words ("the", "over") are removed; words are stemmed ("jumps" -> "jump")
```

The first argument `'english'` is the **text search configuration** — it controls the language dictionary and stop-word list.

#### Searching with tsquery

```sql
-- PostgreSQL
SELECT to_tsquery('english', 'jump & fox');
-- Result: 'jump' & 'fox'

-- Phrase search (fox immediately followed by jump)
SELECT to_tsquery('english', 'fox <-> jump');

-- OR search
SELECT to_tsquery('english', 'cat | dog');
```

#### The @@ Match Operator

The `@@` operator returns `true` when a `tsvector` matches a `tsquery`:

```sql
-- PostgreSQL
SELECT title
FROM articles
WHERE to_tsvector('english', body) @@ to_tsquery('english', 'database & performance');
```

This works, but calling `to_tsvector()` on every row at query time is slow for large tables.

#### Stored tsvector Column for Performance

The recommended production pattern is to store the tsvector in a dedicated column and keep it up to date with a trigger:

```sql
-- PostgreSQL

-- 1. Add the column
ALTER TABLE articles ADD COLUMN search_vector tsvector;

-- 2. Populate it
UPDATE articles
SET search_vector = to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body, ''));

-- 3. Create a trigger to keep it fresh
CREATE FUNCTION articles_search_vector_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.title, '') || ' ' || coalesce(NEW.body, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER articles_search_vector_update
BEFORE INSERT OR UPDATE ON articles
FOR EACH ROW EXECUTE FUNCTION articles_search_vector_trigger();
```

#### GIN Index on tsvector

A **GIN** (Generalized Inverted Index) makes the `@@` operator fast on millions of rows:

```sql
-- PostgreSQL
CREATE INDEX idx_articles_search ON articles USING GIN (search_vector);

-- Now this query hits the index:
SELECT title
FROM articles
WHERE search_vector @@ to_tsquery('english', 'database & performance');
```

#### Relevance Ranking with ts_rank()

`ts_rank()` returns a `float4` score based on how often query terms appear:

```sql
-- PostgreSQL
SELECT
  title,
  ts_rank(search_vector, query) AS rank
FROM articles,
     to_tsquery('english', 'database & performance') AS query
WHERE search_vector @@ query
ORDER BY rank DESC
LIMIT 10;
```

#### Highlighting with ts_headline()

`ts_headline()` wraps matched terms in HTML tags (great for search result snippets):

```sql
-- PostgreSQL
SELECT
  title,
  ts_headline('english', body, to_tsquery('english', 'database'),
    'StartSel=<mark>, StopSel=</mark>, MaxWords=30, MinWords=15'
  ) AS snippet
FROM articles
WHERE search_vector @@ to_tsquery('english', 'database');
```

---

### MySQL Full-Text Search

MySQL requires a `FULLTEXT` index — you cannot do full-text search without one.

```sql
-- MySQL: Add FULLTEXT index at table creation
CREATE TABLE articles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255),
  body TEXT,
  FULLTEXT idx_ft (title, body)
);

-- Or add it later:
ALTER TABLE articles ADD FULLTEXT INDEX idx_ft (title, body);
```

#### MATCH ... AGAINST Syntax

```sql
-- MySQL: Natural Language Mode (default)
-- Ranks results by relevance; common words are ignored
SELECT title, MATCH(title, body) AGAINST ('database performance') AS score
FROM articles
WHERE MATCH(title, body) AGAINST ('database performance')
ORDER BY score DESC;

-- MySQL: Boolean Mode
-- Supports + (must include), - (must exclude), * (wildcard), "" (phrase)
SELECT title
FROM articles
WHERE MATCH(title, body) AGAINST ('+database -slow "query optimizer"' IN BOOLEAN MODE);
```

**Key difference from PostgreSQL:** MySQL's full-text search does not stem words (searching *run* will not match *running*) and minimum word length defaults to 4 characters.

---

### SQL Server Full-Text Search

SQL Server treats full-text search as a separate installable feature. Once enabled, two main functions are available:

```sql
-- SQL Server

-- CONTAINS: structured predicate with AND, OR, NOT, NEAR, wildcards
SELECT title
FROM articles
WHERE CONTAINS((title, body), '"database" AND "performance"');

-- Wildcard
WHERE CONTAINS(body, '"datab*"');

-- FREETEXT: natural language, more forgiving (auto-stems and expands)
SELECT title
FROM articles
WHERE FREETEXT(body, 'database performance tuning');
```

`CONTAINSTABLE` and `FREETEXTTABLE` return a table with a `RANK` column for relevance ordering, similar to `ts_rank()` in PostgreSQL.

---

### When SQL Full-Text Search Is Not Enough

Built-in full-text search covers the common cases well, but consider **Elasticsearch** (or **OpenSearch**) when you need:

- Multi-language stemming across dozens of languages in the same index
- Fuzzy matching tolerant of typos (`fliht` matching `flight`)
- Faceted search (filter by category, price range, etc. alongside keyword search)
- Distributed search across billions of documents with sub-second response
- Custom ranking formulas mixing textual relevance with business signals

Elasticsearch is typically used alongside a relational database — PostgreSQL stores the source of truth; Elasticsearch powers the search API.

---

## 📦 Arrays (PostgreSQL)

PostgreSQL lets you store an ordered list of values in a single column. This is genuinely useful — for example, storing a list of tags on a blog post without a separate junction table.

```sql
-- PostgreSQL: create a table with an array column
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  title TEXT,
  tags TEXT[]
);

-- Insert with array literal
INSERT INTO posts (title, tags) VALUES
  ('Intro to SQL', ARRAY['sql', 'beginner', 'database']),
  ('PostgreSQL Arrays', '{postgresql, arrays, advanced}');  -- alternative syntax
```

### Array Operators

| Operator | Meaning | Example |
|---|---|---|
| `@>` | Contains (left contains all elements of right) | `tags @> '{sql}'` |
| `<@` | Is contained by | `'{sql}' <@ tags` |
| `&&` | Overlap (share at least one element) | `tags && '{sql, python}'` |
| `\|\|` | Concatenate | `tags \|\| '{new-tag}'` |

```sql
-- PostgreSQL: posts tagged with both 'sql' AND 'beginner'
SELECT title FROM posts WHERE tags @> ARRAY['sql', 'beginner'];

-- Posts tagged with 'sql' OR 'python' (any overlap)
SELECT title FROM posts WHERE tags && ARRAY['sql', 'python'];

-- Add a tag
UPDATE posts SET tags = tags || '{featured}' WHERE id = 1;
```

### ANY and ALL with Arrays

```sql
-- PostgreSQL: any element equals 'sql'
SELECT title FROM posts WHERE 'sql' = ANY(tags);

-- All elements are non-empty (contrived example)
SELECT title FROM posts WHERE '' <> ALL(tags);
```

### UNNEST(): Expand Array to Rows

`UNNEST()` is incredibly useful — it "explodes" an array into individual rows so you can group, count, or join on the elements:

```sql
-- PostgreSQL: count how many posts each tag appears in
SELECT tag, COUNT(*) AS post_count
FROM posts, UNNEST(tags) AS tag
GROUP BY tag
ORDER BY post_count DESC;
```

### array_agg(): Aggregate Rows into an Array

The reverse of `UNNEST()` — collect values from multiple rows into one array:

```sql
-- PostgreSQL: get all tags per author as a single array
SELECT author_id, array_agg(DISTINCT tag ORDER BY tag) AS all_tags
FROM posts, UNNEST(tags) AS tag
GROUP BY author_id;
```

### GIN Index on Arrays

Just like with tsvector, a GIN index makes `@>`, `<@`, and `&&` fast:

```sql
-- PostgreSQL
CREATE INDEX idx_posts_tags ON posts USING GIN (tags);
```

---

## 📅 Ranges (PostgreSQL)

A **range type** stores a contiguous span of values — think "from Monday to Friday" or "seats 10 to 20". PostgreSQL has built-in range types:

| Type | Covers |
|---|---|
| `int4range` | Integer range |
| `int8range` | Bigint range |
| `numrange` | Numeric range |
| `daterange` | Date range |
| `tsrange` | Timestamp without time zone |
| `tstzrange` | Timestamp with time zone |

```sql
-- PostgreSQL: hotel reservations table
CREATE TABLE reservations (
  id SERIAL PRIMARY KEY,
  room_number INT,
  guest_name TEXT,
  stay daterange  -- e.g. [2026-07-01, 2026-07-05)
);

-- Insert a reservation: inclusive start, exclusive end (standard convention)
INSERT INTO reservations (room_number, guest_name, stay) VALUES
  (101, 'Alice', '[2026-07-01, 2026-07-05)'),
  (101, 'Bob',   '[2026-07-10, 2026-07-15)');
```

### The && Overlap Operator

The killer feature of ranges is **overlap detection** — something that would require complex date arithmetic otherwise:

```sql
-- PostgreSQL: is room 101 available for July 3–8?
SELECT *
FROM reservations
WHERE room_number = 101
  AND stay && '[2026-07-03, 2026-07-08)'::daterange;

-- Returns Alice's reservation (July 1–5 overlaps with July 3–8)
```

Other useful range operators:

| Operator | Meaning |
|---|---|
| `@>` | Range contains a point or range |
| `<@` | Range is contained by |
| `<<` | Strictly left of (no overlap, ends before other starts) |
| `>>` | Strictly right of |
| `-\|-` | Adjacent (share an endpoint) |

```sql
-- Is July 4 inside Alice's reservation?
SELECT stay @> '2026-07-04'::date FROM reservations WHERE id = 1;  -- true
```

A **GiST index** (not GIN) accelerates range queries:

```sql
CREATE INDEX idx_reservations_stay ON reservations USING GIST (stay);
```

Ranges are ideal for **scheduling**, **pricing windows**, **event planning**, and **audit period tracking** — anywhere you need "did X happen while Y was active?"

---

## 🧩 Common Extensions

PostgreSQL's extension system lets you bolt on new types, functions, and operators. Install with `CREATE EXTENSION`.

### uuid-ossp: UUID Generation

UUIDs (Universally Unique Identifiers) are 128-bit values used as primary keys when you need to generate IDs outside the database (e.g., in your application before INSERT).

```sql
-- PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Generate a UUID v4 (random)
SELECT uuid_generate_v4();
-- e.g. 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

-- Use as default primary key
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL
);
```

> **PostgreSQL 13+** ships `gen_random_uuid()` built-in (no extension needed) — prefer that for new projects.

### pgcrypto: Encryption

```sql
-- PostgreSQL
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Hash a password (bcrypt)
SELECT crypt('my_secret_password', gen_salt('bf'));

-- Verify a password
SELECT crypt('my_secret_password', stored_hash) = stored_hash AS is_valid;

-- Symmetric encryption
SELECT pgp_sym_encrypt('sensitive data', 'encryption_key');
SELECT pgp_sym_decrypt(encrypted_col, 'encryption_key') FROM secrets;
```

> **Caution:** For passwords in production, prefer doing hashing in application code (bcrypt/argon2 libraries). `pgcrypto` is useful for encrypting data fields at rest.

### PostGIS: Geographic Data

PostGIS adds geometry/geography types and spatial operators. It is the standard choice for any application dealing with maps, locations, or distances.

```sql
-- PostgreSQL + PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE locations (
  id SERIAL PRIMARY KEY,
  name TEXT,
  geom GEOMETRY(Point, 4326)  -- SRID 4326 = WGS84 (GPS coordinates)
);

-- Find all locations within 5 km of a point
SELECT name
FROM locations
WHERE ST_DWithin(
  geom::geography,
  ST_MakePoint(-73.9857, 40.7484)::geography,  -- Times Square, NYC
  5000  -- meters
);
```

PostGIS is a large topic on its own — think of it as "GIS inside your database."

### pg_trgm: Fuzzy Text Matching

Trigram matching splits text into overlapping 3-character chunks and measures similarity. It enables fast `LIKE '%substring%'` queries and typo-tolerant search.

```sql
-- PostgreSQL
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Similarity score (0 to 1)
SELECT similarity('hello', 'helo');  -- 0.444...

-- Find names that are at least 40% similar to a misspelled input
SELECT name
FROM customers
WHERE similarity(name, 'Jonatan') > 0.4
ORDER BY similarity(name, 'Jonatan') DESC;

-- GIN index makes LIKE fast (even leading wildcards!)
CREATE INDEX idx_customers_name_trgm ON customers USING GIN (name gin_trgm_ops);

-- Now this hits the index:
SELECT name FROM customers WHERE name LIKE '%natan%';
```

---

## ↔️ Lateral Joins

A **LATERAL join** lets a subquery in the `FROM` clause reference columns from tables that appear earlier in the same `FROM` clause. Think of it as "run this subquery once per row of the outer table."

The syntax differs slightly across databases:

```sql
-- PostgreSQL / MySQL 8+
... FROM outer_table, LATERAL (subquery) AS alias
-- or
... FROM outer_table JOIN LATERAL (subquery) AS alias ON true

-- SQL Server
... FROM outer_table CROSS APPLY (subquery) AS alias
-- (OUTER APPLY is the LEFT JOIN equivalent)

-- Oracle
... FROM outer_table, LATERAL (subquery) alias
```

### Use Case: Top N Rows Per Group

A classic problem — "get the 3 most recent orders for each customer." Window functions can do this, but LATERAL is often more readable and sometimes faster:

```sql
-- PostgreSQL: top 3 orders per customer
SELECT c.name, recent.*
FROM customers AS c
JOIN LATERAL (
  SELECT order_date, total_amount
  FROM orders
  WHERE orders.customer_id = c.id   -- references c from outer query
  ORDER BY order_date DESC
  LIMIT 3
) AS recent ON true;
```

Without LATERAL, you would need a window function (`ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC)`) and a wrapping subquery. LATERAL expresses the intent more directly.

### SQL Server Equivalent with CROSS APPLY

```sql
-- SQL Server
SELECT c.name, recent.order_date, recent.total_amount
FROM customers AS c
CROSS APPLY (
  SELECT TOP 3 order_date, total_amount
  FROM orders
  WHERE orders.customer_id = c.id
  ORDER BY order_date DESC
) AS recent;

-- OUTER APPLY includes customers with no orders (like LEFT JOIN)
SELECT c.name, recent.order_date
FROM customers AS c
OUTER APPLY (
  SELECT TOP 3 order_date FROM orders
  WHERE orders.customer_id = c.id
  ORDER BY order_date DESC
) AS recent;
```

### Another Use Case: Calling a Function Per Row

LATERAL is also the right tool when you have a **set-returning function** that needs a per-row argument:

```sql
-- PostgreSQL: expand each post's tags array into rows, joined back to the post
SELECT p.title, tag
FROM posts AS p
JOIN LATERAL UNNEST(p.tags) AS tag ON true;
```

---

## ✅ Key Takeaways

- **Full-text search** is far more powerful than `LIKE` — it stems words, removes stop words, ranks by relevance, and uses inverted indexes. Store a computed `tsvector` column and index it with GIN for production performance.
- **MySQL** uses `MATCH ... AGAINST` with `FULLTEXT` indexes; boolean mode supports +/- operators but no stemming.
- **SQL Server** offers `CONTAINS()` and `FREETEXT()` via its full-text catalog feature.
- **Elasticsearch** is the right tool when you need typo tolerance, faceting, or billion-document scale.
- **PostgreSQL arrays** let you model one-to-many relationships inside a single column. Use `@>` to query containment and a **GIN index** for speed. `UNNEST()` and `array_agg()` let you move freely between rows and arrays.
- **Range types** model contiguous spans elegantly. The `&&` overlap operator makes conflict detection (e.g., double-booking prevention) trivial and indexable.
- **Extensions** are plug-in superpowers: `uuid-ossp` for UUIDs, `pgcrypto` for encryption, `PostGIS` for geography, and `pg_trgm` for fuzzy text search.
- **LATERAL joins** (or `CROSS APPLY` in SQL Server) let a subquery reference the outer row, enabling clean "top N per group" queries and per-row function calls.

---

## 🧠 Quiz

**Question 1**

You have a PostgreSQL `articles` table with a `search_vector tsvector` column indexed with GIN. A user searches for posts about "running" or "jogging." Which query correctly handles both terms including their stemmed forms?

```
A) WHERE body LIKE '%running%' OR body LIKE '%jogging%'
B) WHERE search_vector @@ to_tsquery('english', 'running | jogging')
C) WHERE search_vector @@ to_tsquery('english', 'running & jogging')
D) WHERE search_vector = to_tsvector('english', 'running jogging')
```

<details>
<summary>Show answer</summary>

**B** — `|` is the OR operator in tsquery. The `'english'` configuration will stem both *running* → *run* and *jogging* → *jog*, so the query matches any document containing either root. Option A cannot use the index and does not stem. Option C requires both terms. Option D compares a vector to a vector, which is not valid search syntax.

</details>

---

**Question 2**

A hotel booking app stores reservations as `daterange` values. A new booking request arrives for `[2026-08-10, 2026-08-14)` in room 5. Which SQL correctly detects any conflicting reservation?

```sql
-- Option A
SELECT * FROM reservations
WHERE room_number = 5
  AND stay && '[2026-08-10, 2026-08-14)'::daterange;

-- Option B
SELECT * FROM reservations
WHERE room_number = 5
  AND stay = '[2026-08-10, 2026-08-14)'::daterange;

-- Option C
SELECT * FROM reservations
WHERE room_number = 5
  AND check_in < '2026-08-14' AND check_out > '2026-08-10';

-- Option D
SELECT * FROM reservations
WHERE room_number = 5
  AND stay @> '[2026-08-10, 2026-08-14)'::daterange;
```

<details>
<summary>Show answer</summary>

**A** — The `&&` (overlap) operator returns true if two ranges share any point. This correctly catches partial overlaps (e.g., an existing booking from Aug 8–12 would conflict). Option B only finds exact matches. Option C works too but requires separate date columns and no range type. Option D (`@>`) checks if the existing booking fully *contains* the new range — it would miss partial overlaps.

</details>

---

**Question 3**

You want the 2 highest-rated products in each category using a LATERAL join in PostgreSQL. Which query is correct?

```sql
-- Option A
SELECT c.category_name, top.*
FROM categories AS c
JOIN LATERAL (
  SELECT name, rating
  FROM products
  WHERE products.category_id = c.id
  ORDER BY rating DESC
  LIMIT 2
) AS top ON true;

-- Option B
SELECT c.category_name, top.*
FROM categories AS c
JOIN (
  SELECT name, rating
  FROM products
  ORDER BY rating DESC
  LIMIT 2
) AS top ON top.category_id = c.id;

-- Option C
SELECT c.category_name, top.*
FROM categories AS c
LATERAL JOIN products AS top
  ON top.category_id = c.id
ORDER BY top.rating DESC
LIMIT 2;
```

<details>
<summary>Show answer</summary>

**A** — The LATERAL subquery references `c.id` (the outer table), runs independently for each category row, and applies `LIMIT 2` per category. Option B is a plain subquery (no LATERAL) — its `LIMIT 2` applies globally, not per category, and it would not compile because `top.category_id` is not in scope. Option C has invalid syntax (`LATERAL JOIN` is not a keyword — the word order must be `JOIN LATERAL`).

</details>

---

*Next chapter: Query Optimization and EXPLAIN ANALYZE →*
