# Spring AMQP / RabbitMQ

> [!info] Express/TS dev ke liye
> RabbitMQ ek workhorse broker hai — tasks, RPC, aur complex routing ke liye best. Spring AMQP isko wrap karta hai familiar `Template` + `Listener` pattern ke saath. Node mein closest equivalent hai `amqplib` (raw) ya NestJS ka AMQP transport. RabbitMQ tab chamakta hai jab tumhe rich routing chahiye (topic exchanges, headers exchanges) ya low-latency request/reply chahiye.

## Concept

Socho tum Swiggy pe order karte ho. Restaurant (producer) order ko seedha delivery boy (consumer) ko nahi deta — order pehle jaata hai Swiggy ke dispatch system (exchange) ke paas, aur dispatch system decide karta hai ki kaunsa order kis area ke delivery queue mein jaayega (routing key + binding ke basis pe). RabbitMQ bhi bilkul yahi karta hai.

RabbitMQ ka mental model:

- **Producer** publish karta hai ek **exchange** pe.
- **Exchange** message ko route karta hai ek ya multiple **queues** tak, based on **bindings** + **routing key**.
- **Consumers** queues se read karte hain.

Yaad rakho — producer kabhi bhi directly queue ko nahi jaanta, sirf exchange ko jaanta hai. Ye decoupling hi RabbitMQ ki power hai.

Exchange types:

| Type | Routing kaise hota hai |
|------|---------|
| `direct` | Routing key, binding key se exactly match hona chahiye. |
| `topic` | Wildcard match routing key pe (`order.*.created`, `#.urgent`) — jaise Swiggy "sabhi Koramangala ke urgent orders" ko match kar sakta hai. |
| `fanout` | Sabhi bound queues ko bhej do. Pure Pub/Sub — jaise ek broadcast notification sabko jaata hai. |
| `headers` | Header values pe match karta hai (rarely use hota hai). |

Default exchange `""` tumhe seedha queue name se publish karne deta hai — simple work queues ke liye kaafi handy hai.

## Code example

### Setup

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-amqp</artifactId>
</dependency>
```

```yaml
spring:
  rabbitmq:
    host: localhost
    port: 5672
    username: guest
    password: guest
    listener:
      simple:
        acknowledge-mode: manual
        retry:
          enabled: true
          initial-interval: 1s
          max-attempts: 5
          multiplier: 2
        default-requeue-rejected: false
```

### Topology declare karna

Kya hota hai yahan? Hum Java code se hi exchanges, queues, aur bindings define kar rahe hain — RabbitMQ admin panel mein manually click-click karke banane ki zarurat nahi. Spring startup pe khud hi ye sab create/verify kar leta hai.

```java
@Configuration
public class RabbitConfig {

    public static final String ORDER_EXCHANGE = "order.exchange";
    public static final String EMAIL_QUEUE    = "email.queue";
    public static final String AUDIT_QUEUE    = "audit.queue";

    @Bean
    TopicExchange orderExchange() {
        return new TopicExchange(ORDER_EXCHANGE, true, false);
    }

    @Bean
    Queue emailQueue() {
        return QueueBuilder.durable(EMAIL_QUEUE)
            .withArgument("x-dead-letter-exchange", "dlx.exchange")
            .withArgument("x-dead-letter-routing-key", "email.dlq")
            .build();
    }

    @Bean
    Queue auditQueue() {
        return QueueBuilder.durable(AUDIT_QUEUE).build();
    }

    @Bean
    Binding emailBinding(Queue emailQueue, TopicExchange orderExchange) {
        return BindingBuilder.bind(emailQueue).to(orderExchange).with("order.placed");
    }

    @Bean
    Binding auditBinding(Queue auditQueue, TopicExchange orderExchange) {
        return BindingBuilder.bind(auditQueue).to(orderExchange).with("order.#");
    }

    @Bean
    Jackson2JsonMessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    RabbitTemplate rabbitTemplate(ConnectionFactory cf, MessageConverter conv) {
        var t = new RabbitTemplate(cf);
        t.setMessageConverter(conv);
        t.setMandatory(true);                      // unroutable → ReturnCallback
        return t;
    }
}
```

Dekho `auditBinding` mein routing key `"order.#"` use kiya hai — matlab "order." se shuru hone wala koi bhi routing key (order.placed, order.cancelled, order.shipped, sab) audit queue mein bhi jaayega. Ye topic exchange ka wildcard power hai.

### Producer

Kya kar raha hai ye? `OrderPublisher` bas ek message ko exchange pe daal raha hai, saath mein kuch metadata (message ID, event type) bhi attach kar raha hai taaki consumer side pe traceability rahe.

```java
@Service
public class OrderPublisher {
    private final RabbitTemplate rabbit;

