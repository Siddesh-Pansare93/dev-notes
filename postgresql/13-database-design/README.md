# Database Design Principles

A deep dive into the art and science of structuring relational data — covering everything from normalization theory and ER modeling to advanced patterns, multi-tenancy, hierarchical data, and production-grade real-world schemas. Aimed at developers who want to go beyond "it works" and build databases that are correct, maintainable, and built to scale.

## Table of Contents

### Part 1 — Foundations
1. [Normalization](./01-normalization.md) — 1NF through BCNF, functional dependencies, and avoiding anomalies
2. [Denormalization](./02-denormalization.md) — When and how to strategically break the rules for performance
3. [ER Modeling](./03-er-modeling.md) — Entity-relationship diagrams, cardinality, and translating models to schema

### Part 2 — Patterns and Strategies
4. [Design Patterns](./04-design-patterns.md) — EAV, polymorphic associations, audit trails, soft deletes, and state machines
5. [Multi-Tenant Design](./05-multi-tenant-design.md) — Separate DB, separate schema, and shared schema approaches with trade-offs
6. [Hierarchical Data](./06-hierarchical-data.md) — Adjacency list, nested sets, closure table, and ltree for tree structures

### Part 3 — Real-World Application
7. [Real-World Schemas](./07-real-world-schemas.md) — Complete, production-ready schemas for e-commerce, SaaS, and other common domains

## Learning Path

**Beginner** — Build a solid theoretical foundation first:
1. Normalization (chapter 1) — understand why structure matters
2. ER Modeling (chapter 3) — learn to think visually about data before writing SQL
3. Denormalization (chapter 2) — learn when to break the rules intentionally

**Intermediate** — Apply patterns to real problems:
4. Design Patterns (chapter 4) — EAV, soft deletes, audit trails, and more
5. Hierarchical Data (chapter 6) — master trees and recursive structures in PostgreSQL
6. Real-World Schemas (chapter 7) — study complete schemas and the decisions behind them

**Advanced** — Scale to production systems:
7. Multi-Tenant Design (chapter 5) — architect for isolation, cost, and scale across many customers
8. Revisit Real-World Schemas (chapter 7) — now read with an eye on indexing, constraints, and growth

## What You'll Learn

- The five normal forms and how to apply them to eliminate redundancy and prevent data anomalies
- How to read and draw ER diagrams and translate them directly into PostgreSQL table definitions
- When denormalization is justified and how to do it without sacrificing integrity
- Proven database design patterns: Entity-Attribute-Value (EAV), polymorphic relationships, audit/history tables, and soft-delete strategies
- The three main approaches to multi-tenant architecture and the trade-offs of each
- Four techniques for storing hierarchical (tree) data — adjacency list, nested sets, closure table, and PostgreSQL's ltree extension
- How to write complete, production-grade schemas with proper indexes, constraints, and foreign keys for real application domains like e-commerce and SaaS platforms

## Prerequisites

- Comfortable writing SQL: `SELECT`, `JOIN`, `GROUP BY`, `CREATE TABLE`
- Basic understanding of primary keys and foreign keys
- Familiarity with PostgreSQL data types (TEXT, INT, TIMESTAMP, JSONB)
- Helpful but not required: some experience designing a schema for a side project or work application

## How to Use This Guide

1. **Follow the Beginner path in order** — normalization and ER modeling are the vocabulary everything else builds on; skipping them makes the later chapters harder to absorb.
2. **Run every SQL example yourself** — open `psql` or a GUI (pgAdmin, TablePlus) and create the example tables. Designing is a hands-on skill.
3. **Use chapter 7 as a reference** — the real-world schemas are dense by design. Return to them when you are building something similar in practice.
4. **Pair design patterns with a real problem** — when you hit a situation in a project (variable attributes, audit requirements, tree data), come back to the matching chapter and apply it directly.
5. **Question every design decision** — each chapter covers trade-offs deliberately. Ask yourself "what does this cost me?" for every pattern you consider adopting.

Good database design is one of the highest-leverage skills a backend developer can develop — the decisions you make here outlast any individual feature, so invest the time to get them right.
