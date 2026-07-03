# Amazon EKS

> Managed Kubernetes on AWS with Elastic Kubernetes Service.

Socho tumhe ek Kubernetes cluster chahiye — but control plane setup karna (etcd, API server, scheduler, controller manager, sab highly available banake, upgrade karte rehna, security patch lagana) yeh khud ka ek full-time job hai. Yeh bilkul waisa hi hai jaise koi apna khud ka data center chalana chahe jab AWS/GCP already available hai. **EKS (Elastic Kubernetes Service)** AWS ka managed Kubernetes offering hai — control plane ka pura headache AWS uठा leta hai, tum sirf apne worker nodes aur applications pe focus karte ho.

Zomato/Swiggy jaise product companies jinke paas hundreds of microservices hain aur multiple teams alag-alag services deploy karte hain, unke liye EKS ek natural choice hota hai — kyunki Kubernetes ka orchestration power milta hai, but "cluster ka control plane khud manage karna" wala pain point nahi hota.

## Kya hota hai EKS mein?

Kubernetes cluster do parts mein bata sakte hain:

1. **Control Plane** — API server, etcd (state store), scheduler, controller manager. Yeh "brain" hai jo decide karta hai kaunsa pod kahaan chalega, cluster ki health kya hai, waghera.
2. **Data Plane** — worker nodes (EC2 instances ya Fargate) jahan actual containers/pods chalte hain.

EKS mein AWS **control plane ko fully manage karta hai** — multiple availability zones mein highly available banake, automatically patch karke, backup leke. Tumhe sirf ek API endpoint milta hai jispe `kubectl` se connect karte ho. Worker nodes (data plane) ka management tumhare haath mein rehta hai — chahe khud EC2 provision karo, ya managed node groups use karo, ya Fargate (serverless) use karo.

> [!info]
> Soch lo control plane ko IRCTC ke backend servers jaise — Indian Railways khud ka data center IRCTC ke liye nahi bana rahi (well, actually railways ka apna hai, but samjho for analogy) — waise hi tumhe apna control plane khud host nahi karna, AWS ka managed infra use kar rahe ho.

## Create EKS Cluster

Sabse pehle cluster banate hain. Iske liye tumhe pehle se ek VPC, subnets (kam se kam 2 alag Availability Zones mein), aur ek IAM role chahiye jo EKS ko permission de ki wo tumhare account mein resources (load balancers, ENIs, etc.) bana sake.

```bash
# Create cluster
aws eks create-cluster \
  --name my-cluster \
  --version 1.28 \
  --role-arn arn:aws:iam::ACCOUNT:role/eks-service-role \
  --resources-vpc-config subnetIds=subnet-1a,subnet-1b,subnet-2a,subnet-2b

# Wait for cluster (10-15 minutes)
aws eks wait cluster-active --name my-cluster

# Update kubeconfig
aws eks update-kubeconfig --region us-east-1 --name my-cluster

# Verify
kubectl get nodes
```

Yahan kya ho raha hai step by step:

- `create-cluster` — AWS ko bolte ho ki control plane spin up karo. Yeh command turant return ho jaata hai, but background mein AWS actually control plane provision karta hai — isliye **10-15 minute lagte hain**. Bilkul jaise Swiggy pe order place karte hi khana turant nahi aata, "preparing" status dikhta hai.
- `--role-arn` — yeh IAM role EKS service ko diya jaata hai (service ke through assume kiya jaata hai) taaki wo tumhare AWS account mein cluster ke liye resources (jaise Elastic Network Interfaces) create/manage kar sake.
- `--resources-vpc-config` — kam se kam 2 subnets do, alag AZ mein, taaki control plane highly available rahe. Agar ek AZ down ho jaaye, dusre se serve ho sake.
- `aws eks wait cluster-active` — polling command hai jo tab tak wait karta hai jab tak cluster ka status `ACTIVE` na ho jaaye. Manual polling se accha hai script mein.
- `aws eks update-kubeconfig` — yeh tumhare local `~/.kube/config` file mein ek naya context add/update karta hai, jisse `kubectl` commands seedhe is cluster pe point karne lagte hain. Yeh AWS CLI ke credentials (IAM) use karke authenticate karta hai — koi separate password nahi hota.
- `kubectl get nodes` — verify karne ke liye ki worker nodes register ho chuke hain (agar node group already bana hua hai).

> [!warning]
> `create-cluster` sirf **control plane** banata hai — koi worker node nahi. `kubectl get nodes` initially **empty** aayega jab tak tum node group ya Fargate profile na add karo. Bahut log yahan confuse ho jaate hain ki "cluster ban gaya but nodes hi nahi hain!" — yeh expected hai, next step karna baaki hai.

## Node Groups

