---
tags: [observability, metrics, micrometer, prometheus]
aliases: [Micrometer, Metrics]
stage: intermediate
---

# Micrometer Metrics

> [!info] For the Express/TS dev
> Micrometer is the **SLF4J of metrics** — a vendor-neutral facade. You write code against `MeterRegistry`, and a backend (Prometheus, Datadog, New Relic, Graphite, CloudWatch) collects them. In Node, you'd use `prom-client` directly, tied to one backend.

## What it is

Micrometer is the metrics library Spring Boot uses out of the box. Add a registry implementation, and metrics flow automatically.

## Setup with Prometheus

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-registry-prometheus</artifactId>
</dependency>
```

Expose the endpoint:

```yaml
management:
  endpoints:
    web:
      exposure:
        include: prometheus,health,info
  metrics:
    tags:
      application: ${spring.application.name}
      env: ${spring.profiles.active:default}
```

Now `/actuator/prometheus` returns scrapeable metrics.

## Auto-instrumented metrics

Out of the box you get:
- JVM (heap, GC, threads, classes loaded)
- System (CPU, file descriptors)
- HTTP server (`http.server.requests` — latency, count, status)
- DataSource (HikariCP pool stats)
- Logback events
- Tomcat sessions
- Cache hit ratios (Caffeine, Ehcache)

## Meter types

| Type | Purpose | Example |
|------|---------|---------|
| `Counter` | Monotonically increasing | requests handled, errors |
| `Gauge` | Current value | queue size, active users |
| `Timer` | Duration + count | request latency |
| `DistributionSummary` | Size distribution | payload sizes |
| `LongTaskTimer` | In-flight long-running tasks | running jobs |

## Custom metrics

```java
@Service
@RequiredArgsConstructor
public class OrderService {
    private final MeterRegistry registry;
    private final Counter ordersPlaced;

    public OrderService(MeterRegistry registry) {
        this.registry = registry;
        this.ordersPlaced = Counter.builder("orders.placed")
            .description("Total orders placed")
            .tag("region", "us-east")
            .register(registry);
    }

    public Order place(NewOrder cmd) {
        Timer.Sample sample = Timer.start(registry);
        try {
            Order o = doPlace(cmd);
            ordersPlaced.increment();
            return o;
        } finally {
            sample.stop(registry.timer("orders.place.duration", "outcome", "success"));
        }
    }
}
```

## Annotation-based timing

```java
@Timed(value = "orders.place", percentiles = {0.5, 0.95, 0.99})
public Order place(NewOrder cmd) { ... }
```

Requires `@EnableAspectJAutoProxy` and `micrometer-aop`.

## Common tags

> [!warning] Cardinality matters
> Never tag with high-cardinality values (user IDs, request IDs, full URLs). It explodes the metric storage. Tag with status code, method, route template, region.

## Prometheus scrape config

```yaml
scrape_configs:
  - job_name: 'spring-boot'
    metrics_path: '/actuator/prometheus'
    static_configs:
      - targets: ['app:8080']
```

## Grafana dashboards

Import community dashboards by ID:
- **JVM (Micrometer)**: 4701
- **Spring Boot 2.x System Monitor**: 11378

## Histogram percentiles

```yaml
management:
  metrics:
    distribution:
      percentiles-histogram:
        http.server.requests: true
      percentiles:
        http.server.requests: 0.5, 0.95, 0.99
      slo:
        http.server.requests: 50ms, 100ms, 200ms, 500ms
```

## Related
- [[01-Spring-Boot-Actuator]]
- [[04-Distributed-Tracing]]
- [[05-Health-Checks-and-Readiness]]
- [[03-Logging-Best-Practices]]
