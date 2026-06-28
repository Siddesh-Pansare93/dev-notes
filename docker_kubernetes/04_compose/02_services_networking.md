# Services & Networking in Compose

## What You'll Learn

- How Compose networking works automatically
- depends_on and startup ordering
- Custom networks
- Health checks with conditions
- Scaling services

---

## Automatic Networking

Compose creates a **default network** for your project automatically. All services are connected to it.

```yaml
# compose.yml
services:
  api:
    image: my-api
  db:
    image: postgres:16
  redis:
    image: redis:alpine
```

```bash
docker compose up -d
docker network ls
# NETWORK ID     NAME
# f3a8b2c1e9d4   myproject_default   ← auto-created
```

Each service is reachable by its **service name** as a hostname:
- `api` → resolves to the api container's IP
- `db` → resolves to the db container's IP
- `redis` → resolves to the redis container's IP

```yaml
services:
  api:
    environment:
      DATABASE_URL: postgres://user:pass@db:5432/myapp   # "db" = service name
      REDIS_URL: redis://redis:6379                       # "redis" = service name
```

---

## depends_on — Startup Order

`depends_on` ensures services start in order:

```yaml
services:
  db:
    image: postgres:16-alpine

  redis:
    image: redis:alpine

  api:
    build: .
    depends_on:
      - db       # start db before api
      - redis    # start redis before api
```

**Caveat**: `depends_on` only waits for the container to *start*, not for the app inside to be ready. Your API might start before Postgres accepts connections.

### depends_on with Health Checks (Better)

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: secret
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
      start_period: 10s

  api:
    build: .
    depends_on:
      db:
        condition: service_healthy    # wait for db healthcheck to pass
```

Condition options:
- `service_started` — default, just waits for container to start
- `service_healthy` — waits for health check to report healthy
- `service_completed_successfully` — waits for one-off container to exit 0

---

## Health Checks

```yaml
services:
  api:
    image: my-api
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/health"]
      # or: test: ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"]
      interval: 30s       # check every 30s
      timeout: 10s        # fail if no response in 10s
      retries: 3          # mark unhealthy after 3 consecutive failures
      start_period: 40s   # grace period before counting failures

  redis:
    image: redis:alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

  db:
    image: postgres:16-alpine
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
```

Check health status:
```bash
docker compose ps
# NAME        IMAGE              STATUS
# myapp-api   my-api:latest      Up (healthy)
# myapp-db    postgres:16        Up (healthy)
```

---

## Custom Networks

By default all services share one network. Use multiple networks to isolate services:

```yaml
services:
  frontend:
    image: my-frontend
    networks:
      - public          # can reach the API

  api:
    image: my-api
    networks:
      - public          # reachable by frontend
      - private         # can reach db/redis

  db:
    image: postgres:16
    networks:
      - private         # only reachable by api, not frontend

  redis:
    image: redis:alpine
    networks:
      - private         # only reachable by api

networks:
  public:
  private:
```

Now `frontend` cannot reach `db` or `redis` directly — they're on different networks.

---

## Service Restart Policies

```yaml
services:
  api:
    restart: unless-stopped    # most common for services

  worker:
    restart: on-failure        # retry if it crashes
    # restart: on-failure:3   # max 3 retries

  migration:
    restart: no                # one-shot: don't restart after it completes
```

---

## Scaling Services

```yaml
services:
  worker:
    image: my-worker
    # no ports (workers don't need to be exposed)
    deploy:
      replicas: 3    # run 3 instances
```

Or at runtime:
```bash
# Run 3 instances of the worker service
docker compose up -d --scale worker=3

docker compose ps
# NAME          SERVICE   STATUS
# myapp-worker-1  worker    Up
# myapp-worker-2  worker    Up
# myapp-worker-3  worker    Up
```

Scaling doesn't work if a service has a fixed `--name` or conflicting `ports`.

---

## Profiles — Optional Services

Run only specific services with profiles:

```yaml
services:
  api:
    image: my-api
    # no profile = always started

  db:
    image: postgres:16
    # no profile = always started

  pgadmin:
    image: dpage/pgadmin4
    profiles:
      - tools          # only starts when --profile tools is passed

  mailhog:
    image: mailhog/mailhog
    profiles:
      - tools
```

```bash
# Start only api + db
docker compose up -d

# Start api + db + tools
docker compose --profile tools up -d
```

---

**Next**: [Volumes & Environment](./03_volumes_environment.md)
