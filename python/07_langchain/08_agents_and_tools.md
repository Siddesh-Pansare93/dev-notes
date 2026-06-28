# 08 - Agents and Tools

## What Are Agents?

An agent is an LLM that can **decide** what actions to take. Instead of following a fixed chain of steps, the agent receives a goal, *reasons* about what information it needs, *calls tools* to get that information, *observes* the results, and *repeats* until it has an answer.

Think of it as the difference between a script and a human problem-solver:
- **Chain:** "Always do step 1, then step 2, then step 3."
- **Agent:** "Here's a goal. Figure out which tools to use and in what order."

```
User: "What's the weather in the city where Python was invented?"

Agent thinks: "I need to find where Python was invented first."
  → Calls search tool: "Where was Python invented?"
  → Gets: "Python was created in the Netherlands."

Agent thinks: "Now I need the weather in the Netherlands."
  → Calls weather tool: "Weather in Netherlands"
  → Gets: "Amsterdam: 15C, cloudy"

Agent: "The weather in the Netherlands (where Python was invented) is 15C and cloudy."
```

---

## The ReAct Pattern

ReAct (Reasoning + Acting) is the most common agent pattern. The LLM alternates between:

1. **Thought** -- reason about what to do next
2. **Action** -- call a tool
3. **Observation** -- see the tool's result
4. **Repeat** or **Final Answer**

```
Thought: I need to find the population of Tokyo.
Action: search("population of Tokyo 2024")
Observation: Tokyo's population is approximately 14 million.
Thought: I now have the answer.
Final Answer: Tokyo has a population of approximately 14 million people.
```

---

## Creating Custom Tools

### The `@tool` decorator

The simplest way to create a tool:

```python
from langchain_core.tools import tool

@tool
def get_word_count(text: str) -> int:
    """Count the number of words in a text. Use this when you need to know how many words are in a piece of text."""
    return len(text.split())

# The tool has:
print(get_word_count.name)         # "get_word_count"
print(get_word_count.description)  # The docstring
print(get_word_count.args_schema.model_json_schema())  # Input schema

# Invoke it directly
result = get_word_count.invoke("Hello world from Python")
print(result)  # 4
```

> **Critical:** The docstring is the tool's description that the LLM reads to decide when to use it. Write clear, specific docstrings. A vague docstring means the agent won't know when to call your tool.

### Multiple parameters with type hints

```python
from langchain_core.tools import tool

@tool
def calculate_bmi(weight_kg: float, height_m: float) -> str:
    """Calculate Body Mass Index given weight in kilograms and height in meters.
    Use this tool when someone asks about BMI or body mass index."""
    bmi = weight_kg / (height_m ** 2)
    if bmi < 18.5:
        category = "underweight"
    elif bmi < 25:
        category = "normal weight"
    elif bmi < 30:
        category = "overweight"
    else:
        category = "obese"
    return f"BMI: {bmi:.1f} ({category})"

result = calculate_bmi.invoke({"weight_kg": 75, "height_m": 1.80})
print(result)  # "BMI: 23.1 (normal weight)"
```

### Tool schema with Pydantic (input validation)

For complex tools, define the input schema explicitly with Pydantic:

```python
from langchain_core.tools import tool
from pydantic import BaseModel, Field

class SearchInput(BaseModel):
    """Input for the search tool."""
    query: str = Field(description="The search query string")
    max_results: int = Field(default=5, description="Maximum number of results to return")
    language: str = Field(default="en", description="Language code (e.g., 'en', 'es', 'fr')")

@tool(args_schema=SearchInput)
def web_search(query: str, max_results: int = 5, language: str = "en") -> str:
    """Search the web for information. Use this when you need to find current
    information, facts, or data that you don't already know."""
    # Simulated search
    return f"Search results for '{query}' (lang={language}, max={max_results}): [simulated results]"

# The LLM sees the full schema with descriptions
print(web_search.args_schema.model_json_schema())
```

### Async tools

```python
import asyncio
import httpx
from langchain_core.tools import tool

@tool
async def fetch_url(url: str) -> str:
    """Fetch the content of a URL. Use this when you need to read a web page."""
    async with httpx.AsyncClient() as client:
        response = await client.get(url, follow_redirects=True)
        return response.text[:1000]  # First 1000 chars
```

### Tools with error handling

