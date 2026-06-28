# AWS Auto Scaling

## What You'll Learn

- What Auto Scaling is and why it's essential
- Auto Scaling Groups (ASG) fundamentals
- Launch Templates
- Scaling policies (target tracking, step, scheduled)
- Integration with Load Balancers
- Best practices for cost optimization and high availability

---

## What is Auto Scaling?

**Auto Scaling** automatically adjusts the number of EC2 instances in your application based on demand.

### Benefits

✅ **Cost Optimization** - Scale down during low traffic, save money  
✅ **High Availability** - Replace unhealthy instances automatically  
✅ **Better Performance** - Scale up during traffic spikes  
✅ **No Manual Intervention** - Fully automated based on metrics

---

## Core Components

### 1. **Launch Template**
Blueprint for launching EC2 instances (AMI, instance type, security groups, user data).

### 2. **Auto Scaling Group (ASG)**
Collection of EC2 instances managed as a logical unit.

### 3. **Scaling Policies**
Rules that determine when and how to scale (metrics-based or scheduled).

### 4. **Health Checks**
Monitor instance health (EC2 status, ELB health checks).

---

## Launch Templates

### Create Launch Template (AWS CLI)

```bash
aws ec2 create-launch-template \
  --launch-template-name my-app-template \
  --version-description "Version 1" \
  --launch-template-data '{
    "ImageId": "ami-0c55b159cbfafe1f0",
    "InstanceType": "t3.micro",
    "KeyName": "my-key-pair",
    "SecurityGroupIds": ["sg-0123456789abcdef"],
    "UserData": "IyEvYmluL2Jhc2gKZWNobyAiSGVsbG8gV29ybGQi",
    "TagSpecifications": [{
      "ResourceType": "instance",
      "Tags": [{"Key": "Name", "Value": "MyApp"}]
    }]
  }'
```

### User Data Script (Base64 encoded)

```bash
#!/bin/bash
# Install Node.js and start app
yum update -y
curl -sL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs git

cd /home/ec2-user
git clone https://github.com/myuser/myapp.git
cd myapp
npm install
npm start
```

**Encode to Base64**:
```bash
cat user-data.sh | base64
```

---

## Auto Scaling Groups (ASG)

### Create Auto Scaling Group

```bash
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name my-app-asg \
  --launch-template LaunchTemplateName=my-app-template,Version='$Latest' \
  --min-size 2 \
  --max-size 10 \
  --desired-capacity 3 \
  --availability-zones us-east-1a us-east-1b us-east-1c \
  --target-group-arns arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/my-targets/abc123 \
  --health-check-type ELB \
  --health-check-grace-period 300 \
  --tags Key=Environment,Value=Production
```

### Key Parameters

| Parameter | Description |
|-----------|-------------|
| `min-size` | Minimum number of instances (e.g., 2) |
| `max-size` | Maximum number of instances (e.g., 10) |
| `desired-capacity` | Target number of instances (e.g., 3) |
| `health-check-grace-period` | Time before health checks start (seconds) |
| `health-check-type` | EC2 or ELB |

---

## Scaling Policies

### 1. Target Tracking Scaling

**Most Common**: Maintains a target metric value (e.g., CPU at 70%).

```bash
aws autoscaling put-scaling-policy \
  --auto-scaling-group-name my-app-asg \
  --policy-name target-tracking-cpu \
  --policy-type TargetTrackingScaling \
  --target-tracking-configuration '{
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ASGAverageCPUUtilization"
    },
    "TargetValue": 70.0
  }'
```

**How it works**:
- If CPU > 70% → scale out (add instances)
- If CPU < 70% → scale in (remove instances)

#### Predefined Metrics
- `ASGAverageCPUUtilization` - Average CPU across all instances
- `ASGAverageNetworkIn` - Average network input
- `ASGAverageNetworkOut` - Average network output
- `ALBRequestCountPerTarget` - Requests per target (ALB)

#### Custom Metric Example

```bash
aws autoscaling put-scaling-policy \
  --auto-scaling-group-name my-app-asg \
  --policy-name target-tracking-custom \
  --policy-type TargetTrackingScaling \
  --target-tracking-configuration '{
    "CustomizedMetricSpecification": {
      "MetricName": "ActiveConnections",
      "Namespace": "MyApp",
      "Statistic": "Average"
    },
    "TargetValue": 1000.0
  }'
```

### 2. Step Scaling

Scale in increments based on CloudWatch alarms.

```bash
# Create CloudWatch alarm
aws cloudwatch put-metric-alarm \
  --alarm-name high-cpu-alarm \
  --alarm-description "Trigger when CPU > 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:autoscaling:us-east-1:123456789012:scalingPolicy:abc123:autoScalingGroupName/my-app-asg:policyName/scale-up

# Create step scaling policy
aws autoscaling put-scaling-policy \
  --auto-scaling-group-name my-app-asg \
  --policy-name scale-up \
  --policy-type StepScaling \
  --adjustment-type PercentChangeInCapacity \
  --metric-aggregation-type Average \
  --step-adjustments '[
    {"MetricIntervalLowerBound": 0, "MetricIntervalUpperBound": 10, "ScalingAdjustment": 10},
    {"MetricIntervalLowerBound": 10, "ScalingAdjustment": 20}
  ]'
```

**Example**: 
- CPU 80-90% → add 10% more instances
- CPU > 90% → add 20% more instances

### 3. Scheduled Scaling

Scale based on time (predictable traffic patterns).

