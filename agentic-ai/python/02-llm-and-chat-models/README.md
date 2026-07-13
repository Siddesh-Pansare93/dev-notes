# LLMs and Chat Models

🟢 Beginner

## Kya hota hai ye chapter?

Pichle chapter mein humne dekha ki Agentic AI kya hota hai aur LangChain/LangGraph kyun use karte hain. Ab hum foundation pe aate hain — **actual model ko call kaise karte hain**. Har agent, har chain, har graph node — sabke andar akhir mein ek hi cheez ho rahi hoti hai: ek LLM ko message bhejna aur response wapas lena. Agar ye base cheez tumhe pakki tarah samajh aa gayi, toh baaki poora course ismein hi build hoga.

Socho ek second ke liye — Zomato app mein jab tum "Order karo" dabate ho, backend mein ek request jaati hai, restaurant tak pahunchti hai, aur response wapas aata hai ("order confirmed"). LLM call bhi bilkul waisा hi hai: tum ek **prompt** (request) bhejte ho, model (restaurant) usko process karta hai, aur ek **response** wapas deta hai. Fark sirf itna hai ki yahan restaurant ek trained neural network hai jo text generate karta hai.

Is chapter mein hum seekhenge:
- LLM vs ChatModel — dono mein fark kya hai aur LangChain sirf ChatModel pe focus kyun karta hai
- Models ko invoke (call) kaise karein
- Message types — System, Human, AI
- Important parameters — temperature, max_tokens, aur bhi
- Streaming — real-time response dikhana
- Async calls — parallel mein multiple requests bhejna
- Structured output — JSON/Pydantic format mein guaranteed response
- Provider swapping — OpenAI se Anthropic (ya local model) pe switch karna bina code badle

---

## Kyun zaruri hai? LLM vs ChatModel

Purane zamane (2022-23) mein LangChain ke paas do tarah ke model abstractions the:

1. **LLM (`llm.invoke("plain text")`)** — Raw text string leta hai, raw text string return karta hai. Jaise ek purana walkie-talkie — sirf ek continuous text stream.
2. **ChatModel (`chat_model.invoke([messages])`)** — Structured messages ka array leta hai (system/human/ai roles ke saath), aur ek structured `AIMessage` return karta hai.

Aaj (2024+) ke zyada tar production LLMs — GPT-4o, Claude, Gemini — sab **chat-tuned** hain. Matlab unko train hi is tarah kiya gaya hai ki wo conversation turns (system prompt, user message, assistant reply) samajhte hain, sirf raw text completion nahi karte. Isliye LangChain mein bhi ab **ChatModel hi standard interface hai** — chahe tum OpenAI use karo, Anthropic, Google, ya local Ollama model, sabka wrapper `BaseChatModel` interface implement karta hai.

> [!info]
> Purana `LLM` class (jaise `OpenAI()` — bina "Chat" prefix ke) sirf legacy / completion-style models (jaise `text-davinci-003`) ke liye tha. Naye projects mein tumhe hamesha `ChatOpenAI`, `ChatAnthropic`, jaisi classes use karni hain — inhi ko is course mein hum "chat models" bolenge.

### Comparison table

| | Legacy `LLM` | `ChatModel` (aaj ka standard) |
|---|---|---|
| Input | Plain string | List of messages (System/Human/AI) ya plain string (auto-convert ho jaata hai) |
| Output | Plain string | `AIMessage` object (content + metadata) |
| Roles ka concept | Nahi hota | Haan — system/user/assistant |
| Multi-turn memory | Manually string mein concatenate karna padta | Message list mein naturally fit ho jaata hai |
| Modern providers (GPT-4o, Claude, Gemini) | Support kam/deprecated | Primary interface |

Agar tumne Node.js mein OpenAI SDK ka `openai.chat.completions.create({ messages: [...] })` use kiya hai, toh ye bilkul wahi mental model hai — bas LangChain isko Python classes ke through provider-agnostic bana deta hai.

