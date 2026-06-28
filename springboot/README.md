# Java & Spring Boot

A comprehensive guide to Java and Spring Boot for backend developers — covering the language, the framework, microservices, security, testing, and production deployment. Notes are written from the perspective of an experienced backend developer (Node.js/TypeScript/Express), with every concept mapped to something you already know.

## Table of Contents

### Part 1: Getting Started
- [Start Here & Overview](./00-Start-Here/00-README.md)
- [Learning Path (8-Week Plan)](./00-Start-Here/01-Learning-Path.md)
- [FAQ for Express/TS Developers](./00-Start-Here/06-FAQ-for-Express-Devs.md)
- [Glossary](./00-Start-Here/05-Glossary.md)

### Part 2: Java Language
- [Java Fundamentals](./01-Java-Fundamentals/01-JVM-JDK-JRE.md)
- [Java vs TypeScript (Side-by-Side)](./02-Java-vs-TypeScript/01-Mental-Model-Map.md)
- [Build Tools: Maven & Gradle](./03-Build-Tools/01-Maven-Basics.md)

### Part 3: Spring Framework
- [Spring Core: IoC & Dependency Injection](./04-Spring-Core/01-IoC-DI-Concepts.md)
- [Spring Boot: Auto-config & Starters](./05-Spring-Boot/01-What-is-Spring-Boot.md)
- [Web & REST: Controllers, Validation, Error Handling](./06-Web-REST/01-RestController-Basics.md)
- [Data & JPA: Entities, Repositories, Transactions](./07-Data-JPA/README.md)

### Part 4: Security & Testing
- [Spring Security: JWT, OAuth2, RBAC](./08-Security/README.md)
- [Testing: JUnit, Mockito, Testcontainers](./09-Testing/01-Testing-Pyramid-and-Tools.md)

### Part 5: Microservices & Production
- [Microservices: Eureka, Gateway, Feign](./10-Microservices/01-What-is-a-Microservice.md)
- [Messaging: Kafka & RabbitMQ](./11-Messaging/01-Messaging-Concepts.md)
- [Observability: Actuator, Metrics, Tracing](./12-Observability/01-Spring-Boot-Actuator.md)
- [Deployment: Docker, Kubernetes, CI/CD](./13-Deployment/01-Packaging-Fat-JAR.md)

### Part 6: Ecosystem & Advanced
- [Ecosystem: Lombok, MapStruct, Jackson](./14-Ecosystem/01-Library-Cheatsheet.md)
- [Spring Modulith](./15-Spring-Modulith/01-Modulith-Concepts.md)
- [Spring GraphQL](./16-Spring-GraphQL/01-GraphQL-Concepts.md)

## Learning Path

### Beginner Track (Week 1-2)
If you're new to Java, start here:
1. [JVM, JDK, JRE](./01-Java-Fundamentals/01-JVM-JDK-JRE.md)
2. [Syntax Basics](./01-Java-Fundamentals/02-Syntax-Basics.md)
3. [OOP: Classes & Objects](./01-Java-Fundamentals/03-OOP-Classes-Objects.md)
4. [Java vs TypeScript Mental Model](./02-Java-vs-TypeScript/01-Mental-Model-Map.md)
5. [Maven Basics](./03-Build-Tools/01-Maven-Basics.md)
6. [What is Spring Boot](./05-Spring-Boot/01-What-is-Spring-Boot.md)

### Intermediate Track (Week 3-5)
Build your first production-ready API:
1. [IoC & Dependency Injection](./04-Spring-Core/01-IoC-DI-Concepts.md)
2. [REST Controllers](./06-Web-REST/01-RestController-Basics.md)
3. [Validation & Error Handling](./06-Web-REST/05-Validation.md)
4. [Spring Data JPA](./07-Data-JPA/README.md)
5. [Spring Security + JWT](./08-Security/README.md)
6. [Testing with JUnit & Mockito](./09-Testing/01-Testing-Pyramid-and-Tools.md)

### Advanced Track (Week 6-8)
Go production and distributed:
1. [Microservices with Spring Cloud](./10-Microservices/01-What-is-a-Microservice.md)
2. [Kafka & RabbitMQ](./11-Messaging/01-Messaging-Concepts.md)
3. [Observability & Actuator](./12-Observability/01-Spring-Boot-Actuator.md)
4. [Docker & Kubernetes](./13-Deployment/02-Docker-for-Spring-Boot.md)
5. [Spring Modulith](./15-Spring-Modulith/01-Modulith-Concepts.md)

## What You'll Learn

- Java language: types, generics, streams, lambdas, concurrency, modern Java (records, sealed classes)
- How Spring's IoC container and dependency injection works (and why it's similar to NestJS)
- Building REST APIs with validation, error handling, and content negotiation
- JPA/Hibernate: entities, repositories, relationships, N+1 problem, transactions
- Spring Security: filter chain, JWT auth, OAuth2, RBAC, ABAC
- Testing: unit tests, slice tests (`@WebMvcTest`, `@DataJpaTest`), Testcontainers for real DB tests
- Microservices: Eureka service discovery, Spring Cloud Gateway, OpenFeign, Resilience4j
- Messaging: Kafka producers/consumers, RabbitMQ, dead letter queues, idempotency
- Observability: Micrometer metrics, distributed tracing, health checks
- Deployment: Fat JAR, Docker, Kubernetes, GraalVM native image, CI/CD

## Prerequisites

- Comfortable with REST APIs and HTTP
- Experience with any backend framework (Express, Fastapi, NestJS, etc.)
- Basic SQL and database knowledge
- Familiarity with Docker is helpful for later sections

## How to Use This Guide

1. **Start with the FAQ** — [FAQ for Express Devs](./00-Start-Here/06-FAQ-for-Express-Devs.md) answers your first 20 "where is X in Spring?" questions in 10 minutes
2. **Follow the 8-week plan** — [Learning Path](./00-Start-Here/01-Learning-Path.md) gives you a structured week-by-week schedule
3. **Map concepts to what you know** — every note has a "For the Express/TS dev" section showing the equivalent
4. **Don't skip Java Fundamentals** — Java's type system and generics are foundational
5. **Build as you learn** — the notes are most effective when paired with a real Spring Boot project

---

Start with [FAQ for Express/TS Developers](./00-Start-Here/06-FAQ-for-Express-Devs.md) — it'll reframe everything in 5 minutes. ☕
