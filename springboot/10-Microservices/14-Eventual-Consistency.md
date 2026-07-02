# Eventual Consistency

> [!info] Express/TS wale dev ke liye
> Postgres monolith mein `BEGIN; ...; COMMIT;` likh do, strong consistency mil jaati hai — koi bhi half-state nahi dekh sakta. Lekin microservice system mein, [[13-Database-per-Service]] ke saath, ye guarantee gayab ho jaati hai. Do services alag-alag "truth" dekh sakte hain — kabhi milliseconds ke liye, kabhi minutes ke liye. Product team, UI team, sabko ye baat samajhni padegi. Isko ignore karoge to distributed system "haunted" ban jaayega — bugs jo kabhi samajh nahi aate.

## Concept

**Kya hota hai?**

**Strong consistency:** har read hamesha latest committed write dikhata hai. Ek hi DB, ACID transactions — jaise tumhara normal Express + Postgres app.

**Eventual consistency:** agar writes rukh jaayen, to sab replicas/services *eventually* same value pe converge kar jaayenge. Lekin beech mein, thodi der ke liye, sab alag-alag baat bata sakte hain.

Microservices mein ye koi "choice" nahi hai — ye ek **majboori** hai, kyunki:
- Har service apna data khud rakhti hai.
- Events asynchronously travel karte hain (Kafka/RabbitMQ ke through).
- Network kabhi na kabhi partition hoga hi — ye life ka sach hai.

### CAP theorem, ek line mein

Socho tumhara distributed system ek restaurant chain hai jiske multiple branches hain — sab branches ko ek doosre se sync rehna hai. Ek distributed system tumhe in 3 mein se sirf 2 de sakta hai:

- **C**onsistency — har read latest write dikhaye
- **A**vailability — har request ko response mile (chahe stale ho)
- **P**artition tolerance — network tootne pe bhi system chalta rahe

Network partitions to hote hi hain — ye avoid nahi ho sakta. Isliye practically choice CP ya AP ke beech hoti hai. Zyada tar microservice systems **AP** choose karte hain — jaise Zomato ka order tracking: network glitch ho bhi jaaye to app crash nahi karta, bas thoda purana status dikhata hai jab tak sync na ho jaaye.

### Practical mein kaisa dikhta hai?

Scenario socho: customer apna email User Service mein change karta hai.

- t=0: User Service `users.email` update karta hai aur `UserChanged` event emit karta hai.
- t=0+50ms: Order Service event receive karke apna `customer_view` update karta hai.
- t=0+200ms: Email Service event receive karke apni mailing list update karta hai.
- t=0+5s: Analytics Service event receive karke profile data update karta hai.

Us 5-second window mein:
- t=0+100ms pe placed order ka receipt **naya** email use karega (kyunki Order Service ko event mil chuka tha).
- t=0+150ms pe bheja gaya re-engagement email **purana** email use karega (Email Service abhi sync nahi hua tha).
- Dashboard widget jo User Service se read karta hai naya email dikhayega; jo Analytics se read karta hai purana dikhayega.

Ye sab **normal** hai — koi bug nahi hai. Fix engineering se nahi, **design** se aata hai — system ko is window ke dauraan bhi sahi behave karna chahiye.

Socho ye bilkul waisa hi hai jaise Swiggy pe order place karte waqt restaurant ka menu update ho raha ho — tumhe purana price dikh sakta hai jab tak app refresh na ho, lekin final bill sahi hi aayega.

### Common consistency patterns

**Read-your-writes** — user ne kuch change kiya, to *usko* apna khud ka change turant dikhna chahiye. Monolith mein easy hai; microservices mein: user ke reads ko usi service pe route karo jisne write handle kiya tha, ya sticky session affinity use karo, ya write ke response mein hi updated data bhej do.

**Monotonic reads** — agar user ne version N dekh liya, to usko kabhi N-1 nahi dikhna chahiye (jaise time mein peeche jaana). Different services mein alag replication lag hone se ye tricky ho jaata hai. Aksar per-user version tokens se handle karte hain.

**Causal consistency** — agar A se B hua (tumne post kiya, kisi ne reply kiya), to reader ko kabhi B pehle nahi dikhna chahiye A se. Event metadata se causal ordering maintain karte hain.

**Strong consistency islands** — ek service ke andar, tumhare paas strong consistency hoti hai (ek hi DB). Cross-service jaate hi, eventual ho jaati hai.

## Code example

### UI mein eventual consistency ke liye design karna

Bura approach — assume karta hai ki write turant har jagah visible ho jaayega:

```javascript
// UI flow
await api.updateProfile(newEmail);
const orders = await api.getOrders();  // abhi bhi purana email dikha sakta hai!
```

Behtar approach — write se hi updated state return kar do:

```java
// Server: canonical projection return karo
@PutMapping("/api/users/{id}")
UserDto update(@PathVariable UUID id, @RequestBody UpdateUserCmd cmd) {
    var user = service.update(id, cmd);
    return UserDto.from(user);  // UI ko jo bhi chahiye sab isme hai
}
```

Ya ek version token include kar do jisse UI aage use kar sake:

```java
record UpdateUserResponse(UserDto user, long version) {}
```

UI `version` ko subsequent reads mein pass karta hai; reads chaho to us version ke land hone ka wait kar sakte hain.

### Compensating reads (try-then-fallback)

```java
public CustomerView getCustomer(String id) {
    return localView.findById(id)
        .orElseGet(() -> {
            // abhi replicate nahi hua — source of truth pe jaao
            var fresh = customerClient.get(id);
            localView.save(CustomerView.from(fresh));
            return CustomerView.from(fresh);
        });
}
```

