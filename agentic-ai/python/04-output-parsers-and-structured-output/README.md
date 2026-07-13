# Output Parsers and Structured Output

🟡 Intermediate

## Kya hota hai, aur ye chapter kyu zaruri hai?

Socho tum Zomato ka backend bana rahe ho. Ek LLM se pucha "is restaurant review ka sentiment kya hai, aur rating kitni honi chahiye?" — model reply karta hai:

> "Well, based on the review, it seems like the customer had a mostly positive experience, I'd estimate around 4 out of 5 stars, though the delivery time complaint is a bit concerning..."

Ab ye text tumhara `if analysis.rating > 3` wala code kaise chalayega? Nahi chalega. LLM hamesha **text** deta hai — chahe woh JSON maanga ho, chahe number maanga ho, chahe ek simple `"yes"` ya `"no"` maanga ho. Model ke andar koi guarantee nahi hai ki output hamesha same shape mein aayega.

Ye exactly wahi problem hai jo har **agentic system** mein baar-baar aati hai:
- Agent ko decide karna hai "which tool call karu" — usse ek structured `{tool_name, arguments}` chahiye, essay nahi.
- Agent ko ek review classify karna hai — usse `Sentiment.POSITIVE` enum chahiye, "the sentiment is quite positive" wala paragraph nahi.
- Agent ko next step plan karna hai — usse ek clean list of steps chahiye, code se directly consume karne layak.

**Output Parsers aur Structured Output** LangChain ka woh layer hai jo raw LLM text ko **type-safe Python objects** mein convert karta hai — validation, retry aur error-handling ke saath. Ye poore agentic pipeline ki neend (backbone) hai: agar structured output reliable nahi hai, toh agent ka decision-making bhi reliable nahi hoga.

Node.js/TypeScript background se aa rahe ho toh isko aise socho: ye Zod schema jaisa hai jo (a) prompt ke andar instructions generate karta hai LLM ko batane ke liye "is shape mein reply karo", aur (b) response ko automatically parse + validate karta hai — dono kaam ek hi jagah.

> [!info]
> Is chapter mein hum dekhenge: `StrOutputParser` (sabse simple), `JsonOutputParser`, `PydanticOutputParser`, aur sabse important — `with_structured_output()` (modern, production-preferred approach). Saath mein retry/fixing parsers bhi, jab LLM galti kare tab.

---

## Kyun raw LLM text unreliable hai?

Chat model ka output hamesha ek `AIMessage` object hota hai jiske andar `.content` string hoti hai. Ye string:

1. **Free-form** hai — model kabhi extra commentary jod sakta hai ("Sure! Here's the JSON: ...")
2. **Inconsistent** hai — kabhi single quotes use karega, kabhi trailing comma daal dega, kabhi markdown code fence (` ```json `) mein wrap kar dega
3. **Non-deterministic** hai — same prompt, alag-alag run mein thoda alag phrasing de sakta hai (temperature > 0 pe toh definitely)
4. **Type information nahi rakhta** — "25" string hai ya number hai? Model ko pata nahi tumhara Python code kya expect kar raha hai

Agar tum `json.loads(response.content)` directly try karo, production mein ye baar-baar crash karega. Isliye output parsers ka pura ecosystem bana hai — taaki ye fragility handle ho sake.

```python
from langchain_openai import ChatOpenAI

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)
response = model.invoke("What's the capital of India?")

print(type(response))     # <class 'langchain_core.messages.AIMessage'>
print(response.content)   # "The capital of India is New Delhi."
```

Ye `AIMessage` object hai, plain string nahi — aur ye definitely structured data nahi hai. Yahi se hamari yatra shuru hoti hai.

---

## StrOutputParser: Sabse Simple Parser

Sabse basic parser. Ye `AIMessage` wrapper utaar deta hai aur sirf plain string deta hai.

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

# Parser ke bina: AIMessage object milta hai
response = model.invoke("Hello")
print(type(response))  # <class 'langchain_core.messages.AIMessage'>

# Chain mein parser ke saath: plain string milta hai
chain = prompt | model | parser
response = chain.invoke({"question": "Hello"})
print(type(response))  # <class 'str'>
print(response)         # "Hello! How can I help you today?"
```

