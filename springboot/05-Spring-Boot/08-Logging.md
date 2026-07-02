# Logging in Spring Boot

Socho ek scenario — tumhara Zomato-jaisa food delivery app production mein hai. Raat ke 2 baje ek user ka order stuck ho gaya. Payment cut ho gayi, lekin order confirm nahi hua. Customer support wala tumhe ping karta hai. Tum kya karoge? Production database seedha query karoge? Nahi. Tum **logs** dekhoge.

Yahi hai logging ka asli fayda — jab sab kuch theek chal raha ho tab koi logging ki parwah nahi karta, lekin jab production mein aag lage, tab logs hi tumhara ek maatra dost hota hai.

Node.js/Express mein shayad tum `console.log()` se kaam chalate the, ya Pino/Winston use karte the. Spring Boot mein story alag hai — yahan **SLF4J** aur **Logback** out-of-the-box aata hai, aur ye combination bahut powerful hai. Koi extra package install nahi, koi setup nahi — bas likho aur chal jao.

---

## SLF4J + Logback — Ye Kya Hai?

Ek analogy samjho — India mein UPI ka system hai. Tum BHIM use karo, PhonePe use karo, ya GPay — sab UPI protocol se baat karte hain. UPI = interface (API), aur PhonePe/GPay = implementation.

Logging mein same logic:

- **SLF4J** = UPI jaisa interface. Tumhara code sirf isse baat karta hai. `import org.slf4j.Logger` — yahi tumhari duniya hai.
- **Logback** = PhonePe jaisa implementation. Actual kaam yahi karta hai — console pe likhna, file mein save karna, rotate karna.

```
Tumhara Code
     |
     v
   SLF4J  ← (interface / facade)
     |
     v
  Logback ← (actual engine — Spring Boot default)
     |
  ┌──┴──┐
  |     |
Console File
```

**Kyun ye separation?** Kyunki kal agar tumhara team decide kare ki Logback se Log4j2 pe switch karna hai (performance ke liye), toh tumhara application code ek line bhi nahi badlega. Sirf dependency swap karo — SLF4J ka API same rahega.

Node.js mein equivalent: Pino ka API use karo, transport swap karo. Same concept.

---

## Pehla Logger Likhna

Har class ka apna logger hota hai — ye best practice hai. Isse pata chalta hai ki log line kaun si class se aayi.

```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class OrderService {

    // static aur final — ek hi instance, memory efficient
    // OrderService.class deta hai logger ko class ka naam
    private static final Logger log = LoggerFactory.getLogger(OrderService.class);

    public void placeOrder(Order order) {
        // debug: sirf development mein dikhega
        log.debug("Order process shuru ho raha hai, orderId={}", order.getId());

        try {
            // business logic...
            processPayment(order);
            log.info("Order successfully placed. orderId={}, customerId={}",
                     order.getId(), order.getCustomerId());

        } catch (PaymentException e) {
            // warn: kuch galat hua, lekin app crash nahi hua
            log.warn("Payment retry karni padegi. orderId={}, reason={}", order.getId(), e.getMessage());
            throw e;

        } catch (Exception e) {
            // error: serious problem — exception object HAMESHA last argument hona chahiye
            log.error("Order place karne mein fatal error. orderId={}", order.getId(), e);
            throw new OrderProcessingException("Order failed", e);
        }
    }
}
```

> [!tip] Lombok ka `@Slf4j` use karo — boilerplate khatam
> Agar project mein Lombok hai, toh `LoggerFactory.getLogger(...)` wali line manually likhne ki zarurat nahi:
> ```java
> import lombok.extern.slf4j.Slf4j;
>
> @Slf4j          // yeh annotation automatically `log` variable generate karta hai
> @Service
> public class OrderService {
>
>     public void placeOrder(Order order) {
>         log.info("Order placed. orderId={}", order.getId()); // log ready hai!
>     }
> }
> ```
> Lombok compile time pe `private static final Logger log = LoggerFactory.getLogger(OrderService.class);` inject kar deta hai. Clean code, zero boilerplate.

---

## Log Levels — Kitna Shor Machana Chahiye?

Levels hain severity ke according, most verbose se least verbose:

