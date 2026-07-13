# Deployment: Docker, CI/CD, aur Kubernetes Python AI Backends ke Liye

## Python Deployment ki Kahani

Node.js se aarah ho, toh tume pata hoga `npm run build && docker build .` aur khatam. Python mein kuch extra sharp edges hain (virtual environments, C extensions, bade ML dependencies), lekin pattern similar hain ek baar samajh lo.

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

### Node.js Dockerfile ke Liye Comparison

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
| Virtual envs | Docker mein zaruri nahi (container hi environment hai) | N/A |
| C extensions | `build-essential` builder stage mein chahiye | N/A (native addons rare) |
| ML libraries | 500MB+ tak ho sakta hai (numpy, torch) | Rarely an issue |

### ML Dependencies ke Liye Image Size Optimize Karna

```dockerfile
# Agar torch, numpy, etc. chahiye -- dedicated ML base image use kro
FROM python:3.12-slim AS production

# CPU versions install kro (CUDA se 1.5GB bachen)
RUN pip install --no-cache-dir \
    torch --index-url https://download.pytorch.org/whl/cpu

# Alternatively: multi-stage use karke test files aur docs hatao
FROM python:3.12-slim AS builder
RUN pip install --no-cache-dir --prefix=/install langchain langchain-openai
# Unnecessary files ko hatao
RUN find /install -name "tests" -type d -exec rm -rf {} + && \
    find /install -name "*.pyc" -delete && \
    find /install -name "__pycache__" -type d -exec rm -rf {} +
```

---

## 2. uvicorn vs gunicorn

### Development: uvicorn

```bash
# Direct uvicorn -- Node.js ke nodemon ki tarah
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

# Auto-reload file changes par
uvicorn src.main:app --reload --reload-dir src
```

### Production: gunicorn + uvicorn workers

Node.js mein typically `pm2` ya built-in `cluster` module use hote ho. Python mein `gunicorn` standard process manager hai.

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
# gunicorn.conf.py -- pm2 ecosystem config ki tarah
import multiprocessing

# Workers: (2 * CPU cores) + 1 standard formula hai
# LLM apps ke liye: kam workers kyunki har request memory le leta hai
workers = min(multiprocessing.cpu_count() + 1, 4)
worker_class = "uvicorn.workers.UvicornWorker"

# Timeouts
timeout = 120         # Kill worker agar 120s tak response na de
graceful_timeout = 30 # Shutdown par current requests khatam karne de 30s
keepalive = 5         # Connections ko 5s tak alive rakho

# Worker recycling (memory leaks se bachne ke liye)
max_requests = 1000       # 1000 requests ke baad worker restart kro
max_requests_jitter = 50  # Random element taki sab workers same time restart na ho

# Binding
bind = "0.0.0.0:8000"

# Logging
accesslog = "-"   # stdout
errorlog = "-"    # stderr
loglevel = "info"

# Hooks
def on_starting(server):
    """Master process start hone se pehle."""
    pass

def post_fork(server, worker):
    """Worker fork hone ke baad -- per-worker resources initialize karo."""
    pass
```

```javascript
// pm2 ecosystem.config.js ka equivalent
module.exports = {
  apps: [{
    name: 'api',
    script: 'dist/main.js',
    instances: 4,           // = gunicorn mein workers
    max_memory_restart: '1G',
    env: { NODE_ENV: 'production' },
  }],
};
```

### Sirf uvicorn Production mein Kyun Nahi?

| Feature | uvicorn alone | gunicorn + uvicorn workers |
|---------|--------------|--------------------------|
| Multi-process | Nahi (single process) | Haan (ek per worker) |
| Worker management | Nahi | Haan (crashed workers restart) |
| Graceful shutdown | Basic | Full (drain connections) |
| Memory leak protection | Nahi | Haan (max_requests) |
| Hot reload | Haan (dev only) | Nahi (rolling deploys use kro) |

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
        """Production mein Swagger UI disable karo."""
        return None if self.is_production else "/docs"

    @property
    def log_level(self) -> str:
        return "WARNING" if self.is_production else "DEBUG"

    @property
    def workers(self) -> int:
        """Production mein zyada workers."""
        import multiprocessing
        if self.is_production:
            return min(multiprocessing.cpu_count() + 1, 4)
        return 1
```

### .env Files

```bash
# .env.example (repo mein commit kro)
ENVIRONMENT=development
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/mydb
OPENAI_API_KEY=sk-...
REDIS_URL=redis://localhost:6379/0
SENTRY_DSN=

# .env (gitignored -- local dev overrides)
OPENAI_API_KEY=sk-actual-key-here

# Production: Kubernetes Secrets, AWS Parameter Store, etc. se set kro
# Kभी BHI production secrets commit mat kro kisi bhi file mein
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
          OPENAI_API_KEY: sk-test-key  # Tests mein mock kro
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

### Node.js CI/CD ke Saath Comparison

```yaml
# Typical Node.js CI/CD -- patterns similar hain dekhna
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

Tooling names alag hain, lekin workflow almost identical hai.

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

          # Health checks -- zero-downtime deployments ke liye CRITICAL
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
            failureThreshold: 30  # ML model loading ke liye 150s tak time de

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

### ConfigMap aur Secret

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
# k8s/secret.yaml (production mein sealed-secrets ya external-secrets use kro)
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
    # Custom metric: request queue depth ke basis par scale kro
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
      stabilizationWindowSeconds: 300  # Scale down se pehle 5 min wait kro
      policies:
        - type: Pods
          value: 1
          periodSeconds: 120
