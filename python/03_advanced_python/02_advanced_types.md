# Advanced Types in Python

## Beyond Basic Type Hints

This chapter covers Python's advanced typing features. If you've used TypeScript's interfaces, generics, mapped types, and utility types, you'll find direct parallels here -- though the syntax and some behaviors differ.

---

## TypedDict: Typed Dictionaries

TypedDict gives you TypeScript-interface-like typing for dictionaries. In Python, plain dicts are often used where TS would use an interface/type.

```python
from typing import TypedDict, NotRequired

# Python TypedDict
class User(TypedDict):
    name: str
    age: int
    email: str

# Usage
user: User = {
    "name": "Alice",
    "age": 30,
    "email": "alice@example.com",
}

# mypy catches missing or wrong keys
bad_user: User = {"name": "Bob"}  # Error: missing keys 'age', 'email'
user["name"] = 42                  # Error: expected str
```

```typescript
// TypeScript equivalent
interface User {
  name: string;
  age: number;
  email: string;
}
```

### Optional Keys

```python
from typing import TypedDict, NotRequired, Required

# All keys required by default
class Config(TypedDict):
    host: str
    port: int
    debug: NotRequired[bool]       # Optional key (Python 3.11+)
    timeout: NotRequired[float]

# Or make all keys optional by default
class PartialConfig(TypedDict, total=False):
    host: str       # all keys are now optional
    port: int
    debug: bool

# Mix required and optional with total=False
class MixedConfig(TypedDict, total=False):
    host: Required[str]   # This one IS required
    port: int              # Optional (because total=False)
    debug: bool            # Optional
```

```typescript
// TypeScript equivalents
interface Config {
  host: string;
  port: number;
  debug?: boolean;
  timeout?: number;
}

type PartialConfig = Partial<Config>;

interface MixedConfig {
  host: string;       // required
  port?: number;
  debug?: boolean;
}
```

### Inheritance

```python
class BaseUser(TypedDict):
    name: str
    email: str

class AdminUser(BaseUser):
    role: str
    permissions: list[str]

# AdminUser has: name, email, role, permissions
admin: AdminUser = {
    "name": "Alice",
    "email": "alice@example.com",
    "role": "admin",
    "permissions": ["read", "write", "delete"],
}
```

### TypedDict vs dataclass

| Feature | TypedDict | dataclass |
|---|---|---|
| Underlying type | dict | class instance |
| Access syntax | `d["key"]` | `d.key` |
| JSON-friendly | Yes (it IS a dict) | No (need to serialize) |
| Mutability | Mutable | Configurable |
| Methods | No | Yes |
| Use case | API responses, configs | Domain objects |

```python
# TypedDict -- for dict-shaped data (JSON, API responses)
class ApiResponse(TypedDict):
    status: int
    data: list[dict[str, str]]

# dataclass -- for objects with behavior
from dataclasses import dataclass

@dataclass
class User:
    name: str
    age: int

    def is_adult(self) -> bool:
        return self.age >= 18
```

---

## Protocol: Structural Subtyping (Duck Typing with Types)

Protocol is Python's equivalent of TypeScript interfaces for structural typing. It says "anything that has these methods/attributes works" -- without requiring inheritance.

```python
from typing import Protocol

class Drawable(Protocol):
    def draw(self) -> None: ...

class Resizable(Protocol):
    width: int
    height: int
    def resize(self, w: int, h: int) -> None: ...

# No need to explicitly implement or inherit!
class Circle:
    def draw(self) -> None:
        print("Drawing circle")

class Square:
    def __init__(self) -> None:
        self.width = 10
        self.height = 10

    def draw(self) -> None:
        print("Drawing square")

    def resize(self, w: int, h: int) -> None:
        self.width = w
        self.height = h

# Circle satisfies Drawable (has draw method)
# Square satisfies both Drawable and Resizable
def render(shape: Drawable) -> None:
    shape.draw()  # mypy is happy

render(Circle())  # Works
render(Square())  # Works
```

