# DML & CRUD Operations

Data Manipulation Language (DML) is how your application actually talks to the database — inserting records, querying them, updating values, and deleting rows. This section covers every core CRUD operation in PostgreSQL with practical syntax, real examples, and the transaction model that keeps your data consistent.

## Table of Contents

### Part 1 — Writing Data
- [01. INSERT Operations](./01-insert.md) — single-row, multi-row, UPSERT, RETURNING, and bulk COPY
- [03. UPDATE and DELETE](./03-update-delete.md) — modifying and removing rows safely, including join-based updates and TRUNCATE

### Part 2 — Reading Data
- [02. SELECT Basics](./02-select-basics.md) — column selection, aliases, DISTINCT, ORDER BY, LIMIT/OFFSET
- [04. Filtering Operators](./04-filtering-operators.md) — IN, BETWEEN, LIKE, ILIKE, regex, NULL testing, EXISTS

### Part 3 — Data Integrity
- [05. Transactions](./05-transactions.md) — ACID properties, isolation levels, BEGIN/COMMIT/ROLLBACK, concurrency issues

## Learning Path

**Beginner** — Start here if SQL is new to you:
1. SELECT Basics (`02-select-basics.md`) — learn to read before you write
2. INSERT Operations (`01-insert.md`) — add your first rows
3. UPDATE and DELETE (`03-update-delete.md`) — modify and clean up data

**Intermediate** — Once you are comfortable with basic CRUD:
4. Filtering Operators (`04-filtering-operators.md`) — write precise, expressive WHERE clauses
5. Transactions (`05-transactions.md`) — group operations into safe, atomic units

**Advanced** — Go deeper inside each file:
- UPSERT with `ON CONFLICT DO UPDATE` (INSERT chapter)
- Join-based updates with `UPDATE ... FROM` (UPDATE chapter)
- `EXISTS` vs `IN` performance trade-offs (Filtering chapter)
- Isolation levels and serialization failures (Transactions chapter)

## What You'll Learn

- How to insert single rows, multiple rows, and bulk data with `COPY`
- Using `RETURNING` to get back auto-generated IDs and computed values without a second query
- Handling duplicate keys gracefully with `ON CONFLICT` (UPSERT pattern)
- Writing `SELECT` queries with aliases, `DISTINCT`, sorting, and pagination
- Updating rows conditionally and via joins with `UPDATE ... FROM`
- Deleting safely with `WHERE` clauses, join-based `DELETE ... USING`, and `TRUNCATE` for full resets
- Building expressive filters using `IN`, `BETWEEN`, `LIKE`/`ILIKE`, regular expressions, and `IS NULL`
- Understanding the ACID guarantees that make database transactions reliable
- Choosing the right transaction isolation level (`READ COMMITTED`, `REPEATABLE READ`, `SERIALIZABLE`) for your concurrency needs
- Recognizing and preventing common concurrency bugs: dirty reads, non-repeatable reads, and phantom reads

## Prerequisites

- You should have PostgreSQL installed and be able to connect with `psql` or a GUI client
- Familiarity with what tables, columns, rows, and data types are (covered in earlier sections of this repo)
- Basic understanding of how a relational schema is structured — knowing what a primary key and a foreign key do is enough to start

## How to Use This Guide

1. **Run every example yourself.** Each file includes working SQL you can paste directly into `psql`. Seeing the output makes the concept click faster than reading alone.
2. **Do the practice exercises.** Every chapter ends with exercises — treat them as mini-challenges, not optional extras. They reinforce the edge cases that trip up real developers.
3. **Read the "Common Mistakes" sections closely.** Missing a `WHERE` on a `DELETE`, or using `NOT IN` with a nullable column, are bugs that reach production. These sections save you that pain.
4. **Follow the "Best Practices" sections when writing real code.** Tips like always using explicit column lists in `INSERT` and wrapping multi-step writes in a transaction apply directly to production SQL.
5. **Revisit the Transactions chapter after writing any multi-step logic.** If your application does more than one write to complete a single business action, you need a transaction — period.

Solid DML skills are the foundation of everything else in SQL — master these operations and the rest of PostgreSQL will feel approachable.
