# State Graphs, Nodes and Edges

🟡 Intermediate

## Kya hota hai?

Chapter 12 mein humne `StateGraph` ka **preview** dekha tha — ek loan approval example, high-level level pe. Ab is chapter mein hum usi cheez ko **deeply** samjhenge: state ko sahi tareeke se **define** kaise karte hain, nodes ke andar exactly kya rules hote hain, edges kitne types ke hote hain, aur in sabko combine karke ek **production-quality graph** kaise banate hain.

Socho ek **Swiggy order** ka lifecycle. Order ek fixed, seedhi line mein nahi chalta — "Order Placed" → "Restaurant Confirmed" → "Preparing" → "Out for Delivery" → "Delivered". Lekin kabhi restaurant order **reject** kar deta hai, to flow "Order Placed" se seedha "Cancelled" pe chala jaata hai. Kabhi delivery partner turant nahi milta, to system **retry** karta hai. Aur har step pe ek shared "order object" hota hai — jisme customer ka naam, items, payment status, delivery address — sab kuch hota hai, aur har step usme se sirf apna relevant hissa update karta hai.

Yehi teen cheezein `StateGraph` ke core hain:

- **State** — wo shared data jo pura graph carry karta hai (order object jaisa)
- **Nodes** — individual steps/functions jo state ko read aur update karte hain ("Preparing" step jaisa)
- **Edges** — ek node se dusre node tak jaane ka rasta ("Preparing" ke baad "Out for Delivery")

```
┌───────┐    ┌────────────────┐    ┌───────────┐    ┌─────────────────┐    ┌───────────┐
│ START │───▶│ Order Placed   │───▶│ Confirmed │───▶│ Out for Delivery │───▶│ Delivered │───▶ END
└───────┘    └────────────────┘    └───────────┘    └─────────────────┘    └───────────┘
                     │
                     │ restaurant rejects (conditional edge)
                     ▼
              ┌─────────────┐
              │  Cancelled  │───▶ END
              └─────────────┘
```

## Kyun zaruri hai in agent-building?

Agar tum seedha LLM ko call karke response le lete ho, wo ek **chain** hai — A se B, B se C, fixed. Lekin real-world agents ko chahiye hota hai:

1. **Loops** — jab tak task complete na ho, retry karte raho (agent tool call karta hai, result check karta hai, phir dobara decide karta hai)
2. **Branching** — condition ke basis pe decision lena ("agar user ne complaint ki hai to escalate karo, warna FAQ bot handle karega")
3. **Shared, evolving state** — har node ko poora relevant context pata hona chahiye, sirf pichhle node ka output nahi
4. **Explicit control flow** — tumhe hamesha pata hona chahiye ki agent kis step pe hai, taaki debugging aur observability aasan ho

`StateGraph` yeh sab ek clean, declarative API mein deta hai. Yeh underlying concept hai jispe LangGraph ke saare advanced features — conditional routing (Chapter 14), reducers (Chapter 15), human-in-the-loop (Chapter 16), subgraphs (Chapter 17), multi-agent systems (Chapter 18) — bane hote hain. Isliye is chapter ko achhi tarah samajhna bahut zaruri hai — **ye foundation hai, baaki sab isi ke upar tiki hai.**

> [!info]
> LangGraph.js internally ek **Pregel-style execution model** use karta hai (Google ke graph-processing paper se inspired). Graph "super-steps" mein chalta hai — har super-step mein jo bhi nodes ready hain (unke saare dependencies resolve ho chuke hain), wo **parallel** chalte hain. Isliye agar ek node se do edges nikalte hain do alag nodes ki taraf, wo dono nodes ek hi super-step mein saath-saath chalte hain — sequentially nahi.

---

## Setup

```bash
npm install @langchain/langgraph @langchain/core @langchain/openai zod dotenv
```

```bash
# .env
OPENAI_API_KEY=sk-...
```

---

## Part 1: State Schema Define Karna — Do Tareeke

Graph banane se pehle sabse pehla kaam — **state ka shape decide karna**. LangGraph.js mein iske do tareeke hain: `Annotation.Root` (classic, sabse zyada docs/examples isme milenge) aur **Zod schema** (modern, agar tum already Zod se familiar ho — jaisa humne Chapter 4 mein structured output ke liye use kiya tha).

