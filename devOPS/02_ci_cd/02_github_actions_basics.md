# GitHub Actions Basics

## Is File Mein Kya Seekhoge

- GitHub Actions ke concepts aur terminology
- Apna pehla workflow banana
- Triggers, jobs, steps, aur runners ka pura game
- Common CI/CD patterns jo har company use karti hai
- Node.js, Python, aur Docker ke practical examples

---

## GitHub Actions Hai Kya Cheez?

Socho tumne code push kiya GitHub pe, aur ab tumhe manually terminal khol ke `npm test`, phir `npm run build`, phir server pe SSH karke deploy karna pad raha hai. Har baar. Har chhote se change ke liye. Bore ho jaoge na 2 din mein hi.

**GitHub Actions** exactly isi problem ko solve karta hai — yeh GitHub ka apna built-in CI/CD platform hai jo tumhare repository ke andar hi automated workflows chala deta hai. Matlab tumhare GitHub account mein hi ek "robot worker" baitha hai jo tumhare bataye hue rules follow karke test, build, aur deploy karta rehta hai — bina tumhe kuch manually karne ke.

Isko aise socho — jaise Swiggy mein order place karte hi automatically restaurant ko notification jaata hai, order prepare hota hai, delivery partner assign hota hai, aur tumhare ghar tak pahunch jaata hai — sab kuch ek chain reaction ki tarah, bina kisi manual intervention ke. GitHub Actions bhi waisa hi hai: "push hua code" → automatically "test chalo" → "build karo" → "deploy ho jao".

### Kyun Use Karein GitHub Actions?

✅ **GitHub ke saath hi integrated hai** — Jenkins, CircleCI jaisa alag se tool set up nahi karna padta. Repo hai toh Actions bhi ready hai.
✅ **Public repos ke liye free hai** — private repos ke liye bhi 2000 minutes/month free milta hai, jo ek side project ya small team ke liye kaafi hota hai.
✅ **Marketplace bahut bada hai** — hazaaron pre-built "actions" available hain jo GitHub ki community ne banaye hain. Deploy to AWS karna hai? Ek action already hai. Slack pe notification bhejni hai? Uske liye bhi hai.
✅ **Self-hosted runners bhi chala sakte ho** — agar tumhe apni khud ki machine pe workflow chalana hai (jaise company ka internal server), toh woh bhi possible hai.
✅ **Matrix builds** — ek hi workflow ko multiple Node.js versions ya multiple OS (Ubuntu, Windows, Mac) pe ek saath test kar sakte ho, bina copy-paste kiye.

---

## Core Concepts — Building Blocks Samjho

CI/CD pipeline ko IRCTC ke ticket booking system se compare karo — jaise wahan "trigger" hai (tumne "Book Now" dabaya), "job" hai (payment process, seat allocation, ticket generation — yeh sab parallel bhi ho sakte hain), aur "steps" hain (individual actions jaise "verify payment", "check seat availability"). GitHub Actions mein bhi same hierarchy hai.

### 1. **Workflow**
Ek automated process jo ek YAML file mein define hota hai (`.github/workflows/` folder ke andar). Yeh sabse bada container hai — iske andar jobs hote hain, jobs ke andar steps.

### 2. **Event (Trigger)**
Woh cheez jo workflow ko start karti hai:
- `push` — Code repo mein push hua
- `pull_request` — PR open hua ya update hua
- `schedule` — Cron schedule ke hisaab se (jaise "har raat 12 baje")
- `workflow_dispatch` — Manually button dabake trigger karna

### 3. **Job**
Steps ka ek group jo same runner (machine) pe chalta hai. Default mein jobs **parallel** chalte hain — jaise Zomato mein ek saath multiple orders alag-alag kitchens mein prepare ho sakte hain, agar unme dependency na ho.

### 4. **Step**
Ek individual task — ya toh koi command run karoge (`run: npm test`) ya kisi existing action ko use karoge (`uses: actions/checkout@v3`).

### 5. **Action**
Reusable code ka ek chunk — marketplace se le sakte ho ya khud bana sakte ho. Isko npm package jaisa socho — kisi aur ne likha hua, tum bas import karke use kar rahe ho.

### 6. **Runner**
Woh server jispe tumhara workflow actually chalta hai — GitHub-hosted (GitHub ki khud ki machines, free tier ke saath) ya self-hosted (tumhari apni machine).

