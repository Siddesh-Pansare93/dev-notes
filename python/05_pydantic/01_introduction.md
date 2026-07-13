# 01 - Introduction to Pydantic

## Pydantic Kya Hai?

Pydantic ek **runtime data validation library** hai Python ke liye jo Python ke type hints use karke data schemas define karta hai. Jab bhi koi data aapke application mein aata hai (API request se, config file se, database se, etc.), Pydantic har ek field ko check karta hai aur ya toh clean, validated object return karta hai ya detailed error throw karta hai.

```python
from pydantic import BaseModel

class User(BaseModel):
    name: str
    age: int
    email: str

# Valid data - sab theek hai
user = User(name="Alice", age=30, email="alice@example.com")

# Invalid data - ValidationError throw hoga RUNTIME pe
user = User(name="Alice", age="not a number", email="alice@example.com")
# ValidationError: 1 validation error for User
# age
#   Input should be a valid integer, unable to parse string as an integer
```

Bas itna ही pitch hai: **apne types declare karo, validation apne aap mil jaayega.**

---

## JS/TS Comparison: Kyun Zaruri Hai?

Agar tum Node.js/TypeScript se aaye ho, toh Pydantic jo problem solve karta hai woh toh tumhe pata ही है। Dekho, ek typical TypeScript project ke layers:

### TypeScript: Types Compile Time Par Hote Hain, Runtime Par Vanish

```typescript
// TypeScript - types sirf compile time par exist karti hain
interface User {
  name: string;
  age: number;
  email: string;
}

// Ye compile toh ho jaayega, lekin runtime par ZERO checking nahi hogi.
// Agar API ko { name: 123, age: "hello" } milega, TypeScript tume bachaa nahi sakta.
function createUser(data: User): User {
  return data; // runtime par koi validation nahi
}
```

Toh real Node.js/Express ya Fastify app mein tume **alag** validation library lag jaati hai:

```typescript
// Zod - runtime validation (alag, aapke TS types se)
import { z } from "zod";

const UserSchema = z.object({
  name: z.string(),
  age: z.number().int().positive(),
  email: z.string().email(),
});

type User = z.infer<typeof UserSchema>; // Zod schema se TS type derive karo

// Ab runtime par validate karo
const result = UserSchema.safeParse(requestBody);
if (!result.success) {
  // errors handle karo
}
```

```typescript
// Joi - ek aur popular runtime validator
import Joi from "joi";

const userSchema = Joi.object({
  name: Joi.string().required(),
  age: Joi.number().integer().positive().required(),
  email: Joi.string().email().required(),
});

const { error, value } = userSchema.validate(requestBody);
```

```typescript
// class-validator - decorators use karti hai (NestJS ke saath use hoti hai)
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

### Pydantic: Types HI Validation Hain

Python mein Pydantic ke saath, tum **ek ही cheez** likho aur wo type annotation bhi ho aur runtime validation bhi:

```python
from pydantic import BaseModel, EmailStr

class User(BaseModel):
    name: str
    age: int
    email: EmailStr

# Ye HI tumhara schema hai. Ye HI tumhara type hai. Ye HI tumhara validator hai.
# Ek jagah likho, sab kaam ho jaaye.
user = User.model_validate(request_json)  # validates runtime par, fail ho toh error
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

## FastAPI Ke Liye Pydantic Kyun Important Hai?

Agar tum **FastAPI** seekhne wale ho (jo Python ka Express/Fastify/NestJS equivalent hai), toh Pydantic optional nahi hai -- wo **pura backbone** है। Imagine karo: jaise Swiggy ke backend mein order data aata hai, aur usko validate karna padta hai (delivery address theek hai, payment valid hai, etc.). FastAPI mein Pydantic exactly yahi kaam karta hai.

```python
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class Item(BaseModel):
    name: str
    price: float
    in_stock: bool = True

@app.post("/items/")
async def create_item(item: Item):  # FastAPI, Pydantic use karta hai:
    # 1. Request body parse karo
    # 2. Sab fields validate karo
    # 3. Agar validation fail ho, auto 422 error return karo
    # 4. OpenAPI/Swagger docs bhi auto generate karo
    return {"item_name": item.name, "price": item.price}
```

Express + Zod ke saath dekho farak:

```typescript
// Express - tume sab manually wire karna padta hai
app.post("/items", (req, res) => {
  const result = ItemSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(422).json({ errors: result.error.issues });
  }
  const item = result.data;
  res.json({ item_name: item.name, price: item.price });
});
```

FastAPI ne woh boilerplate sab hataa diya kyunki Pydantic models framework ke andar first-class citizen hote hain.

---

## Pydantic v2: Current Version

Pydantic v2 (mid-2023 mein release hua) ek ground-up rewrite tha. Core validation engine ab **Rust** mein likha hai (`pydantic-core` package ke through), jo speed mein kaafi faster hai.

Key differences v1 se (tum purane tutorials mein v1 code dekh sakte ho):

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

Hamesha v2 syntax use karo. Agar kisi tutorial mein `.dict()` ya `@validator` dikhe, toh vo v1 code hai.

---

## Pydantic Install Karna

```bash
# Basic install
pip install pydantic

# Extra validation types ke saath (EmailStr, HttpUrl, etc.)
pip install "pydantic[email]"

# Version check karo
python -c "import pydantic; print(pydantic.__version__)"
# 2.x.x print hona chahiye
```

Agar tum virtual environment use karo (aur karo bhi):

```bash
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install "pydantic[email]"
```

---

## Pehla Pydantic Model

```python
from pydantic import BaseModel

class Product(BaseModel):
    name: str
    price: float
    quantity: int = 0  # default value

# Keyword arguments se banao
p1 = Product(name="Laptop", price=999.99, quantity=5)
print(p1)
# name='Laptop' price=999.99 quantity=5

# Dictionary se banao (jaise request body ho)
data = {"name": "Mouse", "price": 29.99}
p2 = Product.model_validate(data)
print(p2)
# name='Mouse' price=29.99 quantity=0  (default apply ho gaya)

# Pydantic types coerce karta hai jab possible ho (Zod ke .coerce jaisa)
p3 = Product(name="Keyboard", price="49.99", quantity="3")
print(p3.price)    # 49.99 (float, string nahi)
print(p3.quantity)  # 3 (int, string nahi)

# Lekin bekar data reject karta hai
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
Ek `Book` model banao fields ke saath: `title` (str), `author` (str), `pages` (int), `price` (float). Dictionary se ek instance banao aur print karo.

### Exercise 2: Type Coercion
Ek `Config` model banao `debug` (bool), `port` (int), `host` (str) ke saath. `{"debug": "true", "port": "8080", "host": "localhost"}` pass karte hue create karo. Fields kis type ke ban gaye? Agar `debug=1` pass karo toh kya hota hai?

### Exercise 3: Validation Errors
Ek model banao aur intentionally invalid data pass karo. `ValidationError` catch karo aur `e.errors()` use karke errors list print karo. Har error ke structure ko dekho (loc, msg, type).

### Exercise 4: Compare with Zod
Agar kisi existing project mein Zod schema hai, toh usse Pydantic model mein rewrite karo. Syntax mein farak note karo. Kaunsa zyada natural lagta है? Kaunse mein less boilerplate hai?

### Exercise 5: Install aur Verify Karo
Ek naya virtual environment banao, pydantic email extra ke saath install karo, aur verify karo version 2.x है। Ek script likho jo `pydantic` aur `EmailStr` import kare aur success message print kare.
