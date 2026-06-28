# System Design Quick Reference — Interview Cheat Sheet

> One page. Read it the night before. Know it cold.

---

## 1. HLD Interview Framework (6 Steps, ~45 min)

```
STEP 1 — CLARIFY REQUIREMENTS (5 min)
──────────────────────────────────────
What to SAY:
  "Before I start designing, let me clarify a few things."
  - Functional: "What are the core features? What is out of scope?"
  - Scale:      "How many daily active users? Reads vs writes ratio?"
  - Consistency:"Do we need strong consistency, or is eventual OK?"
  - Latency:    "What's the acceptable p99 latency for core flows?"
  - Availability:"What SLA are we targeting? 99.9%? 99.99%?"
  - Geography:  "Are users global or in one region?"
  - Budget:     "Any infrastructure cost constraints?"

  Write the answers on the board. Keep them visible.

STEP 2 — BACK-OF-ENVELOPE ESTIMATION (5 min)
──────────────────────────────────────────────
What to SAY:
  "Let me estimate scale to drive the design decisions."
  - DAU → peak QPS: DAU × avg_requests / 86,400 × peak_factor(2-3)
  - Storage:        writes/day × avg_payload × retention_days
  - Bandwidth:      QPS × avg_response_size
  - Cache size:     20% of daily active data (Pareto rule)

  Say: "With ~X writes/sec and Y reads/sec, we need a design
        that can handle these orders of magnitude."

STEP 3 — HIGH-LEVEL DESIGN SKETCH (10 min)
────────────────────────────────────────────
What to SAY:
  "Let me draw the happy path first, then we can stress it."
  - Draw: Client → API Gateway → Services → Databases
  - Show data flow for the most important feature
  - Identify: where does data get written? where is it read?
  - Choose preliminary DB type and justify it
  - Add load balancer, CDN if obvious

  Say: "I'm starting simple — we can always add complexity."

STEP 4 — DATABASE & DATA MODEL DEEP DIVE (10 min)
────────────────────────────────────────────────────
What to SAY:
  "Let me design the data model and justify my DB choice."
  - Draw entity-relationship or document schema
  - Show primary keys, foreign keys, indexes
  - Identify: hot partitions? read-heavy tables? write-heavy?
  - Discuss: replication strategy, sharding key if needed

  Say: "I'm indexing on X because that's the primary query pattern."
       "I'm choosing Cassandra here because writes are high and
        we need horizontal scalability without joins."

STEP 5 — SCALE & HANDLE BOTTLENECKS (10 min)
──────────────────────────────────────────────
What to SAY:
  "Let me identify where this design breaks and fix it."
  - Where is the single point of failure?
  - What hits first: DB, network, cache, app server?
  - Add: caching layer, message queues, read replicas, sharding
  - Discuss: rate limiting, circuit breakers, retries

  Say: "At this scale the database becomes the bottleneck.
        I'd add a read replica and a Redis cache with write-through."

STEP 6 — OPERATIONAL CONCERNS (5 min)
───────────────────────────────────────
What to SAY:
  "Let me talk about how we'd run this in production."
  - Monitoring: metrics (QPS, latency, error rate), logs, traces
  - Alerting:   p99 latency spike, error rate > X%, queue depth
  - Deployment: blue-green, canary releases
  - Security:   auth (JWT/OAuth), encryption in transit and at rest
  - DR:         RPO and RTO targets, multi-region failover

  Say: "We'd measure success by tracking X metric in Datadog/Prometheus."
```

---

## 2. LLD Interview Framework (5 Steps, ~45 min)

