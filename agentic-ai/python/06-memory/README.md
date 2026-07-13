# Memory in Conversations and Agents

🟡 Intermediate

## Kya hota hai, aur ye chapter kyu zaruri hai?

Socho ek second ke liye — tum Zomato pe order kar rahe ho. Tumne bola "mujhe Biryani chahiye", agent ne bola "sure, kaunsa restaurant?" — tumne bola "wahi jo pichli baar tha". Agar Zomato ka support bot tumhara "pichli baar" bhool jaaye, toh poora conversation bekaar ho jaata hai. Har baar tumhe scratch se sab kuch batana padega — restaurant ka naam, address, payment method, sab kuch.

Yehi exact problem hai jo LLMs ke saath by-default hoti hai. **LLMs stateless hote hain.** Iska matlab: har `.invoke()` call ek bilkul fresh, alag, isolated request hai. Model ko bilkul yaad nahi ki 30 second pehle tumne kya bola tha — chahe wo bilkul same chat window mein ho.

```
Without memory:
  User: "My name is Alice."     → AI: "Nice to meet you, Alice!"
  User: "What is my name?"      → AI: "I don't know your name."

With memory:
  User: "My name is Alice."     → AI: "Nice to meet you, Alice!"
  User: "What is my name?"      → AI: "Your name is Alice."
```

Node.js background se aa rahe ho toh isko HTTP ke through socho: **HTTP bhi stateless hai**. Har request apne aap mein complete hoti hai, server ko pichli request yaad nahi rehti — isiliye hum session cookies, Redis, ya JWT tokens use karte hain state maintain karne ke liye. LLM APIs ke saath bhi bilkul yehi deal hai: **tumhe khud har request ke saath poora conversation history bhejna padta hai**, taaki model ko "context" mile.

> [!info]
> Is chapter mein hum dekhenge: legacy `langchain.memory` classes (Buffer, Window, Summary — inka concept samajhna zaruri hai kyunki reasoning wahi hai), modern `RunnableWithMessageHistory` pattern, aur sabse important — **LangGraph ka checkpointer-based memory** jo aaj production mein actually use hota hai. Saath mein "simple chat memory" vs "agent memory" ka fundamental difference bhi samjhenge.

---

## Kyun LLM APIs stateless design karte hain?

Ye design flaw nahi hai — ye ek **deliberate architecture choice** hai, aur samajhna zaruri hai kyun:

1. **Scalability**: Agar OpenAI/Anthropic ke servers ko har user ka conversation state apne RAM mein rakhna padta, toh millions of concurrent users ke saath ye impossible ho jaata. Stateless API ka matlab hai koi bhi server instance kisi bhi request ko handle kar sakta hai — load balancing seedha ho jaata hai.
2. **Tumhara control**: Agar state server-side maintained hoti, toh tumhe control nahi milta ki konsa purana message rakhna hai, konsa summarize karna hai, konsa drop karna hai. Stateless design ka fayda ye hai ki **memory strategy tumhare application ke haath mein hai**, provider ke haath mein nahi.
3. **Cost transparency**: Har message jo tum context mein bhejte ho, uske tokens count hote hain aur tumse charge hota hai. Agar memory automatic/hidden hoti, toh cost control karna mushkil ho jaata.

Isi wajah se poora "memory" ka concept LangChain/LangGraph mein **application-layer** pe implement hota hai — model ke andar nahi.

```python
from langchain_openai import ChatOpenAI

model = ChatOpenAI(model="gpt-4o-mini")

# Call 1
response1 = model.invoke("My name is Alice.")
print(response1.content)  # "Nice to meet you, Alice!"

# Call 2 -- bilkul fresh request hai, koi memory nahi
response2 = model.invoke("What is my name?")
print(response2.content)  # "I don't have access to personal information..."
```

Dono calls completely independent hain. `response2` ko `response1` ka koi idea nahi hai. Fix simple hai — **poora conversation history bhejo, har baar**:

