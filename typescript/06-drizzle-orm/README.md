# Drizzle ORM - Complete Guide

## What is Drizzle ORM?

Drizzle ORM is a lightweight, performant, and type-safe TypeScript ORM for SQL databases. It provides both SQL-like and relational query APIs, designed to be serverless-ready with minimal overhead (~7.4kb minified+gzipped) and zero dependencies.

## Why Choose Drizzle?

### Key Advantages

1. **Type Safety** - Full TypeScript support with end-to-end type inference
2. **Performance** - Minimal overhead, prepared statements, and efficient query building
3. **Developer Experience** - SQL-like syntax that feels natural to SQL developers
4. **Serverless Ready** - Works perfectly in edge environments (Cloudflare Workers, Vercel Edge)
5. **Zero Dependencies** - Lightweight and tree-shakeable
6. **Database Support** - PostgreSQL, MySQL, SQLite, and SingleStore

### Drizzle vs Prisma vs TypeORM

| Feature | Drizzle | Prisma | TypeORM |
|---------|---------|--------|---------|
| **Bundle Size** | ~7.4kb | ~31kb | ~500kb+ |
| **Type Safety** | Excellent (inferred) | Excellent (generated) | Good (decorators) |
| **Query Syntax** | SQL-like | Custom DSL | Repository/Active Record |
| **Edge Runtime** | ✅ Full support | ❌ Limited | ❌ No |
| **Raw SQL** | ✅ Easy | ⚠️ Limited | ✅ Supported |
| **Migrations** | drizzle-kit | Prisma Migrate | TypeORM CLI |
| **Learning Curve** | Low (SQL knowledge) | Medium | Medium-High |
| **Performance** | Excellent | Good | Good |
| **Schema Definition** | TypeScript code | Prisma Schema (DSL) | Decorators/Code |
| **Relational Queries** | Both APIs | Excellent | Good |

### When to Choose Each ORM

**Choose Drizzle when:**
- You need edge runtime compatibility
- Performance and bundle size are critical
- You prefer SQL-like syntax
- You want full control over queries
- Building serverless applications

**Choose Prisma when:**
- You prefer schema-first approach
- You need excellent relational query capabilities
- Team is less familiar with SQL
- You want comprehensive tooling (Prisma Studio)

**Choose TypeORM when:**
- Working with enterprise Java-like patterns
- Need ActiveRecord pattern
- Team familiar with Java Hibernate
- Migrating from traditional OOP ORMs

## What You'll Learn

This comprehensive guide covers:

1. **Getting Started** - Setup and basic configuration
2. **Schema Definition** - Tables, columns, and types
3. **CRUD Operations** - Type-safe database queries
4. **Relations & Joins** - Complex data relationships
5. **Migrations** - Managing schema changes with drizzle-kit
6. **Advanced Queries** - Transactions, prepared statements, batch operations
7. **NestJS Integration** - Enterprise patterns
8. **Next.js Integration** - Server actions and edge runtime
9. **Best Practices** - Performance optimization and patterns

## Tutorial Structure

- [01 - Getting Started](./01_getting_started.md)
- [02 - Schema Definition](./02_schema_definition.md)
- [03 - CRUD Operations](./03_crud_operations.md)
- [04 - Relations and Joins](./04_relations_and_joins.md)
- [05 - Migrations with Drizzle Kit](./05_migrations.md)
- [06 - Transactions and Advanced Queries](./06_transactions_advanced.md)
- [07 - Drizzle with NestJS](./07_nestjs_integration.md)
- [08 - Drizzle with Next.js](./08_nextjs_integration.md)
- [09 - Performance and Best Practices](./09_performance_best_practices.md)

## Prerequisites

- TypeScript fundamentals
- Basic SQL knowledge
- Node.js 18+ installed
- Understanding of async/await

## Performance Characteristics

Drizzle is built for performance:

- **Prepared Statements** - Reuse compiled queries
- **Tree Shaking** - Only bundle what you use
- **Zero Overhead** - Minimal abstraction layer
- **Edge Compatible** - Works in V8 isolates
- **Efficient Query Building** - No unnecessary overhead

## Database Support

```typescript
// PostgreSQL
import { drizzle } from 'drizzle-orm/node-postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { drizzle } from 'drizzle-orm/neon-http';
import { drizzle } from 'drizzle-orm/vercel-postgres';

// MySQL
import { drizzle } from 'drizzle-orm/mysql2';
import { drizzle } from 'drizzle-orm/planetscale-serverless';

// SQLite
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { drizzle } from 'drizzle-orm/libsql';
import { drizzle } from 'drizzle-orm/d1';
```

Let's dive in! 🚀
