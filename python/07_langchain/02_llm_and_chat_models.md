# 02 - LLM and Chat Models

## Chat Models: The Primary Interface

In modern LangChain, **chat models** are the standard way to interact with LLMs. They work with structured messages (system, human, AI) rather than raw text strings. If you have used the OpenAI Node.js SDK's `chat.completions.create()`, this will feel familiar -- but with a cleaner, provider-agnostic API.

---

## Model Classes

### ChatOpenAI

```python
from dotenv import load_dotenv
load_dotenv()

from langchain_openai import ChatOpenAI

# Default model
model = ChatOpenAI()

# Specify model and parameters
model = ChatOpenAI(
    model="gpt-4o-mini",      # Model name
    temperature=0.7,           # Creativity (0 = deterministic, 1 = creative)
    max_tokens=1000,           # Max output tokens
    timeout=30,                # Request timeout in seconds
    max_retries=2,             # Retry on failure
)
```

### ChatAnthropic

```python
from langchain_anthropic import ChatAnthropic

model = ChatAnthropic(
    model="claude-sonnet-4-20250514",
    temperature=0.7,
    max_tokens=1024,           # Anthropic requires this; OpenAI does not
)
```

### Swappable models

Because both classes implement the same `BaseChatModel` interface, you can swap them freely:

```python
import os
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic

def get_model(provider: str = "openai"):
    """Factory function -- like a DI container for models."""
    if provider == "openai":
        return ChatOpenAI(model="gpt-4o-mini", temperature=0)
    elif provider == "anthropic":
        return ChatAnthropic(model="claude-sonnet-4-20250514", temperature=0)
    else:
        raise ValueError(f"Unknown provider: {provider}")

# Usage
model = get_model(os.getenv("LLM_PROVIDER", "openai"))
response = model.invoke("Explain async/await in one sentence.")
print(response.content)
```

---

## Messages

Chat models work with message objects. Each message has a **role** and **content**.

```python
from langchain_core.messages import (
    SystemMessage,
    HumanMessage,
    AIMessage,
)

messages = [
    SystemMessage(content="You are a senior Python developer who explains things concisely."),
    HumanMessage(content="What is a list comprehension?"),
]

response = model.invoke(messages)
print(type(response))    # <class 'langchain_core.messages.AIMessage'>
print(response.content)  # The actual text response
```

### Message types

| LangChain | OpenAI role | Purpose |
|---|---|---|
| `SystemMessage` | `system` | Sets the model's behavior and persona |
| `HumanMessage` | `user` | The user's input |
| `AIMessage` | `assistant` | The model's previous responses (for multi-turn) |

### Multi-turn conversation

```python
messages = [
    SystemMessage(content="You are a helpful coding tutor."),
    HumanMessage(content="What is a decorator in Python?"),
    AIMessage(content="A decorator is a function that wraps another function to extend its behavior without modifying it directly. You apply it with the @syntax above a function definition."),
    HumanMessage(content="Show me a simple example."),
]

response = model.invoke(messages)
print(response.content)
# The model sees the full conversation and gives a contextual example
```

> **Node.js parallel:** This is the same pattern as building the `messages` array for `openai.chat.completions.create({ messages: [...] })`. LangChain just gives each role its own class instead of using plain objects with a `role` field.

---

## Basic Invocation: `model.invoke()`

The `.invoke()` method is the universal entry point. It accepts a string, a list of messages, or a `PromptValue`.

### String input (auto-converted to HumanMessage)

```python
response = model.invoke("What is the GIL in Python?")
print(response.content)
```

### Message list input

```python
from langchain_core.messages import SystemMessage, HumanMessage

response = model.invoke([
    SystemMessage(content="Answer in exactly one sentence."),
    HumanMessage(content="What is the GIL in Python?"),
])
print(response.content)
```

### Inspecting the response

```python
response = model.invoke("Hello!")

print(response.content)           # The text
print(response.response_metadata) # Provider-specific metadata
print(response.usage_metadata)    # Token usage info
# {
#   'input_tokens': 8,
#   'output_tokens': 12,
#   'total_tokens': 20
# }
print(response.id)                # Unique response ID
```

---

## Streaming: `model.stream()`

