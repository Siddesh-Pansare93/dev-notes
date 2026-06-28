# System Design Complete Roadmap
## 69 Chapters | HLD + LLD | Interview-Ready

> Last updated: June 2026
> All 69 chapters live under `system-design-notes/` as numbered subfolders, each with a `README.md`.

---

## Learning Path Overview

```
BEGINNER                 INTERMEDIATE              ADVANCED               INTERVIEW-READY
    |                         |                        |                        |
Ch 01-11               Ch 12-31                 Ch 32-46                Ch 47-69
Process &              Infrastructure           Architecture             Case Studies
Networking             Building Blocks          Patterns                 & LLD Problems
    |                         |                        |                        |
~2 weeks               ~3 weeks                 ~2 weeks                ~2 weeks
```

### Visual Learning Path (ASCII)

```
[START]
   |
   v
+----------------------------------------------------------+
| PHASE 1: FOUNDATIONS (Ch 01-11)                          |
| The "How to think" phase                                 |
| 01 -> 02 -> 03 -> 04 -> 05 -> 06 -> 07 -> 08 -> 09 -> 10 -> 11 |
+----------------------------------------------------------+
   |
   v
+----------------------------------------------------------+
| PHASE 2: INFRASTRUCTURE (Ch 12-26)                       |
| The "Building blocks" phase                              |
| 12 -> 13 -> 14 -> 15 -> 16 -> 17 -> 18 -> 19            |
|                     |                                    |
|              20 -> 21 -> 22 -> 23 -> 24 -> 25 -> 26     |
+----------------------------------------------------------+
   |
   v
+----------------------------------------------------------+
| PHASE 3: COMMUNICATION & ARCHITECTURE (Ch 27-46)         |
| The "Putting it together" phase                          |
| 27 -> 28 -> 29 -> 30 -> 31 -> 32                        |
|                     |                                    |
|              33 -> 34 -> 35 -> 36 -> 37 -> 38           |
|                     |                                    |
|              39 -> 40 -> 41 -> 42 -> 43 -> 44 -> 45 -> 46 |
+----------------------------------------------------------+
   |
   v
+----------------------------------------------------------+
| PHASE 4: HLD CASE STUDIES (Ch 47-57)                     |
| The "Apply it" phase                                     |
| 47 -> 48 -> 49 -> 50 -> 51 -> 52 -> 53 -> 54 -> 55 -> 56 -> 57 |
+----------------------------------------------------------+
   |
   v
+----------------------------------------------------------+
| PHASE 5: LOW LEVEL DESIGN (Ch 58-69)                     |
| The "Code design" phase                                  |
| 58 -> 59 -> 60 -> 61 -> 62                              |
|                     |                                    |
|              63 -> 64 -> 65 -> 66 -> 67 -> 68 -> 69     |
+----------------------------------------------------------+
   |
   v
[INTERVIEW-READY]
```

---

## All 69 Chapters — One-Line Descriptions

### Phase 1: Foundations (Ch 01-11)

| # | Chapter | One-Line Description |
|---|---------|---------------------|
| 01 | [Introduction to System Design](./01-introduction/README.md) | The design process, trade-off thinking, and how to approach any system design problem from scratch |
| 02 | [Requirements Gathering](./02-requirements/README.md) | How to clarify functional vs non-functional requirements and write them down before drawing a single box |
| 03 | [Capacity Estimation](./03-capacity-estimation/README.md) | Back-of-the-envelope math: QPS, storage, bandwidth, and the latency numbers every engineer must memorize |
| 04 | [Networking Basics](./04-networking/README.md) | TCP vs UDP, HTTP/HTTPS, IPv4/IPv6, firewalls, NAT — the physical substrate everything runs on |
| 05 | [DNS Deep Dive](./05-dns-deep-dive/README.md) | How DNS resolution works end-to-end, TTLs, record types, and how DNS itself is a distributed system |
| 06 | [Client-Server Architecture](./06-client-server/README.md) | The request-response model, session management, polling vs push, and sync vs async communication |
| 07 | [API Design](./07-api-design/README.md) | REST principles, HTTP methods/status codes, versioning, authentication, and API documentation |
| 08 | [CAP Theorem](./08-cap-theorem/README.md) | Why you can only have two of Consistency, Availability, and Partition Tolerance — and what to pick |
| 09 | [Consistency Models](./09-consistency/README.md) | Strong, eventual, causal, and read-your-writes consistency — what each guarantees and costs |
| 10 | [Horizontal vs Vertical Scaling](./10-scaling/README.md) | When to scale up vs scale out, stateless vs stateful services, and the economics of each approach |
| 11 | [Load Balancing](./11-load-balancing/README.md) | Round-robin, least-connections, consistent hashing, health checks, and HA for load balancers |