Agar tumhare local replica mein data abhi aaya nahi, to owner service se seedha maang lo. Ye pattern khud-ba-khud "self-heal" ho jaata hai — jaise IRCTC ka PNR status agar local cache mein na mile to seedha booking system se pull kar leta hai.

### Versioned events for ordering

```java
public record UserChangedEvent(
    UUID userId,
    long version,           // per user monotonic
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
        // else: stale event hai (out-of-order delivery), ignore karo
    }
}
```

Out-of-order events retries ke saath common hote hain. Version check ensure karta hai ki koi purana state accidentally naye state ko overwrite na kar de — bilkul waisa jaise UPI mein ek purana "payment status" webhook late aake naye "success" status ko overwrite nahi kar sakta.

### Reading-your-writes via session pinning

```java
@Service
class UserReadService {
    public UserDto read(UUID userId, Optional<Long> minVersion) {
        var user = repo.findById(userId).orElseThrow();
        if (minVersion.isPresent() && user.version() < minVersion.get()) {
            // local replica peeche hai expected version se — authoritative service pe jaao
            return userClient.get(userId);
        }
        return UserDto.from(user);
    }
}
```

Client `If-Min-Version: 42` bhejta hai; agar local copy usse purani hai, to seedha authoritative service se fetch karo.

### Reconciliation jobs

Long-tail drift ke liye, periodic reconciliation chalao:

```java
@Scheduled(cron = "0 0 * * * *")  // har ghante
public void reconcileCustomerViews() {
    var lastSync = state.lastSyncedAt();
    var changed = customerClient.changedSince(lastSync);
    for (var c : changed) {
        repo.save(CustomerView.from(c));
    }
    state.markSynced(Instant.now());
}
```

Ye ek safety net hai — jo events kisi wajah se miss ho gaye, unko pakad leta hai. Jaise BigBasket ka nightly stock-reconciliation job jo poore din ke chhote-mote mismatches ko theek kar deta hai.

### UI mein uncertainty ko communicate karna

Kabhi kabhi sahi jawab honesty hi hota hai:

```jsx
<OrderTotal>
  ${total}
  {pendingRefund && <span>(refund pending — thodi der lag sakti hai)</span>}
</OrderTotal>
```

Context ke saath stale data dikhana, confidently wrong data dikhane se hamesha behtar hai. Socho Ola/Uber ka "driver location updating..." message — wo bata deta hai ki data thoda lag ho sakta hai, jhooth nahi bolta.

## Express/Node comparison

Patterns aur tradeoffs bilkul same hain. Eventual consistency ek **architectural property** hai, koi Spring ya Node specific feature nahi.

| Spring | Node |
|--------|------|
| Versioned events | versioned events (same) |
| Reconciliation `@Scheduled` | `node-cron` reconciliation |
| Causal consistency tokens | (same — application-level) |
| Replicated read models | replicated read models (kafkajs consumers) |

Jo cheez alag hoti hai wo hai **library ecosystem** in sab cheezon ko handle karne ke liye:

- Spring: Axon Framework, Eventuate Tram — full ES/CQRS ke liye ready-made.
- Node: itne monolithic frameworks nahi hain; zyada tar khud glue code likhna padta hai.

## Gotchas

> [!danger] "Bas services ke beech ek transaction daal do"
> XA / 2PC distributed transactions theory mein exist karte hain; practically inhe scale pe koi nahi chalata. Ye slow hain, fragile hain, aur CAP ki problems wapas le aate hain. Iske bajaye [[10-Saga-Pattern]] use karo.

> [!warning] Eventual consistency se ladna mat
> Har jagah read-after-write hacks laga ke ise *chhupane* ki koshish karoge to fragile code ban jaayega. Feature ko is tarah design karo ki wo lag ko tolerate kare ya use surface kare.

> [!warning] User-facing immediacy ≠ system-wide immediacy
> Users ko sirf iski parwah hai ki UNHE kya dikh raha hai turant. Unhe iski koi fikar nahi ki koi doosri service abhi tak catch up nahi kar paayi. User ke experience ko optimize karo; baaki sab apne aap converge ho jaayega.

> [!warning] Cache invalidation jhooth bol sakta hai
> Stale caches bhi ek tarah ki eventual consistency hain. Iske baare mein intentional raho: TTLs use karo, cache-aside pattern, ya event-driven invalidation. Ye mat maano ki cache hamesha fresh hai.

> [!warning] Eventual consistency bugs ko chhupa deta hai
> "Arre ye to bas replication lag hai" — nahi bhai, ho sakta hai tumhare paas ek bug hai jo events lose kar raha hai. Acceptable lag (sub-second) aur real lossy paths (minutes/hours) mein fark karna seekho.

> [!tip] Lag ko bound karo
> Ek SLO jaise "97% cross-service updates 1 second ke andar visible ho jaane chahiye" — isse ops team ko ek target milta hai, aur violation pe alert bhi laga sakte ho. Bina bounds ke, "eventual" ka matlab "kabhi nahi" ban jaata hai.

> [!tip] Collaborative state ke liye CRDTs
> Agar multiple services ek hi logical cheez ko concurrently modify karti hain, to conflict-free replicated data types (counters, sets, maps) bina kisi coordination ke automatically merge ho jaate hain.

## Related
- [[01-What-is-a-Microservice]]
- [[10-Saga-Pattern]]
- [[11-Outbox-Pattern]]
- [[13-Database-per-Service]]
- [[06-Inter-Service-Communication]]
- [[../11-Messaging/01-Messaging-Concepts]]
- [[../11-Messaging/05-Idempotency-and-Retries]]
