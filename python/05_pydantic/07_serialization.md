# 07 - Serialization

## model_dump(): Dictionary Mein Convert Karna

Agar tume Pydantic model ko Python dictionary mein convert karna ho — chaahe database mein data daalna ho, API se response bhejna ho, ya phir doosre functions ko pass karna ho — **`model_dump()`** tumhara best friend hai. Yeh method sabse zyada use hota hai.

```python
from pydantic import BaseModel
from datetime import datetime

class User(BaseModel):
    id: int
    name: str
    email: str
    created_at: datetime
    is_active: bool = True

user = User(
    id=1,
    name="Alice",
    email="alice@example.com",
    created_at="2024-03-15T10:00:00Z"
)

# Seedha dump kar do
data = user.model_dump()
print(data)
# {
#     'id': 1,
#     'name': 'Alice',
#     'email': 'alice@example.com',
#     'created_at': datetime.datetime(2024, 3, 15, 10, 0, tzinfo=TzInfo(UTC)),
#     'is_active': True
# }
```

### Include aur Exclude Karna

Socho ki Zomato ke order details ho — order_id, customer_name, address, payment_method — lekin Swiggy ko sirf order_id aur customer_name bhejni hai. Woh sab kuch mat bhejo, bas jo chahiye woh bhejo.

```python
# Sirf ye fields bhejo (lodash ke _.pick() jaisa)
user.model_dump(include={"id", "name", "email"})
# {'id': 1, 'name': 'Alice', 'email': 'alice@example.com'}

# Ye fields exclude kar (lodash ke _.omit() jaisa)
user.model_dump(exclude={"created_at", "is_active"})
# {'id': 1, 'name': 'Alice', 'email': 'alice@example.com'}
```

JavaScript mein tumhe yeh lodash se karna padhega:

```typescript
// JavaScript equivalents
import _ from "lodash";
_.pick(user, ["id", "name", "email"]);
_.omit(user, ["createdAt", "isActive"]);
```

### None, Default, aur Unset Fields Ko Skip Karna

Kya hota hai jab PATCH request aata hai? User sirf apna email update karna chahta hai, baaki sab fields `None` se bhare hote hain. Unhe database query mein bhejoge to galat ho jayega.

```python
class UserUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    bio: str | None = None
    age: int | None = None

update = UserUpdate(name="Alice", email="alice@new.com")

# Sab fields aa jayenge, even None ones
update.model_dump()
# {'name': 'Alice', 'email': 'alice@new.com', 'bio': None, 'age': None}

# None values skip kar (PATCH updates ke liye perfect!)
update.model_dump(exclude_none=True)
# {'name': 'Alice', 'email': 'alice@new.com'}

# Sirf jo fields explicitly pass kiye gaye the, woh bhejo
update.model_dump(exclude_unset=True)
# {'name': 'Alice', 'email': 'alice@new.com'}

# Jo fields apni default value par baqae hain, unhe skip kar
update.model_dump(exclude_defaults=True)
# {'name': 'Alice', 'email': 'alice@new.com'}
```

> [!tip] **Sirf Unset Fields Bhejo**
> PATCH endpoints ke liye `exclude_unset=True` superpowers deta hai. Agar user ne kuch bheja nahi to database ke current value par mat touch kar.

FastAPI ke PATCH endpoint ka pattern dekho:

```python
# FastAPI PATCH endpoint pattern
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class UserUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    bio: str | None = None

@app.patch("/users/{user_id}")
async def update_user(user_id: int, updates: UserUpdate):
    # Sirf woh fields jo client ne bheje hain
    update_data = updates.model_dump(exclude_unset=True)
    # {'name': 'Alice'} -- sirf yeh, baaki sab None nahi
    # Is data ko SQL UPDATE mein use kar
    return update_data
```

Node.js/Express mein tume manually filter karna padhega:

```typescript
// Express PATCH endpoint
app.patch("/users/:id", (req, res) => {
  // JS mein manually filter karna padta hai undefined values:
  const updates = Object.fromEntries(
    Object.entries(req.body).filter(([_, v]) => v !== undefined)
  );
});
```

