# Micrometer Metrics

> [!info] Express/TS dev ke liye
> Micrometer basically **SLF4J of metrics** hai — ek vendor-neutral facade. Tum code likhte ho `MeterRegistry` ke against, aur backend (Prometheus, Datadog, New Relic, Graphite, CloudWatch) jo bhi ho, woh metrics collect kar leta hai. Node mein tum seedha `prom-client` use karte the, jo ek hi backend (Prometheus) se tightly coupled hota hai. Yahan aisa nahi — code ek hi rehta hai, backend switch karna easy hai.

## Kya hota hai?

Socho tumhare Zomato jaisa app hai — tumhe pata chalna chahiye ki abhi kitne orders aa rahe hain, kitna time lag raha hai order place karne mein, database connections kitne busy hain, JVM ka memory kaisa chal raha hai. Yeh sab numbers hi **metrics** hain, aur Micrometer Spring Boot ka default library hai in numbers ko collect aur expose karne ke liye.

Kyun zaruri hai? Kyunki production mein jab kuch slow ho jaye ya crash ho jaye, logs padhna slow hai. Metrics tumhe real-time dashboard deta hai — "abhi 500 req/sec aa rahe hain, latency p99 800ms hai, DB pool 90% full hai" — is tarah ke insights turant milte hain.

Best part: sirf ek registry implementation add karo (Prometheus, Datadog, jo bhi), aur metrics automatically flow hone lagte hain — bina extra kuch likhe.

## Setup with Prometheus

Sabse popular combo hai Prometheus (metrics store) + Grafana (dashboards). Pehle dependencies daalo:

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

`actuator` yeh endpoints deta hai, aur `micrometer-registry-prometheus` metrics ko Prometheus ke samajhne wale format mein convert kar deta hai.

Ab endpoint expose karo `application.yml` mein:

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

`tags` wala part important hai — har metric ke saath `application` aur `env` tag chipak jayega, taaki Grafana mein tum easily filter kar sako "sirf staging ka data dikhao" ya "sirf order-service ka data dikhao".

Ab `/actuator/prometheus` hit karo — waha scrapeable metrics milenge, plain text format mein, jaise:

```
http_server_requests_seconds_count{method="GET",status="200",uri="/orders"} 1523.0
```

Prometheus server periodically is endpoint ko "scrape" karta rehta hai (poll karta hai) aur apne time-series database mein store karta hai.

## Auto-instrumented metrics — bina kuch kiye milta hai

Jaise hi actuator + micrometer add karte ho, yeh sab automatically track hone lagta hai:

- **JVM** (heap memory, garbage collection, thread count, classes loaded)
- **System** (CPU usage, file descriptors)
- **HTTP server** (`http.server.requests` — har request ki latency, count, status code)
- **DataSource** (HikariCP connection pool ka status — kitne connections busy hain, kitne idle)
- **Logback events** (kitne ERROR/WARN logs aaye)
- **Tomcat sessions**
- **Cache hit ratios** (Caffeine, Ehcache use kar rahe ho toh)

> [!tip] Node.js comparison
> `prom-client` mein tumhe yeh sab manually instrument karna padta — HTTP middleware likho, GC stats ke liye alag library lagao. Spring Boot mein yeh sab "batteries included" hai.

## Meter types — metrics ke categories

| Type | Purpose | Example |
|------|---------|---------|
| `Counter` | Sirf badhta hai, kabhi ghatega nahi | orders handled, errors count |
| `Gauge` | Abhi ka current value — upar-neeche ho sakta hai | queue size, active users |
| `Timer` | Duration + count dono track karta hai | request latency |
| `DistributionSummary` | Values ki size distribution | payload sizes, file sizes |
| `LongTaskTimer` | Abhi chal rahe long tasks | running background jobs |

Socho `Counter` ko ek odometer ki tarah — sirf aage badhta hai. Aur `Gauge` ko petrol tank ki tarah — kabhi bhar jaata hai, kabhi khaali ho jaata hai.

## Custom metrics likhna

Auto-instrumented metrics business logic ke baare mein kuch nahi batate — "kitne orders place hue" yeh toh tumhe khud track karna padega:

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

Yahan kya ho raha hai:
1. `Counter.builder(...).register(registry)` — ek naya counter banaya jo `orders.placed` naam se track hoga
2. `Timer.start(registry)` — stopwatch start kiya
3. `finally` block mein `sample.stop(...)` — time record kar diya, chahe order place ho ya fail ho jaaye

> [!warning] Constructor mein Counter kyun bana rahe?
> `Counter.builder(...).register(registry)` ek hi baar chalna chahiye — application start pe. Isliye ise constructor mein ya `@PostConstruct` mein banao, method body mein nahi — warna har call pe naya counter register hone ki koshish hogi (aur Micrometer purana wala hi return karega, but unnecessary overhead hai).

