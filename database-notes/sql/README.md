# SQL Mastery

Socho ek second ke liye — tumhara pura app, chahe woh Zomato jaisa order-tracking system ho ya CRED jaisa payment app, ultimately data pe hi chal raha hai. Aur woh data kahan store hota hai? Database mein. Aur database se baat karne ki language kya hai? **SQL**.

Ye guide tumhe scratch se le jayegi — pehla `SELECT` likhne se lekar window functions, transactions, security, aur PostgreSQL/MySQL/SQL Server/Oracle ke beech ke subtle dialect differences tak. Yeh koi toy-example wali kitaab nahi hai — jo bhi seekhoge, production mein direct use kar paoge.

## Table of Contents

### Part 1 — Foundations

- [01. Introduction to SQL](./01-introduction.md) — SQL kya hai, iski history, sub-languages (DDL/DML/DQL/DCL/TCL), aur local database set up karna
- [02. Creating Tables](./02-creating-tables.md) — DDL, data types, primary keys, constraints, aur schema design ke basics
- [03. DML: INSERT, UPDATE, DELETE](./03-dml-insert-update-delete.md) — Data likhna aur modify karna; MERGE / upsert patterns
- [04. SELECT and Querying](./04-select-querying.md) — Poora SELECT statement: columns, aliases, ORDER BY, LIMIT, DISTINCT
- [05. Filtering with WHERE](./05-filtering-where.md) — Comparison operators, BETWEEN, IN, LIKE, IS NULL, logical operators

### Part 2 — Core Query Patterns

- [06. Joins](./06-joins.md) — INNER, LEFT, RIGHT, FULL OUTER, CROSS, aur self-joins, visual diagrams ke saath
- [07. Aggregations](./07-aggregations.md) — GROUP BY, HAVING, COUNT/SUM/AVG/MIN/MAX, aur grouping sets
- [08. Subqueries](./08-subqueries.md) — Scalar, correlated, aur table subqueries; EXISTS vs IN; kab kya use karna hai

### Part 3 — Programmability and Performance

- [09. Views, Stored Procedures, and Functions](./09-views-procedures-functions.md) — Logic ko encapsulate karna; materialized views; kab kaunsa abstraction use karein
- [10. Triggers](./10-triggers.md) — BEFORE/AFTER triggers, use cases, aur avoid karne wale pitfalls
- [11. Indexes and Performance](./11-indexes-and-performance.md) — B-Tree, composite, partial, aur covering indexes; EXPLAIN/EXPLAIN ANALYZE; query planning
- [12. CTEs and Window Functions](./12-cte-window-functions.md) — WITH clauses, recursive CTEs, ROW_NUMBER/RANK/DENSE_RANK, LAG/LEAD, running totals, moving averages

### Part 4 — Advanced Topics

- [13. JSON in SQL](./13-json-in-sql.md) — JSON data store aur query karna; PostgreSQL mein JSONB; alag-alag databases ke JSON functions
- [14. Security](./14-security.md) — GRANT/REVOKE, roles, row-level security, SQL injection se bachna
- [15. Transactions and Locking](./15-transactions-locking.md) — ACID properties, isolation levels, deadlocks, optimistic vs pessimistic locking
- [16. Full-Text Search and Advanced Features](./16-advanced-features.md) — Full-text search, arrays, ranges, extensions, aur lateral joins (PostgreSQL-focused)
- [17. Database Comparison: PostgreSQL vs MySQL vs SQL Server vs Oracle](./17-database-comparison.md) — Side-by-side syntax reference, feature matrix, aur kab kaunsa engine choose karein

---

## Learning Path

### Beginner — Ek solid foundation banao

Ye chapters order mein padhna. Iske end tak tum wahi SQL confidently likh aur padh paoge jo day-to-day application development mein use hoti hai.

