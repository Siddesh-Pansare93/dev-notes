# Production Node.js — Testing, API Docs, and CI/CD

> Revision notes for experienced JS devs. No hand-holding — just production-grade patterns, gotchas, and the *why* behind every decision.

---

## 🗺️ What This Chapter Covers

```
Part 1 → Testing Strategy (unit → integration → E2E)
Part 2 → API Documentation (OpenAPI 3.0, Zod-driven schemas)
Part 3 → CI/CD (GitHub Actions, Docker, migrations, secrets)
```

---

# PART 1 — Testing Strategy

## 🔥 The Test Pyramid — Node.js Edition

The classic pyramid is real, but most teams apply it wrong in Node.js backends.

```
         /\
        /E2E\         ← few, slow, fragile (5–10 tests)
       /------\
      /  Integ  \     ← medium (route + DB — Testcontainers)
     /------------\
    /    Unit       \  ← many, blazing fast, no I/O (hundreds)
   /----------------\
```

**Here's the trap most devs fall into:** They write mostly integration tests because "they test more." Integration tests hit a real DB — slow teardown, flaky when Docker is cold, hard to parallelize. You pay the price in 8-minute CI runs for a 200-route API.

**Rule of thumb:**

| Layer | Scope | Speed | Count ratio |
|---|---|---|---|
| Unit | Service/domain logic | < 5ms each | 60–70% of suite |
| Integration | Route → real DB | 100–500ms each | 25–35% |
| E2E | Full HTTP → real third parties | 2–10s each | 5% |

A unit test that mocks the DB is NOT an integration test. An integration test means your code ran real SQL.

---

## 🔥 Unit Testing with Jest + ts-jest

### Setup

```bash
npm i -D jest ts-jest @types/jest
```

```ts
// jest.config.ts
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',       // entry point — nothing to test
    '!src/migrations/**',  // generated files
  ],
  coverageThresholds: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    // Raise bar for pure business logic
    './src/services/': {
      branches: 90,
      lines: 90,
    },
  },
  setupFilesAfterFramework: ['<rootDir>/src/test/setup.ts'],
};

export default config;
```

### What to unit test

Unit tests belong on the **service layer** — the code that has branching logic, error handling, and calculations. Not on the controller (thin HTTP adapter) and not on the repository (just SQL).

```ts
// src/services/order.service.ts
export class OrderService {
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly inventoryService: InventoryService,
    private readonly eventBus: EventEmitter,
  ) {}

  async placeOrder(userId: string, items: OrderItem[]): Promise<Order> {
    if (items.length === 0) {
      throw new ValidationError('Order must have at least one item');
    }

    const reserved = await this.inventoryService.reserveItems(items);
    if (!reserved.success) {
      throw new InsufficientInventoryError(reserved.missingItems);
    }

    const order = await this.orderRepo.create({
      userId,
      items,
      status: 'PENDING',
      total: this.calculateTotal(items),
    });

    this.eventBus.emit('order.placed', { orderId: order.id, userId });
    return order;
  }

  private calculateTotal(items: OrderItem[]): number {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }
}
```

