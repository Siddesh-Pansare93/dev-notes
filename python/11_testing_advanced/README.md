# Advanced Testing in Python

Comprehensive testing strategies for FastAPI, external APIs, databases, and async code.

## Prerequisites

- Complete [04_testing_and_tooling](../04_testing_and_tooling/) first
- Familiarity with pytest basics
- Understanding of FastAPI and SQLAlchemy

## What You'll Learn

- E2E testing with FastAPI TestClient
- Mocking external APIs (httpx, responses library)
- Database testing strategies (SQLite, PostgreSQL, fixtures)
- Testing async code with pytest-asyncio
- Testing LangChain/LLM applications
- Coverage and CI/CD integration

## Tutorials

### [01 - FastAPI Testing: E2E with TestClient](./01_fastapi_testing_e2e.md)
Learn comprehensive E2E testing for FastAPI applications:
- TestClient basics and setup
- Testing CRUD operations
- Request validation and response models
- Authentication and authorization testing
- File uploads and WebSockets
- Background tasks
- Dependency injection and overrides

**Key Concepts:** TestClient, dependency overrides, fixture patterns

### [02 - Mocking External APIs](./02_mocking_external_apis.md)
Master mocking strategies for external dependencies:
- unittest.mock vs pytest-mock
- Mocking HTTP requests (responses library)
- Mocking databases (SQLAlchemy, Redis, S3)
- Testing LangChain and OpenAI applications
- Advanced mocking patterns
- Common pitfalls and best practices

**Key Concepts:** Mocking, responses, pytest-mock, dependency injection

### [03 - Database Testing Strategies](./03_database_testing.md)
Comprehensive database testing approaches:
- SQLite in-memory testing
- Pytest fixtures for database setup
- PostgreSQL testing with Docker
- Transaction rollback pattern
- Testing migrations (Alembic)
- Seeding test data with factories
- Testing constraints and relationships
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

### 1. Use Fixtures for Setup

```python
@pytest.fixture
def test_db():
    """Create test database"""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)
```

### 2. Use Dependency Overrides

```python
def test_protected_endpoint():
    async def mock_auth():
        return {"user_id": 1}
    
    app.dependency_overrides[get_current_user] = mock_auth
    response = client.get("/protected")
    app.dependency_overrides.clear()
```

### 3. Test Both Happy and Unhappy Paths

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

### 4. Use Parametrize for Similar Tests

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

- **Aim for 80%+ coverage** for critical business logic
- **100% coverage** for authentication and authorization
- **Lower coverage OK** for simple CRUD operations

```bash
# Generate coverage report
pytest --cov=app --cov-report=term-missing

# Generate HTML report
pytest --cov=app --cov-report=html
open htmlcov/index.html
```

## CI/CD Integration

### GitHub Actions Example

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

### Pattern 1: Testing with FastAPI TestClient

```python
from fastapi.testclient import TestClient

client = TestClient(app)

def test_endpoint():
    response = client.get("/users/")
    assert response.status_code == 200
```

### Pattern 2: Mocking External API

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

### Pattern 3: Database Fixture with Rollback

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

### Tests Are Slow
- Use SQLite in-memory instead of PostgreSQL
- Use `pytest-xdist` for parallel execution: `pytest -n auto`
- Mock external API calls

### Flaky Tests
- Ensure proper test isolation (use fixtures)
- Avoid shared state between tests
- Mock time-dependent functions

### Database Errors
- Ensure migrations are up to date
- Check that test database is properly cleaned up
- Verify constraint definitions match

## Next Steps

After mastering these tutorials:

1. Learn about **performance testing** with locust
2. Explore **property-based testing** with Hypothesis
3. Study **contract testing** with Pact
4. Implement **mutation testing** with mutmut

## Resources

- [pytest documentation](https://docs.pytest.org/)
- [FastAPI testing guide](https://fastapi.tiangolo.com/tutorial/testing/)
- [responses library](https://github.com/getsentry/responses)
- [factory_boy documentation](https://factoryboy.readthedocs.io/)
- [SQLAlchemy testing](https://docs.sqlalchemy.org/en/20/orm/session_transaction.html#joining-a-session-into-an-external-transaction-such-as-for-test-suites)

## Contributing

Found an issue or have a suggestion? Please contribute!

---

**Remember:** Good tests are fast, isolated, reliable, and test one thing at a time!
