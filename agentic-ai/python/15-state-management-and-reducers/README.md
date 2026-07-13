# State Management and Reducers

🟡 Intermediate

Socho ek second ke liye — tum Zomato pe order kar rahe ho. Ek service order create karti hai, doosri payment verify karti hai, teesri restaurant ko notify karti hai, aur chauthi delivery partner assign karti hai. Sab services ek hi "order object" ko touch karti hain. Ab agar payment service galti se poora order object hi **overwrite** kar de (delivery address bhi udaa de, items bhi udaa de), toh disaster ho jayega na?

LangGraph mein bhi bilkul yehi problem aati hai. Tumhara graph mein multiple nodes hote hain, aur sab ek shared **state** ko read/write karte hain. Jab do-teen nodes ek hi state key ko update karte hain, LangGraph ko pata hona chahiye — naya data purane ko **replace** kare ya usme **merge/append** ho jaye? Yahi decide karne wala mechanism hai **reducer**.

Ye chapter LangGraph ke sabse important — aur sabse zyada bugs paida karne wale — concept ko cover karega: state kaise design karein, reducers kaise kaam karte hain, `add_messages` kya jadu karta hai, aur apna khud ka reducer kaise likhein.

---

## Kya hota hai State, phir se ek baar

Agar tumne pichhle chapters padhe hain toh yaad hoga — LangGraph ka har graph ek **shared state object** ke around ghoomta hai. Har node function state ka kuch hissa read karta hai, kaam karta hai, aur ek **partial dictionary** return karta hai jisme sirf wahi keys hoti hain jo usne update ki hain.

```python
from typing import TypedDict

class OrderState(TypedDict):
    order_id: str
    items: list[str]
    status: str
    total_amount: float
```

Node ka return sirf partial update hota hai:

```python
def verify_payment(state: OrderState) -> dict:
    # sirf status update kar rahe hain, pura state nahi
    return {"status": "payment_verified"}
```

Question ye hai — jab node `list` ya `dict` type ki key update karta hai, purana data ka kya hota hai? Yehi jagah hai jahan reducers ka role start hota hai.

---

## Kya Problem Solve Karta Hai Reducer?

### Default Behaviour: Silent Overwrite

Agar tumne apni state ki kisi key pe koi reducer specify nahi kiya, toh LangGraph ka **default behaviour hai replace** — naya value purane ko poori tarah khatam kar deta hai.

```python
from typing import TypedDict

class NaiveState(TypedDict):
    items: list[str]

# Node returns:
# {"items": ["new_item"]}

# State BEFORE: {"items": ["old_item_1", "old_item_2"]}
# State AFTER:  {"items": ["new_item"]}   # old items GONE!
```

Ye scalar values (string, int, bool) ke liye perfectly fine hai — `status: "pending"` ko `status: "completed"` se replace karna hi toh chahiye. Lekin **lists aur dicts** ke liye ye almost hamesha bug hota hai.

Socho ek chatbot graph: `messages` list mein har turn ek naya `HumanMessage` ya `AIMessage` add hota hai. Agar reducer specify nahi kiya, toh har node ka return sirf apna message rakh ke poori conversation history udaa dega. User poochega "mera naam kya hai?" aur bot bilkul bhool jayega ki pichhle message mein naam bataya tha — kyunki state mein sirf latest message bacha hoga!

> [!warning]
> Ye sabse common LangGraph bug hai jo beginners karte hain: `messages: list[BaseMessage]` bina reducer ke likhna. Result — multi-turn conversation mein memory loss, aur debug karna mushkil ho jata hai kyunki error koi exception nahi deta, bas silently galat behavior hota hai.

### Solution: `Annotated` + Reducer Function

Python ka `typing.Annotated` humein type hint ke saath **extra metadata** attach karne deta hai. LangGraph is metadata ko reducer function ke roop mein use karta hai.

