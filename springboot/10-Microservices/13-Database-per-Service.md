# Database per Service

> [!info] For the Express/TS dev
> Microservices ka sabse zyada violate hone wala rule yahi hai: **har service apni database khud owns karti hai; koi doosri service usse touch nahi karti.** Sunne mein simple lagta hai. Par jab realize hota hai ki ab tum services ke beech JOIN nahi laga sakte, toh bada uncomfortable feel hota hai. Lekin agar DB share kar diya, toh microservices ka pura point hi khatam ho gaya — tumne ek distributed monolith bana diya hai, microservice nahi.

## Concept

Kya hota hai? Database independence ke teen escalating levels hote hain:

| Level | Kya hai |
|-------|------|
| **Shared DB** | Saari services ek hi DB use karti hain. Tight coupling. *Anti-pattern.* |
| **Schema per service** | Ek hi DB instance, alag-alag schemas. *Stepping stone.* |
| **Database per service** | Har service ki apni DB instance. *Yehi goal hai.* |

Socho Zomato ka backend hai. Order service, Restaurant service, aur Payment service — agar teeno ek hi Postgres database mein apni tables rakhein aur ek-doosre ki tables directly query karein, toh yeh "shared DB" wala anti-pattern hai. Har service ko apni alag database milni chahiye — jaise alag alag dukaan, apna alag godown.

### Kyun zaruri hai?

Ek shared DB services ko sabse **fragile** layer par couple kar deta hai:

- Schema migrations ke liye coordinated deploys karne padte hain — sab services ko ek saath deploy karna padta hai. Bye-bye independence.
- Ek service ka slow query sabko slow kar deta hai — jaise ek restaurant ka order slow process ho raha ho aur poora Zomato app hang ho jaaye.
- Ek service column type change karke doosri services ko break kar sakti hai.
- Tum tech switch nahi kar sakte (jaise ek service ke liye SQL se Cassandra move karna) — kyunki sab ek hi DB pe bandhe hain.
- Implicit contracts ban jaate hain (ek service doosri ki table JOIN kar rahi hai) — jab table change hoti hai, dono services break ho jaati hain.

### Iski cost kya hai?

Jab har service apna data khud owns karti hai:

- **Cross-service queries khatam.** Ab `JOIN orders ON customers` nahi chalega. Teen options hain:
  - Doosri service se HTTP call karke data fetch karo (chatty, thoda slow).
  - Events ke through data replicate karo apni service mein (eventual consistency).
  - Gateway/BFF layer pe API composition use karo.
- **Distributed transactions khatam.** Dekho [[10-Saga-Pattern]].
- **Reporting mushkil ho jaati hai.** Cross-domain reports ke liye ek analytics DB / data lake chahiye jo events se feed ho.
- **Polyglot persistence possible ho jaata hai.** Har job ke liye sahi tool: transactions ke liye Postgres, search ke liye Elasticsearch, sessions ke liye Redis, graphs ke liye Neo4j.

### "Share-nothing" rule

> Koi bhi service doosri service ki database ko **directly** read ya write nahi karegi. Communication sirf APIs (REST/gRPC) ya events ke through hogi.

Yeh non-negotiable hai. Jis din do services ek table share karti hain, us din tumne apni independence kho di.

## Code example

### Anti-pattern: shared DB

```java
// In Order Service — DON'T DO THIS
@Repository
public interface OrderRepository extends JpaRepository<Order, UUID> {
    @Query("""
        SELECT o, c.email FROM Order o
        JOIN Customer c ON o.customerId = c.id  -- <-- Customer is owned by another service
    """)
    List<Object[]> findOrdersWithCustomerEmail();
}
```

Yahan Customer Service `Customer` table ko change nahi kar sakti bina Order Service ko break kiye. Tumne deployment ko couple kar diya — jaise Zomato ka Order team, Customer team ki table pe directly depend karke apna feature bana raha ho. Ek chhota sa change Customer table mein, aur Order service crash.

### Sahi tarika: API call

```java
@Service
class OrderQueryService {
    private final OrderRepository orders;
    private final CustomerClient customers;   // OpenFeign client

    public List<OrderWithCustomer> listForUI() {
        var orderList = orders.findAll();
        var customerIds = orderList.stream().map(Order::customerId).distinct().toList();
        var customerMap = customers.batch(customerIds);  // single batch call

        return orderList.stream()
            .map(o -> new OrderWithCustomer(o, customerMap.get(o.customerId())))
            .toList();
    }
}
```

Customer Service ek `/api/customers/batch` endpoint expose karti hai. Order Service usse call karti hai. Ab Customer Service apni DB kuch bhi change kar sakti hai, Order Service ko farak nahi padta — jaise UPI app tumhare bank ka balance seedha DB se nahi padhta, bank ke API se maangta hai.

### Sahi tarika: events ke through data replication

High-traffic queries ke liye jaha API calls slow pad jaayein, tum jo data chahiye woh apni local DB mein **replicate** kar lo:

