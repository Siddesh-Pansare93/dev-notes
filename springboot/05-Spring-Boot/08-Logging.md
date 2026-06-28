---
tags:
  - spring-boot
  - logging
  - logback
  - slf4j
aliases:
  - Logging
  - Logback
  - SLF4J
stage: intermediate
---

# Logging

> [!info] For the Express/TS dev
> No more `console.log`. Spring Boot ships with **SLF4J** (the API) and **Logback** (the implementation) — Pino-class structured logging out of the box. You declare a logger per class, write `log.info("...")`, and configure levels in `application.yml`. Production wins: log levels per package, JSON output, async appenders, no rebuild required.

## SLF4J + Logback in 30 seconds

- **SLF4J** = the *facade* (the API you import). Equivalent: `pino`'s API.
- **Logback** = the *implementation* (the engine writing to console/files). Equivalent: pino's transport.

You always write against SLF4J; the implementation can be swapped (Log4j2, JUL) without changing your code.

## A logger in your class

```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);

    public void place(Order o) {
        log.debug("Placing order {}", o.id());           // {} placeholders, lazy
        try {
            // ...
            log.info("Order {} placed for {}", o.id(), o.customerId());
        } catch (Exception e) {
            log.error("Order {} failed", o.id(), e);     // exception as last arg
        }
    }
}
```

> [!tip] Use Lombok's `@Slf4j` to skip the boilerplate
> ```java
> @Slf4j
> @Service
> public class OrderService {
>     public void place(Order o) {
>         log.info("Placing order {}", o.id());
>     }
> }
> ```
> Generates the `private static final Logger log = ...` field.

## The `{}` placeholder rule

```java
log.info("user " + userId + " did " + action);   // BAD: string concat always runs
log.info("user {} did {}", userId, action);      // GOOD: lazy, only formatted if level enabled
```

For very expensive arguments, guard with `isDebugEnabled()` or pass a `Supplier`:

```java
if (log.isDebugEnabled()) {
    log.debug("Big object: {}", expensiveDump());
}
```

## Configuring levels

Without writing any XML:

```yaml
# application.yml
logging:
  level:
    root: INFO                          # default for everything
    org.springframework.web: DEBUG      # framework debug
    com.example.app: DEBUG              # your code debug
    org.hibernate.SQL: DEBUG            # show SQL
    org.hibernate.orm.jdbc.bind: TRACE  # show parameters bound to SQL
```

Levels (most → least verbose): `TRACE > DEBUG > INFO > WARN > ERROR > OFF`.

> [!tip] Per-package levels are gold
> "Just turn on `DEBUG` for `com.example.payments` in staging" — without redeploy, via env var:
> ```
> LOGGING_LEVEL_COM_EXAMPLE_PAYMENTS=DEBUG
> ```

## Log file output

```yaml
logging:
  file:
    name: logs/app.log              # write to file (in addition to console)
  pattern:
    file: "%d %-5level [%thread] %logger - %msg%n"
  logback:
    rollingpolicy:
      max-file-size: 10MB
      max-history: 30
```

## Log format & color

```yaml
logging:
  pattern:
    console: "%clr(%d{HH:mm:ss.SSS}){faint} %clr(%-5p) %clr(%logger{36}){cyan} %clr(:){faint} %m%n%wEx"
```

Spring Boot's default console pattern includes color, timestamps, thread, logger, and full stack traces — leave it alone unless you need JSON.

## JSON logging for production

For ELK/Datadog/Loki, structured JSON is king. Two paths:

### Option 1: `logstash-logback-encoder`

```xml
<dependency>
    <groupId>net.logstash.logback</groupId>
    <artifactId>logstash-logback-encoder</artifactId>
    <version>7.4</version>
</dependency>
```

Then `src/main/resources/logback-spring.xml`:

```xml
<configuration>
    <springProfile name="prod">
        <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
            <encoder class="net.logstash.logback.encoder.LogstashEncoder"/>
        </appender>
        <root level="INFO">
            <appender-ref ref="STDOUT"/>
        </root>
    </springProfile>
</configuration>
```

