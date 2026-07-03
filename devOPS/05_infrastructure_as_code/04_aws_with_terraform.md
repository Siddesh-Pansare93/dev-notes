# AWS with Terraform

Ab tak humne Terraform ke basics dekh liye — resources, variables, state waghera. Ab time hai isko real duniya mein use karne ka. Socho tumhe Flipkart jaisa ek e-commerce app deploy karna hai AWS pe — usko ek VPC chahiye (apna private network), EC2/ECS instances chahiye (jahan app chalega), RDS database chahiye (order, user data store karne ke liye), aur ek load balancer chahiye (traffic ko sahi jagah bhejne ke liye). Yeh sab manually AWS console mein click-click karke banana — ek to boring hai, dusra error-prone hai, aur sabse bada issue: agar tumhe wahi setup staging environment mein bhi chahiye, to tumhe sab kuch dubara click karna padega. Terraform yahi problem solve karta hai — puri infrastructure ko code mein likh do, aur ek command se replicate kar do jitni baar chahiye.

Is file mein hum ek complete, production-jaisa AWS setup dekhenge — VPC + EC2 + RDS + ECS — sab Terraform code ke through.

> [!info]
> Yeh IRCTC ka tatkal booking system samjho — jab tak infra ready nahi hoga (VPC, servers, DB), booking engine chalega hi nahi. Terraform se hum poora "ghar" bana rahe hain jisme baad mein "furniture" (application code) rakha jayega.

## Complete Example: VPC + EC2 + RDS + ECS

### Kya ho raha hai is file mein?

Yeh `main.tf` file poore infrastructure ka blueprint hai. Isko ek building ka naksha samjho — architect (tum) pehle kaagaz pe decide karta hai ki foundation kahan hogi, walls kahan honge, electricity ka connection kaise aayega — uske baad hi construction shuru hota hai. Terraform mein bhi wahi hota hai: pehle `.tf` files mein sab define karo, phir `terraform apply` chalao aur AWS pe actual resources ban jaate hain.

```hcl
# main.tf

terraform {
  backend "s3" {
    bucket         = "terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC Module
module "vpc" {
  source = "./modules/vpc"

  vpc_name           = "${var.environment}-vpc"
  cidr_block         = var.vpc_cidr
  public_subnets    = var.public_subnets
  private_subnets   = var.private_subnets
}

# Security Groups
resource "aws_security_group" "alb" {
  name   = "${var.environment}-alb-sg"
  vpc_id = module.vpc.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# RDS Database
resource "aws_rds_cluster" "main" {
  cluster_identifier      = "${var.environment}-db"
  engine                  = "aurora-postgresql"
  engine_version          = "15.2"
  database_name           = var.db_name
  master_username         = var.db_username
  master_password         = var.db_password
  db_subnet_group_name    = aws_db_subnet_group.main.name
  vpc_security_group_ids  = [aws_security_group.db.id]
  backup_retention_period = 30
  multi_az                = true

  depends_on = [module.vpc]
}

# ALB
resource "aws_lb" "main" {
  name               = "${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = module.vpc.public_subnet_ids

  enable_deletion_protection = true
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.environment}-cluster"
}

# Auto Scaling
resource "aws_autoscaling_group" "ecs" {
  name                = "${var.environment}-asg"
  vpc_zone_identifier = module.vpc.private_subnet_ids
  min_size            = var.ecs_min_size
  max_size            = var.ecs_max_size
  desired_capacity    = var.ecs_desired_capacity
  launch_template {
    id      = aws_launch_template.ecs.id
    version = "$Latest"
  }
}
```

Chalo isko piece-by-piece samajhte hain, kyunki ek saath dekhne se yeh overwhelming lag sakta hai.

### 1. Backend block — state kahan store hoga?

```hcl
terraform {
  backend "s3" {
    bucket         = "terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
  }
}
```

Yaad hai humne pichli file mein baat ki thi ki Terraform apna state ek `.tfstate` file mein rakhta hai jisme yeh track hota hai "kya-kya bana hai"? Agar yeh state file sirf tumhare laptop pe padi rahi, to jaise hi tumhare teammate ne bhi `terraform apply` chalaya, dono ka state alag-alag ho jayega aur chaos ho jayega — jaise do log ek hi Excel sheet ko offline edit karke baad mein merge karne ki koshish karein.

