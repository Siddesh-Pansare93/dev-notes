# Logging Best Practices

> [!info] Express/TS wale dev ke liye
> SLF4J basically tumhara `winston`/`pino` ka interface hai. Logback uska default implementation hai — jaise `pino` ek library hai jo actual kaam karti hai. Spring Boot by default Logback ko wire kar deta hai, tumhe kuch setup nahi karna padta. JSON logs + MDC (Mapped Diagnostic Context) tumhe wahi correlation-ID wala workflow dete hain jo tumne `pino-http` + `cls-hooked` combo mein use kiya hoga Node mein.

## Stack samajh lo pehle

Kya hota hai yeh teeno cheezein? Chalo ek ek karke dekhte hain:

- **SLF4J** — yeh facade hai, matlab yeh sirf ek API hai jispe tum log likhte ho (`log.info(...)`, `log.error(...)`). Yeh khud kuch nahi karta, sirf interface deta hai.
- **Logback** — yeh actual implementation hai jo SLF4J ke peeche kaam karta hai. Spring Boot mein by default yehi aata hai.
- **MDC** — ek thread-local key/value bag hai jo har log event ke saath automatically attach ho jaata hai. Isse tum request-specific data (jaise correlation ID) har log line mein daal sakte ho bina har jagah manually pass kiye.

Zomato ke context mein socho — jab tumhara order place hota hai, toh backend mein alag-alag services (payment, inventory, delivery) log likhti hain. Agar sabke logs mein ek common `orderId` chala jaaye automatically, toh debugging ekdum aasan ho jaati hai. Yehi kaam MDC karta hai.

## Logger kaise lein?

Sabse pehla step — apni class mein ek logger chahiye hota hai jispe tum `.info()`, `.debug()`, `.error()` jaise methods call karo.

```java
@Slf4j  // Lombok generates the field
@Service
public class OrderService {
    public Order place(NewOrder cmd) {
        log.info("Placing order for user={}", cmd.userId());
        ...
    }
}
```

`@Slf4j` ek Lombok annotation hai — yeh compile time pe ek `private static final Logger log` field generate kar deta hai, tumhe khud likhna nahi padta. Agar Lombok use nahi kar rahe:

```java
private static final Logger log = LoggerFactory.getLogger(OrderService.class);
```

Dono same kaam karte hain, bas Lombok wala approach boilerplate bacha deta hai.

## Levels (order mein)

Kyun zaruri hai levels samajhna? Kyunki production mein tum har cheez log nahi karna chahte — sirf important cheezein. Levels ka order hai:

`TRACE < DEBUG < INFO < WARN < ERROR`

Jitna neeche level, utna zyada detail — TRACE sabse chatpat hai (bahut zyada detail), ERROR sabse critical (sirf failures). Jab tum root level `INFO` set karte ho, toh DEBUG aur TRACE wale logs chup ho jaate hain, sirf INFO aur usse upar wale dikhte hain.

`application.yml` mein set karo:

```yaml
logging:
  level:
    root: INFO
    com.example: DEBUG
    org.hibernate.SQL: DEBUG
    org.springframework.web: INFO
```

Yahan trick yeh hai — tum apne package (`com.example`) ke liye DEBUG on rakh sakte ho jabki baaki sab INFO pe hi rahe. Development mein Hibernate ki actual SQL queries dekhni ho toh `org.hibernate.SQL: DEBUG` bahut kaam aata hai.

## Parameterized messages — kabhi concatenate mat karo

Yeh ek chhota sa gotcha hai jo bahut logon ko pakadta hai. Dekho:

```java
// BAD: builds the string even when DEBUG is off
log.debug("Loaded user " + user.getName() + " with " + orders.size() + " orders");

// GOOD: SLF4J defers formatting until level check passes
log.debug("Loaded user {} with {} orders", user.getName(), orders.size());
```

Kyun BAD wala approach bura hai? Kyunki `+` operator se string concatenation JVM turant kar deta hai — chahe DEBUG level on ho ya off, string build hogi hi hogi, matlab compute waste. GOOD wale approach mein SLF4J pehle check karta hai ki DEBUG level enabled hai ya nahi, tabhi `{}` placeholders ko actual values se replace karta hai. Yeh bilkul waise hai jaise Node mein `pino` ke lazy logging patterns kaam karte hain — jab tak koi log level enabled na ho, expensive string building skip ho jaati hai.

