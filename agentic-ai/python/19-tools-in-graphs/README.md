# Tools Inside Graphs

🟡 Intermediate

Ab tak humne LangGraph mein state, nodes, edges, conditional routing — sab dekh liya hai. Lekin ek cheez abhi tak missing thi: **agent ne kaam kaise karna hai, sirf baatein nahi, actually kuch karna hai.**

Socho ek second ke liye — tum Zomato support chatbot se baat kar rahe ho aur poochte ho "mera order kahan hai?". Agar bot sirf LLM hai, toh woh sirf ek confident-sounding paragraph likh dega jaisa usne training data mein dekha hoga — "aapka order jald hi aa jayega" — bina yeh actually check kiye ki order kahan hai. Yeh bekaar hai. Real bot ko ek **tool** chahiye — jaise `get_order_status(order_id)` — jo actual database ya API se real data laaye.

Yehi is chapter ka core idea hai: LLM ko tools do, aur graph ke andar ek **loop** bana do jahan LLM sochta hai → tool call karta hai → result dekhta hai → phir se sochta hai → jab tak final answer na mil jaye.

Isko **ReAct pattern** kehte hain — **Rea**soning + **Act**ing. Think → Act → Observe → Repeat. Bilkul waise hi jaise ek dabbawala apna route plan karta hai (reasoning), dabba deliver karta hai (acting), confirm karta hai ki sahi ghar pahuncha (observing), aur agle dabbe ke liye plan adjust karta hai.

---

## Kya Problem Solve Ho Rahi Hai?

Plain LLM ki limitations:

| LLM akela | LLM + Tools |
|---|---|
| Sirf training data ke basis pe text generate karta hai | Real-time data fetch kar sakta hai (weather, stock price, DB records) |
| Calculation mein galti kar sakta hai (`15 * 37` sahi answer dena guarantee nahi) | Calculator tool call karke exact answer paata hai |
| Kuch "action" nahi le sakta (email bhejna, file save karna, API hit karna) | Tool ke through real-world side-effects perform kar sakta hai |
| Apna knowledge cutoff se aage nahi jaan sakta | Web search tool se latest info la sakta hai |

Is chapter mein hum dekhenge:
1. `ToolNode` — LangGraph ka pre-built tool-executor node
2. Agent node → Tool node → wapas Agent node — is loop ko manually banana
3. `create_react_agent` — same pattern ka ek-line shortcut
4. Dono approaches ka trade-off — kab manual likhein, kab shortcut use karein

> [!info]
> Agar tumne pichle chapter mein tools define karna (`@tool` decorator) aur `llm.bind_tools()` already dekha hai, toh yeh chapter uska direct continuation hai — ab hum unhe ek **graph** ke andar wire karenge taaki agent multi-step tasks handle kar sake.

---

## Quick Recap: Tool Kaise Define Hota Hai

Agar yeh fresh hai tumhare liye, ek chota recap:

```python
from langchain_core.tools import tool


@tool
def search_web(query: str) -> str:
    """Search the web for current information. Use this when you need facts, news, or data you don't already know."""
    # Production mein yahan real search API (Tavily, SerpAPI, etc.) call hoga
    return f"Results for '{query}': LangGraph is a framework by LangChain for building stateful agent workflows."


@tool
def calculator(expression: str) -> str:
    """Evaluate a mathematical expression. Input should be a valid Python math expression, e.g. '15 * 37'."""
    try:
        result = eval(expression)  # NOTE: production mein eval() risky hai, safe evaluator use karo
        return str(result)
    except Exception as e:
        return f"Error: {e}"


@tool
def get_weather(city: str) -> str:
    """Get the current weather for a city."""
    # Simulated — production mein real weather API call karo
    return f"Weather in {city}: 32C, humid, chance of rain"
```

Har tool ke teen zaruri parts hain:
- **Name** — function ka naam (`search_web`, `calculator`)
- **Description** — docstring se aata hai. **Yeh sabse important hai** — LLM isi description ko padhkar decide karta hai ki kaunsa tool kab use karna hai. Vague description likhoge (jaise `"does stuff"`) toh LLM confuse ho jayega.
- **Parameters** — function signature se auto-detect hote hain (`query: str`, `expression: str`)

