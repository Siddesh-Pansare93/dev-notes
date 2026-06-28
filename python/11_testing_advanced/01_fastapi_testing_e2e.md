# FastAPI Testing: E2E with TestClient

> **Coming from Express/NestJS?** FastAPI's `TestClient` is like supertest on steroids - it provides a synchronous interface for testing async endpoints, automatic dependency overrides, and zero server startup time. You'll love how simple E2E testing becomes.

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

| Feature | Supertest (Express/NestJS) | TestClient (FastAPI) |
|---|---|---|
| Server startup | Requires app.listen() or createTestingModule() | No server needed |
| Async/await | Required for all tests | Optional (sync interface to async app) |
| Dependency override | Manual mocking | Built-in `app.dependency_overrides` |
| Authentication testing | Manual header setup | Automatic via dependencies |
| Request validation | Manual (need validators) | Automatic via Pydantic |
| Response checking | `.expect()` chains | Standard assertions |
| WebSocket testing | Additional libraries needed | Built-in support |
| Database cleanup | Manual in beforeEach/afterEach | Fixtures handle it |

**Key insight:** TestClient doesn't start an actual HTTP server. It calls your FastAPI app directly, making tests instant and deterministic.

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

# In-memory storage (we'll replace with database later)
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

# Create test client - this happens once per module
client = TestClient(app)

def test_read_root():
    """Test the root endpoint returns hello world"""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello World"}

def test_create_item():
    """Test creating a new item"""
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
    """Test reading an existing item"""
    # First create an item
    create_response = client.post("/items/", json={
        "name": "Mouse",
        "price": 29.99
    })
    item_id = create_response.json()["id"]
    
    # Then read it
    response = client.get(f"/items/{item_id}")
    assert response.status_code == 200
    assert response.json()["name"] == "Mouse"

def test_read_item_not_found():
    """Test reading a non-existent item returns 404"""
    response = client.get("/items/99999")
    assert response.status_code == 404
    assert response.json()["detail"] == "Item not found"
