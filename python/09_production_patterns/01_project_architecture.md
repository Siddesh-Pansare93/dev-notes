# FastAPI + LangGraph ke Production Apps ke liye Project Architecture

## Kyun Architecture Matter Karta Hai AI Applications Mein

Socho ek second ke liye — jo baat NestJS ya Express mein hoti hai, us se thoda alag ho jata hai jab AI agents add karte ho. Normal Node.js backend mein agar architecture kharaab hai, to technical debt hota hai. Bas itna. Lekin AI backend mein? Yeh dekho:

- LLM calls ke paisa burn hota rehta hai, aur tum samajh nahi paate ki kyun
- Agent bahut weird behavior karne lagta hai, tab pata nahi chalata debugging kaise kare
- Token usage control mein aata hi nahi
- Ek choti si coding mistake puri project ko upside down kar deti hai

Jo Swiggy, Zomato jaise platforms ke backend engineers karte hain — ek solid architecture set karke start karte hain — us se seekho. Pehle hi structure sahi banao, phir baad mein zyada maahunga pad-ne se bacho.

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

### NestJS vs Python Comparison

```
NestJS                              Python (FastAPI + LangGraph)
──────────────────────────────────  ──────────────────────────────────
src/modules/chat/                   src/api/v1/chat.py          (route)
  chat.controller.ts                src/services/chat_service.py (logic)
  chat.service.ts                   src/agents/research_agent.py (agent)
  chat.module.ts                    No module file needed
  dto/create-chat.dto.ts            src/models/schemas/chat.py

app.module.ts                       src/main.py (app factory)
config/configuration.ts             src/core/config.py
```

**Key baat yeh hai:** NestJS bahut strict hota hai — decorators laga, modules define karo, sab kuch framework bolega. FastAPI zyada flexible hai — tum jaise organize karna hai, organize karo. Yeh ek strength bhi ho sakta hai (kam boilerplate) ya weakness bhi (easy to create mess).

---

## 2. The App Factory Pattern

Node.js mein tum `app.ts` se ek Express app export karte ho. Python mein thoda alag approach hai — **app factory** bolte hain. Faida yeh hai ki testing aur production dono mein different configuration pass kar sakte ho.

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
    """Startup aur shutdown logic — NestJS ke onModuleInit / onModuleDestroy jaisa."""
    setup_logging()
    # Startup: connections initialize karo, caches warm karo, etc.
    yield
    # Shutdown: connections close karo, buffers flush karo
    await engine.dispose()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        # Production mein swagger docs dikhane ki zarurat nahi
        docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
        lifespan=lifespan,
    )

    # Middleware (reverse order mein apply hote hain — outermost first)
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

Yeh ek bahut badi quality-of-life upgrade hai Node.js config management se. Pydantic BaseSettings tumhe validated, type-safe configuration deta hai aur `.env` file automatically load kar leta hai — no manual dotenv parsing, no headaches.

```python
# src/core/config.py
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings. Values load hote hain environment variables se,
    phir .env file se, aur phir field defaults fallback ke taur pe.

    Node.js equivalent: config/index.ts with dotenv + zod validation.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,          # DATABASE_URL aur database_url dono work kare
        extra="ignore",                # Unknown env vars ko ignore karo
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
        """Comma-separated string ya list dono accept karo."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v


# Singleton — isko hamesha import karo
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

**Pydantic version zyada powerful kyon hai:**
- Nested settings, complex types, custom validators — sab built-in hai
- Settings ek proper class hain, IDE autocomplete milta hai
- `.env` file loading built-in hai (separate dotenv import ki zarurat nahi)
- Agar config wrong hai, to startup pe clear error message milta hai

---

## 4. Dependency Injection

FastAPI mein dependency injection NestJS se alag dikh sakta hai, lekin goal same hai: **testability, separation of concerns, lifecycle management**.

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
    Database session yield karta hai per request ke basis pe.
    Agar koi error nahi hua, to commit. Error hua to rollback.
    NestJS ke interceptor ke jaisa kaam karta hai.
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


# Type alias — signatures ko cleaner banane ke liye (Python 3.11+)
DbSession = Annotated[AsyncSession, Depends(get_db)]


# ── Authentication ───────────────────────────────────────
async def get_current_user(
    authorization: str = Header(..., alias="Authorization"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    JWT token validate karo. Dependencies apne aap dependencies par depend kar sakte hain —
    FastAPI automatically poora chain resolve kar deta hai.
    NestJS ke DI container jaisa kaam karta hai.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    token = authorization.removeprefix("Bearer ")
    # ... token validate karo, user ko lookup karo
    return {"id": "user_123", "email": "user@example.com"}


CurrentUser = Annotated[dict, Depends(get_current_user)]


# ── Service dependencies ────────────────────────────────
def get_chat_service(db: DbSession) -> ChatService:
    """
    ChatService build karo apke dependencies ke saath.
    Yeh NestJS providers ke equivalent hai.
    """
    agent = ResearchAgent(
        model_name=settings.OPENAI_MODEL,
        api_key=settings.OPENAI_API_KEY,
    )
    return ChatService(db=db, agent=agent)


ChatServiceDep = Annotated[ChatService, Depends(get_chat_service)]
```

### Dependencies Ko Routes Mein Use Karo

