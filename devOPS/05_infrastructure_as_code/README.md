# Infrastructure as Code - Terraform & CloudFormation

Socho ek second ke liye — tumhe production mein ek naya VPC, do EC2 instances, ek RDS database aur S3 bucket chahiye. Ab do options hain: AWS console mein jaake click-click-click karke sab kuch manually banao, ya phir ek code file likho jisme sab kuch define ho, aur ek command run karo — poori infrastructure khadi ho jaayegi. Yeh doosra approach hi hai **Infrastructure as Code (IaC)**.

Yeh bilkul waise hai jaise Swiggy/Zomato apna restaurant onboarding process manually spreadsheet mein maintain karne ke bajaye ek automated system se karta hai — ek baar template bana do, phir jitni baar chaho utne restaurants onboard karo, bina galti kiye, bina kisi step ko bhoole. IaC bhi yehi karta hai infrastructure ke liye — ek baar "template" (code) likho, aur jab chaho wahi infrastructure kahin bhi, kितnी bhi baar, exactly waise hi spin up kar do.

## Kyun zaruri hai IaC?

Manually infrastructure banane mein kaafi problems aati hain:

- **Human error**: Console mein click karte waqt galti se galat security group attach ho gaya, ya wrong region select ho gaya — aur pata tab chala jab production down ho gaya.
- **No version history**: Kal kisne kaunsa setting change kiya, kyun kiya — iska koi record nahi hota. Jaise bina Git ke code likhna.
- **Environment drift**: Dev, staging aur prod environments dheere-dheere ek dusre se alag ho jaate hain kyunki har jagah manually banaya gaya tha.
- **Scaling ek nightmare ban jaata hai**: Agar tumhe 50 servers chahiye same config ke saath, console mein 50 baar wahi steps repeat karna insane hai.

IaC in sab problems ko solve karta hai — infrastructure ek **code file** ban jaati hai jo Git mein version-controlled hoti hai, review ho sakti hai (PR ke through), aur ek command se deploy/destroy ho sakti hai. Bilkul CRED ya PhonePe jaise fintech companies apne infra changes ko bhi code review process se guzarte hain — kyunki ek galat firewall rule production le doob sakta hai.

> [!tip]
> IaC ka sabse bada fayda hai **reproducibility**. Agar tumhara staging environment crash ho jaaye, tum literally ek command se usse dobara bilkul waisa hi khada kar sakte ho jaisa pehle tha — koi guesswork nahi.

## Topics Covered

### 1. IaC Concepts - Infrastructure as Code, declarative vs imperative

**Kya hota hai?** Do tarah se infrastructure define kar sakte ho:

- **Imperative**: Tum step-by-step batate ho "yeh karo, phir yeh karo, phir yeh karo" — jaise ek recipe follow karna. Example: bash script jo `aws ec2 run-instance` command chalata hai, phir security group attach karta hai, phir elastic IP jodta hai.
- **Declarative**: Tum sirf batate ho "mujhe end mein yeh chahiye" — HOW ka logic tool khud figure out karta hai. Example: Terraform mein tum likhte ho "mujhe ek t2.micro EC2 instance chahiye is AMI ke saath" — Terraform khud decide karta hai ki isse kaise banaye, kya already exist karta hai to kya change karna hai.

Zomato ka order karna socho — imperative matlab tum kitchen ko step by step batao "pehle dal garam karo, phir chawal nikaalo, phir plate mein daalo". Declarative matlab tum bas order karo "mujhe dal chawal chahiye" — kitchen (Terraform) khud decide karta hai kaise banana hai. Zyadatar modern IaC tools (Terraform, CloudFormation, Pulumi) declarative approach follow karte hain kyunki yeh zyada predictable aur maintainable hai.

### 2. Terraform Basics - HCL, providers, resources, state files

**Kya hota hai?** Terraform HashiCorp ka open-source tool hai jo multi-cloud IaC ke liye use hota hai (AWS, Azure, GCP, sab support karta hai — ek hi tool se).

- **HCL (HashiCorp Configuration Language)**: Terraform ki apni configuration language hai, JSON jaisi lekin human-friendly.
- **Provider**: Yeh batata hai Terraform ko kis cloud/service se baat karni hai (`aws`, `google`, `azurerm`, etc.)
- **Resource**: Actual infrastructure ka piece jo banana hai — EC2 instance, S3 bucket, VPC, etc.
- **State file** (`terraform.tfstate`): Terraform ki "memory" — isme record rehta hai ki kya-kya banaya gaya hai aur unki current configuration kya hai. Yeh file bahut critical hai — agar yeh corrupt ho jaaye ya lost ho jaaye, Terraform ko pata hi nahi chalega ki real world mein kya exist karta hai.

```hcl
# provider.tf
provider "aws" {
  region = "ap-south-1"  # Mumbai region
}

# main.tf
resource "aws_instance" "web_server" {
  ami           = "ami-0abcdef1234567890"
  instance_type = "t2.micro"

  tags = {
    Name = "MyWebServer"
  }
}
```