```python
from langchain_core.messages import HumanMessage, AIMessage

messages = [
    HumanMessage(content="My name is Alice."),
    AIMessage(content="Nice to meet you, Alice!"),
    HumanMessage(content="What is my name?"),
]

response = model.invoke(messages)
print(response.content)  # "Your name is Alice."
```

Yehi core idea hai — memory matlab kuch aur nahi, **sahi messages ko sahi order mein wapas model ko bhejna**. Baaki sab kuch — buffers, windows, summaries — bas is ek kaam ko efficiently karne ke tareeke hain.

---

## Memory Strategies — Overview

| Strategy | Kya Store Karti Hai | Best For | Trade-off |
|---|---|---|---|
| **Buffer** | Har message, verbatim (as-is) | Chhoti conversations | Tokens/cost unlimited grow karta hai |
| **Window** | Last N message-pairs | Medium conversations | Purani important info bhool jaata hai |
| **Summary** | LLM-generated summary purane messages ka | Lambi conversations | Extra LLM calls lagti hain, detail lose hota hai |
| **Token Buffer** | Messages ek token budget tak | Cost-sensitive apps | Precise, par phir bhi purana context drop hota hai |
| **Checkpointer (LangGraph)** | Poora state graph ke through, thread ke against | Production agents | Modern standard — persistence + trimming/summarization combine ho sakta hai |

> [!warning]
> LangChain ki purani `langchain.memory` classes (`ConversationBufferMemory`, `ConversationChain`, etc.) ab **deprecated/legacy** hain naye LangChain versions mein. Inka concept samajhna zaroori hai (interviews mein bhi puchte hain, aur logic wahi hai), lekin naye projects mein tumhe **manual message management + `RunnableWithMessageHistory`**, ya better — **LangGraph checkpointers** use karne chahiye. Hum dono dikhayenge.

---

## Legacy Pattern 1: ConversationBufferMemory

Sabse simple approach — **har message ko as-is store karo**, kabhi kuch drop mat karo.

```python
from langchain.memory import ConversationBufferMemory

memory = ConversationBufferMemory(return_messages=True)

# Conversation simulate karte hain
memory.save_context(
    {"input": "My name is Alice."},
    {"output": "Nice to meet you, Alice!"},
)
memory.save_context(
    {"input": "I'm learning Python."},
    {"output": "That's great! Python is a fantastic language."},
)

# Stored messages retrieve karo
history = memory.load_memory_variables({})
print(history)
# {
#   "history": [
#     HumanMessage(content="My name is Alice."),
#     AIMessage(content="Nice to meet you, Alice!"),
#     HumanMessage(content="I'm learning Python."),
#     AIMessage(content="That's great! Python is a fantastic language."),
#   ]
# }
```

**Problem kya hai?** Ye Swiggy ke us user jaisa hai jo apna poora order history kabhi delete nahi karta — 2 saal baad bhi 5000 orders ka pura record load hota hai har baar app khulne pe. Ek point ke baad ye:
- Prompt ka size explode ho jaata hai → cost badhta hai (har token paisa hai)
- Model ki context window fill ho jaati hai → error aa sakta hai
- Model ka "attention" dilute ho jaata hai purane, irrelevant messages ki wajah se

---

## Legacy Pattern 2: ConversationBufferWindowMemory

Sirf **last `k` exchanges** rakhta hai. Purane messages automatically drop ho jaate hain.

```python
from langchain.memory import ConversationBufferWindowMemory

memory = ConversationBufferWindowMemory(k=3, return_messages=True)
# Last 3 exchange pairs rakhta hai (6 messages: 3 human + 3 AI)

# 5 exchanges simulate karo
for i in range(5):
    memory.save_context(
        {"input": f"Message {i+1} from user"},
        {"output": f"Response {i+1} from AI"},
    )

history = memory.load_memory_variables({})
messages = history["history"]
print(f"Messages stored: {len(messages)}")  # 6 (last 3 pairs)

for msg in messages:
    print(f"  {msg.__class__.__name__}: {msg.content}")
# Sirf messages 3, 4, 5 bache hain -- messages 1, 2 drop ho gaye
```

