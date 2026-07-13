# Fixtures और Mocking pytest में

> **Node.js/TypeScript से आ रहे हो?** Fixtures, Jest के `beforeEach`/`beforeAll`/`afterEach`/`afterAll` जैसे ही हैं
> — लेकिन **कहीं ज्यादा powerful** हैं। सोचो इन्हें अपने tests के लिए dependency injection की तरह।
> Mocking भी Jest जैसे ही काम करता है, बस Python के `unittest.mock` module का इस्तेमाल होता है।

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

### Jest का तरीका (Mutable Shared State)

```typescript
// Jest: Setup/teardown imperative है, mutable outer scope पर निर्भर करता है
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

### pytest का तरीका (Dependency Injection)

```python
# pytest: Fixtures explicitly declare होते हैं, inject होते हैं, scoped होते हैं
import pytest

@pytest.fixture(scope="session")
def db():
    """डेटाबेस connection एक बार सभी tests के लिए बनाओ।"""
    database = Database.connect()
    yield database               # yield = "यह use करो, फिर cleanup करना"
    database.disconnect()

@pytest.fixture
def user_service(db):            # db fixture automatically inject हो गया!
    """हर test के लिए fresh UserService बनाओ।"""
    service = UserService(db)
    yield service
    db.clear()

def test_creates_user(user_service):   # user_service यहाँ inject हुआ
    user = user_service.create(name="Alice")
    assert user.name == "Alice"
```

**क्या फर्क है:**
- कोई mutable outer-scope variables नहीं (`let db`, `let userService`)
- Fixtures explicitly अपने dependencies declare करते हैं (`user_service` को `db` चाहिए)
- हर test बिल्कुल clear करता है कि उसे कौन से fixtures चाहिए (कोई hidden setup नहीं)
- Setup और cleanup एक जगह रहता है (via `yield`)

---

## Basic Fixtures

### Kya hota hai? Fixtures कैसे define करते हैं

```python
import pytest

# Fixture सिर्फ एक function है @pytest.fixture decorator के साथ
@pytest.fixture
def sample_user():
    """Tests के लिए sample user data देता है।"""
    return {
        "id": 1,
        "name": "Alice",
        "email": "alice@example.com",
        "is_active": True,
    }

@pytest.fixture
def empty_list():
    """खाली list देता है।"""
    return []

# Tests fixtures माँगते हैं उन्हें parameter नाम से रखके
def test_user_has_name(sample_user):
    assert sample_user["name"] == "Alice"

def test_user_is_active(sample_user):
    assert sample_user["is_active"] is True

def test_empty_list_is_falsy(empty_list):
    assert not empty_list
```

### हर Test को Fresh Instance मिलता है

```python
@pytest.fixture
def numbers():
    return [1, 2, 3]

def test_append(numbers):
    numbers.append(4)
    assert numbers == [1, 2, 3, 4]

def test_still_original(numbers):
    # यह एक FRESH list पाता है - test_append का असर नहीं है
    assert numbers == [1, 2, 3]
```

यह `beforeEach` जैसे ही है — हर test को नया instance मिल जाता है।

### Fixtures जो Functions Return करते हैं (Factory Pattern)

कभी-कभी तुम्हें multiple objects create करने हैं different parameters के साथ:

```python
@pytest.fixture
def make_user():
    """Factory fixture - एक function return करता है जो users बनाता है।"""
    def _make_user(name: str = "Alice", age: int = 30) -> dict:
        return {"name": name, "age": age, "id": id(name)}
    return _make_user

def test_multiple_users(make_user):
    alice = make_user("Alice", 30)
    bob = make_user("Bob", 25)
    assert alice["name"] != bob["name"]
    assert alice["id"] != bob["id"]
```

Jest में तुम सिर्फ helper function बनाते हो:
```typescript
// Jest में ऐसे करते हो
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

**Kya zaruri hai scope का?** क्योंकि कुछ चीजें expensive होती हैं (database connection, server startup)। 
Scope बताता है कि fixture कितनी बार बने और कितने tests share करें।

```python
import pytest

@pytest.fixture(scope="function")  # Default! हर test function के लिए नया
def per_test_resource():
    print("Resource बना रहे हैं")
    return Resource()

@pytest.fixture(scope="class")     # एक बार एक test class के लिए
def per_class_resource():
    print("Class के लिए resource बना रहे हैं")
    return Resource()

@pytest.fixture(scope="module")    # एक बार एक test file के लिए
def per_module_resource():
    print("Module के लिए resource बना रहे हैं")
    return Resource()

@pytest.fixture(scope="session")   # एक बार पूरे test session के लिए
def per_session_resource():
    print("Session के लिए resource बना रहे हैं")
    return Resource()
```

