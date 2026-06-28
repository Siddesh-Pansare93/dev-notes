# REST APIs and Web Services

APIs (Application Programming Interfaces) allow software systems to communicate over a network. REST is the dominant architectural style for web APIs. This tutorial covers REST principles, practical API design, authentication mechanisms, and alternative approaches like GraphQL and gRPC.

---

## What You'll Learn

- What a web service is and why APIs matter
- REST architectural principles and constraints
- RESTful API design: resources, methods, status codes
- Request/response examples with JSON
- Authentication strategies: API keys, OAuth 2.0, JWT
- API versioning approaches
- GraphQL vs REST comparison
- gRPC overview
- Practical API usage with curl and Postman

---

## 1. What Is a Web Service

A web service exposes functionality over HTTP so that other software can use it programmatically — not just humans with browsers.

```
Traditional Website:              Web Service / API:

  Human ──browser──> Server        Software ──HTTP──> Server
  Server ──HTML───> Human          Server ──JSON───> Software

  Consumed by eyes                 Consumed by code
```

**Types of web services:**

| Type | Protocol | Format | Style |
|------|----------|--------|-------|
| REST | HTTP | JSON (usually) | Architectural style |
| SOAP | HTTP/SMTP | XML | Formal protocol (WSDL) |
| GraphQL | HTTP | JSON | Query language |
| gRPC | HTTP/2 | Protocol Buffers | RPC framework |

---

## 2. REST Architecture Principles

REST (Representational State Transfer) was defined by Roy Fielding in his 2000 dissertation. It is a set of **constraints**, not a protocol.

| Constraint | Meaning |
|------------|---------|
| **Client-Server** | Separation of concerns — client handles UI, server handles data |
| **Stateless** | Each request contains all information needed; server stores no session state |
| **Cacheable** | Responses must declare whether they can be cached |
| **Uniform Interface** | Consistent way to interact with resources (URLs, methods, representations) |
| **Layered System** | Client cannot tell if it's connected to the end server or an intermediary |
| **Code on Demand** (optional) | Server can send executable code (e.g., JavaScript) |

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server

    C->>S: GET /api/users/42
    Note right of C: I want user 42's representation
    S-->>C: 200 OK {"id": 42, "name": "Alice"}
    Note left of S: Here is the current state
    Note over C,S: No session stored on server.<br/>Next request must be self-contained.
```

```
  REST Interaction Model:

  Client                                   Server
    │                                         │
    │── GET /api/users/42 ──────────────────>│
    │   (I want user 42's representation)    │
    │                                         │
    │<── 200 OK ─────────────────────────────│
    │   {"id": 42, "name": "Alice"}          │
    │   (Here is the current state)          │
    │                                         │
    │   No session stored on server.          │
    │   Next request must be self-contained.  │
```

---

## 3. RESTful API Design

### Resources and URLs

Resources are the core abstraction. Each resource has a unique URL.

```
  Resource Design:

  /users              → Collection of users
  /users/42           → Specific user (id=42)
  /users/42/orders    → Orders belonging to user 42
  /users/42/orders/7  → Specific order of user 42
```

**URL design rules:**
- Use **nouns**, not verbs: `/users` not `/getUsers`
- Use **plural** for collections: `/users` not `/user`
- Use **path hierarchy** for relationships: `/users/42/orders`
- Use **query parameters** for filtering: `/users?role=admin&sort=name`

### HTTP Methods Mapping

| Method | CRUD Operation | URL Example | Description |
|--------|---------------|-------------|-------------|
| GET | Read | `GET /users` | List all users |
| GET | Read | `GET /users/42` | Get user 42 |
| POST | Create | `POST /users` | Create a new user |
| PUT | Update (full) | `PUT /users/42` | Replace user 42 entirely |
| PATCH | Update (partial) | `PATCH /users/42` | Update specific fields |
| DELETE | Delete | `DELETE /users/42` | Delete user 42 |

### Status Codes for APIs

| Code | Meaning | When to Use |
|------|---------|-------------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST (resource created) |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid request body or parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Authenticated but not authorized |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Conflicting state (e.g., duplicate) |
| 422 | Unprocessable Entity | Validation error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side failure |

---

## 4. Request/Response Examples

### Create a User (POST)

```bash
curl -X POST https://api.example.com/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOi..." \
  -d '{
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "role": "developer"
  }'
```

**Response (201 Created):**

```json
{
  "id": 42,
  "name": "Alice Johnson",
  "email": "alice@example.com",
  "role": "developer",
  "created_at": "2026-02-10T09:30:00Z",
  "links": {
    "self": "/api/users/42",
    "orders": "/api/users/42/orders"
  }
}
```

### List Users with Pagination (GET)

```bash
curl "https://api.example.com/users?page=2&limit=10&sort=name"
```

**Response (200 OK):**

```json
{
  "data": [
    {"id": 11, "name": "Alice", "email": "alice@example.com"},
    {"id": 12, "name": "Bob", "email": "bob@example.com"}
  ],
  "pagination": {
    "page": 2,
    "limit": 10,
    "total": 47,
    "pages": 5
  }
}
```

### Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": [
      {"field": "email", "message": "must be a valid email address"},
      {"field": "name", "message": "is required"}
    ]
  }
}
```

