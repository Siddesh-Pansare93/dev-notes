# Prisma Client Python

An async, auto-generated, fully type-safe database client for Python — bringing the Prisma developer experience you already know from Node.js/TypeScript directly into your Python backend projects.

## Table of Contents

### Part 1 — Core Concepts

| # | Topic | What It Covers |
|---|-------|----------------|
| 1 | [Setup & Installation](#1-setup--installation) | Project init, `prisma init`, generator config for Python |
| 2 | [Schema & Code Generation](#2-schema--code-generation) | `schema.prisma` syntax, `prisma-client-py` generator, migrations |
| 3 | [Connecting & Disconnecting](#3-connecting--disconnecting) | `Prisma()` client lifecycle, async context managers |
| 4 | [CRUD Operations](#4-crud-operations) | `create`, `find_unique`, `find_many`, `update`, `delete` |
| 5 | [Filtering & Sorting](#5-filtering--sorting) | `where` clauses, `order_by`, `take`, `skip`, cursor pagination |

### Part 2 — Relations & Advanced Queries

| # | Topic | What It Covers |
|---|-------|----------------|
| 6 | [Relations & Include](#6-relations--include) | One-to-many, many-to-many, nested `include` |
| 7 | [Nested Writes](#7-nested-writes) | `connect`, `create` inside mutations, upsert |
| 8 | [Transactions](#8-transactions) | Interactive `db.tx()`, batch operations, `create_many` |
| 9 | [Raw Queries](#9-raw-queries) | `query_raw`, `execute_raw` for escape-hatch SQL |

### Part 3 — FastAPI Integration

| # | Topic | What It Covers |
|---|-------|----------------|
| 10 | [FastAPI + Prisma Setup](#10-fastapi--prisma-setup) | Lifespan events, dependency injection, connection pooling |
| 11 | [Pydantic Model Integration](#11-pydantic-model-integration) | Auto-generated Pydantic models, `prisma.models`, partials |
| 12 | [Testing with Prisma](#12-testing-with-prisma) | `pytest-asyncio`, test DB setup, fixture teardown |

> See also: [`../12_prisma/README.md`](../12_prisma/README.md) — a companion reference with full code examples for the FastAPI + Prisma stack.

---

## Learning Path

### Beginner — Get the Client Running
1. [Setup & Installation](#1-setup--installation) — install `prisma[fastapi]`, run `prisma init`
2. [Schema & Code Generation](#2-schema--code-generation) — write your first `schema.prisma`, run `prisma generate`
3. [Connecting & Disconnecting](#3-connecting--disconnecting) — open and close the client correctly
4. [CRUD Operations](#4-crud-operations) — create, read, update, delete your first records

### Intermediate — Query Like a Pro
5. [Filtering & Sorting](#5-filtering--sorting) — build `where` clauses, paginate results
6. [Relations & Include](#6-relations--include) — query across relationships without N+1 problems
7. [Nested Writes](#7-nested-writes) — create related records in a single mutation
8. [Transactions](#8-transactions) — keep multi-step operations atomic

### Advanced — Production Ready
9. [Raw Queries](#9-raw-queries) — reach for SQL when the ORM isn't enough
10. [FastAPI + Prisma Setup](#10-fastapi--prisma-setup) — wire up the client with proper lifecycle management
11. [Pydantic Model Integration](#11-pydantic-model-integration) — use auto-generated models to eliminate duplication
12. [Testing with Prisma](#12-testing-with-prisma) — async test fixtures that clean up after themselves

---

## What You'll Learn

- How to configure `schema.prisma` with the `prisma-client-py` generator for async Python
- Running migrations with `prisma migrate dev` and regenerating the Python client after schema changes
- Writing fully async database operations using `await db.model.create(...)` syntax
- Building type-safe queries with `where`, `include`, `order_by`, `take`, and `skip`
- Handling one-to-many and many-to-many relations via nested `include` and nested writes
- Using `db.tx()` for interactive transactions and `create_many` for bulk inserts
- Wiring the Prisma client into FastAPI using lifespan events and dependency injection
- Leveraging auto-generated Pydantic models (`prisma.models`) as FastAPI response models
- Writing `pytest-asyncio` tests with setup/teardown fixtures against a real or in-memory database
- Mapping your existing Prisma (TypeScript) knowledge directly onto the Python client API

---

## Prerequisites

- **Python async/await** — comfortable with `async def`, `await`, and `asyncio` basics (see [`../03_advanced_python/05_async_await.md`](../03_advanced_python/05_async_await.md))
- **FastAPI fundamentals** — routing, request/response models, and startup/shutdown events (see [`../06_fastapi/`](../06_fastapi/))
- **Pydantic basics** — `BaseModel`, field types, `model_dump()` (see [`../05_pydantic/`](../05_pydantic/))
- **Prisma schema familiarity** — if you've used Prisma with TypeScript/Node.js before, this section will feel immediately comfortable; if not, skim the [official Prisma schema docs](https://www.prisma.io/docs/concepts/components/prisma-schema) first
- **PostgreSQL or SQLite** — a running database or willingness to use SQLite for local development

---

## How to Use This Guide

1. **Follow the learning path in order.** The beginner track (topics 1–4) must be done before jumping into relations or transactions — the generator setup and client lifecycle concepts underpin everything else.
2. **Run every code snippet.** Prisma Client Python relies on code generation; seeing it fail and succeed is how you learn what `prisma generate` actually produces.
3. **Start with SQLite, switch to PostgreSQL.** Use `provider = "sqlite"` locally so you can skip Docker setup. When you're comfortable, switch the `datasource` block to `"postgresql"` — the Python client API stays identical.
4. **Read the generated code.** After `prisma generate`, look inside the generated `prisma/` package. Understanding what was created demystifies type errors and makes debugging much faster.
5. **Cross-reference with the TypeScript Prisma docs.** The query API is nearly identical to the TypeScript client — `findUnique`, `create`, `update`, `delete` map 1:1 (camelCase → snake_case). When in doubt, check the official docs and translate.

---

## 1. Setup & Installation

```bash
# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install Prisma Client Python with FastAPI extras
pip install "prisma[fastapi]" fastapi uvicorn

# Initialize a Prisma project (creates prisma/schema.prisma and .env)
prisma init
```

---

## 2. Schema & Code Generation

Set the generator to `prisma-client-py` in `prisma/schema.prisma`:

```prisma
generator client {
  provider             = "prisma-client-py"
  recursive_type_depth = 5
  interface            = "asyncio"
}

datasource db {
  provider = "sqlite"       // or "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
  posts Post[]
}

model Post {
  id        Int     @id @default(autoincrement())
  title     String
  content   String?
  published Boolean @default(false)
  author    User    @relation(fields: [authorId], references: [id])
  authorId  Int
}
```

```bash
# Create the database and apply the schema
prisma migrate dev --name init

# Generate the Python client (re-run after every schema change)
prisma generate
```

**Node.js comparison:** The `generator` block is the only difference from Prisma in TypeScript — everything else (`model`, `@relation`, `@id`, etc.) is identical.

---

## 3. Connecting & Disconnecting

```python
from prisma import Prisma

db = Prisma()

async def main():
    await db.connect()
    # ... run queries ...
    await db.disconnect()

# Or use the async context manager
async def main():
    async with Prisma() as db:
        user = await db.user.find_many()
```

In FastAPI, prefer the lifespan pattern:

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from prisma import Prisma

db = Prisma()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.connect()
    yield
    await db.disconnect()

app = FastAPI(lifespan=lifespan)
```

---

## 4. CRUD Operations

```python
# Create
user = await db.user.create(data={"email": "ada@example.com", "name": "Ada"})

# Read one
user = await db.user.find_unique(where={"id": 1})
user = await db.user.find_unique(where={"email": "ada@example.com"})

# Read many
users = await db.user.find_many()

# Update
updated = await db.user.update(where={"id": 1}, data={"name": "Ada Lovelace"})

# Delete
deleted = await db.user.delete(where={"id": 1})

# Upsert (create or update)
user = await db.user.upsert(
    where={"email": "ada@example.com"},
    data={"create": {"email": "ada@example.com", "name": "Ada"}, "update": {"name": "Ada Lovelace"}},
)
```

**Node.js comparison:** `findUnique` → `find_unique`, `findMany` → `find_many`. Same shape, snake_case naming.

---

## 5. Filtering & Sorting

```python
# Filtering with where
posts = await db.post.find_many(
    where={"published": True, "author": {"is": {"name": "Ada"}}}
)

# String contains (case-insensitive)
results = await db.user.find_many(where={"name": {"contains": "ada", "mode": "insensitive"}})

# Sorting
users = await db.user.find_many(order={"name": "asc"})

# Pagination: skip + take (equivalent to OFFSET + LIMIT)
page2 = await db.post.find_many(skip=10, take=10, order={"id": "asc"})
```

---

## 6. Relations & Include

```python
# Include related records (JOIN equivalent)
user = await db.user.find_unique(
    where={"id": 1},
    include={"posts": True},
)
# user.posts is now a list of Post objects

# Nested include
user = await db.user.find_unique(
    where={"id": 1},
    include={"posts": {"include": {"tags": True}}},
)
```

**Tip:** Only `include` what you actually need — each `include` translates to a JOIN that grows the payload.

---

## 7. Nested Writes

```python
# Create a user with a post in one operation
user = await db.user.create(
    data={
        "email": "ada@example.com",
        "name": "Ada",
        "posts": {
            "create": [{"title": "First post", "published": True}]
        },
    }
)

# Connect an existing post to a user
post = await db.post.update(
    where={"id": 5},
    data={"author": {"connect": {"id": 1}}},
)
```

---

## 8. Transactions

```python
# Interactive transaction — all-or-nothing
async def transfer(from_id: int, to_id: int, amount: int):
    async with db.tx() as transaction:
        await transaction.account.update(where={"id": from_id}, data={"balance": {"decrement": amount}})
        await transaction.account.update(where={"id": to_id}, data={"balance": {"increment": amount}})

# Bulk insert (much faster than looping create())
await db.user.create_many(
    data=[{"email": f"user{i}@example.com", "name": f"User {i}"} for i in range(100)]
)
```

---

## 9. Raw Queries

```python
# Query raw — returns a list of dicts
results = await db.query_raw("SELECT * FROM users WHERE email LIKE $1", "%@example.com")

# Execute raw — returns affected row count
count = await db.execute_raw("UPDATE posts SET published = true WHERE author_id = $1", 1)
```

Use raw queries only when the ORM cannot express what you need — migrations and schema changes won't track raw SQL.

---

## 10. FastAPI + Prisma Setup

```python
# main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends
from prisma import Prisma

db = Prisma()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.connect()
    yield
    await db.disconnect()

app = FastAPI(lifespan=lifespan)

# Dependency for route handlers
async def get_db() -> Prisma:
    return db

@app.get("/users/{user_id}")
async def get_user(user_id: int, prisma: Prisma = Depends(get_db)):
    user = await prisma.user.find_unique(where={"id": user_id}, include={"posts": True})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
```

---

## 11. Pydantic Model Integration

`prisma generate` auto-generates Pydantic models for every model in your schema. Use them directly instead of duplicating model definitions:

```python
from prisma.models import User, Post

# Use as FastAPI response_model — no extra Pydantic class needed
@app.get("/users", response_model=list[User])
async def list_users(prisma: Prisma = Depends(get_db)):
    return await prisma.user.find_many()

@app.get("/users/{user_id}", response_model=User)
async def get_user(user_id: int, prisma: Prisma = Depends(get_db)):
    user = await prisma.user.find_unique(where={"id": user_id}, include={"posts": True})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
```

---

## 12. Testing with Prisma

```python
# test_users.py
import pytest
from httpx import AsyncClient
from main import app, db

@pytest.fixture(autouse=True, scope="module")
async def setup_db():
    await db.connect()
    await db.post.delete_many()   # clear dependents first
    await db.user.delete_many()
    yield
    await db.disconnect()

@pytest.mark.asyncio
async def test_create_and_fetch_user():
    async with AsyncClient(app=app, base_url="http://test") as client:
        resp = await client.post("/users/", json={"email": "test@example.com", "name": "Tester"})
        assert resp.status_code == 200
        user_id = resp.json()["id"]

        resp = await client.get(f"/users/{user_id}")
        assert resp.status_code == 200
        assert resp.json()["email"] == "test@example.com"
```

**Tip:** Point `DATABASE_URL` at a separate test SQLite file or a dedicated PostgreSQL test database so your development data is never touched.

---

Happy querying — Prisma Client Python gives you the same great developer experience you had in TypeScript, now fully async and native to your Python backend.
