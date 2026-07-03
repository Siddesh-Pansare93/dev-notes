# Fundamentals - Docker & Containerization

Chalo Siddesh, DevOps ki journey shuru karte hain aur seedha sabse important building block se — **Docker aur Containerization**. Yeh woh cheez hai jo aaj kal har company use karti hai — chahe Flipkart ho, Zomato ho ya koi 2-log ki startup, sabke backend mein containers chal rahe hain. Toh iska deep understanding hona non-negotiable hai.

## Pehle samjho — DevOps hai kya, aur Docker kyun zaruri hai?

Socho tumne apne laptop pe ek Node.js app bana li, sab kuch localhost pe perfectly chal raha hai. Ab tumhe woh app server pe deploy karni hai — production mein. Aur wahan pe woh crash ho jaati hai. Tum apne teammate ko bolte ho "but it works on my machine!" — yeh line itni famous ho gayi hai ki isko "works on my machine" problem hi bol dete hain.

Yeh problem kyun hoti hai? Kyunki tumhare laptop pe Node version 18 hai, server pe 16 hai. Tumhare paas ek specific system library installed hai jo server pe nahi hai. Environment variables alag hain. Basically — **environment mismatch**.

DevOps ek culture/practice hai jo Development aur Operations team ke beech ki deewar todta hai, taaki code likhne se leke deploy karne tak ka poora process automated, reliable aur fast ho. Aur Docker is puri kahani ka hero hai kyunki woh yeh promise deta hai: **"Jo mere machine pe chala, woh hi exact cheez har jagah chalegi — dev, staging, production, sab jagah."**

> [!info]
> Docker ek **containerization platform** hai jo tumhari application ko uske saare dependencies (code, runtime, libraries, environment variables, config files) ke saath ek single package — **container** — mein band kar deta hai. Yeh container kahin bhi run ho sakta hai jahan Docker installed hai.

### Container vs Virtual Machine — sabse pehla confusion

Yeh sabse common doubt hota hai naye logo ko. Dono hi "isolation" dete hain, but bahut different tareeke se.

**Virtual Machine (VM)** ek pura alag ghar hai — apna khud ka bijli connection (kernel), apna paani ka connection (OS), sab kuch separate. Jab tum VMware ya VirtualBox pe VM banate ho, uske andar poora ek naya operating system boot hota hai — apna kernel, apna resource allocation, sab. Isliye VM heavy hota hai — GBs mein size, boot hone mein minutes lagte hain.

**Docker Container** ek PG (paying guest) room jaisa hai. Building ka common infrastructure — bijli, paani, security guard (yeh sab host OS ka kernel hai) — sab share hota hai, but har PG room ka apna alag space, apna alag saaman, apna lock hota hai. Container host machine ke kernel ko hi directly use karta hai, apna alag OS kernel nahi leke chalta. Isliye:

- Container ka size MBs mein hota hai (kabhi kabhi 5-10 MB bhi)
- Container seconds mein start ho jaata hai, VM ki tarah minutes nahi lagte
- Ek machine pe tum 100 containers chala sakte ho, lekin 100 VMs nahi chala paoge (resource ki wajah se)

```
VM Architecture:                    Container Architecture:
┌─────────┐ ┌─────────┐            ┌─────────┐ ┌─────────┐
│  App A  │ │  App B  │            │  App A  │ │  App B  │
├─────────┤ ├─────────┤            ├─────────┤ ├─────────┤
│ Bins/Libs│ │Bins/Libs│            │Bins/Libs│ │Bins/Libs│
├─────────┤ ├─────────┤            └─────────┘ └─────────┘
│Guest OS │ │Guest OS │                  │           │
├─────────┤ ├─────────┤            ┌─────────────────────┐
│Hypervisor│ (VMware) │             │   Docker Engine     │
├─────────────────────┤            ├─────────────────────┤
│      Host OS         │            │      Host OS         │
├─────────────────────┤            ├─────────────────────┤
│      Hardware         │            │      Hardware         │
└─────────────────────┘            └─────────────────────┘
```

> [!tip]
> Interview mein yeh question bahut pucha jaata hai: "Docker vs VM?" — seedha jawaab yeh do: "VM hardware-level virtualization karta hai (apna kernel), Docker OS-level virtualization karta hai (host kernel share karta hai). Isliye containers lightweight, fast-boot aur resource-efficient hote hain."

## Topics Covered — is section mein kya kya seekhoge

Is fundamentals section ko ek building banane jaisa socho — pehle foundation (concepts), phir walls (basics), phir proper finishing (best practices), phir electricity/plumbing (networking/volumes), aur last mein poora ghar ready (real apps dockerize karna). Chalo ek ek topic samajhte hain ki wahan exactly kya milega.

