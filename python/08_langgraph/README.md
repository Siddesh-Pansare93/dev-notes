# LangGraph Agents

LangGraph is a framework for building stateful, multi-step AI agent workflows modeled as directed graphs — giving you cycles, conditional branching, and human-in-the-loop control that plain LangChain chains can't handle. This section takes you from graph fundamentals all the way to deploying production agent APIs with FastAPI.

## Table of Contents

### Part 1 — Graph Fundamentals
1. [Introduction to LangGraph](./01_introduction.md) — what LangGraph is, how it compares to LangChain chains and XState, core primitives (state, nodes, edges), your first graph
2. [State Graphs](./02_state_graphs.md) — building and compiling `StateGraph`, typed state with `TypedDict`, reducer functions, graph lifecycle
3. [Conditional Edges](./03_conditional_edges.md) — routing functions, branching logic, mapping edge destinations, building decision nodes

### Part 2 — State and Control Flow
4. [State Management](./04_state_management.md) — shared vs. isolated state, `Annotated` reducers, updating state from nodes, avoiding conflicts
5. [Human in the Loop](./05_human_in_the_loop.md) — interrupting graphs before/after nodes, checkpointing, resuming after human approval, the `interrupt_before` pattern
6. [Subgraphs](./06_subgraphs.md) — composing graphs from smaller graphs, passing state between parent and child graphs, modular agent design

### Part 3 — Agents at Scale
7. [Multi-Agent Systems](./07_multi_agent_systems.md) — supervisor pattern, agent handoff, shared vs. isolated workspaces, preventing infinite loops, dynamic team composition
8. [Tools in Graphs](./08_tools_in_graphs.md) — binding tools to LLMs, `ToolNode`, tool call routing, safe vs. dangerous tools
9. [Streaming](./09_streaming.md) — node-level and token-level streaming, `astream_events`, observing agent progress in real time

### Part 4 — Production
10. [LangGraph with FastAPI](./10_langgraph_with_fastapi.md) — REST endpoints, SSE streaming, WebSocket chat, thread management, human-in-the-loop via API, timeouts and error handling, deployment checklist

---

## Learning Path

### Beginner — understand the graph model
Read chapters 1, 2, and 3 in order. Focus on the `StateGraph` API, how state flows between nodes, and how conditional edges let the graph branch. Build the exercises at the end of each chapter before moving on.

### Intermediate — control flow and real agents
After the fundamentals, work through chapters 4, 5, 6, and 8. Chapter 4 gives you robust state design; chapter 5 unlocks human-in-the-loop workflows; chapter 6 teaches modular composition with subgraphs; chapter 8 shows how to attach real tools to an LLM node.

### Advanced — multi-agent and production deployment
Finish with chapters 7, 9, and 10. Chapter 7 covers supervisor and handoff architectures for coordinating multiple specialized agents. Chapter 9 shows how to stream events at the token level. Chapter 10 ties everything together in a production-ready FastAPI service with SSE, WebSockets, CORS, rate limiting, and persistent checkpointers.

---

## What You'll Learn

- How to model AI workflows as **directed graphs** with nodes (Python functions) and edges (transitions)
- Designing a **typed state dictionary** shared across all graph nodes, with reducer functions for safe concurrent updates
- Routing with **conditional edges** — letting the LLM or any function decide which node runs next
- **Human-in-the-loop**: pausing a graph mid-execution, waiting for approval, then resuming from a checkpoint
- Composing large workflows from smaller **subgraphs** for modularity and reuse
- The **supervisor pattern** for multi-agent systems: one coordinator routing tasks to specialized agents
- The **agent handoff pattern**: agents that pass work directly to each other without a central supervisor
- Binding **tools** to LLMs with `ToolNode` and routing tool calls safely inside a graph
- **Token-level and node-level streaming** so you can surface agent progress to users in real time
- Exposing a LangGraph agent as a **FastAPI service** with REST, SSE, and WebSocket endpoints
- Production concerns: persistent checkpointers (Postgres), thread management, error handling, and authentication

---

## Prerequisites

- Comfortable with Python — `TypedDict`, `Annotated`, `async`/`await`, and type hints
- Basic familiarity with LangChain and calling an LLM (e.g., `ChatOpenAI`) — at minimum, know what a message list is
- Understanding of directed graphs (nodes and edges) at a conceptual level; no advanced graph theory required
- For chapter 10: basic knowledge of REST APIs and how HTTP requests work; prior FastAPI or Express.js experience is helpful but not mandatory

---

## How to Use This Guide

1. **Install before you read.** Run `pip install langgraph langchain-core langchain-openai` and set your `OPENAI_API_KEY` before opening chapter 1 — the examples are meant to be run, not just read.
2. **Do the exercises.** Every chapter ends with practice exercises ranging from concept checks to full agent builds. Skipping them means skipping the part where the concepts actually stick.
3. **Visualize your graphs.** After compiling any graph, call `app.get_graph().draw_mermaid()` and paste the output into a Mermaid renderer. Seeing the graph visually accelerates understanding more than reading the code alone.
4. **Cross-reference the comparison tables.** Each chapter includes a table mapping LangGraph concepts to something familiar — XState (chapter 1), LangChain chains (chapter 1), or Node.js microservices (chapter 7). Use these as anchors when a new concept feels abstract.
5. **Build the chapter 10 API as your capstone.** The FastAPI chapter is deliberately the last one because it requires everything that came before. Treat it as an integration exercise: build the full production API, then wire it up to the multi-agent system from chapter 7.

---

Building an AI agent that actually loops, reasons, and coordinates with other agents is one of the most satisfying things you can do in Python right now — work through this section end to end and you will have the skills to build production-grade agentic systems from scratch.