```
STEP 1 — CLARIFY SCOPE (5 min)
────────────────────────────────
  - What behaviors/features to implement?
  - What's explicitly out of scope?
  - Any performance constraints? Thread safety?
  - Language preference?

STEP 2 — IDENTIFY ENTITIES & RELATIONSHIPS (5 min)
────────────────────────────────────────────────────
  - List nouns → candidate classes
  - List verbs → candidate methods
  - Draw class diagram (has-a, is-a relationships)
  - Decide: interface vs abstract class vs concrete class

STEP 3 — DEFINE INTERFACES & APIs (10 min)
────────────────────────────────────────────
  - Write method signatures first
  - Define contracts (input, output, exceptions)
  - Apply SOLID principles:
      S — Single responsibility per class
      O — Open for extension, closed for modification
      L — Subclasses substitutable for parent
      I — Small, focused interfaces
      D — Depend on abstractions, not concretions

STEP 4 — IMPLEMENT CORE LOGIC (20 min)
────────────────────────────────────────
  - Implement the hardest/most interesting method first
  - Discuss design patterns as you use them:
      Factory, Singleton, Observer, Strategy, Decorator, Iterator
  - Handle edge cases out loud (null, empty, concurrent access)
  - Think about thread safety if relevant

STEP 5 — EXTEND & DISCUSS TRADE-OFFS (5 min)
──────────────────────────────────────────────
  - "How would you add feature X?" — show extensibility
  - Discuss what you'd test (unit tests, mock boundaries)
  - Discuss performance characteristics of your solution
  - Mention what you'd refactor with more time
```

---

## 3. Capacity Estimation Cheat Sheet

### Powers of 2

```
Power  | Approx    | Name
──────────────────────────────
2^10   = 1,024     ≈ 1 Thousand   (KB)
2^20   = 1,048,576 ≈ 1 Million    (MB)
2^30   ≈ 1 Billion                (GB)
2^40   ≈ 1 Trillion               (TB)
2^50   ≈ 1 Quadrillion            (PB)
```

### Time Units

```
60 sec  = 1 min
3,600 sec = 1 hour
86,400 sec ≈ 100,000 sec = 1 day   ← memorize this!
2,592,000 sec ≈ 2.6M sec = 1 month
31,536,000 sec ≈ 31.5M sec = 1 year
```

### Storage Units

```
1 char (ASCII)  = 1 byte
1 UUID          = 36 bytes (or 16 bytes binary)
1 int           = 4 bytes
1 long          = 8 bytes
1 timestamp     = 8 bytes
1 small image   = 200 KB
1 HD photo      = 2-5 MB
1 minute video (720p) = 50 MB
1 minute video (1080p) = 150 MB
```

### QPS Formula

```
QPS  = (DAU × avg_actions_per_day) / 86,400
Peak = QPS × 2 to 3 (safety factor)

Example: Twitter
  300M DAU, 2 reads/write, 10 actions/day
  Write QPS = 300M × 10 / 86,400 ≈ 35,000 writes/sec
  Read QPS  = 35,000 × 2 = 70,000 reads/sec
```

### Storage Formula

```
Storage/day = writes_per_day × avg_object_size
Total       = Storage/day × retention_days

Example: WhatsApp messages
  65B messages/day × 100 bytes = 6.5 TB/day
  5 year retention = 6.5 TB × 365 × 5 ≈ 12 PB
```

### Bandwidth Formula

```
Bandwidth = peak_QPS × avg_response_size

Example: YouTube
  5M concurrent viewers × 5 Mbps/stream = 25 Tbps egress
```

---

## 4. Latency Numbers (2025)

```
Operation                     | Latency      | Notes
────────────────────────────────────────────────────────────────
L1 cache reference            |       0.5 ns |
Branch misprediction penalty  |         5 ns |
L2 cache reference            |         7 ns | 14× L1
Mutex lock/unlock             |        25 ns |
Main memory (RAM) reference   |       100 ns | 20× L2
Compress 1KB with Snappy      |     3,000 ns | 3 μs
Send 1 KB over 1 Gbps network |    10,000 ns | 10 μs
Read 4 KB randomly from SSD   |   150,000 ns | 150 μs
Read 1 MB sequentially (mem)  |   250,000 ns | 250 μs
Round trip within same DC     |   500,000 ns | 0.5 ms
Read 1 MB sequentially (SSD)  | 1,000,000 ns | 1 ms
HDD seek                      | 10,000,000 ns| 10 ms
Read 1 MB sequentially (HDD)  | 20,000,000 ns| 20 ms
Send packet CA → Netherlands  |150,000,000 ns| 150 ms

KEY RULES OF THUMB:
  Memory    is 10,000× faster than HDD
  SSD       is 100× faster than HDD
  Network   within DC ≈ 0.5 ms
  Network   cross-continental ≈ 100-150 ms
  DB query  best case ≈ 1 ms (with index, warm cache)
  DB query  cold, complex join ≈ 50-200 ms
```

