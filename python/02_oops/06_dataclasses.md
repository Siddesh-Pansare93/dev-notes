# Dataclasses

> Python dataclasses — Node.js/TypeScript developers ke liye

---

## Dataclass Hai Kya?

`@dataclass` decorator ek magic wand hai — ye class ke field annotations dekh ke `__init__`, `__repr__`, `__eq__`, wagera khud-ba-khud bana deta hai. Matlab data-holding classes ke liye jo boilerplate tum baar-baar likhte ho, wo poora gayab.

Socho aisa: **agar TypeScript interfaces khud apna constructor, `toString()` aur equality check generate kar de tou?** Bas wahi cheez `@dataclass` karta hai.

```python
from dataclasses import dataclass


# WITHOUT dataclass - bohot saara boilerplate
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


# WITH dataclass - saara boilerplate auto-generate ho gaya
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
print(user == user2)  # True (saare fields compare hote hain)
```

```typescript
// TypeScript - ye boilerplate HAMESHA khud likhna padta hai
class User {
  constructor(
    public name: string,
    public email: string,
    public age: number
  ) {}

  // Auto toString() ya equals() nahi milega
  // Ye manually likhne padenge
}

// Ya interface ke saath (constructor hi nahi hota):
interface User {
  name: string;
  email: string;
  age: number;
}
```

> [!tip]
> Jaise Zomato app mein order confirm hone par khud-ba-khud invoice, tracking ID aur receipt ban jaati hai — waise hi `@dataclass` tumhare fields dekh ke `__init__` aur `__repr__` khud bana deta hai. Tumhe haath se kuch likhna nahi padta.

---

## Field Types Aur Defaults

```python
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class BlogPost:
    # Required fields (koi default nahi) - inhe sabse pehle rakhna hota hai
    title: str
    author: str
    content: str

    # Simple default wale fields
    published: bool = False
    views: int = 0
    category: str = "general"

    # Mutable default wale fields MUST use field(default_factory=...)
    # Ye wahi gotcha hai jo class variables mein tha - shared mutable state
    tags: list[str] = field(default_factory=list)
    metadata: dict[str, str] = field(default_factory=dict)

    # Computed default ke liye factory
    created_at: datetime = field(default_factory=datetime.now)


# Use karo
post = BlogPost(
    title="Python Dataclasses Guide",
    author="Alice",
    content="Dataclasses are awesome...",
    tags=["python", "tutorial"],
)

print(post)
# BlogPost(title='Python Dataclasses Guide', author='Alice', ...)

# default_factory ki wajah se har instance ki apni alag list milti hai
post2 = BlogPost(title="Another Post", author="Bob", content="...")
post2.tags.append("draft")
print(post.tags)   # ['python', 'tutorial'] - affect nahi hua
print(post2.tags)  # ['draft']
```

> [!warning]
> Agar tum `tags: list[str] = []` likhoge (bina `field()` ke), toh Python error de dega. Ye wahi purana mutable-default gotcha hai jo function arguments mein bhi hota hai — sab instances ek hi list share kar lete, jaise ek hi Swiggy cart sab customers ke beech baant di jaaye. Isliye `default_factory` use karo.

### `field()` Function

`field()` tumhe har individual field par fine-grained control deta hai:

```python
from dataclasses import dataclass, field


@dataclass
class APIRequest:
    # Normal fields
    method: str
    url: str
    body: dict = field(default_factory=dict)

    # __repr__ se exclude karo (sensitive data)
    auth_token: str = field(default="", repr=False)

    # __init__ se exclude karo (baad mein compute hoga)
    request_id: str = field(init=False, default="")

    # comparison se exclude karo
    timestamp: float = field(default=0.0, compare=False)

    # Arbitrary metadata store karo
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
# Note: auth_token print mein NAHI dikhega (repr=False)
```

Bilkul waise jaise UPI transaction receipt mein tumhara card number ya CVV kabhi print nahi hota, lekin baaki details dikhti hain — `repr=False` bhi wahi role nibhata hai.

| `field()` parameter | Kaam | Default |
|---------------------|---------|---------|
| `default` | Default value (sirf immutable) | MISSING |
| `default_factory` | Default return karne wala callable (mutable ke liye) | MISSING |
| `init` | `__init__` mein include karein? | `True` |
| `repr` | `__repr__` mein include karein? | `True` |
| `compare` | `__eq__` aur ordering mein include karein? | `True` |
| `hash` | `__hash__` mein include karein? | `None` (`compare` follow karta hai) |
| `metadata` | Arbitrary metadata dict | `None` |

