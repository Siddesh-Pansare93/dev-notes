# Database Fundamentals

Socho ek second — "database kya hota hai?" se leke confidently schema design karna, transactions sahi se likhna, aur apne project ke liye sahi database choose karna — is section mein yeh sab kuch cover hoga. Agar tum databases mein naye ho, ya phir foundational concepts ko pakka karna chahte ho jo har system ke neeche chhupe hote hain, yeh section tumhare liye hai.

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

**Beginner** — Agar databases tumhare liye bilkul naye hain, yahan se start karo.

Chapters 1 → 2 → 3 order mein padho. Yeh teen files tumhe mental model dengi: database asal mein hota kya hai, data ko conceptually model kaise karte hain, aur relational model us model ko tables mein kaise badalta hai.

**Intermediate** — Apni schema design ki samajh (intuition) build karo.

Core concepts ke baad, chapters 4 → 8 → 9 pe kaam karo. Normalization sikhata hai redundancy kaise hataye; Joins dikhata hai tables ke across query kaise kare; Database Design Best Practices mein naming, keys, aur anti-patterns cover hote hain jinpe real teams bahas karti hain.

**Advanced** — Samjho ki databases ko reliable aur fast kya banata hai.

Chapters 5 → 7 → 6 tackle karo — ACID Properties, Transactions, aur Indexes. Yeh woh topics hain jo un developers ko alag karte hain jo sirf database "use" karte hain un developers se jo database ko "samajhte" hain. Chapter 10 ke saath khatam karo, jisse sab kuch SQL vs NoSQL ke bade perspective mein fit ho jaayega.

## What You'll Learn

- Database management system (DBMS) kya hota hai, aur plain files (jaise CSV, text files) scale kyun nahi karti
- Real-world problems ko entities, attributes, aur relationships mein kaise model karein — ER diagrams ke through
- Relational model data ko tables, rows, aur columns mein precise rules ke saath kaise represent karta hai
- Normalization (1NF se BCNF tak) data redundancy kaise khatam karta hai aur update anomalies ko kaise rokta hai
- ACID guarantees — Atomicity, Consistency, Isolation, Durability — tumhare data ko trustworthy kaise banate hain
- Transactions kaise kaam karte hain, COMMIT aur ROLLBACK ka matlab kya hai, aur isolation levels concurrency ko kaise affect karte hain
- Indexes reads ko fast kaise banate hain, aur iske badle writes aur storage pe kya trade-off aata hai
- JOINs kaise likhein aur reason karein — INNER, LEFT, RIGHT, FULL OUTER, aur CROSS
- Schema design best practices: naming conventions, surrogate keys, soft deletes, UUIDs vs auto-increment, aur common anti-patterns
- SQL (relational) aur NoSQL (document, key-value, column-family, graph) databases ke fundamental trade-offs, aur kab kaunsa choose karna hai

## Prerequisites

- Command line aur text editor ke saath thoda comfort
- "Data store karna" ka rough idea (SQL ya database ka prior experience zaruri nahi)
- Kisi bhi ek programming language ki familiarity code examples samajhne mein help karegi, lekin zaruri nahi hai

## How to Use This Guide

1. **Pehli baar numbered order follow karo.** Chapters is tarah sequence kiye gaye hain ki har ek pichle wale pe build karta hai — agar tum Transactions seedha padhoge bina ACID Properties padhe, toh gaps reh jaayenge.
2. **SQL examples type karke practice karo.** Sirf query syntax padhna kaafi nahi hota, yeh cheez zehen mein baithti nahi. Ek local PostgreSQL ya SQLite instance spin up karo aur jo bhi snippet mile, usko khud run karo.
3. **Quizzes pe ruko.** Har chapter ke end mein review questions hain. Aage badhne se pehle unhe answer karo — yehi woh concepts hain jinhe log skim karke aage nikal jaate hain.
4. **Time-constrained ho toh Learning Path tracks use karo.** Beginner track akela itna de dega ki tum sensible schemas likhna start kar sako. Jaise-jaise projects complex hote jaayein, Intermediate aur Advanced tracks pe wapas aa jaana.
5. **Chapters 5 aur 6 (ACID aur Indexes) baar-baar revisit karo.** Yeh topics pehli baar mein abstract lagte hain, aur tab poori tarah click karte hain jab tumne kisi real app mein race condition ya slow query khud debug ki ho.

> [!tip]
> Fundamentals woh part hain databases ka jo kabhi outdated nahi hote — yahan time invest karo, aur baad mein jo bhi framework, ORM, ya cloud service seekhoge, woh sab zyada sense banayega.
