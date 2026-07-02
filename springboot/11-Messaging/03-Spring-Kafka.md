# Spring Kafka

> [!info] Express/TS dev ke liye
> Kafka ko `kafkajs` ka bada bhai samajh lo — broker wahi hai, bas Spring Kafka tumhe batteries-included producer/consumer + serialization + DLT support de deta hai. Aur ek baat clear kar lete hain — Kafka ek **queue nahi hai**, ye ek **distributed log** hai. Matlab messages days/weeks tak pade rehte hain, multiple consumer groups independently unhe padh sakte hain, aur chaho to purane messages replay bhi kar sakte ho. Agar tumne Node mein kafkajs use kiya hai, to protocol bilkul same hai — bas Java mein syntax alag lagega.

## Concept

Kafka ka mental model samajhna hai to Swiggy/Zomato order pipeline soch lo.

- **Topic** = ek append-only log, jo aage **partitions** mein baata hua hota hai. Jaise "orders.placed" ek topic hai jahan har naya order event aake append hota hai.
- Har **partition** FIFO hai (jo pehle aaya wahi pehle jaayega), lekin partitions ke aar-paar koi global order guarantee nahi hai.
- **Producer** message bhejta hai; **partitioner** decide karta hai ki konse partition mein jaayega — agar key di hai to usी key ke hisaab se, warna round-robin.
- **Consumer** ek topic ko ek **consumer group** ke andar padhta hai. Ek partition group ke andar sirf EK consumer ke paas hoti hai — do consumer ek hi partition simultaneously nahi padh sakte (isi se work distribute hota hai).
- **Offset** = partition ke andar position, jaise "main partition 0 ka message number 42 tak padh chuka hoon." Consumer apna offset commit karta hai taaki progress track ho.
- **Retention** = message kitni der tak store rahega (default 7 din). Isi wajah se replay possible hai — agar bug aaya to purana data dobara process kar sakte ho.

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

Yaha samajhne wali baat ye hai — same message "email-service" group ko bhi milega AUR "analytics" group ko bhi milega (kyunki dono alag groups hain, dono ka apna copy hai). Lekin email-service ke andar, ek message sirf ek hi consumer ko milega — jaise Swiggy mein ek order sirf ek delivery partner ko assign hota hai, sabko nahi.

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
      acks: all                              # sabhi replicas ka wait karo
      properties:
        enable.idempotence: true
        max.in.flight.requests.per.connection: 5
    consumer:
      group-id: order-service
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
      auto-offset-reset: earliest
      enable-auto-commit: false              # manually commit karenge
      properties:
        spring.json.trusted.packages: 'com.example.*'
    listener:
      ack-mode: manual_immediate
      concurrency: 3
      type: single
```

`acks: all` ka matlab — producer tab tak "success" nahi maanega jab tak saare replicas ne message confirm na kar diya ho. Slow thoda hoga, lekin data loss ka risk kam. Ye UPI transaction jaisa hai — jab tak dono bank confirm na karein, transaction "pending" hi rehta hai.

### Topic provisioning (programmatic)

```java
@Configuration
public class KafkaTopics {

