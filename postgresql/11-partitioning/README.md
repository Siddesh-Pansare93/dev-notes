# Table Partitioning

Table partitioning is the technique of splitting a large PostgreSQL table into smaller, independently managed physical pieces while keeping a single logical interface for queries. This section is for developers and DBAs who need to scale tables beyond a few hundred gigabytes, manage data lifecycle efficiently, or squeeze more performance out of time-series and high-volume workloads.

## Table of Contents

### Part 1 — Foundations
- [01 — Partition Basics](./01-partition-basics.md) — what partitioning is, the three methods (RANGE, LIST, HASH), partition pruning, constraints, indexes, and common mistakes with worked examples
- [02 — Partition Management](./02-partition-management.md) — attaching and detaching partitions, default partitions, sub-partitioning, automated partition creation, and data lifecycle operations
- [03 — Partition Strategies](./03-partition-strategies.md) — when to partition (and when not to), choosing the right partition key, time-based granularity decisions, and geographic partitioning patterns

## Learning Path

**Beginner** — new to partitioning, coming from standard table design
1. Read the "Theory" section of [Partition Basics](./01-partition-basics.md) to understand what partitioning does and why
2. Study the RANGE and LIST examples in [Partition Basics](./01-partition-basics.md) — these cover 80% of real-world use cases
3. Work through Exercises 1 and 2 in [Partition Basics](./01-partition-basics.md)

**Intermediate** — comfortable creating partitions, ready to operate them in production
1. Read all of [Partition Management](./02-partition-management.md) — attach/detach, default partitions, sub-partitioning, and data lifecycle patterns
2. Skim the "When NOT to Partition" and "Choosing the Right Partition Key" sections in [Partition Strategies](./03-partition-strategies.md)
3. Complete Exercise 3 (HASH partitioning) in [Partition Basics](./01-partition-basics.md)

**Advanced** — tuning partition schemes under production load
1. Read all of [Partition Strategies](./03-partition-strategies.md) for time-based granularity decisions and multi-tenant/geographic strategies
2. Focus on automated partition creation and DETACH CONCURRENTLY patterns in [Partition Management](./02-partition-management.md)
3. Cross-reference with the [Query Performance](../08-query-performance/01-explain-analyze.md) and [Indexes](../05-indexes/01-index-types.md) sections to verify partition pruning is actually firing

## What You'll Learn

- The difference between RANGE, LIST, and HASH partitioning and when to reach for each
- How declarative partitioning (PostgreSQL 10+) works and why it beats the older inheritance-based approach
- How partition pruning eliminates unnecessary partition scans and how to confirm it with EXPLAIN
- How to include the partition key in unique constraints and primary keys correctly
- How to attach pre-existing tables as partitions and detach partitions without blocking live traffic (DETACH CONCURRENTLY, PostgreSQL 14+)
- How to design sub-partitions for multi-dimensional data (e.g., by year then by region)
- How to automate monthly/daily partition creation so you never hit "no partition found for row"
- How to pick partition granularity (hourly vs daily vs monthly vs yearly) based on data volume and query patterns
- How to use default partitions as a safety net during schema transitions
- How to monitor partition sizes and detect hot partitions before they become a problem

## Prerequisites

- Comfortable writing `CREATE TABLE`, `INSERT`, `SELECT`, and `EXPLAIN` in PostgreSQL
- Basic understanding of indexes — knowing what a B-tree index does and how PostgreSQL uses them for lookups
- Familiarity with PostgreSQL system catalogs (`pg_tables`, `pg_class`) is helpful for the monitoring queries but not required

## How to Use This Guide

1. **Run every example in a local database.** Partitioning behaviour is best understood by watching EXPLAIN output change as you add or remove partitions — reading alone is not enough.
2. **Always check partition pruning with EXPLAIN.** After creating a partitioned table, run `EXPLAIN (COSTS OFF)` on your queries and look for "Partitions removed" in the output. If pruning is not happening, your WHERE clause is not using the partition key.
3. **Start with RANGE on a date column.** Most teams encounter partitioning first with time-series or transactional data. RANGE by date is the most forgiving strategy to learn on — mistakes in partition bounds are immediately obvious.
4. **Read the "Common Mistakes" sections before writing production DDL.** The most expensive errors (missing partition key in unique constraints, gaps/overlaps in RANGE bounds, unhandled future dates) are all documented with examples so you can avoid them from day one.
5. **Plan your partition naming convention early.** Names like `sales_2024_01` scale; names like `sales_p1` do not. The management chapter shows what good naming looks like under automation.

You now have everything you need to design, build, and operate partitioned tables that stay fast as your data grows.
