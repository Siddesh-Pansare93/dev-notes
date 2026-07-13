# Enums & NamedTuples

> Python ke enums aur named tuples — Node.js/TypeScript devs ke liye

---

## Enum Basics

Kya hota hai? TypeScript mein enum basically ek constant map jaisa hota hai — bas naam se value nikal lo. Python mein enum ek pura class hota hai. Zyada powerful hai, thoda zyada verbose bhi hai — jaise Swiggy ka order status sirf ek string nahi hota, poora ek object hota hai jiske apne rules hote hain.

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

## Name aur Value Access Karna

Har enum member ke do attributes hote hain: `.name` (identifier) aur `.value` (jo value assign ki hai).

```python
from enum import Enum


class LogLevel(Enum):
    DEBUG = 10
    INFO = 20
    WARNING = 30
    ERROR = 40
    CRITICAL = 50


# Name aur value nikalo
level = LogLevel.ERROR
print(level.name)   # "ERROR"
print(level.value)  # 40
print(level)        # LogLevel.ERROR

# Value se access karo
print(LogLevel(40))      # LogLevel.ERROR

# Name se access karo
print(LogLevel["ERROR"]) # LogLevel.ERROR

# Comparison - enums identity se compare hote hain, value se nahi
print(LogLevel.ERROR == LogLevel.ERROR)  # True
print(LogLevel.ERROR is LogLevel.ERROR)  # True (singleton hai)
print(LogLevel.ERROR == 40)              # False! (Enum, int nahi hai)
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
console.log(level);              // 40 (bas value hi hai)
console.log(LogLevel[40]);       // "ERROR" (numeric enums ke liye reverse mapping)
console.log(LogLevel.ERROR === 40); // true (TS enums KHUD hi apni values hain)
```

Yeh sabse important difference hai: **Python enums apni value nahi hote.** `LogLevel.ERROR == 40` Python mein `False` hai lekin TypeScript mein `true`. Python mein enum ek object hai, primitive nahi — bilkul waise jaise ek `Order` object apne aap mein `"pending"` string nahi hota, uske andar ek status field hoti hai.

---

## IntEnum aur StrEnum

Agar tumhe chahiye ki enum member apni value ke barabar compare ho (TypeScript wala behavior), toh `IntEnum` ya `StrEnum` use karo.

```python
from enum import IntEnum, StrEnum


class HttpStatus(IntEnum):
    OK = 200
    NOT_FOUND = 404
    INTERNAL_SERVER_ERROR = 500


# IntEnum members khud integers HAIN
print(HttpStatus.OK == 200)      # True (normal Enum ke ulta)
print(HttpStatus.OK + 1)         # 201 (arithmetic bhi kar sakte ho)
print(HttpStatus.OK < 300)       # True
print(isinstance(HttpStatus.OK, int))  # True


class Color(StrEnum):
    RED = "red"
    GREEN = "green"
    BLUE = "blue"


# StrEnum members khud strings HAIN
print(Color.RED == "red")         # True
print(Color.RED.upper())          # "RED" (string methods kaam karte hain)
print(f"Color is {Color.RED}")    # "Color is red"
print(isinstance(Color.RED, str)) # True
```

```typescript
// TypeScript numeric enums naturally IntEnum jaisa behave karte hain
enum HttpStatus {
  OK = 200,
  NOT_FOUND = 404,
}
console.log(HttpStatus.OK === 200); // true

// TypeScript string enums naturally StrEnum jaisa behave karte hain
enum Color {
  RED = "red",
  GREEN = "green",
}
console.log(Color.RED === "red"); // true
```

### Kab kya use karein:

| Type | Kab Use Karein |
|------|----------|
| `Enum` | Jab strict enum identity chahiye (sabse safe) |
| `IntEnum` | Jab integers ke saath interop karna ho (status codes, levels) |
| `StrEnum` | Jab strings ke saath interop karna ho (JSON fields, config values) |

---

