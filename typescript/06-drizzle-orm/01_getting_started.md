# Getting Started with Drizzle ORM

## Installation

### Basic Setup

```bash
# Install Drizzle ORM and Drizzle Kit
npm install drizzle-orm
npm install -D drizzle-kit

# Install database driver (choose one)
# PostgreSQL
npm install pg
npm install -D @types/pg

# or use postgres-js (recommended for serverless)
npm install postgres

# or Neon serverless
npm install @neondatabase/serverless

# or Vercel Postgres
npm install @vercel/postgres

# MySQL
npm install mysql2

# or PlanetScale
npm install @planetscale/database

# SQLite
npm install better-sqlite3
npm install -D @types/better-sqlite3

# or Cloudflare D1 (no install needed)
# or Turso/LibSQL
npm install @libsql/client
```

## Project Structure

```mermaid
graph TD
    project["project/"]
    src["src/"]
    db["db/"]
    schema["schema.ts<br/>(Database schema definition)"]
    index["index.ts<br/>(Database connection)"]
    migrations["migrations/<br/>(Migration files)"]
    appindex["index.ts<br/>(Application entry)"]
    drizzle["drizzle.config.ts<br/>(Drizzle Kit configuration)"]
    env[".env<br/>(Environment variables)"]
    pkg["package.json"]
    
    project --> src
    project --> drizzle
    project --> env
    project --> pkg
    src --> db
    src --> appindex
    db --> schema
    db --> index
    db --> migrations
```

## PostgreSQL Setup

### 1. Environment Variables

```bash
# .env
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
```

### 2. Database Connection (Node.js)

```typescript
// src/db/index.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create Drizzle instance
export const db = drizzle(pool, { schema });
```

### 3. Database Connection (Serverless - postgres-js)

```typescript
// src/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Create postgres connection
const client = postgres(process.env.DATABASE_URL!);

// Create Drizzle instance
export const db = drizzle(client, { schema });
```

### 4. Database Connection (Neon Serverless)

```typescript
// src/db/index.ts
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

### 5. Database Connection (Vercel Postgres)

```typescript
// src/db/index.ts
import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import * as schema from './schema';

export const db = drizzle(sql, { schema });
```

## MySQL Setup

### 1. Environment Variables

```bash
# .env
DATABASE_URL="mysql://user:password@localhost:3306/mydb"
```

### 2. Database Connection (MySQL2)

```typescript
// src/db/index.ts
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';

// Create connection pool
const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
});

// Create Drizzle instance
export const db = drizzle(pool, { schema });
```

### 3. Database Connection (PlanetScale)

```typescript
// src/db/index.ts
import { drizzle } from 'drizzle-orm/planetscale-serverless';
import { Client } from '@planetscale/database';
import * as schema from './schema';

// Create PlanetScale client
const client = new Client({
  url: process.env.DATABASE_URL,
});

// Create Drizzle instance
export const db = drizzle(client, { schema });
```

## SQLite Setup

### 1. Database Connection (Better SQLite3)

```typescript
// src/db/index.ts
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';

// Create SQLite database
const sqlite = new Database('sqlite.db');

// Create Drizzle instance
export const db = drizzle(sqlite, { schema });
```

### 2. Database Connection (Cloudflare D1)

```typescript
// src/db/index.ts
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

// In Cloudflare Worker
export default {
  async fetch(request: Request, env: Env) {
    const db = drizzle(env.DB, { schema });
    // Use db...
  },
};
```

### 3. Database Connection (Turso/LibSQL)

```typescript
// src/db/index.ts
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export const db = drizzle(client, { schema });
```

## Drizzle Kit Configuration

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  // Database dialect
  dialect: 'postgresql', // 'postgresql' | 'mysql' | 'sqlite'
  
  // Schema files
  schema: './src/db/schema.ts',
  
  // Output directory for migrations
  out: './src/db/migrations',
  
  // Database credentials
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  
  // Optional: Verbose logging
  verbose: true,
  
  // Optional: Strict mode
  strict: true,
});
```

