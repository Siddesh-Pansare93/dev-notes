# Terraform State Management

Socho tumne Terraform se AWS pe ek pura infrastructure spin-up kar diya — VPC, EC2, RDS, security groups, sab kuch. Ab sawaal yeh hai: Terraform ko kaise pata chalega ki "yeh resource maine already bana diya hai, isko dobara mat banao"? Iska jawaab hai — **state**. State file Terraform ka "brain" hai jisme woh yaad rakhta hai ki real world (AWS/GCP/Azure) mein actually kya-kya bana hai aur woh tumhare `.tf` code se match kar raha hai ya nahi.

Agar state file kharab ho gayi, ya do log ne ek saath usko modify kar diya, toh production infra corrupt ho sakta hai. Isliye state management seekhna utna hi zaruri hai jitna Terraform code likhna.

> [!info]
> State file basically ek JSON hai jisme resource ID, attributes, dependencies — sab kuch stored rehta hai. Yeh tumhara `.tf` code nahi hai, yeh "current reality ka snapshot" hai.

## Local vs Remote State

**Kya hota hai?** Jab tum `terraform apply` chalate ho apne laptop pe, toh by default Terraform ek `terraform.tfstate` file current directory mein bana deta hai — bilkul waise jaise ek local SQLite file. Yeh file batati hai ki kaunse resources already created hain.

```bash
# Local state (development only)
terraform apply
# Creates: terraform.tfstate, terraform.tfstate.backup

# Problem: Can't share between team members
# Solution: Use remote backend
```

**Kyun problem hai?** Socho tum aur tumhara colleague dono ek hi Terraform project pe kaam kar rahe ho — jaise Zomato ke do engineers dono production infra manage kar rahe hain. Agar state file sirf tumhare laptop pe hai, toh:

- Tumhara colleague `terraform apply` chalayega toh usko pata hi nahi chalega ki tumne kya-kya banaya hai (kyunki uske paas woh state file hai hi nahi)
- Woh accidentally wahi resources dobara create karne ki koshish karega, ya worse — duplicate resources ban jayenge ya existing resources delete ho jayenge
- Agar tumhara laptop crash ho gaya aur state file ka backup nahi hai, toh Terraform ko poora bhool jaayega ki AWS pe kya-kya already running hai — matlab tumhe manually har resource ko `terraform import` karna padega

Isiliye team collaboration ke liye **remote state** use karte hain — jaise Google Docs mein sab log ek hi document pe kaam karte hain (local Word file nahi banate), waise hi Terraform state ko ek shared, central location (jaise S3) pe rakhte hain jisse pura team access kar sake.

## Remote State with S3

**Kya hota hai?** Remote backend matlab state file ko cloud storage (S3, Azure Blob, GCS, Terraform Cloud) mein store karna, apne laptop pe nahi. AWS ke case mein sabse common pattern hai — **S3 bucket** state store karne ke liye, aur **DynamoDB table** locking ke liye (locking ke baare mein neeche detail mein baat karenge).

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket         = "company-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
```

Yahan har field ka matlab samajh lo:

- `bucket` — kaunsa S3 bucket state store karega
- `key` — bucket ke andar state file ka path/naam. Isko environment-wise organize karo (jaise `prod/terraform.tfstate`, `staging/terraform.tfstate`) taaki har environment ka apna alag state ho — jaise Swiggy production aur staging ke database alag rakhta hai, waise hi
- `region` — S3 bucket kis AWS region mein hai
- `encrypt` — state file ko encrypt karke store karo (kyunki state file mein sensitive data ho sakta hai — jaise DB passwords, private keys — plaintext mein!)
- `dynamodb_table` — locking ke liye DynamoDB table ka naam

```bash
# Initialize with remote backend
terraform init