Tools ko LLM ke saath bind karna:

```python
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

tools = [search_web, calculator, get_weather]

# Ab LLM ko pata hai ki yeh 3 tools available hain
llm_with_tools = llm.bind_tools(tools)
```

Jab tum `llm_with_tools.invoke(messages)` call karte ho, response mein ek `tool_calls` list aa sakti hai — structured requests jo batati hain ki LLM kaunsa tool, kis argument ke saath call karna chahta hai:

```python
from langchain_core.messages import HumanMessage

response = llm_with_tools.invoke([
    HumanMessage(content="What is 15 * 37?")
])

print(response.tool_calls)
# [{'name': 'calculator', 'args': {'expression': '15 * 37'}, 'id': 'call_abc123'}]
```

Yahan tak LLM ne sirf **decide** kiya hai ki kaunsa tool chahiye — abhi tak usne tool ko actually run nahi kiya. Yeh execute karna hamara (developer ka) kaam hai. Yehi part `ToolNode` handle karta hai.

---

## `ToolNode`: LangGraph Ka Pre-Built Tool Executor

`ToolNode` LangGraph ka ek ready-made node hai jo automatically:

1. State mein se **last AI message** utha ta hai
2. Usme se saare `tool_calls` nikalta hai
3. Har tool ko uske arguments ke saath **execute** karta hai
4. Har result ko `ToolMessage` mein wrap karke state mein wapas append karta hai

```python
from langgraph.prebuilt import ToolNode

tool_node = ToolNode(tools)
```

Bas itna hi. Yeh Swiggy ke us "delivery partner assignment engine" jaisa hai — order (tool call) aata hai, sahi delivery partner (tool function) ko assign hota hai, aur woh partner delivery (result) leke wapas aata hai. Tumhe manually har order route nahi karna padta.

> [!tip]
> `ToolNode` multiple tool calls ko ek hi state update mein handle kar leta hai — agar LLM ne ek response mein 3 tools call kiye hain (parallel tool calling), `ToolNode` teenon ko execute karke teenon ke `ToolMessage` return karega.

---

## The Complete Loop: Agent Node → Tool Node → Agent Node

Ab asli cheez — yeh poora ReAct loop graph ke andar kaise banta hai.

```
START -> agent (LLM) -> should_continue? -> tools (ToolNode) -> agent (LLM) -> ...
                       \-> END
```

Iska matlab: agent sochta hai, agar tool chahiye toh tool node jaata hai, result leke wapas agent pe aata hai, agent phir se sochta hai — jab tak koi tool call na bache, tab END pe jaata hai.

### Step-by-Step Poora Code

```python
from typing import TypedDict, Annotated
from langchain_core.messages import BaseMessage, HumanMessage
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode


# --- State ---
class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]


# --- Tools ---
@tool
def search_web(query: str) -> str:
    """Search the web for current information."""
    return f"Results for '{query}': LangGraph is a framework by LangChain for building stateful agent workflows."


@tool
def calculator(expression: str) -> str:
    """Evaluate a mathematical expression."""
    try:
        return str(eval(expression))
    except Exception as e:
        return f"Error: {e}"


tools = [search_web, calculator]


# --- LLM with tools bound ---
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
llm_with_tools = llm.bind_tools(tools)


# --- Node 1: Agent (the "brain") ---
def agent(state: AgentState) -> dict:
    """LLM ko call karta hai — woh decide karega tool chahiye ya final answer."""
    response = llm_with_tools.invoke(state["messages"])
    return {"messages": [response]}


# --- Node 2: Tools (pre-built executor) ---
tool_node = ToolNode(tools)


# --- Router: "kya LLM ne tool maanga hai?" ---
def should_continue(state: AgentState) -> str:
    last_message = state["messages"][-1]
    if last_message.tool_calls:
        return "tools"
    return END


# --- Graph banao ---
graph = StateGraph(AgentState)
graph.add_node("agent", agent)
graph.add_node("tools", tool_node)

graph.add_edge(START, "agent")
graph.add_conditional_edges("agent", should_continue, {
    "tools": "tools",
    END: END,
})
graph.add_edge("tools", "agent")  # Tool result ke baad wapas agent pe — yehi loop hai

app = graph.compile()


# --- Run karo ---
result = app.invoke({
    "messages": [HumanMessage(content="What is 42 * 58, and what is LangGraph?")]
})

for msg in result["messages"]:
    print(f"[{msg.type}] {msg.content[:150] if msg.content else '(tool call requested)'}")
```

