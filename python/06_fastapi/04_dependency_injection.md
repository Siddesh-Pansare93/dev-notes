# 04 - Dependency Injection in FastAPI

## Overview

Dependency Injection (DI) FastAPI ka sabse powerful feature hai. Agar tune NestJS use kiya hai, toh tu bilkul ghar jaisa mehsoos karega. Agar tujhe sirf Express ka experience hai, toh yeh woh feature hai jiske liye tu socha bhi nahi tha kahin.

### Comparison dekho

| Framework | DI Approach |
|---|---|
| Express.js | Kuch nahi built-in. Tu khud sab kuch manually import kar ke call karta hai. |
| NestJS | Poora DI container `@Injectable()`, modules, providers ke saath |
| FastAPI | `Depends()` function -- NestJS se simpler lekin utna hi powerful |

### DI kyun zaroori hai?

Express mein tu typically aisa karta hai:

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

FastAPI mein DI ke saath? Bilkul alag hi scene:

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

Dekh! Tu bas declare kar de ki tujhe kya chahiye, aur FastAPI khud provide kar dega. Bilkul Zomato ka jaise — tujhe kya order karna hai, woh sab sambhal leta hai, tu bas order place kar.

---

## Function Dependencies

Sabse simple form hai — ek function jo kuch value return kare.

### Basic Example

```python
from fastapi import FastAPI, Depends

app = FastAPI()

# Yeh ek dependency hai -- bas ek normal function
def get_query_params(skip: int = 0, limit: int = 10):
    return {"skip": skip, "limit": limit}

# Depends() ke saath use kar
@app.get("/items")
def list_items(params: dict = Depends(get_query_params)):
    return {"params": params}
    # GET /items?skip=5&limit=20 -> params = {"skip": 5, "limit": 20}
```

FastAPI dependency function ke parameters ko inspect karta hai aur automatically query params, path params, headers etc. inject kar deta hai -- bilkul waise hi jaise route handlers ke liye karta hai.

### Async Dependencies

```python
async def get_current_user(token: str = Header(alias="Authorization")):
    # Async dependency -- database lookups, API calls kar sakte ho
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

Yeh bilkul Express middleware jaise hai jo pagination params ko parse aur validate kare, lekin type-safe aur reusable. Ek baar likha, sab jagah use kar.

---

## Class-Based Dependencies

Zyada complex dependencies ke liye classes use kar sakta hai. Yeh NestJS ke `@Injectable()` services jaisa hi hota hai.

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
    # Note: Depends() without argument uses the type hint (Pagination)
    return {"skip": pagination.skip, "limit": pagination.limit}
```

### Thoda Zyada Realistic Example

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
    # Sab query params validated aur ek object mein organized
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

Dependencies apne aap ke liye dependencies use kar sakte hain. FastAPI poora chain resolve kar deta hai.

```python
from fastapi import Depends, Header, HTTPException

# Level 1: Token ko header se nikaal
def get_token(authorization: str = Header()):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid auth header")
    return authorization.split(" ")[1]

# Level 2: Token verify karo aur user nikaal (get_token par depend karta hai)
async def get_current_user(token: str = Depends(get_token)):
    user = await verify_jwt(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user

# Level 3: Check karo ki user admin hai ya nahi (get_current_user par depend karta hai)
async def get_admin_user(user: User = Depends(get_current_user)):
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# Route: final dependency use karta hai, lekin poora chain execute hota hai
@app.get("/admin/dashboard")
async def admin_dashboard(admin: User = Depends(get_admin_user)):
    return {"message": f"Welcome, admin {admin.name}"}
```

**Execution flow**: `get_token` -> `get_current_user` -> `get_admin_user` -> `admin_dashboard`

Bilkul Express mein chained middleware jaisa, lekin type-safe:

```javascript
// Express equivalent (utna elegant nahi)
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

## Yield Dependencies (Cleanup ke Saath)

Yeh ek killer feature hai bhai. Dependencies jo `yield` use karte hain, response bhejne ke baad cleanup code run kar sakte hain. Database sessions, file handles, temporary resources -- sab kuch ke liye perfect.

### Database Session Pattern

```python
from sqlalchemy.orm import Session

# Yeh dependency DB session create karta hai aur request ke baad close karta hai
def get_db():
    db = SessionLocal()  # Create session
    try:
        yield db         # Route handler ko provide kar
    finally:
        db.close()       # Cleanup: hamesha close kar, agar error bhi aaye toh
```

```python
@app.get("/users")
def list_users(db: Session = Depends(get_db)):
    # db ek live database session hai
    users = db.query(User).all()
    return users
    # Jab yeh function return ho, get_db ka finally block run hota hai