# State now stored in S3
# Lock table prevents concurrent modifications
```

`terraform init` chalane pe Terraform automatically local state ko S3 pe migrate kar dega (agar pehle se local state hai) aur ab se har `apply`/`plan` S3 se state read/write karega.

> [!tip]
> S3 bucket pe **versioning enable** karna mat bhoolna. Yeh tumhe automatically state file ke purane versions ka history deta hai — disaster recovery ke liye bahut kaam aata hai (neeche cover karenge).

## State Locking

**Kya hota hai?** Socho IRCTC ki tatkal booking — agar do log same seat ek saath book karne ki koshish karein bina kisi lock ke, toh dono ko confirm ho jaayega aur baad mein conflict hoga. State locking bilkul yehi problem solve karta hai Terraform ke liye.

Jab bhi koi `terraform apply` ya `terraform plan` chalata hai, Terraform pehle ek **lock** acquire karta hai state file pe. Jab tak yeh operation chal raha hai, koi doosra insaan/CI pipeline usi state pe kaam nahi kar sakta. Operation complete hone ke baad lock release ho jaata hai.

**Kyun zaruri hai?** Agar do engineers ek saath `terraform apply` chala dein bina locking ke:
- Dono ek hi state file ko parallel mein read-modify-write karenge
- State file corrupt ho sakti hai (race condition)
- Ya worse — ek ka apply doosre ke changes ko overwrite kar sakta hai, aur real infrastructure state file se out-of-sync ho jaayega

AWS backend ke case mein locking DynamoDB table use karke hoti hai:

```hcl
# DynamoDB table for state locking
resource "aws_dynamodb_table" "terraform_locks" {
  name           = "terraform-locks"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }
}
```

Yahan `billing_mode = "PAY_PER_REQUEST"` isliye use karte hain kyunki locking table pe traffic bahut kam aur unpredictable hota hai — jitna use utna hi paisa, provisioned capacity ki tension nahi. `LockID` primary key ke through Terraform pata karta hai ki kaunsa state file currently kisi ke paas "locked" hai.

> [!warning]
> Agar `terraform apply` beech mein crash ho jaaye (network issue, Ctrl+C, machine crash), toh kabhi-kabhi lock release nahi hota aur "state locked" error aata rehta hai. Aise mein `terraform force-unlock <LOCK_ID>` use karke manually unlock karna padta hai — lekin sochke, kyunki agar koi actually kaam kar raha hai toh isse race condition ho sakti hai.

## State Inspection

**Kya hota hai?** Kabhi-kabhi tumhe dekhna padta hai ki state file ke andar actually hai kya — jaise database ka `SELECT * FROM table` chalana. Terraform isके liye kaafi commands deta hai:

```bash
# View current state
terraform show

# List resources in state
terraform state list

# Show specific resource
terraform state show aws_instance.web

# Manual state edit (dangerous!)
terraform state mv aws_instance.old aws_instance.new

# Remove from state (don't destroy)
terraform state rm aws_security_group.unused
```

In commands ko samjho ek-ek karke:

- **`terraform show`** — pura current state human-readable format mein dikha deta hai. Debug karte waqt sabse pehla command hota hai.
- **`terraform state list`** — sirf resource addresses ki list deta hai (jaise `aws_instance.web`, `aws_s3_bucket.data`). Jaise Flipkart ke order history mein sirf order IDs dekhna.
- **`terraform state show <resource>`** — ek specific resource ke saare attributes detail mein dikhata hai (IP address, ARN, tags, sab kuch).
- **`terraform state mv`** — resource ko state ke andar rename/move karta hai bina actual infrastructure ko touch kiye. Use case: tumne code refactor kiya, resource ka naam badla, ya module mein move kiya — lekin real AWS resource wahi ka wahi hai, sirf state ko update karna hai ki "yeh naya naam isi resource ko point karta hai".
- **`terraform state rm`** — resource ko state se hata deta hai, **lekin actual resource ko destroy nahi karta**. Use case: tum chahte ho ki Terraform ab is resource ko manage na kare (maybe koi manually usko manage karega ya kisi doosre Terraform project mein move ho raha hai), lekin resource khud AWS pe running rahe.

> [!warning]
> `terraform state` commands directly state file modify karte hain. Yeh "dangerous zone" hai — ek galat move/rm command se Terraform confuse ho sakta hai real infra ke baare mein. Hamesha pehle state ka backup le lo (`terraform state pull > backup.tfstate`) in commands se pehle.

## Disaster Recovery

**Kya hota hai?** Maan lo tumhari state file corrupt ho gayi, ya kisi ne accidentally `terraform state rm` galat resource pe chala diya, ya S3 bucket se file hi delete ho gayi. Ab kya? Yahi pe disaster recovery kaam aata hai — jaise CRED ya Paytm ke paas transaction ka backup hota hai taaki koi bhi failure ho toh recover kar saken.

```bash
# Backup state
aws s3 cp s3://terraform-state/prod/terraform.tfstate \
  terraform.tfstate.backup

