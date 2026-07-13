# Subgraphs

🟡 Intermediate

## Kya hota hai?

Ek minute socho — Zomato ka backend kaise organized hoga? Ek hi giant `if-else` file mein "restaurant search + cart + payment + delivery tracking + refund" sab kuch nahi likha hoga. Har team apna **independent service** banati hai — Payments team apna system chalati hai, Delivery team apna, Search team apna. Zomato ka main orchestrator bas itna jaanta hai: "payment service ko yeh input do, yeh output milega" — internal implementation se usse matlab nahi.

**Subgraph** LangGraph mein bilkul yehi pattern hai. Ek poora `StateGraph` (apne nodes, edges, conditional routing, reducers ke saath) — jab compile ho jaata hai — usse tum **doosre bade graph ke andar ek single node ki tarah use** kar sakte ho. Bahar se dekhने par woh ek block hai jo input leta hai aur output deta hai; andar woh apna poora multi-step workflow chala raha hota hai.

Pichhle chapters mein humne single `StateGraph` banaye — nodes, edges, conditional routing, reducers. Ab jaise jaise agent complex hota jaata hai (multiple specialized workflows, multiple teams, multiple reusable pieces), ek hi flat graph mein sab kuch likhna un-manageable ho jaata hai. Subgraphs isi problem ka solution hain — **composition** through nesting.

> [!info]
> Naam "subgraph" thoda confusing lag sakta hai — yeh koi special class ya alag API nahi hai. Subgraph sirf ek **normal compiled `StateGraph`** hai jise kisi doosre graph ke node ki jagah use kiya gaya hai. Jo cheez compile hoke `.invoke()`/`.stream()` kar sakti hai, wahi cheez kisi parent graph ka node bhi ban sakti hai.

## Kyun zaruri hai?

1. **Modularity** — Bada agent system chhote, independent, testable units mein tootta hai. Har subgraph apna concern handle karta hai (jaise "order tracking", "refund processing", "billing dispute").
2. **Reusability** — Ek baar likha hua subgraph (jaise "document retrieval pipeline") multiple parent graphs mein reuse ho sakta hai — bina duplicate code ke.
3. **Team ownership** — Bade projects mein alag teams alag subgraphs maintain kar sakti hain, jaise microservices. Payment team apna subgraph independently evolve kar sakti hai bina main graph ko touch kiye.
4. **Multi-agent systems ka foundation** — Agla chapter (Multi-Agent Systems) mein tum dekhoge ki har "agent" aksar apne aap mein ek subgraph hota hai jise ek supervisor/orchestrator graph route karta hai. Subgraphs samajhna multi-agent architecture samajhne ka pehla kadam hai.
5. **Encapsulation** — Subgraph ka internal state, internal nodes, internal retries — sab parent se hidden rehte hain. Parent ko bas itna pata hona chahiye: "yeh input do, yeh output aayega."
6. **Testing in isolation** — Tum ek subgraph ko standalone test kar sakte ho, bina poore parent graph ko run kiye — jaise tum ek microservice ko independently test karte ho.

> [!tip]
> Agar tumhara graph 15+ nodes ka ho gaya hai aur usme 3-4 "logical groups" dikh rahe hain (jaise "auth flow", "search flow", "checkout flow"), yeh clear signal hai ki tumhe subgraphs mein todna chahiye — bilkul waise jaise tum ek bade Express app ko multiple routers mein todte ho (`authRouter`, `searchRouter`, `checkoutRouter`).

---

## Setup

```bash
npm install @langchain/langgraph @langchain/core zod
```

```typescript
import { Annotation, StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { interrupt, Command } from "@langchain/langgraph";
```

---

## Do tarike subgraph add karne ke — schema match ya schema mismatch

Subgraph ko parent graph mein add karne ke do fundamentally different approach hain, aur yeh depend karta hai ek cheez pe: **kya subgraph ka state schema parent ke state schema se overlapping keys share karta hai?**