---

## Setup: pehla model call karte hain

Sabse pehle apna environment ready karo. `.env` file mein apni API key daalo:

```bash
# .env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

```bash
pip install langchain langchain-openai langchain-anthropic python-dotenv
```

### ChatOpenAI

```python
from dotenv import load_dotenv
load_dotenv()  # .env file se API keys load karo

from langchain_openai import ChatOpenAI

# Default model, default params
model = ChatOpenAI()

# Model aur parameters explicitly specify karna (recommended — production mein defaults pe kabhi rely mat karo)
model = ChatOpenAI(
    model="gpt-4o-mini",      # Kaunsa model use karna hai
    temperature=0.7,          # Creativity (0 = deterministic, 1 = creative)
    max_tokens=1000,          # Output ki max length
    timeout=30,               # Kitne second wait karna hai response ke liye
    max_retries=2,            # Failure pe kitni baar retry karega
)
```

### ChatAnthropic

```python
from langchain_anthropic import ChatAnthropic

model = ChatAnthropic(
    model="claude-sonnet-4-20250514",
    temperature=0.7,
    max_tokens=1024,   # Anthropic mein ye REQUIRED hai; OpenAI mein optional
)
```

> [!warning]
> Anthropic ke models mein `max_tokens` dena **zaruri** hai — agar nahi doge toh error aayega. OpenAI mein ye optional hai (default kaafi bada hota hai). Ye ek chhota sa gotcha hai jo naye developers ko pakadta hai jab wo OpenAI se Anthropic pe switch karte hain.

### Provider swap — ek hi interface, alag backend

Ye LangChain ka sabse bada selling point hai. Socho Swiggy aur Zomato dono restaurants deliver karte hain — order karne ka tumhara app-side experience same hai, backend delivery partner alag hai. Waise hi, `BaseChatModel` interface implement karne ki wajah se tum providers ko swap kar sakte ho bina apna baaki ka code chhue:

```python
import os
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic

def get_model(provider: str = "openai"):
    """Factory function — DI (dependency injection) container jaisa concept."""
    if provider == "openai":
        return ChatOpenAI(model="gpt-4o-mini", temperature=0)
    elif provider == "anthropic":
        return ChatAnthropic(model="claude-sonnet-4-20250514", temperature=0)
    else:
        raise ValueError(f"Unknown provider: {provider}")

# .env ya config se provider decide karo — code change nahi karna padega
model = get_model(os.getenv("LLM_PROVIDER", "openai"))
response = model.invoke("Explain async/await in one sentence.")
print(response.content)
```

### Local models (Ollama) — bina API key ke

Production cost bachane ke liye ya privacy ke liye, kabhi kabhi tum apne local machine pe hi model chalate ho (jaise Llama 3, Mistral) via [Ollama](https://ollama.com):

```python
from langchain_ollama import ChatOllama

model = ChatOllama(
    model="llama3.1",
    temperature=0,
)

response = model.invoke("What is the capital of India?")
print(response.content)
```

Same `.invoke()`, same `.stream()`, same message types — kyunki ye bhi `BaseChatModel` hi implement karta hai. Ye interface ki asli taakat hai: **tumhara agent/chain ka code kabhi nahi pata chalega ki backend mein OpenAI hai, Anthropic hai, ya tumhare laptop ka GPU hai.**

> [!tip]
> Production agents banate waqt hamesha model creation ko ek factory function ya config-driven setup ke peeche rakho (jaisa upar dikhaya). Isse tum staging mein sasta/local model use kar sakte ho aur production mein powerful model — bina business logic touch kiye.

---

## Messages: System, Human, AI

Chat models "roles" ke saath kaam karte hain. Har message ka ek **role** hota hai aur **content**.

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
print(response.content)  # Actual text response
```

### Teeno message types ka role

