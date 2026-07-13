# Human-in-the-Loop

🔴 Production-grade

## Kya hota hai?

Socho ek second ke liye — tumne ek AI agent banaya hai jo tumhare company ke liye emails bhejta hai, database records delete karta hai, ya payments process karta hai. Ab agent overconfident nikla aur usne galat customer ko refund bhej diya, ya production database se galat table delete kar di. Kaun jawabdaar hai? Tum.

Yehi wo jagah hai jahan **Human-in-the-Loop (HITL)** kaam aata hai. Idea simple hai: agent apna kaam kare, lekin **high-stakes ya irreversible actions** se pehle ruk jaaye aur ek insaan se poochhe — "Bhai, ye karun?" Insaan approve kare to aage badho, reject kare to ruk jao ya kuch aur karo.

LangGraph mein ye feature **first-class support** ke saath aata hai — graph ek designated point par pause ho jaata hai, apni poori state save kar leta hai, aur jab tak human input nahi aata, wahi ruka rehta hai. Baad mein exact usi jagah se resume ho jaata hai jahan se ruka tha.

**Real-world analogy — Swiggy delivery partner assignment:** Jab tum Swiggy pe order place karte ho, system automatically ek delivery partner assign kar sakta hai. Lekin bade orders (bulk catering, high-value items) mein system pehle restaurant manager ko notify karta hai — "Ye order confirm karna hai?" — aur jab tak manager approve nahi karta, order kitchen mein nahi jaata. Poora order-state (items, address, payment) meanwhile safe rehta hai, koi data loss nahi hota.

**Node.js analogy:** Ye bilkul waisa hai jaise ek Express route `202 Accepted` return kare with a task ID, aur client WebSocket ya polling se approve/reject bheje before backend processing continue kare. Farak sirf itna hai ki LangGraph ye "pause-and-resume" pattern tumhare liye built-in deta hai — tumhe khud queue, polling, webhook sab manually implement nahi karna padta.

## Kyun zaruri hai?

Agentic AI systems mein ye scenarios common hain jahan **bina human check ke agent ko chhodna risky hai**:

| Scenario | Kya galat ho sakta hai | HITL kaise bachata hai |
|---|---|---|
| Email bhejna | Galat recipient, galat content, spam-jaisa tone | Human draft dekh kar approve/edit kare |
| Payment/refund process karna | Galat amount, galat account, duplicate payment | Human amount aur account verify kare |
| Database record delete karna | Irreversible data loss, galat row delete | Human confirm kare kaunsa record delete ho raha hai |
| Production code deploy karna | Breaking change, downtime | Human diff review kare, phir deploy |
| Legal/compliance content publish karna | Galat claims, liability issues | Legal team review kare pehle |
| Customer ko sensitive info bhejna | Privacy violation, data leak | Human content check kare |

Bina HITL ke, ek fully-autonomous agent production mein chhodna waise hi hai jaise ek naya intern ko company ka bank account ka password de dena aur bolna "jo sahi lage karo." Agent smart hai, lekin **accountability aur oversight** ke bina high-stakes actions dena dangerous hai.

> [!warning]
> Agent hallucinate kar sakta hai, wrong tool call kar sakta hai, ya edge case miss kar sakta hai. Jab tak agent ka track record thoroughly test na ho, koi bhi **irreversible ya costly action** (payment, delete, email, deploy) ke liye human approval gate zaruri hai.

---

## Prerequisite: Checkpointer Chahiye

Human-in-the-loop kaam karne ke liye **checkpointer mandatory hai**. Kyun? Kyunki jab graph pause hota hai, uski poori state (messages, variables, jo bhi state schema mein hai) kahin save honi chahiye — warna resume karne par graph ko pata hi nahi chalega ki wo kahan tak pahuncha tha.

```python
from langgraph.checkpoint.memory import InMemorySaver

memory = InMemorySaver()

app = graph.compile(
    checkpointer=memory,
    interrupt_before=["execute_action"],  # is node se PEHLE ruk jao
)
```

