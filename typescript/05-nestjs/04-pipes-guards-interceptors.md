# Pipes, Guards, and Interceptors

## What You'll Learn

- The NestJS request lifecycle and execution order
- Built-in pipes: `ValidationPipe`, `ParseIntPipe`, `ParseUUIDPipe`, and others
- Creating custom pipes for transformation and validation
- Guards and the `CanActivate` interface for authorization
- Building a role-based access control guard
- Interceptors for logging, response transformation, caching, and timeouts
- Exception filters for centralized error handling
- Binding at method, controller, and global levels

---

## The Request Lifecycle

Every incoming request flows through these layers in order:

```
Incoming Request
    |
    v
Middleware          (Express-style, runs first)
    |
    v
Guards              (Authorization -- can the user proceed?)
    |
    v
Interceptors (pre)  (Before handler -- logging, transformation)
    |
    v
Pipes               (Validation and transformation of parameters)
    |
    v
Route Handler       (Your controller method)
    |
    v
Interceptors (post) (After handler -- response mapping, caching)
    |
    v
Exception Filters   (Catch errors from any of the above)
    |
    v
Response
```

> **Coming from JS:** In Express, everything is middleware. Authentication, validation, logging, error handling -- all middleware stacked in `app.use()`. NestJS breaks these concerns into distinct, typed abstractions. Each has a single responsibility and a well-defined interface.

---

## Built-in Pipes

Pipes transform or validate input before it reaches the handler.

### ParseIntPipe

```typescript
@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) {
  // id is guaranteed to be a number
  // If someone sends GET /products/abc, they get:
  // { statusCode: 400, message: "Validation failed (numeric string is expected)" }
  return this.productsService.findOne(id);
}
```

### ParseUUIDPipe

```typescript
@Get(':id')
findOne(@Param('id', ParseUUIDPipe) id: string) {
  // Rejects anything that is not a valid UUID
  return this.productsService.findOne(id);
}
```

### Custom Pipe Options

```typescript
@Get(':id')
findOne(
  @Param('id', new ParseIntPipe({
    errorHttpStatusCode: HttpStatus.NOT_ACCEPTABLE,
    exceptionFactory: (error) => {
      throw new NotAcceptableException(`"${error}" is not a valid product ID`);
    },
  }))
  id: number,
) {
  return this.productsService.findOne(id);
}
```

### DefaultValuePipe

```typescript
@Get()
findAll(
  @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
) {
  // page defaults to 1, limit defaults to 20 if not provided
  return this.productsService.findAll(page, limit);
}
```

### ValidationPipe with DTOs

```typescript
@Post()
create(@Body(new ValidationPipe({ whitelist: true })) dto: CreateProductDto) {
  return this.productsService.create(dto);
}
```

---

## Custom Pipes

### Transformation Pipe

```typescript
// pipes/parse-sort.pipe.ts
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

export interface SortParams {
  field: string;
  order: 'ASC' | 'DESC';
}

@Injectable()
export class ParseSortPipe implements PipeTransform<string, SortParams> {
  private readonly allowedFields: string[];

  constructor(allowedFields: string[]) {
    this.allowedFields = allowedFields;
  }

  transform(value: string): SortParams {
    if (!value) {
      return { field: 'createdAt', order: 'DESC' };
    }

    const isDescending = value.startsWith('-');
    const field = isDescending ? value.slice(1) : value;

    if (!this.allowedFields.includes(field)) {
      throw new BadRequestException(
        `Invalid sort field "${field}". Allowed: ${this.allowedFields.join(', ')}`,
      );
    }

    return {
      field,
      order: isDescending ? 'DESC' : 'ASC',
    };
  }
}

// Usage:
@Get()
findAll(
  @Query('sort', new ParseSortPipe(['name', 'price', 'createdAt']))
  sort: SortParams,
) {
  return this.productsService.findAll({ sort });
}
// GET /products?sort=-price  ->  { field: 'price', order: 'DESC' }
```

### Validation Pipe

```typescript
// pipes/file-validation.pipe.ts
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class FileValidationPipe implements PipeTransform {
  constructor(
    private readonly options: {
      maxSizeBytes: number;
      allowedMimeTypes: string[];
    },
  ) {}

  transform(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (file.size > this.options.maxSizeBytes) {
      const maxMB = (this.options.maxSizeBytes / 1024 / 1024).toFixed(1);
      throw new BadRequestException(`File exceeds maximum size of ${maxMB}MB`);
    }

    if (!this.options.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type "${file.mimetype}" is not allowed. Accepted: ${this.options.allowedMimeTypes.join(', ')}`,
      );
    }

    return file;
  }
}
```

---

## Guards

Guards determine whether a request should proceed. They run after middleware but before pipes and interceptors.

### Basic Auth Guard

```typescript
// guards/jwt-auth.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('No authentication token provided');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      // Attach user to request for downstream use
      request['user'] = payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    return true;
  }

  private extractToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
```

### Role-Based Guard

```typescript
// guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Read the roles metadata set by @Roles() decorator
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles are required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      return false;
    }

    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}

// decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

Usage:

```typescript
@Controller('admin/products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminProductsController {
  @Post()
  @Roles('admin', 'manager')  // Only admin and manager can create
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Delete(':id')
  @Roles('admin')  // Only admin can delete
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  @Get()
  @Roles('admin', 'manager', 'viewer')  // Broader access for reading
  findAll() {
    return this.productsService.findAll();
  }
}
```

