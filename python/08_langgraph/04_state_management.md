# 04 - State Management: Reducers, Messages, and Persistence

## State Design Patterns

State is the backbone of every LangGraph workflow. Designing it well makes your graphs easier to build, debug, and extend.

### What to Put in State

| Include | Avoid |
|---|---|
| Conversation messages | Large binary data (files, images) |
| LLM responses and tool results | Secrets or API keys |
| Control flow flags (iteration count, status) | Immutable configuration (put in graph config) |
| Intermediate computation results | Temporary variables only one node needs |
| Accumulated context for decisions | Raw HTTP responses (extract what you need) |

### State Schema Guidelines

```python
from typing import TypedDict, Annotated, Optional
import operator
from langchain_core.messages import BaseMessage


class WellDesignedState(TypedDict):
    # Conversation messages -- always use a reducer for lists
    messages: Annotated[list[BaseMessage], operator.add]

    # Current task context
    current_task: str
    task_status: str  # "pending", "in_progress", "completed", "failed"

    # Accumulated results
    search_results: Annotated[list[dict], operator.add]

    # Control flow
    iteration_count: int
    max_iterations: int

    # Final output
    final_response: str
```

**TypeScript comparison:**
```typescript
// In TypeScript, you might use a Zustand store or Redux slice:
interface AgentState {
  messages: Message[];
  currentTask: string;
  taskStatus: "pending" | "in_progress" | "completed" | "failed";
  searchResults: SearchResult[];
  iterationCount: number;
}
```

---

## Reducers: How State Updates Work

This is one of the most important concepts in LangGraph and the most common source of bugs.

### The Problem

When a node returns `{"messages": [new_message]}`, what should happen to the existing messages? Should they be **replaced** or **appended to**?

By default, LangGraph **replaces** the value:

```python
class NaiveState(TypedDict):
    items: list[str]

# Node returns:
{"items": ["new_item"]}

# State BEFORE: {"items": ["old_item_1", "old_item_2"]}
# State AFTER:  {"items": ["new_item"]}  -- old items are GONE!
```

This is usually not what you want for lists like messages.

### The Solution: Annotated Reducers

Use `Annotated` with a reducer function to control how updates are merged:

```python
from typing import Annotated
import operator

class SmartState(TypedDict):
    # operator.add concatenates lists
    items: Annotated[list[str], operator.add]

# Node returns:
{"items": ["new_item"]}

# State BEFORE: {"items": ["old_item_1", "old_item_2"]}
# State AFTER:  {"items": ["old_item_1", "old_item_2", "new_item"]}  -- appended!
```

### Common Reducers

```python
import operator

class ExampleState(TypedDict):
    # Append to list (most common for messages)
    messages: Annotated[list, operator.add]

    # Replace (default behavior, no annotation needed)
    current_step: str

    # Append to list of dicts
    tool_results: Annotated[list[dict], operator.add]

    # Counter that replaces (just set the new value)
    iteration_count: int
```

### Custom Reducer Functions

You can write your own reducer. A reducer takes the old value and the new value and returns the merged result:

```python
def keep_last_n(n: int):
    """Create a reducer that keeps only the last N items."""
    def reducer(existing: list, new: list) -> list:
        combined = existing + new
        return combined[-n:]
    return reducer

class BoundedState(TypedDict):
    # Keep only the last 20 messages to prevent context overflow
    messages: Annotated[list[BaseMessage], keep_last_n(20)]
```

Another example -- deduplication:

```python
def deduplicate(existing: list[str], new: list[str]) -> list[str]:
    """Add items only if they are not already present."""
    seen = set(existing)
    result = list(existing)
    for item in new:
        if item not in seen:
            result.append(item)
            seen.add(item)
    return result

class DeduplicatedState(TypedDict):
    tags: Annotated[list[str], deduplicate]
```

---

## Messages in State: Managing Conversation History

For chat-based agents, messages are the core state. LangGraph uses LangChain's message types:

```python
from langchain_core.messages import (
    HumanMessage,      # User input
    AIMessage,          # LLM response
    SystemMessage,      # System prompt
    ToolMessage,        # Tool execution result
    BaseMessage,        # Base type for all
)

class ChatState(TypedDict):
    messages: Annotated[list[BaseMessage], operator.add]
```

### How the Message Flow Works

```python
# 1. User sends a message
initial_state = {
    "messages": [HumanMessage(content="What is the weather in NYC?")]
}

# 2. LLM node reads messages, calls LLM, appends AI response
def call_llm(state):
    response = llm.invoke(state["messages"])
    return {"messages": [response]}  # Appended via operator.add

# 3. If LLM called a tool, tool node executes and appends result
def run_tools(state):
    tool_call = state["messages"][-1].tool_calls[0]
    result = execute_tool(tool_call)
    return {"messages": [ToolMessage(content=result, tool_call_id=tool_call["id"])]}

# 4. Messages accumulate:
# [HumanMessage, AIMessage(tool_calls=...), ToolMessage, AIMessage(final answer)]
```

