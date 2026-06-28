# Phase 1: Foundations of Agentic AI & LangGraph (Weeks 1-2)

Welcome to Phase 1 of the Agentic AI & LangGraph learning track. Before we can build complex, multi-agent systems that autonomously solve problems, we must establish a rock-solid understanding of the underlying mechanics. 

Over the next two weeks, we will cover the fundamental concepts of Large Language Models (LLMs), how to force them to output structured data, the paradigms used to give them "agency" (like the ReAct pattern), and the basics of LangChain, the standard framework for orchestrating LLM applications.

---

## 1. Core LLM Concepts

To build effective AI agents, you need to understand how LLMs process information and interact with external systems.

### 1.1 Tokenization and Context Windows

LLMs do not read text letter-by-letter or word-by-word; they read **tokens**. 

*   **Tokenization:** The process of breaking down text into smaller sub-word units. A helpful rule of thumb for English is that 1 token is approximately ¾ of a word (or 100 tokens ≈ 75 words). Words like "apple" might be one token, while a complex word like "unprecedented" might be split into multiple tokens ("un", "precedent", "ed"). Frameworks like OpenAI use specific tokenizers (e.g., `tiktoken` and the `o200k_base` encoding for GPT-4o).
*   **Context Window:** This is the "short-term memory" of the LLM. It represents the maximum number of tokens the model can process in a single request (combining both the input prompt and the generated output). For example, GPT-4o has a context window of 128,000 tokens. If you exceed this limit, the model will throw an error. In agentic workflows, managing the context window is critical, as agent histories (thoughts, actions, and observations) grow rapidly.

### 1.2 Function/Tool Calling

Historically, LLMs could only output raw text. If you wanted the LLM to search the web, you had to write complex regex parsers to extract search queries from its text response. 

**Function Calling** (or Tool Calling) changed this. Modern LLMs are fine-tuned to recognize when a function should be called and to output a JSON object containing the arguments for that function. 

When you provide an LLM with a list of "tools," you are essentially giving it a JSON schema of available functions. The LLM decides *if* it needs a tool, and if so, it replies with the exact JSON payload needed to execute your local Python function.

### 1.3 Structured Outputs (Pydantic v2 + JSON)

Agents require predictable data structures to interact with traditional software. If an agent extracts user data, you don't want a conversational response; you want a JSON object.

We achieve this using **Pydantic v2**, the standard data validation library in Python. Pydantic allows us to define strict data schemas that the LLM must adhere to.

```python
from pydantic import BaseModel, Field

# Define our desired output structure using Pydantic v2
class UserExtraction(BaseModel):
    name: str = Field(description="The full name of the user.")
    age: int = Field(description="The age of the user in years.")
    interests: list[str] = Field(default_factory=list, description="A list of the user's hobbies or interests.")
```