### Step-by-Step Kya Ho Raha Hai

1. User poochta hai: "What is 42 * 58, and what is LangGraph?"
2. **Agent node** run hota hai → LLM dekhta hai isme do kaam hain, decide karta hai `calculator` aur `search_web` dono call karne hain
3. **Router (`should_continue`)** dekhta hai `tool_calls` list khaali nahi hai → route karta hai `"tools"` pe
4. **Tool node** dono tools execute karta hai, `ToolMessage` results state mein add karta hai
5. Edge se wapas **agent node** pe jaata hai — ab LLM ke paas tool results hain
6. LLM in results ko padhkar final answer compose karta hai (koi naya tool call nahi)
7. **Router** dekhta hai `tool_calls` empty hai → `END` pe route karta hai

Yeh **exactly** waisa hi hai jaise tum Swiggy pe order karte ho: tum poochte ho "mera khana kahan hai + restaurant ka rating kya hai" (do sawaal), app dono cheezein alag-alag services se fetch karta hai (tool calls), aur phir dono ko combine karke ek hi response screen pe dikhata hai (final LLM answer).

> [!warning]
> Router function mein `last_message.tool_calls` check karne se pehle yeh confirm karo ki `last_message` AI message hi hai. Agar state mein last message koi aur type ka hua (jaise directly `HumanMessage`), `.tool_calls` attribute error de sakta hai kuch message types pe. Practice mein `AIMessage` pe hamesha `tool_calls` attribute exist karta hai (default empty list), lekin custom message classes use kar rahe ho toh dhyaan rakho.

---

## `create_react_agent`: Same Pattern Ka One-Line Shortcut

Upar wala poora graph — state define karna, agent node, tool node, router, edges — yeh itna common pattern hai ki LangGraph ne isko ek pre-built function mein wrap kar diya: `create_react_agent`.

```python
from langgraph.prebuilt import create_react_agent
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage

llm = ChatOpenAI(model="gpt-4o-mini")
tools = [search_web, calculator, get_weather]

# Yeh internally wahi agent -> should_continue -> tools -> agent graph banata hai
agent = create_react_agent(llm, tools)

result = agent.invoke({
    "messages": [HumanMessage(content="What is the weather in NYC and what is 100/7?")]
})

for msg in result["messages"]:
    print(f"[{msg.type}] {msg.content[:150] if msg.content else str(msg.tool_calls)[:150]}")
```

Ek line mein — poora ReAct agent ready. Yeh IRCTC ki "Tatkal auto-book" service jaisa hai — tumhe manually form fill, payment, confirmation sab steps khud karne ki zarurat nahi, ek button click aur poora flow ho jaata hai. Kaam wahi hota hai jo manual flow karta, bas abstraction ke peeche chhup jaata hai.

### System Prompt Ke Saath

```python
agent = create_react_agent(
    llm,
    tools,
    prompt="You are a helpful research assistant. Always cite your sources and keep answers concise.",
)
```

> [!info]
> Purane LangGraph versions mein is parameter ka naam `state_modifier` tha. Newer versions mein isko `prompt` bol dete hain (ek simple string, ya `SystemMessage`, ya ek function bhi ho sakta hai jo state leke messages return kare). Apni installed version ka docs check karna — `pip show langgraph`.

### Checkpointer Ke Saath (Memory)

