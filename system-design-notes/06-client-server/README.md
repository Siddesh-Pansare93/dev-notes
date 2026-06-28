# Client-Server Model — The Foundation of Every App You Use

> "Before you can understand Instagram, Netflix, or WhatsApp — you must understand the client-server model. Everything else builds on top of this."

---

## Table of Contents

1. [The Big Picture — What Is Client-Server?](#1-the-big-picture)
2. [The Request-Response Cycle](#2-the-request-response-cycle)
3. [Stateless vs Stateful Servers](#3-stateless-vs-stateful-servers)
4. [HTTP Is Stateless — So How Do We Stay Logged In?](#4-http-is-stateless)
5. [Cookies — The Browser's Memory](#5-cookies)
6. [Sessions — Server-Side Memory](#6-sessions)
7. [JWT Tokens — Stateless Auth](#7-jwt-tokens)
8. [CDN — Serving Static Assets from the Edge](#8-cdn)
9. [Evolution of Server Architecture](#9-evolution-of-server-architecture)
10. [Why Separation of Concerns Scales](#10-why-separation-of-concerns-scales)
11. [Amazon's Story — From One PHP Server to Microservices](#11-amazons-story)
12. [Browser Caching](#12-browser-caching)
13. [Common Interview Questions](#13-common-interview-questions)
14. [Key Takeaways](#14-key-takeaways)

---

## 1. The Big Picture

### Analogy: The Restaurant

Socho ek restaurant mein jaate ho. Tum **customer** ho — tumhe khaana chahiye. Tum waiter ko bulate ho, order dete ho. Waiter **kitchen** mein jaata hai, chef khaana banata hai, waiter le aata hai.

Tum kitchen mein nahi jaate. Kitchen ko tumhare ghar ki address nahi pata. Ek clear division hai — customer ek side, kitchen dusri side.

**Exactly yahi hai client-server model.**

```
CLIENT                        SERVER
  │                              │
  │   "Mujhe yeh page chahiye"   │
  │ ─────────────────────────>   │
  │                              │
  │   "Yeh lo bhai, page ready"  │
  │ <─────────────────────────   │
  │                              │
```

| Role | Restaurant | Web World |
|------|-----------|-----------|
| Client | Customer | Browser / Mobile App |
| Server | Kitchen + Chef | Backend server (handles logic) |
| Request | Order | HTTP Request (GET /feed) |
| Response | Food on plate | HTML / JSON / data |
| Waiter | Middleman | Network / Internet |

### Who is the Client?

- Your **Chrome browser** when you open YouTube
- The **Swiggy app** on your phone when you order biryani
- Your **WhatsApp** when you send a message
- A **Python script** hitting an API
- Even another **server** calling a different server (microservices do this)

### Who is the Server?

- The machine(s) at YouTube that store your feed data
- Swiggy's backend that calculates delivery time and restaurant list
- WhatsApp's servers that route your message to the recipient
- Any process **listening** on a port, waiting for requests

### Key Point

**The client initiates. The server reacts.** This is the fundamental rule. The server does not randomly send you data — it only responds when you ask. (Except in special patterns like WebSockets, covered later.)

---

## 2. The Request-Response Cycle

### Analogy: Sending a Letter and Getting a Reply

Jab tum ek letter bhejte ho, uspe address likhte ho (DNS lookup), post office deliver karta hai (network routing), jo banda address pe rehta hai woh reply karta hai (server). Phir reply wapas aata hai.

### What Actually Happens When You Open instagram.com

Most people think it's simple: "you type URL, page opens." But behind the scenes, 7+ steps happen in milliseconds.

```mermaid
sequenceDiagram
    participant B as Browser (Client)
    participant DNS as DNS Server
    participant CDN as CDN Edge Node
    participant LB as Load Balancer
    participant S as App Server
    participant C as Cache (Redis)
    participant DB as Database

    B->>DNS: What is the IP for instagram.com?
    DNS-->>B: IP = 157.240.21.174

    B->>CDN: GET /static/logo.png
    CDN-->>B: Here is logo.png (served from edge)

    B->>LB: GET /api/feed (HTTPS request)
    LB->>S: Forward request to App Server 3

    S->>C: Do I have feed for user_id=42 in cache?
    C-->>S: Cache HIT — here is the feed

    S-->>LB: 200 OK { posts: [...] }
    LB-->>B: 200 OK { posts: [...] }

    B->>B: Render HTML/JS with data
```

### Step-by-Step Breakdown

**Step 1 — DNS Resolution**
- You type `instagram.com`
- Browser asks DNS: "Kya IP address hai is domain ka?"
- DNS replies: "157.240.21.174"
- Think of DNS as the **phonebook of the internet**

**Step 2 — TCP Connection**
- Browser connects to that IP on port 443 (HTTPS)
- TCP 3-way handshake: SYN → SYN-ACK → ACK
- TLS handshake for encryption (HTTPS)

**Step 3 — HTTP Request Sent**
```http
GET /api/v1/feed HTTP/1.1
Host: instagram.com
Authorization: Bearer eyJhbGciOiJSUz...
Accept: application/json
User-Agent: Mozilla/5.0 ...
```

**Step 4 — Server Processes**
- Authentication: "Is this token valid? Who is this user?"
- Authorization: "Is this user allowed to see this feed?"
- Business logic: "Which posts should they see? ML ranking..."
- Database/Cache query: "Fetch the posts"

**Step 5 — HTTP Response Sent**
```http
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: no-cache
Set-Cookie: session_id=abc123; HttpOnly; Secure

{
  "posts": [
    { "id": 1, "image": "...", "likes": 2340 },
    { "id": 2, "image": "...", "likes": 890 }
  ]
}
```

**Step 6 — Browser Renders**
- Parses HTML/JSON
- Downloads additional assets (images, CSS, JS)
- Executes JavaScript
- Shows you Instagram's feed

### HTTP Status Codes — Jaan Lo Yeh Sab

| Code | Meaning | Real Example |
|------|---------|--------------|
| 200 | OK — request succeeded | Feed loaded |
| 201 | Created — new resource made | Post uploaded |
| 301 | Moved permanently | http → https redirect |
| 304 | Not Modified — use your cache | Browser cache hit |
| 400 | Bad Request — client sent wrong data | Missing field in form |
| 401 | Unauthorized — not logged in | Accessing private profile |
| 403 | Forbidden — logged in but no permission | Editing someone else's post |
| 404 | Not Found | Deleted post URL |
| 429 | Too Many Requests | Rate limited by API |
| 500 | Internal Server Error | Bug in server code |
| 503 | Service Unavailable | Server overloaded / down |

> **Interview Tip**: Know the difference between 401 and 403. 401 = "Who are you?" (unauthenticated). 403 = "I know who you are, but you can't do this" (unauthorized).

---

## 3. Stateless vs Stateful Servers

### Analogy: Two Types of Waiters

**Stateful Waiter**: Remembers everything. "Oh, you were here last week, you always order butter naan. Your wife is vegetarian. You like your tea strong." This waiter remembers YOUR history personally.

**Stateless Waiter**: Every time you come, treats you like a brand new customer. You must tell them your order fresh. But here's the thing — this waiter can be replaced by ANY other waiter, because no personal memory is required.

Yahi difference hai stateful aur stateless servers mein.

### Stateful Server

```mermaid
sequenceDiagram
    participant C as Client
    participant S1 as Server 1

    C->>S1: Login (user: siddesh, pass: ****)
    S1-->>C: OK, I stored your session in MY memory

    C->>S1: Get my profile
    S1->>S1: Check my in-memory session... found! user_id=42
    S1-->>C: Here is Siddesh's profile

    Note over C,S1: ❌ Problem: Client MUST go to Server 1.<br/>If Server 1 crashes, session is lost.
```

**The Problem with Stateful Servers:**

Imagine you have 3 servers behind a load balancer. User logs into Server 1. Session stored in Server 1's memory. Next request goes to Server 2 — Server 2 has no idea who this user is. User is logged out. Frustrating!

### Stateless Server

```mermaid
sequenceDiagram
    participant C as Client
    participant S1 as Server 1
    participant S2 as Server 2
    participant S3 as Server 3

    C->>S1: Login (user: siddesh, pass: ****)
    S1-->>C: Here is your TOKEN (all info inside it)

    C->>S2: Get my profile [TOKEN attached]
    S2->>S2: Verify token signature... valid! user_id=42
    S2-->>C: Here is Siddesh's profile

    C->>S3: Update my bio [TOKEN attached]
    S3->>S3: Verify token signature... valid! user_id=42
    S3-->>C: Bio updated!

    Note over C,S1,S2,S3: ✅ Any server can handle any request.<br/>Token carries all needed info.
```

**Why Stateless Servers Scale Better:**

```
Stateful Setup:
───────────────
User A → MUST go to Server 1 (their session lives there)
User B → MUST go to Server 2 (their session lives there)

If Server 1 dies → User A's session is GONE

Stateless Setup:
────────────────
User A → Can go to Server 1, 2, or 3 (doesn't matter)
User B → Can go to Server 1, 2, or 3 (doesn't matter)

If Server 1 dies → Load balancer sends users to Server 2 and 3.
No session loss. Users don't even notice.
```

### Comparison Table

| Aspect | Stateful | Stateless |
|--------|----------|-----------|
| Memory | Server remembers client state | Client carries state (token/cookie) |
| Scaling | Hard — sessions tied to server | Easy — any server can handle any request |
| Fault Tolerance | Low — server crash = lost session | High — any other server takes over |
| Complexity | Simpler server code (less to pass) | Client must always send context |
| Example | Old PHP session apps | Modern REST APIs with JWT |
| Real World | FTP protocol, old-school banking sites | Instagram API, Zomato API, Netflix API |

> **Interview Tip**: "Stateless" doesn't mean "no state exists anywhere" — it means the server does not store per-request client state IN MEMORY between requests. State can still be stored in a database or cache.

---

## 4. HTTP Is Stateless

### The Core Problem

HTTP — the protocol browsers use to talk to servers — is inherently **stateless**. Every HTTP request is completely independent. The server treats each request as if it's the first time it's ever seen you.

**Simple baat hai**: HTTP is like a vending machine. You put money, press button, get product. The machine doesn't remember you were there 5 seconds ago. Press again, pay again. Start over.

So the obvious question: **Agar HTTP stateless hai, toh main YouTube pe logged in kaise rehta hoon? Har request pe dobara login kyun nahi karna padta?**

The answer: We fake state on top of stateless HTTP using:

1. **Cookies** — small data stored in browser, sent automatically
2. **Sessions** — server-side storage, referenced by a cookie ID
3. **Tokens (JWT)** — self-contained signed tokens carried by client

Let's understand each one deeply.

---

## 5. Cookies

### Analogy: The Stamp at a Theme Park

Jab tum Imagica jaate ho, woh tumhare haath pe ek stamp lagate hain. Agar tum baahar jaao aur wapas aao, guard stamp dekh ke andar le jaata hai — dobara ticket nahi kharidni padti.

**Cookie = that stamp on your hand.** Browser pe store hoti hai, automatically server ko bhejti hai.

### How Cookies Work — Step by Step

**Step 1: Server Sets the Cookie**
```
When you log in, server responds with:

HTTP/1.1 200 OK
Set-Cookie: session_id=abc123xyz; HttpOnly; Secure; SameSite=Strict; Max-Age=86400
Set-Cookie: user_pref=dark_mode; Max-Age=2592000
Content-Type: application/json

{"message": "Login successful"}
```

**Step 2: Browser Stores It**
Browser automatically saves this cookie. You don't have to do anything.

**Step 3: Browser Sends Cookie on Every Future Request**
```
GET /api/feed HTTP/1.1
Host: instagram.com
Cookie: session_id=abc123xyz; user_pref=dark_mode
```

The server reads `session_id`, looks it up, knows who you are.

```mermaid
sequenceDiagram
    participant B as Browser
    participant S as Server

    B->>S: POST /login {username, password}
    S->>S: Validate credentials, create session
    S-->>B: 200 OK\nSet-Cookie: session_id=abc123; HttpOnly; Secure

    Note over B: Browser saves the cookie

    B->>S: GET /dashboard\nCookie: session_id=abc123
    S->>S: Look up session_id=abc123... user is Siddesh
    S-->>B: 200 OK {dashboard data for Siddesh}

    B->>S: GET /profile\nCookie: session_id=abc123
    S-->>B: 200 OK {Siddesh's profile}
```

### Cookie Flags — Bahut Important Hai Yeh

These flags control cookie security and behavior. **MUST know for interviews.**

#### `HttpOnly`

```
Set-Cookie: session_id=abc123; HttpOnly
```

- **Without HttpOnly**: JavaScript can read `document.cookie` and steal your session ID
- **With HttpOnly**: JavaScript CANNOT access this cookie. Only browser ↔ server.
- **Why it matters**: Protects against XSS attacks (Cross-Site Scripting)
- **Rule of Thumb**: Session cookies should ALWAYS be HttpOnly

#### `Secure`

```
Set-Cookie: session_id=abc123; Secure
```

- Cookie will ONLY be sent over HTTPS connections
- Over plain HTTP, the cookie is not transmitted
- **Why it matters**: Prevents session hijacking over unencrypted connections (e.g., open WiFi at cafe)
- **Rule of Thumb**: Session cookies should ALWAYS be Secure in production

#### `SameSite`

```
Set-Cookie: session_id=abc123; SameSite=Strict
Set-Cookie: session_id=abc123; SameSite=Lax
Set-Cookie: session_id=abc123; SameSite=None; Secure
```

This flag controls when cookies are sent in cross-site requests.

| Value | When Cookie is Sent | Use Case |
|-------|--------------------|-|
| `Strict` | Only same-site requests | Sensitive cookies (banking, admin) |
| `Lax` | Same-site + top-level navigation from another site | Most login sessions |
| `None` | All cross-site requests (requires `Secure`) | Third-party cookies, embedded content |

**Why SameSite matters**: Protects against **CSRF attacks** (Cross-Site Request Forgery).

CSRF attack without SameSite: You're logged into bank.com. You visit evil.com. evil.com has a hidden form that POSTs to bank.com/transfer. Your browser automatically sends bank.com cookies. Money transferred. With `SameSite=Strict`, the cookie is NOT sent on this cross-site request.

#### `Max-Age` and `Expires`

```
Set-Cookie: session_id=abc123; Max-Age=86400        # expires in 24 hours
Set-Cookie: remember_me=xyz; Expires=Thu, 01 Jan 2026 00:00:00 GMT
```

- **Session Cookie** (no Max-Age/Expires): Deleted when browser closes
- **Persistent Cookie**: Lives until the specified time

#### `Domain` and `Path`

```
Set-Cookie: pref=dark; Domain=.example.com; Path=/
```

- `Domain=.example.com` — cookie sent to all subdomains (api.example.com, www.example.com)
- `Path=/dashboard` — cookie only sent for requests to /dashboard and below

### Cookie Size Limits

- **Max size**: ~4KB per cookie
- **Max cookies per domain**: ~50 (browser dependent)
- This is why you can't store large data in cookies — use server-side sessions or localStorage for that

### Real Example: Zomato's Cookies

When you log into Zomato:
```
zomato_session=eyJhbGci...; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000
zomato_city=mumbai; Max-Age=31536000       (city preference, 1 year)
zomato_theme=light; Max-Age=31536000       (theme preference, 1 year)
```

Notice: the actual session ID is HttpOnly + Secure (sensitive). Preferences like city and theme are separate, less sensitive cookies.

---

## 6. Sessions

### Analogy: Hotel Room Key vs. Guest File

Cookie alone sirf ek key card hai. Sessions ek step aage hain — actual guest information hotel office mein folder mein rakhi hai. Key card sirf folder number ke liye hai.

Jab tum hotel check in karte ho:
- Hotel ek folder banata hai tumhare baare mein (name, room number, checkout date, special requests)
- Folder ko ek number dete hain (e.g., Guest #1042)
- Tumhe Guest #1042 ka key card dete hain

Jab tumhe kuch chahiye:
- Tum key card dikhate ho (session ID in cookie)
- Staff folder lookup karta hai (server looks up session store)
- Tumhari info milti hai

**Session ID = key card. Session store = the folder in the office.**

### How Server-Side Sessions Work

```mermaid
sequenceDiagram
    participant B as Browser
    participant S as App Server
    participant R as Session Store (Redis/DB)

    B->>S: POST /login {username: siddesh, password: ****}
    S->>S: Validate credentials — user_id = 42
    S->>R: Store: session["abc123"] = {user_id: 42, name: "Siddesh", role: "user", created: now}
    S-->>B: 200 OK\nSet-Cookie: session_id=abc123; HttpOnly; Secure

    Note over B: Browser stores cookie

    B->>S: GET /orders\nCookie: session_id=abc123
    S->>R: Lookup session["abc123"]
    R-->>S: {user_id: 42, name: "Siddesh", role: "user"}
    S->>S: Fetch orders for user_id=42
    S-->>B: 200 OK {orders: [...]}
```

### What Gets Stored in the Session

```json
{
  "user_id": 42,
  "username": "siddesh_pansare",
  "email": "siddesh@example.com",
  "role": "premium_user",
  "cart": [{"item_id": 101, "qty": 2}],
  "last_activity": "2026-06-26T10:30:00Z",
  "created_at": "2026-06-26T09:00:00Z"
}
```

The session_id sent to browser is just: `abc123xyz789` — a random, opaque string. No information encoded in it.

### Why Sessions Don't Scale Horizontally

This is the CRITICAL problem. Samajh lo yeh concept — interview mein bahut aata hai.

```mermaid
graph TD
    C[Client] -->|session_id=abc123| LB[Load Balancer]
    LB -->|Round Robin| S1[Server 1\nHas: abc123 in memory]
    LB -->|Round Robin| S2[Server 2\nHas: NO session data]
    LB -->|Round Robin| S3[Server 3\nHas: NO session data]

    S1 -->|✅ Works| OK[Request Processed]
    S2 -->|❌ Fails| FAIL[Not Logged In!]
    S3 -->|❌ Fails| FAIL2[Not Logged In!]
```

**Three Solutions to Session Scaling Problem:**

#### Solution 1: Sticky Sessions (Least Preferred)

```
Load balancer always routes User A to Server 1
Load balancer always routes User B to Server 2

❌ Problem: If Server 1 crashes, User A's session is gone
❌ Problem: Uneven load distribution
❌ Problem: Can't add/remove servers easily
✅ Simple to implement
```

#### Solution 2: Centralized Session Store (Redis) — Preferred

```mermaid
graph TD
    C[Client] -->|session_id=abc123| LB[Load Balancer]
    LB --> S1[Server 1]
    LB --> S2[Server 2]
    LB --> S3[Server 3]
    S1 -->|Read/Write session| R[(Redis\nShared Session Store)]
    S2 -->|Read/Write session| R
    S3 -->|Read/Write session| R
```

Any server can handle any request because they all read from the SAME Redis. This is how Instagram, Twitter, and most major apps handle sessions.

```
✅ Any server handles any request
✅ Highly available (Redis cluster)
✅ Fast (Redis is in-memory, microsecond lookups)
✅ Sessions can be revoked instantly (delete from Redis)
❌ Extra network hop to Redis on every request
❌ Redis becomes a single point of failure (mitigated with Redis Cluster)
```

#### Solution 3: Client-Side State (JWT) — Also Preferred for APIs

Don't store session on server at all. Encode everything into a signed token sent to the client. This is JWT — covered in the next section.

### Sessions vs Cookies — Clear Karo

Many beginners confuse these. They are different things:

| | Cookie | Session |
|--|--------|---------|
| Where stored | Browser | Server (memory/Redis/DB) |
| What it contains | Small key-value data | Full user state |
| Size limit | ~4KB | Practically unlimited |
| Security | Can be stolen if not HttpOnly+Secure | Safer (only ID exposed) |
| Revocation | Can't invalidate without expiry | Delete from server = instant revoke |

**Sessions USE cookies to store the session ID.** They work together, not instead of each other.

---

## 7. JWT Tokens

### Analogy: A Signed Government ID

Imagine a government-issued ID card (Aadhaar, Passport). It contains your name, photo, DOB — all encoded IN the card itself. Any authority can verify it using the government's official seal. They don't need to call a central database.

**JWT (JSON Web Token) = that ID card.** The server signs it. Anyone with the public key can verify it without calling home.

### What JWT Looks Like

```
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo0Miwibm1hZSI6IlNpZGRlc2giLCJyb2xlIjoidXNlciIsImV4cCI6MTc1MzQ5MDAwMH0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

Three parts separated by dots:

1. **Header** (Base64 encoded): `{"alg": "RS256", "typ": "JWT"}`
2. **Payload** (Base64 encoded): `{"user_id": 42, "name": "Siddesh", "role": "user", "exp": 1753490000}`
3. **Signature**: Server signs Header + Payload with a secret key

```mermaid
sequenceDiagram
    participant B as Browser
    participant S1 as Server 1
    participant S2 as Server 2

    B->>S1: POST /login {username, password}
    S1->>S1: Validate credentials
    S1->>S1: Create JWT: {user_id: 42, role: "user", exp: tomorrow}\nSign with SECRET_KEY
    S1-->>B: 200 OK\n{token: "eyJhbGci..."}

    Note over B: Store token in localStorage or cookie

    B->>S2: GET /api/profile\nAuthorization: Bearer eyJhbGci...
    S2->>S2: Verify signature with SECRET_KEY — VALID!\nDecode payload: user_id=42
    S2-->>B: 200 OK {profile for user_id 42}

    Note over S1,S2: No session store needed!<br/>Either server can verify the token.
```

### JWT Payload — What Goes Inside

```json
{
  "sub": "42",
  "name": "Siddesh Pansare",
  "email": "siddesh@example.com",
  "role": "premium_user",
  "iat": 1753400000,
  "exp": 1753486400
}
```

- `sub` — subject (user ID)
- `iat` — issued at (Unix timestamp)
- `exp` — expiry time

**WARNING**: JWT payload is **Base64 encoded, NOT encrypted.** Anyone can decode it. Never put passwords, secret data inside JWT.

### JWT vs Sessions — The Great Debate

| Aspect | Server Sessions (Redis) | JWT Tokens |
|--------|------------------------|------------|
| State | Server-side | Client-side (stateless) |
| Revocation | Instant (delete from Redis) | Cannot revoke before expiry* |
| Scaling | Needs shared session store | Trivial — no shared store |
| Size | Tiny session ID (~20 bytes) | Larger token (~500+ bytes) |
| DB lookup per request | Yes (Redis lookup) | No (just verify signature) |
| Sensitive data | Stored server-side (safer) | Encoded in token (careful!) |
| Best for | Web apps, admin panels | Stateless APIs, microservices |

*JWT revocation workaround: maintain a blacklist in Redis. But then you're back to server-side state for invalidation.

### When to Use What

```
Use Sessions when:
  - Web app (browser-based)
  - Need to revoke tokens instantly (e.g., "log out all devices")
  - Storing large amounts of per-user state
  - Traditional Django/Rails/Spring app

Use JWT when:
  - Mobile app / SPA (React, Angular) calling APIs
  - Microservices (Service A calls Service B — no shared session store)
  - Short-lived tokens (access token: 15 mins, refresh token: 7 days)
  - Stateless API design
```

> **Note**: JWT is covered more deeply in the Authentication chapter. For now, understand it as a stateless alternative to sessions.

---

## 8. CDN

### Analogy: Multiple Warehouses Instead of One Factory

Imagine Amazon has only one warehouse in Mumbai. Koi Chennai se order kare — 2-3 din lage delivery mein. Ab imagine Amazon ke paas Chennai mein bhi warehouse hai. Chennai customer ko 1 din mein delivery. Same product, closer location.

**CDN = those local warehouses for your website's static files.**

### What is a CDN?

**Content Delivery Network** — a globally distributed network of servers ("edge nodes" or "PoPs — Points of Presence") that cache and serve static content close to the user.

```mermaid
graph TD
    User1[User in Mumbai] -->|"logo.png"| E1[Edge Node: Mumbai CDN]
    User2[User in London] -->|"logo.png"| E2[Edge Node: London CDN]
    User3[User in NYC] -->|"logo.png"| E3[Edge Node: New York CDN]

    E1 -->|"Cache MISS - first time"| Origin[Origin Server\nBangalore]
    E2 -->|"Cache MISS - first time"| Origin
    E3 -->|"Cache MISS - first time"| Origin

    Origin -->|"Sends file, CDN caches it"| E1
    Origin -->|"Sends file, CDN caches it"| E2
    Origin -->|"Sends file, CDN caches it"| E3

    Note1[Mumbai users next request: served from Mumbai CDN]
    Note2[London users next request: served from London CDN]
```

### What Does CDN Serve?

- Images (product photos on Flipkart, stories on Instagram)
- Videos (Netflix, YouTube — most of their content via CDN)
- JavaScript and CSS files (React app's bundle.js)
- Fonts (Google Fonts)
- HTML pages (static sites)

### What CDN Does NOT Serve (Usually)

- Personalized API responses (`/api/feed` — different for every user)
- Authentication endpoints
- Payments, dynamic checkout
- Real-time data

### Why CDN for Scaling

```
Without CDN:
────────────
Every user request → origin server (maybe in one city)
Delhi user: 200ms latency (round trip to Bangalore)
London user: 600ms latency (round trip to Bangalore)
Server under load from the whole world

With CDN:
─────────
Delhi user → Mumbai CDN edge: 5ms latency
London user → London CDN edge: 8ms latency
Origin server only gets cache-miss requests (very few)
Origin under minimal load
```

### Real Examples

- **Netflix**: Uses AWS CloudFront + their own Open Connect CDN for video streaming. 99% of your Netflix video comes from edge nodes, not Netflix's origin servers.
- **YouTube**: Google has edge nodes in every major city. When you watch a viral video, millions watch from their nearest Google edge node.
- **Instagram**: Serves all images and videos via Facebook's CDN (now Meta CDN).
- **Swiggy/Zomato**: Restaurant photos, banners served from CDN. Menu API calls go to origin.

### Popular CDN Providers

| CDN | Used By | Notes |
|-----|---------|-------|
| Cloudflare | Most of the internet | Free tier available |
| AWS CloudFront | Amazon, Netflix | Deep AWS integration |
| Akamai | Old-school enterprises | Largest network |
| Fastly | GitHub, Reddit, Shopify | Excellent for APIs |
| Google Cloud CDN | YouTube, Google services | |

> **Interview Tip**: CDN reduces latency + offloads origin server. Always mention CDN when asked "how would you design Instagram/YouTube at scale."

---

## 9. Evolution of Server Architecture

### Analogy: A Small Shop Growing into a Mall

Ek banda apni dukaan kholta hai — ek hi room mein sab kuch: counter, stock, account ledger. Business badhta hai. Counter alag, stock room alag. Aur badhta hai — multiple branches, each branch ka koi alag maal-godam. Aur badhta hai — dedicated accountant, IT team, security. That's exactly how server architecture evolves.

### Stage 1: Single Server (The Humble Beginning)

```mermaid
graph TD
    Users[5-50 Users] --> Server[Single Server\n• Web code\n• Database\n• File storage\n• ALL on one machine]

    style Server fill:#ef4444,stroke:#b91c1c,color:#fff
```

**What's here:**
- One machine runs everything: web server (Apache/Nginx), application code, database (MySQL/PostgreSQL)
- Startup blogs, college projects, MVPs

**Reality Check:**
```
Your Node.js app + MySQL + file uploads
All running on one ₹500/month DigitalOcean droplet
```

**Problems When You Scale:**
- Database queries slow? Can't optimize independently — everything's mixed
- App crashes = DB also gone = total outage
- CPU-intensive DB operations hurt web request handling
- Can't scale one part without the other

### Stage 2: Separate Web Server + DB Server

```mermaid
graph LR
    Users[100-1000 Users] --> WS[Web/App Server\nNode.js / Django / Rails]
    WS <-->|SQL queries\nnetwork| DB[(Database Server\nPostgreSQL / MySQL)]
    WS -->|Store files| FS[File Storage\nS3 / NFS]

    style WS fill:#3b82f6,stroke:#2563eb,color:#fff
    style DB fill:#10b981,stroke:#047857,color:#fff
```

**What changed:**
- Web server handles HTTP requests, runs business logic
- DB server dedicated to database — can tune OS, RAM, disk for DB workload
- Each can be scaled, upgraded independently

**Benefits:**
```
✅ DB server: more RAM, fast SSDs, tuned for I/O
✅ Web server: more CPU, optimized for request handling
✅ Independent restarts — restart web server without touching DB
✅ Independent backups
```

**This is Stage 2 for most startups.** Zomato looked like this in 2012. Swiggy in 2015.

### Stage 3: Load Balanced Web Servers

```mermaid
graph TD
    Users[10,000+ Users] --> LB[Load Balancer\nNginx / AWS ALB]
    LB --> WS1[Web Server 1]
    LB --> WS2[Web Server 2]
    LB --> WS3[Web Server 3]
    WS1 --> DB[(Primary DB)]
    WS2 --> DB
    WS3 --> DB

    style LB fill:#f59e0b,stroke:#d97706,color:#fff
    style DB fill:#10b981,stroke:#047857,color:#fff
```

**What changed:**
- Multiple identical web servers behind a load balancer
- Load balancer distributes traffic (round-robin, least connections, etc.)
- **Critical requirement**: Servers must be STATELESS (no in-memory sessions!)

**Benefits:**
```
✅ Handle more concurrent requests by adding web servers
✅ Rolling deployments — update one server at a time (zero downtime)
✅ Fault tolerance — one server crashes, others serve traffic
```

**New Problem:**
```
Database = single server = BOTTLENECK
All 3 web servers hammer the same DB
Writes AND reads on one machine
```

### Stage 4: Full Production Architecture

```mermaid
graph TD
    Users[100,000+ Users]
    Users -->|Static assets| CDN[CDN\nImages / JS / CSS]
    Users -->|API calls| LB[Load Balancer]

    LB --> WS1[App Server 1]
    LB --> WS2[App Server 2]
    LB --> WS3[App Server 3]
    LB --> WS4[App Server 4]

    WS1 --> Cache[(Redis Cache\nSessions + Hot Data)]
    WS2 --> Cache
    WS3 --> Cache
    WS4 --> Cache

    WS1 -->|Writes| DBP[(DB Primary\nPostgreSQL)]
    WS2 -->|Writes| DBP
    WS3 -->|Reads| DBR1[(DB Replica 1)]
    WS4 -->|Reads| DBR2[(DB Replica 2)]

    DBP -.->|Async replication| DBR1
    DBP -.->|Async replication| DBR2

    style CDN fill:#8b5cf6,stroke:#7c3aed,color:#fff
    style LB fill:#f59e0b,stroke:#d97706,color:#fff
    style Cache fill:#ef4444,stroke:#b91c1c,color:#fff
    style DBP fill:#10b981,stroke:#047857,color:#fff
    style DBR1 fill:#059669,stroke:#047857,color:#fff
    style DBR2 fill:#059669,stroke:#047857,color:#fff
```

**Each layer has a purpose:**

| Layer | Technology | Responsibility |
|-------|-----------|----------------|
| CDN | Cloudflare, CloudFront | Serve static assets globally, low latency |
| Load Balancer | Nginx, AWS ALB, HAProxy | Distribute traffic, health checks |
| App Servers | Node.js, Django, Spring | Business logic, request handling |
| Cache | Redis, Memcached | Fast reads, session storage, hot data |
| DB Primary | PostgreSQL, MySQL | All writes, source of truth |
| DB Replicas | Read replicas | Scale reads, reporting queries |

**This is roughly how:**
- Swiggy handles dinner rush (6-9 PM) orders
- Zomato handles IPL finale ordering spike
- BookMyShow handles movie ticket releases

### The Full Request Flow at Scale

```
User opens Swiggy app → 
  Static assets (logo, icons) from CDN (Mumbai edge) → 5ms
  GET /api/restaurants → Load Balancer → App Server 2
    → Redis: "Cache key for user_lat=19.0760,user_lng=72.8777 exists?" → MISS
    → DB Replica 1: SELECT restaurants WHERE city='mumbai' ORDER BY rating DESC LIMIT 20
    → Store result in Redis for 5 minutes
    → Return restaurant list → 45ms total
  
Next user with same location → Redis HIT → 8ms total
```

---

## 10. Why Separation of Concerns Scales

### Analogy: Factory Assembly Line vs. One Person Doing Everything

Ek insaan car banana — design, welding, painting, testing sab kuch. 1 car per month. Assembly line — har kaam alag insaan, alag station. 1000 cars per month.

**Separation of concerns = assembly line thinking.**

### Why Mixed Responsibilities Kill Scalability

```
Problem: Your app is slow. But WHY?

Mixed server (everything together):
❌ Can't tell if it's slow because of DB queries or CPU logic
❌ Can't add more RAM just for DB (app also needs it)
❌ Can't scale just the DB without scaling the whole thing
❌ Can't change the DB technology without touching the app code
```

### Why Separated Concerns Scale

```
Separated system:
✅ "DB reads are slow" → Add read replicas
✅ "Cache miss rate high" → Add Redis nodes
✅ "App CPU high" → Add more app server instances
✅ "Images loading slow" → CDN for static assets
✅ Each layer scales independently
✅ Can replace one layer without touching others
```

### The Principle in Practice

| Concern | Who Handles It | Why Separated |
|---------|---------------|---------------|
| Static file serving | CDN | Needs global edge, no compute |
| Session management | Redis | Needs fast memory, shared state |
| Business logic | App servers | Needs CPU, stateless |
| Persistent storage | DB (primary) | Needs reliable writes, ACID |
| Read performance | DB replicas + cache | Needs read throughput |
| Search | Elasticsearch | Needs inverted index specialization |
| Async jobs | Message queue + workers | Needs decoupling from request cycle |

> **Interview Tip**: Whenever asked "how to scale X", always start by identifying which concern is the bottleneck. Then separate that concern into its own dedicated layer.

---

## 11. Amazon's Story

### From a Garage in Seattle to the World's Biggest Tech Company

This is the most famous example of server architecture evolution. Samajh lo yeh story — it covers 20 years of system design lessons.

### 1994-1997: The Monolith

```mermaid
graph LR
    Users[Early Users] --> S[Single Server\nC / Perl code\nOracle DB\nAll-in-one]

    style S fill:#ef4444,stroke:#b91c1c,color:#fff
```

Jeff Bezos wrote the first version of Amazon on a single machine. Everything in one process. This was fine for a tiny bookstore.

### 1997-2000: Growing Pains

```
Problem: Book catalog grew. User base grew.
Single server couldn't handle it.

Solution: Separate web servers from DB
Web tier: Multiple web servers behind a load balancer
Data tier: Big Oracle database (very expensive)
```

But here's the critical learning: **The database became a political and technical bottleneck.** Every team needed DB access. Schema changes required coordination. One team's bad query could crash the whole thing.

### 2000-2002: The "Two-Pizza Team" Problem

Amazon's CTO Werner Vogels identified the real problem: **teams were too coupled.** The catalog team, the payments team, the recommendations team — all shared the same codebase and database. A bug in recommendations could take down the checkout.

### 2002: Bezos's Famous API Mandate

This is a real internal memo Jeff Bezos sent (paraphrased):

> 1. All teams will henceforth expose their data and functionality through service interfaces.
> 2. Teams must communicate with each other through these interfaces.
> 3. There will be no other form of interprocess communication allowed.
> 4. Any team that does not do this will be fired.

This forced Amazon from a monolith to **Service-Oriented Architecture (SOA)** — a precursor to microservices.

### 2002-2006: Service-Oriented Architecture

```mermaid
graph TD
    Users[Users] --> Frontend[Frontend Service]
    Frontend --> Catalog[Product Catalog Service]
    Frontend --> Cart[Shopping Cart Service]
    Frontend --> Recommendations[Recommendation Service]
    Frontend --> Payments[Payment Service]
    Frontend --> Shipping[Shipping Service]

    Catalog --> CatalogDB[(Catalog DB)]
    Cart --> CartDB[(Cart DB\nDynamoDB-precursor)]
    Recommendations --> RecDB[(Rec DB)]
    Payments --> PayDB[(Payment DB)]

    style Frontend fill:#3b82f6,stroke:#2563eb,color:#fff
    style Catalog fill:#8b5cf6,stroke:#7c3aed,color:#fff
    style Cart fill:#8b5cf6,stroke:#7c3aed,color:#fff
    style Recommendations fill:#8b5cf6,stroke:#7c3aed,color:#fff
```

Each service:
- Owned by a "two-pizza team" (small enough that 2 pizzas feed the team)
- Has its own database (no shared DB!)
- Exposed via internal APIs
- Deploys independently

### 2006: AWS is Born

While building all this internal infrastructure, Amazon realized: "We've built really good servers, databases, queuing systems. Other companies need this too."

AWS launched as a product — the side effect of Amazon solving its own scaling problems. S3, EC2, SQS — all built for Amazon first, then sold to the world.

### 2010-Present: Microservices at Extreme Scale

```
Amazon today:
- 100+ microservices for just the checkout flow
- Millions of requests per second during Prime Day
- Services written in different languages (Java, Go, Python, Rust)
- Each service scales independently
- A bug in one service doesn't crash others
```

### Key Lessons from Amazon's Journey

```
1. Start monolithic — don't over-engineer from day one
2. Separate what causes you pain first
3. Share NOTHING between services (especially databases)
4. Define clear API contracts between teams
5. The organizational structure mirrors the architecture (Conway's Law)
6. Build for failure — any service can and will fail
```

> **Interview Tip**: When asked about Amazon/Netflix/Uber architecture, always mention the journey from monolith to SOA to microservices. Interviewers love candidates who understand WHY, not just WHAT.

---

## 12. Browser Caching

### Analogy: The Smart Student's Notebook

Ek student har class mein wohi notes dobara likhta hai — waste of time. Smart student first time likhta hai, next class mein apni notebook dekhta hai. Agar notes change nahi hue toh copy nahi karta.

**Browser caching = smart student's notebook.** Don't download files you already have, unless they've changed.

### Why Browser Caching Matters

```
Without caching:
Every page load → download all JS (2MB), CSS (500KB), images (3MB)
Every user → 5.5MB download per page load
1 million users → 5.5TB of data transfer per day!
Slow for users, expensive for servers

With caching:
First load → download everything (5.5MB)
Next load → from cache (0 bytes downloaded)
1 million return users → 0 bytes transfer!
Fast for users, free for servers (from CDN savings)
```

### Cache-Control Header — The Master Control

This HTTP response header tells the browser what to do with the response.

```http
HTTP/1.1 200 OK
Content-Type: application/javascript
Cache-Control: public, max-age=31536000, immutable

[React bundle - 2MB of JS]
```

#### Cache-Control Directives

| Directive | Meaning |
|-----------|---------|
| `max-age=86400` | Cache for 86400 seconds (24 hours) |
| `public` | Can be cached by browser AND CDN/proxies |
| `private` | Only browser can cache (not CDN) — for user-specific data |
| `no-cache` | Store but validate with server before using |
| `no-store` | Don't cache AT ALL — sensitive data |
| `immutable` | Content won't change — skip revalidation (use with hashed filenames) |
| `s-maxage=3600` | CDN cache for 1 hour (overrides max-age for CDNs) |

#### Real-World Examples

```http
# Static assets with hashed filenames — cache forever
# app.a8f3c2d1.js (hash changes when code changes)
Cache-Control: public, max-age=31536000, immutable

# HTML pages — cache briefly, always revalidate
Cache-Control: public, max-age=60, must-revalidate

# API responses — usually don't cache
Cache-Control: no-store, private

# User dashboard — private, short cache
Cache-Control: private, max-age=300
```

### ETags — Conditional Requests

**Problem with max-age alone**: File is "cached" for 1 day, but what if the file changed after 5 minutes? User gets stale content.

**ETag** is a "fingerprint" (hash) of the file content. Server sends it. Browser stores it. Next time browser checks: "Is this file still fingerprint XYZ123?"

```mermaid
sequenceDiagram
    participant B as Browser
    participant S as Server

    B->>S: GET /style.css
    S-->>B: 200 OK\nETag: "abc123"\nCache-Control: max-age=86400\n[full CSS file - 50KB]

    Note over B: Browser caches CSS + ETag "abc123"
    Note over B: 24 hours later, cache expires

    B->>S: GET /style.css\nIf-None-Match: "abc123"
    S->>S: Check current ETag... still "abc123" (file unchanged)
    S-->>B: 304 Not Modified\n[no body - 0 bytes!]

    Note over B: Browser uses cached version

    B->>S: GET /style.css\nIf-None-Match: "abc123"
    S->>S: Check current ETag... now "xyz789" (file changed!)
    S-->>B: 200 OK\nETag: "xyz789"\n[new CSS file - 52KB]
```

### 304 Not Modified — The Bandwidth Saver

When server says 304:
- No response body is sent (0 bytes content)
- Browser uses its local cached copy
- You get fresh validation + fast loading
- Saves massive bandwidth

### Last-Modified — The Older Sibling

Alternative to ETag using timestamps:

```http
Response:
Last-Modified: Thu, 25 Jun 2026 10:00:00 GMT

Request (next time):
If-Modified-Since: Thu, 25 Jun 2026 10:00:00 GMT

Response (not changed):
304 Not Modified
```

ETag is more precise (content-based hash) vs Last-Modified (timestamp-based). Use ETags when possible.

### Hashed Filenames — The Best Pattern

The smartest caching strategy combines two ideas:
1. Cache static files FOREVER (`max-age=31536000, immutable`)
2. Change the filename when the file changes (content hash in filename)

```
app.js         → app.a8f3c2d1.js  (hash of content)
style.css      → style.b7d4e2a9.css

Cache-Control: public, max-age=31536000, immutable
```

When code changes:
- New build: `app.c91f3a7b.js` (different hash)
- Browser has no cache for this new filename
- Downloads fresh
- Old `app.a8f3c2d1.js` in cache → harmless, will eventually be evicted

This is exactly what Webpack, Vite, and Next.js do. That's why your bundle files have those weird hex strings in their names.

### Browser Cache Layers

```
Request comes in →
1. Memory Cache (fastest): in-browser RAM, lost on tab close
2. Disk Cache: stored on hard drive, persists between sessions
3. Service Worker Cache: controlled by JavaScript, works offline
4. HTTP Cache / CDN: network-level caching
5. Origin Server: the actual server (slowest)
```

> **Interview Tip**: If asked "how would you cache static assets", say: hash the filenames + Cache-Control: immutable for JS/CSS. Short max-age for HTML. ETags for dynamic content that might change.

---

## 13. Common Interview Questions

### Fundamentals

**Q1: Explain the client-server model.**

"The client-server model is an architecture where clients initiate requests and servers respond. The client is the consumer of data (browser, mobile app), while the server is the provider (backend running business logic and data storage). Communication happens via a request-response cycle, typically over HTTP. The key benefit is separation of concerns — the client handles presentation, the server handles data and logic."

---

**Q2: What is the difference between stateless and stateful servers?**

"A stateful server stores per-client session information between requests. A stateless server does not — each request must carry all information needed to process it (like a JWT token). Stateless servers are preferred for horizontal scaling because any server can handle any request — there's no session affinity. With stateful servers, you need sticky sessions or a shared session store, which adds complexity."

---

**Q3: HTTP is stateless. How do you maintain a user session?**

"Three main approaches:
1. **Cookies with server-side sessions**: Server creates a session record (Redis), gives client a session ID in a cookie. Cookie is sent automatically on every request.
2. **JWT tokens**: Server creates a signed token containing user data. Client stores token, sends it in Authorization header. Stateless — no server-side storage.
3. **Signed cookies**: Session data signed with server secret and stored in cookie. No server lookup needed."

---

**Q4: What is the difference between a cookie and a session?**

"A cookie is a small piece of data stored in the browser, sent with every request to the matching domain. A session is server-side storage holding user state. These work together: the server stores session data and sends only the session ID to the client in a cookie. The client sends the session ID back on every request, and the server looks up the full session."

---

**Q5: Explain httpOnly, Secure, and SameSite cookie flags.**

- "`httpOnly`: JavaScript cannot access the cookie via `document.cookie`. Prevents XSS attacks from stealing session IDs.
- `Secure`: Cookie only transmitted over HTTPS. Prevents interception over plain HTTP.
- `SameSite=Strict`: Cookie not sent in cross-site requests. Prevents CSRF attacks. `Lax` is more permissive — allows navigation from other sites. `None` allows all cross-site (needs Secure)."

---

**Q6: What is JWT and how is it different from sessions?**

"JWT (JSON Web Token) is a self-contained, signed token that encodes user claims in the payload. The server signs it with a secret key; any server with the key can verify it without a database lookup. Sessions require server-side storage (Redis) and a lookup per request. JWTs are stateless and scale better for APIs and microservices. However, JWTs cannot be immediately revoked before expiry without maintaining a blacklist."

---

**Q7: Why does session-based auth not scale horizontally?**

"If sessions are stored in App Server memory, user A's session is on Server 1. If the load balancer routes user A's next request to Server 2, Server 2 has no session for them — user gets logged out. Solutions: sticky sessions (but poor load distribution and fails on crash), centralized session store like Redis (shared across all servers), or switch to stateless JWT tokens."

---

**Q8: What is a CDN and when would you use it?**

"A CDN is a geographically distributed network of servers that cache and serve static content close to users. Use it for: images, videos, JavaScript bundles, CSS — anything that doesn't change per user. Benefits: lower latency (edge is close to user), reduced load on origin servers, automatic global distribution. I would use CDN for all static assets in any production system serving users in multiple geographies."

---

**Q9: How does browser caching work? Explain Cache-Control and ETags.**

"Cache-Control header tells browsers (and CDNs) how to cache a response. `max-age=86400` caches for 24 hours. `public` allows CDN caching. `no-store` disables all caching. ETags are content fingerprints — server sends ETag with response; browser sends `If-None-Match: ETag` on next request; if unchanged, server returns 304 Not Modified with no body, saving bandwidth. Best practice: use hashed filenames for JS/CSS with `max-age=31536000, immutable`; short max-age for HTML."

---

**Q10: Design how you'd handle 1 million concurrent users for an e-commerce app.**

"Start with separation of concerns:
1. CDN for all product images, JS, CSS
2. Load balancer distributing across multiple stateless app servers (no in-memory sessions)
3. Redis for session store and hot product/catalog data
4. PostgreSQL primary for all writes
5. Multiple read replicas for product browsing (mostly reads)
6. Separate services for search (Elasticsearch), payments (isolated service), notifications (async with queue)
7. Auto-scaling app servers based on CPU/request load
8. Database connection pooling (PgBouncer) to prevent DB connection exhaustion"

---

**Q11: What is the difference between 401 and 403 HTTP status codes?**

"401 Unauthorized means 'I don't know who you are' — the user is not authenticated (not logged in, bad token). 403 Forbidden means 'I know who you are, but you can't do this' — the user is authenticated but not authorized (trying to access another user's data or admin-only endpoint)."

---

**Q12: How would you implement a "remember me" feature?**

"When user checks 'remember me' on login:
1. Create a long-lived JWT (7-30 days) and a short-lived one (15 minutes)
2. Store long-lived token as HttpOnly, Secure cookie
3. Use short-lived token in memory for API calls
4. When short-lived token expires, use refresh token (long-lived) to get a new access token
5. This way, the actual access token is short-lived (limits damage from theft), but the user stays logged in via refresh token"

---

## 14. Key Takeaways

```
╔═══════════════════════════════════════════════════════════════╗
║                    KEY TAKEAWAYS                              ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  CLIENT-SERVER MODEL                                          ║
║  • Client initiates, server responds — always                 ║
║  • Clear separation: presentation vs data/logic               ║
║                                                               ║
║  REQUEST-RESPONSE CYCLE                                       ║
║  • DNS → TCP → TLS → HTTP Request → Process → HTTP Response  ║
║  • Each step adds latency — optimize each layer               ║
║                                                               ║
║  STATELESS IS KING                                            ║
║  • Stateless servers scale horizontally without friction      ║
║  • Any server can handle any request                          ║
║  • "Stateless server" ≠ "no state" — state lives in DB/cache ║
║                                                               ║
║  STATE MANAGEMENT TRIO                                        ║
║  • Cookies: browser-stored, auto-sent, flags = HttpOnly +     ║
║             Secure + SameSite                                 ║
║  • Sessions: server-side storage, shared via Redis            ║
║  • JWT: self-contained, signed, stateless, hard to revoke     ║
║                                                               ║
║  CDN ALWAYS                                                   ║
║  • Static assets: CDN (edge)                                  ║
║  • Dynamic APIs: origin servers                               ║
║  • CDN = lower latency + offload origin + global scale        ║
║                                                               ║
║  ARCHITECTURE EVOLUTION                                       ║
║  • Single server → separate DB → load balanced →              ║
║    CDN + cache + read replicas → microservices                ║
║  • Each step solves the bottleneck of the previous step       ║
║  • Don't over-architect early                                 ║
║                                                               ║
║  BROWSER CACHING                                              ║
║  • Cache-Control: public + max-age for statics               ║
║  • ETags for conditional requests → 304 Not Modified          ║
║  • Hash filenames + immutable = best caching strategy         ║
║                                                               ║
║  THE AMAZON LESSON                                            ║
║  • Start monolithic, then separate what hurts                 ║
║  • Shared database = coupling = scaling bottleneck            ║
║  • Small teams + clear APIs = independent scaling             ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

### Quick Reference Card

| Concept | One-Line Summary |
|---------|-----------------|
| Client-Server | Client asks, server answers. Always. |
| HTTP Request-Response | 7-step journey: DNS → TCP → TLS → Request → Process → Response → Render |
| Stateless Server | No memory between requests. Any server handles any request. |
| Cookie | Tiny data stored in browser, auto-sent with requests |
| Session | Server-side store, referenced by cookie ID |
| JWT | Signed token carrying user data, no server lookup needed |
| CDN | Global cache for static assets, close to users |
| Cache-Control | HTTP header telling browser/CDN how to cache |
| ETag | Content fingerprint for conditional requests |
| 304 Not Modified | "Your cache is still valid — use it" |
| Separation of Concerns | Each layer scales independently |

---

## Next Steps

- [Load Balancing](../07-load-balancing/README.md) — How traffic gets distributed across servers
- [Caching](../08-caching/README.md) — Deep dive into Redis, Memcached, cache invalidation
- [Databases](../05-databases/README.md) — Scaling databases with replicas and sharding
- [Authentication & Security](../auth/README.md) — JWT deep dive, OAuth, security patterns

---

*"The client-server model is not just a technical pattern — it's a philosophy of separation. Master this, and every distributed system you design will be built on a solid foundation."*
