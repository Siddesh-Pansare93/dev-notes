# Setup and Installation

Learn how to set up Prisma 5.x in a TypeScript/Node.js project from scratch.

## What You'll Learn

- Installing Prisma CLI and Client
- Initializing a Prisma project
- Configuring different databases (PostgreSQL, MySQL, SQLite)
- Setting up TypeScript project structure
- Environment variable configuration
- First database connection

## Prerequisites

- Node.js 16.13.0 or higher
- npm or yarn package manager
- Basic TypeScript knowledge

## Installation Steps

### 1. Create a New TypeScript Project

```bash
# Create project directory
mkdir my-prisma-app
cd my-prisma-app

# Initialize npm project
npm init -y

# Install TypeScript and dependencies
npm install typescript ts-node @types/node --save-dev

# Create tsconfig.json
npx tsc --init
```

### 2. Configure TypeScript

Update `tsconfig.json` with optimal settings for Prisma:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

### 3. Install Prisma

```bash
# Install Prisma CLI as dev dependency
npm install prisma --save-dev

# Install Prisma Client
npm install @prisma/client
```

**Package Breakdown**:
- `prisma`: CLI tool for schema management, migrations, and code generation
- `@prisma/client`: Query builder for type-safe database access

### 4. Initialize Prisma

```bash
# Initialize with PostgreSQL (default)
npx prisma init

# Or specify a different database
npx prisma init --datasource-provider postgresql
npx prisma init --datasource-provider mysql
npx prisma init --datasource-provider sqlite
```

This creates:
- `prisma/schema.prisma`: Schema definition file
- `.env`: Environment variables file

## Database Configuration

### PostgreSQL Setup

