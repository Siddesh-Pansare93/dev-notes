# Saga Pattern (Orchestration vs Choreography)

> [!info] Express/TS dev ke liye
> Monolith mein tumne ek hi DB transaction use kiya hota hai: `BEGIN; charge; reserve; ship; COMMIT`. Agar beech mein kuch fail ho gaya, database khud sab kuch `ROLLBACK` kar deta hai — tumhe kuch karna hi nahi padta. Lekin microservices mein yeh luxury nahi hai, kyunki **har service ka apna alag DB hai**. Ek single ACID transaction possible hi nahi hai jo Order + Payment + Inventory teeno DB ko ek saath touch kare. Yahin pe **Saga pattern** kaam aata hai — yeh ACID transaction ki jagah local transactions ki ek chain use karta hai, aur agar beech mein kuch fail ho jaaye toh **compensating actions** (matlab manually "undo" karne wale steps) chalata hai. Socho isse "redo log + manual rollback" jaisa — automatic `ROLLBACK;` nahi milega, tumhe khud likhna padega ki "agar yeh step fail ho, toh peeche wale steps ko kaise undo karna hai."

## Concept

**Kya hota hai?** Saga basically local transactions ka ek sequence hai. Har step apne khud ke service/DB mein commit hota hai. Agar step N fail ho jaaye, toh steps 1 se N-1 tak ke liye compensating actions chalao taaki unka effect logically undo ho jaaye.

Yeh Zomato ke order flow jaisa socho — jab tum order place karte ho, alag-alag "services" involved hoti hain: restaurant confirm karta hai, payment gateway charge karta hai, delivery partner assign hota hai. Agar delivery partner available hi nahi mila, toh restaurant ko "order cancel" bolna padega aur payment ko refund karna padega — ek single transaction se sab kuch undo nahi ho sakta, kyunki yeh sab alag-alag systems hain.

### Example: order place karna

Steps:
1. Order Service: order create karo (status = PENDING)
2. Payment Service: customer se paisa charge karo
3. Inventory Service: stock reserve karo
4. Shipping Service: shipment schedule karo
5. Order Service: order ko CONFIRMED mark karo

Compensations (ulte order mein):
- Step 4 fail → reservation cancel + refund + order cancel
- Step 3 fail → refund + order cancel
- Step 2 fail → order cancel

Dekho, jitna aage step fail hota hai, utne zyada peeche wale steps ko undo karna padta hai. Isliye saga design karte waqt yeh socho: "agar yeh step fail ho gaya, toh mujhe kya-kya wapas undo karna padega?"

### Do tareeke

#### Choreography

**Kya hota hai?** Har service events sunta hai aur khud decide karta hai ki aage kya karna hai. Koi central controller nahi hota — sab services apas mein events ke through baat karte hain, jaise ek WhatsApp group mein sab apna-apna kaam kar rahe ho bina kisi "manager" ke.

```
Order ──OrderPlaced──► Payment
                          │
                          ├─PaymentSucceeded──► Inventory
                          │                        │
                          │                        ├─StockReserved──► Shipping
                          │                        │                     │
                          │                        │                     └─ShipmentScheduled──► Order (CONFIRM)
                          │                        └─StockUnavailable──► Payment (refund)
                          └─PaymentFailed──► Order (CANCEL)
```

Pros: simple hai, decoupled hai, koi single point of failure nahi.
Cons: pura workflow ek jagah dekhna mushkil hota hai; cyclic dependencies chupke se aa jaati hain; naya step add karna painful ho jaata hai.

#### Orchestration

**Kya hota hai?** Ek central orchestrator (saga manager) hota hai jo explicit commands bhej ke pura flow drive karta hai — jaise IRCTC ka ek central booking engine jo payment, seat allocation, aur ticket confirmation sabko commands deta hai, aur khud track karta hai ki kaunsa step ho chuka hai.

```
                ┌──────────┐
                │ Saga     │
                │ Orcestr. │
                └─┬───┬───┬┘
            cmd  │   │   │  cmd
                 ▼   ▼   ▼
              Order Pay Stock
```

Pros: workflow explicit hai, samajhna easy hai, monitoring clear hai (orchestrator ke logs dekh lo, pura pata chal jaayega kahan atka).
Cons: orchestrator hi critical piece ban jaata hai; agar carefully design na karo toh yeh ek "god-class" ban sakta hai jisme sab logic thooka ho.

**Rule of thumb:** 2-3 steps ke liye choreography se shuru karo, jab complexity badhe tab orchestration pe switch karo.

## Code example

### Choreography (Spring Kafka)

