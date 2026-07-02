# Application Properties

Socho ek second — tum Zomato ka backend bana rahe ho. Ek environment mein database `localhost` pe hai, dusre mein AWS RDS pe. Ek mein port `8080` hai, production mein `80`. Feature flags alag hain, API keys alag hain, logging level alag hai.

Node.js mein yeh sab `.env` files se handle karte the — `dotenv` package, `process.env.DATABASE_URL`, aur har jagah `|| 'default_value'` likhna padta tha. Agar koi naya developer aata tha toh `.env.example` copy karo, values bharo, phir socho ki kya miss hua.

Spring Boot mein yeh sab ek jagah handle hota hai — **`application.yml`** (ya `application.properties`). Yeh sirf `.env` nahi hai — yeh typed config hai, profile-aware hai, validation support karta hai, aur poore codebase mein ek POJO se inject hota hai. Express ke `config/index.ts` aur `.env` dono ka combination hai, aur usse kaafi better.

> [!info] Node.js se aa rahe ho? Yeh padho pehle
> `application.yml` Spring Boot ka `.env` + `config/index.ts` rolled into one hai. `dotenv` ke opposite, yeh **typed** values support karta hai, **profiles** (dev/prod/staging), **nesting**, **env-var overrides**, aur strongly-typed POJOs mein binding. `process.env.X || '...'` defaults poore codebase mein scatter karna band ho jaata hai.

---

## File Locations aur Precedence — Kaun Sa Config Jeetega?

Spring Boot ek smart order mein config files dhundhta hai. Jaise Swiggy apne orders ko priority mein handle karta hai — pehle premium orders, phir normal — Spring Boot bhi config sources ko priority se override karta hai.

Spring Boot yeh order mein dhundhta hai (neeche waala upar waale ko override karta hai):

1. `src/main/resources/application.properties` (ya `.yml`) — bundled default config
2. `src/main/resources/application-{profile}.yml` — profile-specific overrides
3. `./config/application.yml` — JAR ke saath-saath config folder
4. `./application.yml` — JAR ke barabar rakha file (ops team ke liye)
5. Environment variables — deployment environment se
6. Command-line args (`--server.port=9090`) — sab se highest priority

**Rule yaad rakho:** Baad waala source pehle waale ko override karta hai. Toh env vars bundled YAML ko override karenge, aur CLI args sab kuch override karenge.

Yeh kyun useful hai? Socho Flipkart ka deployment pipeline — same JAR file dev pe bhi jaata hai, staging pe bhi, production pe bhi. Sirf environment variables alag hote hain. JAR mein default config hoti hai (dev ke liye), aur production mein env vars se sab override ho jaata hai. Ek hi artifact, alag-alag environments.

---

## YAML vs Properties — Kaunsa Use Karein?

Dono equivalent hain, lekin YAML zyada readable hai nested config ke liye. Dekho:

```yaml
# application.yml — preferred, zyada readable hai
server:
  port: 8080
  compression:
    enabled: true

spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/zomato_db
    username: app_user
    password: secret123
```

```properties
# application.properties — equivalent, lekin flat structure
server.port=8080
server.compression.enabled=true
spring.datasource.url=jdbc:postgresql://localhost:5432/zomato_db
spring.datasource.username=app_user
spring.datasource.password=secret123
```

> [!tip] Ek choose karo, us par tikay raho
> Spring Boot dono support karta hai, lekin ek project mein dono mix karna maintenance nightmare hai. YAML choose karo — nesting readable hoti hai aur complex config mein aankh nahi thakti. Agar team mein kisi ko YAML syntax na aata ho toh ek baar seekhna padega — worth it hai.

---

## Profiles — Dev, Staging, Production Alag-Alag Config

Yeh Spring Boot ka sabse powerful feature hai aur Node.js mein directly equivalent nahi milta.

Socho Paytm ka flow — local development mein mock payment gateway use karo, staging mein sandbox gateway, production mein real gateway. Config alag hogi, lekin code same rahega.

```
src/main/resources/
├── application.yml           # base config — hamesha load hoti hai
├── application-dev.yml       # sirf jab profile=dev ho tab load hoti hai
├── application-staging.yml   # sirf jab profile=staging ho
└── application-prod.yml      # sirf jab profile=prod ho
```

Base config mein default profile set karo local development ke liye:

```yaml
# application.yml — base config
spring:
  application:
    name: order-service
  profiles:
    active: dev   # local development mein dev profile default hai

server:
  port: 8080

app:
  payment-gateway: mock  # dev mein mock use karo
  max-orders-per-minute: 10
```

