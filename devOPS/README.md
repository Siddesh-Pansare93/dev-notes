# Modern DevOps Learning Guide

> A comprehensive, hands-on guide to modern DevOps practices including Docker, CI/CD, AWS, Kubernetes, and Infrastructure as Code.

## How to Use This Guide

This guide is designed for developers who want to master modern DevOps practices. Each section builds on the previous one, with:
- **Practical, real-world examples** - not just theory
- **Hands-on exercises** - build and deploy actual projects
- **Best practices** - learn industry standards from the start
- **Progressive complexity** - from basics to advanced patterns

---

## Table of Contents

### [`01_fundamentals/`](./01_fundamentals/) — Docker & Containerization

| # | File | Topics |
|---|------|--------|
| 1 | [Introduction to DevOps](./01_fundamentals/01_introduction_to_devops.md) | DevOps culture, principles, tools landscape |
| 2 | [Docker Basics](./01_fundamentals/02_docker_basics.md) | Images, containers, Dockerfile, basic commands |
| 3 | [Dockerfile Best Practices](./01_fundamentals/03_dockerfile_best_practices.md) | Multi-stage builds, layer optimization, security |
| 4 | [Docker Networking](./01_fundamentals/04_docker_networking.md) | Bridge, host, overlay networks, port mapping |
| 5 | [Docker Volumes](./01_fundamentals/05_docker_volumes.md) | Persistent storage, bind mounts, named volumes |
| 6 | [Dockerizing Applications](./01_fundamentals/06_dockerizing_applications.md) | Node.js, Python, full-stack apps |

### [`02_ci_cd/`](./02_ci_cd/) — Continuous Integration & Deployment

| # | File | Topics |
|---|------|--------|
| 1 | [CI/CD Concepts](./02_ci_cd/01_cicd_concepts.md) | CI vs CD, pipelines, automated testing |
| 2 | [GitHub Actions Basics](./02_ci_cd/02_github_actions_basics.md) | Workflows, jobs, steps, triggers |
| 3 | [Building & Testing](./02_ci_cd/03_building_and_testing.md) | Automated builds, test runners, code quality |
| 4 | [Docker Image CI/CD](./02_ci_cd/04_docker_image_cicd.md) | Build, tag, push to registries (Docker Hub, ECR) |
| 5 | [Deployment Strategies](./02_ci_cd/05_deployment_strategies.md) | Blue-green, canary, rolling deployments |
| 6 | [Secrets Management](./02_ci_cd/06_secrets_management.md) | GitHub Secrets, environment variables, security |
| 7 | [Advanced Workflows](./02_ci_cd/07_advanced_workflows.md) | Matrix builds, reusable workflows, caching |

### [`03_aws_essentials/`](./03_aws_essentials/) — AWS Core Services

| # | File | Topics |
|---|------|--------|
| 1 | [AWS Overview](./03_aws_essentials/01_aws_overview.md) | Regions, AZs, IAM, AWS CLI, credentials |
| 2 | [EC2 Essentials](./03_aws_essentials/02_ec2_essentials.md) | Instances, AMIs, security groups, key pairs |
| 3 | [ECS & ECR](./03_aws_essentials/03_ecs_and_ecr.md) | Container registry, ECS clusters, task definitions |
| 4 | [Load Balancers](./03_aws_essentials/04_load_balancers.md) | ALB, NLB, target groups, health checks |
| 5 | [Auto Scaling](./03_aws_essentials/05_auto_scaling.md) | Auto Scaling Groups, launch templates, scaling policies |
| 6 | [RDS & Databases](./03_aws_essentials/06_rds_and_databases.md) | RDS, backups, multi-AZ, read replicas |
| 7 | [S3 & CloudFront](./03_aws_essentials/07_s3_and_cloudfront.md) | Object storage, CDN, static site hosting |
| 8 | [VPC Networking](./03_aws_essentials/08_vpc_networking.md) | Subnets, route tables, NAT gateways, security |

### [`04_orchestration/`](./04_orchestration/) — Container Orchestration

| # | File | Topics |
|---|------|--------|
| 1 | [Docker Compose](./04_orchestration/01_docker_compose.md) | Multi-container apps, docker-compose.yml, networks |
| 2 | [Kubernetes Basics](./04_orchestration/02_kubernetes_basics.md) | Pods, nodes, clusters, kubectl basics |
| 3 | [Kubernetes Deployments](./04_orchestration/03_kubernetes_deployments.md) | Deployments, ReplicaSets, rolling updates |
| 4 | [Services & Networking](./04_orchestration/04_services_and_networking.md) | ClusterIP, NodePort, LoadBalancer, Ingress |
| 5 | [ConfigMaps & Secrets](./04_orchestration/05_configmaps_and_secrets.md) | Configuration management, sensitive data |
| 6 | [Persistent Storage](./04_orchestration/06_persistent_storage.md) | PersistentVolumes, PersistentVolumeClaims, StorageClasses |
| 7 | [EKS (AWS Kubernetes)](./04_orchestration/07_eks_aws_kubernetes.md) | Managed Kubernetes, node groups, kubectl setup |
| 8 | [Helm Package Manager](./04_orchestration/08_helm_package_manager.md) | Charts, releases, templating, repositories |

### [`05_infrastructure_as_code/`](./05_infrastructure_as_code/) — Infrastructure as Code

