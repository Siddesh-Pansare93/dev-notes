# System Design Interview Guide

## Interview Format

Most system design interviews follow this structure:

```
Total Time: 45-60 minutes

0-5 min:    Introduction & clarifications (ask questions!)
5-20 min:   High-level design (architecture, components)
20-40 min:  Deep dive (databases, APIs, specific problems)
40-45 min:  Refinement & wrap-up (bottlenecks, trade-offs)
```

## How Interviewers Evaluate You

```
Score Factors:
──────────────
30% - Clarifying Requirements
      ✅ Asking the right questions
      ✅ Identifying constraints
      ❌ Making assumptions

30% - Design Approach
      ✅ Logical thinking
      ✅ Appropriate technology choices
      ✅ Considering trade-offs
      ❌ Over-engineering or under-engineering

25% - Technical Depth
      ✅ Understanding chosen technologies
      ✅ Knowing limitations and gotchas
      ✅ Scaling strategies
      ❌ Vague or incorrect explanations

15% - Communication
      ✅ Clear explanations
      ✅ Drawing diagrams
      ✅ Asking clarifying questions
      ❌ Rambling or unclear thinking
```

## The Framework: RESHARE

```
R - Requirements clarification
E - Estimation (capacity planning)
S - Sketch high-level design
H - Handle deep dives
A - Analyze bottlenecks
R - Refine based on feedback
E - Explain decisions
```

### Step 1: Requirements (5 minutes)

**What to ask:**

```
Functional Requirements:
────────────────────────
"What are the core features users need?"
"Can you prioritize (must-have vs nice-to-have)?"
"What's out of scope?"

User Scale:
───────────
"How many total users?"
"How many daily active users?"
"How many concurrent users at peak?"
"Expected growth rate?"

Data Scale:
───────────
"How much data will we store?"
"What's the retention period?"
"How fast does data grow?"

Performance Targets:
────────────────────
"What's the target response time?"
"What availability SLA do we need?"
"Any latency constraints?"

Other Constraints:
──────────────────
"Budget constraints?"
"Technology preferences?"
"Geographic distribution needed?"
"Consistency requirements?"
```

**Example Dialog:**

```
Interviewer: "Design a YouTube-like video streaming service."

You: "Great! Let me clarify a few things:
     - Are we focusing on video upload, playback, or both?
     - How many users? 1M? 100M?
     - Is live streaming included or just on-demand?
     - What's the typical video length?
     - Do we need 4K support?
     - What regions?"

Interviewer: "500M users, 100M DAU, on-demand only,
             1-hour videos on average, 1080p max,
             global distribution."

You: "Got it. So primarily designing for playback
     at scale, focusing on low latency and high
     availability. Roughly 50K concurrent users
     based on 100M DAU spread over 24 hours."
```

### Step 2: Estimation (5 minutes)

**What to calculate:**

```
Traffic (QPS):
──────────────
DAU = 100M
Concurrent users = 100M / (86400 / 2) ≈ 2,315 users
(assume 2 hours active time)

Video plays per user: ~5/day
Plays per second = 100M × 5 / 86400 ≈ 5,787 plays/sec

Bandwidth per play: 1080p ≈ 5 Mbps
Bandwidth = 5,787 × 5 Mbps ≈ 29 Gbps

Storage:
─────────
New videos per day: 100K
Average video: 1 hour = 15 GB compressed
Daily storage = 100K × 15 GB = 1.5 PB/day
Yearly = 1.5 PB × 365 ≈ 548 PB

Cost (rough):
──────────────
Bandwidth: 29 Gbps ≈ $500K/month
Storage: 548 PB ≈ $10M/month
Compute: ~$2M/month
────────────────────────
Total: ~$12.5M/month (industry standard)
```

### Step 3: High-Level Design (10 minutes)

**Draw the architecture:**

