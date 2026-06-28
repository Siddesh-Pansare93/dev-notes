# Phase 2: LangGraph Core (Weeks 3-5)

Welcome to Phase 2 of the Agentic AI & LangGraph learning track. Over the next three weeks, we will transition from basic LLM chains to complex, stateful, and cyclical agentic workflows using **LangGraph**. 

LangGraph is an extension of LangChain specifically designed for building robust, multi-actor, and stateful applications. While traditional chains (like LCEL) are Directed Acyclic Graphs (DAGs) where execution flows in one direction, LangGraph introduces cycles, state management, and built-in persistence, which are essential for creating true autonomous agents.

---

## 1. Master LangGraph's Primitives: Nodes, Edges, and Shared State

At its core, LangGraph models agent workflows as graphs. To build a graph, you need to understand three fundamental primitives: **State**, **Nodes**, and **Edges**.

### The Shared State
The State is the backbone of a LangGraph application. It is a shared data structure (usually a `TypedDict` or Pydantic model) that is passed between every node in the graph. Each node receives the current state, performs its logic, and returns an update to the state.

```python
from typing import TypedDict, Annotated
import operator

# Define the state schema
# Annotated[list, operator.add] tells LangGraph to append to the list rather than overwrite it
class AgentState(TypedDict):
    messages: Annotated[list, operator.add]
    counter: int
    status: str
```

### Nodes
Nodes are standard Python functions (or LangChain Runnables) that do the actual work. They take the current `State` as input and return a dictionary containing the updates to be applied to the state.

```python
def node_a(state: AgentState):
    print("Executing Node A")
    # Returns an update to the state
    return {"messages": ["Message from Node A"], "counter": state.get("counter", 0) + 1}

def node_b(state: AgentState):
    print("Executing Node B")
    return {"status": "completed"}
```

### Edges
Edges define the flow of execution between nodes. You connect nodes using standard edges (always go from A to B) or conditional edges (go to B or C based on logic). LangGraph provides special `START` and `END` nodes to define entry and exit points.

```python
from langgraph.graph import StateGraph, START, END

# Initialize the graph with the state schema
builder = StateGraph(AgentState)

# Add nodes to the graph
builder.add_node("node_a", node_a)
builder.add_node("node_b", node_b)

# Define the flow (Edges)
builder.add_edge(START, "node_a")
builder.add_edge("node_a", "node_b")
builder.add_edge("node_b", END)

# Compile the graph into an executable runnable
graph = builder.compile()

# Run the graph
initial_state = {"messages": [], "counter": 0, "status": "pending"}
result = graph.invoke(initial_state)
print(result)
```

---

## 2. Stateful Workflows: Conditional Branching and Loops

Agents rarely follow a straight line. They need to inspect the current state, decide what to do next, and potentially loop back to a previous step (e.g., retrying an API call or thinking longer). 

### Conditional Edges
A conditional edge uses a routing function to determine the next node dynamically.

```python
def router_function(state: AgentState) -> str:
    """Returns the name of the next node based on state."""
    if state["counter"] < 3:
        return "loop_back"
    else:
        return "finish"

builder = StateGraph(AgentState)

builder.add_node("process_node", node_a) # Reusing node_a from above
builder.add_node("final_node", node_b)

builder.add_edge(START, "process_node")

# Add conditional routing
builder.add_conditional_edges(
    "process_node",          # Source node
    router_function,         # Routing logic
    {
        "loop_back": "process_node", # If router returns "loop_back", go to process_node
        "finish": "final_node"       # If router returns "finish", go to final_node
    }
)

builder.add_edge("final_node", END)
compiled_graph = builder.compile()

# This will loop 3 times before finishing
result = compiled_graph.invoke({"messages": [], "counter": 0})
print(f"Final Counter: {result['counter']}")
```

---

## 3. Implementing Memory

Agents need memory to maintain context over a conversation (short-term) and recall facts over days or weeks (long-term).

### Short-Term Memory (In-State Persistence)
LangGraph provides built-in checkpointers to save the graph's state after every step. This allows for conversation threads and "time travel" (rewinding state).

```python
from langgraph.checkpoint.memory import MemorySaver

# In-memory checkpointer for demonstration (use SQL/Redis for production)
memory = MemorySaver()

# Compile with the checkpointer
persistent_graph = builder.compile(checkpointer=memory)

# A thread_id is required to keep track of different conversations
config = {"configurable": {"thread_id": "user_123"}}

# Run the graph
persistent_graph.invoke({"messages": ["Hello!"], "counter": 0}, config=config)

# Run it again with the same thread_id - it remembers the previous state!
final_state = persistent_graph.invoke({"messages": ["What's next?"]}, config=config)
```

