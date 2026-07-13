# Human-in-the-Loop

🟡 Intermediate

## Kya hota hai?

Chapter 12 mein humne loan-approval example dekha tha: score kam ho to ek **human reviewer** ko bhejna hai, aur unka decision aane tak (ghanton ya din baad) wait karna hai. Ab wahi cheez actually build karte hain.

Socho tum ek **refund approval agent** bana rahe ho ek e-commerce app ke liye (Flipkart-jaisa). Agent customer ki complaint padhta hai, decide karta hai refund dena chahiye ya nahi, aur agar amount ₹2000 se zyada hai to ek **human agent (support team ka insaan)** ko approve karne ke liye bhejta hai. Ab socho ye human 3 ghante baad apna laptop kholta hai aur "Approve" click karta hai — is beech:

- Tumhara server kai baar restart ho chuka hoga (deploys, crashes)
- Doosre 500 customers ke liye agent chal rahe honge
- Tumhe **exactly wahi point** se resume karna hai jaha agent ruka tha — poora context (customer ka naam, order details, refund amount, LLM ne kya socha tha) intact rehna chahiye

Ye **Human-in-the-Loop (HITL)** hai — agent ko beech mein **pause** karna, ek insaan ka input/approval lena, aur phir **exact usi state se resume** karna. Socho isse ek dabbawala system ki tarah — tiffin route mein ek checkpoint pe ruk sakta hai (agar address confirm karna ho), lekin poora order (kiska tiffin, kaha jaana hai) khoya nahi jaata — wo checkpoint pe hi safe rehta hai jab tak insaan confirm na kare.

> [!info]
> LangGraph.js mein HITL do cheezon pe based hai:
> 1. **Checkpointer** — graph ki state ko har step ke baad persist karta hai (disk/DB mein), taaki graph kabhi bhi "freeze" ho sake aur baad mein exact wahi se "unfreeze" ho sake.
> 2. **`interrupt()` function** — graph execution ko beech mein rok deta hai aur ek value "surface" karta hai (jo UI/API ko dikhti hai), jab tak koi `resume` value na de.

## Kyun zaruri hai in agent-building?

Production agents jo **real-world actions** lete hain (payment process karna, email bhejna, database row delete karna, refund issue karna, code deploy karna) — inhe **kabhi bina insaani oversight ke fully autonomous** nahi chodna chahiye, kam se kam high-risk actions ke liye. Kyun?

1. **LLMs galti karte hain** — hallucination, galat amount, galat customer ko refund — agent confidently galat decision bhi le sakta hai.
2. **Compliance aur trust** — bahut se domains (finance, healthcare, legal) mein regulation hi require karta hai ki final approval ek insaan de.
3. **Irreversible actions** — ek refund process ho gaya, ek email chala gaya, ek DB row delete ho gaya — inhe undo karna mushkil ya impossible hota hai. Insaan ko "confirm" dabaane ka mauka dena cheap insurance hai.
4. **Trust build karna** — jab tum ek naya agent launch karte ho, "human review" ek safety net hai jo tumhe confidently ship karne deta hai, phir dheere-dheere trust badhne pe autonomy badha sakte ho.

> [!warning]
> HITL "agent weak hai isliye insaan chahiye" wala concept nahi hai — ye ek **deliberate architecture choice** hai production systems mein. Bahut saari serious agentic systems (coding agents, financial agents, customer support) mein HITL day-1 se design mein hota hai, patch nahi hota baad mein.

---

## Setup

```bash
npm install @langchain/langgraph @langchain/core @langchain/openai zod
```

```typescript
import { StateGraph, START, END, Annotation, MemorySaver, interrupt, Command } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
```

---

## Concept 1: Checkpointer — Graph ki "Save Game" Feature

Bina checkpointer ke, LangGraph ka `interrupt()` kaam hi nahi karega — error throw karega. Kyun? Kyunki `interrupt()` graph ko **pause** karta hai, aur pause karne ke liye kisi ko current state kahi save karni padegi taaki baad mein wahi se load kar sako.

Socho video game ka **save point** — checkpointer wahi role play karta hai. Har node execute hone ke baad, LangGraph automatically current state ko checkpointer mein save kar deta hai, ek unique **`thread_id`** ke against.

