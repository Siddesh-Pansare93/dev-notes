# Distributed Tracing

> [!info] Express/TS wale dev ke liye
> Socho tumhara ek request Zomato ke system mein aata hai — pehle gateway pe hit hota hai, phir order-service, phir payment-service, phir kitchen-service ko Kafka event jaata hai. Ab agar order fail ho jaye, toh pata kaise chalega ki kaunsa service mein, kis step pe cheez bigdi? Yehi problem distributed tracing solve karta hai. Har request ko ek unique `traceId` milta hai, aur us request ke andar har chhota kaam (har "hop") ek `spanId` leke chalta hai. Fir ek backend (Zipkin/Jaeger/Tempo) in sab spans ko jodke ek flame graph bana deta hai — poora request ka safar ek nazar mein dikh jaata hai. Spring ki duniya mein aajkal iske liye **Micrometer Tracing** use hota hai (purana Spring Cloud Sleuth retire ho chuka hai), jo neeche **OpenTelemetry** ke through tracing backend ko data bhejta hai.

## Concept

Kya hota hai distributed tracing mein? Teen core terms samajh lo:

- **Trace** — ek poore request ka safar, start se end tak, chaahe woh 6 services se hoke guzre. Isko identify karta hai `traceId`.
- **Span** — ek chhota unit of work — ek HTTP call, ek DB query, ek Kafka publish. Har span ka apna `spanId` hota hai, aur woh apne parent span se linked hota hai (jaise ek family tree).
- **Context propagation** — `traceId` aur `spanId` ko caller se callee tak bhejna, usually HTTP headers ke through (`traceparent` — W3C standard, ya `b3` — Zipkin standard) ya phir message headers ke through (Kafka, RabbitMQ).

Ek trace kuch aisa dikhta hai:

```
Trace abc123:
  Span 1 (gateway):           ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 320ms
   └─ Span 2 (order-service): ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 240ms
       ├─ Span 3 (DB):        ▓▓▓ 30ms
       ├─ Span 4 (payment):   ▓▓▓▓▓▓▓▓▓ 110ms
       └─ Span 5 (kafka send):▓▓ 20ms
```

Yaani agar order-service ko 240ms lage, aur usmein se payment ko hi 110ms lag gaye, toh tumhe turant pata chal jaata hai ki bottleneck kahan hai — bina 5 alag services ke logs khangaale.

### Aaj ka Spring stack

- **Micrometer** — metrics ke liye API (CPU, memory, request counts waghera).
- **Micrometer Tracing** — tracing ke liye API (yeh purane Spring Cloud Sleuth ki jagah aaya hai).
- **Bridges** — Brave (Zipkin ka apna) ya OpenTelemetry — dono mein se ek choose karna hota hai.
- **Exporter** — spans ko backend tak bhejta hai (Zipkin, Jaeger, Tempo, ya generic OTLP).
- **Backend** — jahan trace data store hota hai aur visualize hota hai (Zipkin UI, Jaeger UI, Grafana Tempo, Honeycomb, Datadog).

```
[Tumhara code] → Micrometer Tracing API → Brave ya OTel SDK → exporter → Backend
```

## Code example

### Setup with OpenTelemetry → Zipkin

Sabse pehle dependencies daalte hain. Teen cheezein chahiye — actuator, tracing bridge, aur exporter:

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

Ab config karo `application.yml` mein — kitna % traffic sample karna hai aur kahan bhejna hai:

```yaml
spring:
  application:
    name: order-service

management:
  tracing:
    sampling:
      probability: 1.0          # dev mein 100%; prod mein kam rakho (jaise 0.05)
  zipkin:
    tracing:
      endpoint: http://zipkin:9411/api/v2/spans
```

Jaeger use karna hai toh bas exporter dependency badal do — `opentelemetry-exporter-jaeger` (ya phir sab jagah OTLP hi use karlo, yeh zyada future-proof approach hai).

### Auto-instrumentation (yeh tumhe muft mein milta hai)

Yeh best part hai — Spring Boot khud-ba-khud yeh sab trace kar deta hai, bina ek bhi extra line likhe:
- Incoming HTTP requests (filters ke through)
- Outgoing HTTP calls (`RestTemplate`, `WebClient`, `RestClient`, OpenFeign)
- JDBC queries
- Kafka producer/consumer
- RabbitMQ
- Reactor flows (reactive streams)
- `@Scheduled` tasks

Matlab upar wali dependencies daalne ke baad, tumhara gateway → order-service → payment-service → DB — yeh poora chain automatically trace ho jaayega. Koi annotation nahi lagana, koi extra code nahi likhna. Node.js mein `getNodeAutoInstrumentations()` jaisa hi kaam karta hai, bas Spring Boot mein yeh built-in feel hota hai.

### Custom spans banana

Kabhi kabhi tumhe apna khud ka business-logic span chahiye hota hai — jaise "checkout process" ka poora time track karna. Uske liye `Tracer` inject karo:

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

Dekho `try-with-resources` ka use — span shuru hota hai, kaam hota hai, tags lagte hain, aur `finally` mein span end hota hai chaahe exception aaye ya na aaye. Yeh pattern bilkul CRED ya Paytm jaise apps mein internal debugging ke liye use hota hai — jab payment fail ho, exact span pe error tag lag jaata hai.

### `@Observed` — annotation-wala shortcut

Agar tumhe manually `Tracer` inject karke likhna pasand nahi, toh ek annotation se bhi kaam chal jaata hai:

```java
@Observed(name = "checkout.process",
          contextualName = "checkout-process",
          lowCardinalityKeyValues = { "currency", "USD" })
public Order checkout(Cart cart) { /* ... */ }
```

Iske liye `aspectjweaver` dependency chahiye, aur ek `ObservedAspect` bean register karna padta hai (AOP magic ke peeche yehi kaam karta hai):

```java
@Bean
ObservedAspect observedAspect(ObservationRegistry r) {
    return new ObservedAspect(r);
}
```

### Logs mein trace IDs dikhana

Kya hota hai jab tumhare paas 5 services ke logs bikhre pade hon aur ek request fail ho jaye? Answer: log pattern mein `traceId` aur `spanId` add karo:

```yaml
logging:
  pattern:
    level: "%5p [${spring.application.name:},%X{traceId:-},%X{spanId:-}]"
```

Output kuch aisa dikhega:

```
2024-01-12 10:23:01 INFO  [order-service,abc123def456,789def]  com.example.OrderController : received request
```

Ab agar tumhare paas 5 services ke logs hain, toh bas `abc123def456` grep karo — poore request ka safar sabhi services mein dikh jaayega, jaise IRCTC pe PNR number se poori booking history dikh jaati hai. **Sirf yeh ek cheez setup karna, tracing ka 80% fayda de deta hai.**

### Messaging ke across propagate karna

Kafka aur RabbitMQ ka instrumentation apne aap headers ke through context propagate kar deta hai — tumhe kuch manually karne ki zaroorat nahi:

```java
// Producer
kafkaTemplate.send("orders.placed", payload);  // traceparent header automatically add ho jaata hai

// Consumer — listener method chalne se pehle context restore ho jaata hai
@KafkaListener(topics = "orders.placed")
void on(OrderPlaced ev) {
    log.info("processing"); // producer wale traceId ke saath hi log hoga
}
```

Matlab agar order-service ne Kafka pe event bheja aur kitchen-service ne consume kiya, dono ke logs mein same `traceId` milega — Swiggy ke order-placed se kitchen-notified tak ka poora flow ek hi trace mein.

### Sampling strategies

Production mein har request trace karna mehenga padta hai (storage + processing cost). Isliye sampling karte hain:

```yaml
management:
  tracing:
    sampling:
      probability: 0.1   # 10% — prod ke liye typical
```

High-traffic systems ke liye do approach hain:
- **Head-based sampling** — trace shuru hote hi decide kar lo ki sample karna hai ya nahi. Sasta hai, lekin kabhi kabhi errors miss ho sakte hain (kyunki decision request ke start mein hi ho gaya, yeh nahi pata tha ki aage error aayega).
- **Tail-based sampling** — request khatam hone ke baad decide karo — errors aur slow requests ko 100% sample karo, baaki ko kam. Iske liye ek collector chahiye (OTel Collector, Tempo) jo pehle sab kuch buffer karke rakhe.

## Express/Node comparison

Node.js mein bhi concept same hai, bas setup thoda manual hota hai:

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
| Zipkin/Jaeger/Tempo backends | (same — backends language-agnostic hote hain) |

OpenTelemetry dono ecosystems mein de-facto standard ban chuka hai. Spring ki Micrometer Tracing basically OpenTelemetry ka hi ek Spring-friendly wrapper hai — concept wahi hai, bas Java developers ko familiar feel deta hai.

## Gotchas

> [!warning] Production mein sampling probability
> 100% sampling on 10k RPS matlab millions spans per minute — tumhara tracing bill explode ho jaayega. Prod mein 1-5% rakho, aur errors ke liye tail-sampling se 100% capture karo. Warna Zomato-scale traffic pe tumhara Zipkin bill hi order ki value se zyada ho jaayega.

> [!warning] Async boundaries ke across trace context kho jaana
> Agar tumne manually `Thread`, `ExecutorService`, ya koi non-instrumented async library use kari, toh context kho jaata hai — trace beech mein hi tut jaata hai. `Context.taskWrapping(executor)` use karo ya carefully instrument karo. Reactor aur `@Async` mostly automatically handle ho jaate hain, tension mat lo.

> [!danger] Span tags mein PII daalna
> `span.tag("email", user.email())` — yeh customer ka email tumhare tracing backend mein hamesha ke liye store kar dega. Ho sake toh mat karo — zyadatar tracing backends compliant data stores ke liye design nahi hue hote, toh GDPR/data-privacy issues ho sakte hain.

> [!warning] Brave vs OTel
> Spring dono support karta hai — Brave (Zipkin ka apna) aur OpenTelemetry. Dono ko mix mat karo. Naye projects ke liye OTel bridge choose karo — yehi industry ka direction hai.

> [!tip] Sirf logs mein trace IDs daalna hi 80% value hai
> Fancy tracing UI setup karne se pehle bhi, sirf `traceId` ko har log line mein daal do — debugging ka experience poora badal jaata hai. Yeh sabse pehle karo, baaki baad mein.

> [!tip] Service map, tracing nahi hai
> Service map (kaun kisko call karta hai) traces se derive ho sakta hai, lekin service meshes yeh free mein de dete hain. Tracing ki asli value hai timing + flame graphs — yeh dikhana ki kahan time lag raha hai, na ki sirf kaun kisse baat kar raha hai.

## Related
- [[06-Inter-Service-Communication]]
- [[08-Resilience4j]]
- [[12-Service-Mesh-vs-Library]]
- [[../12-Observability/03-Distributed-Tracing|Observability section]]
- [[../12-Observability/01-Logging|Structured logging]]
