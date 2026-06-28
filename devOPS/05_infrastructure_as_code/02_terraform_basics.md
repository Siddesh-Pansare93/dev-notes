# Terraform Basics

> Provision cloud infrastructure with Terraform using HashiCorp Configuration Language (HCL).

## Installation

```bash
# macOS
brew install terraform

# Linux
wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
unzip terraform_1.6.0_linux_amd64.zip
sudo mv terraform /usr/local/bin/

# Verify
terraform version
```

## Basic Configuration

```hcl
# main.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t2.micro"

  tags = {
    Name = "web-server"
  }
}

output "instance_ip" {
  value = aws_instance.web.public_ip
}
```

## Workflow

```bash
# Initialize (download providers)
terraform init

# Plan (preview changes)
terraform plan

# Apply (create resources)
terraform apply

# Show state
terraform show

# Destroy
terraform destroy
```

## Variables & Outputs

```hcl
# variables.tf
variable "instance_count" {
  description = "Number of instances"
  type        = number
  default     = 1
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

# outputs.tf
output "instance_ids" {
  value = aws_instance.web[*].id
}
```

```bash
# Override variables
terraform apply -var="instance_count=3"
terraform apply -var-file="prod.tfvars"
```

## State Management

```bash
# Remote state (S3)
terraform {
  backend "s3" {
    bucket         = "terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
  }
}

# Remote state prevents conflicts
# Lock table prevents concurrent changes
```

---

## Summary

- **HCL** is Terraform's language
- **Providers** enable cloud provisioning
- **Resources** are infrastructure components
- **Variables** parameterize configurations
- **State** tracks current infrastructure
- **Plan** previews changes before apply
- **Modules** enable code reuse

Next: [Terraform Modules](./03_terraform_modules.md)
