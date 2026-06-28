---
tags: [microservices, feign, http-client, spring-cloud]
aliases: [Feign, OpenFeign]
stage: advanced
---

# OpenFeign

> [!info] For the Express/TS dev
> OpenFeign is "Spring Data Repository for HTTP." You declare an interface annotated like a controller; Spring synthesizes an HTTP client at runtime that calls the remote service. It removes boilerplate of `RestTemplate`/`WebClient` setup. Closest Node analog: a TypeScript-typed `axios` wrapper, but Feign is annotation-driven and integrates with discovery + circuit breakers automatically.

## Concept

Without Feign:

```java
String body = client.post().uri("/charge").body(req).retrieve().body(String.class);
```

With Feign:

```java
@FeignClient(name = "payment-service")
interface PaymentClient {
    @PostMapping("/charge")
    ChargeResponse charge(@RequestBody ChargeRequest req);
}

// usage
@Autowired PaymentClient payments;
var resp = payments.charge(new ChargeRequest(100));
```

The interface looks like a controller. Spring generates a proxy that:
- Resolves `payment-service` via discovery (Eureka/k8s) or direct URL.
- Serializes/deserializes JSON.
- Applies interceptors (auth headers, tracing).
- Optionally retries / circuit-breaks via Resilience4j.

## Code example

### Setup

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-openfeign</artifactId>
</dependency>
```

```java
@SpringBootApplication
@EnableFeignClients
public class OrderServiceApp { /* ... */ }
```

### Define a client

```java
@FeignClient(name = "payment-service", path = "/api/payments")
public interface PaymentClient {

    @PostMapping("/charge")
    ChargeResponse charge(@RequestBody ChargeRequest req);

    @GetMapping("/status/{txnId}")
    PaymentStatus status(@PathVariable String txnId);

    @GetMapping
    List<Payment> list(@RequestParam("customerId") String customerId,
                       @RequestParam(defaultValue = "10") int limit);
}
```

DTOs:

```java
public record ChargeRequest(int amount, String currency) {}
public record ChargeResponse(String txnId, String status) {}
```

Inject and use:

```java
@Service
class OrderService {
    private final PaymentClient payments;
    OrderService(PaymentClient p) { this.payments = p; }

    public Order place(Cart cart) {
        var resp = payments.charge(new ChargeRequest(cart.total(), "USD"));
        return saveOrder(cart, resp.txnId());
    }
}
```

### Pointing at a fixed URL (no discovery)

```yaml
spring:
  cloud:
    openfeign:
      client:
        config:
          payment-service:
            url: http://payments.example.com
```

Or:

```java
@FeignClient(name = "payment", url = "${payment.base-url}")
public interface PaymentClient { /* ... */ }
```

### Auth headers — interceptor

```java
@Configuration
public class FeignConfig {
    @Bean
    public RequestInterceptor authInterceptor() {
        return template -> {
            String token = currentRequestToken();   // pull from SecurityContext
            template.header("Authorization", "Bearer " + token);
        };
    }
}
```

This interceptor runs for every Feign call. To scope it to a specific client:

```java
@FeignClient(name = "payment-service", configuration = PaymentFeignConfig.class)
```

### Custom error decoding

```java
@Component
public class FeignErrorDecoder implements ErrorDecoder {
    @Override
    public Exception decode(String methodKey, Response response) {
        return switch (response.status()) {
            case 400 -> new BadRequestException(readBody(response));
            case 404 -> new NotFoundException(methodKey);
            case 409 -> new ConflictException(readBody(response));
            case 502, 503, 504 -> new RetryableException(
                response.status(), "downstream unavailable",
                response.request().httpMethod(), null, response.request());
            default -> new DownstreamException(response.status());
        };
    }
}
```

`RetryableException` triggers Feign's built-in retry mechanism.

### Retries (built-in)

```yaml
spring:
  cloud:
    openfeign:
      client:
        config:
          payment-service:
            connectTimeout: 2000
            readTimeout: 5000