### 1. Introduction to DevOps — culture, principles, tools landscape

Sabse pehle DevOps ka **culture** samjhoge — kyun companies "Dev" aur "Ops" ko alag-alag silo mein nahi rakhna chahti. Traditional model mein Dev team code likh ke "Ops, ab yeh deploy karo" bol ke chali jaati thi, aur jab production mein issue aata tha toh blame-game shuru ho jaata tha. DevOps isko fix karta hai — same team code bhi likhti hai aur uski deployment/monitoring ki responsibility bhi leti hai.

Yahan tumhe milega:
- **CALMS framework** (Culture, Automation, Lean, Measurement, Sharing) — DevOps ke 5 pillars
- CI/CD ka basic idea (detail agle section — `02_ci_cd` mein milega)
- Tools ka landscape — Docker, Kubernetes, Jenkins, GitHub Actions, Terraform, Ansible, Prometheus/Grafana — kaunsa tool kaha fit hota hai

Zomato ka example lo — jab ek naya feature (jaise "10-minute delivery" badge) ka code merge hota hai, DevOps pipeline automatically test karta hai, build karta hai, aur production mein deploy kar deta hai — bina kisi manual "ab main deploy kar deta hoon" wale insaan ke. Yehi automation ka core idea hai.

### 2. Docker Basics — Images, containers, Dockerfile, basic commands

Yeh sabse hands-on part hai. Do cheezein clearly samjhogi:

- **Image** — ek read-only blueprint/template hai (jaise ek recipe ya ek APK file). Yeh define karta hai ki container ke andar kya hoga — OS base, installed packages, tumhara code, sab.
- **Container** — image ka ek running instance hai (jaise us recipe se bani hui actual dish, ya us APK se install hui running app). Ek hi image se tum multiple containers spawn kar sakte ho.

Analogy: Image = Swiggy ka standard recipe card jo har outlet ko diya jaata hai. Container = us recipe se bana hua actual biryani jo ek specific kitchen mein bana. Same recipe, multiple kitchens mein banti hai, lekin har dish apni alag plate mein serve hoti hai.

```bash
# Docker image pull karna (Docker Hub se)
docker pull node:18-alpine

# Container run karna
docker run -d -p 3000:3000 --name my-app node:18-alpine

# Running containers dekhna
docker ps

# Container ke andar shell open karna (debugging ke liye)
docker exec -it my-app sh

# Logs dekhna
docker logs -f my-app

# Container stop/remove karna
docker stop my-app
docker rm my-app
```

Yahan **Dockerfile** bhi milega — ek text file jisme step-by-step instructions likhi jaati hain ki image kaise banegi:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

Har line ek naya **layer** create karti hai — yeh concept aage best practices mein important hoga.

### 3. Dockerfile Best Practices — Multi-stage builds, layer optimization, security

Basic Dockerfile likhna easy hai, lekin **production-grade** Dockerfile likhna alag skill hai. Isme seekhoge:

- **Multi-stage builds** — jaise ek IRCTC ticket booking system mein pehle "build stage" (TypeScript compile, dependencies install) hota hai, phir sirf final compiled output ek chhoti "runtime stage" image mein copy hota hai. Isse final image ka size drastically kam ho jaata hai (kabhi 1GB se 100MB tak).
- **Layer caching** — Docker har instruction ko cache karta hai. Agar tum `COPY package.json` pehle karo aur `npm install` uske baad, toh code change hone pe bhi `npm install` wala layer cache se hi use ho jaayega, dobara run nahi hoga. Yeh build speed bahut improve karta hai.
- **Security** — root user se container run mat karo, unnecessary packages mat rakho, `.dockerignore` use karo (jaise `.gitignore`), secrets ko image ke andar bake mat karo.

> [!warning]
> Bahut common mistake — `.env` file ya API keys ko Dockerfile ke through image mein copy kar dena. Yeh image jahan bhi push hogi (Docker Hub, ECR), tumhare secrets bhi wahan chale jaayenge. Hamesha `.dockerignore` mein `.env` add karo.

### 4. Docker Networking — Bridge, host, overlay networks, port mapping

Jab tumhare paas multiple containers hote hain — jaise ek Node.js API container aur ek Postgres database container — unhe aapas mein baat karni hoti hai. Iske liye Docker alag-alag **network drivers** deta hai:

- **Bridge network** (default) — ek private internal network jaisa hai jisme containers ek dusre se naam se (container name) baat kar sakte hain, jaise ek housing society ke andar flats apne flat number se ek dusre ko dhundh lete hain.
- **Host network** — container directly host machine ka network use karta hai, koi isolation nahi.
- **Overlay network** — multiple physical machines ke across containers ko connect karta hai (Docker Swarm/multi-host setups mein use hota hai).

