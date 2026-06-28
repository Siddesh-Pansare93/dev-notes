---
tags: [messaging, dlq, dlt, error-handling]
aliases: [Dead Letter Queue, DLQ, Dead Letter Topic, DLT]
stage: advanced
---

# Dead Letter Queues (DLQ / DLT)

> [!info] For the Express/TS dev
> When a consumer can't process a message after retries, you don't want it spinning forever blocking the queue. A **dead letter queue** (RabbitMQ) or **dead letter topic** (Kafka) is the parking lot — the message moves there, the main queue drains, and humans (or another job) deal with it. Same idea as `bullmq`'s "failed jobs" tab.

## Concept

The lifecycle:

```
            success → ack
              ▲
   ┌────────────────────┐
   │ Consumer            │
   │  process(msg)       │
   └─────────┬──────────┘
             │ failure
             ▼
       ┌───────────┐
       │ Retry?    │ yes (with backoff)
       └─────┬─────┘
             │ no (max attempts hit)
             ▼
       ┌───────────┐
       │   DLQ     │  → human review / replay job
       └───────────┘
```

### What goes in a DLQ

- **Poison messages** — malformed, unparseable.
- **Persistent failures** — downstream is gone, validation always fails.
- **Bugs** — your code can't handle this case yet.

### What you do with DLQ messages

- Inspect them (UI, log search).
- Fix the bug, redeploy, replay messages.
- Ignore (with audit) — known-bad data.
- Alert: "DLQ has > 0 messages" should be a **page**.

## Code example

### RabbitMQ DLQ

Declare a queue with DLX (dead letter exchange):

```java
@Configuration
public class RabbitDlqConfig {

    @Bean
    DirectExchange dlx() { return new DirectExchange("dlx.exchange", true, false); }

    @Bean
    Queue emailDlq() { return QueueBuilder.durable("email.dlq").build(); }

    @Bean
    Binding emailDlqBinding(Queue emailDlq, DirectExchange dlx) {
        return BindingBuilder.bind(emailDlq).to(dlx).with("email.dlq");
    }

    @Bean
    Queue emailQueue() {
        return QueueBuilder.durable("email.queue")
            .withArgument("x-dead-letter-exchange", "dlx.exchange")
            .withArgument("x-dead-letter-routing-key", "email.dlq")
            .withArgument("x-message-ttl", 86_400_000)         // 24h
            .build();
    }
}
```

When a message is **rejected without requeue** (`basicNack(tag, false, false)`) or expires (TTL), RabbitMQ routes it to the DLX → DLQ.

```java
@RabbitListener(queues = "email.queue")
public void on(EmailJob job, Channel ch, @Header(AmqpHeaders.DELIVERY_TAG) long tag)
        throws IOException {
    try {
        sendEmail(job);
        ch.basicAck(tag, false);
    } catch (TransientException e) {
        ch.basicNack(tag, false, true);   // requeue
    } catch (Exception e) {
        ch.basicNack(tag, false, false);  // → DLQ
    }
}
```

Spring's retry interceptor handles transient retries; after `max-attempts` it does the final `nack(requeue=false)` → DLQ.

### Kafka DLT (Dead Letter Topic)

```java
@Configuration
public class KafkaErrorConfig {

    @Bean
    DefaultErrorHandler errorHandler(KafkaTemplate<String, Object> template) {

        var recoverer = new DeadLetterPublishingRecoverer(template,
            (record, ex) -> new TopicPartition(
                record.topic() + ".DLT",
                record.partition()));      // same partition for ordering

        var backoff = new ExponentialBackOff(1_000, 2.0);
        backoff.setMaxInterval(30_000);
        backoff.setMaxElapsedTime(120_000);

        var handler = new DefaultErrorHandler(recoverer, backoff);

        // some exceptions go straight to DLT — no retries
        handler.addNotRetryableExceptions(
            IllegalArgumentException.class,
            DeserializationException.class);

        // log every retry attempt
        handler.setRetryListeners((record, ex, deliveryAttempt) ->
            log.warn("retry {} for record {}", deliveryAttempt, record, ex));

        return handler;
    }
}
```

Failed messages go to `<topic>.DLT` with original headers + a `kafka_dlt-exception-fqcn` header so you can see why.

### Inspecting a DLT message

```java
@KafkaListener(topics = "orders.placed.DLT", groupId = "dlt-monitor")
public void onDlt(ConsumerRecord<String, byte[]> record,
                  @Header(KafkaHeaders.DLT_EXCEPTION_MESSAGE) String exMsg,
                  @Header(KafkaHeaders.DLT_EXCEPTION_FQCN) String exClass,
                  @Header(KafkaHeaders.DLT_ORIGINAL_TOPIC) String origTopic) {
    log.error("DLT [{}]: {} - {}", origTopic, exClass, exMsg);
    // emit metric, page on-call, etc.
}
```

