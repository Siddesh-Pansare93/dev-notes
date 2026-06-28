# System Design Reading Sequence — Complete Roadmap

> Follow this order. Each phase builds on the previous one. Don't skip phases — system design is a pyramid.

---

## Time Estimate

| Phase | Chapters | Approx Time |
|---|---|---|
| Phase 1 — DB Prerequisites | 5 | 2–3 hrs |
| Phase 2 — Core Foundations | 9 | 4–5 hrs |
| Phase 3 — Scalability Building Blocks | 11 | 5–6 hrs |
| Phase 4 — Distributed Systems Patterns | 6 | 3–4 hrs |
| Phase 5 — Communication Patterns | 6 | 3–4 hrs |
| Phase 6 — Microservices Architecture | 9 | 4–5 hrs |
| Phase 7 — Observability & Security | 3 | 1–2 hrs |
| Phase 8 — Data at Scale | 5 | 2–3 hrs |
| Phase 9 — HLD Case Studies | 11 | 8–12 hrs |
| Phase 10 — LLD Foundations | 5 | 4–5 hrs |
| Phase 11 — LLD Case Studies | 7 | 6–8 hrs |
| **Total** | **77** | **~47–57 hrs** |

---

## PHASE 1 — DB Prerequisites (Read these FIRST)

> You need to understand databases before understanding how to design systems that use them.
> These files live in `database-notes/`, a separate folder from the system-design chapters.

| # | Topic | File Path | Why Now |
|---|---|---|---|
| P1 | ACID Properties | `database-notes/db-fundamentals/05-acid-properties.md` | Every system design uses transactions |
| P2 | Indexes Deep Dive | `database-notes/db-fundamentals/06-indexes.md` | You'll need this for every DB discussion |
| P3 | SQL vs NoSQL | `database-notes/db-fundamentals/10-sql-vs-nosql.md` | First decision in every system design |
| P4 | Sharding | `database-notes/advanced-dbms/01-sharding.md` | Core scaling concept |
| P5 | Replication | `database-notes/advanced-dbms/02-replication.md` | Core availability concept |

### Key Concepts to Master
- ACID guarantees and when they break down in distributed systems
- B-Tree vs hash index trade-offs
- Horizontal vs vertical partitioning
- Read replicas vs synchronous replication
- CAP implications of sharding strategies

---

## PHASE 2 — Core Foundations (Chapters 01–09)

> The vocabulary of system design. Learn these and you can discuss any system.

| # | Topic | File Path | Key Concept |
|---|---|---|---|
| 01 | Introduction to System Design | `system-design-notes/01-introduction/README.md` | What is HLD, trade-offs mindset |
| 02 | Requirements Gathering | `system-design-notes/02-requirements/README.md` | Functional vs non-functional requirements |
| 03 | Capacity Estimation | `system-design-notes/03-capacity-estimation/README.md` | Back-of-envelope math |
| 04 | Networking Basics | `system-design-notes/04-networking/README.md` | TCP, UDP, HTTP/1/2/3 |
| 05 | DNS Deep Dive | `system-design-notes/05-dns-deep-dive/README.md` | How traffic reaches servers |
| 06 | Client-Server Model | `system-design-notes/06-client-server/README.md` | Foundation of everything |
| 07 | API Design | `system-design-notes/07-api-design/README.md` | REST principles, versioning |
| 08 | CAP Theorem | `system-design-notes/08-cap-theorem/README.md` | The fundamental distributed systems trade-off |
| 09 | Consistency Models | `system-design-notes/09-consistency/README.md` | Strong vs eventual consistency |

### Key Concepts to Master
- Estimating QPS, storage, and bandwidth from first principles (powers of 2, common latency numbers)
- HTTP/1.1 vs HTTP/2 multiplexing vs HTTP/3 QUIC
- DNS resolution chain: recursive resolver, TLD, authoritative server
- REST constraints: statelessness, uniform interface, resource-based URLs
- CAP — you can only pick 2; CP vs AP trade-off examples
- Strong, sequential, causal, and eventual consistency — when each is acceptable

---

## PHASE 3 — Scalability Building Blocks (Chapters 10–20)

> How systems go from 1 user to 1 million.

