# Terraform State Management

> Manage Terraform state safely for team collaboration and disaster recovery.

## Local vs Remote State

```bash
# Local state (development only)
terraform apply
# Creates: terraform.tfstate, terraform.tfstate.backup

# Problem: Can't share between team members
# Solution: Use remote backend
```

## Remote State with S3

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket         = "company-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
```

```bash
# Initialize with remote backend
terraform init

# State now stored in S3
# Lock table prevents concurrent modifications
```

## State Locking

```hcl
# DynamoDB table for state locking
resource "aws_dynamodb_table" "terraform_locks" {
  name           = "terraform-locks"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }
}
```

## State Inspection

```bash
# View current state
terraform show

# List resources in state
terraform state list

# Show specific resource
terraform state show aws_instance.web

# Manual state edit (dangerous!)
terraform state mv aws_instance.old aws_instance.new

# Remove from state (don't destroy)
terraform state rm aws_security_group.unused
```

## Disaster Recovery

```bash
# Backup state
aws s3 cp s3://terraform-state/prod/terraform.tfstate \
  terraform.tfstate.backup

# Restore from backup
aws s3 cp terraform.tfstate.backup \
  s3://terraform-state/prod/terraform.tfstate

# List state versions (versioning enabled)
aws s3api list-object-versions \
  --bucket terraform-state \
  --prefix prod/
```

## Best Practices

1. **Always use remote state** for production
2. **Enable encryption** in transit and at rest
3. **Use locking** to prevent conflicts
4. **Backup regularly** - S3 versioning helps
5. **Never share state files** in git
6. **Separate environments** - different state files
7. **Access control** - IAM permissions

---

## Summary

- **State** tracks current infrastructure
- **Remote state** enables team collaboration
- **S3 + DynamoDB** provide secure state backend
- **Locking** prevents concurrent modifications
- **Versioning** enables disaster recovery
- **Encryption** protects sensitive data

Next: [Terraform Workspaces](./06_terraform_workspaces.md)
