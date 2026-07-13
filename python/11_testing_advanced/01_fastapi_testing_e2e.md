# FastAPI Testing: E2E with TestClient

> **Express/NestJS se aa raho ho?** FastAPI ka `TestClient` isse supertest se bhi zyada powerful hai - ek synchronous interface deta hai async endpoints ke liye, automatic dependency overrides, aur zero server startup time. Socho ek second: order place karte ho Zomato pe, seedha test kar skte ho without actual server chalaye!

---

## Table of Contents

1. [TestClient vs Supertest: Quick Comparison](#testclient-vs-supertest-quick-comparison)
2. [Setting Up FastAPI Testing](#setting-up-fastapi-testing)
3. [Basic E2E Testing Patterns](#basic-e2e-testing-patterns)
4. [Testing Request Validation](#testing-request-validation)
5. [Testing Response Models](#testing-response-models)
6. [Testing Authentication and Authorization](#testing-authentication-and-authorization)
7. [Testing File Uploads](#testing-file-uploads)
8. [Testing WebSockets](#testing-websockets)
9. [Testing Background Tasks](#testing-background-tasks)
10. [Dependency Injection in Tests](#dependency-injection-in-tests)
11. [Common Pitfalls and Best Practices](#common-pitfalls-and-best-practices)
12. [Practice Exercises](#practice-exercises)

---

## TestClient vs Supertest: Quick Comparison

Dekho, agar Express/NestJS use kiya hai toh Supertest ke saath kya karte the, aur FastAPI ke TestClient ke saath kya hota hai:

| Feature | Supertest (Express/NestJS) | TestClient (FastAPI) |
|---|---|---|
| Server startup | Requires app.listen() or createTestingModule() | Server hi nahi chalana padta |
| Async/await | Har test mein zaruri hota hai | Sync interface - async automatically handle |
| Dependency override | Manual mocking ka jhagda | Built-in `app.dependency_overrides` |
| Authentication testing | Header manually set karna padta | Dependencies se automatic |
| Request validation | Manual validators likho | Pydantic ka magic |
| Response checking | `.expect()` chains | Direct assertions |
| WebSocket testing | Additional libraries chahiye | Native support |
| Database cleanup | beforeEach/afterEach mein jhagda | Fixtures ka kaam |

**Samajh lo:** TestClient ek actual HTTP server nahi chalata. Seedha FastAPI app ko call karta hai, isliye tests ek dum fast aur predictable hote hain.

---

## Setting Up FastAPI Testing

### Project Structure

```
my_api/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app
│   ├── models.py            # Pydantic models
│   ├── database.py          # Database setup
│   └── dependencies.py      # Dependency injection
├── tests/
│   ├── __init__.py
│   ├── conftest.py          # Shared fixtures
│   ├── test_users.py        # User endpoint tests
│   └── test_auth.py         # Auth tests
├── pyproject.toml
└── pytest.ini
```

### Installation

```bash
# Core dependencies
pip install fastapi[standard] pytest pytest-asyncio httpx

# Additional test utilities
pip install pytest-cov faker
```

### Basic Setup (app/main.py)

```python
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel

app = FastAPI()

class Item(BaseModel):
    name: str
    price: float
    description: str | None = None

# In-memory storage (hum database baad mein add karenge)
items_db: dict[int, Item] = {}
item_counter = 0

@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.post("/items/", status_code=201)
async def create_item(item: Item):
    global item_counter
    item_counter += 1
    items_db[item_counter] = item
    return {"id": item_counter, **item.model_dump()}

@app.get("/items/{item_id}")
async def read_item(item_id: int):
    if item_id not in items_db:
        raise HTTPException(status_code=404, detail="Item not found")
    return items_db[item_id]
```

### Your First Test (tests/test_main.py)

```python
from fastapi.testclient import TestClient
from app.main import app

# Ek test client bana do - module ke liye ek baar hi banenge
client = TestClient(app)

def test_read_root():
    """Root endpoint par request karo"""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello World"}

def test_create_item():
    """Ek naya item create karo"""
    item_data = {
        "name": "Laptop",
        "price": 999.99,
        "description": "Gaming laptop"
    }
    response = client.post("/items/", json=item_data)
    
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Laptop"
    assert data["price"] == 999.99
    assert "id" in data

def test_read_item_success():
    """Existing item ko read karo"""
    # Pehle item create karo
    create_response = client.post("/items/", json={
        "name": "Mouse",
        "price": 29.99
    })
    item_id = create_response.json()["id"]
    
    # Phir usse read karo
    response = client.get(f"/items/{item_id}")
    assert response.status_code == 200
    assert response.json()["name"] == "Mouse"

def test_read_item_not_found():
    """Non-existent item par 404 aana chahiye"""
    response = client.get("/items/99999")
    assert response.status_code == 404
    assert response.json()["detail"] == "Item not found"
```

**Supertest (Express) ke saath kya farak hota:**

```typescript
// Express + Supertest
import request from 'supertest';
import app from './app';

test('GET /', async () => {
  const response = await request(app).get('/');
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ message: 'Hello World' });
});

test('POST /items', async () => {
  const response = await request(app)
    .post('/items')
    .send({ name: 'Laptop', price: 999.99 });
  expect(response.status).toBe(201);
});
```

Dekho: TestClient mein `await` nahi chahiye! Async endpoints ko automatically handle karta hai.

---

## Basic E2E Testing Patterns

### Example 1: Testing CRUD Operations

```python
# app/main.py - User CRUD endpoints
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, EmailStr
from typing import Dict

app = FastAPI()

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    full_name: str | None = None

class User(UserCreate):
    id: int
    is_active: bool = True

users_db: Dict[int, User] = {}
user_counter = 0

@app.post("/users/", response_model=User, status_code=status.HTTP_201_CREATED)
async def create_user(user: UserCreate):
    global user_counter
    user_counter += 1
    new_user = User(id=user_counter, **user.model_dump())
    users_db[user_counter] = new_user
    return new_user

@app.get("/users/{user_id}", response_model=User)
async def get_user(user_id: int):
    if user_id not in users_db:
        raise HTTPException(status_code=404, detail="User not found")
    return users_db[user_id]

@app.put("/users/{user_id}", response_model=User)
async def update_user(user_id: int, user: UserCreate):
    if user_id not in users_db:
        raise HTTPException(status_code=404, detail="User not found")
    users_db[user_id] = User(id=user_id, **user.model_dump())
    return users_db[user_id]

@app.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: int):
    if user_id not in users_db:
        raise HTTPException(status_code=404, detail="User not found")
    del users_db[user_id]
    return None

@app.get("/users/", response_model=list[User])
async def list_users(skip: int = 0, limit: int = 10):
    return list(users_db.values())[skip:skip+limit]
```

```python
# tests/test_users_crud.py
import pytest
from fastapi.testclient import TestClient
from app.main import app, users_db, user_counter

client = TestClient(app)

@pytest.fixture(autouse=True)
def reset_database():
    """Har test se pehle database clear karo - Swiggy ke restaurant list ki tarah"""
    global user_counter
    users_db.clear()
    user_counter = 0
    yield
    users_db.clear()

def test_create_user_success():
    """Valid data ke saath user create karo"""
    user_data = {
        "username": "john_doe",
        "email": "john@example.com",
        "full_name": "John Doe"
    }
    response = client.post("/users/", json=user_data)
    
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "john_doe"
    assert data["email"] == "john@example.com"
    assert data["id"] == 1
    assert data["is_active"] is True

def test_create_user_invalid_email():
    """Invalid email ke saath user create maat karo"""
    user_data = {
        "username": "john_doe",
        "email": "not-an-email",  # Yeh invalid hai
        "full_name": "John Doe"
    }
    response = client.post("/users/", json=user_data)
    
    assert response.status_code == 422  # Validation error
    assert "email" in response.json()["detail"][0]["loc"]

def test_get_user_success():
    """Existing user ko ID se retrieve karo"""
    # Pehle user create karo
    create_response = client.post("/users/", json={
        "username": "jane_doe",
        "email": "jane@example.com"
    })
    user_id = create_response.json()["id"]
    
    # Get the user
    response = client.get(f"/users/{user_id}")
    assert response.status_code == 200
    assert response.json()["username"] == "jane_doe"

def test_get_user_not_found():
    """Non-existent user par 404 aana chahiye"""
    response = client.get("/users/999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()

def test_update_user_success():
    """User ka data update karo - profile change karte hain Swiggy pe"""
    # Pehle user banao
    create_response = client.post("/users/", json={
        "username": "old_name",
        "email": "old@example.com"
    })
    user_id = create_response.json()["id"]
    
    # User ko update karo
    update_data = {
        "username": "new_name",
        "email": "new@example.com",
        "full_name": "New Full Name"
    }
    response = client.put(f"/users/{user_id}", json=update_data)
    
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "new_name"
    assert data["email"] == "new@example.com"
    assert data["full_name"] == "New Full Name"

def test_delete_user_success():
    """User ko delete karo"""
    # Pehle user banao
    create_response = client.post("/users/", json={
        "username": "to_delete",
        "email": "delete@example.com"
    })
    user_id = create_response.json()["id"]
    
    # User ko delete karo
    response = client.delete(f"/users/{user_id}")
    assert response.status_code == 204
    assert response.content == b""
    
    # Verify user delete ho gaya
    get_response = client.get(f"/users/{user_id}")
    assert get_response.status_code == 404

def test_list_users():
    """Users ko pagination ke saath list karo"""
    # Multiple users banao
    for i in range(5):
        client.post("/users/", json={
            "username": f"user_{i}",
            "email": f"user{i}@example.com"
        })
    
    # Sabhi users get karo
    response = client.get("/users/")
    assert response.status_code == 200
    users = response.json()
    assert len(users) == 5
    
    # Pagination test
    response = client.get("/users/?skip=2&limit=2")
    users = response.json()
    assert len(users) == 2
    assert users[0]["username"] == "user_2"
```

---

## Testing Request Validation

### Example 2: Testing Pydantic Validation

```python
# app/models.py
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Literal

class ProductCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=100)
    price: float = Field(..., gt=0, le=1_000_000)
    category: Literal["electronics", "clothing", "food", "other"]
    tags: list[str] = Field(default_factory=list, max_length=10)
    stock: int = Field(..., ge=0)
    
    @field_validator('name')
    @classmethod
    def name_must_not_contain_special_chars(cls, v: str) -> str:
        if not v.replace(' ', '').replace('-', '').isalnum():
            raise ValueError('name mein sirf letters, numbers, spaces aur hyphens chalte hain')
        return v
    
    @field_validator('tags')
    @classmethod
    def tags_must_be_lowercase(cls, v: list[str]) -> list[str]:
        return [tag.lower() for tag in v]

class Product(ProductCreate):
    id: int
    created_at: datetime
    updated_at: datetime
```

```python
# tests/test_validation.py
from fastapi.testclient import TestClient
import pytest

client = TestClient(app)

class TestProductValidation:
    """Product validation ka poora test suite"""
    
    def test_valid_product_creation(self):
        """Valid data ke saath product banao"""
        product_data = {
            "name": "iPhone 15 Pro",
            "price": 999.99,
            "category": "electronics",
            "tags": ["smartphone", "apple", "5G"],
            "stock": 50
        }
        response = client.post("/products/", json=product_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "iPhone 15 Pro"
        assert data["price"] == 999.99
        # Tags automatically lowercase ho jayenge
        assert data["tags"] == ["smartphone", "apple", "5g"]
    
    def test_name_too_short(self):
        """3 characters se kam name maat karo"""
        product_data = {
            "name": "AB",  # Bahut chhota
            "price": 10.0,
            "category": "other",
            "stock": 10
        }
        response = client.post("/products/", json=product_data)
        
        assert response.status_code == 422
        errors = response.json()["detail"]
        assert any("name" in str(error["loc"]) for error in errors)
    
    def test_price_validation(self):
        """Price zero se zyada hona chahiye, aur limit se zyada nahi"""
        # Negative price test
        response = client.post("/products/", json={
            "name": "Test Product",
            "price": -10.0,  # Invalid
            "category": "other",
            "stock": 10
        })
        assert response.status_code == 422
        
        # Zero price test
        response = client.post("/products/", json={
            "name": "Test Product",
            "price": 0.0,  # Invalid
            "category": "other",
            "stock": 10
        })
        assert response.status_code == 422
        
        # Price too high test
        response = client.post("/products/", json={
            "name": "Test Product",
            "price": 2_000_000,  # Bahut zyada
            "category": "other",
            "stock": 10
        })
        assert response.status_code == 422
    
    def test_invalid_category(self):
        """Category allowed values se bahar ho toh reject karo"""
        product_data = {
            "name": "Test Product",
            "price": 10.0,
            "category": "invalid_category",  # Yeh nahi chalega
            "stock": 10
        }
        response = client.post("/products/", json=product_data)
        
        assert response.status_code == 422
        errors = response.json()["detail"]
        assert any("category" in str(error["loc"]) for error in errors)
    
    def test_name_special_characters(self):
        """Special characters naam mein nahi ho sakte"""
        product_data = {
            "name": "Test@Product!",  # Invalid characters
            "price": 10.0,
            "category": "other",
            "stock": 10
        }
        response = client.post("/products/", json=product_data)
        
        assert response.status_code == 422
        errors = response.json()["detail"]
        error_msg = str(errors)
        assert "letters, numbers, spaces, and hyphens" in error_msg.lower()
    
    def test_tags_normalization(self):
        """Tags automatically lowercase ho jayenge"""
        product_data = {
            "name": "Test Product",
            "price": 10.0,
            "category": "other",
            "tags": ["UPPERCASE", "MixedCase", "lowercase"],
            "stock": 10
        }
        response = client.post("/products/", json=product_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["tags"] == ["uppercase", "mixedcase", "lowercase"]
    
    def test_negative_stock(self):
        """Negative stock nahi ho sakti"""
        product_data = {
            "name": "Test Product",
            "price": 10.0,
            "category": "other",
            "stock": -5  # Invalid
        }
        response = client.post("/products/", json=product_data)
        
        assert response.status_code == 422

    @pytest.mark.parametrize("field,value,should_fail", [
        ("name", "ab", True),  # Too short
        ("name", "Valid Product Name", False),
        ("name", "a" * 150, True),  # Too long
        ("price", 0.01, False),
        ("price", -1, True),
        ("stock", 0, False),
        ("stock", -1, True),
    ])
    def test_field_validation(self, field, value, should_fail):
        """Different fields ka validation test karo - parametrized way"""
        product_data = {
            "name": "Default Product",
            "price": 10.0,
            "category": "other",
            "stock": 10
        }
        product_data[field] = value
        
        response = client.post("/products/", json=product_data)
        
        if should_fail:
            assert response.status_code == 422
        else:
            assert response.status_code == 201
```

---

## Testing Response Models

### Example 3: Testing Response Serialization

Dekho, database mein toh ek field hota hai (password hash), lekin API response mein nahi dena chahiye. Yeh security ka matter hai, jaise Swiggy tumhare credit card number show nahi karta profile pe.

```python
# app/main.py
from fastapi import FastAPI
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

app = FastAPI()

class UserInDB(BaseModel):
    id: int
    username: str
    email: str
    password_hash: str  # Yeh response mein nahi aana chahiye
    created_at: datetime
    is_active: bool

class UserResponse(BaseModel):
    """Public response - password nahi"""
    id: int
    username: str
    email: str
    created_at: datetime
    is_active: bool

# Simulated database
users = {
    1: UserInDB(
        id=1,
        username="john",
        email="john@example.com",
        password_hash="$2b$12$...",  # Hashed password
        created_at=datetime(2024, 1, 1, 12, 0, 0),
        is_active=True
    )
}

@app.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: int):
    """Public endpoint - password nahi deta"""
    return users[user_id]

@app.get("/users/{user_id}/admin", response_model=UserInDB)
async def get_user_admin(user_id: int):
    """Admin endpoint - sab kuch deta hai"""
    return users[user_id]
```

```python
# tests/test_response_models.py
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_user_response_excludes_password():
    """Public endpoint password return nahi karta"""
    response = client.get("/users/1")
    
    assert response.status_code == 200
    data = response.json()
    
    # Yeh sab hona chahiye
    assert "id" in data
    assert "username" in data
    assert "email" in data
    assert "created_at" in data
    assert "is_active" in data
    
    # Password nahi hona chahiye
    assert "password_hash" not in data
    assert "password" not in data
    
    # Actual values verify karo
    assert data["username"] == "john"
    assert data["email"] == "john@example.com"

def test_admin_endpoint_includes_password():
    """Admin endpoint password hash return karta hai"""
    response = client.get("/users/1/admin")
    
    assert response.status_code == 200
    data = response.json()
    
    # Admin ke liye password hash hona chahiye
    assert "password_hash" in data
    assert data["password_hash"].startswith("$2b$12$")

def test_datetime_serialization():
    """Datetimes ko ISO format mein serialize ho jana chahiye"""
    response = client.get("/users/1")
    
    assert response.status_code == 200
    data = response.json()
    
    # created_at ISO format string hona chahiye
    assert "created_at" in data
    created_at = data["created_at"]
    
    # String hona chahiye
    assert isinstance(created_at, str)
    assert "2024-01-01" in created_at
    
    # Wapas datetime mein convert ho sakta hona chahiye
    from datetime import datetime
    parsed = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
    assert parsed.year == 2024
```

---

## Testing Authentication and Authorization

Dekho, authentication test karna asal mein straightforward hota hai TestClient ke saath. Token test karte ho, dependency ko override karte ho - aur bas!

### Example 4: Testing JWT Authentication

```python
# app/auth.py
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel

SECRET_KEY = "your-secret-key-keep-it-secret"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

class Token(BaseModel):
    access_token: str
    token_type: str

class User(BaseModel):
    username: str
    email: Optional[str] = None
    disabled: Optional[bool] = None

# Fake users database
fake_users_db = {
    "john": {
        "username": "john",
        "email": "john@example.com",
        "hashed_password": pwd_context.hash("secret123"),
        "disabled": False,
    }
}

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_user(username: str):
    if username in fake_users_db:
        user_dict = fake_users_db[username]
        return User(**user_dict)

def authenticate_user(username: str, password: str):
    user = get_user(username)
    if not user:
        return False
    user_dict = fake_users_db[username]
    if not verify_password(password, user_dict["hashed_password"]):
        return False
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = get_user(username)
    if user is None:
        raise credentials_exception
    return user

# app/main.py
from fastapi import FastAPI, Depends
from app.auth import (
    Token, User, authenticate_user, create_access_token,
    get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES
)
from fastapi.security import OAuth2PasswordRequestForm

app = FastAPI()

@app.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@app.get("/protected")
async def protected_route(current_user: User = Depends(get_current_user)):
    return {"message": f"Hello {current_user.username}, this is protected!"}
```

```python
# tests/test_auth.py
from fastapi.testclient import TestClient
from app.main import app
from app.auth import create_access_token

client = TestClient(app)

class TestAuthentication:
    """Authentication ka poora test suite"""
    
    def test_login_success(self):
        """Successful login se token milna chahiye"""
        response = client.post(
            "/token",
            data={
                "username": "john",
                "password": "secret123"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert len(data["access_token"]) > 50  # JWT tokens bade hote hain

    def test_login_wrong_password(self):
        """Wrong password ke saath login fail hona chahiye"""
        response = client.post(
            "/token",
            data={
                "username": "john",
                "password": "wrongpassword"
            }
        )
        
        assert response.status_code == 401
        assert "Incorrect username or password" in response.json()["detail"]
    
    def test_login_nonexistent_user(self):
        """Joh user exist nahi karta, login fail hona chahiye"""
        response = client.post(
            "/token",
            data={
                "username": "nonexistent",
                "password": "anypassword"
            }
        )
        
        assert response.status_code == 401
    
    def test_protected_route_without_token(self):
        """Token ke bina protected route access nahi ho sakta"""
        response = client.get("/protected")
        
        assert response.status_code == 401
        assert "Not authenticated" in response.json()["detail"]
    
    def test_protected_route_with_valid_token(self):
        """Valid token ke saath protected route access ho sakta hai"""
        # Pehle login karo token lene ke liye
        login_response = client.post(
            "/token",
            data={"username": "john", "password": "secret123"}
        )
        token = login_response.json()["access_token"]
        
        # Protected route access karo
        response = client.get(
            "/protected",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        assert "Hello john" in response.json()["message"]
    
    def test_protected_route_with_invalid_token(self):
        """Invalid token ke saath access fail ho na chahiye"""
        response = client.get(
            "/protected",
            headers={"Authorization": "Bearer invalid_token_here"}
        )
        
        assert response.status_code == 401
        assert "Could not validate credentials" in response.json()["detail"]
    
    def test_get_current_user(self):
        """/users/me endpoint test karo"""
        # Login karo
        login_response = client.post(
            "/token",
            data={"username": "john", "password": "secret123"}
        )
        token = login_response.json()["access_token"]
        
        # Current user get karo
        response = client.get(
            "/users/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        user = response.json()
        assert user["username"] == "john"
        assert user["email"] == "john@example.com"
        assert "hashed_password" not in user  # Password nahi hona chahiye
    
    def test_expired_token(self):
        """Expired tokens reject ho na chahiye"""
        from datetime import timedelta
        
        # Ek token banao jo ek hour pehle expire ho gaya
        expired_token = create_access_token(
            data={"sub": "john"},
            expires_delta=timedelta(hours=-1)
        )
        
        response = client.get(
            "/protected",
            headers={"Authorization": f"Bearer {expired_token}"}
        )
        
        assert response.status_code == 401
```

---

## Testing File Uploads

File upload test karna sirf ek file banakar test client ko dena hota hai. Swiggy mein menu image upload karte ho - same concept hai, bas automated way mein.

### Example 5: Testing File Upload Endpoints

```python
# app/main.py
from fastapi import FastAPI, File, UploadFile, HTTPException
from typing import List
import shutil
from pathlib import Path

app = FastAPI()

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf", ".txt"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

@app.post("/upload/")
async def upload_file(file: UploadFile = File(...)):
    """Single file upload"""
    # File extension validate karo
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type allowed nahi hai. Allowed: {ALLOWED_EXTENSIONS}"
        )
    
    # File padho aur size check karo
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File bahut bada hai. Max: {MAX_FILE_SIZE} bytes"
        )
    
    # File save karo
    file_path = UPLOAD_DIR / file.filename
    with open(file_path, "wb") as f:
        f.write(contents)
    
    return {
        "filename": file.filename,
        "size": len(contents),
        "content_type": file.content_type
    }

@app.post("/upload-multiple/")
async def upload_multiple_files(files: List[UploadFile] = File(...)):
    """Multiple files upload"""
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Bahut sare files. Max 10 only")
    
    uploaded_files = []
    for file in files:
        contents = await file.read()
        file_path = UPLOAD_DIR / file.filename
        with open(file_path, "wb") as f:
            f.write(contents)
        
        uploaded_files.append({
            "filename": file.filename,
            "size": len(contents)
        })
    
    return {"files": uploaded_files, "count": len(uploaded_files)}
```

```python
# tests/test_file_upload.py
import pytest
from fastapi.testclient import TestClient
from pathlib import Path
import io

from app.main import app, UPLOAD_DIR

client = TestClient(app)

@pytest.fixture(autouse=True)
def cleanup_uploads():
    """Test ke baad upload dir ko clean karo"""
    yield
    # Upload directory ke sab files remove karo
    for file in UPLOAD_DIR.glob("*"):
        if file.is_file():
            file.unlink()

def test_upload_valid_file():
    """Valid file upload karo"""
    # Ek fake file banao
    file_content = b"Hello, this is a test file!"
    files = {"file": ("test.txt", file_content, "text/plain")}
    
    response = client.post("/upload/", files=files)
    
    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "test.txt"
    assert data["size"] == len(file_content)
    assert data["content_type"] == "text/plain"
    
    # Verify file actually saved hua
    uploaded_file = UPLOAD_DIR / "test.txt"
    assert uploaded_file.exists()
    assert uploaded_file.read_bytes() == file_content

def test_upload_image_file():
    """Image file upload karo"""
    # Minimal valid PNG file (1x1 transparent pixel)
    png_data = (
        b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01'
        b'\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89'
        b'\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01'
        b'\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
    )
    
    files = {"file": ("image.png", png_data, "image/png")}
    response = client.post("/upload/", files=files)
    
    assert response.status_code == 200
    assert response.json()["filename"] == "image.png"

def test_upload_disallowed_extension():
    """Disallowed file type upload maat karo"""
    files = {"file": ("script.exe", b"fake exe", "application/x-msdownload")}
    
    response = client.post("/upload/", files=files)
    
    assert response.status_code == 400
    assert "not allowed" in response.json()["detail"].lower()

def test_upload_file_too_large():
    """Size limit se bada file upload maat karo"""
    # 6MB file banao (limit 5MB hai)
    large_content = b"x" * (6 * 1024 * 1024)
    files = {"file": ("large.txt", large_content, "text/plain")}
    
    response = client.post("/upload/", files=files)
    
    assert response.status_code == 400
    assert "too large" in response.json()["detail"].lower()

def test_upload_multiple_files():
    """Multiple files ek saath upload karo"""
    files = [
        ("files", ("file1.txt", b"Content 1", "text/plain")),
        ("files", ("file2.txt", b"Content 2", "text/plain")),
        ("files", ("file3.pdf", b"PDF content", "application/pdf")),
    ]
    
    response = client.post("/upload-multiple/", files=files)
    
    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 3
    assert len(data["files"]) == 3
    
    # Verify sab files save hue
    assert (UPLOAD_DIR / "file1.txt").exists()
    assert (UPLOAD_DIR / "file2.txt").exists()
    assert (UPLOAD_DIR / "file3.pdf").exists()

def test_upload_too_many_files():
    """11 files try karo jab max 10 hai"""
    files = [
        ("files", (f"file{i}.txt", b"content", "text/plain"))
        for i in range(11)
    ]
    
    response = client.post("/upload-multiple/", files=files)
    
    assert response.status_code == 400
    assert "too many" in response.json()["detail"].lower()

def test_upload_empty_file():
    """Empty file upload karo"""
    files = {"file": ("empty.txt", b"", "text/plain")}
    
    response = client.post("/upload/", files=files)
    
    # Empty files allowed hone chahiye
    assert response.status_code == 200
    assert response.json()["size"] == 0
```

---

## Testing WebSockets

WebSocket testing bhi TestClient ke saath easy hota hai. Context manager use karte ho aur message send-receive karte ho. Real-time notifications ka concept - jaise Swiggy delivery status aapko real-time update karta hai.

### Example 6: Testing WebSocket Connections

```python
# app/main.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import List

app = FastAPI()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: int):
    await manager.connect(websocket)
    try:
        # Welcome message bhejo
        await websocket.send_json({
            "type": "connection",
            "message": f"Client {client_id} connected"
        })
        
        while True:
            # Client se message receive karo
            data = await websocket.receive_text()
            
            # Client ko wapas echo karo
            await websocket.send_json({
                "type": "echo",
                "client_id": client_id,
                "message": data
            })
            
            # Sabhi clients ko broadcast karo
            await manager.broadcast(f"Client {client_id} says: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        await manager.broadcast(f"Client {client_id} disconnected")
```

```python
# tests/test_websockets.py
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_websocket_connection():
    """Basic WebSocket connection test"""
    with client.websocket_connect("/ws/123") as websocket:
        # Welcome message milna chahiye
        data = websocket.receive_json()
        assert data["type"] == "connection"
        assert "123" in data["message"]

def test_websocket_echo():
    """WebSocket echo functionality"""
    with client.websocket_connect("/ws/456") as websocket:
        # Welcome message skip karo
        websocket.receive_json()
        
        # Ek message bhejo
        websocket.send_text("Hello, WebSocket!")
        
        # Echo wapas milna chahiye
        response = websocket.receive_json()
        assert response["type"] == "echo"
        assert response["client_id"] == 456
        assert response["message"] == "Hello, WebSocket!"

def test_websocket_broadcast():
    """Multiple clients ko broadcast karo"""
    with client.websocket_connect("/ws/1") as ws1, \
         client.websocket_connect("/ws/2") as ws2:
        
        # Welcome messages skip karo
        ws1.receive_json()
        ws2.receive_json()
        
        # Client 1 se message bhejo
        ws1.send_text("Hello from client 1")
        
        # Donon clients ko broadcast milna chahiye
        # Client 1 ko pehle echo
        echo = ws1.receive_json()
        assert echo["type"] == "echo"
        
        # Phir broadcast
        broadcast1 = ws1.receive_text()
        assert "Client 1 says: Hello from client 1" in broadcast1
        
        # Client 2 ko broadcast
        broadcast2 = ws2.receive_text()
        assert "Client 1 says: Hello from client 1" in broadcast2

def test_websocket_disconnect():
    """Disconnection properly handle ho na chahiye"""
    with client.websocket_connect("/ws/999") as websocket:
        websocket.receive_json()  # Welcome message
        websocket.send_text("Test message")
        websocket.receive_json()  # Echo
    
    # Context exit karte hi connection close ho jayega
```

---

## Testing Background Tasks

Background tasks automatically wait hote hain TestClient ke saath. Jaise Swiggy invoice email background mein bhejta hai - tum order confirm dekho, but email later process hote hain.

### Example 7: Testing Background Tasks

```python
# app/main.py
from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel, EmailStr
import time
from typing import List

app = FastAPI()

# Simulated email sending
email_log: List[dict] = []

def send_email(email: str, message: str):
    """Email send karne simulate karo"""
    time.sleep(0.1)  # Network delay simulate
    email_log.append({
        "email": email,
        "message": message,
        "sent_at": time.time()
    })

class NotificationRequest(BaseModel):
    email: EmailStr
    message: str

@app.post("/send-notification/")
async def send_notification(
    notification: NotificationRequest,
    background_tasks: BackgroundTasks
):
    """Background mein notification bhejo"""
    background_tasks.add_task(
        send_email,
        notification.email,
        notification.message
    )
    return {"message": "Notification background mein jayega"}

@app.post("/send-multiple-notifications/")
async def send_multiple_notifications(
    notifications: List[NotificationRequest],
    background_tasks: BackgroundTasks
):
    """Multiple notifications background mein bhejo"""
    for notification in notifications:
        background_tasks.add_task(
            send_email,
            notification.email,
            notification.message
        )
    return {"message": f"{len(notifications)} notifications background mein jayengi"}

@app.get("/email-log/")
async def get_email_log():
    """Email log get karo (testing ke liye)"""
    return {"emails": email_log, "count": len(email_log)}
```

```python
# tests/test_background_tasks.py
import pytest
from fastapi.testclient import TestClient
import time
from app.main import app, email_log

client = TestClient(app)

@pytest.fixture(autouse=True)
def clear_email_log():
    """Har test se pehle log clear karo"""
    email_log.clear()
    yield
    email_log.clear()

def test_background_task_executes():
    """Background task actually execute ho na chahiye"""
    response = client.post("/send-notification/", json={
        "email": "test@example.com",
        "message": "Test notification"
    })
    
    assert response.status_code == 200
    assert "background" in response.json()["message"].lower()
    
    # TestClient automatically waits karta hai background tasks ke liye
    # Check karo ke email "send" hua
    log_response = client.get("/email-log/")
    emails = log_response.json()["emails"]
    
    assert len(emails) == 1
    assert emails[0]["email"] == "test@example.com"
    assert emails[0]["message"] == "Test notification"

def test_multiple_background_tasks():
    """Multiple notifications send karo"""
    response = client.post("/send-multiple-notifications/", json=[
        {"email": "user1@example.com", "message": "Message 1"},
        {"email": "user2@example.com", "message": "Message 2"},
        {"email": "user3@example.com", "message": "Message 3"},
    ])
    
    assert response.status_code == 200
    
    # Verify sab emails send hue
    log_response = client.get("/email-log/")
    emails = log_response.json()["emails"]
    
    assert len(emails) == 3
    email_addresses = [email["email"] for email in emails]
    assert "user1@example.com" in email_addresses
    assert "user2@example.com" in email_addresses
    assert "user3@example.com" in email_addresses

def test_background_task_with_invalid_email():
    """Validation pehle se ho, background task baad mein"""
    response = client.post("/send-notification/", json={
        "email": "not-an-email",  # Invalid
        "message": "Test"
    })
    
    # Validation fail hogi pehle se, background task run nahi hoga
    assert response.status_code == 422
    
    # Email log empty hona chahiye
    log_response = client.get("/email-log/")
    assert log_response.json()["count"] == 0
```

> [!warning]
> TestClient automatically waits karta hai background tasks ke liye! Real production mein background tasks immediate return hote hain, lekin tests mein synchronously wait karte hain.

---

## Dependency Injection in Tests

Yeh sabse powerful feature hai! Database, auth system, external APIs - sab mock kar sakte ho without touching actual code. Jaise Swiggy mein staging environment hota hai testing ke liye.

### Example 8: Overriding Dependencies

```python
# app/dependencies.py
from fastapi import Header, HTTPException

async def get_api_key(x_api_key: str = Header(...)):
    """API key validate karo"""
    if x_api_key != "secret-api-key":
        raise HTTPException(status_code=403, detail="Invalid API key")
    return x_api_key

async def get_current_user_id(x_user_id: str = Header(...)):
    """Header se user ID get karo"""
    try:
        return int(x_user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID")

# app/main.py
from fastapi import FastAPI, Depends
from app.dependencies import get_api_key, get_current_user_id

app = FastAPI()

@app.get("/protected/")
async def protected_endpoint(api_key: str = Depends(get_api_key)):
    return {"message": "Access granted", "api_key": api_key}

@app.get("/user/profile/")
async def get_user_profile(user_id: int = Depends(get_current_user_id)):
    return {"user_id": user_id, "name": f"User {user_id}"}
```

```python
# tests/test_dependencies.py
from fastapi.testclient import TestClient
from app.main import app
from app.dependencies import get_api_key, get_current_user_id

client = TestClient(app)

def test_protected_endpoint_with_valid_key():
    """Valid API key ke saath access"""
    response = client.get(
        "/protected/",
        headers={"X-API-Key": "secret-api-key"}
    )
    assert response.status_code == 200

def test_protected_endpoint_without_key():
    """API key ke bina access"""
    response = client.get("/protected/")
    assert response.status_code == 422  # Missing required header

def test_protected_endpoint_with_invalid_key():
    """Invalid API key ke saath access"""
    response = client.get(
        "/protected/",
        headers={"X-API-Key": "wrong-key"}
    )
    assert response.status_code == 403

# ========== DEPENDENCY OVERRIDE PATTERN ==========

def test_with_dependency_override():
    """Dependency override karte hue test karo"""
    
    # Mock dependency jo fake API key return kare
    async def mock_get_api_key():
        return "mocked-key"
    
    # Dependency ko override karo
    app.dependency_overrides[get_api_key] = mock_get_api_key
    
    try:
        # Ab real API key diye bina access ho jayega
        response = client.get("/protected/")
        assert response.status_code == 200
        assert response.json()["api_key"] == "mocked-key"
    finally:
        # Hamesha cleanup karo!
        app.dependency_overrides.clear()

def test_user_profile_with_override():
    """User ID dependency override karo"""
    
    # Mock dependency jo user 42 return kare
    async def mock_get_user_id():
        return 42
    
    app.dependency_overrides[get_current_user_id] = mock_get_user_id
    
    try:
        # X-User-ID header diye bina access
        response = client.get("/user/profile/")
        assert response.status_code == 200
        assert response.json()["user_id"] == 42
    finally:
        app.dependency_overrides.clear()

# Better: pytest fixture use karo

import pytest

@pytest.fixture
def override_auth():
    """Fixture jo authentication override kar de"""
    async def mock_api_key():
        return "test-key"
    
    app.dependency_overrides[get_api_key] = mock_api_key
    yield
    app.dependency_overrides.clear()

def test_with_auth_fixture(override_auth):
    """Auth automatically override hoga"""
    response = client.get("/protected/")
    assert response.status_code == 200

@pytest.fixture
def mock_user(request):
    """User ID mock karo (parametrizable)"""
    user_id = getattr(request, 'param', 1)  # Default: user 1
    
    async def mock_get_user_id():
        return user_id
    
    app.dependency_overrides[get_current_user_id] = mock_get_user_id
    yield user_id
    app.dependency_overrides.clear()

@pytest.mark.parametrize('mock_user', [1, 42, 999], indirect=True)
def test_different_users(mock_user):
    """Different user IDs ke saath test"""
    response = client.get("/user/profile/")
    assert response.status_code == 200
    assert response.json()["user_id"] == mock_user
```

> [!tip]
> Dependency overrides ka use karte hue, tum database, auth, external APIs - sab mock kar sakte ho! Application code touch kiye bina! Yeh FastAPI testing ki sabse powerful cheeez hai.

---

## Common Pitfalls and Best Practices

### ❌ Pitfall 1: Shared State Between Tests

```python
# GHALAT: Global state tests ke beech leak ho raha hai
from fastapi import FastAPI
from fastapi.testclient import TestClient

app = FastAPI()
items = []  # Shared state - yeh problem hai!

@app.post("/items/")
async def add_item(item: str):
    items.append(item)
    return {"count": len(items)}

client = TestClient(app)

def test_first():
    response = client.post("/items/", json="item1")
    assert response.json()["count"] == 1

def test_second():
    response = client.post("/items/", json="item2")
    # Yeh fail ho sakta hai! Count 2 ho sakta hai agar test_first pehle chala
    assert response.json()["count"] == 1  # ❌ FLAKY TEST

# SAHI: State ko har test se pehle reset karo
@pytest.fixture(autouse=True)
def reset_state():
    items.clear()
    yield
    items.clear()
```

### ✅ Best Practice: Use Fixtures for Test Data

```python
import pytest
from faker import Faker

fake = Faker()

@pytest.fixture
def sample_user():
    return {
        "username": fake.user_name(),
        "email": fake.email(),
        "full_name": fake.name()
    }

@pytest.fixture
def sample_users():
    return [
        {"username": fake.user_name(), "email": fake.email()}
        for _ in range(5)
    ]

def test_create_user(sample_user):
    response = client.post("/users/", json=sample_user)
    assert response.status_code == 201
    assert response.json()["username"] == sample_user["username"]
```

### ✅ Best Practice: Test Status Codes AND Response Bodies

```python
# GHALAT: Sirf status code check karna
def test_get_user():
    response = client.get("/users/1")
    assert response.status_code == 200  # ❌ Enough nahi!

# SAHI: Data bhi verify karo
def test_get_user():
    response = client.get("/users/1")
    assert response.status_code == 200
    
    data = response.json()
    assert "id" in data
    assert "username" in data
    assert data["id"] == 1
    assert isinstance(data["username"], str)
```

### ✅ Best Practice: Use `pytest.mark.parametrize` for Similar Tests

```python
@pytest.mark.parametrize("endpoint,expected_status", [
    ("/", 200),
    ("/users/", 200),
    ("/items/", 200),
    ("/nonexistent", 404),
])
def test_endpoints(endpoint, expected_status):
    response = client.get(endpoint)
    assert response.status_code == expected_status
```

### ✅ Best Practice: Test Error Cases

```python
class TestErrorHandling:
    """Unhappy path ko bhi test karo!"""
    
    def test_create_user_missing_required_field(self):
        """Required fields missing ho toh reject karo"""
        response = client.post("/users/", json={"username": "john"})
        # Email missing hai
        assert response.status_code == 422
    
    def test_create_user_invalid_email_format(self):
        """Invalid email format reject ho"""
        response = client.post("/users/", json={
            "username": "john",
            "email": "not-an-email"
        })
        assert response.status_code == 422
    
    def test_get_nonexistent_user(self):
        """Missing resources ke liye 404 aana chahiye"""
        response = client.get("/users/99999")
        assert response.status_code == 404
    
    def test_delete_already_deleted_user(self):
        """User ko do baar delete karne ki koshish"""
        # User create aur delete karo
        create_resp = client.post("/users/", json={
            "username": "john",
            "email": "john@example.com"
        })
        user_id = create_resp.json()["id"]
        client.delete(f"/users/{user_id}")
        
        # Dobaara delete karne ki koshish
        response = client.delete(f"/users/{user_id}")
        assert response.status_code == 404
```

---

## Practice Exercises

### Exercise 1: E2E Blog API Testing

Ek simple blog API banaao posts aur comments ke saath, phir comprehensive E2E tests likho:

```python
# TODO: Yeh endpoints implement karo
# POST /posts/ - Ek post create karo
# GET /posts/{post_id} - Ek post get karo
# GET /posts/ - Posts list karo (pagination ke saath)
# POST /posts/{post_id}/comments/ - Comment add karo
# GET /posts/{post_id}/comments/ - Comments get karo

# TODO: Yeh tests likho:
# - Valid/invalid data ke saath posts create karo
# - Pagination test karo
# - Comments posts mein add karo
# - Comments posts se get karo
# - Error handling (post not found, etc.)
```

### Exercise 2: File Upload with Validation

Ek endpoint banao jo images upload kare with validation:

```python
# TODO: Endpoint banao jo:
# - Sirf images accept kare (jpg, png, gif)
# - Image dimensions validate kare (max 2000x2000)
# - File size validate kare (max 2MB)
# - Image metadata return kare

# TODO: Yeh tests likho:
# - Valid image upload
# - Invalid file type
# - Image bahut bada ho (dimensions)
# - File bahut bada ho (size)
# - Empty file
```

### Exercise 3: Rate Limiting

Rate limiting implement aur test karo:

```python
# TODO: Rate limiting implement karo (e.g., 5 requests per minute per user)
# TODO: Tests likho jo:
# - Multiple requests karo aur rate limit verify karo
# - Time period baad rate limit reset hota hai check karo
# - Different users ke separate rate limits hain check karo
```

### Exercise 4: Database Integration Testing

Test database setup karo:

```python
# TODO: Test database fixture create karo
# TODO: User CRUD implement karo real database ke saath
# TODO: Tests likho jo verify kare:
# - Data persistence
# - Transactions
# - Constraints (unique email, etc.)
# - Cascading deletes
```

---

## Key Takeaways

✅ TestClient se FastAPI testing incredibly simple hota hai  
✅ Dependency overrides se external services mock kar sakte ho  
✅ Background tasks automatically wait hote hain tests mein  
✅ WebSockets, file uploads, auth - sab seedha test kar sakte ho  
✅ Har test se pehle state reset karo - flaky tests se bachne ke liye  
✅ Happy aur unhappy paths dono test karo

**Agle topics:**
- External APIs ko mock karna
- Database testing strategies
- Async code testing
- Coverage aur reporting

**Big Picture:** TestClient se E2E testing ek dum straightforward hota hai. Dependency overrides use karo, fixtures properly likho, aur both happy aur unhappy paths test karo. Bas itna hi sufficient hai zyada bada testing setup ke bina!
