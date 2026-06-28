# 08 - Relationships and Joins Fundamentals

> **Chapter goal:** Understand how tables talk to each other, why relationships exist, and how to query data that spans multiple tables using JOINs.

---

## 🔗 Part 1: Types of Relationships

A relational database is named that way for a reason — tables are meant to *relate* to one another. Before writing a single JOIN, you need to understand *why* those relationships exist.

---

### 1️⃣ One-to-One (1:1)

**Concept:** One row in Table A corresponds to exactly one row in Table B, and vice versa.

**Real example:** `users` ↔ `user_profiles`

A user has exactly one profile. A profile belongs to exactly one user.

**When to use it:**
- You want to split a table that's getting too wide (too many columns).
- Some columns are optional or rarely queried (e.g., bio, avatar URL) — keep the hot path fast by isolating them.
- You want to enforce that sensitive data (e.g., SSN, payment info) is stored separately with tighter permissions.

**How to implement:**

```sql
CREATE TABLE users (
  id         SERIAL PRIMARY KEY,
  email      VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_profiles (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL UNIQUE,          -- UNIQUE enforces the 1:1 rule
  bio        TEXT,
  avatar_url VARCHAR(500),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

The two key ingredients are:
1. A **foreign key** (`user_id`) pointing to the parent table.
2. A **UNIQUE constraint** on that foreign key — without `UNIQUE`, this becomes a One-to-Many.

---

### 1️⃣➡️♾️ One-to-Many (1:N)

**Concept:** One row in Table A relates to *many* rows in Table B. This is the most common relationship in any database.

**Real example:** `users` → `posts`

One user writes many posts. Each post belongs to exactly one user.

**The golden rule:** The foreign key always goes on the **"many" side.**

```sql
CREATE TABLE posts (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL,               -- FK on the "many" side (posts)
  title      VARCHAR(255) NOT NULL,
  body       TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

Notice there is **no UNIQUE** on `user_id` here — that's what makes it One-to-Many instead of One-to-One. Many rows in `posts` can share the same `user_id`.

Other classic examples:
- `departments` → `employees` (one department, many employees)
- `orders` → `order_items` (one order, many line items)
- `categories` → `products`

---

### ♾️↔️♾️ Many-to-Many (M:N) — The Junction Table

**Concept:** Many rows in Table A relate to many rows in Table B.

**Real example:** `students` ↔ `courses`

A student can enroll in many courses. A course can have many students enrolled.

**The problem:** You cannot represent this with just two tables and a foreign key. There is no single "many" side to put the FK on.

**The solution:** A **junction table** (also called a bridge table, associative table, or linking table).

```sql
CREATE TABLE students (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

CREATE TABLE courses (
  id    SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL
);

-- Junction table: one row per student-course pair
CREATE TABLE enrollments (
  student_id INT NOT NULL,
  course_id  INT NOT NULL,
  enrolled_at TIMESTAMP DEFAULT NOW(),   -- extra context column
  role        VARCHAR(50) DEFAULT 'student', -- 'student', 'auditor', 'TA'
  grade       CHAR(2),
  PRIMARY KEY (student_id, course_id),   -- composite PK prevents duplicates
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id)  REFERENCES courses(id)  ON DELETE CASCADE
);
```

**What extra columns to add to a junction table:**

| Column | Why |
|---|---|
| `enrolled_at` / `created_at` | When did the relationship form? |
| `role` | Student, auditor, TA — same relationship, different context |
| `grade` | Data specific to *this* relationship, not the student or course alone |
| `status` | `active`, `withdrawn`, `completed` |

A junction table is not just a "connector" — it is a first-class entity that can hold relationship-level data.

---

### 🔄 Self-Referencing Relationship

**Concept:** A table that relates to *itself*. A row in the same table acts as both parent and child.

**Real example:** `employees` → manager (who is also an employee)

```sql
CREATE TABLE employees (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  manager_id INT,                        -- nullable: CEO has no manager
  FOREIGN KEY (manager_id) REFERENCES employees(id)
);

-- Sample data
INSERT INTO employees (id, name, manager_id) VALUES
  (1, 'Alice (CEO)',   NULL),
  (2, 'Bob (VP)',      1),
  (3, 'Carol (Dev)',   2),
  (4, 'Dave (Dev)',    2);
```

Other self-referencing examples:
- `categories` with `parent_category_id` (nested menus)
- `comments` with `parent_comment_id` (threaded replies)
- `files` and `folders` in a file system

---

## 🔀 Part 2: JOINs — Combining Tables

A **JOIN** merges rows from two or more tables based on a related column (usually a foreign key / primary key pair). Without JOINs, every query is limited to one table at a time.

Mental model: think of two tables as two lists of sticky notes. A JOIN is the process of matching them up and deciding which matched/unmatched notes to keep.

---

### INNER JOIN

**What it returns:** Only rows that have a match in **both** tables. Rows with no match on either side are dropped.

```
Table A          Table B
[ A1 ]--match--[ B1 ]  ✓ included
[ A2 ]--match--[ B2 ]  ✓ included
[ A3 ]  no match        ✗ excluded
         [ B4 ]  no match  ✗ excluded
```

**SQL:**

```sql
-- Get all posts along with the author's email
SELECT
  posts.id,
  posts.title,
  users.email AS author_email
FROM posts
INNER JOIN users ON posts.user_id = users.id;
```

**Real-world use case:** Show a list of published posts with author names. You only want posts that *have* a user — orphaned posts (no valid user) are not useful to display.

**Shorthand:** Writing just `JOIN` (without a keyword before it) defaults to `INNER JOIN`.

---

### LEFT JOIN (LEFT OUTER JOIN)

**What it returns:** **All rows from the left table**, plus matched rows from the right table. If there is no match on the right, the right-side columns are filled with `NULL`.

```
Table A          Table B
[ A1 ]--match--[ B1 ]  ✓ included (both sides have data)
[ A2 ]--match--[ B2 ]  ✓ included (both sides have data)
[ A3 ]  no match        ✓ included (right side = NULL)
         [ B4 ]  no match  ✗ excluded (not in left table)
```

**SQL:**

```sql
-- Get all users, and their posts if they have any
-- Users with zero posts still appear (posts columns = NULL)
SELECT
  users.id,
  users.email,
  posts.title AS post_title
FROM users
LEFT JOIN posts ON posts.user_id = users.id;
```

**Real-world use case:** List all users and show how many posts each has written — including users who have written zero posts (they should show `0`, not disappear from the list).

```sql
-- Count posts per user, including users with 0 posts
SELECT
  users.email,
  COUNT(posts.id) AS post_count
FROM users
LEFT JOIN posts ON posts.user_id = users.id
GROUP BY users.id, users.email;
```

**Pro tip:** To find rows that exist in the left table but NOT in the right table (orphan detection):

```sql
SELECT users.email
FROM users
LEFT JOIN posts ON posts.user_id = users.id
WHERE posts.id IS NULL;  -- users who have never posted
```

---

### RIGHT JOIN (RIGHT OUTER JOIN)

**What it returns:** The mirror image of LEFT JOIN. **All rows from the right table**, plus matched rows from the left. Left-side columns are `NULL` where no match exists.

```
Table A          Table B
[ A1 ]--match--[ B1 ]  ✓ included
[ A2 ]--match--[ B2 ]  ✓ included
[ A3 ]  no match        ✗ excluded
         [ B4 ]  no match  ✓ included (left side = NULL)
```

**SQL:**

```sql
-- Get all posts and their authors, even posts with no valid user_id
SELECT
  posts.title,
  users.email AS author_email
FROM users
RIGHT JOIN posts ON posts.user_id = users.id;
```

**Real-world use case:** Auditing orphaned data — find posts that somehow have a `user_id` pointing to a deleted or non-existent user.

**Practical note:** In practice, most developers rewrite RIGHT JOINs as LEFT JOINs by swapping the table order. The result is identical but LEFT JOINs are considered more readable and more universally supported.

---

### FULL OUTER JOIN

**What it returns:** **All rows from both tables**. Matched rows are combined; unmatched rows from either side appear with `NULL` on the missing side.

```
Table A          Table B
[ A1 ]--match--[ B1 ]  ✓ included (matched)
[ A2 ]--match--[ B2 ]  ✓ included (matched)
[ A3 ]  no match        ✓ included (B side = NULL)
         [ B4 ]  no match  ✓ included (A side = NULL)
```

**SQL (PostgreSQL / SQL Server / SQLite):**

```sql
SELECT
  users.email,
  posts.title
FROM users
FULL OUTER JOIN posts ON posts.user_id = users.id;
```

**Real-world use case:** Reconciliation — comparing two data sources to find what exists in A but not B, what exists in B but not A, and what matches in both.

---

> ⚠️ **MySQL does not support FULL OUTER JOIN.**
>
> Workaround: combine a LEFT JOIN and a RIGHT JOIN using `UNION` (which removes duplicates):
>
> ```sql
> SELECT users.email, posts.title
> FROM users
> LEFT JOIN posts ON posts.user_id = users.id
>
> UNION
>
> SELECT users.email, posts.title
> FROM users
> RIGHT JOIN posts ON posts.user_id = users.id;
> ```
>
> `UNION ALL` would keep duplicates (the matched rows would appear twice). Use `UNION` to deduplicate automatically.

---

### CROSS JOIN

**What it returns:** Every possible combination of rows from Table A and Table B. If Table A has 3 rows and Table B has 4 rows, the result has 3 × 4 = **12 rows**. This is the mathematical *Cartesian product*.

```
Table A: [A1] [A2] [A3]
Table B: [B1] [B2] [B3] [B4]

Result:
A1-B1  A1-B2  A1-B3  A1-B4
A2-B1  A2-B2  A2-B3  A2-B4
A3-B1  A3-B2  A3-B3  A3-B4
```

**SQL:**

```sql
-- Generate all possible shirt size + color combinations
SELECT
  sizes.label  AS size,
  colors.name  AS color
FROM sizes
CROSS JOIN colors;
```

**Real-world use cases:**
- Generating a product variant matrix (every size × every color).
- Building a calendar grid (every day × every time slot).
- Populating a "default" report where every combination should appear even with zero data.

**Warning:** On large tables, CROSS JOIN can produce billions of rows and crash your database. Use it intentionally and always be aware of the row counts involved.

---

### SELF JOIN

**What it returns:** A table joined to itself. You use table aliases to distinguish the "two copies."

**SQL:**

```sql
-- Show each employee alongside their manager's name
SELECT
  emp.name        AS employee,
  mgr.name        AS manager
FROM employees emp
LEFT JOIN employees mgr ON emp.manager_id = mgr.id;
```

Result:

| employee | manager |
|---|---|
| Alice (CEO) | NULL |
| Bob (VP) | Alice (CEO) |
| Carol (Dev) | Bob (VP) |
| Dave (Dev) | Bob (VP) |

The LEFT JOIN is used so that Alice (the CEO, with `manager_id = NULL`) still appears in the result. An INNER JOIN would exclude her.

**Real-world use cases:**
- Displaying org charts and reporting hierarchies.
- Comparing rows within the same table (e.g., find products cheaper than the average price of products in the same category).
- Threading: show a comment alongside its parent comment.

---

## 🧠 Quick Reference: JOIN Comparison Table

| JOIN Type | Rows from Left | Rows from Right | NULLs? |
|---|---|---|---|
| INNER JOIN | Only matched | Only matched | No |
| LEFT JOIN | All | Only matched | Right side |
| RIGHT JOIN | Only matched | All | Left side |
| FULL OUTER JOIN | All | All | Both sides |
| CROSS JOIN | All (×) | All (×) | No |
| SELF JOIN | Same table joined to itself | — | Depends on JOIN type used |

---

## 📌 Key Takeaways

1. **Relationship type determines where the FK goes.** 1:1 needs FK + UNIQUE. 1:N needs FK on the many side. M:N needs a junction table with two FKs.

2. **Junction tables are real tables.** They can (and often should) carry extra columns describing the relationship itself — timestamps, roles, grades, statuses.

3. **Self-referencing relationships** model hierarchies inside a single table. The column referencing itself is nullable (the root has no parent).

4. **INNER JOIN = intersection.** You get only what matches on both sides.

5. **LEFT JOIN = left table guaranteed.** Every row from the left appears; missing right-side data becomes NULL. This is the most frequently used JOIN after INNER.

6. **RIGHT JOIN = LEFT JOIN with tables swapped.** Most developers prefer to rewrite as LEFT JOIN for consistency.

7. **FULL OUTER JOIN = both tables guaranteed.** MySQL does not support it — use a UNION of LEFT + RIGHT instead.

8. **CROSS JOIN = combinatorial explosion.** Every row × every row. Powerful for variant generation, dangerous on large tables.

9. **SELF JOIN = a table conversing with itself.** Always use aliases. Use LEFT JOIN if the root/top-level row must be included.

---

## 🧪 Quiz

**Question 1**

You are designing a database where each `order` can contain multiple `products`, and each `product` can appear in multiple `orders`. Which relationship type is this, and what must you create to model it correctly?

<details>
<summary>Answer</summary>

This is a **Many-to-Many** relationship. You need a **junction table** — typically called `order_items` — with foreign keys pointing to both `orders` and `products`. It can also hold extra columns like `quantity` and `unit_price` (the price at the time of purchase, which may differ from the current price).

</details>

---

**Question 2**

A team writes this query to list all users and count their posts, but users with zero posts are missing from the results. What JOIN should they use, and why?

```sql
-- Broken: drops users with no posts
SELECT users.email, COUNT(posts.id) AS post_count
FROM users
INNER JOIN posts ON posts.user_id = users.id
GROUP BY users.id;
```

<details>
<summary>Answer</summary>

Replace `INNER JOIN` with **`LEFT JOIN`**. INNER JOIN excludes users who have no matching rows in `posts`. LEFT JOIN keeps all users in the result and fills `posts.id` with NULL for users with no posts. `COUNT(posts.id)` correctly returns `0` for those users because `COUNT` ignores NULL values.

</details>

---

**Question 3**

You are on MySQL and need to find all records that exist in `table_a` OR `table_b` (or both), including unmatched rows from each side. FULL OUTER JOIN is not available. How do you replicate its behavior?

<details>
<summary>Answer</summary>

Use a `UNION` of a LEFT JOIN and a RIGHT JOIN:

```sql
SELECT a.id, b.id
FROM table_a a
LEFT JOIN table_b b ON a.id = b.a_id

UNION

SELECT a.id, b.id
FROM table_a a
RIGHT JOIN table_b b ON a.id = b.a_id;
```

`UNION` (not `UNION ALL`) removes duplicate rows, so matched rows that appear in both halves of the query are deduplicated — exactly replicating FULL OUTER JOIN behavior.

</details>

---

*Next chapter: Indexes — Making Your Queries Fast*
