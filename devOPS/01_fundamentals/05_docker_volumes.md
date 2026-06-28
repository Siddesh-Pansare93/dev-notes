# Docker Volumes

> Master Docker's persistent storage solutions, from bind mounts to named volumes, ensuring your data survives container lifecycle.

## Table of Contents
1. [Storage Problem](#storage-problem)
2. [Volume Types](#volume-types)
3. [Named Volumes](#named-volumes)
4. [Bind Mounts](#bind-mounts)
5. [Anonymous Volumes](#anonymous-volumes)
6. [Volume Drivers](#volume-drivers)
7. [Data Persistence Patterns](#data-persistence-patterns)
8. [Backup & Recovery](#backup--recovery)

---

## Storage Problem

Containers are ephemeral - data is lost when a container stops:

```bash
# Data is lost
docker run -d mysql:latest
docker stop <container>
docker rm <container>
# Database data is gone!

# Solution: Use volumes for persistent data
```

---

## Volume Types

| Type | Location | Use Case | Performance | Portability |
|------|----------|----------|-------------|------------|
| **Named Volume** | `/var/lib/docker/volumes/` | Production databases, long-term data | Good | Limited |
| **Bind Mount** | Host filesystem | Development, config files | Good | Excellent |
| **tmpfs** | RAM | Caches, temporary data | Excellent | Poor |

---

## Named Volumes

Best for production persistent data.

### Creating Named Volumes

```bash
# Create a named volume
docker volume create my-database

# List volumes
docker volume ls

# Inspect volume
docker volume inspect my-database
```

### Using Named Volumes

```bash
# Run container with named volume
docker run -d \
  --name mysql \
  -v my-database:/var/lib/mysql \
  -e MYSQL_ROOT_PASSWORD=secret \
  mysql:latest

# Mount point: /var/lib/mysql (inside container)
# Data stored in: /var/lib/docker/volumes/my-database/_data (host)
```

### Named Volume in Dockerfile

```dockerfile
FROM mysql:latest

# Declare volume (data goes here)
VOLUME ["/var/lib/mysql"]

ENV MYSQL_ROOT_PASSWORD=secret
```

```bash
# Run without specifying volume - Docker creates anonymous volume
docker run -d mysql-image

# Run with named volume - data persists
docker run -d -v my-db:/var/lib/mysql mysql-image
```

### Sharing Data Between Containers

```bash
# Create volume
docker volume create shared-data

# Container 1: writes data
docker run -d --name writer \
  -v shared-data:/data \
  ubuntu sh -c 'while true; do echo "$(date)" >> /data/log.txt; sleep 1; done'

# Container 2: reads data
docker run -it --name reader \
  -v shared-data:/data \
  ubuntu tail -f /data/log.txt

# Both containers access same volume
```

---

## Bind Mounts

Mount host filesystem path directly into container.

### Basic Bind Mount

```bash
# Run container with bind mount
docker run -d \
  --name app \
  -v /home/user/myapp:/app \
  node:18

# Host path: /home/user/myapp
# Container path: /app
# Files are shared bi-directionally
```

### Relative Paths

```bash
# Use absolute paths (portable)
docker run -v /home/user/data:/data nginx

# Relative paths work from current directory
docker run -v $(pwd)/config:/etc/app nginx
```

### Read-Only Bind Mounts

```bash
# Container can't modify host files
docker run -d \
  -v /etc/ssl/certs:/certs:ro \
  nginx

# Flags:
# :ro  = read-only
# :rw  = read-write (default)
```

### Development Workflow

```dockerfile
# Dockerfile for development
FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

# Don't copy source - use bind mount
# CMD ["npm", "start"]
```

```bash
# Development: source code via bind mount
docker run -d \
  --name dev-server \
  -v $(pwd):/app \
  -p 3000:3000 \
  node-app

# Edit source on host → changes reflected in container instantly
```

### Bind Mount Best Practices

```bash
# ✅ Good: Use for development/source code
docker run -v $(pwd):/app node-app

# ⚠️ Limited portability: Requires specific host path
# Windows: -v C:/Users/user/project:/app
# Linux: -v /home/user/project:/app

# ✅ Better for production: Use named volumes
docker run -v my-db:/data mysql
```

---

## Anonymous Volumes

Temporary volumes created automatically.

```bash
# Anonymous volume (no name specified)
docker run -d -v /data mysql

# Docker creates unique named volume automatically
# Volume name: <random_id>

# Volume persists even after container stops
# But hard to reuse across containers
```

### When Anonymous Volumes Are Created

```dockerfile
FROM mysql:latest

# VOLUME declaration creates anonymous volume if not specified
VOLUME ["/var/lib/mysql"]
```

```bash
# Running without explicit volume
docker run -d mysql  # Creates anonymous volume

# List all volumes (including anonymous)
docker volume ls

# Clean up unused anonymous volumes
docker volume prune
```

---

## Volume Drivers

Custom storage backends for volumes.

### Local Driver (Default)

```bash
# Default: stores on host machine
docker volume create my-volume
# Uses: /var/lib/docker/volumes/my-volume/_data
```

### NFS Driver

```bash
# Network File System - mount remote NFS share
docker volume create \
  --driver local \
  --opt type=nfs \
  --opt o=addr=192.168.1.100,vers=4,soft,timeo=180,bg,tcp \
  --opt device=:/export/nfs \
  nfs-volume

docker run -d -v nfs-volume:/data mysql
```

### Other Drivers

- **SMB/CIFS** - Windows network shares
- **iSCSI** - Block storage
- **Ceph** - Distributed storage
- **AWS EBS** - In Docker context, often with plugins

---

## Data Persistence Patterns

### Pattern 1: Database Volume

```bash
# Create database volume
docker volume create postgres-data

# Run with persistent storage
docker run -d \
  --name postgres \
  -v postgres-data:/var/lib/postgresql/data \
  -e POSTGRES_PASSWORD=secret \
  postgres:15

# Data survives container restart
docker restart postgres  # Works!
```

### Pattern 2: Configuration Files

```bash
# Config files on host
ls -la config/
# config.yml
# secrets.env

# Mount into container
docker run -d \
  --name app \
  -v $(pwd)/config/config.yml:/etc/app/config.yml:ro \
  -v $(pwd)/config/secrets.env:/etc/app/.env:ro \
  node-app

# Config changes on host → live in container (read-only)
```

### Pattern 3: Logs Directory

```bash
# Persistent logs
docker run -d \
  --name app \
  -v $(pwd)/logs:/app/logs \
  node-app

# Logs survive container deletion
docker rm app
ls -la logs/  # Logs still here!
```

### Pattern 4: Multi-Container Data Sharing

```bash
# Shared volume between services
docker volume create shared-code

docker run -d --name app -v shared-code:/code node-app
docker run -d --name analyzer -v shared-code:/code python-analyzer

# Both containers access same code
```

---

## Backup & Recovery

### Backup Volume Data

```bash
# Create backup from running container
docker run --rm \
  --volumes-from mysql \
  -v $(pwd)/backups:/backup \
  ubuntu tar cvf /backup/mysql.tar /var/lib/mysql

# Result: mysql.tar in backups directory
```

### Backup Using Tar

```bash
# Full backup of named volume
docker run --rm \
  -v my-database:/data \
  -v $(pwd):/backup \
  ubuntu tar czf /backup/database-$(date +%Y%m%d).tar.gz /data

# Compressed backup with timestamp
```

### Restore from Backup

```bash
# Create new volume
docker volume create mysql-restored

# Restore data
docker run --rm \
  -v mysql-restored:/data \
  -v $(pwd)/backups:/backup \
  ubuntu tar xzf /backup/database-20240101.tar.gz -C /data

# Run container with restored volume
docker run -d \
  --name mysql \
  -v mysql-restored:/var/lib/mysql \
  mysql:latest
```

### Automated Daily Backups

```bash
#!/bin/bash
# backup-volumes.sh

VOLUME_NAME="my-database"
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d-%H%M%S)

docker run --rm \
  -v ${VOLUME_NAME}:/data \
  -v ${BACKUP_DIR}:/backup \
  ubuntu tar czf /backup/backup-${DATE}.tar.gz /data

# Keep last 7 days of backups
find ${BACKUP_DIR} -type f -mtime +7 -delete
```

```bash
# Cron job for daily backups at 2 AM
0 2 * * * /path/to/backup-volumes.sh
```

---

## Volume Best Practices

### 1. Use Named Volumes for Persistent Data

```bash
# ✅ Good - production databases
docker run -d -v postgres-data:/var/lib/postgresql/data postgres

# ❌ Bad - anonymous volumes
docker run -d postgres  # Creates unnamed volume
```

### 2. Separate Application and Data Volumes

```bash
# ✅ Good separation
docker run -d \
  --name app \
  -v app-code:/app \
  -v app-data:/data \
  node-app
```

### 3. Use Bind Mounts for Development Only

```bash
# ✅ Development: live code updates
docker run -d -v $(pwd):/app node-app

# ✅ Production: named volume
docker run -d -v app-code:/app node-app
```

### 4. Document Volume Usage

```dockerfile
# Dockerfile
FROM mysql:latest

VOLUME ["/var/lib/mysql"]
EXPOSE 3306

# In comments or README:
# docker run -d \
#   -v mysql-data:/var/lib/mysql \
#   mysql
```

### 5. Regular Backups for Critical Data

```bash
# Automated backup script
#!/bin/bash
for volume in $(docker volume ls -q); do
  docker run --rm \
    -v ${volume}:/data \
    -v /backups:/backup \
    ubuntu tar czf /backup/${volume}-$(date +%Y%m%d).tar.gz /data
done
```

### 6. Clean Up Unused Volumes

```bash
# Find dangling volumes
docker volume ls -f dangling=true

# Remove dangling volumes
docker volume prune

# Or remove specific volume
docker volume rm unused-volume
```

---

## Practical Example: Database with Backup

```bash
# Create volumes
docker volume create mysql-data
docker volume create mysql-backups

# Run MySQL with persistent data
docker run -d \
  --name mysql \
  -v mysql-data:/var/lib/mysql \
  -e MYSQL_ROOT_PASSWORD=secret \
  -e MYSQL_DATABASE=myapp \
  mysql:8.0

# Wait for MySQL to be ready
sleep 10

# Backup script
docker run --rm \
  -v mysql-data:/data \
  -v mysql-backups:/backups \
  ubuntu tar czf /backups/backup-$(date +%s).tar.gz /data

# Restore if needed
docker run --rm \
  -v mysql-data:/data \
  -v mysql-backups:/backups \
  ubuntu bash -c \
    "cd /data && tar xzf /backups/backup-latest.tar.gz --strip-components=1"
```

---

## Summary

- **Named volumes** store data managed by Docker - best for production
- **Bind mounts** connect host filesystem - great for development
- **Anonymous volumes** temporary, harder to track
- **Backup regularly** for critical data using tar and docker run
- **Separate concerns** - application code vs. persistent data
- **Document volume mounts** in Dockerfile and README

Next: [Dockerizing Applications](./06_dockerizing_applications.md) - from development to containers
