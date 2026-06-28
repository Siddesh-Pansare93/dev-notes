# Chapter 18: Production-Grade Node.js Backend — Architecture and Setup

> **Who this is for:** You already know Node.js. You've built APIs. You've felt the pain of a codebase that grew into spaghetti. This chapter is about doing it right from day one — the patterns, the traps, and the exact config that makes a backend survive production.

---

## 🏗️ The Architecture Decision You'll Regret Skipping

Most Node.js projects start as `index.js` with Express routes and a Mongoose model in the same file. Then you refactor. Then you refactor again. Then you have `routes/users.js` importing directly from `models/user.js` importing directly from `config/db.js` — and testing becomes a nightmare because everything is coupled.

**Clean Architecture** (also called Hexagonal or Ports-and-Adapters) solves this. The core idea:

```
Business Logic knows NOTHING about HTTP, databases, or external services.
The outside world adapts to the business logic — not the other way around.
```

```mermaid
graph TD
    HTTP["HTTP Request\n(Express Router)"] --> C["Controller\n(Presentation Layer)"]
    C --> UC["Use Case\n(Application Layer)"]
    UC --> E["Domain Entities\n(Pure Business Rules)"]
    UC --> I["Repository Interface\n(Domain Layer)"]
    I --> PG["PostgreSQL Repo\n(Infrastructure Layer)"]
    I --> CACHE["Redis Cache\n(Infrastructure Layer)"]
    PG --> DB[(PostgreSQL)]
    CACHE --> R[(Redis)]
```

The dependency arrows all point **inward**. Domain knows nothing about Postgres. Use cases know nothing about HTTP verbs. This means:
- You can swap Postgres for MongoDB without touching business logic
- You can test use cases with in-memory repositories (zero DB required)
- You can add a CLI, gRPC, or WebSocket interface without duplicating logic

**Project: Job Board API** — We'll build this for real. Users, companies, jobs, applications, search.

---

## 🔥 TypeScript Config — Strict Mode Is Non-Negotiable

**Here's the trap most devs fall into:** they start with `"strict": false` to "move fast" and end up with a codebase where `undefined` crashes prod at 3am.

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,

    // Strict mode — every single one matters
    "strict": true,                        // enables all below
    "noUncheckedIndexedAccess": true,      // arr[0] is T | undefined — catches most runtime crashes
    "exactOptionalPropertyTypes": true,    // {a?: string} doesn't allow {a: undefined}
    "noImplicitReturns": true,             // function must return in all branches
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "forceConsistentCasingInFileNames": true,

    // Path aliases — the QoL feature you'll wonder how you lived without
    "baseUrl": ".",
    "paths": {
      "@domain/*": ["src/domain/*"],
      "@app/*": ["src/application/*"],
      "@infra/*": ["src/infrastructure/*"],
      "@config/*": ["src/config/*"],
      "@shared/*": ["src/shared/*"],
      "@presentation/*": ["src/presentation/*"]
    },

    // Modern module interop
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

**Why `NodeNext` module resolution?** Because it's the only one that correctly handles `.js` extensions in imports (required for ESM Node.js), native `package.json` `exports` fields, and dual CJS/ESM packages. `bundler` resolution is for Vite/webpack — not for Node running directly.

**Why `noUncheckedIndexedAccess`?** This one isn't enabled by `"strict": true`. Add it anyway. It forces you to handle the case where `array[index]` returns `undefined`, catching the most common runtime crash pattern.

| Option | What it catches |
|--------|----------------|
| `strict` | null/undefined, implicit any, improper this |
| `noUncheckedIndexedAccess` | `arr[0]` used without null check |
| `exactOptionalPropertyTypes` | assigning `undefined` to optional props |
| `noImplicitReturns` | missing return in async functions |

**Path alias resolution at runtime** — TypeScript compiles aliases but Node.js at runtime doesn't know about them. You need `tsconfig-paths` for ts-node or configure via `tsx`:

```json
// package.json scripts
{
  "scripts": {
    "dev": "tsx watch --tsconfig tsconfig.json src/main.ts",
    "build": "tsc && tsc-alias",
    "start": "node dist/main.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "migrate": "node -r tsconfig-paths/register dist/infrastructure/database/migrate.js",
    "migrate:rollback": "node dist/infrastructure/database/migrate.js rollback",
    "lint": "eslint src --ext .ts --fix",
    "typecheck": "tsc --noEmit"
  }
}
```