| Level | Kab Use Karo |
|-------|-------------|
| `TRACE` | Bahut granular detail — loop ke andar bhi. Sirf deep debugging ke liye. |
| `DEBUG` | Development mein helpful info — function mein kya aa raha hai, kya ja raha hai |
| `INFO` | Normal operations — "order placed", "user logged in", "payment processed" |
| `WARN` | Kuch theek nahi hai lekin app chal raha hai — retry ho rahi hai, deprecated method use ho raha hai |
| `ERROR` | Serious problem — exception, data loss, third-party service failure |
| `OFF` | Logging band kar do completely |

**Rule of thumb**: Production mein `INFO` rakho, debugging ke liye specific packages ka `DEBUG` karo. `TRACE` kabhi production mein mat chalaao — log volume itna zyada ho jaata hai ki meaningful cheez dhundhna mushkil ho jaata hai.

---

## `{}` Placeholder Rule — Ye Bahut Important Hai

Ye ek mistake hai jo Node.js developers aksar karte hain Spring Boot pe aate waqt:

```java
// GALAT — String concatenation HAMESHA hoti hai, chahe log level enabled ho ya na ho
log.debug("User " + userId + " ne action kiya: " + action + " on resource " + resourceId);

// SAHI — {} placeholder lazy hai — sirf tab format karta hai jab DEBUG level enabled ho
log.debug("User {} ne action {} kiya resource {} pe", userId, action, resourceId);
```

**Kyun ye matter karta hai?** Soch lo production mein `DEBUG` off hai aur tumne string concatenation wala approach use kiya. Har log.debug() call pe bhi String concatenation ho raha hai — memory allocate ho rahi hai, CPU cycle waste ho rahe hain — sirf isiliye ki message ko discard kar diya jaaye. `{}` placeholder se ye sirf tab kaam karta hai jab level enabled ho.

**Bahut expensive argument ke liye guard lagao:**

```java
// Agar expensive method call hai jo log ke liye hi hai
if (log.isDebugEnabled()) {
    log.debug("Full order dump: {}", orderSerializer.toDetailedJson(order));
}

// Java 8+ Supplier pattern — aur bhi clean
log.debug("Full dump: {}", () -> orderSerializer.toDetailedJson(order));
```

---

## application.yml Mein Levels Configure Karo

Koi XML likhne ki zarurat nahi — seedha YAML se ho jaata hai:

```yaml
# application.yml

logging:
  level:
    root: INFO                              # default — sab kuch INFO aur upar

    # Framework ka debug (bahut verbose hota hai, carefully use karo)
    org.springframework.web: DEBUG          # HTTP request/response details
    org.springframework.security: DEBUG     # Security chain ka debug

    # Database queries dekhni hain? Ye do lines karo
    org.hibernate.SQL: DEBUG                # SQL queries dikhega
    org.hibernate.orm.jdbc.bind: TRACE      # Query ke parameters bhi dikhenge

    # Tumhara apna code
    com.example.myapp: DEBUG                # Apna poora package DEBUG mein
    com.example.myapp.payments: INFO        # Payments package mein sirf INFO
```

> [!tip] Environment variable se level badlo — bina redeploy ke
> Ye production mein gold hai. Koi issue aaya, seedha env var set karo:
> ```bash
> # package name mein dots ko underscores se replace karo, uppercase karo
> LOGGING_LEVEL_COM_EXAMPLE_MYAPP_PAYMENTS=DEBUG
> ```
> Ye `application.yml` ke `logging.level.com.example.myapp.payments: DEBUG` ke equivalent hai. Kubernetes pod pe set karo, Spring Boot pick up kar lega. **Koi redeploy nahi, koi restart nahi** (agar Actuator se live reload karein toh).

---

## Log File Mein Save Karna

By default Spring Boot sirf console pe print karta hai. File mein bhi save karna ho toh:

```yaml
logging:
  file:
    name: logs/app.log              # relative path — app ke working directory se

  logback:
    rollingpolicy:
      max-file-size: 10MB           # 10MB ho jaane pe naya file
      max-history: 30               # 30 din ka log rakhega, purana delete hoga
      total-size-cap: 1GB           # total size cap

  pattern:
    file: "%d{yyyy-MM-dd HH:mm:ss.SSS} %-5level [%thread] %logger{36} - %msg%n"
    console: "%clr(%d{HH:mm:ss.SSS}){faint} %clr(%-5p) %clr(%logger{36}){cyan} - %m%n"
```

