# Object-Relational Mappers (ORMs)

A practical guide to bridging the gap between your TypeScript/JavaScript application and a relational database — covering what ORMs are, why they exist, and how to use Prisma (the dominant modern choice) from first setup through advanced production patterns, with honest comparisons to Drizzle, TypeORM, Sequelize, and Knex.

## Table of Contents

### Part 1 — Foundations
1. [What Is an ORM?](./01-what-is-an-orm.md) — the problem ORMs solve, pros/cons, and a comparison of the major Node.js options

### Part 2 — Prisma in Depth
2. [Prisma Setup](./02-prisma-setup.md) — installing and configuring Prisma in a Node.js/TypeScript project
3. [Prisma Schema](./03-prisma-schema.md) — modeling your data with the `.prisma` schema file
4. [Prisma CRUD](./04-prisma-crud.md) — create, read, update, and delete operations with the Prisma Client
5. [Prisma Migrations](./05-prisma-migrations.md) — managing schema changes safely with `prisma migrate`
6. [Prisma Advanced](./06-prisma-advanced.md) — transactions, raw SQL, middleware, performance tuning, and Prisma Client Extensions

### Part 3 — The Broader Ecosystem
7. [Other ORMs](./07-other-orms.md) — Drizzle, TypeORM, Sequelize, and Knex side-by-side with benchmark queries and decision guidance

---

## Learning Path

### Beginner — Build your first Prisma-powered backend
Read chapters in order: **01 → 02 → 03 → 04**. By the end you will understand what an ORM does, have Prisma installed and connected to a database, have a working schema with relations, and be able to write all standard CRUD operations with full type safety.

### Intermediate — Add migrations and production-readiness
Continue with **05 → 06**. You will learn how to evolve your database schema without losing data, how to wrap operations in transactions, how to avoid the N+1 query problem, and how to extend Prisma with custom methods and computed fields using Prisma Client Extensions.

### Advanced — Evaluate and choose the right tool for any project
Finish with **07**. You will be able to reason about the tradeoffs between Prisma, Drizzle, TypeORM, Sequelize, and Knex and make an informed architectural decision for any project type — from Cloudflare Workers to NestJS enterprise applications.

---

## What You'll Learn

- Why raw SQL in application code is brittle and how ORMs solve that problem
- The trade-offs of using an ORM versus raw SQL (and how to use both together)
- How to model a relational database schema in Prisma including one-to-many and many-to-many relations
- How to run all standard CRUD operations with Prisma's type-safe client
- How database migrations work and how to run them safely in development and production
- How to use Prisma transactions to guarantee atomic, all-or-nothing operations
- How to diagnose and fix the N+1 query problem
- How to escape to raw SQL from within Prisma when you need full control
- How Drizzle, TypeORM, Sequelize, and Knex differ from Prisma and from each other
- How to pick the right ORM for a given runtime environment, team background, and query complexity

---

## Prerequisites

- Comfortable writing TypeScript — interfaces, generics, async/await
- Familiar with what a relational database is — tables, rows, columns, primary keys, and foreign keys
- Basic SQL literacy — you should be able to read a `SELECT ... WHERE` or `JOIN` statement even if you have not written many yourself
- Node.js project setup — you should know how to run `npm install` and use environment variables

You do not need prior ORM experience. Chapter 01 starts from scratch.

---

## How to Use This Guide

1. **Start with Chapter 01 even if you have used an ORM before.** The first chapter contains the comparison table and the ORM vs raw SQL decision framework that the rest of the series references. Skimming it takes 10 minutes and anchors everything that follows.

2. **Run the code as you read.** Each Prisma chapter builds on the last. Typing the queries yourself (rather than copy-pasting) is the fastest way to internalize the API and notice where TypeScript catches your mistakes.

3. **Use the quiz sections as checkpoints.** Each chapter ends with 2-3 questions. If you cannot answer them confidently without looking, re-read the relevant section before moving on — later chapters assume that knowledge.

4. **Read Chapter 07 before starting a new project.** The "Other ORMs" chapter includes a decision guide that tells you when NOT to use Prisma. Knowing this before you start saves a painful migration later.

5. **Refer back to Chapter 06 as your app grows.** Transactions, soft deletes, connection pooling, and query logging are things you often do not need on day one but will definitely need by week four. Bookmark it.

---

Every senior developer has a horror story about a poorly chosen data access layer. Working through this guide gives you the knowledge to make that choice deliberately — and to understand exactly what your ORM is doing on your behalf.
