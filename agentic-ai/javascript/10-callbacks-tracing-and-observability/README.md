# Callbacks, Tracing and Observability

🟡 Intermediate

## Kya hota hai?

Socho tum Zomato pe order karte ho aur order "Preparing" pe stuck reh jata hai — 40 minute se. Tum support ko call karte ho, aur agar unke paas sirf ek button ho "order failed" — koi detail nahi ki kaunse step pe fail hua (restaurant ne accept nahi kiya? rider assign nahi hua? payment gateway timeout?) — toh debugging impossible hai.

Ab yehi socho apne AI agent ke saath. User bolta hai: "mera jawab galat aaya" ya "agent bahut slow hai" ya "cost bahut zyada aa raha hai iss mahine". Agar tumhare paas sirf final output hai — koi visibility nahi ki agent ne kya socha, kaunsa tool call kiya, kitne tokens use hue, kaunsa step slow tha — toh tum bhi Zomato support wale jaisi situation mein ho: guess karte reh jaoge.

**Callbacks** LangChain.js ka mechanism hain jo tumhe agent/chain ke execution ke **har step pe hook lagane** deta hai — jab LLM call start ho, jab tool run ho, jab chain complete ho, jab error aaye. Aur **Tracing (LangSmith)** iska production-grade version hai — har run ko automatically capture karke ek visual timeline deta hai, taaki tum apne agent ke andar "dabbawala jaisi transparency" pa sako — har packet (request) kahan se aaya, kahan gaya, kitna time laga, sab traceable hai.

```
User Request
     │
     ▼
┌─────────────────────────────────────────┐
│              Agent Execution              │
│                                            │
│  [Callback: onChainStart]                 │
│       │                                   │
│       ▼                                   │
│  [Callback: onLLMStart] → LLM Call        │
│       │                                   │
│       ▼                                   │
│  [Callback: onLLMEnd] → tokens, latency   │
│       │                                   │
│       ▼                                   │
│  [Callback: onToolStart] → Tool Call      │
│       │                                   │
│       ▼                                   │
│  [Callback: onToolEnd] → tool output      │
│       │                                   │
│       ▼                                   │
│  [Callback: onChainEnd]                   │
└─────────────────────────────────────────┘
     │
     ▼
Final Response
```

> [!info]
> Callbacks ka concept naya nahi hai — Node.js mein tumne already `EventEmitter` pattern dekha hoga (`on('data', ...)`, `on('error', ...)`). LangChain callbacks bhi wahi idea hai, bas agent/chain ke lifecycle events ke liye.

## Kyun zaruri hai in agent-building?

Production mein agent banake deploy kar dena easy part hai. Real challenge hai:

1. **Debugging** — Agent ne galat tool call kyun kiya? Prompt mein kya gaya tha exactly? Ye sab dekhne ke liye tumhe "black box" ke andar jhaankna padta hai.
2. **Cost tracking** — Har LLM call paisa kharch karta hai (tokens = cost). Bina tracking ke, mahine ke end mein bill dekh ke shock lagta hai — pata hi nahi chalta konsa feature/user zyada consume kar raha hai.
3. **Latency optimization** — Multi-step agent mein konsa step slow hai? LLM call? Tool call (jaise DB query)? Retrieval step? Bina granular timing ke, optimize karna guesswork ban jaata hai.
4. **Reliability monitoring** — Production mein agents fail hote hain — rate limits, timeouts, malformed outputs. Tumhe pata hona chahiye **kab** aur **kyun**, real-time mein, alerts ke saath.
5. **Evaluation & quality** — "Kya mera agent pehle se accha perform kar raha hai naye prompt ke saath?" — iska jawab dene ke liye tumhe historical runs chahiye compare karne ke liye.

> [!warning]
> Bina observability ke production AI agent chalana waise hi hai jaise bina speedometer aur fuel gauge ke car chalana — chalegi tab tak sab thik hai, lekin jab kuch galat hoga, tumhe pata hi nahi chalega kab tak aur kyun.

Is chapter mein hum dono layers cover karenge:
- **Callbacks** — code-level hooks jo tum khud likh sakte ho (custom logging, cost tracking, streaming UI updates)
- **LangSmith** — LangChain ka managed observability platform jo automatically tracing, debugging aur evaluation deta hai, minimal setup ke saath

