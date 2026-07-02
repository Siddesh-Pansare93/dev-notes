# Spring Cloud Stream

> [!info] Express/TS dev ke liye
> Spring Cloud Stream (SCS) ek higher-level abstraction hai Kafka, RabbitMQ, Pulsar waghera ke upar. Tum bas `Function<Order, Confirmation>` type ke beans likhte ho, aur Spring inko topics/queues se bind kar deta hai ek chuni hui **binder** ke through. Node wale duniya mein sabse close analog hai NestJS Microservices ka `@MessagePattern` — same concept, bas broker-agnostic.

## Concept

Kya hota hai yahan? Socho tumhe Zomato jaisa ek order-processing system banana hai. Kabhi tum RabbitMQ use karte ho dev mein (halka-fulka, local pe chalane mein aasan), aur production mein Kafka pe switch karna hai (scale ke liye). Normally iska matlab hota — pura consumer/producer ka code phir se likhna. Spring Cloud Stream yeh problem solve karta hai: tum sirf plain Java `Function`, `Supplier`, `Consumer` likhte ho, aur SCS unhe messaging infra se wire kar deta hai — declaratively, config ke through, code change kiye bina.

Teen function shapes hote hain:

| Shape | Direction | Use |
|-------|-----------|-----|
| `Supplier<T>` | Output only | Producer: schedule pe messages emit karta hai. |
| `Function<I, O>` | Input → Output | Consumer + producer (transform karta hai). |
| `Consumer<T>` | Input only | Pure consumer, sirf read karta hai. |

Ek **binder** tumhare `Function` aur actual broker ke beech translate karta hai:
- `spring-cloud-starter-stream-kafka`
- `spring-cloud-starter-stream-rabbit`
- `spring-cloud-starter-stream-pulsar`

Broker switch karna matlab bas dependency badalna — tumhara business logic code same rehta hai.

> [!tip] Kyun zaruri hai?
> Real duniya mein aksar aisa hota hai — startup Rabbit se shuru karti hai kyunki setup aasan hai, phir scale hone pe Kafka pe move karti hai. Agar tumne Spring AMQP directly use kiya hota, toh yeh migration bahut painful hota. SCS ke saath, sirf pom.xml aur YAML change hota hai.

## Code example

### Setup (Kafka binder)

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-stream-kafka</artifactId>
</dependency>
```

### Pure consumer

Socho ek order place hua — tumhe bas email bhejna hai, kuch return nahi karna. Yeh use-case `Consumer<T>` ka hai:

```java
@Configuration
public class OrderProcessing {

    @Bean
    public Consumer<OrderPlacedEvent> orderPlaced() {
        return event -> {
            log.info("received order: {}", event.orderId());
            // do work
        };
    }
}
```

```yaml
spring:
  cloud:
    stream:
      bindings:
        orderPlaced-in-0:
          destination: orders.placed
          group: email-service
      kafka:
        binder:
          brokers: localhost:9092
```

Naming convention yaad rakho: `<beanName>-in-0` input ke liye, aur `<beanName>-out-0` output ke liye. Yeh `0` isliye hai kyunki ek function ke multiple inputs bhi ho sakte hain.

### Transformer

Ab agar order aaya aur usse shipping request mein convert karke aage bhejna hai — yeh `Function<I, O>` ka kaam hai:

```java
@Bean
public Function<OrderPlacedEvent, ShippingRequest> orderToShipping() {
    return order -> new ShippingRequest(
        order.orderId(),
        order.customerId(),
        order.address());
}
```

```yaml
spring:
  cloud:
    stream:
      bindings:
        orderToShipping-in-0:
          destination: orders.placed
          group: shipping-service
        orderToShipping-out-0:
          destination: shipping.requests
```

Spring `orders.placed` topic se message padhta hai, function call karta hai, aur result `shipping.requests` topic pe likh deta hai. Zero plumbing code — na consumer likhna, na producer, kuch nahi.

### Multiple outputs (function jo tuple return kare)

Ek order place hone pe agar tumhe do alag jagah bhejna ho — ek notification (customer ko) aur ek analytics event — toh:

```java
@Bean
public Function<OrderPlacedEvent, Tuple2<Notification, AnalyticsEvent>> fanOut() {
    return order -> Tuples.of(
        new Notification(order.customerId(), "Your order shipped!"),
        new AnalyticsEvent("order_placed", order.total()));
}
```

```yaml
bindings:
  fanOut-in-0:    { destination: orders.placed }
  fanOut-out-0:   { destination: notifications }
  fanOut-out-1:   { destination: analytics.events }
```

### Producer (Supplier)

Heartbeat jaisa periodic event bhejna ho, ya koi scheduled job — `Supplier<T>` use karo:

```java
@Bean
public Supplier<HeartbeatEvent> heartbeat() {
    return () -> new HeartbeatEvent(Instant.now());
}
```

```yaml
spring:
  cloud:
    stream:
      bindings:
        heartbeat-out-0:
          destination: heartbeats
      poller:
        fixed-delay: 30s
```

Ya phir imperative tareeke se, jab tumhe kisi user action pe turant message bhejna ho (jaise checkout button dabate hi), `StreamBridge` use karo:

```java
@Service
class OrderService {
    private final StreamBridge bridge;