### Phase 2: Infrastructure Building Blocks (Ch 12-26)

| # | Chapter | One-Line Description |
|---|---------|---------------------|
| 12 | [Reverse Proxy](./12-reverse-proxy/README.md) | What a reverse proxy does differently from a load balancer, and when to use Nginx/HAProxy/Envoy |
| 13 | [Caching Strategies](./13-caching/README.md) | Cache-aside, write-through, write-behind, eviction policies (LRU/LFU), and Redis vs Memcached |
| 14 | [CDN](./14-cdn/README.md) | How content delivery networks work, push vs pull CDN, cache invalidation, and cost optimization |
| 15 | [Consistent Hashing](./15-consistent-hashing/README.md) | The algorithm that makes adding/removing nodes nearly seamless — used in Dynamo, Cassandra, Redis Cluster |
| 16 | [Database Fundamentals](./16-databases/README.md) | ACID properties, indexing (B-tree, LSM-tree), transactions, and the anatomy of a database engine |
| 17 | [SQL vs NoSQL](./17-sql-nosql/README.md) | When relational beats document/key-value/wide-column/graph — and the trade-offs that drive that choice |
| 18 | [Database Sharding](./18-sharding/README.md) | Range, hash, and directory-based sharding strategies, hotspot problems, and resharding pain |
| 19 | [Database Replication](./19-replication/README.md) | Primary-replica and multi-primary replication, replication lag, and automated failover |
| 20 | [Bloom Filters](./20-bloom-filters/README.md) | A probabilistic data structure that trades false positives for massive memory savings |
| 21 | [Distributed Locks](./21-distributed-locks/README.md) | How to coordinate exclusive access across services using Redis Redlock, ZooKeeper, or etcd |
| 22 | [Idempotency](./22-idempotency/README.md) | Why at-least-once delivery requires idempotent consumers and how to design idempotency keys |
| 23 | [Distributed Tracing](./23-distributed-tracing/README.md) | Trace IDs, spans, sampling strategies, and tools (Jaeger/Zipkin) for debugging distributed systems |
| 24 | [Object Storage](./24-object-storage/README.md) | S3-compatible blob storage, chunking, metadata, presigned URLs, and multi-part uploads |
| 25 | [Geo-Distributed Systems](./25-geo-distributed/README.md) | Multi-region architecture, data residency, latency optimization, and global traffic routing |
| 26 | [Consensus Algorithms](./26-consensus-algorithms/README.md) | Raft and Paxos explained plainly — leader election, log replication, and why they matter for etcd/Kafka |

### Phase 3: Communication Patterns (Ch 27-32)

| # | Chapter | One-Line Description |
|---|---------|---------------------|
| 27 | [Message Queues](./27-message-queues/README.md) | RabbitMQ vs Kafka vs SQS — delivery guarantees, ordering, consumer groups, and dead-letter queues |
| 28 | [Event-Driven Architecture](./28-event-driven/README.md) | Decoupling producers and consumers through events, event schemas, and event buses |
| 29 | [WebSockets & SSE](./29-websockets-sse/README.md) | Full-duplex WebSockets vs unidirectional Server-Sent Events — when to use each for real-time |
| 30 | [Webhooks](./30-webhooks/README.md) | HTTP callbacks for async notifications, retry logic, signature verification, and reliability patterns |
| 31 | [gRPC vs REST vs GraphQL](./31-grpc-rest-graphql/README.md) | Protocol trade-offs for internal microservices, public APIs, and flexible client queries |
| 32 | [Real-Time Systems](./32-real-time/README.md) | Operational challenges of building systems where data freshness is measured in milliseconds |

### Phase 3: Architecture Patterns (Ch 33-46)

