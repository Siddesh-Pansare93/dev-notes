# Docker Image CI/CD

Socho tumne apna Node.js app likh liya, Dockerfile bhi bana liya, local pe `docker build` aur `docker run` bhi chala liya — sab kaam kar raha hai. Ab sawaal yeh hai: yeh image production tak kaise pahunchegi? Har baar manually `docker build`, `docker tag`, `docker push` karoge? Aur agar 5 developers hain team mein, sabka apna-apna build process hoga, koi consistency nahi rahegi.

Yahi pe Docker Image CI/CD kaam aata hai. Jaise Swiggy ka order jab restaurant se nikalta hai to ek fixed pipeline follow karta hai — order confirm hua, kitchen ne banaya, quality check hua, delivery boy ko assign hua, customer tak pahuncha — waise hi tumhara code bhi ek fixed automated pipeline se guzarna chahiye: build ho, test ho, security scan ho, aur phir hi registry mein push ho aur deploy ho. Isse har baar same reliable process follow hota hai, chahe koi bhi developer commit kare.

> [!info]
> Yeh poora pipeline is tarah dikhta hai: **Code push → Build image → Test → Security scan → Tag → Push to registry → Deploy**. Har step gate ki tarah kaam karta hai — agla step tabhi chalega jab pichla pass ho.