Isliye state ko S3 bucket (remote, shared storage) mein rakha jaata hai, taaki team ka har banda same "source of truth" dekhe. Aur `dynamodb_table = "terraform-locks"` ek locking mechanism hai — jaise Swiggy ke ek hi delivery order ko do riders simultaneously accept na kar payein, waise hi DynamoDB lock ensure karta hai ki ek waqt mein sirf ek hi `terraform apply` chal sake. Agar do log ek saath apply karne ki koshish karein, to dusre ko "state locked hai, wait karo" wala error milega.

> [!warning]
> Agar tum yeh backend config skip karte ho, to Terraform default se state ko local machine pe (`terraform.tfstate` file mein) store karta hai. Solo learning ke liye theek hai, lekin team/production setup mein yeh ek badi galti hai — kabhi bhi state file ko git mein commit mat karo (usme secrets bhi ho sakte hain), aur hamesha remote backend use karo.

### 2. Provider block

```hcl
provider "aws" {
  region = var.aws_region
}
```

Yeh batata hai Terraform ko "bhai, AWS ke saath kaam karna hai, aur is region mein karna hai." `var.aws_region` ek variable hai jiski value hum baad mein `variables.tf` mein define karenge — hardcode nahi kar rahe, taaki alag environments (dev, staging, prod) ke liye alag region use kar sakein bina code change kiye.

### 3. VPC Module — networking ka foundation

```hcl
module "vpc" {
  source = "./modules/vpc"

  vpc_name           = "${var.environment}-vpc"
  cidr_block         = var.vpc_cidr
  public_subnets    = var.public_subnets
  private_subnets   = var.private_subnets
}
```

**Kya hota hai VPC?** VPC (Virtual Private Cloud) tumhara apna isolated network hai AWS ke andar — jaise ek gated society jisme sirf tumhare resources (EC2, RDS, ECS) rehte hain, bahar ki duniya se directly connect nahi ho sakte jab tak tum explicitly allow na karo.

Yahan `module` block use ho raha hai — matlab hum poori VPC-banane-wali logic ko ek alag folder (`./modules/vpc`) mein rakh ke, usko yahan se sirf "call" kar rahe hain, apne values (naam, CIDR range, subnets) pass karke. Yeh exactly waise hai jaise tum Node.js mein ek reusable function likhte ho aur usko different parameters ke saath baar-baar call karte ho — copy-paste karne ki zaroorat nahi.

`public_subnets` aur `private_subnets` ka concept samajhna zaroori hai:
- **Public subnet** = wo hissa jahan internet se directly access ho sakta hai (jaise tumhara Load Balancer — jise users hit karte hain).
- **Private subnet** = wo hissa jo internet se directly accessible nahi hai (jaise tumhara database ya internal app servers). Yeh security ke liye hai — koi bhi random banda directly tumhare RDS database ko internet se nahi khol sakta.

Socho isko Ola/Uber ke office jaisa — reception area (public) jahan koi bhi walk-in kar sakta hai, aur server room (private) jahan sirf authorized log jaa sakte hain, wo bhi ek gate/security check ke through.

### 4. Security Group — firewall rules

