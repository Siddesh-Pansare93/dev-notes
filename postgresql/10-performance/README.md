# PostgreSQL Performance Tuning

PostgreSQL is fast by default — but production systems demand more. This section teaches you how to diagnose slow queries, rewrite inefficient SQL, keep tables healthy, manage connection overhead, and tune server configuration for your specific workload. It is aimed at developers and DBAs who already know how to write SQL and want to make it perform.

## Table of Contents

1. [EXPLAIN and EXPLAIN ANALYZE](./01-explain-analyze.md)
2. [Query Optimization](./02-query-optimization.md)
3. [VACUUM and Autovacuum](./03-vacuum-autovacuum.md)
4. [Connection Pooling](./04-connection-pooling.md)
5. [Configuration Tuning](./05-configuration-tuning.md)

## Learning Path

### Beginner — Understand the Tools First
Start here if you can write queries but have never profiled a slow one.

1. **EXPLAIN and EXPLAIN ANALYZE** — learn to read query plans, spot sequential scans, and understand cost estimates before optimizing anything
2. **Query Optimization** — rewrite queries using the patterns EXPLAIN reveals: better predicates, proper data types, keyset pagination, and index-friendly SQL

### Intermediate — Keep the Database Healthy
Once you can write efficient queries, focus on the background machinery that keeps tables fast over time.

3. **VACUUM and Autovacuum** — understand MVCC dead tuples, table bloat, and how to configure autovacuum so it stays ahead of your write load
4. **Connection Pooling** — deploy PgBouncer or Pgpool-II to handle high concurrency without exhausting PostgreSQL's process-per-connection limit

### Advanced — Squeeze Out Every Millisecond
When queries and maintenance are dialed in, tune the server itself.

5. **Configuration Tuning** — adjust memory, WAL, checkpoint, and planner settings in `postgresql.conf` for OLTP, OLAP, or mixed workloads

## What You'll Learn

- How to read and interpret `EXPLAIN (ANALYZE, BUFFERS)` output, including node types, cost estimates, and actual vs planned row counts
- How to identify and eliminate anti-patterns: `SELECT *`, functions on indexed columns, `OFFSET`-based pagination, implicit type casts, and correlated subqueries
- How MVCC creates dead tuples and how VACUUM/autovacuum reclaims that space before it causes bloat or transaction ID wraparound
- How to tune autovacuum thresholds per-table so high-write tables get vacuumed frequently without disrupting other workloads
- Why PostgreSQL's process-per-connection model limits concurrency and how a connection pooler (PgBouncer in transaction mode) fixes that
- The key `postgresql.conf` parameters that actually matter: `shared_buffers`, `work_mem`, `maintenance_work_mem`, `wal_buffers`, `checkpoint_completion_target`, and the parallel query settings
- How to use `ALTER SYSTEM` and `pg_reload_conf()` to apply configuration changes without touching config files directly

## Prerequisites

- Comfortable writing SQL: `SELECT`, `JOIN`, `GROUP BY`, subqueries, CTEs
- Familiar with basic PostgreSQL concepts: indexes, transactions, schemas
- Basic understanding of how databases store data on disk is helpful but not required

## How to Use This Guide

1. **Always profile before you optimize.** Read the EXPLAIN chapter first — every other chapter assumes you can read a query plan and know what to look for.
2. **Apply one change at a time.** Whether rewriting a query or adjusting a config parameter, change one thing and re-run `EXPLAIN ANALYZE` to confirm improvement.
3. **Match tuning to your workload.** The Configuration Tuning chapter calls out OLTP vs OLAP differences — make sure you apply the right settings for your traffic pattern.
4. **Treat autovacuum as infrastructure.** Don't wait for table bloat to appear; read the VACUUM chapter proactively and set per-table storage parameters before problems emerge.
5. **Test connection pooling in staging first.** Transaction-mode pooling changes session-level semantics (prepared statements, `SET` commands). Validate your application handles this before rolling out to production.

Performance tuning is iterative — measure, change, measure again, and let the data guide every decision.