```python
from langgraph.checkpoint.memory import MemorySaver

agent = create_react_agent(llm, tools, checkpointer=MemorySaver())

config = {"configurable": {"thread_id": "session-001"}}
result = agent.invoke({"messages": [HumanMessage(content="Hi!")]}, config=config)
```

Yeh thread-based memory de deta hai — jaise pichle chapters mein dekha, `thread_id` se conversation history persist hoti hai across multiple `.invoke()` calls.

---

## `create_react_agent` vs Manual Graph — Kab Kya Use Karo?

Yeh sabse important decision hai is chapter ka. Dono ek hi kaam karte hain (agent-tool loop), lekin control ka level alag hai.

| | `create_react_agent` | Manual Graph (StateGraph) |
|---|---|---|
| **Setup speed** | Ek line, turant kaam shuru | Zyada boilerplate — state, nodes, router, edges khud likhna |
| **Control** | Limited — fixed pattern hai (agent → tools → agent) | Full control — jitne chaho utne nodes, custom routing logic |
| **Custom nodes beech mein daalna** (jaise: validation, logging, human-approval) | Mushkil / haywire ho sakta hai | Aasaan — bas naya node add karo aur edge wire karo |
| **Multiple tool nodes** (jaise: safe tools vs risky tools alag routing) | Support nahi karta directly | Aasaan — apna router likh ke jitne chaho tool nodes bana lo |
| **Custom state schema** (extra fields beyond messages) | Limited support (`state_schema` param milta hai but abhi bhi opinionated hai) | Poora control — apni marzi ka `TypedDict` |
| **Best for** | Prototyping, simple single-purpose agents, quick POCs | Production systems, complex multi-agent workflows, jab business logic agent loop ke andar-baahar interweave karni ho |
| **Debugging** | Thoda black-box — internal graph directly dikhta nahi | Har node visible hai, LangGraph Studio mein clearly trace hota hai |

**Rule of thumb**: Agar tumhara agent sirf "LLM + tools, simple back-and-forth" hai — `create_react_agent` use karo, time bachao. Jaise hi requirement aati hai — "pehle ek validation step chahiye", "risky tools ke liye human approval chahiye", "state mein custom fields track karne hain (jaise retry_count, user_tier)" — manual `StateGraph` pe switch karo.

Bahut se production teams pehle `create_react_agent` se prototype banate hain, phir jab requirements badhti hain toh usko manual graph mein "eject" kar dete hain — kyunki `create_react_agent` internally jo graph banata hai, uska structure bilkul wahi hai jo humne upar manually likha.

> [!tip]
> Ek achhi strategy: hamesha `create_react_agent` se shuru karo. Jis din tumhe lage "yaar isme ek extra node chahiye jo yeh function support nahi karta" — usi din manual `StateGraph` pattern pe migrate karo. Code bilkul same shape ka hoga, bas tumhare paas ab full control hoga.

---

## Error Handling Tool Nodes Mein

Tools fail ho sakte hain — API down ho sakti hai, network timeout ho sakta hai, ya LLM ne galat arguments bheje ho sakte hain. Agent ko crash nahi hona chahiye — usse gracefully recover karna chahiye.

### Option 1: Tool ke andar hi handle karo

```python
@tool
def risky_api_call(endpoint: str) -> str:
    """Call an external API. Provide the endpoint path."""
    try:
        import httpx
        response = httpx.get(f"https://api.example.com/{endpoint}", timeout=10)
        response.raise_for_status()
        return response.text
    except httpx.TimeoutException:
        return "Error: API call timed out. Try again or use a different approach."
    except httpx.HTTPStatusError as e:
        return f"Error: API returned status {e.response.status_code}. Check the endpoint."
    except Exception as e:
        return f"Error: {str(e)}"
```

Yahan trick yeh hai — error ko **string return** karke bhejo, exception raise mat karo. LLM is error message ko padh lega aur decide kar sakta hai ki dobara try kare, ya user ko bata de, ya alag approach le.

### Option 2: `ToolNode` ka built-in error handling

```python
tool_node = ToolNode(tools, handle_tool_errors=True)
```

