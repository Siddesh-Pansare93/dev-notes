# Inter-Service Communication

> [!info] Express/TS dev ke liye
> Jaise hi tumhare paas ek se zyada services aa jaati hain, sabse pehla sawaal yeh hota hai — yeh services aapas mein baat kaise karengi? Teen bade families hain: synchronous HTTP/REST (ya gRPC), aur asynchronous messaging. Har ek ki apni cost hai. Zyadatar log default REST pakad lete hain — aur baad mein pachtaate hain. Shuru se hi async-first soch ke design karo.

## Concept

Kya hota hai? Basically teen tarike hain services ko baat karwane ke:

| Pattern | Coupling | Latency | Resilience | Kab use karein |
|---------|----------|---------|-----------|-------------|
| **Synchronous REST** | Tight | Direct | Caller bhi fail hoga agar callee fail ho | User-facing reads, simple commands |
| **gRPC** | Tight (schema) | REST se fast | REST jaisa hi | High-RPC internal calls, streaming, polyglot |
| **Async messaging** | Loose | Eventual | Callee down ho toh bhi chalega | Events, fan-out, decoupled workflows |

### Synchronous (request/response)

Socho Zomato ka order flow — jab tum "Place Order" dabate ho, restaurant app ko turant confirm karna padta hai ki order accept hua ya nahi, tabhi tumhe screen pe "Order Confirmed" dikhta hai. Yeh hai synchronous — Service A, Service B ko call karta hai aur wait karta hai jab tak reply nahi aata.

```
A ─── POST /charge ──► B
A ◄── 200 OK ─────────┘
```

**Fayda**: samajhna easy hai, debug karna easy hai, turant feedback milta hai.
**Nuksan**: A tab tak block rehta hai jab tak B jawab nahi deta; agar B down hai toh A bhi impaired ho jaata hai. Isi ko **distributed monolith** trap kehte hain — tumne services alag kiye, par unka fate ab bhi ek-dusre se juda hai.

Spring mein tools:

- `RestTemplate` — purana, blocking, ab bhi chalta hai.
- `RestClient` — naya (Boot 3.2+), blocking, fluent syntax.
- `WebClient` — reactive, non-blocking.
- **OpenFeign** — declarative interface-based. Dekho [[07-OpenFeign]].
- **gRPC** via `grpc-spring-boot-starter`.

### Asynchronous (events)

Ab socho Swiggy ka order placed hone ke baad kya hota hai — restaurant ko notification jaata hai, delivery partner assign hota hai, tumhe SMS/push notification aata hai, analytics team ko data jaata hai. Yeh sab cheezein **turant** hone ki zarurat nahi — "thodi der mein ho jayega" chalta hai. Yahi hai async messaging.

A ek event publish karta hai; B (aur C, D, jitne bhi consumers hon) subscribe karke jab fursat mile tab react karte hain.

```
A ─── OrderPlaced ──► broker ──► B (eventually)
```

**Fayda**: A ko fark nahi padta B up hai ya down; B slow chal raha ho toh bhi A pe asar nahi padta; ek event se multiple consumers ko fan-out kar sakte ho.
**Nuksan**: eventual consistency (thoda time lagta hai sync hone mein), debugging thodi mushkil (kyunki flow ek jagah nahi dikhta), aur brokers (Kafka/RabbitMQ) chalane ka tooling overhead.

Dekho [[../11-Messaging/01-Messaging-Concepts]].

### Kaunsa interaction ke liye kya choose karein?

Real system mein dono ka mix hota hai. Ek typical e-commerce checkout socho — jaise Flipkart pe order place karna:

```
User → API Gateway → Order Service (sync REST: validate, create order)
                          │
                          ├── sync gRPC → Inventory Service (stock reserve karo)
                          ├── sync REST → Payment Service (paisa katao)
                          └── async → Kafka "OrderPlaced" event
                                          │
                                          ├──► Email Service (confirmation bhejo)
                                          ├──► Analytics Service (track karo)
                                          └──► Shipping Service (fulfilment shuru karo)
```

**Rule of thumb**: jahan user screen pe wait kar raha hai aur usse turant jawab chahiye — wahan sync use karo. Baaki sab jo "thodi der mein" ho sakta hai — usko async bana do.

## Code example

### REST with `RestClient` + Resilience4j

```java
@Service
class PaymentClient {
    private final RestClient client;
    private final Retry retry;
    private final CircuitBreaker breaker;

    PaymentClient(RestClient.Builder builder, Resilience4jProvider r4j) {
        this.client = builder.baseUrl("http://payment-service").build();
        this.retry = r4j.retry("paymentClient");
        this.breaker = r4j.circuitBreaker("paymentClient");
    }

    String charge(int amount) {
        Supplier<String> call = () -> client.post().uri("/charge")
            .body(Map.of("amount", amount))
            .retrieve()
            .body(String.class);

        return Decorators.ofSupplier(call)
            .withRetry(retry)
            .withCircuitBreaker(breaker)
            .get();
    }
}
```

Yahan pe dekho — sirf `RestClient` se call nahi kar rahe, `Retry` aur `CircuitBreaker` ke saath wrap kiya hai. Kyun? Kyunki agar payment-service thoda slow ho gaya, retry try karega dobara, aur agar woh baar-baar fail ho raha hai toh circuit breaker aage retries rokega taaki poora system na girein. Isse [[08-Resilience4j]] mein detail mein padhenge.