```yaml
# application-dev.yml — sirf dev mein
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/orders_dev
    username: dev_user
    password: dev_password

logging:
  level:
    com.yourapp: DEBUG  # dev mein verbose logging
```

```yaml
# application-prod.yml — production mein
spring:
  datasource:
    url: ${DATABASE_URL}  # env var se aayega
    username: ${DB_USER}
    password: ${DB_PASSWORD}

server:
  port: 80
  compression:
    enabled: true

app:
  payment-gateway: razorpay  # real gateway
  max-orders-per-minute: 1000

logging:
  level:
    com.yourapp: INFO  # prod mein sirf INFO aur upar
```

Profile activate karna runtime pe:

```bash
# Environment variable se (Kubernetes/Docker mein yahi use hota hai)
SPRING_PROFILES_ACTIVE=prod java -jar app.jar

# Command-line arg se
java -jar app.jar --spring.profiles.active=prod

# Multiple profiles (dono load honge, baad waala override karega)
java -jar app.jar --spring.profiles.active=prod,feature-x
```

---

## Multi-Document YAML — Ek File Mein Sab

Agar bahut saari profile files manage nahi karna toh ek hi `application.yml` mein `---` separator se alag-alag profile sections likho:

```yaml
# application.yml — sab ek file mein
spring:
  application:
    name: rider-service
server:
  port: 8080

---
# Yeh section sirf prod profile mein activate hoga
spring:
  config:
    activate:
      on-profile: prod
server:
  port: 80
  compression:
    enabled: true
spring:
  datasource:
    url: ${DATABASE_URL}

---
# Yeh section sirf dev profile mein activate hoga
spring:
  config:
    activate:
      on-profile: dev
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/rider_dev
    username: dev_user
    password: devpass
```

Chhote projects ke liye yeh convenient hai. Bade projects mein alag files better hain — navigation easy hoti hai.

---

## Environment Variable Binding — No More `process.env` Chaos

Node.js mein yeh karna padta tha:

```typescript
// Node.js way — boring aur error-prone
const dbUrl = process.env.DATABASE_URL || 'postgresql://localhost/dev';
const maxRetries = parseInt(process.env.MAX_RETRIES || '3', 10);
const featureEnabled = process.env.FEATURE_X === 'true';
```

Spring Boot mein har property automatically env var se bind ho jaati hai. Rule simple hai: dots aur hyphens ko underscores se replace karo, uppercase karo — ho gaya.

> [!example] dotenv vs Spring Boot mapping
> | YAML Property | Env Var |
> |---|---|
> | `server.port` | `SERVER_PORT` |
> | `spring.datasource.url` | `SPRING_DATASOURCE_URL` |
> | `app.feature-flags.beta` | `APP_FEATUREFLAGS_BETA` ya `APP_FEATURE_FLAGS_BETA` |
> | `app.payment.razorpay-key` | `APP_PAYMENT_RAZORPAY_KEY` |

Yeh 12-factor app configuration ka Spring Boot implementation hai. **Secrets kabhi bhi YAML mein mat likho** — sirf placeholder rakho, value env var se aayegi:

```yaml
# application.yml — safe way
spring:
  datasource:
    url: jdbc:postgresql://${DB_HOST:localhost}:${DB_PORT:5432}/${DB_NAME:myapp}
    username: ${DB_USER:root}
    password: ${DB_PASSWORD}  # no default — required hai, nahi mila toh app crash karega

app:
  razorpay:
    key-id: ${RAZORPAY_KEY_ID}
    key-secret: ${RAZORPAY_KEY_SECRET}
  jwt-secret: ${JWT_SECRET}
```

`${VARIABLE_NAME:default_value}` syntax hai — colon ke baad default value. Agar env var set hai toh woh use hogi, nahi toh default.

---

## Properties Padhne Ke Teen Tarike

### Tarika 1: `@Value` — Simple, Ek-Off Values Ke Liye

```java
@Service
public class NotificationService {

    // Basic injection
    @Value("${app.name}")
    private String appName;

    // Default value ke saath (colon ke baad)
    @Value("${app.sms.provider:twilio}")
    private String smsProvider;

    // Integer bhi automatically convert hoga
    @Value("${app.max-retries:3}")
    private int maxRetries;

    // Boolean bhi
    @Value("${app.feature.new-ui:false}")
    private boolean newUiEnabled;

    // List bhi (comma-separated values)
    @Value("${app.allowed-origins:http://localhost:3000}")
    private String[] allowedOrigins;
}
```

