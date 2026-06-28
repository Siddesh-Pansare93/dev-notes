---
tags: [moc, learning-path, plan]
aliases: [Learning Path, 8-Week Plan, Study Plan]
stage: foundation
---

# Learning Path: 8-Week Plan

> [!info] For the Express/TS dev
> This is an aggressive but achievable plan assuming ~10 focused hours/week. By the end you'll be productive in a Spring Boot codebase: writing controllers, JPA entities, security configs, tests, and deploying to k8s.

> [!tip] Reading order within a week
> Read top-to-bottom. Tick boxes as you go. The exercises are non-negotiable — Java is a muscle.

---

## Week 1 — Java fundamentals & toolchain

**Goal**: Be able to read any Java code without panic. Have a working JDK + IDE.

- [ ] [[06-FAQ-for-Express-Devs]] — orient yourself in 15 minutes
- [ ] [[05-Common-CLI-Tools]] — install `sdkman`, JDK 21, `jshell`
- [ ] [[06-IDE-Setup]] — install IntelliJ (Community is fine to start), enable Lombok plugin
- [ ] [[01-JDK-JRE-JVM-Basics]]
- [ ] [[02-Classes-and-Objects]]
- [ ] [[03-Primitives-vs-Reference-Types]]
- [ ] [[04-Generics]]
- [ ] [[01-Java-vs-TypeScript-Quick-Map]]
- [ ] **Exercise**: open `jshell`, write a `record Point(int x, int y) {}`, build a `List<Point>`, filter and map it with streams

## Week 2 — More Java: collections, streams, concurrency

**Goal**: Comfortable with the standard library and concurrency basics.

- [ ] [[05-Collections-Framework]]
- [ ] [[06-Streams-and-Lambdas]]
- [ ] [[07-Optional-and-Null-Safety]]
- [ ] [[08-Exception-Handling]]
- [ ] [[09-Concurrency-Basics]]
- [ ] [[02-Type-System-Differences]]
- [ ] [[03-Async-Patterns-Comparison]]
- [ ] **Exercise**: write a CLI program that reads a CSV, groups rows by a column, and writes a summary JSON. No Spring yet — just `java -jar`.

## Week 3 — Build tools and Spring Core

**Goal**: Understand Maven/Gradle. Grasp IoC/DI as Spring sees it.

