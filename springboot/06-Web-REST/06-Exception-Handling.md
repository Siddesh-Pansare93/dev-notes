---
tags: [web-rest, exceptions, error-handling, problem-detail, rfc-7807]
aliases: [ControllerAdvice, ExceptionHandler, ProblemDetail, RFC 7807]
stage: intermediate
---

# Exception Handling

> [!info] For the Express/TS dev
> In Express, errors flow to `(err, req, res, next) => {}` middleware. In Spring, `@ControllerAdvice` is your global error middleware: it intercepts exceptions thrown anywhere in any controller, lets you map exception types to HTTP responses, and supports per-controller variants. Spring 6 also ships `ProblemDetail` — a standard JSON shape (RFC 7807) for API errors. Use it.

## Concept / How it works

Three layers, in order of preference:

1. **`@ExceptionHandler` on a controller** — local to one controller class.
2. **`@ControllerAdvice` / `@RestControllerAdvice`** — global, applies to all controllers (or a subset).
3. **`ResponseEntityExceptionHandler`** — base class with built-in handling for Spring's own exceptions; extend and override.

Spring 6+ recommends RFC 7807 **Problem Details for HTTP APIs**:

```json
{
  "type": "https://example.com/errors/not-found",
  "title": "Not Found",
  "status": 404,
  "detail": "User 42 not found",
  "instance": "/api/v1/users/42"
}
```

## Code example

### Define meaningful exceptions

```java
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String resource, Object id) {
        super("%s %s not found".formatted(resource, id));
    }
}

public class ConflictException extends RuntimeException {
    public ConflictException(String message) { super(message); }
}
```

### Global handler with `ProblemDetail`

```java
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ResourceNotFoundException.class)
    public ProblemDetail handleNotFound(ResourceNotFoundException ex,
                                        HttpServletRequest req) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(
                HttpStatus.NOT_FOUND, ex.getMessage());
        pd.setTitle("Resource not found");
        pd.setType(URI.create("https://api.example.com/errors/not-found"));
        pd.setInstance(URI.create(req.getRequestURI()));
        return pd;
    }

    @ExceptionHandler(ConflictException.class)
    public ProblemDetail handleConflict(ConflictException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(
                HttpStatus.CONFLICT, ex.getMessage());
        pd.setTitle("Conflict");
        return pd;
    }

    // Override Spring's default validation handler
    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex,
            HttpHeaders headers, HttpStatusCode status, WebRequest request) {

        List<Map<String, String>> errors = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> Map.of("field", fe.getField(),
                                  "message", Objects.toString(fe.getDefaultMessage(), "")))
                .toList();

        ProblemDetail pd = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        pd.setTitle("Validation failed");
        pd.setProperty("errors", errors);
        return ResponseEntity.badRequest().body(pd);
    }

    // DB constraint failures (e.g., unique violations)
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ProblemDetail handleDataIntegrity(DataIntegrityViolationException ex) {
        log.warn("DB integrity violation", ex);
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(
                HttpStatus.CONFLICT, "Data integrity violation");
        pd.setTitle("Conflict");
        return pd;
    }

    // Catch-all — last resort
    @ExceptionHandler(Exception.class)
    public ProblemDetail handleAny(Exception ex) {
        log.error("Unhandled exception", ex);
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "An unexpected error occurred");
        pd.setTitle("Internal Server Error");
        return pd;
    }
}
```

### Throwing from a service

```java
@Service
@Transactional
public class UserService {
    private final UserRepository repo;

    public UserResponse find(Long id) {
        return repo.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));
    }
}
```

### Auto-conversion via `@ResponseStatus`

A simpler alternative — annotate the exception itself:

```java
@ResponseStatus(HttpStatus.NOT_FOUND)
public class ResourceNotFoundException extends RuntimeException { ... }
```
Spring will return 404 automatically (with default body). Less control than `@ControllerAdvice` but useful for trivial cases.

### Enable ProblemDetail globally (Spring Boot)

`application.yml`:

```yaml
spring:
  mvc:
    problemdetails:
      enabled: true   # makes Spring's built-in handlers return ProblemDetail
```

## Express/TS comparison

```ts
// Express
class NotFoundError extends Error {
  status = 404;
  constructor(msg: string) { super(msg); }
}

// route
router.get('/users/:id', async (req, res, next) => {
  try {
    const user = await db.users.findUnique({ where: { id } });
    if (!user) throw new NotFoundError(`User ${id} not found`);
    res.json(user);
  } catch (e) { next(e); }
});

// global error middleware
app.use((err, req, res, next) => {
  const status = err.status ?? 500;
  res.status(status).json({
    type: 'about:blank',
    title: err.name,
    status,
    detail: err.message,
    instance: req.originalUrl,
  });
});
```

| Express | Spring |
| --- | --- |
| Error subclass with `status` field | Custom exception + `@ResponseStatus` or handler |
| `next(err)` propagation | Throw — Spring catches |
| `(err, req, res, next) => {}` | `@ControllerAdvice` + `@ExceptionHandler` |
| `app.use(errorHandler)` registration | `@Component`/`@ControllerAdvice` auto-registers |
| Manual JSON shape | Built-in `ProblemDetail` (RFC 7807) |

## Gotchas

> [!warning] `@Transactional` and exception types
> `@Transactional` rolls back ONLY on **unchecked** (`RuntimeException`) by default. A checked `IOException` won't roll back unless you specify `@Transactional(rollbackFor = Exception.class)`. See [[05-Transactions]].

> [!warning] Order matters
> `@ExceptionHandler` methods are matched **most-specific first**. A handler for `Exception` placed BEFORE `ResourceNotFoundException` still works because Spring checks the type hierarchy. But if you have two equally-specific handlers in different `@ControllerAdvice` classes, use `@Order`.

> [!warning] Don't swallow stack traces in 5xx responses
> Logging is fine; returning the stack trace to the client leaks info. Log internally, return a generic ProblemDetail.

> [!warning] `ResponseStatusException` is the lazy way
> ```java
> throw new ResponseStatusException(HttpStatus.NOT_FOUND, "no user");
> ```
> Works, but couples your service code to web concerns. Prefer typed exceptions + `@ControllerAdvice`.

> [!tip] Errors thrown in async / `@Async` / scheduled tasks
> Don't reach `@ControllerAdvice`. Handle them with an `AsyncUncaughtExceptionHandler`.

## Related

- [[03-Response-Handling]]
- [[05-Validation]]
- [[05-Transactions]]
- [[Logging-with-SLF4J]]