---

## model_dump_json(): JSON String Mein Convert Karna

`model_dump()` gives Python dict, lekin agar string mein JSON chahiye? **`model_dump_json()`** seedha JSON string return karta hai. Aur best part — yeh `datetime`, `UUID`, `Url` jaise types ko handle kar leta hai, jo normally `json.dumps()` mein error aata hai!

```python
from pydantic import BaseModel
from datetime import datetime
from uuid import UUID

class Event(BaseModel):
    id: UUID
    name: str
    start: datetime
    tags: list[str]

event = Event(
    id="550e8400-e29b-41d4-a716-446655440000",
    name="Conference",
    start="2024-06-15T09:00:00Z",
    tags=["tech", "python"]
)

# Compact JSON
json_str = event.model_dump_json()
print(json_str)
# '{"id":"550e8400-e29b-41d4-a716-446655440000","name":"Conference","start":"2024-06-15T09:00:00Z","tags":["tech","python"]}'

# Readable banao
json_str = event.model_dump_json(indent=2)
print(json_str)
# {
#   "id": "550e8400-e29b-41d4-a716-446655440000",
#   "name": "Conference",
#   "start": "2024-06-15T09:00:00Z",
#   "tags": [
#     "tech",
#     "python"
#   ]
# }
```

### Kyun `json.dumps()` use nahi kar sakte?

Agar normal `json.dumps()` use karo to datetime types fail kar jayenge:

```python
import json

# Yeh FAIL hota hai:
json.dumps(event.model_dump())
# TypeError: Object of type datetime is not JSON serializable

# Custom encoder likho... hacky lag raha hai:
json.dumps(event.model_dump(), default=str)  # hacky!

# Pydantic ka model_dump_json() seedha kaam kar jaata hai:
event.model_dump_json()  # bas ho gaya!
```

`include`, `exclude`, `exclude_none`, `exclude_unset` — sab options `model_dump_json()` ke saath bhi kaam karte hain:

```python
event.model_dump_json(exclude={"id"}, indent=2)
```

---

## Aliases: Field Name vs Serialization Name

Ek baar socho — JavaScript frontend `firstName`, `lastName` bhejta hai (camelCase), lekin Python mein `first_name`, `last_name` use karte ho (snake_case). Dono languages ke naming conventions alag hain. Aliases is problem ko solve karte hain!

Alias = ek field ke liye alag naam serialization mein.

### Basic Alias Example

```python
from pydantic import BaseModel, Field

class User(BaseModel):
    first_name: str = Field(alias="firstName")
    last_name: str = Field(alias="lastName")

# API se camelCase mein aaya data (alias ke naam se)
user = User(firstName="Alice", lastName="Smith")
print(user.first_name)  # "Alice" (Python attribute snake_case mein hai)

# Dump karo — by default snake_case return hota hai
print(user.model_dump())
# {'first_name': 'Alice', 'last_name': 'Smith'}

# Agar by_alias=True doge to alias names waapas jayenge
print(user.model_dump(by_alias=True))
# {'firstName': 'Alice', 'lastName': 'Smith'}
```

### TypeScript/JavaScript Analogy

TypeScript/NestJS mein decorators use hote hain:

```typescript
// class-transformer (TypeScript)
class User {
  @Expose({ name: "firstName" })
  first_name: string;

  @Expose({ name: "lastName" })
  last_name: string;
}

// Java/Kotlin mein Jackson use hota hai:
// @JsonProperty("firstName")
// val firstName: String
```

### Teenon Types ke Aliases

Pydantic v2 mein three alag options hain:

```python
from pydantic import BaseModel, Field

class User(BaseModel):
    name: str = Field(
        alias="userName",                    # both validation aur serialization ke liye
        validation_alias="user_name_input",  # sirf input/parsing ke liye
        serialization_alias="userName",      # sirf output/dump ke liye
    )
```

Mostly bas `alias` ya phir `validation_alias` + `serialization_alias` pair use hota hai.

### Practical Pattern: API Model