### Scope: pytest vs Jest

| pytest Scope | Jest का equivalent | कब चलता है |
|---|---|---|
| `function` (default) | `beforeEach` / `afterEach` | हर test से पहले/बाद |
| `class` | Inner `describe` के साथ `beforeAll` | एक बार test class के लिए |
| `module` | Per-file `beforeAll` / `afterAll` | एक बार test file के लिए |
| `session` | `globalSetup` / `globalTeardown` | पूरे test run के लिए एक बार |

### Real-World Example: Database Connection

Zomato API की तरह सोचो — हर request के लिए connection खोलना महंगा है। तो:
- **Session scope**: पूरे test run के लिए एक connection
- **Function scope**: हर test के लिए नया transaction (जो rollback हो जाए)

```python
import pytest

@pytest.fixture(scope="session")
def db_connection():
    """महंगा है: पूरे session के लिए एक बार database खोलो।"""
    conn = create_database_connection()
    yield conn
    conn.close()

@pytest.fixture(scope="function")
def db_transaction(db_connection):
    """सस्ता है: हर test के लिए नया transaction, बाद में rollback करो।"""
    transaction = db_connection.begin()
    yield db_connection
    transaction.rollback()  # हर test का data rollback हो जाता है

def test_create_user(db_transaction):
    db_transaction.execute("INSERT INTO users (name) VALUES ('Alice')")
    result = db_transaction.execute("SELECT * FROM users WHERE name = 'Alice'")
    assert result.fetchone() is not None

def test_no_user_leakage(db_transaction):
    # पिछला test का INSERT rollback हो गया है!
    result = db_transaction.execute("SELECT * FROM users WHERE name = 'Alice'")
    assert result.fetchone() is None
```

---

## Fixture Teardown

### yield करना (Recommended तरीका)

```python
@pytest.fixture
def temp_file():
    """Temp file बनाओ, test के बाद clean करो।"""
    import tempfile
    import os

    # Setup: yield से पहले की चीजें
    fd, path = tempfile.mkstemp()
    os.write(fd, b"test data")
    os.close(fd)

    yield path  # यह value test को मिल जाती है

    # Teardown: yield के बाद की चीजें
    os.unlink(path)

def test_read_temp_file(temp_file):
    with open(temp_file) as f:
        assert f.read() == "test data"
    # Test खत्म होने के बाद, temp file automatically delete हो जाती है
```

### addfinalizer करना (कम use होता है)

```python
@pytest.fixture
def resource(request):
    """Alternative cleanup तरीका: request.addfinalizer use करना।"""
    r = acquire_resource()

    def cleanup():
        r.release()

    request.addfinalizer(cleanup)
    return r
```

### Teardown चलती है भले ही Test Fail हो

यह बहुत जरूरी है resource leaks रोकने के लिए। `yield` और `addfinalizer` दोनों ही cleanup run करते हैं।

```python
@pytest.fixture
def server():
    srv = start_test_server(port=8080)
    yield srv
    srv.stop()  # यह चलेगा भले ही test exception throw करे
```

---

## conftest.py: Shared Fixtures

यह pytest की **सबसे शक्तिशाली feature** है। Jest में इसका कोई exact equivalent नहीं है।

`conftest.py` में जो fixtures लिखते हो, वह **automatically** उसी directory और सभी subdirectories के सभी tests को मिल जाता है। कोई imports की जरूरत नहीं!

### Project Structure

```
tests/
    conftest.py              # सभी tests के लिए fixtures
    test_auth.py
    test_home.py

    api/
        conftest.py          # सिर्फ api/ tests के लिए fixtures
        test_users.py
        test_products.py

    integration/
        conftest.py          # सिर्फ integration/ tests के लिए fixtures
        test_database.py
```

### Root conftest.py