```ts
// src/services/order.service.test.ts
import { OrderService } from './order.service';
import { OrderRepository } from '../repositories/order.repository';
import { InventoryService } from './inventory.service';
import { EventEmitter } from 'events';

// Module-level mock — replaces entire module
jest.mock('../repositories/order.repository');
jest.mock('./inventory.service');

describe('OrderService', () => {
  let svc: OrderService;
  let mockOrderRepo: jest.Mocked<OrderRepository>;
  let mockInventory: jest.Mocked<InventoryService>;
  let eventBus: EventEmitter;

  beforeEach(() => {
    // Cast after mock — gives you full jest.Mocked type
    mockOrderRepo = new OrderRepository() as jest.Mocked<OrderRepository>;
    mockInventory = new InventoryService() as jest.Mocked<InventoryService>;
    eventBus = new EventEmitter();
    svc = new OrderService(mockOrderRepo, mockInventory, eventBus);
  });

  afterEach(() => {
    jest.clearAllMocks(); // reset call counts between tests
  });

  describe('placeOrder', () => {
    it('throws ValidationError when items array is empty', async () => {
      await expect(svc.placeOrder('user-1', [])).rejects.toThrow(ValidationError);
      // Confirm no side effects happened
      expect(mockInventory.reserveItems).not.toHaveBeenCalled();
      expect(mockOrderRepo.create).not.toHaveBeenCalled();
    });

    it('throws InsufficientInventoryError when inventory reservation fails', async () => {
      mockInventory.reserveItems.mockResolvedValue({
        success: false,
        missingItems: [{ sku: 'SKU-1', requested: 5, available: 2 }],
      });

      await expect(
        svc.placeOrder('user-1', [{ sku: 'SKU-1', price: 10, quantity: 5 }])
      ).rejects.toThrow(InsufficientInventoryError);

      expect(mockOrderRepo.create).not.toHaveBeenCalled();
    });

    it('emits order.placed event after successful order', async () => {
      const items = [{ sku: 'SKU-1', price: 10, quantity: 2 }];
      mockInventory.reserveItems.mockResolvedValue({ success: true });
      mockOrderRepo.create.mockResolvedValue({ id: 'order-123', userId: 'user-1', items, status: 'PENDING', total: 20 });

      const emitSpy = jest.spyOn(eventBus, 'emit');

      await svc.placeOrder('user-1', items);

      expect(emitSpy).toHaveBeenCalledWith('order.placed', {
        orderId: 'order-123',
        userId: 'user-1',
      });
    });

    it('calculates total correctly including quantity', async () => {
      const items = [
        { sku: 'A', price: 10, quantity: 3 },
        { sku: 'B', price: 5, quantity: 2 },
      ];
      mockInventory.reserveItems.mockResolvedValue({ success: true });
      mockOrderRepo.create.mockResolvedValue({ id: 'x', total: 40 } as any);

      await svc.placeOrder('user-1', items);

      // Verify what was passed to the repo
      expect(mockOrderRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ total: 40 }) // 10*3 + 5*2
      );
    });
  });
});
```

### Test doubles: which one when

**Here's the trap most devs fall into:** Using `jest.mock()` for everything. You end up with tests that mock so much they're testing the mock, not the code.

| Double | What it is | When to use |
|---|---|---|
| **Mock** | Full fake implementation | External services, third-party SDKs, email providers |
| **Stub** | Returns canned data, no verification | DB repos when you only care about the *result*, not *how* it was called |
| **Spy** | Wraps real implementation, records calls | EventEmitters, logger calls, side-effect verification |
| **Fake** | Lightweight real implementation (e.g., in-memory DB) | When full mocks make tests brittle — use for repos |

```ts
// Spy — wraps real function, just records
const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
// After test:
consoleSpy.mockRestore();

// Stub — just returns value, don't care about verifying calls
mockRepo.findById.mockResolvedValue({ id: '1', name: 'Alice' });

// Fake — in-memory implementation of your repository interface
class InMemoryOrderRepo implements OrderRepository {
  private orders: Map<string, Order> = new Map();
  async create(data: CreateOrderDTO): Promise<Order> {
    const order = { id: crypto.randomUUID(), ...data };
    this.orders.set(order.id, order);
    return order;
  }
  async findById(id: string): Promise<Order | null> {
    return this.orders.get(id) ?? null;
  }
}
```

Fakes are underused. They let you run hundreds of tests against a "real" interface without Docker overhead.

---

## 🔥 Testing Async Code

Jest handles promises natively now, but there are edge cases:

```ts
// ✅ Always return or await — never just call async in Jest
it('should reject', async () => {
  await expect(asyncFn()).rejects.toThrow('reason');
});

// ❌ This test passes even if asyncFn never rejects
it('should reject — BROKEN', () => {
  expect(asyncFn()).rejects.toThrow('reason'); // no await, no return
});
```

### Testing EventEmitter

