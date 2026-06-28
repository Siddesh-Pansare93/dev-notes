# Python Testing Deep Dive

This comprehensive guide covers testing strategies for modern Python applications, focusing on FastAPI, pytest, mocking, database strategies, and testing LLM/LangChain applications.

## What You'll Learn
- End-to-End (E2E) testing with FastAPI `TestClient`
- Advanced Mocking strategies (external APIs, databases, LLMs)
- Testing asynchronous Python code
- Coverage reporting and CI/CD integration

## Setup Instructions

First, install the necessary testing dependencies:

```bash
pip install pytest pytest-asyncio pytest-cov httpx respx responses fastapi[all] sqlalchemy
```

Configure `pytest.ini` at your project root:

```ini
[pytest]
asyncio_mode = auto
testpaths = tests
python_files = test_*.py
addopts = -v --cov=app --cov-report=term-missing
```

---

## E2E Testing with FastAPI TestClient

The FastAPI `TestClient` uses `httpx` under the hood. It allows you to test your entire FastAPI application without starting a live server.

### Example 1: Basic Endpoint Test
```python
from fastapi import FastAPI
from fastapi.testclient import TestClient

app = FastAPI()

@app.get("/health")
def health_check():
    return {"status": "ok"}

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

### Example 2: Testing POST Requests with Validation
```python
def test_create_user():
    response = client.post(
        "/users/",
        json={"email": "test@example.com", "password": "securepassword"}
    )
    assert response.status_code == 201
    assert response.json()["email"] == "test@example.com"
    assert "id" in response.json()
```

### Example 3: Testing Authentication (Dependencies Override)
```python
from app.dependencies import get_current_user

def override_get_current_user():
    return {"id": 1, "username": "testuser"}

app.dependency_overrides[get_current_user] = override_get_current_user

def test_protected_route():
    response = client.get("/protected")
    assert response.status_code == 200
```

---

## Mocking External APIs

When your app calls external services, you should mock those requests to ensure tests are fast, deterministic, and don't hit rate limits.

### Example 4: Mocking HTTPX with `respx`
```python
import httpx
import respx

@respx.mock
def test_external_api_call():
    # Arrange
    respx.get("https://api.github.com/users/octocat").mock(
        return_value=httpx.Response(200, json={"login": "octocat"})
    )
    
    # Act
    response = httpx.get("https://api.github.com/users/octocat")
    
    # Assert
    assert response.status_code == 200
    assert response.json()["login"] == "octocat"
```

### Example 5: Mocking with `responses` library
```python
import responses
import requests

@responses.activate
def test_requests_call():
    responses.add(
        responses.GET,
        "https://api.example.com/data",
        json={"data": "mocked"},
        status=200
    )
    
    resp = requests.get("https://api.example.com/data")
    assert resp.json() == {"data": "mocked"}
```

---

## Database Testing Strategies

Never use your production database for testing. Use an in-memory SQLite database or a dedicated test Postgres container.

### Example 6: Pytest Fixtures for Test Database
```python
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base, get_db

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture()
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

def test_db_insert(db_session):
    # Test your DB logic using db_session
    assert True
```

### Example 7: Overriding DB Dependency in FastAPI
```python
@pytest.fixture()
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
            
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
```

---

## Testing Async Code

### Example 8: Async Pytest Setup
With `pytest-asyncio`, simply prepend `async` to your test functions.

```python
import pytest
import asyncio

async def fetch_data():
    await asyncio.sleep(0.1)
    return "data"

@pytest.mark.asyncio
async def test_fetch_data():
    result = await fetch_data()
    assert result == "data"
```

### Example 9: Async TestClient (`httpx.AsyncClient`)
For async endpoints, test with `httpx.AsyncClient`.

```python
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_async_endpoint():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/async-data")
    assert response.status_code == 200
```

---

## Testing LangChain/LLM Applications

When testing GenAI applications, mock the LLM wrapper or the underlying OpenAI API.

### Example 10: Mocking OpenAI API directly
```python
from unittest.mock import patch

@patch("openai.ChatCompletion.create")
def test_llm_chain(mock_create):
    # Mock the OpenAI response
    mock_create.return_value = {
        "choices": [{"message": {"content": "This is a mocked LLM response."}}]
    }
    
    # Call your LangChain code
    # result = my_langchain_app.run("Hello")
    
    # assert result == "This is a mocked LLM response."
    mock_create.assert_called_once()
```

### Example 11: Using LangChain's Fake LLM
LangChain provides `FakeListLLM` for easy testing.

```python
from langchain.llms.fake import FakeListLLM
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate

def test_fake_llm():
    fake_llm = FakeListLLM(responses=["I am a fake AI"])
    prompt = PromptTemplate(input_variables=["text"], template="Say {text}")
    chain = LLMChain(llm=fake_llm, prompt=prompt)
    
    response = chain.run("hello")
    assert response == "I am a fake AI"
```

---

## Best Practices and Anti-Patterns

**Best Practices:**
1. **AAA Pattern**: Arrange, Act, Assert. Keep these phases visually distinct in your tests.
2. **Use Fixtures**: Rely on `pytest` fixtures for setup/teardown instead of `setup_method()`.
3. **Parametrization**: Use `@pytest.mark.parametrize` to test multiple inputs without writing multiple test functions.

**Anti-Patterns:**
1. **Flaky Tests**: Tests that rely on `time.sleep()` or network requests. Always mock!
2. **Testing Implementation Details**: Test the behavior, not the exact implementation. Refactoring shouldn't break your tests.

---

## CI/CD Integration Example (GitHub Actions)

```yaml
name: Python Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    - name: Install dependencies
      run: pip install -r requirements.txt pytest pytest-cov
    - name: Run tests with coverage
      run: pytest --cov=app --cov-report=xml
```

---

## Practice Exercises
1. Write a test that parametrizes 5 different inputs for a data validation function.
2. Create a fixture that sets up an in-memory database and seeds it with 3 user records.
3. Write an E2E test for a FastAPI endpoint that uploads a file.