```python
from pydantic import BaseModel, Field, ConfigDict

class ApiUser(BaseModel):
    # JavaScript se camelCase aata hai, output bhi camelCase, lekin Python mein snake_case use kar
    model_config = ConfigDict(populate_by_name=True)

    user_id: int = Field(alias="userId")
    first_name: str = Field(alias="firstName")
    last_name: str = Field(alias="lastName")
    email_address: str = Field(alias="emailAddress")

# Dono tarike se create kar sakte ho (populate_by_name=True ki wajah se)
user = ApiUser(userId=1, firstName="Alice", lastName="Smith", emailAddress="alice@example.com")
# YA
user = ApiUser(user_id=1, first_name="Alice", last_name="Smith", email_address="alice@example.com")

# Python code mein snake_case use kar
print(user.first_name)  # "Alice"

# API response ke liye camelCase se serialize kar
print(user.model_dump(by_alias=True))
# {'userId': 1, 'firstName': 'Alice', 'lastName': 'Smith', 'emailAddress': 'alice@example.com'}
```

### AliasGenerator: Automatic camelCase

Har field par manually alias likhna boring hai? Pydantic ke paas automatic generator hai:

```python
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

class ApiModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,  # automatic snake_case to camelCase
        populate_by_name=True,  # both names accept kar
    )

class UserResponse(ApiModel):
    user_id: int
    first_name: str
    last_name: str
    email_address: str
    is_active: bool = True

# JavaScript frontend se camelCase input aaya
user = UserResponse.model_validate({
    "userId": 1,
    "firstName": "Alice",
    "lastName": "Smith",
    "emailAddress": "alice@example.com"
})

# Python mein snake_case
print(user.first_name)

# Output camelCase (JS frontend ke liye)
print(user.model_dump(by_alias=True))
# {'userId': 1, 'firstName': 'Alice', 'lastName': 'Smith', 'emailAddress': 'alice@example.com', 'isActive': True}
```

> [!info] **API Pattern**
> JavaScript frontend waale APIs banate ho to ek base `ApiModel` class bana de `to_camel` alias generator ke saath. Phir saare models usse inherit kar.

---

## Custom Serializers with @field_serializer

Kabhie kabhi tume ek field ko bilkul specific tarike se serialize karna hota hai — money ko currency symbol ke saath, dates ko readable format mein, etc. Yeh `@field_serializer` decorator se hota hai:

```python
from pydantic import BaseModel, field_serializer
from datetime import datetime
from decimal import Decimal

class Product(BaseModel):
    name: str
    price: Decimal
    created_at: datetime

    @field_serializer("price")
    def serialize_price(self, value: Decimal) -> str:
        return f"${value:.2f}"

    @field_serializer("created_at")
    def serialize_created_at(self, value: datetime) -> str:
        return value.strftime("%Y-%m-%d %H:%M")

product = Product(
    name="Laptop",
    price=Decimal("999.99"),
    created_at="2024-03-15T10:30:00"
)

print(product.model_dump())
# {'name': 'Laptop', 'price': '$999.99', 'created_at': '2024-03-15 10:30'}

print(product.model_dump_json())
# '{"name":"Laptop","price":"$999.99","created_at":"2024-03-15 10:30"}'
```

### Conditional Serialization — Context-Aware

Socho, SSN number aur credit card details sensitive hain. Public API ko masked dikhana chahiye, lekin admin panel ko pura number chahiye. `SerializationInfo` context use karke yeh kaam kar sakte ho:

```python
from pydantic import BaseModel, field_serializer, SerializationInfo

class User(BaseModel):
    name: str
    email: str
    ssn: str

    @field_serializer("ssn")
    def mask_ssn(self, value: str, info: SerializationInfo) -> str:
        # Check karo context mein kya request aaya hai
        if info.context and info.context.get("show_full_ssn"):
            return value  # Admin context — pura SSN
        # Default: masked rakho
        return f"***-**-{value[-4:]}"

user = User(name="Alice", email="alice@example.com", ssn="123-45-6789")

# Default: masked
print(user.model_dump())
# {'name': 'Alice', 'email': 'alice@example.com', 'ssn': '***-**-6789'}

# Context pass karo: admin dekhega
print(user.model_dump(context={"show_full_ssn": True}))
# {'name': 'Alice', 'email': 'alice@example.com', 'ssn': '123-45-6789'}
```

