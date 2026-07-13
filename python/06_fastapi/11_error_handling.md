# 11 - FastAPI mein Error Handling

## Overview

Agar tu Node.js se aaya hai, to FastAPI ka error handling pattern bilkul alag hota hai. Express ka `(err, req, res, next)` middleware wala approach yahan nahi hai. FastAPI exceptions aur exception handlers use karta hai — zyada clean aur Pythonic.

### Pattern Comparison

| Pattern | Express.js | FastAPI |
|---|---|---|
| Error throw karo | `next(createError(404))` ya `throw` | `raise HTTPException(404)` |
| Error middleware | `app.use((err, req, res, next) => {})` | `@app.exception_handler(Exception)` |
| Validation errors | Manual lagta hai (zod/joi) | Automatic Pydantic kar deta hai |
| Not found handler | `res.status(404).json(...)` | `raise HTTPException(status_code=404)` |
| Error format | Tu banao apna | Structured `{"detail": "..."}` |

---

## HTTPException: Basics

### Express.js mein kaise sochta tha

```javascript
const createError = require('http-errors');

app.get('/users/:id', async (req, res, next) => {
  const user = await findUser(req.params.id);
  if (!user) {
    return next(createError(404, 'User not found'));
    // Ya: return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
});
```

### FastAPI mein ab

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

Dekho — `raise HTTPException` बिलकुल `throw new HttpException()` (NestJS) jaisa hai ya `next(createError())` (Express) jaisa. FastAPI automatically pakad ke proper HTTP response return kar deta hai.

### HTTPException ke parameters

```python
raise HTTPException(
    status_code=404,                      # HTTP status code
    detail="User not found",              # Response body (string, dict, ya list ho sakta hai)
    headers={"X-Error": "user-missing"},  # Optional headers
)

# Detail complex bhi ho sakta hai (Flipkart order cancel ka error dekh!)
raise HTTPException(
    status_code=400,
    detail={
        "code": "INVALID_INPUT",
        "message": "Provided data theek nahi hai",
        "errors": [
            {"field": "email", "message": "Email format galat hai"},
            {"field": "age", "message": "Positive number hona chahiye"},
        ],
    },
)
```

### Common error patterns

```python
from fastapi import status

# 400 Bad Request
raise HTTPException(
    status_code=status.HTTP_400_BAD_REQUEST,
    detail="Request data invalid hai",
)

# 401 Unauthorized (Zomato login nahi kiya, fir order nahi kar sakta)
raise HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Tum authenticated nahi ho",
    headers={"WWW-Authenticate": "Bearer"},
)

# 403 Forbidden (Login to kar gaya, but access denied)
raise HTTPException(
    status_code=status.HTTP_403_FORBIDDEN,
    detail="Tere paas permissions nahi hai",
)

# 404 Not Found
raise HTTPException(
    status_code=status.HTTP_404_NOT_FOUND,
    detail="Resource nahi mila",
)

# 409 Conflict (Woh item already ban gaya)
raise HTTPException(
    status_code=status.HTTP_409_CONFLICT,
    detail="Resource already exist kar raha hai",
)

# 422 Unprocessable Entity (Pydantic automatically throw karta hai)
raise HTTPException(
    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
    detail="Request process nahi kar pa rahe",
)

# 429 Too Many Requests (Rate limit — jaise IRCTC par server down)
raise HTTPException(
    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
    detail="Bohot zyada requests kar diye",
    headers={"Retry-After": "60"},
)
```

---

## Custom Exception Classes

Agar tu production-level app bana raha hai, to apne custom exception types define kar sakte ho. Node.js ke custom Error classes jaisa hi concept hai.

### Node.js pattern (tere liye familiar)

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

### FastAPI pattern (apne tareeke se)

```python
# exceptions.py

class AppException(Exception):
    """Base exception — sab custom exceptions yahan se inherit karenge."""
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
    """Jab resource nahi mila."""
    def __init__(self, resource: str, resource_id: int | str):
        super().__init__(
            status_code=404,
            code="NOT_FOUND",
            message=f"{resource} with id '{resource_id}' nahi mila",
            details={"resource": resource, "id": str(resource_id)},
        )

class DuplicateException(AppException):
    """Jab whi item already exist kar raha hai (duplicate email, username, etc.)."""
    def __init__(self, resource: str, field: str, value: str):
        super().__init__(
            status_code=409,
            code="DUPLICATE",
            message=f"{resource} with {field} '{value}' already exist kar raha hai",
            details={"resource": resource, "field": field, "value": value},
        )

class UnauthorizedException(AppException):
    """Login nahi kiya."""
    def __init__(self, message: str = "Tum authenticated nahi ho"):
        super().__init__(
            status_code=401,
            code="UNAUTHORIZED",
            message=message,
        )

class ForbiddenException(AppException):
    """Access denied — admin area dekh raha hai normal user."""
    def __init__(self, message: str = "Tere permissions theek nahi hai"):
        super().__init__(
            status_code=403,
            code="FORBIDDEN",
            message=message,
        )
```

---

## Custom Exception Handlers

### Express.js ka error middleware (purana way)

```javascript
// Express mein 4 parameters hone zaroori hote hain error middleware mein
app.use((err, req, res, next) => {
  console.error(err.stack);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message },
    });
  }

  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Kuch to gadbad ho gaya' },
  });
});
```

### FastAPI exception handlers (modern approach)

