# Migration Concepts

## Theory

### Why Migrations Matter

Database migrations are version-controlled, incremental changes to your database schema and data. They are essential for:

- **Reproducibility**: Every environment (dev, staging, prod) has the exact same schema
- **Auditability**: Complete history of schema changes with timestamps and authors
- **Collaboration**: Multiple developers can work on schema changes without conflicts
- **Rollback capability**: Ability to revert changes when issues arise
- **CI/CD integration**: Automated deployment of database changes alongside application code
- **Documentation**: Migrations serve as living documentation of schema evolution

Without migrations, teams face manual schema synchronization, production drift, and deployment errors.

### Version-Controlled Schema Changes

Migrations treat database schema as code. Each migration file:

- Lives in version control (git) alongside application code
- Has a unique identifier (timestamp or sequential number)
- Contains both "up" (apply) and "down" (rollback) instructions
- Is immutable once deployed to production

This approach ensures that schema changes are:
- Reviewed through pull requests
- Tested in CI/CD pipelines
- Deployed consistently across all environments
- Traceable to specific features or bug fixes

### Up/Down Migrations

Migrations typically come in pairs:

**Up Migration**: Applies the change (creates table, adds column, etc.)
**Down Migration**: Reverses the change (drops table, removes column, etc.)

Benefits:
- Enables rollback if deployment fails
- Supports feature flag toggling
- Facilitates testing different schema versions

Challenges:
- Down migrations for data transformations can lose information
- Some operations are not reversible (e.g., dropping a column loses data)
- Down migrations must be tested as thoroughly as up migrations

### Idempotent Scripts

Idempotent migrations can run multiple times without error or side effects. This is critical for:

- Re-running failed migrations
- Developing and testing migrations locally
- Handling partial migration failures

**Key patterns**:
- Use `IF NOT EXISTS` when creating objects
- Use `IF EXISTS` when dropping objects
- Check for existence before adding constraints
- Use conditional logic for data migrations

### Migration Numbering and Timestamping

**Sequential numbering** (001, 002, 003):
- Simple and predictable
- Prone to conflicts in team environments
- Requires coordination when merging branches

**Timestamp-based** (20260210143022):
- Format: YYYYMMDDHHmmss
- Reduces merge conflicts
- Natural ordering by creation time
- Most popular approach

**Hybrid approaches**:
- Timestamp + description (20260210143022_add_users_table)
- Version + timestamp (v1.2.3_20260210143022)

### Migration History Tables

Migration tools maintain a history table (e.g., `schema_migrations`, `flyway_schema_history`) to track:

- Which migrations have been applied
- When they were applied
- Who applied them (in some tools)
- Checksum to detect modification
- Execution time and success/failure status

This table is the source of truth for the current schema state.

### Environments

Typical migration flow across environments:

**Development**:
- Rapid iteration
- Frequent rollbacks
- Test up and down migrations
- Use copy of production data (sanitized)

**Staging**:
- Production-like environment
- Final testing before production
- Validate migration performance on production-sized data
- Test deployment procedures

**Production**:
- Carefully planned deployment windows
- Monitoring during and after migration
- Rollback plan ready
- Minimal manual intervention

### Migration Workflow

**1. Create Migration**:
- Generate migration file with timestamp
- Write SQL or use ORM to define changes
- Add both up and down migrations

**2. Test Locally**:
- Apply migration to local database
- Verify application works with new schema
- Test rollback (down migration)
- Check for performance issues

**3. Code Review**:
- Peer review of migration code
- Check for dangerous operations
- Validate idempotency
- Review down migration logic

**4. Deploy to Staging**:
- Run migration on staging environment
- Execute integration tests
- Performance test with production-like data
- Practice rollback procedure

**5. Deploy to Production**:
- Schedule deployment window if needed
- Run migration with monitoring
- Verify application health
- Keep rollback plan ready

**6. Post-Deployment**:
- Monitor application metrics
- Check database performance
- Document any issues
- Update runbooks if needed

### Hand-Written SQL vs Generated Migrations

**Hand-Written SQL Migrations**:

Pros:
- Full control over SQL execution
- Can optimize for specific PostgreSQL features
- Easier to review and understand
- Better for complex data transformations
- Can include comments and documentation

Cons:
- More time-consuming to write
- Requires SQL expertise
- Potential for syntax errors
- Must manually ensure idempotency

**Generated Migrations (from ORM)**:

Pros:
- Automatically generated from model changes
- Faster for simple schema changes
- Reduces human error in basic operations
- Consistent with application code

Cons:
- May generate suboptimal SQL
- Can miss PostgreSQL-specific features
- Less control over execution order
- May require manual editing for complex changes
- Generated down migrations can be incomplete

**Best Practice**: Use generated migrations as a starting point, then hand-edit for:
- Performance optimization
- PostgreSQL-specific features (indexes, constraints)
- Complex data transformations
- Zero-downtime deployment patterns

## Syntax

### Idempotent Table Creation

```sql
-- Check if table exists before creating
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Idempotent Column Addition

```sql
-- Add column only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'last_login'
    ) THEN
        ALTER TABLE users ADD COLUMN last_login TIMESTAMP;
    END IF;
END $$;
```

### Idempotent Index Creation

```sql
-- Create index only if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- For unique indexes, use CONCURRENTLY in production
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_users_username
ON users(username);
```

### Idempotent Constraint Addition

```sql
-- Add constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'check_email_format'
    ) THEN
        ALTER TABLE users
        ADD CONSTRAINT check_email_format
        CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$');
    END IF;
END $$;
```

### Idempotent Cleanup

```sql
-- Drop table safely
DROP TABLE IF EXISTS temp_migration_data;

-- Drop column safely
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'deprecated_field'
    ) THEN
        ALTER TABLE users DROP COLUMN deprecated_field;
    END IF;
END $$;
```

### Migration History Table

```sql
-- Common migration history table structure
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    applied_by VARCHAR(100) DEFAULT CURRENT_USER,
    description TEXT,
    checksum VARCHAR(64),
    execution_time_ms INTEGER
);

-- Insert migration record
INSERT INTO schema_migrations (version, description, checksum)
VALUES ('20260210143022', 'Add users table', 'abc123def456')
ON CONFLICT (version) DO NOTHING;
```

## Examples

### Example 1: Complete Up/Down Migration

```sql
-- Migration: 20260210143022_create_products_table.up.sql

BEGIN;

-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    stock INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS trigger_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Record migration
INSERT INTO schema_migrations (version, description)
VALUES ('20260210143022', 'Create products table')
ON CONFLICT (version) DO NOTHING;

COMMIT;
```

```sql
-- Migration: 20260210143022_create_products_table.down.sql

BEGIN;

-- Drop trigger
DROP TRIGGER IF EXISTS trigger_products_updated_at ON products;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop table (cascades indexes)
DROP TABLE IF EXISTS products CASCADE;

-- Remove migration record
DELETE FROM schema_migrations WHERE version = '20260210143022';

COMMIT;
```

### Example 2: Idempotent Data Migration

```sql
-- Migration: 20260210150000_add_default_categories.up.sql

BEGIN;

-- Create categories table if not exists
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

-- Insert default categories (idempotent using ON CONFLICT)
INSERT INTO categories (name, description) VALUES
    ('Electronics', 'Electronic devices and accessories'),
    ('Clothing', 'Apparel and fashion items'),
    ('Books', 'Books and publications')
ON CONFLICT (name) DO NOTHING;

-- Add category_id to products if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'category_id'
    ) THEN
        ALTER TABLE products ADD COLUMN category_id INTEGER REFERENCES categories(id);
    END IF;
END $$;

-- Record migration
INSERT INTO schema_migrations (version, description)
VALUES ('20260210150000', 'Add default categories')
ON CONFLICT (version) DO NOTHING;

COMMIT;
```

### Example 3: Complex Schema Change with Validation

```sql
-- Migration: 20260210160000_add_user_roles.up.sql

BEGIN;

-- Create enum type for roles (idempotent check)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'user', 'guest');
    END IF;
END $$;

-- Add role column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'role'
    ) THEN
        ALTER TABLE users ADD COLUMN role user_role DEFAULT 'user';
    END IF;
END $$;

-- Backfill existing users with 'user' role
UPDATE users SET role = 'user' WHERE role IS NULL;

-- Make role NOT NULL after backfill
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'role'
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE users ALTER COLUMN role SET NOT NULL;
    END IF;
END $$;

-- Create index on role
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Record migration
INSERT INTO schema_migrations (version, description)
VALUES ('20260210160000', 'Add user roles')
ON CONFLICT (version) DO NOTHING;

