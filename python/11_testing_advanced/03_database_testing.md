# Database Testing Strategies: Test Databases and Fixtures

> **Coming from Node.js?** Database testing in Python is similar to using `jest-mock-extended` or `testcontainers` in Node.js. You'll use SQLite for fast in-memory tests and pytest fixtures for database setup/teardown. Think of fixtures as `beforeEach`/`afterEach` on steroids.

---

## Table of Contents

1. [Database Testing Approaches](#database-testing-approaches)
2. [SQLite In-Memory Testing](#sqlite-in-memory-testing)
3. [Pytest Fixtures for Database Setup](#pytest-fixtures-for-database-setup)
4. [Testing with PostgreSQL (Docker)](#testing-with-postgresql-docker)
5. [Transaction Rollback Pattern](#transaction-rollback-pattern)
6. [Testing Migrations](#testing-migrations)
7. [Seeding Test Data](#seeding-test-data)
8. [Testing Database Constraints](#testing-database-constraints)
9. [Async Database Testing](#async-database-testing)
10. [Practice Exercises](#practice-exercises)

---

## Database Testing Approaches

| Approach | Speed | Realism | Use Case |
|---|---|---|---|
| Mock database | ⚡⚡⚡ Fastest | ❌ Not realistic | Unit tests, external API mocking |
| SQLite in-memory | ⚡⚡ Fast | ⚠️ Mostly realistic | Most integration tests |
| PostgreSQL test DB | ⚡ Slower | ✅ Fully realistic | Critical queries, migrations |
| Docker containers | ⚡ Slow startup | ✅ Production-like | CI/CD, full integration tests |

**Best Practice:** Use SQLite for most tests, PostgreSQL for database-specific features (like JSON columns, full-text search).

---

## SQLite In-Memory Testing

### Example 1: Basic SQLite Test Database

```python
# app/database.py
from sqlalchemy import create_engine, Column, Integer, String, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    is_active = Column(Boolean, default=True)

def get_engine(database_url: str):
    return create_engine(database_url, echo=False)

def get_session_local(engine):
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)

# app/crud.py
from sqlalchemy.orm import Session
from app.database import User

def create_user(db: Session, username: str, email: str) -> User:
    user = User(username=username, email=email)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def get_user_by_username(db: Session, username: str) -> User | None:
    return db.query(User).filter(User.username == username).first()

def get_all_active_users(db: Session) -> list[User]:
    return db.query(User).filter(User.is_active == True).all()
```

```python
# tests/conftest.py
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base

@pytest.fixture(scope="function")
def test_db():
    """Create an in-memory SQLite database for each test"""
    # Use in-memory SQLite database
    engine = create_engine("sqlite:///:memory:", echo=False)
    
    # Create all tables
    Base.metadata.create_all(engine)
    
    # Create session
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    yield db  # Provide the session to the test
    
    # Cleanup
    db.close()
    Base.metadata.drop_all(engine)

# tests/test_crud.py
from app.crud import create_user, get_user_by_username, get_all_active_users
from app.database import User

def test_create_user(test_db):
    """Test creating a user"""
    user = create_user(test_db, "john_doe", "john@example.com")
    
    assert user.id is not None
    assert user.username == "john_doe"
    assert user.email == "john@example.com"
    assert user.is_active is True

def test_get_user_by_username(test_db):
    """Test retrieving user by username"""
    # Create user first
    create_user(test_db, "jane_doe", "jane@example.com")
    
    # Retrieve user
    user = get_user_by_username(test_db, "jane_doe")
    
    assert user is not None
    assert user.email == "jane@example.com"

def test_get_user_not_found(test_db):
    """Test retrieving non-existent user"""
    user = get_user_by_username(test_db, "nonexistent")
    assert user is None

def test_get_all_active_users(test_db):
    """Test getting all active users"""
    # Create multiple users
    create_user(test_db, "user1", "user1@example.com")
    create_user(test_db, "user2", "user2@example.com")
    create_user(test_db, "user3", "user3@example.com")
    
    # Deactivate one user
    user2 = get_user_by_username(test_db, "user2")
    user2.is_active = False
    test_db.commit()
    
    # Get active users
    active_users = get_all_active_users(test_db)
    
    assert len(active_users) == 2
    usernames = [u.username for u in active_users]
    assert "user1" in usernames
    assert "user3" in usernames
    assert "user2" not in usernames
```

---

## Pytest Fixtures for Database Setup

### Example 2: Reusable Database Fixtures

```python
# tests/conftest.py
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.database import Base, User
from faker import Faker

fake = Faker()

@pytest.fixture(scope="session")
def engine():
    """Create engine once per test session"""
    return create_engine("sqlite:///:memory:")

@pytest.fixture(scope="function")
def tables(engine):
    """Create tables for each test"""
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)

@pytest.fixture(scope="function")
def db_session(engine, tables):
    """Create a new database session for each test"""
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    yield session
    session.rollback()
    session.close()

@pytest.fixture
def sample_user(db_session):
    """Create a sample user for testing"""
    user = User(
        username=fake.user_name(),
        email=fake.email(),
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def sample_users(db_session):
    """Create multiple sample users"""
    users = []
    for _ in range(5):
        user = User(
            username=fake.user_name(),
            email=fake.email(),
            is_active=True
        )
        db_session.add(user)
        users.append(user)
    
    db_session.commit()
    for user in users:
        db_session.refresh(user)
    
    return users

# tests/test_with_fixtures.py
def test_sample_user_fixture(sample_user):
    """Test using the sample_user fixture"""
    assert sample_user.id is not None
    assert sample_user.is_active is True

def test_sample_users_fixture(sample_users):
    """Test using the sample_users fixture"""
    assert len(sample_users) == 5
    assert all(user.is_active for user in sample_users)

def test_database_isolation(db_session, sample_user):
    """Test that database is isolated between tests"""
    # This test has access to sample_user
    users = db_session.query(User).all()
    assert len(users) == 1  # Only the sample_user exists

def test_fresh_database(db_session):
    """Test that each test starts with fresh database"""
    # This test has empty database (sample_user not included)
    users = db_session.query(User).all()
    assert len(users) == 0
```

---

## Testing with PostgreSQL (Docker)

### Example 3: PostgreSQL Test Container

```python
# tests/conftest.py
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from testcontainers.postgres import PostgresContainer
from app.database import Base

@pytest.fixture(scope="session")
def postgres_container():
    """Start PostgreSQL container for the test session"""
    with PostgresContainer("postgres:16") as postgres:
        yield postgres

@pytest.fixture(scope="session")
def postgres_engine(postgres_container):
    """Create engine connected to test PostgreSQL"""
    engine = create_engine(postgres_container.get_connection_url())
    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)
    engine.dispose()

@pytest.fixture(scope="function")
def postgres_db(postgres_engine):
    """Create a new database session for each test"""
    SessionLocal = sessionmaker(bind=postgres_engine)
    session = SessionLocal()
    
    yield session
    
    session.rollback()
    session.close()

# tests/test_postgres_specific.py
def test_postgres_json_column(postgres_db):
    """Test PostgreSQL-specific JSON column"""
    from sqlalchemy import Column, Integer
    from sqlalchemy.dialects.postgresql import JSONB
    
    # This test would fail on SQLite but works on PostgreSQL
    # Test JSON queries, full-text search, etc.
    pass
```

**Installation:**

```bash
pip install testcontainers[postgres]
```

---

## Transaction Rollback Pattern

### Example 4: Automatic Transaction Rollback

```python
# tests/conftest.py
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

@pytest.fixture(scope="function")
def db_with_rollback():
    """Database session that automatically rolls back after test"""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    
    # Start a transaction
    session.begin()
    
    yield session
    
    # Rollback transaction (undoes all changes)
    session.rollback()
    session.close()

# tests/test_rollback.py
def test_changes_are_rolled_back(db_with_rollback):
    """Test that changes don't persist after test"""
    user = User(username="test", email="test@example.com")
    db_with_rollback.add(user)
    db_with_rollback.commit()
    
    # User exists in this test
    assert db_with_rollback.query(User).count() == 1
    
    # But will be rolled back after test ends

def test_database_is_clean(db_with_rollback):
    """Verify database starts clean"""
    # Even though previous test added a user, it was rolled back
    assert db_with_rollback.query(User).count() == 0
```

---

## Testing Migrations

### Example 5: Testing Alembic Migrations

```python
# tests/test_migrations.py
import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect

def test_migrations_run_successfully():
    """Test that all migrations can be applied"""
    # Create test database
    engine = create_engine("sqlite:///:memory:")
    
    # Configure Alembic
    alembic_cfg = Config("alembic.ini")
    alembic_cfg.set_main_option("sqlalchemy.url", str(engine.url))
    
    # Run migrations
    command.upgrade(alembic_cfg, "head")
    
    # Verify tables were created
    inspector = inspect(engine)
    table_names = inspector.get_table_names()
    
    assert "users" in table_names
    assert "alembic_version" in table_names

def test_migration_downgrade():
    """Test that migrations can be rolled back"""
    engine = create_engine("sqlite:///:memory:")
    alembic_cfg = Config("alembic.ini")
    alembic_cfg.set_main_option("sqlalchemy.url", str(engine.url))
    
    # Upgrade to latest
    command.upgrade(alembic_cfg, "head")
    
    # Downgrade one revision
    command.downgrade(alembic_cfg, "-1")
    
    # Verify downgrade worked
    inspector = inspect(engine)
    # Check that expected changes were reverted

def test_migration_schema_matches_models():
    """Test that migrations produce same schema as models"""
    from sqlalchemy.schema import CreateTable
    
    # Create database from migrations
    engine_migrated = create_engine("sqlite:///:memory:")
    alembic_cfg = Config("alembic.ini")
    alembic_cfg.set_main_option("sqlalchemy.url", str(engine_migrated.url))
    command.upgrade(alembic_cfg, "head")
    
    # Create database from models
    engine_models = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine_models)
    
    # Compare schemas
    inspector_migrated = inspect(engine_migrated)
    inspector_models = inspect(engine_models)
    
    tables_migrated = set(inspector_migrated.get_table_names())
    tables_models = set(inspector_models.get_table_names())
    
    # Ignore alembic_version table
    tables_migrated.discard("alembic_version")
    
    assert tables_migrated == tables_models
```

---

## Seeding Test Data

### Example 6: Factory Pattern for Test Data

```python
# tests/factories.py
import factory
from factory.alchemy import SQLAlchemyModelFactory
from app.database import User, Post
from faker import Faker

fake = Faker()

class UserFactory(SQLAlchemyModelFactory):
    class Meta:
        model = User
        sqlalchemy_session_persistence = "commit"
    
    username = factory.Sequence(lambda n: f"user_{n}")
    email = factory.LazyAttribute(lambda obj: f"{obj.username}@example.com")
    is_active = True

class PostFactory(SQLAlchemyModelFactory):
    class Meta:
        model = Post
        sqlalchemy_session_persistence = "commit"
    
    title = factory.Faker("sentence")
    content = factory.Faker("paragraph")
    author = factory.SubFactory(UserFactory)

# tests/conftest.py
@pytest.fixture
def user_factory(db_session):
    """Factory for creating users"""
    UserFactory._meta.sqlalchemy_session = db_session
    return UserFactory

@pytest.fixture
def post_factory(db_session):
    """Factory for creating posts"""
    PostFactory._meta.sqlalchemy_session = db_session
    return PostFactory

# tests/test_with_factories.py
def test_create_user_with_factory(user_factory):
    """Test creating user with factory"""
    user = user_factory()
    
    assert user.id is not None
    assert user.username.startswith("user_")
    assert user.is_active is True

def test_create_multiple_users(user_factory):
    """Test creating multiple users"""
    users = user_factory.create_batch(10)
    
    assert len(users) == 10
    assert len(set(u.username for u in users)) == 10  # All unique

def test_create_post_with_author(post_factory):
    """Test creating post with related author"""
    post = post_factory()
    
    assert post.author is not None
    assert post.author.id is not None
```

**Installation:**

```bash
pip install factory-boy faker
```

---

## Testing Database Constraints

### Example 7: Testing Unique Constraints and Validation

```python
# tests/test_constraints.py
import pytest
from sqlalchemy.exc import IntegrityError
from app.database import User
from app.crud import create_user

def test_unique_username_constraint(test_db):
    """Test that duplicate usernames are rejected"""
    create_user(test_db, "john", "john1@example.com")
    
    with pytest.raises(IntegrityError):
        create_user(test_db, "john", "john2@example.com")  # Duplicate username

def test_unique_email_constraint(test_db):
    """Test that duplicate emails are rejected"""
    create_user(test_db, "john", "john@example.com")
    
    with pytest.raises(IntegrityError):
        create_user(test_db, "jane", "john@example.com")  # Duplicate email

def test_nullable_constraint(test_db):
    """Test that required fields cannot be null"""
    user = User(username="test")  # Missing email
    test_db.add(user)
    
    with pytest.raises(IntegrityError):
        test_db.commit()

def test_cascade_delete(test_db):
    """Test that deleting user cascades to posts"""
    # Create user with posts
    user = create_user(test_db, "john", "john@example.com")
    
    post1 = Post(title="Post 1", content="Content", author_id=user.id)
    post2 = Post(title="Post 2", content="Content", author_id=user.id)
    test_db.add_all([post1, post2])
    test_db.commit()
    
    # Delete user
    test_db.delete(user)
    test_db.commit()
    
    # Posts should be deleted too (if cascade is configured)
    assert test_db.query(Post).count() == 0
```

---

## Async Database Testing

### Example 8: Testing Async SQLAlchemy

```python
# app/async_crud.py
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy import select
from app.database import User

async def create_user_async(db: AsyncSession, username: str, email: str) -> User:
    """Async version of create_user"""
    user = User(username=username, email=email)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

async def get_user_async(db: AsyncSession, user_id: int) -> User | None:
    """Get user asynchronously"""
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()

# tests/conftest.py
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

@pytest_asyncio.fixture
async def async_db():
    """Create async database session"""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    AsyncSessionLocal = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with AsyncSessionLocal() as session:
        yield session
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine.dispose()

# tests/test_async_crud.py
import pytest
from app.async_crud import create_user_async, get_user_async

@pytest.mark.asyncio
async def test_create_user_async(async_db):
    """Test async user creation"""
    user = await create_user_async(async_db, "john", "john@example.com")
    
    assert user.id is not None
    assert user.username == "john"

@pytest.mark.asyncio
async def test_get_user_async(async_db):
    """Test async user retrieval"""
    created_user = await create_user_async(async_db, "jane", "jane@example.com")
    
    retrieved_user = await get_user_async(async_db, created_user.id)
    
    assert retrieved_user is not None
    assert retrieved_user.username == "jane"
```

**Installation:**

```bash
pip install pytest-asyncio aiosqlite
```

---

## Practice Exercises

### Exercise 1: Multi-Table Relationships

```python
# TODO: Create models for Blog (User, Post, Comment)
# TODO: Test creating posts with comments
# TODO: Test querying posts with eager loading
# TODO: Test cascade deletes
```

### Exercise 2: Complex Queries

```python
# TODO: Test queries with joins
# TODO: Test aggregations (COUNT, SUM, AVG)
# TODO: Test pagination with large datasets
# TODO: Test filtering and sorting
```

### Exercise 3: Transaction Testing

```python
# TODO: Test atomic transactions
# TODO: Test rollback on error
# TODO: Test concurrent access (race conditions)
```

### Exercise 4: Migration Testing

```python
# TODO: Create migration that adds column
# TODO: Test data migration
# TODO: Test rollback migration
# TODO: Verify no data loss
```

---

## Summary

You've learned:

✅ Using SQLite in-memory for fast tests  
✅ Creating reusable pytest fixtures for database setup  
✅ Testing with PostgreSQL using Docker containers  
✅ Transaction rollback pattern for test isolation  
✅ Testing database migrations with Alembic  
✅ Using factories for test data generation  
✅ Testing database constraints  
✅ Async database testing

**Key Takeaway:** Use SQLite for speed, PostgreSQL for realism, fixtures for setup, and factories for test data!

**Next Tutorial:** Testing async code with pytest-asyncio
