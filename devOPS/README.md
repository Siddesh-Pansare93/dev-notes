# Modern DevOps Learning Guide

> Ek comprehensive, hands-on guide jo tumhe modern DevOps practices sikhayegi — Docker, CI/CD, AWS, Kubernetes, aur Infrastructure as Code. Socho isko apna DevOps ka "Swiggy se Zomato tak" wala safar — order lena (code likhna) se lekar delivery tak (production mein deploy hona) — poora pipeline cover hoga.

## Yeh Guide Use Kaise Karein?

**Kya hai yeh guide?** Ek structured roadmap jo tumhe zero se leke production-grade DevOps engineer banne tak le jaata hai. Har section pichhle section ke upar build hota hai — jaise IRCTC ka reservation system layer by layer bana hoga: pehle basic booking (Docker), fir automated ticket generation (CI/CD), fir scale karna (AWS + Kubernetes), fir poora infra ko code se manage karna (Terraform), aur finally sab kuch monitor karna (Prometheus/Grafana).

Is guide mein tumhe milega:
- **Practical, real-world examples** — sirf theory nahi, actual cheezein banayenge
- **Hands-on exercises** — real projects build aur deploy karoge
- **Best practices** — industry standards shuru se hi seekhoge, baad mein "galat tarika" unlearn nahi karna padega
- **Progressive complexity** — basics se leke advanced patterns tak, step by step

> [!tip]
> Agar tum Node.js/TypeScript developer ho (jaise Siddesh), toh yeh guide tumhare liye perfect hai — kyunki tum already backend ka logic samajhte ho, ab bas usko **deploy, scale, aur monitor** karna seekhna hai. Wahi skillset jo tumhe junior se senior engineer banata hai.

---

## Table of Contents

### [`01_fundamentals/`](./01_fundamentals/) — Docker & Containerization

**Kyun zaruri hai?** Yeh foundation hai. Docker samjhe bina CI/CD, Kubernetes, ya cloud deployment kuch bhi samajh nahi aayega — jaise bina UPI samjhe Paytm/PhonePe internals samajhna mushkil hai.

| # | File | Topics |
|---|------|--------|
| 1 | [Introduction to DevOps](./01_fundamentals/01_introduction_to_devops.md) | DevOps culture, principles, tools landscape |
| 2 | [Docker Basics](./01_fundamentals/02_docker_basics.md) | Images, containers, Dockerfile, basic commands |
| 3 | [Dockerfile Best Practices](./01_fundamentals/03_dockerfile_best_practices.md) | Multi-stage builds, layer optimization, security |
| 4 | [Docker Networking](./01_fundamentals/04_docker_networking.md) | Bridge, host, overlay networks, port mapping |
| 5 | [Docker Volumes](./01_fundamentals/05_docker_volumes.md) | Persistent storage, bind mounts, named volumes |
| 6 | [Dockerizing Applications](./01_fundamentals/06_dockerizing_applications.md) | Node.js, Python, full-stack apps |

### [`02_ci_cd/`](./02_ci_cd/) — Continuous Integration & Deployment

**Kya hota hai?** CI/CD ka matlab hai — code likhne se lekar production tak pahunchne ka poora automated pipeline. Socho Zomato mein jab restaurant naya menu item add karta hai, toh manually koi employee jaake har delivery boy ko bata nahi sakta — system automatically update ho jaata hai. Waise hi CI/CD automatically test karta hai, build karta hai, aur deploy karta hai — bina manual intervention ke.

| # | File | Topics |
|---|------|--------|
| 1 | [CI/CD Concepts](./02_ci_cd/01_cicd_concepts.md) | CI vs CD, pipelines, automated testing |
| 2 | [GitHub Actions Basics](./02_ci_cd/02_github_actions_basics.md) | Workflows, jobs, steps, triggers |
| 3 | [Building & Testing](./02_ci_cd/03_building_and_testing.md) | Automated builds, test runners, code quality |
| 4 | [Docker Image CI/CD](./02_ci_cd/04_docker_image_cicd.md) | Build, tag, push to registries (Docker Hub, ECR) |
| 5 | [Deployment Strategies](./02_ci_cd/05_deployment_strategies.md) | Blue-green, canary, rolling deployments |
| 6 | [Secrets Management](./02_ci_cd/06_secrets_management.md) | GitHub Secrets, environment variables, security |
| 7 | [Advanced Workflows](./02_ci_cd/07_advanced_workflows.md) | Matrix builds, reusable workflows, caching |

