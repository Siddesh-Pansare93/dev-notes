# Building Your First Agent

🟡 Intermediate

Ab tak humne dekha ki tools kaise banate hain — `@tool` decorator, Pydantic schemas, error handling, sab kuch. Lekin ek akela tool kuch nahi karta jab tak koi use **kab** call karna hai, **kis order mein** call karna hai, aur **result ka kya matlab hai** — yeh decide na kare. Woh decision-maker hi "agent" hai.

Is chapter mein hum poora agent **end-to-end assemble** karenge — jaise ek mechanic engine ke alag-alag parts (LLM, tools, prompt, executor) ko jodkar ek chalti hui gaadi banata hai. Hum dekhenge:

- **ReAct pattern** — agent reasoning aur acting ke beech switch kaise karta hai
- **`AgentExecutor`** — woh engine jo is reasoning loop ko actually chalata hai
- Ek **poora runnable example** — weather + calculator agent, saath mein uske reasoning steps ka trace

---

## Kya hota hai Agent? (Quick Recap)

Socho tum Swiggy par khana order karte ho aur customer support se poochte ho: *"Mera order kab tak aayega, aur agar late hua to refund kitna milega?"*

Ek **script** (chain) is tarah react karegi:
```
Step 1: order status check karo
Step 2: hamesha refund policy bata do
```
Chahe order time pe aa raha ho ya nahi — script dono steps blindly follow karegi.

Ek **agent** (jaise ek smart support executive) pehle *sochega*:
```
Thought: Pehle order status dekhna padega.
Action: check_order_status(order_id)
Observation: "Order 12 min late hai"

Thought: Order late hai, toh refund policy bhi check karni padegi.
Action: get_refund_policy("late_delivery")
Observation: "12+ min late => 20% cashback"

Thought: Ab dono jaankari mil gayi.
Final Answer: "Aapka order 12 min late hai, isliye aapko 20% cashback milega."
```

Yeh farak hi agent ka core idea hai — **fixed steps nahi, ek reasoning loop jo khud decide karta hai ki agla step kya hoga.**

> [!info]
> Agar tumne pichla chapter (Tools banana) skip kiya hai, pehle woh padho — is chapter mein hum maan kar chal rahe hain ki tumhe `@tool` decorator aur docstrings ka importance pata hai.

---

## The ReAct Pattern — Dil hai Agent Ka

**ReAct = Reasoning + Acting.** Yeh sabse zyada use hone wala agent pattern hai, aur isko samajhna zaruri hai kyunki `AgentExecutor` internally isi loop ko chalata hai.

ReAct loop ke 4 steps hain, jo repeat hote hain jab tak final answer nahi mil jata:

| Step | Kya hota hai | Example |
|---|---|---|
| **Thought** | LLM soch ke likhta hai — "ab mujhe kya karna chahiye?" | "Mujhe pehle Mumbai ka temperature chahiye." |
| **Action** | LLM decide karta hai kaunsa tool call karna hai, aur kya input dena hai | `get_weather("Mumbai")` |
| **Observation** | Tool ka output wapas LLM ko dikhaya jata hai | "Mumbai: 32°C, sunny" |
| **Repeat / Final Answer** | Agar aur jaankari chahiye to phir se Thought → Action → Observation, warna final answer de do | "Mumbai mein 32°C dhoop hai." |

```
Thought: Mujhe Tokyo ki population pata karni hai.
Action: search("population of Tokyo 2024")
Observation: Tokyo ki population lagbhag 1.4 crore hai.
Thought: Mere paas ab jawab hai.
Final Answer: Tokyo ki population lagbhag 1.4 crore hai.
```

**Kyun zaruri hai yeh pattern?** Kyunki isse LLM ke "andar ki soch" (thought) aur "bahar ki action" (tool call) dono explicit ho jaate hain. Isse hume debug karne ka mauka milta hai — jaise IRCTC ka tatkal booking status page dikhata hai "Payment initiated → Payment confirmed → Ticket booked" — har step transparent hota hai, black box nahi.

> [!tip]
> Jab bhi tumhara agent galat jawab de, sabse pehle `verbose=True` laga kar uska Thought/Action/Observation trace padho. 90% cases mein bug wahin dikh jata hai — ya to galat tool select ho raha hai, ya galat input pass ho raha hai.

---

