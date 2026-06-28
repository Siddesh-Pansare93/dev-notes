# 02 - Routing in FastAPI

## Route Decorators

In Express, you call methods on the app object. In FastAPI, you use decorators. The concept is identical, the syntax is just Python-flavored.

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

### All HTTP Methods

```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/resource")       # GET
@app.post("/resource")      # POST
@app.put("/resource/{id}")  # PUT
@app.delete("/resource/{id}")  # DELETE
@app.patch("/resource/{id}")   # PATCH
@app.options("/resource")   # OPTIONS
@app.head("/resource")      # HEAD
```

---

## Path Parameters

### Express.js: Colon Syntax

```javascript
// Express uses :param syntax
app.get('/users/:userId/posts/:postId', (req, res) => {
  const { userId, postId } = req.params;
  // userId and postId are always strings!
  const numericId = parseInt(userId);
  res.json({ userId: numericId, postId });
});
```

### FastAPI: Curly Brace Syntax with Type Safety

```python
# FastAPI uses {param} syntax with type annotations
@app.get("/users/{user_id}/posts/{post_id}")
def get_user_post(user_id: int, post_id: int):
    # user_id and post_id are already integers!
    # FastAPI validated and converted them automatically
    return {"user_id": user_id, "post_id": post_id}
```

**Key difference**: In Express, `req.params.userId` is always a string. You have to manually parse it. In FastAPI, the type annotation `user_id: int` means FastAPI will:
1. Parse the string to an integer
2. Return a 422 error if it can't be converted
3. Include the parameter in the OpenAPI docs with the correct type

### Path Parameter Validation

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

In Express, you'd need middleware or a validation library for this. In FastAPI, it's built into the parameter declaration.

### Enum Path Parameters

```python
from enum import Enum

class ModelName(str, Enum):
    alexnet = "alexnet"
    resnet = "resnet"
    lenet = "lenet"

@app.get("/models/{model_name}")
def get_model(model_name: ModelName):
    # model_name is validated against the enum automatically
    # Swagger UI shows a dropdown with the valid options!
    return {"model": model_name, "message": f"Selected {model_name.value}"}
```

### Path Parameters with File Paths

```python
# Use :path converter for parameters containing slashes
@app.get("/files/{file_path:path}")
def read_file(file_path: str):
    # file_path can be "documents/2024/report.pdf"
    return {"file_path": file_path}
```