```

### Kaise Kaam Karta Hai?

```python
def my_dependency():
    # SETUP: route handler se pehle chalega
    resource = acquire_resource()
    try:
        yield resource  # Yeh value route handler ko inject hota hai
    finally:
        # CLEANUP: route handler ke baad (agar exception bhi aaye toh)
        resource.release()
```

Bilkul `with` statement (`context manager`) jaisa, lekin dependencies ke liye.

### Express.js Comparison

Express mein cleanup awkward hota hai `res.on('finish')` ke through:

```javascript
// Express: awkward cleanup
app.use((req, res, next) => {
  req.db = new DatabaseSession();
  res.on('finish', () => {
    req.db.close();  // Response ke baad cleanup
  });
  next();
});
```

FastAPI ka yield pattern bilkul clean aur saaf hai.

### Ek Aur Example: Temporary File

```python
import tempfile
import os

def get_temp_file():
    tmp = tempfile.NamedTemporaryFile(delete=False)
    try:
        yield tmp
    finally:
        tmp.close()
        os.unlink(tmp.name)  # Request ke baad temp file delete kar

@app.post("/process")
async def process_data(tmp_file = Depends(get_temp_file)):
    tmp_file.write(b"some data")
    # Process...
    return {"status": "done"}
    # Temp file automatically delete ho jayega
```

---

## Dependency Overrides for Testing

Yeh feature FastAPI ko extremely testable banata hai. Testing ke dauraan kisi bhi dependency ko swap kar sakte ho.

### Express mein Problem

```javascript
// Express: mocking painful hota hai
// Tujhe proxyquire, rewire, jest.mock, ya code restructure karna padta hai
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

# Fake database dependency create kar
def override_get_db():
    fake_db = FakeDatabase()
    try:
        yield fake_db
    finally:
        fake_db.close()

# Real dependency ko fake se replace kar
app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

def test_list_users():
    response = client.get("/users")
    assert response.status_code == 200

# Tests ke baad cleanup
app.dependency_overrides.clear()
```

Bas itna! Koi mocking libraries nahi, koi monkey-patching nahi, complex setup nahi. Sirf dependency function ko swap kar.

### Alag Alag Test Scenarios Ke Liye Override

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

Sab routes ke liye dependencies apply kar (Express ke `app.use()` middleware jaisa).

```python
from fastapi import FastAPI, Depends, Header, HTTPException

# Yeh dependency EVERY route ke liye run hota hai
async def verify_api_key(x_api_key: str = Header()):
    if x_api_key != "expected-key":
        raise HTTPException(status_code=403, detail="Invalid API key")

# Globally apply kar
app = FastAPI(dependencies=[Depends(verify_api_key)])

@app.get("/users")
def list_users():
    # API key pehle se hi verify ho gai
    return []

@app.get("/items")
def list_items():
    # API key yahan bhi pehle se verify ho gai
    return []
```

### Router-Level Dependencies

```python
from fastapi import APIRouter, Depends

# Routes ke group ke liye dependencies apply kar
admin_router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(get_admin_user)],  # Sab admin routes ko admin chahiye
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

Ek complete example jo dikhaye ki DI kaise clean architecture banata hai:

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

# Service create karne ke liye dependency
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

### NestJS mein Equivalent Pattern

```typescript
// NestJS version -- structure bilkul same hai!
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
`Pagination` class dependency banaa jo query params se `page` (default 1, min 1) aur `per_page` (default 20, min 1, max 100) extract kare aur `skip` aur `limit` compute kare. Atleast do alag endpoints mein use kar.

### Exercise 2: API Key Authentication
`verify_api_key` dependency banaa jo `X-API-Key` header padhaye aur hardcoded key se check kare. Globally apply kar. Phir ek test likho jo is dependency ko override karke authentication bypass kare.

### Exercise 3: Dependency Chain
Ek three-level dependency chain banaa:
1. `get_settings()` -- app configuration return kare
2. `get_db(settings)` -- settings use karke DB connection create kare
3. `get_user_repo(db)` -- DB connection use karke UserRepository create kare

Teeno ko ek route handler mein use kar.

### Exercise 4: Yield Dependency with Cleanup
Ek dependency banaa jo:
1. "Starting request" ko timestamp ke saath log kare
2. Ek request context object yield kare jo unique request ID rakhe
3. Route handler complete hone ke baad, "Request completed" ko duration ke saath log kare

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
Ek endpoint banaa jo external API (simulated) par depend kare, phir tests likho jo dependency ko override karke ye sab return karain:
1. Successful mock data
2. Empty data
3. Ek error

```python
async def get_weather(city: str) -> dict:
    """Production mein yeh weather API ko call karta hai."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"https://api.weather.com/{city}")
        return resp.json()

@app.get("/weather/{city}")
async def weather(city: str, data: dict = Depends(get_weather)):
    return {"city": city, "weather": data}
```

Tests likho jinhe real API call karna padhe nahi.