> [!tip]
> Node.js parallel: Express session mein `messages.slice(-6)` karne jaisa hai. Ek sliding window jo hamesha last N messages rakhti hai, aur purana automatically expire ho jaata hai — bilkul UPI transaction history jaisa jahan sirf last 10 transactions dikhte hain by default.

**Gotcha**: Agar user ne message #1 mein bola tha "mujhe peanuts se allergy hai" aur wo window se bahar chala gaya, toh bot bilkul bhool jaayega — chahe wo fact abhi bhi relevant ho. Window memory **recency** ko priority deta hai, **importance** ko nahi.

---

## Legacy Pattern 3: ConversationSummaryMemory

Purane messages ko LLM se **summarize** karwata hai — poora text nahi, bas "gist" rakhta hai.

```python
from langchain.memory import ConversationSummaryMemory
from langchain_openai import ChatOpenAI

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)

memory = ConversationSummaryMemory(
    llm=model,
    return_messages=True,
)

# Lambi conversation
memory.save_context(
    {"input": "Hi, I'm Bob. I'm a frontend developer transitioning to AI."},
    {"output": "Welcome Bob! Transitioning from frontend to AI is a great move."},
)
memory.save_context(
    {"input": "I mainly use React and TypeScript at work."},
    {"output": "React and TypeScript skills are valuable! Python will be your main new tool."},
)
memory.save_context(
    {"input": "I've been learning Python for about 2 weeks now."},
    {"output": "Two weeks in, you're at a great stage to start exploring AI frameworks."},
)

# Memory poori messages nahi, ek SUMMARY store karta hai
history = memory.load_memory_variables({})
print(history)
# Kuch aisa summary milega: "Bob is a frontend developer using React and TypeScript
# who is transitioning to AI development. He has been learning Python for 2 weeks."
```

### Ye kaam kaise karta hai (under the hood)

Har baar jab tum naya context add karte ho, memory:
1. Existing summary uthaati hai
2. Naya exchange add karti hai
3. LLM ko bolti hai "updated summary banao"
4. Naya summary store karti hai (raw messages nahi)

Iska matlab har `save_context` call pe **ek extra LLM call** lagti hai — ye cost badhata hai, lekin lambi conversations ke liye ye compact rehta hai. Socho ye ek dabbawala jaisa hai jo har delivery ka detailed log nahi rakhta, bas ek short note banata hai: "Andheri se Bandra, 3 tiffins daily, no Sundays" — pura context ek line mein.

---

## Legacy Pattern 4: ConversationTokenBufferMemory

Window memory message-count pe cut karta hai; ye memory **token count** pe cut karta hai — cost control ke liye zyada precise.

```python
from langchain.memory import ConversationTokenBufferMemory
from langchain_openai import ChatOpenAI

model = ChatOpenAI(model="gpt-4o-mini")

memory = ConversationTokenBufferMemory(
    llm=model,
    max_token_limit=300,  # History <= 300 tokens tak rakho
    return_messages=True,
)

memory.save_context(
    {"input": "Explain Python decorators in detail."},
    {"output": "Decorators are functions that modify the behavior of other functions..."},
)
memory.save_context(
    {"input": "Now explain generators."},
    {"output": "Generators are functions that use yield to produce a sequence of values lazily..."},
)
memory.save_context(
    {"input": "What about context managers?"},
    {"output": "Context managers handle setup and teardown using with statements..."},
)

# 300 tokens ke andar rehne ke liye purane messages drop ho sakte hain
history = memory.load_memory_variables({})
for msg in history["history"]:
    print(f"{msg.__class__.__name__}: {msg.content[:60]}...")
```

Ye zyada accurate isliye hai kyunki 2 lambe messages ka token count 6 chhote messages ke barabar ho sakta hai — window memory ye nuance nahi samjhta, token buffer samajhta hai.

---

## Modern Pattern: Manual Message Management

Legacy memory classes kaam karti hain, lekin ab in-place hai ek simpler pattern: **message list khud manage karo**, aur persistence ke liye `RunnableWithMessageHistory` use karo. Ye zyada transparent hai — tumhe pata rehta hai exactly kya ho raha hai, koi hidden magic nahi.