---

## 5. Availability Nines Table

```
Availability | Downtime/Year  | Downtime/Month | Downtime/Day
───────────────────────────────────────────────────────────────
90%          | 36.5 days      | 73 hours       | 2.4 hours
99%          | 3.65 days      | 7.3 hours      | 14.4 minutes
99.5%        | 1.83 days      | 3.65 hours     | 7.2 minutes
99.9%        | 8.76 hours     | 43.8 minutes   | 1.44 minutes
99.95%       | 4.38 hours     | 21.9 minutes   | 43.2 seconds
99.99%       | 52.6 minutes   | 4.38 minutes   | 8.64 seconds
99.999%      | 5.26 minutes   | 26.3 seconds   | 0.86 seconds
99.9999%     | 31.5 seconds   | 2.63 seconds   | 86 ms

INTERVIEW TARGETS:
  Consumer app    → 99.9%   (< 9 hours/year down)
  Business SaaS   → 99.99%  (< 1 hour/year down)
  Financial/core  → 99.999% (< 6 min/year down)
```

---

## 6. Technology Choices Quick Reference

### When to Use Each Database / Store

```
REDIS (in-memory key-value store)
  USE WHEN:
    - Session management, auth tokens
    - Leaderboards / sorted sets (ZSET)
    - Rate limiting counters
    - Pub/sub messaging (lightweight)
    - Distributed locking (Redlock)
    - Cache with TTL
  DO NOT USE FOR: durable primary data store (no persistence guarantee by default)

KAFKA (distributed event streaming)
  USE WHEN:
    - High-throughput event ingestion (logs, metrics, clickstreams)
    - Event sourcing and audit trails
    - Decoupling microservices with async
    - Fan-out (one producer → many consumers)
    - Replay messages (consumers can rewind)
    - Stream processing (with Kafka Streams / Flink)
  DO NOT USE FOR: task queues needing per-message ACK, simple job queues

CASSANDRA (wide-column, AP)
  USE WHEN:
    - Write-heavy workloads at massive scale
    - Time-series data (IoT, metrics, logs)
    - No complex joins needed
    - Global distribution, multi-region writes
    - High availability over consistency
  DO NOT USE FOR: ACID transactions, complex queries, small datasets

ELASTICSEARCH (inverted index search engine)
  USE WHEN:
    - Full-text search
    - Log analysis (ELK stack)
    - Faceted search / aggregations
    - Fuzzy matching, autocomplete
  DO NOT USE FOR: primary data store (secondary index on top of DB)

POSTGRESQL (relational, ACID, CP)
  USE WHEN:
    - Complex queries with joins
    - ACID transactions (payments, bookings)
    - Strong schema, data integrity
    - Reporting / analytics on structured data
    - JSONB for semi-structured data alongside relational
  DO NOT USE FOR: massive write throughput without sharding, flexible schema needs

MONGODB (document store)
  USE WHEN:
    - Rapidly evolving schema
    - Hierarchical / nested data
    - Content management, catalogs
    - Moderate write scale with horizontal sharding
  DO NOT USE FOR: multi-document ACID transactions (use PostgreSQL), heavy joins

S3 / OBJECT STORAGE
  USE WHEN:
    - Storing blobs (images, videos, backups, logs)
    - Static website hosting
    - Data lake (cheap, durable, scalable)
    - Write-once, read-many patterns
  DO NOT USE FOR: structured queries, low-latency random reads

CDN (Content Delivery Network)
  USE WHEN:
    - Serving static assets (JS, CSS, images, fonts)
    - Video streaming (segment-level caching)
    - Reducing origin load and latency globally
    - DDoS mitigation at the edge
  DO NOT USE FOR: dynamic, personalized, real-time content
```

