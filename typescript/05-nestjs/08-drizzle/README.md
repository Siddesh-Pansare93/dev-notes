# NestJS + Drizzle ORM Integration Guide

Integrating Drizzle ORM into a NestJS application provides the extreme performance of raw SQL with the type safety and organizational structure of NestJS Modules, Services, and Repositories.

## 1. Setup & Installation

Install the required packages. We will use PostgreSQL (`postgres`) for this example.

```bash
npm i drizzle-orm postgres
npm i -D drizzle-kit @types/postgres
```

## 2. Drizzle Module & Provider Setup

We'll create a dedicated `DatabaseModule` to manage the database connection and export the Drizzle instance for other modules to consume.

### `database/database.module.ts`

```typescript
import { Global, Module } from '@nestjs/common';
import { databaseProvider } from './database.provider';

export const DRIZZLE_PROVIDER = 'DRIZZLE_PROVIDER';

@Global()
@Module({
  providers: [databaseProvider],
  exports: [DRIZZLE_PROVIDER],
})
export class DatabaseModule {}
```

### `database/database.provider.ts`

```typescript
import { Provider } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { DRIZZLE_PROVIDER } from './database.module';

export const databaseProvider: Provider = {
  provide: DRIZZLE_PROVIDER,
  useFactory: async () => {
    // In production, use ConfigService to fetch the URL
    const queryClient = postgres(process.env.DATABASE_URL!);
    return drizzle(queryClient, { schema });
  },
};
```

### `database/schema.ts`

```typescript
import { pgTable, serial, text, varchar, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  authorId: serial('author_id').references(() => users.id).notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
```

---

## 3. Service & Repository Patterns

In NestJS, it is best practice to inject the Drizzle instance directly into your services or wrap it in a Repository pattern for maximum reusability.

### Using Drizzle Directly in Services

For smaller applications, injecting Drizzle directly into the service is perfect.

```typescript
// users/users.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE_PROVIDER } from '../database/database.module';
import * as schema from '../database/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class UsersService {
  constructor(
    @Inject(DRIZZLE_PROVIDER) 
    private db: PostgresJsDatabase<typeof schema>
  ) {}

  async findAll() {
    return this.db.query.users.findMany({
      with: { posts: true }
    });
  }

  async findOne(id: number) {
    return this.db.query.users.findFirst({
      where: eq(schema.users.id, id),
    });
  }

  async create(user: schema.NewUser) {
    const [newUser] = await this.db.insert(schema.users)
      .values(user)
      .returning();
    return newUser;
  }
}
```

### The Repository Pattern Approach

For enterprise apps, wrap Drizzle in Repositories to abstract the DB engine completely.

```typescript
// users/users.repository.ts
import { Injectable, Inject } from '@nestjs/common';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE_PROVIDER } from '../database/database.module';
import * as schema from '../database/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class UsersRepository {
  constructor(
    @Inject(DRIZZLE_PROVIDER) 
    private db: PostgresJsDatabase<typeof schema>
  ) {}

  async findById(id: number): Promise<schema.User | undefined> {
    const result = await this.db.select()
      .from(schema.users)
      .where(eq(schema.users.id, id));
    return result[0];
  }
}
```

---

## 4. Query Builders and Reusable Queries

Drizzle provides **Prepared Statements** which drastically increase query performance, especially in highly concurrent NestJS APIs.

```typescript
import { sql, eq } from 'drizzle-orm';

@Injectable()
export class PostsService {
  private getPostByIdQuery;

  constructor(
    @Inject(DRIZZLE_PROVIDER) private db: PostgresJsDatabase<typeof schema>
  ) {
    // Prepare the statement once when the service initializes
    this.getPostByIdQuery = this.db.query.posts
      .findFirst({
        where: eq(schema.posts.id, sql.placeholder('id')),
      })
      .prepare('get_post_by_id');
  }

  async getPostFast(id: number) {
    // Execute the prepared statement incredibly fast
    return this.getPostByIdQuery.execute({ id });
  }
}
```

---

## 5. Testing with Drizzle in NestJS

Because Drizzle uses pure functions and simple configuration, mocking it in NestJS testing is straightforward.

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { DRIZZLE_PROVIDER } from '../database/database.module';

describe('UsersService', () => {
  let service: UsersService;

  const mockDb = {
    query: {
      users: {
        findMany: jest.fn().mockResolvedValue([{ id: 1, name: 'Test User' }]),
      },
    },
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ id: 2, name: 'New User' }]),
      }),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: DRIZZLE_PROVIDER,
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should return an array of users', async () => {
    const users = await service.findAll();
    expect(users).toEqual([{ id: 1, name: 'Test User' }]);
    expect(mockDb.query.users.findMany).toHaveBeenCalled();
  });
});
```

---

## 6. Full Example Flow: Migrations in NestJS

**drizzle.config.ts** at root:
```typescript
import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  schema: './src/database/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

**package.json scripts:**
```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```
Run `npm run db:studio` to open a local UI to manage your Drizzle database.

## Practice Exercises
1. Set up a NestJS REST API with a `ProductsModule` and a `CategoriesModule`.
2. Implement Drizzle ORM to manage Products and Categories (One-to-Many).
3. Use a NestJS Exception Filter to automatically catch Drizzle Postgres Unique Constraint errors and return a `409 Conflict`.
4. Implement a prepared statement for fetching a product by slug.
