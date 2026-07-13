# Python Project Structure

> **Node.js/TypeScript se aa rahe ho?** Python ka project structure Node.js se bilkul alag hai. Yahan `node_modules/` nahi hota, `dist/` ki zarurat nahi, aur `package.json` ki jagah `pyproject.toml` use hota hai. Iss chapter mein hum Node.js ke har concept ko Python mein map karenge aur samjhenge ke kaise apne project ko organize karoo — chota ho ya bada, koi bhi size.

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

Socho ek second — Node.js mein `package.json` hota hai na, Python mein `pyproject.toml` wahi kaam karti hai. Yeh table dekho:

| Node.js / TypeScript | Python | Kya hota hai? |
|---|---|---|
| `package.json` | `pyproject.toml` | Project ka metadata, dependencies, scripts |
| `node_modules/` | `.venv/` (virtual env) | Har project ke liye separate dependencies |
| `package-lock.json` | `uv.lock` / `requirements.txt` | Lock file taake same version install ho har baar |
| `npm install` / `yarn` | `pip install` / `uv sync` | Dependencies install karne ka command |
| `npx` | `uvx` / `python -m` | Tools chalao bina install kiye |
| `dist/` (build output) | `dist/` (wheel/sdist) | Built packages |
| `src/` | `src/` (optional) | Source code |
| `index.js` / `index.ts` | `__init__.py` | Package ka entry point / module marker |
| `tsconfig.json` | `pyproject.toml [tool.mypy]` | Type checking ka config |
| `.eslintrc` | `pyproject.toml [tool.ruff]` | Linter configuration |
| `.prettierrc` | `pyproject.toml [tool.ruff.format]` | Formatter configuration |
| `jest.config.js` | `pyproject.toml [tool.pytest]` | Test configuration |
| `.env` | `.env` | Same! (python-dotenv use karo) |
| `.nvmrc` | `.python-version` | Language version pin karne ke liye |
| `Dockerfile` | `Dockerfile` | Same! |

---

## Flat Layout vs src/ Layout

Python mein do common project layouts hain. Dono valid hain, lekin libraries ke liye `src/` layout recommend hota hai.

### Flat Layout (Simple, Apps ke liye Common)

Yeh structure jab simple app banate ho, jabse shuru se package directly project folder mein hota hai:

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

Node.js mein equivalent:
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

### src/ Layout (Libraries ke liye Best)

Zyada structured approach — package ko `src/` folder mein nest karte ho. Socho jaise Flipkart ke warehouse mein — items ko sections mein organize karte ho:

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

**Kyun `src/` layout better hai?**
- Galti se working directory se import nahi hog — Python installed package se hi import karega.
- Jab tests run karte ho, tab package actually install hona padta hai (`pip install -e .`), to test wahi code use karenge jo users use karenge.
- Publishable libraries ke liye standard practice hai.

**Kab flat layout use karo?**
- Web applications (FastAPI, Django) jo kabhie package ban ne wala nahi.
- Simple scripts aur tools.
- Jab directly files chalani hain bina install kiye.

---

## pyproject.toml Anatomy

Yeh file `package.json` jaisa hi hota hai — ek ही file mein sab kuch config. Dekho:

### Full pyproject.toml with Explanations