## Structured (JSON) logs Logback ke saath

Kyun zaruri hai JSON logging? Production mein tumhare logs kisi centralized system (ELK, Datadog, CloudWatch) mein jaate hain jo unhe parse karta hai. Plain text logs parse karna painful hota hai, JSON logs ekdum structured hote hain — key-value pairs, easy filtering, easy searching.

`logstash-logback-encoder` add karo:

```xml
<dependency>
    <groupId>net.logstash.logback</groupId>
    <artifactId>logstash-logback-encoder</artifactId>
    <version>7.4</version>
</dependency>
```

`src/main/resources/logback-spring.xml`:

```xml
<configuration>
    <springProfile name="local">
        <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
            <encoder>
                <pattern>%d{HH:mm:ss.SSS} %-5level [%X{traceId},%X{spanId}] %logger{36} - %msg%n</pattern>
            </encoder>
        </appender>
    </springProfile>

    <springProfile name="prod,staging">
        <appender name="JSON" class="ch.qos.logback.core.ConsoleAppender">
            <encoder class="net.logstash.logback.encoder.LogstashEncoder">
                <includeMdcKeyName>traceId</includeMdcKeyName>
                <includeMdcKeyName>spanId</includeMdcKeyName>
                <includeMdcKeyName>userId</includeMdcKeyName>
                <customFields>{"service":"orders-api","env":"prod"}</customFields>
            </encoder>
        </appender>
    </springProfile>

    <root level="INFO">
        <appender-ref ref="JSON"/>
    </root>
</configuration>
```

Idea simple hai — local machine pe developer ke liye human-readable text format chahiye (easy to read in terminal), lekin prod/staging mein JSON chahiye jo log aggregators easily ingest kar sakein. `<springProfile>` tags Spring ke active profile ke hisaab se decide karte hain kaunsa appender use karna hai — bilkul waise jaise Node mein tum `NODE_ENV` check karke different logger config load karte ho.

> [!tip] Spring Boot 3.4+ mein built-in JSON support
> Ab tumhe extra dependency bhi nahi chahiye agar tum simple use case chahte ho:
> ```yaml
> logging:
>   structured:
>     format:
>       console: ecs   # or logstash, gelf
> ```

## MDC — correlation IDs

Kya problem solve karta hai yeh? Socho tumhare paas ek microservices setup hai — user ne ek request bheji, woh request Order Service se hoke Payment Service, phir Inventory Service tak jaati hai. Agar koi error aaye, toh tumhe pata kaise chalega ki kaunsi request fail hui? Answer hai — correlation ID. Ek unique ID jo poori request ke lifecycle mein har log line ke saath chipka rehta hai.

```java
public class CorrelationIdFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String corrId = Optional.ofNullable(req.getHeader("X-Correlation-Id"))
            .orElseGet(() -> UUID.randomUUID().toString());
        MDC.put("correlationId", corrId);
        res.setHeader("X-Correlation-Id", corrId);
        try {
            chain.doFilter(req, res);
        } finally {
            MDC.clear();
        }
    }
}
```

Yahan ek filter hai jo har incoming request pe chalega. Agar client ne already `X-Correlation-Id` header bheja hai (jaise upstream service se aaya ho), use woh use karo, warna naya UUID generate kar do. `MDC.put()` se yeh ID thread-local storage mein chala jaata hai, aur us request ke poore lifecycle mein jitne bhi log statements chalenge, sab mein yeh ID automatically include ho jaayegi.

> [!warning] `MDC.clear()` bhoolna mat
> `finally` block mein `MDC.clear()` call karna critical hai. Spring Boot mein thread pool reuse hota hai — agar tum MDC clear nahi karoge, toh purani request ka correlationId agli request (jo usi thread pe chalegi) mein leak ho sakta hai. Yeh ek classic bug hai jo production mein bahut confusion create karta hai.

Ab har request ke andar har log line `correlationId` carry karegi. Aur agar tumne Micrometer Tracing use kiya hai ([[04-Distributed-Tracing]]), toh `traceId` aur `spanId` bhi automatically MDC mein populate ho jaate hain — tumhe kuch extra karna nahi padta.

