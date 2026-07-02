# Resilience4j (Circuit Breaker, Retry, Bulkhead, Rate Limit)

> [!info] Express/TS dev ke liye
> Resilience4j Java duniya ka `opossum`/`cockatiel` hai — bas zyada bada aur complete package. Isme circuit breaker, retry, rate limiter, bulkhead (concurrency limit), time limiter, aur cache abstractions sab milte hain ek hi jagah. Yeh Netflix Hystrix ka replacement hai (Hystrix ab maintenance mode mein hai, koi naya feature nahi aa raha). Lightweight hai, functional API hai, aur koi external dependency nahi chahiye.

## Concept

Kya hota hai? Socho tum Zomato ka backend chala rahe ho, aur tumhara "Payment Service" kisi third-party payment gateway (Razorpay jaisa) ko call karta hai. Ab agar Razorpay ka server thoda slow ho gaya, ya down ho gaya, toh kya hoga? Agar tum blindly retry karte raho ya wait karte raho, tumhara pura system jam ho jayega — jaise Swiggy ki app crash ho jaye kyunki restaurant ka POS system slow chal raha hai.

Distributed system fundamentally unreliable hote hain — network fail hoga, koi service down hogi, koi slow response dega. Isko handle karne ke liye 5 core resilience patterns hain:

| Pattern | Kya Solve Karta Hai |
|---------|--------|
| **Retry** | Temporary glitch — network mein ek pal ke liye blip aaya, ya 503 aaya |
| **Circuit Breaker** | Service permanently down hai — usko baar baar call karke pareshan mat karo, thoda time do recover karne ke liye |
| **Bulkhead** | Failure domains alag rakho — agar Service A slow hai toh uska thread pool Service B ka thread pool na khaye |
| **Rate Limiter** | Downstream service ka quota cross mat karo (ya apna khud ka bhi) |
| **Time Limiter** | Ek operation zyada der tak na chale, cap laga do |

Inko tum **compose** kar sakte ho — jaise ek retry, circuit breaker ke andar ho, aur woh time limiter ke andar ho. Layer pe layer.

### Circuit breaker ke states

Socho circuit breaker ek ghar ke MCB (mini circuit breaker) jaisa hai jo overload hone par trip ho jata hai:

```
            failures > threshold
   CLOSED ──────────────────────► OPEN
     ▲                              │
     │ success                      │ wait duration
     │                              ▼
   HALF_OPEN ◄─── (test calls) ─────┘
```

- **CLOSED** — sab normal hai, traffic bina rukawat ke ja raha hai.
- **OPEN** — calls fail-fast ho jaati hain, matlab network tak jaate hi nahi. Jaise tumne dekha ki dukaan band hai toh andar jaake dekhne ki zaroorat nahi.
- **HALF_OPEN** — thodi der baad kuch test calls jaane deta hai. Agar woh successful hain, breaker phir se CLOSED ho jata hai. Agar fail hote hain, wapas OPEN.

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

### YAML config (sabse common tarika)

Kyun zaruri hai YAML config? Kyunki har external service ka behavior alag hota hai — Razorpay ka timeout, IRCTC ka timeout, alag alag hoga. Isliye per-instance configuration deni padti hai:

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

Ab code mein use kaise karein? Bas annotation lagao method ke upar, Spring baaki magic khud kar dega — bilkul waise jaise `@Transactional` kaam karta hai (proxy ke through):

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

    // Fallback signature match hona chahiye: same params + ek extra throwable arg
    public CompletableFuture<String> chargeFallback(int amount, Throwable t) {
        log.warn("Falling back for amount={} cause={}", amount, t.toString());
        return CompletableFuture.completedFuture("DEFERRED");
    }

    // Specific fallback har exception ke liye alag ho sakta hai (most-specific wala jeetega)
    public CompletableFuture<String> chargeFallback(int amount, CallNotPermittedException t) {
        return CompletableFuture.completedFuture("CIRCUIT_OPEN");
    }
}
```

Yahaan `chargeFallback` woh method hai jo tab call hota hai jab `charge()` fail ho jaaye — bilkul jaise UPI payment fail hone pe app "Retry later" ka message dikhati hai, crash nahi hoti.

### Functional API (bina annotations ke)

Agar tumhe annotations pasand nahi, ya conditional logic chahiye, toh functional style bhi available hai — yeh `cockatiel` ke policy composition jaisa lagta hai Node walo ko:

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

Kyun zaruri hai? Kyunki production mein tumhe pata chalna chahiye ki circuit breaker kab OPEN hua, kab CLOSE hua — warna tum blind fly kar rahe ho:

```java
breaker.getEventPublisher()
    .onStateTransition(e -> log.info("CB: {} → {}",
        e.getStateTransition().getFromState(),
        e.getStateTransition().getToState()))
    .onError(e -> log.warn("CB error: {}", e.getThrowable().toString()));
