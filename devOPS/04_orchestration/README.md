# Orchestration - Docker Compose & Kubernetes

Chalo ab hum orchestration ki duniya mein enter karte hain. Ab tak tumne Docker seekha — ek single container banana, image build karna, run karna. Lekin real production mein sirf ek container kabhi kaafi nahi hota. Socho Zomato ka backend — ek order-service, ek payment-service, ek notification-service, ek Redis cache, ek Postgres DB — sab alag-alag containers mein chal rahe hain, aur inko coordinate karna, scale karna, restart karna, network se connect karna — yeh sab manually karna practically impossible hai. Isi problem ko solve karta hai **orchestration**.

## Kya hota hai Orchestration?

Socho tum ek restaurant ke owner ho jisme 50 chefs, 20 waiters, 10 delivery boys kaam kar rahe hain. Agar tumhe khud har ek ko manually bolna pade "tu yeh kar, tu wahan ja, agar koi bimar pade to uski jagah dusra bhejo" — toh tum poora din wahi karte reh jaoge. Isliye tum ek **manager** rakhte ho jo yeh sab automatically handle kare — kaam assign kare, kisi ke absent hone par replacement bheje, load zyada ho toh extra staff bulaye.

Orchestration tools (Docker Compose, Kubernetes) bilkul yehi manager ka kaam karte hain, lekin containers ke liye:
- Kaunsa container kahan chalega, decide karte hain
- Container crash ho jaye toh automatically restart karte hain
- Traffic zyada aaye toh automatically scale (zyada copies chalao) karte hain
- Containers ko ek dusre se baat karne ke liye network set up karte hain
- Configuration aur secrets (passwords, API keys) safely manage karte hain
- Storage attach karte hain jo container restart hone par bhi data na khoye

### Kyun zaruri hai?

Jab tumhara app sirf ek machine par, ek container mein chal raha hai, tab sab kuch simple hai — `docker run` maar do, kaam ho gaya. Lekin jaise hi scale badhta hai (jaise IRCTC pe Tatkal booking ke time lakhon requests aati hain), ek single container ya ek single server kaafi nahi padta. Tumhe chahiye:
- **Multiple instances** of the same service (load handle karne ke liye)
- **Automatic failover** (agar ek server down ho jaye toh dusra turant uska kaam sambhale)
- **Rolling updates** (naya version deploy karo bina downtime ke — jaise Swiggy app update hota hai bina "app band hai" dikhaye)
- **Service discovery** (payment-service ko pata ho ki order-service kahan hai, without hardcoding IP)

Yeh sab manually bash scripts se karna maintenance ka nightmare ban jata hai. Orchestration tools yeh sab declarative tarike se (ek config file likh do, baaki tool sambhal lega) karte hain.

## Topics Covered

Is section mein hum step-by-step neeche diye gaye topics cover karenge — pehle single-machine orchestration (Docker Compose) se shuru karke, phir production-grade multi-machine orchestration (Kubernetes) tak jayenge:

1. **Docker Compose** - Multi-container apps, docker-compose.yml, networks
   Ek single YAML file mein poora multi-container setup define karna — jaise tumhara Node.js backend + Postgres + Redis, sab ek command (`docker compose up`) se chal jaye. Yeh single-machine development aur chhoti deployments ke liye perfect hai.

2. **Kubernetes Basics** - Pods, nodes, clusters, kubectl basics
   Kubernetes (aka K8s) ka fundamental building block — **Pod** (ek ya zyada containers ka group), **Node** (machine jahan pods chalte hain), aur **Cluster** (nodes ka group). Plus `kubectl` CLI se in sabko manage karna seekhoge — jaise UPI app se bank account manage karte ho, waise hi kubectl se cluster manage karte ho.

3. **Kubernetes Deployments** - Deployments, ReplicaSets, rolling updates
   Deployment ek higher-level abstraction hai jo batata hai "mujhe is app ki 5 copies chahiye, hamesha running honi chahiye." Agar koi copy crash ho jaye, Deployment automatically nayi bana deta hai. Rolling updates se naya version bina downtime ke deploy hota hai — jaise Ola app update hote waqt tumhe kabhi "service unavailable" nahi dikhta.

4. **Services & Networking** - ClusterIP, NodePort, LoadBalancer, Ingress
   Pods ka IP address baar-baar change hota rehta hai (jab woh restart/recreate hote hain). **Service** ek stable address deta hai jisse doosre components reliably connect kar sakein — jaise CRED app ka backend URL kabhi change nahi hota, chahe andar servers kitni baar restart ho jayein.

5. **ConfigMaps & Secrets** - Configuration management, sensitive data
   Database passwords, API keys, environment-specific settings ko code se alag rakhna best practice hai. ConfigMaps normal config ke liye, Secrets sensitive data (passwords, tokens) ke liye — jaise tum apna ATM PIN kabhi bhi kisi document mein hardcode nahi karte, waise hi production secrets ko code mein hardcode nahi karte.

