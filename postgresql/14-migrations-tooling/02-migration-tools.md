# Migration Tools

## Theory

### Why Use Migration Tools

Migration tools automate and standardize the database migration process:

- **Automation**: Apply migrations consistently across environments
- **Tracking**: Maintain migration history automatically
- **Validation**: Verify migration integrity with checksums
- **Rollback**: Support automated or manual rollback procedures
- **CI/CD Integration**: Run migrations as part of deployment pipelines
- **Team Collaboration**: Prevent migration conflicts and ensure order
- **Cross-Platform**: Some tools work with multiple databases

Without migration tools, teams rely on manual SQL scripts, spreadsheets for tracking, and error-prone deployment procedures.

### Tool Selection Criteria

When choosing a migration tool, consider:

1. **Language Ecosystem**: Does it integrate with your application stack?
2. **Migration Format**: SQL, XML, JSON, or programming language?
3. **Database Support**: PostgreSQL-only or multi-database?
4. **Learning Curve**: How easy is it for your team to adopt?
5. **Features**: Versioning, rollback, validation, schema snapshots
6. **Community & Support**: Active development, documentation, plugins
7. **CI/CD Integration**: Command-line interface, exit codes, logging
8. **Enterprise Features**: Clustering, dry-run, audit trails

## Overview of Popular Migration Tools

### Flyway

**Language**: Java
**License**: Apache 2.0 (Community), Commercial (Enterprise)
**Database Support**: PostgreSQL, MySQL, Oracle, SQL Server, and 20+ others

**Key Features**:
- SQL-based or Java-based migrations
- Versioned and repeatable migrations
- Checksum validation
- Baseline existing databases
- Callbacks for custom logic
- Enterprise features: undo, dry runs, Oracle SQL*Plus support

**Migration Format**:
```
V1__Initial_schema.sql
V2__Add_users_table.sql
V3__Add_indexes.sql
R__Create_views.sql  (repeatable)
```

**Pros**:
- Simple, SQL-first approach
- Mature and widely adopted
- Excellent documentation
- Strong enterprise support
- Works well in Java ecosystems (Spring Boot, etc.)

**Cons**:
- Java dependency (requires JVM)
- Undo migrations only in paid version
- Less PostgreSQL-specific features
- Can be heavyweight for small projects

### Liquibase

**Language**: Java
**License**: Apache 2.0 (Community), Commercial (Pro)
**Database Support**: PostgreSQL, MySQL, Oracle, SQL Server, and 60+ others

**Key Features**:
- Multiple formats: XML, YAML, JSON, SQL
- Change sets with preconditions
- Database-agnostic changesets
- Automatic rollback generation
- Diff and snapshot capabilities
- Context and label filtering

**Migration Format**:
```xml
<changeSet id="1" author="alice">
  <createTable tableName="users">
    <column name="id" type="int" autoIncrement="true">
      <constraints primaryKey="true"/>
    </column>
    <column name="username" type="varchar(50)"/>
  </createTable>
</changeSet>
```

**Pros**:
- Database-agnostic abstractions
- Powerful preconditions and rollback
- Can generate migrations from schema diffs
- Excellent for multi-database applications
- Strong enterprise features

**Cons**:
- XML/YAML can be verbose
- Steep learning curve
- Java dependency
- Abstractions may not leverage PostgreSQL-specific features
- Complex for simple use cases

### dbmate

**Language**: Go
**License**: MIT
**Database Support**: PostgreSQL, MySQL, SQLite, ClickHouse

**Key Features**:
- Lightweight and fast
- Pure SQL migrations
- Simple up/down migration files
- Schema dumps
- Wait for database (useful in Docker)
- No configuration files needed

**Migration Format**:
```sql
-- migrate:up
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255)
);

-- migrate:down
DROP TABLE users;
```

**Pros**:
- Extremely simple and lightweight
- Single binary, no dependencies
- Fast execution
- Great for Docker/containerized apps
- Minimal learning curve
- Environment variables for configuration

**Cons**:
- Limited advanced features
- No checksum validation
- Basic rollback support
- Smaller community than Flyway/Liquibase
- Less enterprise-ready

### sqitch

**Language**: Perl
**License**: MIT
**Database Support**: PostgreSQL, MySQL, SQLite, Oracle, Firebird, Vertica, Exasol, Snowflake

**Key Features**:
- Dependency-based migrations (not sequential)
- VCS-aware (git, SVN)
- Named changes instead of versions
- Tag-based releases
- Verify scripts to test migrations
- Revert/deploy/verify workflow