> [!warning] Docker aur Kubernetes mein file logging mat karo
> Containers ephemeral hote hain — container restart hua, logs gone. Container environments mein `stdout/stderr` pe log karo aur centralized logging system (ELK, Datadog, Loki) use karo. File logging sirf traditional server deployment mein useful hai.

---

## MDC — Ek Request Ko Track Karna

Yeh Spring Boot logging ka ek underrated feature hai. Socho Swiggy ka ek order — order place hua, payment service gaya, restaurant service gaya, delivery service gaya. Agar problem ho toh ek hi request ke saare logs ek saath dekhne chahiye.

**MDC (Mapped Diagnostic Context)** ek thread-local key-value store hai. Ek baar request ID set karo — phir us request ke dauraan likhe saare logs mein automatically aa jayega.

```java
import org.slf4j.MDC;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.util.Optional;
import java.util.UUID;

@Component
public class RequestTracingFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws java.io.IOException, jakarta.servlet.ServletException {

        try {
            // Client se X-Request-Id header lo, ya naya UUID generate karo
            String requestId = Optional.ofNullable(request.getHeader("X-Request-Id"))
                                       .orElse(UUID.randomUUID().toString());
            String userId = Optional.ofNullable(request.getHeader("X-User-Id"))
                                    .orElse("anonymous");

            // MDC mein set karo — is thread ke saare logs mein yeh values aayengi
            MDC.put("requestId", requestId);
            MDC.put("userId", userId);
            MDC.put("httpMethod", request.getMethod());
            MDC.put("uri", request.getRequestURI());

            // Response header mein bhi bhejo — frontend ko pata chale
            response.setHeader("X-Request-Id", requestId);

            filterChain.doFilter(request, response);

        } finally {
            // ZARURI hai — MDC clear karo warna next request ko purana data milega
            // (Thread pool mein threads reuse hoti hain)
            MDC.clear();
        }
    }
}
```

Ab log pattern mein `%X{requestId}` use karo:

```yaml
logging:
  pattern:
    console: "%d{HH:mm:ss.SSS} %-5level [%X{requestId:-NO-ID}] [%X{userId:-?}] %logger{36} - %m%n"
```

Output kuch aisa dikhega:
```
14:23:01.234 INFO  [abc-123-def] [user-456] c.e.OrderService - Order placed. orderId=789
14:23:01.267 INFO  [abc-123-def] [user-456] c.e.PaymentService - Payment processed. amount=499.00
14:23:01.289 INFO  [abc-123-def] [user-456] c.e.NotificationService - SMS sent to +91-98xxx-xxxxx
```

Ek `requestId` se poori request trace kar sako — kitna powerful hai ye!

> [!info] MDC aur Virtual Threads (Java 21+)
> Java 21 ke virtual threads (Project Loom) ke saath MDC thoda tricky ho sakta hai kyunki MDC thread-local hai. Spring Boot 3.2+ mein `InheritableThreadLocal` by default use hota hai virtual threads ke saath, lekin apna stack verify karo agar virtual threads use kar rahe ho.

---

## JSON Logging — Production Ke Liye

Production mein ELK Stack (Elasticsearch + Logback + Kibana), Datadog, ya Grafana Loki use karte ho toh plain text logs se kaam nahi chalega. **Structured JSON logs** chahiye — taaki indexing ho sake, fields pe filter ho sake.

### Option 1: `logstash-logback-encoder` (tried and tested)

`pom.xml` mein dependency add karo:

```xml
<dependency>
    <groupId>net.logstash.logback</groupId>
    <artifactId>logstash-logback-encoder</artifactId>
    <version>7.4</version>
</dependency>
```

`src/main/resources/logback-spring.xml` banao:

```xml
<configuration>
    <!-- Spring Boot ke default patterns include karo (dev profile ke liye) -->
    <include resource="org/springframework/boot/logging/logback/defaults.xml"/>
    <include resource="org/springframework/boot/logging/logback/console-appender.xml"/>

    <!-- Development mein normal colored console -->
    <springProfile name="dev,local">
        <root level="INFO">
            <appender-ref ref="CONSOLE"/>
        </root>
    </springProfile>

    <!-- Production mein JSON -->
    <springProfile name="prod,staging">
        <appender name="JSON_CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
            <encoder class="net.logstash.logback.encoder.LogstashEncoder">
                <!-- MDC keys automatically include ho jaate hain JSON mein -->
                <includeMdcKeyName>requestId</includeMdcKeyName>
                <includeMdcKeyName>userId</includeMdcKeyName>
                <!-- Custom fields add karo -->
                <customFields>{"app":"my-spring-app","env":"prod"}</customFields>
            </encoder>
        </appender>
        <root level="INFO">
            <appender-ref ref="JSON_CONSOLE"/>
        </root>
    </springProfile>
</configuration>
```