---

## `frozen=True` - Immutable Instances

TypeScript ke `Readonly<T>` jaisa, ya har field pe `readonly` laga dena — `frozen=True` dataclass ko creation ke baad immutable bana deta hai.

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

# Modify nahi kar sakte!
# p.x = 5.0  # FrozenInstanceError!

# Frozen dataclasses automatically hashable hote hain (sets/dicts mein use ho sakte)
points = {Point(0, 0), Point(1, 1), Point(0, 0)}
print(len(points))  # 2 (duplicate hata diya)

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

// Ya Readonly utility type se
type Point = Readonly<{
  x: number;
  y: number;
}>;

// Par TypeScript ka readonly sirf compile-time hai!
// Runtime pe JavaScript mein aaram se mutate kar sakte ho
```

> [!info]
> Ye farak important hai — TypeScript ka `readonly` sirf compiler ki warning hai, runtime pe koi rok-tok nahi. Python ka `frozen=True` asal mein runtime pe enforce hota hai, jaise IRCTC ka confirmed ticket — booking ke baad naam change nahi kar sakte, chahe kitni bhi koshish karo.

### Frozen Dataclass Ki Modified Copy Banana

Frozen instance ko mutate nahi kar sakte, isliye `dataclasses.replace()` use karo — kuch fields change karke ek naya copy bana lo:

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

Ye bilkul TypeScript ke spread operator pattern jaisa hai:

```typescript
const prodConfig = { host: "api.example.com", port: 443, debug: false };
const devConfig = { ...prodConfig, debug: true, port: 8080 };
```

---

## `__post_init__` - Computed Fields Aur Validation

`__post_init__` auto-generated `__init__` ke baad chalta hai. Isse validation, computed fields, ya koi bhi extra initialization logic ke liye use karo.

```python
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class Invoice:
    customer_name: str
    items: list[dict]  # [{"name": "Widget", "price": 9.99, "qty": 2}]
    tax_rate: float = 0.08

    # Computed fields - __init__ se exclude
    subtotal: float = field(init=False)
    tax: float = field(init=False)
    total: float = field(init=False)
    invoice_number: str = field(init=False)

    def __post_init__(self):
        """__init__ ke baad chalta hai - derived values compute karo."""
        # Validate karo
        if not self.items:
            raise ValueError("Invoice must have at least one item")
        if self.tax_rate < 0 or self.tax_rate > 1:
            raise ValueError(f"Invalid tax rate: {self.tax_rate}")

        # Derived fields compute karo
        self.subtotal = sum(
            item["price"] * item["qty"] for item in self.items
        )
        self.tax = round(self.subtotal * self.tax_rate, 2)
        self.total = round(self.subtotal + self.tax, 2)

        # Invoice number generate karo
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

Socho isko Zomato ke order-total calculation jaisa — item price, GST, discount sab `__post_init__` mein compute ho jaate hain, aur customer ko final bill dikhta hai.

### Init-Only Fields Ke Liye `InitVar`

Kabhi-kabhi `__init__` mein ek parameter chahiye hota hai jo field na bane:

```python
from dataclasses import dataclass, field, InitVar


@dataclass
class DatabaseConnection:
    host: str
    port: int
    database: str

    # InitVar: __init__ aur __post_init__ mein milta hai, par field ban ke store NAHI hota
    password: InitVar[str] = ""

    connection_string: str = field(init=False)
    is_connected: bool = field(init=False, default=False)

    def __post_init__(self, password: str):
        """password yahan milta hai lekin self.password ban ke store nahi hota."""
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
# Note: password output mein NAHI hai - wo field hi nahi hai
# hasattr(db, 'password')  # False
```

Bilkul jaise UPI PIN — payment karte waqt use hota hai, par kahin store nahi hota.

---

## Dataclasses Mein Inheritance

Dataclasses inheritance support karte hain. Child classes parent ke fields extend kar sakti hain.

```python
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class BaseModel:
    """Sabhi models ka base - common fields deta hai."""
    id: str = ""
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)

    def touch(self):
        self.updated_at = datetime.now()


@dataclass
class User(BaseModel):
    """User model id, created_at, updated_at inherit karta hai."""
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

**Important ordering rule**: dataclass inheritance mein parent ke fields `__init__` mein pehle aate hain. Agar parent ke fields ke defaults hain, toh child ke paas required (no-default) field nahi ho sakta — kyunki optional parameter ke baad required parameter nahi rakh sakte.

```python
# Ye WORKS karega - parent ke defaults hain, child ke bhi defaults hain
@dataclass
class Base:
    id: str = ""

