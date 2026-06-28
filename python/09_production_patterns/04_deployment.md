# Deployment: Docker, CI/CD, and Kubernetes for Python AI Backends

## The Python Deployment Story

Coming from Node.js, you are used to `npm run build && docker build .` and you are done.
Python deployment has a few more sharp edges (virtual environments, C extensions, large ML
dependencies), but the patterns are similar once you know them.

---

## 1. Docker for Python Apps

### Production Dockerfile (Multi-Stage Build)

```dockerfile
# ── Stage 1: Build dependencies ─────────────────────────
FROM python:3.12-slim AS builder

# Install system dependencies needed for compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first (cached layer)
COPY pyproject.toml ./
RUN pip install --no-cache-dir --prefix=/install .

# ── Stage 2: Production image ───────────────────────────
FROM python:3.12-slim AS production

# Security: run as non-root user
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application code
COPY src/ ./src/
COPY alembic.ini ./

# Set ownership
RUN chown -R appuser:appuser /app

USER appuser

# Environment
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

# Production entrypoint
CMD ["gunicorn", "src.main:app", \
     "--bind", "0.0.0.0:8000", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--workers", "4", \
     "--timeout", "120", \
     "--graceful-timeout", "30", \
     "--access-logfile", "-"]
```

### Node.js Dockerfile for Comparison

```dockerfile
# Node.js equivalent
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build

FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### Key Differences

| Aspect | Python | Node.js |
|--------|--------|---------|
| Base image | `python:3.12-slim` (120MB) | `node:20-slim` (70MB) |
| Dependencies | `pip install` | `npm ci` |
| Build artifacts | Installed packages in `/usr/local` | `node_modules/` + `dist/` |
| Virtual envs | Not needed in Docker (container IS the env) | N/A |
| C extensions | May need `build-essential` in builder stage | N/A (native addons rare) |
| ML libraries | Can add 500MB+ (numpy, torch) | Rarely an issue |

### Optimizing Image Size for ML Dependencies

```dockerfile
# If you need torch, numpy, etc. -- use a dedicated ML base image
FROM python:3.12-slim AS production

# Install only CPU versions (saves ~1.5GB over CUDA versions)
RUN pip install --no-cache-dir \
    torch --index-url https://download.pytorch.org/whl/cpu

# Or use multi-stage to strip test files and docs
FROM python:3.12-slim AS builder
RUN pip install --no-cache-dir --prefix=/install langchain langchain-openai
# Remove unnecessary files
RUN find /install -name "tests" -type d -exec rm -rf {} + && \
    find /install -name "*.pyc" -delete && \
    find /install -name "__pycache__" -type d -exec rm -rf {} +
```

---

## 2. uvicorn vs gunicorn

### Development: uvicorn

```bash
# Direct uvicorn -- like nodemon for Node.js
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

# With auto-reload on file changes
uvicorn src.main:app --reload --reload-dir src
```

### Production: gunicorn + uvicorn workers

In Node.js, you typically use `pm2` or the built-in `cluster` module for multi-process.
In Python, `gunicorn` is the standard process manager.

```bash
# Production command
gunicorn src.main:app \
    --bind 0.0.0.0:8000 \
    --worker-class uvicorn.workers.UvicornWorker \
    --workers 4 \
    --timeout 120 \
    --graceful-timeout 30 \
    --max-requests 1000 \
    --max-requests-jitter 50 \
    --access-logfile - \
    --error-logfile -
```

### Worker Configuration

```python
# gunicorn.conf.py -- equivalent to pm2 ecosystem config
import multiprocessing

# Workers: (2 * CPU cores) + 1 is the standard formula
# For LLM apps: fewer workers because each request uses significant memory
workers = min(multiprocessing.cpu_count() + 1, 4)
worker_class = "uvicorn.workers.UvicornWorker"

# Timeouts
timeout = 120         # Kill worker after 120s of no response
graceful_timeout = 30 # Give 30s to finish current requests on shutdown
keepalive = 5         # Keep connections alive for 5s

# Worker recycling (prevents memory leaks)
max_requests = 1000       # Restart worker after 1000 requests
max_requests_jitter = 50  # Add randomness to prevent all workers restarting at once

# Binding
bind = "0.0.0.0:8000"

# Logging
accesslog = "-"   # stdout
errorlog = "-"    # stderr
loglevel = "info"

# Hooks
def on_starting(server):
    """Called before master process starts."""
    pass