### Tareeka 1: `Annotation.Root`

```ts
import { Annotation } from "@langchain/langgraph";

const TicketState = Annotation.Root({
  ticketId: Annotation<string>,
  customerMessage: Annotation<string>,
  category: Annotation<string>,
  priority: Annotation<string>,
  resolution: Annotation<string>,
});

// Type nikaalne ke liye
type TicketStateType = typeof TicketState.State;
```

Har key ek `Annotation<T>` hai — bas type declare karta hai. Default behavior: jab koi node is key ko update karta hai, **naya value purane ko replace kar deta hai** (last-write-wins). Ye default "reducer" hai. Custom reducers (jaise arrays ko append karna, replace nahi) ka deep-dive **Chapter 15** mein hoga — abhi sirf itna jaano ki `Annotation<T>` ke andar reducer aur default value bhi customize ho sakti hai:

```ts
const TicketState = Annotation.Root({
  // Default reducer (replace) + default value
  retryCount: Annotation<number>({
    reducer: (existing, update) => update,
    default: () => 0,
  }),
});
```

### Tareeka 2: Zod Schema (Recommended agar Zod se comfortable ho)

Chapter 4 mein humne `.withStructuredOutput()` ke saath Zod use kiya tha — LLM se validated, typed output nikaalne ke liye. Achhi baat ye hai ki **wahi Zod schemas** ab tum apne graph ki **state definition** ke liye bhi use kar sakte ho:

```ts
import "@langchain/langgraph/zod"; // .langgraph helper enable karne ke liye zaruri import
import { z } from "zod";

const TicketState = z.object({
  ticketId: z.string(),
  customerMessage: z.string(),
  category: z.enum(["billing", "technical", "delivery", "general"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  resolution: z.string().optional(),
  escalated: z.boolean().default(false),
});

// Type nikaalne ke liye — z.infer, jo already Zod se familiar hai
type TicketStateType = z.infer<typeof TicketState>;
```

Custom reducer chahiye ho to `@langchain/langgraph/zod` ka `.langgraph.reducer()` extension use hota hai:

```ts
import "@langchain/langgraph/zod";
import { z } from "zod";

const State = z.object({
  logs: z
    .array(z.string())
    .default(() => [])
    .langgraph.reducer(
      (existing, update) => existing.concat(update), // append, replace nahi
      z.array(z.string())
    ),
});
```

### Kaunsa use karu?

| | `Annotation.Root` | Zod Schema |
|---|---|---|
| Familiarity | LangGraph-specific API seekhni padegi | Agar Zod jaante ho (Chapter 4), zero naya seekhna |
| Runtime validation | Nahi — sirf TypeScript compile-time types | **Haan** — `.parse()` se runtime validation bhi milti hai (jaise external webhook input aaye to) |
| Docs/examples | Sabse zyada official examples isi mein hain | Newer, thoda kam examples milenge abhi |
| `.withStructuredOutput()` ke saath reuse | Alag se schema likhni padegi LLM output ke liye | **Same Zod schema reuse** ho sakti hai state fields aur LLM output dono ke liye |

> [!tip]
> Is chapter ke worked example mein hum **Zod** use karenge, kyunki tum already Chapter 4 se familiar ho aur runtime validation ka fayda milta hai — especially jab state external input (jaise API request body) se populate ho rahi ho.

---

## Part 2: Nodes Deep Dive

Ek **node** simply ek function hai jiska signature ye hai:

```ts
type NodeFunction<State> = (
  state: State,
  config?: RunnableConfig
) => Partial<State> | Promise<Partial<State>>;
```

### Rule 1: Sirf changed fields return karo

```ts
// ✅ Sahi
async function classifyTicket(state: TicketStateType) {
  const category = await detectCategory(state.customerMessage);
  return { category }; // sirf `category` field change hua
}
```

LangGraph automatically is partial object ko existing state ke saath **merge** karta hai (default reducer se — last-write-wins per key, jab tak custom reducer na ho).