| # | Chapter | One-Line Description |
|---|---------|---------------------|
| 33 | [Microservices Architecture](./33-microservices/README.md) | Service decomposition, bounded contexts, inter-service communication, and the cost of distribution |
| 34 | [API Gateway](./34-api-gateway/README.md) | Single entry point for routing, auth, rate limiting, SSL termination, and protocol translation |
| 35 | [Rate Limiting](./35-rate-limiting/README.md) | Token bucket, sliding window, fixed window algorithms and distributed rate limiting across nodes |
| 36 | [Circuit Breaker Pattern](./36-circuit-breaker/README.md) | Closed/open/half-open states that prevent cascading failures in distributed service calls |
| 37 | [Service Discovery](./37-service-discovery/README.md) | Client-side vs server-side discovery, service registries (Consul/etcd), and health checking |
| 38 | [Service Mesh](./38-service-mesh/README.md) | Istio/Linkerd sidecar proxies that handle mTLS, retries, circuit breaking, and observability transparently |
| 39 | [CQRS Pattern](./39-cqrs/README.md) | Separating reads from writes for independent scaling and specialized read models |
| 40 | [Event Sourcing](./40-event-sourcing/README.md) | Storing state as an append-only log of events rather than mutable rows — audit log for free |
| 41 | [Saga Pattern](./41-saga-pattern/README.md) | Choreography vs orchestration for distributed transactions without two-phase commit |
| 42 | [Monitoring & Observability](./42-monitoring/README.md) | The three pillars — metrics (Prometheus), logs (ELK), traces (Jaeger) — and how to alert well |
| 43 | [Authentication & Authorization](./43-auth/README.md) | Password hashing, sessions, JWT, OAuth 2.0, RBAC vs ABAC, and SSO patterns |
| 44 | [Security Best Practices](./44-security/README.md) | HTTPS/TLS, injection prevention, CSRF, XSS, secrets management, and defense-in-depth |
| 45 | [Search Systems](./45-search-systems/README.md) | Inverted indexes, Elasticsearch architecture, ranking signals, and scaling search to billions |
| 46 | [Data Pipelines & Streaming](./46-data-pipelines/README.md) | ETL vs ELT, batch vs streaming (Kafka/Flink/Spark), Lambda/Kappa architectures |

### Phase 4: HLD Case Studies (Ch 47-57)

| # | Chapter | One-Line Description |
|---|---------|---------------------|
| 47 | [Design URL Shortener](./47-url-shortener/README.md) | Classic starter problem — hash generation, 301 vs 302, analytics, and handling 100M URLs |
| 48 | [Design Twitter](./48-design-twitter/README.md) | Fan-out-on-write vs fan-out-on-read, timelines, celebrity problem, and tweet storage at scale |
| 49 | [Design Netflix](./49-design-netflix/README.md) | Video encoding pipeline, CDN strategy, adaptive bitrate streaming, and recommendation at scale |
| 50 | [Design Uber](./50-design-uber/README.md) | Geospatial indexing (S2/H3), real-time driver matching, surge pricing, and ride lifecycle |
| 51 | [Design WhatsApp](./51-design-whatsapp/README.md) | End-to-end encrypted messaging, online presence, message ordering, and group chat fanout |
| 52 | [Design Search Autocomplete](./52-design-search-autocomplete/README.md) | Trie vs inverted index, top-K suggestions, freshness vs relevance, and latency targets |
| 53 | [Design YouTube](./53-design-youtube/README.md) | Upload pipeline, transcoding at scale, view count accuracy, comments, and recommendation |
| 54 | [Design Dropbox](./54-design-dropbox/README.md) | File chunking, deduplication, delta sync, conflict resolution, and offline-first design |
| 55 | [Notification System](./55-notification-system/README.md) | Multi-channel delivery (push/email/SMS), priority queues, deduplication, and delivery guarantees |
| 56 | [Payment System](./56-payment-system/README.md) | Idempotent transactions, double-spend prevention, reconciliation, and payment gateway integration |
| 57 | [Job Scheduler](./57-job-scheduler/README.md) | Distributed cron, at-most-once vs at-least-once execution, task queues, and failure recovery |

### Phase 5: Low Level Design (Ch 58-69)

