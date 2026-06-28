# Project Architecture for FastAPI + LangGraph Production Apps

## Why Architecture Matters Even More in AI Applications

In a typical Node.js/Express or NestJS backend, poor architecture leads to tech debt.
In an AI-agent backend, poor architecture leads to tech debt **plus** uncontrolled LLM costs,
untraceable agent behavior, and debugging nightmares. Getting the structure right from day one
pays dividends fast.

---

## 1. Recommended Project Layout

```
my_ai_backend/
├── src/
│   ├── __init__.py
│   ├── main.py                  # FastAPI app factory
│   ├── api/
│   │   ├── __init__.py
│   │   ├── deps.py              # Shared dependencies (get_db, get_current_user)
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── router.py        # Aggregates all v1 routers
│   │   │   ├── chat.py          # /v1/chat endpoints
│   │   │   ├── agents.py        # /v1/agents endpoints
│   │   │   └── documents.py     # /v1/documents endpoints
│   │   └── middleware/
│   │       ├── __init__.py
│   │       ├── auth.py
│   │       ├── rate_limit.py
│   │       └── correlation_id.py
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── research_agent.py    # LangGraph agent definition
│   │   ├── coding_agent.py
│   │   ├── nodes/               # Reusable graph nodes
│   │   │   ├── __init__.py
│   │   │   ├── llm_call.py
│   │   │   ├── tool_executor.py
│   │   │   └── human_review.py
│   │   ├── tools/               # Agent tools
│   │   │   ├── __init__.py
│   │   │   ├── web_search.py
│   │   │   ├── code_executor.py
│   │   │   └── database_query.py
│   │   └── state.py             # Shared agent state definitions
│   ├── chains/
│   │   ├── __init__.py
│   │   ├── summarize.py         # Simple LangChain chains
│   │   ├── classify.py
│   │   └── extract.py
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py            # Pydantic BaseSettings
│   │   ├── security.py          # JWT, API key validation
│   │   ├── exceptions.py        # Custom exception hierarchy
│   │   └── logging.py           # Logging configuration
│   ├── models/
│   │   ├── __init__.py
│   │   ├── schemas/             # Pydantic request/response models
│   │   │   ├── __init__.py
│   │   │   ├── chat.py
│   │   │   ├── agent.py
│   │   │   └── common.py
│   │   └── domain/              # Internal domain models
│   │       ├── __init__.py
│   │       └── conversation.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── chat_service.py      # Orchestrates agents/chains
│   │   ├── document_service.py
│   │   └── embedding_service.py
│   └── db/
│       ├── __init__.py
│       ├── session.py           # SQLAlchemy async session
│       ├── base.py              # Declarative base
│       ├── models/              # ORM models
│       │   ├── __init__.py
│       │   ├── user.py
│       │   └── conversation.py
│       ├── repositories/        # Data access layer
│       │   ├── __init__.py
│       │   ├── base.py
│       │   └── conversation_repo.py
│       └── migrations/          # Alembic migrations
│           ├── env.py
│           └── versions/
├── tests/
│   ├── __init__.py
│   ├── conftest.py              # Shared fixtures
│   ├── unit/
│   │   ├── test_services.py
│   │   └── test_chains.py
│   ├── integration/
│   │   ├── test_agents.py
│   │   └── test_api.py
│   └── e2e/
│       └── test_chat_flow.py
├── scripts/
│   ├── seed_db.py
│   └── run_eval.py              # LLM evaluation scripts
├── pyproject.toml
├── Dockerfile
├── docker-compose.yml
├── .env
├── .env.example
└── .github/
    └── workflows/
        └── ci.yml
```

