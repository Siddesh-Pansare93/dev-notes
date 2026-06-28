# 04 - Output Parsers

## The Problem: LLMs Return Strings

LLMs generate text. But your application needs structured data -- JSON objects, lists, typed fields. Output parsers bridge that gap by:

1. Telling the model *how* to format its output (format instructions)
2. Parsing the model's text response into a Python object
3. Validating the structure and retrying if it fails

In Node.js terms, this is like having a Zod schema that both generates the prompt instruction *and* validates the response -- automatically.

---

## StrOutputParser: Simple String Output

The most basic parser. It strips the `AIMessage` wrapper and gives you a plain string.

```python
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)
parser = StrOutputParser()

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant."),
    ("human", "{question}"),
])

# Without parser: returns AIMessage object
response = model.invoke("Hello")
print(type(response))  # <class 'langchain_core.messages.AIMessage'>

# With parser in a chain: returns plain string
chain = prompt | model | parser
response = chain.invoke({"question": "Hello"})
print(type(response))  # <class 'str'>
print(response)         # "Hello! How can I help you today?"
```

> **Why bother?** In chains, you often pipe the output of one step into the next. A string is easier to work with than an `AIMessage` object.

---

## JsonOutputParser: Parse JSON from LLM Output

When you need the LLM to return structured JSON:

```python
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)
parser = JsonOutputParser()

prompt = ChatPromptTemplate.from_messages([
    ("system", (
        "Extract information from the text and return it as JSON.\n"
        "{format_instructions}"
    )),
    ("human", "{text}"),
])

# The parser provides format instructions automatically
chain = prompt | model | parser

result = chain.invoke({
    "text": "John Smith is 30 years old, works at Google as a senior engineer in San Francisco.",
    "format_instructions": parser.get_format_instructions(),
})

print(type(result))  # <class 'dict'>
print(result)
# {'name': 'John Smith', 'age': 30, 'company': 'Google', 'title': 'senior engineer', 'city': 'San Francisco'}
```

### With a Pydantic schema for typed JSON

```python
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field

class PersonInfo(BaseModel):
    name: str = Field(description="The person's full name")
    age: int = Field(description="The person's age")
    company: str = Field(description="The company they work at")
    role: str = Field(description="Their job title")

parser = JsonOutputParser(pydantic_object=PersonInfo)
print(parser.get_format_instructions())
# Outputs detailed instructions telling the LLM exactly what JSON shape to return
```

---

## PydanticOutputParser: Full Validation