```python
# src/api/v1/chat.py
from fastapi import APIRouter

from src.api.deps import ChatServiceDep, CurrentUser
from src.models.schemas.chat import ChatRequest, ChatResponse

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("/", response_model=ChatResponse)
async def create_chat(
    request: ChatRequest,
    user: CurrentUser,           # Inject hota hai — auth zaruri hai
    chat_service: ChatServiceDep # Inject hota hai — db + agent included
):
    """
    Notice: koi manual instantiation nahi. FastAPI poora dependency tree
    resolve karta hai: db session -> agent -> chat_service -> route.
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
  // NestJS constructor se inject karta hai
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

### NestJS DI se Key Differences

| Aspect | NestJS | FastAPI |
|--------|--------|---------|
| Registration | Module `providers` mein explicit | `Depends()` ke through implicit |
| Scope | Default singleton, request-scoped ho sakte hain | Default request-scoped (har request pe run hota hai) |
| Lifecycle | `onModuleInit`, `onModuleDestroy` | `lifespan` context manager |
| Testing | Testing module mein providers override karo | App ke `dependency_overrides` use karo |

---

## 5. The Service Layer

Services mein business logic hota hai aur yeh agents, databases, external APIs ko orchestrate karte hain. Yeh exact same pattern hai jo NestJS mein use karte ho.

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
    Chat interaction ko orchestrate karta hai: history load karo,
    agent ko run karo, result save karo. Pure business logic —
    HTTP ka koi concern nahi.
    """
    db: AsyncSession
    agent: ResearchAgent

    async def process_message(
        self, user_id: str, message: str
    ) -> ConversationResult:
        repo = ConversationRepository(self.db)

        # 1. Conversation history load karo
        history = await repo.get_recent_messages(user_id, limit=20)
        logger.info(
            "Processing message",
            extra={"user_id": user_id, "history_length": len(history)},
        )

        # 2. Agent ko run karo
        try:
            agent_response = await self.agent.invoke(
                message=message,
                history=history,
            )
        except Exception as e:
            logger.error("Agent failed", extra={"error": str(e), "user_id": user_id})
            raise

        # 3. Result ko persist karo
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

Well-architected application mein data flow yeh hota hai:

```
HTTP Request
     |
     v
┌─────────────┐    Input validate karo, output serialize karo.
│   API Route  │    Koi business logic nahi. Koi LLM call nahi.
│  (chat.py)   │    NestJS controller ke equivalent.
└──────┬───────┘
       |
       v
┌─────────────┐    Business logic ko orchestrate karo.
│   Service    │    Agents, databases, external APIs ko call karo.
│ (chat_svc)   │    NestJS service ke equivalent.
└──────┬───────┘
       |
       v
┌─────────────┐    LangGraph state machine define karo.
│    Agent     │    Nodes, edges, tool calls manage karo.
│ (research)   │    Koi HTTP nahi, koi direct db access nahi.
└──────┬───────┘
       |
       v
┌─────────────┐    Reusable components: LLM calls,
│ Nodes/Tools  │    tool execution, human-in-the-loop.
│              │    Multiple agents ke across share hote hain.
└──────────────┘
```

### Rules of Thumb

1. **Routes** kabhi `agents/` aur `chains/` se directly import nahi karte.
2. **Services** kabhi `api/` se import nahi karte (Request ya Response objects).
3. **Agents** kabhi `db/` se direct access nahi karte — jo data zaruri hai as arguments pass hota hai.
4. **Tools** pure functions ya thin wrappers hote hain — ek hi kaam karte hain.

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
    """Incoming chat message — NestJS mein DTO ke jaisa."""
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

FastAPI se testing bahut easy hai — dependencies ko swap kar sakte ho, NestJS ke `overrideProvider` jaisa.

```python
# tests/conftest.py
import pytest
from httpx import ASGITransport, AsyncClient

from src.main import create_app
from src.api.deps import get_db, get_current_user


@pytest.fixture
def app():
    app = create_app()

    # Database ko test database se override karo
    async def override_get_db():
        async with test_session_factory() as session:
            yield session

    # Auth ko fake user se override karo
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

### Exercise 1: Scaffold ek Project

Scratch se poora folder structure banao using `mkdir` aur `touch`. `pyproject.toml` mein yeh dependencies add karo:
- fastapi, uvicorn, pydantic-settings
- langchain, langgraph, langchain-openai
- sqlalchemy[asyncio], asyncpg
- pytest, httpx, pytest-asyncio

Verify karo ki `uvicorn src.main:app --reload` run ho aur Swagger docs dikhain.

### Exercise 2: Config Implement Karo

Pydantic BaseSettings ke saath ek `Settings` class banao jo load kare:
- `DATABASE_URL` (required, must start with `postgresql`)
- `OPENAI_API_KEY` (required, non-empty)
- `ENVIRONMENT` (one of development/staging/production)
- `LOG_LEVEL` (default INFO)

Ek test likho jo verify kare ki `OPENAI_API_KEY` missing ho to `ValidationError` raise ho.

### Exercise 3: Dependency Chain

Dependency chain banao: `get_db` -> `get_user_repo` -> `get_user_service`. Ek route `/api/v1/users/me` create karo jo `UserServiceDep` use karke current user ka profile return kare. Ek test likho jo `get_db` ko override karke in-memory SQLite database use kare.

### Exercise 4: Concerns Ko Separate Karo

Yeh badly structured route dekho:

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

Isko refactor karo proper layers mein: ek Pydantic schema, ek route, ek service, aur ek chain. Har ek apni hi file mein aur project structure follow kare.

### Exercise 5: Architectures Ko Compare Karo

Ek diagram (ya table) draw karo jo apne current NestJS project ke modules ko equivalent Python structure mein map kare. Identify karo:
- Kaun se NestJS concepts ka direct Python equivalent hai
- Kaun se concepts differently handle hote hain (e.g., Guards -> Dependencies)
- Kaun se concepts Python mein exist nahi karte aur unhe replace kaise kare
