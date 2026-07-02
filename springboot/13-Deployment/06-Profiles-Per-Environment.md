# Profiles Per Environment

> [!info] For the Express/TS dev
> Spring profiles hai `NODE_ENV` ka steroid wala version. Tumne Node mein `NODE_ENV=production` set kiya aur `if (process.env.NODE_ENV === 'production')` type checks lagaye — yaad hai na? Spring Boot mein aisa manually kuch nahi karna padta. Bas `SPRING_PROFILES_ACTIVE=prod` set karo, aur `application-prod.yml` naam ki overlay file khud-ba-khud `application.yml` ke upar load ho jaati hai. Poori config, beans, sab kuch environment ke hisaab se switch ho jaata hai — bina if-else likhe.

## Kya hota hai profile-specific files ka game?

Socho tumhare paas Zomato jaisa ek order-management system hai. Tumhare laptop pe chalane ke liye alag settings chahiye (H2 in-memory DB, DEBUG logs), staging pe alag, aur production mein alag (real Postgres, secrets, kam logging). Spring Boot isko handle karta hai naming convention se:

```
src/main/resources/
  application.yml            ← hamesha load hoti hai (base)
  application-local.yml      ← jab local profile active ho
  application-dev.yml
  application-staging.yml
  application-prod.yml
```

Yeh bilkul `.env`, `.env.production`, `.env.staging` jaisa hi socho — bas Spring khud decide karta hai kaunsi file uthani hai, `dotenv` package manually import nahi karna padta.

Activation ka precedence (jo baad mein aata hai woh jeetta hai):
1. `application.yml` (base — sabke liye common)
2. `application-{profile}.yml` — jo bhi profile active hai uske liye
3. External config (mounted file, env vars, command line se — yeh sabse zyada powerful hai)

## Profile activate kaise karein?

```bash
# CLI se
java -jar app.jar --spring.profiles.active=prod

# Env var (containers mein sabse common tareeka)
SPRING_PROFILES_ACTIVE=prod

# Multiple profiles ek saath (comma-separated, left-to-right apply hote hain)
SPRING_PROFILES_ACTIVE=prod,us-east

# application.yml mein default fallback set karo
spring:
  profiles:
    default: local
```

> [!tip] Docker/Kubernetes wale dev ke liye
> `SPRING_PROFILES_ACTIVE` env var wala approach hi production mein sabse zyada use hota hai — Dockerfile ya K8s deployment yaml mein bas ek env var set kar do, code touch karne ki zaroorat nahi.

## Example layout — Zomato order service jaisa

`application.yml` (base — har jagah common rehta hai):

```yaml
spring:
  application:
    name: orders-api
  jackson:
    serialization:
      write-dates-as-timestamps: false
server:
  port: 8080
management:
  endpoints:
    web:
      exposure:
        include: health,info,prometheus
```

`application-local.yml` (tumhare laptop ke liye — fast aur disposable):

```yaml
spring:
  datasource:
    url: jdbc:h2:mem:orders
  jpa:
    show-sql: true
logging:
  level:
    com.example: DEBUG
```

`application-prod.yml` (asli traffic handle karne wala setup):

```yaml
spring:
  datasource:
    url: ${SPRING_DATASOURCE_URL}
    username: ${SPRING_DATASOURCE_USERNAME}
    password: ${SPRING_DATASOURCE_PASSWORD}
    hikari:
      maximum-pool-size: 20
  jpa:
    show-sql: false
logging:
  level:
    root: INFO
management:
  tracing:
    sampling:
      probability: 0.1
```

Dekho kaise `local` mein H2 in-memory DB hai (jo restart pe udd jaata hai, koi tension nahi), lekin `prod` mein real Postgres/MySQL connection hai jo env vars se aa raha hai — secrets kabhi bhi file mein hardcode nahi hote.

## Profile-specific beans — ek hi interface, alag implementation

Yeh part TypeScript wale dev ke liye thoda naya lagega. Spring mein tum poore **bean** (class instance) ko hi profile ke hisaab se switch kar sakte ho — jaise dependency injection container ko bologe "agar prod hai toh yeh wala object do, warna doosra."

```java
@Configuration
public class ClockConfig {
    @Bean
    @Profile("!test")
    Clock systemClock() { return Clock.systemUTC(); }

    @Bean
    @Profile("test")
    Clock fixedClock() { return Clock.fixed(Instant.parse("2024-01-01T00:00:00Z"), ZoneOffset.UTC); }
}
```

Yahan `!test` ka matlab hai "test profile ke alawa sab kuch." Test mein time ko freeze kar diya taaki tests flaky na ho (kal 2 baje test chala ya 2026 mein, result same rahega).

Payment service ka ek aur real-world example — jaise CRED ya Paytm integration ka dummy vs real version:

```java
@Service
@Profile({"dev", "local"})
public class StubPaymentService implements PaymentService { ... }

@Service
@Profile("prod")
public class StripePaymentService implements PaymentService { ... }
```

Local pe kaam karte waqt tum real Stripe/Razorpay ko hit nahi karna chahte (paise kat jaayenge galti se!), toh `dev`/`local` profile mein ek fake `StubPaymentService` chal jaata hai jo bas "success" return kar deta hai. Production mein asli `StripePaymentService` inject hota hai. Interface (`PaymentService`) same hai, implementation profile ke hisaab se badal jaati hai — poora `@Autowired PaymentService` wala code bina touch kiye kaam karta rahega.

> [!warning] Common mistake
> Agar tumne `@Profile` na lagakar dono services ko `@Service` bana diya, toh Spring boot startup pe hi crash ho jaayega — "multiple beans found, don't know which one to inject" wala error. Hamesha ek profile-set mutually exclusive rakho.

