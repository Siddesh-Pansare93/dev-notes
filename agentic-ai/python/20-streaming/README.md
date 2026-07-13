# Streaming in LangGraph

🟡 Intermediate

## Kya hota hai, aur kyun zaruri hai?

Socho ek second ke liye — tum Zomato pe order daalte ho, aur order confirm hone ke baad app sirf ek blank white screen dikhata hai... 25 minute tak. Koi "Preparing your food", koi "Rider is on the way", kuch nahi. Sirf ek loader ghoomta rehta hai. Tumhe kaisa lagega? Bekaar, na? Tumhe baar-baar app close karke check karna padega ki order cancel toh nahi hua.

Ab yahi problem AI agents mein hoti hai. Ek complex agent jo research karta hai, tools call karta hai, aur phir final answer likhta hai — usme 10-30 second lag sakte hain. Agar tumhara backend sirf ek `POST /chat` request leke 20 second baad ek single JSON response bhejta hai, toh user ko lagega app hang ho gaya hai.

**Streaming** isi problem ka solution hai. Iska matlab hai — jaise-jaise agent kaam karta hai, uska output turant, chunk-by-chunk, user tak bhejna — bilkul waise hi jaise ChatGPT mein text type hote hue dikhta hai, ya Swiggy mein rider ka live location update hota rehta hai.

### Kyun zaruri hai agent-building mein?

1. **Perceived latency kam hoti hai** — Agar LLM token-by-token dikh raha hai, toh user ko lagta hai kaam ho raha hai, wait nahi karna pad raha.
2. **Progress transparency** — Multi-step agent (research → analyze → write) mein user ko pata chalta hai "abhi kaunsa step chal raha hai".
3. **Tool execution visibility** — Jab agent koi tool call kare (jaise DB query, API call), user ko dikh sakta hai "Searching database...".
4. **Production UX ka baseline** — Aaj ke zamane mein har serious AI product (ChatGPT, Claude, Perplexity) streaming use karta hai. Agar tumhara agent stream nahi karta, toh woh outdated lagega.

**Node.js analogy** (jo tumhe already pata hai):

```typescript
// Node.js readable streams
const readable = fs.createReadStream("big-file.txt");
readable.on("data", (chunk) => process.stdout.write(chunk));
readable.on("end", () => console.log("\nDone!"));

// Express SSE (Server-Sent Events)
app.get("/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  setInterval(() => res.write(`data: ${Date.now()}\n\n`), 1000);
});
```

LangGraph mein bhi bilkul yahi concept hai, bas AI agent workflows ke upar. Chalo detail mein dekhte hain.

> [!info]
> Is chapter mein hum LangGraph ke **4 major streaming modes** dekhenge: `values`, `updates`, `messages`, aur token-level `astream_events`. Har ek ka apna use-case hai — jaise Zomato mein order-status, delivery-tracking, aur chat-with-rider — sab alag features hain, lekin sab "real-time updates" hi de rahe hain, bas alag granularity pe.

---

## Setup: Ek Basic Tool-Using Agent

Pehle ek simple agent bana lete hain jisko hum streaming ke liye use karenge — poore chapter mein yahi example reuse hoga:

```python
from typing import TypedDict, Annotated
from langchain_core.messages import HumanMessage, BaseMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from langchain_core.tools import tool

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)


@tool
def search(query: str) -> str:
    """Search for information on the web."""
    return f"Results for: {query}"


tools = [search]
llm_with_tools = llm.bind_tools(tools)


class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]


def agent(state: AgentState):
    return {"messages": [llm_with_tools.invoke(state["messages"])]}


def should_continue(state: AgentState):
    last_message = state["messages"][-1]
    if last_message.tool_calls:
        return "tools"
    return END


graph = StateGraph(AgentState)
graph.add_node("agent", agent)
graph.add_node("tools", ToolNode(tools))
graph.add_edge(START, "agent")
graph.add_conditional_edges("agent", should_continue)
graph.add_edge("tools", "agent")
app = graph.compile()
```