## Agent Assemble Karne Ke 4 Parts

Ek agent banane ke liye 4 cheezein chahiye — bilkul jaise ek dabbawala system chalane ke liye 4 cheezein chahiye: dabba (data), route map (prompt), delivery boy (LLM), aur ek coordinator jo pura din track rakhe (executor).

```
┌─────────────┐     ┌───────────────┐     ┌──────────────┐
│    Tools    │     │     Model     │     │    Prompt    │
│ (functions  │     │  (LLM jo      │     │ (instructions│
│  agent call │     │   decide      │     │  + format    │
│  kar sakta) │     │   karega)     │     │  ki language)│
└──────┬──────┘     └───────┬───────┘     └──────┬───────┘
       │                    │                    │
       └────────────────────┼────────────────────┘
                             ▼
                  create_react_agent(...)
                             │
                             ▼
                     ┌───────────────┐
                     │     Agent     │  <- decides WHAT to do next
                     │  (Runnable)   │
                     └───────┬───────┘
                             │
                             ▼
                  ┌────────────────────┐
                  │   AgentExecutor     │  <- actually RUNS the loop
                  │ (Thought→Action→    │
                  │  Observation loop)  │
                  └────────────────────┘
```

1. **Tools** — jo functions agent call kar sakta hai (`@tool` decorated)
2. **Model** — jo LLM reasoning karega (`ChatOpenAI`, etc.)
3. **Prompt** — jo LLM ko batata hai *kaise* sochna hai aur *kis format* mein Action likhna hai
4. **`create_react_agent`** — in teeno ko jodkar ek "agent" (Runnable) banata hai jo decide karta hai agla step kya ho
5. **`AgentExecutor`** — yeh actual loop chalata hai: agent se agla step poochta hai, tool run karta hai, observation wapas bhejta hai, repeat karta hai jab tak Final Answer na mil jaye

Point 4 aur 5 mein confusion hoti hai beginners ko, isliye yaad rakho:

> **`agent` sirf ek decision banata hai (ek step). `AgentExecutor` us decision ko baar-baar loop mein chalata hai jab tak kaam khatam na ho.**

Yeh bilkul aise hai jaise ek **GPS app** (agent) sirf "agla turn left lo" bolta hai, lekin **car chalane wala driver** (executor) hi actually gaadi ko move karta hai, GPS se baar-baar next instruction leta hai, aur destination pe pahuchne tak yeh process repeat karta hai.

---

## The Classic ReAct Prompt

`create_react_agent` ko ek specific format wala prompt chahiye jisme yeh placeholders hone chahiye: `{tools}`, `{tool_names}`, `{input}`, `{agent_scratchpad}`.

```python
from langchain_core.prompts import PromptTemplate

REACT_PROMPT = PromptTemplate.from_template("""\
Answer the following questions as best you can. You have access to the following tools:

{tools}

Use the following format:

Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question

Begin!

Question: {input}
Thought:{agent_scratchpad}
""")
```

Isko **directly memorize karne ki zaroorat nahi** — LangChain hub se bhi ready-made version mil jata hai (`hub.pull("hwchase17/react")`), lekin apna banake rakhna better hai kyunki:
- Tumhe koi extra network call / hub dependency nahi chahiye
- Tum easily customize kar sakte ho (Hinglish instructions, specific tone, extra rules)

`{agent_scratchpad}` woh jagah hai jaha AgentExecutor **pichle saare Thought/Action/Observation** likhta jaata hai — taaki LLM ko har baar poora context yaad rahe ki ab tak kya ho chuka hai. Isko socho jaise ek WhatsApp chat thread — jitna scroll upar jaate ho utna context milta hai.

---

## Full Worked Example — Weather + Calculator Agent

Ab hum ek complete, runnable agent banayenge jiske paas 2 tools hain:

1. `get_weather(city)` — kisi shehar ka mock weather batata hai
2. `calculate(expression)` — koi bhi math expression evaluate karta hai

Aur hum aisa sawaal poochenge jisko solve karne ke liye agent ko **dono tools chain** karne padenge — pehle weather nikalna, phir uska Fahrenheit conversion calculate karna. Yeh bilkul waisa hi hai jaise Zomato ka delivery-time estimator pehle "restaurant se distance" nikalta hai, phir usse "traffic factor" se multiply karke ETA deta hai — do steps, do alag calculations, chained together.

