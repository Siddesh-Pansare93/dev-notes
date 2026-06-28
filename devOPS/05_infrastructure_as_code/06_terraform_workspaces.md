# Terraform Workspaces

> Manage multiple environments (dev, staging, prod) with Terraform workspaces.

## Workspace Basics

```bash
# Create workspace
terraform workspace new dev
terraform workspace new staging
terraform workspace new prod

# List workspaces
terraform workspace list
# Output:
#   default
# * dev
#   staging
#   prod

# Switch workspace
terraform workspace select prod

# Current workspace
terraform workspace show
```

## Using Workspaces

```hcl
# main.tf - select config based on workspace
locals {
  workspace_config = {
    dev = {
      instance_type = "t2.micro"
      instance_count = 1
      db_allocated_storage = 20
    }
    staging = {
      instance_type = "t2.small"
      instance_count = 2
      db_allocated_storage = 50
    }
    prod = {
      instance_type = "t3.medium"
      instance_count = 5
      db_allocated_storage = 100
    }
  }

  config = local.workspace_config[terraform.workspace]
}

resource "aws_instance" "web" {
  count         = local.config.instance_count
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = local.config.instance_type

  tags = {
    Environment = terraform.workspace
  }
}
```

## Environment-Specific State

```bash
# Each workspace has separate state
terraform workspace select dev
terraform apply -var-file=dev.tfvars
# State: terraform.tfstate.d/dev/terraform.tfstate

terraform workspace select prod
terraform apply -var-file=prod.tfvars
# State: terraform.tfstate.d/prod/terraform.tfstate
```

## Workflow

```bash
# Deploy to dev
terraform workspace select dev
terraform apply -var-file=dev.tfvars

# Test in staging
terraform workspace select staging
terraform apply -var-file=staging.tfvars

# Deploy to prod
terraform workspace select prod
terraform apply -var-file=prod.tfvars

# Check all environments
for ws in dev staging prod; do
  terraform workspace select $ws
  terraform show -json | jq '.values.root_module.resources | length'
done
```

---

## Workspace vs Separate Backends

### Workspaces
- Pros: Single code base, quick switching
- Cons: Can accidentally apply to wrong workspace

### Separate Backends
- Pros: Complete isolation, fewer mistakes
- Cons: More code duplication

### Recommendation
Use workspaces + separate variables files for development
Use separate backends for production (higher safety)

---

## Summary

- **Workspaces** manage multiple environments
- **terraform.workspace** variable identifies current
- **Separate state** per workspace
- **Configuration** changes based on workspace
- **Risk**: Applying to wrong workspace
- **Mitigation**: Use separate backends for prod

Next: [CloudFormation Basics](./07_cloudformation_basics.md)
