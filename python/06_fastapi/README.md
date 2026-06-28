# FastAPI Web Framework

A practical guide to building production-ready APIs with FastAPI — the modern Python web framework that gives you automatic docs, built-in validation, and NestJS-level structure with Express-level simplicity. Written for developers who already know JavaScript/Node.js and want to get productive fast.

## Table of Contents

### Part 1 — Getting Started
1. [Introduction to FastAPI](./01_introduction.md) — what FastAPI is, installation, hello world, async support, project structure
2. [Routing](./02_routing.md) — path parameters, query parameters, APIRouter, route grouping

### Part 2 — Requests and Data
3. [Request & Response](./03_request_response.md) — Pydantic models, request bodies, response models, status codes, headers
4. [Dependency Injection](./04_dependency_injection.md) — `Depends()`, class-based deps, nested chains, yield deps with cleanup, overrides for testing

### Part 3 — Security and Middleware
5. [Middleware & CORS](./05_middleware_and_cors.md) — custom middleware, CORS configuration, request/response lifecycle
6. [Authentication](./06_authentication.md) — JWT tokens, OAuth2 password flow, protected routes, refresh tokens

### Part 4 — Data and Background Work
7. [Database Integration](./07_database.md) — SQLAlchemy setup, models, sessions, async database, Alembic migrations
8. [Background Tasks](./08_background_tasks.md) — `BackgroundTasks`, Celery integration, scheduling async work

### Part 5 — Real-Time and Testing
9. [WebSockets](./09_websockets.md) — WebSocket endpoints, connection managers, rooms, broadcasting
10. [Testing](./10_testing.md) — `TestClient`, dependency overrides, fixtures, async test patterns

### Part 6 — Production Patterns
11. [Error Handling](./11_error_handling.md) — `HTTPException`, custom exception handlers, consistent error responses
12. [Advanced Patterns](./12_advanced_patterns.md) — modular routers, sub-applications, lifespan hooks, streaming responses, SSE, API versioning, rate limiting, pagination, CRUD factories, Pydantic Settings

## Learning Path

### Beginner — Build your first FastAPI app
Start here if you are new to FastAPI or Python web development.
1. Chapter 1 — Introduction (installation, hello world, auto-docs)
2. Chapter 2 — Routing (path and query params)
3. Chapter 3 — Request & Response (Pydantic models, validation)
4. Chapter 11 — Error Handling (HTTPException basics)

### Intermediate — Build a real API with auth and a database
Continue once you can write basic endpoints with Pydantic models.
5. Chapter 4 — Dependency Injection (the `Depends()` pattern)
6. Chapter 5 — Middleware & CORS (global middleware, CORS config)
7. Chapter 6 — Authentication (JWT, OAuth2 password flow)
8. Chapter 7 — Database (SQLAlchemy, sessions, migrations)
9. Chapter 10 — Testing (TestClient, dependency overrides)

### Advanced — Real-time, background work, and production architecture
Tackle these once you have a working API you want to harden and scale.
10. Chapter 8 — Background Tasks (deferred work, Celery)
11. Chapter 9 — WebSockets (real-time bidirectional communication)
12. Chapter 12 — Advanced Patterns (modular structure, SSE, rate limiting, API versioning)

## What You'll Learn

- Set up a FastAPI project with uvicorn and virtual environments
- Define type-safe request/response models with Pydantic — no separate validation library needed
- Use `Depends()` for dependency injection: auth guards, DB sessions, pagination, service layers
- Write `yield` dependencies that handle cleanup automatically after each request
- Configure CORS, add custom middleware, and hook into the request/response lifecycle
- Implement JWT authentication with protected routes and role-based access
- Integrate SQLAlchemy for database access, manage sessions per-request, and run Alembic migrations
- Run background tasks without blocking the response
- Open and manage WebSocket connections for real-time features
- Test endpoints with `TestClient` and swap out real dependencies with fakes — no mocking libraries required
- Handle errors consistently with custom exception handlers
- Structure large APIs with `APIRouter`, sub-applications, and a service/repository layer
- Stream large responses and push live updates via Server-Sent Events
- Version APIs, apply rate limiting, and implement cursor-based pagination

## Prerequisites

- Comfortable with Python basics (functions, classes, type hints, `async/await`)
- Experience with at least one backend framework — Express.js, NestJS, Django, or similar
- Familiarity with REST concepts: HTTP methods, status codes, JSON request/response bodies
- Basic understanding of relational databases and SQL (helpful for the database chapter)

No prior FastAPI or Pydantic knowledge required. The notes draw explicit comparisons to Express.js and NestJS throughout, so Node.js developers will feel oriented immediately.

## How to Use This Guide

1. **Follow the learning path for your level.** The chapters build on each other — the Beginner path gives you a working foundation before the Intermediate path adds real-world complexity.
2. **Run the code as you read.** Install FastAPI (`pip install "fastapi[standard]"`), spin up a server with `uvicorn main:app --reload`, and visit `/docs` — seeing the auto-generated Swagger UI click into place makes the concepts land faster.
3. **Do the practice exercises at the end of each chapter.** Every file closes with 4-5 progressively harder exercises. Skipping them is the fastest way to forget what you just read.
4. **Use the Express/NestJS comparisons as anchors.** Each chapter shows the equivalent pattern in JavaScript — if a concept feels abstract, find the comparison block and read that first.
5. **Come back to Chapter 12 last.** Advanced Patterns covers topics you will only appreciate after you have hit the limitations of a flat `main.py` — save it until you feel the need for more structure.

You are closer to production-ready than you think — start with Chapter 1 and build something real.