Yeh Zomato ka "order pipeline" samjho — pehle `agent` node decide karta hai kya karna hai, agar tool chahiye toh `tools` node chalta hai, phir wapas `agent` ko result milta hai final jawab banane ke liye.

---

## `stream()` aur `astream()`: Node-Level Streaming

Sabse basic form of streaming — jab bhi ek **node** apna kaam khatam karta hai, ek event emit hota hai. Isse socho jaise Swiggy app mein "Order confirmed" → "Preparing" → "Out for delivery" — yeh notifications ek "node complete hone" par aati hain, second-by-second nahi.

```python
# --- Synchronous streaming ---
for event in app.stream(
    {"messages": [HumanMessage(content="Search for Python tutorials")]}
):
    for node_name, node_output in event.items():
        print(f"--- Node: {node_name} ---")
        if "messages" in node_output:
            for msg in node_output["messages"]:
                content_preview = msg.content[:100] if msg.content else str(msg.tool_calls)[:100]
                print(f"  [{msg.type}] {content_preview}")
```

### Async version (`astream`)

Real production apps mein tum almost hamesha **async** use karoge, kyunki Python ka `asyncio` event loop multiple requests ko concurrently handle karne deta hai (Node.js ke event loop jaisa hi mental model hai):

```python
import asyncio


async def main():
    async for event in app.astream(
        {"messages": [HumanMessage(content="Search for Python tutorials")]}
    ):
        for node_name, node_output in event.items():
            print(f"--- Node: {node_name} ---")


asyncio.run(main())
```

> [!tip]
> Agar tum FastAPI ya koi async web framework use kar rahe ho, toh hamesha `astream()` / `astream_events()` use karo, `stream()` nahi — warna tumhara sync loop poore event loop ko block kar dega.

---

## `stream_mode`: Kya Granularity Chahiye?

`stream_mode` parameter control karta hai ki har event mein exactly **kya data** aayega. Yeh sabse important concept hai is chapter ka — isliye dhyan se samjho.

### 1. `"values"` — Har Step Ke Baad Poora State

Jaise IRCTC app mein tumhe PNR status check karne pe **poori booking details** milti hain, har baar — sirf "changed field" nahi.

```python
for state_snapshot in app.stream(input_data, stream_mode="values"):
    # state_snapshot poora state dict hai, har node ke baad
    print(f"Messages so far: {len(state_snapshot['messages'])}")
    last_msg = state_snapshot["messages"][-1]
    preview = last_msg.content[:80] if last_msg.content else "..."
    print(f"Last message: [{last_msg.type}] {preview}")
```

**Use case:** Jab UI ko poora conversation history chahiye har update pe (jaise chat window jo pura state re-render karta hai).

### 2. `"updates"` — Sirf Jo Change Hua (Default)

Yeh zyada **efficient** hai — sirf woh keys milti hain jo us node ne update ki. Socho jaise Paytm transaction notification: "₹500 debited" — poora bank statement nahi bhejte, sirf delta.

```python
for update in app.stream(input_data, stream_mode="updates"):
    # update ka shape: {node_name: {state_keys_jo_change_hui}}
    node_name = list(update.keys())[0]
    changes = update[node_name]
    print(f"Node '{node_name}' updated: {list(changes.keys())}")
```

**Use case:** Progress tracking, logging, ya jab tumhe sirf yeh jaanna hai "kaunsa node abhi chala aur usne kya add kiya" — bandwidth bhi kam lagta hai.

### 3. `"messages"` — LLM Token Streaming (Sabse Popular UI Use-Case)

Yeh mode specifically **chat messages ke tokens** ko stream karne ke liye bana hai — jab tumhe ChatGPT-jaisa "typing effect" chahiye. Har chunk ek `(message_chunk, metadata)` tuple hota hai:

```python
for msg_chunk, metadata in app.stream(
    {"messages": [HumanMessage(content="Write a haiku about Python")]},
    stream_mode="messages",
):
    # msg_chunk ek AIMessageChunk hai — token-by-token content
    if msg_chunk.content:
        print(msg_chunk.content, end="", flush=True)
    # metadata batata hai kaunse node/LLM call se yeh chunk aaya
    # e.g. metadata["langgraph_node"] == "agent"
```

Async version bhi bilkul same pattern follow karta hai:

```python
async def stream_tokens():
    async for msg_chunk, metadata in app.astream(
        {"messages": [HumanMessage(content="Write a haiku about Python")]},
        stream_mode="messages",
    ):
        if msg_chunk.content:
            print(msg_chunk.content, end="", flush=True)
    print()


asyncio.run(stream_tokens())
```

> [!tip]
> `stream_mode="messages"` LangGraph ka **recommended way** hai token-by-token chat UI banane ke liye — `astream_events` se simpler hai jab tumhe sirf chat tokens chahiye, kuch aur nahi.

### 4. `"debug"` — Detailed Internal Info

```python
for debug_event in app.stream(input_data, stream_mode="debug"):
    print(f"Type: {debug_event['type']}")
    print(f"Timestamp: {debug_event.get('timestamp', 'N/A')}")
    # Includes: task_start, task_result, checkpoint, etc.
```

**Use case:** Debugging aur internal observability — production UI ke liye nahi, dev-time troubleshooting ke liye.

### 5. `"custom"` — Apna Data Emit Karo

Kabhi-kabhi tumhe node ke andar se apna custom progress data bhejna hota hai (jaise "3 out of 10 documents processed"). Iske liye `get_stream_writer()` use karo:

```python
from langgraph.config import get_stream_writer


def long_running_node(state: AgentState):
    writer = get_stream_writer()
    for i in range(1, 4):
        writer({"progress": f"Step {i}/3 complete"})
    return {"messages": state["messages"]}


for chunk in app.stream(input_data, stream_mode="custom"):
    print(chunk)  # {"progress": "Step 1/3 complete"}, etc.
```

### Multiple Modes Ek Saath

```python
# values aur updates dono chahiye ek saath
for event in app.stream(input_data, stream_mode=["values", "updates"]):
    mode, data = event
    print(f"Mode: {mode}")
```

### Quick Comparison Table

| `stream_mode` | Kya Milta Hai | Best For |
|---|---|---|
| `"values"` | Poora state, har step ke baad | Full-state UI sync |
| `"updates"` (default) | Sirf changed keys, per node | Progress logs, lightweight updates |
| `"messages"` | LLM token chunks + metadata | Chat UI, typing effect |
| `"debug"` | Internal execution details | Debugging, tracing |
| `"custom"` | Tumhara apna emitted data | Custom progress bars |

---

## `astream_events()`: Sabse Fine-Grained Control

Agar tumhe **sabse detailed** level pe events chahiye — LLM tokens, tool start/end, chain-level events, sab kuch ek hi stream mein — toh `astream_events()` use karo. Yeh async-only hai.

```python
import asyncio


async def main():
    async for event in app.astream_events(
        {"messages": [HumanMessage(content="What is 42 * 58?")]},
        version="v2",
    ):
        kind = event["event"]
        name = event.get("name", "")

        if kind == "on_chat_model_start":
            print(f"\n>> LLM starting: {name}")

        elif kind == "on_chat_model_stream":
            # Token-by-token output!
            chunk = event["data"]["chunk"]
            if chunk.content:
                print(chunk.content, end="", flush=True)

        elif kind == "on_chat_model_end":
            print(f"\n>> LLM finished: {name}")

        elif kind == "on_tool_start":
            print(f"\n>> Tool starting: {name}")
            print(f"   Input: {event['data'].get('input', '')}")

        elif kind == "on_tool_end":
            print(f">> Tool finished: {name}")
            print(f"   Output: {str(event['data'].get('output', ''))[:100]}")

        elif kind == "on_chain_start":
            if name in ("agent", "tools"):
                print(f"\n=== Node: {name} ===")


asyncio.run(main())
```