`terraform init` → providers download karta hai, `terraform plan` → dikhata hai kya change hoga (bina apply kiye), `terraform apply` → actually resources create/update karta hai.

> [!warning]
> State file mein sensitive data (jaise database passwords) plain text mein ho sakta hai. Isko kabhi bhi Git mein commit mat karo — `.gitignore` mein `*.tfstate` add karo, aur remote backend use karo (niche discuss karenge).

### 3. Terraform Modules - Reusable modules, input variables, outputs

**Kyun zaruri hai?** Socho tumhe dev, staging aur production — teeno environments mein same VPC structure chahiye, bas thoda different sizing ke saath. Har jagah same code copy-paste karna maintenance ka nightmare hai — kal agar VPC config mein change karna ho to teeno jagah manually update karna padega.

Yahi problem **Modules** solve karte hain — yeh Terraform ka reusable "function" hai. Ek module banao (jaise "vpc" module), aur usse dev/staging/prod teeno mein alag-alag input variables ke saath reuse karo.

```hcl
# modules/vpc/main.tf
variable "environment" {
  type = string
}

variable "cidr_block" {
  type = string
}

resource "aws_vpc" "main" {
  cidr_block = var.cidr_block
  tags = {
    Name = "vpc-${var.environment}"
  }
}

output "vpc_id" {
  value = aws_vpc.main.id
}
```

```hcl
# root main.tf - module ko call karna
module "dev_vpc" {
  source      = "./modules/vpc"
  environment = "dev"
  cidr_block  = "10.0.0.0/16"
}

module "prod_vpc" {
  source      = "./modules/vpc"
  environment = "prod"
  cidr_block  = "10.1.0.0/16"
}
```

Isko aise socho — jaise ek npm package banate ho jo tumhare multiple projects mein reuse hota hai, bas yahan yeh infrastructure ke liye hai. Terraform Registry pe hazaaron pre-built modules bhi available hain (jaise npm registry) jo community ne bana rakhe hain — VPC, EKS cluster, RDS setup — sab ready-made mil jaate hain.

### 4. AWS with Terraform - VPC, EC2, RDS, S3 with Terraform

Ab actual real-world AWS resources banayenge Terraform se:

- **VPC (Virtual Private Cloud)**: Tumhara apna isolated network AWS ke andar — subnets, route tables, internet gateway sab isi ke andar aate hain.
- **EC2**: Virtual machines jahan tumhara application chalega.
- **RDS**: Managed database service (Postgres, MySQL, etc.) — AWS backup, patching, replication khud handle karta hai.
- **S3**: Object storage — static files, backups, logs store karne ke liye.

```hcl
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_subnet" "public" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.1.0/24"
}

resource "aws_db_instance" "postgres" {
  identifier        = "myapp-db"
  engine            = "postgres"
  instance_class    = "db.t3.micro"
  allocated_storage = 20
  username          = "admin"
  password          = var.db_password  # sensitive - variable se lo, hardcode mat karo
  skip_final_snapshot = true
}

resource "aws_s3_bucket" "app_assets" {
  bucket = "myapp-static-assets-prod"
}
```

Yeh IRCTC ke tatkal booking system jaisa socho — poore infra ka ek blueprint hai jisme VPC ek building hai, subnets uske floors hain, EC2 instances employees hain jo kaam kar rahe hain, aur RDS wo central record room hai jahan sab data safe rehta hai.

> [!warning]
> Database password ya koi bhi secret kabhi bhi `.tf` file mein hardcode mat karo. `terraform.tfvars` file use karo (aur usko bhi `.gitignore` mein daalo), ya AWS Secrets Manager / SSM Parameter Store se fetch karo.

### 5. Terraform State Management - Remote state, S3 backend, state locking

**Problem**: Agar tum solo developer ho to local `.tfstate` file chalegi. Lekin team mein kaam karte waqt — do log agar ek saath `terraform apply` chala den, dono ke paas apna-apna local state file hoga jo out-of-sync ho jaayega. Ek ka change dusre ko pata hi nahi chalega, aur resources duplicate ban sakte hain ya conflict ho sakta hai.

**Solution**: **Remote state** — state file ko ek shared, central location pe rakho (jaise S3 bucket), taaki poori team same state dekhe aur use kare.

```hcl
terraform {
  backend "s3" {
    bucket         = "myapp-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "ap-south-1"
    dynamodb_table = "terraform-locks"  # state locking ke liye
    encrypt        = true
  }
}
```

**State locking**: DynamoDB table ka use karke Terraform ensure karta hai ki ek time pe sirf ek hi `apply` chal sake. Bilkul IRCTC ki tatkal booking jaisa — jab ek user seat book kar raha hai, dusre ko wo seat lock dikhti hai jab tak pehla transaction complete na ho jaaye. Isse race conditions aur state corruption dono avoid hote hain.

> [!tip]
> Team mein kaam karte ho to remote backend + state locking **non-negotiable** hai. Warna ek din do engineers ka simultaneous apply tumhara production state file corrupt kar dega.

