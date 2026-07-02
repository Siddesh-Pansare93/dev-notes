# Database Engineering

Chalo ek baat clear kar lete hain — chahe tum Node.js backend bana rahe ho ya koi bhi app, agar database sahi se samajh nahi aata, toh der-sabar mushkil hoti hi hai. Yeh guide ek complete package hai — database ke fundamentals se lekar SQL mastery, ORMs (Prisma), aur distributed database systems tak — bilkul zero se production-ready confidence tak.

Socho isko IRCTC ki tarah — pehle basic ticket booking samajhna padta hai (fundamentals), phir seat selection, payment, cancellation ka pura flow (SQL), phir ek slick app banani hai jo yeh sab manage kare (ORM), aur last mein jab crores of users ek saath Tatkal book kar rahe hain toh system girna nahi chahiye (distributed systems). Yehi is guide ka safar hai.

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

### Part 2: SQL — Basics se Advanced tak
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

Kaha se shuru karein? Yeh depend karta hai tumhare current level pe. Neeche teen tracks hain — apna waala pick karo.

### Beginner Track
Agar databases bilkul naye hain tumhare liye, ya kabhi SQL likha hi nahi — yahan se start karo:
1. What Is a Database (db-fundamentals/01)
2. The Relational Model (db-fundamentals/03)
3. ACID Properties (db-fundamentals/05)
4. Introduction to SQL (sql/01)
5. Creating Tables (sql/02)
6. SELECT and Querying (sql/04)
7. Filtering with WHERE (sql/05)
8. Joins (sql/06)

### Intermediate Track
Ab jab SQL ki foundation ban gayi hai, toh isko real applications se connect karna seekho:
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
Yahan hum production-grade database engineering aur distributed systems mein deep dive karte hain — jaise Zomato ya Swiggy scale pe systems kaise chalte hain:
1. Indexes and Performance (sql/11)
2. Transactions and Locking (sql/15)
3. JSON in SQL (sql/13)
4. Prisma Advanced (orms/06)
5. Sharding (advanced-dbms/01)
6. Replication (advanced-dbms/02)
7. Redis (advanced-dbms/04)
8. Cassandra (advanced-dbms/05)
9. Full Capstone Project (project-social-network/01 — 05)

## Kya Seekhoge Is Guide Mein?

- Databases andar se kaise kaam karte hain — storage engines, indexing, aur query execution ka pura game
- Relational model, normalization, aur scratch se clean, efficient schemas design karna
- Full SQL fluency — basic selects se lekar window functions, CTEs, triggers, aur JSON queries tak
- ACID guarantees aur transactions kaise tumhara data protect karte hain jab bahut saare users ek saath likh-padh rahe hon (concurrent access)
- NoSQL databases (MongoDB, Redis, Cassandra) kab aur kaise use karne hain relational ke saath
- TypeScript project mein Prisma kaise use karte hain — schema define karna, migrations, CRUD operations, aur advanced queries
- Distributed database concepts — sharding strategies, replication patterns, consistency trade-offs, aur hot spots se kaise bachna hai
- End-to-end kaise apply karna hai sab kuch — ek real-world social network database project, requirements gathering se lekar performance optimization tak

> [!tip]
> Yeh sab dry theory nahi hai — har concept ke saath real systems ka example diya gaya hai, jaise UPI transactions ya CRED ka reward system. Isse concept memory mein chipak jaata hai.

## Prerequisites

- Kisi bhi language mein basic programming knowledge (ORM chapters TypeScript/Node.js examples use karte hain)
- Command line se thodi familiarity
- Part 1 aur Part 2 ke liye koi prior database experience zaruri nahi — lekin Part 3 aur Part 4 ke advanced sections yeh assume karte hain ki tumne pehle waala material cover kar liya hai

## Is Guide Ko Kaise Use Karein

1. **Parts ko order mein follow karo** — har part pichle part pe directly build hota hai; fundamentals mein introduce kiye gaye concepts SQL aur ORM chapters mein assume kiye jaate hain.
2. **Har query khud run karo** — SQL ek hands-on skill hai, textbook padhke nahi aata. Local PostgreSQL instance setup karo aur examples khud type karo, sirf padhkar aage mat badho.
3. **Key Takeaways pe ruko** — har chapter ke end mein ek summary hoti hai aur kabhi-kabhi ek chhota quiz bhi. Aage badhne se pehle apni understanding confirm kar lo.
4. **Capstone project ko benchmark banao** — agar tum `project-social-network/` ke saare paanch chapters bina kahin answers dekhe kar sakte ho, toh samjho production database work ke liye ready ho.
5. **Advanced sections ko tab revisit karo jab problems real hon** — sharding, replication, aur distributed databases tab best samajh aate hain jab SQL ka genuine experience ho chuka ho. Jab kaam pe yeh challenges saamne aayein, tab Part 4 pe wapas aana.

Good database design ek aisi skill hai jiska ROI sabse zyada hota hai ek developer ke liye — yahan jo time invest karoge, woh har application mein dividends dega jo tum aage banaoge.
