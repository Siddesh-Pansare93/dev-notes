# Serving a Chain/Agent Behind an API Server

🟡 Intermediate

Ab tak humne apne chains aur agents ko Jupyter notebook ya ek Python script ke andar `.invoke()` / `.stream()` karke test kiya hai. Lekin production mein koi bhi user Python script nahi chalata — woh ek **frontend** (React app, mobile app, ya koi aur service) use karta hai jo tumhare backend ko HTTP request bhejta hai.

Toh sawaal yeh hai: **apna LangChain chain ya LangGraph agent ek asli, deployable API server ke peeche kaise chalayein?**

Is chapter mein hum yeahi karenge — FastAPI use karke.

> [!info]
> Agar tum Node.js/Express background se aa rahe ho, toh yeh chapter tumhe bahut familiar lagega. FastAPI, Express ka hi Python version hai — bas thoda zyada type-safe aur async-first.

---

## Kya hota hai? Kyun zaruri hai?

Socho tum Zomato jaisa ek "AI food assistant" bana rahe ho jo restaurants suggest karta hai. Tumhara LangChain agent bahut accha kaam karta hai jab tum usse local script mein call karte ho:

```python
response = agent.invoke({"messages": [("human", "Suggest me a biryani place near Andheri")]})
```

Lekin real duniya mein:
- Frontend (React Native app) ko yeh function directly call karne ki permission nahi honi chahiye (API keys leak ho jayengi, rate limiting nahi hogi, security nahi hogi).
- Hazaaron users ek saath request bhejenge — tumhe **concurrency** handle karni padegi.
- User chahta hai response type-by-type (jaise ChatGPT mein) dikhe, poora paragraph ek saath nahi — isliye **streaming** chahiye.
- Request/response ka shape fix hona chahiye taaki frontend developer confidently kaam kar sake — isliye **schema validation** chahiye (Pydantic, jaise Node mein Zod).

Yehi sab problems FastAPI + LangChain ka combo solve karta hai:

```
Frontend (React, Flutter, etc.)
    ↓ HTTP / SSE / WebSocket
FastAPI server  (Express.js ka Python cousin)
    ↓ ainvoke() / astream()
LangChain chain  ya  LangGraph agent
    ↓ API calls
LLM providers (OpenAI, Anthropic, ...)
```

**FastAPI kyun best fit hai LangChain ke saath:**

| Feature | Kya faayda |
|---|---|
| Async-native (`asyncio`) | LangChain ke `ainvoke`/`astream` methods ke saath perfectly match karta hai — koi thread blocking nahi |
| Pydantic models | Request/response validation, bilkul Zod schema jaisa Express mein |
| `StreamingResponse` | SSE (Server-Sent Events) ke liye built-in support — token-by-token streaming |
| Auto docs | Type annotations se automatically Swagger UI ban jaata hai — free API documentation |
| Performance | Python ke sabse fast web frameworks mein se ek (Starlette + Uvicorn ke upar) |

---

## Setup

### Installation

```bash
pip install fastapi uvicorn langchain langchain-openai langgraph python-dotenv
```

### Sabse simple example: Chain ko endpoint banao

Pehle ek basic chain lete hain aur usse ek POST endpoint bana dete hain.

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

# --- LangChain setup (ye ek baar startup pe hi banta hai, request pe nahi) ---
model = ChatOpenAI(model="gpt-4o-mini", temperature=0)
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant. Be concise."),
    ("human", "{question}"),
])
chain = prompt | model | StrOutputParser()

# --- Request/Response schemas (Zod schema ka Python version) ---
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

Run karo:

```bash
uvicorn main:app --reload --port 8000
```

Test karo:

```bash
curl -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "What is Python?"}'

# Response: {"answer": "Python is a high-level programming language..."}
```

> [!tip]
> `--reload` flag dev ke time helpful hai (jaise Node mein `nodemon`), production mein iska use mat karo.

### Express ke saath side-by-side comparison

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
# FastAPI equivalent -- structure lagbhag identical hai
@app.post("/ask")
async def ask(request: QuestionRequest):
    answer = await chain.ainvoke({"question": request.question})
    return {"answer": answer}
