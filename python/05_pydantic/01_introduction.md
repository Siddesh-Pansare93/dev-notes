# 01 - Introduction to Pydantic

## What Is Pydantic?

Pydantic is a **runtime data validation library** for Python that uses standard Python type hints to define data schemas. When data enters your application (from an API request, a config file, a database row, etc.), Pydantic checks every field against the type you declared and either returns a clean, validated object or raises a detailed error.

```python
from pydantic import BaseModel

class User(BaseModel):
    name: str
    age: int
    email: str

# Valid data - works fine
user = User(name="Alice", age=30, email="alice@example.com")

# Invalid data - raises ValidationError at RUNTIME
user = User(name="Alice", age="not a number", email="alice@example.com")
# ValidationError: 1 validation error for User
# age
#   Input should be a valid integer, unable to parse string as an integer
```

That is the entire pitch: **declare your types, get validation for free.**

---

## The JS/TS Comparison: Why This Matters

If you come from the Node.js/TypeScript world, you already know the pain that Pydantic solves. Consider the typical layers of a TypeScript project:

### TypeScript: Types Vanish at Runtime

```typescript
// TypeScript - types exist ONLY at compile time
interface User {
  name: string;
  age: number;
  email: string;
}

// This compiles fine, but at runtime there is ZERO checking.
// If your API receives { name: 123, age: "hello" }, TypeScript won't save you.
function createUser(data: User): User {
  return data; // no validation whatsoever at runtime
}
```

So in a real Node.js/Express or Fastify app, you bolt on a **separate** validation library:

```typescript
// Zod - runtime validation (separate from your TS types)
import { z } from "zod";

const UserSchema = z.object({
  name: z.string(),
  age: z.number().int().positive(),
  email: z.string().email(),
});

type User = z.infer<typeof UserSchema>; // derive TS type from Zod schema

// Now you validate at runtime
const result = UserSchema.safeParse(requestBody);
if (!result.success) {
  // handle errors
}
```

```typescript
// Joi - another popular runtime validator
import Joi from "joi";

const userSchema = Joi.object({
  name: Joi.string().required(),
  age: Joi.number().integer().positive().required(),
  email: Joi.string().email().required(),
});

const { error, value } = userSchema.validate(requestBody);
```

```typescript
// class-validator - decorators on classes (used with NestJS)
import { IsString, IsInt, IsEmail, Min } from "class-validator";

class CreateUserDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(0)
  age: number;

  @IsEmail()
  email: string;
}
```

### Pydantic: Types ARE the Validation

In Python with Pydantic, you write **one thing** and it serves as both the type annotation AND the runtime validation:

```python
from pydantic import BaseModel, EmailStr

class User(BaseModel):
    name: str
    age: int
    email: EmailStr

# This IS your schema. It IS your type. It IS your validator.
# One declaration, everything works.
user = User.model_validate(request_json)  # validates at runtime, raises on failure
```

### Side-by-Side Comparison Table

| Feature | TypeScript + Zod | Python + Pydantic |
|---|---|---|
| Type definition | `interface` / `type` | Type hints on class fields |
| Runtime validation | Separate Zod schema | Built into the model |
| Type inference | `z.infer<typeof Schema>` | Already a Python type |
| JSON parsing | `schema.parse(json)` | `Model.model_validate_json(json)` |
| Error details | `ZodError.issues[]` | `ValidationError.errors()` |
| Serialization | Manual / `JSON.stringify` | `model.model_dump_json()` |
| Nested schemas | `z.object({ sub: SubSchema })` | `class Parent(BaseModel): sub: SubModel` |
| Default values | `z.string().default("hi")` | `name: str = "hi"` |

---

## Why Pydantic Matters for FastAPI

If you plan to learn **FastAPI** (the Python equivalent of Express/Fastify/NestJS), Pydantic is not optional -- it is the backbone of the entire framework.

