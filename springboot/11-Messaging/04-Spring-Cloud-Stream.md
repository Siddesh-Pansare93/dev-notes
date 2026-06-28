---
tags: [messaging, spring-cloud-stream, abstraction, binders]
aliases: [Spring Cloud Stream, SCS]
stage: advanced
---

# Spring Cloud Stream

> [!info] For the Express/TS dev
> Spring Cloud Stream (SCS) is a higher-level abstraction over Kafka, RabbitMQ, Pulsar, etc. You write `Function<Order, Confirmation>` beans and Spring binds them to topics/queues based on a chosen **binder**. Closest Node analog: NestJS Microservices' `@MessagePattern` — same idea, broker-agnostic.

## Concept

You write functions; Spring Cloud Stream wires them to messaging infrastructure declaratively.

Three function shapes:

| Shape | Direction | Use |
|-------|-----------|-----|
| `Supplier<T>` | Output only | Producer: emits messages on a schedule. |
| `Function<I, O>` | Input → Output | Consumer + producer (transform). |
| `Consumer<T>` | Input only | Pure consumer. |

A **binder** translates between your `Function` and a real broker:
- `spring-cloud-starter-stream-kafka`
- `spring-cloud-starter-stream-rabbit`
- `spring-cloud-starter-stream-pulsar`

Switch brokers by changing the dependency — your code doesn't change.

## Code example

### Setup (Kafka binder)

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-stream-kafka</artifactId>
</dependency>
```

### Pure consumer

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

The naming convention is `<beanName>-in-0` for input and `<beanName>-out-0` for output. The `0` allows multiple inputs per function.

### Transformer

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

Spring reads `orders.placed`, calls the function, writes the result to `shipping.requests`. Zero plumbing code.

### Multiple outputs (function returning tuple)

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

Or imperative production via `StreamBridge`:

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

### Reactive (Project Reactor)

```java
@Bean
public Function<Flux<OrderPlacedEvent>, Flux<ShippingRequest>> orderToShipping() {
    return flux -> flux
        .filter(o -> o.requiresShipping())
        .map(o -> new ShippingRequest(o.orderId(), o.address()))
        .doOnNext(r -> log.info("shipping {}", r));
}
```

### Multiple binders (e.g. Kafka + Rabbit in one app)

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

After retries are exhausted, the binder publishes the failed message to the DLQ topic.

### Function composition

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

Pipe `|` composes functions; SCS binds the composite.

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

The big SCS win: change brokers without changing code. NestJS gets you 80% there with `Transport.X`.

## Gotchas

> [!warning] The naming convention is unforgiving
> `bindings:` keys must match `<beanName>-in-N` / `<beanName>-out-N` exactly. Misspell → silent (no message). Always log binding info on startup to verify.

> [!warning] Don't fight the abstraction
> If you need broker-specific features (Kafka transactions, RabbitMQ headers exchange routing rules) you'll find SCS' lowest common denominator restrictive. Drop to Spring Kafka / Spring AMQP directly for those services.

> [!warning] Function vs Consumer for transformations
> A `Function<I, O>` requires an output binding. If you forget it, messages disappear. A `Consumer<I>` doesn't write — pick the right shape.

> [!warning] DLQ behavior differs by binder
> Kafka binder publishes to a DLQ topic. RabbitMQ binder uses a separate DLX. The configuration property names also differ. Read your binder's docs.

> [!tip] Use SCS when broker portability matters
> Real wins: development-vs-production switching (Rabbit dev, Kafka prod), or supporting multiple deployments. If you're committed to Kafka forever, Spring Kafka is more capable.

> [!tip] Pair with Schema Registry
> SCS integrates with Confluent Schema Registry / Apicurio. Add it for any non-trivial event-driven system.

## Related
- [[01-Messaging-Concepts]]
- [[02-Spring-AMQP-RabbitMQ]]
- [[03-Spring-Kafka]]
- [[05-Idempotency-and-Retries]]
- [[06-Dead-Letter-Queues]]
- [[../10-Microservices/02-Spring-Cloud-Overview]]