```
┌───────────────────────────────────────────────────┐
│ Client (Web/Mobile)                               │
│ (Video player, upload interface)                  │
└──────────────────┬────────────────────────────────┘
                   │ HTTPS
┌──────────────────▼────────────────────────────────┐
│ CDN (Global distribution)                         │
│ - Cache video chunks at edge                      │
│ - Serve from nearest location                     │
│ - 95% cache hit rate                              │
└──────────────────┬────────────────────────────────┘
                   │
┌──────────────────▼────────────────────────────────┐
│ API Gateway                                       │
│ - Auth, rate limiting                             │
│ - Route to services                               │
└──────────────────┬────────────────────────────────┘
                   │
    ┌──────────────┼──────────────┬─────────────┐
    │              │              │             │
┌───▼──┐     ┌────▼──┐    ┌─────▼────┐  ┌────▼────┐
│Video │     │Upload │    │Metadata  │  │Comment  │
│Serve │     │Service│    │Service   │  │Service  │
└───┬──┘     └────┬──┘    └─────┬────┘  └────┬────┘
    │             │              │             │
    │      ┌──────▼──────┐       │             │
    │      │ Object Store│       │             │
    │      │ (S3, GCS)   │       │             │
    │      └─────────────┘       │             │
    │                            │             │
    │      ┌──────────────────────▼────────────▼──┐
    │      │ Message Queue (Kafka)                │
    │      │ - Async processing                   │
    │      │ - Event distribution                 │
    │      └──────────────────────┬───────────────┘
    │                             │
    │      ┌──────────────────────▼──────────┐
    │      │ Workers (encoding, thumbnails) │
    │      └───────────────────────────────┘
    │
    └──────────┬──────────────────┐
               │                  │
        ┌──────▼────┐    ┌──────▼──────┐
        │ Metadata  │    │Search Index │
        │ Database  │    │(Elasticsearch)
        └───────────┘    └──────┬───────┘
                                │
                         ┌──────▼──────┐
                         │ Redis Cache │
                         └──────────────┘
```

**Explain each component briefly:**

```
"Here's the high-level design:

1. Client sends request via HTTPS
2. API Gateway handles auth and routing
3. CDN caches video chunks globally
4. Services handle different domains:
   - Video Service: Streaming logic
   - Upload Service: Ingestion and encoding
   - Metadata Service: Video info
5. Message queue for async tasks
6. Workers for encoding and processing
7. Databases for persistent data
8. Cache for hot data (popular videos)"
```

### Step 4: Deep Dive (20 minutes)

**Areas to discuss:**

#### Database Design

```
Video Metadata:
───────────────
CREATE TABLE videos (
  id BIGINT PRIMARY KEY,
  title VARCHAR(255),
  description TEXT,
  uploader_id BIGINT,
  duration INT,
  created_at TIMESTAMP,
  view_count BIGINT,
  like_count BIGINT,
  INDEX(uploader_id),
  INDEX(created_at)
);

This handles:
✅ Video information lookup
✅ Filtering by uploader
✅ Sorting by time

Separate for comments, likes, view history:
✅ Prevents table bloat
✅ Different access patterns
✅ Can scale independently
```

#### API Design

```
GET /api/v1/videos/:videoId
→ Returns: video metadata, thumbnail, duration

GET /api/v1/videos/:videoId/stream?quality=1080p
→ Streams video via adaptive bitrate

POST /api/v1/videos
→ Initiates upload process

GET /api/v1/search?q=keyword
→ Returns search results from Elasticsearch
```

#### Caching Strategy

```
Cache Layer (Redis):
────────────────────
✅ Hot videos: Cache full video metadata
✅ User profiles: Cache user data
✅ Comments: Cache recent comments

TTL:
├─ Video metadata: 1 hour
├─ User profiles: 30 minutes
└─ Comments: 10 minutes

Cache-Aside Pattern:
├─ Try Redis first
├─ If miss, query database
└─ Update Redis
```

#### Encoding & Storage

```
Upload Flow:
────────────
1. User uploads video
2. Store in object store (S3)
3. Publish event to Kafka
4. Workers pick up event
5. Transcode to multiple qualities
6. Store encoded versions
7. Generate thumbnail
8. Update metadata database

Qualities:
├─ 480p (500 kbps)
├─ 720p (2.5 Mbps)
└─ 1080p (5 Mbps)
```

### Step 5: Analyze Bottlenecks (5 minutes)

**Identify potential issues:**

