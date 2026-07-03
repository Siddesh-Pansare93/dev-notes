# AWS Overview & Fundamentals

> AWS ke regions, availability zones, IAM, aur woh core concepts samjho jo DevOps ke liye zaruri hain.

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

Kya hota hai? Socho AWS ek bahut bada Zomato jaisa network hai jiska worldwide presence hai — jaise Zomato ka har city mein alag dark kitchen setup hota hai, waise hi AWS ka har jagah alag "Region" hota hai. Ek region matlab ek geographic location jahan AWS ne apna poora data center cluster laga rakha hai — bijli, cooling, servers, networking, sab kuch us jagah ka apna independent setup.

AWS ke duniya bhar mein 30+ regions hain, aur har ek **completely independent** hai — matlab us-east-1 (Virginia) mein kuch fail ho jaye, toh usse ap-south-1 (Mumbai) pe koi asar nahi padega. Yeh isolation blast-radius control ke liye zaruri hai — jaise ek IRCTC server down ho jaye ek city mein, toh dusre city ka booking system chalta rehta hai.

```
Regions (Independent AWS Deployments)
├── us-east-1 (N. Virginia) - Oldest, most services
├── us-west-2 (Oregon)
├── eu-west-1 (Ireland)
├── ap-southeast-1 (Singapore)
└── ...and 25+ more
```

> [!info]
> `us-east-1` sabse purana aur sabse zyada services wala region hai — naye AWS features aksar sabse pehle yahin launch hote hain. Isliye bahut si companies apna primary infra yahin rakhti hain, chahe unke users kahin bhi baithe hon.

### Availability Zones (AZs)

Kyun zaruri hai? Agar poore region ka data ek hi building mein rakh do, toh agar us building mein aag lag jaye ya power chali jaye, toh sab kuch down ho jayega. Isiliye AWS har region ko multiple **Availability Zones (AZs)** mein todta hai.

Ek AZ ek physically separate data center hota hai — apni khud ki bijli, apna khud ka cooling, apna khud ka network. Lekin same region ke andar sab AZs low-latency (<1ms) private network se connected hote hain, taaki data ek AZ se dusre AZ tak turant transfer ho sake.

Isko aise samjho — ek hi shehar (region) mein Swiggy ke 3-4 alag-alag warehouses (AZs) hain. Agar ek warehouse mein bijli chali jaye, toh doosre warehouse se order deliver ho sakta hai kyunki dono ek hi city mein close hain (fast connectivity), lekin physically alag jagah hain (isolated failure).

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

> [!tip]
> Production mein hamesha apne application ko **kam se kam 2 AZs** mein deploy karo (multi-AZ). Agar ek AZ down ho jaye, dusra AZ traffic handle karta rahega — isko hi "High Availability" kehte hain. Sirf ek AZ pe deploy karna aisa hai jaise Zomato apna poora order-management system sirf ek hi server room mein rakh de — risky move hai.

### Choosing Regions

Region choose karte waqt kaunse factors dekhne chahiye?

```
Factors:
1. Latency - Choose closest to users
2. Compliance - Data residency requirements
3. Service availability - Not all services in all regions
4. Cost - Varies by region
```

Practical example se samjho: agar tumhara startup India ke users ko serve kar raha hai, toh `ap-south-1` (Mumbai) choose karoge — kyunki latency kam hogi (jaise Zomato ka nearest dark kitchen se order aana fast hota hai, waise hi nearest AWS region se response fast aata hai).

Lekin agar tum banking/fintech app bana rahe ho aur RBI ka rule hai ki Indian users ka financial data India ke bahar store nahi ho sakta (data residency/compliance), toh chahe koi aur region cheaper ho, tumhe Mumbai region hi use karna padega — jaise UPI transactions ka data India ke andar hi rehna chahiye compliance ke liye.

Cost bhi region ke hisaab se different hota hai — same EC2 instance ka price Mumbai region mein alag hoga aur Virginia mein alag. Aur yeh bhi dhyan rakho ki har naya AWS service pehle din se sab regions mein available nahi hota — kuch services sirf select regions mein launch hoti hain shuru mein.

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

