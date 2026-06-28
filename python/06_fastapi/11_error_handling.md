# 11 - Error Handling in FastAPI

## Overview

Error handling in FastAPI is more structured than Express. Instead of the `(err, req, res, next)` middleware pattern, FastAPI uses exceptions and exception handlers.

### Comparison

| Pattern | Express.js | FastAPI |
|---|---|---|
| Throw an error | `next(createError(404))` or `throw` | `raise HTTPException(404)` |
| Error middleware | `app.use((err, req, res, next) => {})` | `@app.exception_handler(Exception)` |
| Validation errors | Manual (zod/joi) | Automatic (Pydantic) |
| Not found | `res.status(404).json(...)` | `raise HTTPException(status_code=404)` |
| Error format | Custom (you decide) | Structured `{"detail": "..."}` |

---

## HTTPException: The Basics

### Express.js

```javascript
const createError = require('http-errors');

app.get('/users/:id', async (req, res, next) => {
  const user = await findUser(req.params.id);
  if (!user) {
    return next(createError(404, 'User not found'));
    // Or: return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
});
```

### FastAPI

```python
from fastapi import FastAPI, HTTPException

app = FastAPI()

@app.get("/users/{user_id}")
def get_user(user_id: int):
    user = find_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
```

`raise HTTPException` is like `throw new HttpException()` in NestJS or `next(createError())` in Express. FastAPI catches it and returns the appropriate HTTP response.

### HTTPException Parameters

```python
raise HTTPException(
    status_code=404,                      # HTTP status code
    detail="User not found",              # Response body (can be string, dict, or list)
    headers={"X-Error": "user-missing"},  # Optional response headers
)

# detail can be complex
raise HTTPException(
    status_code=400,
    detail={
        "code": "INVALID_INPUT",
        "message": "The provided data is invalid",
        "errors": [
            {"field": "email", "message": "Invalid email format"},
            {"field": "age", "message": "Must be positive"},
        ],
    },
)
```

### Common Error Patterns

```python
from fastapi import status

# 400 Bad Request
raise HTTPException(
    status_code=status.HTTP_400_BAD_REQUEST,
    detail="Invalid request data",
)

# 401 Unauthorized
raise HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Not authenticated",
    headers={"WWW-Authenticate": "Bearer"},
)

# 403 Forbidden
raise HTTPException(
    status_code=status.HTTP_403_FORBIDDEN,
    detail="Not enough permissions",
)

# 404 Not Found
raise HTTPException(
    status_code=status.HTTP_404_NOT_FOUND,
    detail="Resource not found",
)

# 409 Conflict
raise HTTPException(
    status_code=status.HTTP_409_CONFLICT,
    detail="Resource already exists",
)

# 422 Unprocessable Entity (usually automatic from Pydantic)
raise HTTPException(
    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
    detail="Could not process the request",
)

# 429 Too Many Requests
raise HTTPException(
    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
    detail="Rate limit exceeded",
    headers={"Retry-After": "60"},
)
```

---

## Custom Exception Classes

For larger apps, define your own exception types. This is like creating custom Error classes in Node.js.

### Node.js Pattern

```javascript
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

class NotFoundError extends AppError {
  constructor(resource, id) {
    super(`${resource} with id ${id} not found`, 404, 'NOT_FOUND');
  }
}
```

### FastAPI Pattern

```python
# exceptions.py

class AppException(Exception):
    """Base exception for the application."""
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: dict | None = None,
    ):
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details

class NotFoundException(AppException):
    def __init__(self, resource: str, resource_id: int | str):
        super().__init__(
            status_code=404,
            code="NOT_FOUND",
            message=f"{resource} with id '{resource_id}' not found",
            details={"resource": resource, "id": str(resource_id)},
        )

class DuplicateException(AppException):
    def __init__(self, resource: str, field: str, value: str):
        super().__init__(
            status_code=409,
            code="DUPLICATE",
            message=f"{resource} with {field} '{value}' already exists",
            details={"resource": resource, "field": field, "value": value},
        )

class UnauthorizedException(AppException):
    def __init__(self, message: str = "Not authenticated"):
        super().__init__(
            status_code=401,
            code="UNAUTHORIZED",
            message=message,
        )

class ForbiddenException(AppException):
    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(
            status_code=403,
            code="FORBIDDEN",
            message=message,
        )
```