    @Bean
    NewTopic ordersPlaced() {
        return TopicBuilder.name("orders.placed")
            .partitions(6)
            .replicas(3)
            .config(TopicConfig.RETENTION_MS_CONFIG, "604800000")   // 7 din
            .build();
    }
}
```

Kya hota hai yaha? Spring startup pe check karta hai ki ye topic exist karta hai ya nahi, agar nahi karta to bana deta hai (bas condition ye hai ki broker aisa karne de — production mein zyada tar teams isse disable rakhte hain aur topics ko manually/Terraform se banate hain).

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
            null,                              // partition (null = partitioner khud choose kare)
            ev.orderId().toString(),           // KEY — same key → same partition (ordering guarantee)
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

Key kyun important hai? Agar tum `orderId` ko key bana doge, to us particular order se related saare events hamesha usi partition mein jaayenge — matlab unka order guaranteed maintain rahega. Zomato ke context mein socho: ek order ke "placed", "confirmed", "picked up", "delivered" events agar alag-alag partitions mein chale gaye to unka processing order bigad sakta hai. Key set karke ye risk khatam ho jaata hai.

Synchronous version (dheeme lekin simple):

```java
kafka.send("orders.placed", key, value).get(5, TimeUnit.SECONDS);
```

> [!tip] Async vs Sync
> `.get()` call karke tum wait karoge jab tak broker confirm na kare — throughput kam ho jaata hai. Production mein zyadatar async (`whenComplete`) hi use hota hai, jaise upar ke pehle example mein dikhaya.

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
            ack.acknowledge();          // offset commit karo
        } catch (TransientException e) {
            // ack mat karo → same offset dobara poll hoga; YA rethrow karo retry handler ke liye
            throw e;
        } catch (Exception e) {
            // ack mat karo — error handler / DLT ke bharose chhodo
            throw e;
        }
    }
}
```

`@KafkaListener` basically ek annotation-based way hai kehne ka "is method ko is topic ke messages ke liye call karo." `Acknowledgment ack` param manual commit ke liye hai — jab tak tum `ack.acknowledge()` nahi bologe, Kafka soch lega ki tumne message process nahi kiya, aur agli baar retry karega. Ye at-least-once delivery ka core mechanism hai.

### Batch consumer

```java
@KafkaListener(topics = "orders.placed",
               containerFactory = "batchKafkaListenerContainerFactory")
public void onBatch(List<OrderPlacedEvent> batch, Acknowledgment ack) {
    repository.saveAll(batch.stream().map(this::project).toList());
    ack.acknowledge();
}
```

`listener.type: batch` set karo aur ek batch-aware factory provide karo. Batch consumer tab kaam aata hai jab ek-ek message process karna slow ho — jaise DB writes batch mein karna zyada efficient hota hai (BigBasket order ke case mein 1000 items ek-ek karke insert karne se accha hai 100-100 ke batch mein insert karna).

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
        backoff.setMaxElapsedTime(120_000L);    // 2 minute baad haar maan lo

        var handler = new DefaultErrorHandler(recoverer, backoff);
        handler.addNotRetryableExceptions(IllegalArgumentException.class);
        return handler;
    }
}
```

Socho ek delivery boy (consumer) ek order process karne ki koshish kar raha hai, lekin baar-baar fail ho raha hai. Ye code bolta hai: "1 second wait karo, dobara try karo. Fail hua? 2 second wait karo. Fir fail? 4 second..." — exponential backoff. Aur agar 2 minute mein bhi successful nahi hua, to message ko "orders.placed.DLT" (Dead Letter Topic) mein daal do, taaki baad mein manually inspect kar sako. Detail ke liye [[06-Dead-Letter-Queues]] dekho.

`IllegalArgumentException` jaisi exceptions ko "not retryable" mark karna important hai — kyunki agar data hi galat hai (jaise malformed JSON), to 10 baar retry karne se bhi kuch nahi badlega, sirf time waste hoga.

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
    // dono commit honge atomically YA dono abort ho jaayenge
}
```

Ye `read_committed` consumers ke saath combine karke tumhe Kafka topics ke aar-paar exactly-once semantics deta hai. Lekin dhyan rakho — **ye DB transactions ke saath span nahi karta**. Matlab agar tum ek hi method mein DB save aur Kafka publish dono kar rahe ho, to ye transaction unhe atomically link nahi karega. Uske liye [[../10-Microservices/11-Outbox-Pattern]] use karo.

### Schema evolution Avro / Schema Registry ke saath

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

Kyun zaruri hai ye? Socho tumne ek event ka schema badal diya (field remove ya rename kar diya), aur consumer ko pata hi nahi chala — runtime mein crash. Avro + Schema Registry ye galti producer-time pe hi pakad leta hai, consumer ke crash hone se pehle. Ye ek tarah ka "TypeScript ka type-check" hai lekin producer aur consumer ke beech, alag services mein.

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

