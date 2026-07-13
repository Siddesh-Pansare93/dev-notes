# 10 - FastAPI Applications Ka Testing

## Overview

FastAPI mein testing bilkul Express mein Supertest ka kaam karta hai. `TestClient` ek HTTP request bhej sakta hai tumhara app ko bina actual server chale. Socho ek dabbawala ki tarah — aapne order kiya (request), woh deliver karke check karta hai (response) — sab kuch harkat ek confined environment mein.

### Comparison

| Feature | Express (Jest + Supertest) | FastAPI (pytest + TestClient) |
|---|---|---|
| Test runner | Jest / Mocha | pytest |
| HTTP testing | supertest | TestClient (httpx par based) |
| Assertions | expect() / chai | assert (Python built-in) |
| Mocking | jest.mock() | dependency_overrides |
| Async testing | async/await in Jest | pytest-asyncio |
| Coverage | istanbul/c8 | coverage / pytest-cov |

### Setup

```bash
pip install pytest httpx
# httpx zaruri hai TestClient aur async testing ke liye
```

---

## TestClient: Basics Se Shuru

### Express + Supertest (comparison ke liye)

```javascript
const request = require('supertest');
const app = require('./app');

describe('GET /users', () => {
  it('should return a list of users', async () => {
    const res = await request(app)
      .get('/users')
      .expect(200);

    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toHaveProperty('name');
  });

  it('should create a user', async () => {
    const res = await request(app)
      .post('/users')
      .send({ name: 'Alice', email: 'alice@example.com' })
      .expect(201);

    expect(res.body.name).toBe('Alice');
  });
});
```

### FastAPI + pytest + TestClient

```python
# test_main.py
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_list_users():
    response = client.get("/users")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert "name" in data[0]

def test_create_user():
    response = client.post(
        "/users",
        json={"name": "Alice", "email": "alice@example.com"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Alice"
```

### Tests Kaise Chalaate Ho

```bash
# Sab tests chalao
pytest

# Verbose output ke saath (zyada details)
pytest -v

# Ek specific file ka test chalao
pytest test_main.py

# Ek specific test chalao
pytest test_main.py::test_create_user

# Coverage ke saath chalao (kitna code cover hua)
pytest --cov=app --cov-report=html
```

---

## TestClient Ki Features

### Headers Set Karna

```python
def test_authenticated_endpoint():
    response = client.get(
        "/users/me",
        headers={"Authorization": "Bearer my-jwt-token"},
    )
    assert response.status_code == 200

def test_api_key():
    response = client.get(
        "/data",
        headers={"X-API-Key": "secret123"},
    )
    assert response.status_code == 200
```

### Query Parameters

```python
def test_search():
    response = client.get("/search", params={"q": "python", "limit": 5})
    assert response.status_code == 200
    data = response.json()
    assert len(data["results"]) <= 5
```

### Form Data (Zomato jaise order form par think karo)

```python
def test_login():
    response = client.post(
        "/token",
        data={"username": "alice", "password": "secret123"},  # Form data, JSON nahi
    )
    assert response.status_code == 200
    assert "access_token" in response.json()
```

### File Uploads

```python
def test_file_upload():
    response = client.post(
        "/upload",
        files={"file": ("test.txt", b"file content here", "text/plain")},
    )
    assert response.status_code == 200
    assert response.json()["filename"] == "test.txt"

def test_file_upload_with_form_data():
    response = client.post(
        "/upload",
        files={"file": ("photo.jpg", b"fake image data", "image/jpeg")},
        data={"description": "My photo"},  # Additional form fields
    )
    assert response.status_code == 200
```

### Cookies

```python
def test_cookies():
    # Request mein cookies set karo
    response = client.get("/me", cookies={"session_id": "abc123"})
    assert response.status_code == 200

    # Response mein cookies check karo
    response = client.post("/login", json={"username": "alice"})
    assert "session_id" in response.cookies
```

---

## Dependency Overrides Se Mocking (FastAPI Ka Killer Feature!)

Yeh FastAPI ka sabse powerful testing feature hai. Jest.mock(), proxyquire, ya sinon ki zarurat hi nahi.

### Express Mein Problem

```javascript
// Express: database mock karna boht painful hota hai
jest.mock('../database', () => ({
  getUsers: jest.fn().mockResolvedValue([{ id: 1, name: 'Alice' }]),
}));

// Ya manually dependency injection, jo Express support hi nahi karta
```

### FastAPI: Clean Dependency Overrides

```python
# main.py
from fastapi import FastAPI, Depends
from database import get_db

app = FastAPI()

@app.get("/users")
def list_users(db = Depends(get_db)):
    return db.query(User).all()
```

```python
# test_main.py
from fastapi.testclient import TestClient
from main import app, get_db

# Ek fake database dependency banana
def override_get_db():
    """Testing ke liye fake database session return karo."""
    fake_db = FakeDB()
    fake_db.data = [
        {"id": 1, "name": "Alice"},
        {"id": 2, "name": "Bob"},
    ]
    try:
        yield fake_db
    finally:
        fake_db.close()

# Real dependency ko override karo
app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

def test_list_users():
    response = client.get("/users")
    assert response.status_code == 200
    assert len(response.json()) == 2

# IMPORTANT: Tests ke baad overrides ko clean karo!
def teardown_module():
    app.dependency_overrides.clear()
```

