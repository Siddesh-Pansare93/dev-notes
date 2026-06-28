# Python Testing & Tooling

Everything you need to write reliable Python code with confidence — from your first pytest test to a complete quality pipeline with linting, type checking, and automated git hooks. Written for developers coming from a Node.js/TypeScript background.

## Table of Contents

### Part 1 — Writing Tests
1. [pytest Basics](./01_pytest_basics.md) — test discovery, assertions, parametrize, markers, and configuration
2. [Fixtures and Mocking](./02_fixtures_and_mocking.md) — dependency injection for tests, conftest.py, unittest.mock, and monkeypatch
3. [Async Testing](./03_async_testing.md) — pytest-asyncio, async fixtures, AsyncMock, aiohttp, and FastAPI testing

### Part 2 — Code Quality & Project Structure
4. [Code Quality Tools](./04_code_quality.md) — Ruff, Black, mypy, isort, pre-commit hooks, and CI pipelines
5. [Project Structure](./05_project_structure.md) — flat vs src layout, pyproject.toml anatomy, and real-world project examples

---

## Learning Path

### Beginner — Start here if you are new to testing in Python
1. Chapter 1: pytest Basics — learn how test discovery works, write your first tests with plain `assert`, and run tests from the command line
2. Chapter 2: Fixtures and Mocking (first half) — understand fixtures as a replacement for `beforeEach`/`afterEach`, and set up `conftest.py` for shared fixtures
3. Chapter 4: Code Quality Tools (Ruff + Black sections only) — get formatting and linting working locally with one tool

### Intermediate — Once your tests are running
1. Chapter 2: Fixtures and Mocking (mocking sections) — use `unittest.mock.patch`, `MagicMock`, and `monkeypatch` to isolate units under test
2. Chapter 3: Async Testing — add `pytest-asyncio` to your project and test coroutines, async generators, and HTTP clients
3. Chapter 4: Code Quality Tools (mypy + pre-commit sections) — add type checking and automate quality gates before every commit
4. Chapter 5: Project Structure — understand the `src/` layout and `pyproject.toml` anatomy

### Advanced — Production-ready quality pipeline
1. Chapter 4: Unified Configuration — consolidate all tool config into a single `pyproject.toml` and wire up a GitHub Actions CI workflow
2. Chapter 5: Project Structure — apply structure patterns to scripts, libraries, FastAPI apps, and monorepos
3. Revisit Chapter 2 — deep-dive fixture scopes (`session` vs `function`), fixture factories, and `conftest.py` hierarchy for large test suites

---

## What You'll Learn

- How pytest discovers and runs tests, and how its `assert` rewriting gives better failure messages than Jest's `expect()` API
- Parameterized testing with `@pytest.mark.parametrize` — run dozens of input/output cases with zero copy-paste
- How pytest fixtures replace `beforeEach`/`beforeAll`/`afterAll` with a cleaner dependency injection model
- The `conftest.py` system for sharing fixtures across files and directories without imports
- Mocking external dependencies using `unittest.mock.Mock`, `MagicMock`, `patch`, and the `monkeypatch` fixture
- Using `AsyncMock` and `pytest-asyncio` to test async code including FastAPI endpoints and aiohttp clients
- Formatting Python code with Black and Ruff (the Prettier and ESLint of the Python world)
- Static type checking with mypy — including gradual adoption strategies and `pyproject.toml` configuration
- Automating quality checks before every commit using `pre-commit` hooks
- Organizing all tool configuration (pytest, Ruff, mypy, coverage) in a single `pyproject.toml`
- Structuring Python projects following the `src/` layout convention with proper entry points

---

## Prerequisites

- Comfortable writing Python functions, classes, and basic data structures
- Familiar with virtual environments (`python -m venv`) and installing packages with `pip`
- Some prior experience with testing concepts — unit tests, mocking, assertions — even if from another language (Jest, JUnit, RSpec)
- No prior pytest knowledge required; each chapter builds from scratch

---

## How to Use This Guide

1. **Follow the numbered order.** Each chapter builds on the previous one — fixtures in Chapter 2 reference test patterns from Chapter 1, and the quality tools in Chapter 4 assume your test suite exists.
2. **Do the practice exercises.** Every chapter ends with hands-on exercises. The ShoppingCart, TodoList, GitHubClient, and FizzBuzz exercises are designed to let you apply concepts immediately on realistic code.
3. **Compare with what you know.** Each chapter includes side-by-side comparisons between Python tools and their Node.js/TypeScript equivalents (Jest, ESLint, Prettier, tsc, husky). Use these as anchors when something feels unfamiliar.
4. **Set up your editor early.** Chapter 4 includes VSCode settings that wire up format-on-save with Ruff. Getting this working before you start coding pays dividends throughout the rest of the guide.
5. **Treat `pyproject.toml` as your single source of truth.** Everything — test config, linter rules, type checker settings, coverage thresholds — lives in one file. The unified configuration example in Chapter 4 is worth copying into your own projects.

---

Good tests and sharp tooling are what separate Python you write quickly from Python you can maintain confidently. Work through these chapters and you will have both.
