# Prisma ORM with TypeScript/Node.js

**Prisma** is a next-generation TypeScript ORM that provides a declarative database migration system, type-safe database access, and integrated tools for working with databases. This comprehensive guide covers Prisma 5.x with practical examples and best practices.

## What You'll Learn

- Setting up Prisma with TypeScript projects
- Defining schemas and managing migrations
- Performing type-safe CRUD operations
- Working with relations and nested queries
- Implementing transactions and batch operations
- Optimizing performance with connection pooling
- Testing strategies with Prisma
- Integration with NestJS framework
- Real-world patterns and best practices

## Prerequisites

- TypeScript and Node.js fundamentals
- Basic SQL knowledge
- Understanding of async/await
- Familiarity with REST APIs (for NestJS section)

## Table of Contents

1. [Setup and Installation](./01_setup_and_installation.md)
2. [Schema Definition and Types](./02_schema_definition.md)
3. [Migrations Workflow](./03_migrations.md)
4. [Prisma Client and CRUD Operations](./04_prisma_client_crud.md)
5. [Relations and Nested Queries](./05_relations_and_nested_queries.md)
6. [Transactions and Batch Operations](./06_transactions_and_batch.md)
7. [Type Safety and TypeScript Integration](./07_type_safety.md)
8. [Prisma Studio](./08_prisma_studio.md)
9. [Performance Optimization](./09_performance_optimization.md)
10. [Testing with Prisma](./10_testing.md)
11. [Connection Pooling](./11_connection_pooling.md)
12. [Prisma with NestJS](./12_prisma_nestjs.md)

## Why Prisma?

### Advantages over Raw SQL
- **Type Safety**: Catch errors at compile time instead of runtime
- **Auto-completion**: Full IDE support with IntelliSense
- **No SQL Injection**: Parameterized queries by default
- **Migration System**: Version-controlled schema changes
- **Developer Experience**: Intuitive API and excellent documentation

### Comparison with TypeORM

| Feature | Prisma | TypeORM |
|---------|--------|---------|
| Type Safety | Full, auto-generated | Partial, manual decorators |
| Query API | Functional, fluent | Object-oriented, repositories |
| Migrations | Declarative SQL | TypeScript classes |
| Performance | Optimized queries | Can generate inefficient SQL |
| Learning Curve | Gentle | Steeper |
| Active Development | Very active | Active |

### Comparison with Sequelize

| Feature | Prisma | Sequelize |
|---------|--------|-----------|
| TypeScript Support | First-class | Added on |
| Type Generation | Automatic | Manual or third-party |
| Relation Queries | Intuitive nested syntax | Complex includes |
| Raw Queries | Supported with type safety | Supported |
| Modern Features | Cutting edge | Established |

## Prisma Ecosystem

- **Prisma Client**: Auto-generated query builder
- **Prisma Migrate**: Declarative migration system
- **Prisma Studio**: Visual database browser
- **Prisma Accelerate**: Query caching and connection pooling (cloud)
- **Prisma Pulse**: Real-time database events (cloud)

## Learning Path

### Beginner (Tutorials 1-4)
Start with setup, schema definition, migrations, and basic CRUD operations.

### Intermediate (Tutorials 5-8)
Learn relations, transactions, type safety, and use Prisma Studio.

### Advanced (Tutorials 9-12)
Master performance optimization, testing, connection pooling, and framework integration.

## Real-World Use Cases

1. **Blog Platform**: Users, Posts, Comments with relations
2. **E-commerce**: Products, Orders, Customers with transactions
3. **SaaS Application**: Multi-tenancy with organizations and users
4. **Social Network**: Complex many-to-many relations
5. **CMS**: Content models with flexible schemas

## Quick Start Example

```typescript
// schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
  posts Post[]
}

model Post {
  id        Int     @id @default(autoincrement())
  title     String
  content   String?
  published Boolean @default(false)
  author    User    @relation(fields: [authorId], references: [id])
  authorId  Int
}
```

```typescript
// main.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create user with posts
  const user = await prisma.user.create({
    data: {
      name: 'Alice',
      email: 'alice@prisma.io',
      posts: {
        create: [
          { title: 'Hello World', published: true },
          { title: 'My Second Post' }
        ]
      }
    },
    include: { posts: true }
  })
  
  console.log(user)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

## Best Practices Preview

1. Always use environment variables for database URLs
2. Disconnect Prisma Client in production after operations
3. Use transactions for operations that must succeed together
4. Leverage type safety - let TypeScript guide you
5. Use migrations in development, deploy in production
6. Index frequently queried fields
7. Use select/include wisely to avoid over-fetching
8. Test with a separate test database
9. Monitor query performance in production
10. Keep schema.prisma as single source of truth

## Resources

- [Official Prisma Documentation](https://www.prisma.io/docs)
- [Prisma Examples Repository](https://github.com/prisma/prisma-examples)
- [Prisma Discord Community](https://pris.ly/discord)
- [Prisma Blog](https://www.prisma.io/blog)

## Next Steps

Start with [Setup and Installation](./01_setup_and_installation.md) to begin your Prisma journey!
