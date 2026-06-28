# Error Handling and Logging for Production AI Backends

## The Stakes Are Higher with LLM Apps

A logging gap in a CRUD app means you miss a 404.
A logging gap in an AI agent app means you miss a hallucination, a $50 runaway loop,
or a prompt injection. Structured, comprehensive logging is not optional.

---

## 1. Python Logging vs console.log

### The Problem with console.log (and `print()`)

In Node.js, many developers start with `console.log` and switch to a logging library later.
Python's story is similar -- beginners use `print()`, but the built-in `logging` module
is so capable that you should never use `print()` in production code.

```python
# BAD -- equivalent to console.log
print(f"Processing request for user {user_id}")

# GOOD -- built-in logging module
import logging

logger = logging.getLogger(__name__)  # Logger named after the module
logger.info("Processing request", extra={"user_id": user_id})
```

```typescript
// Node.js -- the progression
console.log('Processing request');           // Bad
logger.info('Processing request');           // Better (winston/pino)
logger.info({ userId }, 'Processing request'); // Best (pino structured)
```

### Python Logging Basics

```python
import logging

# Configure once at startup (usually in main.py or a config module)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

# Then in each module:
logger = logging.getLogger(__name__)

logger.debug("Detailed info for debugging")      # Usually suppressed in prod
logger.info("Normal operational messages")        # Default level
logger.warning("Something unexpected happened")   # Degraded but not broken
logger.error("Something failed")                  # Needs attention
logger.critical("System is going down")           # Wake someone up
```

### Log Level Comparison

```
Python              Node.js (pino)     When to Use
──────────────      ──────────────     ────────────────────────────────
DEBUG               debug/trace        Detailed diagnostic info, SQL queries
INFO                info               Request processed, agent completed
WARNING             warn               Deprecated API used, slow query
ERROR               error              Request failed, API call failed
CRITICAL            fatal              Database down, can't start
```

---

## 2. Structured Logging with structlog

For production, plain text logs are hard to parse. You want structured JSON logs
that tools like Datadog, CloudWatch, or Grafana Loki can index and search.

`structlog` is the Python equivalent of `pino` in Node.js -- fast, structured, and
developer-friendly.

```python
# src/core/logging.py
import logging
import sys
import structlog
from src.core.config import settings


def setup_logging() -> None:
    """
    Configure structured logging for the application.

    Development: colored, human-readable console output
    Production: JSON lines to stdout (for log aggregation)
    """

    # Shared processors (transformations applied to every log entry)
    shared_processors: list[structlog.types.Processor] = [
        structlog.contextvars.merge_contextvars,    # Merge request-scoped context
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.UnicodeDecoder(),
    ]

    if settings.ENVIRONMENT == "production":
        # JSON output for log aggregation
        renderer = structlog.processors.JSONRenderer()
    else:
        # Pretty console output for local development
        renderer = structlog.dev.ConsoleRenderer(colors=True)

    structlog.configure(
        processors=[
            *shared_processors,
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    # Route all stdlib logging through structlog
    formatter = structlog.stdlib.ProcessorFormatter(
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            renderer,
        ],
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    root_logger.addHandler(handler)
    root_logger.setLevel(settings.LOG_LEVEL)

    # Silence noisy libraries
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("openai").setLevel(logging.WARNING)
```

### Using structlog in Application Code

```python
import structlog

logger = structlog.get_logger(__name__)


async def process_message(user_id: str, message: str) -> str:
    # Bind context that appears in all subsequent log entries
    log = logger.bind(user_id=user_id, action="process_message")

    log.info("Starting message processing", message_length=len(message))

    try:
        result = await call_llm(message)
        log.info(
            "LLM call completed",
            model=result.model,
            tokens_used=result.usage.total_tokens,
            latency_ms=result.latency_ms,
        )
        return result.content

    except RateLimitError as e:
        log.warning("Rate limited by LLM provider", retry_after=e.retry_after)
        raise

    except Exception as e:
        log.error("Message processing failed", error=str(e), exc_info=True)
        raise
```

**Production JSON output:**
```json
{
  "timestamp": "2025-01-15T10:30:45.123Z",
  "level": "info",
  "logger": "src.services.chat_service",
  "event": "LLM call completed",
  "user_id": "user_123",
  "action": "process_message",
  "model": "gpt-4o",
  "tokens_used": 1523,
  "latency_ms": 2340
}
```

