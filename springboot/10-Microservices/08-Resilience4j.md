---
tags: [microservices, resilience4j, circuit-breaker, retry]
aliases: [Resilience4j, Circuit Breaker]
stage: advanced
---

# Resilience4j (Circuit Breaker, Retry, Bulkhead, Rate Limit)

> [!info] For the Express/TS dev
> Resilience4j is the Java answer to `opossum`/`cockatiel` — but a fuller suite. It provides circuit breakers, retries, rate limiters, bulkheads (concurrency limits), time limiters, and cache abstractions. It replaced Netflix Hystrix (which is in maintenance). Lightweight, functional API, no external dependencies.

## Concept

A distributed system is unreliable. The five core resilience patterns:

| Pattern | Solves |
|---------|--------|
| **Retry** | Transient failures (network blip, momentary 503) |
| **Circuit Breaker** | Persistent failure — stop calling a downed service to give it time to recover |
| **Bulkhead** | Isolate failure domains — slow service A doesn't exhaust A+B's thread pool |
| **Rate Limiter** | Don't exceed downstream's quota (or your own) |
| **Time Limiter** | Cap how long an operation can take |

You **compose** them: retry inside a circuit breaker inside a time limiter, etc.

### Circuit breaker states

```
            failures > threshold
   CLOSED ──────────────────────► OPEN
     ▲                              │
     │ success                      │ wait duration
     │                              ▼
   HALF_OPEN ◄─── (test calls) ─────┘
```

