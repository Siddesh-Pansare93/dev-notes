# Introduction to LangGraph

🟡 Intermediate

## Kya hota hai?

Chapter 8 mein humne `AgentExecutor` se apna pehla agent banaya tha — LLM + Tools + Prompt, ek loop mein wrapped, jab tak final answer na aa jaye. Wo kaam karta hai, aur simple use-cases ke liye aaj bhi valid hai.

Lekin socho tumhe ek **loan approval system** banana hai:

> Customer apply karta hai → system credit score check karta hai → agar score low hai to ek **human reviewer** ko approval ke liye bhejna hai (aur wait karna hai unka decision aane tak, jo ghanton ya din baad aa sakta hai) → agar approve ho gaya to disbursement process start karna hai → agar reject ho gaya to customer ko reason ke saath notify karna hai.

Ab isse `AgentExecutor` mein banane ki koshish karo — turant problems dikhengi:

1. **Human-in-the-loop pause**: `AgentExecutor.invoke()` ek single function call hai — wo shuru hota hai aur khatam hota hai. Beech mein "ruk jao, ek insaan ka wait karo, phir wahi se resume karo" — is cheez ka koi built-in tareeka nahi hai.
2. **Conditional branching jo LLM decide nahi karta**: "agar score < 650 to human review, warna auto-approve" — ye business logic hai, LLM ka decision nahi. `AgentExecutor` ka loop LLM-driven hai, tumhare apne if/else ke liye nahi bana.
3. **State persistence**: Agar server crash ho jaye jab review pending hai, poora context (customer data, credit score, kitne steps ho chuke) kaha store hoga? `AgentExecutor` ke paas iska koi answer nahi hai.
4. **Multiple specialized steps**: Credit check ek alag concern hai, human review alag, disbursement alag. In sab ko ek hi "tool calling loop" mein jabardasti fit karna messy ho jata ha.

Yehi exact gaps fill karne ke liye **LangGraph.js** bana hai.

> [!info]
> **LangGraph** ek library hai (LangChain team ne banayi hai, lekin LangChain se independently bhi use ho sakti hai) jo tumhe apne agent/workflow ko ek **explicit graph** ki tarah define karne deti hai — **nodes** (steps) aur **edges** (nodes ke beech connections), ek shared **state** object ke upar operate karte hue. Isse LangChain.js mein sabse "production-grade" building block maana jata hai complex agentic systems banane ke liye.

Socho ek IRCTC ticket booking ka backend flow — "check seat availability" → "agar available hai to payment lo" → "agar payment fail ho to retry ya cancel" → "agar success ho to ticket confirm karo aur SMS bhejo." Ye ek fixed script nahi hai jo top-se-bottom chal jaye — isme branches hain, kabhi wait karna padta hai (payment gateway response), aur kabhi ek step fail hone par wapas peeche jaana padta hai. **State machine** jaisa sochna padta hai, na ki ek seedha function call chain. LangGraph exactly yehi model deta hai — code mein.

## Kyun zaruri hai in agent-building?

Ye poore course ka **turning point** hai. Chapter 1-11 tak humne LangChain.js ke building blocks seekhe — models, prompts, chains, memory, tools, agents (via `AgentExecutor`), RAG, observability. Ab Chapter 12 se Chapter 24 tak — poora course LangGraph.js ke upar based hai, kyunki:

- **Production agents graphs hote hain, simple loops nahi.** Real-world agentic systems mein branching, retries, human approvals, multiple collaborating agents, aur long-running state hota hai — ye sab LangGraph natively support karta hai.
- **`AgentExecutor` LangGraph ke upar hi ban chuka hai internally** (recent LangChain.js versions mein) — matlab LangGraph seekhna "ek aur library" nahi hai, ye us cheez ka foundation samajhna hai jo already peeche chal rahi thi.
- **Debugging aur control** — jab tumhara agent galat behave kare, ek explicit graph mein exactly dekh sakte ho kaunsa node fail hua, state kya thi us waqt, aur kaha se dobara chalana hai. `AgentExecutor` ke andar ye "black box" jaisa lagta hai.

