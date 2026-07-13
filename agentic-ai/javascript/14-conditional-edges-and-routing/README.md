# Conditional Edges and Routing

🟡 Intermediate

## Kya hota hai?

Pichhle chapter mein humne `StateGraph` seekha — nodes, edges, aur shared state. Lekin jo edges humne banaye the, wo sab **fixed** the: node A hamesha node B pe jaayega, chahe kuch bhi ho. Real duniya mein aisa kabhi nahi hota.

Socho tum Zomato pe order kar rahe ho aur payment fail ho jaata hai. System blindly "Order Confirmed" pe nahi jaata — woh check karta hai: "Payment successful hua ya nahi?" Agar haan, to "Order Confirmed" pe jao. Agar nahi, to "Retry Payment" pe jao. Agar 3 baar fail ho gaya, to "Order Cancelled" pe jao. Yeh ek **decision point** hai — same jagah se, state ke hisaab se, alag-alag raste nikalte hain.

Isi cheez ko LangGraph mein **conditional edges** kehte hain. Yeh tumhe ek node ke baad ek **routing function** likhne dete hain jo current state dekh kar decide karta hai — "ab agla node kaunsa hoga?"

```
        ┌─────────────┐
        │  checkOrder  │
        └──────┬───────┘
               │
        (routing function)
               │
      ┌────────┼────────┐
      ▼        ▼         ▼
  confirmOrder retry   cancelOrder
```

Yeh graph ka wahi hissa hai jo usse ek "if-else ladder" se "actual decision-making system" banata hai — aur yehi wo cheez hai jo agents ko **agentic** banati hai. Bina conditional routing ke, tumhara graph sirf ek fancy `.pipe()` chain hai.

## Kyun zaruri hai?

Agentic AI systems mein routing har jagah hai:

1. **Tool-calling agents**: LLM decide karta hai — "kya mujhe tool call karna hai, ya seedha user ko jawab dena hai?"
2. **Multi-agent systems**: Ek supervisor decide karta hai — "yeh query kis specialist agent ko bhejni hai — billing, tech support, ya sales?"
3. **Retry/error-handling logic**: "API call fail hui — retry karo ya give up karo?"
4. **Human-in-the-loop**: "Confidence score kam hai — human se confirm karwao, warna aage badho"
5. **RAG pipelines**: "Retrieved documents relevant hain? Agar nahi, to query ko rephrase karke dobara retrieve karo"

In sab cases mein, agla step **state pe depend karta hai** — aur yeh decision **runtime** pe hota hai, compile-time pe nahi. Conditional edges hi wo mechanism hain jisse LangGraph.js mein yeh dynamic behavior implement hota hai.

> [!info]
> Agar tumne kabhi finite state machines (FSM) padhi hain, to conditional edges bilkul **transition function** jaisi hain: `(currentState, input) => nextState`. Farak sirf itna hai ki yahan "input" tumhara poora graph state hai, aur "nextState" ek node ka naam hai.

---

## Setup — Recap

```bash
npm install @langchain/langgraph @langchain/core @langchain/openai zod
```

```typescript
import { StateGraph, START, END, Annotation } from "@langchain/langgraph";
```

---

## `addConditionalEdges` — Anatomy

LangGraph.js mein conditional edge add karne ka syntax hai:

```typescript
graph.addConditionalEdges(
  sourceNode,      // konse node ke baad yeh decision lena hai
  routingFunction, // (state) => string | string[] — agla node(s) ka naam return karta hai
  pathMap?         // optional: routing function ke return values ko actual node names se map karta hai
);
```

Teeno parameters ko ek-ek karke samajhte hain.

### 1. `sourceNode`

Woh node jiske **baad** yeh branching decision lena hai. Jaise: `checkOrder` node complete hone ke baad, decide karo agla node kya hoga.

### 2. `routingFunction`

Yeh ek plain function hai jo current graph state leta hai aur ek **string** (ya strings ka array, parallel branching ke liye) return karta hai. Yeh string batata hai ki agla kaunsa node chalega.

