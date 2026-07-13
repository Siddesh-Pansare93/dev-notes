# Prisma with Python aur FastAPI

Prisma Client Python — ek asynchronous, auto-generated, aur fully type-safe database client hai. Jab isko FastAPI ke saath couple karte ho, toh ek incredibly fast aur modern stack mil jaata hai for developing asynchronous APIs.

Socho ek second — jab ek restaurant mein tum customer ho aur waiter tumhara order le raha ho, he doesn't go to the kitchen himself, right? Woh ek piece of paper likhe aur kitchen ko hand over karte hain. Prisma ka kaam exactly yahi hai — data ko manage karta hai bilkul aek professional waiter ki tarah!

## 1. Setup aur Installation

Pehle Python project initialize karo aur Prisma Client Python + FastAPI install karo.

```bash
mkdir fastapi-prisma
cd fastapi-prisma
python -m venv venv
source venv/bin/activate # Windows ke liye: venv\Scripts\activate

pip install "prisma[fastapi]" fastapi uvicorn pydantic
```

Ab Prisma project init karo:
```bash
prisma init
```

Yeh `prisma` directory create karte hain jismein `schema.prisma` aur `.env` file hote hain.

## 2. Schema aur Type Generation

Apna schema define karo. Node.js client se alag, yahan generator provider `prisma-client-py` hona zaruri hai.

```prisma
// prisma/schema.prisma
generator client {
  provider             = "prisma-client-py"
  recursive_type_depth = 5
  interface            = "asyncio" // Default
}

datasource db {
  provider = "sqlite" // ya phir postgresql
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

Ab migration run karo aur Python client generate karo:
```bash
prisma migrate dev --name init
prisma generate
```

## 3. Async Operations with FastAPI

FastAPI mein, Prisma connection lifecycle ko manage karte hain FastAPI ke startup aur shutdown events se.

Socho Zomato app ke bare mein — jab app start hota hai toh database connection open hota hai, aur jab close hota hai toh properly close karte hain. Exactly yahi karte hain hum yahan:

```python
# main.py
from fastapi import FastAPI, HTTPException
from prisma import Prisma
from pydantic import BaseModel

app = FastAPI()
db = Prisma()

# Database connection ko startup event mein initialize karo
@app.on_event("startup")
async def startup():
    await db.connect()

@app.on_event("shutdown")
async def shutdown():
    await db.disconnect()

# Pydantic models request/response validation ke liye
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
        include={"posts": True} # Relations ko include karo!
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
```

Server run karo:
```bash
uvicorn main:app --reload
```

## 4. Pydantic Models ke saath Integration

Prisma Client Python automatically Pydantic models generate karte hain tumhare database schema se. Isko directly import kar sakte ho — model definitions duplicate nahi karni padegi!

```python
from prisma.models import User, Post
from prisma.partials import UserUpdateInput

# Exact Prisma Pydantic Model return karo
@app.get("/users", response_model=list[User])
async def list_users():
    return await db.user.find_many()

# Partial models use karo updates ke liye
@app.put("/users/{user_id}", response_model=User)
async def update_user(user_id: int, user_update: UserUpdateInput):
    user = await db.user.update(
        where={"id": user_id},
        data=user_update.dict(exclude_unset=True)
    )
    return user
```

## 5. Testing Strategies

Async database operations ko test karte waqt Python mein zyada baar dependency override karte hain ya phir dedicated test database use karte hain.

```python
# test_main.py
import pytest
from httpx import AsyncClient
from main import app, db

@pytest.fixture(autouse=True, scope="module")
async def setup_db():
    await db.connect()
    # Tests se pehle DB ko clean karo
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

*   **Batching**: `db.user.create_many()` use karo multiple records insert karte waqt. Loop mein individual inserts mat karo — yeh Flipkart ka bulk order jaise hai!
*   **Transactions**: `db.tx()` use karo interactive transactions ke liye jab dependent logic execute karna ho. UPI payment ke jaise — successful hona chahiye ya completely rollback.
*   **Include Cautiously**: `include={"posts": True}` sirf tab use karo jab zaruri ho. Yeh database mein JOIN translate hota hai jo payload ko bloat kar sakta hai.

## Practice Exercises

1. Schema mein `Tag` model add karo (`Post` ke saath Many-to-Many relation) aur client regenerate karo.
2. `/posts/` endpoint implement karo jo tags accept kare post create karte waqt, Prisma's nested create structure use karke.
3. `pytest-asyncio` use karte hue test suite likho jo `User` aur `Post` cascaded delete logic verify kare.