```python
from dotenv import load_dotenv
load_dotenv()

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import HumanMessage, AIMessage

model = ChatOpenAI(model="gpt-4o-mini", temperature=0.7)

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful Python tutor for JavaScript developers."),
    MessagesPlaceholder(variable_name="history"),
    ("human", "{input}"),
])

chain = prompt | model | StrOutputParser()

# History khud manage karo -- simple aur transparent
history: list = []

def chat(user_message: str) -> str:
    """Message bhejo, response lo, aur history update karo."""
    response = chain.invoke({
        "history": history,
        "input": user_message,
    })

    history.append(HumanMessage(content=user_message))
    history.append(AIMessage(content=response))

    return response

# Usage
print(chat("My name is Alice."))
print(chat("What is my name?"))           # "Alice" yaad rakhega
print(chat("I'm coming from Node.js."))
print(chat("What's my background?"))       # "Node.js" yaad rakhega
```

### Sliding window ke saath

```python
MAX_MESSAGES = 20

def chat_with_window(user_message: str) -> str:
    """Sliding window ke saath chat."""
    response = chain.invoke({
        "history": history[-MAX_MESSAGES:],  # Sirf last N messages
        "input": user_message,
    })

    history.append(HumanMessage(content=user_message))
    history.append(AIMessage(content=response))

    return response
```

### RunnableWithMessageHistory (multi-session persistence ke liye)

Ab tak humne ek global `history` list use ki — but production app mein multiple users hote hain, har ek ki apni alag conversation. `RunnableWithMessageHistory` isko **session-based** bana deta hai:

```python
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.chat_history import BaseChatMessageHistory, InMemoryChatMessageHistory

# Session store -- production mein Redis ya database use karo
session_store: dict[str, BaseChatMessageHistory] = {}

def get_session_history(session_id: str) -> BaseChatMessageHistory:
    """Diye gaye session ID ke liye history get/create karo."""
    if session_id not in session_store:
        session_store[session_id] = InMemoryChatMessageHistory()
    return session_store[session_id]

# Chain ko message history ke saath wrap karo
chain_with_history = RunnableWithMessageHistory(
    chain,
    get_session_history,
    input_messages_key="input",
    history_messages_key="history",
)

# Har session apni alag history maintain karta hai
config1 = {"configurable": {"session_id": "user_alice"}}
config2 = {"configurable": {"session_id": "user_bob"}}

# Alice ki conversation
response = chain_with_history.invoke(
    {"input": "Hi, I'm Alice!"},
    config=config1,
)
print(f"To Alice: {response}")

# Bob ki conversation (bilkul alag history)
response = chain_with_history.invoke(
    {"input": "Hi, I'm Bob!"},
    config=config2,
)
print(f"To Bob: {response}")

# Alice apna naam poochti hai (uski history yaad rakhti hai)
response = chain_with_history.invoke(
    {"input": "What's my name?"},
    config=config1,
)
print(f"To Alice: {response}")  # "Your name is Alice!"
```

Ye bilkul waisa hai jaise UPI app mein har user ka alag transaction history hota hai `user_id` ke against — koi cross-contamination nahi.

---

## Databases ke saath Persistent Memory

`InMemoryChatMessageHistory` sirf tab tak zinda rehta hai jab tak process chal raha hai — server restart hote hi sab gayab. Production ke liye actual database chahiye.

### SQLite-backed history

```python
from langchain_community.chat_message_histories import SQLChatMessageHistory

def get_session_history(session_id: str) -> SQLChatMessageHistory:
    return SQLChatMessageHistory(
        session_id=session_id,
        connection="sqlite:///chat_history.db",
    )

chain_with_history = RunnableWithMessageHistory(
    chain,
    get_session_history,
    input_messages_key="input",
    history_messages_key="history",
)
```

### Redis-backed history (production ke liye)

```bash
pip install redis langchain-redis
```