| LangChain class | OpenAI role | Ye kya karta hai |
|---|---|---|
| `SystemMessage` | `system` | Model ka behavior/persona set karta hai — ye "instructions" hain jo model follow karega |
| `HumanMessage` | `user` | User ka actual input/question |
| `AIMessage` | `assistant` | Model ke pichle responses (multi-turn conversation ke liye) |

Isko UPI transaction analogy se socho: `SystemMessage` woh "merchant rules" hain jo pehle se set hain (jaise "sirf ₹1 lakh tak transfer allowed"), `HumanMessage` tumhara "send money" request hai, aur `AIMessage` UPI app ka "success/failed" response hai jo history mein store hota hai.

### Multi-turn conversation — context kaise banta hai

```python
messages = [
    SystemMessage(content="You are a helpful coding tutor."),
    HumanMessage(content="What is a decorator in Python?"),
    AIMessage(content="A decorator is a function that wraps another function to extend its behavior without modifying it directly. You apply it with the @ syntax above a function definition."),
    HumanMessage(content="Show me a simple example."),
]

response = model.invoke(messages)
print(response.content)
# Model ko poori conversation dikhti hai, isliye "Show me a simple example"
# ka context automatically "decorator ka example" ban jaata hai
```

> [!info]
> **Node.js parallel:** Ye bilkul wahi pattern hai jo tum `openai.chat.completions.create({ messages: [...] })` mein `messages` array banate waqt karte ho. LangChain sirf har role ko apni class deta hai instead of plain `{ role: "user", content: "..." }` objects ke.

> [!warning]
> Har `.invoke()` call **stateless** hoti hai — model ko kuch bhi "yaad" nahi rehta apne aap. Agar tumhe multi-turn conversation chahiye, toh tumhe khud poora `messages` array maintain karke bhejna padega, har baar. (Chapter 06 — Memory — mein hum dekhenge ki ye automatically kaise manage karte hain.)

### Shorthand tuple syntax

Kabhi kabhi (especially prompt templates mein) tum messages ko tuples ki tarah bhi likh sakte ho:

```python
messages = [
    ("system", "You are a helpful assistant."),
    ("human", "What is the capital of France?"),
]
response = model.invoke(messages)
```

Ye same cheez hai, bas thoda compact syntax hai. `ChatPromptTemplate` (Chapter 03) mein ye pattern bahut common hai.

---

## Basic Invocation: `model.invoke()`

`.invoke()` universal entry point hai. Ye teen tarah ka input le sakta hai: ek plain string, messages ki list, ya `PromptValue`.

### String input (auto-convert ho jaata hai HumanMessage mein)

```python
response = model.invoke("What is the GIL in Python?")
print(response.content)
```

Yahan LangChain internally string ko `HumanMessage("What is the GIL in Python?")` mein convert kar deta hai — jaldi test karne ke liye convenient hai, but production code mein explicit message list use karna better practice hai (readability + control).

### Message list input

```python
from langchain_core.messages import SystemMessage, HumanMessage

response = model.invoke([
    SystemMessage(content="Answer in exactly one sentence."),
    HumanMessage(content="What is the GIL in Python?"),
])
print(response.content)
```

### Response object ko inspect karna

`.invoke()` ka return value sirf text nahi hai — ek poora `AIMessage` object hai jismein kaafi useful metadata hota hai:

```python
response = model.invoke("Hello!")

print(response.content)           # Actual text
print(response.response_metadata) # Provider-specific metadata (finish_reason, model name, etc.)
print(response.usage_metadata)    # Token usage info — cost calculate karne ke liye zaruri
# {
#   'input_tokens': 8,
#   'output_tokens': 12,
#   'total_tokens': 20
# }
print(response.id)                # Unique response ID (debugging/tracing ke liye)
```