| # | File | Topics |
|---|------|--------|
| 1 | [IaC Concepts](./05_infrastructure_as_code/01_iac_concepts.md) | Infrastructure as Code, declarative vs imperative |
| 2 | [Terraform Basics](./05_infrastructure_as_code/02_terraform_basics.md) | HCL, providers, resources, state files |
| 3 | [Terraform Modules](./05_infrastructure_as_code/03_terraform_modules.md) | Reusable modules, input variables, outputs |
| 4 | [AWS with Terraform](./05_infrastructure_as_code/04_aws_with_terraform.md) | VPC, EC2, RDS, S3 with Terraform |
| 5 | [Terraform State Management](./05_infrastructure_as_code/05_terraform_state_management.md) | Remote state, S3 backend, state locking |
| 6 | [Terraform Workspaces](./05_infrastructure_as_code/06_terraform_workspaces.md) | Environments (dev, staging, prod) |
| 7 | [CloudFormation Basics](./05_infrastructure_as_code/07_cloudformation_basics.md) | AWS native IaC, templates, stacks |

### [`06_monitoring/`](./06_monitoring/) — Monitoring & Observability

| # | File | Topics |
|---|------|--------|
| 1 | [Observability Concepts](./06_monitoring/01_observability_concepts.md) | Metrics, logs, traces, the three pillars |
| 2 | [Application Logging](./06_monitoring/02_application_logging.md) | Structured logging, log levels, best practices |
| 3 | [CloudWatch](./06_monitoring/03_cloudwatch.md) | Logs, metrics, alarms, dashboards |
| 4 | [Prometheus & Grafana](./06_monitoring/04_prometheus_and_grafana.md) | Metrics collection, visualization, alerting |
| 5 | [Distributed Tracing](./06_monitoring/05_distributed_tracing.md) | Jaeger, OpenTelemetry, request tracing |
| 6 | [Health Checks & Alerts](./06_monitoring/06_health_checks_and_alerts.md) | Liveness, readiness probes, alerting strategies |
| 7 | [Performance Monitoring](./06_monitoring/07_performance_monitoring.md) | APM tools, profiling, optimization |

---

## Learning Paths

### Quick Start (2-3 weeks)
`01_fundamentals` → `02_ci_cd` (GitHub Actions basics) → `03_aws_essentials` (EC2, ECS basics)

### Docker & CI/CD Focus (4-5 weeks)
`01_fundamentals` → `02_ci_cd` → `04_orchestration` (Docker Compose)

### AWS DevOps Engineer (6-8 weeks)
`01_fundamentals` → `02_ci_cd` → `03_aws_essentials` → `04_orchestration` (ECS/EKS) → `05_infrastructure_as_code` → `06_monitoring`

### Kubernetes Focus (5-6 weeks)
`01_fundamentals` → `04_orchestration` (Kubernetes, EKS, Helm) → `05_infrastructure_as_code` → `06_monitoring`

### Complete DevOps Path (10-12 weeks)
Follow all sections in order: `01` through `06`

---

## Prerequisites

- Basic understanding of Linux/Unix command line
- Familiarity with at least one programming language (Node.js, Python, etc.)
- Git basics (clone, commit, push, pull)
- Basic networking concepts (ports, IP addresses, HTTP)

## Required Tools

### Install these tools to follow along:

```bash
# Docker
# Install from: https://docs.docker.com/get-docker/

# AWS CLI
# Install from: https://aws.amazon.com/cli/

# kubectl (Kubernetes CLI)
# Install from: https://kubernetes.io/docs/tasks/tools/

# Terraform
# Install from: https://www.terraform.io/downloads

# Optional but recommended:
# - VS Code with Docker extension
# - Postman or curl for API testing
# - k9s (Kubernetes CLI UI)
```

---

## Key Concepts Mapped

| Concept | Tools/Services |
|---------|----------------|
| **Containerization** | Docker, containerd |
| **Container Registry** | Docker Hub, AWS ECR, GitHub Container Registry |
| **CI/CD** | GitHub Actions, GitLab CI, Jenkins |
| **Container Orchestration** | Kubernetes, AWS ECS, Docker Swarm |
| **Cloud Provider** | AWS (primary), Azure, GCP |
| **Infrastructure as Code** | Terraform, CloudFormation, Pulumi |
| **Monitoring** | CloudWatch, Prometheus, Grafana, Datadog |
| **Load Balancing** | AWS ALB/NLB, Nginx, Traefik |
| **Auto Scaling** | AWS Auto Scaling, Kubernetes HPA |
| **Service Mesh** | Istio, Linkerd, AWS App Mesh |

---

## Hands-On Projects

Throughout this guide, you'll build:

1. **Dockerized Full-Stack App** - Multi-container application with Docker Compose
2. **CI/CD Pipeline** - Automated testing and deployment with GitHub Actions
3. **AWS ECS Deployment** - Deploy containerized app to AWS with auto-scaling
4. **Kubernetes Cluster** - Deploy and manage apps on Kubernetes/EKS
5. **Infrastructure as Code** - Provision complete AWS infrastructure with Terraform
6. **Monitoring System** - Set up comprehensive observability stack

---

## Best Practices Covered

- **Security**: Least privilege, secrets management, image scanning
- **Cost Optimization**: Resource right-sizing, auto-scaling, spot instances
- **High Availability**: Multi-AZ deployments, health checks, redundancy
- **Disaster Recovery**: Backups, snapshot strategies, failover
- **Documentation**: Infrastructure documentation, runbooks, diagrams

---

## Additional Resources

- **AWS Free Tier**: Most examples use free tier eligible services
- **Docker Hub**: Store and share container images
- **GitHub Actions**: 2000 free minutes/month for CI/CD
- **Terraform Cloud**: Free tier for state management

---

Happy learning! 🚀