**Migration Format**:
```
deploy/users.sql
revert/users.sql
verify/users.sql
```

**Pros**:
- Dependency-based (not just sequential)
- No frameworks or ORMs required
- Git integration for tracking
- Verify scripts ensure correctness
- PostgreSQL-native features supported
- Popular in PostgreSQL community

**Cons**:
- Perl dependency
- Steeper learning curve
- Less familiar to non-Perl developers
- Smaller ecosystem than Flyway/Liquibase
- Dependency management can be complex

### Prisma Migrate

**Language**: TypeScript/JavaScript (part of Prisma ORM)
**License**: Apache 2.0
**Database Support**: PostgreSQL, MySQL, SQLite, SQL Server, MongoDB, CockroachDB

**Key Features**:
- Declarative schema in Prisma Schema Language
- Auto-generated migrations from schema changes
- Shadow database for migration testing
- Baseline existing databases
- Integrated with Prisma ORM

**Migration Format**:
```prisma
// schema.prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  posts     Post[]
}
```

**Pros**:
- Excellent for TypeScript/JavaScript projects
- Type-safe database client
- Auto-migration generation
- Great developer experience
- Strong community in JS ecosystem

**Cons**:
- Tied to Prisma ORM
- Generated SQL may not be optimal
- Less control over migration details
- Not suitable for non-JS projects
- Schema abstraction may miss PostgreSQL features

### golang-migrate

**Language**: Go
**License**: MIT
**Database Support**: PostgreSQL, MySQL, MongoDB, Cassandra, and 20+ others

**Key Features**:
- Pure SQL migrations
- CLI and Go library
- Up/down migrations
- Dirty state detection
- Multiple source drivers (file, GitHub, S3)

**Migration Format**:
```
1_initial_schema.up.sql
1_initial_schema.down.sql
2_add_users.up.sql
2_add_users.down.sql
```

**Pros**:
- Lightweight Go binary
- Simple SQL-based approach
- Can embed in Go applications
- Supports migration sources (S3, GitHub)
- Good for Go projects

**Cons**:
- Basic feature set
- No dependency management
- Manual version numbering
- Less tooling than Flyway/Liquibase

### Alembic

**Language**: Python (part of SQLAlchemy)
**License**: MIT
**Database Support**: PostgreSQL, MySQL, SQLite, Oracle (via SQLAlchemy)

**Key Features**:
- Auto-generate migrations from SQLAlchemy models
- Branching and merging migrations
- Offline mode (generate SQL without running)
- Custom migration templates
- Revision history management

**Migration Format**:
```python
def upgrade():
    op.create_table('users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(50), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

def downgrade():
    op.drop_table('users')
```

**Pros**:
- Perfect for Python/SQLAlchemy projects
- Auto-migration generation
- Branching for multiple developers
- Offline SQL generation
- Python-based for custom logic

**Cons**:
- Tied to SQLAlchemy
- Python dependency
- Generated migrations need review
- Less suitable for non-Python projects

## Syntax and Setup

### Flyway Setup

```bash
# Installation (macOS)
brew install flyway

# Or download binary from https://flywaydb.org/download

# Configuration: flyway.conf
flyway.url=jdbc:postgresql://localhost:5432/mydb
flyway.user=postgres
flyway.password=secret
flyway.locations=filesystem:./migrations
```

**Basic Usage**:

```bash
# Create migration (manual)
# migrations/V1__Initial_schema.sql

# Run migrations
flyway migrate

# Show migration status
flyway info

# Validate checksums
flyway validate

# Baseline existing database
flyway baseline

# Repair migration history
flyway repair
```

### Liquibase Setup

```bash
# Installation
brew install liquibase

# Configuration: liquibase.properties
url=jdbc:postgresql://localhost:5432/mydb
username=postgres
password=secret
changeLogFile=changelog.xml
```

**Basic Usage**:

```bash
# Create changelog
cat > changelog.xml << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
    http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.0.xsd">

  <changeSet id="1" author="alice">
    <createTable tableName="users">
      <column name="id" type="int" autoIncrement="true">
        <constraints primaryKey="true"/>
      </column>
    </createTable>
  </changeSet>
</databaseChangeLog>
EOF

# Run migrations
liquibase update

# Show status
liquibase status

# Rollback last changeset
liquibase rollback-count 1

# Generate diff from two databases
liquibase diff

# Generate changelog from existing database
liquibase generate-changelog
```

### dbmate Setup

