# API Gateway (Spring Cloud Gateway)

> [!info] Express/TS wale dev ke liye
> API gateway matlab tumhare saare microservices ka ek hi front door — jaise Zomato app ka backend, jahan se order, payment, delivery — sab kuch ek hi entry point se guzarta hai bahar se. Yeh routing, auth, rate limiting, request rewriting, CORS jaisi cheezein sambhalta hai — jo har service mein baar-baar likhna waste hoga. Spring Cloud Gateway modern, reactive (Netty-based) choice hai; purane Zuul ki jagah leta hai. Socho isse Kong, Traefik, ya `express-gateway` jaisa hi kuch, bas Spring Cloud ka flavour.

## Concept

Kya hota hai? Bina gateway ke, mobile client ko `payment-service`, `orders-service`, `user-service` — sabka address alag-alag pata hona chahiye. Yeh bilkul aisa hi hai jaise tumhe Swiggy order karne ke liye restaurant ka direct number, delivery boy ka number, aur payment company ka number — teeno alag se pata hone chahiye. Ek gateway isko fix karta hai:

- **Route karta hai** `/api/orders/**` → `order-service`
- **Ek jagah authenticate karta hai** edge pe — andar ki services internal traffic pe trust karti hain.
- **Rate-limit** karta hai per client — jaise UPI apps mein ek limit hoti hai ki ek din mein kitne transactions.
- **TLS terminate** karta hai, taaki andar ka traffic plain HTTP pe chal sake (cluster ke andar sab trusted hai).
- **Aggregate** kabhi-kabhi karta hai responses ko — lekin usually yeh kaam Backend-for-Frontend (BFF) ka hota hai, gateway ka nahi.
- **Logging/tracing** centrally karta hai — ek hi jagah se sab dikh jaata hai.

Kyun zaruri hai reactive hona? Spring Cloud Gateway Project Reactor (WebFlux) pe bana hai — non-blocking, ek hi instance pe hazaaron concurrent connections handle kar sakta hai. Yeh **Spring MVC nahi hai** — yaad rakhna, warna confusion hoga.

```mermaid
flowchart TD
    Client(["🌐 Client\n(browser / mobile / 3rd party)"])

    subgraph Public["Public Zone (HTTPS)"]
        GW["⚡ Spring Cloud Gateway\nJWT auth · Rate limit · Routing"]
    end

    subgraph Private["Private Zone (HTTP inside cluster)"]
        OS["order-service\n:8081"]
        PS["payment-service\n:8082"]
        US["user-service\n:8083"]
        ER["Eureka\n:8761"]
    end

    Client -- "HTTPS /api/orders/**" --> GW
    Client -- "HTTPS /api/payments/**" --> GW
    Client -- "HTTPS /api/users/**" --> GW

    GW -- "lb://order-service" --> OS
    GW -- "lb://payment-service" --> PS
    GW -- "lb://user-service" --> US
    GW -- "registry lookup" --> ER

    style GW fill:#f59e0b,color:#000
    style Public fill:#fef3c7,stroke:#f59e0b
    style Private fill:#f0f9ff,stroke:#0ea5e9
```

### Teen concepts jo yaad rakhne hain

| Concept | Kya karta hai |
|---------|--------------|
| **Route** | Ek target — predicate(s) + URI + filters ka combo |
| **Predicate** | Incoming request ko match karta hai (`Path=/api/orders/**`, `Method=GET`, `Header=X-Foo,bar`) |
| **Filter** | Request/response ko modify karta hai (`AddRequestHeader`, `RewritePath`, `CircuitBreaker`, custom) |

Simple bhasha mein: Predicate decide karta hai "yeh request kiske liye hai", aur Filter decide karta hai "request ke saath kya karna hai before/after forward karne ke".

## Code example