```java
// Order Service has its own minimal customer projection
@Entity
@Table(name = "customer_view")
class CustomerView {
    @Id String customerId;
    String email;
    String name;
    boolean isVip;
    Instant updatedAt;
}

// Listen for Customer events
@Component
class CustomerEventListener {
    private final CustomerViewRepository repo;

    @KafkaListener(topics = "customers.events")
    @Transactional
    public void on(CustomerChangedEvent ev) {
        var view = repo.findById(ev.id()).orElseGet(() -> new CustomerView(ev.id()));
        view.email = ev.email();
        view.name = ev.name();
        view.isVip = ev.tier().equals("VIP");
        view.updatedAt = ev.timestamp();
        repo.save(view);
    }
}
```

Ab Order Service `customer_view` ke against JOIN kar sakti hai (yeh table same DB mein hai, aur Order Service khud owns karti hai), lekin data ultimately Customer Service se events ke through aata hai. Yeh eventually consistent hota hai — dekho [[14-Eventual-Consistency]]. Bilkul waise jaise CRED apna khud ka "cached" copy rakhta hai tumhare card details ka, jo periodically sync hota rehta hai — real source of truth toh bank hi hai.

### Polyglot persistence example

```
Order Service        → PostgreSQL (transactional, joins)
Catalog Service      → PostgreSQL + Elasticsearch (search)
Cart Service         → Redis (TTL, ephemeral)
Recommendation Svc   → Cassandra (write-heavy, denormalized)
Audit Service        → S3 + Athena (immutable log)
Graph (relations)    → Neo4j
Analytics            → ClickHouse / BigQuery
```

Har service apni marzi ka database choose karti hai — jaise Swiggy ka search feature Elasticsearch use kare kyunki fast text search chahiye, par cart Redis use kare kyunki data temporary hai aur super fast access chahiye. Spring Boot mein in sabke liye starters available hain.

### `application.yml` per service

`order-service`:
```yaml
spring:
  datasource:
    url: jdbc:postgresql://orders-db:5432/orders
    username: orders_app
```

`payment-service`:
```yaml
spring:
  datasource:
    url: jdbc:postgresql://payments-db:5432/payments
    username: payments_app
```

Alag-alag DB hosts, alag-alag credentials, alag-alag schemas. Chahe woh physically same Postgres cluster share kar rahe hon, access boundary strictly enforce hota hai.

### Schema-per-service compromise

Agar abhi genuinely alag-alag DB instances run nahi kar sakte:

```sql
CREATE SCHEMA orders;
CREATE SCHEMA payments;

CREATE USER orders_app WITH PASSWORD '...';
GRANT USAGE ON SCHEMA orders TO orders_app;
REVOKE ALL ON SCHEMA payments FROM orders_app;
```

Har service apne khud ke user se connect karti hai jo doosre schemas **read hi nahi kar sakta**. Boundary ko DB level pe enforce karo — jaise ek hi building mein alag-alag dukaanein hon, par har dukaan ka apna lock aur chaabi ho.

## Express/Node comparison

Architecture har stack mein same hai. Sirf libraries badalti hain:

| Spring | Node |
|--------|------|
| JPA / Hibernate per service | Prisma / TypeORM per service |
| OpenFeign for cross-service queries | axios / hand-rolled clients |
| Spring Kafka for replication | kafkajs |
| Postgres + Elasticsearch + Redis | (same — DBs are language-agnostic) |

DB share karne ka temptation dono ecosystems mein aata hai. Fix same hai: **mat karo.**

## Gotchas

> [!danger] Shared DB is the #1 microservice failure mode
> Almost har "humne microservices try kiya aur fail ho gaya" story shared database se start hoti hai. Shuru mein easy lagta hai; scale pe catastrophic ho jaata hai.

> [!warning] Cross-service joins teams ko wapas monolith mein le jaate hain
> "Ab hum orders + customers efficiently query nahi kar sakte." Yeh dard real hai. Iske liye plan karo: read models, projection services, ya CQRS-style query side introduce karo.

> [!warning] Data duplication theek hai
> Monolith se aaye ho toh 3 services mein same email store karne mein resistance hoga. Usse nikal jao. Duplication hi independence ki cost hai; events isse sync mein rakhte hain.

> [!warning] Foreign keys gaayab ho jaate hain
> `order.customer_id` se `customer.id` tak FK nahi hoga agar dono alag DBs mein hain. Application-level validation karna padega. Background reconciliation jobs chalani padengi.

> [!warning] Reporting ke liye alag path chahiye
> "Pichle quarter ka VIP customer revenue total" ek JOIN nahi ho sakta. Iske liye ek data warehouse chahiye jo events se feed ho (Kafka → S3 → Snowflake/BigQuery).

> [!tip] Schema-per-service se start karo
> Same Postgres cluster, alag schemas, alag users. Isse boundary ka zyada fayda milta hai bina N DBs chalane ke operational cost ke. Jab zarurat pade tab physically split kar do.

> [!tip] Agar do services hamesha saath change hoti hain, toh woh actually ek hi service hai
> Split galat tha. Unhe merge kar do. Shared tables se paper over mat karo.

## Related
- [[01-What-is-a-Microservice]]
- [[06-Inter-Service-Communication]]
- [[10-Saga-Pattern]]
- [[11-Outbox-Pattern]]
- [[14-Eventual-Consistency]]
- [[../07-Data-JPA/01-JPA-Hibernate-Overview|JPA]]
