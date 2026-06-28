# 05 - Chains and LCEL (LangChain Expression Language)

## What Is LCEL?

LCEL is LangChain's way of composing components into chains using the `|` (pipe) operator. If you have used RxJS pipes in Angular or the Unix pipe in shell scripts, the mental model is identical: the output of one step flows into the input of the next.

```python
chain = prompt | model | parser
#        ↑        ↑       ↑
#    PromptTemplate → ChatModel → OutputParser
```

Every component in an LCEL chain implements the `Runnable` interface, which gives you `.invoke()`, `.stream()`, `.batch()`, `.ainvoke()`, `.astream()`, and `.abatch()` for free.

---

## The Pipe Operator: `|`

### Simplest chain

```python
from dotenv import load_dotenv
load_dotenv()

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant."),
    ("human", "{question}"),
])

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)
parser = StrOutputParser()

# Chain them with the pipe operator
chain = prompt | model | parser

# Invoke the whole chain
result = chain.invoke({"question": "What is LCEL?"})
print(result)  # Plain string response
```

### What happens under the hood

```
Input dict: {"question": "What is LCEL?"}
  ↓
prompt.invoke({"question": "What is LCEL?"})
  → ChatPromptValue with messages
  ↓
model.invoke(ChatPromptValue)
  → AIMessage(content="LCEL is...")
  ↓
parser.invoke(AIMessage)
  → "LCEL is..."  (plain string)
```

### Node.js comparison

```javascript
// RxJS pipe pattern (conceptually similar)
const chain = prompt$.pipe(
    switchMap(prompt => model.call(prompt)),
    map(response => parser.parse(response))
);

// LangChain LCEL -- much cleaner
// chain = prompt | model | parser
```

---

## RunnableSequence

The `|` operator creates a `RunnableSequence` under the hood. You can also create one explicitly:

```python
from langchain_core.runnables import RunnableSequence

# These two are identical:
chain1 = prompt | model | parser
chain2 = RunnableSequence(first=prompt, middle=[model], last=parser)

# Both have the same interface
result = chain2.invoke({"question": "Hello"})
```

### Inspecting a chain

```python
chain = prompt | model | parser

# See what steps are in the chain
print(chain)
# RunnableSequence(
#   first=ChatPromptTemplate(...),
#   middle=[ChatOpenAI(...)],
#   last=StrOutputParser()
# )

# Get the input and output schema
print(chain.input_schema.model_json_schema())
# {'properties': {'question': {'type': 'string'}}, 'required': ['question']}
```

---

## RunnableParallel: Parallel Execution

`RunnableParallel` runs multiple chains simultaneously and returns a dict of results. This is LangChain's equivalent of `Promise.all()`.

```python
from langchain_core.runnables import RunnableParallel
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import ChatOpenAI

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)
parser = StrOutputParser()

# Define parallel tasks
joke_chain = (
    ChatPromptTemplate.from_messages([
        ("human", "Tell a short joke about {topic}.")
    ])
    | model
    | parser
)

poem_chain = (
    ChatPromptTemplate.from_messages([
        ("human", "Write a haiku about {topic}.")
    ])
    | model
    | parser
)

fact_chain = (
    ChatPromptTemplate.from_messages([
        ("human", "Tell one interesting fact about {topic}.")
    ])
    | model
    | parser
)

# Run all three in parallel
parallel_chain = RunnableParallel(
    joke=joke_chain,
    poem=poem_chain,
    fact=fact_chain,
)

# Single invoke triggers all three concurrently
result = parallel_chain.invoke({"topic": "Python programming"})

print("JOKE:", result["joke"])
print("POEM:", result["poem"])
print("FACT:", result["fact"])
```

### Using dict syntax (shorthand)

```python
# This is equivalent to RunnableParallel
parallel_chain = {
    "joke": joke_chain,
    "poem": poem_chain,
    "fact": fact_chain,
} | some_combiner_step  # You can pipe parallel output into another step
```

### Practical example: RAG parallel retrieval

