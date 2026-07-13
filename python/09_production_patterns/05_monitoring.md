# Monitoring, Observability, aur LLM-Specific Metrics

## Kyun Standard Monitoring AI Apps Ke Liye Kaafi Nahi Hota?

Socho ek normal backend application — usme sirf latency, error rates, aur throughput dekh liya toh chal jata hai. Lekin ek AI-powered backend bilkul alag khel hai. Yaha tumhe ek aur layer dekhnا पड़ता है:

- **LLM costs** — tum ek chhoti-si bug se ek ghante mein 1000 doller ud sakta hai. Zomato ke servers crash ho jaaye toh orders affected hote hain, lekin LLM bug se sirf paise jaate hain. Bahut expensive!
- **Token usage** — agar rate limit hit ho gaya toh sare users ke requests block ho jaenge. Tera cache nahi hit kar raha toh continuously paise burn ho rahe hain.
- **Agent behavior** — infinite loops, hallucinations, ya tool failures mein agent kabhi kabhi pagal ho sakta hai. Ise catch karna padta hai real-time mein.
- **Response quality** — bas API 200 return kar di, bas nahi. Dekhna padta hai ki answer galat to nahi diya. Ek chatbot ne galat info de dia toh user ko follow-up support deni padegi.

Toh yaha monitoring ke 4 layers ho jaate hain: health checks, metrics, distributed tracing, aur LLM-specific observability.

```mermaid
flowchart LR
    App["FastAPI App\n+ LangGraph Agents"]

    subgraph Observability["Observability Stack"]
        HC["❤️ Health Checks\n/health · /ready\n(liveness + readiness)"]
        Prom["📊 Prometheus Metrics\nlatency · error rate\ntoken usage · cost"]
        LS["🔬 LangSmith\nLLM traces · evals\nprompt versions"]
        Logs["📝 Structured Logs\nstructlog → JSON\ncorrelation IDs"]
    end

    K8s["Kubernetes\nLiveness/Readiness\nProbes"] --> HC
    Grafana["Grafana\nDashboards"] --> Prom
    Alerts["AlertManager\nPagerDuty"] --> Prom

    App --> HC
    App --> Prom
    App --> LS
    App --> Logs

    style App fill:#2563eb,color:#fff
    style HC fill:#059669,color:#fff
    style Prom fill:#f59e0b,color:#000
    style LS fill:#7c3aed,color:#fff
    style Logs fill:#374151,color:#fff
```

---

## 1. Health Check Endpoints

Har production app ko minimum do health endpoints chahiye. Socho Swiggy ke restaurants — unhe pata chalana hota hai ki delivery boy ready hai ya nahi. Isi tarah:

