# CI/CD Pipeline Example

> [!info] For the Express/TS dev
> Bilkul wahi cheez hai jo tum Node ke CI mein karte ho — deps install karo, lint chalao, test chalao, build karo, image push karo, deploy karo. Java mein bas kuch cheezein alag hain: `~/.m2/repository` ko cache karna, test reports upload karna (Surefire/JUnit XML), JAR artifacts publish karna, aur plain `docker build` ke bajaye Buildpacks/Jib use karna.

## Kya hota hai is pipeline mein?

Socho tumhara code GitHub pe push hua. Ab manually SSH karke server pe jaake `git pull`, `mvn build`, `docker build`, `kubectl apply` — yeh sab haath se karna? Bhai, yeh 2010 nahi hai. CI/CD pipeline yeh sab automatically kar deta hai — bilkul waise jaise Swiggy ka order automatically restaurant → delivery partner → tumhare ghar tak route hota hai, bina kisi manual coordination ke. Ek push hua, aur pipeline khud decide karta hai: build karna hai, test karna hai, image banani hai, aur deploy karna hai.

## GitHub Actions: full pipeline

Yeh raha ek complete production-grade pipeline. Line by line samjhenge neeche.

```yaml
name: ci-cd

on:
  push:
    branches: [main]
    tags: ['v*']
  pull_request:

permissions:
  contents: read
  packages: write
  id-token: write   # for OIDC to cloud

env:
  IMAGE: ghcr.io/${{ github.repository }}/orders-api

jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up JDK
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '21'
          cache: maven

      - name: Verify (compile + tests)
        run: ./mvnw -B verify

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: surefire-reports
          path: '**/target/surefire-reports/*.xml'

      - name: Publish test report
        if: always()
        uses: dorny/test-reporter@v1
        with:
          name: JUnit
          path: '**/target/surefire-reports/*.xml'
          reporter: java-junit

      - name: SonarQube
        if: github.event_name == 'push'
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
        run: ./mvnw -B sonar:sonar

      - name: Upload JAR
        uses: actions/upload-artifact@v4
        with:
          name: app-jar
          path: target/*.jar

  build-image:
    needs: build-test
    if: github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: '21', cache: maven }

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Compute tag
        id: tag
        run: |
          if [[ "${{ github.ref }}" == refs/tags/v* ]]; then
            echo "tag=${GITHUB_REF#refs/tags/v}" >> $GITHUB_OUTPUT
          else
            echo "tag=${GITHUB_SHA::7}" >> $GITHUB_OUTPUT
          fi

      - name: Build & push image (Buildpacks)
        run: |
          ./mvnw -B spring-boot:build-image \
            -Dspring-boot.build-image.imageName=$IMAGE:${{ steps.tag.outputs.tag }} \
            -Dspring-boot.build-image.publish=true \
            -Ddocker.publishRegistry.username=${{ github.actor }} \
            -Ddocker.publishRegistry.password=${{ secrets.GITHUB_TOKEN }}

      - name: Sign image (cosign)
        uses: sigstore/cosign-installer@v3
      - run: cosign sign --yes $IMAGE:${{ steps.tag.outputs.tag }}

  deploy-staging:
    needs: build-image
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - uses: azure/setup-kubectl@v4
      - run: |
          echo "${{ secrets.KUBECONFIG }}" > kubeconfig
          export KUBECONFIG=$PWD/kubeconfig
          kubectl set image deploy/orders-api app=$IMAGE:${GITHUB_SHA::7} -n staging
          kubectl rollout status deploy/orders-api -n staging --timeout=5m
```

Isko teen jobs mein tod ke dekho — bilkul ek assembly line ki tarah:

1. **`build-test`** — code checkout, JDK setup, `mvnw verify` (compile + test), phir test reports aur JAR artifact upload. Yeh har push aur PR pe chalta hai — CRED jaise app mein jaise har transaction pehle validate hoti hai, waise hi yahan har commit pehle "verify" hota hai.
2. **`build-image`** — sirf push pe chalta hai (PR pe nahi, kyunki image banana slow hai aur PR ke liye zaruri nahi). Docker image banata hai `spring-boot:build-image` (Buildpacks) se, GHCR pe push karta hai, aur cosign se sign bhi karta hai — taaki koi tampered image slip na ho jaaye.
3. **`deploy-staging`** — sirf `main` branch pe, aur pichle dono jobs pass hone ke baad hi chalta hai (`needs:` dekho). `kubectl set image` se naya image deploy karta hai aur rollout status check karta hai.

