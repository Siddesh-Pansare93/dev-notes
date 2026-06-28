# PostgreSQL Extensions

PostgreSQL's extension system turns a great relational database into an exceptional one — this section teaches you how to install and use the ecosystem of extensions that add cryptography, geospatial data, scheduled jobs, full-text search improvements, and cross-database federation to your PostgreSQL deployments. Ideal for developers who want to go beyond core SQL and leverage the full power of the PostgreSQL ecosystem.

## Table of Contents

### Part 1 — Core Extensions Toolkit
1. [Essential Extensions](./01-essential-extensions.md) — pg_stat_statements, pgcrypto, UUID generation, pg_trgm, btree_gist/gin, tablefunc, citext, pg_cron

### Part 2 — Geospatial with PostGIS
2. [PostGIS Basics](./02-postgis-basics.md) — Geometry vs Geography types, spatial reference systems, spatial queries, distance calculations, GeoJSON, spatial indexes

### Part 3 — External Data Integration
3. [Foreign Data Wrappers](./03-foreign-data-wrappers.md) — FDW architecture, postgres_fdw, file_fdw, query pushdown, cross-database federation, security

## Learning Path

**Beginner** — Start with the foundations of the extension system before diving into specialized tools.
1. [Essential Extensions](./01-essential-extensions.md) — Learn `CREATE EXTENSION`, explore pg_stat_statements for query monitoring, pgcrypto for hashing and encryption, and pg_trgm for fuzzy text matching

**Intermediate** — Tackle geospatial and performance-oriented extensions.
2. [PostGIS Basics](./02-postgis-basics.md) — Work with POINT, LINESTRING, and POLYGON types; run distance and containment queries; use spatial indexes for location-based apps

**Advanced** — Connect PostgreSQL to the wider data world.
3. [Foreign Data Wrappers](./03-foreign-data-wrappers.md) — Query remote PostgreSQL instances, read flat files, push queries to remote systems, and integrate legacy or microservices data without ETL pipelines

## What You'll Learn

- How to install, update, and remove extensions using `CREATE EXTENSION`, `ALTER EXTENSION`, and `DROP EXTENSION`
- Query performance analysis with `pg_stat_statements` to identify slow and frequently-run queries
- Cryptographic hashing and symmetric encryption using `pgcrypto`
- Case-insensitive text storage with `citext` and fuzzy matching with `pg_trgm` (LIKE, similarity scoring, trigram indexes)
- Background job scheduling inside PostgreSQL with `pg_cron`
- Storing and querying spatial data (points, lines, polygons) with PostGIS geometry and geography types
- Computing accurate geodesic distances between coordinates and filtering locations within a radius
- Building and querying spatial indexes (GiST) for high-performance geospatial lookups
- Exporting and importing spatial data as GeoJSON
- Connecting to remote PostgreSQL databases as foreign tables using `postgres_fdw`
- Reading CSV files and server logs as queryable tables using `file_fdw`
- Understanding query pushdown, user mappings, and the SQL/MED standard for federated queries

## Prerequisites

Before starting this section you should be comfortable with:

- Core PostgreSQL DDL and DML: `CREATE TABLE`, `INSERT`, `SELECT`, `JOIN`, `WHERE`
- Basic indexing concepts (B-tree indexes, when and why to use them)
- User and schema management (`CREATE USER`, `GRANT`, schema namespacing)
- Basic PostgreSQL administration: connecting with psql, checking server settings, reading system catalogs like `pg_catalog`

If any of those feel shaky, revisit the earlier sections of this knowledge base before proceeding.

## How to Use This Guide

1. **Install before you query.** Every extension must be enabled per-database with `CREATE EXTENSION IF NOT EXISTS <name>;` — running the example queries without this step will result in "function does not exist" errors.
2. **Follow the file order.** The chapters are sequenced so that concepts from earlier files (extension lifecycle, system catalog queries) apply directly to later ones (FDW setup, PostGIS indexing).
3. **Run every example.** Each file includes runnable SQL examples — paste them into psql or a SQL client against a local development database to see real output.
4. **Check availability first.** Not every extension ships with every PostgreSQL build. Use `SELECT * FROM pg_available_extensions WHERE name = '<ext>';` before installing to confirm it is bundled with your version.
5. **Review Common Mistakes and Best Practices sections.** Each chapter ends with these — they distill real-world pitfalls like missing shared_preload_libraries for pg_stat_statements, SRID mismatches in PostGIS, and credential leakage risks in FDW user mappings.

Extensions are where PostgreSQL goes from a solid relational store to a Swiss Army database — dig in and you'll rarely need to reach for a separate specialized service again.