@dataclass
class Child(Base):
    name: str = ""  # default hai - OK

# Ye FAILS hoga - parent ke pass default hai, child ke pass nahi
@dataclass
class Base:
    id: str = ""

# @dataclass
# class Child(Base):
#     name: str  # NO default - TypeError! (id ke baad aata hai jiska default hai)
```

---

## Dataclass vs Pydantic BaseModel

Pydantic ek third-party library hai jo runtime validation deti hai. Quick comparison dekho:

```python
# Standard dataclass - koi runtime validation nahi
from dataclasses import dataclass

@dataclass
class UserDC:
    name: str
    age: int
    email: str

# Ye "chalega" - koi validation nahi!
bad_user = UserDC(name=123, age="not a number", email=None)
print(bad_user.name)  # 123 (str hona chahiye tha par Python ko fark nahi padta)


# Pydantic BaseModel - runtime validation aur coercion
from pydantic import BaseModel, EmailStr, field_validator

class UserPydantic(BaseModel):
    name: str
    age: int
    email: str  # asal email validation ke liye EmailStr use karo

    @field_validator("age")
    @classmethod
    def age_must_be_positive(cls, v):
        if v < 0 or v > 150:
            raise ValueError("Age must be between 0 and 150")
        return v


# Pydantic validate aur coerce karta hai
user = UserPydantic(name="Alice", age="30", email="alice@example.com")
print(user.age)   # 30 (int - string se coerce hua!)
print(type(user.age))  # <class 'int'>

# Pydantic invalid data reject karta hai
# UserPydantic(name="Alice", age="not a number", email="alice@example.com")
# ValidationError: value is not a valid integer
```

| Feature | `@dataclass` | Pydantic `BaseModel` |
|---------|-------------|---------------------|
| Runtime validation | Nahi | **Haan** |
| Type coercion | Nahi | **Haan** (`"30"` -> `30`) |
| JSON serialization | Manual | **Built-in** (`.model_dump_json()`) |
| JSON deserialization | Manual | **Built-in** (`Model.model_validate_json()`) |
| Performance | Fast (validation nahi hoti) | Slow (sab kuch validate hota hai) |
| Dependencies | Standard library | Third-party (`pip install pydantic`) |
| Use case | Internal data structures | API input/output, config, serialization |

**Rule of thumb**: Internal data ke liye `@dataclass` use karo. Kisi bhi cheez ke liye jo boundary cross karti hai (API requests, config files, external data), Pydantic use karo — jaise ek security guard jo gate pe har cheez check karta hai, jabki ghar ke andar sab par bharosa hota hai.

---

## Memory Optimization Ke Liye `slots=True`

Python 3.10+ mein `slots=True` support hai, jo attribute storage ke liye `__dict__` ki jagah `__slots__` use karta hai. Isse memory bachti hai aur attribute access thoda fast ho jaata hai.

```python
from dataclasses import dataclass
import sys


@dataclass
class UserWithDict:
    """Normal dataclass - storage ke liye __dict__ use karta hai."""
    name: str
    email: str
    age: int


@dataclass(slots=True)
class UserWithSlots:
    """Optimized dataclass - storage ke liye __slots__ use karta hai."""
    name: str
    email: str
    age: int


u1 = UserWithDict("Alice", "alice@example.com", 30)
u2 = UserWithSlots("Alice", "alice@example.com", 30)

print(sys.getsizeof(u1.__dict__))  # ~232 bytes (dict overhead)
# u2 ke paas __dict__ hi nahi hai - attributes zyada efficiently store hote hain