```python
# src/api/v1/health.py
import time
import structlog
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_db
from src.core.config import settings

router = APIRouter(tags=["Health"])
logger = structlog.get_logger(__name__)

# Track startup time for uptime reporting
_start_time = time.time()


@router.get("/health")
async def health():
    """
    Liveness probe: Kyaprocess alive hai?

    Kubernetes use karta hai decide karne ke liye ki pod ko restart karna hai ya nahi.
    Keep it lightweight -- koi external calls nahi.

    Node.js equivalent:
        app.get('/health', (req, res) => res.json({ status: 'ok' }));
    """
    return {
        "status": "ok",
        "version": settings.VERSION,
        "uptime_seconds": round(time.time() - _start_time),
    }


@router.get("/ready")
async def readiness(db: AsyncSession = Depends(get_db)):
    """
    Readiness probe: Kya yeh instance requests handle kar sakta hai?

    Kubernetes use karta hai traffic route karne ke liye. Sab critical dependencies
    ko check kar. Agar database niche hai ya Redis crash hua hai, toh 'ready nahi' bolde.
    """
    checks: dict[str, dict] = {}

    # Database check
    try:
        start = time.monotonic()
        await db.execute(text("SELECT 1"))
        elapsed = (time.monotonic() - start) * 1000
        checks["database"] = {"status": "ok", "latency_ms": round(elapsed, 1)}
    except Exception as e:
        checks["database"] = {"status": "error", "error": str(e)}

    # Redis check
    try:
        from src.core.redis import get_redis
        redis = get_redis()
        start = time.monotonic()
        await redis.ping()
        elapsed = (time.monotonic() - start) * 1000
        checks["redis"] = {"status": "ok", "latency_ms": round(elapsed, 1)}
    except Exception as e:
        checks["redis"] = {"status": "error", "error": str(e)}

    # LLM API check (lightweight -- don't actually call the model)
    try:
        import httpx
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get("https://api.openai.com/v1/models",
                                     headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"})
            checks["llm_api"] = {
                "status": "ok" if resp.status_code == 200 else "degraded",
                "status_code": resp.status_code,
            }
    except Exception as e:
        checks["llm_api"] = {"status": "error", "error": str(e)}

    all_ok = all(c["status"] == "ok" for c in checks.values())
    status_code = 200 if all_ok else 503

    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=status_code,
        content={
            "status": "ready" if all_ok else "not_ready",
            "checks": checks,
            "version": settings.VERSION,
            "environment": settings.ENVIRONMENT,
        },
    )
```

```typescript
// Node.js equivalent with Express
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: process.env.VERSION });
});

app.get('/ready', async (req, res) => {
  const checks: Record<string, any> = {};
  try {
    await db.query('SELECT 1');
    checks.database = { status: 'ok' };
  } catch (e) {
    checks.database = { status: 'error', error: e.message };
  }
  const allOk = Object.values(checks).every(c => c.status === 'ok');
  res.status(allOk ? 200 : 503).json({ status: allOk ? 'ready' : 'not_ready', checks });
});
```

---

## 2. Prometheus Metrics

### prometheus-fastapi-instrumentator

Yeh library FastAPI ko automatically Prometheus metrics se instrument kar deta hai — bilkul `express-prometheus-middleware` ya `prom-client` ke tarah Node.js mein.

```python
# src/core/metrics.py
from prometheus_fastapi_instrumentator import Instrumentator
from prometheus_client import Counter, Histogram, Gauge


# ── Auto-instrumentation ────────────────────────────────
instrumentator = Instrumentator(
    should_group_status_codes=True,     # Group 2xx, 3xx, etc.
    should_ignore_untemplated=True,     # Ignore unknown routes
    should_respect_env_var=False,       # Always enable
    excluded_handlers=["/health", "/ready", "/metrics"],
    inprogress_name="http_requests_inprogress",
    inprogress_labels=True,
)


# ── Custom LLM Metrics ──────────────────────────────────

# Hum kitne LLM calls kar rahe hain?
llm_calls_total = Counter(
    "llm_calls_total",
    "Total number of LLM API calls",
    ["model", "status"],  # Labels: model name, success/failure
)

# LLM calls kitna time leta hain?
llm_call_duration_seconds = Histogram(
    "llm_call_duration_seconds",
    "LLM API call duration in seconds",
    ["model"],
    buckets=[0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0, 120.0],
)

# Kitne tokens use kar rahe hain?
llm_tokens_total = Counter(
    "llm_tokens_total",
    "Total tokens consumed",
    ["model", "token_type"],  # token_type: prompt, completion
)

# Cost tracking — sabse important!
llm_cost_usd_total = Counter(
    "llm_cost_usd_total",
    "Estimated cumulative LLM cost in USD",
    ["model"],
)

# Kitne agents abhi chal rahe hain?
agent_executions_active = Gauge(
    "agent_executions_active",
    "Number of agent executions currently running",
    ["agent_name"],
)

# Agent iterations — infinite loop detect karne ke liye
agent_iterations = Histogram(
    "agent_iterations_total",
    "Number of iterations per agent execution",
    ["agent_name"],
    buckets=[1, 2, 3, 5, 10, 15, 20, 50],
)

# Cache metrics
cache_hits_total = Counter(
    "cache_hits_total",
    "Total cache hits",
    ["cache_type"],  # llm, embedding, api
)

cache_misses_total = Counter(
    "cache_misses_total",
    "Total cache misses",
    ["cache_type"],
)

# Tool execution metrics
tool_calls_total = Counter(
    "tool_calls_total",
    "Total tool calls by agents",
    ["tool_name", "status"],
)

tool_call_duration_seconds = Histogram(
    "tool_call_duration_seconds",
    "Tool execution duration",
    ["tool_name"],
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0],
)


def setup_metrics(app):
    """Call during app startup."""
    instrumentator.instrument(app).expose(app, endpoint="/metrics")
```

