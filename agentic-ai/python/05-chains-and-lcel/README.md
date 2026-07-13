# Chains and LCEL (LangChain Expression Language)

🟡 Intermediate

Socho ek second ke liye — tum Swiggy pe khana order karte ho. Order jaate hi ek pipeline chalta hai: **restaurant ko order milta hai → chef khana banata hai → packaging hoti hai → delivery partner assign hota hai → tumhare ghar tak pahuchta hai**. Har step ka output, agle step ka input hai. Koi bhi step manually connect nahi karna padta — system khud pipeline chala deta hai.

LangChain mein bhi exactly yahi cheez LCEL karta hai. Prompt banao, model ko do, output parse karo — teeno steps ko ek dusre se **pipe (`|`)** operator se jod do, aur poora pipeline apne aap chal jaata hai. Ye chapter LCEL ko zero se samjhayega — kya hai, kyun aaya, aur production mein isse kaise use karte hain.

---

## Kya hota hai LCEL?

**LCEL (LangChain Expression Language)** ek declarative tarika hai LangChain ke components (prompts, models, parsers, retrievers, custom functions) ko **compose** karne ka — jaise Unix shell mein tum `cat file.txt | grep "error" | wc -l` likhte ho.

```python
chain = prompt | model | parser
#        ↑        ↑       ↑
#   PromptTemplate → ChatModel → OutputParser
```

Agar tumne kabhi Node.js mein RxJS pipes use kiye hain, ya Unix pipes shell scripting mein, mental model bilkul same hai — **ek step ka output, agle step ka input ban jaata hai**, bina tumhe manually glue code likhe.

> [!info]
> LCEL koi naya framework nahi hai — ye ek **interface + operator overloading** hai. Har LangChain component `Runnable` interface implement karta hai, aur Python mein `|` operator ko overload karke LangChain ne "pipe karo" wala syntax possible banaya hai (jaise `__or__` dunder method).

### Kyun zaruri hai LCEL?

Pehle (LangChain ke shuru ke versions mein) chains banane ke liye alag-alag **Chain classes** hoti thi — `LLMChain`, `SequentialChain`, `SimpleSequentialChain`, `TransformChain` waghera. Har ek ka apna constructor, apna behavior, apna gotcha. Isse do problems aati thi:

1. **Inconsistent interface** — kisi chain mein `.run()` hota tha, kisi mein `.predict()`, kisi mein `.__call__()`. Koi standard nahi tha.
2. **Composability nahi thi** — do chains ko jodna, ya ek chain ke andar parallel steps chalana, bahut messy ho jaata tha. Streaming, async, batching — sab alag se implement karni padti thi har chain ke liye.

LCEL ne ye sab replace kar diya ek single unifying interface se — **`Runnable`**. Har Runnable ke paas ye methods **free mein** milte hain:

| Method | Kya karta hai |
|---|---|
| `.invoke(input)` | Single input pe chalao, synchronous |
| `.batch([inputs])` | Multiple inputs pe parallel chalao |
| `.stream(input)` | Chunks mein output stream karo |
| `.ainvoke(input)` | Async version of invoke |
| `.abatch([inputs])` | Async version of batch |
| `.astream(input)` | Async version of stream |
| `.astream_events(input)` | Fine-grained events (token-level, step-level) |

Matlab jaise hi tumne apna component `Runnable` bana diya (chahe wo prompt ho, model ho, ya tumhara khud ka Python function), tumhe upar diye sab 6+ methods **automatically** mil jaate hain — bina ek line extra code likhe.

> [!tip]
> Ye Zomato ke standard delivery API jaisa hai — chahe restaurant South Indian ho ya Chinese, delivery partner ka interface same hai: pickup karo, deliver karo, status update karo. Andar ka implementation alag ho sakta hai, par bahar se interface consistent hai.

---

## Pipe Operator: `|`

### Sabse simple chain

```python
from dotenv import load_dotenv
load_dotenv()

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

# Step 1: Prompt template banao
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant."),
    ("human", "{question}"),
])

# Step 2: Model banao
model = ChatOpenAI(model="gpt-4o-mini", temperature=0)

# Step 3: Output parser banao — AIMessage se plain string nikalne ke liye
parser = StrOutputParser()

# Ab teeno ko pipe operator se jodo
chain = prompt | model | parser

# Poora chain ek hi invoke() call se chalao
result = chain.invoke({"question": "What is LCEL?"})
print(result)  # Plain string response — AIMessage object nahi
```

