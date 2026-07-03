# Docker Networking

Socho tumne apne laptop pe teen containers chala diye — ek Node.js app, ek MySQL database, aur ek Nginx reverse proxy. Ab yeh teeno ek dusre se baat kaise karenge? App ko database ka address kaise pata chalega? Outside world se request app tak kaise pahuchegi? Yeh sab sawaal jahan aake milte hain, wahi hai **Docker Networking**.

Isko Zomato ke delivery system se compare karo — restaurant (database container), delivery partner app (backend container), aur customer app (frontend container) — teeno alag-alag "houses" mein baithe hain but ek common network ke through message pass karte hain. Docker networking wahi common network hai jo containers ko ek dusre se discover aur connect hone deta hai.

> [!info]
> Agar tum sirf ek hi container chala rahe ho aur usse bahar se koi baat nahi karni, tab bhi networking implicitly involved hoti hai — kyunki har container by default kisi na kisi network mein hota hi hai.

## Table of Contents
1. [Docker Network Types](#docker-network-types)
2. [Bridge Network](#bridge-network)
3. [Host Network](#host-network)
4. [Overlay Network](#overlay-network)
5. [Container Communication](#container-communication)
6. [Port Mapping](#port-mapping)
7. [DNS Resolution](#dns-resolution)
8. [Network Best Practices](#network-best-practices)

---

## Docker Network Types

**Kya hota hai?** Docker container ke andar ek chhota sa virtual network stack hota hai — apna network interface, apna IP address, apna routing table. Docker in stacks ko connect karne ke liye alag-alag "drivers" provide karta hai, jaise tumhare paas Wi-Fi, Ethernet, aur Hotspot — alag-alag tareeke ek hi kaam (internet connect karna) karne ke.

**Kyun zaruri hai?** Kyunki har use-case ka apna trade-off hai. Ek single machine pe chal rahe do containers ko connect karna alag baat hai, aur do alag data-centers mein chal rahe Swarm cluster ko connect karna bilkul alag challenge hai. Isliye Docker multiple drivers deta hai.

### Built-in Network Drivers

| Driver | Use Case | Scope |
|--------|----------|-------|
| **bridge** | Default, containers on same host | Single host |
| **host** | High performance, direct host access | Single host |
| **overlay** | Multi-host, Docker Swarm/clustering | Multi-host |
| **macvlan** | Direct MAC address assignment | Single/Multi-host |
| **none** | No networking (isolated) | Single host |

Chalo ab har ek ko detail mein samajhte hain — kyunki interview mein bhi yeh sabse common topic hai, aur production mein galat driver choose karna security issue bhi ban sakta hai.

---

## Bridge Network

**Kya hota hai?** Bridge network ek virtual switch jaisa hai jo Docker host ke andar banta hai. Jab tum koi container run karte ho without kisi `--network` flag ke, Docker use is virtual switch se plug kar deta hai — bilkul waise jaise ek building mein saare flats ek common electricity meter board se connected hote hain.

Yeh standalone containers (single host) ke liye **default network driver** hai.

### Default Bridge Network

Docker install hote hi ek network already ban chuka hota hai jiska naam literally `bridge` hai.

```bash
# List networks
docker network ls

# Inspect default bridge
docker network inspect bridge

# Run container on default bridge
docker run -d --name web nginx
```

Yahan tak sab theek lagta hai, lekin is default bridge mein kuch badi limitations hain jo production mein tumhe pareshan karengi.

**Limitations of default bridge:**
- No automatic DNS resolution by container name (matlab ek container doosre ko naam se dhoondh nahi sakta)
- Harder to manage multiple containers
- Limited customization

> [!warning]
> Default bridge pe agar tumne do containers chala diye — `db` aur `app` — toh `app` container ke andar se `mysql -h db` karke connect karne ki koshish karoge toh fail hoga. Kyunki default bridge automatic DNS resolution nahi deta. Yeh sabse common beginner mistake hai jab log Docker Compose use nahi karte.

### User-Defined Bridge Network

**Best practice:** Production mein hamesha user-defined bridge networks use karo, kabhi bhi default bridge pe bharosa mat karo.

Socho isko aise — default bridge ek public WiFi hotspot hai jahan sab connected hain but ek dusre ka naam nahi jaante, sirf IP se dhoondhna padta hai. User-defined network ek society ka private WiFi hai jahan router pe har device ka naam register hota hai — "Siddesh-ka-laptop" type — aur naam se hi connect kar sakte ho.

```bash
# Create a bridge network
docker network create my-network

# Run containers on user-defined network
docker run -d --name db --network my-network mysql:latest
docker run -d --name app --network my-network node-app

# Containers on same user-defined network can communicate by name
# Inside app container: mysql -h db -u root -ppassword
```

Yahan `db` ek hostname ki tarah kaam karta hai — bilkul waise jaise UPI mein tum kisi ka VPA (`name@upi`) use karte ho instead of unka bank account number yaad rakhne ke. IP address change ho sakta hai (jab container restart hota hai), lekin naam wahi rehta hai.

### Why User-Defined Networks?

```bash
# User-defined networks provide:
# 1. Automatic DNS resolution by container name
# 2. Better isolation
# 3. Network-scoped isolation
# 4. Dynamic container connection/disconnection

# Example: docker-compose creates user-defined networks automatically
```

**Kyun zaruri hai in sab cheezon ka?**
- **Automatic DNS**: Naam se connect karo, IP yaad rakhne ki zarurat nahi.
- **Better isolation**: Alag network pe baithe containers ek dusre ko dekh bhi nahi sakte — jaise Swiggy ke different city clusters ek dusre ke orders nahi dekhte.
- **Dynamic connect/disconnect**: Container ko chalte-chalte kisi bhi network se jod ya hata sakte ho, bina usse restart kiye — `docker network connect`/`disconnect` se.

> [!tip]
> Agar tum `docker-compose.yml` use karte ho, toh Compose automatically ek user-defined bridge network bana deta hai tumhare project ke liye — isliye Compose mein service names (jaise `db`, `redis`) directly hostname ki tarah kaam karte hain, koi extra config nahi chahiye.

### Network Inspection

```bash
# Inspect network
docker network inspect my-network

# Output shows:
# {
#   "Name": "my-network",
#   "Driver": "bridge",
#   "Containers": {
#     "abc123...": {
#       "Name": "db",
#       "IPv4Address": "172.19.0.2/16"
#     }
#   }
# }
```

Yeh command debugging ke liye bahut kaam aati hai — jab connection fail ho raha ho, sabse pehle check karo ki dono containers actually usi network pe hain ya nahi.

---

## Host Network

**Kya hota hai?** Host network mode mein container apna alag network namespace hi nahi banata — woh directly host machine ke network stack ko use karta hai. Matlab koi isolation hi nahi hai networking level pe.

Isko aise socho — normal bridge network ek PG room jaisa hai jisme apna alag address hai but building ka common gate use karta hai. Host network matlab tum PG mein nahi, seedha ghar ke main hall mein hi reh rahe ho — koi separate door hi nahi hai.

```bash
# Run container with host network
docker run -d --network host nginx

# Container uses host's ports directly
# Port 80 is bound to host port 80
# Cannot specify port mapping with host network
```

Notice karo — `-p` flag ki yahan zarurat hi nahi (aur use karne ka koi matlab bhi nahi) kyunki container seedha host ke ports use kar raha hai.

### When to Use Host Network

- **Performance-critical applications** - no networking overhead (NAT translation ka overhead bachta hai, thoda sa latency kam hoti hai)
- **Applications needing all host ports** - monitoring agents, tunnels (jaise Prometheus node-exporter jisko poore host ke stats chahiye)
- **Legacy applications** - expecting direct host access

### Security Implications

```bash
# ⚠️ WARNING: Host network bypasses container isolation
# Only use with trusted images and controlled environments

# Bad practice in shared/untrusted environments:
docker run -d --network host suspicious-image
```

> [!warning]
> Host network container isolation ka sabse bada faayda hi khatam kar deta hai. Socho tumne kisi random Docker Hub image ko host network pe chala diya — agar us image mein malicious code hai, toh woh directly tumhare host machine ke saare network ports tak access pa sakta hai, jaise koi delivery boy tumhari building ka master key hi le le. Isliye multi-tenant ya shared servers (jaise office ka shared CI/CD runner) pe host network avoid karo.

---

## Overlay Network

**Kya hota hai?** Ab tak humne single machine ke andar ke containers dekhe. Lekin real production mein tumhare paas ek nahi, kai machines (nodes) hote hain — jaise Flipkart ke servers alag-alag data centers mein spread hote hain. Overlay network un multiple hosts ke containers ko ek hi virtual network mein connect kar deta hai, jaise woh sab ek hi machine pe hon.

Yeh feature Docker Swarm mode ke saath aata hai (multi-host container orchestration).

```bash
# Create overlay network (requires Docker Swarm mode)
docker swarm init
docker network create --driver overlay my-overlay

# Run service on overlay network
docker service create --network my-overlay --name db mysql:latest
docker service create --network my-overlay --name app node-app
```

**Overlay networks use:**
- VXLAN for encapsulation (packets ko ek "tunnel" ke andar wrap karke ek host se dusre host tak bhejna — jaise IRCTC ka train ek tunnel se guzarti hai, andar wala passenger bahar ke traffic se untouched rehta hai)
- Gossip protocol for service discovery (nodes aapas mein "gossip" karke pata lagate hain ki kaunsa service kahan chal raha hai)
- Built-in load balancing (multiple replicas ke beech traffic automatically baant diya jata hai)

> [!info]
> Kyunki tum abhi Node.js/TS background se DevOps seekh rahe ho, overlay network ko Kubernetes ke "Service" concept se relate kar sakte ho — dono ka goal same hai: multiple machines pe chal rahe pods/containers ko ek logical network mein jodna taaki naam se hi ek dusre tak pahuncha ja sake, chahe woh physically kisi bhi node pe ho.

---

## Container Communication

Ab jab hume pata hai networks kaise bante hain, dekhte hain containers actually ek dusre se baat kaise karte hain.

### DNS-Based Communication

**Within user-defined bridge network:** Container ka naam hi uska hostname ban jata hai. Docker ke andar ek embedded DNS server hota hai jo yeh resolution karta hai.

```dockerfile
# app.js
const mysql = require('mysql');
const connection = mysql.createConnection({
  host: 'db',           // Container name as hostname
  user: 'root',
  password: 'secret',
  database: 'myapp'
});
```

Yeh bilkul waise hai jaise tum apne Node app mein environment variable se `DB_HOST=db` set karte ho — code ko yeh fikar karne ki zarurat nahi ki `db` container ka actual IP kya hai, DNS layer woh translation kar deti hai.

### IP-Based Communication

```bash
# Get container IP
docker inspect -f '{{.NetworkSettings.IPAddress}}' my-container

# Ping by IP (within same network)
docker exec app-container ping 172.19.0.2
```

Yeh technically kaam karta hai, lekin **isse avoid karo** production code mein — kyunki container restart hone pe IP change ho sakta hai. Yeh waise hi hai jaise kisi ka ghar ka address yaad rakhne ke bajaye GPS coordinates yaad rakhna — agar building hi shift ho jaye toh coordinates bekaar.

### Service Discovery

```bash
# Docker's embedded DNS server: 127.0.0.11:53

# Inside container:
# - Resolve 'db' → IP of db container
# - Resolve 'db.my-network' → IP of db container
# - Resolve by service name (Swarm mode)
```

Har container ke andar `/etc/resolv.conf` check karoge toh dikhega DNS server `127.0.0.11` set hai — yeh koi real external DNS nahi, Docker ka apna internal resolver hai jo user-defined networks pe automatically kaam karta hai.

---

## Port Mapping

**Kya hota hai?** Container ke andar chal rahi service ka apna internal port hota hai (jaise Node app port 3000 pe sunta hai), lekin outside world (tumhara browser, ya internet) us internal port ko directly access nahi kar sakta jab tak tum explicitly map na karo host ke kisi port se. Yeh bilkul waise hai jaise office ke andar extension number 4521 hai, lekin bahar se call karne ke liye tumhe ek reception number dial karna padta hai jo phir extension pe forward karta hai.

### Basic Port Mapping

```bash
# Map container port to host port
docker run -d -p 8080:80 nginx
# Access: http://localhost:8080

# Map to specific host interface
docker run -d -p 127.0.0.1:8080:80 nginx
# Only accessible locally

# Map to all interfaces
docker run -d -p 0.0.0.0:8080:80 nginx
# Accessible from anywhere
```

Format yaad rakhne ka trick: `-p HOST:CONTAINER` — bayi taraf "bahar ka duniya" (host), dayi taraf "andar ka container".

> [!tip]
> `127.0.0.1:8080:80` bind karna ek security best practice hai jab tumhe sirf localhost se access chahiye, jaise koi internal admin dashboard jo sirf tumhare laptop se open ho, poori duniya se nahi.

### Port Mapping in Dockerfile

```dockerfile
FROM nginx:latest

# EXPOSE documents the port (doesn't actually publish)
EXPOSE 80 443

# Still need -p flag when running:
# docker run -p 8080:80 my-nginx
```

**Common confusion**: `EXPOSE` sirf documentation hai — yeh andar likha hota hai "is image ko is port pe kuch chal raha hoga", lekin actual publishing sirf `docker run -p` ya Compose ke `ports:` se hoti hai. Bahut log soch lete hain `EXPOSE` likhne se port automatically accessible ho jayega — nahi hota.

### Multiple Port Mappings

```bash
# Multiple -p flags
docker run -d \
  -p 80:80 \
  -p 443:443 \
  -p 3000:3000 \
  my-app

# Port ranges
docker run -d -p 8080-8090:80-90 my-app
```

---

## DNS Resolution

### Container Hostname Resolution

```bash
# Default hostname = container ID
docker run -d ubuntu sleep 1000
# Hostname: a3f4b2c1e9d7

# Set custom hostname
docker run -d --hostname myapp ubuntu sleep 1000
# Hostname: myapp

# Set FQDN (requires user-defined network)
docker run -d --network my-network --hostname db.example.com mysql
```

Yeh hostname `hostname` command chalane pe container ke andar dikhta hai — kaafi useful hai logs mein identify karne ke liye ki request kis container se aa rahi hai.

### External DNS

```dockerfile
# Dockerfile with custom DNS
FROM ubuntu:latest

# Override DNS in container
# Use --dns flag when running:
# docker run --dns 8.8.8.8 my-image
```

Agar tumhare company ka koi internal DNS server hai (jaise corporate VPN wale setups mein hota hai), toh `--dns` flag se override kar sakte ho instead of default Google/Docker DNS.

### DNS in User-Defined Networks

```bash
# Create network
docker network create my-network

# Run containers - automatic DNS resolution
docker run -d --name web --network my-network nginx
docker run -d --name api --network my-network node-app

# DNS automatically configured
# web can reach api via 'api' hostname
```

---

## Network Best Practices

Ab tak jo seekha usko concrete rules mein convert karte hain — yeh checklist samajh lo jo tumhe production Docker setups mein follow karni chahiye.

### 1. Use User-Defined Bridge Networks

Default bridge network use hi mat karo production mein. Hamesha apna khud ka network banao.

```bash
# ✅ Good
docker network create app-network
docker run -d --network app-network mysql
docker run -d --network app-network app

# ❌ Bad
docker run -d mysql  # Uses default bridge
docker run -d app    # Uses default bridge
```

### 2. Isolate Networks by Purpose

**Kyun zaruri hai?** Socho tumhare paas ek e-commerce app hai jaisa Flipkart — frontend, backend API, aur database. Agar sab ek hi flat network pe hain, toh agar frontend compromise ho gaya (jaise koi XSS attack), attacker seedha database tak bhi pahunch sakta hai. Alag-alag networks banane se "blast radius" chhota ho jata hai.

```bash
# Separate networks for different concerns
docker network create frontend-network
docker network create backend-network
docker network create db-network

# Frontend services
docker run -d --network frontend-network web-server

# Backend services
docker run -d --network backend-network api-server

# Database
docker run -d --network db-network mysql

# Connect services to multiple networks if needed
docker network connect backend-network web-server
```

Yahan pattern yeh hai: `web-server` frontend aur backend dono networks se juda hai (kyunki usko API call karni hai), lekin `db-network` mein directly access nahi rakhta — sirf `api-server` hi database tak pahunch sakta hai. Yeh bilkul multi-tier security jaisa hai — reception (frontend) directly warehouse (database) mein nahi ghus sakta, sirf ordering department (backend) ke through.

### 3. Security: Only Expose Necessary Ports

```dockerfile
# Dockerfile
FROM node:18

EXPOSE 3000  # Document internal port

# ⚠️ Don't expose unnecessary ports
```

```bash
# Running
# ✅ Good - only expose port 3000
docker run -d -p 3000:3000 app

# ❌ Bad - exposes unnecessary ports
docker run -d -p 3000:3000 -p 5432:5432 -p 6379:6379 app
```

Yahan Postgres (5432) aur Redis (6379) ke ports ko bahar expose karna bilkul galat practice hai — inko sirf internal network ke andar hi accessible hona chahiye, kyunki inhe seedha internet se access karne ki zarurat kabhi nahi hoti. Yeh waise hi hai jaise tum apne ghar ki fridge ka key bahar wale gate pe latka do — koi zarurat nahi.

### 4. Use DNS Names Instead of IP Addresses

```javascript
// ✅ Good
const db = mysql.createConnection({
  host: 'db',  // Works even if IP changes
  user: 'root'
});

// ❌ Bad
const db = mysql.createConnection({
  host: '172.19.0.2',  // Fragile, depends on order
  user: 'root'
});
```

### 5. Document Port Requirements

```dockerfile
FROM node:18

# Clearly document what ports are needed
EXPOSE 3000

# Also document in comments
# - 3000: HTTP server
# - 5000: Health check endpoint (internal only)
```

### 6. Use Health Checks with Port Mapping

```dockerfile
FROM nginx:latest

# Check if service is healthy
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1
```

**Kyun zaruri hai?** `HEALTHCHECK` bina, Docker bas itna hi jaanta hai ki container "running" hai ya "stopped". Lekin ek running container internally crash ho sakta hai (jaise app hang ho gayi, ya database connection drop ho gaya) — health check se Docker (aur orchestrators jaise Swarm/Kubernetes) ko pata chalta hai ki container "unhealthy" hai aur restart karne layak hai.

### 7. Network Across Hosts

```bash
# For single host: bridge network
# For multiple hosts: overlay network (Docker Swarm)

docker swarm init
docker network create --driver overlay shared-network

docker service create \
  --network shared-network \
  --name db \
  mysql:latest

docker service create \
  --network shared-network \
  --name app \
  node-app
```

---

## Practical Example: Multi-Container App

Chalo ab sab kuch ek saath jodte hain — ek chota sa blog application banate hain jisme Postgres database, Node.js app, aur Nginx reverse proxy hai. Yeh bilkul waisa hi setup hai jaisa kisi real startup ke MVP mein hota hai.

```bash
# Create isolated network
docker network create blog-network

# Run database
docker run -d \
  --name postgres \
  --network blog-network \
  -e POSTGRES_PASSWORD=secret \
  postgres:15

# Run application
docker run -d \
  --name app \
  --network blog-network \
  -p 3000:3000 \
  -e DB_HOST=postgres \
  -e DB_PASSWORD=secret \
  node-app

# Run reverse proxy
docker run -d \
  --name nginx \
  --network blog-network \
  -p 80:80 \
  -v nginx.conf:/etc/nginx/nginx.conf \
  nginx:latest

# All containers communicate via DNS:
# app talks to postgres via 'postgres' hostname
# nginx talks to app via 'app' hostname
```

Notice karo yahan sirf `app` (port 3000) aur `nginx` (port 80) hi host pe port map kar rahe hain — `postgres` ka koi `-p` flag nahi hai. Iska matlab database sirf `blog-network` ke andar hi accessible hai, bahar se koi directly connect nahi kar sakta. Yeh exactly wahi "least privilege" principle hai jo humne best practices mein discuss kiya.

Flow kuch aisa chalta hai:
1. Client browser se `http://localhost` pe request aati hai → Nginx (port 80) pakadta hai.
2. Nginx apne config ke through request ko `app` hostname pe forward karta hai (internal, port 3000).
3. `app` container apna DB query `postgres` hostname pe bhejta hai (internal, port 5432, default).
4. Response ulta chain se wapas client tak jaata hai.

Ismein koi bhi step hardcoded IP use nahi karta — sab DNS names pe chal raha hai, jo tumhare containers restart/recreate hone pe bhi tootega nahi.

> [!tip]
> Yehi exact setup agar tum `docker-compose.yml` mein likhte, toh network creation automatic ho jata aur tumhe `docker network create` bhi manually nahi karna padta. Compose seekhna agla natural step hai jab networking clear ho jaye.

---

## Key Takeaways

- Docker 5 built-in network drivers deta hai: **bridge** (default, single host), **host** (no isolation, high perf), **overlay** (multi-host, Swarm), **macvlan** (direct MAC), aur **none** (no networking).
- **Default bridge network** mein automatic DNS resolution by container name nahi milta — isliye production mein hamesha **user-defined bridge network** banao.
- User-defined networks tumhe container-name-based DNS, better isolation, aur dynamic connect/disconnect deta hai.
- **Host network** container isolation ko poori tarah bypass kar deta hai — sirf trusted, performance-critical use-cases mein use karo, shared/untrusted environments mein kabhi nahi.
- **Overlay network** multiple physical hosts ke containers ko ek logical network mein jodta hai — VXLAN encapsulation aur gossip protocol use karke, Docker Swarm mode mein.
- Containers ke beech communication ke liye hamesha **DNS names (container names)** use karo, IP addresses nahi — IP change ho sakta hai, naam nahi.
- **Port mapping (`-p HOST:CONTAINER`)** hi ek container ko outside world se accessible banata hai; `EXPOSE` sirf documentation hai, actual publishing nahi karta.
- Network ko purpose ke hisaab se isolate karo (frontend/backend/db) taaki ek layer compromise hone pe poora system risk mein na aaye — sirf zaruri ports hi expose karo.
- `HEALTHCHECK` add karke ensure karo ki orchestrator ko pata chale container sirf "running" nahi balki actually "healthy" bhi hai.

Next: [Docker Volumes](./05_docker_volumes.md) - persistent storage patterns
