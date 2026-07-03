# Terraform Basics

> Cloud infrastructure ko HashiCorp Configuration Language (HCL) use karke provision karna — yeh hai Terraform ka poora khel.

Socho tumne ek naya project start kiya — tumhe AWS pe ek EC2 server, ek S3 bucket, ek RDS database chahiye. Manual way mein tum AWS console khologe, click-click-click karke sab bana loge. Lekin agla developer joinega, usko pata hi nahi chalega ki kya-kya banaya tha, kaise banaya tha, kis order mein banaya tha. Aur agar production down ho gaya aur staging environment bhi waisa hi banana hai — phir se wahi click-click-click?

Yahi problem solve karta hai **Infrastructure as Code (IaC)**, aur Terraform uska sabse popular tool hai. Socho isko restaurant ke recipe card jaise — jaise ek Zomato restaurant ka chef apni har dish ka exact recipe likh ke rakhta hai (kitna namak, kitna masala, kitni der pakana hai), waise hi Terraform mein tum apni **poori infrastructure ko code mein likh dete ho**. Kal agar wahi restaurant ek naye shehar mein branch khole, toh wahi recipe copy-paste karke same taste mil jayega. Terraform ke saath bhi yahi hota hai — same `.tf` files se tum dev, staging, prod — teeno environments same tarah spin up kar sakte ho.

## Kyun Zaruri Hai?

- **Repeatability**: Ek baar likh do, jitni baar chaho environment banao — bilkul same configuration milega.
- **Version Control**: Infrastructure ab Git mein track hoti hai. Kisne kya change kiya, kab kiya — sab pata chalega, jaise code review hoti hai.
- **Documentation as Code**: Tumhara `.tf` file khud hi documentation ban jata hai — koi separate Word doc nahi likhna padta "hamare paas kaunse servers hain".
- **Disaster Recovery**: Agar poori infra crash ho jaye (bahut rare, but ho sakta hai), toh `terraform apply` chala ke minutes mein wapas khada kar sakte ho.

## Installation

Terraform ek single binary hai — na koi heavy runtime, na koi complex setup. Bas ek executable file jo tumhare system pe chal jata hai.

```bash
# macOS
brew install terraform

# Linux
wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
unzip terraform_1.6.0_linux_amd64.zip
sudo mv terraform /usr/local/bin/

# Verify
terraform version
```

> [!tip]
> Windows use karte ho toh `choco install terraform` (Chocolatey ke through) ya phir HashiCorp ki site se binary directly download kar sakte ho. Path mein add karna mat bhoolna.

## Basic Configuration

Ab asli maza shuru hota hai. Terraform mein sab kuch `.tf` files mein likha jata hai, aur syntax hai **HCL (HashiCorp Configuration Language)** — JSON jaisa dikhta hai but zyada readable aur developer-friendly hai.

Socho isko ek order form jaisa — jaise tum Swiggy pe order karte time restaurant select karte ho (`provider`), fir menu se items choose karte ho (`resource`), aur end mein order confirmation number milta hai (`output`). Terraform mein bhi structure kuch aisa hi hota hai:

```hcl
# main.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t2.micro"

  tags = {
    Name = "web-server"
  }
}

output "instance_ip" {
  value = aws_instance.web.public_ip
}
```

Isko break karke samajhte hain:

- **`terraform` block**: Yeh bata raha hai ki tumhe kaunsa provider chahiye (yaha AWS) aur uska kaunsa version. Bilkul `package.json` mein dependencies specify karne jaisa hai — "mujhe AWS provider ka 5.x version chahiye".
- **`provider "aws"`**: Yeh AWS se connect hone ka config hai — kaunsi region use karni hai. Credentials yaha likhne ki zaroorat nahi (environment variables ya AWS CLI config se pick ho jate hain — hardcode kabhi mat karo, warna GitHub pe leak ho jayenge!).
- **`resource "aws_instance" "web"`**: Yeh asli infrastructure piece hai jo banega — ek EC2 instance, jiska internal naam (Terraform ke liye) `web` hai. Real-world mein socho jaise tumne Ola pe cab book ki — `aws_instance` cab ka "type" hai, `web` tumhara booking reference hai.
- **`output "instance_ip"`**: Jab resource ban jayega, uski public IP print ho jayegi terminal pe. Bilkul railway ticket booking ke baad PNR number milne jaisa — "yeh raha tumhara result, isse use karo aage."

