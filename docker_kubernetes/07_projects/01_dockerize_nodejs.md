# Project: Dockerize a Node.js App

## What You'll Build

A production-ready Docker image for a Node.js/Express REST API, with:
- Optimized Dockerfile (multi-layer caching, non-root user, health check)
- Proper `.dockerignore`
- Both development and production configurations
- Push to Docker Hub

---

## The Application

```
nodejs-api/
├── src/
│   ├── server.js
│   ├── routes/
│   │   └── users.js
│   └── middleware/
│       └── errorHandler.js
├── package.json
├── package-lock.json
├── Dockerfile
├── Dockerfile.dev
└── .dockerignore
```

**src/server.js**:
```javascript
const express = require('express');
const usersRouter = require('./routes/users');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    env: process.env.NODE_ENV,
  });
});

app.use('/api/users', usersRouter);

// 404
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

app.use(errorHandler);

const PORT = parseInt(process.env.PORT) || 3000;
const HOST = '0.0.0.0';   // listen on all interfaces inside container

app.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;
```

**src/routes/users.js**:
```javascript
const express = require('express');
const router = express.Router();

// In-memory store (replace with DB in real app)
const users = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob',   email: 'bob@example.com' },
];

router.get('/', (req, res) => {
  res.json(users);
});

router.get('/:id', (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

router.post('/', (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'name and email are required' });
  }
  const newUser = { id: users.length + 1, name, email };
  users.push(newUser);
  res.status(201).json(newUser);
});

module.exports = router;
```

**package.json**:
```json
{
  "name": "nodejs-api",
  "version": "1.0.0",
  "scripts": {
    "start": "node src/server.js",
    "dev": "node --watch src/server.js"
  },
  "dependencies": {
    "express": "^4.18.0"
  }
}
```

---

## Production Dockerfile

```dockerfile
# Dockerfile
# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Production image
FROM node:20-alpine AS production

# Security: create app directory owned by node user
WORKDIR /app

# Copy only production deps (no devDependencies)
COPY --from=deps --chown=node:node /app/node_modules ./node_modules

# Copy source
COPY --chown=node:node src/ ./src/
COPY --chown=node:node package.json ./

# Document port
EXPOSE 3000

# Run as non-root
USER node

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# Start
CMD ["node", "src/server.js"]
```

---

## Development Dockerfile

```dockerfile
# Dockerfile.dev
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install               # includes devDependencies

# Source is bind-mounted at runtime, not copied
EXPOSE 3000

USER node

CMD ["node", "--watch", "src/server.js"]
```

---

## .dockerignore

```
# .dockerignore
node_modules/
.git/
.gitignore
*.log
.env
.env.*
dist/
coverage/
.nyc_output/
test/
tests/
**/*.test.js
**/*.spec.js
Dockerfile*
docker-compose*
.dockerignore
README.md
```

---

## Build and Test

```bash
# Build production image
docker build -t nodejs-api:v1.0.0 .

# Check image size
docker images nodejs-api
# REPOSITORY   TAG       IMAGE ID       SIZE
# nodejs-api   v1.0.0    f7a2d9e4b8c3   ~90MB

# Run production container
docker run -d \
  --name api \
  -p 3000:3000 \
  -e NODE_ENV=production \
  nodejs-api:v1.0.0

# Test
curl http://localhost:3000/health
# {"status":"ok","timestamp":"...","uptime":1.23,"env":"production"}

curl http://localhost:3000/api/users
# [{"id":1,"name":"Alice",...},{"id":2,"name":"Bob",...}]

curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Charlie","email":"charlie@example.com"}'
# {"id":3,"name":"Charlie","email":"charlie@example.com"}

# Check health
docker inspect api --format '{{.State.Health.Status}}'
# healthy

# View logs
docker logs api

# Clean up
docker rm -f api
```

---

## Development Mode (with Live Reload)

```bash
# Run dev container with source code mounted
docker run -d \
  --name api-dev \
  -p 3000:3000 \
  -v $(pwd)/src:/app/src \      # mount source
  -e NODE_ENV=development \
  $(docker build -q -f Dockerfile.dev .)

# Now edit src/server.js — container reloads automatically
# Clean up
docker rm -f api-dev
```

---

## Push to Docker Hub

```bash
# Tag for Docker Hub
docker tag nodejs-api:v1.0.0 YOUR_USERNAME/nodejs-api:v1.0.0
docker tag nodejs-api:v1.0.0 YOUR_USERNAME/nodejs-api:latest

# Login and push
docker login
docker push YOUR_USERNAME/nodejs-api:v1.0.0
docker push YOUR_USERNAME/nodejs-api:latest

# Pull from anywhere
docker pull YOUR_USERNAME/nodejs-api:v1.0.0
```

---

## Image Security Scan

```bash
# Docker Desktop has built-in vulnerability scanning
# Right-click the image → View in Docker Hub → Security tab

# Or use Trivy:
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy:latest image nodejs-api:v1.0.0
```

---

**Next**: [Dockerize Python FastAPI](./02_dockerize_python_fastapi.md)