Streaming lets you display tokens as they arrive -- critical for chat UIs. In Node.js you might use readable streams or async iterators. In LangChain Python, `.stream()` returns a generator.

```python
from langchain_openai import ChatOpenAI

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)

# Stream tokens to the console
for chunk in model.stream("Write a haiku about Python programming."):
    print(chunk.content, end="", flush=True)

print()  # Newline at the end
```

Each `chunk` is an `AIMessageChunk` with a small piece of the response.

### Collecting streamed output

```python
full_response = ""
for chunk in model.stream("Explain generators in Python."):
    full_response += chunk.content
    print(chunk.content, end="", flush=True)

print()
print(f"\nFull response length: {len(full_response)} chars")
```

### Chunk-level vs Token-level Streaming (New in 0.2+)

LangChain now supports more granular streaming control:

```python
from langchain_openai import ChatOpenAI

model = ChatOpenAI(model="gpt-4o-mini", temperature=0, streaming=True)

# Chunk-level streaming (default)
for chunk in model.stream("Explain async/await"):
    print(chunk.content, end="", flush=True)

# Token-level streaming with metadata
for chunk in model.stream("Explain async/await"):
    if chunk.content:
        print(chunk.content, end="", flush=True)
    # Access streaming metadata
    if hasattr(chunk, 'response_metadata'):
        print(f"\n[Metadata: {chunk.response_metadata}]")
```

### Node.js comparison

```javascript
// Node.js with OpenAI SDK
const stream = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: "Hello" }],
    stream: true,
});
for await (const chunk of stream) {
    process.stdout.write(chunk.choices[0]?.delta?.content || "");
}
```

```python
# Python with LangChain -- cleaner API
for chunk in model.stream("Hello"):
    print(chunk.content, end="", flush=True)
```

---

## Async: `model.ainvoke()` and `model.astream()`

Python's `asyncio` is comparable to Node.js's event loop. LangChain provides async versions of every method, prefixed with `a`.

### Async invocation

```python
import asyncio
from langchain_openai import ChatOpenAI

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)

async def main():
    response = await model.ainvoke("What is asyncio?")
    print(response.content)

asyncio.run(main())
```

### Async streaming

```python
import asyncio
from langchain_openai import ChatOpenAI

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)

async def main():
    async for chunk in model.astream("Explain the event loop."):
        print(chunk.content, end="", flush=True)
    print()

asyncio.run(main())
```

### Parallel async calls (like Promise.all)

```python
import asyncio
from langchain_openai import ChatOpenAI

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)

async def main():
    # Fire three requests in parallel
    tasks = [
        model.ainvoke("What is Python?"),
        model.ainvoke("What is JavaScript?"),
        model.ainvoke("What is Rust?"),
    ]
    responses = await asyncio.gather(*tasks)

    for resp in responses:
        print(resp.content[:100])
        print("---")

asyncio.run(main())
```

> **Node.js parallel:** `asyncio.gather()` is `Promise.all()`. `asyncio.run(main())` is like calling the top-level async function in Node.js. Python does not have top-level await outside of notebooks.

---

## Structured Output with Pydantic (New in 0.2.0+)

**Available in LangChain 0.2.0+**

Modern LangChain supports direct structured output using Pydantic models. This uses the model's native function-calling capabilities to guarantee type-safe responses.

```python
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

class PersonInfo(BaseModel):
    """Information about a person."""
    name: str = Field(description="Full name")
    age: int = Field(description="Age in years")
    occupation: str = Field(description="Job or profession")
    skills: list[str] = Field(description="List of skills")

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)

# Create a structured output model
structured_model = model.with_structured_output(PersonInfo)

result = structured_model.invoke(
    "Extract info: John is a 30-year-old software engineer skilled in Python, TypeScript, and Go."
)

print(type(result))        # <class 'PersonInfo'>
print(result.name)         # "John"
print(result.age)          # 30
print(result.skills)       # ["Python", "TypeScript", "Go"]
print(result.model_dump()) # Convert to dict
```

### Why structured output?

1. **Type safety** - Pydantic validates the response
2. **No prompt engineering** - No need to tell the model "return JSON"
3. **Automatic retries** - If parsing fails, it retries automatically
4. **Works across providers** - OpenAI, Anthropic, etc.

