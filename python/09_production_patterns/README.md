# Production Patterns

Battle-tested patterns for taking a Python AI backend from a working prototype to a
production-grade system — covering architecture, error handling, caching, deployment,
and observability. Written for developers coming from a Node.js/NestJS background who
are building FastAPI + LangGraph applications.

## Table of Contents

### Part 1: Structure and Reliability
1. [Project Architecture](./01_project_architecture.md) — folder layout, app factory pattern, Pydantic settings, dependency injection, and the service/agent layer split
2. [Error Handling and Logging](./02_error_and_logging.md) — structured logging with structlog, custom exception hierarchies, centralized FastAPI error handlers, LLM-specific retry logic, correlation IDs, and Sentry integration

### Part 2: Performance and Cost
3. [Caching](./03_caching.md) — Redis with async Python, exact-match LLM response caching, semantic caching with embeddings, LangChain's built-in cache, cache invalidation strategies, and cost tracking

### Part 3: Operations
4. [Deployment](./04_deployment.md) — multi-stage Docker builds, CI/CD pipelines, and Kubernetes for Python AI backends
5. [Monitoring](./05_monitoring.md) — health check endpoints, Prometheus metrics, LangSmith tracing, and LLM-specific observability (cost alerts, token usage, agent behavior)

## Learning Path

**Beginner — build a solid foundation first**
1. Chapter 1: Project Architecture — start here; get the folder structure and config right before writing a single route
2. Chapter 2: Error Handling and Logging — add structured logging and a custom exception hierarchy while the codebase is still small

**Intermediate — harden for real traffic**
3. Chapter 3: Caching — add Redis-backed LLM and API response caching; understand why it matters for cost, not just speed
4. Chapter 5: Monitoring — wire up health checks and Prometheus metrics so you can see what is happening in production

**Advanced — operate at scale**
5. Chapter 4: Deployment — containerize with multi-stage Docker builds, set up CI/CD, and configure Kubernetes probes tied to your health endpoints

## What You'll Learn

- How to structure a FastAPI + LangGraph project so it does not turn into a mess as it grows
- The Python equivalent of NestJS concepts: modules, providers, exception filters, guards, interceptors
- How to use Pydantic `BaseSettings` for validated, typed configuration — better than `dotenv` + `zod`
- FastAPI's `Depends()` system for dependency injection and how it differs from NestJS's `@Injectable()`
- Structured JSON logging with `structlog` (the Python equivalent of `pino`) and how to bind request-scoped context
- Building a typed exception hierarchy for CRUD errors, LLM rate limits, token overflows, content filter rejections, and agent loop detection
- Propagating correlation IDs through the full async call chain using Python's `contextvars`
- Caching LLM responses in Redis to cut API costs by 40–60% on repeated or similar queries
- Semantic caching with embeddings to catch prompts that are similar but not identical
- Deterministic embedding caching — same text always produces the same vector, so cache it forever
- Cache invalidation strategies: TTL, event-based, version-based, and tag-based
- Multi-stage Docker builds that keep production images small and handle C-extension dependencies
- Kubernetes liveness and readiness probes wired to `/health` and `/ready` endpoints
- LLM-specific monitoring: cost-per-request metrics, token usage dashboards, agent behavior tracing with LangSmith

## Prerequisites

- Comfortable with Python async/await and the basics of FastAPI (routes, Pydantic models)
- Familiar with the general concepts of REST APIs, middleware, and environment-based configuration
- Basic Redis knowledge is helpful but not required — Chapter 3 starts from first principles
- Node.js or NestJS experience is assumed in places where the guides draw direct comparisons, but it is not required to follow along

## How to Use This Guide

1. **Read Chapter 1 before writing any code.** Retrofitting architecture onto an existing messy codebase is ten times harder than starting clean — the project layout and separation-of-concerns rules pay off immediately.
2. **Copy the code snippets into your own project as you go.** The `structlog` setup, Pydantic `Settings` class, exception hierarchy, and FastAPI dependency patterns are drop-in starting points, not illustrations.
3. **Run each chapter's practice exercises.** Every chapter ends with 4–6 exercises that build on each other. The deployment chapter's Dockerfile only makes sense after you have a real app to containerize.
4. **Use the Node.js comparison tables and snippets as a translation guide.** When you see a Python pattern that feels unfamiliar, the NestJS equivalent is usually right beside it.
5. **Treat the cost math seriously.** The caching and monitoring chapters include concrete numbers — GPT-4o pricing, projected savings at different hit rates, token budget math. Run the numbers against your own expected traffic before choosing a caching strategy.

Shipping to production is where Python's ecosystem really shines — `structlog`, `pydantic-settings`, `sentry-sdk`, and the LangSmith integration make observability straightforward once the patterns are in place.