> [!info]
> `InMemorySaver` sirf development/testing ke liye hai — process restart hone par state gayab ho jaati hai. Production mein `PostgresSaver`, `SqliteSaver`, ya `RedisSaver` jaisa persistent checkpointer use karo, taaki server restart hone par bhi paused agents apni state se resume ho sakein.

```python
from langgraph.checkpoint.postgres import PostgresSaver

DB_URI = "postgresql://user:password@localhost:5432/agent_db"

with PostgresSaver.from_conn_string(DB_URI) as checkpointer:
    checkpointer.setup()  # tables create karta hai agar exist nahi karte
    app = graph.compile(checkpointer=checkpointer)
```

Har checkpoint ek `thread_id` se identify hota hai — Zomato ke order-tracking jaisa samjho, jahan har order (thread) ka apna alag status hota hai, aur tum kisi bhi order ka status kabhi bhi check kar sakte ho.

```python
config = {"configurable": {"thread_id": "user-42-request-7"}}
```

---

## Do Purane Approaches: `interrupt_before` aur `interrupt_after`

LangGraph mein pehle se hi do simple static interrupt options hain jo **compile time** par set hote hain. Ye poore node ko pause karte hain — node ke andar granular control nahi milta.

### `interrupt_before`

Graph specified node ke **chalne se pehle** ruk jaata hai. Node abhi tak execute nahi hua — tum state inspect kar sakte ho, modify kar sakte ho, phir resume kar sakte ho.

```python
app = graph.compile(
    checkpointer=memory,
    interrupt_before=["execute_action"],
)
```

**Use case:** Agent ne action propose kiya. Human review karke approve kare, tabhi wo run ho.

### `interrupt_after`

Graph specified node ke **chal jaane ke baad** ruk jaata hai. Node ka output state mein aa chuka hai, lekin graph agle node par nahi gaya.

```python
app = graph.compile(
    checkpointer=memory,
    interrupt_after=["generate_draft"],
)
```

**Use case:** Agent content generate karta hai. Human output review kare before publish step.

### Dono Together

```python
app = graph.compile(
    checkpointer=memory,
    interrupt_before=["send_email"],
    interrupt_after=["generate_email"],
)
```

---

## Basic Approval Workflow — Full Example

Ab ek complete example dekhte hain: agent ek action propose karta hai, human approve karta hai, tabhi execute hota hai.

```python
from typing import TypedDict, Annotated
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, START, END, add_messages
from langgraph.checkpoint.memory import InMemorySaver


class ApprovalState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    proposed_action: str
    approved: bool


llm = ChatOpenAI(model="gpt-4o-mini")


def plan_action(state: ApprovalState) -> dict:
    """Agent conversation dekh kar ek specific action propose karta hai."""
    response = llm.invoke([
        {"role": "system", "content": "User ki request ke basis par ek specific action "
                                       "propose karo. Action clearly state karo."},
        *state["messages"],
    ])
    return {
        "messages": [response],
        "proposed_action": response.content,
    }


def execute_action(state: ApprovalState) -> dict:
    """Approved action ko execute karta hai."""
    # Production mein yahan real API call hoga — email bhejna, payment karna, etc.
    action = state["proposed_action"]
    result = f"Action execute ho gaya: {action}"
    return {"messages": [AIMessage(content=result)]}


def format_response(state: ApprovalState) -> dict:
    return {"messages": [AIMessage(content="Ho gaya! Action complete hua.")]}


# Graph banao
graph = StateGraph(ApprovalState)
graph.add_node("plan", plan_action)
graph.add_node("execute", execute_action)
graph.add_node("respond", format_response)

graph.add_edge(START, "plan")
graph.add_edge("plan", "execute")
graph.add_edge("execute", "respond")
graph.add_edge("respond", END)

# "execute" node se PEHLE interrupt lagao
memory = InMemorySaver()
app = graph.compile(
    checkpointer=memory,
    interrupt_before=["execute"],
)

# --- Step 1: User request karta hai, agent plan banata hai ---
config = {"configurable": {"thread_id": "approval-demo"}}

result = app.invoke(
    {"messages": [HumanMessage(content="Team ko Friday ki meeting ke baare mein email bhejo.")]},
    config=config,
)

# Graph "execute" se PEHLE ruk gaya
print("Agent ne propose kiya:", result.get("proposed_action", ""))
print("Graph paused hai. Approval ka wait ho raha hai...")

# --- Step 2: State check karo ---
state = app.get_state(config)
print("Agla node jo chalega:", state.next)
# Output: ('execute',)

# --- Step 3: Human approve karta hai aur resume karta hai ---
# Resume karne ke liye None invoke karo -- graph wahin se continue hota hai jahan ruka tha
result = app.invoke(None, config=config)
print("Final:", result["messages"][-1].content)
```