### Dependency

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-gateway</artifactId>
</dependency>
```

> [!warning] Gateway app mein `spring-boot-starter-web` mat daalna
> Gateway reactive hai (WebFlux). Dono ko mix karoge toh app hi break ho jayega. Agar kuch synchronous endpoints chahiye, `spring-boot-starter-webflux` use karo unke liye.

### YAML config (sabse common tareeka)

```yaml
spring:
  application:
    name: api-gateway

  cloud:
    gateway:
      routes:
        - id: orders
          uri: lb://order-service           # lb:// → load-balanced via discovery
          predicates:
            - Path=/api/orders/**
          filters:
            - RewritePath=/api/orders/(?<segment>.*), /$\{segment}
            - AddRequestHeader=X-Source, gateway

        - id: payments
          uri: lb://payment-service
          predicates:
            - Path=/api/payments/**
            - Method=POST,GET
          filters:
            - StripPrefix=2
            - name: CircuitBreaker
              args:
                name: paymentsCB
                fallbackUri: forward:/fallback/payments

        - id: catalog
          uri: http://catalog-service:8080
          predicates:
            - Path=/api/catalog/**
          filters:
            - RewritePath=/api/catalog/(?<rest>.*), /catalog/$\{rest}
            - name: RequestRateLimiter
              args:
                redis-rate-limiter.replenishRate: 10
                redis-rate-limiter.burstCapacity: 20
                key-resolver: "#{@userKeyResolver}"

server:
  port: 8080
```

`lb://service-name` ke liye Eureka ya koi aur discovery client classpath pe hona chahiye (dekho [[03-Service-Discovery-Eureka]]).

### Java DSL (programmatic tareeka, zyada flexible)

Agar YAML se kaam nahi chal raha aur tumhe conditional/dynamic logic chahiye routes banane ke liye, toh Java DSL use karo:

```java
@Configuration
public class GatewayConfig {

    @Bean
    public RouteLocator routes(RouteLocatorBuilder builder) {
        return builder.routes()
            .route("orders", r -> r
                .path("/api/orders/**")
                .filters(f -> f
                    .rewritePath("/api/orders/(?<seg>.*)", "/${seg}")
                    .addRequestHeader("X-Source", "gateway")
                    .circuitBreaker(c -> c.setName("ordersCB")
                        .setFallbackUri("forward:/fallback/orders")))
                .uri("lb://order-service"))

            .route("payments", r -> r
                .path("/api/payments/**")
                .and().method("POST")
                .filters(f -> f
                    .retry(3)
                    .stripPrefix(2))
                .uri("lb://payment-service"))

            .build();
    }

    @Bean
    KeyResolver userKeyResolver() {
        return ex -> Mono.just(
            ex.getRequest().getHeaders().getFirst("X-User-Id")
        );
    }
}
```

### Custom global filter — auth edge pe

Kya problem solve karta hai? Har microservice mein JWT validate karne ka code duplicate karne ki zaroorat nahi — gateway ek baar verify karke downstream services ko batata hai "yeh user hai, yeh uske roles hain". Bilkul waise jaise OYO ka gatekeeper ek baar ID check karke andar bhej deta hai, phir har room ka staff dobara ID nahi maangta.

```java
@Component
public class JwtAuthFilter implements GlobalFilter, Ordered {

    private final JwtParser parser;

    public JwtAuthFilter(JwtParser parser) { this.parser = parser; }

    @Override
    public Mono<Void> filter(ServerWebExchange ex, GatewayFilterChain chain) {
        String auth = ex.getRequest().getHeaders().getFirst("Authorization");
        if (auth == null || !auth.startsWith("Bearer ")) {
            ex.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return ex.getResponse().setComplete();
        }

        try {
            var claims = parser.parseSignedClaims(auth.substring(7)).getPayload();
            // user-id downstream forward karo taaki services dobara JWT validate na karein
            var mutated = ex.getRequest().mutate()
                .header("X-User-Id", claims.getSubject())
                .header("X-User-Roles", String.join(",", (List<String>) claims.get("roles")))
                .build();
            return chain.filter(ex.mutate().request(mutated).build());
        } catch (JwtException e) {
            ex.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return ex.getResponse().setComplete();
        }
    }

    @Override public int getOrder() { return -100; }  // jaldi run ho, sabse pehle
}
```

`getOrder()` ka negative value matlab yeh filter baaki sab se pehle chalega — order matters jab multiple global filters ho.

### Fallbacks

Jab downstream service down ho (jaise `payment-service` crash ho gaya), CircuitBreaker fallback URI pe redirect kar deta hai instead of client ko raw error dikhane ke:

```java
@RestController
class FallbackController {
    @RequestMapping("/fallback/payments")
    Mono<ResponseEntity<Map<String, Object>>> paymentFallback() {
        return Mono.just(ResponseEntity
            .status(HttpStatus.SERVICE_UNAVAILABLE)
            .body(Map.of("error", "Payments temporarily unavailable")));
    }
}
```

### Rate limiting

Kyun zaruri hai? Bina rate limit ke, ek buggy client (ya attacker) tumhare payment-service ko spam karke down kar sakta hai — jaise Diwali sale ke din agar koi bot Flipkart pe non-stop hit maare bina limit ke.

```yaml
filters:
  - name: RequestRateLimiter
    args:
      redis-rate-limiter.replenishRate: 100   # tokens/sec sustained
      redis-rate-limiter.burstCapacity: 200   # max burst
      key-resolver: "#{@userKeyResolver}"     # per user bucket
```

Isko `spring-boot-starter-data-redis-reactive` aur ek Redis instance chahiye (token bucket ka state store karne ke liye).

### Common filters — quick reference

| Filter | Effect |
|--------|--------|
| `StripPrefix=2` | forward karne se pehle path ke pehle 2 segments hata do |
| `RewritePath=...` | regex se path rewrite karo |
| `AddRequestHeader` / `RemoveRequestHeader` | header manipulation |
| `SetStatus=404` | force ek status |
| `Retry` | fail hui requests retry karo |
| `CircuitBreaker` | Resilience4j circuit breaker se wrap karo |
| `RequestRateLimiter` | throttle karo |
| `RedirectTo` | 30x redirect |
| `PreserveHostHeader` | client ka `Host` header rakh lo |

## Express/Node comparison

```js
// Express Gateway / Kong-style routing
const proxy = require('express-http-proxy');
app.use('/api/orders', authenticate, rateLimiter, proxy('order-service:8080'));
app.use('/api/payments', authenticate, proxy('payment-service:8080'));
```

| Spring Cloud Gateway | Node |
|----------------------|------|
| YAML routes | Express middleware chains |
| `lb://service-name` | `consul-resolver` + proxy |
| Global filter | global middleware |
| `CircuitBreaker` filter | `opossum` se proxy wrap karna |
| `RequestRateLimiter` | `express-rate-limit` |
| Reactive (Netty) | event-loop (Node) — dono ka model similar hai |

Bas farak itna hai ki Spring Cloud Gateway mein yeh sab pehle se battle-tested aur declarative (YAML) hai — Node mein tumhe yeh sab manually wire karna padta hai.

## Gotchas

> [!warning] Gateway mein business logic mat daalo
> Gateway ko **dumb** rehna chahiye: route karo, auth karo, rate-limit karo. Responses aggregate karna aur business rules apply karna Backend-for-Frontend (BFF) ka kaam hai — ek separate service har client ke liye (web, mobile).

> [!warning] CORS gateway pe set karo
> CORS gateway pe set karo, har service mein nahi. Warna har service apna alag config rakhegi aur ek doosre se disagree karengi — debugging nightmare ban jayega.

> [!warning] Single point of failure
> Kam se kam 2 replicas chalao ek L4 LB (cloud LB, NLB) ke peeche. Gateway down = poora system down — jaise agar Zomato ka main server hi down ho jaye toh koi bhi order place nahi ho sakta, chahe restaurant kitna bhi free ho.

> [!warning] WebFlux wali soch rakho
> Gateway reactive hai — filters ke andar blocking calls (JDBC, blocking HTTP) karoge toh throughput tank ho jayega. Sirf reactive clients use karo.

> [!tip] Gateway, phir mesh
> Kuch teams edge pe (north-south traffic) Spring Cloud Gateway use karti hain, aur services ke beech (east-west traffic) ke liye Istio jaisa service mesh. Dekho [[12-Service-Mesh-vs-Library]].

## Related
- [[02-Spring-Cloud-Overview]]
- [[03-Service-Discovery-Eureka]]
- [[06-Inter-Service-Communication]]
- [[08-Resilience4j]]
- [[12-Service-Mesh-vs-Library]]
- [[../08-Security/04-JWT|JWT]]