| Scenario | Approach |
|---|---|
| Subgraph aur parent **same ya overlapping state keys** share karte hain | Compiled subgraph ko **directly** `.addNode()` mein pass karo |
| Subgraph ka state schema **completely different** hai (koi shared keys nahi, ya types different hain) | Subgraph ko ek **node function** ke andar wrap karo jo state transform kare |

Dono approaches dekhte hain.

---

## Approach 1: Shared state schema — direct node ki tarah add karna

Jab parent aur subgraph same `Annotation` schema (ya us schema ka subset/superset) use karte hain, LangGraph automatically state ko pass kar deta hai — koi manual transformation nahi chahiye.

```typescript
// ---- Shared state schema ----
const OrderState = Annotation.Root({
  orderId: Annotation<string>,
  items: Annotation<string[]>({
    reducer: (existing, update) => existing.concat(update),
    default: () => [],
  }),
  status: Annotation<string>,
});

// ---- Subgraph: inventory check pipeline ----
const inventorySubgraph = new StateGraph(OrderState)
  .addNode("checkStock", async (state) => {
    console.log(`Checking stock for order ${state.orderId}...`);
    return { status: "stock_verified" };
  })
  .addNode("reserveItems", async (state) => {
    console.log(`Reserving items: ${state.items.join(", ")}`);
    return { status: "items_reserved" };
  })
  .addEdge(START, "checkStock")
  .addEdge("checkStock", "reserveItems")
  .addEdge("reserveItems", END)
  .compile(); // <-- yeh compiled graph ab ek "node" ban sakta hai

// ---- Parent graph ----
const orderGraph = new StateGraph(OrderState)
  .addNode("receiveOrder", async (state) => {
    console.log(`Order ${state.orderId} received`);
    return { status: "received" };
  })
  .addNode("inventoryCheck", inventorySubgraph) // <-- directly compiled subgraph pass kiya
  .addNode("confirmOrder", async (state) => {
    return { status: "confirmed" };
  })
  .addEdge(START, "receiveOrder")
  .addEdge("receiveOrder", "inventoryCheck")
  .addEdge("inventoryCheck", "confirmOrder")
  .addEdge("confirmOrder", END)
  .compile();

const result = await orderGraph.invoke({
  orderId: "ORD-1001",
  items: ["Butter Chicken", "Naan"],
  status: "new",
});
console.log(result.status); // "confirmed"
```

Yahan `inventorySubgraph` khud ek do-step pipeline hai (`checkStock` -> `reserveItems`), lekin parent graph ke perspective se yeh bas ek node hai — `"inventoryCheck"`. Jab parent iss node pe pahunchta hai, poora subgraph internally execute hota hai (apne nodes, apni internal state transitions ke saath), aur final subgraph state parent ko wapas milta hai — reducers automatically apply hote hain jaise normal node update mein hote.

> [!info]
> Jab schema shared hoti hai, LangGraph subgraph ko treat karta hai jaise woh ek **normal node** ho jiska return value poore `OrderState` ka partial update hai. Isiliye `status` field ko subgraph ke andar update karna aur bahar reflect hona seamless hai.

---

## Approach 2: Different state schema — transformation function

Zyada realistic scenario yeh hai — tumhara subgraph reusable, generic hona chahiye, jisse woh sirf apni zaroorat ka minimal input le, poori parent state se koi matlab na ho. Jaise ek "refund calculator" subgraph ko sirf `orderId` aur `reason` chahiye — usse poori conversation history, user profile, waghera se koi lena dena nahi.

Is case mein subgraph ka apna **independent state schema** hota hai, aur tumhe explicit transformation likhni padti hai — input transform karke subgraph ko do, output transform karke wapas parent state mein daalo.