JSON output kuch aisa dikhega:
```json
{
  "@timestamp": "2024-01-15T14:23:01.234+05:30",
  "level": "INFO",
  "logger": "com.example.OrderService",
  "message": "Order placed. orderId=789",
  "requestId": "abc-123-def",
  "userId": "user-456",
  "app": "my-spring-app",
  "env": "prod",
  "thread": "http-nio-8080-exec-1"
}
```

### Option 2: Spring Boot 3.4+ ka Built-in JSON

Agar Spring Boot 3.4+ use kar rahe ho toh aur bhi simple:

```yaml
# application-prod.yml
logging:
  structured:
    format:
      console: ecs       # Elastic Common Schema format
      # ya 'logstash' format
      # ya 'gelf' format (Graylog ke liye)
```

Koi extra dependency nahi — Spring Boot khud handle karta hai.

---

## `logback-spring.xml` — Full Control

Jab `application.yml` se kaam na chale toh `logback-spring.xml` use karo. Ye file `src/main/resources/` mein rakho:

```xml
<configuration>
    <!-- Spring Boot ke defaults include karo -->
    <include resource="org/springframework/boot/logging/logback/defaults.xml"/>
    <include resource="org/springframework/boot/logging/logback/console-appender.xml"/>

    <!-- File appender — rotating logs ke saath -->
    <appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <file>logs/app.log</file>
        <rollingPolicy class="ch.qos.logback.core.rolling.SizeAndTimeBasedRollingPolicy">
            <!-- Har raat naya file, 10MB limit -->
            <fileNamePattern>logs/app-%d{yyyy-MM-dd}.%i.log.gz</fileNamePattern>
            <maxFileSize>10MB</maxFileSize>
            <maxHistory>30</maxHistory>    <!-- 30 din ka history -->
            <totalSizeCap>1GB</totalSizeCap>
        </rollingPolicy>
        <encoder>
            <pattern>%d{yyyy-MM-dd HH:mm:ss.SSS} %-5p [%thread] [%X{requestId:-}] %logger{36} - %m%n%wEx</pattern>
        </encoder>
    </appender>

    <!-- Async appender — performance ke liye (I/O blocking nahi karta main thread ko) -->
    <appender name="ASYNC_FILE" class="ch.qos.logback.classic.AsyncAppender">
        <appender-ref ref="FILE"/>
        <queueSize>512</queueSize>
        <discardingThreshold>0</discardingThreshold>  <!-- 0 = kuch discard mat karo -->
        <neverBlock>false</neverBlock>                <!-- false = queue full pe wait karo -->
    </appender>

    <!-- Development profile -->
    <springProfile name="dev,local">
        <logger name="com.example" level="DEBUG"/>
        <root level="INFO">
            <appender-ref ref="CONSOLE"/>
        </root>
    </springProfile>

    <!-- Production profile -->
    <springProfile name="prod">
        <logger name="com.example" level="INFO"/>
        <logger name="org.hibernate.SQL" level="WARN"/>  <!-- Prod mein SQL mat dikhao -->
        <root level="INFO">
            <appender-ref ref="CONSOLE"/>       <!-- stdout — Kubernetes/Docker ke liye -->
            <appender-ref ref="ASYNC_FILE"/>    <!-- File bhi — traditional servers ke liye -->
        </root>
    </springProfile>
</configuration>
```

> [!warning] `logback.xml` mat use karo — `logback-spring.xml` use karo
> `logback.xml` kaam karta hai, lekin `<springProfile>` aur `<springProperty>` tags support nahi karta. Iska matlab `spring.profiles.active` ke basis pe conditional logging configure nahi kar sakte. HAMESHA `logback-spring.xml` use karo.

---

## Real-World Service Ka Logging Example

Ek complete PaymentService dekho jisme proper logging ka pattern hai:

```java
@Service
@Slf4j
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentGateway gateway;
    private final PaymentRepository repository;

    public PaymentResult processPayment(PaymentRequest request) {
        // ENTRY log — kya aa raha hai
        log.info("payment.initiated customerId={} amount={} currency={}",
                 request.getCustomerId(), request.getAmount(), request.getCurrency());

        long startTime = System.currentTimeMillis();

        try {
            // Validation
            validateRequest(request);
            log.debug("payment.validated customerId={}", request.getCustomerId());

            // Gateway call
            GatewayResponse gatewayResponse = gateway.charge(request);
            log.debug("payment.gateway_response customerId={} gatewayTxnId={}",
                     request.getCustomerId(), gatewayResponse.getTransactionId());

            // Save to DB
            Payment payment = repository.save(buildPayment(request, gatewayResponse));

            long elapsed = System.currentTimeMillis() - startTime;

            // SUCCESS log — structured key=value format — easy to parse
            log.info("payment.success customerId={} paymentId={} amount={} elapsedMs={}",
                    request.getCustomerId(), payment.getId(), payment.getAmount(), elapsed);

            return PaymentResult.success(payment);

        } catch (InvalidRequestException e) {
            // Validation error — user ki galti hai, WARN kaafi hai
            log.warn("payment.invalid_request customerId={} reason={}",
                    request.getCustomerId(), e.getMessage());
            return PaymentResult.failure(e.getMessage());

        } catch (GatewayTimeoutException e) {
            // Timeout — retry ho sakti hai, WARN
            log.warn("payment.gateway_timeout customerId={} elapsedMs={}",
                    request.getCustomerId(), System.currentTimeMillis() - startTime);
            throw e;

        } catch (Exception e) {
            long elapsed = System.currentTimeMillis() - startTime;
            // Unknown error — ERROR, aur exception object hamesha last argument
            log.error("payment.failed customerId={} elapsedMs={}",
                     request.getCustomerId(), elapsed, e);  // 'e' last mein — stack trace aayega
            throw new PaymentProcessingException("Payment failed unexpectedly", e);
        }
    }
}
```

**Notice karo:**
1. `payment.initiated`, `payment.success`, `payment.failed` — event-style naming. Grep karna aasaan ho jaata hai.
2. Structured key=value format — JSON logging mein automatically index ho jaata hai.
3. `elapsedMs` hamesha log karo — performance monitoring ke liye.
4. Exception `e` hamesha last argument — nahi toh stack trace nahi aayega.

---

## Log4j2 Pe Switch Karna

Kuch teams Log4j2 prefer karte hain — uski async logging Logback se faster hai high-throughput systems mein. Switch karna simple hai:

```xml
<!-- pom.xml mein default logging exclude karo -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
    <exclusions>
        <exclusion>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-logging</artifactId>
        </exclusion>
    </exclusions>
</dependency>

<!-- Log4j2 starter add karo -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-log4j2</artifactId>
</dependency>
```

Phir `src/main/resources/log4j2-spring.xml` banao (ya YAML format mein `log4j2-spring.yml`). SLF4J API same rahega — tumhara `log.info(...)` code ek line bhi nahi badlega.

> [!info] Kab switch karein?
> 99% projects ke liye Logback kaafi hai. Log4j2 tab sochna jab genuinely high throughput ho (millions of logs per second) aur async appenders bhi kaafi na hon. Premature optimization mat karo.

---

## Actuator Se Live Log Level Change Karna

Spring Boot Actuator ke saath production mein bina restart ke log level change kar sakte ho:

```xml
<!-- pom.xml -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

```yaml
# application.yml
management:
  endpoints:
    web:
      exposure:
        include: loggers, health, info
  endpoint:
    loggers:
      enabled: true
```

Ab HTTP se log level change karo:

```bash
# Current log levels dekho
curl http://localhost:8080/actuator/loggers

# Specific package ka level dekho
curl http://localhost:8080/actuator/loggers/com.example.payments

# LIVE level change karo — koi restart nahi!
curl -X POST http://localhost:8080/actuator/loggers/com.example.payments \
     -H "Content-Type: application/json" \
     -d '{"configuredLevel": "DEBUG"}'

# Wapas INFO pe laao
curl -X POST http://localhost:8080/actuator/loggers/com.example.payments \
     -H "Content-Type: application/json" \
     -d '{"configuredLevel": "INFO"}'