```

**Compare with Supertest (Express):**

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

Notice: No `await` needed in TestClient! It automatically handles async endpoints.

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
    """Reset the database before each test"""
    global user_counter
    users_db.clear()
    user_counter = 0
    yield
    users_db.clear()

def test_create_user_success():
    """Test creating a user with valid data"""
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
    """Test creating a user with invalid email fails validation"""
    user_data = {
        "username": "john_doe",
        "email": "not-an-email",  # Invalid email
        "full_name": "John Doe"
    }
    response = client.post("/users/", json=user_data)
    
    assert response.status_code == 422  # Validation error
    assert "email" in response.json()["detail"][0]["loc"]

def test_get_user_success():
    """Test retrieving a user by ID"""
    # Create a user first
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
    """Test getting a non-existent user returns 404"""
    response = client.get("/users/999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()

def test_update_user_success():
    """Test updating a user"""
    # Create a user
    create_response = client.post("/users/", json={
        "username": "old_name",
        "email": "old@example.com"
    })
    user_id = create_response.json()["id"]
    
    # Update the user
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
    """Test deleting a user"""
    # Create a user
    create_response = client.post("/users/", json={
        "username": "to_delete",
        "email": "delete@example.com"
    })
    user_id = create_response.json()["id"]
    
    # Delete the user
    response = client.delete(f"/users/{user_id}")
    assert response.status_code == 204
    assert response.content == b""
    
    # Verify user is deleted
    get_response = client.get(f"/users/{user_id}")
    assert get_response.status_code == 404

def test_list_users():
    """Test listing users with pagination"""
    # Create multiple users
    for i in range(5):
        client.post("/users/", json={
            "username": f"user_{i}",
            "email": f"user{i}@example.com"
        })
    
    # Get all users
    response = client.get("/users/")
    assert response.status_code == 200
    users = response.json()
    assert len(users) == 5
    
    # Test pagination
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
            raise ValueError('name must contain only letters, numbers, spaces, and hyphens')
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
    """Test suite for product validation"""
    
    def test_valid_product_creation(self):
        """Test creating a product with all valid fields"""
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
        # Tags should be lowercased
        assert data["tags"] == ["smartphone", "apple", "5g"]
    
    def test_name_too_short(self):
        """Test that names shorter than 3 characters are rejected"""
        product_data = {
            "name": "AB",  # Too short
            "price": 10.0,
            "category": "other",
            "stock": 10
        }
        response = client.post("/products/", json=product_data)
        
        assert response.status_code == 422
        errors = response.json()["detail"]
        assert any("name" in str(error["loc"]) for error in errors)
    
    def test_price_validation(self):
        """Test price must be positive and within range"""
        # Test negative price
        response = client.post("/products/", json={
            "name": "Test Product",
            "price": -10.0,  # Invalid
            "category": "other",
            "stock": 10
        })
        assert response.status_code == 422
        
        # Test zero price
        response = client.post("/products/", json={
            "name": "Test Product",
            "price": 0.0,  # Invalid
            "category": "other",
            "stock": 10
        })
        assert response.status_code == 422
        
        # Test price too high
        response = client.post("/products/", json={
            "name": "Test Product",
            "price": 2_000_000,  # Too high
            "category": "other",
            "stock": 10
        })
        assert response.status_code == 422
    
    def test_invalid_category(self):
        """Test that invalid categories are rejected"""
        product_data = {
            "name": "Test Product",
            "price": 10.0,
            "category": "invalid_category",  # Not in allowed values
            "stock": 10
        }
        response = client.post("/products/", json=product_data)
        
        assert response.status_code == 422
        errors = response.json()["detail"]
        assert any("category" in str(error["loc"]) for error in errors)
    
    def test_name_special_characters(self):
        """Test that names with special characters are rejected"""
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
        """Test that tags are automatically lowercased"""
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
        """Test that negative stock is rejected"""
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
        """Parametrized test for various field validations"""
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
    password_hash: str  # Should NOT be in response
    created_at: datetime
    is_active: bool

class UserResponse(BaseModel):
    """Public user response - no password"""
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
    """Returns user without password field"""
    return users[user_id]

@app.get("/users/{user_id}/admin", response_model=UserInDB)
async def get_user_admin(user_id: int):
    """Admin endpoint - returns everything including password hash"""
    return users[user_id]
```

```python
# tests/test_response_models.py
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_user_response_excludes_password():
    """Test that public endpoint does NOT return password"""
    response = client.get("/users/1")
    
    assert response.status_code == 200
    data = response.json()
    
    # These should be present
    assert "id" in data
    assert "username" in data
    assert "email" in data
    assert "created_at" in data
    assert "is_active" in data
    
    # Password should NOT be present
    assert "password_hash" not in data
    assert "password" not in data
    
    # Verify actual values
    assert data["username"] == "john"
    assert data["email"] == "john@example.com"

def test_admin_endpoint_includes_password():
    """Test that admin endpoint DOES return password hash"""
    response = client.get("/users/1/admin")
    
    assert response.status_code == 200
    data = response.json()
    
    # Password hash should be present for admin
    assert "password_hash" in data
    assert data["password_hash"].startswith("$2b$12$")

def test_datetime_serialization():
    """Test that datetimes are properly serialized to ISO format"""
    response = client.get("/users/1")
    
    assert response.status_code == 200
    data = response.json()
    
    # created_at should be an ISO format string
    assert "created_at" in data
    created_at = data["created_at"]
    
    # Should be a string in ISO format
    assert isinstance(created_at, str)
    assert "2024-01-01" in created_at
    
    # Should be parseable back to datetime
    from datetime import datetime
    parsed = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
    assert parsed.year == 2024
```

---