Kya hota hai? IAM AWS ka **security gatekeeper** hai — yeh control karta hai ki kaun (user/service/application) AWS account mein kya kar sakta hai. Isko socho jaise CRED app ka permission system — har user ka apna access level hota hai, koi bhi random insaan tumhare bank details nahi dekh sakta jab tak specifically allow na kiya ho.

### IAM Concepts

```
Users: Individual people
Groups: Collections of users
Roles: Assumed by services/users
Policies: Define permissions
```

In char concepts ko samjhna zaruri hai:

- **Users** — individual insaan, jaise tumhari company mein "Rahul" ka apna AWS login hoga.
- **Groups** — users ka collection, jaise "Developers" group jisme sab dev team ke logon ko same permissions mil jaati hain ek saath. Har user ko individually permission dene ke bajaye group mein daal do — Swiggy jaise app mein jaise "Delivery Partners" ek group hai aur unko common permissions milte hain, individually har rider ko separately configure nahi karte.
- **Roles** — yeh users ke liye nahi, **services** ke liye hote hain (ya temporarily assume kiye jaate hain). Jaise EC2 instance ko S3 bucket access chahiye toh usko ek Role diya jaata hai, permanent credentials nahi.
- **Policies** — yeh actual rules hain jo define karte hain "kaun kya kar sakta hai" — JSON document ke form mein.

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

`create-login-profile` se console login (browser wala) milta hai, aur `create-access-key` se programmatic access milta hai (CLI/SDK ke through). `--password-reset-required` flag isliye important hai kyunki temporary password de rahe ho — user ko pehle login pe khud ka naya password set karna padega, jaise naye Paytm account mein first login pe OTP verify karke naya PIN set karte ho.

### IAM Policies

Policy ek JSON document hota hai jo `Effect` (Allow/Deny), `Action` (kaunsa operation), aur `Resource` (kis cheez pe) define karta hai.

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

Upar wali policy padho toh matlab: "yeh user EC2 instances aur security groups dekh sakta hai (Describe = read-only), aur ek specific S3 bucket (`my-bucket`) se files download kar sakta hai (GetObject)." Note karo — koi bhi jagah `Delete`, `Create`, `Terminate` jaisa action allow nahi kiya, matlab yeh purely **read-heavy** permission set hai.

> [!warning]
> `"Resource": "*"` matlab **saare** resources — yeh jitna broad utna hi risky. Production mein hamesha specific ARN (`arn:aws:s3:::my-bucket/*` jaisa) use karo, na ki wildcard `*`. Yeh waisa hi hai jaise Zomato delivery partner ko sirf uske assigned area ka access milna chahiye, poore shehar ka nahi.

### IAM Roles

Access keys hardcode karne ke bajaye services ke liye **Roles** use karna best practice hai — kyunki keys leak ho sakti hain (GitHub pe accidentally commit ho jaana common mistake hai), lekin role automatically rotate hoti rehti hai aur kabhi expose nahi hoti.

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

Yeh `trust-policy.json` batata hai ki **kaun** yeh role assume kar sakta hai — is case mein sirf EC2 service. Isko socho jaise ek delivery boy ka temporary access card jo sirf uske shift ke time active hai aur sirf uske designated area ke liye valid hai — permanent chabi nahi hai jo woh apne paas hamesha ke liye rakh le.

> [!tip]
> Node.js/TypeScript wale liye practical tip: agar tumhara app EC2 ya ECS/Lambda pe chal raha hai aur usko S3 ya DynamoDB access chahiye, toh AWS SDK ko access keys `.env` mein daalne ki zarurat hi nahi — bas usi service pe IAM Role attach kar do. SDK automatically role ke temporary credentials use kar lega (via Instance Metadata Service / IRSA). Yeh sabse secure aur clean approach hai.

### Root Account Security

Root account woh "master key" hai jisse tumne AWS account banaya tha — iski power unlimited hai, isliye isko daily use ke liye kabhi mat use karo.

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

Root account ko socho apne bank locker ki master chabi jaisa — usse tum daily transactions nahi karte, sirf emergency ya account-level settings ke liye rakhte ho. Roz ke kaam ke liye ek "admin user" banao (jaise ek trusted family member ko separate ATM card dena) aur us par bhi MFA laga do. Root ka password kahin safe jagah likh ke rakho, browser mein saved mat karo.

