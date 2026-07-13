# Production AI Applications Mein Error Handling aur Logging

## Socho: AI Apps Ke Logs Kitne Important Kyu Hain?

Ek zyada-normal CRUD app mein agar logging gap ho jaye toh kya? Bas ek 404 miss ho jaata hai, process continue rehti hai. Lekin ek AI agent ke saath? Phir toh problem: hallucinations, $50 ka runaway loop, ya kisi ne prompt injection kar diya — aur tum kuch bhi nahi jaante! Structured, comprehensive logging sirf optional nahi hai — ye **critical** hai.

---

## 1. Python Logging vs console.log

### Pehle Problem: print() Aur console.log

Node.js mein developers typically `console.log` se shuru karte hain, phir kisi acha library mein shift karte hain. Python mein exactly same story hai — beginners `print()` use karte hain, lekin production code mein kabhi nahi karna chahiye kyunki Python ka built-in `logging` module bohot powerful hai.

```python
# GALAT -- print() ke jaisa, kuch bhi structured nahi
print(f"Processing request for user {user_id}")

# SAHI -- built-in logging module use karo
import logging

logger = logging.getLogger(__name__)  # Module ke naam se logger
logger.info("Processing request", extra={"user_id": user_id})
```

```typescript
// Node.js mein progression kaise hota hai
console.log('Processing request');           // Galat
logger.info('Processing request');           // Accha (winston/pino)
logger.info({ userId }, 'Processing request'); // Sabse accha (pino structured)
```

### Python Logging Basics

```python
import logging

# Startup ke time configure karo (usually main.py ya config module mein)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

# Phir har module mein:
logger = logging.getLogger(__name__)

logger.debug("Debugging ke liye detailed info")       # Prod mein usually nahi dikhega
logger.info("Normal operational messages")             # Default level
logger.warning("Kuch unexpected hua")                  # Degraded but working
logger.error("Kuch fail ho gaya")                      # Attention chahiye
logger.critical("System shutdown ho raha hai")         # Kisi ko uthaao!
```

### Log Level Comparison

```
Python              Node.js (pino)     Kab Use Kare?
──────────────      ──────────────     ────────────────────────────────
DEBUG               debug/trace        SQL queries, detailed diagnostics
INFO                info               Request processed, agent completed
WARNING             warn               Deprecated API, slow query warning
ERROR               error              API call failed, request broke
CRITICAL            fatal              Database down, app can't start
```

---

## 2. Structured Logging With structlog

### Kyun Structured Logging?

Plain text logs ko parse karna hard hai. Production mein tum chahte ho JSON format ke logs jo tools jaise Datadog, CloudWatch, ya Grafana Loki ko easily index aur search kar sakein.

`structlog` Python ka `pino` equivalent hai — fast, structured, aur developer-friendly.

```python
# src/core/logging.py
import logging
import sys
import structlog
from src.core.config import settings


def setup_logging() -> None:
    """
    Structured logging setup karo application ke liye.

    Development: colored, human-readable console output
    Production: JSON lines to stdout (log aggregation ke liye)
    """

    # Shared processors (har log entry par ye transformations apply ho)
    shared_processors: list[structlog.types.Processor] = [
        structlog.contextvars.merge_contextvars,    # Request-scoped context merge karo
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.UnicodeDecoder(),
    ]

    if settings.ENVIRONMENT == "production":
        # Production mein JSON output
        renderer = structlog.processors.JSONRenderer()
    else:
        # Development mein pretty console output (colors ke saath)
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

    # Saare stdlib logging ko structlog se route karo
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

    # Noisy libraries ko silence karo
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("openai").setLevel(logging.WARNING)
```

### Application Code Mein structlog Use Karo

```python
import structlog

logger = structlog.get_logger(__name__)


async def process_message(user_id: str, message: str) -> str:
    # Context bind karo jo saare subsequent logs mein dikhega
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
// Node.js mein Pino equivalent
const logger = pino({ level: 'info' });
const childLogger = logger.child({ userId: 'user_123', action: 'processMessage' });
childLogger.info({ model: 'gpt-4o', tokensUsed: 1523 }, 'LLM call completed');
```

---

## 3. Custom Exception Hierarchy

### Socho: Kyun Exception Hierarchy Zaruri Hai?

Ek structured exception hierarchy banao jo different error categories ko separate kare. AI apps mein errors bohot places se aate hain — API timeouts, rate limits, content filters, hallucinations — sab alag-alag handling chahiye.

```python
# src/core/exceptions.py
from typing import Any


class AppError(Exception):
    """Saare application errors ka base exception."""

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
    """Saare LLM-related errors ka base."""

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
    """Agent execution errors ka base."""

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
    """Agent max iterations exceed kar diya -- possible infinite loop."""

    def __init__(self, max_iterations: int, agent_name: str):
        super().__init__(
            message=f"Agent '{agent_name}' exceeded {max_iterations} iterations",
            code="AGENT_LOOP",
            details={"max_iterations": max_iterations, "agent": agent_name},
        )
```