COMMIT;
```

## Common Mistakes

### 1. Non-Idempotent Migrations

**Wrong**:
```sql
-- This fails if run twice
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
CREATE INDEX idx_users_phone ON users(phone);
```

**Correct**:
```sql
-- Idempotent version
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'phone'
    ) THEN
        ALTER TABLE users ADD COLUMN phone VARCHAR(20);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
```

### 2. Modifying Applied Migrations

**Wrong**: Editing a migration that has already been applied to production.

**Correct**: Create a new migration to fix issues. Migrations are immutable once applied.

### 3. Missing Transaction Wrappers

**Wrong**:
```sql
-- No transaction - partial execution on error
CREATE TABLE products (...);
CREATE INDEX idx_products_name ON products(name);
INSERT INTO products VALUES (...); -- Error here leaves table created
```

**Correct**:
```sql
BEGIN;
CREATE TABLE IF NOT EXISTS products (...);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
INSERT INTO products VALUES (...);
COMMIT;
```

### 4. Dangerous Operations in Production

**Wrong**:
```sql
-- This locks the table and may cause downtime
ALTER TABLE large_table ADD COLUMN new_col INTEGER NOT NULL DEFAULT 0;
```

**Correct**:
```sql
-- Add as nullable first, backfill, then add constraint
ALTER TABLE large_table ADD COLUMN new_col INTEGER;
-- Backfill in batches (separate migration or batch script)
-- Then add NOT NULL constraint
```

### 5. Missing Down Migrations

**Wrong**: Only providing up migration without down.

**Correct**: Always provide a down migration for rollback capability.

### 6. Data Loss in Down Migrations

**Wrong**:
```sql
-- Down migration
DROP TABLE users; -- Loses all user data!
```

**Correct**: Document that down migration causes data loss, or make it irreversible:
```sql
-- Down migration
-- WARNING: This migration cannot be reversed without data loss
-- Manual intervention required to restore from backup
RAISE EXCEPTION 'Cannot reverse this migration automatically';
```

### 7. Hardcoded Environment-Specific Values

**Wrong**:
```sql
INSERT INTO config VALUES ('api_url', 'https://prod.example.com');
```

**Correct**:
```sql
-- Use environment variables or separate configuration
INSERT INTO config VALUES ('api_url', current_setting('app.api_url', true));
```

## Best Practices

### 1. One Logical Change Per Migration

Each migration should represent a single, cohesive change:
- Create one table and its indexes
- Add a feature's related columns
- Perform one data transformation

This makes migrations easier to review, test, and rollback.

### 2. Use Descriptive Migration Names

```
Good: 20260210143022_add_user_email_verification.sql
Bad:  20260210143022_changes.sql
```

### 3. Always Use Transactions

Wrap migrations in BEGIN/COMMIT to ensure atomicity:
```sql
BEGIN;
-- migration code
COMMIT;
```

Exception: Some operations (CREATE INDEX CONCURRENTLY) cannot run in transactions.

### 4. Test Both Up and Down

Before deploying:
- Apply migration (up)
- Verify application works
- Rollback (down)
- Re-apply (up)
- Verify idempotency

### 5. Add Comments and Documentation

```sql
-- Migration: Add email verification
-- Purpose: Implement email verification feature for user registration
-- Related: JIRA-123
-- Author: dev@example.com
-- Date: 2026-02-10

BEGIN;
-- Add verification token column
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(64);
-- ...
COMMIT;
```

### 6. Handle Existing Data Carefully

When adding constraints or changing data types:
1. Add the change without constraints
2. Backfill or transform existing data
3. Validate the data
4. Add constraints

### 7. Use Migration Checksums

Ensure migrations haven't been modified after application:
```sql
INSERT INTO schema_migrations (version, checksum)
VALUES ('20260210143022', md5('migration_content_here'));
```

### 8. Plan for Rollback

- Keep down migrations up to date
- Document irreversible changes
- Test rollback in staging
- Have backup/restore plan for production

### 9. Coordinate with Application Deployments

- Deploy backward-compatible schema changes first
- Deploy application code second
- Remove deprecated schema in a later migration

### 10. Monitor Migration Execution

- Set statement timeouts
- Monitor lock waits
- Log execution time
- Alert on failures

## Practice Exercises

### Exercise 1: Create an Idempotent Migration System

Create a complete migration for a blog system with up and down migrations.

**Requirements**:
1. Create tables: `posts`, `comments`, `tags`, `post_tags`
2. All migrations must be idempotent
3. Include appropriate indexes
4. Add a trigger to update `updated_at` on posts
5. Insert default tags: 'tutorial', 'news', 'announcement'
6. Create down migrations that cleanly reverse everything

**Solution**:

```sql
-- 20260210170000_create_blog_schema.up.sql

