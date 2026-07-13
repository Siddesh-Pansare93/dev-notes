# Tools and Function Calling

🟡 Intermediate

## Kya hota hai ek "Tool"?

Socho ek second ke liye — tumne Swiggy pe order kiya, aur customer support wale bande se poocha "mera order kahan hai?". Ab wo insaan khud track nahi karta rehta — wo apne screen pe ek "Track Order" button dabata hai, jo backend se live location fetch karta hai, aur phir wo tumhe answer deta hai. Wo insaan **reasoning** kar raha hai (samajh raha hai ki tumhe kya chahiye), lekin actual kaam ek **tool** (tracking system) kar raha hai.

LLM bilkul yehi karta hai jab usko **tools** diye jaate hain. Ek LLM apne aap mein sirf ek text predictor hai — usko na toh pata hai abhi time kya hai, na wo internet search kar sakta hai, na wo tumhare database se data nikaal sakta hai. Ye sab "duniya se connect hone wali cheezein" LLM ko **tools** ke through milti hain.

> **Tool = ek function jise LLM khud decide karke call kar sakta hai**, jab usse lage ki apna kaam (user ka sawaal answer karna) poora karne ke liye usse ye function chalana chahiye.

Formal definition: Ek tool teen cheezon ka combination hota hai:
1. **Name** — function ka naam (LLM isi naam se usko "call" karta hai)
2. **Description** — ek explanation ki ye tool kya karta hai aur kab use karna chahiye (ye docstring se aata hai)
3. **Input schema** — kaunse parameters chahiye, kis type ke, kya required hai kya optional

LLM khud tool ka code nahi chalata — wo sirf itna bolta hai *"mujhe `get_weather` tool chahiye, aur usme `city="Mumbai"` pass karo"*. Actual Python function tumhara application code chalata hai, result wapas LLM ko dikhata hai, aur LLM us result ke base pe final answer banata hai.

### Kyun zaruri hai agent banane ke liye?

Ek "agent" basically hai — **LLM + Tools + ek loop jo tabtak chalta hai jabtak final answer na mil jaaye**. Bina tools ke, LLM sirf training data pe based guesses de sakta hai. Tools ke saath:

- LLM **real-time data** access kar sakta hai (aaj ka weather, live stock price, database record)
- LLM **actions** perform kar sakta hai (email bhejna, order place karna, calendar pe event daalna)
- LLM **precise calculations** kar sakta hai (LLM khud maths mein kaccha hota hai — calculator tool use karna better hai)
- LLM apne **hallucination** ko kam kar sakta hai kyunki wo guess karne ke bajaye actual source se data laata hai

Is chapter mein hum seekhenge:
1. `@tool` decorator se tools kaise banate hain
2. Pydantic schemas se input validate kaise karte hain
3. Function/tool calling andar se kaise kaam karta hai (LLM aur backend ke beech ka protocol)
4. Model ke saath tools ko `bind_tools()` se jodna
5. Errors handle karna aur production-grade considerations

---

## `@tool` Decorator — Sabse Simple Tarika

LangChain mein kisi bhi normal Python function ko tool banane ka fastest way hai `@tool` decorator lagana.

```python
from langchain_core.tools import tool

@tool
def get_word_count(text: str) -> int:
    """Count the number of words in a text. Use this when you need to know how many words are in a piece of text."""
    return len(text.split())

# Decorator lagate hi ye function ek "tool object" ban jaata hai
print(get_word_count.name)         # "get_word_count"
print(get_word_count.description)  # docstring hi description ban jaati hai
print(get_word_count.args_schema.model_json_schema())  # auto-generated input schema

# Tool ko directly bhi invoke kar sakte ho (testing ke liye)
result = get_word_count.invoke("Hello world from Python")
print(result)  # 4
```

> [!warning]
> **Docstring hi sab kuch hai.** LLM tumhara Python code kabhi nahi padhta — usko sirf `name`, `description` (docstring), aur `args_schema` (JSON schema) dikhaya jaata hai. Agar docstring vague hai jaise `"""Does stuff."""`, toh LLM ko kabhi samajh nahi aayega ki ye tool kab use karna hai — result: agent galat tool choose karega ya tool ko bilkul use hi nahi karega.

