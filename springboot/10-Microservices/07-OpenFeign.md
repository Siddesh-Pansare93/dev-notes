# OpenFeign

> [!info] Express/TS wale dev ke liye
> OpenFeign basically "Spring Data Repository, but for HTTP calls" hai. Jaise Spring Data mein tum sirf interface likhte ho aur Spring khud query implement kar deta hai, waise hi Feign mein tum ek interface likhte ho jo bilkul controller jaisa dikhta hai, aur Spring runtime pe uska HTTP client version bana deta hai jo actually remote service ko call karta hai. Isse `RestTemplate`/`WebClient` ka saara boilerplate gayab ho jaata hai. Node mein closest cheez? Ek TypeScript-typed `axios` wrapper — bas fark itna hai ki Feign annotation-driven hai aur discovery + circuit breaker jaisी cheezon ke saath automatically integrate ho jaata hai.

## Kya hota hai?

Socho tumhe `order-service` se `payment-service` ko call karna hai. Feign ke bina, tum kuch aisa likhoge:

```java
String body = client.post().uri("/charge").body(req).retrieve().body(String.class);
```

Yeh kaam to karta hai, lekin har call ke liye URL, serialization, error handling — sab manually likhna padta hai. Ab dekho Feign ke saath yeh kitna clean ho jaata hai:

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

Dekha? Yeh interface bilkul ek `@RestController` jaisa dikhta hai, bas farak itna hai ki yeh **client side** pe hai — matlab yeh define kar raha hai ki "main is service ko is tarah call karunga", server-side "main is request ko handle karunga" nahi. Spring is interface ko dekhkar background mein ek proxy class bana deta hai jo:

- `payment-service` ko discovery (Eureka/Kubernetes) se resolve karta hai, ya phir direct URL use karta hai.
- Request/response ko JSON mein serialize/deserialize karta hai.
- Interceptors apply karta hai (auth headers, tracing).
- Chahe to Resilience4j ke through retry/circuit-break bhi kar sakta hai.

Zomato ke analogy se socho — jab tumhara `order-service`, `payment-service` ko call karta hai charge karne ke liye, waise hi jaise Zomato ka order-system, restaurant ke POS system ko "order confirm ho gaya" bolta hai. Feign us call ko itna simple bana deta hai ki lagta hai tum ek local function hi call kar rahe ho.

## Code example

### Setup

Pehle dependency daalo:

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-openfeign</artifactId>
</dependency>
```

Aur main application class pe `@EnableFeignClients` lagao — yeh Spring ko bolta hai "bhai, is package mein jitne bhi `@FeignClient` interfaces hai, unke proxies bana de":

```java
@SpringBootApplication
@EnableFeignClients
public class OrderServiceApp { /* ... */ }
```

### Client define karna

Ab actual client interface likhte hai — bilkul controller jaisa syntax, bas idea reverse hai (yeh "call karne wala" hai, "handle karne wala" nahi):

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

DTOs (records use karo, plain aur clean rehta hai):

```java
public record ChargeRequest(int amount, String currency) {}
public record ChargeResponse(String txnId, String status) {}
```

Ab bas normal dependency injection se use karo — jaise tum koi bhi Spring bean use karte ho:

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

Yahan `payments.charge(...)` call karte waqt tumhe bilkul nahi pata chalta ki background mein ek real HTTP request ja rahi hai. Bas ek method call jaisa lagta hai — yehi Feign ki khoobsurati hai.

### Fixed URL pe point karna (bina discovery ke)

Agar tumhare paas Eureka/k8s discovery nahi hai aur direct URL pe hit karna hai:

```yaml
spring:
  cloud:
    openfeign:
      client:
        config:
          payment-service:
            url: http://payments.example.com
```

Ya phir annotation mein hi daal do:

```java
@FeignClient(name = "payment", url = "${payment.base-url}")
public interface PaymentClient { /* ... */ }
```

### Auth headers — interceptor

Real world mein har service-to-service call ke saath auth token bhejna padta hai (jaise UPI transactions mein har request ke saath signed token jaata hai). Feign mein iske liye `RequestInterceptor` hota hai:

```java
@Configuration
public class FeignConfig {
    @Bean
    public RequestInterceptor authInterceptor() {
        return template -> {
            String token = currentRequestToken();   // SecurityContext se nikaalo
            template.header("Authorization", "Bearer " + token);
        };
    }
}
```

Yeh interceptor **har** Feign call pe chalega. Agar sirf ek specific client ke liye chahiye, to scope kar sakte ho:

```java
@FeignClient(name = "payment-service", configuration = PaymentFeignConfig.class)
```

### Custom error decoding

Kya hota hai? Jab downstream service error return kare (400, 404, 503, etc.), Feign by default ek generic exception throw karta hai. Lekin tum apna custom mapping chahte ho — jaise 404 pe `NotFoundException`, 409 pe `ConflictException`. Iske liye `ErrorDecoder` implement karo:

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

`RetryableException` throw karne se Feign ka built-in retry mechanism trigger ho jaata hai — matlab yeh khud bata raha hai "bhai yeh error temporary hai, dobara try kar."

### Retries (built-in)

Kyun zaruri hai? Network glitches ho sakte hai — ek retry se hi bahut sare transient failures fix ho jaate hai (jaise UPI payment fail hone pe app khud ek baar retry karta hai). Configure aise karo:

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

Ya programmatically bhi bean bana sakte ho:

```java
@Bean
Retryer retryer() {
    return new Retryer.Default(100, 1000, 3);
}
```

### Circuit breaker integration

Kya hota hai? Agar `payment-service` hi down hai, to baar-baar retry karna time waste karna hai — better hai ki circuit "open" ho jaaye aur seedha fallback response de. Yeh CRED ya Paytm jaisi apps mein bhi hota hai — agar payment gateway down hai to app turant "abhi try nahi kar sakte" bol deti hai, instead of hanging.

```yaml
spring:
  cloud:
    openfeign:
      circuitbreaker:
        enabled: true
