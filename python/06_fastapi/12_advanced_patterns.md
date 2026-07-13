# 12 - Advanced Patterns

## APIRouter: Modular Routing

Socho, agar ek badi Express app ko organize karna hai toh `express.Router()` use karte ho na? FastAPI mein bhi same concept hai, uska naam hai **APIRouter**. Jab tumhe routes ko different files mein split karna ho, ya phir organize karna ho, toh yeh pattern use karte ho.

### Express.js Router (JavaScript reference)

```javascript
// routes/users.js
const router = require('express').Router();

router.get('/', (req, res) => { res.json([]); });
router.post('/', (req, res) => { res.json({ created: true }); });
router.get('/:id', (req, res) => { res.json({ id: req.params.id }); });

module.exports = router;

// app.js
const usersRouter = require('./routes/users');
app.use('/api/users', usersRouter);
```

### FastAPI APIRouter

FastAPI mein bhi same karte ho, bas thoda structured:

```python
# routers/users.py
from fastapi import APIRouter, Depends

router = APIRouter(
    prefix="/users",
    tags=["users"],                    # Swagger UI mein group hota hai
    responses={404: {"description": "Not found"}},  # Default responses
)

@router.get("/")
def list_users():
    return []

@router.post("/", status_code=201)
def create_user(user: UserCreate):
    return {"created": True}

@router.get("/{user_id}")
def get_user(user_id: int):
    return {"id": user_id}
```

Ab ek aur router file bana lete ho:

```python
# routers/posts.py
from fastapi import APIRouter

router = APIRouter(prefix="/posts", tags=["posts"])

@router.get("/")
def list_posts():
    return []

@router.post("/", status_code=201)
def create_post(post: PostCreate):
    return post
```

Ab main app mein sabko include kar do:

```python
# main.py
from fastapi import FastAPI
from routers import users, posts

app = FastAPI(title="My API")

app.include_router(users.router, prefix="/api")  # /api/users/...
app.include_router(posts.router, prefix="/api")   # /api/posts/...
```

### Router with Dependencies

Ek aur advanced use-case: jab tumhe ek poora router ke liye auth ka requirement ho? Jaise admin panel ke liye sab endpoints ko auth check karna pade:

```python
# Admin routes par authentication mandatory hai
admin_router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(get_admin_user)],  # Sabko apply hoga
)

@admin_router.get("/stats")
def get_stats():
    return {"users": 100, "posts": 500}

@admin_router.get("/logs")
def get_logs():
    return {"logs": []}

app.include_router(admin_router)
```

### Nested Routers

Kabhi kabhi API versioning ke liye nested routers banana padta hai. Jaise v1 aur v2 dono routes ko maintain karna ho:

```python
# v1 aur v2 dono versions banate ho
v1_router = APIRouter(prefix="/api/v1")
v1_router.include_router(users.router)
v1_router.include_router(posts.router)

v2_router = APIRouter(prefix="/api/v2")
v2_router.include_router(users_v2.router)

app.include_router(v1_router)
app.include_router(v2_router)
```

---

## Sub-Applications

Kuch badi companies ke paas main API hota hai aur admin panel alag. Jaise Zomato ka customer API aur admin panel alag. FastAPI mein bhi aisa kar sakte ho — **mount** kar sakte ho pura app ko:

```python
# Main app
main_app = FastAPI(title="Main API")

@main_app.get("/")
def main_root():
    return {"app": "main"}

# Admin app (bilkul alag)
admin_app = FastAPI(title="Admin Panel")

@admin_app.get("/")
def admin_root():
    return {"app": "admin"}

@admin_app.get("/users")
def admin_users():
    return {"users": []}

# Admin ko /admin path ke neeche mount kar do
main_app.mount("/admin", admin_app)

# Ab aisa kaam karta hai:
# GET /          -> main_root()
# GET /admin/    -> admin_root()  (separate Swagger docs at /admin/docs)
# GET /admin/users -> admin_users()
```

Ek faida yeh hai ke har sub-app ka apna Swagger documentation hota hai. Toh public API ke liye `/docs` aur admin panel ke liye `/admin/docs`.

---

## Lifespan Context Manager (Advanced)