# Restore from backup
aws s3 cp terraform.tfstate.backup \
  s3://terraform-state/prod/terraform.tfstate

# List state versions (versioning enabled)
aws s3api list-object-versions \
  --bucket terraform-state \
  --prefix prod/
```

Yahan flow yeh hai:

1. **Regular backup lo** — state file ko periodically local ya alag S3 location pe copy karte raho, chahe automated script se ya CI pipeline ke through.
2. **Restore** — agar current state corrupt/galat ho gaya, toh backup file ko wapas S3 pe upload kar do usi key pe.
3. **S3 versioning** — agar bucket pe versioning enabled hai (jo honi hi chahiye production ke liye), toh S3 khud-ba-khud har state update ka ek naya version rakhta hai. `list-object-versions` command se tum dekh sakte ho ki state file ke kaunse-kaunse versions available hain, aur kisi bhi purane version ko restore kar sakte ho — bilkul Google Docs ke "version history" feature jaisa.

> [!tip]
> S3 versioning ka sabse bada fayda yeh hai — agar koi `terraform destroy` galti se production pe chala de aur state overwrite ho jaaye, tab bhi tum ek version pehle wapas jaake dekh sakte ho ki actually kya-kya tha. Yeh ek safety net hai jo bina extra effort ke milta hai.

## Best Practices

1. **Always use remote state** for production — local state kabhi bhi team environment mein use mat karo
2. **Enable encryption** in transit and at rest — state file mein sensitive data (passwords, keys) ho sakta hai
3. **Use locking** to prevent conflicts — DynamoDB table ya equivalent locking mechanism zaroor lagao
4. **Backup regularly** — S3 versioning helps, lekin explicit backups bhi periodically lo
5. **Never share state files** in git — `.gitignore` mein `*.tfstate` aur `*.tfstate.backup` daal do, warna secrets leak ho sakte hain
6. **Separate environments** — different state files har environment (dev/staging/prod) ke liye, taaki ek environment ka galat apply doosre ko affect na kare
7. **Access control** — IAM permissions se control karo ki kaun state file read/write kar sakta hai. Production state ko sirf trusted CI pipeline aur senior engineers hi touch karein

---

## Key Takeaways

- **State** Terraform ka source of truth hai jo track karta hai ki real infrastructure mein current mein kya-kya hai
- **Remote state** (S3, Terraform Cloud, etc.) team collaboration enable karta hai — sab ek hi shared state use karte hain, local file nahi
- **S3 + DynamoDB** combo AWS ke liye ek secure, reliable state backend banata hai — S3 storage ke liye, DynamoDB locking ke liye
- **Locking** concurrent modifications ko rokta hai — do log ek saath state ko corrupt nahi kar sakte
- **Versioning** (S3 pe) disaster recovery ka sabse asaan tareeka hai — purane state versions wapas la sakte ho
- **Encryption** sensitive data ko protect karta hai jo state file ke andar accidentally store ho jaata hai
- State ko kabhi bhi git mein commit mat karo, aur `terraform state` commands (mv, rm) ko bahut soch-samajh ke, backup lene ke baad hi chalao

Next: [Terraform Workspaces](./06_terraform_workspaces.md)