| # | Chapter | One-Line Description |
|---|---------|---------------------|
| 58 | [OOP Principles & SOLID](./58-oop-solid/README.md) | Encapsulation, inheritance, polymorphism, and the five SOLID principles with practical examples |
| 59 | [UML Diagrams](./59-uml-diagrams/README.md) | Class, sequence, activity, and state diagrams — the visual language of software design |
| 60 | [Creational Design Patterns](./60-creational-patterns/README.md) | Singleton, Factory, Abstract Factory, Builder, Prototype — how objects come to life |
| 61 | [Structural Design Patterns](./61-structural-patterns/README.md) | Adapter, Bridge, Composite, Decorator, Facade, Flyweight, Proxy — how objects fit together |
| 62 | [Behavioral Design Patterns](./62-behavioral-patterns/README.md) | Observer, Strategy, Command, Iterator, State, Chain of Responsibility — how objects communicate |
| 63 | [LRU Cache](./63-lru-cache/README.md) | HashMap + doubly linked list for O(1) get/put — the most common LLD interview problem |
| 64 | [Rate Limiter LLD](./64-rate-limiter-lld/README.md) | Class-level design of token bucket and sliding window rate limiters in code |
| 65 | [Vending Machine](./65-vending-machine/README.md) | State machine design with inventory management, payment processing, and change dispensing |
| 66 | [Parking Lot](./66-parking-lot/README.md) | Multi-floor parking with spot types, ticketing, pricing strategies, and entry/exit management |
| 67 | [Elevator System](./67-elevator-system/README.md) | Scheduling algorithms (SCAN/SSTF), multiple elevator coordination, and request queuing |
| 68 | [Chess Game](./68-chess-game/README.md) | Piece hierarchy with polymorphism, move validation, check detection, and game state management |
| 69 | [Movie Booking System](./69-movie-booking/README.md) | Seat locking, concurrent booking prevention, show management, and payment integration |

---

## Week-by-Week Study Plans

### 2-Week Intensive (Interview in 2 Weeks)

Focus: HLD process + core building blocks + case studies. Skip deep theory.

```
WEEK 1 — Core Concepts (Mon-Sun)
-------
Mon:  Ch 01 (Intro) + Ch 02 (Requirements) + Ch 03 (Capacity)     [3 chapters]
Tue:  Ch 04 (Networking) + Ch 06 (Client-Server) + Ch 07 (API)    [3 chapters]
Wed:  Ch 08 (CAP) + Ch 09 (Consistency) + Ch 10 (Scaling)         [3 chapters]
Thu:  Ch 11 (LB) + Ch 13 (Caching) + Ch 14 (CDN)                  [3 chapters]
Fri:  Ch 15 (Cons.Hashing) + Ch 16 (DBs) + Ch 17 (SQL/NoSQL)      [3 chapters]
Sat:  Ch 18 (Sharding) + Ch 19 (Replication) + Ch 27 (MQ)         [3 chapters]
Sun:  Ch 33 (Microservices) + Ch 34 (API GW) + Ch 42 (Monitoring) [3 chapters]

WEEK 2 — Case Studies + LLD (Mon-Sun)
-------
Mon:  Ch 47 (URL Shortener) + Ch 48 (Twitter)                     [2 case studies]
Tue:  Ch 49 (Netflix) + Ch 50 (Uber)                              [2 case studies]
Wed:  Ch 51 (WhatsApp) + Ch 52 (Autocomplete)                     [2 case studies]
Thu:  Ch 53 (YouTube) + Ch 55 (Notifications)                     [2 case studies]
Fri:  Ch 58 (SOLID) + Ch 63 (LRU Cache) + Ch 66 (Parking Lot)    [3 LLD problems]
Sat:  Ch 35 (Rate Limiting) + Ch 36 (Circuit Breaker) + Mock HLD  [review + practice]
Sun:  Full mock interview — 1 HLD + 1 LLD (timed, 45 min each)
```

**Chapters covered: ~28 of 69 (the highest-yield ones)**

---

### 1-Month Comfortable Pace (4 Weeks)

Focus: Complete mastery of all 69 chapters with time to internalize.