```python
from langchain_core.tools import tool, ToolException

@tool
def divide(a: float, b: float) -> float:
    """Divide two numbers. Use this for division calculations."""
    if b == 0:
        raise ToolException("Cannot divide by zero. Please provide a non-zero divisor.")
    return a / b

# Configure error handling
divide.handle_tool_error = True  # Return error message to agent instead of crashing
```

---

## Built-in and Community Tools

LangChain provides many pre-built tools.

### DuckDuckGo search (no API key needed)

```bash
pip install duckduckgo-search
```

```python
from langchain_community.tools import DuckDuckGoSearchRun

search = DuckDuckGoSearchRun()
result = search.invoke("latest Python version 2024")
print(result)
```

### Wikipedia

```bash
pip install wikipedia
```

```python
from langchain_community.tools import WikipediaQueryRun
from langchain_community.utilities import WikipediaAPIWrapper

wiki = WikipediaQueryRun(api_wrapper=WikipediaAPIWrapper(top_k_results=1))
result = wiki.invoke("Python programming language")
print(result[:500])
```

### Python REPL (code execution)

```python
from langchain_community.tools import PythonREPLTool

python_tool = PythonREPLTool()
result = python_tool.invoke("print(sum(range(1, 101)))")
print(result)  # "5050"
```

### Requests (HTTP)

```python
from langchain_community.tools import RequestsGetTool
from langchain_community.utilities import TextRequestsWrapper

requests_tool = RequestsGetTool(
    requests_wrapper=TextRequestsWrapper(),
    allow_dangerous_requests=True,
)
```

---

## Building an Agent

### Using `create_react_agent` and `AgentExecutor`

```python
from dotenv import load_dotenv
load_dotenv()

from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langchain.agents import create_react_agent, AgentExecutor
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

# --- Define tools ---

@tool
def get_current_time() -> str:
    """Get the current date and time. Use this when someone asks what time it is or today's date."""
    from datetime import datetime
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

@tool
def calculate(expression: str) -> str:
    """Evaluate a mathematical expression. Use this for any math calculations.
    Examples: '2 + 2', '15 * 7', '100 / 3', 'pow(2, 10)'."""
    try:
        # WARNING: eval is dangerous in production. Use a safe math parser instead.
        result = eval(expression, {"__builtins__": {}}, {"pow": pow, "abs": abs, "round": round})
        return str(result)
    except Exception as e:
        return f"Error evaluating '{expression}': {e}"

@tool
def get_word_length(word: str) -> int:
    """Get the length of a word. Use this when someone asks how long a word is."""
    return len(word)

tools = [get_current_time, calculate, get_word_length]

# --- Create the agent ---
model = ChatOpenAI(model="gpt-4o-mini", temperature=0)

# Bind tools to the model
model_with_tools = model.bind_tools(tools)

# Create the prompt
prompt = ChatPromptTemplate.from_messages([
    ("system", (
        "You are a helpful assistant with access to tools. "
        "Use the tools when needed to answer questions accurately. "
        "If you don't need a tool, answer directly."
    )),
    MessagesPlaceholder(variable_name="chat_history", optional=True),
    ("human", "{input}"),
    MessagesPlaceholder(variable_name="agent_scratchpad"),
])

# Create the agent
agent = create_react_agent(model, tools, prompt)

# Wrap it in an executor
agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    verbose=True,      # See the agent's reasoning
    max_iterations=5,  # Safety limit
    handle_parsing_errors=True,
)

# --- Run it ---
result = agent_executor.invoke({
    "input": "What is the current time, and how many letters are in the word 'LangChain'?"
})

print(result["output"])
```

### What happens under the hood (with verbose=True)

```
> Entering new AgentExecutor chain...

Thought: I need to get the current time and count letters in 'LangChain'.
I'll use both tools.

Action: get_current_time
Action Input: {}
Observation: 2024-06-15 14:30:22

Action: get_word_length
Action Input: LangChain
Observation: 9

Thought: I now have both pieces of information.
Final Answer: The current time is 2024-06-15 14:30:22, and the word
'LangChain' has 9 letters.

> Finished chain.
```

---

## Modern Approach: Tool Calling Without AgentExecutor

For simpler use cases, you can use tool calling directly with the model:

```python
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langchain_core.messages import HumanMessage, ToolMessage

@tool
def add(a: int, b: int) -> int:
    """Add two numbers."""
    return a + b

@tool
def multiply(a: int, b: int) -> int:
    """Multiply two numbers."""
    return a * b

tools = [add, multiply]
tool_map = {t.name: t for t in tools}

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)
model_with_tools = model.bind_tools(tools)

# Ask a question that requires tools
response = model_with_tools.invoke("What is 3 + 5, and what is 7 * 8?")

# The model returns tool calls (not the final answer yet)
print(response.tool_calls)
# [
#   {'name': 'add', 'args': {'a': 3, 'b': 5}, 'id': 'call_abc123'},
#   {'name': 'multiply', 'args': {'a': 7, 'b': 8}, 'id': 'call_def456'},
# ]

# Execute the tool calls and feed results back
messages = [HumanMessage(content="What is 3 + 5, and what is 7 * 8?"), response]

for tc in response.tool_calls:
    tool_result = tool_map[tc["name"]].invoke(tc["args"])
    messages.append(ToolMessage(content=str(tool_result), tool_call_id=tc["id"]))

# Now the model generates the final answer with tool results
final_response = model_with_tools.invoke(messages)
print(final_response.content)
# "3 + 5 = 8, and 7 * 8 = 56."
```

### Tool calling loop (full agent loop)

```python
from langchain_core.messages import HumanMessage, ToolMessage

def run_agent(user_message: str, tools: list, model) -> str:
    """Simple agent loop that calls tools until the model has an answer."""
    model_with_tools = model.bind_tools(tools)
    tool_map = {t.name: t for t in tools}
    messages = [HumanMessage(content=user_message)]

    for _ in range(10):  # Max iterations
        response = model_with_tools.invoke(messages)
        messages.append(response)

        # If no tool calls, we have the final answer
        if not response.tool_calls:
            return response.content

        # Execute each tool call
        for tc in response.tool_calls:
            print(f"  Calling {tc['name']}({tc['args']})")
            try:
                result = tool_map[tc["name"]].invoke(tc["args"])
            except Exception as e:
                result = f"Error: {e}"
            messages.append(ToolMessage(content=str(result), tool_call_id=tc["id"]))

    return "Agent reached maximum iterations without a final answer."

# Usage
answer = run_agent(
    "What time is it and what is 2^10?",
    [get_current_time, calculate],
    ChatOpenAI(model="gpt-4o-mini", temperature=0),
)
print(answer)
```

---

## Multi-Tool Agent: Research Assistant

```python
"""
research_agent.py -- An agent that can search, calculate, and analyze text.
"""
from dotenv import load_dotenv
load_dotenv()

from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langchain.agents import create_react_agent, AgentExecutor
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from pydantic import BaseModel, Field

# --- Tool definitions ---

@tool
def search_knowledge_base(query: str) -> str:
    """Search an internal knowledge base for information. Use this when you need
    to look up facts, documentation, or reference material."""
    # Simulated KB -- in production this would be a real search
    kb = {
        "python": "Python is a high-level programming language created by Guido van Rossum in 1991.",
        "langchain": "LangChain is a framework for building LLM-powered applications.",
        "fastapi": "FastAPI is a modern Python web framework for building APIs.",
        "react pattern": "ReAct combines reasoning and acting in LLM agents.",
    }
    query_lower = query.lower()
    results = [v for k, v in kb.items() if k in query_lower]
    return "\n".join(results) if results else "No results found for: " + query

class MathInput(BaseModel):
    expression: str = Field(description="A Python math expression like '2 + 2' or 'pow(2, 10)'")

@tool(args_schema=MathInput)
def calculator(expression: str) -> str:
    """Perform mathematical calculations. Use this for any math, arithmetic,
    or numerical computations."""
    try:
        safe_builtins = {"pow": pow, "abs": abs, "round": round, "min": min, "max": max}
        result = eval(expression, {"__builtins__": {}}, safe_builtins)
        return f"{expression} = {result}"
    except Exception as e:
        return f"Error: {e}"

@tool
def analyze_text(text: str) -> str:
    """Analyze a piece of text and return statistics. Use this when asked to
    analyze, count, or get statistics about text."""
    words = text.split()
    sentences = text.count('.') + text.count('!') + text.count('?')
    return (
        f"Characters: {len(text)}, "
        f"Words: {len(words)}, "
        f"Sentences: {sentences}, "
        f"Avg word length: {sum(len(w) for w in words) / len(words):.1f}"
    )

@tool
def format_as_markdown(title: str, content: str) -> str:
    """Format content as a markdown document with a title. Use this when
    the user asks for formatted or structured output."""
    return f"# {title}\n\n{content}"

tools = [search_knowledge_base, calculator, analyze_text, format_as_markdown]

# --- Agent setup ---
model = ChatOpenAI(model="gpt-4o-mini", temperature=0)

prompt = ChatPromptTemplate.from_messages([
    ("system", (
        "You are a research assistant with access to several tools. "
        "Think step by step about what tools you need to answer the question. "
        "Use multiple tools if needed. Be thorough and accurate."
    )),
    MessagesPlaceholder(variable_name="chat_history", optional=True),
    ("human", "{input}"),
    MessagesPlaceholder(variable_name="agent_scratchpad"),
])

agent = create_react_agent(model, tools, prompt)

agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    verbose=True,
    max_iterations=8,
    handle_parsing_errors=True,
)

# --- Run queries ---
queries = [
    "What is LangChain? Analyze that description text.",
    "Calculate 2^20 and format the result as a markdown document titled 'Power Calculation'.",
    "Search for information about Python and tell me how many words are in the description.",
]

for query in queries:
    print(f"\n{'='*60}")
    print(f"Query: {query}")
    print('='*60)
    result = agent_executor.invoke({"input": query})
    print(f"\nFinal Answer: {result['output']}")
```

