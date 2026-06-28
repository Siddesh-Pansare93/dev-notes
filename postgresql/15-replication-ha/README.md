# Replication & High Availability

PostgreSQL's replication and HA capabilities let you build database systems that survive failures, scale reads horizontally, and achieve near-zero downtime — this section teaches you how each mechanism works and how to put them together for production-grade reliability.

## Table of Contents

### Part 1: Physical Replication
- [01 — Replication Basics](./01-replication-basics.md)
  - Why replicate: HA, read scaling, disaster recovery
  - Primary/standby architecture and WAL streaming
  - `pg_basebackup` and standby initialization
  - Synchronous vs. asynchronous replication
  - Replication slots and hot standby
  - Monitoring lag with `pg_stat_replication`

### Part 2: Logical Replication
- [02 — Logical Replication](./02-logical-replication.md)
  - Physical vs. logical replication: when to use each
  - Publications and subscriptions
  - Selective table and row-level replication (PG15+)
  - Major version upgrades with logical replication
  - Conflict handling and DDL limitations
  - Monitoring subscriptions and slot disk usage

### Part 3: High Availability
- [03 — High Availability](./03-high-availability.md)
  - RTO and RPO: defining your availability targets
  - Automatic failover and split-brain prevention
  - Patroni with etcd for consensus-based HA
  - pg_auto_failover for simpler two-node setups
  - HAProxy for read/write split and routing
  - Health checks, VIPs, and multi-region HA patterns

## Learning Path

### Beginner
Start here if you are new to database replication:
1. **Replication Basics** (`01`) — understand WAL, primary/standby, and how `pg_basebackup` creates a standby
2. **Replication Basics** (`01`) — work through Example 1 (complete streaming replication setup) hands-on

### Intermediate
You understand streaming replication and want to go further:
1. **Replication Basics** (`01`) — synchronous replication, replication slots, and monitoring lag
2. **Logical Replication** (`02`) — publications, subscriptions, and selective table replication
3. **High Availability** (`03`) — HA concepts (RTO/RPO), automatic failover, and health checks

### Advanced
You are building production systems that require near-zero downtime:
1. **Logical Replication** (`02`) — row filtering (PG15+), conflict resolution, version upgrade strategy
2. **High Availability** (`03`) — Patroni three-node cluster, HAProxy read/write split, split-brain prevention
3. **High Availability** (`03`) — multi-region HA patterns and comprehensive monitoring with `pg_cron`

## What You'll Learn

- How PostgreSQL's Write-Ahead Log (WAL) powers both physical and logical replication
- Setting up streaming replication from scratch using `pg_basebackup` and replication slots
- The difference between synchronous (zero data loss) and asynchronous (better performance) replication
- When to use logical replication instead of physical replication, and how to use it for major version upgrades
- How publications and subscriptions work, including row-level filtering introduced in PostgreSQL 15
- Conflict detection and resolution strategies when subscribers are read-write
- What RTO and RPO mean and how to architect your cluster to meet them
- Deploying Patroni with etcd for consensus-driven automatic failover in under 30 seconds
- Deploying pg_auto_failover for simpler two-node setups without external DCS infrastructure
- Using HAProxy to route writes to the primary and distribute reads across replicas
- Preventing split-brain through quorum, fencing, and witness nodes
- Building monitoring views and health check functions you can drop into any production cluster

## Prerequisites

- Comfortable running PostgreSQL locally and editing `postgresql.conf`
- Familiarity with basic SQL (SELECT, INSERT, CREATE TABLE)
- Understanding of TCP networking (host, port, connection strings)
- For the HA chapter: exposure to Linux systemd and basic shell scripting

## How to Use This Guide

1. **Read the Theory sections first.** Each file opens with conceptual explanations and diagrams before showing any SQL or config. Understanding the why makes the syntax stick.
2. **Work through the Examples hands-on.** The step-by-step examples in each file are written to run on two local VMs or Docker containers — set those up before you start Chapter 01.
3. **Treat the Common Mistakes sections as a checklist.** Before declaring your replication setup production-ready, run through every mistake in all three files and verify you have not fallen into any of them.
4. **Use the Practice Exercises to validate understanding.** Each exercise has a full solution, but attempt it yourself first — the muscle memory of debugging a stuck subscription or a misconfigured `pg_hba.conf` is worth more than reading the answer.
5. **Layer the chapters together.** A real HA cluster combines all three topics: physical streaming replication (Chapter 01), logical replication for selective use cases or upgrades (Chapter 02), and an orchestration layer like Patroni (Chapter 03). Reading in order gives you the full picture.

Building systems that stay up under failure is one of the most satisfying skills in database engineering — dig in and enjoy the process.