BEGIN;

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    content TEXT,
    author_id INTEGER NOT NULL,
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_published_at ON posts(published_at);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON comments(author_id);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Post-tags junction table
CREATE TABLE IF NOT EXISTS post_tags (
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_post_tags_tag_id ON post_tags(tag_id);

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_blog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_posts_updated_at'
    ) THEN
        CREATE TRIGGER trigger_posts_updated_at
            BEFORE UPDATE ON posts
            FOR EACH ROW
            EXECUTE FUNCTION update_blog_updated_at();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_comments_updated_at'
    ) THEN
        CREATE TRIGGER trigger_comments_updated_at
            BEFORE UPDATE ON comments
            FOR EACH ROW
            EXECUTE FUNCTION update_blog_updated_at();
    END IF;
END $$;

-- Insert default tags
INSERT INTO tags (name) VALUES
    ('tutorial'),
    ('news'),
    ('announcement')
ON CONFLICT (name) DO NOTHING;

-- Record migration
INSERT INTO schema_migrations (version, description)
VALUES ('20260210170000', 'Create blog schema')
ON CONFLICT (version) DO NOTHING;

COMMIT;
```

```sql
-- 20260210170000_create_blog_schema.down.sql

BEGIN;

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_posts_updated_at ON posts;
DROP TRIGGER IF EXISTS trigger_comments_updated_at ON comments;

-- Drop function
DROP FUNCTION IF EXISTS update_blog_updated_at();

-- Drop tables (in reverse dependency order)
DROP TABLE IF EXISTS post_tags CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS posts CASCADE;

-- Remove migration record
DELETE FROM schema_migrations WHERE version = '20260210170000';

COMMIT;
```

### Exercise 2: Safe Column Addition with Data Backfill

Create a migration that adds a `full_name` column to users, backfills it from `first_name` and `last_name`, then makes it NOT NULL.

**Solution**:

```sql
-- 20260210180000_add_users_full_name.up.sql

BEGIN;

-- Step 1: Add column as nullable
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'full_name'
    ) THEN
        ALTER TABLE users ADD COLUMN full_name VARCHAR(255);
    END IF;
END $$;

-- Step 2: Backfill existing data
UPDATE users
SET full_name = CONCAT_WS(' ', first_name, last_name)
WHERE full_name IS NULL AND (first_name IS NOT NULL OR last_name IS NOT NULL);

-- Step 3: Set NOT NULL constraint
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'full_name'
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE users ALTER COLUMN full_name SET NOT NULL;
    END IF;
END $$;

-- Step 4: Create index
CREATE INDEX IF NOT EXISTS idx_users_full_name ON users(full_name);

-- Record migration
INSERT INTO schema_migrations (version, description)
VALUES ('20260210180000', 'Add full_name to users')
ON CONFLICT (version) DO NOTHING;

COMMIT;
```

### Exercise 3: Migration with Environment-Specific Logic

Create a migration that behaves differently in development vs production environments.

**Solution**:

```sql
-- 20260210190000_add_sample_data.up.sql

BEGIN;

-- Create a settings table if not exists
CREATE TABLE IF NOT EXISTS app_settings (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Only insert sample data in development
DO $$
DECLARE
    env TEXT;
BEGIN
    -- Check environment (assumes app.environment is set)
    env := current_setting('app.environment', true);

    IF env IS NULL OR env = 'development' THEN
        -- Insert sample users for development
        INSERT INTO users (username, email, full_name, role) VALUES
            ('alice', 'alice@example.com', 'Alice Smith', 'admin'),
            ('bob', 'bob@example.com', 'Bob Johnson', 'user'),
            ('charlie', 'charlie@example.com', 'Charlie Brown', 'user')
        ON CONFLICT (username) DO NOTHING;

        RAISE NOTICE 'Sample data inserted for development environment';
    ELSE
        RAISE NOTICE 'Skipping sample data for environment: %', env;
    END IF;
END $$;

-- Record migration
INSERT INTO schema_migrations (version, description)
VALUES ('20260210190000', 'Add sample data (dev only)')
ON CONFLICT (version) DO NOTHING;

COMMIT;
```

These exercises demonstrate real-world migration patterns: complex schema creation with dependencies, safe data transformations, and environment-aware migrations.