---

## Custom Exception Handlers

### Express.js Error Middleware

```javascript
// Express: error middleware (must have 4 parameters)
app.use((err, req, res, next) => {
  console.error(err.stack);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message },
    });
  }

  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
  });
});
```

### FastAPI Exception Handlers

```python
# main.py
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from exceptions import AppException

app = FastAPI()

@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    """Handle all AppException subclasses."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
            }
        },
    )
```

Now you can use your custom exceptions anywhere:

```python
from exceptions import NotFoundException, DuplicateException

@app.get("/users/{user_id}")
def get_user(user_id: int):
    user = find_user(user_id)
    if not user:
        raise NotFoundException("User", user_id)
    return user

@app.post("/users")
def create_user(user: UserCreate):
    existing = find_user_by_email(user.email)
    if existing:
        raise DuplicateException("User", "email", user.email)
    return save_user(user)
```

The response for a 404 would look like:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "User with id '42' not found",
    "details": {
      "resource": "User",
      "id": "42"
    }
  }
}
```

---

## Handling Pydantic Validation Errors

FastAPI uses Pydantic for request validation. When validation fails, it raises `RequestValidationError` which returns a 422 response by default. You can customize this.

### Default Validation Error Response

```json
{
  "detail": [
    {
      "type": "string_too_short",
      "loc": ["body", "name"],
      "msg": "String should have at least 1 character",
      "input": "",
      "ctx": {"min_length": 1}
    }
  ]
}
```

### Custom Validation Error Handler

```python
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

app = FastAPI()

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
):
    """
    Customize the validation error response format.
    Maybe you want it to match your Node.js API's error format.
    """
    errors = []
    for error in exc.errors():
        field = ".".join(str(loc) for loc in error["loc"][1:])  # Skip "body"
        errors.append({
            "field": field,
            "message": error["msg"],
            "type": error["type"],
        })

    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request validation failed",
                "errors": errors,
            }
        },
    )
```

Now validation errors look like:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "errors": [
      {
        "field": "name",
        "message": "String should have at least 1 character",
        "type": "string_too_short"
      },
      {
        "field": "email",
        "message": "value is not a valid email address",
        "type": "value_error"
      }
    ]
  }
}
```

---

## Handling Starlette HTTP Exceptions

FastAPI's `HTTPException` extends Starlette's `HTTPException`. If you want to catch both:

```python
from starlette.exceptions import HTTPException as StarletteHTTPException

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": "HTTP_ERROR",
                "message": exc.detail,
            }
        },
    )
```

---

## Global Error Handler (Catch All)

### Express.js

```javascript
// Catch everything that wasn't handled
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});
```

### FastAPI

```python
import logging
import traceback

logger = logging.getLogger("api")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Catch-all for unhandled exceptions.
    Log the full traceback but return a generic message to the client.
    """
    logger.error(
        f"Unhandled exception on {request.method} {request.url.path}: "
        f"{type(exc).__name__}: {exc}\n"
        f"{traceback.format_exc()}"
    )

    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred",
            }
        },
    )
```

---

## Error Response Schema Documentation

You can document error responses in the OpenAPI spec:

```python
from pydantic import BaseModel

class ErrorResponse(BaseModel):
    error: dict

    model_config = {
        "json_schema_extra": {
            "example": {
                "error": {
                    "code": "NOT_FOUND",
                    "message": "User not found",
                    "details": None,
                }
            }
        }
    }

@app.get(
    "/users/{user_id}",
    response_model=UserResponse,
    responses={
        404: {
            "model": ErrorResponse,
            "description": "User not found",
        },
        422: {
            "model": ErrorResponse,
            "description": "Validation error",
        },
    },
)
def get_user(user_id: int):
    user = find_user(user_id)
    if not user:
        raise NotFoundException("User", user_id)
    return user
```