---

## 4. FastAPI Mein Centralized Error Handling

### Soch: NestJS Exception Filters Jaisa Python Mein Bhi Hota Hai

FastAPI mein global exception handlers register kar sakte ho — bilkul NestJS ke exception filters jaisa.

```python
# src/api/middleware/error_handler.py
import structlog
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import ValidationError as PydanticValidationError

from src.core.exceptions import AppError, LLMError

logger = structlog.get_logger(__name__)


def register_error_handlers(app: FastAPI) -> None:
    """Saare global exception handlers register karo."""

    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
        """Saare custom application errors handle karo."""
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
        """Pydantic validation errors ko clean messages ke saath handle karo."""
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
        """Catch-all unexpected errors ke liye. Kabhi internals leak mat karo."""
        logger.error(
            "Unhandled exception",
            path=request.url.path,
            error_type=type(exc).__name__,
            error=str(exc),
            exc_info=True,  # Full traceback include karo logs mein
        )
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "An unexpected error occurred",
                    # Production responses mein exc details kabhi mat daal
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

## 5. LLM Operations Ke Liye Error Handling Strategy

### Socho: LLM Calls Alag Tarah Se Fail Kyun Hote Hain?

LLM calls ke failures unique hote hain — timeouts, rate limits, token overflow, content filters. Comprehensive retry/error strategy banana zaruri hai:

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
    """LLM calls ko structured error handling aur retries ke saath wrap karo."""

    def __init__(self, model_name: str = "gpt-4o", max_retries: int = 3):
        self.llm = ChatOpenAI(model=model_name, max_retries=0)  # Hum retries handle karte hain
        self.max_retries = max_retries

    async def invoke(self, prompt: str) -> str:
        last_exception: Exception | None = None

        for attempt in range(1, self.max_retries + 1):
            try:
                logger.info("LLM call attempt", attempt=attempt, model=self.llm.model_name)
                response = await self.llm.ainvoke([HumanMessage(content=prompt)])
                return response.content

            except RateLimitError as e:
                # Rate limit mila -- wait karo aur retry karo
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
                # Timeout hua -- exponential backoff ke saath retry karo
                logger.warning("LLM call timed out", attempt=attempt)
                if attempt < self.max_retries:
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
                last_exception = e

            except APIConnectionError as e:
                # Network issue -- retry karo
                logger.error("Cannot reach LLM API", attempt=attempt, error=str(e))
                if attempt < self.max_retries:
                    await asyncio.sleep(2 ** attempt)
                last_exception = e

            except APIStatusError as e:
                # Specific API errors
                if e.status_code == 400 and "context_length_exceeded" in str(e):
                    # Token limit exceed -- mat retry karo, exception throw karo
                    raise LLMTokenLimitError(
                        tokens_requested=0,  # Extract from error if available
                        max_tokens=128_000,
                    )
                if e.status_code == 400 and "content_filter" in str(e):
                    # Content filter triggered -- mat retry karo
                    raise LLMContentFilterError()

                logger.error(
                    "LLM API error",
                    status_code=e.status_code,
                    error=str(e),
                )
                raise LLMError(f"LLM API returned {e.status_code}: {e.message}")

        # Saare retries exhaust ho gaye
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
    """Web mein information search karo."""
    try:
        # ... actual search implementation
        results = await search_api.search(query)
        return format_results(results)

    except TimeoutError:
        logger.warning("Search timed out", query=query)
        return "Search timed out. Please try a more specific query."

    except Exception as e:
        logger.error("Search failed", query=query, error=str(e))
        # Tools ke liye exception throw mat karo, error message return karo
        # Isse agent decide kar sakta hai kaise handle kare
        return f"Search failed: {str(e)}. Try rephrasing the query."
```

---

## 6. Correlation IDs / Request Tracing

### Kya Hota Hai Correlation ID Ke Bina?

Production mein ek request jo 10 services se pass ho raha hai — logs mein dekho toh usse track karna hard hai. Correlation ID se har request ko ek unique ID milta hai jo saare logs mein follow hota hai.

```python
# src/api/middleware/correlation_id.py
import uuid
from contextvars import ContextVar

import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

# Context variable -- async call chain mein anywhere available
correlation_id_var: ContextVar[str] = ContextVar("correlation_id", default="")


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """
    Har request ko correlation ID assign karo.
    Node.js equivalent: cls-hooked ya AsyncLocalStorage with middleware.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        # Client ke header se ID lo ya naya generate karo
        cid = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))
        correlation_id_var.set(cid)

        # structlog context mein bind karo taaki saare logs mein include ho
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

> [!tip]
> Python ka `contextvars` module Node.js ke `AsyncLocalStorage` ke bilkul same kaam karta hai — values ko propagate karte hain async call chain mein bina explicit parameter passing ke.

---

## 7. Sentry Integration

### Sentry Dono Languages Mein Bhut Similar Hai

Python aur Node.js mein Sentry almost same tarah kaam karta hai. Bas SDK alag hota hai.

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
        # PII mat send karo
        send_default_pii=False,
        # Sensitive data ko filter karo
        before_send=_before_send,
    )


def _before_send(event, hint):
    """Sentry ko send karne se pehle sensitive data scrub karo."""
    # API keys ko breadcrumbs se remove karo
    if "breadcrumbs" in event:
        for crumb in event["breadcrumbs"].get("values", []):
            if "api_key" in str(crumb.get("data", {})).lower():
                crumb["data"] = {"redacted": True}
    return event
```