### pytest Fixtures Use Karke Clean Setup

```python
import pytest
from fastapi.testclient import TestClient
from main import app

@pytest.fixture
def client():
    """Overridden dependencies ke saath test client dedo."""

    def override_get_db():
        db = TestDatabase()
        try:
            yield db
        finally:
            db.rollback()
            db.close()

    def override_get_current_user():
        return {"id": 1, "username": "testuser", "is_admin": False}

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()

@pytest.fixture
def admin_client():
    """Admin ke taur par authenticated client."""

    def override_get_current_user():
        return {"id": 1, "username": "admin", "is_admin": True}

    app.dependency_overrides[get_current_user] = override_get_current_user

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()

# Tests fixtures use karte hain
def test_list_users(client):
    response = client.get("/users")
    assert response.status_code == 200

def test_admin_dashboard(admin_client):
    response = admin_client.get("/admin/dashboard")
    assert response.status_code == 200

def test_admin_rejected_for_regular_user(client):
    response = client.get("/admin/dashboard")
    assert response.status_code == 403
```

> [!tip]
> Fixtures ko socho Zomato ke test kitchen ki tarah — har test ko fresh setup milta hai, aur test khatam hone par sab clean ho jata hai.

---

## Async Testing httpx Se

Async endpoints ke liye `httpx.AsyncClient` use karo, `TestClient` ki jagah.

```bash
pip install pytest-asyncio
```

```python
# test_async.py
import pytest
from httpx import AsyncClient, ASGITransport
from main import app

@pytest.mark.anyio
async def test_async_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/users")
        assert response.status_code == 200

@pytest.mark.anyio
async def test_async_create():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/users",
            json={"name": "Alice", "email": "alice@example.com"},
        )
        assert response.status_code == 201
```

### pytest ko Async ke liye Configure Karo

```ini
# pyproject.toml or pytest.ini
[tool.pytest.ini_options]
asyncio_mode = "auto"  # Har test par @pytest.mark.anyio likhne ki zarurat nahi
```

---

## Real Database ke Saath Testing

### Strategy 1: Test Database with Transaction Rollback

```python
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base, get_db
from main import app

# Alag test database use karo
TEST_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestSessionLocal = sessionmaker(bind=engine)

@pytest.fixture(scope="session", autouse=True)
def create_test_database():
    """Test session ke liye ek baar tables banao."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db_session():
    """Har test ko fresh transaction milta hai jo baad mein rollback ho jata hai."""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def client(db_session):
    """Database override ke saath test client."""
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

# Tests
def test_create_and_read_user(client):
    # Create karo
    response = client.post(
        "/users",
        json={"name": "Alice", "email": "alice@example.com", "password": "secret"},
    )
    assert response.status_code == 201
    user_id = response.json()["id"]

    # Read karo
    response = client.get(f"/users/{user_id}")
    assert response.status_code == 200
    assert response.json()["name"] == "Alice"

def test_duplicate_email(client):
    client.post("/users", json={"name": "A", "email": "a@test.com", "password": "x"})
    response = client.post("/users", json={"name": "B", "email": "a@test.com", "password": "y"})
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"]
```

### Strategy 2: In-Memory SQLite (Sabse Tez!)

```python
@pytest.fixture
def client():
    """In-memory SQLite use karo — tests boht fast chale."""
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestSession = sessionmaker(bind=engine)

    def override_get_db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
```

> [!info]
> In-memory SQLite real database jaisa behave karta hai, par RAM mein chalta hai — testing ke liye perfect!

---

## WebSocket Endpoints Ka Testing

```python
def test_websocket_echo():
    with client.websocket_connect("/ws/echo") as websocket:
        websocket.send_text("Hello")
        data = websocket.receive_text()
        assert data == "Echo: Hello"

def test_websocket_json():
    with client.websocket_connect("/ws/chat") as websocket:
        websocket.send_json({"type": "message", "content": "Hi!"})
        response = websocket.receive_json()
        assert response["type"] == "message"
        assert response["content"] == "Hi!"

def test_websocket_auth_required():
    # Test karo ki auth ke bina connection close ho jata hai
    with pytest.raises(Exception):
        with client.websocket_connect("/ws/secure") as websocket:
            websocket.receive_text()  # Fail hona chahiye

def test_websocket_with_auth():
    with client.websocket_connect("/ws/secure?token=valid-jwt") as websocket:
        websocket.send_text("Hello")
        data = websocket.receive_text()
        assert "Hello" in data

def test_websocket_broadcast():
    """Test karo ki messages multiple clients ko milte hain."""
    with client.websocket_connect("/ws/chat") as ws1:
        with client.websocket_connect("/ws/chat") as ws2:
            ws1.send_json({"type": "message", "content": "Hello from ws1"})

            # Dono ko message milna chahiye
            data1 = ws1.receive_json()
            data2 = ws2.receive_json()
            assert data1["content"] == "Hello from ws1"
            assert data2["content"] == "Hello from ws1"
```