Agar koi tool exception raise karta hai, `ToolNode` khud usse catch karke ek `ToolMessage` bana deta hai jisme error detail hoti hai — poora graph crash nahi hota.

### Option 3: Custom tool executor with retry logic

Jab tumhe `ToolNode` se zyada control chahiye (jaise retries, custom logging), khud ka executor function likh sakte ho:

```python
from langchain_core.messages import ToolMessage


def custom_tool_executor(state: AgentState) -> dict:
    """Custom tool execution with retry logic."""
    last_message = state["messages"][-1]
    results = []
    tool_map = {t.name: t for t in tools}

    for tool_call in last_message.tool_calls:
        tool_name = tool_call["name"]
        tool_args = tool_call["args"]
        tool_id = tool_call["id"]

        selected_tool = tool_map.get(tool_name)

        if not selected_tool:
            results.append(ToolMessage(
                content=f"Error: Unknown tool '{tool_name}'",
                tool_call_id=tool_id,
            ))
            continue

        max_retries = 3
        for attempt in range(max_retries):
            try:
                result = selected_tool.invoke(tool_args)
                results.append(ToolMessage(content=str(result), tool_call_id=tool_id))
                break
            except Exception as e:
                if attempt == max_retries - 1:
                    results.append(ToolMessage(
                        content=f"Error after {max_retries} retries: {str(e)}",
                        tool_call_id=tool_id,
                    ))

    return {"messages": results}
```

Isko graph mein `"tools"` node ki jagah use kar sakte ho — baaki sab (router, edges) same rahega.

---

## Custom Tool Execution Logic — Kab Aur Kyun

### Logging Aur Metrics

Production mein tumhe pata hona chahiye kaunsa tool kitni baar call ho raha hai, kitna time le raha hai, kitni baar fail ho raha hai. Yeh Paytm ke transaction logs jaisa hai — har transaction (tool call) ka record rakhna zaruri hai debugging aur auditing ke liye.

```python
import time
import logging

logger = logging.getLogger("agent_tools")


def instrumented_tool_executor(state: AgentState) -> dict:
    """Tools ko execute karta hai logging aur timing ke saath."""
    last_message = state["messages"][-1]
    results = []
    tool_map = {t.name: t for t in tools}

    for tool_call in last_message.tool_calls:
        tool_name = tool_call["name"]
        tool_args = tool_call["args"]

        logger.info(f"Executing tool: {tool_name} with args: {tool_args}")
        start = time.time()

        try:
            result = tool_map[tool_name].invoke(tool_args)
            elapsed = time.time() - start
            logger.info(f"Tool {tool_name} completed in {elapsed:.2f}s")
        except Exception as e:
            elapsed = time.time() - start
            logger.error(f"Tool {tool_name} failed after {elapsed:.2f}s: {e}")
            result = f"Error: {e}"

        results.append(ToolMessage(content=str(result), tool_call_id=tool_call["id"]))

    return {"messages": results}
```

### Tool Approval Gate — Human-in-the-Loop

Kuch tools "risky" hote hain — email bhejna, payment karna, file delete karna. Yahan hum chahte hain ki agent pause ho jaaye aur ek insaan confirm kare pehle execute karne se — bilkul waise jaise UPI pe ek high-value transaction karte waqt tumse PIN + confirmation double-check hota hai.

```python
from langgraph.checkpoint.memory import MemorySaver

memory = MemorySaver()
app = graph.compile(
    checkpointer=memory,
    interrupt_before=["tools"],  # Tool execute hone se pehle graph ruk jayega
)

config = {"configurable": {"thread_id": "tool-approval"}}
result = app.invoke({"messages": [HumanMessage(content="Search for latest AI news")]}, config=config)

# Graph "tools" node se pehle ruk gaya hai
state = app.get_state(config)
pending_tools = state.values["messages"][-1].tool_calls
print("Agent wants to call:", pending_tools)

# Insaan ne dekha, approve kiya -> resume karo
result = app.invoke(None, config=config)
```