### Under the hood kya ho raha hai?

```
Input dict: {"question": "What is LCEL?"}
  ↓
prompt.invoke({"question": "What is LCEL?"})
  → ChatPromptValue with messages  (system + human messages ban gaye)
  ↓
model.invoke(ChatPromptValue)
  → AIMessage(content="LCEL is...")   (model ne response diya)
  ↓
parser.invoke(AIMessage)
  → "LCEL is..."   (plain string, ready to use)
```

Har `|` ke baad wala step, pichle step ka **poora output** input ke roop mein leta hai. Tumhe khud koi glue code likhne ki zarurat nahi — LCEL khud ye "data ko agle step tak pahunchana" wala kaam karta hai.

### Node.js developer ke liye comparison

Tum Node.js background se ho, to ye analogy kaam aayegi:

```javascript
// RxJS pipe pattern (conceptually similar)
const chain = prompt$.pipe(
    switchMap(prompt => model.call(prompt)),
    map(response => parser.parse(response))
);

// LangChain LCEL — bahut cleaner syntax
// chain = prompt | model | parser
```

Dono jagah idea same hai: **composable, declarative data pipeline** — jahan har step apna kaam karke agle ko data forward kar deta hai.

> [!warning]
> `|` operator sirf `Runnable` objects ke beech kaam karta hai. Agar tumne koi plain Python function directly pipe karne ki koshish ki (`prompt | model | my_function`), LangChain use automatically `RunnableLambda` mein wrap kar dega — par agar wo function kisi aur type ka object return kare jo Runnable nahi hai, to error aayega. Isliye custom functions ko explicitly `RunnableLambda` mein wrap karna best practice hai (aage discuss karenge).

---

## RunnableSequence

`|` operator internally ek `RunnableSequence` banata hai. Tum ise explicitly bhi bana sakte ho:

```python
from langchain_core.runnables import RunnableSequence

# Ye dono ek hi cheez hain:
chain1 = prompt | model | parser
chain2 = RunnableSequence(first=prompt, middle=[model], last=parser)

# Dono ka interface same hai
result = chain2.invoke({"question": "Hello"})
```

Zyadatar log `RunnableSequence` ko directly kabhi nahi banate — `|` operator hi use karte hain kyunki wo zyada readable hai. Par ye samajhna zaruri hai ki **`|` sirf syntactic sugar hai** `RunnableSequence` ke upar.

### Chain ko inspect karna

```python
chain = prompt | model | parser

# Dekho chain ke andar kya steps hain
print(chain)
# RunnableSequence(
#   first=ChatPromptTemplate(...),
#   middle=[ChatOpenAI(...)],
#   last=StrOutputParser()
# )

# Chain ka input/output schema dekho (Pydantic-based)
print(chain.input_schema.model_json_schema())
# {'properties': {'question': {'type': 'string'}}, 'required': ['question']}
```

`input_schema` bahut kaam aata hai jab tum debug kar rahe ho ki chain ko exactly kaunsa shape ka input chahiye — jaise Postman mein API ka request schema dekhna.

---

## RunnableParallel: Parallel Execution

`RunnableParallel` multiple chains ko **ek saath (concurrently)** chalata hai aur result ek dict mein return karta hai. Ye LangChain ka JavaScript ke `Promise.all()` jaisa equivalent hai.

**Kab use karoge?** Socho tumhe ek topic pe joke, poem, aur ek fact — teeno chahiye. Agar sequentially chalao (ek ke baad ek), to teeno ka time add ho jaayega. Par agar parallel chalao, to total time = **sabse slow chain ka time** (jaise Zomato pe restaurant aur delivery partner dono simultaneously assign hote hain, sequentially nahi).

```python
from langchain_core.runnables import RunnableParallel
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import ChatOpenAI

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)
parser = StrOutputParser()

# Teeno independent chains define karo
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

# Teeno ko parallel mein combine karo
parallel_chain = RunnableParallel(
    joke=joke_chain,
    poem=poem_chain,
    fact=fact_chain,
)

# Ek hi invoke() call — teeno underlying LLM calls concurrently trigger hote hain
result = parallel_chain.invoke({"topic": "Python programming"})

print("JOKE:", result["joke"])
print("POEM:", result["poem"])
print("FACT:", result["fact"])
```

### Dict shorthand syntax