> [!warning]
> Ye samajhna zaruri hai: LangGraph, LangChain ka **replacement** nahi hai. Tum abhi bhi LangChain.js ke chat models, prompts, tools, retrievers sab use karoge — LangGraph sirf **orchestration layer** deta hai jo decide karta hai ki ye pieces kis order mein, kaunsi condition par chalenge. Socho LangChain ne tumhe ingredients diye (chat model, tool, prompt), aur LangGraph tumhe recipe likhne ka structured tareeka deta hai.

---

## Chain vs Agent (AgentExecutor) vs Graph — Mental Model

| Approach | Control kaun karta hai flow ka? | Cycles/loops? | Pause/resume? | Best for |
|---|---|---|---|---|
| **Chain (LCEL)** | Tum, hardcoded (Chapter 5) | Nahi — linear hai | Nahi | Fixed, predictable pipelines |
| **Agent (`AgentExecutor`)** | LLM decide karta hai next tool call (Chapter 8) | Haan, lekin sirf ek hi "tool-call loop" pattern | Nahi (single blocking call) | Simple, single-agent tool-use |
| **Graph (LangGraph)** | Tum define karte ho nodes/edges; conditional edges LLM ya code se decide ho sakte hain | Haan — koi bhi cycle jo tum banao | **Haan** — built-in checkpointing | Complex, multi-step, stateful, multi-agent, human-in-the-loop systems |

Zaroori insight: **LangGraph in dono ko "subsume" kar leta hai.** Ek simple chain LangGraph mein bhi ban sakti hai (linear nodes), aur ek `AgentExecutor`-style ReAct agent bhi LangGraph ka prebuilt `createReactAgent` use karke ban sakta hai (jaisa Chapter 8 ke end mein preview dikhaya tha). LangGraph "superset" hai — jab flow simple hai, graph bhi simple dikhega; jab flow complex hota hai, graph scale kar leta hai bina tumhe kuch naya seekhne ki zarurat ke.

---

## Core Concepts — Graph Ka Anatomy

LangGraph seekhne ke liye 5 core concepts samajhne padenge. In sabko is chapter mein **high-level** samjhenge — deep-dive Chapters 13-15 mein hoga.

### 1. State

Graph ka **state** ek shared object hai jo har node ke through pass hota hai. Har node isko read kar sakta hai aur update kar sakta hai. Socho ise ek **shared Google Doc** ki tarah jise multiple log (nodes) edit kar rahe hain, ek ke baad ek.

```ts
// State ka shape define karna hota hai — TypeScript + Zod se
import { Annotation } from "@langchain/langgraph";

const GraphState = Annotation.Root({
  customerName: Annotation<string>,
  creditScore: Annotation<number>,
  decision: Annotation<string>,
});
```

### 2. Nodes

Ek **node** simply ek function hai — state leta hai input mein, kuch kaam karta hai (LLM call, tool call, DB query, plain JS logic), aur state ka **partial update** return karta ha.

```ts
async function checkCreditScore(state: typeof GraphState.State) {
  const score = await fetchCreditScore(state.customerName); // mock API call
  return { creditScore: score }; // sirf changed field return karo
}
```

### 3. Edges

**Edges** define karte hain ki ek node ke baad kaunsa node chalega. Do types hote hain:

- **Normal edge**: Hamesha A ke baad B chalega (fixed).
- **Conditional edge**: Ek function state dekhkar decide karta hai ki A ke baad B chalega ya C — jaisa hamara "agar score < 650 to human review, warna auto-approve" wala case.

### 4. Graph (StateGraph)

Ye sab pieces — state shape, nodes, edges — ek `StateGraph` object mein combine hote hain, jise phir **compile** karke ek runnable graph banaya jata hai.

