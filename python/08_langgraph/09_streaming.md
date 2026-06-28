# 09 - Streaming: Real-Time Output from LangGraph Agents

## Why Streaming Matters

When an agent takes 10-30 seconds to complete a multi-step workflow, showing nothing until the end is a poor user experience. Streaming lets you:
- Show **token-by-token** LLM output as it generates
- Report **progress** as each node completes
- Display **tool execution** in real time
- Build responsive UIs that feel interactive

**Node.js comparison:**
```typescript
// Node.js readable streams
const readable = fs.createReadStream("big-file.txt");
readable.on("data", (chunk) => process.stdout.write(chunk));
readable.on("end", () => console.log("\nDone!"));

// Express SSE
app.get("/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  setInterval(() => res.write(`data: ${Date.now()}\n\n`), 1000);
});
```

LangGraph provides similar streaming but over AI agent workflows.

---

## stream() and astream(): Node-Level Streaming

The simplest form of streaming emits an event each time a node completes:

```python
from typing import TypedDict, Annotated
from langchain_core.messages import HumanMessage, BaseMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, START, END, add_messages
from langgraph.prebuilt import ToolNode
from langchain_core.tools import tool

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)


@tool
def search(query: str) -> str:
    """Search for information."""
    return f"Results for: {query}"


tools = [search]
llm_with_tools = llm.bind_tools(tools)


class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]


def agent(state: AgentState):
    return {"messages": [llm_with_tools.invoke(state["messages"])]}


def should_continue(state: AgentState):
    if state["messages"][-1].tool_calls:
        return "tools"
    return END


graph = StateGraph(AgentState)
graph.add_node("agent", agent)
graph.add_node("tools", ToolNode(tools))
graph.add_edge(START, "agent")
graph.add_conditional_edges("agent", should_continue)
graph.add_edge("tools", "agent")
app = graph.compile()


# --- Synchronous streaming ---
for event in app.stream({"messages": [HumanMessage(content="Search for Python tutorials")]}):
    for node_name, node_output in event.items():
        print(f"--- Node: {node_name} ---")
        if "messages" in node_output:
            for msg in node_output["messages"]:
                print(f"  [{msg.type}] {msg.content[:100] if msg.content else str(msg.tool_calls)[:100]}")
```

### Async streaming

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

---

## stream_mode Options

The `stream_mode` parameter controls what gets emitted:

### "values" -- Full State After Each Step

```python
for state_snapshot in app.stream(input_data, stream_mode="values"):
    # state_snapshot is the FULL state dict after each node
    print(f"Messages so far: {len(state_snapshot['messages'])}")
    last_msg = state_snapshot["messages"][-1]
    print(f"Last message: [{last_msg.type}] {last_msg.content[:80] if last_msg.content else '...'}")
    print()
```

### "updates" -- Only the Changes (Default)

```python
for update in app.stream(input_data, stream_mode="updates"):
    # update is {node_name: {state_keys_that_changed}}
    node_name = list(update.keys())[0]
    changes = update[node_name]
    print(f"Node '{node_name}' updated: {list(changes.keys())}")
```

### "debug" -- Detailed Debug Information

```python
for debug_event in app.stream(input_data, stream_mode="debug"):
    print(f"Type: {debug_event['type']}")
    print(f"Timestamp: {debug_event.get('timestamp', 'N/A')}")
    # Includes: task_start, task_result, checkpoint, etc.
```

### Multiple stream modes simultaneously

```python
# Get both values and updates
for event in app.stream(input_data, stream_mode=["values", "updates"]):
    mode, data = event
    print(f"Mode: {mode}")
```

---

## astream_events(): Fine-Grained Event Streaming

For the most detailed control, `astream_events()` emits events at every level -- LLM tokens, tool starts/ends, chain events, and more:

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

| Event | When It Fires |
|---|---|
| `on_chain_start` | A node begins execution |
| `on_chain_end` | A node finishes execution |
| `on_chat_model_start` | LLM call begins |
| `on_chat_model_stream` | Each token from the LLM |
| `on_chat_model_end` | LLM call completes |
| `on_tool_start` | Tool execution begins |
| `on_tool_end` | Tool execution completes |
| `on_retriever_start` | Retriever begins (RAG) |
| `on_retriever_end` | Retriever completes |

### Filtering Events

```python
async for event in app.astream_events(
    input_data,
    version="v2",
    include_names=["agent"],      # Only events from the "agent" node
    include_types=["on_chat_model_stream"],  # Only LLM tokens
):
    print(event["data"]["chunk"].content, end="")
```

---

## Token-by-Token Streaming from LLM Nodes

The most requested feature: stream individual tokens as the LLM generates them.

### Method 1: astream_events (recommended)

```python
async def stream_agent_tokens():
    async for event in app.astream_events(
        {"messages": [HumanMessage(content="Write a haiku about Python")]},
        version="v2",
    ):
        if event["event"] == "on_chat_model_stream":
            token = event["data"]["chunk"].content
            if token:
                print(token, end="", flush=True)
    print()  # Final newline


asyncio.run(stream_agent_tokens())
```

