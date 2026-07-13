# Python Mein Advanced Types

## TypeScript Se Python Typing Tak

Arre, agar tu TypeScript mein `interfaces`, `generics`, mapped types aur utility types use kiya hai, toh Python mein bhi bilkul same concept hain. Bas syntax thoda alag hai, baaki thinking same hai.

---

## TypedDict: Typed Dictionaries

Socho TypeScript mein tum `interface` likhte ho data ka shape define karne ke liye. Python mein plain dicts ka use hota tha, lekin ab `TypedDict` se tu usse bhi typed bana sakta hai, bilkul interface jaisa.

```python
from typing import TypedDict, NotRequired

# TypedDict se dict ka shape define karo
class User(TypedDict):
    name: str
    age: int
    email: str

# Use karo
user: User = {
    "name": "Alice",
    "age": 30,
    "email": "alice@example.com",
}

# mypy missing ya galat keys pakad leta hai
bad_user: User = {"name": "Bob"}  # Error: 'age' aur 'email' missing hain
user["name"] = 42                  # Error: str expect kiya tha, int diya
```

```typescript
// TypeScript mein bilkul same concept
interface User {
  name: string;
  age: number;
  email: string;
}
```

### Optional Keys Ka Khel

Zomato ke order form socho -- kuch fields mandatory hain (address, phone number), kuch optional hain (special instructions, dietary preferences). TypedDict mein bhi yehi pattern use kar sakta hai.

```python
from typing import TypedDict, NotRequired, Required

# Default se saari keys required hoti hain
class Config(TypedDict):
    host: str
    port: int
    debug: NotRequired[bool]       # Optional key (Python 3.11+)
    timeout: NotRequired[float]

# Ya phir saari keys ko optional bana de
class PartialConfig(TypedDict, total=False):
    host: str       # ab saari keys optional hain
    port: int
    debug: bool

# Dono ko mix bhi kar sakte ho -- total=False + Required
class MixedConfig(TypedDict, total=False):
    host: Required[str]   # yeh zaruri hai
    port: int              # optional (total=False ke wajah se)
    debug: bool            # optional
```

```typescript
// TypeScript mein
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

# AdminUser mein automatically BaseUser ke fields bhi hain
admin: AdminUser = {
    "name": "Alice",
    "email": "alice@example.com",
    "role": "admin",
    "permissions": ["read", "write", "delete"],
}
```

### TypedDict Ya Dataclass?

> [!tip]
> Simple rule: agar data API se aaya hai ya JSON format mein hai (jaise API response), TypedDict use kar. Agar object mein logic/methods chahiye, toh dataclass use kar.

| Feature | TypedDict | dataclass |
|---|---|---|
| Underlying type | dict | class instance |
| Access syntax | `d["key"]` | `d.key` |
| JSON-friendly | Bilkul (khud dict hai) | Nahi (serialize karna padega) |
| Mutability | Mutable | Configurable |
| Methods | Nahi | Haan |
| Best for | API responses, configs | Domain objects, logic |

```python
# TypedDict -- JSON aur API responses ke liye
class ApiResponse(TypedDict):
    status: int
    data: list[dict[str, str]]

# dataclass -- agar behavior chahiye
from dataclasses import dataclass

@dataclass
class User:
    name: str
    age: int

    def is_adult(self) -> bool:
        return self.age >= 18
```

---

## Protocol: Structural Typing (Duck Typing Ko Typed Banao)

Protocol Python ka way hai TypeScript ke structural typing ko implement karne ka. Iska matlab "mujhe naam/class se matlab nahi, bass shape se" -- tere paas jo methods/attributes hain, woh important hai.

Socho dabbawalas ka system -- unhe matlab nahi ki dabba kis company/brand ka hai, bas duniya dekh le kya dabba "carry-able" hai (handle kar sakta hai kya). Waise hi Protocol isko bhi matlab nahi class ke naam se, sirf shape se -- "yeh object ke paas `draw()` method hai toh chalega, bas!"

```python
from typing import Protocol

class Drawable(Protocol):
    def draw(self) -> None: ...

class Resizable(Protocol):
    width: int
    height: int
    def resize(self, w: int, h: int) -> None: ...

# Inherits karne ya explicitly define karne ki zarurat nahi!
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
# Square, dono ko satisfy karta hai
def render(shape: Drawable) -> None:
    shape.draw()  # mypy khush hai

render(Circle())  # Bilkul chalega
render(Square())  # Bilkul chalega
```

```typescript
// TypeScript mein interfaces default se hi structural hote hain
interface Drawable {
  draw(): void;
}

class Circle {
  draw(): void {
    console.log("Drawing circle");
  }
}

function render(shape: Drawable): void {
  shape.draw();
}
render(new Circle()); // Fine -- inherit karne ki zarurat nahi
```

### Runtime Checkable Protocols

Normally Protocol sirf type-checking time (mypy) pe kaam karta hai, runtime pe `isinstance` check nahi kar sakta. Lekin agar `@runtime_checkable` laga de, toh runtime pe bhi check kar sakta hai.

