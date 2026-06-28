# PostgreSQL Fundamentals

A ground-up introduction to PostgreSQL — from what it is and how to install it, all the way to understanding its internal architecture and navigating it confidently from the command line. If you are new to PostgreSQL or want to build a solid mental model before diving into queries and performance, start here.

## Table of Contents

1. [Introduction to PostgreSQL](./01-introduction.md) — history, core features, ACID compliance, and why Postgres stands out
2. [Installation and Setup](./02-installation-setup.md) — installing on Windows, Linux, and macOS; pgAdmin setup; creating your first database
3. [PostgreSQL Architecture](./03-architecture.md) — client/server model, postmaster, backend processes, shared memory, WAL, and MVCC
4. [Databases and Schemas](./04-databases-schemas.md) — organizing your cluster with databases and schemas; namespace management; multi-tenancy patterns
5. [psql Commands and Meta-Commands](./05-psql-commands.md) — the psql CLI, backslash commands, output formatting, scripting, and `.psqlrc` configuration

## Learning Path

### Beginner
Work through the chapters in order — each one builds on the last.

1. **Introduction** (Chapter 1) — Understand what PostgreSQL is and why it matters
2. **Installation and Setup** (Chapter 2) — Get a running instance on your machine
3. **Databases and Schemas** (Chapter 4) — Learn how Postgres organizes data at the top level
4. **psql Commands** (Chapter 5) — Get comfortable navigating Postgres from the terminal

### Intermediate
You have used a relational database before and want to understand Postgres specifically.

1. **Introduction** (Chapter 1) — Skim for Postgres-specific history and standards compliance details
2. **Architecture** (Chapter 3) — Understand the process model, WAL, and MVCC — this pays off heavily when tuning and debugging
3. **Databases and Schemas** (Chapter 4) — Focus on schema design patterns for real applications
4. **psql Commands** (Chapter 5) — Learn advanced meta-commands, `.psqlrc` customization, and scripting

### Advanced
You are revisiting fundamentals to fill gaps before going deeper into indexing, replication, or performance.

1. **Architecture** (Chapter 3) — Deep-dive into MVCC, WAL internals, and background worker processes
2. **Databases and Schemas** (Chapter 4) — Review multi-tenancy and search path strategies
3. **psql Commands** (Chapter 5) — Review scripting and conditional logic for automation pipelines

## What You'll Learn

- What makes PostgreSQL an object-relational database and how it differs from other RDBMS systems
- How to install and configure PostgreSQL on any major operating system
- The internal process model: how the postmaster, backend processes, and background workers interact
- How PostgreSQL uses Write-Ahead Logging (WAL) to guarantee durability
- How Multi-Version Concurrency Control (MVCC) lets readers and writers coexist without blocking
- The difference between a database cluster, a database, and a schema — and when to use each
- How to connect to, explore, and manage a PostgreSQL instance entirely from the `psql` terminal
- How to format query output, run SQL scripts, and automate tasks with psql meta-commands

## Prerequisites

- Basic familiarity with the command line (navigating directories, running commands)
- A general idea of what a relational database is (tables, rows, columns) — no deep SQL knowledge required
- No prior PostgreSQL experience needed

## How to Use This Guide

1. **Install first, read alongside.** Set up a local PostgreSQL instance using Chapter 2, then run the examples from each chapter as you go — reading without typing sticks less.
2. **Use psql from day one.** Even if you plan to use pgAdmin or a GUI later, learning psql (Chapter 5) early makes every other chapter easier to follow.
3. **Don't skip Architecture.** Chapter 3 can feel abstract at first, but understanding MVCC and WAL prevents a whole class of production surprises later.
4. **Experiment with schemas.** After Chapter 4, create a sandbox database and try different schema layouts — it is the fastest way to internalize the concepts.
5. **Revisit as you grow.** These fundamentals become richer once you have worked with real queries, indexes, and replication. A second read after completing later sections is always worth it.

Strong foundations make everything else faster — take your time here and the rest of PostgreSQL will make sense.