## Basic Schema Definition

```typescript
// src/db/schema.ts
import { pgTable, serial, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

## First Query

```typescript
// src/index.ts
import { db } from './db';
import { users } from './db/schema';

async function main() {
  // Insert a user
  const newUser = await db.insert(users).values({
    name: 'John Doe',
    email: 'john@example.com',
  }).returning();
  
  console.log('Created user:', newUser);
  
  // Query all users
  const allUsers = await db.select().from(users);
  console.log('All users:', allUsers);
}

main().catch(console.error);
```

## Running the Application

```bash
# 1. Generate migration
npx drizzle-kit generate

# 2. Run migration (we'll cover this in detail later)
npx drizzle-kit push

# 3. Run your application
npx tsx src/index.ts
```

## Type Inference

One of Drizzle's superpowers is automatic type inference:

```typescript
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { users } from './db/schema';

// Infer the type for selecting
type User = InferSelectModel<typeof users>;
// { id: number; name: string; email: string; emailVerified: boolean; createdAt: Date; updatedAt: Date }

// Infer the type for inserting
type NewUser = InferInsertModel<typeof users>;
// { name: string; email: string; emailVerified?: boolean; createdAt?: Date; updatedAt?: Date }

// Use in functions
async function createUser(user: NewUser): Promise<User> {
  const [newUser] = await db.insert(users).values(user).returning();
  return newUser;
}
```

## Multiple Database Support

You can work with multiple databases:

```typescript
// src/db/index.ts
import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import { drizzle as sqliteDrizzle } from 'drizzle-orm/better-sqlite3';
import { Pool } from 'pg';
import Database from 'better-sqlite3';
import * as pgSchema from './schema-pg';
import * as sqliteSchema from './schema-sqlite';

// PostgreSQL for main data
const pgPool = new Pool({ connectionString: process.env.PG_URL });
export const pgDb = pgDrizzle(pgPool, { schema: pgSchema });

// SQLite for local cache
const sqlite = new Database('cache.db');
export const cacheDb = sqliteDrizzle(sqlite, { schema: sqliteSchema });
```

## Environment-Specific Configuration

```typescript
// src/db/index.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { drizzle as serverlessDrizzle } from 'drizzle-orm/neon-http';
import { Pool } from 'pg';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

// Use different driver based on environment
export const db = process.env.VERCEL
  ? serverlessDrizzle(neon(process.env.DATABASE_URL!), { schema })
  : drizzle(new Pool({ connectionString: process.env.DATABASE_URL }), { schema });
```

## Debugging and Logging

```typescript
// Enable query logging
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle(pool, {
  logger: true, // Simple logging
});

// Or custom logger
export const dbWithCustomLogger = drizzle(pool, {
  logger: {
    logQuery(query: string, params: unknown[]) {
      console.log('Query:', query);
      console.log('Params:', params);
    },
  },
});
```

## Practice Exercises

1. **Set up a PostgreSQL database** with Drizzle ORM and create a simple users table
2. **Create a schema** with at least 3 tables for a blog application (users, posts, comments)
3. **Configure Drizzle Kit** and generate your first migration
4. **Implement type-safe queries** to insert and select data
5. **Add logging** to see the generated SQL queries

## Common Pitfalls

❌ **Don't forget to install database drivers**
```bash
# Missing pg driver will cause runtime errors
npm install pg @types/pg
```

❌ **Don't mix schema patterns**
```typescript
// Bad - importing from wrong core
import { pgTable } from 'drizzle-orm/pg-core';
import { mysqlTable } from 'drizzle-orm/mysql-core'; // Don't mix!
```

✅ **Use environment variables**
```typescript
// Good
const db = drizzle(new Pool({ connectionString: process.env.DATABASE_URL }));

// Bad - hardcoded credentials
const db = drizzle(new Pool({ connectionString: 'postgresql://...' }));
```

## Next Steps

Continue to [Schema Definition](./02_schema_definition.md) to learn how to create complex database schemas with Drizzle ORM.