### 6. Terraform Workspaces - Environments (dev, staging, prod)

**Kya hota hai?** Workspaces ek hi Terraform configuration ko multiple environments (dev, staging, prod) ke liye use karne ka tareeka hai, bina code duplicate kiye — har workspace ka apna alag state file hota hai.

```bash
terraform workspace new dev
terraform workspace new staging
terraform workspace new prod

terraform workspace select dev
terraform apply   # sirf dev environment affect hoga

terraform workspace select prod
terraform apply   # sirf prod environment affect hoga
```

Code ke andar current workspace ko refer kar sakte ho:

```hcl
resource "aws_instance" "app" {
  instance_type = terraform.workspace == "prod" ? "t3.large" : "t2.micro"
  tags = {
    Environment = terraform.workspace
  }
}
```

Isko socho jaise Ola/Uber ka same app code — bas alag configuration ke saath alag city mein deploy hota hai. Ek hi codebase, different environment-specific settings.

> [!warning]
> Workspaces sirf same infrastructure ko different environments mein replicate karne ke liye achhe hain jab structure same ho, size alag ho. Agar dev aur prod ka structure hi fundamentally alag hai (jaise prod mein multi-AZ setup hai, dev mein nahi), to separate directories/modules use karna better practice hai — kaafi teams isi wajah se workspaces ke bajaye separate `.tfvars` files ya alag directories prefer karti hain.

### 7. CloudFormation Basics - AWS native IaC, templates, stacks

**Kya hota hai?** CloudFormation AWS ka apna native IaC tool hai — Terraform ki tarah hi, bas sirf AWS ke liye (multi-cloud support nahi hai). YAML ya JSON mein templates likhte ho.

```yaml
AWSTemplateFormatVersion: "2010-09-09"
Description: Simple EC2 instance

Resources:
  MyWebServer:
    Type: AWS::EC2::Instance
    Properties:
      InstanceType: t2.micro
      ImageId: ami-0abcdef1234567890
      Tags:
        - Key: Name
          Value: MyWebServer

Outputs:
  InstanceId:
    Value: !Ref MyWebServer
```

Deploy karne ke liye:

```bash
aws cloudformation create-stack \
  --stack-name my-web-server-stack \
  --template-body file://template.yaml
```

**Terraform vs CloudFormation** — kaunsa use karein?

| | Terraform | CloudFormation |
|---|---|---|
| Cloud support | Multi-cloud (AWS, GCP, Azure) | Sirf AWS |
| Language | HCL | YAML/JSON |
| State management | Khud manage karna padta hai (S3 backend) | AWS khud manage karta hai |
| Community modules | Bahut bada ecosystem (Registry) | AWS-specific, chhota ecosystem |
| Learning curve | Thoda alag syntax seekhna padta hai | AWS wale ke liye familiar |

Agar tum sirf AWS use kar rahe ho aur AWS ecosystem mein hi deeply invested ho, CloudFormation ek solid choice hai kyunki state management ka tension nahi lena padta. Lekin agar multi-cloud ya future flexibility chahiye, Terraform industry standard hai — zyada jobs, zyada community support, zyada tools (Terragrunt, Atlantis, etc.) iske around bane hain.

## Prerequisites

- AWS account aur AWS CLI configured
- AWS services ki basic samajh (EC2, VPC, RDS, S3) — agar yeh naye lagte hain, pehle inko thoda explore kar lo
- Terraform installed (`terraform -v` se check karo)
- Basic YAML/JSON knowledge (CloudFormation aur Terraform ke variable files ke liye kaam aayega)

## What You'll Build

Is section ke end tak tum yeh kar paoge:

- Terraform se infrastructure ko code mein define karna
- Reusable Terraform modules banana jo multiple environments mein use ho sakein
- Infrastructure state ko securely manage karna (remote backend + locking ke saath)
- Poora AWS environment (VPC, EC2, RDS, S3) provision karna, ek command se
- CloudFormation use karke AWS-native IaC likhna

## Key Takeaways

- IaC infrastructure ko code bana deta hai — version-controlled, reviewable, aur repeatable, manual console-clicking ki jagah.
- Declarative approach (Terraform, CloudFormation) mein tum "kya chahiye" batate ho, tool khud figure out karta hai "kaise banana hai".
- State file Terraform ki memory hai — isko remote backend (S3 + DynamoDB locking) mein rakhna team collaboration ke liye zaruri hai.
- Modules code reuse ke liye hain — ek baar likho, multiple environments mein use karo.
- Workspaces same structure ke multiple environments ke liye kaam aate hain; alag structure ho to separate configs behtar hain.
- Terraform multi-cloud aur bada ecosystem deta hai; CloudFormation AWS-native aur state-management-free experience deta hai.
- Secrets (passwords, API keys) kabhi bhi `.tf` files mein hardcode mat karo — variables, `.tfvars`, ya secret managers use karo.

**Previous Section**: [← Orchestration](../04_orchestration/)  
**Next Section**: [Monitoring](../06_monitoring/) →
