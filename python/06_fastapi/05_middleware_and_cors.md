# 05 - Middleware and CORS

## Middleware: FastAPI vs Express

Middleware in FastAPI works similarly to Express middleware -- it's code that runs before and/or after every request. The syntax is different, but the concept is identical.

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

    response = await call_next(request)  # This is like calling next() in Express

    duration = time.time() - start_time
    print(f"Completed in {duration:.3f}s")
    response.headers["X-Process-Time"] = str(duration)
    return response
```

### Key Differences

| Express | FastAPI |
|---|---|
| `next()` passes to the next middleware | `await call_next(request)` does the same |
| Access response via `res` parameter | `call_next` returns the response |
| `res.on('finish', ...)` for post-response work | Code after `await call_next()` runs after response |
| Can modify `req` object | Can modify request before `call_next` |
| Can modify response via `res` | Can modify response object after `call_next` |

---

## The @app.middleware Decorator

### Adding Custom Headers

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
    request_id = str(uuid.uuid4())[:8]
    logger.info(f"[{request_id}] {request.method} {request.url.path}")

    response = await call_next(request)

    logger.info(f"[{request_id}] Status: {response.status_code}")
    response.headers["X-Request-ID"] = request_id
    return response
```

### Catching Errors in Middleware

```python
from fastapi.responses import JSONResponse

@app.middleware("http")
async def error_handling_middleware(request: Request, call_next):
    try:
        response = await call_next(request)
        return response
    except Exception as e:
        # Catch unhandled exceptions
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
    # Skip auth for certain paths (like Express's unless pattern)
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

### Express.js

```javascript
const cors = require('cors');

// Simple: allow everything
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

### FastAPI

```python
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",     # React dev server
        "http://localhost:5173",     # Vite dev server
        "https://myapp.com",        # Production frontend
    ],
    allow_credentials=True,
    allow_methods=["*"],              # Allow all methods
    allow_headers=["*"],              # Allow all headers
    expose_headers=["X-Total-Count"],  # Headers the browser can read
    max_age=86400,                    # Preflight cache duration in seconds
)
```

### Development vs Production CORS

```python
import os

origins = []
if os.getenv("ENV") == "development":
    origins = ["*"]  # Allow everything in dev
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

**Warning**: `allow_origins=["*"]` and `allow_credentials=True` together won't work (browser security restriction). Use specific origins when credentials are needed.

---

## Custom Middleware Classes

For more complex middleware, you can create a class-based middleware. This is like creating custom Express middleware as a module.

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

# Register it
app.add_middleware(TimingMiddleware)
```