## `auto()` - Values Khud-ba-khud Generate Karna

```python
from enum import Enum, auto


class Permission(Enum):
    READ = auto()     # 1
    WRITE = auto()    # 2
    DELETE = auto()   # 3
    ADMIN = auto()    # 4


print(Permission.READ.value)   # 1
print(Permission.ADMIN.value)  # 4


# auto() ka custom behavior
class Color(Enum):
    def _generate_next_value_(name, start, count, last_values):
        """auto() ko override karo taaki lowercase naam value ban jaaye."""
        return name.lower()

    RED = auto()     # "red"
    GREEN = auto()   # "green"
    BLUE = auto()    # "blue"


print(Color.RED.value)  # "red"
```

---

## Enums Par Iterate Karna

Python enums iterable hote hain. TypeScript enums ke liye `Object.values()` jaisa workaround chahiye.

```python
from enum import Enum


class TaskStatus(Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    IN_REVIEW = "in_review"
    DONE = "done"
    CANCELLED = "cancelled"


# Saare members par iterate karo
for status in TaskStatus:
    print(f"{status.name} = {status.value}")

# Saari values nikalo
values = [s.value for s in TaskStatus]
print(values)  # ['todo', 'in_progress', 'in_review', 'done', 'cancelled']

# Saare names nikalo
names = [s.name for s in TaskStatus]
print(names)  # ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']

# Kitne members hain
print(len(TaskStatus))  # 5

# Membership check karo
print("todo" in [s.value for s in TaskStatus])  # True
print(TaskStatus.TODO in TaskStatus)  # True
```

```typescript
// TypeScript - enums par iterate karna thoda ajeeb hai
enum TaskStatus {
  TODO = "todo",
  IN_PROGRESS = "in_progress",
  DONE = "done",
}

// String enums ke liye:
const values = Object.values(TaskStatus);
// Numeric enums ke liye, Object.values mein names aur values dono aa jaate hain (confusing!)
```

---

## Methods aur Properties Wale Enums

Python enums classes hi hote hain, isliye tum inme methods aur properties add kar sakte ho.

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
        """Kya yeh order abhi bhi chal raha hai?"""
        return self in (
            OrderStatus.PENDING,
            OrderStatus.CONFIRMED,
            OrderStatus.SHIPPED,
        )

    @property
    def is_terminal(self) -> bool:
        """Kya yeh order final state tak pahunch gaya?"""
        return self in (
            OrderStatus.DELIVERED,
            OrderStatus.CANCELLED,
            OrderStatus.RETURNED,
        )

    def can_transition_to(self, new_status: "OrderStatus") -> bool:
        """Check karo ki status transition valid hai ya nahi."""
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
print(status.can_transition_to(OrderStatus.DELIVERED)) # False (pehle ship toh hone do)
```

> [!tip]
> Yeh bilkul Zomato ke order tracking jaisa hai — "Preparing" se seedha "Delivered" nahi ho sakta, pehle "Out for Delivery" se guzarna padega. Enum ke andar hi yeh rules likh do, taaki har jagah `if/else` na likhna pade.

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

# API response ke liye serialize karo
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

Kya hota hai? NamedTuple ek immutable, halka-phulka data container hai. Yeh named fields wali tuple hai — jaise frozen dataclass, bas tuple se inherit karta hai. Socho ek railway PNR ki tarah — fixed fields hain (train, seat, coach), na koi field badal sakta hai na naya add ho sakta hai, aur usko index se bhi access kar sakte ho, naam se bhi.

### `typing.NamedTuple` (Modern Style)

```python
from typing import NamedTuple


class Coordinate(NamedTuple):
    latitude: float
    longitude: float
    altitude: float = 0.0  # optional, default ke saath


class DatabaseConfig(NamedTuple):
    host: str
    port: int
    database: str
    username: str = "postgres"
    password: str = ""


# Creation
coord = Coordinate(40.7128, -74.0060)
config = DatabaseConfig("localhost", 5432, "myapp")