```typescript
// ---- Parent's state schema (bada, conversation-driven) ----
const SupportState = Annotation.Root({
  messages: Annotation<string[]>({
    reducer: (existing, update) => existing.concat(update),
    default: () => [],
  }),
  customerId: Annotation<string>,
  orderId: Annotation<string>,
  refundReason: Annotation<string>,
  refundOutcome: Annotation<string>,
});

// ---- Subgraph's own, independent state schema (chhota, focused) ----
const RefundState = Annotation.Root({
  orderId: Annotation<string>,
  reason: Annotation<string>,
  amount: Annotation<number>({ default: () => 0, reducer: (_, u) => u }),
  approved: Annotation<boolean>({ default: () => false, reducer: (_, u) => u }),
});

const refundSubgraph = new StateGraph(RefundState)
  .addNode("calculateAmount", async (state) => {
    // fake calculation
    const amount = state.reason === "damaged_item" ? 500 : 250;
    return { amount };
  })
  .addNode("autoApprove", async (state) => {
    // Chhoti amount ho to auto-approve, warna manual review chapter mein dekha jaayega
    return { approved: state.amount <= 500 };
  })
  .addEdge(START, "calculateAmount")
  .addEdge("calculateAmount", "autoApprove")
  .addEdge("autoApprove", END)
  .compile();

// ---- Parent node jo subgraph ko "call" karta hai, transformation ke saath ----
async function refundNode(state: typeof SupportState.State) {
  // 1. Parent state se sirf zaruri fields nikaal ke subgraph ka input banao
  const subgraphInput = {
    orderId: state.orderId,
    reason: state.refundReason,
  };

  // 2. Subgraph ko independently invoke karo
  const subgraphResult = await refundSubgraph.invoke(subgraphInput);

  // 3. Subgraph ka output wapas parent ki language mein transform karo
  return {
    refundOutcome: subgraphResult.approved
      ? `Refund of ₹${subgraphResult.amount} approved`
      : `Refund needs manual review`,
    messages: [`Refund processed for order ${state.orderId}`],
  };
}

const supportGraph = new StateGraph(SupportState)
  .addNode("classifyIssue", async (state) => {
    return { refundReason: "damaged_item", messages: ["Classified as damaged item"] };
  })
  .addNode("processRefund", refundNode) // <-- wrapped node function, direct subgraph nahi
  .addEdge(START, "classifyIssue")
  .addEdge("classifyIssue", "processRefund")
  .addEdge("processRefund", END)
  .compile();

const finalState = await supportGraph.invoke({
  messages: [],
  customerId: "CUST-42",
  orderId: "ORD-2002",
  refundReason: "",
  refundOutcome: "",
});
console.log(finalState.refundOutcome); // "Refund of ₹500 approved"
```

> [!warning]
> Yeh sabse common mistake hai jab schemas overlap **nahi** karte: log directly `.addNode("processRefund", refundSubgraph)` likh dete hain (Approach 1 ki tarah). Yeh **compile-time ya runtime error** dega (ya silently galat behave karega) kyunki `RefundState` ke fields (`amount`, `approved`) `SupportState` mein exist hi nahi karte, aur `SupportState` ke fields (`messages`, `customerId`) `RefundState` expect nahi karta. Jab schemas match nahi karte, **hamesha** ek wrapper node function use karo jo explicitly transform kare.

### Decision rule (yaad rakhne ke liye)

```
Kya subgraph ke saare required input/output fields
parent state mein same naam + same type se exist karte hain?
  |
  |-- HAAN --> Compiled subgraph seedha .addNode() mein pass karo
  |
  |-- NAHI --> Node function likho jo:
               1. Parent state se subgraph ka input banaye (pick + transform)
               2. subgraph.invoke(input) call kare
               3. Subgraph ke output ko parent state format mein wapas map kare
```

---

## Nested subgraphs — multiple levels

Subgraphs khud bhi apne andar aur subgraphs rakh sakte hain — jitni depth chahiye utni. Yeh bilkul org-chart jaisa hai: CEO -> VP -> Manager -> Team, har level apna scope handle karta hai.

