# Database Testing Strategies: Test Databases aur Fixtures

> **Node.js se aa rahe ho?** Python mein database testing bilkul `jest-mock-extended` ya `testcontainers` jaise hi hota hai. SQLite se fast in-memory tests chalate ho aur pytest fixtures se database setup/teardown handle karte ho. Soch fixtures ko `beforeEach`/`afterEach` par steroids de diye aur unhe `@` de diye — bas yeh zyada powerful hote hain!

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

Socho ek Zomato delivery order trace karte time — kabhi fast track chahiye (mock), kabhi realistic data chahiye (real DB). Testing bhi same logic follow karta hai!

| Approach | Speed | Realism | Kab use kare |
|---|---|---|---|
| Mock database | ⚡⚡⚡ Sabse fast | ❌ Realistic nahi | Unit tests, external API mocking |
| SQLite in-memory | ⚡⚡ Fast | ⚠️ Mostly realistic | Zyada tar integration tests |
| PostgreSQL test DB | ⚡ Thoda slow | ✅ Bilkul realistic | Critical queries, migrations |
| Docker containers | ⚡ Startup slow | ✅ Production jaisa | CI/CD, full integration tests |

**Best Practice:** Zyada tar tests ke liye SQLite use karo, aur jahan PostgreSQL-specific features chahiye (JSON columns, full-text search) wahan PostgreSQL use karo — bilkul Swiggy ka approach, jahan har order ke liye different strategy!

---

## SQLite In-Memory Testing

Kya hota hai? In-memory SQLite matlab RAM mein complete database chalata hai — disk touch nahi karta, isliye bilkul rocket speed!

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
    # User create kar, database mein add kar, aur refresh kar
    user = User(username=username, email=email)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def get_user_by_username(db: Session, username: str) -> User | None:
    # Username se user dhundo
    return db.query(User).filter(User.username == username).first()

def get_all_active_users(db: Session) -> list[User]:
    # Sirf active users dikhao (Zomato mein delivery available wale restaurants jaise!)
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
    """Har test ke liye fresh in-memory SQLite database banao"""
    # In-memory SQLite - RAM mein sab kuch rahega, test khatm hote hi saaf ho jayega!
    engine = create_engine("sqlite:///:memory:", echo=False)
    
    # Sab tables create karo
    Base.metadata.create_all(engine)
    
    # Database session banao
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    yield db  # Test ko session do
    
    # Cleanup - test khatm hone ke baad sab kuch saaf kar
    db.close()
    Base.metadata.drop_all(engine)

# tests/test_crud.py
from app.crud import create_user, get_user_by_username, get_all_active_users
from app.database import User

def test_create_user(test_db):
    """Test karo ke user create hota hai correctly"""
    user = create_user(test_db, "john_doe", "john@example.com")
    
    assert user.id is not None
    assert user.username == "john_doe"
    assert user.email == "john@example.com"
    assert user.is_active is True

def test_get_user_by_username(test_db):
    """Test karo ke username se user mil jaata hai"""
    # Pehle user banao
    create_user(test_db, "jane_doe", "jane@example.com")
    
    # Phir user dhoondho
    user = get_user_by_username(test_db, "jane_doe")
    
    assert user is not None
    assert user.email == "jane@example.com"

def test_get_user_not_found(test_db):
    """Test karo ke non-existent user ke liye None return ho"""
    user = get_user_by_username(test_db, "nonexistent")
    assert user is None

def test_get_all_active_users(test_db):
    """Test karo ke sirf active users return hote hain"""
    # Multiple users banao
    create_user(test_db, "user1", "user1@example.com")
    create_user(test_db, "user2", "user2@example.com")
    create_user(test_db, "user3", "user3@example.com")
    
    # Ek user ko deactivate kar
    user2 = get_user_by_username(test_db, "user2")
    user2.is_active = False
    test_db.commit()
    
    # Active users get karo
    active_users = get_all_active_users(test_db)
    
    assert len(active_users) == 2
    usernames = [u.username for u in active_users]
    assert "user1" in usernames
    assert "user3" in usernames
    assert "user2" not in usernames