**`tsx` vs `ts-node` vs `ts-node/esm`:**
- `tsx` — esbuild-powered, fastest, supports ESM natively, no config needed. Use this for dev.
- `ts-node` — slower (tsc under the hood), needs `--esm` flag for ESM. Legacy.
- `ts-node/esm` — ESM support for ts-node, but finicky. Skip it.

---

## 🔥 Environment Validation with Zod — Fail Fast or Fail at 3am

**Here's the trap most devs fall into:** `process.env.DATABASE_URL` returns `undefined` silently. Your app starts, accepts traffic, then explodes when it first tries to use it. Error is buried 50 lines into a stack trace. Hours lost.

**The fix:** validate all env vars at startup, before anything else runs.

```typescript
// src/config/index.ts
import { z } from 'zod';

const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().min(1).max(65535).default(3000),
  API_VERSION: z.string().default('v1'),

  // Database
  DATABASE_URL: z.string().url().startsWith('postgresql://'),
  DATABASE_POOL_MIN: z.coerce.number().default(2),
  DATABASE_POOL_MAX: z.coerce.number().default(10),

  // Redis
  REDIS_URL: z.string().url().startsWith('redis://'),
  REDIS_TTL_SECONDS: z.coerce.number().default(3600),

  // Auth
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 chars'),
  JWT_EXPIRY: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRY: z.string().default('7d'),

  // Email (optional in test, required in prod)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  // Storage
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),  // 15 min
  RATE_LIMIT_MAX: z.coerce.number().default(100),
}).refine(
  (data) => {
    // In production, email config is mandatory
    if (data.NODE_ENV === 'production') {
      return data.SMTP_HOST && data.SMTP_PORT && data.SMTP_USER && data.SMTP_PASS;
    }
    return true;
  },
  { message: 'SMTP config is required in production', path: ['SMTP_HOST'] }
);

// Type inference from schema — no need to define a separate interface
export type AppConfig = z.infer<typeof envSchema>;

function validateConfig(): AppConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment configuration:');
    // Format errors nicely for humans
    result.error.issues.forEach((issue) => {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    });
    process.exit(1); // Hard exit — no graceful shutdown needed, app never started
  }

  return result.data;
}

// Singleton — validated once, reused everywhere
export const config = validateConfig();
```

**Why `z.coerce.number()`?** `process.env` is always `string | undefined`. Without coerce, `PORT: z.number()` fails even when PORT is set. Coerce converts `"3000"` to `3000` automatically.

**Why `process.exit(1)` here and not throw?** At config validation time, no async context exists yet. There's no graceful shutdown to do. Just log clearly and die.

---

## 🔥 Dependency Injection Without a Framework

**The debate:** Use InversifyJS/TSyringe vs manual constructor injection.

| | InversifyJS/TSyringe | Manual Constructor Injection |
|-|---------------------|------------------------------|
| Setup complexity | High (decorators, reflect-metadata) | None |
| Runtime overhead | Decorator reflection at startup | Zero |
| Testability | Good | Excellent |
| Explicitness | Magic (hidden deps) | Total clarity |
| TS strict mode compat | Needs `experimentalDecorators` | Works natively |

**For most production Node.js apps, manual DI wins.** You can see every dependency. Tests can swap any dependency without mocking frameworks. No magic, no build-time errors from missing `reflect-metadata`.

```typescript
// src/domain/interfaces/repositories.ts
export interface IJobRepository {
  findById(id: string): Promise<Job | null>;
  findAll(filters: JobFilters, pagination: Pagination): Promise<PaginatedResult<Job>>;
  create(data: CreateJobData): Promise<Job>;
  update(id: string, data: UpdateJobData): Promise<Job | null>;
  delete(id: string): Promise<boolean>;
  search(query: string, filters: JobFilters): Promise<PaginatedResult<Job>>;
}

export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  invalidatePattern(pattern: string): Promise<void>;
}
```

