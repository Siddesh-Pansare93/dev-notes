# Secrets Management

> [!info] Express/TS wale dev ke liye
> Tumne `dotenv` aur `.env` files use ki hongi. Local dev ke liye woh bilkul theek hai. Lekin production mein `.env` files server pe rakhna ek disaster hai jo hone wala hai. Yeh note tumhe pura hierarchy dikhayega — local dev se lekar production-grade secrets stores tak — har tier ke liye concrete Spring Boot integration ke saath.

## Concept / mental model

### Anti-patterns (jo production mein jal chuke hain)

Kya hota hai jab secrets galat jagah rakhe jaate hain? Chalo dekhte hain woh mistakes jo har company kabhi na kabhi karti hai:

> [!danger]
> - **Secrets `application.yml` mein**: `spring.datasource.password: mysecretpassword` Git mein commit ho gaya. Ab har developer, CI runner, aur GitHub contributor ke paas tumhara DB password hai. Yeh *sabke* saath ek baar hota hai.
> - **Secrets Docker Compose files ke environment variables mein**: `environment: - DB_PASSWORD=secret` repo mein commit karna, code mein secret rakhne jaisa hi hai.
> - **Secrets code mein**: `String apiKey = "sk-abc123..."` — ab yeh git history mein *hamesha ke liye* hai, delete karne ke baad bhi.
> - **CI environment variables jo logs mein dikh jaate hain**: script mein `echo $DB_PASSWORD` likhna CI logs mein secret print kar deta hai.

Socho tum Zomato ke backend engineer ho aur galti se restaurant partner ka payment gateway secret key GitHub pe push ho gayi — within minutes koi bot scan karke usko dhundh lega. Isliye yeh mazaak wali baat nahi hai.

### Hierarchy — kaunsa environment, kaunsa secret store

```
Developer laptop     → .env file, gitignored, per-developer
CI/CD pipeline       → CI system's secret store (GitHub Actions Secrets, etc.)
Staging              → HashiCorp Vault / Cloud provider secrets manager
Production           → HashiCorp Vault / AWS Secrets Manager / GCP Secret Manager / Azure Key Vault
Kubernetes           → External Secrets Operator ya Sealed Secrets (raw k8s Secrets nahi)
```

Jaise UPI mein different layers of security hoti hain (device PIN, UPI PIN, bank OTP), waise hi secrets ke liye bhi layered approach hai — jitna zyada production ke close jaate ho, utna strong secret management chahiye.

> [!tip]
> Kabhi bhi actual secrets `application.yml` mein mat daalo. Placeholder syntax use karo: `${DB_PASSWORD}`. Value environment se aayegi — jo startup ke time secrets manager se populate hoti hai. `application.yml` Git mein rehta hai; actual values nahi.

---

## Code examples

### Local development — `.env` with `spring-dotenv`

Local pe kaam karte waqt sabse simple approach yehi hai — Express mein jo `dotenv` use karte the, Spring Boot mein uska equivalent hai `spring-dotenv`.

```bash
# .env (HAMESHA .gitignore mein)
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
> `.env` ko `.gitignore` mein add karo aur commit karne se *pehle* verify karo ki woh ignore ho raha hai. `git check-ignore -v .env` chalake check karo. Ek pre-commit hook (husky / gitleaks) accidentally staging hone se bacha sakta hai.

### HashiCorp Vault — full Spring Cloud Vault setup

Ab baat karte hain production-grade tool ki — HashiCorp Vault. Isse socho ek centralized "locker" ki tarah jahan saare secrets encrypted rehte hain, aur tumhari app startup ke time authenticate karke unhe fetch karti hai — bilkul CRED app ki tarah jahan tumhare card details ek secure vault mein encrypted rehte hain, app ko sirf token milta hai.

```xml
<!-- pom.xml -->
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-vault-config</artifactId>
</dependency>
```

```yaml
# bootstrap.yml (application.yml se pehle load hota hai, Vault ke liye zaruri)
spring:
  cloud:
    vault:
      host: vault.internal.example.com
      port: 8200
      scheme: https
      authentication: KUBERNETES      # ya TOKEN, AWS_EC2, APPROLE
      kubernetes:
        role: my-spring-app
        kubernetes-path: kubernetes
      kv:
        enabled: true
        backend: secret
        default-context: my-app       # secret/my-app read karta hai
        application-name: my-app
      database:
        enabled: true                  # dynamic DB credentials
        role: my-app-db-role
        backend: database