# Naam se access karo (dataclass jaisa)
print(coord.latitude)   # 40.7128
print(config.host)      # localhost

# Index se access karo (tuple jaisa)
print(coord[0])         # 40.7128
print(config[1])        # 5432

# Unpacking (tuple jaisa)
lat, lng, alt = coord
print(f"{lat}, {lng}")  # 40.7128, -74.006

# Immutable hai
# coord.latitude = 0  # AttributeError: can't set attribute

# Dict key aur set mein use ho sakta hai (by default hashable)
locations = {coord: "New York City"}

# Tuple operations kaam karte hain
print(len(coord))       # 3
print(coord + (100,))   # (40.7128, -74.006, 0.0, 100)

# Dict mein convert karo
print(coord._asdict())  # {'latitude': 40.7128, 'longitude': -74.006, 'altitude': 0.0}

# Modified copy banao
new_coord = coord._replace(altitude=100.0)
print(new_coord)  # Coordinate(latitude=40.7128, longitude=-74.006, altitude=100.0)
```

### `collections.namedtuple` (Purana Style)

```python
from collections import namedtuple

# Functional creation style - type hints nahi hain
Point = namedtuple("Point", ["x", "y"])
# Ya: Point = namedtuple("Point", "x y")

p = Point(3, 4)
print(p.x, p.y)  # 3 4
```

> [!info]
> **Hamesha `typing.NamedTuple` use karo** `collections.namedtuple` ke bajaye — yeh type annotations support karta hai aur zyada readable hai.

```typescript
// TypeScript - sabse kareeb equivalents

// Readonly interface (tuple wala behavior nahi milega)
interface Coordinate {
  readonly latitude: number;
  readonly longitude: number;
  readonly altitude: number;
}

// Ya: readonly tuple type (named fields nahi milenge)
type Coordinate = readonly [number, number, number];

// TypeScript named fields aur tuple behavior dono combine nahi kar sakta
// Python NamedTuple tumhe DONO deta hai
```

---

## NamedTuple vs Dataclass: Kab Kya Use Karein

```python
from typing import NamedTuple
from dataclasses import dataclass


# NamedTuple - immutable, halka, tuple-compatible
class RGB(NamedTuple):
    r: int
    g: int
    b: int


# Frozen dataclass - immutable, zyada features ke saath
@dataclass(frozen=True)
class RGBDataclass:
    r: int
    g: int
    b: int
```

| Feature | NamedTuple | `@dataclass` | `@dataclass(frozen=True)` |
|---------|-----------|-------------|--------------------------|
| Mutable | Nahi | **Haan** | Nahi |
| Hashable | **Hamesha** | Sirf frozen ya custom `__hash__` ho toh | **Haan** |
| Tuple unpacking | **Haan** | Nahi | Nahi |
| Index access `[0]` | **Haan** | Nahi | Nahi |
| Methods | Haan | Haan | Haan |
| Inheritance | Limited | **Full** | **Full** |
| `__post_init__` | Nahi | **Haan** | **Haan** |
| `field()` options | Nahi | **Haan** | **Haan** |
| Memory | **Sabse kam** | Zyada (`__dict__`) | Zyada |
| Slots | Built-in | `slots=True` (3.10+) | `slots=True` |

### Decision Guide:

**NamedTuple use karo jab:**
- Data simple aur immutable ho (coordinates, RGB colors, config tuples)
- Tumhe tuple unpacking chahiye: `x, y, z = point`
- Isko dict key ya set mein use karna ho
- Memory matter karti ho (bahut saare instances hon)
- Sabse halka container chahiye

**dataclass use karo jab:**
- Data mutable ho ya `__post_init__` validation chahiye ho
- `field()` options chahiye ho (repr=False, compare=False, default_factory)
- Complex inheritance hierarchies ho
- Full OOP feature set chahiye ho

```python
# NamedTuple ke ache use-cases
class Point(NamedTuple):
    x: float
    y: float