---

## Setup

```bash
npm install @langchain/openai @langchain/core @langchain/langgraph zod langsmith
```

```bash
# .env
OPENAI_API_KEY=sk-...

# LangSmith (optional, tracing ke liye — is chapter ke section 2 mein cover karenge)
LANGSMITH_TRACING=true
LANGSMITH_API_KEY=lsv2_...
LANGSMITH_PROJECT=my-agent-project
LANGSMITH_ENDPOINT=https://api.smith.langchain.com
```

---

## 1. Callbacks — The Basics

### 1.1 Kya hai ek Callback Handler?

LangChain.js mein har `Runnable` (LLM, chain, tool, agent) execution ke dauraan kayi **events** emit karta hai. Ek callback handler in events ko "listen" karta hai.

Sabse common events:

| Event | Kab fire hota hai |
|---|---|
| `handleLLMStart` | LLM call shuru hone se pehle |
| `handleLLMNewToken` | Streaming ke dauraan har naya token aane pe |
| `handleLLMEnd` | LLM call complete hone pe (response + token usage milta hai) |
| `handleLLMError` | LLM call fail hone pe |
| `handleChainStart` / `handleChainEnd` | Chain/graph execution start/end |
| `handleToolStart` / `handleToolEnd` | Tool call start/end |
| `handleToolError` | Tool call fail hone pe |
| `handleAgentAction` | Agent ne koi action (tool call) decide kiya |
| `handleRetrieverStart` / `handleRetrieverEnd` | RAG retrieval start/end |

### 1.2 Sabse Simple Callback — `console.log` Tracing

```ts
import { ChatOpenAI } from "@langchain/openai";
import type { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import type { Serialized } from "@langchain/core/load/serializable";
import type { LLMResult } from "@langchain/core/outputs";

// Ek custom callback handler banate hain jo har step console pe print kare
class SimpleLoggingHandler implements Partial<BaseCallbackHandler> {
  name = "SimpleLoggingHandler";

  handleLLMStart(llm: Serialized, prompts: string[]) {
    console.log(`\n[LLM START] Model: ${llm.id.at(-1)}`);
    console.log(`[PROMPT] ${prompts[0].slice(0, 100)}...`);
  }

  handleLLMEnd(output: LLMResult) {
    const usage = output.llmOutput?.tokenUsage;
    console.log(`[LLM END] Tokens used: ${JSON.stringify(usage)}`);
  }

  handleLLMError(err: Error) {
    console.error(`[LLM ERROR] ${err.message}`);
  }
}

const model = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0.3,
  callbacks: [new SimpleLoggingHandler()],
});

async function main() {
  const response = await model.invoke("IRCTC ka PNR status kaise check karte hain?");
  console.log("\nFinal:", response.content);
}

main();
```

Output kuch aisa dikhega:

```
[LLM START] Model: ChatOpenAI
[PROMPT] IRCTC ka PNR status kaise check karte hain?...
[LLM END] Tokens used: {"completionTokens":85,"promptTokens":18,"totalTokens":103}

Final: PNR status check karne ke liye...
```

> [!tip]
> `BaseCallbackHandler` ka poora interface implement karna zaroori nahi — sirf jo methods chahiye wahi implement karo (`Partial<BaseCallbackHandler>` type use karke). Baaki events silently ignore ho jayenge.

### 1.3 Callbacks Kahan Attach Kar Sakte Ho? — Constructor vs Request-Time

Do jagah callbacks pass kar sakte ho, aur difference samajhna zaruri hai:

```ts
import { ChatOpenAI } from "@langchain/openai";

const handler = new SimpleLoggingHandler();

// Option A: Constructor callbacks — HAR call pe apply honge (is model instance ke liye)
const model = new ChatOpenAI({ model: "gpt-4o-mini", callbacks: [handler] });

// Option B: Request-time callbacks — SIRF is specific invoke() call ke liye
const model2 = new ChatOpenAI({ model: "gpt-4o-mini" });
await model2.invoke("Hello", { callbacks: [handler] });
```

> [!info]
> Zomato ke analogy mein — constructor callback waisa hai jaise ek restaurant ka **CCTV camera** (har order pe record karta hai). Request-time callback waisa hai jaise ek specific order pe **tracking number** attach karna — sirf uss order ke liye.