## Annotation-based timing — shortcut

Agar sirf ek method ka time track karna hai, poora Timer.Sample likhne ki zarurat nahi:

```java
@Timed(value = "orders.place", percentiles = {0.5, 0.95, 0.99})
public Order place(NewOrder cmd) { ... }
```

Yeh `@Timed` annotation automatically method ka execution time record kar deta hai, with p50, p95, p99 percentiles.

> [!warning] Ye free mein kaam nahi karta
> `@Timed` kaam karne ke liye `@EnableAspectJAutoProxy` aur `micrometer-aop` dependency dono chahiye — kyunki yeh AOP (proxy-based) magic use karta hai. Agar bina dale use karoge toh silently kuch nahi hoga — koi error bhi nahi aayega, bas metric record nahi hoga. Yeh ek common gotcha hai.

## Common tags aur cardinality ka khatra

> [!warning] Cardinality — sabse bada gotcha
> Kabhi bhi tag mein high-cardinality values mat daalo — jaise user ID, request ID, ya full URL (with query params). Socho agar tum `userId` ko tag bana do — har unique user ke liye Prometheus ek naya time-series bana dega. Lakhon users honge toh lakhon time-series ban jayengi, aur tumhara metrics storage explode ho jayega (isko "cardinality explosion" kehte hain).
>
> Safe tags: status code, HTTP method, route **template** (jaise `/orders/{id}`, na ki `/orders/12345`), region, environment.

Yeh bilkul waise hai jaise Swiggy apne delivery partners ko city-wise track karega, individual partner ID se nahi — city ek fixed, chhota set hai; partner IDs lakhon ho sakte hain.

## Prometheus scrape config

Prometheus server ko batana padta hai ki kaha se metrics scrape karni hain:

```yaml
scrape_configs:
  - job_name: 'spring-boot'
    metrics_path: '/actuator/prometheus'
    static_configs:
      - targets: ['app:8080']
```

Yeh Prometheus ki apni config file (`prometheus.yml`) mein jaata hai, tumhare Spring Boot app mein nahi.

## Grafana dashboards — ready-made templates

Khud se dashboard banane ki zarurat nahi — community ne already bana rakhe hain. Bas ID daal ke import karo Grafana mein:

- **JVM (Micrometer)**: dashboard ID `4701`
- **Spring Boot 2.x System Monitor**: dashboard ID `11378`

Yeh CRED ya Paytm jaise apps ke internal monitoring dashboards jaisa hi hota hai — ready template lo, apne data source se connect karo, done.

## Histogram percentiles — latency ko buckets mein todna

Sirf average latency dekhna kaafi nahi hota — average mislead kar sakta hai. Agar 99 requests 10ms mein complete hui aur 1 request 5 second lagi, average theek dikhega but woh 1 slow request kisi user ko bahut bura experience de rahi hai. Isliye percentiles chahiye (p50, p95, p99):

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

- `percentiles-histogram: true` — Prometheus-compatible histogram buckets bana deta hai (server-side percentile calculation ke liye)
- `percentiles: 0.5, 0.95, 0.99` — client-side approximate percentiles bhi bhej deta hai
- `slo` — SLO (Service Level Objective) buckets define karta hai, jaise "kitne requests 50ms se kam mein complete hui, kitne 100ms se kam mein" — yeh alerting ke liye super useful hai ("agar p99 > 500ms ho jaaye toh alert bhejo")

## Key Takeaways

- Micrometer ek vendor-neutral facade hai (SLF4J of metrics) — code same rehta hai, backend (Prometheus/Datadog/etc.) switch kar sakte ho
- `spring-boot-starter-actuator` + `micrometer-registry-<backend>` dependency se auto-instrumentation mil jaata hai — JVM, HTTP, DataSource, cache sab free mein
- 5 meter types yaad rakho: `Counter` (sirf badhta hai), `Gauge` (upar-neeche), `Timer` (duration+count), `DistributionSummary` (size distribution), `LongTaskTimer` (in-flight tasks)
- Custom metrics banane ke liye `Counter.builder()` / `registry.timer()` use karo, registration ek hi baar karo (constructor mein)
- `@Timed` annotation ke liye `@EnableAspectJAutoProxy` + `micrometer-aop` dono chahiye, warna silently fail hoga
- **Cardinality ka dhyan rakho** — kabhi user ID, request ID, ya raw URL ko tag mat banao, warna storage explode ho jayega
- Percentiles (p50/p95/p99) dekho, sirf average latency pe bharosa mat karo
- Grafana mein ready-made community dashboards import kar sakte ho (IDs: 4701, 11378) — khud se banane ki zarurat nahi

## Related
- [[01-Spring-Boot-Actuator]]
- [[04-Distributed-Tracing]]
- [[05-Health-Checks-and-Readiness]]
- [[03-Logging-Best-Practices]]
