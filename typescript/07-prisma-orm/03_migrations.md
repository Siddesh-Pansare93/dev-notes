# Migrations Workflow

Learn how to manage database schema changes with Prisma Migrate, from development to production deployments.

## What You'll Learn

- Development vs production migration workflows
- Creating and applying migrations
- Migration history and version control
- Resolving migration conflicts
- Rolling back changes
- Database seeding strategies

## Understanding Prisma Migrate

**Prisma Migrate** is a declarative migration system that:
- Generates SQL migration files from schema changes
- Maintains migration history in version control
- Applies migrations consistently across environments
- Supports both development and production workflows

### Migration Workflow Overview

```
Schema Change → Migration File → Database Update → Prisma Client Regeneration
```

## Development Workflow

### Creating Your First Migration

1. **Define models in schema.prisma**:

```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
}
```

2. **Create and apply migration**:

```bash
npx prisma migrate dev --name init
```

This command:
1. Creates `prisma/migrations/TIMESTAMP_init/migration.sql`
2. Applies migration to development database
3. Generates Prisma Client with new types

**Generated migration file**:

```sql
-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
```

### Adding Fields to Existing Models

1. **Update schema**:

```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  role      String   @default("USER")  // New field
  createdAt DateTime @default(now())
}
```

2. **Create migration**:

```bash
npx prisma migrate dev --name add_user_role
```

**Generated SQL**:

```sql
-- AlterTable
ALTER TABLE "User" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'USER';
```

### Adding Relations

1. **Update schema with relation**:

```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  posts     Post[]   // New relation
  createdAt DateTime @default(now())
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String?
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id])
  authorId  Int
  createdAt DateTime @default(now())
}
```

2. **Create migration**:

```bash
npx prisma migrate dev --name add_posts
```

**Generated SQL**:

```sql
-- CreateTable
CREATE TABLE "Post" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "authorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Post_authorId_idx" ON "Post"("authorId");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" 
FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

## Migration Commands

### prisma migrate dev

**Development-only command** - use during active development.

```bash
# Create named migration
npx prisma migrate dev --name add_user_profile

# Create migration without applying (for review)
npx prisma migrate dev --create-only --name add_comments

# Skip Prisma Client generation
npx prisma migrate dev --skip-generate
```

**What it does**:
1. Detects schema changes
2. Creates migration file
3. Applies migration to database
4. Updates `_prisma_migrations` table
5. Regenerates Prisma Client

### prisma migrate deploy

**Production command** - use in CI/CD and production.

```bash
npx prisma migrate deploy
```

**What it does**:
1. Applies pending migrations only
2. Does NOT create new migrations
3. Does NOT require shadow database
4. Safe for production environments

**Example in production**:

```bash
# In your deployment script
npm install
npx prisma migrate deploy
npx prisma generate
npm run build
npm start
```

### prisma migrate reset

**Dangerous**: Drops database and reapplies all migrations.

```bash
npx prisma migrate reset
```

**What it does**:
1. Drops database
2. Creates fresh database
3. Applies all migrations from scratch
4. Runs seed script (if configured)

**Use cases**:
- Reset development database
- Fix corrupt migration history
- Start fresh with clean state

### prisma migrate status

Check migration status and pending migrations.

```bash
npx prisma migrate status
```

**Output examples**:

```
Database schema is up to date!

or

Following migrations are pending:
- 20240115_add_comments
- 20240116_add_likes
```

### prisma migrate resolve

Mark migrations as applied or rolled back without running them.

```bash
# Mark migration as applied
npx prisma migrate resolve --applied "20240115_add_comments"

# Mark migration as rolled back
npx prisma migrate resolve --rolled-back "20240115_add_comments"
```

**Use when**:
- Migration was applied manually
- Fixing migration history inconsistencies

## Migration Directory Structure

```
prisma/
├── schema.prisma
└── migrations/
    ├── 20240115120000_init/
    │   └── migration.sql
    ├── 20240116153000_add_posts/
    │   └── migration.sql
    ├── 20240117092000_add_comments/
    │   └── migration.sql
    └── migration_lock.toml