```python
from typing import Annotated, TypedDict
import operator

class SmartState(TypedDict):
    # operator.add lists ko concatenate karta hai
    items: Annotated[list[str], operator.add]

# Node returns:
# {"items": ["new_item"]}

# State BEFORE: {"items": ["old_item_1", "old_item_2"]}
# State AFTER:  {"items": ["old_item_1", "old_item_2", "new_item"]}  -- appended!
```

`operator.add` Python ka built-in `+` operator hai — jab dono values lists hain, ye unhe concatenate kar deta hai (`["a", "b"] + ["c"] == ["a", "b", "c"]`).

**Kaise kaam karta hai internally?**

Jab tum graph invoke karte ho, LangGraph har state key ko ek **channel** ki tarah treat karta hai (isko thoda aage detail mein dekhenge). Jab koi node return karta hai `{"key": new_value}`, LangGraph us channel ka reducer function call karta hai:

```python
merged_value = reducer(existing_value, new_value)
```

Agar reducer specify nahi kiya, toh default reducer hota hai simple replace: `lambda old, new: new`.

---

## Common Built-in Reducers

| Reducer | Behaviour | Kab use karein |
|---|---|---|
| (koi nahi — default) | Replace | Scalars: `status`, `current_step`, counters jo tum khud set karte ho |
| `operator.add` | List concatenation (`+`) | Simple append-only lists — logs, intermediate results |
| `add_messages` (LangGraph built-in) | Smart message merge (ID-aware) | Chat messages — almost hamesha ye use karo |
| Custom function | Jo bhi tum chaho | Deduplication, capping, sorting, merging dicts, etc. |

```python
import operator
from typing import Annotated, TypedDict

class ExampleState(TypedDict):
    # Append to list (messages ke alawa bhi kaam aata hai)
    logs: Annotated[list[str], operator.add]

    # Replace (default behaviour, annotation ki zaroorat nahi)
    current_step: str

    # Append list of dicts — jaise tool call results
    tool_results: Annotated[list[dict], operator.add]

    # Counter jo replace hota hai (khud increment karke set karo)
    iteration_count: int
```

> [!tip]
> Agar koi field "counter" jaisa lagta hai (jaise `iteration_count`), usse **replace hi rakho** aur node ke andar khud `state["iteration_count"] + 1` calculate karke return karo. `operator.add` yahan use mat karo warna ints bhi add ho jayenge in unexpected ways jab multiple nodes parallel chalte hain.

---

## Messages aur `add_messages` Reducer

Chat-based agents mein messages hi core state hote hain. LangChain apne message types deta hai:

```python
from langchain_core.messages import (
    HumanMessage,   # User ka input
    AIMessage,      # LLM ka response
    SystemMessage,  # System prompt
    ToolMessage,    # Tool execution ka result
    BaseMessage,    # Sabka base type
)
```

### `operator.add` Se Kya Problem Hai Messages Ke Liye?

`operator.add` bas concatenate karta hai — matlab agar tum ek existing message ko **update** karna chahte ho (jaise streaming ke dauraan AI message ko token-by-token build karna, ya tool call ka result ek specific message se link karna), toh `operator.add` sirf duplicate append kar dega, update nahi karega.

Isi wajah se LangGraph ek specialized reducer deta hai — **`add_messages`**:

```python
from typing import Annotated
from typing_extensions import TypedDict
from langchain_core.messages import BaseMessage
from langgraph.graph import add_messages

class ChatState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
```

`add_messages` `operator.add` se zyada smart hai:

1. **Append by default** — naya message ho toh list ke end mein add karta hai (jaisa `operator.add` karta).
2. **Update by ID** — agar naye message ka `id` kisi existing message se match karta hai, toh wo purane ko **replace/update** karta hai, duplicate nahi banata.
3. **Deletion support** — `RemoveMessage` object bhejo toh wo message state se hata diya jata hai (useful hai jab tum trimming/summarization karte ho).

