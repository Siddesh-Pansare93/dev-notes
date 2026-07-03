# AWS Essentials - Cloud Infrastructure

Chalo ab hum DevOps ke sabse zaruri chapter mein aa gaye hain — **AWS (Amazon Web Services)**. Ab tak humne apps ko containerize kiya (Docker), pipelines banaye (CI/CD) — but yeh sab chalega kahan? Koi na koi server toh chahiye jahan yeh containers actually run karein, users tak traffic pahunche, database bache rahe, aur static files fast load hon. Yeh sab kaam cloud providers karte hain, aur AWS duniya ka sabse bada aur popular cloud provider hai.

Socho aise — abhi tak tumne ghar pe khana banana seekha (code likhna, Docker mein pack karna). Ab time hai restaurant kholne ka — aur uske liye tumhe jagah chahiye (server), bijli-paani (networking), security guard (IAM), extra staff jab rush ho (auto scaling), aur ek storeroom (S3) jahan raw material rakh sako. AWS yeh sab "infrastructure as a service" de deta hai — tumhe apna khud ka data center banane ki zarurat nahi.

## Kyun zaruri hai AWS seekhna?

Aaj kal Zomato, Swiggy, Flipkart, Ola, CRED, Paytm — inme se zyada tar companies apna infrastructure AWS, GCP ya Azure pe chalate hain. Interview mein bhi "tumne production deployment kaise handle kiya" jaisa sawaal common hai. Ek Node.js/TypeScript developer ke liye AWS samajhna matlab apne code ko sirf laptop pe chalane se aage badhke, real users tak reliably pahunchana seekhna.

## Topics Covered

Neeche diye gaye topics is section ke andar alag-alag files mein detail se cover honge. Yeh ek roadmap hai — order follow karna best rahega kyunki har topic pichle wale pe build hota hai.

1. **AWS Overview** — Regions, Availability Zones (AZs), IAM, AWS CLI, credentials
   Sabse pehle samajhna padega AWS ka basic structure — duniya bhar mein AWS ke "regions" (jaise Mumbai, Singapore, Virginia) hain, aur har region ke andar multiple "Availability Zones" (basically alag-alag data centers) hote hain taaki ek jagah bijli chali jaaye toh bhi tumhara app down na ho. Saath hi seekhenge **IAM** (Identity and Access Management) — jo decide karta hai kaun kya kar sakta hai AWS account mein, bilkul jaise ek company mein har employee ka alag access level hota hai (HR sabka salary dekh sakta hai, but dev sirf code repo access karega).

2. **EC2 Essentials** — Instances, AMIs, security groups, key pairs
   **EC2 (Elastic Compute Cloud)** matlab virtual server rent pe lena — jaise tum OYO pe room book karte ho waise hi AWS se ek "compute instance" book karte ho, use karte ho, aur jab kaam khatam toh chhod dete ho. Seekhenge AMI (pehle se configure kiya hua server template), security groups (firewall rules — kaun sa traffic andar aa sakta hai), aur key pairs (SSH se login karne ki chaabi).

3. **ECS & ECR** — Container registry, ECS clusters, task definitions
   Docker seekh chuke ho toh ab **ECR (Elastic Container Registry)** samjho — Docker Hub jaisa hi ek jagah hai jahan AWS ke andar hi apni images store kar sakte ho, private aur secure. **ECS (Elastic Container Service)** us image ko actual containers ki tarah chalata hai, scale karta hai, aur manage karta hai — bilkul jaise Swiggy ka dispatch system decide karta hai kitne delivery partners chahiye kis area mein.

4. **Load Balancers** — ALB, NLB, target groups, health checks
   Jab ek server traffic handle nahi kar pata, tab **Load Balancer** kaam aata hai — yeh incoming requests ko multiple servers mein baant deta hai, bilkul restaurant ke us manager jaisa jo customers ko alag-alag counters pe bhej deta hai taaki ek counter pe lambi line na lage. **ALB (Application Load Balancer)** aur **NLB (Network Load Balancer)** ke use cases alag hote hain, aur "health checks" ensure karte hain ki traffic sirf un servers ko jaaye jo actually zinda aur healthy hain.

5. **Auto Scaling** — Auto Scaling Groups, launch templates, scaling policies
   Diwali sale ke time Flipkart pe traffic 10x ho jaata hai — kya wo hamesha itne hi servers rakhte hain? Nahi! **Auto Scaling** automatically naye servers spin up kar deta hai jab load badhta hai, aur kam ho jaane par unhe band bhi kar deta hai (cost bachane ke liye). Yeh seekhenge ki kaise "Auto Scaling Groups" aur "scaling policies" set karte hain taaki tumhara app apne aap breathe kar sake.

