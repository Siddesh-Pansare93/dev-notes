# Enums & NamedTuples

> Python enums and named tuples for Node.js/TypeScript developers

---

## Enum Basics

Python enums are class-based, unlike TypeScript enums which are more like constant maps. Python enums are more powerful but also more verbose.

```python
from enum import Enum


class Color(Enum):
    RED = "red"
    GREEN = "green"
    BLUE = "blue"


class HttpStatus(Enum):
    OK = 200
    CREATED = 201
    BAD_REQUEST = 400
    NOT_FOUND = 404
    INTERNAL_SERVER_ERROR = 500
```

```typescript
// TypeScript enums
enum Color {
  RED = "red",
  GREEN = "green",
  BLUE = "blue",
}

enum HttpStatus {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500,
}
```

---

## Accessing Name and Value

Every enum member has two attributes: `.name` (the identifier) and `.value` (the assigned value).

```python
from enum import Enum


class LogLevel(Enum):
    DEBUG = 10
    INFO = 20
    WARNING = 30
    ERROR = 40
    CRITICAL = 50


# Access name and value
level = LogLevel.ERROR
print(level.name)   # "ERROR"
print(level.value)  # 40
print(level)        # LogLevel.ERROR

# Access by value
print(LogLevel(40))      # LogLevel.ERROR

# Access by name
print(LogLevel["ERROR"]) # LogLevel.ERROR

# Comparison - enums compare by identity, not value
print(LogLevel.ERROR == LogLevel.ERROR)  # True
print(LogLevel.ERROR is LogLevel.ERROR)  # True (singleton)
print(LogLevel.ERROR == 40)              # False! (Enum != int)
```

```typescript
// TypeScript enum access
enum LogLevel {
  DEBUG = 10,
  INFO = 20,
  WARNING = 30,
  ERROR = 40,
}

const level = LogLevel.ERROR;
console.log(level);              // 40 (just the value)
console.log(LogLevel[40]);       // "ERROR" (reverse mapping for numeric enums)
console.log(LogLevel.ERROR === 40); // true (TS enums ARE their values)
```

Key difference: **Python enums are NOT their values.** `LogLevel.ERROR == 40` is `False` in Python but `true` in TypeScript. Python enums are objects, not primitives.

---

## IntEnum and StrEnum

If you WANT enum members to compare equal to their values (like TypeScript behavior), use `IntEnum` or `StrEnum`.

```python
from enum import IntEnum, StrEnum


class HttpStatus(IntEnum):
    OK = 200
    NOT_FOUND = 404
    INTERNAL_SERVER_ERROR = 500


# IntEnum members ARE integers
print(HttpStatus.OK == 200)      # True (unlike regular Enum)
print(HttpStatus.OK + 1)         # 201 (can do arithmetic)
print(HttpStatus.OK < 300)       # True
print(isinstance(HttpStatus.OK, int))  # True


class Color(StrEnum):
    RED = "red"
    GREEN = "green"
    BLUE = "blue"


# StrEnum members ARE strings
print(Color.RED == "red")         # True
print(Color.RED.upper())          # "RED" (string methods work)
print(f"Color is {Color.RED}")    # "Color is red"
print(isinstance(Color.RED, str)) # True
```

```typescript
// TypeScript numeric enums naturally behave like IntEnum
enum HttpStatus {
  OK = 200,
  NOT_FOUND = 404,
}
console.log(HttpStatus.OK === 200); // true

// TypeScript string enums naturally behave like StrEnum
enum Color {
  RED = "red",
  GREEN = "green",
}
console.log(Color.RED === "red"); // true
```

### When to use which:

| Type | Use When |
|------|----------|
| `Enum` | You want strict enum identity (safest) |
| `IntEnum` | Enum needs to interop with integers (status codes, levels) |
| `StrEnum` | Enum needs to interop with strings (JSON fields, config values) |

---

## `auto()` - Auto-Generate Values

```python
from enum import Enum, auto


class Permission(Enum):
    READ = auto()     # 1
    WRITE = auto()    # 2
    DELETE = auto()   # 3
    ADMIN = auto()    # 4


print(Permission.READ.value)   # 1
print(Permission.ADMIN.value)  # 4


# Custom auto() behavior
class Color(Enum):
    def _generate_next_value_(name, start, count, last_values):
        """Override auto() to use lowercase name as value."""
        return name.lower()

    RED = auto()     # "red"
    GREEN = auto()   # "green"
    BLUE = auto()    # "blue"


print(Color.RED.value)  # "red"
```