```typescript
// Pino equivalent in Node.js
const logger = pino({ level: 'info' });
const childLogger = logger.child({ userId: 'user_123', action: 'processMessage' });
childLogger.info({ model: 'gpt-4o', tokensUsed: 1523 }, 'LLM call completed');
```

---

## 3. Custom Exception Hierarchy

Build a structured exception hierarchy that separates different error categories.
This is critical for AI apps where errors come from many sources.

```python
# src/core/exceptions.py
from typing import Any


class AppError(Exception):
    """Base exception for all application errors."""

    def __init__(
        self,
        message: str,
        code: str = "INTERNAL_ERROR",
        status_code: int = 500,
        details: dict[str, Any] | None = None,
    ):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)


# ── HTTP / Client Errors ────────────────────────────────
class NotFoundError(AppError):
    def __init__(self, resource: str, resource_id: str):
        super().__init__(
            message=f"{resource} '{resource_id}' not found",
            code="NOT_FOUND",
            status_code=404,
            details={"resource": resource, "id": resource_id},
        )


class ValidationError(AppError):
    def __init__(self, message: str, fields: dict[str, str] | None = None):
        super().__init__(
            message=message,
            code="VALIDATION_ERROR",
            status_code=422,
            details={"fields": fields or {}},
        )


class AuthenticationError(AppError):
    def __init__(self, message: str = "Invalid or expired token"):
        super().__init__(message=message, code="UNAUTHORIZED", status_code=401)


class ForbiddenError(AppError):
    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(message=message, code="FORBIDDEN", status_code=403)


# ── LLM / AI Errors ─────────────────────────────────────
class LLMError(AppError):
    """Base for all LLM-related errors."""

    def __init__(self, message: str, code: str = "LLM_ERROR", **kwargs):
        super().__init__(message=message, code=code, status_code=502, **kwargs)


class LLMRateLimitError(LLMError):
    def __init__(self, provider: str, retry_after: int | None = None):
        super().__init__(
            message=f"Rate limited by {provider}",
            code="LLM_RATE_LIMIT",
            details={"provider": provider, "retry_after": retry_after},
        )


class LLMTokenLimitError(LLMError):
    def __init__(self, tokens_requested: int, max_tokens: int):
        super().__init__(
            message=f"Token limit exceeded: {tokens_requested} > {max_tokens}",
            code="LLM_TOKEN_LIMIT",
            details={"requested": tokens_requested, "max": max_tokens},
        )


class LLMContentFilterError(LLMError):
    def __init__(self, reason: str = "Content filtered by safety system"):
        super().__init__(message=reason, code="LLM_CONTENT_FILTER")


# ── Agent / Tool Errors ─────────────────────────────────
class AgentError(AppError):
    """Base for agent execution errors."""

    def __init__(self, message: str, code: str = "AGENT_ERROR", **kwargs):
        super().__init__(message=message, code=code, status_code=500, **kwargs)


class ToolExecutionError(AgentError):
    def __init__(self, tool_name: str, error: str):
        super().__init__(
            message=f"Tool '{tool_name}' failed: {error}",
            code="TOOL_EXECUTION_ERROR",
            details={"tool": tool_name, "error": error},
        )


class AgentLoopError(AgentError):
    """Agent exceeded max iterations -- possible infinite loop."""

    def __init__(self, max_iterations: int, agent_name: str):
        super().__init__(
            message=f"Agent '{agent_name}' exceeded {max_iterations} iterations",
            code="AGENT_LOOP",
            details={"max_iterations": max_iterations, "agent": agent_name},
        )
```

---

## 4. Centralized Error Handling in FastAPI

FastAPI lets you register global exception handlers -- similar to NestJS exception filters.

