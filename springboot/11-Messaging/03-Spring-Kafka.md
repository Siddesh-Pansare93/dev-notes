---
tags: [messaging, kafka, spring-kafka, streaming]
aliases: [Kafka, Spring Kafka]
stage: advanced
---

# Spring Kafka

> [!info] For the Express/TS dev
> Kafka is `kafkajs`'s big brother — the same broker, but Spring Kafka gives you batteries-included producer/consumer + serialization + DLT support. Kafka's not a queue — it's a **distributed log**: messages stay around for days/weeks, multiple consumer groups read independently, you can replay. If you've used kafkajs in Node, the protocol is identical.

## Concept

Kafka mental model:

- **Topic** = append-only log, divided into **partitions**.
- Each **partition** is FIFO; across partitions, no global order.
- **Producer** sends a message; the partitioner picks a partition (by key, or round-robin if no key).
- **Consumer** reads from a topic in a **consumer group**. Each partition is owned by exactly one consumer in the group.
- **Offset** = position in a partition; consumers commit offsets to track progress.
- **Retention** = how long messages stay (default 7 days). Replayable.

```
Topic "orders.placed"
 ├─ Partition 0: [m0, m1, m2, m3, ...]
 ├─ Partition 1: [m0, m1, m2, m3, ...]
 └─ Partition 2: [m0, m1, m2, m3, ...]

Group "email-service":
  consumer-A → partitions 0, 1
  consumer-B → partition 2

Group "analytics":
  consumer-C → partitions 0, 1, 2  (independent of email-service)
```

Same message → email-service AND analytics get it (different groups). Inside email-service, only one consumer gets each message (work distribution).

## Code example

### Setup

```xml
<dependency>
    <groupId>org.springframework.kafka</groupId>
    <artifactId>spring-kafka</artifactId>
</dependency>
```

```yaml
spring:
  kafka:
    bootstrap-servers: localhost:9092
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer
      acks: all                              # wait for all replicas
      properties:
        enable.idempotence: true
        max.in.flight.requests.per.connection: 5
    consumer:
      group-id: order-service
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
      auto-offset-reset: earliest
      enable-auto-commit: false              # commit manually
      properties:
        spring.json.trusted.packages: 'com.example.*'
    listener:
      ack-mode: manual_immediate
      concurrency: 3
      type: single
```

### Topic provisioning (programmatic)

```java
@Configuration
public class KafkaTopics {

    @Bean
    NewTopic ordersPlaced() {
        return TopicBuilder.name("orders.placed")
            .partitions(6)
            .replicas(3)
            .config(TopicConfig.RETENTION_MS_CONFIG, "604800000")   // 7 days
            .build();
    }
}
```

Spring creates these on startup if they don't exist (only against brokers that allow it).

### Producer

```java
@Service
public class OrderEventPublisher {

    private final KafkaTemplate<String, OrderPlacedEvent> kafka;

    public OrderEventPublisher(KafkaTemplate<String, OrderPlacedEvent> kafka) {
        this.kafka = kafka;
    }

    public void publishPlaced(OrderPlacedEvent ev) {
        var record = new ProducerRecord<>(
            "orders.placed",
            null,                              // partition (null = let partitioner pick)
            ev.orderId().toString(),           // KEY — same key → same partition (ordering)
            ev
        );
        record.headers().add("event-type",
            "OrderPlaced".getBytes(StandardCharsets.UTF_8));

        kafka.send(record).whenComplete((res, ex) -> {
            if (ex != null) log.error("publish failed", ex);
            else log.debug("published @ p{} o{}",
                res.getRecordMetadata().partition(),
                res.getRecordMetadata().offset());
        });
    }
}
```

Synchronous version (slower but simpler):

```java
kafka.send("orders.placed", key, value).get(5, TimeUnit.SECONDS);
```

### Consumer

```java
@Component
public class OrderEventListener {

    @KafkaListener(topics = "orders.placed", groupId = "email-service")
    public void on(@Payload OrderPlacedEvent ev,
                   @Header(KafkaHeaders.RECEIVED_KEY) String key,
                   @Header(KafkaHeaders.RECEIVED_PARTITION) int partition,
                   @Header(KafkaHeaders.OFFSET) long offset,
                   Acknowledgment ack) {
        log.info("p{}/o{} key={}", partition, offset, key);

        try {
            email.sendConfirmation(ev);
            ack.acknowledge();          // commit offset
        } catch (TransientException e) {
            // don't ack → re-poll same offset; OR rethrow for retry handler
            throw e;
        } catch (Exception e) {
            // don't ack — leave to error handler / DLT
            throw e;
        }
    }
}
```

### Batch consumer

```java
@KafkaListener(topics = "orders.placed",
               containerFactory = "batchKafkaListenerContainerFactory")
public void onBatch(List<OrderPlacedEvent> batch, Acknowledgment ack) {
    repository.saveAll(batch.stream().map(this::project).toList());
    ack.acknowledge();
}
```

Set `listener.type: batch` and provide a batch-aware factory.

### Error handling — retries + DLT