### [`03_aws_essentials/`](./03_aws_essentials/) — AWS Core Services

**Kyun zaruri hai?** AWS duniya ka sabse popular cloud provider hai — jaise Flipkart ka warehouse network jo poore India mein products deliver karta hai, waise hi AWS ke Regions aur Availability Zones duniya bhar mein apps host karte hain. Yeh section tumhe woh basic building blocks sikhayega jo har AWS-based system mein use hote hain.

| # | File | Topics |
|---|------|--------|
| 1 | [AWS Overview](./03_aws_essentials/01_aws_overview.md) | Regions, AZs, IAM, AWS CLI, credentials |
| 2 | [EC2 Essentials](./03_aws_essentials/02_ec2_essentials.md) | Instances, AMIs, security groups, key pairs |
| 3 | [ECS & ECR](./03_aws_essentials/03_ecs_and_ecr.md) | Container registry, ECS clusters, task definitions |
| 4 | [Load Balancers](./03_aws_essentials/04_load_balancers.md) | ALB, NLB, target groups, health checks |
| 5 | [Auto Scaling](./03_aws_essentials/05_auto_scaling.md) | Auto Scaling Groups, launch templates, scaling policies |
| 6 | [RDS & Databases](./03_aws_essentials/06_rds_and_databases.md) | RDS, backups, multi-AZ, read replicas |
| 7 | [S3 & CloudFront](./03_aws_essentials/07_s3_and_cloudfront.md) | Object storage, CDN, static site hosting |
| 8 | [VPC Networking](./03_aws_essentials/08_vpc_networking.md) | Subnets, route tables, NAT gateways, security |

### [`04_orchestration/`](./04_orchestration/) — Container Orchestration

**Kya hota hai?** Jab tumhare paas ek do container hote hain, manually manage kar sakte ho. Lekin jab Swiggy jaisi company ke paas hazaaron microservices, lakhon containers running hote hain — tab orchestration tool (jaise Kubernetes) chahiye hota hai jo automatically decide kare kaunsa container kahan chalega, kab restart hoga, kaise scale hoga.

| # | File | Topics |
|---|------|--------|
| 1 | [Docker Compose](./04_orchestration/01_docker_compose.md) | Multi-container apps, docker-compose.yml, networks |
| 2 | [Kubernetes Basics](./04_orchestration/02_kubernetes_basics.md) | Pods, nodes, clusters, kubectl basics |
| 3 | [Kubernetes Deployments](./04_orchestration/03_kubernetes_deployments.md) | Deployments, ReplicaSets, rolling updates |
| 4 | [Services & Networking](./04_orchestration/04_services_and_networking.md) | ClusterIP, NodePort, LoadBalancer, Ingress |
| 5 | [ConfigMaps & Secrets](./04_orchestration/05_configmaps_and_secrets.md) | Configuration management, sensitive data |
| 6 | [Persistent Storage](./04_orchestration/06_persistent_storage.md) | PersistentVolumes, PersistentVolumeClaims, StorageClasses |
| 7 | [EKS (AWS Kubernetes)](./04_orchestration/07_eks_aws_kubernetes.md) | Managed Kubernetes, node groups, kubectl setup |
| 8 | [Helm Package Manager](./04_orchestration/08_helm_package_manager.md) | Charts, releases, templating, repositories |

### [`05_infrastructure_as_code/`](./05_infrastructure_as_code/) — Infrastructure as Code

**Kyun zaruri hai?** Pehle log AWS console mein click-click karke servers banate the — manual, error-prone, aur "kal kaunsi setting change ki thi yeh yaad nahi" wala problem. IaC (Terraform, CloudFormation) se tum poora infrastructure **code** mein likhte ho — version control mein, review ho sakta hai, aur ek command se puri infra recreate ho sakti hai. Jaise ek recipe likh do, phir jab chaho wahi dish bana lo.

| # | File | Topics |
|---|------|--------|
| 1 | [IaC Concepts](./05_infrastructure_as_code/01_iac_concepts.md) | Infrastructure as Code, declarative vs imperative |
| 2 | [Terraform Basics](./05_infrastructure_as_code/02_terraform_basics.md) | HCL, providers, resources, state files |
| 3 | [Terraform Modules](./05_infrastructure_as_code/03_terraform_modules.md) | Reusable modules, input variables, outputs |
| 4 | [AWS with Terraform](./05_infrastructure_as_code/04_aws_with_terraform.md) | VPC, EC2, RDS, S3 with Terraform |
| 5 | [Terraform State Management](./05_infrastructure_as_code/05_terraform_state_management.md) | Remote state, S3 backend, state locking |
| 6 | [Terraform Workspaces](./05_infrastructure_as_code/06_terraform_workspaces.md) | Environments (dev, staging, prod) |
| 7 | [CloudFormation Basics](./05_infrastructure_as_code/07_cloudformation_basics.md) | AWS native IaC, templates, stacks |