Kya hota hai? **Node group** ek set hai EC2 instances ka jo tumhare cluster ke worker nodes ban'te hain — inhi pe tumhare actual pods (containers) schedule hote hain. Isko socho jaise Swiggy ke delivery partners ka pool — order (pod) aane pe available partner (node) ko assign kiya jaata hai.

```bash
# Create node group
aws eks create-nodegroup \
  --cluster-name my-cluster \
  --nodegroup-name my-nodes \
  --subnets subnet-1a subnet-1b \
  --node-role arn:aws:iam::ACCOUNT:role/NodeInstanceRole \
  --instance-types t3.medium \
  --scaling-config minSize=1,maxSize=10,desiredSize=3
```

Breakdown:

- `--node-role` — worker nodes ka apna alag IAM role hota hai (control plane ke role se different) jisme policies attach hoti hain jaise `AmazonEKSWorkerNodePolicy`, `AmazonEC2ContainerRegistryReadOnly` (ECR se image pull karne ke liye), `AmazonEKS_CNI_Policy` (networking ke liye).
- `--instance-types t3.medium` — kitne size ka EC2 instance chahiye. Production mein workload ke hisaab se badi instance types (jaise `m5.xlarge`) bhi use kar sakte ho.
- `--scaling-config minSize=1,maxSize=10,desiredSize=3` — yeh **Auto Scaling Group** jaisa behavior deta hai: minimum 1 node hamesha rahega, maximum 10 tak scale ho sakta hai traffic ke hisaab se, aur abhi shuru mein 3 nodes chahiye. Yeh Cluster Autoscaler ke saath milke kaam karta hai jo demand dekhke nodes add/remove karta hai — bilkul Swiggy jaisa jo peak lunch hours mein zyada delivery partners "online" karta hai aur off-peak mein kam.

Managed node groups ka fayda yeh hai ki AWS khud patching, updates, aur graceful node replacement handle karta hai. Agar tumhe zyada control chahiye (custom AMI, spot instances ka fine control), tab **self-managed node groups** ya **Karpenter** jaise tools use karte ho.

> [!tip]
> Cost bachane ke liye spot instances ka mix use karna common practice hai non-critical workloads ke liye — jaise batch jobs ya dev/staging environments. Production critical services ke liye on-demand ya reserved instances safer hain kyunki spot instances kabhi bhi (2 min notice ke saath) reclaim ho sakte hain.

## Add-ons

**Add-ons** yeh essential Kubernetes components hain jo cluster ko properly kaam karne ke liye chahiye hote hain — networking, DNS, aur proxy ka kaam karte hain. AWS inhe managed add-ons ke roop mein deta hai taaki tumhe inko manually install/upgrade na karna pade.

```bash
# VPC CNI (networking)
aws eks create-addon \
  --cluster-name my-cluster \
  --addon-name vpc-cni

# CoreDNS (DNS)
aws eks create-addon \
  --cluster-name my-cluster \
  --addon-name coredns

# kube-proxy
aws eks create-addon \
  --cluster-name my-cluster \
  --addon-name kube-proxy
```

Teeno ka kaam samjho:

- **VPC CNI (Container Network Interface)** — yeh decide karta hai ki pods ko IP address kaise milega aur wo AWS VPC network ke saath kaise baat karenge. EKS ki khaasiyat yahi hai — har pod ko ek **real VPC IP address** milta hai (kisi overlay network ki jagah), matlab pods seedhe VPC resources (RDS database, jaise) ke saath baat kar sakte hain jaise wo normal EC2 instances hon.
- **CoreDNS** — cluster ke andar DNS resolution ka kaam karta hai. Jab ek service dusri service ko naam se call karti hai (jaise `payment-service.default.svc.cluster.local`), CoreDNS hi usko resolve karke sahi IP tak pahunchata hai. Isse bina, services ek dusre ko naam se dhoondh hi nahi paayengi.
- **kube-proxy** — har node pe chalta hai aur network rules maintain karta hai taaki traffic sahi pod tak route ho, chahe wo pod kisi bhi node pe ho. Ismein load balancing bhi hoti hai multiple pod replicas ke beech.

Yeh teeno basically **hume Kubernetes ka basic networking aur service discovery** kaam karne ke liye zaruri hain — inke bina cluster technically "up" toh hoga, but pods aapas mein baat nahi kar paayenge.

> [!info]
> Pehle log inhe manually YAML manifests apply karke install karte the. Ab EKS managed add-ons feature se AWS console/CLI se ek command mein install + version management ho jaata hai — patching aur security updates bhi AWS khayal rakhta hai.

## IAM Roles for Service Accounts (IRSA)

Yeh ek bahut important aur thoda tricky concept hai — samjhte hain deeply.

