# 08 - Tools in Graphs: Equipping Agents with Capabilities

## Why Tools?

An LLM by itself can only generate text. To interact with the real world -- search the web, query databases, call APIs, run calculations -- it needs **tools**. In LangGraph, the standard pattern is:

1. **LLM node**: the agent thinks and decides which tools to call
2. **Router**: checks if the LLM wants to call tools or give a final answer
3. **Tool node**: executes the requested tools and returns results
4. **Cycle back**: the LLM interprets the tool results and decides what to do next

```
START -> agent (LLM) -> should_continue? -> tool_executor -> agent (LLM) -> ...
                      \-> END
```

This is the **ReAct pattern** (Reasoning + Acting): think, act, observe, repeat.

---

## Defining Tools

LangChain uses the `@tool` decorator to define tools:

```python
from langchain_core.tools import tool


@tool
def search_web(query: str) -> str:
    """Search the web for information. Use this when you need current facts or data."""
    # In production, call a real search API
    return f"Search results for '{query}': Python is a popular programming language..."


@tool
def calculator(expression: str) -> str:
    """Calculate a mathematical expression. Input should be a valid Python math expression."""
    try:
        result = eval(expression)  # Use a safe evaluator in production!
        return str(result)
    except Exception as e:
        return f"Error: {e}"


@tool
def get_weather(city: str) -> str:
    """Get the current weather for a city."""
    # Simulated
    return f"Weather in {city}: 72F, sunny"
```

Each tool has:
- A **name** (derived from the function name)
- A **description** (from the docstring -- the LLM reads this to decide when to use it)
- **Parameters** (from the function signature -- the LLM fills these in)

**Node.js comparison:**
```typescript
// In TypeScript, tool definitions look like OpenAI function calling:
const tools = [{
  type: "function",
  function: {
    name: "search_web",
    description: "Search the web for information",
    parameters: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
}];
```

---

## Binding Tools to the LLM

Tell the LLM which tools are available:

```python
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

tools = [search_web, calculator, get_weather]

# Bind tools to the LLM -- it now knows about them
llm_with_tools = llm.bind_tools(tools)
```

When you call `llm_with_tools.invoke(messages)`, the response may contain **tool calls** -- structured requests to execute specific tools:

```python
from langchain_core.messages import HumanMessage

response = llm_with_tools.invoke([
    HumanMessage(content="What is 15 * 37?")
])

print(response.tool_calls)
# [{'name': 'calculator', 'args': {'expression': '15 * 37'}, 'id': 'call_abc123'}]
```

---

## ToolNode: Pre-Built Tool Executor

LangGraph provides `ToolNode`, a pre-built node that automatically executes tool calls from an AI message:

```python
from langgraph.prebuilt import ToolNode

tool_node = ToolNode(tools)
```

`ToolNode` does:
1. Reads the last AI message from state
2. Extracts all tool calls from it
3. Executes each tool
4. Returns `ToolMessage` results that get appended to state

---

## The Complete Tool-Calling Agent Pattern

Here is the standard pattern used in most LangGraph agents:

```python
from typing import TypedDict, Annotated
from langchain_core.messages import BaseMessage, HumanMessage
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langgraph.graph import StateGraph, START, END, add_messages
from langgraph.prebuilt import ToolNode


# --- State ---
class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]


# --- Tools ---
@tool
def search_web(query: str) -> str:
    """Search the web for current information."""
    return f"Results for '{query}': LangGraph is a framework by LangChain for building stateful agent workflows."


@tool
def calculator(expression: str) -> str:
    """Evaluate a mathematical expression."""
    try:
        return str(eval(expression))
    except Exception as e:
        return f"Error: {e}"


tools = [search_web, calculator]


# --- LLM with tools ---
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
llm_with_tools = llm.bind_tools(tools)


# --- Nodes ---
def agent(state: AgentState) -> dict:
    """The agent node: calls the LLM which may request tool use."""
    response = llm_with_tools.invoke(state["messages"])
    return {"messages": [response]}


tool_node = ToolNode(tools)


# --- Router ---
def should_continue(state: AgentState) -> str:
    """Check if the LLM wants to use tools or is done."""
    last_message = state["messages"][-1]
    if last_message.tool_calls:
        return "tools"
    return END


# --- Build the Graph ---
graph = StateGraph(AgentState)
graph.add_node("agent", agent)
graph.add_node("tools", tool_node)

graph.add_edge(START, "agent")
graph.add_conditional_edges("agent", should_continue, {
    "tools": "tools",
    END: END,
})
graph.add_edge("tools", "agent")  # After tools, go back to agent to interpret results

app = graph.compile()


# --- Run ---
result = app.invoke({
    "messages": [HumanMessage(content="What is 42 * 58, and what is LangGraph?")]
})

for msg in result["messages"]:
    print(f"[{msg.type}] {msg.content[:150] if msg.content else '(tool calls)'}")
```

### What Happens Step by Step