```python
# tests/conftest.py
import pytest

@pytest.fixture
def auth_headers():
    """सभी tests को automatically मिल जाता है।"""
    return {"Authorization": "Bearer test-token-123"}

@pytest.fixture
def sample_user():
    """सभी tests को automatically मिल जाता है।"""
    return {"id": 1, "name": "Alice", "email": "alice@test.com"}

@pytest.fixture(scope="session")
def app():
    """Flask/FastAPI app एक बार test session के लिए बनाओ।"""
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
    """सिर्फ tests/api/ में available है।
    Parent conftest.py का 'app' fixture automatically inject होता है।"""
    return app.test_client()

@pytest.fixture
def authenticated_client(api_client, auth_headers):
    """Different conftest.py files के fixtures को combine करना।"""
    api_client.default_headers = auth_headers
    return api_client
```

### Shared Fixtures Use करना (कोई imports नहीं!)

```python
# tests/api/test_users.py

# fixtures के लिए कोई imports की जरूरत नहीं! pytest automatically inject करता है।

def test_list_users(authenticated_client):
    response = authenticated_client.get("/api/users")
    assert response.status_code == 200

def test_create_user(authenticated_client, sample_user):
    response = authenticated_client.post("/api/users", json=sample_user)
    assert response.status_code == 201
```

### conftest.py pytest को भी Configure कर सकता है

```python
# tests/conftest.py
import pytest

def pytest_addoption(parser):
    """Custom command-line options add करना।"""
    parser.addoption(
        "--runslow", action="store_true", default=False,
        help="Slow tests को भी चलाओ"
    )

def pytest_collection_modifyitems(config, items):
    """--runslow न दिया तो slow tests skip कर दो।"""
    if not config.getoption("--runslow"):
        skip_slow = pytest.mark.skip(reason="Need --runslow option to run")
        for item in items:
            if "slow" in item.keywords:
                item.add_marker(skip_slow)
```

---

## Fixture Dependency Injection

Fixtures दूसरे fixtures पर depend कर सकते हैं। एक dependency chain बन जाती है।

```python
import pytest

@pytest.fixture
def database_url():
    return "postgresql://localhost:5432/testdb"

@pytest.fixture
def database_connection(database_url):       # database_url पर depend करता है
    conn = connect(database_url)
    yield conn
    conn.close()

@pytest.fixture
def user_repository(database_connection):    # database_connection पर depend करता है
    return UserRepository(database_connection)

@pytest.fixture
def user_service(user_repository):           # user_repository पर depend करता है
    return UserService(user_repository)

# Test सिर्फ वही मांगता है जो चाहिए। pytest पूरी chain build कर देता है।
def test_create_user(user_service):
    # pytest automatically बना देता है: database_url -> database_connection ->
    #   user_repository -> user_service
    user = user_service.create("Alice")
    assert user.name == "Alice"
```

यह एक lightweight dependency injection container जैसे है जो automatically wire करता है।

### Fixture Dependencies Visualize करना

```bash
# देखो कि एक test को कौन से fixtures चाहिए:
pytest --fixtures-per-test test_example.py

# सभी available fixtures देखो:
pytest --fixtures
```

---

## Built-in Fixtures

pytest के साथ कुछ built-in fixtures आते हैं जो super useful हैं।

### tmp_path — Temporary Directory

```python
def test_write_file(tmp_path):
    """tmp_path एक unique temporary directory का pathlib.Path है।"""
    file = tmp_path / "test.txt"
    file.write_text("hello world")

    assert file.read_text() == "hello world"
    assert file.exists()
    # Directory automatically clean हो जाती है

def test_create_structure(tmp_path):
    """Complex file structure testing के लिए बनाओ।"""
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "main.py").write_text("print('hello')")
    (tmp_path / "tests").mkdir()
    (tmp_path / "tests" / "test_main.py").write_text("def test_it(): pass")

    assert (tmp_path / "src" / "main.py").exists()
```

### capsys — stdout/stderr को Capture करना

```python
def greet(name: str) -> None:
    print(f"Hello, {name}!")

def test_greet_output(capsys):
    greet("World")
    captured = capsys.readouterr()
    assert captured.out == "Hello, World!\n"
    assert captured.err == ""
```

### caplog — Logging को Capture करना

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

### request — Test Metadata

```python
def test_example(request):
    print(f"Test का नाम: {request.node.name}")
    print(f"Test file: {request.fspath}")
    print(f"Test markers: {list(request.node.iter_markers())}")
```

---

## unittest.mock: Mock, MagicMock, patch

Python के standard library में एक powerful mocking library है। कुछ install नहीं करना पड़ता 
(अलबत्ता `pytest-mock` अगर चाहो तो ज्यादा nice API देता है)।

### Mock vs jest.fn()

