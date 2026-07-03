# Docker Compose

Socho tumhare paas ek app hai jisme frontend hai, backend API hai, ek Postgres database hai, aur shayad Redis bhi laga hua hai caching ke liye. Agar tum har container ko `docker run` se manually start karoge — sahi network attach karna, sahi environment variables dena, volumes mount karna, dependency order maintain karna — toh yeh kaam bahut hi error-prone aur boring ho jata hai. Har baar naya developer join kare, usse 5-6 `docker run` commands yaad rakhne padenge with sahi flags. Bhai, yeh scale nahi karta.

Yahi problem solve karta hai **Docker Compose**. Ek hi YAML file mein tum apne poore application stack ko define karte ho — konse services chahiye, unke images/build context kya hai, kaunse ports expose karne hain, kaunse volumes attach karne hain, aur kaunse containers ek doosre se baat karenge. Phir ek single command — `docker-compose up` — se poora stack khada ho jata hai. Socho isse Swiggy ke "order placed" jaisa — ek click pe restaurant, delivery partner, aur payment gateway sab automatically coordinate ho jate hain, tumhe manually kuch bhi trigger nahi karna padta.

> [!info]
> Docker Compose ka use case hai **local development aur testing**. Production mein large-scale deployments ke liye generally Kubernetes ya ECS jaisa orchestrator use hota hai (jo hum agle note mein dekhenge), lekin chhote projects aur single-server deployments ke liye Compose production mein bhi chal jata hai.

## Basic Usage — Kya likhte hain YAML mein?

Chalo ek real example dekhte hain — ek Node.js web app jo Postgres database ke saath connect hoti hai.

```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://db:5432/myapp
    depends_on:
      db:
        condition: service_healthy
    networks:
      - app-network

  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: myapp
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-network

volumes:
  postgres-data:

networks:
  app-network:
    driver: bridge
```

Ab isko line-by-line samajhte hain, kyunki har section ka apna purpose hai:

- **`services`** — yeh tumhare containers ki list hai. Yahan `web` aur `db` do services hain. Har service basically ek container blueprint hai.
- **`build: .`** — iska matlab "web" service ka image current directory ke `Dockerfile` se banega. Agar tumhe ready-made image use karni ho (jaise Postgres ka official image), toh `image: postgres:15` likhte ho — build karne ki zaroorat nahi.
- **`ports: "3000:3000"`** — format hai `HOST_PORT:CONTAINER_PORT`. Matlab tumhare laptop ka port 3000, container ke andar chal rahe port 3000 se map ho raha hai. Browser mein `localhost:3000` khologe toh container ke andar wala app dikhega.
- **`environment`** — yeh container ke andar environment variables set karta hai. Notice karo `DATABASE_URL` mein hostname `db` diya hai, `localhost` nahi — kyunki Compose automatically ek internal DNS bana deta hai jahan service ka naam hi uska hostname ban jata hai. Yeh bahut important concept hai — Compose ke andar sab services same network pe hote hain aur ek doosre ko apne **service name se** access kar sakte hain, jaise Zomato app internally "restaurant-service" ko uske naam se hi call karta hai, IP address yaad nahi rakhna padta.
- **`depends_on` with `condition: service_healthy`** — yeh batata hai ki `web` service tabhi start hogi jab `db` service "healthy" ho jaye (health check pass kare). Sirf `depends_on: [db]` likhne se sirf itna guarantee milta hai ki container start hoga pehle, lekin Postgres andar se ready hai ya nahi — us baat ki guarantee nahi milti. Isliye `condition: service_healthy` zaroori hai jab tak database fully boot na ho jaye.

> [!warning]
> Yeh ek common gotcha hai — bahut log sirf `depends_on: [db]` likh dete hain aur sochte hain database ready hai. Lekin Postgres container "start" hone aur "connections accept karne ke liye ready" hone mein kaafi farak hota hai (kabhi-kabhi 5-10 second lag jaate hain). Bina health check ke, tumhara `web` service race condition mein fail ho sakta hai — "connection refused" error ke saath crash karega startup pe.