### gRPC

gRPC ko socho ek "private, super-fast phone line" ki tarah do services ke beech — jab data ka format fix ho (protobuf schema se defined) aur calls bohot frequent hon, jaise IRCTC ka seat-availability check jo baar-baar hota hai.

```protobuf
// payment.proto
syntax = "proto3";
service PaymentService {
  rpc Charge (ChargeRequest) returns (ChargeResponse);
}
message ChargeRequest { int32 amount = 1; }
message ChargeResponse { string txn_id = 1; }
```

Server (Spring):

```java
@GrpcService
public class PaymentGrpcImpl extends PaymentServiceGrpc.PaymentServiceImplBase {
    @Override
    public void charge(ChargeRequest req, StreamObserver<ChargeResponse> resp) {
        var txn = doCharge(req.getAmount());
        resp.onNext(ChargeResponse.newBuilder().setTxnId(txn).build());
        resp.onCompleted();
    }
}
```

Client:

```java
@Service
class OrderService {
    @GrpcClient("payment-service")
    private PaymentServiceGrpc.PaymentServiceBlockingStub stub;

    String charge(int amount) {
        var resp = stub.charge(ChargeRequest.newBuilder().setAmount(amount).build());
        return resp.getTxnId();
    }
}
```

```yaml
grpc:
  client:
    payment-service:
      address: 'static://payment-service:9090'
      negotiation-type: plaintext
```

### Async via Kafka

Ab yeh dekho — jab order place hota hai, hum ek event "throw" kar dete hain Kafka mein, aur jisko bhi sunna hai woh sunn le. Order Service ko yeh bhi pata nahi ki Email Service exist karta hai — bas itna pata hai ki "OrderPlaced" topic pe message daal do.

```java
// Producer
@Service
class OrderService {
    private final KafkaTemplate<String, OrderPlaced> kafka;

    public Order place(Cart cart) {
        var order = save(cart);
        kafka.send("orders.placed", order.id().toString(),
            new OrderPlaced(order.id(), order.customerId(), order.total()));
        return order;
    }
}

// Consumer (doosri service mein)
@Component
class EmailListener {
    @KafkaListener(topics = "orders.placed", groupId = "email-service")
    void on(OrderPlaced ev) {
        emailService.sendConfirmation(ev.customerId(), ev.orderId());
    }
}
```

Poora setup [[../11-Messaging/03-Spring-Kafka]] mein dekho.

## Express/Node comparison

| Spring | Node |
|--------|------|
| `RestClient` / `RestTemplate` | `axios`, `got`, `fetch` |
| OpenFeign | `axios` with custom interface (koi real equivalent nahi) |
| `WebClient` | `axios` returning Promises |
| gRPC + `grpc-spring-boot-starter` | `@grpc/grpc-js` |
| `KafkaTemplate` | `kafkajs` |
| `@KafkaListener` | `kafkajs` consumer |
| Spring Cloud Stream | NestJS Microservices |

## Gotchas

> [!danger] Sync chains availability maar dete hain
> Socho Service A sync-call karta hai B ko, B call karta hai C ko, C call karta hai D ko. A ki availability = B × C × D ka product. Agar har ek 99.9% available hai, toh A sirf 99.7% pe aa jaata hai. Das services ki chain mein toh tum 99% pe aa jaoge — matlab mahine mein 7+ ghante downtime. Yeh CRED jaisi finance app mein bilkul afford nahi kar sakte.

> [!warning] Retries partial outage mein load amplify kar dete hain
> Jab B slow hona shuru hota hai, A retry karta hai → B pe 3x load pad jaata hai → B poora crash ho jaata hai. Retries ko hamesha circuit breakers aur exponential backoff ke saath combine karo. Dekho [[08-Resilience4j]].

> [!warning] Distributed transactions exist hi nahi karte
> "Agar charge success ho gaya lekin inventory reserve fail ho gaya, toh charge undo kar do" — HTTP ke across koi XA transaction nahi hoti. Iske liye [[10-Saga-Pattern]] ya [[11-Outbox-Pattern]] use karo.

> [!warning] Synchronous fanout ka trap
> Agar ek controller 5 services ko sequentially call karta hai, toh total latency in sab ka **sum** hoga. Isse parallelize karo `CompletableFuture.allOf()` ya reactive `Flux` se — warna user ek simple checkout ke liye 5 seconds wait karega.

> [!tip] gRPC hamesha fast nahi hota
> Protobuf serialization ka fayda milta hai, par framework overhead bhi hota hai jo ignore nahi kar sakte. gRPC tab shine karta hai jab high-RPS internal traffic ho ya streaming ki zarurat ho. Occasional calls ke liye REST hi theek hai aur debug karna aasan hai.

> [!tip] Non-user-facing flows ke liye async default rakho
> Agar koi notification, analytics push, ya downstream replication "abhi" nahi "thodi der mein" ho sakta hai — event use karo. System zyada resilient banega aur services ko independently up/down kar sakte ho, bina ek-dusre ko todhe.

## Related
- [[01-What-is-a-Microservice]]
- [[02-Spring-Cloud-Overview]]
- [[07-OpenFeign]]
- [[08-Resilience4j]]
- [[10-Saga-Pattern]]
- [[11-Outbox-Pattern]]
- [[../11-Messaging/01-Messaging-Concepts]]
- [[../11-Messaging/03-Spring-Kafka]]
