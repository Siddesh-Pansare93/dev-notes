# AWS Overview & Fundamentals

> Understand AWS regions, availability zones, IAM, and core concepts needed for DevOps.

## Table of Contents
1. [AWS Global Infrastructure](#aws-global-infrastructure)
2. [IAM: Identity & Access Management](#iam-identity--access-management)
3. [AWS CLI Setup](#aws-cli-setup)
4. [VPC & Networking Basics](#vpc--networking-basics)
5. [Billing & Cost Management](#billing--cost-management)
6. [AWS Best Practices](#aws-best-practices)

---

## AWS Global Infrastructure

### Regions

AWS has 30+ regions worldwide, each completely independent.

```
Regions (Independent AWS Deployments)
├── us-east-1 (N. Virginia) - Oldest, most services
├── us-west-2 (Oregon)
├── eu-west-1 (Ireland)
├── ap-southeast-1 (Singapore)
└── ...and 25+ more
```

### Availability Zones (AZs)

Each region has multiple AZs for high availability.

```
Region: us-east-1
├── AZ: us-east-1a
├── AZ: us-east-1b
├── AZ: us-east-1c
└── AZ: us-east-1d

Each AZ is:
- Physically separate data center
- Low-latency connectivity (< 1ms)
- Isolated from failures in other AZs
```

### Choosing Regions

```
Factors:
1. Latency - Choose closest to users
2. Compliance - Data residency requirements
3. Service availability - Not all services in all regions
4. Cost - Varies by region
```

```bash
# List all regions
aws ec2 describe-regions --query 'Regions[].RegionName'

# List AZs in region
aws ec2 describe-availability-zones \
  --region us-west-2 \
  --query 'AvailabilityZones[].ZoneName'
```

---

## IAM: Identity & Access Management

Control who can do what in AWS.

### IAM Concepts

```
Users: Individual people
Groups: Collections of users
Roles: Assumed by services/users
Policies: Define permissions
```

### IAM Users

```bash
# Create user
aws iam create-user --user-name john-dev

# Create login credentials
aws iam create-login-profile \
  --user-name john-dev \
  --password "TempPassword123!" \
  --password-reset-required

# Create programmatic credentials
aws iam create-access-key --user-name john-dev
# Returns: AccessKeyId, SecretAccessKey
```

### IAM Policies

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances",
        "ec2:DescribeSecurityGroups"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::my-bucket/*"
    }
  ]
}
```

### IAM Roles

Use roles instead of access keys for services.

```bash
# Create role for EC2 instance
aws iam create-role \
  --role-name EC2-AppRole \
  --assume-role-policy-document file://trust-policy.json
```

```json
// trust-policy.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

### Root Account Security

```bash
# ❌ Never use root account credentials
# ❌ Never share root password
# ❌ Don't create root access keys

# ✅ Good practices:
# 1. Enable MFA on root account
aws iam enable-mfa-device \
  --user-name root \
  --serial-number arn:aws:iam::ACCOUNT:mfa/root-mfa \
  --authentication-code1 123456 \
  --authentication-code2 654321

# 2. Create admin user with MFA
# 3. Use admin user for daily work
# 4. Lock root account in safe
```

---

## AWS CLI Setup

### Installation

```bash
# macOS
brew install awscli

# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Windows
msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi

# Verify
aws --version
```

### Configuration

```bash
# Interactive setup
aws configure

# Prompts for:
# - AWS Access Key ID
# - AWS Secret Access Key
# - Default region (us-east-1)
# - Default output format (json)
```

```
# Saved in ~/.aws/credentials
[default]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# Saved in ~/.aws/config
[default]
region = us-west-2
output = json
```

### Multiple Profiles

```bash
# Create named profile
aws configure --profile production

# Use profile
aws ec2 describe-instances --profile production

# Set default profile
export AWS_PROFILE=production
aws ec2 describe-instances  # Uses production profile
```

### Environment Variables

```bash
# Override credentials
export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
export AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
export AWS_DEFAULT_REGION=us-west-2
export AWS_DEFAULT_OUTPUT=json

aws ec2 describe-instances
```

---

## VPC & Networking Basics

### VPC (Virtual Private Cloud)

Your private network in AWS.

```
VPC: 10.0.0.0/16
├── Public Subnet: 10.0.1.0/24 (IGW attached)
│   └── NAT Gateway
├── Private Subnet: 10.0.2.0/24 (no IGW)
│   └── Instances access internet via NAT
└── Private Subnet: 10.0.3.0/24
    └── Database tier
```

### Creating VPC

```bash
# Create VPC
aws ec2 create-vpc --cidr-block 10.0.0.0/16

# Create subnets
aws ec2 create-subnet \
  --vpc-id vpc-12345 \
  --cidr-block 10.0.1.0/24 \
  --availability-zone us-east-1a

# Attach Internet Gateway
aws ec2 create-internet-gateway
aws ec2 attach-internet-gateway \
  --vpc-id vpc-12345 \
  --internet-gateway-id igw-12345
```

### Default VPC

```bash
# Every account has default VPC
aws ec2 describe-vpcs --filters "Name=isDefault,Values=true"

# Default VPC has:
# - Internet Gateway attached
# - Public subnets in each AZ
# - Route to 0.0.0.0/0 → IGW
```

---

## Billing & Cost Management

### Pricing Models

| Model | Use Case | Savings |
|-------|----------|---------|
| **On-Demand** | Flexible, variable load | Baseline |
| **Reserved Instances** | Predictable, constant load | Up to 72% |
| **Spot Instances** | Fault-tolerant workloads | Up to 90% |
| **Savings Plans** | Mix of services | Up to 72% |

### Reserved Instances

```bash
# Purchase 1-year reserved instance
aws ec2 purchase-reserved-instances-offering \
  --instance-count 1 \
  --reserved-instances-offering-id \
    bbbb0f7d-5e90-4f11-b9d8-025914846b54
```

### Cost Management

```bash
# Set budget alert
aws budgets create-budget \
  --account-id 123456789012 \
  --budget BudgetName=Monthly-Limit,BudgetLimit='{Amount=1000,Unit=USD}'

# Estimate costs
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics "UnblendedCost"
```

### Cost Optimization

```
1. Right-size instances - Don't over-provision
2. Use Reserved Instances - For baseline load
3. Schedule instances - Stop dev/test at night
4. Delete unused resources - EBS volumes, Elastic IPs
5. Use spot instances - For batch jobs
6. Enable autoscaling - Scale down when not needed
```

---

## AWS Best Practices

### 1. Least Privilege Access

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "ec2:StopInstances",
      "Resource": "arn:aws:ec2:*:*:instance/prod-*"
    },
    {
      "Effect": "Deny",
      "Action": "ec2:TerminateInstances",
      "Resource": "*"
    }
  ]
}
```

### 2. Enable CloudTrail

```bash
# Log all API calls for audit
aws cloudtrail create-trail \
  --name my-trail \
  --s3-bucket-name my-bucket
```

### 3. Use Tagging

```bash
# Tag all resources for cost tracking
aws ec2 create-tags \
  --resources i-1234567890abcdef0 \
  --tags Key=Environment,Value=production \
         Key=Cost-Center,Value=engineering
```

### 4. Enable MFA

```bash
# Require MFA for sensitive operations
aws iam put-user-policy \
  --user-name john \
  --policy-name MFARequired \
  --policy-document file://mfa-policy.json
```

### 5. Monitor with CloudWatch

```bash
# Create alarm for high CPU
aws cloudwatch put-metric-alarm \
  --alarm-name high-cpu \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold
```

---

## Key AWS Services

| Service | Purpose |
|---------|---------|
| **EC2** | Virtual machines |
| **ECS** | Container orchestration |
| **RDS** | Managed databases |
| **S3** | Object storage |
| **Lambda** | Serverless functions |
| **CloudFront** | CDN |
| **ALB/NLB** | Load balancing |
| **VPC** | Networking |
| **IAM** | Access control |
| **CloudWatch** | Monitoring |

---

## Practical Example: Initial AWS Setup

```bash
#!/bin/bash
# setup-aws-account.sh

# 1. Configure CLI
aws configure --profile prod

# 2. Create VPC
VPC_ID=$(aws ec2 create-vpc --cidr-block 10.0.0.0/16 \
  --query 'Vpc.VpcId' --output text)

# 3. Create subnets
SUBNET=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.1.0/24 \
  --query 'Subnet.SubnetId' --output text)

# 4. Create Internet Gateway
IGW=$(aws ec2 create-internet-gateway \
  --query 'InternetGateway.InternetGatewayId' --output text)

aws ec2 attach-internet-gateway --vpc-id $VPC_ID --internet-gateway-id $IGW

# 5. Create security group
SG=$(aws ec2 create-security-group \
  --group-name web \
  --description "Web server security group" \
  --vpc-id $VPC_ID \
  --query 'GroupId' --output text)

# Allow HTTP/HTTPS
aws ec2 authorize-security-group-ingress \
  --group-id $SG \
  --protocol tcp --port 80 --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id $SG \
  --protocol tcp --port 443 --cidr 0.0.0.0/0

# 6. Create IAM role for EC2
aws iam create-role --role-name EC2-App \
  --assume-role-policy-document file://trust.json

echo "AWS account setup complete!"
echo "VPC: $VPC_ID"
echo "Subnet: $SUBNET"
echo "Security Group: $SG"
```

---

## Summary

- **Regions** are independent AWS deployments; choose based on latency
- **Availability Zones** provide redundancy within a region
- **IAM** controls access; always use least privilege
- **AWS CLI** is the primary tool for automation
- **VPC** is your private network; design subnets carefully
- **Cost** varies by region and pricing model
- **Best practices** start with security, monitoring, and tagging

Next: [EC2 Essentials](./02_ec2_essentials.md) - virtual machines on AWS
