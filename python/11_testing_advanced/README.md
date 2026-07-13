# Advanced Testing in Python

FastAPI, external APIs, databases aur async code ke liye comprehensive testing strategies.

## Prerequisites

- Pehle [04_testing_and_tooling](../04_testing_and_tooling/) complete kar lo
- pytest basics ka basic knowledge ho
- FastAPI aur SQLAlchemy ka understanding ho

## Kya Seekhoge?

- E2E testing FastAPI ke saath TestClient use karke
- External APIs ko mock karna (httpx, responses library)
- Database testing strategies (SQLite, PostgreSQL, fixtures)
- Async code testing pytest-asyncio ke saath
- LangChain/LLM applications ko test karna
- Coverage aur CI/CD integration

## Tutorials

### [01 - FastAPI Testing: E2E with TestClient](./01_fastapi_testing_e2e.md)

FastAPI applications ke liye comprehensive E2E testing seekho:
- TestClient basics aur setup
- CRUD operations ko test karna
- Request validation aur response models
- Authentication aur authorization testing
- File uploads aur WebSockets
- Background tasks
- Dependency injection aur overrides

**Key Concepts:** TestClient, dependency overrides, fixture patterns

### [02 - Mocking External APIs](./02_mocking_external_apis.md)

External dependencies ke liye mocking strategies master karo:
- unittest.mock vs pytest-mock
- HTTP requests ko mock karna (responses library)
- Databases ko mock karna (SQLAlchemy, Redis, S3)
- LangChain aur OpenAI applications ko test karna
- Advanced mocking patterns
- Common pitfalls aur best practices

**Key Concepts:** Mocking, responses, pytest-mock, dependency injection

### [03 - Database Testing Strategies](./03_database_testing.md)

Database testing ke liye comprehensive approaches:
- SQLite in-memory testing
- Pytest fixtures for database setup
- PostgreSQL testing with Docker
- Transaction rollback pattern
- Testing migrations (Alembic)
- Seeding test data with factories
- Testing constraints aur relationships
- Async database testing

**Key Concepts:** Test databases, fixtures, factories, transactions

## Installation

```bash
# Core testing dependencies
pip install pytest pytest-asyncio pytest-cov pytest-mock

# FastAPI testing
pip install fastapi[standard] httpx

# Mocking libraries
pip install responses faker

# Database testing
pip install sqlalchemy alembic factory-boy

# Optional: PostgreSQL testing
pip install testcontainers[postgres] psycopg2-binary

# Async database
pip install aiosqlite asyncpg
```

## Quick Start

```python
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_users.py

# Run tests matching pattern
pytest -k "test_create"

# Run with verbose output
pytest -v

# Stop on first failure
pytest -x

# Run last failed tests
pytest --lf
```

## Project Structure

```
my_fastapi_app/
├── app/
│   ├── __init__.py
│   ├── main.py           # FastAPI app
│   ├── models.py         # Pydantic models
│   ├── database.py       # Database setup
│   ├── crud.py           # Database operations
│   └── dependencies.py   # Dependency injection
├── tests/
│   ├── conftest.py       # Shared fixtures
│   ├── factories.py      # Test data factories
│   ├── test_api.py       # API endpoint tests
│   ├── test_crud.py      # Database operation tests
│   └── test_auth.py      # Authentication tests
├── pytest.ini            # Pytest configuration
└── pyproject.toml        # Project dependencies
```

## Testing Best Practices

### 1. Fixtures Use Karo Setup Ke Liye

Socho Zomato ke backend ke baare mein — har test ko fresh database chahiye, bilkul jaise har order ke liye fresh kitchen. Fixtures yeh karte hain:

```python
@pytest.fixture
def test_db():
    """Create test database"""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)
```

### 2. Dependency Overrides Karo Mocking Ke Liye

Auth logic ko test karte time, real auth server na call karke mock karo. Bilkul IRCTC ke test environment jaisa:

```python
def test_protected_endpoint():
    async def mock_auth():
        return {"user_id": 1}
    
    app.dependency_overrides[get_current_user] = mock_auth
    response = client.get("/protected")
    app.dependency_overrides.clear()
```

### 3. Happy Aur Unhappy Dono Paths Test Karo

Real life example: Swiggy par order dar ke scenarios:
- Order successfully place ho jaaye ✓
- Payment fail ho jaaye ✗
- Duplicate order detect ho jaaye ✗

