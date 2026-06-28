# Request Validation with Zod

## What You'll Learn

- Why Zod is the go-to validation library for TypeScript APIs
- Defining schemas and inferring TypeScript types from them
- Building reusable request validation middleware
- Composing schemas with `pick`, `omit`, `extend`, and `merge`
- Adding transformations and custom error messages
- Integrating validated data into Express handlers

---

## Why Zod Over Manual Validation

Without Zod, you end up writing code like this:

```typescript
// Manual validation -- tedious, error-prone, types diverge from checks
app.post('/users', (req, res) => {
  if (!req.body.email || typeof req.body.email !== 'string') {
    return res.status(400).json({ error: 'email is required' });
  }
  if (!req.body.email.includes('@')) {
    return res.status(400).json({ error: 'email is invalid' });
  }
  if (!req.body.password || req.body.password.length < 8) {
    return res.status(400).json({ error: 'password must be 8+ chars' });
  }
  // ... and you still have req.body typed as `any`
});
```

Zod solves two problems at once: runtime validation **and** compile-time types from a single schema definition.

```bash
npm install zod
```

> **Coming from JS:** You may have used Joi or express-validator. Zod is similar in concept but designed for TypeScript -- you define a schema once and get both validation and a TypeScript type from it. No more keeping interfaces in sync with validation rules.

---

## Defining Schemas and Inferring Types

```typescript
// src/schemas/user.schema.ts
import { z } from 'zod';

export const createUserSchema = z.object({
  email: z
    .string()
    .email('Must be a valid email address')
    .max(255, 'Email must be under 255 characters'),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be under 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),

  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be under 100 characters')
    .trim(),

  role: z.enum(['admin', 'editor', 'viewer']).default('viewer'),
});

// Derive the TypeScript type from the schema
export type CreateUserDTO = z.infer<typeof createUserSchema>;
// Equivalent to:
// {
//   email: string;
//   password: string;
//   name: string;
//   role: 'admin' | 'editor' | 'viewer';
// }
```

The key insight: `z.infer<typeof schema>` gives you the TypeScript type. You define the shape once in the schema, and the type follows automatically.

---

## Request Validation Middleware

A generic middleware that validates `body`, `params`, and/or `query` against Zod schemas:

```typescript
// src/middleware/validate.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

interface ValidationSchemas {
  body?: AnyZodObject;
  params?: AnyZodObject;
  query?: AnyZodObject;
}

export function validate(schemas: ValidationSchemas) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params) as any;
      }
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query) as any;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formatted = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: formatted,
        });
      }

      next(error);
    }
  };
}
```

> **Coming from JS:** This replaces the pattern of calling `Joi.validate()` at the top of every handler. The middleware runs before your handler, so by the time your controller code executes, `req.body` is guaranteed to match the schema -- and TypeScript knows it.

### Using the Middleware in Routes

```typescript
// src/routes/user.routes.ts
import { Router } from 'express';
import { validate } from '../middleware/validate.middleware';
import { createUserSchema } from '../schemas/user.schema';
import { userController } from '../controllers/user.controller';

const router = Router();

router.post(
  '/',
  validate({ body: createUserSchema }),
  userController.create
);

export default router;
```

---

## Composing Schemas

Zod has powerful composition methods so you don't repeat yourself.

### Pick and Omit

```typescript
import { z } from 'zod';

const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  password: z.string().min(8),
  role: z.enum(['admin', 'editor', 'viewer']),
  createdAt: z.date(),
});

// For creating -- omit server-generated fields
const createUserSchema = userSchema.omit({
  id: true,
  createdAt: true,
});

// For login -- pick only what's needed
const loginSchema = userSchema.pick({
  email: true,
  password: true,
});

type LoginDTO = z.infer<typeof loginSchema>;
// { email: string; password: string }
```

### Partial for Updates

