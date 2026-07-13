# Python mein Type Hints — TypeScript Wale Concept Samajhte Ho

## TypeScript se aaye ho? Toh yeh concept tumhe kaafi familiar lagega (par farak hain!)

Agar tumne TypeScript likha hai, toh Python ke type hints tumhe bilkul familiar feel honge. Par ek fundamental mindset shift hai jo samajhna zaruri hai:

**Python ke type hints sirf optional annotations hain jo runtime pe enforce NAHI hote.** Yeh bilkul developer tooling, IDE autocomplete, documentation, aur static analysis tools ke liye hain — lekin Python khud inhe completely ignore karta hai jab code chalta hai.

Isse aise socho:
- **TypeScript**: Types `tsc` compile-time pe check hote hain. Agar types galat hain toh tsc compile hi nahi karega. Types code se nikaal diye jaate hain, lekin error checking compile time mein hoti hai.
- **Python**: Types sirf functions aur variables par metadata attach hai. Python tumhara code chalayega — chahe types kuch bhi ho, galat ho, ya na likha ho. Types check karne ke liye ek alag tool (`mypy`) use karna padta hai.

```typescript
// TypeScript — compile time pe pata chal jaata hai agar kuch galat hai
function greet(name: string): string {
  return `Hello, ${name}`;
}
```

```python
# Python — runtime pe koi fark nahi padta! Yeh code bina error chalega
def greet(name: str) -> str:
    return f"Hello, {name}"

# Chahe kuch bhi pass karo, Python ko OK hai
greet(42)           # Koi error nahi! Python ko types ignore
greet([1, 2, 3])    # Yeh bhi chalega (agar string functions na use karo to)
```

> [!warning]
> Zaruuri nahi hai Python code type-safe ho! Types likhna sirf best practice hai taaki mypy check kar sake aur IDE hints de sake.

---

## Basic Type Annotations — Scratch se Shuru Karo

### Function Parameters aur Return Types

```python
# Sabse basic example
def add(x: int, y: int) -> int:
    return x + y

# Agar function kuch nahi return karta (TS ke void jaisa)
def log_message(msg: str) -> None:
    print(msg)

# Default values ke saath bhi type hints add kar sakte ho
def greet(name: str, excited: bool = False) -> str:
    if excited:
        return f"Hello, {name}!!!"
    return f"Hello, {name}"
```

```typescript
// TypeScript version (compare karo)
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

### Variables ke Type Hints

```python
# Variables ko bhi type annotate kar sakte ho
name: str = "Alice"
age: int = 30
is_active: bool = True
score: float = 98.5

# Forward declaration (type declare karo, value baad mein dो)
username: str  # abhi variable declare ho gaya, assign baad mein

# Assignment se mypy automatically infer kar leta hai (type hint optional)
country = "India"  # mypy automatically str assume karega
```

```typescript
// TypeScript version
let name: string = "Alice";
let age: number = 30;
let isActive: boolean = true;
let score: number = 98.5;

let username: string;
```

> [!info]
> **Python aur TypeScript ka ek bada farak**: Python `int` aur `float` ko bilkul alag types maanta hai. TypeScript mein dono ke liye `number` hai. Socho IRCTC se ticket booking karte time — fare integer ho sakta hai ya decimal, dono ke liye alag handling.

---

## Basic Types — Sabse Zyada Use Hone Wale

| Python Type | TypeScript | Matlab Kya |
|---|---|---|
| `int` | `number` | Poore numbers (42, -5, 1000) |
| `float` | `number` | Decimal numbers (3.14, 2.71) |
| `str` | `string` | Text ("hello", "नमस्ते") |
| `bool` | `boolean` | True ya False |
| `None` | `null` / `undefined` | Kuch nahi (Python mein sirf None) |
| `bytes` | `Buffer` | Raw binary data |
| `Any` | `any` | Kuch bhi (type checking off kar do) |

```python
from typing import Any