```typescript
// Level 3 (innermost): payment gateway retry logic
const paymentAttemptSubgraph = new StateGraph(OrderState)
  .addNode("chargeCard", async (state) => ({ status: "charged" }))
  .addEdge(START, "chargeCard")
  .addEdge("chargeCard", END)
  .compile();

// Level 2: poora payment flow (jisme charging subgraph nested hai)
const paymentSubgraph = new StateGraph(OrderState)
  .addNode("validateCard", async (state) => ({ status: "validated" }))
  .addNode("attemptCharge", paymentAttemptSubgraph) // <-- subgraph ke andar subgraph
  .addEdge(START, "validateCard")
  .addEdge("validateCard", "attemptCharge")
  .addEdge("attemptCharge", END)
  .compile();

// Level 1: main order graph
const fullOrderGraph = new StateGraph(OrderState)
  .addNode("receiveOrder", async (state) => ({ status: "received" }))
  .addNode("payment", paymentSubgraph) // <-- yeh khud 2-level nested hai
  .addEdge(START, "receiveOrder")
  .addEdge("receiveOrder", "payment")
  .addEdge("payment", END)
  .compile();
```

`fullOrderGraph.invoke(...)` call karne pe execution chain hoti hai: `receiveOrder` -> `payment` (jo internally `validateCard` -> `attemptCharge` chalata hai, aur `attemptCharge` khud internally `chargeCard` chalata hai) -> `END`. Har level apna kaam karta hai, bina neeche ke implementation details jaane.

---

## Streaming se subgraphs ke andar ki activity dekhna

Default streaming sirf **top-level** graph ke updates dikhata hai — subgraph ke andar kya ho raha hai, woh chhupa rehta hai. Agar tumhe subgraph ke internal steps bhi dekhne hain (debugging ya rich UI ke liye), `subgraphs: true` option pass karo:

```typescript
const stream = await fullOrderGraph.stream(
  { orderId: "ORD-3003", items: ["Pizza"], status: "new" },
  { subgraphs: true }
);

for await (const [namespace, chunk] of stream) {
  // `namespace` batata hai yeh update kis subgraph se aaya (array of path segments)
  // top-level updates ke liye namespace empty array hota hai
  console.log("namespace:", namespace);
  console.log("update:", chunk);
}
```

Output kuch aisा dikhega (simplified):

```
namespace: []                          update: { receiveOrder: { status: "received" } }
namespace: ["payment:<task_id>"]       update: { validateCard: { status: "validated" } }
namespace: ["payment:<task_id>", "attemptCharge:<task_id>"]  update: { chargeCard: { status: "charged" } }
namespace: []                          update: { payment: { status: "charged" } }
```

> [!tip]
> Production debugging mein `subgraphs: true` bahut kaam aata hai — jaise Swiggy app mein tum "Order placed -> Restaurant confirmed -> Preparing -> Out for delivery" dekhte ho (top-level events), lekin agar kuch fail ho jaaye, support team ko "Payment gateway -> Bank API -> Retry #2" jaisi nested details bhi chahiye hoti hain. `subgraphs: true` tumhe woh granularity deta hai.

---

## Checkpointing aur persistence subgraphs ke saath

Yeh sabse important — aur sabse confuse karne wala — part hai.

**Rule: Subgraph ko apna checkpointer mat do jab woh parent graph ke node ki tarah use ho raha ho.** Sirf top-level (outermost) graph ko `checkpointer` do — subgraph automatically usi checkpointer ko inherit kar leta hai.