```python
# src/api/middleware/error_handler.py
import structlog
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import ValidationError as PydanticValidationError

from src.core.exceptions import AppError, LLMError

logger = structlog.get_logger(__name__)


def register_error_handlers(app: FastAPI) -> None:
    """Register all global exception handlers."""

    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
        """Handle all custom application errors."""
        log_method = logger.warning if exc.status_code < 500 else logger.error
        log_method(
            exc.message,
            error_code=exc.code,
            status_code=exc.status_code,
            path=request.url.path,
            details=exc.details,
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "details": exc.details,
                },
            },
        )

    @app.exception_handler(PydanticValidationError)
    async def pydantic_error_handler(
        request: Request, exc: PydanticValidationError
    ) -> JSONResponse:
        """Handle Pydantic validation errors with clean messages."""
        logger.warning(
            "Validation error",
            path=request.url.path,
            errors=exc.errors(),
        )
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Request validation failed",
                    "details": {"errors": exc.errors()},
                },
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_error_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        """Catch-all for unexpected errors. Never leak internals."""
        logger.error(
            "Unhandled exception",
            path=request.url.path,
            error_type=type(exc).__name__,
            error=str(exc),
            exc_info=True,  # Include full traceback in logs
        )
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "An unexpected error occurred",
                    # Never include exc details in production responses
                },
            },
        )
```

```typescript
// NestJS equivalent: global exception filter
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    if (exception instanceof AppError) {
      response.status(exception.statusCode).json({
        error: { code: exception.code, message: exception.message },
      });
    } else {
      response.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      });
    }
  }
}
```

---

## 5. Error Handling Strategy for LLM Operations

LLM calls fail in unique ways. Here is a comprehensive retry/error strategy:

```python
# src/services/llm_service.py
import asyncio
import structlog
from openai import (
    APIConnectionError,
    APIStatusError,
    RateLimitError,
    APITimeoutError,
)
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage

from src.core.exceptions import (
    LLMRateLimitError,
    LLMTokenLimitError,
    LLMContentFilterError,
    LLMError,
)

logger = structlog.get_logger(__name__)


class LLMService:
    """Wraps LLM calls with structured error handling and retries."""

    def __init__(self, model_name: str = "gpt-4o", max_retries: int = 3):
        self.llm = ChatOpenAI(model=model_name, max_retries=0)  # We handle retries
        self.max_retries = max_retries

    async def invoke(self, prompt: str) -> str:
        last_exception: Exception | None = None

        for attempt in range(1, self.max_retries + 1):
            try:
                logger.info("LLM call attempt", attempt=attempt, model=self.llm.model_name)
                response = await self.llm.ainvoke([HumanMessage(content=prompt)])
                return response.content

            except RateLimitError as e:
                retry_after = int(e.response.headers.get("retry-after", 5))
                logger.warning(
                    "Rate limited",
                    attempt=attempt,
                    retry_after=retry_after,
                )
                if attempt < self.max_retries:
                    await asyncio.sleep(retry_after)
                last_exception = e

            except APITimeoutError as e:
                logger.warning("LLM call timed out", attempt=attempt)
                if attempt < self.max_retries:
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
                last_exception = e

            except APIConnectionError as e:
                logger.error("Cannot reach LLM API", attempt=attempt, error=str(e))
                if attempt < self.max_retries:
                    await asyncio.sleep(2 ** attempt)
                last_exception = e

            except APIStatusError as e:
                if e.status_code == 400 and "context_length_exceeded" in str(e):
                    raise LLMTokenLimitError(
                        tokens_requested=0,  # Extract from error if available
                        max_tokens=128_000,
                    )
                if e.status_code == 400 and "content_filter" in str(e):
                    raise LLMContentFilterError()

                logger.error(
                    "LLM API error",
                    status_code=e.status_code,
                    error=str(e),
                )
                raise LLMError(f"LLM API returned {e.status_code}: {e.message}")

        # All retries exhausted
        raise LLMRateLimitError(
            provider="openai",
            retry_after=60,
        )
```

### Tool Execution Error Handling

```python
# src/agents/tools/web_search.py
import structlog
from langchain_core.tools import tool

from src.core.exceptions import ToolExecutionError

logger = structlog.get_logger(__name__)


@tool
async def web_search(query: str) -> str:
    """Search the web for information."""
    try:
        # ... actual search implementation
        results = await search_api.search(query)
        return format_results(results)

    except TimeoutError:
        logger.warning("Search timed out", query=query)
        return "Search timed out. Please try a more specific query."

    except Exception as e:
        logger.error("Search failed", query=query, error=str(e))
        # For tools, return an error message rather than raising
        # This lets the agent decide how to handle it
        return f"Search failed: {str(e)}. Try rephrasing the query."
```

---

## 6. Correlation IDs / Request Tracing

Every request gets a unique ID that follows it through all log entries. Essential
for debugging in production.