---

## Iterating Over Enums

Python enums are iterable. TypeScript enums require `Object.values()` or similar workarounds.

```python
from enum import Enum


class TaskStatus(Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    IN_REVIEW = "in_review"
    DONE = "done"
    CANCELLED = "cancelled"


# Iterate over all members
for status in TaskStatus:
    print(f"{status.name} = {status.value}")

# Get all values
values = [s.value for s in TaskStatus]
print(values)  # ['todo', 'in_progress', 'in_review', 'done', 'cancelled']

# Get all names
names = [s.name for s in TaskStatus]
print(names)  # ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']

# Number of members
print(len(TaskStatus))  # 5

# Check membership
print("todo" in [s.value for s in TaskStatus])  # True
print(TaskStatus.TODO in TaskStatus)  # True
```

```typescript
// TypeScript - iterating over enums is clunkier
enum TaskStatus {
  TODO = "todo",
  IN_PROGRESS = "in_progress",
  DONE = "done",
}

// For string enums:
const values = Object.values(TaskStatus);
// For numeric enums, Object.values includes both names and values (confusing!)
```

---

## Enums with Methods and Properties

Python enums are classes, so you can add methods and properties.

```python
from enum import Enum


class OrderStatus(Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    RETURNED = "returned"

    @property
    def is_active(self) -> bool:
        """Is this order still in progress?"""
        return self in (
            OrderStatus.PENDING,
            OrderStatus.CONFIRMED,
            OrderStatus.SHIPPED,
        )

    @property
    def is_terminal(self) -> bool:
        """Has this order reached a final state?"""
        return self in (
            OrderStatus.DELIVERED,
            OrderStatus.CANCELLED,
            OrderStatus.RETURNED,
        )

    def can_transition_to(self, new_status: "OrderStatus") -> bool:
        """Check if a status transition is valid."""
        valid_transitions = {
            OrderStatus.PENDING: {OrderStatus.CONFIRMED, OrderStatus.CANCELLED},
            OrderStatus.CONFIRMED: {OrderStatus.SHIPPED, OrderStatus.CANCELLED},
            OrderStatus.SHIPPED: {OrderStatus.DELIVERED, OrderStatus.RETURNED},
            OrderStatus.DELIVERED: {OrderStatus.RETURNED},
            OrderStatus.CANCELLED: set(),
            OrderStatus.RETURNED: set(),
        }
        return new_status in valid_transitions.get(self, set())


status = OrderStatus.CONFIRMED
print(status.is_active)                              # True
print(status.can_transition_to(OrderStatus.SHIPPED))  # True
print(status.can_transition_to(OrderStatus.DELIVERED)) # False (must ship first)
```

---

## Real-World Enum Example: API Error Codes

```python
from enum import Enum, IntEnum


class ErrorCode(IntEnum):
    # Auth errors (1xxx)
    INVALID_TOKEN = 1001
    TOKEN_EXPIRED = 1002
    INSUFFICIENT_PERMISSIONS = 1003

    # Validation errors (2xxx)
    MISSING_FIELD = 2001
    INVALID_FORMAT = 2002
    VALUE_OUT_OF_RANGE = 2003

    # Resource errors (3xxx)
    NOT_FOUND = 3001
    ALREADY_EXISTS = 3002
    CONFLICT = 3003

    # System errors (4xxx)
    INTERNAL_ERROR = 4001
    SERVICE_UNAVAILABLE = 4002
    RATE_LIMITED = 4003

    @property
    def category(self) -> str:
        code = self.value
        if 1000 <= code < 2000:
            return "auth"
        elif 2000 <= code < 3000:
            return "validation"
        elif 3000 <= code < 4000:
            return "resource"
        else:
            return "system"

    @property
    def http_status(self) -> int:
        mapping = {
            "auth": 401,
            "validation": 422,
            "resource": 404,
            "system": 500,
        }
        return mapping.get(self.category, 500)

    @property
    def message(self) -> str:
        return self.name.replace("_", " ").title()


error = ErrorCode.TOKEN_EXPIRED
print(error.category)     # "auth"
print(error.http_status)  # 401
print(error.message)      # "Token Expired"
print(error.value)        # 1002

# Serialize to API response
response = {
    "error": {
        "code": error.value,
        "message": error.message,
        "category": error.category,
    }
}
```

