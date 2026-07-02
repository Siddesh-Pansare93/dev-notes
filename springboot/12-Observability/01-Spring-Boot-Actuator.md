# Spring Boot Actuator

> [!info] Express/TS wale dev ke liye
> Socho tumhare pass ek Express app hai aur tumne khud `/health`, `/metrics`, `/info` jaise routes likhe hain — kabhi `express-prom-bundle` use karke, kabhi `terminus` package se health checks laga ke. Har project mein yeh same kaam baar baar karna padta hai. Spring Boot mein yeh dard nahi hai — ek dependency daalo aur production-grade monitoring endpoints ready mil jaate hain, standardized format mein. Yeh hai Actuator.

## Yeh hai kya?

`spring-boot-starter-actuator` ek starter hai jo tumhare running app ke andar "peeping window" khol deta hai — HTTP (aur JMX) ke through management aur monitoring endpoints expose karta hai. Matlab tumhara app production mein chal raha hai, aur tumhe janna hai ki:
- App healthy hai ya nahi?
- Memory/CPU/thread ka kya haal hai?
- Konse config values load hui hain?
- Logging level kya set hai, aur runtime mein change kar sakte ho kya?
- Deadlock ya memory leak debug karna hai to thread dump/heap dump chahiye?

Yeh sab Actuator ek hi dependency se de deta hai — health, metrics, environment, configuration, thread dumps, heap dumps, loggers, sab kuch.

## Kaise add karein?

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

Bas itna add karne se magic nahi hoga — **security ke reason se** by default sirf `/actuator/health` hi HTTP pe expose hota hai. Baaki sab endpoints opt-in hain, tumhe explicitly enable karne padenge. Yeh Spring team ka jaanbujh kar liya gaya decision hai — kyunki `/actuator/env` ya `/actuator/heapdump` jaise endpoints agar publicly khule reh gaye, to attacker ko tumhare DB passwords, API keys sab mil sakte hain.

## Exposure configure karna

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus,loggers
        # ya: "*" sab expose karne ke liye (PRODUCTION mein MAT karna!)
  endpoint:
    health:
      show-details: when-authorized
      probes:
        enabled: true
  info:
    env:
      enabled: true
    git:
      mode: full
```

> [!warning] "*" ka temptation
> Development mein `include: "*"` daal ke sab endpoints on kar dena easy lagta hai, lekin production mein isse bachna hai. Bilkul waise jaise tum Express mein saare internal debug routes public internet pe expose nahi karoge — sochke, selectively hi endpoints expose karo.

## Common endpoints — cheat sheet

Zomato ke restaurant dashboard jaisa socho — jaise unke paas "orders health", "delivery metrics", "kitchen logs" alag alag dashboards hote hain, waise hi Actuator ke endpoints hain:

| Endpoint | Kaam kya hai |
|----------|---------|
| `/actuator/health` | Overall health status (UP/DOWN) — ek nazar mein pata chal jaaye app zinda hai ya nahi |
| `/actuator/health/liveness` | K8s liveness probe — "kya app crash ho gaya hai, restart chahiye?" |
| `/actuator/health/readiness` | K8s readiness probe — "kya app traffic lene ke liye ready hai?" |
| `/actuator/info` | Build/git/custom info — konsi version deployed hai |
| `/actuator/metrics` | Available metric names ki list |
| `/actuator/metrics/{name}` | Ek specific metric ka detail |
| `/actuator/prometheus` | Prometheus scrape karne ke liye endpoint |
| `/actuator/loggers` | Runtime mein log level dekho/badlo, bina restart kiye |
| `/actuator/env` | Environment properties (sensitive — sambhal ke) |
| `/actuator/configprops` | Saare `@ConfigurationProperties` beans |
| `/actuator/threaddump` | Thread dump — deadlock debug karne ke kaam aata hai |
| `/actuator/heapdump` | Heap dump download karo — memory leak dhoondne ke liye |
| `/actuator/mappings` | Saare `@RequestMapping`s ki list |
| `/actuator/beans` | Spring container ke saare beans |

## Health Indicators — app ka pulse check

**Kyun zaruri hai?** Sirf "app up hai" bata dena kaafi nahi hota. Tumhara app DB se, Redis se, kisi third-party payment gateway se connected hai — agar DB down ho gaya, to tumhara app technically "chal" raha hai lekin actually kaam nahi kar raha. Health Indicators isliye hote hain — woh individual dependencies ka health check karke overall status banate hain.

Built-in indicators classpath dekh ke khud-ba-khud register ho jaate hain: `DataSource`, `Redis`, `MongoDB`, `RabbitMQ`, `DiskSpace`, waghera. Matlab agar tumne `spring-boot-starter-data-redis` daala hai, Actuator apne aap Redis ka health check bhi karne lagega — tumhe kuch likhna nahi padta.

Apna custom health check chahiye? Jaise Zomato/Swiggy mein ek "PaymentGateway" (Stripe/Razorpay) hai jiska health track karna hai:

```java
@Component
public class PaymentGatewayHealth implements HealthIndicator {
    private final PaymentClient client;

    @Override
    public Health health() {
        try {
            client.ping();
            return Health.up().withDetail("provider", "stripe").build();
        } catch (Exception e) {
            return Health.down(e).build();
        }
    }
}
```

Bas `HealthIndicator` implement karo, `@Component` laga do — Spring khud isko `/actuator/health` ke aggregate response mein include kar lega. Agar yeh DOWN return kare, to poora app ka health status bhi DOWN ho jayega (jab tak tum group config karke alag na rakho).

## /info contributors — build info dikhana

Kabhi socha hai production mein pucha jaye "yeh konsi version deployed hai?" aur jawab dena mushkil ho? `/actuator/info` isi ke liye hai. Maven plugin add karo:

```xml
<plugin>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-maven-plugin</artifactId>
    <executions>
        <execution>
            <goals><goal>build-info</goal></goals>
        </execution>
    </executions>