### Application Code Mein Metrics Use Karna

```python
# src/services/llm_service.py
import time
import structlog
from src.core.metrics import (
    llm_calls_total,
    llm_call_duration_seconds,
    llm_tokens_total,
    llm_cost_usd_total,
)

logger = structlog.get_logger(__name__)

# Cost per 1M tokens (update as pricing changes)
TOKEN_COSTS = {
    "gpt-4o": {"input": 5.00, "output": 15.00},
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
    "gpt-4-turbo": {"input": 10.00, "output": 30.00},
}


class InstrumentedLLMService:
    """LLM service with Prometheus metrics instrumentation."""

    def __init__(self, model: str = "gpt-4o"):
        self.model = model

    async def invoke(self, prompt: str) -> dict:
        start = time.monotonic()

        try:
            response = await self._call_llm(prompt)
            elapsed = time.monotonic() - start

            # Record metrics
            llm_calls_total.labels(model=self.model, status="success").inc()
            llm_call_duration_seconds.labels(model=self.model).observe(elapsed)

            # Token metrics
            usage = response.get("usage", {})
            prompt_tokens = usage.get("prompt_tokens", 0)
            completion_tokens = usage.get("completion_tokens", 0)

            llm_tokens_total.labels(
                model=self.model, token_type="prompt"
            ).inc(prompt_tokens)
            llm_tokens_total.labels(
                model=self.model, token_type="completion"
            ).inc(completion_tokens)

            # Cost tracking
            costs = TOKEN_COSTS.get(self.model, TOKEN_COSTS["gpt-4o"])
            cost = (
                prompt_tokens * costs["input"] +
                completion_tokens * costs["output"]
            ) / 1_000_000
            llm_cost_usd_total.labels(model=self.model).inc(cost)

            logger.info(
                "LLM call completed",
                model=self.model,
                latency_s=round(elapsed, 2),
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                cost_usd=round(cost, 6),
            )

            return response

        except Exception as e:
            elapsed = time.monotonic() - start
            llm_calls_total.labels(model=self.model, status="error").inc()
            llm_call_duration_seconds.labels(model=self.model).observe(elapsed)
            raise

    async def _call_llm(self, prompt: str) -> dict:
        """Actual LLM call -- implement with your preferred client."""
        ...
```

```typescript
// Node.js prom-client equivalent
import { Counter, Histogram, register } from 'prom-client';

const llmCallsTotal = new Counter({
  name: 'llm_calls_total',
  help: 'Total LLM API calls',
  labelNames: ['model', 'status'],
});

const llmDuration = new Histogram({
  name: 'llm_call_duration_seconds',
  help: 'LLM call duration',
  labelNames: ['model'],
  buckets: [0.5, 1, 2, 5, 10, 30, 60],
});

// Usage
const end = llmDuration.startTimer({ model: 'gpt-4o' });
const result = await llm.invoke(prompt);
end();
llmCallsTotal.inc({ model: 'gpt-4o', status: 'success' });

// Expose metrics
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

---

## 3. LangSmith for LLM Observability

LangSmith ek observability platform hai LangChain ke liye. Soch Datadog like, lekin sirf LLM applications ke liye. Har LLM call, har tool use, har chain execution ka trace dekh sakta hai. Itne detailed se pata chalta hai kaunsi request slow chal rahi, kaunsa agent infinite loop mein ja raha hai.

### Setup

```python
# src/core/langsmith.py
import os
from src.core.config import settings


