# Writing Dockerfiles

## What You'll Learn

- Every Dockerfile instruction with examples
- The difference between CMD and ENTRYPOINT
- The difference between RUN, CMD, and ENTRYPOINT
- Shell vs exec form
- How to write a complete Dockerfile for a Node.js app

---

## Dockerfile Basics

A `Dockerfile` (no extension) is a text file with instructions to build an image.

```dockerfile
# This is a comment
INSTRUCTION arguments
```

Each instruction creates a new layer. Docker executes them top to bottom.

---

## All Dockerfile Instructions

### FROM — Base Image

Every Dockerfile must start with `FROM`. It sets the base image.

```dockerfile
FROM node:20-alpine
FROM python:3.12-slim
FROM ubuntu:22.04
FROM scratch          # empty base (for static binaries)
```

Use small base images when possible:
- `alpine` — ~5MB, minimal Linux
- `slim` — Debian stripped down
- `distroless` — just the runtime, no shell (very secure)

---

### WORKDIR — Set Working Directory

Sets the working directory for subsequent instructions and when the container starts.

```dockerfile
WORKDIR /app
# Equivalent to: mkdir -p /app && cd /app
# All following COPY, RUN, CMD instructions use /app as the base
```

Always use `WORKDIR` instead of `RUN cd /some/path` — it's clearer and persists across layers.

---

### COPY — Copy Files into Image

Copies files from your **build context** (local machine) into the image.

```dockerfile
# Copy a single file
COPY package.json /app/package.json

# Copy with relative paths (relative to WORKDIR)
WORKDIR /app
COPY package.json .        # copies to /app/package.json
COPY package*.json ./      # copies package.json and package-lock.json

# Copy a directory
COPY src/ ./src/

# Copy everything
COPY . .

# Preserve permissions
COPY --chown=node:node . .
```

---

### ADD — Copy with Extra Features

Like COPY but also:
- Auto-extracts `.tar.gz` archives
- Accepts URLs

```dockerfile
# Extract a tarball into /app
ADD app.tar.gz /app/

# Download from URL (not recommended — use curl in RUN instead)
ADD https://example.com/file.txt /tmp/
```

**Rule of thumb**: use `COPY` for local files, `ADD` only when you need tar auto-extraction.

---

### RUN — Execute Commands During Build

Runs a command during the image build. The result is committed as a new layer.

```dockerfile
# Shell form (runs via /bin/sh -c)
RUN apt-get update && apt-get install -y curl

# Exec form (no shell, args as JSON array)
RUN ["apt-get", "install", "-y", "curl"]

# Multi-line with \ for readability
RUN apt-get update \
    && apt-get install -y \
       curl \
       git \
       vim \
    && rm -rf /var/lib/apt/lists/*
```

**Important**: combine related commands with `&&` to reduce layers and clean up in the same layer:

```dockerfile
# BAD — creates 3 layers, can't clean up apt cache in the same layer
RUN apt-get update
RUN apt-get install -y curl
RUN rm -rf /var/lib/apt/lists/*

# GOOD — one layer, cache cleaned in same step
RUN apt-get update \
    && apt-get install -y curl \
    && rm -rf /var/lib/apt/lists/*
```

---

### ENV — Environment Variables

Sets environment variables available at **build time and runtime**.

```dockerfile
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_HOST=localhost DB_PORT=5432   # multiple on one line
```

Access in `RUN` commands and in the running container:

```dockerfile
ENV APP_HOME=/app
WORKDIR $APP_HOME     # uses the variable
RUN echo $APP_HOME    # prints /app
```

Override at runtime:
```bash
docker run -e NODE_ENV=development my-app
```

---

### ARG — Build-Time Variables

Like `ENV` but only available **during the build**, not in the running container.

```dockerfile
ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-alpine

ARG BUILD_DATE
RUN echo "Built on: $BUILD_DATE"
```

Pass values with `--build-arg`:
```bash
docker build --build-arg NODE_VERSION=18 --build-arg BUILD_DATE=$(date) .
```

Use `ARG` for build-time config, `ENV` for runtime config.

---

### EXPOSE — Document Ports