> [!tip]
> `app.invoke(None, config=config)` ka matlab hai "koi naya input nahi, bas resume karo." Graph apni saved checkpoint state uthata hai aur `state.next` mein jo node hai wahin se aage chalta hai.

---

## Interruption Ke Dauran State Modify Karna

Asli power ye hai ki resume karne se pehle tum **state change kar sakte ho**. Agent ne kuch propose kiya, lekin human usme adjustment chahta hai.

```python
# Graph pause hone ke baad...
state = app.get_state(config)
print("Proposed:", state.values["proposed_action"])

# Human action modify karta hai
app.update_state(
    config,
    {
        "proposed_action": "Team ko Friday 3pm Conference Room B mein meeting ke baare mein email bhejo",
        "messages": [HumanMessage(content="Modify kiya: time aur location add kiya.")],
    },
)

# Modified state ke saath resume karo
result = app.invoke(None, config=config)
```

Ye Swiggy order customize karne jaisa hai — order place ho chuka, restaurant tak abhi nahi gaya, aur tum last moment mein "extra spicy" add kar sakte ho before restaurant confirm kare.

---

## Action Ko Reject Karna

Agar human puri tarah reject karna chahta hai, to state modify karke node ko **skip** kiya ja sakta hai:

```python
# State update karo aur "execute" node se aaya hua treat karo (skip karne ke liye)
app.update_state(
    config,
    {"proposed_action": "REJECTED", "messages": [HumanMessage(content="Main ye action reject karta hoon.")]},
    as_node="execute",  # Pretend karo ye update "execute" node se aaya -- effectively skip
)

# Resume -- graph "execute" ke BAAD se continue hota hai (seedha "respond" par jaayega)
result = app.invoke(None, config=config)
```

`as_node` parameter yahan key hai: ye LangGraph ko batata hai ki tumhara update us specified node se aaya hai jaisa treat karo. Isse effectively wo node skip ho jaata hai aur graph seedha uske baad wale node par chala jaata hai.

> [!warning]
> `as_node` ka misuse dangerous ho sakta hai — agar galat node specify kiya, to graph unexpected path le sakta hai. Isse production mein use karne se pehle thoroughly test karo, aur reject-flow ke liye explicit conditional edge banana usually zyada readable aur safe hota hai (jaisa neeche example mein dikhaya hai).

---

## Modern Approach: `interrupt()` Function

`interrupt_before`/`interrupt_after` static hain — poore node ko block karte hain, node ke andar granular control nahi milta. LangGraph ki current recommended approach **`interrupt()` function** hai jo node ke **andar** kahin bhi call ki ja sakti hai — bilkul ek breakpoint ki tarah.

