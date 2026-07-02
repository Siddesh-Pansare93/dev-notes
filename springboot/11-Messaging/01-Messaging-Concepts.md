# Messaging Concepts

> [!info] Express/TS dev ke liye
> Agar tumne `bullmq` (Redis-backed jobs), `kafkajs`, ya RabbitMQ Node se use kiya hai — same hi ideas hain, bas naam alag hain. Java side pe Spring AMQP (RabbitMQ), Spring Kafka, JMS (ActiveMQ ke liye), aur Spring Cloud Stream (sabko ek chhata ke neeche laane wala abstraction) hote hain. Yeh note tumhara conceptual foundation hai — sahi broker chunne aur use karne ke liye.

## Concept

### Messaging kyun zaruri hai

Socho tum Zomato pe order karte ho. Agar restaurant ko order confirm karne ke liye tumhe wahin khade rehna pade jab tak khana ban na jaye — bohot ajeeb system hoga na? Sync HTTP bhi wahi karta hai: caller tab tak wait karta hai jab tak callee (jisko call kiya) jawab na de. Dono ek doosre ki availability pe depend karte hain — agar ek down hai, doosra bhi phas jaata hai.

Messaging is coupling ko todta hai. Ek beech ka broker (jaise Kafka ya RabbitMQ) messages ko store kar leta hai, jab tak consumer unhe process karne ke liye ready na ho. Bilkul Zomato ke order queue jaisa — restaurant ek saath 50 orders le sakta hai, kitchen apni speed se banaega, customer ko turant "order received" mil jaata hai.

Fayde:

- **Decoupling** — producer (order lene wala) ko pata bhi nahi hota consumer (kitchen, delivery, notification service) kaun hai ya kitne hain.
- **Buffering** — Swiggy pe Friday raat ko ek saath 10,000 orders aa jaayein? Broker sab absorb kar leta hai, consumers apni pace se process karte hain.
- **Fan-out** — ek event, kai handlers. Order place hua → email jaayega, SMS jaayega, inventory update hoga, analytics track hoga — sab alag-alag services ek hi event sun ke apna kaam karti hain.
- **Replayability** (kuch brokers mein) — debugging ke liye ya read models rebuild karne ke liye purane messages phir se chala sakte ho.
- **Resilience** — consumer down hai? Koi baat nahi, data broker mein safe hai. Consumer wapas aake process kar lega.

### Queue vs Topic

**Kya hota hai?** Queue aur Topic, dono message deliver karne ke do alag tareeke hain.

| | Queue | Topic |
|---|-------|-------|
| Routing | Ek message → ek hi consumer (kaam baatna) | Ek message → sab subscribed consumers (broadcast) |
| Use case | Job processing, load balancing | Event broadcasting, fan-out |
| Examples | RabbitMQ work queue, SQS | Kafka topic, Pub/Sub topic, RabbitMQ fanout exchange |

Socho ek **queue** IRCTC ke ticket booking counter jaisi hai — jitne bhi log line mein khade hain (consumers), ek ticket (message) sirf ek hi banda process karega. Doosre free honge tabhi agla message uthaayenge.

Ek **topic** newspaper delivery jaisa hai — jitne bhi subscribers hain, sabko wahi newspaper (message) mil jaata hai.

Kafka mein sirf "topic" hi concept hota hai — lekin consumer **groups** ek topic ko queue jaisa bana dete hain (har group ke andar ek message sirf ek hi consumer ko jaata hai, lekin alag groups ko independently milta hai).

### Push vs Pull

- **Push** (RabbitMQ default) — broker khud consumer ko message thama deta hai jaise hi woh aata hai. Jaise Swiggy delivery boy tumhe seedha ghar pe deliver kar deta hai.
- **Pull** (Kafka) — consumer khud broker se puchta hai "bhai koi naya message hai kya?" apni marzi se, apni speed se. Jaise tum khud restaurant se pickup karne jaate ho apni convenience pe.

Pull zyada resilient hai (consumer apni flow control khud karta hai); push mein latency kam hoti hai.

### Delivery guarantees

**Kya guarantee milti hai ki message deliver hoga?**

