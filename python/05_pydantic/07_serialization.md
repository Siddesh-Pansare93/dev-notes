# 07 - Serialization

## model_dump(): Converting to Dictionaries

`model_dump()` converts a Pydantic model to a Python dictionary. This is the method you will use most often when preparing data for database insertion, API responses, or passing to other functions.

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

# Basic dump
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

### Include and Exclude

```python
# Include only specific fields
user.model_dump(include={"id", "name", "email"})
# {'id': 1, 'name': 'Alice', 'email': 'alice@example.com'}

# Exclude specific fields
user.model_dump(exclude={"created_at", "is_active"})
# {'id': 1, 'name': 'Alice', 'email': 'alice@example.com'}
```

This is similar to lodash `_.pick()` and `_.omit()`:

```typescript
// JavaScript equivalents
import _ from "lodash";
_.pick(user, ["id", "name", "email"]);
_.omit(user, ["createdAt", "isActive"]);
```

### Exclude Defaults, None, and Unset

```python
class UserUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    bio: str | None = None
    age: int | None = None

update = UserUpdate(name="Alice", email="alice@new.com")

# All fields (even None ones)
update.model_dump()
# {'name': 'Alice', 'email': 'alice@new.com', 'bio': None, 'age': None}

# Exclude None values - great for PATCH updates
update.model_dump(exclude_none=True)
# {'name': 'Alice', 'email': 'alice@new.com'}

# Exclude unset fields (fields not explicitly provided)
update.model_dump(exclude_unset=True)
# {'name': 'Alice', 'email': 'alice@new.com'}

# Exclude fields still at their default value
update.model_dump(exclude_defaults=True)
# {'name': 'Alice', 'email': 'alice@new.com'}
```

The **`exclude_unset`** option is particularly powerful for PATCH endpoints:

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
    # Only get the fields the client actually sent
    update_data = updates.model_dump(exclude_unset=True)
    # {'name': 'Alice'} -- only what was sent, not all the None fields
    # Use this for your SQL UPDATE or ORM update
    return update_data
```

Node.js equivalent pattern:

```typescript
// Express PATCH endpoint
app.patch("/users/:id", (req, res) => {
  // In JS you'd filter out undefined values manually:
  const updates = Object.fromEntries(
    Object.entries(req.body).filter(([_, v]) => v !== undefined)
  );
});
```

---

## model_dump_json(): Converting to JSON Strings

`model_dump_json()` serializes directly to a JSON string. It handles types that `json.dumps()` cannot (like `datetime`, `UUID`, `Url`).

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

json_str = event.model_dump_json()
print(json_str)
# '{"id":"550e8400-e29b-41d4-a716-446655440000","name":"Conference","start":"2024-06-15T09:00:00Z","tags":["tech","python"]}'

# Pretty-printed
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

### Why Not Just Use json.dumps()?

```python
import json

# This FAILS with standard json.dumps:
json.dumps(event.model_dump())
# TypeError: Object of type datetime is not JSON serializable

# You'd need a custom encoder:
json.dumps(event.model_dump(), default=str)  # hacky

# model_dump_json() handles it natively:
event.model_dump_json()  # just works
```

The same `include`, `exclude`, `exclude_none`, `exclude_unset` options work with `model_dump_json()`:

```python
event.model_dump_json(exclude={"id"}, indent=2)
```

---

## Aliases: Field Names vs Serialization Names

Aliases let you use different names for a field in Python code versus in serialized output. This is extremely common when working with APIs that use camelCase (JavaScript convention) while your Python code uses snake_case.

### Basic Alias

```python
from pydantic import BaseModel, Field

class User(BaseModel):
    first_name: str = Field(alias="firstName")
    last_name: str = Field(alias="lastName")

# Create with the alias name (camelCase from API)
user = User(firstName="Alice", lastName="Smith")
print(user.first_name)  # "Alice" (Python attribute is snake_case)

# Serialize uses the alias by default in model_dump with by_alias=True
print(user.model_dump())
# {'first_name': 'Alice', 'last_name': 'Smith'}

print(user.model_dump(by_alias=True))
# {'firstName': 'Alice', 'lastName': 'Smith'}
```

### The TypeScript Analogy

This is like using decorators in class-transformer or NestJS:

```typescript
// class-transformer
class User {
  @Expose({ name: "firstName" })
  first_name: string;

  @Expose({ name: "lastName" })
  last_name: string;
}

// Or in Java/Kotlin with Jackson:
// @JsonProperty("firstName")
// val firstName: String
```

### Three Types of Aliases

Pydantic v2 provides three separate alias configurations:

```python
from pydantic import BaseModel, Field

class User(BaseModel):
    name: str = Field(
        alias="userName",                    # used for BOTH validation and serialization
        validation_alias="user_name_input",  # used ONLY when reading/parsing data
        serialization_alias="userName",      # used ONLY when dumping/serializing
    )
