# Dockerfile Best Practices

## Kya Seekhoge Is File Mein

- Dockerfile likhna kaise hai, step by step
- Multi-stage builds se image ka size chhota kaise karein
- Layer caching ka game samajhna — kaise build 10x fast ho sakta hai
- Security ke best practices — production mein image safe kaise rakhein
- Real-world Dockerfiles — Node.js, Python, aur Go ke liye

---

## Dockerfile Hota Kya Hai?

Socho tumhe apne dost ko WhatsApp pe recipe bhejni hai taaki wo bhi wahi dish bana sake — bilkul same taste, same steps, koi variation nahi. **Dockerfile** bhi exactly yeahi cheez hai, but code ke liye. Yeh ek text file hai jisme step-by-step instructions likhe hote hain ki Docker image kaise banani hai — kaunsa base OS chahiye, kaunsi dependencies install karni hain, code kahan copy karna hai, aur container start hone pe kaunsa command chalana hai.

Isko ek building ka "construction blueprint" bhi keh sakte ho. Jaise blueprint follow karke koi bhi mistri wahi building bana sakta hai — chahe Mumbai mein banaye ya Bangalore mein — waise hi Dockerfile follow karke Docker kahin bhi (tumhare laptop pe, CI server pe, ya AWS pe) exactly same image bana dega.

### Basic Structure

```dockerfile
# Every Dockerfile starts with a base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy files
COPY package*.json ./

# Run commands
RUN npm install

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# Define startup command
CMD ["node", "server.js"]
```

Yeh dekho kitna simple hai — top se bottom tak har line ek instruction hai jo Docker ko batati hai "yeh karo, phir yeh karo, phir yeh karo." Bilkul recipe jaisa hi — "pehle pyaz kaato, phir tel garam karo, phir daalo."

---

## Dockerfile Ke Instructions — Ek Ek Karke Samjhte Hain

### FROM - Base Image

Har Dockerfile ka pehla line almost hamesha `FROM` hota hai. Yeh batata hai ki tumhara image kis "foundation" pe bana hai. Socho jaise koi building banate waqt pehle decide karte ho ki plot khali hai ya already kuch structure hai jispe construction karna hai.

```dockerfile
# Official images from Docker Hub
FROM node:18-alpine
FROM python:3.11-slim
FROM nginx:alpine
FROM ubuntu:22.04

# Scratch (empty base for static binaries)
FROM scratch
```

`node:18-alpine` matlab Node.js version 18 already installed hai us base image mein, aur `alpine` ek super lightweight Linux distro hai (jaise ek minimal 1-BHK flat, sirf zaruri cheezein hain, koi extra saaman nahi). `scratch` toh literally khali plot hai — kuch bhi nahi, sirf tumhara compiled binary chalega usme (Go jaise languages ke liye perfect).

### WORKDIR - Set Working Directory

```dockerfile
WORKDIR /app
# All subsequent commands run in /app
# Creates directory if it doesn't exist
```

`WORKDIR` basically `cd` command jaisa hai — tum bol rahe ho "ab se jitne bhi commands chalenge, wo is folder ke andar chalenge." Agar folder exist nahi karta, Docker khud bana dega. Isse tumhare paths clean rehte hain aur confusion nahi hoti ki file kahan gayi.

### COPY vs ADD

```dockerfile
# COPY - preferred for simple file copying
COPY package.json /app/
COPY src/ /app/src/

# ADD - has extra features (tar extraction, URL download)
ADD archive.tar.gz /app/  # Auto-extracts
ADD https://example.com/file.txt /app/  # Downloads file
```

**Best Practice**: `COPY` use karo jab tak `ADD` ke special features (jaise tar extraction ya URL se download) na chahiye ho.