### Step 1 — Environment Setup

```bash
pip install langchain langchain-openai langchain-core python-dotenv
```

```bash
# .env file
OPENAI_API_KEY=sk-...
```

### Step 2 — Tools Define Karo

```python
"""
weather_calculator_agent.py -- Pehla agent: weather + calculator
"""
from dotenv import load_dotenv
load_dotenv()

from langchain_core.tools import tool
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from langchain.agents import create_react_agent, AgentExecutor

# --- Tool 1: Weather ---

# Production mein yeh ek real weather API (OpenWeatherMap, etc.) call karega.
# Abhi demo ke liye mock data use kar rahe hain.
MOCK_WEATHER_DB = {
    "delhi": {"temp_c": 32, "condition": "sunny"},
    "mumbai": {"temp_c": 29, "condition": "humid"},
    "bengaluru": {"temp_c": 22, "condition": "cloudy"},
    "pune": {"temp_c": 27, "condition": "clear sky"},
}

@tool
def get_weather(city: str) -> str:
    """Get the current weather (temperature in Celsius and condition) for an
    Indian city. Use this whenever someone asks about weather, temperature,
    or climate for a specific city. Input should be just the city name,
    e.g. 'Delhi' or 'Mumbai'."""
    key = city.strip().lower()
    if key not in MOCK_WEATHER_DB:
        return f"Sorry, no weather data available for '{city}'."
    data = MOCK_WEATHER_DB[key]
    return f"{city}: {data['temp_c']}°C, {data['condition']}"

# --- Tool 2: Calculator ---

@tool
def calculate(expression: str) -> str:
    """Evaluate a mathematical expression and return the result. Use this for
    any arithmetic, unit conversion formulas, or numeric calculations.
    Examples: '32 * 9/5 + 32', '100 / 3', 'pow(2, 10)'."""
    try:
        # WARNING: eval() production mein risky hai. Real projects mein
        # 'numexpr' ya 'asteval' jaisa safe math parser use karo.
        safe_builtins = {"pow": pow, "abs": abs, "round": round}
        result = eval(expression, {"__builtins__": {}}, safe_builtins)
        return str(result)
    except Exception as e:
        return f"Error evaluating '{expression}': {e}"

tools = [get_weather, calculate]
```

> [!warning]
> `eval()` production code mein dangerous hai — agar LLM koi weird expression bana de (ya koi malicious input inject ho jaye) to security risk ban sakta hai. Yaha hum sirf teaching ke liye use kar rahe hain, restricted builtins ke saath. Real projects mein `numexpr.evaluate()` ya `asteval` library use karo.

### Step 3 — Prompt Aur Agent Banao

```python
REACT_PROMPT = PromptTemplate.from_template("""\
Answer the following questions as best you can. You have access to the following tools:

{tools}

Use the following format:

Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question

Begin!

Question: {input}
Thought:{agent_scratchpad}
""")

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)

agent = create_react_agent(
    llm=model,
    tools=tools,
    prompt=REACT_PROMPT,
)
```

`temperature=0` isliye rakha hai kyunki agents mein hume **consistent, predictable reasoning** chahiye — creative/random jawab nahi. Zomato ka order-routing system bhi kabhi "creative" route nahi choose karega, hamesha shortest/most-reliable path.

### Step 4 — AgentExecutor Se Wrap Karo

```python
agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    verbose=True,              # Har Thought/Action/Observation console mein dikhega
    max_iterations=6,          # Safety limit -- infinite loop se bachne ke liye
    max_execution_time=30,     # 30 second ke baad executor ruk jayega
    handle_parsing_errors=True, # LLM ne format galat likha to crash nahi, retry karega
    return_intermediate_steps=True,  # Poora trace object mein bhi milega
)
```

Har parameter ka role samjho:

| Parameter | Kya karta hai | Kyun zaruri hai |
|---|---|---|
| `verbose` | Console mein reasoning print karta hai | Debugging ke liye must-have |
| `max_iterations` | Kitni baar Thought→Action loop chalega | Agent kabhi loop mein fas jaye to cost/time explode na ho |
| `max_execution_time` | Total wall-clock time limit (seconds) | User ko forever wait na karna pade |
| `handle_parsing_errors` | Agar LLM ka output ReAct format follow na kare to error message wapas LLM ko de kar retry karwata hai | LLM kabhi format thoda bigaad deta hai — crash hone se better hai retry |
| `return_intermediate_steps` | Har (action, observation) pair ko result mein include karta hai | Production mein logging/analytics ke liye zaruri |