### [`06_monitoring/`](./06_monitoring/) — Monitoring & Observability

**Kya hota hai?** Production mein app deploy karne ke baad kaam khatam nahi hota — asli kaam ab shuru hota hai. Monitoring aur observability tumhe batate hain ki system "andar se kaisa feel kar raha hai" — jaise CRED app tumhara credit score health track karta hai, waise hi tum apne system ka "health" track karte ho — kitne requests aa rahe hain, kaunsi API slow hai, kahan errors ho rahe hain.

| # | File | Topics |
|---|------|--------|
| 1 | [Observability Concepts](./06_monitoring/01_observability_concepts.md) | Metrics, logs, traces, the three pillars |
| 2 | [Application Logging](./06_monitoring/02_application_logging.md) | Structured logging, log levels, best practices |
| 3 | [CloudWatch](./06_monitoring/03_cloudwatch.md) | Logs, metrics, alarms, dashboards |
| 4 | [Prometheus & Grafana](./06_monitoring/04_prometheus_and_grafana.md) | Metrics collection, visualization, alerting |
| 5 | [Distributed Tracing](./06_monitoring/05_distributed_tracing.md) | Jaeger, OpenTelemetry, request tracing |
| 6 | [Health Checks & Alerts](./06_monitoring/06_health_checks_and_alerts.md) | Liveness, readiness probes, alerting strategies |
| 7 | [Performance Monitoring](./06_monitoring/07_performance_monitoring.md) | APM tools, profiling, optimization |

---

## Learning Paths

Sabko poora guide ek saath padhne ki zaroorat nahi. Apni goal ke hisaab se path choose karo — jaise Ola/Uber mein tum apni destination ke hisaab se route choose karte ho:

### Quick Start (2-3 weeks)
`01_fundamentals` → `02_ci_cd` (GitHub Actions basics) → `03_aws_essentials` (EC2, ECS basics)

*Agar bas jaldi se DevOps ka swaad chakhna hai, toh yeh sabse fast route hai.*

### Docker & CI/CD Focus (4-5 weeks)
`01_fundamentals` → `02_ci_cd` → `04_orchestration` (Docker Compose)

*Agar tumhara focus containers aur automation pipelines pe hai.*

### AWS DevOps Engineer (6-8 weeks)
`01_fundamentals` → `02_ci_cd` → `03_aws_essentials` → `04_orchestration` (ECS/EKS) → `05_infrastructure_as_code` → `06_monitoring`

*Agar AWS DevOps Engineer role ka target hai — yeh sabse complete aur job-ready path hai.*

### Kubernetes Focus (5-6 weeks)
`01_fundamentals` → `04_orchestration` (Kubernetes, EKS, Helm) → `05_infrastructure_as_code` → `06_monitoring`

*Agar Kubernetes/K8s expert banna hai — bahut demand hai iski market mein.*

### Complete DevOps Path (10-12 weeks)
Follow all sections in order: `01` through `06`

*Agar time hai aur foundation se leke advanced tak sab kuch thoroughly seekhna hai — yeh sabse recommended path hai.*

---

## Prerequisites

Shuru karne se pehle yeh cheezein pata honi chahiye — inke bina concepts samajhna thoda mushkil hoga:

- Basic understanding of Linux/Unix command line
- Familiarity with at least one programming language (Node.js, Python, etc.)
- Git basics (clone, commit, push, pull)
- Basic networking concepts (ports, IP addresses, HTTP)

> [!info]
> Agar tum Node.js/TypeScript developer ho, toh pehla aur teesra point already cover hoga. Bas Linux command line thoda practice kar lo — DevOps mein 90% kaam terminal pe hi hota hai.

## Required Tools

### Yeh tools install karke follow karo:

```bash
# Docker
# Install from: https://docs.docker.com/get-docker/

# AWS CLI
# Install from: https://aws.amazon.com/cli/

# kubectl (Kubernetes CLI)
# Install from: https://kubernetes.io/docs/tasks/tools/

# Terraform
# Install from: https://www.terraform.io/downloads

# Optional but recommended:
# - VS Code with Docker extension
# - Postman or curl for API testing
# - k9s (Kubernetes CLI UI)
```