class HTTPHeader(NamedTuple):
    name: str
    value: str

class DateRange(NamedTuple):
    start: str
    end: str

# dataclass ke ache use-cases
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

## Methods Wala NamedTuple

NamedTuples mein bhi methods ho sakte hain, classes jaisa hi:

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

# Fir bhi ek tuple hai!
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


# Status ke liye enums
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


# Halke, immutable data ke liye NamedTuples
class Endpoint(NamedTuple):
    method: RequestMethod
    path: str
    description: str = ""


class RateLimit(NamedTuple):
    limit: int
    remaining: int
    reset_at: int  # unix timestamp


# Complex, mutable structures ke liye dataclass
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


# API routes define karo
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

Python mein `Flag` aur `IntFlag` hote hain bit-flag enums ke liye, permissions jaisi cheezon ke liye kaam ke:

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


# Bitwise OR se combine karo
user_perms = Permission.READ | Permission.WRITE
print(user_perms)                          # Permission.READ_WRITE
print(Permission.READ in user_perms)       # True
print(Permission.DELETE in user_perms)     # False
print(Permission.ADMIN in user_perms)      # False

admin_perms = Permission.ALL
print(Permission.DELETE in admin_perms)    # True

# Ek permission hataao
modified = admin_perms & ~Permission.DELETE
print(Permission.DELETE in modified)       # False
print(Permission.READ in modified)         # True
```

> [!tip]
> Isko UPI app ke permission system jaisa socho — kisi user ko sirf "view balance" chahiye, kisi ko "view + transfer" dono. `Flag` enum se tum in permissions ko bits ki tarah combine aur remove kar sakte ho, bina alag-alag boolean flags maintain kiye.

---

## Practice Exercises

### Exercise 1: Enums Se State Machine

Ek task management state machine banao:

```python
class TaskState(Enum):
    BACKLOG = "backlog"
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    IN_REVIEW = "in_review"
    DONE = "done"
    ARCHIVED = "archived"
```

Yeh methods add karo:
- `can_transition_to(new_state)` — valid transition rules ke saath
- `is_active` property
- `next_states` property jo valid next states return kare

Ek `Task` dataclass banao jo is enum ko use kare aur transitions validate kare.

### Exercise 2: NamedTuples Se Configuration

Ek type-safe configuration system banao:

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

Factory functions banao jo har environment ke liye sahi config return karein. Configs ko immutable aur dict keys ke tarah usable banao.

### Exercise 3: Card Game

Cards ka deck model karo:

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

Implement karo:
- Ek `Deck` class jo saare 52 cards generate kare
- Shuffle aur deal methods
- Card comparison (Rank use karke)
- Display formatting: "Ace of Spades"

### Exercise 4: Permission System

`Flag` enums use karke, ek role-based permission system banao:

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

Functions banao jo permissions check karein, roles combine karein, aur audit-friendly permission descriptions generate karein.

---

## Key Takeaways

1. **Python `Enum` members objects hote hain**, apni value nahi hote -- `Status.OK != 200` jab tak `IntEnum` use na karo
2. **`StrEnum`/`IntEnum` use karo** jab enums ko apni value jaisa behave karana ho (TS enums ke sabse kareeb)
3. **`auto()`** values khud-ba-khud generate karta hai (auto-incrementing jaisa)
4. **Python enums methods aur properties support karte hain** -- yeh real classes hain
5. **`NamedTuple`** = immutable struct with tuple behavior. TypeScript mein aisa koi equivalent nahi jo named fields aur tuple indexing dono combine kare
6. **Simple immutable data ke liye NamedTuple**, baaki sab ke liye dataclass
7. **Python enums iterable hote hain** -- `for status in Status:` bas kaam kar jaata hai
8. **`Flag` enum** bitwise permission systems ke liye -- native support hai
9. **`_asdict()`** aur **`_replace()`** NamedTuple ke key methods hain -- serialization aur modified copies banane ke liye
