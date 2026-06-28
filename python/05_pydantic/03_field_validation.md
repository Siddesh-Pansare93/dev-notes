# 03 - Field Validation

## The Field() Function

`Field()` is how you add constraints, metadata, and documentation to individual fields. Think of it as the equivalent of chaining methods in Zod (`.min()`, `.max()`, `.describe()`, etc.).

```python
from pydantic import BaseModel, Field

class Product(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=100,
        description="The product name"
    )
    price: float = Field(
        gt=0,               # greater than 0
        description="Price in USD"
    )
    quantity: int = Field(
        ge=0,               # greater than or equal to 0
        le=10000,           # less than or equal to 10000
        default=0
    )
    sku: str = Field(
        pattern=r"^[A-Z]{2}-\d{4}$",   # regex pattern
        description="Stock keeping unit, format: XX-0000"
    )
```

### Zod Equivalent

```typescript
const ProductSchema = z.object({
  name: z.string().min(1).max(100).describe("The product name"),
  price: z.number().positive().describe("Price in USD"),
  quantity: z.number().int().gte(0).lte(10000).default(0),
  sku: z.string().regex(/^[A-Z]{2}-\d{4}$/).describe("Stock keeping unit"),
});
```

### All Numeric Constraints

| Pydantic Field() | Zod Equivalent | Meaning |
|---|---|---|
| `gt=0` | `.gt(0)` | Greater than |
| `ge=0` | `.gte(0)` / `.min(0)` | Greater than or equal |
| `lt=100` | `.lt(100)` | Less than |
| `le=100` | `.lte(100)` / `.max(100)` | Less than or equal |
| `multiple_of=5` | `.multipleOf(5)` | Must be a multiple of |

### All String Constraints

| Pydantic Field() | Zod Equivalent | Meaning |
|---|---|---|
| `min_length=1` | `.min(1)` | Minimum string length |
| `max_length=100` | `.max(100)` | Maximum string length |
| `pattern=r"^\d+$"` | `.regex(/^\d+$/)` | Must match regex |

### Field Examples and Descriptions

`Field()` also accepts metadata for documentation (used by FastAPI for OpenAPI docs):

```python
class User(BaseModel):
    username: str = Field(
        min_length=3,
        max_length=30,
        description="Unique username",
        examples=["alice", "bob_smith"],
        title="Username"
    )
    age: int = Field(
        ge=13,
        le=120,
        description="User's age in years",
        examples=[25, 30]
    )
```

---

## @field_validator: Custom Field Validation

When built-in constraints are not enough, use `@field_validator` for custom logic. This is like Zod's `.refine()` or `.transform()`.

```python
from pydantic import BaseModel, field_validator

class User(BaseModel):
    username: str
    email: str
    age: int

    @field_validator("username")
    @classmethod
    def username_must_be_alphanumeric(cls, v: str) -> str:
        if not v.isalnum():
            raise ValueError("Username must be alphanumeric")
        return v

    @field_validator("email")
    @classmethod
    def email_must_contain_at(cls, v: str) -> str:
        if "@" not in v:
            raise ValueError("Invalid email format")
        return v.lower()  # also normalize to lowercase (like a transform)

    @field_validator("age")
    @classmethod
    def age_must_be_reasonable(cls, v: int) -> int:
        if v < 0 or v > 150:
            raise ValueError("Age must be between 0 and 150")
        return v
```

### Zod Equivalent

```typescript
const UserSchema = z.object({
  username: z.string().refine(
    (v) => /^[a-zA-Z0-9]+$/.test(v),
    { message: "Username must be alphanumeric" }
  ),
  email: z.string().email().transform((v) => v.toLowerCase()),
  age: z.number().int().min(0).max(150),
});
```

### Key Rules for @field_validator

1. **Always use `@classmethod`** (Pydantic v2 requires it)
2. **Always return the value** (even if you do not modify it)
3. **Raise `ValueError` or `AssertionError`** on validation failure
4. The first argument after `cls` is always the field value

### Validating Multiple Fields with One Validator

```python
class Config(BaseModel):
    host: str
    backup_host: str

    @field_validator("host", "backup_host")
    @classmethod
    def must_be_valid_hostname(cls, v: str) -> str:
        if not v.replace(".", "").replace("-", "").isalnum():
            raise ValueError(f"Invalid hostname: {v}")
        return v.lower()
```

### Using `mode="before"` and `mode="after"`

By default, validators run **after** Pydantic's own type parsing (mode="after"). You can run them **before**:

```python
class Flexible(BaseModel):
    tags: list[str]

    @field_validator("tags", mode="before")
    @classmethod
    def split_string_tags(cls, v):
        """Accept a comma-separated string or a list."""
        if isinstance(v, str):
            return [tag.strip() for tag in v.split(",")]
        return v

# Both work:
Flexible(tags=["python", "pydantic"])
Flexible(tags="python, pydantic")  # converted before type validation
```

