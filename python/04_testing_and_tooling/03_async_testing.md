# Async Testing in Python

> **Coming from Node.js/TypeScript?** In Node.js, everything is async by nature, so
> testing async code in Jest is seamless -- you just `await` in your test. Python's async
> story is more explicit: you need the `pytest-asyncio` plugin and decorators. The concepts
> are the same, but the ceremony is slightly different.

---

## Table of Contents

1. [Async in Python vs Node.js: Quick Recap](#async-recap)
2. [Setting Up pytest-asyncio](#setting-up-pytest-asyncio)
3. [Writing Async Tests](#writing-async-tests)
4. [Async Fixtures](#async-fixtures)
5. [Testing Async Generators](#testing-async-generators)
6. [Mocking Async Functions (AsyncMock)](#mocking-async-functions)
7. [Testing with aiohttp](#testing-with-aiohttp)
8. [Testing FastAPI Applications](#testing-fastapi-applications)
9. [Common Patterns and Pitfalls](#common-patterns-and-pitfalls)
10. [Comparison: Python vs Jest Async Testing](#comparison-python-vs-jest)
11. [Practice Exercises](#practice-exercises)

---

## Async in Python vs Node.js: Quick Recap

| Concept | Node.js/TypeScript | Python |
|---|---|---|
| Event loop | Always running (libuv) | Must be explicitly started (`asyncio.run()`) |
| Async function | `async function foo()` | `async def foo()` |
| Await | `await promise` | `await coroutine` |
| Promise | `Promise<T>` | `Coroutine` / `Awaitable` |
| Promise.all | `Promise.all([...])` | `asyncio.gather(...)` |
| Streams | `ReadableStream` | `async for` / async generators |
| Sleep | `setTimeout` / `sleep()` | `asyncio.sleep()` |
| HTTP client | `fetch()` / `axios` | `aiohttp` / `httpx` |

**Key difference:** In Node.js, the event loop is always running. In Python, async code
requires an event loop that must be created and managed. pytest-asyncio handles this for
you in tests.

---

## Setting Up pytest-asyncio

### Installation

```bash
pip install pytest-asyncio

# Also commonly needed:
pip install aiohttp    # Async HTTP client/server
pip install httpx      # Modern async HTTP client (like axios)
```

### Configuration

```toml
# pyproject.toml
[tool.pytest.ini_options]
asyncio_mode = "auto"  # Recommended! Auto-detects async tests
# Other options:
# asyncio_mode = "strict"  # Require explicit @pytest.mark.asyncio on every test
```

With `asyncio_mode = "auto"`, any `async def test_*` function is automatically treated
as an async test. With `"strict"` mode, you must add `@pytest.mark.asyncio` to each one.

---

## Writing Async Tests

### Basic Async Test

```python
# With asyncio_mode = "auto" (recommended)
import asyncio

async def fetch_data() -> dict:
    await asyncio.sleep(0.1)  # Simulate network delay
    return {"status": "ok", "data": [1, 2, 3]}

async def test_fetch_data():
    result = await fetch_data()
    assert result["status"] == "ok"
    assert len(result["data"]) == 3
```

```python
# With asyncio_mode = "strict" (explicit marking)
import pytest

@pytest.mark.asyncio
async def test_fetch_data():
    result = await fetch_data()
    assert result["status"] == "ok"
```

Jest comparison:
```typescript
// Jest: async tests just work
test('fetch data', async () => {
    const result = await fetchData();
    expect(result.status).toBe('ok');
    expect(result.data).toHaveLength(3);
});
```

### Testing Async Exceptions

```python
import pytest

async def divide_async(a: float, b: float) -> float:
    await asyncio.sleep(0)  # Simulate async work
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

### Testing Concurrent Operations

```python
import asyncio

async def fetch_user(user_id: int) -> dict:
    await asyncio.sleep(0.1)
    return {"id": user_id, "name": f"User {user_id}"}

async def test_concurrent_fetches():
    """Test multiple concurrent async operations (like Promise.all)."""
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
    """Test with a timeout (like Promise.race with a timer)."""
    async def slow_operation():
        await asyncio.sleep(10)
        return "done"

    with pytest.raises(asyncio.TimeoutError):
        await asyncio.wait_for(slow_operation(), timeout=0.1)
```

### Parametrize with Async Tests

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

## Async Fixtures

### Basic Async Fixtures

```python
import pytest
import asyncio

@pytest.fixture
async def async_data():
    """An async fixture - can use await."""
    await asyncio.sleep(0.01)  # Simulate async setup
    data = {"users": ["Alice", "Bob"], "count": 2}
    return data

async def test_has_users(async_data):
    assert len(async_data["users"]) == 2
    assert "Alice" in async_data["users"]
```

### Async Fixtures with Teardown

```python
import pytest

@pytest.fixture
async def db_connection():
    """Async fixture with setup and teardown."""
    # Setup
    conn = await create_async_connection("test.db")
    await conn.execute("CREATE TABLE IF NOT EXISTS users (id INT, name TEXT)")

    yield conn  # Provide to test

    # Teardown (runs even if test fails)
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
    """Factory that creates async clients."""
    clients = []

    async def _make_client(base_url: str):
        import httpx
        client = httpx.AsyncClient(base_url=base_url)
        clients.append(client)
        return client

    yield _make_client

    # Cleanup all created clients
    # Note: we're in a sync generator, so we need to run async cleanup
    # synchronously. For simplicity, async factory fixtures are often
    # handled differently in practice.

@pytest.fixture
async def http_client():
    """Simpler pattern: single async client with cleanup."""
    import httpx
    async with httpx.AsyncClient() as client:
        yield client
    # Client is automatically closed after yield
```

### Fixture Scopes with Async

```python
@pytest.fixture(scope="session")
async def database():
    """Session-scoped async fixture.
    Created once, shared across all tests."""
    db = await AsyncDatabase.connect("postgresql://localhost/testdb")
    await db.migrate()
    yield db
    await db.close()

@pytest.fixture(scope="function")
async def clean_db(database):
    """Function-scoped: clean tables before each test."""
    yield database
    await database.execute("DELETE FROM users")
    await database.execute("DELETE FROM orders")
```

---

## Testing Async Generators

Python's async generators are similar to Node.js async iterables.

```python
# src/stream.py
import asyncio
from typing import AsyncGenerator

async def number_stream(count: int) -> AsyncGenerator[int, None]:
    """Async generator that yields numbers with a delay."""
    for i in range(count):
        await asyncio.sleep(0.01)
        yield i

async def filtered_stream(source: AsyncGenerator[int, None],
                           predicate) -> AsyncGenerator[int, None]:
    """Filter an async stream."""
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
        await asyncio.sleep(0.01)  # Simulate async setup
        self.is_open = True
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await asyncio.sleep(0.01)  # Simulate async cleanup
        self.is_open = False
        return False

# Test:
async def test_async_context_manager():
    async with AsyncResource("test") as resource:
        assert resource.is_open is True
        assert resource.name == "test"
    # After the context manager exits:
    assert resource.is_open is False
```

---

## Mocking Async Functions (AsyncMock)

Python 3.8+ includes `AsyncMock` in `unittest.mock`. This is the equivalent of mocking
async functions in Jest.

### Basic AsyncMock

```python
from unittest.mock import AsyncMock, patch

# Create an async mock (like jest.fn() for async)
mock_fetch = AsyncMock(return_value={"status": "ok"})

async def test_async_mock():
    result = await mock_fetch("https://api.example.com")
    assert result == {"status": "ok"}
    mock_fetch.assert_called_once_with("https://api.example.com")
    mock_fetch.assert_awaited_once()  # Python-specific: verify it was awaited
```

Jest comparison:
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

# Sequence of return values
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

# Raising exceptions
mock_fail = AsyncMock(side_effect=ConnectionError("timeout"))

async def test_connection_failure():
    with pytest.raises(ConnectionError):
        await mock_fail()
```

### Patching Async Functions

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

### AsyncMock Assertion Methods

```python
from unittest.mock import AsyncMock, call

mock = AsyncMock()
await mock(1)
await mock(2)
await mock(3)

# All the standard Mock assertions work:
mock.assert_called()
mock.assert_called_with(3)
assert mock.call_count == 3

# Plus async-specific assertions:
mock.assert_awaited()                   # Was awaited at least once
mock.assert_awaited_once()              # Was awaited exactly once -- FAILS (3 times)
mock.assert_awaited_with(3)             # Last await call had these args
mock.assert_any_await(call(1))          # Was awaited with these args at any point
assert mock.await_count == 3            # Number of times awaited
assert mock.await_args_list == [call(1), call(2), call(3)]
```

---

## Testing with aiohttp

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

# Method 1: Using pytest-aiohttp (recommended)
# pip install pytest-aiohttp

@pytest.fixture
def app():
    """Create the application."""
    from src.app import create_app
    return create_app()

@pytest.fixture
async def client(app, aiohttp_client):
    """Create a test client."""
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

## Testing FastAPI Applications

FastAPI (the Python equivalent of Express) has excellent async testing support.

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
    """Clear the in-memory database before each test."""
    users_db.clear()
    yield
    users_db.clear()

@pytest.fixture
async def client():
    """Create an async test client for FastAPI."""
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
    # Create a user first
    create_response = await client.post(
        "/users",
        json={"name": "Bob", "email": "bob@test.com"}
    )
    user_id = create_response.json()["id"]

    # Now fetch the user
    response = await client.get(f"/users/{user_id}")
    assert response.status_code == 200
    assert response.json()["name"] == "Bob"

async def test_get_nonexistent_user(client):
    response = await client.get("/users/999")
    assert response.status_code == 404

async def test_create_user_validation(client):
    # Missing required field
    response = await client.post("/users", json={"name": "Alice"})
    assert response.status_code == 422  # Validation error
```

Compare with testing an Express app:
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

## Common Patterns and Pitfalls

### Pitfall 1: Forgetting to Await

```python
# WRONG: Missing await - test passes even though function fails!
async def test_bad():
    result = fetch_data()  # This returns a coroutine, not the result!
    # result is a coroutine object, which is truthy, so this passes:
    assert result  # ALWAYS PASSES -- BUG!

# RIGHT:
async def test_good():
    result = await fetch_data()
    assert result["status"] == "ok"
```

**Tip:** Enable Python warnings in your pytest config to catch this:
```toml
[tool.pytest.ini_options]
filterwarnings = [
    "error::RuntimeWarning",  # Catches "coroutine was never awaited"
]
```

### Pitfall 2: Mixing Sync and Async

```python
# WRONG: Async fixture used in sync test
@pytest.fixture
async def async_data():
    return await fetch_from_api()

def test_sync_usage(async_data):  # This won't work correctly!
    assert async_data["status"] == "ok"

# RIGHT: Use async test with async fixture
async def test_async_usage(async_data):
    assert async_data["status"] == "ok"
```

### Pattern: Testing Timeouts

```python
import asyncio
import pytest

async def slow_operation():
    await asyncio.sleep(5)
    return "done"

async def test_timeout():
    """Ensure an operation completes within a time limit."""
    with pytest.raises(asyncio.TimeoutError):
        await asyncio.wait_for(slow_operation(), timeout=0.1)
```

### Pattern: Testing Retry Logic

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

    # Patch and test the retry logic
    with patch("httpx.AsyncClient") as MockClient:
        MockClient.return_value.__aenter__.return_value = mock_client
        result = await fetch_with_retry("https://api.example.com/data")

    assert result == {"data": "success"}
    assert mock_client.get.call_count == 3
```

### Pattern: Testing Event-Driven Code

```python
import asyncio

class EventEmitter:
    """Simple async event emitter (like Node.js EventEmitter)."""
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

## Comparison: Python vs Jest Async Testing

| Scenario | Jest (Node.js/TS) | pytest (Python) |
|---|---|---|
| Basic async test | `test('...', async () => { await ... })` | `async def test_...(): await ...` |
| Setup needed | None (async is native) | `pip install pytest-asyncio` |
| Marking async tests | Not needed | `asyncio_mode = "auto"` or `@pytest.mark.asyncio` |
| Async mock | `jest.fn().mockResolvedValue()` | `AsyncMock(return_value=...)` |
| Rejecting mock | `jest.fn().mockRejectedValue()` | `AsyncMock(side_effect=Error(...))` |
| Test timeout | `jest.setTimeout(10000)` | `@pytest.mark.timeout(10)` (pytest-timeout) |
| Async setup/teardown | `beforeEach(async () => {...})` | `async def fixture(): ... yield ... cleanup` |
| HTTP testing | `supertest` | `httpx.AsyncClient` with `ASGITransport` |
| Await assertion | Not needed | `assert_awaited_once()` |

### What is Simpler in Jest

- No plugin needed for async (Node.js is async-native)
- No special decorator or config for async tests
- `mockResolvedValue` / `mockRejectedValue` are very intuitive

### What is Better in pytest

- `AsyncMock.assert_awaited*()` methods verify the mock was actually awaited
- Async fixtures with `yield` co-locate setup and teardown
- Fixture scopes (session, module) work with async too
- Better error messages when you forget to `await` (with proper warnings config)

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
# YOUR CODE HERE:
# 1. Create an async fixture that provides a fresh AsyncCache
# 2. Test set and get operations
# 3. Test TTL expiration (hint: use a very short TTL and asyncio.sleep)
# 4. Test delete returns True for existing key, False for missing
# 5. Test clear empties the cache
# 6. Test that expired items return None
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
# YOUR CODE HERE:
# 1. Mock httpx.AsyncClient to avoid real HTTP calls
# 2. Test successful request on first try
# 3. Test retry on failure then success (fail twice, succeed on third)
# 4. Test all retries exhausted raises the last error
# 5. Test exponential backoff delays (mock asyncio.sleep and verify call args)
# 6. Use parametrize for different HTTP error codes (500, 502, 503)
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
        """Process all items in the queue with the given handler."""
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
# YOUR CODE HERE:
# 1. Test putting items and processing them
# 2. Test with an async handler function (use AsyncMock)
# 3. Test with multiple workers (num_workers > 1)
# 4. Test empty queue returns empty results
# 5. Test that the handler is called for each item
# 6. Test with a handler that raises (what happens?)
```

### Exercise 4: Test a WebSocket Handler

```python
# Implement tests for a simple WebSocket echo server.
# Use AsyncMock to simulate WebSocket send/receive.

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
# YOUR CODE HERE:
# 1. Create a mock websocket that supports async iteration
# 2. Test echo behavior
# 3. Test close command
# 4. Test empty message handling
# Hint: Mock __aiter__ to simulate incoming messages
```

---

## Key Takeaways

1. **Use `asyncio_mode = "auto"`** in pyproject.toml to avoid decorating every test.
2. **AsyncMock is your friend.** Use it for mocking any async function or method.
3. **assert_awaited vs assert_called.** Python distinguishes between calling and awaiting.
4. **Async fixtures use yield** just like sync fixtures for setup/teardown.
5. **Watch for missing await.** Enable `RuntimeWarning` errors in your pytest config.
6. **httpx + ASGITransport** is the best way to test FastAPI apps.
7. **pytest-asyncio handles the event loop.** You do not need to create or manage it.

Next up: [Code Quality Tools](./04_code_quality.md) -- Black, Ruff, mypy, and setting
up a complete quality pipeline.