> [!info]
> Yeh sab samajhne ke baad yaad rakho: **Workflow > Jobs > Steps**. Ek workflow mein multiple jobs ho sakte hain, ek job mein multiple steps.

---

## Workflow Ka Structure

Basic anatomy dekh lo pehle — isse pura structure clear ho jayega:

```yaml
name: CI Pipeline

# Kab chalana hai yeh workflow
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

# Jobs jo chalane hain
jobs:
  build:
    runs-on: ubuntu-latest  # Runner (machine ka type)
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Run tests
        run: npm test
```

Yahan `name` sirf workflow ka display naam hai (GitHub Actions tab mein dikhega). `on` batata hai kab trigger hoga. `jobs` ke andar `build` naam ka job hai jo `ubuntu-latest` machine pe chalega, aur uske 2 steps hain.

---

## Tumhara Pehla Workflow

### Example: Node.js CI Pipeline

`.github/workflows/ci.yml` naam ki file banao apne repo mein (yeh path fixed hai — GitHub sirf isi folder ke andar dekhta hai workflows ke liye):

```yaml
name: Node.js CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      # Step 1: Code ko checkout karo
      - name: Checkout repository
        uses: actions/checkout@v3
      
      # Step 2: Node.js setup karo
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      # Step 3: Dependencies install karo
      - name: Install dependencies
        run: npm ci
      
      # Step 4: Linter chalao
      - name: Run ESLint
        run: npm run lint
      
      # Step 5: Tests chalao
      - name: Run tests
        run: npm test
      
      # Step 6: Coverage upload karo
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

**Kya ho raha hai yahan step-by-step?** Sabse pehle `actions/checkout@v3` chalta hai — bina isse tumhara runner ek khaali machine hai, usko pata hi nahi tumhara code kahan hai. Yeh action tumhare repo ka code us runner machine pe clone kar deta hai. Phir Node.js setup hota hai (jaise tum apni laptop pe nvm use karke Node install karte ho, waise hi yahan automated hai). Uske baad `npm ci` (clean install — `npm install` se fast aur predictable, kyunki yeh `package-lock.json` ko exactly follow karta hai). Fir lint, test, aur coverage report upload.

> [!tip]
> `npm ci` hamesha use karo CI pipelines mein, `npm install` nahi. `npm ci` `package-lock.json` ko strictly respect karta hai aur `node_modules` ko fresh se banata hai — deterministic builds ke liye zaruri hai.

---

## Triggers (Events) — Kab Chalega Yeh Workflow?

### Push Events
```yaml
on:
  push:
    branches:
      - main
      - develop
    paths:
      - 'src/**'        # Sirf tab chalao jab src/ ke andar files change hui hon
      - '!docs/**'      # docs/ ke changes ko ignore karo
```

Isse tum control kar sakte ho ki kaunse branch pe push hone se workflow trigger ho, aur `paths` filter se yeh bhi control kar sakte ho ki sirf specific folders ke changes matter karein. Agar sirf README update kiya hai toh poora CI pipeline chalane ka koi matlab nahi — waqt aur minutes dono waste honge.

### Pull Request Events
```yaml
on:
  pull_request:
    types: [ opened, synchronize, reopened ]
    branches: [ main ]
```

Jab bhi koi PR `main` branch ke against khole, update kare (naya commit push kare = `synchronize`), ya reopen kare — workflow chalega. Yeh sabse common pattern hai teams mein taaki merge se pehle hi pata chal jaaye ki code break toh nahi ho raha.

### Schedule (Cron)
```yaml
on:
  schedule:
    - cron: '0 0 * * *'  # Har din midnight UTC pe
    - cron: '0 */6 * * *'  # Har 6 ghante mein
```

Yeh bilkul cron job jaisa hai jo tumne Linux mein dekha hoga. Use case: raat ko automated database backup, ya har 6 ghante mein dependency vulnerabilities scan karna — jaise ek automated health-checkup jo apne aap chalta rehta hai bina kisi ko yaad rakhna pade.

> [!warning]
> Cron time hamesha **UTC** mein hota hai, IST mein nahi. Agar tumhe raat 12 baje IST pe kuch chalana hai, toh UTC mein convert karna padega (IST = UTC + 5:30).

### Manual Trigger
```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy'
        required: true
        default: 'staging'
        type: choice
        options:
          - staging
          - production