### 5. START aur END

Har graph mein do special markers hote hain — `START` (entry point) aur `END` (jaha graph terminate ho jata hai). Ye LangGraph ke built-in constants hain.

```
┌───────┐      ┌──────────────────┐      ┌─────────────────┐
│ START │─────▶│ checkCreditScore │─────▶│  (conditional)   │
└───────┘      └──────────────────┘      └─────────────────┘
                                            │              │
                                score>=650  │              │ score<650
                                            ▼              ▼
                                     ┌─────────────┐  ┌──────────────┐
                                     │ autoApprove │  │ humanReview  │
                                     └─────────────┘  └──────────────┘
                                            │              │
                                            ▼              ▼
                                          ┌─────────────────┐
                                          │       END        │
                                          └─────────────────┘
```

---

## Setup

```bash
npm install @langchain/langgraph @langchain/core @langchain/openai zod dotenv
```

```bash
# .env
OPENAI_API_KEY=sk-...
```

> [!info]
> `@langchain/langgraph` ek alag package hai `langchain` se. Tumhe `@langchain/core` (base abstractions ke liye) aur apne model provider ka package (jaise `@langchain/openai`) bhi chahiye hoga.

---

## Step 1: Apna Pehla Graph Banao (Simple Linear Example)

Shuru karte hain sabse simple version se — bina LLM ke, sirf plain functions se — taaki graph mechanics samajh aaye bina LLM ki complexity add kiye. Hum wahi **loan approval** example banayenge.

```ts
// state.ts
import { Annotation } from "@langchain/langgraph";

export const LoanState = Annotation.Root({
  customerName: Annotation<string>,
  loanAmount: Annotation<number>,
  creditScore: Annotation<number>,
  decision: Annotation<string>,
});

export type LoanStateType = typeof LoanState.State;
```

```ts
// nodes.ts
import { LoanStateType } from "./state";

// Mock credit bureau API — real app mein CIBIL/Experian jaisa external service hoga
export async function checkCreditScore(state: LoanStateType) {
  console.log(`📊 Checking credit score for ${state.customerName}...`);

  // Mock: naam ke length se score generate kar rahe hain, demo ke liye
  const mockScores: Record<string, number> = {
    Rahul: 720,
    Priya: 610,
    Amit: 550,
  };
  const score = mockScores[state.customerName] ?? 650;

  return { creditScore: score }; // sirf jo change hua wo return karo
}

export async function autoApprove(state: LoanStateType) {
  console.log(`✅ Auto-approving loan for ${state.customerName}`);
  return {
    decision: `Approved automatically — credit score ${state.creditScore} accha hai.`,
  };
}

export async function humanReview(state: LoanStateType) {
  console.log(`⚠️  Sending ${state.customerName}'s application for human review`);
  return {
    decision: `Human review ke liye bheja gaya — credit score ${state.creditScore} threshold se kam hai.`,
  };
}
```

```ts
// graph.ts
import { StateGraph, START, END } from "@langchain/langgraph";
import { LoanState } from "./state";
import { checkCreditScore, autoApprove, humanReview } from "./nodes";

// Conditional edge function — decide karta hai kaunsa path lena hai
function routeAfterCreditCheck(state: typeof LoanState.State): "autoApprove" | "humanReview" {
  return state.creditScore >= 650 ? "autoApprove" : "humanReview";
}

export function buildLoanGraph() {
  const workflow = new StateGraph(LoanState)
    // Step A: nodes register karo, naam ke saath
    .addNode("checkCreditScore", checkCreditScore)
    .addNode("autoApprove", autoApprove)
    .addNode("humanReview", humanReview)

    // Step B: entry point set karo
    .addEdge(START, "checkCreditScore")

    // Step C: conditional edge — credit check ke baad kaunsa path?
    .addConditionalEdges("checkCreditScore", routeAfterCreditCheck, {
      autoApprove: "autoApprove",
      humanReview: "humanReview",
    })

    // Step D: dono paths END par khatam hote hain
    .addEdge("autoApprove", END)
    .addEdge("humanReview", END);

  // Step E: compile karo — ab ye ek runnable graph hai
  return workflow.compile();
}
```

```ts
// main.ts
import "dotenv/config";
import { buildLoanGraph } from "./graph";