> [!warning]
> `max_iterations` set na karna ek common mistake hai. Agar agent confuse ho jaye aur baar-baar galat tool call kare, bina limit ke yeh **infinite loop** ban sakta hai — matlab unlimited API calls, matlab unlimited bill. Hamesha ek reasonable limit (5-10) rakho.

### Step 5 — Run Karo

```python
result = agent_executor.invoke({
    "input": "Delhi mein abhi kitna temperature hai, aur usse Fahrenheit mein convert karo."
})

print("\n--- FINAL ANSWER ---")
print(result["output"])
```

---

## Trace — Andar Kya Ho Raha Hai (verbose=True Output)

Jab tum upar wala code run karoge, console mein kuch aisa dikhega (thoda simplify karke):

```
> Entering new AgentExecutor chain...

Thought: Mujhe pehle Delhi ka current temperature nikalna hoga.
Action: get_weather
Action Input: Delhi
Observation: Delhi: 32°C, sunny

Thought: Ab mujhe 32°C ko Fahrenheit mein convert karna hai.
Formula hai: F = C * 9/5 + 32
Action: calculate
Action Input: 32 * 9/5 + 32
Observation: 89.6

Thought: Mere paas ab dono jaankari hai -- Celsius aur Fahrenheit.
Final Answer: Delhi mein abhi 32°C (sunny) hai, jo Fahrenheit mein 89.6°F hota hai.

> Finished chain.

--- FINAL ANSWER ---
Delhi mein abhi 32°C (sunny) hai, jo Fahrenheit mein 89.6°F hota hai.
```

Line-by-line samjho kya ho raha hai:

1. **Thought 1**: LLM ne query padhi, socha "temperature pehle chahiye" — yeh reasoning purely LLM ke andar generate hui, koi tool nahi chala.
2. **Action 1 + Observation 1**: `AgentExecutor` ne dekha "Action: get_weather" likha hai, use `get_weather.invoke("Delhi")` call kiya, result wapas prompt mein "Observation:" ke baad chipka diya.
3. **Thought 2**: Ab LLM ne fresh context (jisme observation bhi hai) dekhkar socha "Fahrenheit conversion chahiye" — aur formula khud yaad kiya.
4. **Action 2 + Observation 2**: Calculator tool call hua, result 89.6 mila.
5. **Final Answer**: Jab LLM ko laga uske paas sab data hai, usne "Thought: I now know the final answer" likh kar loop khatam kiya.

`return_intermediate_steps=True` se yeh poora trace Python object ke roop mein bhi milta hai:

```python
for action, observation in result["intermediate_steps"]:
    print(f"Tool called: {action.tool}")
    print(f"Tool input : {action.tool_input}")
    print(f"Observation: {observation}")
    print("---")
```

```
Tool called: get_weather
Tool input : Delhi
Observation: Delhi: 32°C, sunny
---
Tool called: calculate
Tool input : 32 * 9/5 + 32
Observation: 89.6
---
```

Yeh structured trace production mein **logging, debugging, aur analytics** ke liye bahut kaam aata hai — jaise Swiggy apne app mein "order placed → preparing → out for delivery → delivered" ka poora audit trail rakhta hai.

---

## Jab Tool Fail Ho Jaye

Agar agent ek aisa city poochta hai jo mock DB mein nahi hai:

```python
result = agent_executor.invoke({
    "input": "Chennai ka weather kya hai?"
})
```

Trace kuch aisa dikhega:

```
Thought: Mujhe Chennai ka weather chahiye.
Action: get_weather
Action Input: Chennai
Observation: Sorry, no weather data available for 'Chennai'.

Thought: Yeh city mere data mein nahi hai. Mujhe user ko yeh bata dena chahiye.
Final Answer: Maaf kijiye, Chennai ka weather data mere paas available nahi hai.
```

Yeh dekho — hamare tool ne exception **nahi** phenki, balki ek readable error string return ki. Isse agent ko pata chal gaya ki tool fail hua aur woh gracefully recover kar gaya (crash nahi hua). Yeh design choice bahut important hai:

> [!tip]
> Tools ko hamesha **readable string return** karni chahiye jab kuch galat ho — exception raise mat karo jab tak zaroori na ho. Agar exception raise karni hi hai, `ToolException` use karo aur `tool.handle_tool_error = True` set karo, taaki `AgentExecutor` crash hone ke bajaye us error ko observation ki tarah LLM ko wapas bhej de.

```python
from langchain_core.tools import tool, ToolException

@tool
def get_weather(city: str) -> str:
    """Get current weather for a city."""
    key = city.strip().lower()
    if key not in MOCK_WEATHER_DB:
        raise ToolException(f"No weather data for '{city}'. Try a major Indian city.")
    data = MOCK_WEATHER_DB[key]
    return f"{city}: {data['temp_c']}°C, {data['condition']}"

get_weather.handle_tool_error = True
```

---

## Common Mistakes (Gotchas)

1. **Vague tool docstring** — Agar `get_weather` ka docstring sirf "Gets weather" hai, LLM confuse ho sakta hai ki kab use karna hai. Docstring mein clearly likho *kab* use karna hai aur *kaisa input* expect hai.

2. **`max_iterations` set na karna** — Bina limit ke, ek confused agent infinite loop mein fas sakta hai. Har production agent mein yeh hona chahiye.

3. **`temperature` high rakhna** — Agent reasoning mein consistency chahiye. `temperature=0` (ya bahut low) production agents ke liye default hona chahiye.

4. **Tool errors ko silently crash hone dena** — Agar tool exception raise kare aur `handle_tool_error` set na ho, poora `AgentExecutor.invoke()` crash ho jayega. Hamesha error ko graceful string mein convert karo.

5. **`handle_parsing_errors=False` (default kabhi-kabhi)** — Text-based ReAct format kabhi LLM thoda bigaad deta hai (jaise "Action Input" ke baad extra text). Bina `handle_parsing_errors=True` ke yeh poora chain crash kar dega ek chhoti si formatting mistake par.

6. **Har chhoti query ke liye agent use karna** — Agar tumhe pata hai ki kaunsa tool chahiye (fixed sequence), agent mat banao — seedha chain use karo. Agent tab use karo jab **LLM ko khud decide karna ho** ki kaunsa tool, kab, kitni baar.

---

## Production Considerations

| Concern | Kya dhyaan rakhein |
|---|---|
| **Cost** | Har Thought/Action/Observation cycle = 1 LLM call. Agar agent 5 iterations leta hai, matlab 5 API calls ka bill. Complex queries costly ho sakti hain. |
| **Latency** | Har iteration mein LLM call + tool execution time lagta hai. Ek 3-step agent easily 5-10 second le sakta hai. User ko loading indicator dikhao. |
| **Reliability** | Text-based ReAct parsing (Thought/Action format) kabhi fragile hoti hai — LLM format thoda bigaad sakta hai. Isliye `handle_parsing_errors=True` zaruri hai. Production mein modern **tool-calling agents** (`create_tool_calling_agent`, ya LangGraph ka `create_react_agent` prebuilt) zyada robust hote hain kyunki woh structured function-calling API use karte hain, text-parsing nahi. |
| **Observability** | `return_intermediate_steps=True` + LangSmith tracing use karo taaki production mein pata chale agent kaha slow ho raha hai ya galat decision le raha hai. |
| **Safety limits** | `max_iterations` aur `max_execution_time` dono set karo — dono alag failure modes se bachate hain (infinite loop vs. slow individual tool calls). |
| **Timeouts on tools** | Agar koi tool (jaise real weather API) hang ho jaye, poora agent atak jayega. Har external call pe apna timeout lagao. |

> [!info]
> Is course ke aage wale chapters mein hum **LangGraph** dekhenge, jo agents ko graph ke roop mein model karta hai — woh `AgentExecutor` se zyada control deta hai (custom routing, human-in-the-loop, persistence, streaming). `AgentExecutor` samajhna zaruri hai kyunki yeh foundational mental model hai — ReAct loop ka concept LangGraph mein bhi same rehta hai, bas implementation zyada flexible ho jaati hai.

---

## Full Combined Code (Copy-Paste Ready)