```typescript
const checkpointer = new MemorySaver();

// Subgraph — bina checkpointer ke compile karo
const refundSubgraphCompiled = new StateGraph(RefundState)
  .addNode("calculateAmount", async (state) => ({ amount: 500 }))
  .addEdge(START, "calculateAmount")
  .addEdge("calculateAmount", END)
  .compile(); // <-- NO checkpointer yahan

// Parent — sirf yahan checkpointer do
const parentGraph = new StateGraph(SupportState)
  .addNode("processRefund", refundNode)
  .addEdge(START, "processRefund")
  .addEdge("processRefund", END)
  .compile({ checkpointer }); // <-- top-level pe checkpointer

const config = { configurable: { thread_id: "support-thread-1" } };
await parentGraph.invoke({ /* ...initial state... */ }, config);
```

Agar tum subgraph ko **standalone** run karna chahte ho (parent ke bahar, apni testing ya apna independent use-case), tab hi usse apna khud ka checkpointer do:

```typescript
// Yeh subgraph sirf standalone use ke liye — apna checkpointer
const standaloneRefundGraph = new StateGraph(RefundState)
  .addNode("calculateAmount", async (state) => ({ amount: 500 }))
  .addEdge(START, "calculateAmount")
  .addEdge("calculateAmount", END)
  .compile({ checkpointer: new MemorySaver() });

// Ab yeh apne aap chal sakta hai, apni persistence ke saath
await standaloneRefundGraph.invoke({ orderId: "X", reason: "test", amount: 0, approved: false }, {
  configurable: { thread_id: "standalone-test-1" },
});
```

### `interrupt()` subgraphs ke andar

Human-in-the-Loop chapter mein dekha `interrupt()` yahan bhi kaam karta hai — chahe woh kisi bhi nesting level ke subgraph ke andar call ho, interrupt **poore top-level graph ko pause** kar deta hai, aur resume bhi top-level graph invoke karke hi hota hai.

```typescript
const refundApprovalSubgraph = new StateGraph(RefundState)
  .addNode("calculateAmount", async (state) => ({ amount: 5000 }))
  .addNode("humanApproval", async (state) => {
    if (state.amount > 1000) {
      // Yeh interrupt poore parent graph tak bubble up karega
      const decision = interrupt({
        question: `Approve refund of ₹${state.amount}?`,
      });
      return { approved: decision === "yes" };
    }
    return { approved: true };
  })
  .addEdge(START, "calculateAmount")
  .addEdge("calculateAmount", "humanApproval")
  .addEdge("humanApproval", END)
  .compile(); // checkpointer nahi — parent ka use hoga

// Parent graph run karoge to checkpointer zaroori hai top-level pe:
const graphWithApproval = new StateGraph(SupportState)
  .addNode("processRefund", async (state) => {
    const result = await refundApprovalSubgraph.invoke({
      orderId: state.orderId,
      reason: state.refundReason,
      amount: 0,
      approved: false,
    });
    return { refundOutcome: result.approved ? "Approved" : "Rejected" };
  })
  .addEdge(START, "processRefund")
  .addEdge("processRefund", END)
  .compile({ checkpointer: new MemorySaver() });

const cfg = { configurable: { thread_id: "refund-thread-9" } };
const interrupted = await graphWithApproval.invoke(
  { messages: [], customerId: "C1", orderId: "O1", refundReason: "damaged_item", refundOutcome: "" },
  cfg
);
// interrupted.__interrupt__ mein interrupt payload milega

// Human approve karega, phir resume:
const resumed = await graphWithApproval.invoke(new Command({ resume: "yes" }), cfg);
console.log(resumed.refundOutcome); // "Approved"
```

> [!warning]
> Agar subgraph ko manually `refundApprovalSubgraph.invoke(...)` ke through node function ke andar call kar rahe ho (jaisa upar dikhaya), to `interrupt()` still kaam karega **lekin** poora parent graph ka checkpointer hi state save/resume karega. Subgraph ka apna alag `thread_id` maintain karne ki zarurat nahi — same `thread_id` config poore nested execution ke liye use hota hai.

---

## Subgraphs visualize karna