`@Value` simple cases ke liye theek hai — ek-do properties inject karne hain class mein. Lekin agar bahut saari related properties hain toh yeh messy ho jaata hai.

### Tarika 2: `Environment` — Programmatic Access

```java
@Service
public class ConfigService {

    private final Environment env;

    // Constructor injection (recommended)
    public ConfigService(Environment env) {
        this.env = env;
    }

    public void checkConfig() {
        // Property padhna
        String dbUrl = env.getProperty("spring.datasource.url");

        // Default ke saath
        int timeout = env.getProperty("app.timeout", Integer.class, 30);

        // Profile check
        boolean isProd = env.acceptsProfiles(Profiles.of("prod"));

        if (isProd) {
            // production-specific logic
        }
    }
}
```

Yeh tab use karo jab runtime pe dynamically property padhni ho. Generally `@ConfigurationProperties` better option hai.

### Tarika 3: `@ConfigurationProperties` — Recommended, Best Practice

Yeh Spring Boot configuration ka asli hero hai. Ek poori YAML chunk ko ek strongly-typed Java record/class mein map karo.

Node.js mein tum kuch aisa karte hoge:

```typescript
// config/index.ts — Node.js way
export const config = {
  baseUrl: process.env.API_BASE_URL || '',
  retry: {
    maxAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS || '3'),
    backoffMs: parseInt(process.env.RETRY_BACKOFF_MS || '200'),
  },
  admins: (process.env.ADMIN_EMAILS || '').split(','),
};
```

Spring Boot mein yeh kaafi cleaner hai:

```yaml
# application.yml mein config define karo
app:
  base-url: https://api.zomato-internal.com
  retry:
    max-attempts: 3
    backoff-ms: 200
  admins:
    - ops@zomato.com
    - backend@zomato.com
  features:
    new-checkout: false
    beta-menu: true
```

```java
// Strongly-typed POJO/Record — Java 17+ record syntax
@ConfigurationProperties("app")  // "app" prefix se bind hoga
public record AppProperties(
    String baseUrl,           // app.base-url -> baseUrl (relaxed binding)
    Retry retry,              // nested object
    List<String> admins,      // list automatically parse hoti hai
    Features features         // another nested object
) {
    // Nested record for retry config
    public record Retry(int maxAttempts, int backoffMs) {}

    // Nested record for feature flags
    public record Features(boolean newCheckout, boolean betaMenu) {}
}
```

Ek jagah enable karo (Main class mein, ek baar):

```java
@SpringBootApplication
@ConfigurationPropertiesScan  // yeh sab @ConfigurationProperties classes dhundhega
public class ZomatoApp {
    public static void main(String[] args) {
        SpringApplication.run(ZomatoApp.class, args);
    }
}
```

Ab kisi bhi class mein inject karo — normal bean ki tarah:

```java
@Service
public class OrderService {

    private final AppProperties props;

    // Constructor injection — Spring automatically inject karega
    public OrderService(AppProperties props) {
        this.props = props;
    }

    public void processOrder(Order order) {
        // Directly type-safe access — no casting, no null checks
        String apiUrl = props.baseUrl() + "/orders";
        int maxTries = props.retry().maxAttempts();
        boolean betaUser = props.features().betaMenu();

        System.out.println("Contacting: " + apiUrl);
        System.out.println("Will retry up to " + maxTries + " times");
    }
}
```

> [!tip] Kyun `@ConfigurationProperties` best hai
> - **Type-safe** — agar `max-attempts` mein string doge toh app startup pe hi fail ho jaayega, runtime pe nahi
> - **IDE autocomplete** — `spring-boot-configuration-processor` dependency add karo aur YAML likhte waqt IntelliJ suggest karega
> - **Validation** — `@Validated` ke saath constraints enforce hoti hain startup pe
> - **Testable** — unit tests mein fake `AppProperties` pass karo, Spring context ki zaroorat nahi
> - **Refactor-friendly** — property rename? Java mein rename karo, IDE sab update karega

---

## Validation — Galat Config Se App Start Hi Mat Hone Do

Yeh feature bahut powerful hai. Socho Swiggy ka rider allocation system — agar `max-riders-per-zone` config mein negative number aa gaya toh poora system behave karega weirdly. Better hai ki startup pe hi fail karo.

