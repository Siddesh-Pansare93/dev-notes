# 02 - Basic Models

## BaseModel: The Foundation

Every Pydantic model inherits from `BaseModel`. You declare fields as class-level annotations with type hints -- that is all you need to get full validation, serialization, and documentation.

```python
from pydantic import BaseModel

class User(BaseModel):
    username: str
    email: str
    age: int
    is_active: bool = True  # default value
```

### The TypeScript/Zod Equivalent

```typescript
// TypeScript interface (no runtime validation)
interface User {
  username: string;
  email: string;
  age: number;
  isActive: boolean;
}

// Zod schema (runtime validation)
const UserSchema = z.object({
  username: z.string(),
  email: z.string(),
  age: z.number().int(),
  isActive: z.boolean().default(true),
});
type User = z.infer<typeof UserSchema>;
```

In Pydantic, the class definition IS both the type and the validator. No duplication.

---

## Creating Instances

### From Keyword Arguments

```python
user = User(username="alice", email="alice@example.com", age=28)
print(user.username)   # "alice"
print(user.age)        # 28
print(user.is_active)  # True (default)
```

### From a Dictionary (Like Parsing a Request Body)

```python
data = {"username": "bob", "email": "bob@example.com", "age": 35}
user = User.model_validate(data)
```

This is equivalent to `UserSchema.parse(data)` in Zod.

### From a JSON String

```python
json_str = '{"username": "charlie", "email": "charlie@example.com", "age": 22}'
user = User.model_validate_json(json_str)
```

This is equivalent to `JSON.parse()` + `schema.parse()` combined into one step.

### Comparison Table

