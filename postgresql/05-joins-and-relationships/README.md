# Joins & Relationships

Master the art of combining data across tables in PostgreSQL — from everyday INNER and LEFT joins through to correlated subqueries, set operations, and the powerful LATERAL join. This section is for developers who understand basic SELECT queries and are ready to write the multi-table queries that real applications depend on.

## Table of Contents

1. [Joins](./01-joins.md) — INNER, LEFT, RIGHT, FULL OUTER, CROSS, and SELF joins with visual diagrams and worked examples
2. [Subqueries](./02-subqueries.md) — Scalar, row, table, correlated, and non-correlated subqueries; EXISTS vs IN; when to choose a subquery over a join
3. [Set Operations](./03-set-operations.md) — UNION, UNION ALL, INTERSECT, and EXCEPT; column-matching rules and performance trade-offs
4. [LATERAL Joins](./04-lateral-joins.md) — Row-by-row correlated subqueries in FROM; top-N-per-group patterns and replacing complex CTEs

## Learning Path

**Beginner** — start here if multi-table queries are new to you
1. Chapter 1 — Joins (INNER JOIN and LEFT JOIN sections)
2. Chapter 3 — Set Operations (UNION and UNION ALL)
3. Chapter 2 — Subqueries (scalar subqueries and the WHERE clause examples)

**Intermediate** — you can write joins but want to level up
1. Chapter 1 — revisit RIGHT, FULL OUTER, CROSS, and SELF joins
2. Chapter 2 — correlated subqueries, EXISTS vs IN, subquery placement rules
3. Chapter 3 — INTERSECT and EXCEPT with performance notes
4. Chapter 4 — LATERAL joins introduction and common use cases

**Advanced** — production-quality query writing
1. Chapter 4 — LATERAL joins in depth: top-N-per-group, unnesting arrays, replacing application-side loops
2. Chapter 2 — performance analysis: when the planner materialises vs. inlines subqueries
3. Chapter 1 & 4 — best practices, query planning, and common mistakes to avoid

## What You'll Learn

- How each join type (INNER, LEFT, RIGHT, FULL OUTER, CROSS, SELF) affects which rows appear in the result
- When to reach for a subquery vs a join, and the performance implications of each choice
- The five subquery types — scalar, row, table, correlated, non-correlated — and where each fits in a query
- How EXISTS and IN differ, and why EXISTS is often faster for large datasets
- Combining independent result sets with UNION, UNION ALL, INTERSECT, and EXCEPT
- How LATERAL turns a FROM-clause subquery into a per-row correlated query (the SQL equivalent of a for-each loop)
- Top-N-per-group patterns using LATERAL instead of window functions or self-joins
- Reading query plans to understand join order, hash joins, nested loops, and merge joins
- Avoiding common pitfalls: duplicate rows from joins, NULL propagation in outer joins, column-count mismatches in set operations

## Prerequisites

- Comfortable writing single-table SELECT queries with WHERE, ORDER BY, GROUP BY, and HAVING
- Basic understanding of primary keys and foreign keys
- Familiarity with aggregate functions (COUNT, SUM, AVG, MAX, MIN)
- Covered by the earlier sections of this PostgreSQL guide (01 through 04)

## How to Use This Guide

1. **Follow the order for your level.** Each file builds on the previous one. Beginners should resist jumping straight to LATERAL joins — the earlier chapters make the advanced ones click much faster.
2. **Run every example.** Copy the CREATE TABLE and INSERT statements from each file into a local PostgreSQL session. Seeing actual result sets is far more effective than reading alone.
3. **Use the visual diagrams.** The Mermaid diagrams and ASCII art in each file are there for a reason — pause on them before reading the code.
4. **Compare the alternatives.** Each file shows the same problem solved with a join, a subquery, and sometimes a CTE. Run all three versions and check EXPLAIN ANALYZE output to build intuition about the planner.
5. **Do the practice exercises at the end of each file.** They are progressively harder and cover patterns you will encounter in real codebases. Try to write the query yourself before reading the solution.

Relational databases earn their name from these operations — once joins and subqueries feel natural, the rest of SQL falls into place quickly. Keep at it.