feign:
  retryer:
    period: 100         # initial backoff (ms)
    maxPeriod: 1000
    maxAttempts: 3
```

Or programmatic:

```java
@Bean
Retryer retryer() {
    return new Retryer.Default(100, 1000, 3);
}
```

### Circuit breaker integration

```yaml
spring:
  cloud:
    openfeign:
      circuitbreaker:
        enabled: true
```

Then use Resilience4j config (see [[08-Resilience4j]]). Provide a fallback:

```java
@FeignClient(name = "payment-service", fallback = PaymentClientFallback.class)
public interface PaymentClient { /* ... */ }

@Component
class PaymentClientFallback implements PaymentClient {
    @Override
    public ChargeResponse charge(ChargeRequest req) {
        return new ChargeResponse(null, "DEFERRED");
    }
    /* ... other methods ... */
}
```

When the breaker is open, the fallback runs.

### Logging requests/responses

```yaml
logging:
  level:
    com.example.PaymentClient: debug

feign:
  client:
    config:
      payment-service:
        loggerLevel: full   # NONE, BASIC, HEADERS, FULL
```

### File upload with Feign

```java
@FeignClient(name = "files", configuration = MultipartConfig.class)
interface FileClient {
    @PostMapping(value = "/upload", consumes = MULTIPART_FORM_DATA_VALUE)
    String upload(@RequestPart("file") MultipartFile file);
}
```

Requires `feign-form` dependency.

## Express/Node comparison

```typescript
// Hand-rolled axios client
const paymentClient = axios.create({
  baseURL: process.env.PAYMENT_URL,
  timeout: 5000,
});
paymentClient.interceptors.request.use(cfg => {
  cfg.headers.Authorization = `Bearer ${getToken()}`;
  return cfg;
});

const charge = (req: ChargeRequest) =>
  paymentClient.post<ChargeResponse>("/charge", req).then(r => r.data);
```

Or with NestJS HTTP module + interfaces — closer in spirit.

| OpenFeign | Node |
|-----------|------|
| `@FeignClient` interface | typed axios wrapper |
| `RequestInterceptor` | axios request interceptor |
| `ErrorDecoder` | axios response interceptor for errors |
| `Retryer` | `axios-retry` |
| `fallback = X.class` | try/catch with default value |
| Discovery integration | `consul-resolver` + axios |

OpenFeign's killer feature is **declarative-ness** — you describe the API, Spring builds the client. Node typically requires more glue.

## Gotchas

> [!warning] Same-class self-call doesn't work
> Same as `@Transactional` — the proxy is bypassed if you call a Feign method internally. Always inject the interface.

> [!warning] Don't reuse controller annotations literally
> `@RequestMapping` works on Feign clients. But conditional annotations like `@CrossOrigin` don't — they're server-side concepts.

> [!warning] Default Feign retries are quiet
> By default Feign retries on `IOException` only — not on 5xx. To retry 5xx, throw `RetryableException` from your `ErrorDecoder`.

> [!danger] Retries + non-idempotent operations
> Retrying a `POST /charge` could double-charge. Either: (a) make the endpoint idempotent (idempotency keys), or (b) only retry idempotent methods. See [[../11-Messaging/05-Idempotency-and-Retries]].

> [!tip] Prefer Feign over `RestTemplate` for service-to-service
> Less boilerplate, integrates with the Spring Cloud ecosystem (discovery, circuit breakers, tracing). For one-off external API calls, `RestClient` is fine.

> [!tip] Generate Feign clients from OpenAPI specs
> The `openapi-generator` Maven plugin can produce Feign interfaces from a spec — single source of truth for both sides.

## Related
- [[06-Inter-Service-Communication]]
- [[03-Service-Discovery-Eureka]]
- [[08-Resilience4j]]
- [[09-Distributed-Tracing]]
- [[../06-Web-REST/06-RestClient-and-WebClient|RestClient/WebClient]]