| # | Topic | File Path | Key Concept |
|---|---|---|---|
| 10 | Scaling | `system-design-notes/10-scaling/README.md` | Vertical vs horizontal scaling |
| 11 | Load Balancing | `system-design-notes/11-load-balancing/README.md` | Distribute traffic across servers |
| 12 | Reverse Proxy | `system-design-notes/12-reverse-proxy/README.md` | Nginx, HAProxy — what sits in front |
| 13 | Caching | `system-design-notes/13-caching/README.md` | Read-through, write-through, eviction |
| 14 | CDN | `system-design-notes/14-cdn/README.md` | Edge caching for static assets |
| 15 | Consistent Hashing | `system-design-notes/15-consistent-hashing/README.md` | Distribute load without reshuffling |
| 16 | Databases in System Design | `system-design-notes/16-databases/README.md` | Choosing the right DB |
| 17 | SQL vs NoSQL (HLD view) | `system-design-notes/17-sql-nosql/README.md` | When to use what |
| 18 | Sharding (HLD view) | `system-design-notes/18-sharding/README.md` | Horizontal DB partitioning |
| 19 | Replication (HLD view) | `system-design-notes/19-replication/README.md` | Master-slave, multi-master |
| 20 | Bloom Filters | `system-design-notes/20-bloom-filters/README.md` | Probabilistic structures at scale |

### Key Concepts to Master
- L4 vs L7 load balancing; round-robin vs least-connections vs consistent hash
- Cache eviction: LRU, LFU, TTL; cache-aside vs read-through vs write-around
- CDN push vs pull; cache invalidation strategies
- Consistent hashing virtual nodes — why they improve balance
- Range vs hash sharding; hot-spot problem and solutions
- Bloom filter false-positive rate formula; use in Cassandra, BigTable, Redis

---

## PHASE 4 — Distributed Systems Patterns (Chapters 21–26)

> When one server isn't enough — coordination becomes hard.

| # | Topic | File Path | Key Concept |
|---|---|---|---|
| 21 | Distributed Locks | `system-design-notes/21-distributed-locks/README.md` | Redis SETNX, Redlock, fencing tokens |
| 22 | Idempotency | `system-design-notes/22-idempotency/README.md` | Never charge twice, retry safely |
| 23 | Distributed Tracing | `system-design-notes/23-distributed-tracing/README.md` | OpenTelemetry, Jaeger — find slow services |
| 24 | Object Storage | `system-design-notes/24-object-storage/README.md` | S3 — block vs file vs object |
| 25 | Geo-Distributed Systems | `system-design-notes/25-geo-distributed/README.md` | Multi-region, active-active vs active-passive |
| 26 | Consensus Algorithms | `system-design-notes/26-consensus-algorithms/README.md` | Raft, Paxos — distributed agreement |

### Key Concepts to Master
- Why distributed locks are dangerous (clock skew) — fencing tokens solution
- Idempotency keys: where to store them and their TTL
- Trace context propagation (W3C trace-context header)
- Object storage immutability and multipart upload patterns
- Active-active vs active-passive geo-replication trade-offs
- Raft leader election, log replication, and how it achieves consensus

---

## PHASE 5 — Communication Patterns (Chapters 27–32)

> How services talk to each other — sync vs async, push vs pull.

| # | Topic | File Path | Key Concept |
|---|---|---|---|
| 27 | Message Queues | `system-design-notes/27-message-queues/README.md` | Kafka, RabbitMQ — async decoupling |
| 28 | Event-Driven Architecture | `system-design-notes/28-event-driven/README.md` | Producers, consumers, event buses |
| 29 | WebSockets vs SSE vs Polling | `system-design-notes/29-websockets-sse/README.md` | When to use which for real-time |
| 30 | Webhooks | `system-design-notes/30-webhooks/README.md` | Push events to external systems |
| 31 | gRPC vs REST vs GraphQL | `system-design-notes/31-grpc-rest-graphql/README.md` | Protocol selection |
| 32 | Real-Time Systems | `system-design-notes/32-real-time/README.md` | Chat, live scores, collaborative editing |