    public OrderPublisher(RabbitTemplate rabbit) { this.rabbit = rabbit; }

    public void publishPlaced(OrderPlacedEvent ev) {
        rabbit.convertAndSend(
            RabbitConfig.ORDER_EXCHANGE,
            "order.placed",                           // routing key
            ev,
            msg -> {                                  // message post-processor
                msg.getMessageProperties().setMessageId(ev.orderId().toString());
                msg.getMessageProperties().setHeader("eventType", "OrderPlaced");
                return msg;
            });
    }
}
```

### Consumer

Yahan asli game hai — manual acknowledgement. Jaise Zomato delivery boy jab tak order deliver karke confirm nahi karta, order "pending" hi rehta hai. Waise hi yahan jab tak `channel.basicAck` call nahi hota, RabbitMQ maanta hai ki message process nahi hua.

```java
@Component
public class EmailListener {

    private final EmailService email;

    public EmailListener(EmailService email) { this.email = email; }

    @RabbitListener(queues = RabbitConfig.EMAIL_QUEUE)
    public void on(OrderPlacedEvent ev,
                   Channel channel,
                   @Header(AmqpHeaders.DELIVERY_TAG) long tag) throws IOException {
        try {
            email.sendConfirmation(ev.customerId(), ev.orderId());
            channel.basicAck(tag, false);            // success pe ack
        } catch (TransientException e) {
            channel.basicNack(tag, false, true);     // requeue — dobara try karo
        } catch (Exception e) {
            channel.basicNack(tag, false, false);    // → DLQ bhej do, requeue mat karo
        }
    }
}
```

Teen cases samjho: success pe `basicAck`. Agar temporary error hai (jaise network glitch) to `basicNack(tag, false, true)` — requeue kar do, phir try hoga. Agar permanent error hai (jaise bad data) to `basicNack(tag, false, false)` — seedha Dead Letter Queue mein bhej do, warna infinite retry loop ban jaayega.

### Idempotent consumer (duplicate messages handle karna)

Kyun zaruri hai? RabbitMQ "at-least-once" delivery guarantee deta hai — matlab kabhi-kabhi same message do baar deliver ho sakta hai (network blip, consumer crash after processing but before ack, etc). Agar tumhara consumer duplicate-safe nahi hai, to customer ko do baar email chala jaayega ya do baar payment deduct ho sakta hai. UPI transactions mein bhi yahi problem solve karne ke liye idempotency keys use hote hain.

```java
@Component
class EmailListener {
    private final ProcessedEventRepository processed;

    @RabbitListener(queues = "email.queue")
    @Transactional
    public void on(OrderPlacedEvent ev,
                   @Header(AmqpHeaders.MESSAGE_ID) String messageId) {
        if (processed.existsById(messageId)) {
            return; // duplicate hai, skip kar do
        }
        email.sendConfirmation(ev);
        processed.save(new ProcessedEvent(messageId, Instant.now()));
    }
}
```

Simple logic — DB mein ek table rakho jisme processed message IDs store hon. Naya message aane pe pehle check karo "ye ID pehle process ho chuka hai kya?" Agar haan, to bas return kar do, dobara kaam mat karo.

### Publisher confirms (durability ke liye)

Kya hota hai bina isके? "Send" call return ho jaata hai success ke saath jaise hi message local socket buffer mein chala jaata hai — iska matlab ye nahi ki broker tak pahuncha bhi! Ye bilkul waisa hi hai jaise tum WhatsApp pe message bhejo aur ek single tick dikhe (sent from your phone) lekin double tick (delivered to server) na aaye.

```yaml
spring:
  rabbitmq:
    publisher-confirm-type: correlated
    publisher-returns: true
```

```java
rabbit.setConfirmCallback((corr, ack, cause) -> {
    if (!ack) log.error("publish failed: {}", cause);
});
rabbit.setReturnsCallback(ret ->
    log.error("unroutable: {} {}", ret.getReplyText(), ret.getMessage()));

// send karte waqt
var corr = new CorrelationData(ev.orderId().toString());
rabbit.convertAndSend(exchange, key, ev, corr);
```

`ConfirmCallback` batata hai ki broker ne message accept kiya ya nahi. `ReturnsCallback` batata hai ki agar message kisi bhi queue mein route hi nahi ho paaya (matlab binding hi nahi mili) to kya hua. Production systems mein critical payments/orders ke liye ye dono zaroor lagao.

### Request/Reply (RPC)

Kabhi-kabhi tumhe sirf fire-and-forget nahi, balki reply chahiye hota hai — jaise ek microservice doosre se sync response maangta hai. RabbitMQ isko bhi handle kar sakta hai:

```java
// Server side
@RabbitListener(queues = "rpc.queue")
String handle(String request) {
    return "echo: " + request;
}