```

---

## Pytest Fixtures for Database Setup

Kyun zaruri hai? Har test mein manually database setup karna matlab duplicate code likhna — DRY principle ka ulanghan! Fixtures se ek jagah likho, sab jagah use karo.

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
    """Pura test session ke liye ek engine banao (IRCTC ticket booking ke liye ek server jaise!)"""
    return create_engine("sqlite:///:memory:")

@pytest.fixture(scope="function")
def tables(engine):
    """Har test se pehle tables create karo, baad mein clean kar"""
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)

@pytest.fixture(scope="function")
def db_session(engine, tables):
    """Har test ko fresh database session do"""
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    yield session
    session.rollback()  # Sab changes undo kar (Undo button jaise!)
    session.close()

@pytest.fixture
def sample_user(db_session):
    """Ek sample user ready kar testing ke liye"""
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
    """5 sample users ready kar"""
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
    """Test karo ke sample_user fixture properly kaam karta hai"""
    assert sample_user.id is not None
    assert sample_user.is_active is True

def test_sample_users_fixture(sample_users):
    """Test karo ke sample_users fixture 5 users banata hai"""
    assert len(sample_users) == 5
    assert all(user.is_active for user in sample_users)

def test_database_isolation(db_session, sample_user):
    """Test karo ke database tests ke beech isolated rehta hai"""
    # Iss test ko sirf sample_user milega (jaise isolated compartment)
    users = db_session.query(User).all()
    assert len(users) == 1  # Sirf sample_user hi hai

def test_fresh_database(db_session):
    """Test karo ke har test ko fresh database milta hai"""
    # Iss test ko empty database milega (sample_user include nahi)
    users = db_session.query(User).all()
    assert len(users) == 0
```

---

## Testing with PostgreSQL (Docker)

Kab use kare? Jab SQLite se kaam nahi ban raha aur production-like environment chahiye! Docker se PostgreSQL container spinup kar — bilkul IRCTC ka reservation system jaise isolated environment banao!

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
    """PostgreSQL container start kar pura test session ke liye"""
    with PostgresContainer("postgres:16") as postgres:
        yield postgres

@pytest.fixture(scope="session")
def postgres_engine(postgres_container):
    """Test PostgreSQL se engine banao"""
    engine = create_engine(postgres_container.get_connection_url())
    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)
    engine.dispose()

@pytest.fixture(scope="function")
def postgres_db(postgres_engine):
    """Har test ko fresh database session do"""
    SessionLocal = sessionmaker(bind=postgres_engine)
    session = SessionLocal()
    
    yield session
    
    session.rollback()
    session.close()

# tests/test_postgres_specific.py
def test_postgres_json_column(postgres_db):
    """Test karo PostgreSQL-specific JSON column (SQLite mein nahi chalega!)"""
    from sqlalchemy import Column, Integer
    from sqlalchemy.dialects.postgresql import JSONB
    
    # Yeh test SQLite par fail hoga, lekin PostgreSQL par kaam karega
    # JSON queries, full-text search, etc. test karo
    pass
```

**Installation:**

```bash
pip install testcontainers[postgres]
```

> [!info]
> Docker lagta hai jaise big cheez hai, lekin testcontainers automatically handle kar deta hai — ek line mein PostgreSQL container spinup ho jaata hai!

---

## Transaction Rollback Pattern

Socho ek Paytm transaction ke baad agar kuch problem aa jaye, toh pura amount wapas aa jaata hai. Database testing mein bhi yahi strategy — test khatm hone ke baad rollback kar do!

### Example 4: Automatic Transaction Rollback

```python
# tests/conftest.py
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

@pytest.fixture(scope="function")
def db_with_rollback():
    """Database session jo automatically rollback kar dega test ke baad"""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    
    # Transaction start kar
    session.begin()
    
    yield session
    
    # Rollback kar do - sab changes undo! (Undo button press karne jaise!)
    session.rollback()
    session.close()

# tests/test_rollback.py
def test_changes_are_rolled_back(db_with_rollback):
    """Test karo ke changes test ke baad persist nahi hote"""
    user = User(username="test", email="test@example.com")
    db_with_rollback.add(user)
    db_with_rollback.commit()
    
    # Iss test mein user exist karega
    assert db_with_rollback.query(User).count() == 1
    
    # Lekin test khatm hone ke baad rollback ho jayega

def test_database_is_clean(db_with_rollback):
    """Verify karo ke database fresh shuru hota hai"""
    # Pichle test mein user add tha, lekin ab rollback ho gaya
    assert db_with_rollback.query(User).count() == 0
