# Building Docker Images

## What You'll Learn

- Build images with `docker build`
- Understand the build context
- Tag images correctly
- Push to Docker Hub
- Use BuildKit for faster builds

---

## docker build Basics

```bash
# Build an image from the Dockerfile in the current directory
docker build .

# Build and tag in one step
docker build -t my-app .
docker build -t my-app:v1.0.0 .

# Build from a specific Dockerfile
docker build -f Dockerfile.prod -t my-app:prod .

# Build from a specific directory
docker build -t my-app ./backend/
```

The `.` at the end is the **build context** — see below.

---

## The Build Context

When you run `docker build .`, Docker sends the **entire current directory** to the Docker daemon as the "build context". The daemon then executes the Dockerfile instructions using files from this context.

```
docker build .
          ↑
          build context = current directory
          (all files in . are sent to the daemon)
```

This means:
- `COPY` instructions can only copy files that are in the build context
- Large build contexts slow down builds (use `.dockerignore` to exclude)

```bash
# See what's being sent
docker build --no-cache . 2>&1 | head -5
# Sending build context to Docker daemon  125.4MB    ← this should be small!
```

Always have a `.dockerignore` to keep this small.

---

## Full Build Example

Let's build a simple Node.js app.

### Project Structure

```
my-app/
├── server.js
├── package.json
├── package-lock.json
├── Dockerfile
└── .dockerignore
```

**package.json**:
```json
{
  "name": "my-app",
  "version": "1.0.0",
  "scripts": { "start": "node server.js" },
  "dependencies": { "express": "^4.18.0" }
}
```

**server.js**:
```javascript
const express = require('express');
const app = express();

app.get('/', (req, res) => res.json({ message: 'Hello from Docker!' }));
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(3000, () => console.log('Server running on port 3000'));
```

**Dockerfile**:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
USER node
CMD ["node", "server.js"]
```

**.dockerignore**:
```
node_modules/
.git/
*.log
.env
```

### Build and Run

```bash
cd my-app

# Build the image
docker build -t my-app:v1 .

# Step 1/7 : FROM node:20-alpine
# Step 2/7 : WORKDIR /app
# Step 3/7 : COPY package*.json ./
# Step 4/7 : RUN npm ci --only=production
# Step 5/7 : COPY . .
# Step 6/7 : EXPOSE 3000
# Step 7/7 : CMD ["node", "server.js"]
# Successfully built 3e6c1a8d5f2b
# Successfully tagged my-app:v1

# Run it
docker run -d -p 3000:3000 --name my-app my-app:v1

# Test it
curl http://localhost:3000
# {"message":"Hello from Docker!"}

# Clean up
docker rm -f my-app
```

---

## Build Flags

```bash
# Tag with multiple tags in one build
docker build -t my-app:v1.2.0 -t my-app:latest .

# Don't use cache (force rebuild everything)
docker build --no-cache -t my-app .

# Set build arguments
docker build --build-arg NODE_ENV=production --build-arg BUILD_DATE=$(date) .

# See verbose output
docker build --progress=plain .

# Target a specific stage (multi-stage builds)
docker build --target build-stage .

# Build for different platforms
docker build --platform linux/amd64,linux/arm64 .
```

---

## Build Output Explained

```
[+] Building 12.4s (10/10) FINISHED
 => [internal] load build definition from Dockerfile          0.0s
 => [internal] load .dockerignore                             0.0s
 => [internal] load metadata for docker.io/library/node:20-alpine  1.2s
 => [1/6] FROM docker.io/library/node:20-alpine               0.0s  ← CACHED
 => [2/6] WORKDIR /app                                        0.0s  ← CACHED
 => [3/6] COPY package*.json ./                               0.0s  ← CACHED
 => [4/6] RUN npm ci --only=production                        0.0s  ← CACHED
 => [5/6] COPY . .                                            0.1s  ← rebuilt
 => [6/6] CMD ["node", "server.js"]                           0.0s
 => exporting to image                                        0.2s
 => => naming to docker.io/library/my-app:v1
```

Lines marked `CACHED` used layer cache — no work done. Only step 5 ran because the source code changed.

---

## Tagging Strategy

```bash
# Semantic versioning
docker build -t yourname/my-app:1.0.0 .
docker build -t yourname/my-app:1.0 .
docker build -t yourname/my-app:latest .

# Git commit hash (great for CI/CD)
GIT_SHA=$(git rev-parse --short HEAD)
docker build -t yourname/my-app:${GIT_SHA} .

# Environment
docker build -t yourname/my-app:production .
docker build -t yourname/my-app:staging .
```

---

## Pushing to Docker Hub

```bash
# 1. Log in
docker login

# 2. Tag with your username
docker tag my-app:v1 yourDockerHubUsername/my-app:v1.0.0
docker tag my-app:v1 yourDockerHubUsername/my-app:latest

# 3. Push
docker push yourDockerHubUsername/my-app:v1.0.0
docker push yourDockerHubUsername/my-app:latest

# v1.0.0: digest: sha256:... size: 1234
```

Now anyone (or any server) can pull your image:
```bash
docker pull yourDockerHubUsername/my-app:v1.0.0
```

---

## BuildKit (Modern Docker Builder)

BuildKit is Docker's modern build engine — faster, with better caching and parallelism. It's enabled by default in recent Docker versions.

```bash
# Check if BuildKit is active (it usually is)
docker buildx version

# Explicitly use BuildKit
DOCKER_BUILDKIT=1 docker build .

# Create and use a builder instance
docker buildx create --name mybuilder --use
docker buildx build --platform linux/amd64,linux/arm64 -t myapp:latest --push .
```

### BuildKit Features

```dockerfile
# Mount package cache (prevents re-downloading npm packages on every build)
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production

# Use a secret without baking it into the image
RUN --mount=type=secret,id=github_token \
    cat /run/secrets/github_token | npm config set ...
```

---

## Exercise: Build Your First Image

```bash
# 1. Create project directory
mkdir docker-hello && cd docker-hello

# 2. Create the files
cat > index.html << 'EOF'
<!DOCTYPE html>
<html><body><h1>Hello from my Docker image!</h1></body></html>
EOF

cat > Dockerfile << 'EOF'
FROM nginx:alpine
COPY index.html /usr/share/nginx/html/index.html
EXPOSE 80
EOF

# 3. Build
docker build -t my-hello-nginx .

# 4. Run
docker run -d -p 8080:80 --name hello my-hello-nginx

# 5. Test: open http://localhost:8080

# 6. Check image size
docker images my-hello-nginx

# 7. Clean up
docker rm -f hello
docker rmi my-hello-nginx
cd .. && rm -rf docker-hello
```

---

**Next**: [Dockerfile Best Practices](./05_dockerfile_best_practices.md) — write production-grade Dockerfiles