> [!tip]
> `response.usage_metadata` production mein bahut kaam aata hai — cost tracking, rate-limiting, aur analytics dashboards banane ke liye. Isko ignore mat karo, especially jab agent loop mein multiple LLM calls chal rahe hon (agent ke andar cost silently 10x ho sakta hai).

---

## Streaming: `model.stream()`

Jab tum ChatGPT use karte ho aur response word-by-word type hote dikhta hai — wo **streaming** hai. Bina streaming ke, user ko poora response (jo 5-10 second bhi le sakta hai) ek saath, ek hi baar mein milta — jaise IRCTC ka page load hote hi poori ticket confirm ho jaaye, bina "processing..." dikhaye. Streaming UX ko fast **feel** karata hai, chahe total time same ho.

```python
from langchain_openai import ChatOpenAI

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)

# Tokens ko console pe stream karo, jaise-jaise aate hain
for chunk in model.stream("Write a haiku about Python programming."):
    print(chunk.content, end="", flush=True)

print()  # End mein newline
```

Har `chunk` ek `AIMessageChunk` hota hai — response ka ek chhota sa tukda.

### Streamed output ko collect karna

Agar tumhe streaming UX bhi chahiye AUR baad mein poora response bhi chahiye (jaise database mein save karne ke liye):

```python
full_response = ""
for chunk in model.stream("Explain generators in Python."):
    full_response += chunk.content
    print(chunk.content, end="", flush=True)

print()
print(f"\nFull response length: {len(full_response)} chars")
```

### Streaming metadata access karna

```python
from langchain_openai import ChatOpenAI

model = ChatOpenAI(model="gpt-4o-mini", temperature=0, streaming=True)

for chunk in model.stream("Explain async/await"):
    if chunk.content:
        print(chunk.content, end="", flush=True)
    if hasattr(chunk, "response_metadata") and chunk.response_metadata:
        print(f"\n[Metadata: {chunk.response_metadata}]")
```

### Node.js ke saath comparison

```javascript
// Node.js — OpenAI SDK
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
# Python — LangChain — kaafi cleaner API
for chunk in model.stream("Hello"):
    print(chunk.content, end="", flush=True)
```

> [!warning]
> Streaming ka structured output (`with_structured_output`, neeche dekho) ke saath use combine karna thoda tricky hota hai — kyunki JSON tab tak valid nahi hota jab tak poora nahi aa jaata. Agar tumhe structured data chahiye, generally poora response wait karo (`.invoke()`), agar tumhe sirf UX ke liye text dikhana hai toh `.stream()` use karo.

---

## Async: `model.ainvoke()` aur `model.astream()`

Node.js mein tumhara pura mental model hi async-first hai — event loop, `Promise.all()`, callbacks. Python mein `asyncio` uska equivalent hai, lekin Python **sync-first** language hai, isliye async explicitly opt-in karna padta hai. LangChain har method ka async version deta hai — bas prefix mein `a` laga do.

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

### Parallel async calls (`Promise.all()` jaisa)

Agar tumhe multiple independent LLM calls karne hain (jaise 3 alag questions), sequential `.invoke()` loop mein bahut time waste hoga — kyunki har call network I/O hai jismein CPU idle rehta hai. Async isko parallelize kar deta hai:

```python
import asyncio
from langchain_openai import ChatOpenAI

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)

async def main():
    # Teeno requests parallel mein fire karo
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

> [!info]
> **Node.js parallel:** `asyncio.gather()` = `Promise.all()`. `asyncio.run(main())` = top-level async function call. Python mein Node.js jaisa top-level `await` nahi milta (Jupyter notebooks ke alawa) — isliye `main()` function banake `asyncio.run()` se chalana padta hai.

### Production mein async kab use karo?

- **Agent/API servers** (FastAPI jaisa) mein hamesha `ainvoke`/`astream` use karo — isse ek hi server multiple users ko concurrently serve kar sakta hai.
- **Batch scripts / one-off analysis** mein sync `.invoke()` bhi chalega, lekin agar 100+ calls karne hain, async se time drastically kam ho jaata hai.

---

## Model Parameters

### Temperature — randomness control

`temperature` decide karta hai model kitna "predictable" ya kitna "creative" hoga. Socho Swiggy ka recommendation engine: `temperature=0` matlab wahi restaurant dikhao jo hamesha best-rated hai (deterministic), `temperature=0.9` matlab thoda variety/surprise bhi dikhao.

```python
# Deterministic — same input, hamesha (lagbhag) same output
precise_model = ChatOpenAI(model="gpt-4o-mini", temperature=0)