```typescript
// src/application/use-cases/jobs/search-jobs.use-case.ts
import type { IJobRepository } from '@domain/interfaces/repositories';
import type { ICacheService } from '@domain/interfaces/repositories';
import type { Logger } from '@shared/logger';

export class SearchJobsUseCase {
  // Deps declared explicitly — no magic, no decorators
  constructor(
    private readonly jobRepo: IJobRepository,
    private readonly cache: ICacheService,
    private readonly logger: Logger,
  ) {}

  async execute(query: string, filters: JobFilters, pagination: Pagination) {
    const cacheKey = `jobs:search:${JSON.stringify({ query, filters, pagination })}`;

    // Try cache first
    const cached = await this.cache.get<PaginatedResult<Job>>(cacheKey);
    if (cached) {
      this.logger.debug('Cache hit for job search', { query, filters });
      return cached;
    }

    const result = await this.jobRepo.search(query, filters, pagination);

    // Cache for 5 min — search results can be slightly stale
    await this.cache.set(cacheKey, result, 300);

    return result;
  }
}
```

```typescript
// src/infrastructure/container.ts — the composition root
// This is the ONLY place where concrete classes are instantiated
import { config } from '@config/index';
import { PostgresJobRepository } from './database/repositories/job.repository';
import { RedisCache } from './cache/redis.cache';
import { EmailService } from './email/email.service';
import { SearchJobsUseCase } from '@app/use-cases/jobs/search-jobs.use-case';
import { CreateJobUseCase } from '@app/use-cases/jobs/create-job.use-case';
import { logger } from '@shared/logger';
import type { DatabasePool } from './database/pool';
import type { RedisClient } from './cache/redis-client';

export function buildContainer(db: DatabasePool, redis: RedisClient) {
  // Repositories (Infrastructure)
  const jobRepo = new PostgresJobRepository(db, logger);
  const userRepo = new PostgresUserRepository(db, logger);
  const companyRepo = new PostgresCompanyRepository(db, logger);
  const applicationRepo = new PostgresApplicationRepository(db, logger);

  // Services (Infrastructure)
  const cache = new RedisCache(redis, config.REDIS_TTL_SECONDS, logger);
  const emailService = new EmailService(config, logger);

  // Use Cases (Application) — pure business logic, no infra deps
  const searchJobs = new SearchJobsUseCase(jobRepo, cache, logger);
  const createJob = new CreateJobUseCase(jobRepo, companyRepo, emailService, logger);
  const applyForJob = new ApplyForJobUseCase(applicationRepo, jobRepo, userRepo, emailService, logger);

  return {
    repositories: { jobRepo, userRepo, companyRepo, applicationRepo },
    services: { cache, emailService },
    useCases: { searchJobs, createJob, applyForJob },
  };
}

export type Container = ReturnType<typeof buildContainer>;
```

**Here's the trap most devs fall into:** They put the composition root inside individual modules, importing concrete implementations directly. Now every test file imports the real database. Swap to this pattern and your test setup becomes trivial — just pass mocks to the constructor.

---

## 🔥 Application Bootstrap Order — The Sequence Matters

```mermaid
graph LR
    A[Validate Config] --> B[Connect DB]
    B --> C[Run Migrations]
    C --> D[Connect Redis]
    D --> E[Build DI Container]
    E --> F[Init Express App]
    F --> G[Register Routes]
    G --> H[Start HTTP Server]
    H --> I[Register Signal Handlers]
    I --> J[Ready ✓]
```

**Why this exact order matters:**
- Config validation before anything — if env is wrong, fail immediately with a clear message
- DB before Redis — jobs depend on DB; Redis is optional cache
- Migrations before starting the server — you never want a server accepting traffic with stale schema
- Signal handlers last — only register them when you're actually ready to receive traffic

