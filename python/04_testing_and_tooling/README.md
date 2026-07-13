# Python Testing & Tooling

Testing aur quality tools — ye hi cheez hai jo tumhare code ko production-ready banati hai. Node.js/TypeScript se aaoge toh pytest ka ecosystem tumhe kaafi familiar lagega, bas naming thoda alag hai. Yahan tak ke testing patterns bhi bilkul same hain, sirf syntax aur conventions thoda Python-flavored hote hain.

## Table of Contents

### Part 1 — Testing Likho
1. [pytest Basics](./01_pytest_basics.md) — test discovery, assertions, parametrize, markers, aur configuration
2. [Fixtures and Mocking](./02_fixtures_and_mocking.md) — dependency injection for tests, conftest.py, unittest.mock, aur monkeypatch
3. [Async Testing](./03_async_testing.md) — pytest-asyncio, async fixtures, AsyncMock, aiohttp, aur FastAPI testing

### Part 2 — Code Quality & Project Ka Structure
4. [Code Quality Tools](./04_code_quality.md) — Ruff, Black, mypy, isort, pre-commit hooks, aur CI pipelines
5. [Project Structure](./05_project_structure.md) — flat vs src layout, pyproject.toml ki anatomy, aur real-world project examples

---

## Learning Path

### Beginner — Naya ho Python testing mein?
1. Chapter 1: pytest Basics — samjho ke test discovery kaise hoti hai, pehla test likho sirf `assert` se, command line se chalao
2. Chapter 2: Fixtures and Mocking (pehla half) — fixtures ko `beforeEach`/`afterEach` ki jagah samjho, conftest.py setup karo shared fixtures ke liye
3. Chapter 4: Code Quality Tools (sirf Ruff + Black sections) — formatting aur linting locally setup kar le ek hi tool se

### Intermediate — Jab tests chalne lage
1. Chapter 2: Fixtures and Mocking (mocking sections) — `unittest.mock.patch`, `MagicMock`, aur `monkeypatch` use karke units ko isolate karo
2. Chapter 3: Async Testing — `pytest-asyncio` add kar aur coroutines, async generators, aur HTTP clients ko test karo
3. Chapter 4: Code Quality Tools (mypy + pre-commit sections) — type checking add kar aur quality gates automate kar commit se pehle
4. Chapter 5: Project Structure — `src/` layout aur `pyproject.toml` ka anatomy samjho

### Advanced — Production-ready quality pipeline
1. Chapter 4: Unified Configuration — sab tool config ko ek hi `pyproject.toml` mein consolidate kar aur GitHub Actions CI setup kar
2. Chapter 5: Project Structure — structure patterns apply kar scripts, libraries, FastAPI apps, aur monorepos par
3. Chapter 2 revisit — deep-dive fixture scopes (`session` vs `function`), fixture factories, aur `conftest.py` hierarchy large test suites ke liye

---

## Kya Sikhoge

- Pytest test discovery aur running kaise hoti hai, aur kaise `assert` rewriting se better failure messages milte hain (Jest ke `expect()` se bhi jyada readable)
- Parametrized testing `@pytest.mark.parametrize` se — dozens of input/output cases run kar zero copy-paste ke saath
- Pytest fixtures kaise `beforeEach`/`beforeAll`/`afterAll` ko replace karte hain ek cleaner dependency injection model se
- `conftest.py` system kaise काम करता है shared fixtures ke liye files aur directories across, imports ke bina
- External dependencies ko mock karna `unittest.mock.Mock`, `MagicMock`, `patch`, aur `monkeypatch` fixture se
- `AsyncMock` aur `pytest-asyncio` use karke async code test karna including FastAPI endpoints aur aiohttp clients
- Python code ko format karna Black aur Ruff se (basically Prettier aur ESLint of Python world)
- Static type checking mypy se — including gradual adoption strategies aur `pyproject.toml` configuration
- Quality checks automate karna har commit se pehle `pre-commit` hooks use karke
- Sab tool configuration (pytest, Ruff, mypy, coverage) organize karna ek hi `pyproject.toml` mein
- Python projects structure karna `src/` layout convention follow karke proper entry points ke saath

---

## Prerequisites

- Python functions, classes, aur basic data structures likha ho comfortable
- Virtual environments (`python -m venv`) aur `pip` se packages install kiye ho
- Testing concepts ka basic idea ho — unit tests, mocking, assertions — kisi bhi language se (Jest, JUnit, RSpec, kuch bhi)
- Pytest ka prior knowledge zaruri nahi; har chapter se scratch se start hota hai

---

## Kaise Use Karo Ye Guide

1. **Numbered order follow karo.** Har chapter previous one par build hota hai — Chapter 2 mein fixtures, Chapter 1 ke patterns ko reference karte hain, aur Chapter 4 mein quality tools assume karte hain ki tere tests already run rahi hain.
2. **Practice exercises karo.** Har chapter ke end mein hands-on exercises hain. ShoppingCart, TodoList, GitHubClient, aur FizzBuzz exercises design kiye gaye hain concepts ko immediately realistic code par apply karne ke liye.
3. **Compare karo jo pata ho.** Har chapter mein side-by-side comparison hai Python tools aur Node.js/TypeScript equivalents ke beech (Jest, ESLint, Prettier, tsc, husky). Jab kuch unfamiliar lagta ho toh ye comparison use kar anchor bana.
4. **Editor setup kar jaldi.** Chapter 4 mein VSCode settings hain jo format-on-save ko Ruff ke saath wire up karte hain. Ye setup karke coding start kar toh pure guide mein dividend milte hain.
5. **`pyproject.toml` ko single source of truth samjho.** Sab kuch — test config, linter rules, type checker settings, coverage thresholds — ek hi file mein. Chapter 4 mein unified configuration example hai jo apne projects mein copy kar sakte ho.

---

> [!tip]
> Good tests aur sharp tooling ke saath, Python jo likho vo quickly likho hota hai, aur confidently maintain bhi kar sakte ho. Ye chapters complete karne ke baad dono cheezein hogi.

