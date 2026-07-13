# Deploying LangGraph Behind an API Server

🟡 Intermediate

Ab tak humne apna LangGraph agent Python script ya Jupyter notebook mein hi `invoke()` / `stream()` karke chalaya hai. Ek terminal khola, `python app.py` run kiya, aur turant result mil gaya. Yeh dev/testing ke liye theek hai — lekin production mein koi bhi end-user tumhara Python script nahi chalata.

Socho tum ek "AI customer support agent" bana rahe ho jo Swiggy ke liye orders track karta hai, refund process karta hai, restaurant suggest karta hai. Iska use karne wala banda ek mobile app ya website use kar raha hoga — woh directly tumhara `agent.invoke()` call nahi kar sakta. Uske beech mein ek **API server** chahiye jo:

1. HTTP request accept kare (frontend se)
2. Us request ko LangGraph agent tak forward kare
3. Agent ka response wapas HTTP response ke roop mein bheje
4. **Sabse important**: yaad rakhe ki "Rahul" naam ka user pehle kya baat kar chuka tha, aur "Priya" naam ka doosra user kya — dono ki conversations mix nahi honi chahiyein

Is chapter mein hum yeh teeno cheezein seekhenge: **FastAPI ke peeche LangGraph deploy karna**, **thread_id se checkpointing/persistence** karna taaki conversation history requests ke beech survive kare, aur **hazaaron users ki concurrent conversations** ko safely handle karna.

> [!info]
> Yeh chapter LangGraph-specific hai. Agar tumne Chapter 11 ("Serving a Chain/Agent Behind an API Server") padha hai, toh FastAPI basics wahan cover ho chuki hain. Yahan hum LangGraph ke **checkpointer** aur **thread_id** system par deep-dive karenge — jo LangGraph ko plain LangChain chains se alag banata hai jab persistence ki baat aati hai.

---

## Kya hota hai?

Jab tum LangGraph agent ko FastAPI ke andar wrap karte ho, do naye concepts aate hain jo plain function call mein nahi the:

1. **Checkpointer** — agent ki state (messages, intermediate variables) ko har step ke baad save karta hai, kisi storage mein (memory, SQLite, Postgres, Redis).
2. **thread_id** — ek unique identifier jo batata hai "yeh kis conversation ki state hai". Jaise Zomato order ka `order_id` — usi se track hota hai ki kaunsa order kis customer ka hai.

FastAPI server **stateless** hota hai by design — har request independent hoti hai, server ko pichli request yaad nahi rehti (jab tak tum khud kuch store na karo). Lekin ek chatbot agent ko **memory chahiye** — user ne pichle message mein kya bola, woh yaad rehna chahiye. Yeh gap checkpointer + thread_id combo pattaa hai.

## Kyun zaruri hai?

Ek dabbawala system socho. Har din Mumbai mein 2 lakh se zyada dabbe deliver hote hain, aur ek dabbawala ke paas ek coding system hota hai — station code, area code, building code — jisse woh bina confuse hue sahi dabba sahi ghar tak pahunchata hai. Agar yeh coding system na ho, toh sab dabbe mix ho jayenge.

Tumhara API server bhi wahi problem face karta hai: agar 1000 users ek saath tumhare `/chat` endpoint ko hit kar rahe hain, aur tumne unhe distinguish karne ka koi tarika nahi rakha, toh:

- User A ka message User B ki conversation history mein chala jaayega
- Server restart hote hi saari conversations gayab ho jaayengi (agar in-memory storage hai)
- Do concurrent requests same conversation ki state ko corrupt kar sakti hain (race condition)

`thread_id` + persistent checkpointer yeh teeno problems solve karta hai:

```
Request 1: {"message": "Mera naam Rahul hai", "thread_id": "user-101"}
Request 2: {"message": "Mujhe biryani suggest karo", "thread_id": "user-202"}
Request 3: {"message": "Mera naam kya hai?", "thread_id": "user-101"}
           → Agent correctly answer karega "Rahul" because thread_id "user-101"
             ki poori history checkpointer mein saved hai
```

---

## Setup

```bash
pip install fastapi uvicorn "langgraph[postgres]" langchain-openai python-dotenv aiosqlite psycopg[binary,pool]
```