```python
from langgraph.types import interrupt, Command
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import StateGraph, START, END
from typing import TypedDict


class EmailState(TypedDict):
    topic: str
    result: str


def send_email_node(state: EmailState) -> dict:
    """Node jo beech mein approval ke liye rukta hai."""
    proposed = f"Email bhejne wale hain: '{state['topic']}' subject ke saath"

    # Ye line execution ko PAUSE kar deti hai aur human ko data bhejti hai
    human_response = interrupt({
        "question": "Kya tum is action ko approve karte ho?",
        "proposed_action": proposed,
    })

    # Jab resume hoga, human_response mein wahi hoga jo human ne diya
    if human_response.get("approved"):
        return {"result": f"Executed: {proposed}"}
    else:
        return {"result": "Human ne action reject kar diya."}


graph = StateGraph(EmailState)
graph.add_node("send_email", send_email_node)
graph.add_edge(START, "send_email")
graph.add_edge("send_email", END)

memory = InMemorySaver()
app = graph.compile(checkpointer=memory)

config = {"configurable": {"thread_id": "email-thread-1"}}

# --- Step 1: Pehla invoke -- interrupt() tak pahunchega aur ruk jaayega ---
result = app.invoke({"topic": "Q3 Sales Report", "result": ""}, config=config)
print(result["__interrupt__"])
# Output: Interrupt(value={'question': 'Kya tum is action ko approve karte ho?', ...})

# --- Step 2: Human approve karta hai, Command(resume=...) se continue karo ---
result = app.invoke(Command(resume={"approved": True}), config=config)
print(result["result"])
# Output: Executed: Email bhejne wale hain: 'Q3 Sales Report' subject ke saath
```

### `interrupt()` vs `interrupt_before`/`interrupt_after`

| Feature | `interrupt_before` / `interrupt_after` | `interrupt()` |
|---|---|---|
| Kahan pause hota hai | Poore node se pehle/baad — compile-time config | Node ke andar, kisi bhi line par — runtime control |
| Human ko data bhejna | `get_state()` se manually nikaalna padta hai | `interrupt(payload)` seedha data bhej deta hai |
| Resume karna | `app.invoke(None, config)` | `app.invoke(Command(resume=value), config)` |
| Granularity | Node-level | Line-level — ek node mein multiple interrupts bhi ho sakte hain |
| Recommended for | Simple/legacy flows | Naye projects — ye current best practice hai |

> [!tip]
> Agar naya project shuru kar rahe ho, `interrupt()` + `Command(resume=...)` use karo. Ye zyada flexible hai aur LangGraph team isi direction mein aage badh rahi hai. `interrupt_before`/`interrupt_after` samajhna zaruri hai kyunki purane codebases mein milega, lekin naye code mein `interrupt()` prefer karo.

### `interrupt()` Kaise Kaam Karta Hai Internally

Jab `interrupt()` call hota hai:
1. Graph turant execution rok deta hai aur current state ko checkpoint mein save karta hai.
2. `interrupt()` ka argument (jo bhi dict/value tumne diya) `__interrupt__` key ke through caller ko wapas milta hai.
3. Jab tum `Command(resume=value)` ke saath dubara `invoke()` karte ho, LangGraph **usi node ko dubara se run karta hai** — lekin is baar `interrupt()` call turant `value` return kar deti hai (block nahi karti), aur node ka baaki code aage chalta hai.

> [!warning]
> **Gotcha:** Kyunki node re-run hota hai, `interrupt()` se PEHLE wala code bhi dubara chalega! Agar us code mein koi side-effect hai (jaise API call, counter increment), wo **duplicate** ho sakta hai. Isliye `interrupt()` ko node ke shuru mein rakhna best practice hai, aur side-effects wale steps ko `interrupt()` ke BAAD rakho, taaki wo sirf approval milne ke baad ek hi baar chalein.

```python
def risky_node(state):
    # BAD: ye API call re-run hogi jab node interrupt ke baad dubara chalega
    # log_analytics_event("node_started")

    approved = interrupt({"action": state["proposed_action"]})

    if approved:
        # GOOD: ye sirf resume ke baad ek hi baar chalta hai
        send_actual_email(state["proposed_action"])
        return {"status": "sent"}
    return {"status": "cancelled"}
```

---

## Multiple Interrupts Ek Node Mein

`interrupt()` ka fayda ye hai ki ek hi node mein **multiple sequential approvals** bhi le sakte ho — jaise IRCTC ka multi-step booking flow (passenger details confirm karo, phir payment confirm karo).

```python
def booking_node(state):
    passenger_ok = interrupt({"step": "Passenger details confirm karo", "data": state["passengers"]})
    if not passenger_ok:
        return {"status": "cancelled_at_passenger_step"}

    payment_ok = interrupt({"step": "Payment confirm karo", "amount": state["amount"]})
    if not payment_ok:
        return {"status": "cancelled_at_payment_step"}

    return {"status": "booking_confirmed"}
```