```python
# src/api/middleware/correlation_id.py
import uuid
from contextvars import ContextVar

import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

# Context variable -- available anywhere in the async call chain
correlation_id_var: ContextVar[str] = ContextVar("correlation_id", default="")


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """
    Assigns a correlation ID to each request.
    Node.js equivalent: cls-hooked or AsyncLocalStorage with middleware.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        # Use client-provided ID or generate a new one
        cid = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))
        correlation_id_var.set(cid)

        # Bind to structlog context so all logs include it
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(correlation_id=cid)

        response = await call_next(request)
        response.headers["X-Correlation-ID"] = cid
        return response
```

```typescript
// Node.js equivalent using AsyncLocalStorage (Node 16+)
import { AsyncLocalStorage } from 'async_hooks';
import { v4 as uuid } from 'uuid';

const asyncLocalStorage = new AsyncLocalStorage<{ correlationId: string }>();

app.use((req, res, next) => {
  const correlationId = req.headers['x-correlation-id'] ?? uuid();
  asyncLocalStorage.run({ correlationId }, () => {
    res.setHeader('X-Correlation-ID', correlationId);
    next();
  });
});
```

Python's `contextvars` module is the equivalent of Node.js's `AsyncLocalStorage`.
Both use the async execution context to propagate values without explicit parameter passing.

---

## 7. Sentry Integration

Sentry works nearly identically in Python and Node.js. The main difference is the SDK.

```python
# src/core/sentry.py
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from sentry_sdk.integrations.logging import LoggingIntegration

from src.core.config import settings


def init_sentry() -> None:
    if not settings.SENTRY_DSN:
        return

    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        release=settings.VERSION,
        traces_sample_rate=0.1 if settings.ENVIRONMENT == "production" else 1.0,
        profiles_sample_rate=0.1,
        integrations=[
            FastApiIntegration(transaction_style="endpoint"),
            SqlalchemyIntegration(),
            LoggingIntegration(
                level=None,         # Don't capture breadcrumbs for all logs
                event_level="ERROR" # Only send ERROR+ to Sentry
            ),
        ],
        # Don't send PII
        send_default_pii=False,
        # Filter out sensitive data
        before_send=_before_send,
    )


def _before_send(event, hint):
    """Scrub sensitive data before sending to Sentry."""
    # Remove API keys from breadcrumbs
    if "breadcrumbs" in event:
        for crumb in event["breadcrumbs"].get("values", []):
            if "api_key" in str(crumb.get("data", {})).lower():
                crumb["data"] = {"redacted": True}
    return event
```

### Using Sentry with LLM Errors

```python
import sentry_sdk


async def process_agent_request(user_id: str, message: str):
    with sentry_sdk.start_transaction(op="agent", name="research_agent"):
        try:
            # Add context that will appear in Sentry dashboard
            sentry_sdk.set_user({"id": user_id})
            sentry_sdk.set_tag("agent", "research")
            sentry_sdk.set_context("llm", {
                "model": "gpt-4o",
                "message_length": len(message),
            })

            result = await agent.invoke(message)

            # Track LLM cost as a metric
            sentry_sdk.set_measurement("tokens_used", result.tokens_used)
            sentry_sdk.set_measurement("llm_cost_usd", result.estimated_cost)

            return result

        except LLMRateLimitError:
            sentry_sdk.set_tag("error_type", "rate_limit")
            raise

        except AgentLoopError as e:
            sentry_sdk.capture_message(
                f"Agent loop detected: {e.message}",
                level="warning",
            )
            raise
```

---

## 8. Logging LLM Interactions

For AI applications, you need to log LLM calls with enough detail to debug
and optimize, without logging the full prompt/response in production (cost and privacy).