```mermaid
flowchart TB
    subgraph API["API Layer — src/api/"]
        Routes["v1/chat.py\nv1/agents.py\nv1/documents.py"]
        MW["middleware/\nauth · rate_limit · correlation_id"]
    end

    subgraph SVC["Service Layer — src/services/"]
        CS["chat_service.py\nOrchestrates agents & chains"]
        DS["document_service.py"]
        ES["embedding_service.py"]
    end

    subgraph AI["AI Layer — src/agents/ & src/chains/"]
        Agents["research_agent.py\ncoding_agent.py\n(LangGraph graphs)"]
        Chains["summarize.py\nclassify.py\nextract.py\n(LangChain chains)"]
        Nodes["nodes/\nllm_call · tool_executor"]
        Tools["tools/\nweb_search · code_executor"]
    end

    subgraph Core["Core — src/core/"]
        Cfg["config.py\n(Pydantic Settings)"]
        Sec["security.py\n(JWT, API keys)"]
        Exc["exceptions.py"]
    end

    subgraph DB["Data Layer — src/db/"]
        Session["session.py\n(SQLAlchemy async)"]
        Repos["repositories/\nbase · conversation_repo"]
        ORM["models/\nuser · conversation"]
    end

    Client(["HTTP Client / WebSocket"]) --> API
    API --> SVC
    SVC --> AI
    SVC --> DB
    AI --> DB
    API --> Core
    SVC --> Core

    style API fill:#2563eb,color:#fff
    style SVC fill:#7c3aed,color:#fff
    style AI fill:#059669,color:#fff
    style Core fill:#374151,color:#fff
    style DB fill:#f59e0b,color:#000
```

### Node.js/NestJS Comparison

```
NestJS                              Python (FastAPI + LangGraph)
──────────────────────────          ──────────────────────────────
src/modules/chat/                   src/api/v1/chat.py          (route)
  chat.controller.ts                src/services/chat_service.py (logic)
  chat.service.ts                   src/agents/research_agent.py (agent)
  chat.module.ts                    No module file needed
  dto/create-chat.dto.ts            src/models/schemas/chat.py

app.module.ts                       src/main.py (app factory)
config/configuration.ts             src/core/config.py
```

Key difference: NestJS enforces a module-based architecture with decorators.
FastAPI is more flexible -- you organize by convention, not by framework enforcement.
This is both a strength (less boilerplate) and a risk (easier to create a mess).

---

## 2. The App Factory Pattern

In Node.js you might export an Express app from `app.ts`. In FastAPI, the app factory
pattern lets you configure the app differently for tests vs production.

```python
# src/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.v1.router import api_v1_router
from src.api.middleware.correlation_id import CorrelationIdMiddleware
from src.core.config import settings
from src.core.logging import setup_logging
from src.db.session import engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown logic -- like NestJS onModuleInit / onModuleDestroy."""
    setup_logging()
    # Startup: initialize connections, warm caches, etc.
    yield
    # Shutdown: close connections, flush buffers
    await engine.dispose()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
        lifespan=lifespan,
    )

    # Middleware (applied in reverse order -- outermost first)
    app.add_middleware(CorrelationIdMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routes
    app.include_router(api_v1_router, prefix="/api/v1")

    return app


app = create_app()
```

```typescript
// Node.js equivalent: app.ts
import express from 'express';
import cors from 'cors';
import { config } from './config';
import { chatRouter } from './routes/chat';

export function createApp() {
  const app = express();
  app.use(cors({ origin: config.corsOrigins }));
  app.use('/api/v1/chat', chatRouter);
  return app;
}
```

---

## 3. Configuration Management with Pydantic BaseSettings

This is one of the biggest quality-of-life upgrades over Node.js config management.
Pydantic BaseSettings gives you validated, typed configuration with automatic `.env`
file loading -- no `dotenv` + manual parsing needed.

```python
# src/core/config.py
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings. Values are loaded from environment variables,
    then .env file, with field defaults as fallback.

    Node.js equivalent: config/index.ts with dotenv + zod validation.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,          # DATABASE_URL and database_url both work
        extra="ignore",                # Ignore unknown env vars
    )

    # ── App ──────────────────────────────────────────────
    PROJECT_NAME: str = "My AI Backend"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = Field(default="development", pattern="^(development|staging|production)$")
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"

    # ── Server ───────────────────────────────────────────
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    # ── Database ─────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://user:pass@localhost:5432/mydb"
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 10

    # ── Redis ────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── LLM ──────────────────────────────────────────────
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"
    OPENAI_MAX_RETRIES: int = 3
    OPENAI_TIMEOUT: int = 30
    LLM_CACHE_TTL: int = 3600  # seconds

    # ── Observability ────────────────────────────────────
    SENTRY_DSN: str = ""
    LANGSMITH_API_KEY: str = ""
    LANGSMITH_PROJECT: str = "my-ai-backend"

    # ── Custom validators ────────────────────────────────
    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: str | list[str]) -> list[str]:
        """Accept both comma-separated string and list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v


# Singleton -- import this everywhere
settings = Settings()
```