Har `interrupt()` call apna alag pause point banata hai. Resume karte waqt LangGraph automatically track karta hai ki tum kaunse interrupt ka jawab de rahe ho (order maintain hota hai).

---

## Real-World Example: High-Stakes Payment Agent

Ek production-jaisa example — agent payment process karta hai, lekin ek threshold se upar amount hone par human approval mandatory hai (bilkul Paytm/UPI ki tarah jahan bade amount ke transactions extra verification maangte hain).

```python
from typing import TypedDict
from langgraph.types import interrupt, Command
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import InMemorySaver

APPROVAL_THRESHOLD = 5000  # ₹5000 se upar approval chahiye


class PaymentState(TypedDict):
    amount: float
    recipient: str
    status: str


def process_payment(state: PaymentState) -> dict:
    amount = state["amount"]
    recipient = state["recipient"]

    if amount > APPROVAL_THRESHOLD:
        decision = interrupt({
            "message": f"₹{amount} ka payment {recipient} ko bhejna hai. High amount hai — approve karo?",
            "amount": amount,
            "recipient": recipient,
        })

        if not decision.get("approved"):
            return {"status": f"REJECTED: Payment cancel kiya gaya ({decision.get('reason', 'no reason')})"}

    # Yahan tak pahunche matlab: ya to threshold ke andar tha, ya human ne approve kar diya
    # Production mein: actual payment gateway API call yahan hoga
    return {"status": f"SUCCESS: ₹{amount} bheja gaya {recipient} ko"}


graph = StateGraph(PaymentState)
graph.add_node("pay", process_payment)
graph.add_edge(START, "pay")
graph.add_edge("pay", END)

memory = InMemorySaver()
app = graph.compile(checkpointer=memory)

config = {"configurable": {"thread_id": "payment-txn-9981"}}

# Chhota amount -- seedha ho jaayega, koi interrupt nahi
result = app.invoke({"amount": 500, "recipient": "Ramesh Kirana Store", "status": ""}, config=config)
print(result["status"])
# Output: SUCCESS: ₹500 bheja gaya Ramesh Kirana Store ko

# Bada amount -- interrupt aayega
config2 = {"configurable": {"thread_id": "payment-txn-9982"}}
result = app.invoke({"amount": 25000, "recipient": "Unknown Vendor Pvt Ltd", "status": ""}, config=config2)
print(result["__interrupt__"])
# Output: Interrupt(value={'message': '₹25000 ka payment...', 'amount': 25000, ...})

# Human dashboard par ye request dekhta hai, reject karta hai kyunki vendor unfamiliar hai
result = app.invoke(Command(resume={"approved": False, "reason": "Vendor verify nahi hua"}), config=config2)
print(result["status"])
# Output: REJECTED: Payment cancel kiya gaya (Vendor verify nahi hua)
```

---

## Use Cases: HITL Kahan Kahan Lagana Chahiye

### 1. Tool Approval (Agent Tool Calls Se Pehle)

```python
def call_tool_with_approval(state):
    last_msg = state["messages"][-1]
    for tool_call in last_msg.tool_calls:
        decision = interrupt({
            "tool": tool_call["name"],
            "args": tool_call["args"],
            "question": f"Agent '{tool_call['name']}' call karna chahta hai in args ke saath: {tool_call['args']}. Approve?",
        })
        if not decision.get("approved"):
            return {"messages": [{"role": "tool", "content": "User ne tool call reject kiya.", "tool_call_id": tool_call["id"]}]}
    # Approved -- actual tool execution yahan
```

### 2. Data Validation (Extraction Ke Baad, Save Se Pehle)

```python
def validate_before_save(state):
    extracted = state["extracted_data"]
    decision = interrupt({
        "message": "Extracted data verify karo save karne se pehle.",
        "data": extracted,
    })
    if decision.get("corrections"):
        return {"extracted_data": {**extracted, **decision["corrections"]}}
    return {}
```

### 3. Multi-Stage Approval Pipeline

