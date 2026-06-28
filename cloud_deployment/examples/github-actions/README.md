# GitHub Actions Examples

Practical, copy-paste-ready GitHub Actions workflows for deploying applications to AWS, GCP, and Azure. This section is for developers who have learned the cloud basics and want working CI/CD pipelines they can drop into real projects.

## Table of Contents

### Part 1 — Core Concepts and Setup
- [CI/CD Pipelines Guide](../../07_cicd.md) — Full walkthrough of GitHub Actions for cloud deployment
- [AWS Deployment Guide](../../03_aws_deployment.md) — AWS services used in deployment workflows
- [GCP Deployment Guide](../../04_gcp_deployment.md) — GCP services and Cloud Run workflows
- [Azure Deployment Guide](../../05_azure_deployment.md) — Azure services and App Service workflows

### Part 2 — AWS Workflows
- Deploy Node.js to EC2 with SSH and PM2
- Build and push Docker image to ECR, deploy to ECS Fargate
- Deploy serverless functions to AWS Lambda
- Invalidate CloudFront CDN cache on static site deploy

### Part 3 — GCP Workflows
- Deploy containerized app to Cloud Run from source
- Push to Artifact Registry and update Cloud Run service
- Deploy Cloud Functions with environment secrets

### Part 4 — Azure Workflows
- Deploy to Azure App Service via publish profile
- Build and push to Azure Container Registry, deploy to Container Apps
- Deploy Azure Functions with staging slot swap

### Part 5 — Advanced Patterns
- Multi-environment pipelines (dev → staging → production)
- Matrix builds across Node.js / Python versions
- Reusable workflow templates with `workflow_call`
- Secrets management with GitHub Environments and cloud secret managers
- Rollback workflows triggered on failed health checks

## Learning Path

### Beginner Track
1. Read [CI/CD Pipelines Guide](../../07_cicd.md) to understand GitHub Actions fundamentals (triggers, jobs, steps, secrets)
2. Study [AWS Deployment Guide](../../03_aws_deployment.md) sections 1–3 (EC2, ECS) before trying AWS workflows
3. Start with a simple deploy-on-push workflow for a single cloud provider

### Intermediate Track
1. Add Docker build + registry push steps to your workflow (see [Container Orchestration](../../12_containers.md))
2. Split workflows into `build`, `test`, and `deploy` jobs with `needs:` dependencies
3. Use GitHub Environments to gate production deploys with required reviewers
4. Explore GCP Cloud Run and Azure Container Apps workflows

### Advanced Track
1. Build reusable composite actions and shared workflow templates
2. Implement canary or blue/green deploys using cloud provider APIs
3. Integrate cloud secret managers (AWS Secrets Manager, GCP Secret Manager, Azure Key Vault) into pipelines — see [Security Best Practices](../../14_security.md)
4. Add automated rollback steps triggered by failed post-deploy smoke tests

## What You'll Learn

- Structure a GitHub Actions workflow file (triggers, jobs, steps, environment variables, secrets)
- Authenticate to AWS, GCP, and Azure securely from GitHub Actions using OIDC (no long-lived keys)
- Build Docker images in CI and push to ECR, Artifact Registry, and Azure Container Registry
- Deploy to EC2, ECS Fargate, Cloud Run, App Service, Container Apps, Lambda, and Cloud Functions
- Use GitHub Environments and branch protection to gate production deployments
- Cache dependencies and Docker layers to cut workflow run times
- Run database migrations as part of a deploy pipeline safely
- Implement rollback strategies that trigger automatically on deploy failure
- Manage per-environment secrets without duplicating workflow code

## Prerequisites

Before working through these examples you should be comfortable with:

- **Git and GitHub** — branches, pull requests, and repository settings
- **YAML syntax** — indentation, lists, and key-value pairs
- **Basic Docker** — building images and understanding the Dockerfile build context (see [Docker and Containerization](../../02_docker_basics.md) if you need a refresher)
- **One cloud provider account** — free tier on AWS, GCP, or Azure is sufficient to start
- **Cloud CLI basics** — at least one of `aws`, `gcloud`, or `az` configured locally so you understand what the workflow is automating

## How to Use This Guide

1. **Pick your cloud provider first.** Each workflow set targets a specific provider. Start with the one you already have credentials for rather than trying all three at once.
2. **Read the companion deployment guide.** Every example workflow maps to a deployment pattern covered in depth in the provider-specific guide (AWS, GCP, or Azure). Read that first so the workflow steps make sense.
3. **Never commit raw credentials.** All workflows here use GitHub Actions secrets (`${{ secrets.MY_SECRET }}`). Before running any workflow, add the required secrets to your repository under Settings → Secrets and variables → Actions.
4. **Run on a feature branch first.** Adjust the trigger to `push: branches: [your-test-branch]` while iterating, then widen it to `main` once the workflow is stable.
5. **Check the Actions tab for logs.** When a step fails, expand it in the GitHub Actions run log — the error message is almost always there. For cloud-side failures, check the provider console (CloudWatch, Cloud Logging, Azure Monitor) for the actual service error.

Every pipeline you write here is infrastructure. Treat workflow files with the same care as application code — review them, version them, and document the secrets they need.
