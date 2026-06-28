---
tags: [messaging, rabbitmq, amqp, spring-amqp]
aliases: [RabbitMQ, Spring AMQP]
stage: advanced
---

# Spring AMQP / RabbitMQ

> [!info] For the Express/TS dev
> RabbitMQ is the workhorse broker for tasks, RPC, and complex routing. Spring AMQP wraps it with the familiar `Template` + `Listener` pattern. Closest Node equivalent: `amqplib` (raw) or NestJS' AMQP transport. RabbitMQ shines when you need rich routing (topic exchanges, headers exchanges) or low-latency request/reply.

## Concept

RabbitMQ's mental model:

- **Producer** publishes to an **exchange**.
- **Exchange** routes the message to one or more **queues** based on **bindings** + **routing key**.
- **Consumers** read from queues.

Exchange types:

| Type | Routing |
|------|---------|
| `direct` | Routing key matches binding key exactly. |
| `topic` | Wildcard match on routing key (`order.*.created`, `#.urgent`). |
| `fanout` | Send to all bound queues. Pub/Sub. |
| `headers` | Match on header values (rare). |

Default exchange `""` lets you publish directly to a queue by name (handy for simple work queues).

## Code example

### Setup

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-amqp</artifactId>
</dependency>
```

```yaml
spring:
  rabbitmq:
    host: localhost
    port: 5672
    username: guest
    password: guest
    listener:
      simple:
        acknowledge-mode: manual
        retry:
          enabled: true
          initial-interval: 1s
          max-attempts: 5
          multiplier: 2
        default-requeue-rejected: false
```

### Declare topology

```java
@Configuration
public class RabbitConfig {

    public static final String ORDER_EXCHANGE = "order.exchange";
    public static final String EMAIL_QUEUE    = "email.queue";
    public static final String AUDIT_QUEUE    = "audit.queue";

    @Bean
    TopicExchange orderExchange() {
        return new TopicExchange(ORDER_EXCHANGE, true, false);
    }

    @Bean
    Queue emailQueue() {
        return QueueBuilder.durable(EMAIL_QUEUE)
            .withArgument("x-dead-letter-exchange", "dlx.exchange")
            .withArgument("x-dead-letter-routing-key", "email.dlq")
            .build();
    }

    @Bean
    Queue auditQueue() {
        return QueueBuilder.durable(AUDIT_QUEUE).build();
    }

    @Bean
    Binding emailBinding(Queue emailQueue, TopicExchange orderExchange) {
        return BindingBuilder.bind(emailQueue).to(orderExchange).with("order.placed");
    }

    @Bean
    Binding auditBinding(Queue auditQueue, TopicExchange orderExchange) {
        return BindingBuilder.bind(auditQueue).to(orderExchange).with("order.#");
    }

    @Bean
    Jackson2JsonMessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    RabbitTemplate rabbitTemplate(ConnectionFactory cf, MessageConverter conv) {
        var t = new RabbitTemplate(cf);
        t.setMessageConverter(conv);
        t.setMandatory(true);                      // unroutable → ReturnCallback
        return t;
    }
}
```

### Producer

```java
@Service
public class OrderPublisher {
    private final RabbitTemplate rabbit;

    public OrderPublisher(RabbitTemplate rabbit) { this.rabbit = rabbit; }

    public void publishPlaced(OrderPlacedEvent ev) {
        rabbit.convertAndSend(
            RabbitConfig.ORDER_EXCHANGE,
            "order.placed",                           // routing key
            ev,
            msg -> {                                  // message post-processor
                msg.getMessageProperties().setMessageId(ev.orderId().toString());
                msg.getMessageProperties().setHeader("eventType", "OrderPlaced");
                return msg;
            });
    }
}
```

### Consumer

```java
@Component
public class EmailListener {

    private final EmailService email;

    public EmailListener(EmailService email) { this.email = email; }

    @RabbitListener(queues = RabbitConfig.EMAIL_QUEUE)
    public void on(OrderPlacedEvent ev,
                   Channel channel,
                   @Header(AmqpHeaders.DELIVERY_TAG) long tag) throws IOException {
        try {
            email.sendConfirmation(ev.customerId(), ev.orderId());
            channel.basicAck(tag, false);            // ack on success
        } catch (TransientException e) {
            channel.basicNack(tag, false, true);     // requeue
        } catch (Exception e) {
            channel.basicNack(tag, false, false);    // → DLQ
        }
    }
}
```

### Idempotent consumer (handle redeliveries)

```java
@Component
class EmailListener {
    private final ProcessedEventRepository processed;