def setup_langsmith() -> None:
    """
    Configure LangSmith tracing.

    Ek baar configure kar do, fir saari LangChain/LangGraph calls
    automatically trace ho jaengi — code mein kuch change karne ki zarurat nahi.
    """
    if not settings.LANGSMITH_API_KEY:
        return

    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGCHAIN_API_KEY"] = settings.LANGSMITH_API_KEY
    os.environ["LANGCHAIN_PROJECT"] = settings.LANGSMITH_PROJECT
    os.environ["LANGCHAIN_ENDPOINT"] = "https://api.smith.langchain.com"


# Call in main.py lifespan:
# setup_langsmith()
```

### Custom Tracing with LangSmith

```python
# src/services/chat_service.py
from langsmith import traceable
from langsmith.run_helpers import get_current_run_tree


class ChatService:

    @traceable(
        name="process_chat_message",
        run_type="chain",
        tags=["production", "chat"],
    )
    async def process_message(self, user_id: str, message: str) -> dict:
        """
        @traceable decorator se yeh function ki puri execution LangSmith ko
        bhej di jati hai:
        - Input arguments
        - Output value
        - Duration
        - Nested LLM/tool calls
        - Errors (agar ho)

        Distributed trace ka span add karne jaisa, lekin LLM workflows ke liye specially design kiya.
        """

        # Current trace mein metadata add kar
        run = get_current_run_tree()
        if run:
            run.metadata = {
                "user_id": user_id,
                "message_length": len(message),
                "environment": "production",
            }

        # Is function ke andar sari LangChain calls automatically
        # nested trace ban jate hain
        result = await self.agent.invoke(message)

        return {
            "reply": result.content,
            "tokens": result.usage_metadata.get("total_tokens", 0),
        }
```

### LangSmith Dikhata Kya Hai?

```
Trace: process_chat_message (2.3s)
├── ChatOpenAI.invoke (1.8s)
│   ├── Input: "Research the latest on quantum computing"
│   ├── Output: "I'll search for recent information..."
│   ├── Model: gpt-4o
│   ├── Tokens: 1,234
│   └── Cost: $0.0185
├── Tool: web_search (0.3s)
│   ├── Input: {"query": "quantum computing 2025 breakthroughs"}
│   └── Output: [3 results]
├── ChatOpenAI.invoke (1.2s)
│   ├── Input: [system + user + tool results]
│   ├── Output: "Based on recent developments..."
│   ├── Tokens: 2,100
│   └── Cost: $0.0315
└── Total Cost: $0.0500
```

### Evaluations with LangSmith

```python
# scripts/run_eval.py
"""
Test dataset ke against LLM evaluations run kar.
Issi se pata chalta hai ke tere prompts aur agents improve kar rahe hain ya nahi.
"""
from langsmith import Client
from langsmith.evaluation import evaluate


client = Client()

# Dataset create ya load kar
dataset = client.create_dataset("qa-test-cases")
client.create_examples(
    inputs=[
        {"question": "What is Python?"},
        {"question": "Explain async/await"},
        {"question": "What is a decorator?"},
    ],
    outputs=[
        {"answer": "Python is a programming language..."},
        {"answer": "async/await is a pattern for asynchronous..."},
        {"answer": "A decorator is a function that modifies..."},
    ],
    dataset_id=dataset.id,
)


# Define what you're evaluating
async def target(inputs: dict) -> dict:
    """The function under evaluation."""
    from src.services.chat_service import ChatService
    service = ChatService()
    result = await service.process_message("eval_user", inputs["question"])
    return {"answer": result["reply"]}


