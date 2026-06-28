# Prisma ORM with TypeScript and Node.js

Prisma (5.x) is a next-generation ORM that consists of three main tools:
1. **Prisma Client**: Auto-generated and type-safe query builder for Node.js & TypeScript.
2. **Prisma Migrate**: Migration system.
3. **Prisma Studio**: GUI to view and edit data in your database.

## Setup and Installation

Initialize a new TypeScript project and install Prisma:

```bash
npm init -y
npm install typescript ts-node @types/node --save-dev
npx tsc --init

# Install Prisma CLI as a dev dependency
npm install prisma --save-dev

# Initialize Prisma
npx prisma init
```

This creates a `prisma` directory with a `schema.prisma` file and an `.env` file for your database URL.

## Schema Definition and Migrations

The `schema.prisma` file is the main configuration file for your Prisma setup. Here's a comprehensive schema for a blog/e-commerce platform:

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql" // or mysql, sqlite, etc.
  url      = env("DATABASE_URL")
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  role      Role     @default(USER)
  posts     Post[]
  profile   Profile?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Profile {
  id     Int    @id @default(autoincrement())
  bio    String
  userId Int    @unique
  user   User   @relation(fields: [userId], references: [id])
}

model Post {
  id         Int        @id @default(autoincrement())
  title      String
  content    String
  published  Boolean    @default(false)
  authorId   Int
  author     User       @relation(fields: [authorId], references: [id])
  categories Category[]
}

model Category {
  id    Int    @id @default(autoincrement())
  name  String @unique
  posts Post[]
}

enum Role {
  USER
  ADMIN
}
```

To create a migration and apply it to the database:

```bash
npx prisma migrate dev --name init
```

This generates SQL migrations and updates the generated Prisma Client.

## Prisma Client: CRUD Operations

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({ log: ['query'] })

async function main() {
  // CREATE
  const user = await prisma.user.create({
    data: {
      email: 'alice@example.com',
      name: 'Alice',
      profile: {
        create: { bio: 'I like turtles' },
      },
    },
  })

  // READ (Nested queries)
  const usersWithProfiles = await prisma.user.findMany({
    include: { profile: true, posts: true },
  })

  // UPDATE
  const updatedUser = await prisma.user.update({
    where: { email: 'alice@example.com' },
    data: { name: 'Alice Wonderland' },
  })

  // DELETE
  const deletedUser = await prisma.user.delete({
    where: { id: user.id },
  })
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect())
```

## Transactions and Batch Operations

Prisma supports sequential and interactive transactions.

```typescript
// Sequential (Batch)
const [posts, totalPosts] = await prisma.$transaction([
  prisma.post.findMany({ where: { published: true } }),
  prisma.post.count()
])

// Interactive Transaction
await prisma.$transaction(async (tx) => {
  const sender = await tx.user.update({
    data: { balance: { decrement: 100 } },
    where: { email: 'sender@example.com' },
  })
  
  const recipient = await tx.user.update({
    data: { balance: { increment: 100 } },
    where: { email: 'recipient@example.com' },
  })
})
```

## Prisma Studio

Launch the built-in GUI to view and edit your database records:

```bash
npx prisma studio
```

## Performance Optimization

*   **Select Only What You Need**: Use `select` instead of `include` when you only need specific fields from relations to reduce payload size.
*   **Connection Pooling**: In serverless environments, use Prisma Accelerate or a connection pooler like PgBouncer to prevent exhausting database connections.
*   **Indexes**: Add `@@index` in your `schema.prisma` for frequently queried columns.

## Testing with Prisma

Use `jest-mock-extended` to mock the Prisma Client in unit tests without hitting a real database:

```typescript
import { PrismaClient } from '@prisma/client'
import { mockDeep, DeepMockProxy } from 'jest-mock-extended'
import { createUser } from './user.service'

export const prismaMock = mockDeep<PrismaClient>()

test('should create new user', async () => {
  const user = { id: 1, name: 'Rich', email: 'hello@prisma.io' }
  prismaMock.user.create.mockResolvedValue(user)

  await expect(createUser(user)).resolves.toEqual({
    id: 1,
    name: 'Rich',
    email: 'hello@prisma.io',
  })
})
```

## Comparison to Raw SQL / TypeORM / Sequelize

| Feature | Prisma | TypeORM | Raw SQL |
| :--- | :--- | :--- | :--- |
| **Type Safety** | 100% End-to-End | Manual / Decorator-based | None (unless using a tool) |
| **Schema Definition**| Declarative `.prisma` file | TypeScript Decorators | SQL DDL |
| **Migrations** | Automated via `prisma migrate`| CLI generated or manual | Manual SQL |
| **Developer Exp.** | Excellent autocomplete | Good | Error-prone |

## Practice Exercises

1. Create a SaaS schema adding `Organization` and `Subscription` models.
2. Write an interactive transaction that deletes a `User` and all their `Posts` securely.
3. Optimize a `findMany` query using `select` to fetch only specific relation fields.