Jab app start hota hai toh kuch resources ko initialize karna padta hai na — database connection, cache, external APIs. Aur jab app shut down hota hai toh cleanup karna padta hai. FastAPI mein **lifespan** context manager se yeh sab handle karte ho:

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- STARTUP (App shuru hote waqt) ---
    print("Initializing application...")

    # Database connection
    app.state.db_engine = create_async_engine("postgresql+asyncpg://...")

    # External APIs ke liye HTTP client (jaise payment gateway)
    import httpx
    app.state.http_client = httpx.AsyncClient(timeout=30)

    # Redis cache (jaise IRCTC booking mein cache use hota hai)
    import redis.asyncio as redis
    app.state.redis = redis.from_url("redis://localhost")

    # ML Model ek bar load karo, sabko reuse karna hai
    app.state.ml_model = load_model("./model.pkl")

    print("Application ready!")

    yield  # Yahan se app requests serve karta hai

    # --- SHUTDOWN (App band hote waqt) ---
    print("Shutting down...")
    await app.state.http_client.aclose()
    await app.state.db_engine.dispose()
    await app.state.redis.close()
    print("Cleanup complete!")

app = FastAPI(lifespan=lifespan)

# Routes mein access karo shared resources
@app.get("/predict")
async def predict(request: Request, data: PredictInput):
    model = request.app.state.ml_model
    result = model.predict(data.features)
    return {"prediction": result}

@app.get("/cached-data/{key}")
async def get_cached(request: Request, key: str):
    redis = request.app.state.redis
    cached = await redis.get(key)
    if cached:
        return {"data": cached, "source": "cache"}
    # ... fetch from DB, cache, return
```

> [!tip]
> `app.state` ek dict jaisa kaam karta hai jahan global resources rakho. Sab requests isse access kar sakte hain.

---

## Streaming Responses

### StreamingResponse for Large Files

Kabhi tumhe large file download करना हो, jaise 1GB CSV dump. Agar pura file memory mein load kar do toh server crash ho jayega. Instead, **streaming** use karte ho — chhote chunks mein bhejte ho:

```python
from fastapi.responses import StreamingResponse
import asyncio

# Badi file ko download karne ke liye
@app.get("/download/large-file")
def download_large_file():
    def file_generator():
        with open("large_file.csv", "rb") as f:
            while chunk := f.read(8192):  # 8KB ke chunks mein read karo
                yield chunk

    return StreamingResponse(
        file_generator(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=data.csv"},
    )

# Dynamically generate karo (jaise IRCTC se lakh users ka data)
@app.get("/export/users")
def export_users():
    def generate():
        yield "id,name,email\n"
        for i in range(1_000_000):
            yield f"{i},user_{i},user_{i}@example.com\n"

    return StreamingResponse(generate(), media_type="text/csv")
```

### Server-Sent Events (SSE)

SSE ek easy way hai server se client ko updates bhejne ka, bina WebSocket ke. Jaise Zomato app mein order status update aata raha ta — SSE se woh implement ho sakta hai:

```python
import asyncio
import json
from datetime import datetime
from fastapi.responses import StreamingResponse

@app.get("/events/stream")
async def event_stream():
    """
    Server-Sent Events endpoint.
    JavaScript mein: const eventSource = new EventSource('/events/stream');
    """
    async def generate():
        while True:
            data = {
                "timestamp": datetime.now().isoformat(),
                "cpu": get_cpu_usage(),
                "memory": get_memory_usage(),
            }
            # SSE format: "data: {json}\n\n"
            yield f"data: {json.dumps(data)}\n\n"
            await asyncio.sleep(1)

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )
```

JavaScript mein client side aesa implement karte ho:

```javascript
const eventSource = new EventSource('/events/stream');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Server update:', data);
};

eventSource.onerror = () => {
  console.log('Connection lost, reconnecting...');
  // Browser automatically reconnect karta hai!
};
```

### SSE with Named Events

Agar alag alag types ke events hain toh:

```python
@app.get("/events/notifications")
async def notification_stream(user_id: int):
    async def generate():
        while True:
            notifications = await check_notifications(user_id)
            for notif in notifications:
                # Named events
                yield f"event: notification\ndata: {json.dumps(notif)}\n\n"

            # Heartbeat se connection alive rahe
            yield f"event: heartbeat\ndata: {json.dumps({'time': datetime.now().isoformat()})}\n\n"
            await asyncio.sleep(5)

    return StreamingResponse(generate(), media_type="text/event-stream")
