# 02 - Basic Models

## BaseModel: Yeh Foundations Hain

Haan, Pydantic mein sab kuch `BaseModel` se start hota hai. Socho isko ek blueprint ke tarah — jaise Zomato par restaurant ka menu jab tum banate ho, tab ek fixed format hota na. Pydantic ka `BaseModel` bhi same kaam karta hai.

Tu bas class-level annotations likha de type hints ke saath, aur boom — pura validation, serialization, aur documentation handle ho jayega.

```python
from pydantic import BaseModel

class User(BaseModel):
    username: str
    email: str
    age: int
    is_active: bool = True  # default value
```

### TypeScript/Zod ke Nazar se

Agar tu Node.js/TypeScript aata hai to dekh kaise kaam karte ho vahan:

```typescript
// TypeScript interface (sirf type check, runtime validation nahi)
interface User {
  username: string;
  email: string;
  age: number;
  isActive: boolean;
}

// Zod schema (runtime validation add karne ke liye)
const UserSchema = z.object({
  username: z.string(),
  email: z.string(),
  age: z.number().int(),
  isActive: z.boolean().default(true),
});
type User = z.infer<typeof UserSchema>;
```

Dekh, TypeScript mein tujhe interface aur Zod schema dono likhnay padhe (duplication!). Lekin Pydantic mein? Bas ek hi class likha, aur sab kuch handle ho gaya — type AND validator dono. Bilkul jaise Swiggy ka order form — ek hi place se order type, payment type, delivery address sab define hota hai.

---

## Instances Kaise Banate Ho

### Keyword Arguments Se (Jaise Zomato mein form fill karna)

```python
user = User(username="alice", email="alice@example.com", age=28)
print(user.username)   # "alice"
print(user.age)        # 28
print(user.is_active)  # True (default woh apply ho gaya)
```

### Dictionary Se (API request ka data parse karte time exactly yeh use hoga)

```python
data = {"username": "bob", "email": "bob@example.com", "age": 35}
user = User.model_validate(data)
```

Yeh bilkul Zod ke `schema.parse(data)` jaisa hi hai.

### JSON String Se (Backend se raw JSON aya to)

```python
json_str = '{"username": "charlie", "email": "charlie@example.com", "age": 22}'
user = User.model_validate_json(json_str)
```

Yeh `JSON.parse()` + `schema.parse()` dono together kaam karta hai. Ekdum efficient!

### Comparison Table (Tere Node.js experience ke liye)

| Operation | Pydantic | Zod |
|---|---|---|
| Keyword args se | `User(name="x")` | N/A (Zod nahi karta) |
| Dict/object se | `User.model_validate(d)` | `schema.parse(obj)` |
| JSON string se | `User.model_validate_json(s)` | `schema.parse(JSON.parse(s))` |

---

## Fields Access Karna

Pydantic models normal Python objects jaisa hi kaam karte hain:

```python
user = User(username="alice", email="alice@example.com", age=28)

# Attribute access (bilkul normal Python)
print(user.username)  # "alice"
print(user.email)     # "alice@example.com"

# Metadata dekhni ho to model_fields use kar
print(User.model_fields.keys())
# dict_keys(['username', 'email', 'age', 'is_active'])
```

Default mein Pydantic models **mutable** hote hain (tu field change kar sakte ho):

```python
user.age = 29  # yeh kaam karega
print(user.age)  # 29
```

Agar frozen (immutable) banana hai — jaise Config file jo startup ke baad change nahi hona chahiye:

```python
from pydantic import ConfigDict

class ImmutableUser(BaseModel):
    model_config = ConfigDict(frozen=True)

    username: str
    age: int

u = ImmutableUser(username="alice", age=28)
u.age = 29  # ERROR! ValidationError: Instance is frozen
```

> [!tip]
> **Frozen models** production configs ke liye perfect hain. Once application start ho gaya, settings change nahi hongi. Safety ke liye bahut badhiya.

