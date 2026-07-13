# Python Testing Deep Dive

Testing likha hai toh code likha hai — agar tumne test nahin likhe, toh matlab tumne production mein bug bheja. Yeh comprehensive guide modern Python applications ke liye testing strategies ko cover karta hai, FastAPI, pytest, mocking, database strategies, aur LLM/LangChain applications ko test karne ka tarika sikhata hai.

## Kyun Zaroori Hai Testing?

Socho ek Swiggy delivery partner ko — kya woh bas bhaag ke saman ghar bhej deta hai bina check kiye? Nahi na. Pehle confirm karta hai phone number sahi hai, delivery address correct hai, aur order complete hai. Wohi testing hoti hai code mein.

## Kya Seekhoge Idhar?

- **End-to-End (E2E) Testing** — FastAPI TestClient se pura app test karo bina server run kiye
- **Advanced Mocking** — external APIs, databases, aur LLMs ko fake karo
- **Async Testing** — asynchronous Python code ko properly test karo
- **Coverage Reporting** — dekho ki tumhara code kitna covered hai

## Setup Instructions

Pehle zaruri testing libraries install kar:

```bash
pip install pytest pytest-asyncio pytest-cov httpx respx responses fastapi[all] sqlalchemy
```

Ab apne project root mein `pytest.ini` file banao:

```ini
[pytest]
asyncio_mode = auto
testpaths = tests
python_files = test_*.py
addopts = -v --cov=app --cov-report=term-missing
```

---

## E2E Testing with FastAPI TestClient

FastAPI ka `TestClient` `httpx` use karta hai background mein. Iska faida yeh hai ki bina actual server chalaye poora app test kar sakte ho. Jaise IRCTC app mein ticket book karne se pehle simulation run hota hai — wohi concept.

### Example 1: Basic Endpoint Test

Sabse simple example — ek health check endpoint.

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

Ab ek thoda complex scenario — user create karna aur validate karna ki sab sahi hai.

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

Jab authentication chahiye toh kya karenge? Fake user banate ho taki test quickly chal jaye.

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

Jab tumhara app kisi external service ko call karta hai (jaise Twitter API, GitHub API), tab woh call mock kar dete ho. Kyun? Kyunki:

1. **Speed** — Real API call 2 seconds lage, mock sirf milliseconds mein respond kare
2. **Reliability** — GitHub/Twitter down ho toh bhi tumhara test pass rahe
3. **Rate Limiting** — API quotas waste na ho

### Example 4: Mocking HTTPX with `respx`

`respx` use karke HTTPX calls ko intercept karte ho.

```python
import httpx
import respx

@respx.mock
def test_external_api_call():
    # Arrange - mock setup
    respx.get("https://api.github.com/users/octocat").mock(
        return_value=httpx.Response(200, json={"login": "octocat"})
    )
    
    # Act - actual call
    response = httpx.get("https://api.github.com/users/octocat")
    
    # Assert - verification
    assert response.status_code == 200
    assert response.json()["login"] == "octocat"
```

### Example 5: Mocking with `responses` library

Alternative approach — `responses` library se `requests` library ko mock kar sakte ho.

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

Kabhi production database se testing mat karo. Bhandvi ke dabbare mein apna test maal rakho — separate hi rakho. SQLite in-memory ya dedicated test Postgres container use karo.

### Example 6: Pytest Fixtures for Test Database

Fixture banate ho jo test ke liye fresh database setup karega, aur test ke baad clean kar dega.

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
    Base.metadata.create_all(bind=engine)  # tabla banao
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)  # saab clean kar do

def test_db_insert(db_session):
    # Test apna database logic chalao
    assert True
```

### Example 7: Overriding DB Dependency in FastAPI

FastAPI app ko bata do ki test ke time yeh fake database use kar.

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

Async functions ko test karna thoda different hota hai. Python ko pata chahiye ki test bhi async hai.

### Example 8: Async Pytest Setup

`pytest-asyncio` install hone ke baad, test function ko `async` banao:

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

Async endpoints ke liye `httpx.AsyncClient` use karo:

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

GenAI apps mein OpenAI API calls hoti hain. Hreal API call mat karo test mein, mock kar do. Kyun? Kyunki:

1. **Expensive** — har test run mein paise chale jayenge
2. **Slow** — OpenAI ko response dene mein time lagta hai
3. **Non-deterministic** — LLM ka response kabhi different generate kar sakta hai

### Example 10: Mocking OpenAI API directly

`unittest.mock` use karke OpenAI response ko fake karo:

```python
from unittest.mock import patch

@patch("openai.ChatCompletion.create")
def test_llm_chain(mock_create):
    # Mock setup - OpenAI response ko fake karo
    mock_create.return_value = {
        "choices": [{"message": {"content": "This is a mocked LLM response."}}]
    }
    
    # Call apna LangChain app
    # result = my_langchain_app.run("Hello")
    
    # Verify
    # assert result == "This is a mocked LLM response."
    mock_create.assert_called_once()
```

### Example 11: Using LangChain's Fake LLM

LangChain khud `FakeListLLM` provide karta hai testing ke liye:

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

## Best Practices Aur Anti-Patterns

### Best Practices:

1. **AAA Pattern** — Arrange (setup), Act (chalao), Assert (verify). Code mein clear sections banao.
   
2. **Fixtures Use Karo** — `setup_method()` ke bajaye pytest fixtures use karo. Cleaner hota hai.

3. **Parametrization** — ek hi test ko multiple inputs ke saath run karo `@pytest.mark.parametrize` se.

### Anti-Patterns (Avoid Karo):

1. **Flaky Tests** — `time.sleep()` use karna ya network requests karna. Hamesha mock karo!

2. **Implementation Details Test Karna** — Behavior test karo, exact implementation nahi. Agar refactoring karo toh test break na ho.

> [!warning]
> Flaky tests ko debugging karna bohot frustrating hota hai. Agar ek bar test pass kare aur doosri bar fail ho, toh zaroor mock kho gaye hoge kisi jagah.

---

## CI/CD Integration Example (GitHub Actions)

Github pe push karte ho toh automatically tests chalein:

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

1. **Parametrized Test** — Ek data validation function ke liye parametrize test likho jo 5 different inputs test kare.

2. **Database Fixture** — In-memory database setup karne wala fixture banao aur 3 user records se seed karo.

3. **File Upload E2E Test** — FastAPI endpoint ke liye E2E test likho jo file upload kare aur response check kare.

---

## Key Takeaways

- **TestClient** - FastAPI apps ko without server test karo
- **Fixtures** - setup/teardown ko reusable banao
- **Mocking** - external APIs aur LLMs ko always fake karo
- **Async** - async code ke liye `@pytest.mark.asyncio` use karo
- **Coverage** - dekho ki kitna code tested hai
