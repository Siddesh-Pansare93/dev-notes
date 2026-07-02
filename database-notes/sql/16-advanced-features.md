# 🔍 Chapter 16: Full-Text Search aur Advanced Features

> **Yeh chapter kiske liye hai:** Tumhe SQL basics aa chuke hain — SELECT, JOIN, GROUP BY — aur ab tum woh powerful features explore karna chahte ho jo ek production-grade database ko toy database se alag karte hain. Is chapter mein full-text search, arrays, ranges, extensions, aur lateral joins cover honge. Zyadatar examples PostgreSQL ke honge, aur jahan MySQL, SQL Server, ya Oracle alag behave karte hain wahan clearly bataya gaya hai.

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

Socho tumhare paas ek Zomato jaisa app hai jisme users restaurants search karte hain. Agar tum sirf `LIKE '%keyword%'` use karoge, toh chhote table ke liye theek chalega — lekin teen badi problems aayengi:

1. Results ko relevance ke hisaab se rank nahi kar sakte (kaunsa result "best match" hai, pata nahi).
2. Word forms ignore ho jaate hain — *run* search karoge toh *running* wale results nahi milenge.
3. Index efficiently use nahi ho paata, matlab bade table pe slow ho jaayega.

**Full-text search** in teeno problems ko solve karta hai — yeh Zomato ke search bar ke andar jo magic hota hai, wahi hai.

Har database ka apna approach hai. Pehle high-level comparison dekh lete hain:

| Feature | PostgreSQL | MySQL | SQL Server |
|---|---|---|---|
| Index type | GIN on tsvector | FULLTEXT index | Full-Text catalog |
| Query syntax | `@@` operator | `MATCH ... AGAINST` | `CONTAINS()` / `FREETEXT()` |
| Relevance ranking | `ts_rank()` | Built-in score | `CONTAINSTABLE` |
| Highlighting | `ts_headline()` | Manual | Manual |

---

### PostgreSQL Full-Text Search

PostgreSQL ka built-in full-text engine sabse capable hai. Do special types iski power hain:

| Type | Purpose |
|---|---|
| `tsvector` | Ek pre-processed, sorted list of lexemes (root word forms) with position info |
| `tsquery` | Ek search query jo `&` (AND), `\|` (OR), `!` (NOT), aur `<->` (phrase) operators use kar sakti hai |

#### Text ko tsvector mein convert karna

**Kya hota hai?** `to_tsvector()` tumhare text ko lekar usme se stop words (the, is, over jaise words) hata deta hai aur baaki words ko unke root form mein convert kar deta hai — isse "stemming" kehte hain.

```sql
-- PostgreSQL
SELECT to_tsvector('english', 'The quick brown fox jumps over the lazy dog');
-- Result: 'brown':3 'dog':9 'fox':4 'jump':5 'lazi':8 'quick':2
-- Notice: stop words ("the", "over") hata diye gaye; words stem kiye gaye ("jumps" -> "jump")
```

Pehla argument `'english'` hai **text search configuration** — yeh decide karta hai ki kaunsi language dictionary aur stop-word list use hogi.

#### tsquery se search karna

```sql
-- PostgreSQL
SELECT to_tsquery('english', 'jump & fox');
-- Result: 'jump' & 'fox'

-- Phrase search (fox ke turant baad jump aana chahiye)
SELECT to_tsquery('english', 'fox <-> jump');

-- OR search
SELECT to_tsquery('english', 'cat | dog');
```

#### @@ Match Operator

`@@` operator `true` return karta hai jab `tsvector`, `tsquery` se match ho jaaye:

```sql
-- PostgreSQL
SELECT title
FROM articles
WHERE to_tsvector('english', body) @@ to_tsquery('english', 'database & performance');
```

Yeh kaam toh karta hai, lekin har row pe query time pe `to_tsvector()` call karna bade table ke liye slow hai — jaise Swiggy har order pe restaurant ka poora menu re-scan kare, instead of ek indexed list use karne ke.

