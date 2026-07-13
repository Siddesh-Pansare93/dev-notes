# 02 - Routing in FastAPI

## Route Decorators

Socho ek second — Express mein tumne `app.get()`, `app.post()` jaisa likha hai na? FastAPI bhi exactly same kaam karta hai, bas Python style mein — decorators use hote hain.

Concept completely same hai. Sirf syntax different hai, jaise Hinglish vs English.

### Express.js

```javascript
app.get('/users', handler);
app.post('/users', handler);
app.put('/users/:id', handler);
app.delete('/users/:id', handler);
app.patch('/users/:id', handler);
```

### FastAPI

```python
@app.get("/users")
def get_users(): ...

@app.post("/users")
def create_user(): ...

@app.put("/users/{user_id}")
def update_user(user_id: int): ...

@app.delete("/users/{user_id}")
def delete_user(user_id: int): ...

@app.patch("/users/{user_id}")
def patch_user(user_id: int): ...
```

Decorator ke upar likha `@app.get()` — ye bata raha hai ki ye function HTTP GET request ko handle karega. Python ke decorators ka ye fayda hai ki code padh lo toh samajh aa jayega.

### Sab HTTP Methods Ek Saath

```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/resource")       # GET request
@app.post("/resource")      # POST request - naya data bhejna
@app.put("/resource/{id}")  # PUT request - pura object replace karna
@app.delete("/resource/{id}")  # DELETE request
@app.patch("/resource/{id}")   # PATCH request - sirf kuch fields update karna
@app.options("/resource")   # OPTIONS - kya kya kiya ja sakta hai yeh dekha
@app.head("/resource")      # HEAD - GET jaise but sirf headers, body nahi
```

---

## Path Parameters

### Express.js: Colon Wali Syntax

Express mein `:` use hota hai path parameters ke liye.

```javascript
// Express uses :param syntax
app.get('/users/:userId/posts/:postId', (req, res) => {
  const { userId, postId } = req.params;
  // Haan, userId aur postId ALWAYS string hote hain!
  // Toh parseInt() se convert karna padta hai
  const numericId = parseInt(userId);
  res.json({ userId: numericId, postId });
});
```

Problem ye hai — `userId` hamesha string ata hai. Agar bhool gaye parseInt karna toh bugs ayenge.

### FastAPI: Curly Braces + Type Safety

FastAPI mein `{}` use hote hain aur type annotation se FastAPI khud type checking kar leta hai!

```python
# FastAPI uses {param} syntax with type annotations
@app.get("/users/{user_id}/posts/{post_id}")
def get_user_post(user_id: int, post_id: int):
    # Dekho na! user_id aur post_id ALREADY integers hain!
    # FastAPI ne khud parse kar diya automatically
    return {"user_id": user_id, "post_id": post_id}
```

**Bada farak**: Express mein manually convert karna padta tha. FastAPI mein type annotation likha aur khatam:

1. String ko integer mein parse kar deta hai
2. Agar conversion fail ho toh automatically 422 error bhej deta hai
3. Swagger documentation mein bhi sahi type show karta hai

Yeh type safety na... bohot mazedaar hai! 💪

### Path Parameter Validation

Agar validation add karni hai toh `Path()` use karo:

```python
from fastapi import Path

@app.get("/items/{item_id}")
def get_item(
    item_id: int = Path(
        title="The ID of the item",
        description="Must be a positive integer",
        gt=0,          # greater than 0
        le=10000,      # less than or equal to 10000
        examples=[42]
    )
):
    return {"item_id": item_id}
```

Express mein toh middleware aur validation library lena padta tha. FastAPI mein parameter likha aur validation built-in!

> [!tip]
> `gt=0` means "greater than 0", `le=10000` means "less than or equal to 10000". Sab constraints ek jagah!

### Enum Path Parameters

Socho Zomato par restaurant filter karte ho — specific restaurants hi select ho sakte ho. Enum kuch aisa hi kaam karta hai.

```python
from enum import Enum

class ModelName(str, Enum):
    alexnet = "alexnet"
    resnet = "resnet"
    lenet = "lenet"

@app.get("/models/{model_name}")
def get_model(model_name: ModelName):
    # model_name automatically enum check ho jayega
    # Swagger UI mein dropdown dikhega sab options ka!
    return {"model": model_name, "message": f"Selected {model_name.value}"}
```