```typescript
function routeAfterCheck(state: typeof GraphState.State): string {
  if (state.paymentStatus === "success") {
    return "confirmOrder";
  }
  if (state.retryCount < 3) {
    return "retryPayment";
  }
  return "cancelOrder";
}
```

> [!warning]
> Routing function **pure honi chahiye** — sirf state padhni chahiye, usse mutate nahi karni chahiye. State ko update karna nodes ka kaam hai, routing functions ka nahi. Agar tum routing function ke andar state mutate karte ho, to LangGraph ka reducer-based merging break ho sakta hai aur bugs debug karna mushkil ho jaayega.

### 3. `pathMap` (optional but recommended)

Yeh ek object hai jo routing function ke return values ko actual node names se **explicitly map** karta hai. Agar tum routing function se seedha node ka naam return kar rahe ho (jaise upar), to `pathMap` zaruri nahi. Lekin production code mein isse likhna **strongly recommended** hai kyunki:

- Yeh graph visualization (`graph.getGraph().drawMermaidPng()`) ko accurate banata hai — LangGraph ko pata chal jaata hai ki kaunse edges possible hain
- Yeh TypeScript ko better type-checking karne deta hai
- Yeh code ko self-documenting banata hai

```typescript
graph.addConditionalEdges(
  "checkOrder",
  routeAfterCheck,
  {
    confirmOrder: "confirmOrder",
    retryPayment: "retryPayment",
    cancelOrder: "cancelOrder",
  }
);
```

---

## Worked Example: Customer Support Ticket Router

Chalo ek complete, runnable example banate hain — ek customer-support ticket router jo IRCTC jaisi complaint-handling system ki tarah kaam karega. Flow yeh hoga:

1. `classifyTicket` — LLM se pata karo ki ticket kis category ka hai: `billing`, `technical`, ya `general`
2. Conditional edge — category ke hisaab se sahi specialist node pe route karo
3. Har specialist node apna response generate karta hai
4. Agar `technical` ticket **critical** hai (jaise "server down"), to woh seedha `escalateToHuman` pe route ho, warna `END` pe