### Common Event Types

| Event | Kab Fire Hota Hai |
|---|---|
| `on_chain_start` | Ek node ka execution shuru hota hai |
| `on_chain_end` | Ek node ka execution complete hota hai |
| `on_chat_model_start` | LLM call shuru hoti hai |
| `on_chat_model_stream` | LLM ka har ek token |
| `on_chat_model_end` | LLM call complete hoti hai |
| `on_tool_start` | Tool execution shuru hota hai |
| `on_tool_end` | Tool execution complete hota hai |
| `on_retriever_start` | Retriever shuru hota hai (RAG) |
| `on_retriever_end` | Retriever complete hota hai |

### Events Ko Filter Karna

Har chhoti cheez sunna zaruri nahi — sirf woh events lo jo chahiye:

```python
async for event in app.astream_events(
    input_data,
    version="v2",
    include_names=["agent"],                  # Sirf "agent" node ke events
    include_types=["on_chat_model_stream"],    # Sirf LLM tokens
):
    print(event["data"]["chunk"].content, end="")
```

> [!warning]
> `astream_events()` bahut saare low-level events emit karta hai — agar filter nahi lagaoge, toh production mein performance aur log-noise dono problem ban sakti hain. Hamesha `include_names` / `include_types` use karo jab possible ho.

---

## `stream()` vs `astream_events()` — Kab Kya Use Karo?

| Zaroorat | Use Karo |
|---|---|
| Sirf chat tokens chahiye, UI mein type-hote-hue dikhana hai | `stream_mode="messages"` |
| Node-level progress (jaise "research done", "writing done") | `stream_mode="updates"` |
| Poora conversation state har step pe | `stream_mode="values"` |
| Tool calls, LLM start/end, sab kuch granular level pe monitor karna | `astream_events()` |
| Apna custom progress data emit karna hai | `stream_mode="custom"` + `get_stream_writer()` |

---

## Real-Time UI Updates Ka Pattern

Ab ek real pattern dekhte hain jahan hum agent ke progress ko UI-friendly JSON events mein convert karte hain — jaise Swiggy ka order-tracking backend karta hoga:

```python
import json
from typing import TypedDict, Annotated
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages


class UIAgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    progress: list[dict]
    status: str


def step_one(state: UIAgentState) -> dict:
    # Simulate research work
    return {
        "progress": [{"step": "research", "status": "complete", "detail": "Found 5 sources"}],
        "status": "researching",
    }


def step_two(state: UIAgentState) -> dict:
    return {
        "progress": [{"step": "writing", "status": "complete", "detail": "Draft written"}],
        "status": "writing",
    }


def step_three(state: UIAgentState) -> dict:
    return {
        "messages": [AIMessage(content="Here is your completed report...")],
        "progress": [{"step": "complete", "status": "complete", "detail": "All done!"}],
        "status": "done",
    }


ui_graph = StateGraph(UIAgentState)
ui_graph.add_node("research", step_one)
ui_graph.add_node("write", step_two)
ui_graph.add_node("finalize", step_three)
ui_graph.add_edge(START, "research")
ui_graph.add_edge("research", "write")
ui_graph.add_edge("write", "finalize")
ui_graph.add_edge("finalize", END)
ui_app = ui_graph.compile()


def stream_for_ui(user_message: str):
    """Generator jo UI client ke liye JSON events yield karta hai."""
    for event in ui_app.stream(
        {"messages": [HumanMessage(content=user_message)], "progress": [], "status": "starting"},
        stream_mode="updates",
    ):
        for node_name, output in event.items():
            ui_event = {
                "node": node_name,
                "status": output.get("status", ""),
                "progress": output.get("progress", []),
            }
            yield json.dumps(ui_event)


# Usage (isko SSE endpoint ya WebSocket se consume karoge)
for event_json in stream_for_ui("Write a report about AI"):
    print(event_json)
```