**Port mapping** (`-p 3000:3000`) samjhoge — host ke port ko container ke andar wale port se map karna, taaki bahar se (browser se) container ke andar chal rahi app tak pahunch sako. Jaise UPI mein tumhara phone number (host port) actual bank account (container port) se mapped hota hai — bahar wala sirf phone number dekhta hai.

### 5. Docker Volumes — Persistent storage, bind mounts, named volumes

Containers by default **ephemeral** hote hain — matlab jaise hi container delete hota hai, uske andar ka saara data bhi gayab ho jaata hai. Ab agar woh container ek database (Postgres/MySQL) chala raha hai, toh yeh disaster hai — restart pe saara data gone!

Isko solve karta hai **Volumes**:
- **Named volumes** — Docker khud manage karta hai storage location, best for databases (jaise CRED apna transaction data kisi reliable, managed jagah rakhta hai, apne app server ke andar nahi).
- **Bind mounts** — tum khud specify karte ho host machine ka koi folder, jo container ke andar ke folder se mirror hota hai. Development mein bahut useful — code change karo laptop pe, turant container ke andar reflect ho jaaye, bina rebuild kiye.

```bash
# Named volume ke saath Postgres run karna
docker run -d --name pg-db \
  -e POSTGRES_PASSWORD=secret \
  -v pgdata:/var/lib/postgresql/data \
  postgres:15

# Bind mount ke saath local dev
docker run -d -p 3000:3000 \
  -v $(pwd):/app \
  -v /app/node_modules \
  my-node-app
```

### 6. Dockerizing Applications — Node.js, Python, full-stack apps

Ab sab kuch ek saath jodoge — real apps ko end-to-end dockerize karoge. Node.js API, Python service, aur ek full-stack app (frontend + backend + database) ko `docker-compose.yml` ke through ek saath spin up karna seekhoge — jaise ek IRCTC jaisa system jisme frontend, backend API, aur database teeno alag containers hain lekin ek command (`docker compose up`) se sab ek saath start ho jaate hain.

```yaml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    depends_on:
      - db
  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: secret
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

## Prerequisites — shuru karne se pehle yeh cheezein clear honi chahiye

- **Basic command line knowledge** — `cd`, `ls`, `mkdir`, file permissions jaisi basic cheezein aani chahiye. Terminal se dosti zaruri hai, kyunki Docker heavily CLI-driven hai.
- **Linux/Unix basics** — samajh honi chahiye ki processes, filesystem, environment variables kaise kaam karte hain. Docker containers under the hood Linux kernel features (namespaces, cgroups) use karte hain.
- **Kisi ek programming language ki familiarity** — tum already Node.js/TypeScript jaante ho, toh yeh already cover hai. Bas concept samajhna hai ki apna app ko container mein kaise fit karna hai.

## What You'll Build — is section ke end tak kya kar paoge

Jab tum yeh poora fundamentals section complete kar loge, tum yeh sab confidently kar paoge:

- **Kisi bhi application ko containerize karna** — chahe woh Node.js ho, Python ho, ya koi aur stack, tum uske liye ek proper Dockerfile likh paoge.
- **Production-ready Dockerfiles likhna** — jisme multi-stage builds, small image size, aur security best practices follow ho.
- **Container networking aur storage manage karna** — multiple containers ko aapas mein connect karna, aur data ko persist karna taaki restart pe data na khoye.
- **Multi-container applications run karna** — Docker Compose ke through poora stack (frontend + backend + DB) ek command se manage karna.

Yeh saari skills tumhe real-world job mein directly kaam aayengi — chahe tum apna khud ka side project deploy kar rahe ho ya company ke production infrastructure pe kaam kar rahe ho.

## Key Takeaways

- Docker containers OS-level virtualization use karte hain (host kernel share hota hai), isliye VMs se lightweight aur fast hote hain.
- **Image** = blueprint (read-only), **Container** = us blueprint ka running instance.
- Dockerfile ki har instruction ek layer banati hai — smart ordering se build caching fast ho jaati hai.
- Multi-stage builds se final image size kam hota hai, security best practices se secrets aur unnecessary attack surface avoid hota hai.
- Networking (bridge/host/overlay) containers ko aapas mein aur bahar duniya se connect karta hai; port mapping se host aur container ports link hote hain.
- Volumes (named ya bind mount) container ke ephemeral nature ko solve karte hain — data restart ke baad bhi safe rehta hai.
- Docker Compose se multi-container apps (frontend + backend + database) ek hi command se manage hoti hain.

**Next Section**: [CI/CD with GitHub Actions](../02_ci_cd/) →