- **`volumes: postgres-data:/var/lib/postgresql/data`** — Containers by default **ephemeral** hote hain, matlab container delete hote hi andar ka data bhi gayab ho jata hai. Database ke liye yeh disaster hoga — restart karte hi saara data udd jayega! Volume ek persistent storage hai jo container ke bahar (Docker ke manage kiye hue disk space mein) rehta hai, aur container restart/delete hone par bhi bacha rehta hai. Socho isse bank locker jaisa — locker room (container) band ho sakta hai, but tumhara locker (volume) bahar surakshit rehta hai.
- **`healthcheck`** — Docker ko batata hai ki container "healthy" hai ya nahi, yeh check karke. Yahan `pg_isready` command chala ke Postgres se poocha ja raha hai "tayaar ho kya?" — har 10 second mein, max 5 retries tak.
- **`networks: app-network`** — dono services isi custom network pe hain, isliye woh ek doosre se baat kar sakte hain. `driver: bridge` matlab yeh ek standard isolated network hai jo sirf is host machine ke andar kaam karta hai.

> [!tip]
> Version `'3.8'` field ab deprecated ho chuka hai naye Compose (v2) mein — Compose CLI ab isko ignore kar deta hai aur warning deti hai. Naye projects mein ise omit karna bhi chalta hai, lekin purane projects mein dikhega toh chinta mat karo, bas ek harmless legacy field hai.

### Common Commands — Roz Ke Kaam Aane Wale

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Remove volumes too
docker-compose down -v

# Execute command
docker-compose exec web npm install

# Rebuild images
docker-compose up --build
```

In commands ko samajhna zaroori hai kyunki roz ke dev workflow mein yeh baar-baar use hote hain:

- **`docker-compose up -d`** — saari services start karta hai. `-d` flag ka matlab hai "detached mode", yani background mein chalega aur tumhara terminal free rahega. Bina `-d` ke, terminal logs se bhar jayega aur Ctrl+C dabate hi sab band ho jayega.
- **`docker-compose logs -f`** — jaise Swiggy app pe order tracking dekhte ho real-time, waise hi `-f` (follow) flag se tum live logs stream dekh sakte ho sabhi containers ke — bahut kaam aata hai debugging ke waqt.
- **`docker-compose down`** — saari services stop karke containers aur networks delete kar deta hai. Volumes safe rehte hain by default.
- **`docker-compose down -v`** — yeh volumes bhi delete kar deta hai! Matlab agar tumhara database volume tha, toh saara data permanently gayab. Ise sirf tab use karo jab tumhe genuinely fresh state chahiye ho.

> [!warning]
> `-v` flag bahut destructive hai. Bahut developers galti se `down -v` chala dete hain aur apna poora local database data kho dete hain. Production mein toh bilkul bhool ke bhi mat chalana yeh command.

- **`docker-compose exec web npm install`** — yeh already chal rahe `web` container ke andar jaake ek command execute karta hai. Bahut useful hai jab tumhe running container ke andar debug karna ho ya package install karna ho bina naya container banaye.
- **`docker-compose up --build`** — normally Compose cached image use karta hai agar Dockerfile change nahi hua. Lekin agar tumne code change kiya hai aur naya image chahiye, toh `--build` flag force karta hai fresh rebuild.

> [!info]
> Naye Docker versions mein command `docker compose` (space ke saath, hyphen ke bina) bhi chalta hai — yeh Docker CLI ka built-in plugin hai. `docker-compose` (hyphen wala) purana standalone tool hai. Dono kaam karte hain, lekin naye setups mein `docker compose` recommended hai.

## Advanced Features

### Environment Files — Secrets Ko YAML Se Bahar Rakho

Kya hota hai jab tumhare passwords, API keys seedha `docker-compose.yml` mein likhe hote hain? Woh file Git mein commit ho jaati hai aur tumhare secrets GitHub pe public ho jaate hain — bahut hi common security mistake hai yeh. Isliye `.env` file use karte hain jo `.gitignore` mein hoti hai, aur usse values inject karte hain.

```bash
# .env
DATABASE_PASSWORD=secret123
NODE_ENV=production
```

```yaml
env_file:
  - .env