```python
from langchain_community.chat_message_histories import RedisChatMessageHistory

def get_session_history(session_id: str) -> RedisChatMessageHistory:
    return RedisChatMessageHistory(
        session_id=session_id,
        url="redis://localhost:6379",
        ttl=3600,  # 1 hour baad expire ho jaayega
    )
```

> [!tip]
> Node.js parallel: Ye bilkul `express-session` with Redis store jaisa hai. Session ID user ko identify karta hai, aur store conversation ko server restarts ke aar-paar bhi persist karta hai — Zomato app band karke wapas kholo, tumhara cart abhi bhi wahin hota hai na? Same idea.

---

## Simple Chat Memory vs Agent Memory — Fundamental Farak

Yahan tak jo humne dekha wo **simple chat memory** hai — ek linear conversation, message list, request-response. Lekin jab tum **agents** banaoge (Chapter 8 se aage), memory ka scope badal jaata hai. Kyun?

| | Simple Chat | Agent |
|---|---|---|
| **State kya hai?** | Sirf messages ka list | Messages + tool calls + tool results + intermediate reasoning + custom fields (jaise `user_preferences`, `retrieved_docs`) |
| **Flow** | Linear (user → AI → user → AI) | Graph-based — loops, branches, retries, human-in-the-loop pauses |
| **Memory ka role** | "Pichla message yaad rakho" | "Pura execution state yaad rakho" — agar agent beech mein crash ho jaaye toh wahin se resume karna hai |
| **Scope** | Ek session ke andar | Ek session ke andar (short-term) + sessions ke aar-paar (long-term, jaise user preferences) |

Socho IRCTC ka tatkal booking agent. Ye sirf "chat" nahi kar raha — ye multiple steps mein kaam kar raha hai: train search → seat availability check → payment → confirmation. Agar step 3 (payment) pe connection drop ho jaaye, tumhe pura process restart nahi karna chahiye — agent ko yaad hona chahiye ki train already select ho chuki thi. **Ye agent memory hai — sirf conversation history nahi, poora execution state.**

Isi wajah se production-grade agent frameworks (LangGraph) memory ko sirf "message history" tak limit nahi rakhte — wo **checkpointing** ka pura concept introduce karte hain.

---

## LangGraph Memory: Modern, Production Standard

LangGraph mein memory do tarah ki hoti hai:

1. **Short-term memory (thread-scoped)** — Ek single conversation/session ke andar state. `checkpointer` ke through implement hoti hai.
2. **Long-term memory (cross-thread)** — User ke baare mein facts jo **sessions ke aar-paar** persist hote hain (jaise "user ko dark mode pasand hai", chahe wo naya conversation start kare). `store` ke through implement hoti hai.

> [!info]
> LangGraph ke deep concepts (StateGraph, nodes, edges) Chapter 12 se detail mein cover honge. Yahan hum sirf memory ka angle dekhenge — taaki tumhe pata ho ki "state persistence" concept kaise chat memory se evolve hokar agent memory banta hai.

### Short-term memory: Checkpointer

`InMemorySaver` ek checkpointer hai jo graph ke poore state ko har step pe save karta hai, `thread_id` ke against:

```python
from langchain.chat_models import init_chat_model
from langgraph.graph import StateGraph, MessagesState, START
from langgraph.checkpoint.memory import InMemorySaver

model = init_chat_model("gpt-4o-mini")

def call_model(state: MessagesState):
    response = model.invoke(state["messages"])
    return {"messages": response}

checkpointer = InMemorySaver()

builder = StateGraph(MessagesState)
builder.add_node(call_model)
builder.add_edge(START, "call_model")

graph = builder.compile(checkpointer=checkpointer)

config = {"configurable": {"thread_id": "1"}}

# Pehli call
graph.invoke(
    {"messages": [{"role": "user", "content": "hi! i am Bob"}]},
    config,
)

# Doosri call -- SAME thread_id, isliye graph ko Bob yaad hai
response = graph.invoke(
    {"messages": [{"role": "user", "content": "what's my name?"}]},
    config,
)
print(response["messages"][-1].content)  # "Your name is Bob."
```

