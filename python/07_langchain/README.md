# LangChain & AI

A practical, hands-on guide to building LLM-powered applications with LangChain — written for developers who already know Python and want to go from raw API calls to production-ready AI systems including chatbots, RAG pipelines, and autonomous agents.

## Table of Contents

1. [Introduction to LangChain](./01_introduction.md) — ecosystem overview, installation, environment setup, hello-world
2. [LLMs and Chat Models](./02_llm_and_chat_models.md) — model wrappers, provider comparison, streaming, temperature and parameters
3. [Prompt Templates](./03_prompt_templates.md) — `ChatPromptTemplate`, role-based messages, `MessagesPlaceholder`, dynamic inputs
4. [Output Parsers](./04_output_parsers.md) — `StrOutputParser`, `PydanticOutputParser`, `JsonOutputParser`, structured extraction
5. [Chains and LCEL](./05_chains_and_lcel.md) — LangChain Expression Language, pipe operator composition, parallel branches, `RunnablePassthrough`
6. [RAG — Retrieval Augmented Generation](./06_rag.md) — document loaders, text splitters, embeddings, vector stores (Chroma, FAISS), retrieval chains
7. [Memory](./07_memory.md) — conversation history, buffer memory, window memory, summary memory, stateful multi-turn chat
8. [Agents and Tools](./08_agents_and_tools.md) — `@tool` decorator, ReAct pattern, `AgentExecutor`, custom and built-in tools, tool-calling loop
9. [Callbacks and Tracing](./09_callbacks_and_tracing.md) — `CallbackHandler`, LangSmith integration, logging, debugging chains and agents
10. [LangChain with FastAPI](./10_langchain_with_fastapi.md) — serving chains as REST endpoints, streaming responses, async patterns, production deployment

## Learning Path

### Beginner — Get comfortable with the building blocks
Read chapters 1 through 4 in order. By the end you will be able to set up LangChain, call any LLM provider through a uniform interface, craft effective prompt templates, and parse structured output from model responses.

**Chapters 1 → 2 → 3 → 4**

### Intermediate — Build real pipelines and retrieval systems
With the basics in place, work through chapters 5 and 6. LCEL lets you wire components together like Unix pipes. RAG is the core pattern behind most document Q&A and knowledge-base products — mastering it opens up a huge class of real applications.

**Chapters 5 → 6 → 7**

### Advanced — Agents, observability, and production APIs
Finish with chapters 8 through 10. Agents are the frontier of LLM application development — you will learn how to give an LLM tools, let it reason about what to call, and build loops that handle multi-step problems. Callbacks and tracing let you debug and monitor those loops. The final chapter ties everything together by shipping a LangChain-powered API with FastAPI.

**Chapters 8 → 9 → 10**

## What You'll Learn

- How to use LangChain as a unified abstraction over OpenAI, Anthropic, and other LLM providers so you can swap models without rewriting chains
- How to compose prompts, models, and parsers into pipelines using LCEL's pipe (`|`) operator
- How to build complete RAG systems: load documents from files, PDFs, and the web; split and embed them; store vectors in Chroma or FAISS; and answer questions grounded in your own data
- How to maintain conversation history across turns using buffer, window, and summary memory strategies
- How to create custom tools with the `@tool` decorator, write clear docstrings the LLM reads to decide when to call each tool, and handle tool errors gracefully
- How to build ReAct agents that reason, call tools, observe results, and loop until they reach a final answer
- How to trace and debug LangChain runs with callbacks and LangSmith
- How to expose any chain or agent as a streaming FastAPI endpoint ready for production use

## Prerequisites

- Comfortable writing Python — functions, classes, `async`/`await`, virtual environments, and `pip`
- Familiarity with REST APIs and environment variables (`.env` files, API keys)
- A basic understanding of what a large language model does — you do not need to know how transformers work internally
- At least one active API key from OpenAI or Anthropic (free tiers work for most exercises)

## How to Use This Guide

1. **Set up your environment first.** Chapter 1 walks you through creating a virtual environment, installing the right packages, and verifying your API keys work. Do not skip this — every subsequent chapter assumes a working setup.
2. **Run the code, do not just read it.** Each chapter includes copy-pasteable examples. Type them out, run them, and tweak the parameters. Understanding deepens fast when you see real model output.
3. **Do the practice exercises.** Every chapter ends with 4-6 exercises of increasing difficulty. The exercises are where the concepts stick — they push you to apply ideas in slightly different contexts than the examples.
4. **Build one small project per section.** After finishing each learning-path track (beginner / intermediate / advanced), pause and build something small with only what you know so far — a simple Q&A script, a document search tool, or a multi-tool research assistant. Your own projects reveal gaps faster than re-reading.
5. **Use LangSmith early.** Even before chapter 9, enable `LANGCHAIN_TRACING_V2=true` in your `.env`. The visual trace timeline makes debugging chains and agents dramatically easier and costs nothing for low-volume use.

Every expert was once a beginner who decided to keep building — start with chapter 1 and ship something real by the end.