## Table of Contents
1. [Building Docker Images in CI](#building-docker-images-in-ci)
2. [Image Registry](#image-registry)
3. [Image Tagging Strategy](#image-tagging-strategy)
4. [Image Security Scanning](#image-security-scanning)
5. [Multi-Platform Builds](#multi-platform-builds)
6. [Caching Docker Layers](#caching-docker-layers)
7. [Deploying Images](#deploying-images)

---

## Building Docker Images in CI

### Kya hota hai yahan?

Jab bhi tum `git push` karte ho, CI server (GitHub Actions, GitLab CI, Jenkins — koi bhi) automatically tumhara code checkout karta hai, Dockerfile ke instructions follow karke image build karta hai, uske andar tests chalata hai, aur agar sab theek raha to registry mein push kar deta hai. Yeh bilkul waise hi hai jaise Zomato ka kitchen display system — order aate hi automatically kitchen ko notify ho jata hai, koi manually phone karke nahi bataata.

### GitHub Actions Docker Build

Yeh sबसे common setup hai. Push hote hi image build hoti hai, container ke andar tests chalte hain, aur agar `main` branch pe push hua hai to Docker Hub pe push ho jata hai.

```yaml
name: Build Docker Image

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build Docker image
        run: docker build -t myapp:${{ github.sha }} .

      - name: Run tests in container
        run: |
          docker run --rm myapp:${{ github.sha }} npm test

      - name: Push to Docker Hub
        if: github.event_name == 'push'
        env:
          DOCKER_USERNAME: ${{ secrets.DOCKER_USERNAME }}
          DOCKER_PASSWORD: ${{ secrets.DOCKER_PASSWORD }}
        run: |
          docker login -u $DOCKER_USERNAME -p $DOCKER_PASSWORD
          docker tag myapp:${{ github.sha }} myusername/myapp:latest
          docker push myusername/myapp:latest
```

Yahan gaur karne wali baat — `if: github.event_name == 'push'` ka matlab hai push sirf tab hoga jab actual push event ho, pull request pe nahi. Kyun? Kyunki PR sirf ek proposal hai, usko production registry mein push karne ki zaroorat nahi — sirf build aur test hona chahiye taaki pata chale code kaam kar raha hai ya nahi.

> [!warning]
> `docker run --rm myapp:${{ github.sha }} npm test` — dhyan do yeh tests container ke **andar** chala raha hai, apne CI runner pe nahi. Isse fayda yeh hai ki jo dependencies/environment production image mein hoga, wahi test bhi usi environment mein chalega. Koi "it works on my machine" wala scene nahi hoga.

### GitLab CI Docker Build

GitLab pe Docker-in-Docker (dind) service use karna padta hai kyunki CI job khud ek container mein chalti hai, aur usko andar se docker daemon access chahiye image build karne ke liye.

```yaml
build:docker:
  image: docker:latest
  services:
    - docker:dind
  script:
    # Build image
    - docker build -t myapp:$CI_COMMIT_SHA .
    # Test image
    - docker run --rm myapp:$CI_COMMIT_SHA npm test
    # Push to registry
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker tag myapp:$CI_COMMIT_SHA $CI_REGISTRY_IMAGE:latest
    - docker push $CI_REGISTRY_IMAGE:latest
  only:
    - main
```

`docker:dind` service ka matlab hai ek separate Docker daemon container chala rahe ho jo tumhare CI job ko docker commands run karne deta hai — isko socho jaise ek "sandbox kitchen" jahan tum bina real kitchen touch kiye apna khana bana sakte ho.

---

## Image Registry

### Kyun zaruri hai?

Jab tum image build karte ho CI mein, wo image sirf usi runner pe rehti hai — thodi der baad wo machine destroy ho jaati hai. Toh production server tak image kaise pahunchegi? Iske liye ek **registry** chahiye — ek centralized storage jahan images upload hoti hain, aur wahan se production server pull karta hai. Yeh bilkul Play Store jaisa hai — developer app upload karta hai Play Store pe, aur phir tumhara phone wahan se download karta hai. Docker registry bhi wahi role play karta hai images ke liye.

### Docker Hub

Sabse popular public registry, jaise Play Store hi hai Docker images ke liye.

```yaml
push_dockerhub:
  steps:
    - uses: docker/login-action@v2
      with:
        username: ${{ secrets.DOCKERHUB_USERNAME }}
        password: ${{ secrets.DOCKERHUB_TOKEN }}

    - uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: |
          myusername/myapp:latest
          myusername/myapp:${{ github.sha }}
```

`docker/build-push-action` ek official GitHub Action hai jo build + push dono ek hi step mein kar deta hai — manually `docker build`, `docker tag`, `docker push` likhne ki zaroorat nahi.

### Amazon ECR

Agar tumhara infra AWS pe hai (EC2, ECS, EKS), to ECR (Elastic Container Registry) use karna natural choice hai kyunki wo AWS IAM ke saath tightly integrated hai.

```yaml
push_ecr:
  steps:
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v2
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_KEY }}
        aws-region: us-east-1

    - name: Login to Amazon ECR
      id: login-ecr
      uses: aws-actions/amazon-ecr-login@v1

    - name: Build and push
      uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: |
          ${{ steps.login-ecr.outputs.registry }}/myapp:latest
          ${{ steps.login-ecr.outputs.registry }}/myapp:${{ github.sha }}
```

### GitHub Container Registry (GHCR)

Agar tumhara code already GitHub pe hai, to GHCR use karna sabse aasan hai kyunki authentication ke liye extra secrets banane ki zaroorat nahi — `secrets.GITHUB_TOKEN` already available hota hai har workflow run mein, GitHub khud provide karta hai.

```yaml
push_ghcr:
  steps:
    - uses: docker/login-action@v2
      with:
        registry: ghcr.io
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}

    - uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: |
          ghcr.io/${{ github.repository }}:latest
          ghcr.io/${{ github.repository }}:${{ github.sha }}
```

### Private Registry

Bade companies apna khud ka private registry bhi rakhte hain (Harbor, Nexus, ya self-hosted). CRED ya Paytm jaisi fintech companies apna code aur images kabhi public registry pe nahi rakhna chahtin — security aur compliance reasons se apna private registry rakhte hain.

```yaml
push_private:
  steps:
    - uses: docker/login-action@v2
      with:
        registry: registry.company.com
        username: ${{ secrets.REGISTRY_USERNAME }}
        password: ${{ secrets.REGISTRY_PASSWORD }}

    - uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: registry.company.com/myapp:${{ github.sha }}
```

---

## Image Tagging Strategy

### Kya hota hai aur kyun zaruri hai?

Agar har image ko sirf `latest` tag doge, to ek badi problem hogi — production mein kaunsi exact version chal rahi hai, yeh kabhi pata nahi chalega. Kal ko kuch break ho gaya, aur tumhe rollback karna hai — kis version pe wapas jaana hai? `latest` sirf ek moving pointer hai, ek fixed snapshot nahi.

Isko IRCTC ke train ticket ki tarah socho — sirf "ticket" bolne se kaam nahi chalega, tumhe PNR number chahiye taaki exact booking identify ho sake. Waise hi Docker image ko bhi ek unique, traceable tag chahiye taaki exact version pata chal sake ki production mein kya deploy hai.

### Tag Naming Conventions

```bash
# Semantic versioning
myapp:1.0.0
myapp:1.0.1

# Git commit hash
myapp:abc1234d
myapp:abc1234d-short

# Branch name
myapp:main
myapp:develop

# Date-based
myapp:2024-01-15

# Combined
myapp:1.0.0-main-abc1234d
```

Har approach ka apna use case hai:
- **Semantic versioning (`1.0.0`)** — jab tum end users ko versions communicate karna chahte ho, jaise npm package publish karte waqt.
- **Git commit hash (`abc1234d`)** — sabse precise traceability, ek commit = ek unique image. CI/CD mein sabse zyada reliable, kyunki har build unique hoti hai.
- **Branch name (`main`, `develop`)** — jab tum sirf latest state of a branch track karna chahte ho, staging environments ke liye common.
- **Date-based** — audit/compliance purposes ke liye jab pata hona chahiye kaunsi build kab bani.

> [!tip]
> Best practice yeh hai: **kabhi bhi sirf `latest` pe depend mat karo production deployment ke liye.** Hamesha commit SHA ya semantic version jaisa immutable tag use karo. `latest` sirf convenience ke liye rakho, actual deployment commit SHA se ho.

### Tag Management

Ek image ko multiple tags dena bhi possible hai — matlab same build ko `latest`, commit SHA, branch name, aur version number — sab se refer kar sakte ho.

```yaml
build_and_tag:
  steps:
    - uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: |
          myregistry/myapp:latest
          myregistry/myapp:${{ github.sha }}
          myregistry/myapp:${{ github.ref_name }}
          myregistry/myapp:v1.0.0
```

Yeh ek hi image ke multiple "naam" hain — bilkul jaise ek insaan ka Aadhar number, PAN number, aur nickname sab alag-alag ID hote hain lekin insaan ek hi hota hai.

### Semantic Versioning

Agar tum chahte ho ki version number automatically commit messages se decide ho (jaise `feat:` commit se minor version badhe, `fix:` se patch version badhe), to `semantic-release` jaisa tool use karte hain.

```yaml
semantic_release:
  steps:
    # Determine version from commits
    - uses: cycjimmy/semantic-release-action@v3
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

    # Get new version from output
    - name: Get new version
      id: semantic
      uses: cycjimmy/semantic-release-action@v3

    # Tag Docker image with version
    - uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: |
          myregistry/myapp:${{ steps.semantic.outputs.new_release_version }}
          myregistry/myapp:latest
```

---

## Image Security Scanning

### Kyun zaruri hai?

Har base image (jaise `node:18` ya `python:3.11`) kisi na kisi Linux distro pe based hoti hai, aur usmein bahut saari packages hoti hain — jinmein se kuch mein known vulnerabilities (CVEs) ho sakti hain. Agar tum vulnerable image production mein deploy kar dete ho, to yeh bilkul aisa hai jaise apne ghar ka main darwaza khula chhod diya ho — attacker ko easy entry point mil jaata hai. UPI apps ya banking apps jaisi cheezein jinmein security compliance mandatory hai, wahan yeh step skip karna hi nahi chahiye.

### Trivy Scanner

Trivy ek free, open-source scanner hai jo image ke andar ki har layer check karta hai known vulnerabilities ke liye — OS packages ho ya application dependencies (npm, pip, etc.), sab scan ho jaata hai.

```yaml
security_scan:
  image: aquasec/trivy:latest
  script:
    # Build image
    - docker build -t myapp:latest .
    # Scan for vulnerabilities
    - trivy image --severity HIGH,CRITICAL myapp:latest
  allow_failure: true
```

`--severity HIGH,CRITICAL` ka matlab hai sirf serious vulnerabilities pe hi focus karo — LOW/MEDIUM severity issues itne critical nahi hote ki pipeline rok diya jaaye, warna har build fail hoti rahegi chhoti-chhoti cheezon ke liye.

### GitHub Container Scanning

Trivy ke results ko GitHub ke Security tab mein bhi dikhaya ja sakta hai SARIF format use karke — isse team ko GitHub UI mein hi saari vulnerabilities dikh jaati hain, alag se dashboard dekhne ki zaroorat nahi.

```yaml
scan:
  steps:
    - uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: ghcr.io/${{ github.repository }}:${{ github.sha }}

    - uses: aquasecurity/trivy-action@master
      with:
        image-ref: ghcr.io/${{ github.repository }}:${{ github.sha }}
        format: 'sarif'
        output: 'trivy-results.sarif'

    - uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: 'trivy-results.sarif'
```

### Snyk Scanning

Snyk ek aur popular tool hai, jo Trivy jaisa hi kaam karta hai lekin isme thoda better developer experience aur fix suggestions milte hain.

```yaml
snyk_scan:
  steps:
    - uses: snyk/actions/docker@master
      env:
        SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
      with:
        image: myregistry/myapp:${{ github.sha }}
        args: --severity-threshold=high
```

### Scan and Block

Yeh sabse important pattern hai — agar scan fail ho jaaye (critical vulnerabilities milein), to image registry mein push hi nahi honi chahiye. Isko socho jaise FSSAI food inspector — agar restaurant ki kitchen inspection fail ho jaaye, to unko operate karne ki permission hi nahi milti, chahe unka khana kitna bhi tasty kyun na ho.

```yaml
build_scan_push:
  steps:
    - name: Build Docker image
      run: docker build -t myapp:${{ github.sha }} .

    - name: Scan image
      run: |
        docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
          aquasec/trivy image --exit-code 1 \
          --severity HIGH,CRITICAL \
          myapp:${{ github.sha }}
      # Pipeline fails if vulnerabilities found

    - name: Push to registry
      if: success()
      run: |
        docker login -u ${{ secrets.REGISTRY_USER }} ...
        docker push myapp:${{ github.sha }}
```

`--exit-code 1` ka matlab hai agar vulnerability mile to Trivy exit code 1 return karega, jisse CI job fail ho jaayegi, aur agla step (`push`) kabhi chalega hi nahi. `if: success()` ek extra safety layer hai — pichla step fail hote hi push step skip ho jaata hai.

> [!warning]
> `docker run --rm -v /var/run/docker.sock:/var/run/docker.sock` — yeh host machine ka Docker socket container ke andar mount kar raha hai taaki Trivy host ki images ko access kar sake. Yeh powerful hai lekin thoda risky bhi — sirf trusted images ke saath hi yeh pattern use karo.

---

## Multi-Platform Builds

### Kya hota hai?

Aaj kal servers sirf `amd64` (Intel/AMD) pe nahi chalte — bahut saare cloud providers ARM-based chips (jaise AWS Graviton) use karte hain kyunki wo cheaper aur power-efficient hote hain. Agar tumne apni image sirf `amd64` ke liye build ki, to wo ARM server pe chalegi hi nahi. Isko socho jaise ek plug jo sirf Indian socket mein fit hota hai — US ya UK ke socket mein daalne ke liye adapter chahiye. Multi-platform build ka matlab hai ek hi image build karke sab tarah ke "sockets" (architectures) ke liye compatible bana dena.

### Building for Multiple Architectures

Docker Buildx ka use karke ek hi command se `amd64`, `arm64`, aur `arm/v7` — teeno platforms ke liye image build ho sakti hai.

```yaml
build_multiplatform:
  steps:
    - uses: docker/setup-buildx-action@v2

    - uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        platforms: linux/amd64,linux/arm64,linux/arm/v7
        tags: |
          myregistry/myapp:latest
          myregistry/myapp:${{ github.sha }}
```

Registry mein yeh ek hi tag ke under multiple architecture-specific images store ho jaati hain (isko "manifest list" kehte hain), aur jab koi server image pull karta hai, Docker automatically apne architecture ke hisaab se sahi wali image download karta hai — tumhe manually kuch nahi karna padta.

### Dockerfile for Multi-Platform

Multi-platform builds ke liye Dockerfile mein special build args use karne padte hain jo Buildx automatically provide karta hai.

```dockerfile
# Automatically detects platform
FROM --platform=$BUILDPLATFORM node:18 AS builder
ARG BUILDPLATFORM
ARG TARGETPLATFORM
RUN echo "Building for $TARGETPLATFORM on $BUILDPLATFORM"
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM --platform=$TARGETPLATFORM node:18-alpine
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

`$BUILDPLATFORM` woh machine hai jahan build ho raha hai (jaise tumhara CI runner, generally `amd64`), aur `$TARGETPLATFORM` woh machine hai jahan final image chalegi. Multi-stage build mein builder stage ko hamesha `$BUILDPLATFORM` pe rakhna better hota hai (fast build ke liye, cross-compilation ki jaroorat nahi), aur final stage ko `$TARGETPLATFORM` pe.

---

## Caching Docker Layers

### Kyun zaruri hai?

Har baar `npm ci` chalana ya dependencies download karna time-consuming hai. Agar code ka sirf ek chhota part change hua hai (jaise ek route file), to poori image ko scratch se rebuild karna waste of time hai. Docker layer caching isse bachata hai — agar koi layer change nahi hui, Docker usko cache se reuse kar leta hai. Yeh bilkul Swiggy delivery boy jaisa hai jo same route baar-baar travel karta hai — agar traffic pattern same hai, wo apna purana experience reuse karta hai instead of naya route dhoondhne mein time waste karne ke.

CI mein problem yeh hai ki har build fresh runner pe hoti hai, toh local cache automatically available nahi hota. Isliye humein explicitly cache ko kahin store karke agli build mein reuse karna padta hai.

### Inline Cache

Yahan cache ko registry mein hi ek special tag ke roop mein store kar dete hain, taaki agli build usse fetch kar sake.

```yaml
build_with_cache:
  steps:
    - uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: myregistry/myapp:latest
        cache-from: type=registry,ref=myregistry/myapp:buildcache
        cache-to: type=registry,ref=myregistry/myapp:buildcache,mode=max
```

`mode=max` ka matlab hai saari intermediate layers cache mein save karo (na sirf final layers), jisse future builds mein zyada cache hits milein.

### GitHub Actions Cache

Agar tum GitHub Actions use kar rahe ho, to GitHub ka apna built-in cache (`type=gha`) use karna aasan aur fast hai — alag registry setup ki zaroorat nahi.

```yaml
build_with_ghcache:
  steps:
    - uses: docker/setup-buildx-action@v2

    - uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        cache-from: type=gha
        cache-to: type=gha,mode=max
```

> [!tip]
> Dockerfile likhte waqt bhi layer caching ka dhyan rakho — jo cheezein kam change hoti hain (jaise `package.json` copy karke `npm ci` chalana) unko upar rakho, aur jo baar-baar change hoti hain (jaise poora source code `COPY . .`) unko neeche. Isse Docker upar wali layers cache se reuse kar payega jab tak `package.json` na badle.

---

## Deploying Images

### Kya hota hai is step mein?

Ab tak humne image build ki, scan ki, tag ki, aur registry mein push kar di. Lekin asli kaam ab shuru hota hai — production server ko batana ki "bhai naya version aa gaya hai, isko chala do." Yeh step alag-alag infrastructure ke hisaab se alag tarah se hota hai.

### Kubernetes Deployment

Kubernetes mein `kubectl set image` command deployment ke andar chal rahi image ko update kar deta hai, aur Kubernetes khud rolling update handle karta hai — matlab ek-ek karke old pods ko naye se replace karta hai, bina downtime ke.

```yaml
deploy_kubernetes:
  steps:
    - uses: actions/checkout@v3

    - name: Update deployment image
      run: |
        kubectl set image \
          deployment/myapp \
          myapp=myregistry/myapp:${{ github.sha }} \
          --record

    - name: Rollout status
      run: |
        kubectl rollout status deployment/myapp
```

`kubectl rollout status` isliye important hai kyunki isse CI job ko pata chalta hai ki deployment successfully complete hua ya nahi — agar naye pods crash ho rahe hain, yeh command fail ho jaayegi aur pipeline ko pata chal jaayega.

### AWS ECS Deployment

ECS (Elastic Container Service) pe deployment thoda different hai — pehle task definition update karte hain (jisme image reference hota hai), phir naya deployment trigger karte hain.

```yaml
deploy_ecs:
  steps:
    - name: Update ECS task definition
      id: task-def
      uses: aws-actions/amazon-ecs-render-task-definition@v1
      with:
        task-definition: task-definition.json
        container-name: myapp
        image: ${{ steps.image.outputs.image }}

    - name: Deploy to ECS
      uses: aws-actions/amazon-ecs-deploy-task-definition@v1
      with:
        task-definition: ${{ steps.task-def.outputs.task-definition }}
        service: myapp-service
        cluster: production
        wait-for-service-stability: true
```

`wait-for-service-stability: true` yeh ensure karta hai ki CI job tab tak complete na ho jab tak naya deployment actually stable na ho jaaye (health checks pass ho jaayein). Isse tumhe pata chalega deployment successful hua ya fail hua, bina manually AWS console check kiye.

### Docker Compose Update

Chhote projects ya single-server setups ke liye Docker Compose se bhi deploy kiya ja sakta hai — simple hai lekin zero-downtime nahi hoti (compose down/up ke beech thoda downtime aata hai).

```yaml
deploy_compose:
  script:
    - docker-compose down
    - |
      docker-compose up -d \
        --build \
        -e IMAGE_TAG=$CI_COMMIT_SHA
```

### Rollback Strategy

### Kyun zaruri hai?

Production deployment kabhi bhi fail ho sakti hai — naya code mein bug ho sakta hai jo staging mein pakda hi nahi gaya. Aisi situation mein turant purane, working version pe wapas jaana chahiye. Isko socho jaise Ola/Uber ka "cancel and rebook" option — agar naya driver assign hone mein problem aa rahi hai, turant purane reliable option pe switch kar do, customer ko wait mat karao.

```yaml
deploy_with_rollback:
  steps:
    - name: Deploy new version
      id: deploy
      run: |
        kubectl set image deployment/myapp \
          myapp=myregistry/myapp:${{ github.sha }}
        if ! kubectl rollout status deployment/myapp --timeout=5m; then
          echo "ROLLBACK=true" >> $GITHUB_OUTPUT
        fi

    - name: Rollback if needed
      if: steps.deploy.outputs.ROLLBACK == 'true'
      run: |
        kubectl rollout undo deployment/myapp
        exit 1
```

Yahan `--timeout=5m` bahut important hai — agar 5 minute ke andar deployment stable nahi hota (health checks fail ho rahe hain), to `ROLLBACK=true` set ho jaata hai, aur agla step turant `kubectl rollout undo` chala kar purane version pe wapas le jaata hai. `exit 1` isliye taaki pipeline clearly "failed" dikhe, aur team ko notification jaaye ki kuch galat hua hai.

> [!tip]
> Yeh manual rollback trigger sirf ek safety net hai. Production-grade setups mein isse aur aage le jaate hain — jaise automated canary deployments jahan naya version pehle sirf 5% traffic ko serve karta hai, aur agar error rate badhta hai to automatically rollback ho jaata hai, bina kisi manual intervention ke.

---

## Practical Example: Complete Docker CI/CD

Ab yeh dekhte hain ek complete, production-grade pipeline kaisa dikhta hai jab sab pieces ko jodte hain — build, scan, aur deploy, teeno alag jobs mein, jahan har job apne pichle job ke success pe depend karta hai. Yeh bilkul railway reservation system jaisa hai — pehle seat availability check hoti hai, phir payment process hota hai, aur tabhi jaake ticket confirm hota hai. Ek step fail hua to aage kuch nahi badhega.

```yaml
name: Docker CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      image-tag: ${{ steps.meta.outputs.tags }}
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Log in to registry
        if: github.event_name == 'push'
        uses: docker/login-action@v2
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v4
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=sha,prefix={{branch}}-

      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: .
          push: ${{ github.event_name == 'push' }}
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  scan:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Run Trivy scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ needs.build.outputs.image-tag }}
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload scan results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'

  deploy:
    needs: [build, scan]
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: |
          echo "Deploying ${{ needs.build.outputs.image-tag }}"
          # Deployment logic here
```

Is pipeline ka structure samjho step by step:

1. **`build` job** — Buildx setup karta hai, `docker/metadata-action` se automatically smart tags generate karta hai (branch name, semver, commit SHA), aur GitHub Actions cache use karke fast build karta hai. `outputs: image-tag` ka matlab hai yeh job apna result (image tag) baad ke jobs ko pass kar sakta hai — jaise ek relay race mein baton pass karna.

2. **`scan` job** — `needs: build` likha hai, matlab yeh job tabhi start hoga jab `build` job successfully complete ho jaaye. Trivy scan chalta hai `needs.build.outputs.image-tag` use karke — dekho kaise pichle job ka output yahan directly use ho raha hai.

3. **`deploy` job** — `needs: [build, scan]` matlab dono pichle jobs pass hone chahiye. Aur `if` condition check karta hai ki sirf `main` branch pe push hone par hi deploy ho — pull requests ya `develop` branch pe deploy nahi hoga.

Yeh three-stage gate system hi CI/CD ki asli taakat hai — koi bhi buggy ya vulnerable image kabhi production tak pahunch hi nahi sakti, kyunki har gate pe check hota hai.

---

## Key Takeaways

- **Automated builds** har commit pe consistent image banate hain — koi manual, inconsistent process nahi rehta.
- **Registry** ek centralized storage hai jahan images push hoti hain aur wahan se production server pull karta hai (Docker Hub, ECR, GHCR, ya private registry).
- **Tagging strategy** mein hamesha immutable tags (commit SHA, semantic version) use karo — sirf `latest` pe kabhi bharosa mat karo production deployment ke liye.
- **Security scanning** (Trivy, Snyk) har build mein honi chahiye, aur critical vulnerabilities milne pe pipeline ko fail karke push/deploy rok dena chahiye ("scan and block" pattern).
- **Multi-platform builds** zaroori hain agar tumhare servers different architectures (amd64, arm64) pe chal rahe hain — Buildx se ek hi build command se sab platforms cover ho jaate hain.
- **Layer caching** (registry cache ya GitHub Actions cache) build time drastically kam kar deta hai, especially jab dependencies change nahi hui hon.
- **Safe deployments** mein health checks aur automated rollback zaroor hona chahiye — agar naya version stable nahi hai, turant purane version pe wapas jaana chahiye.
- **Multi-job pipelines** (`build → scan → deploy` with `needs:`) ensure karte hain ki har stage gate ki tarah kaam kare — koi bhi step skip nahi ho sakta.

Next: [Deployment Strategies](./05_deployment_strategies.md) - release patterns