Jaise IRCTC par class select karte ho — AC, Sleeper, General — enum wahi kaam karta hai. Invalid value bhej do toh error aajata hai.

### Path Parameters with File Paths

File path mein slashes hote hain. Toh special syntax chahiye:

```python
# :path converter se slashes bhi accept ho jaate hain
@app.get("/files/{file_path:path}")
def read_file(file_path: str):
    # file_path ho sakta hai "documents/2024/report.pdf"
    return {"file_path": file_path}
```

Express mein wildcard `*` use hota tha. FastAPI mein `:path` likha toh samajh aa jayega kya chal raha hai.

---

## Query Parameters

Yaha FastAPI ka dum nikalta hai Express se compare mein!

### Express.js — Manual Kaam

```javascript
// GET /search?q=python&page=1&limit=10
app.get('/search', (req, res) => {
  const q = req.query.q;          // string | undefined -- validation nahi!
  const page = parseInt(req.query.page) || 1;  // manual parseInt
  const limit = parseInt(req.query.limit) || 10; // phir se parseInt
  // Type safety nahi, validation nahi, documentation nahi... kuch nahi!
  res.json({ q, page, limit });
});
```

Express mein sabkuch manually handle karna padta hai. Bhool gaye to bug fix karna padta hai later.

### FastAPI — Automatic Kaam

```python
# GET /search?q=python&page=1&limit=10
@app.get("/search")
def search(q: str, page: int = 1, limit: int = 10):
    # q required hai — agar bheja nahi to FastAPI automatically 422 error deta hai
    # page ka default 1 hai, limit ka default 10 hai
    # Sab automatically parse, validate, aur document ho jayega!
    return {"q": q, "page": page, "limit": limit}
```

**Simple rule**: Function mein jo parameter likha hai aur path mein nahi hai toh vo query parameter ban jayega. Sirf itna.

### Optional Query Parameters

```python
from typing import Optional
# Ya Python 3.10+ mein: str | None use karo

@app.get("/items")
def list_items(
    skip: int = 0,
    limit: int = 10,
    search: str | None = None,  # Optional query param
):
    # Agar search nahi bheja to None milega
    return {"skip": skip, "limit": limit, "search": search}
```

Jaise Flipkart par filters — koi bhi filter optional ho sakta hai.

### Query Parameter Validation

```python
from fastapi import Query

@app.get("/items")
def list_items(
    q: str | None = Query(
        default=None,
        min_length=3,
        max_length=50,
        pattern="^[a-zA-Z0-9 ]+$",  # regex validation
        title="Search query",
        description="Search items by name",
    ),
    skip: int = Query(default=0, ge=0),        # >= 0
    limit: int = Query(default=10, ge=1, le=100),  # 1 se 100 tak
):
    return {"q": q, "skip": skip, "limit": limit}
```

`Query()` se validation define kar do:
- `min_length=3` — minimum 3 characters
- `max_length=50` — maximum 50 characters
- `pattern` — regex validation
- `ge=0` — greater than or equal to 0
- `le=100` — less than or equal to 100

### List Query Parameters

Agar multiple values bhejne ho? Jaise Swiggy mein cuisines filter karte ho — multiple cuisines select kar sakte ho.

```python
# GET /items?tags=python&tags=fastapi&tags=api
@app.get("/items")
def filter_items(tags: list[str] = Query(default=[])):
    return {"tags": tags}
    # tags = ["python", "fastapi", "api"]
```

Express mein ye thoda complicated hota tha — sometimes string, sometimes array. FastAPI mein bas `list[str]` likha aur khatam! 🎯

---

## Request Body

### Express.js — Poora Setup

```javascript
// Pehle middleware setup karna padta tha
app.use(express.json());

app.post('/users', (req, res) => {
  const { name, email, age } = req.body;
  // Koi bhi validation nahi! req.body kuch bhi ho sakta hai
  // Validation karne ke liye zod/joi library use karna padta tha

  const result = UserSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(422).json({ errors: result.error });
  }
  // Phir check, phir return, phir error handling...
});
```