```python
"""
weather_calculator_agent.py -- Pehla end-to-end ReAct agent.
Run: python weather_calculator_agent.py
"""
from dotenv import load_dotenv
load_dotenv()

from langchain_core.tools import tool, ToolException
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from langchain.agents import create_react_agent, AgentExecutor

# --- Tools ---

MOCK_WEATHER_DB = {
    "delhi": {"temp_c": 32, "condition": "sunny"},
    "mumbai": {"temp_c": 29, "condition": "humid"},
    "bengaluru": {"temp_c": 22, "condition": "cloudy"},
    "pune": {"temp_c": 27, "condition": "clear sky"},
}

@tool
def get_weather(city: str) -> str:
    """Get the current weather (temperature in Celsius and condition) for an
    Indian city. Use this whenever someone asks about weather or temperature.
    Input should be just the city name, e.g. 'Delhi'."""
    key = city.strip().lower()
    if key not in MOCK_WEATHER_DB:
        raise ToolException(f"No weather data for '{city}'. Try a major Indian city.")
    data = MOCK_WEATHER_DB[key]
    return f"{city}: {data['temp_c']}°C, {data['condition']}"

get_weather.handle_tool_error = True

@tool
def calculate(expression: str) -> str:
    """Evaluate a mathematical expression. Use this for arithmetic or unit
    conversions. Examples: '32 * 9/5 + 32', '100 / 3'."""
    try:
        safe_builtins = {"pow": pow, "abs": abs, "round": round}
        result = eval(expression, {"__builtins__": {}}, safe_builtins)
        return str(result)
    except Exception as e:
        return f"Error evaluating '{expression}': {e}"

tools = [get_weather, calculate]

# --- Prompt ---

REACT_PROMPT = PromptTemplate.from_template("""\
Answer the following questions as best you can. You have access to the following tools:

{tools}

Use the following format:

Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question

Begin!

Question: {input}
Thought:{agent_scratchpad}
""")

# --- Agent + Executor ---

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)

agent = create_react_agent(llm=model, tools=tools, prompt=REACT_PROMPT)

agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    verbose=True,
    max_iterations=6,
    max_execution_time=30,
    handle_parsing_errors=True,
    return_intermediate_steps=True,
)

# --- Run ---

if __name__ == "__main__":
    queries = [
        "Delhi mein abhi kitna temperature hai, aur usse Fahrenheit mein convert karo.",
        "Pune aur Bengaluru mein se kaunsa zyada garam hai?",
        "Chennai ka weather kya hai?",  # Not in DB -- tests error handling
    ]

    for q in queries:
        print(f"\n{'='*60}\nQuery: {q}\n{'='*60}")
        result = agent_executor.invoke({"input": q})
        print(f"\nFinal Answer: {result['output']}")
        print("\nSteps taken:")
        for action, observation in result["intermediate_steps"]:
            print(f"  -> {action.tool}({action.tool_input}) => {observation}")
```

---

## Key Takeaways

- **Agent = LLM jo decide karta hai kya karna hai**, chain ki tarah fixed steps follow nahi karta — yeh reason karta hai, tool call karta hai, result dekhta hai, aur repeat karta hai.
- **ReAct pattern** (Reason + Act) is decision-making loop ka standard format hai: `Thought → Action → Observation → (repeat) → Final Answer`.
- `create_react_agent(llm, tools, prompt)` ek **single decision** banata hai (agla step kya ho); `AgentExecutor` us decision ko **loop mein baar-baar chalata hai** jab tak Final Answer na mil jaye.
- ReAct prompt ko 4 placeholders chahiye: `{tools}`, `{tool_names}`, `{input}`, `{agent_scratchpad}` — scratchpad hi pichle saare Thought/Action/Observation ka running history rakhta hai.
- `AgentExecutor` ke safety parameters zaruri hain: `max_iterations`, `max_execution_time`, `handle_parsing_errors` — inke bina agent infinite loop ya crash mein fas sakta hai.
- Tools mein errors ko hamesha **readable string ya `ToolException` + `handle_tool_error=True`** se handle karo — raw crash kabhi mat hone do.
- `verbose=True` aur `return_intermediate_steps=True` debugging aur production logging dono ke liye essential hain.
- Production mein cost, latency, aur reliability teeno consider karo — har iteration ek naya LLM call hai, aur text-based ReAct parsing kabhi fragile ho sakti hai (isliye modern tool-calling agents / LangGraph zyada robust option hai, jo aage ke chapters mein cover hoga).