---

## Serialization: model_dump() Aur model_dump_json()

### model_dump() — Dictionary Mein Convert Karna

```python
user = User(username="alice", email="alice@example.com", age=28)

d = user.model_dump()
print(d)
# {'username': 'alice', 'email': 'alice@example.com', 'age': 28, 'is_active': True}
print(type(d))  # <class 'dict'>
```

Yeh JavaScript mein `{ ...user }` ya `Object.assign({}, user)` jaisa hai.

### model_dump_json() — JSON String Mein Convert Karna

```python
json_str = user.model_dump_json()
print(json_str)
# '{"username":"alice","email":"alice@example.com","age":28,"is_active":true}'
print(type(json_str))  # <class 'str'>
```

Bilkul `JSON.stringify(user)` jaisa. Database mein store karna hai ya API response banana hai? Yeh use kar.

### Filtering: Sirf Jo Fields Chahiye

Kabhi sirf kuch fields chahiye? Use `include` aur `exclude`:

```python
# Sirf username aur email chahiye
user.model_dump(include={"username", "email"})
# {'username': 'alice', 'email': 'alice@example.com'}

# is_active ko exclude kar do
user.model_dump(exclude={"is_active"})
# {'username': 'alice', 'email': 'alice@example.com', 'age': 28}

# Defaults ko exclude kar (jinka default value hai abhi bhi)
user.model_dump(exclude_defaults=True)
# {'username': 'alice', 'email': 'alice@example.com', 'age': 28}
# (is_active excluded kiya kyunki abhi default True hi hai)

# None values ko exclude kar
user.model_dump(exclude_none=True)
# Bilkul lodash ke _.omitBy(obj, _.isNil) jaisa
```

> [!info]
> **API responses ke liye tip:** Passwords, internal IDs, timestamps jab API se bhej rahe ho, tab `exclude` use kar. Security ke liye zaruri hai!

---

## Deserialization: model_validate() Aur model_validate_json()

### model_validate() — Dictionary Se Validate Karna

```python
data = {"username": "dave", "email": "dave@example.com", "age": 40}
user = User.model_validate(data)
```

Simple. Data validate ho gaya aur User object ban gaya.

### model_validate_json() — JSON String Se Validate Karna

```python
raw = '{"username": "eve", "email": "eve@example.com", "age": 33}'
user = User.model_validate_json(raw)
```

Raw JSON string directly validate.

### Strict Mode (Jab Tu Bilkul "No Nonsense" Chahiye)

Default mein Pydantic lenient hota hai — `"42"` ko `42` mein convert kar deta hai. Lekin agar tu chahta hai ki nahi, sirf exact types accept ho:

```python
# Strict mode enabled - no type coercion
user = User.model_validate(
    {"username": "frank", "email": "frank@example.com", "age": "25"},
    strict=True
)
# ERROR! ValidationError: age - Input should be a valid integer
# (string "25" reject ho gaya strict mode mein)
```

**Comparison with Zod:**
```typescript
// Zod strict default se hi hai
z.number().parse("42");        // ERROR
z.coerce.number().parse("42"); // 42 (explicit coercion)
```

Yeh dekh: Pydantic lenient (coerce karta hai), Zod strict (reject karta hai). Dono ke philosophy alag hain. Jab Pydantic use kar rahe ho to samajh rakhna.

> [!warning]
> **Strict mode kab use kar:** Jab data internal service se aaye (already properly typed) ya critical operation ho. External API se data? Default lenient mode theek hai.

---

## Default Values (Templates Jaisa)

```python
from pydantic import BaseModel
from typing import Optional

class ServerConfig(BaseModel):
    host: str = "localhost"       # default string
    port: int = 8000              # default int
    debug: bool = False            # default bool
    workers: int = 4              # default int

# Sab defaults lega
config = ServerConfig()
print(config)
# host='localhost' port=8000 debug=False workers=4

# Kuch override kar
config = ServerConfig(port=3000, debug=True)
print(config)
# host='localhost' port=3000 debug=True workers=4
```

