# Advanced Types in Python

## Basic Type Hints Se Aage

Yeh chapter Python ke advanced typing features cover karta hai. Agar tumne TypeScript mein interfaces, generics, mapped types aur utility types use kiye hain, toh yahan tumhe seedha parallels milenge -- bas syntax aur kuch behavior thoda alag hai.

---

## TypedDict: Typed Dictionaries

TypedDict tumhe dictionaries ke liye TypeScript-interface jaisi typing deta hai. Python mein plain dicts wahan use hote hain jahan TS mein interface/type use hota.

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

# mypy missing ya galat keys pakad leta hai
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

Zomato ke order form ki tarah socho -- kuch fields (address, phone) compulsory hain, kuch (special instructions) optional. TypedDict mein bhi yehi karte hain.

```python
from typing import TypedDict, NotRequired, Required

# Default se saari keys required hoti hain
class Config(TypedDict):
    host: str
    port: int
    debug: NotRequired[bool]       # Optional key (Python 3.11+)
    timeout: NotRequired[float]

# Ya saari keys ko default optional bana do
class PartialConfig(TypedDict, total=False):
    host: str       # ab saari keys optional hain
    port: int
    debug: bool

# total=False ke saath required aur optional mix bhi kar sakte ho
class MixedConfig(TypedDict, total=False):
    host: Required[str]   # yeh wali REQUIRED hai
    port: int              # optional (kyunki total=False)
    debug: bool            # optional
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

# AdminUser mein hai: name, email, role, permissions
admin: AdminUser = {
    "name": "Alice",
    "email": "alice@example.com",
    "role": "admin",
    "permissions": ["read", "write", "delete"],
}
```

### TypedDict vs dataclass

> [!tip]
> Simple rule of thumb: agar data JSON se aaya hai ya JSON jaana hai (jaise API response), TypedDict use karo. Agar object mein behavior (methods) chahiye, dataclass use karo.

| Feature | TypedDict | dataclass |
|---|---|---|
| Underlying type | dict | class instance |
| Access syntax | `d["key"]` | `d.key` |
| JSON-friendly | Haan (yeh khud dict hi hai) | Nahi (serialize karna padega) |
| Mutability | Mutable | Configurable |
| Methods | Nahi | Haan |
| Use case | API responses, configs | Domain objects |

```python
# TypedDict -- dict-shaped data ke liye (JSON, API responses)
class ApiResponse(TypedDict):
    status: int
    data: list[dict[str, str]]

# dataclass -- behavior wale objects ke liye
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

Protocol Python ka TypeScript interfaces jaisa hi structural typing feature hai. Yeh bolta hai "jiske paas yeh methods/attributes hain, woh chalega" -- bina koi inheritance kiye.

Socho ek dabbawala ka system -- usse matlab nahi ki dabba kis company ka hai, bas dabba "carry-able" hona chahiye (uske paas handle hona chahiye). Waise hi Protocol object ke naam/class se matlab nahi rakhta, sirf shape (methods) se matlab rakhta hai.

```python
from typing import Protocol

class Drawable(Protocol):
    def draw(self) -> None: ...

class Resizable(Protocol):
    width: int
    height: int
    def resize(self, w: int, h: int) -> None: ...

# Explicitly implement ya inherit karne ki zarurat nahi!
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

# Circle, Drawable ko satisfy karta hai (draw method hai)
# Square, Drawable aur Resizable dono ko satisfy karta hai
def render(shape: Drawable) -> None:
    shape.draw()  # mypy khush hai

render(Circle())  # Chalega
render(Square())  # Chalega
```

```typescript
// TypeScript equivalent -- interfaces default se structural hote hain
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

// Chalega kyunki TS structurally typed hai
function render(shape: Drawable): void {
  shape.draw();
}
render(new Circle()); // Fine -- explicit 'implements' ki zarurat nahi
```

### Runtime Checkable Protocols

Normally Protocol sirf type-checking time pe kaam karta hai (mypy ke liye), runtime pe `isinstance` se check nahi ho sakta -- jab tak `@runtime_checkable` na lagao.

```python
from typing import Protocol, runtime_checkable

@runtime_checkable
class Printable(Protocol):
    def __str__(self) -> str: ...

# Ab isinstance checks bhi use kar sakte ho
value = "hello"
if isinstance(value, Printable):
    print(str(value))