```

Metrics automatically Micrometer ke through expose ho jaate hain:

```
resilience4j_circuitbreaker_state{name="paymentClient",state="closed"}
resilience4j_circuitbreaker_calls_total{name="paymentClient",kind="successful"}
resilience4j_retry_calls_total{name="paymentClient",kind="successful_with_retry"}
```

Inko Prometheus + Grafana mein plug kar sakte ho — jaise ek dashboard jo tumhe live batata hai "paymentClient" breaker kis state mein hai, bilkul flight tracker ki tarah.

### Health indicator

`register-health-indicator: true` set karne pe, `/actuator/health` yeh dikhata hai:

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

### Composition order matter karta hai

Jab tum multiple patterns saath mein use karte ho (retry + circuit breaker + bulkhead...), unka order matter karta hai. Outer se inner tak yeh typical order hota hai:

```
Bulkhead → TimeLimiter → CircuitBreaker → Retry → RateLimiter → operation
```

Kyun? Retry ko circuit breaker ke **andar** hona chahiye — warna retries ek open circuit ko baar baar hit karte rahenge, aur breaker ko band service ko rest dene ka mauka hi nahi milega. Rate limiter sabse andar, operation ke sabse close, hota hai.

`Decorators` builder chain order mein hi apply hota hai — docs carefully padhna, order galat hua toh behavior unexpected ho sakta hai.

### Tuning hints

Yeh values kaise set karein? Kuch practical rules of thumb:

- `failure-rate-threshold: 50` — jab recent calls ka 50% fail ho jaaye, tab breaker OPEN karo. Bahut kam rakhoge toh breaker baar baar flap karega (flapping); bahut zyada rakhoge toh breaker slow react karega jab service actually down ho.
- `sliding-window-size: 20` — kitne recent calls/seconds consider karne hain decision lene ke liye. Bada window = zyada stable decision, lekin react karne mein slow.
- `minimum-number-of-calls: 10` — bahut chhote sample size (jaise 2 calls mein 1 fail) pe breaker mat kholo, warna galat signal milega.
- `wait-duration-in-open-state: 30s` — OPEN state mein kitni der ruko before test calls bhejna shuru karo.

## Express/Node comparison

Node background wale devs ke liye seedha comparison:

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

`cockatiel` sabse close design-cousin hai Resilience4j ka Node duniya mein — agar tumne kabhi `cockatiel` use kiya hai, Resilience4j ka functional API tumhe familiar lagega.

## Gotchas

> [!warning] `@CircuitBreaker` async methods pe
> Agar tumhara method `CompletableFuture` ya reactive type return karta hai, toh breaker ko uske liye specifically configure karna padega. `@TimeLimiter` use karo async waits ko cap karne ke liye — warna breaker sirf synchronous failures dekh payega, async wale miss ho jayenge.

> [!danger] Non-idempotent operations pe retry
> Dekho [[../11-Messaging/05-Idempotency-and-Retries]]. `POST /charge` ko retry karna matlab customer se double paisa katna ho sakta hai — bilkul waise jaise UPI transaction do baar chal jaaye network glitch ki wajah se. Idempotency keys use karo isse bachne ke liye.

> [!warning] Fallback khud fail nahi hona chahiye
> Agar tumhara fallback method khud exception throw kar de, toh original failure aur fallback failure dono surface ho jaate hain — logs confusing ho jaate hain. Fallback ko simple rakho (cached value return karo, baad ke liye queue mein daal do, ya default value bhej do).

> [!warning] Self-call se annotation trigger nahi hota
> Yeh wahi proxy wala issue hai jo `@Transactional` mein hota hai. Same class ke andar ek method dusre method (jisme annotation hai) ko directly call kare toh proxy bypass ho jata hai aur annotation kaam nahi karta. Bean ko inject karo, sibling method ko directly call mat karo.

> [!tip] Har jagah wrap mat karo
> Har method pe retry + breaker laga dena latency aur complexity dono badhata hai. Sirf **boundaries** pick karo — jahan tum doosri services ya external APIs ko call kar rahe ho, wahi wrap karo.

> [!tip] Write paths ke liye Outbox Pattern ke saath combine karo
> Agar tumhara operation "save karo → phir external call karo" type ka hai, resilience patterns reads ke liye help karte hain lekin writes ke liye tumhe true durability chahiye [[11-Outbox-Pattern]] se.

## Related
- [[06-Inter-Service-Communication]]
- [[07-OpenFeign]]
- [[09-Distributed-Tracing]]
- [[11-Outbox-Pattern]]
- [[../11-Messaging/05-Idempotency-and-Retries]]