---

## NamedTuple

NamedTuples are immutable, lightweight data containers. They are tuples with named fields - like a frozen dataclass but inheriting from tuple.

### `typing.NamedTuple` (Modern Style)

```python
from typing import NamedTuple


class Coordinate(NamedTuple):
    latitude: float
    longitude: float
    altitude: float = 0.0  # optional with default


class DatabaseConfig(NamedTuple):
    host: str
    port: int
    database: str
    username: str = "postgres"
    password: str = ""


# Creation
coord = Coordinate(40.7128, -74.0060)
config = DatabaseConfig("localhost", 5432, "myapp")

# Access by name (like dataclass)
print(coord.latitude)   # 40.7128
print(config.host)      # localhost

# Access by index (like tuple)
print(coord[0])         # 40.7128
print(config[1])        # 5432

# Unpacking (like tuple)
lat, lng, alt = coord
print(f"{lat}, {lng}")  # 40.7128, -74.006

# Immutable
# coord.latitude = 0  # AttributeError: can't set attribute

# Can be used as dict keys and in sets (hashable by default)
locations = {coord: "New York City"}

# Tuple operations work
print(len(coord))       # 3
print(coord + (100,))   # (40.7128, -74.006, 0.0, 100)

# Convert to dict
print(coord._asdict())  # {'latitude': 40.7128, 'longitude': -74.006, 'altitude': 0.0}

# Create modified copy
new_coord = coord._replace(altitude=100.0)
print(new_coord)  # Coordinate(latitude=40.7128, longitude=-74.006, altitude=100.0)
```

### `collections.namedtuple` (Older Style)

```python
from collections import namedtuple

# Functional creation style - no type hints
Point = namedtuple("Point", ["x", "y"])
# Or: Point = namedtuple("Point", "x y")

p = Point(3, 4)
print(p.x, p.y)  # 3 4
```

**Always prefer `typing.NamedTuple`** over `collections.namedtuple` - it supports type annotations and is more readable.

```typescript
// TypeScript - closest equivalents

// Readonly interface (no tuple behavior)
interface Coordinate {
  readonly latitude: number;
  readonly longitude: number;
  readonly altitude: number;
}

// Or: readonly tuple type (no named fields)
type Coordinate = readonly [number, number, number];

// TypeScript can't combine named fields with tuple behavior
// Python NamedTuple gives you BOTH
```

---

## NamedTuple vs Dataclass: When to Use Which

```python
from typing import NamedTuple
from dataclasses import dataclass


# NamedTuple - immutable, lightweight, tuple-compatible
class RGB(NamedTuple):
    r: int
    g: int
    b: int


# Frozen dataclass - immutable, more features
@dataclass(frozen=True)
class RGBDataclass:
    r: int
    g: int
    b: int
```

| Feature | NamedTuple | `@dataclass` | `@dataclass(frozen=True)` |
|---------|-----------|-------------|--------------------------|
| Mutable | No | **Yes** | No |
| Hashable | **Always** | Only if frozen or custom `__hash__` | **Yes** |
| Tuple unpacking | **Yes** | No | No |
| Index access `[0]` | **Yes** | No | No |
| Methods | Yes | Yes | Yes |
| Inheritance | Limited | **Full** | **Full** |
| `__post_init__` | No | **Yes** | **Yes** |
| `field()` options | No | **Yes** | **Yes** |
| Memory | **Smallest** | Larger (`__dict__`) | Larger |
| Slots | Built-in | `slots=True` (3.10+) | `slots=True` |

### Decision Guide:

**Use NamedTuple when:**
- Data is simple and immutable (coordinates, RGB colors, config tuples)
- You need tuple unpacking: `x, y, z = point`
- You need to use it as a dict key or in a set
- Memory matters (many instances)
- You want the lightest possible container

**Use dataclass when:**
- Data is mutable or you need `__post_init__` validation
- You need `field()` options (repr=False, compare=False, default_factory)
- Complex inheritance hierarchies
- You need the full OOP feature set