```
WEEK 1 — Foundations (Ch 01-20)
-------
Mon-Tue:  Ch 01-05  (Intro, Requirements, Capacity, Networking, DNS)
Wed-Thu:  Ch 06-10  (Client-Server, API, CAP, Consistency, Scaling)
Fri:      Ch 11-13  (Load Balancing, Reverse Proxy, Caching)
Sat:      Ch 14-17  (CDN, Consistent Hashing, Databases, SQL/NoSQL)
Sun:      Ch 18-20  (Sharding, Replication, Bloom Filters) + REVIEW

WEEK 2 — Infrastructure + Communication (Ch 21-36)
-------
Mon:      Ch 21-23  (Dist. Locks, Idempotency, Distributed Tracing)
Tue:      Ch 24-26  (Object Storage, Geo-Distributed, Consensus)
Wed:      Ch 27-29  (Message Queues, Event-Driven, WebSockets/SSE)
Thu:      Ch 30-32  (Webhooks, gRPC/REST/GraphQL, Real-Time)
Fri:      Ch 33-35  (Microservices, API Gateway, Rate Limiting)
Sat:      Ch 36-38  (Circuit Breaker, Service Discovery, Service Mesh)
Sun:      REVIEW Week 2 + draw 3 system diagrams from memory

WEEK 3 — Advanced Patterns + Case Studies Part 1 (Ch 39-55)
-------
Mon:      Ch 39-41  (CQRS, Event Sourcing, Saga Pattern)
Tue:      Ch 42-44  (Monitoring, Auth, Security)
Wed:      Ch 45-46  (Search Systems, Data Pipelines)
Thu:      Ch 47-48  (URL Shortener, Twitter) — full design walkthrough
Fri:      Ch 49-50  (Netflix, Uber) — full design walkthrough
Sat:      Ch 51-53  (WhatsApp, Autocomplete, YouTube)
Sun:      Ch 54-55  (Dropbox, Notifications) + REVIEW

WEEK 4 — Case Studies Part 2 + LLD (Ch 56-69)
-------
Mon:      Ch 56-57  (Payment System, Job Scheduler)
Tue:      Ch 58-59  (SOLID, UML Diagrams)
Wed:      Ch 60-62  (Creational, Structural, Behavioral Patterns)
Thu:      Ch 63-64  (LRU Cache, Rate Limiter LLD) — code it out
Fri:      Ch 65-66  (Vending Machine, Parking Lot) — class diagrams
Sat:      Ch 67-69  (Elevator, Chess, Movie Booking) — code it out
Sun:      Full mock: 1 HLD (45 min) + 1 LLD (45 min) + debrief
```

**Chapters covered: All 69**

---

## Skill Progression

### Beginner (Ch 01-11)
**You can:**
- Explain what system design is and why trade-offs exist
- Gather requirements before designing
- Estimate QPS, storage, and bandwidth for any system
- Describe TCP/UDP, HTTP, DNS at a high level
- Draw a basic client-server diagram
- Explain CAP theorem and pick CP vs AP for a use case
- Differentiate strong vs eventual consistency
- Know when to scale vertically vs horizontally
- Explain how a load balancer distributes traffic

**Prerequisites:** Basic programming knowledge, familiarity with HTTP.

---

### Intermediate (Ch 12-31)
**You can:**
- Design a multi-tier caching strategy with appropriate eviction policies
- Explain consistent hashing and why it minimizes data movement
- Choose between SQL and NoSQL with clear reasoning
- Design a sharding strategy and handle resharding
- Set up primary-replica replication with failover
- Use message queues to decouple services
- Choose WebSockets vs SSE vs polling for real-time requirements
- Compare gRPC, REST, and GraphQL and pick appropriately
- Explain Raft consensus at a conceptual level

**Prerequisites:** Phase 1 complete. Comfort with distributed systems vocabulary.

---

### Advanced (Ch 32-46)
**You can:**
- Design a complete microservices ecosystem with service discovery and a service mesh
- Implement rate limiting with sliding window at the distributed level
- Use circuit breakers to prevent cascading failures
- Apply CQRS + Event Sourcing to a domain problem
- Design saga-based distributed transactions
- Build an observability stack (metrics + logs + traces)
- Design OAuth 2.0 flows and secure API endpoints
- Build a full-text search system with Elasticsearch
- Architect a streaming data pipeline with Kafka + Flink

**Prerequisites:** Phases 1-2 complete. Some production engineering experience helps.

---

