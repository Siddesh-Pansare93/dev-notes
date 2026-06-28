# 04 - Advanced Types

## Extra Validation Types: EmailStr, HttpUrl, and Friends

Pydantic provides specialized types that go beyond basic `str`/`int`/`float`. These are like using Zod's `.email()`, `.url()`, etc., but as standalone types.

### EmailStr

```bash
pip install "pydantic[email]"
```

```python
from pydantic import BaseModel, EmailStr

class User(BaseModel):
    name: str
    email: EmailStr

User(name="Alice", email="alice@example.com")   # works
User(name="Alice", email="not-an-email")         # ValidationError
User(name="Alice", email="alice@example")         # ValidationError
```

Zod equivalent:
```typescript
z.string().email()
```

### HttpUrl and Other URL Types

```python
from pydantic import BaseModel, HttpUrl, AnyUrl

class Website(BaseModel):
    homepage: HttpUrl        # must be http:// or https://
    any_link: AnyUrl         # any valid URL scheme

Website(homepage="https://example.com")  # works
Website(homepage="ftp://example.com")    # ValidationError (not HTTP)
Website(homepage="not a url")            # ValidationError

# The parsed URL is a Url object, not a plain string
site = Website(homepage="https://example.com/path?q=1")
print(str(site.homepage))   # "https://example.com/path?q=1"
print(site.homepage.scheme) # "https"
print(site.homepage.host)   # "example.com"
```

Zod equivalent:
```typescript
z.string().url()
```

### Other Useful Types from Pydantic

```python
from pydantic import (
    BaseModel,
    IPvAnyAddress,
    FilePath,        # must be a file that exists
    DirectoryPath,   # must be a directory that exists
    NewPath,         # must NOT exist yet
    SecretStr,       # hides value in repr/logs
)

class ServerConfig(BaseModel):
    bind_address: IPvAnyAddress
    cert_file: FilePath
    log_dir: DirectoryPath
    api_key: SecretStr

config = ServerConfig(
    bind_address="192.168.1.1",
    cert_file="/etc/ssl/cert.pem",   # must exist
    log_dir="/var/log/app",           # must exist
    api_key="super-secret-key"
)

print(config.api_key)                  # SecretStr('**********')
print(config.api_key.get_secret_value())  # "super-secret-key"
```

`SecretStr` is particularly useful -- it prevents accidental logging of sensitive data. There is no direct Zod equivalent for this.

---

## Constrained Types: conint, constr, confloat

These are shorthand for creating constrained types without `Field()`:

```python
from pydantic import BaseModel, conint, constr, confloat

class Product(BaseModel):
    name: constr(min_length=1, max_length=100)
    price: confloat(gt=0, le=99999.99)
    quantity: conint(ge=0, le=10000)
    sku: constr(pattern=r"^[A-Z]{2}-\d{4}$")
```

This is equivalent to:

```python
from pydantic import BaseModel, Field

class Product(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    price: float = Field(gt=0, le=99999.99)
    quantity: int = Field(ge=0, le=10000)
    sku: str = Field(pattern=r"^[A-Z]{2}-\d{4}$")
```

The `Annotated` + `Field()` style is now preferred in modern Pydantic v2 code, but you will see `conint`/`constr` in existing codebases.

```python
from typing import Annotated
from pydantic import Field

# Modern style (preferred)
PositiveInt = Annotated[int, Field(gt=0)]
ShortStr = Annotated[str, Field(max_length=50)]
```

---

## Literal Types

`Literal` restricts a field to specific exact values. This is like a TypeScript string literal union or Zod's `z.enum()`.

```python
from typing import Literal
from pydantic import BaseModel

class Task(BaseModel):
    title: str
    status: Literal["todo", "in_progress", "done"]
    priority: Literal[1, 2, 3]

# Valid
Task(title="Fix bug", status="todo", priority=1)

# Invalid
Task(title="Fix bug", status="pending", priority=1)
# ValidationError: status - Input should be 'todo', 'in_progress' or 'done'

Task(title="Fix bug", status="todo", priority=5)
# ValidationError: priority - Input should be 1, 2 or 3
```