### WebSockets vs SSE vs Polling

```
                  WebSocket      SSE              Long Polling
─────────────────────────────────────────────────────────────────
Direction         Bidirectional  Server→Client    Server→Client
Protocol          WS (TCP)       HTTP             HTTP
Browser support   Excellent      Good (no IE)     Universal
Reconnect         Manual         Automatic        Manual
Multiplexing      Yes (single)   One stream       One per request
USE FOR           Chat, gaming,  Live scores,     Simple updates,
                  collaborative  news feeds,      legacy compat
                  editing        notifications
NOT IDEAL FOR     Fire-and-forget bidirectional   High frequency
```

### SQL vs NoSQL

```
USE SQL WHEN:                      USE NoSQL WHEN:
──────────────────────────────     ───────────────────────────────
ACID transactions required         Horizontal scale is priority
Complex queries with joins         Schema changes frequently
Strong consistency needed          Write throughput > 10K/sec
Structured, predictable schema     Hierarchical or graph data
Reporting / aggregations           Eventual consistency acceptable
Team knows SQL well                Specific access patterns known
```

### Microservices vs Monolith

```
USE MONOLITH WHEN:                 USE MICROSERVICES WHEN:
────────────────────────────────   ────────────────────────────────
Early-stage / MVP                  Different services scale differently
Small team (< 5 engineers)         Teams are large and independent
Domain not yet well understood     Clear service boundaries exist
Simple deployment needed           Technology diversity needed
Rapid iteration required           Independent deployment required
                                   Fault isolation is critical

RULE: Start monolith. Extract services when you feel the pain.
```

---

## 7. Common System Design Components

```
COMPONENT            USE WHEN                              Avoid When
────────────────────────────────────────────────────────────────────────
API Gateway          Auth, rate-limit, routing            Adds latency for internal
Load Balancer        Distribute traffic, HA               Single server is sufficient
CDN                  Static content, global latency       Fully dynamic content
Redis Cache          Hot data, session, leaderboards      Data must be always fresh
Message Queue        Async, decouple, retry, fan-out      Need synchronous response
Read Replica         Read-heavy workload, HA              Write-heavy (replicas lag)
Database Sharding    Write scale beyond single node       Simple queries OK on one DB
Elasticsearch        Full-text search, log analytics      Not the source of truth
Blob/Object Store    Files, images, video, backups        Structured queryable data
Rate Limiter         Protect APIs from abuse              Internal services only
Circuit Breaker      Prevent cascade failures             One-service architectures
Service Mesh         Observability, mutual TLS, retry     Small # of services
```

---

## 8. Most-Asked System Design Questions by Company

```
FAANG / Big Tech:
  - Design Twitter / X Feed
  - Design YouTube / Netflix
  - Design Uber / Lyft
  - Design WhatsApp / Messenger
  - Design Google Search
  - Design Facebook News Feed
  - Design Instagram
  - Design URL Shortener (bit.ly)
  - Design Google Drive / Dropbox
  - Design a Rate Limiter
  - Design a Distributed Cache
  - Design a Notification System
  - Design a Payment System
  - Design a Distributed Job Scheduler
  - Design Airbnb / Hotel Booking
  - Design Amazon / E-commerce

LLD Favorites:
  - Design a Parking Lot
  - Design a Snake and Ladder Game
  - Design an ATM
  - Design a Library Management System
  - Design an Elevator System
  - Design a Chess Game
  - Design a Ride-Share (OOP focus)
  - Design an LRU Cache
  - Design a Rate Limiter (implementation)

KEY FOR EACH: know the top 3 design challenges and your solution.
```

---

## 9. Keywords That Show System Design Maturity

### Say THIS (shows maturity)

