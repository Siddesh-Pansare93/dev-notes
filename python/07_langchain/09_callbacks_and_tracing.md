# 09 - Callbacks and Tracing

## Why Tracing Matters

When your LangChain application chains together prompts, models, tools, and retrievers, debugging becomes hard. Which step failed? How many tokens did each call use? Why did the agent make that decision? How long did retrieval take?

Callbacks and tracing give you observability into every step of your chain -- similar to how you use OpenTelemetry or Datadog APM to trace HTTP requests through microservices in Node.js.

---

## The Callback System

LangChain has a callback system that fires events at key points during execution. Every `Runnable` (model, chain, tool, retriever) supports callbacks.

### Callback events

| Event | Fires When |
|---|---|
| `on_llm_start` | LLM call begins |
| `on_llm_end` | LLM call completes |
| `on_llm_error` | LLM call fails |
| `on_chat_model_start` | Chat model call begins |
| `on_chain_start` | Chain execution begins |
| `on_chain_end` | Chain execution completes |
| `on_chain_error` | Chain execution fails |
| `on_tool_start` | Tool execution begins |
| `on_tool_end` | Tool execution completes |
| `on_tool_error` | Tool execution fails |
| `on_retriever_start` | Retriever query begins |
| `on_retriever_end` | Retriever returns results |
| `on_llm_new_token` | New token generated during streaming |

---

## Custom Callback Handlers

### Basic callback handler

```python
from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.messages import BaseMessage
from typing import Any

class LoggingHandler(BaseCallbackHandler):
    """Logs key events during chain execution."""

    def on_chat_model_start(
        self,
        serialized: dict[str, Any],
        messages: list[list[BaseMessage]],
        **kwargs: Any,
    ) -> None:
        print(f"\n[MODEL START] Sending {len(messages[0])} messages")
        for msg in messages[0]:
            print(f"  {msg.__class__.__name__}: {msg.content[:80]}...")

    def on_llm_end(self, response, **kwargs: Any) -> None:
        token_usage = response.llm_output
        print(f"[MODEL END] Response received")

    def on_llm_new_token(self, token: str, **kwargs: Any) -> None:
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
        print(f"[TOOL END] Result: {output[:100]}")

    def on_chain_error(self, error: Exception, **kwargs: Any) -> None:
        print(f"[ERROR] {type(error).__name__}: {error}")
```

### Using the callback handler

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

# Pass callbacks to invoke
handler = LoggingHandler()
result = chain.invoke(
    {"question": "What is Python?"},
    config={"callbacks": [handler]},
)
print(f"\nResult: {result}")
```

### Constructor-level callbacks

```python
# Attach callbacks at construction time -- they fire for every call
model = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0,
    callbacks=[LoggingHandler()],
)
```

---

## Token Tracking Callback

```python
from langchain_core.callbacks import BaseCallbackHandler
from typing import Any
import time

class TokenTracker(BaseCallbackHandler):
    """Track token usage and costs across all LLM calls."""

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

        # Try to get model name
        model = kwargs.get("invocation_params", {}).get("model_name", self.model_name)
        self.model_name = model

    def on_llm_end(self, response, **kwargs):
        if self._start_time:
            self.total_time += time.time() - self._start_time

        # Extract token counts from the response
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

# Run several queries
questions = [
    "What is Python?",
    "What is JavaScript?",
    "Compare Python and JavaScript.",
]

for q in questions:
    result = chain.invoke({"q": q}, config={"callbacks": [tracker]})
    print(f"Q: {q}\nA: {result[:80]}...\n")

# Print summary
print(tracker.summary())
```

---

## Timing and Performance Callback

```python
from langchain_core.callbacks import BaseCallbackHandler
import time
from typing import Any

class PerformanceTracker(BaseCallbackHandler):
    """Track execution time of each component."""

    def __init__(self):
        self.timings: dict[str, list[float]] = {}
        self._starts: dict[str, float] = {}

    def on_chain_start(self, serialized, inputs, *, run_id, **kwargs):
        self._starts[str(run_id)] = time.time()

    def on_chain_end(self, outputs, *, run_id, **kwargs):
        start = self._starts.pop(str(run_id), None)
        if start:
            elapsed = time.time() - start
            name = "chain"
            self.timings.setdefault(name, []).append(elapsed)

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
            name = "tool"
            self.timings.setdefault(name, []).append(elapsed)

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

---

## Verbose and Debug Mode

Quick debugging without writing custom handlers:

```python
from langchain.globals import set_verbose, set_debug

# Verbose: prints inputs and outputs of each component
set_verbose(True)

chain.invoke({"question": "Hello"})
# Prints each step's input/output

set_verbose(False)

# Debug: prints EVERYTHING (very detailed)
set_debug(True)

chain.invoke({"question": "Hello"})
# Prints serialized components, full messages, metadata, etc.

set_debug(False)
```

> **Node.js parallel:** This is like setting `DEBUG=*` or `LOG_LEVEL=debug` in your Node.js application. The verbose mode is like Express's `morgan` middleware, and debug mode is like having `console.log` on every function entry/exit.

---

## LangSmith: Tracing and Debugging Platform

LangSmith is LangChain's observability platform. It is like Datadog APM but specifically designed for LLM applications.

### What LangSmith shows you

- Complete trace of every chain execution
- Token usage and costs per step
- Latency breakdown
- Input/output of every component
- Tool calls and their results
- Error traces
- Evaluation metrics

### Setup