---

## 5. Authentication

### API Keys

Simplest method — a static key sent in a header or query parameter.

```bash
# In header (preferred)
curl -H "X-API-Key: abc123def456" https://api.example.com/data

# In query parameter (less secure — visible in logs)
curl "https://api.example.com/data?api_key=abc123def456"
```

### JWT (JSON Web Tokens)

Self-contained tokens with encoded claims.

```
JWT Structure:
┌──────────────────────────────────────────────────┐
│  Header          Payload           Signature     │
│  (algorithm)     (claims)          (verification)│
│                                                  │
│  eyJhbGciOi...  .eyJzdWIiOi...  .SflKxwRJSMe... │
│  (base64url)     (base64url)     (base64url)     │
└──────────────────────────────────────────────────┘

Payload example (decoded):
{
  "sub": "user_42",
  "name": "Alice",
  "role": "admin",
  "iat": 1707552600,
  "exp": 1707556200
}
```

```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  https://api.example.com/protected
```

### OAuth 2.0 Flow (Authorization Code)

```mermaid
sequenceDiagram
    participant U as User
    participant CA as Client App
    participant AS as Auth Server
    participant RS as Resource Server

    U->>CA: "Login"
    CA->>AS: Redirect to login
    AS-->>U: Login page
    U->>AS: Credentials
    AS-->>U: Auth code + redirect
    U->>CA: Auth code
    CA->>AS: Code + client secret
    AS-->>CA: Access token
    CA->>RS: GET /api + token
    RS-->>CA: Protected data
    CA-->>U: Data
```

```
  User          Client App        Auth Server      Resource Server
   │                │                  │                  │
   │── "Login" ────>│                  │                  │
   │                │── Redirect ─────>│                  │
   │<── Login page ─────────────────── │                  │
   │── credentials ────────────────── >│                  │
   │<── auth code + redirect ─────────│                  │
   │── auth code ──>│                  │                  │
   │                │── code + secret >│                  │
   │                │<── access token ─│                  │
   │                │── GET /api + token ───────────────>│
   │                │<── protected data ─────────────────│
   │<── data ───────│                  │                  │
```

| Auth Method | Best For | Security Level |
|-------------|----------|---------------|
| API Key | Server-to-server, simple integrations | Low-Medium |
| JWT | Stateless auth, microservices | Medium-High |
| OAuth 2.0 | Third-party access, user delegation | High |
| mTLS | Service mesh, zero-trust | Very High |

---

## 6. API Versioning

| Strategy | URL Example | Pros | Cons |
|----------|-------------|------|------|
| URL path | `/v1/users` | Clear, easy to route | Pollutes URLs |
| Query param | `/users?version=1` | Keeps URLs clean | Easy to miss |
| Header | `Accept: application/vnd.api.v1+json` | Clean URLs, RESTful | Less discoverable |
| No versioning | `/users` (evolve carefully) | Simple | Risky with breaking changes |

```bash
# URL versioning (most common)
curl https://api.example.com/v2/users

# Header versioning
curl -H "Accept: application/vnd.example.v2+json" \
  https://api.example.com/users
```

---

## 7. GraphQL vs REST

```
REST: Multiple endpoints, server decides shape

  GET /users/42          → { id, name, email, address, ... }
  GET /users/42/orders   → [ { id, total, items, ... } ]
  GET /users/42/friends  → [ { id, name, ... } ]

  Three requests. Server returns everything (over-fetching).

GraphQL: Single endpoint, client decides shape

  POST /graphql
  {
    user(id: 42) {
      name
      orders { total }
      friends { name }
    }
  }

  One request. Client gets exactly what it asked for.
```

| Feature | REST | GraphQL |
|---------|------|---------|
| Endpoints | Multiple (`/users`, `/orders`) | Single (`/graphql`) |
| Data fetching | Fixed structure (over/under-fetching) | Client specifies exact fields |
| Caching | Easy (HTTP caching per URL) | Complex (single endpoint) |
| Learning curve | Low | Medium |
| File upload | Native (multipart) | Requires workarounds |
| Real-time | Needs WebSocket/SSE separately | Built-in subscriptions |
| Tooling | curl, any HTTP client | Specialized clients (Apollo, Relay) |
| Best for | CRUD APIs, simple resources | Complex data graphs, mobile apps |

### GraphQL Example

```graphql
# Query
query {
  user(id: 42) {
    name
    email
    orders(last: 5) {
      id
      total
      items {
        product { name }
        quantity
      }
    }
  }
}
```

```bash
curl -X POST https://api.example.com/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ user(id: 42) { name email } }"}'
```

---

## 8. gRPC Overview

gRPC is a high-performance RPC framework using HTTP/2 and Protocol Buffers.