```

### FastAPI mein Health Check Endpoints

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
    Liveness probe -- kya process run ho raha hai?
    Ise fast aur simple rakho. External dependencies mat check kro.

    Node.js equivalent: app.get('/health', (req, res) => res.json({ status: 'ok' }))
    """
    return {"status": "ok"}


@router.get("/ready")
async def readiness_check(
    db: AsyncSession = Depends(get_db),
):
    """
    Readiness probe -- kya yeh instance traffic handle kar sakta hai?
    Sab critical dependencies check kro.
    """
    checks = {}

    # Database check kro
    try:
        await db.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as e:
        logger.error("Database health check failed", error=str(e))
        checks["database"] = "error"

    # Redis check kro
    try:
        redis = get_redis()
        await redis.ping()
        checks["redis"] = "ok"
    except Exception as e:
        logger.error("Redis health check failed", error=str(e))
        checks["redis"] = "error"

    # LLM API check (optional -- har probe par mat call kro)
    checks["llm_api"] = "ok"  # Could do periodic lightweight check

    all_ok = all(v == "ok" for v in checks.values())
    status_code = 200 if all_ok else 503

    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=status_code,
        content={"status": "ready" if all_ok else "not_ready", "checks": checks},
    )
```

---

## 6. Local Development ke Liye Docker Compose

```yaml
# docker-compose.yml
services:
  api:
    build:
      context: .
      target: production  # Production stage use kro
    ports:
      - "8000:8000"
    environment:
      - ENVIRONMENT=development
      - DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/mydb
      - REDIS_URL=redis://redis:6379/0
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - ./src:/app/src  # Development mein hot reload
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

  # pgAdmin database management ke liye (optional)
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
# Sab kuch start kro
docker compose up -d

# Logs dekhna
docker compose logs -f api

# Database migrations chalao
docker compose exec api alembic upgrade head

# Container ke andar tests chalao
docker compose exec api pytest tests/ -v

# Dependency changes ke baad rebuild kro
docker compose build api && docker compose up -d api
```

---

## 7. pyproject.toml: Modern Python Project File

Yeh package.json ka equivalent hai. Modern Python projects ek single file use karte hain sab project configuration ke liye.

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
    "httpx>=0.26.0",       # TestClient ke liye
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
// package.json equivalent reference ke liye
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

### Exercise 1: Production Dockerfile Likhna

FastAPI + LangChain application ke liye multi-stage Dockerfile banao jo:
1. `python:3.12-slim` base use kre
2. Builder stage mein dependencies install kre
3. Non-root user ke taur par chalre
4. Gunicorn + uvicorn workers use kre
5. HEALTHCHECK instruction ho
6. Final image 300MB se kam ho (koi ML frameworks nahi)

Build kro aur health check verify kro: `docker build -t myapp . && docker run -p 8000:8000 myapp`

### Exercise 2: Local Development Stack

`docker-compose.yml` banao jo include kre:
1. FastAPI app hot reload ke saath
2. PostgreSQL health checks ke saath
3. Redis health checks ke saath
4. pgAdmin database management ke liye

Verify kro sab services properly start ho rahi hain aur app Postgres aur Redis se connect ho raha hai.

### Exercise 3: CI/CD Pipeline

GitHub Actions workflow likho jo:
1. `ruff check` aur `ruff format --check` chalaye
2. `mypy` type checking chalaye
3. `pytest` PostgreSQL aur Redis services ke saath chalaye
4. Main branch mein push par Docker image build kre
5. Test coverage 80% se kam ho toh pipeline fail kre

Apne Node.js CI/CD pipeline ke saath compare kro -- kya similar hai, kya different?

### Exercise 4: Kubernetes Deployment

Kubernetes manifests likho (Deployment, Service, ConfigMap, Secret, HPA) for your application.
Include kro:
1. Health endpoints par liveness aur readiness probes
2. Resource requests aur limits
3. ConfigMap aur Secret se environment variables
4. HPA jo 2-8 replicas ke beech scale kre CPU utilization ke basis par

Validate kro YAML ke saath: `kubectl apply -f k8s/ --dry-run=client`

### Exercise 5: gunicorn Tuning

`gunicorn.conf.py` banao jo:
1. Workers ko CPU count ke basis par set kre (lekin LLM apps ke liye max 4)
2. 1000 requests ke baad worker recycling enable kre
3. LLM calls ke liye appropriate timeouts set kre (120s)
4. Access aur errors ko stdout par log kre

Apne app ko chalao `gunicorn -c gunicorn.conf.py src.main:app` ke saath aur verify kro ye concurrent requests properly handle karti hai `hey` ya `ab` (load testing tools) use karke.

### Exercise 6: Environment Matrix

Teen `.env` files banao: `.env.development`, `.env.staging`, `.env.production`.
Har ek mein appropriate values rakho:
- Log level (DEBUG / INFO / WARNING)
- Database pool size (5 / 10 / 20)
- LLM cache TTL (60 / 600 / 3600)
- Swagger docs enabled (yes / yes / no)
- Sentry sample rate (1.0 / 0.5 / 0.1)

Script likho jo verify kre sab teen files apke Settings class ke saath properly parse ho rahe hain.

---

> [!tip]
> Docker multi-stage builds aur process management samajhna tum Zomato ya Swiggy jaise apps scale karte time kaam aayega. Har stage ka apna purpose hota hai, production image lean rehta hai.

> [!warning]
> KABHI BAHI production secrets `.env` file mein commit mat kro. Always Kubernetes Secrets, AWS Parameter Store, ya equivalent use kro.

> [!info]
> Gunicorn worker configuration tune karna ho toh har use case alag hota hai. LLM apps ke liye kam workers better hain kyunki har request heavy memory use karta hai.