1. Sign up at [smith.langchain.com](https://smith.langchain.com)
2. Create an API key
3. Set environment variables

```env
# .env
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=lsv2_pt_your_key_here
LANGCHAIN_PROJECT=my-project-name
```

```python
# That's it. No code changes needed.
# LangSmith automatically traces all LangChain operations.

from dotenv import load_dotenv
load_dotenv()  # Loads the env vars above

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

# This call is automatically traced in LangSmith
result = chain.invoke({"q": "What is LangSmith?"})
```

### Adding run metadata

```python
# Tag runs for filtering in the LangSmith UI
result = chain.invoke(
    {"q": "What is Python?"},
    config={
        "metadata": {
            "user_id": "user_123",
            "session_id": "sess_abc",
            "environment": "development",
        },
        "tags": ["qa", "python-topic"],
        "run_name": "python_qa_query",
    },
)
```

### Programmatic access to traces

```python
from langsmith import Client

client = Client()

# List recent runs
runs = client.list_runs(
    project_name="my-project-name",
    execution_order=1,  # Top-level runs only
    limit=10,
)

for run in runs:
    print(f"Run: {run.name}")
    print(f"  Status: {run.status}")
    print(f"  Latency: {run.end_time - run.start_time}")
    print(f"  Tokens: {run.total_tokens}")
    print(f"  Cost: ${run.total_cost:.6f}")
```

---

## Streaming Callbacks

Track streaming tokens in real-time:

```python
from langchain_core.callbacks import BaseCallbackHandler

class StreamHandler(BaseCallbackHandler):
    """Handle streaming tokens with metadata."""

    def __init__(self):
        self.tokens = []
        self.first_token_time = None
        self.start_time = None

    def on_chat_model_start(self, serialized, messages, **kwargs):
        import time
        self.start_time = time.time()
        self.tokens = []
        self.first_token_time = None

    def on_llm_new_token(self, token: str, **kwargs):
        import time
        if self.first_token_time is None:
            self.first_token_time = time.time()
        self.tokens.append(token)

    def on_llm_end(self, response, **kwargs):
        import time
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


# Usage
stream_handler = StreamHandler()

model = ChatOpenAI(model="gpt-4o-mini", temperature=0, streaming=True)

for chunk in model.stream(
    "Write a paragraph about Python.",
    config={"callbacks": [stream_handler]},
):
    print(chunk.content, end="", flush=True)
```

---

## Comparison with Node.js Observability

| Concept | Node.js | LangChain Python |
|---|---|---|
| Request tracing | OpenTelemetry / Jaeger | LangSmith |
| Structured logging | Winston / Pino | Callback handlers |
| APM | Datadog / New Relic | LangSmith |
| Metrics | Prometheus | Token tracker callbacks |
| Debug mode | `DEBUG=*` env var | `set_debug(True)` |
| Middleware pattern | Express middleware | Callback handlers |

### The middleware analogy

In Express, you might write:

```javascript
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    const start = Date.now();
    res.on('finish', () => {
        console.log(`${res.statusCode} ${Date.now() - start}ms`);
    });
    next();
});
```

The LangChain equivalent is a callback handler that logs chain starts/ends.

---

## Complete Observability Setup

```python
"""
observability.py -- Production-ready observability setup.
"""
from dotenv import load_dotenv
load_dotenv()

import time
import json
import logging
from typing import Any
from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.messages import BaseMessage

# Configure Python logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("langchain_app")


class ProductionCallbackHandler(BaseCallbackHandler):
    """Production-grade callback handler with logging and metrics."""

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

    def on_chat_model_start(
        self, serialized, messages, *, run_id, **kwargs
    ):
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

# Run several queries
for q in ["What is Python?", "What is LCEL?", "What are agents?"]:
    result = chain.invoke(
        {"question": q},
        config={"callbacks": [handler]},
    )
    print(f"Q: {q} -> A: {result[:60]}...")

handler.print_metrics()
```

---

## Practice Exercises

### Exercise 1: Logging callback
Write a `FileLoggingHandler` that logs every callback event to a JSON Lines file. Each line should be a JSON object with: timestamp, event type, run ID, and relevant data. Run a chain with several steps and inspect the log file.

### Exercise 2: Token budget enforcer
Create a `TokenBudgetHandler` callback that tracks cumulative token usage and raises an exception when a specified budget (e.g., 10,000 tokens) is exceeded. Test it by running a loop of queries and verify it stops at the right time.

### Exercise 3: LangSmith setup
Set up LangSmith tracing for a project. Run a chain, an agent, and a RAG pipeline. Explore the traces in the LangSmith UI. Take note of: total latency, time per step, token counts, and the visual trace graph.

### Exercise 4: Performance dashboard
Build a `DashboardHandler` that collects timing data for every component and prints a formatted performance report after a batch of queries. Include: slowest component, fastest component, total time, and a breakdown by component type.

### Exercise 5: Alerting callback
Create a callback that detects anomalies: if any LLM call takes longer than 10 seconds, if token usage exceeds 4000 in a single call, or if any tool errors occur, print a warning. Test by creating scenarios that trigger each alert.

### Exercise 6: Combine multiple handlers
Create three specialized handlers (logging, metrics, alerting) and use them all simultaneously on the same chain. Verify they do not interfere with each other and that each captures its own data correctly.

```python
handlers = [
    FileLoggingHandler("chain.log"),
    TokenTracker(),
    AlertHandler(max_latency=10.0, max_tokens=4000),
]

result = chain.invoke(
    {"question": "Explain Python generators"},
    config={"callbacks": handlers},
)
```