```ts
it('resolves when worker emits done event', async () => {
  const worker = new QueueWorker();

  // Convert event to promise — then await it
  const donePromise = new Promise<void>((resolve, reject) => {
    worker.once('done', resolve);
    worker.once('error', reject);
  });

  worker.start();
  await donePromise; // waits for the event
  expect(worker.processedCount).toBe(1);
});
```

### Testing timers and retries

```ts
it('retries 3 times then throws', async () => {
  jest.useFakeTimers();
  const mockFetch = jest.fn().mockRejectedValue(new NetworkError('timeout'));

  const retryPromise = fetchWithRetry(mockFetch, { retries: 3, delayMs: 1000 });

  // Fast-forward through retry delays
  await jest.runAllTimersAsync();

  await expect(retryPromise).rejects.toThrow(NetworkError);
  expect(mockFetch).toHaveBeenCalledTimes(3);

  jest.useRealTimers();
});
```

---

## 🔥 Integration Testing with Supertest

Supertest lets you fire real HTTP requests against your Express app without binding a port. The app handles the full middleware chain — body parsing, auth, error handlers — but without network overhead.

```ts
// src/test/app.ts — test-only app factory
import express from 'express';
import { orderRouter } from '../routes/order.routes';
import { errorHandler } from '../middleware/error.middleware';
import { authMiddleware } from '../middleware/auth.middleware';

export function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(authMiddleware);
  app.use('/api/orders', orderRouter);
  app.use(errorHandler);
  return app;
}
```

```ts
// src/routes/order.routes.integration.test.ts
import request from 'supertest';
import { createTestApp } from '../test/app';
import { db } from '../db';
import { createTestUser, createTestProduct } from '../test/factories';
import { generateTestToken } from '../test/auth-helpers';

describe('POST /api/orders', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeAll(async () => {
    app = createTestApp();
    // Testcontainers boots here — see next section
    await db.migrate.latest();
  });

  afterAll(async () => {
    await db.destroy();
  });

  beforeEach(async () => {
    // Transaction rollback pattern — fastest teardown
    await db.raw('BEGIN');
  });

  afterEach(async () => {
    await db.raw('ROLLBACK');
  });

  it('returns 201 and creates order for authenticated user', async () => {
    const user = await createTestUser({ role: 'customer' });
    const product = await createTestProduct({ stock: 10, price: 25 });
    const token = generateTestToken(user.id);

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ productId: product.id, quantity: 2 }],
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: expect.any(String),
      status: 'PENDING',
      total: 50,
      items: expect.arrayContaining([
        expect.objectContaining({ productId: product.id }),
      ]),
    });
  });

  it('returns 401 when no auth token provided', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({ items: [] });

    expect(res.status).toBe(401);
  });

  it('returns 422 when items array is empty', async () => {
    const user = await createTestUser();
    const token = generateTestToken(user.id);

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [] });

    expect(res.status).toBe(422);
    expect(res.body.errors).toBeDefined();
  });
});
```

### Factory functions with Faker

```ts
// src/test/factories.ts
import { faker } from '@faker-js/faker';
import { db } from '../db';

type UserOverrides = Partial<{ email: string; role: string; name: string }>;

export async function createTestUser(overrides: UserOverrides = {}) {
  const [user] = await db('users')
    .insert({
      id: faker.string.uuid(),
      email: overrides.email ?? faker.internet.email(),
      name: overrides.name ?? faker.person.fullName(),
      role: overrides.role ?? 'customer',
      passwordHash: 'test-hash-not-real',
      createdAt: new Date(),
    })
    .returning('*');
  return user;
}

export async function createTestProduct(
  overrides: Partial<{ stock: number; price: number; name: string }> = {}
) {
  const [product] = await db('products')
    .insert({
      id: faker.string.uuid(),
      name: overrides.name ?? faker.commerce.productName(),
      price: overrides.price ?? faker.number.int({ min: 1, max: 1000 }),
      stock: overrides.stock ?? 50,
    })
    .returning('*');
  return product;
}
```

**Here's the trap most devs fall into:** Using `faker.seed(42)` for "deterministic" tests and then being confused when DB unique constraints break because two tests create a user with the same email. Each factory call should produce unique data — Faker's defaults are already random enough.

