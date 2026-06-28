# Managing Docker Images

## What You'll Learn

- Pull images from Docker Hub and other registries
- List, inspect, and search images
- Tag images for different registries
- Push images to Docker Hub
- Clean up unused images

---

## Pulling Images

```bash
# Pull latest version
docker pull nginx

# Pull a specific tag
docker pull node:20-alpine

# Pull from a specific registry
docker pull ghcr.io/owner/repo:v1.2.3

# Pull and show each layer download
docker pull postgres:16
# 16: Pulling from library/postgres
# 2e428bd0c2b1: Pull complete   ← layer 1
# 7a9d3a19f65a: Pull complete   ← layer 2
# ...
```

> You don't need to `docker pull` before `docker run` — if the image isn't local, `run` pulls it automatically. Use `pull` explicitly when you want to pre-download or check for updates.

---

## Listing Images

```bash
# List all local images
docker images
docker image ls    # same thing

# REPOSITORY    TAG           IMAGE ID       CREATED         SIZE
# nginx         latest        a72860cb95fd   2 weeks ago     187MB
# node          20-alpine     c962028e7b28   1 month ago     127MB
# postgres      16-alpine     d5f2b8e1a3c7   3 weeks ago     243MB

# List with full image IDs
docker images --no-trunc

# List only image IDs (useful for scripting)
docker images -q

# Filter by repository
docker images nginx

# Show all images including intermediate layers
docker images -a
```

---

## Inspecting Images

```bash
# View full metadata (JSON)
docker inspect nginx

# View image layers and their sizes
docker image history nginx

# IMAGE          CREATED       CREATED BY                               SIZE
# a72860cb95fd   2 weeks ago   CMD ["nginx" "-g" "daemon off;"]         0B
# <missing>      2 weeks ago   EXPOSE map[80/tcp:{}]                    0B
# <missing>      2 weeks ago   COPY /etc/nginx /etc/nginx               27.1kB
# <missing>      2 weeks ago   RUN set -x && addgroup --system ...      67.5MB
# <missing>      2 weeks ago   ENV NGINX_VERSION=1.25.3                 0B

# Get a specific field (the exposed ports)
docker inspect --format='{{.Config.ExposedPorts}}' nginx

# Get the environment variables set in the image
docker inspect --format='{{range .Config.Env}}{{.}}{{"\n"}}{{end}}' node:20-alpine
```

---

## Searching Docker Hub

```bash
# Search for images on Docker Hub
docker search postgres

# NAME                       DESCRIPTION                      STARS  OFFICIAL
# postgres                   The PostgreSQL object-relati...  13000  [OK]
# bitnami/postgresql         Bitnami container image for...   2100
# ...

# Filter to official images only
docker search --filter is-official=true node

# Filter by minimum stars
docker search --filter stars=1000 redis
```

> For browsing and reading documentation, use the Docker Hub website — it has full READMEs, tags list, and usage instructions.

---

## Tagging Images

Tags are aliases — you can have multiple tags pointing to the same image ID.

```bash
# Tag an existing local image
docker tag nginx:latest my-nginx:v1

# Tag for a registry (before pushing)
docker tag my-app:latest myusername/my-app:v1.0.0
docker tag my-app:latest myusername/my-app:latest

# Check — same IMAGE ID, different names
docker images my-app
# REPOSITORY            TAG       IMAGE ID       SIZE
# myusername/my-app     v1.0.0    f7a2d9e4b8c3   89MB
# myusername/my-app     latest    f7a2d9e4b8c3   89MB
```

---

## Pushing to Docker Hub

### Step 1 — Create a Docker Hub Account

Go to [hub.docker.com](https://hub.docker.com/) and create a free account.

### Step 2 — Log In

```bash
docker login
# Username: yourDockerHubUsername
# Password: yourPassword
# Login Succeeded
```

### Step 3 — Tag Your Image

Images must be named `username/repository:tag` to push to Docker Hub.

```bash
docker tag my-local-app:latest yourDockerHubUsername/my-local-app:v1.0.0
docker tag my-local-app:latest yourDockerHubUsername/my-local-app:latest
```

### Step 4 — Push

```bash
docker push yourDockerHubUsername/my-local-app:v1.0.0
docker push yourDockerHubUsername/my-local-app:latest
```

### Step 5 — Pull from Anywhere

```bash
# On any machine with Docker
docker pull yourDockerHubUsername/my-local-app:v1.0.0
```

### Log Out

```bash
docker logout
```

---

## Removing Images

```bash
# Remove a specific image
docker rmi nginx
docker image rm nginx    # same

# Remove by image ID
docker rmi a72860cb95fd

# Remove all unused images (not referenced by any container)
docker image prune

# Remove ALL images (including those used by stopped containers)
docker image prune -a

# Force remove (even if a stopped container references it)
docker rmi -f nginx
```

> You cannot remove an image while a container (even a stopped one) is using it — remove the container first.

---

## Saving and Loading Images (Offline Transfer)

Useful when you can't use a registry (air-gapped environments):

```bash
# Save image to a tar file
docker save nginx:latest -o nginx.tar

# Load image from a tar file
docker load -i nginx.tar
# Loaded image: nginx:latest
```

---

## Disk Usage

```bash
# See how much space Docker is using
docker system df

# TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
# Images          8         2         1.5GB     1.1GB (73%)
# Containers      3         1         45MB      30MB (66%)
# Local Volumes   5         2         2.3GB     800MB (34%)
# Build Cache     15                  450MB     450MB

# Detailed breakdown
docker system df -v
```

---

## Clean Up Everything Unused

```bash
# Remove stopped containers + unused networks + dangling images + build cache
docker system prune

# Also remove unused images (not just dangling ones)
docker system prune -a

# Also remove unused volumes
docker system prune -a --volumes
```

> `docker system prune -a --volumes` frees up all disk space but removes everything not currently in use.

---

## Exercises

```bash
# 1. Pull these images and check their sizes
docker pull alpine:latest
docker pull ubuntu:22.04
docker pull node:20-alpine
docker images    # compare sizes — alpine is ~7MB, ubuntu ~77MB, node+alpine ~127MB

# 2. Look at the layers of each
docker image history alpine
docker image history node:20-alpine
# Notice node:20-alpine has more layers — it built on top of alpine

# 3. Create a tag alias
docker tag alpine:latest my-alpine:v1
docker images my-alpine

# 4. Remove your tag
docker rmi my-alpine:v1

# 5. Clean up
docker image prune
```

---

**Next**: [Writing Dockerfiles](./03_writing_dockerfiles.md) — build your own images
