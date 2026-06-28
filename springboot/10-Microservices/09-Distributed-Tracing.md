---
tags: [microservices, tracing, observability, micrometer, zipkin, jaeger]
aliases: [Distributed Tracing, Tracing]
stage: advanced
---

# Distributed Tracing

> [!info] For the Express/TS dev
> When a request flows through 6 services, you need a way to see the **whole** path. Distributed tracing solves this — every request gets a `traceId`, each hop gets a `spanId`, and a backend (Zipkin/Jaeger/Tempo) stitches them into a flame graph. In Spring, the modern stack is **Micrometer Tracing** (replaced Spring Cloud Sleuth) feeding **OpenTelemetry** to your tracing backend.

## Concept

Three core terms:

- **Trace** — the entire journey of a single request across services. Identified by `traceId`.
- **Span** — one unit of work (an HTTP call, a DB query, a Kafka publish). Has its own `spanId`, links to a parent span.
- **Context propagation** — sending `traceId/spanId` from caller to callee, usually via HTTP headers (`traceparent` per W3C, or `b3` per Zipkin) or message headers.

A trace looks like:

```
Trace abc123:
  Span 1 (gateway):           ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 320ms
   └─ Span 2 (order-service): ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 240ms
       ├─ Span 3 (DB):        ▓▓▓ 30ms
       ├─ Span 4 (payment):   ▓▓▓▓▓▓▓▓▓ 110ms
       └─ Span 5 (kafka send):▓▓ 20ms
```

### The Spring stack today

- **Micrometer** — metrics API.
- **Micrometer Tracing** — tracing API (replaces Spring Cloud Sleuth).
- **Bridges** — Brave (Zipkin) or OpenTelemetry — pick one.
- **Exporter** — sends spans to backend (Zipkin, Jaeger, Tempo, OTLP).
- **Backend** — stores and visualizes (Zipkin UI, Jaeger UI, Grafana Tempo, Honeycomb, Datadog).

```
[Your code] → Micrometer Tracing API → Brave or OTel SDK → exporter → Backend
```

## Code example

### Setup with OpenTelemetry → Zipkin

```xml
<!-- Required -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>

<!-- Tracing core -->
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-tracing-bridge-otel</artifactId>
</dependency>

<!-- Send to Zipkin -->
<dependency>
    <groupId>io.opentelemetry</groupId>
    <artifactId>opentelemetry-exporter-zipkin</artifactId>
</dependency>
```

```yaml
spring:
  application:
    name: order-service

management:
  tracing:
    sampling:
      probability: 1.0          # 100% in dev; lower in prod (e.g. 0.05)
  zipkin:
    tracing:
      endpoint: http://zipkin:9411/api/v2/spans
```

For Jaeger, swap the exporter for `opentelemetry-exporter-jaeger` (or use OTLP everywhere).

### Auto-instrumentation (you get this free)

Spring Boot auto-instruments:
- Incoming HTTP (filters)
- Outgoing HTTP (`RestTemplate`, `WebClient`, `RestClient`, OpenFeign)
- JDBC queries
- Kafka producer/consumer
- RabbitMQ
- Reactor flows
- `@Scheduled` tasks

So with the dependencies above, every HTTP request through your gateway → service → service → DB is automatically traced. No annotations needed.

### Adding custom spans

```java
@Service
class CheckoutService {

    private final Tracer tracer;

    CheckoutService(Tracer tracer) { this.tracer = tracer; }

    public Order checkout(Cart cart) {
        Span span = tracer.nextSpan().name("checkout.process");
        try (Tracer.SpanInScope ws = tracer.withSpan(span.start())) {
            span.tag("cart.size", cart.size());
            span.tag("customer.id", cart.customerId());

            var order = doCheckout(cart);
            span.tag("order.id", order.id().toString());
            return order;
        } catch (Exception e) {
            span.error(e);
            throw e;
        } finally {
            span.end();
        }
    }
}
```

### `@Observed` — annotation-based custom spans