# Any ka matlab: "Jo bhi pass karo, mujhe OK hai"
# TypeScript ke any jaisa — type safety OFF
def process(data: Any) -> Any:
    return data

process(42)
process("hello")
process([1, 2, 3])  # Sab kuch chalega!
```

---

## Collection Types — List, Dict, Aur Sab Kuch

### Modern Style (Python 3.9+)

Python 3.9 se pehle `typing` module se imports lena padta tha. Ab built-in collection types seedhe use kar sakte ho. **Yahi new style hai — isko prefer karo:**

```python
# List — array ki tarah (TS ke number[] jaisa)
numbers: list[int] = [1, 2, 3]

# Dictionary — key-value pairs (TS ke Record<string, number> jaisa)
scores: dict[str, int] = {"alice": 95, "bob": 87}

# Tuple — fixed size, types bhi fixed (TS ke [string, number] jaisa)
point: tuple[float, float] = (1.0, 2.0)

# Tuple — variable size, same type (jaisa ek array but immutable)
ids: tuple[int, ...] = (1, 2, 3, 4, 5)

# Set — duplicate nahi, order nahi (TS ke Set<string> jaisa)
tags: set[str] = {"python", "typing"}

# Frozenset — immutable set (TS ke ReadonlySet<string> jaisa)
constants: frozenset[str] = frozenset({"PI", "E"})
```

```typescript
// TypeScript version
const numbers: number[] = [1, 2, 3];
const scores: Record<string, number> = { alice: 95, bob: 87 };
const point: [number, number] = [1.0, 2.0];
const ids: number[] = [1, 2, 3, 4, 5];
const tags: Set<string> = new Set(["python", "typing"]);
const constants: ReadonlySet<string> = new Set(["PI", "E"]);
```

### Nested Collections — Jab Complex Types Chahie

```python
# List of dictionaries (Zomato ke restaurants list jaisa)
users: list[dict[str, str]] = [
    {"name": "Alice", "email": "alice@example.com"},
    {"name": "Bob", "email": "bob@example.com"},
]

# Dictionary jo list values rakhta hai (groups ka category with items)
groups: dict[str, list[int]] = {
    "evens": [2, 4, 6],
    "odds": [1, 3, 5],
}

# Mixed-type tuple (ek user record — name, age, roles)
record: tuple[str, int, list[str]] = ("Alice", 30, ["admin", "user"])
```

### Legacy Style (Python 3.8 aur Se Pehle)

Purane codebases mein yeh style dikhega. Aaj kal naya code likhte hum lowercase built-in types use karte hain:

```python
from typing import List, Dict, Tuple, Set, FrozenSet

# Purana style (TS ke zamanay ke jaise)
numbers: List[int] = [1, 2, 3]
scores: Dict[str, int] = {"alice": 95}
point: Tuple[float, float] = (1.0, 2.0)
tags: Set[str] = {"python"}
```

> [!tip]
> Legacy code mein yeh style milega. Naya code likhte waqt lowercase types (`list[int]`) hi use karo — zyada clean aur simple hai.

---

## Optional aur Union Types — Jab Multiple Types Possible Ho

### Optional — "Ya Value Hai, Ya None"

`Optional[X]` ka matlab: "Ya toh X type hoga, ya phir None (Python ka null)". Python 3.10+ mein `X | None` likhna zyada readable hai.

```python
from typing import Optional

# Dono exactly same hain:
def find_user(user_id: int) -> Optional[str]:
    # Return user ka naam ya None (agar user na mile)
    ...

# Modern style (Python 3.10+)
def find_user(user_id: int) -> str | None:
    ...
```

```typescript
// TypeScript version
function findUser(userId: number): string | null {
  // ...
}