6. **Persistent Storage** - PersistentVolumes, PersistentVolumeClaims, StorageClasses
   Containers by default **ephemeral** hote hain — matlab container delete hote hi andar ka data bhi gayab. Lekin database ka data toh persist karna hi hoga! PersistentVolumes is problem ko solve karte hain — jaise BigBasket ka order history kabhi delete nahi hota, chahe app ka backend kitni baar restart ho.

7. **EKS (AWS Kubernetes)** - Managed Kubernetes, node groups, kubectl setup
   Khud ka Kubernetes cluster manage karna (control plane, master nodes, etc.) kaafi complex hai. AWS ka EKS (Elastic Kubernetes Service) yeh heavy-lifting khud kar leta hai — tum sirf apna application deploy karne pe focus karo, jaise tum Ola book karte ho aur driving khud nahi karte.

8. **Helm Package Manager** - Charts, releases, templating, repositories
   Jab Kubernetes YAML files 10-15 ho jaayein aur environment-wise (dev/staging/prod) alag values chahiye ho, toh Helm kaam aata hai. Helm "npm for Kubernetes" jaisa hai — pre-packaged "charts" install karo (jaise `npm install`), aur templating se ek hi chart ko multiple environments mein reuse karo.

## Prerequisites

Is section ko start karne se pehle yeh cheezein clear honi chahiye:

- **Docker fundamentals** — images, containers, Dockerfile likhna, `docker build`/`docker run` ka basic use aana chahiye. Agar yeh clear nahi hai, pehle Docker ka module complete karo.
- **Basic networking concepts** — IP address, ports, DNS, aur client-server model ka basic samajh. Kubernetes networking heavily in concepts pe based hai.
- **kubectl installed** — Kubernetes cluster ke saath baat karne ke liye CLI tool. Isse tum apne cluster ko commands dete ho (jaise `kubectl get pods`).
- **AWS account** (for EKS section) — kyunki EKS section mein hum real cloud pe managed Kubernetes cluster spin up karenge, ek free-tier ya paid AWS account chahiye hoga.

> [!tip]
> Agar tumhe Docker Compose aur Kubernetes dono naye lagte hain, toh order follow karo jo upar diya gaya hai — pehle Compose se comfortable ho jao (single machine, simpler mental model), phir Kubernetes seekho (multi-machine, production-grade, thoda zyada complex).

## What You'll Build

Is section ke end tak tum yeh sab kar paoge:

- **Orchestrate multi-container applications with Docker Compose** — apna poora dev environment (backend + database + cache + reverse proxy) ek single `docker-compose.yml` file se spin up kar paoge, jaise ek switch dabate hi poora ghar ka electricity system on ho jaye.
- **Deploy and manage applications on Kubernetes** — production-grade cluster pe apps deploy, scale, aur update kar paoge without downtime.
- **Configure services, networking, and storage** — apne microservices ko securely connect kar paoge, aur data ko persist kar paoge taaki restart hone par bhi kuch na khoye.
- **Deploy to managed Kubernetes (AWS EKS)** — real cloud infrastructure pe apna cluster chala paoge, jisse tumhara app duniyabhar mein accessible ho.
- **Use Helm for package management** — complex Kubernetes configurations ko reusable, template-based "charts" mein package kar paoge, jisse deployment process bahut simplify ho jayega.

> [!info]
> Yeh sara knowledge sirf theory nahi hai — real companies (Zomato, Swiggy, Flipkart, Ola) apna backend infrastructure isi tarah ke orchestration tools pe chalate hain. Jo bhi tum yahan seekhoge, woh directly production systems mein use hota hai.

**Previous Section**: [← AWS Essentials](../03_aws_essentials/)  
**Next Section**: [Infrastructure as Code](../05_infrastructure_as_code/) →

## Key Takeaways

- Orchestration ek "manager" ki tarah kaam karta hai jo containers ko schedule, restart, scale, aur network karta hai — bina manual intervention ke.
- Docker Compose single-machine, multi-container apps ke liye best hai — development aur chhoti deployments mein useful.
- Kubernetes production-grade, multi-machine orchestration deta hai — auto-healing, auto-scaling, rolling updates ke saath.
- Pods, Nodes, aur Clusters Kubernetes ke fundamental building blocks hain.
- Deployments aur ReplicaSets ensure karte hain ki tumhare app ki desired number of copies hamesha running rahein.
- Services stable networking address dete hain jab pods ke IP baar-baar change hote rahein.
- ConfigMaps aur Secrets configuration aur sensitive data ko code se cleanly separate karte hain.
- PersistentVolumes ensure karte hain ki important data container restart hone par bhi na kho jaye.
- EKS jaisi managed Kubernetes services cluster management ka overhead reduce karti hain.
- Helm Kubernetes deployments ko package aur template karke reusable aur maintainable banata hai.
