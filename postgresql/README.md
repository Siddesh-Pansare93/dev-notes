# PostgreSQL Mastery — From Fundamentals to Advanced Database Design

A comprehensive, structured guide to mastering PostgreSQL — from installation to designing complex production databases.

## How to Use This Guide

Work through the modules **in order**. Each module builds on concepts from previous ones. Every topic file contains:

- **Theory** — concise explanation of the concept
- **Syntax** — clear PostgreSQL code blocks
- **Examples** — practical, runnable SQL you can execute
- **Common Mistakes** — pitfalls to avoid
- **Best Practices** — production-ready advice
- **Practice Exercises** — 2–3 exercises per topic

All SQL examples target **PostgreSQL 16+**.

## Roadmap

| # | Module | Topics |
|---|--------|--------|
| 01 | [Fundamentals](./01-fundamentals/) | PostgreSQL intro, installation, architecture, schemas, psql |
| 02 | [Data Types](./02-data-types/) | Numeric, text, date/time, JSON/JSONB, arrays, special types |
| 03 | [DDL & Table Design](./03-ddl-table-design/) | CREATE/ALTER/DROP, constraints, generated columns, inheritance |
| 04 | [DML & CRUD](./04-dml-crud/) | INSERT, SELECT, UPDATE, DELETE, transactions |
| 05 | [Joins & Relationships](./05-joins-and-relationships/) | All join types, subqueries, set operations, LATERAL |
| 06 | [Aggregation & Grouping](./06-aggregation-grouping/) | Aggregate functions, GROUP BY, window functions |
| 07 | [Advanced Queries](./07-advanced-queries/) | CTEs, views, conditional expressions, full-text search |
| 08 | [Indexes](./08-indexes/) | Index types, partial/expression indexes, maintenance |
| 09 | [Functions & Procedures](./09-functions-procedures/) | SQL functions, PL/pgSQL, triggers, custom types |
| 10 | [Performance](./10-performance/) | EXPLAIN, optimization, VACUUM, pooling, tuning |
| 11 | [Partitioning](./11-partitioning/) | Declarative partitioning, management, strategies |
| 12 | [Security](./12-security/) | Roles, RLS, authentication, encryption |
| 13 | [Database Design](./13-database-design/) | Normalization, ER modeling, design patterns, real-world schemas |
| 14 | [Migrations & Tooling](./14-migrations-tooling/) | Migration concepts, tools, zero-downtime changes |
| 15 | [Replication & HA](./15-replication-ha/) | Streaming & logical replication, high availability |
| 16 | [Backup & Restore](./16-backup-restore/) | pg_dump, PITR, backup strategies |
| 17 | [Extensions](./17-extensions/) | pg_stat_statements, PostGIS, foreign data wrappers |
| 18 | [Practical Projects](./18-practical-projects/) | E-commerce, SaaS, social media, analytics, event-driven schemas |

## Prerequisites

- A working PostgreSQL 16+ installation (see [Module 01](./01-fundamentals/02-installation-setup.md))
- A terminal with `psql` or a GUI like pgAdmin
- Basic SQL familiarity is helpful but not required

## Conventions

```sql
-- Code blocks like this contain runnable SQL
SELECT version();
```

> **Note:** Callouts like this highlight important details.

⚠️ **Warning:** These highlight common mistakes or dangerous operations.

## Quick Start

1. Install PostgreSQL → [01-fundamentals/02-installation-setup.md](./01-fundamentals/02-installation-setup.md)
2. Learn psql basics → [01-fundamentals/05-psql-commands.md](./01-fundamentals/05-psql-commands.md)
3. Start with data types → [02-data-types/01-numeric-types.md](./02-data-types/01-numeric-types.md)
4. Build your first tables → [03-ddl-table-design/01-create-alter-drop.md](./03-ddl-table-design/01-create-alter-drop.md)
