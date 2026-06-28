# Docker Compose Intro

## What You'll Learn

- What Docker Compose is and why you need it
- The `compose.yml` file structure
- Services, networks, and volumes in Compose
- Your first multi-container app

---

## What is Docker Compose?

Docker Compose lets you define and run **multi-container applications** using a single YAML file.

Without Compose, running a typical app looks like this:

```bash
# Create network
docker network create app-net

# Start database
docker run -d \
  --name postgres \
  --network app-net \
  -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_DB=myapp \
  -v postgres-data:/var/lib/postgresql/data \
  postgres:16-alpine

# Start Redis
docker run -d \
  --name redis \
  --network app-net \
  redis:alpine

# Start API
docker run -d \
  --name api \
  --network app-net \
  -e DATABASE_URL=postgres://postgres:secret@postgres:5432/myapp \
  -e REDIS_URL=redis://redis:6379 \
  -p 3000:3000 \
  my-api:latest

# To tear it all down:
docker rm -f postgres redis api
docker network rm app-net
docker volume rm postgres-data
```

With Compose, all of that becomes:

```bash
docker compose up -d
# (and docker compose down to stop everything)
```

---

## compose.yml Structure

```yaml
# compose.yml (or docker-compose.yml)

services:
  service-name:            # name of each container
    image: ...             # or build: (to build from Dockerfile)
    ports: [...]
    environment: {...}
    volumes: [...]
    depends_on: [...]
    networks: [...]

networks:
  network-name:            # custom networks (optional)

volumes:
  volume-name:             # named volumes
```

---

## Your First compose.yml

```yaml
# compose.yml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: myapp
    volumes:
      - postgres-data:/var/lib/postgresql/data

  api:
    image: my-api:latest
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgres://postgres:secret@db:5432/myapp
    depends_on:
      - db

volumes:
  postgres-data:
```

```bash
# Start everything
docker compose up -d

# Stop everything
docker compose down

# Stop and remove volumes
docker compose down -v
```

---

## Services

Each `service` in Compose is a container configuration. Services:
- Get a **DNS name** equal to their service name (e.g., `db`, `api`)
- Are placed on the same default network automatically
- Can reference each other by service name

```yaml
services:
  api:
    # ...
    environment:
      DATABASE_URL: postgres://postgres:secret@db:5432/myapp
      #                                              ↑
      #                        service name "db" resolves to the db container
```

---

## Build from Dockerfile

```yaml
services:
  api:
    build: .                    # Dockerfile in current directory
    ports:
      - "3000:3000"

  frontend:
    build:
      context: ./frontend       # Dockerfile in ./frontend/
      dockerfile: Dockerfile.prod
      args:
        NODE_ENV: production
    ports:
      - "80:80"

  worker:
    build: ./worker
```

```bash
# Build all services
docker compose build

# Build and start
docker compose up --build
```

---

## Ports

```yaml
services:
  web:
    ports:
      - "8080:80"         # host:container
      - "8443:443"
      - "127.0.0.1:9000:9000"  # bind to localhost only
```

---

## Volumes

```yaml
services:
  db:
    volumes:
      - db-data:/var/lib/postgresql/data    # named volume
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql  # bind mount
      - ./config/postgres.conf:/etc/postgresql/postgresql.conf:ro

volumes:
  db-data:    # declare named volumes here
```

---

## Environment Variables

```yaml
services:
  api:
    # Method 1: inline values (ok for non-secrets)
    environment:
      NODE_ENV: production
      PORT: 3000

    # Method 2: from .env file
    env_file:
      - .env

    # Method 3: mix
    environment:
      NODE_ENV: production
    env_file:
      - .env.secrets
```

### .env File (Compose Variable Substitution)

Compose automatically reads `.env` in the same directory and substitutes `${VARIABLE}` in compose.yml:

```yaml
# compose.yml
services:
  db:
    image: postgres:${POSTGRES_VERSION}
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
```

```bash
# .env
POSTGRES_VERSION=16-alpine
DB_PASSWORD=mysecretpassword
```

---

## Full Example: API + Database + Redis

```yaml
# compose.yml
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
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U appuser -d myapp"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis-data:/data

  api:
    build: .
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgres://appuser:${DB_PASSWORD}@db:5432/myapp
      REDIS_URL: redis://redis:6379
    depends_on:
      db:
        condition: service_healthy    # wait for db health check to pass
      redis:
        condition: service_started

volumes:
  db-data:
  redis-data:
```

```bash
# .env
DB_PASSWORD=supersecret

# Start
docker compose up -d

# Check status
docker compose ps

# View all logs
docker compose logs -f

# Stop
docker compose down
```

---

**Next**: [Services & Networking](./02_services_networking.md) — connect multiple services
