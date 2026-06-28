# Volumes & Environment in Compose

## What You'll Learn

- Volumes in compose.yml
- Environment variable strategies
- Override files for dev/prod
- Secrets management

---

## Volumes in Compose

### Named Volumes

```yaml
services:
  db:
    image: postgres:16-alpine
    volumes:
      - db-data:/var/lib/postgresql/data    # named volume

  redis:
    image: redis:alpine
    volumes:
      - redis-data:/data

volumes:
  db-data:        # declare all named volumes here
  redis-data:
```

Named volumes persist across `docker compose down`. They're only removed with `docker compose down -v` or `docker volume rm`.

### Bind Mounts

```yaml
services:
  api:
    build: .
    volumes:
      - ./src:/app/src         # mount source directory (for dev)
      - ./config:/app/config:ro    # read-only config

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
```

### Volume Options

```yaml
volumes:
  db-data:
    driver: local            # default
    driver_opts:
      type: none
      o: bind
      device: /path/on/host  # store volume at specific host path

  nfs-data:
    driver: local
    driver_opts:
      type: nfs
      o: "addr=nfsserver.example.com,vers=4"
      device: ":/exports/data"
```

---

## Environment Variables: All Strategies

### Strategy 1: Inline in compose.yml

```yaml
services:
  api:
    environment:
      NODE_ENV: production
      PORT: "3000"
      LOG_LEVEL: info
```

Good for: non-sensitive values, documentation of what variables the service uses.

### Strategy 2: .env File (Compose Variable Substitution)

Compose reads `.env` automatically and substitutes `${VAR}` in `compose.yml`:

```bash
# .env
POSTGRES_VERSION=16-alpine
DB_PASSWORD=mysecretpassword
API_PORT=3000
```

```yaml
# compose.yml
services:
  db:
    image: postgres:${POSTGRES_VERSION}
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
  api:
    ports:
      - "${API_PORT}:3000"
```

### Strategy 3: env_file Directive

Loads variables directly into the container:

```yaml
services:
  api:
    env_file:
      - .env                  # base config
      - .env.local            # local overrides (gitignored)
```

Difference from `.env`:
- `.env` → substitutes variables in `compose.yml`
- `env_file` → loads variables into the container's environment

### Strategy 4: Combine

```yaml
services:
  api:
    environment:
      NODE_ENV: production     # hardcoded non-sensitive
    env_file:
      - .env                   # from .env file
    # Individual env from shell also works:
    # The value is taken from your shell if no = is given
    environment:
      - MY_VAR                 # uses value from current shell
```

---

## Override Files for Dev vs Prod

Compose supports multiple files, merged in order:

```
compose.yml            # base (shared config)
compose.override.yml   # auto-loaded for local dev
compose.prod.yml       # production overrides
```

**compose.yml** (base):
```yaml
services:
  api:
    image: myapp/api:latest
    environment:
      NODE_ENV: production

  db:
    image: postgres:16-alpine
    volumes:
      - db-data:/var/lib/postgresql/data

volumes:
  db-data:
```

**compose.override.yml** (auto-loaded in dev):
```yaml
# Development overrides — auto-applied when you run docker compose up
services:
  api:
    build: .                         # build locally instead of pulling image
    volumes:
      - ./src:/app/src               # live code reloading
    environment:
      NODE_ENV: development
      LOG_LEVEL: debug
    command: npm run dev             # use dev server

  db:
    ports:
      - "5432:5432"                  # expose db to host for GUI tools
```

**compose.prod.yml** (production):
```yaml
services:
  api:
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 512m
          cpus: '0.5'
    restart: always
```

```bash
# Dev (auto-loads compose.override.yml)
docker compose up -d

# Production (explicitly specify files)
docker compose -f compose.yml -f compose.prod.yml up -d
```

---

## Secrets in Compose

For sensitive data in production (not just dev):

```yaml
services:
  api:
    secrets:
      - db_password
      - api_key

secrets:
  db_password:
    file: ./secrets/db_password.txt   # read from file
  api_key:
    environment: API_KEY              # read from env variable
```

Secrets are mounted as files at `/run/secrets/<name>` inside the container:

```javascript
// In your app
const dbPassword = fs.readFileSync('/run/secrets/db_password', 'utf8').trim();
```

---

## Project Name

By default, Compose prefixes resource names with the directory name.

```bash
# In directory "myapp/"
docker compose up -d

docker compose ps
# NAME             SERVICE   STATUS
# myapp-api-1      api       Up
# myapp-db-1       db        Up

docker network ls
# myapp_default
```

Override the project name:
```bash
docker compose -p my-project up -d
# OR
export COMPOSE_PROJECT_NAME=my-project
```

---

**Next**: [Compose Commands](./04_compose_commands.md) — the full Compose CLI