- **CLOSED** — normal traffic.
- **OPEN** — calls fail fast (don't even hit the network).
- **HALF_OPEN** — let a few test calls through; if they succeed, close.

## Code example

### Setup

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-circuitbreaker-resilience4j</artifactId>
</dependency>
<dependency>
    <groupId>io.github.resilience4j</groupId>
    <artifactId>resilience4j-spring-boot3</artifactId>
</dependency>
```

### YAML config (the typical way)

```yaml
resilience4j:
  circuitbreaker:
    instances:
      paymentClient:
        register-health-indicator: true
        sliding-window-type: COUNT_BASED
        sliding-window-size: 20
        minimum-number-of-calls: 10
        failure-rate-threshold: 50           # %
        slow-call-rate-threshold: 80
        slow-call-duration-threshold: 2s
        wait-duration-in-open-state: 30s
        permitted-number-of-calls-in-half-open-state: 3
        automatic-transition-from-open-to-half-open-enabled: true

  retry:
    instances:
      paymentClient:
        max-attempts: 3
        wait-duration: 500ms
        retry-exceptions:
          - java.io.IOException
          - org.springframework.web.client.HttpServerErrorException
        ignore-exceptions:
          - com.example.BadRequestException
        exponential-backoff-multiplier: 2

  ratelimiter:
    instances:
      paymentClient:
        limit-for-period: 100
        limit-refresh-period: 1s
        timeout-duration: 0

  bulkhead:
    instances:
      paymentClient:
        max-concurrent-calls: 25
        max-wait-duration: 100ms

  timelimiter:
    instances:
      paymentClient:
        timeout-duration: 4s
        cancel-running-future: true
```

### Annotation usage

```java
@Service
class PaymentService {

    private final PaymentClient client;

    PaymentService(PaymentClient c) { this.client = c; }

    @CircuitBreaker(name = "paymentClient", fallbackMethod = "chargeFallback")
    @Retry(name = "paymentClient")
    @RateLimiter(name = "paymentClient")
    @Bulkhead(name = "paymentClient")
    @TimeLimiter(name = "paymentClient")
    public CompletableFuture<String> charge(int amount) {
        return CompletableFuture.supplyAsync(() -> client.charge(amount));
    }

    // Fallback signatures must match: same params + extra throwable arg
    public CompletableFuture<String> chargeFallback(int amount, Throwable t) {
        log.warn("Falling back for amount={} cause={}", amount, t.toString());
        return CompletableFuture.completedFuture("DEFERRED");
    }

    // Specific fallbacks per exception (most-specific wins)
    public CompletableFuture<String> chargeFallback(int amount, CallNotPermittedException t) {
        return CompletableFuture.completedFuture("CIRCUIT_OPEN");
    }
}
```

### Functional API (no annotations)

```java
@Service
class PaymentService {
    private final PaymentClient client;
    private final CircuitBreaker breaker;
    private final Retry retry;

    PaymentService(PaymentClient c, CircuitBreakerRegistry cbReg, RetryRegistry rReg) {
        this.client = c;
        this.breaker = cbReg.circuitBreaker("paymentClient");
        this.retry = rReg.retry("paymentClient");
    }

    public String charge(int amount) {
        Supplier<String> call = () -> client.charge(amount);

        Supplier<String> decorated = Decorators.ofSupplier(call)
            .withRetry(retry)
            .withCircuitBreaker(breaker)
            .withFallback(List.of(CallNotPermittedException.class),
                ex -> "CIRCUIT_OPEN")
            .decorate();

        return decorated.get();
    }
}
```

### Events / metrics

```java
breaker.getEventPublisher()
    .onStateTransition(e -> log.info("CB: {} → {}",
        e.getStateTransition().getFromState(),
        e.getStateTransition().getToState()))
    .onError(e -> log.warn("CB error: {}", e.getThrowable().toString()));
```

Metrics auto-exposed via Micrometer:

```
resilience4j_circuitbreaker_state{name="paymentClient",state="closed"}
resilience4j_circuitbreaker_calls_total{name="paymentClient",kind="successful"}
resilience4j_retry_calls_total{name="paymentClient",kind="successful_with_retry"}
```

Plug into Prometheus + Grafana.

### Health indicator

With `register-health-indicator: true`, `/actuator/health` shows:

```json
{
  "components": {
    "circuitBreakers": {
      "status": "UP",
      "details": {
        "paymentClient": {
          "status": "UP",
          "details": { "failureRate": "0.0%", "state": "CLOSED" }
        }
      }
    }
  }
}
```

### Composition order matters

The decoration order from outer to inner is typically:

```
Bulkhead → TimeLimiter → CircuitBreaker → Retry → RateLimiter → operation
```

Why: retries should be inside the circuit breaker (otherwise retries can keep an open circuit closed); rate limiter sits closest to the operation.

The `@Decorators` builder applies in chain order — read the docs carefully.

### Tuning hints

- `failure-rate-threshold: 50` — open when 50% of recent calls fail. Too low → flapping; too high → slow to react.
- `sliding-window-size: 20` — how many calls/seconds to consider. Bigger = stabler, slower.
- `minimum-number-of-calls: 10` — don't open the breaker on a tiny sample.
- `wait-duration-in-open-state: 30s` — how long to stay open before testing again.

## Express/Node comparison

```typescript
// opossum
import CircuitBreaker from "opossum";

const breaker = new CircuitBreaker(charge, {
  timeout: 4000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
});
breaker.fallback(() => "DEFERRED");

await breaker.fire(amount);
```

| Resilience4j | Node |
|--------------|------|
| `@CircuitBreaker` | `opossum` |
| `@Retry` | `axios-retry`, `cockatiel` |
| `@RateLimiter` | `bottleneck`, `p-limit` |
| `@Bulkhead` | `p-limit` (semaphore) |
| `@TimeLimiter` | `Promise.race([call, timeout])` |
| `Decorators.of...` | `cockatiel` policy composition |
| Micrometer metrics | manual + Prom client |

`cockatiel` is the closest design-cousin of Resilience4j in Node.

## Gotchas

> [!warning] `@CircuitBreaker` on async methods
> If your method returns `CompletableFuture` or reactive types, the breaker must be configured for that. Use `@TimeLimiter` to cap async waits — without it, the breaker only sees synchronous failures.

> [!danger] Retrying non-idempotent ops
> See [[../11-Messaging/05-Idempotency-and-Retries]]. Retrying a `POST /charge` can charge twice. Use idempotency keys.

> [!warning] Fallbacks shouldn't fail
> If your fallback throws, the original failure plus the fallback failure both surface — confusing logs. Keep fallbacks simple (return cached, queue for later, return default).

> [!warning] Self-call doesn't trigger annotations
> Same proxy issue as `@Transactional`. Inject the bean, don't call sibling methods directly.

> [!tip] Don't wrap everything
> Wrapping every method with retries + breakers adds latency and complexity. Pick the **boundaries** — outbound calls to other services and external APIs.

> [!tip] Combine with the Outbox Pattern for write paths
> If your operation is "save → call external," resilience patterns help reads but writes need [[11-Outbox-Pattern]] for true durability.

## Related
- [[06-Inter-Service-Communication]]
- [[07-OpenFeign]]
- [[09-Distributed-Tracing]]
- [[11-Outbox-Pattern]]
- [[../11-Messaging/05-Idempotency-and-Retries]]