## Testing Authentication and Authorization

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
    """Test suite for authentication"""
    
    def test_login_success(self):
        """Test successful login returns access token"""
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
        assert len(data["access_token"]) > 50  # JWT tokens are long
    
    def test_login_wrong_password(self):
        """Test login with wrong password fails"""
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
        """Test login with non-existent user fails"""
        response = client.post(
            "/token",
            data={
                "username": "nonexistent",
                "password": "anypassword"
            }
        )
        
        assert response.status_code == 401
    
    def test_protected_route_without_token(self):
        """Test accessing protected route without token fails"""
        response = client.get("/protected")
        
        assert response.status_code == 401
        assert "Not authenticated" in response.json()["detail"]
    
    def test_protected_route_with_valid_token(self):
        """Test accessing protected route with valid token"""
        # First login to get token
        login_response = client.post(
            "/token",
            data={"username": "john", "password": "secret123"}
        )
        token = login_response.json()["access_token"]
        
        # Access protected route
        response = client.get(
            "/protected",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        assert "Hello john" in response.json()["message"]
    
    def test_protected_route_with_invalid_token(self):
        """Test accessing protected route with invalid token"""
        response = client.get(
            "/protected",
            headers={"Authorization": "Bearer invalid_token_here"}
        )
        
        assert response.status_code == 401
        assert "Could not validate credentials" in response.json()["detail"]
    
    def test_get_current_user(self):
        """Test the /users/me endpoint"""
        # Login
        login_response = client.post(
            "/token",
            data={"username": "john", "password": "secret123"}
        )
        token = login_response.json()["access_token"]
        
        # Get current user
        response = client.get(
            "/users/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        user = response.json()
        assert user["username"] == "john"
        assert user["email"] == "john@example.com"
        assert "hashed_password" not in user  # Should not expose password
    
    def test_expired_token(self):
        """Test that expired tokens are rejected"""
        from datetime import timedelta
        
        # Create a token that expired 1 hour ago
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
    """Upload a single file"""
    # Validate file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed types: {ALLOWED_EXTENSIONS}"
        )
    
    # Read file and check size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max size: {MAX_FILE_SIZE} bytes"
        )
    
    # Save file
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
    """Upload multiple files"""
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Too many files. Max 10")
    
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
    """Clean up uploaded files after each test"""
    yield
    # Remove all files in upload directory
    for file in UPLOAD_DIR.glob("*"):
        if file.is_file():
            file.unlink()

def test_upload_valid_file():
    """Test uploading a valid file"""
    # Create a fake file
    file_content = b"Hello, this is a test file!"
    files = {"file": ("test.txt", file_content, "text/plain")}
    
    response = client.post("/upload/", files=files)
    
    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "test.txt"
    assert data["size"] == len(file_content)
    assert data["content_type"] == "text/plain"
    
    # Verify file was actually saved
    uploaded_file = UPLOAD_DIR / "test.txt"
    assert uploaded_file.exists()
    assert uploaded_file.read_bytes() == file_content

def test_upload_image_file():
    """Test uploading an image file"""
    # Create a minimal valid PNG file (1x1 transparent pixel)
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
    """Test uploading file with disallowed extension"""
    files = {"file": ("script.exe", b"fake exe", "application/x-msdownload")}
    
    response = client.post("/upload/", files=files)
    
    assert response.status_code == 400
    assert "not allowed" in response.json()["detail"].lower()

def test_upload_file_too_large():
    """Test uploading file that exceeds size limit"""
    # Create a file larger than 5MB
    large_content = b"x" * (6 * 1024 * 1024)  # 6MB
    files = {"file": ("large.txt", large_content, "text/plain")}
    
    response = client.post("/upload/", files=files)
    
    assert response.status_code == 400
    assert "too large" in response.json()["detail"].lower()

def test_upload_multiple_files():
    """Test uploading multiple files at once"""
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
    
    # Verify all files were saved
    assert (UPLOAD_DIR / "file1.txt").exists()
    assert (UPLOAD_DIR / "file2.txt").exists()
    assert (UPLOAD_DIR / "file3.pdf").exists()

def test_upload_too_many_files():
    """Test uploading more than the allowed number of files"""
    # Try to upload 11 files (max is 10)
    files = [
        ("files", (f"file{i}.txt", b"content", "text/plain"))
        for i in range(11)
    ]
    
    response = client.post("/upload-multiple/", files=files)
    
    assert response.status_code == 400
    assert "too many" in response.json()["detail"].lower()