> [!warning]
> Agar root credentials leak ho jaayein, poora AWS account compromise ho sakta hai — koi bhi service delete kar sakta hai, billing badal sakta hai, poore infra ka access le sakta hai. MFA (Multi-Factor Authentication) enable karna root account ke liye **non-negotiable** hai, chahe chhota personal project hi kyun na ho.

---

## AWS CLI Setup

Kyun zaruri hai? AWS Console (browser wala UI) manual kaam ke liye theek hai, lekin DevOps ka poora point hi automation hai — scripts, CI/CD pipelines, Terraform sab AWS CLI ya SDK ke through baat karte hain. Isliye CLI setup karna first step hota hai kisi bhi AWS-based project mein.

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

`aws configure` chalane ke baad yeh 4 cheezein maangega. Yeh saari details do jagah save hoti hain:

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

`credentials` file mein secret keys hoti hain, `config` file mein regions/output-format jaisi non-sensitive settings. Dono files hamesha `.gitignore` mein hone chahiye agar kabhi project folder ke andar aa jaayein — accidentally commit ho jaana ek common aur costly mistake hai (GitHub pe secret keys leak hone se hackers ke bots turant unhe scan karke misuse kar lete hain).

### Multiple Profiles

Real duniya mein tumhare paas ek se zyada AWS accounts ho sakte hain — personal, company ka staging, company ka production. In sabko manage karne ke liye **profiles** use hote hain, jaise ek hi phone mein multiple UPI accounts (personal Paytm aur business GPay) rakhte ho aur switch karte rehte ho.

```bash
# Create named profile
aws configure --profile production

# Use profile
aws ec2 describe-instances --profile production

# Set default profile
export AWS_PROFILE=production
aws ec2 describe-instances  # Uses production profile
```

> [!warning]
> Multiple profiles use karte waqt sabse common galti yeh hoti hai — galat profile active hone par production resources pe accidentally command chala dena (jaise `terraform destroy` production profile pe chal jaye jab tumne socha staging pe hai). Hamesha `--profile` explicitly specify karo important commands mein, especially destructive operations ke liye.

### Environment Variables

CLI credentials ko override karne ka ek aur tarika environment variables hain — yeh CI/CD pipelines (GitHub Actions, Jenkins) mein bahut common hai kyunki wahan interactive `aws configure` chalana possible nahi hota.

```bash
# Override credentials
export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
export AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
export AWS_DEFAULT_REGION=us-west-2
export AWS_DEFAULT_OUTPUT=json

aws ec2 describe-instances
```

Priority order yaad rakho: environment variables > named profile > default profile. Isliye kabhi CLI command unexpected behave kare, sabse pehle check karo ki koi stale environment variable toh set nahi hai.

---

## VPC & Networking Basics

### VPC (Virtual Private Cloud)

Kya hota hai? VPC tumhara **apna private network** hai AWS ke andar — jaise ek gated society jisme tum decide karte ho kaun andar aa sakta hai, kaun nahi. AWS ke saare resources (EC2, RDS, etc.) is VPC ke andar rehte hain, aur tum control karte ho ki inter-communication kaise hogi aur internet se kaun expose hoga.

```
VPC: 10.0.0.0/16
├── Public Subnet: 10.0.1.0/24 (IGW attached)
│   └── NAT Gateway
├── Private Subnet: 10.0.2.0/24 (no IGW)
│   └── Instances access internet via NAT
└── Private Subnet: 10.0.3.0/24
    └── Database tier
```

Yeh diagram ek typical **3-tier architecture** dikhata hai:
- **Public Subnet** — jaise society ka main gate area, jahan Internet Gateway (IGW) attached hai, matlab yahan ke resources directly internet se reachable hain (jaise tumhara web server/load balancer).
- **Private Subnet (app tier)** — society ke andar ka residential area, koi direct internet access nahi (IGW attached nahi), lekin NAT Gateway ke through outbound internet access mil jaata hai (jaise update download karna) bina inbound traffic allow kiye.
- **Private Subnet (DB tier)** — sabse secure area, jaise society ka locker room — sirf app tier se hi access milta hai, bahar se koi direct connection nahi.

Isko IRCTC ke example se socho: booking website (public subnet mein) internet se accessible hai, backend processing servers (private subnet) sirf website se baat karte hain, aur database (sabse andar wala private subnet) sirf backend se — kabhi bhi seedha internet se database ka connection allow nahi karte, warna security disaster ho jaayega.

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