### Long-Term Memory (Vector Database)
To implement long-term memory, we typically use a Vector Database (like Chroma or Pinecone) as an external tool that a node can query or write to.

```python
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings

# Initialize Vector DB
vector_store = Chroma(embedding_function=OpenAIEmbeddings())

def memory_retrieval_node(state: AgentState):
    """A node that fetches long-term memory based on the latest message."""
    latest_query = state["messages"][-1]
    
    # Retrieve relevant past documents
    docs = vector_store.similarity_search(latest_query, k=2)
    memory_context = "\n".join([doc.page_content for doc in docs])
    
    # Append the context to the state for the LLM to use
    return {"messages": [f"System: Recalled context - {memory_context}"]}
```

---

## 4. Building a ReAct Agent

The ReAct (Reason + Act) architecture is the standard pattern for tool-using agents. The agent thinks about what to do, uses a tool, observes the output, and loops until it solves the problem.

LangGraph makes this incredibly simple via `create_react_agent`, but building it from scratch helps you understand the architecture.

```python
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage, ToolMessage
from langgraph.prebuilt import ToolNode, tools_condition

# 1. Define Tools
def search_weather(location: str) -> str:
    """Returns the weather for a location."""
    return f"The weather in {location} is 72°F and sunny."

tools = [search_weather]
llm = ChatOpenAI(model="gpt-4o").bind_tools(tools)

# 2. Define State
from langgraph.graph.message import add_messages
class ReActState(TypedDict):
    messages: Annotated[list, add_messages]

# 3. Define Nodes
def agent_node(state: ReActState):
    # LLM decides whether to answer or call a tool
    response = llm.invoke(state["messages"])
    return {"messages": [response]}

# ToolNode automatically executes functions based on LLM's tool calls
tool_node = ToolNode(tools)

# 4. Build Graph
react_builder = StateGraph(ReActState)
react_builder.add_node("agent", agent_node)
react_builder.add_node("tools", tool_node)

react_builder.add_edge(START, "agent")

# tools_condition checks if the LLM output contains tool_calls.
# If yes, routes to "tools". If no, routes to END.
react_builder.add_conditional_edges("agent", tools_condition)
react_builder.add_edge("tools", "agent")

react_agent = react_builder.compile()

# Test the ReAct agent
response = react_agent.invoke({
    "messages": [HumanMessage(content="What is the weather in San Francisco?")]
})
print(response["messages"][-1].content)
```

---

## 5. Building a Reflection Agent

A Reflection agent improves its own output by evaluating it before presenting it to the user. It consists of a **Generator** (writes the content) and a **Reflector/Evaluator** (critiques it). They loop until the output meets a specific quality threshold.

```python
class ReflectionState(TypedDict):
    messages: Annotated[list, add_messages]
    draft: str
    feedback: str
    iterations: int

llm = ChatOpenAI(model="gpt-4o")

def generate_draft(state: ReflectionState):
    """Generates the initial draft or refines it based on feedback."""
    prompt = f"Write a short essay on AI. \nFeedback to incorporate: {state.get('feedback', 'None')}"
    response = llm.invoke([HumanMessage(content=prompt)])
    
    return {
        "draft": response.content, 
        "iterations": state.get("iterations", 0) + 1
    }

def reflect_on_draft(state: ReflectionState):
    """Critiques the draft."""
    prompt = f"Critique this draft. Provide actionable feedback to make it better. Draft: {state['draft']}"
    response = llm.invoke([SystemMessage(content="You are a strict editor."), HumanMessage(content=prompt)])
    
    return {"feedback": response.content}

def reflection_router(state: ReflectionState) -> str:
    """Decide whether to keep reflecting or finish."""
    if state["iterations"] >= 3: # Max 3 revisions
        return "finish"
    return "reflect"

# Build the Graph
reflection_builder = StateGraph(ReflectionState)

reflection_builder.add_node("generator", generate_draft)
reflection_builder.add_node("reflector", reflect_on_draft)

reflection_builder.add_edge(START, "generator")

# After generation, route to either reflection or END
reflection_builder.add_conditional_edges(
    "generator", 
    reflection_router,
    {"reflect": "reflector", "finish": END}
)

# After reflection, always go back to generator
reflection_builder.add_edge("reflector", "generator")

reflection_agent = reflection_builder.compile()

# Run the Reflection Agent
final_output = reflection_agent.invoke({"messages": [], "iterations": 0})
print("\n=== FINAL DRAFT ===")
print(final_output["draft"])
```

## Summary
In Phase 2, you have learned how to structure applications as graphs using Nodes, Edges, and a Shared State. You've implemented conditional routing, utilized `MemorySaver` for persistence, and built complex Agent patterns like ReAct and Reflection. In Phase 3, we will cover Multi-Agent Systems and Human-in-the-Loop configurations.