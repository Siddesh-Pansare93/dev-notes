# Dataclasses

> Python dataclasses for Node.js/TypeScript developers

---

## What Are Dataclasses?

The `@dataclass` decorator auto-generates `__init__`, `__repr__`, `__eq__`, and more from class field annotations. It eliminates massive amounts of boilerplate for data-holding classes.

Think of it as: **what if TypeScript interfaces could auto-generate a constructor, toString(), and equality checks?**

```python
from dataclasses import dataclass


# WITHOUT dataclass - lots of boilerplate
class UserManual:
    def __init__(self, name: str, email: str, age: int):
        self.name = name
        self.email = email
        self.age = age

    def __repr__(self) -> str:
        return f"UserManual(name='{self.name}', email='{self.email}', age={self.age})"

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, UserManual):
            return NotImplemented
        return (self.name, self.email, self.age) == (other.name, other.email, other.age)


# WITH dataclass - all that boilerplate is generated for you
@dataclass
class User:
    name: str
    email: str
    age: int


# Auto-generated __init__
user = User(name="Alice", email="alice@example.com", age=30)

# Auto-generated __repr__
print(user)  # User(name='Alice', email='alice@example.com', age=30)

# Auto-generated __eq__
user2 = User(name="Alice", email="alice@example.com", age=30)
print(user == user2)  # True (compares all fields)
```

```typescript
// TypeScript - you ALWAYS write this boilerplate
class User {
  constructor(
    public name: string,
    public email: string,
    public age: number
  ) {}

  // No auto toString() or equals()
  // You'd need to write them manually
}

// Or with an interface (no constructor at all):
interface User {
  name: string;
  email: string;
  age: number;
}
```

---

## Field Types and Defaults

```python
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class BlogPost:
    # Required fields (no default) - must come first
    title: str
    author: str
    content: str

    # Fields with simple defaults
    published: bool = False
    views: int = 0
    category: str = "general"

    # Fields with mutable defaults MUST use field(default_factory=...)
    # This is the same gotcha as class variables - shared mutable state
    tags: list[str] = field(default_factory=list)
    metadata: dict[str, str] = field(default_factory=dict)

    # Factory for computed defaults
    created_at: datetime = field(default_factory=datetime.now)


# Use it
post = BlogPost(
    title="Python Dataclasses Guide",
    author="Alice",
    content="Dataclasses are awesome...",
    tags=["python", "tutorial"],
)

print(post)
# BlogPost(title='Python Dataclasses Guide', author='Alice', ...)

# Each instance gets its own list (thanks to default_factory)
post2 = BlogPost(title="Another Post", author="Bob", content="...")
post2.tags.append("draft")
print(post.tags)   # ['python', 'tutorial'] - not affected
print(post2.tags)  # ['draft']
```

### The `field()` Function

`field()` gives you fine-grained control over individual fields:

```python
from dataclasses import dataclass, field


@dataclass
class APIRequest:
    # Normal fields
    method: str
    url: str
    body: dict = field(default_factory=dict)

    # Exclude from __repr__ (sensitive data)
    auth_token: str = field(default="", repr=False)

    # Exclude from __init__ (computed later)
    request_id: str = field(init=False, default="")

    # Exclude from comparison
    timestamp: float = field(default=0.0, compare=False)

    # Store arbitrary metadata
    headers: dict = field(
        default_factory=lambda: {"Content-Type": "application/json"},
        metadata={"description": "HTTP headers"},
    )


req = APIRequest(
    method="POST",
    url="/api/users",
    body={"name": "Alice"},
    auth_token="Bearer sk_secret",
)

print(req)
# APIRequest(method='POST', url='/api/users', body={'name': 'Alice'},
#            request_id='', timestamp=0.0, headers={'Content-Type': 'application/json'})
# Note: auth_token is NOT shown (repr=False)
```