```
Single Points of Failure:
─────────────────────────
❌ Single database → ✅ Add replicas
❌ Single upload queue → ✅ Distributed queue
❌ Single encoder farm → ✅ Auto-scaling workers

Performance Bottlenecks:
──────────────────────
❌ Database queries slow → ✅ Add caching
❌ Encoding takes long → ✅ Use hardware acceleration
❌ Metadata database overloaded → ✅ Shard by user

Scaling Issues:
───────────────
Currently handles: 5,787 plays/sec
If grows to 50,000 plays/sec:
├─ CDN handles (has capacity)
├─ Metadata DB needs read replicas
├─ May need to shard comments
└─ Encoding queue needs more workers
```

### Step 6: Refinement & Wrap-up (5 minutes)

**Discuss trade-offs and improvements:**

```
Consistency vs Availability:
───────────────────────────
- Video metadata: Strong consistency (SQL)
- Comments: Eventual consistency (NoSQL)
- View count: Very eventual (write buffer)

Trade-off: Some views counted "later" but
system always available.

Improvements Asked About:
──────────────────────────
Q: "What about recommendations?"
A: "Good point. We'd add ML pipeline:
   - Kafka event stream of watches
   - ML model predicts recommendations
   - Store in cache
   - Serve from recommendation service"

Q: "How do you handle geographic distribution?"
A: "Good catch. We'd:
   - Replicate databases to each region
   - Use GeoDNS for routing
   - Regional CDN nodes
   - Handle cross-region consistency"
```

## Common Questions & Answers

### "How would you handle X?"

**Pattern to use:**

```
Question: "How would you handle video encoding?"

Step 1: Acknowledge it's important
"Good question, encoding is a major bottleneck."

Step 2: Propose solution
"I'd use a distributed queue system like Kafka where:
- Upload service publishes encode event
- Worker pool consumes events
- Workers encode to multiple qualities
- Results stored back in object store"

Step 3: Discuss trade-offs
"Trade-off: Encoding takes time (minutes),
so we'd show a progress indicator to user.
Not ideal for instant viewing, but necessary
for quality at scale."

Step 4: Suggest improvements
"Later we could:
- Use GPU acceleration
- Encode multiple qualities in parallel
- Pre-process common formats"
```

### "What would you change if...?"

```
Common if-statements:
────────────────────
Q: "What if you had to handle live streaming?"
A: "That's different - we'd use:
   - RTMP ingest protocol
   - Real-time transcoding
   - HLS/DASH for playback
   - Much lower latency requirements (seconds not minutes)"

Q: "What if storage was 10x more expensive?"
A: "We'd:
   - Increase video compression
   - Delete old unpopular videos
   - Use lower quality storage for archives
   - Implement tiered storage"

Q: "What if we had no CDN?"
A: "We'd:
   - Use more server replicas
   - Implement caching at more layers
   - Optimize video codecs
   - Consider P2P delivery"
```

## Red Flags (Things NOT to do)

```
❌ Don't make assumptions silently
   ✅ DO: Ask clarifying questions

❌ Don't jump to fancy tech immediately
   ✅ DO: Start simple, add complexity when needed

❌ Don't ignore CAP theorem
   ✅ DO: Discuss consistency trade-offs

❌ Don't design without mentioning monitoring
   ✅ DO: Include metrics, logs, tracing

❌ Don't have single points of failure
   ✅ DO: Replicate and add redundancy

❌ Don't forget about cost
   ✅ DO: Mention cost considerations

❌ Don't be vague about databases
   ✅ DO: Explain schema and indexing strategy

❌ Don't ignore network constraints
   ✅ DO: Remember latency and bandwidth limits
```

## Practice Scenarios

### System Design Exercise 1: URL Shortener

```
Scope: 100M new URLs/month, 100:1 read-write ratio

Time limit: 45 minutes
Ask yourself:
├─ How to generate unique short codes?
├─ Where to store mappings?
├─ How to handle this traffic?
├─ What about expiration?
└─ What about analytics?

Key points:
✅ Hash function or counter for short codes
✅ Key-value store (NoSQL) for simplicity
✅ Cache hot URLs
✅ Simple approach - don't over-engineer
```

### System Design Exercise 2: Twitter Feed