### Structured output in chains

```python
from langchain_core.prompts import ChatPromptTemplate

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a data extraction expert."),
    ("human", "{text}"),
])

chain = prompt | structured_model

result = chain.invoke({
    "text": "Alice, 25, works as a data scientist at Meta. She knows Python, SQL, and R."
})

print(f"{result.name} is {result.age} years old")
```

---

## Model Parameters

### Temperature

Controls randomness. Use 0 for deterministic outputs (data extraction, classification). Use 0.7-1.0 for creative tasks.

```python
# Deterministic -- same input always gives same output
precise_model = ChatOpenAI(model="gpt-4o-mini", temperature=0)

# Creative -- varied outputs each time
creative_model = ChatOpenAI(model="gpt-4o-mini", temperature=0.9)

prompt = "Write a one-line joke about Python."

# Run the creative model 3 times -- you will get different jokes
for i in range(3):
    response = creative_model.invoke(prompt)
    print(f"Attempt {i+1}: {response.content}")
```

### Common parameters across providers

```python
model = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0,         # 0.0 to 2.0
    max_tokens=500,        # Maximum output tokens
    top_p=1.0,             # Nucleus sampling
    frequency_penalty=0.0, # Penalize repeated tokens
    presence_penalty=0.0,  # Penalize tokens already present
    timeout=30,            # Seconds
    max_retries=2,         # Automatic retries on transient errors
)
```

### Overriding parameters per call with `.bind()`

```python
model = ChatOpenAI(model="gpt-4o-mini", temperature=0)

# Create a variant with different temperature -- does NOT mutate the original
creative = model.bind(temperature=0.9)

response1 = model.invoke("Tell me a joke.")      # temperature=0
response2 = creative.invoke("Tell me a joke.")   # temperature=0.9
```

---

## Token Counting and Cost Awareness

### Checking token usage from responses

```python
from langchain_openai import ChatOpenAI

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)
response = model.invoke("Explain the difference between lists and tuples in Python.")

usage = response.usage_metadata
print(f"Input tokens:  {usage['input_tokens']}")
print(f"Output tokens: {usage['output_tokens']}")
print(f"Total tokens:  {usage['total_tokens']}")
```

### Estimating tokens before sending

```python
import tiktoken

def count_tokens(text: str, model: str = "gpt-4o-mini") -> int:
    """Count tokens for OpenAI models using tiktoken."""
    encoding = tiktoken.encoding_for_model(model)
    return len(encoding.encode(text))

prompt = "Explain Python generators in detail with examples."
print(f"Estimated input tokens: {count_tokens(prompt)}")
```

### Cost tracking helper

```python
# Approximate pricing per 1M tokens (check current pricing!)
PRICING = {
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
    "gpt-4o": {"input": 2.50, "output": 10.00},
    "claude-sonnet-4-20250514": {"input": 3.00, "output": 15.00},
}

def estimate_cost(
    input_tokens: int,
    output_tokens: int,
    model: str = "gpt-4o-mini",
) -> float:
    """Estimate cost in USD."""
    prices = PRICING.get(model, PRICING["gpt-4o-mini"])
    cost = (
        (input_tokens / 1_000_000) * prices["input"]
        + (output_tokens / 1_000_000) * prices["output"]
    )
    return round(cost, 6)

# After a call
usage = response.usage_metadata
cost = estimate_cost(usage["input_tokens"], usage["output_tokens"])
print(f"Estimated cost: ${cost}")
```

---

## Batch Processing

Send multiple inputs in one call for efficiency:

```python
from langchain_openai import ChatOpenAI

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)

questions = [
    "What is a list in Python?",
    "What is a dict in Python?",
    "What is a set in Python?",
]

# Batch invoke -- sends requests concurrently under the hood
responses = model.batch(questions)

for question, response in zip(questions, responses):
    print(f"Q: {question}")
    print(f"A: {response.content[:100]}...")
    print()
```

### Batch with concurrency control

```python
from langchain_openai import ChatOpenAI

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)

# Limit to 5 concurrent requests (avoid rate limits)
responses = model.batch(
    ["Explain concept " + str(i) for i in range(20)],
    config={"max_concurrency": 5},
)
```

