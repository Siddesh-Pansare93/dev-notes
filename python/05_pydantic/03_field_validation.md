# 03 - Field Validation

## Field() Function - Constraints Add Karo

`Field()` wo cheez hai jisse individual fields par constraints, metadata, aur documentation add kar sakte ho. Iska matlab Zod mein jaise `.min()`, `.max()`, `.describe()` waale methods chain karte ho, vaise hi yaha karte ho.

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

### Zod Ke Saath Comparison

```typescript
const ProductSchema = z.object({
  name: z.string().min(1).max(100).describe("The product name"),
  price: z.number().positive().describe("Price in USD"),
  quantity: z.number().int().gte(0).lte(10000).default(0),
  sku: z.string().regex(/^[A-Z]{2}-\d{4}$/).describe("Stock keeping unit"),
});
```

### Sab Numeric Constraints

| Pydantic Field() | Zod Equivalent | Matlab |
|---|---|---|
| `gt=0` | `.gt(0)` | Greater than |
| `ge=0` | `.gte(0)` / `.min(0)` | Greater than or equal |
| `lt=100` | `.lt(100)` | Less than |
| `le=100` | `.lte(100)` / `.max(100)` | Less than or equal |
| `multiple_of=5` | `.multipleOf(5)` | Must be a multiple of |

### Sab String Constraints

| Pydantic Field() | Zod Equivalent | Matlab |
|---|---|---|
| `min_length=1` | `.min(1)` | Minimum string length |
| `max_length=100` | `.max(100)` | Maximum string length |
| `pattern=r"^\d+$"` | `.regex(/^\d+$/)` | Must match regex |

### Field Examples Aur Descriptions - FastAPI Ke Liye Useful

`Field()` metadata bhi accept karta hai jo documentation ke kaam ata hai (FastAPI apne OpenAPI docs ke liye use karta hai):

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

## @field_validator: Custom Logic Likhna

Socho ek second ke liye — jab built-in constraints se kaam nahi ho, aur tumhe kuch special check karna ho? Bas wahi `@field_validator` ka kaam hai. Zod mein `.refine()` ya `.transform()` jaisa kucch.

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

### Zod Mein Kaise Likhooge

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

### @field_validator Ke Important Rules

1. **Hamesha `@classmethod` use karo** (Pydantic v2 mein mandatory hai)
2. **Hamesha value return karo** (bhale usme modify na kiya ho)
3. **Validation fail ho to `ValueError` ya `AssertionError` raise karo**
4. `cls` ke baad pehla argument hamesha field ka value hota hai

### Ek Validator Se Multiple Fields Check Karna

Imagine Swiggy ka delivery system — jo deliveries ho rahi hain, unme ek hi tracker se do-do locations check kar sakte ho. Ek jaise:

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

### `mode="before"` Aur `mode="after"` - Validation Ka Samay

Default mein validators Pydantic ke type parsing ke **baad** chalte hain (mode="after"). Lekin tum **pehle** bhi chalvaa sakte ho:

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

# Dono kaam karte hain:
Flexible(tags=["python", "pydantic"])
Flexible(tags="python, pydantic")  # converted before type validation
```

> [!tip]
> Yeh Zod ke `.preprocess()` jaisa kaam karta hai — raw input ko transform karo pehle, phir validation chalao.

```typescript
const TagsSchema = z.preprocess(
  (v) => (typeof v === "string" ? v.split(",").map((s) => s.trim()) : v),
  z.array(z.string())
);
```

---

## @model_validator: Multiple Fields Milkr Check

Kabhi-kabhi validation sirf ek field par depend nahi karta — do-teen fields ko **ek sath** check karna padta hai. Jaise Zomato ko order confirm karte waqt: total price check karna hoga items + tax, discount sab ko mila kar. Bas wahi `@model_validator` ka kaam hai.

### mode="after" (Sabse Common)

Validator ko poora model instance mil jata hai (sab fields validated ho chuke hote hain):

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

### mode="before" - Raw Data Par Kaam

Validator ko raw input data mil jata hai (dict format mein) — fields validate hone se **pehle**:

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

### Zod Mein Yeh Kaise Likhooge

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

### Real-World Example: Discount Validation (Jaise Flipkart)

Flipkart par orders dekho — discount amount enter karte ho, aur final price automatically calculate ho jata hai. Agar manual final price enter karo to match karna padta hai:

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

## ValidationError: Error Details Samjhna

Jab validation fail ho, Pydantic `ValidationError` raise karta hai — aur error structure detailed hota hai, jo debugging easy banata hai.

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

`e.errors()` mein har error ek dict hota hai iska structure:

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

### Zod Errors Ke Saath Comparison

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

| Pydantic | Zod | Matlab |
|---|---|---|
| `loc` (tuple) | `path` (array) | Error kaha ho gaya |
| `msg` | `message` | Samajhne wala error message |
| `type` | `code` | Machine-readable error type |
| `input` | (nahi hota) | Jo value fail hui |
| `ctx` | (spread hota) | Constraint details |

### Nested Models Ke Liye Error Paths

Jab nested models ho (ek model ke andar dusra model), to `loc` poora path show karta hai:

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
    # ('address', 'zip_code')  -- Zod ke path: ["address", "zipCode"] jaisa
```