### Serialization Modes: "json" vs "python"

`model_dump()` se Python dict milti hai, `model_dump_json()` se JSON string. Agar tume JSON mein sirf specific serializer chaiye to `when_used="json"` pass kar:

```python
from pydantic import field_serializer
from datetime import datetime

class Event(BaseModel):
    name: str
    date: datetime

    @field_serializer("date", when_used="json")
    def serialize_date_for_json(self, value: datetime) -> str:
        """JSON mein serialize karte waqt hi apply ho."""
        return value.isoformat()

event = Event(name="Meeting", date="2024-03-15T10:00:00")

# model_dump() — datetime object wapas aata hai
print(type(event.model_dump()["date"]))  # <class 'datetime.datetime'>

# model_dump_json() — custom serializer apply hota hai
print(event.model_dump_json())
# '{"name":"Meeting","date":"2024-03-15T10:00:00"}'
```

---

## Computed Fields with @computed_field

Ek field jo other fields se derived ho — jaise area rectangle ko width aur height se calculate hota hai. Yeh computed fields input validation mein nahi aate, sirf output mein include hote hain. JavaScript mein getters jaisa kaam karte hain:

```python
from pydantic import BaseModel, computed_field

class Rectangle(BaseModel):
    width: float
    height: float

    @computed_field
    @property
    def area(self) -> float:
        return self.width * self.height

    @computed_field
    @property
    def perimeter(self) -> float:
        return 2 * (self.width + self.height)

rect = Rectangle(width=10, height=5)
print(rect.area)       # 50.0
print(rect.perimeter)  # 30.0

print(rect.model_dump())
# {'width': 10.0, 'height': 5.0, 'area': 50.0, 'perimeter': 30.0}

print(rect.model_dump_json(indent=2))
# {
#   "width": 10.0,
#   "height": 5.0,
#   "area": 50.0,
#   "perimeter": 30.0
# }
```

### TypeScript Analogy

JavaScript mein getters nahi aate `JSON.stringify()` mein, jaab tak `toJSON()` custom nahi likho:

```typescript
class Rectangle {
  constructor(
    public width: number,
    public height: number
  ) {}

  get area(): number {
    return this.width * this.height;
  }

  // Getter JSON.stringify mein nahi ayega!
  // Custom toJSON() likho padta hai:
  toJSON() {
    return {
      width: this.width,
      height: this.height,
      area: this.area,
      perimeter: this.perimeter,
    };
  }
}
```

Pydantic ka `@computed_field` automatically serialization mein include kar deta hai — bilkul JavaScript getters ke liye `toJSON()` likhnے jaisा!

### Real-World Example: User Full Name aur Age

```python
from pydantic import BaseModel, computed_field
from datetime import datetime, date

class User(BaseModel):
    first_name: str
    last_name: str
    email: str
    birth_date: date

    @computed_field
    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

    @computed_field
    @property
    def age(self) -> int:
        today = date.today()
        born = self.birth_date
        return today.year - born.year - (
            (today.month, today.day) < (born.month, born.day)
        )

    @computed_field
    @property
    def email_domain(self) -> str:
        return self.email.split("@")[1]

user = User(
    first_name="Alice",
    last_name="Smith",
    email="alice@example.com",
    birth_date="1995-06-15"
)

print(user.model_dump())
# {
#   'first_name': 'Alice',
#   'last_name': 'Smith',
#   'email': 'alice@example.com',
#   'birth_date': datetime.date(1995, 6, 15),
#   'full_name': 'Alice Smith',
#   'age': 28,
#   'email_domain': 'example.com'
# }
```

---

## JSON Schema Generation: model_json_schema()

Pydantic models se JSON Schema automatically generate ho sakta hai! Yeh FastAPI use karta hai OpenAPI/Swagger docs banane ke liye:

```python
from pydantic import BaseModel, Field
from datetime import datetime
import json

class Product(BaseModel):
    """Catalog mein ek product."""
    id: int = Field(description="Unique product identifier")
    name: str = Field(min_length=1, max_length=200, description="Product name")
    price: float = Field(gt=0, description="Price in USD")
    tags: list[str] = Field(default=[], description="Product tags")
    created_at: datetime = Field(description="When the product was created")

schema = Product.model_json_schema()
print(json.dumps(schema, indent=2))
```

Output dekho:

```json
{
  "title": "Product",
  "description": "Catalog mein ek product.",
  "type": "object",
  "properties": {
    "id": {
      "title": "Id",
      "description": "Unique product identifier",
      "type": "integer"
    },
    "name": {
      "title": "Name",
      "description": "Product name",
      "type": "string",
      "minLength": 1,
      "maxLength": 200
    },
    "price": {
      "title": "Price",
      "description": "Price in USD",
      "type": "number",
      "exclusiveMinimum": 0
    },
    "tags": {
      "title": "Tags",
      "description": "Product tags",
      "type": "array",
      "items": {
        "type": "string"
      },
      "default": []
    },
    "created_at": {
      "title": "Created At",
      "description": "When the product was created",
      "type": "string",
      "format": "date-time"
    }
  },
  "required": ["id", "name", "price", "created_at"]
}
```

### Zod Comparison

JavaScript mein Zod ke saath yeh kaam manual package se karna padta hai:

```typescript
// Zod uses zod-to-json-schema package
import { zodToJsonSchema } from "zod-to-json-schema";

const schema = zodToJsonSchema(ProductSchema);
```

Pydantic mein yeh in-built hai — koi extra package nahi!

### Nested Models aur $defs

Nested models ke liye JSON Schema references (`$defs`) use hote hain:

```python
class Address(BaseModel):
    street: str
    city: str

class User(BaseModel):
    name: str
    address: Address

schema = User.model_json_schema()
# $defs mein Address ka schema hota hai, User.address usko reference karta hai
```

---

## Complete Example: API Response Builder

Practical pattern dekho — Zomato jaise app mein product response kaise bana sakte ho, sab features ke saath:

```python
from pydantic import BaseModel, Field, computed_field, field_serializer, ConfigDict
from pydantic.alias_generators import to_camel
from datetime import datetime
from decimal import Decimal
from uuid import UUID, uuid4

# Base model — JavaScript frontend ke liye camelCase output
class ApiModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

class Money(BaseModel):
    amount: Decimal
    currency: str = "USD"

    @field_serializer("amount")
    def serialize_amount(self, value: Decimal) -> str:
        return str(value.quantize(Decimal("0.01")))

class ProductResponse(ApiModel):
    product_id: UUID = Field(default_factory=uuid4)
    name: str
    description: str = ""
    price: Money
    stock_count: int = Field(ge=0)
    is_available: bool = True
    tags: list[str] = []
    created_at: datetime
    updated_at: datetime | None = None

    @computed_field
    @property
    def display_price(self) -> str:
        return f"{self.price.currency} {self.price.amount:.2f}"

    @computed_field
    @property
    def in_stock(self) -> bool:
        return self.stock_count > 0 and self.is_available

    @field_serializer("created_at", "updated_at")
    def serialize_datetime(self, value: datetime | None) -> str | None:
        if value is None:
            return None
        return value.isoformat()

# Product banao
product = ProductResponse(
    name="Premium Widget",
    description="A high-quality widget",
    price={"amount": "29.99", "currency": "USD"},
    stock_count=150,
    tags=["premium", "widget"],
    created_at="2024-01-15T08:00:00Z",
)

# Full response (camelCase JS frontend ke liye)
full = product.model_dump(by_alias=True)
print(full)
# {
#     'productId': '...',
#     'name': 'Premium Widget',
#     'description': 'A high-quality widget',
#     'price': {'amount': '29.99', 'currency': 'USD'},
#     'stockCount': 150,
#     'isAvailable': True,
#     'tags': ['premium', 'widget'],
#     'createdAt': '2024-01-15T08:00:00+00:00',
#     'updatedAt': None,
#     'displayPrice': 'USD 29.99',
#     'inStock': True
# }

# Minimal response (product listing ke liye)
minimal = product.model_dump(
    by_alias=True,
    include={"product_id", "name", "price", "display_price", "in_stock"},
)
# {
#     'productId': '...',
#     'name': 'Premium Widget',
#     'price': {'amount': '29.99', 'currency': 'USD'},
#     'displayPrice': 'USD 29.99',
#     'inStock': True
# }

# JSON response API ke liye
json_response = product.model_dump_json(by_alias=True, indent=2)
print(json_response)
```