```

**migration_lock.toml**: Locks migrations to specific database provider.

```toml
# Please do not edit this file manually
provider = "postgresql"
```

## Shadow Database

A **shadow database** is a temporary database used to:
- Detect schema drift
- Generate accurate migrations
- Validate migration SQL

**Configuration**:

```prisma
datasource db {
  provider          = "postgresql"
  url               = env("DATABASE_URL")
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL")  // Optional
}
```

**When needed**:
- Cloud databases with restrictions
- Shared development databases
- Database users without CREATE DATABASE permission

**Auto-creation**:
If not specified, Prisma creates and drops a shadow database automatically during `migrate dev`.

## Handling Schema Changes

### Renaming Fields

❌ **Don't** rename directly:

```prisma
model User {
  id        Int    @id
  // name   String  // Old
  fullName  String  // This creates DROP + ADD
}
```

✅ **Do** use @map:

```prisma
model User {
  id       Int    @id
  fullName String @map("name")  // Maps to existing column
}
```

or create custom migration:

```bash
npx prisma migrate dev --create-only --name rename_user_name
```

Edit generated SQL:
```sql
-- Manual rename (preserves data)
ALTER TABLE "User" RENAME COLUMN "name" TO "fullName";
```

### Making Fields Required

When adding a non-nullable field to existing data:

1. **Add as optional first**:

```prisma
model User {
  id    Int     @id
  email String  @unique
  role  String? // Optional initially
}
```

```bash
npx prisma migrate dev --name add_role_optional
```

2. **Populate data**:

```typescript
await prisma.user.updateMany({
  data: { role: 'USER' }
})
```

3. **Make required**:

```prisma
model User {
  id    Int    @id
  email String @unique
  role  String @default("USER") // Now required with default
}
```

```bash
npx prisma migrate dev --name make_role_required
```

### Deleting Models

When removing a model:

```prisma
// Remove this model
// model OldData {
//   id Int @id
// }
```

```bash
npx prisma migrate dev --name remove_old_data
```

**Generated migration**:

```sql
-- DropTable
DROP TABLE "OldData";
```

⚠️ **Warning**: This permanently deletes data! Backup first.

## Version Control Best Practices

### What to Commit

✅ **Always commit**:
- `prisma/schema.prisma`
- `prisma/migrations/` directory (all migrations)
- `prisma/migrations/migration_lock.toml`

❌ **Never commit**:
- `.env` file (database credentials)
- `node_modules/@prisma/client` (generated code)

### .gitignore Configuration

```gitignore
# Environment variables
.env
.env.*

# Dependencies
node_modules/

# Database files (if using SQLite)
*.db
*.db-journal

# Prisma generated client (will be regenerated)
node_modules/.prisma/
node_modules/@prisma/client/
```

### Migration Naming Conventions

Use descriptive, verb-first names:

```bash
✅ Good names:
npx prisma migrate dev --name add_user_profile
npx prisma migrate dev --name create_comments_table
npx prisma migrate dev --name add_post_published_index
npx prisma migrate dev --name remove_old_auth_table

❌ Bad names:
npx prisma migrate dev --name update
npx prisma migrate dev --name changes
npx prisma migrate dev --name fix
```

## Production Deployment Workflow

### 1. Development Environment

```bash
# Make schema changes
# Create migration
npx prisma migrate dev --name add_feature

# Commit to git
git add prisma/
git commit -m "Add feature migration"
git push
```

### 2. CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
      
      - name: Generate Prisma Client
        run: npx prisma generate
      
      - name: Build application
        run: npm run build
      
      - name: Deploy
        run: # ... your deployment command
```

### 3. Production Server

```bash
# Pull latest code
git pull

# Install dependencies
npm ci

# Run migrations
DATABASE_URL=$PROD_DB_URL npx prisma migrate deploy

# Generate client
npx prisma generate

# Build and restart
npm run build
pm2 restart app
```

## Database Seeding

### Setting Up Seed Script

1. **Create seed file** (`prisma/seed.ts`):

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Clear existing data
  await prisma.post.deleteMany()
  await prisma.user.deleteMany()

  // Create users
  const alice = await prisma.user.create({
    data: {
      email: 'alice@prisma.io',
      name: 'Alice',
      posts: {
        create: [
          {
            title: 'First Post',
            content: 'Hello World!',
            published: true
          },
          {
            title: 'Draft Post',
            content: 'Work in progress...'
          }
        ]
      }
    }
  })

  const bob = await prisma.user.create({
    data: {
      email: 'bob@prisma.io',
      name: 'Bob',
      posts: {
        create: {
          title: 'Bob\'s Post',
          published: true
        }
      }
    }
  })

  console.log({ alice, bob })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