| `field()` parameter | Purpose | Default |
|---------------------|---------|---------|
| `default` | Default value (immutable only) | MISSING |
| `default_factory` | Callable that returns default (for mutable) | MISSING |
| `init` | Include in `__init__`? | `True` |
| `repr` | Include in `__repr__`? | `True` |
| `compare` | Include in `__eq__` and ordering? | `True` |
| `hash` | Include in `__hash__`? | `None` (follows `compare`) |
| `metadata` | Arbitrary metadata dict | `None` |

---

## `frozen=True` - Immutable Instances

Like TypeScript's `Readonly<T>` or adding `readonly` to every field, `frozen=True` makes the dataclass immutable after creation.

```python
from dataclasses import dataclass


@dataclass(frozen=True)
class Point:
    x: float
    y: float


@dataclass(frozen=True)
class Color:
    r: int
    g: int
    b: int
    a: float = 1.0


p = Point(3.0, 4.0)
print(p)  # Point(x=3.0, y=4.0)

# Cannot modify!
# p.x = 5.0  # FrozenInstanceError!

# Frozen dataclasses are automatically hashable (can be used in sets/dicts)
points = {Point(0, 0), Point(1, 1), Point(0, 0)}
print(len(points))  # 2 (deduplicated)

colors = {
    Color(255, 0, 0): "red",
    Color(0, 255, 0): "green",
    Color(0, 0, 255): "blue",
}
print(colors[Color(255, 0, 0)])  # "red"
```

```typescript
// TypeScript equivalent
interface Point {
  readonly x: number;
  readonly y: number;
}

// Or using Readonly utility type
type Point = Readonly<{
  x: number;
  y: number;
}>;

// But TypeScript readonly is compile-time only!
// At runtime you can still mutate in JavaScript
```

### Creating Modified Copies of Frozen Dataclasses

Since you cannot mutate frozen instances, use `dataclasses.replace()` to create a new copy with some fields changed:

```python
from dataclasses import dataclass, replace


@dataclass(frozen=True)
class Config:
    host: str
    port: int
    debug: bool = False
    log_level: str = "INFO"


prod_config = Config(host="api.example.com", port=443)
dev_config = replace(prod_config, debug=True, log_level="DEBUG", port=8080)

print(prod_config)  # Config(host='api.example.com', port=443, debug=False, log_level='INFO')
print(dev_config)   # Config(host='api.example.com', port=8080, debug=True, log_level='DEBUG')
```

This is similar to the spread operator pattern in TypeScript:

```typescript
const prodConfig = { host: "api.example.com", port: 443, debug: false };
const devConfig = { ...prodConfig, debug: true, port: 8080 };
```

---

## `__post_init__` - Computed Fields and Validation

`__post_init__` runs after the auto-generated `__init__`. Use it for validation, computed fields, or any initialization logic.

```python
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class Invoice:
    customer_name: str
    items: list[dict]  # [{"name": "Widget", "price": 9.99, "qty": 2}]
    tax_rate: float = 0.08

    # Computed fields - excluded from __init__
    subtotal: float = field(init=False)
    tax: float = field(init=False)
    total: float = field(init=False)
    invoice_number: str = field(init=False)

    def __post_init__(self):
        """Runs after __init__ - compute derived values."""
        # Validate
        if not self.items:
            raise ValueError("Invoice must have at least one item")
        if self.tax_rate < 0 or self.tax_rate > 1:
            raise ValueError(f"Invalid tax rate: {self.tax_rate}")

        # Compute derived fields
        self.subtotal = sum(
            item["price"] * item["qty"] for item in self.items
        )
        self.tax = round(self.subtotal * self.tax_rate, 2)
        self.total = round(self.subtotal + self.tax, 2)

        # Generate invoice number
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        self.invoice_number = f"INV-{timestamp}"


invoice = Invoice(
    customer_name="Acme Corp",
    items=[
        {"name": "Widget", "price": 9.99, "qty": 10},
        {"name": "Gadget", "price": 24.99, "qty": 3},
    ],
)

print(invoice.subtotal)       # 174.87
print(invoice.tax)            # 13.99
print(invoice.total)          # 188.86
print(invoice.invoice_number) # INV-20240115103045
```

