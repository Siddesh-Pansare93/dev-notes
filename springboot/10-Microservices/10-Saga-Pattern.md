---
tags: [microservices, saga, distributed-transactions, patterns]
aliases: [Saga, Saga Pattern]
stage: advanced
---

# Saga Pattern (Orchestration vs Choreography)

> [!info] For the Express/TS dev
> A monolith uses one DB transaction: `BEGIN; charge; reserve; ship; COMMIT`. Microservices can't — each service has its own DB. The **Saga** pattern replaces ACID transactions with a sequence of local transactions plus **compensating actions** to undo on failure. Think "redo log + manual rollback" instead of `ROLLBACK;`.

## Concept

A saga is a sequence of local transactions. If step N fails, run compensating actions for steps 1..N-1 to logically undo them.

### Example: place an order

Steps:
1. Order Service: create order (PENDING)
2. Payment Service: charge customer
3. Inventory Service: reserve stock
4. Shipping Service: schedule shipment
5. Order Service: mark order CONFIRMED

Compensations (in reverse):
- 4 fails → cancel reservation + refund + cancel order
- 3 fails → refund + cancel order
- 2 fails → cancel order

### Two flavors

#### Choreography
Each service listens for events and decides what to do next. No central coordinator.

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

Pros: simple, decoupled, no SPOF.
Cons: hard to see the workflow as a whole; cyclic dependencies sneak in; hard to add new steps.

#### Orchestration
A central orchestrator (saga manager) drives the flow with explicit commands.

```
                ┌──────────┐
                │ Saga     │
                │ Orcestr. │
                └─┬───┬───┬┘
            cmd  │   │   │  cmd
                 ▼   ▼   ▼
              Order Pay Stock
```

Pros: explicit workflow, easy to reason about, clear monitoring.
Cons: orchestrator is critical; can become a god-class.

**Rule of thumb:** start with choreography for 2-3 steps, switch to orchestration when complexity grows.

## Code example

### Choreography (Spring Kafka)

```java
// Order Service — emits event after creation
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
        // wait for inventory.reserved before confirming
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
        // compensating action: refund
        var payment = paymentRepo.findByOrderId(ev.orderId()).orElseThrow();
        gateway.refund(payment.txnId());
        payment.markRefunded();
    }
}
```

For reliability, **publish events via the [[11-Outbox-Pattern]]**, not directly to Kafka mid-transaction.

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

    /* and so on for shipping events */
}
```

### Higher-level frameworks

For non-trivial workflows, hand-rolling state machines is painful. Spring options:

| Framework | Type |
|-----------|------|
| **Spring Statemachine** | In-process state machine |
| **Axon Framework** | Full ES/CQRS + sagas |
| **Camunda 8 / Zeebe** | BPMN workflow engine, durable |
| **Temporal** | Cross-language workflow engine — popular in Node too |

For complex orchestration, **Temporal** is increasingly the default — language-agnostic, durable, retries built in.

```java
// Temporal example — almost feels synchronous
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

Temporal handles retries, persistence, replay — sagas without the bookkeeping.

## Express/Node comparison

| Spring | Node |
|--------|------|
| Hand-rolled choreography w/ Kafka | NestJS Microservices + `kafkajs` |
| Spring Statemachine | XState |
| Axon Framework | (no direct equivalent) |
| Camunda / Zeebe | Camunda has Node clients |
| Temporal Java SDK | Temporal TS SDK |

Both ecosystems converge on **Temporal** for serious workflow needs.

## Gotchas

> [!danger] Compensation is not the inverse of the action
> Refund ≠ "undo charge." A refund is a new transaction; it leaves an audit trail. Sometimes you can't compensate at all (email sent — you can't unsend it). Design with this in mind.

> [!warning] Sagas are NOT ACID
> No isolation. Other transactions can see intermediate states (an order in PENDING for 5 seconds is visible). You need to design for that.

> [!warning] Event ordering
> Choreography assumes events arrive in order. Kafka per-partition ordering helps; cross-partition does not. Key your messages by the saga ID (e.g. orderId) so all events for one saga go to one partition.

> [!warning] Idempotency is mandatory
> A consumer might receive the same event twice. Compensations might be applied twice. Design every step idempotent. See [[../11-Messaging/05-Idempotency-and-Retries]].

> [!warning] Choreography → spaghetti
> Past 4 services / 5 events, choreography becomes hard to follow. Move to orchestration. The cost of switching later is high.

> [!tip] Don't roll your own for production
> A robust orchestrator is months of work. Use Temporal, Camunda, or Axon unless your saga is genuinely simple (2-3 steps).

## Related
- [[01-What-is-a-Microservice]]
- [[06-Inter-Service-Communication]]
- [[11-Outbox-Pattern]]
- [[13-Database-per-Service]]
- [[14-Eventual-Consistency]]
- [[../11-Messaging/03-Spring-Kafka]]
- [[../11-Messaging/05-Idempotency-and-Retries]]