### A More Complex Example: Simple Rate Limiter

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

        # Clean old entries
        self.requests[client_ip] = [
            t for t in self.requests[client_ip]
            if now - t < self.window_seconds
        ]

        # Check limit
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

        # Record request
        self.requests[client_ip].append(now)

        response = await call_next(request)
        remaining = self.max_requests - len(self.requests[client_ip])
        response.headers["X-RateLimit-Limit"] = str(self.max_requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        return response

# Use it
app.add_middleware(RateLimitMiddleware, max_requests=100, window_seconds=60)
```

---

## Middleware Execution Order

Middleware in FastAPI executes in **reverse order** of how they're added. The last middleware added is the first to process the request (outermost layer).

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

# Output for a request:
# B: before    (last added = outermost = first to run)
# A: before
# [route handler executes]
# A: after
# B: after     (outermost = last to finish)
```

This is like an onion or a stack. In Express, middleware runs in the order it's added (first added = first to run). In FastAPI, it's reversed.

### With add_middleware, order is also reversed:

```python
app.add_middleware(CORSMiddleware, ...)    # Added first, runs last
app.add_middleware(TimingMiddleware)        # Added second, runs first
```

**Practical tip**: Add CORS middleware last (so it runs first) to handle preflight requests before anything else:

```python
app.add_middleware(TimingMiddleware)        # Runs second
app.add_middleware(RateLimitMiddleware)     # Runs third
app.add_middleware(CORSMiddleware, ...)     # Added last, runs first
```

---

## Lifespan Events (Startup/Shutdown)

### Express.js

```javascript
// Express startup/shutdown
const server = app.listen(3000, () => {
  console.log('Server started');
  // Initialize database, cache, etc.
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

# Fake database and cache for demonstration
fake_db = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    # STARTUP: runs before the app starts accepting requests
    print("Starting up...")
    fake_db["connection"] = "connected"
    # You could also:
    # - Initialize database connection pools
    # - Load ML models
    # - Connect to Redis
    # - Start background schedulers

    yield  # App runs here, serving requests

    # SHUTDOWN: runs when the app is stopping
    print("Shutting down...")
    fake_db.clear()
    # Close connections, flush caches, etc.

app = FastAPI(lifespan=lifespan)

@app.get("/")
def root():
    return {"db_status": fake_db.get("connection", "disconnected")}
```

### Real-World Lifespan Example

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
import httpx
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Initializing resources...")

    # Create database engine
    app.state.db_engine = create_async_engine(
        "postgresql+asyncpg://user:pass@localhost/mydb"
    )

    # Create HTTP client for external APIs
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
    # Access shared resources via app.state
    client = request.app.state.http_client
    response = await client.get("/data")
    return response.json()
```

### Deprecated: @app.on_event (still works but use lifespan instead)

```python
# Old style -- still works but deprecated
@app.on_event("startup")
async def startup():
    print("Starting up")

@app.on_event("shutdown")
async def shutdown():
    print("Shutting down")
```

---

## Built-in Middleware

FastAPI (via Starlette) provides several useful middleware classes.

### TrustedHostMiddleware

```python
from starlette.middleware.trustedhost import TrustedHostMiddleware

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["myapp.com", "*.myapp.com"],
)
```

### GZipMiddleware

```python
from starlette.middleware.gzip import GZipMiddleware

# Like Express's compression middleware
app.add_middleware(
    GZipMiddleware,
    minimum_size=1000,  # Only compress responses larger than 1000 bytes
)
```

### HTTPSRedirectMiddleware

```python
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware

# Redirect all HTTP requests to HTTPS
app.add_middleware(HTTPSRedirectMiddleware)
```

### Complete Middleware Stack Example

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

app = FastAPI()

# Remember: order is reversed (last added = first to execute)

# 4th to execute: Custom timing
@app.middleware("http")
async def timing_middleware(request, call_next):
    start = time.time()
    response = await call_next(request)
    response.headers["X-Process-Time"] = str(time.time() - start)
    return response

# 3rd to execute: GZip compression
app.add_middleware(GZipMiddleware, minimum_size=500)

# 2nd to execute: Trusted hosts
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["myapp.com", "*.myapp.com", "localhost"],
)

# 1st to execute: CORS (handles preflight before anything else)
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
Create middleware that logs:
- Timestamp
- HTTP method and path
- Client IP
- Response status code
- Response time in milliseconds

Format: `[2024-01-15 10:30:00] GET /users 200 45ms (192.168.1.1)`

### Exercise 2: CORS Configuration
Set up CORS middleware that:
- In development: allows `http://localhost:3000` and `http://localhost:5173`
- In production: allows only `https://myapp.com`
- Allows credentials
- Exposes `X-Total-Count` and `X-Request-ID` headers
- Read the environment from an `ENV` environment variable

### Exercise 3: Custom Authentication Middleware
Create a class-based middleware that:
- Skips authentication for `/docs`, `/redoc`, `/openapi.json`, and `/health`
- For all other paths, checks for a `Bearer` token in the `Authorization` header
- Returns 401 if no token is present
- Adds the decoded user info to request.state for downstream use

### Exercise 4: Lifespan with Shared Resources
Create a FastAPI app with a lifespan handler that:
- On startup: creates an in-memory cache (dict) and stores it in `app.state`
- On startup: logs "Cache initialized with 0 items"
- On shutdown: logs "Cache had N items at shutdown"
- Create endpoints that read from and write to this shared cache

### Exercise 5: Middleware Chain
Build an app with three middleware layers:
1. **Outer**: Adds `X-Request-ID` header (UUID) to both request and response
2. **Middle**: Logs the request ID, method, and path
3. **Inner**: Measures response time and adds `X-Response-Time` header

Create a test endpoint and verify all three headers appear in the response. Verify the logging output shows the request ID.