```typescript
// Development/testing ke liye — in-memory, server restart pe gayab ho jaata hai
const checkpointer = new MemorySaver();

const graph = new StateGraph(MyState)
  .addNode("someNode", someNodeFn)
  // ... aur nodes/edges
  .compile({ checkpointer }); // <-- checkpointer yahan pass karo
```

`thread_id` ek conversation/session ka unique identifier hai — jaise ek customer ka ek support ticket. Har alag `thread_id` ka apna independent, persisted state hota hai:

```typescript
const config = { configurable: { thread_id: "ticket-4521" } };

await graph.invoke({ userQuery: "Mera order cancel ho gaya" }, config);
```

> [!tip]
> `thread_id` ko real project mein tumhare business entity se map karo — order ID, ticket ID, conversation ID, user session ID. Isse baad mein exactly pata rahega "kaunsa graph run kis cheez ka tha".

`MemorySaver` sirf process ki memory mein rehta hai — server restart hote hi sab pending interrupts gayab. **Production mein tumhe persistent checkpointer chahiye** (Postgres, SQLite, Redis) — is chapter ke end mein cover karenge.

---

## Concept 2: `interrupt()` — Graph ko Pause Karna

`interrupt()` ek function hai jo kisi bhi node ke andar call kar sakte ho. Jab ye call hota hai:

1. Graph **wahi ruk jaata hai** — us point pe
2. Jo value `interrupt()` ko pass ki gayi thi, wo bahar "surface" hoti hai (`result.__interrupt__` mein)
3. Graph ka execution ab **suspended** hai — jab tak koi explicitly `resume` value nahi bhejta

```typescript
import { interrupt } from "@langchain/langgraph";

async function humanApprovalNode(state: typeof RefundState.State) {
  // Yahan graph ruk jaayega, aur ye payload "surface" hoga UI/API ko
  const decision = interrupt({
    question: "Kya ye refund approve karna hai?",
    customerName: state.customerName,
    amount: state.refundAmount,
  });

  // Jab resume hoga, "decision" wahi value hogi jo Command({ resume: ... }) mein di gayi thi
  return { humanDecision: decision };
}
```

Resume karne ke liye `Command({ resume: value })` use karte ho:

```typescript
import { Command } from "@langchain/langgraph";

// Human ne "approve" click kiya UI pe — ye value interrupt() ka return value banegi
const resumed = await graph.invoke(
  new Command({ resume: { action: "approve" } }),
  config // <-- same thread_id!
);
```

> [!warning]
> Resume karte waqt **same `thread_id`** use karna zaruri hai jo pehle invoke mein tha — warna LangGraph ko pata hi nahi chalega ki kaunsi paused state resume karni hai.

---

## Poora Worked Example: Refund Approval Agent

Ab ek complete, runnable example banate hain — jaisa humne upar discuss kiya.

