# Phase 3: Advanced Architectures in Agentic AI & LangGraph

**Timeline:** Weeks 6-10  
**Prerequisites:** Mastery of basic LangGraph concepts (StateGraphs, Nodes, Edges) and core LangChain LCEL.

Welcome to Phase 3 of the Agentic AI & LangGraph learning track. In this phase, we transition from single-agent loops to complex, production-ready architectures. You will learn how to orchestrate multiple agents, dynamically route information in Agentic RAG systems, scale tool usage using the Model Context Protocol (MCP), and monitor your applications using LangSmith and the LangGraph Platform.

---

## Week 6: Multi-Agent Systems & Orchestration

Single agents can struggle with complex, multi-step tasks that require diverse expertise. Multi-agent systems solve this by dividing responsibilities among specialized "worker" agents, overseen by an "orchestrator" or "supervisor."

### The Orchestrator ↔ Worker Pattern

In this pattern, a Supervisor node analyzes the incoming task and decides which specialized worker should act next. Once the worker finishes, control returns to the Supervisor to determine the next step or conclude the process.

**Key Advantages:**
1. **Separation of Concerns:** Each worker has a specific prompt and toolset (e.g., a "Coder" agent and a "Reviewer" agent).
2. **Scalability:** You can add new workers without rewriting the logic of existing ones.

### Code Example: Building a Supervisor in LangGraph

```python
from typing import Annotated, Sequence, TypedDict
import operator
from langchain_core.messages import BaseMessage, HumanMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END

# 1. Define the State
class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], operator.add]
    next_agent: str

# 2. Define the Supervisor Node
def supervisor_node(state: AgentState):
    llm = ChatOpenAI(model="gpt-4o")
    prompt = f"""You are a supervisor managing two workers: 'Researcher' and 'Coder'.
    Based on the conversation history, who should act next?
    Respond ONLY with 'Researcher', 'Coder', or 'FINISH' if the task is complete.
    
    History: {[m.content for m in state['messages']]}"""
    
    response = llm.invoke(prompt)
    return {"next_agent": response.content.strip()}

# 3. Define Worker Nodes
def researcher_node(state: AgentState):
    # Logic for researcher (e.g., using search tools)
    return {"messages": [HumanMessage(content="Researcher: Found the requested information.", name="Researcher")]}

def coder_node(state: AgentState):
    # Logic for coder (e.g., writing python code)
    return {"messages": [HumanMessage(content="Coder: Wrote the implementation.", name="Coder")]}

# 4. Routing Function
def router(state: AgentState):
    if state["next_agent"] == "FINISH":
        return END
    return state["next_agent"]

# 5. Build the Graph
workflow = StateGraph(AgentState)
workflow.add_node("Supervisor", supervisor_node)
workflow.add_node("Researcher", researcher_node)
workflow.add_node("Coder", coder_node)

workflow.set_entry_point("Supervisor")

# Add conditional edges from Supervisor to Workers
workflow.add_conditional_edges(
    "Supervisor",
    router,
    {"Researcher": "Researcher", "Coder": "Coder", END: END}
)

# Workers always report back to the Supervisor
workflow.add_edge("Researcher", "Supervisor")
workflow.add_edge("Coder", "Supervisor")

multi_agent_app = workflow.compile()
```

---

## Week 7: Agentic RAG (Retrieval-Augmented Generation)

Standard RAG pipelines are linear: *Retrieve -> Generate*. **Agentic RAG** introduces decision-making into the pipeline. An agent evaluates the user's query and dynamically routes it to the appropriate data source, assesses the quality of the retrieved context, and iteratively refines the search if necessary.

### Dynamic Routing

Instead of blindly querying a vector database, an Agentic RAG router analyzes the intent. Does this query need recent news (Web Search), structured user data (SQL DB), or semantic document lookup (Vector Store)?

### Self-RAG & CRAG Concepts

- **Corrective RAG (CRAG):** Evaluates retrieved documents. If the documents are irrelevant, the agent falls back to a web search.
- **Self-RAG:** The LLM grades its own generation against the retrieved documents to prevent hallucinations. If the generation isn't grounded, it triggers a rewrite.

### Code Example: Agentic Routing

```python
from pydantic import BaseModel, Field

# Define structured output for the Router
class RouteDecision(BaseModel):
    source: str = Field(
        description="The data source to use: 'vector_db' for documentation, 'web_search' for recent news, or 'direct_answer' for general knowledge."
    )

def query_router_node(state: AgentState):
    llm = ChatOpenAI(model="gpt-4o", temperature=0)
    # Bind the tool to enforce structured output
    router_llm = llm.with_structured_output(RouteDecision)
    
    query = state["messages"][-1].content
    decision = router_llm.invoke(f"Route this query: {query}")
    
    return {"route": decision.source}

# Conditional edge based on the route
def route_to_source(state: AgentState):
    return state["route"]

# In your graph configuration:
# workflow.add_conditional_edges("Router", route_to_source)
```

---

## Weeks 8-9: Tool Use at Scale & MCP Server Integration

As agents grow, so does their toolset. Managing dozens of tools (web search, code execution sandboxes, GitHub APIs, SQL databases) within a single prompt context becomes inefficient and error-prone.