// Client side
String reply = (String) rabbit.convertSendAndReceive("rpc.queue", "ping");
```

Spring khud hi correlation IDs aur reply-to queues handle kar leta hai — tumhe manually koi temporary queue banane ki zarurat nahi. Lekin real-world mein iska use kam hota hai kyunki ye synchronous coupling create karta hai — agar tumhe sirf sync call chahiye, to REST/gRPC zyada seedha option hai. RPC-over-AMQP tab useful hai jab tumhe RabbitMQ ke routing/load-balancing features ke saath request/reply chahiye ho.

### Concurrency

```yaml
spring:
  rabbitmq:
    listener:
      simple:
        concurrency: 5         # per listener kitne threads
        max-concurrency: 20
        prefetch: 50           # ek consumer ke paas kitne in-flight messages
```

`prefetch` (channel QoS) bahut critical setting hai. Isse tum control karte ho ki ek consumer ko ek time pe kitne unacknowledged messages mil sakte hain. Bina iske RabbitMQ ek hi consumer pe hazaron messages daal sakta hai — jaise ek hi Swiggy delivery boy ko ek saath 1000 orders assign kar dena, jabki wo handle hi nahi kar payega.

## Express/Node comparison

```typescript
// amqplib
import amqp from "amqplib";

const conn = await amqp.connect("amqp://localhost");
const ch = await conn.createChannel();
await ch.assertQueue("email.queue", { durable: true });

// publish
ch.publish("order.exchange", "order.placed", Buffer.from(JSON.stringify(ev)));

// consume
ch.consume("email.queue", async (msg) => {
  if (!msg) return;
  const ev = JSON.parse(msg.content.toString());
  try {
    await email.sendConfirmation(ev);
    ch.ack(msg);
  } catch (e) {
    ch.nack(msg, false, false);
  }
}, { noAck: false });
```

| Spring AMQP | amqplib (Node) |
|-------------|----------------|
| `@RabbitListener` | `ch.consume(...)` |
| `RabbitTemplate.convertAndSend` | `ch.publish` |
| `@Configuration` topology | `assertExchange/assertQueue/bindQueue` |
| `Jackson2JsonMessageConverter` | manual `JSON.stringify/parse` |
| Publisher confirms | `confirmChannel` |
| `RabbitTemplate.convertSendAndReceive` | `amqplib-rpc` lib |

Spring ka wiring zyada declarative hai — annotations aur config beans se sab set ho jaata hai. Node ka approach zyada fine control deta hai, lekin har cheez tumhe khud likhni padti hai (JSON parsing, error handling, sab manual).

## Gotchas

> [!danger] Auto-ack mode crash pe messages loss kar deta hai
> `acknowledge-mode: auto` (Spring ka default) listener ke return hone se PEHLE hi ack kar deta hai. Agar listener andar se exception throw kare uske baad — broker to already maan chuka hai "done ho gaya", message gone forever. Hamesha `manual` use karo aur success pe hi ack karo.

> [!warning] Default `requeue-rejected: true`
> Agar tumne `default-requeue-rejected: false` set nahi kiya, to ek poison message (jo hamesha fail hota hai) nack ho ke requeue hoga → phir consume hoga → phir fail hoga → ... infinite loop ban jaayega. DLQs zaroor configure karo.

> [!warning] Consume ke baad koi retention nahi
> Ek baar message ack ho gaya, RabbitMQ usko delete kar deta hai. Kafka ki tarah nahi hai — yahan replay possible nahi. Agar tumhe event history chahiye (audit, analytics, replay), to DB mein bhi likho ya Kafka use karo.

> [!warning] Connection pooling
> Har `Channel` single-threaded hota hai lekin banane mein cheap hai. Spring ka listener container ye sab khud manage karta hai. Ek `Channel` ko manually multiple threads mein share mat karo — race conditions aa jaayenge.

> [!warning] Heartbeats aur idle disconnects
> Agar consumer lambe time tak idle rehta hai (koi traffic nahi), to connection firewall/load-balancer ke through drop ho sakta hai. `requested-heartbeat: 30s` set karo taaki connection healthy rahe.

> [!tip] Production mein `quorum queues` use karo
> Default classic queues single-node hoti hain — agar wo node down ho gaya, data gaya. Quorum queues Raft-replicated hote hain (multiple nodes pe copy rehta hai), jaise ek important cheez ko multiple jagah backup rakhna:
> ```java
> QueueBuilder.durable("orders").quorum().build();
> ```

## Related
- [[01-Messaging-Concepts]]
- [[03-Spring-Kafka]]
- [[04-Spring-Cloud-Stream]]
- [[05-Idempotency-and-Retries]]
- [[06-Dead-Letter-Queues]]
