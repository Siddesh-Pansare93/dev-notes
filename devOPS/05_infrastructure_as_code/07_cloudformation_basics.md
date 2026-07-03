# AWS CloudFormation Basics

Socho tumhe AWS pe ek poora setup banana hai — VPC, subnet, EC2 instance, RDS database, sab kuch. Ab yeh sab manually AWS console mein click-click karke banaoge? Ek din lag jayega, aur agli baar phir se wahi cheez repeat karni padegi. Ye bilkul waise hai jaise Swiggy ka delivery partner har order ke liye naya route manually plan kare instead of app ke saath auto-optimized route use kare. Yahi problem solve karta hai **CloudFormation** — AWS ka apna Infrastructure as Code (IaC) tool. Tum ek template file (YAML ya JSON) likhte ho jisme define karte ho ki tumhe kya infrastructure chahiye, aur CloudFormation us poore infrastructure ko khud create, update aur delete kar deta hai — bilkul ek recipe follow karne wale chef ki tarah.

> [!info]
> IaC (Infrastructure as Code) ka matlab hai — apna infrastructure (servers, network, database) code/config files mein likhna, jisse woh version-controlled, repeatable aur automatable ban jaaye. Manual console clicking se bahut zyada reliable.

## CloudFormation vs Terraform

**Kya farak hai in dono mein?** Dono hi IaC tools hain, lekin inka scope alag hai. Isko aise socho — CloudFormation ek AWS ka apna in-house courier service hai jo sirf AWS ke andar deliver karta hai, jabki Terraform ek third-party aggregator (jaise Shiprocket) hai jo Amazon, Flipkart, sabke saath kaam kar sakta hai — matlab multi-cloud.

| Feature | CloudFormation | Terraform |
|---------|---|---|
| Cloud | Sirf AWS | Multi-cloud (AWS, Azure, GCP, sab) |
| Language | JSON/YAML | HCL (HashiCorp Configuration Language) |
| State | Implicit — AWS khud manage karta hai | Explicit — tumhe apna state file manage karna padta hai (ya remote backend use karna padta hai) |
| Learning | AWS-specific, agar tum already AWS use karte ho to seedha kaam aa jaata hai | General concept, ek baar seekh liya to kisi bhi cloud pe apply ho sakta hai |
| Cost | Free — AWS khud provide karta hai | Free (open-source), lekin Terraform Cloud jaisi extra services paid ho sakti hain |

**Kab kaunsa use karein?** Agar tumhari company sirf AWS pe hai aur multi-cloud ka plan nahi hai, to CloudFormation ekdum native aur seamless experience deta hai — koi extra state file manage karne ka jhanjhat nahi, AWS console mein hi stack ki poori history dikh jaati hai. Lekin agar tumhe kal ko Azure ya GCP bhi use karna pad sakta hai, ya tum already Terraform ka ecosystem use kar rahe ho, to Terraform zyada flexible choice hai.

> [!tip]
> Bahut si real companies dono use karti hain — jahan pure AWS-native services (jaise Lambda, ECS ke saath tight integration) chahiye wahan CloudFormation (ya uske upar bana SAM/CDK), aur baaki cross-cloud infra ke liye Terraform.

## Template Structure

**Kya hota hai template mein?** CloudFormation template ek YAML (ya JSON) file hoti hai jisme tum apna poora infrastructure "declare" karte ho — matlab tum yeh nahi likhte "step 1: VPC banao, step 2: subnet banao", balki tum bas final state describe karte ho ki "mujhe yeh cheezein chahiye" aur CloudFormation khud figure out karta hai ki kis order mein kya banana hai (jaise ek railway reservation form bharte ho — tum bas apni details dete ho, backend system khud seat allocate karta hai, waiting list handle karta hai, sab kuch).

Template ke mukhya sections hote hain:

- **Parameters** — yeh tumhare template ke "input fields" hain, jaise IRCTC form mein tum apna travel date, class select karte ho. Yahan tum environment name, instance type jaisi cheezein customizable rakhte ho.
- **Resources** — yeh sabse important section hai, yahin tum actual AWS resources (VPC, EC2, RDS, S3, etc.) define karte ho. Bina is section ke template ka koi matlab nahi.
- **Outputs** — stack create hone ke baad kya values chahiye (jaise instance ki public IP), woh yahan expose hoti hain, taaki dusre templates ya scripts use kar sakein.

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'Production infrastructure template'

Parameters:
  EnvironmentName:
    Type: String
    Default: production
  InstanceType:
    Type: String
    Default: t3.medium

