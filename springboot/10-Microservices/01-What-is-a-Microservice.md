---
tags: [microservices, architecture, philosophy]
aliases: [Microservices, Services]
stage: advanced
---

# What is a Microservice (and when NOT to use one)

> [!info] For the Express/TS dev
> You've probably seen Node teams break a backend into 10 microservices because "Netflix does it." Spring's tooling makes microservices easy — which makes the temptation worse. The honest answer: **start with a modular monolith.** Reach for microservices when you have a real organizational or scaling reason, not because the architecture diagram looks cool.

## Concept

A microservice is a small, independently-deployed service with its own data store and team responsibility. The defining traits:

- **Owned by one team** (Conway's Law: services mirror org structure).
- **Independently deployable** — you can ship Service A without redeploying B, C, D.
- **Owns its data** — no other service touches its DB. See [[13-Database-per-Service]].
- **Communicates over a network** — REST, gRPC, async messaging.
- **Failure-isolated** — one service down ≠ whole system down (with proper resilience).

### Why people choose microservices

1. **Independent deployment** — small teams ship without coordination.
2. **Independent scaling** — only the recommendation engine needs 50 replicas.
3. **Tech heterogeneity** — Java for transactions, Python for ML, Go for proxies.
4. **Fault isolation** — a memory leak in `notifications` doesn't kill `checkout`.
5. **Org scaling** — 200 engineers in one repo = a coordination nightmare.

### Why people regret microservices

1. **Distributed systems are HARD.** Network failures, partial outages, retries, idempotency, eventual consistency — every problem becomes a distributed problem.
2. **Operational overhead** — 30 services × deploy pipelines × dashboards × oncall rotations.
3. **Debugging is brutal** — a request now flows through 8 services. See [[09-Distributed-Tracing]].
4. **Distributed transactions** — there is no `BEGIN; ...; COMMIT;` across services. See [[10-Saga-Pattern]].
5. **Latency cost** — each network hop is ~1-10ms.
6. **Data consistency** — gone is your nice ACID monolith. Welcome to [[14-Eventual-Consistency]].

> [!danger] Sam Newman's Rule
> "If you can't build a well-structured monolith, what makes you think microservices are the answer?"

### Monolith first

A modular monolith — one deployable, but with strict module boundaries (separate Maven modules, no cross-module DB access, defined APIs) — is almost always the right starting point.

```
my-app (monolith)
├── modules/
│   ├── orders/        ← could become a service later
│   ├── catalog/
│   ├── shipping/
│   └── payments/
└── application.java
```

When a module has:
- A clear, stable API
- Its own scaling needs
- A team that owns it end-to-end
- A reason to deploy independently

...then extract it. Not before.

### "Should I use microservices?" — honest checklist

Use microservices if **most** of these are true:

- [ ] More than ~20 engineers working on the same codebase.
- [ ] Different parts have wildly different scaling profiles.
- [ ] Different parts genuinely need different tech stacks.
- [ ] You have a mature DevOps capability (CI/CD, monitoring, on-call).
- [ ] You can absorb the latency cost.
- [ ] You're willing to rewrite shared logic 4x or invest in shared libs.

If most are false: **modular monolith.** You can always extract later. Going the other way ("service mesh of cards" → monolith) is a multi-quarter project.

## Code example

A modular monolith in Maven (extractable to microservices later):

```xml
<!-- parent pom.xml -->
<modules>
    <module>app-orders</module>
    <module>app-catalog</module>
    <module>app-shipping</module>
    <module>app-shell</module>   <!-- the actual Boot app -->
</modules>
```

Module boundaries enforced via [Spring Modulith](https://spring.io/projects/spring-modulith):

```java
// app-orders/src/main/java/com/example/orders/package-info.java
@org.springframework.modulith.ApplicationModule(
    allowedDependencies = { "shared" }
)
package com.example.orders;
```

The `OrderService` in module `orders` cannot import from `shipping` directly — only via published events or APIs. Tests prove it:

```java
@Test
void modulesRespectBoundaries() {
    ApplicationModules.of(MyApp.class).verify();
}
```

When you later extract `orders` to its own service, the boundary is already there.

### A simple HTTP-based microservice (Spring Boot)

```java
@SpringBootApplication
public class OrderServiceApp {
    public static void main(String[] args) {
        SpringApplication.run(OrderServiceApp.class, args);
    }
}

@RestController
@RequestMapping("/api/orders")
class OrderController {
    private final OrderService service;
    OrderController(OrderService service) { this.service = service; }

    @PostMapping
    OrderResponse place(@RequestBody @Valid CreateOrder cmd) {
        return service.place(cmd);
    }
}
```

That's it. A microservice in Spring is just a Boot app with a focused responsibility. The complexity comes from the **system**, not any one service.

## Express/Node comparison

| Spring world | Node world |
|--------------|------------|
| Modular monolith with Spring Modulith | Nx monorepo with library boundaries |
| Spring Cloud + Eureka + Config Server | NestJS Microservices, or Kubernetes-native |
| Resilience4j circuit breakers | `opossum` |
| OpenFeign | `axios` with retry interceptors |
| Spring Cloud Stream | `kafkajs` / `bullmq` |
| Service mesh (Istio) | (same — Istio is language-agnostic) |

The Spring Cloud ecosystem gives you batteries-included tools that take Node teams weeks to assemble.

## Gotchas

> [!danger] Microservices are an organizational pattern, not a technical one
> If your org can't ship coordinated changes, microservices won't fix it — they'll surface it more painfully.

> [!warning] "Nano-services"
> 50 services where 30 are CRUD wrappers around a single table. You've turned method calls into network calls and gained nothing.

> [!warning] The distributed monolith
> Five "microservices" that must be deployed together because they share a DB or have synchronous chains. Worst of both worlds.

> [!warning] Each service ≈ a team
> A team can plausibly own 1-3 services. 5 services per 2-person team = nobody understands any of them.

> [!tip] Start with one service
> Even if you "know" you need microservices, ship one. Add a second when there's a clear seam. The architecture emerges; it isn't designed top-down.

## Related
- [[02-Spring-Cloud-Overview]]
- [[13-Database-per-Service]]
- [[14-Eventual-Consistency]]
- [[10-Saga-Pattern]]
- [[12-Service-Mesh-vs-Library]]
- [[06-Inter-Service-Communication]]
