# Real-World Project: Full-Stack App with Docker Compose

## What You'll Build

A complete application with:
- **React frontend** (served by Nginx)
- **Node.js/Express API** (backend)
- **PostgreSQL** (database)
- **Redis** (caching / sessions)

All running locally with one `docker compose up` command.

---

## Project Structure

```
fullstack-app/
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── server.js
│   └── .dockerignore
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── src/
│   └── nginx.conf
├── compose.yml
├── compose.override.yml
└── .env
```

---

## Backend (Node.js/Express API)

**backend/server.js**:
```javascript
const express = require('express');
const { Pool } = require('pg');
const redis = require('redis');

const app = express();
app.use(express.json());

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Redis connection
const redisClient = redis.createClient({ url: process.env.REDIS_URL });
redisClient.connect().catch(console.error);

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    await redisClient.ping();
    res.json({ status: 'ok', db: 'connected', redis: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', message: err.message });
  }
});

// Get all users (with Redis caching)
app.get('/api/users', async (req, res) => {
  const cached = await redisClient.get('users');
  if (cached) {
    return res.json({ source: 'cache', data: JSON.parse(cached) });
  }

  const { rows } = await pool.query('SELECT * FROM users ORDER BY id');
  await redisClient.setEx('users', 60, JSON.stringify(rows));
  res.json({ source: 'db', data: rows });
});

// Create a user
app.post('/api/users', async (req, res) => {
  const { name, email } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
    [name, email]
  );
  await redisClient.del('users');  // invalidate cache
  res.status(201).json(rows[0]);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));
```

**backend/package.json**:
```json
{
  "name": "backend",
  "version": "1.0.0",
  "scripts": { "start": "node server.js", "dev": "node --watch server.js" },
  "dependencies": {
    "express": "^4.18.0",
    "pg": "^8.11.0",
    "redis": "^4.6.0"
  }
}
```

**backend/Dockerfile**:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s \
  CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "server.js"]
```

**backend/.dockerignore**:
```
node_modules/
.env
*.log
```

---

## Frontend (React + Nginx)

**frontend/Dockerfile** (multi-stage):
```dockerfile
# Stage 1: Build React app
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
```

**frontend/nginx.conf**:
```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API calls to backend
    location /api/ {
        proxy_pass http://api:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /health {
        proxy_pass http://api:3000/health;
    }
}
```

---

## Database Init Script

Create `backend/db/init.sql`:
```sql
CREATE TABLE IF NOT EXISTS users (
  id    SERIAL PRIMARY KEY,
  name  TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO users (name, email) VALUES
  ('Alice', 'alice@example.com'),
  ('Bob', 'bob@example.com')
ON CONFLICT DO NOTHING;
```

---

## Docker Compose Files

**compose.yml** (production-like):
```yaml
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - db-data:/var/lib/postgresql/data
      - ./backend/db/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U appuser -d myapp"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 15s

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

  api:
    build: ./backend
    restart: unless-stopped
    environment:
      NODE_ENV: production
      DATABASE_URL: postgres://appuser:${DB_PASSWORD}@db:5432/myapp
      REDIS_URL: redis://redis:6379
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy

  frontend:
    build: ./frontend
    restart: unless-stopped
    ports:
      - "80:80"
    depends_on:
      - api

volumes:
  db-data:
  redis-data:
```

**compose.override.yml** (dev additions, auto-loaded):
```yaml
services:
  db:
    ports:
      - "5432:5432"    # expose Postgres to host (for DB GUI tools)

  redis:
    ports:
      - "6379:6379"    # expose Redis to host

  api:
    build: ./backend
    volumes:
      - ./backend:/app        # live code reload
      - /app/node_modules     # don't overlay node_modules
    environment:
      NODE_ENV: development
    ports:
      - "3000:3000"           # expose API directly for testing
    command: node --watch server.js

  frontend:
    build:
      context: ./frontend
    ports:
      - "5173:80"             # frontend dev port
```

**.env**:
```
DB_PASSWORD=devsecret123
```

---

## Running It

```bash
# Build and start all services
docker compose up -d --build

# Watch logs
docker compose logs -f

# Test the API
curl http://localhost:3000/api/users
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Charlie","email":"charlie@example.com"}'

# Test health
curl http://localhost:3000/health

# Open frontend
# http://localhost:80 (or :5173 in dev)
```

## Database Operations

```bash
# Connect to PostgreSQL
docker compose exec db psql -U appuser -d myapp

# Run a migration file
docker compose exec -T db psql -U appuser -d myapp < ./migrations/001_add_column.sql

# Backup the database
docker compose exec db pg_dump -U appuser myapp > backup.sql

# Restore
docker compose exec -T db psql -U appuser myapp < backup.sql
```

---

## Tear Down

```bash
# Stop containers (keep volumes = keep data)
docker compose down

# Full reset (deletes all data!)
docker compose down -v
```

---

**Next**: [What is Kubernetes?](../05_kubernetes_basics/01_what_is_kubernetes.md) — scale beyond a single machine