```

Most of the time, you just need `alias` or the `validation_alias` + `serialization_alias` pair:

```python
from pydantic import BaseModel, Field, ConfigDict

class ApiUser(BaseModel):
    # Accept camelCase input, output camelCase, use snake_case in Python
    model_config = ConfigDict(populate_by_name=True)

    user_id: int = Field(alias="userId")
    first_name: str = Field(alias="firstName")
    last_name: str = Field(alias="lastName")
    email_address: str = Field(alias="emailAddress")

# Can create with either snake_case or camelCase (populate_by_name=True)
user = ApiUser(userId=1, firstName="Alice", lastName="Smith", emailAddress="alice@example.com")
# OR
user = ApiUser(user_id=1, first_name="Alice", last_name="Smith", email_address="alice@example.com")

# In Python code, always use snake_case
print(user.first_name)  # "Alice"

# Serialize to camelCase for API response
print(user.model_dump(by_alias=True))
# {'userId': 1, 'firstName': 'Alice', 'lastName': 'Smith', 'emailAddress': 'alice@example.com'}
```

### AliasGenerator: Automatic camelCase Conversion

Instead of setting aliases field by field, generate them automatically:

```python
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

class ApiModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,  # allow both snake_case and camelCase
    )

class UserResponse(ApiModel):
    user_id: int
    first_name: str
    last_name: str
    email_address: str
    is_active: bool = True

# Input can be camelCase (from JS frontend)
user = UserResponse.model_validate({
    "userId": 1,
    "firstName": "Alice",
    "lastName": "Smith",
    "emailAddress": "alice@example.com"
})

# Python code uses snake_case
print(user.first_name)

# Output is camelCase (for JS frontend)
print(user.model_dump(by_alias=True))
# {'userId': 1, 'firstName': 'Alice', 'lastName': 'Smith', 'emailAddress': 'alice@example.com', 'isActive': True}
```

This is a very common pattern when building APIs consumed by JavaScript frontends. Create a base `ApiModel` class with the camelCase alias generator and inherit from it for all your API models.

---

## Custom Serializers with @field_serializer

When you need to control exactly how a field is serialized:

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

### Conditional Serialization

```python
from pydantic import BaseModel, field_serializer, SerializationInfo

class User(BaseModel):
    name: str
    email: str
    ssn: str

    @field_serializer("ssn")
    def mask_ssn(self, value: str, info: SerializationInfo) -> str:
        # Check if we're in a context that should show full SSN
        if info.context and info.context.get("show_full_ssn"):
            return value
        # Mask by default
        return f"***-**-{value[-4:]}"

user = User(name="Alice", email="alice@example.com", ssn="123-45-6789")

# Default: masked
print(user.model_dump())
# {'name': 'Alice', 'email': 'alice@example.com', 'ssn': '***-**-6789'}

# With context: full SSN
print(user.model_dump(context={"show_full_ssn": True}))
# {'name': 'Alice', 'email': 'alice@example.com', 'ssn': '123-45-6789'}
```

### Serialization Modes: "json" vs "python"

```python
from pydantic import field_serializer
from datetime import datetime

class Event(BaseModel):
    name: str
    date: datetime

    @field_serializer("date", when_used="json")
    def serialize_date_for_json(self, value: datetime) -> str:
        """Only applies when serializing to JSON, not to dict."""
        return value.isoformat()

event = Event(name="Meeting", date="2024-03-15T10:00:00")

# model_dump() returns datetime object (no custom serializer applied)
print(type(event.model_dump()["date"]))  # <class 'datetime.datetime'>

# model_dump_json() applies the custom serializer
print(event.model_dump_json())
# '{"name":"Meeting","date":"2024-03-15T10:00:00"}'
```

---

## Computed Fields with @computed_field

Computed fields are derived from other fields. They are included in serialization but not in input validation. This is like a JavaScript getter or a computed property in Vue.

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

### TypeScript Equivalent

```typescript
class Rectangle {
  constructor(
    public width: number,
    public height: number
  ) {}

  get area(): number {
    return this.width * this.height;
  }

