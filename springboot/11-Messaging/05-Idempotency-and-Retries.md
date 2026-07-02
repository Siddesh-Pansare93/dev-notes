# Idempotency and Retries

> [!info] Express/TS dev ke liye
> "Exactly-once delivery" ek marketing jhooth hai distributed systems mein. Real systems tumhe dete hain **at-least-once delivery + idempotent processing = effectively exactly-once**. Tumhare system ka har consumer idempotent HONA CHAHIYE. Yeh optional nahi hai. Node mein bhi yahi rule, Java mein bhi yahi rule — patterns universal hain.

## Concept

### Duplicates hote kyun hain?

Socho tum Zomato pe order place kar rahe ho aur payment ke time network glitch ho gaya. Tumne "Pay" button do baar dabaya kyunki pehli baar response nahi aaya. Ab backend ko decide karna hai — kya yeh do alag orders hain ya ek hi order ka duplicate attempt?

Yeh exact scenario distributed systems mein har jagah hota hai:

- Consumer ne message process kar liya lekin acknowledge karne se pehle crash ho gaya → broker phir se message deliver karega (redelivery).
- Producer ka send request timeout ho gaya, usne retry kiya — lekin dono attempts actually server tak pahunch gaye.
- Ek retry framework (Resilience4j, Spring Retry) ne operation 3 baar chala diya.
- Saga ka compensating action galti se do baar trigger ho gaya.
- Beech mein baitha koi network proxy retry kar raha hai.

Har microservice system mein, same logical event kabhi-kabhi 2+ baar process ho jayega. Yeh eventuality nahi hai, yeh **guarantee** hai. Isliye plan karo.

### Idempotency kya hoti hai?

Ek function `f` idempotent hai agar `f(f(x)) = f(x)` — matlab usse ek baar chalao ya do baar, result same rahega.

Socho UPI se paisa transfer karna vs "mark attendance" button. Attendance mark karna idempotent hai — 5 baar bhi dabao, status "Present" hi rahega. Lekin paisa transfer karna idempotent NAHI hai — 5 baar transfer karoge to 5 guna paisa chala jayega.

**Naturally idempotent (safe hai repeat karna):**
- `SET status = 'PAID' WHERE id = X`
- `PUT /resource/123 { ... }` (poora resource replace karta hai)
- `INSERT ... ON CONFLICT DO NOTHING`

**Naturally NOT idempotent (repeat karoge to disaster):**
- `UPDATE balance = balance - 100`
- `INSERT INTO orders (...)` (duplicate row bana dega)
- `POST /charge` (customer se do baar paisa kaat lega)
- Email bhejna
- External API call karna

### Strategies — duplicates se bachne ke tarike

1. **Idempotency key** — caller ek unique ID bhejta hai; processor use record karta hai; duplicate request ko reject/cache kar deta hai.
2. **Deduplication table** — processed message IDs ko store karo, dobara aane pe skip karo.
3. **Conditional updates** — `UPDATE ... WHERE version = expected` — sirf tab update hoga jab state expected hai.
4. **Upserts** — `INSERT ... ON CONFLICT DO UPDATE` — database khud duplicate handle kar deta hai.
5. **State-machine guards** — sirf `PAID` orders hi `SHIPPED` mein transition ho sakte hain; dobara transition try karoge to kuch nahi hoga (no-op).

## Code example

### Pattern 1: HTTP commands ke liye Idempotency key

Yeh wahi pattern hai jo Stripe use karta hai. Jab tum payment gateway ko charge karne ka request bhejte ho, tum ek `Idempotency-Key` header bhejte ho — jaise ek unique token. Agar network fail ho jaye aur tum retry karo (same key ke saath), server samajh jayega "arey yeh to wahi request hai, cached response wapas bhej do" — customer se dobara paisa nahi katega.

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

Client same `Idempotency-Key` ke saath retry karta hai → second call cached response return karta hai, double-charge nahi hota. Stripe ka API bilkul isi tarah kaam karta hai.

### Pattern 2: Message consumers ke liye Deduplication (Inbox pattern)

Ab socho tum Kafka se "order placed" events consume kar rahe ho aur har order ke liye confirmation email bhej rahe ho. Agar same event 2 baar deliver ho gaya (broker ki wajah se), toh customer ko 2 emails chali jayengi. Isse rokne ke liye hum ek "inbox table" banate hain — jaise ek register jisme likha hota hai "yeh event ID already process ho chuka hai."

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

`inbox.save` **same transaction** mein hai jitna asli kaam hai. Agar side effect rollback hota hai, toh inbox record bhi rollback ho jayega — aur agli baar redelivery aayegi to properly reprocess hoga.

> [!warning] Agar tumhara side effect external hai (email, payment), toh transaction usko cover nahi karega. Duplicate email fir bhi jaa sakti hai. Pattern 4 (state machine) use karo ya risk accept karo.

### Pattern 3: Conditional / State-machine updates

Yeh mera favorite pattern hai kyunki database khud duplicate ko handle kar leta hai — koi extra table nahi chahiye. Idea simple hai: `UPDATE` statement mein ek `WHERE` condition daal do jo sirf tabhi true hogi jab state abhi tak change nahi hui.

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

