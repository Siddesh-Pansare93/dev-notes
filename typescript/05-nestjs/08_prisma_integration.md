# NestJS with Prisma Integration

Integrating Prisma ORM 5.x with NestJS provides a robust, type-safe data access layer for your enterprise backend. This tutorial covers the `PrismaService` pattern, dependency injection, and common backend architectural strategies like repositories and soft deletes.

## 1. Setup and Installation

Generate a new NestJS application and install the necessary dependencies:

```bash
npx @nestjs/cli new nest-prisma-app
cd nest-prisma-app
npm install prisma --save-dev
npx prisma init
npm install @prisma/client
```

Update your `schema.prisma` file, then run `npx prisma migrate dev --name init` and `npx prisma generate` to create the TypeScript definitions.

## 2. Prisma Service Pattern

Instead of instantiating the `PrismaClient` in every file, we encapsulate it within a NestJS service. This allows us to manage the database connection lifecycle cleanly.

Generate the module and service:
```bash
npx nest generate module prisma
npx nest generate service prisma
```

**`src/prisma/prisma.service.ts`**

```typescript
import { Injectable, OnModuleInit, INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

**`src/prisma/prisma.module.ts`**

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // Make it available throughout the app
})
export class PrismaModule {}
```

Import `PrismaModule` into `app.module.ts`.

## 3. Dependency Injection and Full CRUD Example

Inject the `PrismaService` into your application services (e.g., a `UserService`).

```typescript
// src/user/user.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, Prisma } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async user(
    userWhereUniqueInput: Prisma.UserWhereUniqueInput,
  ): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: userWhereUniqueInput,
    });
  }

  async users(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.UserWhereUniqueInput;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }): Promise<User[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.user.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }

  async updateUser(params: {
    where: Prisma.UserWhereUniqueInput;
    data: Prisma.UserUpdateInput;
  }): Promise<User> {
    const { where, data } = params;
    return this.prisma.user.update({
      data,
      where,
    });
  }

  async deleteUser(where: Prisma.UserWhereUniqueInput): Promise<User> {
    return this.prisma.user.delete({
      where,
    });
  }
}
```

## 4. Error Handling

Prisma throws specific errors (like `PrismaClientKnownRequestError`) when constraints fail (e.g., unique constraint violations). You can use NestJS Exception Filters to catch and map these errors globally to appropriate HTTP statuses.

```typescript
// src/prisma-client-exception.filter.ts
import { ArgumentsHost, Catch, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter extends BaseExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    switch (exception.code) {
      case 'P2002': { // Unique constraint violation
        const status = HttpStatus.CONFLICT;
        response.status(status).json({
          statusCode: status,
          message: 'Resource already exists.',
        });
        break;
      }
      default:
        super.catch(exception, host);
        break;
    }
  }
}
```

## 5. Soft Deletes Pattern

Soft deletes involve marking a record as "deleted" instead of removing it from the database. Prisma Middleware or Extensions are perfect for this.

Update `PrismaService` to use a client extension for soft deletes (assuming your schema has a `deletedAt DateTime?` field):

```typescript
// src/prisma/prisma.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super();
    
    // Apply extension for soft deletes
    this.$extends({
      query: {
        $allModels: {
          async delete({ model, args, query }) {
            // Transform delete to an update
            return query({
              ...args,
              data: { deletedAt: new Date() },
            });
          },
          async findMany({ model, args, query }) {
            // Only fetch non-deleted items
            args.where = { ...args.where, deletedAt: null };
            return query(args);
          }
        },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }
}
```

## 6. Repository Pattern with Prisma

While Prisma Client is already heavily abstracted, adding a repository pattern can help separate domain logic from data access logic, especially in complex Domain-Driven Design (DDD) scenarios.

```typescript
// src/user/user.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async save(user: any) {
    // Custom domain-to-DTO logic here
    return this.prisma.user.create({ data: user });
  }
}
```

## 7. Pagination Helpers

Offset pagination is common, but Prisma also excels at cursor-based pagination (ideal for infinite scroll).

```typescript
// Offset Pagination Example
async paginateUsers(page: number = 1, limit: number = 10) {
  const skip = (page - 1) * limit;
  const [data, total] = await this.prisma.$transaction([
    this.prisma.user.findMany({ skip, take: limit }),
    this.prisma.user.count(),
  ]);

  return { data, total, page, lastPage: Math.ceil(total / limit) };
}
```

## Practice Exercises

1. Extend the global `PrismaClientExceptionFilter` to handle `P2025` (Record not found).
2. Create a module that implements Cursor-based pagination for an infinite scrolling feed.
3. Build a robust transactional workflow transferring funds between two User accounts.