---

## 🔥 Testcontainers-Node: Real PostgreSQL, Zero Mocks

Testcontainers spins up a disposable Docker container per test suite. You get real SQL, real constraints, real transaction behavior. No Postgres connection string in `.env.test`, no shared dev DB pollution.

```bash
npm i -D testcontainers @testcontainers/postgresql
```

```ts
// src/test/db-setup.ts
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import knex, { Knex } from 'knex';

let container: StartedPostgreSqlContainer;
let testDb: Knex;

export async function startTestDatabase(): Promise<Knex> {
  // Pulls postgres:16-alpine if not cached — ~2s on warm Docker
  container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('testdb')
    .withUsername('test')
    .withPassword('test')
    .start();

  testDb = knex({
    client: 'pg',
    connection: {
      host: container.getHost(),
      port: container.getMappedPort(5432),
      database: container.getDatabase(),
      user: container.getUsername(),
      password: container.getPassword(),
    },
    pool: { min: 1, max: 5 },
  });

  // Run all migrations against fresh DB
  await testDb.migrate.latest({
    directory: './src/migrations',
  });

  return testDb;
}

export async function stopTestDatabase(): Promise<void> {
  await testDb?.destroy();
  await container?.stop();
}
```

```ts
// jest.globalSetup.ts — runs once before ALL test files
import { startTestDatabase } from './src/test/db-setup';

export default async function globalSetup() {
  const db = await startTestDatabase();
  // Store connection string so test workers can reuse the container
  process.env.TEST_DATABASE_URL = db.client.config.connection as string;
}
```

```ts
// jest.config.ts (additions)
const config: Config = {
  // ...
  globalSetup: './jest.globalSetup.ts',
  globalTeardown: './jest.globalTeardown.ts',
  maxWorkers: '50%', // parallel test workers share the same container
};
```

**Parallel isolation strategies:**

| Strategy | How | Pros | Cons |
|---|---|---|---|
| Transaction rollback | `BEGIN` in `beforeEach`, `ROLLBACK` in `afterEach` | Fastest (no actual writes) | Doesn't work if code under test commits explicitly |
| Schema per suite | Each suite uses a different PG schema | Full isolation | Slower, more setup |
| Container per suite | Each suite spins its own container | Total isolation | Slow — 2-5s Docker startup each |
| Truncate tables | `afterEach` truncates all tables | Simple | Slow on large schemas |

For most APIs, transaction rollback wins. Use schema-per-suite when your code uses explicit transactions (Prisma `$transaction`, `knex.transaction`).

---

## 🔥 Code Coverage — What Actually Matters

```bash
jest --coverage --coverageReporter=lcov --coverageReporter=text-summary
```

Coverage numbers are a proxy metric. 80% coverage on your controller doesn't mean your business rules are tested.

**Target by layer:**

| Layer | Target | Rationale |
|---|---|---|
| Domain / service logic | 90%+ branches | This is where bugs live |
| Controllers / routes | 80% lines | Thin adapters — covered by integration tests |
| Utility functions | 100% | Pure functions — trivial to test, painful to debug |
| DB migrations | Skip | Generated/declarative, test via integration |
| Config loaders | 60% | Environment-dependent branching |

**Here's the trap most devs fall into:** Istanbul counts a branch as "covered" if *either* side runs. A `if (user.isAdmin)` with only the `true` path exercised shows 50% branch coverage. Always check missed branches in the HTML report, not just the top-line percentage.

---

# PART 2 — API Documentation

## 🔥 Swagger/OpenAPI 3.0 — Annotation-Based

```bash
npm i swagger-jsdoc swagger-ui-express
npm i -D @types/swagger-jsdoc @types/swagger-ui-express
```

```ts
// src/docs/swagger.ts
import swaggerJSDoc from 'swagger-jsdoc';

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Orders API',
      version: '1.0.0',
      description: 'Production orders management API',
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Development' },
      { url: 'https://api.yourapp.com', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/**/*.ts', './src/schemas/**/*.ts'],
});
```

