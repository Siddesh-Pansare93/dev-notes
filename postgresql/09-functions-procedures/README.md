# Functions & Stored Procedures

PostgreSQL lets you push logic directly into the database — this section teaches you how to write reusable functions, procedural code, triggers, and custom types. It is for developers who want to move beyond basic queries and harness the full power of server-side programming in PostgreSQL.

## Table of Contents

### Part 1 — Writing Functions
- [01 — SQL Functions](./01-sql-functions.md) — Pure SQL functions, volatility levels, parameter modes, return types, overloading, and PARALLEL SAFE
- [02 — PL/pgSQL](./02-plpgsql.md) — Variables, control flow, loops, exception handling, dynamic SQL with `EXECUTE`/`format()`

### Part 2 — Procedures and Automation
- [03 — Stored Procedures](./03-stored-procedures.md) — Transaction control inside procedures, `CALL`, `COMMIT`/`ROLLBACK` within procedural code
- [04 — Triggers](./04-triggers.md) — BEFORE/AFTER/INSTEAD OF triggers, row-level vs statement-level, audit logging, timestamp management, cascading updates

### Part 3 — Extending PostgreSQL
- [05 — Custom Operators & Types](./05-custom-operators-types.md) — Composite types, domain types, enums, operator classes, and extending PostgreSQL's type system

## Learning Path

**Beginner** — start here if you have not written database functions before
1. Chapter 01 — SQL Functions (volatility, parameter modes, simple return types)
2. Chapter 02 — PL/pgSQL basics (variables, IF/CASE, simple loops)

**Intermediate** — for developers comfortable with SQL who want procedural power
1. Chapter 02 — PL/pgSQL advanced (exception handling, dynamic SQL, `RETURN QUERY`)
2. Chapter 03 — Stored Procedures (when to use procedures vs functions, transaction control)
3. Chapter 04 — Triggers (timestamps, audit logs, data validation)

**Advanced** — for those building production-grade database architecture
1. Chapter 04 — Triggers advanced (denormalization, INSTEAD OF triggers on views, event triggers for DDL)
2. Chapter 05 — Custom Operators & Types (domain modeling at the database level, operator overloading)

## What You'll Learn

- How to choose between SQL functions and PL/pgSQL functions — and why it matters for query planning
- Volatility categories (`IMMUTABLE`, `STABLE`, `VOLATILE`) and how they affect optimization and caching
- Parameter modes: `IN`, `OUT`, `INOUT`, `VARIADIC`, and function overloading
- Return types: scalar values, `RETURNS TABLE`, `RETURNS SETOF`, composite types
- PL/pgSQL control flow: `IF`/`ELSIF`/`ELSE`, `CASE`, `LOOP`, `WHILE`, `FOR`, `FOREACH`
- Exception handling with `BEGIN`/`EXCEPTION` blocks, `RAISE`, and `GET STACKED DIAGNOSTICS`
- Safe dynamic SQL using `EXECUTE` with `format()` specifiers (`%I`, `%L`, `%s`) to prevent injection
- Stored procedures with `COMMIT` and `ROLLBACK` inside procedural code
- Trigger timing and level: `BEFORE`/`AFTER`/`INSTEAD OF`, `FOR EACH ROW`/`FOR EACH STATEMENT`
- Trigger special variables: `NEW`, `OLD`, `TG_OP`, `TG_TABLE_NAME`, `TG_WHEN`
- Common trigger patterns: automatic `updated_at`, audit trails, validation, denormalized summaries
- Event triggers that fire on DDL changes (`CREATE`, `ALTER`, `DROP`)
- Custom composite types, domain types with constraints, enum types, and custom operators

## Prerequisites

- Solid understanding of SQL: `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `JOIN`, aggregations
- Familiarity with PostgreSQL data types (text, numeric, integer, boolean, date/timestamp, jsonb)
- Basic understanding of transactions and how `BEGIN`/`COMMIT`/`ROLLBACK` work
- Awareness of indexes and query planning is helpful but not required

## How to Use This Guide

1. **Run the examples yourself.** Every file contains copy-paste-ready SQL with expected output in comments. The fastest way to learn is to execute each block and observe the results in your own database.
2. **Start with SQL functions before jumping to PL/pgSQL.** Simple SQL functions can be inlined by the query planner — reaching for PL/pgSQL too early costs performance. Know when each is appropriate.
3. **Pay close attention to the "Common Mistakes" sections.** Each chapter calls out the errors that appear most frequently in real codebases — wrong volatility classification, missing `FOUND` checks, SQL injection in dynamic queries, and trigger infinite loops.
4. **Do the practice exercises.** Each chapter ends with exercises that combine concepts from that chapter. Attempting them before reading the solutions builds stronger intuition than just reading examples.
5. **Cross-reference the chapters.** Triggers rely on PL/pgSQL functions; procedures build on the function concepts from chapters 01 and 02. The chapters are ordered to build on each other — the summaries at the end of each file tell you exactly which chapter to read next.

The ability to write clean, correct server-side code is what separates a developer who uses PostgreSQL from one who truly understands it — start building that skill here.