### 1.4 Callbacks Propagate Hote Hain — Chains aur Agents Mein

Sabse powerful cheez: agar tum ek **chain ya agent ke top-level** pe callback attach karo, wo automatically **saare nested steps** (LLM calls, tool calls, sub-chains) tak propagate ho jata hai. Tumhe har jagah manually attach nahi karna padta.

```ts
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

const model = new ChatOpenAI({ model: "gpt-4o-mini" });
const prompt = ChatPromptTemplate.fromTemplate("Explain {topic} in one line, Hinglish mein.");
const chain = prompt.pipe(model).pipe(new StringOutputParser());

// Ye SINGLE callback poore chain ke andar — prompt formatting, LLM call,
// output parsing — sab steps pe fire hoga
await chain.invoke(
  { topic: "UPI" },
  { callbacks: [new SimpleLoggingHandler()] }
);
```

---

## 2. Practical Custom Callbacks — Real Use Cases

### 2.1 Token Usage & Cost Tracker

Production mein sabse pehla sawaal: "iss mahine LLM calls pe kitna kharcha hua?" Ek custom callback se ye automatically track kar sakte ho.

```ts
import { ChatOpenAI } from "@langchain/openai";
import type { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import type { LLMResult } from "@langchain/core/outputs";

// gpt-4o-mini pricing (approx, per 1M tokens) — apne actual pricing se update karo
const PRICING = { input: 0.15, output: 0.6 };

class CostTrackerHandler implements Partial<BaseCallbackHandler> {
  name = "CostTrackerHandler";
  totalCost = 0;
  totalCalls = 0;

  handleLLMEnd(output: LLMResult) {
    const usage = output.llmOutput?.tokenUsage;
    if (!usage) return;

    const inputCost = (usage.promptTokens / 1_000_000) * PRICING.input;
    const outputCost = (usage.completionTokens / 1_000_000) * PRICING.output;
    const callCost = inputCost + outputCost;

    this.totalCost += callCost;
    this.totalCalls += 1;

    console.log(
      `[COST] Call #${this.totalCalls}: $${callCost.toFixed(6)} ` +
      `(prompt: ${usage.promptTokens}, completion: ${usage.completionTokens})`
    );
  }

  printSummary() {
    console.log(`\n[SUMMARY] Total calls: ${this.totalCalls}, Total cost: $${this.totalCost.toFixed(6)}`);
  }
}

const costTracker = new CostTrackerHandler();
const model = new ChatOpenAI({ model: "gpt-4o-mini", callbacks: [costTracker] });

async function main() {
  await model.invoke("Flipkart aur Amazon mein kya farak hai?");
  await model.invoke("UPI kaise kaam karta hai?");
  await model.invoke("Dabbawala system kitna accurate hai?");

  costTracker.printSummary();
  // [SUMMARY] Total calls: 3, Total cost: $0.000180
}

main();
```

> [!warning]
> Production mein per-request cost tracking ko sirf `console.log` mein mat chhodo — usse ek time-series database (Postgres, ClickHouse) ya monitoring tool (Datadog, Grafana) mein bhejo, taaki tum dashboards bana sako aur alerts set kar sako (jaise "agar daily cost $50 cross kare toh Slack alert bhejo").

### 2.2 Streaming Tokens to a UI (jaise ChatGPT ka typing effect)

Callbacks ka ek bahut common use-case — jab tum apna khud ka chat UI bana rahe ho aur chaho ki response token-by-token stream ho (jaise ChatGPT ka "typing" effect).

```ts
import { ChatOpenAI } from "@langchain/openai";
import type { BaseCallbackHandler } from "@langchain/core/callbacks/base";

class StreamToUIHandler implements Partial<BaseCallbackHandler> {
  name = "StreamToUIHandler";

  handleLLMNewToken(token: string) {
    // Real app mein ye token WebSocket / SSE se frontend ko bhejoge
    process.stdout.write(token);
  }
}

const model = new ChatOpenAI({
  model: "gpt-4o-mini",
  streaming: true, // zaruri hai streaming ke liye
  callbacks: [new StreamToUIHandler()],
});

async function main() {
  await model.invoke("Ek short poem likho chai pe.");
  console.log("\n\n[Stream complete]");
}

