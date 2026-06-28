# 03 - Prompt Templates

## Why Prompt Templates?

In Node.js, you might build prompts with template literals:

```javascript
const prompt = `You are a ${role}. Answer the following question: ${question}`;
```

This works for simple cases but breaks down when you need:
- **Validation** -- did the caller provide all variables?
- **Reusability** -- share prompt templates across chains
- **Role-based messages** -- system vs. user vs. assistant
- **Composability** -- build complex prompts from smaller pieces
- **Serialization** -- save/load prompts from files

LangChain prompt templates solve all of these.

---

## PromptTemplate: Basic String Templates

The simplest template. It produces a single string.

```python
from langchain_core.prompts import PromptTemplate

# Method 1: Explicit input_variables
template = PromptTemplate(
    input_variables=["language", "topic"],
    template="Explain {topic} in {language} programming.",
)

# Method 2: Auto-detect variables (preferred)
template = PromptTemplate.from_template(
    "Explain {topic} in {language} programming."
)

# Format it
prompt_value = template.invoke({"language": "Python", "topic": "generators"})
print(prompt_value.to_string())
# "Explain generators in Python programming."
```

> **Key difference from JS template literals:** Variables use `{name}` syntax (single braces), not `${name}`. If you need a literal brace in your prompt, escape it with double braces: `{{` and `}}`.

### Using with a model

```python
from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)
template = PromptTemplate.from_template(
    "Explain {topic} in one sentence for a {audience}."
)

# Direct usage
prompt = template.invoke({"topic": "async/await", "audience": "Node.js developer"})
response = model.invoke(prompt)
print(response.content)
```

---

## ChatPromptTemplate: For Chat Models

This is what you will use 90% of the time. It produces a list of messages with roles.

### Basic creation with tuples

```python
from langchain_core.prompts import ChatPromptTemplate

# Each tuple is (role, template_string)
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a {role} who explains things concisely."),
    ("human", "{question}"),
])

# Invoke with variables
messages = prompt.invoke({
    "role": "senior Python developer",
    "question": "What are list comprehensions?",
})

print(messages.to_messages())
# [
#   SystemMessage(content="You are a senior Python developer who explains things concisely."),
#   HumanMessage(content="What are list comprehensions?"),
# ]
```

### Role shortcuts

```python
from langchain_core.prompts import ChatPromptTemplate

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant."),     # SystemMessage
    ("human", "My question: {question}"),           # HumanMessage
    ("ai", "I understand, let me think..."),        # AIMessage (for few-shot)
    ("human", "Actually, {followup}"),              # Another HumanMessage
])
```

### Using Message classes directly

```python
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import SystemMessage, HumanMessage

prompt = ChatPromptTemplate.from_messages([
    SystemMessage(content="You are a Python expert."),  # Fixed message (no variables)
    ("human", "{question}"),                             # Template message
])
```

---

## `ChatPromptTemplate.from_messages()` Patterns

This is the most common pattern you will see in LangChain code.

### Code review assistant

```python
from langchain_core.prompts import ChatPromptTemplate

code_review_prompt = ChatPromptTemplate.from_messages([
    ("system", (
        "You are a code reviewer specializing in {language}. "
        "Focus on: correctness, readability, performance. "
        "Be constructive and suggest improvements."
    )),
    ("human", (
        "Please review this code:\n\n"
        "```{language}\n{code}\n```\n\n"
        "Context: {context}"
    )),
])

# Usage
messages = code_review_prompt.invoke({
    "language": "python",
    "code": "def add(a, b): return a + b",
    "context": "This is a utility function for a calculator app.",
})
```

### Translation assistant

```python
from langchain_core.prompts import ChatPromptTemplate

translation_prompt = ChatPromptTemplate.from_messages([
    ("system", (
        "You are a translator. Translate the following text from "
        "{source_lang} to {target_lang}. Maintain the original tone and style."
    )),
    ("human", "{text}"),
])
```

---

## MessagesPlaceholder: Dynamic Message Lists

`MessagesPlaceholder` lets you inject a variable-length list of messages into a template. This is essential for conversation history.

```python
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful Python tutor."),
    MessagesPlaceholder(variable_name="history"),  # <-- dynamic list
    ("human", "{question}"),
])

# Invoke with conversation history
messages = prompt.invoke({
    "history": [
        HumanMessage(content="What is a decorator?"),
        AIMessage(content="A decorator is a function that wraps another function..."),
        HumanMessage(content="Can you show an example?"),
        AIMessage(content="Sure! Here is a simple timing decorator..."),
    ],
    "question": "How do I stack multiple decorators?",
})

for msg in messages.to_messages():
    print(f"{msg.__class__.__name__}: {msg.content[:60]}...")
```

