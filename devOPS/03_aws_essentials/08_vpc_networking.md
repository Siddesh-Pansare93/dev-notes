# VPC Networking

> Design secure, scalable networks with VPCs, subnets, route tables, and NAT gateways.

## VPC Architecture

```mermaid
flowchart TB
    Internet["🌐 Internet"]
    IGW["🔀 Internet Gateway (IGW)"]

    subgraph VPC["AWS VPC · 10.0.0.0/16"]
        subgraph PubSub["🟢 Public Subnets\n10.0.0.0/24 · 10.0.1.0/24\n(ALB, Bastion, NAT GW)"]
            NAT["🔀 NAT Gateway\n(Elastic IP)"]
            ALB["⚖️ App Load Balancer"]
        end

        subgraph PrivSub["🟡 Private Subnets\n10.0.2.0/24 · 10.0.3.0/24\n(EC2 App Servers, ECS Tasks)"]
            EC2["💻 EC2 / ECS\nApp servers"]
        end

        subgraph DBSub["🔴 Database Subnets\n10.0.4.0/24 · 10.0.5.0/24\n(No internet route)"]
            RDS["🗄️ RDS\nPrivate · no internet"]
        end
    end

    Internet <--> IGW <--> ALB
    IGW <--> NAT
    NAT -->|"outbound only\n(updates, external APIs)"| Internet
    ALB --> EC2
    EC2 <--> RDS
    EC2 -->|"outbound via NAT"| NAT

    style PubSub fill:#14532d,color:#fff
    style PrivSub fill:#713f12,color:#fff
    style DBSub fill:#7f1d1d,color:#fff
    style IGW fill:#2563eb,color:#fff
    style NAT fill:#7c3aed,color:#fff
```

### Create VPC

```bash
# Create VPC
aws ec2 create-vpc --cidr-block 10.0.0.0/16

# Create subnets
aws ec2 create-subnet \
  --vpc-id vpc-123 \
  --cidr-block 10.0.1.0/24 \
  --availability-zone us-east-1a

# Create public and private subnets
# Public: attach IGW + route to 0.0.0.0/0 → IGW
# Private: route to 0.0.0.0/0 → NAT Gateway
# Database: no route to internet
```

### NAT Gateway

```bash
# NAT Gateway allows private instances to access internet
# (for updates, external APIs)

# 1. Allocate Elastic IP
aws ec2 allocate-address --domain vpc

# 2. Create NAT Gateway in public subnet
aws ec2 create-nat-gateway \
  --subnet-id subnet-public \
  --allocation-id eipalloc-123

# 3. Create route in private subnet
aws ec2 create-route \
  --route-table-id rtb-private \
  --destination-cidr-block 0.0.0.0/0 \
  --nat-gateway-id nat-123
```

### Security Groups & NACLs

```bash
# Security Group (stateful firewall)
# Only allow what you need

# NACL (stateless firewall - subnet level)
# Default: allow all in/out
# Custom: explicitly allow/deny
```

---

## Practical VPC Setup

```bash
#!/bin/bash
# setup-vpc.sh

# Create VPC
VPC=$(aws ec2 create-vpc --cidr-block 10.0.0.0/16 \
  --query 'Vpc.VpcId' --output text)

# Create IGW
IGW=$(aws ec2 create-internet-gateway \
  --query 'InternetGateway.InternetGatewayId' --output text)
aws ec2 attach-internet-gateway --vpc-id $VPC --internet-gateway-id $IGW

# Create public subnet
PUBLIC=$(aws ec2 create-subnet --vpc-id $VPC --cidr-block 10.0.1.0/24 \
  --query 'Subnet.SubnetId' --output text)

# Create private subnet
PRIVATE=$(aws ec2 create-subnet --vpc-id $VPC --cidr-block 10.0.2.0/24 \
  --query 'Subnet.SubnetId' --output text)

# Create route tables
PUB_RTB=$(aws ec2 create-route-table --vpc-id $VPC \
  --query 'RouteTable.RouteTableId' --output text)
aws ec2 create-route --route-table-id $PUB_RTB \
  --destination-cidr-block 0.0.0.0/0 --gateway-id $IGW

PRIV_RTB=$(aws ec2 create-route-table --vpc-id $VPC \
  --query 'RouteTable.RouteTableId' --output text)

# Associate subnets
aws ec2 associate-route-table --subnet-id $PUBLIC --route-table-id $PUB_RTB
aws ec2 associate-route-table --subnet-id $PRIVATE --route-table-id $PRIV_RTB

echo "VPC: $VPC"
echo "Public Subnet: $PUBLIC"
echo "Private Subnet: $PRIVATE"
```

---

## Summary

- **VPC** isolates infrastructure
- **Public subnets** have internet access via IGW
- **Private subnets** use NAT for outbound internet
- **Security groups** control instance-level traffic
- **NACLs** control subnet-level traffic
- **Route tables** direct traffic

Next: [AWS Complete](../04_orchestration/) - Container Orchestration
