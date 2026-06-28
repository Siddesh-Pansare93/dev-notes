# Type Hints in Python

## Coming from TypeScript: You Already Know This (Mostly)

If you've been writing TypeScript, Python's type hints will feel remarkably familiar. The biggest mindset shift: **Python type hints are optional annotations that are NOT enforced at runtime**. They exist for developer tooling, documentation, and static analysis -- but Python itself ignores them completely when running your code.

Think of it this way:
- **TypeScript**: Types are compiled away by `tsc`, but `tsc` refuses to compile if types are wrong.
- **Python**: Types are metadata attached to functions/variables. Python runs your code regardless. You use a separate tool (`mypy`) to check them.

```typescript
// TypeScript - enforced at compile time
function greet(name: string): string {
  return `Hello, ${name}`;
}
```

```python
# Python - NOT enforced at runtime, purely informational
def greet(name: str) -> str:
    return f"Hello, {name}"

# This runs without error even though we pass an int!
greet(42)  # Python doesn't care at runtime
```

---

## Basic Type Annotations

### Function Annotations

```python
# Parameters and return types
def add(x: int, y: int) -> int:
    return x + y

# No return value (like void in TS)
def log_message(msg: str) -> None:
    print(msg)

# Default values with type hints
def greet(name: str, excited: bool = False) -> str:
    if excited:
        return f"Hello, {name}!!!"
    return f"Hello, {name}"
```

```typescript
// TypeScript equivalent
function add(x: number, y: number): number {
  return x + y;
}

function logMessage(msg: string): void {
  console.log(msg);
}

function greet(name: string, excited: boolean = false): string {
  if (excited) return `Hello, ${name}!!!`;
  return `Hello, ${name}`;
}
```

### Variable Annotations

```python
# Variable type annotations
name: str = "Alice"
age: int = 30
is_active: bool = True
score: float = 98.5

# You can annotate without assigning (forward declaration)
username: str  # declared but not assigned yet
```

```typescript
// TypeScript equivalent
let name: string = "Alice";
let age: number = 30;
let isActive: boolean = true;
let score: number = 98.5;

let username: string; // declared but not assigned
```

> **Key difference**: Python distinguishes `int` and `float` as separate types. TypeScript has only `number` for both.

---

## Basic Types

| Python Type | TypeScript Equivalent | Example |
|---|---|---|
| `int` | `number` | `x: int = 42` |
| `float` | `number` | `x: float = 3.14` |
| `str` | `string` | `x: str = "hello"` |
| `bool` | `boolean` | `x: bool = True` |
| `None` | `null` / `undefined` | `x: None = None` |
| `bytes` | `Buffer` / `Uint8Array` | `x: bytes = b"data"` |
| `any` (from typing) | `any` | `x: Any = something` |

```python
from typing import Any

# Any disables type checking (just like TS any)
def process(data: Any) -> Any:
    return data
```

---

## Collection Types

### Modern Syntax (Python 3.9+)

Python 3.9+ lets you use built-in collection types directly in annotations. This is the preferred style.

```python
# List (like Array<number> or number[] in TS)
numbers: list[int] = [1, 2, 3]

# Dictionary (like Record<string, number> or { [key: string]: number })
scores: dict[str, int] = {"alice": 95, "bob": 87}

# Tuple - fixed length and types (like [string, number] in TS)
point: tuple[float, float] = (1.0, 2.0)

# Tuple - variable length, same type (like number[] but immutable)
ids: tuple[int, ...] = (1, 2, 3, 4, 5)

# Set (like Set<string> in TS)
tags: set[str] = {"python", "typing"}

# Frozenset (immutable set, like ReadonlySet<string>)
constants: frozenset[str] = frozenset({"PI", "E"})
```

```typescript
// TypeScript equivalents
const numbers: number[] = [1, 2, 3];
const scores: Record<string, number> = { alice: 95, bob: 87 };
const point: [number, number] = [1.0, 2.0];
const ids: number[] = [1, 2, 3, 4, 5];
const tags: Set<string> = new Set(["python", "typing"]);
const constants: ReadonlySet<string> = new Set(["PI", "E"]);
```

### Nested Collections

```python
# List of dictionaries
users: list[dict[str, str]] = [
    {"name": "Alice", "email": "alice@example.com"},
    {"name": "Bob", "email": "bob@example.com"},
]

# Dictionary with list values
groups: dict[str, list[int]] = {
    "evens": [2, 4, 6],
    "odds": [1, 3, 5],
}

# Tuple of mixed types
record: tuple[str, int, list[str]] = ("Alice", 30, ["admin", "user"])
```

### Legacy Syntax (Python 3.8 and earlier)

Before Python 3.9 you had to import from `typing`:

```python
from typing import List, Dict, Tuple, Set, FrozenSet

numbers: List[int] = [1, 2, 3]
scores: Dict[str, int] = {"alice": 95}
point: Tuple[float, float] = (1.0, 2.0)
tags: Set[str] = {"python"}
```