```ts
// src/app.ts
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './docs/swagger';

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customSiteTitle: 'Orders API Docs',
}));

// Also expose raw JSON for tooling (Postman import, code gen)
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));
```

```ts
// src/routes/order.routes.ts
/**
 * @openapi
 * /api/orders:
 *   post:
 *     summary: Place a new order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateOrderRequest'
 *     responses:
 *       201:
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       401:
 *         description: Missing or invalid auth token
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 */
router.post('/', authMiddleware, validate(CreateOrderSchema), orderController.create);
```

The problem with JSDoc annotations: your schema lives in two places — the Zod validator AND the YAML comment. They drift.

---

## 🔥 Zod → OpenAPI: Single Source of Truth

`zod-to-openapi` lets your Zod schemas *be* your OpenAPI schemas. One definition, two outputs: runtime validation + documentation.

```bash
npm i @asteasolutions/zod-to-openapi zod
```

```ts
// src/schemas/order.schema.ts
import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const OrderItemSchema = z.object({
  productId: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
  quantity: z.number().int().min(1).max(100).openapi({ example: 2 }),
}).openapi('OrderItem');

export const CreateOrderRequestSchema = z.object({
  items: z.array(OrderItemSchema).min(1).openapi({
    description: 'At least one item required',
  }),
  shippingAddressId: z.string().uuid().optional(),
}).openapi('CreateOrderRequest');

export const OrderSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  status: z.enum(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
  total: z.number().openapi({ example: 49.99 }),
  items: z.array(OrderItemSchema),
  createdAt: z.string().datetime(),
}).openapi('Order');

// TypeScript types derived from schema — no duplication
export type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>;
export type Order = z.infer<typeof OrderSchema>;
```

```ts
// src/docs/swagger.ts — registry-based generation
import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { CreateOrderRequestSchema, OrderSchema } from '../schemas/order.schema';

export const registry = new OpenAPIRegistry();

// Register schemas (generates $ref entries)
registry.register('CreateOrderRequest', CreateOrderRequestSchema);
registry.register('Order', OrderSchema);

// Register routes with full type safety
registry.registerPath({
  method: 'post',
  path: '/api/orders',
  summary: 'Place a new order',
  tags: ['Orders'],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': { schema: CreateOrderRequestSchema },
      },
    },
  },
  responses: {
    201: {
      description: 'Order created',
      content: { 'application/json': { schema: OrderSchema } },
    },
    422: { description: 'Validation error' },
  },
});

export function generateOpenApiSpec() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: '3.0.0',
    info: { title: 'Orders API', version: '1.0.0' },
    servers: [{ url: 'http://localhost:3000' }],
  });
}
```

**Old way vs new way:**

| Approach | Schema definition | Runtime validation | Docs | Drift risk |
|---|---|---|---|---|
| JSDoc annotations | YAML in comments | Separate Zod/Joi | swagger-jsdoc | HIGH — two sources |
| Zod + zod-to-openapi | Zod schema once | Same Zod schema | Generated from Zod | NONE — one source |

**When to use which:**

- Use **zod-to-openapi** for greenfield APIs or when you already use Zod for validation (99% of TS projects).
- Use **JSDoc annotations** only if you're adding docs to an existing API without Zod and the migration cost is too high.

---

# PART 3 — CI/CD

## 🔥 GitHub Actions Pipeline

The full pipeline order matters. Fail fast and cheap first.