1. User sends: "What is 42 * 58, and what is LangGraph?"
2. **Agent node**: LLM decides to call both `calculator` and `search_web`
3. **Router**: sees tool_calls -> routes to "tools"
4. **Tool node**: executes both tools, returns ToolMessages
5. **Agent node**: LLM reads tool results, composes a final answer
6. **Router**: no more tool_calls -> routes to END

---

## Error Handling in Tool Nodes

Tools can fail. Handle errors gracefully so the agent can recover:

### Option 1: Handle in the tool itself

```python
@tool
def risky_api_call(endpoint: str) -> str:
    """Call an external API. Provide the endpoint path."""
    try:
        import httpx
        response = httpx.get(f"https://api.example.com/{endpoint}", timeout=10)
        response.raise_for_status()
        return response.text
    except httpx.TimeoutException:
        return "Error: API call timed out. Try again or use a different approach."
    except httpx.HTTPStatusError as e:
        return f"Error: API returned status {e.response.status_code}. Check the endpoint."
    except Exception as e:
        return f"Error: {str(e)}"
```

### Option 2: Use ToolNode's error handling

`ToolNode` has built-in error handling. If a tool raises an exception, it returns a `ToolMessage` with the error:

```python
tool_node = ToolNode(tools, handle_tool_errors=True)
```

### Option 3: Custom tool executor with retry logic

```python
def custom_tool_executor(state: AgentState) -> dict:
    """Custom tool execution with retry logic."""
    last_message = state["messages"][-1]
    results = []

    for tool_call in last_message.tool_calls:
        tool_name = tool_call["name"]
        tool_args = tool_call["args"]
        tool_id = tool_call["id"]

        # Find the tool
        tool_map = {t.name: t for t in tools}
        selected_tool = tool_map.get(tool_name)

        if not selected_tool:
            from langchain_core.messages import ToolMessage
            results.append(ToolMessage(
                content=f"Error: Unknown tool '{tool_name}'",
                tool_call_id=tool_id,
            ))
            continue

        # Retry logic
        max_retries = 3
        for attempt in range(max_retries):
            try:
                result = selected_tool.invoke(tool_args)
                from langchain_core.messages import ToolMessage
                results.append(ToolMessage(content=str(result), tool_call_id=tool_id))
                break
            except Exception as e:
                if attempt == max_retries - 1:
                    from langchain_core.messages import ToolMessage
                    results.append(ToolMessage(
                        content=f"Error after {max_retries} retries: {str(e)}",
                        tool_call_id=tool_id,
                    ))

    return {"messages": results}
```

---

## Custom Tool Execution Logic

Sometimes you need logic around tool execution that `ToolNode` does not provide:

### Logging and Metrics

```python
import time
import logging

logger = logging.getLogger("agent_tools")


def instrumented_tool_executor(state: AgentState) -> dict:
    """Execute tools with logging and timing."""
    last_message = state["messages"][-1]
    results = []
    tool_map = {t.name: t for t in tools}

    for tool_call in last_message.tool_calls:
        tool_name = tool_call["name"]
        tool_args = tool_call["args"]

        logger.info(f"Executing tool: {tool_name} with args: {tool_args}")
        start = time.time()

        try:
            result = tool_map[tool_name].invoke(tool_args)
            elapsed = time.time() - start
            logger.info(f"Tool {tool_name} completed in {elapsed:.2f}s")
        except Exception as e:
            elapsed = time.time() - start
            logger.error(f"Tool {tool_name} failed after {elapsed:.2f}s: {e}")
            result = f"Error: {e}"

        from langchain_core.messages import ToolMessage
        results.append(ToolMessage(content=str(result), tool_call_id=tool_call["id"]))

    return {"messages": results}
```

### Tool Approval Gate

Combine tools with human-in-the-loop:

```python
from langgraph.checkpoint.memory import MemorySaver

# Pause before executing tools for human approval
memory = MemorySaver()
app = graph.compile(
    checkpointer=memory,
    interrupt_before=["tools"],  # Pause before tool execution
)

# Human can inspect what the agent wants to do
config = {"configurable": {"thread_id": "tool-approval"}}
result = app.invoke({"messages": [HumanMessage(content="Search for latest AI news")]}, config=config)

state = app.get_state(config)
pending_tools = state.values["messages"][-1].tool_calls
print("Agent wants to call:", pending_tools)
# Human approves -> resume
result = app.invoke(None, config=config)
```

---

## Parallel Tool Execution

When the LLM requests multiple tools in a single response, `ToolNode` executes them all. By default, this is sequential. For parallel execution:

```python
import asyncio
from langchain_core.messages import ToolMessage


async def parallel_tool_executor(state: AgentState) -> dict:
    """Execute multiple tool calls in parallel."""
    last_message = state["messages"][-1]
    tool_map = {t.name: t for t in tools}

    async def execute_one(tool_call):
        tool_name = tool_call["name"]
        tool_args = tool_call["args"]
        try:
            # If tool supports async:
            if hasattr(tool_map[tool_name], "ainvoke"):
                result = await tool_map[tool_name].ainvoke(tool_args)
            else:
                result = tool_map[tool_name].invoke(tool_args)
            return ToolMessage(content=str(result), tool_call_id=tool_call["id"])
        except Exception as e:
            return ToolMessage(content=f"Error: {e}", tool_call_id=tool_call["id"])

    # Execute all tool calls concurrently
    results = await asyncio.gather(*[
        execute_one(tc) for tc in last_message.tool_calls
    ])

    return {"messages": list(results)}
```