  // But JSON.stringify(rect) won't include getters!
  // You'd need toJSON() or a custom serializer.
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

Pydantic's `@computed_field` automatically includes computed values in serialization. In JavaScript, getters are not included in `JSON.stringify()` unless you write a custom `toJSON()`.

### Real-World Example: User with Full Name

```python
from pydantic import BaseModel, computed_field, EmailStr
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

Pydantic can generate **JSON Schema** from your models. This is used by FastAPI to auto-generate OpenAPI documentation.

```python
from pydantic import BaseModel, Field
from datetime import datetime
import json

class Product(BaseModel):
    """A product in the catalog."""
    id: int = Field(description="Unique product identifier")
    name: str = Field(min_length=1, max_length=200, description="Product name")
    price: float = Field(gt=0, description="Price in USD")
    tags: list[str] = Field(default=[], description="Product tags")
    created_at: datetime = Field(description="When the product was created")

schema = Product.model_json_schema()
print(json.dumps(schema, indent=2))
```

Output:

```json
{
  "title": "Product",
  "description": "A product in the catalog.",
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

```typescript
// Zod also generates JSON Schema (with zod-to-json-schema):
import { zodToJsonSchema } from "zod-to-json-schema";

const schema = zodToJsonSchema(ProductSchema);
```

Pydantic does this natively -- no extra package needed.

### Nested Model Schema

Schemas for nested models use `$defs` (JSON Schema references):

```python
class Address(BaseModel):
    street: str
    city: str

class User(BaseModel):
    name: str
    address: Address

schema = User.model_json_schema()
# Includes $defs with the Address schema, and User.address references it
```

---

## Complete Serialization Example: API Response Builder

Here is a practical pattern for building API responses with different serialization needs:

```python
from pydantic import BaseModel, Field, computed_field, field_serializer, ConfigDict
from pydantic.alias_generators import to_camel
from datetime import datetime
from decimal import Decimal
from uuid import UUID, uuid4

# Base model with camelCase output for JavaScript frontends
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

# Create a product
product = ProductResponse(
    name="Premium Widget",
    description="A high-quality widget",
    price={"amount": "29.99", "currency": "USD"},
    stock_count=150,
    tags=["premium", "widget"],
    created_at="2024-01-15T08:00:00Z",
)

# Full response (camelCase for JS frontend)
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

# Minimal response (e.g., for a product listing)
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

# JSON for API response
json_response = product.model_dump_json(by_alias=True, indent=2)
print(json_response)
```

---

## Summary: Serialization Cheat Sheet

| Task | Method | Notes |
|---|---|---|
| To dict | `model.model_dump()` | Returns Python dict |
| To JSON string | `model.model_dump_json()` | Handles datetime, UUID, etc. |
| Include fields | `model_dump(include={"a", "b"})` | Like `_.pick()` |
| Exclude fields | `model_dump(exclude={"a", "b"})` | Like `_.omit()` |
| Omit None values | `model_dump(exclude_none=True)` | Like `_.omitBy(isNil)` |
| Omit unset fields | `model_dump(exclude_unset=True)` | For PATCH updates |
| Use aliases | `model_dump(by_alias=True)` | camelCase output |
| Custom field output | `@field_serializer` | Full control per field |
| Derived fields | `@computed_field` + `@property` | Auto-included in output |
| JSON Schema | `Model.model_json_schema()` | For OpenAPI/Swagger |
| From dict | `Model.model_validate(data)` | Like `schema.parse()` in Zod |
| From JSON string | `Model.model_validate_json(s)` | Parses + validates |

---

## Practice Exercises

### Exercise 1: API Response Formatter
Create a `UserResponse` model with `id`, `username`, `email`, `password_hash`, `created_at`, `last_login`. Write a method `to_public()` that returns a dict excluding `password_hash` and `last_login`. Write a method `to_admin()` that returns everything except `password_hash`.

### Exercise 2: CamelCase API
Create a base `CamelModel` with the `to_camel` alias generator. Build `OrderResponse` and `OrderItemResponse` models on top of it. Verify that `model_dump(by_alias=True)` produces camelCase output and that `model_validate()` accepts camelCase input.

### Exercise 3: Custom Money Serializer
Create a `Money` model with `amount` (Decimal) and `currency` (str). Add a `@field_serializer` that formats the amount to 2 decimal places. Create an `Invoice` model with multiple `Money` fields (subtotal, tax, total). Verify JSON output formats all amounts correctly.

### Exercise 4: Computed Fields
Create an `Employee` model with `first_name`, `last_name`, `hourly_rate`, `hours_worked`. Add computed fields for `full_name`, `gross_pay`, `tax` (assume 20%), and `net_pay`. Verify all computed fields appear in `model_dump()` output.

### Exercise 5: Context-Aware Serialization
Create a `Document` model with `title`, `content`, `author`, `internal_notes`. Add a `@field_serializer` on `internal_notes` that returns `"[REDACTED]"` unless a context flag `show_internal=True` is passed. Test with `model_dump(context={"show_internal": True})` and without.

### Exercise 6: JSON Schema
Create a complex model with nested types, optional fields, constrained fields, and enums. Generate its JSON Schema with `model_json_schema()`. Copy the schema and verify it matches what you would expect from an OpenAPI specification. Try loading the schema in a JSON Schema validator tool.

### Exercise 7: Full Round-Trip
Create a `BlogPost` model with aliases (snake_case Python, camelCase JSON), computed fields (word_count, reading_time), and custom serializers (format dates as "March 15, 2024"). Demonstrate the full round trip: create from camelCase JSON input, access with snake_case in Python, serialize back to camelCase JSON with computed fields included. Verify `model_validate_json(model_dump_json(by_alias=True))` works (round-trip identity).
