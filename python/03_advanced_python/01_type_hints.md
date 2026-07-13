# Type Hints in Python

## TypeScript se aaye ho? Toh yeh tumhe already pata hai (mostly)

Agar tumne TypeScript likha hai, toh Python ke type hints tumhe kaafi familiar lagenge. Par ek badi mindset shift hai: **Python ke type hints sirf optional annotations hain jo runtime pe enforce NAHI hote**. Yeh sirf developer tooling, documentation aur static analysis ke liye hain — lekin Python khud inhe completely ignore karta hai jab code chalta hai.

Isse aise socho:
- **TypeScript**: Types `tsc` se compile time pe hi gayab ho jaate hain, lekin agar types galat hain toh `tsc` compile hi nahi karega.
- **Python**: Types sirf functions/variables pe attach ki hui metadata hain. Python tumhara code chalayega hi chalayega, chahe types kuch bhi ho. Types check karne ke liye ek alag tool (`mypy`) use karna padta hai.

```typescript
// TypeScript - compile time pe enforce hota hai
function greet(name: string): string {
  return `Hello, ${name}`;
}
```

```python
# Python - runtime pe ENFORCE nahi hota, sirf informational hai
def greet(name: str) -> str:
    return f"Hello, {name}"

# Yeh bina error ke chalega, chahe hum int pass karein!
greet(42)  # Python ko runtime pe koi fark nahi padta
```

---

## Basic Type Annotations

### Function Annotations

```python
# Parameters aur return types
def add(x: int, y: int) -> int:
    return x + y

# Koi return value nahi (TS ke void jaisa)
def log_message(msg: str) -> None:
    print(msg)

# Default values ke saath type hints
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

# Bina value assign kiye bhi annotate kar sakte ho (forward declaration)
username: str  # declare kiya, abhi assign nahi kiya
```

```typescript
// TypeScript equivalent
let name: string = "Alice";
let age: number = 30;
let isActive: boolean = true;
let score: number = 98.5;

let username: string; // declared but not assigned
```

> [!info]
> **Key difference**: Python `int` aur `float` ko alag-alag type maanta hai. TypeScript mein dono ke liye sirf ek hi type hai — `number`.

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
| `any` (typing se) | `any` | `x: Any = something` |

```python
from typing import Any

# Any type checking disable kar deta hai (bilkul TS ke any jaisa)
def process(data: Any) -> Any:
    return data
```

---

## Collection Types

### Modern Syntax (Python 3.9+)

Python 3.9+ mein tum built-in collection types seedhe annotations mein use kar sakte ho. Yahi preferred style hai.

```python
# List (TS ke Array<number> ya number[] jaisa)
numbers: list[int] = [1, 2, 3]

# Dictionary (TS ke Record<string, number> ya { [key: string]: number } jaisa)
scores: dict[str, int] = {"alice": 95, "bob": 87}

# Tuple - fixed length aur types (TS ke [string, number] jaisa)
point: tuple[float, float] = (1.0, 2.0)

# Tuple - variable length, same type (number[] jaisa but immutable)
ids: tuple[int, ...] = (1, 2, 3, 4, 5)

# Set (TS ke Set<string> jaisa)
tags: set[str] = {"python", "typing"}

# Frozenset (immutable set, ReadonlySet<string> jaisa)
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
# Dictionaries ki list
users: list[dict[str, str]] = [
    {"name": "Alice", "email": "alice@example.com"},
    {"name": "Bob", "email": "bob@example.com"},
]

# List values wali dictionary
groups: dict[str, list[int]] = {
    "evens": [2, 4, 6],
    "odds": [1, 3, 5],
}

# Mixed types ka tuple
record: tuple[str, int, list[str]] = ("Alice", 30, ["admin", "user"])
```

### Legacy Syntax (Python 3.8 aur usse purana)

Python 3.9 se pehle `typing` se import karna padta tha:

```python
from typing import List, Dict, Tuple, Set, FrozenSet

numbers: List[int] = [1, 2, 3]
scores: Dict[str, int] = {"alice": 95}
point: Tuple[float, float] = (1.0, 2.0)
tags: Set[str] = {"python"}
```

> [!tip]
> Purane codebases mein yeh style dikhega. Naya code likhte waqt lowercase built-in types hi use karo.

---

## Optional and Union Types

### Optional

`Optional[X]` ka matlab hai "X ya None". Yeh bilkul `X | None` ke barabar hai.

```python
from typing import Optional

# Yeh dono exactly same hain
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

// Ya optional parameter ke saath
function greet(name?: string): string {
  // name is string | undefined
}
```