### Rule 2: State ko mutate mat karo, naya object return karo

```ts
// ❌ Galat — state object ko directly mutate kar rahe ho
async function badNode(state: TicketStateType) {
  state.category = "billing"; // side-effect, avoid karo
  return state;
}

// ✅ Sahi — naya partial object return karo
async function goodNode(state: TicketStateType) {
  return { category: "billing" };
}
```

Direct mutation LangGraph ke internal change-tracking (checkpointing, time-travel debugging — Chapter 16) ko confuse kar sakta hai. Hamesha **immutable style** mein naya value return karo.

### Second parameter: `config` (RunnableConfig)

Har node ko ek optional dusra parameter milta hai — `config`. Isme **per-invocation metadata** hoti hai, jaise `configurable` fields (thread ID, user ID — Chapter 16 mein checkpointing ke saath important hoga), callbacks (Chapter 10), tags:

```ts
async function classifyTicket(
  state: TicketStateType,
  config?: RunnableConfig
) {
  const userId = config?.configurable?.userId;
  console.log(`Classifying ticket for user: ${userId}`);
  return { category: "general" };
}
```

### Nodes async ho sakte hain (aur zyada-tar hote hi hain)

LLM calls, DB queries, external API calls — sab async hote hain. LangGraph dono support karta hai — sync function bhi node ban sakta hai, lekin real-world graphs mein zyada-tar nodes `async` honge.

### Node ke andar error handling

Agar node ke andar exception throw hota hai (aur tumne try/catch nahi lagaya), poora `graph.invoke()` call reject ho jayega:

```ts
async function callPaymentGateway(state: TicketStateType) {
  try {
    const result = await paymentAPI.charge(state.ticketId);
    return { resolution: `Payment processed: ${result.id}` };
  } catch (err) {
    // Graceful degradation — poora graph crash karne ke bajaye state mein error record karo
    return { resolution: `Payment failed: ${(err as Error).message}` };
  }
}
```

### Node Options: Retry Policies

Chapter 12 mein humne mention kiya tha ki LangGraph built-in retry policies deta hai — wo yehi hai. `.addNode()` ka teesra argument options object leta hai:

```ts
workflow.addNode("callPaymentGateway", callPaymentGateway, {
  retryPolicy: {
    maxAttempts: 3,
    initialInterval: 1000, // ms
    backoffFactor: 2, // exponential backoff
  },
});
```

Agar node fail ho (exception throw kare), LangGraph automatically retry karega (defined attempts tak), configured backoff ke saath — bina tumhe manually try/catch + loop likhne ke.

> [!tip]
> Retry policy sirf **transient failures** (network timeout, rate limit) ke liye use karo — agar node ka logic hi galat hai (jaise bad input), retry karne se wo fail hi hoga baar-baar, sirf latency aur cost badhega.

---

## Part 3: Edges Deep Dive

Edges decide karte hain ki ek node ke baad **kaunsa node chalega**.

### Normal Edge — `.addEdge(from, to)`

Fixed, unconditional transition:

```ts
workflow.addEdge("classifyTicket", "logResolution");
```

`classifyTicket` complete hone ke baad, **hamesha** `logResolution` chalega.

### Entry Point — `.addEdge(START, nodeName)`

Har graph ko batana padta hai wo **kaha se shuru** ho. `START` LangGraph ka special built-in constant hai:

```ts
import { START, END } from "@langchain/langgraph";

workflow.addEdge(START, "classifyTicket");
```

### Conditional Edge — `.addConditionalEdges(from, routerFn, pathMap?)`

Jab next node **state pe depend** karta hai:

```ts
function routeByCategory(
  state: TicketStateType
): "billing" | "technical" | "delivery" | "general" {
  return state.category ?? "general"; // fallback zaruri hai — undefined case handle karo
}

workflow.addConditionalEdges("classifyTicket", routeByCategory, {
  billing: "handleBilling",
  technical: "handleTechnical",
  delivery: "handleDelivery",
  general: "handleGeneral",
});
```