> [!info]
> `ami-0c55b159cbfafe1f0` ek Amazon Machine Image ID hai — basically ek pre-baked OS image (jaise Ubuntu, Amazon Linux). Region ke hisaab se AMI IDs alag-alag hote hain, dhyan rakhna.

## Workflow

Terraform ka workflow ek simple 4-step cycle hai, jise har baar follow karna hai:

```bash
# Initialize (download providers)
terraform init

# Plan (preview changes)
terraform plan

# Apply (create resources)
terraform apply

# Show state
terraform show

# Destroy
terraform destroy
```

Isko IRCTC ki tatkal booking se compare karo:

1. **`terraform init`** — Jaise app open karke login karna. Yeh command tumhare provider plugins (AWS, Azure, GCP — jo bhi use kar rahe ho) download karta hai aur backend setup karta hai. Yeh sirf ek baar (ya jab providers change ho) chalana padta hai.

2. **`terraform plan`** — Yeh sabse important step hai jo log skip kar dete hain aur baad mein pachtaate hain. Yeh tumhe **dry-run** dikhata hai — "yeh 3 cheeze banengi, yeh 2 change hongi, yeh 1 delete hogi" — bilkul tatkal form final submit karne se pehle preview dikhane jaisa. Kabhi bhi bina plan dekhe apply mat karo, especially production mein.

3. **`terraform apply`** — Yahan asli booking confirm hoti hai. Terraform plan ke according actual resources create/update/delete karta hai. Confirmation ke liye `yes` type karna padta hai (ya `-auto-approve` flag CI/CD pipelines mein use hota hai).

4. **`terraform show`** — Current state dikhata hai — abhi kya-kya bana hua hai infra mein.

5. **`terraform destroy`** — Sab kuch clean up kar deta hai jo Terraform ne banaya tha. Development/testing environments ke liye zabardast hai (cost bachane ke liye raat ko destroy, subah phir apply) — production mein ekdum dhyan se, galti se pura environment udd sakta hai!

> [!warning]
> `terraform destroy` production mein chalane se pehle 10 baar sochna. Yeh literally sab kuch delete kar dega jo state file mein track ho raha hai. Bahut se teams production workspace pe destroy command ko lock/restrict kar dete hain.

## Variables & Outputs

Ab socho tumhe har environment (dev, staging, prod) ke liye instance count alag chahiye — dev mein 1 server bas kaafi hai, prod mein 5 chahiye high traffic handle karne ke liye. Hardcode karoge toh alag-alag files banani padengi. Isliye **variables** ka concept aata hai — bilkul function parameters jaisa, jo tum bahar se pass kar sakte ho.

```hcl
# variables.tf
variable "instance_count" {
  description = "Number of instances"
  type        = number
  default     = 1
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

# outputs.tf
output "instance_ids" {
  value = aws_instance.web[*].id
}
```

Yahan `instance_count` ek variable hai jiska default value `1` hai, lekin tum override kar sakte ho:

```bash
# Override variables
terraform apply -var="instance_count=3"
terraform apply -var-file="prod.tfvars"
```

Socho isko BigBasket ke order jaisa — default order quantity "1" hoti hai per item, lekin tum command-line se ya ek separate `prod.tfvars` file (jaisa ek saved cart list) se override kar sakte ho ki "nahi bhai, mujhe prod ke liye 3 chahiye".