# Run evaluation
results = evaluate(
    target,
    data=dataset.name,
    evaluators=[
        "qa",           # Built-in QA correctness evaluator
        "relevance",    # Is the response relevant to the question?
    ],
    experiment_prefix="v2-prompt-update",
    max_concurrency=4,
)

print(f"Results: {results}")
```

---

## 4. OpenTelemetry

OpenTelemetry (OTel) vendor-neutral standard hai observability ke liye. Same tarike se kaam karta hai Python aur Node.js dono mein.

### Setup

```python
# src/core/telemetry.py
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.resources import Resource
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor

from src.core.config import settings


def setup_telemetry(app) -> None:
    """
    OpenTelemetry setup — traces, metrics, aur logs.

    Node.js mein equivalent:
        const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
        const { registerInstrumentations } = require('@opentelemetry/instrumentation');
    """
    if settings.ENVIRONMENT == "development":
        return  # Development mein LangSmith use kar, bas wahi kaafi hai

    resource = Resource.create({
        "service.name": settings.PROJECT_NAME,
        "service.version": settings.VERSION,
        "deployment.environment": settings.ENVIRONMENT,
    })

    # ── Tracing ──────────────────────────────────────────
    tracer_provider = TracerProvider(resource=resource)
    tracer_provider.add_span_processor(
        BatchSpanProcessor(
            OTLPSpanExporter(
                endpoint="http://otel-collector:4317",
                insecure=True,
            )
        )
    )
    trace.set_tracer_provider(tracer_provider)

    # ── Metrics ──────────────────────────────────────────
    metric_reader = PeriodicExportingMetricReader(
        OTLPMetricExporter(
            endpoint="http://otel-collector:4317",
            insecure=True,
        ),
        export_interval_millis=60_000,
    )
    meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
    metrics.set_meter_provider(meter_provider)

    # ── Auto-instrumentation ─────────────────────────────
    FastAPIInstrumentor.instrument_app(app)
    HTTPXClientInstrumentor().instrument()  # Trace outgoing HTTP (LLM API calls)
    SQLAlchemyInstrumentor().instrument()
    RedisInstrumentor().instrument()
```

### Custom Spans for LLM Calls

```python
# src/services/llm_service.py
from opentelemetry import trace

tracer = trace.get_tracer(__name__)


class LLMServiceWithTracing:

    async def invoke(self, prompt: str) -> dict:
        with tracer.start_as_current_span(
            "llm.invoke",
            attributes={
                "llm.model": self.model,
                "llm.prompt_length": len(prompt),
                "llm.provider": "openai",
            },
        ) as span:
            try:
                response = await self._call_llm(prompt)

                # Add response attributes
                span.set_attribute("llm.tokens.prompt", response["usage"]["prompt_tokens"])
                span.set_attribute("llm.tokens.completion", response["usage"]["completion_tokens"])
                span.set_attribute("llm.tokens.total", response["usage"]["total_tokens"])
                span.set_attribute("llm.cost_usd", self._calculate_cost(response["usage"]))

                return response

            except Exception as e:
                span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
                span.record_exception(e)
                raise
```

```typescript
// Node.js OpenTelemetry equivalent
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('llm-service');

async function invokeLLM(prompt: string) {
  return tracer.startActiveSpan('llm.invoke', async (span) => {
    try {
      span.setAttribute('llm.model', 'gpt-4o');
      const response = await callLLM(prompt);
      span.setAttribute('llm.tokens.total', response.usage.totalTokens);
      return response;
    } catch (e) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: e.message });
      throw e;
    } finally {
      span.end();
    }
  });
}
```

### OpenTelemetry Collector Configuration

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 10s
    send_batch_size: 1024

exporters:
  # Jaeger for traces
  jaeger:
    endpoint: jaeger:14250
    tls:
      insecure: true

  # Prometheus for metrics
  prometheus:
    endpoint: 0.0.0.0:8889

  # Loki for logs (via Grafana)
  loki:
    endpoint: http://loki:3100/loki/api/v1/push

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [jaeger]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheus]
```