### Key Concepts to Master
- Kafka partitioning, consumer groups, and exactly-once semantics
- At-least-once vs at-most-once vs exactly-once delivery guarantees
- When to choose WebSocket vs SSE vs long-polling vs short-polling
- gRPC's protobuf encoding vs REST JSON — latency and schema trade-offs
- Backpressure and flow control in async systems
- Fanout on write vs fanout on read (Twitter timeline model)

---

## PHASE 6 — Microservices Architecture (Chapters 33–41)

> When your monolith can't scale anymore.

| # | Topic | File Path | Key Concept |
|---|---|---|---|
| 33 | Microservices | `system-design-notes/33-microservices/README.md` | Why, when, trade-offs vs monolith |
| 34 | API Gateway | `system-design-notes/34-api-gateway/README.md` | Single entry point, auth, routing, rate limit |
| 35 | Rate Limiting | `system-design-notes/35-rate-limiting/README.md` | Token bucket, sliding window |
| 36 | Circuit Breaker | `system-design-notes/36-circuit-breaker/README.md` | Fail fast, prevent cascade failures |
| 37 | Service Discovery | `system-design-notes/37-service-discovery/README.md` | Consul, Eureka — how services find each other |
| 38 | Service Mesh | `system-design-notes/38-service-mesh/README.md` | Istio, Linkerd — sidecar proxy pattern |
| 39 | CQRS | `system-design-notes/39-cqrs/README.md` | Separate read/write models |
| 40 | Event Sourcing | `system-design-notes/40-event-sourcing/README.md` | Store events not state |
| 41 | Saga Pattern | `system-design-notes/41-saga-pattern/README.md` | Distributed transactions without 2PC |

### Key Concepts to Master
- Monolith to microservices migration — strangler fig pattern
- Token bucket vs leaky bucket vs sliding window log vs sliding window counter
- Circuit breaker states: closed, open, half-open; hystrix-style configuration
- Client-side vs server-side service discovery
- Choreography vs orchestration sagas — which to use when
- CQRS + Event Sourcing — how they complement each other
- Why 2PC fails in microservices and why Saga is the alternative

---

## PHASE 7 — Observability, Security & Operations (Chapters 42–44)

> You can't fix what you can't see.

| # | Topic | File Path | Key Concept |
|---|---|---|---|
| 42 | Monitoring & Observability | `system-design-notes/42-monitoring/README.md` | Metrics, logs, traces — the three pillars |
| 43 | Authentication Systems | `system-design-notes/43-auth/README.md` | OAuth2, JWT, session management |
| 44 | Security in System Design | `system-design-notes/44-security/README.md` | TLS, Zero Trust, mTLS, secrets management |

### Key Concepts to Master
- The three pillars: metrics (Prometheus), logs (ELK), traces (Jaeger/Zipkin)
- SLI, SLO, SLA — error budgets
- JWT structure, signing, and expiry; when to use sessions vs tokens
- OAuth2 flows: authorization code, client credentials, implicit (deprecated)
- mTLS and Zero Trust — why perimeter security is dead
- Secrets rotation and the vault pattern (HashiCorp Vault)

---

## PHASE 8 — Data at Scale (Chapters 45–46 + DB Deep Dives)

> When your data grows faster than your infrastructure.

| # | Topic | File Path | Key Concept |
|---|---|---|---|
| 45 | Search Systems | `system-design-notes/45-search-systems/README.md` | Elasticsearch, inverted index, ranking |
| 46 | Data Pipelines & Streaming | `system-design-notes/46-data-pipelines/README.md` | Kafka → Flink, batch vs stream |
| DB | MongoDB Deep Dive | `database-notes/advanced-dbms/03-mongodb.md` | Document model, aggregation pipeline |
| DB | Redis Deep Dive | `database-notes/advanced-dbms/04-redis.md` | Data structures, persistence, clustering |
| DB | Cassandra Deep Dive | `database-notes/advanced-dbms/05-cassandra.md` | Wide-column, eventual consistency, ring topology |

### Key Concepts to Master
- Inverted index construction and TF-IDF / BM25 ranking
- Elasticsearch sharding, replica placement, and query routing
- Lambda architecture vs Kappa architecture for data pipelines
- Redis persistence: RDB snapshots vs AOF — and when to disable both
- Cassandra partition key choice — hot partitions and tombstones
- When to choose Cassandra vs MongoDB vs Redis — decision matrix

