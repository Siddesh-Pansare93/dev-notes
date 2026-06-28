# 01 - Introduction to FastAPI

## What is FastAPI?

FastAPI is a modern, high-performance Python web framework for building APIs. If you know Express.js and especially NestJS, you'll find FastAPI sits right in between -- it has the simplicity of Express with the structure and type-safety of NestJS, plus features neither of them offer out of the box.

### The Quick Comparison

| Feature | Express.js | NestJS | FastAPI |
|---|---|---|---|
| Type safety | Manual (TS helps) | Decorators + TS | Built-in via Pydantic |
| API docs | Manual (swagger-jsdoc) | @nestjs/swagger + decorators | **Automatic** from code |
| Validation | Manual (joi, zod, class-validator) | class-validator + pipes | **Automatic** from type hints |
| Async support | Native (Node.js) | Native (Node.js) | Native (asyncio) |
| Performance | Good | Good (Express under hood) | Excellent (Starlette + uvicorn) |
| Learning curve | Low | Medium-High | Low-Medium |
| Dependency injection | None built-in | Core feature | Core feature (Depends) |

### Key Selling Points for a Node.js Developer

1. **Automatic OpenAPI/Swagger docs** -- No more maintaining separate API documentation. FastAPI generates interactive docs from your code. No decorators needed, no swagger-jsdoc comments, no separate YAML files.

2. **Pydantic integration** -- Think of Pydantic as zod + class-validator combined, but integrated at the framework level. You define a model, and FastAPI automatically validates request bodies, query params, and serializes responses.

3. **Async support** -- Python's `async/await` works similarly to JavaScript's. FastAPI supports both sync and async handlers, so you can choose what fits.

4. **Performance** -- FastAPI is one of the fastest Python frameworks, comparable to Node.js and Go for I/O-bound workloads. It's built on Starlette (the ASGI framework) and Uvicorn (the ASGI server).

5. **Developer experience** -- Editor autocompletion works everywhere because everything is typed. Errors are caught before runtime.

---

## Installation

### Node.js Equivalent Mental Model

```
npm init -y          -->  python -m venv venv && source venv/bin/activate (or venv\Scripts\activate on Windows)
npm install express  -->  pip install "fastapi[standard]"
nodemon index.js     -->  uvicorn main:app --reload
```

### Actual Setup

```bash
# Create and activate a virtual environment (like having a project-local node_modules)
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

# Install FastAPI with all standard dependencies
pip install "fastapi[standard]"
```

The `[standard]` extra installs:
- `uvicorn` -- the ASGI server (like the Node.js HTTP server, but production-grade)
- `httpx` -- async HTTP client (like axios/fetch)
- `jinja2` -- templating (like ejs/handlebars)
- `python-multipart` -- form data parsing (like multer/body-parser)

### What is Uvicorn?

Uvicorn is an ASGI (Asynchronous Server Gateway Interface) server. Think of it as the equivalent of Node.js's built-in HTTP server, but as a standalone process.

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

That's it. Three lines of meaningful code. No `res.json()`, no manual serialization. FastAPI automatically converts the dict to JSON and sets the correct `Content-Type` header.

### Running It

```bash
uvicorn main:app --reload
```

Breaking this down:
- `main` -- the Python file name (`main.py`)
- `app` -- the FastAPI instance variable name
- `--reload` -- watch for file changes and restart (like nodemon)

The server starts at `http://127.0.0.1:8000` (port 8000 by default, not 3000).

### Specifying Host and Port

```bash
# Like: node index.js  (with PORT=3000 HOST=0.0.0.0)
uvicorn main:app --reload --host 0.0.0.0 --port 3000
```

---

## Auto-Generated Documentation

This is the feature that will blow your mind coming from Node.js. After running your app, open:

- **Swagger UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- **Raw OpenAPI JSON**: [http://127.0.0.1:8000/openapi.json](http://127.0.0.1:8000/openapi.json)

In Express, you'd need to install `swagger-ui-express`, `swagger-jsdoc`, write JSDoc comments or maintain a YAML file, and wire it all together. In NestJS, you need `@nestjs/swagger` with decorators on every DTO and controller.

In FastAPI, it just works. Every route, every parameter, every model you define automatically appears in the docs. You can even test endpoints directly from the Swagger UI.

### Customizing the Docs

```python
from fastapi import FastAPI

app = FastAPI(
    title="My Awesome API",
    description="A sample API for learning FastAPI",
    version="1.0.0",
    docs_url="/docs",        # Change Swagger UI path (default: /docs)
    redoc_url="/redoc",      # Change ReDoc path (default: /redoc)
    openapi_url="/openapi.json",  # Change OpenAPI schema path
)
```

To disable docs in production:

```python
import os

app = FastAPI(
    docs_url="/docs" if os.getenv("ENV") != "production" else None,
    redoc_url=None,  # Disable ReDoc entirely
)
```

---

## Async Support

FastAPI supports both sync and async route handlers. Python's `async/await` works very similarly to JavaScript's.

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

### When to Use Async vs Sync in FastAPI

```python
# Use async when doing I/O operations (database, HTTP calls, file I/O)
@app.get("/async-route")
async def async_route():
    data = await some_async_operation()
    return data

# Use sync for CPU-bound or simple operations
# FastAPI runs sync functions in a thread pool automatically!
@app.get("/sync-route")
def sync_route():
    # This won't block other requests -- FastAPI handles it
    return {"message": "This is fine"}
```

**Important difference from Node.js**: In Node.js, everything is async by nature. In Python, you choose. If you define a sync function, FastAPI runs it in a separate thread so it doesn't block the event loop. This is a nice safety net that Node.js doesn't have.

---

## A More Complete Example

```python
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Todo API", version="0.1.0")

# This is like a TypeScript interface + zod schema combined
class TodoCreate(BaseModel):
    title: str
    completed: bool = False

class TodoResponse(BaseModel):
    id: int
    title: str
    completed: bool

# In-memory "database" (just like you'd do in an Express tutorial)
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
    # We'll cover proper error handling later
    return {"error": "Not found"}
```

### The Express.js Equivalent Would Be

```javascript
const express = require('express');
const { z } = require('zod');
const app = express();
app.use(express.json());

// You'd need zod or joi for validation
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

Notice how in Express you have to:
1. Manually call `express.json()` middleware
2. Manually validate with zod/joi
3. Manually handle validation errors
4. Manually parse `req.params.todoId` to int
5. Manually set status codes on the response object

FastAPI handles all of this automatically. The `todo_id: int` type hint tells FastAPI to parse and validate the path parameter. The `todo: TodoCreate` parameter tells FastAPI to parse and validate the JSON body. Invalid requests get a detailed 422 error response automatically.

---

## Project Structure

For small projects, a single `main.py` is fine. For larger projects, you'll want something like this:

```
my_api/
├── app/
│   ├── __init__.py
│   ├── main.py          # FastAPI app creation, includes routers
│   ├── config.py         # Settings (like .env config)
│   ├── dependencies.py   # Shared dependencies
│   ├── models/           # SQLAlchemy models (like Prisma schema)
│   │   ├── __init__.py
│   │   └── user.py
│   ├── schemas/          # Pydantic models (like DTOs in NestJS)
│   │   ├── __init__.py
│   │   └── user.py
│   ├── routers/          # Route handlers (like controllers in NestJS)
│   │   ├── __init__.py
│   │   └── users.py
│   ├── services/         # Business logic
│   │   ├── __init__.py
│   │   └── user_service.py
│   └── utils/
│       └── __init__.py
├── tests/
│   ├── __init__.py
│   └── test_users.py
├── alembic/              # Database migrations
├── requirements.txt      # Like package.json dependencies
└── .env
```

### Comparison to NestJS Structure

| NestJS | FastAPI |
|---|---|
| `src/users/users.controller.ts` | `app/routers/users.py` |
| `src/users/users.service.ts` | `app/services/user_service.py` |
| `src/users/dto/create-user.dto.ts` | `app/schemas/user.py` |
| `src/users/entities/user.entity.ts` | `app/models/user.py` |
| `src/users/users.module.ts` | No equivalent (routers are included directly) |

---

## Practice Exercises

### Exercise 1: Hello API
Create a FastAPI app with a single GET endpoint at `/` that returns `{"message": "Hello from FastAPI", "version": "1.0.0"}`. Run it with uvicorn and visit the `/docs` page.

### Exercise 2: Multiple Routes
Add these endpoints to your app:
- `GET /health` -- returns `{"status": "healthy"}`
- `GET /about` -- returns `{"app": "My API", "author": "Your Name"}`
- Visit `/docs` and verify all three endpoints appear

### Exercise 3: Async Endpoint
Create an async endpoint `GET /slow` that uses `asyncio.sleep(2)` to simulate a slow operation, then returns `{"message": "Done waiting"}`. Test that other endpoints still respond quickly while `/slow` is processing.

```python
import asyncio

@app.get("/slow")
async def slow_endpoint():
    await asyncio.sleep(2)
    return {"message": "Done waiting"}
```

### Exercise 4: App Configuration
Create a FastAPI app with a custom title, description, and version. Disable the ReDoc documentation endpoint. Add a terms of service URL and contact information:

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
Translate this Express app to FastAPI:

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

**Hint**: Path parameters use `{name}` in FastAPI, and query parameters are just additional function parameters with default values.
