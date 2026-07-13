# 01 - FastAPI Ka Introduction

## FastAPI Kya Hai?

FastAPI ek modern, high-performance Python web framework hai APIs banane ke liye. Agar tum Express.js aur NestJS jante ho, toh FastAPI bilkul un dono ke beech mein baithe hai -- Express jaisa simple hai, NestJS jaisa structured aur type-safe hai, aur dono se kuch extra features bhi hain!

Socho Zomato ke API ko: order lena, payment verify karna, restaurant se confirm karna -- sab kaam asynchronous hona chahiye aur sab validated hona chahiye. FastAPI exactly yeh sab handle karta hai beautifully.

### Quick Comparison

| Feature | Express.js | NestJS | FastAPI |
|---|---|---|---|
| Type safety | Manual (TS helps) | Decorators + TS | Built-in via Pydantic |
| API docs | Manual (swagger-jsdoc) | @nestjs/swagger + decorators | **Automatic** from code |
| Validation | Manual (joi, zod, class-validator) | class-validator + pipes | **Automatic** from type hints |
| Async support | Native (Node.js) | Native (Node.js) | Native (asyncio) |
| Performance | Good | Good (Express under hood) | Excellent (Starlette + uvicorn) |
| Learning curve | Low | Medium-High | Low-Medium |
| Dependency injection | None built-in | Core feature | Core feature (Depends) |

### Ek Node.js Developer Ke Liye Kya Faydemand Hai?

1. **Automatic OpenAPI/Swagger docs** -- Yaad hai na Express mein swagger-jsdoc likh likh ke thak gaye the? FastAPI mein code likho, aur docs automatically generate ho jaate hain. Koi decorators nahi, koi YAML files nahi.

2. **Pydantic integration** -- Soch lo Pydantic = zod + class-validator, ek single cheeez mein combined. Model define karo, aur FastAPI apne aap request bodies validate karta hai, query params parse karta hai, aur responses serialize karta hai.

3. **Async support** -- Python ka `async/await` JavaScript jaise hi kaam karta hai. FastAPI dono sync aur async handlers support karta hai, so tum jo fit ho wo use kar sakte ho.

4. **Performance** -- FastAPI Python ke sab se tez frameworks mein se ek hai, Node.js aur Go ke barabar I/O-bound workloads mein. Yeh Starlette (ASGI framework) aur Uvicorn (ASGI server) par built hai.

5. **Developer experience** -- Editor mein autocomplete sab jagah kaam karta hai kyunki sab kuch typed hai. Bugs code likhtey hi catch hote hain, runtime mein nahi.

---

## Installation

### Node.js Ka Mental Model

```
npm init -y          -->  python -m venv venv && source venv/bin/activate (ya venv\Scripts\activate Windows par)
npm install express  -->  pip install "fastapi[standard]"
nodemon index.js     -->  uvicorn main:app --reload
```

### Actual Setup

```bash
# Virtual environment create karo (jaise project-local node_modules)
python -m venv venv

# Windows par
venv\Scripts\activate

# macOS/Linux par
source venv/bin/activate

# FastAPI install karo saare standard dependencies ke saath
pip install "fastapi[standard]"
```

`[standard]` extra ye sab install karta hai:
- `uvicorn` -- ASGI server (jaise Node.js ka HTTP server, par production-grade)
- `httpx` -- async HTTP client (jaise axios/fetch)
- `jinja2` -- templating (jaise ejs/handlebars)
- `python-multipart` -- form data parsing (jaise multer/body-parser)

### Uvicorn Kya Hota Hai?

Uvicorn ek ASGI (Asynchronous Server Gateway Interface) server hai. Socho Node.js ke built-in HTTP server jaisa, par ek standalone process ke taur par.

| Node.js | Python/FastAPI |
|---|---|
| `node index.js` | `uvicorn main:app` |
| `nodemon index.js` | `uvicorn main:app --reload` |
| Built into Node.js runtime | Separate package (uvicorn) |
| Express wraps http module | FastAPI wraps Starlette/ASGI |

---

## Hello World: Side by Side

### Express.js

```javascript
// index.js
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ message: 'Hello, World!' });
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

### NestJS

```typescript
// app.controller.ts
import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHello(): { message: string } {
    return { message: 'Hello, World!' };
  }
}
```

### FastAPI

```python
# main.py
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Hello, World!"}
```

Bas itna hi! Sirf teen lines meaningful code. Koi `res.json()` nahi, koi manual serialization nahi. FastAPI automatically dict ko JSON mein convert karta hai aur correct `Content-Type` header set karta hai.

### Kaise Chalaoge?

```bash
uvicorn main:app --reload
```

Breaking it down:
- `main` -- Python file ka naam (`main.py`)
- `app` -- FastAPI instance ka variable name
- `--reload` -- file changes ko watch karo aur restart karo (jaise nodemon)

Server start hota hai `http://127.0.0.1:8000` par (default port 8000 hai, 3000 nahi).

