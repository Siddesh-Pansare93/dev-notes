# Twelve-Factor Spring

> [!info] Express/TS wale dev ke liye
> 12-factor methodology platform-agnostic hai — matlab kisi bhi language/framework pe apply hoti hai. Lekin funny baat ye hai ki Spring Boot ko design hi kuch is tarah kiya gaya hai jaise 12-factor ka checklist saamne rakh ke banaya ho: externalized config, stateless processes, log-to-stdout, port binding — sab kuch built-in hai. Ye note har factor ko uske Spring equivalent se map karta hai.

Socho tumne Express mein ek app banayi — usme tumne manually `.env` file handle ki, `dotenv` package use kiya, PM2 se process manage kiya, aur logs ko `winston` se file mein likha. 12-factor bolta hai "bhai ye sab platform pe chhod do, apna app sirf business logic pe focus kare." Spring Boot exactly yahi philosophy follow karta hai out of the box.

## I. Codebase

> Ek codebase, version control mein tracked, lekin uske multiple deploys ho sakte hain.

Kya matlab hai iska? Zomato ka backend agar ek hi codebase hai, toh wahi codebase dev, staging, aur production — teeno jagah deploy hota hai. Alag-alag environment ke liye alag code nahi likhte, sirf config badalte ho.

- Ek deployable service = ek Git repo
- Wahi JAR file dev/staging/prod teeno jagah ship hoti hai — sirf config change hoti hai
- Agar shared code chahiye multiple modules mein, toh multi-module Maven/Gradle setup use karo (ek hi deployable ke andar)

## II. Dependencies

> Dependencies explicitly declare karo aur isolate karo.

Node.js mein tum `package.json` mein dependencies likhte ho aur `node_modules` mein sab kuch isolated rehta hai. Spring mein bhi wahi concept hai, bas tools alag hain.

- Maven ka `pom.xml` ya Gradle ka `build.gradle` — direct dependencies yahin lock hoti hain
- BOMs (Bill of Materials) jaise `spring-boot-dependencies` — ye transitive dependencies (dependencies ki dependencies) ke versions pin karte hain, taaki version clash na ho
- System pe pehle se installed JARs pe kabhi bharosa mat karo — fat JAR banao jisme sab kuch bundle ho ([[01-Packaging-Fat-JAR]])

> [!tip]
> Fat JAR basically tumhare `node_modules` ke bundled zip jaisa hai — poora dependency tree ek hi file mein pack ho jaata hai, taaki "works on my machine" wala issue na aaye.

## III. Config

> Config ko environment mein store karo, code mein hardcode mat karo.

Ye woh wahi principle hai jo tum Express mein `process.env.DATABASE_URL` se follow karte ho. Spring mein bhi bilkul same idea hai, bas thoda type-safe tareeke se.

- `application.yml` + `SPRING_*` environment variables se config externalize karo
- Dekho [[06-Profiles-Per-Environment]]
- Typed config ke liye `@ConfigurationProperties` use karo — ye tumhe compile-time safety deta hai, jo plain `process.env.X` mein nahi milti
- Secrets (API keys, passwords) ko mounted files ya secret managers (Vault, AWS Secrets Manager) se lao — kabhi bhi source code mein commit mat karo

```java
@ConfigurationProperties(prefix = "payments")
public record PaymentsConfig(URI gatewayUrl, Duration timeout, String apiKey) {}
```

Yahan pe agar `payments.gateway-url` config mein missing ho ya galat format ka ho, toh app startup pe hi fail ho jayegi — runtime pe `undefined` milne ka koi chance nahi, jaisa TypeScript mein bina strict types ke ho sakta hai.

## IV. Backing services

> Backing services (DB, cache, queue) ko attached resources ki tarah treat karo.

Kya hota hai yahan? Tumhara app ye differentiate hi nahi kar pata ki DB local hai ya cloud pe — sab kuch bas ek URI/connection string hai.