```

```java
// application.yml ab Vault-injected properties reference kar sakta hai
// (Spring Cloud Vault unhe PropertySource ke through populate karta hai)
spring:
  datasource:
    url:      jdbc:postgresql://db:5432/myapp
    username: ${spring.datasource.username}  # Vault dynamic credentials se inject hota hai
    password: ${spring.datasource.password}
```

**Vault auth methods:** — kaunsa method kab use karna hai, yeh depend karta hai ki tumhari app kahan chal rahi hai:

| Auth method | Kab use karo |
|---|---|
| `KUBERNETES` | k8s mein chal rahe ho — pod ka service account token Vault ko authenticate karta hai |
| `AWS_EC2` / `AWS_IAM` | AWS EC2/ECS pe chal rahe ho — instance identity authenticate karti hai |
| `APPROLE` | CI/CD pipelines, Docker k8s ke bahar |
| `TOKEN` | Sirf development ke liye — ek static Vault token |

**Dynamic DB credentials** — Vault ka sabse powerful feature. Yeh samajhna zaruri hai:

Imagine karo tumhare paas 10 microservices hain aur sabka same DB password hardcoded hai — agar ek leak ho gaya, sabko rotate karna padega. Vault isko solve karta hai har app instance ko **unique, time-limited** DB credentials deke. Jaise Ola driver ko trip ke liye ek temporary OTP milta hai jo trip khatam hote hi expire ho jaata hai — waise hi yahan bhi.

```bash
# Vault configuration (terraform ya vault CLI)
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

Har app instance ko startup pe ek **unique, time-limited** DB username/password milta hai. Koi shared passwords nahi. Koi manual password rotation script nahi chahiye. Jab TTL expire hota hai, Vault automatically rotate kar deta hai.

### AWS Secrets Manager with Spring Cloud AWS

Agar tumhara pura infra AWS pe hai, toh Vault set up karne ke bajaye seedha AWS Secrets Manager use kar sakte ho — yeh managed service hai, khud ka Vault cluster maintain nahi karna padta.

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
          strategy: refresh       # rotation pe @RefreshScope beans ko trigger karta hai
          period: 60000           # har 60 seconds check karta hai
```

```yaml
# AWS Secrets Manager mein /myapp/prod path pe secrets store karo:
# {"db.password": "...", "jwt.secret": "...", "stripe.api-key": "sk_live_..."}

# application.yml
spring:
  datasource:
    password: ${db.password}   # Spring Cloud AWS Secrets Manager se inject karta hai

custom:
  jwt:
    secret: ${jwt.secret}
```

IAM roles use karo EC2/ECS/Lambda ke liye — static credentials ki zarurat nahi. Instance ke IAM role ko specific secret ARN pe `secretsmanager:GetSecretValue` permission honi chahiye.

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
          # DefaultAzureCredential use karta hai — production mein managed identity
```

---

## Kubernetes Secrets — base64 ≠ encryption

Yeh sabse common misconception hai jo naye k8s users karte hain — "Secret" naam sunke lagta hai encrypted hoga. Aisa bilkul nahi hai!

> [!danger]
> Kubernetes Secrets base64-encoded hote hain, encrypted nahi. Jo bhi `kubectl get secret my-secret -o yaml` chala sakta hai, usse plaintext value mil jaati hai. base64 encoding sirf serialization hai, protection nahi. etcd encryption at rest enable karo AUR RBAC control karo ki kaun Secrets read kar sakta hai.

```yaml
# Ek raw k8s Secret sirf base64 hai:
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
type: Opaque
data:
  password: bXlzZWNyZXRwYXNzd29yZA==   # bas base64("mysecretpassword")
```

Isko decode karna itna easy hai jitna Base64 decoder website pe paste karna — literally koi encryption nahi hai. Toh production mein raw Secrets Git mein commit karna bilkul mat karo.

### Option A: External Secrets Operator (recommended)

ESO Vault/AWS Secrets Manager/etc. se secrets ko automatically k8s Secrets mein sync karta hai — matlab tumhara source of truth Vault rehta hai, k8s Secret sirf ek "cache" hai:

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
    name: db-credentials    # is naam se k8s Secret create hoga
    creationPolicy: Owner
  data:
    - secretKey: password
      remoteRef:
        key: secret/my-app
        property: db.password
