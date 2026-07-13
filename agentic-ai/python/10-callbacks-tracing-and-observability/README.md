# Callbacks, Tracing and Observability

🟡 Intermediate

## Kya hota hai, aur kyun zaruri hai?

Socho ek second ke liye — tumne ek agent banaya hai jo Zomato jaisa ek "order support agent" hai. User poochta hai: *"Mera order kaha hai?"* Agent ke andar kya hota hai step by step:

1. LLM decide karta hai ki `get_order_status` tool call karna hai
2. Tool database se order fetch karta hai
3. LLM us result ko dekh kar ek dusra decision leta hai — shayad `check_delivery_partner_location` bhi call kare
4. Fir final answer generate hota hai

Ab socho production me ye agent kabhi galat tool call karta hai, kabhi slow response deta hai, kabhi bahut zyada tokens use karke bill fat jaata hai. Tumhe pata kaise chalega **konsa step** fail hua, **kitna time** laga, **kitne tokens** consume hue, aur **LLM ne wo decision kyun liya**?

Agar tum Node.js background se aa rahe ho, to ye bilkul waisा hi problem hai jaisa distributed microservices me hoti hai — ek request 5 services se hokar guzarti hai, aur kuch fail ho jaye to tumhe **distributed tracing** (OpenTelemetry, Jaeger, Datadog APM) chahiye hota hai ye janne ke liye ki kaunsi service culprit thi.

LLM agents ke case me problem aur bhi zyada hai kyunki **agents non-deterministic hote hain** — same input do baar chalao, agent alag path le sakta hai (alag tool call kar sakta hai, alag number of steps le sakta hai). Isliye sirf `print()` statements se debug karna production me kaam nahi karega. Yahi wajah hai ki LangChain ka **callback system** aur **LangSmith** jaisa observability platform critical ban jaata hai.

> [!info]
> **Observability ke 3 pillars agent building me:**
> 1. **Tracing** — har step ka execution path dikhna chahiye (kaunsa tool call hua, kaunsa LLM call hua, kis order me)
> 2. **Metrics** — tokens, cost, latency, error rate
> 3. **Logging** — har step ka input/output structured form me store hona chahiye

---

## Part 1: LangChain Callback System

### Callback system kya hai?

LangChain ka har `Runnable` (model, chain, tool, retriever, agent) execution ke key points par **events fire** karta hai. Tum in events ko "listen" kar sakte ho apna custom code chalane ke liye — bilkul waise jaise Node.js me `EventEmitter` ya Express middleware kaam karta hai.

```javascript
// Node.js analogy — Express middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    const start = Date.now();
    res.on('finish', () => {
        console.log(`${res.statusCode} ${Date.now() - start}ms`);
    });
    next();
});
```

LangChain me isi pattern ko **callback handler** kehte hain.

### Callback events — reference table

| Event | Kab fire hota hai |
|---|---|
| `on_llm_start` | LLM call shuru hone par (text completion models) |
| `on_llm_end` | LLM call complete hone par |
| `on_llm_error` | LLM call fail hone par |
| `on_chat_model_start` | Chat model call shuru hone par |
| `on_llm_new_token` | Streaming ke dauraan naya token generate hone par |
| `on_chain_start` | Chain execution shuru hone par |
| `on_chain_end` | Chain execution complete hone par |
| `on_chain_error` | Chain execution fail hone par |
| `on_tool_start` | Tool execution shuru hone par |
| `on_tool_end` | Tool execution complete hone par |
| `on_tool_error` | Tool execution fail hone par |
| `on_retriever_start` | Retriever query shuru hone par (RAG me) |
| `on_retriever_end` | Retriever results return karne par |
| `on_agent_action` | Agent ne koi action (tool call) decide kiya |
| `on_agent_finish` | Agent ne final answer de diya |

Har event ek `run_id` ke saath aata hai — ye ek unique UUID hai jo us specific execution ko identify karta hai. Agar chain ke andar nested calls hain (jaise agent ke andar tool, tool ke andar LLM), to `parent_run_id` bhi milta hai jisse tum poora **execution tree** reconstruct kar sakte ho.

---

## Part 2: Custom Callback Handlers

### Basic logging handler

Sabse pehla step — ek simple handler jo har important event print kare, taaki tumhe pata chale chain ke andar kya ho raha hai.

