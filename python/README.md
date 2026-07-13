# Python Learning Tutorial: Node.js/TS Developer → Python Backend & AI Agents

A comprehensive, structured learning path for experienced Node.js/TypeScript developers transitioning to Python for **backend development** (FastAPI). For **AI agents** (LangChain, LangGraph), the dedicated **Agentic AI course** now lives at [`../agentic-ai/`](../agentic-ai/README.md) — see the callout section below.

## How to Use This Tutorial

- **Start from `00_quick_start/`** if you're brand new to Python
- **Skip to `05_pydantic/`** if you already know Python basics and want to jump into the web/AI stack
- Each file has **Node.js/TypeScript comparisons** so you can map familiar concepts
- Every file ends with **practice exercises** — do them!
- **Going into AI agents?** Finish `05_pydantic/` and `06_fastapi/` here, then head over to [`../agentic-ai/`](../agentic-ai/README.md) for LangChain + LangGraph

---

## Table of Contents

### [`00_quick_start/`](./00_quick_start/) — Getting Started
| # | File | Topics |
|---|------|--------|
| 1 | [Python Installation](./00_quick_start/01_python_installation.md) | Python install, pyenv, version management (nvm equivalent) |
| 2 | [Virtual Environments](./00_quick_start/02_virtual_environments.md) | venv, pip, requirements.txt (npm/node_modules equivalent) |
| 3 | [Package Management](./00_quick_start/03_package_management.md) | pip, poetry, pyproject.toml vs package.json |
| 4 | [Node.js to Python Cheatsheet](./00_quick_start/04_nodejs_to_python_cheatsheet.md) | Side-by-side syntax comparison: JS vs Python |
| 5 | [First Python Script](./00_quick_start/05_first_python_script.md) | Hello world, running scripts, REPL, `__name__` |

