# Middleware and Error Handling

## What You'll Learn

- Typing Express middleware with `RequestHandler`
- Extending the `Request` interface via declaration merging
- Building a custom error class hierarchy
- Wrapping async handlers to catch errors automatically
- Implementing a global error handler
- Structuring typed error responses

---

## Typing Middleware

Express provides the `RequestHandler` type for middleware functions. It accepts the same generics as `Request`:

```typescript
import { RequestHandler } from 'express';

// Simple middleware -- no special typing needed
const requestLogger: RequestHandler = (req, _res, next) => {
  console.log(`${req.method} ${req.path} at ${new Date().toISOString()}`);
  next();
};
```

When you need to type the request more specifically:

```typescript
import { RequestHandler } from 'express';

interface PaginationQuery {
  page?: string;
  limit?: string;
}

// The fourth generic types req.query
const parsePagination: RequestHandler<{}, any, any, PaginationQuery> = (req, _res, next) => {
  // req.query.page and req.query.limit are typed as string | undefined
  next();
};
```

> **Coming from JS:** You likely wrote middleware as plain `(req, res, next) => {}` functions. That still works, but adding `RequestHandler` as the type annotation gives you autocomplete on `req`, `res`, and catches mistakes like forgetting to call `next()` or returning the wrong type.

---

## Extending the Request Interface

Middleware often attaches data to the request object (e.g., the authenticated user). TypeScript needs to know about these additions.

### Declaration Merging

Create a type declaration file:

```typescript
// src/types/express.d.ts
import { JwtPayload } from './auth.types';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      requestId?: string;
    }
  }
}
```

```typescript
// src/types/auth.types.ts
export interface JwtPayload {
  userId: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  iat: number;
  exp: number;
}
```

Now `req.user` is available everywhere without importing anything.

> **Coming from JS:** You probably just did `req.user = decoded` and moved on. TypeScript won't allow that unless you declare the property. The `declare global` block extends Express's own `Request` interface so every handler sees your custom properties.

---

## Realistic Auth Middleware

```typescript
// src/middleware/auth.middleware.ts
import { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types/auth.types';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export const authenticate: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Missing or malformed Authorization header',
    });
  }

  const token = header.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Invalid or expired token',
    });
  }
};

// Role-based authorization that builds on authenticate
export function authorize(...allowedRoles: JwtPayload['role'][]): RequestHandler {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: `Role '${req.user.role}' does not have access to this resource`,
      });
    }

    next();
  };
}
```

### Using Auth in Routes

```typescript
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { postController } from '../controllers/post.controller';

const router = Router();

// Public routes
router.get('/', postController.getAll);
router.get('/:id', postController.getById);

// Protected routes -- must be logged in
router.post('/', authenticate, postController.create);
router.put('/:id', authenticate, postController.update);

// Admin-only
router.delete('/:id', authenticate, authorize('admin'), postController.delete);

export default router;
```

---

## Logging Middleware with Request ID

```typescript
// src/middleware/requestId.middleware.ts
import { randomUUID } from 'crypto';
import { RequestHandler } from 'express';

export const attachRequestId: RequestHandler = (req, res, next) => {
  const id = (req.headers['x-request-id'] as string) || randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
};
```

```typescript
// src/middleware/logger.middleware.ts
import { RequestHandler } from 'express';

export const httpLogger: RequestHandler = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(JSON.stringify({
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: duration,
      userAgent: req.headers['user-agent'],
      userId: req.user?.userId,
    }));
  });

  next();
};
```

---

## Custom Error Class Hierarchy

A typed error hierarchy lets your error handler respond differently to different error types.

```typescript
// src/errors/AppError.ts
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    isOperational = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    // Maintains proper prototype chain
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id
      ? `${resource} with id '${id}' not found`
      : `${resource} not found`;
    super(message, 404, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  public readonly fields: Record<string, string>;

  constructor(message: string, fields: Record<string, string> = {}) {
    super(message, 400, 'VALIDATION_ERROR');
    this.fields = fields;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}
```

> **Coming from JS:** You might have thrown plain `Error` objects or objects like `{ status: 404, message: '...' }`. A typed class hierarchy means you can use `instanceof` checks that TypeScript understands, and every error carries consistent fields.

