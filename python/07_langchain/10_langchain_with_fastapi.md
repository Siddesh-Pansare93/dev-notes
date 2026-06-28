# 10 - LangChain with FastAPI

## Why FastAPI + LangChain?

FastAPI is the Python equivalent of Express.js -- a web framework for building APIs. It is the natural choice for serving LangChain applications because:

- **Async native** -- FastAPI is built on `asyncio`, just like LangChain's async methods
- **Type validation** -- Pydantic models for request/response (like Zod + Express)
- **Streaming** -- Built-in `StreamingResponse` for SSE (Server-Sent Events)
- **Auto-docs** -- Swagger UI generated from type annotations (no extra setup)
- **Performance** -- One of the fastest Python web frameworks

```
Frontend (React, etc.)
    ↓ HTTP / SSE / WebSocket
FastAPI server
    ↓ invoke / stream
LangChain (chains, agents, RAG)
    ↓ API calls
LLM providers (OpenAI, Anthropic)
```

---

## Basic Setup

### Installation

```bash
pip install fastapi uvicorn langchain langchain-openai python-dotenv
```

### Minimal FastAPI + LangChain app

```python
"""
main.py -- Basic FastAPI + LangChain server.
"""
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from pydantic import BaseModel
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

# --- FastAPI app ---
app = FastAPI(title="LangChain API", version="1.0.0")

# --- LangChain setup ---
model = ChatOpenAI(model="gpt-4o-mini", temperature=0)
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant. Be concise."),
    ("human", "{question}"),
])
chain = prompt | model | StrOutputParser()

# --- Request/Response models (like Zod schemas in Express) ---
class QuestionRequest(BaseModel):
    question: str

class AnswerResponse(BaseModel):
    answer: str

# --- Routes ---
@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/ask", response_model=AnswerResponse)
async def ask(request: QuestionRequest):
    answer = await chain.ainvoke({"question": request.question})
    return AnswerResponse(answer=answer)
```

### Run the server

```bash
uvicorn main:app --reload --port 8000
```

### Test it

```bash
curl -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "What is Python?"}'

# Response: {"answer": "Python is a high-level programming language..."}
```

### Node.js / Express comparison

```javascript
// Express equivalent
const app = express();
app.post('/ask', async (req, res) => {
    const { question } = req.body;
    const answer = await chain.invoke({ question });
    res.json({ answer });
});
```

```python
# FastAPI equivalent -- nearly identical structure
@app.post("/ask")
async def ask(request: QuestionRequest):
    answer = await chain.ainvoke({"question": request.question})
    return {"answer": answer}
```

The main differences: FastAPI uses type-annotated function parameters instead of `req.body`, and `async def` with `await` instead of the JS equivalents (which look almost the same).

---

## Streaming LLM Responses via Server-Sent Events (SSE)

This is the most important pattern for chat UIs. Instead of waiting for the entire response, you stream tokens to the frontend as they are generated.

### SSE streaming endpoint

```python
"""
streaming.py -- Stream LLM responses as Server-Sent Events.
"""
from dotenv import load_dotenv
load_dotenv()

import json
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

app = FastAPI()

model = ChatOpenAI(model="gpt-4o-mini", temperature=0.7)
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant."),
    ("human", "{question}"),
])
chain = prompt | model | StrOutputParser()

class ChatRequest(BaseModel):
    question: str

@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """Stream the LLM response as Server-Sent Events."""

    async def event_generator():
        async for chunk in chain.astream({"question": request.question}):
            # SSE format: "data: <payload>\n\n"
            data = json.dumps({"token": chunk})
            yield f"data: {data}\n\n"
        # Signal the end of the stream
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )
```

### Frontend consumption (JavaScript)

```javascript
// In your React/Next.js frontend
async function streamChat(question) {
    const response = await fetch('http://localhost:8000/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        // Parse SSE format
        const lines = text.split('\n').filter(line => line.startsWith('data: '));
        for (const line of lines) {
            const data = JSON.parse(line.slice(6));
            if (data.done) break;
            fullResponse += data.token;
            // Update your UI here
            setMessage(prev => prev + data.token);
        }
    }
}
```