```typescript
// TypeScript equivalent -- interfaces are structural by default
interface Drawable {
  draw(): void;
}

interface Resizable {
  width: number;
  height: number;
  resize(w: number, h: number): void;
}

class Circle {
  draw(): void {
    console.log("Drawing circle");
  }
}

// Works because TS is structurally typed
function render(shape: Drawable): void {
  shape.draw();
}
render(new Circle()); // Fine -- no explicit 'implements' needed
```

### Runtime Checkable Protocols

```python
from typing import Protocol, runtime_checkable

@runtime_checkable
class Printable(Protocol):
    def __str__(self) -> str: ...

# Now you can use isinstance checks
value = "hello"
if isinstance(value, Printable):
    print(str(value))
```

---

## Literal Types

Restrict values to specific literals, just like TypeScript's literal types:

```python
from typing import Literal

# Only these specific values are allowed
def set_status(status: Literal["active", "inactive", "pending"]) -> None:
    print(f"Status set to {status}")

set_status("active")    # OK
set_status("deleted")   # mypy error!

# Works with numbers and bools too
Mode = Literal[1, 2, 3]
def set_mode(mode: Mode) -> None: ...

# Combine with Union
def open_file(path: str, mode: Literal["r", "w", "a", "rb", "wb"]) -> None: ...
```

```typescript
// TypeScript equivalent
type Status = "active" | "inactive" | "pending";
function setStatus(status: Status): void { ... }

type Mode = 1 | 2 | 3;
```

### LiteralString (Python 3.11+)

```python
from typing import LiteralString

# Prevents SQL injection at the type level
def execute_query(query: LiteralString) -> None:
    ...

execute_query("SELECT * FROM users")           # OK - literal string
user_input = input("Enter query: ")
execute_query(user_input)                        # mypy error! Not a literal
execute_query(f"SELECT * FROM {user_input}")     # mypy error! f-string with non-literal
```

---

## TypeVar: Generics

TypeVar is how Python does generics. The concept is identical to TypeScript's `<T>`, but the syntax is different.

### Basic Generic Functions

```python
from typing import TypeVar

T = TypeVar("T")

def first(items: list[T]) -> T:
    return items[0]

# mypy infers the return type
name = first(["alice", "bob"])     # inferred as str
number = first([1, 2, 3])          # inferred as int
```

```typescript
// TypeScript equivalent
function first<T>(items: T[]): T {
  return items[0];
}
```

### New Syntax (Python 3.12+)

Python 3.12 introduced a cleaner syntax that looks more like TypeScript:

```python
# Python 3.12+ -- much cleaner!
def first[T](items: list[T]) -> T:
    return items[0]

def pair[T, U](a: T, b: U) -> tuple[T, U]:
    return (a, b)
```

### Bounded TypeVars

```python
# Old syntax
from typing import TypeVar

T = TypeVar("T", bound=int)  # T must be int or a subclass

def double(x: T) -> T:
    return x * 2

# Python 3.12+ syntax
def double[T: int](x: T) -> T:
    return x * 2

# Constrained to specific types
T = TypeVar("T", str, bytes)  # T must be exactly str or bytes

def concat(a: T, b: T) -> T:
    return a + b
```

```typescript
// TypeScript equivalent
function double<T extends number>(x: T): T {
  return (x * 2) as T;
}
```

### Generic Classes

```python
from typing import TypeVar, Generic

T = TypeVar("T")

class Stack(Generic[T]):
    def __init__(self) -> None:
        self._items: list[T] = []

    def push(self, item: T) -> None:
        self._items.append(item)

    def pop(self) -> T:
        if not self._items:
            raise IndexError("Stack is empty")
        return self._items.pop()

    def peek(self) -> T | None:
        return self._items[-1] if self._items else None

# Usage with type inference
int_stack: Stack[int] = Stack()
int_stack.push(1)
int_stack.push(2)
value = int_stack.pop()  # inferred as int

str_stack: Stack[str] = Stack()
str_stack.push("hello")

# Python 3.12+ syntax
class Stack[T]:
    def __init__(self) -> None:
        self._items: list[T] = []
    ...
```