### TypeScript/Zod Equivalents

```typescript
// TypeScript
type Status = "todo" | "in_progress" | "done";
type Priority = 1 | 2 | 3;

// Zod
const StatusSchema = z.enum(["todo", "in_progress", "done"]);
const PrioritySchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);
```

### Python Enum vs Literal

You can also use Python enums:

```python
from enum import Enum

class Status(str, Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    DONE = "done"

class Task(BaseModel):
    title: str
    status: Status

task = Task(title="Fix bug", status="todo")
print(task.status)        # Status.TODO
print(task.status.value)  # "todo"
```

**When to use which:**
- `Literal`: simple, inline, for a few values. Good when you just need to restrict values.
- `Enum`: when you need the enum as a reusable type with methods, or when the set of values is used in many places.

---

## Discriminated Unions (Tagged Unions)

This is a concept you already know from TypeScript! A discriminated union uses a shared field (the "discriminator" or "tag") to determine which type in a union to use.

### TypeScript Discriminated Union

```typescript
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rectangle"; width: number; height: number }
  | { kind: "triangle"; base: number; height: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;
    case "rectangle":
      return shape.width * shape.height;
    case "triangle":
      return 0.5 * shape.base * shape.height;
  }
}
```

### Pydantic Discriminated Union

```python
from typing import Annotated, Literal, Union
from pydantic import BaseModel, Field

class Circle(BaseModel):
    kind: Literal["circle"]
    radius: float

class Rectangle(BaseModel):
    kind: Literal["rectangle"]
    width: float
    height: float

class Triangle(BaseModel):
    kind: Literal["triangle"]
    base: float
    height: float

Shape = Annotated[
    Union[Circle, Rectangle, Triangle],
    Field(discriminator="kind")
]

class Canvas(BaseModel):
    shapes: list[Shape]

canvas = Canvas(shapes=[
    {"kind": "circle", "radius": 5.0},
    {"kind": "rectangle", "width": 10, "height": 20},
    {"kind": "triangle", "base": 6, "height": 8},
])

for shape in canvas.shapes:
    match shape:  # Python 3.10+ pattern matching
        case Circle(radius=r):
            print(f"Circle with radius {r}")
        case Rectangle(width=w, height=h):
            print(f"Rectangle {w}x{h}")
        case Triangle(base=b, height=h):
            print(f"Triangle base={b} height={h}")
```

### Why Discriminated Unions Matter

Without the discriminator, Pydantic tries each union member in order and uses the first one that validates. This is slow and can produce confusing errors. With a discriminator, Pydantic looks at the tag field first and immediately knows which model to validate against.

```python
# WITHOUT discriminator - Pydantic tries each in order (slow, ambiguous)
Shape = Union[Circle, Rectangle, Triangle]

# WITH discriminator - Pydantic checks "kind" first (fast, precise)
Shape = Annotated[Union[Circle, Rectangle, Triangle], Field(discriminator="kind")]
```

### Zod Equivalent

```typescript
const CircleSchema = z.object({ kind: z.literal("circle"), radius: z.number() });
const RectangleSchema = z.object({ kind: z.literal("rectangle"), width: z.number(), height: z.number() });

const ShapeSchema = z.discriminatedUnion("kind", [CircleSchema, RectangleSchema]);
```

---

## Generic Models

Pydantic supports Python generics, letting you create reusable model templates. This is like TypeScript generics.

### TypeScript Generic

```typescript
interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

// Usage
const userResponse: ApiResponse<User> = {
  data: { name: "Alice", age: 30 },
  status: 200,
  message: "OK",
};
```

### Pydantic Generic

```python
from typing import Generic, TypeVar
from pydantic import BaseModel

T = TypeVar("T")

class ApiResponse(BaseModel, Generic[T]):
    data: T
    status: int
    message: str

class User(BaseModel):
    name: str
    age: int

class Product(BaseModel):
    name: str
    price: float

# Use with different types
user_response = ApiResponse[User](
    data={"name": "Alice", "age": 30},
    status=200,
    message="OK"
)
print(type(user_response.data))  # <class 'User'>

product_response = ApiResponse[Product](
    data={"name": "Laptop", "price": 999.99},
    status=200,
    message="OK"
)
print(type(product_response.data))  # <class 'Product'>
```

