# Terraform Examples

Hands-on Terraform configurations for deploying real infrastructure to AWS, GCP, and Azure — designed to complement the main cloud deployment guides with copy-paste-ready, production-aware code.

## Table of Contents

### Part 1 — Foundation References (Parent Guides)

These examples assume you have read the corresponding deployment guides:

| Guide | Path |
|-------|------|
| AWS Deployment Guide | [../../03_aws_deployment.md](../../03_aws_deployment.md) |
| GCP Deployment Guide | [../../04_gcp_deployment.md](../../04_gcp_deployment.md) |
| Azure Deployment Guide | [../../05_azure_deployment.md](../../05_azure_deployment.md) |

### Part 2 — Example Configurations in This Directory

| Example | Description |
|---------|-------------|
| `vpc.tf` | VPC, subnets, route tables, and internet gateways |
| `ec2.tf` | EC2 instance with security group, IAM role, and user data |
| `rds.tf` | RDS PostgreSQL with subnet group, parameter group, and backups |
| `ecs.tf` | ECS Fargate cluster, task definition, and service |
| `gcp_vm.tf` | GCP Compute Engine instance with firewall rules |
| `gcp_cloud_run.tf` | Cloud Run service with service account and IAM |
| `azure_vm.tf` | Azure virtual machine with NSG and public IP |
| `azure_aks.tf` | Azure Kubernetes Service cluster with node pool |
| `variables.tf` | Shared variable definitions and default values |
| `outputs.tf` | Common output patterns for cross-module use |
| `backend.tf` | Remote state configuration (S3, GCS, Azure Blob) |

## Learning Path

### Beginner Track — Learn the Basics

1. Read the [AWS Deployment Guide](../../03_aws_deployment.md) to understand what infrastructure you are automating
2. Study `variables.tf` and `outputs.tf` to understand how Terraform input/output works
3. Walk through `vpc.tf` — the foundation for almost every cloud deployment
4. Apply `ec2.tf` to deploy your first managed EC2 instance

### Intermediate Track — Multi-Service Infrastructure

1. Combine `vpc.tf` + `ec2.tf` + `rds.tf` for a complete compute and database stack
2. Replace EC2 with `ecs.tf` for container-native deployments
3. Read the [GCP Deployment Guide](../../04_gcp_deployment.md) then try `gcp_vm.tf` and `gcp_cloud_run.tf`
4. Configure `backend.tf` to move your state from local to remote (S3, GCS, or Azure Blob)

### Advanced Track — Production-Ready Patterns

1. Combine all provider examples to understand multi-cloud portability
2. Refactor flat configs into reusable modules (wrap the examples in a `modules/` folder)
3. Add `azure_aks.tf` to explore Kubernetes provisioning via Terraform
4. Integrate remote state with locking and workspace-based environment separation
5. Study `outputs.tf` patterns for chaining modules and passing values between stacks

## What You'll Learn

- How to write clean, readable Terraform HCL configurations
- Provider setup and authentication for AWS, GCP, and Azure
- Core resource types: VPCs, compute instances, managed databases, container services
- Variable definitions, local values, and output declarations
- Remote backend configuration for team-safe state management
- Security group and firewall rule patterns that follow least-privilege
- Tagging and naming conventions for real-world infrastructure
- How to break monolithic configs into composable modules
- Multi-cloud patterns and where provider APIs differ

## Prerequisites

- Familiarity with at least one cloud provider (read any of the parent deployment guides first)
- Terraform CLI installed (`brew install terraform` / `choco install terraform` / download from terraform.io)
- A cloud provider account with appropriate IAM permissions
- Basic understanding of networking concepts (subnets, CIDR blocks, security groups)
- Comfortable reading and editing configuration files

## How to Use This Guide

1. **Read before you apply.** Every `.tf` file in this directory has inline comments explaining each resource block — read through the file fully before running `terraform apply`.
2. **Copy the `variables.tf` pattern.** Never hardcode region names, instance sizes, or project IDs directly into resources; use variables so configurations stay portable.
3. **Use a workspace per environment.** Run `terraform workspace new staging` and `terraform workspace new production` to keep state isolated between environments.
4. **Always run `terraform plan` first.** Review the plan output carefully — especially any lines prefixed with `-` (destroy) before you confirm an apply.
5. **Store state remotely from day one.** Local state is fine for learning, but switch to the `backend.tf` remote configuration before sharing configs with a team or running in CI/CD.

Your infrastructure is code now — version it, review it, and ship it with the same confidence you bring to your application code.