> [!tip]
> **Isse bother kyu kare?** Chains mein tum ek step ka output doosre step mein pipe karte ho. String kaam karne mein `AIMessage` object se kahi zyada aasan hai — especially jab tum output ko UI mein directly dikhana chahte ho ya kisi doosre function mein pass karna chahte ho.

`StrOutputParser` tab use karo jab tumhe sirf **text chahiye** — jaise ek chatbot response, ya summary. Structured data ke liye ye kaafi nahi hai.

---

## JsonOutputParser: LLM Output Se JSON Nikalna

Jab tumhe LLM se structured JSON chahiye (dict ki tarah), `JsonOutputParser` use karo. Ye interesting cheez ye karta hai — ye **format instructions** generate karta hai jo tum apne prompt mein daal sakte ho, taaki model ko pata chale exact kis shape mein reply karna hai.

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

# Parser khud format instructions provide karta hai
chain = prompt | model | parser

result = chain.invoke({
    "text": "John Smith is 30 years old, works at Google as a senior engineer in San Francisco.",
    "format_instructions": parser.get_format_instructions(),
})

print(type(result))  # <class 'dict'>
print(result)
# {'name': 'John Smith', 'age': 30, 'company': 'Google', 'title': 'senior engineer', 'city': 'San Francisco'}
```

Yahan ek gotcha hai — bina Pydantic schema ke, `JsonOutputParser` model se sirf "return karo JSON" bol raha hai, par exact fields kya honge ye model khud decide kar raha hai. Iska matlab ek run mein `title` key aayegi, doosre mein `role` — inconsistent. Isko fix karne ke liye Pydantic schema jodo:

### Pydantic schema ke saath typed JSON

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
# LLM ko exact JSON schema batane wali detailed instructions print hoti hain
```

Ab model ko pata hai exactly kaunse fields chahiye, kaunse type ke. Par dhyan do — `JsonOutputParser` sirf dict deta hai, `PersonInfo` instance nahi. Type-checking ka pura fayda uthane ke liye `PydanticOutputParser` chahiye.

---

## PydanticOutputParser: Full Validation

Ye sabse powerful "classic" parser hai. Pydantic models (Python ka runtime type-validation equivalent — TypeScript ke Zod jaisa) use karke ye LLM ke output ko validate karta hai.

```python
from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

# Expected output structure define karo (Zod schema jaisa)
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

# result ek MovieReview instance hai, full type-checking ke saath
print(type(result))          # <class 'MovieReview'>
print(result.title)          # "The Matrix"
print(result.rating)         # 9.0
print(result.pros)           # ["groundbreaking action sequences", ...]
print(result.model_dump())   # dict mein convert karo (JS ke .toJSON() jaisa)
```

### Node.js / TypeScript comparison

```typescript
// TypeScript mein Zod
const MovieReview = z.object({
    title: z.string(),
    rating: z.number().min(1).max(10),
    pros: z.array(z.string()),
    cons: z.array(z.string()),
    summary: z.string(),
});

// Yahan tumhe manually karna padta:
// 1. Format instructions prompt mein likhna
// 2. Response se JSON parse karna
// 3. Zod se validate karna
// PydanticOutputParser ye teeno automatically karta hai
```

Agar model ne invalid JSON diya ya required field missing hai, `PydanticOutputParser.parse()` ek `OutputParserException` throw karega. Isliye isko akela use karna risky hai — aage "Error Handling and Retry Parsing" section mein dekhenge isko robust kaise banayein.

---

## Format Instructions Injection

Har parser mein ek `.get_format_instructions()` method hota hai jo ek string return karta hai — ye string LLM ko batati hai output kaise format karna hai. Ye string tum apne prompt mein inject karte ho.

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

### Prompts mein inject karna

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

> [!warning]
> Ye pura approach (format instructions ko prompt mein daal ke ummeed karna ki LLM inhe follow karega) fundamentally **best-effort** hai. Model ko koi hard constraint nahi hai — woh chahe toh instructions ignore kar sakta hai, especially complex nested schemas ke saath ya jab prompt bahut lamba ho jaaye. Yahi wajah hai ki production mein modern approach prefer kiya jaata hai — aage padho.