```python
# src/core/llm_logging.py
import time
import structlog
from langchain_core.callbacks import AsyncCallbackHandler
from langchain_core.outputs import LLMResult

logger = structlog.get_logger("llm")


class LLMLoggingCallback(AsyncCallbackHandler):
    """
    LangChain callback that logs every LLM call.
    Attach to any LLM or chain for automatic logging.
    """

    def __init__(self, log_prompts: bool = False):
        self.log_prompts = log_prompts  # Only in development
        self._start_time: float = 0

    async def on_llm_start(self, serialized, prompts, **kwargs):
        self._start_time = time.monotonic()
        log_data = {
            "model": serialized.get("kwargs", {}).get("model_name", "unknown"),
            "num_prompts": len(prompts),
        }
        if self.log_prompts:
            log_data["prompts"] = prompts
        logger.info("LLM call started", **log_data)

    async def on_llm_end(self, response: LLMResult, **kwargs):
        elapsed = time.monotonic() - self._start_time
        usage = response.llm_output or {}
        token_usage = usage.get("token_usage", {})
        logger.info(
            "LLM call completed",
            latency_ms=round(elapsed * 1000),
            prompt_tokens=token_usage.get("prompt_tokens", 0),
            completion_tokens=token_usage.get("completion_tokens", 0),
            total_tokens=token_usage.get("total_tokens", 0),
        )

    async def on_llm_error(self, error: Exception, **kwargs):
        elapsed = time.monotonic() - self._start_time
        logger.error(
            "LLM call failed",
            latency_ms=round(elapsed * 1000),
            error_type=type(error).__name__,
            error=str(error),
        )
```

---

## 9. Putting It All Together

```python
# src/main.py (updated with error handling and logging)
from contextlib import asynccontextmanager
from fastapi import FastAPI

from src.core.config import settings
from src.core.logging import setup_logging
from src.core.sentry import init_sentry
from src.api.middleware.error_handler import register_error_handlers
from src.api.middleware.correlation_id import CorrelationIdMiddleware
from src.api.v1.router import api_v1_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    init_sentry()
    yield


def create_app() -> FastAPI:
    app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)

    # Error handlers (must be registered before middleware)
    register_error_handlers(app)

    # Middleware
    app.add_middleware(CorrelationIdMiddleware)

    # Routes
    app.include_router(api_v1_router, prefix="/api/v1")

    return app


app = create_app()
```

---

## 10. Practice Exercises

### Exercise 1: Set Up Structured Logging
Configure `structlog` so that:
- Development mode shows colored console output
- Production mode outputs JSON lines
- All log entries include a `service` key with value `"my-ai-backend"`
- HTTP access logs include method, path, status code, and duration_ms

Test by switching `ENVIRONMENT` between "development" and "production".

### Exercise 2: Build an Exception Hierarchy
Create a custom exception hierarchy for a document processing pipeline:
- `DocumentError` (base)
- `DocumentNotFoundError(document_id)`
- `DocumentTooLargeError(size_bytes, max_bytes)`
- `DocumentParsingError(document_id, format, reason)`
- `EmbeddingError(document_id, chunk_index)`

Register FastAPI exception handlers that:
- Return appropriate HTTP status codes
- Log with the right severity level
- Include correlation ID in the response

### Exercise 3: LLM Error Handling
Write a wrapper function `safe_llm_call(prompt, max_retries=3)` that:
- Retries on rate limits with exponential backoff
- Retries on timeouts (max 2 times)
- Does NOT retry on content filter errors
- Logs every attempt with structlog
- Tracks total tokens used across retries
- Returns a structured result: `{"content": str, "tokens": int, "attempts": int}`

### Exercise 4: Correlation ID Tracing
Implement correlation ID middleware that:
1. Generates a UUID if no `X-Correlation-ID` header is present
2. Binds it to structlog context
3. Passes it to LangChain callbacks
4. Returns it in the response header

Write a test that sends a request with a custom correlation ID and verifies
it appears in all log entries (capture logs using pytest's `caplog` fixture).

### Exercise 5: Sentry + LLM Cost Tracking
Set up Sentry integration that:
- Captures all unhandled exceptions
- Adds custom breadcrumbs for each LLM call (model, tokens, cost)
- Sets a Sentry alert rule: "Notify if estimated LLM cost exceeds $10 in 1 hour"
- Scrubs any `api_key` or `authorization` data from events

Write a mock test that verifies Sentry receives the expected data shape.

### Exercise 6: Compare with Your Node.js Setup
If you have a current Node.js project, compare:
- How many unstructured `console.log` calls exist? Count them.
- Does every log entry include a request/correlation ID?
- Is there a consistent error hierarchy, or are errors thrown ad-hoc?
- Are LLM calls logged with token counts and latency?

Write a migration checklist for adopting the patterns from this guide in your
existing Node.js codebase (many of these patterns work in both languages).