```java
@Configuration
public class KafkaErrorConfig {

    @Bean
    DefaultErrorHandler errorHandler(KafkaTemplate<String, Object> template) {
        var recoverer = new DeadLetterPublishingRecoverer(template,
            (record, ex) -> new TopicPartition(record.topic() + ".DLT", record.partition()));

        var backoff = new ExponentialBackOff(1_000L, 2.0);
        backoff.setMaxInterval(30_000L);
        backoff.setMaxElapsedTime(120_000L);    // give up after 2 min

        var handler = new DefaultErrorHandler(recoverer, backoff);
        handler.addNotRetryableExceptions(IllegalArgumentException.class);
        return handler;
    }
}
```

After all retries fail, the message goes to `orders.placed.DLT`. See [[06-Dead-Letter-Queues]].

### Transactional producer + consumer

```yaml
spring:
  kafka:
    producer:
      transaction-id-prefix: order-tx-
```

```java
@Transactional("kafkaTransactionManager")
public void doWork() {
    kafka.send("topic-a", payload1);
    kafka.send("topic-b", payload2);
    // both commit atomically OR both abort
}
```

Combined with `read_committed` consumers, gives you exactly-once semantics across Kafka topics. **Doesn't span DB transactions** — for that, use the [[../10-Microservices/11-Outbox-Pattern]].

### Schema evolution with Avro / Schema Registry

```xml
<dependency>
    <groupId>io.confluent</groupId>
    <artifactId>kafka-avro-serializer</artifactId>
    <version>7.5.0</version>
</dependency>
```

```yaml
spring:
  kafka:
    producer:
      value-serializer: io.confluent.kafka.serializers.KafkaAvroSerializer
      properties:
        schema.registry.url: http://schema-registry:8081
```

Avro + Schema Registry catches incompatible schema changes at producer-time, not at consumer-runtime.

### Testcontainers test

```java
@SpringBootTest
@Testcontainers
class OrderEventIT {

    @Container @ServiceConnection
    static KafkaContainer kafka =
        new KafkaContainer(DockerImageName.parse("confluentinc/cp-kafka:7.5.0"));

    @Autowired KafkaTemplate<String, OrderPlacedEvent> producer;
    @Autowired OrderEventListener listener;

    @Test
    void roundTrip() {
        producer.send("orders.placed", "k1", new OrderPlacedEvent(...));
        await().atMost(5, TimeUnit.SECONDS)
               .untilAsserted(() -> verify(emailService).sendConfirmation(any()));
    }
}
```

## Express/Node comparison

```typescript
// kafkajs
import { Kafka } from "kafkajs";
const kafka = new Kafka({ brokers: ["localhost:9092"] });

const producer = kafka.producer();
await producer.send({ topic: "orders.placed", messages: [{ key, value: JSON.stringify(ev) }] });

const consumer = kafka.consumer({ groupId: "email-service" });
await consumer.subscribe({ topic: "orders.placed" });
await consumer.run({
  eachMessage: async ({ message }) => {
    const ev = JSON.parse(message.value!.toString());
    await sendEmail(ev);
    // offsets auto-commit by default
  },
});
```

| Spring Kafka | kafkajs |
|--------------|---------|
| `KafkaTemplate` | `producer.send` |
| `@KafkaListener` | `consumer.run({ eachMessage })` |
| `JsonSerializer/Deserializer` | manual JSON |
| `DefaultErrorHandler` + DLT | manual try/catch + dead-letter producer |
| Transactional producer | `producer.transaction()` |
| Schema Registry | `@kafkajs/confluent-schema-registry` |

Spring's listeners are more declarative; kafkajs gives you imperative control.

## Gotchas

> [!warning] Auto-commit hides bugs
> Default `enable-auto-commit=true` commits offsets every 5s — even if processing failed in between. Always use `enable-auto-commit: false` + manual ack for at-least-once.

> [!warning] Number of partitions ≥ consumer threads
> 3 partitions, 5 consumers in a group → 2 consumers idle. Plan partition count for your peak parallelism.

> [!danger] Repartitioning is painful
> Adding partitions changes the key→partition mapping. Existing messages keyed by `customerId` stop being co-partitioned with new ones. Plan partition count up-front.

> [!warning] Hot keys
> If 80% of traffic has the same key, one partition gets 80% of load. Watch partition lag; consider sub-keying.

> [!warning] `auto-offset-reset` semantics
> `earliest` = read from beginning if no committed offset. `latest` = skip pre-existing messages. Wrong choice in dev → "consumer doesn't see my messages."

> [!warning] Consumer rebalancing pauses
> When a consumer joins/leaves, the group rebalances — all consumers stop briefly. With `static membership` and `cooperative-sticky` assignor, you can reduce pauses.

> [!tip] Lag is your most important metric
> `kafka_consumer_lag` per partition. Alert when sustained > N. Lag growing = consumer can't keep up.

> [!tip] Use Spring Kafka Test for unit tests
> `@EmbeddedKafka` boots an in-memory broker — fast tests without Docker. For integration tests, prefer Testcontainers.

## Related
- [[01-Messaging-Concepts]]
- [[02-Spring-AMQP-RabbitMQ]]
- [[04-Spring-Cloud-Stream]]
- [[05-Idempotency-and-Retries]]
- [[06-Dead-Letter-Queues]]
- [[../10-Microservices/11-Outbox-Pattern]]
- [[../10-Microservices/10-Saga-Pattern]]