```

Farak sirf itna hai: FastAPI mein `req.body` ki jagah type-annotated function parameter use hota hai (`request: QuestionRequest`), aur validation automatic ho jaata hai — agar `question` field missing hai ya galat type ki hai, FastAPI khud hi `422 Unprocessable Entity` error de dega, tumhe manually check karne ki zaroorat nahi.

---

## Request/Response Schemas — Pydantic ka Deep Dive

Zomato ke API design karte waqt agar tum bolo "order request mein `restaurant_id` aur `items` chahiye", toh Pydantic model isko enforce karta hai:

```python
from pydantic import BaseModel, Field
from typing import Literal

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="User ka message")
    session_id: str = Field(default="default", description="Conversation ko track karne ke liye")
    model: Literal["gpt-4o-mini", "gpt-4o"] = "gpt-4o-mini"
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    stream: bool = False

class ChatResponse(BaseModel):
    response: str
    session_id: str
    tokens_used: int | None = None
```

Kya faayda hua isse:
- `min_length=1` ka matlab khaali message allowed nahi — validation error automatically.
- `ge=0.0, le=2.0` — temperature range ke bahar value dogi toh reject ho jayegi.
- `Literal[...]` — sirf specific model names allowed, typo pakad liya jayega.
- Swagger docs (`http://localhost:8000/docs`) mein yeh sab automatically documented dikhega — frontend developer ko poochne ki zaroorat nahi padegi ki "bhai request body mein kya bhejna hai".

> [!warning]
> Pydantic validation sirf **shape** check karta hai (types, ranges), business logic nahi. Jaise "user ke paas is model tak access hai ya nahi" — woh check tumhe endpoint ke andar manually karna padega.

---

## Streaming Responses — SSE (Server-Sent Events)

Yeh is chapter ka sabse important pattern hai. ChatGPT jaisa UI banana hai jahan response token-by-token type ho, poora paragraph ek saath nahi aaye — uske liye **streaming** chahiye.

### Kya hota hai SSE?

SSE ek simple HTTP-based protocol hai jahan server client ko continuously chhote-chhote "events" bhejta rehta hai, ek hi connection pe, bina connection close kiye. WebSocket se simpler hai kyunki yeh **one-directional** hai (server → client) aur plain HTTP ke upar chalta hai — koi special protocol upgrade nahi chahiye.

```
data: {"token": "Once"}

data: {"token": " upon"}

data: {"token": " a"}

data: {"done": true}

```

Har event `data: <payload>\n\n` format mein hota hai — do newlines se event separate hota hai.

### Chain ko SSE endpoint pe stream karo

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
        # Stream khatam hone ka signal
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

**Yahan kya ho raha hai, step-by-step:**
1. `event_generator()` ek **async generator** hai — `async def` + `yield` combo. Har `yield` ek naya SSE event bhejta hai.
2. `chain.astream(...)` LangChain ka async streaming method hai — jaise-jaise LLM tokens generate karta hai, waise-waise yeh unhe yield karta jaata hai.
3. `StreamingResponse` FastAPI ka special response type hai jo generator ko consume karke HTTP response body mein chunk-by-chunk bhejta hai.
4. `media_type="text/event-stream"` browser ko batata hai ki yeh SSE stream hai.

### LangGraph agent ko stream karna

Agar tumhare paas simple chain nahi balki ek LangGraph agent hai (jisme tool calls, multiple steps hote hain), toh streaming thoda alag dikhta hai — kyunki agent ke andar multiple "events" hote hain (tool call shuru hua, tool ka result aaya, LLM token aaya, waghera).

```python
"""
agent_streaming.py -- Stream a LangGraph agent's execution over SSE.
"""
from dotenv import load_dotenv
load_dotenv()

import json
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent

app = FastAPI()

@tool
def get_weather(city: str) -> str:
    """Get the current weather for a city."""
    # Real app mein yahan actual weather API call hoga
    return f"{city} mein aaj mausam suhana hai, 28°C."

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)
agent = create_react_agent(model, tools=[get_weather])

class AgentRequest(BaseModel):
    message: str

@app.post("/agent/stream")
async def agent_stream(request: AgentRequest):
    """Stream agent execution: tool calls + final tokens, dono."""

    async def event_generator():
        async for event in agent.astream_events(
            {"messages": [("human", request.message)]},
            version="v2",
        ):
            kind = event["event"]

            # LLM se aa raha har naya token
            if kind == "on_chat_model_stream":
                chunk = event["data"]["chunk"]
                if chunk.content:
                    yield f"data: {json.dumps({'type': 'token', 'content': chunk.content})}\n\n"

            # Jab agent koi tool call kare
            elif kind == "on_tool_start":
                yield f"data: {json.dumps({'type': 'tool_start', 'tool': event['name'], 'input': event['data'].get('input')})}\n\n"

            # Jab tool ka result aaye
            elif kind == "on_tool_end":
                yield f"data: {json.dumps({'type': 'tool_end', 'tool': event['name'], 'output': str(event['data'].get('output'))})}\n\n"

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
```