Socho `COPY` ek simple courier delivery hai — jo bheja wahi mila, koi surprise nahi. `ADD` thoda "smart" courier hai jo khud hi package khol ke rakh deta hai ya internet se cheez download kar leta hai — flexible zaroor hai, but unpredictable bhi ho sakta hai. Isliye zyadatar developers `COPY` hi prefer karte hain, kyunki behavior predictable rehta hai.

### RUN - Execute Commands

```dockerfile
# Install dependencies
RUN apt-get update && apt-get install -y curl git

# Chain commands with &&
RUN npm install && npm run build

# Multi-line with \
RUN apt-get update && \
    apt-get install -y \
        curl \
        git \
        vim && \
    rm -rf /var/lib/apt/lists/*
```

`RUN` woh command hai jo image *build* hote waqt chalta hai — matlab yeh ek baar chalta hai jab image bann rahi hoti hai, container start hone pe nahi. Yeh samajhna zaruri hai: `RUN` = build time, `CMD`/`ENTRYPOINT` = run time.

> [!tip]
> Multiple `RUN` commands ko `&&` se chain karo instead of alag-alag `RUN` likhne ke. Har `RUN` ek naya layer banata hai — agar tum `RUN apt-get update` aur `RUN apt-get install` alag likhoge, toh dono layers permanent ho jayenge image mein, chahe baad mein cleanup bhi kar do. Isse image ka size unnecessarily badh jata hai.

### ENV - Environment Variables

```dockerfile
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL=postgres://localhost/mydb

# Use in subsequent commands
RUN echo $NODE_ENV
```

`ENV` se tum environment variables set karte ho jo build ke andar aur container run hone ke baad, dono jagah available rehte hain. Jaise tum Zomato app mein settings mein "city" set karte ho aur woh poore app mein carry hoti hai — waise hi yeh variables poori image mein available rehte hain.

### EXPOSE - Document Ports

```dockerfile
EXPOSE 3000
EXPOSE 8080 443

# Note: This is documentation only!
# Still need -p flag when running: docker run -p 3000:3000 myimage
```

Yahan ek common confusion hoti hai — log sochte hain `EXPOSE` likhne se port automatically open ho jayega. **Galat!** `EXPOSE` sirf documentation hai — yeh doosre developers ko (aur tools jaise Docker Compose ko) batata hai ki "yeh app is port pe sunta hai." Actual port ko host machine se connect karne ke liye tumhe `docker run -p 3000:3000` explicitly likhna hi padega.

Socho isko restaurant ke menu jaisa — menu mein likha hai "Butter Chicken available," lekin waiter tumhe khud order karna padega, sirf menu dekhne se plate tumhare table pe nahi aa jayegi.

### CMD vs ENTRYPOINT

```dockerfile
# CMD - default command (can be overridden)
CMD ["node", "server.js"]
# Override: docker run myimage python app.py

# ENTRYPOINT - command always runs
ENTRYPOINT ["node", "server.js"]
# docker run myimage --port 8080  → runs: node server.js --port 8080

# Combined (ENTRYPOINT + CMD)
ENTRYPOINT ["node"]
CMD ["server.js"]
# Default: node server.js
# Override: docker run myimage app.js → node app.js
```

Yeh dono confusing lagte hain shuru mein, lekin simple analogy se clear ho jayega:

- **CMD** ek "default order" jaisa hai Swiggy pe — agar tum kuch specify nahi karte, restaurant apna "chef's special" bhej dega. Lekin tum chaho toh order change kar sakte ho.
- **ENTRYPOINT** ek fixed cheez hai — jaise IRCTC ka ticket booking flow, jo hamesha chalega hi chalega, tum sirf kuch extra options (jaise seat preference) de sakte ho, poora flow change nahi kar sakte.

Jab dono combine karte ho (`ENTRYPOINT` + `CMD`), toh `ENTRYPOINT` fixed command banta hai aur `CMD` uske default arguments — jo tum runtime pe override kar sakte ho.

### ARG - Build Arguments

