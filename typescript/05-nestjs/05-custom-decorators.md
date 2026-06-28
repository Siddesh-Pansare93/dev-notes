# Custom Decorators

## What You'll Learn

- Creating parameter decorators with `createParamDecorator`
- Building a `@CurrentUser()` decorator to extract the authenticated user
- Combining multiple decorators with `applyDecorators`
- Attaching metadata with `SetMetadata` and reading it with `Reflector`
- Class decorators and method decorators
- Building a production-grade `@Auth()` decorator
- Practical real-world decorator patterns

---

## Why Custom Decorators?

NestJS is built on decorators. When the built-in ones do not cover your use case, you create your own. Custom decorators reduce boilerplate, enforce conventions, and make controllers cleaner.

> **Coming from JS:** In Express, reusable behavior lives in middleware functions like `requireAuth(roles)` or helper functions like `getCurrentUser(req)`. NestJS decorators serve the same purpose but are declarative and composable. Instead of calling a function inside every handler, you annotate the handler once.

---

## Parameter Decorators with createParamDecorator

`createParamDecorator` creates a decorator that extracts data from the request and injects it as a method parameter.

### @CurrentUser Decorator

The most common custom parameter decorator:

```typescript
// decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // If a specific property is requested, return just that
    // @CurrentUser('email') -> returns user.email
    return data ? user?.[data] : user;
  },
);
```

Usage in a controller:

```typescript
@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  // Get the entire user object
  @Get()
  getProfile(@CurrentUser() user: UserPayload) {
    return user;
  }

  // Get just a specific field
  @Get('email')
  getEmail(@CurrentUser('email') email: string) {
    return { email };
  }

  @Put()
  updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profileService.update(userId, dto);
  }
}
```

### @ClientIp Decorator

```typescript
// decorators/client-ip.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const ClientIp = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return (
      request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      request.ip ||
      request.connection.remoteAddress
    );
  },
);

// Usage:
@Post('login')
login(@Body() dto: LoginDto, @ClientIp() ip: string) {
  return this.authService.login(dto, ip);
}
```

### @Cookies Decorator

```typescript
// decorators/cookies.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const Cookies = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return data ? request.cookies?.[data] : request.cookies;
  },
);

// Usage:
@Get('preferences')
getPreferences(@Cookies('theme') theme: string) {
  return { theme: theme || 'light' };
}
```

### @Pagination Decorator

```typescript
// decorators/pagination.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export const Pagination = createParamDecorator(
  (defaults: { maxLimit?: number } | undefined, ctx: ExecutionContext): PaginationParams => {
    const request = ctx.switchToHttp().getRequest();
    const maxLimit = defaults?.maxLimit || 100;

    const page = Math.max(1, parseInt(request.query.page, 10) || 1);
    const limit = Math.min(
      maxLimit,
      Math.max(1, parseInt(request.query.limit, 10) || 20),
    );
    const offset = (page - 1) * limit;

    return { page, limit, offset };
  },
);

// Usage:
@Get()
findAll(@Pagination({ maxLimit: 50 }) pagination: PaginationParams) {
  return this.productsService.findAll(pagination);
}
```

---

## Using Pipes with Custom Decorators

You can apply pipes directly to custom parameter decorators:

```typescript
@Get(':id')
findOne(
  @CurrentUser(new ValidationPipe({ validateCustomDecorators: true }))
  user: UserPayload,
) {
  // user is validated
}
```

Or build the pipe into the decorator:

```typescript
// decorators/parsed-query.decorator.ts
import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';

export const ParsedDateRange = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const { from, to } = request.query;

    if (!from || !to) {
      throw new BadRequestException('Both "from" and "to" query parameters are required');
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      throw new BadRequestException('Invalid date format. Use ISO 8601 (YYYY-MM-DD)');
    }

    if (fromDate > toDate) {
      throw new BadRequestException('"from" must be before "to"');
    }

    return { from: fromDate, to: toDate };
  },
);

// Usage:
@Get('reports/sales')
getSalesReport(@ParsedDateRange() range: { from: Date; to: Date }) {
  return this.reportsService.getSales(range.from, range.to);
}
```

---

## SetMetadata and Reflector

`SetMetadata` attaches arbitrary key-value data to a handler or class. `Reflector` reads it back in guards, interceptors, or filters.

### Defining Metadata Decorators

```typescript
// decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

// decorators/public.decorator.ts
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// decorators/throttle.decorator.ts
export const THROTTLE_KEY = 'throttle';
export interface ThrottleOptions {
  limit: number;
  ttlSeconds: number;
}
export const Throttle = (limit: number, ttlSeconds: number) =>
  SetMetadata(THROTTLE_KEY, { limit, ttlSeconds });
```

### Reading Metadata with Reflector

```typescript
// guards/jwt-auth.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if the route is marked @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) {
      return true;  // Skip authentication
    }

    // ... perform JWT validation
    return this.validateToken(context);
  }

  private validateToken(context: ExecutionContext): boolean {
    // JWT verification logic
    return true;
  }
}
```