### Paginated Response (Real-World Example)

```python
from typing import Generic, TypeVar
from pydantic import BaseModel, Field

T = TypeVar("T")

class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int = Field(ge=1)
    per_page: int = Field(ge=1, le=100)
    has_next: bool
    has_prev: bool

class User(BaseModel):
    id: int
    name: str

# In FastAPI:
# @app.get("/users", response_model=PaginatedResponse[User])
# async def list_users(page: int = 1):
#     ...

response = PaginatedResponse[User](
    items=[{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob"}],
    total=50,
    page=1,
    per_page=10,
    has_next=True,
    has_prev=False,
)
```

---

## Custom Types with Validators

### Using AfterValidator (Recommended Approach)

```python
from typing import Annotated
from pydantic import AfterValidator, BaseModel

def validate_even(v: int) -> int:
    if v % 2 != 0:
        raise ValueError(f"{v} is not even")
    return v

EvenInt = Annotated[int, AfterValidator(validate_even)]

class Config(BaseModel):
    buffer_size: EvenInt
    thread_count: EvenInt

Config(buffer_size=1024, thread_count=8)  # works
Config(buffer_size=1023, thread_count=8)  # ValidationError: 1023 is not even
```

### Using BeforeValidator (Transform Before Type Checking)

```python
from typing import Annotated
from pydantic import BeforeValidator, BaseModel

def normalize_phone(v: str) -> str:
    """Strip non-digits, then format."""
    digits = "".join(c for c in str(v) if c.isdigit())
    if len(digits) == 10:
        return f"+1{digits}"
    elif len(digits) == 11 and digits.startswith("1"):
        return f"+{digits}"
    raise ValueError(f"Invalid phone number: {v}")

PhoneNumber = Annotated[str, BeforeValidator(normalize_phone)]

class Contact(BaseModel):
    name: str
    phone: PhoneNumber

c = Contact(name="Alice", phone="(555) 123-4567")
print(c.phone)  # "+15551234567"

c = Contact(name="Bob", phone="1-555-987-6543")
print(c.phone)  # "+15559876543"
```

### Using PlainValidator (Full Control)

```python
from typing import Annotated
from pydantic import PlainValidator, BaseModel

def parse_color(v) -> tuple[int, int, int]:
    """Parse hex color string or RGB tuple."""
    if isinstance(v, (list, tuple)) and len(v) == 3:
        r, g, b = v
    elif isinstance(v, str) and v.startswith("#") and len(v) == 7:
        r = int(v[1:3], 16)
        g = int(v[3:5], 16)
        b = int(v[5:7], 16)
    else:
        raise ValueError(f"Cannot parse color: {v}")

    if not all(0 <= c <= 255 for c in (r, g, b)):
        raise ValueError("Color values must be 0-255")
    return (r, g, b)

Color = Annotated[tuple[int, int, int], PlainValidator(parse_color)]

class Theme(BaseModel):
    primary: Color
    secondary: Color

theme = Theme(primary="#FF5733", secondary=[100, 200, 255])
print(theme.primary)    # (255, 87, 51)
print(theme.secondary)  # (100, 200, 255)
```

---

## UUID, datetime, and Path Types

Pydantic natively handles many Python standard library types:

### UUID

```python
from uuid import UUID, uuid4
from pydantic import BaseModel, Field

class Record(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    name: str

r = Record(name="Test")
print(r.id)  # UUID('a1b2c3d4-...')

# Accepts string input and converts to UUID
r2 = Record(id="550e8400-e29b-41d4-a716-446655440000", name="Test")
print(type(r2.id))  # <class 'uuid.UUID'>
```

TypeScript equivalent (with Zod):
```typescript
z.string().uuid()  // Zod just validates it's a UUID string
```

Key difference: Pydantic converts strings TO Python `UUID` objects. Zod just validates the string format.

### datetime, date, time