async function main() {
  const graph = buildLoanGraph();

  console.log("\n--- Customer 1: Rahul (high score) ---");
  const result1 = await graph.invoke({
    customerName: "Rahul",
    loanAmount: 500000,
  });
  console.log("Final decision:", result1.decision);

  console.log("\n--- Customer 2: Priya (low score) ---");
  const result2 = await graph.invoke({
    customerName: "Priya",
    loanAmount: 300000,
  });
  console.log("Final decision:", result2.decision);
}

main();
```

### Expected Output

```
--- Customer 1: Rahul (high score) ---
📊 Checking credit score for Rahul...
✅ Auto-approving loan for Rahul
Final decision: Approved automatically — credit score 720 accha hai.

--- Customer 2: Priya (low score) ---
📊 Checking credit score for Priya...
⚠️  Sending Priya's application for human review
Final decision: Human review ke liye bheja gaya — credit score 610 threshold se kam hai.
```

**Kya ho raha hai yaha, step-by-step:**

1. `StateGraph(LoanState)` — ek naya graph banaya, jiska shared state shape `LoanState` follow karega.
2. `.addNode(name, fn)` — teen nodes register kiye, har ek ek simple async function.
3. `.addEdge(START, "checkCreditScore")` — graph hamesha `checkCreditScore` se start hoga.
4. `.addConditionalEdges(...)` — `checkCreditScore` ke baad, `routeAfterCreditCheck` function state dekhkar decide karega ki `autoApprove` chalega ya `humanReview`. Teesra argument (object) LangGraph ko batata hai ki function ka return value kaunse actual node name se map hota hai.
5. `.compile()` — sab kuch validate karke ek **runnable** graph object return karta hai, jisme `.invoke()`, `.stream()` jaise methods hote hain (LCEL Runnables jaisa hi feel hota hai, kyunki LangGraph bhi Runnable interface implement karta hai).
6. `.invoke(initialState)` — graph ko run karo ek initial state ke saath. LangGraph automatically **START se shuru** karke, edges follow karte hue, **END tak** poora path chalata hai.

> [!tip]
> Notice karo — koi bhi node **poora state object return nahi karta**, sirf jo fields change hue wo return karta hai (jaise `{ creditScore: score }`). LangGraph automatically inhe existing state ke saath **merge** kar deta hai. Ye behavior "reducers" se control hota hai, jisका deep-dive Chapter 15 mein hoga.

---

## Step 2: Ek LLM Node Add Karo

Ab isi graph mein ek **LLM-powered node** add karte hain — jo human-readable rejection reason generate karega jab loan reject/review ke liye jaye.

```ts
// nodes.ts mein add karo
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0.3 });

export async function humanReview(state: LoanStateType) {
  console.log(`⚠️  Sending ${state.customerName}'s application for human review`);

  // LLM se customer-friendly explanation generate karwate hain
  const response = await model.invoke([
    new SystemMessage(
      "Tum ek bank ke loan officer ho. Customer ko polite, professional Hindi-English mix mein bata rahe ho ki unka loan human review mein gaya hai."
    ),
    new HumanMessage(
      `Customer: ${state.customerName}, Credit Score: ${state.creditScore}, Loan Amount: ₹${state.loanAmount}`
    ),
  ]);

  return { decision: response.content as string };
}
```

Notice karo — node ke andar LLM call karna utna hi simple hai jitna Chapter 2 mein tha. **LangGraph koi naya LLM API nahi sikhata** — wo sirf decide karta hai ki ye node **kab** chalega aur uska output state mein **kaise** jayega.

---

## Step 3: Graph Ko Visualize Karo

Ek badi productivity win — LangGraph.js compiled graphs ko **Mermaid diagram** ki tarah visualize kar sakta hai, taaki debug karna aasan ho:

```ts
// visualize.ts
import { buildLoanGraph } from "./graph";
import * as fs from "fs";