```python
from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.messages import BaseMessage
from typing import Any

class LoggingHandler(BaseCallbackHandler):
    """Har key event ko log karta hai chain execution ke dauraan."""

    def on_chat_model_start(
        self,
        serialized: dict[str, Any],
        messages: list[list[BaseMessage]],
        **kwargs: Any,
    ) -> None:
        print(f"\n[MODEL START] {len(messages[0])} messages bheje ja rahe hain")
        for msg in messages[0]:
            print(f"  {msg.__class__.__name__}: {msg.content[:80]}...")

    def on_llm_end(self, response, **kwargs: Any) -> None:
        print(f"[MODEL END] Response mil gaya")

    def on_llm_new_token(self, token: str, **kwargs: Any) -> None:
        # Streaming ke dauraan har token yahan aayega
        print(token, end="", flush=True)

    def on_chain_start(
        self, serialized: dict[str, Any], inputs: dict[str, Any], **kwargs: Any
    ) -> None:
        chain_name = serialized.get("name", "Unknown")
        print(f"\n[CHAIN START] {chain_name}")

    def on_chain_end(self, outputs, **kwargs: Any) -> None:
        print(f"[CHAIN END]")

    def on_tool_start(
        self, serialized: dict[str, Any], input_str: str, **kwargs: Any
    ) -> None:
        tool_name = serialized.get("name", "Unknown")
        print(f"[TOOL START] {tool_name}({input_str})")

    def on_tool_end(self, output: str, **kwargs: Any) -> None:
        print(f"[TOOL END] Result: {str(output)[:100]}")

    def on_chain_error(self, error: Exception, **kwargs: Any) -> None:
        print(f"[ERROR] {type(error).__name__}: {error}")
```

### Callback ko attach kaise karein — do tareeke

**Tareeka 1: Request-level (invoke ke time pe)**

```python
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant."),
    ("human", "{question}"),
])
chain = prompt | model | StrOutputParser()

handler = LoggingHandler()
result = chain.invoke(
    {"question": "Python kya hai?"},
    config={"callbacks": [handler]},  # sirf isi call ke liye active
)
print(f"\nResult: {result}")
```

**Tareeka 2: Constructor-level (har call ke liye automatic)**

```python
# Har baar jab ye model use hoga, callback automatically fire hoga
model = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0,
    callbacks=[LoggingHandler()],
)
```

> [!tip]
> Production me generally **request-level callbacks** better hote hain kyunki tum har request ke saath different metadata (user_id, request_id) pass kar sakte ho. Constructor-level callback global rehta hai — sab requests use share karte hain.

### Gotcha: Callback propagation

Agar tumhare paas ek chain hai jismein multiple sub-chains hain (jaise agent → tool → LLM), to callbacks **automatically propagate** hote hain — tumhe har sub-component me manually pass karne ki zaroorat nahi. Bas top-level `invoke()` call me `config={"callbacks": [...]}` pass karo, LangChain khud niche tak bhej dega.

> [!warning]
> Agar tum custom tool ke andar khud se `llm.invoke(...)` call karte ho **bina `config` forward kiye**, to callbacks propagate NAHI honge us inner call ke liye. Hamesha `config` parameter ko forward karo:

```python
def my_tool_function(input_str, config=None):
    return llm.invoke(input_str, config=config)  # config forward karna zaruri hai
```

---

## Part 3: Token Tracking aur Cost Calculation

Production agents me **cost tracking** sabse critical cheez hai. Agar tumhara agent per-request 5 LLM calls kar raha hai aur har call me 2000 tokens use ho rahe hain, to scale par ye bill explode kar sakta hai — bilkul waise jaise AWS Lambda ka cold-start cost scale par bhaari pad jaata hai.