## Profile groups — ek naam mein kai profiles bundle karo

```yaml
spring:
  profiles:
    group:
      production: prod, us-east, monitoring
```

`production` activate karoge toh teenon (`prod`, `us-east`, `monitoring`) apne aap activate ho jaayenge. Isse `SPRING_PROFILES_ACTIVE=prod,us-east,monitoring` baar-baar type nahi karna padta — ek short naam kaafi hai.

## Conditional config — feature flags jaisa

```java
@ConditionalOnProperty(name = "feature.newCheckout", havingValue = "true")
@Bean
NewCheckoutEngine newCheckout() { ... }
```

Yeh bilkul LaunchDarkly ya kisi feature-flag service jaisa hai, bas Spring ka apna built-in version. Property `feature.newCheckout=true` set hone par hi yeh bean create hoga — warna woh naya checkout engine load hi nahi hoga.

## YAML multi-document — sab kuch ek hi file mein

Agar tumhe alag-alag files banana pasand nahi (kabhi-kabhi zyada files se confusion hota hai), toh ek hi `application.yml` mein `---` se sections divide kar sakte ho:

```yaml
spring:
  application:
    name: orders-api
---
spring:
  config:
    activate:
      on-profile: local
  datasource:
    url: jdbc:h2:mem:orders
---
spring:
  config:
    activate:
      on-profile: prod
  datasource:
    url: ${SPRING_DATASOURCE_URL}
```

Yeh Node.js ke ecosystem mein utna common nahi hai, lekin YAML support karta hai isliye Spring iska fayda uthata hai. Small projects ke liye handy hai; bade projects mein alag files (`application-{profile}.yml`) zyada maintainable rehti hain.

## Property override hierarchy — kaun kisko haraata hai (high → low priority)

1. Command-line args (`--server.port=9090`)
2. `SPRING_APPLICATION_JSON` env var
3. JNDI / system properties
4. OS env vars
5. Profile-specific external `application-{prof}.yml`
6. External `application.yml`
7. Profile-specific packaged `application-{prof}.yml`
8. Packaged `application.yml`
9. `@PropertySource`
10. Defaults

Isko yaad rakhne ka simple tareeka: **"command-line hamesha sabse bada boss hota hai, code ke andar likhi defaults sabse chhoti."** Bilkul waise hi jaise Node mein `process.env.PORT || 3000` mein `process.env.PORT` pehle check hota hai.

> [!tip] Env var naming convention
> `spring.datasource.url` ban jaata hai `SPRING_DATASOURCE_URL`. Rule simple hai: dots (`.`) → underscores (`_`), kebab-case → underscore se joda hua, aur sab CAPS mein. Toh `spring.jpa.show-sql` banega `SPRING_JPA_SHOW_SQL`.

## Har developer ka apna local profile

`application-local.yml` team ka common default hota hai, lekin agar Rita naam ki teammate ko apni khud ki custom settings chahiye (jaise apna khud ka local DB port), toh woh `application-local-rita.yml` (gitignored — commit mat karo isse!) bana sakti hai aur is tarah run kar sakti hai:

```bash
SPRING_PROFILES_ACTIVE=local,local-rita
```

Yeh bilkul `.env.local` jaisa concept hai jo Next.js/Node projects mein hota hai — personal overrides jo git mein kabhi push nahi hote.

## Profiles mein kya NAHI daalna chahiye

- **Secrets** — API keys, DB passwords, JWT signing keys. Inke liye [[04-Kubernetes-Basics|K8s Secrets]], Vault, ya cloud secret managers (AWS Secrets Manager, GCP Secret Manager) use karo. Profile file git mein commit hoti hai — usme secret daalna matlab GitHub pe apna Razorpay key public karna.
- **Environment se independent cheezein** — agar koi setting sab jagah same honi chahiye (jaise app ka naam ya Jackson serialization rules), usko base `application.yml` mein rakho, profile files mein duplicate mat karo.

> [!warning] Real incident jo hota hai
> Bahut saari teams galti se `application-prod.yml` mein hardcoded password commit kar dete hain "temporary fix" bolke, aur woh phir kabhi nahi hataya jaata. Git history mein hamesha ke liye reh jaata hai — even agar baad mein file se hata bhi do. Isliye shuru se hi env vars ya secret manager use karna best practice hai.

## Related
- [[02-Spring-Boot-Auto-Configuration]]
- [[04-Kubernetes-Basics]]
- [[07-Twelve-Factor-Spring]]
- [[01-Configuration-Properties]]

## Key Takeaways

- Spring profiles = `NODE_ENV` ka advanced version — config files, beans, aur properties sab environment ke hisaab se switch ho jaate hain.
- `application-{profile}.yml` naming convention follow karo; base `application.yml` hamesha load hoti hai, phir active profile ki file uske upar overlay hoti hai.
- `SPRING_PROFILES_ACTIVE` env var containers/K8s mein sabse common activation tareeka hai.
- `@Profile` annotation se poore beans (classes) switch kar sakte ho — jaise dev mein stub payment service, prod mein real Stripe/Razorpay integration.
- Profile groups (`spring.profiles.group`) se multiple profiles ek short naam ke peeche bundle kar sakte ho.
- Property override hierarchy yaad rakho: command-line > env vars > external config > packaged config > defaults.
- Secrets kabhi bhi profile files mein hardcode mat karo — Vault ya cloud secret manager use karo.
- Har developer apna personal local override file (`application-local-<naam>.yml`) bana sakta hai, gitignored rakhke.