Modern LLM APIs (like OpenAI's Structured Outputs) guarantee that the response will perfectly match this Pydantic schema, eliminating the need for brittle string parsing.

---

## 2. The ReAct Pattern (Reason + Act)

How does an LLM actually *do* things? The foundational paradigm for AI agents is the **ReAct** pattern, introduced in a 2022 paper by Yao et al. 

ReAct combines reasoning (Thought) and acting (Action) in an iterative loop.

1.  **Thought:** The agent analyzes the current situation and decides what to do next.
2.  **Action:** The agent selects a tool to use and provides the necessary arguments.
3.  **Observation:** The system pauses the LLM, executes the tool (e.g., runs a database query or web search), and feeds the result back to the LLM.
4.  **Repeat:** The LLM receives the observation, thinks about the new information, and either takes another action or provides the `Final Answer`.

**A typical ReAct loop looks like this:**

> **User:** What is the weather in Tokyo, and what should I wear?
> 
> **Thought:** I need to find the current weather in Tokyo first.
> **Action:** `get_weather(location="Tokyo, Japan")`
> **Observation:** `Temperature is 15°C, raining.`
> 
> **Thought:** Now I know the weather. I need to recommend clothing based on 15°C and rain.
> **Action:** `Final Answer: It is currently 15°C and raining in Tokyo. You should wear a light jacket and bring an umbrella.`

This loop is what transforms a static chatbot into an autonomous agent capable of solving multi-step problems.

---

## 3. LangChain Basics

Building ReAct loops and managing LLM interactions from scratch requires a lot of boilerplate code. **LangChain** is a framework designed to simplify the development of LLM applications.

### 3.1 LLM Wrappers and Prompt Templates

LangChain provides standardized wrappers for various LLM providers (OpenAI, Anthropic, Google, etc.), allowing you to easily swap models without rewriting your core logic.

Prompt Templates allow you to create dynamic, reusable prompts by injecting variables.

```python
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate

# Initialize the LLM wrapper
llm = ChatOpenAI(model="gpt-4o", temperature=0)

# Create a prompt template
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant that speaks strictly in {language}."),
    ("user", "{input}")
])
```

### 3.2 Chains and LCEL (LangChain Expression Language)

LangChain Expression Language (LCEL) uses the pipe operator (`|`) to chain components together, similar to Unix pipes. This creates a clear, readable pipeline where the output of one component becomes the input of the next.

```python
from langchain_core.output_parsers import StrOutputParser

# Create a chain: Prompt -> LLM -> String Parser
chain = prompt | llm | StrOutputParser()

# Invoke the chain with our variables
response = chain.invoke({
    "language": "Pirate English",
    "input": "Tell me about quantum computing."
})

print(response) 
# Output: "Arrr matey, quantum computin' be like a ship sailin' in two directions at once..."
```

### 3.3 Forcing Structured Outputs in LangChain

LangChain makes it incredibly easy to use the Pydantic schemas we defined earlier. By using the `.with_structured_output()` method, LangChain automatically handles the underlying tool-calling mechanics to guarantee a structured response.

```python
# Assuming the UserExtraction Pydantic class defined earlier
structured_llm = llm.with_structured_output(UserExtraction)

text = "My name is John Doe. I am 28 years old and I love hiking, reading, and coding."

# The output is directly parsed into a Python Pydantic object
result = structured_llm.invoke(text)

print(result.name)      # Output: John Doe
print(result.age)       # Output: 28
print(result.interests) # Output: ['hiking', 'reading', 'coding']
```

### 3.4 Binding Tools to LLMs

To build a ReAct agent, the LLM needs to know what tools it can use. LangChain provides the `@tool` decorator to easily convert standard Python functions into LLM-ready tools. We then use `.bind_tools()` to attach them to the LLM.

```python
from langchain_core.tools import tool

@tool
def get_weather(location: str) -> str:
    """Fetch the current weather for a given location."""
    # In a real app, this would call a weather API
    return f"The weather in {location} is sunny and 72°F."

@tool
def get_stock_price(ticker: str) -> str:
    """Fetch the current stock price for a given ticker symbol."""
    return f"The stock price of {ticker} is $150.00."

tools = [get_weather, get_stock_price]

# Bind the tools to the LLM
llm_with_tools = llm.bind_tools(tools)

# When we invoke the LLM, it decides to use a tool instead of responding with text
response = llm_with_tools.invoke("What is the weather like in Seattle?")

print(response.tool_calls)
# Output: [{'name': 'get_weather', 'args': {'location': 'Seattle'}, 'id': 'call_abc123'}]
```

Once the LLM returns a `tool_call`, the agent framework executes the Python function and returns the result to the LLM as a `ToolMessage` (the "Observation" step in the ReAct loop).

---

## Summary and Next Steps

In this foundations phase, we have covered:
1.  How LLMs process data via **tokens** and **context windows**.
2.  How to guarantee application stability using **Pydantic v2** and **Structured Outputs**.
3.  The cognitive architecture of agents via the **ReAct pattern**.
4.  How to build scalable LLM pipelines using **LangChain** and **LCEL**.

**Next Steps:** While LangChain is excellent for linear chains, it struggles with complex, cyclical agent workflows (like the ReAct loop going back and forth indefinitely). In Phase 2, we will introduce **LangGraph**, which uses graph theory to manage stateful, multi-actor, and cyclical agent workflows reliably.