def post_fork(server, worker):
    """Called after a worker is forked -- initialize per-worker resources."""
    pass
```

```javascript
// pm2 ecosystem.config.js equivalent
module.exports = {
  apps: [{
    name: 'api',
    script: 'dist/main.js',
    instances: 4,           // = workers in gunicorn
    max_memory_restart: '1G',
    env: { NODE_ENV: 'production' },
  }],
};
```

### Why Not Just Use uvicorn in Production?

| Feature | uvicorn alone | gunicorn + uvicorn workers |
|---------|--------------|--------------------------|
| Multi-process | No (single process) | Yes (one per worker) |
| Worker management | No | Yes (restart crashed workers) |
| Graceful shutdown | Basic | Full (drain connections) |
| Memory leak protection | No | Yes (max_requests) |
| Hot reload | Yes (dev only) | No (use rolling deploys) |

---

## 3. Environment-Based Configuration

```python
# src/core/config.py (extended)
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )

    ENVIRONMENT: str = "development"

    # Different defaults per environment
    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @property
    def docs_url(self) -> str | None:
        """Disable Swagger UI in production."""
        return None if self.is_production else "/docs"

    @property
    def log_level(self) -> str:
        return "WARNING" if self.is_production else "DEBUG"

    @property
    def workers(self) -> int:
        """More workers in production."""
        import multiprocessing
        if self.is_production:
            return min(multiprocessing.cpu_count() + 1, 4)
        return 1
```

### .env Files

```bash
# .env.example (committed to repo)
ENVIRONMENT=development
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/mydb
OPENAI_API_KEY=sk-...
REDIS_URL=redis://localhost:6379/0
SENTRY_DSN=

# .env (gitignored -- local dev overrides)
OPENAI_API_KEY=sk-actual-key-here

# Production: set via Kubernetes Secrets, AWS Parameter Store, etc.
# NEVER commit production secrets to any file
```

---

## 4. CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  PYTHON_VERSION: "3.12"
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # ── Lint & Type Check ──────────────────────────────────
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}

      - name: Install dependencies
        run: |
          pip install ruff mypy
          pip install -e ".[dev]"

      - name: Lint with ruff
        run: ruff check src/ tests/

      - name: Format check with ruff
        run: ruff format --check src/ tests/

      - name: Type check with mypy
        run: mypy src/ --ignore-missing-imports

  # ── Tests ──────────────────────────────────────────────
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}
          cache: pip

      - name: Install dependencies
        run: pip install -e ".[dev]"

      - name: Run tests
        env:
          DATABASE_URL: postgresql+asyncpg://test:test@localhost:5432/testdb
          REDIS_URL: redis://localhost:6379/0
          OPENAI_API_KEY: sk-test-key  # Mock in tests
        run: |
          pytest tests/ \
            --cov=src \
            --cov-report=xml \
            --cov-report=term-missing \
            -v

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          file: ./coverage.xml

  # ── Build & Push Docker Image ──────────────────────────
  build:
    needs: [quality, test]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # ── Deploy ─────────────────────────────────────────────
  deploy:
    needs: [build]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production

    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/ai-backend \
            api=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          kubectl rollout status deployment/ai-backend --timeout=300s
```

### Node.js CI/CD Comparison

```yaml
# Typical Node.js CI/CD -- notice the similarities
jobs:
  quality:
    steps:
      - run: npm ci                    # pip install -e ".[dev]"
      - run: npx eslint src/           # ruff check src/
      - run: npx prettier --check src/ # ruff format --check src/
      - run: npx tsc --noEmit          # mypy src/

  test:
    steps:
      - run: npm ci
      - run: npm test -- --coverage    # pytest --cov=src

  build:
    steps:
      - run: docker build -t app .     # Same
      - run: docker push app           # Same
```

The tooling names differ, but the workflow is nearly identical.

---

## 5. Kubernetes Deployment