```python
from langchain_core.runnables import RunnableParallel, RunnablePassthrough

# Parallel retrieval: get context AND pass through the question
rag_setup = RunnableParallel(
    context=retriever,             # Fetch relevant documents
    question=RunnablePassthrough(), # Pass the question through unchanged
)

# Then pipe into the QA chain
rag_chain = rag_setup | qa_prompt | model | parser
```

---

## RunnablePassthrough: Pass Data Through

`RunnablePassthrough` passes its input through unchanged. It is used to forward data alongside transformations.

```python
from langchain_core.runnables import RunnablePassthrough, RunnableParallel

# Pass input through while also transforming it
chain = RunnableParallel(
    original=RunnablePassthrough(),                        # Input as-is
    uppercase=lambda x: x.upper(),                         # Transformed
    word_count=lambda x: len(x.split()),                   # Computed
)

result = chain.invoke("hello world from langchain")
print(result)
# {
#   "original": "hello world from langchain",
#   "uppercase": "HELLO WORLD FROM LANGCHAIN",
#   "word_count": 4,
# }
```

### `RunnablePassthrough.assign()`: Add fields to a dict

```python
from langchain_core.runnables import RunnablePassthrough

# Start with a dict and add computed fields
chain = RunnablePassthrough.assign(
    num_words=lambda x: len(x["text"].split()),
    first_word=lambda x: x["text"].split()[0],
)

result = chain.invoke({"text": "Hello world from Python"})
print(result)
# {
#   "text": "Hello world from Python",  <-- original field preserved
#   "num_words": 4,                      <-- added
#   "first_word": "Hello",              <-- added
# }
```

### Common pattern: enrich input before sending to model

```python
from langchain_core.runnables import RunnablePassthrough
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser

prompt = ChatPromptTemplate.from_messages([
    ("system", "Answer the question using the context.\nContext: {context}"),
    ("human", "{question}"),
])

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)

def fake_retriever(input_dict):
    """Simulate retrieving relevant context."""
    return "Python was created by Guido van Rossum in 1991."

chain = (
    RunnablePassthrough.assign(context=lambda x: fake_retriever(x))
    | prompt
    | model
    | StrOutputParser()
)

result = chain.invoke({"question": "Who created Python?"})
print(result)
```

---

## RunnableLambda: Custom Functions in Chains

Wrap any Python function to make it a chain component.

```python
from langchain_core.runnables import RunnableLambda

# Simple function as a chain step
def format_output(text: str) -> str:
    """Post-process the LLM output."""
    return text.strip().upper()

formatter = RunnableLambda(format_output)

chain = prompt | model | StrOutputParser() | formatter
result = chain.invoke({"question": "Say hello"})
print(result)  # "HELLO! HOW CAN I HELP YOU TODAY?"
```

### Lambda with complex logic

```python
from langchain_core.runnables import RunnableLambda

def process_and_validate(data: dict) -> dict:
    """Clean and validate extracted data."""
    # Remove empty fields
    cleaned = {k: v for k, v in data.items() if v}

    # Normalize strings
    if "name" in cleaned:
        cleaned["name"] = cleaned["name"].strip().title()

    # Add metadata
    cleaned["processed"] = True

    return cleaned

processor = RunnableLambda(process_and_validate)

# Use in a chain
chain = prompt | model | JsonOutputParser() | processor
```

### Async lambdas

```python
from langchain_core.runnables import RunnableLambda
import asyncio

async def async_lookup(name: str) -> str:
    """Simulate an async database lookup."""
    await asyncio.sleep(0.1)  # Simulate I/O
    return f"Data for {name}"

# RunnableLambda supports async functions
lookup = RunnableLambda(async_lookup)

# Works with ainvoke
result = await lookup.ainvoke("Alice")
```

### Using the `@chain` decorator

```python
from langchain_core.runnables import chain as chain_decorator

@chain_decorator
def analyze_text(input_dict: dict) -> str:
    """Custom chain step with the @chain decorator."""
    text = input_dict["text"]
    word_count = len(text.split())
    if word_count < 10:
        return "short"
    elif word_count < 50:
        return "medium"
    else:
        return "long"

# Use it like any other Runnable
result = analyze_text.invoke({"text": "This is a short sentence."})
print(result)  # "short"
```