6. **RDS & Databases** — RDS, backups, multi-AZ, read replicas
   Database khud manage karna (patching, backups, failover) ek headache hai. **RDS (Relational Database Service)** yeh sab AWS khud handle kar leta hai — tum bas apna PostgreSQL/MySQL use karo. "Multi-AZ" ka matlab ek backup copy alag data center mein rakhna (jaise IRCTC ka backup reservation system agar primary fail ho jaaye), aur "read replicas" traffic ko split karte hain taaki reads fast rahein.

7. **S3 & CloudFront** — Object storage, CDN, static site hosting
   **S3 (Simple Storage Service)** ek unlimited size ka locker hai jahan images, videos, backups, static files — kuch bhi daal sakte ho. **CloudFront** ek CDN (Content Delivery Network) hai jo tumhare content ko duniya bhar ke edge locations pe cache kar deta hai — jaise Amazon ka warehouse network jo product ko tumhare shehar ke paas rakhta hai taaki delivery fast ho, waise hi CloudFront content ko user ke paas rakhta hai taaki loading fast ho.

8. **VPC Networking** — Subnets, route tables, NAT gateways, security
   **VPC (Virtual Private Cloud)** tumhara khud ka isolated network hai AWS ke andar — jaise ek gated society jisme tum decide karte ho kaun andar aa sakta hai. Seekhenge subnets (society ke andar alag-alag blocks — public block jahan sabko access hai, private block jahan sirf residents), route tables (traffic kaha jaayega uske rules), aur NAT gateways (jo private subnet ke resources ko internet tak pahunchne dete hain bina unhe public expose kiye).

> [!info]
> Yeh sab topics ek dusre se connected hain. Real production setup mein tum ek EC2/ECS instance ko VPC ke andar chalaoge, uske aage Load Balancer lagaoge, Auto Scaling se traffic handle karoge, RDS mein data rakhoge, aur S3/CloudFront se static assets serve karoge. Poora ek system banta hai — isliye order se seekhna important hai.

## Prerequisites

- AWS account (free tier available hai — 12 mahine tak bahut sari services free mein use kar sakte ho, bas billing alert zaroor laga lena warna galti se paisa cut ho sakta hai)
- AWS CLI installed (terminal se AWS ko control karne ke liye)
- Docker aur CI/CD ka basic understanding (pichle sections mein cover kiya hai — agar clear nahi hai toh pehle wahan wapas jaake revise kar lena)

> [!warning]
> AWS free tier ke andar bhi kuch services free nahi hoti agar tum galat region ya galat instance type choose kar lo. Hamesha AWS Billing Dashboard pe budget alert set karo — bahut se developers ka pehla AWS bill dekhkar dil dahal jaata hai kyunki koi resource band karna bhool gaye the.

## What You'll Build

Is section ke end tak tum yeh sab kar paoge:

- Apne containerized applications ko AWS ECS pe deploy karna — bilkul production jaisa setup
- Load balancing aur auto-scaling configure karna taaki traffic spike mein bhi app crash na ho
- Secure VPC networking design karna — public aur private subnets ke saath
- RDS ke through databases manage karna — bina khud backup/patching ki tension liye
- S3/CloudFront se static assets (images, JS, CSS bundles) fast serve karna duniya bhar mein

## Key Takeaways

- AWS cloud infrastructure provide karta hai taaki apna khud ka data center na banana pade — bas jitna use karo utna pay karo.
- **IAM** access control ke liye hai, **EC2** virtual servers ke liye, **ECS/ECR** containers ke liye.
- **Load Balancers + Auto Scaling** milke ensure karte hain ki traffic chahe kam ho ya zyada, app smoothly chalta rahe.
- **RDS** managed database service hai jo backups, patching, aur failover khud handle karta hai.
- **S3** object storage ke liye aur **CloudFront** CDN ke through fast content delivery ke liye use hota hai.
- **VPC** tumhare AWS resources ka apna private, secure network banata hai — subnets, route tables aur NAT gateways ke saath.
- Yeh sab topics saath milke ek production-grade cloud architecture banate hain — isliye order mein seekhna sabse better approach hai.

**Previous Section**: [← CI/CD](../02_ci_cd/)
**Next Section**: [Orchestration](../04_orchestration/) →