> [!tip]
> `astream_events` LangGraph/LangChain ka sabse powerful streaming API hai — yeh tumhe agent ke internal execution ke har step ka event deta hai (LLM tokens, tool start/end, chain start/end). Frontend pe isse "Agent is calling `get_weather`..." jaisa live status dikhana easy ho jaata hai — bilkul jaise Swiggy app mein order status "Preparing → Out for delivery → Delivered" dikhata hai.

### Frontend mein SSE consume karna

```javascript
// React/Next.js frontend
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
        const lines = text.split('\n').filter(line => line.startsWith('data: '));
        for (const line of lines) {
            const data = JSON.parse(line.slice(6));
            if (data.done) break;
            fullResponse += data.token;
            setMessage(prev => prev + data.token); // UI update
        }
    }
}
```

`EventSource` bhi use kar sakte ho (simpler, lekin sirf GET requests ke liye):

```javascript
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

> [!warning]
> `EventSource` sirf GET requests support karta hai aur custom headers (jaise `Authorization`) nahi bhej sakta. Agar tumhe POST body ya auth headers chahiye, `fetch` + `ReadableStream` (upar wala pattern) use karo.

---

## WebSocket — Bidirectional Streaming ka Alternative

SSE sirf server → client direction mein data bhejta hai. Agar tumhe **bidirectional** communication chahiye — jaise user beech mein message type kare while agent abhi bhi pichhle response pe kaam kar raha hai — toh WebSocket better fit hai.

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
    """WebSocket connections manage karta hai (socket.io ke rooms jaisa)."""

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
        if len(history) > 20:  # sirf last 20 messages rakho
            self.histories[client_id] = history[-20:]

manager = ConnectionManager()

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            user_input = message.get("content", "")

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

            await websocket.send_text(json.dumps({
                "type": "done",
                "full_content": full_response,
            }))

            manager.add_to_history(client_id, user_input, full_response)

    except WebSocketDisconnect:
        manager.disconnect(client_id)
```

```javascript
// Frontend WebSocket client
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

**SSE vs WebSocket — kab kya use karein:**

| | SSE | WebSocket |
|---|---|---|
| Direction | Server → Client only | Dono directions |
| Protocol | Plain HTTP | Special upgrade (ws://) |
| Reconnect | Browser automatically retry karta hai | Manual reconnect logic likhni padti hai |
| Use case | Chat responses stream karna, notifications | Interactive chat jahan user beech mein interrupt kare, collaborative features |
| Load balancer friendly | Zyada (stateless HTTP) | Thoda tricky (sticky sessions chahiye ho sakte hain) |

Zyadatar chat-completion type use cases (jaise ChatGPT-style UI) ke liye **SSE hi kaafi hai** — simpler hai aur infra ke saath better chalta hai.

---

## Concurrent Requests Handle Karna

Yeh sabse important production concern hai — jab ek saath sau users request bhejenge, tumhara server crash nahi hona chahiye ya ek user ka response dusre ke saath mix nahi hona chahiye.

### 1. `async def` use karo, `def` nahi

```python
# GALAT — yeh sync function hai, poore event loop ko block kar dega
@app.post("/ask")
def ask(request: QuestionRequest):
    answer = chain.invoke({"question": request.question})  # blocking call
    return {"answer": answer}

# SAHI — async function, event loop free rehta hai dusre requests handle karne ke liye
@app.post("/ask")
async def ask(request: QuestionRequest):
    answer = await chain.ainvoke({"question": request.question})  # non-blocking
    return {"answer": answer}
