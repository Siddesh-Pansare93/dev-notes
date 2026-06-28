---
tags: [microservices, outbox, patterns, messaging, consistency]
aliases: [Outbox Pattern, Transactional Outbox]
stage: advanced
---

# Outbox Pattern

> [!info] For the Express/TS dev
> The classic bug: you save an order to the DB **and** publish a Kafka event. If your service crashes between those two steps, the DB has an order but no event was published — silent inconsistency. The Outbox Pattern solves it: write the event into the **same DB transaction** as the data change, then a separate process relays it to Kafka. Atomic at the DB level.

## Concept

The fundamental problem: you want two things to happen atomically across two systems (DB + broker), but there's no XA transaction available — and even if there were, you shouldn't use it.

### Without the outbox

```java
@Transactional
public Order place(Cart cart) {
    var order = repo.save(new Order(cart));      // DB commit
    kafka.send("orders.placed", event);          // Kafka publish
    return order;
}
```

Failure modes:
- Crash after `repo.save` but before `kafka.send` → order exists, no event.
- Network blip on Kafka → exception bubbles up, transaction rolls back → no order, no event (OK).
- Kafka returns success but client crashes before `@Transactional` commits → event published, no order!

Result: **best-effort** consistency, silent data drift.

### With the outbox

```
┌────────────────────────────────────────┐
│ DB transaction                         │
│  ┌─────────┐    ┌─────────────────┐   │
│  │ orders  │    │ outbox          │   │
│  │ INSERT  │    │ INSERT event    │   │
│  └─────────┘    └─────────────────┘   │
└────────────────────────────────────────┘
                  │
            (separate process)
                  ▼
              ┌────────┐
              │ Relay  │ ──► Kafka
              └────────┘
```

The relay reads `outbox` rows and publishes them. If publishing fails, it retries — the event is durable in the DB.

### Two ways to implement the relay

1. **Polling publisher** — a scheduled job reads new outbox rows and publishes them. Simple. Slight latency.
2. **Change Data Capture (CDC)** — a tool like Debezium tails the Postgres WAL / MySQL binlog and emits changes to Kafka. Near-zero latency. More infra.

## Code example

### Schema

```sql
CREATE TABLE outbox (
  id           UUID PRIMARY KEY,
  aggregate    VARCHAR(50) NOT NULL,
  aggregate_id VARCHAR(100) NOT NULL,
  event_type   VARCHAR(100) NOT NULL,
  payload      JSONB NOT NULL,
  headers      JSONB,
  created_at   TIMESTAMP NOT NULL DEFAULT now(),
  published_at TIMESTAMP
);
CREATE INDEX outbox_unpublished ON outbox(created_at) WHERE published_at IS NULL;
```

### Entity

```java
@Entity
@Table(name = "outbox")
public class OutboxEvent {
    @Id private UUID id;
    private String aggregate;
    private String aggregateId;
    private String eventType;

    @Column(columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private String payload;

    private Instant createdAt;
    private Instant publishedAt;

    /* ... */
}
```

### Service writes to outbox in same transaction

```java
@Service
class OrderService {

    private final OrderRepository orders;
    private final OutboxRepository outbox;
    private final ObjectMapper json;

    @Transactional
    public Order place(Cart cart) {
        var order = orders.save(new Order(cart, OrderStatus.PLACED));

        var event = new OutboxEvent(
            UUID.randomUUID(),
            "Order",
            order.id().toString(),
            "OrderPlaced",
            json.writeValueAsString(new OrderPlacedPayload(order)),
            Instant.now(),
            null
        );
        outbox.save(event);

        return order;
    }
}
```

Both rows are part of the same transaction. Either both commit or both roll back. **Crucial property: this works with just a DB; no broker needed at write time.**

### Polling publisher