`routerFn` state dekhta hai aur ek **string (ya string array)** return karta hai — teesra argument (`pathMap`) us string ko actual **node name** se map karta hai. Agar `routerFn` ka return value already exact node name ho, `pathMap` optional hai — lekin explicit likhna best practice hai (typo turant compile-time pe pakda jata hai, aur graph visualization bhi behtar dikhta hai).

> [!info]
> Deep-dive — multiple conditions, dynamic routing, LLM-based routing decisions — **Chapter 14** mein hoga. Abhi bas syntax aur mental model samajh lo.

### Fan-out — Ek node se multiple edges

Agar ek node se **multiple normal edges** nikalte hain, sab target nodes **parallel** (same super-step mein) chalte hain:

```ts
workflow.addEdge("classifyTicket", "sendAcknowledgementEmail");
workflow.addEdge("classifyTicket", "logToAnalytics");
```

Dono `sendAcknowledgementEmail` aur `logToAnalytics` ek saath trigger honge jab `classifyTicket` complete ho jaye. (Advanced fan-out/fan-in patterns — jaise results wapas merge karna — Chapter 17-18 mein multi-agent context mein deep-dive honge.)

### Fan-in — Multiple nodes ek target node ki taraf

Isi tarah, multiple nodes se ek hi target ki taraf edge ja sakta hai:

```ts
workflow.addEdge("handleBilling", "logResolution");
workflow.addEdge("handleTechnical", "logResolution");
workflow.addEdge("handleDelivery", "logResolution");
workflow.addEdge("handleGeneral", "logResolution");
```

Chaaron branches — jo bhi execute ho — akhir mein `logResolution` pe converge ho jayenge.

### `END` — Graph ka Termination Point

```ts
workflow.addEdge("logResolution", END);
```

Jab tak koi node `END` tak nahi pahunchta (directly ya kisi conditional edge se), graph terminate nahi hoga.

> [!warning]
> **Dead-end nodes**: Agar ek node ke paas **koi outgoing edge nahi hai** (na normal, na conditional) aur wo `END` bhi nahi hai, LangGraph `.compile()` ke time error throw karega — "node has no outgoing edges." Har node ka ek clear path hona chahiye either agle node tak ya `END` tak.

---

## Part 4: Full Worked Example — Flipkart Support Ticket Triage Bot

Ab sab pieces combine karte hain — ek real-world jaisa graph banayenge: customer support tickets ko **classify** karega (LLM se), category ke hisaab se **route** karega, aur handle karke **resolution log** karega.

```
                    ┌───────┐
                    │ START │
                    └───┬───┘
                        ▼
              ┌───────────────────┐
              │  classifyTicket    │  (LLM: category + priority nikaalta hai)
              └─────────┬──────────┘
                        │ (conditional edge: routeByCategory)
        ┌───────────────┼────────────────┬────────────────┐
        ▼               ▼                ▼                ▼
 ┌─────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
 │handleBilling │ │handleTechnical│ │handleDelivery│ │ handleGeneral │
 └──────┬───────┘ └───────┬──────┘ └──────┬───────┘ └───────┬──────┘
        └────────────────┬┴────────────────┬────────────────┘
                          ▼
                  ┌────────────────┐
                  │ logResolution  │  (mock DB write)
                  └───────┬────────┘
                          ▼
                        ┌─────┐
                        │ END │
                        └─────┘
```

### Step 1: State Schema (Zod)

```ts
// state.ts
import "@langchain/langgraph/zod";
import { z } from "zod";

export const TicketState = z.object({
  ticketId: z.string(),
  customerMessage: z.string(),
  category: z.enum(["billing", "technical", "delivery", "general"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  resolution: z.string().optional(),
  escalated: z.boolean().default(false),
});

export type TicketStateType = z.infer<typeof TicketState>;
```

### Step 2: Classification Node (LLM + Structured Output)

