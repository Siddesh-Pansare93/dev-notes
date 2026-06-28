# ECS & ECR: Container Services on AWS

> Deploy and manage Docker containers at scale using Amazon ECS and ECR (Elastic Container Registry).

## Table of Contents
1. [ECR Basics](#ecr-basics)
2. [ECS Fundamentals](#ecs-fundamentals)
3. [Task Definitions](#task-definitions)
4. [Services & Scaling](#services--scaling)
5. [ECS Networking](#ecs-networking)
6. [Monitoring & Troubleshooting](#monitoring--troubleshooting)

---

## ECR Basics

Amazon Elastic Container Registry - Docker image repository.

### Create Repository

```bash
# Create ECR repository
aws ecr create-repository \
  --repository-name myapp

# Output includes repository URI:
# 123456789012.dkr.ecr.us-east-1.amazonaws.com/myapp
```

### Push Image to ECR

```bash
# 1. Authenticate Docker with ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789012.dkr.ecr.us-east-1.amazonaws.com

# 2. Build Docker image
docker build -t myapp:latest .

# 3. Tag image for ECR
docker tag myapp:latest \
  123456789012.dkr.ecr.us-east-1.amazonaws.com/myapp:latest

# 4. Push to ECR
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/myapp:latest
```

### Automated Push via Script

```bash
#!/bin/bash
# push-to-ecr.sh

REGION=us-east-1
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGISTRY=$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com
REPO=myapp
TAG=${1:-latest}

# Login
aws ecr get-login-password --region $REGION | \
  docker login --username AWS --password-stdin $REGISTRY

# Build and tag
docker build -t $REPO:$TAG .
docker tag $REPO:$TAG $REGISTRY/$REPO:$TAG
docker tag $REPO:$TAG $REGISTRY/$REPO:latest

# Push
docker push $REGISTRY/$REPO:$TAG
docker push $REGISTRY/$REPO:latest

echo "Image pushed: $REGISTRY/$REPO:$TAG"
```

### ECR Lifecycle Policies

```bash
# Keep only last 10 images
aws ecr put-lifecycle-policy \
  --repository-name myapp \
  --lifecycle-policy-text file://policy.json
```

```json
{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Keep last 10 images",
      "selection": {
        "tagStatus": "any",
        "countType": "imageCountMoreThan",
        "countNumber": 10
      },
      "action": {
        "type": "expire"
      }
    }
  ]
}
```

---

## ECS Fundamentals

Amazon Elastic Container Service - Docker orchestration without Kubernetes.

### ECS Concepts

```
Cluster: Logical grouping of EC2 instances or Fargate
Task: Running container (like docker run)
Service: Manages and maintains tasks (replicas, auto-scaling)
Task Definition: Blueprint for tasks (like docker-compose)
Container Instance: EC2 instance in ECS cluster
```

### Create Cluster

```bash
# EC2 launch type cluster
aws ecs create-cluster --cluster-name production

# With CloudFormation for better control
aws cloudformation create-stack \
  --stack-name ecs-cluster \
  --template-body file://ecs-cluster.yaml
```

```yaml
# ecs-cluster.yaml
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  ECSCluster:
    Type: AWS::ECS::Cluster
    Properties:
      ClusterName: production
      ClusterSettings:
        - Name: containerInsights
          Value: enabled

  # Auto Scaling Group for container instances
  LaunchTemplate:
    Type: AWS::EC2::LaunchTemplate
    Properties:
      LaunchTemplateData:
        ImageId: ami-ecs-optimized  # ECS-optimized AMI
        InstanceType: t3.medium
        IamInstanceProfile: ecsInstanceProfile

  AutoScalingGroup:
    Type: AWS::AutoScaling::AutoScalingGroup
    Properties:
      VPCZoneIdentifier: [subnet-1, subnet-2]
      LaunchTemplate:
        LaunchTemplateId: !Ref LaunchTemplate
        Version: !GetAtt LaunchTemplate.LatestVersionNumber
      MinSize: 1
      MaxSize: 10
      DesiredCapacity: 3
```

---

## Task Definitions

Define how Docker containers run in ECS.

### Simple Task Definition

```bash
# Create task definition
aws ecs register-task-definition \
  --family myapp \
  --container-definitions file://container-def.json \
  --requires-compatibilities FARGATE \
  --network-mode awsvpc \
  --cpu 256 \
  --memory 512 \
  --execution-role-arn arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole
```

```json
[
  {
    "name": "myapp",
    "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/myapp:latest",
    "portMappings": [
      {
        "containerPort": 3000,
        "protocol": "tcp"
      }
    ],
    "environment": [
      {
        "name": "NODE_ENV",
        "value": "production"
      }
    ],
    "secrets": [
      {
        "name": "DATABASE_URL",
        "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:database-url"
      }
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/myapp",
        "awslogs-region": "us-east-1",
        "awslogs-stream-prefix": "ecs"
      }
    },
    "healthCheck": {
      "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
      "interval": 30,
      "timeout": 5,
      "retries": 3,
      "startPeriod": 60
    }
  }
]
```

### Task Definition Versions

```bash
# List all versions
aws ecs describe-task-definition \
  --task-definition myapp

# Get specific version
aws ecs describe-task-definition \
  --task-definition myapp:3

# Register new version
aws ecs register-task-definition \
  --family myapp \
  --container-definitions file://container-def-v2.json
```

---

## Services & Scaling

### Create Service

```bash
# Create service with task replication
aws ecs create-service \
  --cluster production \
  --service-name myapp \
  --task-definition myapp:1 \
  --desired-count 3 \
  --load-balancers targetGroupArn=arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:targetgroup/myapp/abc123,containerName=myapp,containerPort=3000
```

### Update Service

```bash
# Deploy new task definition
aws ecs update-service \
  --cluster production \
  --service myapp \
  --task-definition myapp:2 \
  --force-new-deployment
```

### Auto Scaling

```bash
# Register scalable target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/production/myapp \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 10

# Create scaling policy (scale up on high CPU)
aws application-autoscaling put-scaling-policy \
  --policy-name myapp-scale-up \
  --service-namespace ecs \
  --resource-id service/production/myapp \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration file://policy.json
```

```json
{
  "TargetValue": 75.0,
  "PredefinedMetricSpecification": {
    "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
  },
  "ScaleOutCooldown": 60,
  "ScaleInCooldown": 300
}
```

---

## ECS Networking

### Networking Modes

```
bridge: Traditional Docker bridging (EC2 launch type)
host: Container uses host network (EC2 launch type)
awsvpc: ENI per task (Fargate, modern EC2)
```

### Fargate vs EC2

```
Fargate:
✓ Serverless - no instance management
✓ Pay per task
✓ Simple for non-complex workloads
✗ Higher per-task cost
✗ Less customization

EC2:
✓ Lower per-task cost
✓ Full control over instances
✓ Support for GPUs, exotic workloads
✗ Manage cluster capacity
✗ More operational overhead
```

### Security Groups in ECS

```bash
# Create security group for ECS tasks
aws ec2 create-security-group \
  --group-name ecs-tasks \
  --description "Security group for ECS tasks" \
  --vpc-id vpc-12345678

# Allow tasks to talk to each other
aws ec2 authorize-security-group-ingress \
  --group-id sg-tasks \
  --protocol tcp --port 3000 \
  --source-group sg-tasks

# Allow ALB to talk to tasks
aws ec2 authorize-security-group-ingress \
  --group-id sg-tasks \
  --protocol tcp --port 3000 \
  --source-group sg-alb
```

---

## Monitoring & Troubleshooting

### CloudWatch Logs

```bash
# Create log group
aws logs create-log-group --log-group-name /ecs/myapp

# View logs
aws logs tail /ecs/myapp --follow

# Filter logs
aws logs filter-log-events \
  --log-group-name /ecs/myapp \
  --filter-pattern "ERROR"
```

### ECS Exec for Debugging

```bash
# Execute command in running task
aws ecs execute-command \
  --cluster production \
  --task abc123def456 \
  --container myapp \
  --interactive \
  --command "/bin/bash"

# Check logs in real-time
aws ecs execute-command \
  --cluster production \
  --task abc123def456 \
  --container myapp \
  --command "tail -f /var/log/app.log"
```

### Task Stopping & Replacement

```bash
# Stop task (will be replaced by service)
aws ecs stop-task \
  --cluster production \
  --task abc123def456 \
  --reason "Manual restart for debugging"

# Service automatically starts new task
```

### Common Issues

```bash
# Check task status
aws ecs describe-tasks \
  --cluster production \
  --tasks abc123def456 \
  --query 'tasks[0].{LastStatus,DesiredStatus,StoppedReason}'

# View task logs
aws logs get-log-events \
  --log-group-name /ecs/myapp \
  --log-stream-name ecs/myapp/abc123def456
```

---

## Practical Example: Deploy App to ECS

```bash
#!/bin/bash
# deploy-to-ecs.sh

set -e

CLUSTER=production
SERVICE=myapp
REPO=myapp
REGION=us-east-1

# 1. Build and push image
./push-to-ecr.sh latest

# 2. Get new image URI
IMAGE=$(aws ecr describe-images \
  --repository-name $REPO \
  --query 'imageDetails[0].imageUri' \
  --output text)

echo "Deploying $IMAGE"

# 3. Register new task definition with new image
NEW_TASK=$(aws ecs register-task-definition \
  --family $SERVICE \
  --container-definitions "[{\"name\":\"$SERVICE\",\"image\":\"$IMAGE\",\"portMappings\":[{\"containerPort\":3000}],\"logConfiguration\":{\"logDriver\":\"awslogs\",\"options\":{\"awslogs-group\":\"/ecs/$SERVICE\",\"awslogs-region\":\"$REGION\",\"awslogs-stream-prefix\":\"ecs\"}}}]" \
  --requires-compatibilities FARGATE \
  --network-mode awsvpc \
  --cpu 256 \
  --memory 512 \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)

echo "Registered task definition: $NEW_TASK"

# 4. Update service to use new task definition
aws ecs update-service \
  --cluster $CLUSTER \
  --service $SERVICE \
  --task-definition $NEW_TASK \
  --force-new-deployment

# 5. Wait for deployment
echo "Waiting for deployment..."
aws ecs wait services-stable \
  --cluster $CLUSTER \
  --services $SERVICE

echo "✓ Deployment complete!"
```

---

## Summary

- **ECR** is AWS's Docker registry
- **ECS** orchestrates Docker containers on EC2 or Fargate
- **Task definitions** describe container configuration
- **Services** manage task replicas and auto-scaling
- **Fargate** is serverless, **EC2** is lower cost
- **CloudWatch** provides logs and monitoring
- **ECS Exec** enables debugging in running containers

Next: [Load Balancers](./04_load_balancers.md) - distribute traffic across instances