```hcl
resource "aws_security_group" "alb" {
  name   = "${var.environment}-alb-sg"
  vpc_id = module.vpc.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

**Security Group kya hai?** Ek virtual firewall jo control karta hai kaun-sa traffic andar aa sakta hai (ingress) aur kaun-sa bahar jaa sakta hai (egress).

Yahan hum Load Balancer (ALB) ke liye ek security group bana rahe hain jo:
- Port `80` (HTTP) pe traffic allow karta hai `0.0.0.0/0` se — matlab poori duniya se koi bhi is port pe hit kar sakta hai.
- Port `443` (HTTPS) pe bhi same — encrypted traffic ke liye.
- `egress` mein `protocol = "-1"` aur `from_port/to_port = 0` ka matlab hai "sab kuch allow hai bahar jaane ke liye" — koi restriction nahi.

Yeh bilkul CRED ya Paytm jaise apps ka soch — front door (port 80/443) sabke liye khula hai taaki customers request bhej sakein, lekin andar ke rooms (database, internal services) sirf specific logon ke liye accessible hain.

> [!tip]
> `module.vpc.vpc_id` dekha? Yeh module ka **output** use kar raha hai. Modules apne andar ke resources ke IDs ko "output" ke through bahar expose karte hain, taaki baaki resources unhe reference kar sakein. Yeh bilkul function se return value lene jaisa hai.

### 5. RDS Cluster — database

```hcl
resource "aws_rds_cluster" "main" {
  cluster_identifier      = "${var.environment}-db"
  engine                  = "aurora-postgresql"
  engine_version          = "15.2"
  database_name           = var.db_name
  master_username         = var.db_username
  master_password         = var.db_password
  db_subnet_group_name    = aws_db_subnet_group.main.name
  vpc_security_group_ids  = [aws_security_group.db.id]
  backup_retention_period = 30
  multi_az                = true

  depends_on = [module.vpc]
}
```

Yeh AWS Aurora PostgreSQL database cluster bana raha hai — matlab tumhara managed Postgres DB jisme Zomato-jaisa app apna order data, user data, restaurant data store kar sakta hai.

Kuch important cheezein notice karo:
- `backup_retention_period = 30` — 30 din tak automatic backups store honge. Agar kal koi galti se production data delete kar de, to tum 30 din tak ke kisi bhi din ka backup restore kar sakte ho. Yeh bilkul WhatsApp ke chat backup jaisa hai — agar phone kho jaaye, purana backup se restore kar lo.
- `multi_az = true` — matlab database do (ya zyada) Availability Zones mein replicate hoga. Agar ek data center mein power failure ya koi disaster ho jaaye, dusra automatically takeover kar lega. Yeh production ke liye non-negotiable hai — bina iske, ek single point of failure ban jaata hai.
- `master_password = var.db_password` — yeh password ek variable se aa raha hai, hardcoded nahi hai. Hum aage dekhenge ki isko `sensitive = true` maarke Terraform ke logs mein bhi hide kiya jaata hai.
- `depends_on = [module.vpc]` — yeh explicitly Terraform ko batata hai "pehle VPC completely ban jaaye, tabhi database banao." Normally Terraform khud hi dependency graph samajh leta hai (jaise agar tum `module.vpc.vpc_id` reference karte ho), lekin kabhi-kabhi explicit `depends_on` zaroori hota hai jab dependency implicit na ho.

> [!warning]
> Real production mein kabhi bhi password ko tfvars file mein plain text mein mat likho jo git mein commit ho sakti hai. Iske liye AWS Secrets Manager ya HashiCorp Vault use karo, aur Terraform usse dynamically fetch kare. Yeh example simplicity ke liye plain variable use kar raha hai, lekin real duniya mein yeh galti mehengi pad sakti hai.

### 6. Application Load Balancer (ALB)

```hcl
resource "aws_lb" "main" {
  name               = "${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = module.vpc.public_subnet_ids

  enable_deletion_protection = true
}
```

**Load Balancer kya karta hai?** Socho Swiggy pe ek saath 10,000 log order kar rahe hain. Agar sab requests ek hi server pe jaayein, wo server crash ho jayega. Load Balancer ek traffic police ki tarah kaam karta hai — incoming requests ko multiple servers (ECS tasks) mein evenly distribute karta hai, taaki koi ek server overload na ho.

`internal = false` ka matlab hai yeh internet-facing hai — public users isse access kar sakte hain. `enable_deletion_protection = true` ek safety switch hai — koi galti se `terraform destroy` chala de to bhi yeh ALB accidentally delete nahi hoga, pehle explicitly protection off karni padegi.

### 7. ECS Cluster — container orchestration

```hcl
resource "aws_ecs_cluster" "main" {
  name = "${var.environment}-cluster"
}
```

ECS (Elastic Container Service) AWS ka apna container orchestration solution hai — Kubernetes jaisa hi kaam karta hai lekin AWS-native. Yeh cluster basically ek logical grouping hai jahan tumhare Docker containers (jo tumhara actual application code chala rahe hain) run honge.

### 8. Auto Scaling Group — demand ke hisaab se scale karna

```hcl
resource "aws_autoscaling_group" "ecs" {
  name                = "${var.environment}-asg"
  vpc_zone_identifier = module.vpc.private_subnet_ids
  min_size            = var.ecs_min_size
  max_size            = var.ecs_max_size
  desired_capacity    = var.ecs_desired_capacity
  launch_template {
    id      = aws_launch_template.ecs.id
    version = "$Latest"
  }
}
```

**Kyun zaruri hai yeh?** Socho IRCTC ka tatkal booking window subah 10 baje khulta hai — us waqt traffic 100x badh jaata hai normal se. Agar tum hamesha peak-traffic ke hisaab se fixed servers rakhoge, to baaki 23 ghante wo extra servers bekaar mein paise kha rahe honge. Auto Scaling Group isi problem ko solve karta hai — jab traffic badhta hai, automatically naye servers spin up ho jaate hain (max `ecs_max_size` tak), aur jab traffic kam ho jaata hai, extra servers automatically band ho jaate hain (min `ecs_min_size` tak). Matlab tum sirf utna hi pay karte ho jitni zarurat hai.

`launch_template` batata hai naye server kis "template" (AMI, instance type, configuration) se banenge.

## Variables & Outputs

Ab jo values humne upar `var.xyz` ke through use ki thi, unko define karna padega. Yeh Terraform ka "input/output" mechanism hai.

```hcl
# variables.tf
variable "aws_region" {
  default = "us-east-1"
}