Resources:
  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16

  Subnet:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: 10.0.1.0/24
      AvailabilityZone: us-east-1a

  Instance:
    Type: AWS::EC2::Instance
    Properties:
      ImageId: ami-0c55b159cbfafe1f0
      InstanceType: !Ref InstanceType
      SubnetId: !Ref Subnet

Outputs:
  VPCId:
    Value: !Ref VPC
  InstanceId:
    Value: !Ref Instance
  InstanceIP:
    Value: !GetAtt Instance.PublicIp
```

Yahan gaur karo — `Subnet` resource `!Ref VPC` use karke `VPC` resource ko point kar raha hai. CloudFormation khud samajh jaata hai ki pehle VPC banega, phir Subnet, phir Instance — yeh dependency graph automatically resolve hota hai. Tumhe manually order specify karne ki zaroorat nahi (jaise Zomato ka order pehle restaurant confirm karta hai, phir delivery partner assign hota hai — backend khud dependency handle karta hai).

> [!warning]
> `ImageId` (AMI ID) region-specific hoti hai. Agar tum `us-east-1` ke alawa kisi aur region mein deploy kar rahe ho, to yeh AMI ID kaam nahi karegi — har region ki apni alag AMI IDs hoti hain.

## Creating Stacks

**Stack kya hoti hai?** Jab tum ek template ko AWS pe deploy karte ho, to jo actual resources ban jaate hain unka poora collection ek "Stack" kehlata hai. Ek template ek blueprint hai (jaise ek building ka naksha), aur Stack us naksha se bani hui actual building hai. Tum ek hi template se multiple stacks bana sakte ho — jaise ek hi naksha use karke Mumbai mein bhi ghar banao aur Pune mein bhi.

```bash
# Create stack
aws cloudformation create-stack \
  --stack-name prod-stack \
  --template-body file://template.yaml \
  --parameters ParameterKey=EnvironmentName,ParameterValue=production

# Monitor creation
aws cloudformation describe-stacks \
  --stack-name prod-stack

# Update stack
aws cloudformation update-stack \
  --stack-name prod-stack \
  --template-body file://template.yaml

# Delete stack
aws cloudformation delete-stack \
  --stack-name prod-stack
```

**Kaise kaam karta hai internally?** Jab tum `create-stack` chalate ho, CloudFormation template ko parse karta hai, dependency graph banata hai, aur phir resources ko sahi order mein create karna shuru karta hai. Har resource ke create hone ka status track hota hai — agar beech mein koi resource fail ho jaaye, to by default CloudFormation **automatic rollback** kar deta hai, matlab jo bhi resources bane the unhe wapas delete kar deta hai, taaki tumhare account mein "half-created" garbage infrastructure na reh jaaye. Yeh bilkul waise hai jaise IRCTC ka Tatkal booking — agar payment fail ho jaaye to poori booking cancel ho jaati hai, seat half-blocked nahi rehti.

`delete-stack` chalane pe saavdhani rakhna — yeh us stack ke andar ke saare resources delete kar dega (jab tak tumne `DeletionPolicy: Retain` specify na kiya ho kisi resource pe, jaise production database ke liye).

> [!warning]
> Production database ya important S3 bucket jaise critical resources pe hamesha `DeletionPolicy: Retain` ya `DeletionPolicy: Snapshot` set karo, warna galti se stack delete karne pe tumhara saara data ud jaayega.

## Intrinsic Functions

**Kya zaruri hai?** Kabhi kabhi tumhe static values nahi, balki dynamic values chahiye hoti hain — jaise ek resource ki value dusre resource mein use karni ho, ya kisi condition ke basis pe decide karna ho ki kaunsa value use karna hai. Iske liye CloudFormation "intrinsic functions" deta hai — yeh built-in helper functions hain jo template ke andar hi calculations/references karne dete hain.

```yaml
Resources:
  Database:
    Type: AWS::RDS::DBInstance
    Properties:
      # Reference parameter
      DBInstanceIdentifier: !Ref EnvironmentName
      # Get attribute from resource
      DBSubnetGroupName: !GetAtt SubnetGroup.DBSubnetGroupName
      # Conditional
      AllocatedStorage: !If [IsProduction, 100, 20]
      # Join strings
      EnvironmentTag: !Join ['-', [!Ref EnvironmentName, 'db']]
      # Select from list
      AvailabilityZone: !Select [0, !GetAZs '']

Conditions:
  IsProduction: !Equals [!Ref EnvironmentName, 'production']
