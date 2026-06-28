# AWS with Terraform

> Provision complete AWS infrastructure using Terraform.

## Complete Example: VPC + EC2 + RDS + ECS

```hcl
# main.tf

terraform {
  backend "s3" {
    bucket         = "terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC Module
module "vpc" {
  source = "./modules/vpc"

  vpc_name           = "${var.environment}-vpc"
  cidr_block         = var.vpc_cidr
  public_subnets    = var.public_subnets
  private_subnets   = var.private_subnets
}

# Security Groups
resource "aws_security_group" "alb" {
  name   = "${var.environment}-alb-sg"
  vpc_id = module.vpc.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# RDS Database
resource "aws_rds_cluster" "main" {
  cluster_identifier      = "${var.environment}-db"
  engine                  = "aurora-postgresql"
  engine_version          = "15.2"
  database_name           = var.db_name
  master_username         = var.db_username
  master_password         = var.db_password
  db_subnet_group_name    = aws_db_subnet_group.main.name
  vpc_security_group_ids  = [aws_security_group.db.id]
  backup_retention_period = 30
  multi_az                = true

  depends_on = [module.vpc]
}

# ALB
resource "aws_lb" "main" {
  name               = "${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = module.vpc.public_subnet_ids

  enable_deletion_protection = true
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.environment}-cluster"
}

# Auto Scaling
resource "aws_autoscaling_group" "ecs" {
  name                = "${var.environment}-asg"
  vpc_zone_identifier = module.vpc.private_subnet_ids
  min_size            = var.ecs_min_size
  max_size            = var.ecs_max_size
  desired_capacity    = var.ecs_desired_capacity
  launch_template {
    id      = aws_launch_template.ecs.id
    version = "$Latest"
  }
}
```

## Variables & Outputs

```hcl
# variables.tf
variable "aws_region" {
  default = "us-east-1"
}

variable "environment" {
  type = string
}

variable "vpc_cidr" {
  type = string
}

variable "db_password" {
  type      = string
  sensitive = true
}

# outputs.tf
output "alb_dns" {
  value = aws_lb.main.dns_name
}

output "db_endpoint" {
  value = aws_rds_cluster.main.endpoint
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}
```

## Deployment

```bash
# Create tfvars file
cat > prod.tfvars <<EOF
environment       = "prod"
vpc_cidr          = "10.0.0.0/16"
public_subnets   = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnets  = ["10.0.11.0/24", "10.0.12.0/24"]
db_name           = "myapp"
db_username       = "admin"
db_password       = "SecurePassword123!"
ecs_min_size      = 1
ecs_desired_capacity = 3
ecs_max_size      = 10
EOF

# Apply
terraform init
terraform plan -var-file=prod.tfvars
terraform apply -var-file=prod.tfvars
```

---

## Summary

- **VPC** provides networking foundation
- **Modules** organize resources
- **Variables** enable reusability
- **Outputs** expose important values
- **Remote state** ensures consistency
- **tfvars** files manage environment-specific config

Next: [Terraform State Management](./05_terraform_state_management.md)