---

## 5. Alerting on LLM Costs and Error Rates

### Prometheus Alerting Rules

```yaml
# prometheus/alerts.yml
groups:
  - name: llm_alerts
    rules:
      # ── Cost Alerts ────────────────────────────────────
      - alert: LLMCostHigh
        expr: increase(llm_cost_usd_total[1h]) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "LLM costs exceeding $10/hour"
          description: "Estimated LLM spending is {{ $value | humanize }}USD in the last hour."

      - alert: LLMCostCritical
        expr: increase(llm_cost_usd_total[1h]) > 50
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "LLM costs exceeding $50/hour -- possible runaway agent"

      # ── Error Rate Alerts ──────────────────────────────
      - alert: LLMErrorRateHigh
        expr: |
          rate(llm_calls_total{status="error"}[5m])
          / rate(llm_calls_total[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "LLM error rate above 10%"

      - alert: LLMRateLimited
        expr: increase(llm_calls_total{status="rate_limited"}[5m]) > 10
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Getting rate limited by LLM provider"

      # ── Latency Alerts ─────────────────────────────────
      - alert: LLMLatencyHigh
        expr: |
          histogram_quantile(0.95, rate(llm_call_duration_seconds_bucket[5m])) > 30
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "P95 LLM latency above 30 seconds"

      # ── Agent Alerts ───────────────────────────────────
      - alert: AgentLoopDetected
        expr: |
          histogram_quantile(0.99, rate(agent_iterations_total_bucket[5m])) > 15
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Agent likely stuck in a loop (>15 iterations)"

      - alert: ToolFailureRateHigh
        expr: |
          rate(tool_calls_total{status="error"}[5m])
          / rate(tool_calls_total[5m]) > 0.2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Tool failure rate above 20% for {{ $labels.tool_name }}"
```

### Cost Circuit Breaker

```python
# src/core/cost_limiter.py
import structlog
import redis.asyncio as aioredis

from src.core.exceptions import AppError

logger = structlog.get_logger(__name__)


class CostLimitExceeded(AppError):
    def __init__(self, current_cost: float, limit: float):
        super().__init__(
            message=f"LLM cost limit exceeded: ${current_cost:.2f} >= ${limit:.2f}",
            code="COST_LIMIT_EXCEEDED",
            status_code=429,
        )


class CostLimiter:
    """
    Circuit breaker jo LLM calls ko block kar de agar budget exceed ho jaye.
    Buggy agent ko paise ud dene se rokta hai.
    """

    def __init__(self, redis: aioredis.Redis, hourly_limit_usd: float = 50.0):
        self.redis = redis
        self.hourly_limit = hourly_limit_usd

    async def check_and_record(self, cost_usd: float) -> None:
        """Every LLM call ke baad call kar spending track karne ke liye."""
        key = "cost:hourly"

        pipe = self.redis.pipeline()
        pipe.incrbyfloat(key, cost_usd)
        pipe.expire(key, 3600)  # Reset every hour
        results = await pipe.execute()

        current_total = float(results[0])

        if current_total >= self.hourly_limit:
            logger.critical(
                "Cost limit exceeded -- blocking LLM calls",
                current_cost=current_total,
                limit=self.hourly_limit,
            )
            raise CostLimitExceeded(current_total, self.hourly_limit)

        if current_total >= self.hourly_limit * 0.8:
            logger.warning(
                "Approaching cost limit",
                current_cost=current_total,
                limit=self.hourly_limit,
                utilization_pct=round(current_total / self.hourly_limit * 100, 1),
            )
```

---

## 6. Dashboard Recommendations