| Operation | Pydantic | Zod |
|---|---|---|
| From kwargs | `User(name="x")` | N/A (Zod doesn't do this) |
| From dict/object | `User.model_validate(d)` | `schema.parse(obj)` |
| From JSON string | `User.model_validate_json(s)` | `schema.parse(JSON.parse(s))` |

---

## Accessing Fields

Pydantic models give you attribute access, just like any Python object:

```python
user = User(username="alice", email="alice@example.com", age=28)

# Attribute access
print(user.username)  # "alice"
print(user.email)     # "alice@example.com"

# Fields are also available via model_fields (metadata)
print(User.model_fields.keys())
# dict_keys(['username', 'email', 'age', 'is_active'])
```

By default, Pydantic models are **mutable** (unlike v1 where they were frozen):

```python
user.age = 29  # this works
print(user.age)  # 29
```

To make them immutable (like a frozen dataclass or a `readonly` TS type):

```python
from pydantic import ConfigDict

class ImmutableUser(BaseModel):
    model_config = ConfigDict(frozen=True)

    username: str
    age: int

u = ImmutableUser(username="alice", age=28)
u.age = 29  # raises ValidationError: Instance is frozen
```

---

## Serialization: model_dump() and model_dump_json()

### model_dump() -- Convert to Dictionary

```python
user = User(username="alice", email="alice@example.com", age=28)

d = user.model_dump()
print(d)
# {'username': 'alice', 'email': 'alice@example.com', 'age': 28, 'is_active': True}
print(type(d))  # <class 'dict'>
```

This is like spreading an object in JS: `{ ...user }` or `Object.assign({}, user)`.

### model_dump_json() -- Convert to JSON String

```python
json_str = user.model_dump_json()
print(json_str)
# '{"username":"alice","email":"alice@example.com","age":28,"is_active":true}'
print(type(json_str))  # <class 'str'>
```

This is like `JSON.stringify(user)`.

### Filtering Fields

```python
# Include only specific fields
user.model_dump(include={"username", "email"})
# {'username': 'alice', 'email': 'alice@example.com'}

# Exclude specific fields
user.model_dump(exclude={"is_active"})
# {'username': 'alice', 'email': 'alice@example.com', 'age': 28}

# Exclude defaults (fields that still have their default value)
user.model_dump(exclude_defaults=True)
# {'username': 'alice', 'email': 'alice@example.com', 'age': 28}
# (is_active excluded because it's still the default True)

# Exclude None values
user.model_dump(exclude_none=True)
# Similar to lodash _.omitBy(obj, _.isNil)
```

---

## Deserialization: model_validate() and model_validate_json()

### model_validate() -- From Dict

```python
data = {"username": "dave", "email": "dave@example.com", "age": 40}
user = User.model_validate(data)
```

### model_validate_json() -- From JSON String

```python
raw = '{"username": "eve", "email": "eve@example.com", "age": 33}'
user = User.model_validate_json(raw)
```

### Strict Mode

By default, Pydantic coerces compatible types (like `"42"` to `42`). To disable this:

```python
# Strict mode rejects type coercion
user = User.model_validate(
    {"username": "frank", "email": "frank@example.com", "age": "25"},
    strict=True
)
# ValidationError: age - Input should be a valid integer
# (string "25" is rejected in strict mode)
```

Compare with Zod:
```typescript
// Zod is strict by default
z.number().parse("42");       // ERROR
z.coerce.number().parse("42"); // 42 (explicit coercion)
```

Pydantic is lenient by default (coerces), Zod is strict by default. Keep this in mind.

---

## Default Values

```python
from pydantic import BaseModel
from typing import Optional

class ServerConfig(BaseModel):
    host: str = "localhost"       # default string
    port: int = 8000              # default int
    debug: bool = False           # default bool
    workers: int = 4              # default int

# All defaults
config = ServerConfig()
print(config)
# host='localhost' port=8000 debug=False workers=4

# Override some
config = ServerConfig(port=3000, debug=True)
print(config)
# host='localhost' port=3000 debug=True workers=4
```

### Mutable Default Values -- Use default_factory

In Python, mutable defaults (lists, dicts) are a classic gotcha. Pydantic handles this with `Field(default_factory=...)`:

```python
from pydantic import BaseModel, Field

class TodoList(BaseModel):
    name: str
    # WRONG: tags: list[str] = []  -- this works in Pydantic (it copies for you)
    #   but for explicit safety, use default_factory:
    tags: list[str] = Field(default_factory=list)
    metadata: dict[str, str] = Field(default_factory=dict)
```

In practice, Pydantic v2 is smart enough to copy mutable defaults, but `default_factory` is the explicit, Pythonic way.

Compare with JavaScript:
```typescript
// In JS, you'd handle this with spread or Object.assign in constructors
class TodoList {
  tags: string[] = []; // each instance gets a new array in class syntax
}
```

---

## Required vs Optional Fields

### Required Fields (No Default)

```python
class User(BaseModel):
    username: str    # REQUIRED - must be provided
    email: str       # REQUIRED - must be provided
```

If you omit a required field:
```python
User(username="alice")
# ValidationError: 1 validation error for User
# email
#   Field required
```

### Optional Fields (With Default)

```python
class User(BaseModel):
    username: str           # required
    email: str              # required
    bio: str = ""           # optional, defaults to empty string
    age: int | None = None  # optional, defaults to None
```

### The `Optional` Type vs Default Values

This is a common source of confusion. Let me clarify:

```python
from typing import Optional

class Profile(BaseModel):
    # REQUIRED but can be None
    # You MUST pass this field, but its value can be None
    middle_name: str | None    # same as Optional[str] -- BUT NO DEFAULT, so required!

    # OPTIONAL and can be None (most common pattern)
    nickname: str | None = None  # has a default, so you can omit it

    # REQUIRED and cannot be None
    username: str

    # OPTIONAL and cannot be None
    role: str = "user"
```

```python
# This works:
Profile(middle_name=None, username="alice")

# This fails (middle_name is required even though it's Optional type):
Profile(username="alice")
# ValidationError: middle_name - Field required
```

The TypeScript equivalent:

```typescript
interface Profile {
  middleName: string | null;      // required, nullable
  nickname?: string | null;       // optional, nullable (can be omitted)
  username: string;               // required, non-nullable
  role?: string;                  // optional, non-nullable (defaults handled elsewhere)
}
```

### Quick Rule

| Python Type | Required? | Can be None? |
|---|---|---|
| `str` | Yes | No |
| `str = "default"` | No | No |
| `str \| None` | Yes | Yes |
| `str \| None = None` | No | Yes |

---

## Model vs Dataclass: When to Use Which

Python has **dataclasses** in the standard library, and Pydantic also offers its own `@dataclass` decorator. Here is when to use each:

### Standard Library dataclass

```python
from dataclasses import dataclass

@dataclass
class Point:
    x: float
    y: float
```

- No validation
- No serialization
- Part of the standard library (no dependencies)
- Good for simple internal data containers

### Pydantic BaseModel

```python
from pydantic import BaseModel

class Point(BaseModel):
    x: float
    y: float
```

- Full validation
- Built-in serialization (`.model_dump()`, `.model_dump_json()`)
- JSON Schema generation
- Best for: API boundaries, config, any data from external sources

### Pydantic dataclass

```python
from pydantic.dataclasses import dataclass

@dataclass
class Point:
    x: float
    y: float
```

- Has validation (like BaseModel)
- Compatible with standard dataclass tooling
- Does NOT have `.model_dump()`, `.model_dump_json()`, etc.
- Good for: validated internal data where you do not need serialization

### Recommendation

For a Node.js developer learning Python:

1. **Use `BaseModel` by default** for anything that touches external data (API requests, responses, configs, database rows).
2. Use **standard `dataclass`** for simple internal data structures where validation is unnecessary.
3. Use **Pydantic `dataclass`** rarely -- only when you need validation but also need dataclass compatibility.

---

## Real-World Example: Express DTO vs FastAPI Model

### Express + Zod (TypeScript)

```typescript
import express from "express";
import { z } from "zod";

const CreateUserSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  age: z.number().int().min(13).optional(),
  role: z.enum(["user", "admin"]).default("user"),
});

type CreateUser = z.infer<typeof CreateUserSchema>;

app.post("/users", (req, res) => {
  const result = CreateUserSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(422).json({ errors: result.error.flatten() });
  }
  const user: CreateUser = result.data;
  // ... create user
});
```

### FastAPI + Pydantic (Python)

```python
from pydantic import BaseModel, EmailStr, Field
from typing import Literal

class CreateUser(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    age: int | None = Field(default=None, ge=13)
    role: Literal["user", "admin"] = "user"

@app.post("/users")
async def create_user(user: CreateUser):
    # Validation is automatic. 422 is returned automatically on failure.
    # user is already a validated CreateUser instance.
    ...
```

Notice how in FastAPI you write ZERO validation/error-handling boilerplate. Pydantic and FastAPI handle it all.

---

## Practice Exercises

### Exercise 1: Basic Model
Create a `BlogPost` model with: `title` (str, required), `content` (str, required), `author` (str, required), `published` (bool, default False), `views` (int, default 0). Create instances using keyword arguments, from a dict, and from a JSON string.

### Exercise 2: Serialization Round-Trip
Create a `Product` model, instantiate it, convert it to a dict with `model_dump()`, then to JSON with `model_dump_json()`. Parse the JSON string back into a model with `model_validate_json()`. Verify all fields match.

### Exercise 3: Required vs Optional
Create an `Address` model where `street` and `city` are required, `state` has a default of `"Unknown"`, and `zip_code` is `str | None = None`. Try creating the model with various combinations of fields. Which combinations fail? Which succeed?

### Exercise 4: Include/Exclude
Create a `UserProfile` model with `username`, `email`, `password_hash`, `created_at`. Use `model_dump(exclude={"password_hash"})` to create a "safe" dictionary for API responses. Then use `model_dump(include={"username", "email"})` to get a minimal representation.

### Exercise 5: Strict vs Lax
Create a `Settings` model with `port: int` and `debug: bool`. Pass `{"port": "8080", "debug": "true"}` with and without `strict=True`. Observe the difference. Think about when you would want strict mode (hint: when data should already be properly typed, like from an internal service).

### Exercise 6: Frozen Model
Create an immutable `Config` model using `model_config = ConfigDict(frozen=True)`. Try to modify a field after creation. Catch the error and print it. Think about when immutability is useful (hint: configuration that should not change after startup).