async function visualize() {
  const graph = buildLoanGraph();
  const drawableGraph = await graph.getGraphAsync();
  const mermaidSyntax = drawableGraph.drawMermaid();

  console.log(mermaidSyntax);
  fs.writeFileSync("loan-graph.mmd", mermaidSyntax);
}

visualize();
```

> [!tip]
> Complex multi-agent graphs (Chapter 18 onwards) mein ye visualization bahut kaam aata hai — jab 10+ nodes ho jate hain, mentally track karna mushkil ho jata hai ki flow kaise chal raha hai. `.drawMermaid()` output ko [mermaid.live](https://mermaid.live) mein paste karke turant diagram dekh sakte ho.

---

## Streaming — Graph Ke Steps Real-Time Dekhna

Jaise `AgentExecutor.stream()` tha, LangGraph mein bhi `.stream()` hai — jo har node complete hone par ek update deta hai:

```ts
async function streamGraph() {
  const graph = buildLoanGraph();

  const stream = await graph.stream({
    customerName: "Amit",
    loanAmount: 200000,
  });

  for await (const chunk of stream) {
    // chunk ka shape: { [nodeName]: partialStateUpdate }
    console.log(chunk);
  }
}
```

### Output

```
{ checkCreditScore: { creditScore: 550 } }
{ humanReview: { decision: 'Human review ke liye bheja gaya...' } }
```

Har chunk batata hai kaunsa node abhi complete hua aur usne state mein kya update kiya — production UI mein isse "Checking credit score..." → "Sending for review..." jaisa live progress dikha sakte ho.

---

## LangGraph Kyun "Better" Hai `AgentExecutor` Se — Concrete Reasons

| Cheez | `AgentExecutor` mein | LangGraph mein |
|---|---|---|
| **Flow control** | Sirf LLM decide karta hai (ReAct loop) | Tum full control rakhte ho — LLM-driven, rule-based, ya dono mix kar sakte ho |
| **Cycles/loops** | Ek hi fixed "tool-call loop" pattern | Koi bhi custom cycle bana sakte ho (jaise retry-with-feedback loops) |
| **Pause & Resume** | Nahi — ek single blocking call hai | **Haan** — `checkpointer` se state persist hoti hai; graph kabhi bhi pause/resume ho sakta hai (Chapter 16 mein detail) |
| **Multi-agent** | Manually banana padta hai, messy | Natural fit — har agent ek node ya subgraph ban sakta hai (Chapter 17-18) |
| **Debugging** | "Black box" loop, verbose logs se track karna padta hai | Explicit graph — exactly pata chalta hai kaunsa node, kya state, kaha se resume karna hai |
| **State persistence** | Nahi built-in | Built-in — `MemorySaver`, database-backed checkpointers (Postgres, Redis) |
| **Human-in-the-loop** | Manual flag-based hack | First-class support — `interrupt()` se graph ko pause karke insaan ka input le sakte ho |

> [!info]
> Ye sab features (checkpointing, interrupts, subgraphs, multi-agent patterns) is chapter ka scope nahi hain — bas jaan lo ki ye **exist karte hain aur LangGraph ke core value proposition hain**. Chapter 13 se aage har chapter in mein se ek concept deep-dive karega.

---

## Gotchas aur Common Mistakes

### 1. Poora state return karne ki galti

```ts
// ❌ Galat — poora state manually reconstruct karne ki koshish
async function badNode(state: LoanStateType) {
  return {
    customerName: state.customerName, // unnecessary
    loanAmount: state.loanAmount,     // unnecessary
    creditScore: 700,                 // sirf ye actually change hua
  };
}