```typescript
// TypeScript equivalent
class Stack<T> {
  private items: T[] = [];

  push(item: T): void {
    this.items.push(item);
  }

  pop(): T {
    const item = this.items.pop();
    if (item === undefined) throw new Error("Stack is empty");
    return item;
  }
}
```

---

## ParamSpec: Typing Decorators

ParamSpec captures the parameter types of a function, which is essential for typing decorators that preserve the original function's signature.

```python
from typing import ParamSpec, TypeVar, Callable
import functools
import time

P = ParamSpec("P")
R = TypeVar("R")

def timer(func: Callable[P, R]) -> Callable[P, R]:
    @functools.wraps(func)
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        start = time.time()
        result = func(*args, **kwargs)
        elapsed = time.time() - start
        print(f"{func.__name__} took {elapsed:.4f}s")
        return result
    return wrapper

@timer
def greet(name: str, excited: bool = False) -> str:
    return f"Hello, {name}{'!!!' if excited else ''}"

# mypy knows: greet(name: str, excited: bool = False) -> str
result = greet("Alice", excited=True)
```

```python
# Python 3.12+ syntax
def timer[**P, R](func: Callable[P, R]) -> Callable[P, R]:
    @functools.wraps(func)
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        start = time.time()
        result = func(*args, **kwargs)
        print(f"{func.__name__} took {time.time() - start:.4f}s")
        return result
    return wrapper
```

---

## Callable Type

Type hint for function parameters that accept other functions:

```python
from typing import Callable

# Basic callable: (int, int) -> int
def apply(func: Callable[[int, int], int], a: int, b: int) -> int:
    return func(a, b)

result = apply(lambda x, y: x + y, 3, 4)

# Callable with no arguments
Callback = Callable[[], None]

def on_complete(callback: Callback) -> None:
    callback()

# Callable that takes any arguments
from typing import Any
AnyFunc = Callable[..., Any]  # ... means any args

def register(handler: AnyFunc) -> None:
    ...
```

```typescript
// TypeScript equivalents
function apply(func: (a: number, b: number) => number, a: number, b: number): number {
  return func(a, b);
}

type Callback = () => void;
type AnyFunc = (...args: any[]) => any;
```

---

## @overload Decorator

Define multiple signatures for the same function, just like TypeScript overloads:

```python
from typing import overload

@overload
def process(value: str) -> str: ...
@overload
def process(value: int) -> int: ...
@overload
def process(value: float) -> float: ...

def process(value: str | int | float) -> str | int | float:
    """The actual implementation."""
    if isinstance(value, str):
        return value.upper()
    elif isinstance(value, int):
        return value * 2
    else:
        return value * 2.0

# mypy knows the specific return type based on input
x = process("hello")  # inferred as str
y = process(42)        # inferred as int
z = process(3.14)      # inferred as float
```

```typescript
// TypeScript equivalent
function process(value: string): string;
function process(value: number): number;
function process(value: string | number): string | number {
  if (typeof value === "string") return value.toUpperCase();
  return value * 2;
}
```

### Overload with different return types based on arguments

```python
from typing import overload, Literal

@overload
def fetch_data(raw: Literal[True]) -> bytes: ...
@overload
def fetch_data(raw: Literal[False]) -> str: ...
@overload
def fetch_data(raw: bool = False) -> str | bytes: ...

def fetch_data(raw: bool = False) -> str | bytes:
    data = b"raw binary data"
    if raw:
        return data
    return data.decode("utf-8")
```

---

## TYPE_CHECKING for Import Cycles

When you have circular imports that only exist because of type hints, use `TYPE_CHECKING`:

```python
# models/user.py
from __future__ import annotations  # Makes all annotations strings (lazy evaluation)
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    # This import only runs when mypy checks the file,
    # NOT at runtime -- breaking the circular import
    from models.order import Order

class User:
    def __init__(self, name: str) -> None:
        self.name = name
        self.orders: list[Order] = []  # OK because of `from __future__`
```