Bilkul jaise Uber app default settings ke saath start hota hai, lekin tu customize kar sakte ho.

### Mutable Defaults — `default_factory` Use Kar (Yeh Important Hai!)

Python mein ek classic gotcha hai — list ya dict defaults. Pydantic ke paas solution hai `Field(default_factory=...)`:

```python
from pydantic import BaseModel, Field

class TodoList(BaseModel):
    name: str
    # GALAT: tags: list[str] = []  -- Pydantic handle karega, but explicit better:
    tags: list[str] = Field(default_factory=list)
    metadata: dict[str, str] = Field(default_factory=dict)
```

Pydantic v2 smart hai aur automatically copy kar deta hai mutable defaults, lekin `default_factory` explicit aur Pythonic way hai.

**JavaScript analogy:**
```typescript
class TodoList {
  tags: string[] = []; // har instance ko naya array milega class syntax mein
}
```

---

## Required vs Optional Fields (Zaruri vs Ichchhit)

### Required Fields (Zaruri)

```python
class User(BaseModel):
    username: str    # ZARURI - pass karna hi padega
    email: str       # ZARURI - pass karna hi padega
```

Agar zaruri field miss kar diya:
```python
User(username="alice")
# ERROR! ValidationError: 1 validation error for User
# email
#   Field required
```

### Optional Fields (Default Ke Saath)

```python
class User(BaseModel):
    username: str           # zaruri
    email: str              # zaruri
    bio: str = ""           # ichchhit, empty string default
    age: int | None = None  # ichchhit, None default
```

### `Optional` Type vs Default Value — Confusion Mitao!

Yeh confusing hota hai. Samjha de:

```python
from typing import Optional

class Profile(BaseModel):
    # ZARURI lekin None ho sakte
    # Tu pass KARNA PadegA field, but value None bhi ho sakte
    middle_name: str | None    # Optional[str] jaisa, but NO DEFAULT - so zaruri!

    # ICHCHHIT aur None ho sakte (most common pattern)
    nickname: str | None = None  # has default, so omit kar sakte ho

    # ZARURI aur None nahi ho sakte
    username: str

    # ICHCHHIT aur None nahi ho sakte
    role: str = "user"
```

Try kar:
```python
# Yeh kaam karega:
Profile(middle_name=None, username="alice")

# Yeh FAIL hoga (middle_name zaruri hai, even though Optional):
Profile(username="alice")
# ERROR! ValidationError: middle_name - Field required
```

**TypeScript mein kaise hota:**
```typescript
interface Profile {
  middleName: string | null;      // required, nullable
  nickname?: string | null;       // optional, nullable (omit kar sakte ho)
  username: string;               // required, non-nullable
  role?: string;                  // optional, non-nullable (defaults handled)
}
```

### Quick Reference Table

| Python Type | Zaruri? | None Ho Sakte? |
|---|---|---|
| `str` | Haan | Nahi |
| `str = "default"` | Nahi | Nahi |
| `str \| None` | Haan | Haan |
| `str \| None = None` | Nahi | Haan |

---

## BaseModel vs Dataclass: Kaunsa Use Karun?

Python ke paas choices hain data structures ke liye. Samjha de sab:

### Standard Library dataclass

```python
from dataclasses import dataclass

@dataclass
class Point:
    x: float
    y: float
```

- Validation? Nahi
- Serialization? Nahi
- Python built-in? Haan
- Use case: Simple internal data containers

### Pydantic BaseModel

```python
from pydantic import BaseModel

class Point(BaseModel):
    x: float
    y: float
```

- Validation? Bilkul!
- Serialization? `.model_dump()`, `.model_dump_json()` sab
- JSON Schema generation? Haan!
- Use case: API boundaries, configs, external data

### Pydantic dataclass (Rare Use)