```python
from unittest.mock import Mock, MagicMock

# Mock बनाओ (jest.fn() जैसे ही)
mock_fn = Mock()

# उसे call करो
mock_fn(1, 2, 3)
mock_fn("hello")

# Assert कि यह call हुआ
mock_fn.assert_called()
mock_fn.assert_called_with("hello")  # आखिरी call
mock_fn.assert_any_call(1, 2, 3)     # कोई भी call
assert mock_fn.call_count == 2
```

Jest में ऐसे लिखते हो:
```typescript
// Jest: jest.fn()
const mockFn = jest.fn();
mockFn(1, 2, 3);
mockFn('hello');
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenLastCalledWith('hello');
expect(mockFn).toHaveBeenCalledWith(1, 2, 3);
expect(mockFn).toHaveBeenCalledTimes(2);
```

### return_value और side_effect

```python
from unittest.mock import Mock

# Mock जो specific value return करे (jest.fn().mockReturnValue() जैसे)
mock_db = Mock()
mock_db.get_user.return_value = {"id": 1, "name": "Alice"}
result = mock_db.get_user(1)
assert result == {"id": 1, "name": "Alice"}

# Different return values हर call के लिए (mockReturnValueOnce जैसे)
mock_api = Mock()
mock_api.fetch.side_effect = [
    {"status": "ok"},      # पहली call
    {"status": "error"},   # दूसरी call
    ConnectionError("timeout"),  # तीसरी call exception throw करे!
]
assert mock_api.fetch()["status"] == "ok"
assert mock_api.fetch()["status"] == "error"

import pytest
with pytest.raises(ConnectionError):
    mock_api.fetch()

# Mock जो function की तरह काम करे (mockImplementation जैसे)
mock_calculator = Mock()
mock_calculator.add.side_effect = lambda a, b: a + b
assert mock_calculator.add(2, 3) == 5

# Mock जो हमेशा exception throw करे (mockRejectedValue जैसे)
mock_service = Mock()
mock_service.connect.side_effect = ConnectionError("refused")
with pytest.raises(ConnectionError):
    mock_service.connect()
```

### MagicMock — Magic Methods के साथ Mock

```python
from unittest.mock import MagicMock

# MagicMock Python के magic/dunder methods को support करता है
mock = MagicMock()

# len() support करता है
mock.__len__.return_value = 5
assert len(mock) == 5

# Iteration support करता है
mock.__iter__.return_value = iter([1, 2, 3])
assert list(mock) == [1, 2, 3]

# Context manager support करता है (with statement)
mock.__enter__.return_value = "resource"
with mock as resource:
    assert resource == "resource"

# Subscript access support करता है
mock.__getitem__.return_value = "value"
assert mock["key"] == "value"
```

### Call Details को Assert करना

```python
from unittest.mock import Mock, call

mock_fn = Mock()
mock_fn(1, name="Alice")
mock_fn(2, name="Bob")
mock_fn(3, name="Charlie")

# Specific calls assert करो
mock_fn.assert_called_with(3, name="Charlie")       # आखिरी call
mock_fn.assert_any_call(1, name="Alice")             # कोई भी call

# पूरी call history assert करो
assert mock_fn.call_args_list == [
    call(1, name="Alice"),
    call(2, name="Bob"),
    call(3, name="Charlie"),
]

# Call count assert करो
assert mock_fn.call_count == 3

# Mock reset करो (jest.fn().mockClear() जैसे)
mock_fn.reset_mock()
assert mock_fn.call_count == 0
```

---

## The @patch Decorator

`@patch` एक object को temporarily mock से replace कर देता है एक test के दौरान। 
यह Jest के `jest.mock()` का Python equivalent है।

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

# Method 1: @patch decorator की तरह
@patch("src.weather.requests.get")
def test_get_temperature(mock_get):
    # Mock को configure करो
    mock_response = Mock()
    mock_response.json.return_value = {"temperature": 72.5}
    mock_get.return_value = mock_response

    # Real function को call करो - यह internally mock use करेगा
    from src.weather import get_temperature
    temp = get_temperature("NYC")

    assert temp == 72.5
    mock_get.assert_called_once_with("https://api.weather.com/NYC")

# Method 2: patch को context manager की तरह
def test_get_temperature_context():
    with patch("src.weather.requests.get") as mock_get:
        mock_response = Mock()
        mock_response.json.return_value = {"temperature": 85.0}
        mock_get.return_value = mock_response

        from src.weather import get_temperature
        temp = get_temperature("LA")

        assert temp == 85.0
