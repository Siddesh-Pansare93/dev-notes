# TypeScript with Express

Build production-ready REST APIs using TypeScript and Express — covering everything from project setup and typed routes to request validation with Zod and layered architecture patterns. This section is aimed at developers who know JavaScript/Express and want to apply TypeScript effectively on the backend.

## Table of Contents

### Part 1 — Foundation

1. [Express Setup and Typed Routes](./01-express-setup-and-typed-routes.md)
   - Project setup from scratch, `tsconfig.json` for backend, `ts-node-dev`
   - Typing `Request` generics for params, body, and query strings
   - The controller pattern and organizing routes with `Router`

2. [Middleware and Error Handling](./02-middleware-and-error-handling.md)
   - Writing typed custom middleware
   - Global error handler with `AppError` class
   - `catchAsync` utility for async route handlers

### Part 2 — Validation and Architecture

3. [Request Validation with Zod](./03-request-validation-with-zod.md)
   - Defining schemas and inferring TypeScript types with `z.infer`
   - Reusable `validate` middleware for body, params, and query
   - Schema composition with `pick`, `omit`, `partial`, `extend`, and `merge`
   - Transformations, `z.coerce`, and custom error formatting

4. [Project Architecture Patterns](./04-project-architecture-patterns.md)
   - Layered architecture: controller → service → repository
   - Repository pattern with typed interfaces
   - Manual dependency injection without a framework
   - Typed environment configuration with Zod
   - Feature module structure and testability

---

## Learning Path

### Beginner — Get a typed Express API running

Read chapters 1 and 2 in order. After chapter 1 you will have a working project with typed routes and controllers. After chapter 2 you will have a solid error handling foundation. Stop here if your goal is replacing a small JavaScript Express app with TypeScript.

- Chapter 1: Express Setup and Typed Routes
- Chapter 2: Middleware and Error Handling

### Intermediate — Add validation and clean request handling

Build on the foundation by reading chapter 3. This is where Express + TypeScript becomes genuinely safer than plain Express — your `req.body` is validated and typed at the same time, with no duplication between your interfaces and your validation rules.

- Chapter 3: Request Validation with Zod

### Advanced — Structure for scale

Read chapter 4 after completing the rest. It shows how to organize a growing API into feature modules with clear layer boundaries, a testable service layer, and environment configuration that fails loudly on misconfiguration.

- Chapter 4: Project Architecture Patterns

---

## What You'll Learn

- Setting up a TypeScript + Express project with `ts-node-dev` and a backend-optimized `tsconfig.json`
- Using Express `Request` and `Response` generics to type route params, request bodies, and query strings
- Writing typed middleware functions and a global error handler that catches both sync and async errors
- Defining Zod schemas and deriving TypeScript types from them with `z.infer` — one source of truth for shape and validation
- Composing schemas with `pick`, `omit`, `partial`, `extend`, and `merge` to avoid repetition across CRUD endpoints
- Using `z.coerce` to automatically convert query-string values to numbers and booleans
- Structuring a controller → service → repository stack where each layer depends only on the interface of the layer below it
- Wiring dependencies manually using factory functions — no IoC container required
- Validating environment variables at startup with Zod so the app fails immediately on misconfiguration
- Organizing an Express app into self-contained feature modules that are easy to test without a running database

---

## Prerequisites

Before starting this section you should be comfortable with:

- **TypeScript fundamentals** — interfaces, generics, union types, `Pick`, `Omit`, `Partial`, and `ReturnType`. The TypeScript Fundamentals and Advanced Types sections in this knowledge base cover these.
- **Express basics** — routing, middleware, `req`/`res`, `Router`, and `app.use()`.
- **Async JavaScript** — `async`/`await` and `Promise` error handling.
- **npm project setup** — installing packages and writing `package.json` scripts.

You do not need prior experience with Zod, `ts-node-dev`, or any architecture patterns — those are introduced from scratch here.

---

## How to Use This Guide

1. **Follow the numbered order.** Each chapter builds on the previous one. Chapter 4 references patterns (like `AppError` and `catchAsync`) introduced in chapter 2.
2. **Copy the project scaffold in chapter 1 before anything else.** Having a working dev environment with hot reload makes it much easier to experiment as you go.
3. **Do the mini-exercises.** Every chapter ends with a practical exercise. The exercises are designed so that completing them gives you a working feature, not just a toy snippet.
4. **Read the "Coming from JS" callouts.** They explain the specific differences between idiomatic plain-JS Express patterns and the TypeScript equivalents — useful for understanding not just _how_ but _why_.
5. **Start simple, then layer in complexity.** You can ship a typed, validated API after chapters 1 and 3. Add the full layered architecture from chapter 4 when your project is large enough to benefit from it.

---

Strong typing in Express is not about ceremony — it is about catching mistakes at the keyboard instead of in production. Start with chapter 1 and see how quickly the compiler becomes your most useful collaborator.