Jab tum graph ko diagram ki tarah dekhna chaho (debugging, documentation), `getGraph()` by default subgraph ko ek single collapsed node ki tarah dikhata hai. Agar tumhe andar ka detail bhi chahiye, `xray` option use karo:

```typescript
// Sirf top-level nodes — subgraph collapsed
const collapsedGraph = fullOrderGraph.getGraph();

// Subgraph ke andar ke nodes bhi expand karke dikhao
const expandedGraph = fullOrderGraph.getGraph({ xray: true });

// Mermaid diagram generate karo (dono levels ke liye)
console.log(collapsedGraph.drawMermaid());
console.log(expandedGraph.drawMermaid());
```

`xray: true` deeper nesting ke liye ek number bhi le sakta hai (jaise `{ xray: 2 }`) — kitne levels tak expand karna hai.

---

## Ek complete practical example — Customer Support System

Ab sabko jodkar ek realistic example banate hain — ek customer support agent jo do specialized subgraphs use karta hai: **Order Tracking** (simple schema, shared) aur **Refund Processing** (independent schema, human approval ke saath).

```typescript
import {
  Annotation,
  StateGraph,
  START,
  END,
  MemorySaver,
  interrupt,
  Command,
} from "@langchain/langgraph";

// ---- Main support graph ka state ----
const SupportState = Annotation.Root({
  messages: Annotation<string[]>({
    reducer: (existing, update) => existing.concat(update),
    default: () => [],
  }),
  intent: Annotation<"track_order" | "refund" | "unknown">({
    default: () => "unknown",
    reducer: (_, u) => u,
  }),
  orderId: Annotation<string>,
  refundReason: Annotation<string>,
  finalResponse: Annotation<string>,
});

// ---- Subgraph 1: Order Tracking (schema shared — direct add) ----
const orderTrackingSubgraph = new StateGraph(SupportState)
  .addNode("fetchStatus", async (state) => {
    // fake DB lookup
    return {
      finalResponse: `Order ${state.orderId} is out for delivery, ETA 20 mins.`,
      messages: [`Fetched status for ${state.orderId}`],
    };
  })
  .addEdge(START, "fetchStatus")
  .addEdge("fetchStatus", END)
  .compile();

// ---- Subgraph 2: Refund Processing (independent schema + interrupt) ----
const RefundState = Annotation.Root({
  orderId: Annotation<string>,
  reason: Annotation<string>,
  amount: Annotation<number>({ default: () => 0, reducer: (_, u) => u }),
  approved: Annotation<boolean>({ default: () => false, reducer: (_, u) => u }),
});

const refundSubgraph = new StateGraph(RefundState)
  .addNode("calculateAmount", async (state) => {
    const amount = state.reason === "damaged_item" ? 1500 : 300;
    return { amount };
  })
  .addNode("approve", async (state) => {
    if (state.amount > 1000) {
      const decision = interrupt({
        message: `High-value refund (₹${state.amount}) needs manual approval`,
      });
      return { approved: decision === "approve" };
    }
    return { approved: true }; // small amounts auto-approve
  })
  .addEdge(START, "calculateAmount")
  .addEdge("calculateAmount", "approve")
  .addEdge("approve", END)
  .compile(); // no checkpointer — parent ka use hoga

// Wrapper node — schema transform + subgraph call
async function refundNode(state: typeof SupportState.State) {
  const result = await refundSubgraph.invoke({
    orderId: state.orderId,
    reason: state.refundReason,
    amount: 0,
    approved: false,
  });
  return {
    finalResponse: result.approved
      ? `Refund of ₹${result.amount} approved for order ${state.orderId}.`
      : `Refund request for order ${state.orderId} was rejected.`,
    messages: [`Refund decision: ${result.approved}`],
  };
}

// ---- Router node — intent classify ----
function routeByIntent(state: typeof SupportState.State) {
  return state.intent === "track_order" ? "orderTracking" : "refundProcessing";
}

// ---- Main graph ----
const supportGraph = new StateGraph(SupportState)
  .addNode("classifyIntent", async (state) => {
    // fake NLU classification
    const lastMsg = state.messages[state.messages.length - 1] ?? "";
    const intent = lastMsg.toLowerCase().includes("refund") ? "refund" : "track_order";
    return { intent };
  })
  .addNode("orderTracking", orderTrackingSubgraph)   // Approach 1 — shared schema
  .addNode("refundProcessing", refundNode)            // Approach 2 — wrapped, different schema
  .addConditionalEdges("classifyIntent", routeByIntent, {
    orderTracking: "orderTracking",
    refundProcessing: "refundProcessing",
  })
  .addEdge(START, "classifyIntent")
  .addEdge("orderTracking", END)
  .addEdge("refundProcessing", END)
  .compile({ checkpointer: new MemorySaver() });

// ---- Run: order tracking path ----
const trackResult = await supportGraph.invoke(
  { messages: ["Where is my order?"], orderId: "ORD-500", refundReason: "", finalResponse: "", intent: "unknown" },
  { configurable: { thread_id: "user-101" } }
);
console.log(trackResult.finalResponse);
// "Order ORD-500 is out for delivery, ETA 20 mins."

// ---- Run: refund path (triggers interrupt) ----
const refundCfg = { configurable: { thread_id: "user-102" } };
const refundStart = await supportGraph.invoke(
  { messages: ["I want a refund"], orderId: "ORD-501", refundReason: "damaged_item", finalResponse: "", intent: "unknown" },
  refundCfg
);
console.log(refundStart.__interrupt__); // human approval ka wait ho raha hai

// Human approve karta hai:
const refundDone = await supportGraph.invoke(new Command({ resume: "approve" }), refundCfg);
console.log(refundDone.finalResponse);
// "Refund of ₹1500 approved for order ORD-501."
```