Express mein body validation ek chhota saa episode hota hai.

### FastAPI with Pydantic

Pydantic model likha aur bas! Pydantic TypeScript ke interface + Zod schema + class-validator — sabkuch ek hi jagah.

```python
from pydantic import BaseModel, EmailStr, Field

# Ye ek complete contract hai request body ke liye
class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr                    # Email format validate hoga automatically
    age: int = Field(ge=0, le=150)     # 0 se 150 tak
    bio: str | None = None             # Optional field
    tags: list[str] = []               # Default empty list

@app.post("/users")
def create_user(user: UserCreate):
    # user already validated hai! Koi try/catch nahi, koi manual validation nahi
    # Agar koi field invalid ho to FastAPI automatically 422 error bhej deta hai
    print(user.name)    # Autocompletion bhi kaam karega!
    print(user.email)
    return {"message": f"Created user {user.name}", "user": user}
```

**Fayda**: Request ko Pydantic model se define kar do aur validation khud hoti hai. Type safety + validation + autocompletion — sabkuch ek jagah!

### Invalid Input pe Kya Hota Hai?

Agar koi `{"name": "", "email": "not-an-email", "age": -5}` bhejna chahega toh:

```json
{
  "detail": [
    {
      "type": "string_too_short",
      "loc": ["body", "name"],
      "msg": "String should have at least 1 character",
      "input": ""
    },
    {
      "type": "value_error",
      "loc": ["body", "email"],
      "msg": "value is not a valid email address"
    },
    {
      "type": "greater_than_equal",
      "loc": ["body", "age"],
      "msg": "Input should be greater than or equal to 0",
      "input": -5
    }
  ]
}
```

FastAPI ne khud error generate kar diya! Code likha aur khud error messages ban gaye. No code needed.

### Nested Models

Jaise order mein items ho, har item ka specifications ho — nested models aise hi kaam karte hain.

```python
from pydantic import BaseModel

class Address(BaseModel):
    street: str
    city: str
    country: str
    zip_code: str

class UserCreate(BaseModel):
    name: str
    email: str
    address: Address                    # Nested model
    shipping_addresses: list[Address]   # List of nested models

@app.post("/users")
def create_user(user: UserCreate):
    # user aur uska nested address dono fully validated hain
    print(user.address.city)
    return user
```

Jaise Swiggy ka order — main order mein items, har item mein quantity aur customization. Nested models yahi allow karte hain.

### Combining Path, Query, aur Body Parameters

FastAPI samajh jayega ki konsa parameter kaha se ata hai:

```python
@app.put("/users/{user_id}")
def update_user(
    user_id: int,                    # Path parameter (URL mein hai)
    notify: bool = False,            # Query parameter (URL ke end mein)
    user: UserCreate = ...,          # Body parameter (request body mein)
):
    return {
        "user_id": user_id,
        "notify": notify,
        "user": user,
    }
```

FastAPI ka logic:
- `user_id` ko `{user_id}` path mein match karke samajh jayega — **path parameter**
- `notify` simple type hai aur path mein nahi — **query parameter**
- `user` Pydantic model hai — **request body**

Yeh automatic detection FastAPI ka magic hai! 🪄

---

## Response Models

### Kya Return Karna Hai Aur Kya Nahi

Socho — request mein password le raha ho, response mein password reveal nahi karna chahte. Response model se ye kar sakte ho:

```python
class UserCreate(BaseModel):
    name: str
    email: str
    password: str     # Request mein le rahe ho...

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    # Password field hi nahi! Response mein nahi aayega.

@app.post("/users", response_model=UserResponse, status_code=201)
def create_user(user: UserCreate):
    # Handler ko jo bhi return karna hai, response_model se filter hoga
    new_user = {
        "id": 1,
        "name": user.name,
        "email": user.email,
        "password": user.password,  # Ye response mein nahi aayega!
    }
    return new_user
```

Express mein toh manually fields pick karne padta tha `res.json({name, email})`. FastAPI mein `response_model` likha aur filter automatic!

### Response Model Options