```bash
# Scale up on weekdays at 8 AM
aws autoscaling put-scheduled-action \
  --auto-scaling-group-name my-app-asg \
  --scheduled-action-name scale-up-morning \
  --recurrence "0 8 * * 1-5" \
  --min-size 5 \
  --max-size 20 \
  --desired-capacity 10

# Scale down on weekdays at 6 PM
aws autoscaling put-scheduled-action \
  --auto-scaling-group-name my-app-asg \
  --scheduled-action-name scale-down-evening \
  --recurrence "0 18 * * 1-5" \
  --min-size 2 \
  --max-size 10 \
  --desired-capacity 3
```

---

## Integration with Load Balancers

### Attach ASG to ALB Target Group

```bash
# Create target group
aws elbv2 create-target-group \
  --name my-app-targets \
  --protocol HTTP \
  --port 3000 \
  --vpc-id vpc-12345678 \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3

# Attach ASG to target group
aws autoscaling attach-load-balancer-target-groups \
  --auto-scaling-group-name my-app-asg \
  --target-group-arns arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/my-app-targets/abc123
```

### How it Works

1. ASG launches new instances
2. Instances automatically register with target group
3. ALB performs health checks
4. If healthy, ALB routes traffic to instance
5. If unhealthy, ASG replaces instance

---

## Health Checks

### EC2 Health Check (Default)
Checks if instance is running (AWS hypervisor level).

### ELB Health Check (Recommended)
Checks if application is responding correctly.

```bash
aws autoscaling update-auto-scaling-group \
  --auto-scaling-group-name my-app-asg \
  --health-check-type ELB \
  --health-check-grace-period 300
```

**Grace Period**: Time before health checks start (allows app to start up).

---

## Real-World Example: Node.js API with Auto Scaling

### Architecture
```
Internet → ALB → ASG (2-10 instances) → RDS Database
```

### Step-by-Step Setup

#### 1. Create Launch Template

```bash
cat > user-data.sh << 'EOF'
#!/bin/bash
yum update -y
curl -sL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

# Clone and start app
cd /home/ec2-user
aws s3 cp s3://my-bucket/my-app.zip .
unzip my-app.zip
cd my-app
npm install --production
npm start
EOF

aws ec2 create-launch-template \
  --launch-template-name nodejs-api-template \
  --launch-template-data file://launch-template.json
```

#### 2. Create Auto Scaling Group

```bash
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name nodejs-api-asg \
  --launch-template LaunchTemplateName=nodejs-api-template \
  --min-size 2 \
  --max-size 10 \
  --desired-capacity 3 \
  --vpc-zone-identifier "subnet-abc123,subnet-def456,subnet-ghi789" \
  --target-group-arns arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/nodejs-api-targets/abc123 \
  --health-check-type ELB \
  --health-check-grace-period 300 \
  --tags Key=Name,Value=NodeJS-API Key=Environment,Value=Production
```

#### 3. Add Target Tracking Policy

```bash
aws autoscaling put-scaling-policy \
  --auto-scaling-group-name nodejs-api-asg \
  --policy-name cpu-target-tracking \
  --policy-type TargetTrackingScaling \
  --target-tracking-configuration '{
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ASGAverageCPUUtilization"
    },
    "TargetValue": 70.0
  }'
```

---

## Monitoring Auto Scaling

### View ASG Activity

```bash
# List scaling activities
aws autoscaling describe-scaling-activities \
  --auto-scaling-group-name my-app-asg \
  --max-records 10

# View current instances
aws autoscaling describe-auto-scaling-groups \
  --auto-scaling-group-names my-app-asg \
  --query 'AutoScalingGroups[0].Instances[*].[InstanceId,HealthStatus,LifecycleState]' \
  --output table
```

### CloudWatch Metrics

Key metrics to monitor:
- `GroupDesiredCapacity` - Target number of instances
- `GroupInServiceInstances` - Healthy instances
- `GroupMinSize` / `GroupMaxSize` - Limits
- `GroupTotalInstances` - All instances (healthy + unhealthy)

---

## Cost Optimization Tips

### 1. Use Spot Instances
```bash
# Mix on-demand and spot instances
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name my-app-asg \
  --mixed-instances-policy '{
    "LaunchTemplate": {
      "LaunchTemplateSpecification": {
        "LaunchTemplateName": "my-app-template",
        "Version": "$Latest"
      },
      "Overrides": [
        {"InstanceType": "t3.micro"},
        {"InstanceType": "t3.small"}
      ]
    },
    "InstancesDistribution": {
      "OnDemandBaseCapacity": 2,
      "OnDemandPercentageAboveBaseCapacity": 30,
      "SpotAllocationStrategy": "lowest-price"
    }
  }'
```

### 2. Rightsizing
Monitor actual usage and adjust instance types.

### 3. Scale-In Protection
Protect critical instances from termination during scale-in.

---

## Best Practices

✅ **Use ELB health checks** for application-level monitoring  
✅ **Set appropriate grace periods** (time for app to start)  
✅ **Span multiple AZs** for high availability  
✅ **Use target tracking** (easiest, most reliable)  
✅ **Monitor CloudWatch metrics** to tune policies  
✅ **Test scaling policies** before production  
✅ **Use termination policies** wisely (oldest instance, closest to billing hour)  
✅ **Implement connection draining** (300 seconds)

---

## Exercise

**Deploy Auto-Scaled Web Application**:

1. Create a Launch Template with your app
2. Create an ALB and target group
3. Create an ASG (min 2, max 6, desired 3)
4. Add CPU-based target tracking (70%)
5. Stress test with `ab` or `hey` to trigger scaling
6. Monitor scaling activity in CloudWatch

---

**Next**: [RDS & Databases](./06_rds_and_databases.md) → Managed relational databases