```typescript
import { StateGraph, START, END, Annotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

// ---------- 1. State Definition ----------
const TicketState = Annotation.Root({
  ticketText: Annotation<string>,
  category: Annotation<"billing" | "technical" | "general" | "">({
    reducer: (_prev, next) => next,
    default: () => "",
  }),
  isCritical: Annotation<boolean>({
    reducer: (_prev, next) => next,
    default: () => false,
  }),
  response: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => "",
  }),
});

type TicketStateType = typeof TicketState.State;

const llm = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });

// ---------- 2. Nodes ----------

// Node: LLM se ticket classify karwao (structured output ke saath)
const classificationSchema = z.object({
  category: z.enum(["billing", "technical", "general"]),
  isCritical: z.boolean().describe("true agar issue urgent/production-breaking hai"),
});

async function classifyTicket(state: TicketStateType) {
  const structuredLlm = llm.withStructuredOutput(classificationSchema, {
    name: "classify_ticket",
  });

  const result = await structuredLlm.invoke(
    `Is customer support ticket ko classify karo:\n\n"${state.ticketText}"`
  );

  return {
    category: result.category,
    isCritical: result.isCritical,
  };
}

async function handleBilling(state: TicketStateType) {
  const res = await llm.invoke(
    `Tum ek billing support agent ho. Is complaint ka polite jawab do:\n"${state.ticketText}"`
  );
  return { response: `[Billing Team]: ${res.content}` };
}

async function handleTechnical(state: TicketStateType) {
  const res = await llm.invoke(
    `Tum ek technical support agent ho. Is issue ka jawab do:\n"${state.ticketText}"`
  );
  return { response: `[Tech Support]: ${res.content}` };
}

async function handleGeneral(state: TicketStateType) {
  const res = await llm.invoke(
    `Tum ek general query handler ho. Is query ka jawab do:\n"${state.ticketText}"`
  );
  return { response: `[General Support]: ${res.content}` };
}

async function escalateToHuman(state: TicketStateType) {
  // Real system mein yahan Slack/PagerDuty alert bhejte, DB mein flag karte, etc.
  return {
    response: `⚠️ ESCALATED TO HUMAN ENGINEER — Critical issue: "${state.ticketText}"`,
  };
}

// ---------- 3. Routing Functions ----------

// Pehla routing: category ke hisaab se specialist node choose karo
function routeByCategory(state: TicketStateType): string {
  switch (state.category) {
    case "billing":
      return "handleBilling";
    case "technical":
      return "handleTechnical";
    default:
      return "handleGeneral";
  }
}

// Dusra routing: sirf technical tickets ke liye — critical hai to escalate karo
function routeAfterTechnical(state: TicketStateType): string {
  return state.isCritical ? "escalateToHuman" : END;
}

// ---------- 4. Graph Wiring ----------
const graph = new StateGraph(TicketState)
  .addNode("classifyTicket", classifyTicket)
  .addNode("handleBilling", handleBilling)
  .addNode("handleTechnical", handleTechnical)
  .addNode("handleGeneral", handleGeneral)
  .addNode("escalateToHuman", escalateToHuman)

  .addEdge(START, "classifyTicket")

  // Conditional edge #1: classification ke baad route karo
  .addConditionalEdges("classifyTicket", routeByCategory, {
    handleBilling: "handleBilling",
    handleTechnical: "handleTechnical",
    handleGeneral: "handleGeneral",
  })

  // Billing aur general seedha khatam ho jaate hain
  .addEdge("handleBilling", END)
  .addEdge("handleGeneral", END)

  // Conditional edge #2: technical handle hone ke baad, escalate karna hai ya nahi
  .addConditionalEdges("handleTechnical", routeAfterTechnical, {
    escalateToHuman: "escalateToHuman",
    [END]: END,
  })

  .addEdge("escalateToHuman", END)

  .compile();

// ---------- 5. Run ----------
async function main() {
  const result1 = await graph.invoke({
    ticketText: "Mera refund 2 hafte se nahi aaya, order #4521",
  });
  console.log(result1.response);

  const result2 = await graph.invoke({
    ticketText: "Production server down hai, koi order place nahi ho raha!",
  });
  console.log(result2.response);
}

main();
```

### Isme kya-kya ho raha hai, step by step

1. **`classifyTicket`** node LLM ko `withStructuredOutput` ke saath call karta hai — isse humein guaranteed `category` aur `isCritical` fields milte hain (structured output ke baare mein Chapter 4 mein detail se cover kiya tha).
2. Graph `classifyTicket` ke baad ruk kar `routeByCategory` function call karta hai — yeh state (`state.category`) dekh kar decide karta hai agla node kaunsa hoga.
3. Agar category `technical` hai, to `handleTechnical` node chalta hai, aur uske baad **doosri** conditional edge (`routeAfterTechnical`) decide karti hai ki escalate karna hai ya seedha khatam ho jaana hai.
4. Notice karo — `END` ko `pathMap` ke andar bhi use kar sakte ho, jaise `[END]: END` — yeh batata hai ki routing function agar literal `END` string return kare, to graph waha khatam ho jaayega.

> [!tip]
> Ek graph mein **multiple conditional edges** ho sakti hain — har ek apne source node ke baad apna khud ka decision leti hai. Isse tum arbitrarily complex decision trees bana sakte ho, bilkul jaise IRCTC ka complaint-resolution flowchart hota hai — pehle category, phir sub-category, phir priority, har level pe alag branching.

---

## Parallel Routing — Array Return Karna

Kabhi-kabhi tumhe ek se zyada nodes **parallel** mein trigger karne hote hain — jaise ek query aane pe, ek saath "search web" aur "search internal docs" dono chalao. Routing function iske liye ek **array of strings** bhi return kar sakti hai:

```typescript
function fanOutSearch(state: typeof GraphState.State): string[] {
  const targets: string[] = [];
  if (state.needsWebSearch) targets.push("webSearchNode");
  if (state.needsDocsSearch) targets.push("docsSearchNode");
  return targets; // dono empty ho sakte hain, ek ho sakta hai, ya dono
}

graph.addConditionalEdges("planSearch", fanOutSearch, {
  webSearchNode: "webSearchNode",
  docsSearchNode: "docsSearchNode",
});
```

LangGraph automatically dono nodes ko **parallel** mein run karega (Send API ke internal use se), aur unke outputs ko state reducers ke through merge kar dega. Yeh pattern multi-agent systems aur RAG pipelines mein bahut common hai — jaise Swiggy ek order pe simultaneously "restaurant ko notify karo" aur "delivery partner dhoondo" dono kaam parallel chala deta hai.

---

## `Command` API — Newer, More Ergonomic Tarika

LangGraph.js ke recent versions mein ek aur pattern popular ho gaya hai: node ke andar hi **routing decide karna**, `Command` object return karke — bina separate `addConditionalEdges` call ke.

```typescript
import { Command } from "@langchain/langgraph";

async function classifyTicket(state: TicketStateType): Promise<Command> {
  const structuredLlm = llm.withStructuredOutput(classificationSchema);
  const result = await structuredLlm.invoke(
    `Classify: "${state.ticketText}"`
  );

  // State update AUR routing decision, ek hi jagah
  return new Command({
    update: {
      category: result.category,
      isCritical: result.isCritical,
    },
    goto:
      result.category === "billing"
        ? "handleBilling"
        : result.category === "technical"
        ? "handleTechnical"
        : "handleGeneral",
  });
}
```

Iska fayda yeh hai ki state update aur routing logic **ek jagah** rehte hain — jab node ko pata hota hai ki state kya update karna hai, usi context mein usse pata hota hai ki agla node kaunsa hona chahiye. Lekin `Command` use karte waqt tumhe graph definition mein `.addConditionalEdges` nahi likhna padta — sirf yeh batana padta hai (`ends` option se) ki yeh node kin-kin nodes pe ja sakta hai, taaki graph compile aur visualize sahi se ho:

```typescript
const graph = new StateGraph(TicketState)
  .addNode("classifyTicket", classifyTicket, {
    ends: ["handleBilling", "handleTechnical", "handleGeneral"],
  })
  // ... baaki nodes
  .addEdge(START, "classifyTicket")
  .compile();
```

> [!info]
> **`addConditionalEdges` vs `Command`** — dono kaam same karte hain, choose karna style/preference ka mamla hai:
> - `addConditionalEdges`: routing logic **alag** rehti hai node logic se — testing aur separation-of-concerns ke liye acha
> - `Command`: routing aur state-update **saath** rehte hain — kam boilerplate, especially jab routing decision node ke computation ka direct byproduct ho (jaise LLM tool-call decide karta hai)

---

## Common Pattern: Tool-Calling Agent Loop

Sabse common real-world use case — LLM decide karta hai ki tool call karna hai ya nahi. Yeh pattern tum har agent mein dekhoge:

```typescript
import { AIMessage } from "@langchain/core/messages";

function shouldContinue(state: typeof GraphState.State): string {
  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;

  // Agar LLM ne tool call request ki hai, to tools node pe jao
  if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    return "tools";
  }

  // Warna, LLM final answer de chuka hai — khatam karo
  return END;
}

graph
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue, {
    tools: "tools",
    [END]: END,
  })
  .addEdge("tools", "agent"); // tool result wapas agent ko do — loop banta hai
```

Yeh wahi **ReAct loop** hai jo Chapter 8 mein "Building your First Agent" mein dekha tha — ab tumhe pata chal gaya ki iske peeche ka actual mechanism `addConditionalEdges` hi hai.

---

## Gotchas aur Common Mistakes

> [!warning]
> **1. Routing function ka return value `pathMap` mein exist nahi karta**
> Agar routing function ne `"handleBiling"` (typo) return kiya lekin `pathMap` mein sirf `"handleBilling"` hai, to runtime error aayega: `Error: unknown key`. TypeScript yeh compile-time pe pura catch nahi karega agar return type sirf `string` hai — isliye union types use karo:
> ```typescript
> function routeByCategory(
>   state: TicketStateType
> ): "handleBilling" | "handleTechnical" | "handleGeneral" {
>   // ...
> }
> ```