```

Ye feature production debugging ke liye bahut powerful hai — ek problematic request ke liye DEBUG on karo, issue reproduce karo, logs dekho, wapas INFO pe laao.

> [!warning] Actuator endpoints secure karo
> Production mein Actuator endpoints publicly accessible mat chhodna. Spring Security se protect karo ya sirf internal network pe expose karo.

---

## Gotchas — Jo Galtiyan Har Beginner Karta Hai

> [!warning] Common Mistakes
>
> **1. String concatenation log calls mein**
> ```java
> // GALAT
> log.debug("Order: " + orderId + " for customer: " + customerId);
> // SAHI
> log.debug("Order: {} for customer: {}", orderId, customerId);
> ```
>
> **2. Exception ko string mein convert karna**
> ```java
> // GALAT — stack trace nahi aayega!
> log.error("Payment failed: " + e.getMessage());
> log.error("Payment failed: {}", e.getMessage());
> // SAHI — exception last argument mein
> log.error("Payment failed for orderId={}", orderId, e);
> ```
>
> **3. PII/Passwords log karna**
> ```java
> // KABHI MAT KARO — GDPR violation, security risk
> log.info("User login: email={} password={}", email, password);
> // SAHI
> log.info("User login attempt: email={}", email);
> ```
>
> **4. `System.out.println` production code mein**
> ```java
> System.out.println("DEBUG: order placed");  // GALAT — log levels bypass ho jaate hain
> log.debug("Order placed");                  // SAHI
> ```
>
> **5. `logback.xml` use karna (bina 'spring' ke)**
> `<springProfile>` tags kaam nahi karenge. HAMESHA `logback-spring.xml` use karo.
>
> **6. MDC.clear() bhool jaana**
> ```java
> // Agar clear nahi kiya toh thread pool mein next request ko purana requestId milega
> try {
>     MDC.put("requestId", id);
>     chain.doFilter(req, res);
> } finally {
>     MDC.clear();  // finally mein HAMESHA clear karo
> }
> ```
>
> **7. Do SLF4J implementations classpath pe**
> ```
> SLF4J: Class path contains multiple SLF4J providers.
> ```
> Ye warning dikhti hai toh koi aur logging library aa gayi hai (jaise Log4j2 bhi hai aur Logback bhi). `mvn dependency:tree` se dhundho aur ek exclude karo.
>
> **8. Async appender mein `neverBlock=true` set karna**
> High load mein log lines silently drop ho sakti hain. `neverBlock=false` rakho aur proper queue size set karo.

---

## Node.js/Express Se Comparison

| Feature | Node.js (Pino/Winston) | Spring Boot (SLF4J + Logback) |
|---------|----------------------|-------------------------------|
| Setup | `npm install pino` | Zero config — out of the box |
| API | `logger.info({...}, "msg")` | `log.info("msg {}", value)` |
| Per-class logger | Manual | `LoggerFactory.getLogger(MyClass.class)` |
| Levels | `trace/debug/info/warn/error/fatal` | `TRACE/DEBUG/INFO/WARN/ERROR` |
| Level config | Code ya env var | `application.yml` ya env var |
| JSON output | Pino default hai | Extra config ya dependency |
| Log rotation | `pino-roll` ya `winston-daily-rotate-file` | Logback built-in |
| Request tracing | Manual middleware | MDC + `OncePerRequestFilter` |
| Live level change | — | Actuator `/loggers` endpoint |

---

## Key Takeaways

- **SLF4J = interface, Logback = implementation** — tumhara code SLF4J se baat karta hai, implementation swap ho sakti hai.
- **`{}` placeholders use karo** — string concatenation nahi. Lazy evaluation se performance better hoti hai.
- **Exception hamesha last argument mein do** — `log.error("msg", e)` — nahi toh stack trace nahi aayega.
- **Log levels samjho** — DEBUG development mein, INFO production mein, ERROR sirf serious problems ke liye.
- **MDC use karo request tracing ke liye** — requestId set karo filter mein, poori request trace hogi.
- **Production mein JSON logging setup karo** — ELK/Datadog/Loki ke saath structured logs zaruri hain.
- **`logback-spring.xml` use karo**, `logback.xml` nahi — Spring profile support ke liye.
- **PII aur passwords kabhi mat log karo** — GDPR violation aur security risk.
- **Actuator se live log levels change karo** — production mein restart ke bina debugging possible.
- **Container environments mein file logging mat karo** — stdout pe log karo, centralized system handle karega.

---

## Related
- [[01-What-is-Spring-Boot]]
- [[05-Application-Properties]]
- [[../12-Observability/Tracing]]
- [[../12-Observability/Metrics]]