### Deployment Manifest

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-backend
  labels:
    app: ai-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ai-backend
  template:
    metadata:
      labels:
        app: ai-backend
    spec:
      containers:
        - name: api
          image: ghcr.io/myorg/ai-backend:latest
          ports:
            - containerPort: 8000
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
          env:
            - name: ENVIRONMENT
              value: "production"
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: ai-backend-secrets
                  key: database-url
            - name: OPENAI_API_KEY
              valueFrom:
                secretKeyRef:
                  name: ai-backend-secrets
                  key: openai-api-key
            - name: REDIS_URL
              valueFrom:
                configMapKeyRef:
                  name: ai-backend-config
                  key: redis-url

          # Health checks -- CRITICAL for zero-downtime deployments
          livenessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 15
            periodSeconds: 20
            failureThreshold: 3

          readinessProbe:
            httpGet:
              path: /ready
              port: 8000
            initialDelaySeconds: 5
            periodSeconds: 10
            failureThreshold: 3

          startupProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 10
            periodSeconds: 5
            failureThreshold: 30  # Give up to 150s for slow startup (ML model loading)

      # Graceful shutdown
      terminationGracePeriodSeconds: 60
```

### Service

```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: ai-backend
spec:
  selector:
    app: ai-backend
  ports:
    - port: 80
      targetPort: 8000
  type: ClusterIP
```

### ConfigMap and Secret

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ai-backend-config
data:
  redis-url: "redis://redis-service:6379/0"
  log-level: "INFO"
  environment: "production"

---
# k8s/secret.yaml (use sealed-secrets or external-secrets in practice)
apiVersion: v1
kind: Secret
metadata:
  name: ai-backend-secrets
type: Opaque
stringData:
  database-url: "postgresql+asyncpg://user:pass@postgres:5432/prod"
  openai-api-key: "sk-..."
```

### Horizontal Pod Autoscaler

```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ai-backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ai-backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
    # Custom metric: scale based on request queue depth
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: "100"
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Pods
          value: 2
          periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300  # Wait 5 min before scaling down
      policies:
        - type: Pods
          value: 1
          periodSeconds: 120
```

### Health Check Endpoints in FastAPI

```python
# src/api/v1/health.py
import structlog
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_db
from src.core.redis import get_redis

router = APIRouter(tags=["Health"])
logger = structlog.get_logger(__name__)


@router.get("/health")
async def health_check():
    """
    Liveness probe -- is the process running?
    Keep this fast and simple. No external dependency checks.

    Node.js equivalent: app.get('/health', (req, res) => res.json({ status: 'ok' }))
    """
    return {"status": "ok"}


@router.get("/ready")
async def readiness_check(
    db: AsyncSession = Depends(get_db),
):
    """
    Readiness probe -- can this instance serve traffic?
    Checks all critical dependencies.
    """
    checks = {}

    # Check database
    try:
        await db.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as e:
        logger.error("Database health check failed", error=str(e))
        checks["database"] = "error"

    # Check Redis
    try:
        redis = get_redis()
        await redis.ping()
        checks["redis"] = "ok"
    except Exception as e:
        logger.error("Redis health check failed", error=str(e))
        checks["redis"] = "error"

    # Check LLM API (optional -- don't call on every probe)
    checks["llm_api"] = "ok"  # Could do a lightweight check periodically

    all_ok = all(v == "ok" for v in checks.values())
    status_code = 200 if all_ok else 503

    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=status_code,
        content={"status": "ready" if all_ok else "not_ready", "checks": checks},
    )
```

---

## 6. Docker Compose for Local Development

```yaml
# docker-compose.yml
services:
  api:
    build:
      context: .
      target: production  # Use the production stage
    ports:
      - "8000:8000"
    environment:
      - ENVIRONMENT=development
      - DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/mydb
      - REDIS_URL=redis://redis:6379/0
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - ./src:/app/src  # Hot reload in development
    command: uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: mydb
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  # pgAdmin for database management (optional)
  pgadmin:
    image: dpage/pgadmin4
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@admin.com
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - "5050:80"
    depends_on:
      - db

volumes:
  pgdata:
```

```bash
# Start everything
docker compose up -d

# View logs
docker compose logs -f api

# Run database migrations
docker compose exec api alembic upgrade head

# Run tests inside the container
docker compose exec api pytest tests/ -v

# Rebuild after dependency changes
docker compose build api && docker compose up -d api
```

---

## 7. pyproject.toml: The Modern Python Project File

This is your `package.json` equivalent. Modern Python projects use this single file
for all project configuration.