### Using EventSource (simpler but GET-only)

```javascript
// For GET endpoints, you can use EventSource
const evtSource = new EventSource('/chat/stream?question=Hello');
evtSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.done) {
        evtSource.close();
        return;
    }
    appendToken(data.token);
};
```

---

## WebSocket Streaming Alternative

WebSockets provide bidirectional communication -- useful for interactive chat where the user can interrupt or send follow-up messages during streaming.

```python
"""
websocket_chat.py -- WebSocket-based streaming chat.
"""
from dotenv import load_dotenv
load_dotenv()

import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import HumanMessage, AIMessage

app = FastAPI()

model = ChatOpenAI(model="gpt-4o-mini", temperature=0.7)
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant. Be conversational and friendly."),
    MessagesPlaceholder(variable_name="history"),
    ("human", "{input}"),
])
chain = prompt | model | StrOutputParser()

class ConnectionManager:
    """Manage WebSocket connections (like socket.io rooms)."""

    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}
        self.histories: dict[str, list] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        self.histories.setdefault(client_id, [])

    def disconnect(self, client_id: str):
        self.active_connections.pop(client_id, None)

    def get_history(self, client_id: str) -> list:
        return self.histories.get(client_id, [])

    def add_to_history(self, client_id: str, human_msg: str, ai_msg: str):
        history = self.histories.setdefault(client_id, [])
        history.append(HumanMessage(content=human_msg))
        history.append(AIMessage(content=ai_msg))
        # Keep only last 20 messages
        if len(history) > 20:
            self.histories[client_id] = history[-20:]

manager = ConnectionManager()

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message = json.loads(data)
            user_input = message.get("content", "")

            # Stream the response
            full_response = ""
            async for chunk in chain.astream({
                "input": user_input,
                "history": manager.get_history(client_id),
            }):
                full_response += chunk
                await websocket.send_text(json.dumps({
                    "type": "token",
                    "content": chunk,
                }))

            # Signal completion
            await websocket.send_text(json.dumps({
                "type": "done",
                "full_content": full_response,
            }))

            # Update history
            manager.add_to_history(client_id, user_input, full_response)

    except WebSocketDisconnect:
        manager.disconnect(client_id)
```

### Frontend WebSocket client

```javascript
// React / vanilla JS
const ws = new WebSocket(`ws://localhost:8000/ws/${userId}`);

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'token') {
        appendToken(data.content);
    } else if (data.type === 'done') {
        finishMessage(data.full_content);
    }
};

function sendMessage(content) {
    ws.send(JSON.stringify({ content }));
}
```

---

## Background Processing for Long-Running Chains

Agents and RAG pipelines can take 10-30+ seconds. Use background tasks to avoid blocking.

```python
"""
background.py -- Background processing for long-running chains.
"""
from dotenv import load_dotenv
load_dotenv()

import asyncio
import uuid
from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

app = FastAPI()

# In-memory task store (use Redis in production)
tasks: dict[str, dict] = {}

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)
chain = (
    ChatPromptTemplate.from_messages([
        ("system", "You are a thorough researcher. Write a detailed analysis."),
        ("human", "{topic}"),
    ])
    | model
    | StrOutputParser()
)

class ResearchRequest(BaseModel):
    topic: str

class TaskStatus(BaseModel):
    task_id: str
    status: str  # "pending", "running", "completed", "failed"
    result: str | None = None
    error: str | None = None

async def run_research(task_id: str, topic: str):
    """Background task that runs the chain."""
    tasks[task_id]["status"] = "running"
    try:
        result = await chain.ainvoke({"topic": topic})
        tasks[task_id]["status"] = "completed"
        tasks[task_id]["result"] = result
    except Exception as e:
        tasks[task_id]["status"] = "failed"
        tasks[task_id]["error"] = str(e)