---

## Testing Patterns

### Validation Errors Ko Test Karna

```python
def test_validation_error():
    response = client.post(
        "/users",
        json={"name": "", "email": "not-an-email"},  # Invalid data
    )
    assert response.status_code == 422
    errors = response.json()["detail"]
    # Check karo ke specific fields mein errors hain
    error_fields = [e["loc"][-1] for e in errors]
    assert "name" in error_fields or "email" in error_fields

def test_missing_required_field():
    response = client.post("/users", json={"name": "Alice"})  # Email missing
    assert response.status_code == 422

def test_invalid_path_parameter():
    response = client.get("/users/not-a-number")
    assert response.status_code == 422
```

### Error Responses Ko Test Karna

```python
def test_not_found():
    response = client.get("/users/99999")
    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"

def test_unauthorized():
    response = client.get("/users/me")  # No auth header
    assert response.status_code == 401

def test_forbidden():
    # Non-admin client use karo
    response = client.get(
        "/admin/dashboard",
        headers={"Authorization": "Bearer regular-user-token"},
    )
    assert response.status_code == 403
```

### Parameterized Tests (Multiple Data Points)

```python
import pytest

@pytest.mark.parametrize("path,expected_status", [
    ("/", 200),
    ("/health", 200),
    ("/nonexistent", 404),
    ("/users", 200),
])
def test_status_codes(client, path, expected_status):
    response = client.get(path)
    assert response.status_code == expected_status

@pytest.mark.parametrize("invalid_email", [
    "not-an-email",
    "@missing-local.com",
    "missing-domain@",
    "",
])
def test_invalid_emails(client, invalid_email):
    response = client.post("/users", json={"name": "Test", "email": invalid_email})
    assert response.status_code == 422
```

> [!tip]
> Parameterized tests tabada use karo jab same logic ko different inputs ke saath test karna ho — code repetition save hota hai!

### Background Tasks Ko Test Karna

```python
def test_register_triggers_email(client, mocker):
    """
    TestClient requests ke doran background tasks run hote hain,
    toh hum un ke side effects check kar sakte hain.
    """
    # Agar file-based log use kar rahe ho emails ke liye
    response = client.post(
        "/register",
        json={"email": "test@example.com", "name": "Test"},
    )
    assert response.status_code == 201

    # Check karo ke background task chala ya nahi
    # (depends on task kya karta hai — file check karo, mock check karo, etc.)
```

---

## Jest/Supertest Se Comparison

### Jest Lifecycle → pytest Fixtures

```javascript
// Jest
beforeAll(async () => { await setupDatabase(); });
afterAll(async () => { await teardownDatabase(); });
beforeEach(async () => { await clearTables(); });
```

```python
# pytest
@pytest.fixture(scope="session", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(autouse=True)
def clear_tables(db_session):
    # Har test se pehle chalega
    yield
    # Har test ke baad cleanup
    db_session.rollback()
```

### Jest Describe/It → pytest Classes/Functions

```javascript
describe('Users API', () => {
  it('should create a user', async () => { ... });
  it('should list users', async () => { ... });
});
```

```python
class TestUsersAPI:
    def test_create_user(self, client):
        ...

    def test_list_users(self, client):
        ...
```

---

## Practice Exercises

### Exercise 1: Basic Test Suite
Ek simple CRUD API ke liye tests likho:
- Creating an item (valid data)
- Creating with invalid data (expect 422)
- Reading an existing item
- Reading a non-existent item (expect 404)
- Updating an item
- Deleting an item
- Listing items with pagination

### Exercise 2: Auth Testing
Authentication ke liye tests likho:
- Login with valid credentials
- Login with invalid credentials (expect 401)
- Protected route ko valid token se access karo
- Protected route ko bina token ke access karo (expect 401)
- Admin route ko regular user ke taur par access karo (expect 403)
- Dependency overrides use karke current user ko mock karo

### Exercise 3: Database Testing
Ek test database setup karo aur tests likho jo:
- Records create karo aur verify karo ke persist ho gaye
- Verify karo ke tests isolated hain (ek test ka data dusre mein leak nahi hona chahiye)
- Unique constraint violations ko test karo
- Relationship creation ko test karo (e.g., user with posts)

### Exercise 4: WebSocket Testing
Ek chat WebSocket ke liye tests likho:
- Connect karo aur welcome message receive karo
- Message bhejo aur echo receive karo
- Verify karo ke messages multiple clients ko broadcast ho rahe hain
- Invalid auth ke liye connection rejection test karo

### Exercise 5: Integration Test Suite
Ek complete test suite likho mini API ke liye:
- User registration aur login
- Protected CRUD operations on a resource
- Fixtures use karke authenticated test clients banao
- Full flow test karo: register → login → create item → list items → delete item