```

Tumhari Spring Boot deployment fir usual tarike se k8s Secret ko mount karti hai — app mein koi change nahi chahiye.

### Option B: Sealed Secrets (Bitnami)

Sealed Secrets, Secret ko cluster-specific key se encrypt kar deta hai taaki encrypted `SealedSecret` ko safely Git mein commit kiya ja sake:

```bash
# kubeseal CLI install karo
kubectl create secret generic db-credentials \
  --dry-run=client \
  --from-literal=password=mysecretpassword \
  -o yaml | kubeseal > sealed-secret.yaml
# sealed-secret.yaml Git mein commit karna safe hai
```

---

## Secret rotation without downtime

Kya hota hai jab secret rotate karna ho lekin app ko restart nahi kar sakte? Production mein downtime lena luxury nahi hai — IRCTC ka tatkal booking window chal raha ho aur tumhe deploy karna pade, toh zero-downtime rotation zaruri hai.

### `@RefreshScope` — simple secrets ke liye soft rotation

```java
@Configuration
@RefreshScope   // /actuator/refresh call hone pe properties re-read karta hai
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
# Vault/AWS Secrets Manager mein secret rotate karne ke baad:
curl -X POST https://my-app/actuator/refresh
# Spring Cloud Context properties re-fetch karke @RefreshScope beans rebuild karta hai
```

> [!warning]
> `@RefreshScope` ke kuch subtle issues hain: yeh bean ke liye ek naya proxy banata hai, aur jo bhi bean ne purane bean ka reference cache kar rakha hai woh abhi bhi old value hold karega. Reliably tabhi kaam karta hai jab saare callers Spring ke bean proxy se guzarte hon (agar tumne bean ko static field mein store kiya ya pre-initialize kiya, toh nahi chalega).

### Static signing keys ke liye blue-green rotation

JWT signing keys (RSA/EC) ke liye tum key ko mid-flight swap nahi kar sakte:
1. Purane tokens key A se sign hue the. Agar key B pe rotate karoge, purane tokens validation fail karenge.
2. Solution: JWKS se dono keys serve karo, overlap window ke dauran dono accept karo, naye tokens key B se issue karo.

Poora key rotation playbook dekhne ke liye [[18-Cryptographic-Key-Management]] dekho.

---

## Leaked secrets detect karna

Agar secret leak ho jaaye, toh usse jaldi pakadna damage control mein sabse zaruri step hai.

### Pre-commit: gitleaks

```bash
# gitleaks install karo (homebrew, ya binary release)
brew install gitleaks

# apne repo pe run karo
gitleaks detect --source . --verbose

# pre-commit hook ke taur pe (pre-commit framework ke through)
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

### Agar secret leak ho jaaye toh kya karna hai

1. **Turant rotate karo** — investigate karne se pehle.
2. Audit logs check karo ki leaked credential se koi access hua ya nahi.
3. Git history check karo — secret kitne time se expose tha.
4. Incident report file karo (SOC 2, HIPAA jaise compliance ke liye zaruri).
5. gitleaks config mein us credential pattern ke liye detection add karo.

---

## Express/TS comparison

Agar tum Express background se aa rahe ho, toh yeh mental mapping kaam aayegi:

```typescript
// Local: dotenv
import dotenv from 'dotenv';
dotenv.config();  // .env file ko process.env mein padhta hai

// Production: dotenv-vault (.env files ke liye encrypted vault)
// ya: AWS SSM Parameter Store + @aws-sdk/client-ssm
// ya: HashiCorp Vault Node SDK

import Vault from 'node-vault';
const vault = Vault({ endpoint: 'https://vault.internal.example.com' });
const { data } = await vault.read('secret/my-app');
const dbPassword = data.db_password;

// Ya AWS Secrets Manager:
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
const client = new SecretsManagerClient({ region: 'us-east-1' });
const { SecretString } = await client.send(
  new GetSecretValueCommand({ SecretId: '/myapp/prod' })
);
const secrets = JSON.parse(SecretString);
```

Express mein tumhe yeh saara SDK code khud likhna padta hai. Spring Cloud Vault / Spring Cloud AWS Secrets Manager yeh sab automatically startup ke time `PropertySource` ke through kar deta hai — tumhara `application.yml` bas `${db.password}` reference karta hai aur Spring configured backend se fetch kar leta hai. Application code mein koi manual SDK call nahi chahiye.