| Guarantee | Behavior |
|-----------|----------|
| **At-most-once** | Bhej diya aur bhool gaye. Message kho bhi sakta hai. Practically kam use hota hai. |
| **At-least-once** | Jab tak acknowledge na ho, retry hota rehta hai. **Duplicate ho sakta hai.** Zyadatar brokers ka default. |
| **Exactly-once** | At-least-once + consumer side pe idempotent processing. |

> [!warning] **"Exactly-once delivery" ek marketing term hai.** Real mein jo possible hai woh hai at-least-once delivery + exactly-once *processing* (matlab tumhara handler idempotent ho, same message do baar aaye toh bhi result same rahe). Dekho [[05-Idempotency-and-Retries]].

### Acknowledgements

**Ack kya hota hai?** Consumer ko message process karne ke baad broker ko batana padta hai "haan bhai, ho gaya kaam" — isse **ack** kehte hain. Jab tak ack nahi aata, broker message ko apne paas rakhta hai. Agar consumer process karte waqt crash ho jaaye, message dobara deliver hoga.

Bilkul UPI transaction jaisa — jab tak bank se confirmation (ack) nahi aata, transaction "pending" dikhta hai, aur agar beech mein kuch fail ho jaaye, retry hota hai.

```
Broker      Consumer
  │── msg ──►│
  │          │ process...
  │ ◄── ack ─│
  │ delete   │
```

Agar `ack` timeout ke andar nahi aata (ya consumer mar jaata hai): message phir se deliver hoga.

> [!danger] Auto-ack matlab at-most-once
> Kai libraries mein `acks = "auto"` ka matlab hota hai "message milte hi ack kar do, process karne se pehle." Agar beech processing mein crash ho gaya — message gaya hamesha ke liye. Hamesha process **karne ke baad** hi ack karo.

### Ordering

**Order maintain kaise hota hai?**

- **Partition/queue ordering** — ek single Kafka partition ya RabbitMQ queue ke andar, messages FIFO order mein aate hain (jo pehle gaya, wahi pehle process hoga).
- **Cross-partition** — poore system mein koi global order guarantee nahi hai. Isliye partition key use karo (jaise `userId`) taaki related messages same partition pe jaayein.

Socho IRCTC ka PNR status — ek user ke saare updates order mein aane chahiye (booking → confirm → chart prepared). Agar sab alag partitions mein bikhar gaye, toh order guarantee tootiin sakta hai. Isliye `userId` ko key banao.

### Backpressure

Consumer, producer se slow hai toh kya hoga? Broker apni limit tak buffer karega, uske baad:
- RabbitMQ: producer ko block kar dega ya reject kar dega.
- Kafka: producer publish karta rahega; consumer peeche reh jaayega. Isliye **consumer lag** ko ek SLO ki tarah track karo — jaise Swiggy delivery ETA track karta hai ki kitne orders pending hain.

## Code example

### Ek simple producer / consumer (Kafka)

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

Yahan dekho — `OrderController` order save karte hi Kafka pe `OrderPlaced` event daal deta hai aur turant response de deta hai. Email bhejna, isse totally decoupled hai — email service apni marzi se, apni speed se, alag service mein event sunke process karti hai. Agar email service down bhi ho, order placement pe koi asar nahi padta.

### Kafka vs RabbitMQ ek nazar mein

**Konsa broker kab use karein?**

| | Kafka | RabbitMQ |
|---|-------|----------|
| Model | Distributed log, partitioned topics | Queues + exchanges (smart routing) |
| Retention | Din/hafte tak; replay kar sakte ho | Consume hone tak hi |
| Throughput | Bohot high (millions/sec) | High (tens of thousands/sec) |
| Latency | ~10ms | ~1ms |
| Routing | Partition key ke through | Rich (direct, topic, fanout, headers) |
| Ordering | Per partition | Per queue |
| Use case | Event streaming, facts ka log | Task queues, request/reply, complex routing |

**Rule of thumb:**
- Events ka stream chahiye, replay chahiye, high volume hai → **Kafka** lo. Jaise CRED ya Flipkart ka pura order-history/analytics pipeline.
- Tasks/jobs process karne hain, complex routing chahiye, request/reply pattern hai → **RabbitMQ** lo. Jaise OYO ka booking confirmation workflow jisme alag-alag steps pe alag routing chahiye.