```ts
// nodes/classify.ts
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { TicketStateType } from "../state";

const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });

// Chapter 4 wala hi pattern — structured output ke liye Zod schema
const ClassificationSchema = z.object({
  category: z.enum(["billing", "technical", "delivery", "general"]),
  priority: z.enum(["low", "medium", "high"]),
});

const classifierModel = model.withStructuredOutput(ClassificationSchema, {
  name: "classify_ticket",
});

export async function classifyTicket(state: TicketStateType) {
  console.log(`🔍 Classifying ticket ${state.ticketId}...`);

  const result = await classifierModel.invoke(
    `Customer ka message classify karo category aur priority mein.\n\nMessage: "${state.customerMessage}"`
  );

  console.log(`   → category: ${result.category}, priority: ${result.priority}`);
  return { category: result.category, priority: result.priority };
}
```

### Step 3: Category-Specific Handler Nodes

```ts
// nodes/handlers.ts
import { TicketStateType } from "../state";

export async function handleBilling(state: TicketStateType) {
  console.log(`💳 Handling billing ticket ${state.ticketId}`);
  return {
    resolution: `Billing team ko forward kiya gaya. Refund/charge dispute 3-5 business days mein resolve hoga.`,
  };
}

export async function handleTechnical(state: TicketStateType) {
  console.log(`🛠️  Handling technical ticket ${state.ticketId}`);
  const escalate = state.priority === "high";
  return {
    resolution: escalate
      ? `High-priority bug — engineering team ko turant escalate kiya gaya.`
      : `Technical issue log ho gaya, agle 24 ghante mein team follow-up karegi.`,
    escalated: escalate,
  };
}

export async function handleDelivery(state: TicketStateType) {
  console.log(`📦 Handling delivery ticket ${state.ticketId}`);
  return {
    resolution: `Delivery partner se confirm kiya gaya — order status update SMS se milega.`,
  };
}

export async function handleGeneral(state: TicketStateType) {
  console.log(`💬 Handling general query ${state.ticketId}`);
  return {
    resolution: `FAQ ke hisaab se automated response bhej diya gaya.`,
  };
}
```

### Step 4: Logging Node (Fan-in point)

```ts
// nodes/log.ts
import { TicketStateType } from "../state";

export async function logResolution(state: TicketStateType) {
  // Real app mein — Postgres/Mongo mein insert hoga
  console.log(
    `📝 [DB] Ticket ${state.ticketId} resolved | category=${state.category} | priority=${state.priority} | escalated=${state.escalated}`
  );
  return {}; // koi state change nahi, sirf side-effect (logging)
}
```

### Step 5: Graph Assemble Karna

```ts
// graph.ts
import { StateGraph, START, END } from "@langchain/langgraph";
import { TicketState, TicketStateType } from "./state";
import { classifyTicket } from "./nodes/classify";
import {
  handleBilling,
  handleTechnical,
  handleDelivery,
  handleGeneral,
} from "./nodes/handlers";
import { logResolution } from "./nodes/log";

function routeByCategory(
  state: TicketStateType
): "billing" | "technical" | "delivery" | "general" {
  return state.category ?? "general"; // safe fallback
}

export function buildTicketGraph() {
  const workflow = new StateGraph(TicketState)
    // Nodes register karo
    .addNode("classifyTicket", classifyTicket)
    .addNode("handleBilling", handleBilling)
    .addNode("handleTechnical", handleTechnical, {
      retryPolicy: { maxAttempts: 2 }, // escalation call fail ho sakta hai, retry helpful hai
    })
    .addNode("handleDelivery", handleDelivery)
    .addNode("handleGeneral", handleGeneral)
    .addNode("logResolution", logResolution)

    // Entry point
    .addEdge(START, "classifyTicket")

    // Conditional routing — classify ke baad kaunsa handler chalega
    .addConditionalEdges("classifyTicket", routeByCategory, {
      billing: "handleBilling",
      technical: "handleTechnical",
      delivery: "handleDelivery",
      general: "handleGeneral",
    })

    // Fan-in — sab handlers logResolution pe converge karte hain
    .addEdge("handleBilling", "logResolution")
    .addEdge("handleTechnical", "logResolution")
    .addEdge("handleDelivery", "logResolution")
    .addEdge("handleGeneral", "logResolution")

    // Termination
    .addEdge("logResolution", END);

  return workflow.compile();
}
```

### Step 6: Run Karna