```typescript
import { StateGraph, START, END, Annotation, MemorySaver, interrupt, Command } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";

// ---------- 1. State schema ----------
const RefundState = Annotation.Root({
  customerName: Annotation<string>,
  complaint: Annotation<string>,
  refundAmount: Annotation<number>,
  aiRecommendation: Annotation<string>({
    reducer: (_e, u) => u,
    default: () => "",
  }),
  humanDecision: Annotation<{ action: "approve" | "reject"; note?: string } | null>({
    reducer: (_e, u) => u,
    default: () => null,
  }),
  finalStatus: Annotation<string>({
    reducer: (_e, u) => u,
    default: () => "pending",
  }),
});

type RefundStateType = typeof RefundState.State;

const llm = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });

// ---------- 2. Nodes ----------

// Node A: LLM apni recommendation deta hai
async function analyzeComplaint(state: RefundStateType): Promise<Partial<RefundStateType>> {
  const response = await llm.invoke(
    `Customer complaint: "${state.complaint}"\nRefund amount: ₹${state.refundAmount}\n\n` +
      `Ek short recommendation do — kya ye refund genuine lagta hai? (2 lines mein Hinglish mein jawaab do)`
  );

  return { aiRecommendation: response.content as string };
}

// Node B: High-value refunds ke liye human approval — yahi HITL point hai
async function humanApproval(state: RefundStateType): Promise<Partial<RefundStateType>> {
  // Graph yahan pause ho jaayega. Ye payload UI ko dikhega.
  const decision = interrupt({
    type: "refund_approval",
    customerName: state.customerName,
    amount: state.refundAmount,
    aiRecommendation: state.aiRecommendation,
    message: `${state.customerName} ka ₹${state.refundAmount} ka refund — approve karoge?`,
  });

  // decision = jo bhi value Command({ resume }) mein aayi
  return { humanDecision: decision };
}

// Node C: Decision ke hisaab se refund process karna
async function processDecision(state: RefundStateType): Promise<Partial<RefundStateType>> {
  if (state.humanDecision?.action === "approve") {
    // Real mein: payment gateway ko call karke refund issue karo
    console.log(`[processDecision] Refund of ₹${state.refundAmount} processed for ${state.customerName}`);
    return { finalStatus: "refunded" };
  }

  console.log(`[processDecision] Refund rejected. Note: ${state.humanDecision?.note ?? "N/A"}`);
  return { finalStatus: "rejected" };
}

// ---------- 3. Conditional routing: sirf high-value refunds ko human ke paas bhejna ----------
function routeAfterAnalysis(state: RefundStateType): "humanApproval" | "processDecision" {
  if (state.refundAmount > 2000) {
    return "humanApproval";
  }
  // Chhote amounts auto-approve ho jaate hain — insaan ka time waste nahi
  return "processDecision";
}

// ---------- 4. Graph banao ----------
const refundGraph = new StateGraph(RefundState)
  .addNode("analyze", analyzeComplaint)
  .addNode("humanApproval", humanApproval)
  .addNode("processDecision", processDecision)
  .addEdge(START, "analyze")
  .addConditionalEdges("analyze", routeAfterAnalysis, {
    humanApproval: "humanApproval",
    processDecision: "processDecision",
  })
  .addEdge("humanApproval", "processDecision")
  .addEdge("processDecision", END);

// ---------- 5. Checkpointer ke saath compile ----------
const checkpointer = new MemorySaver();
const app = refundGraph.compile({ checkpointer });

// ---------- 6. Run karo ----------
async function main() {
  const config = { configurable: { thread_id: "refund-req-101" } };

  // Pehla invoke — ye "humanApproval" node pe interrupt hit karega (amount > 2000)
  const result1 = await app.invoke(
    {
      customerName: "Rohit Sharma",
      complaint: "Product damaged mila, seal already toota hua tha",
      refundAmount: 3500,
    },
    config
  );

  if (result1.__interrupt__) {
    console.log("Graph paused! Human input chahiye:");
    console.log(result1.__interrupt__[0].value);
    // yahan real app mein: is payload ko DB mein save karo, ya Slack/dashboard pe bhejo
    // insaan ke response ka wait karo (minutes/hours/days baad bhi ho sakta hai)
  }

  // ... kuch der/din baad, jab support agent "Approve" click karta hai UI pe ...
  const result2 = await app.invoke(
    new Command({ resume: { action: "approve", note: "Photo evidence verified" } }),
    config // <-- same thread_id, isliye LangGraph ko pata chalta hai kaunsi paused run resume karni hai
  );

  console.log("\n=== Final State ===");
  console.log("Status:", result2.finalStatus);
}

main();
```

**Expected output:**

```
Graph paused! Human input chahiye:
{
  type: 'refund_approval',
  customerName: 'Rohit Sharma',
  amount: 3500,
  aiRecommendation: '...',
  message: 'Rohit Sharma ka ₹3500 ka refund — approve karoge?'
}
[processDecision] Refund of ₹3500 processed for Rohit Sharma

=== Final State ===
Status: refunded
```

### Step-by-step kya ho raha hai

1. `app.invoke(input, config)` — graph shuru hota hai, `analyze` node LLM se recommendation leta hai.
2. `routeAfterAnalysis` decide karta hai — amount > 2000, to `humanApproval` node pe jao.
3. `humanApproval` node ke andar `interrupt(...)` call hota hai — graph **yahin ruk jaata hai**, aur checkpointer state ko save kar deta hai (`thread_id: "refund-req-101"` ke against).
4. `result1.__interrupt__` mein wo payload milta hai jo humne `interrupt()` ko pass kiya tha — ye tumhare UI/dashboard ko dikhane ke liye hota hai.
5. Jab insaan decision leta hai (chahe 5 second baad ho ya 2 din baad), tum `Command({ resume: ... })` ke saath **same `thread_id`** pe `invoke` karte ho.
6. LangGraph exactly wahi state load karta hai jaha `humanApproval` node ruka tha, `interrupt()` ka return value `resume` mein di gayi value ban jaata hai, aur graph **wahi se aage** chalta hai — `analyze` node dobara nahi chalta.

