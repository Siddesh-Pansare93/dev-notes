# Prisma with Python and FastAPI

The Prisma Client Python is an asynchronous, auto-generated, and fully type-safe database client. When paired with FastAPI, it offers an incredibly fast and modern stack for developing asynchronous APIs.

## 1. Setup and Installation

Initialize a Python project and install the Prisma Client Python and FastAPI.

```bash
mkdir fastapi-prisma
cd fastapi-prisma
python -m venv venv
source venv/bin/activate # Windows: venv\Scripts\activate

pip install "prisma[fastapi]" fastapi uvicorn pydantic
```

Initialize your Prisma project:
```bash
prisma init
```

This creates a `prisma` directory with `schema.prisma` and `.env`.

## 2. Schema and Type Generation

Define your schema. Unlike the Node.js client, the generator provider must be `prisma-client-py`.

```prisma
// prisma/schema.prisma
generator client {
  provider             = "prisma-client-py"
  recursive_type_depth = 5
  interface            = "asyncio" // Default
}

datasource db {
  provider = "sqlite" // or postgresql
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

Migrate and generate the Python client:
```bash
prisma migrate dev --name init
prisma generate
```

## 3. Async Operations with FastAPI

In FastAPI, we manage the Prisma connection lifecycle using FastAPI's startup and shutdown events.

```python
# main.py
from fastapi import FastAPI, HTTPException
from prisma import Prisma
from pydantic import BaseModel

app = FastAPI()
db = Prisma()

# Initialize the Prisma client connection
@app.on_event("startup")
async def startup():
    await db.connect()

@app.on_event("shutdown")
async def shutdown():
    await db.disconnect()

# Pydantic models for request/response validation
class UserCreate(BaseModel):
    email: str
    name: str

class PostCreate(BaseModel):
    title: str
    content: str | None = None
    published: bool = False

@app.post("/users/")
async def create_user(user: UserCreate):
    try:
        new_user = await db.user.create(
            data={
                "email": user.email,
                "name": user.name,
            }
        )
        return new_user
    except Exception as e:
        raise HTTPException(status_code=400, detail="User could not be created")

@app.get("/users/{user_id}")
async def get_user(user_id: int):
    user = await db.user.find_unique(
        where={"id": user_id},
        include={"posts": True} # Include relations!
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
```

Run the server:
```bash
uvicorn main:app --reload
```

## 4. Integration with Pydantic Models

Prisma Client Python automatically generates Pydantic models for your database schema. You can import these directly to avoid duplicating model definitions!

```python
from prisma.models import User, Post
from prisma.partials import UserUpdateInput

# Return the exact Prisma Pydantic Model
@app.get("/users", response_model=list[User])
async def list_users():
    return await db.user.find_many()

# Use partial models for updates
@app.put("/users/{user_id}", response_model=User)
async def update_user(user_id: int, user_update: UserUpdateInput):
    user = await db.user.update(
        where={"id": user_id},
        data=user_update.dict(exclude_unset=True)
    )
    return user
```

## 5. Testing Strategies

Testing async database operations in Python often involves overriding the dependency or using a dedicated test database.

```python
# test_main.py
import pytest
from httpx import AsyncClient
from main import app, db

@pytest.fixture(autouse=True, scope="module")
async def setup_db():
    await db.connect()
    # Clean the DB before tests
    await db.user.delete_many()
    yield
    await db.disconnect()

@pytest.mark.asyncio
async def test_create_user():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.post("/users/", json={"email": "test@test.com", "name": "Test User"})
    assert response.status_code == 200
    assert response.json()["email"] == "test@test.com"
```

## Performance Tips

*   **Batching**: Use `db.user.create_many()` to insert multiple records at once rather than inside a loop.
*   **Transactions**: Use `db.tx()` for interactive transactions when executing dependent logic.
*   **Include Cautiously**: Only use `include={"posts": True}` when necessary, as it translates to JOINs that can bloat payloads.

## Practice Exercises

1. Update the schema to include a `Tag` model (Many-to-Many relation with `Post`) and regenerate the client.
2. Implement a `/posts/` endpoint that accepts tags when creating a post via Prisma's nested create structure.
3. Write a test suite using `pytest-asyncio` that verifies the `User` and `Post` cascaded delete logic.