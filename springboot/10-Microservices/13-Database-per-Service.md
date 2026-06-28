---
tags: [microservices, database, architecture, patterns]
aliases: [Database per Service, Polyglot Persistence]
stage: advanced
---

# Database per Service

> [!info] For the Express/TS dev
> The single most-violated microservice rule: **each service owns its database; no other service touches it.** It sounds obvious. It is also intensely uncomfortable when you realize you can't do a JOIN across services anymore. But sharing a DB defeats the entire point of microservices — go shared and you've built a distributed monolith.

## Concept

Three escalating levels of database independence:

| Level | What |
|-------|------|
| **Shared DB** | All services use one DB. Tight coupling. *Anti-pattern.* |
| **Schema per service** | Same DB instance, different schemas. *Stepping stone.* |
| **Database per service** | Each service has its own DB instance. *The goal.* |

### Why it matters

A shared DB couples services at the **most fragile** layer:

- Schema migrations force coordinated deploys.
- One service's slow query slows everyone.
- A service can break others by changing column types.
- You can't switch tech (e.g. SQL → Cassandra for one service).
- Implicit contracts (one service `JOIN`ing another's table) — when the table changes, both services break.

### The cost

Once each service owns its data:

- **Cross-service queries are gone.** No more `JOIN orders ON customers`. You either:
  - Make an HTTP call to fetch the other service's data (chatty).
  - Replicate the data into your service via events (eventual consistency).
  - Use API composition at the gateway/BFF layer.
- **Distributed transactions are gone.** See [[10-Saga-Pattern]].
- **Reporting is harder.** Cross-domain reports need an analytics DB / data lake fed by events.
- **Polyglot persistence becomes possible.** Right tool for the job: Postgres for transactions, Elasticsearch for search, Redis for sessions, Neo4j for graphs.

### The "share-nothing" rule

> No service may read or write another service's database **directly**. Communication is through APIs (REST/gRPC) or events.

This is non-negotiable. The moment two services share a table, you've lost independence.

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

Customer Service can't change the `Customer` table without breaking Order Service. You've coupled deployment.

### Right way: API call

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

The Customer Service exposes a `/api/customers/batch` endpoint. Order Service calls it. Customer Service can change its DB without Order knowing.

### Right way: data replication via events

For high-traffic queries where API calls are too slow, **replicate** the data you need into your local DB:

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

Now Order Service can JOIN against `customer_view` (same DB, owned by Order), but the data ultimately comes from Customer Service via events. Eventually consistent — see [[14-Eventual-Consistency]].

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

Each service picks its own. Spring Boot has starters for all of these.

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

Different DB hosts, different credentials, different schemas. Even if they share a Postgres cluster physically, the access boundary is enforced.

### Schema-per-service compromise

If you genuinely can't (yet) run separate DB instances:

```sql
CREATE SCHEMA orders;
CREATE SCHEMA payments;

CREATE USER orders_app WITH PASSWORD '...';
GRANT USAGE ON SCHEMA orders TO orders_app;
REVOKE ALL ON SCHEMA payments FROM orders_app;
```

Each service connects with its own user that **cannot** read other schemas. Enforce the boundary at the DB level.

## Express/Node comparison

The architecture is identical across stacks. Only the libraries change:

| Spring | Node |
|--------|------|
| JPA / Hibernate per service | Prisma / TypeORM per service |
| OpenFeign for cross-service queries | axios / hand-rolled clients |
| Spring Kafka for replication | kafkajs |
| Postgres + Elasticsearch + Redis | (same — DBs are language-agnostic) |

The temptation to share DBs exists in both ecosystems. The fix is the same: **don't.**

## Gotchas

> [!danger] Shared DB is the #1 microservice failure mode
> Almost every "we tried microservices and it didn't work" story starts with a shared database. It feels easy at first; it's catastrophic at scale.

> [!warning] Cross-service joins drive teams back to monoliths
> "We can't query orders + customers efficiently anymore." This is real pain. Plan for it: introduce read models, projection services, or a CQRS-style query side.

> [!warning] Data duplication is OK
> Coming from a monolith you'll resist storing the same email in 3 services. Get over it. The duplication is the cost of independence; events keep it in sync.

> [!warning] Foreign keys are gone
> No FK from `order.customer_id` to `customer.id` if they're in different DBs. Application-level validation. Background reconciliation jobs.

> [!warning] Reporting needs a separate path
> "Total revenue per VIP customer last quarter" can't be a JOIN. You need a data warehouse fed by events (Kafka → S3 → Snowflake/BigQuery).

> [!tip] Start with schema-per-service
> Same Postgres cluster, separate schemas, separate users. You get most of the boundary benefit without the operational cost of N DBs. Split physically when needed.

> [!tip] If two services always change together, they're one service
> The split was wrong. Merge them. Don't paper over it with shared tables.

## Related
- [[01-What-is-a-Microservice]]
- [[06-Inter-Service-Communication]]
- [[10-Saga-Pattern]]
- [[11-Outbox-Pattern]]
- [[14-Eventual-Consistency]]
- [[../07-Data-JPA/01-JPA-Hibernate-Overview|JPA]]