---

## The catchAsync Pattern

Express does not catch errors thrown inside `async` handlers. You need a wrapper.

```typescript
// src/utils/catchAsync.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;

export function catchAsync(fn: AsyncRequestHandler): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
```

### Using catchAsync in Controllers

```typescript
// src/controllers/post.controller.ts
import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { NotFoundError } from '../errors/AppError';

export const postController = {
  getById: catchAsync(async (req: Request<{ id: string }>, res: Response) => {
    const post = await db.posts.findById(req.params.id);

    if (!post) {
      throw new NotFoundError('Post', req.params.id);
    }

    res.json({ data: post });
  }),

  create: catchAsync(async (req: Request, res: Response) => {
    const post = await db.posts.create({
      ...req.body,
      authorId: req.user!.userId,
    });

    res.status(201).json({ data: post });
  }),
};
```

No `try/catch` in every handler. If anything throws, `catchAsync` forwards it to `next()`, which reaches the global error handler.

---

## Global Error Handler Middleware

```typescript
// src/middleware/errorHandler.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../errors/AppError';

interface ErrorResponseBody {
  error: string;
  message: string;
  fields?: Record<string, string>;
  stack?: string;
}

export function globalErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log the error
  console.error(JSON.stringify({
    requestId: req.requestId,
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  }));

  // Known operational errors
  if (err instanceof AppError) {
    const body: ErrorResponseBody = {
      error: err.code,
      message: err.message,
    };

    if (err instanceof ValidationError && Object.keys(err.fields).length > 0) {
      body.fields = err.fields;
    }

    if (process.env.NODE_ENV === 'development') {
      body.stack = err.stack;
    }

    res.status(err.statusCode).json(body);
    return;
  }

  // Unexpected errors -- don't leak details in production
  const statusCode = 500;
  const body: ErrorResponseBody = {
    error: 'INTERNAL_SERVER_ERROR',
    message:
      process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message,
  };

  if (process.env.NODE_ENV === 'development') {
    body.stack = err.stack;
  }

  res.status(statusCode).json(body);
}
```

> **Coming from JS:** The key Express rule still applies: error-handling middleware has **four** parameters `(err, req, res, next)`. TypeScript enforces the signature. Notice `_next` is unused but must be present so Express recognizes this as an error handler.

---

## Wiring Everything Together

```typescript
// src/server.ts
import express from 'express';
import routes from './routes';
import { attachRequestId } from './middleware/requestId.middleware';
import { httpLogger } from './middleware/logger.middleware';
import { globalErrorHandler } from './middleware/errorHandler.middleware';
import { NotFoundError } from './errors/AppError';

const app = express();

// ---- Pre-route middleware ----
app.use(express.json());
app.use(attachRequestId);
app.use(httpLogger);

// ---- Routes ----
app.use('/api/v1', routes);

// ---- 404 for unmatched routes ----
app.all('*', (req) => {
  throw new NotFoundError(`Route ${req.method} ${req.path}`);
});

// ---- Global error handler (must be last) ----
app.use(globalErrorHandler);

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

### The Error Flow

1. A handler throws `new NotFoundError('Post', '123')`.
2. `catchAsync` catches the rejected promise and calls `next(err)`.
3. Express skips all normal middleware and jumps to `globalErrorHandler`.
4. The error handler checks `instanceof AppError`, formats the response, and sends a `404` with `{ error: 'NOT_FOUND', message: "Post with id '123' not found" }`.

---

## Mini-Exercise

Build a rate-limiting middleware with full typing:

1. Create a `RateLimitConfig` interface with `windowMs`, `maxRequests`, and an optional `message` string.
2. Write a `rateLimit(config: RateLimitConfig): RequestHandler` factory function that tracks requests by IP using a `Map<string, { count: number; resetAt: number }>`.
3. When the limit is exceeded, throw a custom `RateLimitError` that extends `AppError` with status `429` and code `'RATE_LIMITED'`.
4. Make sure `catchAsync` is not needed here (this middleware is synchronous).
5. Add the middleware to a route and verify the global error handler formats the `429` response correctly.