- `langgraph[postgres]` — production-grade Postgres checkpointer ke liye
- `aiosqlite` — lightweight SQLite checkpointer ke liye (chhote projects/dev ke liye)
- `psycopg` — async Postgres driver

---

## Step 1: Sabse Basic Setup — MemorySaver ke saath

Pehle basics samjhte hain — ek chhota agent, FastAPI endpoint, aur `MemorySaver` (in-memory checkpointer, sirf dev/testing ke liye).

```python
# main.py
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import FastAPI
from pydantic import BaseModel

from langchain_core.messages import HumanMessage, BaseMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, START, END, add_messages
from langgraph.graph.message import MessagesState
from langgraph.checkpoint.memory import MemorySaver

# --- Agent build ---
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)


def chatbot(state: MessagesState):
    return {"messages": [llm.invoke(state["messages"])]}


def build_graph():
    graph = StateGraph(MessagesState)
    graph.add_node("chatbot", chatbot)
    graph.add_edge(START, "chatbot")
    graph.add_edge("chatbot", END)
    return graph


# MemorySaver: process ke RAM mein save hota hai. Server restart = data gone.
checkpointer = MemorySaver()
agent = build_graph().compile(checkpointer=checkpointer)

app = FastAPI(title="LangGraph Agent API")


class ChatRequest(BaseModel):
    message: str
    thread_id: str  # yeh field REQUIRED hai -- client isse bhejega


class ChatResponse(BaseModel):
    response: str
    thread_id: str
    message_count: int


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    # thread_id se LangGraph ko bataate hain "yeh konsi conversation hai"
    config = {"configurable": {"thread_id": request.thread_id}}

    result = await agent.ainvoke(
        {"messages": [HumanMessage(content=request.message)]},
        config=config,
    )

    last_message = result["messages"][-1]
    return ChatResponse(
        response=last_message.content,
        thread_id=request.thread_id,
        message_count=len(result["messages"]),
    )
```

Chalao:
```bash
uvicorn main:app --reload --port 8000
```

Test karo:
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Mera naam Rahul hai", "thread_id": "user-101"}'

curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Mera naam kya hai?", "thread_id": "user-101"}'
# Agent: "Aapka naam Rahul hai!" -- kyunki dono requests same thread_id use kar rahi hain
```

> [!warning]
> `MemorySaver` sirf development/testing ke liye hai. Yeh state ko Python process ke RAM mein rakhta hai — server restart, crash, ya deploy hote hi **saari conversations gayab** ho jaati hain. Production mein kabhi bhi `MemorySaver` mat use karo.

---

## Step 2: `thread_id` Ka Lifecycle — Kahan Se Aata Hai?

`thread_id` ek plain string hai — LangGraph ke liye yeh sirf ek lookup key hai. Do common patterns hain isse generate/manage karne ke:

### Pattern A: Client generate karta hai (jaise session ID)

Frontend pehli baar page load hone par ek UUID generate karke localStorage mein save kar leta hai, aur har request ke saath bhejta hai:

```javascript
// Frontend (React/JS side)
let threadId = localStorage.getItem("chat_thread_id");
if (!threadId) {
  threadId = crypto.randomUUID();
  localStorage.setItem("chat_thread_id", threadId);
}

fetch("/chat", {
  method: "POST",
  body: JSON.stringify({ message: "Hello", thread_id: threadId }),
});
```

### Pattern B: Server generate karta hai (recommended for logged-in users)

Server pehli request par thread create karta hai aur `thread_id` client ko wapas bhej deta hai. Isse tum apne user_id se thread_id ko database mein map kar sakte ho.

```python
import uuid
from fastapi import HTTPException

# Simple in-memory mapping user_id -> thread_id (production mein DB use karo)
USER_THREADS: dict[str, str] = {}


@app.post("/threads")
async def create_thread(user_id: str):
    """Naya conversation thread banao aur user se link karo."""
    thread_id = str(uuid.uuid4())
    USER_THREADS[user_id] = thread_id
    return {"thread_id": thread_id}