```bash
# Installation
brew install dbmate

# Or download from GitHub releases

# Configuration via environment variables
export DATABASE_URL="postgres://postgres:secret@localhost:5432/mydb?sslmode=disable"

# Or create .env file
# DATABASE_URL=postgres://postgres:secret@localhost:5432/mydb
```

**Basic Usage**:

```bash
# Create new migration
dbmate new add_users_table
# Creates: db/migrations/20260210143022_add_users_table.sql

# Edit migration
cat > db/migrations/20260210143022_add_users_table.sql << 'EOF'
-- migrate:up
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- migrate:down
DROP TABLE users;
EOF

# Run migrations
dbmate up

# Rollback last migration
dbmate down

# Show migration status
dbmate status

# Dump schema
dbmate dump

# Wait for database (useful in Docker)
dbmate wait
```

### sqitch Setup

```bash
# Installation
brew install sqitch --with-postgres-support

# Or: apt-get install sqitch libdbd-pg-perl

# Initialize project
sqitch init myapp --engine pg

# Configure database
sqitch config --user engine.pg.client psql
sqitch config --user engine.pg.target db:pg://postgres:secret@localhost/mydb
```

**Basic Usage**:

```bash
# Add new change
sqitch add users -n "Create users table"
# Creates:
#   deploy/users.sql
#   revert/users.sql
#   verify/users.sql

# Edit deploy/users.sql
cat > deploy/users.sql << 'EOF'
-- Deploy myapp:users to pg

BEGIN;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL
);

COMMIT;
EOF

# Edit revert/users.sql
cat > revert/users.sql << 'EOF'
-- Revert myapp:users from pg

BEGIN;

DROP TABLE users;

COMMIT;
EOF

# Edit verify/users.sql
cat > verify/users.sql << 'EOF'
-- Verify myapp:users on pg

SELECT id, username, email FROM users WHERE FALSE;
EOF

# Deploy changes
sqitch deploy

# Show status
sqitch status

# Revert last change
sqitch revert

# Verify deployment
sqitch verify
```

### Prisma Migrate Setup

```bash
# Install Prisma
npm install -D prisma
npm install @prisma/client

# Initialize Prisma
npx prisma init

# Edit schema.prisma
cat > prisma/schema.prisma << 'EOF'
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  posts     Post[]
  createdAt DateTime @default(now())
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String?
  published Boolean  @default(false)
  authorId  Int
  author    User     @relation(fields: [authorId], references: [id])
}
EOF
```

**Basic Usage**:

```bash
# Create migration from schema
npx prisma migrate dev --name init

# Apply migrations in production
npx prisma migrate deploy

# Reset database (dev only)
npx prisma migrate reset

# Show migration status
npx prisma migrate status

# Generate Prisma Client
npx prisma generate
```

### golang-migrate Setup

```bash
# Installation
brew install golang-migrate

# Or: go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
```

**Basic Usage**:

```bash
# Create migration
migrate create -ext sql -dir migrations -seq create_users_table

# Creates:
#   migrations/000001_create_users_table.up.sql
#   migrations/000001_create_users_table.down.sql

# Run migrations
migrate -database postgres://postgres:secret@localhost:5432/mydb?sslmode=disable \
        -path migrations up

# Rollback
migrate -database postgres://postgres:secret@localhost:5432/mydb?sslmode=disable \
        -path migrations down 1

# Force version (fix dirty state)
migrate -database postgres://postgres:secret@localhost:5432/mydb?sslmode=disable \
        -path migrations force 1
```

### Alembic Setup

```bash
# Install Alembic
pip install alembic psycopg2-binary

# Initialize Alembic
alembic init migrations

# Edit alembic.ini
# sqlalchemy.url = postgresql://postgres:secret@localhost:5432/mydb
```

**Basic Usage**:

```bash
# Create migration
alembic revision -m "create users table"

# Edit generated migration file
# migrations/versions/xxxx_create_users_table.py

# Run migrations
alembic upgrade head

# Rollback one version
alembic downgrade -1

# Show current version
alembic current

# Show history
alembic history

# Auto-generate migration from models (requires SQLAlchemy models)
alembic revision --autogenerate -m "add new columns"
```

## Examples

### Example 1: Flyway Migration Workflow

```sql
-- migrations/V1__Initial_schema.sql
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
```

```sql
-- migrations/V2__Add_posts.sql
CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_published_at ON posts(published_at);
```

```bash
# Run migrations
flyway migrate

# Output:
# Successfully validated 2 migrations (execution time 00:00.010s)
# Current version of schema "public": << Empty Schema >>
# Migrating schema "public" to version "1 - Initial schema"
# Migrating schema "public" to version "2 - Add posts"
# Successfully applied 2 migrations to schema "public" (execution time 00:00.152s)
```