Ek acchi docstring likhne ka formula:
```
"""<Ek line mein tool kya karta hai>.
Use this when <specific situation jab ye tool use karna chahiye>."""
```

Zomato ke example se socho — agar tumhare paas do tools hain `search_restaurants` aur `track_order`, aur dono ki description vague hai jaise `"""Handles restaurant stuff."""`, toh LLM confuse ho jaayega ki order track karne ke liye kaunsa tool chalayein. Specific descriptions se ye ambiguity khatam ho jaati hai.

### Multiple parameters with type hints

Python type hints automatically JSON Schema mein convert ho jaate hain — isiliye type hints **required** hain, optional nahi:

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

Notice karo — jab function ke multiple arguments hote hain, `.invoke()` ko ek **dictionary** deni padti hai (single argument ho toh direct value chalta hai, jaise upar wale `get_word_count` example mein).

---

## Pydantic Schema — Jab Type Hints Kaafi Nahi Hain

`@tool` decorator apne aap type hints se schema bana leta hai, lekin production mein tumhe zyada control chahiye hota hai — jaise:
- Field ka apna description dena (LLM ko extra context)
- Default values set karna
- Validation rules (min/max, regex, enum)

Iske liye Pydantic `BaseModel` use karke explicit schema define karte hain aur `args_schema` parameter se attach karte hain:

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

# LLM ko ye poora, detailed schema dikhta hai
print(web_search.args_schema.model_json_schema())
```

Iska output kuch aisa dikhega:

```json
{
  "title": "SearchInput",
  "description": "Input for the search tool.",
  "type": "object",
  "properties": {
    "query": {"description": "The search query string", "title": "Query", "type": "string"},
    "max_results": {"default": 5, "description": "Maximum number of results to return", "title": "Max Results", "type": "integer"},
    "language": {"default": "en", "description": "Language code (e.g., 'en', 'es', 'fr')", "title": "Language", "type": "string"}
  },
  "required": ["query"]
}
```

Ye exact JSON schema hi LLM ko provider ke API call mein bhejta hai — matlab jitna better tumhara `Field(description=...)`, utna better LLM samajhta hai ki kya value bhejni hai.

> [!tip]
> IRCTC ka example socho — agar tumhara `book_ticket` tool hai jisme `travel_class` field hai, toh `Field(description="Travel class: SL, 3A, 2A, 1A, or CC")` likhna bahut zaruri hai. Bina description ke LLM shayad "Sleeper" ya "sleeper class" jaisa random string bhej de, jo tumhara backend expect nahi karta.

### Pydantic v2 field validators (advanced)

Agar tumhe strict validation chahiye (jaise ek number ek range mein ho), Pydantic validators bhi laga sakte ho:

```python
from pydantic import BaseModel, Field, field_validator

class OrderInput(BaseModel):
    """Input schema for placing a food order."""
    item: str = Field(description="Name of the food item to order")
    quantity: int = Field(description="How many units to order", ge=1, le=20)

    @field_validator("item")
    @classmethod
    def item_must_not_be_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("item cannot be empty")
        return v

@tool(args_schema=OrderInput)
def place_order(item: str, quantity: int) -> str:
    """Place a food order. Use this only after the user confirms the item and quantity."""
    return f"Order placed: {quantity} x {item}"
```

Agar LLM koi invalid value bhejta hai (jaise `quantity=100`), Pydantic validation error raise karega, aur ye error tool call fail hone ki wajah bloke ga — jisse tum `handle_tool_error` (aage discuss karenge) se gracefully handle kar sakte ho.

---

## StructuredTool aur BaseTool — Decorator Ke Peeche Kya Hai

`@tool` decorator ek shortcut hai. Andar se, har tool `BaseTool` class ka instance hota hai. Zyada control chahiye toh `StructuredTool.from_function()` bhi use kar sakte ho — same result, thoda zyada explicit:

```python
from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field

class MultiplyInput(BaseModel):
    a: int = Field(description="First number")
    b: int = Field(description="Second number")

def multiply_fn(a: int, b: int) -> int:
    return a * b