`interrupt_before=["tools"]` graph ko us point pe pause kar deta hai jab agent tool call karne wala hota hai, lekin abhi tak kiya nahi hai. Yeh hum pehle bhi human-in-the-loop chapter mein dekh chuke hain — yahan wahi concept tools ke context mein use ho raha hai.

---

## Parallel Tool Execution

Agar LLM ek hi response mein multiple tool calls bhejta hai (jaise `search_web` aur `calculator` dono ek saath), `ToolNode` unhe **sequentially** execute karta hai by default. Agar tools slow hain (network calls), yeh time waste karta hai. Async tools ke saath parallel execution karke speed badha sakte ho:

```python
import asyncio
from langchain_core.messages import ToolMessage


async def parallel_tool_executor(state: AgentState) -> dict:
    """Multiple tool calls ko parallel mein execute karta hai."""
    last_message = state["messages"][-1]
    tool_map = {t.name: t for t in tools}

    async def execute_one(tool_call):
        tool_name = tool_call["name"]
        tool_args = tool_call["args"]
        try:
            if hasattr(tool_map[tool_name], "ainvoke"):
                result = await tool_map[tool_name].ainvoke(tool_args)
            else:
                result = tool_map[tool_name].invoke(tool_args)
            return ToolMessage(content=str(result), tool_call_id=tool_call["id"])
        except Exception as e:
            return ToolMessage(content=f"Error: {e}", tool_call_id=tool_call["id"])

    results = await asyncio.gather(*[
        execute_one(tc) for tc in last_message.tool_calls
    ])

    return {"messages": list(results)}
```

Yeh Zomato ke ek order mein multiple restaurants se ek saath eta fetch karne jaisa hai — sequentially ek-ek karke poochne ke bajaye, sabse ek saath poochke jaldi jawab le lo.

> [!warning]
> Parallel execution tabhi safe hai jab tools **independent** hon — ek tool ka result doosre tool ke input pe depend na kare. Agar tool B ka input tool A ke output pe depend karta hai, unhe parallel mein chalana galat result dega.

---

## Building Complex Tools

### Structured Input Ke Saath Tool

Complex parameters ke liye Pydantic model use kar sakte ho — extra validation aur clear descriptions milte hain:

```python
from pydantic import BaseModel, Field


class SearchParams(BaseModel):
    query: str = Field(description="The search query")
    max_results: int = Field(default=5, description="Maximum number of results to return")
    date_range: str = Field(default="any", description="Date filter: 'today', 'week', 'month', 'any'")


@tool(args_schema=SearchParams)
def advanced_search(query: str, max_results: int = 5, date_range: str = "any") -> str:
    """Search the web with advanced filters."""
    return f"Found {max_results} results for '{query}' ({date_range})"
```

### Structured Data Return Karne Wala Tool

```python
import json

@tool
def get_stock_price(symbol: str) -> str:
    """Get the current stock price for a given ticker symbol."""
    data = {
        "symbol": symbol.upper(),
        "price": 150.25,
        "change": 2.5,
        "change_percent": 1.69,
    }
    return json.dumps(data)
```

> [!tip]
> Tool ka return type hamesha `str` rakho (JSON string sahi hai) — kyunki `ToolMessage.content` string expect karta hai. Agar tumhe complex object return karna hai, `json.dumps()` karke bhejo, LLM JSON ko readable format mein samajh leta hai.

### Async Tool

```python
@tool
async def async_search(query: str) -> str:
    """Search asynchronously."""
    import httpx
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://httpbin.org/get",
            params={"q": query},
        )
        return response.text
```

Async tools use karo jab tumhare tools I/O-bound hon (network calls, DB queries) — `ToolNode` async tools ko automatically detect karke `ainvoke` use karega jab graph ko `.ainvoke()` se run karoge.

---

## Common Mistakes Aur Gotchas