```typescript
// src/main.ts
import 'dotenv/config'; // Must be FIRST — loads .env before any import reads process.env
import { config } from '@config/index';  // Validates env — exits if invalid
import { createDatabasePool } from '@infra/database/pool';
import { createRedisClient } from '@infra/cache/redis-client';
import { buildContainer } from '@infra/container';
import { createApp } from './app';
import { logger } from '@shared/logger';

async function bootstrap() {
  logger.info('Starting Job Board API', { env: config.NODE_ENV, version: process.env.npm_package_version });

  // 1. Connect to PostgreSQL
  const db = await createDatabasePool(config.DATABASE_URL, {
    min: config.DATABASE_POOL_MIN,
    max: config.DATABASE_POOL_MAX,
  });
  logger.info('PostgreSQL connected', { poolSize: config.DATABASE_POOL_MAX });

  // 2. Connect to Redis
  const redis = await createRedisClient(config.REDIS_URL);
  logger.info('Redis connected');

  // 3. Build dependency injection container
  const container = buildContainer(db, redis);

  // 4. Create Express app with all middleware and routes
  const app = createApp(container);

  // 5. Start HTTP server — note: listen() not on app directly
  //    This lets us close the server without killing the process
  const server = app.listen(config.PORT, () => {
    logger.info(`HTTP server listening on port ${config.PORT}`);
  });

  // 6. Register graceful shutdown handlers AFTER server starts
  registerShutdownHandlers(server, db, redis);
}

function registerShutdownHandlers(
  server: ReturnType<typeof import('http').createServer>,
  db: DatabasePool,
  redis: RedisClient,
) {
  let isShuttingDown = false;

  async function shutdown(signal: string) {
    if (isShuttingDown) return; // SIGTERM + SIGINT can both fire
    isShuttingDown = true;

    logger.info(`Received ${signal} — starting graceful shutdown`);

    // Step 1: Stop accepting new connections
    server.close(async (err) => {
      if (err) {
        logger.error('Error closing HTTP server', { err });
        process.exit(1);
      }

      logger.info('HTTP server closed — draining in-flight requests');

      // Step 2: Close database pool (waits for active queries to complete)
      await db.end();
      logger.info('PostgreSQL pool closed');

      // Step 3: Close Redis connection
      await redis.quit();
      logger.info('Redis connection closed');

      logger.info('Graceful shutdown complete');
      process.exit(0);
    });

    // Safety timeout — if shutdown takes too long, force exit
    setTimeout(() => {
      logger.error('Graceful shutdown timed out after 30s — forcing exit');
      process.exit(1);
    }, 30_000);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM')); // Kubernetes sends this
  process.on('SIGINT', () => shutdown('SIGINT'));   // Ctrl+C in terminal

  // Catch unhandled promise rejections — never let them go silent
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection', { reason, promise });
    // In production: alert your oncall, then shut down (process is in undefined state)
    shutdown('unhandledRejection');
  });

  // Catch uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', { error });
    shutdown('uncaughtException');
  });
}

bootstrap().catch((error) => {
  console.error('Fatal error during bootstrap:', error);
  process.exit(1);
});
```

```typescript
// src/app.ts — Express app factory (not a singleton, enables testing)
import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { rateLimit } from 'express-rate-limit';
import { config } from '@config/index';
import { requestLogger } from '@presentation/middleware/request-logger';
import { errorHandler } from '@presentation/middleware/error-handler';
import { notFoundHandler } from '@presentation/middleware/not-found';
import { registerRoutes } from '@presentation/routes';
import type { Container } from '@infra/container';

export function createApp(container: Container): Express {
  const app = express();

  // Trust proxy — required when behind nginx/load balancer for correct IP in req.ip
  // Without this, rate limiting by IP is useless (everyone looks like 127.0.0.1)
  app.set('trust proxy', 1);

  // Security headers
  app.use(helmet());
  app.use(cors({
    origin: config.NODE_ENV === 'production'
      ? ['https://jobboard.com', 'https://app.jobboard.com']
      : true, // Allow all in dev
    credentials: true,
  }));

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(compression());

  // Rate limiting
  app.use('/api', rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    max: config.RATE_LIMIT_MAX,
    standardHeaders: true,   // Returns RateLimit-* headers
    legacyHeaders: false,
    // Custom key — use authenticated user ID when available, fall back to IP
    keyGenerator: (req) => (req.user?.id ?? req.ip) as string,
  }));

  // Request logging (before routes)
  app.use(requestLogger);

  // Health check — outside rate limiting, used by Kubernetes probes
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/ready', async (_req, res) => {
    // Deeper readiness check — actually ping DB and Redis
    try {
      await container.repositories.jobRepo.healthCheck();
      res.json({ status: 'ready' });
    } catch {
      res.status(503).json({ status: 'not ready' });
    }
  });

  // All API routes
  registerRoutes(app, container);

  // Error handlers — MUST be last
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
```

**Here's the trap most devs fall into:** They do `app.listen()` inside `createApp()`. Now you can't test the app without starting an actual HTTP server. Return the app from a factory function, call `listen()` separately in `main.ts`.

---

## 🔥 Graceful Shutdown Deep Dive

**Why SIGTERM and not SIGKILL?** Kubernetes sends SIGTERM first, waits `terminationGracePeriodSeconds` (default 30s), then sends SIGKILL. During that window, your app must: stop accepting requests, finish in-flight, close connections. If you don't handle SIGTERM, you get SIGKILL after 30s — every in-flight request dies.

