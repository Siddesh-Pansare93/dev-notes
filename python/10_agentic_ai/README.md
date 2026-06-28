# Agentic AI & LangGraph 

Welcome to the comprehensive learning track for **Agentic AI & LangGraph**. Over this 3-4 month timeline, you will transition from understanding core LLM capabilities to building, evaluating, and deploying production-ready multi-agent systems.

## Learning Roadmap

### [Phase 1: Foundations (Weeks 1-2)](./01_foundations.md)
Solidify your understanding of how Large Language Models work under the hood and how we can use them as reasoning engines.
- Core LLM concepts: tokenization, context windows
- Forcing predictable behavior: function/tool calling and structured outputs (Pydantic + JSON)
- The cognitive architecture: understanding the ReAct pattern (Reason + Act loop)
- LangChain basics: chains, prompt templates, LLM wrappers, and LCEL

### [Phase 2: LangGraph Core (Weeks 3-5)](./02_langgraph_core.md)
Move beyond linear chains into cyclical, stateful agent workflows.
- LangGraph's primitives: Master nodes, edges, and the shared state
- Control flow: Build stateful workflows with conditional branching and loops
- Persistence: Implement short-term memory (in-state) and long-term memory (vector DBs)
- Core Patterns: Build a ReAct agent from scratch, then implement a Reflection agent that critiques its own output

### [Phase 3: Advanced Architectures (Weeks 6-10)](./03_advanced_architectures.md)
Build systems that can handle real-world complexity and utilize vast arrays of tools.
- Multi-agent systems: Learn orchestrator ↔ worker patterns and agent-to-agent communication
- Agentic RAG: Build agents that dynamically route queries between various retrieval sources and evaluate their own retrieved context
- Tool use at scale: Integrate web search, code execution, databases, and the Model Context Protocol (MCP)
- Observability: Use LangGraph Platform and LangSmith for tracing, debugging, and monitoring complex agent runs

### [Phase 4: Production & Deployment (Weeks 11-14)](./04_production_deployment.md)
Take your agents out of the notebook and put them into production.
- UX/UI: Implement streaming responses from agents to frontends (SSE / WebSockets)
- Reliability: Implement agent evaluation frameworks (LLM-as-a-judge) to measure accuracy
- Enterprise Integration: Connect agents securely to SaaS/ERP backends
- Deployment: Containerize and deploy agents via FastAPI + Docker

## External Resources
To complement these tutorials, we highly recommend the following external courses:
- [DeepLearning.AI: AI Agents in LangGraph](https://www.deeplearning.ai/short-courses/ai-agents-in-langgraph/) (free, ~4 hrs)
- [Coursera: Agentic AI with LangChain and LangGraph](https://www.coursera.org/specializations/agentic-ai-with-langchain-and-langgraph) (3 weeks)
- [roadmap.sh/ai-agents](https://roadmap.sh/ai-agents) (Visual roadmap of the agent ecosystem)