Is example mein dono patterns ek saath dikhte hain — `orderTracking` directly subgraph hai (shared schema), aur `refundProcessing` wrapped node function hai (independent schema + nested interrupt). Yeh bilkul multi-agent systems ka preview hai jo agle chapter mein detail se cover hoga.

---

## Common Mistakes aur Gotchas

1. **Schema mismatch ke bawajood direct `.addNode()` use karna** — agar subgraph ke required fields parent state mein nahi hain (ya different type ke hain), directly pass karna runtime errors ya silent `undefined` values dega. Hamesha wrapper function likho jab schemas match na karein.

2. **Subgraph ko explicitly checkpointer dena jab woh parent ke andar nested hai** — isse do independent persistence layers ban sakti hain jo confuse karti hain ki "state kahan save hui." Sirf top-level graph ko checkpointer do; subgraph automatically inherit karega.

3. **Node naming collision se darna** — parent aur subgraph mein same naam ka node (jaise dono mein `"validate"` node) ho to bhi koi problem nahi — LangGraph internally namespace karta hai (`payment:validate` jaisa kuch). Lekin readability ke liye descriptive, unique names use karna better practice hai.

4. **`subgraphs: true` bhoolna debugging ke waqt** — agar subgraph ke andar kuch galat ho raha hai aur tumhe sirf top-level stream dikh raha hai, tumhe root cause samajhna mushkil hoga. Nested issues debug karte waqt hamesha `subgraphs: true` on karo.

5. **Bahut zyada nesting levels** (4-5+ deep) — yeh debugging aur mental model dono ko complex bana deta hai. 2-3 levels tak reasonable hai; usse zyada ho to shayad architecture ko flatten karne ka time aa gaya hai.

6. **Subgraph ko reusable banana bhool jaana** — agar subgraph parent state ke specific field names pe directly depend karta hai (Approach 1), woh **sirf usi parent** ke saath kaam karega. Agar reusability chahiye (multiple different parents mein use karna hai), Approach 2 (independent schema + wrapper) better design hai — yeh bilkul ek npm package design karne jaisa hai jo kisi specific app pe hardcoded nahi hona chahiye.