    public void place(Cart cart) {
        var order = save(cart);
        bridge.send("orderPlaced-out-0",
            new OrderPlacedEvent(order.id(), order.total()));
    }
}
```

Yeh bilkul waise hai jaise Express mein tum kisi HTTP handler ke andar directly `producer.send()` call karte ho — koi scheduler nahi, event-driven trigger hai.

### Reactive (Project Reactor)

Agar tum reactive stack use kar rahe ho (WebFlux waghera), toh `Function<Flux<>, Flux<>>` likh sakte ho:

```java
@Bean
public Function<Flux<OrderPlacedEvent>, Flux<ShippingRequest>> orderToShipping() {
    return flux -> flux
        .filter(o -> o.requiresShipping())
        .map(o -> new ShippingRequest(o.orderId(), o.address()))
        .doOnNext(r -> log.info("shipping {}", r));
}
```

### Multiple binders (ek hi app mein Kafka + Rabbit)

Kabhi kabhi ek service ko dono brokers se baat karni padti hai — kuch events Kafka pe aa rahe hain, kuch RabbitMQ pe jaane hain:

```yaml
spring:
  cloud:
    stream:
      binders:
        kafka1:
          type: kafka
          environment.spring.cloud.stream.kafka.binder.brokers: localhost:9092
        rabbit1:
          type: rabbit
          environment.spring.rabbitmq.host: localhost
      bindings:
        orderPlaced-in-0:
          destination: orders.placed
          binder: kafka1
        notifications-out-0:
          destination: notifications
          binder: rabbit1
```

### DLQ + retries

Message process karte waqt exception aa gaya? Kitni baar retry karna hai, aur retries khatam hone ke baad message kahan jaayega — yeh sab config se control hota hai:

```yaml
spring:
  cloud:
    stream:
      bindings:
        orderPlaced-in-0:
          consumer:
            max-attempts: 3
            back-off-initial-interval: 1000
            back-off-multiplier: 2
      kafka:
        bindings:
          orderPlaced-in-0:
            consumer:
              enable-dlq: true
              dlq-name: orders.placed.DLT
```

Retries khatam hone ke baad, binder failed message ko DLQ topic pe publish kar deta hai — jaise Zomato ka order agar 3 baar fail ho jaaye deliver hone mein, toh woh "manual review" wali queue mein chala jaata hai.

### Function composition

Ek se zyada functions ko chain karna ho — pehle enrich karo, phir transform karo — bina koi wiring code likhe:

```java
@Bean public Function<Order, Order>          enrich()      { return o -> o.withTimestamp(); }
@Bean public Function<Order, ShippingReq>    toShipping()  { return o -> ShippingReq.from(o); }
```

```yaml
spring:
  cloud:
    function:
      definition: enrich|toShipping        # pipe-composed
    stream:
      bindings:
        enrichtoShipping-in-0:  { destination: orders.placed }
        enrichtoShipping-out-0: { destination: shipping.requests }
```

Pipe `|` functions ko compose karta hai; SCS is composite function ko bind kar deta hai jaise woh ek hi function ho.

## Express/Node comparison

```typescript
// NestJS Microservices — closest analog
@Controller()
class OrderController {
  @MessagePattern("orders.placed")
  async handle(@Payload() ev: OrderPlacedEvent) {
    return { type: "shipping_request", ... }; // returned to reply queue
  }
}
```

| Spring Cloud Stream | NestJS Microservices |
|---------------------|----------------------|
| `Consumer<T>` bean | `@MessagePattern` handler |
| Binder selection | `Transport.KAFKA / RMQ` |
| `StreamBridge` | `client.emit()` |
| Function composition | manual chaining |
| Reactive `Function<Flux<>, Flux<>>` | Observable handlers |

Asli SCS ka fayda yeh hai: broker badlo, code mat badlo. NestJS `Transport.X` se tumhe 80% wahan tak pahuncha deta hai, lekin baaki 20% (jaise ek hi app mein multiple binders, ya function composition) SCS jaisi maturity nahi rakhta.

## Gotchas

> [!warning] Naming convention maaf nahi karti
> `bindings:` ke keys exactly `<beanName>-in-N` / `<beanName>-out-N` match hone chahiye. Spelling mistake ki toh silently kuch nahi hoga — koi error nahi aayega, bas message kahin nahi jaayega. Startup pe hamesha binding info log karo taaki verify ho sake ki sab sahi wire hua hai.

> [!warning] Abstraction se mat lado
> Agar tumhe broker-specific features chahiye (Kafka transactions, ya RabbitMQ ka headers exchange routing) toh SCS ka "lowest common denominator" approach tumhe restrict karega. Aise services ke liye directly Spring Kafka / Spring AMQP use karo — SCS har jagah fit nahi hota.

> [!warning] Function vs Consumer — transformation ke liye sahi shape chuno
> `Function<I, O>` ko output binding chahiye hi chahiye. Agar bhool gaye, toh messages gayab ho jaayenge (silently). `Consumer<I>` kuch likhta nahi — sahi shape pick karo, warna debugging mein ghanton lag jaayenge.

> [!warning] DLQ ka behavior binder ke hisaab se alag hota hai
> Kafka binder ek DLQ topic pe publish karta hai. RabbitMQ binder ek alag DLX (dead letter exchange) use karta hai. Configuration property names bhi different hain. Apne binder ki docs zaroor padho, assume mat karo.

> [!tip] SCS tab use karo jab broker portability matter kare
> Real fayda tab hai jab: dev mein Rabbit, production mein Kafka — is tarah ka switching, ya multiple deployments support karna ho. Agar tum Kafka ke saath permanently committed ho, toh Spring Kafka directly zyada powerful aur capable hai.

> [!tip] Schema Registry ke saath pair karo
> SCS Confluent Schema Registry / Apicurio ke saath integrate hota hai. Kisi bhi non-trivial event-driven system ke liye isko zaroor add karo — warna schema evolution handle karna bahut mushkil ho jaayega.

## Related
- [[01-Messaging-Concepts]]
- [[02-Spring-AMQP-RabbitMQ]]
- [[03-Spring-Kafka]]
- [[05-Idempotency-and-Retries]]
- [[06-Dead-Letter-Queues]]
- [[../10-Microservices/02-Spring-Cloud-Overview]]
