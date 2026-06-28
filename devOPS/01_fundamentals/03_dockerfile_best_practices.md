# Dockerfile Best Practices

## What You'll Learn

- How to write a Dockerfile
- Multi-stage builds for smaller images
- Layer caching optimization
- Security best practices
- Real-world Dockerfiles for Node.js, Python, and Go

---

## What is a Dockerfile?

A **Dockerfile** is a text file with instructions to build a Docker image.

### Basic Structure

```dockerfile
# Every Dockerfile starts with a base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy files
COPY package*.json ./

# Run commands
RUN npm install

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# Define startup command
CMD ["node", "server.js"]
```

---

## Dockerfile Instructions

### FROM - Base Image
```dockerfile
# Official images from Docker Hub
FROM node:18-alpine
FROM python:3.11-slim
FROM nginx:alpine
FROM ubuntu:22.04

# Scratch (empty base for static binaries)
FROM scratch
```

### WORKDIR - Set Working Directory
```dockerfile
WORKDIR /app
# All subsequent commands run in /app
# Creates directory if it doesn't exist
```

### COPY vs ADD
```dockerfile
# COPY - preferred for simple file copying
COPY package.json /app/
COPY src/ /app/src/

# ADD - has extra features (tar extraction, URL download)
ADD archive.tar.gz /app/  # Auto-extracts
ADD https://example.com/file.txt /app/  # Downloads file
```

**Best Practice**: Use `COPY` unless you need ADD's special features.

### RUN - Execute Commands
```dockerfile
# Install dependencies
RUN apt-get update && apt-get install -y curl git

# Chain commands with &&
RUN npm install && npm run build

# Multi-line with \
RUN apt-get update && \
    apt-get install -y \
        curl \
        git \
        vim && \
    rm -rf /var/lib/apt/lists/*
```

### ENV - Environment Variables
```dockerfile
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL=postgres://localhost/mydb

# Use in subsequent commands
RUN echo $NODE_ENV
```

### EXPOSE - Document Ports
```dockerfile
EXPOSE 3000
EXPOSE 8080 443

# Note: This is documentation only!
# Still need -p flag when running: docker run -p 3000:3000 myimage
```

### CMD vs ENTRYPOINT

```dockerfile
# CMD - default command (can be overridden)
CMD ["node", "server.js"]
# Override: docker run myimage python app.py

# ENTRYPOINT - command always runs
ENTRYPOINT ["node", "server.js"]
# docker run myimage --port 8080  → runs: node server.js --port 8080

# Combined (ENTRYPOINT + CMD)
ENTRYPOINT ["node"]
CMD ["server.js"]
# Default: node server.js
# Override: docker run myimage app.js → node app.js
```

### ARG - Build Arguments
```dockerfile
ARG NODE_VERSION=18
FROM node:${NODE_VERSION}-alpine

ARG BUILD_DATE
RUN echo "Built on $BUILD_DATE"

# Build with: docker build --build-arg NODE_VERSION=20 .
```

### USER - Security
```dockerfile
# Don't run as root!
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Now all commands run as appuser
CMD ["node", "server.js"]
```

---

## Building Images

### Build Command
```bash
# Build image from Dockerfile in current directory
docker build -t myapp:latest .

# Build with custom Dockerfile name
docker build -t myapp:v1.0 -f Dockerfile.prod .

# Build with build args
docker build --build-arg NODE_VERSION=20 -t myapp .

# Build without cache (force rebuild)
docker build --no-cache -t myapp .

# View build history
docker history myapp:latest
```

---

## Multi-Stage Builds

**Problem**: Build tools increase image size unnecessarily.

**Solution**: Use multi-stage builds to separate build environment from runtime.

### Example: Node.js Application

```dockerfile
# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Stage 2: Production
FROM node:18-alpine

WORKDIR /app

# Copy only necessary files from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

**Result**: Final image only contains production dependencies and built files.

### Example: Go Application

```dockerfile
# Stage 1: Build
FROM golang:1.21-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server .

# Stage 2: Runtime (tiny image!)
FROM alpine:latest

RUN apk --no-cache add ca-certificates
WORKDIR /root/

# Copy only the binary
COPY --from=builder /app/server .

