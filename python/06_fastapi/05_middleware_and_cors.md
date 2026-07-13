# 05 - Middleware aur CORS

## Middleware: FastAPI vs Express

Socho ek second ke liye — jab koi request aata hai toh aise scenarios hote hain jahan humhe kuch kaam har request ke pehle ya baad mein karna padta hai. Logging karna, security headers add karna, rate limiting check karna — ye sab middleware ke through hote hain.

FastAPI mein middleware ka concept Express.js se exactly same hai — code jo har request se pehle aur/ya baad mein run hota hai. Syntax alag hai, concept same hai.

### Express.js Middleware

```javascript
// Express middleware signature: (req, res, next)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  const start = Date.now();
  res.on('finish', () => {
    console.log(`Completed in ${Date.now() - start}ms`);
  });
  next(); // Pass to next middleware/handler
});
```

### FastAPI Middleware

```python
from fastapi import FastAPI, Request
import time

app = FastAPI()

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    print(f"{request.method} {request.url}")

    response = await call_next(request)  # Express ke next() jaisa kaam karta hai

    duration = time.time() - start_time
    print(f"Completed in {duration:.3f}s")
    response.headers["X-Process-Time"] = str(duration)
    return response
```

### Key Differences

| Express | FastAPI |
|---|---|
| `next()` se next middleware mein jaate ho | `await call_next(request)` same kaam karta hai |
| Response `res` parameter se milta hai | `call_next` return karta hai response |
| `res.on('finish', ...)` post-response kaam ke liye | `await call_next()` ke baad code automatically run hota hai |
| Request object modify kar sakte ho | Request ko `call_next` se pehle modify kar sakte ho |
| Response modify kar sakte ho `res` se | Response ko `call_next()` ke baad modify kar sakte ho |

---

## @app.middleware Decorator

### Security Headers Add Karna

Kyun zaruri hai? Jaise Zomato apne requests ko HTTPS ke through protect karta hai, waise hi humhe security headers add karne padते hain taaki browser malicious attacks se bach sake.

```python
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000"
    return response
```

### Request Logging

```python
import logging
import uuid

logger = logging.getLogger("api")

@app.middleware("http")
async def request_logging(request: Request, call_next):
    # Har request ko unique ID de do taaki tracking easy ho
    request_id = str(uuid.uuid4())[:8]
    logger.info(f"[{request_id}] {request.method} {request.url.path}")

    response = await call_next(request)

    logger.info(f"[{request_id}] Status: {response.status_code}")
    response.headers["X-Request-ID"] = request_id
    return response
```

### Errors Ko Middleware Mein Catch Karna

Agar kisi route mein exception aaye toh middleware se catch kar sakte ho. Jaise Swiggy ke delivery guys ko order issue aane par fallback handler hota hai, waise hi.

```python
from fastapi.responses import JSONResponse

@app.middleware("http")
async def error_handling_middleware(request: Request, call_next):
    try:
        response = await call_next(request)
        return response
    except Exception as e:
        # Unhandled exceptions ko yahan catch kar lo
        logger.error(f"Unhandled error: {e}")
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )
```

### Conditional Middleware Logic

```python
@app.middleware("http")
async def api_key_middleware(request: Request, call_next):
    # Kuch public paths hote hain jahan auth nahi chahiye (Express ke unless pattern jaisa)
    public_paths = ["/", "/docs", "/redoc", "/openapi.json", "/health"]

    if request.url.path not in public_paths:
        api_key = request.headers.get("X-API-Key")
        if api_key != "expected-key":
            return JSONResponse(
                status_code=403,
                content={"detail": "Invalid API key"},
            )

    return await call_next(request)
```

---

## CORS (Cross-Origin Resource Sharing)

### Kya hota hai CORS?

Imagine Flipkart ka frontend `flipkart.com` se load hota hai aur backend `api.flipkart.com` mein hai. Browser default mein different origins ko communicate karne nahi deta (same-origin policy). CORS is basically browser ko batana taaki wo cross-origin requests allow kare.

### Express.js Mein

```javascript
const cors = require('cors');

// Simple: sab kuch allow karo
app.use(cors());

// Configured
app.use(cors({
  origin: ['http://localhost:3000', 'https://myapp.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400,
}));
```

### FastAPI Mein

```python
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# CORS middleware add karo
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",     # React dev server
        "http://localhost:5173",     # Vite dev server
        "https://myapp.com",        # Production frontend
    ],
    allow_credentials=True,
    allow_methods=["*"],              # Sab methods allow karo
    allow_headers=["*"],              # Sab headers allow karo
    expose_headers=["X-Total-Count"],  # Browser ye headers padh sakta hai
    max_age=86400,                    # Preflight request ka cache time (seconds)
)
```

### Development vs Production CORS

```python
import os

origins = []
if os.getenv("ENV") == "development":
    origins = ["*"]  # Dev mein sab kuch allow karo
else:
    origins = [
        "https://myapp.com",
        "https://www.myapp.com",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Authorization", "Content-Type"],
)
```