```ts
// main.ts
import "dotenv/config";
import { buildTicketGraph } from "./graph";

async function main() {
  const graph = buildTicketGraph();

  const tickets = [
    { ticketId: "TCK-101", customerMessage: "Mujhe double charge hua hai iss order pe, refund chahiye." },
    { ticketId: "TCK-102", customerMessage: "App crash ho raha hai checkout screen pe, urgent hai." },
    { ticketId: "TCK-103", customerMessage: "Mera order 5 din se 'Out for Delivery' pe atka hai." },
  ];

  for (const ticket of tickets) {
    console.log(`\n--- Processing ${ticket.ticketId} ---`);
    const result = await graph.invoke(ticket);
    console.log("Resolution:", result.resolution);
  }
}

main().catch(console.error);
```

### Expected Output

```
--- Processing TCK-101 ---
🔍 Classifying ticket TCK-101...
   → category: billing, priority: medium
💳 Handling billing ticket TCK-101
📝 [DB] Ticket TCK-101 resolved | category=billing | priority=medium | escalated=false
Resolution: Billing team ko forward kiya gaya. Refund/charge dispute 3-5 business days mein resolve hoga.

--- Processing TCK-102 ---
🔍 Classifying ticket TCK-102...
   → category: technical, priority: high
🛠️  Handling technical ticket TCK-102
📝 [DB] Ticket TCK-102 resolved | category=technical | priority=high | escalated=true
Resolution: High-priority bug — engineering team ko turant escalate kiya gaya.

--- Processing TCK-103 ---
🔍 Classifying ticket TCK-103...
   → category: delivery, priority: low
📦 Handling delivery ticket TCK-103
📝 [DB] Ticket TCK-103 resolved | category=delivery | priority=low | escalated=false
Resolution: Delivery partner se confirm kiya gaya — order status update SMS se milega.
```

**Kya ho raha hai, step-by-step:**

1. Har ticket ke liye graph `START` se shuru hota hai → `classifyTicket` node chalta hai, jo LLM se `category` aur `priority` nikaalta hai (Zod-validated structured output).
2. `routeByCategory` function state ka `category` field dekhkar decide karta hai — 4 mein se ek specialized handler node chalega.
3. Handler node (jaise `handleTechnical`) apna specific logic run karta hai aur `resolution` field set karta hai.
4. Chaaron handlers ka edge `logResolution` ki taraf jaata hai — ye **fan-in point** hai, jo bhi handler chala ho, yaha converge hoga.
5. `logResolution` (mock) DB mein entry likhta hai, phir `END` — graph complete.

---

## Streaming Se Har Step Dekhna

```ts
async function streamTicket() {
  const graph = buildTicketGraph();

  const stream = await graph.stream({
    ticketId: "TCK-104",
    customerMessage: "Payment fail hua lekin paisa kat gaya!",
  });

  for await (const chunk of stream) {
    console.log(chunk); // { [nodeName]: partialStateUpdate }
  }
}
```

```
{ classifyTicket: { category: 'billing', priority: 'high' } }
{ handleBilling: { resolution: 'Billing team ko forward...' } }
{ logResolution: {} }
```

---

## Gotchas aur Common Mistakes

### 1. Conditional edge mein fallback bhoolna

```ts
// ❌ Galat — agar category kabhi undefined ho (LLM ne fail kiya, ya field missing), crash hoga
function routeByCategory(state: TicketStateType) {
  return state.category!; // non-null assertion — risky
}

// ✅ Sahi — hamesha ek safe default rakho
function routeByCategory(state: TicketStateType) {
  return state.category ?? "general";
}
```

### 2. Dead-end node — koi outgoing edge nahi

```ts
// ❌ Galat — handleGeneral ke liye END ya agla node bhoolna
const workflow = new StateGraph(TicketState)
  .addNode("handleGeneral", handleGeneral)
  // .addEdge("handleGeneral", "logResolution") — MISS ho gaya
  .compile(); // yaha runtime/compile error aa sakta hai
```

Har node ka ek explicit path hona chahiye — agle node tak, ya `END` tak. Chapter 12 mein bhi discuss kiya tha — `.compile()` khud validate karta hai ki graph structurally sahi hai.