```java
@ConfigurationProperties("app")
@Validated  // yeh annotation validation enable karta hai
public record AppProperties(

    @NotBlank(message = "Base URL required hai, bina iske kaam nahi chalega")
    String baseUrl,

    @NotNull
    @Valid  // nested object ko bhi validate karo
    Retry retry,

    @NotEmpty(message = "Kam se kam ek admin email chahiye")
    List<@Email String> admins,

    @NotNull
    @Valid
    RazorpayConfig razorpay

) {
    public record Retry(
        @Min(value = 1, message = "Retry at least 1 time toh karo")
        @Max(value = 10, message = "10 se zyada retry? Banda pagal hai kya?")
        int maxAttempts,

        @Min(0)
        int backoffMs
    ) {}

    public record RazorpayConfig(
        @NotBlank String keyId,
        @NotBlank String keySecret
    ) {}
}
```

Agar `app.base-url` blank hai ya `app.retry.max-attempts` 0 se kam hai — Spring Boot **startup pe hi** `BindValidationException` throw karega. App run hi nahi karega. Production mein ek galat deployment se bakwaas state mein poora app chalane se yeh kaafi better hai.

Validation ke liye yeh dependency chahiye:

```xml
<!-- pom.xml mein add karo -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
</dependency>
```

---

## Full Real-World Example — Ek Complete App Config

Yeh dekho — ek realistic Zomato-style order service ka config:

```yaml
# application.yml — base config (always loaded)
spring:
  application:
    name: order-service
  datasource:
    url: jdbc:postgresql://localhost:5432/orders_dev
    username: dev_user
    password: devpass
    hikari:
      maximum-pool-size: 5  # dev mein kam connections kaafi hain
      connection-timeout: 20000

server:
  port: ${PORT:8080}        # env var PORT hai toh use karo, nahi toh 8080

app:
  base-url: ${API_BASE_URL:http://localhost:8080}
  retry:
    max-attempts: 3
    backoff-ms: 200
  features:
    new-checkout: false
    beta-menu: true
  razorpay:
    key-id: ${RAZORPAY_KEY_ID:rzp_test_dummy}
    key-secret: ${RAZORPAY_KEY_SECRET:dummy_secret}
  admins:
    - ops@yourapp.com

logging:
  level:
    root: INFO
    com.yourapp: DEBUG
    org.springframework.web: DEBUG  # dev mein HTTP requests log karo

management:
  endpoints:
    web:
      exposure:
        include: health, info, metrics, env
```

```yaml
# application-prod.yml — production overrides
spring:
  datasource:
    url: ${DATABASE_URL}
    username: ${DB_USER}
    password: ${DB_PASSWORD}
    hikari:
      maximum-pool-size: 20  # prod mein zyada connections
      connection-timeout: 30000

server:
  port: 80
  compression:
    enabled: true
    mime-types: application/json,application/xml,text/html

app:
  features:
    new-checkout: true
    beta-menu: false
  razorpay:
    key-id: ${RAZORPAY_KEY_ID}   # no default — required in prod
    key-secret: ${RAZORPAY_KEY_SECRET}

logging:
  level:
    root: WARN
    com.yourapp: INFO
    org.springframework.web: WARN  # prod mein noisy logs mat karo

management:
  endpoints:
    web:
      exposure:
        include: health, metrics  # prod mein env expose mat karo — security risk!
```

---

## IDE Autocomplete — Secret Weapon

`spring-boot-configuration-processor` add karo toh IntelliJ ya VS Code YAML file likhte waqt `app.` type karo aur sab properties suggest karega. Typos compile time pe pakad jaayenge.

```xml
<!-- pom.xml mein add karo — optional but highly recommended -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-configuration-processor</artifactId>
    <optional>true</optional>  <!-- runtime pe jar mein nahi jaata -->
</dependency>
```

Build karo ek baar (`mvn compile`), aur `target/` mein `spring-configuration-metadata.json` generate hoga. IntelliJ yeh file use karke autocomplete deta hai.

---

## Additional Config Files Import Karna

Bade projects mein config alag-alag jagah se aa sakti hai:

```yaml
# application.yml
spring:
  config:
    import:
      - optional:file:./local.yml         # local developer overrides (gitignore mein rakho)
      - configtree:/etc/secrets/          # Kubernetes secrets as files
      - optional:configserver:            # Spring Cloud Config Server se
```

`optional:` prefix ka matlab — agar file nahi mili toh error mat do. Bina `optional:` ke, file missing hone par startup fail ho jaata hai.

**Local developer override** ke liye yeh pattern achha hai:

```yaml
# application.yml mein
spring:
  config:
    import:
      - optional:file:./local.yml
```

```yaml
# local.yml — gitignore mein add karo!
spring:
  datasource:
    password: my_local_password_123

app:
  razorpay:
    key-id: rzp_test_my_personal_key
```

