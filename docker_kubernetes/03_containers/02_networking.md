# Container Networking

## What You'll Learn

- Docker network drivers (bridge, host, none)
- Create custom networks for container-to-container communication
- How Docker DNS works (containers find each other by name)
- Port mapping in depth
- Network inspection and debugging

---

## Why Container Networking?

By default, containers are **isolated** — they can't communicate with each other. To connect them, you use Docker networks.

Common scenario: your API container needs to talk to your database container. They need to be on the same network.

---

## Default Networks

Docker creates three networks automatically:

```bash
docker network ls

# NETWORK ID     NAME      DRIVER    SCOPE
# 3d8b3c4f1e2a   bridge    bridge    local
# 9f1c2d4a8b3e   host      host      local
# 7a2b5c8d1e4f   none      null      local
```

### bridge (default)

When you run `docker run nginx`, it connects to the default `bridge` network automatically.

Containers on the default bridge can communicate by **IP address** but **not by name**.

```bash
# Run two containers on the default bridge
docker run -d --name web1 nginx
docker run -d --name web2 nginx

# web1 IP
docker inspect web1 --format '{{.NetworkSettings.IPAddress}}'
# 172.17.0.2

# web2 can reach web1 by IP (not by name)
docker exec web2 curl http://172.17.0.2    # works
docker exec web2 curl http://web1          # FAILS on default bridge
```

### host (Linux only)

Container shares the host's network namespace — no isolation, no port mapping needed.

```bash
docker run --network host nginx
# nginx now listens on host port 80 directly
# No -p flag needed or available
```

Useful for: maximum performance, networking tools, when you need to access host services.
Not available on Docker Desktop (Mac/Windows) — only Linux.

### none

Container has no network at all.

```bash
docker run --network none alpine
# Can't make any network connections
```

---

## Custom Bridge Networks (Recommended)

**Always use custom networks** for your apps — they support DNS-based discovery (containers find each other by name).

```bash
# Create a custom network
docker network create my-network

# Run containers on it
docker run -d --name db --network my-network postgres:16
docker run -d --name api --network my-network my-app

# Now 'api' can reach 'db' by name!
docker exec api curl http://db:5432       # uses container name as hostname
```

### How Docker DNS Works

On a custom network, Docker runs an internal DNS server. Each container's name (and any aliases) becomes a DNS hostname that resolves to the container's IP.

```
my-network
├── db       → 172.18.0.2   (db.my-network)
├── api      → 172.18.0.3   (api.my-network)
└── redis    → 172.18.0.4   (redis.my-network)

Inside 'api' container:
  ping db        → 172.18.0.2  ✓
  ping redis     → 172.18.0.4  ✓
  ping db.my-network → same ✓
```

This is why Docker Compose configs use service names as hostnames — they're all on the same custom network.

---

## Network Commands

```bash
# Create a network
docker network create my-network

# Create with subnet specified
docker network create --subnet 192.168.1.0/24 my-network

# List networks
docker network ls

# Inspect a network (shows containers and their IPs)
docker network inspect my-network

# Connect a running container to a network
docker network connect my-network my-container

# Disconnect a container from a network
docker network disconnect my-network my-container

# Remove a network (must have no connected containers)
docker network rm my-network

# Remove all unused networks
docker network prune
```

---

## Connecting Containers: Practical Example

```bash
# 1. Create a network
docker network create app-net

# 2. Start PostgreSQL on it
docker run -d \
  --name postgres \
  --network app-net \
  -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_DB=mydb \
  postgres:16-alpine

# 3. Start an API that connects to postgres
# In the app's code: DATABASE_URL=postgres://postgres:secret@postgres:5432/mydb
# The hostname 'postgres' matches the container name
docker run -d \
  --name api \
  --network app-net \
  -e DATABASE_URL=postgres://postgres:secret@postgres:5432/mydb \
  -p 3000:3000 \
  my-api:latest

# 4. Start Redis on the same network
docker run -d \
  --name redis \
  --network app-net \
  redis:alpine

# api can now reach:
#   postgres at hostname "postgres"
#   redis at hostname "redis"
# But postgres and redis are NOT exposed to your machine (no -p flag)

# 5. Clean up
docker rm -f postgres api redis
docker network rm app-net
```

---

## Expose vs Publish

```dockerfile
EXPOSE 3000    # in Dockerfile
```

`EXPOSE` is **documentation only** — it tells humans and tools what port the app uses. It does NOT make the port accessible.

```bash
# -p publishes (makes accessible from host)
docker run -p 8080:3000 my-app    # host:8080 → container:3000

# No -p = port is only accessible from other containers on the same network
docker run my-app    # accessible only inside Docker network
```

**Rule**: between containers, use the container port directly (no `-p` needed). Use `-p` only to expose to your host machine.

```bash
# db is on port 5432 inside Docker network — api connects to it directly
# No -p on db is fine

docker run -d --name db --network app-net postgres:16   # no -p
docker run -d --name api --network app-net \
  -e DB_HOST=db -e DB_PORT=5432 \    # uses internal port 5432
  -p 3000:3000 \                     # only API is exposed to host
  my-api
```

---

## Network Aliases

A container can have multiple DNS names:

```bash
docker run -d \
  --name postgres-primary \
  --network app-net \
  --network-alias db \           # also accessible as "db"
  --network-alias database \     # and as "database"
  postgres:16
```

---

## Inspect Container Network

```bash
# Full network info for a container
docker inspect my-container --format '{{json .NetworkSettings.Networks}}' | python -m json.tool

# Quick IP
docker inspect my-container --format '{{.NetworkSettings.IPAddress}}'

# All networks a container is on
docker inspect my-container --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}: {{$v.IPAddress}}{{"\n"}}{{end}}'
```

---

## Debugging Network Issues

```bash
# Can container A reach container B?
docker exec container-a ping container-b

# Can container reach the internet?
docker exec container-a ping 8.8.8.8
docker exec container-a curl https://httpbin.org/get

# What ports is the container listening on?
docker exec my-container ss -tlnp
docker exec my-container netstat -tlnp

# Inspect the network
docker network inspect app-net

# Run a network debugging container
docker run --rm --network app-net nicolaka/netshoot ping db
```

---

**Next**: [Volumes & Storage](./03_volumes_storage.md) — persist data beyond container restarts