`10.0.0.0/16` ek CIDR block hai jo tumhe roughly 65,536 IP addresses deta hai VPC ke andar use karne ke liye. Har subnet is bade block ka ek chhota slice hota hai (`/24` matlab 256 addresses). Practically, subnet planning ek building ke floors allocate karne jaisa hai — pehle se decide kar lo kaun sa floor (subnet) kis purpose ke liye hai, taaki baad mein expand karna aasan ho.

> [!info]
> Har subnet ek specific Availability Zone se bandha hota hai (`--availability-zone us-east-1a`) — VPC khud region-level cheez hai lekin subnet AZ-level. High availability ke liye tumhe multiple AZs mein subnets banane padte hain.

### Default VPC

AWS har naye account mein automatically ek "Default VPC" bana deta hai taaki tum turant EC2 launch kar sako bina manually VPC configure kiye — jaise naya smartphone kharido toh usme kuch default apps pehle se installed hote hain, taaki turant use start kar sako.

```bash
# Every account has default VPC
aws ec2 describe-vpcs --filters "Name=isDefault,Values=true"

# Default VPC has:
# - Internet Gateway attached
# - Public subnets in each AZ
# - Route to 0.0.0.0/0 → IGW
```

> [!warning]
> Default VPC ke saare subnets **public** hote hain by default — matlab har resource directly internet-facing ho sakta hai agar tum dhyan nahi rakhoge. Serious production workload ke liye hamesha apna custom VPC banao proper public/private subnet separation ke saath, default VPC pe bharosa mat karo.

---

## Billing & Cost Management

### Pricing Models

Kyun zaruri hai? AWS ka billing model samajhna direct paison ki bachat hai. Galat pricing model choose karne se companies ko lakhon rupaye ka extra bill aa sakta hai — yeh utna hi important hai jitna code likhna.

| Model | Use Case | Savings |
|-------|----------|---------|
| **On-Demand** | Flexible, variable load | Baseline |
| **Reserved Instances** | Predictable, constant load | Up to 72% |
| **Spot Instances** | Fault-tolerant workloads | Up to 90% |
| **Savings Plans** | Mix of services | Up to 72% |

Indian analogy se samjho:
- **On-Demand** = Ola/Uber ka normal ride booking — jab chahiye tab book karo, per-use pay karo, no commitment. Flexible hai lekin sabse mehenga per-unit.
- **Reserved Instances** = jaise ek saal ka gym membership advance mein pay karna — agar tumhe pata hai ki poore saal use karoge, toh upfront commit karke bahut discount milta hai (72% tak!).
- **Spot Instances** = jaise last-minute train tickets tatkal se bhi sasta koi "standby" ticket, jisme risk hai ki agar zyada demand aa jaye toh tumhari seat cancel ho sakti hai kisi aur ko priority milne pe. Batch jobs, data processing, CI builds jaise fault-tolerant kaam ke liye perfect — agar beech mein interrupt bhi ho jaye toh retry kar sakte ho.
- **Savings Plans** = Reserved Instance jaisa hi commitment-based discount, lekin flexible — specific instance type lock nahi karna padta, poore compute usage pe apply hota hai.

### Reserved Instances

```bash
# Purchase 1-year reserved instance
aws ec2 purchase-reserved-instances-offering \
  --instance-count 1 \
  --reserved-instances-offering-id \
    bbbb0f7d-5e90-4f11-b9d8-025914846b54
```

### Cost Management

Bill surprise na aaye isliye AWS budgets aur cost explorer jaise tools use karo — jaise tum apne bank app mein spending alerts laga ke rakhte ho taaki overspend na ho jaye.

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

Yeh ek bahut common real-world mistake hai jo naye developers karte hain — dev/staging environment ko 24x7 chalate rehna, jabki raat ko koi use hi nahi kar raha. Isko socho jaise ghar ka AC din bhar chalate rehna jab koi ghar pe hai hi nahi — bas bijli ka bill badhta hai. Simple fix: dev/test instances ko raat 9 baje stop karo, subah 9 baje start karo — scheduled Lambda ya EventBridge rule se automate kar sakte ho. Isse mahine ka bill kaafi kam ho jaata hai.