> [!warning]
> **Zaruri Batein**: `allow_origins=["*"]` aur `allow_credentials=True` ek saath nahi chal sakte. Ye browser ka security rule hai. Jab credentials chahiye toh specific origins dena padta hai.

---

## Custom Middleware Classes

Jab simple middleware se kaam nahi ho, toh class-based approach use kar sakte ho. Iska faida ye hai ki logic ko reusable banaya ja sakta hai.

### Express.js Pattern

```javascript
// middleware/rateLimit.js
class RateLimiter {
  constructor(options) {
    this.maxRequests = options.maxRequests;
    this.windowMs = options.windowMs;
    this.requests = new Map();
  }

  middleware() {
    return (req, res, next) => {
      const ip = req.ip;
      // ... rate limiting logic
      next();
    };
  }
}

app.use(new RateLimiter({ maxRequests: 100, windowMs: 60000 }).middleware());
```

### FastAPI Pattern

```python
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
import time

class TimingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = f"{process_time:.4f}"
        return response

# Register karo
app.add_middleware(TimingMiddleware)
```

### Ek Detailed Example: Simple Rate Limiter

Socho IRCTC ka ticket booking system — agar koi user ek minute mein 100 se zyada requests bhej de toh server ko block karna padta hai (otherwise bots book kar lenge). Ye rate limiter exactly ye kaam karta hai.

```python
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from collections import defaultdict
import time

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_requests: int = 100, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host
        now = time.time()

        # Purane requests ko nikal do (jo time window se bahar ho gaye)
        self.requests[client_ip] = [
            t for t in self.requests[client_ip]
            if now - t < self.window_seconds
        ]

        # Check karo limit exceed toh nahi hua
        if len(self.requests[client_ip]) >= self.max_requests:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests"},
                headers={
                    "Retry-After": str(self.window_seconds),
                    "X-RateLimit-Limit": str(self.max_requests),
                    "X-RateLimit-Remaining": "0",
                },
            )

        # Abhi wali request ko record karo
        self.requests[client_ip].append(now)

        response = await call_next(request)
        remaining = self.max_requests - len(self.requests[client_ip])
        response.headers["X-RateLimit-Limit"] = str(self.max_requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        return response

# Use karo
app.add_middleware(RateLimitMiddleware, max_requests=100, window_seconds=60)
```

---

## Middleware Execution Order

**Zaruri concept**: FastAPI mein middleware **reverse order** mein execute hote hain! Last added middleware first run hota hai (onion layers like).

```python
app = FastAPI()

@app.middleware("http")
async def middleware_a(request: Request, call_next):
    print("A: before")
    response = await call_next(request)
    print("A: after")
    return response

@app.middleware("http")
async def middleware_b(request: Request, call_next):
    print("B: before")
    response = await call_next(request)
    print("B: after")
    return response

# Request aaye toh output:
# B: before    (last added = outermost = pehle run hota hai)
# A: before
# [route handler execute hota hai]
# A: after
# B: after     (outermost = last mein finish hota hai)
```

Ye onion ke layers jaisa hai. Express mein toh order normal hota hai (pehle add = pehle run), FastAPI mein reverse.

### add_middleware() Se Bhi Same Behavior

```python
app.add_middleware(CORSMiddleware, ...)    # Pehle add, last mein run
app.add_middleware(TimingMiddleware)        # Baad mein add, pehle run
```

> [!tip]
> **Practical Strategy**: CORS middleware ko **last mein add karo** (taaki ye pehle run ho) aur preflight requests ko kisi se pehle handle kare.

```python
app.add_middleware(TimingMiddleware)        # Doosra execute hoga
app.add_middleware(RateLimitMiddleware)     # Teesra execute hoga
app.add_middleware(CORSMiddleware, ...)     # Pehla execute hoga
```

---

## Lifespan Events (Startup/Shutdown)

### Kya hote hain Lifespan Events?

Jab app start hota hai toh database connect karna padta hai, caches initialize karna padta hai. Aur jab graceful shutdown hota hai toh cleanups karne padते हैं। Ye lifespan events ke through hote hain।

### Express.js

```javascript
// Express mein startup/shutdown
const server = app.listen(3000, () => {
  console.log('Server started');
  // Database, cache initialize karo
});

process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await db.close();
  server.close();
});
```

### FastAPI (Modern: Context Manager)

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI

# Demo ke liye fake database aur cache
fake_db = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    # STARTUP: app requests accept karne se pehle run hota hai
    print("Starting up...")
    fake_db["connection"] = "connected"
    # Yahan aur kya kar sakte ho:
    # - Database connection pool initialize
    # - ML models load karna
    # - Redis se connect karna
    # - Background schedulers start karna

    yield  # App yahan chalti hai, requests serve karta hai

    # SHUTDOWN: jab app ruk raha ho
    print("Shutting down...")
    fake_db.clear()
    # Connections close karo, caches flush karo, etc.

