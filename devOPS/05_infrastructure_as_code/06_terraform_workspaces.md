# Terraform Workspaces

Socho tumhare paas ek hi Terraform codebase hai — VPC, EC2, RDS sab define kiya hua — lekin tumhe isko **dev, staging aur prod** teeno jagah deploy karna hai. Ab do options hain: ya to har environment ke liye poora code copy-paste karo (folder duplicate karke), ya phir ek hi code use karo but state ko alag-alag rakho environment ke hisaab se. Terraform Workspaces isi doosre problem ko solve karte hain.

> [!info]
> Yeh bilkul waise hai jaise Swiggy ka ek hi app codebase hai, lekin backend mein "Swiggy India", "Swiggy Instamart", aur "Swiggy Genie" ke liye alag-alag data/config maintain hota hai — same logic, alag state.

## Workspace Basics

**Kya hota hai workspace?** Terraform workspace ek naming mechanism hai state files ke liye. Har workspace ka apna alag `.tfstate` file hota hai, lekin `.tf` config files sabke liye same rehte hain. Jab tum `terraform apply` chalate ho, Terraform check karta hai ki abhi kaunsa workspace "active" hai, aur usi workspace ke state file ko read/write karta hai.

```bash
# Create workspace
terraform workspace new dev
terraform workspace new staging
terraform workspace new prod

# List workspaces
terraform workspace list
# Output:
#   default
# * dev
#   staging
#   prod

# Switch workspace
terraform workspace select prod

# Current workspace
terraform workspace show
```

Yeh bilkul git branches jaisa feel deta hai — `terraform workspace new dev` = `git checkout -b dev`, aur `terraform workspace select prod` = `git checkout prod`. Farak sirf itna hai ki git branches code isolate karti hain, workspaces sirf **state** isolate karte hain — code sabke liye same hi rehta hai.

> [!tip]
> Default workspace hamesha `default` naam se already exist karta hai — tumne koi workspace nahi banaya to bhi Terraform isi mein kaam karta hai. `terraform workspace list` mein jispe `*` (star) laga hai, wahi abhi active workspace hai.

## Using Workspaces

**Kyun zaruri hai per-environment config?** Dev mein tumhe chhota, sasta instance chahiye kyunki testing ho rahi hai — koi heavy traffic nahi. Lekin prod mein real users hit kar rahe honge, to bade instances aur zyada replicas chahiye. Yeh sab hardcode nahi karna — `terraform.workspace` variable ka use karke dynamically decide karte hain.

```hcl
# main.tf - select config based on workspace
locals {
  workspace_config = {
    dev = {
      instance_type = "t2.micro"
      instance_count = 1
      db_allocated_storage = 20
    }
    staging = {
      instance_type = "t2.small"
      instance_count = 2
      db_allocated_storage = 50
    }
    prod = {
      instance_type = "t3.medium"
      instance_count = 5
      db_allocated_storage = 100
    }
  }

  config = local.workspace_config[terraform.workspace]
}

resource "aws_instance" "web" {
  count         = local.config.instance_count
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = local.config.instance_type

  tags = {
    Environment = terraform.workspace
  }
}
```

Yahan `terraform.workspace` ek built-in variable hai jo automatically current active workspace ka naam deta hai (jaise `"dev"`, `"prod"` etc.). Isko `local.workspace_config` map ke andar key ki tarah use karke tum ek hi resource block se teeno environment ke liye alag settings nikaal rahe ho.

Socho isko Zomato ke restaurant listing algorithm jaisa — same code, lekin "Tier 1 city" (Mumbai/Delhi) vs "Tier 2 city" (Indore/Nagpur) ke hisaab se delivery radius aur partner count ka config alag hota hai. Ek hi function, config sirf dictionary lookup se change ho jaata hai.

> [!warning]
> Agar `terraform.workspace` ka koi match `workspace_config` map mein nahi milta (jaise tum `default` workspace mein ho aur map mein sirf `dev`, `staging`, `prod` hain), to Terraform error dega: "invalid index". Isliye hamesha ek `default` case bhi map mein rakho, ya phir validation add karo.

## Environment-Specific State

**State kaise alag store hota hai?** Jab tum local backend use kar rahe ho (matlab state file tumhare machine pe hi hai, S3 jaisa remote backend nahi), to Terraform automatically `terraform.tfstate.d/<workspace-name>/terraform.tfstate` path pe har workspace ka apna state file bana deta hai.

```bash
# Each workspace has separate state
terraform workspace select dev
terraform apply -var-file=dev.tfvars
# State: terraform.tfstate.d/dev/terraform.tfstate

terraform workspace select prod
terraform apply -var-file=prod.tfvars
# State: terraform.tfstate.d/prod/terraform.tfstate
```

Matlab dev workspace mein jo resources track ho rahe hain, unki state completely alag hai prod workspace ke resources se. Agar tum dev mein `terraform destroy` chala do, prod ke resources bilkul safe rahenge — kyunki state file hi alag hai, dono ek doosre ko "dikhte" nahi.

