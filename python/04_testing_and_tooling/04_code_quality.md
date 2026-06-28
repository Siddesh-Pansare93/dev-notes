# Code Quality Tools in Python

> **Coming from Node.js/TypeScript?** You are used to Prettier + ESLint + TypeScript.
> Python has direct equivalents: Black (Prettier), Ruff (ESLint), and mypy (tsc).
> The great news: Python's tooling has converged on a single config file (`pyproject.toml`)
> for everything, and Ruff is so fast it can replace multiple tools at once.

---

## Table of Contents

1. [Tool Mapping: Node.js to Python](#tool-mapping)
2. [Black: The Opinionated Formatter](#black)
3. [Ruff: The Fast Linter (and Formatter)](#ruff)
4. [mypy: Static Type Checking](#mypy)
5. [isort: Import Sorting](#isort)
6. [pre-commit: Git Hooks](#pre-commit)
7. [Unified Configuration in pyproject.toml](#unified-configuration)
8. [Setting Up a Complete Quality Pipeline](#complete-pipeline)
9. [VSCode Integration](#vscode-integration)
10. [Practice Exercises](#practice-exercises)

---

## Tool Mapping: Node.js to Python

| Purpose | Node.js/TypeScript | Python | Notes |
|---|---|---|---|
| Formatting | Prettier | **Black** | Both are opinionated, minimal config |
| Linting | ESLint | **Ruff** | Ruff is written in Rust, extremely fast |
| Type checking | `tsc` (TypeScript) | **mypy** | Optional in Python (gradual typing) |
| Import sorting | eslint-plugin-import | **isort** / **Ruff** | Ruff includes isort rules |
| Git hooks | husky + lint-staged | **pre-commit** | More powerful, language-agnostic |
| Config file | `package.json` + many `.rc` files | **pyproject.toml** | One file for everything |
| CI runner | GitHub Actions / etc. | Same | Tools run the same way in CI |

**Modern recommendation:** You can use **Ruff alone** for both linting AND formatting
(it now includes a formatter). But understanding Black + Ruff separately helps when
you encounter projects using both.

---

## Black: The Opinionated Formatter

Black is Prettier for Python. Its motto is "The uncompromising code formatter." Like
Prettier, it makes almost no configuration options available on purpose.

### Installation and Usage

```bash
pip install black

# Format a file
black myfile.py

# Format a directory
black src/

# Check without modifying (useful in CI)
black --check src/

# Show diff of what would change
black --diff src/

# Format a string (useful for debugging)
black -c "x = {  'a':1,  'b':  2  }"
```

### What Black Does

```python
# Before Black:
x={'a':1,'b':2,'c':3}
def   foo(   x,y,z   ):
    return (x+y
        +z)
long_variable_name = some_function(argument1,argument2,argument3,argument4,argument5)
if (condition1 and condition2 and condition3 and condition4): do_thing()

# After Black:
x = {"a": 1, "b": 2, "c": 3}


def foo(x, y, z):
    return x + y + z


long_variable_name = some_function(
    argument1, argument2, argument3, argument4, argument5
)
if condition1 and condition2 and condition3 and condition4:
    do_thing()
```

### Configuration (Minimal by Design)

```toml
# pyproject.toml
[tool.black]
line-length = 88          # Default. Prettier uses 80, Black uses 88.
target-version = ["py312"] # Python version to target
```

That is essentially all you configure. Black intentionally does not support things like:
- Single vs double quotes (always double)
- Trailing commas (Black adds them when it wraps)
- Semicolons (always removed)

### Comparison with Prettier

```javascript
// .prettierrc (many options)
{
    "semi": true,
    "singleQuote": true,
    "tabWidth": 2,
    "trailingComma": "es5",
    "printWidth": 80,
    "bracketSpacing": true,
    "arrowParens": "always"
}
```

```toml
# pyproject.toml - Black config (barely anything to configure)
[tool.black]
line-length = 88
```

**Philosophy:** Fewer options means less debate. Your team never argues about formatting.

---

## Ruff: The Fast Linter (and Formatter)

Ruff is a Python linter written in Rust. It is 10-100x faster than traditional Python
linters (flake8, pylint). It also now includes a formatter that is Black-compatible.

### Installation and Usage

```bash
pip install ruff

# Lint
ruff check .                    # Check for issues
ruff check --fix .              # Auto-fix what's possible
ruff check --watch .            # Watch mode (like eslint --watch)

# Format (Black-compatible)
ruff format .                   # Format files
ruff format --check .           # Check formatting without changing

# Show what rules are enabled
ruff rule E501                  # Explain a specific rule
```

### Ruff vs ESLint

```javascript
// .eslintrc.js
module.exports = {
    extends: ['eslint:recommended'],
    rules: {
        'no-unused-vars': 'error',
        'no-console': 'warn',
        'prefer-const': 'error',
        'eqeqeq': 'error',
    },
};
```

```toml
# pyproject.toml
[tool.ruff]
line-length = 88
target-version = "py312"

[tool.ruff.lint]
select = [
    "E",    # pycodestyle errors (like eslint:recommended)
    "W",    # pycodestyle warnings
    "F",    # pyflakes (unused imports, undefined names)
    "I",    # isort (import sorting)
    "N",    # pep8-naming
    "UP",   # pyupgrade (modernize syntax)
    "B",    # flake8-bugbear (common bugs)
    "SIM",  # flake8-simplify
    "RUF",  # Ruff-specific rules
]
ignore = [
    "E501",  # Line too long (let the formatter handle this)
]
```

### Common Ruff Rule Sets

| Rule Prefix | Name | ESLint Equivalent |
|---|---|---|
| `E` / `W` | pycodestyle | eslint:recommended |
| `F` | pyflakes | no-unused-vars, no-undef |
| `I` | isort | eslint-plugin-import |
| `N` | pep8-naming | naming-convention |
| `UP` | pyupgrade | es-latest suggestions |
| `B` | flake8-bugbear | common bug patterns |
| `SIM` | flake8-simplify | prefer simpler constructs |
| `C4` | flake8-comprehensions | prefer list/dict comprehensions |
| `DTZ` | flake8-datetimez | timezone-aware datetime |
| `T20` | flake8-print | no-console |
| `PT` | flake8-pytest-style | testing best practices |
| `RUF` | Ruff-specific | unique to Ruff |

### Example: What Ruff Catches

```python
# ruff will flag all of these:

import os              # F401: imported but unused
import json
from typing import List  # UP006: Use list instead of List (Python 3.9+)

def processData(x):    # N802: function name should be lowercase
    Items = []         # N806: variable in function should be lowercase

    for i in range(len(x)):  # SIM113: use enumerate()
        Items.append(x[i])

    if len(Items) > 0:  # SIM103: return condition directly / use truthiness
        return True
    else:
        return False

    y = 42              # F841: local variable 'y' is assigned but never used
```

After `ruff check --fix`:

```python
import json


def process_data(x):
    items = []

    for i, item in enumerate(x):
        items.append(item)

    return len(items) > 0
```

### Per-File Ignores

```toml
[tool.ruff.lint.per-file-ignores]
# Tests can use assert and have unused imports (fixtures)
"tests/**/*.py" = ["S101", "F401"]
# __init__.py files often just re-export
"__init__.py" = ["F401"]
# Migration files are auto-generated
"migrations/**/*.py" = ["E501"]
```

### Ruff as a Formatter (Replacing Black)

```bash
# Use Ruff for BOTH linting and formatting:
ruff format .    # Format (Black-compatible)
ruff check .     # Lint

# This means you only need ONE tool instead of two!
```

```toml
# pyproject.toml - Ruff handles everything
[tool.ruff]
line-length = 88
target-version = "py312"

[tool.ruff.format]
quote-style = "double"           # Like Black
indent-style = "space"
docstring-code-format = true     # Format code in docstrings too
```

---

## mypy: Static Type Checking

mypy is like running `tsc --noEmit`. It checks your type annotations without running
the code. The key difference: **Python typing is optional and gradual**. You can add
types to one file at a time.

### Installation and Usage

```bash
pip install mypy

# Check a file
mypy src/main.py

# Check a package
mypy src/

# Check with strict mode (like tsconfig strict: true)
mypy --strict src/
```

### Type Annotations: Python vs TypeScript

```typescript
// TypeScript
function greet(name: string): string {
    return `Hello, ${name}!`;
}

interface User {
    id: number;
    name: string;
    email: string;
    roles: string[];
    metadata?: Record<string, any>;
}

async function fetchUser(id: number): Promise<User> {
    const response = await fetch(`/api/users/${id}`);
    return response.json();
}
```

```python
# Python
def greet(name: str) -> str:
    return f"Hello, {name}!"

from dataclasses import dataclass
from typing import Optional

@dataclass
class User:
    id: int
    name: str
    email: str
    roles: list[str]
    metadata: Optional[dict[str, any]] = None  # Optional = can be None

async def fetch_user(user_id: int) -> User:
    async with httpx.AsyncClient() as client:
        response = await client.get(f"/api/users/{user_id}")
        data = response.json()
        return User(**data)
```

### mypy Configuration

```toml
# pyproject.toml
[tool.mypy]
python_version = "3.12"

# Strictness (start lenient, tighten over time)
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true        # Like "noImplicitAny" in tsconfig
check_untyped_defs = true
strict_optional = true               # Like "strictNullChecks"

# Incremental mode (faster re-checks)
incremental = true

# Per-module overrides (like tsconfig paths)
[[tool.mypy.overrides]]
module = "tests.*"
disallow_untyped_defs = false        # Tests don't need strict typing

[[tool.mypy.overrides]]
module = "third_party_lib.*"
ignore_missing_imports = true        # No stubs for this library
```

### Comparison: tsconfig.json vs mypy config

```json
// tsconfig.json
{
    "compilerOptions": {
        "strict": true,
        "noImplicitAny": true,
        "strictNullChecks": true,
        "noUnusedLocals": true,
        "noUnusedParameters": true,
        "target": "ES2022"
    }
}
```

```toml
# pyproject.toml [tool.mypy] equivalent
[tool.mypy]
strict = true                   # Enables all strict flags at once
# Individual flags (enabled by strict):
# disallow_untyped_defs = true  -> like noImplicitAny
# strict_optional = true        -> like strictNullChecks
# warn_unused_ignores = true    -> like noUnusedLocals (partially)
```

### Common mypy Patterns

```python
from typing import Union, Optional, TypeVar, Generic
from collections.abc import Callable, Sequence

# Union types (like TypeScript union)
def process(value: int | str) -> str:   # Python 3.10+ syntax
    if isinstance(value, int):
        return str(value)
    return value

# Generic types
T = TypeVar("T")

def first(items: Sequence[T]) -> T | None:
    return items[0] if items else None

# Callable types (like TypeScript function types)
Handler = Callable[[str, int], bool]

def register_handler(handler: Handler) -> None:
    pass

# TypedDict (like TypeScript interfaces for dicts)
from typing import TypedDict

class UserDict(TypedDict):
    id: int
    name: str
    email: str
    is_active: bool

def process_user(user: UserDict) -> str:
    return user["name"]  # mypy knows this is str

# Protocol (like TypeScript interfaces for structural typing)
from typing import Protocol

class Serializable(Protocol):
    def to_json(self) -> str: ...

def save(obj: Serializable) -> None:
    data = obj.to_json()  # mypy ensures obj has to_json()
```

### Gradual Typing Strategy

Unlike TypeScript where you typically type everything from the start, Python supports
gradual adoption:

```python
# Step 1: No types (valid Python, mypy skips or warns)
def add(a, b):
    return a + b

# Step 2: Add parameter types
def add(a: int, b: int):
    return a + b

# Step 3: Add return type
def add(a: int, b: int) -> int:
    return a + b

# Step 4: Full strict typing with generics
T = TypeVar("T", int, float)
def add(a: T, b: T) -> T:
    return a + b
```

---

## isort: Import Sorting

isort automatically sorts and organizes Python imports. It is like `eslint-plugin-import`
with auto-fix.

### The Problem

```python
# Before isort (messy, unorganized imports):
from myapp.models import User
import json
from typing import Optional
import os
from myapp.utils import helper
import sys
from pathlib import Path
from myapp.config import settings
import pytest
```

### The Solution

```python
# After isort (organized by section):
import json           # 1. Standard library
import os
import sys
from pathlib import Path
from typing import Optional

import pytest          # 2. Third-party packages

from myapp.config import settings    # 3. Local application
from myapp.models import User
from myapp.utils import helper
```

### Configuration

```toml
# pyproject.toml
[tool.isort]
profile = "black"     # Compatible with Black's formatting
known_first_party = ["myapp"]
known_third_party = ["pytest", "fastapi", "httpx"]
```

**Modern approach:** Ruff includes isort rules (`I` prefix), so you can skip installing
isort separately:

```toml
[tool.ruff.lint]
select = ["I"]   # Enable isort rules in Ruff

[tool.ruff.lint.isort]
known-first-party = ["myapp"]
```

---

## pre-commit: Git Hooks

pre-commit is like husky + lint-staged, but more powerful. It manages git hooks and
runs tools automatically before commits.

### Installation

```bash
pip install pre-commit

# Install the git hooks (like npx husky install)
pre-commit install
```

### Configuration

```yaml
# .pre-commit-config.yaml
# This is like having both .husky/ and .lintstagedrc in one file

repos:
  # Ruff - linting and formatting
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.8.0
    hooks:
      - id: ruff           # Linting
        args: [--fix]
      - id: ruff-format    # Formatting

  # mypy - type checking
  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.13.0
    hooks:
      - id: mypy
        additional_dependencies: [types-requests]

  # General file checks
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v5.0.0
    hooks:
      - id: trailing-whitespace      # Remove trailing whitespace
      - id: end-of-file-fixer        # Ensure files end with newline
      - id: check-yaml                # Validate YAML syntax
      - id: check-toml                # Validate TOML syntax
      - id: check-added-large-files   # Prevent committing large files
      - id: check-merge-conflict      # Check for merge conflict markers
      - id: debug-statements          # Check for leftover debugger/breakpoint
```

### Comparison with husky + lint-staged

```json
// package.json (Node.js)
{
    "husky": {
        "hooks": {
            "pre-commit": "lint-staged"
        }
    },
    "lint-staged": {
        "*.{js,ts}": ["eslint --fix", "prettier --write"],
        "*.{json,md}": ["prettier --write"]
    }
}
```

```yaml
# .pre-commit-config.yaml (Python) - same thing but more powerful
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.8.0
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format
```

### Usage

```bash
# Run hooks on staged files (happens automatically on git commit)
pre-commit run

# Run on all files (not just staged)
pre-commit run --all-files

# Run a specific hook
pre-commit run ruff

# Update hook versions
pre-commit autoupdate

# Skip hooks for one commit (like --no-verify in git)
git commit --no-verify -m "WIP: skip hooks"
```

---

## Unified Configuration in pyproject.toml

One of Python's best features: **everything goes in one file**.

```toml
# pyproject.toml - THE configuration file for your Python project

# ============================================================
# Project metadata (like package.json name, version, etc.)
# ============================================================
[project]
name = "my-awesome-app"
version = "1.0.0"
description = "A great Python application"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.115.0",
    "httpx>=0.28.0",
    "sqlalchemy>=2.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-asyncio>=0.24",
    "pytest-cov>=6.0",
    "ruff>=0.8.0",
    "mypy>=1.13",
    "pre-commit>=4.0",
]

# ============================================================
# pytest configuration (like jest.config.js)
# ============================================================
[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"
addopts = ["-ra", "-q", "--strict-markers"]
markers = [
    "slow: marks tests as slow",
    "integration: integration tests",
]

# ============================================================
# Ruff configuration (like .eslintrc + .prettierrc)
# ============================================================
[tool.ruff]
line-length = 88
target-version = "py312"

[tool.ruff.lint]
select = ["E", "W", "F", "I", "N", "UP", "B", "SIM", "RUF"]
ignore = ["E501"]

[tool.ruff.lint.per-file-ignores]
"tests/**/*.py" = ["S101"]

[tool.ruff.lint.isort]
known-first-party = ["myapp"]

[tool.ruff.format]
docstring-code-format = true

# ============================================================
# mypy configuration (like tsconfig.json)
# ============================================================
[tool.mypy]
python_version = "3.12"
warn_return_any = true
disallow_untyped_defs = true
check_untyped_defs = true

[[tool.mypy.overrides]]
module = "tests.*"
disallow_untyped_defs = false

# ============================================================
# Coverage configuration (like jest coverage options)
# ============================================================
[tool.coverage.run]
source = ["src"]
branch = true

[tool.coverage.report]
show_missing = true
fail_under = 80
exclude_lines = [
    "pragma: no cover",
    "if __name__ == .__main__.",
    "if TYPE_CHECKING:",
]
```

Compare with the Node.js ecosystem where you might have:
- `package.json`
- `.eslintrc.js`
- `.prettierrc`
- `tsconfig.json`
- `jest.config.js`
- `.lintstagedrc`
- `.husky/pre-commit`

In Python: **one file**.

---

## Setting Up a Complete Quality Pipeline

### Step 1: Install Everything

```bash
# Create a virtual environment first
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install tools
pip install ruff mypy pytest pytest-asyncio pytest-cov pre-commit
```

### Step 2: Configure pyproject.toml

Use the comprehensive example from the previous section.

### Step 3: Set Up pre-commit

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.8.0
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.13.0
    hooks:
      - id: mypy
        additional_dependencies: [types-requests, types-pyyaml]

  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v5.0.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-toml
```

```bash
pre-commit install
```

### Step 4: Add Makefile / Scripts

```makefile
# Makefile - common commands (like npm scripts in package.json)

.PHONY: lint format typecheck test test-cov ci

lint:
	ruff check .

format:
	ruff format .

typecheck:
	mypy src/

test:
	pytest

test-cov:
	pytest --cov=src --cov-report=html --cov-report=term-missing

# Run everything (like npm run ci)
ci: lint typecheck test
```

Or use `pyproject.toml` scripts via a task runner:

```toml
# pyproject.toml
[project.scripts]
# These work with: pip install -e . && my-app
my-app = "myapp.main:main"

# For dev scripts, use a Makefile, or tools like:
# - taskipy (pip install taskipy)
# - poethepoet (pip install poethepoet)
# - just (cargo install just)
```

### Step 5: CI Configuration

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install dependencies
        run: |
          pip install -e ".[dev]"

      - name: Lint
        run: ruff check .

      - name: Format check
        run: ruff format --check .

      - name: Type check
        run: mypy src/

      - name: Test with coverage
        run: pytest --cov=src --cov-report=xml

      - name: Upload coverage
        uses: codecov/codecov-action@v4
```

Compare with a typical Node.js CI:
```yaml
# Node.js CI for comparison
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test -- --coverage
```

Almost identical workflow. The tools are different, the CI pattern is the same.

---

## VSCode Integration

### Required Extensions

1. **Python** (ms-python.python) - Core Python support
2. **Pylance** (ms-python.vscode-pylance) - Fast IntelliSense (like TypeScript language server)
3. **Ruff** (charliermarsh.ruff) - Linting and formatting
4. **Even Better TOML** (tamasfe.even-better-toml) - pyproject.toml support

### VSCode Settings

```jsonc
// .vscode/settings.json
{
    // Python interpreter
    "python.defaultInterpreterPath": ".venv/bin/python",

    // Use Ruff as the formatter (replaces Black)
    "[python]": {
        "editor.defaultFormatter": "charliermarsh.ruff",
        "editor.formatOnSave": true,
        "editor.codeActionsOnSave": {
            "source.fixAll.ruff": "explicit",
            "source.organizeImports.ruff": "explicit"
        }
    },

    // Ruff settings
    "ruff.lint.args": ["--config=pyproject.toml"],

    // Type checking with Pylance
    "python.analysis.typeCheckingMode": "basic",  // or "strict"
    "python.analysis.autoImportCompletions": true,

    // Testing
    "python.testing.pytestEnabled": true,
    "python.testing.pytestArgs": ["tests"],
    "python.testing.unittestEnabled": false,

    // Terminal
    "python.terminal.activateEnvironment": true
}
```

Compare with typical Node.js/TypeScript VSCode settings:
```jsonc
// Node.js .vscode/settings.json
{
    "[typescript]": {
        "editor.defaultFormatter": "esbenp.prettier-vscode",
        "editor.formatOnSave": true,
        "editor.codeActionsOnSave": {
            "source.fixAll.eslint": "explicit"
        }
    },
    "jest.autoRun": "watch"
}
```

Same pattern: format on save, fix lint issues on save, enable testing.

### VSCode Extensions Equivalence

| Node.js Extension | Python Extension |
|---|---|
| ESLint | Ruff |
| Prettier | Ruff (formatter) or Black Formatter |
| TypeScript (built-in) | Pylance |
| Jest Runner | Python Test Explorer |
| npm Intellisense | Python (auto-imports) |

---

## Practice Exercises

### Exercise 1: Set Up a Project from Scratch

Create a new Python project with full quality tooling:

```
my_project/
    src/
        my_project/
            __init__.py
            calculator.py      # Simple calculator module
            validators.py      # Input validation functions
    tests/
        __init__.py
        test_calculator.py
        test_validators.py
    pyproject.toml            # ALL configuration here
    .pre-commit-config.yaml
    .vscode/
        settings.json
    Makefile
```

Requirements:
1. `pyproject.toml` with Ruff, mypy, and pytest configuration
2. Ruff rules: at minimum `E`, `F`, `I`, `UP`, `B`
3. mypy with `disallow_untyped_defs = true`
4. pre-commit hooks for Ruff linting and formatting
5. A Makefile with `lint`, `format`, `typecheck`, `test`, and `ci` targets
6. VSCode settings for format-on-save with Ruff

### Exercise 2: Fix a Messy File

Take this intentionally messy Python file and fix all the issues that Ruff and mypy
would catch:

```python
# fix_me.py
import os
import json
from typing import List, Dict, Optional, Tuple
import sys
from pathlib import Path
import re

def ProcessUserData(userData):
    results = []
    for i in range(len(userData)):
        item = userData[i]
        if item['active'] == True:
            name = item['first_name'] + ' ' + item['last_name']
            results.append(name)

    if len(results) == 0:
        return None
    else:
        return results

def check_email(email):
    if re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email) != None:
        return True
    else:
        return False

class userManager:
    def __init__(self, db_path):
        self.db_path = db_path
        self.Users = []

    def LoadUsers(self):
        with open(self.db_path) as f:
            data = json.load(f)
            self.Users = data['users']

    def GetUser(self, id):
        for user in self.Users:
            if user['id'] == id:
                return user
        return None

    def addUser(self, user):
        self.Users.append(user)
        unused_var = "this is never used"
```

Fix list:
1. Add type annotations to all functions and methods
2. Fix naming conventions (PEP 8)
3. Use modern type syntax (`list` instead of `List`, etc.)
4. Remove unused imports and variables
5. Simplify boolean comparisons
6. Use `enumerate()` instead of `range(len())`
7. Use `is None` / `is not None` instead of `== None`
8. Simplify return statements
9. Sort imports properly

### Exercise 3: Gradual Typing

Start with this untyped code and add types progressively. Run mypy after each step
to verify.

```python
# step1: Add basic types to function signatures
# step2: Add TypedDict for structured dicts
# step3: Add generics where appropriate
# step4: Run mypy --strict and fix all issues

def fetch_config(path, defaults=None):
    import json
    with open(path) as f:
        config = json.load(f)
    if defaults:
        merged = {**defaults, **config}
        return merged
    return config

def find_items(items, predicate):
    return [item for item in items if predicate(item)]

def group_by(items, key_func):
    groups = {}
    for item in items:
        key = key_func(item)
        if key not in groups:
            groups[key] = []
        groups[key].append(item)
    return groups

class Repository:
    def __init__(self, items=None):
        self.items = items or []

    def add(self, item):
        self.items.append(item)

    def find(self, predicate):
        return [i for i in self.items if predicate(i)]

    def first(self, predicate=None):
        if predicate is None:
            return self.items[0] if self.items else None
        for item in self.items:
            if predicate(item):
                return item
        return None
```

### Exercise 4: CI Pipeline

Write a GitHub Actions workflow file (`.github/workflows/ci.yml`) that:

1. Runs on pushes to `main` and on all pull requests
2. Tests on Python 3.11 and 3.12
3. Installs project with dev dependencies
4. Runs these checks in parallel jobs:
   - Ruff linting
   - Ruff format check
   - mypy type checking
   - pytest with coverage (fail if under 80%)
5. Uploads coverage report as an artifact

---

## Key Takeaways

1. **Ruff is your Swiss Army knife.** It handles linting AND formatting, is blazingly fast,
   and replaces Black + isort + flake8.
2. **pyproject.toml is the one file.** All tool configuration goes here. No more config
   file sprawl.
3. **mypy is optional but valuable.** Start with basic settings, tighten over time.
   Python's gradual typing lets you adopt at your own pace.
4. **pre-commit catches issues early.** Like husky + lint-staged, but more powerful and
   language-agnostic.
5. **VSCode integration is excellent.** The Ruff extension gives you the same experience
   as ESLint + Prettier.
6. **The CI pipeline is nearly identical** to what you are used to in Node.js projects.

Next up: [Project Structure](./05_project_structure.md) -- how to organize a Python
project like a professional.