```

Socho ek dabbawala ka system — agar ek dabbawala ek hi customer ke ghar ruk ke wait kare jab tak woh khaana khatam na kar le, toh baaki sab dabbe deliver hi nahi honge. `async`/`await` ka matlab hai: "LLM se response ka wait karte waqt, main dusre requests handle kar sakta hoon."

> [!warning]
> Agar galti se `invoke()` (sync) ko `async def` endpoint ke andar bina `await` ke call kar diya, toh woh call poore event loop ko block kar degi aur saare concurrent requests slow ho jayenge — bahut common mistake hai yeh.

### 2. Har request apna khud ka state rakhe, global mutable state shared mat karo

```python
# GALAT — global variable sab requests ke beech share hota hai, race condition ban sakti hai
current_answer = ""

@app.post("/ask")
async def ask(request: QuestionRequest):
    global current_answer
    current_answer = await chain.ainvoke({"question": request.question})
    return {"answer": current_answer}
```

```python
# SAHI — local variable, har request ka apna isolated scope
@app.post("/ask")
async def ask(request: QuestionRequest):
    answer = await chain.ainvoke({"question": request.question})
    return {"answer": answer}
```

Session/conversation history jaisa cross-request state chahiye ho toh usse ek proper store (Redis, database) mein rakho, plain Python dictionary sirf demo/learning ke liye theek hai:

```python
# Demo ke liye theek hai, production mein Redis use karo
sessions: dict[str, list] = {}
```

Agar tum in-memory dict use kar rahe ho aur multiple `--workers` ke saath server chala rahe ho (jo production mein normal hai), toh problem hogi — kyunki har worker process ka apna alag memory hota hai! User ka request worker-1 pe gaya, session save hua, agli baar request worker-2 pe gaya — session missing milega. Isliye:

> [!warning]
> Multi-worker production deployment mein in-memory session store **kaam nahi karega reliably**. Redis ya koi shared database use karo session/conversation state ke liye.

### 3. LLM client ko ek hi baar banao, har request pe nahi

```python
# GALAT — har request pe naya client banana costly hai (connection setup overhead)
@app.post("/ask")
async def ask(request: QuestionRequest):
    model = ChatOpenAI(model="gpt-4o-mini")  # har baar naya banega!
    ...

# SAHI — module level pe ek baar banao, saari requests reuse karengi
model = ChatOpenAI(model="gpt-4o-mini")  # startup pe ek baar

@app.post("/ask")
async def ask(request: QuestionRequest):
    answer = await chain.ainvoke({"question": request.question})
    ...
```

`ChatOpenAI` client internally HTTP connection pooling karta hai — ek hi instance reuse karna zyada efficient hai, jaise Zomato app apna network connection baar-baar reconnect nahi karta har order ke liye.

### 4. Rate limiting aur timeout laga do

```python
import asyncio
from fastapi import FastAPI, HTTPException
from collections import defaultdict
import time

app = FastAPI()

# Simple in-memory rate limiter (production mein Redis use karo)
request_counts: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT = 10  # per minute per client

def check_rate_limit(client_ip: str):
    now = time.time()
    request_counts[client_ip] = [t for t in request_counts[client_ip] if now - t < 60]
    if len(request_counts[client_ip]) >= RATE_LIMIT:
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    request_counts[client_ip].append(now)

@app.post("/ask")
async def ask(request: QuestionRequest):
    try:
        answer = await asyncio.wait_for(
            chain.ainvoke({"question": request.question}),
            timeout=30.0,  # 30 second se zyada wait mat karo
        )
        return {"answer": answer}
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Request timed out")
```

Bina rate limit ke, ek user 1000 requests bhej ke tumhara poora OpenAI budget khatam kar sakta hai — Zomato agar bina limit ke free delivery deta rehta toh company hi doob jaati.

### 5. Multiple worker processes chalao (production)

```bash
# 4 worker processes -- CPU cores ke hisaab se adjust karo
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

Har worker apna alag Python process hai — agar ek request CPU-heavy kaam kare (rare hai LLM apps mein kyunki mostly I/O-bound hote hain), toh dusre workers phir bhi requests serve karte rahenge.

---

## Error Handling

Production API mein raw exception kabhi user tak nahi pahunchni chahiye (security risk + bad UX). Structured error handling zaroori hai.