```java
@Observed(name = "checkout.process",
          contextualName = "checkout-process",
          lowCardinalityKeyValues = { "currency", "USD" })
public Order checkout(Cart cart) { /* ... */ }
```

Requires `aspectjweaver` and an `ObservedAspect` bean:

```java
@Bean
ObservedAspect observedAspect(ObservationRegistry r) {
    return new ObservedAspect(r);
}
```

### Logging trace IDs

Configure your log pattern to include `traceId` and `spanId`:

```yaml
logging:
  pattern:
    level: "%5p [${spring.application.name:},%X{traceId:-},%X{spanId:-}]"
```

Example output:

```
2024-01-12 10:23:01 INFO  [order-service,abc123def456,789def]  com.example.OrderController : received request
```

Now if you have logs from 5 services, you can grep for `abc123def456` and see the entire request journey across all of them. **This alone is worth setting up tracing.**

### Propagating across messaging

Kafka and RabbitMQ instrumentation auto-propagate via headers:

```java
// Producer
kafkaTemplate.send("orders.placed", payload);  // traceparent header added automatically

// Consumer — context restored before listener method runs
@KafkaListener(topics = "orders.placed")
void on(OrderPlaced ev) {
    log.info("processing"); // logged with the trace ID from the producer
}
```

### Sampling strategies

```yaml
management:
  tracing:
    sampling:
      probability: 0.1   # 10% — typical for prod
```

For high-traffic systems:
- **Head-based sampling** — decide at trace start. Cheap, can miss errors.
- **Tail-based sampling** — decide after; sample errors and slow ones at 100%, others lower. Needs a collector (OTel Collector, Tempo).

## Express/Node comparison

```typescript
// OpenTelemetry SDK in Node
import { NodeSDK } from "@opentelemetry/sdk-node";
import { ZipkinExporter } from "@opentelemetry/exporter-zipkin";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";

new NodeSDK({
  traceExporter: new ZipkinExporter({ url: "http://zipkin:9411/api/v2/spans" }),
  instrumentations: [getNodeAutoInstrumentations()],
}).start();
```

| Spring | Node |
|--------|------|
| Micrometer Tracing | OpenTelemetry SDK |
| Auto-instrumentation via Boot | `@opentelemetry/auto-instrumentations-node` |
| `@Observed` | `tracer.startActiveSpan(...)` manual |
| `traceId/spanId` in logs via MDC | `trace_id` in pino/winston via OTel hooks |
| Zipkin/Jaeger/Tempo backends | (same — backends are language-agnostic) |

OpenTelemetry is the de-facto standard in both ecosystems. Spring's Micrometer Tracing is essentially a Spring-friendly wrapper around it.

## Gotchas

> [!warning] Sampling probability in prod
> 100% sampling at 10k RPS = millions of spans per minute. Use 1-5% in prod, 100% for errors via tail-sampling, or your tracing bill explodes.

> [!warning] Trace context lost across async boundaries
> Manually creating a `Thread`, `ExecutorService`, or non-instrumented async lib drops the context. Use `Context.taskWrapping(executor)` or instrument carefully. Reactor and `@Async` are mostly handled.

> [!danger] PII in span tags
> `span.tag("email", user.email())` stores PII in your tracing backend forever. Be careful — most backends weren't designed as compliant data stores.

> [!warning] Brave vs OTel
> Spring supports either. Don't mix — pick the OTel bridge for new projects (industry direction).

> [!tip] Trace IDs in logs is 80% of the value
> Even before you set up a fancy tracing UI, just having `traceId` in every log line transforms debugging. Do this first.

> [!tip] Service map ≠ tracing
> A service map (who calls whom) can be derived from traces, but service meshes give you that for free. Tracing's value is timing + flame graphs.

## Related
- [[06-Inter-Service-Communication]]
- [[08-Resilience4j]]
- [[12-Service-Mesh-vs-Library]]
- [[../12-Observability/03-Distributed-Tracing|Observability section]]
- [[../12-Observability/01-Logging|Structured logging]]