// ✅ Sahi — sirf changed fields return karo
async function goodNode(state: LoanStateType) {
  return { creditScore: 700 };
}
```

LangGraph automatically merge karta hai — poora state repeat karna galat nahi hai per se, lekin unnecessary hai aur bugs ka source ban sakta hai (especially arrays/objects ke saath, jaha "merge" ka matlab "replace" bhi ho sakta hai depending on reducer — Chapter 15).

### 2. Conditional edge function mein node names hardcode bhool jaana

```ts
// ❌ Galat — third argument (mapping) miss kar diya
.addConditionalEdges("checkCreditScore", routeAfterCreditCheck)

// ✅ Behtar — explicit mapping do (readability + typo-safety ke liye)
.addConditionalEdges("checkCreditScore", routeAfterCreditCheck, {
  autoApprove: "autoApprove",
  humanReview: "humanReview",
})
```

Mapping optional hai agar function ka return value exactly node names match kare, lekin explicit likhna better practice hai — refactoring mein typos turant pakde jate hain.

### 3. `.compile()` bhool jaana

`StateGraph` object khud runnable nahi hai — `.compile()` call karna zaruri hai, warna `.invoke()`/`.stream()` methods available nahi honge. Ye ek common beginner mistake hai.

### 4. Infinite loops (cycles ke saath)

Agar graph mein ek cycle hai (jaise A → B → A, kisi condition ke basis par), aur wo condition kabhi false nahi hoti, graph **infinite loop** mein phas sakta hai. LangGraph ek default `recursionLimit` deta hai (usually 25), jisse graph automatically error throw kar dega agar limit cross ho jaye:

```ts
await graph.invoke(initialState, { recursionLimit: 10 }); // custom limit set karo
```

> [!warning]
> Production mein hamesha `recursionLimit` explicitly set karo apne use-case ke hisaab se — default value har scenario ke liye sahi nahi hoti.

---

## Production Considerations

> [!warning]
> **State size**: Agar tumhara state object bada hota jata hai (jaise poori chat history, multiple documents), har node call mein pura state serialize/deserialize hota hai (especially checkpointing enabled hone par). Bade objects ko state mein directly rakhne ke bajaye references (IDs) rakho aur actual data external store (DB, cache) mein rakho.

> [!warning]
> **Node failures**: Agar ek node beech mein fail ho jaye (jaise API timeout), poora graph run fail ho sakta hai jab tak retry logic na ho. LangGraph nodes ke andar apna khud ka try/catch aur retry logic likhna padta hai (ya LangGraph ke built-in retry policies use karo, jo Chapter 13+ mein cover hoga).

> [!warning]
> **Cost tracking multi-node graphs mein**: Jaise agent iterations cost multiply karte hain, waise hi graph ke multiple LLM-calling nodes bhi cost multiply karte hain. Complex multi-agent graphs (Chapter 18) mein ek single request ke peeche dus se zyada LLM calls ho sakte hain — Chapter 10 (Observability) ke tracing tools yaha critical ho jate hain.

> [!warning]
> **Graph complexity creep**: Jaise-jaise nodes badhte hain, graph samajhna mushkil hota jata hai. `.drawMermaid()` se regularly visualize karo, aur related nodes ko **subgraphs** (Chapter 17) mein group karne ki aadat daalo — poora graph flat rakhne se long-term maintainability suffer karti hai.

---

## Full Runnable Example (Sab Kuch Ek Saath)

```ts
// index.ts
import "dotenv/config";
import { StateGraph, START, END, Annotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

// ---- 1. State ----
const LoanState = Annotation.Root({
  customerName: Annotation<string>,
  loanAmount: Annotation<number>,
  creditScore: Annotation<number>,
  decision: Annotation<string>,
});
type LoanStateType = typeof LoanState.State;

// ---- 2. Model (LLM node ke liye) ----
const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0.3 });