```python
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from langchain_core.exceptions import OutputParserException
import logging

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

    except OutputParserException:
        raise AppError(
            message="Failed to parse LLM output. Please rephrase your question.",
            status_code=422,
        )
    except Exception as e:
        # Poora error internally log karo, debugging ke liye
        logging.error(f"Chain failed: {e}", exc_info=True)
        # User ko sirf safe, generic message do
        raise AppError(
            message="An error occurred processing your request.",
            status_code=500,
        )
```

> [!tip]
> Kabhi bhi raw exception message (`str(e)`) directly user ko mat bhejo — usmein internal file paths, API keys ke hints, ya stack traces leak ho sakte hain. Log poora error server-side, user ko simple friendly message do.

---

## Background Processing — Long-Running Agents ke liye

Agent ya RAG pipeline jab multiple tool calls karta hai, toh 10-30+ seconds lag sakte hain. Aisi cheezon ke liye HTTP request ko itni der block rakhna sahi nahi (browser bhi timeout kar sakta hai). Background task pattern use karo — request turant `task_id` return kare, phir client poll kare status ke liye.

```python
"""
background.py -- Background processing for long-running chains.
"""
from dotenv import load_dotenv
load_dotenv()

import uuid
from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

app = FastAPI()

# In-memory task store (production mein Redis/database use karo)
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
    """Background mein chain chalane wala task."""
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
    task_id = str(uuid.uuid4())
    tasks[task_id] = {"status": "pending", "result": None, "error": None}
    background_tasks.add_task(run_research, task_id, request.topic)
    return TaskStatus(task_id=task_id, status="pending")

@app.get("/research/{task_id}", response_model=TaskStatus)
async def get_research_status(task_id: str):
    if task_id not in tasks:
        return TaskStatus(task_id=task_id, status="not_found")
    task = tasks[task_id]
    return TaskStatus(task_id=task_id, status=task["status"], result=task["result"], error=task["error"])
```

Frontend polling pattern — bilkul aise jaise Swiggy app order status ke liye kabhi-kabhi poll karta hai:

```javascript
async function startResearch(topic) {
    const { task_id } = await fetch('/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
    }).then(r => r.json());

    while (true) {
        const status = await fetch(`/research/${task_id}`).then(r => r.json());
        if (status.status === 'completed') return status.result;
        if (status.status === 'failed') throw new Error(status.error);
        await new Promise(r => setTimeout(r, 1000)); // 1 second wait
    }
}
```

> [!info]
> FastAPI ka `BackgroundTasks` heavy/long-running workloads ke liye single-server setups mein theek hai. Bade production systems mein isko Celery, RQ, ya proper task queue (jaise AWS SQS + workers) se replace kar dete hain, taaki server restart hone pe bhi task lost na ho.

---

## Complete Example: Chat API with Memory

Ab sab kuch jodkar ek poora production-style chat API banate hain — session-based memory, streaming, aur CORS ke saath.

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

# CORS -- frontend se cross-origin requests allow karne ke liye
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Apni frontend URL yahan daalo
    allow_methods=["*"],
    allow_headers=["*"],
)

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

# Session store (production mein Redis)
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
            {"role": "human" if isinstance(m, HumanMessage) else "ai", "content": m.content}
            for m in history
        ],
    }

@app.delete("/sessions/{session_id}")
async def clear_session(session_id: str):
    sessions.pop(session_id, None)
    return {"status": "cleared", "session_id": session_id}
```

---

## Production Deployment

### Dockerfile

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Root user se mat chalao -- security best practice
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

# Security: zaroori env vars set hain ya nahi validate karo
required_vars = ["OPENAI_API_KEY"]
missing = [v for v in required_vars if not os.getenv(v)]
if missing:
    raise RuntimeError(f"Missing environment variables: {missing}")

# Performance: model ko production ke hisaab se configure karo
MODEL_CONFIG = {
    "model": os.getenv("LLM_MODEL", "gpt-4o-mini"),
    "temperature": 0,
    "max_tokens": int(os.getenv("MAX_TOKENS", "1000")),
    "timeout": int(os.getenv("LLM_TIMEOUT", "30")),
    "max_retries": 2,
}
```

**Production ke liye final checklist:**

