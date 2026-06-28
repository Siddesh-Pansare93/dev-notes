# Fixtures and Mocking in pytest

> **Coming from Node.js/TypeScript?** Fixtures are pytest's replacement for Jest's
> `beforeEach`/`beforeAll`/`afterEach`/`afterAll` -- but they are far more powerful.
> Think of them as dependency injection for your tests. Mocking works similarly to
> `jest.mock()` but uses Python's `unittest.mock` module.

---

## Table of Contents

1. [Fixtures vs beforeEach/beforeAll](#fixtures-vs-beforeeach-beforeall)
2. [Basic Fixtures](#basic-fixtures)
3. [Fixture Scopes](#fixture-scopes)
4. [Fixture Teardown (Cleanup)](#fixture-teardown)
5. [conftest.py: Shared Fixtures](#conftestpy-shared-fixtures)
6. [Fixture Dependency Injection](#fixture-dependency-injection)
7. [Built-in Fixtures](#built-in-fixtures)
8. [unittest.mock: Mock, MagicMock, patch](#unittestmock)
9. [The @patch Decorator](#the-patch-decorator)
10. [monkeypatch Fixture](#monkeypatch-fixture)
11. [Practice Exercises](#practice-exercises)

---

## Fixtures vs beforeEach/beforeAll

### The Jest Way (Mutable Shared State)

```typescript
// Jest: Setup/teardown is imperative and relies on mutable outer scope
describe('UserService', () => {
    let db: Database;
    let userService: UserService;

    beforeAll(async () => {
        db = await Database.connect();
    });

    beforeEach(() => {
        userService = new UserService(db);
    });

    afterEach(async () => {
        await db.clear();
    });

    afterAll(async () => {
        await db.disconnect();
    });

    test('creates a user', async () => {
        const user = await userService.create({ name: 'Alice' });
        expect(user.name).toBe('Alice');
    });
});
```

### The pytest Way (Dependency Injection)

```python
# pytest: Fixtures are declared, injected, and scoped explicitly
import pytest

@pytest.fixture(scope="session")
def db():
    """Create database connection once for all tests."""
    database = Database.connect()
    yield database               # yield = "use this, then run cleanup below"
    database.disconnect()

@pytest.fixture
def user_service(db):            # db fixture is injected automatically!
    """Create a fresh UserService for each test."""
    service = UserService(db)
    yield service
    db.clear()

def test_creates_user(user_service):   # user_service fixture injected here
    user = user_service.create(name="Alice")
    assert user.name == "Alice"
```

**Key differences:**
- No mutable outer-scope variables (`let db`, `let userService`)
- Fixtures explicitly declare dependencies (`user_service` depends on `db`)
- Each test declares exactly which fixtures it needs (no hidden setup)
- Cleanup is co-located with setup (via `yield`)

---

## Basic Fixtures

### Defining and Using Fixtures

```python
import pytest

# A fixture is just a function decorated with @pytest.fixture
@pytest.fixture
def sample_user():
    """Provides a sample user dict for tests."""
    return {
        "id": 1,
        "name": "Alice",
        "email": "alice@example.com",
        "is_active": True,
    }

@pytest.fixture
def empty_list():
    """Provides an empty list."""
    return []

# Tests request fixtures by naming them as parameters
def test_user_has_name(sample_user):
    assert sample_user["name"] == "Alice"

def test_user_is_active(sample_user):
    assert sample_user["is_active"] is True

def test_empty_list_is_falsy(empty_list):
    assert not empty_list
```

### Each Test Gets a Fresh Instance

```python
@pytest.fixture
def numbers():
    return [1, 2, 3]

def test_append(numbers):
    numbers.append(4)
    assert numbers == [1, 2, 3, 4]

def test_still_original(numbers):
    # This gets a FRESH list - not affected by test_append
    assert numbers == [1, 2, 3]
```

This is like `beforeEach` automatically creating a new instance for every test.

### Fixtures Returning Factories

Sometimes you need to create multiple objects with different parameters:

```python
@pytest.fixture
def make_user():
    """Factory fixture - returns a function that creates users."""
    def _make_user(name: str = "Alice", age: int = 30) -> dict:
        return {"name": name, "age": age, "id": id(name)}
    return _make_user

def test_multiple_users(make_user):
    alice = make_user("Alice", 30)
    bob = make_user("Bob", 25)
    assert alice["name"] != bob["name"]
    assert alice["id"] != bob["id"]
```

Jest equivalent:
```typescript
// In Jest, you'd just create a helper function
function makeUser(name = 'Alice', age = 30) {
    return { name, age, id: Math.random() };
}

test('multiple users', () => {
    const alice = makeUser('Alice', 30);
    const bob = makeUser('Bob', 25);
    expect(alice.name).not.toBe(bob.name);
});
```

---

## Fixture Scopes

Scopes control how often a fixture is created and destroyed.

```python
import pytest

@pytest.fixture(scope="function")  # Default! New instance per test function
def per_test_resource():
    print("Creating resource")
    return Resource()

@pytest.fixture(scope="class")     # One instance shared across a test class
def per_class_resource():
    print("Creating resource for class")
    return Resource()

@pytest.fixture(scope="module")    # One instance shared across a test file
def per_module_resource():
    print("Creating resource for module")
    return Resource()

@pytest.fixture(scope="session")   # One instance shared across ALL tests
def per_session_resource():
    print("Creating resource for session")
    return Resource()
```

### Scope Comparison with Jest

| pytest Scope | Jest Equivalent | Runs |
|---|---|---|
| `function` (default) | `beforeEach` / `afterEach` | Before/after each test |
| `class` | Inner `describe` with `beforeAll` | Once per test class |
| `module` | Per-file `beforeAll` / `afterAll` | Once per test file |
| `session` | `globalSetup` / `globalTeardown` | Once for the entire test run |

### Real-World Example: Database Connection

```python
import pytest

@pytest.fixture(scope="session")
def db_connection():
    """Expensive: create once for entire test session."""
    conn = create_database_connection()
    yield conn
    conn.close()

@pytest.fixture(scope="function")
def db_transaction(db_connection):
    """Cheap: start a new transaction for each test, rollback after."""
    transaction = db_connection.begin()
    yield db_connection
    transaction.rollback()  # Each test's changes are rolled back

def test_create_user(db_transaction):
    db_transaction.execute("INSERT INTO users (name) VALUES ('Alice')")
    result = db_transaction.execute("SELECT * FROM users WHERE name = 'Alice'")
    assert result.fetchone() is not None

def test_no_user_leakage(db_transaction):
    # Previous test's INSERT was rolled back!
    result = db_transaction.execute("SELECT * FROM users WHERE name = 'Alice'")
    assert result.fetchone() is None
```

---

## Fixture Teardown

### Using yield (Recommended)

```python
@pytest.fixture
def temp_file():
    """Create a temp file, clean up after test."""
    import tempfile
    import os

    # Setup: everything before yield
    fd, path = tempfile.mkstemp()
    os.write(fd, b"test data")
    os.close(fd)

    yield path  # This value is what the test receives

    # Teardown: everything after yield
    os.unlink(path)

def test_read_temp_file(temp_file):
    with open(temp_file) as f:
        assert f.read() == "test data"
    # After this test, the temp file is automatically cleaned up
```

### Using addfinalizer (Less Common)

```python
@pytest.fixture
def resource(request):
    """Alternative teardown using request.addfinalizer."""
    r = acquire_resource()

    def cleanup():
        r.release()

    request.addfinalizer(cleanup)
    return r
```

### Teardown Even on Failure

Both `yield` and `addfinalizer` run cleanup even if the test fails. This is crucial
for preventing resource leaks.

```python
@pytest.fixture
def server():
    srv = start_test_server(port=8080)
    yield srv
    srv.stop()  # This runs even if the test raises an exception
```

---

## conftest.py: Shared Fixtures

This is one of pytest's most powerful features with **no Jest equivalent**.

`conftest.py` files contain fixtures that are automatically available to all tests
in the same directory and its subdirectories. No imports needed!

### Project Structure

```
tests/
    conftest.py              # Fixtures available to ALL tests
    test_auth.py
    test_home.py

    api/
        conftest.py          # Fixtures for api/ tests only
        test_users.py
        test_products.py

    integration/
        conftest.py          # Fixtures for integration/ tests only
        test_database.py
```

### Root conftest.py

```python
# tests/conftest.py
import pytest

@pytest.fixture
def auth_headers():
    """Available to ALL tests everywhere."""
    return {"Authorization": "Bearer test-token-123"}

@pytest.fixture
def sample_user():
    """Available to ALL tests everywhere."""
    return {"id": 1, "name": "Alice", "email": "alice@test.com"}

@pytest.fixture(scope="session")
def app():
    """Create the Flask/FastAPI app once for the test session."""
    from myapp import create_app
    app = create_app(testing=True)
    return app
```

### Subdirectory conftest.py

```python
# tests/api/conftest.py
import pytest

@pytest.fixture
def api_client(app):
    """Only available to tests in tests/api/.
    Uses the 'app' fixture from the parent conftest.py."""
    return app.test_client()

@pytest.fixture
def authenticated_client(api_client, auth_headers):
    """Combines fixtures from different conftest.py files."""
    api_client.default_headers = auth_headers
    return api_client
```

### Using Shared Fixtures (No Imports!)

```python
# tests/api/test_users.py

# No imports needed for fixtures! pytest injects them automatically.

def test_list_users(authenticated_client):
    response = authenticated_client.get("/api/users")
    assert response.status_code == 200

def test_create_user(authenticated_client, sample_user):
    response = authenticated_client.post("/api/users", json=sample_user)
    assert response.status_code == 201
```

### conftest.py Can Also Configure pytest

```python
# tests/conftest.py
import pytest

def pytest_addoption(parser):
    """Add custom command-line options."""
    parser.addoption(
        "--runslow", action="store_true", default=False,
        help="Run slow tests"
    )

def pytest_collection_modifyitems(config, items):
    """Skip slow tests unless --runslow is passed."""
    if not config.getoption("--runslow"):
        skip_slow = pytest.mark.skip(reason="Need --runslow option to run")
        for item in items:
            if "slow" in item.keywords:
                item.add_marker(skip_slow)
```

---

## Fixture Dependency Injection

Fixtures can depend on other fixtures, forming a dependency graph.

```python
import pytest

@pytest.fixture
def database_url():
    return "postgresql://localhost:5432/testdb"

@pytest.fixture
def database_connection(database_url):       # Depends on database_url
    conn = connect(database_url)
    yield conn
    conn.close()

@pytest.fixture
def user_repository(database_connection):    # Depends on database_connection
    return UserRepository(database_connection)

@pytest.fixture
def user_service(user_repository):           # Depends on user_repository
    return UserService(user_repository)

# The test only asks for what it needs. pytest builds the entire chain.
def test_create_user(user_service):
    # pytest automatically creates: database_url -> database_connection ->
    #   user_repository -> user_service
    user = user_service.create("Alice")
    assert user.name == "Alice"
```

This is like a lightweight dependency injection container that wires up your test
dependencies automatically.

### Visualizing Fixture Dependencies

```bash
# Show what fixtures a test uses:
pytest --fixtures-per-test test_example.py

# Show all available fixtures:
pytest --fixtures
```

---

## Built-in Fixtures

pytest comes with several useful built-in fixtures.

### tmp_path - Temporary Directory

```python
def test_write_file(tmp_path):
    """tmp_path is a pathlib.Path to a unique temp directory."""
    file = tmp_path / "test.txt"
    file.write_text("hello world")

    assert file.read_text() == "hello world"
    assert file.exists()
    # Directory is automatically cleaned up

def test_create_structure(tmp_path):
    """Create a complex file structure for testing."""
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "main.py").write_text("print('hello')")
    (tmp_path / "tests").mkdir()
    (tmp_path / "tests" / "test_main.py").write_text("def test_it(): pass")

    assert (tmp_path / "src" / "main.py").exists()
```

### capsys - Capture stdout/stderr

```python
def greet(name: str) -> None:
    print(f"Hello, {name}!")

def test_greet_output(capsys):
    greet("World")
    captured = capsys.readouterr()
    assert captured.out == "Hello, World!\n"
    assert captured.err == ""
```

### caplog - Capture Logging

```python
import logging

logger = logging.getLogger(__name__)

def process_data(data):
    logger.info(f"Processing {len(data)} items")
    if not data:
        logger.warning("Empty data received")
    return len(data)

def test_process_logging(caplog):
    with caplog.at_level(logging.INFO):
        process_data([1, 2, 3])
    assert "Processing 3 items" in caplog.text

def test_empty_data_warning(caplog):
    with caplog.at_level(logging.WARNING):
        process_data([])
    assert "Empty data received" in caplog.text
```

### request - Test Metadata

```python
def test_example(request):
    print(f"Test name: {request.node.name}")
    print(f"Test file: {request.fspath}")
    print(f"Test markers: {list(request.node.iter_markers())}")
```

---

## unittest.mock: Mock, MagicMock, patch

Python's standard library includes a powerful mocking library. You do not need to install
anything extra (though `pytest-mock` provides a nicer API).

### Mock vs jest.fn()

```python
from unittest.mock import Mock, MagicMock

# Create a mock (like jest.fn())
mock_fn = Mock()

# Call it
mock_fn(1, 2, 3)
mock_fn("hello")

# Assert it was called
mock_fn.assert_called()
mock_fn.assert_called_with("hello")  # Last call
mock_fn.assert_any_call(1, 2, 3)     # Any call ever
assert mock_fn.call_count == 2
```

Jest equivalent:
```typescript
const mockFn = jest.fn();
mockFn(1, 2, 3);
mockFn('hello');
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenLastCalledWith('hello');
expect(mockFn).toHaveBeenCalledWith(1, 2, 3);
expect(mockFn).toHaveBeenCalledTimes(2);
```

### return_value and side_effect

```python
from unittest.mock import Mock

# Mock with a return value (like jest.fn().mockReturnValue())
mock_db = Mock()
mock_db.get_user.return_value = {"id": 1, "name": "Alice"}
result = mock_db.get_user(1)
assert result == {"id": 1, "name": "Alice"}

# Mock with different return values per call (like mockReturnValueOnce)
mock_api = Mock()
mock_api.fetch.side_effect = [
    {"status": "ok"},      # First call
    {"status": "error"},   # Second call
    ConnectionError("timeout"),  # Third call raises!
]
assert mock_api.fetch()["status"] == "ok"
assert mock_api.fetch()["status"] == "error"

import pytest
with pytest.raises(ConnectionError):
    mock_api.fetch()

# Mock with a function (like jest.fn().mockImplementation())
mock_calculator = Mock()
mock_calculator.add.side_effect = lambda a, b: a + b
assert mock_calculator.add(2, 3) == 5

# Mock that always raises (like jest.fn().mockRejectedValue())
mock_service = Mock()
mock_service.connect.side_effect = ConnectionError("refused")
with pytest.raises(ConnectionError):
    mock_service.connect()
```

### MagicMock - Mock with Magic Methods

```python
from unittest.mock import MagicMock

# MagicMock supports Python's magic/dunder methods
mock = MagicMock()

# Supports len()
mock.__len__.return_value = 5
assert len(mock) == 5

# Supports iteration
mock.__iter__.return_value = iter([1, 2, 3])
assert list(mock) == [1, 2, 3]

# Supports context manager (with statement)
mock.__enter__.return_value = "resource"
with mock as resource:
    assert resource == "resource"

# Supports subscript access
mock.__getitem__.return_value = "value"
assert mock["key"] == "value"
```

### Asserting Call Details

```python
from unittest.mock import Mock, call

mock_fn = Mock()
mock_fn(1, name="Alice")
mock_fn(2, name="Bob")
mock_fn(3, name="Charlie")

# Assert specific calls
mock_fn.assert_called_with(3, name="Charlie")       # Last call
mock_fn.assert_any_call(1, name="Alice")             # Any call

# Assert entire call history
assert mock_fn.call_args_list == [
    call(1, name="Alice"),
    call(2, name="Bob"),
    call(3, name="Charlie"),
]

# Assert call count
assert mock_fn.call_count == 3

# Reset mock (like jest.fn().mockClear())
mock_fn.reset_mock()
assert mock_fn.call_count == 0
```

---

## The @patch Decorator

`@patch` temporarily replaces an object with a mock during a test. This is the Python
equivalent of `jest.mock()`.

### Basic @patch Usage

```python
# src/weather.py
import requests

def get_temperature(city: str) -> float:
    response = requests.get(f"https://api.weather.com/{city}")
    data = response.json()
    return data["temperature"]
```

```python
# tests/test_weather.py
from unittest.mock import patch, Mock

# Method 1: @patch as decorator
@patch("src.weather.requests.get")
def test_get_temperature(mock_get):
    # Configure the mock
    mock_response = Mock()
    mock_response.json.return_value = {"temperature": 72.5}
    mock_get.return_value = mock_response

    # Call the real function - it uses the mock internally
    from src.weather import get_temperature
    temp = get_temperature("NYC")

    assert temp == 72.5
    mock_get.assert_called_once_with("https://api.weather.com/NYC")

# Method 2: patch as context manager
def test_get_temperature_context():
    with patch("src.weather.requests.get") as mock_get:
        mock_response = Mock()
        mock_response.json.return_value = {"temperature": 85.0}
        mock_get.return_value = mock_response

        from src.weather import get_temperature
        temp = get_temperature("LA")

        assert temp == 85.0
```

**Important:** You patch where the thing is **used**, not where it is **defined**.
`patch("src.weather.requests.get")` not `patch("requests.get")`.

Jest comparison:
```typescript
// Jest: jest.mock at module level
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

test('get temperature', async () => {
    mockedAxios.get.mockResolvedValue({ data: { temperature: 72.5 } });
    const temp = await getTemperature('NYC');
    expect(temp).toBe(72.5);
});
```

### Patching Multiple Things

```python
@patch("src.service.send_email")
@patch("src.service.save_to_db")
def test_register_user(mock_save, mock_email):
    # Note: decorators are applied bottom-up, so parameters are reversed!
    # mock_save corresponds to save_to_db (inner/lower decorator)
    # mock_email corresponds to send_email (outer/upper decorator)

    mock_save.return_value = {"id": 1, "name": "Alice"}

    result = register_user("Alice", "alice@test.com")

    mock_save.assert_called_once()
    mock_email.assert_called_once_with("alice@test.com", "Welcome!")
```

### patch.object - Patch an Attribute

```python
from unittest.mock import patch

class PaymentGateway:
    def charge(self, amount: float) -> bool:
        # Real implementation calls external API
        pass

def test_checkout():
    gateway = PaymentGateway()

    with patch.object(gateway, "charge", return_value=True):
        # gateway.charge is now a mock that returns True
        result = gateway.charge(99.99)
        assert result is True
```

### patch.dict - Patch a Dictionary

```python
import os
from unittest.mock import patch

@patch.dict(os.environ, {"API_KEY": "test-key", "DEBUG": "1"})
def test_with_env_vars():
    assert os.environ["API_KEY"] == "test-key"
    assert os.environ["DEBUG"] == "1"

@patch.dict(os.environ, {"API_KEY": "test-key"}, clear=True)
def test_with_clean_env():
    # Only API_KEY exists - all other env vars are cleared
    assert os.environ.get("API_KEY") == "test-key"
    assert os.environ.get("PATH") is None
```

---

## monkeypatch Fixture

pytest provides a built-in `monkeypatch` fixture that is often easier to use than
`unittest.mock.patch`. It automatically undoes changes after each test.

### Setting Environment Variables

```python
def test_api_key(monkeypatch):
    monkeypatch.setenv("API_KEY", "test-key-123")
    monkeypatch.setenv("DEBUG", "true")

    from myapp.config import get_api_key
    assert get_api_key() == "test-key-123"
    # After the test, environment is automatically restored

def test_missing_api_key(monkeypatch):
    monkeypatch.delenv("API_KEY", raising=False)

    from myapp.config import get_api_key
    import pytest
    with pytest.raises(EnvironmentError):
        get_api_key()
```

### Patching Attributes

```python
def test_custom_timeout(monkeypatch):
    import myapp.client as client

    # Replace an attribute on a module/object
    monkeypatch.setattr(client, "DEFAULT_TIMEOUT", 1)
    assert client.DEFAULT_TIMEOUT == 1

def test_mock_function(monkeypatch):
    import myapp.auth as auth

    # Replace a function
    monkeypatch.setattr(auth, "verify_token", lambda token: True)
    assert auth.verify_token("any-token") is True
```

### Patching Dictionary Items

```python
def test_custom_config(monkeypatch):
    from myapp import config

    monkeypatch.setitem(config.SETTINGS, "max_retries", 1)
    monkeypatch.setitem(config.SETTINGS, "timeout", 0.1)
    # SETTINGS dict is restored after the test
```

### monkeypatch vs unittest.mock.patch

| Feature | monkeypatch | unittest.mock.patch |
|---|---|---|
| Scope | pytest fixture (function scope) | Decorator or context manager |
| Undo | Automatic after test | Automatic (decorator/ctx) or manual |
| Best for | Env vars, simple attr replacement | Full mock objects, call tracking |
| Call assertions | No | Yes (assert_called_with, etc.) |
| return_value/side_effect | No (use with Mock()) | Yes |

**Rule of thumb:** Use `monkeypatch` for simple replacements (env vars, config values).
Use `unittest.mock.patch` when you need to track calls or configure complex mock behavior.

---

## pytest-mock Plugin (Bonus)

The `pytest-mock` package provides a `mocker` fixture that wraps `unittest.mock` with a
cleaner API.

```bash
pip install pytest-mock
```

```python
def test_with_mocker(mocker):
    # mocker.patch works like @patch but as a fixture
    mock_get = mocker.patch("src.weather.requests.get")
    mock_get.return_value.json.return_value = {"temperature": 72.5}

    from src.weather import get_temperature
    assert get_temperature("NYC") == 72.5

    # Create spies (like jest.spyOn)
    spy = mocker.spy(some_module, "some_function")
    some_module.some_function(42)
    spy.assert_called_once_with(42)

    # Create mocks
    mock_fn = mocker.Mock(return_value=42)
    assert mock_fn() == 42
```

---

## Practice Exercises

### Exercise 1: Fixtures for a Todo App

```python
# src/todo.py
from dataclasses import dataclass, field
from datetime import datetime

@dataclass
class Todo:
    title: str
    completed: bool = False
    created_at: datetime = field(default_factory=datetime.now)

class TodoList:
    def __init__(self):
        self._todos: list[Todo] = []

    def add(self, title: str) -> Todo:
        todo = Todo(title=title)
        self._todos.append(todo)
        return todo

    def complete(self, title: str) -> None:
        for todo in self._todos:
            if todo.title == title:
                todo.completed = True
                return
        raise ValueError(f"Todo not found: {title}")

    def get_pending(self) -> list[Todo]:
        return [t for t in self._todos if not t.completed]

    def get_completed(self) -> list[Todo]:
        return [t for t in self._todos if t.completed]

    @property
    def count(self) -> int:
        return len(self._todos)
```

```python
# tests/test_todo.py
import pytest
from src.todo import TodoList

# YOUR CODE HERE:
# 1. Create a fixture that provides an empty TodoList
# 2. Create a fixture that provides a TodoList with 3 pre-populated items
# 3. Create a factory fixture that creates todos with custom titles
# 4. Write tests using these fixtures:
#    - test_add_todo (using empty TodoList fixture)
#    - test_complete_todo (using pre-populated fixture)
#    - test_complete_nonexistent_raises (using empty fixture + pytest.raises)
#    - test_get_pending (using pre-populated fixture where some are completed)
#    - test_count (using factory fixture to create variable numbers of todos)
```

### Exercise 2: Mocking an External API

```python
# src/github_client.py
import requests
from typing import Optional

class GitHubClient:
    BASE_URL = "https://api.github.com"

    def __init__(self, token: str):
        self.token = token
        self.session = requests.Session()
        self.session.headers["Authorization"] = f"Bearer {token}"

    def get_user(self, username: str) -> dict:
        response = self.session.get(f"{self.BASE_URL}/users/{username}")
        response.raise_for_status()
        return response.json()

    def get_repos(self, username: str) -> list[dict]:
        response = self.session.get(f"{self.BASE_URL}/users/{username}/repos")
        response.raise_for_status()
        return response.json()

    def create_issue(self, owner: str, repo: str, title: str,
                     body: Optional[str] = None) -> dict:
        payload = {"title": title}
        if body:
            payload["body"] = body
        response = self.session.post(
            f"{self.BASE_URL}/repos/{owner}/{repo}/issues",
            json=payload
        )
        response.raise_for_status()
        return response.json()
```

```python
# tests/test_github_client.py
import pytest
from unittest.mock import Mock, patch, MagicMock
from src.github_client import GitHubClient

# YOUR CODE HERE:
# 1. Create a fixture that provides a GitHubClient with a fake token
# 2. Mock the requests.Session to avoid real HTTP calls
# 3. Test get_user returns parsed JSON
# 4. Test get_repos returns a list of repos
# 5. Test create_issue sends correct payload
# 6. Test that HTTP errors (404, 500) are properly raised
# 7. Test that the Authorization header is set correctly
```

### Exercise 3: conftest.py Hierarchy

Create this test structure and implement shared fixtures:

```
tests/
    conftest.py           # -> app fixture, auth_token fixture
    test_health.py        # -> test that app is running

    api/
        conftest.py       # -> api_client fixture (depends on app)
        test_users.py     # -> tests using api_client
        test_products.py  # -> tests using api_client

    integration/
        conftest.py       # -> database fixture (session scope)
        test_db.py        # -> tests using database
```

Implement all conftest.py files and at least 2 tests per test file. Fixtures in child
conftest files should depend on parent fixtures.

### Exercise 4: monkeypatch Environment

```python
# src/config.py
import os

def get_config() -> dict:
    return {
        "database_url": os.environ.get("DATABASE_URL", "sqlite:///dev.db"),
        "debug": os.environ.get("DEBUG", "false").lower() == "true",
        "api_key": os.environ["API_KEY"],  # Required - raises KeyError if missing
        "max_connections": int(os.environ.get("MAX_CONNECTIONS", "10")),
    }
```

```python
# tests/test_config.py
# YOUR CODE HERE:
# 1. Test default values when env vars are not set (use monkeypatch.delenv)
# 2. Test custom values override defaults
# 3. Test that missing API_KEY raises KeyError
# 4. Test debug mode parsing ("true", "True", "TRUE", "false", "0")
# 5. Test invalid MAX_CONNECTIONS raises ValueError
# Use monkeypatch for all environment manipulation
```

---

## Key Takeaways

1. **Fixtures > beforeEach.** They are explicit, composable, and scoped.
2. **conftest.py is magic.** Shared fixtures with zero imports. Use the directory hierarchy.
3. **yield for cleanup.** Setup before yield, teardown after. Always runs.
4. **Scope carefully.** Use `session` for expensive resources, `function` for isolation.
5. **Mock where it is used.** `patch("myapp.module.requests")` not `patch("requests")`.
6. **monkeypatch for simple stuff.** Env vars, config values, simple attribute replacement.
7. **unittest.mock for complex stuff.** Call tracking, return values, side effects.

Next up: [Async Testing](./03_async_testing.md) -- testing async/await code in Python.
