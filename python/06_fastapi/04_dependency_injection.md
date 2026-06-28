# 04 - Dependency Injection in FastAPI

## Overview

Dependency Injection (DI) is one of FastAPI's most powerful features. If you've used NestJS, you'll feel right at home. If you've only used Express, this is the feature you didn't know you were missing.

### The Comparison

| Framework | DI Approach |
|---|---|
| Express.js | None built-in. You manually import and call things. |
| NestJS | Full DI container with `@Injectable()`, modules, providers |
| FastAPI | `Depends()` function -- simpler than NestJS but equally powerful |

### What Problems Does DI Solve?

In Express, you typically do this:

```javascript
// Express: manual wiring everywhere
const db = require('./database');
const authService = require('./auth');

app.get('/users', async (req, res) => {
  // Manually check auth
  const token = req.headers.authorization;
  const user = await authService.verify(token);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  // Manually get DB connection
  const conn = await db.getConnection();
  try {
    const users = await conn.query('SELECT * FROM users');
    res.json(users);
  } finally {
    conn.release();
  }
});
```

In FastAPI with DI:

```python
# FastAPI: declare what you need, framework provides it
@app.get("/users")
def get_users(
    current_user: User = Depends(get_current_user),  # Auth handled
    db: Session = Depends(get_db),                     # DB session handled
):
    users = db.query(UserModel).all()
    return users
```

---

## Function Dependencies

The simplest form of dependency: a function that returns a value.

### Basic Example

```python
from fastapi import FastAPI, Depends

app = FastAPI()

# This is a dependency -- just a regular function
def get_query_params(skip: int = 0, limit: int = 10):
    return {"skip": skip, "limit": limit}

# Use it with Depends()
@app.get("/items")
def list_items(params: dict = Depends(get_query_params)):
    return {"params": params}
    # GET /items?skip=5&limit=20 -> params = {"skip": 5, "limit": 20}
```

FastAPI inspects the dependency function's parameters and automatically injects query parameters, path parameters, headers, etc. -- just like it does for route handlers.

### Async Dependencies

```python
async def get_current_user(token: str = Header(alias="Authorization")):
    # Async dependency -- can do database lookups, API calls, etc.
    user = await verify_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user

@app.get("/profile")
async def get_profile(user: User = Depends(get_current_user)):
    return {"user": user}
```

### Shared Dependencies (Common Parameters)

```python
from fastapi import Query

# Reusable pagination dependency
def pagination(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=10, ge=1, le=100),
):
    return {"skip": skip, "limit": limit}

@app.get("/users")
def list_users(page: dict = Depends(pagination)):
    return {"users": [], **page}

@app.get("/posts")
def list_posts(page: dict = Depends(pagination)):
    return {"posts": [], **page}

@app.get("/comments")
def list_comments(page: dict = Depends(pagination)):
    return {"comments": [], **page}
```

This is like Express middleware that parses and validates pagination params, but type-safe and reusable.

---

## Class-Based Dependencies

For more complex dependencies, you can use classes. This is closer to NestJS's `@Injectable()` services.

### NestJS

```typescript
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(skip: number, limit: number) {
    return this.prisma.user.findMany({ skip, take: limit });
  }
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@Query('skip') skip: number, @Query('limit') limit: number) {
    return this.usersService.findAll(skip, limit);
  }
}
```

### FastAPI

```python
from fastapi import Depends, Query

class Pagination:
    def __init__(
        self,
        skip: int = Query(default=0, ge=0),
        limit: int = Query(default=10, ge=1, le=100),
    ):
        self.skip = skip
        self.limit = limit

@app.get("/users")
def list_users(pagination: Pagination = Depends()):
    # Note: Depends() with no argument uses the type hint (Pagination)
    return {"skip": pagination.skip, "limit": pagination.limit}
```

### A More Realistic Class Dependency

```python
class ItemFilter:
    def __init__(
        self,
        q: str | None = Query(default=None, min_length=1),
        category: str | None = Query(default=None),
        min_price: float = Query(default=0, ge=0),
        max_price: float = Query(default=float("inf"), ge=0),
        sort_by: str = Query(default="created_at", pattern="^(name|price|created_at)$"),
        order: str = Query(default="desc", pattern="^(asc|desc)$"),
    ):
        self.q = q
        self.category = category
        self.min_price = min_price
        self.max_price = max_price
        self.sort_by = sort_by
        self.order = order

@app.get("/items")
def list_items(filters: ItemFilter = Depends()):
    # All query params are validated and organized in a single object
    return {
        "filters": {
            "q": filters.q,
            "category": filters.category,
            "price_range": [filters.min_price, filters.max_price],
            "sort": f"{filters.sort_by} {filters.order}",
        }
    }
```

