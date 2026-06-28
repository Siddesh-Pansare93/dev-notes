# TypeScript Learning Guide

> For developers with Node.js experience ready to master TypeScript end-to-end.

## How to Use This Guide

Work through each section in order. Every file contains:
- **What you'll learn** — key concepts upfront
- **Practical code examples** — real-world, not toy snippets
- **"Coming from JS" callouts** — where TypeScript behavior differs from plain JavaScript
- **Mini-exercise** — a challenge at the end to cement the topic

You can skip topics you're already comfortable with, but sections build on each other.

---

## Roadmap

### 00 — Getting Started
**New to TypeScript?** Start here. Complete beginner-friendly introduction for JavaScript developers.

1. [Introduction and Setup](00-getting-started/01_introduction_and_setup.md) — what is TypeScript, installation, tsconfig.json, first TypeScript file
2. [Basic Types](00-getting-started/02_basic_types.md) — primitives, arrays, tuples, objects, any, unknown, never, void
3. [Functions and Interfaces](00-getting-started/03_functions_and_interfaces.md) — function types, optional parameters, interfaces, type vs interface
4. [Introduction to Generics](00-getting-started/04_generics_intro.md) — generic functions, generic interfaces, constraints
5. [Everyday Types](00-getting-started/05_everyday_types.md) — unions, literals, type aliases, assertions, non-null assertion
6. [From JavaScript to TypeScript](00-getting-started/06_from_js_to_ts.md) — migration strategies, allowJs, checkJs, gradual adoption

### 01 — Foundations
Advanced TypeScript type system mastery. Skip this if you're just getting started.

1. [Type System Deep Dive](01-foundations/01-type-system-deep-dive.md) — unions, intersections, narrowing, `never`, `unknown`
2. [Advanced Types](01-foundations/02-advanced-types.md) — mapped types, conditional types, template literals, `infer`
3. [Generics Mastery](01-foundations/03-generics-mastery.md) — constraints, defaults, real-world generic patterns
4. [Utility Types & Type Gymnastics](01-foundations/04-utility-types-and-type-gymnastics.md) — built-in utilities, custom type builders

### 02 — OOP in TypeScript
Object-oriented programming done right in TypeScript.

1. [Classes & Access Modifiers](02-oops-in-typescript/01-classes-and-access-modifiers.md) — public, private, protected, readonly, static
2. [Interfaces vs Abstract Classes](02-oops-in-typescript/02-interfaces-vs-abstract-classes.md) — when to use which, declaration merging
3. [Inheritance & Polymorphism](02-oops-in-typescript/03-inheritance-and-polymorphism.md) — overriding, mixins, composition
4. [Design Patterns](02-oops-in-typescript/04-design-patterns.md) — Singleton, Factory, Strategy, Observer, Repository, Decorator
5. [SOLID Principles](02-oops-in-typescript/05-solid-principles.md) — each principle with backend TypeScript examples

### 03 — TypeScript with React
Type-safe frontend development.

1. [Typing Components, Props & State](03-typescript-with-react/01-typing-components-props-state.md) — FC vs declarations, children, events
2. [Hooks with TypeScript](03-typescript-with-react/02-hooks-with-typescript.md) — `useState<T>`, `useRef<T>`, custom hooks
3. [Context & Reducers](03-typescript-with-react/03-context-and-reducers.md) — typed context, reducer action patterns
4. [Generic Components & HOCs](03-typescript-with-react/04-generic-components-and-hocs.md) — generic tables, typed HOCs, render props
5. [API Layer & Type-Safe Fetching](03-typescript-with-react/05-api-layer-and-type-safe-fetching.md) — axios generics, React Query typing

### 04 — TypeScript with Express
Backend fundamentals with full type safety.

1. [Express Setup & Typed Routes](04-typescript-with-express/01-express-setup-and-typed-routes.md) — tsconfig, typed Request/Response
2. [Middleware & Error Handling](04-typescript-with-express/02-middleware-and-error-handling.md) — typed middleware, error classes
3. [Request Validation with Zod](04-typescript-with-express/03-request-validation-with-zod.md) — schema-first, inferred types
4. [Project Architecture Patterns](04-typescript-with-express/04-project-architecture-patterns.md) — layered architecture, repository/service patterns

### 05 — NestJS Deep Dive
Production-grade backend framework mastery.

1. [Architecture & Modules](05-nestjs/01-architecture-and-modules.md) — module system, dynamic modules, circular deps
2. [Dependency Injection Deep Dive](05-nestjs/02-dependency-injection-deep-dive.md) — IoC, custom providers, scopes, tokens
3. [Controllers & Providers](05-nestjs/03-controllers-and-providers.md) — decorators, DTOs, service patterns
4. [Pipes, Guards & Interceptors](05-nestjs/04-pipes-guards-interceptors.md) — execution order, custom implementations
5. [Custom Decorators](05-nestjs/05-custom-decorators.md) — param decorators, `SetMetadata`, Reflector
6. [Database Integration — TypeORM & Prisma](05-nestjs/06-database-integration-typeorm-prisma.md) — entities, repos, transactions
7. [Authentication & Authorization](05-nestjs/07-authentication-and-authorization.md) — Passport, JWT, role-based guards
8. [Testing in NestJS](05-nestjs/08-testing-in-nestjs.md) — unit tests, e2e tests, mocking providers
9. [Microservices & Advanced Patterns](05-nestjs/09-microservices-and-advanced-patterns.md) — TCP, Redis, CQRS, WebSockets

---

## Prerequisites

**For Getting Started (00):**
- 1+ years of JavaScript experience
- Familiarity with ES6+ features (arrow functions, destructuring, async/await, modules)
- Node.js installed and basic npm knowledge

**For Advanced Sections (01-05):**
- 2+ years of Node.js / JavaScript experience
- Comfortable with TypeScript basics (covered in section 00)
- Understanding of how `npm` / `yarn` projects work

## Recommended Setup

```bash
npm install -g typescript ts-node
```

Use VS Code with the official TypeScript extension for the best experience.