### Grafana Dashboard Layout

```
┌─────────────────────────────────────────────────────────┐
│                    AI Backend Dashboard                   │
├────────────────────┬────────────────────┬────────────────┤
│   Requests/sec     │   Error Rate (%)   │  P95 Latency   │
│   ████████ 150     │   ██ 2.3%          │  ████ 2.1s     │
├────────────────────┴────────────────────┴────────────────┤
│                    LLM Metrics                           │
├────────────────────┬────────────────────┬────────────────┤
│ Hourly LLM Cost    │  Tokens/min        │ Cache Hit Rate │
│ $12.50 ↑15%        │  45,000 tokens     │ 67% ████████   │
├────────────────────┼────────────────────┼────────────────┤
│ LLM Calls/min      │  LLM Error Rate    │ Avg LLM Latency│
│ 120 calls          │  1.2%              │ 2.3s           │
├────────────────────┴────────────────────┴────────────────┤
│                    Agent Metrics                         │
├────────────────────┬────────────────────┬────────────────┤
│ Active Agents      │  Avg Iterations    │ Tool Failures  │
│ 8                  │  3.2               │ 0.5%           │
├────────────────────┴────────────────────┴────────────────┤
│                    Infrastructure                        │
├────────────────────┬────────────────────┬────────────────┤
│ CPU Utilization    │  Memory Usage      │ DB Connections │
│ 45% ████████       │  62% ████████████  │ 15/20          │
└────────────────────┴────────────────────┴────────────────┘
```

### Grafana Dashboard JSON (Key Panels)

```json
{
  "panels": [
    {
      "title": "Hourly LLM Cost (USD)",
      "type": "stat",
      "targets": [{
        "expr": "increase(llm_cost_usd_total[1h])",
        "legendFormat": "Cost"
      }],
      "thresholds": {
        "steps": [
          {"color": "green", "value": 0},
          {"color": "yellow", "value": 10},
          {"color": "red", "value": 50}
        ]
      }
    },
    {
      "title": "LLM Calls by Model",
      "type": "timeseries",
      "targets": [{
        "expr": "rate(llm_calls_total[5m])",
        "legendFormat": "{{model}} - {{status}}"
      }]
    },
    {
      "title": "Token Usage by Type",
      "type": "timeseries",
      "targets": [
        {
          "expr": "rate(llm_tokens_total{token_type='prompt'}[5m])",
          "legendFormat": "Prompt Tokens"
        },
        {
          "expr": "rate(llm_tokens_total{token_type='completion'}[5m])",
          "legendFormat": "Completion Tokens"
        }
      ]
    },
    {
      "title": "Cache Hit Rate",
      "type": "gauge",
      "targets": [{
        "expr": "rate(cache_hits_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m]))"
      }]
    }
  ]
}
```

---

## 7. Complete docker-compose for Observability Stack

```yaml
# docker-compose.observability.yml
services:
  # Your application
  api:
    build: .
    environment:
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
    depends_on:
      - otel-collector

  # OpenTelemetry Collector
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    volumes:
      - ./otel-collector-config.yaml:/etc/otelcol/config.yaml
    ports:
      - "4317:4317"   # gRPC
      - "4318:4318"   # HTTP
      - "8889:8889"   # Prometheus metrics

  # Jaeger (traces)
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"  # UI
      - "14250:14250"  # gRPC

  # Prometheus (metrics)
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./prometheus/alerts.yml:/etc/prometheus/alerts.yml
    ports:
      - "9090:9090"

  # Grafana (dashboards)
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-data:/var/lib/grafana

  # Alertmanager
  alertmanager:
    image: prom/alertmanager:latest
    volumes:
      - ./alertmanager/config.yml:/etc/alertmanager/config.yml
    ports:
      - "9093:9093"

volumes:
  grafana-data:
```