// Ya optional parameter ke saath
function greet(name?: string): string {
  // name is string | undefined
}
```

> [!warning]
> **Important farak**: Python mein `undefined` nahi hota! Sirf `None` hai. JavaScript/TypeScript ke `undefined` ke barabar, Python mein `None` use hota hai. Optional parameters jo value nahi paate, unhe `None` milta hai (ya tumne default value set kiya).

```python
# Optional parameter jiska default None hai
def greet(name: str | None = None) -> str:
    if name is None:
        return "Hello, stranger!"
    return f"Hello, {name}"

greet()           # "Hello, stranger!" (None pass hua)
greet("Alice")    # "Hello, Alice!"
```

### Union Types — Multiple Options

```python
from typing import Union

# Python 3.9 aur se pehle
def process(value: Union[str, int]) -> str:
    return str(value)

# Python 3.10+ (modern syntax)
def process(value: str | int) -> str:
    return str(value)

# Multiple types handle karne padte hain
def normalize(data: str | int | float | None) -> str:
    if data is None:
        return ""
    return str(data)
```

```typescript
// TypeScript version
function process(value: string | number): string {
  return String(value);
}
```

---

## Type Aliases — Lamba Types Ko Naam Do

Socho — agar tum baar-baar `dict[str, list[int]]` jaisa lamba type likhna pad rahe ho, toh usse ek naam de do. Zomato mein jaise "Comfort Combo" ko kabhi har item manually list nahi karte.

```python
# Python 3.12+ — type keyword (modern)
type UserId = int
type Coordinates = tuple[float, float]
type UserMap = dict[str, list[int]]

# Python 3.9-3.11 — seedha assignment (abhi bhi chalega)
UserId = int
Coordinates = tuple[float, float]
UserMap = dict[str, list[int]]

# TypeAlias use karo clarity ke liye (Python 3.10+)
from typing import TypeAlias
UserId: TypeAlias = int
Coordinates: TypeAlias = tuple[float, float]

# Ab inn types ko normal types ki tarah use karo
def get_user(uid: UserId) -> str:
    return f"User {uid}"

def distance(a: Coordinates, b: Coordinates) -> float:
    x1, y1 = a
    x2, y2 = b
    return ((x2 - x1) ** 2 + (y2 - y1) ** 2) ** 0.5
```

```typescript
// TypeScript version
type UserId = number;
type Coordinates = [number, number];
type UserMap = Record<string, number[]>;
```

---

## `typing` Module — Advanced Types Ka Jhola

`typing` module mein advanced annotations hain jo special cases handle karte hain:

```python
from typing import (
    # Basic types
    Any,            # Type checking disable (TypeScript ke any jaisa)
    Never,          # Function kabhi return nahi karta (Python 3.11+)
    NoReturn,       # Never ka purana naam

    # Collection abstractions (function params ke liye zyada better)
    Sequence,       # Read-only list (list ko accept karta hai, tuple ko bhi)
    Mapping,        # Read-only dict
    MutableMapping, # Mutable dict
    Iterable,       # Kuch bhi jispe loop lga sakte ho
    Iterator,       # Actual iterator object

    # Functions as types
    Callable,       # Function types

    # Union helper
    Optional,       # X | None (old style)
    Union,          # X | Y (old style)

    # Generics (advanced)
    TypeVar,        # Generic <T> jaisa
    Generic,        # Generic classes banane ke liye

    # Special annotations
    Final,          # Reassign nahi kar sakte (const jaisa)
    ClassVar,       # Class variable, instance variable nahi
    TypeGuard,      # Type narrowing ke liye

    # Runtime utilities
    get_type_hints, # Runtime pe type hints nikalna
    TYPE_CHECKING,  # Sirf type checker run karte waqt True
)
```

### Sequence vs List — Kab Kaun Use Kare?

Socho — ek function ko list pass karna hai ya tuple bhi accept karna hai? `Sequence` use karo:

```python
from typing import Sequence

# Sequence — "mujhe sirf padhna hai, modify nahi"
# List, tuple, string — sab accept karta hai
def first_item(items: Sequence[int]) -> int:
    return items[0]  # Sirf read operation

