# ECS & ECR: Container Services on AWS

> Docker containers ko production mein scale pe deploy aur manage karna hai? AWS ke ECS (Elastic Container Service) aur ECR (Elastic Container Registry) yahi kaam karte hain — bina Kubernetes ke jhanjhat ke.

Socho tumne apna Node.js app Docker mein containerize kar diya. Ab sawaal ye hai — ye container image kahan store hogi, aur usse production mein 5-6 replicas ke saath, auto-scaling ke saath, load balancer ke peeche kaun chalayega? Yahi kaam ECR (storage) aur ECS (orchestration) milke karte hain. Socho ise Swiggy ke restaurant onboarding jaisa — ECR ek central "menu warehouse" hai jahan restaurant apna packaged menu (image) rakhte hain, aur ECS ek "kitchen manager" hai jo decide karta hai kitne kitchen (containers) chalane hain, kaunsa kitchen down ho gaya to naya spin up karna hai, aur traffic (orders) kaise distribute karna hai.

## Table of Contents
1. [ECR Basics](#ecr-basics)
2. [ECS Fundamentals](#ecs-fundamentals)
3. [Task Definitions](#task-definitions)
4. [Services & Scaling](#services--scaling)
5. [ECS Networking](#ecs-networking)
6. [Monitoring & Troubleshooting](#monitoring--troubleshooting)

---

## ECR Basics

### Kya hota hai ECR?

Amazon Elastic Container Registry basically Docker Hub ka AWS wala private version hai. Jaise tum GitHub pe code push karte ho, waise hi ECR mein Docker images push karte ho. Farak sirf itna hai — ye private, secure hai aur AWS ke andar hi (VPC ke through) directly ECS/EKS ko images serve kar sakta hai, bina internet pe jaaye. Matlab Docker Hub se image pull karne mein jo latency aur rate-limit ka dar rehta hai (public Docker Hub pull limits yaad hain?), wo ECR mein nahi hai.

> [!info]
> ECR do flavors mein aata hai — **private repositories** (tumhari company ke apne images ke liye) aur **public gallery** (jaise AWS khud apne base images publish karta hai — `public.ecr.aws`). Zyada tar production use case private repos ka hi hota hai.

### Create Repository

Sabse pehle ek repository banao — ye GitHub repo jaisa hi concept hai, bas code ke bajaye Docker images store hoti hain.

```bash
# Create ECR repository
aws ecr create-repository \
  --repository-name myapp

# Output includes repository URI:
# 123456789012.dkr.ecr.us-east-1.amazonaws.com/myapp
```

Ye jo URI mila hai (`123456789012.dkr.ecr.us-east-1.amazonaws.com/myapp`) — isi ko tum `docker tag` aur `docker push` mein use karoge. `123456789012` tumhara AWS account ID hai, `us-east-1` region hai.

### Push Image to ECR

Docker image ko ECR pe push karne ka process 4 step ka hai — login, build, tag, push. Bilkul CRED app mein card add karne jaisa flow — pehle authenticate karo, phir details fill karo, tag lagao, submit karo.

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

**Kyun ye 4 steps hi karne padte hain?**

1. `get-login-password` — AWS CLI se ek temporary password nikaalta hai (12 hours valid), jo Docker login ke liye use hota hai. Password khud AWS credentials se generate hota hai, isliye tumhe koi separate registry password yaad nahi rakhna padta.
2. `docker build` — normal Docker image banate ho, jaisa local development mein karte ho.
3. `docker tag` — local image (`myapp:latest`) ko ECR ke fully-qualified naam se "alias" karte ho. Docker ko batate ho "iss image ko push karte waqt ye naam use karna hai."
4. `docker push` — actual upload.

> [!warning]
> Docker login token sirf **12 ghante** valid rehta hai. Agar CI/CD pipeline mein "authentication token has expired" jaisi error mile, to matlab tumhe fresh `get-login-password` chalana hai — token cache mat karo.

### Automated Push via Script

Manual 4 commands baar baar type karna boring hai, isliye ek script bana lo jo push-to-ECR ka pura flow automate kare. Ye CI/CD pipeline (GitHub Actions, Jenkins) mein bhi directly use ho sakta hai.

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

Yahan ek chhota sa smart trick hai — `TAG=${1:-latest}`. Matlab agar tum script ko `./push-to-ecr.sh v2.3.1` bulaate ho, to tag `v2.3.1` use hoga, warna default `latest` chal jaayega. Aur `ACCOUNT_ID` ko hardcode nahi kiya — `aws sts get-caller-identity` se dynamically nikaala, taaki ye script kisi bhi AWS account mein bina modification ke chal jaaye.

> [!tip]
> Har deploy pe do tags push karo — ek specific version tag (`v2.3.1`) aur ek `latest`. Specific tag rollback ke liye kaam aata hai ("wapas v2.2.0 pe le chalo"), aur `latest` naye deployments ke liye convenient hota hai.

### ECR Lifecycle Policies

**Kyun zaruri hai?** Har build pe naya image push hota rahega, aur agar tum purane images delete nahi karoge, to ECR storage bill dheere dheere IRCTC Tatkal queue jaisa lamba hota jaayega — bina kaam ke paise kategi. Lifecycle policy ka kaam hai automatically purane, unused images cleanup karna.

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

Iska matlab: jaise hi repository mein 10 se zyada images ho jaayengi, sabse purani images automatically expire (delete) ho jaayengi. Production mein ye bahut common practice hai — usually `tagStatus: "untagged"` wale rule bhi add karte hain, taaki bina-tag wale dangling images (jo kisi deployment mein use hi nahi ho rahe) jaldi clean ho jaayen.

---

## ECS Fundamentals

### Kya hota hai ECS?

Amazon Elastic Container Service ek container orchestration service hai — matlab ye decide karta hai kaunsa container kahan chalega, kitne replicas chahiye, agar ek container crash ho jaaye to naya kaise spin up ho, aur load balancer ke saath kaise connect ho. Ye Kubernetes ka simpler, AWS-native alternative hai. Agar Kubernetes ek full-fledged railway reservation system hai (bahut powerful lekin complex — quotas, tatkal, waitlist, sab kuch configurable), to ECS Ola/Uber jaisa hai — simple, AWS ke andar hi tightly integrated, seedha kaam ho jaata hai bina zyada configuration ke.

### ECS Concepts

Pehle terminology clear kar lete hain, kyunki ye baar baar aayengi:

```
Cluster: Logical grouping of EC2 instances or Fargate
Task: Running container (like docker run)
Service: Manages and maintains tasks (replicas, auto-scaling)
Task Definition: Blueprint for tasks (like docker-compose)
Container Instance: EC2 instance in ECS cluster
```

Isko real-life analogy se samjho — socho ek Zomato dark kitchen chain hai:

- **Cluster** = ek pura kitchen complex/building (jahan multiple kitchens operate karte hain)
- **Task Definition** = recipe card — kaunsa dish banana hai, kitna raw material chahiye (CPU/memory), kaunsa chef (image) banayega
- **Task** = ek actual running container — recipe card ke hisaab se ek dish ban rahi hai abhi
- **Service** = kitchen manager jo ensure karta hai ki hamesha 3 chefs (replicas) active rahen, agar ek chef bimaar (crash) ho jaaye to turant naya chef arrange kare
- **Container Instance** = ek actual EC2 machine jahan par containers chal rahe hain (sirf EC2 launch type mein applicable, Fargate mein ye abstraction hi nahi hai)

### Create Cluster

```bash
# EC2 launch type cluster
aws ecs create-cluster --cluster-name production

# With CloudFormation for better control
aws cloudformation create-stack \
  --stack-name ecs-cluster \
  --template-body file://ecs-cluster.yaml
```

Simple CLI command se cluster ban jaata hai, lekin production mein usually CloudFormation (ya Terraform) use karte hain taaki underlying EC2 instances, Auto Scaling Group, IAM roles — sab kuch version-controlled aur repeatable ho.

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

Yahan do important cheezein notice karo:

1. `containerInsights: enabled` — ye CloudWatch Container Insights on karta hai, jisse tumhe per-task CPU/memory metrics milte hain (bina iske sirf basic metrics milte hain).
2. `ImageId: ami-ecs-optimized` — ye ek special AMI (Amazon Machine Image) hai jisme pehle se Docker aur ECS agent installed hote hain. Normal Ubuntu/Amazon Linux AMI use karoge to manually ECS agent install karna padega.

> [!info]
> Ye setup **EC2 launch type** ke liye hai — matlab tum khud EC2 instances manage kar rahe ho jinpe containers chalenge. Agar tumhe instance management ka jhanjhat nahi chahiye, to seedha **Fargate launch type** use karo (niche discuss kiya hai) — wahan ye poora Auto Scaling Group setup hi zaruri nahi.

---

## Task Definitions

### Kya hota hai Task Definition?

Task Definition ek JSON blueprint hai jo batata hai ki container kaise run hona chahiye — kaunsi image use karni hai, kitna CPU/memory chahiye, kaunse ports expose karne hain, environment variables kya hain, secrets kahan se aayenge, aur health check kaise karna hai. Isko `docker-compose.yml` ka AWS version samjho — jaise compose file mein tum poori service definition likhte ho, waise hi ECS Task Definition mein.

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

Har field ka role samjho:

- **`environment` vs `secrets`** — ye difference bahut important hai. `environment` mein plain-text values jaate hain (jaise `NODE_ENV=production`, jisme koi sensitive info nahi). Lekin `DATABASE_URL` jaisi cheezein — jisme password ho sakta hai — kabhi bhi `environment` mein plaintext mat daalo. Iske bajaye `secrets` field use karo jo AWS Secrets Manager (ya SSM Parameter Store) se runtime pe value fetch karta hai. Ye bilkul waise hai jaise CRED apna app UPI PIN kabhi bhi plain text mein store nahi karta — encrypted vault se runtime pe fetch karta hai.
- **`logConfiguration`** — container ke `stdout`/`stderr` ko CloudWatch Logs mein bhejta hai. `awslogs-stream-prefix: ecs` se logs organize hone mein help milti hai — har task ka apna log stream banega under `/ecs/myapp/ecs/<task-id>`.
- **`healthCheck`** — ye Docker-level health check hai (container ke andar command chalake check karta hai). `startPeriod: 60` ka matlab hai — pehle 60 second app ko "warm up" hone do, is dauraan failed health checks count nahi honge (kyunki app boot hone mein time leta hai — DB connections, cache warmup, etc.)
- **`execution-role-arn`** — ye IAM role hai jo ECS agent ko use karne deta hai taaki wo ECR se image pull kar sake aur Secrets Manager se secrets fetch kar sake. Isse confuse mat karo **task role** ke saath (jo container ke andar chal rahe application code ko AWS APIs call karne ki permission deta hai — jaise S3 pe file upload karna).

> [!warning]
> `execution-role-arn` aur `task-role-arn` dono alag cheezein hain aur log confuse ho jaate hain. Execution role = "ECS ko task start karne ke liye chahiye" (image pull, secrets fetch, logs likhna). Task role = "tumhara application code ko AWS resources access karne ke liye chahiye" (jaise S3, DynamoDB). Dono ko least-privilege rakho.

### Task Definition Versions

Task Definitions **immutable** hote hain — matlab ek baar register ho gaya to usme edit nahi kar sakte. Har change ek naya "revision" (version number) create karta hai. Ye Git commits jaisa hai — purana commit change nahi hota, naya commit banta hai.

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

**Kyun useful hai ye immutability?** Rollback bahut aasan ho jaata hai — agar `myapp:5` mein bug aa gaya, to seedha service ko `myapp:4` pe point kar do, purana wala state exactly waisa hi restore ho jaayega jaisa tha. Kisi cheez ko "undo" karne ke liye guess-work nahi karna padta.

---

## Services & Scaling

### Kya hota hai Service?

Task Definition sirf ek "template" hai — usse actual chalte rehne wale, self-healing replicas mein badalne ka kaam **Service** karta hai. Service ensure karta hai ki hamesha tumhara specified number of tasks (`desired-count`) running rahen — agar koi task crash ho jaaye, service automatically naya start kar deta hai. Aur ye load balancer ke saath bhi integrate hota hai taaki traffic sahi tasks tak route ho.

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

Yahan `desired-count: 3` ka matlab hai — hamesha 3 copies (tasks) chalte rahenge is app ke. Agar ek crash ho jaaye, ECS automatically 4th ko start karega jab tak 3 healthy tasks wapas na ho jaayen. `load-balancers` config batata hai ki traffic Application Load Balancer ke through kaunse target group mein route hoga.

### Update Service

Deployment ka matlab hota hai — service ko batana ki ab naye task definition version use karo.

```bash
# Deploy new task definition
aws ecs update-service \
  --cluster production \
  --service myapp \
  --task-definition myapp:2 \
  --force-new-deployment
```

Default ECS deployment strategy **rolling deployment** hai — matlab ek-ek karke purane tasks ko naye se replace karta hai, taaki downtime na ho (traffic hamesha kam se kam kuch healthy tasks pe route hota rahega). Isko socho jaise Swiggy delivery fleet ko update karna — sabhi riders ko ek saath offline nahi karte, ek-ek batch karke naya app version rollout karte hain taaki orders miss na hon.

`--force-new-deployment` flag tab useful hai jab task definition same ho lekin tum sirf naya image (`latest` tag ke peeche) pull karwana chahte ho — bina ye flag ke ECS samjhega "kuch nahi badla, kuch mat karo."

### Auto Scaling

**Kyun zaruri hai?** Fix `desired-count` rakhna wasteful hai — raat 2 baje jab traffic kam hota hai tab bhi 10 tasks chalate rehna paisa waste karna hai, aur peak hours (jaise Big Billion Day sale) mein sirf 3 tasks rakhna crash karwa dega. Auto Scaling dynamically task count ko demand ke hisaab se adjust karta hai.

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

Ye policy bata rahi hai — "average CPU utilization ko 75% ke aas-paas rakho." Agar CPU 75% se upar jaata hai, ECS automatically naye tasks add karega (scale-out); agar CPU kam hai, tasks kam karega (scale-in). Kabhi 2 se kam aur kabhi 10 se zyada nahi jaayega (`min-capacity`/`max-capacity` limits).

Cooldown periods bhi dhyan se dekho — `ScaleOutCooldown: 60` (scale-up jaldi karo, 60 second mein) lekin `ScaleInCooldown: 300` (scale-down dheere karo, 5 minute wait karo). Ye asymmetry intentional hai — traffic spike pe fast react karna hai (users ko slow response na mile), lekin traffic thoda kam hote hi turant scale down mat karo, warna "flapping" ho jaayega (scale up-down-up-down baar baar), jo instability create karta hai.

> [!tip]
> Ye bilkul Zomato ke delivery partner allocation jaisa hai — lunch/dinner rush mein turant zyada partners activate ho jaate hain (fast scale-out), lekin rush khatam hone ke baad thoda wait karke hi partners ko "off-duty" mode mein bhejte hain (slow scale-in), taaki agar dobara demand aaye to turant handle ho sake.

---

## ECS Networking

### Networking Modes

**Kya hota hai networking mode?** Ye decide karta hai ki container network se kaise connect hota hai — kya usska apna IP address hoga, ya host machine ka network share karega.

```
bridge: Traditional Docker bridging (EC2 launch type)
host: Container uses host network (EC2 launch type)
awsvpc: ENI per task (Fargate, modern EC2)
```

- **bridge** — Classic Docker networking. Container ka apna internal IP hota hai jo host ke andar NAT ke through map hota hai. Purana approach.
- **host** — Container directly host machine ka network stack use karta hai, koi isolation nahi. Fast hai lekin port conflicts ka risk (do containers same port use nahi kar sakte ek hi host pe).
- **awsvpc** — Modern approach, aur Fargate ke liye mandatory. Har task ko apna khud ka **Elastic Network Interface (ENI)** milta hai — matlab har task ka apna private IP address hota hai, bilkul ek EC2 instance jaisa. Isse security groups aur network ACLs directly task-level pe apply ho sakte hain, jo bahut zyada granular control deta hai.

> [!info]
> Aaj kal production mein zyada tar **awsvpc** hi use hota hai (Fargate ke saath to compulsory hi hai) kyunki iska security aur isolation model sabse clean hai.

### Fargate vs EC2

Ye ECS ka sabse important decision hai — apne containers **kaunse launch type** pe chalane hain.

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

Isko OYO vs apna hotel banane jaisa socho:

- **Fargate** = OYO room book karna. Tumhe bas apna saaman (container image) leke aana hai, baaki sab (building maintenance, security, electricity — matlab underlying EC2 instances, patching, capacity planning) OYO (AWS) sambhal leta hai. Thoda mehenga per-night padta hai, lekin zero operational headache.
- **EC2 launch type** = apna khud ka hotel building banana. Sasta padta hai per-room (per-task) agar tum bahut sare rooms bhar rahe ho, aur tumhe full control hai (custom hardware, GPU wagera), lekin ab tumhe khud building maintain karni padegi — AMI patching, capacity scaling, instance health monitoring.

**Kab kya use karein?**
- Chhoti team, unpredictable traffic, kam operational bandwidth → **Fargate**
- Bade scale pe steady, predictable workloads jahan cost optimize karni hai, ya GPU/special hardware chahiye → **EC2 launch type**

### Security Groups in ECS

**Kyun zaruri hai?** Tasks ko sirf jinse baat karni chahiye unhi se karne do — baaki sab traffic block karo. Ye zero-trust networking ka basic principle hai.

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

Yahan pattern samjho — `source-group` mein ek security group ID ka reference diya hai, IP range nahi. Matlab "sirf wahi traffic allow karo jo `sg-alb` (load balancer) ya `sg-tasks` (dusre tasks) se aaye." Ye approach IP-based rules se better hai kyunki tasks ke IP address dynamic hote hain (restart pe badal jaate hain), lekin security group membership consistent rehti hai.

---

## Monitoring & Troubleshooting

### CloudWatch Logs

Production mein jab kuch break ho jaaye, sabse pehla kaam hota hai logs dekhna. ECS automatically container ke `stdout`/`stderr` ko CloudWatch mein bhej deta hai (agar `awslogs` log driver configure kiya ho task definition mein).

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

`aws logs tail --follow` bilkul `tail -f` jaisa kaam karta hai — real-time mein logs stream hote dikhte hain. Production debugging mein ye tumhara best friend hai.

### ECS Exec for Debugging

**Kya hota hai?** Kabhi kabhi sirf logs se kaam nahi chalta — tumhe running container ke andar jaake dekhna padta hai ki actually kya ho raha hai (jaise env vars check karna, file system browse karna, ya manually kuch command chalana). ECS Exec ye karne deta hai — bilkul `docker exec -it` jaisa, lekin remote running task ke andar.

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

> [!warning]
> ECS Exec use karne ke liye task definition mein `enableExecuteCommand: true` set hona chahiye (service create/update ke time pe `--enable-execute-command` flag), aur task role ko SSM se related permissions chahiye. Ye by default off hota hai security ke liye — production mein isko on rakhna hai to access ko audit trail (CloudTrail) se track karo, kyunki ye essentially container ke andar shell access de raha hai.

### Task Stopping & Replacement

Kabhi kabhi ek task ko manually restart karna hota hai — jaise memory leak dikh raha ho ya koi weird state mein stuck ho gaya ho.

```bash
# Stop task (will be replaced by service)
aws ecs stop-task \
  --cluster production \
  --task abc123def456 \
  --reason "Manual restart for debugging"

# Service automatically starts new task
```

Yahan ka magic ye hai — agar ye task ek **Service** ke through manage ho raha hai (standalone task nahi), to `stop-task` chalate hi Service dekhega "arre, desired-count 3 tha lekin abhi 2 hi chal rahe hain" aur automatically ek naya task start kar dega. Matlab manual restart bhi self-healing behavior trigger karta hai — bilkul waise jaise Ola driver app crash hone pe automatically restart ho jaata hai bina rider ko pata chale.

### Common Issues

Jab task start hi nahi ho raha ya baar baar crash ho raha hai, ye do commands tumhare debugging ka starting point hone chahiye:

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

`StoppedReason` field bahut informative hota hai — usually seedha bata deta hai kya wajah thi (jaise "CannotPullContainerError" matlab image access issue, ya "OutOfMemoryError" matlab task ki memory limit chhoti thi).

> [!tip]
> Agar task baar baar start hoke crash ho raha hai (`CannotPullContainerError`), to sabse pehle check karo — execution role ko ECR se image pull karne ki permission hai kya, aur agar `awsvpc` mode use kar rahe ho to task ke paas internet access hai kya (private subnet mein ho to NAT Gateway chahiye hoga ya VPC Endpoint for ECR).

---

## Practical Example: Deploy App to ECS

Ab sab kuch jodke ek complete deployment script banate hain — jo image build kare, push kare, naya task definition register kare, aur service ko update karke wait kare jab tak deployment stable na ho jaaye. Ye woh script hai jo tum apne CI/CD pipeline (GitHub Actions, GitLab CI) mein directly daal sakte ho.

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

Ek cheez zaroor notice karo — `set -e` line ke top pe. Ye ensure karta hai ki agar beech mein koi bhi command fail ho jaaye (jaise push fail ho gaya ya task definition register nahi hua), to poora script turant ruk jaayega, aage nahi badhega. Ye production deployment scripts mein hamesha use karna chahiye — warna partial/broken deployment ho sakta hai jahan tumhe pata bhi nahi chalega ki kuch step skip ho gaya.

`aws ecs wait services-stable` bhi important hai — ye command tab tak block karta hai jab tak naye tasks fully healthy na ho jaayen aur purane tasks pura drain na ho jaayen. Isse tumhare CI/CD pipeline ko exact pata chalta hai ki deployment successful hui ya nahi — bina iske tumhe manually dashboard check karna padta.

---

## Key Takeaways

- **ECR** AWS ka private Docker registry hai — images ko securely store aur ECS/EKS ko directly serve karta hai, bina internet ke through jaaye.
- **ECS** Docker orchestration service hai — EC2 ya Fargate pe containers chalata hai, replicas maintain karta hai, aur self-healing deployment provide karta hai.
- **Task Definition** immutable blueprint hai (docker-compose ka AWS equivalent) — image, CPU/memory, ports, env vars, secrets, health check sab define karta hai. Har update naya version banata hai, purana rollback ke liye available rehta hai.
- **Service** task replicas maintain karta hai (`desired-count`), auto-healing karta hai, aur load balancer ke saath integrate hota hai. Rolling deployments se zero-downtime updates hoti hain.
- **Auto Scaling** CPU/custom metrics ke basis pe dynamically task count adjust karta hai — asymmetric cooldowns (fast scale-out, slow scale-in) instability se bachate hain.
- **Fargate vs EC2**: Fargate serverless (OYO jaisa — sab AWS manage karta hai, thoda mehenga), EC2 launch type sasta hai per-task lekin instance management khud karna padta hai.
- **awsvpc networking mode** har task ko apna ENI (private IP) deta hai, jisse security groups task-level pe apply ho sakte hain — modern ECS setups mein standard.
- **CloudWatch Logs** aur **ECS Exec** monitoring aur debugging ke primary tools hain — logs se pattern dekho, ECS Exec se live container ke andar jaake root cause dhundo.
- Deployment scripts mein `set -e` aur `aws ecs wait services-stable` use karo taaki failures silently na ho jaayen aur deployment status explicitly verify ho.

Next: [Load Balancers](./04_load_balancers.md) - distribute traffic across instances