```python
# models/order.py
from __future__ import annotations
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from models.user import User

class Order:
    def __init__(self, user: User, total: float) -> None:
        self.user = user
        self.total = total
```

```typescript
// In TypeScript, you'd use `import type` for this
import type { Order } from "./order";
// or
import { type Order } from "./order";
```

> **`from __future__ import annotations`** makes ALL annotations lazy (evaluated as strings). This is the default behavior starting in Python 3.13+.

---

## Putting It All Together: Real-World Example

```python
from __future__ import annotations
from typing import TypedDict, Protocol, Literal, TypeVar, overload
from dataclasses import dataclass

# TypedDict for API payloads
class CreateUserPayload(TypedDict):
    username: str
    email: str
    role: Literal["user", "admin", "moderator"]

# Protocol for repository pattern
class UserRepository(Protocol):
    def find_by_id(self, user_id: int) -> User | None: ...
    def find_by_email(self, email: str) -> User | None: ...
    def save(self, user: User) -> User: ...
    def delete(self, user_id: int) -> bool: ...

# Domain model
@dataclass
class User:
    id: int
    username: str
    email: str
    role: Literal["user", "admin", "moderator"]

    def has_permission(self, perm: str) -> bool:
        if self.role == "admin":
            return True
        return perm in ROLE_PERMISSIONS.get(self.role, set())

ROLE_PERMISSIONS: dict[str, set[str]] = {
    "user": {"read"},
    "moderator": {"read", "write", "moderate"},
    "admin": {"read", "write", "moderate", "admin"},
}

# Generic result type
T = TypeVar("T")

@dataclass
class Result(Generic[T]):
    success: bool
    data: T | None = None
    error: str | None = None

    @staticmethod
    def ok(data: T) -> Result[T]:
        return Result(success=True, data=data)

    @staticmethod
    def fail(error: str) -> Result[T]:
        return Result(success=False, error=error)

# Service with overloads
class UserService:
    def __init__(self, repo: UserRepository) -> None:
        self.repo = repo

    def create_user(self, payload: CreateUserPayload) -> Result[User]:
        existing = self.repo.find_by_email(payload["email"])
        if existing is not None:
            return Result.fail("Email already exists")

        user = User(
            id=0,
            username=payload["username"],
            email=payload["email"],
            role=payload["role"],
        )
        saved = self.repo.save(user)
        return Result.ok(saved)
```

---

## Practice Exercises

### Exercise 1: TypedDict API Models
Create TypedDict classes for a blog API:
- `BlogPost`: id (int), title (str), content (str), published (bool), tags (list of str), author_id (int)
- `CreatePostPayload`: title, content, tags (all required), published (optional, defaults concept)
- `UpdatePostPayload`: all fields optional (use `total=False`)
- Write a function `validate_post(data: dict[str, Any]) -> CreatePostPayload | None` that validates and returns typed data.

### Exercise 2: Protocols
Define a `Serializable` protocol with methods `to_json() -> str` and `from_json(data: str) -> Self`. Create two classes that satisfy this protocol without inheriting from it. Write a function that accepts any `Serializable`.

### Exercise 3: Generics
Build a generic `Cache[K, V]` class with:
- `get(key: K) -> V | None`
- `set(key: K, value: V) -> None`
- `delete(key: K) -> bool`
- `keys() -> list[K]`
- `values() -> list[V]`

### Exercise 4: Overloads
Write a `parse` function with overloads:
- `parse(data: str, as_type: Literal["json"]) -> dict`
- `parse(data: str, as_type: Literal["int"]) -> int`
- `parse(data: str, as_type: Literal["float"]) -> float`
- `parse(data: str, as_type: Literal["bool"]) -> bool`

### Exercise 5: Full Typed Module
Create a fully-typed module for a simple task manager:
- Use TypedDict for task data shapes
- Use Protocol for storage backends
- Use Literal for task status ("todo", "in_progress", "done")
- Use generics for a result wrapper
- Run `mypy --strict` and ensure zero errors
