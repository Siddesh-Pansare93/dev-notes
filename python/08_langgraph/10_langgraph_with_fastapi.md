# 10 - LangGraph with FastAPI: Building Production Agent APIs

## Why FastAPI + LangGraph?

FastAPI is the Python equivalent of Express.js for building APIs -- fast, async-first, type-safe, and with automatic OpenAPI docs. Combined with LangGraph, you get a production-ready API for your AI agents.

**Express.js developer?** FastAPI will feel familiar:

| Express.js | FastAPI |
|---|---|
| `app.get("/path", handler)` | `@app.get("/path")` |
| `req.body` | Function parameters with type hints |
| Middleware | Dependencies |
| `res.json()` | Return a dict (auto-serialized) |
| TypeScript types | Pydantic models |
| async/await | async/await (same!) |

---

## Setup

```bash
pip install fastapi uvicorn langgraph langchain-openai sse-starlette
```

---

## Basic FastAPI Endpoint That Runs a Graph

```python
# app.py
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Annotated
from langchain_core.messages import HumanMessage, BaseMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, START, END, add_messages
from langgraph.checkpoint.memory import MemorySaver

app = FastAPI(title="LangGraph Agent API")

# --- Build the agent ---
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)


class AgentState(dict):
    messages: Annotated[list[BaseMessage], add_messages]


def chatbot(state: AgentState):
    return {"messages": [llm.invoke(state["messages"])]}


graph = StateGraph(AgentState)
graph.add_node("chatbot", chatbot)
graph.add_edge(START, "chatbot")
graph.add_edge("chatbot", END)

memory = MemorySaver()
agent = graph.compile(checkpointer=memory)


# --- API models ---
class ChatRequest(BaseModel):
    message: str
    thread_id: str = "default"


class ChatResponse(BaseModel):
    response: str
    thread_id: str
    message_count: int


# --- Endpoint ---
@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    config = {"configurable": {"thread_id": request.thread_id}}

    result = await agent.ainvoke(
        {"messages": [HumanMessage(content=request.message)]},
        config=config,
    )

    last_message = result["messages"][-1]
    return ChatResponse(
        response=last_message.content,
        thread_id=request.thread_id,
        message_count=len(result["messages"]),
    )
```

Run it:
```bash
uvicorn app:app --reload --port 8000
```

Test it:
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello! My name is Alex.", "thread_id": "user-123"}'

# Follow up on the same thread
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is my name?", "thread_id": "user-123"}'
```

Visit `http://localhost:8000/docs` for automatic Swagger UI.

---

## Streaming via Server-Sent Events (SSE)

SSE is the standard for streaming text responses from a server. It is what ChatGPT uses.

```python
# app.py
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Annotated
import json
import asyncio
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, START, END, add_messages
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.memory import MemorySaver

app = FastAPI(title="Streaming Agent API")

# --- Tools ---
@tool
def search(query: str) -> str:
    """Search for information."""
    return f"Search results for: {query}"

@tool
def calculator(expression: str) -> str:
    """Calculate a math expression."""
    return str(eval(expression))

tools = [search, calculator]

# --- Agent ---
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
llm_with_tools = llm.bind_tools(tools)


class AgentState(dict):
    messages: Annotated[list[BaseMessage], add_messages]


def agent_node(state: AgentState):
    return {"messages": [llm_with_tools.invoke(state["messages"])]}


def should_continue(state: AgentState):
    if state["messages"][-1].tool_calls:
        return "tools"
    return END


graph = StateGraph(AgentState)
graph.add_node("agent", agent_node)
graph.add_node("tools", ToolNode(tools))
graph.add_edge(START, "agent")
graph.add_conditional_edges("agent", should_continue)
graph.add_edge("tools", "agent")

memory = MemorySaver()
agent = graph.compile(checkpointer=memory)


# --- SSE Streaming Endpoint ---
class StreamRequest(BaseModel):
    message: str
    thread_id: str = "default"


async def event_generator(message: str, thread_id: str):
    """Generate SSE events from the agent stream."""
    config = {"configurable": {"thread_id": thread_id}}

    # Stream events for token-level output
    async for event in agent.astream_events(
        {"messages": [HumanMessage(content=message)]},
        config=config,
        version="v2",
    ):
        kind = event["event"]

        if kind == "on_chat_model_stream":
            token = event["data"]["chunk"].content
            if token:
                yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"

        elif kind == "on_tool_start":
            tool_name = event.get("name", "unknown")
            yield f"data: {json.dumps({'type': 'tool_start', 'tool': tool_name})}\n\n"

        elif kind == "on_tool_end":
            tool_name = event.get("name", "unknown")
            output = str(event["data"].get("output", ""))[:200]
            yield f"data: {json.dumps({'type': 'tool_end', 'tool': tool_name, 'result': output})}\n\n"

    yield f"data: {json.dumps({'type': 'done'})}\n\n"


@app.post("/chat/stream")
async def chat_stream(request: StreamRequest):
    return StreamingResponse(
        event_generator(request.message, request.thread_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        },
    )
```