> [!tip]
> "Right-sizing" ka matlab hai apni actual usage ke hisaab se instance size choose karna — bahut se log "safe side" rehne ke liye bade instance (jaise `m5.2xlarge`) le lete hain jabki `t3.medium` hi kaafi hota. CloudWatch metrics check karke dekho actual CPU/Memory usage kya hai, phir uske hisaab se downsize karo.

---

## AWS Best Practices

### 1. Least Privilege Access

Kya hota hai? "Least Privilege" ka matlab hai — har user/service ko **sirf utna hi access do jitna zaruri hai**, ek bhi extra permission nahi. Jaise ek company mein intern ko sirf uske project ka access diya jaata hai, poore company ka database access nahi.

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

Is policy mein dekho — user ko production instances **stop** karne ki permission hai (maybe on-call engineer ke liye emergency mein), lekin explicitly **terminate** karne se deny kiya gaya hai. Yeh smart design hai — stop se instance wapas start ho sakta hai, lekin terminate se data permanently delete ho jaata hai. Ek galti se `terminate` command chalne se poora production server gayab ho sakta hai — isliye destructive actions ko explicit `Deny` se block karna extra safety layer hai, sirf `Allow` na dena kaafi nahi hota kabhi kabhi.

### 2. Enable CloudTrail

Kya hota hai? CloudTrail AWS ka "CCTV camera" hai — yeh account mein hone wale **har API call ko log** karta hai: kisne, kab, kya kiya. Jaise CRED app mein tumhara har transaction history record hota hai, waise hi CloudTrail AWS mein har action ka audit trail rakhta hai.

```bash
# Log all API calls for audit
aws cloudtrail create-trail \
  --name my-trail \
  --s3-bucket-name my-bucket
```

Yeh security incident investigation ke liye critical hai — agar kabhi koi unexpected resource delete ho jaaye ya security breach ho, CloudTrail logs se pata chal jaata hai exactly kisne, kis IP se, kaunsa action liya. Bina CloudTrail ke, tumhare paas koi audit trail nahi hoga aur troubleshoot karna andhere mein teer chalane jaisa ho jaayega.

### 3. Use Tagging

Kya hota hai? Tags resources pe lagaye gaye labels hain — jaise Flipkart warehouse mein har package pe label lagta hai "kaunsa order, kis city ke liye, kaunsa department" — waise hi AWS resources pe tags lagate hain taaki organize aur track kar sako.

```bash
# Tag all resources for cost tracking
aws ec2 create-tags \
  --resources i-1234567890abcdef0 \
  --tags Key=Environment,Value=production \
         Key=Cost-Center,Value=engineering
```

Tagging ke bina, jab bill aata hai mahine ke end mein, pata hi nahi chalta kaunsa resource kis team ka hai, kaunsa environment (dev/staging/prod) kitna kharcha kar raha hai. `Environment` aur `Cost-Center` jaise tags lagane se cost reports mein clear breakdown milta hai — kaunsi team, kaunsa project kitna spend kar raha hai.

> [!tip]
> Team mein ek tagging policy zaroor define karo (jaise: har resource pe `Environment`, `Owner`, `Project` tag mandatory ho) — warna 6 mahine baad "yeh EC2 instance kiska hai, band kar sakte hain kya?" jaisa confusion aata rehta hai.

### 4. Enable MFA

Kya hota hai? MFA (Multi-Factor Authentication) matlab password ke saath ek extra verification layer — jaise UPI transaction mein PIN ke saath OTP bhi maangta hai. Sirf password se access hona risky hai, agar password leak ho jaaye toh attacker ko dusra barrier nahi milta.

```bash
# Require MFA for sensitive operations
aws iam put-user-policy \
  --user-name john \
  --policy-name MFARequired \
  --policy-document file://mfa-policy.json
```

Sensitive operations (jaise production resources delete karna, billing settings badalna) ke liye MFA condition wali policy laga sakte ho — matlab jab tak user ne MFA verify nahi kiya, woh yeh actions kar hi nahi payega chahe uske paas valid credentials ho.

### 5. Monitor with CloudWatch