```

---

## Literal Types

Values ko specific literals tak restrict karo -- bilkul TypeScript ke literal types jaisa:

```python
from typing import Literal

# Sirf yeh specific values allow hain
def set_status(status: Literal["active", "inactive", "pending"]) -> None:
    print(f"Status set to {status}")

set_status("active")    # OK
set_status("deleted")   # mypy error!

# Numbers aur bools ke saath bhi chalta hai
Mode = Literal[1, 2, 3]
def set_mode(mode: Mode) -> None: ...

# Union ke saath combine karo
def open_file(path: str, mode: Literal["r", "w", "a", "rb", "wb"]) -> None: ...
```

```typescript
// TypeScript equivalent
type Status = "active" | "inactive" | "pending";
function setStatus(status: Status): void { ... }

type Mode = 1 | 2 | 3;
```

### LiteralString (Python 3.11+)

> [!warning]
> Yeh SQL injection jaise bugs ko type-level pe hi pakad leta hai -- user input ko seedha query mein daalne se rokta hai.

```python
from typing import LiteralString

# SQL injection ko type level pe rok deta hai
def execute_query(query: LiteralString) -> None:
    ...

execute_query("SELECT * FROM users")           # OK - literal string
user_input = input("Enter query: ")
execute_query(user_input)                        # mypy error! Literal nahi hai
execute_query(f"SELECT * FROM {user_input}")     # mypy error! f-string with non-literal
```

---

## TypeVar: Generics

TypeVar Python ka generics implement karne ka tarika hai. Concept exactly TypeScript ke `<T>` jaisa hi hai, bas syntax alag hai.

### Basic Generic Functions

```python
from typing import TypeVar

T = TypeVar("T")

def first(items: list[T]) -> T:
    return items[0]

# mypy return type khud infer kar leta hai
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

Python 3.12 mein ek cleaner syntax aaya jo TypeScript jaisa hi dikhta hai:

```python
# Python 3.12+ -- kaafi clean!
def first[T](items: list[T]) -> T:
    return items[0]

def pair[T, U](a: T, b: U) -> tuple[T, U]:
    return (a, b)
```

### Bounded TypeVars

```python
# Old syntax
from typing import TypeVar

T = TypeVar("T", bound=int)  # T ko int ya uska subclass hona chahiye

def double(x: T) -> T:
    return x * 2

# Python 3.12+ syntax
def double[T: int](x: T) -> T:
    return x * 2

# Sirf specific types tak constrain karo
T = TypeVar("T", str, bytes)  # T exactly str ya bytes hi hona chahiye

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

Ek generic `Stack` class socho jo kisi bhi type ka data hold kar sake -- bilkul Flipkart ke cart jaisa jo products, wishlist items, ya coupons kuch bhi store kar sakta hai, bas type consistent honi chahiye.

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

# Type inference ke saath usage
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

ParamSpec kisi function ke parameter types ko "capture" karta hai -- yeh decorators ko type karne ke liye zaruri hai jo original function ka signature preserve karte hain.

Socho ek decorator ek "middleware" jaisa hai jo kisi bhi function ko wrap kar sakta hai -- bina uske parameters ka shape jaane bhi type-safety maintain karni hai. ParamSpec exactly yehi karta hai.

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

# mypy ko pata hai: greet(name: str, excited: bool = False) -> str
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

Function parameters ke liye type hint jo doosre functions accept karte hain:

```python
from typing import Callable

# Basic callable: (int, int) -> int
def apply(func: Callable[[int, int], int], a: int, b: int) -> int:
    return func(a, b)

result = apply(lambda x, y: x + y, 3, 4)

# Bina kisi argument wala callable
Callback = Callable[[], None]

def on_complete(callback: Callback) -> None:
    callback()

# Koi bhi arguments accept karne wala callable
from typing import Any
AnyFunc = Callable[..., Any]  # ... ka matlab hai koi bhi args

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

Ek hi function ke multiple signatures define karo -- bilkul TypeScript overloads jaisa:

```python
from typing import overload

@overload
def process(value: str) -> str: ...
@overload
def process(value: int) -> int: ...
@overload
def process(value: float) -> float: ...

def process(value: str | int | float) -> str | int | float:
    """Actual implementation."""
    if isinstance(value, str):
        return value.upper()
    elif isinstance(value, int):
        return value * 2
    else:
        return value * 2.0

# mypy ko input ke hisaab se specific return type pata hai
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

### Arguments ke hisaab se alag return type wala overload

Ek payment gateway socho jo `raw=True` pass karne pe raw bytes deta hai (jaise UPI QR image), aur `raw=False` pe readable string. Overload se yeh bhi type-safe likh sakte ho.

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

Jab tumhare paas circular imports ho jo sirf type hints ki wajah se exist karte hain, `TYPE_CHECKING` use karo.

Socho `User` aur `Order` ek doosre ko reference karte hain -- Zomato mein jaise ek User ke multiple Orders hain aur har Order ek User se linked hai. Agar dono files ek doosre ko normally import karein, circular import error aayega. `TYPE_CHECKING` isse bachata hai.

```python
# models/user.py
from __future__ import annotations  # Saare annotations ko strings bana deta hai (lazy evaluation)
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    # Yeh import sirf mypy check ke time chalta hai,
    # runtime pe NAHI -- isse circular import tootne se bach jaata hai
    from models.order import Order

class User:
    def __init__(self, name: str) -> None:
        self.name = name
        self.orders: list[Order] = []  # `from __future__` ki wajah se OK hai
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
// TypeScript mein iske liye `import type` use karte ho
import type { Order } from "./order";
// ya
import { type Order } from "./order";
```

> [!info]
> **`from __future__ import annotations`** saare annotations ko lazy bana deta hai (strings ki tarah evaluate hote hain). Python 3.13+ mein yeh default behavior ban jaayega.

---

## Sab Kuch Ek Saath: Real-World Example

```python
from __future__ import annotations
from typing import TypedDict, Protocol, Literal, TypeVar, overload
from dataclasses import dataclass

# API payloads ke liye TypedDict
class CreateUserPayload(TypedDict):
    username: str
    email: str
    role: Literal["user", "admin", "moderator"]

# Repository pattern ke liye Protocol
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

# Overloads wali service
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
Ek blog API ke liye TypedDict classes banao:
- `BlogPost`: id (int), title (str), content (str), published (bool), tags (list of str), author_id (int)
- `CreatePostPayload`: title, content, tags (sab required), published (optional, default concept)
- `UpdatePostPayload`: sab fields optional (`total=False` use karo)
- Ek function `validate_post(data: dict[str, Any]) -> CreatePostPayload | None` likho jo data validate karke typed data return kare.

### Exercise 2: Protocols
`to_json() -> str` aur `from_json(data: str) -> Self` methods wala ek `Serializable` protocol define karo. Do classes banao jo iss protocol ko satisfy karein bina inherit kiye. Ek function likho jo koi bhi `Serializable` accept kare.

### Exercise 3: Generics
Ek generic `Cache[K, V]` class banao jisme ho:
- `get(key: K) -> V | None`
- `set(key: K, value: V) -> None`
- `delete(key: K) -> bool`
- `keys() -> list[K]`
- `values() -> list[V]`

### Exercise 4: Overloads
Overloads ke saath ek `parse` function likho:
- `parse(data: str, as_type: Literal["json"]) -> dict`
- `parse(data: str, as_type: Literal["int"]) -> int`
- `parse(data: str, as_type: Literal["float"]) -> float`
- `parse(data: str, as_type: Literal["bool"]) -> bool`

### Exercise 5: Full Typed Module
Ek simple task manager ke liye fully-typed module banao:
- Task data shapes ke liye TypedDict use karo
- Storage backends ke liye Protocol use karo
- Task status ("todo", "in_progress", "done") ke liye Literal use karo
- Result wrapper ke liye generics use karo
- `mypy --strict` chala kar zero errors ensure karo

## Key Takeaways
- **TypedDict** dict-shaped data (JSON, API payloads) ke liye hai -- TS interface jaisa; **dataclass** behavior wale objects ke liye.
- **Protocol** structural typing deta hai -- bina inherit kiye bhi "shape match" hone pe kaam chal jaata hai, bilkul dabbawala system jaisa.
- **Literal** values ko fixed set tak restrict karta hai -- TS ke union of literals jaisa.
- **TypeVar / Generic[T]** Python ke generics hain; Python 3.12+ mein `def first[T](...)` jaisa cleaner syntax bhi mil gaya hai.
- **ParamSpec** decorators mein original function ka signature preserve karne ke liye zaruri hai.
- **@overload** ek function ke multiple type-safe signatures define karne deta hai.
- **TYPE_CHECKING** circular imports todta hai jab import sirf type hints ke liye chahiye ho.