```python
from typing import Protocol, runtime_checkable

@runtime_checkable
class Printable(Protocol):
    def __str__(self) -> str: ...

# Ab isinstance checks kaam karte hain
value = "hello"
if isinstance(value, Printable):
    print(str(value))
```

---

## Literal Types: Fixed Values

Kya sochta hai agar kisi parameter ko sirf specific values accept karni chahiye? TypeScript mein `Literal` hota hai -- Python mein bhi bilkul same.

```python
from typing import Literal

# Sirf yeh specific values allow hain
def set_status(status: Literal["active", "inactive", "pending"]) -> None:
    print(f"Status set to {status}")

set_status("active")    # OK
set_status("deleted")   # mypy error! Yeh allowed nahi hai

# Numbers aur bools ke saath bhi kaam karta hai
Mode = Literal[1, 2, 3]
def set_mode(mode: Mode) -> None: ...

# Union ke saath combine kar sakte ho
def open_file(path: str, mode: Literal["r", "w", "a", "rb", "wb"]) -> None: ...
```

```typescript
// TypeScript equivalent
type Status = "active" | "inactive" | "pending";
function setStatus(status: Status): void { ... }

type Mode = 1 | 2 | 3;
```

### LiteralString: SQL Injection Protection (Python 3.11+)

> [!warning]
> Yeh cheez SQL injection jaise bugs ko type-level pe hi pakad leta hai -- user input ko directly query mein daalne se tujhe compiler hi rok dega!

```python
from typing import LiteralString

# Sirf string literals accept karega, user input nahi
def execute_query(query: LiteralString) -> None:
    ...

execute_query("SELECT * FROM users")           # OK - literal string hai
user_input = input("Enter query: ")
execute_query(user_input)                        # mypy error! Literal nahi hai
execute_query(f"SELECT * FROM {user_input}")     # mypy error! Dynamic string hai
```

---

## TypeVar: Generics Ka Raaz

TypeVar Python ka generics implement karne ka tarika hai. Concept bilkul TypeScript ke `<T>` jaisa hai, sirf Python mein syntax thoda alag hai.

### Basic Generic Functions

```python
from typing import TypeVar

T = TypeVar("T")

def first(items: list[T]) -> T:
    return items[0]

# mypy return type khud infer kar leta hai
name = first(["alice", "bob"])     # automatically str
number = first([1, 2, 3])          # automatically int
```

```typescript
// TypeScript equivalent
function first<T>(items: T[]): T {
  return items[0];
}
```

### Cleaner Syntax (Python 3.12+)

Python 3.12 mein TypeScript jaisa clean syntax aaya:

```python
# Python 3.12+ -- kaafi cleaner!
def first[T](items: list[T]) -> T:
    return items[0]

def pair[T, U](a: T, b: U) -> tuple[T, U]:
    return (a, b)
```

### Bounded TypeVars: T Ko Constraint Karo

```python
# Purana syntax
from typing import TypeVar

T = TypeVar("T", bound=int)  # T ko int ya uska subclass hona chahiye

def double(x: T) -> T:
    return x * 2

# Python 3.12+ syntax
def double[T: int](x: T) -> T:
    return x * 2

# Sirf specific types tak limit kar
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

Flipkart ke shopping cart socho -- koi bhi type ka data (products, wishlist items, coupons) store kar sakta hai, bas type consistent honi chahiye. Waise hi generic classes.

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
            raise IndexError("Stack khali hai")
        return self._items.pop()

    def peek(self) -> T | None:
        return self._items[-1] if self._items else None

# Type inference ke saath use
int_stack: Stack[int] = Stack()
int_stack.push(1)
int_stack.push(2)
value = int_stack.pop()  # mypy ko pata hai yeh int hai

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

## ParamSpec: Decorators Ko Type Karo

ParamSpec kisi function ke parameters ko "capture" karta hai -- yeh decorator ko type karte wakt zaruri hai jab original function ka signature preserve karni ho.

Decorator ek middleware jaisa hai jo kisi bhi function ko wrap kar sakta hai. ParamSpec se tu type-safety maintain rakh sakta hai bina parameters ka shape jaane bhi.

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
        print(f"{func.__name__} ne {elapsed:.4f}s liya")
        return result
    return wrapper

@timer
def greet(name: str, excited: bool = False) -> str:
    return f"Hello, {name}{'!!!' if excited else ''}"

# mypy ko original signature pata hai: greet(name: str, excited: bool = False) -> str
result = greet("Alice", excited=True)
```

```python
# Python 3.12+ syntax
def timer[**P, R](func: Callable[P, R]) -> Callable[P, R]:
    @functools.wraps(func)
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        start = time.time()
        result = func(*args, **kwargs)
        print(f"{func.__name__} ne {time.time() - start:.4f}s liya")
        return result
    return wrapper
```

---

## Callable Type: Function Signatures

Jab function ko parameter mein doosra function pass karna ho, Callable use kar:

```python
from typing import Callable

# Basic: (int, int) -> int
def apply(func: Callable[[int, int], int], a: int, b: int) -> int:
    return func(a, b)

result = apply(lambda x, y: x + y, 3, 4)

# Bina arguments wala
Callback = Callable[[], None]

def on_complete(callback: Callback) -> None:
    callback()

# Koi bhi arguments accept kare
from typing import Any
AnyFunc = Callable[..., Any]  # ... = koi bhi args

def register(handler: AnyFunc) -> None:
    ...
```

```typescript
// TypeScript equivalent
function apply(func: (a: number, b: number) => number, a: number, b: number): number {
  return func(a, b);
}

type Callback = () => void;
type AnyFunc = (...args: any[]) => any;
```

---

## @overload: Multiple Signatures Ek Function Mein

Ek hi function ke liye multiple type signatures define kar -- TypeScript overloads jaisa.

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

# mypy input ke hisaab se output type infer karta hai
x = process("hello")  # str
y = process(42)        # int
z = process(3.14)      # float
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

### Argument Type Ke Hisaab Se Return Type

IRCTC booking socho -- agar tu `ticket_type="sleeper"` pass kare toh sleeper berth ka arrangement return hoga, agar `ticket_type="ac"` toh AC berth. Overload se yeh type-safe bana sakta hai.

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

## TYPE_CHECKING: Circular Imports Ko Toro

Jab circular imports sirf type hints ki wajah se exist karte hain, `TYPE_CHECKING` use kar.

Zomato scenario: `User` aur `Order` ek doosre ko reference karte hain -- ek user ke multiple orders hain aur order ka owner user hai. Agar dono files ek doosre ko directly import karein, circular import error aayega. `TYPE_CHECKING` se yeh issue solve ho jaata hai.

```python
# models/user.py
from __future__ import annotations  # Lazy evaluation -- annotations strings ban jaate hain
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    # Sirf mypy check mein chalta hai, runtime mein NAHI
    # Isse circular import toot jaati hai
    from models.order import Order

class User:
    def __init__(self, name: str) -> None:
        self.name = name
        self.orders: list[Order] = []  # `from __future__` se OK hai
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
// TypeScript mein `import type` use karte ho
import type { Order } from "./order";
// ya
import { type Order } from "./order";
```

> [!info]
> **`from __future__ import annotations`** saare annotations ko strings mein convert kar deta hai (lazy evaluation). Python 3.13+ mein yeh default behavior ban jaayega.

---

## Real-World: Sab Kuch Ek Saath

```python
from __future__ import annotations
from typing import TypedDict, Protocol, Literal, TypeVar, Generic, overload
from dataclasses import dataclass

# API payloads -- TypedDict se
class CreateUserPayload(TypedDict):
    username: str
    email: str
    role: Literal["user", "admin", "moderator"]

# Repository pattern -- Protocol se
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

# Generic result wrapper
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
Ek blog API ke liye TypedDict classes banao:
- `BlogPost`: id (int), title (str), content (str), published (bool), tags (list of str), author_id (int)
- `CreatePostPayload`: title, content, tags (sab required), published (optional)
- `UpdatePostPayload`: sab fields optional (`total=False` use kar)
- Ek function `validate_post(data: dict[str, Any]) -> CreatePostPayload | None` likho jo data validate kare.

### Exercise 2: Protocols
`to_json() -> str` aur `from_json(data: str) -> Self` methods wala ek `Serializable` protocol define kar. Do classes banao jo iss protocol ko satisfy karein bina inherit kiye. Ek function likho jo koi bhi `Serializable` accept kare.

### Exercise 3: Generics
Ek generic `Cache[K, V]` class banao:
- `get(key: K) -> V | None`
- `set(key: K, value: V) -> None`
- `delete(key: K) -> bool`
- `keys() -> list[K]`
- `values() -> list[V]`

### Exercise 4: Overloads
`parse` function likho overloads ke saath:
- `parse(data: str, as_type: Literal["json"]) -> dict`
- `parse(data: str, as_type: Literal["int"]) -> int`
- `parse(data: str, as_type: Literal["float"]) -> float`
- `parse(data: str, as_type: Literal["bool"]) -> bool`

### Exercise 5: Full Typed Module
Ek simple task manager ke liye fully-typed module banao:
- Task shapes ke liye TypedDict
- Storage backends ke liye Protocol
- Task status ke liye Literal ("todo", "in_progress", "done")
- Generic result wrapper
- `mypy --strict` run karke zero errors ensure kar

## Key Takeaways

- **TypedDict** dict-shaped data (JSON, API responses) ke liye -- TS interface jaisa. **dataclass** agar object mein behavior chahiye.
- **Protocol** structural typing deta hai -- bina inherit kiye "shape match" hone pe kaam chal jaata hai, dabbawalas system jaisa.
- **Literal** values ko fixed set tak restrict karta hai -- TS union of literals jaisa.
- **TypeVar / Generic[T]** Python ke generics hain. Python 3.12+ mein `def first[T](...)` jaisa cleaner syntax aaya.
- **ParamSpec** decorators mein original function ka signature preserve karne ke liye zaruri hai.
- **@overload** ek function ke multiple type-safe signatures define karta hai.
- **TYPE_CHECKING** circular imports todta hai jab import sirf type hints ke liye chahiye.