---

## Putting It All Together

```python
"""
Complete example: a simple multi-turn chatbot in the terminal.
"""
from dotenv import load_dotenv
load_dotenv()

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

model = ChatOpenAI(model="gpt-4o-mini", temperature=0.7)

# Conversation history
messages = [
    SystemMessage(content=(
        "You are a friendly Python tutor helping a Node.js developer learn Python. "
        "Keep answers concise. Use JavaScript comparisons when helpful."
    )),
]

print("Chat with the Python tutor (type 'quit' to exit)")
print("=" * 50)

while True:
    user_input = input("\nYou: ").strip()
    if user_input.lower() in ("quit", "exit", "q"):
        print("Goodbye!")
        break

    messages.append(HumanMessage(content=user_input))

    # Stream the response
    print("\nTutor: ", end="")
    full_response = ""
    for chunk in model.stream(messages):
        print(chunk.content, end="", flush=True)
        full_response += chunk.content
    print()

    # Add AI response to history for next turn
    messages.append(AIMessage(content=full_response))
```

---

## Practice Exercises

### Exercise 1: Model comparison
Write a script that sends the same prompt to both `ChatOpenAI` (gpt-4o-mini) and `ChatAnthropic` (claude-sonnet-4-20250514). Print each response along with the token counts from `usage_metadata`. Which model used more tokens? Which responded faster? (Use `time.time()` to measure.)

### Exercise 2: Temperature experiment
Using a creative prompt like "Write a tagline for a Python course", invoke the same model 5 times at temperature=0, then 5 times at temperature=1.0. Print all 10 results. How many unique responses did you get at each temperature?

### Exercise 3: Streaming progress indicator
Write a streaming script that shows a character count updating in real-time. Print something like `[142 chars received]` that updates on the same line as tokens arrive. Hint: use `\r` to return the cursor to the beginning of the line.

```python
import sys
total = 0
for chunk in model.stream("Write a long explanation of Python decorators."):
    total += len(chunk.content)
    sys.stdout.write(f"\rReceiving... {total} chars")
    sys.stdout.flush()
print(f"\nDone! Total: {total} characters")
```

### Exercise 4: Async parallel benchmark
Write an async script that sends 10 different questions using `asyncio.gather()`. Time the total execution. Then send the same 10 questions sequentially using a normal `for` loop with `model.invoke()`. Compare the wall-clock times. How much faster is parallel execution?

### Exercise 5: Structured output extractor
Create a Pydantic model for a `Recipe` (name, ingredients list, steps list, prep_time, difficulty). Use `with_structured_output()` to extract recipes from free-text descriptions. Test with: "To make pasta carbonara, you need spaghetti, eggs, bacon, parmesan, and pepper. Cook the pasta, fry the bacon, mix eggs with cheese, combine everything. Takes 20 minutes. Easy to make."

### Exercise 6: Build a cost tracker
Create a `CostTracker` class that wraps a chat model. Every call goes through the tracker, which logs the token usage and running cost total. At the end, print a summary.

```python
class CostTracker:
    def __init__(self, model, model_name: str = "gpt-4o-mini"):
        self.model = model
        self.model_name = model_name
        self.total_input_tokens = 0
        self.total_output_tokens = 0
        self.call_count = 0

    def invoke(self, *args, **kwargs):
        response = self.model.invoke(*args, **kwargs)
        usage = response.usage_metadata
        self.total_input_tokens += usage["input_tokens"]
        self.total_output_tokens += usage["output_tokens"]
        self.call_count += 1
        return response

    def summary(self):
        print(f"Calls: {self.call_count}")
        print(f"Input tokens:  {self.total_input_tokens}")
        print(f"Output tokens: {self.total_output_tokens}")
        # Add cost calculation here
```

### Exercise 7: Multi-turn conversation bot with structured memory
Extend the chatbot example above to:
1. Keep only the last 10 messages (plus the system message) to avoid token limits
2. Use `with_structured_output()` to extract key facts from the conversation
3. Store these facts separately and inject them as context
4. Save the conversation to a JSON file on exit