main();
```

> [!tip]
> Agar sirf simple streaming chahiye (WebSocket/SSE ke bina, direct async iteration), toh callbacks ki jagah `model.stream()` use karo — wo `AsyncIterable` return karta hai. Callbacks tab useful hain jab tumhe streaming ke saath-saath **doosre side-effects bhi** chahiye (logging, cost tracking) simultaneously.

### 2.3 Tool Call Auditing — Kya Agent Ne Sahi Tool Use Kiya?

Agent debugging mein sabse zyada kaam ka callback — tool calls ka audit trail.

```ts
import type { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import type { Serialized } from "@langchain/core/load/serializable";

class ToolAuditHandler implements Partial<BaseCallbackHandler> {
  name = "ToolAuditHandler";
  private toolStartTimes = new Map<string, number>();

  handleToolStart(tool: Serialized, input: string, runId: string) {
    this.toolStartTimes.set(runId, Date.now());
    console.log(`[TOOL START] ${tool.id.at(-1)} | Input: ${input}`);
  }

  handleToolEnd(output: string, runId: string) {
    const startTime = this.toolStartTimes.get(runId);
    const duration = startTime ? Date.now() - startTime : 0;
    console.log(`[TOOL END] Duration: ${duration}ms | Output: ${output.slice(0, 100)}`);
    this.toolStartTimes.delete(runId);
  }

  handleToolError(err: Error, runId: string) {
    console.error(`[TOOL ERROR] ${err.message}`);
    this.toolStartTimes.delete(runId);
  }
}
```

`runId` har ek specific execution ke liye unique hota hai — isse tum parallel tool calls (jaise agent ne ek saath 3 tools call kiye) ko bhi correctly track kar sakte ho, bina mix-up ke.

### 2.4 LangGraph Mein Callbacks

LangGraph.js mein bhi wahi callback system kaam karta hai — graph `.invoke()` / `.stream()` call mein `config.callbacks` pass karo, aur wo automatically har node, LLM call, aur tool call tak propagate ho jayega.

```ts
import { StateGraph, MessagesAnnotation, START, END } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({ model: "gpt-4o-mini" });

const graph = new StateGraph(MessagesAnnotation)
  .addNode("chat", async (state) => {
    const response = await model.invoke(state.messages);
    return { messages: [response] };
  })
  .addEdge(START, "chat")
  .addEdge("chat", END)
  .compile();

async function main() {
  const result = await graph.invoke(
    { messages: [{ role: "user", content: "Namaste, kaise ho?" }] },
    { callbacks: [new SimpleLoggingHandler(), new CostTrackerHandler()] }
  );
  console.log(result.messages.at(-1)?.content);
}

main();
```

> [!info]
> LangGraph mein tumhe extra `handleChainStart` / `handleChainEnd` events bhi milte hain **har node ke liye** — isse tum pata laga sakte ho graph ke kaunse node mein sabse zyada time lag raha hai.

---

## 3. LangSmith — Production-Grade Tracing

Custom callbacks accha hain, lekin production mein tumhe chahiye: persistent storage, searchable UI, run comparison, evaluation datasets, aur team collaboration. Yahi deta hai **LangSmith** — LangChain team ka observability platform.

### 3.1 Zero-Code Tracing — Sirf Environment Variables

Sabse bada selling point — LangSmith enable karne ke liye **code mein kuch change nahi karna padta**. Bas environment variables set karo:

```bash
# .env
LANGSMITH_TRACING=true
LANGSMITH_API_KEY=lsv2_pt_xxxxxxxxxxxx
LANGSMITH_PROJECT=zomato-support-agent
```

```ts
import { ChatOpenAI } from "@langchain/openai";
import "dotenv/config"; // .env load karne ke liye

const model = new ChatOpenAI({ model: "gpt-4o-mini" });

async function main() {
  // Ye call automatically LangSmith pe trace ho jayega —
  // koi extra code nahi likhna pada!
  const response = await model.invoke("Swiggy One membership ke benefits kya hain?");
  console.log(response.content);
}

main();
```

Jaise hi `LANGSMITH_TRACING=true` set hota hai, LangChain.js background mein automatically har run ko LangSmith ke servers pe bhej deta hai. Tum [smith.langchain.com](https://smith.langchain.com) pe login karke poora execution tree dekh sakte ho — kaunsa prompt gaya, kya response aaya, kitne tokens lage, kitna time laga — sab kuch visually, ek waterfall diagram ki tarah.

> [!warning]
> LangSmith API key kabhi bhi frontend code ya public repo mein commit mat karo. Ye sensitive credential hai — sirf server-side `.env` mein rakho, aur `.gitignore` mein `.env` add karna mat bhoolna.

### 3.2 LangSmith SDK Se Explicit Tracing — `traceable()`

Kabhi kabhi tumhare paas non-LangChain code bhi hota hai (plain functions, external API calls) jinhe bhi tum trace mein include karna chahte ho. Iske liye LangSmith SDK ka `traceable()` wrapper use karo.

```ts
import { traceable } from "langsmith/traceable";
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({ model: "gpt-4o-mini" });

// Ek plain function ko traceable banate hain
const fetchOrderDetails = traceable(
  async (orderId: string) => {
    // Ye normally ek DB call hoga
    return { orderId, status: "out_for_delivery", eta: "12 min" };
  },
  { name: "fetchOrderDetails", run_type: "tool" }
);

// Poore workflow ko bhi traceable bana sakte ho — isse "parent trace" milta hai
const handleSupportQuery = traceable(
  async (orderId: string) => {
    const order = await fetchOrderDetails(orderId);

    const response = await model.invoke(
      `Order ${order.orderId} ka status "${order.status}" hai, ETA ${order.eta}. ` +
      `Isse ek friendly customer message mein convert karo, Hinglish mein.`
    );

    return response.content;
  },
  { name: "handleSupportQuery" }
);

async function main() {
  const result = await handleSupportQuery("ORD-4521");
  console.log(result);
}

main();
```

Iska fayda — LangSmith pe tumhe ek **single unified trace** dikhega jismein `handleSupportQuery` parent hai, aur `fetchOrderDetails` + LLM call dono uske **nested children** hain — chahe wo LangChain component ho ya plain function.

### 3.3 Manual Run Tree — Fine-Grained Control

Agar tumhe metadata, tags, ya custom inputs/outputs ke saath zyada control chahiye, `RunTree` class directly use kar sakte ho:

```ts
import { RunTree } from "langsmith";

async function processOrder(orderId: string) {
  const parentRun = new RunTree({
    name: "process-order",
    run_type: "chain",
    inputs: { orderId },
    tags: ["production", "order-flow"],
    metadata: { userId: "user_123", region: "pune" },
  });

  await parentRun.postRun(); // LangSmith ko run start bhejo

  try {
    // ... actual logic ...
    const output = { status: "success" };

    await parentRun.end({ outputs: output });
    await parentRun.patchRun(); // final state bhejo
    return output;
  } catch (err) {
    await parentRun.end({ error: String(err) });
    await parentRun.patchRun();
    throw err;
  }
}
```

> [!tip]
> `traceable()` 95% use-cases ke liye kaafi hai — `RunTree` sirf tab use karo jab tumhe truly manual control chahiye (jaise custom frameworks integrate karte waqt).

### 3.4 Tags aur Metadata — Runs Ko Organize Karna

Jaise Zomato orders ko tum filter karte ho ("veg only", "under 30 min", "city: Pune"), waise hi LangSmith runs ko tags/metadata se filter kar sakte ho.

```ts
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({ model: "gpt-4o-mini" });

await model.invoke("Refund kaise milega?", {
  runName: "refund-query-handler",
  tags: ["support", "refund", "prod"],
  metadata: {
    userId: "user_789",
    sessionId: "sess_abc123",
    appVersion: "2.3.1",
  },
});
```

LangSmith dashboard mein ab tum query kar sakte ho: "sirf `refund` tag wale saare runs dikhao jo pichhle 24 ghante mein slow (>3s) the" — ye production debugging mein bahut powerful hai.

### 3.5 LangSmith Mein Kya Dikhta Hai?

Jab tum LangSmith dashboard kholte ho, har trace mein ye milta hai:

| Feature | Kaam aata hai |
|---|---|
| **Waterfall view** | Har step (LLM, tool, retriever) ka nested timeline, exact duration ke saath |
| **Input/Output inspector** | Har step ka exact prompt aur response — copy-paste karke reproduce kar sakte ho |
| **Token & cost breakdown** | Automatic — har run ka token usage aur estimated cost |
| **Error highlighting** | Failed runs turant highlight hote hain, stack trace ke saath |
| **Latency percentiles** | p50/p95/p99 latency — pata chalta hai "average" theek hai lekin "tail" slow hai |
| **Datasets & Evaluations** | Purane runs ko dataset bana ke naye prompt/model version se compare karna |
| **Feedback/Annotations** | Manual ya automated feedback (thumbs up/down, scores) attach karna |

---

## 4. Custom Callback + LangSmith Ka Combination

Real production apps mein tum dono ek saath use karte ho — LangSmith automatic tracing ke liye, aur custom callbacks apne khud ke business-logic side-effects (jaise DB mein log likhna, Slack alert bhejna) ke liye.

```ts
import { ChatOpenAI } from "@langchain/openai";
import { StateGraph, MessagesAnnotation, START, END } from "@langchain/langgraph";
import type { BaseCallbackHandler } from "@langchain/core/callbacks/base";

// Business-specific callback — jaise error hone pe Slack alert
class AlertingHandler implements Partial<BaseCallbackHandler> {
  name = "AlertingHandler";

  async handleLLMError(err: Error) {
    console.error(`ALERT: LLM call failed — ${err.message}`);
    // Real app mein: await sendSlackAlert(`LLM error: ${err.message}`);
  }

  async handleToolError(err: Error) {
    console.error(`ALERT: Tool call failed — ${err.message}`);
  }
}

const model = new ChatOpenAI({ model: "gpt-4o-mini" });

const graph = new StateGraph(MessagesAnnotation)
  .addNode("chat", async (state) => ({
    messages: [await model.invoke(state.messages)],
  }))
  .addEdge(START, "chat")
  .addEdge("chat", END)
  .compile();

async function main() {
  // LANGSMITH_TRACING=true env var se automatic tracing already ho raha hai.
  // Custom callback sirf apna extra logic add kar raha hai.
  await graph.invoke(
    { messages: [{ role: "user", content: "Payment fail ho gaya, kya karu?" }] },
    { callbacks: [new AlertingHandler()], tags: ["payment-support"] }
  );
}

main();
```

---

## 5. Production Considerations

### 5.1 Performance Overhead

- Callbacks **synchronously await** ho sakte hain agar wo async hain — agar tumhara handler slow hai (jaise ek DB write jo 500ms leta hai), toh wo tumhare agent ki response latency badha dega.
- Heavy side-effects (DB writes, external API calls) ko **fire-and-forget** ya queue-based (jaise BullMQ, background job) banao, callback ke andar directly `await` mat karo agar latency-critical path hai.

```ts
class NonBlockingLogHandler implements Partial<BaseCallbackHandler> {
  name = "NonBlockingLogHandler";

  handleLLMEnd(output: any) {
    // await NAHI kiya — background mein fire kar diya
    void this.logToDatabase(output).catch((err) =>
      console.error("Logging failed:", err)
    );
  }

  private async logToDatabase(output: any) {
    // DB write logic
  }
}
```

### 5.2 Sensitive Data Redaction

LangSmith automatically **poora prompt aur response** capture karta hai. Agar tumhare prompts mein PII (phone numbers, addresses, payment info) hai, toh:

- LangSmith ke **PII redaction / masking** feature use karo (enterprise plans mein available), ya
- Custom callback mein khud redact karo LangSmith bhejne se pehle

```ts
function redactPII(text: string): string {
  return text
    .replace(/\b\d{10}\b/g, "[PHONE_REDACTED]")
    .replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, "[EMAIL_REDACTED]");
}
```

> [!warning]
> Ye ek basic example hai — production-grade PII redaction ke liye dedicated library (jaise `presidio` ya regex + NER-based detection) use karo, sirf simple regex pe bharosa mat karo.

### 5.3 Sampling — Sab Kuch Trace Mat Karo

High-traffic production apps mein **har single request** trace karna expensive ho sakta hai (LangSmith pricing traces ke count pe based hoti hai). Sampling strategy use karo:

```ts
const SAMPLE_RATE = 0.1; // sirf 10% requests trace karo