### Client-Side (JavaScript)

```html
<!DOCTYPE html>
<html>
<head><title>Agent Chat</title></head>
<body>
  <div id="output" style="white-space: pre-wrap; font-family: monospace;"></div>
  <input id="input" type="text" placeholder="Type a message..." style="width: 400px;">
  <button onclick="send()">Send</button>

  <script>
    async function send() {
      const message = document.getElementById("input").value;
      const output = document.getElementById("output");
      output.textContent += `\nYou: ${message}\nAgent: `;

      const response = await fetch("/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, thread_id: "web-user-1" }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));
            if (data.type === "token") {
              output.textContent += data.content;
            } else if (data.type === "tool_start") {
              output.textContent += `\n[Using ${data.tool}...]`;
            } else if (data.type === "tool_end") {
              output.textContent += `\n[${data.tool} returned: ${data.result}]\n`;
            }
          }
        }
      }
      output.textContent += "\n";
    }
  </script>
</body>
</html>
```

---

## WebSocket Streaming for Real-Time Chat

WebSockets provide full-duplex communication, better for chat interfaces:

```python
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import json
from langchain_core.messages import HumanMessage, BaseMessage
from typing import Annotated
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, START, END, add_messages
from langgraph.checkpoint.memory import MemorySaver

app = FastAPI()

# Build agent (same as before, abbreviated)
llm = ChatOpenAI(model="gpt-4o-mini")

class AgentState(dict):
    messages: Annotated[list[BaseMessage], add_messages]

def chatbot(state: AgentState):
    return {"messages": [llm.invoke(state["messages"])]}

graph = StateGraph(AgentState)
graph.add_node("chatbot", chatbot)
graph.add_edge(START, "chatbot")
graph.add_edge("chatbot", END)
memory = MemorySaver()
agent = graph.compile(checkpointer=memory)


@app.websocket("/ws/chat/{thread_id}")
async def websocket_chat(websocket: WebSocket, thread_id: str):
    await websocket.accept()
    config = {"configurable": {"thread_id": thread_id}}

    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message = json.loads(data)

            # Stream agent response
            async for event in agent.astream_events(
                {"messages": [HumanMessage(content=message["content"])]},
                config=config,
                version="v2",
            ):
                if event["event"] == "on_chat_model_stream":
                    token = event["data"]["chunk"].content
                    if token:
                        await websocket.send_text(json.dumps({
                            "type": "token",
                            "content": token,
                        }))

            # Signal completion
            await websocket.send_text(json.dumps({"type": "done"}))

    except WebSocketDisconnect:
        print(f"Client disconnected from thread {thread_id}")
```

### WebSocket Client (JavaScript)

```javascript
const ws = new WebSocket("ws://localhost:8000/ws/chat/user-123");

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === "token") {
    process.stdout.write(data.content); // or append to DOM
  } else if (data.type === "done") {
    console.log("\n--- Response complete ---");
  }
};

ws.onopen = () => {
  ws.send(JSON.stringify({ content: "Hello, agent!" }));
};
```

---

## Thread Management API

Create endpoints for managing conversation threads:

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import uuid

app = FastAPI()

# ... agent setup ...


class ThreadInfo(BaseModel):
    thread_id: str
    message_count: int
    last_message: Optional[str] = None