EXPOSE 8080
CMD ["./server"]
```

**Result**: Image size reduced from ~300MB (Go builder) to ~10MB (Alpine + binary).

---

## Layer Caching Optimization

Docker caches each layer. If a layer hasn't changed, it reuses the cache.

### ❌ Bad (Slow Builds)
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copies everything first → cache invalidated on ANY file change
COPY . .

RUN npm install  # Runs every time, even if package.json didn't change

CMD ["node", "server.js"]
```

### ✅ Good (Fast Builds)
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy dependency files first (changes infrequently)
COPY package*.json ./

# Install dependencies (cached unless package.json changes)
RUN npm ci --only=production

# Copy application code last (changes frequently)
COPY . .

CMD ["node", "server.js"]
```

**Result**: Dependencies only reinstall when `package.json` changes.

---

## Security Best Practices

### 1. Use Specific Image Tags
```dockerfile
# ❌ Bad - version can change unexpectedly
FROM node:latest

# ✅ Good - pinned version
FROM node:18.17.1-alpine
```

### 2. Don't Run as Root
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

EXPOSE 3000
CMD ["node", "server.js"]
```

### 3. Minimize Image Size
```dockerfile
# Use Alpine-based images (smaller)
FROM node:18-alpine  # ~100MB
# vs
FROM node:18         # ~900MB

# Remove unnecessary files
RUN npm ci --only=production && \
    npm cache clean --force && \
    rm -rf /tmp/*
```

### 4. Don't Include Secrets
```dockerfile
# ❌ NEVER do this
ENV API_KEY=abc123
COPY .env /app/

# ✅ Use environment variables at runtime
docker run -e API_KEY=abc123 myapp
# Or use Docker secrets (Kubernetes, Docker Swarm)
```

### 5. Use .dockerignore
```
# .dockerignore file (like .gitignore)
node_modules/
npm-debug.log
.env
.git/
.vscode/
*.md
tests/
coverage/
```

### 6. Scan Images for Vulnerabilities
```bash
# Docker scan (requires Docker Hub account)
docker scan myapp:latest

# Trivy scanner
trivy image myapp:latest

# Snyk
snyk container test myapp:latest
```

---

## Real-World Dockerfiles

### Node.js + Express API

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Production stage
FROM node:18-alpine

WORKDIR /app

ENV NODE_ENV=production

# Create user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

CMD ["node", "server.js"]
```

### Python + FastAPI

```dockerfile
FROM python:3.11-slim AS builder

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Production stage
FROM python:3.11-slim

WORKDIR /app

# Copy Python dependencies
COPY --from=builder /root/.local /root/.local

# Copy application
COPY . .

# Create non-root user
RUN useradd -m -u 1001 appuser && \
    chown -R appuser:appuser /app

USER appuser

# Make sure scripts in .local are usable
ENV PATH=/root/.local/bin:$PATH

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### React Frontend (Static Build)

```dockerfile
# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/build /usr/share/nginx/html

# Copy custom nginx config (optional)
# COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

---

## Dockerfile Best Practices Summary

✅ **Use official, minimal base images** (Alpine, Debian slim)  
✅ **Pin specific versions** (don't use `latest`)  
✅ **Order layers by change frequency** (dependencies first, code last)  
✅ **Use multi-stage builds** to minimize final image size  
✅ **Run as non-root user**  
✅ **Use .dockerignore** to exclude unnecessary files  
✅ **Combine RUN commands** to reduce layers  
✅ **Add health checks**  
✅ **Scan images for vulnerabilities**  
✅ **Don't include secrets in images**

---

## Exercise

### Task 1: Dockerize a Node.js App

Create a simple Express app and Dockerize it:

```bash
# 1. Create project
mkdir my-express-app && cd my-express-app
npm init -y
npm install express

# 2. Create server.js
cat > server.js << 'EOF'
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ message: 'Hello from Docker!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
EOF

# 3. Create Dockerfile (write this yourself using best practices!)
# 4. Create .dockerignore
# 5. Build: docker build -t my-express-app .
# 6. Run: docker run -p 3000:3000 my-express-app
# 7. Test: curl http://localhost:3000
```

### Task 2: Optimize an Image

Compare image sizes:

```bash
# Build without optimization
docker build -t myapp:unoptimized -f Dockerfile.bad .

# Build with multi-stage and best practices
docker build -t myapp:optimized -f Dockerfile.good .

# Compare sizes
docker images | grep myapp
```

---

**Next**: [Docker Networking](./04_docker_networking.md) → Connect containers together