#### Performance ke liye Stored tsvector Column

**Kyun zaruri hai?** Production mein recommended pattern yeh hai ki tsvector ko ek dedicated column mein store karo aur trigger se usko fresh rakho — bilkul waise jaise Swiggy apne search index ko background mein update karta rehta hai, har request pe recompute nahi karta.

```sql
-- PostgreSQL

-- 1. Column add karo
ALTER TABLE articles ADD COLUMN search_vector tsvector;

-- 2. Usse populate karo
UPDATE articles
SET search_vector = to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body, ''));

-- 3. Ek trigger banao jo isse fresh rakhe
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

#### tsvector pe GIN Index

Ek **GIN** (Generalized Inverted Index) `@@` operator ko lakhon rows pe bhi fast banata hai:

```sql
-- PostgreSQL
CREATE INDEX idx_articles_search ON articles USING GIN (search_vector);

-- Ab yeh query index hit karegi:
SELECT title
FROM articles
WHERE search_vector @@ to_tsquery('english', 'database & performance');
```

#### ts_rank() se Relevance Ranking

`ts_rank()` ek `float4` score deta hai jo batata hai ki query terms kitni baar aur kitni prominently appear hue hain — jaise Amazon "best match" ke hisaab se products sort karta hai:

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

#### ts_headline() se Highlighting

`ts_headline()` matched terms ko HTML tags mein wrap kar deta hai (search result snippets ke liye perfect — jaise Google search mein bold keywords dikhte hain):

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

MySQL mein ek `FULLTEXT` index chahiye hi hota hai — uske bina full-text search possible nahi.

```sql
-- MySQL: Table banate waqt FULLTEXT index add karo
CREATE TABLE articles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255),
  body TEXT,
  FULLTEXT idx_ft (title, body)
);

-- Ya baad mein add karo:
ALTER TABLE articles ADD FULLTEXT INDEX idx_ft (title, body);
```

#### MATCH ... AGAINST Syntax

```sql
-- MySQL: Natural Language Mode (default)
-- Relevance ke hisaab se rank karta hai; common words ignore ho jaate hain
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

**PostgreSQL se key difference:** MySQL ka full-text search words ko stem nahi karta (*run* search karoge toh *running* match nahi hoga) aur minimum word length default 4 characters hoti hai.

---

### SQL Server Full-Text Search

SQL Server full-text search ko ek separate installable feature ki tarah treat karta hai. Ek baar enable ho jaaye, toh do main functions available hote hain:

```sql
-- SQL Server

-- CONTAINS: structured predicate with AND, OR, NOT, NEAR, wildcards
SELECT title
FROM articles
WHERE CONTAINS((title, body), '"database" AND "performance"');

-- Wildcard
WHERE CONTAINS(body, '"datab*"');

-- FREETEXT: natural language, zyada forgiving (auto-stems and expands)
SELECT title
FROM articles
WHERE FREETEXT(body, 'database performance tuning');
```

`CONTAINSTABLE` aur `FREETEXTTABLE` ek table return karte hain jisme `RANK` column hota hai relevance ordering ke liye — bilkul PostgreSQL ke `ts_rank()` jaisa.

---

### Jab SQL Full-Text Search Kaafi Nahi Hai

Built-in full-text search common cases ke liye theek hai, lekin **Elasticsearch** (ya **OpenSearch**) consider karo jab tumhe yeh chahiye:

- Ek hi index mein dozens languages ka multi-language stemming
- Typo-tolerant fuzzy matching (`fliht` type karne pe bhi `flight` match ho jaaye)
- Faceted search (category, price range jaise filters keyword search ke saath)
- Billions documents pe distributed search, sub-second response ke saath
- Custom ranking formulas jisme textual relevance ke saath business signals bhi mix ho

Elasticsearch ko usually relational database ke saath use kiya jaata hai — jaise Flipkart ka main database source of truth hoga, aur Elasticsearch unke search bar ko power karega, super fast.