```

Phir Resilience4j config use karo (dekho [[08-Resilience4j]]). Fallback provide karo:

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

Jab breaker "open" state mein hota hai, tab yeh fallback method chalta hai — real call hi nahi jaata.

### Requests/responses log karna

Debugging ke waqt kaafi useful — pura request/response dekh sakte ho:

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

### File upload Feign ke saath

```java
@FeignClient(name = "files", configuration = MultipartConfig.class)
interface FileClient {
    @PostMapping(value = "/upload", consumes = MULTIPART_FORM_DATA_VALUE)
    String upload(@RequestPart("file") MultipartFile file);
}
```

Iske liye `feign-form` dependency chahiye hoti hai.

## Express/Node comparison

Tum jo Node mein manually karte ho, Feign woh sab annotation se kar deta hai:

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

NestJS ka HTTP module + interfaces use karo to thoda closer feel aata hai spirit mein.

| OpenFeign | Node |
|-----------|------|
| `@FeignClient` interface | typed axios wrapper |
| `RequestInterceptor` | axios request interceptor |
| `ErrorDecoder` | axios response interceptor for errors |
| `Retryer` | `axios-retry` |
| `fallback = X.class` | try/catch with default value |
| Discovery integration | `consul-resolver` + axios |

OpenFeign ka sabse bada plus point hai **declarative-ness** — tum bas API describe karte ho, Spring khud client bana deta hai. Node mein aksar zyada glue code likhna padta hai yeh sab wire-up karne ke liye.

## Gotchas — yeh dhyan rakhna

> [!warning] Same-class self-call kaam nahi karta
> Bilkul `@Transactional` jaisa issue — agar tum Feign method ko usi class ke andar se internally call karoge, to proxy bypass ho jaata hai aur Feign ki saari magic (retry, interceptor, circuit breaker) gayab ho jaati hai. Hamesha interface ko inject karke use karo, kabhi khud ke andar se method call mat karo.

> [!warning] Controller ke annotations blindly copy mat karo
> `@RequestMapping` Feign clients pe kaam karta hai. Lekin `@CrossOrigin` jaise conditional annotations kaam nahi karenge — woh purely server-side concepts hai, client pe unka koi matlab nahi.

> [!warning] Default Feign retries chup-chaap hote hai
> By default Feign sirf `IOException` pe retry karta hai — 5xx errors pe nahi! Agar tumhe 5xx pe bhi retry chahiye, to apne `ErrorDecoder` se `RetryableException` throw karna hoga (jaisa upar dikhaya).

> [!danger] Retries + non-idempotent operations — bahut bada trap
> `POST /charge` ko retry karna double-charge kar sakta hai! Socho customer ka paisa do baar kat jaaye sirf isliye ki network mein glitch aaya aur Feign ne retry kar diya. Iska solution: (a) endpoint ko idempotent banao (idempotency keys use karke — jaise UPI transactions mein unique transaction ID hota hai), ya (b) sirf idempotent methods (GET, PUT) ko hi retry karo. Detail ke liye dekho [[../11-Messaging/05-Idempotency-and-Retries]].

> [!tip] Service-to-service ke liye `RestTemplate` se Feign better hai
> Kam boilerplate, aur Spring Cloud ecosystem (discovery, circuit breakers, tracing) ke saath seedha integrate ho jaata hai. Haan, agar koi one-off external API call karni hai (jaise kisi third-party API ko ek-do baar hit karna hai), to `RestClient` bhi theek hai — poora Feign setup overkill hoga.

> [!tip] OpenAPI spec se Feign clients generate karo
> `openapi-generator` Maven plugin ek OpenAPI spec se seedha Feign interfaces generate kar sakta hai. Isse client aur server dono ek hi source of truth follow karte hai — mismatch ka chance kam ho jaata hai.

## Key Takeaways

- OpenFeign ek declarative HTTP client hai — tum interface describe karte ho (controller jaisa syntax), Spring runtime pe implementation generate kar deta hai.
- `@EnableFeignClients` lagana zaruri hai warna Feign interfaces scan hi nahi honge.
- Discovery (Eureka/k8s) ke through service name se resolve hota hai, ya fixed URL bhi de sakte ho.
- `RequestInterceptor` se auth headers har call mein automatically add ho jaate hai.
- `ErrorDecoder` se custom exceptions map kar sakte ho HTTP status codes ke basis pe.
- Default retries sirf `IOException` pe hote hai — 5xx pe retry chahiye to `RetryableException` khud throw karo.
- Circuit breaker + fallback combo se downstream failure ke waqt graceful degradation milta hai.
- **Non-idempotent operations (jaise payment charge) ko retry karte waqt bahut savdhaan raho** — double-execution ka risk hota hai, idempotency keys use karo.
- Self-call (same class ke andar Feign method call karna) proxy ko bypass kar deta hai — hamesha injected interface use karo.
- Node ke comparison mein, Feign wahi kaam karta hai jo hand-rolled axios wrapper + interceptors + axios-retry milke karte hai, bas annotation-driven aur kam glue code ke saath.