# Creative — har baar alag output
creative_model = ChatOpenAI(model="gpt-4o-mini", temperature=0.9)

prompt = "Write a one-line joke about Python."

# Creative model ko 3 baar chalao — teeno alag jokes milenge
for i in range(3):
    response = creative_model.invoke(prompt)
    print(f"Attempt {i+1}: {response.content}")
```

**Kab kya use karo:**

| Use case | Temperature |
|---|---|
| Data extraction, classification, structured output | `0` |
| Code generation | `0` - `0.3` |
| Chatbot / general conversation | `0.5` - `0.7` |
| Creative writing, brainstorming, marketing copy | `0.7` - `1.0` |

> [!warning]
> `temperature=0` ka matlab "100% deterministic" nahi hota — provider-side infrastructure (GPU batching, floating point non-determinism) ki wajah se thoda variation aa sakta hai. Agar tumhe **guaranteed** same output chahiye har baar, use `with_structured_output()` ya seed parameters (kuch providers support karte hain), aur idempotency apne application layer mein handle karo.

### Common parameters across providers

```python
model = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0,          # 0.0 se 2.0 tak
    max_tokens=500,         # Max output length (tokens mein)
    top_p=1.0,              # Nucleus sampling — kitna probability mass consider karna hai
    frequency_penalty=0.0,  # Repeated tokens ko penalize karo
    presence_penalty=0.0,   # Already-present tokens ko penalize karo
    timeout=30,             # Seconds
    max_retries=2,          # Transient errors pe automatic retry
)
```

| Parameter | Kya karta hai | Typical range |
|---|---|---|
| `temperature` | Randomness/creativity control | 0 - 2.0 |
| `max_tokens` | Response ki max length limit | Model-dependent (e.g. 4096, 8192) |
| `top_p` | Alternative randomness control (nucleus sampling) | 0 - 1.0 |
| `timeout` | Kitna wait karna hai response ke liye | 10 - 60 sec (use-case dependent) |
| `max_retries` | Rate-limit/network error pe kitni baar retry | 2 - 5 |

> [!tip]
> `temperature` aur `top_p` dono ek saath change mat karo — dono randomness control karte hain, aur combine karne se behavior unpredictable ho jaata hai. Ek choose karo aur usी ko tune karo.

### Per-call parameters override karna: `.bind()`

Kabhi kabhi tumhe same model object se, alag-alag calls ke liye alag parameters chahiye hote hain — bina naya object banaye. `.bind()` iske liye hai:

```python
model = ChatOpenAI(model="gpt-4o-mini", temperature=0)

# Naya "variant" banao different temperature ke saath — original model MUTATE nahi hota
creative = model.bind(temperature=0.9)