```python
# Good NamedTuple uses
class Point(NamedTuple):
    x: float
    y: float

class HTTPHeader(NamedTuple):
    name: str
    value: str

class DateRange(NamedTuple):
    start: str
    end: str

# Good dataclass uses
@dataclass
class User:
    name: str
    email: str
    permissions: list[str] = field(default_factory=list)

    def __post_init__(self):
        self.email = self.email.lower()

@dataclass
class CacheEntry:
    key: str
    value: object
    ttl: int
    created_at: float = field(default_factory=time.time)
    hits: int = field(default=0, repr=False)
```

---

## NamedTuple with Methods

NamedTuples can have methods, just like classes:

```python
from typing import NamedTuple
import math


class Vector2D(NamedTuple):
    x: float
    y: float

    @property
    def magnitude(self) -> float:
        return math.sqrt(self.x ** 2 + self.y ** 2)

    @property
    def normalized(self) -> "Vector2D":
        mag = self.magnitude
        if mag == 0:
            return Vector2D(0, 0)
        return Vector2D(self.x / mag, self.y / mag)

    def dot(self, other: "Vector2D") -> float:
        return self.x * other.x + self.y * other.y

    def distance_to(self, other: "Vector2D") -> float:
        return math.sqrt((self.x - other.x) ** 2 + (self.y - other.y) ** 2)

    def __add__(self, other: "Vector2D") -> "Vector2D":
        return Vector2D(self.x + other.x, self.y + other.y)

    def __mul__(self, scalar: float) -> "Vector2D":
        return Vector2D(self.x * scalar, self.y * scalar)

    def __rmul__(self, scalar: float) -> "Vector2D":
        return self.__mul__(scalar)


v1 = Vector2D(3, 4)
v2 = Vector2D(1, 0)

print(v1.magnitude)      # 5.0
print(v1.normalized)     # Vector2D(x=0.6, y=0.8)
print(v1.dot(v2))        # 3.0
print(v1.distance_to(v2)) # 4.472...
print(v1 + v2)           # Vector2D(x=4, y=4)
print(3 * v1)            # Vector2D(x=9, y=12)

# Still a tuple!
x, y = v1
print(f"({x}, {y})")    # (3, 4)
print(v1[0])             # 3
```

---

## Real-World Example: API Response Types

```python
from typing import NamedTuple
from enum import StrEnum
from dataclasses import dataclass, field


# Enums for status
class RequestMethod(StrEnum):
    GET = "GET"
    POST = "POST"
    PUT = "PUT"
    PATCH = "PATCH"
    DELETE = "DELETE"


class ResponseStatus(StrEnum):
    SUCCESS = "success"
    ERROR = "error"
    PENDING = "pending"


# NamedTuples for lightweight, immutable data
class Endpoint(NamedTuple):
    method: RequestMethod
    path: str
    description: str = ""


class RateLimit(NamedTuple):
    limit: int
    remaining: int
    reset_at: int  # unix timestamp


# Dataclass for more complex, mutable structures
@dataclass
class APIRoute:
    endpoint: Endpoint
    rate_limit: RateLimit
    handlers: list[str] = field(default_factory=list)
    middleware: list[str] = field(default_factory=list)
    is_public: bool = False

    @property
    def is_rate_limited(self) -> bool:
        return self.rate_limit.remaining <= 0

    def add_middleware(self, name: str) -> None:
        if name not in self.middleware:
            self.middleware.append(name)


# Define API routes
routes = [
    APIRoute(
        endpoint=Endpoint(RequestMethod.GET, "/api/users", "List all users"),
        rate_limit=RateLimit(limit=100, remaining=95, reset_at=1705300000),
        handlers=["list_users"],
        middleware=["auth", "log"],
    ),
    APIRoute(
        endpoint=Endpoint(RequestMethod.POST, "/api/users", "Create a user"),
        rate_limit=RateLimit(limit=20, remaining=0, reset_at=1705300000),
        handlers=["create_user"],
        middleware=["auth", "validate", "log"],
    ),
]

for route in routes:
    method, path, desc = route.endpoint  # NamedTuple unpacking!
    limited = " [RATE LIMITED]" if route.is_rate_limited else ""
    print(f"{method} {path} - {desc}{limited}")
    print(f"  Middleware: {' -> '.join(route.middleware)}")
    print(f"  Rate limit: {route.rate_limit.remaining}/{route.rate_limit.limit}")
    print()

# Output:
# GET /api/users - List all users
#   Middleware: auth -> log
#   Rate limit: 95/100
#
# POST /api/users - Create a user [RATE LIMITED]
#   Middleware: auth -> validate -> log
#   Rate limit: 0/20
```