```typescript
// Node.js equivalent using zod + dotenv
import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

const configSchema = z.object({
  PROJECT_NAME: z.string().default('My AI Backend'),
  ENVIRONMENT: z.enum(['development', 'staging', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  OPENAI_API_KEY: z.string(),
  CORS_ORIGINS: z.string().transform(s => s.split(',')),
  PORT: z.coerce.number().default(8000),
});

export const config = configSchema.parse(process.env);
```

The Pydantic version is more powerful because:
- It supports nested settings, complex types, and custom validators out of the box
- Settings are a proper class with IDE autocomplete
- The `.env` file loading is built in (no separate `dotenv` import)
- You get clear error messages on startup if config is wrong

---

## 4. Dependency Injection

FastAPI has built-in dependency injection that feels different from NestJS's decorator-based
DI but achieves the same goals: testability, separation of concerns, and lifecycle management.

### FastAPI Depends vs NestJS @Injectable

```python
# src/api/deps.py
from typing import Annotated, AsyncGenerator
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.db.session import async_session_factory
from src.services.chat_service import ChatService
from src.agents.research_agent import ResearchAgent


# ── Database session ─────────────────────────────────────
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Yields a database session per request, commits on success,
    rolls back on error. Like a NestJS interceptor for transactions.
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


# Type alias for cleaner signatures (Python 3.11+)
DbSession = Annotated[AsyncSession, Depends(get_db)]


# ── Authentication ───────────────────────────────────────
async def get_current_user(
    authorization: str = Header(..., alias="Authorization"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Validate JWT token. Dependencies can depend on other dependencies --
    FastAPI resolves the whole chain automatically, like NestJS's DI container.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    token = authorization.removeprefix("Bearer ")
    # ... validate token, look up user
    return {"id": "user_123", "email": "user@example.com"}


CurrentUser = Annotated[dict, Depends(get_current_user)]


# ── Service dependencies ────────────────────────────────
def get_chat_service(db: DbSession) -> ChatService:
    """
    Build the ChatService with its dependencies.
    This is the Python equivalent of NestJS providers.
    """
    agent = ResearchAgent(
        model_name=settings.OPENAI_MODEL,
        api_key=settings.OPENAI_API_KEY,
    )
    return ChatService(db=db, agent=agent)


ChatServiceDep = Annotated[ChatService, Depends(get_chat_service)]
```

### Using Dependencies in Routes

```python
# src/api/v1/chat.py
from fastapi import APIRouter

from src.api.deps import ChatServiceDep, CurrentUser
from src.models.schemas.chat import ChatRequest, ChatResponse

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("/", response_model=ChatResponse)
async def create_chat(
    request: ChatRequest,
    user: CurrentUser,           # Injected -- auth required
    chat_service: ChatServiceDep # Injected -- includes db + agent
):
    """
    Notice: no manual instantiation. FastAPI resolves the entire
    dependency tree: db session -> agent -> chat_service -> route.
    """
    result = await chat_service.process_message(
        user_id=user["id"],
        message=request.message,
    )
    return ChatResponse(reply=result.reply, sources=result.sources)
```

```typescript
// NestJS equivalent
@Controller('chat')
export class ChatController {
  // NestJS injects via constructor
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @UseGuards(AuthGuard)
  async createChat(
    @Body() request: CreateChatDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.chatService.processMessage(req.user.id, request.message);
  }
}
```

### Key Differences from NestJS DI