```mermaid
sequenceDiagram
    participant K8s as Kubernetes
    participant LB as Load Balancer
    participant App as Node.js App
    participant DB as PostgreSQL

    K8s->>App: SIGTERM
    K8s->>LB: Remove pod from endpoints
    Note over App: isShuttingDown = true
    App->>App: server.close() — stop accepting new connections
    Note over LB: New requests routed elsewhere
    Note over App: Drain in-flight requests (max 30s)
    App->>DB: pool.end() — wait for active queries
    DB-->>App: All connections closed
    App->>App: process.exit(0)
    K8s->>App: (SIGKILL never needed)
```

**The `server.close()` gotcha:** `server.close()` stops the server from accepting NEW connections, but existing keep-alive connections stay open. In production with a reverse proxy, this is fine — the proxy handles connection draining. But if you're receiving direct connections (rare), you may need to also destroy idle keep-alive connections:

```typescript
// Track connections for forceful close if needed
const connections = new Set<import('net').Socket>();
server.on('connection', (socket) => {
  connections.add(socket);
  socket.on('close', () => connections.delete(socket));
});

// In shutdown:
connections.forEach((socket) => socket.destroy());
```

---

## 🔥 Docker Multi-Stage Build

**The trap:** Building a Docker image that copies in `node_modules` from dev, includes TypeScript source, devDependencies, and source maps. Result: 800MB image. In prod, you want 150-200MB.

```dockerfile
# Dockerfile

# ─── Stage 1: Builder ────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /build

# Copy package files first — Docker layer caching
# If package.json doesn't change, npm install is skipped on rebuild
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# Copy source
COPY tsconfig.json ./
COPY src/ ./src/

# Compile TypeScript
RUN npm run build

# Prune devDependencies — only prod deps in next stage
RUN npm ci --omit=dev && npm cache clean --force


# ─── Stage 2: Production ─────────────────────────────────────────────
FROM node:22-alpine AS production

# Security: don't run as root
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /app

# Copy only what's needed from builder
COPY --from=builder --chown=nodejs:nodejs /build/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /build/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /build/package.json ./

USER nodejs

# Health check — Kubernetes can also do this, but useful for docker run
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

EXPOSE 3000

# Use node directly, NOT npm start — avoids npm wrapper and signal forwarding issues
CMD ["node", "dist/main.js"]
```

**Why `npm ci` over `npm install`?**
- `npm ci` uses `package-lock.json` exactly — reproducible builds
- `npm ci` is faster (skips resolution)
- `npm ci` fails if `package-lock.json` doesn't match `package.json`
- Never use `npm install` in Docker

**Why `node dist/main.js` over `npm start`?**
`npm start` spawns npm as a process that spawns node as a child. SIGTERM goes to npm. npm doesn't forward it to node cleanly. Your graceful shutdown never runs. Use `node` directly.

**Why `node:22-alpine` over `node:22`?** Alpine is ~50MB vs ~300MB. The trade-off is musl libc instead of glibc — this breaks some native addons (bcrypt, sharp). For pure JS/TS with no native modules, Alpine is fine. If you use native modules, use `node:22-slim` (Debian slim, ~150MB).

---

## 🔥 docker-compose for Local Dev

```yaml
# docker-compose.yml
version: '3.9'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: builder  # Use builder stage for dev (has devDeps + source)
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: development
      PORT: 3000
      DATABASE_URL: postgresql://jobboard:secret@postgres:5432/jobboard_dev
      REDIS_URL: redis://redis:6379
      JWT_SECRET: dev-secret-at-least-32-characters-long
    volumes:
      # Mount source for hot reload — don't copy into container in dev
      - ./src:/app/src
      - ./tsconfig.json:/app/tsconfig.json
    command: npm run dev  # tsx watch
    depends_on:
      postgres:
        condition: service_healthy  # Wait for DB to be ACTUALLY ready, not just started
      redis:
        condition: service_healthy
    networks:
      - jobboard-network
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: jobboard_dev
      POSTGRES_USER: jobboard
      POSTGRES_PASSWORD: secret
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
      # Run init SQL on first start
      - ./docker/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U jobboard -d jobboard_dev"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 10s
    networks:
      - jobboard-network

  redis:
    image: redis:7-alpine
    command: redis-server --save 60 1 --loglevel warning  # Persistence + quiet
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
    networks:
      - jobboard-network

  adminer:
    # Lightweight DB UI — localhost:8080 in dev
    image: adminer:latest
    ports:
      - "8080:8080"
    environment:
      ADMINER_DEFAULT_SERVER: postgres
    depends_on:
      - postgres
    networks:
      - jobboard-network

volumes:
  postgres-data:
  redis-data:

networks:
  jobboard-network:
    driver: bridge
```

