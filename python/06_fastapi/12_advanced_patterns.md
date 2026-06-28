# 12 - Advanced Patterns

## APIRouter: Modular Routing

APIRouter in FastAPI is the equivalent of `express.Router()`. It lets you split your routes into separate files and modules.

### Express.js Router

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

```python
# routers/users.py
from fastapi import APIRouter, Depends

router = APIRouter(
    prefix="/users",
    tags=["users"],                    # Groups in Swagger UI
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

```python
# main.py
from fastapi import FastAPI
from routers import users, posts

app = FastAPI(title="My API")

app.include_router(users.router, prefix="/api")  # /api/users/...
app.include_router(posts.router, prefix="/api")   # /api/posts/...
```

### Router with Dependencies

```python
# All routes in this router require authentication
admin_router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(get_admin_user)],  # Applied to ALL routes
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

```python
# Like nested Express routers
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

You can mount entirely separate FastAPI apps. This is useful for microservice-like architectures or admin panels.

```python
# Main app
main_app = FastAPI(title="Main API")

@main_app.get("/")
def main_root():
    return {"app": "main"}

# Admin app (completely separate)
admin_app = FastAPI(title="Admin Panel")

@admin_app.get("/")
def admin_root():
    return {"app": "admin"}

@admin_app.get("/users")
def admin_users():
    return {"users": []}

# Mount admin app under /admin
main_app.mount("/admin", admin_app)

# Now:
# GET /          -> main_root()
# GET /admin/    -> admin_root()  (separate Swagger docs at /admin/docs)
# GET /admin/users -> admin_users()
```

Each sub-application gets its own OpenAPI docs. This is useful for having separate public API docs and admin docs.

---

## Lifespan Context Manager (Advanced)

The lifespan pattern for managing application-wide resources.

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- STARTUP ---
    print("Initializing application...")

    # Database
    app.state.db_engine = create_async_engine("postgresql+asyncpg://...")

    # HTTP Client for external APIs
    import httpx
    app.state.http_client = httpx.AsyncClient(timeout=30)

    # Redis cache
    import redis.asyncio as redis
    app.state.redis = redis.from_url("redis://localhost")

    # ML Model (loaded once, used by all requests)
    app.state.ml_model = load_model("./model.pkl")

    print("Application ready!")

    yield  # Application runs and serves requests here

    # --- SHUTDOWN ---
    print("Shutting down...")
    await app.state.http_client.aclose()
    await app.state.db_engine.dispose()
    await app.state.redis.close()
    print("Cleanup complete!")

app = FastAPI(lifespan=lifespan)

# Access shared resources from routes
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

---

## Streaming Responses

### StreamingResponse for Large Data

```python
from fastapi.responses import StreamingResponse
import asyncio