---

## Using create_react_agent (Shortcut)

LangGraph provides a high-level helper that builds the entire tool-calling agent pattern in one line:

```python
from langgraph.prebuilt import create_react_agent
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="gpt-4o-mini")
tools = [search_web, calculator, get_weather]

# This creates the full agent -> should_continue -> tools -> agent graph
agent = create_react_agent(llm, tools)

result = agent.invoke({
    "messages": [HumanMessage(content="What is the weather in NYC and what is 100/7?")]
})

for msg in result["messages"]:
    print(f"[{msg.type}] {msg.content[:150] if msg.content else str(msg.tool_calls)[:150]}")
```

`create_react_agent` is great for getting started. Build custom graphs when you need more control.

### With system prompt

```python
agent = create_react_agent(
    llm,
    tools,
    state_modifier="You are a helpful research assistant. Always cite your sources."
)
```

### With checkpointer

```python
from langgraph.checkpoint.memory import MemorySaver

agent = create_react_agent(llm, tools, checkpointer=MemorySaver())

config = {"configurable": {"thread_id": "session-001"}}
result = agent.invoke({"messages": [HumanMessage(content="Hi!")]}, config=config)
```

---

## Building Complex Tools

### Tool with Structured Input

```python
from pydantic import BaseModel, Field


class SearchParams(BaseModel):
    query: str = Field(description="The search query")
    max_results: int = Field(default=5, description="Maximum number of results to return")
    date_range: str = Field(default="any", description="Date filter: 'today', 'week', 'month', 'any'")


@tool(args_schema=SearchParams)
def advanced_search(query: str, max_results: int = 5, date_range: str = "any") -> str:
    """Search the web with advanced filters."""
    return f"Found {max_results} results for '{query}' ({date_range})"
```

### Tool that Returns Structured Data

```python
import json

@tool
def get_stock_price(symbol: str) -> str:
    """Get the current stock price for a given ticker symbol."""
    # Simulated
    data = {
        "symbol": symbol.upper(),
        "price": 150.25,
        "change": 2.5,
        "change_percent": 1.69,
    }
    return json.dumps(data)
```

### Async Tool

```python
@tool
async def async_search(query: str) -> str:
    """Search asynchronously."""
    import httpx
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://httpbin.org/get",
            params={"q": query},
        )
        return response.text
```

---

## Key Takeaways

1. Tools give LLMs the ability to interact with the real world.
2. The standard pattern is: **agent (LLM) -> router -> tool executor -> agent (cycle)**.
3. `ToolNode` handles tool execution automatically; use custom executors for logging, retries, or parallel execution.
4. `create_react_agent` is a one-line shortcut for the full tool-calling pattern.
5. Always handle tool errors gracefully so the agent can recover.
6. Combine tools with human-in-the-loop by interrupting before the tool node.
7. Tools need clear **descriptions** -- the LLM uses these to decide when and how to call them.

---

## Practice Exercises

### Exercise 1: Calculator Agent
Build an agent with these tools:
- `add(a, b)` - adds two numbers
- `multiply(a, b)` - multiplies two numbers
- `power(base, exponent)` - raises base to exponent

Ask it: "What is (5 + 3) * 2 to the power of 4?" and observe how it chains tool calls.

### Exercise 2: Information Gathering Agent
Build an agent with:
- `search_wikipedia(topic)` - returns a simulated Wikipedia summary
- `get_current_date()` - returns today's date
- `convert_units(value, from_unit, to_unit)` - converts between units

Ask it: "How tall is the Eiffel Tower in feet?" (Wikipedia would give meters, it needs to convert.)

### Exercise 3: Custom Tool Executor with Logging
Replace `ToolNode` with a custom executor that:
- Logs each tool call with timestamp
- Times how long each tool takes
- Stores execution metrics in state (tool name, duration, success/failure)
- Prints a summary at the end

### Exercise 4: Tool Approval Workflow
Build a tool-using agent where:
- Safe tools (calculator, date) execute automatically
- Risky tools (web search, file operations) require human approval
- Use `interrupt_before` selectively (you may need two separate tool nodes: `safe_tools` and `risky_tools`)

### Exercise 5: Multi-Tool Research Agent
Build an agent with 5+ tools:
- `search_web(query)` - web search
- `read_url(url)` - reads a webpage
- `save_note(title, content)` - saves a research note
- `list_notes()` - lists all saved notes
- `summarize(text)` - summarizes long text
- `draft_report(topic, notes)` - drafts a report from notes

Give it a research task and observe how it uses multiple tools iteratively to build a report. Store notes in state so they persist across tool calls.