---

## Structured Output: Modern Approach

LangChain ka `model.with_structured_output()` **preferred modern approach** hai. Ye model ki native function-calling / tool-use capability use karta hai structured output guarantee karne ke liye — prompt mein format instructions daalne ki zaroorat hi nahi.

Socho isse aise: format-instructions approach mein tum waiter (LLM) se keh rahe ho "please order ko is specific format mein likhna" — woh bhool bhi sakta hai. `with_structured_output()` mein tum use ek **printed form** de rahe ho jisme sirf blanks fill karne hain — structurally galat hona mushkil hai, kyunki ye model ke tool-calling mechanism ke through enforce hota hai.

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

# Ek aisa model banao jo hamesha PersonInfo return kare
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

### Ye behtar kyun hai?

1. **Format instructions ki zaroorat nahi** — model internally tool calling use karta hai
2. **Zyada reliable** — model schema se constrained hai, sirf instructions se nahi
3. **Cleaner prompts** — koi format-instruction boilerplate nahi
4. **Kisi bhi Pydantic model ke saath kaam karta hai**

> [!info]
> `with_structured_output()` ke peeche do modes ho sakte hain — `"function_calling"` (default, model ki tool-calling API use karta hai) ya `"json_mode"` (kuch models jaise OpenAI ke `response_format={"type": "json_object"}` ka use karta hai). Zyadatar cases mein default hi best hai; explicitly override karne ke liye `model.with_structured_output(Schema, method="json_mode")` likh sakte ho.

### Complex nested structures

Real-world data flat kabhi nahi hota — address ke andar street/city, contact ke andar email/phone. Pydantic models ko nest karke ye handle hota hai:

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

`str | None = Field(default=None, ...)` pattern dhyan se dekho — ye optional fields ke liye hai. Agar text mein phone number mention nahi hai, model isse `None` chhod dega instead of hallucinate karne ke.

### Chains ke saath use karna

`with_structured_output()` se banaya model ek normal Runnable hai — isko `|` operator se prompt ke saath chain kar sakte ho, jaise koi bhi doosra model.

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

Agar tumhe fixed set of categories mein classify karna hai (jaise support ticket priority, ya sentiment), Python `Enum` use karo. Ye particularly agentic systems mein bahut common pattern hai — agent ko "kya karna hai" decide karwane ke liye.

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

`str, Enum` se inherit karna zaruri hai — isse Pydantic aur JSON serialization dono smoothly kaam karte hain (ekdum UPI transaction status ke enum jaisa — `SUCCESS`, `PENDING`, `FAILED` — koi ambiguity nahi, sirf fixed values).

---

## Error Handling and Retry Parsing

LLMs hamesha valid output nahi dete — network hiccup ho, model confuse ho jaaye, ya prompt ambiguous ho. Production agent ko iske liye taiyaar rehna padta hai. Yahan handling ke teen tareeke hain.

### OutputFixingParser: Malformed Output Ko Auto-Fix Karna

Socho tumne Swiggy pe order diya aur delivery address thoda ghalat likh diya — smart system usse automatically correct kar leta hai based on pin code. `OutputFixingParser` bhi wahi karta hai: agar parsing fail hoti hai, ye ek **doosri LLM call** karta hai jisme error aur bad output dono diye jaate hain, taaki model usse fix kare.

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

# Fixing parser wrap karo jo parsing errors fix karne ke liye LLM use kare
fixing_parser = OutputFixingParser.from_llm(
    parser=base_parser,
    llm=model,
)