This is similar to Express's `app.get('/files/*')` wildcard but more explicit.

---

## Query Parameters

This is where FastAPI really shines compared to Express.

### Express.js

```javascript
// GET /search?q=python&page=1&limit=10
app.get('/search', (req, res) => {
  const q = req.query.q;          // string | undefined -- no validation
  const page = parseInt(req.query.page) || 1;  // manual parsing
  const limit = parseInt(req.query.limit) || 10; // manual parsing
  // No type safety, no validation, no documentation
  res.json({ q, page, limit });
});
```

### FastAPI

```python
# GET /search?q=python&page=1&limit=10
@app.get("/search")
def search(q: str, page: int = 1, limit: int = 10):
    # q is required (no default) -- FastAPI returns 422 if missing
    # page defaults to 1, limit defaults to 10
    # All automatically parsed, validated, and documented
    return {"q": q, "page": page, "limit": limit}
```

**The rule is simple**: Any function parameter that is NOT a path parameter is automatically treated as a query parameter.

### Optional Query Parameters

```python
from typing import Optional
# Or in Python 3.10+: use `str | None`

@app.get("/items")
def list_items(
    skip: int = 0,
    limit: int = 10,
    search: str | None = None,  # Optional query param
):
    # search will be None if not provided
    return {"skip": skip, "limit": limit, "search": search}
```

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
    limit: int = Query(default=10, ge=1, le=100),  # 1-100
):
    return {"q": q, "skip": skip, "limit": limit}
```

### List Query Parameters

```python
# GET /items?tags=python&tags=fastapi&tags=api
@app.get("/items")
def filter_items(tags: list[str] = Query(default=[])):
    return {"tags": tags}
    # tags = ["python", "fastapi", "api"]
```

In Express, you'd get `req.query.tags` which might be a string or an array depending on how many values were sent, leading to bugs.

---

## Request Body

### Express.js

```javascript
// Need middleware first
app.use(express.json());

app.post('/users', (req, res) => {
  const { name, email, age } = req.body;
  // No validation! req.body could be anything
  // You'd need zod/joi/class-validator

  const result = UserSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(422).json({ errors: result.error });
  }
  // ...
});
```

### FastAPI with Pydantic

```python
from pydantic import BaseModel, EmailStr, Field

# This is like a TypeScript interface + zod schema + class-validator DTO all in one
class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr                    # Validates email format automatically
    age: int = Field(ge=0, le=150)     # 0-150
    bio: str | None = None             # Optional field
    tags: list[str] = []               # Default empty list

@app.post("/users")
def create_user(user: UserCreate):
    # 'user' is already validated!
    # If validation fails, FastAPI returns a detailed 422 error automatically
    # No try/catch, no manual validation code
    print(user.name)    # Autocompletion works!
    print(user.email)
    return {"message": f"Created user {user.name}", "user": user}
```

### What Happens on Invalid Input?

If someone sends `{"name": "", "email": "not-an-email", "age": -5}`, FastAPI automatically returns:

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

No code needed for this. It just works.

### Nested Models

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
    # Both user and nested address are fully validated
    print(user.address.city)
    return user
```

### Combining Path, Query, and Body Parameters

```python
@app.put("/users/{user_id}")
def update_user(
    user_id: int,                    # Path parameter (in the URL path)
    notify: bool = False,            # Query parameter (not in path, has default)
    user: UserCreate = ...,          # Body parameter (Pydantic model = body)
):
    return {
        "user_id": user_id,
        "notify": notify,
        "user": user,
    }
```

FastAPI figures out which is which:
- `user_id` matches `{user_id}` in the path, so it's a **path parameter**
- `notify` is a simple type with a default, and doesn't match any path parameter, so it's a **query parameter**
- `user` is a Pydantic model, so it's the **request body**

---

## Response Models

### Controlling What Gets Returned

```python
class UserCreate(BaseModel):
    name: str
    email: str
    password: str     # We accept this in the request...

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    # No password field! It won't be in the response.

@app.post("/users", response_model=UserResponse, status_code=201)
def create_user(user: UserCreate):
    # Even if we return an object with a password field,
    # FastAPI will filter it out based on response_model
    new_user = {
        "id": 1,
        "name": user.name,
        "email": user.email,
        "password": user.password,  # This gets stripped from the response!
    }
    return new_user
```

This is like having a serialization layer that automatically removes sensitive fields. In Express, you'd need to manually pick which fields to include in `res.json()`.

### Response Model Options

```python
@app.get(
    "/users/{user_id}",
    response_model=UserResponse,
    response_model_exclude_unset=True,   # Don't include fields with default values that weren't set
    response_model_exclude_none=True,    # Don't include None values
    response_model_exclude={"internal_notes"},  # Exclude specific fields
)
def get_user(user_id: int):
    ...
```

### Multiple Response Types

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

---

## Status Codes

### Express.js

```javascript
app.post('/users', (req, res) => {
  // Must remember to set status
  res.status(201).json(newUser);
});

app.delete('/users/:id', (req, res) => {
  // Easy to forget
  res.status(204).send();
});
```

### FastAPI

```python
from fastapi import status

# Using the status_code parameter in the decorator
@app.post("/users", status_code=201)
def create_user(user: UserCreate):
    return new_user

# Using the status module for readability
@app.post("/users", status_code=status.HTTP_201_CREATED)
def create_user(user: UserCreate):
    return new_user

@app.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int):
    # For 204, don't return anything
    pass
```

Common status codes available:

```python
from fastapi import status

status.HTTP_200_OK
status.HTTP_201_CREATED
status.HTTP_204_NO_CONTENT
status.HTTP_400_BAD_REQUEST
status.HTTP_401_UNAUTHORIZED
status.HTTP_403_FORBIDDEN
status.HTTP_404_NOT_FOUND
status.HTTP_422_UNPROCESSABLE_ENTITY
status.HTTP_500_INTERNAL_SERVER_ERROR
```

---

## Route Ordering

Just like Express, route order matters in FastAPI. More specific routes should come before catch-all routes.

```python
# This works correctly
@app.get("/users/me")       # Specific route first
def get_current_user():
    return {"user": "current"}

@app.get("/users/{user_id}")  # Dynamic route second
def get_user(user_id: str):
    return {"user_id": user_id}
```

```python
# This is BROKEN -- /users/me would match {user_id} = "me"
@app.get("/users/{user_id}")  # Dynamic route catches everything!
def get_user(user_id: str):
    return {"user_id": user_id}

@app.get("/users/me")       # This will never be reached
def get_current_user():
    return {"user": "current"}
```

This is the same behavior as Express:

```javascript
// Express also has the same ordering issue
router.get('/users/:userId', handler1);  // Catches /users/me too!
router.get('/users/me', handler2);       // Never reached
```

---

## Tags and Documentation

FastAPI lets you organize your API docs with tags:

```python
@app.get("/users", tags=["users"])
def list_users():
    """
    List all users.

    This endpoint returns a list of all registered users.
    Supports pagination via skip and limit parameters.
    """
    return []

@app.post("/users", tags=["users"], summary="Create a new user")
def create_user(user: UserCreate):
    """
    Create a user with the following information:

    - **name**: the user's display name
    - **email**: a valid email address (must be unique)
    - **password**: at least 8 characters
    """
    return user

@app.get("/items", tags=["items"], deprecated=True)
def old_list_items():
    """This endpoint is deprecated. Use /v2/items instead."""
    return []
```

The docstrings become the endpoint descriptions in Swagger UI. Markdown formatting is supported. The `deprecated=True` flag shows the endpoint as deprecated in the docs.

---

## Practice Exercises

### Exercise 1: Blog Post API Routes
Create a FastAPI app with these endpoints:
- `GET /posts` -- list all posts (query params: `skip`, `limit`, `tag`)
- `GET /posts/{post_id}` -- get a single post
- `POST /posts` -- create a post (body: `title`, `content`, `tags`)
- `PUT /posts/{post_id}` -- update a post
- `DELETE /posts/{post_id}` -- delete a post

Use Pydantic models for request and response bodies. Store posts in a Python list.

### Exercise 2: Query Parameter Filtering
Create an endpoint `GET /products` that supports:
- `min_price: float` (optional, >= 0)
- `max_price: float` (optional, >= 0)
- `category: str` (optional, one of: "electronics", "clothing", "food")
- `in_stock: bool` (optional, default True)
- `sort_by: str` (optional, one of: "price", "name", "created_at")

Use `Query()` with validation for each parameter. Create sample data and implement actual filtering logic.

### Exercise 3: Nested Request Bodies
Create an `POST /orders` endpoint that accepts:

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
    items: list[OrderItem]         # At least one item
    shipping_address: ShippingAddress
    notes: str | None = None
```

Validate that `items` has at least one element using `Field(min_length=1)`.

### Exercise 4: Response Model Filtering
Create user endpoints where:
- `POST /users` accepts `UserCreate` (with password)
- `GET /users/{id}` returns `UserResponse` (without password)
- `GET /users/{id}/admin` returns `UserAdminResponse` (with created_at, last_login, is_active)

Ensure the password never appears in any response.

### Exercise 5: Express to FastAPI Translation
Translate this Express router to FastAPI:

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
