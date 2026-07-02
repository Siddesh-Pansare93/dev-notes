# Outbox Pattern

> [!info] For the Express/TS dev
> Classic bug yeh hai: tumne order DB mein save kiya **aur** Kafka pe event publish kiya. Agar tumhara service in dono steps ke beech crash ho gaya, toh DB mein order hai lekin event publish nahi hua — silent inconsistency, aur pata bhi nahi chalega jab tak koi customer complain na kare ki "bhai order place hua, notification nahi aayi." Outbox Pattern isko solve karta hai: event ko **usi DB transaction** mein likho jisme data change ho raha hai, phir ek alag process usko Kafka tak relay karta hai. Atomicity DB level pe guarantee hoti hai.

## Concept

Kya hota hai? Tumhe do cheezein atomically karni hain — do alag systems (DB aur message broker) ke across. Problem yeh hai ki XA transaction (distributed transaction) available nahi hota, aur agar hota bhi toh use nahi karna chahiye — woh slow aur fragile hota hai.

Socho Swiggy ka order flow: order DB mein save hua, aur restaurant ko "naya order aaya" wala event Kafka pe bhejna hai jisse kitchen dashboard update ho. Yeh dono cheezein ek saath, reliably honi chahiye — warna ya toh order dikhega hi nahi restaurant ko, ya phir DB mein order nahi hai lekin kitchen ko event mil gaya (ghost order).

### Outbox ke bina

```java
@Transactional
public Order place(Cart cart) {
    var order = repo.save(new Order(cart));      // DB commit
    kafka.send("orders.placed", event);          // Kafka publish
    return order;
}
```

Yahan kya-kya galat ho sakta hai (failure modes):
- `repo.save` ke baad lekin `kafka.send` se pehle crash ho gaya → order DB mein hai, event nahi bheja gaya.
- Kafka pe network blip aaya → exception upar throw hoti hai, transaction rollback ho jaata hai → na order, na event (yeh case actually theek hai, consistent hai).
- Kafka ne success return kiya lekin client `@Transactional` commit hone se pehle hi crash ho gaya → event publish ho gaya, lekin order DB mein hai hi nahi!

Result kya mila? **Best-effort** consistency — matlab zyada tar time sahi chalega, lekin kabhi kabhi silently data drift ho jaayega. Aur yeh bugs production mein pakadna sabse mushkil hote hain kyunki reproduce hi nahi hote.

### Outbox ke saath

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

Idea simple hai: Kafka pe directly publish mat karo. Uske bajaye ek `outbox` table mein event ki row insert karo — isi transaction mein jisme order save ho raha hai. Ab yeh dono INSERT ek hi ACID transaction ka part hain, toh ya dono commit honge ya dono rollback — koi third possibility nahi.

Ek alag "relay" process `outbox` table ki rows padhta hai aur unhe Kafka pe publish karta hai. Agar publish fail ho jaaye, relay retry karta rehta hai — event DB mein durable hai, kahin gaya nahi.

### Relay implement karne ke do tarike

1. **Polling publisher** — ek scheduled job har kuch second mein naye outbox rows check karta hai aur publish karta hai. Simple hai, likhna aasan hai. Thoda latency add hota hai (polling interval jitna).
2. **Change Data Capture (CDC)** — Debezium jaisa tool Postgres ke WAL (write-ahead log) ya MySQL ke binlog ko directly tail karta hai aur changes ko Kafka pe emit karta hai. Latency near-zero hoti hai, lekin infra thoda zyada complex ho jaata hai.

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

`published_at` column dhyan se dekho — jab tak `NULL` hai, event abhi tak Kafka pe nahi gaya. Yeh column hi tumhara "queue state" hai. Partial index sirf unpublished rows pe hai, isse polling query fast rehti hai even jab table mein lakhon rows ho jaayein.

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

Node/TS wale samjho: yeh exactly waise hi hai jaise Prisma mein ek `OutboxEvent` model define karna, `payload` column ko `Json` type dena. Koi Java-specific magic nahi hai yahan.

### Service — order aur outbox row same transaction mein

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

Yahan magic sirf itni hai: `@Transactional` ke andar dono `.save()` calls ho rahe hain — order ka bhi aur outbox event ka bhi. Spring in dono ko ek hi DB transaction mein wrap kar deta hai. **Sabse important property yeh hai: is poore flow mein Kafka ka koi role nahi hai.** Sirf DB involve hai write-time pe. Iska matlab Kafka down bhi ho, tumhara order place hona nahi rukega.

Node ke Prisma equivalent mein tum yehi cheez `prisma.$transaction([...])` se karoge — dono inserts ek array mein, atomic.

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

Har 500ms mein yeh job jaagta hai, top 100 unpublished events uthata hai, aur ek-ek karke Kafka pe bhejta hai. Publish succeed hote hi `markPublished` call hota hai jo `published_at` set kar deta hai. Agar beech mein koi event fail ho jaaye, loop `break` ho jaata hai taaki ordering maintain rahe — agla batch usi jagah se retry karega.