### Example 2: dbmate Complete Workflow

```bash
# Create migration
dbmate new create_products

# Edit db/migrations/20260210150000_create_products.sql
cat > db/migrations/20260210150000_create_products.sql << 'EOF'
-- migrate:up
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  stock INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_name ON products(name);

-- migrate:down
DROP TABLE IF EXISTS products;
EOF

# Apply migration
dbmate up

# Rollback
dbmate down

# Dump schema
dbmate dump
# Creates: db/schema.sql
```

### Example 3: Liquibase YAML Format

```yaml
# migrations/changelog.yaml
databaseChangeLog:
  - changeSet:
      id: 1
      author: alice
      changes:
        - createTable:
            tableName: users
            columns:
              - column:
                  name: id
                  type: SERIAL
                  constraints:
                    primaryKey: true
              - column:
                  name: username
                  type: VARCHAR(50)
                  constraints:
                    nullable: false
                    unique: true
              - column:
                  name: email
                  type: VARCHAR(255)
                  constraints:
                    nullable: false

  - changeSet:
      id: 2
      author: alice
      changes:
        - addColumn:
            tableName: users
            columns:
              - column:
                  name: created_at
                  type: TIMESTAMP
                  defaultValueComputed: CURRENT_TIMESTAMP

  - changeSet:
      id: 3
      author: alice
      changes:
        - createIndex:
            indexName: idx_users_email
            tableName: users
            columns:
              - column:
                  name: email
      rollback:
        - dropIndex:
            indexName: idx_users_email
            tableName: users
```

## Common Mistakes

### 1. Not Testing Rollbacks

**Wrong**: Only testing up migrations, never testing down.

**Correct**: Always test the complete cycle:
```bash
migrate up
# verify
migrate down
# verify cleanup
migrate up
# verify idempotency
```

### 2. Modifying Applied Migrations

**Wrong**: Changing a migration file after it has been applied to production.

**Correct**: Create a new migration to fix issues. Flyway will detect checksum changes and fail.

### 3. Missing Dependencies in golang-migrate

**Wrong**:
```sql
-- 2_add_foreign_key.up.sql
ALTER TABLE posts ADD CONSTRAINT fk_posts_users
FOREIGN KEY (user_id) REFERENCES users(id);
-- Fails if users table not created yet
```

**Correct**: Ensure migrations are numbered in dependency order.

### 4. Not Using Transactions in dbmate

**Wrong**:
```sql
-- migrate:up
CREATE TABLE users (...);
-- Error here leaves partial state
INSERT INTO users VALUES (...);
```

**Correct**:
```sql
-- migrate:up
BEGIN;
CREATE TABLE users (...);
INSERT INTO users VALUES (...);
COMMIT;
```

### 5. Forgetting Baseline in Flyway

**Wrong**: Running Flyway on an existing database without baseline.

**Correct**:
```bash
# For existing databases
flyway baseline -baselineVersion=0
flyway migrate
```

## Best Practices

### 1. Choose the Right Tool for Your Stack

- **Java projects**: Flyway or Liquibase
- **Node.js/TypeScript**: Prisma Migrate or dbmate
- **Go projects**: golang-migrate or dbmate
- **Python projects**: Alembic
- **PostgreSQL-specific**: sqitch or dbmate
- **Multi-database**: Liquibase

### 2. Keep Migrations in Version Control

Store migrations alongside application code:
```
project/
├── src/
├── migrations/
│   ├── V1__initial.sql
│   ├── V2__add_users.sql
│   └── V3__add_posts.sql
└── flyway.conf
```

### 3. Use Descriptive Migration Names

```
Good:
  V1__create_users_table.sql
  V2__add_email_verification.sql
  V3__create_posts_and_comments.sql

Bad:
  V1__migration.sql
  V2__changes.sql
  V3__fix.sql
```

### 4. Automate Migrations in CI/CD

```yaml
# GitHub Actions example
- name: Run Flyway Migrations
  run: flyway migrate
  env:
    FLYWAY_URL: ${{ secrets.DATABASE_URL }}
    FLYWAY_USER: ${{ secrets.DATABASE_USER }}
    FLYWAY_PASSWORD: ${{ secrets.DATABASE_PASSWORD }}
```

### 5. Use Environment Variables for Configuration

```bash
# .env (never commit to git)
DATABASE_URL=postgres://user:pass@localhost:5432/db
FLYWAY_USER=postgres
FLYWAY_PASSWORD=secret
```