```python
# main.py
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from exceptions import AppException

app = FastAPI()

@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    """
    Sab AppException subclasses ko handle kar do.
    """
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

Ab tu apne custom exceptions kaheen bhi use kar sakta hai:

```python
from exceptions import NotFoundException, DuplicateException

@app.get("/users/{user_id}")
def get_user(user_id: int):
    user = find_user(user_id)
    if not user:
        raise NotFoundException("User", user_id)  # Boom!
    return user

@app.post("/users")
def create_user(user: UserCreate):
    existing = find_user_by_email(user.email)
    if existing:
        raise DuplicateException("User", "email", user.email)
    return save_user(user)
```

404 ka response aisa dikhega:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "User with id '42' nahi mila",
    "details": {
      "resource": "User",
      "id": "42"
    }
  }
}
```

---

## Pydantic Validation Errors Handle Karna

FastAPI apne request validation ke liye Pydantic use karta hai. Jab validation fail ho jaaye, to `RequestValidationError` throw hota hai aur 422 response return hota hai. Tu isko customize kar sakta hai.

### Default validation error response

```json
{
  "detail": [
    {
      "type": "string_too_short",
      "loc": ["body", "name"],
      "msg": "String mein at least 1 character hona chahiye",
      "input": "",
      "ctx": {"min_length": 1}
    }
  ]
}
```

### Custom validation error handler

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
    Validation error response ko apne style mein format kar do.
    Shayad tu chahta hai ki apna Node.js API jaisa format ho.
    """
    errors = []
    for error in exc.errors():
        # "body" skip kar, bas field name nikaal
        field = ".".join(str(loc) for loc in error["loc"][1:])
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
                "message": "Request validation fail ho gaya",
                "errors": errors,
            }
        },
    )
```

Ab validation errors aisa dikhenge:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation fail ho gaya",
    "errors": [
      {
        "field": "name",
        "message": "String mein at least 1 character hona chahiye",
        "type": "string_too_short"
      },
      {
        "field": "email",
        "message": "Email address valid nahi hai",
        "type": "value_error"
      }
    ]
  }
}
```

---

## Starlette HTTP Exceptions Handle Karna

FastAPI ka `HTTPException` Starlette ka `HTTPException` extend karta hai. Agar dono pakadne hain:

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

## Global Error Handler (Catch-All)

### Express.js approach

```javascript
// Jo bhi error na pakda gaya, yahan aa jaye
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});
```

### FastAPI approach

```python
import logging
import traceback

logger = logging.getLogger("api")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Sab unhandled exceptions ko pakad lo.
    Full traceback log kar do, lekin client ko generic message bhej.
    (Apne database password client ko dikha na de!)
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
                "message": "Kuch unexpected ho gaya",
            }
        },
    )
```

---

## Error Response Schema Documentation

OpenAPI spec mein error responses document kar sakta hai (Swagger UI mein dikhaega):

```python
from pydantic import BaseModel

class ErrorResponse(BaseModel):
    error: dict

    model_config = {
        "json_schema_extra": {
            "example": {
                "error": {
                    "code": "NOT_FOUND",
                    "message": "User nahi mila",
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
            "description": "User nahi mila",
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

Isse Swagger UI mein error response schemas automatically add ho jayengi. Client ko pata chale ki kya response expect karna hai.

---

## Production-Ready Error Handling System

Yeh complete setup hai jo real projects mein use hota hai:

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
        msg = f"{resource} nahi mila"
        if identifier:
            msg = f"{resource} '{identifier}' nahi mila"
        super().__init__(404, "NOT_FOUND", msg)

class AlreadyExists(AppException):
    def __init__(self, resource: str, field: str = None):
        msg = f"{resource} already exist kar raha hai"
        if field:
            msg = f"{resource} with this {field} already exist kar raha hai"
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
    """FastAPI app par sab error handlers register kar do."""

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
                    "message": "Request data invalid hai",
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
                    "message": "Kuch unexpected ho gaya",
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

# Ab sab routes ko automatically consistent error handling milega
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
Ek error system banao jo aisa response dey:

```json
{
  "status": "error",
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Woh user nahi mila",
    "timestamp": "2024-01-15T10:30:00Z",
    "path": "/users/42"
  }
}
```

Request path aur timestamp har error mein add karo.

### Exercise 2: Validation Error Formatting
Validation error handler ko customize kar ke aisa format dey:

```json
{
  "errors": {
    "email": ["Email format galat hai", "Email zaroori hai"],
    "age": ["Kam se kam 13 hona chahiye"]
  }
}
```

Errors ko field-wise group kar.

### Exercise 3: Error Logging
Error handling jo:
- Sab 4xx errors ko WARNING level par log kare
- Sab 5xx errors ko ERROR level par log kare (full stack trace ke saath)
- Request ID, method, path, aur client IP include kare
- 2xx aur 3xx responses log na kare

### Exercise 4: API Error Documentation
Ek CRUD API banao jahan har endpoint ke error responses OpenAPI spec mein documented hon. 400, 401, 403, 404, 422 ke liye example error responses add kar.

### Exercise 5: Error Handler Testing
Tests likho jo verify kare:
- 404 errors correct format mein return ho
- Validation errors sab invalid fields list kare
- Unauthorized access 401 return kare `WWW-Authenticate` header ke saath
- Unhandled exceptions 500 return kare (internal details leak na ho)
- Custom exceptions expected code, message, aur details return kare