Reflector has three methods for reading metadata:

```typescript
// Gets metadata from the handler, falls back to class
reflector.getAllAndOverride<string[]>(ROLES_KEY, [
  context.getHandler(),
  context.getClass(),
]);

// Merges metadata from both handler and class into one array
reflector.getAllAndMerge<string[]>(ROLES_KEY, [
  context.getHandler(),
  context.getClass(),
]);

// Gets metadata from one specific target
reflector.get<string[]>(ROLES_KEY, context.getHandler());
```

> **Coming from JS:** `SetMetadata` and `Reflector` replace the pattern of attaching properties to the route object or using naming conventions. Instead of `route.meta = { roles: ['admin'] }`, the metadata is co-located with the handler via a decorator and read type-safely by guards.

---

## Combining Decorators with applyDecorators

When you find yourself stacking the same decorators repeatedly, combine them:

```typescript
// decorators/auth.decorator.ts
import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { ROLES_KEY } from './roles.decorator';

export function Auth(...roles: string[]) {
  return applyDecorators(
    SetMetadata(ROLES_KEY, roles),
    UseGuards(JwtAuthGuard, RolesGuard),
  );
}
```

Before:

```typescript
@Controller('admin')
export class AdminController {
  @Post('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  createUser(@Body() dto: CreateUserDto) {}

  @Delete('users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  deleteUser(@Param('id') id: string) {}

  @Get('dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  getDashboard() {}
}
```

After:

```typescript
@Controller('admin')
export class AdminController {
  @Post('users')
  @Auth('admin')
  createUser(@Body() dto: CreateUserDto) {}

  @Delete('users/:id')
  @Auth('admin')
  deleteUser(@Param('id') id: string) {}

  @Get('dashboard')
  @Auth('admin', 'manager')
  getDashboard() {}
}
```

### More Complex Combinations

```typescript
// decorators/api-endpoint.decorator.ts
import { applyDecorators, HttpCode, HttpStatus, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TransformInterceptor } from '../interceptors/transform.interceptor';
import { LoggingInterceptor } from '../interceptors/logging.interceptor';

export function ApiEndpoint(options: {
  summary: string;
  status?: number;
  type?: any;
}) {
  return applyDecorators(
    HttpCode(options.status || HttpStatus.OK),
    UseInterceptors(LoggingInterceptor, TransformInterceptor),
    ApiOperation({ summary: options.summary }),
    ApiResponse({
      status: options.status || HttpStatus.OK,
      type: options.type,
    }),
  );
}

// Usage:
@Post()
@ApiEndpoint({ summary: 'Create a product', status: 201, type: Product })
@Auth('admin')
create(@Body() dto: CreateProductDto) {
  return this.productsService.create(dto);
}
```

---

## Class and Method Decorators

### Class Decorator: @Cacheable

```typescript
// decorators/cacheable.decorator.ts
import { UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';

export function Cacheable(ttlSeconds: number = 60) {
  return applyDecorators(
    UseInterceptors(CacheInterceptor),
    CacheTTL(ttlSeconds),
  );
}

// Usage on a class:
@Controller('products')
@Cacheable(300)  // Cache all GET responses for 5 minutes
export class ProductsController {}

// Usage on a method:
@Get('featured')
@Cacheable(600)  // Cache featured products for 10 minutes
getFeatured() {}
```

### Method Decorator: @LogExecution

```typescript
// decorators/log-execution.decorator.ts

export function LogExecution(context?: string): MethodDecorator {
  return (
    target: Object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    const originalMethod = descriptor.value;
    const methodName = String(propertyKey);

    descriptor.value = async function (...args: any[]) {
      const label = context || `${target.constructor.name}.${methodName}`;
      const start = Date.now();

      try {
        const result = await originalMethod.apply(this, args);
        console.log(`[${label}] completed in ${Date.now() - start}ms`);
        return result;
      } catch (error) {
        console.error(`[${label}] failed after ${Date.now() - start}ms:`, error.message);
        throw error;
      }
    };

    return descriptor;
  };
}

// Usage:
@Injectable()
export class PaymentService {
  @LogExecution()
  async processPayment(orderId: string, amount: number) {
    // [PaymentService.processPayment] completed in 234ms
  }

  @LogExecution('StripeCharge')
  async chargeCard(token: string, amount: number) {
    // [StripeCharge] completed in 892ms
  }
}
```

### Method Decorator: @Retry

```typescript
// decorators/retry.decorator.ts

export function Retry(
  maxAttempts: number = 3,
  delayMs: number = 1000,
): MethodDecorator {
  return (
    target: Object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      let lastError: Error;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          lastError = error;
          if (attempt < maxAttempts) {
            const backoff = delayMs * Math.pow(2, attempt - 1);
            await new Promise((resolve) => setTimeout(resolve, backoff));
          }
        }
      }

      throw lastError!;
    };

    return descriptor;
  };
}

// Usage:
@Injectable()
export class ExternalApiService {
  @Retry(3, 500)  // Retry up to 3 times with exponential backoff
  async fetchExchangeRates(): Promise<ExchangeRates> {
    const response = await fetch('https://api.exchangerate.example.com/latest');
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    return response.json();
  }
}
```