```
INSTEAD OF...              SAY THIS...
──────────────────────────────────────────────────────────────────
"Use a database"           "I'd use PostgreSQL here because we need
                            ACID transactions for payment data"

"Use a cache"              "I'd add a Redis cache with write-through
                            and a 1-hour TTL on user profile data,
                            since read:write is 100:1"

"Scale horizontally"       "I'd shard by user_id using consistent
                            hashing to avoid hot spots"

"It's fast"                "The p99 latency should be < 50ms because
                            the data fits in Redis memory"

"Handle failures"          "We'd use a circuit breaker pattern with
                            exponential backoff to prevent cascade"

"Use microservices"        "I'd extract the notification service as a
                            separate microservice only because it has
                            different scaling needs from core writes"

"Monitor it"               "We'd track QPS, p50/p99 latency, error
                            rate, and queue depth in Prometheus"

"Store in NoSQL"           "Cassandra fits here because we have 50K
                            writes/sec and the query pattern is
                            always by user_id + timestamp"
```

### Do NOT Say

```
❌ "Just use Kafka for everything"
❌ "We'll shard later when we need to"
❌ "Use microservices from day one"
❌ "The database will handle it"
❌ "We'll add caching if it's slow"
❌ "It's simple, it'll scale"
❌ "Use the cloud" (too vague)
❌ "Add more servers" (without explaining how)
❌ "We'll use AI/ML to fix X" (unless you mean it)
```

### Power Phrases

```
"Let me make an assumption here and we can revisit..."
"The trade-off between X and Y here is..."
"This becomes a bottleneck at ~X QPS because..."
"I'd use an eventual consistency model here because..."
"The SLA drives this choice — at 99.99% we need..."
"If we hit this limit, the next step would be..."
"We'd measure this with [specific metric]..."
"I'm choosing X over Y because of our write:read ratio..."
```

---

## 10. Rate Limiting Algorithms

```
Algorithm          How It Works                   Pros              Cons
──────────────────────────────────────────────────────────────────────────────
Token Bucket       Tokens added at fixed rate.    Allows bursts.    Complex to
                   Request consumes a token.      Smooth avg rate.  implement dist.
                   If no token → reject.

Leaky Bucket       Requests queue at fixed rate.  Very smooth       No bursts.
                   Excess requests overflow.      output rate.      Queue = memory.

Fixed Window       Count requests in current      Simple.           Edge burst:
Counter            time window (e.g., 1 min).    Easy with Redis.  2× rate at
                   Reset counter at boundary.                       window edge.

Sliding Window     Track timestamp of each        No edge burst.    Memory per user
Log                request. Count in last T sec.  Accurate.         (store N timestamps).

Sliding Window     Hybrid: current window count   Accurate enough.  Approximation
Counter            + (prev_window × overlap %).   Low memory.       (not exact).

WHERE TO IMPLEMENT:
  - Client-side:  Protect your own egress (SDK throttling)
  - API Gateway:  Global rate limit per API key
  - Service:      Business-logic rate limit (per user action)
  - Database:     Connection pool limits

STORAGE: Use Redis with atomic INCR + EXPIRE for distributed rate limiting.
```

---

## 11. CAP Theorem Quick Reference

```
CAP = Consistency + Availability + Partition Tolerance

You CAN'T have all three. In practice, partitions happen.
So the real choice is: CP or AP?

         C (Consistency)
              /\
             /  \
            /    \
           / PICK \
          /  TWO   \
         /──────────\
        P (Partition) ─── A (Availability)
        Tolerance

CP — Consistent + Partition Tolerant (sacrifice Availability)
  - System returns error if it can't guarantee fresh data
  - USE FOR: Banking, inventory, leader election
  - EXAMPLES: ZooKeeper, HBase, MongoDB (strong), Etcd

AP — Available + Partition Tolerant (sacrifice Consistency)
  - System returns data that might be stale
  - USE FOR: Social feeds, DNS, shopping carts, metrics
  - EXAMPLES: Cassandra, CouchDB, DynamoDB, Riak

CA — Consistent + Available (not partition tolerant)
  - Only possible on single node (partitions always possible in dist. systems)
  - Not realistic for distributed systems

PACELC Extension (more nuanced):
  If Partition → AP or CP trade-off
  Else (no partition) → Latency or Consistency trade-off

  Low latency AND eventual consistency: Cassandra, DynamoDB
  Higher latency AND strong consistency: PostgreSQL, MySQL
```

---