---

## Flag Enums (Bitwise Operations)

Python has `Flag` and `IntFlag` for bit-flag enums, useful for permissions:

```python
from enum import Flag, auto


class Permission(Flag):
    NONE = 0
    READ = auto()      # 1
    WRITE = auto()     # 2
    DELETE = auto()    # 4
    ADMIN = auto()     # 8

    # Compound permissions
    READ_WRITE = READ | WRITE
    ALL = READ | WRITE | DELETE | ADMIN


# Combine with bitwise OR
user_perms = Permission.READ | Permission.WRITE
print(user_perms)                          # Permission.READ_WRITE
print(Permission.READ in user_perms)       # True
print(Permission.DELETE in user_perms)     # False
print(Permission.ADMIN in user_perms)      # False

admin_perms = Permission.ALL
print(Permission.DELETE in admin_perms)    # True

# Remove a permission
modified = admin_perms & ~Permission.DELETE
print(Permission.DELETE in modified)       # False
print(Permission.READ in modified)         # True
```

---

## Practice Exercises

### Exercise 1: State Machine with Enums

Build a task management state machine:

```python
class TaskState(Enum):
    BACKLOG = "backlog"
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    IN_REVIEW = "in_review"
    DONE = "done"
    ARCHIVED = "archived"
```

Add methods:
- `can_transition_to(new_state)` with valid transition rules
- `is_active` property
- `next_states` property returning valid next states

Create a `Task` dataclass that uses this enum and validates transitions.

### Exercise 2: Configuration with NamedTuples

Build a type-safe configuration system:

```python
class Environment(StrEnum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"

class ServerConfig(NamedTuple):
    host: str
    port: int
    workers: int
    debug: bool

class DatabaseConfig(NamedTuple):
    host: str
    port: int
    name: str
    pool_size: int
```

Create factory functions that return the right config for each environment. Make the configs immutable and usable as dict keys.

### Exercise 3: Card Game

Model a deck of cards:

```python
class Suit(Enum):
    HEARTS = "hearts"
    DIAMONDS = "diamonds"
    CLUBS = "clubs"
    SPADES = "spades"

class Rank(IntEnum):
    TWO = 2
    THREE = 3
    # ...
    ACE = 14

class Card(NamedTuple):
    rank: Rank
    suit: Suit
```

Implement:
- A `Deck` class that generates all 52 cards
- Shuffle and deal methods
- Card comparison (using Rank)
- Display formatting: "Ace of Spades"

### Exercise 4: Permission System

Using `Flag` enums, build a role-based permission system:

```python
class ResourcePermission(Flag):
    NONE = 0
    VIEW = auto()
    CREATE = auto()
    EDIT = auto()
    DELETE = auto()
    MANAGE = VIEW | CREATE | EDIT | DELETE

class Role(Enum):
    VIEWER = ResourcePermission.VIEW
    EDITOR = ResourcePermission.VIEW | ResourcePermission.CREATE | ResourcePermission.EDIT
    ADMIN = ResourcePermission.MANAGE
```

Create functions to check permissions, combine roles, and generate audit-friendly permission descriptions.

---

## Key Takeaways for Node.js Developers

1. **Python `Enum` members are objects**, not their values -- `Status.OK != 200` unless you use `IntEnum`
2. **Use `StrEnum`/`IntEnum`** when you need enums to behave like their values (closest to TS enums)
3. **`auto()`** auto-generates values (like auto-incrementing)
4. **Python enums support methods and properties** -- they are real classes
5. **`NamedTuple`** = immutable struct with tuple behavior. No TypeScript equivalent that combines named fields with tuple indexing
6. **NamedTuple for simple immutable data**, dataclass for everything else
7. **Python enums are iterable** -- `for status in Status:` just works
8. **`Flag` enum** for bitwise permission systems -- native support
9. **`_asdict()`** and **`_replace()`** are key NamedTuple methods for serialization and creating modified copies