```yaml
# prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - alerts.yml

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

scrape_configs:
  - job_name: 'ai-backend'
    static_configs:
      - targets: ['api:8000']
    metrics_path: /metrics

  - job_name: 'otel-collector'
    static_configs:
      - targets: ['otel-collector:8889']
```

---

## 8. Practice Exercises

### Exercise 1: Health Endpoints
`/health` aur `/ready` endpoints banao:
1. `/health` tujra immediately status aur uptime return kare
2. `/ready` PostgreSQL, Redis check kare aur har dependency ka status dikhaye
3. Agar koi dependency down hai toh 503 return kare
4. Har dependency check ke liye response time show kare

Redis stop karke test kar ke dekh ki `/ready` 503 return kare jabki `/health` abhi 200 daye.

### Exercise 2: Custom Prometheus Metrics
Apne application mein following custom metrics add kar:
1. `llm_calls_total` (Counter) — labels: model, status
2. `llm_call_duration_seconds` (Histogram) — labels: model
3. `llm_tokens_total` (Counter) — labels: model, token_type
4. `llm_cost_usd_total` (Counter) — labels: model

Har LLM call par yeh metrics record kar. Verify kar `/metrics` endpoint par visible ho.

### Exercise 3: LangSmith Integration
LangSmith tracing setup kar:
1. LangSmith account banao aur API key lo
2. Environment variables configure kar
3. Apne main service method pe `@traceable` decorator add kar
4. 10 different queries chala aur LangSmith dashboard mein traces dekh
5. Test dataset create kar aur evaluation run kar

### Exercise 4: Cost Circuit Breaker
`CostLimiter` class implement kar:
1. Redis mein hourly LLM spending track kar
2. 80% limit par warning de
3. 100% par sab LLM calls block kar
4. Auto-reset har hour

Test likh jo 100 LLM calls simulate kare known costs ke saath aur verify kare circuit breaker sahi point par trigger ho.

### Exercise 5: Observability Stack
Pura observability stack Docker Compose se deploy kar:
1. Application with Prometheus metrics endpoint
2. Prometheus application ko scrape kare
3. Grafana with dashboard jo key LLM metrics dikhaye
4. One alert: "LLM error rate > 5% for 5 minutes"

50 test requests bhej kar Grafana dashboard ka screenshot le.

### Exercise 6: End-to-End Trace
Ek request banao jo flow kare:
1. FastAPI route (auto-instrumented)
2. Service layer (custom span)
3. LLM call (custom span with token attributes)
4. Tool execution (custom span)
5. Database query (auto-instrumented)

Jaeger mein complete trace dekh aur verify kar sab 5 spans connected ho. Apne Node.js application ke tracing se compare kar (agar setup hai).

### Exercise 7: Monitoring Comparison
Ek table banao monitoring approaches compare karne ke liye:

| Aspect | Tera Node.js App | Yeh Python Setup |
|--------|-----------------|-------------------|
| Health checks | ? | /health + /ready |
| Metrics | ? | Prometheus + custom |
| Tracing | ? | OpenTelemetry + LangSmith |
| LLM cost tracking | ? | Prometheus counter + circuit breaker |
| Alerting | ? | Alertmanager rules |

Node.js column mein apna current setup fill kar aur gaps identify kar.

---

## Key Takeaways

- **Health checks** (`/health` aur `/ready`) kubelet ko decision lete hain pod restart karna hai ya traffic route karna hai
- **Prometheus metrics** automatically LLM costs, tokens, error rates track karte hain
- **LangSmith** specifically LLM chains aur agents ke liye designed hai — detailed traces aur evaluations
- **OpenTelemetry** vendor-neutral standard hai — Jaeger, Datadog, New Relic — kisi ko bhi bhej sakta hai
- **Cost circuit breaker** runaway agent se bachata hai — production mein mandatory hai
- **Alerting** proactive hona chahiye — cost spikes, error rates, infinite loops — sab par eyes rakhni chahiye