> You will see this in older codebases. New code should use the lowercase built-in types.

---

## Optional and Union Types

### Optional

`Optional[X]` means "X or None". It is exactly equivalent to `X | None`.

```python
from typing import Optional

# These two are identical
def find_user(id: int) -> Optional[str]:
    ...

def find_user(id: int) -> str | None:   # Python 3.10+ syntax
    ...
```

```typescript
// TypeScript equivalent
function findUser(id: number): string | null {
  // ...
}

// Or with optional parameter
function greet(name?: string): string {
  // name is string | undefined
}
```

> **Important**: Python doesn't have `undefined`. There's only `None`. Optional parameters still receive `None`, not some separate "missing" sentinel.

```python
# Optional parameter with default None
def greet(name: str | None = None) -> str:
    if name is None:
        return "Hello, stranger!"
    return f"Hello, {name}"
```

### Union Types

```python
from typing import Union

# Old syntax (Python 3.9 and earlier)
def process(value: Union[str, int]) -> str:
    return str(value)

# New syntax (Python 3.10+)
def process(value: str | int) -> str:
    return str(value)

# Multiple types
def normalize(data: str | int | float | None) -> str:
    if data is None:
        return ""
    return str(data)
```

```typescript
// TypeScript equivalent
function process(value: string | number): string {
  return String(value);
}
```

---

## Type Aliases

```python
# Simple type alias (Python 3.12+ uses 'type' keyword)
type UserId = int
type Coordinates = tuple[float, float]
type UserMap = dict[str, list[int]]

# For Python 3.9-3.11, use assignment
UserId = int
Coordinates = tuple[float, float]
UserMap = dict[str, list[int]]

# Using TypeAlias for clarity (Python 3.10+)
from typing import TypeAlias
UserId: TypeAlias = int
Coordinates: TypeAlias = tuple[float, float]

# Use them like any other type
def get_user(uid: UserId) -> str:
    ...

def distance(a: Coordinates, b: Coordinates) -> float:
    ...
```

```typescript
// TypeScript equivalent
type UserId = number;
type Coordinates = [number, number];
type UserMap = Record<string, number[]>;
```

---

## The `typing` Module Overview

The `typing` module is your one-stop shop for advanced type annotations:

```python
from typing import (
    # Core types
    Any,            # Disable type checking (like TS 'any')
    Never,          # Function never returns (like TS 'never') - Python 3.11+
    NoReturn,       # Older name for Never

    # Collection abstractions (prefer for function params)
    Sequence,       # Read-only list-like (like ReadonlyArray)
    Mapping,        # Read-only dict-like (like Readonly<Record<...>>)
    MutableMapping, # Mutable dict-like
    Iterable,       # Anything you can iterate over
    Iterator,       # An iterator

    # Callable
    Callable,       # Function types

    # Union helpers
    Optional,       # X | None
    Union,          # X | Y (old syntax)

    # Generics
    TypeVar,        # Generic type variable (like <T>)
    Generic,        # Base class for generic classes

    # Special
    Final,          # Cannot be reassigned (like const/readonly)
    ClassVar,       # Class variable, not instance variable
    TypeGuard,      # Narrows type in if-checks (like TS type guards)

    # Runtime
    get_type_hints, # Retrieve type hints at runtime
    TYPE_CHECKING,  # Only True when type checker runs
)
```

### Sequence vs list -- When to Use What

```python
from typing import Sequence, MutableSequence

# Use Sequence for "I just need to read from this"
# Accepts list, tuple, str, etc.
def first_item(items: Sequence[int]) -> int:
    return items[0]

# Use list when you need to modify it
def append_item(items: list[int], item: int) -> None:
    items.append(item)

# Same idea for Mapping vs dict
from typing import Mapping

def get_value(data: Mapping[str, int], key: str) -> int:
    return data[key]  # read-only access
```

```typescript
// TypeScript equivalent concept
function firstItem(items: readonly number[]): number {
  return items[0];
}

function appendItem(items: number[], item: number): void {
  items.push(item);
}
```

### Final (like const / readonly in TS)

```python
from typing import Final

MAX_RETRIES: Final = 3
API_URL: Final[str] = "https://api.example.com"

# mypy will flag this as an error:
MAX_RETRIES = 5  # Error: Cannot assign to final name "MAX_RETRIES"
```

---

## mypy: The Type Checker

`mypy` is to Python what `tsc` is to TypeScript -- but it is a **separate tool** that you run independently. Python itself never checks types.

### Setup

```bash
pip install mypy

# Run type checking
mypy your_script.py

# Check an entire package
mypy src/

# Strict mode (like TS strict: true)
mypy --strict src/
```

### Configuration (pyproject.toml)