@app.post("/threads", response_model=ThreadInfo)
async def create_thread():
    """Create a new conversation thread."""
    thread_id = str(uuid.uuid4())
    return ThreadInfo(thread_id=thread_id, message_count=0)


@app.get("/threads/{thread_id}", response_model=ThreadInfo)
async def get_thread(thread_id: str):
    """Get information about a thread."""
    config = {"configurable": {"thread_id": thread_id}}
    try:
        state = agent.get_state(config)
        messages = state.values.get("messages", [])
        last_msg = messages[-1].content if messages else None
        return ThreadInfo(
            thread_id=thread_id,
            message_count=len(messages),
            last_message=last_msg[:100] if last_msg else None,
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Thread not found")


@app.get("/threads/{thread_id}/messages")
async def get_thread_messages(thread_id: str):
    """Get all messages in a thread."""
    config = {"configurable": {"thread_id": thread_id}}
    try:
        state = agent.get_state(config)
        messages = state.values.get("messages", [])
        return [
            {"role": msg.type, "content": msg.content}
            for msg in messages
            if hasattr(msg, "content") and msg.content
        ]
    except Exception:
        raise HTTPException(status_code=404, detail="Thread not found")


@app.delete("/threads/{thread_id}")
async def delete_thread(thread_id: str):
    """Delete a conversation thread."""
    # With MemorySaver, you would need to implement deletion
    # With a database checkpointer, delete the rows
    return {"status": "deleted", "thread_id": thread_id}
```

---

## Human-in-the-Loop via API

The most complex pattern: an API that supports interrupted agents.

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, Any
import json
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from typing import Annotated
from langgraph.graph import StateGraph, START, END, add_messages
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.memory import MemorySaver

app = FastAPI(title="HITL Agent API")


# --- Agent with interrupt ---
@tool
def send_email(to: str, subject: str, body: str) -> str:
    """Send an email. This requires approval."""
    # In production, actually send the email
    return f"Email sent to {to} with subject '{subject}'"


@tool
def search(query: str) -> str:
    """Search for information. This is safe and auto-approved."""
    return f"Results for: {query}"


llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
tools = [send_email, search]
llm_with_tools = llm.bind_tools(tools)


class AgentState(dict):
    messages: Annotated[list[BaseMessage], add_messages]


def agent_node(state):
    return {"messages": [llm_with_tools.invoke(state["messages"])]}

def should_continue(state):
    if state["messages"][-1].tool_calls:
        return "tools"
    return END


graph = StateGraph(AgentState)
graph.add_node("agent", agent_node)
graph.add_node("tools", ToolNode(tools))
graph.add_edge(START, "agent")
graph.add_conditional_edges("agent", should_continue)
graph.add_edge("tools", "agent")

memory = MemorySaver()
agent = graph.compile(
    checkpointer=memory,
    interrupt_before=["tools"],  # Pause before any tool execution
)


# --- API Models ---
class ChatRequest(BaseModel):
    message: str
    thread_id: str


class ResumeRequest(BaseModel):
    thread_id: str
    approved: bool = True
    modified_args: Optional[dict] = None


class AgentResponse(BaseModel):
    thread_id: str
    response: Optional[str] = None
    pending_tools: Optional[list] = None
    status: str  # "complete", "waiting_approval", "error"


# --- Endpoints ---
@app.post("/chat", response_model=AgentResponse)
async def chat(request: ChatRequest):
    """Send a message. May return immediately or pause for tool approval."""
    config = {"configurable": {"thread_id": request.thread_id}}

    result = await agent.ainvoke(
        {"messages": [HumanMessage(content=request.message)]},
        config=config,
    )

    # Check if the graph is paused (waiting for tool approval)
    state = agent.get_state(config)
    if state.next:
        # Graph is paused -- extract pending tool calls
        last_msg = state.values["messages"][-1]
        pending = [
            {
                "tool": tc["name"],
                "args": tc["args"],
                "id": tc["id"],
            }
            for tc in (last_msg.tool_calls if hasattr(last_msg, "tool_calls") else [])
        ]
        return AgentResponse(
            thread_id=request.thread_id,
            pending_tools=pending,
            status="waiting_approval",
        )

    # Graph completed
    last_msg = result["messages"][-1]
    return AgentResponse(
        thread_id=request.thread_id,
        response=last_msg.content,
        status="complete",
    )


@app.post("/approve", response_model=AgentResponse)
async def approve(request: ResumeRequest):
    """Approve or reject pending tool calls, then resume the agent."""
    config = {"configurable": {"thread_id": request.thread_id}}

    state = agent.get_state(config)
    if not state.next:
        raise HTTPException(status_code=400, detail="No pending action to approve")

    if not request.approved:
        # Reject: skip the tool node by providing a fake response
        from langchain_core.messages import ToolMessage
        last_msg = state.values["messages"][-1]
        rejection_messages = [
            ToolMessage(
                content="Tool call rejected by user.",
                tool_call_id=tc["id"],
            )
            for tc in last_msg.tool_calls
        ]
        agent.update_state(config, {"messages": rejection_messages}, as_node="tools")

    # Resume execution
    result = await agent.ainvoke(None, config=config)

    # Check if paused again (agent might call more tools)
    state = agent.get_state(config)
    if state.next:
        last_msg = state.values["messages"][-1]
        pending = [
            {"tool": tc["name"], "args": tc["args"], "id": tc["id"]}
            for tc in (last_msg.tool_calls if hasattr(last_msg, "tool_calls") else [])
        ]
        return AgentResponse(
            thread_id=request.thread_id,
            pending_tools=pending,
            status="waiting_approval",
        )

    last_msg = result["messages"][-1]
    return AgentResponse(
        thread_id=request.thread_id,
        response=last_msg.content,
        status="complete",
    )


@app.get("/state/{thread_id}")
async def get_state(thread_id: str):
    """Inspect the current state of a thread."""
    config = {"configurable": {"thread_id": thread_id}}
    try:
        state = agent.get_state(config)
        return {
            "thread_id": thread_id,
            "next_nodes": list(state.next) if state.next else [],
            "message_count": len(state.values.get("messages", [])),
            "messages": [
                {"role": m.type, "content": m.content[:200] if m.content else None}
                for m in state.values.get("messages", [])
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))
```

### Testing the HITL Flow

```bash
# 1. Send a message that triggers a tool call
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Send an email to bob@example.com about the meeting", "thread_id": "t1"}'
# Response: {"status": "waiting_approval", "pending_tools": [{"tool": "send_email", ...}]}

# 2. Check state
curl http://localhost:8000/state/t1

# 3. Approve the tool call
curl -X POST http://localhost:8000/approve \
  -H "Content-Type: application/json" \
  -d '{"thread_id": "t1", "approved": true}'
# Response: {"status": "complete", "response": "I've sent the email to bob@example.com..."}

# Or reject:
curl -X POST http://localhost:8000/approve \
  -H "Content-Type: application/json" \
  -d '{"thread_id": "t1", "approved": false}'
```

---

## Error Handling and Timeouts

```python
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
import asyncio
import traceback

app = FastAPI()

# Global error handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc) if app.debug else "An error occurred",
        },
    )


@app.post("/chat")
async def chat(request: ChatRequest):
    config = {"configurable": {"thread_id": request.thread_id}}

    try:
        # Timeout: abort if agent takes too long
        result = await asyncio.wait_for(
            agent.ainvoke(
                {"messages": [HumanMessage(content=request.message)]},
                config=config,
            ),
            timeout=60.0,  # 60 second timeout
        )
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504,
            detail="Agent timed out after 60 seconds",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Agent error: {str(e)}",
        )

    last_msg = result["messages"][-1]
    return {"response": last_msg.content, "thread_id": request.thread_id}


# Health check
@app.get("/health")
async def health():
    return {"status": "ok"}
```

---

## Full Example: Production Chat Agent API

Bringing it all together -- a production-ready agent API with tool use, memory, streaming, and HITL:

```python
"""
Production LangGraph Agent API.
Run with: uvicorn main:app --host 0.0.0.0 --port 8000
"""
import json
import uuid
import asyncio
from typing import Annotated, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from langchain_core.messages import HumanMessage, AIMessage, BaseMessage, ToolMessage
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, START, END, add_messages
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.memory import MemorySaver


# ============================================================
# Tools
# ============================================================

@tool
def web_search(query: str) -> str:
    """Search the web for information. Use for current events, facts, and research."""
    return f"Search results for '{query}': [Simulated results about {query}]"


@tool
def calculator(expression: str) -> str:
    """Evaluate a mathematical expression. Use for any calculations."""
    try:
        result = eval(expression)
        return str(result)
    except Exception as e:
        return f"Calculation error: {e}"


@tool
def save_note(title: str, content: str) -> str:
    """Save a note for later reference."""
    return f"Note saved: '{title}'"


TOOLS = [web_search, calculator, save_note]


# ============================================================
# Agent Graph
# ============================================================

class AgentState(dict):
    messages: Annotated[list[BaseMessage], add_messages]


llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
llm_with_tools = llm.bind_tools(TOOLS)


def agent_node(state: AgentState) -> dict:
    system_message = {
        "role": "system",
        "content": "You are a helpful AI assistant with access to tools. "
                   "Be concise and helpful. Use tools when needed.",
    }
    messages = [system_message] + state["messages"]
    response = llm_with_tools.invoke(messages)
    return {"messages": [response]}


def should_continue(state: AgentState) -> str:
    last = state["messages"][-1]
    if hasattr(last, "tool_calls") and last.tool_calls:
        return "tools"
    return END


def build_agent():
    graph = StateGraph(AgentState)
    graph.add_node("agent", agent_node)
    graph.add_node("tools", ToolNode(TOOLS))
    graph.add_edge(START, "agent")
    graph.add_conditional_edges("agent", should_continue)
    graph.add_edge("tools", "agent")

    memory = MemorySaver()
    return graph.compile(checkpointer=memory)


AGENT = build_agent()


# ============================================================
# FastAPI App
# ============================================================

app = FastAPI(
    title="LangGraph Agent API",
    description="Production AI agent with tools, memory, and streaming",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Request/Response Models ---

class ChatRequest(BaseModel):
    message: str
    thread_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    thread_id: str
    message_count: int

class ThreadResponse(BaseModel):
    thread_id: str
    message_count: int
    messages: list[dict]


# --- Endpoints ---

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Send a message and get a complete response."""
    thread_id = request.thread_id or str(uuid.uuid4())
    config = {"configurable": {"thread_id": thread_id}}

    try:
        result = await asyncio.wait_for(
            AGENT.ainvoke(
                {"messages": [HumanMessage(content=request.message)]},
                config=config,
            ),
            timeout=120.0,
        )
    except asyncio.TimeoutError:
        raise HTTPException(504, "Agent timed out")
    except Exception as e:
        raise HTTPException(500, f"Agent error: {str(e)}")

    last_msg = result["messages"][-1]
    return ChatResponse(
        response=last_msg.content,
        thread_id=thread_id,
        message_count=len(result["messages"]),
    )


@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest):
    """Send a message and stream the response via SSE."""
    thread_id = request.thread_id or str(uuid.uuid4())
    config = {"configurable": {"thread_id": thread_id}}

    async def generate():
        yield f"data: {json.dumps({'type': 'start', 'thread_id': thread_id})}\n\n"

        try:
            async for event in AGENT.astream_events(
                {"messages": [HumanMessage(content=request.message)]},
                config=config,
                version="v2",
            ):
                kind = event["event"]

                if kind == "on_chat_model_stream":
                    token = event["data"]["chunk"].content
                    if token:
                        yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"

                elif kind == "on_tool_start":
                    name = event.get("name", "")
                    yield f"data: {json.dumps({'type': 'tool_start', 'tool': name})}\n\n"

                elif kind == "on_tool_end":
                    name = event.get("name", "")
                    output = str(event["data"].get("output", ""))[:500]
                    yield f"data: {json.dumps({'type': 'tool_end', 'tool': name, 'result': output})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.websocket("/ws/chat/{thread_id}")
async def websocket_chat(websocket: WebSocket, thread_id: str):
    """WebSocket endpoint for real-time chat."""
    await websocket.accept()
    config = {"configurable": {"thread_id": thread_id}}

    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)

            async for event in AGENT.astream_events(
                {"messages": [HumanMessage(content=msg["content"])]},
                config=config,
                version="v2",
            ):
                if event["event"] == "on_chat_model_stream":
                    token = event["data"]["chunk"].content
                    if token:
                        await websocket.send_text(json.dumps({
                            "type": "token", "content": token,
                        }))

            await websocket.send_text(json.dumps({"type": "done"}))

    except WebSocketDisconnect:
        pass


@app.get("/api/threads/{thread_id}", response_model=ThreadResponse)
async def get_thread(thread_id: str):
    """Get conversation history for a thread."""
    config = {"configurable": {"thread_id": thread_id}}
    try:
        state = AGENT.get_state(config)
        messages = state.values.get("messages", [])
        return ThreadResponse(
            thread_id=thread_id,
            message_count=len(messages),
            messages=[
                {
                    "role": m.type,
                    "content": m.content if hasattr(m, "content") and m.content else None,
                    "tool_calls": [
                        {"name": tc["name"], "args": tc["args"]}
                        for tc in m.tool_calls
                    ] if hasattr(m, "tool_calls") and m.tool_calls else None,
                }
                for m in messages
            ],
        )
    except Exception:
        raise HTTPException(404, "Thread not found")


@app.post("/api/threads")
async def create_thread():
    """Create a new conversation thread."""
    return {"thread_id": str(uuid.uuid4())}


@app.get("/health")
async def health():
    return {"status": "ok", "agent": "ready"}


# ============================================================
# Run
# ============================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

---

## Deployment Considerations

### Production Checkpointer
Replace `MemorySaver` with a persistent checkpointer:

```python
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

async def get_checkpointer():
    return await AsyncPostgresSaver.from_conn_string(
        "postgresql://user:pass@localhost:5432/langgraph"
    )
```

### Rate Limiting
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.post("/api/chat")
@limiter.limit("10/minute")
async def chat(request: ChatRequest):
    ...
```

### Authentication
```python
from fastapi import Depends, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

async def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
    # Verify JWT or API key
    if not is_valid_token(token):
        raise HTTPException(401, "Invalid token")
    return token

@app.post("/api/chat")
async def chat(request: ChatRequest, token: str = Depends(verify_token)):
    ...
```

---

## Key Takeaways

1. FastAPI + LangGraph is a natural fit for building production agent APIs.
2. Use `ainvoke` for simple request/response, SSE for streaming, WebSockets for real-time chat.
3. Thread IDs map directly to conversation sessions -- pass them from the client.
4. Human-in-the-loop via API: detect paused state, expose approval endpoints, resume on approval.
5. Always add timeouts, error handling, and health checks for production.
6. Replace `MemorySaver` with a database-backed checkpointer for production deployments.

---

## Practice Exercises

### Exercise 1: Basic Chat API
Build a FastAPI app with:
- POST `/chat` - send a message, get a response
- GET `/threads/{id}` - get conversation history
- POST `/threads` - create a new thread
- Test with curl or the Swagger UI at `/docs`

### Exercise 2: SSE Streaming Chat
Extend Exercise 1 with:
- POST `/chat/stream` - streams tokens via SSE
- Build a simple HTML page that uses EventSource to display streaming responses
- Show a "typing..." indicator while tokens are streaming

### Exercise 3: Tool Approval API
Build an API where:
- The agent has access to "safe" tools (search) and "dangerous" tools (send_email, delete_file)
- Safe tools execute automatically
- Dangerous tools pause the agent and return `{"status": "needs_approval", "tool": ...}`
- POST `/approve/{thread_id}` resumes with approval
- POST `/reject/{thread_id}` resumes with rejection
- Test the full flow with curl

### Exercise 4: Multi-Agent API
Build an API backed by the multi-agent supervisor pattern from Chapter 7:
- The supervisor delegates to researcher, writer, or coder agents
- Stream progress updates showing which agent is currently active
- Return the final compiled result

### Exercise 5: Full Production Deployment
Take the full example from this chapter and:
1. Add authentication (API key in header)
2. Add rate limiting (10 requests/minute per key)
3. Replace MemorySaver with SQLite for persistence
4. Add logging with structured JSON logs
5. Create a Dockerfile for deployment
6. Write a simple test script that exercises all endpoints

```dockerfile
# Hint for Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```