# Slotted dataclass mein arbitrary attributes add nahi kar sakte
u1.nickname = "Ali"   # Bilkul chalega (dynamic attributes)
# u2.nickname = "Ali" # AttributeError: 'UserWithSlots' has no attribute 'nickname'
```

`slots=True` use karo jab:
- Bohot saare instances (hazaaron+) bana rahe ho aur memory matter karti hai
- Creation ke baad dynamic attributes add karne ki zarurat nahi
- Thoda fast attribute access chahiye

---

## Complete Example: Event System Banana

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
    """Immutable event - ek baar ban gaya toh modify nahi ho sakta."""
    type: str
    source: str
    data: dict = field(default_factory=dict)
    priority: EventPriority = EventPriority.NORMAL
    timestamp: datetime = field(default_factory=datetime.now)
    event_id: str = field(default="")

    def __post_init__(self):
        if not self.event_id:
            # Frozen dataclasses ke liye object.__setattr__ use karo
            import uuid
            object.__setattr__(self, "event_id", str(uuid.uuid4())[:8])


@dataclass
class EventLog:
    """Mutable event log - events accumulate karta hai."""
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
            self.events.pop(0)  # sabse purana hata do
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

Ye bilkul Swiggy ke order-tracking system jaisa hai — har event (order placed, picked up, delivered) immutable record hai, aur log unhe priority ke hisaab se filter kar sakta hai.

---

## Dataclass Options Summary

```python
@dataclass(
    init=True,         # __init__ generate karein? (default: True)
    repr=True,         # __repr__ generate karein? (default: True)
    eq=True,           # __eq__ generate karein? (default: True)
    order=False,       # __lt__, __le__, __gt__, __ge__ generate karein? (default: False)
    unsafe_hash=False, # __hash__ generation force karein? (default: False)
    frozen=False,      # Immutable banayein? (default: False)
    match_args=True,   # Pattern matching ke liye __match_args__ generate karein? (3.10+)
    kw_only=False,     # Saare fields keyword-only? (3.10+)
    slots=False,       # __slots__ use karein? (3.10+)
)
class MyClass:
    ...
```

---

## Practice Exercises

### Exercise 1: REST API Models

REST API ke liye dataclasses banao:

```python
@dataclass
class PaginationParams:
    page: int = 1
    per_page: int = 25
    sort_by: str = "created_at"
    sort_order: str = "desc"  # __post_init__ mein validate karo

@dataclass
class APIResponse:
    status: int
    data: Any
    pagination: PaginationParams | None = None
    errors: list[str] = field(default_factory=list)
    # Ek computed 'success' property add karo
```

`__post_init__` mein validation, computed fields ke liye `@property`, aur ek `to_dict()` method add karo.

### Exercise 2: Configuration System

Frozen dataclasses use karke ek layered configuration system banao:

```python
@dataclass(frozen=True)
class DatabaseConfig:
    host: str
    port: int
    name: str
    # ... aur fields

@dataclass(frozen=True)
class ServerConfig:
    host: str
    port: int
    debug: bool
    # ... aur fields

@dataclass(frozen=True)
class AppConfig:
    database: DatabaseConfig
    server: ServerConfig
    # classmethod factories add karo: from_env(), from_dict(), for_testing()
```

Modified copies banane ke liye `dataclasses.replace()` use karo.

### Exercise 3: Shopping Cart (Dataclass Version)

Classes basics exercise wale `ShoppingCart` ko dataclasses se rewrite karo:

```python
@dataclass(frozen=True)
class CartItem:
    product_id: str
    name: str
    price: float
    quantity: int = 1
    # __post_init__ mein computed total

@dataclass
class ShoppingCart:
    items: list[CartItem] = field(default_factory=list)
    # Methods add karo: add_item, remove_item, total, item_count
    # __len__, __contains__, __iter__ add karo
```

### Exercise 4: Boilerplate Compare Karo

Ek hi data model teen tareeke se likho aur lines count karo:
1. Plain Python class (manual `__init__`, `__repr__`, `__eq__`)
2. Python `@dataclass`
3. TypeScript `class`

Model: `Employee` jismein fields hain `id`, `name`, `department`, `salary`, `hire_date`, `is_active`, `skills` (list), `manager_id` (optional).

---

## Key Takeaways

1. **`@dataclass` boilerplate khatam kar deta hai** - `__init__`, `__repr__`, `__eq__` khud generate karta hai (Python ka sabse bada quality-of-life win)
2. **Mutable defaults ke liye `field(default_factory=list)` use karo** - kabhi `field = []` mat likho
3. **`frozen=True`** = TypeScript ka `Readonly<T>`, par runtime pe enforce hota hai
4. **`__post_init__`** validation aur computed fields ke liye - `__init__` ke baad chalta hai
5. **`dataclasses.replace()`** = spread operator `{...obj, field: newValue}`
6. **`slots=True`** (Python 3.10+) memory optimization ke liye jab bohot saare instances banane ho
7. **Internal data ke liye dataclass use karo**, external data (APIs, config files) ke liye Pydantic
8. **Inheritance chalta hai** par field ordering rule dhyaan mein rakho (defaults, non-defaults ke baad aane chahiye)