```

> [!warning]
> Rollback pattern bilkul helpful hai speed ke liye, lekin real database behavior test karna complicated hota hai — migrations jaise critical things ke liye actual database use karo!

---

## Testing Migrations

Kya hota hai? Alembic migrations test karna matlab check karna ke database schema changes properly apply ho rahe hain, aur downgrade bhi safe hai.

### Example 5: Testing Alembic Migrations

```python
# tests/test_migrations.py
import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect

def test_migrations_run_successfully():
    """Test karo ke sab migrations successfully apply ho jayein"""
    # Test database banao
    engine = create_engine("sqlite:///:memory:")
    
    # Alembic configure kar
    alembic_cfg = Config("alembic.ini")
    alembic_cfg.set_main_option("sqlalchemy.url", str(engine.url))
    
    # Migrations run kar (upgrade to latest version)
    command.upgrade(alembic_cfg, "head")
    
    # Verify karo ke tables bane hain
    inspector = inspect(engine)
    table_names = inspector.get_table_names()
    
    assert "users" in table_names
    assert "alembic_version" in table_names

def test_migration_downgrade():
    """Test karo ke migrations ko rollback kiya ja sakta hai"""
    engine = create_engine("sqlite:///:memory:")
    alembic_cfg = Config("alembic.ini")
    alembic_cfg.set_main_option("sqlalchemy.url", str(engine.url))
    
    # Pehle latest version tak upgrade kar
    command.upgrade(alembic_cfg, "head")
    
    # Phir ek step peeche aao (undo button)
    command.downgrade(alembic_cfg, "-1")
    
    # Verify karo ke downgrade kaam kar gaya
    inspector = inspect(engine)
    # Check karo ke expected changes revert ho gaye

def test_migration_schema_matches_models():
    """Test karo ke migrations aur models same schema produce karte hain"""
    from sqlalchemy.schema import CreateTable
    
    # Migrations se database banao
    engine_migrated = create_engine("sqlite:///:memory:")
    alembic_cfg = Config("alembic.ini")
    alembic_cfg.set_main_option("sqlalchemy.url", str(engine_migrated.url))
    command.upgrade(alembic_cfg, "head")
    
    # Models se database banao
    engine_models = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine_models)
    
    # Dono schema compare kar
    inspector_migrated = inspect(engine_migrated)
    inspector_models = inspect(engine_models)
    
    tables_migrated = set(inspector_migrated.get_table_names())
    tables_models = set(inspector_models.get_table_names())
    
    # Alembic table ko ignore kar (ye internal hai)
    tables_migrated.discard("alembic_version")
    
    assert tables_migrated == tables_models
```

---

## Seeding Test Data

Kyun zaruri hai? Jab complex queries test karna ho, toh pehle data chahiye! Factory pattern use karke repetitive data generation automation kar do.

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
    
    # Sequence se unique usernames banao (user_0, user_1, etc.)
    username = factory.Sequence(lambda n: f"user_{n}")
    # Username ke based pe email banao (LazyAttribute)
    email = factory.LazyAttribute(lambda obj: f"{obj.username}@example.com")
    is_active = True

class PostFactory(SQLAlchemyModelFactory):
    class Meta:
        model = Post
        sqlalchemy_session_persistence = "commit"
    
    # Faker se random sentence lao
    title = factory.Faker("sentence")
    content = factory.Faker("paragraph")
    # SubFactory se related User automatically banao
    author = factory.SubFactory(UserFactory)

# tests/conftest.py
@pytest.fixture
def user_factory(db_session):
    """User factory setup kar"""
    UserFactory._meta.sqlalchemy_session = db_session
    return UserFactory

@pytest.fixture
def post_factory(db_session):
    """Post factory setup kar"""
    PostFactory._meta.sqlalchemy_session = db_session
    return PostFactory

# tests/test_with_factories.py
def test_create_user_with_factory(user_factory):
    """Test karo factory se user creation"""
    user = user_factory()
    
    assert user.id is not None
    assert user.username.startswith("user_")
    assert user.is_active is True

def test_create_multiple_users(user_factory):
    """Test karo multiple users banane ka"""
    users = user_factory.create_batch(10)
    
    assert len(users) == 10
    assert len(set(u.username for u in users)) == 10  # Sab unique hona chahiye!

def test_create_post_with_author(post_factory):
    """Test karo post with related author banane ka"""
    post = post_factory()
    
    assert post.author is not None
    assert post.author.id is not None
```

**Installation:**

```bash
pip install factory-boy faker
```

> [!tip]
> Factory pattern bilkul Swiggy restaurant rating card banane jaisa — ek template hai, us se jitne chahiye itne copy kar!