---

## `.bind()`: Adding Parameters

`.bind()` creates a new Runnable with extra keyword arguments baked in. The original is not modified.

```python
from langchain_openai import ChatOpenAI

model = ChatOpenAI(model="gpt-4o-mini")

# Bind stop sequences -- model stops generating at these tokens
model_with_stop = model.bind(stop=["\n\n", "END"])

# Bind response format
json_model = model.bind(response_format={"type": "json_object"})

# Use in chains
chain = prompt | json_model | JsonOutputParser()
```

### Binding tools to a model

```python
from langchain_core.tools import tool

@tool
def get_weather(city: str) -> str:
    """Get the weather for a city."""
    return f"Sunny, 72F in {city}"

# Bind tools to model (enables function calling)
model_with_tools = model.bind_tools([get_weather])

response = model_with_tools.invoke("What's the weather in Paris?")
print(response.tool_calls)  # Model may decide to call get_weather
```

---

## `.with_fallbacks()`: Error Handling

Provide backup models or chains when the primary fails.

```python
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic

# Primary model
primary = ChatOpenAI(model="gpt-4o", temperature=0)

# Fallback if primary fails (rate limit, API down, etc.)
fallback = ChatAnthropic(model="claude-sonnet-4-20250514", temperature=0)

# Create a model with fallback
resilient_model = primary.with_fallbacks([fallback])

# If OpenAI fails, Anthropic is tried automatically
chain = prompt | resilient_model | parser
result = chain.invoke({"question": "Hello"})
```

### Chain-level fallbacks

```python
# Fallback from an expensive chain to a cheaper one
expensive_chain = prompt | ChatOpenAI(model="gpt-4o") | parser
cheap_chain = prompt | ChatOpenAI(model="gpt-4o-mini") | parser

resilient_chain = expensive_chain.with_fallbacks([cheap_chain])
```

---

## Streaming Through Chains

One of LCEL's best features: streaming works through the entire chain. Tokens flow from model -> parser -> output without waiting for the full response.

```python
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a storyteller."),
    ("human", "Tell a short story about {topic}."),
])

model = ChatOpenAI(model="gpt-4o-mini", temperature=0.7)
chain = prompt | model | StrOutputParser()

# Stream through the entire chain
for chunk in chain.stream({"topic": "a robot learning to cook"}):
    print(chunk, end="", flush=True)
print()
```

### Async streaming

```python
import asyncio

async def main():
    async for chunk in chain.astream({"topic": "a time-traveling cat"}):
        print(chunk, end="", flush=True)
    print()

asyncio.run(main())
```

### Streaming events (for complex chains)

```python
import asyncio

async def main():
    async for event in chain.astream_events(
        {"topic": "a magical library"},
        version="v2",
    ):
        kind = event["event"]
        if kind == "on_chat_model_stream":
            # Token from the LLM
            print(event["data"]["chunk"].content, end="", flush=True)
        elif kind == "on_chain_end":
            print(f"\n[Chain completed]")

asyncio.run(main())
```

---

## Real-World Chain Patterns

### Pattern 1: Multi-step analysis

```python
from langchain_core.runnables import RunnablePassthrough, RunnableParallel

# Step 1: Summarize
summarize_prompt = ChatPromptTemplate.from_messages([
    ("system", "Summarize this text in 2 sentences."),
    ("human", "{text}"),
])

# Step 2: Extract entities
entity_prompt = ChatPromptTemplate.from_messages([
    ("system", "List key entities (people, companies, places) from: {summary}"),
    ("human", "Extract entities."),
])

# Step 3: Classify
classify_prompt = ChatPromptTemplate.from_messages([
    ("system", "Classify this summary into one category: tech, business, science, other."),
    ("human", "{summary}"),
])

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)
parser = StrOutputParser()

# Chain: summarize -> parallel(extract entities + classify)
chain = (
    {"text": RunnablePassthrough()}
    | summarize_prompt
    | model
    | parser
    | (lambda summary: {"summary": summary})
    | RunnableParallel(
        entities=entity_prompt | model | parser,
        category=classify_prompt | model | parser,
        summary=lambda x: x["summary"],
    )
)

result = chain.invoke(
    "Apple announced the new M4 chip today, with CEO Tim Cook "
    "presenting at their Cupertino headquarters..."
)
print(result)
# {"entities": "Apple, M4 chip, Tim Cook, Cupertino", "category": "tech", "summary": "..."}
```