response1 = model.invoke("Tell me a joke.")      # temperature=0
response2 = creative.invoke("Tell me a joke.")   # temperature=0.9
```

`.bind()` ka concept baad mein tools attach karne ke liye bhi use hoga (Chapter 07), isliye ye pattern yaad rakhna.

---

## Structured Output with Pydantic

### Kyun zaruri hai?

Agar tumne kabhi LLM se "please return valid JSON" bolke prompt likha hai, tumko pata hoga ki model kabhi extra text add kar deta hai, kabhi trailing comma daal deta hai, kabhi keys ka naam badal deta hai. Ye production mein bahut fragile approach hai — jaise Swiggy agar apna order confirmation kabhi JSON, kabhi plain text, kabhi XML mein bhejta rahe, backend crash ho jaayega.

Modern LangChain **structured output** deta hai — model ki native **function-calling** capability use karke, jisse response guaranteed ek fixed schema follow karta hai.

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

# Structured output model banao
structured_model = model.with_structured_output(PersonInfo)

result = structured_model.invoke(
    "Extract info: John is a 30-year-old software engineer skilled in Python, TypeScript, and Go."
)

print(type(result))        # <class 'PersonInfo'>
print(result.name)         # "John"
print(result.age)          # 30
print(result.skills)       # ["Python", "TypeScript", "Go"]
print(result.model_dump()) # dict mein convert karo
```

### Structured output kyun use karo?

1. **Type safety** — Pydantic response ko validate karta hai; galat type aaye toh error milega, silent bug nahi
2. **No prompt engineering hacks** — model ko "return JSON only, no markdown" jaisi baatein manually likhne ki zarurat nahi
3. **Automatic retries** — kai integrations mein parsing fail hone pe automatically retry hota hai
4. **Cross-provider** — OpenAI, Anthropic, dono is API ko support karte hain (implementation neeche alag hai, but tumhara code same rehta hai)

### Chains ke saath structured output

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

> [!info]
> Ye `prompt | structured_model` wala pipe syntax **LCEL** (LangChain Expression Language) hai — is course ke Chapter 05 mein detail mein cover hoga. Abhi ke liye bas samajh lo: `|` ka matlab "left ka output, right ka input ban jaata hai" — Unix pipes jaisa.

> [!warning]
> Agent building mein structured output bahut critical hai — jab tumhara agent kisi tool ko call karega ya kisi doosre agent ko data pass karega, tumhe guaranteed schema chahiye hoga. Chapter 07 (Tools) aur Chapter 08 (First Agent) mein iski asli power dikhegi.

---

## Token Counting aur Cost Awareness

Production mein LLM calls **paise lagte hain** — har token ka cost hai. Isliye cost visibility rakhna utna hi important hai jitna Swiggy/Zomato ke liye delivery cost track karna.

### Response se usage nikalna

```python
from langchain_openai import ChatOpenAI

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)
response = model.invoke("Explain the difference between lists and tuples in Python.")

usage = response.usage_metadata
print(f"Input tokens:  {usage['input_tokens']}")
print(f"Output tokens: {usage['output_tokens']}")
print(f"Total tokens:  {usage['total_tokens']}")
```

### Bhejne se pehle tokens estimate karna

Bada prompt bhejne se pehle andaza lagana useful hai — especially jab tumhe context window limit ka dhyan rakhna ho:

```python
import tiktoken

def count_tokens(text: str, model: str = "gpt-4o-mini") -> int:
    """OpenAI models ke liye tiktoken se tokens count karo."""
    encoding = tiktoken.encoding_for_model(model)
    return len(encoding.encode(text))

prompt = "Explain Python generators in detail with examples."
print(f"Estimated input tokens: {count_tokens(prompt)}")
```

### Cost tracking helper

```python
# Approximate pricing per 1M tokens (production mein hamesha current pricing check karo!)
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
    """USD mein approximate cost estimate karo."""
    prices = PRICING.get(model, PRICING["gpt-4o-mini"])
    cost = (
        (input_tokens / 1_000_000) * prices["input"]
        + (output_tokens / 1_000_000) * prices["output"]
    )
    return round(cost, 6)

usage = response.usage_metadata
cost = estimate_cost(usage["input_tokens"], usage["output_tokens"])
print(f"Estimated cost: ${cost}")
```

