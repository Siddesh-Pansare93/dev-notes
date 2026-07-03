# Dockerizing Applications

Ab tak humne Docker ke concepts theory mein padhe — images, containers, layers, sab kuch. Ab time hai haath gande karne ka. Is note mein hum real-world apps ko dockerize karenge — Node.js, Python, full-stack setup, sab kuch practical Dockerfile aur docker-compose examples ke saath.

Socho isko aise — abhi tak tumne cooking recipes padhi hain, ab actual kitchen mein khana bana rahe ho. Node.js app ko dockerize karna, Python Flask app ko containerize karna, multiple services (frontend + backend + database + cache) ko ek saath chalana — yeh sab is note mein cover hoga.

## Table of Contents
1. [Dockerizing Node.js Apps](#dockerizing-nodejs-apps)
2. [Dockerizing Python Apps](#dockerizing-python-apps)
3. [Full-Stack Applications](#full-stack-applications)
4. [Multi-Stage Builds for Size](#multi-stage-builds-for-size)
5. [Environment-Specific Configurations](#environment-specific-configurations)
6. [Debugging Containerized Apps](#debugging-containerized-apps)
7. [Performance Optimization](#performance-optimization)

---

## Dockerizing Node.js Apps

Tum khud ek Node.js/TypeScript developer ho, toh yeh section tumhare liye sabse relatable hoga. Har Node app ko dockerize karne ka basic pattern same hota hai — package files copy karo, dependencies install karo, source code copy karo, port expose karo, aur app start karo.

### Simple Express Server

Yeh sabse basic Dockerfile hai — jaise Zomato ka MVP version tha shuru mein, bas kaam chalao, baad mein optimize karenge.

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start application
CMD ["node", "index.js"]
```

Yahan `npm ci` ka use dhyaan se dekho — `npm install` nahi. Kyun? Kyunki `npm ci` (clean install) `package-lock.json` ko exactly follow karta hai, koi surprise version upgrade nahi hota. Production mein tumhe deterministic, reproducible builds chahiye — jaise IRCTC ka ticket booking system same input pe hamesha same output de, waise hi tumhara build hamesha same dependencies install kare, chahe kabhi bhi run karo.

`HEALTHCHECK` instruction bhi important hai. Yeh Docker ko batata hai ki container "healthy" hai ya nahi — sirf process chal rahi hai isse kaam nahi chalega, actual HTTP request bhejke check karo ki server respond kar raha hai ya nahi. Socho isko restaurant ke quality inspector jaisa — bas kitchen khula hai yeh check karna kaafi nahi, khana actually ban raha hai ya nahi yeh bhi check karna padta hai.

```bash
# Build image
docker build -t my-node-app .

# Run container
docker run -d -p 3000:3000 my-node-app
```

### Node.js .dockerignore

`Kyun zaruri hai?` — `.dockerignore` file na ho toh Docker build context mein `node_modules/` jaisi bhaari-bharkam folders bhi bhej dega, jisse build slow ho jayega aur image bhi bloat ho jayegi. Yeh bilkul `.gitignore` jaisa concept hai, bas Git ke bajaye Docker build ke liye.

```
# .dockerignore - exclude unnecessary files

node_modules/
npm-debug.log
.git
.env
.env.local
dist/
coverage/
.DS_Store
*.md
```

> [!warning]
> `.env` file ko `.dockerignore` mein daalna mat bhoolna — agar accidentally image mein secrets (DB passwords, API keys) chale gaye, toh woh image jahan bhi push hogi (Docker Hub, private registry), secrets leak ho sakte hain. Yeh CRED jaisi company ke liye nightmare scenario hai.

### Development vs. Production

Real projects mein tumhe dev aur prod ke liye alag-alag setup chahiye hota hai. Dev mein tumhe hot-reload, dev dependencies (nodemon, eslint) chahiye; prod mein tumhe sirf minimal, secure, fast image chahiye. Multi-stage build isko ek hi Dockerfile mein handle karta hai — do alag "stages" define karke.

```dockerfile
# Multi-stage: development and production

# Stage 1: Development
FROM node:18 AS development
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "dev"]

# Stage 2: Production build
FROM node:18-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]
```

`--target` flag se batate ho ki kaunsa stage build karna hai:

```bash
# Build for development
docker build --target development -t my-app:dev .

# Build for production
docker build --target production -t my-app:latest .
```

Socho isko aise — ek hi recipe book mein do recipes likhi hain, "Ghar ke liye simple dal" aur "Restaurant ke liye premium dal". Dono same base ingredients use karte hain but final steps alag hote hain.

### Hot Reload in Development

Dev mode mein har chhoti change ke baad image rebuild karna time-waste hai. Isliye source code ko volume mount karte hain — host machine ki file directly container ke andar reflect hoti hai, aur `nodemon` change detect karke server restart kar deta hai.

```bash
# Mount source code and watch for changes
docker run -d \
  --name app-dev \
  -v $(pwd):/app \
  -p 3000:3000 \
  my-app:dev

# nodemon will restart on file changes
```

> [!tip]
> Volume mount ka matlab hai container ke andar ka `/app` folder aur tumhare local machine ka current directory "sync" ho gaye — jaise Google Drive sync folder, jo bhi change karo local mein, turant dusri jagah reflect ho jata hai.

---

## Dockerizing Python Apps

Ab Python side dekhte hain. Pattern same hi hai — dependency file copy karo (yahan `requirements.txt`), install karo, phir code copy karo. Bas Python mein ek extra cheez hoti hai — kabhi kabhi system-level dependencies (jaise `gcc` compiler) bhi chahiye hoti hain kuch packages compile karne ke liye.

### Flask Application

```dockerfile
# Dockerfile for Flask app
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
  gcc \
  && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

EXPOSE 5000

ENV FLASK_APP=app.py
ENV FLASK_ENV=production

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]
```

Kaafi baar dekha jayega — Flask app ko production mein sirf `flask run` se nahi chalate, `gunicorn` jaisa WSGI server use karte hain, kyunki Flask ka built-in dev server production traffic handle karne ke liye design hi nahi hua. Yeh waise hi hai jaise ek chhote se ghar ke tandoor pe tum Dominos jaisa order volume handle nahi kar sakte — proper commercial kitchen (gunicorn) chahiye hota hai.

```bash
# Build and run
docker build -t my-flask-app .
docker run -d -p 5000:5000 my-flask-app
```

### FastAPI Application

FastAPI aajkal kaafi popular ho raha hai — fast, async, aur type-safe. Iska Dockerfile Flask jaisa hi hai, bas server `uvicorn` hota hai (ASGI server, async support ke liye).

```dockerfile
# Dockerfile for FastAPI
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

HEALTHCHECK --interval=30s CMD python -c "import requests; requests.get('http://localhost:8000/health')" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Python .dockerignore

Python ke apne junk files hote hain — compiled bytecode, virtual envs, cache folders. Yeh sab image mein nahi jaane chahiye.

```
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
env/
venv/
.venv
.coverage
htmlcov/
dist/
build/
*.egg-info/
.pytest_cache/
.mypy_cache/
```

### Virtual Environment in Docker

Yeh thoda confusing point hai naye developers ke liye — "Docker container toh already isolated hai, phir virtual env kyun chahiye andar?" Achha sawaal hai. Container image build karte waqt agar tum `venv` use karte ho, toh multi-stage builds mein sirf venv folder ko copy kar sakte ho ek stage se dusre stage mein — bina poore Python installation ko duplicate kiye. Isse clean separation milta hai dependencies ka.

```dockerfile
# Creating venv in Docker (creates clean isolation)
FROM python:3.11

WORKDIR /app

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["python", "app.py"]
```

---

## Full-Stack Applications

Ab asli maza yahan hai — real production apps mein sirf ek container nahi hota, multiple services milke poora system banate hain. Frontend, backend, database, cache, reverse proxy — sabko ek saath orchestrate karne ke liye `docker-compose` use karte hain.

### Kya hota hai Docker Compose?

Socho tumhare paas Swiggy jaisa app hai — frontend (React), backend API (Node.js), database (Postgres), cache (Redis), aur reverse proxy (Nginx) — yeh paanch alag "services" hain, aur inhe manually `docker run` se ek-ek karke start karna, network connect karna, dependencies manage karna — bahut painful hoga. `docker-compose.yml` file mein tum ek hi jagah sab services define karte ho, aur ek command se poora stack up ho jata hai.

### Docker Compose for Multi-Container App

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: app-frontend
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://localhost:5000
    depends_on:
      - backend
    networks:
      - app-network

  # Backend API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: app-backend
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgresql://user:password@db:5432/myapp
      - REDIS_URL=redis://cache:6379
    depends_on:
      db:
        condition: service_healthy
      cache:
        condition: service_started
    networks:
      - app-network

  # PostgreSQL Database
  db:
    image: postgres:15
    container_name: app-postgres
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: myapp
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-network

  # Redis Cache
  cache:
    image: redis:7-alpine
    container_name: app-redis
    ports:
      - "6379:6379"
    networks:
      - app-network

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: app-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - frontend
      - backend
    networks:
      - app-network

networks:
  app-network:
    driver: bridge

volumes:
  postgres-data:
```

Kuch important cheezein yahan gaur karo:

- **`depends_on` with `condition: service_healthy`** — backend service tabhi start hoga jab database ka `healthcheck` pass ho jaye, sirf container "started" hone se kaam nahi chalega. Yeh bahut common mistake hai — log sochte hain container start = database ready, lekin Postgres ko fully initialize hone mein kuch second lagte hain. Agar backend usse pehle connect karne ki koshish kare, toh crash ho jayega.
- **`networks: app-network`** — sab services ek hi custom bridge network pe hain, isliye woh ek-dusre ko service name se refer kar sakte hain (jaise `db:5432`, `cache:6379`) — jaise ek building mein sab flats ek hi intercom system pe connected hon, room number bolke connect ho jao, poora address nahi batana padta.
- **`volumes: postgres-data`** — yeh named volume hai jo database ka data persist karta hai. Container delete ho jaye tab bhi data safe rehta hai — bilkul jaise tumhara bank ka data CRED app delete karne se nahi udta, woh server pe persist rehta hai.

```bash
# Start entire stack
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Remove volumes too
docker-compose down -v
```

> [!warning]
> `docker-compose down -v` chalane se named volumes bhi delete ho jate hain — matlab tumhara database data bhi gayab. Production mein kabhi bhi `-v` flag galti se mat lagana, warna poora customer data wipe ho sakta hai.

### Nginx Configuration for Full-Stack

Nginx yahan "reverse proxy" ka role play kar raha hai — ek single entry point jo requests ko sahi service ki taraf route karta hai. Socho isko building ke reception desk jaisa — visitor reception pe aata hai, bolta hai "mujhe HR department jaana hai" ya "mujhe Sales department jaana hai", aur reception unhe sahi floor bhej deta hai. Client ko yeh pata nahi hota ki backend `backend:5000` pe chal raha hai ya kahin aur — sab kuch ek hi domain (`localhost` ya production domain) se serve hota hai.

```nginx
# nginx.conf
upstream frontend {
  server frontend:3000;
}

upstream backend {
  server backend:5000;
}

server {
  listen 80;
  server_name _;

  # Frontend
  location / {
    proxy_pass http://frontend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }

  # Backend API
  location /api/ {
    proxy_pass http://backend/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }

  # Static files with caching
  location ~* \.(js|css|png|jpg|gif|ico|woff|woff2)$ {
    proxy_pass http://frontend;
    proxy_cache_valid 200 1d;
    add_header Cache-Control "public, max-age=86400";
  }
}
```

Yahan `/` pe request aaye toh frontend ko jaata hai, `/api/` pe request aaye toh backend ko — bilkul Flipkart ke website jaisa, jahan `flipkart.com/` alag hai aur `flipkart.com/api/orders` alag backend service handle karti hai, lekin user ko URL bar mein sab kuch ek hi domain pe dikhta hai.

---

## Multi-Stage Builds for Size

### Kyun zaruri hai image size chhota rakhna?

Bada image matlab — slow deployment, zyada storage cost, zyada attack surface (security risk), aur slow container startup. Socho isko aise — agar tumhe office jaane ke liye poora ghar packing karke le jaana pade (bed, fridge, sofa sab kuch) roz, toh kitna time waste hoga na? Jabki tumhe sirf laptop bag chahiye. Docker image bhi waise hi — sirf woh cheezein honi chahiye jo runtime pe actually chahiye, build-time tools (compilers, dev dependencies) nahi.

### Problem: Large Images

```dockerfile
# ❌ Bad: 1.5GB image
FROM node:18
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

Yahan problem yeh hai — final image mein poora `node:18` (bada base image), saari `node_modules` (including dev dependencies jaise webpack, typescript compiler), aur raw source code sab kuch pada hai. Lekin runtime pe tumhe sirf compiled `dist/` folder aur production dependencies chahiye — baaki sab dead weight hai.

### Solution: Multi-Stage Build

```dockerfile
# ✅ Good: ~200MB production image

# Stage 1: Build
FROM node:18 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Runtime (only copy necessary files)
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

Yahan `COPY --from=builder` ka jaadu dekho — hum sirf `builder` stage se compiled `dist` folder utha rahe hain, poora build environment nahi. Woh `builder` stage jispe TypeScript compiler, webpack, saari dev tools thi — final image mein include hi nahi hoti. Final image sirf lightweight `alpine` base + production dependencies + compiled code rakhta hai.

Socho isko restaurant kitchen jaisa — kitchen mein masale grind karne ki bhaari machine hai, sabziyan kaatne ke tools hain (yeh sab "builder stage" hai). Lekin customer ki table pe sirf plate mein khana jaata hai (yeh "final stage" hai) — grinder, chaaku, kitchen ka mess customer tak nahi pahunchta.

### Multi-Stage for Python

```dockerfile
# Stage 1: Build
FROM python:3.11 AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --user -r requirements.txt

# Stage 2: Runtime
FROM python:3.11-slim
WORKDIR /app
COPY --from=builder /root/.local /root/.local
COPY . .
ENV PATH=/root/.local/bin:$PATH
CMD ["python", "app.py"]
```

### Image Size Comparison

```bash
# ❌ Without multi-stage
docker images
REPOSITORY          TAG      SIZE
my-app              full     1.5GB

# ✅ With multi-stage
my-app              multi    350MB

# Size reduction: 77%!
```

77% reduction — yeh sirf "achha lagta hai" wali baat nahi hai. Real production mein isse deployment 4-5x faster ho sakta hai, aur agar tum Kubernetes pe scale kar rahe ho (jaha ek node pe sau containers pull ho rahe hain), yeh farak bahut bada padta hai.

---

## Environment-Specific Configurations

### Kya hota hai?

Ek hi app ko tumhe alag-alag environments mein deploy karna padta hai — local development, staging (testing ground), aur production (live users). Har environment ki apni config hoti hai — alag database URL, alag log level, alag feature flags. Docker mein isko handle karne ke do tareeke hain: environment variables ya config files.

### Using Environment Variables

```dockerfile
FROM node:18

WORKDIR /app
COPY . .
RUN npm ci --only=production

EXPOSE 3000

# Default values for environment
ENV NODE_ENV=production
ENV LOG_LEVEL=info

CMD ["node", "index.js"]
```

`ENV` instruction Dockerfile mein default values set karta hai, lekin runtime pe tum inhe override kar sakte ho `-e` flag se:

```bash
# Override at runtime
docker run -d \
  -e NODE_ENV=staging \
  -e LOG_LEVEL=debug \
  -e DATABASE_URL=postgresql://db:5432/app \
  my-app
```

Yeh bilkul UPI app jaisa hai — same app code hai, lekin tum jis bank account se pay karte ho woh environment variable jaisa hai, jo runtime pe select hota hai, code mein hardcoded nahi hota.

> [!tip]
> Kabhi bhi secrets (DB password, API keys) ko Dockerfile ke andar `ENV` se hardcode mat karo — image build ho jaane ke baad `docker history` ya `docker inspect` se yeh values easily nikaali ja sakti hain. Secrets hamesha runtime pe `-e` flag, `.env` file (jo `.dockerignore` mein hai), ya secret managers (Vault, AWS Secrets Manager) se pass karo.

### Config Files per Environment

Agar tumhare paas complex config hai (sirf ek-do variables nahi, poora JSON structure), toh alag-alag config files rakhna better approach hai.

```
config/
├── default.json
├── development.json
├── staging.json
└── production.json
```

```dockerfile
# Use stage to copy correct config
ARG ENV=production

FROM node:18 AS app
WORKDIR /app
COPY . .
RUN npm ci --only=production
COPY config/${ENV}.json ./config/active.json
CMD ["node", "index.js"]
```

`ARG` aur `ENV` mein confuse mat hona — `ARG` sirf **build-time** pe available hota hai (image banate waqt), `ENV` **runtime** pe bhi available rehta hai (container chalते waqt). Yahan `ARG ENV=production` build-time decide karta hai ki konsi config file image mein copy honi hai.

```bash
# Build for different environments
docker build --build-arg ENV=development -t my-app:dev .
docker build --build-arg ENV=production -t my-app:prod .
```

---

## Debugging Containerized Apps

Container ke andar kya ho raha hai yeh dekhna shuru mein thoda alien lagta hai — apna normal `console.log` aur debugger use nahi kar sakte seedha. Lekin Docker isके liye achhe tools deta hai.

### Interactive Debugging

`Kya hota hai?` — yeh commands tumhe running container ke andar "ghusne" (jaise SSH se kisi remote server pe jaana) aur uski internal state dekhne dete hain.

```bash
# Execute bash in running container
docker exec -it my-app bash

# Check logs
docker logs my-app

# Stream logs
docker logs -f my-app

# View container details
docker inspect my-app
```

`docker exec -it` bilkul aise hai jaise tum kisi ke ghar ke andar chhupke se ja sako aur dekh sako fridge mein kya rakha hai — container "live" hai aur uske andar interactive shell khol ke debug kar sakte ho. `docker logs -f` ka `-f` flag `tail -f` jaisa hai — real-time mein logs stream hote rehte hain, jaise live cricket score refresh ho raha ho.

### Debugging with VSCode

Node.js apps ke liye VSCode debugger ko container ke andar chal rahe process se connect karna bhi possible hai. Isके liye Node ka `--inspect` flag use hota hai jo debugging port (default 9229) open karta hai.

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Docker Node Debug",
      "type": "node",
      "request": "launch",
      "protocol": "inspector",
      "port": 9229,
      "address": "localhost"
    }
  ]
}
```

```dockerfile
# Enable Node.js debugger
FROM node:18
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 3000 9229
CMD ["node", "--inspect=0.0.0.0:9229", "index.js"]
```

Dhyaan do — `--inspect=0.0.0.0:9229` mein `0.0.0.0` likha hai, `localhost` nahi. Yeh isliye kyunki container ke andar `localhost` sirf container ke apne loopback ko refer karega, host machine se accessible nahi hoga. `0.0.0.0` matlab "sab interfaces pe suno", tabhi host machine se debugger connect ho payega.

```bash
# Run with debug port exposed
docker run -d \
  -p 3000:3000 \
  -p 9229:9229 \
  my-app
```

### Logging Best Practices

Production mein plain text logs (`console.log("user logged in")`) se kaam nahi chalta jab traffic zyada ho — tumhe structured logs chahiye jinhe machine easily parse kar sake (jaise Elasticsearch, Datadog, ya CloudWatch mein search karne ke liye).

```javascript
// app.js - structured logging
const logger = {
  info: (msg, meta = {}) => console.log(JSON.stringify({ level: 'INFO', msg, ...meta, time: new Date() })),
  error: (msg, meta = {}) => console.error(JSON.stringify({ level: 'ERROR', msg, ...meta, time: new Date() })),
  debug: (msg, meta = {}) => console.log(JSON.stringify({ level: 'DEBUG', msg, ...meta, time: new Date() }))
};

logger.info('App started', { port: 3000 });
```

Yeh JSON format isliye important hai kyunki Docker container ke `stdout`/`stderr` ko log collectors (Fluentd, Loki, CloudWatch) directly scrape karte hain — agar tumhare logs structured (JSON) hain, toh unpe filter, search, aur alert lagana bahut easy ho jata hai. Ola ya Uber jaise scale pe agar plain text logs hon, toh crash ka root cause dhundhna bhusa-mein-suchi (haystack) jaisa ho jayega.

```bash
# Docker logs show structured output
docker logs my-app | grep ERROR
```

---

## Performance Optimization

Ab kuch practical tricks jo tumhare Docker builds ko fast aur images ko lean banayenge.

### 1. Image Layer Caching

`Kaise kaam karta hai?` — Docker har instruction (`RUN`, `COPY`, etc.) ko ek "layer" ke roop mein cache karta hai. Agar ek layer ki input (file content ya command) change nahi hui, Docker usse cache se reuse kar leta hai instead of dobara run karne ke.

```dockerfile
# ❌ Bad: npm install runs on every build
FROM node:18
COPY . .  # Everything copied
RUN npm install
```

Is bad example mein `COPY . .` poora source code copy kar raha hai `npm install` se pehle. Matlab agar tum sirf ek line code change karo (`index.js` mein), Docker sochega "COPY . . ka output change ho gaya", aur cache invalidate karke `npm install` dobara chalayega — poori dependencies dobara download! Yeh bilkul aise hai jaise tum ek chawal ka dana replace karo aur poori thaali dobara banao.

```dockerfile
# ✅ Good: Cache npm install layer
FROM node:18
COPY package*.json ./  # Only package files (changes rarely)
RUN npm install        # Cached if package*.json unchanged
COPY . .              # Source code (changes frequently)
```

Yahan trick hai order ka — pehle sirf `package*.json` copy karo (jo rarely change hoti hai), phir `npm install` chalao, phir baaki source code copy karo. Ab jab tum source code change karoge, sirf last `COPY . .` layer invalidate hoga, `npm install` wala layer cache se hi mil jayega — build bahut fast ho jayega.

> [!tip]
> Docker layer caching samajhna interview mein bhi common question hai — yaad rakho: "jo cheez kam change hoti hai usse pehle copy/run karo, jo zyada change hoti hai usse baad mein."

### 2. Use Alpine Images

```dockerfile
# ❌ Large
FROM node:18
# ~1GB image

# ✅ Smaller
FROM node:18-alpine
# ~150MB image
```

Alpine Linux ek minimal Linux distribution hai jo sirf essential cheezein rakhta hai — yeh bilkul jaise ek chhoti si 1BHK vs ek bada bangla. Dono mein rehna possible hai, lekin agar tumhe sirf sona hai aur kaam pe jaana hai, toh 1BHK hi kaafi hai — extra jagah (unnecessary packages, docs, tools) sirf maintenance cost badhati hai.

> [!warning]
> Alpine mein `glibc` ki jagah `musl libc` use hota hai — kabhi kabhi native Node modules (jo C++ addons use karte hain) Alpine pe compile ya run nahi hote seedhe. Agar aise issues aaye, `node:18-slim` (Debian-based, chhota but glibc wala) ek middle-ground option hai.

### 3. Minimize Layers

```dockerfile
# ❌ Multiple RUN commands
RUN apt-get update
RUN apt-get install -y curl
RUN apt-get clean

# ✅ Combined with cleanup
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
```

Har `RUN` instruction ek naya layer banata hai. Agar tum `apt-get update` aur `apt-get install` ko alag layers mein karo, toh `apt-get clean` wala layer pichhle layer ka cached data delete nahi kar payega — woh already pichhle layer mein "commit" ho chuka hai. Isliye install aur cleanup ko ek hi `RUN` command mein chain (`&&`) karna zaruri hai taaki temporary files final image mein na bache.

### 4. Don't Run as Root

```dockerfile
# ✅ Good: Create non-root user
FROM node:18
RUN useradd -m appuser
WORKDIR /app
COPY --chown=appuser:appuser . .
USER appuser
CMD ["node", "index.js"]
```

`Kyun zaruri hai?` — default mein Docker container root user ke saath chalta hai. Agar koi attacker tumhare app mein koi vulnerability exploit kar le (jaise remote code execution), aur container root pe chal raha hai, toh woh container ke andar kuch bhi kar sakta hai, aur agar container escape ho jaye toh host machine pe bhi root access mil sakta hai. Yeh bilkul aise hai jaise tumne apne ghar ke darwaze ki chaabi delivery boy ko de di ho "just in case" — agar wahi delivery boy chor nikla, toh poore ghar ka access uske paas hai.

`USER appuser` instruction ke baad se container ke andar sab kuch limited-privilege user ke roop mein chalta hai — security best practice, aur production deployments (Kubernetes, ECS) mein aksar mandatory bhi hota hai.

---

## Practical Example: Complete Full-Stack App

Chalo ab yeh sab concepts ek real project structure mein jodte hain — ek typical full-stack app jismein frontend, backend, aur nginx config saath mein hain.

```bash
# Project structure
my-app/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── index.js
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
└── nginx.conf
```

Bas ek command se poora stack up ho jata hai:

```bash
# Run everything
docker-compose up -d

# Access
curl http://localhost  # Frontend at /
curl http://localhost/api/users  # Backend API
```

Yeh exactly aisa hi hai jaise IRCTC ka backend — ek single domain (`irctc.co.in`) ke peeche multiple services chal rahi hain (ticket booking, payment gateway, user auth), lekin end-user ke liye sab kuch ek hi jagah se accessible lagta hai.

---

## Key Takeaways

- **`npm ci` / `pip install --no-cache-dir` use karo** — production builds mein deterministic aur clean installs zaruri hain, `npm install` nahi.
- **Multi-stage builds** image size drastically kam karte hain (77% tak) — build tools aur dev dependencies ko final image se bahar rakho.
- **Alpine images** chhoti, secure base images dete hain, lekin native modules ke saath compatibility issues ho sakte hain — `slim` variant fallback ke liye rakho.
- **Layer caching order matters** — kam change hone wali files (package.json) pehle copy karo, zyada change hone wali (source code) baad mein.
- **Environment variables aur config files** se ek hi Docker image ko multiple environments (dev/staging/prod) mein deploy karna possible hota hai.
- **`docker exec`, `docker logs`, `--inspect` flag** — yeh teeno tumhare debugging toolkit ka core hain jab container ke andar kuch galat ho.
- **Structured (JSON) logging** production mein debugging aur monitoring ko bahut easy bana deta hai, especially scale pe.
- **Kabhi bhi root user pe container mat chalao** — hamesha `USER` instruction se non-root user set karo, security ke liye yeh non-negotiable hai.
- **`docker-compose`** multi-container apps (frontend + backend + DB + cache + proxy) ko ek hi config file se orchestrate karta hai — `depends_on` with health checks use karo taaki services sahi order mein start hon.

Next: [CI/CD Concepts](../02_ci_cd/01_cicd_concepts.md) - automate building and deployment
