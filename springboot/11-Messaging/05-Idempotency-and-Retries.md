---
tags: [messaging, idempotency, retries, patterns]
aliases: [Idempotency, Retries, Exactly Once]
stage: advanced
---

# Idempotency and Retries

> [!info] For the Express/TS dev
> "Exactly-once delivery" is a marketing lie in distributed systems. Real systems give you **at-least-once delivery + idempotent processing = effectively exactly-once**. Every consumer in your system MUST be idempotent. This isn't optional. Same in Node, same in Java — the patterns are universal.

## Concept

### Why duplicates happen

- Consumer processed a message but crashed before acknowledging → broker redelivers.
- Producer's send timed out, it retried — both attempts actually got through.
- A retry framework (Resilience4j, Spring Retry) ran the operation 3 times.
- A saga's compensating action was triggered twice.
- A network proxy retried.

In every microservice system, the same logical event will be processed 2+ times occasionally. Plan for it.

### What is idempotency

A function `f` is idempotent if `f(f(x)) = f(x)` — running it twice has the same effect as once.

**Naturally idempotent:**
- `SET status = 'PAID' WHERE id = X`
- `PUT /resource/123 { ... }` (replaces)
- `INSERT ... ON CONFLICT DO NOTHING`

**Naturally NOT idempotent:**
- `UPDATE balance = balance - 100`
- `INSERT INTO orders (...)` (creates duplicate)
- `POST /charge` (charges twice)
- Sending an email
- Calling an external API

### Strategies

1. **Idempotency key** — caller provides a unique ID; processor records it; rejects duplicates.
2. **Deduplication table** — store processed message IDs.
3. **Conditional updates** — `UPDATE ... WHERE version = expected`.
4. **Upserts** — `INSERT ... ON CONFLICT DO UPDATE`.
5. **State-machine guards** — only `PAID` orders can transition to `SHIPPED`; redoing the transition is a no-op.

## Code example

### Pattern 1: Idempotency key for HTTP commands

```java
@RestController
class PaymentController {
    private final IdempotencyKeyRepository keys;
    private final PaymentService service;

    @PostMapping("/api/charges")
    @Transactional
    public ResponseEntity<ChargeResponse> charge(
            @RequestHeader("Idempotency-Key") String key,
            @RequestBody ChargeRequest req) {

        return keys.findById(key)
            .map(existing -> ResponseEntity.ok(existing.cachedResponse()))
            .orElseGet(() -> {
                var response = service.charge(req);
                keys.save(new IdempotencyKey(key, response, Instant.now()));
                return ResponseEntity.status(HttpStatus.CREATED).body(response);
            });
    }
}

@Entity
@Table(name = "idempotency_keys")
class IdempotencyKey {
    @Id String id;
    @Column(columnDefinition = "jsonb") String response;
    Instant createdAt;
    /* ... */
}
```

Client retries with the same `Idempotency-Key` → second call returns cached response, no double-charge. Stripe's API works this way.

### Pattern 2: Deduplication for message consumers (inbox pattern)

```java
@Entity
@Table(name = "processed_messages")
class ProcessedMessage {
    @Id String messageId;
    Instant processedAt;
}

@Component
class OrderEventListener {
    private final ProcessedMessageRepository inbox;
    private final EmailService email;

    @KafkaListener(topics = "orders.placed")
    @Transactional
    public void on(OrderPlacedEvent ev,
                   @Header(KafkaHeaders.RECEIVED_KEY) String key,
                   @Header("event-id") String eventId) {

        if (inbox.existsById(eventId)) {
            log.info("duplicate event {}, skipping", eventId);
            return;
        }

        email.sendConfirmation(ev);

        inbox.save(new ProcessedMessage(eventId, Instant.now()));
        // both INSERT inbox + email side-effects share the transaction
    }
}
```

The `inbox.save` is in the **same transaction** as the work. If the side effect rolls back, so does the inbox record — and a redelivery will properly reprocess.

> [!warning] If your side effect is external (email, payment), the transaction won't include it. You can still get duplicate emails. Use Pattern 4 (state machine) or accept the risk.

### Pattern 3: Conditional / state-machine updates

```java
@Service
class OrderService {

    @Transactional
    public void markPaid(UUID orderId, String txnId) {
        int updated = orderRepo.transitionToPaid(orderId, txnId);
        if (updated == 0) {
            // already paid OR doesn't exist OR not in PENDING state
            log.info("order {} not transitioned (already done?)", orderId);
        }
    }
}

public interface OrderRepository extends JpaRepository<Order, UUID> {
    @Modifying
    @Query("""
        UPDATE Order o
        SET o.status = 'PAID', o.txnId = :txnId, o.paidAt = CURRENT_TIMESTAMP
        WHERE o.id = :id AND o.status = 'PENDING'
    """)
    int transitionToPaid(@Param("id") UUID id, @Param("txnId") String txnId);
}
```