```

Yeh bilkul waise hai jaise CRED app apna razorpay ka secret key kabhi frontend code mein nahi rakhta — alag secure jagah rakhta hai aur runtime pe fetch karta hai. `.env` file usi principle ko follow karti hai — code aur config alag, secrets kahin bhi hardcode nahi.

> [!tip]
> Docker Compose khud automatically root directory mein rakhi `.env` file pick kar leta hai bina `env_file` likhe bhi — usmein defined variables `${VAR_NAME}` syntax se YAML ke andar interpolate ho sakte hain, jaise `image: myapp:${TAG}`.

### Override Production Services — Ek Base, Multiple Environments

Docker Compose ka ek smart feature hai — agar `docker-compose.override.yml` naam ki file same directory mein ho, toh woh **automatically** `docker-compose.yml` ke saath merge ho jaati hai jab tum `docker-compose up` chalate ho. Yeh development-specific overrides ke liye perfect hai.

```yaml
# docker-compose.override.yml (auto-loaded)
version: '3.8'

services:
  web:
    ports:
      - "3000:3000"
    volumes:
      - .:/app  # Live code reload
    environment:
      - DEBUG=true
```

Yahan `.:/app` line sabse important hai — yeh current directory (host machine) ko container ke `/app` folder ke saath **bind mount** kar deti hai. Matlab tum apne local editor mein code change karte ho, aur bina image rebuild kiye, changes turant container ke andar reflect ho jate hain. Bilkul waise jaise Google Docs mein type karte hi doosri taraf turant update dikhta hai — koi manual "save aur upload" step nahi.

> [!info]
> Production mein bind mounts avoid karna chahiye — waha tumhara actual built code hi container ke andar baked hona chahiye, taaki koi accidental host-side change production ko affect na kare. Yeh sirf ek dev-convenience pattern hai.

### Multi-Stage Setup — Dev vs Production Ke Alag Configs

Real projects mein aksar ek hi base config hoti hai, aur dev/staging/production ke hisaab se chhote-chhote differences hote hain. Iske liye Compose multiple `-f` files chain karne deta hai:

```bash
# Development
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Production
docker-compose -f docker-compose.yml up -d
```

Yahan pehla command `docker-compose.yml` (base config) aur `docker-compose.dev.yml` (dev-specific overrides jaise hot-reload, debug ports) dono merge karke chalata hai. Production command sirf base file use karta hai kyunki production ko extra dev-tooling ki zaroorat nahi.

Isko IRCTC ke tatkal aur normal booking jaisa socho — dono ka base flow same hai (train search, seat select, payment), lekin thoda alag rules/config lagte hain scenario ke hisaab se. Same tarah Compose ka base file common rehta hai, environment-specific YAML files sirf differences add karti hain.

> [!tip]
> Convention hai ki naming aise rakho: `docker-compose.yml` (base), `docker-compose.override.yml` (auto-loaded dev overrides), `docker-compose.prod.yml`, `docker-compose.staging.yml` — taaki team ko turant pata chale kaunsi file kis environment ke liye hai.

## Key Takeaways

- **Docker Compose** ek YAML-based tool hai jisse multiple containers ko ek saath define, configure, aur orchestrate kar sakte ho — mainly local development aur testing ke liye.
- **Services** har container ka blueprint define karti hain — image/build source, ports, environment variables, volumes, aur dependencies.
- Services apne **service name** se ek doosre ko access karti hain (internal DNS ki wajah se), IP address ki zaroorat nahi.
- **Volumes** container ke bahar persistent storage dete hain — bina inke, container delete hote hi data gayab ho jata hai.
- **Networks** containers ke beech isolated communication channel banate hain.
- **Health checks** (`condition: service_healthy`) ensure karte hain ki dependent service tabhi start ho jab actual dependency ready ho, sirf container-started hone se kaam nahi chalta.
- `.env` files se secrets ko YAML se bahar rakho — security best practice hai.
- `docker-compose.override.yml` automatically merge hoti hai — dev-specific settings (bind mounts, debug flags) ke liye perfect.
- `-f` flags chain karke multiple environments (dev/staging/prod) ke liye alag-alag configs maintain kar sakte ho, ek common base ke saath.
- `down -v` se **volumes bhi delete ho jate hain** — production mein aur careful local development mein bhi soch samajh ke use karo.

Next: [Kubernetes Basics](./02_kubernetes_basics.md)
