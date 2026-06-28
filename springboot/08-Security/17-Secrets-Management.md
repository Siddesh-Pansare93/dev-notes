---
tags: [security, production, secrets, vault, aws-secrets-manager, kubernetes, spring-cloud]
aliases: [Secrets Management, HashiCorp Vault Spring, AWS Secrets Manager Spring, Secret Rotation]
stage: advanced
---

# Secrets Management

> [!info] For the Express/TS dev
> You've used `dotenv` and `.env` files. That's fine for local dev. In production, `.env` files on servers are a disaster waiting to happen. This note covers the hierarchy from local dev to production-grade secrets stores — with concrete Spring Boot integration for each tier.

## Concept / mental model

### The anti-patterns (burned in production)

> [!danger]
> - **Secrets in `application.yml`**: `spring.datasource.password: mysecretpassword` checked into Git. Every developer, CI runner, and GitHub contributor now has your DB password. This happens to *everyone* once.
> - **Secrets in environment variables in Docker Compose files**: `environment: - DB_PASSWORD=secret` committed to the repo is the same as secrets in code.
> - **Secrets in code**: `String apiKey = "sk-abc123..."` — now it's in git history *forever*, even after deletion.
> - **Secrets in CI environment variables visible in logs**: `echo $DB_PASSWORD` in a script prints the secret in CI logs.

### The hierarchy

```
Developer laptop     → .env file, gitignored, per-developer
CI/CD pipeline       → CI system's secret store (GitHub Actions Secrets, etc.)
Staging              → HashiCorp Vault / Cloud provider secrets manager
Production           → HashiCorp Vault / AWS Secrets Manager / GCP Secret Manager / Azure Key Vault
Kubernetes           → External Secrets Operator or Sealed Secrets (not raw k8s Secrets)
```

> [!tip]
> Never put actual secrets in `application.yml`. Use placeholder syntax: `${DB_PASSWORD}`. The value comes from the environment — which is populated from a secrets manager at startup. `application.yml` lives in Git; the actual values don't.

---

## Code examples

### Local development — `.env` with `spring-dotenv`

```bash
# .env (ALWAYS in .gitignore)
DB_PASSWORD=localdevpassword
JWT_SECRET=local-dev-secret-32chars-minimum!!
STRIPE_API_KEY=sk_test_...
```

```xml
<!-- pom.xml -->
<dependency>
    <groupId>me.paulschwarz</groupId>
    <artifactId>spring-dotenv</artifactId>
    <version>4.0.0</version>
</dependency>
```

```yaml
# application-local.yml
spring:
  datasource:
    password: ${DB_PASSWORD}
```

> [!warning]
> Add `.env` to `.gitignore` and verify it's ignored *before* committing. Use `git check-ignore -v .env` to verify. A pre-commit hook (husky / gitleaks) prevents accidentally staging it.

### HashiCorp Vault — full Spring Cloud Vault setup

```xml
<!-- pom.xml -->
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-vault-config</artifactId>
</dependency>
```

```yaml
# bootstrap.yml (loaded before application.yml, needed for Vault)
spring:
  cloud:
    vault:
      host: vault.internal.example.com
      port: 8200
      scheme: https
      authentication: KUBERNETES      # or TOKEN, AWS_EC2, APPROLE
      kubernetes:
        role: my-spring-app
        kubernetes-path: kubernetes
      kv:
        enabled: true
        backend: secret
        default-context: my-app       # reads secret/my-app
        application-name: my-app
      database:
        enabled: true                  # dynamic DB credentials
        role: my-app-db-role
        backend: database
```

```java
// application.yml can now reference Vault-injected properties
// (Spring Cloud Vault populates them via PropertySource)
spring:
  datasource:
    url:      jdbc:postgresql://db:5432/myapp
    username: ${spring.datasource.username}  # injected by Vault dynamic credentials
    password: ${spring.datasource.password}
```

**Vault auth methods:**

| Auth method | When to use |
|---|---|
| `KUBERNETES` | Running in k8s — pod's service account token authenticates to Vault |
| `AWS_EC2` / `AWS_IAM` | Running on AWS EC2/ECS — instance identity authenticates |
| `APPROLE` | CI/CD pipelines, Docker outside k8s |
| `TOKEN` | Development only — a static Vault token |

**Dynamic DB credentials** — the most powerful Vault feature:

```bash
# Vault configuration (terraform or vault CLI)
vault secrets enable database

vault write database/config/my-postgres \
  plugin_name=postgresql-database-plugin \
  connection_url="postgresql://{{username}}:{{password}}@db:5432/myapp" \
  allowed_roles="my-app-db-role" \
  username="vault_root" \
  password="root_password"

vault write database/roles/my-app-db-role \
  db_name=my-postgres \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
  default_ttl="1h" \
  max_ttl="24h"
```

Each app instance gets a **unique, time-limited DB username/password** generated on startup. No shared passwords. No password rotation scripts. When the TTL expires, Vault rotates automatically.

### AWS Secrets Manager with Spring Cloud AWS

```xml
<dependency>
    <groupId>io.awspring.cloud</groupId>
    <artifactId>spring-cloud-aws-starter-secrets-manager</artifactId>
</dependency>
```

```yaml
spring:
  cloud:
    aws:
      region:
        static: us-east-1
      secretsmanager:
        reload:
          strategy: refresh       # triggers @RefreshScope beans on rotation
          period: 60000           # check every 60 seconds
```

```yaml
# Store secrets in AWS Secrets Manager at path /myapp/prod:
# {"db.password": "...", "jwt.secret": "...", "stripe.api-key": "sk_live_..."}

# application.yml
spring:
  datasource:
    password: ${db.password}   # Spring Cloud AWS injects from Secrets Manager

custom:
  jwt:
    secret: ${jwt.secret}
```

Use IAM roles for EC2/ECS/Lambda — no static credentials needed. The instance's IAM role must have `secretsmanager:GetSecretValue` permission on the specific secret ARN.

### GCP Secret Manager

```xml
<dependency>
    <groupId>com.google.cloud</groupId>
    <artifactId>spring-cloud-gcp-starter-secretmanager</artifactId>
</dependency>
```

```yaml
spring:
  datasource:
    password: ${sm://projects/MY_PROJECT/secrets/db-password/versions/latest}
```

### Azure Key Vault

```xml
<dependency>
    <groupId>com.azure.spring</groupId>
    <artifactId>spring-cloud-azure-starter-keyvault-secrets</artifactId>
</dependency>
```

```yaml
spring:
  cloud:
    azure:
      keyvault:
        secret:
          endpoint: https://my-vault.vault.azure.net/
          # Uses DefaultAzureCredential — managed identity in production
```

---

## Kubernetes Secrets — base64 ≠ encryption

> [!danger]
> Kubernetes Secrets are base64-encoded, not encrypted. Anyone who can `kubectl get secret my-secret -o yaml` gets the plaintext value. The base64 encoding is just serialization, not protection. Enable etcd encryption at rest AND control RBAC on who can read Secrets.

```yaml
# A raw k8s Secret is just base64:
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
type: Opaque
data:
  password: bXlzZWNyZXRwYXNzd29yZA==   # just base64("mysecretpassword")
```

### Option A: External Secrets Operator (recommended)

ESO syncs secrets from Vault/AWS Secrets Manager/etc. into k8s Secrets automatically:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-credentials
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: db-credentials    # creates a k8s Secret with this name
    creationPolicy: Owner
  data:
    - secretKey: password
      remoteRef:
        key: secret/my-app
        property: db.password
```

Your Spring Boot deployment then just mounts the k8s Secret as usual — no change to the app.

### Option B: Sealed Secrets (Bitnami)

Sealed Secrets encrypts the Secret with a cluster-specific key so the encrypted `SealedSecret` can be committed to Git safely:

```bash
# Install kubeseal CLI
kubectl create secret generic db-credentials \
  --dry-run=client \
  --from-literal=password=mysecretpassword \
  -o yaml | kubeseal > sealed-secret.yaml
# sealed-secret.yaml is safe to commit to Git
```

---

## Secret rotation without downtime

### `@RefreshScope` — soft rotation for simple secrets

```java
@Configuration
@RefreshScope   // re-reads properties when /actuator/refresh is called
public class JwtConfig {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Bean
    @RefreshScope
    public JwtParser jwtParser() {
        return Jwts.parser()
            .verifyWith(Keys.hmacShaKeyFor(jwtSecret.getBytes()))
            .build();
    }
}
```

```bash
# After rotating the secret in Vault/AWS Secrets Manager:
curl -X POST https://my-app/actuator/refresh
# Spring Cloud Context re-fetches properties and rebuilds @RefreshScope beans
```

> [!warning]
> `@RefreshScope` has subtle issues: it creates a new proxy for the bean, and any bean that has cached a reference to the old bean still holds the old value. Only works reliably when all callers go through Spring's bean proxy (not if you stored the bean in a static field or pre-initialized it).

### Blue-green rotation for static signing keys

For JWT signing keys (RSA/EC), you cannot just swap the key mid-flight:
1. Old tokens were signed with key A. If you rotate to key B, old tokens fail validation.
2. Solution: serve both keys from JWKS, accept both during overlap window, issue new tokens with key B.

See [[18-Cryptographic-Key-Management]] for the full key rotation playbook.

---

## Detecting leaked secrets

### Pre-commit: gitleaks

```bash
# Install gitleaks (homebrew, or binary release)
brew install gitleaks