```

**महत्वपूर्ण:** आप patch करते हो जहाँ चीज **use होती है**, जहाँ **define होती है** नहीं।
`patch("src.weather.requests.get")` सही है, `patch("requests.get")` गलत है।

Jest में:
```typescript
// Jest: jest.mock module level पर
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

test('get temperature', async () => {
    mockedAxios.get.mockResolvedValue({ data: { temperature: 72.5 } });
    const temp = await getTemperature('NYC');
    expect(temp).toBe(72.5);
});
```

### Multiple चीजों को Patch करना

```python
@patch("src.service.send_email")
@patch("src.service.save_to_db")
def test_register_user(mock_save, mock_email):
    # Note: Decorators bottom-up लागू होते हैं, तो parameters reverse order में हैं!
    # mock_save = save_to_db (lower decorator)
    # mock_email = send_email (upper decorator)

    mock_save.return_value = {"id": 1, "name": "Alice"}

    result = register_user("Alice", "alice@test.com")

    mock_save.assert_called_once()
    mock_email.assert_called_once_with("alice@test.com", "Welcome!")
```

### patch.object — किसी Attribute को Patch करना

```python
from unittest.mock import patch

class PaymentGateway:
    def charge(self, amount: float) -> bool:
        # Real implementation external API call करता है
        pass

def test_checkout():
    gateway = PaymentGateway()

    with patch.object(gateway, "charge", return_value=True):
        # अब gateway.charge एक mock है जो True return करता है
        result = gateway.charge(99.99)
        assert result is True
```

### patch.dict — Dictionary को Patch करना

```python
import os
from unittest.mock import patch

@patch.dict(os.environ, {"API_KEY": "test-key", "DEBUG": "1"})
def test_with_env_vars():
    assert os.environ["API_KEY"] == "test-key"
    assert os.environ["DEBUG"] == "1"

@patch.dict(os.environ, {"API_KEY": "test-key"}, clear=True)
def test_with_clean_env():
    # सिर्फ API_KEY exist करेगी - बाकी सब env vars clear हो जाएंगे
    assert os.environ.get("API_KEY") == "test-key"
    assert os.environ.get("PATH") is None
```

---

## monkeypatch Fixture

pytest का एक built-in `monkeypatch` fixture है जो अक्सर `unittest.mock.patch` से ज्यादा easy होता है।
यह automatically हर test के बाद changes undo कर देता है।

### Environment Variables Set करना

```python
def test_api_key(monkeypatch):
    monkeypatch.setenv("API_KEY", "test-key-123")
    monkeypatch.setenv("DEBUG", "true")

    from myapp.config import get_api_key
    assert get_api_key() == "test-key-123"
    # Test के बाद, environment automatically restore हो जाता है

def test_missing_api_key(monkeypatch):
    monkeypatch.delenv("API_KEY", raising=False)

    from myapp.config import get_api_key
    import pytest
    with pytest.raises(EnvironmentError):
        get_api_key()
```

### Attributes को Patch करना

```python
def test_custom_timeout(monkeypatch):
    import myapp.client as client

    # किसी module/object पर attribute replace करो
    monkeypatch.setattr(client, "DEFAULT_TIMEOUT", 1)
    assert client.DEFAULT_TIMEOUT == 1

def test_mock_function(monkeypatch):
    import myapp.auth as auth

    # Function को replace करो
    monkeypatch.setattr(auth, "verify_token", lambda token: True)
    assert auth.verify_token("any-token") is True
```

### Dictionary Items को Patch करना

```python
def test_custom_config(monkeypatch):
    from myapp import config

    monkeypatch.setitem(config.SETTINGS, "max_retries", 1)
    monkeypatch.setitem(config.SETTINGS, "timeout", 0.1)
    # Test के बाद, SETTINGS dict restore हो जाती है