---

## Error Handling in Tools

### Graceful error handling

```python
from langchain_core.tools import tool, ToolException

@tool
def fetch_data(url: str) -> str:
    """Fetch data from a URL. Use this to retrieve web content."""
    import urllib.request
    try:
        with urllib.request.urlopen(url, timeout=10) as response:
            return response.read().decode()[:2000]
    except urllib.error.URLError as e:
        raise ToolException(f"Failed to fetch {url}: {e}")
    except TimeoutError:
        raise ToolException(f"Request to {url} timed out after 10 seconds.")

# Tell the agent to handle errors gracefully
fetch_data.handle_tool_error = True
# Or provide a custom handler:
fetch_data.handle_tool_error = (
    lambda e: f"Tool error: {str(e)}. Please try a different approach."
)
```

### Tool with retry logic

```python
import time
from langchain_core.tools import tool

@tool
def reliable_search(query: str) -> str:
    """Search with automatic retry on failure."""
    max_retries = 3
    for attempt in range(max_retries):
        try:
            # Simulated search
            return f"Results for: {query}"
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)  # Exponential backoff
                continue
            return f"Search failed after {max_retries} attempts: {e}"
```

---

## Agent with Conversation Memory

```python
from langchain_core.messages import HumanMessage, AIMessage

chat_history = []

def chat_with_agent(user_input: str) -> str:
    result = agent_executor.invoke({
        "input": user_input,
        "chat_history": chat_history,
    })

    # Update history
    chat_history.append(HumanMessage(content=user_input))
    chat_history.append(AIMessage(content=result["output"]))

    return result["output"]

# Conversation
print(chat_with_agent("Search for Python in the knowledge base."))
print(chat_with_agent("Now calculate 2^10 for me."))
print(chat_with_agent("What did I ask you first?"))  # Uses memory
```

---

## Practice Exercises

### Exercise 1: Custom tool set
Build an agent with three custom tools:
1. A unit converter (km to miles, C to F, kg to lbs)
2. A text transformer (uppercase, lowercase, reverse, title case)
3. A date calculator (days between dates, add days to a date)

Test with queries that require the agent to choose the right tool.

### Exercise 2: Web research agent
Build an agent using `DuckDuckGoSearchRun` and `WikipediaQueryRun` that can research a topic, collect information from multiple sources, and synthesize an answer. Test with questions like "Compare the populations of Tokyo and New York City."

### Exercise 3: Code execution agent
Create an agent with a `PythonREPLTool` that can write and execute Python code to answer questions. Test with: "Generate a list of the first 20 Fibonacci numbers" and "Create a simple bar chart of [5, 10, 15, 20, 25] using ASCII characters."

### Exercise 4: Error resilience
Build an agent with tools that sometimes fail (simulate with random failures). Implement proper error handling with `handle_tool_error` and `ToolException`. The agent should recover gracefully and try alternative approaches when a tool fails.

### Exercise 5: Agent with memory and tools
Build a personal assistant agent that has:
- A "remember" tool that stores facts in a dictionary
- A "recall" tool that looks up stored facts
- A calculator tool
- Conversation memory

Test: "Remember that my favorite number is 42." Then later: "What is my favorite number times 10?"

### Exercise 6: Multi-step agent
Build an agent that solves this multi-step problem: "Find information about Python, count the words in that information, multiply the word count by 3, and format the result as a markdown report." The agent should use at least 3 different tools in sequence.