def test_upload_empty_file():
    """Test uploading an empty file"""
    files = {"file": ("empty.txt", b"", "text/plain")}
    
    response = client.post("/upload/", files=files)
    
    # Empty files should be allowed
    assert response.status_code == 200
    assert response.json()["size"] == 0
```

---

## Testing WebSockets

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
        # Send welcome message
        await websocket.send_json({
            "type": "connection",
            "message": f"Client {client_id} connected"
        })
        
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            
            # Echo back to client
            await websocket.send_json({
                "type": "echo",
                "client_id": client_id,
                "message": data
            })
            
            # Broadcast to all clients
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
    """Test basic WebSocket connection"""
    with client.websocket_connect("/ws/123") as websocket:
        # Should receive welcome message
        data = websocket.receive_json()
        assert data["type"] == "connection"
        assert "123" in data["message"]

def test_websocket_echo():
    """Test WebSocket echo functionality"""
    with client.websocket_connect("/ws/456") as websocket:
        # Skip welcome message
        websocket.receive_json()
        
        # Send a message
        websocket.send_text("Hello, WebSocket!")
        
        # Should receive echo
        response = websocket.receive_json()
        assert response["type"] == "echo"
        assert response["client_id"] == 456
        assert response["message"] == "Hello, WebSocket!"

def test_websocket_broadcast():
    """Test broadcasting to multiple clients"""
    with client.websocket_connect("/ws/1") as ws1, \
         client.websocket_connect("/ws/2") as ws2:
        
        # Skip welcome messages
        ws1.receive_json()
        ws2.receive_json()
        
        # Client 1 sends a message
        ws1.send_text("Hello from client 1")
        
        # Both clients should receive the broadcast
        # Client 1 gets echo first
        echo = ws1.receive_json()
        assert echo["type"] == "echo"
        
        # Then broadcast
        broadcast1 = ws1.receive_text()
        assert "Client 1 says: Hello from client 1" in broadcast1
        
        # Client 2 gets only broadcast
        broadcast2 = ws2.receive_text()
        assert "Client 1 says: Hello from client 1" in broadcast2

def test_websocket_disconnect():
    """Test WebSocket disconnection handling"""
    with client.websocket_connect("/ws/999") as websocket:
        websocket.receive_json()  # Welcome message
        websocket.send_text("Test message")
        websocket.receive_json()  # Echo
    
    # Connection is automatically closed when exiting context
    # In a real test, you'd verify the disconnect was handled properly
```

---

## Testing Background Tasks

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
    """Simulate sending an email (this would be async in production)"""
    time.sleep(0.1)  # Simulate network delay
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
    """Send notification in the background"""
    background_tasks.add_task(
        send_email,
        notification.email,
        notification.message
    )
    return {"message": "Notification will be sent in the background"}

@app.post("/send-multiple-notifications/")
async def send_multiple_notifications(
    notifications: List[NotificationRequest],
    background_tasks: BackgroundTasks
):
    """Send multiple notifications"""
    for notification in notifications:
        background_tasks.add_task(
            send_email,
            notification.email,
            notification.message
        )
    return {"message": f"{len(notifications)} notifications will be sent"}

@app.get("/email-log/")
async def get_email_log():
    """Get the email log (for testing purposes)"""
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
    """Clear email log before each test"""
    email_log.clear()
    yield
    email_log.clear()

def test_background_task_executes():
    """Test that background task actually executes"""
    response = client.post("/send-notification/", json={
        "email": "test@example.com",
        "message": "Test notification"
    })
    
    assert response.status_code == 200
    assert "background" in response.json()["message"].lower()
    
    # TestClient automatically waits for background tasks to complete
    # Check that email was "sent"
    log_response = client.get("/email-log/")
    emails = log_response.json()["emails"]
    
    assert len(emails) == 1
    assert emails[0]["email"] == "test@example.com"
    assert emails[0]["message"] == "Test notification"