```

Yeh ek "Run Workflow" button de deta hai GitHub UI mein — bilkul jaise Zomato app mein "Reorder" button hota hai jo tum manually dabate ho. Production deploy jaisi sensitive cheezein aksar manual trigger pe hi rakhi jaati hain, taaki accidental deploy na ho jaaye.

### Multiple Events Ek Saath
```yaml
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 0 * * 0'  # Weekly
  workflow_dispatch:
```

Yeh sab combine bhi kar sakte ho — push pe bhi chale, PR pe bhi, weekly schedule pe bhi, aur manually bhi. Flexibility poori hai.

---

## Jobs Aur Steps

### Single Job
```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm test
```

Simple case — ek hi job, sequential steps.

### Multiple Jobs (Parallel Mein Chalte Hain)
```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm run lint
  
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm test
  
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm run build
```

**Kyun zaruri hai yeh?** Kyunki `lint`, `test`, aur `build` mein koi dependency nahi hai — ek dusre ka result use nahi karte. Toh GitHub Actions inhe automatically **parallel** chalata hai (alag-alag machines pe, same time pe). Isse total pipeline time kam ho jaata hai. Socho Swiggy mein tumhara order 3 alag dishes ka hai — sab kitchen mein alag chef ek saath bana rahe hain, sequential nahi.

### Sequential Jobs (Dependencies)
```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm run build
  
  test:
    needs: build  # build complete hone ka wait karega
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm test
  
  deploy:
    needs: [build, test]  # dono ka wait karega
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: ./deploy.sh
```

Yahan `needs` keyword se dependency define hoti hai. `deploy` job tab tak start nahi hoga jab tak `build` aur `test` dono successfully complete na ho jaayein. Yeh bilkul railway reservation jaisa hai — pehle seat availability check hogi (build), phir payment verify hoga (test), tabhi ticket confirm hoga (deploy). Order matter karta hai yahan.

---

## Marketplace Se Actions Use Karna

Marketplace ko npm registry jaisa socho — waise hi jaise `npm install` karke koi package use karte ho, waise hi `uses:` likh ke kisi ka pre-built action use kar lete ho.

### Code Checkout Karna
```yaml
- name: Checkout code
  uses: actions/checkout@v3
```
Har workflow ka pehla step almost hamesha yahi hota hai — bina iske runner ke paas tumhara code hi nahi hoga.

### Node.js Setup
```yaml
- name: Setup Node.js
  uses: actions/setup-node@v3
  with:
    node-version: '18'
    cache: 'npm'  # node_modules cache karega
```
`cache: 'npm'` bahut important hai — isse har baar `npm install` scratch se nahi hoga, pehle se cached dependencies use ho jaayengi, jisse pipeline fast chalta hai.

### Python Setup
```yaml
- name: Setup Python
  uses: actions/setup-python@v4
  with:
    python-version: '3.11'
    cache: 'pip'
```

### Dependencies Cache Karna
```yaml
- name: Cache node_modules
  uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
```

**Kaise kaam karta hai yeh?** `key` unique hota hai based on `package-lock.json` ka hash — matlab jab tak dependencies same hain, cache reuse hoga. Jaise hi `package-lock.json` change hua (naya package add kiya), naya cache banega. Yeh bilkul BigBasket ke warehouse jaisa hai — agar same order repeat ho raha hai, toh pehle se packed items use karo, scratch se packing mat karo.

### Artifacts Upload/Download Karna
```yaml
# Upload
- name: Upload build artifacts
  uses: actions/upload-artifact@v3
  with:
    name: dist-files
    path: dist/

# Download (dusre job mein)
- name: Download build artifacts
  uses: actions/download-artifact@v3
  with:
    name: dist-files
    path: dist/
```

Yeh feature tab kaam aata hai jab ek job kuch build karta hai (jaise `dist/` folder) aur dusra job (jo shayad alag machine pe chal raha hai) usko use karna chahta hai. Har job apni khud ki fresh machine pe chalta hai, toh files automatically share nahi hoti — isliye explicitly upload/download karna padta hai. Socho Flipkart ka warehouse-to-delivery-hub transfer — packed parcel (artifact) ek jagah se dusri jagah bheja jaata hai taaki agla step usko use kar sake.

---

## Environment Variables Aur Secrets

### Environment Variables
```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    env:
      NODE_ENV: production
      API_URL: https://api.example.com
    steps:
      - run: echo "Environment: $NODE_ENV"
      - run: echo "API URL: ${{ env.API_URL }}"