```dockerfile
ARG NODE_VERSION=18
FROM node:${NODE_VERSION}-alpine

ARG BUILD_DATE
RUN echo "Built on $BUILD_DATE"

# Build with: docker build --build-arg NODE_VERSION=20 .
```

`ARG` sirf build time pe available hota hai (`ENV` ke uljat, jo runtime pe bhi available rehta hai). Isse tum apni Dockerfile ko flexible bana sakte ho — jaise ek hi Dockerfile se Node 18 ya Node 20 dono ka image bana sakte ho, bina Dockerfile change kiye.

### USER - Security

```dockerfile
# Don't run as root!
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Now all commands run as appuser
CMD ["node", "server.js"]
```

**Kyun zaruri hai?** Agar tum container root user se chalate ho aur koi attacker tumhare app mein vulnerability dhoondh leta hai, toh usko seedha root access mil jayega — jaise ghar ka master key hi chori ho gaya. `USER` instruction se hum ek limited-permission user banate hain aur usi se app chalate hain, taaki agar koi break-in bhi ho, damage limited rahe.

---

## Images Build Karna

### Build Command

```bash
# Build image from Dockerfile in current directory
docker build -t myapp:latest .

# Build with custom Dockerfile name
docker build -t myapp:v1.0 -f Dockerfile.prod .

# Build with build args
docker build --build-arg NODE_VERSION=20 -t myapp .

# Build without cache (force rebuild)
docker build --no-cache -t myapp .

# View build history
docker history myapp:latest
```

`docker build -t myapp:latest .` mein `-t` matlab "tag" — image ko naam aur version dena, jaise packet pe label lagana. Aakhri `.` batata hai "build context" — matlab is folder ke andar ki saari files Docker daemon ko available rahengi build ke waqt.

---

## Multi-Stage Builds

**Problem**: Build tools (compilers, dev dependencies, source code) tumhare final image ka size unnecessarily bada dete hain.

**Solution**: Multi-stage builds use karo — build environment aur runtime environment ko alag-alag rakho.

Socho isko aise — jab tum ghar shift karte ho, packers-movers wale poora truck bharke laate hain packing material, tape, bubble wrap, etc. But jab saaman final ghar mein set ho jata hai, tumhe wo packing material nahi chahiye — sirf furniture chahiye. Multi-stage build bhi yehi karta hai: ek "packing stage" (build stage) hoti hai jahan sab tools use hote hain, aur phir sirf final zaruri cheezein "asli ghar" (production image) mein copy hoti hain — baaki sab (compilers, dev dependencies, source code ka clutter) peeche chhoot jata hai.

### Example: Node.js Application

```dockerfile
# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Stage 2: Production
FROM node:18-alpine

WORKDIR /app

# Copy only necessary files from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

**Result**: Final image mein sirf production dependencies aur built files hote hain — build tools, source TypeScript files, dev dependencies sab peeche chhoot jate hain.

### Example: Go Application

```dockerfile
# Stage 1: Build
FROM golang:1.21-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server .

# Stage 2: Runtime (tiny image!)
FROM alpine:latest

RUN apk --no-cache add ca-certificates
WORKDIR /root/

# Copy only the binary
COPY --from=builder /app/server .

