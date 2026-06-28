# Database Engineering

A comprehensive guide to database fundamentals, SQL mastery, ORMs, and distributed database systems — for developers who want to go from zero to production-ready with confidence.

## Table of Contents

### Part 1: Database Fundamentals
1. [What Is a Database](./db-fundamentals/01-what-is-a-database.md)
2. [Data Modeling](./db-fundamentals/02-data-modeling.md)
3. [The Relational Model](./db-fundamentals/03-relational-model.md)
4. [Normalization](./db-fundamentals/04-normalization.md)
5. [ACID Properties](./db-fundamentals/05-acid-properties.md)
6. [Indexes](./db-fundamentals/06-indexes.md)
7. [Transactions](./db-fundamentals/07-transactions.md)
8. [Joins and Relationships](./db-fundamentals/08-joins-and-relationships.md)
9. [Database Design](./db-fundamentals/09-database-design.md)
10. [SQL vs NoSQL](./db-fundamentals/10-sql-vs-nosql.md)

### Part 2: SQL — From Basics to Advanced
11. [Introduction to SQL](./sql/01-introduction.md)
12. [Creating Tables](./sql/02-creating-tables.md)
13. [DML — Insert, Update, Delete](./sql/03-dml-insert-update-delete.md)
14. [SELECT and Querying](./sql/04-select-querying.md)
15. [Filtering with WHERE](./sql/05-filtering-where.md)
16. [Joins](./sql/06-joins.md)
17. [Aggregations](./sql/07-aggregations.md)
18. [Subqueries](./sql/08-subqueries.md)
19. [Views, Procedures, and Functions](./sql/09-views-procedures-functions.md)
20. [Triggers](./sql/10-triggers.md)
21. [Indexes and Performance](./sql/11-indexes-and-performance.md)
22. [CTEs and Window Functions](./sql/12-cte-window-functions.md)
23. [JSON in SQL](./sql/13-json-in-sql.md)
24. [Security](./sql/14-security.md)
25. [Transactions and Locking](./sql/15-transactions-locking.md)
26. [Advanced Features](./sql/16-advanced-features.md)
27. [Database Comparison](./sql/17-database-comparison.md)

### Part 3: ORMs and Prisma
28. [What Is an ORM](./orms/01-what-is-an-orm.md)
29. [Prisma Setup](./orms/02-prisma-setup.md)
30. [Prisma Schema](./orms/03-prisma-schema.md)
31. [Prisma CRUD](./orms/04-prisma-crud.md)
32. [Prisma Migrations](./orms/05-prisma-migrations.md)
33. [Prisma Advanced](./orms/06-prisma-advanced.md)
34. [Other ORMs](./orms/07-other-orms.md)

### Part 4: Advanced DBMS
35. [Sharding](./advanced-dbms/01-sharding.md)
36. [Replication](./advanced-dbms/02-replication.md)
37. [MongoDB](./advanced-dbms/03-mongodb.md)
38. [Redis](./advanced-dbms/04-redis.md)
39. [Cassandra](./advanced-dbms/05-cassandra.md)

### Part 5: Capstone Project — Social Network Database
40. [Requirements](./project-social-network/01-requirements.md)
41. [Schema Design](./project-social-network/02-schema-design.md)
42. [SQL Queries](./project-social-network/03-sql-queries.md)
43. [Prisma Implementation](./project-social-network/04-prisma-implementation.md)
44. [Optimization](./project-social-network/05-optimization.md)

## Learning Path

### Beginner Track
Start here if you are new to databases or have never written SQL:
1. What Is a Database (db-fundamentals/01)
2. The Relational Model (db-fundamentals/03)
3. ACID Properties (db-fundamentals/05)
4. Introduction to SQL (sql/01)
5. Creating Tables (sql/02)
6. SELECT and Querying (sql/04)
7. Filtering with WHERE (sql/05)
8. Joins (sql/06)

### Intermediate Track
Build on your SQL foundation and start connecting databases to real applications:
1. Normalization (db-fundamentals/04)
2. Indexes (db-fundamentals/06)
3. Transactions (db-fundamentals/07)
4. Aggregations (sql/07)
5. Subqueries (sql/08)
6. CTEs and Window Functions (sql/12)
7. SQL vs NoSQL (db-fundamentals/10)
8. What Is an ORM (orms/01)
9. Prisma Setup through Migrations (orms/02 — 05)

### Advanced Track
Deep dive into production-grade database engineering and distributed systems:
1. Indexes and Performance (sql/11)
2. Transactions and Locking (sql/15)
3. JSON in SQL (sql/13)
4. Prisma Advanced (orms/06)
5. Sharding (advanced-dbms/01)
6. Replication (advanced-dbms/02)
7. Redis (advanced-dbms/04)
8. Cassandra (advanced-dbms/05)
9. Full Capstone Project (project-social-network/01 — 05)

## What You'll Learn

- How databases work under the hood — storage engines, indexing, and query execution
- The relational model, normalization, and how to design clean, efficient schemas from scratch
- Full SQL fluency — from basic selects all the way to window functions, CTEs, triggers, and JSON queries
- How ACID guarantees and transactions protect your data in concurrent, multi-user applications
- When and how to reach for NoSQL databases (MongoDB, Redis, Cassandra) alongside relational ones
- How to use Prisma in a TypeScript project — schema definition, migrations, CRUD operations, and advanced queries
- Distributed database concepts — sharding strategies, replication patterns, consistency trade-offs, and hot spot avoidance
- How to apply everything end-to-end on a real-world project: a social network database from requirements gathering through performance optimization

## Prerequisites

- Basic programming knowledge in any language (ORM chapters use TypeScript/Node.js examples)
- Familiarity with the command line
- No prior database experience is required for Part 1 and Part 2 — advanced sections in Parts 3 and 4 assume you have worked through the earlier material

## How to Use This Guide

1. **Follow the parts in order** — each part builds directly on the previous one; concepts introduced in fundamentals are assumed throughout the SQL and ORM chapters.
2. **Run every query yourself** — SQL is a hands-on skill; set up a local PostgreSQL instance and type the examples as you go rather than just reading through them.
3. **Pause at the Key Takeaways** — each chapter ends with a summary and often a short quiz; use them to confirm your understanding before moving on.
4. **Use the capstone project as a benchmark** — if you can work through all five chapters in `project-social-network/` without looking answers up, you are ready for production database work.
5. **Revisit the advanced sections when the problems are real** — sharding, replication, and distributed databases land best once you have genuine experience with SQL; come back to Part 4 when you encounter these challenges at work.

Good database design is one of the highest-leverage skills a developer can have — the time you invest here will pay dividends in every application you build.
