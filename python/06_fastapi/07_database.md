# 07 - Database Integration with SQLAlchemy

## Overview

In the Node.js world, you have Prisma, TypeORM, Sequelize, and Knex. In Python/FastAPI, the standard ORM is **SQLAlchemy**. It's been around since 2006 and is incredibly mature.

### ORM Comparison

| Feature | Prisma | TypeORM | SQLAlchemy |
|---|---|---|---|
| Schema definition | `.prisma` file | Decorators on classes | Python classes |
| Migrations | `prisma migrate` | Built-in | Alembic (separate tool) |
| Query builder | Prisma Client | QueryBuilder | Core + ORM |
| Raw SQL | `$queryRaw` | `.query()` | `text()` |
| Async support | Built-in | Limited | Full (2.0+) |
| Relationship loading | Include | Relations + eager/lazy | Lazy/eager/selectin |

---

## Setup

### Installation

```bash
pip install sqlalchemy          # The ORM
pip install alembic             # Migrations (like prisma migrate)

# Database drivers
pip install psycopg2-binary     # PostgreSQL (sync)
pip install asyncpg              # PostgreSQL (async)
pip install aiosqlite            # SQLite (async, good for dev)
```

### Database Configuration

```python
# database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

# Connection URL format: dialect+driver://user:password@host:port/dbname
# Like DATABASE_URL in Prisma

# SQLite (development)
SQLALCHEMY_DATABASE_URL = "sqlite:///./app.db"

# PostgreSQL (production)
# SQLALCHEMY_DATABASE_URL = "postgresql://user:password@localhost:5432/mydb"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},  # Only needed for SQLite
    echo=True,  # Log SQL queries (like Prisma's log: ['query'])
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for all models
class Base(DeclarativeBase):
    pass
```

### The Database Session Dependency

```python
# dependencies.py
from database import SessionLocal

def get_db():
    """
    Yield a database session per request.
    The session is automatically closed after the request.

    This is like a middleware in Express that attaches db to req:
    app.use((req, res, next) => { req.db = new Session(); next(); });
    ...but with guaranteed cleanup.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

---

## Model Definitions

### Prisma Schema (for comparison)

```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  posts     Post[]
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String?
  published Boolean  @default(false)
  authorId  Int
  author    User     @relation(fields: [authorId], references: [id])
  tags      Tag[]
}
```

### SQLAlchemy Models (Declarative Style)

```python
# models.py
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, Integer, Text, ForeignKey, DateTime, Table, Column
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(100))
    hashed_password: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationship: one user has many posts
    # Like: posts Post[] in Prisma
    posts: Mapped[list["Post"]] = relationship(back_populates="author")

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email})>"


class Post(Base):
    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(200))
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    published: Mapped[bool] = mapped_column(Boolean, default=False)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationship back to user
    author: Mapped["User"] = relationship(back_populates="posts")

    # Many-to-many with tags
    tags: Mapped[list["Tag"]] = relationship(
        secondary="post_tags", back_populates="posts"
    )


# Many-to-many association table
post_tags = Table(
    "post_tags",
    Base.metadata,
    Column("post_id", Integer, ForeignKey("posts.id"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id"), primary_key=True),
)


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(50), unique=True)

    posts: Mapped[list["Post"]] = relationship(
        secondary="post_tags", back_populates="tags"
    )
```

### Creating Tables (Development Only)

```python
# For quick development, create tables from models
# In production, use Alembic migrations instead
from database import engine, Base
import models  # Import all models so Base knows about them

Base.metadata.create_all(bind=engine)
```

---

## Pydantic Schemas (DTOs)

Separate your database models from your API schemas. This is like having DTOs in NestJS separate from TypeORM entities.

```python
# schemas.py
from pydantic import BaseModel, EmailStr
from datetime import datetime

# --- User Schemas ---
class UserBase(BaseModel):
    email: str
    name: str

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    name: str | None = None
    email: str | None = None

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
    # from_attributes = True tells Pydantic to read data from ORM objects
    # Like class-transformer's @Expose() in NestJS

# --- Post Schemas ---
class PostBase(BaseModel):
    title: str
    content: str | None = None
    published: bool = False

class PostCreate(PostBase):
    pass

class PostResponse(PostBase):
    id: int
    author_id: int
    created_at: datetime

    model_config = {"from_attributes": True}

class PostWithAuthor(PostResponse):
    author: UserResponse

    model_config = {"from_attributes": True}
```

---

## CRUD Operations

### Create

```python
# Prisma:  await prisma.user.create({ data: { email, name, password } })
# TypeORM: await userRepo.save({ email, name, password })

from sqlalchemy.orm import Session
from models import User
from schemas import UserCreate
from auth.password import hash_password

def create_user(db: Session, user_data: UserCreate) -> User:
    db_user = User(
        email=user_data.email,
        name=user_data.name,
        hashed_password=hash_password(user_data.password),
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)  # Reload to get auto-generated fields (id, created_at)
    return db_user
```

### Read

```python
# Prisma:  await prisma.user.findUnique({ where: { id } })
# TypeORM: await userRepo.findOne({ where: { id } })

def get_user(db: Session, user_id: int) -> User | None:
    return db.query(User).filter(User.id == user_id).first()

def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()

# Prisma:  await prisma.user.findMany({ skip, take })
# TypeORM: await userRepo.find({ skip, take: limit })

def get_users(db: Session, skip: int = 0, limit: int = 10) -> list[User]:
    return db.query(User).offset(skip).limit(limit).all()
```

### Update

```python
# Prisma:  await prisma.user.update({ where: { id }, data: { name } })
# TypeORM: await userRepo.update(id, { name })

def update_user(db: Session, user_id: int, user_data: UserUpdate) -> User | None:
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        return None

    # Only update provided fields (like Prisma's update)
    update_data = user_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_user, field, value)

    db.commit()
    db.refresh(db_user)
    return db_user