```python
from langchain_core.messages import AIMessage, RemoveMessage

# Existing state: {"messages": [HumanMessage(id="1", content="hi"), AIMessage(id="2", content="hello")]}

# Case 1: naya message (new id) -> appended
{"messages": [HumanMessage(id="3", content="how are you?")]}

# Case 2: same id ka message -> update (in-place replace, append nahi)
{"messages": [AIMessage(id="2", content="hello there!")]}

# Case 3: message delete karna
{"messages": [RemoveMessage(id="1")]}
```

### `MessagesState` — Ready-Made Shortcut

Har baar `Annotated[list[BaseMessage], add_messages]` likhna repetitive hai, isliye LangGraph ek pre-built state class deta hai:

```python
from langgraph.graph import MessagesState

# Ye equivalent hai:
# class MessagesState(TypedDict):
#     messages: Annotated[list[BaseMessage], add_messages]

# Tum ise extend bhi kar sakte ho apni custom fields ke saath:
class MyState(MessagesState):
    user_name: str
    session_id: str
```

> [!info]
> Production mein zyadatar chatbot/agent graphs `MessagesState` se hi shuru hote hain aur upar apni domain-specific fields add karte hain — jaise IRCTC booking agent mein `MessagesState` + `pnr_status`, `selected_train` waghera.

### Message Flow Example

```python
from langchain_core.messages import HumanMessage

# 1. User message state mein aata hai
initial_state = {
    "messages": [HumanMessage(content="Delhi se Mumbai ka weather kaisa hai?")]
}

# 2. LLM node messages padhta hai, LLM call karta hai, response append karta hai
def call_llm(state):
    response = llm.invoke(state["messages"])
    return {"messages": [response]}  # add_messages se appended

# 3. Agar LLM ne tool call kiya, tool node execute karke result append karta hai
def run_tools(state):
    tool_call = state["messages"][-1].tool_calls[0]
    result = execute_tool(tool_call)
    return {"messages": [ToolMessage(content=result, tool_call_id=tool_call["id"])]}

# 4. Messages accumulate hote jate hain:
# [HumanMessage, AIMessage(tool_calls=...), ToolMessage, AIMessage(final answer)]
```

Notice karo — koi bhi node poori `messages` list ko manually manage nahi kar raha. Har node sirf apna naya message return karta hai, aur reducer baaki sambhal leta hai. Yehi reducers ka poora point hai — **nodes ko ek-doosre ke updates ke baare mein sochna nahi padta.**

---

## Shared State Accidentally Overwrite Hone Se Kaise Bachein

Ye section production bugs ka most common source cover karta hai. Chaliye real scenarios dekhte hain.

### Mistake 1: Parallel Nodes Same Key Update Kar Rahe Hain, Bina Reducer Ke

Socho tumhara graph 3 tools parallel mein call karta hai — weather, news, aur stock price — aur teeno apna result `results` key mein daalte hain:

```python
class BadState(TypedDict):
    results: list[str]   # NO REDUCER!

def weather_node(state):
    return {"results": ["Weather: 32°C"]}

def news_node(state):
    return {"results": ["News: Sensex up 200 points"]}

def stock_node(state):
    return {"results": ["Stock: TCS up 2%"]}
```

Agar ye teeno parallel (fan-out) execute hote hain aur reducer nahi hai, toh **LangGraph error throw karega** — kyunki ek hi super-step mein multiple nodes ne same key update kar di aur system decide nahi kar pa raha replace kaunsa jeetega. Isse ye error milta hai:

```
InvalidUpdateError: At key 'results': Can receive only one value per step...
```

**Fix**: reducer lagao taaki concurrent updates merge ho sakein.

```python
import operator
from typing import Annotated

class GoodState(TypedDict):
    results: Annotated[list[str], operator.add]
```