Calling `markPaid` twice → second call updates 0 rows. Safe.

### Pattern 4: Upsert

```sql
INSERT INTO order_events (event_id, order_id, type, payload, created_at)
VALUES (?, ?, ?, ?, ?)
ON CONFLICT (event_id) DO NOTHING;
```

```java
@Modifying
@Query(value = """
    INSERT INTO order_events(event_id, order_id, type, payload, created_at)
    VALUES (:id, :orderId, :type, :payload::jsonb, :ts)
    ON CONFLICT (event_id) DO NOTHING
    """, nativeQuery = true)
int saveIfNew(...);
```

### Retries with backoff (producer side)

```yaml
resilience4j:
  retry:
    instances:
      paymentClient:
        max-attempts: 5
        wait-duration: 200ms
        exponential-backoff-multiplier: 2
        randomized-wait-factor: 0.5      # jitter
        retry-exceptions:
          - java.io.IOException
          - org.springframework.web.client.HttpServerErrorException
        ignore-exceptions:
          - com.example.BadRequestException
```

> [!warning] Always retry only **idempotent** operations or operations with idempotency keys. See [[../10-Microservices/08-Resilience4j]].

### Retries with backoff (consumer side / Spring Kafka)

```java
@Bean
DefaultErrorHandler errorHandler(KafkaTemplate<String, Object> tpl) {
    var backoff = new ExponentialBackOff(1_000L, 2.0);
    backoff.setMaxInterval(30_000L);
    backoff.setMaxElapsedTime(120_000L);

    var recoverer = new DeadLetterPublishingRecoverer(tpl);
    var handler = new DefaultErrorHandler(recoverer, backoff);

    handler.addNotRetryableExceptions(IllegalArgumentException.class);  // bad data → DLT immediately
    return handler;
}
```

### Random jitter

```
attempt 1: wait 1s
attempt 2: wait 2s + jitter(0–1s)
attempt 3: wait 4s + jitter(0–2s)
```

Without jitter, all clients retry at the same instant after a downstream blip → thundering herd.

## Express/Node comparison

```typescript
// idempotency key check
app.post("/api/charges", async (req, res) => {
  const key = req.headers["idempotency-key"];
  const existing = await db.idempotencyKeys.findUnique({ where: { id: key }});
  if (existing) return res.json(existing.response);

  const response = await charge(req.body);
  await db.idempotencyKeys.create({ data: { id: key, response }});
  res.json(response);
});
```

| Java | Node |
|------|------|
| `IdempotencyKey` entity | Prisma `idempotencyKey` model |
| `processed_messages` inbox | dedupe table + transaction |
| Resilience4j Retry | `axios-retry`, `cockatiel` |
| Spring Kafka error handler | manual try/catch + retry topic |

Identical patterns; identical pitfalls.

## Gotchas

> [!danger] Naively retrying POSTs
> `axios-retry` retries any 5xx by default. Without idempotency keys, you'll double-create resources. Configure to retry only idempotent methods OR ensure handlers are idempotent.

> [!danger] "It's just a duplicate, no big deal"
> Until the duplicate is a $10,000 charge, a duplicate email to a CEO, a duplicate shipment. Treat duplicates as production bugs and design them out.

> [!warning] Idempotency keys need a TTL
> Don't store them forever — table grows infinitely. 24-hour TTL is typical for HTTP idempotency keys; longer for events.

> [!warning] Race conditions with idempotency tables
> Two concurrent retries arrive simultaneously. Both check "does key exist?" — both see no, both proceed. Use a unique constraint on the key + handle the constraint violation as "duplicate."

> [!warning] Time-boxed operations
> If a message takes longer than the broker's visibility/heartbeat timeout, it's redelivered while the first is still processing. Either: shorten work, lengthen timeout, or use idempotent handlers.

> [!warning] Side effects outside the transaction
> The inbox pattern protects DB side effects. `restClient.post(...)` to a third party doesn't roll back. For those: idempotency keys on **the third party's** side, or use [[../10-Microservices/11-Outbox-Pattern]].

> [!tip] Make the producer responsible for the event ID
> Don't use the broker's auto-generated message ID — that's per-delivery, not per-event. Generate a UUID at the producer and put it in headers; consumers dedupe on **that**.

## Related
- [[01-Messaging-Concepts]]
- [[02-Spring-AMQP-RabbitMQ]]
- [[03-Spring-Kafka]]
- [[06-Dead-Letter-Queues]]
- [[../10-Microservices/08-Resilience4j]]
- [[../10-Microservices/11-Outbox-Pattern]]
- [[../10-Microservices/10-Saga-Pattern]]