### Using `InitVar` for Init-Only Fields

Sometimes you need a parameter in `__init__` that should NOT become a field:

```python
from dataclasses import dataclass, field, InitVar


@dataclass
class DatabaseConnection:
    host: str
    port: int
    database: str

    # InitVar: passed to __init__ and __post_init__, but NOT stored as a field
    password: InitVar[str] = ""

    connection_string: str = field(init=False)
    is_connected: bool = field(init=False, default=False)

    def __post_init__(self, password: str):
        """password is received here but NOT stored as self.password."""
        if password:
            self.connection_string = (
                f"postgresql://{self.host}:{self.port}/{self.database}?password=***"
            )
        else:
            self.connection_string = (
                f"postgresql://{self.host}:{self.port}/{self.database}"
            )


db = DatabaseConnection("localhost", 5432, "myapp", password="secret123")
print(db.connection_string)  # postgresql://localhost:5432/myapp?password=***
print(db)  # DatabaseConnection(host='localhost', port=5432, database='myapp', ...)
# Note: password is NOT in the output - it's not a field
# hasattr(db, 'password')  # False
```

---

## Inheritance with Dataclasses

Dataclasses support inheritance. Child classes extend parent fields.

```python
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class BaseModel:
    """Base for all models - provides common fields."""
    id: str = ""
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)

    def touch(self):
        self.updated_at = datetime.now()


@dataclass
class User(BaseModel):
    """User model inherits id, created_at, updated_at."""
    name: str = ""
    email: str = ""
    role: str = "user"


@dataclass
class Product(BaseModel):
    name: str = ""
    price: float = 0.0
    category: str = "general"
    in_stock: bool = True


user = User(id="u1", name="Alice", email="alice@example.com", role="admin")
print(user)
# User(id='u1', created_at=datetime.datetime(...), updated_at=datetime.datetime(...),
#      name='Alice', email='alice@example.com', role='admin')

product = Product(id="p1", name="Widget", price=9.99)
print(product)
# Product(id='p1', created_at=..., updated_at=..., name='Widget', price=9.99, ...)
```

**Important ordering rule**: In dataclass inheritance, parent fields come first in `__init__`. If the parent has fields with defaults, the child cannot have required fields (no default), because you cannot have a required parameter after an optional one.

```python
# This WORKS - parent has defaults, child has defaults too
@dataclass
class Base:
    id: str = ""

@dataclass
class Child(Base):
    name: str = ""  # has default - OK


# This FAILS - parent has default, child has no default
@dataclass
class Base:
    id: str = ""

# @dataclass
# class Child(Base):
#     name: str  # NO default - TypeError! (comes after id which has a default)
```

---

## Dataclass vs Pydantic BaseModel

Pydantic is a third-party library that provides runtime validation. Here is a quick comparison:

```python
# Standard dataclass - no runtime validation
from dataclasses import dataclass

@dataclass
class UserDC:
    name: str
    age: int
    email: str

# This "works" - no validation!
bad_user = UserDC(name=123, age="not a number", email=None)
print(bad_user.name)  # 123 (should be str but Python doesn't care)


# Pydantic BaseModel - runtime validation and coercion
from pydantic import BaseModel, EmailStr, field_validator

class UserPydantic(BaseModel):
    name: str
    age: int
    email: str  # use EmailStr for actual email validation

    @field_validator("age")
    @classmethod
    def age_must_be_positive(cls, v):
        if v < 0 or v > 150:
            raise ValueError("Age must be between 0 and 150")
        return v


# Pydantic validates and coerces types
user = UserPydantic(name="Alice", age="30", email="alice@example.com")
print(user.age)   # 30 (int - coerced from string!)
print(type(user.age))  # <class 'int'>

# Pydantic rejects invalid data
# UserPydantic(name="Alice", age="not a number", email="alice@example.com")
# ValidationError: value is not a valid integer
```