---

## Nested Dependencies (Dependency Chains)

Dependencies can depend on other dependencies. FastAPI resolves the entire chain.

```python
from fastapi import Depends, Header, HTTPException

# Level 1: Extract token from header
def get_token(authorization: str = Header()):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid auth header")
    return authorization.split(" ")[1]

# Level 2: Verify token and get user (depends on get_token)
async def get_current_user(token: str = Depends(get_token)):
    user = await verify_jwt(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user

# Level 3: Check if user is admin (depends on get_current_user)
async def get_admin_user(user: User = Depends(get_current_user)):
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# Route: only uses the final dependency, but the whole chain executes
@app.get("/admin/dashboard")
async def admin_dashboard(admin: User = Depends(get_admin_user)):
    return {"message": f"Welcome, admin {admin.name}"}
```

**Execution flow**: `get_token` -> `get_current_user` -> `get_admin_user` -> `admin_dashboard`

This is like having chained Express middleware, but type-safe:

```javascript
// Express equivalent (less elegant)
app.get('/admin/dashboard',
  extractToken,       // middleware 1
  verifyUser,         // middleware 2
  requireAdmin,       // middleware 3
  (req, res) => {     // handler
    res.json({ message: `Welcome, admin ${req.user.name}` });
  }
);
```

---

## Yield Dependencies (with Cleanup)

This is a killer feature. Dependencies that use `yield` can run cleanup code after the response is sent. This is perfect for database sessions, file handles, temporary resources, etc.

### The Database Session Pattern

```python
from sqlalchemy.orm import Session

# This dependency creates a DB session and ensures it's closed after the request
def get_db():
    db = SessionLocal()  # Create session
    try:
        yield db         # Provide it to the route handler
    finally:
        db.close()       # Cleanup: always close, even if there was an error

@app.get("/users")
def list_users(db: Session = Depends(get_db)):
    # db is a live database session
    users = db.query(User).all()
    return users
    # After this function returns, the 'finally' block in get_db runs
```

### How It Works

```python
def my_dependency():
    # SETUP: runs before the route handler
    resource = acquire_resource()
    try:
        yield resource  # This value is injected into the route handler
    finally:
        # CLEANUP: runs after the route handler (even on exceptions)
        resource.release()
```

Think of it like a context manager (`with` statement) but for dependencies.

### Express.js Comparison

In Express, you'd use middleware with cleanup in `res.on('finish')`:

```javascript
// Express: awkward cleanup
app.use((req, res, next) => {
  req.db = new DatabaseSession();
  res.on('finish', () => {
    req.db.close();  // Cleanup after response
  });
  next();
});
```

FastAPI's yield pattern is much cleaner.

### Another Example: Temporary File

```python
import tempfile
import os

def get_temp_file():
    tmp = tempfile.NamedTemporaryFile(delete=False)
    try:
        yield tmp
    finally:
        tmp.close()
        os.unlink(tmp.name)  # Delete temp file after request

@app.post("/process")
async def process_data(tmp_file = Depends(get_temp_file)):
    tmp_file.write(b"some data")
    # Process...
    return {"status": "done"}
    # Temp file is automatically cleaned up
```

---

## Dependency Overrides for Testing

This is the feature that makes FastAPI extremely testable. You can swap out any dependency during tests.

### The Problem in Express

```javascript
// Express: mocking is painful
// You need proxyquire, rewire, jest.mock, or restructure your code
jest.mock('../database', () => ({
  getConnection: () => mockConnection,
}));
```

### FastAPI: Simple Overrides

```python
# app/main.py
from fastapi import FastAPI, Depends

app = FastAPI()

def get_db():
    db = RealDatabase()
    try:
        yield db
    finally:
        db.close()

@app.get("/users")
def list_users(db = Depends(get_db)):
    return db.query("SELECT * FROM users")
```

```python
# tests/test_users.py
from fastapi.testclient import TestClient
from app.main import app, get_db

# Create a fake database dependency
def override_get_db():
    fake_db = FakeDatabase()
    try:
        yield fake_db
    finally:
        fake_db.close()

# Override the real dependency with the fake one
app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

def test_list_users():
    response = client.get("/users")
    assert response.status_code == 200

# Clean up after tests
app.dependency_overrides.clear()
```

That's it. No mocking libraries, no monkey-patching, no complex setup. Just swap the dependency function.

### Overriding for Different Test Scenarios

```python
def test_empty_database():
    def empty_db():
        yield FakeDB(data=[])
    app.dependency_overrides[get_db] = empty_db

    response = client.get("/users")
    assert response.json() == []

def test_database_error():
    def broken_db():
        raise DatabaseError("Connection refused")
    app.dependency_overrides[get_db] = broken_db

    response = client.get("/users")
    assert response.status_code == 500
```