### [`01_basic_fundamentals/`](./01_basic_fundamentals/) — Python Fundamentals
| # | File | Topics |
|---|------|--------|
| 1 | [Variables & Data Types](./01_basic_fundamentals/01_variables_and_data_types.md) | Variables, int/float/str/bool, dynamic typing, None vs null |
| 2 | [Strings](./01_basic_fundamentals/02_strings.md) | f-strings, methods, slicing, multiline |
| 3 | [Lists & Tuples](./01_basic_fundamentals/03_lists_and_tuples.md) | Lists (arrays), tuples, slicing, unpacking, comprehensions |
| 4 | [Dictionaries & Sets](./01_basic_fundamentals/04_dictionaries_and_sets.md) | Dicts (objects), sets, comprehensions, defaultdict |
| 5 | [Control Flow](./01_basic_fundamentals/05_control_flow.md) | if/elif/else, for/while, range(), match-case |
| 6 | [Functions](./01_basic_fundamentals/06_functions.md) | def, *args/**kwargs, lambda, type hints, closures |
| 7 | [Modules & Imports](./01_basic_fundamentals/07_modules_and_imports.md) | import system, `__init__.py`, packages |
| 8 | [Error Handling](./01_basic_fundamentals/08_error_handling.md) | try/except/finally, custom exceptions |
| 9 | [File Operations](./01_basic_fundamentals/09_file_operations.md) | open(), with statement, pathlib |
| 10 | [Comprehensions](./01_basic_fundamentals/10_comprehensions.md) | List/dict/set comprehensions (no JS equivalent!) |

### [`02_oops/`](./02_oops/) — Object-Oriented Programming
| # | File | Topics |
|---|------|--------|
| 1 | [Classes Basics](./02_oops/01_classes_basics.md) | class, `__init__`, self vs this |
| 2 | [Inheritance](./02_oops/02_inheritance.md) | Single/multiple inheritance, super(), MRO |
| 3 | [Magic Methods](./02_oops/03_magic_methods.md) | `__str__`, `__repr__`, `__eq__`, operator overloading |
| 4 | [Decorators](./02_oops/04_decorators.md) | @property, @staticmethod, @classmethod |
| 5 | [Abstract Classes](./02_oops/05_abstract_classes.md) | ABC, abstract methods, Protocol |
| 6 | [Dataclasses](./02_oops/06_dataclasses.md) | @dataclass, frozen, field() |
| 7 | [Enums & NamedTuples](./02_oops/07_enums_and_namedtuples.md) | Enum, IntEnum, NamedTuple |

### [`03_advanced_python/`](./03_advanced_python/) — Advanced Python
| # | File | Topics |
|---|------|--------|
| 1 | [Type Hints](./03_advanced_python/01_type_hints.md) | Type annotations, Optional, Union, mypy vs tsc |
| 2 | [Advanced Types](./03_advanced_python/02_advanced_types.md) | TypedDict, Protocol, Literal, TypeVar, generics |
| 3 | [Iterators & Generators](./03_advanced_python/03_iterators_and_generators.md) | yield, generator expressions, itertools |
| 4 | [Context Managers](./03_advanced_python/04_context_managers.md) | with statement, `__enter__`/`__exit__`, @contextmanager |
| 5 | [Async/Await](./03_advanced_python/05_async_await.md) | asyncio, event loop vs Node.js event loop |
| 6 | [Async Patterns](./03_advanced_python/06_async_patterns.md) | gather() vs Promise.all(), create_task(), Queue |
| 7 | [Concurrency](./03_advanced_python/07_concurrency.md) | GIL, threading, multiprocessing |
| 8 | [Advanced Decorators](./03_advanced_python/08_decorators_advanced.md) | Decorator factories, functools.wraps, lru_cache |
| 9 | [Functional Programming](./03_advanced_python/09_functional_programming.md) | map/filter/reduce, lambda, functools, partial |

### [`04_testing_and_tooling/`](./04_testing_and_tooling/) — Testing & Developer Tools
| # | File | Topics |
|---|------|--------|
| 1 | [pytest Basics](./04_testing_and_tooling/01_pytest_basics.md) | pytest vs Jest, assertions, parametrize |
| 2 | [Fixtures & Mocking](./04_testing_and_tooling/02_fixtures_and_mocking.md) | @pytest.fixture, conftest.py, unittest.mock |
| 3 | [Async Testing](./04_testing_and_tooling/03_async_testing.md) | pytest-asyncio, testing async functions |
| 4 | [Code Quality](./04_testing_and_tooling/04_code_quality.md) | Black (Prettier), Ruff (ESLint), mypy |
| 5 | [Project Structure](./04_testing_and_tooling/05_project_structure.md) | Layout conventions, pyproject.toml, src/ pattern |

### [`05_pydantic/`](./05_pydantic/) — Pydantic Data Validation
| # | File | Topics |
|---|------|--------|
| 1 | [Introduction](./05_pydantic/01_introduction.md) | What is Pydantic, runtime validation vs TypeScript/Zod |
| 2 | [Basic Models](./05_pydantic/02_basic_models.md) | BaseModel, field types, model_dump(), model_validate() |
| 3 | [Field Validation](./05_pydantic/03_field_validation.md) | @field_validator, @model_validator, constraints |
| 4 | [Advanced Types](./05_pydantic/04_advanced_types.md) | EmailStr, HttpUrl, discriminated unions, generics |
| 5 | [Nested Models](./05_pydantic/05_nested_models.md) | Models within models, recursive models |
| 6 | [Settings Management](./05_pydantic/06_settings_management.md) | BaseSettings, .env files, environment variables |
| 7 | [Serialization](./05_pydantic/07_serialization.md) | JSON serialization, custom serializers, aliases |

### [`06_fastapi/`](./06_fastapi/) — FastAPI Web Framework
| # | File | Topics |
|---|------|--------|
| 1 | [Introduction](./06_fastapi/01_introduction.md) | FastAPI vs Express/NestJS, uvicorn, auto docs |
| 2 | [Routing](./06_fastapi/02_routing.md) | Path/query params, request body, response models |
| 3 | [Request & Response](./06_fastapi/03_request_response.md) | Form data, file uploads, headers, streaming |
| 4 | [Dependency Injection](./06_fastapi/04_dependency_injection.md) | Depends(), class dependencies, overrides |
| 5 | [Middleware & CORS](./06_fastapi/05_middleware_and_cors.md) | Custom middleware, CORS, lifecycle events |
| 6 | [Authentication](./06_fastapi/06_authentication.md) | JWT, OAuth2, password hashing |
| 7 | [Database](./06_fastapi/07_database.md) | SQLAlchemy ORM, async sessions, Alembic |
| 8 | [Background Tasks](./06_fastapi/08_background_tasks.md) | BackgroundTasks, Celery (vs BullMQ) |
| 9 | [WebSockets](./06_fastapi/09_websockets.md) | WebSocket routes, connection manager |
| 10 | [Testing](./06_fastapi/10_testing.md) | TestClient (vs supertest), dependency overrides |
| 11 | [Error Handling](./06_fastapi/11_error_handling.md) | HTTPException, custom handlers |
| 12 | [Advanced Patterns](./06_fastapi/12_advanced_patterns.md) | APIRouter, sub-apps, lifespan, streaming |

### 🤖 AI Agents — LangChain + LangGraph ab dedicated course mein hai!

> [!tip]
> Pehle yahan `07_langchain/` aur `08_langgraph/` folders hote the, lekin woh content ab purana ho chuka tha. Humne poora AI agents wala syllabus **from scratch rewrite** karke ek naya, standalone course bana diya hai:
>
> ### 👉 [`../agentic-ai/`](../agentic-ai/README.md) — The Agentic AI Course
>
> - Do tracks hain — **Python** aur **JavaScript** — dono mein **24 chapters** hain
> - **0 se production tak** — basics se leke real-world, production-grade agent systems tak sab cover hota hai
> - Fully complete hai — LangChain, LangGraph, RAG, multi-agent systems, tool calling, memory, streaming, deployment — sab kuch
>
> Agar tumhe LangChain ya LangGraph seekhna hai, is `python/` folder ke bajaye seedha `agentic-ai/README.md` se shuru karo.

### [`09_production_patterns/`](./09_production_patterns/) — Production Deployment
| # | File | Topics |
|---|------|--------|
| 1 | [Project Architecture](./09_production_patterns/01_project_architecture.md) | Structuring FastAPI + LangGraph projects |
| 2 | [Error & Logging](./09_production_patterns/02_error_and_logging.md) | structlog, Sentry, centralized errors |
| 3 | [Caching](./09_production_patterns/03_caching.md) | Redis, LLM response caching, cost optimization |
| 4 | [Deployment](./09_production_patterns/04_deployment.md) | Docker, uvicorn/gunicorn, CI/CD, Kubernetes |
| 5 | [Monitoring](./09_production_patterns/05_monitoring.md) | Health checks, Prometheus, LangSmith, OpenTelemetry |

---

## Learning Path Recommendations

### Speed Run (1-2 weeks)
`00_quick_start` → `01_basic_fundamentals` → `05_pydantic` → `06_fastapi`

### Full Foundation (3-4 weeks)
`00` → `01` → `02` → `03` → `04` → `05` → `06`

### AI Agent Focus (after basics)
`05_pydantic` → `06_fastapi` → [`../agentic-ai/`](../agentic-ai/README.md) (Python or JavaScript track) → `09_production_patterns`

### Complete Path (6-8 weeks)
Follow all sections in order: `00` through `09`

---

## Key Concept Mappings (Node.js → Python)

| Node.js/TypeScript | Python |
|---|---|
| nvm | pyenv |
| npm / yarn / pnpm | pip / poetry |
| package.json | pyproject.toml |
| node_modules | venv (virtual environment) |
| require() / import | import / from...import |
| console.log() | print() |
| null / undefined | None |
| Promise / async-await | asyncio / async-await |
| Express / NestJS | FastAPI |
| Zod / Joi | Pydantic |
| Jest | pytest |
| ESLint | Ruff |
| Prettier | Black |
| TypeScript compiler | mypy |

---

Happy learning! 🐍