**Here's the trap most devs fall into:** Using `depends_on: postgres` without `condition: service_healthy`. Docker considers Postgres "started" the moment the container starts — but Postgres takes 2-5 seconds to initialize. Your app crashes on startup trying to connect. The `condition: service_healthy` fix waits for the actual `pg_isready` health check to pass.

**.env.example** — commit this, NEVER commit the actual `.env`:

```bash
# .env.example — copy to .env and fill in values

# Application
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://jobboard:secret@localhost:5432/jobboard_dev
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Redis
REDIS_URL=redis://localhost:6379
REDIS_TTL_SECONDS=3600

# Auth — generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# Email (optional in development)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# Storage (optional)
S3_BUCKET=
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
```

---

## 🔥 Full Project Structure Walkthrough

```
src/
├── config/
│   └── index.ts              ← Zod env validation, config singleton
│
├── domain/
│   ├── entities/
│   │   ├── job.entity.ts     ← Pure TS class, no DB deps
│   │   ├── user.entity.ts
│   │   └── application.entity.ts
│   ├── interfaces/
│   │   └── repositories.ts   ← IJobRepository, IUserRepository (interfaces only)
│   └── errors/
│       ├── domain.error.ts   ← Base error class
│       ├── not-found.error.ts
│       └── validation.error.ts
│
├── infrastructure/
│   ├── database/
│   │   ├── pool.ts           ← pg Pool setup, connection management
│   │   ├── migrate.ts        ← Migration runner
│   │   └── repositories/
│   │       ├── job.repository.ts       ← Implements IJobRepository with raw SQL or Kysely
│   │       └── user.repository.ts
│   ├── cache/
│   │   ├── redis-client.ts
│   │   └── redis.cache.ts    ← Implements ICacheService
│   ├── email/
│   │   └── email.service.ts  ← Nodemailer + template engine
│   └── container.ts          ← Composition root — wires everything together
│
├── application/
│   └── use-cases/
│       ├── jobs/
│       │   ├── search-jobs.use-case.ts
│       │   ├── create-job.use-case.ts
│       │   └── apply-for-job.use-case.ts
│       └── auth/
│           ├── login.use-case.ts
│           └── register.use-case.ts
│
├── presentation/
│   ├── routes/
│   │   ├── index.ts          ← Route registration
│   │   ├── jobs.routes.ts
│   │   └── auth.routes.ts
│   ├── controllers/
│   │   ├── jobs.controller.ts
│   │   └── auth.controller.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── error-handler.ts  ← Maps domain errors to HTTP status codes
│   │   ├── request-logger.ts
│   │   └── not-found.ts
│   └── validators/
│       └── job.validators.ts ← Zod schemas for request bodies
│
└── shared/
    ├── logger.ts             ← Pino logger with structured JSON output
    ├── types.ts              ← Shared TypeScript types
    └── utils/
        ├── pagination.ts
        └── crypto.ts
```

---

## 🔥 Shared Logger — Pino over Winston

**Why Pino?** 5-8x faster than Winston. JSON by default. Async logging that doesn't block the event loop. `pino-pretty` for human-readable dev output.

```typescript
// src/shared/logger.ts
import pino from 'pino';
import { config } from '@config/index';

export const logger = pino({
  level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  // In production: raw JSON (parsed by your log aggregator — Datadog, Loki, CloudWatch)
  // In dev: pretty-print
  transport: config.NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
    : undefined,
  // Add these to every log line automatically
  base: {
    pid: process.pid,
    service: 'job-board-api',
    env: config.NODE_ENV,
  },
  // Redact sensitive fields — never log passwords or tokens
  redact: {
    paths: ['*.password', '*.token', '*.secret', 'req.headers.authorization'],
    censor: '[REDACTED]',
  },
});

export type Logger = typeof logger;
```

**Here's the trap most devs fall into:** Using `console.log` in production, which outputs plain text. Your log aggregator can't parse it, you can't query by field, and you can't correlate logs across services. Structured JSON logging (every log is an object) is a production requirement, not a nicety.

---

## 🔥 Package.json — Production-Grade Scripts