---

## 📦 Arrays (PostgreSQL)

PostgreSQL tumhe ek single column mein ordered list of values store karne deta hai. Yeh genuinely useful hai — jaise ek blog post ke tags store karna, bina separate junction table banaye.

```sql
-- PostgreSQL: array column ke saath table banao
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  title TEXT,
  tags TEXT[]
);

-- Array literal ke saath insert karo
INSERT INTO posts (title, tags) VALUES
  ('Intro to SQL', ARRAY['sql', 'beginner', 'database']),
  ('PostgreSQL Arrays', '{postgresql, arrays, advanced}');  -- alternative syntax
```

### Array Operators

| Operator | Meaning | Example |
|---|---|---|
| `@>` | Contains (left, right ke saare elements contain karta hai) | `tags @> '{sql}'` |
| `<@` | Is contained by | `'{sql}' <@ tags` |
| `&&` | Overlap (kam se kam ek element common ho) | `tags && '{sql, python}'` |
| `\|\|` | Concatenate | `tags \|\| '{new-tag}'` |

```sql
-- PostgreSQL: posts jinme 'sql' AUR 'beginner' dono tags hain
SELECT title FROM posts WHERE tags @> ARRAY['sql', 'beginner'];

-- Posts jinme 'sql' YA 'python' hai (koi bhi overlap)
SELECT title FROM posts WHERE tags && ARRAY['sql', 'python'];

-- Ek tag add karo
UPDATE posts SET tags = tags || '{featured}' WHERE id = 1;
```

### Arrays ke saath ANY aur ALL

```sql
-- PostgreSQL: koi bhi element 'sql' ke equal ho
SELECT title FROM posts WHERE 'sql' = ANY(tags);

-- Saare elements non-empty hain (contrived example)
SELECT title FROM posts WHERE '' <> ALL(tags);
```

### UNNEST(): Array ko Rows mein Expand Karna

`UNNEST()` bahut hi useful hai — yeh ek array ko individual rows mein "explode" kar deta hai, taaki tum elements pe group, count, ya join kar sako.

```sql
-- PostgreSQL: count karo har tag kitne posts mein appear hota hai
SELECT tag, COUNT(*) AS post_count
FROM posts, UNNEST(tags) AS tag
GROUP BY tag
ORDER BY post_count DESC;
```

### array_agg(): Rows ko Array mein Aggregate Karna

`UNNEST()` ka ulta — multiple rows se values collect karke ek array bana do:

```sql
-- PostgreSQL: har author ke saare tags ek single array mein
SELECT author_id, array_agg(DISTINCT tag ORDER BY tag) AS all_tags
FROM posts, UNNEST(tags) AS tag
GROUP BY author_id;
```

### Arrays pe GIN Index

Bilkul tsvector jaisa, GIN index `@>`, `<@`, aur `&&` ko fast banata hai:

```sql
-- PostgreSQL
CREATE INDEX idx_posts_tags ON posts USING GIN (tags);
```

---

## 📅 Ranges (PostgreSQL)

Ek **range type** values ka ek contiguous span store karta hai — jaise "Monday se Friday tak" ya "seat 10 se 20 tak." PostgreSQL mein built-in range types hain:

| Type | Kya Cover Karta Hai |
|---|---|
| `int4range` | Integer range |
| `int8range` | Bigint range |
| `numrange` | Numeric range |
| `daterange` | Date range |
| `tsrange` | Timestamp without time zone |
| `tstzrange` | Timestamp with time zone |

Socho tum OYO ke liye ek hotel booking system bana rahe ho — har room ke reservations ka ek date range hoga:

```sql
-- PostgreSQL: hotel reservations table
CREATE TABLE reservations (
  id SERIAL PRIMARY KEY,
  room_number INT,
  guest_name TEXT,
  stay daterange  -- e.g. [2026-07-01, 2026-07-05)
);

-- Reservation insert karo: start inclusive, end exclusive (standard convention)
INSERT INTO reservations (room_number, guest_name, stay) VALUES
  (101, 'Alice', '[2026-07-01, 2026-07-05)'),
  (101, 'Bob',   '[2026-07-10, 2026-07-15)');
```