```python
from langchain_core.callbacks import BaseCallbackHandler
from typing import Any
import time

class TokenTracker(BaseCallbackHandler):
    """Sabhi LLM calls ke tokens aur cost ka hisaab rakhta hai."""

    # Prices per 1M tokens (USD) — jitna zaroorat ho utna update karo
    PRICING = {
        "gpt-4o-mini": {"input": 0.15, "output": 0.60},
        "gpt-4o": {"input": 2.50, "output": 10.00},
    }

    def __init__(self):
        self.total_input_tokens = 0
        self.total_output_tokens = 0
        self.call_count = 0
        self.total_time = 0.0
        self._start_time = None
        self.model_name = "gpt-4o-mini"

    def on_chat_model_start(self, serialized, messages, **kwargs):
        self._start_time = time.time()
        self.call_count += 1
        model = kwargs.get("invocation_params", {}).get("model_name", self.model_name)
        self.model_name = model

    def on_llm_end(self, response, **kwargs):
        if self._start_time:
            self.total_time += time.time() - self._start_time

        # Response ke andar se token usage nikalna
        if hasattr(response, "llm_output") and response.llm_output:
            usage = response.llm_output.get("token_usage", {})
            self.total_input_tokens += usage.get("prompt_tokens", 0)
            self.total_output_tokens += usage.get("completion_tokens", 0)

    def get_cost(self) -> float:
        prices = self.PRICING.get(self.model_name, self.PRICING["gpt-4o-mini"])
        return (
            (self.total_input_tokens / 1_000_000) * prices["input"]
            + (self.total_output_tokens / 1_000_000) * prices["output"]
        )

    def summary(self) -> str:
        return (
            f"--- Token Tracker Summary ---\n"
            f"Model:          {self.model_name}\n"
            f"LLM calls:      {self.call_count}\n"
            f"Input tokens:   {self.total_input_tokens:,}\n"
            f"Output tokens:  {self.total_output_tokens:,}\n"
            f"Total tokens:   {self.total_input_tokens + self.total_output_tokens:,}\n"
            f"Total time:     {self.total_time:.2f}s\n"
            f"Avg time/call:  {self.total_time / max(self.call_count, 1):.2f}s\n"
            f"Estimated cost: ${self.get_cost():.6f}\n"
            f"-----------------------------"
        )


# Usage
tracker = TokenTracker()

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)
prompt = ChatPromptTemplate.from_messages([
    ("system", "Be concise."),
    ("human", "{q}"),
])
chain = prompt | model | StrOutputParser()

questions = [
    "Python kya hai?",
    "JavaScript kya hai?",
    "Python aur JavaScript compare karo.",
]

for q in questions:
    result = chain.invoke({"q": q}, config={"callbacks": [tracker]})
    print(f"Q: {q}\nA: {result[:80]}...\n")

print(tracker.summary())
```

> [!warning]
> **Gotcha:** `response.llm_output` ka structure provider ke hisaab se alag hota hai. OpenAI `token_usage` key use karta hai, kuch dusre providers (Anthropic, Google) alag naming use karte hain (`usage_metadata`, `usage`). Agar tum multi-provider support chahte ho, to hamesha check karo ki tumhara handler us provider ke response format ko sahi se parse kar raha hai — nahi to token count silently `0` reh jaayega aur tumhe pata bhi nahi chalega.

### LangGraph me token tracking

LangGraph agents me bhi ye callback system same tarah kaam karta hai kyunki LangGraph internally LangChain ke Runnables use karta hai:

```python
from langgraph.graph import StateGraph, MessagesState, START, END
from langchain_openai import ChatOpenAI

model = ChatOpenAI(model="gpt-4o-mini")

def call_model(state: MessagesState):
    response = model.invoke(state["messages"])
    return {"messages": [response]}

graph = StateGraph(MessagesState)
graph.add_node("agent", call_model)
graph.add_edge(START, "agent")
graph.add_edge("agent", END)
app = graph.compile()

tracker = TokenTracker()

# Callback poore graph execution ke liye pass hota hai
result = app.invoke(
    {"messages": [("user", "Delhi ka weather kaisa hai?")]},
    config={"callbacks": [tracker]},
)
print(tracker.summary())
```

Iska matlab — chahe agent kitne bhi nodes se hokar guzre, kitni bhi baar loop kare (ReAct pattern me tool call → LLM → tool call...), tumhara single `TokenTracker` **poore run ka aggregate** dekhega.

---

## Part 4: Performance / Timing Callback

Latency breakdown karna zaruri hai taaki pata chale bottleneck kahan hai — LLM call slow hai ya tool execution (jaise ek external API call jo database hit kar rahi hai)?