Yeh bilkul waise hai jaise Swiggy app "Order placed" → "Restaurant confirmed" → "Food is being prepared" → "Rider assigned" → "Out for delivery" dikhata hai — har step ek discrete JSON event hai jo UI update karta hai.

---

## Production: FastAPI SSE Streaming Endpoint

Ab asli deal — production mein tum yeh streaming ek **HTTP endpoint** ke through expose karoge, using **Server-Sent Events (SSE)**. Yahi mechanism ChatGPT jaisi apps use karti hain frontend ko token-by-token update bhejne ke liye.

### Kyun SSE, WebSocket nahi?

- SSE **one-way** hai (server → client) — chat responses ke liye bilkul perfect, kyunki client sirf sun raha hai.
- SSE plain HTTP pe chalta hai — koi special protocol upgrade nahi chahiye (WebSocket ki tarah).
- Browser ka native `EventSource` API SSE ko directly support karta hai, reconnection logic bhi built-in hai.

```python
# server.py
import json
import asyncio
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from langchain_core.messages import HumanMessage

app_api = FastAPI()


class ChatRequest(BaseModel):
    message: str
    thread_id: str = "default"


async def event_generator(user_message: str, thread_id: str):
    """LangGraph events ko SSE format mein convert karta hai."""
    config = {"configurable": {"thread_id": thread_id}}

    try:
        async for msg_chunk, metadata in app.astream(
            {"messages": [HumanMessage(content=user_message)]},
            config=config,
            stream_mode="messages",
        ):
            if msg_chunk.content:
                payload = json.dumps({"token": msg_chunk.content})
                yield f"data: {payload}\n\n"

        # Stream complete hone ka signal
        yield f"data: {json.dumps({'done': True})}\n\n"

    except Exception as e:
        # Client ko error bhi stream karo, connection silently mat todo
        error_payload = json.dumps({"error": str(e)})
        yield f"data: {error_payload}\n\n"


@app_api.post("/chat/stream")
async def stream_chat(request: ChatRequest):
    return StreamingResponse(
        event_generator(request.message, request.thread_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            # Nginx jaisa proxy use kar rahe ho toh buffering disable karo
            "X-Accel-Buffering": "no",
        },
    )
```

### Frontend Se Consume Karna (EventSource)

```javascript
// Browser mein — bilkul Node.js ke fetch streaming jaisa concept
const evtSource = new EventSource("/chat/stream"); // GET ke liye
// POST body ke saath chahiye toh fetch + ReadableStream use karo:

async function streamChat(message) {
  const response = await fetch("/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, thread_id: "user-123" }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split("\n\n").filter(Boolean);

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = JSON.parse(line.slice(6));
        if (data.token) {
          document.getElementById("output").textContent += data.token;
        }
        if (data.done) {
          console.log("Stream complete!");
        }
      }
    }
  }
}
```

Test karne ke liye `curl` se bhi check kar sakte ho:

```bash
curl -N -X POST http://localhost:8000/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message": "Write a haiku about Python", "thread_id": "test-1"}'
```

`-N` flag zaruri hai — yeh curl ki output buffering disable karta hai taaki tumhe tokens real-time dikhein, sab ek saath end mein nahi.

> [!warning]
> **Common mistake:** Agar tum reverse proxy (Nginx, Vercel, etc.) ke peeche deploy kar rahe ho, toh proxy khud response buffer kar sakta hai aur "streaming" hokar bhi user ko sab kuch ek saath milega. Nginx mein `proxy_buffering off;` aur SSE response mein `X-Accel-Buffering: no` header zaruri hai.

---

## Streaming with Checkpointing (Multi-Turn Conversations)