---

## Global Dependencies

Apply dependencies to all routes (like Express `app.use()` middleware).

```python
from fastapi import FastAPI, Depends, Header, HTTPException

# This dependency runs for EVERY route
async def verify_api_key(x_api_key: str = Header()):
    if x_api_key != "expected-key":
        raise HTTPException(status_code=403, detail="Invalid API key")

# Apply globally
app = FastAPI(dependencies=[Depends(verify_api_key)])

@app.get("/users")
def list_users():
    # API key was already verified
    return []

@app.get("/items")
def list_items():
    # API key was already verified here too
    return []
```

### Router-Level Dependencies

```python
from fastapi import APIRouter, Depends

# Apply dependencies to a group of routes
admin_router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(get_admin_user)],  # All admin routes require admin
)

@admin_router.get("/dashboard")
def admin_dashboard():
    return {"message": "Admin area"}

@admin_router.get("/users")
def admin_list_users():
    return {"message": "All users"}

app.include_router(admin_router)
```

---

## Real-World DI Pattern: Service Layer

Here's a complete example showing how DI creates a clean architecture:

```python
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

app = FastAPI()

# --- Schemas (DTOs) ---
class UserCreate(BaseModel):
    name: str
    email: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str

    model_config = {"from_attributes": True}

# --- Dependencies ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Service Layer ---
class UserService:
    def __init__(self, db: Session):
        self.db = db

    def get_user(self, user_id: int):
        user = self.db.query(UserModel).filter(UserModel.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user

    def create_user(self, data: UserCreate):
        user = UserModel(**data.model_dump())
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def list_users(self, skip: int = 0, limit: int = 10):
        return self.db.query(UserModel).offset(skip).limit(limit).all()

# Dependency that creates the service
def get_user_service(db: Session = Depends(get_db)) -> UserService:
    return UserService(db)

# --- Routes ---
@app.get("/users", response_model=list[UserResponse])
def list_users(
    skip: int = 0,
    limit: int = 10,
    service: UserService = Depends(get_user_service),
):
    return service.list_users(skip, limit)

@app.get("/users/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    service: UserService = Depends(get_user_service),
):
    return service.get_user(user_id)

@app.post("/users", response_model=UserResponse, status_code=201)
def create_user(
    user: UserCreate,
    service: UserService = Depends(get_user_service),
):
    return service.create_user(user)
```

### The Equivalent NestJS Pattern

```typescript
// NestJS version -- very similar structure!
@Injectable()
export class UserService {
  constructor(@InjectRepository(User) private repo: Repository<User>) {}

  async findAll(skip: number, limit: number) {
    return this.repo.find({ skip, take: limit });
  }

  async findOne(id: number) {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  findAll(@Query('skip') skip: number, @Query('limit') limit: number) {
    return this.userService.findAll(skip, limit);
  }
}
```

---

## Practice Exercises

### Exercise 1: Reusable Pagination
Create a `Pagination` class dependency that extracts `page` (default 1, min 1) and `per_page` (default 20, min 1, max 100) from query params and computes `skip` and `limit`. Use it in at least two different endpoints.

### Exercise 2: API Key Authentication
Create a dependency `verify_api_key` that reads an `X-API-Key` header and checks it against a hardcoded key. Apply it globally. Then create a test that overrides this dependency to bypass authentication.

### Exercise 3: Dependency Chain
Build a three-level dependency chain:
1. `get_settings()` -- returns app configuration
2. `get_db(settings)` -- creates a DB connection using settings
3. `get_user_repo(db)` -- creates a UserRepository with the DB connection

Use all three in a route handler.

### Exercise 4: Yield Dependency with Cleanup
Create a dependency that:
1. Logs "Starting request" with a timestamp
2. Yields a request context object with a unique request ID
3. After the route handler completes, logs "Request completed" with duration

```python
import time
import uuid

def request_context():
    request_id = str(uuid.uuid4())
    start_time = time.time()
    print(f"[{request_id}] Starting request")
    try:
        yield {"request_id": request_id, "start_time": start_time}
    finally:
        duration = time.time() - start_time
        print(f"[{request_id}] Request completed in {duration:.3f}s")
```

### Exercise 5: Dependency Override Testing
Given an endpoint that depends on an external API (simulated), write tests that override the dependency to return:
1. Successful mock data
2. Empty data
3. An error

```python
async def get_weather(city: str) -> dict:
    """In production, this calls a weather API."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"https://api.weather.com/{city}")
        return resp.json()

@app.get("/weather/{city}")
async def weather(city: str, data: dict = Depends(get_weather)):
    return {"city": city, "weather": data}
```

Write test overrides that don't call the real API.