```python
from langchain_core.callbacks import BaseCallbackHandler
import time

class PerformanceTracker(BaseCallbackHandler):
    """Har component ka execution time track karta hai."""

    def __init__(self):
        self.timings: dict[str, list[float]] = {}
        self._starts: dict[str, float] = {}

    def on_chain_start(self, serialized, inputs, *, run_id, **kwargs):
        self._starts[str(run_id)] = time.time()

    def on_chain_end(self, outputs, *, run_id, **kwargs):
        start = self._starts.pop(str(run_id), None)
        if start:
            elapsed = time.time() - start
            self.timings.setdefault("chain", []).append(elapsed)

    def on_chat_model_start(self, serialized, messages, *, run_id, **kwargs):
        self._starts[str(run_id)] = time.time()

    def on_llm_end(self, response, *, run_id, **kwargs):
        start = self._starts.pop(str(run_id), None)
        if start:
            elapsed = time.time() - start
            self.timings.setdefault("llm", []).append(elapsed)

    def on_tool_start(self, serialized, input_str, *, run_id, **kwargs):
        self._starts[str(run_id)] = time.time()

    def on_tool_end(self, output, *, run_id, **kwargs):
        start = self._starts.pop(str(run_id), None)
        if start:
            elapsed = time.time() - start
            self.timings.setdefault("tool", []).append(elapsed)

    def summary(self) -> str:
        lines = ["--- Performance Summary ---"]
        for component, times in self.timings.items():
            avg = sum(times) / len(times)
            total = sum(times)
            lines.append(
                f"{component}: {len(times)} calls, "
                f"avg {avg:.3f}s, total {total:.3f}s"
            )
        lines.append("-" * 30)
        return "\n".join(lines)
```

> [!tip]
> `run_id` per-invocation unique hota hai, isliye `_starts` dictionary me use key ke roop me use karna safe hai — parallel requests ke beech timing data mix nahi hoga. Ye zaruri hai jab tum async ya concurrent requests handle kar rahe ho (jaise FastAPI server jahan multiple users simultaneously agent call kar rahe hain).

---

## Part 5: Verbose aur Debug Mode — Quick Debugging

Kabhi kabhi tumhe custom handler likhne ki zarurat nahi, bas jaldi se dekhna hai chain ke andar kya ho raha hai:

```python
from langchain.globals import set_verbose, set_debug

# Verbose: har component ka input/output print karta hai
set_verbose(True)
chain.invoke({"question": "Hello"})
set_verbose(False)

# Debug: SAB KUCH print karta hai (bahut detailed)
set_debug(True)
chain.invoke({"question": "Hello"})
set_debug(False)
```

> [!info]
> **Node.js parallel:** Ye bilkul waisa hai jaise tum apne Node app me `DEBUG=*` ya `LOG_LEVEL=debug` env variable set karte ho. `set_verbose` Express ke `morgan` middleware jaisa hai (basic request logging), aur `set_debug` har function entry/exit par `console.log` lagane jaisa hai.

> [!warning]
> `set_debug(True)` **bahut verbose** hota hai — production me isse kabhi enable mat karo, sirf local development me use karo. Ye poore prompt templates, full message history, aur internal serialized objects print karta hai jisse logs unreadable ho jaate hain aur agar sensitive data (jaise user PII) prompt me hai to wo bhi logs me leak ho sakta hai.

---

## Part 6: LangSmith — Production Observability Platform

### LangSmith kya hai?

Custom callback handlers chhote projects ke liye theek hain, lekin production agent me tumhe chahiye: searchable trace history, visual execution graphs, team collaboration, evaluation datasets, aur alerting. Ye sab khud banana time-consuming hai — isliye LangChain team ne **LangSmith** banaya, jo LLM applications ke liye ek dedicated observability platform hai.

Socho isse Datadog APM ki tarah — jaise Datadog tumhe microservices ke beech request flow dikhata hai, LangSmith tumhe LLM chains/agents ke beech har step dikhata hai: kaunsa prompt gaya, kya response aaya, kitne tokens lage, kitna time laga, aur agar galti hui to exact step kaunsa tha.

### LangSmith kya dikhata hai

- Har chain/agent execution ka **complete visual trace** (tree structure)
- Har step ka **token usage aur cost**
- **Latency breakdown** — kaunsa step sabse zyada time le raha hai
- Har component ka exact **input/output**
- **Tool calls** aur unke results
- **Error traces** — exact stack trace kis step par fail hua
- **Evaluation metrics** (agar tum LangSmith ke evaluation framework use karte ho)
- Runs ko **tags aur metadata** se filter karna (jaise sirf ek specific user ke runs dekhna)

### Setup — bina code change ke tracing

Sabse best part: LangSmith enable karne ke liye tumhe apne chain/agent code me **kuch bhi change nahi karna** padta. Sirf environment variables set karo.