Different reviewers alag alag stages par — jaise ek company mein expense approval: manager -> finance -> final sign-off.

```python
def legal_review(state):
    result = interrupt({"stage": "legal", "content": state["content"]})
    return {"legal_approved": result.get("approved", False)}

def compliance_check(state):
    result = interrupt({"stage": "compliance", "content": state["content"]})
    return {"compliance_approved": result.get("approved", False)}
```

### 4. Interactive Agent (Clarifying Questions)

```python
def ask_clarifying_question(state):
    answer = interrupt({"question": "Tumhara budget range kya hai?"})
    return {"budget": answer}
```

---

## Checkpoints Aur Resume — Deep Dive

### `get_state()` Se Current Position Check Karna

```python
state = app.get_state(config)

print(state.values)   # current state values (dict)
print(state.next)     # agla node jo chalega, tuple mein -- e.g. ('execute',)
print(state.tasks)    # pending tasks -- interrupt() use karne par isme interrupt info bhi milega
```

`interrupt()` use karne par, `state.tasks` mein interrupt ka pura payload milta hai:

```python
for task in state.tasks:
    if task.interrupts:
        for i in task.interrupts:
            print("Interrupt value:", i.value)
```

### `get_state_history()` Se Poori Timeline Dekhna

```python
for checkpoint in app.get_state_history(config):
    print(checkpoint.config["configurable"]["checkpoint_id"], "->", checkpoint.next)
```

Ye debugging ke liye bahut useful hai — jaise Zomato order tracking mein "order placed -> preparing -> out for delivery" har stage ka snapshot dekh sakte ho.

### Time Travel: Purane Checkpoint Se Restart Karna

Agar human ne galat approve kar diya aur wapas jaana hai:

```python
# Kisi purane checkpoint ka config nikaalo
history = list(app.get_state_history(config))
old_checkpoint_config = history[2].config  # 2 steps peeche

# Us checkpoint se naya branch shuru karo
result = app.invoke(None, config=old_checkpoint_config)
```

---

## Common Mistakes Aur Gotchas

> [!warning]
> **Mistake 1: Checkpointer bhool jaana.** Bina checkpointer ke `interrupt_before`/`interrupt_after`/`interrupt()` silently fail ya error dete hain, kyunki pause state store karne ki jagah hi nahi hai.

> [!warning]
> **Mistake 2: `interrupt()` se pehle side-effects rakhna.** Jaisa upar discuss kiya, node re-run hone par wo code dubara chalega. Payment API call, email send, DB write — sab `interrupt()` ke BAAD rakho.

> [!warning]
> **Mistake 3: Production mein `InMemorySaver` use karna.** Server restart hote hi saare paused agents ka data gayab. Hamesha `PostgresSaver`/`SqliteSaver` jaisa persistent checkpointer use karo jab real users involved hon.

> [!warning]
> **Mistake 4: `thread_id` reuse karke confusion.** Agar do alag users ke liye same `thread_id` use kar diya, dono ka state mix ho jaayega. Har conversation/request ke liye unique `thread_id` generate karo (jaise `user_id + request_id`).

> [!warning]
> **Mistake 5: Timeout handle na karna.** Agar human 24 ghante tak approve nahi karta, agent hamesha ke liye "pending" state mein rahega. Production mein ek background job rakho jo lambe time se pending interrupts ko flag/expire kare (jaise "approval expired after 24h, please resubmit").

---

## Production Considerations

- **Notification system**: Jab graph interrupt hota hai, ek notification (Slack, email, push notification) trigger karo taaki human ko pata chale ki approval chahiye — warna agent forever "waiting" state mein pada rahega.
- **Timeout / Auto-expire**: Long-pending interrupts ke liye ek expiry policy rakho.
- **Audit trail**: Har approval/rejection ko log karo — kisne approve kiya, kab, kyun (compliance ke liye zaruri, especially finance/healthcare domains mein).
- **UI for review**: Ek simple dashboard banao jahan pending interrupts list ho, human ek click mein approve/reject/edit kar sake — `state.values` aur `interrupt()` payload isi UI ko power karte hain.
- **Cost of pausing**: Agar checkpointer database-backed hai (Postgres), har interrupt ek DB round-trip hai — high-volume systems mein isse latency/cost dhyan mein rakho.
- **Idempotency**: Resume flow ko idempotent design karo — agar human galti se do baar approve click kar de, duplicate action nahi hona chahiye.

