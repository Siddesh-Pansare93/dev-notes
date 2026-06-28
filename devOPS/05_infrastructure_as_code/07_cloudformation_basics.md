# AWS CloudFormation Basics

> AWS-native Infrastructure as Code using CloudFormation templates.

## CloudFormation vs Terraform

| Feature | CloudFormation | Terraform |
|---------|---|---|
| Cloud | AWS only | Multi-cloud |
| Language | JSON/YAML | HCL |
| State | Implicit | Explicit |
| Learning | AWS-specific | General |

## Template Structure

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'Production infrastructure template'

Parameters:
  EnvironmentName:
    Type: String
    Default: production
  InstanceType:
    Type: String
    Default: t3.medium

Resources:
  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16

  Subnet:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: 10.0.1.0/24
      AvailabilityZone: us-east-1a

  Instance:
    Type: AWS::EC2::Instance
    Properties:
      ImageId: ami-0c55b159cbfafe1f0
      InstanceType: !Ref InstanceType
      SubnetId: !Ref Subnet

Outputs:
  VPCId:
    Value: !Ref VPC
  InstanceId:
    Value: !Ref Instance
  InstanceIP:
    Value: !GetAtt Instance.PublicIp
```

## Creating Stacks

```bash
# Create stack
aws cloudformation create-stack \
  --stack-name prod-stack \
  --template-body file://template.yaml \
  --parameters ParameterKey=EnvironmentName,ParameterValue=production

# Monitor creation
aws cloudformation describe-stacks \
  --stack-name prod-stack

# Update stack
aws cloudformation update-stack \
  --stack-name prod-stack \
  --template-body file://template.yaml

# Delete stack
aws cloudformation delete-stack \
  --stack-name prod-stack
```

## Intrinsic Functions

```yaml
Resources:
  Database:
    Type: AWS::RDS::DBInstance
    Properties:
      # Reference parameter
      DBInstanceIdentifier: !Ref EnvironmentName
      # Get attribute from resource
      DBSubnetGroupName: !GetAtt SubnetGroup.DBSubnetGroupName
      # Conditional
      AllocatedStorage: !If [IsProduction, 100, 20]
      # Join strings
      EnvironmentTag: !Join ['-', [!Ref EnvironmentName, 'db']]
      # Select from list
      AvailabilityZone: !Select [0, !GetAZs '']

Conditions:
  IsProduction: !Equals [!Ref EnvironmentName, 'production']
```

## Stacks & Change Sets

```bash
# Preview changes
aws cloudformation create-change-set \
  --stack-name prod-stack \
  --change-set-name update-1 \
  --template-body file://template.yaml

# Review changes
aws cloudformation describe-change-set \
  --change-set-name update-1 \
  --stack-name prod-stack

# Execute change set
aws cloudformation execute-change-set \
  --change-set-name update-1 \
  --stack-name prod-stack
```

---

## Summary

- **CloudFormation** is AWS-native IaC
- **Templates** define infrastructure
- **Stacks** are deployed infrastructure
- **Parameters** customize templates
- **Change sets** preview updates safely
- **Good for AWS-only** environments

Next: [Monitoring & Observability](../06_monitoring/01_observability_concepts.md)
