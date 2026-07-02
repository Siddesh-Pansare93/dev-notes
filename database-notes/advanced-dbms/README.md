# Advanced DBMS Concepts

Socho tumne ek chhoti si Node.js app banayi, ek Postgres database laga diya, aur sab kuch smooth chal raha hai. Ab imagine karo woh app achanak Zomato ban jaati hai — lakhon users, crores requests, aur ek single database server ab handle hi nahi kar pa raha. Yahi wo jagah hai jaha "Advanced DBMS" ka asli matlab samajh aata hai.

Ye section basic SQL aur relational databases se aage jaake distributed systems, NoSQL stores, aur scaling strategies cover karta hai — wahi cheezein jo Netflix, Instagram, Apple, aur Discord jaisi companies production mein use karti hain. Ye un backend developers ke liye hai jo system design interviews prepare kar rahe hain ya high-traffic applications pe kaam kar rahe hain.

## Table of Contents

1. [Sharding](./01-sharding.md) — Horizontal partitioning, shard keys, consistent hashing, cross-shard queries, resharding, Vitess aur Citus
2. [Replication](./02-replication.md) — Single-leader, multi-leader aur leaderless strategies, replication lag, Patroni, PgBouncer, read replicas
3. [MongoDB](./03-mongodb.md) — Document model, BSON, aggregation pipelines, indexing, replica sets, sharded clusters
4. [Redis](./04-redis.md) — In-memory data structures, persistence (RDB/AOF), pub/sub, Redis Cluster, cache aur message broker ke use cases
5. [Cassandra](./05-cassandra.md) — Wide column model, leaderless replication, consistent hashing ring, CQL, compaction, multi-region deployments

## Learning Path

Kaha se shuru karein? Ye depend karta hai tumhare current level pe. Neeche teen tracks diye hain — apna wala choose karo.

### Beginner (agar distributed databases bilkul naye hain tumhare liye)
1. [Replication](./02-replication.md) — sabse pehle samjho ki hum data ko multiple machines pe copy kyun karte hain
2. [MongoDB](./03-mongodb.md) — document-oriented thinking aur NoSQL basics ka ek easy on-ramp
3. [Redis](./04-redis.md) — sabse common tool jo tum apne backend stack mein add karoge

### Intermediate (SQL aur basic NoSQL mein comfortable ho)
1. [Sharding](./01-sharding.md) — sabse tricky scaling problem, first principles se explain kiya gaya
2. [Cassandra](./05-cassandra.md) — leaderless replication aur wide-column modeling deep dive

### Advanced (system design aur production readiness)
Saare paanch chapters order mein padho, phir Sharding aur Cassandra ko dobara visit karo production tooling sections ke liye (Vitess, Citus, multi-region Cassandra deployments). Replication chapter mein Patroni aur PgBouncer ka coverage PostgreSQL ko scale pe operate karne ke liye zaruri hai.

## What You'll Learn

Yaha ek quick preview hai ki is series ke end tak tumhare paas kya-kya skills honge:

- Sharding data ko horizontally kaise split karta hai machines ke across, aur konse shard key choices baad mein tumhe pareshaan karenge
- Single-leader, multi-leader, aur leaderless replication ke trade-offs — aur replication lag ka tumhare users pe kya asar padta hai
- MongoDB ka document model aur aggregation pipeline relational SQL se kaise alag hai, aur kab ise choose karna chahiye
- Redis sub-millisecond fast kyun hai, iske data structures (hashes, sorted sets, streams) kaise use karein, aur persistence aur cluster failover kaise handle karein
- Cassandra bina kisi primary node ke linear write scalability aur multi-region availability kaise achieve karta hai
- Real-world deployment tools: Patroni (Postgres HA), PgBouncer (connection pooling), Vitess (MySQL sharding), Citus (Postgres sharding)
- CAP theorem ki intuition — har database pe apply karke
- Write-heavy vs. read-heavy workloads ke liye data ko kaise model karein

## Prerequisites

Aage badhne se pehle ye cheezein confirm kar lo:

- SQL queries likhne mein comfortable ho (joins, indexes, transactions)
- Primary key aur index kya karte hain — iski basic understanding
- Client-server architecture aur network round-trip ki cost ka andaza
- CAP theorem ya distributed systems ka thoda exposure helpful hai but zaruri nahi — har chapter apni intuition zero se build karta hai

> [!info]
> Agar upar wali list padhke thoda nervous feel ho raha hai, tension mat lo. Har chapter analogy se start hota hai, jargon se nahi.

## How to Use This Guide

Kyun zaruri hai ye guide ka format samajhna? Kyunki jaldi mein padhoge to concepts slip ho jaayenge. Isliye:

1. **Pehle analogy padho.** Har chapter ek real-world analogy se khulta hai, jargon se pehle. Agar analogy samajh aa gayi, to uske baad ka technical content bahut jaldi click karega.
2. **Comparison tables skip mat karo.** Har chapter mein side-by-side tables hain jo approaches compare karti hain (jaise, sharding vs. replication, single-leader vs. leaderless). Ye differences ko memory mein anchor karne ka sabse fast tarika hai.
3. **Diagrams ko trace karo.** ASCII aur Mermaid diagrams dikhate hain data exactly kaise flow karta hai nodes ke beech. Inhe skim mat karo — step-by-step waha se guzro.
4. **"When to use / When NOT to use" sections use karo.** Yaha har major technology ka galat use bhi utna hi common hai. Ye sections tumhe galat cheez banane se bachayenge.
5. **System design practice ke baad dobara visit karo.** Ye notes system design interview problems ke saath achhe se pair karte hain. Ek chapter padhne ke baad, try karo ki us technology ko use karke koi system design karo (jaise, Cassandra use karke Twitter ka timeline design karo, ya Redis use karke ek session store design karo) aur jab stuck ho jao to notes pe wapas aao.

> [!tip]
> Ye topics compound hote hain — jo chapter khatam karoge, agla utna hi easy lagega. Ek se shuru karo, aur chalte raho.