> [!warning]
> Docker Desktop (Windows/Mac) install karne ke baad ek baar restart zaroor karo, warna WSL2 backend properly initialize nahi hoga aur `docker` commands fail honge.

---

## Key Concepts Mapped

Yeh table tumhe quick reference dega — kaunsa concept kaunse tool/service se solve hota hai:

| Concept | Tools/Services |
|---------|----------------|
| **Containerization** | Docker, containerd |
| **Container Registry** | Docker Hub, AWS ECR, GitHub Container Registry |
| **CI/CD** | GitHub Actions, GitLab CI, Jenkins |
| **Container Orchestration** | Kubernetes, AWS ECS, Docker Swarm |
| **Cloud Provider** | AWS (primary), Azure, GCP |
| **Infrastructure as Code** | Terraform, CloudFormation, Pulumi |
| **Monitoring** | CloudWatch, Prometheus, Grafana, Datadog |
| **Load Balancing** | AWS ALB/NLB, Nginx, Traefik |
| **Auto Scaling** | AWS Auto Scaling, Kubernetes HPA |
| **Service Mesh** | Istio, Linkerd, AWS App Mesh |

---

## Hands-On Projects

Sirf padhna kaafi nahi — DevOps hai hi "haath gande karke seekhne" wali cheez. Is poore guide mein tum yeh actual projects banaoge:

1. **Dockerized Full-Stack App** — Multi-container application with Docker Compose. *Socho ek Zomato-jaisa app — frontend, backend, database sab alag containers mein, ek saath chalte hue.*
2. **CI/CD Pipeline** — Automated testing and deployment with GitHub Actions. *Har code push pe automatically test aur deploy — koi manual step nahi.*
3. **AWS ECS Deployment** — Deploy containerized app to AWS with auto-scaling. *Jab traffic badhe (jaise Big Billion Day sale), system khud scale ho jaaye.*
4. **Kubernetes Cluster** — Deploy and manage apps on Kubernetes/EKS. *Production-grade orchestration seekhoge, jo bade tech companies actually use karti hain.*
5. **Infrastructure as Code** — Provision complete AWS infrastructure with Terraform. *Poora infra ek command se spin up aur destroy karna seekhoge.*
6. **Monitoring System** — Set up comprehensive observability stack. *Apna khud ka Grafana dashboard banaoge jisse pata chale system kaisa perform kar raha hai.*

---

## Best Practices Covered

Yeh sirf tools seekhna nahi hai — industry mein kaam karne ke liye yeh practices bhi zaroori hain:

- **Security**: Least privilege, secrets management, image scanning
- **Cost Optimization**: Resource right-sizing, auto-scaling, spot instances
- **High Availability**: Multi-AZ deployments, health checks, redundancy
- **Disaster Recovery**: Backups, snapshot strategies, failover
- **Documentation**: Infrastructure documentation, runbooks, diagrams

---

## Additional Resources

- **AWS Free Tier**: Zyadatar examples free tier eligible services use karte hain, toh paisa kharcha karne ki tension nahi
- **Docker Hub**: Container images store aur share karne ke liye
- **GitHub Actions**: 2000 free minutes/month CI/CD ke liye — practice ke liye kaafi hai
- **Terraform Cloud**: State management ke liye free tier available hai

---

## Key Takeaways

- Yeh guide 6 sections mein structured hai: Docker fundamentals → CI/CD → AWS essentials → Orchestration (Kubernetes) → Infrastructure as Code → Monitoring — har ek pichle wale pe build hota hai
- Docker aur containerization sabse pehle seekho — yeh poore DevOps ecosystem ka foundation hai
- CI/CD automation ka matlab hai manual, error-prone deployment process ko khatam karna
- AWS jaisa cloud provider samajhna zaroori hai kyunki real-world infra usi pe chalti hai
- Kubernetes/orchestration tab kaam aata hai jab scale bada ho — chhote projects mein Docker Compose kaafi hai
- Infrastructure as Code (Terraform) se infra reproducible aur version-controlled ban jaata hai — "kal kya setting thi" wala problem solve
- Monitoring aur observability deploy karne ke baad ka sabse zaruri kaam hai — bina isके production issues blind spot ban jaate hain
- Apni goal ke hisaab se learning path choose karo — sab kuch ek saath seekhne ki zaroorat nahi