```json
{
  "name": "job-board-api",
  "version": "1.0.0",
  "private": true,
  "engines": { "node": ">=22.0.0", "npm": ">=10.0.0" },
  "scripts": {
    "dev": "tsx watch src/main.ts",
    "build": "tsc --project tsconfig.json && tsc-alias -p tsconfig.json",
    "start": "node dist/main.js",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src tests --ext .ts",
    "lint:fix": "eslint src tests --ext .ts --fix",
    "test": "vitest run --reporter=verbose",
    "test:watch": "vitest --ui",
    "test:coverage": "vitest run --coverage --coverage.reporter=lcov",
    "test:e2e": "vitest run --config vitest.e2e.config.ts",
    "migrate": "tsx src/infrastructure/database/migrate.ts",
    "migrate:rollback": "tsx src/infrastructure/database/migrate.ts rollback",
    "migrate:status": "tsx src/infrastructure/database/migrate.ts status",
    "db:seed": "tsx src/infrastructure/database/seed.ts",
    "docker:dev": "docker-compose up --build",
    "docker:down": "docker-compose down -v"
  },
  "dependencies": {
    "compression": "^1.7.4",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "express-rate-limit": "^7.3.1",
    "helmet": "^7.1.0",
    "ioredis": "^5.4.1",
    "jsonwebtoken": "^9.0.2",
    "pg": "^8.12.0",
    "pino": "^9.3.2",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/compression": "^1.7.5",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/node": "^22.0.0",
    "@types/pg": "^8.11.6",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "@vitest/coverage-v8": "^2.0.5",
    "@vitest/ui": "^2.0.5",
    "eslint": "^9.8.0",
    "pino-pretty": "^11.2.1",
    "tsc-alias": "^1.8.10",
    "tsx": "^4.16.5",
    "typescript": "^5.5.4",
    "vitest": "^2.0.5"
  }
}
```

**`tsc-alias` for path aliases in compiled output:** TypeScript compiles `@domain/entities` to `@domain/entities` in the JS output — it does NOT resolve aliases. `tsc-alias` post-processes the compiled JS and replaces alias imports with relative paths. Run it after `tsc`.

---

## 🔥 Interview-Ready: Why Clean Architecture in Node.js?

Interviewers love asking about architectural decisions. Here's the answer that shows depth:

**Q: Why not just put business logic in Express route handlers?**

"In route handlers, business logic is coupled to HTTP. You can't call it from a CLI, a background worker, or a test without spinning up an HTTP server. When you separate use cases from controllers, the same `ApplyForJobUseCase` can be invoked by an HTTP request, a queue consumer, or a CLI script — no code changes. Testing a use case becomes a pure function call with mock repositories — no HTTP, no database, sub-millisecond tests."

**Q: Isn't constructor injection verbose compared to using a DI framework?**

"Verbosity is a trade-off. With manual DI, the dependency graph is explicit and visible. With decorator-based DI, the framework resolves deps at runtime using reflection — magic that breaks in certain bundler setups and requires `experimentalDecorators`. For most Node.js services (not enterprise Java), the composition root (`container.ts`) is 50-100 lines and you touch it rarely. The predictability and debuggability is worth more than the verbosity savings from a framework."

---

## 🔥 What's Next

This chapter set up the foundation. The architecture decisions made here — Clean Architecture layers, explicit DI, strict TypeScript, Zod config validation, graceful shutdown — directly impact everything that follows:

- **Chapter 19:** Domain entities, repository pattern, PostgreSQL with raw SQL (why not an ORM for this use case)
- **Chapter 20:** Authentication — JWT + refresh tokens, password hashing, session management
- **Chapter 21:** Advanced Express middleware — request tracing, auth, rate limiting per route
- **Chapter 22:** Testing strategy — unit tests for use cases, integration tests for repositories, e2e with supertest
- **Chapter 23:** Search implementation — PostgreSQL full-text search vs Elasticsearch, when to choose which

The code in this chapter is production-ready starting point, not scaffolding to be replaced. Every decision has a reason — and now you know why.

---

*Key files in this chapter:*
- `src/main.ts` — bootstrap order + signal handlers
- `src/app.ts` — Express factory (testable, not singleton)
- `src/config/index.ts` — Zod env validation
- `src/infrastructure/container.ts` — composition root
- `Dockerfile` — multi-stage build
- `docker-compose.yml` — local dev stack