```toml
# pyproject.toml
[project]
name = "my-ai-backend"
version = "1.0.0"
description = "Production AI backend with FastAPI and LangGraph"
requires-python = ">=3.11"

dependencies = [
    "fastapi>=0.110.0",
    "uvicorn[standard]>=0.27.0",
    "gunicorn>=21.2.0",
    "pydantic-settings>=2.1.0",
    "sqlalchemy[asyncio]>=2.0.25",
    "asyncpg>=0.29.0",
    "redis>=5.0.0",
    "langchain>=0.1.0",
    "langchain-openai>=0.0.5",
    "langgraph>=0.0.20",
    "structlog>=24.1.0",
    "sentry-sdk[fastapi]>=1.40.0",
    "httpx>=0.26.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0.0",
    "pytest-asyncio>=0.23.0",
    "pytest-cov>=4.1.0",
    "httpx>=0.26.0",       # For TestClient
    "ruff>=0.2.0",
    "mypy>=1.8.0",
    "fakeredis>=2.21.0",   # Redis mock
    "factory-boy>=3.3.0",  # Test factories
]

[build-system]
requires = ["setuptools>=69.0"]
build-backend = "setuptools.backends._legacy:_Backend"

# ── Ruff (linter + formatter) ───────────────────────────
[tool.ruff]
target-version = "py312"
line-length = 100

[tool.ruff.lint]
select = ["E", "F", "I", "N", "W", "UP", "B", "A", "SIM"]

[tool.ruff.lint.isort]
known-first-party = ["src"]

# ── Mypy ─────────────────────────────────────────────────
[tool.mypy]
python_version = "3.12"
strict = true
warn_return_any = true
warn_unused_configs = true

# ── Pytest ───────────────────────────────────────────────
[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
addopts = "-v --tb=short"
```

```json
// package.json equivalent for reference
{
  "name": "my-ai-backend",
  "version": "1.0.0",
  "scripts": {
    "dev": "nodemon",
    "build": "tsc",
    "lint": "eslint src/",
    "test": "jest --coverage"
  },
  "dependencies": { "express": "^4.18.0" },
  "devDependencies": { "typescript": "^5.3.0", "jest": "^29.0.0" }
}
```

---

## 8. Practice Exercises

### Exercise 1: Write a Production Dockerfile
Create a multi-stage Dockerfile for a FastAPI + LangChain application that:
1. Uses `python:3.12-slim` as the base
2. Installs dependencies in a builder stage
3. Runs as a non-root user
4. Uses gunicorn with uvicorn workers
5. Has a HEALTHCHECK instruction
6. Keeps the final image under 300MB (no ML frameworks)

Build it and verify the health check works: `docker build -t myapp . && docker run -p 8000:8000 myapp`

### Exercise 2: Local Development Stack
Create a `docker-compose.yml` that includes:
1. Your FastAPI app with hot reload
2. PostgreSQL with health checks
3. Redis with health checks
4. A pgAdmin instance for database management

Verify all services start correctly and the app connects to both Postgres and Redis.

### Exercise 3: CI/CD Pipeline
Write a GitHub Actions workflow that:
1. Runs `ruff check` and `ruff format --check`
2. Runs `mypy` type checking
3. Runs `pytest` with PostgreSQL and Redis services
4. Builds a Docker image on main branch pushes
5. Fails the pipeline if test coverage drops below 80%

Compare this with your current Node.js CI/CD pipeline -- what is similar, what is different?

### Exercise 4: Kubernetes Deployment
Write Kubernetes manifests (Deployment, Service, ConfigMap, Secret, HPA) for your application.
Include:
1. Liveness and readiness probes hitting your health endpoints
2. Resource requests and limits
3. Environment variables from ConfigMap and Secret
4. HPA that scales from 2-8 replicas based on CPU utilization

Test with `kubectl apply -f k8s/ --dry-run=client` to validate the YAML.

### Exercise 5: gunicorn Tuning
Create a `gunicorn.conf.py` that:
1. Sets workers based on CPU count (but max 4 for LLM apps)
2. Enables worker recycling after 1000 requests
3. Sets appropriate timeouts for LLM calls (120s)
4. Logs access and errors to stdout

Run your app with `gunicorn -c gunicorn.conf.py src.main:app` and verify it
handles concurrent requests properly using `hey` or `ab` (load testing tools).

### Exercise 6: Environment Matrix
Create three `.env` files: `.env.development`, `.env.staging`, `.env.production`.
Each should have appropriate values for:
- Log level (DEBUG / INFO / WARNING)
- Database pool size (5 / 10 / 20)
- LLM cache TTL (60 / 600 / 3600)
- Swagger docs enabled (yes / yes / no)
- Sentry sample rate (1.0 / 0.5 / 0.1)

Write a script that validates all three files parse correctly with your Settings class.