# Stream a large file
@app.get("/download/large-file")
def download_large_file():
    def file_generator():
        with open("large_file.csv", "rb") as f:
            while chunk := f.read(8192):  # 8KB chunks
                yield chunk

    return StreamingResponse(
        file_generator(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=data.csv"},
    )

# Stream generated data
@app.get("/export/users")
def export_users():
    def generate():
        yield "id,name,email\n"
        for i in range(1_000_000):
            yield f"{i},user_{i},user_{i}@example.com\n"

    return StreamingResponse(generate(), media_type="text/csv")
```

### Server-Sent Events (SSE)

SSE is a simpler alternative to WebSockets for server-to-client streaming. Like `EventSource` in JavaScript.

```python
import asyncio
import json
from datetime import datetime
from fastapi.responses import StreamingResponse

@app.get("/events/stream")
async def event_stream():
    """
    Server-Sent Events endpoint.
    Client: const eventSource = new EventSource('/events/stream');
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

Client-side JavaScript:

```javascript
const eventSource = new EventSource('/events/stream');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Server update:', data);
};

eventSource.onerror = () => {
  console.log('Connection lost, reconnecting...');
  // EventSource auto-reconnects!
};
```

### SSE with Named Events

```python
@app.get("/events/notifications")
async def notification_stream(user_id: int):
    async def generate():
        while True:
            notifications = await check_notifications(user_id)
            for notif in notifications:
                # Named events
                yield f"event: notification\ndata: {json.dumps(notif)}\n\n"

            # Heartbeat to keep connection alive
            yield f"event: heartbeat\ndata: {json.dumps({'time': datetime.now().isoformat()})}\n\n"
            await asyncio.sleep(5)

    return StreamingResponse(generate(), media_type="text/event-stream")
```

```javascript
// Client handles named events separately
const es = new EventSource('/events/notifications?user_id=1');

es.addEventListener('notification', (event) => {
  const data = JSON.parse(event.data);
  showNotification(data);
});

es.addEventListener('heartbeat', (event) => {
  console.log('Connection alive');
});
```

### Comparison: SSE vs WebSocket

| Feature | SSE | WebSocket |
|---|---|---|
| Direction | Server -> Client only | Bidirectional |
| Protocol | HTTP | WS |
| Auto-reconnect | Built-in (browser) | Manual |
| Complexity | Very simple | More complex |
| Use case | Live feeds, notifications | Chat, real-time collaboration |
| Browser support | All modern browsers | All modern browsers |

---

## API Versioning Strategies

### Strategy 1: URL Prefix (Most Common)

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

### Strategy 2: Header-Based Versioning

```python
from fastapi import Header

@app.get("/users")
def list_users(accept_version: str = Header(default="v1", alias="Accept-Version")):
    if accept_version == "v2":
        return [{"id": 1, "name": "Alice", "email": "alice@example.com"}]
    return [{"id": 1, "name": "Alice"}]
```

### Strategy 3: Sub-Applications

```python
v1_app = FastAPI(title="API v1")
v2_app = FastAPI(title="API v2")

# Each version has its own routes and docs
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

        # Clean old entries
        self.requests[key] = [
            t for t in self.requests[key] if t > window_start
        ]

        if len(self.requests[key]) >= self.max_requests:
            return False

        self.requests[key].append(now)
        return True

# Create limiters for different tiers
default_limiter = RateLimiter(max_requests=100, window_seconds=60)
auth_limiter = RateLimiter(max_requests=5, window_seconds=300)  # 5 attempts per 5 min

# As a dependency
def rate_limit(request: Request):
    client_ip = request.client.host
    if not default_limiter.check(client_ip):
        raise HTTPException(
            status_code=429,
            detail="Too many requests",
            headers={"Retry-After": "60"},
        )

# Apply to specific routes
@app.get("/api/data", dependencies=[Depends(rate_limit)])
def get_data():
    return {"data": "here"}

# Or make a factory for different limits
def rate_limit_factory(max_requests: int, window: int):
    limiter = RateLimiter(max_requests, window)

    def check(request: Request):
        if not limiter.check(request.client.host):
            raise HTTPException(status_code=429, detail="Rate limit exceeded")

    return check

# Usage
@app.post("/auth/login", dependencies=[Depends(rate_limit_factory(5, 300))])
def login():
    ...

@app.get("/api/search", dependencies=[Depends(rate_limit_factory(30, 60))])
def search():
    ...
```

### With Redis (Production)

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

### Offset-Based Pagination (Simple)

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

    # Apply cursor filter
    if cursor:
        try:
            decoded = json.loads(base64.b64decode(cursor))
            last_id = decoded["id"]
            query = query.filter(Post.id < last_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid cursor")

    items = query.limit(limit + 1).all()  # Fetch one extra to check has_more
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

Reduce boilerplate by creating a reusable CRUD factory:

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
    """Factory for creating CRUD routers (like a NestJS CRUD generator)."""

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

# Usage -- generate CRUD routers with one line each
users_router = CRUDRouter.create(User, UserCreate, UserUpdate, UserResponse, "/users", ["users"])
posts_router = CRUDRouter.create(Post, PostCreate, PostUpdate, PostResponse, "/posts", ["posts"])
tags_router = CRUDRouter.create(Tag, TagCreate, TagUpdate, TagResponse, "/tags", ["tags"])

app.include_router(users_router, prefix="/api")
app.include_router(posts_router, prefix="/api")
app.include_router(tags_router, prefix="/api")
```

---

## Configuration with Pydantic Settings

```python
# config.py
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    """
    Like dotenv + process.env in Node.js, but typed and validated.
    Reads from environment variables and .env files.
    """
    app_name: str = "My API"
    debug: bool = False
    database_url: str
    redis_url: str = "redis://localhost:6379"
    secret_key: str
    allowed_origins: list[str] = ["http://localhost:3000"]
    max_upload_size: int = 10_000_000  # 10MB

    model_config = {"env_file": ".env"}

@lru_cache  # Cache settings (singleton pattern)
def get_settings() -> Settings:
    return Settings()

# Use as dependency
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

```
project/
├── app/
│   ├── __init__.py
│   ├── main.py                  # FastAPI app creation and router includes
│   ├── config.py                # Settings
│   ├── database.py              # Database engine and session
│   ├── dependencies.py          # Shared dependencies (auth, db, pagination)
│   ├── exceptions.py            # Custom exception classes
│   ├── error_handlers.py        # Exception handler registration
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
│   │   └── common.py            # Shared schemas (pagination, errors)
│   │
│   ├── routers/                 # Route handlers (controllers)
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
│   ├── conftest.py              # Shared fixtures
│   ├── test_auth.py
│   ├── test_users.py
│   └── test_posts.py
│
├── alembic/
│   ├── versions/
│   └── env.py
│
├── alembic.ini
├── pyproject.toml               # Like package.json
├── requirements.txt
├── .env
└── Dockerfile
```

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
Refactor a monolithic `main.py` into a modular structure:
- Create separate router files for users, posts, and comments
- Each router in its own file with its own schemas
- Include all routers in `main.py` with appropriate prefixes and tags
- Verify all endpoints appear correctly in `/docs`

### Exercise 2: API Versioning
Create an API with two versions:
- v1: `/api/v1/users` returns `{id, name}`
- v2: `/api/v2/users` returns `{id, name, email, created_at}`
- Both versions share the same database models
- Each version has its own Pydantic schemas

### Exercise 3: SSE Dashboard
Build a live dashboard using Server-Sent Events:
- `GET /events/dashboard` -- SSE stream with system stats every 2 seconds
- `GET /events/logs` -- SSE stream of fake log entries
- Create an HTML page that displays both streams
- Add a "subscribe/unsubscribe" mechanism for different event types

### Exercise 4: Pagination Library
Create a reusable pagination system that supports:
- Offset-based: `?skip=0&limit=20`
- Page-based: `?page=1&per_page=20`
- Cursor-based: `?cursor=abc123&limit=20`
- Make it a dependency that works with any SQLAlchemy model
- Return consistent metadata (total, has_more, next_cursor/next_page)

### Exercise 5: Full Application
Build a complete blog API with:
- Modular structure (routers, models, schemas, services)
- JWT authentication with refresh tokens
- CRUD for posts with pagination
- Tags with many-to-many relationships
- Comment system
- Rate limiting on write endpoints
- SSE for real-time notifications of new posts
- Complete test suite with database fixtures
- Custom error handling with consistent error format
- API versioning (v1)