- DB, Redis, Kafka, S3 — ye sab **URIs** hain config mein. `localhost:5432` ko `db.prod.svc.cluster.local:5432` se swap karo, code mein ek line bhi change nahi karni padegi
- Connection pools use karo (HikariCP — JDBC ke liye Spring Boot mein default hai)
- Har backing service ka health-check rakho ([[05-Health-Checks-and-Readiness]])

Socho jaise Swiggy ka backend kabhi bhi apna Redis instance switch kar sakta hai bina code deploy kiye — sirf ek env variable change karke.

## V. Build, release, run

> Build aur run stages ko strictly alag rakho.

- **Build**: `./mvnw package` chalao — ye ek immutable JAR banata hai
- **Release**: JAR + config milke banate hain ek versioned image/tag
- **Run**: container runtime us image ko execute karta hai
- Ek release immutable hoti hai. Rollback karna hai? Bas previous tag ko phir se deploy kardo.

Ye bilkul CI/CD pipeline jaisa hai jo tum GitHub Actions mein dekhte ho — build ek baar hoti hai, wahi artifact har environment mein promote hota hai.

## VI. Processes

> App ko ek ya zyada **stateless** processes ki tarah run karo.

Ye sabse important factor hai scaling ke liye. Agar tumhara process state hold karta hai (jaise session data memory mein), toh horizontal scaling break ho jaati hai.

- In-process session state mat rakho — Redis / DB / JWT use karo
- Local file writes persistence ke liye mat karo (temp/cache chalega)
- Distributed HTTP sessions chahiye toh Spring Session use karo
- Sticky sessions scale pe anti-pattern hain — load balancer ek hi server pe user ko baar-baar bhejega, jo scaling ka pura fayda khatam kar deta hai

> [!warning]
> Agar tumne kabhi socket.io wale app mein in-memory session use kiya hai jo sirf ek server pe kaam karta hai, toh samajh jaoge ye problem kitni real hai jab tum 2+ instances run karte ho.

## VII. Port binding

> Service ko port binding ke zariye expose karo.

- Spring Boot ke andar hi Tomcat/Netty embedded hai — ye seedha ek port pe bind hota hai (`server.port`)
- Alag se external app server (Tomcat/JBoss/WebLogic) install karne ki zaroorat nahi
- Service-to-service communication HTTP/gRPC se karo, shared filesystem se nahi

Ye bilkul `app.listen(3000)` jaisa hai Express mein — Spring Boot bhi apna khud ka server leke aata hai, tumhe alag se Apache/Nginx setup karne ki zaroorat nahi (reverse proxy ke ilawa).

## VIII. Concurrency

> Process model ke zariye scale out karo.

- Horizontal scaling — zyada pods/replicas laga do
- Thread pools tune karo (`server.tomcat.threads.max`)
- Async kaam ke liye `@Async` + `Executor` beans use karo, ya phir virtual threads (`spring.threads.virtual.enabled=true` — Boot 3.2+ mein available)
- Heavy CPU wala kaam? Usse separate worker service mein daalo aur queue use karo ([[01-Spring-Kafka]])

Node.js single-threaded event loop pe chalta hai, isliye tum clustering (PM2) ya worker threads use karte ho. Spring Boot mein JVM already multi-threaded hai, toh concurrency ka model thoda different hai — lekin scaling ka core idea same: "zyada load? zyada instances lagao."

## IX. Disposability

> Fast startup aur graceful shutdown se robustness maximize karo.

Kyun zaroori hai? Kubernetes jab pod ko kill karta hai (deployment update, scaling down, crash recovery), toh app ko turant band hona chahiye bina requests drop kiye, aur naya instance turant start hona chahiye.

- **Fast startup**: AOT / GraalVM Native ([[03-GraalVM-Native-Image]]) use karo — sub-second boot time milta hai
- **Graceful shutdown**:
  ```yaml
  server:
    shutdown: graceful
  spring:
    lifecycle:
      timeout-per-shutdown-phase: 30s
  ```