```toml
# ============================================================
# Build System (package.json ke "main" aur "types" jaisa)
# ============================================================
[build-system]
requires = ["hatchling"]       # Build tool (hatch, setuptools, flit, pdm)
build-backend = "hatchling.build"

# ============================================================
# Project Metadata (package.json ke top-level fields jaisa)
# ============================================================
[project]
name = "my-awesome-project"    # package.json "name"
version = "1.2.3"              # package.json "version"
description = "A great project" # package.json "description"
readme = "README.md"           # Readme file point karo
license = {text = "MIT"}       # package.json "license"
requires-python = ">=3.11"     # package.json "engines.node" jaisa
authors = [
    {name = "Your Name", email = "you@example.com"},
]
keywords = ["web", "api"]      # package.json "keywords"

# ---- Dependencies (package.json "dependencies" jaisa) ----
dependencies = [
    "fastapi>=0.115.0",        # npm ke "fastapi": "^0.115.0" jaisa
    "httpx>=0.28.0,<1.0",      # npm ke "httpx": ">=0.28.0 <1.0"
    "sqlalchemy~=2.0",         # "sqlalchemy": "~2.0" (compatible release)
    "pydantic>=2.0",
]

# ---- Dev Dependencies (package.json "devDependencies" jaisa) ----
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

# ---- URLs (package.json "homepage", "repository", "bugs" jaisa) ----
[project.urls]
Homepage = "https://github.com/you/my-project"
Repository = "https://github.com/you/my-project"
Documentation = "https://my-project.readthedocs.io"
Issues = "https://github.com/you/my-project/issues"

# ---- Entry Points (package.json "bin" jaisa) ----
[project.scripts]
my-cli = "my_project.cli:main"    # `my-cli` command create karta hai

# ---- GUI Scripts ----
[project.gui-scripts]
my-app = "my_project.gui:main"

# ---- Plugin Entry Points (Node.js mein nahi hota) ----
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
# "npm start" equivalent - CLI command create karta hai
my-api = "my_api.main:start"

# Direct "scripts" equivalent nahi hota npm jaisa
# Makefile ya task runner use karo
```

### Version Specifiers

Npm mein aur Python mein version specify karne ka tarika thoda different hai:

| npm / yarn | pip / pyproject.toml | Matlab kya |
|---|---|---|
| `^1.2.3` | `>=1.2.3,<2.0` | Major version mein same rahe |
| `~1.2.3` | `~=1.2.3` | Minor version mein same rahe |
| `1.2.3` | `==1.2.3` | Exact version chahiye |
| `>=1.2.3` | `>=1.2.3` | Minimum version |
| `*` | (omit version) | Koi bhi version |

---

## Entry Points and Scripts

Jaise npm mein `bin` field se CLI commands create karte ho, Python mein `[project.scripts]` se karte ho.

### CLI Entry Points (package.json "bin" jaisa)

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

After `pip install -e .` karte ho (package install ho jaate), to yeh command kaam karega:
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

Socho jaise Swiggy ka main restaurant page hota hai — sab features wahan available. Python mein `__main__.py` wahi kaam karti hai:

```python
# src/my_project/__main__.py
"""Allows running the package with: python -m my_project"""
from my_project.cli import main

main()
```

```bash
# Yeh dono equivalent hain:
my-tool World
python -m my_project World
```

Jaise `"main": "dist/index.js"` package.json mein — `__main__.py` define karti hai ke package run karti time kya execute ho.

### Using __init__.py for Public API

Socho jaise Zomato pe aata hai na — restaurant ka menu sirf unhi dishes ko show karta hai jo chef special banate ho. `__init__.py` mein bhi aisa hi karte ho — sirf important classes aur functions ko expose karte ho:

```python
# src/my_project/__init__.py
"""Define the public API of the package."""

# npm "exports" ya index.ts re-exports jaisa
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
# Ab users aise use kar sakte ho:
from my_project import Calculator, format_number
# Yeh karna padta tha pehle:
from my_project.core import Calculator
from my_project.utils import format_number
```

---

## Example: Simple Script Project

Ek utility script ya automation tool — Zomato ka order status check karne wala tool jaisa. Small Node.js CLI tool ke barabar:

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
dependencies = []  # Simple tool ke liye koi dependencies nahi

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

Reusable library jo PyPI par publish kar do — npm par package publish karne jaisa. Jaise Lodash ko npm mein use karte ho, aise hi Python packages use hote hain:

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

### Publishing (npm publish jaisa)

Jaise npm mein package publish karte ho, Python mein bhi karte ho:

```bash
# Package build karo
python -m build

# PyPI par upload karo (npm publish jaisa)
twine upload dist/*

# Ya pehle test karo TestPyPI par
twine upload --repository testpypi dist/*
```

`py.typed` marker file type checkers ko batata hai ke iss package mein type information hai. npm mein `.d.ts` files include karte ho jaisa, Python mein yeh hota hai.

---

## Example: FastAPI Web Application

REST API application — Express/NestJS ka Python version. Jaise IRCTC booking system ko modular banate ho:

```
my_api/
    src/
        my_api/
            __init__.py
            main.py              # App creation and startup
            config.py            # Settings (config/index.ts jaisa)
            dependencies.py      # Dependency injection (middleware jaisa)

            # Feature-based organization (NestJS modules jaisa)
            users/
                __init__.py
                router.py        # Route definitions (users.controller.ts jaisa)
                service.py       # Business logic (users.service.ts jaisa)
                models.py        # Database models (users.entity.ts jaisa)
                schemas.py       # Request/Response schemas (users.dto.ts jaisa)

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

    migrations/                  # Database migrations (Prisma migrations jaisa)
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
    """Startup and shutdown events (Express middleware setup jaisa)."""
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
    """Application settings environment variables se load hote hain.
    dotenv + zod validation ko combine kiya hua jaisa."""

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
# src/my_api/users/schemas.py (NestJS mein DTOs jaisa)
from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str

    model_config = {"from_attributes": True}  # ORM objects allow karo

class UserList(BaseModel):
    users: list[UserResponse]
    total: int
```

```python
# src/my_api/users/router.py (controller jaisa)
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

Express/NestJS ke saath compare:

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

Ek project jisme Python backend ho aur JS/TS frontend ho (React, Vue, etc.) — jaise Flipkart mein backend API ho aur frontend app:

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
            api/                 # API client (OpenAPI spec se generate kiya)
        package.json
        tsconfig.json
        vite.config.ts
        Dockerfile

    docker-compose.yml           # Dono services run karo
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

# Frontend aur backend dono dev mode mein chalao
dev:
	docker-compose up

# Sab tests chalao
test:
	cd backend && pytest
	cd frontend && npm test

# Sab cheezein lint karo
lint:
	cd backend && ruff check . && mypy src/
	cd frontend && npm run lint

# OpenAPI spec se API client generate karo
api-client:
	cd backend && python -c "from my_api.main import app; import json; print(json.dumps(app.openapi()))" > openapi.json
	cd frontend && npx openapi-typescript-codegen -i ../openapi.json -o src/api/generated
```

---

## Monorepo Patterns

Socho jaise Swiggy ke paas restaurants, delivery partners, aur main app — sab alag services but same infrastructure. Monorepo mein Python packages ko similar setup:

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
            pyproject.toml       # "shared" par depend karti hai

        worker/                  # Background worker
            src/
                worker/
                    __init__.py
                    tasks.py
            pyproject.toml       # "shared" par depend karti hai

    pyproject.toml               # Root config (optional, workspace tools ke liye)
    uv.lock                      # Unified lock file (uv workspaces ke saath)
```

```toml
# Root pyproject.toml (uv workspaces use karte - npm workspaces jaisa)
[tool.uv.workspace]
members = ["packages/*"]
```

```toml
# packages/api/pyproject.toml
[project]
name = "my-api"
version = "0.1.0"
dependencies = [
    "shared",       # Workspace se local dependency
    "fastapi>=0.115.0",
]

[tool.uv.sources]
shared = { workspace = true }
```

### Monorepo with uv (Modern Approach)

`uv` Python ka modern package manager hai — pnpm jaisa Python ke liye. Workspaces ko natively support karti hai:

```bash
# Sab workspace packages install karo
uv sync

# Specific package mein command chalao
uv run --package api uvicorn api.main:app