| Aspect | NestJS | FastAPI |
|--------|--------|---------|
| Registration | Explicit in module `providers` | Implicit via `Depends()` |
| Scope | Singleton by default, can be request-scoped | Request-scoped by default (runs per request) |
| Lifecycle | `onModuleInit`, `onModuleDestroy` | `lifespan` context manager |
| Testing | Override providers in testing module | Override dependencies in app |

---

## 5. The Service Layer

Services contain business logic and orchestrate calls to agents, databases, and external APIs.
This is the same pattern as NestJS services.

```python
# src/services/chat_service.py
import logging
from dataclasses import dataclass
from sqlalchemy.ext.asyncio import AsyncSession

from src.agents.research_agent import ResearchAgent
from src.db.repositories.conversation_repo import ConversationRepository
from src.models.domain.conversation import ConversationResult

logger = logging.getLogger(__name__)


@dataclass
class ChatService:
    """
    Orchestrates a chat interaction: loads history, runs the agent,
    saves the result. Pure business logic -- no HTTP concerns.
    """
    db: AsyncSession
    agent: ResearchAgent

    async def process_message(
        self, user_id: str, message: str
    ) -> ConversationResult:
        repo = ConversationRepository(self.db)

        # 1. Load conversation history
        history = await repo.get_recent_messages(user_id, limit=20)
        logger.info(
            "Processing message",
            extra={"user_id": user_id, "history_length": len(history)},
        )

        # 2. Run the agent
        try:
            agent_response = await self.agent.invoke(
                message=message,
                history=history,
            )
        except Exception as e:
            logger.error("Agent failed", extra={"error": str(e), "user_id": user_id})
            raise

        # 3. Persist the result
        await repo.save_message(user_id, "user", message)
        await repo.save_message(user_id, "assistant", agent_response.reply)

        return ConversationResult(
            reply=agent_response.reply,
            sources=agent_response.sources,
            tokens_used=agent_response.tokens_used,
        )
```

```typescript
// Node.js equivalent
@Injectable()
export class ChatService {
  constructor(
    private readonly conversationRepo: ConversationRepository,
    private readonly agent: ResearchAgent,
  ) {}

  async processMessage(userId: string, message: string): Promise<ConversationResult> {
    const history = await this.conversationRepo.getRecentMessages(userId, 20);
    const agentResponse = await this.agent.invoke({ message, history });
    await this.conversationRepo.saveMessage(userId, 'user', message);
    await this.conversationRepo.saveMessage(userId, 'assistant', agentResponse.reply);
    return { reply: agentResponse.reply, sources: agentResponse.sources };
  }
}
```

---

## 6. Separation of Concerns: Routes -> Services -> Agents

The data flow in a well-architected application:

```
HTTP Request
     |
     v
┌─────────────┐    Validates input, serializes output.
│   API Route  │    No business logic. No LLM calls.
│  (chat.py)   │    Equivalent to a NestJS controller.
└──────┬───────┘
       |
       v
┌─────────────┐    Orchestrates business logic.
│   Service    │    Calls agents, databases, external APIs.
│ (chat_svc)   │    Equivalent to a NestJS service.
└──────┬───────┘
       |
       v
┌─────────────┐    Defines the LangGraph state machine.
│    Agent     │    Manages nodes, edges, tool calls.
│ (research)   │    No HTTP, no database direct access.
└──────┬───────┘
       |
       v
┌─────────────┐    Reusable components: LLM calls,
│ Nodes/Tools  │    tool execution, human-in-the-loop.
│              │    Shared across multiple agents.
└──────────────┘
```

### Rules of Thumb

1. **Routes** never import from `agents/` or `chains/` directly.
2. **Services** never import from `api/` (no `Request` or `Response` objects).
3. **Agents** never import from `db/` -- they receive data they need as arguments.
4. **Tools** are pure functions or thin wrappers -- they do one thing.

---

## 7. Router Aggregation

```python
# src/api/v1/router.py
from fastapi import APIRouter
from src.api.v1.chat import router as chat_router
from src.api.v1.agents import router as agents_router
from src.api.v1.documents import router as documents_router

api_v1_router = APIRouter()
api_v1_router.include_router(chat_router)
api_v1_router.include_router(agents_router)
api_v1_router.include_router(documents_router)
```