    @RabbitListener(queues = "email.queue")
    @Transactional
    public void on(OrderPlacedEvent ev,
                   @Header(AmqpHeaders.MESSAGE_ID) String messageId) {
        if (processed.existsById(messageId)) {
            return; // duplicate
        }
        email.sendConfirmation(ev);
        processed.save(new ProcessedEvent(messageId, Instant.now()));
    }
}
```

### Publisher confirms (durability)

```yaml
spring:
  rabbitmq:
    publisher-confirm-type: correlated
    publisher-returns: true
```

```java
rabbit.setConfirmCallback((corr, ack, cause) -> {
    if (!ack) log.error("publish failed: {}", cause);
});
rabbit.setReturnsCallback(ret ->
    log.error("unroutable: {} {}", ret.getReplyText(), ret.getMessage()));

// when sending
var corr = new CorrelationData(ev.orderId().toString());
rabbit.convertAndSend(exchange, key, ev, corr);
```

Without confirms, "send" returns success once it's in the local socket buffer — no guarantee it reached the broker.

### Request/Reply (RPC)

```java
// Server side
@RabbitListener(queues = "rpc.queue")
String handle(String request) {
    return "echo: " + request;
}

// Client side
String reply = (String) rabbit.convertSendAndReceive("rpc.queue", "ping");
```

Spring handles correlation IDs and reply-to queues automatically.

### Concurrency

```yaml
spring:
  rabbitmq:
    listener:
      simple:
        concurrency: 5         # threads per listener
        max-concurrency: 20
        prefetch: 50           # in-flight messages per consumer
```

`prefetch` (channel QoS) is critical — without it RabbitMQ may dump thousands of messages on one consumer.

## Express/Node comparison

```typescript
// amqplib
import amqp from "amqplib";

const conn = await amqp.connect("amqp://localhost");
const ch = await conn.createChannel();
await ch.assertQueue("email.queue", { durable: true });

// publish
ch.publish("order.exchange", "order.placed", Buffer.from(JSON.stringify(ev)));

// consume
ch.consume("email.queue", async (msg) => {
  if (!msg) return;
  const ev = JSON.parse(msg.content.toString());
  try {
    await email.sendConfirmation(ev);
    ch.ack(msg);
  } catch (e) {
    ch.nack(msg, false, false);
  }
}, { noAck: false });
```

| Spring AMQP | amqplib (Node) |
|-------------|----------------|
| `@RabbitListener` | `ch.consume(...)` |
| `RabbitTemplate.convertAndSend` | `ch.publish` |
| `@Configuration` topology | `assertExchange/assertQueue/bindQueue` |
| `Jackson2JsonMessageConverter` | manual `JSON.stringify/parse` |
| Publisher confirms | `confirmChannel` |
| `RabbitTemplate.convertSendAndReceive` | `amqplib-rpc` lib |

Spring's wiring is more declarative; Node's gives you fine control.

## Gotchas

> [!danger] Auto-ack mode loses messages on crash
> `acknowledge-mode: auto` (Spring's default) acks before listener returns. If listener throws after broker thinks it's done — message lost. Use `manual` and ack on success.

> [!warning] Default `requeue-rejected: true`
> Without `default-requeue-rejected: false`, a poison message gets nack'd → requeued → consumed → fails → ... infinite loop. Configure DLQs.

> [!warning] No retention after consume
> Once a message is ack'd, RabbitMQ deletes it. Unlike Kafka — no replay. If you need event history, also write to a DB or use Kafka.

> [!warning] Connection pooling
> Each `Channel` is single-threaded but cheap. Spring's listener container manages this. Don't share a `Channel` across threads manually.

> [!warning] Heartbeats and idle disconnects
> Long-running consumer with no traffic? Set `requested-heartbeat: 30s` so connections stay healthy through firewalls.

> [!tip] Use `quorum queues` in production
> Default classic queues are single-node. Quorum queues are Raft-replicated:
> ```java
> QueueBuilder.durable("orders").quorum().build();
> ```

## Related
- [[01-Messaging-Concepts]]
- [[03-Spring-Kafka]]
- [[04-Spring-Cloud-Stream]]
- [[05-Idempotency-and-Retries]]
- [[06-Dead-Letter-Queues]]