**Problem kya hai?** Socho tumhare pod ko S3 bucket se file read karni hai, ya DynamoDB table access karna hai. Traditional tareeka yeh hoga ki AWS access key aur secret key ko environment variable ya Kubernetes Secret mein daal do. Par yeh **bahut risky** hai — agar keys leak ho gayi (galti se logs mein print ho gayi, ya kisi ne git mein commit kar diya), toh attacker ko full AWS access mil jaata hai. Yeh bilkul waisa hi jaise apna ATM PIN kisi chitthi mein likh ke rakh dena.

**IRSA (IAM Roles for Service Accounts)** iska elegant solution hai — pods ko seedhe temporary, auto-rotating AWS credentials milte hain, **bina koi static key store kiye**, ek specific Kubernetes Service Account ke through. Isko socho UPI jaisa — tumhe apna bank account number/password kisi ko dena nahi padta, ek temporary, scoped token se transaction ho jaata hai.

Yeh kaam kaise karta hai (high level):

1. Cluster ke liye ek **OIDC (OpenID Connect) provider** enable karte ho.
2. Ek IAM role banate ho jismein trust policy hoti hai — "yeh role sirf iss specific Kubernetes service account ke through assume ho sakta hai."
3. Us Kubernetes Service Account ko pod se attach kar dete ho.
4. Pod jab AWS API call karta hai, EKS automatically temporary credentials inject kar deta hai (via projected token) — koi hardcoded key nahi.

```bash
# Enable IRSA
aws eks create-addon \
  --cluster-name my-cluster \
  --addon-name ebs-csi-driver \
  --service-account-role-arn arn:aws:iam::ACCOUNT:role/ebs-csi-driver

# Pods can now assume IAM roles
```

Yahan `ebs-csi-driver` add-on ka example diya gaya hai — yeh add-on pods ko EBS volumes (persistent storage) dynamically provision karne deta hai, aur usko AWS API calls karne ke liye khud ke IAM role ki zarurat hoti hai (volume create/attach/detach karne ke liye). `--service-account-role-arn` se hum us role ko is add-on ke service account se link kar rahe hain.

> [!tip]
> Real-world use case: agar tumhara payment-service pod ko sirf ek specific DynamoDB table read karna hai, toh IRSA se tum ek IAM role banaoge jismein sirf **us table ke liye read-only permission** ho — least privilege principle follow hota hai. Agar wo pod compromise bhi ho jaaye, attacker sirf utna hi access paayega jitna us role mein diya gaya hai, poore AWS account ka access nahi milega.

> [!warning]
> IRSA setup karte waqt sabse common mistake yeh hoti hai ki log OIDC provider enable karna bhool jaate hain, ya trust policy mein service account ka namespace/name galat likh dete hain. Agar pod ko credentials nahi mil rahe, sabse pehle yeh do cheezein check karo.

## Fargate — Serverless Option

Agar tumhe EC2 nodes manage hi nahi karne — patching, scaling, AMI update, kuch bhi nahi — toh **EKS Fargate** use kar sakte ho. Isme tum sirf pod define karte ho, AWS khud uske liye compute provision karta hai on-demand, per-pod basis pe. Bill bhi utne hi resources ka aata hai jitna pod ne use kiya — bilkul Ola/Uber jaisa "jitna use utna pay" model, na ki apni khud ki car (EC2 instance) rakhke maintain karna.

Trade-off yeh hai ki Fargate thoda costlier per-unit hota hai compared to well-utilized EC2 nodes, aur kuch features (jaise DaemonSets, ya certain networking customizations) Fargate pe support nahi hote. Isliye mixed approach common hai — kuch workloads managed node groups pe, kuch Fargate pe.

## Key Takeaways

- **EKS** AWS ka managed Kubernetes service hai — control plane (API server, etcd, scheduler) AWS khud manage karta hai, tumhe sirf worker nodes aur apps ka dhyaan rakhna hota hai.
- **Cluster create** karne mein 10-15 minute lagte hain kyunki AWS background mein highly-available control plane provision karta hai; is step ke baad `kubectl get nodes` khaali hi aayega jab tak node group na bane.
- **Node Groups** actual worker EC2 instances hain jahan pods run hote hain; `minSize`/`maxSize`/`desiredSize` se auto-scaling config hoti hai.
- **Add-ons** (VPC CNI, CoreDNS, kube-proxy) basic networking aur service discovery ke liye zaruri hain — bina inke pods aapas mein communicate nahi kar sakte.
- **IRSA** pods ko secure, temporary AWS credentials deta hai bina koi static access key store kiye — least-privilege IAM access ka best practice tareeka.
- **Fargate** serverless option hai jab tumhe EC2 node management se pura bachna ho — per-pod billing hoti hai.

Next: [Helm Package Manager](./08_helm_package_manager.md)