### The Model Context Protocol (MCP)

Introduced by Anthropic, the **Model Context Protocol (MCP)** is an open standard that allows developers to build universal integrations between AI models and external data sources or tools. Instead of writing custom tool-binding code for every API, you deploy an MCP Server. The agent (MCP Client) connects to this server to discover and execute tools securely.

**Benefits of MCP in LangGraph:**
1. **Standardization:** Write a tool once as an MCP server; use it across any framework.
2. **Security:** Tool execution happens on the MCP server, isolating the agent from secure internal networks or direct database access.
3. **Dynamic Discovery:** Agents can query the MCP server to see which tools are available at runtime.

### Integrating MCP with LangChain/LangGraph

LangChain provides adapters to convert MCP servers into native LangChain tools (`langchain-mcp`).

```python
import asyncio
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from langchain_mcp_adapters.tools import load_mcp_tools
from langgraph.prebuilt import create_react_agent

async def run_mcp_agent():
    # 1. Define connection to a local MCP server (e.g., a file system or DB server)
    server_params = StdioServerParameters(
        command="npx",
        args=["-y", "@modelcontextprotocol/server-filesystem", "/path/to/data"]
    )

    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            # Initialize the session
            await session.initialize()
            
            # 2. Load all tools exposed by this MCP server into LangChain format
            mcp_tools = await load_mcp_tools(session)
            
            # 3. Create a LangGraph ReAct agent using these tools
            llm = ChatOpenAI(model="gpt-4o")
            agent = create_react_agent(llm, tools=mcp_tools)
            
            # 4. Invoke the agent
            result = await agent.ainvoke({
                "messages": [HumanMessage(content="Read the contents of /path/to/data/report.txt and summarize it.")]
            })
            
            print(result["messages"][-1].content)

# Run the async function
# asyncio.run(run_mcp_agent())
```

### Advanced Tool Patterns
- **Tool Fallbacks:** Wrap tool invocations in `try/except` blocks within your nodes so the agent receives the error string and can attempt to fix its parameters.
- **Human-in-the-Loop (HitL) Tool Execution:** For sensitive tools (like executing a database `DROP` or sending an email), configure LangGraph to interrupt the state before tool execution, requiring human approval.

---

## Week 10: Observability and Production with LangGraph Platform & LangSmith

Building an agent is only half the battle. When multi-agent systems fail, it is incredibly difficult to debug via standard console logs because execution flows back and forth dynamically.

### LangSmith for Tracing and Debugging

LangSmith is the observability platform designed explicitly for LLM applications.

**Why use LangSmith with LangGraph?**
1. **Visualizing the Graph:** See the exact path your agent took through the nodes.
2. **Token & Cost Tracking:** Monitor how much each node/agent is consuming.
3. **Evaluating:** Run datasets against your agent pipeline to catch regressions when you update prompts or tools.

*Integration is seamless. Simply set your environment variables:*
```bash
export LANGCHAIN_TRACING_V2="true"
export LANGCHAIN_API_KEY="your_api_key"
export LANGCHAIN_PROJECT="Advanced_Agent_Architecture"
```

### LangGraph Platform (LangGraph Cloud)

While LangGraph (the open-source library) dictates *how* your code runs, **LangGraph Platform** dictates *where* and *when* it runs.

**Key Features for Production:**
1. **Persistent State Management:** LangGraph Cloud automatically manages checkpointing. If an agent task takes 10 minutes and the server restarts, the state is preserved in Postgres, and the graph resumes exactly where it left off.
2. **Streaming:** Stream UI updates (tokens, tool calls, node transitions) in real-time to your frontend via standard HTTP APIs.
3. **Concurrency & Threading:** Handle thousands of distinct user conversations simultaneously, organizing them into unique `thread_id`s.

### Example: Setting up Checkpointing for State Persistence

To enable memory across interactions (or to pause for human approval), you attach a `checkpointer`.

```python
from langgraph.checkpoint.memory import MemorySaver

# In production, use PostgresSaver from langgraph.checkpoint.postgres
memory = MemorySaver()

# Compile the graph with the checkpointer
app = workflow.compile(checkpointer=memory)

# Run with a thread configuration to persist state for a specific user session
config = {"configurable": {"thread_id": "user_session_123"}}

app.invoke(
    {"messages": [HumanMessage(content="Hello, my name is Alice.")]}, 
    config=config
)

# In a later API call, the agent remembers:
app.invoke(
    {"messages": [HumanMessage(content="What is my name?")]}, 
    config=config
)
```

---

## Summary & Next Steps

Over the past 5 weeks, you have elevated your engineering skills from basic chains to robust, scalable agent architectures. You can now:
- Orchestrate teams of specialized agents.
- Dynamically route RAG queries to mitigate hallucinations.
- Utilize the Model Context Protocol (MCP) to standardize and scale tool usage.
- Deploy and monitor stateful agents using LangSmith and LangGraph Platform.

**Final Project:** In the coming weeks, you will combine all these concepts to build an **Autonomous Developer Assistant** that uses MCP to read a local repository, executes code in a sandbox, evaluates its own test coverage (Agentic RAG/Self-Correction), and requests your approval (Human-in-the-loop) before committing changes.