```typescript
// All fields optional -- perfect for PATCH requests
const updateUserSchema = createUserSchema.partial();

type UpdateUserDTO = z.infer<typeof updateUserSchema>;
// { email?: string; name?: string; password?: string; role?: '...' }

// Or make only some fields optional
const updateProfileSchema = createUserSchema
  .pick({ name: true, email: true })
  .partial();
```

### Extend and Merge

```typescript
const addressSchema = z.object({
  street: z.string(),
  city: z.string(),
  state: z.string().length(2),
  zip: z.string().regex(/^\d{5}$/),
});

// Extend adds fields to an existing schema
const createUserWithAddressSchema = createUserSchema.extend({
  address: addressSchema,
});

// Merge combines two schemas
const contactInfoSchema = z.object({
  phone: z.string().optional(),
  website: z.string().url().optional(),
});

const fullProfileSchema = createUserSchema.merge(contactInfoSchema);
```

---

## A Complete Product Schema Example

Realistic schemas often have nested objects, arrays, and conditional logic:

```typescript
// src/schemas/product.schema.ts
import { z } from 'zod';

const dimensionsSchema = z.object({
  length: z.number().positive(),
  width: z.number().positive(),
  height: z.number().positive(),
  unit: z.enum(['cm', 'in', 'mm']).default('cm'),
});

const variantSchema = z.object({
  sku: z.string().min(3).max(50),
  color: z.string().optional(),
  size: z.string().optional(),
  priceOverride: z.number().positive().optional(),
  stock: z.number().int().nonnegative(),
});

export const createProductSchema = z.object({
  name: z
    .string()
    .min(1, 'Product name is required')
    .max(200),

  description: z
    .string()
    .max(5000, 'Description must be under 5000 characters')
    .optional(),

  price: z
    .number()
    .positive('Price must be positive')
    .multipleOf(0.01, 'Price must have at most 2 decimal places'),

  category: z.enum([
    'electronics',
    'clothing',
    'home',
    'books',
    'sports',
  ]),

  tags: z
    .array(z.string().min(1).max(30))
    .max(10, 'Maximum 10 tags allowed')
    .default([]),

  dimensions: dimensionsSchema.optional(),

  variants: z
    .array(variantSchema)
    .min(1, 'At least one variant is required'),

  published: z.boolean().default(false),
});

export type CreateProductDTO = z.infer<typeof createProductSchema>;

// For updates
export const updateProductSchema = createProductSchema
  .partial()
  .omit({ variants: true })
  .extend({
    variants: z.array(variantSchema).min(1).optional(),
  });

export type UpdateProductDTO = z.infer<typeof updateProductSchema>;

// Query params for listing
export const productQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: z.enum([
    'electronics', 'clothing', 'home', 'books', 'sports',
  ]).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  search: z.string().max(200).optional(),
  sortBy: z.enum(['price', 'name', 'createdAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type ProductQuery = z.infer<typeof productQuerySchema>;
```

> **Coming from JS:** Notice `z.coerce.number()` for query params. Express delivers everything in `req.query` as strings. `z.coerce` parses `"42"` into `42` so your handler receives actual numbers. This replaces all those `parseInt()` calls scattered through your route handlers.

---

## Transformations

Zod can transform data during parsing:

```typescript
const createUserSchema = z.object({
  email: z
    .string()
    .email()
    .transform((val) => val.toLowerCase().trim()),

  username: z
    .string()
    .min(3)
    .max(30)
    .transform((val) => val.trim()),

  dateOfBirth: z
    .string()
    .transform((val) => new Date(val))
    .refine((date) => date < new Date(), {
      message: 'Date of birth must be in the past',
    }),

  tags: z
    .string()
    .transform((val) => val.split(',').map((t) => t.trim()))
    .pipe(z.array(z.string().min(1)).max(5)),
});
```

The `pipe` method lets you validate the transformed output with a second schema.

---

## Integrating with Typed Controllers