### Sentry Ko LLM Errors Ke Saath Use Karo

```python
import sentry_sdk


async def process_agent_request(user_id: str, message: str):
    with sentry_sdk.start_transaction(op="agent", name="research_agent"):
        try:
            # Context add karo jo Sentry dashboard mein dikhega
            sentry_sdk.set_user({"id": user_id})
            sentry_sdk.set_tag("agent", "research")
            sentry_sdk.set_context("llm", {
                "model": "gpt-4o",
                "message_length": len(message),
            })

            result = await agent.invoke(message)

            # LLM cost ko metric track karo
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

## 8. LLM Interactions Ko Log Karo

### Kya Log Kare, Kya Nahi?

Production mein full prompt/response log mat karo — expensive hai aur privacy issue hai. Lekin tokens, latency, aur model info zarur log karo debugging aur optimization ke liye.

```python
# src/core/llm_logging.py
import time
import structlog
from langchain_core.callbacks import AsyncCallbackHandler
from langchain_core.outputs import LLMResult

logger = structlog.get_logger("llm")


class LLMLoggingCallback(AsyncCallbackHandler):
    """
    LangChain callback jo har LLM call ko log karta hai.
    Kisi bhi LLM ya chain se attach karo automatic logging ke liye.
    """

    def __init__(self, log_prompts: bool = False):
        self.log_prompts = log_prompts  # Sirf development mein
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

## 9. Sab Ek Saath: Complete Setup

```python
# src/main.py (error handling aur logging ke saath)
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

    # Error handlers (middleware se pehle register karna zaruri hai)
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

### Exercise 1: Structured Logging Setup Karo

`structlog` configure karo taaki:
- Development mode colored console output dikhaye
- Production mode JSON lines dikhaye
- Har log entry mein `service` key ho with value `"my-ai-backend"`
- HTTP access logs mein method, path, status code, aur duration_ms include ho

Test: `ENVIRONMENT` ko "development" aur "production" ke beech switch kar ke dekho.

### Exercise 2: Exception Hierarchy Banao

Ek document processing pipeline ke liye custom exception hierarchy banao:
- `DocumentError` (base)
- `DocumentNotFoundError(document_id)`
- `DocumentTooLargeError(size_bytes, max_bytes)`
- `DocumentParsingError(document_id, format, reason)`
- `EmbeddingError(document_id, chunk_index)`

FastAPI exception handlers register karo jo:
- Appropriate HTTP status codes return kare
- Right severity level se log kare
- Response mein correlation ID include kare

### Exercise 3: LLM Error Handling

Ek wrapper function likho `safe_llm_call(prompt, max_retries=3)` jo:
- Rate limits par retry kare exponential backoff ke saath
- Timeouts par retry kare (max 2 times)
- Content filter errors par retry na kare
- Har attempt ko structlog se log kare
- Retries ke across total tokens use track kare
- Structured result return kare: `{"content": str, "tokens": int, "attempts": int}`

### Exercise 4: Correlation ID Tracing

Correlation ID middleware implement karo jo:
1. Agar `X-Correlation-ID` header nahi hai toh UUID generate kare
2. Structlog context mein bind kare
3. LangChain callbacks ko pass kare
4. Response header mein return kare

Ek test likho jo custom correlation ID ke saath request send kare aur verify kare ki ye saare log entries mein aata hai (pytest ke `caplog` fixture use karo).

### Exercise 5: Sentry + LLM Cost Tracking

Sentry integration setup karo jo:
- Saare unhandled exceptions capture kare
- Har LLM call ke liye custom breadcrumbs add kare (model, tokens, cost)
- Sentry alert rule set kare: "Notify if estimated LLM cost exceeds $10 in 1 hour"
- `api_key` ya `authorization` data ko events se scrub kare

Mock test likho jo verify kare ki Sentry expected data shape receive kare.

### Exercise 6: Apne Node.js Setup Se Compare Karo

Agar aapka koi current Node.js project hai toh compare karo:
- Kitne unstructured `console.log` calls exist karte hain? Count karo.
- Har log entry mein request/correlation ID include hota hai?
- Kya exception hierarchy structured hai ya ad-hoc errors throw ho rahe hain?
- LLM calls ko token counts aur latency ke saath log kiya ja raha hai?

Migration checklist likho apne existing Node.js codebase mein ye patterns adopt karne ke liye (bohot patterns dono languages mein kaam karte hain).