---

## Building a Production @Auth Decorator

Bringing it all together -- a decorator that handles authentication, authorization, and Swagger docs:

```typescript
// decorators/auth.decorator.ts
import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';

export const ROLES_KEY = 'roles';

export function Auth(...roles: string[]) {
  const decorators = [
    UseGuards(JwtAuthGuard),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
  ];

  if (roles.length > 0) {
    decorators.push(
      SetMetadata(ROLES_KEY, roles),
      UseGuards(JwtAuthGuard, RolesGuard),
      ApiForbiddenResponse({ description: 'Insufficient permissions' }),
    );
  }

  return applyDecorators(...decorators);
}
```

```typescript
// The guard that reads the metadata:
// guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/auth.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('No user context found');
    }

    const hasRole = requiredRoles.some((role) => user.roles?.includes(role));

    if (!hasRole) {
      throw new ForbiddenException(
        `Requires one of: ${requiredRoles.join(', ')}. You have: ${user.roles?.join(', ') || 'none'}`,
      );
    }

    return true;
  }
}
```

Usage across a full controller:

```typescript
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @Auth()  // Any authenticated user
  findAll(@CurrentUser('id') userId: string) {
    return this.ordersService.findByUser(userId);
  }

  @Post()
  @Auth()  // Any authenticated user
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.create(userId, dto);
  }

  @Get('all')
  @Auth('admin', 'manager')  // Only admin and manager
  findAllOrders(@Pagination() pagination: PaginationParams) {
    return this.ordersService.findAll(pagination);
  }

  @Delete(':id')
  @Auth('admin')  // Only admin
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.cancel(id);
  }
}
```

---

## Metadata-Driven Feature Flags

A more advanced example using metadata to control feature access:

```typescript
// decorators/feature-flag.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const FEATURE_KEY = 'feature';
export const RequireFeature = (flag: string) =>
  SetMetadata(FEATURE_KEY, flag);

// guards/feature-flag.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FEATURE_KEY } from '../decorators/feature-flag.decorator';
import { FeatureFlagService } from '../services/feature-flag.service';

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly featureFlags: FeatureFlagService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeature = this.reflector.getAllAndOverride<string>(
      FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredFeature) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const isEnabled = await this.featureFlags.isEnabled(
      requiredFeature,
      request.user?.id,
    );

    if (!isEnabled) {
      throw new ForbiddenException(
        `Feature "${requiredFeature}" is not available`,
      );
    }

    return true;
  }
}

// Usage:
@Controller('products')
@UseGuards(FeatureFlagGuard)
export class ProductsController {
  @Post('ai-description')
  @RequireFeature('ai-product-descriptions')
  generateDescription(@Body() dto: GenerateDescriptionDto) {
    return this.aiService.generateDescription(dto);
  }

  @Get('recommendations')
  @RequireFeature('product-recommendations')
  getRecommendations(@CurrentUser('id') userId: string) {
    return this.recommendationService.getForUser(userId);
  }
}
```

---

## Summary Table

| Pattern                 | Tool                    | Use Case                                    |
|-------------------------|-------------------------|---------------------------------------------|
| Extract request data    | `createParamDecorator`  | `@CurrentUser()`, `@ClientIp()`, `@Pagination()` |
| Attach metadata         | `SetMetadata`           | `@Roles()`, `@Public()`, `@RequireFeature()`     |
| Read metadata           | `Reflector`             | Guards and interceptors reading decorator data    |
| Combine decorators      | `applyDecorators`       | `@Auth()`, `@ApiEndpoint()`                       |
| Wrap method behavior    | `MethodDecorator`       | `@LogExecution()`, `@Retry()`                     |

---

## Mini-Exercise

1. Create a `@CurrentTenant()` parameter decorator that reads the tenant ID from the `x-tenant-id` header. If the header is missing, throw an `UnauthorizedException`.

2. Build a `@RateLimit(maxRequests, windowSeconds)` decorator that uses `SetMetadata` to attach rate limit configuration. Then create a `RateLimitGuard` that reads this metadata with `Reflector` and enforces the limit per IP address.

3. Create an `@ApiPaginated(dtoClass)` decorator that combines `@UseInterceptors(TransformInterceptor)`, `@ApiQuery({ name: 'page' })`, `@ApiQuery({ name: 'limit' })`, and `@ApiResponse({ type: PaginatedResponse })` using `applyDecorators`.

4. Build a `@Timeout(ms)` method decorator (not an interceptor) that wraps the original method in a `Promise.race` with a timeout. If the method takes longer than `ms` milliseconds, reject with a `RequestTimeoutException`.

5. Create a `@Permissions('products:read', 'products:write')` decorator system. Define metadata with `SetMetadata`, create a `PermissionsGuard` that checks the user's permissions array against required permissions, and combine everything into a single `@RequirePermissions()` decorator using `applyDecorators`.