1. Introduction to SQL (Ch. 01)
2. Creating Tables (Ch. 02)
3. DML: INSERT, UPDATE, DELETE (Ch. 03)
4. SELECT and Querying (Ch. 04)
5. Filtering with WHERE (Ch. 05)
6. Joins (Ch. 06)
7. Aggregations (Ch. 07)
8. Subqueries (Ch. 08)

### Intermediate — Production-level SQL tak level up karo

Ye chapters wahi patterns cover karte hain jo real applications aur data pipelines mein use hote hain.

9. Views, Stored Procedures, and Functions (Ch. 09)
10. Triggers (Ch. 10)
11. Indexes and Performance (Ch. 11)
12. CTEs and Window Functions (Ch. 12)

### Advanced — Expert-level aur database-specific knowledge

Inhe tab tackle karo jab intermediate material mein comfortable ho jao. Har chapter zyada tar standalone hai.

13. JSON in SQL (Ch. 13)
14. Security (Ch. 14)
15. Transactions and Locking (Ch. 15)
16. Full-Text Search and Advanced Features (Ch. 16)
17. Database Comparison Reference (Ch. 17)

---

## Tum Kya Seekhoge

- Joins, filters, aggregations aur subqueries ke saath confident `SELECT` queries likhna
- Sahi data types, constraints, aur foreign keys ke saath normalized schemas design karna
- Data safely insert, update, aur delete karna — upsert patterns samet
- Views, stored procedures, aur user-defined functions se reusable logic encapsulate karna
- Indexes create aur maintain karna taaki slow queries dramatically fast ho jayein
- `EXPLAIN` / `EXPLAIN ANALYZE` output padh kar query plans diagnose karna (jaise Swiggy backend team apne slow order-search query ko debug karti hogi)
- CTEs likhna taaki complex queries readable aur debuggable steps mein toot jayein
- Window functions (ROW_NUMBER, RANK, LAG, LEAD, running SUM) use karke analytics nikalna
- ACID guarantees samajhna aur sahi transaction isolation level choose karna
- Roles, grants, row-level security, aur parameterized queries se apna database protect karna
- Relational tables ke andar JSON documents query aur store karna
- PostgreSQL, MySQL, SQL Server, aur Oracle ke dialect differences navigate karna

---

## Prerequisites

- Kisi bhi programming language mein basic comfort (expert hona zaruri nahi)
- Tables aur rows ka concept pata ho (spreadsheet-level samajh kaafi hai)
- Ek database jahan examples run kar sako — introduction chapter mein tumhe five minute se kam mein setup karke dikhaya gaya hai

---

## Is Guide Ko Kaise Use Karein

1. **Har example run karo.** SQL ko sirf padhna aur usse actually run karke result set dekhna — dono mein zameen-aasman ka farak hai. Zero-setup ke liye SQLite use karo, ya Chapter 01 mein dikhaye gaye tarike se Docker pe PostgreSQL spin up kar lo.
2. **Pehle beginner path follow karo, chahe tumhe thoda SQL experience ho.** Baad ke chapters pehle wale chapters ka vocabulary aur patterns assume karte hain.
3. **Quizzes zaroor karo.** Har chapter ke end mein 2-3 multiple-choice questions hain jo unn subtleties ko pakadte hain jo log pehli baar padhte waqt miss kar dete hain.
4. **Chapter 17 ko reference ki tarah use karo.** Jab concepts comfortable ho jayein, database comparison chapter bookmark kar lo — engines switch karte waqt syntax translate karne ka sabse fast tarika yahi hai.
5. **Examples ko modify karo.** WHERE clause change karo, column add karo, jaan-bujh kar query break karo. Query kya karti hai samajhne ka sabse fast tarika hai use galat direction mein push karke dekhna ki woh kaise fail hoti hai.

---

SQL pichhle 50+ saalon se data ke saath kaam karne ki dominant language rahi hai — aur yahan jo investment karoge, woh har stack, har framework, aur har job title mein dividend dega. Chalo shuru karte hain.