Ab teeno nodes ka output cleanly merge ho jayega: `["Weather: 32°C", "News: Sensex up 200 points", "Stock: TCS up 2%"]` (order guaranteed nahi hota parallel execution mein, lekin sab present honge).

> [!warning]
> Agar tumhare graph mein **koi bhi do nodes parallel chal sakte hain** (fan-out pattern, ya conditional edges jo multiple branches trigger karte hain) aur wo same state key touch karte hain, toh us key pe reducer **hona hi chahiye**. Warna graph runtime pe crash karega ya (aur bhi khatarnak) silently galat data rakhega.

### Mistake 2: Poora Object Return Karna Jab Sirf Ek Field Change Hui Ho

Agar node function **poora state dictionary** return karta hai instead of sirf changed keys, toh tum accidentally doosre fields ko unintentionally overwrite kar sakte ho — especially agar tumne state ko locally mutate karke wapas bhej diya, aur beech mein doosra concurrent node bhi usi state pe kaam kar raha tha.

```python
# GALAT PATTERN
def update_status(state: OrderState) -> dict:
    state["status"] = "shipped"  # in-place mutation
    return state  # poora dict return, including stale fields

# BEHTAR PATTERN
def update_status(state: OrderState) -> dict:
    return {"status": "shipped"}  # sirf changed key
```

Sirf changed keys return karna is ek golden rule hai — jaise Redux mein hum poora store replace nahi karte, sirf reducer se partial update dispatch karte hain, waisa hi yahan bhi.

### Mistake 3: Mutable Default Ko Reducer Ke Bina Share Karna

Python mein mutable objects (`list`, `dict`) ko directly state mein rakhkar node ke andar `.append()` karna dangerous hai kyunki tum LangGraph ke checkpointing/reducer pipeline ko bypass kar rahe ho:

```python
# GALAT: state ko directly mutate mat karo
def add_item(state):
    state["items"].append("naya item")   # side-effect, reducer bypass
    return {}   # LangGraph ko pata hi nahi chalega kuch update hua

# SAHI: naya list return karo, reducer merge karega
def add_item(state):
    return {"items": ["naya item"]}   # operator.add reducer merge karega
```

Node functions ko **pure functions** ki tarah treat karo — input state padho, naya partial output return karo, state object ko directly mutate mat karo.

---

## Custom Reducer Functions

Built-in reducers (`operator.add`, `add_messages`) kaafi cases cover karte hain, lekin production agents mein aksar custom logic chahiye hoti hai — jaise sirf top-N scores rakhna, ya duplicates avoid karna. Reducer bas ek function hai jo `(existing, new)` leta hai aur merged result return karta hai.

### Example 1: Bounded List (Last N Items Rakho)

Context window overflow se bachne ke liye — jaise ek support-chat agent sirf last 20 messages yaad rakhe:

```python
from typing import Annotated, TypedDict
from langchain_core.messages import BaseMessage

def keep_last_n(n: int):
    """Ek reducer banata hai jo sirf last N items rakhta hai."""
    def reducer(existing: list, new: list) -> list:
        combined = existing + new
        return combined[-n:]
    return reducer

class BoundedState(TypedDict):
    # Sirf last 20 messages rakho, taaki context overflow na ho
    messages: Annotated[list[BaseMessage], keep_last_n(20)]
```

### Example 2: Deduplication

Socho tum ek research agent bana rahe ho jo multiple search tools se URLs collect karta hai — same URL baar-baar aa sakta hai:

```python
def deduplicate(existing: list[str], new: list[str]) -> list[str]:
    """Item sirf tabhi add karo jab pehle se present na ho."""
    seen = set(existing)
    result = list(existing)
    for item in new:
        if item not in seen:
            result.append(item)
            seen.add(item)
    return result

class DeduplicatedState(TypedDict):
    source_urls: Annotated[list[str], deduplicate]
```

### Example 3: Top-K Scores (Sorted + Capped)

Ek recommendation ya ranking agent jo candidates ko score karta hai aur sirf top 5 rakhna chahta hai:

```python
def keep_top_k(k: int):
    def reducer(existing: list[float], new: list[float]) -> list[float]:
        return sorted(existing + new, reverse=True)[:k]
    return reducer

class ScoringState(TypedDict):
    scores: Annotated[list[float], keep_top_k(5)]
```

### Example 4: Dict Merge (Shallow Merge Instead of Replace)

Agar state mein ek `metadata: dict` field hai jisme alag-alag nodes alag keys add karte hain (jaise `{"weather_checked": True}`, `{"payment_verified": True}`), toh default replace behaviour ek node ke update se doosre ke updates udaa dega. Dict-merge reducer likho:

```python
def merge_dicts(existing: dict, new: dict) -> dict:
    """Shallow merge -- naye keys/values existing mein add/overwrite ho jate hain."""
    return {**existing, **new}

class MetadataState(TypedDict):
    metadata: Annotated[dict, merge_dicts]
```

```python
# Node A returns: {"metadata": {"weather_checked": True}}
# Node B returns: {"metadata": {"payment_verified": True}}
# Merged result:   {"weather_checked": True, "payment_verified": True}
```

Bina reducer ke, Node B ka update Node A ka `weather_checked` flag udaa deta — classic overwrite bug.

> [!tip]
> Reducer likhte waqt hamesha **pure function** likho — koi external state modify mat karo, sirf `existing` aur `new` se compute karke naya value return karo. Ye deterministic aur testable rehta hai, jo debugging ke liye zaruri hai.

---

## State Channels: Reducers Kaam Kaise Karte Hain, Under the Hood

LangGraph internally har state key ko ek **channel** ki tarah treat karta hai. `Annotated` type hint us channel ka behaviour configure karta hai — reducer function decide karta hai naya data purane ke saath kaise combine hoga.

```python
from typing import Annotated
import operator
from langchain_core.messages import BaseMessage
from langgraph.graph import add_messages

class FullFeaturedState(TypedDict):
    # Smart message handling wala channel
    messages: Annotated[list[BaseMessage], add_messages]

    # List-append wala channel
    documents: Annotated[list[str], operator.add]

    # Simple replace wala channel (default, annotation ki zaroorat nahi)
    status: str

    # Custom reducer wala channel
    scores: Annotated[list[float], lambda old, new: sorted(old + new, reverse=True)[:10]]
```

Har graph "super-step" mein (jab ek ya zyada nodes parallel execute hote hain), LangGraph:

1. Har node ka partial return collect karta hai.
2. Har touched channel ke liye uska reducer function call karta hai: `new_value = reducer(current_channel_value, node_output_for_this_key)`.
3. Agar do parallel nodes same channel touch karte hain, unke outputs ek saath reducer ko diye jate hain (list reducers ke liye ye sequentially combine ho jate hain; agar reducer specify nahi hai toh conflict error aata hai — jaisa upar dekha).
4. Updated state agla super-step ko milta hai.

Ye pattern Redux ke reducer pattern se kaafi milta-julta hai (agar tum Node/React background se aa rahe ho): action (node output) dispatch hoti hai, reducer decide karta hai naya state kaisa banega.

**TypeScript/Redux comparison:**

```typescript
// Redux reducer -- concept LangGraph ke channel reducer jaisa hi hai
function messagesReducer(state = [], action) {
  switch (action.type) {
    case "ADD_MESSAGE":
      return [...state, action.payload];   // operator.add jaisa
    case "UPDATE_MESSAGE":
      return state.map(m => m.id === action.payload.id ? action.payload : m); // add_messages jaisa
    default:
      return state;
  }
}
```

---

## Typed State Channels: `TypedDict` vs `Pydantic` vs `dataclass`

LangGraph mein state schema define karne ke 3 tareeke hain. Sabme reducers same tarah kaam karte hain (`Annotated` ke through), bas validation aur ergonomics alag hote hain.