---

## PHASE 9 — HLD Case Studies (Chapters 47–57)

> Read these AFTER all theory. Try to design each system yourself first, then read.

| # | System | File Path | Core Challenge |
|---|---|---|---|
| 47 | URL Shortener | `system-design-notes/47-url-shortener/README.md` | Hashing, redirection, analytics |
| 48 | Design Twitter | `system-design-notes/48-design-twitter/README.md` | Feed fanout, timeline, search |
| 49 | Design Netflix | `system-design-notes/49-design-netflix/README.md` | Video streaming, CDN, recommendations |
| 50 | Design Uber | `system-design-notes/50-design-uber/README.md` | Geo-indexing, matching, real-time location |
| 51 | Design WhatsApp | `system-design-notes/51-design-whatsapp/README.md` | Real-time messaging, E2E encryption |
| 52 | Design Search Autocomplete | `system-design-notes/52-design-search-autocomplete/README.md` | Trie, top-K, low-latency |
| 53 | Design YouTube | `system-design-notes/53-design-youtube/README.md` | Video transcoding, CDN, view counts at scale |
| 54 | Design Dropbox | `system-design-notes/54-design-dropbox/README.md` | Chunked upload, delta sync, conflict resolution |
| 55 | Notification System | `system-design-notes/55-notification-system/README.md` | Multi-channel, 10B/day, retries |
| 56 | Payment System | `system-design-notes/56-payment-system/README.md` | Idempotency, outbox pattern, exactly-once |
| 57 | Job Scheduler | `system-design-notes/57-job-scheduler/README.md` | Leader election, at-least-once, cron |

### Key Concepts to Master
- URL Shortener: base62 encoding vs MD5; 301 vs 302 redirect; click analytics pipeline
- Twitter: fanout-on-write for normal users, fanout-on-read for celebrities (hybrid)
- Netflix: adaptive bitrate (ABR) streaming; CDN pre-positioning; content fingerprinting
- Uber: geohash vs S2 cells; supply/demand matching; surge pricing signals
- WhatsApp: message ordering guarantees; offline delivery; group message fan-out
- Payment: outbox pattern; double-spend prevention; ledger immutability
- Job Scheduler: exactly-once execution; at-least-once with idempotent jobs; cron parsing

---

## PHASE 10 — LLD Foundations (Chapters 58–62)

> Completely separate skill from HLD. Start fresh here.

| # | Topic | File Path | Key Concept |
|---|---|---|---|
| 58 | OOP Principles & SOLID | `system-design-notes/58-oop-solid/README.md` | The principles every LLD interview tests |
| 59 | UML Diagrams | `system-design-notes/59-uml-diagrams/README.md` | Class diagrams, sequence diagrams |
| 60 | Creational Patterns | `system-design-notes/60-creational-patterns/README.md` | Singleton, Factory, Builder, Prototype |
| 61 | Structural Patterns | `system-design-notes/61-structural-patterns/README.md` | Adapter, Decorator, Proxy, Facade |
| 62 | Behavioral Patterns | `system-design-notes/62-behavioral-patterns/README.md` | Observer, Strategy, Command, State |

### Key Concepts to Master
- SOLID: Single Responsibility (one reason to change), Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion
- UML: association vs aggregation vs composition; multiplicity notation
- Singleton thread-safety: double-checked locking, enum-based
- Factory vs Abstract Factory vs Builder — when each is appropriate
- Observer vs Strategy — behavioral vs structural variation
- State pattern: FSM representation; when to use vs switch statements

---

## PHASE 11 — LLD Case Studies (Chapters 63–69)

> Order matters: start with pure data structures, move to real-world systems.

| # | System | File Path | Pattern Focus |
|---|---|---|---|
| 63 | Design LRU Cache | `system-design-notes/63-lru-cache/README.md` | HashMap + DLL — must-know data structure |
| 64 | Design Rate Limiter (LLD) | `system-design-notes/64-rate-limiter-lld/README.md` | Token bucket, sliding window algorithms |
| 65 | Design Vending Machine | `system-design-notes/65-vending-machine/README.md` | State pattern — clean simple example |
| 66 | Design Parking Lot | `system-design-notes/66-parking-lot/README.md` | Most common interview question |
| 67 | Design Elevator System | `system-design-notes/67-elevator-system/README.md` | SCAN algorithm, state machine |
| 68 | Design Chess Game | `system-design-notes/68-chess-game/README.md` | OOP hierarchy, move validation |
| 69 | Design BookMyShow | `system-design-notes/69-movie-booking/README.md` | Concurrency (seat locking), payment |

