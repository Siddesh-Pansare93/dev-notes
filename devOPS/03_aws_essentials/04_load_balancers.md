# Load Balancers in AWS

> Distribute traffic across instances using Application Load Balancer (ALB) and Network Load Balancer (NLB).

## Table of Contents
1. [Load Balancer Types](#load-balancer-types)
2. [Application Load Balancer (ALB)](#application-load-balancer-alb)
3. [Network Load Balancer (NLB)](#network-load-balancer-nlb)
4. [Target Groups](#target-groups)
5. [Health Checks](#health-checks)
6. [SSL/TLS Certificates](#ssltls-certificates)
7. [Routing Rules](#routing-rules)

---

## Load Balancer Types

### ALB vs NLB vs Classic

| Feature | ALB | NLB | Classic |
|---------|-----|-----|---------|
| **Performance** | Good | Ultra-high | Standard |
| **Throughput** | ~400k req/s | ~45M packets/s | Lower |
| **Use Case** | Web apps, microservices | Gaming, IoT, extreme throughput | Legacy |
| **Layer** | Layer 7 (App) | Layer 4 (Transport) | Both |
| **Path-based routing** | ✓ | ✗ | ✗ |
| **Host-based routing** | ✓ | ✗ | ✗ |

---

## Application Load Balancer (ALB)

Perfect for web applications and microservices.

### Create ALB

```bash
# Create load balancer
aws elbv2 create-load-balancer \
  --name my-alb \
  --subnets subnet-1a subnet-1b \
  --security-groups sg-web \
  --type application \
  --scheme internet-facing

# Output: LoadBalancerArn, DNSName
# DNS: my-alb-123456.us-east-1.elb.amazonaws.com
```

### Create Target Group

```bash
# Create target group for EC2 instances
aws elbv2 create-target-group \
  --name my-targets \
  --protocol HTTP \
  --port 80 \
  --vpc-id vpc-12345678 \
  --health-check-protocol HTTP \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3
```

### Register Targets

```bash
# Register EC2 instances
aws elbv2 register-targets \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:targetgroup/my-targets/abc123 \
  --targets Id=i-instance1 Id=i-instance2 Id=i-instance3
```

### Create Listener

```bash
# Create listener (port 80 → target group)
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:loadbalancer/app/my-alb/abc123 \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:targetgroup/my-targets/abc123
```

### CloudFormation Template

```yaml
ALB:
  Type: AWS::ElasticLoadBalancingV2::LoadBalancer
  Properties:
    Name: my-alb
    Subnets:
      - subnet-1a
      - subnet-1b
    SecurityGroups:
      - sg-web

TargetGroup:
  Type: AWS::ElasticLoadBalancingV2::TargetGroup
  Properties:
    Name: my-targets
    Port: 80
    Protocol: HTTP
    VpcId: vpc-12345678
    HealthCheckPath: /health
    HealthCheckProtocol: HTTP
    HealthCheckIntervalSeconds: 30
    HealthCheckTimeoutSeconds: 5
    HealthyThresholdCount: 2
    UnhealthyThresholdCount: 3

Listener:
  Type: AWS::ElasticLoadBalancingV2::Listener
  Properties:
    DefaultActions:
      - Type: forward
        TargetGroupArn: !Ref TargetGroup
    LoadBalancerArn: !Ref ALB
    Port: 80
    Protocol: HTTP
```

---

## Network Load Balancer (NLB)

For extreme performance and low latency.

### Create NLB

```bash
# Create NLB (layer 4)
aws elbv2 create-load-balancer \
  --name my-nlb \
  --subnets subnet-1a subnet-1b \
  --type network \
  --scheme internet-facing
```

### UDP/TCP Support

```bash
# Target group for TCP
aws elbv2 create-target-group \
  --name tcp-targets \
  --protocol TCP \
  --port 3000 \
  --vpc-id vpc-12345678

# Target group for UDP (gaming, real-time)
aws elbv2 create-target-group \
  --name udp-targets \
  --protocol UDP \
  --port 5353 \
  --vpc-id vpc-12345678

# TLS/SSL termination
aws elbv2 create-target-group \
  --name tls-targets \
  --protocol TLS \
  --port 443 \
  --vpc-id vpc-12345678
```

---

## Target Groups

### Auto Scaling with ALB

```bash
# Register Auto Scaling Group with target group
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name my-asg \
  --launch-template LaunchTemplateName=my-template \
  --min-size 1 --max-size 10 --desired-capacity 3 \
  --vpc-zone-identifier "subnet-1a,subnet-1b" \
  --target-group-arns arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:targetgroup/my-targets/abc123
```

### Deregistration Delay

```bash
# Graceful shutdown: 30 seconds to finish requests
aws elbv2 modify-target-group-attributes \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:targetgroup/my-targets/abc123 \
  --attributes Key=deregistration_delay.timeout_seconds,Value=30
```

---

## Health Checks

### HTTP Health Check

```bash
# Configure health check
aws elbv2 modify-target-group \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:targetgroup/my-targets/abc123 \
  --health-check-enabled \
  --health-check-protocol HTTP \
  --health-check-path /api/health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --matcher HttpCode=200
```

### Custom Health Check Endpoint

```javascript
// Node.js health check endpoint
app.get('/health', (req, res) => {
  // Check dependencies
  const health = {
    status: 'UP',
    timestamp: new Date(),
    checks: {
      database: checkDatabase(),
      cache: checkCache(),
      disk: checkDiskSpace()
    }
  };

  const statusCode = health.checks.database && health.checks.cache ? 200 : 503;
  res.status(statusCode).json(health);
});
```

### Health Check Troubleshooting

```bash
# View target health
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:targetgroup/my-targets/abc123

# Check logs
aws logs tail /aws/alb/my-alb --follow

# Common issues:
# - Security group blocks health check port
# - Application doesn't respond on health endpoint
# - High response time exceeds timeout
```

---

## SSL/TLS Certificates

### Request ACM Certificate

```bash
# Request free AWS certificate
aws acm request-certificate \
  --domain-name myapp.com \
  --subject-alternative-names "*.myapp.com" \
  --validation-method DNS
```

### HTTPS Listener

```bash
# Create HTTPS listener
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:loadbalancer/app/my-alb/abc123 \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=arn:aws:acm:us-east-1:ACCOUNT:certificate/abc123 \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:targetgroup/my-targets/abc123
```

### HTTP to HTTPS Redirect

```bash
# Create HTTP listener that redirects to HTTPS
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:loadbalancer/app/my-alb/abc123 \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=redirect,RedirectConfig='{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}'
```

---

## Routing Rules

### Host-Based Routing

```bash
# Route api.myapp.com → api target group
aws elbv2 create-rule \
  --listener-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:listener/app/my-alb/abc123/abc123 \
  --conditions Field=host-header,Values=api.myapp.com \
  --actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:targetgroup/api-targets/abc123 \
  --priority 1

# Route www.myapp.com → web target group
aws elbv2 create-rule \
  --listener-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:listener/app/my-alb/abc123/abc123 \
  --conditions Field=host-header,Values=www.myapp.com \
  --actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:targetgroup/web-targets/abc123 \
  --priority 2
```

### Path-Based Routing

```bash
# Route /api/* → api target group
aws elbv2 create-rule \
  --listener-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:listener/app/my-alb/abc123/abc123 \
  --conditions Field=path-pattern,Values=/api/* \
  --actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:targetgroup/api-targets/abc123 \
  --priority 1

# Route /static/* → cache target group
aws elbv2 create-rule \
  --listener-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:listener/app/my-alb/abc123/abc123 \
  --conditions Field=path-pattern,Values=/static/* \
  --actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:targetgroup/cache-targets/abc123 \
  --priority 2
```

### CloudFormation Complex Routing

```yaml
ListenerRule:
  Type: AWS::ElasticLoadBalancingV2::ListenerRule
  Properties:
    ListenerArn: !Ref Listener
    Actions:
      - Type: forward
        TargetGroupArn: !Ref APITargetGroup
    Conditions:
      - Field: path-pattern
        Values: ['/api/*']
      - Field: host-header
        Values: ['api.myapp.com']
    Priority: 1
```

---

## Practical Example: Complete ALB Setup

```bash
#!/bin/bash
# setup-alb.sh

set -e

# Variables
ALB_NAME=my-alb
TG_NAME=my-targets
VPC_ID=vpc-12345678
SUBNETS="subnet-1a subnet-1b"
SG_ID=sg-web

# 1. Create ALB
ALB=$(aws elbv2 create-load-balancer \
  --name $ALB_NAME \
  --subnets $SUBNETS \
  --security-groups $SG_ID \
  --scheme internet-facing \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text)

echo "Created ALB: $ALB"

# 2. Create target group
TG=$(aws elbv2 create-target-group \
  --name $TG_NAME \
  --protocol HTTP \
  --port 3000 \
  --vpc-id $VPC_ID \
  --health-check-path /health \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

echo "Created target group: $TG"

# 3. Create HTTP listener
LISTENER=$(aws elbv2 create-listener \
  --load-balancer-arn $ALB \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=$TG \
  --query 'Listeners[0].ListenerArn' \
  --output text)

echo "Created listener: $LISTENER"

# 4. Register EC2 instances
aws elbv2 register-targets \
  --target-group-arn $TG \
  --targets Id=i-instance1 Id=i-instance2

# 5. Get ALB DNS name
DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns $ALB \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

echo "✓ ALB setup complete!"
echo "Access at: http://$DNS"
```

---

## Summary

- **ALB** for web apps, microservices, path/host routing
- **NLB** for extreme throughput and low latency
- **Target groups** define where traffic goes
- **Health checks** ensure only healthy targets receive traffic
- **HTTPS** requires ACM certificates
- **Routing rules** enable sophisticated traffic management
- **Deregistration delay** provides graceful shutdown

Next: [Auto Scaling](./05_auto_scaling.md) - automatically scale infrastructure