# Agar model thoda malformed JSON de bhi de, fixing parser
# LLM se usse correct karwa lega
bad_output = '{"name": "Widget", "price": "twenty dollars", "in_stock": true}'
result = fixing_parser.parse(bad_output)  # LLM "twenty dollars" ko 20.0 mein fix karega
```

> [!warning]
> `OutputFixingParser` extra LLM call karta hai — matlab extra **cost** aur extra **latency**. High-throughput pipelines mein isse sparingly use karo, ya monitor karo kitni baar ye trigger ho raha hai (agar bahut zyada trigger ho raha hai, toh problem tumhare prompt mein hai, parser mein nahi).

### RetryOutputParser: Original Prompt Ke Saath Retry

`OutputFixingParser` sirf bad output dekhta hai. `RetryOutputParser` ek step aage jaata hai — ye **original prompt** bhi LLM ko wapas deta hai, taaki model context ke saath sahi answer de sake (sirf JSON fix nahi, balki original intent ke hisaab se sahi content generate kare).

```python
from langchain.output_parsers import RetryOutputParser

retry_parser = RetryOutputParser.from_llm(
    parser=base_parser,
    llm=model,
    max_retries=3,
)
```

### Chains Mein Manual Error Handling

Kabhi-kabhi tumhe sirf simple `try/except` chahiye hota hai — koi fancy auto-fix nahi, bas graceful failure:

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
    # Fallback: dobara try karo more explicit prompt ke saath, ya raw text return karo
```

### `.with_retry()` Chains Pe

Har LangChain `Runnable` (chain, model, parser — sab) pe built-in `.with_retry()` method available hai. Ye transient failures (rate limits, network blips, occasional malformed output) ke liye best hai — bina apna retry loop likhe.

```python
# Kisi bhi Runnable pe automatic retry jodo
robust_chain = (prompt | model | parser).with_retry(
    stop_after_attempt=3,
    wait_exponential_jitter=True,
)

result = robust_chain.invoke({
    "input": "List 3 programming languages.",
    "format_instructions": parser.get_format_instructions(),
})
```

`wait_exponential_jitter=True` important hai production mein — agar retry turant-turant fire karega (bina wait ke), toh rate-limited API ko aur zyada hammer karoge. Exponential backoff + jitter IRCTC tatkal booking ki tarah hai — sab log ek saath retry nahi karte, thoda randomize hota hai taaki server crash na ho.

---

## Comparison: Kaunsa Parser Kab Use Karein?

| Parser | Kab Use Karo | Reliability |
|---|---|---|
| `StrOutputParser` | Sirf text chahiye | Hamesha kaam karta hai |
| `JsonOutputParser` | Dict chahiye, schema flexible hai | Achha |
| `PydanticOutputParser` | Validated, typed output chahiye | Achha (retry ke saath) |
| `with_structured_output()` | **Default choice** structured data ke liye | Best (tool calling use karta hai) |
| `OutputFixingParser` | Kisi doosre parser ko wrap karke auto-fix ke liye | Bahut achha |

**Rule of thumb:** `with_structured_output()` se shuru karo. Agar tumhara model tool calling support nahi karta (kuch chhote/older/open-source models), toh `PydanticOutputParser` + `OutputFixingParser` pe fallback karo.

> [!tip]
> Agentic systems mein — jahan agent ko tool selection, planning, ya routing decisions structured format mein lene hote hain — `with_structured_output()` hi industry standard hai. Aage LangGraph chapters mein jab tum "router" nodes banaoge (agent decide karta hai "which node next"), ye wahi pattern use hoga.

---

## Production Considerations

Real systems banate waqt ye baatein dhyan mein rakhna:

1. **Cost**: `OutputFixingParser` aur `RetryOutputParser` extra LLM calls trigger karte hain. Agar tumhara base prompt hi ambiguous hai, retry mechanism cost badhayega bina reliability improve kiye — pehle prompt fix karo.
2. **Latency**: Har retry ek round-trip hai. Agent pipelines mein jahan multiple LLM calls chain mein hoti hain, ek slow/retry-heavy parser poore pipeline ki latency spike kar sakta hai. Timeout set karna mat bhoolo.
3. **Schema complexity**: Bahut zyada nested ya bahut zyada fields wala Pydantic schema chhote models ke liye confusing ho sakta hai. Complex extraction ko chhote sub-schemas mein todna behtar hai.
4. **Optional fields hamesha explicitly maaro**: `field: str | None = Field(default=None)` na likhne se model "N/A", "" ya hallucinated values bhar sakta hai jab info missing ho.
5. **Validation ke aage bhi validate karo**: Pydantic sirf *type* validate karta hai (str hai ya int hai) — *business logic* nahi (jaise "rating 1-5 ke beech honi chahiye"). Use `Field(ge=1, le=5)` jaise constraints, ya custom `@field_validator` add karo Pydantic mein.
6. **Logging/observability**: Production mein track karo kitni baar fixing/retry parsers trigger ho rahe hain. High trigger-rate ek signal hai ki prompt ya schema design mein improvement chahiye.