@app.get("/threads/by-user/{user_id}")
async def get_user_thread(user_id: str):
    """Logged-in user ka existing thread dhoondo."""
    thread_id = USER_THREADS.get(user_id)
    if not thread_id:
        raise HTTPException(404, "No thread found for this user")
    return {"thread_id": thread_id}
```

> [!tip]
> Real production apps (jaise ek Zomato support chatbot) mein `thread_id` ko database mein `user_id` ke saath map karke rakho — e.g. Postgres table `conversations(user_id, thread_id, created_at)`. Isse tum baad mein "iss user ki saari purani conversations dikhao" jaisi feature bhi bana sakte ho.

---

## Step 3: Production Checkpointer — SQLite (Chhote Projects)

Agar tumhara app single-server hai aur traffic zyada nahi hai, `AsyncSqliteSaver` ek accha lightweight option hai — data disk par persist hota hai, restart survive karta hai.

```python
# main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver

agent = None  # module-level reference


@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI startup/shutdown ke hooks -- checkpointer connection yahan manage hoti hai."""
    global agent
    async with AsyncSqliteSaver.from_conn_string("checkpoints.db") as checkpointer:
        agent = build_graph().compile(checkpointer=checkpointer)
        yield  # server yahan chalta rehta hai
    # `async with` block khatam hote hi connection cleanly close ho jaati hai


app = FastAPI(title="LangGraph Agent API", lifespan=lifespan)
```

Iska sabse bada faayda: server restart hone ke baad bhi purani conversations `checkpoints.db` file se load ho jaati hain — user ko lagta hi nahi ki server kabhi down hua tha.

---

## Step 4: Production Checkpointer — Postgres (Real Scale Ke Liye)

Jab tumhare paas **multiple server instances** ho (load balancer ke peeche 3-4 copies chal rahi ho, jaise Kubernetes pods), toh SQLite kaam nahi karega — har instance ki apni alag file hogi, state share nahi hogi. Yahan Postgres checkpointer chahiye, jo saare instances ek hi central database use karein.

```python
# main.py
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from psycopg_pool import AsyncConnectionPool
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

DB_URI = os.environ["DATABASE_URL"]  # e.g. postgresql://user:pass@host:5432/langgraph

agent = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global agent
    # Connection pool -- concurrent requests ke liye zaroori,
    # taaki har request nayi DB connection na banaye
    async with AsyncConnectionPool(
        conninfo=DB_URI,
        max_size=20,
        kwargs={"autocommit": True, "prepare_threshold": 0},
    ) as pool:
        checkpointer = AsyncPostgresSaver(pool)
        await checkpointer.setup()  # pehli baar tables create karta hai (idempotent)
        agent = build_graph().compile(checkpointer=checkpointer)
        yield


app = FastAPI(title="LangGraph Agent API", lifespan=lifespan)
```

`checkpointer.setup()` pehli run par LangGraph ke required tables (`checkpoints`, `checkpoint_writes`, `checkpoint_blobs`) khud create kar deta hai — tumhe manually schema banane ki zaroorat nahi.

| Checkpointer | Kab use karo |
|---|---|
| `MemorySaver` | Local dev, unit tests — kabhi bhi production mein nahi |
| `AsyncSqliteSaver` | Single-server deployment, low-to-medium traffic, quick prototypes |
| `AsyncPostgresSaver` | Multi-instance production deployment, high traffic, real users |
| Redis-backed (community) | Ultra-low-latency needs, TTL-based auto-expiry chahiye ho toh |

> [!warning]
> `AsyncConnectionPool` ka `max_size` tumhare Postgres server ki `max_connections` setting se zyada mat rakho, warna naye connections refuse honge jab tumhare paas multiple server instances chal rahe hon. Formula roughly: `max_connections >= (num_server_instances × pool_max_size) + buffer`.

---

## Step 5: Concurrent Conversations Safely Handle Karna

Yahan par ek important gotcha samajhna zaruri hai: **ek hi `thread_id` par do concurrent requests aane par kya hota hai?**

Socho user ne double-click kar diya "Send" button par, ya frontend ne retry logic ki wajah se same message do baar bhej diya. Dono requests same `thread_id` ke saath aayengi.

```python
import asyncio
from fastapi import HTTPException

# Per-thread lock -- ek waqt mein sirf ek request us thread ko process kare
_thread_locks: dict[str, asyncio.Lock] = {}


def get_lock(thread_id: str) -> asyncio.Lock:
    if thread_id not in _thread_locks:
        _thread_locks[thread_id] = asyncio.Lock()
    return _thread_locks[thread_id]


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    config = {"configurable": {"thread_id": request.thread_id}}
    lock = get_lock(request.thread_id)

    # Same thread_id ki do requests ek hi waqt par graph state ko
    # corrupt na karein, isliye lock lagate hain
    async with lock:
        result = await agent.ainvoke(
            {"messages": [HumanMessage(content=request.message)]},
            config=config,
        )

    last_message = result["messages"][-1]
    return ChatResponse(
        response=last_message.content,
        thread_id=request.thread_id,
        message_count=len(result["messages"]),
    )
```

**Important baat**: alag-alag `thread_id` waali requests ek doosre ko block **nahi** karti — `asyncio.Lock` sirf same thread ke liye lagta hai. Isliye Rahul aur Priya ki conversations parallel mein chal sakti hain, bina ek doosre ko wait karwaye.

```
Rahul (thread: user-101)  ──┐
                             ├──► Dono parallel chalte hain, koi conflict nahi
Priya (thread: user-202)  ──┘

Rahul se do requests aayein same waqt (thread: user-101) ──► Lock lagta hai,
                                                              doosri request
                                                              pehli ke complete
                                                              hone ka wait karti hai
```

> [!info]
> Single-server deployment mein `asyncio.Lock` kaafi hai. Multi-server (multiple pods/instances) deployment mein tumhe **distributed lock** chahiye hoga — jaise Redis-based lock (`redlock`) — kyunki alag-alag server instances ke apne-apne independent Python process memory hote hain, ek dusre ka `asyncio.Lock` dekh nahi sakte.

---

## Step 6: Poora Production-Ready Example

Sab kuch ek saath — Postgres checkpointer, per-thread locking, timeout, error handling, aur thread management endpoints:

```python
"""
Production LangGraph Agent API with persistence + concurrency handling.
Run with: uvicorn main:app --host 0.0.0.0 --port 8000
"""
import os
import uuid
import asyncio
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from psycopg_pool import AsyncConnectionPool

from langchain_core.messages import HumanMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import MessagesState
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

DB_URI = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/langgraph")

# ============================================================
# Agent
# ============================================================
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)


def chatbot(state: MessagesState):
    return {"messages": [llm.invoke(state["messages"])]}


def build_graph():
    graph = StateGraph(MessagesState)
    graph.add_node("chatbot", chatbot)
    graph.add_edge(START, "chatbot")
    graph.add_edge("chatbot", END)
    return graph


# ============================================================
# App state (populated during lifespan startup)
# ============================================================
agent = None
db_pool: Optional[AsyncConnectionPool] = None
_thread_locks: dict[str, asyncio.Lock] = {}


def get_lock(thread_id: str) -> asyncio.Lock:
    if thread_id not in _thread_locks:
        _thread_locks[thread_id] = asyncio.Lock()
    return _thread_locks[thread_id]


@asynccontextmanager
async def lifespan(app: FastAPI):
    global agent, db_pool
    db_pool = AsyncConnectionPool(
        conninfo=DB_URI,
        max_size=20,
        kwargs={"autocommit": True, "prepare_threshold": 0},
        open=False,
    )
    await db_pool.open()

    checkpointer = AsyncPostgresSaver(db_pool)
    await checkpointer.setup()
    agent = build_graph().compile(checkpointer=checkpointer)

    yield  # --- server runs here ---

    await db_pool.close()


app = FastAPI(title="LangGraph Agent API", version="1.0.0", lifespan=lifespan)


# ============================================================
# Models
# ============================================================
class ChatRequest(BaseModel):
    message: str
    thread_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    thread_id: str
    message_count: int


class ThreadResponse(BaseModel):
    thread_id: str
    message_count: int
    messages: list[dict]


# ============================================================
# Endpoints
# ============================================================
@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    # thread_id na diya ho toh naya bana do -- naya user, nayi conversation
    thread_id = request.thread_id or str(uuid.uuid4())
    config = {"configurable": {"thread_id": thread_id}}
    lock = get_lock(thread_id)

    async with lock:
        try:
            result = await asyncio.wait_for(
                agent.ainvoke(
                    {"messages": [HumanMessage(content=request.message)]},
                    config=config,
                ),
                timeout=60.0,
            )
        except asyncio.TimeoutError:
            raise HTTPException(504, "Agent timed out after 60 seconds")
        except Exception as e:
            raise HTTPException(500, f"Agent error: {str(e)}")

    last_message = result["messages"][-1]
    return ChatResponse(
        response=last_message.content,
        thread_id=thread_id,
        message_count=len(result["messages"]),
    )


@app.get("/api/threads/{thread_id}", response_model=ThreadResponse)
async def get_thread(thread_id: str):
    """Ek thread ki poori conversation history checkpointer se fetch karo."""
    config = {"configurable": {"thread_id": thread_id}}
    try:
        state = await agent.aget_state(config)
        messages = state.values.get("messages", [])
        if not messages:
            raise HTTPException(404, "Thread not found")
        return ThreadResponse(
            thread_id=thread_id,
            message_count=len(messages),
            messages=[{"role": m.type, "content": m.content} for m in messages],
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(404, "Thread not found")


@app.delete("/api/threads/{thread_id}")
async def delete_thread(thread_id: str):
    """Thread ki saari checkpoint history delete karo (GDPR / user-requested cleanup)."""
    config = {"configurable": {"thread_id": thread_id}}
    await agent.checkpointer.adelete_thread(thread_id)
    _thread_locks.pop(thread_id, None)
    return {"status": "deleted", "thread_id": thread_id}


@app.get("/health")
async def health():
    # DB pool bhi check karo -- agent "ready" tabhi hai jab checkpointer se
    # connect ho paaye
    if db_pool is None or db_pool.closed:
        raise HTTPException(503, "Database not connected")
    return {"status": "ok", "agent": "ready"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

Test karo:
```bash
# Naya thread implicitly ban jaayega
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hi, mera naam Aditi hai"}'
# Response: {"response": "Hi Aditi!...", "thread_id": "a1b2c3...", "message_count": 2}

# Usi thread_id ke saath follow-up
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Mera naam kya tha?", "thread_id": "a1b2c3..."}'

# History dekho
curl http://localhost:8000/api/threads/a1b2c3...

# Thread delete karo
curl -X DELETE http://localhost:8000/api/threads/a1b2c3...
```

---

## Multiple Server Instances (Horizontal Scaling)

Jab traffic badhta hai, ek hi server instance kaafi nahi hota — tum load balancer ke peeche 3-4 copies chalate ho. Isme naya challenge yeh hai: request kisi bhi instance par land ho sakti hai.

```
                     ┌─── Instance 1 ───┐
Client ── Load       │                  │
Balancer ──┼──────── ┼─── Instance 2 ───┼──────► Shared Postgres
           │         │                  │        (checkpointer)
           └──────── ┼─── Instance 3 ───┘
                     └──────────────────┘
```

Isliye do cheezein zaruri hain:

1. **Shared checkpointer** (Postgres, Redis) — koi bhi instance jo bhi thread_id handle kare, use latest state milni chahiye. `MemorySaver` ya `AsyncSqliteSaver` (local file ke saath) yahan **kaam nahi karega** kyunki har instance ki apni alag copy hogi.
2. **Distributed locking** — `asyncio.Lock` sirf ek process ke andar kaam karta hai. Cross-instance locking ke liye Redis-based lock use karo:

```python
# Redis distributed lock example (redis-py ka async client)
import redis.asyncio as redis

redis_client = redis.Redis(host="localhost", port=6379)


async def chat_with_distributed_lock(thread_id: str, message: str):
    lock_key = f"lock:thread:{thread_id}"
    # blocking=True -- doosri instance jab tak lock release nahi hoti, wait karegi
    async with redis_client.lock(lock_key, timeout=30, blocking_timeout=10):
        config = {"configurable": {"thread_id": thread_id}}
        result = await agent.ainvoke(
            {"messages": [HumanMessage(content=message)]},
            config=config,
        )
        return result
```

> [!tip]
> Agar tumhare paas load balancer "sticky sessions" support karta hai (same user hamesha same instance par route ho), toh distributed locking ki zaroorat kam ho jaati hai — lekin phir bhi checkpointer shared hona chahiye, taaki instance crash/restart ho toh conversation na khoye.

---

## Common Mistakes Aur Gotchas

1. **`thread_id` client se optional rakhna lekin validate na karna** — agar koi malicious user random `thread_id` bhej ke doosre user ki conversation access karne ki koshish kare, toh authorization check zaruri hai (thread_id ko user_id se verify karo before serving).

2. **MemorySaver ko production mein bhool jaana** — dev mein sab kaam karta hai, staging deploy hoti hai, restart hota hai, aur saari conversations gayab. Hamesha explicitly check karo ki tum production build mein Postgres/SQLite checkpointer use kar rahe ho.

3. **Connection pool size galat set karna** — bahut chhota pool = requests queue mein fasengi (latency badhegi). Bahut bada pool = Postgres server overload ho jaayega. Load testing karke sahi number nikaalo.

4. **Lock ko forget karna aur race condition** — agar tum lock nahi lagate aur same `thread_id` par do parallel requests aati hain, dono ek hi checkpoint version padhengi, dono apni update likhengi, aur ek update overwrite ho sakta hai (lost update problem).

5. **Thread cleanup na karna** — agar tum kabhi bhi purane threads delete nahi karte, database size unbounded badhta rahega. Ek scheduled job rakho jo N din se inactive threads ko archive/delete kare.

6. **`checkpointer.setup()` production mein har request pe call karna** — yeh sirf ek baar, app startup pe call hona chahiye (jaisa `lifespan` mein dikhaya). Baar-baar call karna unnecessary DB overhead hai (though it is idempotent).

---

## Production Considerations

| Concern | Suggestion |
|---|---|
| **Checkpointer choice** | Multi-instance deployment ⇒ Postgres/Redis. Single-instance low-traffic ⇒ SQLite |
| **Connection pooling** | `AsyncConnectionPool` use karo, size ko load-test karke tune karo |
| **Timeouts** | Har agent call ko `asyncio.wait_for()` mein wrap karo — hanging requests se bachne ke liye |
| **Thread authorization** | `thread_id` ko session/JWT se verify karo, kisi ko bhi kisi bhi thread ka access mat do |
| **Rate limiting** | Per-user rate limit lagao (`slowapi` jaisi library se) — ek user poora LLM budget na kha jaaye |
| **Monitoring** | Har request pe `thread_id`, latency, token usage log karo — structured JSON logs |
| **Cleanup jobs** | Inactive threads ko periodically archive/delete karo — storage cost control ke liye |
| **Graceful shutdown** | `lifespan` ka `yield` ke baad wala code (pool close) properly chalne do — in-flight requests ko drain hone do |

---

## Key Takeaways

- FastAPI ke peeche LangGraph deploy karna matlab: HTTP request → `agent.ainvoke(input, config={"configurable": {"thread_id": ...}})` → HTTP response.
- `thread_id` woh key hai jo LangGraph ko batata hai "yeh kis conversation ki state hai" — bina iske har request ek naya, memory-less conversation start karegi.
- Dev/testing ke liye `MemorySaver` theek hai, lekin **production mein kabhi nahi** — restart hote hi data gayab ho jaata hai.
- Real persistence ke liye `AsyncSqliteSaver` (single-instance) ya `AsyncPostgresSaver` (multi-instance, production-scale) use karo, connection pool ke saath.
- `checkpointer.setup()` app startup pe ek baar call karo (FastAPI `lifespan` ke andar) — yeh required tables bana deta hai.
- Concurrent conversations handle karne ke liye per-thread `asyncio.Lock` use karo (single instance) ya distributed lock jaise Redis (multi-instance) — taaki same thread par do parallel requests state corrupt na karein.
- Alag `thread_id` waali requests ek doosre ko block nahi karti — sirf same thread par lock lagta hai, isliye hazaaron users truly parallel chal sakte hain.
- Har agent call ko timeout ke saath wrap karo, thread_id ko authorization se verify karo, aur inactive threads ke liye cleanup job rakho — yeh production-readiness ke non-negotiable basics hain.