---

## Practice Exercises

### Exercise 1: Simple Approval Gate
Ek graph banao teen nodes ke saath:
1. `propose` — ek random action generate kare (e.g., "Delete file X", "Send email to Y")
2. `execute` — action run kare (bas print kare)
3. `report` — result report kare

`interrupt_before=["execute"]` add karo. Graph run karo, proposed action inspect karo, phir:
- Approve karke resume karo
- Reject karo `as_node="execute"` se update state karke, node skip karke

### Exercise 2: Multi-Stage Review
Content pipeline banao:
1. `draft` — blog post likhe
2. `technical_review` — technical reviewer ke liye pause kare
3. `editorial_review` — editor ke liye pause kare
4. `publish` — final version publish kare

Har review stage interruptible ho. Poora flow simulate karo:
- Draft create hota hai
- Technical reviewer feedback deta hai -> revision
- Editor approve karta hai -> publish

### Exercise 3: Interactive Quiz Agent
`interrupt()` use karke ek agent banao jo quiz deta hai:
1. `generate_question` — question generate kare
2. `wait_for_answer` — `interrupt()` se user ke answer ka wait kare
3. `evaluate_answer` — answer check kare
4. `next_or_finish` — 3 questions ke baad END, warna loop back

### Exercise 4: Tool Approval with Preview
`interrupt()` use karke ek tool-using agent banao jahan:
1. LLM ek tool call karne ka decide kare (web search, calculator, etc.)
2. Tool execute hone se pehle graph `interrupt()` se pause ho
3. Human ko dikhe: "Agent {tool_name} call karna chahta hai args {args} ke saath. Approve? (y/n)"
4. Approve hone par execute karo aur continue karo
5. Reject hone par agent ko batao ki tool reject hua, dusra approach try karne do

### Exercise 5: Payment Agent with Threshold
Upar diye gaye Payment Agent example ko extend karo:
- Agar `amount > 10000`, do approvals chahiye (manager + finance) — sequential `interrupt()` calls use karo
- Har rejection ka reason log karo `messages` list mein
- Ek `get_state_history()` wala function likho jo poore payment ka audit trail print kare (kaun sa stage kab approve/reject hua)

---

## Key Takeaways

- **Human-in-the-loop** high-stakes ya irreversible agent actions (email, payment, delete, deploy) ke liye mandatory safety layer hai — accountability aur oversight ke liye zaruri.
- Kaam karne ke liye **checkpointer required hai** — bina iske pause state kahin save nahi hoti aur interrupt fail hota hai. Production mein `PostgresSaver`/`SqliteSaver` use karo, `InMemorySaver` sirf dev/testing ke liye.
- **`interrupt_before`** node chalne se pehle rukta hai (action approval ke liye), **`interrupt_after`** node chalne ke baad rukta hai (content review ke liye) — dono compile-time static config hain.
- **`interrupt()`** function (modern approach) node ke andar kahin bhi call ho sakta hai, human ko structured data bhej sakta hai, aur `Command(resume=value)` se resume hota hai — line-level granularity deta hai.
- `app.update_state()` se pause ke dauran state modify kar sakte ho — action change karo, feedback add karo. `as_node` param se koi node effectively skip bhi kar sakte ho.
- **Gotcha:** `interrupt()` node ko re-run karta hai on resume, isliye side-effects (API calls, sends) hamesha `interrupt()` ke BAAD rakho, pehle nahi.
- Resume simple hai: `app.invoke(None, config=config)` (old style) ya `app.invoke(Command(resume=value), config=config)` (naya style).
- Production mein notification system, timeout/expiry policy, audit trail, aur review UI ke bina HITL adhoora hai — sirf code likhna kaafi nahi, workflow bhi design karna padta hai.