Streaming aur checkpointing saath-saath kaam karte hain — jaise WhatsApp mein tumhara pura chat history save rehta hai, aur naye messages bhi real-time aate hain:

```python
from langgraph.checkpoint.memory import MemorySaver

memory = MemorySaver()
checkpointed_app = graph.compile(checkpointer=memory)

config = {"configurable": {"thread_id": "streaming-demo"}}

# Pehla message stream karo
for event in checkpointed_app.stream(
    {"messages": [HumanMessage(content="Hello!")]},
    config=config,
    stream_mode="values",
):
    print(f"Messages: {len(event['messages'])}")

# Follow-up message — state persist hai (jaise WhatsApp mein purani chat yaad rehti hai)
for event in checkpointed_app.stream(
    {"messages": [HumanMessage(content="What did I just say?")]},
    config=config,
    stream_mode="values",
):
    print(f"Messages: {len(event['messages'])}")
```

Production mein `MemorySaver()` ki jagah `PostgresSaver` ya `SqliteSaver` use karoge, taaki server restart hone par bhi conversation history na khoye.

---

## Advanced: Reusable Custom Stream Handler

Agar tum baar-baar same streaming logic likh rahe ho, toh ek reusable handler bana lo — bilkul Node.js ke `EventEmitter` pattern jaisa:

```python
from dataclasses import dataclass
from typing import Callable, Optional


@dataclass
class StreamConfig:
    on_node_start: Optional[Callable] = None
    on_node_end: Optional[Callable] = None
    on_token: Optional[Callable] = None
    on_tool_call: Optional[Callable] = None
    on_tool_result: Optional[Callable] = None
    on_complete: Optional[Callable] = None


async def process_stream(app, input_data, config=None, stream_config=StreamConfig()):
    """Configurable handlers ke saath agent stream process karta hai."""
    final_result = None

    async for event in app.astream_events(input_data, config=config, version="v2"):
        kind = event["event"]
        name = event.get("name", "")

        if kind == "on_chain_start" and stream_config.on_node_start:
            stream_config.on_node_start(name, event["data"])

        elif kind == "on_chain_end" and stream_config.on_node_end:
            stream_config.on_node_end(name, event["data"])
            final_result = event["data"]

        elif kind == "on_chat_model_stream" and stream_config.on_token:
            token = event["data"]["chunk"].content
            if token:
                stream_config.on_token(token)

        elif kind == "on_tool_start" and stream_config.on_tool_call:
            stream_config.on_tool_call(name, event["data"].get("input", {}))

        elif kind == "on_tool_end" and stream_config.on_tool_result:
            stream_config.on_tool_result(name, event["data"].get("output", ""))

    if stream_config.on_complete:
        stream_config.on_complete(final_result)


# Usage
await process_stream(
    app,
    {"messages": [HumanMessage(content="Hello")]},
    stream_config=StreamConfig(
        on_token=lambda t: print(t, end="", flush=True),
        on_tool_call=lambda name, inp: print(f"\n[Calling {name}...]"),
        on_tool_result=lambda name, out: print(f"[{name} returned: {out[:50]}]"),
        on_complete=lambda r: print("\n--- Done! ---"),
    ),
)
```

---

## Gotchas aur Production Considerations

1. **Sync `stream()` async server mein mat use karo.** FastAPI/aiohttp jaisi async apps mein `app.stream()` (sync) call karoge toh poora event loop block ho jayega, aur baaki requests hang ho jayengi. Hamesha `astream()` / `astream_events()` use karo.

2. **Client disconnect handle karo.** Agar user browser tab band kar de ya request cancel ho jaaye, toh tumhara generator ko gracefully stop hona chahiye — warna LLM call background mein chalti rahegi aur paise waste honge (LLM tokens free nahi hain).

   ```python
   async def event_generator(request, user_message: str):
       async for chunk in app.astream(...):
           if await request.is_disconnected():
               break  # Client chala gaya, LLM call rok do
           yield chunk
   ```