- [ ] `async def` + `ainvoke`/`astream` — kabhi bhi sync `invoke` async endpoint ke andar mat use karo
- [ ] LLM client aur chain module-level pe ek hi baar banao
- [ ] Session/conversation state Redis mein rakho, agar multiple workers use kar rahe ho
- [ ] Har external call pe timeout laga do (`asyncio.wait_for`)
- [ ] Rate limiting (per-user/per-IP) laga do taaki cost explode na ho
- [ ] Raw exceptions kabhi client ko mat bhejo — generic error message + server-side logging
- [ ] CORS sirf apne trusted frontend origins ke liye allow karo, `*` production mein risky hai
- [ ] `--workers N` (N = CPU cores) se multiple processes chalao
- [ ] Non-root user se container chalao
- [ ] Health check endpoint (`/health`) rakho load balancer ke liye

---

## Common Mistakes (Gotchas)

1. **`def` ki jagah `async def` bhool jaana** — sync function poore event loop ko block kar dega, saare concurrent requests slow ho jayenge.
2. **Har request pe naya LLM client banana** — costly aur unnecessary. Module-level pe ek baar banao.
3. **In-memory session store multi-worker setup ke saath** — Redis ke bina session state worker processes ke beech share nahi hoga.
4. **SSE stream mein error handling bhool jaana** — agar `astream()` beech mein fail ho jaaye, client ko kabhi `done` event nahi milega aur woh hamesha ke liye wait karta rahega. Try/except lagao generator ke andar aur error event bhejo.
5. **Timeout na lagana** — ek slow LLM call poori request ko hang kar sakti hai; hamesha `asyncio.wait_for` use karo.
6. **CORS mein `allow_origins=["*"]` production mein rakhna** — security risk, sirf apne known frontend domains allow karo.

```python
# Better SSE error handling
async def event_generator():
    try:
        async for chunk in chain.astream({"question": request.question}):
            yield f"data: {json.dumps({'token': chunk})}\n\n"
    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"
    finally:
        yield f"data: {json.dumps({'done': True})}\n\n"
```

---

## Practice Exercises

1. **Basic chat API** — `POST /chat` (non-streaming), `POST /chat/stream` (SSE), `GET /health` banao. Ek simple HTML+JS page banao jo streaming endpoint se connect karke tokens live dikhaye.
2. **LangGraph agent + SSE** — is chapter ka `agent_streaming.py` example lo, ek naya tool add karo (jaise `get_stock_price`), aur verify karo ki `on_tool_start`/`on_tool_end` events sahi se stream ho rahe hain.
3. **Concurrency test** — apne `/chat/stream` endpoint pe `curl` ya `httpx` se 20 parallel requests bhejo (ek script se), verify karo ki koi bhi request dusre ka response corrupt nahi kar rahi.
4. **Background research API** — `POST /analyze` (background task start kare) aur `GET /analyze/{task_id}` (poll kare) banao, jisme progress percentage bhi track ho.
5. **Full-stack chat app** — FastAPI backend (streaming + session memory) + simple HTML/React frontend jisme message history dikhe, session persist ho, aur "Clear Chat" button ho. Yeh is chapter ka capstone exercise hai.

---

## Key Takeaways

- FastAPI, LangChain chains/agents ko production API ke roop mein expose karne ka natural choice hai — async-native, Pydantic validation, aur built-in streaming support ke saath.
- Hamesha `async def` + `ainvoke()`/`astream()` use karo endpoints mein, kabhi bhi sync `invoke()` ko async route ke andar mat call karo — warna event loop block ho jaata hai aur concurrency toot jaati hai.
- SSE (`StreamingResponse` + `text/event-stream`) chat-style token streaming ke liye best default hai; WebSocket sirf tab chahiye jab true bidirectional communication chahiye ho.
- LangGraph agents ko stream karne ke liye `astream_events(version="v2")` use karo — isse tumhe token, tool-start, aur tool-end sab granular events milte hain.
- Pydantic request/response models Zod schemas jaise kaam karte hain — validation automatic hai aur Swagger docs bhi free mein milte hain.
- Concurrent requests safely handle karne ke liye: LLM client ko ek baar banao, per-request local state rakho, aur multi-worker deployments mein session state Redis jaisi shared store mein rakho, in-memory dict mein nahi.
- Long-running agent/RAG pipelines ke liye `BackgroundTasks` + polling pattern use karo taaki HTTP request timeout na ho.
- Production mein hamesha: timeout + rate limiting + generic error messages + CORS restriction + multiple workers + non-root Docker user — yeh sab non-negotiable checklist items hain.