multiply_tool = StructuredTool.from_function(
    func=multiply_fn,
    name="multiply",
    description="Multiply two integers together.",
    args_schema=MultiplyInput,
)
```

Real projects mein zyadatar `@tool` decorator hi kaafi hota hai — `StructuredTool.from_function` tab use karo jab tumhare paas already existing functions ho (jinko decorate nahi kar sakte, jaise third-party library ka function) aur unko tool banana ho.

### Async tools

Production agents mein I/O-bound kaam (API calls, DB queries) ke liye async tools zaruri hote hain, warna agent slow ho jaata hai:

```python
import httpx
from langchain_core.tools import tool

@tool
async def fetch_url(url: str) -> str:
    """Fetch the content of a URL. Use this when you need to read a web page."""
    async with httpx.AsyncClient() as client:
        response = await client.get(url, follow_redirects=True)
        return response.text[:1000]  # First 1000 chars
```

Async tools ko `await tool.ainvoke(...)` se call karte hain (sync context mein `tool.invoke(...)` bhi kaam karega, LangChain internally handle kar lega).

---

## Function/Tool Calling Andar Se Kaise Kaam Karta Hai

Ye samajhna bahut zaruri hai — kyunki jitne bhi "agent frameworks" hain (LangChain, LangGraph, ya koi bhi), sab isi ek mechanism ke upar bane hain.

### Step by step protocol

Socho tumne Zomato app pe order diya. Kya hota hai backend mein?

1. **Tumhara request** app tak jaata hai
2. **App decide karta hai** kaunsa restaurant, kaunsa rider available hai
3. **Rider ko task assign hota hai** (pickup + delivery)
4. **Rider kaam karta hai** aur result (delivered order) wapas app ko batata hai
5. **App tumhe final confirmation** deta hai

Function calling mein exactly yehi hota hai:

```
┌─────────────┐                                    ┌─────────────┐
│  Tumhara    │  1. Prompt + Tool Schemas bhejo    │             │
│  Application│ ─────────────────────────────────► │  LLM API    │
│  (Python)   │                                    │  (OpenAI/   │
│             │  2. LLM decide karta hai: "mujhe   │  Anthropic) │
│             │     tool X chahiye, args Y ke saath"│             │
│             │ ◄───────────────────────────────── │             │
│             │                                    └─────────────┘
│  3. Tumhara code actual   │
│     Python function chalata hai
│     (tool X ko args Y ke saath)
│             │
│  4. Result ko wapas conversation
│     mein append karta hai (ToolMessage)
│             │
│  5. Poora conversation dobara LLM ko bhejo       ┌─────────────┐
│             │ ─────────────────────────────────► │  LLM API    │
│             │  6. Ab LLM final answer deta hai    │             │
│             │ ◄───────────────────────────────── │             │
└─────────────┘                                    └─────────────┘
```

**Key insight:** LLM khud kabhi bhi code execute nahi karta. Wo sirf ek **structured JSON output** generate karta hai jisme bataya hota hai "kaunsa tool" aur "kaunse arguments". Ye JSON parse karna aur actual function chalana — ye zimmedari tumhare application code (LangChain) ki hai.

Modern LLMs (GPT-4, Claude, Gemini) ko training ke time hi is JSON format mein output dene ka special tareeka sikhaya gaya hai — isliye ye "native function calling" kehlata hai (purane zamane mein log prompt engineering se LLM ko force karte the ki wo JSON output de, jo unreliable tha).

### Ek real example — request aur response dono dekho

```python
from dotenv import load_dotenv
load_dotenv()

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

# Step 1: User ka sawaal
response = model_with_tools.invoke("What is 3 + 5, and what is 7 * 8?")

# Step 2: Model ne final answer NAHI diya -- usne "tool_calls" wapas kiye
print(response.tool_calls)
# [
#   {'name': 'add', 'args': {'a': 3, 'b': 5}, 'id': 'call_abc123'},
#   {'name': 'multiply', 'args': {'a': 7, 'b': 8}, 'id': 'call_def456'},
# ]
print(response.content)  # Zyadatar khaali string hoti hai jab tool_calls hote hain

# Step 3: Humara code actual functions chalata hai
messages = [HumanMessage(content="What is 3 + 5, and what is 7 * 8?"), response]

for tc in response.tool_calls:
    tool_result = tool_map[tc["name"]].invoke(tc["args"])
    # Step 4: Result ko ToolMessage banake wapas conversation mein daalo
    messages.append(ToolMessage(content=str(tool_result), tool_call_id=tc["id"]))

# Step 5: Poora updated conversation LLM ko wapas bhejo
final_response = model_with_tools.invoke(messages)
print(final_response.content)
# "3 + 5 = 8, and 7 * 8 = 56."
```

Kuch cheezein dhyan se dekho:
- `response.tool_calls` ek list hai — LLM ek saath **multiple tools** call kar sakta hai (parallel tool calling)
- Har `tool_call` ka apna unique `id` hota hai — jab tum result wapas bhejte ho (`ToolMessage`), tumhe wahi `tool_call_id` use karna hota hai, taaki LLM ko pata chale ki kaunsa result kaunse call ka hai
- `ToolMessage` ek special message type hai — `HumanMessage`, `AIMessage` ke jaisa hi, lekin specifically tool results ke liye

> [!info]
> Ye poora "state machine" — request bhejo, tool_calls dekho, execute karo, result wapas bhejo — yehi LangGraph mein `ToolNode` aur conditional edges se automate hota hai. Wo hum chapter 19 (Tools in Graphs) mein detail mein dekhenge. Abhi ke liye ye manual loop samajhna zaruri hai kyunki yehi foundation hai.

### Poora Agent Loop (bina AgentExecutor ke)

```python
from langchain_core.messages import HumanMessage, ToolMessage

def run_agent(user_message: str, tools: list, model) -> str:
    """Simple agent loop that calls tools until the model has a final answer."""
    model_with_tools = model.bind_tools(tools)
    tool_map = {t.name: t for t in tools}
    messages = [HumanMessage(content=user_message)]

    for _ in range(10):  # Safety limit -- max iterations
        response = model_with_tools.invoke(messages)
        messages.append(response)

        # Agar tool_calls empty hai, matlab LLM final answer de chuka hai
        if not response.tool_calls:
            return response.content

        # Har tool call ko execute karo
        for tc in response.tool_calls:
            print(f"  Calling {tc['name']}({tc['args']})")
            try:
                result = tool_map[tc["name"]].invoke(tc["args"])
            except Exception as e:
                result = f"Error: {e}"
            messages.append(ToolMessage(content=str(result), tool_call_id=tc["id"]))

    return "Agent reached maximum iterations without a final answer."

# Usage
from langchain_openai import ChatOpenAI

@tool
def get_current_time() -> str:
    """Get the current date and time."""
    from datetime import datetime
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

@tool
def calculate(expression: str) -> str:
    """Evaluate a mathematical expression like '2 + 2' or 'pow(2, 10)'."""
    try:
        result = eval(expression, {"__builtins__": {}}, {"pow": pow, "abs": abs, "round": round})
        return str(result)
    except Exception as e:
        return f"Error evaluating '{expression}': {e}"

answer = run_agent(
    "What time is it and what is 2^10?",
    [get_current_time, calculate],
    ChatOpenAI(model="gpt-4o-mini", temperature=0),
)
print(answer)
```

Yehi wo **loop pattern** hai jo har agent framework ke core mein hota hai — chahe wo LangChain ka `AgentExecutor` ho, LangGraph ka `ToolNode` ho, ya OpenAI ka Assistants API. Sab ka logic same hai: *"Model ko poocho → agar tool chahiye toh chalao → result wapas do → repeat karo jabtak final answer na mile."*

---

## `bind_tools()` — Model ko Tools Ke Saath Jodna

`bind_tools()` ek chhota lekin critical step hai. Ye kya karta hai:

```python
model = ChatOpenAI(model="gpt-4o-mini", temperature=0)
model_with_tools = model.bind_tools(tools)
```

Andar se ye:
1. Har tool ke `name`, `description`, aur `args_schema` (JSON schema) ko extract karta hai
2. Inhe provider ke expected format mein convert karta hai (OpenAI ka format, Anthropic ka format — sab thoda alag hote hain, LangChain ye complexity chhupa deta hai)
3. Ek **naya model object** return karta hai jo har API call ke saath ye tool definitions bhi bhejta hai

> [!warning]
> `bind_tools()` original `model` ko modify **nahi** karta — ye ek naya bound model return karta hai. Agar tum galti se `model.bind_tools(tools)` call karke result ko ignore kar do, toh original `model` variable ab bhi tools ke bina hi hai. Hamesha return value ko store karo: `model_with_tools = model.bind_tools(tools)`.

### `tool_choice` se control karna

Kabhi kabhi tumhe chahiye hota hai ki LLM **hamesha** ek specific tool use kare, ya **koi bhi tool na** use kare. Iske liye `tool_choice` parameter hai:

```python
# LLM ko force karo ki wo hamesha koi tool use kare (jo bhi sahi lage)
model_with_tools = model.bind_tools(tools, tool_choice="required")

# LLM ko force karo ki wo ek specific tool hi use kare
model_with_tools = model.bind_tools(tools, tool_choice="get_current_time")

# Default: LLM khud decide karta hai (tool use kare ya seedha jawab de)
model_with_tools = model.bind_tools(tools, tool_choice="auto")
```

> [!info]
> `tool_choice` support provider-dependent hai — OpenAI models isko achhe se support karte hain, kuch dusre providers mein availability alag ho sakti hai. Production mein use karne se pehle apne model provider ki docs check kar lo.

### Parallel tool calls control karna

Kuch models (jaise OpenAI ke) ek saath multiple tools call kar sakte hain (jaisa humne `add` aur `multiply` example mein dekha). Agar tumhe sequential calls chahiye (ek tool ka result dusre mein use karna hai), toh isse disable kar sakte ho:

```python
model_with_tools = model.bind_tools(tools, parallel_tool_calls=False)
```

---

## Built-in aur Community Tools

Har baar khud se tool likhna zaruri nahi — LangChain community ne kaafi common tools already bana ke rakhe hain.

### DuckDuckGo Search (bina API key ke)

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
from langchain_experimental.tools import PythonREPLTool

python_tool = PythonREPLTool()
result = python_tool.invoke("print(sum(range(1, 101)))")
print(result)  # "5050"
```

> [!warning]
> `PythonREPLTool` production mein bina sandboxing ke istemaal mat karo — LLM-generated code ko directly execute karna security risk hai (arbitrary code execution). Production mein isolated containers, `vercel-sandbox`, ya `E2B` jaise sandboxed environments use karo.

### Requests (HTTP calls)

```python
from langchain_community.tools import RequestsGetTool
from langchain_community.utilities import TextRequestsWrapper

requests_tool = RequestsGetTool(
    requests_wrapper=TextRequestsWrapper(),
    allow_dangerous_requests=True,  # explicitly opt-in karna padta hai
)
```

`allow_dangerous_requests=True` isliye explicit hai kyunki HTTP requests SSRF (Server-Side Request Forgery) jaise security issues create kar sakti hain agar user input directly URL mein chala jaaye.

---

## Error Handling — Production Ke Liye Zaruri

Real world mein tools fail hote hain — API down ho sakta hai, network timeout ho sakta hai, invalid input aa sakta hai. Agar tool crash ho jaaye aur poora agent crash ho jaaye, wo bura user experience hai.

### `ToolException` aur `handle_tool_error`

```python
from langchain_core.tools import tool, ToolException

@tool
def divide(a: float, b: float) -> float:
    """Divide two numbers. Use this for division calculations."""
    if b == 0:
        raise ToolException("Cannot divide by zero. Please provide a non-zero divisor.")
    return a / b

# Option 1: Error message ko seedha agent ko wapas bhej do (crash nahi hoga)
divide.handle_tool_error = True

# Option 2: Custom error message banao
divide.handle_tool_error = (
    lambda e: f"Tool error: {str(e)}. Please try a different approach."
)
```

Jab `handle_tool_error = True` hota hai, tool crash hone ke bajaye error message ko `ToolMessage` ke content mein daal deta hai — LLM us error ko dekhkar apna approach badal sakta hai (jaise: doosra tool try karna, ya user se clarification maangna).

### Retry logic with exponential backoff

```python
import time
from langchain_core.tools import tool

@tool
def reliable_search(query: str) -> str:
    """Search with automatic retry on failure."""
    max_retries = 3
    for attempt in range(max_retries):
        try:
            # Simulated flaky API call
            return f"Results for: {query}"
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)  # 1s, 2s, 4s...
                continue
            return f"Search failed after {max_retries} attempts: {e}"
```

> [!tip]
> Production mein retry logic ke liye `tenacity` library use karna better hai (`@retry` decorator) — khud se exponential backoff likhna zaruri nahi, aur tenacity zyada configurable hai (max attempts, jitter, specific exceptions pe retry, etc.).

---

## Common Mistakes Aur Gotchas

1. **Vague docstrings** — `"""Gets data."""` jaisi description se LLM confuse hoga ki kab use karna hai. Hamesha specific likho: kya karta hai + kab use karna hai.

2. **Return type string nahi rakhna** — LLM ko tool ka output text ke roop mein dikhta hai. Complex objects (jaise Pydantic models, custom classes) return karoge toh LLM confuse ho sakta hai. Best practice: `str` ya simple JSON-serializable output return karo.

3. **Similar naam wale tools** — agar `search` aur `search_v2` dono hain jinki description bhi similar hai, LLM randomly koi bhi choose kar sakta hai. Tool names aur descriptions clearly distinct rakho.

4. **`.invoke()` bhool jaana single-arg tools ke liye** — single parameter wale tool ko `.invoke("value")` se call kar sakte ho, lekin multi-parameter tools ke liye dictionary chahiye: `.invoke({"a": 1, "b": 2})`.

5. **`bind_tools()` ka result store na karna** — jaisa upar bataya gaya, `model.bind_tools(tools)` naya object return karta hai, original ko modify nahi karta.

6. **Tool mein `eval()` production mein use karna** — humare examples mein `eval()` dikhaya gaya hai simplicity ke liye, lekin production mein iski jagah `numexpr`, `simpleeval`, ya proper math parser use karo — `eval()` arbitrary code execution ka risk hai.

7. **Har tool call pe cost/latency bhool jaana** — har tool call ek extra round-trip hai LLM ko (request → tool_calls → execute → response → final answer = kam se kam 2 LLM calls). Agar agent 5 tools sequentially call kare, toh 6 LLM API calls ho sakte hain — cost aur latency dono badh jaati hai. Isliye tools ka design aisa rakho ki jitna zaroori data ek hi call mein mil jaaye.

8. **Sensitive tools (jaise payment, delete) ko bina confirmation ke auto-execute karna** — production mein destructive/risky tools (jaise `cancel_order`, `send_money`) ke liye human-in-the-loop confirmation zaroor rakho (LangGraph mein ye chapter 16 mein cover hoga).

---

## Recap Diagram

```
User Question
     │
     ▼
┌─────────────────────┐
│  model.bind_tools()  │◄── Tool schemas (name, description, args)
└─────────┬────────────┘
          │
          ▼
   LLM decides: tool call ya direct answer?
          │
   ┌──────┴───────┐
   │              │
tool_calls      content (final answer)
   │              │
   ▼              ▼
Execute tools    Return to user
   │
   ▼
ToolMessage(s) appended to conversation
   │
   ▼
Send back to LLM ──► repeat until final answer
```

---

## Key Takeaways

- **Tool** = ek Python function jise LLM khud decide karke call kar sakta hai — tool ka `name`, `description` (docstring), aur `args_schema` hi LLM ko dikhta hai, code nahi.
- `@tool` decorator sabse simple way hai tool banane ka — docstring specific aur clear likho, isi se LLM decide karta hai kab tool use karna hai.
- Complex/validated inputs ke liye Pydantic `BaseModel` + `Field(description=...)` use karke `args_schema` explicitly define karo.
- **Function calling** ka core protocol: LLM ko prompt + tool schemas bhejo → LLM `tool_calls` (JSON) return karta hai → tumhara code function execute karta hai → result `ToolMessage` bankar wapas conversation mein jaata hai → LLM final answer deta hai. LLM khud kabhi code execute nahi karta.
- `model.bind_tools(tools)` model ko tools ke saath jodta hai aur ek **naya** bound model object return karta hai — original model unchanged rehta hai.
- `tool_choice` se control kar sakte ho ki LLM tool use kare ya nahi (`"auto"`, `"required"`, ya specific tool name).
- Async tools (`async def` + `.ainvoke()`) I/O-heavy operations ke liye better performance dete hain.
- `ToolException` + `handle_tool_error = True` se tool failures ko gracefully handle karo — crash hone ke bajaye error message LLM ko wapas bhejo taaki wo alternative approach try kar sake.
- Production mein: docstrings specific rakho, `eval()` se bacho, destructive tools pe human confirmation rakho, aur cost/latency ka hisaab rakho kyunki har tool call ek extra LLM round-trip hai.