### Non-Blocking Retries (Spring Kafka 2.7+)

For Kafka, blocking retries (sleep + retry) hold up the partition. Non-blocking retries shift failed messages to retry topics:

```java
@RetryableTopic(
    attempts = "5",
    backoff = @Backoff(delay = 1000, multiplier = 2.0, maxDelay = 30_000),
    autoCreateTopics = "true",
    dltStrategy = DltStrategy.FAIL_ON_ERROR
)
@KafkaListener(topics = "orders.placed", groupId = "email-service")
public void on(OrderPlacedEvent ev) {
    sendEmail(ev);
}
```

Topics created automatically:
- `orders.placed-retry-0` (1s delay)
- `orders.placed-retry-1` (2s)
- `orders.placed-retry-2` (4s)
- `orders.placed-retry-3` (8s)
- `orders.placed-dlt` (final)

The main consumer doesn't block — failed messages get rescheduled to retry topics. Hugely improves throughput when many messages can fail intermittently.

### Replaying from DLQ

A simple replay job:

```java
@Component
class DlqReplayer {

    @Scheduled(cron = "0 */15 * * * *")  // every 15 min
    public void replay() {
        var messages = dlqClient.consume("email.dlq", 100);
        for (var m : messages) {
            try {
                rabbitTemplate.send("order.exchange", "order.placed", m);
                m.ack();   // remove from DLQ
            } catch (Exception e) {
                log.warn("replay failed for {}", m.id(), e);
            }
        }
    }
}
```

Or trigger manual replays via an admin endpoint after fixing a bug.

### Monitoring

Metrics you must track:

```
rabbitmq_queue_messages{queue="email.dlq"}            > 0   → alert
kafka_consumergroup_lag{topic="orders.placed.DLT"}     > 0   → alert
spring_kafka_listener_seconds_count{result="failure"}  rate  → spike alert
```

Dashboards on these turn DLQ from a hidden problem into a visible one.

## Express/Node comparison

```typescript
// kafkajs — manual DLQ
await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    try {
      await process(message);
    } catch (e) {
      if (deliveries(message) >= 5) {
        await producer.send({
          topic: `${topic}.DLT`,
          messages: [{
            key: message.key,
            value: message.value,
            headers: { ...message.headers, "dlt-error": e.message },
          }],
        });
      } else {
        throw e;  // let kafkajs redeliver
      }
    }
  },
});
```

| Spring | Node |
|--------|------|
| `DefaultErrorHandler + DLT` | manual try/catch + producer.send |
| `@RetryableTopic` non-blocking | `kafkajs-dead-letter` lib or hand-rolled |
| RabbitMQ `x-dead-letter-exchange` | same `amqplib` arguments |
| `bullmq` `failedJobs` | (built-in for Redis-backed jobs) |

## Gotchas

> [!danger] No DLQ = stuck consumer
> Without a DLQ, a poison message blocks the queue forever. The consumer keeps retrying, throwing, retrying. Eventually you `kafka-delete-records` in panic. Set up DLQs from day one.

> [!warning] DLQ != "fix it later"
> A DLQ that grows untouched is invisible data loss. Treat DLQ messages as bugs to fix, not garbage to ignore.

> [!warning] DLQ messages keep their original payload
> If the DLQ is on the same broker, anyone with consume access to the original topic also has access to the DLQ. Personal/sensitive data in messages = sensitive data in DLQ. Encrypt or scrub.

> [!warning] Replay carefully
> Don't replay 100k DLQ messages at once — overwhelms downstream. Throttle. Also, the original cause might still be there.

> [!warning] Non-retryable exceptions
> Bad: retrying a `DeserializationException` 5 times. Configure `addNotRetryableExceptions` for things you know can't succeed (validation, parse errors).

> [!tip] Build a DLQ inspector UI
> Even a basic page that lists last 100 DLQ messages with payload + error + replay button saves hours of debugging. Some companies build this once and reuse across all services.

> [!tip] DLQ TTL
> Don't keep DLQ messages forever. 14-30 day retention is typical. After that they're stale — the world has moved on.

## Related
- [[01-Messaging-Concepts]]
- [[02-Spring-AMQP-RabbitMQ]]
- [[03-Spring-Kafka]]
- [[04-Spring-Cloud-Stream]]
- [[05-Idempotency-and-Retries]]
- [[../10-Microservices/08-Resilience4j]]
- [[../12-Observability/02-Metrics|Metrics & alerts]]