## Kya log karna chahiye?

> [!tip] Logging hygiene
> - **Boundaries** pe log karo (HTTP in/out, DB calls, external APIs) — yeh woh jagah hai jahan cheezein fail hoti hain
> - **Why** include karo (intent, user action) — sirf raw data dump mat karo. "user placed order" better hai "data: {...}" se
> - **WARN** use karo recoverable problems ke liye, aur **ERROR** with stack trace jab actual failure ho
> - Kabhi bhi secrets, PII, full request bodies, JWTs, passwords log mat karo — yeh security disaster hai
> - Tight loops ke andar log mat karo — CPU aur disk dono waste hoga, aur logs itne zyada aa jaayenge ki kaam ke log dhundhna mushkil ho jaayega

Socho agar tum CRED jaisi fintech app bana rahe ho — agar galti se kisi user ka card number ya OTP log ho gaya, toh yeh sirf embarrassing nahi, compliance violation bhi hai. Isliye logging karte waqt hamesha soch lo — "yeh field agar leak ho jaaye toh kya problem hogi?"

## Exceptions

```java
try {
    paymentService.charge(order);
} catch (PaymentDeclinedException e) {
    log.warn("Payment declined for order={} reason={}", order.id(), e.getCode());
    throw e;
} catch (Exception e) {
    log.error("Unexpected payment failure for order={}", order.id(), e);  // pass `e` LAST
    throw e;
}
```

Do cheezein note karo yahan:

1. **Expected failures** (jaise `PaymentDeclinedException` — card decline hona koi surprise nahi hai, yeh normal business flow hai) ke liye `WARN` use karo, na ki `ERROR`. ERROR ko bacha ke rakho unexpected/critical failures ke liye.
2. Exception object (`e`) ko **hamesha last argument** mein pass karo. Agar tum aisa karoge, toh Logback poori stack trace print karega. Agar galti se `e` ko message ke beech mein daal doge (jaise `"{}", e, order.id()`), toh stack trace nahi milega, sirf `e.toString()` ka output milega — aur debugging ke waqt yeh bahut bada nuksaan hai.

## File rotation (containers mein rare)

Kubernetes mein log stdout/stderr pe hi likho — platform khud rotation handle kar lega (jaise CloudWatch, Loki, ya jo bhi log collector use ho raha ho). Locally develop karte waqt agar file mein log chahiye:

```xml
<appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
    <file>logs/app.log</file>
    <rollingPolicy class="ch.qos.logback.core.rolling.SizeAndTimeBasedRollingPolicy">
        <fileNamePattern>logs/app-%d{yyyy-MM-dd}.%i.log.gz</fileNamePattern>
        <maxFileSize>100MB</maxFileSize>
        <maxHistory>14</maxHistory>
    </rollingPolicy>
</appender>
```

Yeh config daily naya file banayega, aur agar file 100MB se badi ho jaaye toh usko split kar dega. Purane logs 14 din baad delete ho jaayenge (`maxHistory`). Containerized environments mein generally iski zaroorat nahi padti kyunki container khud ephemeral hota hai — logs stdout pe bhejo, platform sambhal lega.

## Key Takeaways

- SLF4J ek facade hai, Logback default implementation — tum SLF4J API pe code likhte ho, Logback peeche actual kaam karta hai
- `@Slf4j` (Lombok) se boilerplate logger declaration bach jaata hai
- Log levels (`TRACE < DEBUG < INFO < WARN < ERROR`) se tum control karte ho ki kitna detail chahiye — production mein generally `INFO` root level rakha jaata hai
- Parameterized logging (`{}` placeholders) use karo, string concatenation se bacho — performance ke liye zaruri hai
- Production mein JSON structured logs use karo taaki log aggregators (ELK, Datadog) easily parse kar sakein
- MDC se correlation IDs aur trace IDs automatically har log line mein carry hote hain — distributed systems mein debugging ke liye lifesaver hai, lekin `MDC.clear()` finally block mein karna mat bhoolna
- Boundaries pe log karo, secrets kabhi log mat karo, aur exceptions ko `log.error(msg, e)` format mein pass karo — `e` hamesha last argument
