# Python mein Async Testing — Socho Zomato Delivery Wale!

> **Node.js/TypeScript se aa rahe ho?** Node.js mein sab kuch async tha, to Jest mein sirf `await` karte the aur kaam thaak gaya. Python mein ye game alag hai — tumhe `pytest-asyncio` plugin aur decorators chahiye. Concepts same hain, bas ritual thoda zyada hai!

---

## Table of Contents

1. [Async: Node.js vs Python — Quick Recap](#async-recap)
2. [pytest-asyncio Setup Karna](#setting-up-pytest-asyncio)
3. [Async Tests Likho](#writing-async-tests)
4. [Async Fixtures — Chai Se Pehle Table Lagao](#async-fixtures)
5. [Async Generators Test Karna](#testing-async-generators)
6. [Async Functions Ko Mock Karna](#mocking-async-functions)
7. [aiohttp Se Testing](#testing-with-aiohttp)
8. [FastAPI Apps Ko Test Karna](#testing-fastapi-applications)
9. [Common Pitfalls aur Solutions](#common-patterns-and-pitfalls)
10. [Python vs Jest — Side by Side](#comparison-python-vs-jest)
11. [Practice Exercises](#practice-exercises)

---

## Async: Node.js vs Python — Quick Recap

| Concept | Node.js/TypeScript | Python |
|---|---|---|
| Event loop | Hamesha chalti rehti hai (libuv) | Manually start karni padti hai (`asyncio.run()`) |
| Async function | `async function foo()` | `async def foo()` |
| Await | `await promise` | `await coroutine` |
| Promise | `Promise<T>` | `Coroutine` / `Awaitable` |
| Promise.all | `Promise.all([...])` | `asyncio.gather(...)` |
| Streams | `ReadableStream` | `async for` / async generators |
| Sleep | `setTimeout` / `sleep()` | `asyncio.sleep()` |
| HTTP client | `fetch()` / `axios` | `aiohttp` / `httpx` |

**Farak kya hai?** Node.js mein event loop hamesha ON rehta hai. Python mein tum event loop manually banao aur manage karo. pytest-asyncio yeh sab sambal leta hai tests mein.

---

## pytest-asyncio Setup Karna

### Installation

```bash
pip install pytest-asyncio

# Extra packages jo zaroor aayenge:
pip install aiohttp    # Async HTTP client/server
pip install httpx      # Modern async HTTP (axios ki tarah)
```

### Configuration

```toml
# pyproject.toml
[tool.pytest.ini_options]
asyncio_mode = "auto"  # Sahi approach! Automatically async tests dhundo
# Dusre options:
# asyncio_mode = "strict"  # Har test par @pytest.mark.asyncio lagao manually
```

`asyncio_mode = "auto"` ke saath, koi bhi `async def test_*` function automatic async test ban jayega. `"strict"` mode mein manually har test par decorator lagana padega.

---

## Async Tests Likho

### Sabse Asan Async Test

```python
# asyncio_mode = "auto" ke saath (recommended)
import asyncio

async def fetch_data() -> dict:
    await asyncio.sleep(0.1)  # Network delay simulate karo
    return {"status": "ok", "data": [1, 2, 3]}

async def test_fetch_data():
    result = await fetch_data()
    assert result["status"] == "ok"
    assert len(result["data"]) == 3
```

```python
# asyncio_mode = "strict" ke saath (explicit marking)
import pytest

@pytest.mark.asyncio
async def test_fetch_data():
    result = await fetch_data()
    assert result["status"] == "ok"
```

Jest mein kaisa hota hai:
```typescript
// Jest: async bas chal jaata hai
test('fetch data', async () => {
    const result = await fetchData();
    expect(result.status).toBe('ok');
    expect(result.data).toHaveLength(3);
});
```

### Async Exceptions Handle Karna

```python
import pytest

async def divide_async(a: float, b: float) -> float:
    await asyncio.sleep(0)  # Async work simulate karo
    if b == 0:
        raise ValueError("Division by zero")
    return a / b

async def test_divide_by_zero():
    with pytest.raises(ValueError, match="Division by zero"):
        await divide_async(10, 0)

async def test_divide_success():
    result = await divide_async(10, 2)
    assert result == 5.0
```

### Concurrent Operations Test Karna

```python
import asyncio

async def fetch_user(user_id: int) -> dict:
    await asyncio.sleep(0.1)
    return {"id": user_id, "name": f"User {user_id}"}

async def test_concurrent_fetches():
    """Multiple concurrent async operations (Promise.all ki tarah)."""
    results = await asyncio.gather(
        fetch_user(1),
        fetch_user(2),
        fetch_user(3),
    )
    assert len(results) == 3
    assert results[0]["id"] == 1
    assert results[1]["id"] == 2
    assert results[2]["id"] == 3

async def test_concurrent_with_timeout():
    """Timeout ke saath test karo (Promise.race + timer ki tarah)."""
    async def slow_operation():
        await asyncio.sleep(10)
        return "done"

    with pytest.raises(asyncio.TimeoutError):
        await asyncio.wait_for(slow_operation(), timeout=0.1)
```

### Parametrize + Async Tests

```python
import pytest

@pytest.mark.parametrize("input_val, expected", [
    (1, 1),
    (2, 4),
    (3, 9),
])
async def test_async_square(input_val, expected):
    result = await async_square(input_val)
    assert result == expected
```

---

## Async Fixtures — Chai Se Pehle Table Lagao

### Basic Async Fixtures

```python
import pytest
import asyncio

@pytest.fixture
async def async_data():
    """Ek async fixture - andar await kar sakte ho."""
    await asyncio.sleep(0.01)  # Async setup simulate karo
    data = {"users": ["Alice", "Bob"], "count": 2}
    return data

async def test_has_users(async_data):
    assert len(async_data["users"]) == 2
    assert "Alice" in async_data["users"]
```

### Async Fixtures with Setup aur Teardown

```python
import pytest

@pytest.fixture
async def db_connection():
    """Async fixture — setup aur cleanup dono."""
    # Setup
    conn = await create_async_connection("test.db")
    await conn.execute("CREATE TABLE IF NOT EXISTS users (id INT, name TEXT)")

    yield conn  # Test ko de do

    # Teardown (test fail ho ya pass, chalega)
    await conn.execute("DROP TABLE users")
    await conn.close()

async def test_insert_user(db_connection):
    await db_connection.execute("INSERT INTO users VALUES (1, 'Alice')")
    rows = await db_connection.fetchall("SELECT * FROM users")
    assert len(rows) == 1
```

### Async Factory Fixtures

```python
@pytest.fixture
def make_async_client():
    """Factory jo async clients banata hai."""
    clients = []

    async def _make_client(base_url: str):
        import httpx
        client = httpx.AsyncClient(base_url=base_url)
        clients.append(client)
        return client

    yield _make_client

    # Cleanup sabhi clients ka
    # Note: Sync generator mein hain, async cleanup synchronously chahiye
    # Pragmatically, async factory fixtures usually differently handle hote hain

@pytest.fixture
async def http_client():
    """Simpler pattern: ek async client with cleanup."""
    import httpx
    async with httpx.AsyncClient() as client:
        yield client
    # Client automatically close hoga after yield
```

### Fixture Scopes + Async

```python
@pytest.fixture(scope="session")
async def database():
    """Session-scoped async fixture.
    Ek baar banegi, sabhi tests share karenge."""
    db = await AsyncDatabase.connect("postgresql://localhost/testdb")
    await db.migrate()
    yield db
    await db.close()

@pytest.fixture(scope="function")
async def clean_db(database):
    """Function-scoped: har test se pehle clean kar do."""
    yield database
    await database.execute("DELETE FROM users")
    await database.execute("DELETE FROM orders")
```

---

## Async Generators Test Karna

Python ke async generators, Node.js async iterables ki tarah hain.

```python
# src/stream.py
import asyncio
from typing import AsyncGenerator

async def number_stream(count: int) -> AsyncGenerator[int, None]:
    """Async generator jo numbers yield kare delay ke saath."""
    for i in range(count):
        await asyncio.sleep(0.01)
        yield i

async def filtered_stream(source: AsyncGenerator[int, None],
                           predicate) -> AsyncGenerator[int, None]:
    """Async stream ko filter karo."""
    async for item in source:
        if predicate(item):
            yield item
```

```python
# tests/test_stream.py

async def test_number_stream():
    results = []
    async for num in number_stream(5):
        results.append(num)
    assert results == [0, 1, 2, 3, 4]

async def test_number_stream_with_list_comprehension():
    results = [num async for num in number_stream(3)]
    assert results == [0, 1, 2]

async def test_filtered_stream():
    source = number_stream(10)
    even_numbers = filtered_stream(source, lambda x: x % 2 == 0)
    results = [num async for num in even_numbers]
    assert results == [0, 2, 4, 6, 8]

async def test_empty_stream():
    results = [num async for num in number_stream(0)]
    assert results == []
```

### Async Context Managers

```python
# src/resource.py
class AsyncResource:
    def __init__(self, name: str):
        self.name = name
        self.is_open = False

    async def __aenter__(self):
        await asyncio.sleep(0.01)  # Async setup simulate karo
        self.is_open = True
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await asyncio.sleep(0.01)  # Async cleanup simulate karo
        self.is_open = False
        return False

# Test:
async def test_async_context_manager():
    async with AsyncResource("test") as resource:
        assert resource.is_open is True
        assert resource.name == "test"
    # Context manager exit hone ke baad:
    assert resource.is_open is False
```

---

## Async Functions Ko Mock Karna

Python 3.8+ mein `unittest.mock` mein `AsyncMock` tha. Jest mein async mocking kaisa hota tha, yaad hai?

### Basic AsyncMock

```python
from unittest.mock import AsyncMock, patch

# Async mock banao (jest.fn() ki tarah async ke liye)
mock_fetch = AsyncMock(return_value={"status": "ok"})

async def test_async_mock():
    result = await mock_fetch("https://api.example.com")
    assert result == {"status": "ok"}
    mock_fetch.assert_called_once_with("https://api.example.com")
    mock_fetch.assert_awaited_once()  # Python-specific: verify await hua
```

Jest mein kaisa likha tha:
```typescript
const mockFetch = jest.fn().mockResolvedValue({ status: 'ok' });

test('async mock', async () => {
    const result = await mockFetch('https://api.example.com');
    expect(result).toEqual({ status: 'ok' });
    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com');
});
```

### AsyncMock with side_effect

```python
from unittest.mock import AsyncMock

# Return values ka sequence
mock_api = AsyncMock(side_effect=[
    {"page": 1, "data": [1, 2]},
    {"page": 2, "data": [3, 4]},
    {"page": 3, "data": []},  # Empty = last page
])

async def test_pagination():
    page1 = await mock_api()
    assert page1["data"] == [1, 2]
    page2 = await mock_api()
    assert page2["data"] == [3, 4]
    page3 = await mock_api()
    assert page3["data"] == []

# Async side_effect function
mock_transform = AsyncMock(side_effect=lambda x: x * 2)

async def test_transform():
    result = await mock_transform(21)
    assert result == 42

# Exceptions throw karna
mock_fail = AsyncMock(side_effect=ConnectionError("timeout"))

async def test_connection_failure():
    with pytest.raises(ConnectionError):
        await mock_fail()
```

### Async Functions Ko Patch Karna

```python
# src/user_service.py
import httpx

async def get_user_profile(user_id: int) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.get(f"https://api.example.com/users/{user_id}")
        return response.json()

async def get_user_with_repos(user_id: int) -> dict:
    profile = await get_user_profile(user_id)
    async with httpx.AsyncClient() as client:
        response = await client.get(f"https://api.example.com/users/{user_id}/repos")
        profile["repos"] = response.json()
    return profile
```

```python
# tests/test_user_service.py
from unittest.mock import AsyncMock, patch

@patch("src.user_service.get_user_profile", new_callable=AsyncMock)
async def test_get_user_with_repos(mock_profile):
    mock_profile.return_value = {"id": 1, "name": "Alice"}

    with patch("src.user_service.httpx.AsyncClient") as MockClient:
        mock_client_instance = AsyncMock()
        MockClient.return_value.__aenter__.return_value = mock_client_instance
        mock_client_instance.get.return_value.json.return_value = [
            {"name": "repo1"}, {"name": "repo2"}
        ]

        result = await get_user_with_repos(1)

    assert result["name"] == "Alice"
    assert len(result["repos"]) == 2
    mock_profile.assert_awaited_once_with(1)
```

### AsyncMock Assertions

```python
from unittest.mock import AsyncMock, call

mock = AsyncMock()
await mock(1)
await mock(2)
await mock(3)

# Standard Mock assertions sab chalte hain:
mock.assert_called()
mock.assert_called_with(3)
assert mock.call_count == 3

# Plus async-specific assertions:
mock.assert_awaited()                   # Kam se kam ek baar await hua
mock.assert_awaited_once()              # Exactly ek baar await hua -- FAIL karega (3 times)
mock.assert_awaited_with(3)             # Last await call mein ye arguments the
mock.assert_any_await(call(1))          # Any point par ye arguments await hua
assert mock.await_count == 3            # Total await calls
assert mock.await_args_list == [call(1), call(2), call(3)]
```

---

## aiohttp Se Testing

### aiohttp Test Utilities

```python
# src/app.py
from aiohttp import web

async def handle_hello(request: web.Request) -> web.Response:
    name = request.match_info.get("name", "World")
    return web.json_response({"message": f"Hello, {name}!"})

async def handle_create_user(request: web.Request) -> web.Response:
    data = await request.json()
    if "name" not in data:
        return web.json_response({"error": "name required"}, status=400)
    return web.json_response({"id": 1, "name": data["name"]}, status=201)

def create_app() -> web.Application:
    app = web.Application()
    app.router.add_get("/hello/{name}", handle_hello)
    app.router.add_post("/users", handle_create_user)
    return app
```

```python
# tests/test_app.py
import pytest
from aiohttp import web
from aiohttp.test_utils import AioHTTPTestCase, TestClient, TestServer

# Method 1: pytest-aiohttp use karo (recommended)
# pip install pytest-aiohttp

@pytest.fixture
def app():
    """Application banao."""
    from src.app import create_app
    return create_app()

@pytest.fixture
async def client(app, aiohttp_client):
    """Test client banao."""
    return await aiohttp_client(app)

async def test_hello(client):
    response = await client.get("/hello/Python")
    assert response.status == 200
    data = await response.json()
    assert data["message"] == "Hello, Python!"

async def test_create_user(client):
    response = await client.post("/users", json={"name": "Alice"})
    assert response.status == 201
    data = await response.json()
    assert data["name"] == "Alice"

async def test_create_user_missing_name(client):
    response = await client.post("/users", json={})
    assert response.status == 400
```

---

## FastAPI Apps Ko Test Karna

FastAPI, Express ki Python version hai aur async testing ka supporte bahut zyada best hai.

```python
# src/main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

class UserCreate(BaseModel):
    name: str
    email: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str

# In-memory "database"
users_db: dict[int, dict] = {}
next_id = 1

@app.get("/users/{user_id}")
async def get_user(user_id: int) -> UserResponse:
    if user_id not in users_db:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(id=user_id, **users_db[user_id])

@app.post("/users", status_code=201)
async def create_user(user: UserCreate) -> UserResponse:
    global next_id
    users_db[next_id] = {"name": user.name, "email": user.email}
    response = UserResponse(id=next_id, name=user.name, email=user.email)
    next_id += 1
    return response
```

```python
# tests/test_main.py
import pytest
from httpx import AsyncClient, ASGITransport
from src.main import app, users_db

@pytest.fixture(autouse=True)
def clear_db():
    """In-memory database ko har test se pehle clear karo."""
    users_db.clear()
    yield
    users_db.clear()

@pytest.fixture
async def client():
    """FastAPI ke liye async test client banao."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

async def test_create_user(client):
    response = await client.post(
        "/users",
        json={"name": "Alice", "email": "alice@test.com"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Alice"
    assert data["email"] == "alice@test.com"
    assert "id" in data

async def test_get_user(client):
    # Pehle ek user create karo
    create_response = await client.post(
        "/users",
        json={"name": "Bob", "email": "bob@test.com"}
    )
    user_id = create_response.json()["id"]

    # Ab user ko fetch karo
    response = await client.get(f"/users/{user_id}")
    assert response.status_code == 200
    assert response.json()["name"] == "Bob"

async def test_get_nonexistent_user(client):
    response = await client.get("/users/999")
    assert response.status_code == 404

async def test_create_user_validation(client):
    # Required field missing
    response = await client.post("/users", json={"name": "Alice"})
    assert response.status_code == 422  # Validation error
```

Express app ko supertest se test kaisa hota tha:
```typescript
// Jest + supertest for Express
import request from 'supertest';
import app from '../src/app';

test('create user', async () => {
    const response = await request(app)
        .post('/users')
        .send({ name: 'Alice', email: 'alice@test.com' });
    expect(response.status).toBe(201);
    expect(response.body.name).toBe('Alice');
});
```

---

## Common Pitfalls aur Solutions

### Pitfall 1: Await Bhool Jaana

```python
# GALAT: Await missing — test pass hoga par function fail ho sakta hai!
async def test_bad():
    result = fetch_data()  # Ye coroutine return karega, result nahi!
    # result ek coroutine object hai, jo truthy hai, to ye pass hoga:
    assert result  # HAMESHA PASS — BUG!

# SAHI:
async def test_good():
    result = await fetch_data()
    assert result["status"] == "ok"
```

> [!tip] **Tip:** Python warnings enable karo pytest config mein to catch kar payega:
> ```toml
> [tool.pytest.ini_options]
> filterwarnings = [
>     "error::RuntimeWarning",  # "coroutine was never awaited" catch karega
> ]
> ```

### Pitfall 2: Sync aur Async Mix Karna

```python
# GALAT: Async fixture ko sync test mein use karna
@pytest.fixture
async def async_data():
    return await fetch_from_api()

def test_sync_usage(async_data):  # Ye correctly kaam nahi karega!
    assert async_data["status"] == "ok"

# SAHI: Async test use karo async fixture ke saath
async def test_async_usage(async_data):
    assert async_data["status"] == "ok"
```

### Pattern: Timeouts Test Karna

```python
import asyncio
import pytest

async def slow_operation():
    await asyncio.sleep(5)
    return "done"

async def test_timeout():
    """Ensure operation time limit mein complete ho jaye."""
    with pytest.raises(asyncio.TimeoutError):
        await asyncio.wait_for(slow_operation(), timeout=0.1)
```

### Pattern: Retry Logic Test Karna

```python
from unittest.mock import AsyncMock

async def fetch_with_retry(url: str, max_retries: int = 3) -> dict:
    import httpx
    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPError:
            if attempt == max_retries - 1:
                raise
            await asyncio.sleep(0.1 * (attempt + 1))

async def test_retry_succeeds_on_third_attempt():
    mock_client = AsyncMock()
    mock_client.get.side_effect = [
        httpx.HTTPStatusError("500", request=None, response=None),
        httpx.HTTPStatusError("500", request=None, response=None),
        AsyncMock(json=lambda: {"data": "success"}, raise_for_status=lambda: None),
    ]

    # Patch karo aur retry logic test karo
    with patch("httpx.AsyncClient") as MockClient:
        MockClient.return_value.__aenter__.return_value = mock_client
        result = await fetch_with_retry("https://api.example.com/data")

    assert result == {"data": "success"}
    assert mock_client.get.call_count == 3
```

### Pattern: Event-Driven Code Test Karna

```python
import asyncio

class EventEmitter:
    """Simple async event emitter (Node.js EventEmitter ki tarah)."""
    def __init__(self):
        self._listeners: dict[str, list] = {}

    def on(self, event: str, callback):
        self._listeners.setdefault(event, []).append(callback)

    async def emit(self, event: str, *args):
        for callback in self._listeners.get(event, []):
            if asyncio.iscoroutinefunction(callback):
                await callback(*args)
            else:
                callback(*args)

async def test_event_emitter():
    emitter = EventEmitter()
    received = []

    async def on_data(data):
        received.append(data)

    emitter.on("data", on_data)
    await emitter.emit("data", "hello")
    await emitter.emit("data", "world")

    assert received == ["hello", "world"]
```

---

## Python vs Jest — Side by Side

| Scenario | Jest (Node.js/TS) | pytest (Python) |
|---|---|---|
| Basic async test | `test('...', async () => { await ... })` | `async def test_...(): await ...` |
| Setup required | Kuch nahi (async native hai) | `pip install pytest-asyncio` |
| Marking tests | Not needed | `asyncio_mode = "auto"` ya `@pytest.mark.asyncio` |
| Async mock | `jest.fn().mockResolvedValue()` | `AsyncMock(return_value=...)` |
| Rejecting mock | `jest.fn().mockRejectedValue()` | `AsyncMock(side_effect=Error(...))` |
| Test timeout | `jest.setTimeout(10000)` | `@pytest.mark.timeout(10)` (pytest-timeout) |
| Async setup/teardown | `beforeEach(async () => {...})` | `async def fixture(): ... yield ... cleanup` |
| HTTP testing | `supertest` | `httpx.AsyncClient` + `ASGITransport` |
| Await assertion | Nahi chahiye | `assert_awaited_once()` |

### Jest Mein Aasan Kya Hai

- Async ke liye koi plugin nahi (Node.js naturally async)
- Async tests ke liye koi special decorator nahi
- `mockResolvedValue` / `mockRejectedValue` bahut intuitive hain

### pytest Mein Better Kya Hai

- `AsyncMock.assert_awaited*()` methods verify karti hain ki mock actually await hua
- Async fixtures with `yield` se setup aur teardown ek jagah hain
- Fixture scopes (session, module) async ke saath bhi kaam karte hain
- Better error messages jab await forget karo (proper warnings config ke saath)

---

## Practice Exercises

### Exercise 1: Async Cache Service

```python
# src/cache.py
import asyncio
from typing import Optional, Any

class AsyncCache:
    """In-memory async cache with TTL support."""

    def __init__(self):
        self._store: dict[str, tuple[Any, float]] = {}

    async def get(self, key: str) -> Optional[Any]:
        if key in self._store:
            value, expiry = self._store[key]
            if asyncio.get_event_loop().time() < expiry:
                return value
            del self._store[key]
        return None

    async def set(self, key: str, value: Any, ttl: float = 60.0) -> None:
        expiry = asyncio.get_event_loop().time() + ttl
        self._store[key] = (value, expiry)

    async def delete(self, key: str) -> bool:
        if key in self._store:
            del self._store[key]
            return True
        return False

    async def clear(self) -> None:
        self._store.clear()

    @property
    def size(self) -> int:
        return len(self._store)
```

```python
# tests/test_cache.py
# TUMHARA KAM:
# 1. Fresh AsyncCache dene wali async fixture banao
# 2. set aur get operations test karo
# 3. TTL expiration test karo (hint: bahut short TTL aur asyncio.sleep)
# 4. delete test karo — True existing key ke liye, False missing ke liye
# 5. clear karo cache ko poora empty karo
# 6. Expired items None return kare test karo
```

### Exercise 2: Async API Client with Retries

```python
# src/api_client.py
import httpx
import asyncio
from typing import Optional

class APIClient:
    def __init__(self, base_url: str, max_retries: int = 3):
        self.base_url = base_url
        self.max_retries = max_retries

    async def get(self, path: str) -> dict:
        """GET request with exponential backoff retry."""
        last_error: Optional[Exception] = None
        for attempt in range(self.max_retries):
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.get(f"{self.base_url}{path}")
                    response.raise_for_status()
                    return response.json()
            except (httpx.HTTPError, httpx.ConnectError) as e:
                last_error = e
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(0.1 * (2 ** attempt))
        raise last_error
```

```python
# tests/test_api_client.py
# TUMHARA KAM:
# 1. httpx.AsyncClient ko mock karo real HTTP calls avoid karne ke liye
# 2. Successful request test karo first try mein
# 3. Retry test karo — fail do baar, phir success on third
# 4. Test karo sabhi retries exhaust ho jayein to error raise ho
# 5. Exponential backoff delays test karo (mock asyncio.sleep, verify args)
# 6. Parametrize different HTTP error codes (500, 502, 503)
```

### Exercise 3: Async Producer/Consumer

```python
# src/queue.py
import asyncio
from typing import Any

class AsyncQueue:
    """Async task queue with workers."""

    def __init__(self, max_size: int = 0):
        self._queue: asyncio.Queue = asyncio.Queue(maxsize=max_size)
        self._results: list[Any] = []
        self._workers: list[asyncio.Task] = []

    async def put(self, item: Any) -> None:
        await self._queue.put(item)

    async def process(self, handler, num_workers: int = 1) -> list[Any]:
        """Process sabhi items queue mein given handler ke saath."""
        async def worker():
            while True:
                try:
                    item = self._queue.get_nowait()
                except asyncio.QueueEmpty:
                    break
                result = await handler(item)
                self._results.append(result)
                self._queue.task_done()

        workers = [asyncio.create_task(worker()) for _ in range(num_workers)]
        await asyncio.gather(*workers)
        return self._results
```

```python
# tests/test_queue.py
# TUMHARA KAM:
# 1. Items put karo aur process karo them
# 2. Async handler function ke saath test karo (AsyncMock use karo)
# 3. Multiple workers ke saath test karo (num_workers > 1)
# 4. Empty queue test karo — empty results return ho
# 5. Handler har item ke liye call ho test karo
# 6. Handler error throw kare to kya hota test karo
```

### Exercise 4: WebSocket Handler Test Karna

```python
# Ek simple WebSocket echo server ke tests implement karo.
# WebSocket send/receive simulate karne ke liye AsyncMock use karo.

# src/websocket.py
class WebSocketHandler:
    async def handle(self, websocket):
        """Echo messages back with a prefix."""
        async for message in websocket:
            if message == "close":
                await websocket.send("Goodbye!")
                break
            await websocket.send(f"Echo: {message}")
```

```python
# tests/test_websocket.py
# TUMHARA KAM:
# 1. Mock websocket banao jo async iteration support kare
# 2. Echo behavior test karo
# 3. Close command test karo
# 4. Empty message handling test karo
# Hint: __aiter__ ko mock karo incoming messages simulate karne ke liye
```

---

## Key Takeaways

1. **`asyncio_mode = "auto"` use karo** pyproject.toml mein — har test par decorator lagane ka jhanjhat nahi.
2. **AsyncMock tera best friend hai.** Any async function ya method ko mock karne ke liye use kar.
3. **assert_awaited vs assert_called.** Python distinguish karta hai calling aur awaiting mein.
4. **Async fixtures yield use karte hain** sync fixtures ki tarah setup/teardown ke liye.
5. **Missing await ke liye alert raho.** RuntimeWarning errors enable karo pytest config mein.
6. **httpx + ASGITransport sabse best way hai** FastAPI apps test karne ka.
7. **pytest-asyncio event loop handle karta hai.** Tum create ya manage nahi karo.

Agle round: [Code Quality Tools](./04_code_quality.md) — Black, Ruff, mypy aur ek complete quality pipeline.
