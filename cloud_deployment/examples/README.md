# Deployment Examples

Hands-on, ready-to-use examples for the three most important tools in modern cloud deployment: Docker for containerization, Terraform for infrastructure as code, and GitHub Actions for CI/CD automation. Work through these alongside the main cloud deployment guides to see theory applied in practice.

## Table of Contents

### Containerization
- [Docker Examples](./docker/README.md) — Dockerfiles, Compose files, multi-stage builds, and container best practices for AWS, GCP, and Azure deployments

### Infrastructure as Code
- [Terraform Examples](./terraform/README.md) — Reusable Terraform modules and configurations for provisioning cloud infrastructure across AWS, GCP, and Azure

### CI/CD Pipelines
- [GitHub Actions Examples](./github-actions/README.md) — Workflow files for automated build, test, and deploy pipelines targeting all three major cloud providers

## Learning Path

### Beginner Track
Start here if you are new to containers and automated deployment.

1. [Docker Examples](./docker/README.md) — Learn to containerize an app and write a production-ready Dockerfile
2. [GitHub Actions Examples](./github-actions/README.md) — Set up a basic pipeline that builds and pushes a Docker image on every push to `main`

### Intermediate Track
Pick this up once you can containerize an app and have a working cloud account.

3. [Terraform Examples](./terraform/README.md) — Provision cloud infrastructure (VMs, databases, load balancers) with code instead of clicking through console UIs
4. [GitHub Actions Examples](./github-actions/README.md) — Extend your pipeline to deploy the built image to AWS ECS, Cloud Run, or Azure Container Apps automatically

### Advanced Track
For developers who want production-grade, multi-environment setups.

5. [Terraform Examples](./terraform/README.md) — Build modular, multi-environment (dev / staging / prod) infrastructure with remote state and workspaces
6. [GitHub Actions Examples](./github-actions/README.md) — Add approval gates, environment secrets, rollback steps, and multi-cloud deployment stages to your workflow

## What You'll Learn

- Write minimal, secure, multi-stage Dockerfiles that produce small production images
- Use Docker Compose to run multi-service stacks locally and replicate production topology
- Provision and tear down real cloud infrastructure reproducibly using Terraform
- Manage Terraform state remotely and share modules across projects
- Automate the full build-test-push-deploy cycle with GitHub Actions workflows
- Store secrets safely using GitHub encrypted secrets and cloud-native secret managers
- Deploy to AWS (ECS / Elastic Beanstalk), GCP (Cloud Run / GKE), and Azure (Container Apps / App Service) from the same pipeline
- Apply infrastructure changes safely with plan-before-apply workflows and drift detection

## Prerequisites

- Familiarity with the command line and basic Git usage
- A GitHub account (free tier is enough)
- At least one cloud provider account (AWS, GCP, or Azure — all have free tiers)
- Docker Desktop installed locally
- Basic knowledge of what containers and CI/CD pipelines are (the parent [Cloud Deployment Guides](../README.md) cover these if you need a refresher)

## How to Use This Guide

1. **Follow the parent guides first.** These examples complement the numbered chapters in [Cloud Deployment Guides](../README.md). The Docker examples pair naturally with chapter 2, Terraform with chapter 6, and GitHub Actions with chapter 7.
2. **Clone and run, do not just read.** Every example is meant to be executed. Copy the files into a real project, fill in your credentials, and deploy something — even if it is just a "Hello World" container.
3. **Read the comments.** Each example file is heavily commented to explain the reasoning behind each decision, not just the syntax.
4. **Adapt, do not copy blindly.** Treat these as starting points. Swap out the region, the instance type, or the cloud provider to fit your actual project.
5. **Check costs before applying.** Terraform examples may provision billable resources. Review the plan output and use free-tier-eligible services while learning.

The fastest way to get confident with cloud deployment is to ship something real — start with the Docker example, wire it to a GitHub Actions pipeline, and watch your code deploy automatically.