variable "environment" {
  type = string
}

variable "vpc_cidr" {
  type = string
}

variable "db_password" {
  type      = string
  sensitive = true
}

# outputs.tf
output "alb_dns" {
  value = aws_lb.main.dns_name
}

output "db_endpoint" {
  value = aws_rds_cluster.main.endpoint
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}
```

**Variables kya hote hain?** Function parameters jaise samjho. Jaise tum JavaScript mein `function deployApp(environment, region) {...}` likhte ho, waise hi Terraform mein `variable` block define karke tum apne infrastructure code ko reusable banate ho. Aaj `prod` ke liye chalao, kal `staging` ke liye — code same rahega, sirf values badlengi.

Kuch cheezein dhyan do:
- `variable "aws_region" { default = "us-east-1" }` — agar koi value nahi di gayi, to yeh default use hoga.
- `variable "environment" { type = string }` — koi default nahi hai, matlab yeh **mandatory** hai, deploy karte waqt explicitly deni hi padegi.
- `variable "db_password" { type = string, sensitive = true }` — yeh `sensitive = true` bahut important hai. Isse Terraform apne plan/apply output logs mein is value ko `(sensitive value)` dikhayega, actual password nahi. Yeh CI/CD logs mein accidentally password leak hone se bachata hai.

**Outputs kya hote hain?** Function ka return value samjho. `terraform apply` complete hone ke baad, Terraform tumhe yeh values print karke dikhayega — jaise ALB ka DNS name (jispe app accessible hoga), DB ka endpoint (jisse app connect karega), aur ECS cluster ka naam. Yeh especially useful hai jab tumhara CI/CD pipeline in values ko automatically pick karke agle step (jaise DNS record banane ya app deploy karne) mein use karta hai.

> [!tip]
> Outputs ko `terraform output` command se kabhi bhi dobara dekh sakte ho, bina dobara apply kiye. Aur `terraform output -json` se JSON format mein bhi nikal sakte ho — scripts mein use karne ke liye kaafi handy hai.

## Deployment

Ab actual deployment ka process dekhte hain — sab kuch code mein likh diya, ab isse asal mein AWS pe chalana hai.

```bash
# Create tfvars file
cat > prod.tfvars <<EOF
environment       = "prod"
vpc_cidr          = "10.0.0.0/16"
public_subnets   = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnets  = ["10.0.11.0/24", "10.0.12.0/24"]
db_name           = "myapp"
db_username       = "admin"
db_password       = "SecurePassword123!"
ecs_min_size      = 1
ecs_desired_capacity = 3
ecs_max_size      = 10
EOF