### Interview-Ready (Ch 47-69)
**You can:**
- Design any of the 11 HLD case study systems end-to-end in 45 minutes
- Produce class diagrams and code for 7+ LLD problems
- Apply design patterns (GoF) to real problems
- Identify the right pattern (CQRS, Saga, Event Sourcing) for a given problem
- Communicate trade-offs clearly: "I chose X over Y because of Z constraint"
- Handle follow-up drill-downs: "What if traffic 10x'd?" / "What fails first?"
- Recognize which chapter/concept applies to a novel problem you haven't seen

**Prerequisites:** Phases 1-3 complete. Practice timed mock interviews.

---

## Resource Recommendations

### Books (Essential)

| Book | Why Read It | Chapters It Supports |
|------|------------|---------------------|
| **Designing Data-Intensive Applications** (Kleppmann) | The single best book on distributed systems for engineers. Covers databases, replication, consistency, streaming. | Ch 08, 09, 16-19, 26, 27, 39-41, 46 |
| **System Design Interview Vol 1** (Alex Xu) | Exactly the format of an interview — estimation + design for 16 popular systems. | Ch 47-57 |
| **System Design Interview Vol 2** (Alex Xu) | Deeper case studies: Google Maps, Nearby Friends, distributed message queues. | Ch 47-57 |
| **Designing Distributed Systems** (Burns) | Patterns for distributed systems using containers — Sidecar, Ambassador, Adapter, Scatter/Gather. | Ch 33-41 |
| **Clean Architecture** (Martin) | The theory behind SOLID, component coupling, and architectural boundaries. | Ch 58-62 |
| **Head First Design Patterns** | The most approachable intro to GoF patterns with real diagrams. | Ch 60-62 |

### Papers (For Depth)

| Paper | Concept | Chapter |
|-------|---------|---------|
| Google Bigtable (2006) | Wide-column storage, compaction, LSM-trees | Ch 16, 17 |
| Amazon Dynamo (2007) | Consistent hashing, vector clocks, eventual consistency | Ch 09, 15 |
| Google MapReduce (2004) | Batch processing at scale | Ch 46 |
| Apache Kafka (LinkedIn, 2011) | Distributed commit log, consumer groups | Ch 27, 28 |
| Google Spanner (2012) | Globally consistent distributed SQL | Ch 25 |
| Raft Consensus (2014) | Understandable consensus algorithm | Ch 26 |
| Facebook Haystack (2010) | Photo storage at billions of images | Ch 24, 53 |

### Courses & Practice

- **Grokking the System Design Interview** (Educative) — structured walkthroughs, good for interview format
- **ByteByteGo newsletter/YouTube** (Alex Xu) — visual explanations that complement this repo
- **High Scalability blog** (highscalability.com) — real architectures from real companies
- **InfoQ talks** — conference talks from engineers who built the systems
- **LeetCode Design problems** — for LLD practice (Ch 63-69 topics)
- **Pramp / interviewing.io** — mock interviews with real engineers

---

## What Interviewers Actually Look For

### FAANG / Big Tech Interviewers Want

1. **Structured approach** — Requirements -> Estimation -> HLD -> Deep Dive -> Trade-offs. Do not jump to solutions.
2. **Trade-off articulation** — "I'm choosing eventual consistency here because the write load makes synchronous replication too expensive. We can tolerate a few seconds of staleness for read replicas." Interviewers grade your reasoning, not your answer.
3. **Proactive handling of scale** — They will ask "what happens at 10x traffic?" before you finish. Address scalability early.
4. **Knowing what you don't know** — "I'd want to benchmark this before choosing between X and Y" is better than confidently wrong.
5. **API and data model precision** — Define your APIs and schemas early. Vague boxes on a whiteboard are not enough.
6. **Depth when drilled** — Be able to go from "consistent hashing" on a diagram to explaining virtual nodes and rebalancing when asked.
7. **Operational thinking** — How do you monitor this? How do you deploy it safely? What's your runbook for an outage?

**FAANG rubric typically grades:**
- Problem exploration (15%)
- High-level design (25%)
- Deep dives (40%)
- Wrap-up and trade-offs (20%)

### Startup Interviewers Want