def test_multiple_background_tasks():
    """Test sending multiple notifications"""
    response = client.post("/send-multiple-notifications/", json=[
        {"email": "user1@example.com", "message": "Message 1"},
        {"email": "user2@example.com", "message": "Message 2"},
        {"email": "user3@example.com", "message": "Message 3"},
    ])
    
    assert response.status_code == 200
    
    # Verify all emails were sent
    log_response = client.get("/email-log/")
    emails = log_response.json()["emails"]
    
    assert len(emails) == 3
    email_addresses = [email["email"] for email in emails]
    assert "user1@example.com" in email_addresses
    assert "user2@example.com" in email_addresses
    assert "user3@example.com" in email_addresses

def test_background_task_with_invalid_email():
    """Test that validation happens before background task"""
    response = client.post("/send-notification/", json={
        "email": "not-an-email",  # Invalid
        "message": "Test"
    })
    
    # Should fail validation before background task even runs
    assert response.status_code == 422
    
    # No email should be in the log
    log_response = client.get("/email-log/")
    assert log_response.json()["count"] == 0
```

**Key Point:** TestClient automatically waits for background tasks to complete, making them easy to test synchronously!

---

## Dependency Injection in Tests

### Example 8: Overriding Dependencies

```python
# app/dependencies.py
from fastapi import Header, HTTPException

async def get_api_key(x_api_key: str = Header(...)):
    """Validate API key"""
    if x_api_key != "secret-api-key":
        raise HTTPException(status_code=403, detail="Invalid API key")
    return x_api_key

async def get_current_user_id(x_user_id: str = Header(...)):
    """Get current user ID from header"""
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
    """Test accessing protected endpoint with valid API key"""
    response = client.get(
        "/protected/",
        headers={"X-API-Key": "secret-api-key"}
    )
    assert response.status_code == 200

def test_protected_endpoint_without_key():
    """Test accessing protected endpoint without API key"""
    response = client.get("/protected/")
    assert response.status_code == 422  # Missing required header

def test_protected_endpoint_with_invalid_key():
    """Test accessing protected endpoint with invalid API key"""
    response = client.get(
        "/protected/",
        headers={"X-API-Key": "wrong-key"}
    )
    assert response.status_code == 403

# ========== DEPENDENCY OVERRIDE PATTERN ==========

def test_with_dependency_override():
    """Test using dependency override to bypass authentication"""
    
    # Create a mock dependency that always returns a fake API key
    async def mock_get_api_key():
        return "mocked-key"
    
    # Override the dependency
    app.dependency_overrides[get_api_key] = mock_get_api_key
    
    try:
        # Now we can access without providing the real API key
        response = client.get("/protected/")
        assert response.status_code == 200
        assert response.json()["api_key"] == "mocked-key"
    finally:
        # Always clean up overrides!
        app.dependency_overrides.clear()

def test_user_profile_with_override():
    """Test overriding user ID dependency"""
    
    # Mock user ID dependency to always return user 42
    async def mock_get_user_id():
        return 42
    
    app.dependency_overrides[get_current_user_id] = mock_get_user_id
    
    try:
        # No need to provide X-User-ID header
        response = client.get("/user/profile/")
        assert response.status_code == 200
        assert response.json()["user_id"] == 42
    finally:
        app.dependency_overrides.clear()

# Better: Use pytest fixture for dependency overrides

import pytest

@pytest.fixture
def override_auth():
    """Fixture to override authentication for all tests"""
    async def mock_api_key():
        return "test-key"
    
    app.dependency_overrides[get_api_key] = mock_api_key
    yield
    app.dependency_overrides.clear()

def test_with_auth_fixture(override_auth):
    """Test that automatically has auth overridden"""
    response = client.get("/protected/")
    assert response.status_code == 200

@pytest.fixture
def mock_user(request):
    """Fixture to mock user ID (parametrizable)"""
    user_id = getattr(request, 'param', 1)  # Default to user 1
    
    async def mock_get_user_id():
        return user_id
    
    app.dependency_overrides[get_current_user_id] = mock_get_user_id
    yield user_id
    app.dependency_overrides.clear()

@pytest.mark.parametrize('mock_user', [1, 42, 999], indirect=True)
def test_different_users(mock_user):
    """Test with different user IDs"""
    response = client.get("/user/profile/")
    assert response.status_code == 200
    assert response.json()["user_id"] == mock_user