### 6. Monitor Migration Performance

```bash
# Flyway with timing
flyway -X migrate  # verbose output with timing

# dbmate with timing
time dbmate up
```

### 7. Test Migrations Against Production-Like Data

Use sanitized production dumps for migration testing:
```bash
# Dump production schema (no data)
pg_dump -s -h prod-db -U postgres mydb > prod_schema.sql

# Restore to staging
psql -h staging-db -U postgres mydb < prod_schema.sql

# Test migrations
flyway migrate
```

## Practice Exercises

### Exercise 1: Set Up Flyway for a New Project

Initialize a Flyway project and create a multi-table schema.

**Solution**:

```bash
# Create project structure
mkdir -p myapp/migrations
cd myapp

# Create flyway.conf
cat > flyway.conf << 'EOF'
flyway.url=jdbc:postgresql://localhost:5432/myapp
flyway.user=postgres
flyway.password=postgres
flyway.locations=filesystem:./migrations
flyway.baselineOnMigrate=true
EOF

# Create V1 migration
cat > migrations/V1__Initial_schema.sql << 'EOF'
-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Posts table
CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    content TEXT,
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_slug ON posts(slug);
CREATE INDEX idx_posts_published_at ON posts(published_at) WHERE published_at IS NOT NULL;
EOF

# Run migration
flyway migrate

# Check status
flyway info
```

### Exercise 2: Create a dbmate Migration with Rollback

Create a migration that adds a feature and can be cleanly rolled back.

**Solution**:

```bash
# Create migration
dbmate new add_comments_feature

# Edit migration
cat > db/migrations/20260210160000_add_comments_feature.sql << 'EOF'
-- migrate:up
BEGIN;

-- Comments table
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_created_at ON comments(created_at);

-- Add comment count to posts
ALTER TABLE posts ADD COLUMN comment_count INTEGER DEFAULT 0;

-- Function to update comment count
CREATE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET comment_count = comment_count - 1 WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for comment count
CREATE TRIGGER trigger_update_comment_count
AFTER INSERT OR DELETE ON comments
FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();

COMMIT;

-- migrate:down
BEGIN;

-- Drop trigger and function
DROP TRIGGER IF EXISTS trigger_update_comment_count ON comments;
DROP FUNCTION IF EXISTS update_post_comment_count();

-- Drop column from posts
ALTER TABLE posts DROP COLUMN IF EXISTS comment_count;

-- Drop table
DROP TABLE IF EXISTS comments;

COMMIT;
EOF

# Test up migration
dbmate up

# Test down migration
dbmate down

# Re-apply
dbmate up
```

### Exercise 3: Liquibase Preconditions and Rollback

Create a Liquibase migration with preconditions and custom rollback.

**Solution**:

```xml
<!-- migrations/changelog.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
    http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.0.xsd">

  <!-- Add user roles with preconditions -->
  <changeSet id="3" author="alice">
    <preConditions onFail="MARK_RAN">
      <tableExists tableName="users"/>
      <not>
        <columnExists tableName="users" columnName="role"/>
      </not>
    </preConditions>

    <addColumn tableName="users">
      <column name="role" type="varchar(20)" defaultValue="user">
        <constraints nullable="false"/>
      </column>
    </addColumn>

    <createIndex indexName="idx_users_role" tableName="users">
      <column name="role"/>
    </createIndex>

    <rollback>
      <dropIndex indexName="idx_users_role" tableName="users"/>
      <dropColumn tableName="users" columnName="role"/>
    </rollback>
  </changeSet>

  <!-- Add email verification with data migration -->
  <changeSet id="4" author="alice">
    <preConditions onFail="HALT">
      <tableExists tableName="users"/>
    </preConditions>

    <addColumn tableName="users">
      <column name="email_verified" type="boolean" defaultValueBoolean="false">
        <constraints nullable="false"/>
      </column>
      <column name="verification_token" type="varchar(64)"/>
      <column name="verified_at" type="timestamp"/>
    </addColumn>

    <sql>
      UPDATE users SET email_verified = true WHERE created_at < NOW() - INTERVAL '30 days';
    </sql>

    <rollback>
      <dropColumn tableName="users" columnName="email_verified"/>
      <dropColumn tableName="users" columnName="verification_token"/>
      <dropColumn tableName="users" columnName="verified_at"/>
    </rollback>
  </changeSet>

</databaseChangeLog>
```

These exercises demonstrate setting up different migration tools and handling complex scenarios like rollbacks, preconditions, and data migrations.