### 1. `TypedDict` (Sabse Common, Lightweight)

```python
from typing import Annotated, TypedDict
import operator

class State(TypedDict):
    messages: Annotated[list, operator.add]
    status: str
```

- Fast, koi runtime validation overhead nahi.
- Lekin koi validation bhi nahi — galat type pass karoge toh runtime error tabhi aayega jab wo field actually use hogi.

### 2. Pydantic `BaseModel` (Runtime Validation Chahiye Toh)

```python
from pydantic import BaseModel
from typing import Annotated
import operator

class State(BaseModel):
    messages: Annotated[list, operator.add] = []
    status: str = "pending"
    iteration_count: int = 0
```

Pydantic use karne ka fayda — agar koi node galat type return kare (jaise `status` ko `int` bana de), toh LangGraph turant validation error dega, silent bug nahi banega. Production-grade agents mein, jahan reliability critical hai, Pydantic state highly recommended hai.

### 3. `dataclasses` (TypedDict Aur Pydantic Ke Beech Ka Option)

```python
from dataclasses import dataclass, field
from typing import Annotated
import operator

@dataclass
class State:
    messages: Annotated[list, operator.add] = field(default_factory=list)
    status: str = "pending"
```

> [!info]
> Beginners ke liye `TypedDict` se shuru karo — LangChain/LangGraph documentation aur tutorials mein most examples isi mein hain. Jab production reliability chahiye (validation, better error messages), Pydantic pe migrate karo.

---

## Full Runnable Example: Reducers Milke Kaise Kaam Karte Hain

Chaliye ek complete example dekhte hain jisme multiple reducer types ek saath use ho rahe hain — jaisa ek real "research assistant" agent mein hota hai.

```python
from typing import Annotated, TypedDict
from langchain_core.messages import BaseMessage, HumanMessage
from langgraph.graph import StateGraph, START, END, add_messages
import operator


def deduplicate(existing: list[str], new: list[str]) -> list[str]:
    seen = set(existing)
    result = list(existing)
    for item in new:
        if item not in seen:
            result.append(item)
            seen.add(item)
    return result


class ResearchState(TypedDict):
    # Chat history -- smart merge/update by id
    messages: Annotated[list[BaseMessage], add_messages]

    # Sources collected across multiple search calls -- dedup hokar accumulate
    sources: Annotated[list[str], deduplicate]

    # Raw scratch notes -- simple append
    notes: Annotated[list[str], operator.add]

    # Current phase -- replace hi hota hai, reducer nahi chahiye
    phase: str


def search_web(state: ResearchState) -> dict:
    # yahan real search tool call hota (Tavily, SerpAPI, etc.)
    return {
        "sources": ["https://example.com/langgraph-docs"],
        "notes": ["Found official LangGraph docs"],
        "phase": "searching",
    }


def search_academic(state: ResearchState) -> dict:
    # ek dusra parallel search node, alag source se
    return {
        "sources": ["https://example.com/langgraph-docs", "https://arxiv.org/paper123"],
        "notes": ["Found related academic paper"],
        "phase": "searching",
    }


def summarize(state: ResearchState) -> dict:
    combined_notes = " | ".join(state["notes"])
    summary = f"Summary based on {len(state['sources'])} sources: {combined_notes}"
    return {
        "messages": [HumanMessage(content=summary)],  # demo ke liye HumanMessage use kiya
        "phase": "completed",
    }


graph = StateGraph(ResearchState)
graph.add_node("search_web", search_web)
graph.add_node("search_academic", search_academic)
graph.add_node("summarize", summarize)

# Dono search nodes parallel (fan-out) chalte hain
graph.add_edge(START, "search_web")
graph.add_edge(START, "search_academic")
graph.add_edge("search_web", "summarize")
graph.add_edge("search_academic", "summarize")
graph.add_edge("summarize", END)

app = graph.compile()

result = app.invoke({
    "messages": [],
    "sources": [],
    "notes": [],
    "phase": "start",
})

print("Total unique sources:", len(result["sources"]))
# 2 -- duplicate URL automatically skipped by deduplicate reducer
print("Notes collected:", result["notes"])
# ['Found official LangGraph docs', 'Found related academic paper']
print("Final phase:", result["phase"])
# "completed" -- last write wins kyunki koi reducer nahi
```

