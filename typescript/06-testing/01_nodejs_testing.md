# TypeScript and Node.js Testing

Testing your TypeScript and Node.js applications is essential for reliability. This tutorial covers the modern testing ecosystem: comparing Jest and Vitest, unit testing with mocks and spies, testing Express and NestJS backends, and End-to-End (E2E) testing with `supertest`.

## What You'll Learn
- Jest vs. Vitest Comparison
- Unit Testing with Mocks and Spies
- Testing Express middleware and routes
- Testing NestJS (Providers, Controllers, Guards)
- E2E testing with `supertest`
- Test utilities and helpers

## Setup Instructions

First, decide on your test runner. We'll show you how to set up both.

### Jest Setup

```bash
npm install -D jest ts-jest @types/jest supertest @types/supertest
```

Initialize Jest configuration (`jest.config.js`):
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  clearMocks: true,
};
```

### Vitest Setup (Recommended for Modern TS)

```bash
npm install -D vitest @vitest/ui supertest @types/supertest
```

Initialize Vitest (`vitest.config.ts`):
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
});
```

---

## Jest vs Vitest Comparison

**Jest:**
- The industry standard for years.
- Slower startup times, especially with `ts-jest`.
- Requires configuration for ESM (ECMAScript Modules) and TypeScript.

**Vitest:**
- Powered by Vite, incredibly fast.
- Native TypeScript and ESM support out of the box.
- Almost fully compatible with Jest's API (you can usually swap `jest.` for `vi.`).

---

## Unit Testing with Mocks and Spies

### Example 1: Basic Math Test (Vitest)
```typescript
import { describe, it, expect } from 'vitest';

function add(a: number, b: number) { return a + b; }

describe('Math functions', () => {
  it('adds two numbers', () => {
    expect(add(2, 3)).toBe(5);
  });
});
```

### Example 2: Spying on Functions (Vitest)
Use spies to track if a function was called without altering its behavior.

```typescript
import { vi, describe, it, expect } from 'vitest';

const logger = {
  log: (msg: string) => console.log(msg),
};

describe('Logger', () => {
  it('calls the log method', () => {
    const spy = vi.spyOn(logger, 'log');
    logger.log('Hello');
    
    expect(spy).toHaveBeenCalledWith('Hello');
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
```

### Example 3: Mocking Modules (Jest/Vitest)
Mock external dependencies like database calls or fetch.

```typescript
import { vi, describe, it, expect } from 'vitest';
import axios from 'axios';

// Mock the axios module
vi.mock('axios');

async function fetchUser(id: number) {
  const { data } = await axios.get(`/users/${id}`);
  return data;
}

describe('fetchUser', () => {
  it('returns mocked user data', async () => {
    const mockedData = { id: 1, name: 'Alice' };
    (axios.get as any).mockResolvedValue({ data: mockedData });

    const result = await fetchUser(1);
    expect(result).toEqual(mockedData);
  });
});
```

---

## Testing Express Apps

Use `supertest` to test your Express routes without starting the actual server.

### Example 4: Testing an Express Route
```typescript
import express from 'express';
import request from 'supertest';
import { describe, it, expect } from 'vitest';

const app = express();
app.get('/api/status', (req, res) => res.status(200).json({ status: 'running' }));

describe('GET /api/status', () => {
  it('returns 200 and status running', async () => {
    const res = await request(app).get('/api/status');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('running');
  });
});
```

### Example 5: Testing Express Middleware
Test middleware in isolation by mocking the `Request`, `Response`, and `NextFunction`.

```typescript
import { Request, Response, NextFunction } from 'express';
import { describe, it, expect, vi } from 'vitest';

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.headers.authorization) {
    return res.status(401).send('Unauthorized');
  }
  next();
};

describe('Auth Middleware', () => {
  it('calls next() if auth header is present', () => {
    const req = { headers: { authorization: 'Bearer token' } } as Request;
    const res = {} as Response;
    const next = vi.fn();

    requireAuth(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 401 if missing auth header', () => {
    const req = { headers: {} } as Request;
    const res = { status: vi.fn().mockReturnThis(), send: vi.fn() } as unknown as Response;
    const next = vi.fn();

    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith('Unauthorized');
  });
});
```

---

## Testing NestJS

NestJS has testing tools built-in, leveraging the Dependency Injection container.

### Example 6: Testing a NestJS Provider (Service)
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

### Example 7: Mocking Dependencies in NestJS Controllers
```typescript
import { Test } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  beforeEach(async () => {
    const mockService = {
      findAll: jest.fn().mockResolvedValue(['test user']),
    };

    const module = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  it('should return users', async () => {
    expect(await controller.findAll()).toEqual(['test user']);
    expect(service.findAll).toHaveBeenCalled();
  });
});
```

### Example 8: Testing NestJS Guards
Guards are just classes with a `canActivate` method.

```typescript
import { ExecutionContext } from '@nestjs/common';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  let guard: AuthGuard;

  beforeEach(() => {
    guard = new AuthGuard();
  });

  it('should return true for valid request', () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { authorization: 'valid' } }),
      }),
    } as ExecutionContext;

    expect(guard.canActivate(mockContext)).toBe(true);
  });
});
```

---

## E2E Testing with Supertest

### Example 9: E2E NestJS Setup
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });
});
```

---

## Best Practices and Anti-Patterns

**Best Practices:**
1. **Isolate Tests:** A test should not depend on the outcome of another test. Use `beforeEach` to reset state.
2. **Clear Mocks:** Always clear mocks between tests using `clearMocks: true` in your config or `vi.clearAllMocks()`.
3. **Use Factories:** For complex objects, create factory functions to generate test data rather than hardcoding it in every test.

**Anti-Patterns:**
1. **Mocking Everything:** If you mock the entire world around a function, you aren't testing reality. Rely on integration tests where mocking is too complex.
2. **Testing Implementation:** Do not test *how* a function works internally. Test inputs and outputs.
3. **Ignoring Coverage Gaps:** Branches (if/else) represent business logic paths. Ensure both the `true` and `false` paths of a conditional are tested.

---

## CI/CD Integration (GitHub Actions)

```yaml
name: Node.js CI
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Use Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18.x'
    - run: npm ci
    - run: npm run test:coverage
```

## Practice Exercises
1. Set up a Vitest environment and write tests for a utility module that formats dates.
2. Create an Express POST route for User Registration. Write a `supertest` E2E test to handle successful registration and 400 Bad Request validation.
3. Write a test for a NestJS Interceptor that modifies the response object.
