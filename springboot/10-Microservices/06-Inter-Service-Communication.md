---
tags: [microservices, communication, rest, grpc, messaging]
aliases: [Service Communication, IPC]
stage: advanced
---

# Inter-Service Communication

> [!info] For the Express/TS dev
> Once you have multiple services, you need to decide how they talk. Three big families: synchronous HTTP/REST (or gRPC), and asynchronous messaging. Each has costs. Defaulting to synchronous REST is the most common — and most regretted — choice. Build with async-first in mind.

## Concept

Three communication patterns:

| Pattern | Coupling | Latency | Resilience | When to use |
|---------|----------|---------|-----------|-------------|
| **Synchronous REST** | Tight | Direct | Caller fails when callee fails | User-facing reads, simple commands |
| **gRPC** | Tight (schema) | Faster than REST | Same as REST | High-RPC internal calls, streaming, polyglot |
| **Async messaging** | Loose | Eventual | Callee can be down | Events, fan-out, decoupled workflows |

### Synchronous (request/response)

Service A makes an HTTP call to Service B and waits.

```
A ─── POST /charge ──► B
A ◄── 200 OK ─────────┘
```

Pros: simple to reason about, easy debugging, immediate feedback.
Cons: A is blocked until B responds; if B is down, A is impaired (the **distributed monolith** trap).

Tools in Spring:

- `RestTemplate` — old, blocking, still works.
- `RestClient` — new (Boot 3.2+), blocking, fluent.
- `WebClient` — reactive, non-blocking.
- **OpenFeign** — declarative interface-based. See [[07-OpenFeign]].
- **gRPC** via `grpc-spring-boot-starter`.

### Asynchronous (events)

A publishes an event; B subscribes and reacts when it can.

```
A ─── OrderPlaced ──► broker ──► B (eventually)
```

Pros: A doesn't care if B is up; B can be slow without affecting A; fan-out to many consumers.
Cons: eventual consistency, harder debugging, requires brokers (Kafka/RabbitMQ), tooling overhead.

See [[../11-Messaging/01-Messaging-Concepts]].

### Choosing per interaction

A real system uses both. For a typical e-commerce checkout:

```
User → API Gateway → Order Service (sync REST: validate, create order)
                          │
                          ├── sync gRPC → Inventory Service (reserve stock)
                          ├── sync REST → Payment Service (charge)
                          └── async → Kafka "OrderPlaced" event
                                          │
                                          ├──► Email Service (send confirmation)
                                          ├──► Analytics Service (track)
                                          └──► Shipping Service (start fulfilment)
```

Sync where the user is waiting and needs an immediate answer. Async for everything that can happen "soon."

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

### gRPC

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

// Consumer (in another service)
@Component
class EmailListener {
    @KafkaListener(topics = "orders.placed", groupId = "email-service")
    void on(OrderPlaced ev) {
        emailService.sendConfirmation(ev.customerId(), ev.orderId());
    }
}
```

See [[../11-Messaging/03-Spring-Kafka]] for full setup.

## Express/Node comparison

| Spring | Node |
|--------|------|
| `RestClient` / `RestTemplate` | `axios`, `got`, `fetch` |
| OpenFeign | `axios` with custom interface (no real equivalent) |
| `WebClient` | `axios` returning Promises |
| gRPC + `grpc-spring-boot-starter` | `@grpc/grpc-js` |
| `KafkaTemplate` | `kafkajs` |
| `@KafkaListener` | `kafkajs` consumer |
| Spring Cloud Stream | NestJS Microservices |

## Gotchas

> [!danger] Sync chains kill availability
> Service A sync-calls B sync-calls C sync-calls D. Availability of A = product of B × C × D. Each at 99.9% → A at 99.7%. With ten services in a chain, you're at 99% — that's 7+ hours of downtime per month.

> [!warning] Retries amplify load during partial outages
> When B starts to slow, A retries → 3x load on B → B falls over completely. Combine retries with circuit breakers and exponential backoff. See [[08-Resilience4j]].

> [!warning] Distributed transactions don't exist
> "If charge succeeds but inventory doesn't, undo the charge" — there's no XA transaction across HTTP. Use the [[10-Saga-Pattern]] or [[11-Outbox-Pattern]].

> [!warning] Synchronous fanout
> If a controller calls 5 services and you do them sequentially, total latency = sum of 5. Parallelize with `CompletableFuture.allOf()` or reactive `Flux`.

> [!tip] gRPC isn't always faster
> The protobuf serialization wins, but the framework overhead is meaningful. gRPC shines for high-RPS internal traffic and streaming. For occasional calls, REST is fine and easier to debug.

> [!tip] Default to async for non-user-facing flows
> If a notification, analytics push, or downstream replication can happen "soon" rather than "now" — use events. The system is more resilient and you can bring services up/down independently.

## Related
- [[01-What-is-a-Microservice]]
- [[02-Spring-Cloud-Overview]]
- [[07-OpenFeign]]
- [[08-Resilience4j]]
- [[10-Saga-Pattern]]
- [[11-Outbox-Pattern]]
- [[../11-Messaging/01-Messaging-Concepts]]
- [[../11-Messaging/03-Spring-Kafka]]
