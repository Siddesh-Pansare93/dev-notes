# 07 - SQLAlchemy ke sath Database Integration

## Kya Hota Hai?

Node.js mein tumhare paas Prisma, TypeORM, Sequelize, aur Knex hote hain. Python/FastAPI mein standard ORM **SQLAlchemy** hai. 2006 se mausam dekh raha hai aur incredibly mature hai.

### ORM Comparison — Kaunsa Best Hai?

| Feature | Prisma | TypeORM | SQLAlchemy |
|---|---|---|---|
| Schema definition | `.prisma` file | Decorators on classes | Python classes |
| Migrations | `prisma migrate` | Built-in | Alembic (separate tool) |
| Query builder | Prisma Client | QueryBuilder | Core + ORM |
| Raw SQL | `$queryRaw` | `.query()` | `text()` |
| Async support | Built-in | Limited | Full (2.0+) |
| Relationship loading | Include | Relations + eager/lazy | Lazy/eager/selectin |

---

## Setup — Shuru Se Kya Karna Padega

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
# Prisma mein DATABASE_URL ke jaisa

# SQLite (development ke liye)
SQLALCHEMY_DATABASE_URL = "sqlite:///./app.db"

# PostgreSQL (production ke liye)
# SQLALCHEMY_DATABASE_URL = "postgresql://user:password@localhost:5432/mydb"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},  # SQLite ke liye hi zaroori
    echo=True,  # SQL queries ko log karo (Prisma ke log: ['query'] jaisa)
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class sabke liye
class Base(DeclarativeBase):
    pass
```

### Database Session Dependency

```python
# dependencies.py
from database import SessionLocal

