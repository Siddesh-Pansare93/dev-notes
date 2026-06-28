# Project: Social Network Database

A hands-on, end-to-end project where you design and build the full database layer for an Instagram/Twitter hybrid social network using PostgreSQL, Prisma, and TypeScript. This series is for developers who want to go beyond toy examples and see how real-world schema decisions, SQL queries, ORM patterns, and performance tuning fit together in a single cohesive project.

## Table of Contents

### Part 1 — Design

1. [Requirements and Architecture](./01-requirements.md) — Feature scope, entity discovery, ER diagram, cardinality decisions, and technology stack overview
2. [Schema Design](./02-schema-design.md) — Full `CREATE TABLE` statements with column-level reasoning, indexes, triggers, denormalized counters, and cross-database equivalents

### Part 2 — Implementation

3. [SQL Queries](./03-sql-queries.md) — Writing the feed query, profile lookups, hashtag search, follower counts, and real queries against the schema
4. [Prisma Implementation](./04-prisma-implementation.md) — Translating the SQL schema into `schema.prisma`, running migrations, seeding data, and using the typed Prisma client

### Part 3 — Performance

5. [Optimization](./05-optimization.md) — Index strategy, EXPLAIN ANALYZE, the N+1 problem, the celebrity/hotspot problem, cursor pagination, denormalized counters, read replicas, connection pooling, Redis caching, and database monitoring

## Learning Path

**Beginner** — Start here if you are new to relational databases or have only used ORMs without understanding what happens underneath:
1. Chapter 01 — Requirements and Architecture (understand what we are building and why)
2. Chapter 02 — Schema Design (learn to read and write real `CREATE TABLE` SQL)
3. Chapter 03 — SQL Queries (write joins, aggregations, and filtered queries by hand)

**Intermediate** — Pick up here if you are comfortable with SQL and want to add ORM and production patterns:
4. Chapter 04 — Prisma Implementation (see how Prisma maps onto the SQL you already know)
5. Chapter 05 — Optimization, sections: Index Strategy and N+1 Problem

**Advanced** — For developers preparing for production or system design interviews:
6. Chapter 05 — Optimization, sections: Celebrity Problem, Cursor Pagination, Read Replicas, Redis Caching, Connection Pooling, and Database Monitoring

## What You'll Learn

- How to turn a product requirements list into database entities, relationships, and cardinalities
- When to use compound primary keys vs surrogate IDs, and why it matters for data integrity
- How to write production-quality `CREATE TABLE` statements with proper constraints, defaults, and cascade behavior
- The difference between `TIMESTAMPTZ` and `TIMESTAMP` and why it matters across timezones
- How to design a self-referential many-to-many table (the follow graph)
- How to keep denormalized counter columns consistent using database triggers
- How to implement soft deletes with `deleted_at` and partial indexes
- How to write and read the `EXPLAIN ANALYZE` output to diagnose slow queries
- How to recognize and fix the N+1 query problem in Prisma using `include`
- How the celebrity/hotspot problem works and how Twitter's hybrid fan-out approach solves it
- Why cursor pagination is better than offset pagination for live, large datasets
- How to layer Redis caching on top of PostgreSQL without introducing stale-data bugs
- How read replicas and connection pooling (PgBouncer / Prisma Accelerate) work in a real deployment

## Prerequisites

- Basic SQL: you should know what `SELECT`, `JOIN`, `WHERE`, and `GROUP BY` do
- Familiarity with at least one backend language (the Prisma chapters use TypeScript/Node.js)
- No prior Prisma or PostgreSQL experience required — everything is explained as it is introduced

## How to Use This Guide

1. **Follow the chapters in order on your first pass.** Each chapter builds on the schema and decisions made in the previous one. Skipping ahead will leave gaps.
2. **Type out the SQL and Prisma code yourself.** Reading alone does not build the muscle memory for writing schemas from scratch under pressure.
3. **Run EXPLAIN ANALYZE on every query in Chapter 05.** The difference between a sequential scan and an index scan is not real until you see the numbers yourself.
4. **Use the ER diagram in Chapter 01 as a reference throughout.** Whenever a foreign key or join feels confusing, go back to the diagram to see the relationship visually.
5. **Treat the design decisions as a checklist for your own projects.** The "why" explanations (CASCADE vs SET NULL, BIGSERIAL vs SERIAL, soft deletes, partial indexes) apply to every relational schema you will ever write.

Build it once end-to-end and you will have a mental model for database design that sticks with you for the rest of your career.
