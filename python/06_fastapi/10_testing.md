# 10 - Testing FastAPI Applications

## Overview

Testing in FastAPI is remarkably similar to testing Express with supertest. The `TestClient` from FastAPI plays the same role as supertest -- it lets you make HTTP requests to your app without running a real server.

### Comparison

| Feature | Express (Jest + Supertest) | FastAPI (pytest + TestClient) |
|---|---|---|
| Test runner | Jest / Mocha | pytest |
| HTTP testing | supertest | TestClient (based on httpx) |
| Assertions | expect() / chai | assert (Python built-in) |
| Mocking | jest.mock() | dependency_overrides |
| Async testing | async/await in Jest | pytest-asyncio |
| Coverage | istanbul/c8 | coverage / pytest-cov |

### Setup

```bash
pip install pytest httpx
# httpx is needed for TestClient and async testing
```

---

## TestClient: The Basics

### Express + Supertest (for comparison)

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

### Running Tests

```bash
# Run all tests
pytest

# Run with verbose output
pytest -v

# Run a specific file
pytest test_main.py

# Run a specific test
pytest test_main.py::test_create_user

# Run with coverage
pytest --cov=app --cov-report=html
```

---

## TestClient Features

### Setting Headers

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

### Form Data

```python
def test_login():
    response = client.post(
        "/token",
        data={"username": "alice", "password": "secret123"},  # Form data, not JSON
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
    # Set cookies in request
    response = client.get("/me", cookies={"session_id": "abc123"})
    assert response.status_code == 200

    # Check cookies in response
    response = client.post("/login", json={"username": "alice"})
    assert "session_id" in response.cookies
```

---

## Dependency Overrides for Mocking

This is FastAPI's killer testing feature. No jest.mock(), no proxyquire, no sinon.

### The Problem in Express

```javascript
// Express: mocking database is painful
jest.mock('../database', () => ({
  getUsers: jest.fn().mockResolvedValue([{ id: 1, name: 'Alice' }]),
}));

// Or use dependency injection manually, which Express doesn't support
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

# Create a fake database dependency
def override_get_db():
    """Return a fake database session for testing."""
    fake_db = FakeDB()
    fake_db.data = [
        {"id": 1, "name": "Alice"},
        {"id": 2, "name": "Bob"},
    ]
    try:
        yield fake_db
    finally:
        fake_db.close()

# Override the real dependency
app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

def test_list_users():
    response = client.get("/users")
    assert response.status_code == 200
    assert len(response.json()) == 2

# IMPORTANT: Clean up overrides after tests
def teardown_module():
    app.dependency_overrides.clear()
```

### Using pytest Fixtures for Cleaner Setup

```python
import pytest
from fastapi.testclient import TestClient
from main import app

@pytest.fixture
def client():
    """Provide a test client with overridden dependencies."""

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
    """Client authenticated as admin."""

    def override_get_current_user():
        return {"id": 1, "username": "admin", "is_admin": True}

    app.dependency_overrides[get_current_user] = override_get_current_user

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()

# Tests use fixtures
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

---

## Async Testing with httpx

For testing async endpoints, use `httpx.AsyncClient` instead of `TestClient`.

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

### Configure pytest for async

```ini
# pyproject.toml or pytest.ini
[tool.pytest.ini_options]
asyncio_mode = "auto"  # No need for @pytest.mark.anyio on every test
```

---

## Testing with a Real Database

### Strategy 1: Test Database with Transaction Rollback

```python
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base, get_db
from main import app

# Use a separate test database
TEST_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestSessionLocal = sessionmaker(bind=engine)

@pytest.fixture(scope="session", autouse=True)
def create_test_database():
    """Create tables once for the test session."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db_session():
    """Each test gets a fresh transaction that's rolled back."""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def client(db_session):
    """Test client with database override."""
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

# Tests
def test_create_and_read_user(client):
    # Create
    response = client.post(
        "/users",
        json={"name": "Alice", "email": "alice@example.com", "password": "secret"},
    )
    assert response.status_code == 201
    user_id = response.json()["id"]

    # Read
    response = client.get(f"/users/{user_id}")
    assert response.status_code == 200
    assert response.json()["name"] == "Alice"