> [!warning]
> Agent loops mein (jab model tools call karta hai, phir dobara sochta hai, phir wapas call karta hai) cost **silently multiply** ho sakta hai. Ek "simple" agent task 10-15 LLM calls kar sakta hai. Production mein hamesha per-request ya per-session cost cap set karo, aur Chapter 10 (Callbacks & Tracing) mein hum dekhenge kaise ye automatically track karte hain (LangSmith ke through).

---

## Batch Processing

Agar tumhe multiple independent prompts bhejne hain (jaise 100 products ka description generate karna), ek-ek karke `.invoke()` call karne se zyada efficient hai `.batch()` — ye requests ko concurrently bhejta hai:

```python
from langchain_openai import ChatOpenAI

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)

questions = [
    "What is a list in Python?",
    "What is a dict in Python?",
    "What is a set in Python?",
]

# Batch invoke — requests concurrently bhejta hai backend mein
responses = model.batch(questions)

for question, response in zip(questions, responses):
    print(f"Q: {question}")
    print(f"A: {response.content[:100]}...")
    print()
```

### Concurrency limit ke saath batch (rate limits avoid karne ke liye)

```python
from langchain_openai import ChatOpenAI

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)

# Max 5 concurrent requests — provider ke rate limit se bachne ke liye
responses = model.batch(
    ["Explain concept " + str(i) for i in range(20)],
    config={"max_concurrency": 5},
)
```

> [!tip]
> Real-world mein providers ke paas rate limits hote hain (requests-per-minute, tokens-per-minute). `max_concurrency` set karna zaruri hai warna tumhe `429 Too Many Requests` errors milenge. Production mein isko tumhare provider tier ke hisaab se tune karo.

---

## Sab kuch ek saath: Terminal Chatbot

Ab tak jo seekha, usse ek chhota multi-turn chatbot banate hain jo terminal mein stream hoke response deta hai:

```python
"""
Complete example: terminal mein ek simple multi-turn chatbot.
"""
from dotenv import load_dotenv
load_dotenv()

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

model = ChatOpenAI(model="gpt-4o-mini", temperature=0.7)

# Conversation history yahan maintain hogi
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

    # Response ko stream karo
    print("\nTutor: ", end="")
    full_response = ""
    for chunk in model.stream(messages):
        print(chunk.content, end="", flush=True)
        full_response += chunk.content
    print()

    # AI ka response history mein add karo agle turn ke liye
    messages.append(AIMessage(content=full_response))
```

Notice karo: har loop iteration mein poora `messages` array bheja ja raha hai — kyunki jaisa upar bataya, LLM calls **stateless** hoti hain. Ye pattern hi LangGraph ke `state` concept (Chapter 12+) ka foundation hai.

---

## Common Mistakes & Gotchas

| Mistake | Kya hota hai | Fix |
|---|---|---|
| Anthropic model mein `max_tokens` na dena | `ValidationError` | Hamesha `max_tokens` explicitly pass karo Anthropic ke saath |
| Har baar naya `ChatOpenAI()` object banana loop ke andar | Har call pe naya connection/client overhead | Model ko ek baar init karo, reuse karo |
| Streaming + structured output ek saath expect karna without design | Partial/invalid JSON errors | `.invoke()` use karo jab structured output chahiye, `.stream()` sirf plain text ke liye |
| Message history ko infinitely grow hone dena | Context window overflow, cost badhna | Old messages trim/summarize karo (Chapter 06 — Memory) |
| `temperature=0` ko "100% deterministic" maan lena | Kabhi kabhi output thoda differ karega | Idempotency application layer mein handle karo, blind trust mat karo |
| Sync `.invoke()` use karna high-concurrency API server mein | Server slow ho jaata hai under load | `ainvoke`/`astream` use karo FastAPI jaise async frameworks mein |

---

## Practice Exercises

1. **Model comparison** — Same prompt `ChatOpenAI` (gpt-4o-mini) aur `ChatAnthropic` (claude-sonnet-4) dono ko bhejo. Dono ka response aur `usage_metadata` print karo. Kaunsa model zyada tokens use karta hai? Kaunsa fast respond karta hai? (`time.time()` use karo measure karne ke liye.)