---

## Annotated Types: Constraints Ko Type Mein Likho

Sochne wali baat — agar ek validation pattern bar-bar use kar rahe ho to kyu har baar `Field()` likho? Annotated use karo, constraints directly type ke saath attach kar do:

```python
from typing import Annotated
from pydantic import BaseModel, Field

# Yeh dono same hain:

# Using Field() as default
class UserA(BaseModel):
    name: str = Field(min_length=2, max_length=50)
    age: int = Field(ge=0, le=150)

# Using Annotated
class UserB(BaseModel):
    name: Annotated[str, Field(min_length=2, max_length=50)]
    age: Annotated[int, Field(ge=0, le=150)]
```

`Annotated` approach tab best hai jab constraints **reuse** karna ho — jaise Flipkart cart mein product IDs, order IDs, user IDs sab ke liye alag-alag validation ho:

```python
from typing import Annotated
from pydantic import BaseModel, Field

# Reusable constrained types define karo
Username = Annotated[str, Field(min_length=3, max_length=30, pattern=r"^[a-zA-Z0-9_]+$")]
PositiveInt = Annotated[int, Field(gt=0)]
Percentage = Annotated[float, Field(ge=0, le=100)]

# Ab har jagah use kar sakte ho
class User(BaseModel):
    username: Username
    score: Percentage

class Product(BaseModel):
    stock: PositiveInt
    discount: Percentage
```

Zod mein yeh jaisa hota hai:
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

## Custom Error Messages - Apne Shabd Likho

### Field() Mein Custom Message

```python
from pydantic import BaseModel, Field
from typing import Annotated
from pydantic import AfterValidator

class User(BaseModel):
    age: int = Field(ge=13, json_schema_extra={"error_message": "Must be 13+"})
```

### @field_validator Mein Custom Message

Custom message likho validators ke andar — jab error raise karo to likho:

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

### Annotated + AfterValidator - Reusable Custom Validation

Ek function likho validation logic ke liye, phir use bar-bar:

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

## Sab Ek Saath: Real Registration Form (Jaise Flipkart par Sign-Up)

Sochte ho — user registration form banana hai. Username, email, strong password, age check, Terms & Conditions agree karna — sab kucch. Yeh dekhte ho kaise:

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
Ek `Product` model banao: `name` (1-200 chars), `price` (0 se bada, max 99999.99), `weight_kg` (0 se bada), `sku` (pattern: `[A-Z]{3}-\d{6}`). Valid aur invalid data se test karo.

### Exercise 2: Password Validator
`ChangePassword` model banao — `current_password`, `new_password`, `confirm_password`. Field validator add karo `new_password` par: min 8 chars, at least one uppercase, one lowercase, one digit, one special character. Model validator add karo jo check kare: `new_password == confirm_password` aur `new_password != current_password`.

### Exercise 3: Error Inspector
Ek model banao jo multiple validation errors produce kare. `ValidationError` catch karo aur errors ko list of strings format mein likho — `"field_name: error message"` style. Yeh API response mein errors format karte time useful hota hai.

### Exercise 4: Before Validator
`Tags` model banao `values: list[str]` field ke saath. `mode="before"` validator add karo jo accept kare ya to list of strings ya single comma-separated string. Dono se test karo: `["a", "b"]` aur `"a, b, c"`.

### Exercise 5: Reusable Annotated Types
`Annotated` use kar ke yeh types define karo: `NonEmptyStr`, `PositiveFloat`, `Port` (1-65535 ke beech int), `Slug` (lowercase alphanumeric with hyphens, 1-100 chars). Kam-se-kam do different models mein use karo.

### Exercise 6: Cross-Field Date Validation
`Event` model banao — `name`, `start_date` (datetime), `end_date` (datetime), `max_attendees` (positive int). Model validators add karo: end date must be after start date, event max 30 days long ho, aur event past mein nahi ho (compare with `datetime.now()`).