- [ ] [[01-Maven-Basics]]
- [ ] [[02-Gradle-Basics]]
- [ ] [[03-Project-Layout]]
- [ ] [[01-IoC-DI-Concepts]]
- [ ] [[02-Bean-Lifecycle]]
- [ ] [[03-Component-Scanning]]
- [ ] [[04-Configuration-Classes]]
- [ ] **Exercise**: scaffold a project with [start.spring.io](https://start.spring.io) (web + lombok). Boot it. Add a `@RestController` returning "hello". Run on port 8080.

## Week 4 — Spring Boot core & web

**Goal**: Build a real REST API with validation and error handling.

- [ ] [[01-Spring-Boot-Project-Layout]]
- [ ] [[02-Spring-Boot-Auto-Configuration]]
- [ ] [[03-Application-Properties-and-YAML]]
- [ ] [[04-Configuration-Properties]]
- [ ] [[06-Profiles-Per-Environment]]
- [ ] [[01-REST-Controllers]]
- [ ] [[02-Request-Mapping-and-Path-Variables]]
- [ ] [[03-DTOs-and-Serialization]]
- [ ] [[04-Bean-Validation]]
- [ ] [[05-Exception-Handlers-and-ProblemDetail]]
- [ ] **Exercise**: build a `Todo` REST API: CRUD endpoints, DTOs, validation (`@NotBlank`, `@Size`), `@RestControllerAdvice` for errors, ProblemDetail responses.

## Week 5 — Persistence with JPA

**Goal**: Stop saving todos in a `HashMap`. Persist to Postgres.

- [ ] [[01-JPA-Hibernate-Basics]]
- [ ] [[02-Entity-Basics]]
- [ ] [[03-Spring-Data-Repositories]]
- [ ] [[04-Query-Methods-and-JPQL]]
- [ ] [[05-Transactions]]
- [ ] [[06-Relationships-and-Lazy-Loading]]
- [ ] [[07-N-Plus-1-and-Fetch-Strategies]]
- [ ] [[08-Migrations-Flyway-Liquibase]]
- [ ] [[03-MapStruct]]
- [ ] **Exercise**: extend the Todo API with a Postgres backend (use Docker for the DB). Add a `User` entity with a OneToMany to `Todo`. Use Flyway. Use MapStruct for entity↔DTO mapping.

## Week 6 — Security & testing

**Goal**: Add real auth. Write tests you trust.

- [ ] [[01-Spring-Security-Basics]]
- [ ] [[02-Authentication-vs-Authorization]]
- [ ] [[03-Password-Encoding]]
- [ ] [[04-JWT-with-Spring-Security]]
- [ ] [[05-OAuth2-OIDC-with-Spring]]
- [ ] [[06-Method-Level-Security]]
- [ ] [[01-Testing-Strategy]]
- [ ] [[02-JUnit-5-Basics]]
- [ ] [[03-Mockito-and-AssertJ]]
- [ ] [[04-Spring-Boot-Test-Slices]]
- [ ] [[05-Testcontainers]]
- [ ] **Exercise**: secure your Todo API with JWT. Add `@PreAuthorize` on endpoints. Write `@WebMvcTest` for controllers, `@DataJpaTest` for the repo, and a full integration test using Testcontainers Postgres.

## Week 7 — Observability & deployment (Docker + Kubernetes)

**Goal**: Production-ready. Containers, logs, metrics, traces, k8s.

- [ ] [[01-Spring-Boot-Actuator]]
- [ ] [[02-Micrometer-Metrics]]
- [ ] [[03-Logging-Best-Practices]]
- [ ] [[04-Distributed-Tracing]]
- [ ] [[05-Health-Checks-and-Readiness]]
- [ ] [[01-Packaging-Fat-JAR]]
- [ ] [[02-Docker-for-Spring-Boot]]
- [ ] [[08-Kubernetes-From-Scratch]] — **start here if you're new to k8s**
- [ ] [[04-Kubernetes-Basics]] — full Spring Boot manifests
- [ ] [[05-CI-CD-Pipeline-Example]]
- [ ] [[07-Twelve-Factor-Spring]]
- [ ] **Exercise**: install `kind` (or minikube). Dockerize the Todo API. Deploy with health probes, ConfigMap, Secret. Practice `kubectl describe`/`logs` when things break. Write a GitHub Actions workflow that builds + tests + pushes the image.

## Week 8 — Microservices: Spring Cloud + Eureka + Gateway + Feign on K8s

**Goal**: Decompose into services using your actual stack. Wire it together end-to-end.

- [ ] [[01-What-is-a-Microservice]]
- [ ] [[02-Spring-Cloud-Overview]] — what's in the umbrella
- [ ] [[03-Service-Discovery-Eureka]] — registry mechanics
- [ ] [[07-OpenFeign]] — declarative HTTP between services
- [ ] [[04-API-Gateway-Spring-Cloud-Gateway]] — public entry point
- [ ] [[05-Centralized-Config-Server]]
- [ ] [[06-Inter-Service-Communication]]
- [ ] [[08-Resilience4j]] — circuit breakers around Feign
- [ ] [[09-Stack-Specific-Eureka-Gateway-Feign-on-K8s]] — tie it all together on k8s
- [ ] [[01-Spring-Kafka]] (optional — if you'll use async messaging)
- [ ] [[03-GraalVM-Native-Image]] (skim — know when to reach for it)
- [ ] **Exercise**: split the Todo API into `users-service` + `orders-service` + `api-gateway` + `eureka-server`. Each service has its own Postgres. Use Feign for service-to-service calls; forward JWT through Feign. Add Resilience4j circuit breakers. Deploy all four to your local kind cluster following [[09-Stack-Specific-Eureka-Gateway-Feign-on-K8s]]. Verify trace IDs flow across services in your logs.

---

## After 8 weeks

> [!tip] Keep going
> - Read **Effective Java** at the rate of 2-3 items per week
> - Subscribe to **Java Weekly** (Baeldung)
> - Pick a side project and rebuild it in Spring Boot
> - Look at the **Spring PetClinic microservices** sample for a polished reference
> - Tackle [[07-Recommended-Reading]] for deeper specialization

## Track progress

> [!tip] Vault habit
> Each week, write a short retro in a daily note linking back to the topics you covered. Use the [[05-Glossary]] to refresh terms. The graph view will show your knowledge spreading outward.

## Related
- [[00-README]]
- [[02-MOC-Java-Fundamentals]]
- [[03-MOC-Spring]]
- [[04-MOC-Microservices]]
- [[06-FAQ-for-Express-Devs]]
- [[07-Recommended-Reading]]