Agar tumhe explicitly `RunnableParallel(...)` likhne ka mann nahi, LangChain ek plain Python dict ko bhi automatically `RunnableParallel` mein convert kar deta hai jab tum use pipe karte ho:

```python
# Ye upar wale RunnableParallel jaisa hi hai — bas dict likhne se ban gaya
parallel_chain = {
    "joke": joke_chain,
    "poem": poem_chain,
    "fact": fact_chain,
} | some_combiner_step  # Parallel output ko aage kisi step mein pipe kar sakte ho
```

### Real-world example: RAG mein parallel retrieval

RAG (Retrieval-Augmented Generation) pipelines mein ye pattern bahut common hai — **context fetch karo, aur saath hi original question ko bhi aage forward karo**:

```python
from langchain_core.runnables import RunnableParallel, RunnablePassthrough

# Parallel mein: context retrieve karo AND question ko as-is pass karo
rag_setup = RunnableParallel(
    context=retriever,               # Relevant documents fetch karo
    question=RunnablePassthrough(),  # Question ko bina chhede aage bhejo
)

# Fir dono ko QA prompt mein feed karo
rag_chain = rag_setup | qa_prompt | model | parser
```

Ye Zomato ke order-tracking jaisa hai — jab order place hota hai, restaurant ko notification jaata hai **aur** saath mein delivery partner search bhi start ho jaata hai — dono parallel mein, koi ek dusre ka wait nahi karta.

> [!warning]
> `RunnableParallel` "parallel" hai LLM-call level pe — matlab agar teeno branches API calls kar rahe hain (jaise 3 alag OpenAI calls), wo concurrently fire honge (async/threading use hoti hai internally). Lekin agar ek branch bahut heavy hai (jaise 10-second retrieval), overall latency us slowest branch ke barabar hi hogi. Cost bhi teeno calls ka sum hoga — parallel hone se cost kam nahi hoti, sirf **time** bachta hai.

---

## RunnablePassthrough: Data Ko Bina Chhede Aage Bhejna

`RunnablePassthrough` apna input bilkul unchanged aage bhej deta hai. Iska use tab hota hai jab tumhe original data ko preserve karna ho jabki koi aur transformation parallel mein ho rahi ho.

```python
from langchain_core.runnables import RunnablePassthrough, RunnableParallel

# Input ko as-is bhi forward karo, aur transform bhi karo — saath saath
chain = RunnableParallel(
    original=RunnablePassthrough(),            # Input jaisa ka waisa
    uppercase=lambda x: x.upper(),             # Transform kiya hua
    word_count=lambda x: len(x.split()),       # Computed value
)

result = chain.invoke("hello world from langchain")
print(result)
# {
#   "original": "hello world from langchain",
#   "uppercase": "HELLO WORLD FROM LANGCHAIN",
#   "word_count": 4,
# }
```

### `RunnablePassthrough.assign()` — dict mein naye fields jodo

Real chains mein data mostly dict form mein flow karta hai. `.assign()` original dict ko preserve karte hue naye computed fields **add** kar deta hai — jaise ek object mein naya key-value pair merge karna, bina existing keys ko touch kiye.

```python
from langchain_core.runnables import RunnablePassthrough

chain = RunnablePassthrough.assign(
    num_words=lambda x: len(x["text"].split()),
    first_word=lambda x: x["text"].split()[0],
)

result = chain.invoke({"text": "Hello world from Python"})
print(result)
# {
#   "text": "Hello world from Python",  # <-- original field preserved hua
#   "num_words": 4,                      # <-- naya field add hua
#   "first_word": "Hello",               # <-- naya field add hua
# }
```

### Common pattern: model ko bhejne se pehle input enrich karna

Ye pattern RAG aur agentic pipelines mein bahut baar dikhega — kisi bhi extra context (retrieved documents, user metadata, tool results) ko original input ke saath merge karke prompt tak pahunchana:

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
    """Simulate karo ki hum documents retrieve kar rahe hain (real app mein vector DB se aayega)."""
    return "Python was created by Guido van Rossum in 1991."

chain = (
    RunnablePassthrough.assign(context=lambda x: fake_retriever(x))  # context field add karo
    | prompt
    | model
    | StrOutputParser()
)