---

## Testing Database Constraints

Kya hota hai? Database constraints (unique, not null, foreign key) ensure karte hain ki invalid data enter nahi ho sakta. Unhe test karna zaruri hai!

### Example 7: Testing Unique Constraints and Validation

```python
# tests/test_constraints.py
import pytest
from sqlalchemy.exc import IntegrityError
from app.database import User
from app.crud import create_user

def test_unique_username_constraint(test_db):
    """Test karo ke duplicate username reject hota hai"""
    create_user(test_db, "john", "john1@example.com")
    
    # Same username se dusra user create karna chahiye error dena
    with pytest.raises(IntegrityError):
        create_user(test_db, "john", "john2@example.com")  # Duplicate!

def test_unique_email_constraint(test_db):
    """Test karo ke duplicate email reject hota hai"""
    create_user(test_db, "john", "john@example.com")
    
    # Same email se dusra user? Error!
    with pytest.raises(IntegrityError):
        create_user(test_db, "jane", "john@example.com")  # Duplicate!

def test_nullable_constraint(test_db):
    """Test karo ke required fields null nahi ho sakte"""
    user = User(username="test")  # Email missing!
    test_db.add(user)
    
    # Commit karte waqt error ayega
    with pytest.raises(IntegrityError):
        test_db.commit()

def test_cascade_delete(test_db):
    """Test karo ke user delete ho toh uske posts bhi delete ho jayein"""
    # User banao with posts
    user = create_user(test_db, "john", "john@example.com")
    
    post1 = Post(title="Post 1", content="Content", author_id=user.id)
    post2 = Post(title="Post 2", content="Content", author_id=user.id)
    test_db.add_all([post1, post2])
    test_db.commit()
    
    # User delete kar
    test_db.delete(user)
    test_db.commit()
    
    # Posts bhi delete ho gaye hone chahiye (agar cascade configured hai)
    assert test_db.query(Post).count() == 0
```

---

## Async Database Testing

Kya hota hai? Async/await ka matlab concurrent requests handle kar sakta ho, lekin testing mein `async` fixtures use karne padenge!

### Example 8: Testing Async SQLAlchemy

```python
# app/async_crud.py
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy import select
from app.database import User

async def create_user_async(db: AsyncSession, username: str, email: str) -> User:
    """Async version of create_user - non-blocking!"""
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
    """Async database session banao"""
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

> [!info]
> Async testing bilkul Zomato delivery tracking jaisa — real-time updates handle karte waqt test karna zyada complex hota hai!

---

## Practice Exercises

Socho, khud se likho! Yeh exercises follow karo:

### Exercise 1: Multi-Table Relationships

```python
# TODO: User, Post, Comment models banao
# TODO: Post with comments create karne ka test likho
# TODO: Eager loading ke saath posts query test karo
# TODO: Cascade deletes test karo (user delete -> posts delete)
```

### Exercise 2: Complex Queries

```python
# TODO: Joins wale queries test karo
# TODO: Aggregations test karo (COUNT, SUM, AVG)
# TODO: Large datasets ke saath pagination test karo
# TODO: Filtering aur sorting test karo
```

### Exercise 3: Transaction Testing

```python
# TODO: Atomic transactions test karo (ek hi time mein sab ho ya kuch nahi)
# TODO: Error ke time rollback test karo
# TODO: Concurrent access test karo (race conditions)
```

### Exercise 4: Migration Testing

```python
# TODO: Migration likho jo column add karey
# TODO: Data migration test karo
# TODO: Migration rollback test karo
# TODO: Verify karo ke data loss nahi hua
```

---

## Key Takeaways

✅ SQLite in-memory से fast tests — literally milliseconds!  
✅ Pytest fixtures reusable aur clean code ke liye  
✅ PostgreSQL Docker containers production-like environment create karte hain  
✅ Transaction rollback से database isolation — har test fresh!  
✅ Alembic migrations test करके confidence milti है  
✅ Factories से test data generation automated हो जाता है  
✅ Database constraints test करना security और data integrity के लिए ज़रूरी  
✅ Async testing concurrent code के साथ काम करता है

**Golden Rule:** SQLite से शुरू करो speed के लिए, PostgreSQL में जाओ जब production-specific features चाहيय! Factories और fixtures मिलकर testing को clean और maintainable बनाते हैं!

**Next:** Async code को pytest-asyncio से test करना!