```toml
[tool.mypy]
python_version = "3.12"
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true        # Like TS noImplicitAny
strict_optional = true               # Like TS strictNullChecks
check_untyped_defs = true

# Per-module overrides (like TS paths/skipLibCheck)
[[tool.mypy.overrides]]
module = "third_party_lib.*"
ignore_missing_imports = true
```

### Common mypy Flags

| mypy Flag | TS Equivalent | Purpose |
|---|---|---|
| `--strict` | `strict: true` | Enable all strict checks |
| `--disallow-untyped-defs` | `noImplicitAny` | Require type annotations |
| `--no-implicit-optional` | `strictNullChecks` | Don't auto-add None |
| `--ignore-missing-imports` | `skipLibCheck` | Ignore untyped libraries |

### Type Stubs

Some libraries don't have inline type hints. Type stubs (`.pyi` files) provide types separately, similar to `.d.ts` files in TypeScript:

```bash
# Install type stubs for popular libraries
pip install types-requests    # like @types/node
pip install types-redis       # like @types/redis
pip install types-PyYAML      # like @types/js-yaml
```

---

## Type Narrowing (Type Guards)

Python's type narrowing works similarly to TypeScript's:

```python
def process(value: str | int) -> str:
    if isinstance(value, str):
        # mypy knows value is str here
        return value.upper()
    else:
        # mypy knows value is int here
        return str(value * 2)

# None checks narrow types too
def greet(name: str | None) -> str:
    if name is None:
        return "Hello!"
    # mypy knows name is str here
    return f"Hello, {name}!"

# assert narrows types
def process_name(name: str | None) -> str:
    assert name is not None  # narrows to str
    return name.upper()
```

### Custom Type Guards (Python 3.10+)

```python
from typing import TypeGuard

def is_string_list(val: list[object]) -> TypeGuard[list[str]]:
    """Returns True if all items in the list are strings."""
    return all(isinstance(x, str) for x in val)

def process(items: list[object]) -> None:
    if is_string_list(items):
        # mypy knows items is list[str] here
        for item in items:
            print(item.upper())
```

```typescript
// TypeScript equivalent
function isStringArray(val: unknown[]): val is string[] {
  return val.every((x) => typeof x === "string");
}
```

---

## Key Differences from TypeScript

| Aspect | TypeScript | Python |
|---|---|---|
| Enforcement | Compile-time via `tsc` | Never enforced; `mypy` is optional |
| Runtime impact | Types erased, but checked before emit | Types stored as metadata, never checked |
| Adoption | Required (`.ts` files) | Gradual (add hints to any `.py` file) |
| Generics syntax | `function f<T>(x: T): T` | `def f(x: T) -> T:` with TypeVar |
| Interfaces | `interface Foo { ... }` | `Protocol` or `TypedDict` |
| Enums | `enum Color { Red, Green }` | `class Color(Enum)` |
| Type narrowing | `typeof`, `instanceof`, type predicates | `isinstance()`, `TypeGuard` |
| Null handling | `null`, `undefined`, `?:` | Only `None`, `Optional[X]` |

---

## Practice Exercises

### Exercise 1: Annotate This Code
Add type hints to every function parameter, return type, and variable:

```python
def calculate_stats(numbers):
    total = sum(numbers)
    count = len(numbers)
    average = total / count if count > 0 else 0
    return {"total": total, "count": count, "average": average}

def find_longest(strings):
    if not strings:
        return None
    result = strings[0]
    for s in strings:
        if len(s) > len(result):
            result = s
    return result

def merge_configs(default, override):
    result = dict(default)
    result.update(override)
    return result
```

### Exercise 2: Fix the Type Errors
The following code has type errors that mypy would catch. Identify and fix them:

```python
def get_name(user: dict[str, str]) -> str:
    return user.get("name")  # What's wrong here?

def double(x: int) -> int:
    return str(x * 2)  # What's wrong here?

def first_or_default(items: list[int], default: str = "none") -> int:
    if items:
        return items[0]
    return default  # What's wrong here?
```

### Exercise 3: Collection Types
Write properly typed functions for:

1. A function that takes a list of dictionaries (each with "name" as str and "age" as int) and returns a list of names of people over 18.
2. A function that takes a dict mapping string keys to lists of floats and returns a new dict with the same keys but average values.
3. A function that returns either a tuple of (str, int) on success or None on failure.

### Exercise 4: Build a Typed Config
Create a typed configuration system:
- Define type aliases for `Port` (int), `Host` (str), `Headers` (dict of str to str)
- Write a `ServerConfig` TypedDict with host, port, debug (bool), and optional headers
- Write a `load_config` function that takes a file path string and returns a `ServerConfig`
- Write a `merge_configs` function that takes a base config and overrides (partial config) and returns a merged config

### Exercise 5: mypy Practice
Create a file that uses:
- `Final` for constants
- `Sequence` for a function that accepts any sequence
- A union type with proper narrowing via `isinstance`
- A function that can return `None` with proper `Optional` annotation

Then run `mypy --strict` on it and fix any errors.
