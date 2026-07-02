# Dead Letter Queues (DLQ / DLT)

> [!info] Express/TS dev ke liye
> Jab ek consumer kisi message ko retries ke baad bhi process nahi kar paata, toh usse queue mein hamesha ke liye atkaake nahi rakhna chahiye — nahi toh poora queue jam ho jaayega. Ek **dead letter queue** (RabbitMQ mein) ya **dead letter topic** (Kafka mein) basically ek "parking lot" hai — problematic message wahaan shift ho jaata hai, main queue clear ho jaati hai, aur baad mein koi insaan (ya replay job) us message ko dekhta hai. Bilkul `bullmq` ke "failed jobs" tab jaisa concept hai.

## Concept

**Kya hota hai?** Socho tum Swiggy pe order place karte ho, aur restaurant ka system order accept nahi kar paata — kabhi network issue, kabhi corrupt data. Ab agar Swiggy ka backend usi order ko baar-baar retry karta rahe bina kabhi give up kiye, toh poori queue jam ho jaayegi aur baaki sab orders bhi atak jaayenge. Isliye ek smart system kya karta hai — kuch retries ke baad, agar order phir bhi fail ho raha hai, toh use ek "problem orders" bucket mein daal deta hai. Support team baad mein us bucket ko dekh ke manually resolve karti hai. Yehi DLQ hai.

Poora lifecycle aise samjho:

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

### DLQ mein kya jaata hai?

- **Poison messages** — jo malformed hain, parse hi nahi ho paate.
- **Persistent failures** — downstream service down hai, ya validation hamesha fail ho rahi hai.
- **Bugs** — tumhara code abhi tak us case ko handle nahi kar sakta.

### DLQ mein pade messages ka kya karein?

- Inspect karo (UI se, ya log search se).
- Bug fix karo, redeploy karo, phir messages replay karo.
- Ignore karo (par audit trail ke saath) — agar pata hai data hi galat tha.
- Alert set karo: "DLQ mein > 0 messages hain" — yeh ek **page** (on-call alert) hona chahiye, koi normal log nahi.

## Code example

### RabbitMQ DLQ

**Kyun zaruri hai?** RabbitMQ mein DLQ setup karne ke liye ek DLX (dead letter exchange) declare karna padta hai — jab bhi koi message reject hota hai ya expire hota hai, RabbitMQ use automatically DLX ke through DLQ mein bhej deta hai.

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

Jab koi message **requeue kiye bina reject** hota hai (`basicNack(tag, false, false)`) ya TTL expire ho jaata hai, RabbitMQ use DLX ke through DLQ mein route kar deta hai.

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

Spring ka retry interceptor transient failures ke liye automatic retry karta hai; `max-attempts` hit hone ke baad woh final `nack(requeue=false)` call karta hai → seedha DLQ mein.

### Kafka DLT (Dead Letter Topic)

Kafka mein isko "DLQ" nahi, "DLT" (Dead Letter Topic) kehte hain — kyunki Kafka mein sab kuch topic hai, queue nahi.

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

Failed messages `<topic>.DLT` mein jaate hain — original headers ke saath, plus ek `kafka_dlt-exception-fqcn` header jisse pata chalta hai ki failure kis exception ki wajah se hua.

### DLT message ko inspect karna

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

**Kyun zaruri hai?** Kafka mein blocking retries (jahan tum sleep karke retry karte ho) poori partition ko hold kar dete hain — jaise IRCTC ki tatkal booking line mein agar ek banda counter pe atak jaaye toh peeche wali poori line ruk jaati hai. Non-blocking retries iska solution hain — failed messages ko alag retry topics mein shift kar diya jaata hai, taaki main partition free rahe aur baaki messages process hote rahein.

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

Ye topics automatically create ho jaate hain:
- `orders.placed-retry-0` (1s delay)
- `orders.placed-retry-1` (2s)
- `orders.placed-retry-2` (4s)
- `orders.placed-retry-3` (8s)
- `orders.placed-dlt` (final)

Main consumer block nahi hota — failed messages retry topics mein reschedule ho jaate hain. Jab bahut saare messages intermittently fail ho rahe hon, toh yeh approach throughput ko kaafi improve kar deti hai.

### DLQ se replay karna

**Kyun zaruri hai?** Bug fix karne ke baad, DLQ mein pade messages ko wapas process karna hota hai — jaise Zomato pe agar kisi payment ka webhook fail ho gaya tha aur baad mein fix ho gaya, toh us failed webhook ko wapas trigger karna padta hai.

Ek simple replay job:

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

Ya phir bug fix hone ke baad admin endpoint se manually bhi replay trigger kar sakte ho.

### Monitoring

**Kyun zaruri hai?** Agar DLQ ko monitor nahi kiya toh woh silently grow karta rahega aur kisi ko pata bhi nahi chalega — jab tak koi customer complain na kare ki uska order/payment kahin gum ho gaya. Isliye yeh metrics track karna zaruri hai:

```
rabbitmq_queue_messages{queue="email.dlq"}            > 0   → alert
kafka_consumergroup_lag{topic="orders.placed.DLT"}     > 0   → alert
spring_kafka_listener_seconds_count{result="failure"}  rate  → spike alert
```

In metrics ke dashboards bana do — isse DLQ ek "hidden problem" na rahe balki turant dikhne wali cheez ban jaaye.

## Express/Node comparison

Node.js background se aane wale logon ke liye, yeh dekh lo ki wahi cheez kafkajs mein kaise karte hain:

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
| `@RetryableTopic` non-blocking | `kafkajs-dead-letter` lib ya haath se likha hua logic |
| RabbitMQ `x-dead-letter-exchange` | same `amqplib` arguments |
| `bullmq` `failedJobs` | (Redis-backed jobs ke liye built-in) |

Basically Spring mein yeh sab configuration/annotation driven hai — ek baar setup kar diya toh Spring khud handle karta hai. Node/kafkajs mein tumhe har jagah manually try/catch aur retry-count check karna padta hai.

## Gotchas

> [!danger] DLQ nahi hai = consumer atak jaayega
> Agar DLQ set up nahi hai, toh ek poison message poori queue ko hamesha ke liye block kar dega. Consumer retry karta rahega, throw karega, phir retry karega — infinite loop. Aakhir mein tumhe panic mein `kafka-delete-records` chalana padega. Isliye DLQ pehle din se hi set up karo, baad mein nahi.

> [!warning] DLQ ka matlab "baad mein fix karenge" nahi hai
> Jo DLQ bina touch kiye grow karta rahega, woh invisible data loss hai. DLQ ke messages ko bugs samjho jo fix karne hain, kachra nahi jo ignore karna hai.

> [!warning] DLQ messages mein original payload as-is rehta hai
> Agar DLQ same broker pe hai, toh jisko original topic consume karne ki permission hai usko DLQ bhi access mil jaata hai. Agar message mein personal/sensitive data (jaise phone number, address) hai, toh woh DLQ mein bhi expose ho jaata hai. Encrypt karo ya scrub karo.

> [!warning] Replay carefully karo
> Ek saath 100k DLQ messages replay mat karo — downstream system overwhelm ho jaayega. Throttle karke replay karo. Aur yeh bhi dhyan rakho — ho sakta hai jo original cause tha woh abhi bhi maujood ho.

> [!warning] Non-retryable exceptions ko identify karo
> Bura idea: `DeserializationException` ko 5 baar retry karna — woh 5 baar bhi fail hi hoga, kyunki data hi corrupt hai. `addNotRetryableExceptions` configure karo un cheezon ke liye jo definitely succeed nahi ho sakti (validation errors, parse errors).

> [!tip] DLQ inspector UI bana lo
> Ek basic page jo last 100 DLQ messages ko payload + error + replay button ke saath list kare — ghanton ki debugging bacha deta hai. Kai companies isse ek baar bana ke sabhi services mein reuse karti hain.

> [!tip] DLQ pe TTL rakho
> DLQ messages ko hamesha ke liye store mat karo. 14-30 din ka retention typical hai. Uske baad woh stale ho jaate hain — duniya aage badh chuki hoti hai, purana data ka koi matlab nahi rehta.

## Key Takeaways

- DLQ (RabbitMQ) / DLT (Kafka) ek "parking lot" hai jahan aise messages jaate hain jo max retries ke baad bhi process nahi ho paaye.
- RabbitMQ mein DLX (dead letter exchange) set up karke `x-dead-letter-exchange` aur `x-dead-letter-routing-key` arguments se queue ko wire karte hain.
- Kafka mein `DeadLetterPublishingRecoverer` ke saath `DefaultErrorHandler` use karke failed records ko `<topic>.DLT` mein bhejte hain.
- `@RetryableTopic` (Spring Kafka 2.7+) non-blocking retries deta hai — retry topics create hote hain taaki main partition block na ho.
- Har DLQ ka ek replay strategy hona chahiye — scheduled job ya manual admin endpoint se.
- DLQ ko monitor karna non-negotiable hai — "DLQ > 0 messages" ek alert/page hona chahiye, silent log nahi.
- Non-retryable exceptions (deserialization, validation) ko `addNotRetryableExceptions` se seedha DLQ mein bhejo, waste of retries mat karo.
- DLQ messages mein sensitive data ho sakta hai — access control aur encryption ka dhyan rakho.
- Replay karte time throttle karo, aur DLQ pe reasonable TTL (14-30 din) set karo.

## Related
- [[01-Messaging-Concepts]]
- [[02-Spring-AMQP-RabbitMQ]]
- [[03-Spring-Kafka]]
- [[04-Spring-Cloud-Stream]]
- [[05-Idempotency-and-Retries]]
- [[../10-Microservices/08-Resilience4j]]
- [[../12-Observability/02-Metrics|Metrics & alerts]]