> [!info]
> `result1.__interrupt__` ek array hai (multiple parallel interrupts ho sakte hain agar graph mein branching ho rahi ho). Har entry ka shape roughly `{ value, id, ... }` hota hai — `value` wahi payload hai jo tumne `interrupt()` ko pass kiya tha.

---

## Pattern: Content Edit Karna (sirf approve/reject nahi)

Kabhi tumhe insaan se sirf haan/na nahi, balki **edited content** chahiye hota hai — jaise LLM ne ek email draft kiya, aur human usko thoda edit karke bhejna chahta hai:

```typescript
async function reviewDraftNode(state: typeof State.State) {
  // Current AI-generated content ko surface karo review ke liye
  const editedContent = interrupt({
    instruction: "Is email draft ko review karo, chaho to edit karo",
    content: state.emailDraft,
  });

  // Jo bhi (edited ya as-is) value aayi wahi naya draft ban jaata hai
  return { emailDraft: editedContent };
}
```

Resume karte waqt human ka edited text bhejo:

```typescript
await graph.invoke(
  new Command({ resume: "Namaste! Aapka order 3 din mein deliver ho jayega — edited version" }),
  config
);
```

## Pattern: Tool Call Review (Agent ke tool calls approve karna)

Ek bahut common production pattern — agent ne decide kiya ki wo ek tool call karega (jaise `sendEmail` ya `deleteRecord`), lekin execute karne se pehle insaan ko dikhana hai:

```typescript
import { ToolCall } from "@langchain/core/messages/tool";
import { ToolMessage } from "@langchain/core/messages";

function reviewToolCall(toolCall: ToolCall): ToolCall | ToolMessage {
  const humanReview = interrupt({
    question: "Kya ye tool call execute karna sahi hai?",
    tool_call: toolCall,
  });

  if (humanReview.action === "continue") {
    // Jaisa hai waisa hi execute karo
    return toolCall;
  } else if (humanReview.action === "update") {
    // Human ne arguments edit kiye — updated call return karo
    return { ...toolCall, args: humanReview.data };
  } else if (humanReview.action === "feedback") {
    // Human ne reject kiya, feedback diya — ToolMessage return karo taaki
    // LLM ko pata chale "ye tool call nahi hua, ye reason hai"
    return new ToolMessage({
      content: humanReview.data,
      name: toolCall.name,
      tool_call_id: toolCall.id,
    });
  }

  throw new Error(`Unknown review action: ${humanReview.action}`);
}
```

> [!tip]
> Ye pattern coding agents mein bahut use hota hai — agent ne `runShellCommand("rm -rf ./build")` call kiya, insaan ko approve/edit/reject karne do execute hone se pehle. Bahut saare production coding agents (jaise Claude Code khud) isi tarah ki HITL confirmation use karte hain destructive actions ke liye.

---

## Multiple Sequential Interrupts

Ek graph mein **ek se zyada interrupt points** ho sakte hain — chahe alag nodes mein, ya loop mein baar-baar. Jab bhi resume karte ho, agla `interrupt()` hit hote hi graph phir se pause ho jaata hai:

```typescript
async function main() {
  const config = { configurable: { thread_id: "multi-step-1" } };

  let result = await app.invoke({ /* initial input */ }, config);

  // Jab tak koi interrupt pending hai, usko handle karke resume karte raho
  while (result.__interrupt__) {
    const interruptPayload = result.__interrupt__[0].value;
    console.log("Pending review:", interruptPayload);

    const humanResponse = await getHumanInputSomehow(interruptPayload); // tumhara UI/CLI

    result = await app.invoke(new Command({ resume: humanResponse }), config);
  }

  console.log("Graph fully done:", result);
}
```

Ye loop pattern real production systems mein bahut common hai — jab tak `__interrupt__` present hai, graph "waiting on human" state mein hai.

---

## Inspecting Paused State: `getState()`