### Key Concepts to Master
- LRU Cache: O(1) get and put using HashMap + doubly-linked list
- Rate Limiter: token bucket state per user; sliding window log vs counter trade-off
- Vending Machine: valid state transitions; guard clauses in transition methods
- Parking Lot: spot type hierarchy; observer for availability updates
- Elevator: SCAN (elevator algorithm) vs LOOK; multi-elevator coordination
- Chess: piece hierarchy (abstract Piece); move validation responsibility chain
- BookMyShow: optimistic vs pessimistic locking for seat reservation

---

## Interview Preparation Cheatsheet

### For HLD Interviews — the 6-step framework:
```
1. Clarify requirements (2–3 min)
   - Who are the users? What actions?
   - Scale: DAU, QPS, data size
   - Non-functional: latency, availability, consistency

2. Capacity estimation (2–3 min)
   - Write QPS, Read QPS
   - Storage per year
   - Bandwidth

3. High-level design (10 min)
   - Draw the main components: clients, load balancer,
     API servers, DB, cache, message queue, CDN
   - Explain each component's role

4. Deep dive on critical components (10 min)
   - Interviewer will guide — be ready for:
     DB schema, API design, caching strategy,
     sharding key choice, real-time delivery

5. Handle bottlenecks and scale (5 min)
   - What breaks at 10x scale?
   - How do you fix it?

6. Trade-offs (2–3 min)
   - What did you sacrifice? Why?
```

### For LLD Interviews — the 5-step framework:
```
1. Clarify requirements (2 min)
   - Core use cases only — ignore edge cases first

2. Identify main entities/classes (3 min)
   - Nouns in requirements = potential classes

3. Define relationships (5 min)
   - Has-a vs Is-a
   - Cardinality (1:1, 1:N, N:M)

4. Add methods (5 min)
   - What does each class DO?
   - Which design pattern fits?

5. Write code for the core class (10 min)
   - Focus on the most interesting class
   - Show correct use of pattern
```

### Most Important Topics (by interview frequency):
```
HLD (ranked):
1. Caching strategies      — asked in ~80% of interviews
2. Load balancing          — asked in ~80%
3. CAP theorem             — asked in ~75%
4. Consistent hashing      — asked in ~70%
5. Database sharding       — asked in ~65%
6. Rate limiting           — asked in ~60%
7. Message queues          — asked in ~55%

LLD (ranked):
1. Parking Lot             — asked in ~70%
2. LRU Cache               — asked in ~60%
3. Rate Limiter (LLD)      — asked in ~50%
4. Chess / Tic-Tac-Toe     — asked in ~40%
5. Elevator System         — asked in ~35%
```

---

## Suggested Study Plan

### If you have 2 weeks (intensive):
- Days 1–2: Phase 1 + Phase 2 (DB Prerequisites + Core Foundations)
- Days 3–4: Phase 3 (Scalability Building Blocks)
- Days 5–6: Phase 4 + Phase 5 (Distributed Patterns + Communication)
- Day 7: Phase 6 (Microservices Architecture)
- Day 8: Phase 7 + Phase 8 (Observability + Data at Scale)
- Days 9–11: Phase 9 (HLD Case Studies — 3–4/day)
- Day 12: Phase 10 (LLD Foundations)
- Days 13–14: Phase 11 (LLD Case Studies)

### If you have 1 month (comfortable pace):
- Week 1: Phases 1–3 (Prerequisites + Foundations + Scalability)
- Week 2: Phases 4–6 (Distributed + Communication + Microservices)
- Week 3: Phases 7–9 (Observability + Data + HLD case studies)
- Week 4: Phases 10–11 (LLD foundations + LLD case studies)

---

*Reading sequence file: `system-design-notes/READING-SEQUENCE.md`*
*Start the viewer: `cd app && npm run dev` then open http://localhost:4000*