This adds the error response schemas to the Swagger UI documentation.

---

## Complete Error Handling System

Here's a production-ready error handling setup:

```python
# exceptions.py
class AppException(Exception):
    def __init__(self, status_code: int, code: str, message: str, details=None):
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details

class NotFound(AppException):
    def __init__(self, resource: str, identifier=None):
        msg = f"{resource} not found"
        if identifier:
            msg = f"{resource} '{identifier}' not found"
        super().__init__(404, "NOT_FOUND", msg)

class AlreadyExists(AppException):
    def __init__(self, resource: str, field: str = None):
        msg = f"{resource} already exists"
        if field:
            msg = f"{resource} with this {field} already exists"
        super().__init__(409, "ALREADY_EXISTS", msg)

class Unauthorized(AppException):
    def __init__(self, msg: str = "Authentication required"):
        super().__init__(401, "UNAUTHORIZED", msg)

class Forbidden(AppException):
    def __init__(self, msg: str = "Permission denied"):
        super().__init__(403, "FORBIDDEN", msg)

class BadRequest(AppException):
    def __init__(self, msg: str, details=None):
        super().__init__(400, "BAD_REQUEST", msg, details)
```

```python
# error_handlers.py
import logging
import traceback
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.responses import JSONResponse
from exceptions import AppException

logger = logging.getLogger("api.errors")

def register_error_handlers(app: FastAPI):
    """Register all error handlers on the FastAPI app."""

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        logger.warning(
            f"{exc.code} on {request.method} {request.url.path}: {exc.message}"
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "details": exc.details,
                },
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_handler(request: Request, exc: RequestValidationError):
        errors = []
        for error in exc.errors():
            loc = error["loc"]
            field = ".".join(str(l) for l in loc[1:]) if len(loc) > 1 else str(loc[0])
            errors.append({"field": field, "message": error["msg"]})

        return JSONResponse(
            status_code=422,
            content={
                "success": False,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Invalid request data",
                    "details": errors,
                },
            },
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": {
                    "code": "HTTP_ERROR",
                    "message": str(exc.detail),
                },
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.error(
            f"Unhandled error on {request.method} {request.url.path}: "
            f"{type(exc).__name__}: {exc}\n{traceback.format_exc()}"
        )
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "An unexpected error occurred",
                },
            },
        )
```

```python
# main.py
from fastapi import FastAPI
from error_handlers import register_error_handlers

app = FastAPI()
register_error_handlers(app)

# Now all your routes automatically get consistent error handling
@app.get("/users/{user_id}")
def get_user(user_id: int):
    user = find_user(user_id)
    if not user:
        raise NotFound("User", user_id)
    return {"success": True, "data": user}
```

---

## Practice Exercises

### Exercise 1: Custom Error System
Create a set of custom exceptions and handlers that produce this response format:

```json
{
  "status": "error",
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested user was not found",
    "timestamp": "2024-01-15T10:30:00Z",
    "path": "/users/42"
  }
}
```

Include the request path and timestamp in every error response.

### Exercise 2: Validation Error Formatting
Override the default validation error handler to produce errors that match this format (common in frontend libraries):

```json
{
  "errors": {
    "email": ["Invalid email format", "Email is required"],
    "age": ["Must be at least 13"]
  }
}
```

Group errors by field name.

### Exercise 3: Error Logging
Create error handling middleware that:
- Logs all 4xx errors at WARNING level
- Logs all 5xx errors at ERROR level with full stack trace
- Includes request ID, method, path, and client IP in log messages
- Does NOT log 2xx or 3xx responses

### Exercise 4: API Error Documentation
Create a CRUD API where every endpoint has documented error responses in the OpenAPI spec. Include example error responses for 400, 401, 403, 404, and 422 status codes.

### Exercise 5: Error Handler Testing
Write tests that verify:
- 404 errors return the correct format
- Validation errors list all invalid fields
- Unauthorized access returns 401 with `WWW-Authenticate` header
- Unhandled exceptions return 500 without leaking internal details
- Custom exceptions return the expected code, message, and details