**Step 1:** [smith.langchain.com](https://smith.langchain.com) par account banao aur API key generate karo.

**Step 2:** `.env` file me ye set karo:

```env
# .env
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=lsv2_pt_your_key_here
LANGCHAIN_PROJECT=my-agent-project
```

**Step 3:** Bas, ab tumhara code jaisa hai waisa hi rahega:

```python
from dotenv import load_dotenv
load_dotenv()  # .env se env vars load karta hai

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)
chain = (
    ChatPromptTemplate.from_messages([
        ("system", "You are helpful."),
        ("human", "{q}"),
    ])
    | model
    | StrOutputParser()
)

# Ye call automatically LangSmith me trace ho jaayega — koi extra code nahi
result = chain.invoke({"q": "LangSmith kya hai?"})
```

Isko chalane ke baad LangSmith dashboard par jaake `my-agent-project` project kholo — waha tumhe poori trace timeline dikhegi, prompt ke saath, response ke saath, latency ke saath.

### LangGraph agents ka tracing

LangGraph agents automatically trace hote hain jab tracing env vars set ho — koi extra setup nahi chahiye:

```python
from langgraph.graph import StateGraph, MessagesState, START, END

# ... graph define karo jaise pehle kiya tha ...
app = graph.compile()

# Ye poora multi-step agent run (loops, tool calls sab kuch) LangSmith me trace hoga
result = app.invoke({"messages": [("user", "Mera order kaha hai?")]})
```

LangSmith graph ke har node, har tool call, aur agar agent loop chala (ReAct pattern) to har iteration ko **nested tree** ke roop me dikhata hai — isse debug karna bahut easy ho jaata hai ki agent kitni baar loop chala aur kyun.

### Runs ko tag aur metadata dena

Production me tumhe har run ko specific user, session, ya environment se link karna hota hai — taaki jab koi bug report aaye, tum exact trace dhoond sako.

```python
result = chain.invoke(
    {"q": "Python kya hai?"},
    config={
        "metadata": {
            "user_id": "user_123",
            "session_id": "sess_abc",
            "environment": "production",
        },
        "tags": ["qa", "python-topic"],
        "run_name": "python_qa_query",
    },
)
```

> [!tip]
> Ye bilkul waisa hai jaise tum Node.js me har HTTP request ke saath `X-Request-ID` header ya `correlation_id` pass karte ho — jab production me issue aaye, tum us specific request ko turant logs me dhoond sakte ho. LangSmith me `metadata` aur `tags` yahi role play karte hain.

### Programmatic access — traces ko code se query karna

Kabhi kabhi tumhe dashboard nahi, code se hi traces analyze karne hote hain (jaise weekly cost report banane ke liye):

```python
from langsmith import Client

client = Client()

# Recent top-level runs list karo
runs = client.list_runs(
    project_name="my-agent-project",
    execution_order=1,  # sirf top-level runs, nested calls nahi
    limit=10,
)

for run in runs:
    print(f"Run: {run.name}")
    print(f"  Status: {run.status}")
    print(f"  Latency: {run.end_time - run.start_time}")
    print(f"  Tokens: {run.total_tokens}")
    print(f"  Cost: ${run.total_cost:.6f}")
```

### LangSmith vs custom callbacks — kab kya use karein?

| Situation | Use karo |
|---|---|
| Local development, quick debug | `set_verbose`/`set_debug` |
| Custom business metrics (jaise "kitne orders resolve hue") | Custom callback handler |
| Production-grade trace history, team debugging | LangSmith |
| Cost dashboard across teams/projects | LangSmith |
| Compliance/audit logging to apne database me | Custom callback + apna log storage |
| A/B testing prompts, evaluation | LangSmith Evaluation |

> [!info]
> Ye mutually exclusive nahi hain — production setups me generally **dono ek saath** use hote hain: LangSmith overall observability ke liye, aur custom callbacks apne specific business logic (jaise "agar cost budget cross ho jaye to Slack alert bhejo") ke liye.

---

## Part 7: Streaming Callbacks — Real-time Token Tracking

Jab tum streaming response dikhate ho (jaise ChatGPT ki tarah word-by-word), tumhe **Time to First Token (TTFT)** aur **tokens/second** jaise metrics chahiye hote hain — ye user-perceived latency ka sabse important measure hai.

```python
from langchain_core.callbacks import BaseCallbackHandler
import time

class StreamHandler(BaseCallbackHandler):
    """Streaming tokens ko metadata ke saath track karta hai."""

    def __init__(self):
        self.tokens = []
        self.first_token_time = None
        self.start_time = None

    def on_chat_model_start(self, serialized, messages, **kwargs):
        self.start_time = time.time()
        self.tokens = []
        self.first_token_time = None

    def on_llm_new_token(self, token: str, **kwargs):
        if self.first_token_time is None:
            self.first_token_time = time.time()
        self.tokens.append(token)

    def on_llm_end(self, response, **kwargs):
        end_time = time.time()
        if self.start_time and self.first_token_time:
            ttft = self.first_token_time - self.start_time
            total = end_time - self.start_time
            tps = len(self.tokens) / total if total > 0 else 0
            print(f"\n--- Stream Stats ---")
            print(f"Time to first token: {ttft:.3f}s")
            print(f"Total time: {total:.3f}s")
            print(f"Tokens: {len(self.tokens)}")
            print(f"Tokens/second: {tps:.1f}")


stream_handler = StreamHandler()
model = ChatOpenAI(model="gpt-4o-mini", temperature=0, streaming=True)

for chunk in model.stream(
    "Python ke baare me ek paragraph likho.",
    config={"callbacks": [stream_handler]},
):
    print(chunk.content, end="", flush=True)
```

> [!info]
> **Kyun TTFT matter karta hai:** User ke liye "response start hone me kitna time laga" zyada important hota hai "total response kitne time me complete hua" se. Jaise Swiggy app me tumhe "order confirm ho gaya" turant dikhta hai, chahe delivery me 30 minute lage — waisi hi UX perception LLM streaming me bhi kaam karti hai.

---

## Part 8: Node.js Observability se Comparison

| Concept | Node.js | LangChain Python |
|---|---|---|
| Request tracing | OpenTelemetry / Jaeger | LangSmith |
| Structured logging | Winston / Pino | Callback handlers |
| APM | Datadog / New Relic | LangSmith |
| Metrics | Prometheus | Token tracker callbacks |
| Debug mode | `DEBUG=*` env var | `set_debug(True)` |
| Middleware pattern | Express middleware | Callback handlers |
| Request correlation ID | `X-Request-ID` header | `run_id` / `metadata` |

---

## Part 9: Production-Ready Complete Observability Setup

Ab sab kuch combine karke ek production-grade handler banate hain jo logging, metrics, aur error tracking sab ek saath karta hai:

```python
"""
observability.py -- Production-ready observability setup.
"""
from dotenv import load_dotenv
load_dotenv()

import time
import logging
from langchain_core.callbacks import BaseCallbackHandler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("agent_app")


class ProductionCallbackHandler(BaseCallbackHandler):
    """Logging aur metrics dono handle karne wala production-grade handler."""

    def __init__(self):
        self.metrics = {
            "llm_calls": 0,
            "llm_errors": 0,
            "tool_calls": 0,
            "tool_errors": 0,
            "total_input_tokens": 0,
            "total_output_tokens": 0,
            "total_llm_time": 0.0,
        }
        self._run_starts: dict[str, float] = {}

    def on_chat_model_start(self, serialized, messages, *, run_id, **kwargs):
        self._run_starts[str(run_id)] = time.time()
        self.metrics["llm_calls"] += 1
        msg_count = sum(len(batch) for batch in messages)
        logger.info(f"LLM call started (run={str(run_id)[:8]}, messages={msg_count})")

    def on_llm_end(self, response, *, run_id, **kwargs):
        elapsed = time.time() - self._run_starts.pop(str(run_id), time.time())
        self.metrics["total_llm_time"] += elapsed

        if hasattr(response, "llm_output") and response.llm_output:
            usage = response.llm_output.get("token_usage", {})
            self.metrics["total_input_tokens"] += usage.get("prompt_tokens", 0)
            self.metrics["total_output_tokens"] += usage.get("completion_tokens", 0)

        logger.info(f"LLM call completed (run={str(run_id)[:8]}, time={elapsed:.3f}s)")

    def on_llm_error(self, error, *, run_id, **kwargs):
        self.metrics["llm_errors"] += 1
        logger.error(f"LLM error (run={str(run_id)[:8]}): {error}")

    def on_tool_start(self, serialized, input_str, *, run_id, **kwargs):
        self._run_starts[str(run_id)] = time.time()
        self.metrics["tool_calls"] += 1
        tool_name = serialized.get("name", "unknown")
        logger.info(f"Tool '{tool_name}' called (run={str(run_id)[:8]})")

    def on_tool_end(self, output, *, run_id, **kwargs):
        elapsed = time.time() - self._run_starts.pop(str(run_id), time.time())
        logger.info(f"Tool completed (run={str(run_id)[:8]}, time={elapsed:.3f}s)")

    def on_tool_error(self, error, *, run_id, **kwargs):
        self.metrics["tool_errors"] += 1
        logger.error(f"Tool error (run={str(run_id)[:8]}): {error}")

    def get_metrics(self) -> dict:
        return {
            **self.metrics,
            "avg_llm_time": (
                self.metrics["total_llm_time"] / max(self.metrics["llm_calls"], 1)
            ),
            "error_rate": (
                (self.metrics["llm_errors"] + self.metrics["tool_errors"])
                / max(self.metrics["llm_calls"] + self.metrics["tool_calls"], 1)
            ),
        }

    def print_metrics(self):
        m = self.get_metrics()
        print("\n=== Application Metrics ===")
        print(f"LLM calls:      {m['llm_calls']} ({m['llm_errors']} errors)")
        print(f"Tool calls:     {m['tool_calls']} ({m['tool_errors']} errors)")
        print(f"Input tokens:   {m['total_input_tokens']:,}")
        print(f"Output tokens:  {m['total_output_tokens']:,}")
        print(f"Avg LLM time:   {m['avg_llm_time']:.3f}s")
        print(f"Error rate:     {m['error_rate']:.1%}")
        print("===========================")


# --- Usage ---
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

handler = ProductionCallbackHandler()

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)
prompt = ChatPromptTemplate.from_messages([
    ("system", "Be concise."),
    ("human", "{question}"),
])
chain = prompt | model | StrOutputParser()

for q in ["Python kya hai?", "LCEL kya hai?", "Agents kya hote hain?"]:
    result = chain.invoke(
        {"question": q},
        config={"callbacks": [handler]},
    )
    print(f"Q: {q} -> A: {result[:60]}...")

handler.print_metrics()
```

Ye handler production me kaam kaise aata hai:

- **Structured logs** ki wajah se tum ELK/Grafana Loki jaise log aggregator me query kar sakte ho
- **Metrics dictionary** ko Prometheus jaise metrics endpoint pe expose kiya ja sakta hai (`/metrics` route)
- **Error rate** track karke tum alert set kar sakte ho (jaise "agar error rate 5% se zyada ho to PagerDuty alert bhejo")

---

## Part 10: Production Considerations aur Common Mistakes

### 1. Token count silently zero reh jaana
Different providers (OpenAI vs Anthropic vs Google) ka response format alag hota hai. Agar tumhara callback sirf OpenAI ke `token_usage` key check karta hai aur tum Anthropic model use kar rahe ho, to tokens hamesha `0` dikhega — koi error nahi aayega, bas silently wrong data milega.

> [!warning]
> Hamesha apna token tracking test karo actual response object print karke — assume mat karo ki structure same hoga sab providers ke liye.

### 2. `set_debug(True)` ko production me chhod dena
Ye ek common bug hai — dev me debug on karke bhool jaana. Isse logs bahut bade ho jaate hain aur sensitive data leak ho sakta hai. Hamesha environment-based flag use karo:

```python
import os
from langchain.globals import set_debug

set_debug(os.getenv("APP_ENV") == "development")
```

### 3. Callback handler me heavy/blocking operations
Callback handlers **synchronously** chain execution ke saath chalte hain. Agar tumhare `on_llm_end` me tum ek slow database write kar rahe ho, to ye poore chain ko slow kar dega. Async operations ke liye `AsyncCallbackHandler` use karo, ya heavy work ko background queue (jaise Celery, RQ) me bhejo.

### 4. LangSmith key production secrets me leak hona
`LANGCHAIN_API_KEY` ko kabhi bhi code me hardcode mat karo ya git me commit mat karo — `.env` file use karo aur `.gitignore` me add karo, bilkul waise jaise tum `OPENAI_API_KEY` handle karte ho.

### 5. Cost tracking sirf estimate hai, exact billing nahi
`TokenTracker` jaisa handler ek **estimate** deta hai based on tumhare pricing table par. Actual billing provider ke dashboard (OpenAI/Anthropic console) se match karo periodically — pricing change ho sakti hai, aur kuch edge cases (jaise cached tokens, batch API discounts) is estimate me reflect nahi hote.

### 6. Multiple handlers ek saath use karna
Production me tum aksar ek se zyada handler ek saath chalate ho — ek logging ke liye, ek metrics ke liye, ek alerting ke liye. Ye bilkul safe hai, sab independent chalte hain:

```python
handlers = [
    LoggingHandler(),
    TokenTracker(),
    ProductionCallbackHandler(),
]

result = chain.invoke(
    {"question": "Python generators explain karo"},
    config={"callbacks": handlers},
)
```

---

## Practice Exercises

1. **File logging handler** — Ek `FileLoggingHandler` banao jo har callback event ko ek JSON Lines file me log kare. Har line ek JSON object ho: timestamp, event type, run ID, aur relevant data. Ek multi-step chain chalao aur log file inspect karo.

2. **Token budget enforcer** — Ek `TokenBudgetHandler` banao jo cumulative token usage track kare aur agar ek specified budget (jaise 10,000 tokens) cross ho jaye to exception raise kare. Isse test karo ek loop of queries chalake.

3. **LangSmith setup** — Apne kisi chain, agent, aur RAG pipeline ke liye LangSmith tracing setup karo. LangSmith UI me traces explore karo — total latency, per-step time, token counts, aur visual trace graph note karo.

4. **Performance dashboard** — Ek `DashboardHandler` banao jo har component ka timing data collect kare aur batch of queries ke baad formatted performance report print kare. Include karo: slowest component, fastest component, total time, component-type ke hisaab se breakdown.

5. **Alerting callback** — Ek callback banao jo anomalies detect kare: agar koi LLM call 10 seconds se zyada le, agar single call me token usage 4000 cross kare, ya koi tool error aaye — warning print kare. Har scenario trigger karke test karo.

6. **Multiple handlers combine karna** — Teen specialized handlers banao (logging, metrics, alerting) aur unhe ek saath ek chain par use karo. Verify karo ki wo ek dusre ko interfere nahi karte aur har ek apna data sahi se capture karta hai.

```python
handlers = [
    FileLoggingHandler("chain.log"),
    TokenTracker(),
    AlertHandler(max_latency=10.0, max_tokens=4000),
]

result = chain.invoke(
    {"question": "Python generators explain karo"},
    config={"callbacks": handlers},
)
```

---

## Key Takeaways

- LangChain ka **callback system** har Runnable (model, chain, tool, retriever) ke execution events (`on_llm_start`, `on_tool_end`, etc.) par fire hota hai — ye Node.js ke Express middleware/EventEmitter pattern jaisa hai.
- Callbacks ko **request-level** (`config={"callbacks": [...]}`) ya **constructor-level** (`callbacks=[...]` param) attach kiya ja sakta hai — production me request-level zyada flexible hota hai kyunki per-request metadata pass kar sakte ho.
- **Custom callback handlers** se tum token tracking, cost calculation, latency measurement, aur structured logging khud implement kar sakte ho.
- `set_verbose(True)` aur `set_debug(True)` quick local debugging ke liye achhe hain, lekin production me kabhi enable mat karo — sensitive data leak aur log bloat ka risk hai.
- **LangSmith** LangChain/LangGraph applications ke liye dedicated observability platform hai — env vars (`LANGCHAIN_TRACING_V2`, `LANGCHAIN_API_KEY`, `LANGCHAIN_PROJECT`) set karke bina code change ke automatic tracing milta hai.
- Agents **non-deterministic** hote hain — same input alag execution path le sakta hai — isliye tracing/observability normal software se bhi zyada critical hai agent-based systems me.
- LangGraph agents automatically LangSmith me trace hote hain kyunki wo internally LangChain Runnables use karte hain — multi-step loops (ReAct pattern) bhi nested trace tree me dikhte hain.
- Production me `metadata` aur `tags` use karke runs ko user_id/session_id se correlate karo — ye HTTP request correlation IDs jaisa concept hai.
- Token tracking hamesha provider-specific response format ke hisaab se test karo — galat assumption se cost silently `0` ya galat dikh sakti hai.
- Real production setups me generally **LangSmith + custom callbacks dono** ek saath use hote hain — LangSmith overall visibility ke liye, custom callbacks apne business-specific alerts/metrics ke liye.
