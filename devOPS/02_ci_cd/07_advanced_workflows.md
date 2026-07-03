# Advanced CI/CD Workflows

Ab tak humne CI/CD ke basics dekh liye — pipeline banao, test chalao, deploy karo. Lekin real-world mein, jab tumhara project bada ho jaata hai (socho Zomato jaisa app jisme 50 microservices hain, alag-alag teams hain, aur roz sau commits aate hain), toh simple linear pipeline kaafi nahi padta. Tumhe chahiye:

- Multiple environments par ek saath test karna (matrix builds)
- Workflow logic ko duplicate na karna (reusable workflows)
- Smart decisions lena ki kab kya chalana hai (conditional execution)
- Build time kam karna (caching)
- Stage-to-stage data pass karna (artifacts)
- Poore pipeline ko orchestrate karna (workflow composition)

Yeh file GitHub Actions ke advanced patterns cover karti hai jo production-grade CI/CD banane ke liye zaruri hain.

## Table of Contents
1. [Matrix Builds](#matrix-builds)
2. [Reusable Workflows](#reusable-workflows)
3. [Conditional Execution](#conditional-execution)
4. [Caching & Performance](#caching--performance)
5. [Artifact Management](#artifact-management)
6. [Workflow Composition](#workflow-composition)
7. [Complex Patterns](#complex-patterns)

---

## Matrix Builds

### Kya hota hai?

Matrix build ek aisa feature hai jisse tum ek hi job definition likh ke usse multiple combinations mein parallel run kara sakte ho. Socho tumhara Node.js app hai aur tumhe pata karna hai ki yeh Node 16, 18, aur 20 — teeno versions par sahi se chalta hai ya nahi, aur teeno OS (Ubuntu, macOS, Windows) par bhi. Bina matrix ke tumhe 9 alag jobs likhne padte — copy-paste ka dukaan khul jaata. Matrix ke saath, ek hi job definition se GitHub Actions automatically saare combinations bana deta hai.

Yeh bilkul waise hi hai jaise Swiggy apna delivery app release karne se pehle Android 10, 11, 12, 13 — sabpe, aur alag-alag phone brands (Samsung, Xiaomi, OnePlus) pe test karta hai. Manually har combination test karna impossible hai, isliye automated matrix testing chalti hai jo saare combinations parallel mein verify kar deti hai.

### Kyun zaruri hai?

Agar tum sirf ek Node version pe test karke deploy kar doge, aur production server dusra version use karta hai, toh "works on my machine" wala classic bug production mein phat sakta hai. Matrix builds tumhe confidence dete hain ki code sach mein cross-compatible hai.

### Basic Matrix

```yaml
test:
  strategy:
    matrix:
      node-version: [16, 18, 20]
      os: [ubuntu-latest, macos-latest, windows-latest]
  runs-on: ${{ matrix.os }}
  steps:
    - uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
    - run: npm test
```

**Result:** 9 parallel jobs (3 versions × 3 OSes). GitHub Actions apne aap Cartesian product bana ke saare combinations spin up kar deta hai — sab ek saath, parallel mein.

### Matrix with Include/Exclude

Kabhi kabhi tumhe har combination test nahi karni hoti — kuch specific combinations chahiye hote hain, ya kuch skip karne hote hain (maybe ek combination mein koi known issue hai jise abhi fix nahi kiya). Iske liye `include` aur `exclude` use karte hain.

```yaml
test:
  strategy:
    matrix:
      include:
        # Test Node 16 on all OS
        - node-version: 16
          os: ubuntu-latest
        - node-version: 16
          os: macos-latest
        - node-version: 16
          os: windows-latest

        # Test Node 18 on Linux only
        - node-version: 18
          os: ubuntu-latest

        # Test Node 20 on Linux only
        - node-version: 20
          os: ubuntu-latest

    exclude:
      # Skip problematic combinations
      - node-version: 16
        os: windows-latest
```

Yeh bilkul aise hai jaise IRCTC apna app sabhi phone models pe test nahi karta — sirf top 10 popular models pe karta hai, plus kuch "edge case" purane models jinme pehle bug mil chuka tha. Har combination test karna waste of CI minutes hai agar wo combination kabhi kisi user ke paas hoti hi nahi.

> [!tip]
> `include` sirf naye combinations add karne ke liye bhi use hota hai — jaise upar wale "custom variables" example mein dekhoge, jahan matrix values sirf numbers nahi, poore objects bhi ho sakte hain.

### Matrix with Custom Variables

Matrix sirf simple values (jaise version numbers) tak limited nahi hai — tum poora object bhi matrix entry bana sakte ho, jisme multiple related properties saath mein bundled hon.

```yaml
test:
  strategy:
    matrix:
      test-suite:
        - { name: "Unit", script: "test:unit" }
        - { name: "Integration", script: "test:integration", db: postgres }
        - { name: "E2E", script: "test:e2e", db: postgres }

  services:
    postgres:
      image: postgres:15
      options: >-
        --health-cmd pg_isready
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5

  steps:
    - run: npm run ${{ matrix.test-suite.script }}
```

Yahan har matrix entry apna khud ka naam, script, aur optional database dependency carry kar raha hai. Ek hi job definition se teen alag tarah ke test suites parallel mein chal rahe hain — jaise Ola ka backend team ek hi CI config se ride-booking, payment, aur driver-matching — teeno services ke tests alag-alag containers mein parallel chala deta hai.

### Failing Matrix Jobs Continue

By default, agar matrix ka ek combination fail hota hai, toh GitHub Actions baaki saare running jobs ko cancel kar deta hai (taaki resources waste na ho). Lekin kabhi tumhe pura picture chahiye hota hai — "kaunse specific combinations fail hue?" — na ki sirf pehla wala jo fail hua.

```yaml
strategy:
  matrix:
    node-version: [16, 18, 20]
  fail-fast: false  # Don't cancel other jobs if one fails
```

`fail-fast: false` set karne se sabhi combinations complete hote hain, chahe koi bhi fail ho jaaye — end mein tumhe pura report milta hai ki exactly kaunsa Node version issue de raha hai.

> [!warning]
> `fail-fast: false` CI minutes zyada consume karta hai kyunki saare jobs poore chalte hain. Bade matrices ke liye iska cost-tradeoff dhyaan mein rakho.

---

## Reusable Workflows

### Kya hota hai?

Jaise tum apne Node.js code mein ek function likh ke usse baar-baar call karte ho (DRY principle — Don't Repeat Yourself), waise hi GitHub Actions mein "reusable workflows" hote hain. Ek workflow file define karo jo generic ho (jaise "test karo"), aur usse baaki workflows se call karo — parameters (`inputs`) aur secrets pass karke.

Socho CRED ke paas 15 microservices hain — payment, rewards, credit-score, notifications, etc. Har service ka apna repo hai, lekin sabka testing process same hai: checkout karo, dependencies install karo, tests chalao. Agar har repo mein alag-alag copy-paste workflow ho, toh ek chhoti si testing logic change karni ho (jaise Node version bump), toh 15 jagah edit karna padega. Reusable workflow ke saath, ek jagah define karo, sab jagah se call karo.

### Kyun zaruri hai?

Duplication maintenance ka dushman hai. Agar kal ko `npm ci` ki jagah `pnpm install` use karna ho, toh reusable workflow ke bina tumhe har repo mein jaake change karna padega. Reusable workflow ke saath, ek hi jagah update karo, sab automatically naya behaviour utha lete hain.

### Define Reusable Workflow

`workflow_call` trigger use karke ek workflow ko "callable" banaya jaata hai — jaise ek exported function.

```yaml
# .github/workflows/test.yml
name: Test

on:
  workflow_call:
    inputs:
      node-version:
        required: false
        type: string
        default: '18'
      test-command:
        required: false
        type: string
        default: 'npm test'

    secrets:
      npm-token:
        required: false

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: ${{ inputs.node-version }}
          cache: npm

      - run: npm ci

      - name: Run tests
        run: ${{ inputs.test-command }}
        env:
          NPM_TOKEN: ${{ secrets.npm-token }}
```

Dekho — `inputs` block bilkul function parameters ki tarah kaam karta hai, aur `secrets` block sensitive values (jaise NPM tokens) pass karne ka safe tareeka hai bina unhe hardcode kiye.

### Call Reusable Workflow

Same repo ke andar, dusre workflow se call karna simple hai:

```yaml
# .github/workflows/main.yml
name: CI

on: [push]

jobs:
  test:
    uses: ./.github/workflows/test.yml
    with:
      node-version: '20'
      test-command: 'npm run test:ci'
    secrets:
      npm-token: ${{ secrets.NPM_TOKEN }}
```

`uses: ./.github/workflows/test.yml` — yeh line "function call" jaisi hai. `with` block parameters pass kar raha hai, aur `secrets` block secrets pass kar raha hai (note: secrets automatically inherit nahi hote, explicitly pass karne padte hain — security ke liye yeh jaanbujh kar kiya gaya design hai).

### Reusable Workflow in Another Repository

Yeh sabse powerful part hai — tum ek dusri repository ke workflow ko bhi call kar sakte ho. Yeh bilkul ek shared npm package jaisa hai jo multiple projects use karte hain.

```yaml
# In repository B, calling workflow from repository A
test:
  uses: company/shared-workflows/.github/workflows/test.yml@main
  with:
    node-version: '18'
  secrets:
    npm-token: ${{ secrets.NPM_TOKEN }}
```

Socho company ke andar ek central `shared-workflows` repo hai jisme "standard testing workflow", "standard security scan workflow", "standard deploy workflow" defined hain. Har team apni repo mein sirf 5 line likh ke inhe call kar leti hai — bilkul jaise Flipkart ke andar ek central design-system npm package hoti hai jise saari teams import karti hain, apna button/card component dobara nahi banatin.

> [!tip]
> `@main` version pin hai — production mein `@v1.0.0` jaisa fixed tag use karna better practice hai, taaki shared workflow mein koi breaking change ho toh tumhara CI achanak break na ho.

---

## Conditional Execution

### Kya hota hai?

Har job/step hamesha nahi chalna chahiye. Kabhi tumhe sirf `main` branch pe deploy karna hai, kabhi sirf tags pe release banana hai, kabhi documentation-only commits pe pura CI skip karna hai. Conditional execution (`if:`) tumhe yeh control deta hai.

### Kyun zaruri hai?

Bina conditions ke, har push pe poora pipeline (test + build + deploy) chalega — chahe wo `develop` branch ho ya `feature/random-experiment`. Yeh CI minutes waste karta hai aur galti se staging/production pe deploy ho jaane ka risk badhata hai. Conditions ke saath tum precisely control karte ho — "yeh sirf tab chalega jab yeh specific condition true ho."

### If Conditions

```yaml
jobs:
  build:
    if: github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - run: npm run build

  deploy-staging:
    if: github.ref == 'refs/heads/develop'
    needs: build
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy-staging.sh

  deploy-prod:
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    needs: build
    runs-on: ubuntu-latest
    environment: production
    steps:
      - run: ./deploy-production.sh
```

Yahan `deploy-staging` sirf tab chalega jab branch `develop` ho, aur `deploy-prod` sirf `main` branch pe direct push hone par. Yeh bilkul Zomato ke deployment pipeline jaisa hai — feature branches sirf test tak jaate hain, `develop` branch se staging environment update hota hai (jahan QA team check karti hai), aur `main` branch se hi asli production (jahan crores customers order kar rahe hain) update hota hai.

### Skip CI

Kabhi tumhe sirf README ya comments update karne hain — code change zero hai. Poora CI pipeline chalana (jisme build + deploy ke steps minutes le sakte hain) waste hai. `[skip ci]` commit message mein daal ke pura pipeline skip kar sakte ho.

```bash
# Skip pipeline with commit message
git commit -m "Update docs [skip ci]"

# Pipeline won't run
```

```yaml
# Or in workflow
if: "!contains(github.event.head_commit.message, '[skip ci]')"
```

> [!info]
> GitHub Actions `[skip ci]`, `[ci skip]`, `[no ci]` — sab natively support karta hai bina kisi extra config ke, agar commit message mein ho. Upar wala `if:` example manual control ke liye hai jab tumhe custom logic chahiye.

### Deploy Only on Tags

Bahut si teams semantic versioning follow karti hain — jab bhi ek Git tag banta hai (jaise `v1.2.0`), tabhi production deploy hota hai, na ki har commit pe.

```yaml
deploy:
  if: startsWith(github.ref, 'refs/tags/')
  steps:
    - run: ./deploy.sh
```

Yeh IRCTC ke train-schedule update jaisa hai — har chhota internal change turant live nahi jaata, balki ek "official release" (tag) banne par hi jaata hai, taaki release process controlled aur traceable rahe.

### Approve Before Deploy

Production deployments ke liye kabhi human approval chahiye hoti hai — jaise ek senior engineer ko manually "haan, deploy karo" click karna pade. GitHub ka `environment` protection rules feature yeh deta hai.

```yaml
deploy-production:
  environment:
    name: production
    # Requires approval from CODEOWNERS
  needs: test
  steps:
    - run: ./deploy.sh
```

Socho ek banking app (jaise Paytm) mein production deploy se pehle ek senior engineer ya lead ko manually approve karna padta hai — kyunki galti costly ho sakti hai (crores users ka paisa involved hai). Yeh "environment protection rule" wahi cheez enforce karta hai — pipeline `deploy-production` job pe pause ho jaata hai jab tak koi authorized person approve na kare GitHub UI se.

---

## Caching & Performance

### Kya hota hai?

CI pipelines mein sabse zyada time waste hota hai dependencies dobara-dobara install karne mein. Har run pe `npm install` chalana (jisme sainkdo packages download hote hain) minutes le sakta hai. Caching ka matlab hai — pehle se download kiye gaye packages ko store kar lo, aur agli baar sirf tab dobara download karo jab actually kuch badla ho.

### Kyun zaruri hai?

Socho tum roz 50 baar CI trigger karte ho (team ke commits ki wajah se). Agar har run 5 minute sirf `npm install` mein lagta hai, toh woh din ka 250 minutes sirf dependencies install karne mein waste ho gaya — bina caching ke. Caching se yeh time seconds mein aa jaata hai.

### Cache Dependencies

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/cache@v3
        with:
          path: node_modules
          key: ${{ runner.os }}-npm-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-npm-

      - run: npm ci
      - run: npm run build
```

Yahan `key` ek unique identifier hai jo `package-lock.json` file ke content ke hash se banta hai. Jab tak `package-lock.json` nahi badalta (matlab dependencies same hain), cache hit hota hai aur `npm ci` seconds mein complete ho jaata hai. Jaise hi koi naya package add/remove hota hai, hash change ho jaata hai, cache miss hoti hai, aur fresh install hota hai.

`restore-keys` ek fallback hai — agar exact match na mile, toh partial match (usi OS ka koi bhi purana npm cache) use kar lo, poora se poora scratch se download karne se better hai.

Isko aise socho — jaise Swiggy ka delivery partner roz-roz naya route search nahi karta agar restaurant aur customer location same hai; wo apna "cached" best route use kar leta hai, sirf jab traffic ya location badle tab naya calculate karta hai.

### Cache Docker Layers

Agar tum Docker images build karte ho CI mein, toh layer caching bahut bada time-saver hai — kyunki Docker images layer-by-layer bante hain, aur agar koi layer unchanged hai (jaise `RUN npm install` agar package.json nahi badla), toh usse dobara build karne ki zarurat nahi.

```yaml
build-docker:
  steps:
    - uses: docker/setup-buildx-action@v2

    - uses: docker/build-push-action@v4
      with:
        context: .
        cache-from: type=gha
        cache-to: type=gha,mode=max
        push: true
```

`type=gha` ka matlab hai GitHub Actions ka built-in cache backend use karo. `mode=max` sabse aggressive caching hai — yeh intermediate layers bhi cache karta hai, na ki sirf final image ko.

### Incremental Testing

Bade monorepos mein (jaise agar tumhare paas ek repo mein frontend, backend, aur mobile app teeno hain), har commit pe sab kuch test karna wasteful hai agar sirf frontend ka code change hua ho. Incremental testing sirf woh tests chalata hai jo actually affected files se related hain.

```yaml
test:
  steps:
    - uses: actions/checkout@v3
      with:
        fetch-depth: 0

    - name: Get changed files
      id: changed
      run: |
        CHANGED=$(git diff --name-only origin/main...)
        echo "files=$CHANGED" >> $GITHUB_OUTPUT

    - name: Run relevant tests
      run: |
        if echo "${{ steps.changed.outputs.files }}" | grep -q "src/"; then
          npm run test:unit
        fi
        if echo "${{ steps.changed.outputs.files }}" | grep -q "api/"; then
          npm run test:integration
        fi
```

`fetch-depth: 0` zaruri hai kyunki full Git history chahiye hoti hai diff nikalne ke liye (default shallow clone sirf last commit leta hai). Phir `git diff` se pata chalta hai kaunse files change hue, aur usi ke hisaab se selectively unit ya integration tests chalte hain.

> [!warning]
> Incremental testing ka trade-off yeh hai — agar tumhara dependency graph complex hai (jaise `src/` ka change `api/` ko bhi affect karta hai indirectly), toh galat tests skip ho sakte hain. Isliye periodically (jaise nightly build mein) full test suite bhi chalate raho, sirf incremental pe hi bharosa mat karo.

---

## Artifact Management

### Kya hota hai?

Artifacts wo files hain jo ek job produce karta hai aur jinhe dusra job (ya human) baad mein use karna chahta hai — jaise compiled build output, test reports, ya logs. Kyunki har job apne khud ke fresh, isolated container mein chalta hai, ek job ki files automatically dusre job ko nahi milti — unhe explicitly "upload" aur "download" karna padta hai.

Socho ek assembly line hai — ek station product ka ek part banata hai, usse box mein pack karta hai (upload), aur agla station us box ko utha ke (download) apna kaam continue karta hai. GitHub Actions mein artifacts wahi box hain jo ek job se dusre job tak data carry karte hain.

### Kyun zaruri hai?

Bina artifacts ke, agar `build` job ne dist folder banaya, toh `deploy` job (jo alag machine/container mein chalta hai) ko wo dist folder dikhega hi nahi — usse phir se build karna padega, jo time waste aur inconsistency ka risk hai (kya pata dono builds mein slight difference aa jaaye).

### Upload Artifacts

```yaml
build:
  steps:
    - run: npm run build

    - uses: actions/upload-artifact@v3
      with:
        name: build-${{ github.sha }}
        path: dist/
        retention-days: 30
        if-no-files-found: error
```

`name` mein `github.sha` (commit hash) daalna important practice hai — isse har build uniquely identify ho jaata hai, aur agar parallel builds chal rahe hon toh naam collide nahi karte. `retention-days: 30` batata hai kitne din tak GitHub isse store karega (uske baad automatically delete). `if-no-files-found: error` ek safety-net hai — agar `dist/` khali ho gaya (matlab build fail hone ke baawajood step pass ho gaya), toh yeh explicitly fail kar dega taaki silent bug na bane.

### Download Artifacts

```yaml
deploy:
  needs: build
  steps:
    - uses: actions/download-artifact@v3
      with:
        name: build-${{ github.sha }}
        path: dist/

    - run: ./deploy.sh
```

`needs: build` ensure karta hai ki `deploy` job tabhi start ho jab `build` job successfully complete ho chuka ho — aur uska artifact available ho. Yeh dependency chain hi CI/CD pipelines ka backbone hai.

### Artifact Storage Management

Artifacts storage lete hain, aur agar unhe manage na kiya jaaye, toh storage bill badh sakta hai (khaaskar private repos mein jahan free tier limited hai). Purane, unused artifacts ko periodically clean karna zaruri hai.

```yaml
cleanup:
  runs-on: ubuntu-latest
  steps:
    - name: Delete old artifacts
      uses: jimschubert/delete-artifacts-action@v1
      with:
        min-rows-retained: 10
        artifact-retention-days: 30
```

Yeh bilkul apne phone ki gallery clean karne jaisa hai — purani, kaam ki na rahi screenshots delete karke storage free karna. `min-rows-retained: 10` ensure karta hai ki latest 10 artifacts hamesha rakhe jaayein (safety ke liye), baaki 30 din se purane delete ho jaayein.

---

## Workflow Composition

### Kya hota hai?

Workflow composition ka matlab hai — chhote, focused workflows (lint, test, build, deploy) ko jod ke ek bada orchestrated pipeline banana. Yeh microservices architecture jaisa hi principle hai — chhote pieces jo independently manage ho sakte hain, lekin saath milke ek bada system bante hain.

### Orchestrate Multiple Workflows

```yaml
# main.yml - orchestrates everything
name: Full CI/CD

on: [push, pull_request]

jobs:
  # Lint step
  lint:
    uses: ./.github/workflows/lint.yml

  # Test step (depends on lint)
  test:
    needs: lint
    uses: ./.github/workflows/test.yml
    with:
      node-version: '18'

  # Build step (depends on test)
  build:
    needs: test
    uses: ./.github/workflows/build.yml

  # Deploy step (only on main, depends on build)
  deploy:
    if: github.ref == 'refs/heads/main'
    needs: build
    uses: ./.github/workflows/deploy.yml
    secrets:
      deploy-token: ${{ secrets.DEPLOY_TOKEN }}
```

`main.yml` yahan ek "conductor" ki tarah kaam kar raha hai — khud koi kaam nahi kar raha, sirf batata hai kis order mein kaunsa reusable workflow chalega. Lint fail ho gaya toh test kabhi chalega hi nahi (`needs: lint`), isse resources waste nahi hote agar basic code quality issue hi hai.

Yeh bilkul railway reservation system ke backend jaisa hai — payment verify karo (lint), phir seat availability check karo (test), phir ticket generate karo (build), aur sirf tabhi confirmation SMS bhejo (deploy) jab sab pehle steps successful ho.

### Parallel with Convergence

Kabhi jobs ek dusre pe depend nahi karte aur independently chal sakte hain — unhe sequentially chalana time waste hai. "Fan-out, fan-in" pattern use karo: multiple jobs parallel mein chalao, phir ek final job unn sabke complete hone ka wait kare.

```yaml
jobs:
  # Parallel jobs
  unit-test:
    runs-on: ubuntu-latest
    steps:
      - run: npm run test:unit

  lint:
    runs-on: ubuntu-latest
    steps:
      - run: npm run lint

  security:
    runs-on: ubuntu-latest
    steps:
      - run: npm audit

  # Convergence job (waits for all)
  deploy:
    needs: [unit-test, lint, security]
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy.sh
```

`unit-test`, `lint`, aur `security` — teeno ek saath, parallel mein chalte hain (kyunki inn teeno mein koi dependency nahi hai). `deploy` job `needs: [unit-test, lint, security]` likh ke teeno ka wait karta hai, aur tabhi start hota hai jab sab pass ho jaayein. Agar inhe sequentially chalate (ek ke baad ek), toh total time teeno ka sum hota — parallel mein chalane se total time sirf sabse lambe job jitna hota hai.

Yeh bilkul BigBasket ke order-processing jaisa hai — payment verification, inventory check, aur delivery-slot allocation — teeno independently, parallel mein chalte hain, aur sirf jab teeno confirm ho jaayein tabhi "order confirmed" final step trigger hota hai.

---

## Complex Patterns

### Dynamic Job Generation

Kabhi tumhe matrix values compile-time pe fixed nahi, balki runtime pe decide karni hoti hain — jaise ek JSON file se ya kisi API call se. GitHub Actions yeh "dynamic matrix" support karta hai.

```yaml
test:
  runs-on: ubuntu-latest
  outputs:
    matrix: ${{ steps.set-matrix.outputs.matrix }}

  steps:
    - uses: actions/checkout@v3

    - id: set-matrix
      run: |
        MATRIX=$(cat test-matrix.json)
        echo "matrix=$MATRIX" >> $GITHUB_OUTPUT

run-tests:
  needs: test
  strategy:
    matrix: ${{ fromJson(needs.test.outputs.matrix) }}
  steps:
    - run: npm run test -- ${{ matrix.test-suite }}
```

```json
// test-matrix.json
{
  "test-suite": ["unit", "integration", "e2e"]
}
```

Yahan pehla job (`test`) ek JSON file read karta hai aur uska content "output" ke roop mein expose karta hai. Dusra job (`run-tests`) uss output ko `fromJson()` se parse karke apni matrix strategy bana leta hai. Yeh powerful hai kyunki tum matrix ko runtime pe dynamically generate kar sakte ho — jaise "sirf woh test-suites chalao jo changed files se related hain" ya "kisi external config service se list fetch karo."

### Workflow Dispatch with Inputs

`workflow_dispatch` ek manual trigger hai — GitHub UI se koi bhi authorized person button click karke workflow chala sakta hai, aur usse custom inputs bhi de sakta hai (jaise dropdown se environment choose karna).

```yaml
name: Deploy

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deployment environment'
        required: true
        type: choice
        options:
          - staging
          - production

      version:
        description: 'Version to deploy'
        required: true
        type: string

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment }}
    steps:
      - run: |
          echo "Deploying version ${{ github.event.inputs.version }}"
          echo "To environment ${{ github.event.inputs.environment }}"
```

Yeh bilkul OYO ke internal admin panel jaisa hai jahan ek on-call engineer manually "rollback to version X" button dabata hai, aur dropdown se environment choose karta hai. `type: choice` GitHub UI mein ek dropdown render karta hai (`staging`/`production`), jisse galti se galat environment type hone ka risk kam ho jaata hai.

### Polling External Checks

Kabhi tumhare deploy pipeline ko kisi external system (jaise ek third-party service ya CDN cache invalidation) ke "ready" hone ka wait karna padta hai, jiske paas koi webhook nahi hota. Iske liye polling (baar-baar check karna) use karte hain.

```yaml
deploy:
  steps:
    - name: Wait for external system
      run: |
        for i in {1..30}; do
          if curl -f https://external-system/ready; then
            echo "System ready!"
            exit 0
          fi
          echo "Waiting... attempt $i/30"
          sleep 10
        done
        exit 1
```

Yeh bilkul waise hai jaise tum Swiggy app pe order status refresh karte raho jab tak "Order Picked Up" na dikhe — har 10 second mein check karo, max 30 attempts (5 minute) tak, uske baad agar ready nahi hua toh timeout maan ke fail ho jao. `curl -f` flag important hai — yeh HTTP error codes (4xx/5xx) par curl ko fail treat karne ke liye majboor karta hai, warna curl silently success bol sakta hai.

> [!warning]
> Polling loops mein hamesha ek upper limit (`for i in {1..30}`) rakho. Bina limit ke agar external system kabhi ready na ho, tumhara CI job hamesha ke liye hang ho jaayega aur CI minutes waste hote rahenge.

### Multi-Stage with Approvals

Real production pipelines mein aksar multiple stages hote hain jinme har stage pehle wale pe depend karta hai, aur kuch stages ko human approval chahiye hoti hai beech mein.

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: npm test

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - run: npm run build

  deploy-staging:
    needs: build
    environment: staging
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy-staging.sh

  deploy-production:
    needs: [build, deploy-staging]
    environment:
      name: production
      # Requires approval
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy-production.sh
```

Flow yeh hai: test pass ho → build bane → staging pe deploy ho → QA/team check kare staging pe → tabhi production deploy ho, jo bhi manual approval ke peeche gated hai. Yeh CRED ya kisi bhi fintech company ka standard release process hai — koi bhi change directly production mein nahi jaata, staging se hokar, human sign-off ke saath jaata hai.

---

## Best Practices for Advanced Workflows

### 1. Document Complex Workflows

Jaise complex code mein comments zaruri hote hain, waise hi complex CI conditions mein bhi. Agar `if:` condition mein 3 aur (`&&`)/or (`||`) mix ho, toh 6 mahine baad koi (khud tum bhi) padh ke confuse ho sakta hai ki yeh kyun likha gaya.

```yaml
# Clear comments explaining complex logic
jobs:
  test:
    # Only run tests on PRs and commits to main/develop
    if: github.event_name == 'pull_request' || github.ref in ('refs/heads/main', 'refs/heads/develop')
    runs-on: ubuntu-latest
    steps:
      - run: npm test
```

### 2. Use Consistent Output Names

Jab jobs ek dusre ko data pass karte hain (`outputs`), toh naming convention consistent rakho — jaise hamesha `version`, `image-tag` jaise predictable naam, alag-alag jagah `ver`, `tag`, `v` jaisi inconsistency mat rakho.

```yaml
jobs:
  build:
    outputs:
      image-tag: ${{ steps.meta.outputs.tags }}
      version: ${{ steps.version.outputs.version }}
    steps:
      - id: meta
        run: echo "tags=myapp:latest" >> $GITHUB_OUTPUT
      - id: version
        run: echo "version=1.0.0" >> $GITHUB_OUTPUT
```

### 3. Fail Fast on Critical Issues

Agar lint hi fail ho raha hai, toh test suite chalane ka koi matlab nahi — CI minutes waste honge. Critical checks ko pehle rakho, aur unpe dependency lagao.

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - run: npm run lint
      # Fails entire workflow if lint fails

  test:
    needs: lint  # Won't run if lint fails
    runs-on: ubuntu-latest
    steps:
      - run: npm test
```

### 4. Provide Clear Feedback

CI logs mein saaf, readable status messages dena — emoji ke saath bhi — pipeline ko debug karna aasan bana deta hai, khaaskar jab team ke naye members logs padh rahe hon.

```yaml
steps:
  - name: Run tests
    id: tests
    run: npm test
    continue-on-error: true

  - name: Report results
    run: |
      if [ "${{ steps.tests.outcome }}" == "failure" ]; then
        echo "❌ Tests failed"
        exit 1
      else
        echo "✅ Tests passed"
      fi
```

`continue-on-error: true` interesting hai — yeh step ko fail hone dete hue bhi pipeline ko aage badhne deta hai (taaki agla step `outcome` check kar sake aur custom message de sake), lekin phir manually `exit 1` karke overall job ko sahi se fail karwaya ja raha hai.

---

## Practical Example: Complete Advanced Workflow

Ab tak jitne bhi patterns dekhe — matrix, reusable workflows, conditions, dependencies — sab ek saath combine karke ek real, production-jaisa pipeline dekhte hain:

```yaml
name: Advanced CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  workflow_dispatch:
    inputs:
      environment:
        type: choice
        options: [staging, production]

jobs:
  # Matrix testing
  test:
    strategy:
      matrix:
        node-version: [18, 20]
        os: [ubuntu-latest, macos-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: npm
      - run: npm ci && npm test

  # Reusable workflow
  build:
    needs: test
    uses: ./.github/workflows/build.yml

  # Deploy with conditions
  deploy-staging:
    if: github.ref == 'refs/heads/develop'
    needs: build
    environment: staging
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy.sh

  deploy-production:
    if: |
      github.ref == 'refs/heads/main' ||
      github.event_name == 'workflow_dispatch'
    needs: build
    environment: production
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy.sh
```

Is ek workflow file mein dekho kitni cheezein saath aa rahi hain: `test` job matrix ke through 4 combinations (2 Node versions × 2 OS) parallel test kar raha hai; `build` ek reusable workflow call kar raha hai jo `test` ke pass hone ke baad hi trigger hota hai; aur do deploy jobs conditional logic ke through decide kar rahe hain ki staging jaana hai ya production, based on branch ya manual trigger. Yeh bilkul waisa hi pipeline hai jo real companies (Zomato, Flipkart, CRED jaisi) apne production systems ke liye use karti hain.

## Key Takeaways

- **Matrix builds** ek job definition se multiple version/OS combinations parallel mein test karne dete hain — bina copy-paste kiye.
- **Reusable workflows** (`workflow_call`) duplication khatam karte hain — ek jagah logic likho, kai repos/jobs se call karo, `inputs` aur `secrets` ke through parameterize karo.
- **Conditional execution** (`if:`) precise control deta hai ki kaunsa job kab chalega — branch, event type, ya commit message ke basis pe.
- **Caching** (dependencies aur Docker layers) CI run time drastically kam karta hai jab tak underlying content (jaise `package-lock.json`) change na ho.
- **Artifacts** ek job se dusre job tak files carry karte hain (upload → download), kyunki har job apne isolated environment mein chalta hai.
- **Workflow composition** — chhote focused workflows ko jod ke bada pipeline banana, chahe sequential dependency ho (`needs`) ya parallel-with-convergence pattern ho.
- **Environment protection rules** production deploys ko human approval ke peeche gate karte hain — critical systems ke liye zaruri safety net.
- Advanced patterns (dynamic matrix, polling, multi-stage approvals) sophisticated real-world requirements handle karte hain jo simple linear pipeline se nahi ho sakte.

Next: [AWS Essentials](../03_aws_essentials/01_aws_overview.md) - cloud infrastructure
