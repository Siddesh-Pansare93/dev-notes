# PostgreSQL Data Types

PostgreSQL's type system is one of its greatest strengths — from integers and text to JSON documents, arrays, UUIDs, and custom range types. This section gives you a thorough, practical understanding of how to pick the right data type for every column, and why that choice matters for performance, storage, and data integrity.

## Table of Contents

### Part 1 — Core Types
1. [Numeric Types](./01-numeric-types.md) — INTEGER, BIGINT, NUMERIC, SERIAL, IDENTITY, and floating-point
2. [Text Types](./02-text-types.md) — CHAR, VARCHAR, TEXT, and string functions
3. [Date & Time Types](./03-date-time-types.md) — DATE, TIME, TIMESTAMP, TIMESTAMPTZ, INTERVAL

### Part 2 — Specialized Types
4. [Boolean, UUID, and Enum](./04-boolean-uuid-enum.md) — TRUE/FALSE semantics, globally unique identifiers, and custom enum domains
5. [JSON and JSONB](./05-json-jsonb.md) — Semi-structured data, operators, path queries, and indexing strategies
6. [Array Types](./06-array-types.md) — Multi-value columns, array operators, and when to normalize instead

### Part 3 — Advanced Types
7. [Special Types](./07-special-types.md) — hstore, composite types, range types, network types (INET/CIDR), bit strings, and bytea

## Learning Path

**Beginner** — start here if you are new to PostgreSQL or relational databases:
1. Numeric Types (Chapter 1) — understand integer vs. decimal vs. serial
2. Text Types (Chapter 2) — VARCHAR vs. TEXT and why it matters
3. Date & Time Types (Chapter 3) — timestamps and time zones done right
4. Boolean, UUID, and Enum (Chapter 4) — clean flags, IDs, and status fields

**Intermediate** — once you are comfortable writing queries and designing schemas:
5. JSON and JSONB (Chapter 5) — add flexible columns without abandoning SQL
6. Array Types (Chapter 6) — when to denormalize and when to reach for a join table

**Advanced** — for production schema design and complex domain modelling:
7. Special Types (Chapter 7) — range types, network types, hstore, and binary data

## What You'll Learn

- The storage size, range limits, and performance trade-offs of every numeric type
- When to use `TEXT` vs. `VARCHAR` and why PostgreSQL treats them nearly the same
- How to handle time zones correctly using `TIMESTAMPTZ` and why naive timestamps are dangerous
- The difference between `JSON` and `JSONB` and why `JSONB` wins for almost every use case
- How to index JSONB columns with GIN indexes for fast containment queries
- How to store, query, and slice array columns using PostgreSQL's array operators
- How UUIDs (v4 vs. v7) affect index locality and distributed system design
- How to define custom `ENUM` types and composite types to enforce domain constraints
- When to reach for range types, network types, hstore, or bytea vs. a plain text column

## Prerequisites

- Basic SQL — you should be able to write `SELECT`, `INSERT`, `CREATE TABLE`
- Familiarity with what a primary key and foreign key are
- Chapter 1 of this PostgreSQL guide (connection basics) is helpful but not required

## How to Use This Guide

1. **Follow the order for the first read.** Each chapter builds on vocabulary introduced earlier — numeric types before JSON, arrays before special types.
2. **Run the examples in a live database.** Every chapter includes copy-pasteable `CREATE TABLE`, `INSERT`, and `SELECT` statements. The fastest way to internalize a type is to query it yourself.
3. **Use the "When to Use" sections as quick references.** When you are designing a new table, jump straight to those sections to compare trade-offs without re-reading the entire chapter.
4. **Revisit Chapter 5 (JSON/JSONB) and Chapter 7 (Special Types) often.** These cover the features most developers underuse — range types alone can replace entire application-level logic.
5. **Cross-reference with query optimization.** Type choice directly affects which indexes PostgreSQL can use; keep that in mind as you progress to the indexing section of this guide.

Choosing the right data type is one of the highest-leverage decisions you make at schema design time — get it right here and your queries, indexes, and application code will all be simpler for it.