Notice karo — humne khud koi `history` list maintain nahi ki. `thread_id` diya, aur LangGraph ne khud state ko save/load kiya. Ye bilkul waisa hai jaise Swiggy order tracking ka `order_id` — us ID se poora order state fetch ho jaata hai, tumhe khud kuch track nahi karna padta.

### Production mein persistent checkpointer (Postgres)

```python
from langchain.chat_models import init_chat_model
from langgraph.graph import StateGraph, MessagesState, START
from langgraph.checkpoint.postgres import PostgresSaver

model = init_chat_model("gpt-4o-mini")

DB_URI = "postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable"

with PostgresSaver.from_conn_string(DB_URI) as checkpointer:
    # checkpointer.setup()  # Pehli baar tables banane ke liye

    def call_model(state: MessagesState):
        response = model.invoke(state["messages"])
        return {"messages": response}

    builder = StateGraph(MessagesState)
    builder.add_node(call_model)
    builder.add_edge(START, "call_model")

    graph = builder.compile(checkpointer=checkpointer)

    config = {"configurable": {"thread_id": "user_42"}}

    graph.invoke({"messages": [{"role": "user", "content": "hi! I'm bob"}]}, config)
    response = graph.invoke({"messages": [{"role": "user", "content": "what's my name?"}]}, config)
    print(response["messages"][-1].content)
```

`InMemorySaver` sirf dev/testing ke liye hai — server restart hote hi state gayab. Production mein `PostgresSaver`, `MongoDBSaver`, ya `RedisSaver` use karo, jaise humne chat history ke saath dekha tha.

### Lambi conversations ke liye: Trimming aur Summarization

Agent ka message state bhi unbounded grow ho sakta hai — bilkul chat memory jaisi problem. LangGraph iske liye do tools deta hai:

**1. `trim_messages` — token budget ke andar rakhna:**

```python
from langchain_core.messages.utils import trim_messages, count_tokens_approximately

def call_model(state: MessagesState):
    messages = trim_messages(
        state["messages"],
        strategy="last",
        token_counter=count_tokens_approximately,
        max_tokens=128,
        start_on="human",
        end_on=("human", "tool"),
    )
    response = model.invoke(messages)
    return {"messages": [response]}
```

**2. `RemoveMessage` — specific purane messages delete karna:**

```python
from langchain.messages import RemoveMessage

def delete_old_messages(state):
    messages = state["messages"]
    if len(messages) > 10:
        # Sabse purane 2 messages hatao
        return {"messages": [RemoveMessage(id=m.id) for m in messages[:2]]}
```

**3. Summarization node — purane messages ko summary mein convert karna** (bilkul `ConversationSummaryMemory` jaisa concept, but graph-native):

```python
def summarize_conversation(state):
    summary = state.get("summary", "")

    if summary:
        summary_message = (
            f"This is a summary of the conversation to date: {summary}\n\n"
            "Extend the summary by taking into account the new messages above:"
        )
    else:
        summary_message = "Create a summary of the conversation above:"

    messages = state["messages"] + [HumanMessage(content=summary_message)]
    response = model.invoke(messages)

    # Sirf recent 2 messages verbatim rakho, baaki summary mein chala gaya
    delete_messages = [RemoveMessage(id=m.id) for m in state["messages"][:-2]]
    return {"summary": response.content, "messages": delete_messages}
```

Ye exact wahi "summary + recent window" ka hybrid idea hai jo humne legacy memory section mein dekha tha — bas ab ye graph state ke andar, first-class citizen ki tarah implement hota hai.

### Long-term memory: Store (cross-thread facts)

Checkpointer sirf **ek thread** ke andar kaam karta hai. Lekin kabhi tumhe chahiye hota hai ki koi fact **sabhi conversations mein** yaad rahe — jaise "user ko pizza pasand hai" chahe wo naya chat thread start kare. Iske liye `store` hai:

```python
from langgraph.store.memory import InMemoryStore
from langgraph.runtime import Runtime
from langgraph.graph import StateGraph, MessagesState, START
from dataclasses import dataclass
import uuid

store = InMemoryStore()

@dataclass
class Context:
    user_id: str

async def call_model(state: MessagesState, runtime: Runtime[Context]):
    user_id = runtime.context.user_id
    namespace = (user_id, "memories")

    # Relevant memories dhundo
    memories = await runtime.store.asearch(
        namespace, query=state["messages"][-1].content, limit=3
    )
    info = "\n".join(d.value["data"] for d in memories)

    # ... info ko system prompt mein inject karke model.invoke() karo

    # Naya fact store karo
    await runtime.store.aput(
        namespace, str(uuid.uuid4()), {"data": "User prefers dark mode"}
    )
    return {"messages": [...]}

builder = StateGraph(MessagesState, context_schema=Context)
builder.add_node(call_model)
builder.add_edge(START, "call_model")
graph = builder.compile(store=store)

# Invocation ke time user_id pass karo
graph.invoke(
    {"messages": [{"role": "user", "content": "hi"}]},
    {"configurable": {"thread_id": "1"}},
    context=Context(user_id="user_42"),
)
```

`store` ko `user_id` se namespace karke, ye facts **kisi bhi thread se access** ho sakte hain — chahe naya conversation ho, naya device ho, kuch bhi ho. Bilkul Amazon ka "recommended for you" jaisa — wo tumhare purane orders (cross-session data) yaad rakhta hai, current cart session se independent.

> [!warning]
> `InMemoryStore` bhi sirf dev/testing ke liye hai. Production mein vector-search-enabled store use karo (jaise `embed` param ke saath — semantic similarity se relevant memories dhundhne ke liye), backed by Postgres ya koi persistent DB.

---

## Kaunsa Approach Kab Use Karo?

```
Simple script / prototype, ek hi session
  → Manual list (history.append)

Multi-user chatbot, sessions track karni hain
  → RunnableWithMessageHistory + InMemoryChatMessageHistory (dev)
  → RunnableWithMessageHistory + SQLChatMessageHistory/RedisChatMessageHistory (prod)

Agent banana hai (tools, loops, multi-step reasoning)
  → LangGraph + checkpointer (InMemorySaver for dev, PostgresSaver for prod)

Lambi conversations, token cost control karna hai
  → trim_messages ya SummarizationNode (LangGraph)
  → ya legacy ConversationSummaryMemory (agar abhi bhi old codebase mein ho)

User preferences jo sessions ke paar yaad rehni chahiye
  → LangGraph store (InMemoryStore dev, persistent+vector store prod)
```

---

## Complete Example: Persistent Memory Chatbot (Modern Pattern)

```python
"""
chatbot.py -- SQLite persistence ke saath production-style chatbot.
"""
from dotenv import load_dotenv
load_dotenv()

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_community.chat_message_histories import SQLChatMessageHistory

# --- Setup ---
model = ChatOpenAI(model="gpt-4o-mini", temperature=0.7)

prompt = ChatPromptTemplate.from_messages([
    ("system", (
        "You are a friendly Python tutor helping JavaScript developers learn Python. "
        "Be concise. Use JS/TS comparisons when helpful. "
        "Remember details the user has shared about themselves."
    )),
    MessagesPlaceholder(variable_name="history"),
    ("human", "{input}"),
])

chain = prompt | model | StrOutputParser()

# --- Persistent history ---
def get_session_history(session_id: str) -> SQLChatMessageHistory:
    return SQLChatMessageHistory(
        session_id=session_id,
        connection="sqlite:///chat_memory.db",
    )

chain_with_history = RunnableWithMessageHistory(
    chain,
    get_session_history,
    input_messages_key="input",
    history_messages_key="history",
)

# --- Interactive loop ---
def main():
    session_id = input("Enter your username (or press Enter for 'default'): ").strip()
    if not session_id:
        session_id = "default"

    config = {"configurable": {"session_id": session_id}}
    print(f"\nChatbot ready! Session: {session_id}")
    print("Type 'quit' to exit, 'clear' to reset history")
    print("=" * 50)

    while True:
        user_input = input("\nYou: ").strip()
        if not user_input:
            continue
        if user_input.lower() == "quit":
            print("Goodbye!")
            break
        if user_input.lower() == "clear":
            history = get_session_history(session_id)
            history.clear()
            print("[History cleared]")
            continue

        print("\nTutor: ", end="")
        for chunk in chain_with_history.stream(
            {"input": user_input},
            config=config,
        ):
            print(chunk, end="", flush=True)
        print()


if __name__ == "__main__":
    main()
```