```typescript
// NestJS equivalent: app.module.ts
@Module({
  imports: [ChatModule, AgentsModule, DocumentsModule],
})
export class AppModule {}
```

---

## 8. Pydantic Models (Request/Response Schemas)

```python
# src/models/schemas/chat.py
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """Incoming chat message -- like a DTO in NestJS."""
    message: str = Field(..., min_length=1, max_length=10_000)
    conversation_id: str | None = None
    stream: bool = False

    model_config = {"json_schema_extra": {
        "examples": [{"message": "Explain quantum computing", "stream": True}]
    }}


class SourceDocument(BaseModel):
    title: str
    url: str
    relevance_score: float = Field(ge=0, le=1)


class ChatResponse(BaseModel):
    reply: str
    sources: list[SourceDocument] = []
    tokens_used: int = 0
    model: str = ""
```

```typescript
// NestJS equivalent DTO
export class CreateChatDto {
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  message: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsBoolean()
  @IsOptional()
  stream?: boolean = false;
}
```

---

## 9. Testing with Dependency Overrides

FastAPI makes it easy to swap dependencies for testing -- similar to NestJS's
`overrideProvider`.

```python
# tests/conftest.py
import pytest
from httpx import ASGITransport, AsyncClient

from src.main import create_app
from src.api.deps import get_db, get_current_user


@pytest.fixture
def app():
    app = create_app()

    # Override database with test database
    async def override_get_db():
        async with test_session_factory() as session:
            yield session

    # Override auth with a fake user
    async def override_get_current_user():
        return {"id": "test_user", "email": "test@test.com"}

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    yield app
    app.dependency_overrides.clear()


@pytest.fixture
async def client(app):
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        yield client


# tests/integration/test_chat.py
@pytest.mark.asyncio
async def test_create_chat(client):
    response = await client.post(
        "/api/v1/chat/",
        json={"message": "Hello, world!"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
```

---

## 10. Practice Exercises

### Exercise 1: Scaffold a Project
Create the full folder structure from scratch using `mkdir` and `touch`.
Add a `pyproject.toml` with the following dependencies:
- fastapi, uvicorn, pydantic-settings
- langchain, langgraph, langchain-openai
- sqlalchemy[asyncio], asyncpg
- pytest, httpx, pytest-asyncio

Verify you can run `uvicorn src.main:app --reload` and see the Swagger docs.

### Exercise 2: Implement Config
Create a `Settings` class with Pydantic BaseSettings that loads:
- `DATABASE_URL` (required, must start with `postgresql`)
- `OPENAI_API_KEY` (required, non-empty)
- `ENVIRONMENT` (one of development/staging/production)
- `LOG_LEVEL` (default INFO)

Write a test that verifies the settings raise `ValidationError` when
`OPENAI_API_KEY` is missing.

### Exercise 3: Dependency Chain
Build a dependency chain: `get_db` -> `get_user_repo` -> `get_user_service`.
Create a route `/api/v1/users/me` that uses `UserServiceDep` to return the
current user's profile. Write a test that overrides `get_db` to use an
in-memory SQLite database.

### Exercise 4: Separate Concerns
You have this badly structured route:

```python
@router.post("/analyze")
async def analyze(request: Request):
    body = await request.json()
    text = body["text"]
    llm = ChatOpenAI(model="gpt-4o")
    result = await llm.ainvoke(f"Analyze: {text}")
    db = get_database_connection()
    db.execute("INSERT INTO analyses (text, result) VALUES (?, ?)", (text, result.content))
    return {"result": result.content}
```

Refactor it into the proper layers: a Pydantic schema, a route, a service, and a chain.
Each should be in its own file following the project structure.

### Exercise 5: Compare Architectures
Draw a diagram (or write a table) mapping your current NestJS project's modules to the
equivalent Python project structure. Identify:
- Which NestJS concepts have direct Python equivalents
- Which concepts are handled differently (e.g., Guards -> Dependencies)
- Which concepts don't exist in Python and how to replace them