This is the most powerful parser. It uses Pydantic models (Python's TypeScript-equivalent for runtime type validation) to validate the LLM's output.

```python
from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

# Define the expected output structure (like a Zod schema)
class MovieReview(BaseModel):
    title: str = Field(description="The movie title")
    rating: float = Field(description="Rating from 1.0 to 10.0")
    pros: list[str] = Field(description="List of positive aspects")
    cons: list[str] = Field(description="List of negative aspects")
    summary: str = Field(description="One-sentence summary")

parser = PydanticOutputParser(pydantic_object=MovieReview)

prompt = ChatPromptTemplate.from_messages([
    ("system", (
        "You are a movie critic. Analyze the given movie review and extract "
        "structured information.\n\n{format_instructions}"
    )),
    ("human", "{review_text}"),
])

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)
chain = prompt | model | parser

result = chain.invoke({
    "review_text": (
        "I just watched The Matrix again. It's still incredible after all these years. "
        "The action sequences are groundbreaking, the philosophical themes are deep, "
        "and Keanu Reeves is perfect for the role. The only downside is that some of "
        "the CGI looks dated now, and the sequels diminished the original's impact. "
        "Overall, a masterpiece of sci-fi cinema. 9/10."
    ),
    "format_instructions": parser.get_format_instructions(),
})

# result is a MovieReview instance with full type checking
print(type(result))          # <class 'MovieReview'>
print(result.title)          # "The Matrix"
print(result.rating)         # 9.0
print(result.pros)           # ["groundbreaking action sequences", ...]
print(result.model_dump())   # Convert to dict (like .toJSON() in JS)
```

### Node.js / TypeScript comparison

```typescript
// TypeScript with Zod
const MovieReview = z.object({
    title: z.string(),
    rating: z.number().min(1).max(10),
    pros: z.array(z.string()),
    cons: z.array(z.string()),
    summary: z.string(),
});

// You'd have to manually:
// 1. Write the format instructions into the prompt
// 2. Parse the JSON from the response
// 3. Validate it with Zod
// PydanticOutputParser does all three automatically
```

---

## Format Instructions Injection

Every parser has a `.get_format_instructions()` method that returns a string telling the LLM how to format its output. You inject this into your prompt.

```python
from langchain_core.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field

class TaskList(BaseModel):
    tasks: list[str] = Field(description="List of tasks to complete")
    priority: str = Field(description="Priority level: low, medium, or high")
    estimated_hours: float = Field(description="Estimated total hours")

parser = PydanticOutputParser(pydantic_object=TaskList)
print(parser.get_format_instructions())
```

Output (abbreviated):

```
The output should be formatted as a JSON instance that conforms to the JSON schema below.
Here is the output schema:
{"properties": {"tasks": {"description": "List of tasks to complete", "items": {"type": "string"}, "type": "array"}, ...}}
```

### Injecting into prompts

```python
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a project planner.\n\n{format_instructions}"),
    ("human", "Plan the following project: {project_description}"),
])

chain = prompt | model | parser

result = chain.invoke({
    "project_description": "Build a REST API with authentication",
    "format_instructions": parser.get_format_instructions(),
})
```

---

## Structured Output: The Modern Approach

LangChain's `model.with_structured_output()` is the **preferred modern approach**. It uses the model's native function-calling / tool-use capabilities to guarantee structured output -- no need for format instructions in the prompt.

```python
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

class PersonInfo(BaseModel):
    """Information about a person mentioned in text."""
    name: str = Field(description="Full name")
    age: int = Field(description="Age in years")
    occupation: str = Field(description="Job or occupation")
    location: str = Field(description="City or location")

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)

# Create a model that always returns PersonInfo
structured_model = model.with_structured_output(PersonInfo)

result = structured_model.invoke(
    "Sarah Chen is a 28-year-old data scientist working in Seattle."
)

print(type(result))       # <class 'PersonInfo'>
print(result.name)        # "Sarah Chen"
print(result.age)         # 28
print(result.occupation)  # "data scientist"
print(result.location)    # "Seattle"
```

### Why is this better?

1. **No format instructions needed** -- the model uses tool calling internally
2. **More reliable** -- the model is constrained by schema, not just instructions
3. **Cleaner prompts** -- no format instruction boilerplate
4. **Works with any Pydantic model**

### Complex nested structures

```python
from pydantic import BaseModel, Field

class Address(BaseModel):
    street: str
    city: str
    state: str
    zip_code: str

class ContactInfo(BaseModel):
    email: str | None = Field(default=None, description="Email if mentioned")
    phone: str | None = Field(default=None, description="Phone if mentioned")

class PersonProfile(BaseModel):
    """Complete profile of a person."""
    name: str
    age: int
    occupation: str
    address: Address
    contact: ContactInfo
    skills: list[str] = Field(description="Professional skills mentioned")
    is_employed: bool

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)
structured = model.with_structured_output(PersonProfile)

result = structured.invoke(
    "Meet Alex Rivera, 32, a full-stack developer at Stripe. "
    "He lives at 123 Main St, San Francisco, CA 94102. "
    "Reach him at alex@example.com. He's skilled in Python, TypeScript, and Go."
)

print(result.name)              # "Alex Rivera"
print(result.address.city)      # "San Francisco"
print(result.contact.email)     # "alex@example.com"
print(result.skills)            # ["Python", "TypeScript", "Go"]
```

### Using with chains

```python
from langchain_core.prompts import ChatPromptTemplate

prompt = ChatPromptTemplate.from_messages([
    ("system", "Extract all people mentioned in the text."),
    ("human", "{text}"),
])

class PeopleList(BaseModel):
    people: list[PersonInfo]

structured_model = model.with_structured_output(PeopleList)
chain = prompt | structured_model

result = chain.invoke({
    "text": "The team includes Alice (30, engineer, NYC) and Bob (25, designer, LA)."
})

for person in result.people:
    print(f"{person.name}, {person.age}, {person.occupation}")
```

### Enum-based classification

```python
from enum import Enum
from pydantic import BaseModel, Field

class Sentiment(str, Enum):
    POSITIVE = "positive"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"

class SentimentResult(BaseModel):
    sentiment: Sentiment
    confidence: float = Field(description="Confidence from 0.0 to 1.0")
    reasoning: str = Field(description="Brief explanation")

structured = model.with_structured_output(SentimentResult)
result = structured.invoke("I absolutely love this product! Best purchase ever.")

print(result.sentiment)    # Sentiment.POSITIVE
print(result.confidence)   # 0.95
print(result.reasoning)    # "Strongly positive language..."
```

---

## Error Handling and Retry Parsing

LLMs do not always produce valid output. Here is how to handle that.

### OutputFixingParser: Auto-fix malformed output

```python
from langchain.output_parsers import OutputFixingParser
from langchain_core.output_parsers import PydanticOutputParser
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

class Product(BaseModel):
    name: str
    price: float
    in_stock: bool

base_parser = PydanticOutputParser(pydantic_object=Product)
model = ChatOpenAI(model="gpt-4o-mini", temperature=0)

# Wrap with a fixing parser that uses the LLM to fix parsing errors
fixing_parser = OutputFixingParser.from_llm(
    parser=base_parser,
    llm=model,
)

# Even if the model returns slightly malformed JSON, the fixing parser
# will ask the LLM to correct it
bad_output = '{"name": "Widget", "price": "twenty dollars", "in_stock": true}'
result = fixing_parser.parse(bad_output)  # LLM fixes "twenty dollars" -> 20.0
```

### RetryOutputParser: Retry with the original prompt

```python
from langchain.output_parsers import RetryOutputParser

retry_parser = RetryOutputParser.from_llm(
    parser=base_parser,
    llm=model,
    max_retries=3,
)
```

### Manual error handling in chains

```python
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)
parser = JsonOutputParser()

prompt = ChatPromptTemplate.from_messages([
    ("system", "Return valid JSON. {format_instructions}"),
    ("human", "{input}"),
])

chain = prompt | model | parser

try:
    result = chain.invoke({
        "input": "List 3 programming languages with their year of creation.",
        "format_instructions": parser.get_format_instructions(),
    })
    print(result)
except Exception as e:
    print(f"Parsing failed: {e}")
    # Fallback: try again with a more explicit prompt, or return raw text
```

### Using `.with_retry()` on chains

```python
# Add automatic retry to any Runnable
robust_chain = (prompt | model | parser).with_retry(
    stop_after_attempt=3,
    wait_exponential_jitter=True,
)

result = robust_chain.invoke({
    "input": "List 3 programming languages.",
    "format_instructions": parser.get_format_instructions(),
})
```

---

## Comparison: Which Parser to Use?

| Parser | When to Use | Reliability |
|---|---|---|
| `StrOutputParser` | You just need text | Always works |
| `JsonOutputParser` | You need a dict, schema is flexible | Good |
| `PydanticOutputParser` | You need validated, typed output | Good (with retry) |
| `with_structured_output()` | **Default choice** for structured data | Best (uses tool calling) |
| `OutputFixingParser` | Wrapping another parser for auto-fix | Very good |

**Rule of thumb:** Start with `with_structured_output()`. Fall back to `PydanticOutputParser` with `OutputFixingParser` if your model does not support tool calling.

---

## Putting It All Together

```python
"""
Complete example: A product review analyzer that extracts structured data.
"""
from dotenv import load_dotenv
load_dotenv()

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
from enum import Enum

# --- Schema ---
class Sentiment(str, Enum):
    POSITIVE = "positive"
    NEGATIVE = "negative"
    MIXED = "mixed"

class ReviewAnalysis(BaseModel):
    """Structured analysis of a product review."""
    product_name: str = Field(description="Name of the product")
    sentiment: Sentiment = Field(description="Overall sentiment")
    rating_guess: float = Field(description="Estimated rating 1-5")
    key_points: list[str] = Field(description="Main points from the review")
    would_recommend: bool = Field(description="Whether the reviewer would recommend")

# --- Chain ---
model = ChatOpenAI(model="gpt-4o-mini", temperature=0)
structured_model = model.with_structured_output(ReviewAnalysis)

prompt = ChatPromptTemplate.from_messages([
    ("system", "You analyze product reviews and extract structured information."),
    ("human", "Analyze this review:\n\n{review}"),
])

chain = prompt | structured_model

# --- Run ---
reviews = [
    "The AirPods Pro are fantastic! Great noise cancellation, comfortable fit, "
    "and the spatial audio is mind-blowing. Battery life could be better though. "
    "Definitely worth the price.",

    "This keyboard is terrible. Keys started sticking after a week, the Bluetooth "
    "disconnects constantly, and the build quality feels cheap. Save your money.",

    "The Kindle Paperwhite is decent. Screen is great for reading, battery lasts "
    "forever, but the UI feels sluggish and the store is hard to navigate.",
]

for review in reviews:
    analysis = chain.invoke({"review": review})
    print(f"Product:   {analysis.product_name}")
    print(f"Sentiment: {analysis.sentiment.value}")
    print(f"Rating:    {analysis.rating_guess}/5")
    print(f"Recommend: {'Yes' if analysis.would_recommend else 'No'}")
    print(f"Points:    {', '.join(analysis.key_points)}")
    print("-" * 50)
```

---

## Practice Exercises

### Exercise 1: Resume parser
Define a Pydantic model for a resume (name, email, skills, experience list, education list). Use `with_structured_output()` to parse a block of free-form resume text. Handle cases where information is missing by using `Optional` fields.

### Exercise 2: Multi-format output
Create a chain that takes a topic and returns output in three different formats: a `StrOutputParser` chain for plain text, a `JsonOutputParser` chain for a dict, and a `with_structured_output()` chain for a Pydantic model. Compare the reliability and ease of use.

### Exercise 3: Enum classifier
Build a support ticket classifier using `with_structured_output()`. Define enums for: category (billing, technical, account, other), priority (low, medium, high, critical), and sentiment. Parse example support tickets and print the classifications.

### Exercise 4: Nested extraction
Create a Pydantic model with nested structures to parse a company description:

```python
class Company(BaseModel):
    name: str
    founded: int
    headquarters: Address       # nested
    founders: list[Person]      # nested list
    products: list[Product]     # nested list
    funding_total_usd: float | None
```

Parse several company descriptions and verify nested fields are correct.

### Exercise 5: Error handling pipeline
Build a chain that intentionally receives difficult inputs (ambiguous text, very short text, nonsensical text). Implement a three-tier fallback: `with_structured_output()` -> `PydanticOutputParser` with `OutputFixingParser` -> return a default object. Log which tier succeeded for each input.

### Exercise 6: Batch extraction
Given a list of 10 product descriptions as strings, use `chain.batch()` to extract structured data from all of them concurrently. Time it and compare with sequential `chain.invoke()` calls.
