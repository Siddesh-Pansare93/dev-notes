# Migrations & Tooling

Database migrations are the backbone of safe, repeatable schema evolution — this section teaches you how to design, automate, and execute migrations without breaking running applications, whether you're working solo or shipping changes across a team.

## Table of Contents

### Part 1: Foundations
- [Migration Concepts](./01-migration-concepts.md) — up/down migrations, idempotency, versioning strategies, migration history tables, environments, and the full migration workflow

### Part 2: Tools & Automation
- [Migration Tools](./02-migration-tools.md) — Flyway, Liquibase, dbmate, sqitch, Prisma Migrate, golang-migrate, and Alembic — setup, usage, and when to choose each

### Part 3: Production-Grade Techniques
- [Zero-Downtime Migrations](./03-zero-downtime-migrations.md) — safe patterns for large tables: concurrent indexes, NOT VALID constraints, expand/contract, batch data updates, and lock monitoring

## Learning Path

### Beginner
Start here if you are new to database migrations or are setting up your first migration workflow.

1. **Migration Concepts** — understand why migrations matter, what up/down pairs are, and how idempotency protects you
2. **Migration Tools** — pick the tool that fits your stack (Prisma for TypeScript, Alembic for Python, dbmate for lightweight SQL-first) and follow the setup walkthrough

### Intermediate
You know the basics and want to apply migrations reliably in team environments.

1. **Migration Concepts** — review versioning strategies, history tables, and workflow across dev/staging/production
2. **Migration Tools** — explore tool features beyond the basics: checksums, baseline, dry-run, rollback, and CI/CD integration
3. **Zero-Downtime Migrations** — learn which DDL operations take locks and how to avoid them with concurrent indexes and NOT VALID constraints

### Advanced
You are responsible for schema changes on high-traffic production databases with zero tolerance for downtime.

1. **Zero-Downtime Migrations** — master the expand/contract pattern, batch backfills with pauses, lock timeout settings, and pg_repack for full table rewrites
2. **Migration Concepts** — refine practices: one logical change per migration, coordinating schema deploys with application deploys, and planning irreversible changes
3. **Migration Tools** — Liquibase preconditions, sqitch dependency graphs, and embedding migrations into deployment pipelines

## What You'll Learn

- How to design idempotent migrations using `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, and conditional `DO $$ ... $$` blocks
- The difference between up/down migrations and when down migrations are irreversible
- How to track migration history with a `schema_migrations` table and checksums
- When to use Flyway, Liquibase, dbmate, sqitch, Prisma Migrate, golang-migrate, or Alembic — and the tradeoffs of each
- Why `CREATE INDEX CONCURRENTLY` is non-negotiable in production and how to clean up invalid indexes
- How to add NOT NULL constraints and foreign keys to large tables without locking reads or writes
- The expand/contract pattern for safely renaming columns or changing data types with zero downtime
- How to batch-process millions of rows in small chunks with pauses to avoid overwhelming your database
- How to monitor active locks, identify blocking queries, and set lock timeouts to fail fast
- How to coordinate schema changes with application deployments using feature flags and backward-compatible rollout

## Prerequisites

- Comfortable writing SQL — `CREATE TABLE`, `ALTER TABLE`, `INSERT`, `UPDATE`, `DELETE`
- Basic understanding of PostgreSQL transactions (`BEGIN` / `COMMIT` / `ROLLBACK`)
- Familiarity with version control (git) — migrations live alongside application code
- Awareness of what indexes are and roughly how they speed up queries

## How to Use This Guide

1. **Read Migration Concepts first** — the patterns and principles here apply regardless of which tool you use, and skipping them leads to subtle bugs in production.
2. **Try the practice exercises** — each file ends with worked examples that go beyond toy schemas; run them against a local PostgreSQL instance to build muscle memory.
3. **Pick one tool and learn it well** — the tool comparison in Chapter 2 is meant to help you choose, not to encourage switching. Depth beats breadth here.
4. **Treat zero-downtime patterns as your production checklist** — before running any DDL on a table larger than a few thousand rows, cross-reference Chapter 3 to confirm you are using the safe variant.
5. **Re-read with a real migration in hand** — these concepts click fastest when you apply them to an actual schema change you need to make at work.

Schema changes are the most consequential — and the most reversible — part of database work when you get the process right. Build the habit early and production deployments become routine.