```

Chalo har function ko samajhte hain ek-ek karke:

- **`!Ref`** — kisi Parameter ya Resource ka reference leta hai. Jaise `!Ref EnvironmentName` us parameter ki value utha lega jo user ne pass ki thi (ya default value).
- **`!GetAtt`** — kisi resource ka specific attribute nikaalta hai, jaise `SubnetGroup.DBSubnetGroupName` — har AWS resource type ke apne specific attributes hote hain jo tum docs mein dekh sakte ho.
- **`!If`** — ek conditional hai, bilkul JavaScript ke ternary operator (`condition ? a : b`) jaisa. Yahan agar `IsProduction` condition true hai to `100` GB storage, warna `20` GB — matlab production mein zyada storage, dev/staging mein kam. Bilkul Swiggy ke plans jaise — Gold member ko zyada perks, normal user ko basic.
- **`!Join`** — strings ko ek separator ke saath jodta hai. Yahan `production` aur `db` ko `-` se jodkar `production-db` bana dega.
- **`!Select`** aur **`!GetAZs`** — `!GetAZs ''` current region ki saari Availability Zones ki list de deta hai, aur `!Select [0, ...]` usme se pehli wali (index 0) select kar leta hai.
- **`Conditions`** block mein `!Equals` check karta hai ki `EnvironmentName` parameter `'production'` ke barabar hai ya nahi — is result ko `IsProduction` naam diya gaya hai jo upar `!If` mein use hua.

> [!tip]
> Intrinsic functions ka use karke tum apne template ko ek hi jagah se multiple environments (dev, staging, production) ke liye reusable bana sakte ho — bas Parameters different pass karo, template wahi rahega.

## Stacks & Change Sets

**Yeh kyun zaruri hai?** Socho tumne production stack mein kuch changes kiye aur seedha `update-stack` chala diya — agar update mein koi galti hai (jaise galti se database delete ho jaana, kyunki kuch property changes resource ko replace kar dete hain), to production down ho sakta hai. Yeh bilkul waise hai jaise koi bina test kiye directly production database pe `UPDATE` query chala de — risky!

Iske liye CloudFormation deta hai **Change Sets** — yeh ek "preview mode" hai jisme CloudFormation tumhe pehle dikhata hai ki agar tum yeh update apply karoge to exactly kya-kya change hoga (kaunse resources modify honge, kaunse delete honge, kaunse naye banenge) — bina actually kuch change kiye. Bilkul CRED app jaise, jahan payment confirm karne se pehle tumhe poora breakdown dikhaya jaata hai ki kitna paisa katega, kaunsi categories mein — final "Pay Now" click karne se pehle review kar sakte ho.

```bash
# Preview changes
aws cloudformation create-change-set \
  --stack-name prod-stack \
  --change-set-name update-1 \
  --template-body file://template.yaml

# Review changes
aws cloudformation describe-change-set \
  --change-set-name update-1 \
  --stack-name prod-stack

# Execute change set
aws cloudformation execute-change-set \
  --change-set-name update-1 \
  --stack-name prod-stack
```

`describe-change-set` chalane pe tumhe pata chalega ki kaunse resources pe `Modify`, `Add`, ya `Remove` action hoga, aur agar `Modify` hai to yeh bhi pata chalega ki resource "in-place update" hoga ya poora "replace" (delete + recreate) hoga. Replace wala action dekhte hi alert ho jao — matlab woh resource downtime ke saath dobara banega.

> [!warning]
> Kabhi bhi `describe-change-set` ka output dekhe bina production pe `execute-change-set` mat chalao. Especially dhyan do "Replacement: True" wale resources pe — yeh purane resource ko delete karke naya banate hain, jisse data loss ya downtime ho sakta hai.

## Key Takeaways

- **CloudFormation** AWS ka native IaC tool hai — sirf AWS ke andar kaam karta hai, lekin AWS services ke saath deeply integrated hai.
- **Templates** YAML/JSON files hain jisme tum apna desired infrastructure declare karte ho — CloudFormation khud dependency order figure out karta hai.
- **Stacks** ek template se deploy hui actual running infrastructure hoti hai — ek template se multiple stacks (dev, staging, prod) bana sakte ho.
- **Parameters** template ko reusable banate hain — same template, different environments ke liye different values.
- **Intrinsic Functions** (`!Ref`, `!GetAtt`, `!If`, `!Join`, `!Select`) dynamic references aur conditions handle karte hain template ke andar.
- **Change Sets** production updates ko safe banate hain — apply karne se pehle exact changes preview kar sakte ho.
- **Failed stack creation** automatically rollback ho jaata hai, taaki half-created garbage resources na reh jaayein.
- Agar tum **sirf AWS** use karte ho to CloudFormation seamless hai; agar **multi-cloud** future mein plan hai to Terraform better choice hai.

Next: [Monitoring & Observability](../06_monitoring/01_observability_concepts.md)
