# Project: Dockerize a Python FastAPI App

## What You'll Build

A production-ready Docker image for a FastAPI application, with:
- Multi-stage build
- Dependency management with pip
- Health check endpoint
- Non-root user

---

## The Application

```
fastapi-app/
├── app/
│   ├── __init__.py
│   ├── main.py
│   └── routers/
│       └── items.py
├── requirements.txt
├── requirements-dev.txt
├── Dockerfile
└── .dockerignore
```

**app/main.py**:
```python
from fastapi import FastAPI
from app.routers import items
import time
import os

app = FastAPI(title="Items API", version="1.0.0")

START_TIME = time.time()

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "uptime_seconds": round(time.time() - START_TIME, 2),
        "environment": os.getenv("APP_ENV", "development"),
    }

app.include_router(items.router, prefix="/api/items", tags=["items"])
```

**app/routers/items.py**:
```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class Item(BaseModel):
    id: Optional[int] = None
    name: str
    price: float
    in_stock: bool = True

# In-memory store
items_db: list[Item] = [
    Item(id=1, name="Widget", price=9.99),
    Item(id=2, name="Gadget", price=24.99),
]

@router.get("/", response_model=list[Item])
def list_items():
    return items_db

@router.get("/{item_id}", response_model=Item)
def get_item(item_id: int):
    item = next((i for i in items_db if i.id == item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@router.post("/", response_model=Item, status_code=201)
def create_item(item: Item):
    item.id = max((i.id for i in items_db), default=0) + 1
    items_db.append(item)
    return item
```

**requirements.txt**:
```
fastapi==0.109.0
uvicorn[standard]==0.27.0
pydantic==2.5.3
```

**requirements-dev.txt**:
```
pytest==7.4.0
httpx==0.26.0
pytest-asyncio==0.23.0
```

---

## Dockerfile (Multi-Stage)

```dockerfile
# ─── Stage 1: Install dependencies ──────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /app

# Install pip dependencies into a prefix dir
# So we can copy just the installed packages in stage 2
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ─── Stage 2: Production image ───────────────────────────────
FROM python:3.12-slim AS production

# Create non-root user
RUN addgroup --system appgroup \
    && adduser --system --ingroup appgroup --no-create-home appuser

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application source
COPY --chown=appuser:appgroup app/ ./app/

# Switch to non-root user
USER appuser

# Document port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

# Run with uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## .dockerignore

```
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
.env
.venv/
venv/
.git/
.gitignore
*.egg-info/
dist/
build/
.pytest_cache/
.mypy_cache/
tests/
test_*.py
*_test.py
requirements-dev.txt
Dockerfile*
*.md
```

---

## Build and Test

```bash
# Build
docker build -t fastapi-app:v1.0.0 .

# Size check
docker images fastapi-app
# REPOSITORY    TAG       SIZE
# fastapi-app   v1.0.0    ~180MB

# Run
docker run -d \
  --name fastapi \
  -p 8000:8000 \
  -e APP_ENV=production \
  fastapi-app:v1.0.0

# Test
curl http://localhost:8000/health
# {"status":"ok","uptime_seconds":1.23,"environment":"production"}

curl http://localhost:8000/api/items
# [{"id":1,"name":"Widget","price":9.99,"in_stock":true},...]

curl -X POST http://localhost:8000/api/items \
  -H "Content-Type: application/json" \
  -d '{"name":"Thingamajig","price":4.99}'
# {"id":3,"name":"Thingamajig","price":4.99,"in_stock":true}

# Interactive docs (FastAPI auto-generates these!)
# Open in browser: http://localhost:8000/docs

# Clean up
docker rm -f fastapi
```

---

## Development with Live Reload

For development, mount source and use `--reload`:

```dockerfile
# Dockerfile.dev
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt requirements-dev.txt ./
RUN pip install --no-cache-dir -r requirements.txt -r requirements-dev.txt

# Source mounted at runtime

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

```bash
docker build -f Dockerfile.dev -t fastapi-dev .

docker run -d \
  --name fastapi-dev \
  -p 8000:8000 \
  -v $(pwd)/app:/app/app \    # live reload
  fastapi-dev

# Edit app/main.py → uvicorn auto-reloads
```

---

## Running Tests

```bash
# Run tests inside a container (no local Python needed)
docker run --rm \
  -v $(pwd):/app \
  -w /app \
  python:3.12-slim \
  sh -c "pip install -q -r requirements.txt -r requirements-dev.txt && pytest -v"
```

---

## Environment-Specific Config

```bash
# Development
docker run -d \
  -e APP_ENV=development \
  -e LOG_LEVEL=debug \
  -e DEBUG=true \
  -p 8000:8000 \
  fastapi-app:v1.0.0

# Production
docker run -d \
  -e APP_ENV=production \
  -e LOG_LEVEL=info \
  -e WORKERS=4 \
  --restart unless-stopped \
  -p 8000:8000 \
  fastapi-app:v1.0.0

# With multiple workers (production)
docker run -d \
  fastapi-app:v1.0.0 \
  uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

---

**Next**: [Full-Stack App to Kubernetes](./03_fullstack_to_kubernetes.md) — deploy your Compose app to K8s