### Optional history (with default)

```python
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant."),
    MessagesPlaceholder(variable_name="history", optional=True),  # Won't error if missing
    ("human", "{question}"),
])

# Works even without history
messages = prompt.invoke({"question": "Hello!"})
```

---

## Few-Shot Prompting

Few-shot prompting provides examples to guide the model's output format.

### Simple few-shot with ChatPromptTemplate

```python
from langchain_core.prompts import ChatPromptTemplate

prompt = ChatPromptTemplate.from_messages([
    ("system", "You extract structured data from text. Return JSON."),
    # Example 1
    ("human", "John is 30 years old and works at Google."),
    ("ai", '{{"name": "John", "age": 30, "company": "Google"}}'),
    # Example 2
    ("human", "Sarah, 25, is a developer at Meta."),
    ("ai", '{{"name": "Sarah", "age": 25, "company": "Meta"}}'),
    # Actual input
    ("human", "{input_text}"),
])

messages = prompt.invoke({
    "input_text": "Mike is 35 and leads engineering at Stripe."
})
```

> **Note:** Double braces `{{` and `}}` are escaped braces in the template -- they produce literal `{` and `}` in the output.

### FewShotChatMessagePromptTemplate

For dynamically selected examples:

```python
from langchain_core.prompts import (
    ChatPromptTemplate,
    FewShotChatMessagePromptTemplate,
)

# Define the format for each example
example_prompt = ChatPromptTemplate.from_messages([
    ("human", "{input}"),
    ("ai", "{output}"),
])

# Define the examples
examples = [
    {
        "input": "What is 2+2?",
        "output": "The answer is 4. [CALCULATION]",
    },
    {
        "input": "Who wrote Hamlet?",
        "output": "William Shakespeare wrote Hamlet. [FACT]",
    },
    {
        "input": "What will the weather be tomorrow?",
        "output": "I cannot predict the weather as I don't have real-time data. [LIMITATION]",
    },
]

# Create the few-shot template
few_shot_prompt = FewShotChatMessagePromptTemplate(
    example_prompt=example_prompt,
    examples=examples,
)

# Use it inside a full prompt
full_prompt = ChatPromptTemplate.from_messages([
    ("system", "Answer questions and tag your response type in brackets."),
    few_shot_prompt,
    ("human", "{question}"),
])

messages = full_prompt.invoke({"question": "What is the capital of France?"})
for msg in messages.to_messages():
    print(f"[{msg.__class__.__name__}] {msg.content}")
```

### Dynamic example selection

```python
from langchain_core.example_selectors import SemanticSimilarityExampleSelector
from langchain_openai import OpenAIEmbeddings
from langchain_chroma import Chroma

# Select the most relevant examples based on similarity
example_selector = SemanticSimilarityExampleSelector.from_examples(
    examples=examples,
    embeddings=OpenAIEmbeddings(),
    vectorstore_cls=Chroma,
    k=2,  # Select top 2 most relevant examples
)

few_shot_prompt = FewShotChatMessagePromptTemplate(
    example_prompt=example_prompt,
    example_selector=example_selector,  # Use selector instead of static list
)
```

---

## Partial Prompts

Partial prompts let you fill in some variables now and the rest later. Useful when building reusable components.

```python
from langchain_core.prompts import ChatPromptTemplate

# Full template
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a {role}. Respond in {language}."),
    ("human", "{question}"),
])

# Partial: fix the role now, fill question later
python_tutor_prompt = prompt.partial(role="Python tutor", language="English")

# Now you only need to provide the question
messages = python_tutor_prompt.invoke({"question": "What are generators?"})
```

### Partial with functions (lazy evaluation)

```python
from datetime import datetime
from langchain_core.prompts import ChatPromptTemplate

prompt = ChatPromptTemplate.from_messages([
    ("system", "Today is {date}. You are a helpful assistant."),
    ("human", "{question}"),
])

# The date function is called at invoke time, not at definition time
prompt = prompt.partial(date=lambda: datetime.now().strftime("%Y-%m-%d"))

# Date is always current when invoked
messages = prompt.invoke({"question": "What day is it?"})
```

---

## Composing Prompts

You can build complex prompts from smaller pieces.