EXPOSE 8080
CMD ["./server"]
```

**Result**: Image size ~300MB (Go builder ke saath) se ghatke ~10MB (Alpine + sirf binary) ho jata hai. Yeh farak dekhoge toh yakeen nahi hoga — jaise ek poore truck ka saaman ek chhote suitcase mein fit ho gaya!

> [!info]
> Go jaisi compiled languages ke liye multi-stage builds sabse zyada dramatic result dete hain kyunki final binary ko sirf ek chhoti OS layer chahiye hota hai chalne ke liye — poora Go compiler chahiye hi nahi runtime pe.

---

## Layer Caching Optimization — Build Ko Fast Kaise Banayein

**Kaam kaise karta hai?** Docker har instruction (`FROM`, `COPY`, `RUN`, etc.) ko ek "layer" banata hai aur unhe cache kar leta hai. Agar koi layer pehle jaisa hi hai (koi change nahi hua), Docker usse dobara build nahi karta — seedha cache se utha leta hai. Isse build bahut fast ho jata hai.

Socho isko IRCTC ki tatkal booking jaisa — agar tumne pehle hi apna login, payment details save kar rakhe hain, toh dobara se sab kuch fill nahi karna padta, seedha "confirm" pe click karke ticket book ho jati hai. Docker cache bhi yehi karta hai — jo pehle se same hai, use dobara nahi karta.

**Yahan sabse important rule hai**: order matters! Jo cheez kam badalti hai (dependencies) usse pehle copy karo, jo cheez zyada badalti hai (application code) usse baad mein.

### ❌ Bad (Slow Builds)
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copies everything first → cache invalidated on ANY file change
COPY . .

RUN npm install  # Runs every time, even if package.json didn't change
```

Isme dikkat kya hai? `COPY . .` poori codebase copy karta hai sabse pehle. Ab agar tumne sirf ek `README.md` file change ki, toh Docker sochega "kuch toh change hua hai" aur `RUN npm install` ko dobara se chalayega — chahe `package.json` bilkul same ho! Yeh waise hi hai jaise tum sirf apna phone number update karna chahte ho lekin form dobara se poora bharna pad raha ho.

### ✅ Good (Fast Builds)
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy dependency files first (changes infrequently)
COPY package*.json ./

# Install dependencies (cached unless package.json changes)
RUN npm ci --only=production

# Copy application code last (changes frequently)
COPY . .

CMD ["node", "server.js"]
```

**Result**: Dependencies sirf tabhi reinstall hoti hain jab `package.json` mein actually koi change ho. Agar tumne sirf `server.js` mein ek line change ki, `npm ci` wala step cache se hi utha liya jayega — build seconds mein ho jayega instead of minutes.

> [!tip]
> Yeh ek single sabse impactful optimization hai jo tum kar sakte ho apne Dockerfile mein. CI/CD pipelines mein yeh minutes bacha sakta hai, especially jab tumhare paas bade `node_modules` ya Python packages hon.

---

## Security Best Practices

### 1. Use Specific Image Tags

```dockerfile
# ❌ Bad - version can change unexpectedly
FROM node:latest

# ✅ Good - pinned version
FROM node:18.17.1-alpine
```

**Kyun zaruri hai?** `latest` tag ek moving target hai — aaj `node:latest` version 18 point kar raha hai, kal ko 20 ho jayega, aur tumhara build achanak break ho sakta hai bina koi code change kiye. Yeh waise hi hai jaise Swiggy pe "chef's special" order karo — kabhi kuch aayega, kabhi kuch. Production mein tumhe pata hona chahiye exactly kya chal raha hai — isliye specific version pin karo.

### 2. Don't Run as Root

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

EXPOSE 3000
CMD ["node", "server.js"]
```

Default mein Docker containers root user se chalte hain — jo ek bahut bada security risk hai. Agar attacker ne kisi tarah tumhare app mein remote code execution vulnerability dhoondh li, toh root access ka matlab hai wo poore container ke andar kuch bhi kar sakta hai — files delete karna, mount points access karna, sab kuch. Non-root user banake sirf zaruri permissions dena — jaise ek office mein intern ko admin panel access nahi dete, sirf uske kaam ke liye jitna chahiye utna hi dete hain.

### 3. Minimize Image Size

```dockerfile
# Use Alpine-based images (smaller)
FROM node:18-alpine  # ~100MB
# vs
FROM node:18         # ~900MB

# Remove unnecessary files
RUN npm ci --only=production && \
    npm cache clean --force && \
    rm -rf /tmp/*
```

Chhota image = faster download, faster deploy, kam attack surface (kam packages matlab kam potential vulnerabilities). `node:18-alpine` aur `node:18` mein 9x ka farak hai! Yeh production mein directly translate hota hai faster deployments aur kam bandwidth cost mein.

