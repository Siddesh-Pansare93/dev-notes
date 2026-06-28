# Running Containers

## What You'll Learn

- Every important `docker run` flag explained
- Container lifecycle states
- Restart policies
- Resource limits
- Running containers in Docker Desktop vs CLI

---

## docker run Anatomy

```bash
docker run [OPTIONS] IMAGE [COMMAND] [ARG...]

# Example with many options:
docker run \
  --detach \                         # run in background
  --name my-api \                    # container name
  --publish 3000:3000 \              # port mapping
  --env NODE_ENV=production \        # environment variable
  --volume /data:/app/data \         # volume mount
  --restart unless-stopped \         # restart policy
  --memory 512m \                    # memory limit
  --cpus 0.5 \                       # CPU limit
  node:20-alpine \                   # image
  node server.js                     # command (overrides CMD)
```

---

## Detached vs Foreground

```bash
# Foreground (default): output goes to your terminal, Ctrl+C stops it
docker run nginx

# Detached: runs in background, prints container ID
docker run -d nginx
# a3f8c1d92e4b7...

# Attach to a running detached container's output
docker attach my-container
# Ctrl+C detaches (stops container if it's the main process!)
# Ctrl+P Ctrl+Q detaches without stopping
```

---

## Interactive Mode

```bash
# -i: keep stdin open
# -t: allocate a pseudo-TTY (makes it feel like a real terminal)
docker run -it ubuntu bash
docker run -it python:3.12-alpine python   # Python REPL
docker run -it node:20-alpine node         # Node REPL

# Run a command non-interactively (no terminal)
docker run ubuntu ls /etc
docker run alpine echo "hello"
```

---

## Port Mapping

```bash
# -p host_port:container_port
docker run -p 8080:80 nginx          # http://localhost:8080 → container:80
docker run -p 5432:5432 postgres:16  # localhost:5432 → container:5432

# Multiple ports
docker run -p 80:80 -p 443:443 nginx

# Bind to specific interface only (localhost only, not network)
docker run -p 127.0.0.1:8080:80 nginx

# Random host port (Docker picks available port)
docker run -p 80 nginx               # docker ps to see which port was assigned

# Find assigned port
docker port my-container             # prints host ports
docker port my-container 80          # prints host port for container port 80
```

---

## Environment Variables

```bash
# Single variable
docker run -e NODE_ENV=production my-app
docker run --env NODE_ENV=production my-app    # same

# Multiple variables
docker run -e NODE_ENV=production -e PORT=3000 -e LOG_LEVEL=info my-app

# From a file
docker run --env-file .env my-app

# .env file format:
# NODE_ENV=production
# PORT=3000
# DATABASE_URL=postgres://...
```

---

## Naming Containers

```bash
# Give a name (makes logs/exec/stop much easier)
docker run --name my-web nginx

# Without a name, Docker assigns a random one like "romantic_bohr"
docker run nginx
docker ps   # NAMES column shows the random name
```

Always use `--name` for anything you'll reference again.

---

## Auto-Remove with --rm

```bash
# Container is deleted automatically when it exits
docker run --rm ubuntu echo "done"
docker run --rm -it ubuntu bash    # exits → container gone, no cleanup
docker run --rm python:3.12 python -c "print('hello')"
```

Use `--rm` for:
- One-off commands
- Running tests
- Any interactive exploration

Don't use `--rm` for:
- Services you want to restart
- Containers whose logs you want to review after they crash

---

## Container Lifecycle

```
         docker run          docker start
              ↓                    ↓
[Created] → [Running] → [Stopped/Exited]
              ↑               ↑
         docker restart   docker stop
                          docker kill
```

### States

```bash
# Running: active, consuming resources
docker ps

# Exited: stopped, still exists (just not running)
docker ps -a    # shows all states

# Paused: frozen, still in memory
docker pause my-container
docker unpause my-container
```

### Lifecycle Commands

```bash
# Create (don't start yet)
docker create --name my-container nginx

# Start a stopped container
docker start my-container

# Stop (SIGTERM, waits 10s, then SIGKILL)
docker stop my-container

# Stop immediately (SIGKILL)
docker kill my-container

# Restart (stop + start)
docker restart my-container

# Remove (must be stopped first)
docker rm my-container

# Remove running container (force)
docker rm -f my-container

# Remove all stopped containers
docker container prune
```

---

## Restart Policies

```bash
docker run --restart POLICY my-app
```

| Policy | Behavior |
|--------|----------|
| `no` | Default. Never restart automatically |
| `always` | Always restart. Even restart when Docker daemon restarts |
| `unless-stopped` | Restart unless *you* manually stopped it. Does NOT restart if you ran `docker stop` |
| `on-failure` | Restart only on non-zero exit code |
| `on-failure:3` | Restart on failure, max 3 times |

```bash
# Long-running service that should survive machine reboots
docker run -d --restart unless-stopped --name nginx nginx

# Service that shouldn't restart if you stop it intentionally
docker run -d --restart unless-stopped --name api my-api

# Stop it:
docker stop api    # Docker remembers you stopped it — won't restart on reboot

# Start Docker → api stays stopped (because you stopped it)
```

---

## Resource Limits

Without limits, a container can use all available CPU and memory.

```bash
# Memory limit
docker run --memory 512m my-app          # max 512 MB RAM
docker run --memory 1g my-app            # max 1 GB RAM
docker run --memory 512m --memory-swap 1g my-app  # 512MB RAM + 512MB swap

# CPU limit
docker run --cpus 0.5 my-app             # use at most 0.5 of 1 CPU core
docker run --cpus 2 my-app               # use at most 2 CPU cores
docker run --cpu-shares 512 my-app       # relative weight (default 1024)

# Check actual usage
docker stats my-app
# CONTAINER  CPU %   MEM USAGE / LIMIT   MEM %   NET I/O     BLOCK I/O
# my-app     0.2%    45MiB / 512MiB      8.8%    648B / 0B   0B / 0B
```

---

## Run Container in Docker Desktop GUI

1. Go to **Images** tab
2. Find your image, click **▶ Run**
3. A dialog opens with fields for:
   - Container name
   - Host port (maps to container port)
   - Volumes (host path : container path)
   - Environment variables (key=value pairs)
4. Click **Run** — generates and executes the `docker run` command

The generated command is shown in the logs — you can copy it for future reference.

---

## Useful Patterns

```bash
# One-off command in current directory
docker run --rm -v "$(pwd)":/work -w /work node:20-alpine node script.js

# Run as current user (useful for file ownership)
docker run --rm --user $(id -u):$(id -g) -v "$(pwd)":/app python:3.12 python /app/script.py

# Background service with logging to file
docker run -d --name my-service \
  --log-driver json-file \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  my-app

# Copy a file into a container
docker cp ./config.json my-container:/app/config.json

# Copy a file out of a container
docker cp my-container:/app/logs/app.log ./app.log
```

---

**Next**: [Container Networking](./02_networking.md) — connect containers to each other and the world