Kya hota hai? CloudWatch AWS ka monitoring aur alerting system hai — jaise fitness tracker jo tumhare heart rate ko continuously monitor karta hai aur kuch abnormal ho toh alert bhejta hai, waise hi CloudWatch tumhare resources (CPU, memory, network) ko monitor karke threshold cross hone pe alarm bhejta hai.

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

Is example mein agar EC2 instance ka average CPU 5 minute (`period 300` seconds) ke window mein 80% se zyada chala jaaye, toh alarm trigger hoga. Isse tumhe pehle se pata chal jaata hai ki server overload ho raha hai, before it actually crashes — jaise Swiggy peak lunch time pe apne server load ko monitor karta hai taaki crash hone se pehle auto-scale kar sake.

---

## Key AWS Services

Yeh table ek quick-reference cheat sheet hai jo har DevOps engineer ko yaad honi chahiye — inme se zyada tar services aage ke chapters mein detail mein cover hongi.

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

Ek Node.js developer ke perspective se socho toh: `EC2`/`ECS` woh jagah hai jahan tumhara Express/NestJS app chalega, `RDS` tumhara PostgreSQL/MySQL managed database hai (khud server manage nahi karna padta), `S3` file uploads (images, PDFs) store karne ke liye, `Lambda` chhote independent functions ke liye jo sirf trigger hone pe chalte hain (jaise webhook handler), aur `CloudFront` static assets ko duniya bhar mein fast serve karne ke liye (CDN).

---

## Practical Example: Initial AWS Setup

Ab sab concepts ko ek saath jodte hain — yeh ek real-world script hai jo naye AWS account mein ek basic production-ready setup bana deta hai: VPC, subnet, internet gateway, security group, aur EC2 role — sab ek script mein automate.

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

Is script ka flow step-by-step samjho: pehle CLI configure hoti hai ek dedicated `prod` profile ke saath (isolation ke liye), phir VPC banta hai apna private network, uske andar ek subnet, phir Internet Gateway attach hota hai taaki subnet internet se connect ho sake, phir security group banta hai jo firewall jaisa kaam karega (sirf port 80 aur 443 — HTTP/HTTPS — allow karta hai, baaki sab band), aur last mein EC2 ke liye ek Role bana di jaati hai taaki instance ko permanent access keys na deni padein.

> [!warning]
> `--cidr 0.0.0.0/0` matlab **duniya ka koi bhi IP address** — is script mein sirf port 80/443 (web traffic) ke liye theek hai, lekin agar kabhi SSH port (22) ke liye `0.0.0.0/0` use kar diya, toh poori duniya se koi bhi tumhare server pe login attempt kar sakta hai. SSH access ko hamesha apne office/VPN ke specific IP range tak restrict karo.

---

## Key Takeaways

- **Regions** independent AWS deployments hain — user ki location, compliance requirement aur cost dekh ke choose karo.
- **Availability Zones** ek region ke andar physically-separate data centers hain — production workload ko hamesha multi-AZ mein deploy karo high availability ke liye.
- **IAM** poore AWS security ka foundation hai — Users, Groups, Roles, Policies samajh ke "Least Privilege" principle follow karo, kabhi `Resource: "*"` jaisi broad permission mat do.
- Services ke liye hamesha **IAM Roles** use karo, hardcoded access keys nahi — leak hone ka risk khatam ho jaata hai.
- **Root account** ko daily use ke liye kabhi mat use karo — MFA laga ke lock kar do, admin user se kaam chalao.
- **AWS CLI** automation ka backbone hai — profiles aur environment variables se multiple accounts manage karo, lekin production profile pe destructive command chalate waqt double-check karo.
- **VPC** tumhara private network hai — public/private subnet separation se security ki layers banao (public-facing web tier, private app tier, private DB tier).
- **Pricing models** samajh ke sahi choose karo — On-Demand (flexible), Reserved (predictable baseline), Spot (fault-tolerant batch jobs), Savings Plans (mix).
- Cost control ke liye **tagging, right-sizing, aur scheduling** (dev/test raat ko band karna) sabse zyada impact wale simple steps hain.
- **CloudTrail** (audit logs) aur **CloudWatch** (monitoring/alarms) dono production account mein day-1 se enable hone chahiye — bina inke troubleshooting andhere mein teer chalana hoga.

Next: [EC2 Essentials](./02_ec2_essentials.md) - virtual machines on AWS