```python
def test_create_user_success():
    # Test with valid data
    pass

def test_create_user_invalid_email():
    # Test validation failure
    pass

def test_create_user_duplicate():
    # Test constraint violation
    pass
```

### 4. Parametrize Use Karo Similar Tests Ke Liye

Jab same logic ko multiple inputs se test karna ho:

```python
@pytest.mark.parametrize("status,expected", [
    ("active", True),
    ("inactive", False),
    ("pending", False),
])
def test_user_status(status, expected):
    user = User(status=status)
    assert user.is_active() == expected
```

## Coverage Goals

- **80%+ coverage** aim karo critical business logic ke liye
- **100% coverage** authentication aur authorization ke liye (yeh sabse important hai!)
- **Lower coverage OK** simple CRUD operations ke liye

```bash
# Generate coverage report
pytest --cov=app --cov-report=term-missing

# Generate HTML report
pytest --cov=app --cov-report=html
open htmlcov/index.html
```

> [!tip]
> Coverage report dekh kar pata chal jaata hai kaunse parts untested hain. HTML report bahut helpful hota hai visualization ke liye.

## CI/CD Integration

### GitHub Actions Example

Production mein jaate time, har commit pe automatically tests run honge:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.12'
      
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-cov
      
      - name: Run tests
        run: pytest --cov=app --cov-report=xml
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Common Patterns

### Pattern 1: FastAPI TestClient Se Testing

Sabse basic pattern — FastAPI app ko test karna:

```python
from fastapi.testclient import TestClient

client = TestClient(app)

def test_endpoint():
    response = client.get("/users/")
    assert response.status_code == 200
```

### Pattern 2: External API Ko Mock Karna

Jab third-party API call karna ho (payment gateway, weather API, etc.), mock kar dete hain:

```python
@responses.activate
def test_external_api():
    responses.add(
        responses.GET,
        "https://api.example.com/data",
        json={"result": "success"}
    )
    
    result = fetch_external_data()
    assert result["result"] == "success"
```

### Pattern 3: Database Fixture With Rollback

Har test ke baad database ko clean state mein lana zaroori hai:

```python
@pytest.fixture
def db_session():
    session = SessionLocal()
    session.begin()
    yield session
    session.rollback()
    session.close()
```

## Troubleshooting

### Tests Slow Chal Rahe Hain?
- SQLite in-memory use karo PostgreSQL ki jagah
- `pytest-xdist` se parallel execution: `pytest -n auto`
- External API calls ko mock karo

> [!warning]
> Real database connections slow hote hain. Whenever possible, in-memory SQLite use karo development mein.

### Flaky Tests (Kabhi Pass, Kabhi Fail)
- Ensure proper test isolation (fixtures ka sahi use)
- Tests ke beech shared state na ho
- Time-dependent functions ko mock karo

### Database Errors
- Check karho ki migrations up to date hain
- Verify karo ki test database properly cleaned up ho raha hai
- Constraint definitions match kar rahe hain na?

## Next Steps

Jab ye sab master kar lo:

1. **Performance testing** seekho locust ke saath
2. **Property-based testing** explore karo Hypothesis se
3. **Contract testing** study karo Pact ke saath
4. **Mutation testing** implement karo mutmut se

## Resources

- [pytest documentation](https://docs.pytest.org/)
- [FastAPI testing guide](https://fastapi.tiangolo.com/tutorial/testing/)
- [responses library](https://github.com/getsentry/responses)
- [factory_boy documentation](https://factoryboy.readthedocs.io/)
- [SQLAlchemy testing](https://docs.sqlalchemy.org/en/20/orm/session_transaction.html#joining-a-session-into-an-external-transaction-such-as-for-test-suites)

## Contributing

Koi issue mila ya suggestion hai? Contribute karo!

---

## Key Takeaways

- **Fast tests** — Tests quickly run hone chahiye, jisse dev cycle smooth rahe
- **Isolated tests** — Har test independent hona chahiye, doosre tests pe depend na kare
- **Reliable tests** — Tests consistent results dein, flaky na ho
- **One thing at a time** — Har test ek specific scenario test kare, multiple things na mix kare

**Yaad rakho:** Achche tests likhna ek skill hai, practice se ata hai!