```java
@Component
class OutboxPublisher {

    private final OutboxRepository repo;
    private final KafkaTemplate<String, String> kafka;

    @Scheduled(fixedDelay = 500)
    @Transactional
    public void publish() {
        var batch = repo.findTop100ByPublishedAtIsNullOrderByCreatedAt();

        for (OutboxEvent ev : batch) {
            try {
                kafka.send(topicFor(ev.eventType()), ev.aggregateId(), ev.payload())
                    .get(5, TimeUnit.SECONDS);
                ev.markPublished(Instant.now());
            } catch (Exception e) {
                log.warn("publish failed for {}; will retry", ev.id(), e);
                break;  // stop processing this batch
            }
        }
    }

    private String topicFor(String eventType) {
        return switch (eventType) {
            case "OrderPlaced" -> "orders.placed";
            case "OrderCanceled" -> "orders.canceled";
            default -> throw new IllegalArgumentException(eventType);
        };
    }
}
```

> [!warning] Run only one publisher at a time — or use `SELECT ... FOR UPDATE SKIP LOCKED` to allow safe parallelism. Otherwise duplicate publishes happen on horizontal scale.

### Locking version (multi-instance safe)

```java
@Query(value = """
    SELECT * FROM outbox
    WHERE published_at IS NULL
    ORDER BY created_at
    LIMIT 100
    FOR UPDATE SKIP LOCKED
    """, nativeQuery = true)
List<OutboxEvent> claimBatch();
```

Each instance claims a different batch; nobody publishes the same event twice.

### CDC version with Debezium

If you don't want to write a publisher, use Debezium's [Outbox Event Router](https://debezium.io/documentation/reference/stable/transformations/outbox-event-router.html). It tails Postgres WAL and emits each `outbox` insert as a Kafka message — zero application code beyond writing to the table.

Debezium SMT config (in your Connector):

```json
{
  "transforms": "outbox",
  "transforms.outbox.type": "io.debezium.transforms.outbox.EventRouter",
  "transforms.outbox.route.by.field": "aggregate",
  "transforms.outbox.table.field.event.payload": "payload",
  "transforms.outbox.table.field.event.key": "aggregate_id"
}
```

Each `outbox` row → Kafka topic named after `aggregate` value, keyed by `aggregate_id`. Self-healing: if Kafka is down, Debezium catches up when it returns.

### Cleaning up

```sql
DELETE FROM outbox WHERE published_at < now() - interval '7 days';
```

Run as a scheduled task. Or never delete and treat outbox as your event log.

## Express/Node comparison

| Spring | Node |
|--------|------|
| `@Transactional` save + outbox | Knex/Prisma transaction with two writes |
| `@Scheduled` publisher | `node-cron` polling job |
| Debezium | Debezium (language-agnostic) |
| `FOR UPDATE SKIP LOCKED` | (same SQL works) |

Both ecosystems use the same patterns. Debezium is the "operator-friendly" option.

## Gotchas

> [!danger] Don't publish to the broker inside the DB transaction
> "I'll just publish at the end of `@Transactional`" — same as having no outbox. The publish can succeed and the transaction can roll back (constraint violation on commit). Use `TransactionSynchronizationManager.afterCommit` only if you accept "best-effort" — for true correctness, write to outbox.

> [!warning] At-least-once is the contract
> Outbox guarantees the event will be delivered ≥ 1 times. Consumers must be idempotent. See [[../11-Messaging/05-Idempotency-and-Retries]].

> [!warning] Ordering
> If you need strict ordering per aggregate, key Kafka messages by `aggregate_id` and publish in `created_at` order from the publisher.

> [!warning] Outbox table grows fast
> Millions of rows per day in a busy system. Without cleanup, performance degrades. Partition by date or move to a separate tablespace.

> [!tip] Inbox pattern for the consumer side
> Symmetric pattern: when consuming an event, write its ID to an `inbox` table inside the handler's transaction. Skip if already present. Provides exactly-once processing semantics at the application level.

> [!tip] If on Kafka and using event sourcing
> You may not need an outbox — your events ARE the source of truth, and you can derive read models. But for traditional service designs, outbox is the lowest-friction way to decouple DB and broker.

## Related
- [[10-Saga-Pattern]]
- [[14-Eventual-Consistency]]
- [[13-Database-per-Service]]
- [[../11-Messaging/01-Messaging-Concepts]]
- [[../11-Messaging/05-Idempotency-and-Retries]]
- [[../07-Data-JPA/03-Transactions|Transactions]]