Documents which port the container listens on. **Does not actually publish the port** — that's done with `-p` at runtime.

```dockerfile
EXPOSE 3000          # TCP (default)
EXPOSE 5432/tcp
EXPOSE 53/udp
```

Think of it as documentation — it tells users and tools what port to map.

---

### CMD — Default Command

Defines the **default command** to run when the container starts. Can be overridden at runtime.

```dockerfile
# Exec form (preferred)
CMD ["node", "server.js"]
CMD ["nginx", "-g", "daemon off;"]
CMD ["python", "-m", "uvicorn", "main:app"]

# Shell form
CMD node server.js
```

Override at runtime:
```bash
docker run my-app node other-script.js    # overrides CMD
docker run -it my-app sh                  # opens shell instead
```

Only the **last `CMD`** in a Dockerfile takes effect.

---

### ENTRYPOINT — Container as Executable

Sets a command that **always runs** and cannot be overridden (only by `--entrypoint` flag).

```dockerfile
ENTRYPOINT ["node", "server.js"]
```

The difference from CMD:

```dockerfile
# With only CMD:
CMD ["node", "server.js"]
# docker run my-app               → runs: node server.js
# docker run my-app other.js      → runs: other.js  (CMD fully replaced)

# With ENTRYPOINT:
ENTRYPOINT ["node"]
CMD ["server.js"]     # becomes the default argument to ENTRYPOINT
# docker run my-app               → runs: node server.js
# docker run my-app other.js      → runs: node other.js (appended as arg)
```

**Common pattern**: use ENTRYPOINT for the executable, CMD for default arguments:

```dockerfile
ENTRYPOINT ["npm", "run"]
CMD ["start"]
# docker run my-app         → npm run start
# docker run my-app test    → npm run test
```

---

### USER — Set Runtime User

Run the container as a non-root user (security best practice).

```dockerfile
# Create a user and switch to it
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Or use an existing user from the base image (node image provides 'node' user)
USER node
```

---

### HEALTHCHECK — Container Health

Tells Docker how to test if the container is healthy.

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
```

Docker will show `healthy`, `unhealthy`, or `starting` in `docker ps`:
```
NAMES     STATUS
my-app    Up 2 minutes (healthy)
```

---

### VOLUME — Declare Mount Points

Documents that a path should be a volume. Creates an anonymous volume automatically if none is specified.

```dockerfile
VOLUME /app/data
VOLUME /var/log/nginx
```

---

### LABEL — Metadata

Adds key-value metadata to the image.

```dockerfile
LABEL maintainer="you@example.com"
LABEL version="1.0.0"
LABEL description="My Node.js API"
```

---

## Shell vs Exec Form

Most instructions support two forms:

```dockerfile
# Shell form — runs via /bin/sh -c "..."
RUN npm install
CMD node server.js

# Exec form — runs directly, no shell, args as JSON array
RUN ["npm", "install"]
CMD ["node", "server.js"]
```

**Exec form is preferred for CMD and ENTRYPOINT** because:
- No shell overhead
- Signals (SIGTERM) go directly to the process
- Shell form wraps your command in `sh -c` which can cause signal-handling issues

---

## Complete Example: Node.js API

```dockerfile
# Use specific version for reproducibility
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy dependency files first (enables layer caching)
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy source code (after npm install to maximize cache hits)
COPY . .

# Document the port
EXPOSE 3000

# Run as non-root user (node user provided by node image)
USER node

# Health check
HEALTHCHECK --interval=30s --timeout=5s \
  CMD wget -qO- http://localhost:3000/health || exit 1

# Start the app
CMD ["node", "server.js"]
```

---

## Complete Example: Python FastAPI

```dockerfile
FROM python:3.12-slim

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## .dockerignore

Like `.gitignore` but for Docker's build context. **Always create this file** to avoid sending unnecessary files to the daemon.

```
# .dockerignore
node_modules/
.git/
.env
*.log
dist/
build/
.DS_Store
Thumbs.db
*.md
tests/
```

Without `.dockerignore`, the entire project directory (including `node_modules` with thousands of files) is sent to the Docker daemon on every build.

---

**Next**: [Building Images](./04_building_images.md) — run `docker build`