### && Overlap Operator

Ranges ka killer feature hai **overlap detection** — jo without ranges karna complex date arithmetic maangta:

```sql
-- PostgreSQL: kya room 101, July 3–8 ke liye available hai?
SELECT *
FROM reservations
WHERE room_number = 101
  AND stay && '[2026-07-03, 2026-07-08)'::daterange;

-- Returns Alice ka reservation (July 1–5, July 3–8 se overlap karta hai)
```

Baaki useful range operators:

| Operator | Meaning |
|---|---|
| `@>` | Range ek point ya range ko contain karta hai |
| `<@` | Range kisi doosre range se contained hai |
| `<<` | Strictly left of (koi overlap nahi, doosre ke start se pehle end hota hai) |
| `>>` | Strictly right of |
| `-\|-` | Adjacent (ek endpoint share karte hain) |

```sql
-- Kya July 4, Alice ke reservation ke andar hai?
SELECT stay @> '2026-07-04'::date FROM reservations WHERE id = 1;  -- true
```

Range queries ko fast banane ke liye **GiST index** (GIN nahi) use hota hai:

```sql
CREATE INDEX idx_reservations_stay ON reservations USING GIST (stay);
```

Ranges perfect hain **scheduling**, **pricing windows**, **event planning**, aur **audit period tracking** ke liye — jahan bhi tumhe "kya X hua tha jab Y active tha?" jaisa sawal poochna ho.

---

## 🧩 Common Extensions

PostgreSQL ka extension system tumhe naye types, functions, aur operators bolt-on karne deta hai. `CREATE EXTENSION` se install karo.

### uuid-ossp: UUID Generation

UUIDs (Universally Unique Identifiers) 128-bit values hote hain jo primary keys ke liye use hote hain jab tumhe database ke bahar (application code mein, INSERT se pehle) IDs generate karni ho.

```sql
-- PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- UUID v4 generate karo (random)
SELECT uuid_generate_v4();
-- e.g. 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

-- Default primary key ki tarah use karo
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL
);
```

> [!tip]
> **PostgreSQL 13+** mein `gen_random_uuid()` built-in hi aata hai (koi extension nahi chahiye) — naye projects ke liye usi ko prefer karo.

### pgcrypto: Encryption

```sql
-- PostgreSQL
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Password hash karo (bcrypt)
SELECT crypt('my_secret_password', gen_salt('bf'));

-- Password verify karo
SELECT crypt('my_secret_password', stored_hash) = stored_hash AS is_valid;

-- Symmetric encryption
SELECT pgp_sym_encrypt('sensitive data', 'encryption_key');
SELECT pgp_sym_decrypt(encrypted_col, 'encryption_key') FROM secrets;
```

> [!warning]
> Production mein passwords ke liye application code mein hashing (bcrypt/argon2 libraries) prefer karo. `pgcrypto` data fields ko at rest encrypt karne ke liye useful hai, passwords ke liye nahi.

### PostGIS: Geographic Data

PostGIS geometry/geography types aur spatial operators add karta hai. Yeh standard choice hai kisi bhi application ke liye jo maps, locations, ya distances handle karti hai — jaise Ola/Uber ka nearest-driver-dhundo wala logic.

```sql
-- PostgreSQL + PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE locations (
  id SERIAL PRIMARY KEY,
  name TEXT,
  geom GEOMETRY(Point, 4326)  -- SRID 4326 = WGS84 (GPS coordinates)
);

-- Ek point ke 5 km radius ke andar saari locations dhundo
SELECT name
FROM locations
WHERE ST_DWithin(
  geom::geography,
  ST_MakePoint(-73.9857, 40.7484)::geography,  -- Times Square, NYC
  5000  -- meters
);
```