2. **Temperature experiment** — Ek creative prompt jaise "Write a tagline for a Python course" ko temperature=0 pe 5 baar aur temperature=1.0 pe 5 baar invoke karo. Dono set ke results print karo. Har temperature pe kitne **unique** responses mile?

3. **Streaming progress indicator** — Ek script likho jo streaming ke saath character count real-time update kare (`\r` use karke same line pe update ho):

```python
import sys
total = 0
for chunk in model.stream("Write a long explanation of Python decorators."):
    total += len(chunk.content)
    sys.stdout.write(f"\rReceiving... {total} chars")
    sys.stdout.flush()
print(f"\nDone! Total: {total} characters")
```

4. **Async parallel benchmark** — 10 alag questions `asyncio.gather()` se parallel bhejo aur total time measure karo. Phir wahi 10 questions sequentially `for` loop mein `.invoke()` se bhejo. Compare karo — parallel kitna faster hai?

5. **Structured output extractor** — Ek `Recipe` Pydantic model banao (name, ingredients list, steps list, prep_time, difficulty). `with_structured_output()` use karke is text se recipe extract karo: "To make pasta carbonara, you need spaghetti, eggs, bacon, parmesan, and pepper. Cook the pasta, fry the bacon, mix eggs with cheese, combine everything. Takes 20 minutes. Easy to make."

6. **Cost tracker class** — Ek `CostTracker` class banao jo chat model ko wrap kare. Har call track kare token usage aur running cost:

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
        # Yahan cost calculation add karo (estimate_cost function use karo)
```

7. **Multi-turn bot with structured memory** — Upar wale chatbot ko extend karo:
   - Sirf last 10 messages (plus system message) rakho, taaki token limit na cross ho
   - `with_structured_output()` use karke conversation se key facts extract karo
   - In facts ko alag se store karo aur context ki tarah inject karo
   - Exit hone pe conversation ko JSON file mein save karo

---

## Key Takeaways

- **ChatModel hi aaj ka standard hai** — modern LLMs (GPT-4o, Claude, Gemini) chat-tuned hain, isliye LangChain mein `ChatOpenAI`, `ChatAnthropic` jaisi classes use karo, legacy `LLM` class nahi.
- **`BaseChatModel` interface** ki wajah se providers swap karna trivial hai — OpenAI, Anthropic, ya local Ollama, sab same `.invoke()`, `.stream()`, `.batch()` methods share karte hain.
- **Messages teen role rakhte hain** — `SystemMessage` (persona/instructions), `HumanMessage` (user input), `AIMessage` (model ke pichhle responses, multi-turn context ke liye).
- **`.invoke()` universal entry point hai** — string ya messages list dono accept karta hai, `AIMessage` return karta hai jismein `content`, `usage_metadata`, `response_metadata` sab milta hai.
- **LLM calls stateless hain** — memory manually manage karni padti hai, poora `messages` array har call ke saath bhejna padta hai.
- **Streaming (`.stream()`)** UX ko fast feel karata hai — chunks ko `AIMessageChunk` ki tarah receive karo.
- **Async (`ainvoke`/`astream`)** production API servers ke liye zaruri hai — parallel calls se latency drastically kam hota hai.
- **`with_structured_output()`** guaranteed, type-safe, schema-validated response deta hai — agent/tool-calling ki foundation hai.
- **Temperature** creativity control karta hai — extraction/classification ke liye `0`, creative tasks ke liye `0.7+`.
- **Token usage aur cost track karna** production-critical habit hai — agent loops mein cost silently multiply ho sakta hai.
- **`.bind()`** se ek model object se different parameter variants bana sakte ho bina naya object banaye — same pattern baad mein tools attach karne ke liye bhi use hoga.
