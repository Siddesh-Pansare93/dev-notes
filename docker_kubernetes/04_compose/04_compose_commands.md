# Compose Commands

## What You'll Learn

- All essential Compose CLI commands
- Differences between common variations
- Useful flags for development

---

## Command Structure

```bash
docker compose [OPTIONS] COMMAND [ARGS]

# -f: specify compose file(s)
# -p: project name
# Common: docker compose up, down, ps, logs, exec, build
```

---

## up — Start Services

```bash
# Start all services (foreground, see all logs)
docker compose up

# Start in background (detached)
docker compose up -d

# Start and rebuild images first
docker compose up --build

# Start specific services only
docker compose up -d api db

# Force recreate containers (even if config hasn't changed)
docker compose up -d --force-recreate

# Pull latest images before starting
docker compose up -d --pull always

# Scale a service
docker compose up -d --scale worker=3
```

---

## down — Stop and Remove

```bash
# Stop containers and remove them + networks
docker compose down

# Also remove named volumes (CAREFUL — deletes all data!)
docker compose down -v
docker compose down --volumes

# Also remove images built by this project
docker compose down --rmi all

# Just remove volumes used by specific services
# (no direct command — use docker volume rm)
```

---

## ps — List Containers

```bash
# Status of this project's containers
docker compose ps

# NAME          SERVICE   STATUS    PORTS
# myapp-api-1   api       running   0.0.0.0:3000->3000/tcp
# myapp-db-1    db        running
# myapp-redis-1 redis     running

# Show all (including stopped)
docker compose ps -a

# Show just service names
docker compose ps --services
```

---

## logs — View Logs

```bash
# All services
docker compose logs

# Follow in real-time
docker compose logs -f

# Specific service
docker compose logs -f api

# Multiple services
docker compose logs -f api worker

# Last N lines
docker compose logs --tail 50

# With timestamps
docker compose logs --timestamps -f api
```

---

## exec — Run Commands Inside Containers

```bash
# Open a shell in the api container
docker compose exec api bash
docker compose exec api sh        # if bash not available

# Run a command
docker compose exec api ls /app
docker compose exec db psql -U postgres
docker compose exec api npm run migrate

# Run as a specific user
docker compose exec --user root api bash
```

---

## build — Build Images

```bash
# Build all services that have a 'build' key
docker compose build

# Build specific service
docker compose build api

# Rebuild without cache
docker compose build --no-cache

# Build and push to registry
docker compose build --push
```

---

## run — One-Off Commands

Run a one-time command in a new container (doesn't touch running containers):

```bash
# Run migrations
docker compose run --rm api npm run migrate

# Open a shell (separate from running container)
docker compose run --rm api sh

# Run tests
docker compose run --rm api npm test

# Override entrypoint
docker compose run --rm --entrypoint sh api

# --rm: remove the container after it exits
# Without --rm it stays as a stopped container
```

**`run` vs `exec`**:
- `exec` — runs inside an *existing* running container
- `run` — starts a *new* container from the service image

---

## start / stop / restart

```bash
# Stop containers (don't remove them)
docker compose stop

# Stop specific service
docker compose stop api

# Start stopped containers (doesn't recreate)
docker compose start

# Restart
docker compose restart
docker compose restart api
```

---

## pull — Pull Latest Images

```bash
# Pull all images (for services that don't build locally)
docker compose pull

# Pull specific service
docker compose pull db redis
```

---

## config — Validate and View Config

```bash
# Validate compose.yml and print the merged config
docker compose config

# Just validate (exit code 0 = valid)
docker compose config --quiet && echo "Config OK"

# See environment variable substitution result
docker compose config | grep DATABASE_URL
```

---

## images — List Images Used

```bash
docker compose images

# CONTAINER         REPOSITORY    TAG       IMAGE ID       SIZE
# myapp-api-1       my-api        latest    3e6c1a8d5f2b   89MB
# myapp-db-1        postgres      16        8b3a5c9d2e1f   243MB
```

---

## watch — Auto-Rebuild on File Changes

For development — automatically rebuilds and restarts when source files change:

```yaml
# compose.yml
services:
  api:
    build: .
    develop:
      watch:
        - action: sync+restart
          path: ./src
          target: /app/src
        - action: rebuild
          path: package.json
```

```bash
docker compose watch
```

---

## Common Development Workflow

```bash
# First time setup
docker compose up -d --build

# Day-to-day development
docker compose up -d              # start all services
docker compose logs -f api        # tail API logs
docker compose exec api sh        # debug inside container
docker compose restart api        # restart after config change
docker compose down               # end of day

# Running migrations / seeds
docker compose run --rm api npm run migrate
docker compose run --rm api npm run seed

# After adding a new dependency to package.json
docker compose build api          # rebuild image
docker compose up -d --force-recreate api   # restart with new image

# Check what's running
docker compose ps

# Full reset (WARNING: deletes volumes = deletes database data)
docker compose down -v && docker compose up -d --build
```

---

**Next**: [Real-World Project](./05_real_world_project.md) — full-stack app with Compose