### Host aur Port Customize Karna

```bash
# Jaise: node index.js  (with PORT=3000 HOST=0.0.0.0)
uvicorn main:app --reload --host 0.0.0.0 --port 3000
```

---

## Auto-Generated Documentation

Yeh feature tummmmmmmmm ko mind blow kar dega agar Node.js se aa rahe ho. App chala ke dekhna:

- **Swagger UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- **Raw OpenAPI JSON**: [http://127.0.0.1:8000/openapi.json](http://127.0.0.1:8000/openapi.json)

Express mein `swagger-ui-express`, `swagger-jsdoc` install karna padta, JSDoc comments likhnay padte, ya YAML maintain karna padta. NestJS mein `@nestjs/swagger` decorators har DTO aur controller par lagane padte.

FastAPI mein bas hota hai. Har route, har parameter, har model jo tum define karte ho automatically docs mein dikhayi deta hai. Swagger UI se hi endpoints test kar sakte ho!

### Documentation Customize Karna

```python
from fastapi import FastAPI

app = FastAPI(
    title="My Awesome API",
    description="A sample API for learning FastAPI",
    version="1.0.0",
    docs_url="/docs",        # Swagger UI ka path badal sakte ho (default: /docs)
    redoc_url="/redoc",      # ReDoc ka path badal sakte ho (default: /redoc)
    openapi_url="/openapi.json",  # OpenAPI schema ka path
)
```

Production mein docs disable karna ho toh:

```python
import os

app = FastAPI(
    docs_url="/docs" if os.getenv("ENV") != "production" else None,
    redoc_url=None,  # ReDoc bilkul disable kar do
)
```

---

## Async Support

FastAPI dono sync aur async route handlers support karta hai. Python ka `async/await` bilkul JavaScript jaisa kaam karta hai.

### JavaScript Async

```javascript
app.get('/users', async (req, res) => {
  const users = await db.query('SELECT * FROM users');
  res.json(users);
});
```

### FastAPI Async

```python
@app.get("/users")
async def get_users():
    users = await db.fetch("SELECT * FROM users")
    return users
```

### Async vs Sync -- Kab Kya Use Kare?

```python
# Async use karo jab I/O operations ho (database, HTTP calls, file I/O)
@app.get("/async-route")
async def async_route():
    data = await some_async_operation()
    return data

# Sync use karo CPU-bound ya simple operations ke liye
# FastAPI automatically sync functions ko thread pool mein run karta hai!
@app.get("/sync-route")
def sync_route():
    # Yeh dusray requests ko block nahi karega -- FastAPI handle kar lega
    return {"message": "This is fine"}
```

> [!info]
> **Important: Node.js se Farak**
> 
> Node.js mein sab kuch async hota hai nature se. Python mein tum choose karte ho. Agar sync function likho toh FastAPI usey separate thread mein run karta hai so event loop block na ho. Yeh ek safety net hai jo Node.js mein nahi hai!

---

## Ek Poora Example

```python
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Todo API", version="0.1.0")

# TypeScript interface + zod schema combined jaisa
class TodoCreate(BaseModel):
    title: str
    completed: bool = False

class TodoResponse(BaseModel):
    id: int
    title: str
    completed: bool

# In-memory "database" (express tutorial ki tarah)
todos: list[TodoResponse] = []
next_id = 1

@app.get("/")
def root():
    return {"message": "Todo API is running"}

@app.get("/todos", response_model=list[TodoResponse])
def get_todos():
    return todos

@app.post("/todos", response_model=TodoResponse, status_code=201)
def create_todo(todo: TodoCreate):
    global next_id
    new_todo = TodoResponse(id=next_id, **todo.model_dump())
    todos.append(new_todo)
    next_id += 1
    return new_todo

@app.get("/todos/{todo_id}", response_model=TodoResponse)
def get_todo(todo_id: int):
    for todo in todos:
        if todo.id == todo_id:
            return todo
    # Proper error handling aage seekhenge
    return {"error": "Not found"}
```

### Express.js Mein Yeh Kaise Likha Hota?

```javascript
const express = require('express');
const { z } = require('zod');
const app = express();
app.use(express.json());

// Validation ke liye zod ya joi use karna padta
const TodoCreateSchema = z.object({
  title: z.string(),
  completed: z.boolean().default(false),
});

let todos = [];
let nextId = 1;

app.get('/', (req, res) => {
  res.json({ message: 'Todo API is running' });
});

app.get('/todos', (req, res) => {
  res.json(todos);
});

app.post('/todos', (req, res) => {
  // Manual validation step
  const result = TodoCreateSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(422).json({ errors: result.error.issues });
  }
  const newTodo = { id: nextId++, ...result.data };
  todos.push(newTodo);
  res.status(201).json(newTodo);
});

app.get('/todos/:todoId', (req, res) => {
  const todo = todos.find(t => t.id === parseInt(req.params.todoId));
  if (!todo) return res.status(404).json({ error: 'Not found' });
  res.json(todo);
});

app.listen(3000);
```

> [!warning]
> **Express Mein Kitna Kam Extra Karna Padta Hai!**
>
> Express mein:
> 1. Manually `express.json()` middleware call karna padta
> 2. zod/joi se manually validation
> 3. Manually validation errors handle karna
> 4. `req.params.todoId` ko int mein parse karna
> 5. Response object par manually status codes set karna
>
> FastAPI sab kuch automatically kar deta hai! `todo_id: int` type hint se FastAPI apne aap path parameter parse aur validate kar leta hai. `todo: TodoCreate` parameter se request body handle hota hai. Invalid requests automatically 422 error response de dete hain.

---

## Project Structure

Small projects ke liye ek `main.py` kaafi hai. Bade projects mein kuch is tarah organize karo:

```
my_api/
├── app/
│   ├── __init__.py
│   ├── main.py          # FastAPI app creation, routers include karte hain
│   ├── config.py        # Settings (.env config jaisa)
│   ├── dependencies.py  # Shared dependencies
│   ├── models/          # SQLAlchemy models (Prisma schema jaisa)
│   │   ├── __init__.py
│   │   └── user.py
│   ├── schemas/         # Pydantic models (NestJS mein DTOs jaisa)
│   │   ├── __init__.py
│   │   └── user.py
│   ├── routers/         # Route handlers (NestJS controllers jaisa)
│   │   ├── __init__.py
│   │   └── users.py
│   ├── services/        # Business logic
│   │   ├── __init__.py
│   │   └── user_service.py
│   └── utils/
│       └── __init__.py
├── tests/
│   ├── __init__.py
│   └── test_users.py
├── alembic/             # Database migrations
├── requirements.txt     # package.json dependencies jaisa
└── .env
```

### NestJS Se Compare Karte Hain

| NestJS | FastAPI |
|---|---|
| `src/users/users.controller.ts` | `app/routers/users.py` |
| `src/users/users.service.ts` | `app/services/user_service.py` |
| `src/users/dto/create-user.dto.ts` | `app/schemas/user.py` |
| `src/users/entities/user.entity.ts` | `app/models/user.py` |
| `src/users/users.module.ts` | Kuch nahi -- routers directly include hote hain |

---

## Practice Exercises

### Exercise 1: Hello API

FastAPI app banao ek single GET endpoint ke saath `/` par jo `{"message": "Hello from FastAPI", "version": "1.0.0"}` return kare. Uvicorn se chalaao aur `/docs` page visit karo.

### Exercise 2: Multiple Routes

In endpoints ko add karo:
- `GET /health` -- `{"status": "healthy"}` return kare
- `GET /about` -- `{"app": "My API", "author": "Your Name"}` return kare
- `/docs` visit karke verify karo teen endpoints dikh rahe hain

### Exercise 3: Async Endpoint

Ek async endpoint banao `GET /slow` jo `asyncio.sleep(2)` use karke slow operation simulate kare, phir `{"message": "Done waiting"}` return kare. Test karo ki dusray endpoints jab `/slow` processing ho raha tab bhi fast respond kar rahe hain.

```python
import asyncio

@app.get("/slow")
async def slow_endpoint():
    await asyncio.sleep(2)
    return {"message": "Done waiting"}
```

### Exercise 4: App Configuration

FastAPI app custom title, description, aur version ke saath banao. ReDoc documentation endpoint disable karo. Terms of service URL aur contact information add karo:

```python
app = FastAPI(
    title="...",
    description="...",
    version="...",
    redoc_url=None,
    terms_of_service="https://example.com/terms",
    contact={
        "name": "Your Name",
        "email": "you@example.com",
    },
)
```

### Exercise 5: Express to FastAPI Translation

Is Express app ko FastAPI mein translate karo:

```javascript
const express = require('express');
const app = express();
app.use(express.json());

app.get('/api/greeting/:name', (req, res) => {
  const { name } = req.params;
  const lang = req.query.lang || 'en';

  const greetings = { en: 'Hello', es: 'Hola', fr: 'Bonjour' };
  const greeting = greetings[lang] || greetings['en'];

  res.json({ greeting: `${greeting}, ${name}!` });
});

app.listen(3000);
```

**Hint**: FastAPI mein path parameters `{name}` use hote hain, aur query parameters function parameters hote hain default values ke saath.