```

Yeh normal environment variables hain — non-sensitive config values ke liye, jaise `NODE_ENV` ya public API URLs.

### Secrets — Sensitive Data Ke Liye
```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: ./deploy.sh
```

**Add secrets**: Repository Settings → Secrets and variables → Actions → New repository secret

**Kyun zaruri hai secrets use karna?** Kabhi bhi apni AWS keys, database passwords, ya API tokens directly YAML file mein hardcode mat karo — woh public repo mein toh sabko dikh jaayega, aur private repo mein bhi accidentally leak ho sakta hai. GitHub Secrets encrypted store hote hain aur workflow logs mein automatically **** (masked) dikhte hain. Yeh bilkul CRED ka vault jaisa hai — tumhara actual card number kahin plain text mein store nahi hota, encrypted form mein hi rehta hai.

> [!warning]
> Secrets ko kabhi bhi `echo` mat karo directly (jaise `run: echo $AWS_SECRET_ACCESS_KEY`) — kuch cases mein yeh log mein expose ho sakta hai. GitHub bahut cases mein auto-mask kar deta hai, but best practice yahi hai ki secrets ko sirf jahan zarurat hai wahan use karo, print mat karo.

---

## Matrix Builds

Ek hi workflow ko multiple Node.js versions aur multiple operating systems pe ek saath test karna:

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node-version: [16, 18, 20]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
      
      - run: npm ci
      - run: npm test
```

**Result**: 9 jobs chalenge (3 OS × 3 Node versions)