```

### Delete

```python
# Prisma:  await prisma.user.delete({ where: { id } })
# TypeORM: await userRepo.delete(id)

def delete_user(db: Session, user_id: int) -> bool:
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        return False
    db.delete(db_user)
    db.commit()
    return True
```

---

## Wiring It Up in FastAPI

```python
# main.py
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from database import engine, Base
from dependencies import get_db
import models
import schemas
import crud

# Create tables (dev only)
Base.metadata.create_all(bind=engine)

app = FastAPI()

@app.post("/users", response_model=schemas.UserResponse, status_code=201)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if email already exists
    existing = crud.get_user_by_email(db, user.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_user(db, user)

@app.get("/users", response_model=list[schemas.UserResponse])
def list_users(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    return crud.get_users(db, skip=skip, limit=limit)

@app.get("/users/{user_id}", response_model=schemas.UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.put("/users/{user_id}", response_model=schemas.UserResponse)
def update_user(
    user_id: int,
    user_data: schemas.UserUpdate,
    db: Session = Depends(get_db),
):
    user = crud.update_user(db, user_id, user_data)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: int, db: Session = Depends(get_db)):
    if not crud.delete_user(db, user_id):
        raise HTTPException(status_code=404, detail="User not found")
```

---

## Relationships

### One-to-Many: User has many Posts

```python
# Creating a post for a user
@app.post("/users/{user_id}/posts", response_model=schemas.PostResponse, status_code=201)
def create_post(
    user_id: int,
    post: schemas.PostCreate,
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db_post = models.Post(**post.model_dump(), author_id=user_id)
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    return db_post

# Getting a user's posts
@app.get("/users/{user_id}/posts", response_model=list[schemas.PostResponse])
def get_user_posts(user_id: int, db: Session = Depends(get_db)):
    return db.query(models.Post).filter(models.Post.author_id == user_id).all()

# Getting a post with its author (eager loading)
# Like Prisma's include: { author: true }
@app.get("/posts/{post_id}", response_model=schemas.PostWithAuthor)
def get_post_with_author(post_id: int, db: Session = Depends(get_db)):
    from sqlalchemy.orm import joinedload

    post = (
        db.query(models.Post)
        .options(joinedload(models.Post.author))  # Eager load author
        .filter(models.Post.id == post_id)
        .first()
    )
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post
```

### Relationship Loading Strategies

```python
from sqlalchemy.orm import joinedload, selectinload, lazyload

# Eager loading with JOIN (like Prisma include, one query with JOIN)
posts = (
    db.query(Post)
    .options(joinedload(Post.author))
    .all()
)

# Eager loading with separate SELECT (better for large collections)
users = (
    db.query(User)
    .options(selectinload(User.posts))  # SELECT * FROM posts WHERE author_id IN (...)
    .all()
)

# Lazy loading (default -- loads on access, causes N+1 if not careful)
user = db.query(User).first()
posts = user.posts  # This triggers a separate query!
```

### Many-to-Many: Posts and Tags

```python
# Adding tags to a post
@app.post("/posts/{post_id}/tags/{tag_id}")
def add_tag_to_post(post_id: int, tag_id: int, db: Session = Depends(get_db)):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    tag = db.query(models.Tag).filter(models.Tag.id == tag_id).first()

    if not post or not tag:
        raise HTTPException(status_code=404, detail="Post or tag not found")

    post.tags.append(tag)
    db.commit()
    return {"message": f"Tag '{tag.name}' added to post '{post.title}'"}

# Query posts by tag
@app.get("/tags/{tag_name}/posts", response_model=list[schemas.PostResponse])
def get_posts_by_tag(tag_name: str, db: Session = Depends(get_db)):
    tag = db.query(models.Tag).filter(models.Tag.name == tag_name).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    return tag.posts
```

---

## Async SQLAlchemy

For high-performance async operations (recommended for production).

```python
# database_async.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

# Note: async requires async driver (asyncpg for PostgreSQL, aiosqlite for SQLite)
DATABASE_URL = "postgresql+asyncpg://user:password@localhost:5432/mydb"
# Or for dev: "sqlite+aiosqlite:///./app.db"

engine = create_async_engine(DATABASE_URL, echo=True)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

# Async dependency
async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
```

### Async CRUD

```python
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

async def get_users(db: AsyncSession, skip: int = 0, limit: int = 10):
    result = await db.execute(
        select(User).offset(skip).limit(limit)
    )
    return result.scalars().all()

async def create_user(db: AsyncSession, user_data: UserCreate):
    db_user = User(**user_data.model_dump())
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user

# In routes
@app.get("/users", response_model=list[schemas.UserResponse])
async def list_users(
    skip: int = 0,
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
):
    return await get_users(db, skip, limit)
```

---

## Alembic: Database Migrations

Alembic is to SQLAlchemy what Prisma Migrate is to Prisma, or what knex migrations are to Knex.

### Setup

```bash
# Initialize Alembic (like prisma init)
alembic init alembic
```

This creates:
```
alembic/
├── versions/          # Migration files go here
├── env.py             # Alembic configuration
├── script.py.mako     # Migration template
alembic.ini            # Main config file
```

### Configure Alembic

Edit `alembic/env.py`:

```python
# In env.py, update target_metadata
from database import Base
import models  # Import all models!

target_metadata = Base.metadata
```

Edit `alembic.ini`:

```ini
# Set your database URL
sqlalchemy.url = postgresql://user:password@localhost:5432/mydb
```

### Creating and Running Migrations

```bash
# Generate a migration (like prisma migrate dev --name add_users)
alembic revision --autogenerate -m "create users table"

# Run migrations (like prisma migrate deploy)
alembic upgrade head

# Rollback last migration
alembic downgrade -1

# See current migration status
alembic current

# See migration history
alembic history
```

### What a Migration File Looks Like

```python
# alembic/versions/abc123_create_users_table.py
"""create users table"""

from alembic import op
import sqlalchemy as sa

revision = 'abc123'
down_revision = None

def upgrade():
    op.create_table(
        'users',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('email', sa.String(255), unique=True, nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True)),
    )
    op.create_index('ix_users_email', 'users', ['email'])

def downgrade():
    op.drop_index('ix_users_email')
    op.drop_table('users')
```

### Comparison with Node.js Migrations

```javascript
// Knex migration
exports.up = function(knex) {
  return knex.schema.createTable('users', (table) => {
    table.increments('id');
    table.string('email').unique().notNullable();
    table.string('name').notNullable();
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('users');
};
```

The concepts are identical. The auto-generate feature in Alembic is similar to `prisma migrate dev` -- it compares your models to the database and generates the SQL.

---

## Advanced Queries

```python
from sqlalchemy import select, func, and_, or_, desc

# Filtering with conditions
users = db.query(User).filter(
    and_(
        User.is_active == True,
        User.created_at >= some_date,
    )
).all()

# OR conditions
users = db.query(User).filter(
    or_(
        User.name.contains("alice"),
        User.email.contains("alice"),
    )
).all()

# Aggregation
user_count = db.query(func.count(User.id)).scalar()

# Ordering
users = db.query(User).order_by(desc(User.created_at)).limit(10).all()

# Group by
from sqlalchemy import func
post_counts = (
    db.query(User.name, func.count(Post.id).label("post_count"))
    .join(Post)
    .group_by(User.name)
    .all()
)
# Returns: [("Alice", 5), ("Bob", 3)]

# Exists check
from sqlalchemy import exists
has_posts = db.query(
    exists().where(Post.author_id == user_id)
).scalar()
```

---

## Practice Exercises

### Exercise 1: Basic CRUD API
Create a complete CRUD API for a "Book" model with:
- Fields: `id`, `title`, `author`, `isbn` (unique), `published_year`, `genre`, `created_at`
- Endpoints: create, read (single + list with pagination), update, delete
- Use SQLite for storage
- Separate models.py, schemas.py, and crud.py

### Exercise 2: One-to-Many Relationship
Extend Exercise 1:
- Add a `Review` model (id, rating 1-5, comment, book_id, reviewer_name, created_at)
- `POST /books/{book_id}/reviews` -- add a review
- `GET /books/{book_id}/reviews` -- list reviews for a book
- `GET /books/{book_id}` -- include average rating in response

### Exercise 3: Many-to-Many
Add a "Category" model and a many-to-many relationship with books:
- `POST /categories` -- create a category
- `POST /books/{book_id}/categories/{category_id}` -- assign a category
- `GET /categories/{category_id}/books` -- get all books in a category
- A book can have multiple categories

### Exercise 4: Async Database
Convert Exercise 1 to use async SQLAlchemy with aiosqlite:
- Change to async session
- Use `select()` instead of `db.query()`
- Make all route handlers and CRUD functions async

### Exercise 5: Alembic Migrations
Set up Alembic for your book API:
1. Initialize Alembic
2. Create an initial migration
3. Add a `page_count` column to the Book model
4. Generate and apply a new migration
5. Practice rolling back