> [!warning]
> **2. Routing function ke andar async LLM call mat karo**
> Routing function sirf **existing state** pe decide kare — naya LLM call node ke andar hona chahiye, routing function ke andar nahi. (Haalanki LangGraph.js technically async routing functions support karta hai, best practice yeh hai ki decision-making LLM calls node mein ho, routing sirf us result ko *read* kare.)

> [!warning]
> **3. Infinite loops**
> Agar tumhara conditional edge kabhi bhi `END` return nahi karta kisi bhi state ke liye, to graph infinite loop mein phas sakta hai. Hamesha ek **exit condition** socho — jaise max retry count, ya ek explicit "done" flag.
> ```typescript
> function routeRetry(state: typeof GraphState.State): string {
>   if (state.retryCount >= 3) return END; // exit condition zaruri hai!
>   return state.success ? END : "retryNode";
> }
> ```

> [!warning]
> **4. Missing `pathMap` se galat graph visualization**
> `pathMap` skip karne se graph *chalega*, lekin `drawMermaidPng()` se generate hone wala diagram incomplete/galat dikh sakta hai kyunki LangGraph ko pata nahi hota ki konse edges possible hain. Debugging aur documentation ke liye hamesha `pathMap` do.

---

## Production Considerations

- **Latency**: Agar routing decision LLM call pe depend karta hai (jaise classification), to yeh ek extra round-trip add karta hai. Chhote, fast models (`gpt-4o-mini`, `claude-haiku`) use karo purely-routing decisions ke liye — full reasoning model ki zarurat nahi hoti.
- **Cost**: Har conditional branch ka apna LLM call ho sakta hai — cost tracking (Chapter 10 — Callbacks & Tracing) se pata karo kaunse branches sabse zyada tokens consume kar rahe hain.
- **Observability**: LangSmith (ya kisi bhi tracer) mein conditional edges clearly dikhte hain as separate spans — production mein isse debug karna aasan hoga ki kaunsa route sabse zyada liya ja raha hai, aur kya wo expected hai.
- **Fallback routes**: Hamesha ek default/fallback branch rakho (jaise `handleGeneral`) jab classification confidently kisi bhi category mein fit na ho — isse system silently crash nahi karega edge cases pe.
- **Testing**: Routing functions **pure functions** hain (state in, string out) — isliye unko unit test karna bahut easy hai, bina LLM call kiye. Sirf alag-alag mock states pass karke assert karo ki sahi node return ho raha hai.

```typescript
// Example unit test (Jest/Vitest)
test("critical technical ticket escalates", () => {
  const state = { category: "technical", isCritical: true } as TicketStateType;
  expect(routeAfterTechnical(state)).toBe("escalateToHuman");
});
```

---

## Key Takeaways

- **Conditional edges** LangGraph.js mein dynamic, state-based branching enable karte hain — `graph.addConditionalEdges(sourceNode, routingFunction, pathMap)`.
- **Routing function** ek pure function hai: state leta hai, ek node-name string (ya array, parallel branching ke liye) return karta hai. Isme LLM calls ya state mutation nahi honi chahiye.
- **`pathMap`** optional hai lekin recommended — accurate graph visualization aur better type-safety ke liye.
- **`Command` API** ek newer alternative hai jisme state update aur routing decision ek hi node ke return value mein combine ho jaate hain (`new Command({ update, goto })`).
- Sabse common real-world pattern hai **tool-calling agent loop** — `shouldContinue` routing function check karta hai ki LLM ne tool call maanga hai ya final answer diya hai.
- Hamesha **exit condition** socho — bina proper `END` route ke, graph infinite loop mein phas sakta hai.
- Routing functions **pure aur synchronous-friendly** hone ki wajah se unit-test karna bahut aasan hai — bina LLM call kiye pura branching logic verify ho sakta hai.