```python
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class Item(BaseModel):
    name: str
    price: float
    in_stock: bool = True

@app.post("/items/")
async def create_item(item: Item):  # FastAPI uses Pydantic to:
    # 1. Parse the request body
    # 2. Validate all fields
    # 3. Return 422 errors automatically if validation fails
    # 4. Generate OpenAPI/Swagger docs from the model
    return {"item_name": item.name, "price": item.price}
```

Compare that with an Express + Zod setup:

```typescript
// Express - you wire everything yourself
app.post("/items", (req, res) => {
  const result = ItemSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(422).json({ errors: result.error.issues });
  }
  const item = result.data;
  res.json({ item_name: item.name, price: item.price });
});
```

FastAPI removes all that boilerplate because Pydantic models are first-class citizens in the framework.

---

## Pydantic v2: The Current Version

Pydantic v2 (released mid-2023) was a ground-up rewrite. The core validation engine is now written in **Rust** (via the `pydantic-core` package), which makes it dramatically faster.

Key differences from v1 (you will see v1 code in older tutorials):

| v1 (Legacy) | v2 (Current) |
|---|---|
| `.dict()` | `.model_dump()` |
| `.json()` | `.model_dump_json()` |
| `.parse_obj(data)` | `.model_validate(data)` |
| `.parse_raw(json_str)` | `.model_validate_json(json_str)` |
| `.schema()` | `.model_json_schema()` |
| `@validator` | `@field_validator` |
| `@root_validator` | `@model_validator` |
| `class Config:` inside model | `model_config = ConfigDict(...)` |
| Pure Python core | Rust core (5-50x faster) |

Always use v2 syntax. If you see `.dict()` or `@validator` in a tutorial, it is v1 code.

---

## Installing Pydantic

```bash
# Basic install
pip install pydantic

# With extra validation types (EmailStr, HttpUrl, etc.)
pip install "pydantic[email]"

# Check your version
python -c "import pydantic; print(pydantic.__version__)"
# Should print 2.x.x
```

If you use a virtual environment (and you should):

```bash
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install "pydantic[email]"
```

---

## Your First Pydantic Model

```python
from pydantic import BaseModel

class Product(BaseModel):
    name: str
    price: float
    quantity: int = 0  # default value

# Create from keyword arguments
p1 = Product(name="Laptop", price=999.99, quantity=5)
print(p1)
# name='Laptop' price=999.99 quantity=5

# Create from a dictionary (like parsing a request body)
data = {"name": "Mouse", "price": 29.99}
p2 = Product.model_validate(data)
print(p2)
# name='Mouse' price=29.99 quantity=0  (default applied)

# Pydantic coerces types when it can (like Zod's .coerce)
p3 = Product(name="Keyboard", price="49.99", quantity="3")
print(p3.price)    # 49.99 (float, not string)
print(p3.quantity)  # 3 (int, not string)

# But it rejects truly invalid data
try:
    p4 = Product(name="Monitor", price="not a price")
except Exception as e:
    print(e)
    # 1 validation error for Product
    # price
    #   Input should be a valid number, unable to parse string as a number
```

---

## Practice Exercises

### Exercise 1: Hello Pydantic
Create a `Book` model with fields: `title` (str), `author` (str), `pages` (int), `price` (float). Create an instance from a dictionary and print it.

### Exercise 2: Type Coercion
Create a `Config` model with `debug` (bool), `port` (int), `host` (str). Try creating it with `{"debug": "true", "port": "8080", "host": "localhost"}`. What types do the fields end up as? What happens if you pass `debug=1`?

### Exercise 3: Validation Errors
Create a model and intentionally pass invalid data. Catch the `ValidationError` and print the list of errors using `e.errors()`. Inspect the structure of each error (loc, msg, type).

### Exercise 4: Compare with Zod
If you have a Zod schema in an existing project, rewrite it as a Pydantic model. Note the differences in syntax. Which feels more natural? Which has less boilerplate?

### Exercise 5: Install and Verify
Create a new virtual environment, install pydantic with the email extra, and verify the version is 2.x. Write a script that imports `pydantic` and `EmailStr` and prints a success message.