1. **Vague tool descriptions** — `"does search"` jaisi description LLM ko confuse karti hai. Specific likho: `"Search the web for current facts, news, or data you don't already know. Do NOT use for math."`
2. **`eval()` production mein** — calculator tool mein `eval()` dikhaya gaya demo ke liye, lekin production mein yeh **security risk** hai (arbitrary code execution). `numexpr`, `simpleeval`, ya khud ka safe parser use karo.
3. **Router mein `tool_calls` check bhoolna** — agar `should_continue` galat likha, agent infinite loop mein phas sakta hai (hamesha "tools" pe route karta rahe) ya kabhi tools call hi na kare.
4. **Tool errors ko silently swallow karna** — agar tool fail hone pe kuch bhi return nahi karoge (crash hone doge), poora graph fail ho jayega. Hamesha error ko `ToolMessage` mein wrap karke wapas bhejo.
5. **`create_react_agent` mein zyada customization ki koshish** — agar tumhe lag raha hai "iska prompt/state schema modify karne ke liye main hacks kar raha hoon", yeh signal hai ki manual `StateGraph` pe switch karne ka time aa gaya hai.
6. **Tool call limits na set karna** — agar LLM confuse ho jaaye aur baar-baar same tool call kare, cost aur latency dono badh jaate hain. Production mein `recursion_limit` set karo graph compile/invoke ke time, taaki infinite loops protect ho sakein:
   ```python
   result = app.invoke({"messages": [...]}, config={"recursion_limit": 25})
   ```

---

## Production Considerations

- **Cost**: Har tool call ke baad agent LLM ko dobara invoke karta hai — matlab extra tokens, extra latency, extra $$. Jitne zyada tool-calling rounds, utna zyada cost. Complex multi-step tasks mein yeh add ho sakta hai — monitor karo.
- **Latency**: Sequential tool calls + LLM round-trips milkar user ko response dene mein seconds laga sakte hain. Jahan possible ho, parallel tool execution use karo, aur streaming (`astream`) se intermediate progress dikhao taaki user ko lage kuch ho raha hai.
- **Reliability**: External APIs down ho sakti hain, rate-limited ho sakti hain, timeout de sakti hain. Retry logic + graceful fallback messages zaruri hain (jaise upar dikhaya).
- **Observability**: Production mein LangSmith ya custom logging (jaisa `instrumented_tool_executor` mein dikhaya) use karo taaki pata chale kaunsa tool kitni baar, kitne time mein, kitni successfully call ho raha hai.
- **Security**: Kabhi bhi user input ko directly shell command, SQL query, ya `eval()` mein mat daalo. Tools ko sandbox karo — jitna kam access utna safe.

---

## Key Takeaways

- Tools LLM ko real-world actions lene ki capability dete hain — search, calculate, API call, DB query, sab kuch.
- Standard pattern hai: **agent (LLM) → router → tool node → agent (loop)** — yehi ReAct pattern hai (Reasoning + Acting).
- `ToolNode` ek pre-built node hai jo state ke last AI message se `tool_calls` nikalkar automatically execute karta hai aur `ToolMessage` results wapas append karta hai.
- Router function (`should_continue`) check karta hai — agar `tool_calls` present hain toh `"tools"` node pe jao, warna `END`.
- `graph.add_edge("tools", "agent")` yehi line hai jo poore loop ko complete karti hai — tool result ke baad wapas LLM ke paas jaana.
- `create_react_agent` ek-line shortcut hai poore is pattern ka — quick prototyping ke liye best.
- Manual `StateGraph` use karo jab custom routing, multiple tool nodes, human-approval gates, ya custom state schema chahiye ho — jyada control milta hai.
- Tool errors ko exception ki tarah crash mat hone do — string mein wrap karke `ToolMessage` return karo, taaki agent gracefully recover kar sake.
- `handle_tool_errors=True` `ToolNode` mein built-in error handling deta hai; custom executor likhkar retries, logging, parallel execution add kar sakte ho.
- `interrupt_before=["tools"]` se tool execution se pehle human approval gate laga sakte ho — risky actions ke liye zaruri.
- Tool descriptions clear aur specific likho — LLM inhi descriptions se decide karta hai kaunsa tool kab use karna hai.
- Production mein cost, latency, reliability aur security — chaaron ka dhyaan rakhna zaruri hai jab tool-calling agents deploy karte ho.