> [!warning]
> **Important**: Python mein `undefined` nahi hota. Sirf `None` hi hai. Optional parameters mein bhi value na milne pe koi alag "missing" sentinel nahi, seedha `None` hi milta hai.

```python
# Optional parameter jiska default None hai
def greet(name: str | None = None) -> str:
    if name is None:
        return "Hello, stranger!"
    return f"Hello, {name}"
```

### Union Types

```python
from typing import Union

# Old syntax (Python 3.9 aur pehle)
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

Socho tumhe baar-baar `dict[str, list[int]]` jaisa lamba type likhna pad raha hai — usse ek naam de do, jaise Swiggy mein "combo meal" ko ek naam de dete hain instead of listing har item baar-baar.

```python
# Simple type alias (Python 3.12+ mein 'type' keyword use hota hai)
type UserId = int
type Coordinates = tuple[float, float]
type UserMap = dict[str, list[int]]

# Python 3.9-3.11 ke liye, seedha assignment use karo
UserId = int
Coordinates = tuple[float, float]
UserMap = dict[str, list[int]]

# Clarity ke liye TypeAlias use karo (Python 3.10+)
from typing import TypeAlias
UserId: TypeAlias = int
Coordinates: TypeAlias = tuple[float, float]

# Ab inhe kisi bhi normal type ki tarah use karo
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

## `typing` Module Overview

`typing` module tumhara ek-stop-shop hai advanced type annotations ke liye:

```python
from typing import (
    # Core types
    Any,            # Type checking disable (TS ke 'any' jaisa)
    Never,          # Function kabhi return nahi karta (TS ke 'never' jaisa) - Python 3.11+
    NoReturn,       # Never ka purana naam

    # Collection abstractions (function params ke liye prefer karo)
    Sequence,       # Read-only list-like (ReadonlyArray jaisa)
    Mapping,        # Read-only dict-like (Readonly<Record<...>> jaisa)
    MutableMapping, # Mutable dict-like
    Iterable,       # Kuch bhi jispe iterate kar sako
    Iterator,       # Ek iterator

    # Callable
    Callable,       # Function types

    # Union helpers
    Optional,       # X | None
    Union,          # X | Y (old syntax)

    # Generics
    TypeVar,        # Generic type variable (<T> jaisa)
    Generic,        # Generic classes ka base class

    # Special
    Final,          # Reassign nahi kar sakte (const/readonly jaisa)
    ClassVar,       # Class variable, instance variable nahi
    TypeGuard,      # if-checks mein type narrow karta hai (TS type guards jaisa)

    # Runtime
    get_type_hints, # Runtime pe type hints nikalna
    TYPE_CHECKING,  # Sirf tab True hota hai jab type checker chal raha ho
)
```

### Sequence vs list — Kab Kya Use Karein

```python
from typing import Sequence, MutableSequence

# Sequence use karo jab bas "isse padhna hai"
# List, tuple, str — sab accept karta hai
def first_item(items: Sequence[int]) -> int:
    return items[0]

# list use karo jab modify bhi karna ho
def append_item(items: list[int], item: int) -> None:
    items.append(item)

# Yahi idea Mapping vs dict ke liye bhi
from typing import Mapping

def get_value(data: Mapping[str, int], key: str) -> int:
    return data[key]  # sirf read-only access
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

### Final (TS ke const / readonly jaisa)

```python
from typing import Final

MAX_RETRIES: Final = 3
API_URL: Final[str] = "https://api.example.com"

# mypy isko error bata dega:
MAX_RETRIES = 5  # Error: Cannot assign to final name "MAX_RETRIES"
```

---

## mypy: The Type Checker

`mypy` Python ke liye wahi hai jo TypeScript ke liye `tsc` hai — bas fark itna hai ki yeh ek **alag tool** hai jo tumhe khud se chalana padta hai. Python khud kabhi type check nahi karta.

### Setup

```bash
pip install mypy

# Type checking chalao
mypy your_script.py

# Poora package check karo
mypy src/

# Strict mode (TS ke strict: true jaisa)
mypy --strict src/
```

### Configuration (pyproject.toml)

```toml
[tool.mypy]
python_version = "3.12"
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true        # TS ke noImplicitAny jaisa
strict_optional = true               # TS ke strictNullChecks jaisa
check_untyped_defs = true

