# Python mein Code Quality Tools

> **Node.js/TypeScript se aa rahe ho?** Tumhe Prettier + ESLint + TypeScript familiar hai na. Python mein bilkul same cheezain hain, bas alag naam se — Black (Prettier like), Ruff (ESLint ka replacement), aur mypy (tsc jaisa).
> 
> Acha news: Python ka tooling ek hi file mein concentrate hai (`pyproject.toml`), aur Ruff itna fast hai ki ek saath multiple tools ka kaam kar leta hai!

---

## Table of Contents

1. [Tool Mapping: Node.js to Python](#tool-mapping)
2. [Black: The Opinionated Formatter](#black)
3. [Ruff: The Fast Linter (and Formatter)](#ruff)
4. [mypy: Static Type Checking](#mypy)
5. [isort: Import Sorting](#isort)
6. [pre-commit: Git Hooks](#pre-commit)
7. [Unified Configuration in pyproject.toml](#unified-configuration)
8. [Complete Quality Pipeline Setup](#complete-pipeline)
9. [VSCode Integration](#vscode-integration)
10. [Practice Exercises](#practice-exercises)

---

## Tool Mapping: Node.js to Python

| Kaam kya hai | Node.js/TypeScript | Python | Notes |
|---|---|---|---|
| Code format karna | Prettier | **Black** | Dono opinionated hain, minimum config |
| Linting | ESLint | **Ruff** | Rust mein likha hai, lightning fast |
| Type checking | `tsc` (TypeScript) | **mypy** | Python mein optional hai (gradual typing) |
| Imports organize karna | eslint-plugin-import | **isort** / **Ruff** | Ruff ke paas isort rules hain |
| Git hooks | husky + lint-staged | **pre-commit** | Zyada powerful, sab languages ke liye |
| Config file | `package.json` + multiple files | **pyproject.toml** | Ek hi file mein sab kuch |
| CI runner | GitHub Actions / etc. | Same | Kahin bhi same tarah chalte hain |

**Aaj kal ka recommendation:** Sirf **Ruff** use karo — ek hi tool se linting aur formatting dono mil jaega. But pehle Black + Ruff separately samajh lena zaroori hai kyunki porane projects mein dono milengi.

---

## Black: The Opinionated Formatter

Black Python ka Prettier hai. Uska motto hi hai — "The uncompromising code formatter." Bilkul Prettier jaisa — maximum flexibility nahi deta, bas sab kuch consistent kar deta hai.

### Installation aur Usage

```bash
pip install black

# Ek file format kar
black myfile.py

# Pura directory format kar
black src/

# Sirf check kar, change na kar (CI ke liye achha)
black --check src/

# Dekh ke batao kya change hoga
black --diff src/

# String directly format kar (debugging ke liye)
black -c "x = {  'a':1,  'b':  2  }"
```

### Black Kya Karta Hai

```python
# Black se pehle (bilkul mess):
x={'a':1,'b':2,'c':3}
def   foo(   x,y,z   ):
    return (x+y
        +z)
long_variable_name = some_function(argument1,argument2,argument3,argument4,argument5)
if (condition1 and condition2 and condition3 and condition4): do_thing()

# Black ke baad (bilkul clean):
x = {"a": 1, "b": 2, "c": 3}


def foo(x, y, z):
    return x + y + z


long_variable_name = some_function(
    argument1, argument2, argument3, argument4, argument5
)
if condition1 and condition2 and condition3 and condition4:
    do_thing()
```

### Configuration (Bilkul Minimal)

```toml
# pyproject.toml
[tool.black]
line-length = 88          # Default. Prettier 80 use karta hai, Black 88
target-version = ["py312"] # Kaunsa Python version target kar rahe ho
```

Bas itna hi! Black iski zyada settings nahi deta:
- Single vs double quotes? Always double quotes
- Trailing commas? Black apne app add kar dega
- Semicolons? Hamesha remove

### Prettier ke Saath Compare Karo

```javascript
// .prettierrc (kai options)
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
# pyproject.toml - Black config (barely kuch configure ho sakta hai)
[tool.black]
line-length = 88
```

**Philosophy:** Kam options = kam jhagde. Team kabhi formatting ke baare mein argue nahi karega.

---

## Ruff: The Fast Linter (and Formatter)

Ruff Python ka ESLint hai, aur Rust mein likha hai. Yeh traditional Python linters (flake8, pylint) se 10-100x faster hai. Plus iske paas formatter bhi hai jo Black-compatible hai.

### Installation aur Usage

```bash
pip install ruff

# Issues check kar
ruff check .                    # Dekh ke batao kya problem hai
ruff check --fix .              # Jo fix ho sake utna auto-fix kar de
ruff check --watch .            # Watch mode (eslint --watch jaisa)

# Format karna (Black-compatible)
ruff format .                   # Files ko format kar
ruff format --check .           # Sirf check kar, change na kar

# Rules ka matalab samjha
ruff rule E501                  # Specific rule explain kar
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
    "E",    # pycodestyle errors (eslint:recommended jaisa)
    "W",    # pycodestyle warnings
    "F",    # pyflakes (unused imports, undefined names)
    "I",    # isort (import sorting)
    "N",    # pep8-naming
    "UP",   # pyupgrade (syntax ko modern banao)
    "B",    # flake8-bugbear (common bugs)
    "SIM",  # flake8-simplify
    "RUF",  # Ruff ka apna rules
]
ignore = [
    "E501",  # Line bahut lamba hai (formatter sambhal lega)
]
```

### Common Ruff Rule Sets

| Rule Prefix | Naam | ESLint Equivalent |
|---|---|---|
| `E` / `W` | pycodestyle | eslint:recommended |
| `F` | pyflakes | no-unused-vars, no-undef |
| `I` | isort | eslint-plugin-import |
| `N` | pep8-naming | naming-convention |
| `UP` | pyupgrade | es-latest suggestions |
| `B` | flake8-bugbear | common bug patterns |
| `SIM` | flake8-simplify | simpler constructs prefer karo |
| `C4` | flake8-comprehensions | list/dict comprehensions prefer karo |
| `DTZ` | flake8-datetimez | timezone-aware datetime use karo |
| `T20` | flake8-print | no-console jaisa |
| `PT` | flake8-pytest-style | testing best practices |
| `RUF` | Ruff-specific | Ruff ka unique rules |

### Example: Kya Catch Karta Hai Ruff?

```python
# Ruff yeh sab flag karega:

import os              # F401: import kiya but use nahi kiya
import json
from typing import List  # UP006: Python 3.9+ mein 'list' use kar na (List nahi)

def processData(x):    # N802: function ka naam lowercase hona chahiye
    Items = []         # N806: variable ko lowercase hona chahiye

    for i in range(len(x)):  # SIM113: enumerate() use kar na
        Items.append(x[i])

    if len(Items) > 0:  # SIM103: seedha return kar na
        return True
    else:
        return False

    y = 42              # F841: variable assign kiya but use nahi kiya
```

`ruff check --fix` ke baad:

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
# Tests ke liye assert aur unused imports OK hain
"tests/**/*.py" = ["S101", "F401"]
# __init__.py sirf export karta hai
"__init__.py" = ["F401"]
# Auto-generated files
"migrations/**/*.py" = ["E501"]
```

### Ruff ko Formatter ke Taur Use Karna (Black ki Jagah)

```bash
# Ruff se DONO kaam (linting + formatting):
ruff format .    # Format kar
ruff check .     # Lint kar

# Matlab ek hi tool, do kaam!
```

```toml
# pyproject.toml - Ruff sab sambhal raha
[tool.ruff]
line-length = 88
target-version = "py312"

[tool.ruff.format]
quote-style = "double"           # Black jaisa
indent-style = "space"
docstring-code-format = true     # Docstrings mein code bhi format kar
```

---

## mypy: Static Type Checking

mypy `tsc --noEmit` jaisa hai. Yeh type annotations ko check karta hai without code run kiye. Badi baath: **Python mein typing optional aur gradual hai**. Ek file mein types add kar sakte ho, baaki mein nahi.

### Installation aur Usage

```bash
pip install mypy

# Ek file check kar
mypy src/main.py

# Pura package check kar
mypy src/

# Strict mode mein (tsconfig mein strict: true jaisa)
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
    metadata: Optional[dict[str, any]] = None  # Optional = None ho sakta hai

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

# Strictness (pehle relax, phir tight karte ja)
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true        # TypeScript mein "noImplicitAny" jaisa
check_untyped_defs = true
strict_optional = true               # "strictNullChecks" jaisa

# Incremental mode (re-checks faster)
incremental = true

# Specific files ke liye alag rules
[[tool.mypy.overrides]]
module = "tests.*"
disallow_untyped_defs = false        # Tests ko strict types nahi chahiye

[[tool.mypy.overrides]]
module = "third_party_lib.*"
ignore_missing_imports = true        # Library ke paas type stubs nahi hain
```

### Compare Karo: tsconfig.json vs mypy config

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
strict = true                   # Ek baari mein sab strict flags on
# Individual flags (strict mein enabled):
# disallow_untyped_defs = true  -> noImplicitAny jaisa
# strict_optional = true        -> strictNullChecks jaisa
# warn_unused_ignores = true    -> noUnusedLocals (partially)
```

### Common mypy Patterns

```python
from typing import Union, Optional, TypeVar, Generic
from collections.abc import Callable, Sequence

# Union types (TypeScript union jaisa)
def process(value: int | str) -> str:   # Python 3.10+ syntax
    if isinstance(value, int):
        return str(value)
    return value

# Generic types
T = TypeVar("T")

def first(items: Sequence[T]) -> T | None:
    return items[0] if items else None

# Callable types (TypeScript function types jaisa)
Handler = Callable[[str, int], bool]

def register_handler(handler: Handler) -> None:
    pass

# TypedDict (TypeScript interfaces dicts ke liye)
from typing import TypedDict

class UserDict(TypedDict):
    id: int
    name: str
    email: str
    is_active: bool

def process_user(user: UserDict) -> str:
    return user["name"]  # mypy jaanta hai yeh str hai

# Protocol (TypeScript interfaces ka structural typing)
from typing import Protocol

class Serializable(Protocol):
    def to_json(self) -> str: ...

def save(obj: Serializable) -> None:
    data = obj.to_json()  # mypy ensure karta hai obj ke paas to_json() hai
```

### Gradual Typing Strategy

TypeScript mein sab kuch type karte ho shuru se. Python mein slowly add kar sakte ho:

```python
# Step 1: Koi types nahi (valid Python, mypy skip karega)
def add(a, b):
    return a + b

# Step 2: Parameter types add kar
def add(a: int, b: int):
    return a + b

# Step 3: Return type add kar
def add(a: int, b: int) -> int:
    return a + b

# Step 4: Full strict typing generics ke saath
T = TypeVar("T", int, float)
def add(a: T, b: T) -> T:
    return a + b
```

---

## isort: Import Sorting

isort automatically Python imports ko organize kar deta hai. `eslint-plugin-import` jaisa hai but auto-fix ke saath.

### Problem Kya Hai

```python
# isort se pehle (bilkul mess, imports random order mein):
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

### isort Se Baad (Clean!)

```python
# isort ke baad (properly organized):
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
profile = "black"     # Black ke saath compatible
known_first_party = ["myapp"]
known_third_party = ["pytest", "fastapi", "httpx"]
```

**Aaj kal:** Ruff mein isort rules hain (`I` prefix), to isort separately install na karna padhe:

```toml
[tool.ruff.lint]
select = ["I"]   # Ruff mein isort rules enable kar

[tool.ruff.lint.isort]
known-first-party = ["myapp"]
```

---

## pre-commit: Git Hooks

pre-commit husky + lint-staged jaisa hai, par zyada powerful. Yeh git hooks automatically manage karta hai aur commit se pehle tools run karta hai.

### Installation

```bash
pip install pre-commit

# Git hooks install kar (husky mein npx husky install jaisa)
pre-commit install
```

### Configuration

```yaml
# .pre-commit-config.yaml
# Yeh file .husky/ aur .lintstagedrc ko combine karta hai

repos:
  # Ruff - linting aur formatting
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
      - id: trailing-whitespace      # Trailing whitespace hata
      - id: end-of-file-fixer        # File end mein newline ensure kar
      - id: check-yaml                # YAML syntax validate kar
      - id: check-toml                # TOML syntax validate kar
      - id: check-added-large-files   # Bade files commit hone se pehle rokh
      - id: check-merge-conflict      # Merge conflict markers check kar
      - id: debug-statements          # debugger/breakpoint ka pata laga
```

### husky + lint-staged ke Saath Compare

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
# .pre-commit-config.yaml (Python) - same logic, zyada powerful
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
# Staged files par hooks run kar (commit ke samay automatically)
pre-commit run

# Sab files par run kar (sirf staged nahi)
pre-commit run --all-files

# Specific hook run kar
pre-commit run ruff

# Hook versions update kar
pre-commit autoupdate

# Ek commit ke liye hooks skip kar (git --no-verify jaisa)
git commit --no-verify -m "WIP: skip hooks"
```

---

## Unified Configuration in pyproject.toml

Python mein sabse achha: **sab kuch ek file mein**.

```toml
# pyproject.toml - THE configuration file

# ============================================================
# Project metadata (package.json ke name, version jaisa)
# ============================================================
[project]
name = "my-awesome-app"
version = "1.0.0"
description = "Ek achha Python application"
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
# pytest configuration (jest.config.js jaisa)
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
# Ruff configuration (.eslintrc + .prettierrc combine)
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
# mypy configuration (tsconfig.json jaisa)
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
# Coverage configuration (jest coverage options jaisa)
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

Compare karo Node.js ecosystem mein:
- `package.json`
- `.eslintrc.js`
- `.prettierrc`
- `tsconfig.json`
- `jest.config.js`
- `.lintstagedrc`
- `.husky/pre-commit`

Python mein: **ek hi file** (pyproject.toml)!

---

## Complete Quality Pipeline Setup

### Step 1: Install Sab Kuch

```bash
# Virtual environment pehle (zaroori!)
python -m venv .venv
source .venv/bin/activate  # Windows par: .venv\Scripts\activate

# Tools install kar
pip install ruff mypy pytest pytest-asyncio pytest-cov pre-commit
```

### Step 2: pyproject.toml Configure Kar

Upar diye comprehensive example ko use kar.

### Step 3: pre-commit Setup Kar

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

### Step 4: Makefile / Scripts Add Kar

```makefile
# Makefile - common commands (package.json ke npm scripts jaisa)

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

# Sab run kar (npm run ci jaisa)
ci: lint typecheck test
```

Or `pyproject.toml` scripts ke through task runner:

```toml
# pyproject.toml
[project.scripts]
# Yeh `pip install -e .` ke baad work karega
my-app = "myapp.main:main"

# Dev scripts ke liye:
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

Node.js mein compare karo:
```yaml
# Node.js CI (bilkul same pattern)
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

Pattern same hai, bas tools alag hain!

---

## VSCode Integration

### Required Extensions

1. **Python** (ms-python.python) - Core Python support
2. **Pylance** (ms-python.vscode-pylance) - Fast IntelliSense (TypeScript language server jaisa)
3. **Ruff** (charliermarsh.ruff) - Linting aur formatting
4. **Even Better TOML** (tamasfe.even-better-toml) - pyproject.toml support

### VSCode Settings

```jsonc
// .vscode/settings.json
{
    // Python interpreter
    "python.defaultInterpreterPath": ".venv/bin/python",

    // Ruff as formatter (Black ki jagah)
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
    "python.analysis.typeCheckingMode": "basic",  // ya "strict"
    "python.analysis.autoImportCompletions": true,

    // Testing
    "python.testing.pytestEnabled": true,
    "python.testing.pytestArgs": ["tests"],
    "python.testing.unittestEnabled": false,

    // Terminal
    "python.terminal.activateEnvironment": true
}
```

Node.js/TypeScript settings se compare:
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

Same pattern: format on save, lint on save, testing enable.

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

### Exercise 1: Project Scratch Se Setup Kar

Ek nayi Python project ek full quality tooling ke saath:

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
    pyproject.toml            # SABA configuration yaha
    .pre-commit-config.yaml
    .vscode/
        settings.json
    Makefile
```

Requirements:
1. `pyproject.toml` mein Ruff, mypy, pytest configuration
2. Ruff rules: minimum `E`, `F`, `I`, `UP`, `B`
3. mypy with `disallow_untyped_defs = true`
4. pre-commit hooks Ruff linting aur formatting ke liye
5. Makefile with `lint`, `format`, `typecheck`, `test`, `ci` targets
6. VSCode settings format-on-save ke saath Ruff

### Exercise 2: Messy File Fix Kar

Yeh intentionally messy file lo aur Ruff + mypy se sab issues fix kar:

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

Fix करने वाली चीजें:
1. Sab functions aur methods mein type annotations add kar
2. PEP 8 naming conventions fix kar
3. Modern type syntax use kar (`list` instead of `List`)
4. Unused imports aur variables hata
5. Boolean comparisons simplify kar
6. `range(len())` ki jagah `enumerate()` use kar
7. `== None` ki jagah `is None` use kar
8. Return statements simplify kar
9. Imports properly sort kar

### Exercise 3: Gradual Typing

Untyped code se shuru kar aur progressively types add kar. Har step ke baad mypy run kar.

```python
# step1: Function signatures mein basic types add kar
# step2: Structured dicts ke liye TypedDict add kar
# step3: Generics add kar jaha zaroori ho
# step4: mypy --strict run kar aur sab issues fix kar

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

GitHub Actions workflow file (`.github/workflows/ci.yml`) likho jo:

1. `main` par pushes aur all pull requests par run ho
2. Python 3.11 aur 3.12 par test kare
3. Project install kare dev dependencies ke saath
4. Ye checks parallel mein run kare:
   - Ruff linting
   - Ruff format check
   - mypy type checking
   - pytest with coverage (80% se kam ho to fail)
5. Coverage report as artifact upload kare

---

## Key Takeaways

1. **Ruff tumhara Swiss Army knife hai.** Ek hi tool se linting aur formatting dono, bilkul fast, aur Black + isort + flake8 sab ka kaam kar deta hai.
2. **pyproject.toml ek hi file hai.** Sab tool configuration yaha. Config files ka maze nahi.
3. **mypy optional hai but valuable.** Basic settings se shuru kar, gradually tight karte ja. Python gradual typing deta hai.
4. **pre-commit issues jaldi catch karta hai.** husky + lint-staged jaisa but zyada powerful aur language-agnostic.
5. **VSCode integration bilkul excellent hai.** Ruff extension tumhe ESLint + Prettier jaisa experience deta hai.
6. **CI pipeline almost identical hai** Node.js projects se.

Aage dekho: [Project Structure](./05_project_structure.md) -- professional taur se Python project organize kaise karte hain.