def get_db():
    """
    Ek database session har request ke liye dey do.
    Request ke baad automatically close ho jayega.

    Express mein middleware ki tarah jo db ko req mein attach karta hai:
    app.use((req, res, next) => { req.db = new Session(); next(); });
    ...lekin cleanup guaranteed hai.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

---

## Model Definitions — Database Tables Ko Code Mein Likho

### Prisma Schema (comparison ke liye)

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

    # Relationship: ek user ke paas kaafi posts ho sakte hain
    # Prisma mein: posts Post[]
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

    # Relationship user ke paas wapas
    author: Mapped["User"] = relationship(back_populates="posts")

    # Many-to-many tags ke sath
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

### Tables Create Karo (Development ke liye)

```python
# Quick development ke liye tables models se bana lo
# Production mein Alembic migrations use karo
from database import engine, Base
import models  # Saari models import karo taki Base ko pata chale

Base.metadata.create_all(bind=engine)
```

---

## Pydantic Schemas (DTOs) — API aur Database ko Alag Rakho

Database models aur API schemas ko alag rakho. NestJS mein TypeORM entities aur DTOs alag hote hain, yahi concept hai.

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
    # from_attributes = True se Pydantic ORM objects se data padh le
    # NestJS mein class-transformer ke @Expose() jaisa

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

## CRUD Operations — Create, Read, Update, Delete

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
    db.refresh(db_user)  # Auto-generated fields (id, created_at) ke liye reload karo
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

    # Sirf jo fields diye gaye hain wo update karo (Prisma ki tarah)
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

## FastAPI Mein Wire Up Karo

```python
# main.py
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from database import engine, Base
from dependencies import get_db
import models
import schemas
import crud

# Tables create karo (dev ke liye hi)
Base.metadata.create_all(bind=engine)

app = FastAPI()

@app.post("/users", response_model=schemas.UserResponse, status_code=201)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check karo ki email pehle se registered to nahi
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

## Relationships — Models Ke Beech Connection

### One-to-Many: Ek User Ke Kaafi Posts

```python
# User ke liye ek post create karo
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

# User ke sari posts ley aao
@app.get("/users/{user_id}/posts", response_model=list[schemas.PostResponse])
def get_user_posts(user_id: int, db: Session = Depends(get_db)):
    return db.query(models.Post).filter(models.Post.author_id == user_id).all()

# Post ko uske author ke sath (eager loading)
# Prisma mein: include: { author: true }
@app.get("/posts/{post_id}", response_model=schemas.PostWithAuthor)
def get_post_with_author(post_id: int, db: Session = Depends(get_db)):
    from sqlalchemy.orm import joinedload

    post = (
        db.query(models.Post)
        .options(joinedload(models.Post.author))  # Author ko eagerly load karo
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

# Eager loading with JOIN (Prisma include jaisa, ek hi query mein JOIN)
posts = (
    db.query(Post)
    .options(joinedload(Post.author))
    .all()
)

# Eager loading with separate SELECT (badi collections ke liye better)
users = (
    db.query(User)
    .options(selectinload(User.posts))  # SELECT * FROM posts WHERE author_id IN (...)
    .all()
)

# Lazy loading (default -- access karte time load hota hai, N+1 ho sakta hai)
user = db.query(User).first()
posts = user.posts  # Yeh separate query trigger karega!
```

### Many-to-Many: Posts aur Tags

```python
# Post mein tags add karo
@app.post("/posts/{post_id}/tags/{tag_id}")
def add_tag_to_post(post_id: int, tag_id: int, db: Session = Depends(get_db)):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    tag = db.query(models.Tag).filter(models.Tag.id == tag_id).first()

    if not post or not tag:
        raise HTTPException(status_code=404, detail="Post or tag not found")

    post.tags.append(tag)
    db.commit()
    return {"message": f"Tag '{tag.name}' added to post '{post.title}'"}

# Tag se posts query karo
@app.get("/tags/{tag_name}/posts", response_model=list[schemas.PostResponse])
def get_posts_by_tag(tag_name: str, db: Session = Depends(get_db)):
    tag = db.query(models.Tag).filter(models.Tag.name == tag_name).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    return tag.posts
```

---

## Async SQLAlchemy — Lightning Fast Operations

High-performance async operations ke liye (production mein recommend karte hain).

```python
# database_async.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

# Dhyan: async mein async driver zaroori hai (asyncpg PostgreSQL ke liye, aiosqlite SQLite ke liye)
DATABASE_URL = "postgresql+asyncpg://user:password@localhost:5432/mydb"
# Ya dev ke liye: "sqlite+aiosqlite:///./app.db"

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

### Async CRUD — Async Mein Queries

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

# Routes mein
@app.get("/users", response_model=list[schemas.UserResponse])
async def list_users(
    skip: int = 0,
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
):
    return await get_users(db, skip, limit)
```

---

## Alembic: Database Migrations — Schema Ko Track Karo

Alembic SQLAlchemy ke liye vahi hai jo Prisma Migrate hai Prisma ke liye, ya knex migrations Knex ke liye.

### Setup

```bash
# Alembic initialize karo (prisma init jaisa)
alembic init alembic
```

Yeh create karega:
```
alembic/
├── versions/          # Migration files yahan jayengi
├── env.py             # Alembic configuration
├── script.py.mako     # Migration template
alembic.ini            # Main config file
```

### Configure Karo

`alembic/env.py` ko edit karo:

```python
# env.py mein target_metadata ko update karo
from database import Base
import models  # Saari models import karo!

target_metadata = Base.metadata
```

`alembic.ini` ko edit karo:

```ini
# Apna database URL set karo
sqlalchemy.url = postgresql://user:password@localhost:5432/mydb
```

### Migrations Create aur Run Karo

```bash
# Migration generate karo (prisma migrate dev --name add_users jaisa)
alembic revision --autogenerate -m "create users table"

# Migrations run karo (prisma migrate deploy jaisa)
alembic upgrade head

# Pichla migration ko revert karo
alembic downgrade -1

# Current migration status dekho
alembic current

# Migration history dekho
alembic history
```

### Migration File Kaisa Lagta Hai

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

### Node.js Migrations ke Sath Comparison

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

Concepts bilkul same hain. Alembic mein auto-generate feature `prisma migrate dev` jaisa hai -- models aur database ko compare karte hue SQL generate karta hai.

---

## Advanced Queries — Complex Filtering aur Aggregation

```python
from sqlalchemy import select, func, and_, or_, desc

# Conditions ke sath filtering
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

# Aggregation (counting, summing)
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

## Practice Exercises — Khud Likho, Seekho

### Exercise 1: Basic CRUD API
Ek complete CRUD API banao "Book" model ke liye:
- Fields: `id`, `title`, `author`, `isbn` (unique), `published_year`, `genre`, `created_at`
- Endpoints: create, read (single + list with pagination), update, delete
- SQLite use karo storage ke liye
- models.py, schemas.py, aur crud.py alag rakho

### Exercise 2: One-to-Many Relationship
Exercise 1 ko extend karo:
- Add karo `Review` model (id, rating 1-5, comment, book_id, reviewer_name, created_at)
- `POST /books/{book_id}/reviews` -- ek review add karo
- `GET /books/{book_id}/reviews` -- book ke liye reviews list karo
- `GET /books/{book_id}` -- average rating include karo response mein

### Exercise 3: Many-to-Many
Add karo "Category" model aur many-to-many relationship books ke sath:
- `POST /categories` -- category create karo
- `POST /books/{book_id}/categories/{category_id}` -- category assign karo
- `GET /categories/{category_id}/books` -- ek category mein sari books dekho
- Ek book ke multiple categories ho sakte hain

### Exercise 4: Async Database
Exercise 1 ko async SQLAlchemy ke sath convert karo aur aiosqlite use karo:
- Change karo async session ko
- Use karo `select()` instead of `db.query()`
- Saari route handlers aur CRUD functions ko async banao

### Exercise 5: Alembic Migrations
Setup karo Alembic tumhare book API ke liye:
1. Alembic initialize karo
2. Ek initial migration create karo
3. Book model mein `page_count` column add karo
4. Naya migration generate karo aur apply karo
5. Rolling back practice karo

---

## Key Takeaways

- **SQLAlchemy** Python mein standard ORM hai, mature aur flexible
- **Relationships** ko `relationship()` se define karo (one-to-many, many-to-many)
- **Eager loading** (`joinedload`, `selectinload`) se N+1 queries avoid karo
- **Migrations** ke liye Alembic use karo, Prisma Migrate jaisa
- **Async SQLAlchemy** production ke liye fast aur responsive apps banate hain
- **Pydantic schemas** ko database models se alag rakho (DTOs pattern)
- **CRUD operations** straightforward hain: `query()`, `add()`, `commit()`, `refresh()`
