---
tags: [messaging, concepts, kafka, rabbitmq]
aliases: [Messaging, Async, Brokers]
stage: advanced
---

# Messaging Concepts

> [!info] For the Express/TS dev
> If you've used `bullmq` (Redis-backed jobs), `kafkajs`, or RabbitMQ from Node — same ideas. The Java side has Spring AMQP (RabbitMQ), Spring Kafka, JMS for ActiveMQ, and Spring Cloud Stream as a unifying abstraction. This note is the conceptual foundation for picking and using the right one.

## Concept

### Why messaging at all

Sync HTTP couples caller availability to callee availability. Messaging decouples them: the broker stores messages until consumers can process them. Benefits:

- **Decoupling** — producer doesn't know consumers.
- **Buffering** — bursts handled by broker; consumers process at their pace.
- **Fan-out** — one event, many handlers.
- **Replayability** (some brokers) — debugging, rebuilding read models.
- **Resilience** — consumer down ≠ data lost.

### Queue vs Topic

| | Queue | Topic |
|---|-------|-------|
| Routing | One message → one consumer (work distribution) | One message → all subscribed consumers (broadcast) |
| Use case | Job processing, load balancing | Event broadcasting, fan-out |
| Examples | RabbitMQ work queue, SQS | Kafka topic, Pub/Sub topic, RabbitMQ fanout exchange |

In Kafka, "topic" is the only concept — but consumer **groups** turn a topic into a queue (each message goes to one consumer per group).

### Push vs Pull

- **Push** (RabbitMQ default) — broker hands messages to consumers as they arrive.
- **Pull** (Kafka) — consumers ask the broker for messages at their own pace.

Pull is more resilient (consumer controls flow); push is lower-latency.

### Delivery guarantees

| Guarantee | Behavior |
|-----------|----------|
| **At-most-once** | Send-and-forget. May lose messages. Rare in practice. |
| **At-least-once** | Retried until acknowledged. **May duplicate.** Default for most brokers. |
| **Exactly-once** | At-least-once + idempotent processing on the consumer. |

> [!warning] **Exactly-once delivery is a marketing term.** What's achievable is at-least-once delivery + exactly-once *processing* (your handler being idempotent). See [[05-Idempotency-and-Retries]].

### Acknowledgements

A consumer must **ack** a message after processing. Until ack, the broker keeps it. If the consumer crashes mid-process, the message is redelivered.

```
Broker      Consumer
  │── msg ──►│
  │          │ process...
  │ ◄── ack ─│
  │ delete   │
```

If `ack` doesn't arrive within a timeout (or consumer dies): redelivered.

> [!danger] Auto-ack = at-most-once
> `acks = "auto"` in many libraries means "ack on receipt, before processing." Crash mid-process → message lost. Always ack **after** processing.

### Ordering

- **Partition/queue ordering** — within a single Kafka partition or RabbitMQ queue, messages are FIFO.
- **Cross-partition** — no global order. Use a partition key (e.g. `userId`) to route related messages to the same partition.

### Backpressure

Consumer slower than producer? Broker buffers up to its limit, then:
- RabbitMQ: blocks producer or rejects.
- Kafka: producer keeps publishing; consumer falls behind. Track **consumer lag** as an SLO.

## Code example

### A simple producer / consumer (Kafka)

```java
// Producer
@RestController
class OrderController {
    private final KafkaTemplate<String, OrderEvent> kafka;

    @PostMapping("/api/orders")
    Order create(@RequestBody Cart cart) {
        var order = service.save(cart);
        kafka.send("orders.placed", order.id().toString(),  // partition key
                   new OrderPlaced(order.id(), order.total()));
        return order;
    }
}

// Consumer (separate service)
@Component
class OrderEventListener {
    @KafkaListener(topics = "orders.placed", groupId = "email-service")
    void on(OrderPlaced ev, Acknowledgment ack) {
        try {
            email.sendConfirmation(ev.orderId());
            ack.acknowledge();   // ack ONLY on success
        } catch (Exception e) {
            // don't ack → redelivered
            throw e;
        }
    }
}
```

### Kafka vs RabbitMQ at a glance

| | Kafka | RabbitMQ |
|---|-------|----------|
| Model | Distributed log, partitioned topics | Queues + exchanges (smart routing) |
| Retention | Days/weeks; replayable | Until consumed |
| Throughput | Very high (millions/sec) | High (tens of thousands/sec) |
| Latency | ~10ms | ~1ms |
| Routing | By partition key | Rich (direct, topic, fanout, headers) |
| Ordering | Per partition | Per queue |
| Use case | Event streaming, log of facts | Task queues, request/reply, complex routing |

**Rule of thumb:**
- Stream of events, replay needed, high volume → Kafka.
- Tasks/jobs, complex routing, request/reply → RabbitMQ.

### Message types

- **Command** — "do this" — typically directed at one consumer (queue).
- **Event** — "this happened" — typically broadcast (topic), past-tense.
- **Document** — pure data transfer.
- **Reply** — response to a request (correlation ID).

Naming: `OrderPlaced` (event), `ChargeCard` (command). Don't mix in one channel.

### Partition keys (Kafka)

```java
kafka.send("orders.placed", order.customerId().toString(), event);
//          topic           ^ key — same key → same partition
```

All events for one customer land on one partition → ordered. Different customers spread across partitions → parallelism.

> [!warning] Hot partition: if 90% of traffic is one customer, one partition gets all the load. Pick keys with care.

## Express/Node comparison

| Concept | Java | Node |
|---------|------|------|
| Kafka client | Spring Kafka | `kafkajs` |
| RabbitMQ client | Spring AMQP | `amqplib` |
| Job queue (Redis) | Spring Data Redis + custom | `bullmq` |
| Pub/Sub abstraction | Spring Cloud Stream | NestJS `@MessagePattern` |
| At-least-once + idempotency | manual | manual |
| Outbox pattern | Spring + Debezium | same |

Both ecosystems use the **same brokers** — the libraries differ; the principles don't.

## Gotchas

> [!danger] Don't think "message sent = work done"
> The producer's success means it's *in the broker*. Until consumed and ack'd, nothing's actually happened. Design for that gap.

> [!warning] Don't share queues across teams as APIs
> A queue is an internal implementation detail. Publishing/consuming format changes without coordination breaks consumers silently. Treat events as published API contracts.

> [!warning] Schema evolution
> "I added a field" — old consumers break? Use Avro/Protobuf with a schema registry, or stick to backward-compatible JSON (additive changes only).

> [!warning] Poison messages
> A consumer keeps failing on a malformed message → infinite redeliveries → DLQ time. See [[06-Dead-Letter-Queues]].

> [!warning] Transactional pitfalls
> See [[../10-Microservices/11-Outbox-Pattern]]. Don't publish in the same transaction as a DB write — use the outbox.

> [!tip] Treat events as immutable facts
> "OrderPlaced(orderId=123, total=$50)" — don't mutate after publishing. New facts go in new events.

## Related
- [[02-Spring-AMQP-RabbitMQ]]
- [[03-Spring-Kafka]]
- [[04-Spring-Cloud-Stream]]
- [[05-Idempotency-and-Retries]]
- [[06-Dead-Letter-Queues]]
- [[../10-Microservices/06-Inter-Service-Communication]]
- [[../10-Microservices/11-Outbox-Pattern]]