```python
from pydantic.dataclasses import dataclass

@dataclass
class Point:
    x: float
    y: float
```

- Validation? Haan
- Standard dataclass tools compatible? Haan
- `.model_dump()` method? Nahi
- Use case: Validated internal data, lekin serialization nahi chahiye

### Kaunsa Use Kar: Golden Rule

**Node.js dev ke taur se:**

1. **`BaseModel` use kar DEFAULT** — API requests, responses, configs, database rows — anything external data touched karta ho
2. **Standard `dataclass`** — simple internal containers, validation bhi nahi chahiye
3. **Pydantic `dataclass`** — rare, sirf jab validated internal data chahiye aur dataclass tooling compatibility

> [!tip]
> Zyada sochna mat, BaseModel से शुरू kar. Pydantic ke features lajawaab hain.

---

## Real-World Example: Express + Zod vs FastAPI + Pydantic

### Express + Zod (TypeScript — Tera Current Stack)

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
  // ... user create kar
});
```

Dekh kitna boilerplate! `safeParse`, error handling, manual response...

### FastAPI + Pydantic (Python — Ab Kya Hoga)

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
    # Validation automatic. 422 returned automatically on failure.
    # user already validated CreateUser instance hai.
    ...
```

**Dekh farak:**
- Validation? Automatic
- Error handling? FastAPI handle karta hai
- Response status codes? Automatic 422 on errors
- Type hints? Built-in

Yeh Python ki taaqat hai. Express mein tu khud error handling likha, FastAPI mein tu sirf logic likha!

---

## Practice Exercises

### Exercise 1: Basic Model Banana

`BlogPost` model bana: 
- `title` (str, zaruri)
- `content` (str, zaruri)
- `author` (str, zaruri)
- `published` (bool, default False)
- `views` (int, default 0)

Instances bana keyword args se, dict se, JSON string se.

### Exercise 2: Serialization Round-Trip

`Product` model bana, instantiate kar, `model_dump()` se dict banao, `model_dump_json()` se JSON banao. Phir `model_validate_json()` se back parse kar. Sab fields match ho rahe ho na check kar.

### Exercise 3: Required vs Optional

`Address` model bana:
- `street` — zaruri
- `city` — zaruri
- `state` — default "Unknown"
- `zip_code` — `str | None = None`

Different combinations try kar. Kaun combinations fail hoti hain? Kaun pass hoti hain?

### Exercise 4: Include/Exclude

`UserProfile` model bana: `username`, `email`, `password_hash`, `created_at`.
- `model_dump(exclude={"password_hash"})` use kar "safe" dict API response ke liye
- `model_dump(include={"username", "email"})` use kar minimal representation

### Exercise 5: Strict vs Lax Modes

`Settings` model: `port: int` aur `debug: bool`.
`{"port": "8080", "debug": "true"}` pass kar with aur without `strict=True`. Difference dekh. Kab strict mode chahiye socho (hint: internal service se data, already properly typed).

### Exercise 6: Frozen Model

Immutable `Config` model bana `ConfigDict(frozen=True)`. Creation ke baad field modify karne try kar. Error catch kar print kar. Socho kab immutability zaruri hai (hint: startup configs that shouldn't change).

---

## Key Takeaways

- **BaseModel = Blueprint:** Zomato ka menu template jaisa. Ek baar define kar, sab instances automatically validated
- **Four Ways to Create:** Keywords, dict, JSON string, ya `model_validate()`
- **Serialization Easy:** `.model_dump()` for dict, `.model_dump_json()` for JSON — filtering optional
- **Required vs Optional:** Type hint vs default value — dono matter karte hain
- **Strict Mode:** Default lenient (coerce), but strict mode available when needed
- **BaseModel First:** API data, configs, everything external — BaseModel use kar. Dataclass sirf internal simple data
- **FastAPI Magic:** Pydantic + FastAPI together = automatic validation + automatic error responses. Node.js mein yeh boilerplate tha!