**Kya hota hai yahan?** GitHub Actions automatically saare combinations bana deta hai — 3 OS aur 3 Node versions ka matlab hai 3×3 = 9 alag-alag jobs, sab parallel mein chalenge. Kyun zaruri hai yeh? Kyunki tumhara code Ubuntu pe perfectly chal sakta hai but Windows pe file-path issue ki wajah se fail ho sakta hai (jaise `/` vs `\`). Agar tum ek open-source library maintain kar rahe ho jise log alag-alag machines pe use karenge, matrix builds se confidence milta hai ki sab jagah kaam karega — bilkul jaise ek app ko Android ke alag-alag phone models pe test karna padta hai (Samsung, Xiaomi, OnePlus) kyunki har manufacturer thoda different behavior de sakta hai.

---

## Conditional Execution

### Sirf specific branch pe step chalao
```yaml
- name: Deploy to production
  if: github.ref == 'refs/heads/main'
  run: ./deploy.sh
```

### Success/Failure pe chalao
```yaml
- name: Notify on failure
  if: failure()
  run: curl -X POST $SLACK_WEBHOOK -d '{"text":"Build failed!"}'

- name: Notify on success
  if: success()
  run: echo "Build succeeded!"
```

Isse tum Slack notification bhej sakte ho jab build fail ho — bilkul jaise Ola/Uber mein driver ko ride cancel hone pe automatically notification jaata hai. Team ko turant pata chal jaata hai ki kuch toota hai, koi manually CI dashboard check karte nahi rehna padta.

### Poore jobs skip karna
```yaml
jobs:
  deploy:
    if: "!contains(github.event.head_commit.message, '[skip ci]')"
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy.sh
```

Agar commit message mein `[skip ci]` likha hai, toh yeh job skip ho jaayega. Yeh tab useful hai jab tum sirf README ya comments update kar rahe ho aur pura CI/CD pipeline chalane ka koi matlab nahi.

---

## Real-World Examples

### Complete Node.js CI/CD Pipeline

Yeh dekho ek production-grade pipeline kaisi dikhti hai — sab concepts ek saath combine karke:

```yaml
name: Node.js CI/CD

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [16, 18, 20]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      - run: npm ci
      - run: npm test
      - name: Upload coverage
        if: matrix.node-version == '18'
        uses: codecov/codecov-action@v3

  build:
    needs: [lint, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v3
        with:
          name: build-files
          path: dist/

  deploy:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/download-artifact@v3
        with:
          name: build-files
          path: dist/
      - name: Deploy to production
        env:
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
        run: ./scripts/deploy.sh
```

**Flow samjho**: `lint` aur `test` pehle parallel chalte hain (kyunki dono independent hain). Dono pass ho jaayein tabhi `build` chalega (`needs: [lint, test]`). Build pass hote hi artifact upload hota hai. Aur `deploy` sirf tab chalega jab `build` complete ho aur branch `main` ho — matlab agar tum `develop` branch pe push kar rahe ho, toh deploy skip ho jaayega, sirf lint-test-build hoga. Yeh exactly waisa hai jaise IRCTC mein: pehle availability check (lint), phir payment gateway verify (test) — dono pass hue tabhi ticket generate hota hai (build), aur confirmation SMS sirf real booking pe jaata hai, waitlist pe nahi (deploy sirf main branch pe).

### Python FastAPI CI

```yaml
name: Python CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ['3.9', '3.10', '3.11']
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Python ${{ matrix.python-version }}
        uses: actions/setup-python@v4
        with:
          python-version: ${{ matrix.python-version }}
          cache: 'pip'
      
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-cov black ruff
      
      - name: Format check
        run: black --check .
      
      - name: Lint
        run: ruff check .
      
      - name: Run tests
        run: pytest --cov=app tests/
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

Yahan `black --check .` code formatting verify karta hai (bina actually files change kiye — sirf check karta hai ki format sahi hai ya nahi), `ruff check .` fast linting karta hai, aur phir `pytest` coverage ke saath tests chalata hai. Python ecosystem mein yeh combination (black + ruff + pytest) bahut common hai modern FastAPI projects mein.

---

## Best Practices

✅ **Dependencies cache karo** (npm, pip) — builds fast ho jaate hain
✅ **Matrix builds use karo** — multiple versions/platforms pe testing ke liye
✅ **Fail fast** — Slow integration tests se pehle lint aur fast tests chalao, taaki jaldi pata chale kuch basic galat hai
✅ **Secrets use karo** sensitive data ke liye, kabhi bhi commit mat karo
✅ **Action versions pin karo** (`actions/checkout@v3`, `@main` nahi) — warna kisi bhi din breaking change aa sakta hai bina tumhe pata chale
✅ **Status badges add karo** README mein — visibility ke liye
✅ **Timeouts set karo** — hung jobs ko rokne ke liye

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 10  # 10 minutes se zyada laga toh fail kar do
```

> [!tip]
> `@main` ya `@latest` use karne se bachna chahiye production workflows mein. Kyun? Kyunki agar us action ka maintainer koi breaking change push kar de `main` branch pe, tumhara pipeline achanak fail hone lagega bina tumne khud kuch change kiye. `@v3` jaisa pinned version use karo taaki stability guaranteed rahe — bilkul jaise `package.json` mein exact version pin karte ho critical dependencies ke liye.

> [!warning]
> Timeout set na karna ek common mistake hai. Agar koi step hang ho jaaye (jaise koi infinite loop ya deadlock), bina timeout ke woh job ghanton chalta rahega aur tumhare free minutes waste hote rahenge.

---

## Exercise

### Task 1: Apna Pehla Workflow Banao

1. Ek naya GitHub repository banao
2. `.github/workflows/ci.yml` file add karo:

```yaml
name: CI

on: [push, pull_request]

jobs:
  greet:
    runs-on: ubuntu-latest
    steps:
      - run: echo "Hello, GitHub Actions!"
      - run: echo "Event: ${{ github.event_name }}"
      - run: echo "Branch: ${{ github.ref }}"
```

3. Push karo aur Actions tab check karo

### Task 2: Ek Real CI Pipeline Add Karo

Apne Node.js/Python project ke liye ek workflow add karo jisme yeh ho:
- Dependency installation
- Linting
- Testing
- Build (agar applicable ho)

---

## Key Takeaways

- GitHub Actions repo ke andar hi built-in CI/CD hai — YAML files `.github/workflows/` folder mein rehti hain.
- Hierarchy yaad rakho: **Workflow → Jobs → Steps**. Jobs default mein parallel chalte hain, jab tak `needs` se dependency na di ho.
- Triggers (`on:`) decide karte hain kab workflow chale — push, PR, schedule (cron, UTC mein), ya manual (`workflow_dispatch`).
- `uses:` marketplace actions ke liye hai (npm packages jaisa), `run:` raw shell commands ke liye.
- Secrets ko hamesha GitHub Secrets mein store karo, kabhi hardcode ya print mat karo.
- Matrix builds se ek hi workflow multiple OS/versions pe parallel test ho jaata hai.
- `if:` conditions se selective execution control karo — branch-based deploy, failure notifications, skip logic.
- Action versions hamesha pin karo (`@v3`), `@main` avoid karo production mein.
- Timeouts set karna mat bhoolo — hung jobs se free minutes bachate hain.

---

**Next**: [Building & Testing](./03_building_and_testing.md) → Tests aur code quality checks ko automate karo
