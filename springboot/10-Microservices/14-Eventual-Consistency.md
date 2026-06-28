---
tags: [microservices, consistency, distributed-systems, cap]
aliases: [Eventual Consistency, Strong Consistency]
stage: advanced
---

# Eventual Consistency

> [!info] For the Express/TS dev
> In a Postgres monolith, `BEGIN; ...; COMMIT;` gives you strong consistency: nobody sees half-states. In a microservice system with [[13-Database-per-Service]], that's gone. Two services may see different versions of "the truth" for milliseconds — sometimes minutes. The product, the UI, and the team need to internalize this. Pretending it doesn't exist is how distributed systems become haunted.

## Concept

**Strong consistency:** every read sees the latest committed write. ACID transactions, single DB.

**Eventual consistency:** if writes stop, all replicas/services will *eventually* converge on the same value. In between, they may disagree.

In microservices, this isn't a choice — it's a **consequence** of:
- Each service owning its data.
- Events propagating asynchronously.
- Network partitions being a fact of life.

### CAP, briefly

A distributed system can give you 2 of 3:
- **C**onsistency (every read sees the latest write)
- **A**vailability (every request gets a response)
- **P**artition tolerance (the system keeps working when nodes can't talk)

Network partitions happen. So in practice it's CP or AP. Most microservice systems are AP — they keep serving requests during partitions, accepting that consistency catches up later.

### What it looks like in practice

Scenario: customer changes their email in the User Service.

- t=0: User Service updates `users.email` and emits `UserChanged`.
- t=0+50ms: Order Service receives event, updates its `customer_view`.
- t=0+200ms: Email Service receives event, updates its mailing list.
- t=0+5s: Analytics Service receives event, updates its profile data.

In that 5-second window:
- A receipt for an order placed at t=0+100ms uses the **new** email (Order Service had it).
- A re-engagement email sent at t=0+150ms uses the **old** email (Email Service hadn't synced).
- A dashboard widget reads from User Service shows the new email; from Analytics shows the old one.

This is normal. The fix is design, not engineering — the system has to behave correctly during the window.

### Common consistency patterns

**Read-your-writes** — after a user changes something, *they* should see their own change immediately. Easy in a monolith; in microservices: route the user's reads to the same service that handled the write, or use sticky session affinity, or include the write in the response.

**Monotonic reads** — once a user has seen version N, they shouldn't see N-1 next. Tricky across services with different replication lags. Often handled via per-user version tokens.

**Causal consistency** — if A causes B (you posted, then someone replied), readers should never see B before A. Maintain causal ordering via event metadata.

**Strong consistency islands** — within one service, you have strong consistency (one DB). Cross-service, eventual.

## Code example

### Designing for eventual consistency in the UI

Bad — assumes write is immediately visible everywhere:

```javascript
// UI flow
await api.updateProfile(newEmail);
const orders = await api.getOrders();  // might still show old email!
```

Better — return updated state from the write:

```java
// Server: return the canonical projection
@PutMapping("/api/users/{id}")
UserDto update(@PathVariable UUID id, @RequestBody UpdateUserCmd cmd) {
    var user = service.update(id, cmd);
    return UserDto.from(user);  // includes everything UI needs
}
```

Or include a version token the UI can use:

```java
record UpdateUserResponse(UserDto user, long version) {}
```

UI passes `version` to subsequent reads; reads can wait for that version to land.

### Compensating reads (try-then-fallback)

```java
public CustomerView getCustomer(String id) {
    return localView.findById(id)
        .orElseGet(() -> {
            // not yet replicated — go to source of truth
            var fresh = customerClient.get(id);
            localView.save(CustomerView.from(fresh));
            return CustomerView.from(fresh);
        });
}
```

If your local replica doesn't have it yet, fall back to the owner service. Self-heals.

### Versioned events for ordering

```java
public record UserChangedEvent(
    UUID userId,
    long version,           // monotonic per user
    String email,
    String name,
    Instant timestamp
) {}

@Service
class CustomerViewUpdater {
    @KafkaListener(topics = "users.events")
    @Transactional
    public void on(UserChangedEvent ev) {
        var view = repo.findById(ev.userId()).orElseGet(CustomerView::new);
        if (view.version() < ev.version()) {
            view.apply(ev);
            repo.save(view);
        }
        // else: stale event (out-of-order delivery), ignore
    }
}
```

Out-of-order events are common with retries; the version check prevents older states overwriting newer ones.

### Reading-your-writes via session pinning

```java
@Service
class UserReadService {
    public UserDto read(UUID userId, Optional<Long> minVersion) {
        var user = repo.findById(userId).orElseThrow();
        if (minVersion.isPresent() && user.version() < minVersion.get()) {
            // local replica behind expected version — go to authoritative service
            return userClient.get(userId);
        }
        return UserDto.from(user);
    }
}
```

Client sends `If-Min-Version: 42`; if the local copy is older, fall through.

### Reconciliation jobs

For long-tail drift, run periodic reconciliation:

```java
@Scheduled(cron = "0 0 * * * *")  // hourly
public void reconcileCustomerViews() {
    var lastSync = state.lastSyncedAt();
    var changed = customerClient.changedSince(lastSync);
    for (var c : changed) {
        repo.save(CustomerView.from(c));
    }
    state.markSynced(Instant.now());
}
```

A safety net for missed events.

### Communicating uncertainty in the UI

Sometimes the right answer is honesty:

```jsx
<OrderTotal>
  ${total}
  {pendingRefund && <span>(refund pending — may take a few minutes)</span>}
</OrderTotal>
```

Stale data with context > confidently wrong data.

## Express/Node comparison

The patterns and tradeoffs are identical. Eventual consistency is an architectural property, not a Spring or Node feature.

| Spring | Node |
|--------|------|
| Versioned events | versioned events (same) |
| Reconciliation `@Scheduled` | `node-cron` reconciliation |
| Causal consistency tokens | (same — application-level) |
| Replicated read models | replicated read models (kafkajs consumers) |

What differs is the **library ecosystem** for handling these:

- Spring: Axon Framework, Eventuate Tram for full ES/CQRS.
- Node: less monolithic frameworks; more glue.

## Gotchas

> [!danger] "Just add a transaction across services"
> XA / 2PC distributed transactions exist in theory; nobody runs them at scale. They're slow, fragile, and bring CAP problems back. Use [[10-Saga-Pattern]] instead.

> [!warning] Don't fight eventual consistency
> Trying to *hide* it with read-after-write hacks everywhere creates fragile code. Design the feature to tolerate or surface the lag.

> [!warning] User-facing immediacy ≠ system-wide immediacy
> Users care about what THEY see immediately. They don't care that another service hasn't caught up. Optimize for the user's experience; let the rest converge.

> [!warning] Cache invalidation lies
> Stale caches are a form of eventual consistency. Be intentional: TTLs, cache-aside, or event-driven invalidation. Don't pretend the cache is fresh.

> [!warning] Eventual consistency hides bugs
> "It's just a replication lag" — no, you have a bug that loses events. Distinguish acceptable lag (sub-second) from real lossy paths (minutes/hours).

> [!tip] Bound the lag
> An SLO like "97% of cross-service updates visible within 1s" gives ops a target. Alert when violated. Without bounds, "eventual" becomes "never."

> [!tip] CRDTs for collaborative state
> If multiple services concurrently modify the same logical thing, conflict-free replicated data types (counters, sets, maps) merge automatically without coordination.

## Related
- [[01-What-is-a-Microservice]]
- [[10-Saga-Pattern]]
- [[11-Outbox-Pattern]]
- [[13-Database-per-Service]]
- [[06-Inter-Service-Communication]]
- [[../11-Messaging/01-Messaging-Concepts]]
- [[../11-Messaging/05-Idempotency-and-Retries]]
