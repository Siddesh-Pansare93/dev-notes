# Docker Networking

> Understand Docker's networking models, how containers communicate, and how to design resilient multi-container networks.

## Table of Contents
1. [Docker Network Types](#docker-network-types)
2. [Bridge Network](#bridge-network)
3. [Host Network](#host-network)
4. [Overlay Network](#overlay-network)
5. [Container Communication](#container-communication)
6. [Port Mapping](#port-mapping)
7. [DNS Resolution](#dns-resolution)
8. [Network Best Practices](#network-best-practices)

---

## Docker Network Types

Docker supports multiple networking drivers for different use cases:

### Built-in Network Drivers

| Driver | Use Case | Scope |
|--------|----------|-------|
| **bridge** | Default, containers on same host | Single host |
| **host** | High performance, direct host access | Single host |
| **overlay** | Multi-host, Docker Swarm/clustering | Multi-host |
| **macvlan** | Direct MAC address assignment | Single/Multi-host |
| **none** | No networking (isolated) | Single host |

---

## Bridge Network

The default network driver for standalone containers.

### Default Bridge Network

```bash
# List networks
docker network ls

# Inspect default bridge
docker network inspect bridge

# Run container on default bridge
docker run -d --name web nginx
```

**Limitations of default bridge:**
- No automatic DNS resolution by container name
- Harder to manage multiple containers
- Limited customization

### User-Defined Bridge Network

**Best practice:** Always use user-defined bridge networks for production.

```bash
# Create a bridge network
docker network create my-network

# Run containers on user-defined network
docker run -d --name db --network my-network mysql:latest
docker run -d --name app --network my-network node-app

# Containers on same user-defined network can communicate by name
# Inside app container: mysql -h db -u root -ppassword
```

### Why User-Defined Networks?

```bash
# User-defined networks provide:
# 1. Automatic DNS resolution by container name
# 2. Better isolation
# 3. Network-scoped isolation
# 4. Dynamic container connection/disconnection

# Example: docker-compose creates user-defined networks automatically
```

### Network Inspection

```bash
# Inspect network
docker network inspect my-network

# Output shows:
# {
#   "Name": "my-network",
#   "Driver": "bridge",
#   "Containers": {
#     "abc123...": {
#       "Name": "db",
#       "IPv4Address": "172.19.0.2/16"
#     }
#   }
# }
```

---

## Host Network

Container shares the host's network namespace (no isolation).

```bash
# Run container with host network
docker run -d --network host nginx

# Container uses host's ports directly
# Port 80 is bound to host port 80
# Cannot specify port mapping with host network
```

### When to Use Host Network

- **Performance-critical applications** - no networking overhead
- **Applications needing all host ports** - monitoring agents, tunnels
- **Legacy applications** - expecting direct host access

### Security Implications

```bash
# ⚠️ WARNING: Host network bypasses container isolation
# Only use with trusted images and controlled environments

# Bad practice in shared/untrusted environments:
docker run -d --network host suspicious-image
```

---

## Overlay Network

For multi-host container communication (Docker Swarm/clustering).

```bash
# Create overlay network (requires Docker Swarm mode)
docker swarm init
docker network create --driver overlay my-overlay

# Run service on overlay network
docker service create --network my-overlay --name db mysql:latest
docker service create --network my-overlay --name app node-app
```

**Overlay networks use:**
- VXLAN for encapsulation
- Gossip protocol for service discovery
- Built-in load balancing

---

## Container Communication

### DNS-Based Communication

**Within user-defined bridge network:**

```dockerfile
# app.js
const mysql = require('mysql');
const connection = mysql.createConnection({
  host: 'db',           // Container name as hostname
  user: 'root',
  password: 'secret',
  database: 'myapp'
});
```

### IP-Based Communication

```bash
# Get container IP
docker inspect -f '{{.NetworkSettings.IPAddress}}' my-container

# Ping by IP (within same network)
docker exec app-container ping 172.19.0.2
```

### Service Discovery

```bash
# Docker's embedded DNS server: 127.0.0.11:53

# Inside container:
# - Resolve 'db' → IP of db container
# - Resolve 'db.my-network' → IP of db container
# - Resolve by service name (Swarm mode)
```

---

## Port Mapping

### Basic Port Mapping

```bash
# Map container port to host port
docker run -d -p 8080:80 nginx
# Access: http://localhost:8080

# Map to specific host interface
docker run -d -p 127.0.0.1:8080:80 nginx
# Only accessible locally

# Map to all interfaces
docker run -d -p 0.0.0.0:8080:80 nginx
# Accessible from anywhere
```

### Port Mapping in Dockerfile

```dockerfile
FROM nginx:latest

# EXPOSE documents the port (doesn't actually publish)
EXPOSE 80 443

# Still need -p flag when running:
# docker run -p 8080:80 my-nginx
```

### Multiple Port Mappings

```bash
# Multiple -p flags
docker run -d \
  -p 80:80 \
  -p 443:443 \
  -p 3000:3000 \
  my-app

# Port ranges
docker run -d -p 8080-8090:80-90 my-app
```

---

## DNS Resolution

### Container Hostname Resolution

```bash
# Default hostname = container ID
docker run -d ubuntu sleep 1000
# Hostname: a3f4b2c1e9d7

# Set custom hostname
docker run -d --hostname myapp ubuntu sleep 1000
# Hostname: myapp

# Set FQDN (requires user-defined network)
docker run -d --network my-network --hostname db.example.com mysql
```

### External DNS

```dockerfile
# Dockerfile with custom DNS
FROM ubuntu:latest

# Override DNS in container
# Use --dns flag when running:
# docker run --dns 8.8.8.8 my-image
```

### DNS in User-Defined Networks

```bash
# Create network
docker network create my-network

# Run containers - automatic DNS resolution
docker run -d --name web --network my-network nginx
docker run -d --name api --network my-network node-app

# DNS automatically configured
# web can reach api via 'api' hostname
```

---

## Network Best Practices

### 1. Use User-Defined Bridge Networks

```bash
# ✅ Good
docker network create app-network
docker run -d --network app-network mysql
docker run -d --network app-network app

# ❌ Bad
docker run -d mysql  # Uses default bridge
docker run -d app    # Uses default bridge
```

### 2. Isolate Networks by Purpose

```bash
# Separate networks for different concerns
docker network create frontend-network
docker network create backend-network
docker network create db-network

# Frontend services
docker run -d --network frontend-network web-server

# Backend services
docker run -d --network backend-network api-server

# Database
docker run -d --network db-network mysql

# Connect services to multiple networks if needed
docker network connect backend-network web-server
```

### 3. Security: Only Expose Necessary Ports

```dockerfile
# Dockerfile
FROM node:18

EXPOSE 3000  # Document internal port

# ⚠️ Don't expose unnecessary ports
```

```bash
# Running
# ✅ Good - only expose port 3000
docker run -d -p 3000:3000 app

# ❌ Bad - exposes unnecessary ports
docker run -d -p 3000:3000 -p 5432:5432 -p 6379:6379 app
```

### 4. Use DNS Names Instead of IP Addresses

```javascript
// ✅ Good
const db = mysql.createConnection({
  host: 'db',  // Works even if IP changes
  user: 'root'
});

// ❌ Bad
const db = mysql.createConnection({
  host: '172.19.0.2',  // Fragile, depends on order
  user: 'root'
});
```

### 5. Document Port Requirements

```dockerfile
FROM node:18

# Clearly document what ports are needed
EXPOSE 3000

# Also document in comments
# - 3000: HTTP server
# - 5000: Health check endpoint (internal only)
```

### 6. Use Health Checks with Port Mapping

```dockerfile
FROM nginx:latest

# Check if service is healthy
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1
```

### 7. Network Across Hosts

```bash
# For single host: bridge network
# For multiple hosts: overlay network (Docker Swarm)

docker swarm init
docker network create --driver overlay shared-network

docker service create \
  --network shared-network \
  --name db \
  mysql:latest

docker service create \
  --network shared-network \
  --name app \
  node-app
```

---

## Practical Example: Multi-Container App

```bash
# Create isolated network
docker network create blog-network

# Run database
docker run -d \
  --name postgres \
  --network blog-network \
  -e POSTGRES_PASSWORD=secret \
  postgres:15

# Run application
docker run -d \
  --name app \
  --network blog-network \
  -p 3000:3000 \
  -e DB_HOST=postgres \
  -e DB_PASSWORD=secret \
  node-app

# Run reverse proxy
docker run -d \
  --name nginx \
  --network blog-network \
  -p 80:80 \
  -v nginx.conf:/etc/nginx/nginx.conf \
  nginx:latest

# All containers communicate via DNS:
# app talks to postgres via 'postgres' hostname
# nginx talks to app via 'app' hostname
```

---

## Summary

- **User-defined bridge networks** are the standard for multi-container apps
- **DNS resolution by container name** works automatically in user-defined networks
- **Port mapping** controls host access; EXPOSE documents container ports
- **Multiple networks** provide isolation and security
- **Host network** should be rare, only for high-performance needs
- **Overlay networks** enable multi-host communication in Docker Swarm

Next: [Docker Volumes](./05_docker_volumes.md) - persistent storage patterns
