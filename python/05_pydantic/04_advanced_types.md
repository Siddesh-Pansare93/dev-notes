# 04 - Advanced Types

## Extra Validation Types: EmailStr, HttpUrl, aur Sab Kuch

Pydantic kuch specialized types provide karta hai jo basic `str`/`int`/`float` se bahut aage ka kaam karte hain. Jaise Zod ke `.email()`, `.url()` wale validators hote hain, waise hi yahan hain — bas zyada powerful aur Python-like.

### EmailStr

Pehle install kar le:

```bash
pip install "pydantic[email]"
```

Ab use karte hain:

```python
from pydantic import BaseModel, EmailStr

class User(BaseModel):
    name: str
    email: EmailStr

User(name="Alice", email="alice@example.com")   # works
User(name="Alice", email="not-an-email")         # ValidationError
User(name="Alice", email="alice@example")         # ValidationError
```

> [!tip]
> TypeScript mein toh Zod se `z.string().email()` likhte ho — Python mein direct type use karo.

---

### HttpUrl aur URL Types

Socho ek delivery app jaise Zomato mein — har restaurant ke paas ek homepage URL hota hai, jo valid HTTPS hona chahiye. Usi tarah, har API ke paas ek endpoint hota hai. Pydantic ko batao ki kaunsa URL type chahiye:

```python
from pydantic import BaseModel, HttpUrl, AnyUrl

class Website(BaseModel):
    homepage: HttpUrl        # sirf http:// ya https:// allow karega
    any_link: AnyUrl         # kisi bhi scheme ko allow karega

Website(homepage="https://example.com")  # works
Website(homepage="ftp://example.com")    # ValidationError (FTP nahi, HTTP chahiye)
Website(homepage="not a url")            # ValidationError

# Parsed URL ek Url object hota hai, plain string nahi
site = Website(homepage="https://example.com/path?q=1")
print(str(site.homepage))   # "https://example.com/path?q=1"
print(site.homepage.scheme) # "https"
print(site.homepage.host)   # "example.com"
```

> [!info]
> URL ko parts mein break kar sakte ho — scheme, host, path, query, sab milta hai Pydantic mein.

---

### Aur Useful Types

Maan lete ho ek server ka config file banate ho. Database path ho, certificate file ho, API key ho. Har ek ka validation alag hona chahiye:

```python
from pydantic import (
    BaseModel,
    IPvAnyAddress,
    FilePath,        # file exist karna chahiye, nahi toh error
    DirectoryPath,   # folder exist karna chahiye
    NewPath,         # isko abhi exist nahi hona chahiye
    SecretStr,       # logs mein hidden rahega, security ke liye
)

class ServerConfig(BaseModel):
    bind_address: IPvAnyAddress
    cert_file: FilePath
    log_dir: DirectoryPath
    api_key: SecretStr

config = ServerConfig(
    bind_address="192.168.1.1",
    cert_file="/etc/ssl/cert.pem",   # exists hona chahiye
    log_dir="/var/log/app",           # exists hona chahije
    api_key="super-secret-key"
)

print(config.api_key)                  # SecretStr('**********')
print(config.api_key.get_secret_value())  # "super-secret-key"
```

> [!warning]
> `SecretStr` ek badi baat hai — jab tum print karo ya log karo, toh `**********` dikhega, actual value nahi. Production mein bahut zaruri hai ye! Zod mein directly ye feature nahi hai.

---

## Constrained Types: conint, constr, confloat

Maan lete ho Flipkart par ek product list banate ho. Name 1-100 characters ka ho, price 0.01 se 99999 ke beech ho, quantity 0-10000 ke beech ho. Har ek field ke liye validation rules hain.

Pydantic mein shorthand hai — `Field()` likha nahi par constraints likha:

```python
from pydantic import BaseModel, conint, constr, confloat

class Product(BaseModel):
    name: constr(min_length=1, max_length=100)
    price: confloat(gt=0, le=99999.99)
    quantity: conint(ge=0, le=10000)
    sku: constr(pattern=r"^[A-Z]{2}-\d{4}$")
```

Ye bilkul same cheez hai, sirf alag tarika:

```python
from pydantic import BaseModel, Field

class Product(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    price: float = Field(gt=0, le=99999.99)
    quantity: int = Field(ge=0, le=10000)
    sku: str = Field(pattern=r"^[A-Z]{2}-\d{4}$")
```

Lekin ek baat — modern Pydantic v2 mein `Annotated` + `Field()` style ko prefer karte hain. Purane codebases mein `conint`/`constr` dikha jayega, par naya likhte wakt Annotated use karo:

```python
from typing import Annotated
from pydantic import Field

# Modern style (best practice)
PositiveInt = Annotated[int, Field(gt=0)]
ShortStr = Annotated[str, Field(max_length=50)]
```