```mermaid
graph LR
    A[Push / PR] --> B[Lint + Typecheck]
    B --> C[Unit Tests]
    C --> D[Build Docker Image]
    D --> E[Integration Tests]
    E --> F[Push Image to Registry]
    F --> G[Deploy to Staging]
    G --> H[Smoke Tests]
    H --> I[Deploy to Production]
```

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # ── Fast checks — fail in < 2 minutes ──────────────────────────────────
  lint-and-typecheck:
    name: Lint & Typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - run: npm ci --prefer-offline

      - name: ESLint
        run: npm run lint

      - name: TypeScript typecheck
        run: npm run typecheck

  # ── Unit tests — no Docker, no DB ──────────────────────────────────────
  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    needs: lint-and-typecheck
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci --prefer-offline

      - name: Run unit tests
        run: npm run test:unit -- --coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          flags: unit

  # ── Build Docker image — catch Dockerfile issues early ─────────────────
  build:
    name: Build Docker Image
    runs-on: ubuntu-latest
    needs: unit-tests
    outputs:
      image-tag: ${{ steps.meta.outputs.tags }}
      image-digest: ${{ steps.build.outputs.digest }}
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Container Registry
        if: github.event_name != 'pull_request'
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Docker meta (tags + labels)
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=sha-
            type=ref,event=branch
            type=semver,pattern={{version}}

      - name: Build and push
        id: build
        uses: docker/build-push-action@v5
        with:
          context: .
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha          # GitHub Actions cache
          cache-to: type=gha,mode=max
          platforms: linux/amd64

  # ── Integration tests — real Postgres via Testcontainers ───────────────
  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    needs: build
    services:
      # Alternative: let Testcontainers handle Docker-in-Docker
      # Use this if you're NOT using Testcontainers
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: testdb
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci --prefer-offline

      - name: Run database migrations
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb
        run: npx prisma migrate deploy

      - name: Run integration tests
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb
          NODE_ENV: test
          JWT_SECRET: ${{ secrets.TEST_JWT_SECRET }}
        run: npm run test:integration

  # ── Deploy to staging (main branch only) ───────────────────────────────
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: integration-tests
    if: github.ref == 'refs/heads/main'
    environment: staging
    steps:
      - name: Deploy to staging
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.STAGING_HOST }}
          username: deploy
          key: ${{ secrets.STAGING_SSH_KEY }}
          script: |
            cd /opt/app
            echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io -u ${{ github.actor }} --password-stdin
            docker pull ${{ needs.build.outputs.image-tag }}
            # Run migrations BEFORE swapping containers
            docker run --rm \
              --env DATABASE_URL=$DATABASE_URL \
              ${{ needs.build.outputs.image-tag }} \
              npx prisma migrate deploy
            # Blue/green swap
            docker compose up -d --no-deps app
            docker image prune -f
```

---

## 🔥 Docker Best Practices

```dockerfile
# Dockerfile — multi-stage, non-root, health check
# ── Stage 1: Dependencies ──────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

# Copy only package files first — layer cache for npm install
COPY package*.json ./
COPY prisma ./prisma/

# ci = clean install, uses package-lock.json exactly
RUN npm ci --only=production && \
    npx prisma generate

# ── Stage 2: Build ────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci                        # includes devDependencies for tsc

COPY tsconfig*.json ./
COPY src ./src

RUN npm run build                 # tsc → dist/

# ── Stage 3: Runtime ──────────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app

# Non-root user — don't run as root in prod
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 -G nodejs

# Copy production artifacts only
COPY --from=deps --chown=nodeuser:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=nodeuser:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nodeuser:nodejs /app/dist ./dist
COPY --chown=nodeuser:nodejs package.json ./

USER nodeuser

EXPOSE 3000

# Health check — Docker and orchestrators use this
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
```

```
# .dockerignore — keep image small, keep secrets out
node_modules
dist
.env
.env.*
*.test.ts
coverage/
.git
.github
*.md
docker-compose*.yml
Dockerfile*
```

**Here's the trap most devs fall into:** Copying `node_modules` from your dev machine into the Docker build context. The `.dockerignore` must exclude `node_modules` — otherwise you ship macOS ARM binaries into a Linux container and wonder why native addons crash.

Multi-stage image size comparison:

| Approach | Typical image size | Notes |
|---|---|---|
| Single stage (node:22) | 1.2 GB | Ships dev deps, TypeScript compiler, all sources |
| Multi-stage (node:22-alpine) | ~180 MB | Only dist/ + prod node_modules |
| Distroless | ~120 MB | No shell — harder to debug |

---

## 🔥 Environment Management and Secrets

```
.env               ← local dev only — NEVER commit
.env.example       ← committed, no real values — shows what vars are needed
.env.test          ← CI test values (non-sensitive, can commit)
GitHub Secrets     ← staging/prod secrets injected at runtime
```

**Here's the trap most devs fall into:** `.env` in `.gitignore` but someone commits `.env.staging` or `.env.production` "just this once." Rotate the secrets and audit your git history.

```ts
// src/config/env.ts — validate at startup, fail fast
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  REDIS_URL: z.string().url().optional(),
  SENTRY_DSN: z.string().url().optional(),
});