PostGIS apne aap mein ek bada topic hai — isse "GIS database ke andar" samjho.

### pg_trgm: Fuzzy Text Matching

Trigram matching text ko overlapping 3-character chunks mein todta hai aur similarity measure karta hai. Isse fast `LIKE '%substring%'` queries aur typo-tolerant search possible hoti hai — jaise Amazon search mein tum "moble" type karo toh bhi "mobile" wale results aa jaate hain.

```sql
-- PostgreSQL
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Similarity score (0 se 1 ke beech)
SELECT similarity('hello', 'helo');  -- 0.444...

-- Woh names dhundo jo misspelled input se kam se kam 40% similar hain
SELECT name
FROM customers
WHERE similarity(name, 'Jonatan') > 0.4
ORDER BY similarity(name, 'Jonatan') DESC;

-- GIN index LIKE ko fast banata hai (leading wildcards ke saath bhi!)
CREATE INDEX idx_customers_name_trgm ON customers USING GIN (name gin_trgm_ops);

-- Ab yeh query index hit karti hai:
SELECT name FROM customers WHERE name LIKE '%natan%';
```

---

## ↔️ Lateral Joins

Ek **LATERAL join** `FROM` clause ke andar ek subquery ko us same `FROM` clause mein pehle aayi tables ke columns reference karne deta hai. Isse "har row ke liye yeh subquery ek baar run karo" samjho.

Syntax har database mein thoda alag hai:

```sql
-- PostgreSQL / MySQL 8+
... FROM outer_table, LATERAL (subquery) AS alias
-- ya
... FROM outer_table JOIN LATERAL (subquery) AS alias ON true

-- SQL Server
... FROM outer_table CROSS APPLY (subquery) AS alias
-- (OUTER APPLY, LEFT JOIN ka equivalent hai)

-- Oracle
... FROM outer_table, LATERAL (subquery) alias
```

### Use Case: Har Group Mein Top N Rows

Ek classic problem — "har customer ke 3 sabse recent orders lao." Window functions bhi yeh kar sakte hain, lekin LATERAL aksar zyada readable aur kabhi kabhi faster hota hai — jaise CRED app mein tumhe har card ke last 3 transactions dikhane hon:

```sql
-- PostgreSQL: har customer ke top 3 orders
SELECT c.name, recent.*
FROM customers AS c
JOIN LATERAL (
  SELECT order_date, total_amount
  FROM orders
  WHERE orders.customer_id = c.id   -- outer query ke c ko reference karta hai
  ORDER BY order_date DESC
  LIMIT 3
) AS recent ON true;
```

LATERAL ke bina, tumhe window function (`ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC)`) aur ek wrapping subquery chahiye hoti. LATERAL intent ko zyada directly express karta hai.

### SQL Server Equivalent — CROSS APPLY

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

