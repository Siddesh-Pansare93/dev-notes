# Database Fundamentals

Everything you need to go from "what even is a database?" to confidently designing schemas, writing correct transactions, and choosing the right database for the job. This section is for developers who are new to databases or who want to solidify the foundational concepts that underpin every system they will ever build.

## Table of Contents

**Part 1 — Core Concepts**

1. [What Is a Database?](./01-what-is-a-database.md)
2. [Data Modeling](./02-data-modeling.md)
3. [The Relational Model](./03-relational-model.md)

**Part 2 — Schema Design**

4. [Normalization](./04-normalization.md)
5. [Joins and Relationships](./08-joins-and-relationships.md)
6. [Database Design Best Practices](./09-database-design.md)

**Part 3 — Reliability and Performance**

7. [ACID Properties](./05-acid-properties.md)
8. [Transactions](./07-transactions.md)
9. [Indexes](./06-indexes.md)

**Part 4 — Choosing the Right Database**

10. [SQL vs NoSQL](./10-sql-vs-nosql.md)

## Learning Path

**Beginner** — Start here if databases are new to you.

Read chapters 1 → 2 → 3 in order. These three files give you the mental model: what a database is, how data is modelled conceptually, and how the relational model turns that model into tables.

**Intermediate** — Build your schema design intuition.

After the core concepts, work through chapters 4 → 8 → 9. Normalization teaches you to eliminate redundancy; Joins shows you how to query across tables; Database Design Best Practices covers the naming, key, and anti-pattern decisions real teams argue over.

**Advanced** — Understand what makes databases reliable and fast.

Tackle chapters 5 → 7 → 6 — ACID Properties, Transactions, and Indexes. These are the topics that separate developers who use databases from developers who understand them. Finish with chapter 10 to frame everything in the broader SQL vs NoSQL landscape.

## What You'll Learn

- What a database management system (DBMS) is and why plain files do not scale
- How to model real-world problems as entities, attributes, and relationships using ER diagrams
- How the relational model represents data as tables, rows, and columns with precise rules
- How normalization (1NF through BCNF) eliminates data redundancy and prevents update anomalies
- How ACID guarantees — Atomicity, Consistency, Isolation, Durability — keep your data trustworthy
- How transactions work, what COMMIT and ROLLBACK mean, and how isolation levels affect concurrency
- How indexes speed up reads and the trade-offs they introduce for writes and storage
- How to write and reason about JOINs: INNER, LEFT, RIGHT, FULL OUTER, and CROSS
- Schema design best practices: naming conventions, surrogate keys, soft deletes, UUIDs vs auto-increment, and common anti-patterns
- The fundamental trade-offs between SQL (relational) and NoSQL (document, key-value, column-family, graph) databases and when to choose each

## Prerequisites

- Basic comfort with the command line and a text editor
- A rough idea of what "storing data" means (no prior SQL or database experience needed)
- Familiarity with at least one programming language helps with the code examples, but is not required

## How to Use This Guide

1. **Follow the numbered order on a first pass.** The chapters are sequenced so each one builds on the last — jumping ahead to Transactions without reading ACID Properties first will leave gaps.
2. **Type out the SQL examples.** Passive reading of query syntax does not stick. Spin up a local PostgreSQL or SQLite instance and run every snippet you encounter.
3. **Pause at the quizzes.** Each chapter ends with review questions. Answer them before moving on — they surface the concepts most people skim past.
4. **Use the Learning Path tracks if you are time-constrained.** The Beginner track alone gives you enough to start writing sensible schemas. Come back for the Intermediate and Advanced tracks as your projects grow in complexity.
5. **Revisit chapters 5 and 6 (ACID and Indexes) often.** These topics feel abstract the first time and click completely once you have debugged a race condition or a slow query in a real app.

The fundamentals are the part of databases that never go out of date — invest time here and every framework, ORM, and cloud service you learn afterwards will make more sense.