- In-flight requests ko drain karo, connection pools close karo, queues flush karo — abhi jo kaam chal raha hai use complete hone do, phir band ho

Ye bilkul Ola driver app jaisa hai — jab app update hota hai, ongoing ride ko turant cancel nahi karte, use complete hone dete hain phir naya version load hota hai.

## X. Dev/prod parity

> Dev, staging, aur production ko jitna ho sake similar rakho.

Ye woh classic "mere machine pe toh chal raha tha" problem solve karta hai.

- **Testcontainers** use karo ([[01-Testing-Strategy]]) — taaki devs apne local machine pe real Postgres/Kafka/Redis chalayein, H2 ya embedded mocks pe bharosa mat karo
- Har jagah same JDK version rakho (`.sdkmanrc` ya `.tool-versions` se lock karo)
- Jahan tak ho sake, same OS family use karo (local pe bhi Linux containers)

Isse tumhe production mein wahi bugs milenge jo dev mein milte — surprise nahi milega ki "prod mein Postgres ka behavior alag hai kyunki mere local pe SQLite tha."

## XI. Logs

> Logs ko event streams ki tarah treat karo.

- **stdout/stderr** pe log karo (Spring Boot mein ye default hai)
- Log rotation app ke andar mat manage karo — us kaam ko platform/k8s pe chhod do
- Production mein structured JSON logs use karo ([[03-Logging-Best-Practices]])
- Logs ko Loki, ELK, Datadog, CloudWatch jaise tools se aggregate karo — kabhi bhi production server pe `tail -f` karke debug mat karo

Jaise IRCTC apne saare servers ke logs ek centralized dashboard pe dekhta hoga, na ki har server pe SSH karke individually — waise hi tumhara setup hona chahiye.

## XII. Admin processes

> Admin/management tasks ko one-off processes ki tarah run karo.

- DB migrations: Flyway/Liquibase use karo ([[03-Migrations-Flyway-Liquibase]]) — ye app startup pe chal sakte hain ya separate job ki tarah
- Data backfills: alag `@SpringBootApplication` mode mein chalao, ya `CommandLineRunner` ke saath profile guard laga do
- Admin endpoints ko kabhi bhi public HTTP pe expose mat karo

```java
@Component
@Profile("backfill")
public class BackfillRunner implements CommandLineRunner {
    @Override
    public void run(String... args) {
        // one-off task, phir exit
    }
}
```

Isse chalane ke liye `SPRING_PROFILES_ACTIVE=backfill` set karo ek Job pod mein.

## Bonus: cloud-native additions

12-factor list k8s se pehle likhi gayi thi. Modern world mein kuch aur cheezein bhi add ho gayi hain:
- **API first** — OpenAPI spec ko source of truth banao ([[02-OpenAPI-Swagger]])
- **Telemetry** — metrics, traces, logs ko first-class citizen treat karo, afterthought nahi
- **Authentication** — OIDC/OAuth2 se externalize karo ([[02-OAuth2-OIDC-with-Spring]])

## Key Takeaways

- 12-factor ek checklist hai jo batata hai ki cloud-native app kaise design karna chahiye — Spring Boot iske bahut saare points ko out of the box handle karta hai
- Config hamesha environment se aani chahiye, code mein hardcode nahi honi chahiye
- App stateless rehna chahiye taaki horizontal scaling seedha kaam kare
- Build ek baar hoti hai, wahi immutable artifact har environment mein deploy hota hai
- Logs stdout pe jaayein, rotation/aggregation platform ka kaam hai, app ka nahi
- Fast startup + graceful shutdown = Kubernetes ke saath smooth experience
- Dev/prod parity (Testcontainers use karke) tumhe production surprises se bachati hai

## Related
- [[03-Configuration-Properties]]
- [[06-Profiles-Per-Environment]]
- [[04-Kubernetes-Basics]]
- [[03-Logging-Best-Practices]]
- [[05-Health-Checks-and-Readiness]]