</plugin>
```

Ab `/actuator/info` `build.version`, `build.time` jaisi cheezein expose karega — bina tumhe manually kuch likhe. Ek IRCTC ka ticket booking status check karne jaisa hai — ek jagah dekho, sab pata chal jaaye.

## Runtime mein log level change karna

Yeh Actuator ka sabse practical feature hai. Production mein ek bug aaya, aur tumhe DEBUG logs chahiye us specific package ke liye — lekin restart nahi karna (restart matlab downtime, deployment pipeline, waghera). Node.js mein tum shayad `DEBUG=app:*` environment variable set karke restart karte ho. Spring Boot mein aisa karne ki zaroorat nahi:

```bash
curl -X POST http://localhost:8080/actuator/loggers/com.example.api \
  -H 'Content-Type: application/json' \
  -d '{"configuredLevel":"DEBUG"}'
```

Ek curl request, aur bina restart kiye us package ka log level DEBUG ho gaya. Debug khatam hote hi wapas INFO pe le aao — same tarike se.

> [!tip] Production tip
> Actuator endpoints ko alag port pe daalo aur sirf internal network se accessible rakho — jaise CRED ka internal admin dashboard public internet pe nahi hota, waise hi tumhare sensitive endpoints bhi na hon:
> ```yaml
> management:
>   server:
>     port: 9090
>     address: 127.0.0.1
> ```
> Isse `/actuator/*` endpoints sirf `9090` port pe milenge, aur woh bhi sirf localhost se — external world isse touch bhi nahi kar sakta.

## Security — bahut zaruri, halke mein mat lena

Actuator endpoints **sensitive** hain! Yeh tumhare app ki chaabi hain — agar galat haathon mein pad gaye to:
- `/actuator/env` se tumhare DB passwords, API secrets dikh sakte hain
- `/actuator/heapdump` se poore application memory ka snapshot download ho sakta hai (jismein session data, tokens, sab kuch ho sakta hai)
- `/actuator/loggers` se koi bhi attacker tumhare production logs ka level DEBUG karke sensitive info nikalwa sakta hai

Isliye hamesha:
- Spring Security se restrict karo ([[01-Spring-Security-Basics]])
- Alag management port use karo
- `/heapdump`, `/env`, `/configprops` ko kabhi bhi publicly expose mat karo

```java
@Bean
SecurityFilterChain actuatorSecurity(HttpSecurity http) throws Exception {
    return http
        .securityMatcher(EndpointRequest.toAnyEndpoint())
        .authorizeHttpRequests(a -> a
            .requestMatchers(EndpointRequest.to("health", "info")).permitAll()
            .anyRequest().hasRole("ADMIN"))
        .httpBasic(Customizer.withDefaults())
        .build();
}
```

Yahaan pattern simple hai — `health` aur `info` jaise harmless endpoints sabke liye khule (load balancers, monitoring tools inhi ko poll karte hain), baaki sab kuch sirf `ADMIN` role wale users ke liye.

## Node.js/Express se comparison

| Cheez | Express mein | Spring Boot Actuator mein |
|---|---|---|
| Health check | Khud `/health` route likho | `/actuator/health` built-in, dependencies (DB/Redis) auto-check karta hai |
| Metrics | `prom-client` manually wire karo | `/actuator/prometheus` — Micrometer ke saath ready |
| Runtime log level change | Restart ya custom hack | `/actuator/loggers` POST request se |
| Thread/heap dump | Node `--inspect` + Chrome DevTools | `/actuator/threaddump`, `/actuator/heapdump` direct HTTP se |
| Build info | Manual `package.json` version read karo | `/actuator/info` build plugin se auto |

## Common gotchas

1. **`"*"` expose karke bhool jaana** — dev mein sab enable kiya, production config mein wahi copy-paste ho gaya. Hamesha explicitly list karo ki kya expose karna hai.
2. **Management port bhool jaana** — agar management port alag nahi kiya, to Actuator endpoints tumhare main app ke saath same port pe, same security rules ke saath expose ho jaate hain (jab tak security config na ho).
3. **Heapdump endpoint ko production mein khula rakhna** — yeh sabse zyada overlook hota hai. Heap dump mein literally application ki poori memory hoti hai — sensitive data leak ka bada risk.
4. **Health indicator mein heavy operations karna** — health check bahut frequently poll hota hai (load balancers har few seconds mein). Agar tumhara custom `HealthIndicator` ek slow DB query kar raha hai, to poora health check hi slow ho jayega.

## Key Takeaways

- Actuator ek starter dependency hai jo production-grade monitoring/management endpoints deta hai — health, metrics, info, loggers, thread/heap dumps, etc.
- By default sirf `/actuator/health` expose hota hai; baaki sab `management.endpoints.web.exposure.include` se explicitly enable karna padta hai.
- Custom health checks `HealthIndicator` implement karke bana sakte ho — apni dependencies (payment gateway, external API) ka health track karne ke liye.
- `/actuator/loggers` se runtime mein bina restart kiye log level change kar sakte ho.
- Security critical hai — separate management port use karo, sensitive endpoints (`/env`, `/heapdump`, `/configprops`) kabhi publicly expose mat karo, aur Spring Security se protect karo.
- Express ke comparison mein, yeh woh cheez hai jo tum manually multiple packages jodke banate — Spring Boot mein ek dependency se milta hai, standardized aur battle-tested.

## Related
- [[02-Micrometer-Metrics]]
- [[05-Health-Checks-and-Readiness]]
- [[03-Logging-Best-Practices]]
- [[04-Distributed-Tracing]]
- [[01-Spring-Security-Basics]]