### Method 2: Stream within a custom node

```python
from langchain_core.callbacks import CallbackManagerForLLMRun


async def streaming_agent(state: AgentState):
    """Agent node that streams internally."""
    full_response = ""
    async for chunk in llm_with_tools.astream(state["messages"]):
        if chunk.content:
            full_response += chunk.content
            # You could push to a queue, WebSocket, etc.

    # Still need to return the complete response for state
    response = await llm_with_tools.ainvoke(state["messages"])
    return {"messages": [response]}
```

---

## Real-Time UI Updates Pattern

Here is a pattern for building a progress-reporting agent that a UI can consume:

```python
import json
from typing import TypedDict, Annotated
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
from langgraph.graph import StateGraph, START, END, add_messages


class UIAgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    progress: list[dict]  # For UI progress updates
    status: str


def step_one(state: UIAgentState) -> dict:
    # Simulate work
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


graph = StateGraph(UIAgentState)
graph.add_node("research", step_one)
graph.add_node("write", step_two)
graph.add_node("finalize", step_three)
graph.add_edge(START, "research")
graph.add_edge("research", "write")
graph.add_edge("write", "finalize")
graph.add_edge("finalize", END)
app = graph.compile()


# Stream updates for a UI
def stream_for_ui(user_message: str):
    """Generator that yields JSON events for a UI client."""
    for event in app.stream(
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


# Usage (would be consumed by an SSE endpoint or WebSocket)
for event_json in stream_for_ui("Write a report about AI"):
    print(event_json)
```

---

## Comparison with Node.js Readable Streams

| Node.js Concept | LangGraph Equivalent |
|---|---|
| `ReadableStream` | `app.stream()` / `app.astream()` |
| `stream.on('data', cb)` | `for event in app.stream()` |
| `stream.on('end', cb)` | Loop completes naturally |
| `stream.pipe(transform)` | Process events in the loop |
| `ReadableStream` (Web Streams API) | `async for event in app.astream()` |
| `TransformStream` | Custom processing in async for loop |

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

**Python equivalent:**
```python
async for event in app.astream_events(input_data, version="v2"):
    if event["event"] == "on_chat_model_stream":
        token = event["data"]["chunk"].content
        if token:
            update_ui(token)
```

---

## Streaming with Checkpointing

Streaming works with checkpointed graphs. Events include checkpoint information:

```python
from langgraph.checkpoint.memory import MemorySaver

memory = MemorySaver()
app = graph.compile(checkpointer=memory)

config = {"configurable": {"thread_id": "streaming-demo"}}

# Stream the first invocation
for event in app.stream(
    {"messages": [HumanMessage(content="Hello!")]},
    config=config,
    stream_mode="values",
):
    print(f"Messages: {len(event['messages'])}")

# Stream a follow-up (state is persisted)
for event in app.stream(
    {"messages": [HumanMessage(content="What did I just say?")]},
    config=config,
    stream_mode="values",
):
    print(f"Messages: {len(event['messages'])}")
```

---

## Advanced: Custom Stream Handler

Build a reusable stream processor:

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
    """Process agent stream with configurable handlers."""
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

## Key Takeaways

1. `stream()` / `astream()` emit events as each **node** completes.
2. `stream_mode` controls granularity: `"values"` (full state), `"updates"` (changes only), `"debug"` (detailed).
3. `astream_events()` gives **token-level** streaming and fine-grained event types.
4. Filter events by name or type to focus on what matters (e.g., only LLM tokens).
5. Streaming works with checkpointing for persistent, multi-turn conversations.
6. Build UI-friendly streaming by processing events into JSON for SSE or WebSocket delivery.

---

## Practice Exercises

### Exercise 1: Progress Reporter
Build a graph with 5 sequential nodes. Stream with `stream_mode="updates"` and print a progress bar:
```
[=====>     ] 2/5 - Processing data...
```

### Exercise 2: Token-by-Token Chat
Build a chatbot that streams tokens to the console as the LLM generates them. Use `astream_events()` and filter for `on_chat_model_stream` events only.

### Exercise 3: Stream Mode Comparison
Run the same graph with all three stream modes (`"values"`, `"updates"`, `"debug"`) and:
1. Print the output of each mode
2. Count the number of events emitted by each
3. Compare the data structure of events across modes
4. Write a summary of when to use each mode

### Exercise 4: Tool Execution Monitor
Build a tool-using agent and stream it with `astream_events()`. Create a formatted output that shows:
```
[Agent] Thinking...
[Agent] I need to search for "Python tutorials"
[Tool: search] Starting...
[Tool: search] Completed (0.5s) - Found 3 results
[Agent] Based on the search results...
```

### Exercise 5: Streaming Chat Server
Build a simple HTTP server (using Python's `http.server` or aiohttp) that:
1. Accepts POST requests with a message
2. Runs a LangGraph agent
3. Streams the response back as Server-Sent Events
4. Test it with `curl` or a simple HTML page with EventSource

```python
# Hint: SSE format
# data: {"token": "Hello"}\n\n
# data: {"token": " world"}\n\n
# data: {"done": true}\n\n
```
