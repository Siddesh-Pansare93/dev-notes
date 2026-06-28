# Python Project Structure

> **Coming from Node.js/TypeScript?** Python project structure conventions differ from
> Node.js in important ways. There is no `node_modules/`, no `dist/`, and `pyproject.toml`
> replaces `package.json`. This chapter maps every Node.js concept to its Python equivalent
> and shows you how to structure projects of any size.

---

## Table of Contents

1. [Quick Mapping: Node.js to Python](#quick-mapping)
2. [Flat Layout vs src/ Layout](#flat-vs-src-layout)
3. [pyproject.toml Anatomy](#pyprojecttoml-anatomy)
4. [Entry Points and Scripts](#entry-points-and-scripts)
5. [Example: Simple Script Project](#example-simple-script)
6. [Example: Library/Package](#example-library)
7. [Example: FastAPI Web Application](#example-fastapi-web-app)
8. [Example: Full-Stack with Frontend](#example-full-stack)
9. [Monorepo Patterns](#monorepo-patterns)
10. [Common Files and Their Node.js Equivalents](#common-files)
11. [Practice Exercises](#practice-exercises)

---

## Quick Mapping: Node.js to Python

| Node.js / TypeScript | Python | Notes |
|---|---|---|
| `package.json` | `pyproject.toml` | Project metadata, dependencies, scripts |
| `node_modules/` | `.venv/` (virtual env) | Per-project dependencies |
| `package-lock.json` | `uv.lock` / `requirements.txt` | Lock file for reproducible installs |
| `npm install` / `yarn` | `pip install` / `uv sync` | Install dependencies |
| `npx` | `uvx` / `python -m` | Run tools without installing |
| `dist/` (build output) | `dist/` (wheel/sdist) | Built packages |
| `src/` | `src/` (optional) | Source code |
| `index.js` / `index.ts` | `__init__.py` | Package entry point / module marker |
| `tsconfig.json` | `pyproject.toml [tool.mypy]` | Type checking config |
| `.eslintrc` | `pyproject.toml [tool.ruff]` | Linter config |
| `.prettierrc` | `pyproject.toml [tool.ruff.format]` | Formatter config |
| `jest.config.js` | `pyproject.toml [tool.pytest]` | Test config |
| `.env` | `.env` | Same! (use python-dotenv) |
| `.nvmrc` | `.python-version` | Pin language version |
| `Dockerfile` | `Dockerfile` | Same! |

---

## Flat Layout vs src/ Layout

Python has two common project layouts. Both are valid; the `src/` layout is recommended
for libraries.

### Flat Layout (Simple, Common for Apps)

```
my_project/
    my_project/          # Package directory (same name as project)
        __init__.py
        main.py
        models.py
        utils.py
    tests/
        __init__.py
        test_main.py
        test_models.py
    pyproject.toml
    README.md
```

Node.js equivalent:
```
my-project/
    src/
        index.ts
        models.ts
        utils.ts
    tests/
        index.test.ts
        models.test.ts
    package.json
    README.md
```

### src/ Layout (Recommended for Libraries)

```
my_project/
    src/
        my_project/      # Package directory nested inside src/
            __init__.py
            main.py
            models.py
            utils.py
    tests/
        __init__.py
        test_main.py
        test_models.py
    pyproject.toml
    README.md
```

**Why src/ layout?**
- Prevents accidentally importing from the working directory instead of the installed
  package. In the flat layout, `import my_project` might resolve to the local directory
  rather than the installed version.
- Forces you to install the package (`pip install -e .`) before running tests, ensuring
  tests run against the same code users will get.
- Standard practice for publishable libraries.

**When to use flat layout:**
- Web applications (FastAPI, Django) that will never be published as a package
- Simple scripts and tools
- When you want to run files directly without installing

---

## pyproject.toml Anatomy

### Full pyproject.toml with Explanations

```toml
# ============================================================
# Build System (like "main" and "types" in package.json)
# ============================================================
[build-system]
requires = ["hatchling"]       # Build tool (hatch, setuptools, flit, pdm)
build-backend = "hatchling.build"

# ============================================================
# Project Metadata (like package.json top-level fields)
# ============================================================
[project]
name = "my-awesome-project"    # package.json "name"
version = "1.2.3"              # package.json "version"
description = "A great project" # package.json "description"
readme = "README.md"           # Points to readme file
license = {text = "MIT"}       # package.json "license"
requires-python = ">=3.11"     # package.json "engines.node"
authors = [
    {name = "Your Name", email = "you@example.com"},
]
keywords = ["web", "api"]      # package.json "keywords"

# ---- Dependencies (like package.json "dependencies") ----
dependencies = [
    "fastapi>=0.115.0",        # Like "fastapi": "^0.115.0"
    "httpx>=0.28.0,<1.0",      # Like "httpx": ">=0.28.0 <1.0"
    "sqlalchemy~=2.0",         # Like "sqlalchemy": "~2.0"  (compatible release)
    "pydantic>=2.0",
]

# ---- Dev Dependencies (like package.json "devDependencies") ----
[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-asyncio>=0.24",
    "pytest-cov>=6.0",
    "ruff>=0.8.0",
    "mypy>=1.13",
    "pre-commit>=4.0",
]
docs = [
    "mkdocs>=1.6",
    "mkdocs-material>=9.5",
]

# ---- URLs (like package.json "homepage", "repository", "bugs") ----
[project.urls]
Homepage = "https://github.com/you/my-project"
Repository = "https://github.com/you/my-project"
Documentation = "https://my-project.readthedocs.io"
Issues = "https://github.com/you/my-project/issues"

# ---- Entry Points (like package.json "bin") ----
[project.scripts]
my-cli = "my_project.cli:main"    # Creates `my-cli` command

# ---- GUI Scripts ----
[project.gui-scripts]
my-app = "my_project.gui:main"

# ---- Plugin Entry Points (no Node.js equivalent) ----
[project.entry-points."my_project.plugins"]
csv = "my_project.plugins.csv:CsvPlugin"
json = "my_project.plugins.json:JsonPlugin"
```

### Side-by-Side: package.json vs pyproject.toml

```json
// package.json
{
    "name": "my-api",
    "version": "1.0.0",
    "description": "My REST API",
    "main": "dist/index.js",
    "scripts": {
        "start": "node dist/index.js",
        "dev": "ts-node src/index.ts",
        "build": "tsc",
        "test": "jest",
        "lint": "eslint src/"
    },
    "dependencies": {
        "express": "^4.18.0",
        "zod": "^3.22.0"
    },
    "devDependencies": {
        "typescript": "^5.3.0",
        "jest": "^29.7.0",
        "@types/express": "^4.17.0",
        "eslint": "^8.56.0"
    },
    "engines": {
        "node": ">=20.0.0"
    }
}
```

```toml
# pyproject.toml (equivalent)
[project]
name = "my-api"
version = "1.0.0"
description = "My REST API"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.115.0",
    "pydantic>=2.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "ruff>=0.8.0",
    "mypy>=1.13",
]

[project.scripts]
# "npm start" equivalent - creates a CLI command
my-api = "my_api.main:start"

# There's no direct "scripts" equivalent like npm scripts.
# Use a Makefile or task runner instead.
```

### Version Specifiers

| npm / yarn | pip / pyproject.toml | Meaning |
|---|---|---|
| `^1.2.3` | `>=1.2.3,<2.0` | Compatible within major |
| `~1.2.3` | `~=1.2.3` | Compatible within minor |
| `1.2.3` | `==1.2.3` | Exact version |
| `>=1.2.3` | `>=1.2.3` | Minimum version |
| `*` | (omit version) | Any version |

---

## Entry Points and Scripts

### CLI Entry Points (like package.json "bin")

```toml
# pyproject.toml
[project.scripts]
my-tool = "my_project.cli:main"
```

```python
# src/my_project/cli.py
import argparse

def main():
    parser = argparse.ArgumentParser(description="My awesome tool")
    parser.add_argument("name", help="Your name")
    parser.add_argument("--greeting", default="Hello", help="Greeting to use")
    args = parser.parse_args()
    print(f"{args.greeting}, {args.name}!")

if __name__ == "__main__":
    main()
```

After `pip install -e .`:
```bash
$ my-tool World
Hello, World!

$ my-tool World --greeting "Hey"
Hey, World!
```

Node.js equivalent:
```json
// package.json
{ "bin": { "my-tool": "dist/cli.js" } }
```

### The __main__.py Pattern

```python
# src/my_project/__main__.py
"""Allows running the package with: python -m my_project"""
from my_project.cli import main

main()
```

```bash
# These two are equivalent:
my-tool World
python -m my_project World
```

This is like having `"main": "dist/index.js"` in package.json -- it defines what
happens when you "run" the package.

### Using __init__.py for Public API

```python
# src/my_project/__init__.py
"""Define the public API of the package."""

# Like "exports" in package.json or index.ts re-exports
from my_project.core import Calculator
from my_project.utils import format_number, parse_input
from my_project.models import Result

__all__ = [
    "Calculator",
    "format_number",
    "parse_input",
    "Result",
]

__version__ = "1.2.3"
```

```python
# Users can now do:
from my_project import Calculator, format_number
# Instead of:
from my_project.core import Calculator
from my_project.utils import format_number
```

---

## Example: Simple Script Project

A utility script or automation tool. The Python equivalent of a small Node.js CLI tool.

```
file-organizer/
    src/
        file_organizer/
            __init__.py
            cli.py               # CLI entry point (argparse)
            organizer.py         # Core logic
            rules.py             # File organization rules
            config.py            # Configuration handling
    tests/
        __init__.py
        conftest.py              # Shared test fixtures
        test_organizer.py
        test_rules.py
    pyproject.toml
    README.md
    .gitignore
```

```toml
# pyproject.toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "file-organizer"
version = "0.1.0"
description = "Organize files in a directory by type"
requires-python = ">=3.11"
dependencies = []  # No external dependencies for a simple tool

[project.scripts]
organize = "file_organizer.cli:main"

[project.optional-dependencies]
dev = ["pytest>=8.0", "ruff>=0.8.0"]

[tool.pytest.ini_options]
testpaths = ["tests"]

[tool.ruff]
line-length = 88
```

```python
# src/file_organizer/__init__.py
"""File Organizer - sort files by type."""
__version__ = "0.1.0"

# src/file_organizer/cli.py
import argparse
from pathlib import Path
from file_organizer.organizer import organize_directory

def main():
    parser = argparse.ArgumentParser(description="Organize files by type")
    parser.add_argument("directory", type=Path, help="Directory to organize")
    parser.add_argument("--dry-run", action="store_true", help="Show what would happen")
    args = parser.parse_args()
    organize_directory(args.directory, dry_run=args.dry_run)

if __name__ == "__main__":
    main()
```

---

## Example: Library/Package

A reusable library published to PyPI (like publishing to npm).

```
python-slugify/
    src/
        slugify/
            __init__.py          # Public API exports
            core.py              # Main slugification logic
            transliterate.py     # Unicode transliteration
            special.py           # Special character handling
            py.typed             # PEP 561: marks package as typed
    tests/
        __init__.py
        conftest.py
        test_core.py
        test_transliterate.py
        test_special.py
        test_integration.py
    docs/
        index.md
        api.md
        changelog.md
    pyproject.toml
    README.md
    LICENSE
    CHANGELOG.md
    .github/
        workflows/
            ci.yml
            publish.yml
```

```toml
# pyproject.toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "python-slugify"
version = "0.1.0"
description = "Generate URL-friendly slugs from strings"
readme = "README.md"
license = {text = "MIT"}
requires-python = ">=3.10"
classifiers = [
    "Development Status :: 4 - Beta",
    "Programming Language :: Python :: 3",
    "License :: OSI Approved :: MIT License",
    "Typing :: Typed",
]
dependencies = []

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-cov>=6.0",
    "ruff>=0.8.0",
    "mypy>=1.13",
]
docs = [
    "mkdocs>=1.6",
    "mkdocs-material>=9.5",
]

[project.urls]
Homepage = "https://github.com/you/python-slugify"
Documentation = "https://python-slugify.readthedocs.io"

# ---- Tool Configuration ----
[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = ["-ra", "--strict-markers"]

[tool.ruff]
line-length = 88
target-version = "py310"

[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B", "SIM", "RUF"]

[tool.mypy]
python_version = "3.10"
strict = true

[tool.coverage.run]
source = ["src/slugify"]
branch = true

[tool.coverage.report]
fail_under = 90
show_missing = true
```

```python
# src/slugify/__init__.py
"""Python Slugify - generate URL-friendly slugs."""
from slugify.core import slugify, Slugifier

__all__ = ["slugify", "Slugifier"]
__version__ = "0.1.0"
```

### Publishing (like npm publish)

```bash
# Build the package
python -m build

# Upload to PyPI (like npm publish)
twine upload dist/*

# Or test on TestPyPI first
twine upload --repository testpypi dist/*
```

The `py.typed` marker file tells type checkers that this package includes type
information. It is the Python equivalent of including `.d.ts` files in an npm package.

---

## Example: FastAPI Web Application

A REST API application. The Python equivalent of an Express/NestJS project.

```
my_api/
    src/
        my_api/
            __init__.py
            main.py              # App creation and startup
            config.py            # Settings (like config/index.ts)
            dependencies.py      # Dependency injection (like middleware)

            # Feature-based organization (like NestJS modules)
            users/
                __init__.py
                router.py        # Route definitions (like users.controller.ts)
                service.py       # Business logic (like users.service.ts)
                models.py        # Database models (like users.entity.ts)
                schemas.py       # Request/Response schemas (like users.dto.ts)

            products/
                __init__.py
                router.py
                service.py
                models.py
                schemas.py

            # Shared utilities
            common/
                __init__.py
                database.py      # Database connection
                auth.py          # Authentication utilities
                exceptions.py    # Custom exceptions
                middleware.py    # Custom middleware

    tests/
        __init__.py
        conftest.py              # Shared fixtures: app, client, db
        users/
            __init__.py
            test_router.py
            test_service.py
        products/
            __init__.py
            test_router.py

    migrations/                  # Database migrations (like Prisma migrations)
        versions/
            001_initial.py
        env.py

    pyproject.toml
    alembic.ini                  # Migration tool config
    Dockerfile
    docker-compose.yml
    .env.example
    Makefile
```

```python
# src/my_api/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from my_api.config import settings
from my_api.common.database import init_db, close_db
from my_api.users.router import router as users_router
from my_api.products.router import router as products_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events (like Express middleware setup)."""
    await init_db()
    yield
    await close_db()

def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        lifespan=lifespan,
    )
    app.include_router(users_router, prefix="/api/users", tags=["users"])
    app.include_router(products_router, prefix="/api/products", tags=["products"])
    return app

app = create_app()
```

```python
# src/my_api/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Application settings loaded from environment variables.
    Like dotenv + zod validation combined."""

    APP_NAME: str = "My API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    DATABASE_URL: str = "sqlite+aiosqlite:///./dev.db"
    SECRET_KEY: str = "change-me-in-production"
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    model_config = {"env_file": ".env"}

settings = Settings()
```

```python
# src/my_api/users/schemas.py (like DTOs in NestJS)
from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str

    model_config = {"from_attributes": True}  # Allow ORM objects

class UserList(BaseModel):
    users: list[UserResponse]
    total: int
```

```python
# src/my_api/users/router.py (like a controller)
from fastapi import APIRouter, Depends, HTTPException
from my_api.users import schemas, service
from my_api.dependencies import get_current_user

router = APIRouter()

@router.get("/", response_model=schemas.UserList)
async def list_users(skip: int = 0, limit: int = 20):
    users, total = await service.get_users(skip=skip, limit=limit)
    return schemas.UserList(users=users, total=total)

@router.post("/", response_model=schemas.UserResponse, status_code=201)
async def create_user(user: schemas.UserCreate):
    return await service.create_user(user)

@router.get("/me", response_model=schemas.UserResponse)
async def get_current_user_profile(
    current_user = Depends(get_current_user),  # Dependency injection!
):
    return current_user
```

Compare with Express/NestJS:

```typescript
// Express equivalent
router.get('/', async (req, res) => {
    const users = await userService.getUsers(req.query.skip, req.query.limit);
    res.json(users);
});

router.post('/', validateBody(UserCreateSchema), async (req, res) => {
    const user = await userService.createUser(req.body);
    res.status(201).json(user);
});
```

```python
# tests/conftest.py
import pytest
from httpx import AsyncClient, ASGITransport
from my_api.main import create_app

@pytest.fixture(scope="session")
def app():
    return create_app()

@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

@pytest.fixture
async def auth_client(client):
    """Client with authentication token."""
    token = "test-token-123"
    client.headers["Authorization"] = f"Bearer {token}"
    return client
```

```makefile
# Makefile
.PHONY: dev test lint migrate

dev:
	uvicorn my_api.main:app --reload --port 8000

test:
	pytest --cov=src -x

lint:
	ruff check . && ruff format --check . && mypy src/

migrate:
	alembic upgrade head

migrate-create:
	alembic revision --autogenerate -m "$(msg)"

docker-build:
	docker build -t my-api .

docker-run:
	docker-compose up -d
```

---

## Example: Full-Stack with Frontend

A project with both Python backend and a JS/TS frontend (React, Vue, etc.).

```
my-fullstack-app/
    backend/
        src/
            my_api/
                __init__.py
                main.py
                config.py
                users/
                    ...
                common/
                    ...
        tests/
            ...
        pyproject.toml
        Dockerfile

    frontend/
        src/
            App.tsx
            components/
            pages/
            api/                 # API client (generated from OpenAPI spec)
        package.json
        tsconfig.json
        vite.config.ts
        Dockerfile

    docker-compose.yml           # Run both services
    Makefile                     # Top-level commands
    .github/
        workflows/
            ci.yml
    README.md
```

```yaml
# docker-compose.yml
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/myapp
    depends_on:
      - db

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://localhost:8000

  db:
    image: postgres:16
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=myapp
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

```makefile
# Top-level Makefile
.PHONY: dev test lint

# Start both frontend and backend in dev mode
dev:
	docker-compose up

# Run all tests
test:
	cd backend && pytest
	cd frontend && npm test

# Lint everything
lint:
	cd backend && ruff check . && mypy src/
	cd frontend && npm run lint

# Generate API client from OpenAPI spec
api-client:
	cd backend && python -c "from my_api.main import app; import json; print(json.dumps(app.openapi()))" > openapi.json
	cd frontend && npx openapi-typescript-codegen -i ../openapi.json -o src/api/generated
```

---

## Monorepo Patterns

### Simple Monorepo with Shared Code

```
monorepo/
    packages/
        shared/                  # Shared library
            src/
                shared/
                    __init__.py
                    models.py
                    utils.py
            pyproject.toml

        api/                     # API service
            src/
                api/
                    __init__.py
                    main.py
            pyproject.toml       # depends on "shared"

        worker/                  # Background worker
            src/
                worker/
                    __init__.py
                    tasks.py
            pyproject.toml       # depends on "shared"

    pyproject.toml               # Root config (optional, for workspace tools)
    uv.lock                      # Unified lock file (with uv workspaces)
```

```toml
# Root pyproject.toml (using uv workspaces - like npm workspaces)
[tool.uv.workspace]
members = ["packages/*"]
```

```toml
# packages/api/pyproject.toml
[project]
name = "my-api"
version = "0.1.0"
dependencies = [
    "shared",       # Local dependency from workspace
    "fastapi>=0.115.0",
]

[tool.uv.sources]
shared = { workspace = true }
```

### Monorepo with uv (Modern Approach)

```bash
# uv is the modern Python package manager (like pnpm for Python)
# It supports workspaces natively

# Install all workspace packages
uv sync

# Run a command in a specific package
uv run --package api uvicorn api.main:app

# Add a dependency to a specific package
uv add --package api httpx
```

Compare with npm/pnpm workspaces:
```bash
# npm workspaces
npm install           # Install all packages
npm run dev -w api    # Run in specific workspace
npm add httpx -w api  # Add dep to specific workspace
```

---

## Common Files and Their Node.js Equivalents

| File | Purpose | Node.js Equivalent |
|---|---|---|
| `pyproject.toml` | All project config | `package.json` + config files |
| `__init__.py` | Package marker, public API | `index.ts` |
| `__main__.py` | `python -m package` entry | `"main"` in package.json |
| `conftest.py` | Shared test fixtures | No equivalent (closest: test setup files) |
| `py.typed` | Type stub marker (PEP 561) | Including `.d.ts` files |
| `.python-version` | Pin Python version | `.nvmrc` / `.node-version` |
| `requirements.txt` | Pinned dependencies (legacy) | `package-lock.json` |
| `uv.lock` | Lock file (modern) | `package-lock.json` / `pnpm-lock.yaml` |
| `Makefile` | Project commands/scripts | `"scripts"` in package.json |
| `setup.py` | Legacy build config | (deprecated, use pyproject.toml) |
| `setup.cfg` | Legacy config | (deprecated, use pyproject.toml) |
| `MANIFEST.in` | Control what goes in the package | `.npmignore` |
| `tox.ini` | Test across Python versions | (like testing across Node versions in CI) |
| `.env` | Environment variables | `.env` (same) |
| `alembic.ini` | Database migration config | `prisma/schema.prisma` |

### The .gitignore for Python

```gitignore
# Python
__pycache__/
*.py[cod]
*$py.class
*.so

# Virtual environments
.venv/
venv/
ENV/

# Distribution
dist/
build/
*.egg-info/

# IDE
.vscode/
.idea/

# Testing
.pytest_cache/
.coverage
htmlcov/
.mypy_cache/

# Environment
.env
.env.local

# OS
.DS_Store
Thumbs.db
```

Compare with Node.js `.gitignore`:
```gitignore
# Node.js
node_modules/
dist/
coverage/
.env
.env.local
.DS_Store
```

---

## Practice Exercises

### Exercise 1: Create a CLI Tool Project

Build a complete project structure for a command-line tool that converts CSV files to JSON:

Requirements:
1. Use the `src/` layout
2. Include `pyproject.toml` with proper metadata and dependencies
3. Register a CLI entry point `csv2json`
4. Include a `__main__.py` for `python -m csv2json`
5. Organize code into modules: `cli.py`, `converter.py`, `formatters.py`
6. Add a tests directory with `conftest.py`
7. Add Ruff, mypy, and pytest configuration in `pyproject.toml`
8. Add a `Makefile` with `dev`, `test`, `lint`, and `build` targets
9. Add a `.gitignore`

Implement at least the project skeleton with proper `__init__.py` files and function
stubs with type annotations.

### Exercise 2: Restructure a Flat Script into a Package

Take this single-file script and restructure it into a proper package:

```python
# old_script.py - Everything in one file!
import json
import os
import sys
from datetime import datetime
from pathlib import Path

DB_PATH = os.environ.get("DB_PATH", "data.json")

def load_data():
    if Path(DB_PATH).exists():
        with open(DB_PATH) as f:
            return json.load(f)
    return {"tasks": [], "next_id": 1}

def save_data(data):
    with open(DB_PATH, "w") as f:
        json.dump(data, f, indent=2, default=str)

def add_task(title):
    data = load_data()
    task = {
        "id": data["next_id"],
        "title": title,
        "completed": False,
        "created_at": datetime.now().isoformat(),
    }
    data["tasks"].append(task)
    data["next_id"] += 1
    save_data(data)
    print(f"Added task #{task['id']}: {title}")

def list_tasks(show_completed=False):
    data = load_data()
    for task in data["tasks"]:
        if show_completed or not task["completed"]:
            status = "x" if task["completed"] else " "
            print(f"  [{status}] #{task['id']}: {task['title']}")

def complete_task(task_id):
    data = load_data()
    for task in data["tasks"]:
        if task["id"] == task_id:
            task["completed"] = True
            save_data(data)
            print(f"Completed task #{task_id}")
            return
    print(f"Task #{task_id} not found")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: task <add|list|complete> [args]")
        sys.exit(1)

    command = sys.argv[1]
    if command == "add":
        add_task(" ".join(sys.argv[2:]))
    elif command == "list":
        list_tasks("--all" in sys.argv)
    elif command == "complete":
        complete_task(int(sys.argv[2]))
```

Restructure into:
```
task_manager/
    src/
        task_manager/
            __init__.py
            cli.py           # CLI argument parsing
            models.py        # Task dataclass
            storage.py       # load/save data
            service.py       # Business logic (add, list, complete)
            config.py        # Configuration from env vars
    tests/
        conftest.py          # Fixtures: tmp_path for test database
        test_service.py
        test_storage.py
    pyproject.toml
```

Add type annotations, proper error handling, and at least 5 tests.

### Exercise 3: FastAPI Application Structure

Create the full project structure for a bookstore API:

Features:
- Books CRUD (title, author, isbn, price, stock)
- Authors CRUD (name, bio, birth_date)
- Reviews (user, rating, text, book_id)
- Search by title/author

Requirements:
1. Feature-based folder organization (books/, authors/, reviews/)
2. Each feature has: router.py, service.py, models.py, schemas.py
3. Shared code in common/ (database.py, auth.py, pagination.py)
4. Proper conftest.py with app, client, and database fixtures
5. Config management with pydantic-settings
6. Alembic for migrations
7. Docker setup (Dockerfile + docker-compose.yml)
8. Makefile with dev, test, migrate, and docker commands

Create the full directory structure with all files stubbed out (function signatures
with type annotations, proper imports, docstrings, but `pass` or `...` for
implementations).

### Exercise 4: Compare and Convert

Take an existing Node.js project structure and create the Python equivalent. Here is a
typical Express + TypeScript project:

```
node-api/
    src/
        index.ts
        config/
            index.ts
            database.ts
        middleware/
            auth.ts
            errorHandler.ts
            logger.ts
        modules/
            users/
                users.controller.ts
                users.service.ts
                users.model.ts
                users.schema.ts
                users.test.ts
            posts/
                posts.controller.ts
                posts.service.ts
                posts.model.ts
                posts.schema.ts
                posts.test.ts
        utils/
            hash.ts
            jwt.ts
    tests/
        setup.ts
        integration/
            users.test.ts
    package.json
    tsconfig.json
    jest.config.js
    .eslintrc.js
    .prettierrc
    Dockerfile
    docker-compose.yml
```

Map every file and directory to its Python equivalent. Note which files merge
(all config files merge into pyproject.toml), which split (tests move out of
src/), and which are new (conftest.py, __init__.py files).

---

## Key Takeaways

1. **Use `src/` layout for libraries, flat layout for apps.** When in doubt, use `src/`.
2. **pyproject.toml is everything.** Dependencies, tool config, metadata -- one file.
3. **`__init__.py` defines your public API.** Think of it as `index.ts` for re-exports.
4. **Feature-based organization works great.** Group by feature (users/, products/), not by
   layer (controllers/, services/).
5. **conftest.py is unique to Python.** Use the directory hierarchy for fixture scoping.
6. **Makefile replaces npm scripts.** Or use a task runner if you prefer.
7. **uv is the modern package manager.** It supports workspaces, is fast (written in Rust),
   and handles virtual environments automatically.
8. **The patterns are the same.** Project structure principles from Node.js transfer
   directly. Only the file names and conventions change.