```

JavaScript mein:

```javascript
// Different events alag handle karo
const es = new EventSource('/events/notifications?user_id=1');

es.addEventListener('notification', (event) => {
  const data = JSON.parse(event.data);
  showNotification(data);
});

es.addEventListener('heartbeat', (event) => {
  console.log('Connection alive');
});
```

### SSE vs WebSocket comparison

| Feature | SSE | WebSocket |
|---|---|---|
| Direction | Server → Client only | Dono taraf |
| Protocol | HTTP | WS |
| Auto-reconnect | Built-in (browser mein) | Manual code karna padta hai |
| Complexity | Bahut simple | Thoda zyada complex |
| Use case | Live feeds, notifications | Chat, real-time collaboration |
| Browser support | Sab modern browsers mein | Sab modern browsers mein |

---

## API Versioning Strategies

Kya hota hai jab API change karna padhe? Purane clients ko break na kare toh versioning use karte ho. Teeno approaches dekho:

### Strategy 1: URL Prefix (Most Common)

URL mein hi version mention kar do:

```python
# routers/v1/users.py
v1_router = APIRouter(prefix="/api/v1")

@v1_router.get("/users")
def list_users_v1():
    return [{"id": 1, "name": "Alice"}]

# routers/v2/users.py
v2_router = APIRouter(prefix="/api/v2")

@v2_router.get("/users")
def list_users_v2():
    return [{"id": 1, "name": "Alice", "email": "alice@example.com", "role": "user"}]

# main.py
app.include_router(v1_router)
app.include_router(v2_router)
```

Ab `/api/v1/users` aur `/api/v2/users` dono work karte hain.

### Strategy 2: Header-Based Versioning

Header mein specify karo:

```python
from fastapi import Header

@app.get("/users")
def list_users(accept_version: str = Header(default="v1", alias="Accept-Version")):
    if accept_version == "v2":
        return [{"id": 1, "name": "Alice", "email": "alice@example.com"}]
    return [{"id": 1, "name": "Alice"}]
```

Client `Accept-Version: v2` header bheje toh v2 response milega.

### Strategy 3: Sub-Applications

Har version ko alag app bana do:

```python
v1_app = FastAPI(title="API v1")
v2_app = FastAPI(title="API v2")

@v1_app.get("/users")
def v1_users():
    return []

@v2_app.get("/users")
def v2_users():
    return []

main_app = FastAPI()
main_app.mount("/api/v1", v1_app)  # Docs at /api/v1/docs
main_app.mount("/api/v2", v2_app)  # Docs at /api/v2/docs
```

---

## Rate Limiting

Jab spam attacks hote hain, ya phir kisi ko unlimited requests कर रहे हो, toh rate limiting use karte ho. Zomato app mein bhi iska use ho hota hai — zyada requests mein throttle.

### Simple In-Memory Rate Limiter

```python
from collections import defaultdict
from datetime import datetime, timedelta
from fastapi import Request, HTTPException

class RateLimiter:
    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: dict[str, list[datetime]] = defaultdict(list)

    def check(self, key: str) -> bool:
        now = datetime.now()
        window_start = now - timedelta(seconds=self.window_seconds)

        # Purane requests ko clean karo
        self.requests[key] = [
            t for t in self.requests[key] if t > window_start
        ]

        if len(self.requests[key]) >= self.max_requests:
            return False

        self.requests[key].append(now)
        return True

# Alag alag limits banao
default_limiter = RateLimiter(max_requests=100, window_seconds=60)
auth_limiter = RateLimiter(max_requests=5, window_seconds=300)  # Login ke liye tight

# Dependency ke taur use karo
def rate_limit(request: Request):
    client_ip = request.client.host
    if not default_limiter.check(client_ip):
        raise HTTPException(
            status_code=429,
            detail="Too many requests",
            headers={"Retry-After": "60"},
        )

# Specific routes par apply karo
@app.get("/api/data", dependencies=[Depends(rate_limit)])
def get_data():
    return {"data": "here"}