// Throws at startup if any required env var is missing
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
```

Never pass secrets as build args (`--build-arg`) — they end up in image layers and are readable via `docker history`.

---

## 🔥 Database Migrations in CI/CD

Blue/green deployment changes everything about migration strategy.

```mermaid
graph TD
    A[CI builds new image] --> B[Run prisma migrate deploy]
    B --> C{Migration backward compatible?}
    C -->|Yes| D[Swap traffic to new containers]
    C -->|No| E[Breaking migration!]
    E --> F[Need maintenance window or expand-contract pattern]
    D --> G[Old containers drain and stop]
```

**The expand-contract pattern for zero-downtime schema changes:**

```
Step 1 (Expand):    Add new column as nullable, deploy new code that writes to BOTH old+new
Step 2 (Migrate):   Backfill existing rows
Step 3 (Contract):  Remove old column, deploy code that only uses new column
```

```yaml
# In your deploy script — always run BEFORE starting new containers
- name: Run migrations before deploy
  run: |
    docker run --rm \
      -e DATABASE_URL="${{ secrets.PROD_DATABASE_URL }}" \
      $IMAGE_TAG \
      npx prisma migrate deploy
    
    # Only swap if migration succeeded
    docker compose up -d --no-deps --wait app
```

**Here's the trap most devs fall into:** Running `prisma migrate dev` in production. `migrate dev` resets the DB if the shadow DB detects drift. `migrate deploy` is the production command — it only applies pending migrations and never resets.

| Command | Use in | What it does |
|---|---|---|
| `prisma migrate dev` | Development only | Generates migration files, can reset |
| `prisma migrate deploy` | CI/CD, production | Applies pending migrations, no reset |
| `prisma migrate reset` | Test setup | Drops and recreates DB — NEVER in prod |
| `prisma db push` | Prototyping | Syncs schema without migration files |

---

## 🔥 Complete Jest Configuration

```ts
// jest.config.ts
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  
  // Separate unit and integration test commands
  projects: [
    {
      displayName: 'unit',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/**/*.test.ts'],
      testPathIgnorePatterns: ['.integration.test.ts'],
    },
    {
      displayName: 'integration',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/**/*.integration.test.ts'],
      globalSetup: '<rootDir>/src/test/db-setup.ts',
      globalTeardown: '<rootDir>/src/test/db-teardown.ts',
    },
  ],
  
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/migrations/**',
    '!src/test/**',
  ],
  
  coverageThresholds: {
    global: { branches: 80, functions: 85, lines: 85, statements: 85 },
  },
  
  coverageReporters: ['text-summary', 'lcov', 'html'],
  
  // Avoid open handles from Knex, Prisma connections
  forceExit: false,           // ← detect open handles, don't force
  detectOpenHandles: true,    // ← tells you WHAT is keeping Jest alive
  
  testTimeout: 10_000,        // Integration tests can be slow
  
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1', // tsconfig path aliases
  },
};

export default config;
```

```json
// package.json scripts
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --selectProjects unit",
    "test:integration": "jest --selectProjects integration",
    "test:coverage": "jest --coverage --selectProjects unit",
    "test:watch": "jest --watch --selectProjects unit",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src --ext .ts --max-warnings 0"
  }
}
```

---

## 🔥 Supertest Full Integration Test Example

```ts
// src/routes/auth.routes.integration.test.ts
import request from 'supertest';
import { createTestApp } from '../test/app';
import { db } from '../db/connection';
import { createTestUser } from '../test/factories';
import bcrypt from 'bcryptjs';

describe('Auth Routes', () => {
  const app = createTestApp();

  beforeEach(async () => {
    await db.raw('BEGIN');
  });

  afterEach(async () => {
    await db.raw('ROLLBACK');
  });

  describe('POST /api/auth/login', () => {
    it('returns JWT token with valid credentials', async () => {
      const password = 'SecurePassword123!';
      const user = await createTestUser({
        email: 'test@example.com',
        passwordHash: await bcrypt.hash(password, 10),
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: user.email, password });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        token: expect.stringMatching(/^eyJ/), // JWT prefix
        user: expect.objectContaining({ id: user.id }),
      });
      // Verify token structure
      const [header, payload] = res.body.token.split('.');
      const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
      expect(decoded.sub).toBe(user.id);
    });

    it('returns 401 with wrong password', async () => {
      const user = await createTestUser({
        passwordHash: await bcrypt.hash('correct-password', 10),
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: user.email, password: 'wrong-password' });

      expect(res.status).toBe(401);
      // Security: don't reveal whether email exists
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('returns 429 after 5 failed attempts (rate limiting)', async () => {
      const user = await createTestUser();

      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({ email: user.email, password: 'wrong' });
      }

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: user.email, password: 'wrong' });

      expect(res.status).toBe(429);
    });
  });
});
```

---

## 🔥 Interview-Ready: Why These Choices

**Why Testcontainers over a shared test DB?**
Shared test DB causes flaky tests from leftover state, can't run CI in parallel branches without conflict, and doesn't match production DB version. Testcontainers gives each pipeline run a clean, isolated DB guaranteed to match production.

**Why transaction rollback over table truncation?**
`TRUNCATE` acquires an `ACCESS EXCLUSIVE` lock on each table, blocks other connections, and is slower as your schema grows. Rolling back a transaction is instantaneous — the DB discards the WAL entries. The catch: code that commits inside the test (e.g., `prisma.$transaction`) breaks the rollback assumption.

**Why Zod schemas for OpenAPI instead of JSDoc?**
JSDoc OpenAPI annotations are YAML strings inside JS comments — no type checking, no autocomplete, silently wrong. Zod schemas are typed TypeScript — a typo is a compile error. Zod-to-openapi generates the spec from the same schema that validates your requests at runtime.

**Why multi-stage Docker builds?**
Single-stage builds carry devDependencies (TypeScript compiler, Jest, all test utilities), TypeScript source files, and are 5–10x larger. Multi-stage gives you exactly what runs in production: compiled JS + prod node_modules. Smaller = faster deploys, smaller attack surface, cheaper registry storage.

**Why run `prisma migrate deploy` before container swap?**
If the new code assumes a column exists that doesn't yet, every request 500s between container startup and migration completion. Run migrations first, then start new containers. The old code stays running against the already-migrated DB — backward compatibility required.

---

## 🔥 Quick Reference — When to Use What

**Test type selection:**

| Scenario | Test type |
|---|---|
| Pure function with complex branching | Unit |
| Service with mocked dependencies | Unit |
| Express route → DB → response shape | Integration |
| Auth flow end-to-end with real tokens | Integration |
| Checkout flow across 4 services | E2E (sparingly) |
| Cron job logic | Unit (mock the scheduler) |
| Queue worker message processing | Unit (mock queue client) |

**Documentation approach:**

| Situation | Recommendation |
|---|---|
| New TS project with Zod validation | zod-to-openapi |
| Existing project with JSDoc annotations | Keep JSDoc, add zod gradually |
| REST API with complex polymorphic types | Manual openapi.yaml |
| GraphQL API | GraphQL introspection (skip OpenAPI) |

**Docker base image:**

| Need | Image |
|---|---|
| Production Node.js API | `node:22-alpine` |
| Need glibc (native addons like sharp) | `node:22-slim` (Debian) |
| Maximum security, no shell | `gcr.io/distroless/nodejs22-debian12` |
| Local dev with hot reload | `node:22` (full) |