# Specific package mein dependency add karo
uv add --package api httpx
```

npm/pnpm workspaces se compare:
```bash
# npm workspaces
npm install           # Sab install karo
npm run dev -w api    # Specific workspace mein run karo
npm add httpx -w api  # Dependency add karo
```

---

## Common Files and Their Node.js Equivalents

| File | Kya karta hai | Node.js mein kya |
|---|---|---|
| `pyproject.toml` | Sab project config | `package.json` + config files |
| `__init__.py` | Package marker, public API | `index.ts` |
| `__main__.py` | `python -m package` entry point | `"main"` in package.json |
| `conftest.py` | Shared test fixtures | Test setup files jaisa kuch |
| `py.typed` | Type stub marker (PEP 561) | `.d.ts` files include karna |
| `.python-version` | Python version pin karo | `.nvmrc` / `.node-version` |
| `requirements.txt` | Pinned dependencies (purana tarika) | `package-lock.json` |
| `uv.lock` | Lock file (modern approach) | `package-lock.json` / `pnpm-lock.yaml` |
| `Makefile` | Project commands/scripts | `"scripts"` in package.json |
| `setup.py` | Legacy build config | (deprecated, use pyproject.toml) |
| `setup.cfg` | Legacy config | (deprecated, use pyproject.toml) |
| `MANIFEST.in` | Package mein kya include karo | `.npmignore` |
| `tox.ini` | Python versions ke across tests | Node versions ke across CI jaisa |
| `.env` | Environment variables | `.env` (same!) |
| `alembic.ini` | Database migration config | `prisma/schema.prisma` |

### The .gitignore for Python

Python project ke liye kya ignore karna chahiye:

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

Node.js `.gitignore` ke saath compare:
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

Ab kuch practical exercises karo taake hands-on samajh aye:

### Exercise 1: Create a CLI Tool Project

Ek complete project structure banana hai CSV to JSON converter ka:

Requirements:
1. `src/` layout use karo
2. `pyproject.toml` mein proper metadata aur dependencies likho
3. CLI entry point `csv2json` register karo
4. `__main__.py` add karo `python -m csv2json` ke liye
5. Code ko modules mein organize karo: `cli.py`, `converter.py`, `formatters.py`
6. Tests directory `conftest.py` ke saath
7. `pyproject.toml` mein Ruff, mypy, pytest configuration
8. `Makefile` bana `dev`, `test`, `lint`, `build` targets ke saath
9. `.gitignore` add karo

Kam se kam project skeleton bana `__init__.py` files aur function stubs with type annotations ke saath.

### Exercise 2: Restructure a Flat Script into a Package

Ek single-file script ko proper package mein convert karo:

```python
# old_script.py - Sab ek file mein!
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

Yeh script ko yeh structure mein convert karo:
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

Type annotations add karo, proper error handling likho, aur kam se kam 5 tests likho.

### Exercise 3: FastAPI Application Structure

Bookstore API ke liye full project structure banana hai:

Features:
- Books CRUD (title, author, isbn, price, stock)
- Authors CRUD (name, bio, birth_date)
- Reviews (user, rating, text, book_id)
- Search by title/author

Requirements:
1. Feature-based folder organization (books/, authors/, reviews/)
2. Har feature mein: router.py, service.py, models.py, schemas.py
3. Shared code common/ mein (database.py, auth.py, pagination.py)
4. Proper conftest.py app, client, database fixtures ke saath
5. Pydantic-settings se config management
6. Alembic migrations ke liye
7. Docker setup (Dockerfile + docker-compose.yml)
8. Makefile dev, test, migrate, docker commands ke saath

Pura directory structure bana sab files stubbed out (function signatures with type annotations, proper imports, docstrings, lekin `pass` ya `...` for implementations).

### Exercise 4: Compare and Convert

Ek existing Node.js project structure lo aur Python equivalent banana hai. Ek typical Express + TypeScript project:

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

Har file aur directory ko Python equivalent mein map karo. Note karo ke kaun files merge hote hain (sab config files pyproject.toml mein), kaun split hote hain (tests src/ se bahar aye), aur kaun naye hote hain (conftest.py, __init__.py files).

---

## Key Takeaways

1. **Libraries ke liye `src/` layout use karo, apps ke liye flat.** Doubt mein `src/` use karo.
2. **`pyproject.toml` sab kuch hai.** Dependencies, tool config, metadata — ek file.
3. **`__init__.py` tumhara public API define karti hai.** Index.ts ke re-exports jaisa soch.
4. **Feature-based organization best kaam karti hai.** Layer by layer (controllers/, services/) nahi — features by feature (users/, products/).
5. **`conftest.py` Python mein unique hai.** Directory hierarchy se fixture scoping manage kar.
6. **`Makefile` npm scripts ki jagah.**  Ya task runner use karo if preferred.
7. **`uv` Python ka modern package manager hai.** Workspaces support, fast (Rust mein likha), virtual environments automatically handle.
8. **Patterns same rehte hain.** Node.js se sirf file names aur conventions change hote hain, concepts same!
