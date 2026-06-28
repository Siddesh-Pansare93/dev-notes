# NestJS Framework

NestJS is a progressive Node.js framework for building efficient, scalable server-side applications using TypeScript and an opinionated, Angular-inspired architecture. This section takes you from the fundamentals of modules and dependency injection all the way through database integration, authentication, testing, and microservices — giving you the mental models and practical patterns needed to build production-grade APIs.

## Table of Contents

### Part 1 — Core Architecture
- [01 — Architecture and Modules](./01-architecture-and-modules.md)
- [02 — Dependency Injection Deep Dive](./02-dependency-injection-deep-dive.md)
- [03 — Controllers and Providers](./03-controllers-and-providers.md)

### Part 2 — Request Pipeline
- [04 — Pipes, Guards, and Interceptors](./04-pipes-guards-interceptors.md)
- [05 — Custom Decorators](./05-custom-decorators.md)

### Part 3 — Database Integration
- [06 — Database Integration: TypeORM and Prisma](./06-database-integration-typeorm-prisma.md)
- [07 — Authentication and Authorization](./07-authentication-and-authorization.md)
- [08 — Prisma Integration](./08_prisma_integration.md)
- [08 — Drizzle ORM Integration](./08-drizzle/README.md)

### Part 4 — Testing and Advanced Patterns
- [08 — Testing in NestJS](./08-testing-in-nestjs.md)
- [09 — Microservices and Advanced Patterns](./09-microservices-and-advanced-patterns.md)

## Learning Path

**Beginner** — Start here if you are coming from Express or plain Node.js and want to understand why NestJS exists and how it is structured.
1. Architecture and Modules (01)
2. Controllers and Providers (03)
3. Dependency Injection Deep Dive (02)

**Intermediate** — Tackle these once you have a working app and want to add real-world features like validation, auth, and database access.
4. Pipes, Guards, and Interceptors (04)
5. Custom Decorators (05)
6. Database Integration: TypeORM and Prisma (06)
7. Authentication and Authorization (07)
8. Prisma Integration (08) or Drizzle ORM Integration (08-drizzle)

**Advanced** — These chapters address testing strategy, scalability, and distributed systems.
9. Testing in NestJS (08)
10. Microservices and Advanced Patterns (09)

## What You'll Learn

- How the NestJS module system enforces a clear dependency graph and keeps large codebases maintainable
- The Dependency Injection (DI) container — how providers are registered, resolved, and scoped
- Building controllers and services following single-responsibility patterns
- The full request lifecycle: middleware, guards, interceptors, pipes, handlers, and exception filters
- Writing custom pipes for validation and transformation, custom guards for RBAC, and custom decorators for clean APIs
- Integrating relational databases with TypeORM, Prisma, and Drizzle ORM
- JWT-based authentication with Passport strategies, role-based authorization, and guard composition
- Unit testing with Jest, mocking the DI container, and end-to-end testing with Supertest
- Microservice architecture with NestJS transports (TCP, Redis, RabbitMQ), CQRS pattern, and WebSockets

## Prerequisites

- Solid TypeScript knowledge — decorators, generics, interfaces, and type narrowing are used throughout
- Familiarity with Node.js and HTTP fundamentals (request/response cycle, REST conventions)
- Basic experience with Express or another Node.js HTTP framework helps, but is not required
- Understanding of async/await and Promises

## How to Use This Guide

1. **Follow the numbered order for your first pass.** Each chapter builds on concepts introduced earlier — jumping ahead to microservices before understanding modules will make the code harder to follow.
2. **Type out the examples yourself.** NestJS leans heavily on decorators and metadata — reading code is not the same as writing it and seeing the DI container wire things together.
3. **Run a small app alongside the reading.** Scaffold a project with `nest new` and apply each pattern as you encounter it; the CLI feedback loop makes concepts stick.
4. **Use the "Coming from JS" callouts as anchors.** Each chapter highlights how NestJS maps to patterns you already know from Express, so you can build a mental model rather than memorising new API surfaces.
5. **Return to Part 2 (Pipes, Guards, Interceptors) often.** Understanding the request lifecycle is the key to debugging NestJS apps — most production issues trace back to the order of these layers.

Building a well-structured NestJS application is genuinely satisfying once the architecture clicks — keep going and you will find that the opinionated structure pays for itself many times over as the codebase grows.
