---
tags: [moc, microservices, distributed-systems, observability, deployment]
aliases: [MOC Microservices, Microservices MOC]
stage: intermediate
---

# MOC: Microservices, Messaging, Observability, Deployment

> [!info] Map of Content
> Once you have one Spring Boot app, this MOC covers what happens when you have many — service discovery, async messaging, observability, containerization, and deploying to Kubernetes. Plus the resilience patterns that keep distributed systems standing up.

> [!tip] Reading order
> Microservices fundamentals → messaging → observability → deployment. Don't decompose into microservices until your monolith hurts. Most teams should master deployment + observability of a single Spring Boot service first.

## Microservices fundamentals

- [[01-Microservices-Overview]] — when, when not, and the tax you pay
- [[02-Service-Discovery]] — Eureka, Consul, k8s native
- [[03-API-Gateway]] — Spring Cloud Gateway
- [[04-Centralized-Config]] — Spring Cloud Config Server, k8s ConfigMaps
- [[05-Inter-Service-Communication]] — sync (REST/gRPC) vs async (events)
- [[06-Saga-Pattern]] — distributed transactions you actually want
- [[07-Outbox-Pattern]] — reliable event publishing
- [[08-Idempotency-and-Deduplication]]

## Resilience patterns

- [[01-Resilience-Patterns-Overview]] — timeouts, retries, bulkheads, circuit breakers
- [[02-Resilience4j-Circuit-Breakers]]
- [[03-Retry-and-Backoff]]
- [[04-Bulkhead-and-Rate-Limiting]]
- [[05-Timeout-Strategy]]

## Messaging

- [[01-Spring-Kafka]] — producers, consumers, listeners
- [[02-Event-Driven-Architecture]]
- [[03-Spring-AMQP-RabbitMQ]]
- [[04-Spring-Cloud-Stream]] — vendor-neutral abstraction
- [[05-Schema-Evolution-and-Avro]]
- [[06-Dead-Letter-Topics]]

## Observability

- [[01-Spring-Boot-Actuator]]
- [[02-Micrometer-Metrics]]
- [[03-Logging-Best-Practices]]
- [[04-Distributed-Tracing]]
- [[05-Health-Checks-and-Readiness]]

> [!tip] The three pillars
> Logs (what happened), metrics (how much/how often), traces (where the time went). You want all three before you scale to N services.

## Deployment

- [[01-Packaging-Fat-JAR]]
- [[02-Docker-for-Spring-Boot]]
- [[03-GraalVM-Native-Image]]
- [[04-Kubernetes-Basics]]
- [[05-CI-CD-Pipeline-Example]]
- [[06-Profiles-Per-Environment]]
- [[07-Twelve-Factor-Spring]]
- [[08-Kubernetes-From-Scratch]] — k8s primer for Docker-fluent devs
- [[09-Stack-Specific-Eureka-Gateway-Feign-on-K8s]] — Eureka + Gateway + Feign + Security + JPA on k8s, end-to-end

## Security in distributed systems

- [[04-JWT-with-Spring-Security]] — stateless auth across services
- [[05-OAuth2-OIDC-with-Spring]] — when you need a real IdP
- [[07-CSRF-Sessions-and-Stateless-APIs]]

## Cross-references

- [[03-MOC-Spring]] — for everything single-service
- [[01-Library-Cheatsheet]] — Resilience4j, Caffeine, Spring Kafka

## A pragmatic adoption order

> [!tip] What to actually adopt, in order
> 1. **One Spring Boot service**, deployed via Docker + k8s with Actuator + Prometheus + JSON logs ([[02-Docker-for-Spring-Boot]], [[02-Micrometer-Metrics]], [[03-Logging-Best-Practices]])
> 2. Add **distributed tracing** ([[04-Distributed-Tracing]]) early — even with one service, you'll thank yourself
> 3. Add **resilience** to outbound calls ([[02-Resilience4j-Circuit-Breakers]])
> 4. Split off your *first* secondary service only when team/scale demands it
> 5. Add **async messaging** ([[01-Spring-Kafka]]) when you have legitimate event-driven flows — not just to "decouple"
> 6. Reach for **service discovery / gateway** ([[02-Service-Discovery]], [[03-API-Gateway]]) only when you have ≥3 services

## Common traps

> [!warning] Distributed monolith
> If your services share a database, deploy together, and break together — you've built a distributed monolith. The latency tax with none of the benefits. Read [[01-Microservices-Overview]] before splitting.

> [!warning] Premature Kafka
> Adding Kafka to a 2-service system because "events are nice" is usually wrong. Synchronous calls + retries are simpler. Reach for events when you have real fanout, replay needs, or many consumers.

## Suggested study path

> [!tip] If you only do five things from this MOC
> 1. [[02-Docker-for-Spring-Boot]] — containerize properly
> 2. [[08-Kubernetes-From-Scratch]] + [[04-Kubernetes-Basics]] + [[05-Health-Checks-and-Readiness]]
> 3. [[03-Logging-Best-Practices]] + [[04-Distributed-Tracing]]
> 4. [[02-Resilience4j-Circuit-Breakers]]
> 5. [[09-Stack-Specific-Eureka-Gateway-Feign-on-K8s]] — wire your specific stack together

> [!info] Reading order for YOUR stack (Eureka + Gateway + Feign + Security + JPA on Docker/k8s)
> 1. [[02-Spring-Cloud-Overview]] — what's in the umbrella
> 2. [[03-Service-Discovery-Eureka]] — registry mechanics
> 3. [[07-OpenFeign]] — declarative HTTP between services
> 4. [[04-API-Gateway-Spring-Cloud-Gateway]] — the public entry point
> 5. [[08-Resilience4j]] — keeping it from cascading failures
> 6. [[02-Docker-for-Spring-Boot]] — image you already know
> 7. [[08-Kubernetes-From-Scratch]] — k8s starting from Docker mental model
> 8. [[04-Kubernetes-Basics]] — full Spring Boot manifests
> 9. [[09-Stack-Specific-Eureka-Gateway-Feign-on-K8s]] — tie it all together

## Related
- [[00-README]]
- [[01-Learning-Path]]
- [[03-MOC-Spring]]
- [[07-Twelve-Factor-Spring]]
- [[07-Recommended-Reading]]