---

## Gotchas

Yeh woh cheezein hain jo documentation mein kam likhi milti hain lekin production mein bahut bite karti hain.

> [!danger]
> **`spring.config.import` with Vault startup pe fail-fast hota hai agar Vault unreachable ho.** Production mein Vault *hamesha* available hona chahiye jab tumhari app start ho. Apni deployment aisi design karo ki app pods start hone se pehle Vault reachable ho (k8s mein init container pattern).

> [!warning]
> **Dynamic DB credentials with connection pools.** Vault-issued DB credentials ka TTL hota hai. Agar tumhara HikariCP pool connections ko TTL ke baad bhi hold karta hai, toh woh connections fail hone lagenge. `spring.datasource.hikari.max-lifetime` ko Vault credential TTL se chota set karo, aur Vault lease renewal enable karo.

> [!warning]
> **`@RefreshScope` aur Actuator security.** `/actuator/refresh` endpoint hi mechanism hai secret rotations ko running apps tak pahunchane ka. Isse admin auth ke peeche secure karo — jo attacker `/actuator/refresh` call kar sakta hai woh tumhare beans ko re-initialize trigger kar sakta hai.

> [!danger]
> **Secrets JVM heap dumps mein.** Heap dumps (`-XX:+HeapDumpOnOutOfMemoryError`) mein saara in-memory data hota hai, secrets bhi jo Strings mein stored hain. Heap dump files protect karo, ya sabse sensitive values ke liye `String` ki jagah `char[]` use karo (jise zero kiya ja sakta hai).

---

## Production checklist

- [ ] `application.yml` mein koi secrets Git mein commit nahi hue
- [ ] Saari developer machines pe `gitleaks` pre-commit hook installed hai
- [ ] Har PR pe CI mein `trufflehog` scan chal raha hai
- [ ] `.env` `.gitignore` mein hai, `git check-ignore -v` se verify kiya
- [ ] Production Vault/Secrets Manager use karta hai (compose files mein env vars nahi)
- [ ] k8s Secrets: External Secrets Operator ya Sealed Secrets (raw Secrets repo mein commit nahi)
- [ ] Dynamic DB credentials (Vault) ka TTL connection pool ke `max-lifetime` se chota hai
- [ ] `/actuator/refresh` admin role ke peeche secured hai
- [ ] Secret rotation runbook documented aur tested hai
- [ ] Leaked-secret incident response plan documented hai
- [ ] Heap dump files protected hain (S3 bucket policy, filesystem permissions)
- [ ] gitleaks config mein tumhare internal token formats ke custom patterns hain

---

## Related

- [[18-Cryptographic-Key-Management]]
- [[04-JWT-with-Spring-Security]]
- [[05-Application-Properties]]
- [[02-Configuration-and-SecurityFilterChain]]
- [[01-Spring-Boot-Actuator]]
- [[20-Production-Security-Checklist]]

## Key Takeaways

- `application.yml` mein kabhi bhi actual secret values mat likho — sirf `${PLACEHOLDER}` syntax use karo.
- Environment ke hisaab se secret store badalta hai: local `.env` → CI secrets → staging/production mein Vault ya cloud secrets manager → k8s mein External Secrets Operator/Sealed Secrets.
- HashiCorp Vault ka dynamic DB credentials feature sabse powerful hai — har instance ko unique, time-limited credentials milte hain, koi shared password nahi.
- Kubernetes Secrets base64-encoded hote hain, encrypted nahi — raw k8s Secrets pe bharosa mat karo, ESO ya Sealed Secrets use karo.
- `@RefreshScope` zero-downtime secret rotation ke liye kaam aata hai, lekin static field ya pre-initialized beans ke saath reliably kaam nahi karta.
- JWT signing keys rotate karte waqt overlap window rakho — dono old aur new key JWKS mein accept karo taaki purane tokens fail na hon.
- gitleaks (pre-commit) aur trufflehog (CI) dono use karo taaki secrets commit hone se pehle aur commit hone ke baad dono jagah pakde jaayein.
- Secret leak hone pe sabse pehla step rotate karna hai — investigation baad mein.
- Spring Cloud Vault/AWS/GCP/Azure integrations startup pe automatically secrets fetch kar dete hain via `PropertySource` — Express ki tarah manual SDK calls likhne ki zarurat nahi.