2. **Configure in package.json**:

```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  },
  "scripts": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

3. **Run seed**:

```bash
# Run seed manually
npm run seed

# Or automatically after migrate reset
npx prisma migrate reset  # Runs seed automatically
```

### Production-Safe Seeding

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Only seed if database is empty
  const userCount = await prisma.user.count()
  
  if (userCount > 0) {
    console.log('Database already seeded, skipping...')
    return
  }

  // Use upsert for idempotency
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin',
      role: 'ADMIN'
    }
  })

  console.log('Seeded admin user:', admin)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

## Troubleshooting Migrations

### Problem: Schema drift detected

```
Error: Schema drift detected
```

**Solution**: Your database schema doesn't match your Prisma schema.

```bash
# Option 1: Reset and reapply all migrations
npx prisma migrate reset

# Option 2: Generate migration to fix drift
npx prisma migrate dev --name fix_drift

# Option 3: Push schema directly (development only)
npx prisma db push
```

### Problem: Migration conflicts

```
Error: Migration failed to apply cleanly
```

**Solutions**:

```bash
# Check migration status
npx prisma migrate status

# Mark failed migration as rolled back
npx prisma migrate resolve --rolled-back "MIGRATION_NAME"

# Fix schema and create new migration
npx prisma migrate dev --name fix_conflict
```

### Problem: Cannot create shadow database

```
Error: Can't reach database server
```

**Solution**: Provide explicit shadow database URL

```prisma
datasource db {
  provider          = "postgresql"
  url               = env("DATABASE_URL")
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
}
```

```bash
# .env
DATABASE_URL="postgresql://user:pass@host:5432/myapp"
SHADOW_DATABASE_URL="postgresql://user:pass@host:5432/myapp_shadow"
```

## Migration Strategy Comparison

### Prisma Migrate vs db push

| Feature | migrate dev | db push |
|---------|-------------|---------|
| Creates migration files | ✅ Yes | ❌ No |
| Version control | ✅ Yes | ❌ No |
| Production safe | ✅ Yes | ❌ No |
| Requires shadow DB | ✅ Yes | ❌ No |
| Fast prototyping | ❌ No | ✅ Yes |
| Idempotent | ✅ Yes | ✅ Yes |

**Use `db push` for**:
- Rapid prototyping
- Schema experiments
- Non-production environments

**Use `migrate dev/deploy` for**:
- Production applications
- Team collaboration
- Version-controlled schema changes

## Best Practices

1. **Always name migrations descriptively**
   ```bash
   npx prisma migrate dev --name add_user_profile
   ```

2. **Review migration SQL before applying**
   ```bash
   npx prisma migrate dev --create-only
   # Review prisma/migrations/*/migration.sql
   npx prisma migrate dev
   ```

3. **Backup production database before migrations**
   ```bash
   pg_dump -U user -d database > backup.sql
   npx prisma migrate deploy
   ```

4. **Test migrations on staging first**
   ```
   Dev → Staging → Production
   ```

5. **Keep migrations small and focused**
   - One logical change per migration
   - Easier to review and rollback

6. **Commit migrations with related code changes**
   ```bash
   git add prisma/ src/
   git commit -m "Add user profile feature"
   ```

7. **Never edit applied migrations**
   - Create new migration instead
   - Editing breaks migration history

8. **Use seed data for consistent dev environments**
   ```bash
   npx prisma migrate reset  # Resets + seeds
   ```

## Practice Exercises

1. **Exercise 1**: Create a blog schema with Users and Posts, then create initial migration
2. **Exercise 2**: Add Comments model via new migration
3. **Exercise 3**: Add an index to the Post.createdAt field
4. **Exercise 4**: Rename a field using @map to preserve data
5. **Exercise 5**: Create a seed script with 10 users and 50 posts
6. **Exercise 6**: Simulate a production deployment workflow

## Summary

- `prisma migrate dev`: Development workflow (creates + applies migrations)
- `prisma migrate deploy`: Production workflow (applies only)
- `prisma migrate reset`: Drop DB and reapply all migrations
- Migration files are version-controlled SQL
- Shadow database validates migrations
- Always backup before production migrations
- Use seed scripts for consistent test data
- Review SQL before applying to production

Continue to [Prisma Client and CRUD Operations](./04_prisma_client_crud.md) →