3. **Error handling stream ke andar bhi zaruri hai.** Agar LLM call fail ho jaaye beech mein, toh raw exception client tak mat jaane do — usko bhi ek SSE `error` event ki tarah bhejo taaki frontend gracefully handle kar sake.

4. **Heartbeats bhejo long-running streams ke liye.** Agar tool execution mein 15-20 second lag sakte hain (jaise koi slow API call), toh beech mein periodic `: heartbeat\n\n` comment events bhejo — warna load balancers/proxies connection ko idle samajh kar drop kar denge.

5. **Cost tracking:** Streaming se latency better dikhti hai, lekin token cost same hi rehta hai — chahe tum stream karo ya nahi, LLM utne hi tokens generate karega. Streaming sirf UX improve karta hai, cost nahi.

6. **Buffering issues in production:** Nginx, Cloudflare, aur kuch cloud platforms by default response buffer karte hain. Agar production mein "streaming kaam nahi kar raha" (sab ek saath aa raha hai end mein), sabse pehle proxy/CDN buffering settings check karo.

7. **`stream_mode="messages"` sirf chat models ke liye hai.** Agar tumhare node mein LLM call nahi ho rahi (sirf plain Python logic hai), toh us node se koi message chunk nahi aayega — yeh normal hai.

---

## Node.js Streams Se Comparison

| Node.js Concept | LangGraph Equivalent |
|---|---|
| `ReadableStream` | `app.stream()` / `app.astream()` |
| `stream.on('data', cb)` | `for event in app.stream()` |
| `stream.on('end', cb)` | Loop naturally complete hota hai |
| `stream.pipe(transform)` | Loop ke andar events process karna |
| Web Streams API (`ReadableStream`) | `async for event in app.astream()` |
| `TransformStream` | Custom processing async for loop mein |
| Express SSE (`res.write`) | FastAPI `StreamingResponse` |

**Node.js pattern:**
```typescript
const response = await fetch("/api/stream");
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const text = decoder.decode(value);
  updateUI(text);
}
```

**Python/LangGraph equivalent:**
```python
async for event in app.astream_events(input_data, version="v2"):
    if event["event"] == "on_chat_model_stream":
        token = event["data"]["chunk"].content
        if token:
            update_ui(token)
```

Concept bilkul same hai — sirf syntax alag hai. Tumhara Node.js mental model (readable streams, event emitters, chunk processing) yahan directly apply hota hai.

---

## Key Takeaways

- Streaming ka core reason hai **UX** — 10-30 second wait ko real-time progress mein convert karna, taaki app "hang" na lage.
- `stream()` / `astream()` node-level events emit karte hain — har node complete hone par.
- `stream_mode` granularity control karta hai: `"values"` (poora state), `"updates"` (sirf changes, default), `"messages"` (LLM token chunks — chat UI ke liye best), `"debug"` (internal details), `"custom"` (apna emitted data via `get_stream_writer()`).
- `astream_events()` sabse fine-grained control deta hai — LLM tokens, tool start/end, chain events sab ek saath, `include_names`/`include_types` se filter karo.
- Production mein streaming endpoint banane ke liye FastAPI + `StreamingResponse` + SSE format use karo; frontend `EventSource` ya `fetch` + `ReadableStream` se consume karta hai.
- Streaming checkpointing ke saath seamlessly kaam karta hai — multi-turn conversations mein state persist rehta hai.
- Async use karo (`astream`, `astream_events`), sync (`stream`) nahi — production async servers mein blocking se bacho.
- Client disconnects handle karo, errors ko bhi stream karo, aur proxy buffering settings check karo — yeh sab production mein sabse common gotchas hain.
- Streaming se **cost** kam nahi hoti (tokens same hi generate hote hain) — sirf **perceived latency** better hoti hai.