| Feature | `@dataclass` | Pydantic `BaseModel` |
|---------|-------------|---------------------|
| Runtime validation | No | **Yes** |
| Type coercion | No | **Yes** (`"30"` -> `30`) |
| JSON serialization | Manual | **Built-in** (`.model_dump_json()`) |
| JSON deserialization | Manual | **Built-in** (`Model.model_validate_json()`) |
| Performance | Faster (no validation) | Slower (validates everything) |
| Dependencies | Standard library | Third-party (`pip install pydantic`) |
| Use case | Internal data structures | API input/output, config, serialization |

**Rule of thumb**: Use `@dataclass` for internal data. Use Pydantic for anything that crosses a boundary (API requests, config files, external data).

---

## `slots=True` for Memory Optimization

Python 3.10+ supports `slots=True`, which uses `__slots__` instead of `__dict__` for attribute storage. This saves memory and is slightly faster for attribute access.

```python
from dataclasses import dataclass
import sys


@dataclass
class UserWithDict:
    """Normal dataclass - uses __dict__ for storage."""
    name: str
    email: str
    age: int


@dataclass(slots=True)
class UserWithSlots:
    """Optimized dataclass - uses __slots__ for storage."""
    name: str
    email: str
    age: int


u1 = UserWithDict("Alice", "alice@example.com", 30)
u2 = UserWithSlots("Alice", "alice@example.com", 30)

print(sys.getsizeof(u1.__dict__))  # ~232 bytes (dict overhead)
# u2 has no __dict__ - attributes stored more efficiently

# Cannot add arbitrary attributes to slotted dataclass
u1.nickname = "Ali"   # Works fine (dynamic attributes)
# u2.nickname = "Ali" # AttributeError: 'UserWithSlots' has no attribute 'nickname'
```

Use `slots=True` when:
- Creating many instances (thousands+) and memory matters
- You do not need to add dynamic attributes after creation
- You want slightly faster attribute access

---

## Complete Example: Building an Event System

```python
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any
from enum import Enum


class EventPriority(Enum):
    LOW = 0
    NORMAL = 1
    HIGH = 2
    CRITICAL = 3


@dataclass(frozen=True)
class Event:
    """Immutable event - once created, cannot be modified."""
    type: str
    source: str
    data: dict = field(default_factory=dict)
    priority: EventPriority = EventPriority.NORMAL
    timestamp: datetime = field(default_factory=datetime.now)
    event_id: str = field(default="")

    def __post_init__(self):
        if not self.event_id:
            # For frozen dataclasses, use object.__setattr__
            import uuid
            object.__setattr__(self, "event_id", str(uuid.uuid4())[:8])


@dataclass
class EventLog:
    """Mutable event log - accumulates events."""
    name: str
    max_size: int = 1000
    events: list[Event] = field(default_factory=list, repr=False)

    @property
    def size(self) -> int:
        return len(self.events)

    @property
    def is_full(self) -> bool:
        return self.size >= self.max_size

    def add(self, event: Event) -> None:
        if self.is_full:
            self.events.pop(0)  # remove oldest
        self.events.append(event)

    def filter_by_type(self, event_type: str) -> list[Event]:
        return [e for e in self.events if e.type == event_type]

    def filter_by_priority(self, min_priority: EventPriority) -> list[Event]:
        return [e for e in self.events if e.priority.value >= min_priority.value]

    def get_latest(self, n: int = 10) -> list[Event]:
        return self.events[-n:]


# Usage
log = EventLog("application", max_size=100)

log.add(Event(type="user.login", source="auth-service", data={"user_id": "u1"}))
log.add(Event(
    type="order.created",
    source="order-service",
    data={"order_id": "o1", "amount": 99.99},
    priority=EventPriority.HIGH,
))
log.add(Event(
    type="system.error",
    source="api-gateway",
    data={"error": "timeout"},
    priority=EventPriority.CRITICAL,
))

print(log)  # EventLog(name='application', max_size=100)
print(f"Events: {log.size}")  # Events: 3

for event in log.filter_by_priority(EventPriority.HIGH):
    print(f"  [{event.priority.name}] {event.type}: {event.data}")
# [HIGH] order.created: {'order_id': 'o1', 'amount': 99.99}
# [CRITICAL] system.error: {'error': 'timeout'}
```