app = FastAPI(lifespan=lifespan)

@app.get("/")
def root():
    return {"db_status": fake_db.get("connection", "disconnected")}
```

### Real-World Example: Database aur External Services Ke Saath

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
import httpx
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Initializing resources...")

    # Database engine banao
    app.state.db_engine = create_async_engine(
        "postgresql+asyncpg://user:pass@localhost/mydb"
    )

    # External API ke liye HTTP client banao
    app.state.http_client = httpx.AsyncClient(
        base_url="https://api.external-service.com",
        timeout=30.0,
    )

    print("Resources initialized!")

    yield

    # Shutdown
    print("Cleaning up resources...")
    await app.state.http_client.aclose()
    await app.state.db_engine.dispose()
    print("Cleanup complete!")

app = FastAPI(lifespan=lifespan)

@app.get("/external-data")
async def get_external_data(request: Request):
    # Shared resources ko app.state se access karo
    client = request.app.state.http_client
    response = await client.get("/data")
    return response.json()
```

### Purana Tarika: @app.on_event (abhi bhi kaam karta hai lekin use mat karo)

```python
# Purana style -- abhi bhi works but deprecated hai
@app.on_event("startup")
async def startup():
    print("Starting up")

@app.on_event("shutdown")
async def shutdown():
    print("Shutting down")
```

---

## Built-in Middleware

FastAPI (Starlette ke through) kuch useful middleware classes provide karta hai taaki reinvent karne ki zarurat na pade.

### TrustedHostMiddleware

Sirf specific hosts se requests accept karo।

```python
from starlette.middleware.trustedhost import TrustedHostMiddleware

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["myapp.com", "*.myapp.com"],
)
```

### GZipMiddleware

Express ke compression middleware jaisa — responses ko compress kar do।

```python
from starlette.middleware.gzip import GZipMiddleware

# 1000 bytes se bade responses ko compress karo
app.add_middleware(
    GZipMiddleware,
    minimum_size=1000,
)
```

### HTTPSRedirectMiddleware

Sab HTTP requests ko HTTPS mein redirect kar do।

```python
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware

# Ye middleware automatically HTTP ko HTTPS mein redirect karta hai
app.add_middleware(HTTPSRedirectMiddleware)
```

### Complete Middleware Stack Example

Socho production app mein aap ko CORS chahiye, compression chahiye, security checks chahiye, custom logging chahiye — sab ko kaise setup karte ho?

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
import time

app = FastAPI()

# Yaad rakho: order reversed hota hai (last added = first execute)

# 4th execute hoga: Custom timing
@app.middleware("http")
async def timing_middleware(request, call_next):
    start = time.time()
    response = await call_next(request)
    response.headers["X-Process-Time"] = str(time.time() - start)
    return response

# 3rd execute hoga: GZip compression
app.add_middleware(GZipMiddleware, minimum_size=500)

# 2nd execute hoga: Trusted hosts check
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["myapp.com", "*.myapp.com", "localhost"],
)

# 1st execute hoga: CORS (preflight requests ko sab se pehle handle kare)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://frontend.myapp.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Practice Exercises

### Exercise 1: Request Logger Middleware

Middleware banao jo log kare:
- Timestamp
- HTTP method aur path
- Client ka IP address
- Response status code
- Response time (milliseconds mein)

Format: `[2024-01-15 10:30:00] GET /users 200 45ms (192.168.1.1)`

### Exercise 2: CORS Configuration

CORS middleware setup karo jo:
- Development mein: `http://localhost:3000` aur `http://localhost:5173` allow kare
- Production mein: sirf `https://myapp.com` allow kare
- Credentials allow kare
- `X-Total-Count` aur `X-Request-ID` headers expose kare
- `ENV` environment variable se config read kare

### Exercise 3: Custom Authentication Middleware

Class-based middleware banao jo:
- `/docs`, `/redoc`, `/openapi.json`, aur `/health` ke liye auth skip kare
- Baki sab paths ke liye `Authorization` header mein `Bearer` token check kare
- Agar token nahi hai toh 401 return kare
- Decoded user info ko `request.state` mein store kare (downstream use ke liye)

### Exercise 4: Lifespan with Shared Resources

FastAPI app banao lifespan handler ke saath jo:
- Startup mein: in-memory cache (dict) banaye aur `app.state` mein store kare
- Startup mein: "Cache initialized with 0 items" log kare
- Shutdown mein: "Cache had N items at shutdown" log kare
- Endpoints banao jo cache se read aur write kare

### Exercise 5: Middleware Chain

Ek app banao jo teen middleware layers rakhe:
1. **Outer**: `X-Request-ID` header (UUID) add kare request aur response dono mein
2. **Middle**: Request ID, method, aur path log kare
3. **Inner**: Response time measure kare aur `X-Response-Time` header add kare

Test endpoint banao aur verify karo ke response mein teen headers dikhें। Logging output mein request ID dikhe ye bhi check karo।