### Message types

Socho teen tarah ke messages hote hain, jaise Swiggy app mein teen tarah ke notifications:

- **Command** — "yeh karo" — typically ek hi consumer ke liye directed hota hai (queue). Jaise "restaurant ko order bhejo."
- **Event** — "yeh ho gaya" — typically broadcast hota hai (topic), past-tense mein. Jaise "OrderPlaced" — order place ho chuka hai, ab jisko bhi interest hai woh sun le.
- **Document** — sirf data transfer, koi action implied nahi.
- **Reply** — kisi request ka response (correlation ID ke saath match hota hai).

Naming convention: `OrderPlaced` (event — already ho chuka), `ChargeCard` (command — abhi karna hai). Ek hi channel mein command aur event ko mat mix karo — confusion hoga.

### Partition keys (Kafka)

```java
kafka.send("orders.placed", order.customerId().toString(), event);
//          topic           ^ key — same key → same partition
```

Ek customer ke saare events ek hi partition pe jaate hain → order maintained rehta hai. Alag-alag customers alag partitions mein bant jaate hain → parallelism milta hai.

> [!warning] Hot partition ka khatra: agar 90% traffic ek hi customer ka hai (jaise koi bada bulk buyer), toh ek hi partition sara load le lega aur baaki idle rahenge. Key soch samajh ke choose karo.

## Express/Node comparison

| Concept | Java | Node |
|---------|------|------|
| Kafka client | Spring Kafka | `kafkajs` |
| RabbitMQ client | Spring AMQP | `amqplib` |
| Job queue (Redis) | Spring Data Redis + custom | `bullmq` |
| Pub/Sub abstraction | Spring Cloud Stream | NestJS `@MessagePattern` |
| At-least-once + idempotency | manual karna padta hai | manual karna padta hai |
| Outbox pattern | Spring + Debezium | same |

Dono ecosystems mein **same hi brokers** use hote hain — sirf libraries alag hain, underlying principles same hi rehte hain. Toh agar tumne `bullmq` samajh liya, Spring Kafka/AMQP samajhna easy hoga — bas syntax alag lagega.

## Gotchas

> [!danger] "Message bhej diya matlab kaam ho gaya" — yeh sochna mat
> Producer ka success sirf itna matlab rakhta hai ki message *broker mein pahuch gaya*. Jab tak consume aur ack nahi hota, actual kaam kuch bhi nahi hua. Design karte waqt is gap ko dhyan mein rakho.

> [!warning] Queues ko teams ke beech API ki tarah share mat karo
> Queue ek internal implementation detail hai. Agar publish/consume ka format bina coordination ke change ho gaya, consumers silently break ho jaayenge. Events ko published API contracts ki tarah treat karo.

> [!warning] Schema evolution
> "Maine bas ek field add kiya" — lekin purane consumers break ho gaye toh? Avro/Protobuf with schema registry use karo, ya sirf backward-compatible JSON changes karo (sirf additive changes, kabhi kuch remove/rename mat karo).

> [!warning] Poison messages
> Ek consumer ek hi malformed message pe baar-baar fail ho raha hai → infinite redeliveries → ab DLQ (Dead Letter Queue) ka time aa gaya. Dekho [[06-Dead-Letter-Queues]].

> [!warning] Transactional pitfalls
> Dekho [[../10-Microservices/11-Outbox-Pattern]]. DB write ke saath same transaction mein publish mat karo — outbox pattern use karo.

> [!tip] Events ko immutable facts ki tarah treat karo
> "OrderPlaced(orderId=123, total=$50)" — publish karne ke baad ise mutate mat karo. Naye facts ke liye naye events banao.

## Related
- [[02-Spring-AMQP-RabbitMQ]]
- [[03-Spring-Kafka]]
- [[04-Spring-Cloud-Stream]]
- [[05-Idempotency-and-Retries]]
- [[06-Dead-Letter-Queues]]
- [[../10-Microservices/06-Inter-Service-Communication]]
- [[../10-Microservices/11-Outbox-Pattern]]
