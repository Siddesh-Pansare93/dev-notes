# Advanced DBMS Concepts

This section goes beyond basic SQL and relational databases to cover the distributed systems, NoSQL stores, and scaling strategies that power production systems at companies like Netflix, Instagram, Apple, and Discord. It is for backend developers and engineers preparing for system design interviews or working on high-traffic applications.

## Table of Contents

1. [Sharding](./01-sharding.md) — Horizontal partitioning, shard keys, consistent hashing, cross-shard queries, resharding, Vitess and Citus
2. [Replication](./02-replication.md) — Single-leader, multi-leader and leaderless strategies, replication lag, Patroni, PgBouncer, read replicas
3. [MongoDB](./03-mongodb.md) — Document model, BSON, aggregation pipelines, indexing, replica sets, sharded clusters
4. [Redis](./04-redis.md) — In-memory data structures, persistence (RDB/AOF), pub/sub, Redis Cluster, use cases as cache and message broker
5. [Cassandra](./05-cassandra.md) — Wide column model, leaderless replication, consistent hashing ring, CQL, compaction, multi-region deployments

## Learning Path

### Beginner (start here if you are new to distributed databases)
1. [Replication](./02-replication.md) — understand why we copy data across machines before anything else
2. [MongoDB](./03-mongodb.md) — a gentle on-ramp to document-oriented thinking and NoSQL basics
3. [Redis](./04-redis.md) — learn the most common tool you will add to any backend stack

### Intermediate (comfortable with SQL and basic NoSQL)
1. [Sharding](./01-sharding.md) — the hardest scaling problem explained from first principles
2. [Cassandra](./05-cassandra.md) — leaderless replication and wide-column modeling in depth

### Advanced (system design and production readiness)
Read all five chapters in order, then revisit Sharding and Cassandra for the production tooling sections (Vitess, Citus, multi-region Cassandra deployments). The replication chapter's coverage of Patroni and PgBouncer is essential for operating PostgreSQL at scale.

## What You'll Learn

- How sharding splits data horizontally across machines and which shard key choices will come back to haunt you
- The trade-offs between single-leader, multi-leader, and leaderless replication — and what replication lag means for your users
- How MongoDB's document model and aggregation pipeline differ from relational SQL, and when to choose it
- Why Redis is sub-millisecond fast, how to use its data structures (hashes, sorted sets, streams), and how to handle persistence and cluster failover
- How Cassandra achieves linear write scalability and multi-region availability without a primary node
- Real-world deployment tools: Patroni (Postgres HA), PgBouncer (connection pooling), Vitess (MySQL sharding), Citus (Postgres sharding)
- CAP theorem intuition applied to each database covered here
- How to model data for write-heavy vs. read-heavy workloads

## Prerequisites

- Comfortable writing SQL queries (joins, indexes, transactions)
- Basic understanding of what a primary key and index do
- Familiarity with client-server architecture and what a network round-trip costs
- Some exposure to CAP theorem or distributed systems concepts is helpful but not required — each chapter builds the intuition from scratch

## How to Use This Guide

1. **Read the analogy first.** Every chapter opens with a real-world analogy before any jargon. If the analogy makes sense, the technical content that follows will click much faster.
2. **Do not skip the comparison tables.** Each chapter includes side-by-side tables comparing approaches (e.g., sharding vs. replication, single-leader vs. leaderless). These are the fastest way to anchor the differences in your memory.
3. **Trace the diagrams.** ASCII and Mermaid diagrams show exactly how data flows between nodes. Walk through them step-by-step rather than skimming past them.
4. **Use the "When to use / When NOT to use" sections.** Every major technology here is also frequently misused. These sections will save you from building the wrong thing.
5. **Revisit after system design practice.** These notes pair well with system design interview problems. After reading a chapter, try designing a system that uses that technology (e.g., design Twitter's timeline using Cassandra, or a session store using Redis) and come back to the notes when you get stuck.

These topics compound — each chapter you finish makes the next one easier. Start with one, and keep going.