Agar tum S3 jaisa remote backend use kar rahe ho, to yeh path S3 key ke prefix mein reflect hota hai — jaise `env:/dev/path/to/state` — lekin concept same hai: har workspace = apni alag state file.

## Workflow

Real-world mein typically tumhara deployment flow kuch aisa dikhega — pehle dev pe test karo, phir staging pe verify karo, aur last mein confidence ke saath prod pe jao:

```bash
# Deploy to dev
terraform workspace select dev
terraform apply -var-file=dev.tfvars

# Test in staging
terraform workspace select staging
terraform apply -var-file=staging.tfvars

# Deploy to prod
terraform workspace select prod
terraform apply -var-file=prod.tfvars

# Check all environments
for ws in dev staging prod; do
  terraform workspace select $ws
  terraform show -json | jq '.values.root_module.resources | length'
done
```

Yeh IRCTC ke tatkal booking system rollout jaisa hai — pehle internal QA environment pe naya feature try karo, phir staging (jo prod jaisa hi mirror hota hai) pe load test karo, aur sabse aakhir mein lakhs users tak pahunchne wale prod pe deploy karo. Har step pe confidence badhta jaata hai.

Woh last `for` loop ek handy trick hai — sab workspaces ko loop karke quickly check karna ki har environment mein kितने resources actually deployed hain, bina manually har jagah jaake dekhne ke.

## Workspace vs Separate Backends

Ab yahan asli decision aata hai — **workspaces use karein ya poore alag backend/state setup banayein har environment ke liye?**

### Workspaces
- **Pros**: Ek hi codebase, switching bahut fast (`terraform workspace select`), setup simple hai
- **Cons**: Galti se galat workspace pe apply ho sakta hai — matlab tumne socha tum `dev` mein ho, actually `prod` active tha, aur `terraform apply` chala diya. Yeh production incident ka number ek reason hai!

### Separate Backends
- **Pros**: Complete isolation — dev aur prod ke liye alag-alag S3 bucket/folder, alag IAM permissions, alag Terraform state completely separate rakhte ho. Galti se wrong environment touch karna bahut mushkil ho jaata hai.
- **Cons**: Code thoda duplicate karna padta hai (alag `backend.tf` per environment, ya alag directories: `environments/dev/`, `environments/prod/`)

> [!warning]
> Sabse common Terraform disaster yeh hota hai: engineer `terraform workspace select prod` bhoolke `dev` mein hi `terraform apply -var-file=prod.tfvars` chala deta hai. Isse dev ke resources prod jaise scale ho jaate hain, ya ulta — prod ka apply dev config ke saath chal jaata hai aur production instances downsize/delete ho jaate hain. CRED ya Paytm jaisi company mein aisi galti lakhon ka nuksaan kar sakti hai.

### Recommendation
- **Development ke liye**: Workspaces + separate `.tfvars` files use karo — speed aur convenience zaruri hai jab tum fast iterate kar rahe ho
- **Production ke liye**: Separate backends use karo (higher safety) — alag state file, alag bucket, ideally alag AWS account bhi. Prod ka blast radius jitna chhota utna accha.

Real teams mein aksar pattern yeh hota hai: har environment (`dev/`, `staging/`, `prod/`) ka apna folder hota hai apne `backend.tf` ke saath, jisme S3 key alag hota hai. Isse "prompt confusion" (kaunsa workspace active hai bhool jaana) ka risk hi khatam ho jaata hai — kyunki tum literally alag directory mein `cd` karke command chalate ho, workspace switch nahi karna padta.

> [!tip]
> Agar workspaces use kar rahe ho, to apne terminal prompt mein current workspace dikhana zaruri habit banao (bahut se shell themes jaise `oh-my-zsh` ke plugins yeh support karte hain), taaki har command se pehle tumhe pata ho tum kis environment mein ho.

---

## Key Takeaways

- **Terraform Workspaces** ek hi codebase se multiple environments (dev/staging/prod) manage karne ka tarika hain — code same rehta hai, sirf state alag hoti hai.
- **`terraform.workspace`** ek built-in variable hai jo current active workspace ka naam deta hai — isse dynamic configs (instance type, count, storage) select karte hain.
- Har workspace ka **apna alag state file** hota hai (`terraform.tfstate.d/<workspace>/terraform.tfstate` local backend mein), isliye ek workspace ke changes doosre workspace ko affect nahi karte.
- Workspaces git branches jaisa feel dete hain lekin sirf **state isolate** karte hain, code isolate nahi karte.
- Sabse bada **risk** hai galat workspace pe accidentally apply ho jaana — production incidents ka common reason.
- **Mitigation**: Development ke liye workspaces + `.tfvars` files theek hain, lekin production ke liye separate backends (alag state, alag bucket, alag account agar possible ho) use karo taaki blast radius chhota rahe.
- Hamesha `terraform workspace show` check karne ki aadat dalo `apply` chalane se pehle — ek second ka check, bada disaster bacha sakta hai.

Next: [CloudFormation Basics](./07_cloudformation_basics.md)