async function handleRequest(userInput: string) {
  const shouldTrace = Math.random() < SAMPLE_RATE;

  return model.invoke(userInput, {
    // LangSmith ke liye per-call metadata; tracing globally env var se control hoti hai,
    // lekin tags se filter/sample kar sakte ho dashboard mein
    tags: shouldTrace ? ["sampled"] : ["not-sampled"],
  });
}
```

> [!info]
> Production mein **errors aur slow requests ko 100% trace karo**, normal fast requests ko sample karo. Isse cost control hota hai bina critical debugging visibility khoye.

### 5.4 Multiple Environments — Dev vs Staging vs Prod

Alag `LANGSMITH_PROJECT` use karo har environment ke liye, taaki traces mix na ho:

```bash
# .env.development
LANGSMITH_PROJECT=my-agent-dev

# .env.production
LANGSMITH_PROJECT=my-agent-prod
```

### 5.5 Common Mistakes

| Mistake | Fix |
|---|---|
| Callback ke andar heavy sync logic likhna | Async karo, ya queue mein bhejo |
| LangSmith API key client-side expose karna | Sirf server-side environment variables mein rakho |
| Errors ko callback ke andar swallow karna (silent fail) | Errors ko log karo aur re-throw karo agar critical hai |
| Sab kuch production mein trace karna bina sampling ke | Sampling ya selective tracing (errors/slow requests priority) |
| PII ko bina redact kiye trace karna | Redaction layer add karo compliance ke liye |
| Callback handler ko har request pe naya instantiate karna jab state share karna ho | Singleton pattern use karo agar cross-request state chahiye (jaise `CostTrackerHandler`) |

---

## 6. Quick Reference — Callback Events Cheat Sheet

```ts
interface KeyCallbackEvents {
  // LLM lifecycle
  handleLLMStart(llm: Serialized, prompts: string[]): void;
  handleLLMNewToken(token: string): void;
  handleLLMEnd(output: LLMResult): void;
  handleLLMError(err: Error): void;