**Install PostgreSQL** (if not already installed):
- macOS: `brew install postgresql`
- Ubuntu: `sudo apt-get install postgresql`
- Windows: Download from [postgresql.org](https://www.postgresql.org/download/)

**Connection URL format**:
```bash
# .env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=SCHEMA"

# Example for local development
DATABASE_URL="postgresql://postgres:password@localhost:5432/mydb?schema=public"

# Example for cloud (e.g., Railway, Supabase)
DATABASE_URL="postgresql://user:pass@host.railway.app:5432/railway"
```

### MySQL Setup

```bash
# .env
DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE"

# Example
DATABASE_URL="mysql://root:password@localhost:3306/mydb"
```

### SQLite Setup (Best for Learning)

```bash
# .env
DATABASE_URL="file:./dev.db"
```

**Advantages of SQLite for development**:
- No server setup required
- File-based, easy to reset
- Perfect for tutorials and prototyping

## Schema File Structure

After initialization, `prisma/schema.prisma` looks like:

```prisma
// This is your Prisma schema file
// Learn more: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-py"
  output   = "../node_modules/@prisma/client"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Add your models here
```

### Generator Block

```prisma
generator client {
  provider = "prisma-client-js"
  // Optional: customize output location
  output   = "../generated/client"
  
  // Optional: enable preview features
  previewFeatures = ["fullTextSearch", "metrics"]
}
```

**Key Options**:
- `provider`: Always "prisma-client-js" for TypeScript/JavaScript
- `output`: Where to generate Prisma Client (default: node_modules)
- `previewFeatures`: Array of experimental features to enable

### Datasource Block

```prisma
datasource db {
  provider = "postgresql" // or "mysql", "sqlite", "sqlserver", "mongodb"
  url      = env("DATABASE_URL")
  
  // Optional: shadow database for migrations
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
}
```

## Project Structure

```
my-prisma-app/
├── node_modules/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Migration history (created later)
├── src/
│   ├── index.ts               # Main application file
│   └── prisma.ts              # Prisma Client instance
├── .env                       # Environment variables
├── .gitignore                 # Git ignore file
├── package.json
└── tsconfig.json
```

## Creating Prisma Client Instance

Create `src/prisma.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

// Singleton pattern for Prisma Client
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: ['query', 'error', 'warn'], // Enable logging
  })
}

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma
}
```

**Why singleton pattern?**
- Prevents multiple Prisma Client instances
- Avoids connection pool exhaustion
- Reuses connections in development (hot reload)

### Alternative: Simple Instance

For simple scripts:

```typescript
// src/prisma.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default prisma
```

## First Schema Model

Add a simple User model to `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## Create and Apply Migration

```bash
# Create migration and apply to database
npx prisma migrate dev --name init

# This will:
# 1. Create SQL migration file
# 2. Apply migration to database
# 3. Generate Prisma Client types
```

## First Database Query

Create `src/index.ts`:

```typescript
import prisma from './prisma'

async function main() {
  // Create a user
  const user = await prisma.user.create({
    data: {
      email: 'alice@prisma.io',
      name: 'Alice'
    }
  })
  
  console.log('Created user:', user)
  
  // Find all users
  const allUsers = await prisma.user.findMany()
  console.log('All users:', allUsers)
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

**Run the script**:

```bash
npx ts-node src/index.ts
```

## Package.json Scripts

Add helpful scripts to `package.json`:

```json
{
  "scripts": {
    "dev": "ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio",
    "prisma:seed": "ts-node prisma/seed.ts"
  }
}
```

## Environment Variables Best Practices

### Development (.env)

```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/myapp_dev"

# Node environment
NODE_ENV="development"

# Prisma logging
PRISMA_LOG_QUERIES="true"
```

### Production (.env.production)

```bash
DATABASE_URL="postgresql://user:pass@prod-host:5432/myapp"
NODE_ENV="production"
```

**Security tips**:
- Never commit `.env` to version control
- Add `.env` to `.gitignore`
- Use different databases for dev/test/prod
- Rotate credentials regularly

## .gitignore Configuration

```gitignore
# Dependencies
node_modules/

# Environment variables
.env
.env.local
.env.*.local

# Build output
dist/

# SQLite database (if using SQLite)
*.db
*.db-journal

# IDE
.vscode/
.idea/
```

## Verifying Installation

Run this checklist:

```bash
# 1. Check Prisma CLI version
npx prisma --version

# 2. Validate schema
npx prisma validate

# 3. Format schema
npx prisma format

# 4. Generate Prisma Client
npx prisma generate

# 5. Check database connection
npx prisma db push --skip-generate
```

## Common Installation Issues

### Issue 1: "Cannot find module '@prisma/client'"

**Solution**: Generate Prisma Client
```bash
npx prisma generate
```

### Issue 2: "Environment variable not found: DATABASE_URL"

**Solution**: Create `.env` file with valid DATABASE_URL

### Issue 3: "Connection timeout"

**Solutions**:
- Check database server is running
- Verify connection URL credentials
- Check firewall/network settings
- Test with SQLite first for learning

### Issue 4: "Schema parsing error"

**Solution**: Validate schema syntax
```bash
npx prisma validate
npx prisma format
```

## Docker Setup (Optional)

For a consistent development environment:

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    ports:
      - '5432:5432'
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: myapp
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

```bash
# Start database
docker-compose up -d

# Update .env
DATABASE_URL="postgresql://postgres:password@localhost:5432/myapp"
```

## Prisma CLI Commands Reference

| Command | Description |
|---------|-------------|
| `prisma init` | Initialize Prisma project |
| `prisma generate` | Generate Prisma Client |
| `prisma migrate dev` | Create and apply migrations (dev) |
| `prisma migrate deploy` | Apply migrations (production) |
| `prisma db push` | Push schema without migrations |
| `prisma db pull` | Introspect existing database |
| `prisma studio` | Open Prisma Studio GUI |
| `prisma validate` | Validate schema file |
| `prisma format` | Format schema file |

## Next Steps

Now that you have Prisma installed and configured:

1. Learn about [Schema Definition](./02_schema_definition.md) to model your data
2. Understand the [Migrations Workflow](./03_migrations.md)
3. Practice [CRUD Operations](./04_prisma_client_crud.md)

## Practice Exercises

1. **Exercise 1**: Set up Prisma with PostgreSQL in a new project
2. **Exercise 2**: Create a schema with 3 models: User, Post, Comment
3. **Exercise 3**: Configure environment variables for dev and production
4. **Exercise 4**: Set up Docker Compose for local PostgreSQL
5. **Exercise 5**: Write a seed script to populate initial data

## Summary

- Prisma consists of CLI tool and Client library
- Initialize with `npx prisma init`
- Configure database via `DATABASE_URL` in `.env`
- Schema is defined in `prisma/schema.prisma`
- Generate Prisma Client with `npx prisma generate`
- Use singleton pattern for Prisma Client instance
- Always disconnect client after operations complete

Continue to [Schema Definition and Types](./02_schema_definition.md) →