Restart karke test karo — session ID same do, aur history wahin se continue hogi jahan chhodi thi. Yehi hai "persistence" ka pura matlab.

---

## Gotchas aur Common Mistakes

- **Har memory type ke liye alag `session_id`/`thread_id` mat bhoolo.** Agar sab requests same ID use karti hain, sabka context mix ho jaayega — production mein ye ek serious data-leak bug ban sakta hai (User A ko User B ki details dikhna).
- **`InMemorySaver`/`InMemoryChatMessageHistory` production mein mat use karo.** Server restart, deploy, ya crash — sab kuch gayab. Hamesha persistent backend (Postgres/Redis/SQLite) use karo production ke liye.
- **Summary memory extra LLM calls lagata hai** — cost aur latency dono badhti hai. Sirf tab use karo jab conversation genuinely lambi ho.
- **Window/token memory silently purana context drop karta hai.** Agar user ne shuru mein koi critical fact bola tha (jaise allergy, budget constraint), aur wo window se bahar chala gaya, bot use bhool jaayega. Critical facts ke liye long-term `store` use karo, sirf window pe depend mat karo.
- **Agent memory sirf messages nahi hai.** Jab agents banaoge, state mein tool call results, intermediate decisions, aur custom fields bhi honge — sirf chat history sochke mat rukna, poora `State` schema design karna padega (Chapter 13+ mein detail).
- **Token counting approximate hota hai** (`count_tokens_approximately`) jab tak tum provider-specific tokenizer (jaise `tiktoken`) use na karo. Agar hard limit hit karna cost-critical hai, exact tokenizer use karo.

---

## Key Takeaways

- LLMs **stateless** hote hain — har `.invoke()` call independent hai. Memory application-layer pe implement karni padti hai, model ke andar nahi.
- **Buffer memory** sab kuch store karta hai (simple, par unbounded growth). **Window memory** sirf last N messages rakhta hai (recency-based, purana context lose hota hai). **Summary memory** purane messages ko LLM se summarize karwata hai (compact, par extra cost).
- Legacy `langchain.memory` classes (`ConversationBufferMemory`, `ConversationChain`, etc.) deprecated ho chuki hain — naye projects mein **manual message management + `RunnableWithMessageHistory`**, ya **LangGraph checkpointers** use karo.
- `RunnableWithMessageHistory` session-based memory deta hai — har `session_id` ki apni alag history, `SQLChatMessageHistory`/`RedisChatMessageHistory` se production mein persist hoti hai.
- **Agent memory ≠ chat memory.** Agents ka state sirf messages nahi — tool calls, intermediate results, custom fields sab include hote hain, aur execution beech mein resume bhi hona chahiye.
- **LangGraph checkpointer** (`InMemorySaver`, `PostgresSaver`, `MongoDBSaver`) `thread_id` ke against poora graph state persist karta hai — ye modern production standard hai short-term (thread-scoped) memory ke liye.
- **LangGraph store** (`InMemoryStore`) long-term, **cross-thread** memory deta hai — user preferences jaisa data jo alag conversations mein bhi yaad rehna chahiye, `user_id` se namespaced.
- Lambi conversations ke liye `trim_messages`, `RemoveMessage`, ya `SummarizationNode` use karo taaki token cost aur context window overflow control mein rahe.
- Sahi memory strategy chuno use-case dekhkar: prototype ke liye manual list, multi-user chat ke liye `RunnableWithMessageHistory`, aur agents ke liye LangGraph checkpointer + store — ye combination production-grade systems mein sabse zyada use hoti hai.
