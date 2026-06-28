# Indexes & Performance

Indexes are one of the highest-leverage tools in a PostgreSQL developer's toolkit — the difference between a query that runs in milliseconds and one that crawls for minutes. This section teaches you how indexes work, which types to choose, and how to maintain them in production.

## Table of Contents

1. [Index Fundamentals](./01-index-fundamentals.md) — What indexes are, how the query planner decides when to use them, scan types (Sequential, Index, Bitmap, Index-Only), and the core tradeoffs of read vs. write performance
2. [Index Types](./02-index-types.md) — Deep dive into B-tree, Hash, GiST, SP-GiST, GIN, and BRIN — when to use each, practical examples with geometric data, JSONB, arrays, IP addresses, and time-series tables
3. [Partial and Expression Indexes](./03-partial-expression-idx.md) — Index only the rows and computed values you actually query; covers LOWER(), date_trunc(), JSONB extraction, case-insensitive uniqueness, and combining both techniques
4. [Multi-Column and Covering Indexes](./04-multicolumn-covering.md) — Composite indexes, the leftmost prefix rule, INCLUDE columns for index-only scans, and how column order determines index usability
5. [Index Maintenance](./05-index-maintenance.md) — Detecting and resolving index bloat, REINDEX vs. REINDEX CONCURRENTLY, monitoring with pg_stat_user_indexes, and autovacuum tuning for index health

## Learning Path

### Beginner
Start here if you are new to database indexes or have only used them without understanding why they work.

1. **Index Fundamentals** — Learn the B-tree mental model and understand why PostgreSQL sometimes ignores your index
2. **Index Types** — Focus on B-tree (the default) and GIN (for JSONB/arrays); skim the others for awareness

### Intermediate
You know what an index is but want to write queries that consistently use them well.

3. **Partial and Expression Indexes** — Cut index size by 50-90% and pre-compute expressions your queries run repeatedly
4. **Multi-Column and Covering Indexes** — Master the leftmost prefix rule and eliminate table lookups with INCLUDE

### Advanced
You are optimizing production systems where index health degrades over time.

5. **Index Maintenance** — Diagnose bloat, run REINDEX CONCURRENTLY without downtime, and tune autovacuum to keep indexes lean

## What You'll Learn

- How the PostgreSQL query planner chooses between Sequential Scan, Index Scan, Bitmap Index Scan, and Index-Only Scan
- When to use B-tree, Hash, GiST, SP-GiST, GIN, and BRIN — and the real cost of choosing wrong
- How to write partial indexes that cover only the rows your application actually queries
- How to create expression indexes so LOWER(), date_trunc(), and JSONB field extractions hit an index instead of scanning every row
- The leftmost prefix rule for composite indexes and how to order columns for maximum reuse
- How to use INCLUDE columns to build covering indexes that never touch the heap
- How to use EXPLAIN ANALYZE and BUFFERS to confirm an index is actually being used
- How to detect index bloat with pgstattuple and pg_stat_user_indexes
- How to rebuild indexes online with REINDEX CONCURRENTLY and CREATE INDEX CONCURRENTLY
- How to find and drop unused indexes that waste write throughput and disk space

## Prerequisites

Before starting this section you should be comfortable with:

- Writing SELECT queries with WHERE, JOIN, and ORDER BY clauses
- Basic PostgreSQL data types (VARCHAR, INTEGER, NUMERIC, TIMESTAMP, JSONB, arrays)
- Running EXPLAIN on a query and reading the output at a basic level
- The concept of table rows and how PostgreSQL stores data in pages (helpful but not required)

If you are brand new to PostgreSQL, work through the earlier sections on schema design and query fundamentals first.

## How to Use This Guide

1. **Run the examples yourself.** Every chapter includes ready-to-run SQL that creates tables with realistic data volumes (100K–10M rows). Performance differences only become visible at scale, so do not skip the data generation steps.
2. **Always follow up with EXPLAIN ANALYZE.** After creating an index, verify the planner actually uses it. Look for "Index Scan" or "Index Only Scan" in the output and compare execution times before and after.
3. **Check pg_stat_user_indexes after a week.** Create your indexes, run typical workloads, then query pg_stat_user_indexes to see which indexes have idx_scan = 0. Those are candidates to drop.
4. **Read the Common Mistakes sections.** Each chapter flags patterns that look right but silently fail — like using UPPER() in a query when your index was built on LOWER(), or applying BRIN to randomly ordered data.
5. **Treat index decisions as hypotheses.** Create an index, measure it with EXPLAIN ANALYZE and pg_stat_user_indexes, and drop it if it does not pull its weight. More indexes is not always better.

Indexes reward curiosity — every EXPLAIN ANALYZE output tells a story about how your data is being accessed, and understanding that story makes every query you write better.