`.gitignore` mein add karo:
```
local.yml
application-local.yml
*.local.yml
```

---

## Gotchas — Beginners Yahan Phasate Hain

> [!warning] Common mistakes jinse bacho
>
> **1. Hyphen vs camelCase confusion**
> YAML mein `app.base-url` likhte hain, Java mein `baseUrl` hota hai — Spring Boot yeh relaxed binding automatically handle karta hai. Dono mein se koi bhi use karo, lekin ek project mein consistent raho.
>
> **2. Wrong profile file name**
> Profile `dev` activate ki hai lekin file ka naam `application-development.yml` hai — yeh load nahi hogi! File names exactly match karni chahiye: `application-dev.yml`.
>
> **3. Secrets YAML mein commit kar diye**
> Sabse badi galti. `application.yml` mein real passwords/API keys mat likho. `.gitignore` mein `application-local.yml` aur `local.yml` add karo. Real secrets ke liye env vars ya Vault use karo.
>
> **4. `@ConfigurationProperties` class registered nahi**
> Bina `@ConfigurationPropertiesScan` ya `@EnableConfigurationProperties(AppProperties.class)` ke class bean nahi banegi — inject nahi hogi, silently fail karegi. Main class pe `@ConfigurationPropertiesScan` lagana mat bhoolo.
>
> **5. `@Value` constructor mein use karna**
> `@Value` se inject hone wale fields constructor ke baad set hote hain. Constructor mein use karo toh `null` milega. Iska solution: constructor parameter mein `@Value` use karo.
>
> ```java
> // GALAT — null milega constructor mein
> @Value("${app.name}")
> private String appName;
>
> public MyService() {
>     System.out.println(appName); // null! field abhi set nahi hua
> }
>
> // SAHI — constructor parameter mein inject karo
> private final String appName;
>
> public MyService(@Value("${app.name}") String appName) {
>     this.appName = appName;
>     System.out.println(appName); // works!
> }
> ```
>
> **6. `spring.profiles.include` deprecated hai Spring Boot 2.4+ mein**
> Use karo `spring.config.activate.on-profile` aur `spring.profiles.group`.
>
> **7. Environment variable override kaam nahi kar raha**
> Check karo naming: `app.feature-flags.beta` ke liye env var `APP_FEATURE_FLAGS_BETA` ya `APP_FEATUREFLAGS_BETA` — dono work karte hain. Lekin `APP_FEATUREFLAGSBETA` (bina underscore ke) nahi chalega.
>
> **8. `@Value` mein property exist nahi karti**
> Agar `${app.nonexistent}` likha aur woh property kahi define nahi hai, app startup pe `IllegalArgumentException` throw karega. Default value do ya `@Value("${app.nonexistent:#{null}}")` use karo nullable ke liye.

---

## Node.js Developer Ke Liye Direct Comparison

| Node.js/Express | Spring Boot |
|---|---|
| `.env` file | `application.yml` |
| `process.env.PORT` | `${PORT}` ya `@Value("${server.port}")` |
| `dotenv.config()` | Automatic — kuch karna nahi |
| `parseInt(process.env.X)` | Automatic type conversion |
| `config/index.ts` | `@ConfigurationProperties` record |
| `NODE_ENV=production` | `SPRING_PROFILES_ACTIVE=prod` |
| Zod/Joi env validation | `@Validated` + Bean Validation annotations |
| No nested env vars | Full YAML nesting with Java record mapping |

---

## Key Takeaways

- **`application.yml`** Spring Boot ka primary config file hai — `.env` aur `config/index.ts` dono ka replacement
- **Precedence order**: CLI args > env vars > external config > `application-{profile}.yml` > `application.yml`
- **Profiles** (`dev`, `prod`, `staging`) se ek hi codebase alag-alag environments pe different config ke saath chalti hai
- **Environment variables** automatically bind hoti hain — `server.port` ko `SERVER_PORT` se override karo
- **`@Value`** simple, ek-off properties ke liye; **`@ConfigurationProperties`** related config groups ke liye — prefer this
- **`@ConfigurationProperties` + `@Validated`** = startup pe fail karo agar config galat hai — runtime crash se yeh kaafi better hai
- **Secrets YAML mein mat rakho** — env vars ya secret managers use karo; `application-local.yml` ko gitignore mein daalo
- **`@ConfigurationPropertiesScan`** main class pe lagana mat bhoolo — bina iske beans register nahi honge
- **`spring-boot-configuration-processor`** add karo — IDE autocomplete milti hai YAML mein, typos build time pe pakad jaate hain