```
Scope: 500M users, 6K tweets/second, real-time

Time limit: 45 minutes
Ask yourself:
├─ How to generate personalized feed?
├─ Pre-compute or compute on demand?
├─ How to handle followers?
├─ What about notifications?
└─ Scaling strategy?

Key points:
✅ Fanout on write for faster reads
✅ Cache feed in Redis
✅ Geospatial considerations
✅ Message queue for async tasks
```

### System Design Exercise 3: Booking System (Airbnb)

```
Scope: 1M listings, high consistency needed

Time limit: 45 minutes
Ask yourself:
├─ How to prevent overbooking?
├─ How to handle concurrent bookings?
├─ What about payment?
├─ Search and filtering?
└─ Reviews and ratings?

Key points:
✅ Transactions for overbooking prevention
✅ Database locks or optimistic locking
✅ Search index for discovery
✅ Separate payment service
```

## Interview Day Tips

### Before the Interview

```
✅ Get good sleep (not last-minute cramming!)
✅ Have paper and pen ready
✅ Test audio/video setup (if remote)
✅ Have quiet place without interruptions
✅ Drink water
✅ Have 2-3 system designs fresh in mind
```

### During the Interview

```
✅ Ask clarifying questions (don't assume)
✅ Think out loud (let them hear your process)
✅ Draw diagrams (visual communication is key)
✅ Explain trade-offs (no perfect solution)
✅ Ask for feedback ("Does this direction look good?")
✅ Admit unknowns ("I haven't used that, but here's my approach")
✅ Stay calm (it's normal to get stuck)
```

### When You Get Stuck

```
❌ Don't: Panic or go silent
✅ DO: Talk through your thinking

❌ Don't: Make up technology
✅ DO: Admit unknowns and propose alternatives

❌ Don't: Defend bad idea stubbornly
✅ DO: Accept feedback and adjust

Example:
"I'm not familiar with [technology], but based on
[requirement], I think we'd want [solution].
What's your perspective?"
```

### When You Disagree

```
❌ Don't: Be argumentative
✅ DO: Present your reasoning

Example:
Interviewer: "Why not use MongoDB?"
You: "Good question. I chose PostgreSQL because
we need strong consistency for payments.
MongoDB's eventual consistency could cause
double-charges. Does that make sense or am I
missing something?"
```

## Post-Interview

### What Interviewers Look For

```
✅ Can you clarify ambiguous requirements?
✅ Can you break down big problems?
✅ Do you understand fundamental trade-offs?
✅ Can you write clean architecture?
✅ Do you consider operational aspects?
✅ Can you adapt based on feedback?
✅ Do you communicate clearly?
```

### Common Feedback Patterns

```
"You aced it!"
└─ You're probably getting an offer

"Good work, let's talk through one more scenario"
└─ Probably positive, doing well

"What if we changed the requirements?"
└─ Testing adaptability, seems fine

"How would you debug this issue?"
└─ Checking operational thinking

"Tell me about a system you built"
└─ Pivoting to practical experience
```

## Practice Resources

```
Where to practice:
──────────────────
✅ LeetCode System Design Problems
✅ Educative.io System Design Courses
✅ Design Mock Interviews with peers
✅ Reading "Designing Data-Intensive Applications"
✅ Studying architecture blogs (High Scalability)
✅ This tutorial!

How much to practice:
────────────────────
2 weeks before interview:
├─ Practice 3-4 systems in detail
├─ Do 2-3 mock interviews
└─ Review weak areas

1 week before:
├─ 2 more mock interviews
├─ Review key concepts
└─ Build confidence

Day before:
├─ Review 2-3 past designs
├─ Get good sleep
└─ Relax
```

## Final Checklist

Before an interview, make sure you:

- [ ] Can clearly state CAP theorem
- [ ] Understand SQL vs NoSQL trade-offs
- [ ] Know when to use caching vs databases
- [ ] Can sketch a load balancer diagram
- [ ] Understand replication and sharding basics
- [ ] Know latency numbers (cache, disk, network)
- [ ] Can estimate QPS and storage
- [ ] Can discuss monitoring and observability
- [ ] Can talk about trade-offs confidently
- [ ] Can adapt design to new requirements

---

**Remember**: Interviewers are looking for problem-solving skills, not perfect answers. Stay calm, think out loud, and adapt based on feedback.

Good luck! 🚀