```
REST (JSON over HTTP/1.1):          gRPC (Protobuf over HTTP/2):
┌────────────────────┐              ┌────────────────────┐
│ Text-based JSON    │              │ Binary Protobuf    │
│ Human-readable     │              │ Machine-optimized  │
│ ~100 bytes/msg     │              │ ~20 bytes/msg      │
│ Request-response   │              │ Streaming support  │
└────────────────────┘              └────────────────────┘
```

**gRPC Protocol Buffer definition:**

```protobuf
syntax = "proto3";

service UserService {
  rpc GetUser (UserRequest) returns (User);
  rpc ListUsers (ListRequest) returns (stream User);  // server streaming
}

message UserRequest {
  int32 id = 1;
}

message User {
  int32 id = 1;
  string name = 2;
  string email = 3;
}
```

| Feature | REST | gRPC |
|---------|------|------|
| Protocol | HTTP/1.1 or 2 | HTTP/2 |
| Format | JSON (text) | Protocol Buffers (binary) |
| Performance | Good | Excellent |
| Streaming | Limited | Bidirectional streaming |
| Browser support | Native | Requires gRPC-Web proxy |
| Code generation | Optional (OpenAPI) | Required (from .proto files) |
| Best for | Public APIs, web apps | Microservices, internal APIs |

---

## 9. Practical API Testing

### curl Examples

```bash
# GET with headers
curl -s https://api.example.com/users | python -m json.tool

# POST with JSON body
curl -X POST https://api.example.com/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"name": "Alice"}' \
  -w "\nHTTP Status: %{http_code}\n"

# PUT (full update)
curl -X PUT https://api.example.com/users/42 \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice Updated", "email": "alice@new.com"}'

# PATCH (partial update)
curl -X PATCH https://api.example.com/users/42 \
  -H "Content-Type: application/json" \
  -d '{"email": "newemail@example.com"}'

# DELETE
curl -X DELETE https://api.example.com/users/42 \
  -w "HTTP Status: %{http_code}\n"

# Upload a file
curl -X POST https://api.example.com/upload \
  -F "file=@report.pdf" \
  -F "description=Monthly report"

# Follow redirects and show headers
curl -L -v https://api.example.com/resource
```

### Postman Workflow

```
1. Create a Collection (group of related requests)
2. Set up Environment Variables:
   - {{base_url}} = https://api.example.com
   - {{token}} = your_bearer_token

3. Create Requests:
   - GET {{base_url}}/users
   - POST {{base_url}}/users  (Body tab → raw → JSON)
   - Authorization tab → Bearer Token → {{token}}

4. Write Tests (JavaScript):
   pm.test("Status is 200", function () {
     pm.response.to.have.status(200);
   });
   pm.test("Response has users", function () {
     var json = pm.response.json();
     pm.expect(json.data).to.be.an('array');
   });

5. Run Collection (automated testing of all endpoints)
```

---

## Exercises

### Beginner
1. Explain the six REST constraints in your own words. Which one do you think is most important and why?
2. Design the URL structure for a blog API with these resources: posts, comments, tags, and authors. Include endpoints for listing, creating, reading, updating, and deleting each.
3. Use `curl` to make a GET request to a public API (e.g., `https://jsonplaceholder.typicode.com/posts/1`) and identify the status code, headers, and body.

### Intermediate
4. Design a RESTful API for a library system. Define endpoints, methods, request/response bodies, and status codes for: books, members, and borrowing records.
5. Explain the differences between API key, JWT, and OAuth 2.0 authentication. For each, give a scenario where it is the best choice.
6. Using curl, interact with the JSONPlaceholder API: create a post (POST), update it (PUT), partially update it (PATCH), and delete it (DELETE).

### Advanced
7. Build a simple REST API in Python (Flask or FastAPI) or Node.js (Express) with CRUD operations for a `tasks` resource. Include input validation and proper error responses.
8. Compare the performance of a REST API vs a GraphQL API for a mobile app that displays a user profile with their 5 most recent orders and 10 friends. Calculate the number of requests and approximate data transferred for each approach.
9. Design a versioning strategy for an API that must maintain backward compatibility for 2 years while releasing breaking changes quarterly. Include migration paths for existing clients.

---

## Key Takeaways

- REST is an architectural style with constraints: stateless, uniform interface, cacheable, client-server, layered.
- Use HTTP methods semantically: GET for reads, POST for creation, PUT/PATCH for updates, DELETE for removal.
- Status codes communicate outcomes — use them correctly and consistently.
- JWT is the standard for stateless API authentication; OAuth 2.0 for delegated authorization.
- GraphQL solves over-fetching and under-fetching but adds complexity; gRPC excels for internal services.
- Good API design uses nouns for resources, plural names, proper pagination, and consistent error formats.

---

## Navigation

- **Previous**: [WebSockets and Real-time Communication](./06_websockets.md)
- **Next**: [Network Performance and Optimization](./08_performance_optimization.md)
- **Section Home**: [Application Layer](./README.md)