### Pattern 2: Conditional branching

```python
from langchain_core.runnables import RunnableBranch

# Route to different chains based on input
branch = RunnableBranch(
    # (condition, chain) pairs
    (lambda x: "code" in x["question"].lower(), code_chain),
    (lambda x: "math" in x["question"].lower(), math_chain),
    # Default chain (no condition)
    general_chain,
)

result = branch.invoke({"question": "Write a Python function for sorting"})
# Routes to code_chain because "code" is not in question but let's check...
```

### Pattern 3: Map-reduce over documents

```python
from langchain_core.runnables import RunnableLambda

summarize_one = ChatPromptTemplate.from_messages([
    ("system", "Summarize this document in one paragraph."),
    ("human", "{doc}"),
]) | model | parser

def map_summarize(docs: list[str]) -> list[str]:
    """Summarize each document."""
    chain = summarize_one
    return chain.batch([{"doc": d} for d in docs])

combine_prompt = ChatPromptTemplate.from_messages([
    ("system", "Combine these summaries into a single coherent summary."),
    ("human", "{summaries}"),
])

map_reduce_chain = (
    RunnableLambda(map_summarize)
    | (lambda summaries: {"summaries": "\n\n".join(summaries)})
    | combine_prompt
    | model
    | parser
)
```

---

## Debugging Chains

### Verbose logging

```python
from langchain.globals import set_verbose, set_debug

set_verbose(True)   # Print chain inputs/outputs
set_debug(True)     # Print everything (very detailed)

chain.invoke({"question": "Hello"})

# Turn off when done
set_verbose(False)
set_debug(False)
```

### Inspecting intermediate results

```python
from langchain_core.runnables import RunnableLambda

def debug_step(data):
    """Print intermediate data and pass through."""
    print(f"DEBUG: {type(data).__name__} = {str(data)[:200]}")
    return data

chain_with_debug = (
    prompt
    | RunnableLambda(debug_step)    # See prompt output
    | model
    | RunnableLambda(debug_step)    # See model output
    | parser
)

result = chain_with_debug.invoke({"question": "Hello"})
```

---

## Practice Exercises

### Exercise 1: Three-step chain
Build an LCEL chain that takes a topic and:
1. Generates 3 key points (prompt | model | parser)
2. Expands each point into a paragraph (use `.batch()` or a loop)
3. Combines them into a final article

### Exercise 2: Parallel comparison
Create a `RunnableParallel` that sends the same question to three different model configurations (temperature 0, 0.5, 1.0) and returns all three responses. Add a final step that asks a fourth model to pick the best response.

### Exercise 3: Conditional routing
Build a chain with `RunnableBranch` that detects the language of the input and routes to different prompts:
- English input -> answer in English
- Spanish input -> answer in Spanish
- Other -> translate to English first, then answer

### Exercise 4: Stream processing
Create a chain that streams output and processes it in real-time. As tokens arrive, count words and detect if the model starts going off-topic (e.g., mentions something unrelated to the prompt). Print a warning if it does.

### Exercise 5: Error-resilient chain
Build a chain with `.with_fallbacks()` at multiple levels:
- Model level: primary model falls back to a cheaper model
- Parser level: JSON parser falls back to string parser
- Chain level: main chain falls back to a simpler chain

Test by intentionally breaking things (invalid API key, bad prompt, etc.).

### Exercise 6: Chain composition
Create a library of small, reusable chain components (summarizer, translator, classifier, entity extractor). Then compose them into 3 different pipeline chains by piping them together in different orders. Demonstrate how LCEL makes this modular.