```

**This is HUGE:** Dependency overrides let you mock databases, auth systems, external APIs, and more without touching your application code!

---

## Common Pitfalls and Best Practices

### ❌ Pitfall 1: Shared State Between Tests

```python
# BAD: Global state leaks between tests
from fastapi import FastAPI
from fastapi.testclient import TestClient

app = FastAPI()
items = []  # Shared state!

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
    # This might fail! Count could be 2 if test_first ran first
    assert response.json()["count"] == 1  # ❌ FLAKY TEST

# GOOD: Reset state between tests
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
# BAD: Only checking status code
def test_get_user():
    response = client.get("/users/1")
    assert response.status_code == 200  # ❌ Not enough!

# GOOD: Verify the actual data
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
    """Always test the unhappy path!"""
    
    def test_create_user_missing_required_field(self):
        """Test that missing required fields are rejected"""
        response = client.post("/users/", json={"username": "john"})
        # Missing email
        assert response.status_code == 422
    
    def test_create_user_invalid_email_format(self):
        """Test that invalid emails are rejected"""
        response = client.post("/users/", json={
            "username": "john",
            "email": "not-an-email"
        })
        assert response.status_code == 422
    
    def test_get_nonexistent_user(self):
        """Test that 404 is returned for missing resources"""
        response = client.get("/users/99999")
        assert response.status_code == 404
    
    def test_delete_already_deleted_user(self):
        """Test deleting a user twice"""
        # Create and delete user
        create_resp = client.post("/users/", json={
            "username": "john",
            "email": "john@example.com"
        })
        user_id = create_resp.json()["id"]
        client.delete(f"/users/{user_id}")
        
        # Try to delete again
        response = client.delete(f"/users/{user_id}")
        assert response.status_code == 404
```

---

## Practice Exercises

### Exercise 1: E2E Blog API Testing

Create a simple blog API with posts and comments, then write comprehensive E2E tests:

```python
# TODO: Implement these endpoints
# POST /posts/ - Create a post
# GET /posts/{post_id} - Get a post
# GET /posts/ - List posts (with pagination)
# POST /posts/{post_id}/comments/ - Add comment to post
# GET /posts/{post_id}/comments/ - Get comments for post

# TODO: Write tests for:
# - Creating posts with valid/invalid data
# - Pagination
# - Adding comments to posts
# - Getting comments for a post
# - Error handling (post not found, etc.)
```

### Exercise 2: File Upload with Validation

Create an endpoint that accepts image uploads and validates them:

```python
# TODO: Implement endpoint that:
# - Accepts only image files (jpg, png, gif)
# - Validates image dimensions (max 2000x2000)
# - Validates file size (max 2MB)
# - Returns image metadata

# TODO: Write tests for:
# - Valid image upload
# - Invalid file type
# - Image too large (dimensions)
# - File too large (size)
# - Empty file
```

### Exercise 3: Rate Limiting

Implement and test a rate-limited endpoint:

```python
# TODO: Implement rate limiting (e.g., 5 requests per minute per user)
# TODO: Write tests that:
# - Make multiple requests and verify rate limit works
# - Test that rate limit resets after time period
# - Test different users have separate rate limits
```

### Exercise 4: Database Integration Testing

Set up a test database and write tests for database operations:

```python
# TODO: Create test database fixture
# TODO: Implement user CRUD with real database
# TODO: Write tests that verify:
# - Data persistence
# - Transactions
# - Constraints (unique email, etc.)
# - Cascading deletes
```

---

## Summary

You've learned how to:

✅ Set up FastAPI testing with TestClient  
✅ Write E2E tests for CRUD operations  
✅ Test request validation and response models  
✅ Test authentication and authorization  
✅ Test file uploads and WebSockets  
✅ Test background tasks  
✅ Use dependency overrides for mocking  
✅ Avoid common testing pitfalls

**Next Steps:**
- Learn about mocking external APIs (next tutorial)
- Database testing strategies
- Testing async code
- Coverage and reporting

**Key Takeaway:** TestClient makes E2E testing incredibly simple. Use dependency overrides to mock external services, and always test both happy and unhappy paths!