Kabhi tumhe sirf ye check karna hota hai ki ek thread abhi kis state mein hai, bina resume kiye:

```typescript
const snapshot = await app.getState(config);

console.log(snapshot.values);       // current state values
console.log(snapshot.next);         // agla node jo chalega (jaise ["humanApproval"])
console.log(snapshot.tasks);        // pending tasks, including interrupts
```

Isse tum ek **admin dashboard** bana sakte ho jo dikhaye "ye 15 refund requests pending human approval hain" — bina graph ko resume kiye, sirf uski state read karke.

## State Ko Manually Edit Karna: `updateState()`

Kabhi human ko sirf approve/reject nahi, direct state ke fields edit karne dene hote hain (jaise QA/debugging ke liye, ya kisi node ko skip karke aage badhna ho):

```typescript
await app.updateState(
  config,
  { refundAmount: 3000 }, // partial update, jaise koi node return karta hai
  "analyze" // optional: "as if" ye update "analyze" node se aaya
);

// Ab agla invoke(null, config) us updated state se aage chalega
await app.invoke(null, config);
```

---

## Static Interrupts: `interruptBefore` / `interruptAfter`

Upar wale `interrupt()` **dynamic** hai — code ke andar conditionally decide hota hai. LangGraph ek **static** version bhi deta hai — compile time pe fix breakpoints:

```typescript
const app = refundGraph.compile({
  checkpointer,
  interruptBefore: ["humanApproval"], // is node se pehle hamesha ruk jao
  interruptAfter: ["processDecision"], // is node ke baad hamesha ruk jao
});

// Pehla invoke — breakpoint tak chalega
await app.invoke(input, config);

// Resume — null pass karo taaki wahi state se aage chale
await app.invoke(null, config);
```

> [!warning]
> Static interrupts (`interruptBefore`/`interruptAfter`) **debugging ke liye** achhe hain — jaise breakpoints step-through karna. Lekin **real human-in-the-loop workflows ke liye `interrupt()` function use karo**, static interrupts nahi — kyunki `interrupt()` tumhe payload surface karne, conditional logic (sirf high-value refunds pe rukna), aur structured resume values dene deta hai. Static interrupts hardcoded hote hain aur runtime data pass nahi kar sakte.

---

## Gotcha: Node Re-runs from the Start on Resume!

Ye sabse important aur sabse zyada confuse karne wala gotcha hai: **jab tum resume karte ho, poora node function firse chalta hai shuru se — sirf `interrupt()` ka return value memoized rehta hai.**

Matlab agar `interrupt()` se pehle koi side-effect hai (DB write, API call, email), wo **dobara chalega** jab resume hoga:

```typescript
// ❌ GALAT — resume hone pe ye email dobara bhejega!
async function badNode(state: State) {
  await sendEmail(state.customerEmail, "Review request bheja gaya");  // side effect!
  const approved = interrupt("Approve karo?");
  return { approved };
}

// ✅ SAHI — side effect ko interrupt() ke BAAD rakho (sirf tab chalega jab
// resume ho chuka ho, ek hi baar)
async function goodNode(state: State) {
  const approved = interrupt("Approve karo?");

  if (approved) {
    await sendEmail(state.customerEmail, "Aapka refund approve ho gaya");
  }
  return { approved };
}

// ✅ AGAR interrupt() se pehle side effect zaruri hai, to use IDEMPOTENT banao
async function alsoGoodNode(state: State) {
  // upsert = safe re-run, duplicate record nahi banega
  await db.upsertRefundRequest({ id: state.requestId, status: "pending_review" });

  const approved = interrupt("Approve karo?");
  return { approved };
}
```

> [!tip]
> Rule of thumb: **`interrupt()` ke pehle sirf idempotent operations (upsert, read) rakho. Non-idempotent side effects (send email, charge payment, delete record) hamesha `interrupt()` ke BAAD likho.**

---

## Production Considerations