Is example mein teen alag reducers ek saath kaam kar rahe hain — `add_messages` chat ke liye, custom `deduplicate` sources ke liye, aur `operator.add` notes ke liye — jabki `phase` simple replace field hai. Isi tarah production agents mein tum apni domain-specific channels design karte ho.

---

## Gotchas Aur Common Mistakes

1. **List field pe reducer bhoolna** — sabse common bug. Har list-type state field ke liye khud se poochho: "kya iska history/accumulation zaruri hai?" Agar haan, reducer lagao.

2. **`operator.add` ko messages ke liye use karna jab tumhe ID-based updates chahiye** — streaming responses ya tool-call linked updates ke liye `add_messages` use karo, `operator.add` nahi.

3. **Parallel nodes same key touch karte hain bina reducer ke** — `InvalidUpdateError` milega. Fan-out pattern use kar rahe ho toh pehle hi socho konsi keys concurrent update ho sakti hain.

4. **State object ko directly mutate karna** — `state["items"].append(x)` karke `{}` return karna kaam nahi karega. Hamesha naya partial dict return karo.

5. **Reducer ke andar side-effects daalna** (jaise DB write, API call) — reducer pure function hona chahiye, sirf data merge karna uska kaam hai.

6. **Unbounded list growth** — agar tum `operator.add` use kar rahe ho messages/logs ke liye aur koi capping nahi hai, toh long-running conversations mein state bahut bada ho jayega — LLM context window overflow aur checkpoint storage cost dono badhenge. `keep_last_n` jaisa bounded reducer, ya periodic summarization use karo.

7. **Reducer function ko module-level define na karna** — agar tum reducer ko closures/lambdas ke through define kar rahe ho (jaise `keep_last_n(20)`), sunishchit karo ki ye deterministic hai aur koi mutable default argument trap nahi hai.

> [!warning]
> Production mein agar tumhara agent Human-in-the-loop pattern use karta hai (state ko pause karke insaan se input leta hai), toh reducer ka behaviour aur bhi critical ho jata hai — kyunki human jo bhi partial update bhejega, wo bhi reducer se hi merge hoga. Galat reducer se human ka manual correction bhi silently discard ho sakta hai.

---

## Key Takeaways

- **Reducers** decide karte hain ki state update **replace** hoga ya **merge** — bina reducer ke default behaviour hamesha replace hai, jo lists ke liye almost hamesha galat hota hai.
- `Annotated[list, operator.add]` sabse common pattern hai simple append-only lists (logs, intermediate results) ke liye.
- `add_messages` ek specialized reducer hai chat messages ke liye — append + ID-based update + `RemoveMessage` support deta hai. `MessagesState` isko already built-in include karta hai.
- **Custom reducers** ek simple `(existing, new) -> merged` function hote hain — dedup, bounded lists, top-K, dict merge jaisa kuch bhi implement kar sakte ho.
- **Parallel nodes jo same key touch karte hain, unke liye reducer zaruri hai** — warna `InvalidUpdateError` ya silent data loss hoga.
- Node functions **pure honi chahiye**: state ko mutate mat karo, sirf changed keys ka partial dict return karo.
- State schema `TypedDict` (lightweight), `Pydantic BaseModel` (runtime validation), ya `dataclass` se define kar sakte ho — reducers teeno mein `Annotated` ke through hi kaam karte hain.
- Unbounded accumulation se bacho — bounded reducers ya summarization use karke context window aur storage cost control mein rakho.