@app.post("/research", response_model=TaskStatus)
async def start_research(request: ResearchRequest, background_tasks: BackgroundTasks):
    """Start a research task in the background."""
    task_id = str(uuid.uuid4())
    tasks[task_id] = {
        "status": "pending",
        "result": None,
        "error": None,
    }
    background_tasks.add_task(run_research, task_id, request.topic)
    return TaskStatus(task_id=task_id, status="pending")

@app.get("/research/{task_id}", response_model=TaskStatus)
async def get_research_status(task_id: str):
    """Poll for task completion."""
    if task_id not in tasks:
        return TaskStatus(task_id=task_id, status="not_found")
    task = tasks[task_id]
    return TaskStatus(
        task_id=task_id,
        status=task["status"],
        result=task["result"],
        error=task["error"],
    )
```

### Frontend polling pattern

```javascript
async function startResearch(topic) {
    // Start the task
    const { task_id } = await fetch('/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
    }).then(r => r.json());

    // Poll for completion
    while (true) {
        const status = await fetch(`/research/${task_id}`).then(r => r.json());
        if (status.status === 'completed') return status.result;
        if (status.status === 'failed') throw new Error(status.error);
        await new Promise(r => setTimeout(r, 1000)); // Wait 1 second
    }
}
```

---

## Error Handling

### Structured error handling

```python
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from langchain_core.exceptions import OutputParserException

app = FastAPI()

class AppError(Exception):
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code

@app.exception_handler(AppError)
async def app_error_handler(request, exc: AppError):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.message},
    )

@app.post("/ask")
async def ask(request: QuestionRequest):
    try:
        answer = await chain.ainvoke({"question": request.question})
        return {"answer": answer}

    except OutputParserException as e:
        raise AppError(
            message="Failed to parse LLM output. Please rephrase your question.",
            status_code=422,
        )
    except Exception as e:
        # Log the full error for debugging
        import logging
        logging.error(f"Chain failed: {e}", exc_info=True)

        # Return a safe error to the client
        raise AppError(
            message="An error occurred processing your request.",
            status_code=500,
        )
```

### Rate limiting and timeout

```python
import asyncio
from fastapi import FastAPI, HTTPException

app = FastAPI()

# Simple in-memory rate limiter (use Redis in production)
from collections import defaultdict
import time

request_counts: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT = 10  # requests per minute

def check_rate_limit(client_ip: str):
    now = time.time()
    # Remove old entries
    request_counts[client_ip] = [
        t for t in request_counts[client_ip] if now - t < 60
    ]
    if len(request_counts[client_ip]) >= RATE_LIMIT:
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    request_counts[client_ip].append(now)

@app.post("/ask")
async def ask(request: QuestionRequest):
    # Rate limit check would use request.client.host in production
    # check_rate_limit(request.client.host)

    try:
        answer = await asyncio.wait_for(
            chain.ainvoke({"question": request.question}),
            timeout=30.0,  # 30 second timeout
        )
        return {"answer": answer}
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Request timed out")
```

---

## Example: Chat API with Memory

```python
"""
chat_api.py -- Full chat API with session-based memory.
"""
from dotenv import load_dotenv
load_dotenv()

import json
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import HumanMessage, AIMessage

app = FastAPI(title="Chat API")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Your frontend URL
    allow_methods=["*"],
    allow_headers=["*"],
)

# LangChain setup
model = ChatOpenAI(model="gpt-4o-mini", temperature=0.7)
prompt = ChatPromptTemplate.from_messages([
    ("system", (
        "You are a helpful AI assistant. Be conversational, helpful, and concise. "
        "If you don't know something, say so."
    )),
    MessagesPlaceholder(variable_name="history"),
    ("human", "{input}"),
])
chain = prompt | model | StrOutputParser()

# Session store (use Redis in production)
sessions: dict[str, list] = {}
MAX_HISTORY = 20

class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"

class ChatResponse(BaseModel):
    response: str
    session_id: str