### Option 2: built-in (Spring Boot 3.4+)

```yaml
logging:
  structured:
    format:
      console: ecs                    # or 'logstash', or 'gelf'
```

## MDC: per-request context

**MDC** (Mapped Diagnostic Context) is a thread-local key-value store that every log line includes automatically. Perfect for request IDs.

```java
@Component
public class RequestIdFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws IOException, ServletException {
        try {
            String id = Optional.ofNullable(req.getHeader("X-Request-Id"))
                                .orElse(UUID.randomUUID().toString());
            MDC.put("requestId", id);
            chain.doFilter(req, res);
        } finally {
            MDC.clear();
        }
    }
}
```

Reference in pattern:

```yaml
logging:
  pattern:
    console: "%d %-5p [%X{requestId:-}] %logger - %m%n"
```

## logback-spring.xml: full custom config

When YAML isn't enough, drop in `src/main/resources/logback-spring.xml`:

```xml
<configuration>
    <include resource="org/springframework/boot/logging/logback/defaults.xml"/>
    <include resource="org/springframework/boot/logging/logback/console-appender.xml"/>

    <appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <file>logs/app.log</file>
        <rollingPolicy class="ch.qos.logback.core.rolling.SizeAndTimeBasedRollingPolicy">
            <fileNamePattern>logs/app-%d{yyyy-MM-dd}.%i.log.gz</fileNamePattern>
            <maxFileSize>10MB</maxFileSize>
            <maxHistory>30</maxHistory>
        </rollingPolicy>
        <encoder>
            <pattern>%d %-5p [%thread] %logger{36} - %m%n%wEx</pattern>
        </encoder>
    </appender>

    <springProfile name="dev">
        <root level="INFO">
            <appender-ref ref="CONSOLE"/>
        </root>
    </springProfile>

    <springProfile name="prod">
        <root level="INFO">
            <appender-ref ref="CONSOLE"/>
            <appender-ref ref="FILE"/>
        </root>
    </springProfile>
</configuration>
```

> [!tip] Use `logback-spring.xml`, not `logback.xml`
> Only `logback-spring.xml` supports `<springProfile>` and `<springProperty>` tags.

## Switching to Log4j2

Some teams prefer Log4j2 (async logger is faster).

```xml
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
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-log4j2</artifactId>
</dependency>
```

Drop a `log4j2-spring.xml` in `src/main/resources`.

## Code example: a service with proper logging

```java
@Service
@Slf4j
public class PaymentService {

    public PaymentResult charge(Charge c) {
        log.info("charge.start id={} amount={}", c.id(), c.amount());
        long start = System.nanoTime();
        try {
            var result = gateway.charge(c);
            log.info("charge.ok id={} elapsedMs={}", c.id(),
                     (System.nanoTime() - start) / 1_000_000);
            return result;
        } catch (GatewayException e) {
            log.warn("charge.retryable id={} reason={}", c.id(), e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("charge.fatal id={}", c.id(), e);
            throw new PaymentFailedException(c.id(), e);
        }
    }
}
```

## Gotchas

> [!warning] Common pitfalls
> - **String concatenation in log calls** — see "placeholder rule" above.
> - **Logging passwords / PII** — easy to do, hard to undo. Sanitize, hash, or omit.
> - **`System.out.println`** in production code — bypasses log levels and structured output. Banned.
> - **`logback.xml` instead of `logback-spring.xml`** — works, but Spring profile tags won't.
> - **Two SLF4J implementations on classpath** → "multiple bindings" warning, undefined behavior. Exclude one.
> - **`log.error("Failed: " + e)`** swallows the stack trace. Always pass exception as the last argument: `log.error("Failed", e)`.
> - **Async appenders without flushing** can lose lines on crash. Configure `neverBlock=false` and a small queue.

## Related
- [[01-What-is-Spring-Boot]]
- [[05-Application-Properties]]
- [[../12-Observability/Tracing]]
- [[../12-Observability/Metrics]]
