# Secrets Management in CI/CD

> Credentials, API keys, aur sensitive data ko apne CI/CD pipelines mein securely handle karna — bina expose kiye.

Socho ek second — tumne CRED ya Paytm jaisi app banayi hai, aur usme database ka password, AWS ka secret key, third-party payment gateway ka API key — sab kuch hardcode kar diya code mein. Ab tumne wo code GitHub pe push kar diya. Bas, ho gaya — kisi ne bhi tumhara repo dekha (public ho ya kisi tarah leak ho), aur uske paas tumhare production database ki chaabi hai. Yeh utna hi dangerous hai jitna apne ghar ki chaabi building ke notice board pe chipka dena "taaki courier wale ko dikkat na ho."

Secrets management isi problem ko solve karta hai — secrets (passwords, tokens, keys) ko code se alag rakhna, encrypted store karna, sirf zaroorat padne par inject karna, aur regularly badalte rehna. Chalo detail mein samjhte hain.

## Table of Contents
1. [Secret Storage](#secret-storage)
2. [Environment Variables](#environment-variables)
3. [CI/CD Platform Secrets](#cicd-platform-secrets)
4. [External Secret Management](#external-secret-management)
5. [Secret Rotation](#secret-rotation)
6. [Audit & Monitoring](#audit--monitoring)
7. [Best Practices](#best-practices)

---

## Secret Storage

### Kya hota hai "secret"?

Secret matlab koi bhi aisi cheez jo agar kisi galat insaan ke haath lag jaye to nuksaan ho — API keys, database passwords, AWS credentials, JWT signing keys, third-party tokens (Razorpay, Stripe, Twilio waghera). In sab ko code mein directly likhna sabse badi galti hai jo developers karte hain — especially jab deadline ka pressure ho aur "baad mein fix kar denge" wali mentality aa jaaye.

### DON'T: Hardcoded Secrets

```javascript
// ❌ NEVER DO THIS
const API_KEY = 'sk_live_abc123xyz789';
const DB_PASSWORD = 'super_secret_password';
const AWS_SECRET = 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY';
```

Yeh dekhne mein "kaam ho gaya" lagta hai, lekin yeh ek time-bomb hai. Yeh values seedhe source code mein baithi hain — matlab jo bhi repo clone karega, code review karega, ya CI logs dekhega, sabko yeh secret dikh jayega. Aur sabse bada khatra — agar yeh ek baar git history mein commit ho gaya, to sirf file delete karne se woh nahi jaayega. Git history mein woh hamesha ke liye reh jaata hai jab tak tum specifically history rewrite (jaise `git filter-repo` ya BFG Repo-Cleaner) na karo.

### DON'T: Secrets in Version Control

```bash
# ❌ Bad - secrets in .env file
git add .env
git commit -m "Add database config"
git push
# Secrets now in git history forever!
```

Yeh bilkul waisa hai jaise tumne apna ATM PIN ek diary mein likha, aur wo diary courier karke poori building mein circulate kar di. Ek baar push ho gaya, matlab GitHub ke servers pe, tumhare teammates ke local clones mein, forks mein — har jagah phel gaya. Isiliye `.env` file ko kabhi commit nahi karna chahiye.

> [!warning]
> Agar galti se secret commit ho gaya hai, to sirf naya commit karke file delete karna kaafi nahi hai. Git history mein wo purana commit abhi bhi maujood hai. Turant us secret ko **rotate** karo (naya generate karo, purana revoke karo) — history clean karna secondary step hai.

### DO: Environment Variables

```javascript
// ✅ Good - read from environment
const API_KEY = process.env.API_KEY;
const DB_PASSWORD = process.env.DATABASE_PASSWORD;
const AWS_SECRET = process.env.AWS_SECRET_ACCESS_KEY;

if (!API_KEY) {
  throw new Error('API_KEY environment variable is required');
}
```

Yahan trick simple hai — code sirf yeh jaanta hai ki "mujhe `API_KEY` naam ka environment variable chahiye," par uski actual value kahin bhi (server, CI system, secret manager) se aa sakti hai. Code khud secret ko store nahi karta. Zomato ke backend jaisa socho — restaurant ka payment gateway key alag-alag environment (dev, staging, prod) mein alag ho sakta hai, aur code same rehta hai — bas environment badalte hi sahi key uthti hai.

Fail-fast check bhi zaroori hai — agar `API_KEY` missing hai to app turant crash ho jaani chahiye startup pe, na ki silently kaam karke baad mein 3 AM ko production mein fail ho.

### DO: .gitignore Sensitive Files

```bash
# .gitignore
.env
.env.local
.env.*.local
secrets/
private-keys/
```

`.gitignore` ek safety net hai — matlab galti se bhi `git add .` karoge to yeh files git ke radar pe nahi aayengi. Lekin yaad rakho, yeh sirf ek net hai, foolproof security nahi — agar koi jaan-boojh kar `git add -f .env` kare to yeh bypass ho sakta hai. Isliye team mein discipline aur pre-commit hooks (jaise `gitleaks` ya `git-secrets`) bhi rakhna chahiye jo commit hone se pehle hi secrets detect kar lein.

---

## Environment Variables

### Kyun zaruri hai environment variables ka concept?

Ek hi codebase teen jagah chalti hai — tumhare laptop pe (local dev), staging server pe, aur production mein. Har jagah database alag hai, API keys alag hain. Agar tum code mein hardcode karoge to teenon jagah ke liye alag code likhna padega — jo maintenance ka nightmare ban jaayega. Environment variables isi problem ko solve karte hain: same code, different config per environment.

### Local Development

```bash
# .env.local (NOT committed)
DATABASE_URL=postgresql://user:password@localhost:5432/myapp
API_KEY=sk_test_abc123
AWS_REGION=us-east-1
```

```javascript
// Load environment variables
require('dotenv').config();

const dbUrl = process.env.DATABASE_URL;
const apiKey = process.env.API_KEY;
```

Local development mein hum `dotenv` package use karte hain jo `.env.local` file ko padh kar values ko `process.env` mein daal deta hai. Notice karo — yahan `sk_test_*` wali test key use ho rahi hai, production wali live key nahi. Yeh bhi ek best practice hai — apne local machine pe kabhi bhi live/production secrets mat rakho, sirf test/sandbox credentials use karo. Agar tumhara laptop chori ho jaaye ya malware aa jaaye, to blast radius chhota rahega.

### Docker Environment

```dockerfile
FROM node:18

WORKDIR /app
COPY . .
RUN npm install

EXPOSE 3000

# No secrets in Dockerfile!
# Pass via environment at runtime
CMD ["node", "index.js"]
```

Dockerfile mein secrets bilkul nahi hone chahiye — kyunki Docker image ki har layer cache ho jaati hai aur `docker history` command se koi bhi layer ka content dekh sakta hai, chahe tumne baad mein wo value delete bhi kar di ho. Isliye secrets ko build-time pe nahi, **runtime** pe environment variables ke through pass karo:

```bash
# Run with environment variables
docker run -d \
  -e DATABASE_URL="postgresql://user:pass@db:5432/app" \
  -e API_KEY="sk_live_xyz" \
  -e AWS_SECRET="wJalrXUtnFEMI/K7MDENG" \
  myapp
```

> [!warning]
> `docker inspect` ya `docker history` jaise commands se environment variables bhi kabhi kabhi expose ho sakte hain agar proper access control na ho. Production mein Docker secrets ya external secret manager use karna zyada safe hai.

### Docker Compose Secrets

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    image: myapp
    environment:
      - DATABASE_URL
      - API_KEY
      - AWS_SECRET_ACCESS_KEY
    env_file:
      - .env.production
    secrets:
      - db_password
      - api_key

secrets:
  db_password:
    external: true  # Managed by Docker/Swarm
  api_key:
    external: true
```

Docker Compose ka `secrets` block ek level upar ki security deta hai — secret file mein disk pe encrypted rehta hai aur container ke andar `/run/secrets/<name>` path par mount hota hai, environment variable ki tarah plaintext nahi ghoomta. Yeh Docker Swarm ke saath best kaam karta hai jahan secrets cluster-wide securely distribute hote hain.

---

## CI/CD Platform Secrets

### Kya hota hai CI/CD platform secrets?

Jab tumhara code GitHub Actions ya GitLab CI pe chal raha hota hai, usko bhi deploy karne ke liye secrets chahiye hote hain — jaise AWS credentials, deploy tokens. In platforms ne apna built-in **encrypted secret store** diya hai, jisme tum secret daal dete ho aur wo sirf pipeline ke andar, masked form mein, use hota hai.

### GitHub Actions Secrets

```yaml
name: Deploy

on: [push]

env:
  # Public environment variable
  ENVIRONMENT: production

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Use secrets
        run: |
          # Access GitHub secret
          echo "Deploying to $ENVIRONMENT"
          curl -H "Authorization: Bearer ${{ secrets.DEPLOY_TOKEN }}" \
            https://deploy.example.com/trigger

      - name: AWS deployment
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
```

`${{ secrets.DEPLOY_TOKEN }}` — yeh syntax GitHub ke encrypted secret store se value uthata hai. Important baat: GitHub Actions automatically in secrets ko logs mein **mask** kar deta hai — matlab agar galti se bhi tum `echo` karo secret ko, wo logs mein `***` dikhega, actual value nahi. Lekin yeh 100% foolproof nahi hai (agar tum secret ko manipulate karke print karo, jaise base64 encode karke, to masking bypass ho sakta hai) — isliye "never log secrets" wala rule follow karna zaruri hai, sirf masking pe bharosa mat karo.

**Creating secrets in GitHub:**

```bash
# Via CLI
gh secret set DATABASE_URL --body "postgresql://user:pass@db/app"
gh secret set API_KEY --body "sk_live_xyz"

# Via web interface
# Settings → Secrets and variables → Actions → New repository secret
```

### GitLab CI/CD Secrets

```yaml
stages:
  - deploy

deploy:
  stage: deploy
  script:
    # Access GitLab secret
    - curl -H "Authorization: Bearer $DEPLOY_TOKEN" \
      https://deploy.example.com/trigger
    # Deploy with AWS
    - aws s3 cp dist/ s3://my-bucket --recursive
  environment:
    name: production
```

GitLab mein secrets ko "CI/CD Variables" kehte hain, aur unhe environment variable ki tarah directly access kar sakte ho (`$DEPLOY_TOKEN`), GitHub jaisa special syntax nahi chahiye.

**Creating secrets in GitLab:**

```bash
# Via web interface
# Settings → CI/CD → Variables → Add variable

# Mark as protected (only used in protected branches)
# Mark as masked (hidden in logs)
```

GitLab mein do important flags hain — **Protected** (matlab yeh variable sirf protected branches jaise `main` pe hi available hoga, feature branches pe nahi — isse koi random developer apni branch se production secret leak nahi kar sakta) aur **Masked** (logs mein hide ho jaayega). Dono ko production secrets ke liye hamesha on rakho.

### Environment-Specific Secrets

```yaml
# GitHub Actions - environment secrets
environment: production
env:
  ENVIRONMENT: production

jobs:
  deploy:
    environment:
      name: production
      url: https://myapp.com
    steps:
      # Can access production-specific secret
      - run: |
          curl -H "Authorization: Bearer ${{ secrets.PROD_DEPLOY_TOKEN }}" \
            https://api.example.com/deploy
```

GitHub Environments feature ka use karke tum production-specific secrets bana sakte ho jo sirf tab access ho jab job specifically us environment ko target kare. Isme aur bhi guardrails laga sakte ho — jaise "required reviewers" (koi senior approve kare tabhi production deploy ho, IRCTC ke tatkal booking approval jaisa ek extra gate).

---

## External Secret Management

### Kyun chahiye external secret manager?

CI/CD platform ke built-in secrets chhote projects ke liye theek hain, lekin jaise-jaise system bada hota hai (multiple services, multiple environments, dynamic credentials chahiye), tumhe dedicated secret management tool chahiye — jo centralized storage, fine-grained access control, automatic rotation, aur audit trail de. Socho isko ek bank locker jaisa — sirf authorized log hi access kar sakte hain, aur har access ka record rakha jaata hai.

### HashiCorp Vault

```bash
# Login to Vault
vault login -method=jwt role=my-role

# Retrieve secret
vault kv get secret/myapp/database

# Output:
# Key                Value
# ---                -----
# password           MySecurePassword123
# username           myuser
```

Vault industry-standard secret manager hai — isme secrets encrypted rehte hain, access policies define kar sakte ho ("kaun kaunse secret ko dekh sakta hai"), aur dynamic secrets bhi generate kar sakte ho (jaise database credentials jo sirf kuch minute ke liye valid ho, phir automatically expire ho jaayein).

```yaml
# GitHub Actions with Vault
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: hashicorp/vault-action@v2
        with:
          url: ${{ secrets.VAULT_ADDR }}
          method: jwt
          role: github-actions
          path: jwt
          jwtSignatureAlgorithm: RS256
          jwtPrivateKeySecretName: private_key

      - name: Deploy
        env:
          DB_PASSWORD: ${{ env.database-password }}
        run: ./deploy.sh
```

Yahan interesting cheez hai — CI/CD pipeline khud kisi hardcoded Vault password se login nahi karta, balki **JWT-based auth** use karta hai (GitHub Actions apna OIDC token generate karta hai, jo Vault verify karta hai). Matlab ek secret ka use karke doosra secret unlock karna — chain of trust, bilkul jaise Aadhaar OTP verify karke bank account access milta hai.

### AWS Secrets Manager

```bash
# Store secret
aws secretsmanager create-secret \
  --name prod/database/password \
  --secret-string "MySecurePassword123"

# Retrieve secret
aws secretsmanager get-secret-value \
  --secret-id prod/database/password \
  --query SecretString \
  --output text
```

Agar tum already AWS ecosystem mein ho (EC2, ECS, Lambda use kar rahe ho), to AWS Secrets Manager natural choice hai. Yeh automatic rotation bhi support karta hai RDS databases ke liye — matlab AWS khud periodically password badal sakta hai bina tumhe manually kuch karne ki zarurat ke.

```yaml
# GitHub Actions with AWS Secrets Manager
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_KEY }}

      - name: Get database password
        run: |
          DB_PASS=$(aws secretsmanager get-secret-value \
            --secret-id prod/database/password \
            --query SecretString \
            --output text)
          echo "::add-mask::$DB_PASS"
          echo "DB_PASSWORD=$DB_PASS" >> $GITHUB_ENV

      - name: Deploy
        run: ./deploy.sh
```

Notice karo `echo "::add-mask::$DB_PASS"` line — yeh GitHub Actions ko explicitly bolta hai "is value ko future logs mein mask kar dena." Jab bhi tum kisi external source (Vault, Secrets Manager) se dynamically secret fetch kar rahe ho jo GitHub ko pehle se pata nahi tha (matlab wo repo secret nahi hai), to usko manually mask karna zaruri hai — warna wo plaintext logs mein aa sakta hai.

### Google Cloud Secret Manager

```bash
# Store secret
echo "MySecurePassword123" | gcloud secrets create prod-db-password --data-file=-

# Retrieve secret
gcloud secrets versions access latest --secret="prod-db-password"
```

GCP ka equivalent — agar tumhara infra Google Cloud pe hai to yahi use karoge. Concept same hai bas provider alag.

### 1Password for Teams

```bash
# One-time secrets
op run -- npm deploy

# Environment variable injection
op run --env-file=.env.1password -- ./deploy.sh
```

1Password ka `op run` command ek elegant trick karta hai — tumhare `.env` file mein actual secrets nahi hote, balki 1Password ke references hote hain (jaise `op://vault/item/field`). Runtime pe `op run` unko resolve karke actual process ko environment variables inject karta hai — file system pe kabhi plaintext secret save hi nahi hota.

---

## Secret Rotation

### Kyun zaruri hai rotation?

Socho tumhara ghar ki chaabi 5 saal se same hai aur tumne 10 log ko duplicate diye hain — kaam ke liye maid, plumber, courier delivery. Agar koi ek chaabi kho jaaye ya galat haath mein chali jaaye, tumhe pata bhi nahi chalega. Secrets ke saath bhi yahi hota hai — jitni der tak same secret use hota hai, utna zyada exposure ka risk badhta hai (ex-employee ke paas abhi bhi access ho sakta hai, purana leaked key kaam kar sakta hai). Rotation matlab periodically naya secret generate karna aur purana invalidate karna — jaise Swiggy/Zomato apna delivery partner ka temporary access code har order ke baad reset kar dete hain.

### Manual Rotation

```bash
#!/bin/bash
# rotate-secrets.sh

echo "Rotating API keys..."

# Generate new key
NEW_KEY=$(openssl rand -hex 32)

# Update in secret manager
aws secretsmanager update-secret \
  --secret-id prod/api-key \
  --secret-string "$NEW_KEY"

# Update in GitHub
gh secret set API_KEY --body "$NEW_KEY"

# Notify team
echo "Secrets rotated. Update applications within 24 hours."
```

Manual rotation script kaam karta hai lekin isme human dependency hai — koi bhool sakta hai ki rotate karna hai. Isliye chhote teams isse start karte hain lekin jaldi automate karna chahiye.

### Automatic Rotation

```yaml
# Scheduled secret rotation
name: Rotate Secrets

on:
  schedule:
    # Monthly rotation
    - cron: '0 0 1 * *'

jobs:
  rotate:
    runs-on: ubuntu-latest
    steps:
      - name: Generate new API key
        id: keygen
        run: |
          NEW_KEY=$(openssl rand -hex 32)
          echo "key=$NEW_KEY" >> $GITHUB_OUTPUT

      - name: Update secret
        run: |
          gh secret set API_KEY --body "${{ steps.keygen.outputs.key }}"

      - name: Notify deployment
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
            -d '{"text": "Secrets rotated. Redeploy required."}'
```

`cron: '0 0 1 * *'` — matlab har mahine ki 1 tareekh, raat 12 baje yeh workflow automatically chalega. Yeh CI/CD ka scheduled trigger hai (jaise IRCTC ka Tatkal booking system har din fixed time pe automatically open hota hai). Rotation ke baad Slack notification bhejna important hai taaki team ko pata chale — kyunki agar koi service abhi bhi purana secret use kar rahi hai to wo fail hone lagegi, redeploy zaruri hai.

> [!tip]
> Rotation karte waqt "grace period" rakho — matlab kuch der ke liye purana aur naya dono secret valid rakho, taaki jitni bhi services abhi purane secret ke saath chal rahi hain, unhe redeploy karne ka time mil jaaye. Warna sabkuch achanak break ho sakta hai.

---

## Audit & Monitoring

### Kya hota hai aur kyun zaruri hai?

Secret store kar diya, rotate bhi kar diya — lekin agar tumhe pata hi nahi ki secret kab, kisne, kahan se access kiya, to koi security incident hone par tum blind ho. Audit logging matlab har secret access ka record rakhna, aur leak detection matlab automatically scan karna ki kahin galti se koi secret code mein commit to nahi ho gaya. Yeh bilkul CCTV camera jaisa hai — chori na bhi ho, phir bhi record rehta hai ki kaun kab aaya gaya.

### Secret Access Logging

```yaml
# Log all secret access
name: Audit Secrets

on: [workflow_run]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - name: Check secret access
        run: |
          # Log any secret access
          echo "User: ${{ github.actor }}" >> audit.log
          echo "Action: ${{ github.event_name }}" >> audit.log
          echo "Time: $(date)" >> audit.log

      - name: Upload audit log
        run: |
          aws s3 cp audit.log \
            s3://audit-logs/github/${{ github.run_id }}.log
```

Yahan har workflow run ke saath yeh record ho raha hai ki kis user ne kaunsa action trigger kiya kis time. Yeh logs S3 mein store ho rahe hain — long-term retention ke liye, taaki 6 mahine baad bhi koi security review ho to trace ho sake ki kya hua tha.

### Secret Leak Detection

```yaml
detect-secrets:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v3
      with:
        fetch-depth: 0

    - name: Scan for secrets
      uses: gitleaks/gitleaks-action@v2

    - name: Check for common patterns
      run: |
        grep -r "password\|api_key\|secret" . \
          --exclude-dir=node_modules \
          --exclude-dir=.git && \
          echo "⚠️  Potential secrets found!" || \
          echo "✓ No obvious secrets found"
```

`gitleaks` jaisa tool poore git history ko scan karta hai (`fetch-depth: 0` isliye rakha hai, taaki poori history clone ho, sirf latest commit nahi) aur known secret patterns (AWS keys, private keys, tokens) ke liye check karta hai. Yeh CI pipeline mein har PR par chalna chahiye — agar koi galti se secret commit kare, to PR merge hone se pehle hi pakड़ा jaaye, production mein pahunchne se pehle. Basic `grep` bhi ek quick sanity check ke roop mein use ho sakta hai, lekin production-grade solution ke liye dedicated tools (gitleaks, trufflehog) hi use karna chahiye.

---

## Best Practices

### 1. Principle of Least Privilege

Kya matlab hai iska? Kisi bhi service ya person ko sirf utna hi access do jitna uska kaam karne ke liye zaruri hai — na kam, na zyada. Jaise ek delivery boy ko poore building ka master key nahi diya jaata, sirf jis flat mein delivery karni hai uska gate access diya jaata hai.

```yaml
# ✅ Good - minimal permissions
jobs:
  deploy:
    environment: production
    steps:
      - uses: aws-actions/configure-aws-credentials@v2
        with:
          role-to-assume: arn:aws:iam::ACCOUNT:role/GitHubDeploy
          role-session-name: GitHubActions-Deploy
          aws-region: us-east-1
          # This role has only EC2 update permissions
```

```iam
# IAM policy - minimal permissions
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:UpdateInstanceAttribute",
        "ec2:DescribeInstances"
      ],
      "Resource": "arn:aws:ec2:*:*:instance/prod-*"
    }
  ]
}
```

Is IAM policy mein dekho — sirf `ec2:UpdateInstanceAttribute` aur `ec2:DescribeInstances` permission hai, aur wo bhi sirf `prod-*` prefix wali instances pe. Agar yeh credentials leak bhi ho jaayein, hacker sirf EC2 instances ke attributes update kar sakta hai — na database delete kar sakta hai, na S3 bucket access kar sakta hai, na naya user bana sakta hai. Blast radius chhota rehta hai.

### 2. Separate Secrets by Environment

```bash
# Development secrets
gh secret set DEV_API_KEY --body "sk_test_dev"

# Staging secrets
gh secret set STAGING_API_KEY --body "sk_test_stage"

# Production secrets
gh secret set PROD_API_KEY --body "sk_live_prod"
```

Kabhi bhi ek hi secret ko dev, staging, aur production teeno mein reuse mat karo. Agar dev environment (jahan zyada log access karte hain, jyada debugging hoti hai) compromise ho jaaye aur wahi secret production mein bhi use ho raha ho, to poora production expose ho jaayega. Har environment ka apna alag secret hona chahiye — bilkul jaise tumhare ghar, office, aur locker ki chaabi alag-alag hoti hai.

### 3. Never Log Secrets

```yaml
steps:
  - name: Deploy
    run: |
      # ❌ Bad - prints secret
      echo "API_KEY=${{ secrets.API_KEY }}"

      # ✅ Good - secret redacted in logs
      curl -H "Authorization: Bearer ${{ secrets.API_KEY }}" \
        https://api.example.com/deploy

      # ✅ Good - explicit masking
      echo "::add-mask::${{ secrets.API_KEY }}"
```

Yeh sabse common mistake hai jo beginners karte hain — debugging ke waqt "let me just print this to check" karke secret ko `echo` kar dete hain, aur wo CI logs mein reh jaata hai (jo often team ke sabhi members ko visible hote hain, kabhi kabhi public bhi ho sakte hain agar repo public hai). Curl command mein directly secret use karna safe hai kyunki wo command output mein print nahi hota, sirf HTTP header mein jaata hai.

### 4. Use Short-Lived Tokens

```yaml
# Assume temporary AWS role
- uses: aws-actions/configure-aws-credentials@v2
  with:
    role-to-assume: arn:aws:iam::ACCOUNT:role/GitHubActions
    aws-region: us-east-1
    # Token expires in 1 hour (default)
    role-duration-seconds: 3600
```

Long-lived static credentials (jaise ek AWS access key jo saal-bhar valid rahe) bahut risky hote hain — agar leak ho jaayein to attacker ke paas kaafi der tak access rehta hai. Short-lived tokens (jaise yahan 1 ghante ka) is risk ko drastically kam karte hain — agar leak bhi ho jaaye, expire hone ke baad wo bekaar ho jaata hai. Yeh OYO ke temporary room access code jaisa hai — sirf tumhare stay ki duration tak valid, uske baad automatically invalid.

### 5. Audit Secret Access

```bash
# See who accessed secrets
gh api repos/owner/repo/actions/secrets \
  --jq '.secrets[] | {name, created_at, updated_at}'

# Output
# {
#   "name": "API_KEY",
#   "created_at": "2024-01-01T00:00:00Z",
#   "updated_at": "2024-01-15T10:30:00Z"
# }
```

Regularly check karo ki tumhare secrets kab bane the aur last kab update hue. Agar koi secret bahut purana hai (kabhi rotate nahi hua), wo red flag hai — usko turant rotate karne ki zaroorat hai.

### 6. Delete Exposed Secrets Immediately

```bash
# If secret leaked
gh secret delete API_KEY

# Create new secret
gh secret set API_KEY --body "new_secret_value"

# Rotate all dependent services
./rotate-api-key.sh
```

Agar koi secret leak ho jaaye — chahe accidentally commit ho gaya ho, ya kisi log mein print ho gaya ho — sabse pehla kaam hai use turant invalidate karna, phir naya generate karke replace karna. Jitni der tumhe lagegi decide karne mein "arre chalo dekhte hain kitna serious hai," utni der attacker ke paas window rehti hai. Speed yahan sabse important factor hai.

---

## Practical Example: Secure Deployment

Ab sab concepts ko ek real-world jaisa complete example mein jodte hain:

```yaml
name: Secure Deployment

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://myapp.com
    permissions:
      id-token: write
      contents: read

    steps:
      - uses: actions/checkout@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          role-to-assume: arn:aws:iam::ACCOUNT:role/GitHubDeploy
          aws-region: us-east-1
          role-duration-seconds: 900  # 15 minutes

      - name: Get database password
        id: db-secret
        run: |
          SECRET=$(aws secretsmanager get-secret-value \
            --secret-id prod/database/password \
            --query SecretString \
            --output text)
          echo "::add-mask::$SECRET"
          echo "password=$SECRET" >> $GITHUB_OUTPUT

      - name: Deploy application
        env:
          DATABASE_PASSWORD: ${{ steps.db-secret.outputs.password }}
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
        run: |
          ./scripts/deploy.sh

      - name: Log deployment
        run: |
          aws s3 cp - \
            s3://deployment-logs/$(date +%Y/%m/%d/%H:%M:%S).log \
            --content-type text/plain
```

Is workflow mein har best practice ek saath dikh rahi hai:
- `permissions: id-token: write` — OIDC-based auth, koi static AWS key store nahi ki gayi
- `role-duration-seconds: 900` — sirf 15 minute ka short-lived token
- `echo "::add-mask::$SECRET"` — dynamically fetched secret ko manually mask kiya
- `environment: production` — GitHub Environment protection lagi hai (chahe to reviewer approval bhi add kar sakte ho)
- Deployment ka log S3 mein store ho raha hai audit ke liye

Yeh production-grade secure deployment pipeline ka blueprint hai — koi bhi naya CI/CD pipeline banate waqt is checklist ko reference ki tarah use kar sakte ho.

---

> [!tip]
> Agar kabhi confuse ho ki "yeh secret CI/CD platform secret mein rakhun ya external vault mein," to simple rule hai — chhote projects, solo developer, ya sirf ek-do environment ke liye platform secrets kaafi hain. Jaise hi team badhti hai, multiple environments/services aate hain, ya dynamic/rotating credentials chahiye hote hain, external secret manager (Vault, AWS Secrets Manager) pe move karo.

## Key Takeaways

- Secrets ko **kabhi bhi hardcode** mat karo code ya config files mein — hamesha environment variables ya secret manager se inject karo
- **`.env` files ko `.gitignore`** mein daalo, aur agar galti se commit ho jaaye to sirf delete karna kaafi nahi — turant **rotate** karo
- CI/CD platforms (GitHub Actions, GitLab CI) **built-in encrypted secret storage** dete hain, chhote/medium projects ke liye kaafi hai
- Bade systems ke liye **external secret managers** (HashiCorp Vault, AWS Secrets Manager, GCP Secret Manager) use karo — centralized control, dynamic secrets, automatic rotation
- **Regularly rotate** secrets (monthly ek achhi baseline hai), aur rotation ke waqt grace period rakho taaki services break na ho
- **Kabhi bhi secrets ko log mein print mat karo** — explicit masking (`::add-mask::`) use karo jab dynamically fetch kar rahe ho
- **Short-lived tokens** aur **least privilege IAM roles** use karo — agar leak bhi ho jaaye to damage limited rahe
- **Audit trail aur leak detection** (gitleaks jaisa tool) CI pipeline mein integrate karo, taaki leaks merge hone se pehle hi pakde jaayein

Next: [Advanced Workflows](./07_advanced_workflows.md) - complex CI/CD patterns