result = chain.invoke({"question": "Who created Python?"})
print(result)
```

---

## RunnableLambda: Chains Mein Custom Python Functions

`RunnableLambda` kisi bhi normal Python function ko chain-compatible bana deta hai — matlab usko bhi `.invoke()`, `.batch()`, `.stream()` methods mil jaate hain.

**Kyun zaruri hai?** LLM chains mein sirf prompt-model-parser hi nahi chalta — real pipelines mein tumhe custom logic bhi chahiye hoti hai: data cleaning, validation, format conversion, database lookup, etc. `RunnableLambda` ye custom Python code ko chain ka first-class citizen bana deta hai.

```python
from langchain_core.runnables import RunnableLambda

def format_output(text: str) -> str:
    """LLM output ko post-process karo."""
    return text.strip().upper()

formatter = RunnableLambda(format_output)

chain = prompt | model | StrOutputParser() | formatter
result = chain.invoke({"question": "Say hello"})
print(result)  # "HELLO! HOW CAN I HELP YOU TODAY?"
```

> [!tip]
> Agar tum simple function directly pipe karte ho (jaise `chain = prompt | model | parser | format_output` bina `RunnableLambda` wrap kiye), LangChain automatically usko `RunnableLambda` mein convert kar deta hai. Par explicit wrapping zyada readable hai aur type hints/docstrings ke saath better IDE support deta hai — production code mein explicit likhna best practice hai.

### Complex logic wale lambdas

```python
from langchain_core.runnables import RunnableLambda

def process_and_validate(data: dict) -> dict:
    """Extracted data ko clean aur validate karo."""
    # Empty fields hatao
    cleaned = {k: v for k, v in data.items() if v}

    # Strings normalize karo
    if "name" in cleaned:
        cleaned["name"] = cleaned["name"].strip().title()

    # Metadata add karo
    cleaned["processed"] = True

    return cleaned

processor = RunnableLambda(process_and_validate)

# Chain mein use karo
chain = prompt | model | JsonOutputParser() | processor
```

### Async lambdas

Production agents mein async bahut zaruri hota hai — jab tumhe multiple LLM calls ya I/O-bound tasks (DB calls, API calls) parallel mein chalane hain, tab async chain fast aur scalable rehti hai.

```python
from langchain_core.runnables import RunnableLambda
import asyncio

async def async_lookup(name: str) -> str:
    """Simulate karo ek async database lookup (jaise Redis se user profile fetch karna)."""
    await asyncio.sleep(0.1)  # I/O simulate kar rahe hain
    return f"Data for {name}"

# RunnableLambda async functions ko bhi support karta hai
lookup = RunnableLambda(async_lookup)

# ainvoke() ke saath kaam karta hai
result = await lookup.ainvoke("Alice")
```

### `@chain` decorator — shortcut

Agar tumhe poora ek multi-line function chain step banana hai (sirf single lambda nahi), `@chain` decorator use karo:

```python
from langchain_core.runnables import chain as chain_decorator

@chain_decorator
def analyze_text(input_dict: dict) -> str:
    """Custom chain step, @chain decorator ke saath."""
    text = input_dict["text"]
    word_count = len(text.split())
    if word_count < 10:
        return "short"
    elif word_count < 50:
        return "medium"
    else:
        return "long"

# Ab isse kisi bhi normal Runnable ki tarah use karo
result = analyze_text.invoke({"text": "This is a short sentence."})
print(result)  # "short"
```

---

## `.bind()`: Extra Parameters Bake Karna

`.bind()` ek naya Runnable banata hai jismein extra keyword arguments **permanently attach** ho jaate hain — original Runnable modify nahi hota (immutable pattern, jaise JavaScript ka `.bind(this)`).

```python
from langchain_openai import ChatOpenAI

model = ChatOpenAI(model="gpt-4o-mini")

# Stop sequences bind karo — model in tokens pe generation rok dega
model_with_stop = model.bind(stop=["\n\n", "END"])

# Response format bind karo (JSON mode)
json_model = model.bind(response_format={"type": "json_object"})

# Chains mein use karo
chain = prompt | json_model | JsonOutputParser()
```

### Model ko tools bind karna (function calling ke liye)

Ye pattern agentic AI ka core building block hai — model ko batana ki uske paas kaunse "tools" (functions) available hain:

```python
from langchain_core.tools import tool

@tool
def get_weather(city: str) -> str:
    """Get the weather for a city."""
    return f"Sunny, 72F in {city}"

# Model ko tools bind karo (function-calling enable ho jaata hai)
model_with_tools = model.bind_tools([get_weather])

