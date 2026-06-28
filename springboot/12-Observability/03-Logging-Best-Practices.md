---
tags: [observability, logging, logback, slf4j, mdc]
aliases: [Logging, Structured Logging]
stage: intermediate
---

# Logging Best Practices

> [!info] For the Express/TS dev
> SLF4J is your `winston`/`pino` interface. Logback is the default implementation. Spring Boot wires Logback by default. JSON logs + MDC (Mapped Diagnostic Context) gives you the same correlation-ID workflow as `pino-http` + `cls-hooked`.

## The stack

- **SLF4J** — facade (the API you log against)
- **Logback** — default implementation in Spring Boot
- **MDC** — thread-local key/value bag attached to every log event

## Get a logger

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

Without Lombok:

```java
private static final Logger log = LoggerFactory.getLogger(OrderService.class);
```

## Levels (in order)

`TRACE < DEBUG < INFO < WARN < ERROR`

Set in `application.yml`:

```yaml
logging:
  level:
    root: INFO
    com.example: DEBUG
    org.hibernate.SQL: DEBUG
    org.springframework.web: INFO
```

## Parameterized messages — never concatenate

```java
// BAD: builds the string even when DEBUG is off
log.debug("Loaded user " + user.getName() + " with " + orders.size() + " orders");

// GOOD: SLF4J defers formatting until level check passes
log.debug("Loaded user {} with {} orders", user.getName(), orders.size());
```

## Structured (JSON) logs with Logback

Add `logstash-logback-encoder`:

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

Spring Boot 3.4+ has built-in JSON support:

```yaml
logging:
  structured:
    format:
      console: ecs   # or logstash, gelf
```

## MDC — correlation IDs

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

Now every log line within a request carries `correlationId`. With Micrometer Tracing ([[04-Distributed-Tracing]]), `traceId` and `spanId` populate MDC automatically.

## What to log

> [!tip] Logging hygiene
> - Log at **boundaries** (HTTP in/out, DB calls, external APIs)
> - Include the **why** (intent, user action) — not just data dumps
> - Use **WARN** for recoverable problems, **ERROR** with stack trace for failures
> - Never log secrets, PII, full request bodies, JWTs, passwords
> - Don't log inside tight loops

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

## File rotation (rare in containers)

In Kubernetes, log to stdout/stderr — let the platform handle rotation. Locally:

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

## Related
- [[04-Distributed-Tracing]]
- [[01-Spring-Boot-Actuator]]
- [[02-Micrometer-Metrics]]
- [[02-Lombok]]