# list — "mujhe modify bhi karna hai"
def append_item(items: list[int], item: int) -> None:
    items.append(item)  # Modify operation

# Mapping — "key-value pairs ko sirf padhna hai"
from typing import Mapping

def get_value(data: Mapping[str, int], key: str) -> int:
    return data[key]  # Read-only

# MutableMapping — "dict ko modify bhi kar sakte ho"
from typing import MutableMapping

def set_value(data: MutableMapping[str, int], key: str, value: int) -> None:
    data[key] = value  # Modify
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

### Final — Constants Banane Ke Liye

TypeScript/JavaScript ke `const` keyword jaisa, `Final` use karo:

```python
from typing import Final

MAX_RETRIES: Final = 3
API_URL: Final[str] = "https://api.example.com"
DEFAULT_TIMEOUT: Final[int] = 30

# mypy error dega agar reassign karo:
MAX_RETRIES = 5  # ❌ Error: Cannot assign to final name
```

---

## mypy — Python Ka Type Checker

`mypy` wahi role karta hai Python mein jo `tsc` karta hai TypeScript mein. **Par ek badi baat**: `mypy` ek alag tool hai jo tumhe khud chalana padta hai. Python khud kabhi type check nahi karta.

### Setup aur Basic Commands

```bash
# Install karo
pip install mypy

# Single file check karo
mypy your_script.py

# Poora project check karo
mypy src/

# Strict mode (TypeScript ke strict: true jaisa)
mypy --strict src/

# Specific rules ke saath
mypy --disallow-untyped-defs src/  # Sab functions typed hone zaruuri
```

### Configuration — pyproject.toml mein

```toml
[tool.mypy]
python_version = "3.12"

# Basic checks
warn_return_any = true
warn_unused_configs = true

# Strict checks (TypeScript ke strict mode jaisa)
disallow_untyped_defs = true        # TypeScript ke noImplicitAny
strict_optional = true               # TypeScript ke strictNullChecks
check_untyped_defs = true
disallow_incomplete_defs = true

# Library handling
ignore_missing_imports = true        # Untyped libraries ignore karo
no_implicit_reexport = true

# Per-module overrides (kisi libraries ko ignore karna ho)
[[tool.mypy.overrides]]
module = "third_party_lib.*"
ignore_missing_imports = true
```

### Common mypy Flags — TypeScript Se Comparison

| mypy Flag | TypeScript Equivalent | Kya Karta Hai |
|---|---|---|
| `--strict` | `strict: true` | Saare strict checks enable karo |
| `--disallow-untyped-defs` | `noImplicitAny` | Sab functions ko types dena zaruuri |
| `--no-implicit-optional` | `strictNullChecks` | None ko auto-add mat karo |
| `--ignore-missing-imports` | `skipLibCheck` | Untyped third-party code ignore karo |
| `--warn-redundant-casts` | (part of strict) | Redundant type casts batao |

### Type Stubs (.pyi Files)

Kuch libraries mein inline type hints nahi hote. Type stubs separate files mein types provide karte hain — bilkul TypeScript ke `.d.ts` files jaisa:

```bash
# Popular libraries ke liye type stubs install karo
pip install types-requests    # requests library ke liye
pip install types-redis       # redis library ke liye
pip install types-PyYAML      # YAML library ke liye

# Stubgen tool se apne stubs bana sakte ho
stubgen -p my_library
```

---

## Type Narrowing — Smart Type Detection

Python mypy kaafi smart hai — agar tum `isinstance()` ya `None` check karo, toh woh type automatically narrow kar deta hai:

```python
def process(value: str | int) -> str:
    if isinstance(value, str):
        # Is block mein mypy jaanta hai value str hai
        return value.upper()
    else:
        # Is block mein mypy jaanta hai value int hai
        return str(value * 2)

# None checks se bhi narrowing hoti hai
def greet(name: str | None) -> str:
    if name is None:
        return "Hello!"
    # Yahan mypy jaanta hai name str hai (None nahi)
    return f"Hello, {name}!"

# Assert se bhi narrow kar sakte ho
def process_name(name: str | None) -> str:
    assert name is not None  # Now mypy sure hai name str hai
    return name.upper()
```

### Custom Type Guards (Advanced)

Python 3.10+ se, custom type guards bana sakte ho TypeScript ke type predicates jaisa:

```python
from typing import TypeGuard

def is_string_list(val: list[object]) -> TypeGuard[list[str]]:
    """Check karta hai agar list ke sare items strings hain."""
    return all(isinstance(x, str) for x in val)

def process(items: list[object]) -> None:
    if is_string_list(items):
        # Mypy sure hai items list[str] hai (har item string hai)
        for item in items:
            print(item.upper())  # String methods use kar sakte ho
```

```typescript
// TypeScript equivalent
function isStringArray(val: unknown[]): val is string[] {
  return val.every((x) => typeof x === "string");
}
```

---

## TypeScript se Key Differences — Side-by-Side

| Aspect | TypeScript | Python |
|---|---|---|
| Type enforcement | Compile-time pe `tsc` compulsory | Optional; `mypy` run karna zaruuri nahi |
| Runtime behavior | Types erase ho jaate hain | Type metadata runtime mein available hoti hai |
| Adoption model | Zaruri (`.ts` files) | Gradual (existing `.py` files mein add kar sakte ho) |
| Generics syntax | `function f<T>(x: T): T` | `def f(x: T) -> T:` with TypeVar |
| Interfaces | `interface Foo { ... }` | `Protocol` or `TypedDict` |
| Enums | `enum Color { Red }` | `class Color(Enum)` |
| Type narrowing | `typeof`, `instanceof`, type predicates | `isinstance()`, `TypeGuard` |
| Null handling | `null`, `undefined` + optional `?:` | Sirf `None`, use `Optional[X]` |

---

## Practice Exercises — Apne Hath Se Likho

### Exercise 1: Bare Code Ko Type Annotate Karo

Neeche diya code likha hai bina type hints. Sab parameters, return types, aur variables ko type hints do:

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

### Exercise 2: Type Errors Identify aur Fix Karo

Neeche mypy jo errors pakda sakta hai, unhe identify karo aur fix karo:

```python
def get_name(user: dict[str, str]) -> str:
    return user.get("name")  # Isko samajho — kya galat hai?

def double(x: int) -> int:
    return str(x * 2)  # Yeh kya problem hai?

def first_or_default(items: list[int], default: str = "none") -> int:
    if items:
        return items[0]
    return default  # Isse kya issue hoga?
```

### Exercise 3: Collection Types Ke Saath Functions

Typed functions likho in 3 scenarios ke liye:

1. Function jo list le (har item ek dict ho with "name" aur "age") aur 18+ wale logon ke naam return kare.
2. Function jo string keys + float values wali dict le, aur average values wali nyi dict return kare.
3. Function jo success pe `(str, int)` tuple return kare, failure pe `None`.

### Exercise 4: Typed Configuration System Banao

Ek proper configuration system design karo:
- Type aliases define karo: `Port` (int), `Host` (str), `Headers` (dict[str, str])
- `ServerConfig` TypedDict banao with: host, port, debug (bool), optional headers
- `load_config` function likho jo file path string le aur `ServerConfig` return kare
- `merge_configs` function likho jo base config aur partial overrides le aur merged config return kare

### Exercise 5: mypy --strict Mein Pass Karo

Ek Python file banao jisme:
- Constants ke liye `Final` use ho
- `Sequence` accept karne wale function ho (ki list/tuple dono chalein)
- `isinstance()` se proper type narrowing wala union type ho
- Optional return values with proper `Optional[X]` annotation
- Phir `mypy --strict` chalao aur jo errors aayein, fix karo

