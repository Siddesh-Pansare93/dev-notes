# Go (Golang)

A practical, backend-focused guide to Go for developers who already know at least one other language. This section takes you from installation and mental models all the way through building and deploying a production-grade REST API with PostgreSQL, Redis, JWT auth, and Docker.

## Table of Contents

### Part 1 — Language Foundations
1. [Introduction & Setup](./01-intro-setup.md) — Why Go, installation, Go modules, essential CLI commands, pointers, fmt package
2. [Types, Structs & Interfaces](./02-types-structs-interfaces.md) — Slices, maps, structs, methods, interfaces, composition
3. [Error Handling](./03-error-handling.md) — Explicit errors, wrapping with `%w`, sentinel errors, custom error types

### Part 2 — Concurrency
4. [Goroutines & Channels](./04-goroutines-channels.md) — Goroutines, buffered/unbuffered channels, select, WaitGroup, Mutex, context
5. [Concurrency Patterns](./12-concurrency-patterns.md) — Worker pools, pipelines, fan-out/fan-in, semaphores, rate limiting

### Part 3 — Web & APIs
6. [HTTP Server & Gin](./05-http-server-gin.md) — net/http basics, Gin framework, routing, request/response handling
7. [Database with Go](./06-database-go.md) — database/sql, PostgreSQL driver, connection pooling, transactions, migrations
8. [Auth & JWT](./07-auth-jwt.md) — JWT generation and validation, bcrypt password hashing, token middleware
9. [Middleware & Validation](./08-middleware-validation.md) — Custom middleware, request validation, logging, CORS, error responses

### Part 4 — Production Engineering
10. [Production API Project](./10-production-api-project.md) — Clean Architecture, PostgreSQL + Redis caching, Docker multi-stage builds, graceful shutdown
11. [gRPC with Go](./11-grpc-go.md) — Protocol Buffers, gRPC server/client, streaming, service definitions
12. [Testing in Go](./09-testing-go.md) — Built-in testing package, table-driven tests, mocks, integration tests, race detector

---

## Learning Path

### Beginner — Build your first Go backend
Start here if you are new to Go but comfortable with another backend language.

1. Chapter 1 — Introduction & Setup
2. Chapter 2 — Types, Structs & Interfaces
3. Chapter 3 — Error Handling
4. Chapter 6 — HTTP Server & Gin
5. Chapter 7 — Database with Go

By the end you can build and run a basic REST API that reads from a database.

### Intermediate — Add auth, concurrency, and tests
You have a working Go service and want to harden it.

1. Chapter 4 — Goroutines & Channels
2. Chapter 8 — Auth & JWT
3. Chapter 9 — Middleware & Validation
4. Chapter 12 — Testing in Go

By the end your service handles concurrent requests safely, protects routes with JWT, validates input, and has a test suite you can trust.

### Advanced — Ship production-ready systems
You are comfortable with Go and want to build something deployable today.

1. Chapter 10 — Production API Project (Clean Architecture + Docker)
2. Chapter 5 — Concurrency Patterns
3. Chapter 11 — gRPC with Go

By the end you have a containerized API following Clean Architecture, with Redis caching, graceful shutdown, multi-stage Docker builds, and gRPC service definitions.

---

## What You'll Learn

- How Go's static typing, compiled binaries, and single-binary deployment make it ideal for backend services
- Go Modules (`go.mod`, `go.sum`) and the modern project layout using `internal/`, `cmd/`, `pkg/`
- Structs, interfaces, and composition — Go's answer to classes and inheritance
- Explicit, return-value-based error handling and how to wrap and unwrap errors idiomatically
- Goroutines and channels as first-class concurrency primitives, including the M:N scheduler model
- `context.Context` for propagating cancellation, deadlines, and timeouts through your entire call chain
- Building HTTP APIs with Go's standard library and the Gin framework
- Database access with `database/sql`, connection pooling, parameterized queries, and schema migrations
- Secure authentication using bcrypt password hashing and JWT tokens
- Request validation, structured logging middleware, and CORS handling
- Clean Architecture — separating domain, repository, service, and handler layers so your codebase stays maintainable as it grows
- Redis caching at the service layer with cache-aside pattern and TTL invalidation
- Multi-stage Docker builds that shrink your image from ~800 MB to ~15 MB
- Graceful HTTP server shutdown so in-flight requests complete before the process exits
- Protocol Buffers and gRPC for high-performance service-to-service communication
- Table-driven tests, mocks via interfaces, and the built-in race detector

---

## Prerequisites

- Comfortable writing code in at least one backend language (JavaScript/Node, Python, Java, or similar)
- Basic understanding of HTTP — what a request, response, status code, and header are
- Familiarity with the command line (running commands, setting environment variables)
- Knowing what a database is and having used SQL at least once helps for Chapters 7 onward
- Docker installed is useful for Chapter 10, but not required to follow the earlier chapters

---

## How to Use This Guide

1. **Follow the numbered order on your first pass.** Each chapter builds on vocabulary and patterns from the previous one. Jumping to Chapter 10 without reading Chapters 1-4 will leave gaps.

2. **Type the code, do not just read it.** Go's syntax is deliberately minimal, but the patterns — especially error handling and goroutines — only stick when you have typed them and watched them compile.

3. **Run every example with the race detector during development.** Use `go run -race main.go` and `go test -race ./...` whenever concurrency is involved. Races that are silent in normal runs become loud failures under `-race`.

4. **Treat the analogy sections as your mental model, not decoration.** Each chapter opens with a real-world analogy (goroutines as bicycle couriers, context as a radio signal, Redis as a librarian). These are the fastest way to build intuition before reading the code.

5. **Use Chapter 10 as your reference project.** Once you have read the foundational chapters, the Production API Project is a complete, runnable codebase. When you start your own project, open it alongside your editor and use it as a structural template.

---

Go rewards consistency and simplicity. The language has fewer features than most, which means there is usually one clear, idiomatic way to do something — find it early and stick with it.