> **Coming from JS:** This replaces the `authMiddleware` and `requireRole('admin')` patterns from Express. Guards are cleaner because they integrate with NestJS's metadata system -- the role list lives right on the handler via a decorator instead of being configured in the routing layer.

---

## Interceptors

Interceptors wrap the handler execution. They can:
- Run logic before/after the handler
- Transform the result
- Override the function entirely (caching)
- Handle errors

### Logging Interceptor

```typescript
// interceptors/logging.interceptor.ts
import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const delay = Date.now() - now;
          this.logger.log(`${method} ${url} ${response.statusCode} - ${delay}ms`);
        },
        error: (error) => {
          const delay = Date.now() - now;
          this.logger.error(`${method} ${url} ${error.status || 500} - ${delay}ms`);
        },
      }),
    );
  }
}
```

### Response Transformation Interceptor

```typescript
// interceptors/transform.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, map } from 'rxjs';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
```

### Caching Interceptor

```typescript
// interceptors/cache.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, of, tap } from 'rxjs';

@Injectable()
export class SimpleCacheInterceptor implements NestInterceptor {
  private cache = new Map<string, { data: any; expiry: number }>();

  constructor(private readonly ttlMs: number = 30000) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // Only cache GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    const key = request.url;
    const cached = this.cache.get(key);

    if (cached && cached.expiry > Date.now()) {
      return of(cached.data);
    }

    return next.handle().pipe(
      tap((data) => {
        this.cache.set(key, {
          data,
          expiry: Date.now() + this.ttlMs,
        });
      }),
    );
  }
}
```

### Timeout Interceptor

```typescript
// interceptors/timeout.interceptor.ts
import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler,
  RequestTimeoutException,
} from '@nestjs/common';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(private readonly timeoutMs: number = 10000) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      timeout(this.timeoutMs),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          return throwError(
            () => new RequestTimeoutException('Request timed out'),
          );
        }
        return throwError(() => err);
      }),
    );
  }
}
```

---

## Exception Filters

Exception filters catch errors thrown during request processing and format the response.

### Custom Exception Filter

```typescript
// filters/http-exception.filter.ts
import {
  ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const errorBody = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message:
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message,
    };

    this.logger.error(
      `${request.method} ${request.url} ${status}: ${JSON.stringify(errorBody.message)}`,
    );

    response.status(status).json(errorBody);
  }
}
```

### Catch-All Filter

```typescript
// filters/all-exceptions.filter.ts
import {
  ExceptionFilter, Catch, ArgumentsHost, HttpException,
  HttpStatus, Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()  // No argument = catches everything
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('AllExceptionsFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'string' ? res : (res as any).message;
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message:
        status === HttpStatus.INTERNAL_SERVER_ERROR
          ? 'Internal server error'  // Hide details in production
          : message,
    });
  }
}
```

### Domain-Specific Filter

```typescript
// filters/typeorm-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { Response } from 'express';

@Catch(QueryFailedError)
export class TypeOrmExceptionFilter implements ExceptionFilter {
  catch(exception: QueryFailedError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const driverError = exception.driverError as any;

    // PostgreSQL unique violation
    if (driverError.code === '23505') {
      response.status(HttpStatus.CONFLICT).json({
        statusCode: HttpStatus.CONFLICT,
        message: 'A record with this value already exists',
      });
      return;
    }

    // Foreign key violation
    if (driverError.code === '23503') {
      response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Referenced record does not exist',
      });
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Database error',
    });
  }
}
```

---

## Binding Levels

All of these can be bound at three levels:

### Method Level

```typescript
@Controller('products')
export class ProductsController {
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @UseFilters(HttpExceptionFilter)
  findOne(@Param('id') id: string) {}
}
```

### Controller Level

```typescript
@Controller('products')
@UseGuards(JwtAuthGuard)
@UseInterceptors(LoggingInterceptor)
@UseFilters(HttpExceptionFilter)
export class ProductsController {
  // All methods in this controller are protected
}
```

### Global Level

```typescript
// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global pipe
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Global filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());

  await app.listen(3000);
}
```

For global providers that need dependency injection, register them in a module instead:

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER, APP_PIPE } from '@nestjs/core';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_PIPE,
      useFactory: () =>
        new ValidationPipe({ whitelist: true, transform: true }),
    },
  ],
})
export class AppModule {}
```

---

## Mini-Exercise

1. Create a `ParseDateRangePipe` that accepts a query string like `?from=2024-01-01&to=2024-12-31` and transforms it into `{ from: Date, to: Date }`. Throw `BadRequestException` if the "from" date is after the "to" date.

2. Build a `ThrottleGuard` that limits each IP address to 100 requests per minute. Use a `Map<string, number[]>` to track timestamps. Return a `429 Too Many Requests` status when the limit is exceeded.

3. Create a `SerializerInterceptor` that accepts a DTO class and strips the response of any properties not decorated with `@Expose()` from `class-transformer`. Use it to hide sensitive fields like `password` and `internalNotes` from API responses.

4. Write an `AuditLogInterceptor` that logs the user ID, action (HTTP method), resource (URL), and response time to a database table after each request completes. It should inject an `AuditService` via the constructor.

5. Implement a `ValidationExceptionFilter` that catches `class-validator` errors and returns them in a user-friendly format like `{ field: "email", errors: ["must be a valid email"] }` instead of the default NestJS format.