-- OUTER APPLY un customers ko bhi include karta hai jinke koi orders nahi hain (LEFT JOIN jaisa)
SELECT c.name, recent.order_date
FROM customers AS c
OUTER APPLY (
  SELECT TOP 3 order_date FROM orders
  WHERE orders.customer_id = c.id
  ORDER BY order_date DESC
) AS recent;
```

### Ek Aur Use Case: Har Row Pe Function Call Karna

LATERAL sahi tool hai jab tumhare paas ek **set-returning function** ho jisme per-row argument chahiye:

```sql
-- PostgreSQL: har post ke tags array ko rows mein expand karo, post ke saath joined
SELECT p.title, tag
FROM posts AS p
JOIN LATERAL UNNEST(p.tags) AS tag ON true;
```

---

## ✅ Key Takeaways

- **Full-text search**, `LIKE` se kahin zyada powerful hai — yeh words ko stem karta hai, stop words hataata hai, relevance ke hisaab se rank karta hai, aur inverted indexes use karta hai. Production performance ke liye ek computed `tsvector` column store karo aur usse GIN se index karo.
- **MySQL**, `MATCH ... AGAINST` ke saath `FULLTEXT` indexes use karta hai; boolean mode +/- operators support karta hai lekin stemming nahi karta.
- **SQL Server** apne full-text catalog feature ke through `CONTAINS()` aur `FREETEXT()` deta hai.
- **Elasticsearch** sahi tool hai jab tumhe typo tolerance, faceting, ya billion-document scale chahiye ho.
- **PostgreSQL arrays** ek single column ke andar one-to-many relationships model karne dete hain. Containment query ke liye `@>` use karo aur speed ke liye **GIN index** lagao. `UNNEST()` aur `array_agg()` se tum rows aur arrays ke beech free move kar sakte ho.
- **Range types** contiguous spans ko elegantly model karte hain. `&&` overlap operator conflict detection (jaise double-booking rokna) ko trivial aur indexable bana deta hai.
- **Extensions** plug-in superpowers hain: UUIDs ke liye `uuid-ossp`, encryption ke liye `pgcrypto`, geography ke liye `PostGIS`, aur fuzzy text search ke liye `pg_trgm`.
- **LATERAL joins** (SQL Server mein `CROSS APPLY`) ek subquery ko outer row reference karne dete hain, jisse clean "top N per group" queries aur per-row function calls possible hote hain.

---

## 🧠 Quiz

**Question 1**

Tumhare paas ek PostgreSQL `articles` table hai jisme `search_vector tsvector` column hai jo GIN se indexed hai. Ek user "running" ya "jogging" ke posts search karta hai. Kaunsi query dono terms ko unke stemmed forms samet correctly handle karti hai?

```
A) WHERE body LIKE '%running%' OR body LIKE '%jogging%'
B) WHERE search_vector @@ to_tsquery('english', 'running | jogging')
C) WHERE search_vector @@ to_tsquery('english', 'running & jogging')
D) WHERE search_vector = to_tsvector('english', 'running jogging')
```

<details>
<summary>Show answer</summary>

**B** — tsquery mein `|` OR operator hai. `'english'` configuration dono *running* → *run* aur *jogging* → *jog* stem kar dega, isliye query kisi bhi document ko match karegi jisme koi bhi root word ho. Option A index use nahi kar sakta aur stemming bhi nahi karta. Option C mein dono terms chahiye hote hain. Option D ek vector ko vector se compare kar raha hai, jo valid search syntax nahi hai.

</details>

---

**Question 2**

Ek hotel booking app reservations ko `daterange` values ki tarah store karta hai. Room 5 ke liye `[2026-08-10, 2026-08-14)` ki nayi booking request aati hai. Kaunsi SQL correctly conflicting reservation detect karegi?

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

**A** — `&&` (overlap) operator `true` return karta hai agar do ranges koi bhi point share karte hon. Yeh partial overlaps ko bhi correctly catch karta hai (jaise Aug 8–12 ki existing booking conflict karegi). Option B sirf exact matches dhundta hai. Option C bhi kaam karta hai lekin usme separate date columns chahiye, range type nahi. Option D (`@>`) check karta hai ki existing booking naye range ko fully *contain* karti hai ya nahi — yeh partial overlaps miss kar dega.

</details>

---

**Question 3**

Tumhe PostgreSQL mein LATERAL join use karke har category ke 2 highest-rated products chahiye. Kaunsi query correct hai?

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

**A** — LATERAL subquery `c.id` (outer table) ko reference karti hai, har category row ke liye independently run hoti hai, aur `LIMIT 2` per category apply hota hai. Option B ek plain subquery hai (LATERAL nahi) — iska `LIMIT 2` globally apply hoga, per category nahi, aur yeh compile bhi nahi hoga kyunki `top.category_id` scope mein hi nahi hai. Option C ka syntax invalid hai (`LATERAL JOIN` koi keyword nahi hai — sahi order `JOIN LATERAL` hona chahiye).

</details>

---

*Next chapter: Query Optimization aur EXPLAIN ANALYZE →*
