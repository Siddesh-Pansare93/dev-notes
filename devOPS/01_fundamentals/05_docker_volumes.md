# Docker Volumes

Socho tumne ek MySQL container spin up kiya, usme ghanton data daala — users, orders, sab kuch. Ab kal subah tum container ko `docker stop` aur `docker rm` kar dete ho kyunki naya image deploy karna hai. Boom — poora data gayab! Yeh koi bug nahi hai, yeh Docker ka **by-design behavior** hai. Container ephemeral hote hain, matlab disposable. Aur isi problem ko solve karne ke liye Docker Volumes exist karte hain.

Yeh file tumhe volumes ka poora A-Z sikhayegi — named volumes, bind mounts, anonymous volumes, drivers, backup strategies — sab kuch real Zomato/Swiggy jaise examples ke saath.

## Table of Contents
1. [Storage Problem](#storage-problem)
2. [Volume Types](#volume-types)
3. [Named Volumes](#named-volumes)
4. [Bind Mounts](#bind-mounts)
5. [Anonymous Volumes](#anonymous-volumes)
6. [Volume Drivers](#volume-drivers)
7. [Data Persistence Patterns](#data-persistence-patterns)
8. [Backup & Recovery](#backup--recovery)

---

## Storage Problem

**Kya hota hai?** Docker container ek "container layer" pe likhta hai jo ephemeral hoti hai — matlab jaise hi container remove hota hai (`docker rm`), uska poora writable layer bhi disk se delete ho jaata hai. Agar tumne apna database ka data isi layer mein rakha, toh woh bhi saath mein hi udd jaayega.

Socho isko Swiggy delivery boy ki tarah — agar order ka data uske phone ki temporary memory mein hi hai aur delivery complete hote hi phone reset ho jaaye, toh order history kahin save hi nahi hui. Isliye ek central database chahiye jo phone (container) ke lifecycle se independent ho.

```bash
# Data is lost
docker run -d mysql:latest
docker stop <container>
docker rm <container>
# Database data is gone!

# Solution: Use volumes for persistent data
```

> [!warning]
> Yeh sabse common beginner mistake hai — production mein bina volume ke database chalana. Ek `docker system prune` ya accidental `docker rm -f` aur saara customer data poof! Isliye stateful services (database, message queue, file storage) ke saath **hamesha** volume mount karo.

**Kyun zaruri hai?** Container immutable infrastructure ke principle pe chalte hain — matlab tum container ko kabhi bhi destroy karke fresh naya spin up kar sakte ho bina kisi tension ke, agar data alag se persist ho raha ho. Yeh Docker ka superpower hai, lekin sirf tab jab tum data ko sahi jagah rakho.

---

## Volume Types

Docker mein storage ke teen major tareeke hain, aur har ek ka apna use-case hai:

| Type | Location | Use Case | Performance | Portability |
|------|----------|----------|-------------|------------|
| **Named Volume** | `/var/lib/docker/volumes/` | Production databases, long-term data | Good | Limited |
| **Bind Mount** | Host filesystem | Development, config files | Good | Excellent |
| **tmpfs** | RAM | Caches, temporary data | Excellent | Poor |

Isko aise samjho:
- **Named Volume** = tumhara bank locker. Docker khud manage karta hai, tumhe exact location se matlab nahi, bas naam yaad rakho.
- **Bind Mount** = tumhare ghar ka almirah jiska address tumhe pata hai. Direct host path use karte ho, isliye development mein bahut useful — code edit karo, turant container mein reflect ho.
- **tmpfs** = RAM mein temporary notepad. Data kabhi disk pe jaata hi nahi, container band hote hi gayab. Session tokens, cache jaise cheezon ke liye perfect.

---

## Named Volumes

**Kya hota hai?** Named volume Docker khud create aur manage karta hai — tumhe underlying filesystem path se koi matlab nahi rakhna padta. Yeh production databases ke liye best choice hai kyunki Docker isko backup, migrate, aur manage karna aasan banata hai.

### Creating Named Volumes

```bash
# Create a named volume
docker volume create my-database

# List volumes
docker volume ls

# Inspect volume
docker volume inspect my-database
```

### Using Named Volumes

```bash
# Run container with named volume
docker run -d \
  --name mysql \
  -v my-database:/var/lib/mysql \
  -e MYSQL_ROOT_PASSWORD=secret \
  mysql:latest

# Mount point: /var/lib/mysql (inside container)
# Data stored in: /var/lib/docker/volumes/my-database/_data (host)
```

Yahaan `my-database` ek naam hai jo Docker apne internal storage area mein map karta hai. Container ke andar `/var/lib/mysql` path pe jo bhi likha jaayega, woh actually host machine ke `/var/lib/docker/volumes/my-database/_data` mein store hoga — lekin tumhe yeh path directly touch karne ki zarurat kabhi nahi padegi.

### Named Volume in Dockerfile

```dockerfile
FROM mysql:latest

# Declare volume (data goes here)
VOLUME ["/var/lib/mysql"]

ENV MYSQL_ROOT_PASSWORD=secret
```

```bash
# Run without specifying volume - Docker creates anonymous volume
docker run -d mysql-image

# Run with named volume - data persists
docker run -d -v my-db:/var/lib/mysql mysql-image
```

> [!tip]
> Dockerfile mein `VOLUME` declare karna ek "hint" hai ki yeh path persistent data ke liye hai. Lekin agar run time pe tum explicit named volume nahi doge, Docker automatically ek **anonymous volume** bana dega (iske baare mein aage detail mein padhenge).

### Sharing Data Between Containers

Ek IRCTC jaisa scenario socho — ek service ticket generate karti hai (writer), doosri service usko read karke PDF banati hai (reader). Dono ko same data chahiye bina ek doosre se directly baat kiye.

```bash
# Create volume
docker volume create shared-data

# Container 1: writes data
docker run -d --name writer \
  -v shared-data:/data \
  ubuntu sh -c 'while true; do echo "$(date)" >> /data/log.txt; sleep 1; done'

# Container 2: reads data
docker run -it --name reader \
  -v shared-data:/data \
  ubuntu tail -f /data/log.txt

# Both containers access same volume
```

Yahan `shared-data` volume dono containers mein mount ho raha hai — writer usme likhta rehta hai, reader usko live tail karta hai. Yeh pattern microservices architecture mein logs collection, shared cache, ya inter-service file exchange ke liye kaafi use hota hai.

---

## Bind Mounts

**Kya hota hai?** Bind mount seedha host machine ke kisi bhi filesystem path ko container ke andar mount kar deta hai. Named volume ke opposite — yahan tumhe exact host path pata hona chahiye aur specify karna padta hai.

### Basic Bind Mount

```bash
# Run container with bind mount
docker run -d \
  --name app \
  -v /home/user/myapp:/app \
  node:18

# Host path: /home/user/myapp
# Container path: /app
# Files are shared bi-directionally
```

Isko socho ek shared Google Drive folder ki tarah jo dono taraf se sync hota hai — host pe file change karo, container ke andar turant dikhega, aur vice versa.

### Relative Paths

```bash
# Use absolute paths (portable)
docker run -v /home/user/data:/data nginx

# Relative paths work from current directory
docker run -v $(pwd)/config:/etc/app nginx
```

`$(pwd)` use karna bahut common practice hai jab tum current project directory ko mount karna chahte ho — isse tumhe hardcoded absolute path likhne ki zarurat nahi padti, script kahin bhi run karo, current folder khud resolve ho jaayega.

### Read-Only Bind Mounts

```bash
# Container can't modify host files
docker run -d \
  -v /etc/ssl/certs:/certs:ro \
  nginx

# Flags:
# :ro  = read-only
# :rw  = read-write (default)
```

**Kyun zaruri hai?** SSL certificates jaise sensitive files ko container ke andar mount karte waqt `:ro` flag lagana bahut important hai — agar container compromise ho jaaye (jaise koi vulnerability exploit ho), toh attacker host machine ke certificates ko modify nahi kar payega. Yeh security ka basic principle hai — **least privilege**, jitna chahiye utna hi access do.

### Development Workflow

Yeh sabse popular use-case hai bind mounts ka — local development mein hot-reload jaisa experience.

```dockerfile
# Dockerfile for development
FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

# Don't copy source - use bind mount
# CMD ["npm", "start"]
```

```bash
# Development: source code via bind mount
docker run -d \
  --name dev-server \
  -v $(pwd):/app \
  -p 3000:3000 \
  node-app

# Edit source on host → changes reflected in container instantly
```

Matlab jaise tum VS Code mein apna Node.js app edit kar rahe ho — file save karte hi container ke andar bhi wahi changes turant reflect ho jaate hain, bina image ko baar-baar rebuild kiye. `nodemon` jaise tools ke saath combine karo toh feel hoga jaise local machine pe hi kaam kar rahe ho, sirf yeh ki poora environment containerized hai.

### Bind Mount Best Practices

```bash
# ✅ Good: Use for development/source code
docker run -v $(pwd):/app node-app

# ⚠️ Limited portability: Requires specific host path
# Windows: -v C:/Users/user/project:/app
# Linux: -v /home/user/project:/app

# ✅ Better for production: Use named volumes
docker run -v my-db:/data mysql
```

> [!warning]
> Bind mounts production mein risky hote hain kyunki host path Windows, Linux, ya Mac pe alag-alag hota hai. Agar tumhara app kal ek naye server pe deploy hona hai jiska filesystem layout alag hai, toh bind mount tumhe fasa dega. Isliye production data ke liye hamesha named volumes prefer karo.

---

## Anonymous Volumes

**Kya hota hai?** Jab tum `-v /path` likhte ho bina koi naam diye (na host path, na named volume), Docker khud ek random ID ke saath ek volume bana deta hai. Yeh named volume jaisa hi hai bas iska koi human-friendly naam nahi hota.

```bash
# Anonymous volume (no name specified)
docker run -d -v /data mysql

# Docker creates unique named volume automatically
# Volume name: <random_id>

# Volume persists even after container stops
# But hard to reuse across containers
```

Isko socho ek unmarked storage box ki tarah — data safe hai, lekin agla dafa dhoondhna mushkil hoga kyunki koi label hi nahi hai. Isliye production mein anonymous volumes avoid karna chahiye.

### When Anonymous Volumes Are Created

```dockerfile
FROM mysql:latest

# VOLUME declaration creates anonymous volume if not specified
VOLUME ["/var/lib/mysql"]
```

```bash
# Running without explicit volume
docker run -d mysql  # Creates anonymous volume

# List all volumes (including anonymous)
docker volume ls

# Clean up unused anonymous volumes
docker volume prune
```

> [!tip]
> Official MySQL/Postgres images mein `VOLUME` instruction already Dockerfile mein baked hoti hai. Iska matlab agar tum bina `-v` flag ke run karoge, Docker apne aap ek anonymous volume bana dega — data toh persist hoga, lekin tumhe pata nahi chalega ki kaunsa volume kis container ka hai. Isliye hamesha explicit named volume specify karna best practice hai.

---

## Volume Drivers

**Kya hota hai?** Volume driver decide karta hai ki volume ka data actually kahan store hoga — local disk pe, ya kisi remote network storage pe. Default driver `local` hota hai, jo host machine ke disk pe hi store karta hai. Lekin agar tumhe distributed setup chahiye (multiple servers ek hi storage access karein), tab custom drivers kaam aate hain.

### Local Driver (Default)

```bash
# Default: stores on host machine
docker volume create my-volume
# Uses: /var/lib/docker/volumes/my-volume/_data
```

### NFS Driver

Socho tumhare paas Ola jaisi company hai jiska multiple region mein server cluster chal raha hai. Agar sabko ek common file storage access karna hai (jaise driver documents), toh local disk kaafi nahi — tumhe network storage chahiye jo sab servers se accessible ho. Yahan NFS (Network File System) kaam aata hai.

```bash
# Network File System - mount remote NFS share
docker volume create \
  --driver local \
  --opt type=nfs \
  --opt o=addr=192.168.1.100,vers=4,soft,timeo=180,bg,tcp \
  --opt device=:/export/nfs \
  nfs-volume

docker run -d -v nfs-volume:/data mysql
```

### Other Drivers

- **SMB/CIFS** - Windows network shares
- **iSCSI** - Block storage
- **Ceph** - Distributed storage
- **AWS EBS** - In Docker context, often with plugins

> [!info]
> Production Kubernetes clusters mein bhi yehi concept hota hai — bas usko "Persistent Volume" aur "Storage Class" bola jaata hai. Docker ke volume drivers ka concept samajhna tumhe Kubernetes storage samajhne mein bhi help karega jab tum wahan tak pahunchoge.

---

## Data Persistence Patterns

### Pattern 1: Database Volume

Yeh sabse common aur important pattern hai — koi bhi production database ke saath, chahe MySQL ho ya Postgres, named volume mandatory hai.

```bash
# Create database volume
docker volume create postgres-data

# Run with persistent storage
docker run -d \
  --name postgres \
  -v postgres-data:/var/lib/postgresql/data \
  -e POSTGRES_PASSWORD=secret \
  postgres:15

# Data survives container restart
docker restart postgres  # Works!
```

### Pattern 2: Configuration Files

BigBasket jaisi app ka config alag rakhna common hota hai — production mein secrets aur config ko code se separate rakhte hain taaki har environment (dev, staging, prod) ke liye alag-alag values easily switch kar sako, bina image rebuild kiye.

```bash
# Config files on host
ls -la config/
# config.yml
# secrets.env

# Mount into container
docker run -d \
  --name app \
  -v $(pwd)/config/config.yml:/etc/app/config.yml:ro \
  -v $(pwd)/config/secrets.env:/etc/app/.env:ro \
  node-app

# Config changes on host → live in container (read-only)
```

Yahan `:ro` flag lagana zaruri hai kyunki application ko config read karna hai, modify nahi karna. Isse accidental writes se bachte ho.

### Pattern 3: Logs Directory

Debugging ke liye logs kabhi bhi container ke andar hi trap nahi hone chahiye — container delete ho jaaye toh saare logs bhi gayab. Isliye logs directory ko bhi mount karna best practice hai.

```bash
# Persistent logs
docker run -d \
  --name app \
  -v $(pwd)/logs:/app/logs \
  node-app

# Logs survive container deletion
docker rm app
ls -la logs/  # Logs still here!
```

### Pattern 4: Multi-Container Data Sharing

```bash
# Shared volume between services
docker volume create shared-code

docker run -d --name app -v shared-code:/code node-app
docker run -d --name analyzer -v shared-code:/code python-analyzer
```

Yeh pattern useful hai jab ek container code generate kare aur doosra usko process kare — jaise ek CI pipeline mein build artifacts ek stage se doosre stage mein share karna.

---

## Backup & Recovery

**Kyun zaruri hai?** Volume data safe hai jab tak container delete nahi hota, lekin server crash ho jaaye, disk corrupt ho jaaye, ya galti se `docker volume rm` chal jaaye — tab volume ka data bhi gaya. Isliye regular backups lena non-negotiable hai, especially production databases ke liye. Socho CRED ya Paytm jaisi company mein agar transaction data ka backup na ho aur server crash ho jaaye — poora business down!

### Backup Volume Data

Trick yeh hai — ek temporary helper container spin up karo jo volume ko mount kare aur usse tar karke backup folder mein daal de.

```bash
# Create backup from running container
docker run --rm \
  --volumes-from mysql \
  -v $(pwd)/backups:/backup \
  ubuntu tar cvf /backup/mysql.tar /var/lib/mysql

# Result: mysql.tar in backups directory
```

`--volumes-from mysql` ka matlab hai — jo bhi volumes `mysql` container mein mount hain, wahi is temporary `ubuntu` container mein bhi mount ho jaayenge. Isse tumhe path duplicate karne ki zarurat nahi padti.

### Backup Using Tar

```bash
# Full backup of named volume
docker run --rm \
  -v my-database:/data \
  -v $(pwd):/backup \
  ubuntu tar czf /backup/database-$(date +%Y%m%d).tar.gz /data

# Compressed backup with timestamp
```

Yahan `czf` flag ka matlab hai compress (gzip) karke file banana. Timestamp add karna zaruri hai taaki purane backups overwrite na ho jaayein — jaise IRCTC apne ticket booking data ka daily backup rakhta hai date ke saath.

### Restore from Backup

```bash
# Create new volume
docker volume create mysql-restored

# Restore data
docker run --rm \
  -v mysql-restored:/data \
  -v $(pwd)/backups:/backup \
  ubuntu tar xzf /backup/database-20240101.tar.gz -C /data

# Run container with restored volume
docker run -d \
  --name mysql \
  -v mysql-restored:/var/lib/mysql \
  mysql:latest
```

`xzf` flag extract karta hai compressed tar file ko, aur `-C /data` batata hai ki extract kahan karna hai.

### Automated Daily Backups

Manual backup lena bhool jaane ka risk rehta hai, isliye automation zaruri hai. Ek simple bash script bana ke cron job se schedule kar do.

```bash
#!/bin/bash
# backup-volumes.sh

VOLUME_NAME="my-database"
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d-%H%M%S)

docker run --rm \
  -v ${VOLUME_NAME}:/data \
  -v ${BACKUP_DIR}:/backup \
  ubuntu tar czf /backup/backup-${DATE}.tar.gz /data

# Keep last 7 days of backups
find ${BACKUP_DIR} -type f -mtime +7 -delete
```

```bash
# Cron job for daily backups at 2 AM
0 2 * * * /path/to/backup-volumes.sh
```

> [!tip]
> `find -mtime +7 -delete` line disk space bachati hai — purane backups automatically delete ho jaate hain 7 din ke baad. Production mein isko S3 ya cloud storage pe bhi push karna chahiye taaki agar poora server hi gaayab ho jaaye, tab bhi backup safe rahe (offsite backup strategy).

---

## Volume Best Practices

### 1. Use Named Volumes for Persistent Data

```bash
# ✅ Good - production databases
docker run -d -v postgres-data:/var/lib/postgresql/data postgres

# ❌ Bad - anonymous volumes
docker run -d postgres  # Creates unnamed volume
```

### 2. Separate Application and Data Volumes

Code aur data ko mix mat karo — dono ka lifecycle alag hona chahiye. Code deploy pe change hota hai, data nahi.

```bash
# ✅ Good separation
docker run -d \
  --name app \
  -v app-code:/app \
  -v app-data:/data \
  node-app
```

### 3. Use Bind Mounts for Development Only

```bash
# ✅ Development: live code updates
docker run -d -v $(pwd):/app node-app

# ✅ Production: named volume
docker run -d -v app-code:/app node-app
```

### 4. Document Volume Usage

Team ke saath kaam karte waqt sabko pata hona chahiye ki volume kahan mount karna hai — README ya Dockerfile comments mein likh do.

```dockerfile
# Dockerfile
FROM mysql:latest

VOLUME ["/var/lib/mysql"]
EXPOSE 3306

# In comments or README:
# docker run -d \
#   -v mysql-data:/var/lib/mysql \
#   mysql
```

### 5. Regular Backups for Critical Data

```bash
# Automated backup script
#!/bin/bash
for volume in $(docker volume ls -q); do
  docker run --rm \
    -v ${volume}:/data \
    -v /backups:/backup \
    ubuntu tar czf /backup/${volume}-$(date +%Y%m%d).tar.gz /data
done
```

### 6. Clean Up Unused Volumes

Time ke saath bahut saare orphan/dangling volumes accumulate ho jaate hain jo kisi bhi container se attached nahi hote — yeh disk space waste karte hain.

```bash
# Find dangling volumes
docker volume ls -f dangling=true

# Remove dangling volumes
docker volume prune

# Or remove specific volume
docker volume rm unused-volume
```

> [!warning]
> `docker volume prune` chalane se pehle achhe se check kar lo — yeh saare unused volumes ek saath delete kar deta hai, bina confirmation ke important data bhi udd sakta hai agar galti se koi volume kisi container se detach ho gaya ho.

---

## Practical Example: Database with Backup

Chalo ek end-to-end real scenario dekhte hain — jaise ek chhota Flipkart-type app ka database setup with backup strategy.

```bash
# Create volumes
docker volume create mysql-data
docker volume create mysql-backups

# Run MySQL with persistent data
docker run -d \
  --name mysql \
  -v mysql-data:/var/lib/mysql \
  -e MYSQL_ROOT_PASSWORD=secret \
  -e MYSQL_DATABASE=myapp \
  mysql:8.0

# Wait for MySQL to be ready
sleep 10

# Backup script
docker run --rm \
  -v mysql-data:/data \
  -v mysql-backups:/backups \
  ubuntu tar czf /backups/backup-$(date +%s).tar.gz /data

# Restore if needed
docker run --rm \
  -v mysql-data:/data \
  -v mysql-backups:/backups \
  ubuntu bash -c \
    "cd /data && tar xzf /backups/backup-latest.tar.gz --strip-components=1"
```

Notice karo yahan **do alag volumes** hain — ek actual data ke liye (`mysql-data`), doosra backups store karne ke liye (`mysql-backups`). Yeh separation important hai kyunki agar tum backup aur data ko same volume mein rakhoge, aur woh volume corrupt ho jaaye, toh dono cheez saath mein gayab ho jaayengi.

---

## Key Takeaways

- Container ephemeral hote hain — container ke andar likha data `docker rm` ke saath gayab ho jaata hai, isliye persistent data ke liye hamesha volume use karo.
- **Named volumes** Docker khud manage karta hai (`/var/lib/docker/volumes/`) — production databases ke liye best choice, portable aur trackable.
- **Bind mounts** host filesystem ka koi bhi path direct mount karte hain — development mein hot-reload jaisa experience dete hain, lekin production mein host-path dependency ki wajah se limited portability hoti hai.
- **Anonymous volumes** automatically bante hain jab `VOLUME` declare ho ya `-v /path` bina naam ke diya jaaye — data persist toh hota hai lekin naam na hone se track karna mushkil hota hai, isliye avoid karo.
- `:ro` flag lagao jahan container ko sirf read karna hai (SSL certs, config files) — security ke liye least-privilege principle follow karo.
- **Volume drivers** (local, NFS, SMB, Ceph) decide karte hain data actually kahan physically store hoga — distributed/multi-server setups ke liye NFS jaise drivers use hote hain.
- Application code aur persistent data ko **hamesha alag volumes** mein rakho — dono ka lifecycle alag hota hai.
- Backup lena optional nahi hai — `docker run --rm -v volume:/data ... tar czf` pattern yaad rakho, aur isko cron job se automate karo taaki manual bhoolne ka risk na rahe.
- `docker volume prune` careful hoke chalao — dangling volumes clean karta hai but galti se important data bhi delete ho sakta hai.

Next: [Dockerizing Applications](./06_dockerizing_applications.md) - from development to containers