> [!warning] Ek time pe sirf ek publisher chalao — ya `SELECT ... FOR UPDATE SKIP LOCKED` use karo taaki safe parallelism ho sake. Nahi toh horizontal scale karne pe duplicate publishes honge — matlab same order ka "OrderPlaced" event do baar Kafka pe chala jaayega.

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

`FOR UPDATE SKIP LOCKED` ka matlab: jo rows already koi doosra transaction lock kar chuka hai, unko skip kar do — wait mat karo. Isse jab tumhare 3 service instances parallel mein poll kar rahe ho (Kubernetes mein 3 pods, jaise Zomato ke order service ke 3 replicas), toh har instance apna alag batch claim karega. Koi bhi event do baar publish nahi hoga.

### CDC version — Debezium ke saath

Agar tum khud publisher likhna hi nahi chahte, toh Debezium ka [Outbox Event Router](https://debezium.io/documentation/reference/stable/transformations/outbox-event-router.html) use karo. Yeh Postgres ka WAL tail karta hai aur har `outbox` insert ko directly Kafka message bana ke bhej deta hai — koi application code likhna hi nahi padta, sirf table mein write karo aur baaki Debezium sambhal lega.

Debezium SMT config (tumhare Connector mein):

```json
{
  "transforms": "outbox",
  "transforms.outbox.type": "io.debezium.transforms.outbox.EventRouter",
  "transforms.outbox.route.by.field": "aggregate",
  "transforms.outbox.table.field.event.payload": "payload",
  "transforms.outbox.table.field.event.key": "aggregate_id"
}
```

Har `outbox` row → ek Kafka topic banega jiska naam `aggregate` field ki value se aayega, aur message `aggregate_id` se keyed hoga. Yeh self-healing hai: agar Kafka down hai, Debezium ruk jaayega aur jab Kafka wapas aayega toh catch up kar lega — kuch bhi miss nahi hota.

### Cleanup

```sql
DELETE FROM outbox WHERE published_at < now() - interval '7 days';
```

Isko scheduled task ki tarah chalao. Ya phir kabhi delete hi mat karo aur outbox ko apna event log samjho (event sourcing style audit trail).

## Express/Node comparison

| Spring | Node |
|--------|------|
| `@Transactional` save + outbox | Knex/Prisma transaction with two writes |
| `@Scheduled` publisher | `node-cron` polling job |
| Debezium | Debezium (language-agnostic) |
| `FOR UPDATE SKIP LOCKED` | (same SQL works) |

Dono ecosystems mein pattern same hai, sirf syntax alag hai. Debezium language-agnostic hai — chahe backend Java ho ya Node, woh sirf Postgres/MySQL se baat karta hai, isliye "operator-friendly" option kehlata hai.

## Gotchas

> [!danger] DB transaction ke andar broker pe publish mat karo
> "Main bas `@Transactional` ke end mein publish kar dunga" — yeh karna outbox na hone jaisa hi hai. Publish succeed ho sakta hai aur transaction phir bhi rollback ho sakta hai (jaise commit time pe constraint violation aa jaaye). `TransactionSynchronizationManager.afterCommit` tabhi use karo jab tumhe "best-effort" acceptable ho — agar tumhe true correctness chahiye, toh outbox table mein hi likho, seedha broker ko touch mat karo.

> [!warning] At-least-once hi contract hai
> Outbox guarantee karta hai ki event **kam se kam ek baar** deliver hoga — zero baar nahi, lekin do baar bhi ho sakta hai. Isliye consumers ko idempotent hona hi chahiye. Dekho [[../11-Messaging/05-Idempotency-and-Retries]].

> [!warning] Ordering ka dhyan rakho
> Agar tumhe per-aggregate strict ordering chahiye (jaise ek hi order ke saare events sahi sequence mein aayein), toh Kafka messages ko `aggregate_id` se key karo aur publisher se `created_at` order mein hi publish karo.

> [!warning] Outbox table fast grow karta hai
> Busy system mein rozana lakhon rows ban sakti hain. Cleanup na kiya toh performance degrade hoga. Date ke basis pe partition karo ya alag tablespace mein move karo.

> [!tip] Consumer side ke liye Inbox pattern
> Yeh outbox ka symmetric jodidaar hai: jab event consume karo, uski ID ko ek `inbox` table mein likho — handler ke transaction ke andar hi. Agar ID already present hai toh skip kar do. Isse application level pe exactly-once processing mil jaata hai, chahe broker at-least-once hi guarantee kare.

> [!tip] Agar Kafka pe event sourcing use kar rahe ho
> Toh shayad outbox ki zaroorat hi na pade — waha tumhare events hi source of truth hain, aur read models unhi se derive hote hain. Lekin traditional service designs ke liye, outbox hi DB aur broker ko decouple karne ka sabse low-friction tarika hai.

## Related
- [[10-Saga-Pattern]]
- [[14-Eventual-Consistency]]
- [[13-Database-per-Service]]
- [[../11-Messaging/01-Messaging-Concepts]]
- [[../11-Messaging/05-Idempotency-and-Retries]]
- [[../07-Data-JPA/03-Transactions|Transactions]]