### 4. Don't Include Secrets

```dockerfile
# ❌ NEVER do this
ENV API_KEY=abc123
COPY .env /app/

# ✅ Use environment variables at runtime
docker run -e API_KEY=abc123 myapp
# Or use Docker secrets (Kubernetes, Docker Swarm)
```

> [!warning]
> Yeh sabse common aur sabse dangerous mistake hai! Agar tumne `ENV API_KEY=abc123` Dockerfile mein hardcode kar diya, toh yeh permanently image ke layers mein baked ho jayega — koi bhi `docker history` ya image layers inspect karke tumhari API key nikal sakta hai, chahe tumne baad mein hi remove kyun na kiya ho. Bilkul waise hi jaise tumne apna ATM PIN kisi WhatsApp group mein bhej diya — message delete kar bhi do, screenshot toh le hi liya gaya hoga. Secrets hamesha runtime pe environment variables ya proper secret managers (Kubernetes Secrets, AWS Secrets Manager, Docker Swarm secrets) se inject karo, kabhi image mein bake mat karo.

### 5. Use .dockerignore

```
# .dockerignore file (like .gitignore)
node_modules/
npm-debug.log
.env
.git/
.vscode/
*.md
tests/
coverage/
```

`.dockerignore` bilkul `.gitignore` jaisa hi kaam karta hai — batata hai Docker ko "yeh files build context mein include mat karo." Isse do fayde hain: pehla, build fast hota hai (kam files transfer honi hai Docker daemon ko), aur dusra — accidentally secrets ya bade folders (`node_modules`) image mein leak nahi hote.

### 6. Scan Images for Vulnerabilities

```bash
# Docker scan (requires Docker Hub account)
docker scan myapp:latest

# Trivy scanner
trivy image myapp:latest

# Snyk
snyk container test myapp:latest
```

Jaise tum ghar kharidne se pehle structural inspection karwate ho, waise hi production mein deploy karne se pehle image ko scan karo. Yeh tools tumhare base image ke andar known CVEs (vulnerabilities) dhoondh nikalte hain — puraana OpenSSL version, outdated library, etc. CI/CD pipeline mein yeh step add karna best practice hai taaki vulnerable image production mein jaaye hi na.

---

## Real-World Dockerfiles

Ab dekhte hain kaise yeh saare concepts real production Dockerfiles mein combine hote hain.

### Node.js + Express API

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Production stage
FROM node:18-alpine

WORKDIR /app

ENV NODE_ENV=production

# Create user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

CMD ["node", "server.js"]
```

Notice karo `HEALTHCHECK` instruction — yeh Docker ko batata hai container "zinda" hai ya nahi, sirf process running hone se nahi, balki application actually properly respond kar raha hai ya nahi (jaise Ola app mein driver "online" dikh raha hai but actually ride accept nahi kar raha — health check aisi situations pakadta hai). Orchestrators jaise Kubernetes isko use karte hain yeh decide karne ke liye ki container ko restart karna hai ya nahi.

### Python + FastAPI

```dockerfile
FROM python:3.11-slim AS builder

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Production stage
FROM python:3.11-slim

WORKDIR /app

# Copy Python dependencies
COPY --from=builder /root/.local /root/.local

# Copy application
COPY . .

# Create non-root user
RUN useradd -m -u 1001 appuser && \
    chown -R appuser:appuser /app

USER appuser

# Make sure scripts in .local are usable
ENV PATH=/root/.local/bin:$PATH

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Yahan `pip install --user` ka use interesting hai — yeh packages ko `/root/.local` mein install karta hai, jo phir builder stage se production stage mein copy ho jata hai. Isse pura `pip` cache aur build tools peeche chhoot jaate hain.

### React Frontend (Static Build)