---

## Dataclass Options Summary

```python
@dataclass(
    init=True,         # Generate __init__? (default: True)
    repr=True,         # Generate __repr__? (default: True)
    eq=True,           # Generate __eq__? (default: True)
    order=False,       # Generate __lt__, __le__, __gt__, __ge__? (default: False)
    unsafe_hash=False, # Force __hash__ generation? (default: False)
    frozen=False,      # Make immutable? (default: False)
    match_args=True,   # Generate __match_args__ for pattern matching? (3.10+)
    kw_only=False,     # All fields keyword-only? (3.10+)
    slots=False,       # Use __slots__? (3.10+)
)
class MyClass:
    ...
```

---

## Practice Exercises

### Exercise 1: REST API Models

Create dataclasses for a REST API:

```python
@dataclass
class PaginationParams:
    page: int = 1
    per_page: int = 25
    sort_by: str = "created_at"
    sort_order: str = "desc"  # validate in __post_init__

@dataclass
class APIResponse:
    status: int
    data: Any
    pagination: PaginationParams | None = None
    errors: list[str] = field(default_factory=list)
    # Add a computed 'success' property
```

Add validation in `__post_init__`, `@property` for computed fields, and a `to_dict()` method.

### Exercise 2: Configuration System

Build a layered configuration system using frozen dataclasses:

```python
@dataclass(frozen=True)
class DatabaseConfig:
    host: str
    port: int
    name: str
    # ... more fields

@dataclass(frozen=True)
class ServerConfig:
    host: str
    port: int
    debug: bool
    # ... more fields

@dataclass(frozen=True)
class AppConfig:
    database: DatabaseConfig
    server: ServerConfig
    # Add classmethod factories: from_env(), from_dict(), for_testing()
```

Use `dataclasses.replace()` to create modified copies.

### Exercise 3: Shopping Cart (Dataclass Version)

Rewrite the `ShoppingCart` from the classes basics exercise using dataclasses:

```python
@dataclass(frozen=True)
class CartItem:
    product_id: str
    name: str
    price: float
    quantity: int = 1
    # computed total in __post_init__

@dataclass
class ShoppingCart:
    items: list[CartItem] = field(default_factory=list)
    # Add methods: add_item, remove_item, total, item_count
    # Add __len__, __contains__, __iter__
```

### Exercise 4: Compare Boilerplate

Write the SAME data model in three ways and count the lines:
1. Plain Python class (manual `__init__`, `__repr__`, `__eq__`)
2. Python `@dataclass`
3. TypeScript `class`

The model: `Employee` with fields `id`, `name`, `department`, `salary`, `hire_date`, `is_active`, `skills` (list), `manager_id` (optional).

---

## Key Takeaways for Node.js Developers

1. **`@dataclass` eliminates boilerplate** - auto-generates `__init__`, `__repr__`, `__eq__` (Python's biggest quality-of-life win)
2. **Use `field(default_factory=list)`** for mutable defaults - never `field = []`
3. **`frozen=True`** = `Readonly<T>` in TypeScript, but enforced at runtime
4. **`__post_init__`** for validation and computed fields - runs after `__init__`
5. **`dataclasses.replace()`** = spread operator `{...obj, field: newValue}`
6. **`slots=True`** (Python 3.10+) for memory optimization with many instances
7. **Use dataclass for internal data**, Pydantic for external data (APIs, config files)
8. **Inheritance works** but watch the field ordering rule (defaults must come after non-defaults)