```

### monkeypatch vs unittest.mock.patch

| Feature | monkeypatch | unittest.mock.patch |
|---|---|---|
| Scope | pytest fixture (function scope) | Decorator या context manager |
| Undo | Test के बाद automatic | Automatic (decorator/ctx) या manual |
| Best for | Env vars, simple attr replacement | Full mock objects, call tracking |
| Call assertions | नहीं | हाँ (assert_called_with, etc.) |
| return_value/side_effect | नहीं (Mock() के साथ use करो) | हाँ |

**Rule of thumb:** Simple चीजों के लिए (env vars, config values) `monkeypatch` use करो।
Complex mock behavior और call tracking के लिए `unittest.mock.patch` use करो।

---

## pytest-mock Plugin (Bonus)

`pytest-mock` package एक `mocker` fixture देता है जो `unittest.mock` को wrap करता है।

```bash
pip install pytest-mock
```

```python
def test_with_mocker(mocker):
    # mocker.patch @patch जैसे ही काम करता है, लेकिन fixture की तरह
    mock_get = mocker.patch("src.weather.requests.get")
    mock_get.return_value.json.return_value = {"temperature": 72.5}

    from src.weather import get_temperature
    assert get_temperature("NYC") == 72.5

    # Spies बनाओ (jest.spyOn जैसे)
    spy = mocker.spy(some_module, "some_function")
    some_module.some_function(42)
    spy.assert_called_once_with(42)

    # Mocks बनाओ
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

# आपका कोड यहाँ:
# 1. एक fixture बनाओ जो empty TodoList देता हो
# 2. एक fixture बनाओ जो TodoList + 3 pre-populated items देता हो
# 3. एक factory fixture बनाओ जो custom titles वाले todos create करता हो
# 4. ये tests लिखो:
#    - test_add_todo (empty TodoList fixture use करके)
#    - test_complete_todo (pre-populated fixture use करके)
#    - test_complete_nonexistent_raises (empty fixture + pytest.raises)
#    - test_get_pending (pre-populated fixture जहाँ कुछ complete हों)
#    - test_count (factory fixture use करके variable number के todos बनाओ)
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

# आपका कोड यहाँ:
# 1. एक fixture बनाओ जो fake token के साथ GitHubClient देता हो
# 2. requests.Session को mock करो ताकि real HTTP calls न हों
# 3. test_get_user: parsed JSON return करे
# 4. test_get_repos: repos की list return करे
# 5. test_create_issue: correct payload send करे
# 6. test HTTP errors (404, 500) properly raise होते हैं
# 7. test Authorization header properly set है
```

### Exercise 3: conftest.py Hierarchy

यह test structure बनाओ और shared fixtures implement करो:

```
tests/
    conftest.py           # -> app fixture, auth_token fixture
    test_health.py        # -> test कि app running है

    api/
        conftest.py       # -> api_client fixture (app पर depend करता है)
        test_users.py     # -> api_client use करके tests
        test_products.py  # -> api_client use करके tests

    integration/
        conftest.py       # -> database fixture (session scope)
        test_db.py        # -> database use करके tests
```

सभी conftest.py files और कम से कम 2 tests per file implement करो। 
Child conftest files के fixtures को parent fixtures पर depend करना चाहिए।

### Exercise 4: monkeypatch Environment

```python
# src/config.py
import os

def get_config() -> dict:
    return {
        "database_url": os.environ.get("DATABASE_URL", "sqlite:///dev.db"),
        "debug": os.environ.get("DEBUG", "false").lower() == "true",
        "api_key": os.environ["API_KEY"],  # Required - अगर missing तो KeyError
        "max_connections": int(os.environ.get("MAX_CONNECTIONS", "10")),
    }
```

```python
# tests/test_config.py
# आपका कोड यहाँ:
# 1. Test default values जब env vars set न हों (monkeypatch.delenv use करो)
# 2. Test custom values default को override करते हैं
# 3. Test कि missing API_KEY KeyError raise करता है
# 4. Test debug mode parsing ("true", "True", "TRUE", "false", "0")
# 5. Test invalid MAX_CONNECTIONS ValueError raise करता है
# सभी environment manipulation के लिए monkeypatch use करो
```

---

## Key Takeaways

1. **Fixtures > beforeEach.** Explicit हैं, composable हैं, scoped हैं।
2. **conftest.py magic है।** Shared fixtures zero imports के साथ। Directory hierarchy use करो।
3. **yield से cleanup करो।** yield से पहले setup, बाद में teardown। हमेशा चलता है।
4. **Scope को carefully choose करो।** `session` expensive resources के लिए, `function` isolation के लिए।
5. **Patch जहाँ use होता है।** `patch("myapp.module.requests")` सही है, `patch("requests")` नहीं।
6. **Simple चीजों के लिए monkeypatch।** Env vars, config values, simple attribute replacement।
7. **Complex मocking के लिए unittest.mock।** Call tracking, return values, side effects।

अगला: [Async Testing](./03_async_testing.md) — Python में async/await code को test करना।