---

## Cheat Sheet: Serialization

| Kaam | Method | Notes |
|---|---|---|
| Dict mein convert | `model.model_dump()` | Python dict return hota hai |
| JSON string | `model.model_dump_json()` | datetime, UUID etc. handle karta hai |
| Specific fields | `model_dump(include={"a", "b"})` | lodash `_.pick()` jaisa |
| Fields exclude | `model_dump(exclude={"a", "b"})` | lodash `_.omit()` jaisa |
| None values skip | `model_dump(exclude_none=True)` | PATCH ke liye perfect |
| Unset fields skip | `model_dump(exclude_unset=True)` | PATCH updates ke liye |
| Aliases use kar | `model_dump(by_alias=True)` | camelCase output |
| Custom output | `@field_serializer` | Per-field control |
| Derived fields | `@computed_field` + `@property` | Auto-include output mein |
| JSON Schema | `Model.model_json_schema()` | OpenAPI/Swagger ke liye |
| Dict se create | `Model.model_validate(data)` | Zod jaise `schema.parse()` |
| JSON string se | `Model.model_validate_json(s)` | Parse + validate |

---

## Practice Exercises

### Exercise 1: API Response Formatter
`UserResponse` model banao `id`, `username`, `email`, `password_hash`, `created_at`, `last_login` ke saath. Ek `to_public()` method likho jo `password_hash` aur `last_login` exclude karke dict return kare. Ek `to_admin()` method likho jo sirf `password_hash` exclude kare.

### Exercise 2: CamelCase API
Base `CamelModel` banao `to_camel` alias generator ke saath. Uske upar `OrderResponse` aur `OrderItemResponse` models banao. Verify karo ki `model_dump(by_alias=True)` camelCase deta hai aur `model_validate()` camelCase input accept karta hai.

### Exercise 3: Custom Money Serializer
`Money` model banao `amount` (Decimal) aur `currency` (str) ke saath. `@field_serializer` add kar jo amount ko 2 decimal places mein format kare. `Invoice` model banao multiple `Money` fields ke saath (subtotal, tax, total). Verify karo JSON output sab amounts ko correctly format kare.

### Exercise 4: Computed Fields
`Employee` model banao `first_name`, `last_name`, `hourly_rate`, `hours_worked` ke saath. Computed fields add kar `full_name`, `gross_pay`, `tax` (20% assume), `net_pay` ke liye. Verify karo sab computed fields `model_dump()` output mein ayen.

### Exercise 5: Context-Aware Serialization
`Document` model banao `title`, `content`, `author`, `internal_notes` ke saath. `@field_serializer` add kar `internal_notes` par jo `"[REDACTED]"` return kare jaab tak context flag `show_internal=True` na ho. Test kar `model_dump(context={"show_internal": True})` ke saath aur bina.

### Exercise 6: JSON Schema
Complex model banao nested types, optional fields, constrained fields, enums ke saath. `model_json_schema()` se schema generate kar. Schema copy karke verify kar ki OpenAPI specification se match karta hai. Schema ko JSON Schema validator tool mein load karke check kar.

### Exercise 7: Full Round-Trip
`BlogPost` model banao aliases ke saath (Python mein snake_case, JSON mein camelCase), computed fields (word_count, reading_time), custom serializers (dates ko "March 15, 2024" format mein). Demo kar: camelCase JSON input se create, Python mein snake_case se access, camelCase JSON mein computed fields ke saath serialize. Verify karo `model_validate_json(model_dump_json(by_alias=True))` round-trip identity check kare.
