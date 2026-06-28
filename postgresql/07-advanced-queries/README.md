# Advanced Queries

This section covers the techniques that separate competent SQL writers from truly fluent ones — CTEs, views, conditional logic, and full-text search. It is aimed at developers who are comfortable with basic SELECT queries and want to write cleaner, more powerful, and more maintainable PostgreSQL.

## Table of Contents

1. [Common Table Expressions (CTEs)](./01-cte.md)
2. [Views and Materialized Views](./02-views.md)
3. [Conditional Expressions](./03-conditional-expressions.md)
4. [Full-Text Search](./04-full-text-search.md)

## Learning Path

### Beginner
Start here if you can write basic SELECT, JOIN, and WHERE clauses but haven't used CTEs or views yet.

1. **CTEs** (Chapter 1) — Learn the `WITH` clause to name and reuse intermediate result sets
2. **Views** (Chapter 2) — Store and reuse queries as virtual tables
3. **Conditional Expressions** (Chapter 3) — Master `CASE`, `COALESCE`, and `NULLIF` for inline logic

### Intermediate
You know the basics and want to write production-quality queries.

1. **Recursive CTEs** (Chapter 1) — Traverse hierarchies, graphs, and generate series
2. **Materialized Views** (Chapter 2) — Understand when to trade freshness for performance
3. **Conditional Aggregation** (Chapter 3) — Build pivot-style reports and filtered aggregates

### Advanced
You're writing complex reporting queries and need search capabilities at scale.

1. **CTE Materialization** (Chapter 1) — Control `MATERIALIZED` vs `NOT MATERIALIZED` for optimizer tuning
2. **Updatable Views and INSTEAD OF Triggers** (Chapter 2) — Make complex views writable
3. **Full-Text Search** (Chapter 4) — Replace LIKE with linguistic search backed by GIN indexes

## What You'll Learn

- How to write readable, multi-step queries using named CTEs with the `WITH` clause
- How to build self-referencing recursive CTEs for tree structures and graph traversal
- The difference between regular views and materialized views, and when each is appropriate
- How to use `CASE`, `COALESCE`, `NULLIF`, `GREATEST`, and `LEAST` for runtime conditional logic
- How to implement conditional aggregation to build pivot-style summaries in pure SQL
- How PostgreSQL's full-text search works with `tsvector`, `tsquery`, and language-aware configurations
- How to index text columns with GIN/GiST for fast linguistic search across large datasets
- How to rank search results by relevance using `ts_rank` and `ts_rank_cd`

## Prerequisites

Before starting this section you should be comfortable with:

- Writing `SELECT` queries with `JOIN`, `WHERE`, `GROUP BY`, and `HAVING`
- Understanding of NULL semantics in SQL
- Basic familiarity with PostgreSQL data types
- Aggregate functions (`COUNT`, `SUM`, `AVG`, `MIN`, `MAX`)

If any of these feel shaky, revisit the earlier PostgreSQL sections before continuing.

## How to Use This Guide

1. **Read the theory first.** Each file opens with a Theory section that explains the concept before showing any SQL. Skipping it leads to copy-paste code you can't adapt.
2. **Type out the examples.** Resist the urge to copy-paste. Writing the queries yourself builds muscle memory and exposes subtle syntax differences you'll miss otherwise.
3. **Use the Practice Exercises.** Every file ends with exercises. Try them before checking solutions — the struggle is where the learning happens.
4. **Check the Common Mistakes sections.** These document real mistakes that are easy to make and hard to debug. Reading them takes two minutes and can save hours.
5. **Keep a reference database handy.** Most examples use realistic schemas (e-commerce, HR, blog). Spinning up a local Postgres instance and running the queries against real data makes the concepts stick.

Advanced queries are where SQL stops feeling like a chore and starts feeling like a superpower — enjoy the journey.
