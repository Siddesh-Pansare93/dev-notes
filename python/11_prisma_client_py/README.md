# Prisma Client Python

Socho — Node.js/TypeScript mein Prisma se har kaam karte ho na? Wahi magic ab Python mein bhi aa gaya, bilkul async, fully type-safe, aur auto-generated. Tera TypeScript wala experience wahi rahega, bas Python ke async syntax mein.

## Table of Contents

### Part 1 — Core Concepts

| # | Topic | Kya Sikhoge |
|---|-------|------------|
| 1 | [Setup & Installation](#1-setup--installation) | Project setup, `prisma init`, Python ke liye config |
| 2 | [Schema & Code Generation](#2-schema--code-generation) | `schema.prisma` likho, `prisma-client-py` generator chalaao, migrations |
| 3 | [Connecting & Disconnecting](#3-connecting--disconnecting) | `Prisma()` client ka lifecycle, async context managers |
| 4 | [CRUD Operations](#4-crud-operations) | `create`, `find_unique`, `find_many`, `update`, `delete` करो |
| 5 | [Filtering & Sorting](#5-filtering--sorting) | `where` clauses, `order_by`, pagination |

### Part 2 — Relations & Advanced Queries

| # | Topic | Kya Sikhoge |
|---|-------|------------|
| 6 | [Relations & Include](#6-relations--include) | One-to-many, many-to-many, nested `include` |
| 7 | [Nested Writes](#7-nested-writes) | `connect`, `create` एक साथ, upsert operations |
| 8 | [Transactions](#8-transactions) | Interactive `db.tx()`, bulk operations, atomicity |
| 9 | [Raw Queries](#9-raw-queries) | `query_raw`, `execute_raw` — जब ORM काफी न हो |

### Part 3 — FastAPI Integration

| # | Topic | Kya Sikhoge |
|---|-------|------------|
| 10 | [FastAPI + Prisma Setup](#10-fastapi--prisma-setup) | Lifespan events, dependency injection, connection pooling |
| 11 | [Pydantic Model Integration](#11-pydantic-model-integration) | Auto-generated Pydantic models, `prisma.models` |
| 12 | [Testing with Prisma](#12-testing-with-prisma) | `pytest-asyncio`, test database setup |

> Dekho aur bhi: [`../12_prisma/README.md`](../12_prisma/README.md) — FastAPI + Prisma stack ka complete reference hai

---

## Learning Path

### Beginner — Basics Seekh Lo Pehle
1. [Setup & Installation](#1-setup--installation) — `prisma[fastapi]` install karo, `prisma init` chalaao
2. [Schema & Code Generation](#2-schema--code-generation) — apna pehla `schema.prisma` likho, `prisma generate` करो
3. [Connecting & Disconnecting](#3-connecting--disconnecting) — client ko sahi se open/close karna seekh lo
4. [CRUD Operations](#4-crud-operations) — create, read, update, delete — ये चारों करो

### Intermediate — Pro Bann Jaao Ab
5. [Filtering & Sorting](#5-filtering--sorting) — `where` clauses banao, results ko paginate karo
6. [Relations & Include](#6-relations--include) — relationships across tables, N+1 problems se bachaao
7. [Nested Writes](#7-nested-writes) — ek ही operation mein multiple related records banao
8. [Transactions](#8-transactions) — multiple steps ko atomic rakhो, sab hona ya kuch bhi na hona

### Advanced — Production Ready
9. [Raw Queries](#9-raw-queries) — जब ORM काफी न हो तो pure SQL लिखो
10. [FastAPI + Prisma Setup](#10-fastapi--prisma-setup) — proper lifecycle management ke साथ wire up करो
11. [Pydantic Model Integration](#11-pydantic-model-integration) — auto-generated models को leverage कro
12. [Testing with Prisma](#12-testing-with-prisma) — async tests likho जो cleanup भी करें

---

## Kya Seekhoge?

- `schema.prisma` को `prisma-client-py` generator के साथ configure कarna
- `prisma migrate dev` और `prisma generate` से database updates handle करना
- Fully async database operations — `await db.model.create(...)` style
- Type-safe queries with `where`, `include`, `order_by`
- One-to-many और many-to-many relations को nested includes और writes से handle करना
- `db.tx()` से interactive transactions, `create_many` से bulk inserts
- FastAPI में Prisma client को lifespan events से wire up करना
- Auto-generated Pydantic models को response_model के रूप में use करना
- `pytest-asyncio` से proper async tests likho
- अपना TypeScript Prisma knowledge सीधे Python API मे transfer कro

---

## Pehle Kya Janna Chahiye?

- **Python async/await** — `async def`, `await`, `asyncio` का comfort level (देखो [`../03_advanced_python/05_async_await.md`](../03_advanced_python/05_async_await.md))
- **FastAPI fundamentals** — routing, request/response models, startup/shutdown events (देखो [`../06_fastapi/`](../06_fastapi/))
- **Pydantic basics** — `BaseModel`, field types, `model_dump()` (देखो [`../05_pydantic/`](../05_pydantic/))
- **Prisma schema familiarity** — अगर TypeScript/Node.js से Prisma use कर चुके हो तो सब familiar लगेगा; नहीं तो [official Prisma schema docs](https://www.prisma.io/docs/concepts/components/prisma-schema) skim कर लो
- **PostgreSQL या SQLite** — कोई database ready रख, या local dev के लिए SQLite use कर

---

## इस Guide को कैसे Use करें?

1. **Learning path को order में follow करो।** Beginner track (1–4) को पहले पूरा कर, फिर relations और transactions में जाना — generator setup सब कुछ का foundation है
2. **हर code snippet को run कर।** Prisma Client Python code generation पर निर्भर करता है; fail और success दोनों को देखना जरूरी है
3. **SQLite से शुरू कर, फिर PostgreSQL में जाना।** Development मे `provider = "sqlite"` use कर, Docker skip कर। जब comfortable हो जाए तो PostgreSQL पर switch कर
4. **Generated code को read कर।** `prisma generate` के बाद generated `prisma/` package को खुद open करके देख। समझ आ जाए तो type errors और debugging आसान हो जाता है
5. **TypeScript Prisma docs से compare कर।** Query API almost same है — `findUnique`, `create`, `update`, `delete` directly map होते हैं (camelCase → snake_case)। Doubt में official docs में देख और translate कर

---

## 1. Setup & Installation

```bash
# Virtual environment बना और activate कर
python -m venv venv
source venv/bin/activate  # Windows पे: venv\Scripts\activate

# Prisma Client Python + FastAPI के साथ install कर
pip install "prisma[fastapi]" fastapi uvicorn

# Prisma project initialize कर (prisma/schema.prisma और .env बनेगी)
prisma init
```

---

## 2. Schema & Code Generation

`prisma/schema.prisma` मे generator को `prisma-client-py` पर set कर:

```prisma
generator client {
  provider             = "prisma-client-py"
  recursive_type_depth = 5
  interface            = "asyncio"
}

datasource db {
  provider = "sqlite"       // या "postgresql"
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
# Database बना और schema apply कर
prisma migrate dev --name init

# Python client generate कर (हर schema change के बाद फिर से चलाना)
prisma generate
```

**TypeScript से comparison:** Generator block `prisma-client-py` ke लिए अलग है, बाकी सब (`model`, `@relation`, `@id`, वगैरह) exactly same है।

---

## 3. Connecting & Disconnecting

```python
from prisma import Prisma

db = Prisma()

async def main():
    await db.connect()
    # ... queries यहाँ करो ...
    await db.disconnect()

# या async context manager use कर (ज्यादा clean)
async def main():
    async with Prisma() as db:
        user = await db.user.find_many()
```

FastAPI मे lifespan pattern prefer करo:

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
# Create — नया record बना
user = await db.user.create(data={"email": "ada@example.com", "name": "Ada"})

# Read one — एक record खोज
user = await db.user.find_unique(where={"id": 1})
user = await db.user.find_unique(where={"email": "ada@example.com"})

# Read many — सब records ला
users = await db.user.find_many()

# Update — record को change कर
updated = await db.user.update(where={"id": 1}, data={"name": "Ada Lovelace"})

# Delete — record हटा दे
deleted = await db.user.delete(where={"id": 1})

# Upsert — अगर पहले से है तो update कर, नहीं तो create कर
user = await db.user.upsert(
    where={"email": "ada@example.com"},
    data={"create": {"email": "ada@example.com", "name": "Ada"}, "update": {"name": "Ada Lovelace"}},
)
```

**TypeScript से comparison:** `findUnique` → `find_unique`, `findMany` → `find_many`. Same logic, snake_case naming है।

---

## 5. Filtering & Sorting

```python
# Filter कर — जैसे restaurant को Zomato पे city और rating से filter करते हो
posts = await db.post.find_many(
    where={"published": True, "author": {"is": {"name": "Ada"}}}
)

# String search — case-insensitive (जैसे restaurant का नाम ढूंढ रहे हो)
results = await db.user.find_many(where={"name": {"contains": "ada", "mode": "insensitive"}})

# Sorting — order दे
users = await db.user.find_many(order={"name": "asc"})

# Pagination — OFFSET + LIMIT की जैसे (Swiggy पे अगले page देखने जैसा)
page2 = await db.post.find_many(skip=10, take=10, order={"id": "asc"})
```

---

## 6. Relations & Include

```python
# Related records को include कर (JOIN जैसा)
user = await db.user.find_unique(
    where={"id": 1},
    include={"posts": True},
)
# अब user.posts एक list है Post objects का

# Nested include — deeper level तक जाना (जैसे restaurant → dishes → ingredients)
user = await db.user.find_unique(
    where={"id": 1},
    include={"posts": {"include": {"tags": True}}},
)
```

**Tip:** सिर्फ वही include कर जो actually चाहिए — हर include एक JOIN है जो payload को बड़ा करता है।

---

## 7. Nested Writes

```python
# एक user बना और साथ ही एक post भी बना — एक operation मे (Zomato पे restaurant का account खोलते समय सब details भर देते हो एक साथ)
user = await db.user.create(
    data={
        "email": "ada@example.com",
        "name": "Ada",
        "posts": {
            "create": [{"title": "First post", "published": True}]
        },
    }
)

# Existing post को user से connect कर
post = await db.post.update(
    where={"id": 5},
    data={"author": {"connect": {"id": 1}}},
)
```

---

## 8. Transactions

```python
# Interactive transaction — सब operation succeed करे या कोई भी न हो (जैसे UPI payment — दोनों को pass हो या दोनों fail हो, आधा-अधूरा state न रहे)
async def transfer(from_id: int, to_id: int, amount: int):
    async with db.tx() as transaction:
        await transaction.account.update(where={"id": from_id}, data={"balance": {"decrement": amount}})
        await transaction.account.update(where={"id": to_id}, data={"balance": {"increment": amount}})

# Bulk insert — 100 users को एक से एक करने के बजाय एक साथ डाल दे
await db.user.create_many(
    data=[{"email": f"user{i}@example.com", "name": f"User {i}"} for i in range(100)]
)
```

---

## 9. Raw Queries

```python
# Query raw — dictionaries की list return होती है
results = await db.query_raw("SELECT * FROM users WHERE email LIKE $1", "%@example.com")

# Execute raw — कितने rows affect हुए ये return होता है
count = await db.execute_raw("UPDATE posts SET published = true WHERE author_id = $1", 1)
```

Raw queries तभी use कर जब ORM से काम न हो रहा हो — migrations और schema changes को pure SQL track नहीं कर पाते।

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

# Dependency — route handlers को database connection दे
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

`prisma generate` तेरे schema के हर model के लिए automatically Pydantic models बना देता है। अलग से duplicate class definition लिखने की कोई जरूरत नहीं — सीधे generated models use कर:

```python
from prisma.models import User, Post

# FastAPI के response_model मे सीधे generated models use कर — extra Pydantic class की कोई need नहीं
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
    await db.post.delete_many()   # dependent records को पहले clear कर
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

**Tip:** `DATABASE_URL` को separate test SQLite file या dedicated PostgreSQL test database पर point कर, ताकि development data touch न हो।

---

## Key Takeaways

- Prisma Client Python तुम्हें TypeScript का same experience देता है, Python मे async native
- Schema generation और code generation से type safety automatic मिल जाती है
- FastAPI के साथ integration clean है — lifespan events से lifecycle manage करो
- Transactions और nested writes से complex operations को atomic रखो
- Raw queries को escape hatch के रूप मे use कर, default मे ORM पर ही rely करो
- Auto-generated Pydantic models से code duplication खत्म कर