> [!warning]
> Ek aur subtle gotcha — agar subgraph mein `interrupt()` hai aur tum subgraph ko standalone (apne checkpointer ke saath) run kar rahe ho **alag se**, phir usi subgraph ko kisi parent ke node ke roop mein bhi add karte ho — dono contexts mein `thread_id` ka scope alag samajhna zaruri hai. Standalone context mein subgraph ka apna thread hoga; nested context mein parent ka thread hi authoritative hoga.

---

## Production Considerations

- **Observability (LangSmith)**: Subgraphs LangSmith traces mein automatically **nested runs** ki tarah dikhte hain — parent run ke andar child runs. Yeh production debugging ke liye bahut valuable hai kyunki tum exact pata laga sakte ho ki kaunsa specific subgraph slow hai ya fail ho raha hai, bina poore graph ko manually instrument kiye.
- **Cost/latency tracking per subgraph**: Agar alag alag teams alag subgraphs maintain karte hain, per-subgraph token usage aur latency track karna (via callbacks/tracing — Callbacks chapter dekho) unhe apna performance independently optimize karne deta hai.
- **Testing strategy**: Har subgraph ko **standalone unit-test** karo (apna khud ka `checkpointer`/mock input dekar), phir integration test poore parent graph ka. Yeh bilkul microservices testing pyramid jaisa hai — unit tests har service ke liye, integration tests puri chain ke liye.
- **Versioning**: Agar subgraph shared package ki tarah multiple projects mein use ho raha hai, semantic versioning follow karo — subgraph ka input/output schema badalna ek **breaking change** hai jo saare consumers ko affect karega.
- **Recursion limits**: Deeply nested subgraphs mein bhi `recursionLimit` config poore execution tree pe apply hota hai (parent + sab nested levels combined), na ki har subgraph ko alag budget milta hai. Agar complex nested workflows hain, is limit ko explicitly tune karo (`{ recursionLimit: 50 }` jaisa) taaki legitimate deep workflows premature error na de.
- **Failure isolation**: Design karte waqt socho — agar ek subgraph fail ho, kya poora parent graph fail hona chahiye, ya graceful fallback hona chahiye? `try/catch` wrapper node function ke andar (Approach 2 pattern) is control ko explicit banata hai.

---

## Key Takeaways

- Subgraph koi special API nahi hai — yeh sirf ek **compiled `StateGraph`** hai jo kisi doosre (parent) graph ke node ki jagah use ho raha hai.
- **Approach 1 (shared schema)**: agar subgraph ke saare fields parent state mein same naam/type se exist karte hain, compiled subgraph ko directly `.addNode()` mein pass karo.
- **Approach 2 (different schema)**: agar schemas match nahi karte, ek wrapper node function likho jo input transform kare, `subgraph.invoke()` call kare, aur output ko wapas parent format mein map kare.
- Subgraphs **arbitrarily nested** ho sakte hain — subgraph ke andar subgraph, jitni depth zaruri ho.
- Streaming mein `subgraphs: true` pass karo agar tumhe nested internal steps bhi dekhne hain — bina isके sirf top-level updates milte hain.
- **Checkpointer sirf top-level graph ko do** — subgraph automatically parent ka checkpointer inherit karta hai. Subgraph ko apna checkpointer sirf tab do jab woh standalone (parent ke bahar) chalna ho.
- `interrupt()` kisi bhi nesting level ke subgraph ke andar kaam karta hai — poore top-level graph ko pause karta hai, aur resume top-level `thread_id` se hi hota hai.
- `getGraph({ xray: true })` se subgraph ke internal nodes visualize kar sakte ho; default mein subgraph ek collapsed single node ki tarah dikhta hai.
- Subgraphs modularity, reusability, team-ownership, aur testing-in-isolation deते hain — aur yeh multi-agent systems (agla chapter) ki foundational building block hain.
