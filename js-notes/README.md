# JavaScript

A deep-dive reference for experienced developers covering the full JavaScript ecosystem — from engine internals and language gotchas to production-grade React, Node.js, and deployment. These notes skip the basics and go straight to the parts that matter in real codebases.

## Table of Contents

### Part 1: JavaScript Core
1. [JS Core Deep Dive — Closures, Scope, This, Prototype](./01-js-core-deep-dive.md)
2. [Modern JS — ES6 Through 2024](./02-modern-js-es6-2024.md)
3. [Async JS — Event Loop, Promises, and Async/Await](./03-async-js-event-loop.md)
4. [DOM and Browser APIs](./04-dom-browser-apis.md)
5. [Functional JavaScript](./05-functional-js.md)
6. [JS Performance and Memory](./06-js-performance-memory.md)

### Part 2: TypeScript
7. [TypeScript Essentials](./07-typescript-essentials.md)

### Part 3: React
8. [React Fundamentals](./08-react-fundamentals.md)
9. [React Hooks Deep Dive](./09-react-hooks-deep-dive.md)
10. [React State Management](./10-react-state-management.md)
11. [React Router and Data Fetching](./11-react-router-data-fetching.md)
12. [React Performance](./12-react-performance.md)
13. [React Patterns](./13-react-patterns.md)

### Part 4: Next.js
14. [Next.js App Router](./14-nextjs-app-router.md)

### Part 5: Node.js
15. [Node.js Internals](./15-nodejs-internals.md)
16. [Node.js Core Modules](./16-nodejs-core-modules.md)
17. [Express Deep Dive](./17-express-deep-dive.md)

### Part 6: Production Backend
18. [Production Backend Setup — Architecture and Config](./18-prod-backend-setup.md)
19. [Production Auth and Security](./19-prod-auth-security.md)
20. [Production Database, Cache, and Uploads](./20-prod-database-cache-uploads.md)
21. [Production Jobs, WebSockets, and Monitoring](./21-prod-jobs-websockets-monitoring.md)
22. [Production Testing and CI/CD](./22-prod-testing-cicd.md)

## Learning Path

### Beginner Track
Start here if you are new to JavaScript beyond the basics:
1. JS Core Deep Dive — closures, scope, `this` (01)
2. Modern JS — destructuring, modules, optional chaining (02)
3. Async JS — promises and async/await (03)
4. DOM and Browser APIs — events, storage, fetch (04)
5. React Fundamentals — components, props, JSX (08)
6. React Hooks — useState, useEffect, useRef (09)

### Intermediate Track
Build on your JS foundation with architecture and patterns:
1. Functional JS — map, reduce, currying, composition (05)
2. TypeScript Essentials — types, interfaces, generics (07)
3. React State Management — Context, Zustand, Redux (10)
4. React Router and Data Fetching — TanStack Query (11)
5. React Patterns — compound components, render props, HOCs (13)
6. Next.js App Router — RSC, Server Actions, streaming (14)

### Advanced Track
Go deep on the runtime, Node.js internals, and production systems:
1. JS Performance and Memory — profiling, V8 hints, GC (06)
2. Node.js Internals — libuv, event loop, worker threads (15)
3. Node.js Core Modules — streams, Buffer, cluster (16)
4. Express Deep Dive — middleware, error handling, routing (17)
5. React Performance — memoization, code splitting, Suspense (12)
6. Production Backend Setup through Testing and CI/CD (18–22)

## What You'll Learn

- How JavaScript's engine actually resolves variables, closures, and `this` at runtime
- Every modern JS feature from ES6 through 2024, including the tricky edge cases
- The exact mechanics of the event loop — microtask queue, macrotask queue, and render steps
- DOM APIs, browser storage, Intersection Observer, and the Web APIs you reach for daily
- Functional programming patterns: pure functions, currying, composition, and immutability
- V8 performance hints, memory profiling, and diagnosing memory leaks
- TypeScript in strict mode — generics, utility types, discriminated unions, and type narrowing
- React's rendering model, reconciliation, and how to avoid expensive re-renders
- Every major React hook and when to reach for each one
- State management tradeoffs: Context vs. Zustand vs. Redux Toolkit
- Data fetching patterns with TanStack Query — caching, invalidation, mutations, optimistic updates
- Next.js App Router — React Server Components, Server Actions, streaming, and route handlers
- Node.js internals: libuv, the event loop phases, worker threads, and the cluster module
- Building production-grade Express APIs with Clean Architecture
- Authentication and security: JWT, sessions, RBAC, CSRF, rate limiting, and HTTPS
- Production infrastructure: PostgreSQL, Redis, S3, background job queues, WebSockets
- Monitoring, structured logging, distributed tracing, and alerting in production
- Testing strategy: unit, integration, and E2E — plus CI/CD pipelines that actually ship

## Prerequisites

- Comfortable writing JavaScript (variables, functions, arrays, objects)
- Basic understanding of HTTP and REST APIs
- Some experience with at least one framework (Express, React, or similar)
- Familiarity with the command line and npm

These notes are revision material, not a first introduction. If you have never written JavaScript before, start with a beginner tutorial first.

## How to Use This Guide

1. **Follow the part order, not just the chapter order** — Parts 1 and 2 ground you in the language; Parts 3–6 layer on frameworks and production concerns that build on those foundations.
2. **Read the gotcha sections carefully** — each chapter calls out the specific traps that bite developers in production, not just textbook definitions.
3. **Run the code examples** — the snippets are short and purposeful; copy them into a REPL or scratch file and break them deliberately to build intuition.
4. **Cross-reference Part 6 while learning Parts 3–5** — the production chapters assume you know React and Node.js, but revisiting them as you learn those topics reveals the "why" behind many architectural decisions.
5. **Use it as a pre-interview refresh** — each chapter is dense but self-contained, making it practical to review one topic per session before a technical interview or code review.

These notes are built for developers who learn fastest by seeing the real behaviour, the edge case, and the production consequence — not just the happy path.