| Concern | Kya karo |
|---|---|
| **Persistent checkpointer** | `MemorySaver` sirf dev/testing ke liye — process restart pe sab pending interrupts lost ho jaate hain. Production mein `@langchain/langgraph-checkpoint-postgres` ka `PostgresSaver`, ya SQLite/Redis-backed checkpointer use karo, jisse server restart ke baad bhi pending human reviews safe rahein |
| **Notification** | Insaan ko pata kaise chalega ki uska review pending hai? `interrupt()` khud koi notification nahi bhejta — tumhe alag se Slack message, email, ya push notification bhejni hogi jab `__interrupt__` mile |
| **Timeout / expiry** | Agar koi insaan 3 din tak review nahi karta, kya karna hai? Ek background job rakho jo purani pending threads check kare aur auto-reject / escalate kare |
| **Authorization** | Sirf authorized log hi kisi specific thread ko resume kar paayein — `thread_id` ke saath user permissions bhi check karo apne API layer mein (chapter 21 mein API server pattern dekhenge) |
| **Audit trail** | Kisne kab kya decision liya — ye state mein hi store karo (`humanDecision`, `reviewedBy`, `reviewedAt`) taaki compliance ke liye trace mile |
| **Idempotency** | Upar wala gotcha yaad rakho — `interrupt()` se pehle sirf idempotent operations |
| **Concurrent resumes** | Same `thread_id` ko do jagah se ek saath resume mat karne do — race condition ban sakti hai. Application layer mein lock lagao (jaise "review already in progress" flag) |

> [!info]
> Postgres checkpointer setup ka rough idea:
> ```typescript
> import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
>
> const checkpointer = PostgresSaver.fromConnString(
>   "postgresql://user:password@localhost:5432/mydb"
> );
> await checkpointer.setup(); // required tables banata hai pehli baar
>
> const app = graph.compile({ checkpointer });
> ```
> Isse tumhare pending human-approvals database mein safe rehte hain — chahe server 10 baar restart ho jaaye.

---

## Common Mistakes

1. **Checkpointer bhoolna** — `interrupt()` bina checkpointer ke compile kiye error throw karega. `interrupt()` use karne se pehle hamesha `.compile({ checkpointer })` check karo.
2. **`thread_id` badalna resume ke waqt** — agar resume karte waqt alag `thread_id` diya, LangGraph ko koi paused state nahi milegi, aur wo fresh run start kar dega.
3. **`MemorySaver` ko production mein use karna** — server restart hote hi saare pending human reviews permanently lost ho jaate hain.
4. **Side effects `interrupt()` se pehle likhna** — upar discuss kiya gotcha, duplicate emails/payments ban sakte hain.
5. **`result.__interrupt__` check na karna** — agar tum har baar sirf final result expect karte ho aur `__interrupt__` handle nahi karte, tumhara app "silently stuck" lagega jabki graph actually paused hai, waiting for input.

---

## Key Takeaways

- **Human-in-the-Loop (HITL)** = agent ko beech mein pause karna, insaan ka input/approval lena, aur exact usi point se resume karna — high-risk actions (payments, refunds, deletes, emails) ke liye zaruri
- HITL do cheezon pe based hai: **checkpointer** (state persistence, `thread_id` ke against) aur **`interrupt()`** function (graph ko pause karke payload surface karna)
- `MemorySaver` dev ke liye theek hai; **production mein persistent checkpointer** (`PostgresSaver` waghera) chahiye, warna restart pe pending reviews lost ho jaate hain
- Resume karne ke liye `new Command({ resume: value })` use karo — `value` wahi ban jaata hai jo `interrupt()` call se return hota hai — **same `thread_id`** ke saath
- Patterns: simple approve/reject, content edit (human edited text return karna), tool-call review (continue/update/feedback), sequential multiple interrupts (loop jab tak `__interrupt__` na mile)
- `getState()` se paused state inspect karo bina resume kiye; `updateState()` se state ko manually patch karo
- Static interrupts (`interruptBefore`/`interruptAfter`) debugging/breakpoints ke liye hain — real HITL workflows ke liye dynamic `interrupt()` use karo
- **Sabse important gotcha**: resume hone pe poora node **firse shuru se chalta hai** — `interrupt()` se pehle sirf idempotent operations rakho, non-idempotent side effects hamesha uske baad
- Production mein notification, timeout/expiry, authorization, audit trail, aur concurrent-resume protection — ye sab explicitly design karne padte hain, LangGraph khud inhe handle nahi karta
- Agla chapter (**Subgraphs**) dikhayega ki complex graphs ko chhote, reusable graphs mein kaise todte hain — jisme HITL bhi nested subgraphs ke andar kaam karta hai