# Per-module overrides (TS ke paths/skipLibCheck jaisa)
[[tool.mypy.overrides]]
module = "third_party_lib.*"
ignore_missing_imports = true
```

### Common mypy Flags

| mypy Flag | TS Equivalent | Purpose |
|---|---|---|
| `--strict` | `strict: true` | Saare strict checks enable karo |
| `--disallow-untyped-defs` | `noImplicitAny` | Type annotations zaruri banao |
| `--no-implicit-optional` | `strictNullChecks` | None ko auto-add mat karo |
| `--ignore-missing-imports` | `skipLibCheck` | Untyped libraries ignore karo |

### Type Stubs

Kuch libraries ke paas inline type hints nahi hote. Type stubs (`.pyi` files) alag se types dete hain, bilkul TypeScript ke `.d.ts` files jaisa:

```bash
# Popular libraries ke liye type stubs install karo
pip install types-requests    # @types/node jaisa
pip install types-redis       # @types/redis jaisa
pip install types-PyYAML      # @types/js-yaml jaisa
```

---

## Type Narrowing (Type Guards)

Python ka type narrowing kaafi had tak TypeScript jaisa hi kaam karta hai:

```python
def process(value: str | int) -> str:
    if isinstance(value, str):
        # mypy ko yahan pata hai value str hai
        return value.upper()
    else:
        # mypy ko yahan pata hai value int hai
        return str(value * 2)

# None checks bhi types narrow karte hain
def greet(name: str | None) -> str:
    if name is None:
        return "Hello!"
    # mypy ko yahan pata hai name str hai
    return f"Hello, {name}!"

# assert bhi type narrow karta hai
def process_name(name: str | None) -> str:
    assert name is not None  # str tak narrow ho gaya
    return name.upper()
```

### Custom Type Guards (Python 3.10+)

```python
from typing import TypeGuard

def is_string_list(val: list[object]) -> TypeGuard[list[str]]:
    """True return karta hai agar list ke saare items string hain."""
    return all(isinstance(x, str) for x in val)

def process(items: list[object]) -> None:
    if is_string_list(items):
        # mypy ko yahan pata hai items list[str] hai
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

## TypeScript se Key Differences

| Aspect | TypeScript | Python |
|---|---|---|
| Enforcement | Compile-time pe `tsc` se | Kabhi enforce nahi hota; `mypy` optional hai |
| Runtime impact | Types erase ho jaate hain, but emit se pehle check hote hain | Types metadata ki tarah store hote hain, kabhi check nahi hote |
| Adoption | Zaruri hai (`.ts` files) | Gradual (kisi bhi `.py` file mein hints add kar sakte ho) |
| Generics syntax | `function f<T>(x: T): T` | `def f(x: T) -> T:` TypeVar ke saath |
| Interfaces | `interface Foo { ... }` | `Protocol` ya `TypedDict` |
| Enums | `enum Color { Red, Green }` | `class Color(Enum)` |
| Type narrowing | `typeof`, `instanceof`, type predicates | `isinstance()`, `TypeGuard` |
| Null handling | `null`, `undefined`, `?:` | Sirf `None`, `Optional[X]` |

---

## Practice Exercises

### Exercise 1: Is Code ko Annotate Karo
Har function parameter, return type, aur variable mein type hints add karo:

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

### Exercise 2: Type Errors Fix Karo
Neeche diye code mein type errors hain jo mypy pakad lega. Inhe identify aur fix karo:

```python
def get_name(user: dict[str, str]) -> str:
    return user.get("name")  # Yahan kya galat hai?

def double(x: int) -> int:
    return str(x * 2)  # Yahan kya galat hai?

def first_or_default(items: list[int], default: str = "none") -> int:
    if items:
        return items[0]
    return default  # Yahan kya galat hai?
```

### Exercise 3: Collection Types
In cheezon ke liye properly typed functions likho:

1. Ek function jo dictionaries ki list le (har dict mein "name" str aur "age" int) aur 18 se upar wale logon ke naam ki list return kare.
2. Ek function jo string keys ko floats ki list se map karne wala dict le aur same keys ke saath average values wala naya dict return kare.
3. Ek function jo success pe (str, int) ka tuple ya failure pe None return kare.

### Exercise 4: Typed Config Banao
Ek typed configuration system banao:
- `Port` (int), `Host` (str), `Headers` (str se str wala dict) ke liye type aliases define karo
- host, port, debug (bool), aur optional headers ke saath `ServerConfig` TypedDict likho
- Ek `load_config` function likho jo file path string le aur `ServerConfig` return kare
- Ek `merge_configs` function likho jo base config aur overrides (partial config) le aur merged config return kare

### Exercise 5: mypy Practice
Ek file banao jisme yeh sab use ho:
- Constants ke liye `Final`
- Kisi bhi sequence accept karne wale function ke liye `Sequence`
- `isinstance` se proper narrowing wala union type
- `None` return kar sakne wala function, proper `Optional` annotation ke saath

Phir uspe `mypy --strict` chalao aur jo bhi errors aayein unhe fix karo.