```python
from datetime import datetime, date, time, timedelta
from pydantic import BaseModel

class Event(BaseModel):
    name: str
    start: datetime
    end: datetime
    date_only: date
    time_only: time

event = Event(
    name="Meeting",
    start="2024-03-15T10:00:00",        # ISO string -> datetime
    end="2024-03-15T11:00:00Z",          # with timezone
    date_only="2024-03-15",              # ISO string -> date
    time_only="10:00:00",                # ISO string -> time
)
print(type(event.start))  # <class 'datetime.datetime'>

# Unix timestamps also work for datetime
event2 = Event(
    name="Event",
    start=1710500400,                     # unix timestamp -> datetime
    end=1710504000,
    date_only="2024-03-15",
    time_only="10:00:00",
)
```

### Path

```python
from pathlib import Path
from pydantic import BaseModel

class ProjectConfig(BaseModel):
    root_dir: Path
    output_dir: Path

config = ProjectConfig(
    root_dir="/home/user/project",   # string -> Path object
    output_dir="./dist"
)
print(type(config.root_dir))  # <class 'pathlib.PosixPath'>
print(config.root_dir / "src" / "main.py")  # /home/user/project/src/main.py
```

---

## Complete Type Reference Table

| Pydantic Type | Input Accepted | Output Type | Zod Equivalent |
|---|---|---|---|
| `str` | Any string | `str` | `z.string()` |
| `int` | Integer or int-parseable string | `int` | `z.number().int()` |
| `float` | Number or number-parseable string | `float` | `z.number()` |
| `bool` | Boolean, 0/1, "true"/"false" | `bool` | `z.boolean()` |
| `datetime` | ISO string, unix timestamp | `datetime` | `z.date()` / `z.string().datetime()` |
| `UUID` | UUID string or UUID object | `UUID` | `z.string().uuid()` |
| `EmailStr` | Valid email string | `str` | `z.string().email()` |
| `HttpUrl` | Valid HTTP(S) URL string | `Url` | `z.string().url()` |
| `Path` | Path string | `Path` | N/A |
| `SecretStr` | Any string (hidden in repr) | `SecretStr` | N/A |
| `IPvAnyAddress` | IP address string | `IPv4Address`/`IPv6Address` | N/A |
| `Literal["a","b"]` | One of the literal values | Same type | `z.enum(["a","b"])` |

---

## Practice Exercises

### Exercise 1: URL Bookmark Manager
Create a `Bookmark` model with: `title` (str), `url` (HttpUrl), `tags` (list of strings), `created_at` (datetime, default to now). Parse a few bookmarks from JSON data.

### Exercise 2: Discriminated Union for Notifications
Create a notification system with three types: `EmailNotification` (has `to_email: EmailStr`, `subject: str`), `SMSNotification` (has `phone_number: str`, `message: str`), `PushNotification` (has `device_id: str`, `title: str`, `body: str`). Each has a `type` Literal discriminator. Create a `NotificationBatch` model with `notifications: list[Notification]` using a discriminated union.

### Exercise 3: Generic Wrapper
Create a generic `Result` model (inspired by Rust's Result type) that has `success: bool`, `data: T | None`, `error: str | None`. Add a model validator that ensures `data` is present when `success=True` and `error` is present when `success=False`.

### Exercise 4: Custom Color Type
Create a `HexColor` custom type using `AfterValidator` that accepts strings like `"#FF5733"` or `"#fff"` (3-char shorthand), validates them, and normalizes to uppercase 6-character format. Use it in a `Theme` model.

### Exercise 5: Mixed Types
Create an `AppConfig` model that uses at least 6 different advanced types: `UUID` (for app_id), `HttpUrl` (for api_endpoint), `EmailStr` (for admin_email), `SecretStr` (for api_key), `Path` (for log_directory), `datetime` (for deployed_at), `Literal` (for environment). Instantiate it from a dictionary of strings and verify all types are correctly parsed.

### Exercise 6: Discriminated Union API
Create a payment system with: `CreditCardPayment`, `BankTransferPayment`, `CryptoPayment`. Each has different fields. Use a discriminated union on a `method` field. Create a `Transaction` model containing one of these payment types plus `amount`, `currency`, and `timestamp`. Validate several transactions with different payment methods.
