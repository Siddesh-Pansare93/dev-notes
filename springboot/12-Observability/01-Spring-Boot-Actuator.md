---
tags: [observability, actuator, spring-boot, monitoring]
aliases: [Actuator, Spring Actuator]
stage: intermediate
---

# Spring Boot Actuator

> [!info] For the Express/TS dev
> Actuator is like a built-in `/health`, `/metrics`, `/info` middleware suite — but production-grade and standardized. In Express you'd hand-roll these endpoints or pull in `express-prom-bundle`, `terminus`, etc. Spring Boot ships them as a single dependency.

## What it is

`spring-boot-starter-actuator` exposes management and monitoring endpoints over HTTP (and JMX) so you can introspect a running app. Endpoints cover health, metrics, environment, configuration, thread dumps, heap dumps, loggers, and more.

## Add it

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

By default, only `/actuator/health` is exposed over HTTP. Everything else is opt-in.

## Configure exposure

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus,loggers
        # or: "*" to expose all (NOT for production!)
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

## Common endpoints

| Endpoint | Purpose |
|----------|---------|
| `/actuator/health` | Aggregate health status (UP/DOWN) |
| `/actuator/health/liveness` | K8s liveness probe |
| `/actuator/health/readiness` | K8s readiness probe |
| `/actuator/info` | Build/git/custom info |
| `/actuator/metrics` | Metric names list |
| `/actuator/metrics/{name}` | Specific metric |
| `/actuator/prometheus` | Prometheus scrape endpoint |
| `/actuator/loggers` | View/change log levels at runtime |
| `/actuator/env` | Environment properties |
| `/actuator/configprops` | `@ConfigurationProperties` beans |
| `/actuator/threaddump` | Thread dump (debugging deadlocks) |
| `/actuator/heapdump` | Download a heap dump |
| `/actuator/mappings` | All `@RequestMapping`s |
| `/actuator/beans` | Spring container's beans |

## Health indicators

Built-in indicators auto-register based on classpath: `DataSource`, `Redis`, `MongoDB`, `RabbitMQ`, `DiskSpace`, etc.

Custom one:

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

## /info contributors

Add build info via Maven plugin:

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

Now `/actuator/info` exposes `build.version`, `build.time`, etc.

## Change log levels at runtime

```bash
curl -X POST http://localhost:8080/actuator/loggers/com.example.api \
  -H 'Content-Type: application/json' \
  -d '{"configuredLevel":"DEBUG"}'
```

> [!tip] Production tip
> Put Actuator endpoints on a different port and bind it to the internal network only:
> ```yaml
> management:
>   server:
>     port: 9090
>     address: 127.0.0.1
> ```

## Security

Actuator endpoints are sensitive! Always:
- Restrict via Spring Security ([[01-Spring-Security-Basics]])
- Use a separate management port
- Never expose `/heapdump`, `/env`, `/configprops` publicly

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

## Related
- [[02-Micrometer-Metrics]]
- [[05-Health-Checks-and-Readiness]]
- [[03-Logging-Best-Practices]]
- [[04-Distributed-Tracing]]
- [[01-Spring-Security-Basics]]
