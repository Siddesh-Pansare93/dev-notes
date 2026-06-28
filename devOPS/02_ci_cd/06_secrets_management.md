# Secrets Management in CI/CD

> Securely handle credentials, API keys, and sensitive data in your CI/CD pipelines without exposing them.

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

### DON'T: Hardcoded Secrets

```javascript
// ❌ NEVER DO THIS
const API_KEY = 'sk_live_abc123xyz789';
const DB_PASSWORD = 'super_secret_password';
const AWS_SECRET = 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY';
```

### DON'T: Secrets in Version Control

```bash
# ❌ Bad - secrets in .env file
git add .env
git commit -m "Add database config"
git push
# Secrets now in git history forever!
```

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

### DO: .gitignore Sensitive Files

```bash
# .gitignore
.env
.env.local
.env.*.local
secrets/
private-keys/
```

---

## Environment Variables

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

```bash
# Run with environment variables
docker run -d \
  -e DATABASE_URL="postgresql://user:pass@db:5432/app" \
  -e API_KEY="sk_live_xyz" \
  -e AWS_SECRET="wJalrXUtnFEMI/K7MDENG" \
  myapp
```

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

---

## CI/CD Platform Secrets

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

**Creating secrets in GitLab:**

```bash
# Via web interface
# Settings → CI/CD → Variables → Add variable

# Mark as protected (only used in protected branches)
# Mark as masked (hidden in logs)
```

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

---

## External Secret Management

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

### Google Cloud Secret Manager

```bash
# Store secret
echo "MySecurePassword123" | gcloud secrets create prod-db-password --data-file=-

# Retrieve secret
gcloud secrets versions access latest --secret="prod-db-password"
```

### 1Password for Teams

```bash
# One-time secrets
op run -- npm deploy

# Environment variable injection
op run --env-file=.env.1password -- ./deploy.sh
```

---

## Secret Rotation

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

---

## Audit & Monitoring

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

---

## Best Practices

### 1. Principle of Least Privilege

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

### 2. Separate Secrets by Environment

```bash
# Development secrets
gh secret set DEV_API_KEY --body "sk_test_dev"

# Staging secrets
gh secret set STAGING_API_KEY --body "sk_test_stage"

# Production secrets
gh secret set PROD_API_KEY --body "sk_live_prod"
```

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

### 6. Delete Exposed Secrets Immediately

```bash
# If secret leaked
gh secret delete API_KEY

# Create new secret
gh secret set API_KEY --body "new_secret_value"

# Rotate all dependent services
./rotate-api-key.sh
```

---

## Practical Example: Secure Deployment

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

---

## Summary

- **Never hardcode** secrets in code or configuration
- **Use environment variables** for configuration injection
- **CI/CD platforms** provide secret storage (GitHub, GitLab)
- **External secret management** (Vault, Secrets Manager) for scalability
- **Rotate secrets** regularly (monthly recommended)
- **Audit access** and detect leaks early
- **Short-lived tokens** reduce blast radius of exposure

Next: [Advanced Workflows](./07_advanced_workflows.md) - complex CI/CD patterns