Real-world mein teams aksar teen tarah ki `.tfvars` files rakhte hain:
```
dev.tfvars
staging.tfvars
prod.tfvars
```
Aur deploy karte time bas file switch karo — code same rehta hai, sirf values badalti hain. Yeh hi toh IaC ka power hai!

> [!tip]
> `type` field zaroor specify karo (`string`, `number`, `bool`, `list`, `map`, etc.) — isse Terraform galat type ki value pass hone pe hi error de dega, runtime tak wait nahi karega.

## State Management

Yeh Terraform ka sabse crucial (aur sabse zyada confuse karne wala) part hai. Terraform ko yaad rakhna padta hai ki "maine pehle kya banaya tha" — taaki agla `apply` sirf **difference** apply kare, sab kuch dobara na bana de. Yeh jo memory hai, usko **state** kehte hain, aur yeh ek `terraform.tfstate` file mein store hoti hai.

Socho isko CRED app ke transaction history jaisa — CRED ko pata hona chahiye tumne pehle konsa bill pay kiya hai, warna wo baar-baar wahi bill dikhayega jo already paid hai. Terraform state bhi wahi kaam karta hai — "yeh resource already exist karta hai, isko dobara mat banao, bas jo naya hai wahi add karo."

By default state file local machine pe save hoti hai — jo team environment mein bahut bada problem hai. Agar do developers same time pe apply karein, ya ek developer ka laptop crash ho jaye state file ke saath, toh sab gadbad ho jayega. Isliye **remote state** use karte hain — jaise AWS S3 bucket mein state store karna, taaki poori team same "source of truth" se kaam kare.

```hcl
# Remote state (S3)
terraform {
  backend "s3" {
    bucket         = "terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
  }
}

# Remote state prevents conflicts
# Lock table prevents concurrent changes
```

Yahan do important cheezein ho rahi hain:

1. **`bucket`** — State file yahan S3 mein centrally store hoti hai, local machine pe nahi. Poori team ussi ek file ko refer karti hai, jaise ek shared Google Sheet.
2. **`dynamodb_table`** — Yeh **state locking** ke liye hai. Socho IRCTC tatkal booking mein agar do log same seat book karne ki koshish karein same second mein — system ek ko lock kar dega jab tak dusra transaction complete na ho jaye. DynamoDB table exactly wahi kaam karta hai Terraform apply ke waqt — jab tak ek engineer `apply` chala raha hai, dusra engineer same state pe simultaneously apply nahi kar sakta. Isse race conditions aur corrupted state se bachte hain.

> [!warning]
> State file mein sensitive data (jaise DB passwords, secrets) plaintext mein store ho sakta hai. Isliye state file ko kabhi Git mein commit mat karo, aur S3 bucket pe encryption + strict access control zaroor lagao.

> [!info]
> Agar tumhari team badi hai aur bahut saare modules/environments manage kar rahi hai, toh **Terraform Cloud** ya **Terraform Enterprise** consider karo — yeh state management, locking, aur collaboration ko managed service ke through handle karte hain, taaki tumhe khud S3 + DynamoDB setup na karna pade.

## Key Takeaways

- **HCL** Terraform ki apni language hai — readable aur declarative, batati hai "kya chahiye" na ki "kaise banao".
- **Providers** cloud platforms (AWS, Azure, GCP, etc.) se connect karne ka pul hain.
- **Resources** actual infrastructure components hain — servers, buckets, databases, sab kuch.
- **Variables** configuration ko parameterize karte hain, taaki same code alag environments mein reuse ho sake.
- **State** Terraform ki memory hai jo track karti hai infra ka current status — production mein hamesha **remote state + locking** use karo.
- **`terraform plan`** kabhi skip mat karo — yeh apply se pehle ka safety net hai.
- **Modules** code reuse ke liye hain (agli file mein detail se dekhenge).

Next: [Terraform Modules](./03_terraform_modules.md)