---

## Putting It All Together

```python
"""
Complete example: Ek product review analyzer jo structured data extract karta hai.
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
Ek Pydantic model define karo resume ke liye (name, email, skills, experience list, education list). `with_structured_output()` use karke free-form resume text parse karo. Missing information ke case handle karo `Optional` fields use karke.

### Exercise 2: Multi-format output
Ek chain banao jo topic leke teen alag formats mein output de: `StrOutputParser` chain plain text ke liye, `JsonOutputParser` chain dict ke liye, aur `with_structured_output()` chain Pydantic model ke liye. Teeno ki reliability aur ease-of-use compare karo.

### Exercise 3: Enum classifier
`with_structured_output()` use karke ek support ticket classifier banao. Enums define karo: category (billing, technical, account, other), priority (low, medium, high, critical), aur sentiment. Example support tickets parse karke classifications print karo.

### Exercise 4: Nested extraction
Ek Pydantic model banao nested structures ke saath, company description parse karne ke liye:

```python
class Company(BaseModel):
    name: str
    founded: int
    headquarters: Address       # nested
    founders: list[Person]      # nested list
    products: list[Product]     # nested list
    funding_total_usd: float | None
```

Kai company descriptions parse karo aur verify karo ki nested fields sahi hain.

### Exercise 5: Error handling pipeline
Ek chain banao jo intentionally difficult inputs receive kare (ambiguous text, bahut chhota text, nonsensical text). Ek three-tier fallback implement karo: `with_structured_output()` -> `PydanticOutputParser` with `OutputFixingParser` -> ek default object return karo. Har input ke liye log karo kaunsa tier successful hua.

### Exercise 6: Batch extraction
10 product descriptions ki ek list di gayi hai strings ke roop mein, `chain.batch()` use karke sab se structured data concurrently extract karo. Time karo aur sequential `chain.invoke()` calls se compare karo.

---

## Key Takeaways

- LLMs hamesha raw text return karte hain — production code ko structured, typed data chahiye. Output parsers ye gap bridge karte hain.
- `StrOutputParser` sabse simple hai — `AIMessage` se plain string nikalta hai. Structured data ke liye kaafi nahi hai.
- `JsonOutputParser` dict deta hai; Pydantic schema ke saath (`pydantic_object=...`) zyada consistent JSON shape milti hai, par abhi bhi plain dict hi return karta hai — typed object nahi.
- `PydanticOutputParser` full validation deta hai, format instructions inject karke — LLM ke output ko typed Pydantic model mein convert karta hai, par prompt-based hai isliye best-effort reliability.
- `model.with_structured_output(Schema)` **modern aur preferred approach** hai — model ki native tool-calling capability use karke schema-guaranteed output deta hai, koi format instruction boilerplate nahi chahiye.
- Nested Pydantic models (`Address`, `ContactInfo` jaise) real-world hierarchical data extract karne ke liye seedha kaam karte hain.
- `Enum` (with `str, Enum`) fixed-category classification (sentiment, priority, ticket type) ke liye best fit hai — agentic routing decisions ke liye bhi.
- Jab parsing fail ho: `OutputFixingParser` (LLM se galti fix karwao), `RetryOutputParser` (original prompt ke saath retry), ya `.with_retry()` (transient failures ke liye generic retry with exponential backoff+jitter).
- Rule of thumb: `with_structured_output()` se start karo; agar model tool calling support nahi karta, `PydanticOutputParser` + `OutputFixingParser` pe fallback karo.
- Production mein cost, latency, schema complexity, aur explicit optional fields (`str | None = Field(default=None)`) ka dhyan rakho — aur fixing/retry trigger-rate monitor karo taaki prompt design issues jaldi pakde jaayein.