# Ya phir factory se different limits banao
def rate_limit_factory(max_requests: int, window: int):
    limiter = RateLimiter(max_requests, window)

    def check(request: Request):
        if not limiter.check(request.client.host):
            raise HTTPException(status_code=429, detail="Rate limit exceeded")

    return check

# Different endpoints ko different limits
@app.post("/auth/login", dependencies=[Depends(rate_limit_factory(5, 300))])
def login():
    ...

@app.get("/api/search", dependencies=[Depends(rate_limit_factory(30, 60))])
def search():
    ...
```

### With Redis (Production)

Production mein in-memory nahi, Redis use karte ho taaki multiple servers ke liye consistent rate limiting rahe:

```python
import redis.asyncio as redis

class RedisRateLimiter:
    def __init__(self, redis_client: redis.Redis, max_requests: int, window: int):
        self.redis = redis_client
        self.max_requests = max_requests
        self.window = window

    async def check(self, key: str) -> tuple[bool, int]:
        """Returns (allowed, remaining)."""
        pipe = self.redis.pipeline()
        now = datetime.now().timestamp()

        redis_key = f"rate_limit:{key}"
        pipe.zremrangebyscore(redis_key, 0, now - self.window)
        pipe.zadd(redis_key, {str(now): now})
        pipe.zcard(redis_key)
        pipe.expire(redis_key, self.window)

        results = await pipe.execute()
        count = results[2]
        remaining = max(0, self.max_requests - count)

        return count <= self.max_requests, remaining
```

---

## Pagination Patterns

Jab data bahut zyada ho, toh sab ek sath bhej sakta? Nahi. Pagination use karte ho — chunks mein data bhejte ho.

### Offset-Based Pagination (Simple)

Sabse simple: skip karo `n` items, then limit karo `m` items:

```python
from pydantic import BaseModel, Field

class PaginationParams(BaseModel):
    skip: int = Field(default=0, ge=0)
    limit: int = Field(default=20, ge=1, le=100)

class PaginatedResponse(BaseModel):
    data: list
    total: int
    skip: int
    limit: int
    has_more: bool

def paginate(query, skip: int, limit: int) -> dict:
    total = query.count()
    items = query.offset(skip).limit(limit).all()
    return {
        "data": items,
        "total": total,
        "skip": skip,
        "limit": limit,
        "has_more": skip + limit < total,
    }