```java
// Order Service — order create hone ke baad event bhejta hai
@Service
class OrderService {
    private final OrderRepository repo;
    private final KafkaTemplate<String, Object> kafka;

    @Transactional
    public Order place(CreateOrderCmd cmd) {
        var order = repo.save(new Order(cmd, OrderStatus.PENDING));
        kafka.send("orders.placed", order.id().toString(),
            new OrderPlacedEvent(order.id(), cmd.customerId(), cmd.amount()));
        return order;
    }

    @KafkaListener(topics = "payments.succeeded")
    public void onPaymentSucceeded(PaymentSucceededEvent ev) {
        // confirm karne se pehle inventory.reserved ka wait karo
    }

    @KafkaListener(topics = "shipments.scheduled")
    @Transactional
    public void onShipmentScheduled(ShipmentScheduledEvent ev) {
        repo.findById(ev.orderId()).ifPresent(o -> o.confirm());
    }

    @KafkaListener(topics = { "payments.failed", "inventory.unavailable" })
    @Transactional
    public void onSagaFailure(Object failureEvent) {
        var orderId = extractOrderId(failureEvent);
        repo.findById(orderId).ifPresent(o -> o.cancel());
    }
}

// Payment Service
@Service
class PaymentSagaListener {
    @KafkaListener(topics = "orders.placed")
    @Transactional
    public void on(OrderPlacedEvent ev) {
        try {
            var txn = gateway.charge(ev.amount());
            paymentRepo.save(new Payment(ev.orderId(), txn));
            kafka.send("payments.succeeded",
                new PaymentSucceededEvent(ev.orderId(), txn));
        } catch (PaymentDeclined e) {
            kafka.send("payments.failed",
                new PaymentFailedEvent(ev.orderId(), e.reason()));
        }
    }

    @KafkaListener(topics = "inventory.unavailable")
    @Transactional
    public void onInventoryUnavailable(InventoryUnavailableEvent ev) {
        // compensating action: refund karo
        var payment = paymentRepo.findByOrderId(ev.orderId()).orElseThrow();
        gateway.refund(payment.txnId());
        payment.markRefunded();
    }
}
```

Reliability ke liye, events ko **[[11-Outbox-Pattern]]** ke through publish karo, direct Kafka mein transaction ke beech mein nahi — warna crash hone pe event lost ho sakta hai jabki DB commit ho chuka hai (ya ulta).

### Orchestration (state machine)

```java
@Component
class CheckoutOrchestrator {

    private final SagaStateRepository sagaRepo;
    private final KafkaTemplate<String, Object> kafka;

    @Transactional
    public void start(UUID orderId, CreateOrderCmd cmd) {
        var saga = sagaRepo.save(new SagaState(orderId, SagaStep.CHARGING));
        kafka.send("payment.commands", new ChargeCommand(orderId, cmd.amount()));
    }

    @KafkaListener(topics = "payment.events")
    @Transactional
    public void onPaymentEvent(PaymentEvent ev) {
        var saga = sagaRepo.findByOrderId(ev.orderId()).orElseThrow();

        switch (ev) {
            case PaymentSucceededEvent ok -> {
                saga.advance(SagaStep.RESERVING);
                kafka.send("inventory.commands",
                    new ReserveStockCommand(ev.orderId(), saga.items()));
            }
            case PaymentFailedEvent fail -> {
                saga.fail();
                kafka.send("order.commands", new CancelOrderCommand(ev.orderId()));
            }
        }
    }

    @KafkaListener(topics = "inventory.events")
    @Transactional
    public void onInventoryEvent(InventoryEvent ev) {
        var saga = sagaRepo.findByOrderId(ev.orderId()).orElseThrow();

        switch (ev) {
            case StockReservedEvent ok -> {
                saga.advance(SagaStep.SHIPPING);
                kafka.send("shipping.commands",
                    new ScheduleShipmentCommand(ev.orderId()));
            }
            case StockUnavailableEvent fail -> {
                saga.compensate();
                // compensating cmd: refund
                kafka.send("payment.commands",
                    new RefundCommand(ev.orderId(), saga.txnId()));
                kafka.send("order.commands", new CancelOrderCommand(ev.orderId()));
            }
        }
    }

    /* aise hi shipping events ke liye bhi handlers hote hain */
}
```

Yahan orchestrator ek `SagaState` maintain karta hai jo track karta hai ki saga abhi kaunse step pe hai — jaise Swiggy app mein "order placed → preparing → out for delivery → delivered" ka status track hota hai.

### High-level frameworks

Non-trivial workflows ke liye, khud state machine likhna painful hai. Spring ecosystem mein options:

| Framework | Type |
|-----------|------|
| **Spring Statemachine** | In-process state machine |
| **Axon Framework** | Full ES/CQRS + sagas |
| **Camunda 8 / Zeebe** | BPMN workflow engine, durable |
| **Temporal** | Cross-language workflow engine — Node mein bhi popular hai |

Complex orchestration ke liye, **Temporal** increasingly default choice ban raha hai — language-agnostic hai, durable hai, retries built-in aate hain.