After validation middleware runs, your controller can trust the data:

```typescript
// src/controllers/product.controller.ts
import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import {
  CreateProductDTO,
  UpdateProductDTO,
  ProductQuery,
} from '../schemas/product.schema';

export const productController = {
  getAll: catchAsync(async (req: Request<{}, any, any, ProductQuery>, res: Response) => {
    // req.query is already validated and transformed
    // page and limit are actual numbers, not strings
    const { page, limit, category, minPrice, maxPrice, search, sortBy, order } = req.query;

    const products = await productService.findAll({
      page,
      limit,
      category,
      minPrice,
      maxPrice,
      search,
      sortBy,
      order,
    });

    res.json(products);
  }),

  create: catchAsync(async (req: Request<{}, any, CreateProductDTO>, res: Response) => {
    // req.body matches CreateProductDTO exactly
    // tags has a default of [], published defaults to false
    const product = await productService.create(req.body);

    res.status(201).json({ data: product });
  }),

  update: catchAsync(async (
    req: Request<{ id: string }, any, UpdateProductDTO>,
    res: Response
  ) => {
    const product = await productService.update(req.params.id, req.body);
    res.json({ data: product });
  }),
};
```

### Route Wiring

```typescript
// src/routes/product.routes.ts
import { Router } from 'express';
import { validate } from '../middleware/validate.middleware';
import {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
} from '../schemas/product.schema';
import { productController } from '../controllers/product.controller';

const router = Router();

router.get(
  '/',
  validate({ query: productQuerySchema }),
  productController.getAll
);

router.post(
  '/',
  validate({ body: createProductSchema }),
  productController.create
);

router.put(
  '/:id',
  validate({ body: updateProductSchema }),
  productController.update
);

export default router;
```

---

## Custom Error Formatting

You can customize how Zod errors appear in your API responses:

```typescript
// src/middleware/validate.middleware.ts (enhanced version)
import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError, ZodIssueCode } from 'zod';

function formatZodError(error: ZodError): Record<string, string> {
  const formatted: Record<string, string> = {};

  for (const issue of error.errors) {
    const path = issue.path.join('.');

    switch (issue.code) {
      case ZodIssueCode.invalid_type:
        formatted[path] = `Expected ${issue.expected}, received ${issue.received}`;
        break;
      case ZodIssueCode.too_small:
        formatted[path] = issue.message;
        break;
      case ZodIssueCode.too_big:
        formatted[path] = issue.message;
        break;
      default:
        formatted[path] = issue.message;
    }
  }

  return formatted;
}

interface ValidationSchemas {
  body?: AnyZodObject;
  params?: AnyZodObject;
  query?: AnyZodObject;
}

export function validate(schemas: ValidationSchemas) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params) as any;
      }
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query) as any;
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          fields: formatZodError(error),
        });
      }
      next(error);
    }
  };
}
```

Example error response:

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "fields": {
    "email": "Must be a valid email address",
    "password": "Password must be at least 8 characters",
    "variants": "At least one variant is required"
  }
}
```

---

## Mini-Exercise

Build a complete validation layer for an "Order" resource:

1. Define an `orderItemSchema` with `productId` (UUID string), `quantity` (positive integer), and `unitPrice` (positive number with max 2 decimal places).
2. Define a `createOrderSchema` with `items` (array of order items, at least 1), `shippingAddress` (nested object with `street`, `city`, `state`, `zip`), and `notes` (optional string, max 500 chars).
3. Create a `orderQuerySchema` for the list endpoint with `page`, `limit`, `status` (enum of `'pending' | 'shipped' | 'delivered' | 'cancelled'`), and `dateFrom`/`dateTo` (string transformed to `Date`).
4. Use `z.infer` to derive all DTOs and wire the schemas into routes using the `validate` middleware.
5. Test that posting an order with invalid items returns a clear error message with field paths like `"items.0.quantity"`.