response = model_with_tools.invoke("What's the weather in Paris?")
print(response.tool_calls)  # Model decide kar sakta hai get_weather call karna
```

> [!info]
> `.bind_tools()` chapter 07 (Tools and Function Calling) mein detail mein cover hoga. Yahan bas itna samajhlo ki `.bind()` family ke methods Runnable ko **configure** karte hain bina naya class banaye.

---

## `.with_fallbacks()`: Error Handling

Production mein LLM APIs down ho sakti hain, rate limits lag sakti hain, ya timeout ho sakta hai. `.with_fallbacks()` primary Runnable fail hone par **backup Runnable** try karta hai — automatically.

Isko IRCTC ki tatkal booking jaisa socho — agar primary payment gateway (jaise ek bank ka UPI) fail ho jaaye, system automatically dusra gateway try karta hai instead of order cancel karne ke.

```python
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic

# Primary model
primary = ChatOpenAI(model="gpt-4o", temperature=0)

# Fallback agar primary fail ho jaaye (rate limit, API down, etc.)
fallback = ChatAnthropic(model="claude-sonnet-4-20250514", temperature=0)

# Fallback ke saath model banao
resilient_model = primary.with_fallbacks([fallback])

# Agar OpenAI fail hota hai, Anthropic automatically try hoga
chain = prompt | resilient_model | parser
result = chain.invoke({"question": "Hello"})
```

### Chain-level fallbacks

`.with_fallbacks()` sirf model pe nahi, poori chain pe bhi laga sakte ho:

```python
# Ek expensive chain se sasti chain pe fallback
expensive_chain = prompt | ChatOpenAI(model="gpt-4o") | parser
cheap_chain = prompt | ChatOpenAI(model="gpt-4o-mini") | parser

resilient_chain = expensive_chain.with_fallbacks([cheap_chain])
```

> [!warning]
> **Production gotcha**: Fallback tabhi trigger hota hai jab primary **exception throw** kare (jaise `RateLimitError`, timeout). Agar primary galat/hallucinated response return karta hai (par exception nahi throw karta), fallback trigger **nahi** hoga — kyunki LCEL ko pata nahi ki output "galat" hai. Content-quality validation ke liye tumhe separate output-validation logic chahiye hogi (jaise Pydantic validator + retry loop), fallback sirf **hard failures** ke liye hai.

---

## Streaming Through Chains

LCEL ki sabse badi khoobi ye hai ki **streaming poori chain ke through kaam karta hai** — tokens model se lekar parser tak, aur final output tak flow karte hain bina poore response ka wait kiye.

Ye UPI payment ke real-time status update jaisa hai — tumhe "Processing... Processing... Success" step-by-step dikhta hai, sirf final "Success" ka wait nahi karna padta.

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

# Poori chain ke through stream karo
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

### Streaming events (complex chains ke liye fine-grained visibility)

Jab chain mein multiple steps hain aur tumhe pata karna hai ki **kaunsa step abhi chal raha hai** (sirf final tokens nahi), `astream_events()` use karo:

```python
import asyncio

async def main():
    async for event in chain.astream_events(
        {"topic": "a magical library"},
        version="v2",
    ):
        kind = event["event"]
        if kind == "on_chat_model_stream":
            # LLM se ek token aaya
            print(event["data"]["chunk"].content, end="", flush=True)
        elif kind == "on_chain_end":
            print(f"\n[Chain completed]")