```java
// Temporal example — almost synchronous jaisa feel hota hai
@WorkflowImpl
public class CheckoutWorkflowImpl implements CheckoutWorkflow {
    private final PaymentActivities payment = ...;
    private final InventoryActivities inventory = ...;

    @Override
    public Order execute(Cart cart) {
        var txn = payment.charge(cart);
        try {
            inventory.reserve(cart);
        } catch (Exception e) {
            payment.refund(txn);
            throw e;
        }
        return new Order(/* ... */);
    }
}
```

Dekho kitna simple lag raha hai — bilkul normal try/catch jaisa code likha hai, lekin Temporal ke peeche retries, persistence, aur replay sab handle ho raha hai. Yeh saga hi hai, bas bookkeeping tumhe khud nahi karni padi.

## Express/Node comparison

| Spring | Node |
|--------|------|
| Hand-rolled choreography w/ Kafka | NestJS Microservices + `kafkajs` |
| Spring Statemachine | XState |
| Axon Framework | (koi direct equivalent nahi) |
| Camunda / Zeebe | Camunda ke Node clients available hain |
| Temporal Java SDK | Temporal TS SDK |

Dono ecosystems mein serious workflow needs ke liye sab **Temporal** pe converge ho rahe hain — matlab agar tum Node se aa rahe ho, toh Temporal concept-wise same rahega, bas SDK ka language badlega.

## Gotchas (yeh cheezein bhoolna mat)

> [!danger] Compensation, action ka "reverse" nahi hota
> Refund matlab "charge ko undo karna" nahi hai. Refund khud ek **naya transaction** hai — iska apna audit trail hota hai. Kabhi-kabhi compensate karna possible hi nahi hota (jaise ek email bhej diya — usko "unsend" nahi kar sakte). Saga design karte waqt yeh dhyan mein rakho ki har action ka perfect undo nahi milega.

> [!warning] Saga ACID nahi hai
> Isolation nahi milta. Doosre transactions ko intermediate states dikh sakte hain — jaise ek order 5 second tak PENDING state mein visible rahega, aur agar koi usi waqt query chala de toh use "half-done" order dikhega. Isko handle karne ke liye tumhe design mein hi sochna padega — status field dikhao UI pe, ya loading state handle karo.

> [!warning] Event ordering ka issue
> Choreography yeh assume karta hai ki events order mein aayenge. Kafka partition ke andar ordering guarantee karta hai, lekin cross-partition ordering guarantee nahi milta. Isliye apne messages ko saga ID (jaise `orderId`) se key karo, taaki ek saga ke saare events ek hi partition mein jaayein aur order maintain rahe.

> [!warning] Idempotency mandatory hai
> Consumer ko same event do baar bhi mil sakta hai (network retry, consumer restart, waghera). Compensations bhi double apply ho sakte hain agar careful na raho. Har step ko idempotent design karo — matlab same event do baar process ho toh bhi result same rahe. Dekho [[../11-Messaging/05-Idempotency-and-Retries]].

> [!warning] Choreography → spaghetti code
> 4 services / 5 events ke baad, choreography follow karna mushkil ho jaata hai — events idhar-udhar bounce karte rehte hain aur "flow kya hai" samajhna impossible ho jaata hai. Us point pe orchestration pe move kar jao. Baad mein switch karna costly padta hai, isliye jaldi decide karo.

> [!tip] Production ke liye khud mat banao
> Ek robust orchestrator banane mein mahino lag jaate hain. Jab tak tumhara saga genuinely simple (2-3 steps) na ho, Temporal, Camunda, ya Axon use karo — khud se reinvent karne ki zaroorat nahi.

## Key Takeaways

- Microservices mein har service ka apna DB hota hai, isliye ek single ACID transaction possible nahi — Saga pattern local transactions + compensating actions se yeh gap bharta hai.
- **Choreography**: services events sunke khud decide karte hain, koi central controller nahi. Simple hai lekin 4+ services ke baad flow track karna mushkil ho jaata hai.
- **Orchestration**: ek central orchestrator commands bhej ke pura flow drive karta hai. Explicit aur traceable hai, lekin orchestrator khud critical piece ban jaata hai.
- Rule of thumb: chhote saga (2-3 steps) ke liye choreography, badi complexity ke liye orchestration.
- Reliable event publishing ke liye Outbox Pattern use karo, direct Kafka publish transaction ke beech mein nahi.
- Compensation = action ka exact reverse nahi hota (refund ≠ undo charge) — kuch actions (jaise email) compensate hi nahi ho sakte.
- Saga ACID nahi deta — no isolation, intermediate states visible hote hain.
- Idempotency non-negotiable hai — duplicate events aur duplicate compensations dono handle karo.
- Complex production workflows ke liye khud state machine likhne ke bajaye Temporal, Camunda, ya Axon jaise frameworks use karo.

## Related
- [[01-What-is-a-Microservice]]
- [[06-Inter-Service-Communication]]
- [[11-Outbox-Pattern]]
- [[13-Database-per-Service]]
- [[14-Eventual-Consistency]]
- [[../11-Messaging/03-Spring-Kafka]]
- [[../11-Messaging/05-Idempotency-and-Retries]]