> [!tip] `needs:` ka matlab
> Node ke duniya mein tum `npm run build && npm run deploy` jaise chain karte ho. GitHub Actions mein `needs: build-test` bolta hai "pehle yeh job successfully complete ho, tabhi main chaloonga." Sequential dependency, bilkul waise jaise IRCTC pehle payment confirm karta hai, tabhi ticket confirm karta hai.

## Caching tips

Kyun zaruri hai caching? Har baar dependencies fresh download karna time-waste hai — bilkul waise jaise har Zomato order pe restaurant menu naye se print karna. Cache karo, baar baar mat banao.

- `actions/setup-java@v4` with `cache: maven` covers `~/.m2/repository`
- Gradle ke liye: `cache: gradle` wahi kaam karta hai `~/.gradle/caches` ke liye
- Cache hit usually 1-3 min bacha deta hai dependency resolution mein

## Speed wins

Pipeline slow ho toh developers frustrate ho jaate hain — deploy karne mein 20 min lage toh koi wait nahi karna chahta. Isliye yeh tricks use karo:

- Unit + integration tests ko parallel modules mein chalao (`mvn -T 2C`)
- **Testcontainers reuse** use karo PR runs ke beech (containers ko `withReuse(true)` mark karo aur `testcontainers.reuse.enable=true` set karo)
- PRs ke liye image build skip karo — sirf `main`/tags pe banao

## PR-only checks

Ek alag workflow add karo jo `./mvnw verify -Pquick` chalata hai (slow integration tests skip karta hai). Isse PR checks fast rehte hain — reviewer ko fast feedback milta hai, jaise Swiggy order tracking mein instant status update milta hai, na ki 10 min baad.

## Quality gates

Sirf "tests pass ho gaye" kaafi nahi hai. Production mein jaane se pehle kuch aur gates cross karne padte hain:

- **JaCoCo** coverage ke liye (`./mvnw verify -Pcoverage`)
- **Spotless** formatting ke liye (`./mvnw spotless:check`)
- **OWASP Dependency-Check** known CVEs ke liye
- **Trivy** image vulnerability scanning ke liye

```yaml
      - name: Trivy image scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ env.IMAGE }}:${{ steps.tag.outputs.tag }}
          severity: CRITICAL,HIGH
          exit-code: '1'
```

> [!warning] `exit-code: '1'`
> Yeh line important hai — agar CRITICAL ya HIGH severity vulnerability mil gayi, toh pipeline fail ho jaayega. Bina isके, Trivy sirf report dikha ke chup chaap aage badh jaata, aur vulnerable image production mein chali jaati.

## Deployment strategies

Deploy karne ke bhi alag tareeke hote hain, jaise Zomato apne app ka naya version rollout karta hai — sabko ek saath nahi, dhire dhire:

- **Rolling** (K8s mein default) — usually theek hai, pods ek ek karke replace hote hain
- **Blue/Green** — Service selector swap karke cutover karo (naya version pura ready, phir switch)
- **Canary** — Argo Rollouts, Flagger, ya Istio traffic split (5% users pehle naye version pe, phir gradually badhao)
- **GitOps** — config repo mein manifests push karo; ArgoCD khud reconcile karta hai

## Secrets

Long-lived keys mat use karo — agar leak ho gayi toh permanent risk. Iski jagah OIDC federation use karo (short-lived, auto-expiring tokens):

- AWS: `aws-actions/configure-aws-credentials@v4`
- GCP: `google-github-actions/auth@v2`
- Azure: `azure/login@v2`

> [!info] OIDC kyun better hai plain secrets se?
> Normal secret ek password jaisa hai jo kabhi expire nahi hota jab tak tum khud revoke na karo — UPI PIN kisi ko permanently de dena jaisa. OIDC ek temporary token deta hai jo har run ke liye fresh banta hai aur khud-ba-khud expire ho jaata hai. Zyada secure, zero maintenance.

## Related
- [[02-Docker-for-Spring-Boot]]
- [[04-Kubernetes-Basics]]
- [[01-Maven-Basics]]
- [[06-Profiles-Per-Environment]]
- [[01-Testing-Strategy]]