asyncio.run(main())
```

> [!tip]
> Frontend mein agar tum agent ka "thinking" state dikhana chahte ho (jaise ChatGPT ka "Searching..." indicator), `astream_events` hi use hota hai — ye batata hai kaunsa tool call ho raha hai, kaunsa retriever chal raha hai, kaunsa LLM token stream ho raha hai — sab kuch granular events ke roop mein.

---

## LCEL vs Purane Chain Classes — Kyun Replace Hua?

Agar tumne kabhi purane LangChain tutorials dekhe hain, tumhe `LLMChain`, `SequentialChain`, `SimpleSequentialChain` jaise naam dikhe honge. Ye **deprecated** ho chuke hain LCEL ke aane ke baad. Comparison samajhlo:

| Aspect | Purani Chain classes (`LLMChain` etc.) | LCEL (`prompt \| model \| parser`) |
|---|---|---|
| Interface | Har chain ka apna method (`.run()`, `.predict()`) | Sab Runnables — same `.invoke()/.stream()/.batch()` |
| Streaming | Manually implement karna padta tha har chain mein | Free — sab Runnables mein built-in |
| Async support | Alag se implement karna padta tha (`arun`, `apredict`) | Free — `.ainvoke()`, `.astream()` automatically |
| Parallel execution | Mushkil, manual threading/asyncio | `RunnableParallel` se ek line mein |
| Composability | Chains ko jodna verbose aur rigid tha | `|` operator se kisi bhi Runnable ko kisi se bhi jodo |
| Debugging | Har chain ka apna debug tarika | LangSmith tracing sab jagah consistent |
| Readability | `LLMChain(llm=model, prompt=prompt)` — verbose | `prompt | model` — declarative, ek nazar mein samajh aata hai |

**Bottom line**: LCEL ne "framework" ko "language" bana diya. Ab chain likhna Python expression likhne jaisa lagta hai, na ki class instantiate karna. Isi wajah se LangChain docs aur naye tutorials mein `LLMChain` waghera ab nahi dikhte — sab kuch LCEL-first hai.

> [!warning]
> Agar tumhe purane codebase mein `LLMChain`, `SimpleSequentialChain` dikhein — wo kaam to karenge (backward compatibility ke liye rakhe gaye hain) par unhe naye code mein use mat karo. LangChain ki official guidance hai LCEL ya seedha LangGraph use karna (jo hum chapter 12+ mein cover karenge).

---

## Real-World Chain Patterns

### Pattern 1: Multi-step analysis (sequential + parallel combo)

Ye pattern production RAG aur content-analysis pipelines mein bahut common hai — pehle summarize karo, fir uss summary pe **parallel mein** multiple analyses chalao:

```python
from langchain_core.runnables import RunnablePassthrough, RunnableParallel

# Step 1: Summarize
summarize_prompt = ChatPromptTemplate.from_messages([
    ("system", "Summarize this text in 2 sentences."),
    ("human", "{text}"),
])

# Step 2: Entities extract karo
entity_prompt = ChatPromptTemplate.from_messages([
    ("system", "List key entities (people, companies, places) from: {summary}"),
    ("human", "Extract entities."),
])

# Step 3: Classify karo
classify_prompt = ChatPromptTemplate.from_messages([
    ("system", "Classify this summary into one category: tech, business, science, other."),
    ("human", "{summary}"),
])

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)
parser = StrOutputParser()

# Chain: summarize -> parallel(entities extract + classify)
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

Jab tumhe input ke hisaab se **alag chain route** karna ho — jaise Zomato ka support-bot decide karta hai ki query "order-related" hai ya "payment-related" aur uss hisaab se alag department (chain) ko route karta hai:

```python
from langchain_core.runnables import RunnableBranch

# Input ke condition ke basis pe alag chains mein route karo
branch = RunnableBranch(
    # (condition, chain) pairs — pehla matching condition win karta hai
    (lambda x: "code" in x["question"].lower(), code_chain),
    (lambda x: "math" in x["question"].lower(), math_chain),
    # Default chain (koi condition match na ho to ye chalega)
    general_chain,
)

result = branch.invoke({"question": "Write a Python function for sorting"})
# "code" keyword match hua, isliye code_chain route hoga
```

> [!info]
> Simple keyword-matching se aage badhkar production mein routing ke liye aksar ek chhota classifier LLM call use hota hai (jaise "is this question about code, math, or general?" pucho model se, fir uss decision pe route karo). Complex multi-step routing logic ke liye LangGraph ke conditional edges (chapter 14) zyada powerful aur maintainable hote hain — `RunnableBranch` simple cases ke liye theek hai.

### Pattern 3: Map-reduce over documents

Bahut saare documents ko summarize karke, unn summaries ko combine karna — classic map-reduce pattern:

```python
from langchain_core.runnables import RunnableLambda

summarize_one = ChatPromptTemplate.from_messages([
    ("system", "Summarize this document in one paragraph."),
    ("human", "{doc}"),
]) | model | parser

def map_summarize(docs: list[str]) -> list[str]:
    """Har document ko summarize karo (batch() se parallel mein)."""
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

`.batch()` yahan crucial hai — sequentially loop lagane ki jagah, saare documents ek saath (concurrently) summarize ho jaate hain, jisse latency kaafi kam ho jaati hai jab documents ki list badi ho.

---

## Debugging Chains

### Verbose logging

```python
from langchain.globals import set_verbose, set_debug