```dockerfile
# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/build /usr/share/nginx/html

# Copy custom nginx config (optional)
# COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

Yeh interesting hai — React app compile hone ke baad sirf static HTML/CSS/JS files banti hain, unhe run karne ke liye poora Node.js runtime chahiye hi nahi. Isliye final stage mein hum Node.js ko poori tarah drop karke ek super-light `nginx:alpine` image use karte hain sirf files serve karne ke liye. Yeh multi-stage builds ki asli power hai — build language aur runtime language bhi different ho sakte hain!

---

## Dockerfile Best Practices — Summary Cheat Sheet

✅ **Official, minimal base images use karo** (Alpine, Debian slim)
✅ **Specific versions pin karo** (`latest` mat use karo)
✅ **Layers ko change-frequency ke hisaab se order karo** (dependencies pehle, code baad mein)
✅ **Multi-stage builds use karo** final image size minimize karne ke liye
✅ **Non-root user se run karo**
✅ **.dockerignore use karo** unnecessary files exclude karne ke liye
✅ **RUN commands combine karo** layers kam rakhne ke liye
✅ **Health checks add karo**
✅ **Images ko vulnerabilities ke liye scan karo**
✅ **Images mein secrets mat daalo**

---

## Exercise

### Task 1: Ek Node.js App Dockerize Karo

Ek simple Express app banao aur usse Dockerize karo:

```bash
# 1. Create project
mkdir my-express-app && cd my-express-app
npm init -y
npm install express

# 2. Create server.js
cat > server.js << 'EOF'
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ message: 'Hello from Docker!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
EOF

# 3. Create Dockerfile (write this yourself using best practices!)
# 4. Create .dockerignore
# 5. Build: docker build -t my-express-app .
# 6. Run: docker run -p 3000:3000 my-express-app
# 7. Test: curl http://localhost:3000
```

Khud se try karo — is file mein jitne bhi best practices seekhi (multi-stage, layer ordering, non-root user), sab apply karke dekho. Jab tak khud likhoge nahi, muscle memory nahi banegi!

### Task 2: Ek Image Ko Optimize Karo

Image sizes compare karo:

```bash
# Build without optimization
docker build -t myapp:unoptimized -f Dockerfile.bad .

# Build with multi-stage and best practices
docker build -t myapp:optimized -f Dockerfile.good .

# Compare sizes
docker images | grep myapp
```

Do Dockerfiles banao — ek bina kisi optimization ke (single stage, `COPY . .` pehle, root user), aur doosra is guide ki saari best practices ke saath. Fark khud apni aankhon se dekho — ho sakta hai 5-10x ka difference mile size mein!

---

## Key Takeaways

- Dockerfile ek blueprint hai jo batata hai image kaise banegi — top se bottom, step by step instructions.
- `COPY` ko `ADD` ke upar prefer karo jab tak special features (tar extraction, URL download) na chahiye ho.
- `RUN` build time pe chalta hai, `CMD`/`ENTRYPOINT` runtime pe — yeh distinction samajhna zaruri hai.
- `EXPOSE` sirf documentation hai — actual port mapping ke liye `docker run -p` chahiye hi hoga.
- Multi-stage builds se build tools aur dev dependencies final image se bahar rakh sakte ho — image size drastically kam hota hai (Go example mein 300MB se 10MB tak!).
- Layer caching optimize karne ka golden rule: jo kam badalta hai (dependencies) pehle copy karo, jo zyada badalta hai (source code) baad mein.
- Security ke liye — specific versions pin karo, non-root user use karo, secrets kabhi image mein bake mat karo, aur `.dockerignore` zaroor rakho.
- Production images ko hamesha vulnerability scanners (Trivy, Snyk) se scan karo deploy karne se pehle.
- Alpine-based images use karke image size 9x tak kam kiya ja sakta hai (`node:18` ~900MB vs `node:18-alpine` ~100MB).

---

**Next**: [Docker Networking](./04_docker_networking.md) → Containers ko aapas mein connect karna