```python
@app.get(
    "/users/{user_id}",
    response_model=UserResponse,
    response_model_exclude_unset=True,   # Default values exclude kar do agar set nahi hue
    response_model_exclude_none=True,    # None values exclude kar do
    response_model_exclude={"internal_notes"},  # Specific fields exclude kar do
)
def get_user(user_id: int):
    ...
```

Flexible response filtering!

### Multiple Response Types

Jaise API 404 return kar sakta hai, 403 return kar sakta hai. Ye sab document kar do:

```python
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse

@app.get(
    "/items/{item_id}",
    response_model=ItemResponse,
    responses={
        404: {"description": "Item not found"},
        403: {"description": "Not authorized"},
    },
)
def get_item(item_id: int):
    item = find_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item
```

Swagger UI mein ye sab responses dikhenge. API user ko pata chal jayega kya-kya ho sakta hai!

---

## Status Codes

### Express.js — Yaad Rakhna Padta Tha

```javascript
app.post('/users', (req, res) => {
  // Status likha nahi to bhool gaye
  res.status(201).json(newUser);
});

app.delete('/users/:id', (req, res) => {
  // 204 status likhi nahi to bug! (Easy to forget)
  res.status(204).send();
});
```

Express mein `res.status()` likha nahi to default 200 jayega. Sometimes galat status jayega.

### FastAPI — Clear aur Explicit

```python
from fastapi import status

# Decorator mein status likha aur khatam
@app.post("/users", status_code=201)
def create_user(user: UserCreate):
    return new_user

# Ya named constants use karo — zyada readable
@app.post("/users", status_code=status.HTTP_201_CREATED)
def create_user(user: UserCreate):
    return new_user

@app.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int):
    # 204 ke liye kuch return nahi karna
    pass
```

FastAPI mein status code decorator mein likha ho toh consistent rahega. Bhooling ki chance kam.

Sab common status codes:

```python
from fastapi import status

status.HTTP_200_OK                  # Success
status.HTTP_201_CREATED             # Resource created
status.HTTP_204_NO_CONTENT          # Success, no content
status.HTTP_400_BAD_REQUEST         # Client ne galat data bheja
status.HTTP_401_UNAUTHORIZED        # Login zaroori hai
status.HTTP_403_FORBIDDEN           # Permission nahi hai
status.HTTP_404_NOT_FOUND           # Resource nahi mila
status.HTTP_422_UNPROCESSABLE_ENTITY  # Validation error
status.HTTP_500_INTERNAL_SERVER_ERROR # Server error
```

---

## Route Ordering

Express jaise hi FastAPI mein bhi route order matter karta hai!

### Sahi Order — Specific Pehle, General Baad Mein

```python
# Ye sahi hai
@app.get("/users/me")       # Specific route pehle
def get_current_user():
    return {"user": "current"}

@app.get("/users/{user_id}")  # General route baad mein
def get_user(user_id: str):
    return {"user_id": user_id}
```

Jab `/users/me` request aaye toh pehla route match hoga. Sahi!

### Galat Order — Bug Aaega

```python
# Ye GALAT hai!
@app.get("/users/{user_id}")  # Ye sab kuch catch kar lega!
def get_user(user_id: str):
    return {"user_id": user_id}

@app.get("/users/me")       # Ye kabhi reach hi nahi hoga
def get_current_user():
    return {"user": "current"}
```

Jab `/users/me` request aaye toh `{user_id}` = `"me"` ban jayega aur pehla function run hoga. Bug! 🐛

Express mein bhi yahi problem hai:

```javascript
// Express mein bhi same issue
router.get('/users/:userId', handler1);  // Ye /users/me ko bhi catch kar le!
router.get('/users/me', handler2);       // Ye kabhi reach nahi hoga
```

**Golden rule**: Specific routes pehle likho, general routes baad mein. Order matters!

---

## Tags and Documentation

FastAPI automatically API docs generate karta hai. `tags` aur docstrings se documentation organize hoti hai:

```python
@app.get("/users", tags=["users"])
def list_users():
    """
    List all users.

    Yeh endpoint sab registered users return karta hai.
    Pagination ke liye skip aur limit parameters support karte hain.
    """
    return []

@app.post("/users", tags=["users"], summary="Create a new user")
def create_user(user: UserCreate):
    """
    User create karo in details ke saath:

    - **name**: user ka display name
    - **email**: valid email address (unique hona chahiye)
    - **password**: at least 8 characters
    """
    return user

@app.get("/items", tags=["items"], deprecated=True)
def old_list_items():
    """Yeh endpoint deprecated hai. Iski jagah /v2/items use karo."""
    return []
```

Docstring toh bana do aur Swagger UI mein automatically description dikhega! Markdown formatting bhi support karte hain.

Swagger UI par Swagger page visit karo (`/docs`) — sab tags ka section dikhe, descriptions likhe, examples likhe. Mazza! 🚀

---

## Practice Exercises

### Exercise 1: Blog Post API Routes

Blog post API banao in endpoints ke saath:
- `GET /posts` — sab posts list karo (query params: `skip`, `limit`, `tag`)
- `GET /posts/{post_id}` — ek post get karo
- `POST /posts` — naya post create karo (body: `title`, `content`, `tags`)
- `PUT /posts/{post_id}` — post update karo
- `DELETE /posts/{post_id}` — post delete karo

Pydantic models use karo request/response ke liye. Posts ko Python list mein store karo.

### Exercise 2: Query Parameter Filtering

`GET /products` endpoint banao jo filter support kare:
- `min_price: float` (optional, >= 0)
- `max_price: float` (optional, >= 0)
- `category: str` (optional, one of: "electronics", "clothing", "food")
- `in_stock: bool` (optional, default True)
- `sort_by: str` (optional, one of: "price", "name", "created_at")

`Query()` se validation define karo. Sample data create karo aur filtering logic implement karo.

### Exercise 3: Nested Request Bodies

`POST /orders` endpoint banao:

```python
class OrderItem(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)

class ShippingAddress(BaseModel):
    street: str
    city: str
    state: str
    zip_code: str = Field(pattern=r"^\d{5}$")

class OrderCreate(BaseModel):
    items: list[OrderItem]         # At least one item hona chahiye
    shipping_address: ShippingAddress
    notes: str | None = None
```

Validate karo ki `items` mein at least ek item hona chahiye using `Field(min_length=1)`.

### Exercise 4: Response Model Filtering

User endpoints banao jahan:
- `POST /users` accepts `UserCreate` (with password)
- `GET /users/{id}` returns `UserResponse` (without password)
- `GET /users/{id}/admin` returns `UserAdminResponse` (with created_at, last_login, is_active)

Password kabhi bhi response mein nahi aayega!

### Exercise 5: Express to FastAPI Translation

Is Express router ko FastAPI mein translate karo:

```javascript
const router = express.Router();

router.get('/api/v1/books', (req, res) => {
  const { genre, author, page = 1, limit = 20 } = req.query;
  // ... filtering logic
  res.json({ books: filteredBooks, total: count, page, limit });
});

router.get('/api/v1/books/:bookId', (req, res) => {
  const book = books.find(b => b.id === parseInt(req.params.bookId));
  if (!book) return res.status(404).json({ error: 'Book not found' });
  res.json(book);
});

router.post('/api/v1/books', (req, res) => {
  const { title, author, genre, pages, isbn } = req.body;
  if (!title || !author) {
    return res.status(400).json({ error: 'Title and author required' });
  }
  const newBook = { id: nextId++, title, author, genre, pages, isbn };
  books.push(newBook);
  res.status(201).json(newBook);
});
```

---

## Key Takeaways

- **Decorators**: `@app.get()`, `@app.post()` — Express ke methods ka Python version
- **Path parameters**: `{user_id: int}` — FastAPI automatically type-check aur validate karta hai
- **Query parameters**: Function mein likha parameter jo path mein nahi = automatically query param ban jayega
- **Request body**: Pydantic model define karo — validation automatically ho jayega
- **Response model**: `response_model` parameter se select karo kya return karna hai, kya nahi
- **Status codes**: Decorator mein `status_code` likha aur consistent rahega
- **Route order**: Specific routes pehle, general routes baad mein — order matters!
- **Documentation**: Docstrings aur tags se automatic Swagger docs ban jayenge
