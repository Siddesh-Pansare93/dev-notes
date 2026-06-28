# Dockerizing Applications

> Learn how to containerize real-world applications: Node.js, Python, full-stack apps, and microservices.

## Table of Contents
1. [Dockerizing Node.js Apps](#dockerizing-nodejs-apps)
2. [Dockerizing Python Apps](#dockerizing-python-apps)
3. [Full-Stack Applications](#full-stack-applications)
4. [Multi-Stage Builds for Size](#multi-stage-builds-for-size)
5. [Environment-Specific Configurations](#environment-specific-configurations)
6. [Debugging Containerized Apps](#debugging-containerized-apps)
7. [Performance Optimization](#performance-optimization)

---

## Dockerizing Node.js Apps

### Simple Express Server

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start application
CMD ["node", "index.js"]
```

```bash
# Build image
docker build -t my-node-app .

# Run container
docker run -d -p 3000:3000 my-node-app
```

### Node.js .dockerignore

```
# .dockerignore - exclude unnecessary files

node_modules/
npm-debug.log
.git
.env
.env.local
dist/
coverage/
.DS_Store
*.md
```

### Development vs. Production

```dockerfile
# Multi-stage: development and production

# Stage 1: Development
FROM node:18 AS development
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "dev"]

# Stage 2: Production build
FROM node:18-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]
```

```bash
# Build for development
docker build --target development -t my-app:dev .

# Build for production
docker build --target production -t my-app:latest .
```

### Hot Reload in Development

```bash
# Mount source code and watch for changes
docker run -d \
  --name app-dev \
  -v $(pwd):/app \
  -p 3000:3000 \
  my-app:dev

# nodemon will restart on file changes
```

---

## Dockerizing Python Apps

### Flask Application

```dockerfile
# Dockerfile for Flask app
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
  gcc \
  && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

EXPOSE 5000

ENV FLASK_APP=app.py
ENV FLASK_ENV=production

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]
```

```bash
# Build and run
docker build -t my-flask-app .
docker run -d -p 5000:5000 my-flask-app
```

### FastAPI Application

```dockerfile
# Dockerfile for FastAPI
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

HEALTHCHECK --interval=30s CMD python -c "import requests; requests.get('http://localhost:8000/health')" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Python .dockerignore

```
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
env/
venv/
.venv
.coverage
htmlcov/
dist/
build/
*.egg-info/
.pytest_cache/
.mypy_cache/
```

### Virtual Environment in Docker

```dockerfile
# Creating venv in Docker (creates clean isolation)
FROM python:3.11

WORKDIR /app

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["python", "app.py"]
```

---

## Full-Stack Applications

### Docker Compose for Multi-Container App

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: app-frontend
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://localhost:5000
    depends_on:
      - backend
    networks:
      - app-network

  # Backend API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: app-backend
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgresql://user:password@db:5432/myapp
      - REDIS_URL=redis://cache:6379
    depends_on:
      db:
        condition: service_healthy
      cache:
        condition: service_started
    networks:
      - app-network

  # PostgreSQL Database
  db:
    image: postgres:15
    container_name: app-postgres
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: myapp
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-network

  # Redis Cache
  cache:
    image: redis:7-alpine
    container_name: app-redis
    ports:
      - "6379:6379"
    networks:
      - app-network

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: app-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - frontend
      - backend
    networks:
      - app-network

networks:
  app-network:
    driver: bridge

volumes:
  postgres-data:
```

```bash
# Start entire stack
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Remove volumes too
docker-compose down -v
```

### Nginx Configuration for Full-Stack

```nginx
# nginx.conf
upstream frontend {
  server frontend:3000;
}

upstream backend {
  server backend:5000;
}

server {
  listen 80;
  server_name _;

  # Frontend
  location / {
    proxy_pass http://frontend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }

  # Backend API
  location /api/ {
    proxy_pass http://backend/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }

  # Static files with caching
  location ~* \.(js|css|png|jpg|gif|ico|woff|woff2)$ {
    proxy_pass http://frontend;
    proxy_cache_valid 200 1d;
    add_header Cache-Control "public, max-age=86400";
  }
}
```

---

## Multi-Stage Builds for Size

### Problem: Large Images

```dockerfile
# ❌ Bad: 1.5GB image
FROM node:18
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Solution: Multi-Stage Build

```dockerfile
# ✅ Good: ~200MB production image

# Stage 1: Build
FROM node:18 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Runtime (only copy necessary files)
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Multi-Stage for Python

```dockerfile
# Stage 1: Build
FROM python:3.11 AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --user -r requirements.txt

# Stage 2: Runtime
FROM python:3.11-slim
WORKDIR /app
COPY --from=builder /root/.local /root/.local
COPY . .
ENV PATH=/root/.local/bin:$PATH
CMD ["python", "app.py"]
```

### Image Size Comparison

```bash
# ❌ Without multi-stage
docker images
REPOSITORY          TAG      SIZE
my-app              full     1.5GB

# ✅ With multi-stage
my-app              multi    350MB

# Size reduction: 77%!
```

---

## Environment-Specific Configurations

### Using Environment Variables

```dockerfile
FROM node:18

WORKDIR /app
COPY . .
RUN npm ci --only=production

EXPOSE 3000

# Default values for environment
ENV NODE_ENV=production
ENV LOG_LEVEL=info

CMD ["node", "index.js"]
```

```bash
# Override at runtime
docker run -d \
  -e NODE_ENV=staging \
  -e LOG_LEVEL=debug \
  -e DATABASE_URL=postgresql://db:5432/app \
  my-app
```

### Config Files per Environment

```
config/
├── default.json
├── development.json
├── staging.json
└── production.json
```

```dockerfile
# Use stage to copy correct config
ARG ENV=production

FROM node:18 AS app
WORKDIR /app
COPY . .
RUN npm ci --only=production
COPY config/${ENV}.json ./config/active.json
CMD ["node", "index.js"]
```

```bash
# Build for different environments
docker build --build-arg ENV=development -t my-app:dev .
docker build --build-arg ENV=production -t my-app:prod .
```

---

## Debugging Containerized Apps

### Interactive Debugging

```bash
# Execute bash in running container
docker exec -it my-app bash

# Check logs
docker logs my-app

# Stream logs
docker logs -f my-app

# View container details
docker inspect my-app
```

### Debugging with VSCode

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Docker Node Debug",
      "type": "node",
      "request": "launch",
      "protocol": "inspector",
      "port": 9229,
      "address": "localhost"
    }
  ]
}
```

```dockerfile
# Enable Node.js debugger
FROM node:18
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 3000 9229
CMD ["node", "--inspect=0.0.0.0:9229", "index.js"]
```

```bash
# Run with debug port exposed
docker run -d \
  -p 3000:3000 \
  -p 9229:9229 \
  my-app
```

### Logging Best Practices

```javascript
// app.js - structured logging
const logger = {
  info: (msg, meta = {}) => console.log(JSON.stringify({ level: 'INFO', msg, ...meta, time: new Date() })),
  error: (msg, meta = {}) => console.error(JSON.stringify({ level: 'ERROR', msg, ...meta, time: new Date() })),
  debug: (msg, meta = {}) => console.log(JSON.stringify({ level: 'DEBUG', msg, ...meta, time: new Date() }))
};

logger.info('App started', { port: 3000 });
```

```bash
# Docker logs show structured output
docker logs my-app | grep ERROR
```

---

## Performance Optimization

### 1. Image Layer Caching

```dockerfile
# ❌ Bad: npm install runs on every build
FROM node:18
COPY . .  # Everything copied
RUN npm install
```

```dockerfile
# ✅ Good: Cache npm install layer
FROM node:18
COPY package*.json ./  # Only package files (changes rarely)
RUN npm install        # Cached if package*.json unchanged
COPY . .              # Source code (changes frequently)
```

### 2. Use Alpine Images

```dockerfile
# ❌ Large
FROM node:18
# ~1GB image

# ✅ Smaller
FROM node:18-alpine
# ~150MB image
```

### 3. Minimize Layers

```dockerfile
# ❌ Multiple RUN commands
RUN apt-get update
RUN apt-get install -y curl
RUN apt-get clean

# ✅ Combined with cleanup
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
```

### 4. Don't Run as Root

```dockerfile
# ✅ Good: Create non-root user
FROM node:18
RUN useradd -m appuser
WORKDIR /app
COPY --chown=appuser:appuser . .
USER appuser
CMD ["node", "index.js"]
```

---

## Practical Example: Complete Full-Stack App

```bash
# Project structure
my-app/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── index.js
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
└── nginx.conf
```

```bash
# Run everything
docker-compose up -d

# Access
curl http://localhost  # Frontend at /
curl http://localhost/api/users  # Backend API
```

---

## Summary

- **Package management matters** - use `npm ci` and pip `--no-cache-dir`
- **Multi-stage builds** drastically reduce image size
- **Alpine images** provide smaller, secure base images
- **Layer caching** speeds up build process
- **Environment variables** configure apps across environments
- **Proper debugging** requires exposing ports and streaming logs
- **Non-root users** improve security

Next: [CI/CD Concepts](../02_ci_cd/01_cicd_concepts.md) - automate building and deployment