1. **Pragmatism** — "We'd start with a monolith and extract services when the seams become painful" impresses a startup more than a 12-microservice diagram.
2. **Cost awareness** — "Using S3 for this costs ~$23/TB/month vs running our own object store which requires a dedicated team" — show you think about money.
3. **Speed to production** — Can you ship something working in a week? What would a v1 look like?
4. **Familiarity with managed services** — Startups use RDS, ElastiCache, SQS rather than building from scratch. Know the cloud primitives.
5. **Full-stack ownership** — Security, monitoring, deployment — you own all of it.

---

## Red Flags in System Design Interviews

### Process Red Flags

- **Jumping straight to the solution** without clarifying requirements — "I'll design Twitter like this..." before asking any questions
- **Never estimating** — Skipping capacity math means your design has no scale anchor
- **Drawing boxes without explaining** — Putting "Kafka" in a diagram without explaining why Kafka vs RabbitMQ vs SQS
- **Designing in silence** — Interviewers want to hear your thinking. Silent drawing is a failure signal.
- **Ignoring the interviewer's hints** — If they say "interesting, what happens if a node fails?" you must address it
- **Not driving the conversation** — Waiting for the interviewer to tell you what to design next

### Design Red Flags

- **Over-engineering from minute one** — Proposing a 15-microservice architecture for a URL shortener is a red flag
- **Single points of failure everywhere** — One database, no replication, no failover
- **No caching anywhere** — Every read goes to the database, even for static data
- **Ignoring CAP trade-offs** — Designing a system that somehow needs "both consistency and availability" with no nuance
- **Misusing Kafka** — Treating it as a job queue rather than a commit log, or using it for 10 events/day
- **Schema-less thinking** — Never defining your data model, just saying "store it in a database"
- **Security as an afterthought** — "We'll add auth later" is a red flag
- **No monitoring or observability** — No mention of how you'd know something broke
- **Infinite horizontal scaling** — "Just add more servers" without addressing database bottlenecks, consistency, or coordination overhead

### LLD-Specific Red Flags

- **Anemic domain model** — Classes with only getters/setters and no behaviour
- **God class** — One class doing everything (BookingManager with 50 methods)
- **Violating Single Responsibility** — A `User` class that also sends emails and processes payments
- **Ignoring concurrency** — Designing a parking lot system with no thread safety
- **No interface/abstraction** — Hardcoding concrete types everywhere, impossible to extend
- **Missing edge cases** — Not handling "what if the payment fails after a seat is reserved?"

---

## Quick Reference: Chapter by Concept

```
Trade-off thinking:      Ch 01, 08, 09, 17
Estimation:              Ch 03
Databases:               Ch 16, 17, 18, 19
Caching:                 Ch 13, 14, 15
Messaging:               Ch 27, 28, 29, 30, 31
Microservices:           Ch 33, 34, 37, 38
Resilience patterns:     Ch 35, 36, 41
Event patterns:          Ch 28, 39, 40, 41
Security/Auth:           Ch 43, 44
Observability:           Ch 23, 42
Search/Analytics:        Ch 45, 46
HLD Practice:            Ch 47-57
LLD Foundations:         Ch 58-62
LLD Practice:            Ch 63-69
```

---

## Progress Tracker

```
Phase 1 - Foundations      (Ch 01-11):  ░░░░░░░░░░░░░░░░░░░  0 / 11
Phase 2 - Infrastructure   (Ch 12-26):  ░░░░░░░░░░░░░░░░░░░  0 / 15
Phase 3 - Architecture     (Ch 27-46):  ░░░░░░░░░░░░░░░░░░░  0 / 20
Phase 4 - HLD Case Studies (Ch 47-57):  ░░░░░░░░░░░░░░░░░░░  0 / 11
Phase 5 - LLD              (Ch 58-69):  ░░░░░░░░░░░░░░░░░░░  0 / 12

Overall:                                ░░░░░░░░░░░░░░░░░░░  0 / 69
```

Update as you complete each chapter.

---

## Navigation

- [README.md](./README.md) — Repository index
- [READING-SEQUENCE.md](./READING-SEQUENCE.md) — Alternate reading orders
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) — Key numbers and formulas
- [INTERVIEW_GUIDE.md](./INTERVIEW_GUIDE.md) — Interview-day checklist

---

> Start with [Chapter 01 — Introduction to System Design](./01-introduction/README.md).
> The single most important thing is to actually read and practice, not just plan to.