// ---- 3. Nodes ----
async function checkCreditScore(state: LoanStateType) {
  console.log(`📊 Checking credit score for ${state.customerName}...`);
  const mockScores: Record<string, number> = { Rahul: 720, Priya: 610 };
  return { creditScore: mockScores[state.customerName] ?? 650 };
}

async function autoApprove(state: LoanStateType) {
  console.log(`✅ Auto-approving loan for ${state.customerName}`);
  return { decision: `Approved — credit score ${state.creditScore} accha hai.` };
}

async function humanReview(state: LoanStateType) {
  console.log(`⚠️  Sending ${state.customerName} for human review`);
  const response = await model.invoke([
    new SystemMessage("Tum ek loan officer ho. Customer ko polite tareeke se bataao ki unka loan review mein hai."),
    new HumanMessage(`Customer: ${state.customerName}, Score: ${state.creditScore}, Amount: ₹${state.loanAmount}`),
  ]);
  return { decision: response.content as string };
}

// ---- 4. Conditional routing ----
function routeAfterCreditCheck(state: LoanStateType): "autoApprove" | "humanReview" {
  return state.creditScore >= 650 ? "autoApprove" : "humanReview";
}

// ---- 5. Graph build + compile ----
function buildLoanGraph() {
  return new StateGraph(LoanState)
    .addNode("checkCreditScore", checkCreditScore)
    .addNode("autoApprove", autoApprove)
    .addNode("humanReview", humanReview)
    .addEdge(START, "checkCreditScore")
    .addConditionalEdges("checkCreditScore", routeAfterCreditCheck, {
      autoApprove: "autoApprove",
      humanReview: "humanReview",
    })
    .addEdge("autoApprove", END)
    .addEdge("humanReview", END)
    .compile();
}

// ---- 6. Run ----
async function main() {
  const graph = buildLoanGraph();

  const result = await graph.invoke({
    customerName: "Priya",
    loanAmount: 300000,
  });

  console.log("\nFinal decision:", result.decision);
}

main().catch(console.error);
```

Ise `npx tsx index.ts` se run karo. Console mein dekhoge — credit check node chalega, phir condition ke basis par `autoApprove` ya `humanReview` node chalega, aur final decision print hoga.

---

## Key Takeaways

- **LangGraph.js** LangChain.js ka replacement nahi, ek **orchestration layer** hai — chat models, tools, prompts wahi rehte hain, LangGraph sirf decide karta hai ki flow kaise chalega.
- `AgentExecutor` ke gaps — pause/resume, custom branching, state persistence, multi-step orchestration — yehi LangGraph solve karta hai, ek **explicit graph** model ke through.
- Core building blocks: **State** (shared object), **Nodes** (functions jo state update karte hain), **Edges** (normal ya conditional, jo decide karte hain next node kaunsa hai), aur **START/END** markers.
- Nodes sirf **changed fields** return karte hain — poora state manually reconstruct karne ki zarurat nahi, LangGraph automatically merge karta hai.
- `.addConditionalEdges()` se LLM-independent, rule-based branching possible hai — kuch jo `AgentExecutor` mein natively nahi ho sakta tha.
- Graph banane ka flow: `StateGraph` → `.addNode()` → `.addEdge()`/`.addConditionalEdges()` → `.compile()` → `.invoke()`/`.stream()`.
- `.drawMermaid()` se graph visualize karna production debugging mein bahut helpful hai, especially jab graphs complex hone lagte hain.
- Ye sirf shuruat hai — checkpointing, human-in-the-loop interrupts, subgraphs, aur multi-agent patterns Chapter 13 se 18 tak progressively cover honge, lekin foundation yehi 5 concepts hain jo abhi seekhe.