```python
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

# Base template
def create_assistant_prompt(
    system_instruction: str,
    include_history: bool = False,
) -> ChatPromptTemplate:
    """Factory function for creating assistant prompts."""
    messages = [("system", system_instruction)]

    if include_history:
        messages.append(MessagesPlaceholder(variable_name="history", optional=True))

    messages.append(("human", "{input}"))

    return ChatPromptTemplate.from_messages(messages)

# Create specialized prompts
code_prompt = create_assistant_prompt(
    "You are a Python code assistant. Write clean, well-documented code.",
    include_history=True,
)

review_prompt = create_assistant_prompt(
    "You are a code reviewer. Be constructive and thorough.",
    include_history=False,
)
```

---

## Prompt Templates vs. JavaScript Template Literals

| Feature | JS Template Literals | LangChain PromptTemplate |
|---|---|---|
| Variable substitution | `${variable}` | `{variable}` |
| Validation | None (runtime errors) | Raises error if variable missing |
| Role support | Manual | Built-in with ChatPromptTemplate |
| Serialization | Not possible | Save/load from YAML/JSON |
| Composition | String concatenation | `.partial()`, nesting, factories |
| Dynamic examples | Manual | FewShotChatMessagePromptTemplate |
| Type safety | TypeScript types | Pydantic validation |

---

## Real-World Pattern: Prompt Library

```python
"""prompts.py -- Centralized prompt definitions."""
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

# Reusable across your application
SUMMARIZER = ChatPromptTemplate.from_messages([
    ("system", (
        "Summarize the following text in {num_sentences} sentences. "
        "Target audience: {audience}."
    )),
    ("human", "{text}"),
])

CLASSIFIER = ChatPromptTemplate.from_messages([
    ("system", (
        "Classify the following text into one of these categories: {categories}. "
        "Return only the category name, nothing else."
    )),
    ("human", "{text}"),
])

CHATBOT = ChatPromptTemplate.from_messages([
    ("system", (
        "You are {bot_name}, a {bot_personality} assistant. "
        "You help users with {bot_domain}."
    )),
    MessagesPlaceholder(variable_name="history", optional=True),
    ("human", "{input}"),
])

QA_WITH_CONTEXT = ChatPromptTemplate.from_messages([
    ("system", (
        "Answer the question based only on the provided context. "
        "If the context does not contain the answer, say 'I don't know'. "
        "Do not make up information."
    )),
    ("human", (
        "Context:\n{context}\n\n"
        "Question: {question}"
    )),
])
```

```python
# Using the prompt library
from prompts import SUMMARIZER, CHATBOT
from langchain_openai import ChatOpenAI

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)

# Summarize something
chain = SUMMARIZER | model
response = chain.invoke({
    "num_sentences": 3,
    "audience": "software developers",
    "text": "LangChain is a framework for developing applications...",
})
print(response.content)
```

---

## Practice Exercises

### Exercise 1: Build a prompt library
Create a `prompts.py` module with at least 5 reusable `ChatPromptTemplate` definitions for different tasks: summarization, translation, code explanation, sentiment analysis, and data extraction. Each should have meaningful system messages and clear variable names.

### Exercise 2: Few-shot entity extraction
Create a `FewShotChatMessagePromptTemplate` that teaches the model to extract product information from reviews. Provide 3 examples showing input reviews and structured JSON output. Test it with 3 new reviews.

```python
# Example input:  "I love my new iPhone 15 Pro! The camera is amazing."
# Example output: {"product": "iPhone 15 Pro", "brand": "Apple", "sentiment": "positive", "features_mentioned": ["camera"]}
```

### Exercise 3: Dynamic system prompts
Write a function that generates a `ChatPromptTemplate` based on configuration. The function should accept:
- A persona string
- A list of rules the model should follow
- Whether to include conversation history
- An optional output format instruction

```python
def create_prompt(
    persona: str,
    rules: list[str],
    include_history: bool = False,
    output_format: str | None = None,
) -> ChatPromptTemplate:
    # Your implementation here
    pass
```

### Exercise 4: MessagesPlaceholder chat window
Build a chat loop that uses `MessagesPlaceholder` for history. Implement a sliding window that keeps only the last 5 exchanges (10 messages). Test it by having a 10-turn conversation and verifying that early messages are dropped.

### Exercise 5: Prompt composition
Create a `compose_prompts` function that takes two `ChatPromptTemplate` instances and chains them: the output of the first becomes part of the input to the second. For example, first prompt generates a story outline, second prompt expands it into a full paragraph.

### Exercise 6: Compare with raw strings
Take one of your ChatPromptTemplate definitions and implement the same prompt using plain f-strings. Now add input validation, role tagging, and missing-variable error handling to the f-string version. How much code does LangChain save you?