`markPaid` ko do baar call karo → second call 0 rows update karega (kyunki status already `PENDING` se `PAID` ho chuka hai). Bilkul safe.

### Pattern 4: Upsert

Postgres ka `ON CONFLICT DO NOTHING` bhi ek clean solution hai — jaise IRCTC waiting list mein same PNR dobara insert karne ki koshish karo, database khud reject kar de.

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

Ab baat karte hain retries ki. Jab tumhara downstream service (jaise payment gateway) temporarily down hai, tum turant fail nahi hona chahte — tum thoda wait karke retry karna chahte ho. Lekin "thoda wait" bhi smart hona chahiye, warna sab clients ek saath retry karke downstream ko phir se gira denge.

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

> [!warning] Sirf **idempotent** operations ko hi retry karo, ya jinke paas idempotency keys hain. Dekho [[../10-Microservices/08-Resilience4j]].

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

### Random jitter — Kyun zaruri hai?

```
attempt 1: wait 1s
attempt 2: wait 2s + jitter(0–1s)
attempt 3: wait 4s + jitter(0–2s)
```

Socho Diwali sale ke time Flipkart ka payment service thoda slow ho gaya. Agar tumhare paas jitter nahi hai, toh saare failed requests **exact same second** pe retry karenge — jaise ek saath 10,000 log ek hi darwaze se ghusne ki koshish kare. Isse downstream service phir se crash ho jayega. Jitter ek random extra delay add karta hai taaki retries alag-alag time pe spread ho jayein. Isko **thundering herd** problem kehte hain, aur jitter iska solution hai.

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

Pattern bilkul identical hain; pitfalls bhi identical hain. Chahe tum Express likho ya Spring Boot, distributed systems ke rules nahi badalte.

## Gotchas — yahan log common mistakes karte hain

> [!danger] Naively POSTs retry karna
> `axios-retry` default mein kisi bhi 5xx ko retry kar deta hai. Bina idempotency keys ke, tum resources double-create kar doge. Sirf idempotent methods retry karne ke liye configure karo, YA handlers ko idempotent banao.

> [!danger] "Arre yeh sirf ek duplicate hai, koi badi baat nahi"
> Jab tak woh duplicate ek ₹10,000 ka charge nahi ban jata, ya CEO ko duplicate email nahi jati, ya duplicate shipment nahi bhejta. Duplicates ko production bugs samjho aur unhe design se hi khatam karo.

> [!warning] Idempotency keys ko TTL chahiye
> Unhe forever store mat karo — table infinitely badhta jayega. HTTP idempotency keys ke liye 24-hour TTL typical hai; events ke liye thoda zyada rakh sakte ho.

> [!warning] Idempotency tables mein race conditions
> Do concurrent retries ek saath aate hain. Dono check karte hain "kya key exist karti hai?" — dono ko "nahi" milta hai, dono proceed kar jaate hain. Isliye key pe **unique constraint** lagao aur constraint violation ko "duplicate hai" ki tarah handle karo.

> [!warning] Time-boxed operations
> Agar message process karne mein broker ke visibility/heartbeat timeout se zyada time lag gaya, toh woh redeliver ho jayega jabki pehla wala abhi bhi process ho raha hai. Options: kaam chhota karo, timeout badhao, ya idempotent handlers use karo.

> [!warning] Transaction ke bahar side effects
> Inbox pattern sirf DB side effects ko protect karta hai. `restClient.post(...)` kisi third party ko — woh rollback nahi hoga. Uske liye: **third party ke side** pe idempotency keys use karo, ya [[../10-Microservices/11-Outbox-Pattern]] dekho.

> [!tip] Producer ko event ID ki responsibility do
> Broker ka auto-generated message ID use mat karo — woh per-delivery hota hai, per-event nahi. Producer pe hi ek UUID generate karo aur headers mein daalo; consumers **usी** pe dedupe karein.

## Related
- [[01-Messaging-Concepts]]
- [[02-Spring-AMQP-RabbitMQ]]
- [[03-Spring-Kafka]]
- [[06-Dead-Letter-Queues]]
- [[../10-Microservices/08-Resilience4j]]
- [[../10-Microservices/11-Outbox-Pattern]]
- [[../10-Microservices/10-Saga-Pattern]]

## Key Takeaways

- At-least-once delivery + idempotent processing = effectively exactly-once. "Exactly-once" delivery khud se exist nahi karta.
- Duplicates guaranteed hote hain distributed systems mein — network retries, consumer crashes, retry frameworks, sab isme contribute karte hain.
- Idempotency key pattern (Stripe-style) HTTP commands ke liye best hai — client retry kare toh cached response mile.
- Inbox pattern (dedup table + same transaction) Kafka/RabbitMQ consumers ke liye best hai — lekin external side effects (email, payment) is protection ke bahar hain.
- Conditional updates (`WHERE status = 'PENDING'`) sabse clean solution hai jab possible ho — extra table ki zaroorat nahi.
- `ON CONFLICT DO NOTHING/UPDATE` database-level deduplication deta hai.
- Retries hamesha exponential backoff + jitter ke saath karo, warna thundering herd problem ho jayega.
- Idempotency keys pe TTL lagao, aur unique constraint se race conditions roko.
- Producer-generated event ID (UUID) use karo dedup ke liye, broker ke auto message ID pe bharosa mat karo.
