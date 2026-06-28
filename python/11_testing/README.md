# Python Testing Deep Dive

A practical, hands-on guide to testing modern Python applications — covering FastAPI integration testing, advanced mocking, async code, database isolation, LLM/AI application testing, and CI/CD automation. Built for developers who want to write tests that actually catch bugs and survive refactors.

## Table of Contents

- [Comprehensive Testing Guide](./01_comprehensive_testing.md)
  - E2E Testing with FastAPI TestClient
  - Mocking External APIs (`respx`, `responses`)
  - Database Testing Strategies
  - Testing Async Code with `pytest-asyncio`
  - Testing LangChain / LLM Applications
  - Best Practices and Anti-Patterns
  - CI/CD Integration with GitHub Actions
  - Practice Exercises

## Learning Path

### Beginner
Start here if you are new to pytest or Python testing in general.

1. **Setup Instructions** — `01_comprehensive_testing.md` (Setup section)
2. **E2E Testing with FastAPI TestClient** — Basic endpoint tests, POST request validation
3. **Best Practices: AAA Pattern** — Arrange, Act, Assert

### Intermediate
You know pytest basics and want to write more robust, isolated tests.

4. **Mocking External APIs** — `respx` for httpx, `responses` for requests
5. **Database Testing Strategies** — In-memory SQLite, pytest fixtures, FastAPI dependency overrides
6. **Testing Async Code** — `pytest-asyncio`, `httpx.AsyncClient` for async endpoints

### Advanced
You are building production-grade APIs or AI-powered applications.

7. **Testing LangChain / LLM Applications** — Mocking OpenAI, using `FakeListLLM`
8. **CI/CD Integration** — GitHub Actions workflow with coverage reporting
9. **Practice Exercises** — Parametrize inputs, seed databases, test file uploads

## What You'll Learn

- Write E2E tests for FastAPI endpoints using `TestClient` without spinning up a live server
- Override FastAPI dependencies (auth, DB sessions) cleanly inside tests
- Mock HTTP calls to external APIs using `respx` (for `httpx`) and `responses` (for `requests`)
- Set up isolated test databases using SQLite in-memory and pytest fixtures
- Test `async` Python functions and async FastAPI endpoints with `pytest-asyncio`
- Mock OpenAI API calls and use LangChain's `FakeListLLM` for deterministic LLM tests
- Apply the AAA (Arrange-Act-Assert) pattern for readable, maintainable test code
- Use `@pytest.mark.parametrize` to cover multiple input cases without test duplication
- Generate coverage reports and integrate the full test suite into a GitHub Actions CI pipeline

## Prerequisites

- Comfortable writing Python functions and classes
- Basic familiarity with FastAPI (routes, request/response models, dependencies)
- Some exposure to `pytest` — running tests, writing basic `assert` statements
- Understanding of async/await syntax in Python is helpful for the async sections
- No prior mocking experience required

## How to Use This Guide

1. **Install the stack first.** Run the setup command at the top of `01_comprehensive_testing.md` before anything else — all examples depend on those packages.
2. **Follow the examples in order.** Each example builds on the one before it; the database fixture example, for instance, feeds directly into the FastAPI dependency override example.
3. **Type the code yourself.** Copy-paste works, but typing forces you to read every line and notice what each argument does.
4. **Run tests after each example.** Use `pytest -v` so you see which tests pass and what output they produce — green feedback reinforces the mental model.
5. **Attempt the practice exercises at the end.** They cover gaps that the examples deliberately leave open (file uploads, seeded databases, parametrized validation) and are the best way to solidify what you've learned.

Testing well is what separates code you can ship confidently from code you can only hope works — keep writing tests, keep refactoring, and let the suite back you up.
