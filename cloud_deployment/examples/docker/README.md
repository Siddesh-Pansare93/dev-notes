# Docker Examples

Ready-to-use Docker configurations and patterns for deploying applications to AWS, GCP, and Azure — covering everything from a basic single-container setup to multi-service production stacks.

## Table of Contents

### Part 1: Context and Related Guides

- [Cloud Deployment Overview](../../README.md) — Full learning path across AWS, GCP, and Azure
- [Docker and Kubernetes Deep Dive](../../../docker_kubernetes/README.md) — Comprehensive Docker fundamentals if you need to build up from scratch
- [GitHub Actions Examples](../github-actions/README.md) — CI/CD workflows that build and push Docker images
- [Terraform Examples](../terraform/README.md) — Infrastructure-as-Code to provision container runtimes

### Part 2: Core Docker Patterns for Cloud Deployment

1. Single-container app — run one service and expose a port
2. Multi-stage Dockerfile — produce a lean production image from a full build environment
3. Docker Compose stack — local parity for a multi-service app (API + DB + cache)
4. Environment-specific configuration — `.env` files, Docker secrets, and build args
5. Health checks and graceful shutdown — required for load balancers and orchestrators
6. Image tagging strategy — versioned tags for blue/green and rollback workflows

### Part 3: Cloud-Specific Patterns

7. Pushing to Amazon ECR — authenticate, tag, and push for ECS/Fargate
8. Pushing to Google Artifact Registry — tag format and authentication for Cloud Run
9. Pushing to Azure Container Registry — `az acr login` and image naming conventions
10. Running containers on AWS ECS Fargate — task definition essentials
11. Running containers on Google Cloud Run — one-command serverless deployment
12. Running containers on Azure Container Apps — revision-based traffic splitting

## Learning Path

### Beginner Track
Start here if you understand basic Docker commands but have not yet deployed containers to a cloud provider.

1. Review the [Cloud Deployment Overview](../../README.md) to understand which cloud services run containers
2. Write a single-container Dockerfile for your application (multi-stage if possible)
3. Learn image tagging strategy so you can roll back
4. Push your first image to a registry (ECR, Artifact Registry, or ACR)
5. Run the image using the simplest managed service on your chosen cloud (Cloud Run is the easiest entry point)

### Intermediate Track
Suitable once you have successfully deployed one container to a cloud provider.

1. Convert your single container into a Compose stack that mirrors production (app + PostgreSQL + Redis)
2. Add health checks to every service so orchestrators can manage restarts
3. Parameterize config with `.env` files and build args so the same image runs in dev, staging, and prod
4. Connect GitHub Actions (see [GitHub Actions Examples](../github-actions/README.md)) to build and push images on every merge
5. Deploy to ECS Fargate or Cloud Run using infrastructure provisioned by Terraform (see [Terraform Examples](../terraform/README.md))

### Advanced Track
For teams running containers in production who need reliability and cost efficiency.

1. Implement multi-stage builds that cut image size by 60–80 %
2. Run containers as a non-root user and enforce read-only root filesystems
3. Set up automated vulnerability scanning in your CI pipeline (Trivy, AWS Inspector, GCP Artifact Analysis)
4. Use blue/green deployments and traffic-weighted revisions for zero-downtime releases
5. Add Prometheus-compatible `/metrics` endpoints and ship logs to CloudWatch, Cloud Logging, or Azure Monitor

## What You'll Learn

- Writing production-grade Dockerfiles with multi-stage builds and minimal attack surface
- Tagging and versioning images so rollbacks are one command away
- Authenticating to cloud-managed container registries (ECR, Artifact Registry, ACR)
- Deploying containers to managed services without managing servers
- Wiring environment-specific secrets without baking credentials into images
- Adding health checks that satisfy load balancers and auto-scalers
- Composing multi-service stacks locally that behave like your cloud environment
- Integrating Docker builds into a CI/CD pipeline so every push is deployable

## Prerequisites

- Comfortable with the Docker CLI: `build`, `run`, `push`, `pull`, `exec`, `logs`
- Basic Dockerfile knowledge: `FROM`, `RUN`, `COPY`, `CMD`, `EXPOSE`
- A cloud provider account (free tier is sufficient to follow along)
- Docker Desktop or Docker Engine installed locally
- Git and basic shell scripting (Bash or PowerShell)

If your Docker fundamentals need work, complete the [Docker and Kubernetes guide](../../../docker_kubernetes/README.md) first — particularly the `01_getting_started`, `02_images`, and `03_containers` sections.

## How to Use This Guide

1. **Follow the cloud deployment context.** Docker is the packaging step; the real value comes from understanding what the cloud service does with your image. Read the [Cloud Deployment Overview](../../README.md) alongside these examples.
2. **Run every example yourself.** Docker patterns are best learned by building, breaking, and fixing — not by reading. Have a terminal open as you work through each section.
3. **Adapt the patterns, not just copy them.** Each snippet is a starting point. Change base images, tweak port numbers, and experiment with flags to build real intuition.
4. **Combine with CI/CD early.** Manual `docker build && docker push` is for learning. The moment a pattern works, automate it with GitHub Actions so you never forget a step.
5. **Check image size after every build.** Run `docker images` and compare sizes between naive and optimized builds — the feedback loop makes multi-stage builds memorable.

You now have the map. Pick your cloud provider, open a terminal, and ship your first container — the first deployment is always the hardest, and it gets fast from there.