@app.get("/users")
def list_users(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    query = db.query(User)
    return paginate(query, skip, limit)
```

### Cursor-Based Pagination (Better for Large Datasets)

Offset-based slow hota hai jab data bahut ho. Cursor-based zaada fast hai — last ID ko remember करते हो:

```python
from pydantic import BaseModel
import base64
import json

class CursorPaginationParams:
    def __init__(
        self,
        cursor: str | None = None,
        limit: int = 20,
    ):
        self.cursor = cursor
        self.limit = limit

    def decode_cursor(self) -> dict | None:
        if not self.cursor:
            return None
        try:
            decoded = base64.b64decode(self.cursor).decode("utf-8")
            return json.loads(decoded)
        except Exception:
            return None

    @staticmethod
    def encode_cursor(data: dict) -> str:
        json_str = json.dumps(data)
        return base64.b64encode(json_str.encode("utf-8")).decode("utf-8")


@app.get("/posts")
def list_posts(
    cursor: str | None = None,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    query = db.query(Post).order_by(Post.id.desc())

    # Cursor apply karo
    if cursor:
        try:
            decoded = json.loads(base64.b64decode(cursor))
            last_id = decoded["id"]
            query = query.filter(Post.id < last_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid cursor")

    items = query.limit(limit + 1).all()  # Ek extra fetch karo check ke liye
    has_more = len(items) > limit
    items = items[:limit]

    next_cursor = None
    if has_more and items:
        cursor_data = {"id": items[-1].id}
        next_cursor = base64.b64encode(json.dumps(cursor_data).encode()).decode()

    return {
        "data": items,
        "next_cursor": next_cursor,
        "has_more": has_more,
    }
```

### Page-Based Pagination (Frontend-Friendly)

Jab frontend ko page numbers chaiye:

```python
import math

class PageParams:
    def __init__(self, page: int = 1, per_page: int = 20):
        self.page = max(1, page)
        self.per_page = min(max(1, per_page), 100)
        self.skip = (self.page - 1) * self.per_page

@app.get("/articles")
def list_articles(
    page: int = 1,
    per_page: int = 20,
    db: Session = Depends(get_db),
):
    params = PageParams(page, per_page)
    total = db.query(Article).count()
    items = db.query(Article).offset(params.skip).limit(params.per_page).all()

    total_pages = math.ceil(total / params.per_page)

    return {
        "data": items,
        "pagination": {
            "page": params.page,
            "per_page": params.per_page,
            "total": total,
            "total_pages": total_pages,
            "has_next": params.page < total_pages,
            "has_prev": params.page > 1,
        },
    }
```

---

## Generic CRUD Factory

Socho, har resource ke liye same CRUD routes likhne padta ho. Repetitive code. NestJS mein builder pattern hota hai, FastAPI mein bhi banate ho:

```python
from typing import TypeVar, Generic, Type
from pydantic import BaseModel
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException
from database import Base, get_db

ModelType = TypeVar("ModelType", bound=Base)
CreateSchema = TypeVar("CreateSchema", bound=BaseModel)
UpdateSchema = TypeVar("UpdateSchema", bound=BaseModel)
ResponseSchema = TypeVar("ResponseSchema", bound=BaseModel)

class CRUDRouter:
    """Factory for creating CRUD routers."""

    @staticmethod
    def create(
        model: type,
        create_schema: type[BaseModel],
        update_schema: type[BaseModel],
        response_schema: type[BaseModel],
        prefix: str,
        tags: list[str],
    ) -> APIRouter:
        router = APIRouter(prefix=prefix, tags=tags)

        @router.get("/", response_model=list[response_schema])
        def list_items(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
            return db.query(model).offset(skip).limit(limit).all()

        @router.get("/{item_id}", response_model=response_schema)
        def get_item(item_id: int, db: Session = Depends(get_db)):
            item = db.query(model).filter(model.id == item_id).first()
            if not item:
                raise HTTPException(status_code=404, detail=f"{model.__name__} not found")
            return item

        @router.post("/", response_model=response_schema, status_code=201)
        def create_item(data: create_schema, db: Session = Depends(get_db)):
            item = model(**data.model_dump())
            db.add(item)
            db.commit()
            db.refresh(item)
            return item

        @router.put("/{item_id}", response_model=response_schema)
        def update_item(item_id: int, data: update_schema, db: Session = Depends(get_db)):
            item = db.query(model).filter(model.id == item_id).first()
            if not item:
                raise HTTPException(status_code=404, detail=f"{model.__name__} not found")
            for field, value in data.model_dump(exclude_unset=True).items():
                setattr(item, field, value)
            db.commit()
            db.refresh(item)
            return item

        @router.delete("/{item_id}", status_code=204)
        def delete_item(item_id: int, db: Session = Depends(get_db)):
            item = db.query(model).filter(model.id == item_id).first()
            if not item:
                raise HTTPException(status_code=404, detail=f"{model.__name__} not found")
            db.delete(item)
            db.commit()

        return router

# Usage — ek line mein CRUD router ban jayega!
users_router = CRUDRouter.create(User, UserCreate, UserUpdate, UserResponse, "/users", ["users"])
posts_router = CRUDRouter.create(Post, PostCreate, PostUpdate, PostResponse, "/posts", ["posts"])
tags_router = CRUDRouter.create(Tag, TagCreate, TagUpdate, TagResponse, "/tags", ["tags"])

app.include_router(users_router, prefix="/api")
app.include_router(posts_router, prefix="/api")
app.include_router(tags_router, prefix="/api")
```

---

## Configuration with Pydantic Settings

Environment variables ko manage karte ho `pydantic-settings` se. Isse type-safe hota hai aur validation bhi hota hai:

```python
# config.py
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    """
    Node.js ke `dotenv + process.env` jaisa,
    but type-safe aur validated.
    .env file se read karta hai.
    """
    app_name: str = "My API"
    debug: bool = False
    database_url: str
    redis_url: str = "redis://localhost:6379"
    secret_key: str
    allowed_origins: list[str] = ["http://localhost:3000"]
    max_upload_size: int = 10_000_000  # 10MB

    model_config = {"env_file": ".env"}

@lru_cache  # Settings ko cache कर दो (singleton pattern)
def get_settings() -> Settings:
    return Settings()

# Routes mein dependency ke taur use karo
@app.get("/info")
def app_info(settings: Settings = Depends(get_settings)):
    return {
        "app_name": settings.app_name,
        "debug": settings.debug,
    }
```

`.env` file:

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/mydb
SECRET_KEY=super-secret-key
DEBUG=true
ALLOWED_ORIGINS=["http://localhost:3000","http://localhost:5173"]
```

---

## Project Structure for Large Applications

Jab app bada hone lage, toh organized structure zarurah hai. Yeh standard structure hai:

```
project/
├── app/
│   ├── __init__.py
│   ├── main.py                  # FastAPI app creation aur routers
│   ├── config.py                # Settings
│   ├── database.py              # DB engine aur session
│   ├── dependencies.py          # Shared dependencies (auth, db)
│   ├── exceptions.py            # Custom exceptions
│   ├── error_handlers.py        # Exception handlers
│   │
│   ├── models/                  # SQLAlchemy models
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── post.py
│   │   └── tag.py
│   │
│   ├── schemas/                 # Pydantic schemas (DTOs)
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── post.py
│   │   └── common.py
│   │
│   ├── routers/                 # Route handlers
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── users.py
│   │   ├── posts.py
│   │   └── admin.py
│   │
│   ├── services/                # Business logic
│   │   ├── __init__.py
│   │   ├── user_service.py
│   │   ├── post_service.py
│   │   └── email_service.py
│   │
│   ├── repositories/            # Data access layer
│   │   ├── __init__.py
│   │   ├── user_repo.py
│   │   └── post_repo.py
│   │
│   └── utils/
│       ├── __init__.py
│       ├── security.py          # JWT, password hashing
│       └── pagination.py
│
├── tests/
│   ├── conftest.py
│   ├── test_auth.py
│   ├── test_users.py
│   └── test_posts.py
│
├── alembic/
│   ├── versions/
│   └── env.py
│
├── alembic.ini
├── pyproject.toml               # package.json ke jaisa
├── requirements.txt
├── .env
└── Dockerfile
```

Main app ka structure:

```python
# app/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.config import get_settings
from app.database import engine
from app.error_handlers import register_error_handlers
from app.routers import auth, users, posts, admin
from fastapi.middleware.cors import CORSMiddleware

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting up...")
    yield
    print("Shutting down...")
    await engine.dispose()

app = FastAPI(
    title=settings.app_name,
    lifespan=lifespan,
)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Error handlers
register_error_handlers(app)

# Routes
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(posts.router, prefix="/api/posts", tags=["posts"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])

@app.get("/health")
def health():
    return {"status": "healthy"}
```

---

## Practice Exercises

### Exercise 1: Modular App
Ek monolithic app ko multiple files mein split karo:
- Users, posts, aur comments ke liye alag router files banao
- Har router apna schema ho
- Main app mein sabko include kar ke `/docs` mein check karo

### Exercise 2: API Versioning
Do versions ka API banao:
- v1: `/api/v1/users` → `{id, name}`
- v2: `/api/v2/users` → `{id, name, email, created_at}`
- Database same ho, but schemas alag
- Dono versions `/docs` mein alag दिखे

### Exercise 3: SSE Dashboard
Real-time dashboard banao:
- `GET /events/dashboard` — system stats har 2 seconds mein
- `GET /events/logs` — fake log entries
- HTML page jo dono streams ko display kare
- Subscribe/unsubscribe mechanism add karo

### Exercise 4: Pagination Library
Reusable pagination system banao:
- Offset-based: `?skip=0&limit=20`
- Page-based: `?page=1&per_page=20`
- Cursor-based: `?cursor=abc123&limit=20`
- Consistent metadata return karo (total, has_more, etc.)

### Exercise 5: Full Application
Complete blog API banao with:
- Modular structure (routers, models, schemas, services)
- JWT auth with refresh tokens
- Paginated posts CRUD
- Tags with many-to-many
- Comments system
- Rate limiting on write endpoints
- SSE for post notifications
- Tests with fixtures
- Custom error handling
- API versioning (v1)
