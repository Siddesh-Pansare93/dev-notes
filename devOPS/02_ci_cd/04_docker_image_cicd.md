# Docker Image CI/CD

> Automate Docker image building, testing, and deployment in your CI/CD pipeline.

## Table of Contents
1. [Building Docker Images in CI](#building-docker-images-in-ci)
2. [Image Registry](#image-registry)
3. [Image Tagging Strategy](#image-tagging-strategy)
4. [Image Security Scanning](#image-security-scanning)
5. [Multi-Platform Builds](#multi-platform-builds)
6. [Caching Docker Layers](#caching-docker-layers)
7. [Deploying Images](#deploying-images)

---

## Building Docker Images in CI

### GitHub Actions Docker Build

```yaml
name: Build Docker Image

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build Docker image
        run: docker build -t myapp:${{ github.sha }} .

      - name: Run tests in container
        run: |
          docker run --rm myapp:${{ github.sha }} npm test

      - name: Push to Docker Hub
        if: github.event_name == 'push'
        env:
          DOCKER_USERNAME: ${{ secrets.DOCKER_USERNAME }}
          DOCKER_PASSWORD: ${{ secrets.DOCKER_PASSWORD }}
        run: |
          docker login -u $DOCKER_USERNAME -p $DOCKER_PASSWORD
          docker tag myapp:${{ github.sha }} myusername/myapp:latest
          docker push myusername/myapp:latest
```

### GitLab CI Docker Build

```yaml
build:docker:
  image: docker:latest
  services:
    - docker:dind
  script:
    # Build image
    - docker build -t myapp:$CI_COMMIT_SHA .
    # Test image
    - docker run --rm myapp:$CI_COMMIT_SHA npm test
    # Push to registry
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker tag myapp:$CI_COMMIT_SHA $CI_REGISTRY_IMAGE:latest
    - docker push $CI_REGISTRY_IMAGE:latest
  only:
    - main
```

---

## Image Registry

### Docker Hub

```yaml
push_dockerhub:
  steps:
    - uses: docker/login-action@v2
      with:
        username: ${{ secrets.DOCKERHUB_USERNAME }}
        password: ${{ secrets.DOCKERHUB_TOKEN }}

    - uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: |
          myusername/myapp:latest
          myusername/myapp:${{ github.sha }}
```

### Amazon ECR

```yaml
push_ecr:
  steps:
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v2
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_KEY }}
        aws-region: us-east-1

    - name: Login to Amazon ECR
      id: login-ecr
      uses: aws-actions/amazon-ecr-login@v1

    - name: Build and push
      uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: |
          ${{ steps.login-ecr.outputs.registry }}/myapp:latest
          ${{ steps.login-ecr.outputs.registry }}/myapp:${{ github.sha }}
```

### GitHub Container Registry (GHCR)

```yaml
push_ghcr:
  steps:
    - uses: docker/login-action@v2
      with:
        registry: ghcr.io
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}

    - uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: |
          ghcr.io/${{ github.repository }}:latest
          ghcr.io/${{ github.repository }}:${{ github.sha }}
```

### Private Registry

```yaml
push_private:
  steps:
    - uses: docker/login-action@v2
      with:
        registry: registry.company.com
        username: ${{ secrets.REGISTRY_USERNAME }}
        password: ${{ secrets.REGISTRY_PASSWORD }}

    - uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: registry.company.com/myapp:${{ github.sha }}
```

---

## Image Tagging Strategy

### Tag Naming Conventions

```bash
# Semantic versioning
myapp:1.0.0
myapp:1.0.1

# Git commit hash
myapp:abc1234d
myapp:abc1234d-short

# Branch name
myapp:main
myapp:develop

# Date-based
myapp:2024-01-15

# Combined
myapp:1.0.0-main-abc1234d
```

### Tag Management

```yaml
build_and_tag:
  steps:
    - uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: |
          myregistry/myapp:latest
          myregistry/myapp:${{ github.sha }}
          myregistry/myapp:${{ github.ref_name }}
          myregistry/myapp:v1.0.0
```

### Semantic Versioning

```yaml
semantic_release:
  steps:
    # Determine version from commits
    - uses: cycjimmy/semantic-release-action@v3
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

    # Get new version from output
    - name: Get new version
      id: semantic
      uses: cycjimmy/semantic-release-action@v3

    # Tag Docker image with version
    - uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: |
          myregistry/myapp:${{ steps.semantic.outputs.new_release_version }}
          myregistry/myapp:latest
```

---

## Image Security Scanning

### Trivy Scanner

```yaml
security_scan:
  image: aquasec/trivy:latest
  script:
    # Build image
    - docker build -t myapp:latest .
    # Scan for vulnerabilities
    - trivy image --severity HIGH,CRITICAL myapp:latest
  allow_failure: true
```

### GitHub Container Scanning

```yaml
scan:
  steps:
    - uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: ghcr.io/${{ github.repository }}:${{ github.sha }}

    - uses: aquasecurity/trivy-action@master
      with:
        image-ref: ghcr.io/${{ github.repository }}:${{ github.sha }}
        format: 'sarif'
        output: 'trivy-results.sarif'

    - uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: 'trivy-results.sarif'
```

### Snyk Scanning

```yaml
snyk_scan:
  steps:
    - uses: snyk/actions/docker@master
      env:
        SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
      with:
        image: myregistry/myapp:${{ github.sha }}
        args: --severity-threshold=high
```

### Scan and Block

```yaml
build_scan_push:
  steps:
    - name: Build Docker image
      run: docker build -t myapp:${{ github.sha }} .

    - name: Scan image
      run: |
        docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
          aquasec/trivy image --exit-code 1 \
          --severity HIGH,CRITICAL \
          myapp:${{ github.sha }}
      # Pipeline fails if vulnerabilities found

    - name: Push to registry
      if: success()
      run: |
        docker login -u ${{ secrets.REGISTRY_USER }} ...
        docker push myapp:${{ github.sha }}
```

---

## Multi-Platform Builds

### Building for Multiple Architectures

```yaml
build_multiplatform:
  steps:
    - uses: docker/setup-buildx-action@v2

    - uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        platforms: linux/amd64,linux/arm64,linux/arm/v7
        tags: |
          myregistry/myapp:latest
          myregistry/myapp:${{ github.sha }}
```

### Dockerfile for Multi-Platform

```dockerfile
# Automatically detects platform
FROM --platform=$BUILDPLATFORM node:18 AS builder
ARG BUILDPLATFORM
ARG TARGETPLATFORM
RUN echo "Building for $TARGETPLATFORM on $BUILDPLATFORM"
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM --platform=$TARGETPLATFORM node:18-alpine
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

---

## Caching Docker Layers

### Inline Cache

```yaml
build_with_cache:
  steps:
    - uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: myregistry/myapp:latest
        cache-from: type=registry,ref=myregistry/myapp:buildcache
        cache-to: type=registry,ref=myregistry/myapp:buildcache,mode=max
```

### GitHub Actions Cache

```yaml
build_with_ghcache:
  steps:
    - uses: docker/setup-buildx-action@v2

    - uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        cache-from: type=gha
        cache-to: type=gha,mode=max
```

---

## Deploying Images

### Kubernetes Deployment

```yaml
deploy_kubernetes:
  steps:
    - uses: actions/checkout@v3

    - name: Update deployment image
      run: |
        kubectl set image \
          deployment/myapp \
          myapp=myregistry/myapp:${{ github.sha }} \
          --record

    - name: Rollout status
      run: |
        kubectl rollout status deployment/myapp
```

### AWS ECS Deployment

```yaml
deploy_ecs:
  steps:
    - name: Update ECS task definition
      id: task-def
      uses: aws-actions/amazon-ecs-render-task-definition@v1
      with:
        task-definition: task-definition.json
        container-name: myapp
        image: ${{ steps.image.outputs.image }}

    - name: Deploy to ECS
      uses: aws-actions/amazon-ecs-deploy-task-definition@v1
      with:
        task-definition: ${{ steps.task-def.outputs.task-definition }}
        service: myapp-service
        cluster: production
        wait-for-service-stability: true
```

### Docker Compose Update

```yaml
deploy_compose:
  script:
    - docker-compose down
    - |
      docker-compose up -d \
        --build \
        -e IMAGE_TAG=$CI_COMMIT_SHA
```

### Rollback Strategy

```yaml
deploy_with_rollback:
  steps:
    - name: Deploy new version
      id: deploy
      run: |
        kubectl set image deployment/myapp \
          myapp=myregistry/myapp:${{ github.sha }}
        if ! kubectl rollout status deployment/myapp --timeout=5m; then
          echo "ROLLBACK=true" >> $GITHUB_OUTPUT
        fi

    - name: Rollback if needed
      if: steps.deploy.outputs.ROLLBACK == 'true'
      run: |
        kubectl rollout undo deployment/myapp
        exit 1
```

---

## Practical Example: Complete Docker CI/CD

```yaml
name: Docker CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      image-tag: ${{ steps.meta.outputs.tags }}
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Log in to registry
        if: github.event_name == 'push'
        uses: docker/login-action@v2
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v4
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=sha,prefix={{branch}}-

      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: .
          push: ${{ github.event_name == 'push' }}
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  scan:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Run Trivy scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ needs.build.outputs.image-tag }}
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload scan results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'

  deploy:
    needs: [build, scan]
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: |
          echo "Deploying ${{ needs.build.outputs.image-tag }}"
          # Deployment logic here
```

---

## Summary

- **Automated builds** ensure consistent image creation
- **Registry management** controls image storage and distribution
- **Tagging strategy** enables version control of images
- **Security scanning** catches vulnerabilities before deployment
- **Multi-platform builds** support diverse infrastructure
- **Layer caching** speeds up build times
- **Safe deployments** include health checks and rollback capability

Next: [Deployment Strategies](./05_deployment_strategies.md) - release patterns