# --- Non-streaming endpoint ---
@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    history = sessions.get(request.session_id, [])

    response = await chain.ainvoke({
        "input": request.message,
        "history": history[-MAX_HISTORY:],
    })

    # Update session
    history.append(HumanMessage(content=request.message))
    history.append(AIMessage(content=response))
    sessions[request.session_id] = history

    return ChatResponse(response=response, session_id=request.session_id)

# --- Streaming endpoint ---
@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    history = sessions.get(request.session_id, [])

    async def generate():
        full_response = ""
        async for chunk in chain.astream({
            "input": request.message,
            "history": history[-MAX_HISTORY:],
        }):
            full_response += chunk
            yield f"data: {json.dumps({'token': chunk})}\n\n"

        # Update session after streaming completes
        history.append(HumanMessage(content=request.message))
        history.append(AIMessage(content=full_response))
        sessions[request.session_id] = history

        yield f"data: {json.dumps({'done': True, 'full_response': full_response})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")

# --- Session management ---
@app.get("/sessions/{session_id}/history")
async def get_history(session_id: str):
    history = sessions.get(session_id, [])
    return {
        "session_id": session_id,
        "messages": [
            {
                "role": "human" if isinstance(m, HumanMessage) else "ai",
                "content": m.content,
            }
            for m in history
        ],
    }

@app.delete("/sessions/{session_id}")
async def clear_session(session_id: str):
    sessions.pop(session_id, None)
    return {"status": "cleared", "session_id": session_id}
```

---

## Example: RAG API Endpoint

```python
"""
rag_api.py -- RAG API that answers questions from documents.
"""
from dotenv import load_dotenv
load_dotenv()

import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma

# --- Global state ---
vectorstore = None
rag_chain = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize resources on startup."""
    global vectorstore, rag_chain

    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
    vectorstore = Chroma(
        persist_directory="./rag_db",
        embedding_function=embeddings,
    )

    retriever = vectorstore.as_retriever(search_kwargs={"k": 4})
    model = ChatOpenAI(model="gpt-4o-mini", temperature=0)

    prompt = ChatPromptTemplate.from_messages([
        ("system", (
            "Answer the question based on the provided context. "
            "If the context doesn't contain enough information, say so. "
            "Always cite which document(s) you used.\n\n"
            "Context:\n{context}"
        )),
        ("human", "{question}"),
    ])

    def format_docs(docs):
        return "\n\n---\n\n".join(
            f"[{doc.metadata.get('source', 'unknown')}]\n{doc.page_content}"
            for doc in docs
        )

    rag_chain = (
        {"context": retriever | format_docs, "question": RunnablePassthrough()}
        | prompt
        | model
        | StrOutputParser()
    )

    yield  # App runs

    # Cleanup (if needed)


app = FastAPI(title="RAG API", lifespan=lifespan)

# --- Models ---
class QueryRequest(BaseModel):
    question: str
    top_k: int = Field(default=4, ge=1, le=10)

class QueryResponse(BaseModel):
    answer: str
    sources: list[str]

class IngestResponse(BaseModel):
    status: str
    chunks_added: int

# --- Endpoints ---
@app.post("/query", response_model=QueryResponse)
async def query(request: QueryRequest):
    """Answer a question using the document store."""
    if rag_chain is None:
        raise HTTPException(status_code=503, detail="RAG chain not initialized")

    # Get answer
    answer = await rag_chain.ainvoke(request.question)

    # Also get the source documents for the response
    docs = vectorstore.similarity_search(request.question, k=request.top_k)
    sources = list(set(
        doc.metadata.get("source", "unknown") for doc in docs
    ))

    return QueryResponse(answer=answer, sources=sources)

@app.post("/query/stream")
async def query_stream(request: QueryRequest):
    """Stream a RAG answer."""
    if rag_chain is None:
        raise HTTPException(status_code=503, detail="RAG chain not initialized")

    async def generate():
        async for chunk in rag_chain.astream(request.question):
            yield f"data: {json.dumps({'token': chunk})}\n\n"
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")

@app.post("/ingest", response_model=IngestResponse)
async def ingest_document(file: UploadFile = File(...)):
    """Upload and ingest a text document."""
    if vectorstore is None:
        raise HTTPException(status_code=503, detail="Vector store not initialized")

    # Read the uploaded file
    content = await file.read()
    text = content.decode("utf-8")

    # Split into chunks
    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    chunks = splitter.split_text(text)

    # Create documents with metadata
    from langchain_core.documents import Document
    docs = [
        Document(
            page_content=chunk,
            metadata={"source": file.filename, "chunk_index": i},
        )
        for i, chunk in enumerate(chunks)
    ]

    # Add to vector store
    vectorstore.add_documents(docs)

    return IngestResponse(status="success", chunks_added=len(docs))

@app.get("/documents")
async def list_documents():
    """List all indexed documents."""
    if vectorstore is None:
        raise HTTPException(status_code=503, detail="Vector store not initialized")

    # Get unique source filenames
    collection = vectorstore._collection
    results = collection.get(include=["metadatas"])
    sources = set()
    for meta in results.get("metadatas", []):
        if meta and "source" in meta:
            sources.add(meta["source"])

    return {"documents": sorted(sources), "total_chunks": len(results.get("ids", []))}
```

---

## Running in Production

### Dockerfile

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Don't run as root
RUN adduser --disabled-password appuser
USER appuser

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

### docker-compose.yml

```yaml
version: "3.8"
services:
  api:
    build: .
    ports:
      - "8000:8000"
    env_file:
      - .env
    volumes:
      - ./rag_db:/app/rag_db
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped
```

### Production checklist

```python
"""
production_config.py -- Production settings.
"""
import os

# Security: validate that required env vars are set
required_vars = ["OPENAI_API_KEY"]
missing = [v for v in required_vars if not os.getenv(v)]
if missing:
    raise RuntimeError(f"Missing environment variables: {missing}")

# Performance: configure model for production
MODEL_CONFIG = {
    "model": os.getenv("LLM_MODEL", "gpt-4o-mini"),
    "temperature": 0,
    "max_tokens": int(os.getenv("MAX_TOKENS", "1000")),
    "timeout": int(os.getenv("LLM_TIMEOUT", "30")),
    "max_retries": 2,
}
```

---

## Practice Exercises

### Exercise 1: Basic chat API
Build a FastAPI server with three endpoints:
- `POST /chat` -- non-streaming chat
- `POST /chat/stream` -- SSE streaming chat
- `GET /health` -- health check

Test both endpoints with `curl` or a tool like httpie. Then build a simple HTML page with JavaScript that connects to the streaming endpoint and displays tokens as they arrive.

### Exercise 2: RAG API
Build a RAG API with:
- `POST /ingest` -- upload a text file and add it to the vector store
- `POST /query` -- ask a question and get an answer with sources
- `GET /documents` -- list all indexed documents

Upload several text files and verify that queries return relevant answers with correct source attribution.

### Exercise 3: WebSocket chat
Implement the WebSocket chat server from this chapter. Build an HTML page that connects via WebSocket and implements a real-time chat UI with:
- Message display area
- Input field with send button
- Streaming token display
- Connection status indicator

### Exercise 4: Background processing
Build an API with background processing for expensive operations. Implement:
- `POST /analyze` -- starts a background analysis task
- `GET /analyze/{task_id}` -- polls for results
- Add a progress indicator that updates as the chain processes

### Exercise 5: Multi-model API
Create an API that supports multiple LLM providers. The client should be able to specify `model: "gpt-4o-mini"` or `model: "claude-sonnet"` in the request. Implement proper error handling for each provider and a fallback mechanism.

```python
class MultiModelRequest(BaseModel):
    message: str
    model: str = "gpt-4o-mini"  # or "claude-sonnet"
    stream: bool = False
```

### Exercise 6: Full-stack chat application
Build a complete chat application:
- **Backend:** FastAPI with streaming, session management, and conversation history
- **Frontend:** A simple HTML/JS chat interface (or use your React skills)
- **Features:** SSE streaming, message history display, session persistence, clear history button

This is the capstone exercise -- it combines everything from the entire LangChain course.