set_verbose(True)   # Chain ke inputs/outputs print karo
set_debug(True)     # Sab kuch print karo (bahut detailed)

chain.invoke({"question": "Hello"})

# Kaam ho jaane ke baad off kar do
set_verbose(False)
set_debug(False)
```

### Intermediate results inspect karna

Jab chain lambi ho aur samajh na aaye ki kaunsa step galat data de raha hai, beech mein "debug checkpoints" daal do:

```python
from langchain_core.runnables import RunnableLambda

def debug_step(data):
    """Intermediate data print karke pass-through karo."""
    print(f"DEBUG: {type(data).__name__} = {str(data)[:200]}")
    return data

chain_with_debug = (
    prompt
    | RunnableLambda(debug_step)    # Prompt ka output dekho
    | model
    | RunnableLambda(debug_step)    # Model ka output dekho
    | parser
)

result = chain_with_debug.invoke({"question": "Hello"})
```

> [!tip]
> Production mein `set_debug(True)` chhod kar mat rakho — bahut verbose hai aur sensitive data (prompts, API keys context mein) logs mein leak kar sakta hai. Iski jagah **LangSmith** (chapter 10 mein cover hoga) use karo, jo proper tracing UI deta hai bina console spam ke.

---

## Common Gotchas (Production Mein Dhyaan Rakhna)

1. **Input schema mismatch**: Agar chain ka pehla step dict expect karta hai (`{"question": "..."}`) aur tumne plain string bheji, `TypeError` aayega. Hamesha `chain.input_schema.model_json_schema()` se input shape verify karo.

2. **Silent type coercion nahi hota**: `RunnableLambda` mein agar function `None` return kare, aage wala step us `None` ko as-is receive karega — koi automatic validation nahi hai. Apne lambdas mein explicit type checks/defaults rakho.

3. **`.batch()` rate limits hit kar sakta hai**: Agar tum `.batch()` se 100 documents ek saath bhejte ho, provider (OpenAI/Anthropic) ki rate limit turant hit ho sakti hai. `.batch()` mein `max_concurrency` parameter use karo: `chain.batch(inputs, config={"max_concurrency": 5})`.

4. **Fallbacks sirf exceptions pe trigger hote hain**: Jaisa upar discuss kiya, `.with_fallbacks()` content-quality issues detect nahi karta, sirf hard failures (timeouts, API errors) pe kaam karta hai.

5. **Chain ke andar mutable state avoid karo**: LCEL chains **stateless** design ke liye bane hain — har `.invoke()` independent hona chahiye. Agar tumhe state chahiye (conversation history, counters), wo LangGraph ka use-case hai (chapter 12+), LCEL ka nahi.

---

## Key Takeaways

- **LCEL** LangChain components ko `|` (pipe) operator se compose karne ka declarative tarika hai — jaise Unix pipes ya RxJS.
- Har component `Runnable` interface implement karta hai, jisse `.invoke()`, `.batch()`, `.stream()`, aur unke async versions (`.ainvoke()`, `.abatch()`, `.astream()`) **free mein** milte hain.
- `RunnableSequence` `|` operator ke peeche ka actual class hai — sequential steps chalata hai.
- `RunnableParallel` multiple chains ko concurrently chalata hai (`Promise.all()` jaisa) — RAG pipelines mein context + question ko saath forward karne ke liye common.
- `RunnablePassthrough` aur `.assign()` input ko unchanged forward karte hain jabki naye computed fields add karte hain.
- `RunnableLambda` (aur `@chain` decorator) kisi bhi Python function ko full Runnable bana deta hai — custom logic ko chain ka first-class part banata hai.
- `.bind()` extra parameters (stop sequences, tools, response format) ko Runnable mein permanently attach karta hai bina original ko modify kiye.
- `.with_fallbacks()` primary model/chain fail hone par (exceptions ke case mein) backup try karta hai — production resilience ke liye zaruri.
- Streaming (`.stream()`, `.astream()`, `.astream_events()`) **poori chain ke through** kaam karta hai — koi extra setup nahi chahiye.
- LCEL ne purani `LLMChain`/`SequentialChain` classes ko replace kiya kyunki wo inconsistent interface, manual streaming/async, aur poor composability wali thi.
- Production gotchas yaad rakho: input schema mismatches, `.batch()` rate limits, fallbacks sirf exceptions pe trigger hote hain, aur chains stateless honi chahiye (state ke liye LangGraph use karo).