# Run on your repo
gitleaks detect --source . --verbose

# As a pre-commit hook (via pre-commit framework)
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.2
    hooks:
      - id: gitleaks
```

### CI: trufflehog

```yaml
# GitHub Actions
- name: Scan for secrets
  uses: trufflesecurity/trufflehog@main
  with:
    path: ./
    base: ${{ github.event.repository.default_branch }}
    head: HEAD
    extra_args: --only-verified
```

### If a secret is leaked

1. **Rotate immediately** — before investigating.
2. Check audit logs for any access using the leaked credential.
3. Check Git history for how long the secret was exposed.
4. File an incident report (required for SOC 2, HIPAA, etc.).
5. Add detection for the credential pattern to gitleaks config.

---

## Express/TS comparison

```typescript
// Local: dotenv
import dotenv from 'dotenv';
dotenv.config();  // reads .env file into process.env

// Production: dotenv-vault (encrypted vault for .env files)
// or: AWS SSM Parameter Store + @aws-sdk/client-ssm
// or: HashiCorp Vault Node SDK

import Vault from 'node-vault';
const vault = Vault({ endpoint: 'https://vault.internal.example.com' });
const { data } = await vault.read('secret/my-app');
const dbPassword = data.db_password;

// Or AWS Secrets Manager:
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
const client = new SecretsManagerClient({ region: 'us-east-1' });
const { SecretString } = await client.send(
  new GetSecretValueCommand({ SecretId: '/myapp/prod' })
);
const secrets = JSON.parse(SecretString);
```

Spring Cloud Vault / Spring Cloud AWS Secrets Manager does all of this automatically at startup via `PropertySource` — your `application.yml` just references `${db.password}` and Spring fetches it from the configured backend. No manual SDK calls needed in your application code.

---

## Gotchas

> [!danger]
> **`spring.config.import` with Vault fails fast at startup if Vault is unreachable.** In production, Vault *must* be available when your app starts. Design your deployment so Vault is reachable before app pods start (init container pattern in k8s).

> [!warning]
> **Dynamic DB credentials with connection pools.** Vault-issued DB credentials have a TTL. If your HikariCP pool holds connections past the credential TTL, those connections will start failing. Set `spring.datasource.hikari.max-lifetime` shorter than the Vault credential TTL, and enable Vault lease renewal.

> [!warning]
> **`@RefreshScope` and Actuator security.** The `/actuator/refresh` endpoint is the mechanism for pushing secret rotations to running apps. Secure it behind admin auth — an attacker who can call `/actuator/refresh` can trigger re-initialization of your beans.

> [!danger]
> **Secrets in JVM heap dumps.** Heap dumps (`-XX:+HeapDumpOnOutOfMemoryError`) contain all in-memory data including secrets stored in Strings. Protect heap dump files, or use `char[]` (which can be zeroed) instead of `String` for the most sensitive values.

---

## Production checklist

- [ ] No secrets in `application.yml` committed to Git
- [ ] `gitleaks` pre-commit hook installed on all developer machines
- [ ] `trufflehog` scan in CI on every PR
- [ ] `.env` in `.gitignore`, verified with `git check-ignore -v`
- [ ] Production uses Vault/Secrets Manager (not env vars in compose files)
- [ ] k8s Secrets: External Secrets Operator or Sealed Secrets (not raw Secrets committed to repo)
- [ ] Dynamic DB credentials (Vault) with TTL shorter than connection pool `max-lifetime`
- [ ] `/actuator/refresh` secured behind admin role
- [ ] Secret rotation runbook documented and tested
- [ ] Leaked-secret incident response plan documented
- [ ] Heap dump files protected (S3 bucket policy, filesystem permissions)
- [ ] gitleaks config includes custom patterns for your internal token formats

---

## Related

- [[18-Cryptographic-Key-Management]]
- [[04-JWT-with-Spring-Security]]
- [[05-Application-Properties]]
- [[02-Configuration-and-SecurityFilterChain]]
- [[01-Spring-Boot-Actuator]]
- [[20-Production-Security-Checklist]]