### The add_messages Reducer

LangGraph provides a specialized reducer for messages that handles message IDs and updates:

```python
from langgraph.graph import MessagesState

# This is a pre-built state class equivalent to:
# class MessagesState(TypedDict):
#     messages: Annotated[list[BaseMessage], add_messages]

# You can extend it:
class MyState(MessagesState):
    user_name: str
    session_id: str
```

The `add_messages` reducer is smarter than `operator.add` -- it can update existing messages by ID instead of always appending.

---

## State Channels and Annotations

Under the hood, each key in your state is a **channel**. The `Annotated` type hint configures how that channel works.

```python
from typing import Annotated
from langgraph.graph import add_messages

class FullFeaturedState(TypedDict):
    # Channel with add_messages reducer (smart message handling)
    messages: Annotated[list[BaseMessage], add_messages]

    # Channel with list append reducer
    documents: Annotated[list[str], operator.add]

    # Channel with simple replacement (default)
    status: str

    # Channel with custom reducer
    scores: Annotated[list[float], lambda old, new: sorted(old + new, reverse=True)[:10]]
```

---

## Checkpointing: Persistence with MemorySaver

Checkpointing saves the state after each node execution, enabling:
- **Persistence**: resume a conversation after a server restart
- **Human-in-the-loop**: pause, inspect state, modify, resume
- **Time travel**: go back to any previous state
- **Thread management**: maintain separate conversations

### MemorySaver (In-Memory)

```python
from langgraph.checkpoint.memory import MemorySaver

memory = MemorySaver()
app = graph.compile(checkpointer=memory)
```

### SQLite Saver (Persistent)

```python
from langgraph.checkpoint.sqlite import SqliteSaver

# File-based persistence
with SqliteSaver.from_conn_string("checkpoints.db") as saver:
    app = graph.compile(checkpointer=saver)
    # Use app within this context
```

### PostgreSQL Saver (Production)

```python
from langgraph.checkpoint.postgres import PostgresSaver

with PostgresSaver.from_conn_string("postgresql://user:pass@localhost/db") as saver:
    app = graph.compile(checkpointer=saver)
```

---

## Thread-Based Conversations

When using a checkpointer, you identify conversations with a **thread_id** in the config. This is similar to how you might use session IDs in Express.js.

```python
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import HumanMessage
from langgraph.graph import StateGraph, START, END, MessagesState
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="gpt-4o-mini")
memory = MemorySaver()


def chatbot(state: MessagesState) -> dict:
    response = llm.invoke(state["messages"])
    return {"messages": [response]}


graph = StateGraph(MessagesState)
graph.add_node("chatbot", chatbot)
graph.add_edge(START, "chatbot")
graph.add_edge("chatbot", END)
app = graph.compile(checkpointer=memory)


# Conversation 1
config1 = {"configurable": {"thread_id": "user-alice-001"}}

result = app.invoke(
    {"messages": [HumanMessage(content="My name is Alice.")]},
    config=config1,
)
print(result["messages"][-1].content)
# "Hello Alice! How can I help you today?"

# Continue the SAME conversation -- Alice's name is remembered
result = app.invoke(
    {"messages": [HumanMessage(content="What is my name?")]},
    config=config1,
)
print(result["messages"][-1].content)
# "Your name is Alice!"


# Conversation 2 -- completely separate thread
config2 = {"configurable": {"thread_id": "user-bob-002"}}

result = app.invoke(
    {"messages": [HumanMessage(content="What is my name?")]},
    config=config2,
)
print(result["messages"][-1].content)
# "I don't know your name. Could you tell me?"
```

**Node.js analogy:**
```typescript
// Express.js session-based chat
app.post("/chat", (req, res) => {
  const sessionId = req.session.id;
  const history = chatStore.get(sessionId) || [];
  history.push(req.body.message);
  // ... call LLM with history ...
  chatStore.set(sessionId, history);
});
```

LangGraph's checkpointer automates all of this. You just pass a `thread_id`.

---

## Accessing State and History

### Get Current State

```python
config = {"configurable": {"thread_id": "user-alice-001"}}

# Get the current state snapshot
state_snapshot = app.get_state(config)
print(state_snapshot.values)          # The current state dict
print(state_snapshot.next)            # Next node(s) to execute (if paused)
print(state_snapshot.config)          # Config including checkpoint_id
```

### Update State Externally

You can modify state from outside the graph (useful for human-in-the-loop):

```python
# Add a message to the conversation externally
app.update_state(
    config,
    {"messages": [HumanMessage(content="Actually, my name is Alicia.")]},
)
```

### Browse State History