> [!tip]
> Agar purane codebase maintain kar rahe ho, toh `conint` samajh lo. Naya likha jaye toh `Annotated` likh.

---

## Literal Types

Kya hota hai jab tum UPI payment accept karte ho? Status teen states mein hota hai — "pending", "success", "failed". Kuch aur values allowed nahi hain.

`Literal` exactly ye hi karta hai — specific values only:

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

### TypeScript/Zod Equivalent

```typescript
// TypeScript
type Status = "todo" | "in_progress" | "done";
type Priority = 1 | 2 | 3;

// Zod
const StatusSchema = z.enum(["todo", "in_progress", "done"]);
const PrioritySchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);
```

---

### Python Enum vs Literal — Kaun Zyada Badhiya?

Ek aur tareeka hai — Python ke Enum use karo. Ye jab values ko methods ya logic ke sath bandi karna hota hai:

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

**Kab kaun use kare?**
- **Literal**: Jab simple values chahiye, koi methods nahi. Inline sab likha hai.
- **Enum**: Jab enum ko multiple jageho use karna ho, ya values ke sath methods bandi karni ho.

> [!info]
> Literal tez hai, Enum zyada organized hai. Dono valid hain.

---

## Discriminated Unions (Tagged Unions) — TypeScript se Familiar!

Tum TypeScript mein discriminated unions likha hoga. Pydantic mein bilkul same concept hai!

Socho — ek geometry app mein tum shapes store kar rahe ho. Circle ko radius chahiye, Rectangle ko width + height chahiye, Triangle ko base + height. Tum kaise pata karo konsa shape data aaya?

**Tag use karo!** Ek field jo bata de "ye circle hai ya rectangle?"

### TypeScript mein Example

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

### Python Pydantic mein Same Cheez

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

### Kyun Zaruri Hai Discriminator?

Bina discriminator ke, Pydantic har union member ko ek-ek karke try karega. Slow hoga, confusing error aayegi. Discriminator se pehle `kind` field dekh leta hai aur seedha right type validate kar leta hai.

```python
# BINA discriminator - Pydantic har ek ko try karega (slow + ambiguous)
Shape = Union[Circle, Rectangle, Triangle]

# SAATH discriminator - Pydantic "kind" check karke seedha jump karega (fast + precise)
Shape = Annotated[Union[Circle, Rectangle, Triangle], Field(discriminator="kind")]
```

> [!warning]
> Agar `discriminator` na use karo, toh multiple union types mein validation complexity aur ambiguity hogi.

---

## Generic Models — Reusable Templates

Maan lete ho Swiggy API banate ho. Jab order fetch karte ho, toh response mein order data hota hai. Jab restaurant fetch karte ho, toh restaurant data hota hai. Response structure same — status, message, data — bas data type badlti hai.

**Generic Types** se ye template ek baar likho, phir kisi bhi type se use karo:

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

### Pydantic Generic — Same Cheez

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

# Different types ke sath use karo
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

### Real-World: Paginated Response

Bilkul real example — IRCTC jaise site par train search karte ho, toh response mein list of trains aata hai, total count, page number:

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

# FastAPI mein use:
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

## Custom Types with Validators — Apna Validation Logic

Kya hota hai jab tum chahte ho ek custom field validation likho jo Pydantic ke in-built types mein nahi hai? Jaise, ek number jo sirf even ho sakta hai, ya ek phone number jo formatted hona chahiye.

### AfterValidator — Type Aaye, Phir Check Karo (Recommended)

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

---

### BeforeValidator — Transform Karke Phir Type Check Karo

Maan lete ho phone number aata hai different formats mein — "(555) 123-4567" ya "555-123-4567" ya "5551234567". Tum normalize karke store karna chahte ho:

```python
from typing import Annotated
from pydantic import BeforeValidator, BaseModel

def normalize_phone(v: str) -> str:
    """Digits nikalo, format karo."""
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

> [!tip]
> **BeforeValidator** input ko transform karega, **AfterValidator** type check ke baad validate karega.

---

### PlainValidator — Poora Control Tere Paas

Jab complex logic chahiye — input ka type aur value dono check karne hain:

```python
from typing import Annotated
from pydantic import PlainValidator, BaseModel

def parse_color(v) -> tuple[int, int, int]:
    """Hex color ya RGB tuple parse karo."""
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

## UUID, datetime, aur Path Types

Python ke standard library mein bahut sare types hote hain. Pydantic inko natively support karta hai. Ab tension nahi le, directly use kar:

### UUID

Database mein records ka unique ID. Pydantic string se UUID object mein convert kar dega:

```python
from uuid import UUID, uuid4
from pydantic import BaseModel, Field

class Record(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    name: str

r = Record(name="Test")
print(r.id)  # UUID('a1b2c3d4-...')

# String input se automatic convert
r2 = Record(id="550e8400-e29b-41d4-a716-446655440000", name="Test")
print(type(r2.id))  # <class 'uuid.UUID'>
```

> [!info]
> Zod mein toh sirf string validation hota hai `z.string().uuid()`. Pydantic actual UUID object mein convert karega!

---

### datetime, date, time

IRCTC par train ticket book karte ho — exact time chahiye kab express train aayegi. ISO format:

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
    start="2024-03-15T10:00:00",        # ISO string -> datetime object
    end="2024-03-15T11:00:00Z",         # timezone support
    date_only="2024-03-15",             # ISO date -> date object
    time_only="10:00:00",               # time string -> time object
)
print(type(event.start))  # <class 'datetime.datetime'>

# Unix timestamps bhi accept karte hain
event2 = Event(
    name="Event",
    start=1710500400,                   # unix timestamp -> datetime
    end=1710504000,
    date_only="2024-03-15",
    time_only="10:00:00",
)
```

---

### Path — File System Paths

Project structure manage karte ho, directories handle karte ho — Path type use kar:

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

Ek nazar mein sab types:

| Pydantic Type | Input Accept | Output Type | Zod Equivalent |
|---|---|---|---|
| `str` | Koi bhi string | `str` | `z.string()` |
| `int` | Integer ya int-parseable string | `int` | `z.number().int()` |
| `float` | Number ya parseable string | `float` | `z.number()` |
| `bool` | Boolean, 0/1, "true"/"false" | `bool` | `z.boolean()` |
| `datetime` | ISO string, unix timestamp | `datetime` | `z.date()` / `z.string().datetime()` |
| `UUID` | UUID string ya UUID object | `UUID` | `z.string().uuid()` |
| `EmailStr` | Valid email string | `str` | `z.string().email()` |
| `HttpUrl` | Valid HTTP(S) URL string | `Url` object | `z.string().url()` |
| `Path` | Path string | `Path` object | N/A |
| `SecretStr` | Koi bhi string (hidden repr) | `SecretStr` | N/A |
| `IPvAnyAddress` | IP address string | `IPv4Address`/`IPv6Address` | N/A |
| `Literal["a","b"]` | Literal values mein se ek | Same type | `z.enum(["a","b"])` |

---

## Practice Exercises

### Exercise 1: URL Bookmark Manager

Ek `Bookmark` model bana jo store kare: title (str), URL (HttpUrl), tags (list), created_at (datetime, default ab). JSON data se parse karo.

### Exercise 2: Discriminated Union for Notifications

Notification system bana — EmailNotification (email + subject), SMSNotification (phone + message), PushNotification (device_id + title + body). Har ek mein `type` Literal field ho. `NotificationBatch` mein list of unions use karo.

### Exercise 3: Generic Wrapper

Ek generic `Result` model bana (Rust style) — success: bool, data: T | None, error: str | None. Model validator add karo jo ensure kare data present ho jab success=True.

### Exercise 4: Custom Color Type

Ek `HexColor` type `AfterValidator` se bana. "#FF5733" ya "#fff" (3-char shorthand) accept karo, validate karo, uppercase 6-char format mein normalize karo. Theme model mein use karo.

### Exercise 5: Mixed Types

`AppConfig` model bana jo minimum 6 types use kare: UUID (app_id), HttpUrl (api_endpoint), EmailStr (admin_email), SecretStr (api_key), Path (log_directory), datetime (deployed_at), Literal (environment). Dictionary se instance banao, types verify karo.

### Exercise 6: Discriminated Union API

Payment system bana — CreditCardPayment, BankTransferPayment, CryptoPayment. Har ek ke alag fields. Discriminated union use karo `method` field par. `Transaction` model banao amount, currency, timestamp ke sath. Different payment methods se transactions validate karo.

---

## Key Takeaways

- **EmailStr, HttpUrl, SecretStr** — specialized types jo validation + parsing dono handle karte hain
- **Constrained types (conint, constr)** — sirf values restricted karte ho; modern style mein `Annotated + Field()` use karo
- **Literal** — specific values only allowed; Enum se zyada simple, Enum se zyada organized
- **Discriminated Unions** — TypeScript jaise, `Field(discriminator="tag")` se performance aur clarity dono milta hai
- **Generics** — reusable templates; `Generic[T]` se API responses, paginated data, sab handle kar
- **Validators (AfterValidator, BeforeValidator, PlainValidator)** — custom logic; input transform, type check, sab kuch possible
- **Standard library types** — UUID, datetime, Path, date, time — Pydantic sab ko natively support karta hai aur convert bhi kar deta hai