Ye test asli Docker container mein Kafka spin up karta hai, message publish karta hai, aur verify karta hai ki consumer ne sahi se process kiya. `await()` isliye use hota hai kyunki Kafka processing async hai — message bhejte hi turant result nahi milega, thoda wait karna padega.

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
    // offsets default mein auto-commit ho jaate hain
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

Bas fark itna hai — Spring ke listeners zyada declarative hain (annotation likho aur bhool jao), jabki kafkajs tumhe imperative control deta hai (khud loop, khud error handling likho). Jo Node se aaye ho unke liye Spring thoda "magic" jaisa lagega shuru mein, lekin ek baar samajh aa gaya to boilerplate bahut kam ho jaata hai.

## Gotchas

> [!warning] Auto-commit bugs chhupa deta hai
> Default `enable-auto-commit=true` hoti hai to har 5 second mein offset commit ho jaata hai — chahe beech mein processing fail hi kyun na ho gayi ho. Matlab tumhara message "processed" maan liya gaya, jabki asal mein fail hua tha aur data loss ho gaya. Isliye hamesha `enable-auto-commit: false` + manual ack use karo agar at-least-once delivery chahiye.

> [!warning] Partitions ki sankhya ≥ consumer threads honi chahiye
> 3 partitions hain aur group mein 5 consumers hain → 2 consumers khali baithe rahenge, kuch kaam nahi milega. Jaise agar tumhare paas sirf 3 delivery zones hain to 5 delivery boys mein se 2 idle rahenge. Apne peak parallelism ke hisaab se partition count plan karo.

> [!danger] Repartitioning bahut painful hai
> Partitions badhaane se key→partition ka mapping badal jaata hai. Jo messages pehle `customerId` ke hisaab se ek partition mein jaate the, wo naye messages ke saath co-partitioned nahi rahenge — matlab ordering guarantee toot jaayegi. Isliye partition count ko shuru mein hi soch samajh kar plan karo, baad mein badalna mushkil hota hai.

> [!warning] Hot keys ka masla
> Agar 80% traffic ek hi key pe aa raha hai (jaise ek hi mega-seller ke saare orders), to ek hi partition pe 80% load pad jaayega — baaki partitions khali baithe rahenge. Partition lag monitor karo, aur zarurat pade to sub-keying consider karo (jaise `customerId + ":" + region`).

> [!warning] `auto-offset-reset` ka behavior samajh lo
> `earliest` = agar koi committed offset nahi hai to shuru se padho. `latest` = jo pehle se maujood messages hain unhe skip karo, sirf naye padho. Dev environment mein galat choice karne se ye classic bug aata hai: "mera consumer messages dekh hi nahi raha" — jabki asal mein wo sirf naye messages ka wait kar raha hai.

> [!warning] Consumer rebalancing pause laata hai
> Jab koi consumer group join/leave karta hai, poora group rebalance hota hai — is dauraan saare consumers thodi der ke liye ruk jaate hain. `static membership` aur `cooperative-sticky` assignor use karke ye pauses kam kiye ja sakte hain.

> [!tip] Lag sabse important metric hai
> `kafka_consumer_lag` per partition track karo. Agar ye sustained tarike se N se upar rahe to alert lagao. Lag badhna matlab consumer processing speed se message aane ki speed zyada hai — kahin na kahin bottleneck hai.

> [!tip] Unit tests ke liye Spring Kafka Test use karo
> `@EmbeddedKafka` ek in-memory broker boot kar deta hai — fast tests, Docker ki zarurat nahi. Integration tests ke liye Testcontainers better hai kyunki wo real Kafka broker jaisa behavior deta hai.

## Related
- [[01-Messaging-Concepts]]
- [[02-Spring-AMQP-RabbitMQ]]
- [[04-Spring-Cloud-Stream]]
- [[05-Idempotency-and-Retries]]
- [[06-Dead-Letter-Queues]]
- [[../10-Microservices/11-Outbox-Pattern]]
- [[../10-Microservices/10-Saga-Pattern]]
