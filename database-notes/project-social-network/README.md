# Project: Social Network Database

Socho tumhe ek Instagram/Twitter jaisa hybrid social network banana hai — but sirf UI nahi, poora database layer, from scratch. Yeh series exactly wahi karwati hai: PostgreSQL, Prisma, aur TypeScript use karke ek real, end-to-end database design banate hain. Yeh koi toy example nahi hai jaha 2-3 tables bana ke chhod diya jaaye — yaha schema decisions, SQL queries, ORM patterns, aur performance tuning sab ek hi project mein saath-saath dekhne ko milega, jaise ek asli production app mein hota hai.

## Table of Contents

### Part 1 — Design

1. [Requirements and Architecture](./01-requirements.md) — Feature scope kya hai, entities kaise dhoondhte hain, ER diagram, cardinality decisions, aur tech stack ka overview
2. [Schema Design](./02-schema-design.md) — Poore `CREATE TABLE` statements, har column ke piche ka reasoning, indexes, triggers, denormalized counters, aur other databases ke equivalents

### Part 2 — Implementation

3. [SQL Queries](./03-sql-queries.md) — Feed query likhna, profile lookups, hashtag search, follower counts — schema pe real queries chalana
4. [Prisma Implementation](./04-prisma-implementation.md) — SQL schema ko `schema.prisma` mein translate karna, migrations run karna, data seed karna, aur typed Prisma client use karna

### Part 3 — Performance

5. [Optimization](./05-optimization.md) — Index strategy, `EXPLAIN ANALYZE`, N+1 problem, celebrity/hotspot problem, cursor pagination, denormalized counters, read replicas, connection pooling, Redis caching, aur database monitoring

## Learning Path

**Beginner** — Agar tum relational databases mein naye ho, ya sirf ORM use kiya hai bina yeh samjhe ki underneath kya ho raha hai, toh yaha se shuru karo:
1. Chapter 01 — Requirements and Architecture (samjho ki hum bana kya rahe hai aur kyun)
2. Chapter 02 — Schema Design (real `CREATE TABLE` SQL padhna aur likhna seekho)
3. Chapter 03 — SQL Queries (joins, aggregations, aur filtered queries khud haath se likho)

**Intermediate** — Agar SQL mein comfortable ho aur ORM + production patterns add karna chahte ho, yaha se pick karo:
4. Chapter 04 — Prisma Implementation (dekho Prisma us SQL pe kaise map hota hai jo tumhe pehle se aata hai)
5. Chapter 05 — Optimization, sections: Index Strategy aur N+1 Problem

**Advanced** — Production ya system design interviews ki taiyari karne walo ke liye:
6. Chapter 05 — Optimization, sections: Celebrity Problem, Cursor Pagination, Read Replicas, Redis Caching, Connection Pooling, aur Database Monitoring

## Kya Seekhoge Tum?

- Product requirements ki list ko database entities, relationships, aur cardinalities mein kaise convert karte hain
- Compound primary keys kab use karein vs surrogate IDs, aur data integrity ke liye yeh kyun matter karta hai
- Production-quality `CREATE TABLE` statements kaise likhein — proper constraints, defaults, aur cascade behavior ke saath
- `TIMESTAMPTZ` aur `TIMESTAMP` mein farak kya hai, aur timezones ke across yeh kyun important hai
- Self-referential many-to-many table (follow graph) kaise design karte hain
- Database triggers use karke denormalized counter columns ko consistent kaise rakhein
- `deleted_at` aur partial indexes ke saath soft deletes kaise implement karein
- `EXPLAIN ANALYZE` output kaise likhein aur padhein, taaki slow queries diagnose kar sako
- Prisma mein `include` use karke N+1 query problem kaise pehchanein aur fix karein
- Celebrity/hotspot problem kaise kaam karta hai, aur Twitter ka hybrid fan-out approach isko kaise solve karta hai
- Live, large datasets ke liye cursor pagination, offset pagination se better kyun hai
- PostgreSQL ke upar Redis caching kaise layer karein, bina stale-data bugs introduce kiye
- Real deployment mein read replicas aur connection pooling (PgBouncer / Prisma Accelerate) kaise kaam karte hain

## Prerequisites

- Basic SQL: `SELECT`, `JOIN`, `WHERE`, aur `GROUP BY` kya karte hain — itna pata hona chahiye
- Kam se kam ek backend language se familiarity (Prisma wale chapters TypeScript/Node.js use karte hain)
- Prisma ya PostgreSQL ka pehle se experience zaruri nahi hai — jo bhi introduce hoga, explain kiya jaayega

## Is Guide Ko Kaise Use Karein

1. **Pehli baar chapters ko order mein follow karo.** Har chapter pichle chapter ke schema aur decisions ke upar build hota hai. Aage kood ke padhoge toh gaps reh jaayenge — jaise recipe ka ek step miss karke direct dessert pe kood jaana.
2. **SQL aur Prisma code khud type karo.** Sirf padhne se muscle memory nahi banti — schemas ko pressure mein scratch se likhne ki practice type karke hi aati hai.
3. **Chapter 05 ki har query pe `EXPLAIN ANALYZE` run karo.** Sequential scan aur index scan ka farak tab tak "real" nahi lagega jab tak numbers apni aankhon se na dekh lo.
4. **Chapter 01 ka ER diagram poori guide mein reference ki tarah use karo.** Jab bhi koi foreign key ya join confusing lage, diagram pe wapas jaake relationship ko visually dekh lo.
5. **Design decisions ko apne khud ke projects ke liye ek checklist ki tarah treat karo.** "Why" wale explanations (CASCADE vs SET NULL, BIGSERIAL vs SERIAL, soft deletes, partial indexes) har relational schema pe apply hote hain jo tum kabhi bhi likhoge.

> [!tip]
> Isse ek baar end-to-end bana lo — ek Zomato ya Swiggy jaisi app ke database ki tarah socho, jaha users follow karte hain, posts feed mein aati hain, aur counters (likes, followers) real-time update hote hain. Ek baar yeh mental model ban gaya, toh database design tumhare career mein hamesha kaam aayega.