# Apply
terraform init
terraform plan -var-file=prod.tfvars
terraform apply -var-file=prod.tfvars
```

Yeh teen steps hain jo har baar follow karne hain:

1. **`prod.tfvars`** — yeh file un saari mandatory variables ki actual values rakhti hai jo hum production environment ke liye use karna chahte hain. Isko environment-specific config samjho — jaise `.env.production` file Node.js apps mein hoti hai. Agar staging ke liye deploy karna ho, to `staging.tfvars` bana lo alag values ke saath.

2. **`terraform init`** — yeh pehli baar chalate waqt zaroori hai. Yeh providers (jaise AWS provider) aur modules ko download karta hai, aur backend (S3 state) ko initialize karta hai. Isko `npm install` jaisa samjho — pehle dependencies laani padti hain kaam shuru karne se pehle.

3. **`terraform plan -var-file=prod.tfvars`** — yeh **dry-run** hai. Terraform batayega "yeh-yeh cheezein banengi, yeh-yeh badlengi, yeh-yeh delete hongi" — bina actually kuch kiye. Bilkul jaise Ola app pe booking confirm karne se pehle tumhe fare aur route dikhata hai — commit karne se pehle review karne ka mauka.

4. **`terraform apply -var-file=prod.tfvars`** — yeh actual changes AWS pe lagayega. Terraform tumse ek baar confirm karega (`yes` type karna padega) phir resources create/update/delete karega.

> [!warning]
> Production mein kabhi bhi seedhe `terraform apply` mat chalao bina `plan` dekhe. Ek chhoti si galti — jaise ek variable ka typo — poore database ko accidentally recreate kar sakti hai (matlab data loss!). Hamesha `plan` ka output carefully padho, especially un lines ko jo "-/+ destroy and recreate" bolti hain.

> [!info]
> CI/CD pipeline mein yeh commands automate ho jaate hain — jaise GitHub Actions workflow mein `terraform plan` PR pe comment ban ke aata hai review ke liye, aur `main` branch pe merge hone ke baad `terraform apply` automatically chal jaata hai.

### Common Gotchas

Kuch mistakes jo naye log aksar karte hain:

- **State file ko git mein commit karna** — isme sensitive data (jaise database password) plain text mein ho sakta hai. Hamesha `.tfstate*` ko `.gitignore` mein daalo aur remote backend use karo.
- **`terraform apply` bina `plan` dekhe** — jaise upar bataya, production mein risky hai.
- **Hardcoded values (jaise `"us-east-1"`, `"10.0.0.0/16"`)** seedhe resource blocks mein likhna instead of variables — isse reusability khatam ho jaati hai.
- **Multiple logon ka simultaneously apply karna** bina state locking ke — race conditions aur corrupted state ho sakta hai. Isliye DynamoDB lock table zaroori hai.
- **`db_password` jaisi sensitive values ko tfvars mein plain rakhna** — production mein AWS Secrets Manager ya environment variables (`TF_VAR_db_password`) use karo.
- **`enable_deletion_protection` bhool jaana** critical resources (ALB, RDS) pe — ek galat `terraform destroy` poora production down kar sakta hai.

## Key Takeaways

- **VPC** poore infrastructure ka networking foundation hai — public subnet (internet-facing, jaise ALB) aur private subnet (internal, jaise DB, ECS tasks) mein divide hota hai.
- **Security Groups** virtual firewalls hain jo control karte hain kaun andar aa sakta hai aur kaun bahar jaa sakta hai.
- **Modules** resources ko reusable, organized blocks mein pack karte hain — jaise functions code mein.
- **Variables** infrastructure code ko flexible banate hain, alag-alag environments (dev/staging/prod) ke liye same code reuse karne dete hain; `sensitive = true` secrets ko logs mein hide karta hai.
- **Outputs** important values (DNS names, DB endpoints) ko expose karte hain jo baad mein use ho sakte hain (CI/CD pipelines, dusre modules).
- **Remote state (S3 + DynamoDB lock)** team collaboration ke liye zaroori hai — consistency aur race-condition-free applies ensure karta hai.
- **tfvars files** se environment-specific configuration manage hota hai bina core `.tf` code ko touch kiye.
- **`terraform plan` hamesha `apply` se pehle chalao** — production mein galtiyan mehengi padti hain, "measure twice, cut once" wala rule follow karo.
- **Auto Scaling** aur **Multi-AZ RDS** jaisi cheezein high-availability aur cost-efficiency dono ensure karti hain — demand ke hisaab se scale, aur disaster ke against protection.

Next: [Terraform State Management](./05_terraform_state_management.md)