  // Chain/Graph lifecycle
  handleChainStart(chain: Serialized, inputs: Record<string, unknown>): void;
  handleChainEnd(outputs: Record<string, unknown>): void;
  handleChainError(err: Error): void;

  // Tool lifecycle
  handleToolStart(tool: Serialized, input: string): void;
  handleToolEnd(output: string): void;
  handleToolError(err: Error): void;

  // Agent-specific
  handleAgentAction(action: AgentAction): void;
  handleAgentEnd(action: AgentFinish): void;

  // Retriever (RAG)
  handleRetrieverStart(retriever: Serialized, query: string): void;
  handleRetrieverEnd(documents: Document[]): void;
}
```

---

## Key Takeaways

- **Callbacks** LangChain.js ke lifecycle hooks hain — LLM start/end, tool start/end, chain start/end pe custom logic run karne deta hai, jaise Node.js ka `EventEmitter` pattern.
- Callbacks **constructor-time** (har call pe apply) ya **request-time** (sirf ek call pe apply) attach ho sakte hain, aur automatically **nested steps tak propagate** hote hain (chain → LLM → tool sab cover ho jaate hain ek hi top-level callback se).
- Common custom callback use-cases: **cost tracking** (token usage se), **UI streaming** (token-by-token), **tool call auditing**, aur **error alerting** (Slack/PagerDuty).
- **LangSmith** production-grade managed tracing platform hai — sirf `LANGSMITH_TRACING=true` env var set karke automatic tracing mil jaati hai, bina code change ke.
- `traceable()` wrapper se non-LangChain functions (plain JS/DB calls) ko bhi trace mein include kar sakte ho, taaki poora request flow ek single unified trace mein dikhe.
- `RunTree` fine-grained manual control deta hai custom frameworks integrate karte waqt.
- Tags aur metadata se LangSmith dashboard mein runs ko filter/organize karo (jaise "sirf refund-related slow runs dikhao").
- Production mein: **heavy side-effects ko non-blocking rakho**, **PII redact karo**, **sampling strategy use karo** high-traffic apps mein cost control ke liye, aur **alag LangSmith project har environment ke liye** (dev/staging/prod) use karo.
- Observability koi "nice-to-have" nahi hai production agents ke liye — ye debugging, cost control, aur reliability ka foundation hai.