### 3. State ko directly mutate karna

```ts
// ❌ Galat
async function badNode(state: TicketStateType) {
  state.escalated = true; // direct mutation
  return state;
}

// ✅ Sahi
async function goodNode(state: TicketStateType) {
  return { escalated: true };
}
```

### 4. Zod schema mein `.optional()` fields ko node ke andar bina check kiye use karna

```ts
// ❌ Galat — priority optional hai, lekin bina check kiye use kar rahe ho
async function riskyNode(state: TicketStateType) {
  if (state.priority.length > 0) { ... } // priority undefined ho sakta hai — TS error bhi dega
}

// ✅ Sahi
async function safeNode(state: TicketStateType) {
  if (state.priority && state.priority.length > 0) { ... }
}
```

### 5. `retryPolicy` ko har jagah laga dena

Retry sirf **transient failures** (network glitch, rate limit) ke liye faydemand hai. Agar node ka logic hi buggy hai, retry sirf latency aur LLM cost badhayega, result wahi galat aayega.

---

## Production Considerations

> [!warning]
> **Runtime validation missing links**: Agar tum `Annotation.Root` use kar rahe ho (Zod nahi), state sirf **compile-time** type-checked hai. Agar state kahi se external source (API request, webhook) se populate ho rahi hai, runtime mein invalid data slip kar sakta hai. Zod schema use karne se `.parse()`/`.safeParse()` se runtime validation bhi mil jaati hai — production APIs (Chapter 21) ke liye ye important hai.

> [!warning]
> **Idempotency**: Retry policies ke saath, ek node **multiple baar** chal sakta hai (agar pehli baar partial fail hua ho). Agar node ke andar koi side-effect hai jo repeat hone pe problematic hai (jaise "payment charge karna" ya "email bhejna"), us operation ko **idempotent** banao — jaise ek unique idempotency key check karke pehle se-processed request ko skip karna.

> [!warning]
> **Fan-in race conditions**: Jab multiple branches ek node pe converge karte hain (jaise `logResolution`), yaad rakho ki wo branches **parallel** chal sakte hain agar unka koi common dependency na ho. Agar wo shared external resource (jaise same DB row) update kar rahe hain, race conditions ka khayal rakhna padega.

> [!warning]
> **LLM classification errors routing ko break kar sakte hain**: `classifyTicket` node agar galat category return kare (LLM hallucination, edge-case input), poora downstream routing galat ho jayega. Structured output ke saath bhi, production mein **confidence thresholds** ya **fallback-to-human** paths rakhna zaroori hota hai (Chapter 16 mein human-in-the-loop patterns).

---

## Key Takeaways

- **State schema** do tareeke se define ho sakti hai — `Annotation.Root` (classic, LangGraph-native) ya **Zod schema** (modern, agar Zod se familiar ho — runtime validation ka bonus milta hai).
- **Nodes** async functions hote hain jo state ka **partial update** return karte hain — kabhi state ko directly mutate mat karo, hamesha naya object return karo.
- Node ka second parameter `config` (RunnableConfig) per-invocation metadata (user ID, callbacks) carry karta hai.
- `.addNode(name, fn, { retryPolicy })` se transient failures ke liye automatic retries mil jaate hain — bina manual try/catch loops likhe.
- **Normal edges** (`.addEdge`) fixed transitions hain; **conditional edges** (`.addConditionalEdges`) state dekhkar route decide karte hain — routing function mein hamesha ek **safe fallback** rakho.
- Ek node se **multiple edges** = parallel fan-out; **multiple nodes ek target ki taraf** = fan-in join point.
- Har node ka ek explicit outgoing path hona chahiye (agle node ya `END` tak) — dead-end nodes `.compile()` pe error dete hain.
- Full pipeline: **State schema → Nodes → Edges (normal + conditional) → `StateGraph` → `.compile()` → `.invoke()`/`.stream()`.**
- Ye chapter foundation tha — **Chapter 14** conditional routing ko deeply explore karega, aur **Chapter 15** custom reducers (arrays append karna, complex merges) explain karega jo abhi surface-level touch kiya.