def test_duplicate_email(client):
    client.post("/users", json={"name": "A", "email": "a@test.com", "password": "x"})
    response = client.post("/users", json={"name": "B", "email": "a@test.com", "password": "y"})
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"]
```

### Strategy 2: In-Memory SQLite

```python
@pytest.fixture
def client():
    """Use in-memory SQLite for fastest tests."""
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

---

## Testing WebSocket Endpoints

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
    # Test that connecting without auth closes the connection
    with pytest.raises(Exception):
        with client.websocket_connect("/ws/secure") as websocket:
            websocket.receive_text()  # Should fail

def test_websocket_with_auth():
    with client.websocket_connect("/ws/secure?token=valid-jwt") as websocket:
        websocket.send_text("Hello")
        data = websocket.receive_text()
        assert "Hello" in data

def test_websocket_broadcast():
    """Test that messages are broadcast to multiple clients."""
    with client.websocket_connect("/ws/chat") as ws1:
        with client.websocket_connect("/ws/chat") as ws2:
            ws1.send_json({"type": "message", "content": "Hello from ws1"})

            # Both should receive the message
            data1 = ws1.receive_json()
            data2 = ws2.receive_json()
            assert data1["content"] == "Hello from ws1"
            assert data2["content"] == "Hello from ws1"
```

---

## Testing Patterns

### Testing Validation Errors

```python
def test_validation_error():
    response = client.post(
        "/users",
        json={"name": "", "email": "not-an-email"},  # Invalid data
    )
    assert response.status_code == 422
    errors = response.json()["detail"]
    # Check that specific fields have errors
    error_fields = [e["loc"][-1] for e in errors]
    assert "name" in error_fields or "email" in error_fields

def test_missing_required_field():
    response = client.post("/users", json={"name": "Alice"})  # Missing email
    assert response.status_code == 422

def test_invalid_path_parameter():
    response = client.get("/users/not-a-number")
    assert response.status_code == 422
```

### Testing Error Responses

```python
def test_not_found():
    response = client.get("/users/99999")
    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"

def test_unauthorized():
    response = client.get("/users/me")  # No auth header
    assert response.status_code == 401

def test_forbidden():
    # Using non-admin client
    response = client.get(
        "/admin/dashboard",
        headers={"Authorization": "Bearer regular-user-token"},
    )
    assert response.status_code == 403
```

### Parameterized Tests

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

### Testing Background Tasks

```python
def test_register_triggers_email(client, mocker):
    """
    Background tasks run during TestClient requests,
    so we can check their side effects.
    """
    # If using a file-based log for emails
    response = client.post(
        "/register",
        json={"email": "test@example.com", "name": "Test"},
    )
    assert response.status_code == 201

    # Check that the background task ran
    # (depends on what the task does -- check file, check mock, etc.)
```

---

## Comparison with Jest/Supertest Patterns

### Jest Lifecycle -> pytest Fixtures

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
    # Runs before each test
    yield
    # Runs after each test (cleanup)
    db_session.rollback()
```

### Jest Describe/It -> pytest Classes/Functions

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
Write tests for a simple CRUD API:
- Test creating an item (valid data)
- Test creating with invalid data (expect 422)
- Test reading an existing item
- Test reading a non-existent item (expect 404)
- Test updating an item
- Test deleting an item
- Test listing items with pagination

### Exercise 2: Auth Testing
Write tests for authentication:
- Test login with valid credentials
- Test login with invalid credentials (expect 401)
- Test accessing protected route with valid token
- Test accessing protected route without token (expect 401)
- Test accessing admin route as regular user (expect 403)
- Use dependency overrides to mock the current user

### Exercise 3: Database Testing
Set up a test database and write tests that:
- Create records and verify they persist within a test
- Verify that tests are isolated (data from one test doesn't leak to another)
- Test unique constraint violations
- Test relationship creation (e.g., user with posts)

### Exercise 4: WebSocket Testing
Write tests for a chat WebSocket:
- Test connecting and receiving a welcome message
- Test sending a message and receiving an echo
- Test that messages are broadcast to multiple clients
- Test connection rejection for invalid auth

### Exercise 5: Integration Test Suite
Build a complete test suite for a mini API with:
- User registration and login
- Protected CRUD operations on a resource
- Use fixtures to create authenticated test clients
- Test the full flow: register -> login -> create item -> list items -> delete item
