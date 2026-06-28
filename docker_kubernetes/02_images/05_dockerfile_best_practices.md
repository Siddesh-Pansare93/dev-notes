# Dockerfile Best Practices

## What You'll Learn

- Layer caching strategy
- Choosing the right base image
- Security: run as non-root
- Keep images small
- .dockerignore patterns
- Before/after comparison

---

## 1. Order Layers for Maximum Cache Hits

The most impactful optimization. Put things that change **least frequently** first.

```dockerfile
# BAD — copying everything before npm install
FROM node:20-alpine
WORKDIR /app
COPY . .                    # ← changes every time you edit any file
RUN npm ci                  # ← re-runs even if package.json didn't change

# GOOD — copy dependencies first, source code last
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./       # ← changes rarely
RUN npm ci                  # ← cached unless package.json changed
COPY . .                    # ← changes often, but that's ok now
```

With the good version:
- Change `server.js` → only `COPY . .` reruns (2 seconds)
- Change `package.json` → `npm ci` AND `COPY . .` reruns (30 seconds)
- Change nothing → fully cached (instant)

---

## 2. Use Specific Base Image Tags

```dockerfile
# BAD — 'latest' can break your build when a new version releases
FROM node:latest
FROM python:latest

# GOOD — locked to exact version
FROM node:20.11.0-alpine3.19
FROM python:3.12.2-slim-bookworm

# Acceptable — major.minor (gets patch updates)
FROM node:20-alpine
FROM python:3.12-slim
```

---

## 3. Use Alpine or Slim Variants

```
Base image size comparison:
  node:20             ~1.1 GB
  node:20-slim        ~240 MB
  node:20-alpine      ~127 MB   ← best for most cases
  distroless/nodejs20 ~90 MB    ← no shell, maximum security
```

```dockerfile
# Prefer alpine unless you need glibc-specific packages
FROM node:20-alpine
FROM python:3.12-slim          # slim has glibc unlike alpine
FROM nginx:alpine
```

Alpine uses `musl libc` instead of `glibc`. Most Node.js and Python packages work fine, but some native modules may need extra steps.

---

## 4. Run as Non-Root User

By default, containers run as `root`. This is a security risk — if the container is compromised, the attacker has root in the container (and potentially the host).

```dockerfile
# Method 1: Use the pre-created 'node' user (node base image provides it)
FROM node:20-alpine
WORKDIR /app
COPY --chown=node:node package*.json ./
RUN npm ci
COPY --chown=node:node . .
USER node                  # switch to non-root BEFORE CMD
CMD ["node", "server.js"]

# Method 2: Create your own user
FROM python:3.12-slim
RUN addgroup --system appgroup \
    && adduser --system --ingroup appgroup appuser
WORKDIR /app
COPY --chown=appuser:appgroup requirements.txt .
RUN pip install -r requirements.txt
COPY --chown=appuser:appgroup . .
USER appuser
CMD ["uvicorn", "main:app", "--host", "0.0.0.0"]
```

---

## 5. Minimize Layers and Clean Up

Each `RUN` creates a layer. Combine related commands, and clean up in the **same layer**:

```dockerfile
# BAD — 3 layers, apt cache stuck in layer 1
RUN apt-get update
RUN apt-get install -y curl git
RUN rm -rf /var/lib/apt/lists/*

# GOOD — 1 layer, cache cleaned in same step
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       curl \
       git \
    && rm -rf /var/lib/apt/lists/*
```

`--no-install-recommends` skips suggested packages and saves significant space.

For Alpine:
```dockerfile
RUN apk add --no-cache curl git
# --no-cache skips writing to apk cache (no separate cleanup needed)
```

---

## 6. Use .dockerignore Religiously

Create `.dockerignore` in every project. Without it, you send your entire directory to the daemon — including `node_modules` (hundreds of MB), `.git`, test files, etc.

```
# .dockerignore

# Dependencies (will be installed in the image)
node_modules/
vendor/
__pycache__/
*.pyc
.venv/

# VCS
.git/
.gitignore

# Environment and secrets — NEVER include these
.env
.env.*
*.pem
*.key

# Build outputs
dist/
build/
.next/
out/

# Logs and temp
*.log
tmp/
temp/

# Dev tools
.vscode/
.idea/
*.swp

# Tests (optional — keep out of production image)
tests/
test/
**/*.test.js
**/*.spec.js

# OS cruft
.DS_Store
Thumbs.db
```

---

## 7. Don't Install Dev Dependencies in Production

```dockerfile
# Node.js
RUN npm ci --only=production     # installs only dependencies, not devDependencies

# Python
RUN pip install --no-cache-dir -r requirements.txt
# (keep a separate requirements-dev.txt for dev tools)

# Avoid pip cache
RUN pip install --no-cache-dir ...
```

---

## 8. Use COPY Instead of ADD

Unless you specifically need tar auto-extraction:

```dockerfile
# BAD (unless extracting)
ADD . /app

# GOOD
COPY . /app
```

`COPY` is explicit and predictable. `ADD` has surprising behavior (auto-downloads URLs, auto-extracts archives).

---

## 9. Set Useful Labels

```dockerfile
LABEL org.opencontainers.image.title="My App"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.authors="you@example.com"
LABEL org.opencontainers.image.source="https://github.com/you/my-app"
```

---

## 10. Add a Health Check

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1
```

This enables Docker and Kubernetes to know when your container is actually ready to serve traffic.

---

## Before/After: Node.js API

### Before (naive)

```dockerfile
FROM node:latest
COPY . /app
WORKDIR /app
RUN npm install
CMD node server.js
```

Problems:
- `node:latest` — unpredictable version
- `COPY . /app` before `npm install` — cache busted on every code change
- `npm install` instead of `npm ci` — not reproducible
- Running as root
- No `.dockerignore` — `node_modules` sent in build context

### After (production-grade)

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies first (cache-friendly)
COPY package*.json ./
RUN npm ci --only=production

# Then copy source
COPY --chown=node:node . .

EXPOSE 3000

USER node

HEALTHCHECK --interval=30s --timeout=5s \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
```

With `.dockerignore`:
```
node_modules/
.git/
*.log
.env
tests/
```

Result:
- Image size: 127MB → same, but no hidden bloat
- Build time after code change: 45s → 3s (cached npm install)
- Security: root → `node` user
- Reliability: reproducible install (`npm ci`), no `latest` tag surprise

---

## Quick Checklist

Before shipping a Dockerfile to production, verify:

- [ ] Using specific version tag (not `latest`)
- [ ] `package*/requirements*/Gemfile*` copied before source
- [ ] `npm ci` / `pip install` with `--no-cache-dir`
- [ ] `--no-install-recommends` on apt-get
- [ ] Cleanup in same `RUN` as installation
- [ ] `.dockerignore` exists and excludes `node_modules`, `.git`, `.env`
- [ ] `USER` switches to non-root before `CMD`
- [ ] `HEALTHCHECK` defined
- [ ] Production dependencies only (no devDependencies)

---

**Next**: [Multi-Stage Builds](./06_multi_stage_builds.md) — reduce image size dramatically