This is like Zod's `.preprocess()`:
```typescript
const TagsSchema = z.preprocess(
  (v) => (typeof v === "string" ? v.split(",").map((s) => s.trim()) : v),
  z.array(z.string())
);
```

---

## @model_validator: Cross-Field Validation

When validation depends on **multiple fields together**, use `@model_validator`. This is like Zod's `.refine()` at the object level.

### mode="after" (Most Common)

The validator receives the fully constructed model instance:

```python
from pydantic import BaseModel, model_validator

class DateRange(BaseModel):
    start_date: str
    end_date: str

    @model_validator(mode="after")
    def end_must_be_after_start(self) -> "DateRange":
        if self.end_date <= self.start_date:
            raise ValueError("end_date must be after start_date")
        return self

# Valid
DateRange(start_date="2024-01-01", end_date="2024-12-31")

# Invalid
DateRange(start_date="2024-12-31", end_date="2024-01-01")
# ValidationError: end_date must be after start_date
```

### mode="before"

The validator receives the raw input data (a dict) before any field validation:

```python
class UserCreate(BaseModel):
    password: str
    password_confirm: str

    @model_validator(mode="before")
    @classmethod
    def passwords_match(cls, data: dict) -> dict:
        if isinstance(data, dict):
            pw = data.get("password")
            pc = data.get("password_confirm")
            if pw and pc and pw != pc:
                raise ValueError("Passwords do not match")
        return data
```

### Zod Equivalent

```typescript
const DateRangeSchema = z
  .object({
    startDate: z.string(),
    endDate: z.string(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: "endDate must be after startDate",
    path: ["endDate"],
  });

const UserCreateSchema = z
  .object({
    password: z.string(),
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Passwords do not match",
    path: ["passwordConfirm"],
  });
```

### Real-World Example: Discount Validation

```python
from pydantic import BaseModel, Field, model_validator

class OrderItem(BaseModel):
    product_name: str
    unit_price: float = Field(gt=0)
    quantity: int = Field(ge=1)
    discount_percent: float = Field(ge=0, le=100, default=0)
    final_price: float | None = None

    @model_validator(mode="after")
    def calculate_final_price(self) -> "OrderItem":
        discount_multiplier = 1 - (self.discount_percent / 100)
        calculated = round(self.unit_price * self.quantity * discount_multiplier, 2)

        if self.final_price is not None and self.final_price != calculated:
            raise ValueError(
                f"final_price {self.final_price} doesn't match "
                f"calculated price {calculated}"
            )
        self.final_price = calculated
        return self

item = OrderItem(product_name="Widget", unit_price=10.0, quantity=3, discount_percent=20)
print(item.final_price)  # 24.0
```

---

## ValidationError: Understanding Error Structure

When validation fails, Pydantic raises a `ValidationError` with detailed, structured error information.

```python
from pydantic import BaseModel, Field, ValidationError

class User(BaseModel):
    name: str = Field(min_length=2)
    age: int = Field(ge=0, le=150)
    email: str

try:
    User(name="A", age=-5, email=123)
except ValidationError as e:
    print(e.error_count())  # 3

    for error in e.errors():
        print(error)
```

Each error in `e.errors()` is a dict with this structure:

```python
{
    "type": "string_too_short",       # error type identifier
    "loc": ("name",),                 # location (field path as a tuple)
    "msg": "String should have at least 2 characters",  # human-readable message
    "input": "A",                     # the value that failed
    "ctx": {"min_length": 2},         # context/constraints
    "url": "https://errors.pydantic.dev/2/v/string_too_short"  # docs link
}
```

### Comparison with Zod Errors

```typescript
// Zod error structure
{
  code: "too_small",
  minimum: 2,
  type: "string",
  inclusive: true,
  exact: false,
  message: "String must contain at least 2 character(s)",
  path: ["name"],
}
```

| Pydantic | Zod | Meaning |
|---|---|---|
| `loc` (tuple) | `path` (array) | Where the error occurred |
| `msg` | `message` | Human-readable error |
| `type` | `code` | Machine-readable error type |
| `input` | (not included) | The failing value |
| `ctx` | (spread in object) | Constraint details |

### Nested Error Paths

For nested models, `loc` shows the full path:

```python
class Address(BaseModel):
    city: str
    zip_code: str = Field(pattern=r"^\d{5}$")

class User(BaseModel):
    name: str
    address: Address

try:
    User(name="Alice", address={"city": "NY", "zip_code": "bad"})
except ValidationError as e:
    print(e.errors()[0]["loc"])
    # ('address', 'zip_code')  -- similar to Zod's path: ["address", "zipCode"]
```

---

## Annotated Types: Inline Constraints

Instead of using `Field()`, you can attach constraints directly to the type using `Annotated`:

```python
from typing import Annotated
from pydantic import BaseModel, Field

# These two are equivalent:

# Using Field() as default
class UserA(BaseModel):
    name: str = Field(min_length=2, max_length=50)
    age: int = Field(ge=0, le=150)

# Using Annotated
class UserB(BaseModel):
    name: Annotated[str, Field(min_length=2, max_length=50)]
    age: Annotated[int, Field(ge=0, le=150)]
```

The `Annotated` approach is preferred when you want to **reuse constraints** as custom types:

```python
from typing import Annotated
from pydantic import BaseModel, Field

# Define reusable constrained types
Username = Annotated[str, Field(min_length=3, max_length=30, pattern=r"^[a-zA-Z0-9_]+$")]
PositiveInt = Annotated[int, Field(gt=0)]
Percentage = Annotated[float, Field(ge=0, le=100)]

# Use them across multiple models
class User(BaseModel):
    username: Username
    score: Percentage

class Product(BaseModel):
    stock: PositiveInt
    discount: Percentage
```

This is like creating reusable Zod types:
```typescript
const Username = z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/);
const PositiveInt = z.number().int().positive();
const Percentage = z.number().min(0).max(100);

const UserSchema = z.object({
  username: Username,
  score: Percentage,
});
```

---

## Custom Error Messages

### In Field()

```python
from pydantic import BaseModel, Field
from typing import Annotated
from pydantic import AfterValidator

class User(BaseModel):
    age: int = Field(ge=13, json_schema_extra={"error_message": "Must be 13+"})
```

### In @field_validator

```python
class User(BaseModel):
    password: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v
```

### Using Annotated with AfterValidator for Reusable Validation

```python
from typing import Annotated
from pydantic import AfterValidator

def validate_not_empty(v: str) -> str:
    if not v.strip():
        raise ValueError("String must not be empty or whitespace")
    return v.strip()

NonEmptyStr = Annotated[str, AfterValidator(validate_not_empty)]

class Comment(BaseModel):
    body: NonEmptyStr
    author: NonEmptyStr
```

---

## Putting It All Together: A Real-World Registration Form

```python
from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Annotated
import re

# Reusable types
Username = Annotated[str, Field(min_length=3, max_length=30, pattern=r"^[a-zA-Z0-9_]+$")]
StrongPassword = Annotated[str, Field(min_length=8, max_length=128)]

class RegistrationForm(BaseModel):
    username: Username
    email: str = Field(max_length=254)
    password: StrongPassword
    password_confirm: str
    age: int = Field(ge=13, le=120)
    accept_tos: bool

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        # Simple email check (use EmailStr for real validation)
        if not re.match(r"^[\w.-]+@[\w.-]+\.\w+$", v):
            raise ValueError("Invalid email address")
        return v.lower()

    @field_validator("accept_tos")
    @classmethod
    def must_accept_tos(cls, v: bool) -> bool:
        if not v:
            raise ValueError("You must accept the Terms of Service")
        return v

    @model_validator(mode="after")
    def passwords_must_match(self) -> "RegistrationForm":
        if self.password != self.password_confirm:
            raise ValueError("Passwords do not match")
        return self

# Valid
form = RegistrationForm(
    username="alice_99",
    email="ALICE@Example.com",
    password="Str0ngP@ss",
    password_confirm="Str0ngP@ss",
    age=25,
    accept_tos=True,
)
print(form.email)  # "alice@example.com" (normalized)
```

---

## Practice Exercises

### Exercise 1: Constrained Product
Create a `Product` model with: `name` (1-200 chars), `price` (greater than 0, at most 99999.99), `weight_kg` (greater than 0), `sku` (matches pattern `[A-Z]{3}-\d{6}`). Test with valid and invalid data.

### Exercise 2: Password Validator
Create a `ChangePassword` model with `current_password`, `new_password`, and `confirm_password`. Add a field validator on `new_password` that enforces: min 8 chars, at least one uppercase, one lowercase, one digit, one special character. Add a model validator that checks `new_password == confirm_password` and `new_password != current_password`.

### Exercise 3: Error Inspector
Create a model that will produce multiple validation errors at once. Catch the `ValidationError` and write code that formats the errors as a list of strings like `"field_name: error message"`. This is similar to how you might format errors for an API response.

### Exercise 4: Before Validator
Create a `Tags` model with a `values: list[str]` field. Add a `mode="before"` validator that accepts either a list of strings OR a single comma-separated string. Test with both `["a", "b"]` and `"a, b, c"`.

### Exercise 5: Reusable Annotated Types
Define these reusable types using `Annotated`: `NonEmptyStr`, `PositiveFloat`, `Port` (int between 1 and 65535), `Slug` (lowercase alphanumeric with hyphens, 1-100 chars). Use them in at least two different models.

### Exercise 6: Cross-Field Date Validation
Create an `Event` model with `name`, `start_date` (datetime), `end_date` (datetime), and `max_attendees` (positive int). Add model validators to ensure: end is after start, the event is no longer than 30 days, and the event is not in the past (compare with `datetime.now()`).
