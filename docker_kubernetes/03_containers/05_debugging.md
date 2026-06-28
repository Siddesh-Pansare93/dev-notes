# Debugging Containers

## What You'll Learn

- Read and follow logs
- Get a shell inside a running container
- Inspect container details
- Monitor resource usage
- Copy files in and out
- Debug containers that won't start

---

## Viewing Logs

```bash
# View all logs
docker logs my-container

# Follow logs in real-time (like tail -f)
docker logs -f my-container

# Show last N lines
docker logs --tail 50 my-container

# Show logs with timestamps
docker logs --timestamps my-container

# Combine: last 20 lines, follow, with timestamps
docker logs -f --tail 20 --timestamps my-container

# Filter by time
docker logs --since 10m my-container     # last 10 minutes
docker logs --since 2024-01-15 my-container
docker logs --until 2024-01-15T10:00:00 my-container
```

In Docker Desktop: click the container → **Logs** tab (searchable, filterable).

---

## Shell Inside a Running Container

```bash
# Open bash
docker exec -it my-container bash

# If bash isn't available (alpine uses sh)
docker exec -it my-container sh

# Run a single command
docker exec my-container ls /app
docker exec my-container cat /etc/nginx/nginx.conf
docker exec my-container env                          # list env vars
docker exec my-container ps aux                       # running processes

# Run as root (even if container normally runs as non-root)
docker exec -it --user root my-container sh
```

### What to Check Once Inside

```bash
# Check if app process is running
ps aux

# Check network connectivity
ping google.com
curl http://localhost:3000/health

# Check disk space
df -h

# Check environment variables
env | grep DATABASE

# Check open ports
ss -tlnp   # or netstat -tlnp

# Check file permissions
ls -la /app
```

---

## docker inspect

Full JSON metadata about a container:

```bash
# Full inspect
docker inspect my-container

# Format specific fields (Go template syntax)
docker inspect my-container --format '{{.State.Status}}'
docker inspect my-container --format '{{.State.ExitCode}}'
docker inspect my-container --format '{{.NetworkSettings.IPAddress}}'
docker inspect my-container --format '{{.Config.Cmd}}'
docker inspect my-container --format '{{range .Config.Env}}{{.}}{{"\n"}}{{end}}'

# Get the PID on the host
docker inspect my-container --format '{{.State.Pid}}'
```

---

## Monitoring Resource Usage

```bash
# Live stats for all running containers
docker stats

# CONTAINER ID   NAME       CPU %   MEM USAGE / LIMIT   MEM %   NET I/O       BLOCK I/O
# a3f8c1d9       my-api     0.5%    45MiB / 512MiB      8.8%    648kB / 2MB   0B / 8MB
# b4e9d2c1       postgres   1.2%    123MiB / 1GiB       12.0%   12MB / 8MB    2MB / 50MB

# Stats for one container
docker stats my-container

# One-time snapshot (no live stream)
docker stats --no-stream

# Processes inside a container
docker top my-container
# UID   PID    PPID   CMD
# 1000  12345  12344  node server.js
```

Docker Desktop: **Stats** tab inside a container shows nice charts.

---

## Copying Files

```bash
# Copy from host INTO container
docker cp ./config.json my-container:/app/config.json
docker cp ./certs/ my-container:/etc/ssl/certs/

# Copy from container OUT to host
docker cp my-container:/app/logs/error.log ./error.log
docker cp my-container:/app/uploads ./local-uploads/

# Works even on stopped containers
docker cp my-stopped-container:/app/data ./recovered-data/
```

---

## Debugging a Container That Won't Start

### Check Exit Code

```bash
docker ps -a    # shows Exited (N) — N is the exit code

# Common exit codes:
# 0   = success (for one-shot tasks)
# 1   = general error in your application
# 125 = Docker itself had an error (bad flags)
# 126 = command found but not executable
# 127 = command not found
# 137 = killed with SIGKILL (OOM or manual kill)
# 143 = graceful shutdown (SIGTERM)
```

### Read the Logs of a Dead Container

```bash
docker logs my-failed-container    # logs still accessible even after container exits
```

### Override the Entrypoint

If the container exits immediately, override it with a shell:

```bash
# Override CMD
docker run -it my-broken-image sh

# Override both ENTRYPOINT and CMD
docker run -it --entrypoint sh my-broken-image

# Then manually run the startup command to see the error
node server.js    # run what CMD would have run
```

### Check if It's a Config Issue

```bash
# Run with minimal flags, just the image
docker run --rm -it my-image sh
env               # check environment
ls -la /app       # check files are there
node -e "require('./server.js')"    # try loading the module
```

---

## Common Errors and Fixes

### "Port already in use"

```bash
# Error: bind: address already in use
# Something else is using that port

# Find what's using port 8080
# Linux/Mac:
lsof -i :8080
# Windows:
netstat -ano | findstr :8080

# Either stop that process or use a different host port
docker run -p 8081:80 nginx    # use 8081 instead
```

### "No such file or directory" on startup

```bash
# CMD ["node", "server.js"] but server.js doesn't exist at that path
docker exec -it my-container sh
ls /app     # see what's actually there
pwd         # check working directory
```

### "Permission denied"

```bash
# Running as non-root but trying to write to a root-owned directory
# Fix: chown in Dockerfile or use a volume
docker run --user root -it my-container sh    # debug as root
chown -R appuser:appuser /app/logs            # then fix Dockerfile
```

### Container exits immediately

```bash
docker logs my-container    # check what it printed before dying
# Often: missing env var, can't connect to database, file not found
```

### Can't connect to database

```bash
docker exec -it api sh
# Can you reach the db host at all?
ping postgres           # should resolve if on same network
curl http://postgres:5432    # should get "connection refused" (not "unknown host")

# "unknown host" = not on the same network
docker network inspect app-net    # check which containers are on it
```

---

## Useful Debugging Containers

```bash
# netshoot: Swiss army knife for network debugging
docker run --rm -it --network my-network nicolaka/netshoot

# busybox: minimal Unix tools
docker run --rm -it busybox

# Attach a sidecar debugger to another container's network namespace
docker run --rm -it --network container:my-app nicolaka/netshoot
```

---

**Next**: [Docker Compose Intro](../04_compose/01_compose_intro.md) — run multi-container apps easily
