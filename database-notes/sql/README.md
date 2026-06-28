# SQL Mastery

A comprehensive, from-scratch guide to SQL that takes you from writing your first `SELECT` statement to mastering window functions, transactions, security, and the subtle dialect differences between PostgreSQL, MySQL, SQL Server, and Oracle. Written for developers who want real, production-applicable skills — not just toy examples.

## Table of Contents

### Part 1 — Foundations

- [01. Introduction to SQL](./01-introduction.md) — What SQL is, its history, sub-languages (DDL/DML/DQL/DCL/TCL), and setting up a local database
- [02. Creating Tables](./02-creating-tables.md) — DDL, data types, primary keys, constraints, and schema design basics
- [03. DML: INSERT, UPDATE, DELETE](./03-dml-insert-update-delete.md) — Writing and modifying data; MERGE / upsert patterns
- [04. SELECT and Querying](./04-select-querying.md) — The full SELECT statement: columns, aliases, ORDER BY, LIMIT, DISTINCT
- [05. Filtering with WHERE](./05-filtering-where.md) — Comparison operators, BETWEEN, IN, LIKE, IS NULL, logical operators

### Part 2 — Core Query Patterns

- [06. Joins](./06-joins.md) — INNER, LEFT, RIGHT, FULL OUTER, CROSS, and self-joins with visual diagrams
- [07. Aggregations](./07-aggregations.md) — GROUP BY, HAVING, COUNT/SUM/AVG/MIN/MAX, and grouping sets
- [08. Subqueries](./08-subqueries.md) — Scalar, correlated, and table subqueries; EXISTS vs IN; when to use each

### Part 3 — Programmability and Performance

- [09. Views, Stored Procedures, and Functions](./09-views-procedures-functions.md) — Encapsulating logic; materialized views; when to use each abstraction
- [10. Triggers](./10-triggers.md) — BEFORE/AFTER triggers, use cases, and pitfalls to avoid
- [11. Indexes and Performance](./11-indexes-and-performance.md) — B-Tree, composite, partial, and covering indexes; EXPLAIN/EXPLAIN ANALYZE; query planning
- [12. CTEs and Window Functions](./12-cte-window-functions.md) — WITH clauses, recursive CTEs, ROW_NUMBER/RANK/DENSE_RANK, LAG/LEAD, running totals, moving averages

### Part 4 — Advanced Topics

- [13. JSON in SQL](./13-json-in-sql.md) — Storing and querying JSON data; JSONB in PostgreSQL; JSON functions across databases
- [14. Security](./14-security.md) — GRANT/REVOKE, roles, row-level security, SQL injection defense
- [15. Transactions and Locking](./15-transactions-locking.md) — ACID properties, isolation levels, deadlocks, optimistic vs pessimistic locking
- [16. Full-Text Search and Advanced Features](./16-advanced-features.md) — Full-text search, arrays, ranges, extensions, and lateral joins (PostgreSQL-focused)
- [17. Database Comparison: PostgreSQL vs MySQL vs SQL Server vs Oracle](./17-database-comparison.md) — Side-by-side syntax reference, feature matrix, and when to pick each engine

---

## Learning Path

### Beginner — Build a solid foundation

Work through these chapters in order. By the end you will be able to read and write the SQL used in most day-to-day application development.

1. Introduction to SQL (Ch. 01)
2. Creating Tables (Ch. 02)
3. DML: INSERT, UPDATE, DELETE (Ch. 03)
4. SELECT and Querying (Ch. 04)
5. Filtering with WHERE (Ch. 05)
6. Joins (Ch. 06)
7. Aggregations (Ch. 07)
8. Subqueries (Ch. 08)

### Intermediate — Level up to production SQL

These chapters cover the patterns used in real applications and data pipelines.

9. Views, Stored Procedures, and Functions (Ch. 09)
10. Triggers (Ch. 10)
11. Indexes and Performance (Ch. 11)
12. CTEs and Window Functions (Ch. 12)

### Advanced — Expert-level and database-specific knowledge

Tackle these once you are comfortable with the intermediate material. Each chapter is largely standalone.

13. JSON in SQL (Ch. 13)
14. Security (Ch. 14)
15. Transactions and Locking (Ch. 15)
16. Full-Text Search and Advanced Features (Ch. 16)
17. Database Comparison Reference (Ch. 17)

---

## What You'll Learn

- Write confident `SELECT` queries with joins, filters, aggregations, and subqueries
- Design normalized schemas with appropriate data types, constraints, and foreign keys
- Insert, update, and delete data safely, including upsert patterns
- Use views, stored procedures, and user-defined functions to encapsulate reusable logic
- Create and maintain indexes to dramatically speed up slow queries
- Read and interpret `EXPLAIN` / `EXPLAIN ANALYZE` output to diagnose query plans
- Write CTEs to break complex queries into readable, debuggable steps
- Use window functions (ROW_NUMBER, RANK, LAG, LEAD, running SUM) for analytics
- Understand ACID guarantees and choose the right transaction isolation level
- Protect your database with roles, grants, row-level security, and parameterized queries
- Query and store JSON documents inside relational tables
- Navigate dialect differences between PostgreSQL, MySQL, SQL Server, and Oracle

---

## Prerequisites

- Basic comfort with any programming language (you do not need to be an expert)
- Familiarity with the concept of tables and rows (spreadsheet-level understanding is enough)
- A database to run examples against — the introduction chapter walks you through setting one up in under five minutes

---

## How to Use This Guide

1. **Run every example.** Reading SQL without running it builds much less intuition than seeing a real result set. Use SQLite for zero-setup, or spin up PostgreSQL with Docker as shown in Chapter 01.
2. **Follow the beginner path first, even if you have some SQL experience.** Later chapters assume vocabulary and patterns introduced in earlier ones.
3. **Do the quizzes.** Each chapter ends with 2-3 multiple-choice questions that catch the subtleties most people gloss over on a first read.
4. **Use Chapter 17 as a reference.** Once you are comfortable with the concepts, bookmark the database comparison chapter — it is the fastest way to translate syntax when you switch between engines.
5. **Modify the examples.** Change a WHERE clause, add a column, break a query intentionally. The fastest way to understand what a query does is to see how it fails when you push it in the wrong direction.

---

SQL has been the dominant language for working with data for over 50 years — and the investment you make here will pay dividends across every stack, every framework, and every job title you encounter. Let's get started.