## 12. Database Sharding Strategy Comparison

```
Strategy          How It Works              Pros                  Cons
──────────────────────────────────────────────────────────────────────────────────
Range-based       Shard by value range      Simple queries on      Hot spots (new
                  (e.g., user_id 0-1M       range.                 data → last shard).
                  → shard 1)                Easy to add shards.    Uneven distribution.

Hash-based        shard = hash(key) % N     Even distribution.     Range queries hit
                                            No hot spots.          all shards. Hard to
                                                                   rebalance (% N changes).

Consistent        Hash ring. Shard by       Easy rebalancing.      More complex.
Hashing           closest node on ring.     Minimize data moved    Vnodes needed for
                                            when adding nodes.     uniform distribution.

Directory-based   Lookup table maps key     Flexible, any algo.   Lookup table is
                  → shard.                  Easy to change.        bottleneck/SPOF.

Geo-based         Shard by geography        Latency (data near     Cross-region joins
                  (US-East, EU-West, etc.)  users).               expensive.

CHOOSING A SHARD KEY — avoid:
  - Keys with low cardinality (gender, country → hot spots)
  - Auto-increment IDs (all writes go to last shard)
  - Timestamps alone (all writes hit "now" shard)

PREFER:
  - High cardinality: user_id, UUID, tenant_id
  - Evenly distributed access patterns
  - Aligns with most common query (so queries don't cross shards)
```

---

## 13. Load Balancing Algorithms

```
Algorithm             How It Works                   Best For
────────────────────────────────────────────────────────────────────────
Round Robin           Requests go to servers in       Stateless services,
                      a circular sequence.            homogeneous servers.

Weighted Round Robin  Same as RR but servers with     Different server capacities
                      higher weight get more reqs.    (e.g., 2× RAM → 2× weight).

Least Connections     Route to server with fewest     Long-lived connections
                      active connections.             (WebSockets, video streams).

Least Response Time   Route to server with lowest     Latency-sensitive APIs.
                      current response time.

IP Hash               Hash client IP → same server.   Session affinity (sticky
                                                      sessions without cookies).

Random                Pick server randomly.           Simple, stateless, works
                                                      well with many servers.

Resource-Based        Route based on CPU/mem          Heterogeneous workloads,
(Adaptive)            utilization reported by agent.  resource-intensive tasks.

Consistent Hashing    Hash request key → server       Caches and databases where
                      on ring. Minimize remapping     same key → same node is
                      when servers added/removed.     important (cache locality).

LAYER 4 vs LAYER 7:
  L4 LB: Routes based on IP/TCP — fast, no content inspection
           (AWS NLB, HAProxy TCP mode)
  L7 LB: Routes based on HTTP headers, URL, cookies — flexible
           (NGINX, AWS ALB, Envoy)

  USE L4 when: raw throughput matters, non-HTTP traffic
  USE L7 when: routing by path, host, A/B testing, auth
```

---

## 14. Core Principles (Decision Checklist)

```
REQUIREMENTS (5 min)
 [ ] Functional requirements defined (write them down)
 [ ] Non-functional: latency, availability, consistency, scale
 [ ] Scale: DAU, peak QPS, storage, bandwidth estimated
 [ ] Clarified: read-heavy or write-heavy?

HIGH-LEVEL DESIGN (10 min)
 [ ] Drew the happy path end-to-end
 [ ] Identified DB type and justified choice
 [ ] Added load balancer, CDN where obvious
 [ ] Showed data flow (where does data go in and out?)

DEEP DIVE (15 min)
 [ ] Data model / schema drawn
 [ ] API endpoints defined
 [ ] Scaling strategy for the bottleneck
 [ ] Caching strategy (what, where, TTL, invalidation)
 [ ] Async where latency spikes exist

BOTTLENECKS & OPS (5 min)
 [ ] Single points of failure identified and eliminated
 [ ] Monitoring / alerting discussed
 [ ] Security basics (auth, encryption)
 [ ] Failure handling (retry, circuit breaker, fallback)
```

---

## 15. Architecture Decision Tree

