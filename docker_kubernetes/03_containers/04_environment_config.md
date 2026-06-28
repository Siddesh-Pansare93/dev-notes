# Environment & Configuration

## What You'll Learn

- Pass configuration via environment variables
- Use `--env-file` for multiple variables
- Manage different environments (dev/staging/prod)
- Avoid hardcoding config in images

---

## Why Environment Variables?

A container image should be environment-agnostic — the **same image** runs in dev, staging, and production, with different config injected at runtime.

```
my-api:v1.0.0 image
├── dev:      DATABASE_URL=postgres://localhost/myapp_dev
├── staging:  DATABASE_URL=postgres://staging-db/myapp
└── prod:     DATABASE_URL=postgres://prod-rds/myapp
```

---

## Setting Environment Variables

### -e / --env Flag

```bash
docker run -e KEY=value my-app

# Multiple variables
docker run \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e LOG_LEVEL=info \
  -e DATABASE_URL=postgres://user:pass@db:5432/mydb \
  my-app
```

### --env-file Flag

For many variables, use a file:

```bash
# .env file
NODE_ENV=production
PORT=3000
DATABASE_URL=postgres://user:pass@db:5432/mydb
REDIS_URL=redis://redis:6379
JWT_SECRET=my-secret-key
LOG_LEVEL=info

# Pass the file
docker run --env-file .env my-app
docker run --env-file ./config/production.env my-app
```

**Never commit `.env` to Git.** Add it to `.gitignore` and `.dockerignore`.

---

## Environment Variables in Dockerfiles

### ENV — Runtime Variables

```dockerfile
ENV NODE_ENV=production
ENV PORT=3000
ENV LOG_LEVEL=info
```

These are baked into the image and available at runtime. Override with `-e`:

```bash
# Override the Dockerfile ENV at runtime
docker run -e NODE_ENV=development my-app
```

### ARG — Build-Time Only

```dockerfile
ARG APP_VERSION=1.0.0
ARG BUILD_DATE

LABEL version=$APP_VERSION
LABEL build-date=$BUILD_DATE
```

```bash
docker build \
  --build-arg APP_VERSION=2.0.0 \
  --build-arg BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
  .
```

`ARG` values are NOT in the final image — don't use for secrets.

---

## Accessing Variables in Your App

### Node.js

```javascript
const port = process.env.PORT || 3000;
const dbUrl = process.env.DATABASE_URL;
const env = process.env.NODE_ENV || 'development';

if (!dbUrl) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}
```

### Python

```python
import os

port = int(os.environ.get('PORT', 8000))
db_url = os.environ['DATABASE_URL']  # raises KeyError if missing
log_level = os.environ.get('LOG_LEVEL', 'INFO')
```

---

## View Variables in a Running Container

```bash
# See all environment variables
docker exec my-container env

# Get a specific variable
docker exec my-container printenv DATABASE_URL

# Via inspect
docker inspect my-container --format '{{range .Config.Env}}{{.}}{{"\n"}}{{end}}'
```

---

## Managing Multiple Environments

### Directory Structure

```
config/
├── .env.development
├── .env.staging
└── .env.production
```

```bash
# Development
docker run --env-file config/.env.development my-app

# Production
docker run --env-file config/.env.production my-app
```

### Using Shell Variables

```bash
# Inherit variables from your shell
export DATABASE_URL=postgres://localhost/myapp
docker run -e DATABASE_URL my-app    # no = sign → uses current shell value

# Combine file + override
docker run --env-file .env -e LOG_LEVEL=debug my-app
# -e overrides --env-file values
```

---

## What NOT to Put in Environment Variables

For highly sensitive values (passwords, tokens), environment variables are acceptable for local dev, but for production consider:

1. **Docker secrets** (Swarm/Kubernetes)
2. **AWS Secrets Manager / Parameter Store**
3. **HashiCorp Vault**

Why? `docker inspect` shows env vars in plain text. Anyone with Docker access can read them.

```bash
# This reveals all secrets:
docker inspect my-container | grep -A 20 '"Env"'
```

For true secrets in production, mount them as files instead:
```bash
docker run -v /run/secrets/db_password:/run/secrets/db_password my-app
# App reads: fs.readFileSync('/run/secrets/db_password', 'utf8')
```

---

## Checking Required Variables

Always validate required variables early in your app:

### Node.js

```javascript
const required = ['DATABASE_URL', 'JWT_SECRET', 'REDIS_URL'];
const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}
```

### Python

```python
import os
import sys

required = ['DATABASE_URL', 'SECRET_KEY']
missing = [key for key in required if not os.environ.get(key)]

if missing:
    print(f"Missing required env vars: {', '.join(missing)}", file=sys.stderr)
    sys.exit(1)
```

---

**Next**: [Debugging Containers](./05_debugging.md) — diagnose problems fast