```python
# Iterate through all checkpoints for a thread
for state in app.get_state_history(config):
    print(f"Step: {state.metadata.get('step', '?')}")
    print(f"Node: {state.metadata.get('source', '?')}")
    print(f"Messages: {len(state.values.get('messages', []))}")
    print("---")
```

### Time Travel: Resume from a Previous State

```python
# Get history and find a checkpoint to revert to
history = list(app.get_state_history(config))
old_state = history[3]  # Some previous checkpoint

# Resume from that old state
result = app.invoke(
    {"messages": [HumanMessage(content="Let's try a different approach.")]},
    config=old_state.config,  # Use the old checkpoint's config
)
```

---

## Full Example: Persistent Chat Agent

```python
from typing import Annotated
from typing_extensions import TypedDict
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, BaseMessage
from langgraph.graph import StateGraph, START, END, add_messages
from langgraph.checkpoint.memory import MemorySaver


class ConversationState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    summary: str


llm = ChatOpenAI(model="gpt-4o-mini")


def conversation_node(state: ConversationState) -> dict:
    """Main conversation node with optional summary context."""
    messages = state["messages"]
    if state.get("summary"):
        # Prepend summary of earlier conversation
        context = f"Summary of earlier conversation: {state['summary']}\n\n"
        messages = [{"role": "system", "content": context}] + messages

    response = llm.invoke(messages)
    return {"messages": [response]}


def should_summarize(state: ConversationState) -> str:
    """Summarize if conversation is getting long."""
    if len(state["messages"]) > 10:
        return "summarize"
    return "end"


def summarize_conversation(state: ConversationState) -> dict:
    """Summarize old messages to keep context window manageable."""
    messages = state["messages"]
    summary_prompt = (
        "Summarize the following conversation in 2-3 sentences:\n"
        + "\n".join(m.content for m in messages[:-2] if hasattr(m, "content"))
    )
    summary = llm.invoke(summary_prompt)

    # Keep only the last 2 messages + the summary
    return {
        "summary": summary.content,
        "messages": messages[-2:],
    }


graph = StateGraph(ConversationState)
graph.add_node("chat", conversation_node)
graph.add_node("summarize", summarize_conversation)

graph.add_edge(START, "chat")
graph.add_conditional_edges("chat", should_summarize, {
    "summarize": "summarize",
    "end": END,
})
graph.add_edge("summarize", END)

memory = MemorySaver()
app = graph.compile(checkpointer=memory)

# Simulate a multi-turn conversation
config = {"configurable": {"thread_id": "demo-thread"}}

turns = [
    "Hi, I'm learning LangGraph!",
    "Can you explain what nodes are?",
    "And what about edges?",
    "How do conditional edges work?",
    "What is state management?",
    "Tell me about checkpointing.",
]

for turn in turns:
    result = app.invoke(
        {"messages": [HumanMessage(content=turn)]},
        config=config,
    )
    print(f"User: {turn}")
    print(f"Bot: {result['messages'][-1].content[:100]}...")
    print()
```

---

## Key Takeaways

1. **Reducers** control how state updates are merged. Use `Annotated[list, operator.add]` for lists you want to append to.
2. `add_messages` is a specialized reducer for LangChain messages that supports updates by ID.
3. **Checkpointers** (MemorySaver, SqliteSaver, PostgresSaver) persist state across invocations.
4. **Thread IDs** in config identify separate conversations, like session IDs in Express.
5. You can **inspect**, **modify**, and **time-travel** through state history.
6. Design state intentionally: include what nodes need to share, exclude temporary data.

---

## Practice Exercises

### Exercise 1: Custom Reducer
Create a state with a custom reducer for a `scores` field that:
- Appends new scores to the list
- Keeps only the top 5 highest scores
- Build a simple graph that adds scores in multiple nodes and verify the top-5 behavior

### Exercise 2: Conversation Memory
Build a chatbot graph with:
- MemorySaver checkpointer
- Thread-based conversations
- Send 5 messages on thread "A", then 3 on thread "B"
- Switch back to thread "A" and verify it remembers the full history
- Print the message count for each thread

### Exercise 3: State History Explorer
Using any graph with a checkpointer:
1. Run 5 invocations on the same thread
2. Use `get_state_history()` to list all checkpoints
3. Resume from checkpoint #2 with a different message
4. Compare the diverged conversation paths

### Exercise 4: Bounded Message History
Build a chat agent that uses a custom reducer to keep only the last 10 messages. Test that after 15 messages, only the most recent 10 are in state. Verify the agent still has context via a summary mechanism.

### Exercise 5: State Inspection Dashboard
Write a function `print_thread_dashboard(app, thread_id)` that:
1. Gets the current state for a thread
2. Prints total messages, last message preview, any pending next nodes
3. Prints a timeline of all checkpoints with timestamps
4. Shows which nodes were executed and in what order
