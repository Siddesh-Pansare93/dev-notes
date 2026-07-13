# FastAPI Tests Mein External APIs Ka Mocking

> **Jest/Sinon se aa rahe ho?** Python ka `unittest.mock` Jest ki mocking system jaisa hi hai, bas thoda zyada explicit. `responses` library Node.js ke `nock` jaisi hai, aur `pytest-mock` sab kuch clean kar deta hai. Python mein mocking power aur simplicity dono hain!

---

## Contents

1. [Mocking Libraries: Quick Comparison](#mocking-libraries-quick-comparison)
2. [unittest.mock Basics](#unittestmock-basics)
3. [pytest-mock: The Better Way](#pytest-mock-the-better-way)
4. [Mocking HTTP Requests with httpx](#mocking-http-requests-with-httpx)
5. [Using responses Library](#using-responses-library)
6. [Mocking Database Connections](#mocking-database-connections)
7. [Mocking External Services (Redis, S3, etc.)](#mocking-external-services)
8. [Testing LangChain and OpenAI](#testing-langchain-and-openai)
9. [Advanced Mocking Patterns](#advanced-mocking-patterns)
10. [Common Pitfalls](#common-pitfalls)
11. [Practice Exercises](#practice-exercises)

---

## Mocking Libraries: Quick Comparison

Socho ek second — Jest aur Python dono ka approach kaafi similar hai. Dekho comparison:

| Feature | Jest (Node.js) | Python Equivalent |
|---|---|---|
| Basic mocking | `jest.fn()` | `unittest.mock.Mock()` or `mocker.Mock()` |
| Mock modules | `jest.mock('./module')` | `mocker.patch()` |
| Spy on methods | `jest.spyOn(obj, 'method')` | `mocker.spy()` or `mocker.patch.object()` |
| HTTP mocking | `nock` library | `responses` or `httpx_mock` |
| Return values | `mockFn.mockReturnValue(x)` | `mock.return_value = x` |
| Async mocks | `mockFn.mockResolvedValue(x)` | `mock.return_value = asyncio.coroutine(x)` |
| Assertions | `expect(mockFn).toHaveBeenCalled()` | `mock.assert_called()` |
| Call count | `expect(mockFn).toHaveBeenCalledTimes(2)` | `assert mock.call_count == 2` |

---

## unittest.mock Basics

### Installation

```bash
# unittest.mock Python mein built-in hai (koi install nahi)
# Lekin pytest-mock se aur achha experience milta hai:
pip install pytest-mock
```

### Example 1: Basic Mock Objects

Ek aam example — imagine karo tu ek external weather API se temperature fetch kar raha hai:

```python
# app/services.py
import httpx

def get_weather(city: str) -> dict:
    """Bahar se weather ka data nikaal le"""
    response = httpx.get(f"https://api.weather.com/v1/current?city={city}")
    response.raise_for_status()
    return response.json()

def get_temperature(city: str) -> float:
    """Sirf temperature nikaal"""
    weather = get_weather(city)
    return weather["temperature"]
```

Ab test likhte hain, lekin real API call nahi — mock kar denge:

```python
# tests/test_services_basic.py
from unittest.mock import Mock, patch
from app.services import get_temperature

def test_get_temperature_with_unittest_mock():
    """unittest.mock se test (thoda verbose, par samajhne mein aasan)"""
    
    # Ek fake response object bana de
    mock_response = Mock()
    mock_response.json.return_value = {
        "temperature": 72.5,
        "conditions": "sunny"
    }
    mock_response.raise_for_status.return_value = None
    
    # httpx.get ko replace kar de hamare mock se
    with patch('httpx.get', return_value=mock_response) as mock_get:
        result = get_temperature("San Francisco")
        
        # Check karo result sahi hai
        assert result == 72.5
        
        # Verify karo httpx.get correctly call hua
        mock_get.assert_called_once()
        call_args = mock_get.call_args[0][0]
        assert "San Francisco" in call_args

# Jest ke comparison mein
"""
// Jest version
jest.mock('axios');

test('get temperature', async () => {
  axios.get.mockResolvedValue({
    data: { temperature: 72.5, conditions: 'sunny' }
  });
  
  const result = await getTemperature('San Francisco');
  expect(result).toBe(72.5);
  expect(axios.get).toHaveBeenCalledWith(
    expect.stringContaining('San Francisco')
  );
});
"""
```

### Example 2: Mock with Side Effects

Kya hota hai jab same function ko bar bar call karte ho, aur har baar different value return kare? Side effects use kar:

```python
from unittest.mock import Mock

def test_mock_side_effects():
    """Side effects se sequential calls handle kar"""
    
    # Ek mock jo har call par different value return kare
    mock_func = Mock(side_effect=[1, 2, 3])
    
    assert mock_func() == 1
    assert mock_func() == 2
    assert mock_func() == 3

def test_mock_exception():
    """Exception ko mock kar"""
    
    mock_func = Mock(side_effect=ValueError("Invalid input"))
    
    with pytest.raises(ValueError, match="Invalid input"):
        mock_func()
```

---

## pytest-mock: The Better Way

**pytest-mock** se `mocker` fixture milta hai jo `unittest.mock` se kaafi cleaner hai. Jaise Swiggy ka interface simple hai, yeh bhi utna hi clean:

### Example 3: Using pytest-mock

```python
# tests/test_services_pytest_mock.py
import pytest
from app.services import get_temperature

def test_get_temperature_with_mocker(mocker):
    """pytest-mock se (clean aur simple)"""
    
    # Mock response bana le
    mock_response = mocker.Mock()
    mock_response.json.return_value = {
        "temperature": 68.0,
        "conditions": "cloudy"
    }
    
    # httpx.get ko patch kar de
    mock_get = mocker.patch('httpx.get', return_value=mock_response)
    
    result = get_temperature("New York")
    
    assert result == 68.0
    mock_get.assert_called_once()

def test_get_temperature_error_handling(mocker):
    """Error handling test"""
    
    # Mock httpx.get ko error throw karane ke liye set kar
    mocker.patch('httpx.get', side_effect=httpx.HTTPError("API Error"))
    
    with pytest.raises(httpx.HTTPError):
        get_temperature("Invalid City")

def test_mock_return_value_changes(mocker):
    """Return value ko test ke dauran change kar"""
    
    mock_response = mocker.Mock()
    mock_get = mocker.patch('httpx.get', return_value=mock_response)
    
    # Pehla call 70 degree return kare
    mock_response.json.return_value = {"temperature": 70}
    assert get_temperature("City1") == 70
    
    # Dusra call 80 degree return kare
    mock_response.json.return_value = {"temperature": 80}
    assert get_temperature("City2") == 80
    
    assert mock_get.call_count == 2
```

### Example 4: Spying on Methods

Kabhi kabhi tu check karna hota hai ki ek function ke andar kaunse dusre functions call ho rahe hain. Spy use kar:

```python
# app/calculator.py
class Calculator:
    def add(self, a: int, b: int) -> int:
        return a + b
    
    def multiply(self, a: int, b: int) -> int:
        """Multiply ke andar add() use hota hai"""
        result = 0
        for _ in range(b):
            result = self.add(result, a)
        return result

# tests/test_calculator_spy.py
def test_multiply_uses_add(mocker):
    """Check karo multiply ke andar add() kitni baar call hua"""
    
    calc = Calculator()
    
    # Spy lagaa de add method par (real method chalti rahegi)
    spy_add = mocker.spy(calc, 'add')
    
    result = calc.multiply(3, 4)
    
    assert result == 12
    # Verify karo add 4 baar call hua
    assert spy_add.call_count == 4

def test_multiply_with_mocked_add(mocker):
    """Multiply ko test kar completely mocked add ke sath"""
    
    calc = Calculator()
    
    # Add ko completely mock kar de
    mocker.patch.object(calc, 'add', return_value=100)
    
    result = calc.multiply(3, 4)
    
    # Ab har add call 100 return karega
    assert result == 100
```

---

## Mocking HTTP Requests with httpx

### Example 5: Mocking FastAPI Dependencies that Call External APIs

Ek realistic scenario — imagine karo Zomato jaisa app hai, aur tu currency converter build kar raha hai:

```python
# app/main.py
from fastapi import FastAPI, HTTPException, Depends
import httpx

app = FastAPI()

async def get_exchange_rate(from_currency: str, to_currency: str) -> float:
    """External API se exchange rate nikaal"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://api.exchangerate.com/v1/latest?base={from_currency}"
        )
        if response.status_code != 200:
            raise HTTPException(status_code=503, detail="Exchange rate service unavailable")
        
        data = response.json()
        return data["rates"][to_currency]

@app.get("/convert/")
async def convert_currency(
    amount: float,
    from_curr: str,
    to_curr: str,
    rate: float = Depends(get_exchange_rate)
):
    """Currency convert kar external rate se"""
    converted = amount * rate
    return {
        "original_amount": amount,
        "original_currency": from_curr,
        "converted_amount": round(converted, 2),
        "converted_currency": to_curr,
        "rate": rate
    }
```

Ab test likhte hain:

```python
# tests/test_currency.py
import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock
import httpx

from app.main import app, get_exchange_rate

client = TestClient(app)

def test_convert_currency_with_dependency_override():
    """Dependency ko override karke test kar"""
    
    # Mock dependency jo fixed rate return kare
    async def mock_exchange_rate(from_currency: str, to_currency: str):
        return 1.2  # 1 USD = 1.2 EUR
    
    app.dependency_overrides[get_exchange_rate] = mock_exchange_rate
    
    try:
        response = client.get("/convert/?amount=100&from_curr=USD&to_curr=EUR")
        
        assert response.status_code == 200
        data = response.json()
        assert data["converted_amount"] == 120.0
        assert data["rate"] == 1.2
    finally:
        app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_get_exchange_rate_with_mock(mocker):
    """Exchange rate function ko directly mock karke test kar"""
    
    # Mock response bana
    mock_response = mocker.Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "rates": {
            "EUR": 0.85,
            "GBP": 0.73,
            "JPY": 110.5
        }
    }
    
    # Mock async context manager
    mock_client = mocker.Mock()
    mock_client.get = AsyncMock(return_value=mock_response)
    
    # AsyncClient ko patch kar
    mocker.patch('httpx.AsyncClient', return_value=mock_client)
    
    rate = await get_exchange_rate("USD", "EUR")
    
    assert rate == 0.85

@pytest.mark.asyncio
async def test_get_exchange_rate_error_handling(mocker):
    """API error handling test"""
    
    # Error response mock kar
    mock_response = mocker.Mock()
    mock_response.status_code = 500
    
    mock_client = mocker.Mock()
    mock_client.get = AsyncMock(return_value=mock_response)
    
    mocker.patch('httpx.AsyncClient', return_value=mock_client)
    
    # HTTPException throw hona chahiye
    with pytest.raises(HTTPException) as exc_info:
        await get_exchange_rate("USD", "EUR")
    
    assert exc_info.value.status_code == 503
```

---

## Using responses Library

`responses` library Node.js ke `nock` jaisa kaam karta hai — HTTP requests ko cleanly mock karte ho:

### Installation

```bash
pip install responses
```

### Example 6: Using responses for HTTP Mocking

```python
# app/github.py
import httpx

def get_github_user(username: str) -> dict:
    """GitHub se user info fetch kar"""
    response = httpx.get(f"https://api.github.com/users/{username}")
    response.raise_for_status()
    return response.json()

def get_user_repos_count(username: str) -> int:
    """Public repos count nikaal"""
    user_data = get_github_user(username)
    return user_data["public_repos"]
```

Ab responses library se test likhte hain:

```python
# tests/test_github.py
import responses
import httpx
from app.github import get_github_user, get_user_repos_count

@responses.activate
def test_get_github_user():
    """GitHub API ko mock karke test"""
    
    # GitHub API endpoint ko mock kar
    responses.add(
        responses.GET,
        "https://api.github.com/users/octocat",
        json={
            "login": "octocat",
            "id": 1,
            "name": "The Octocat",
            "public_repos": 8,
            "followers": 1000
        },
        status=200
    )
    
    user = get_github_user("octocat")
    
    assert user["login"] == "octocat"
    assert user["public_repos"] == 8
    assert len(responses.calls) == 1

@responses.activate
def test_get_user_repos_count():
    """Repo count test"""
    
    responses.add(
        responses.GET,
        "https://api.github.com/users/octocat",
        json={"public_repos": 42},
        status=200
    )
    
    count = get_user_repos_count("octocat")
    assert count == 42

@responses.activate
def test_github_user_not_found():
    """404 error handling"""
    
    responses.add(
        responses.GET,
        "https://api.github.com/users/nonexistent",
        json={"message": "Not Found"},
        status=404
    )
    
    with pytest.raises(httpx.HTTPStatusError):
        get_github_user("nonexistent")

@responses.activate
def test_multiple_api_calls():
    """Multiple API calls ka test"""
    
    # Multiple mocked responses add kar
    responses.add(
        responses.GET,
        "https://api.github.com/users/user1",
        json={"login": "user1", "public_repos": 5}
    )
    responses.add(
        responses.GET,
        "https://api.github.com/users/user2",
        json={"login": "user2", "public_repos": 10}
    )
    
    user1 = get_github_user("user1")
    user2 = get_github_user("user2")
    
    assert user1["public_repos"] == 5
    assert user2["public_repos"] == 10
    assert len(responses.calls) == 2

# Dynamic response ke sath
@responses.activate
def test_dynamic_response():
    """Request ke basis par dynamic response"""
    
    def request_callback(request):
        # URL se username nikaal
        username = request.url.split('/')[-1]
        
        if username == "admin":
            return (200, {}, json.dumps({"login": username, "public_repos": 100}))
        else:
            return (200, {}, json.dumps({"login": username, "public_repos": 5}))
    
    responses.add_callback(
        responses.GET,
        re.compile(r'https://api\.github\.com/users/.*'),
        callback=request_callback,
        content_type='application/json',
    )
    
    admin = get_github_user("admin")
    regular = get_github_user("regular")
    
    assert admin["public_repos"] == 100
    assert regular["public_repos"] == 5
```

---

## Mocking Database Connections

### Example 7: Mocking SQLAlchemy

Database ko mock karna zaruri hota hai kyunki har test mein real database hit karna costly aur slow hota hai:

```python
# app/database.py
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)

DATABASE_URL = "postgresql://user:pass@localhost/dbname"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# app/crud.py
from sqlalchemy.orm import Session
from app.database import User

def create_user(db: Session, username: str, email: str) -> User:
    """Naya user create kar"""
    user = User(username=username, email=email)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.query(User).filter(User.id == user_id).first()

def get_all_users(db: Session) -> list[User]:
    return db.query(User).all()
```

Test likhte hain:

```python
# tests/test_database_mocking.py
import pytest
from unittest.mock import MagicMock
from app.crud import create_user, get_user_by_id, get_all_users
from app.database import User

def test_create_user_with_mock_db(mocker):
    """Completely mocked database ke sath user create"""
    
    # Mock database session bana
    mock_db = MagicMock()
    
    # Mock User object jo return hona chahiye
    mock_user = User(id=1, username="testuser", email="test@example.com")
    
    result = create_user(mock_db, "testuser", "test@example.com")
    
    # Verify database methods call hue
    assert mock_db.add.called
    assert mock_db.commit.called
    assert mock_db.refresh.called

def test_get_user_by_id_with_mock(mocker):
    """Mocked query ke sath user fetch"""
    
    mock_db = MagicMock()
    
    # Mock query chain: db.query().filter().first()
    mock_user = User(id=1, username="john", email="john@example.com")
    mock_db.query.return_value.filter.return_value.first.return_value = mock_user
    
    result = get_user_by_id(mock_db, 1)
    
    assert result == mock_user
    assert result.username == "john"
    
    # Verify query User model ke sath call hua
    mock_db.query.assert_called_once_with(User)

def test_get_user_not_found(mocker):
    """Non-existent user None return kare"""
    
    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.first.return_value = None
    
    result = get_user_by_id(mock_db, 999)
    
    assert result is None

def test_get_all_users(mocker):
    """Sab users get kar"""
    
    mock_db = MagicMock()
    
    mock_users = [
        User(id=1, username="user1", email="user1@example.com"),
        User(id=2, username="user2", email="user2@example.com"),
        User(id=3, username="user3", email="user3@example.com"),
    ]
    
    mock_db.query.return_value.all.return_value = mock_users
    
    result = get_all_users(mock_db)
    
    assert len(result) == 3
    assert result[0].username == "user1"
```

> [!tip] **Better Approach:** Integration tests ke liye SQLite in-memory database use kar. Zyada realistic testing hoti hai!

---

## Mocking External Services

### Example 8: Mocking Redis

Redis caching har production app mein use hota hai. Test ke liye mock karle:

```python
# app/cache.py
import redis
import json

redis_client = redis.Redis(host='localhost', port=6379, db=0)

def cache_user(user_id: int, user_data: dict, ttl: int = 3600):
    """User data ko Redis mein cache kar"""
    key = f"user:{user_id}"
    redis_client.setex(key, ttl, json.dumps(user_data))

def get_cached_user(user_id: int) -> dict | None:
    """Cache se user data nikaal"""
    key = f"user:{user_id}"
    data = redis_client.get(key)
    return json.loads(data) if data else None
```

```python
# tests/test_cache.py
import pytest
from unittest.mock import MagicMock
from app.cache import cache_user, get_cached_user

@pytest.fixture
def mock_redis(mocker):
    """Redis client ko mock karne ka fixture"""
    mock = MagicMock()
    mocker.patch('app.cache.redis_client', mock)
    return mock

def test_cache_user(mock_redis):
    """User data caching test"""
    user_data = {"username": "john", "email": "john@example.com"}
    
    cache_user(1, user_data)
    
    # Verify setex correct arguments ke sath call hua
    mock_redis.setex.assert_called_once()
    args = mock_redis.setex.call_args[0]
    assert args[0] == "user:1"
    assert args[1] == 3600  # TTL
    assert "john" in args[2]  # JSON string mein username ho

def test_get_cached_user_exists(mock_redis):
    """Cache se user jab exist kare"""
    import json
    
    cached_data = json.dumps({"username": "jane", "email": "jane@example.com"})
    mock_redis.get.return_value = cached_data
    
    result = get_cached_user(1)
    
    assert result["username"] == "jane"
    mock_redis.get.assert_called_once_with("user:1")

def test_get_cached_user_not_exists(mock_redis):
    """Cache se user jab exist naa kare"""
    mock_redis.get.return_value = None
    
    result = get_cached_user(999)
    
    assert result is None
```

### Example 9: Mocking AWS S3

S3 ke liye real API call karna expensive hai (billing bhi hoti hai!). Mock kar de:

```python
# app/storage.py
import boto3
from botocore.exceptions import ClientError

s3_client = boto3.client('s3')

def upload_file(file_data: bytes, bucket: str, key: str) -> str:
    """S3 mein file upload kar"""
    try:
        s3_client.put_object(Bucket=bucket, Key=key, Body=file_data)
        return f"https://{bucket}.s3.amazonaws.com/{key}"
    except ClientError as e:
        raise Exception(f"Failed to upload: {e}")

def download_file(bucket: str, key: str) -> bytes:
    """S3 se file download kar"""
    response = s3_client.get_object(Bucket=bucket, Key=key)
    return response['Body'].read()
```

```python
# tests/test_storage.py
import pytest
from unittest.mock import MagicMock
from botocore.exceptions import ClientError
from app.storage import upload_file, download_file

@pytest.fixture
def mock_s3(mocker):
    """S3 client ko mock karne ka fixture"""
    mock = MagicMock()
    mocker.patch('app.storage.s3_client', mock)
    return mock

def test_upload_file_success(mock_s3):
    """Successful file upload"""
    file_data = b"Hello, World!"
    
    url = upload_file(file_data, "my-bucket", "file.txt")
    
    assert url == "https://my-bucket.s3.amazonaws.com/file.txt"
    mock_s3.put_object.assert_called_once_with(
        Bucket="my-bucket",
        Key="file.txt",
        Body=file_data
    )

def test_upload_file_error(mock_s3):
    """Upload mein error handling"""
    mock_s3.put_object.side_effect = ClientError(
        {'Error': {'Code': 'AccessDenied'}},
        'PutObject'
    )
    
    with pytest.raises(Exception, match="Failed to upload"):
        upload_file(b"data", "my-bucket", "file.txt")

def test_download_file(mock_s3):
    """S3 se file download"""
    # Response object ko mock kar
    mock_response = {
        'Body': MagicMock()
    }
    mock_response['Body'].read.return_value = b"File contents"
    mock_s3.get_object.return_value = mock_response
    
    result = download_file("my-bucket", "file.txt")
    
    assert result == b"File contents"
    mock_s3.get_object.assert_called_once_with(
        Bucket="my-bucket",
        Key="file.txt"
    )
```

> [!info] **Pro Tip:** AWS services ke liye `moto` library use kar zyada realistic mocking ke liye!

---

## Testing LangChain and OpenAI

AI features ab sab apps mein hain. OpenAI aur LangChain ko mock karna seekh le:

### Example 10: Mocking OpenAI API Calls

```python
# app/ai.py
from openai import OpenAI
from typing import List

client = OpenAI(api_key="your-api-key")

def generate_completion(prompt: str, max_tokens: int = 100) -> str:
    """OpenAI se text completion generate kar"""
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=max_tokens
    )
    return response.choices[0].message.content

def generate_embeddings(texts: List[str]) -> List[List[float]]:
    """Texts ke embeddings generate kar"""
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=texts
    )
    return [embedding.embedding for embedding in response.data]
```

```python
# tests/test_ai.py
import pytest
from unittest.mock import MagicMock, Mock
from app.ai import generate_completion, generate_embeddings

@pytest.fixture
def mock_openai_client(mocker):
    """OpenAI client ko mock kar"""
    mock_client = MagicMock()
    mocker.patch('app.ai.client', mock_client)
    return mock_client

def test_generate_completion(mock_openai_client):
    """Text completion generation"""
    
    # Response structure ko mock kar
    mock_response = Mock()
    mock_response.choices = [Mock()]
    mock_response.choices[0].message.content = "This is the AI response"
    
    mock_openai_client.chat.completions.create.return_value = mock_response
    
    result = generate_completion("Hello, AI!")
    
    assert result == "This is the AI response"
    
    # Verify API correctly call hua
    mock_openai_client.chat.completions.create.assert_called_once_with(
        model="gpt-4",
        messages=[{"role": "user", "content": "Hello, AI!"}],
        max_tokens=100
    )

def test_generate_embeddings(mock_openai_client):
    """Embeddings generation"""
    
    # Embeddings response ko mock kar
    mock_response = Mock()
    mock_response.data = [
        Mock(embedding=[0.1, 0.2, 0.3]),
        Mock(embedding=[0.4, 0.5, 0.6])
    ]
    
    mock_openai_client.embeddings.create.return_value = mock_response
    
    result = generate_embeddings(["text1", "text2"])
    
    assert len(result) == 2
    assert result[0] == [0.1, 0.2, 0.3]
    assert result[1] == [0.4, 0.5, 0.6]

def test_generate_completion_with_error(mock_openai_client):
    """OpenAI API error handling"""
    from openai import APIError
    
    mock_openai_client.chat.completions.create.side_effect = APIError("API Error")
    
    with pytest.raises(APIError):
        generate_completion("Test prompt")
```

### Example 11: Mocking LangChain

LangChain chains ko mock karna straightforward hai:

```python
# app/langchain_app.py
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

def create_chat_chain():
    """Simple chat chain banaa"""
    llm = ChatOpenAI(model="gpt-4")
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a helpful assistant."),
        ("user", "{input}")
    ])
    output_parser = StrOutputParser()
    
    chain = prompt | llm | output_parser
    return chain

def ask_question(question: str) -> str:
    """LangChain se question pooch"""
    chain = create_chat_chain()
    return chain.invoke({"input": question})
```

```python
# tests/test_langchain.py
import pytest
from unittest.mock import Mock, MagicMock
from app.langchain_app import ask_question, create_chat_chain

def test_ask_question(mocker):
    """LangChain question answering"""
    
    # Pura chain mock kar de
    mock_chain = MagicMock()
    mock_chain.invoke.return_value = "Mocked AI response"
    
    # create_chat_chain ko override kar
    mocker.patch('app.langchain_app.create_chat_chain', return_value=mock_chain)
    
    result = ask_question("What is Python?")
    
    assert result == "Mocked AI response"
    mock_chain.invoke.assert_called_once_with({"input": "What is Python?"})

def test_create_chat_chain_with_mock_llm(mocker):
    """Chain creation with mocked LLM"""
    
    # ChatOpenAI ko mock kar
    mock_llm = MagicMock()
    mocker.patch('app.langchain_app.ChatOpenAI', return_value=mock_llm)
    
    chain = create_chat_chain()
    
    # Verify LLM correctly instantiate hua
    from app.langchain_app import ChatOpenAI
    ChatOpenAI.assert_called_once_with(model="gpt-4")
```

> [!tip] **Pro Tip:** LangChain ke liye `FakeListLLM` use kar testing mein:

```python
from langchain_community.llms.fake import FakeListLLM

def test_with_fake_llm():
    """FakeListLLM se simple testing"""
    fake_llm = FakeListLLM(responses=["Response 1", "Response 2"])
    
    # Chain mein fake_llm use kar
    result1 = fake_llm.invoke("Question 1")
    result2 = fake_llm.invoke("Question 2")
    
    assert result1 == "Response 1"
    assert result2 == "Response 2"
```

---

## Advanced Mocking Patterns

### Pattern 1: Context Manager Mocking

File operations ko test karte waqt real files nahi chahiye:

```python
# app/file_handler.py
def process_file(filename: str) -> str:
    """File ko read aur process kar"""
    with open(filename, 'r') as f:
        content = f.read()
    return content.upper()

# tests/test_file_handler.py
def test_process_file(mocker):
    """File processing ko mock open() se"""
    
    # Built-in open function ko mock kar
    mock_open = mocker.mock_open(read_data="hello world")
    mocker.patch('builtins.open', mock_open)
    
    result = process_file("test.txt")
    
    assert result == "HELLO WORLD"
    mock_open.assert_called_once_with("test.txt", 'r')
```

### Pattern 2: Mocking Environment Variables

App configuration environment variables se aate hain. Test mein mock kar le:

```python
# app/config.py
import os

def get_database_url() -> str:
    return os.getenv("DATABASE_URL", "sqlite:///default.db")

# tests/test_config.py
def test_get_database_url_from_env(mocker):
    """Environment variable se database URL"""
    mocker.patch.dict(os.environ, {"DATABASE_URL": "postgresql://test"})
    
    url = get_database_url()
    assert url == "postgresql://test"

def test_get_database_url_default(mocker):
    """Default value jab env var naa ho"""
    mocker.patch.dict(os.environ, {}, clear=True)
    
    url = get_database_url()
    assert url == "sqlite:///default.db"
```

### Pattern 3: Mocking Datetime

Time-sensitive tests mein specific datetime fix kar de:

```python
# app/time_utils.py
from datetime import datetime

def get_current_timestamp() -> str:
    return datetime.now().isoformat()

def is_business_hours() -> bool:
    now = datetime.now()
    return 9 <= now.hour < 17

# tests/test_time_utils.py
from datetime import datetime

def test_get_current_timestamp(mocker):
    """Fixed datetime ke sath test"""
    fixed_time = datetime(2024, 1, 15, 12, 30, 0)
    mocker.patch('app.time_utils.datetime')
    app.time_utils.datetime.now.return_value = fixed_time
    
    result = get_current_timestamp()
    assert "2024-01-15T12:30:00" in result

def test_is_business_hours(mocker):
    """Business hours check"""
    # Business hours mein
    mocker.patch('app.time_utils.datetime')
    app.time_utils.datetime.now.return_value = datetime(2024, 1, 15, 14, 0)
    assert is_business_hours() is True
    
    # Business hours se bahar
    app.time_utils.datetime.now.return_value = datetime(2024, 1, 15, 20, 0)
    assert is_business_hours() is False
```

---

## Common Pitfalls

### Pitfall 1: Galat Jagah Patch Karna

```python
# app/calculator.py
from math import sqrt

def calculate_hypotenuse(a, b):
    return sqrt(a**2 + b**2)

# GALAT: math.sqrt ko patch karna
def test_wrong_patch(mocker):
    mocker.patch('math.sqrt', return_value=5)  # ❌ Kaam nahi karega!
    result = calculate_hypotenuse(3, 4)
    # sqrt imported hai, math.sqrt nahi

# SAHI: Jahan use ho rahe ho vahan patch kar
def test_correct_patch(mocker):
    mocker.patch('app.calculator.sqrt', return_value=5)  # ✅ Sahi hai!
    result = calculate_hypotenuse(3, 4)
    assert result == 5
```

> [!warning] **Important Rule:** Patch kar jahan function use ho rahe ho, jahan define ho rahe ho nahi!

### Pitfall 2: Mock Cleanup Naa Karna

```python
# GALAT: Mock tests ke baad persist rehta hai
def test_first(mocker):
    mocker.patch('app.service.api_call', return_value="mocked")
    # Mock test ke baad bhi active rahta hai!

def test_second():
    # Yeh test unexpected behavior kar sakta hai!
    pass

# SAHI: pytest-mock auto-cleanup karta hai
def test_first(mocker):  # mocker fixture auto-clean karta hai
    mocker.patch('app.service.api_call', return_value="mocked")

# Ya context manager use kar
def test_manual_cleanup():
    with patch('app.service.api_call', return_value="mocked"):
        # Mock sirf is block mein active hai
        pass
```

### Best Practice: Mock Calls Verify Karna

```python
def test_verify_mock_calls(mocker):
    """Hamesha verify kar mock correctly call hua"""
    mock_api = mocker.patch('app.service.external_api')
    mock_api.return_value = {"status": "ok"}
    
    result = app.service.process_data("input")
    
    # Verify mock call hua
    mock_api.assert_called_once()
    
    # Verify call arguments
    mock_api.assert_called_with("input")
    
    # Ya flexible matching
    assert mock_api.call_count == 1
    assert "input" in str(mock_api.call_args)
```

---

## Practice Exercises

### Exercise 1: Weather API Mock Karna

```python
# TODO: Ek weather service banao jo:
# - External API se weather fetch kare
# - Results ko Redis mein cache kare
# - API errors gracefully handle kare

# TODO: Tests likhna:
# - External API call ko mock kar
# - Redis caching ko mock kar
# - Error handling test kar
# - Verify cache use ho rahe ho
```

### Exercise 2: Email Sending Mock Karna

```python
# TODO: SMTP use karke email service banao
# TODO: SMTP connection ko mock kar
# TODO: Verify emails correct content ke sath send ho
# TODO: Error handling test kar (connection failures, etc.)
```

### Exercise 3: Complex Database Queries Mock Karna

```python
# TODO: SQLAlchemy joins ke sath functions banao
# TODO: Database queries ko mock kar
# TODO: Different query results test kar (empty, single, multiple)
# TODO: Transaction rollback on errors test kar
```

### Exercise 4: OpenAI Streaming Mock Karna

```python
# TODO: OpenAI streaming use karne wala function banao
# TODO: Streaming response ko mock kar
# TODO: Partial updates test kar
# TODO: Streaming errors handle kar
```

---

## Key Takeaways

✅ `unittest.mock` aur `pytest-mock` se basic mocking kar  
✅ `responses` library se HTTP requests mock kar  
✅ Databases, Redis, aur AWS services ko mock kar  
✅ OpenAI aur LangChain ko mock kar  
✅ Advanced patterns: datetime, environment variables, context managers  
✅ Common pitfalls avoid kar aur best practices follow kar

**Yaad rakh:** External dependencies ko mock karke tests fast, reliable, aur deterministic ban jaate hain. Hamesha patch kar jahan use ho rahe ho, jahan define ho rahe ho nahi!

**Next Tutorial:** Real test databases ke sath database testing strategies