```
Real-time updates needed?
├─ YES, bidirectional (chat, gaming) → WebSockets
├─ YES, server-push only (notifications, feeds) → SSE
└─ NO, periodic updates OK → Polling (or long-polling)

Data characteristics?
├─ ACID transactions needed → PostgreSQL / MySQL
├─ Write-heavy, horizontal → Cassandra / DynamoDB
├─ Full-text search → Elasticsearch (secondary)
├─ Hierarchical / document → MongoDB
├─ Key-value, cache → Redis
└─ Files / blobs → S3 / Object Storage

Scale?
├─ < 100K users   → Monolith + single DB + cache
├─ 100K–1M users  → Horizontal app servers + read replicas + Redis
├─ 1M–10M users   → Sharding + CDN + message queues
└─ > 10M users    → Microservices + multi-region + polyglot persistence

Consistency vs Availability?
├─ Payments, inventory, booking → CP (PostgreSQL, strong consistency)
└─ Social feeds, analytics, DNS → AP (Cassandra, DynamoDB)
```

---

## 16. Common System Design Scenarios (Cheat Notes)

```
URL SHORTENER (bit.ly)
  Scale: 100M URLs/month, 100:1 read:write
  Key: Base62 hash (6 chars = 56B combos), Cache redirects in Redis
  DB: PostgreSQL (short → long) + Redis for hot URLs
  Challenge: Collision avoidance, custom slugs

TWITTER FEED
  Scale: 300M DAU, 6K writes/sec, 600K reads/sec
  Key: Fan-out on write (precompute feeds) vs fan-out on read (famous users)
  DB: Cassandra for tweets, Redis for feed cache, Elasticsearch for search
  Challenge: Celebrity problem (fan-out to 100M followers is slow)

UBER (Ride Matching)
  Scale: millions of rides/day, sub-second matching
  Key: Geospatial index (S2/QuadTree), WebSockets for driver location
  DB: PostgreSQL for trips, Redis for driver locations (TTL 30s)
  Challenge: Real-time geospatial queries at scale

NETFLIX / YOUTUBE
  Scale: petabytes of video, 1B+ streaming hours/day
  Key: CDN (cache video segments at edge), adaptive bitrate streaming
  DB: Cassandra for metadata, S3 for video, Elasticsearch for search
  Challenge: 95% of traffic from CDN cache; encoding pipeline

WHATSAPP / CHAT
  Scale: 65B messages/day, end-to-end encryption
  Key: WebSockets for connections, message queue for delivery
  DB: Cassandra (messages by conversation + time), Redis for presence
  Challenge: Message ordering, offline delivery, group chats

GOOGLE DRIVE / DROPBOX
  Scale: billions of files, versioning
  Key: Block-level dedup, delta sync, blob storage (S3)
  DB: PostgreSQL (metadata), S3 (files), Kafka (sync events)
  Challenge: Conflict resolution, efficient sync (delta only)

RATE LIMITER
  Algorithm: Token Bucket or Sliding Window Counter
  Storage: Redis with INCR + EXPIRE (atomic)
  Key format: rate_limit:{user_id}:{window}
  Challenge: Distributed rate limiting across multiple API servers

NOTIFICATION SYSTEM
  Key: Push (FCM/APNs), Email (SES), SMS (Twilio)
  Use Kafka for fan-out, separate workers per channel
  Challenge: Reliability (retry), dedup, user preferences
```

---

## 17. Quick Links

- [Introduction](./01-introduction/README.md)
- [Requirements Gathering](./02-requirements/README.md)
- [Capacity Estimation](./03-capacity-estimation/README.md)
- [API Design](./04-api-design/README.md)
- [Networking Basics](./05-networking/README.md)
- [Client-Server Architecture](./06-client-server/README.md)
- [CAP Theorem](./07-cap-theorem/README.md)
- [Horizontal vs Vertical Scaling](./09-scaling/README.md)
- [Load Balancing](./10-load-balancing/README.md)
- [Caching Strategies](./11-caching/README.md)

---

> There are no perfect solutions — only informed trade-offs. State your assumptions, justify your choices, and always ask "what breaks first?"
