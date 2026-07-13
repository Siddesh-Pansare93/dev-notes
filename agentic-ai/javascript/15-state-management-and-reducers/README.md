# State Management and Reducers

🟡 Intermediate

## Kya hota hai?

Pichhle chapters mein humne `StateGraph` banaya, nodes likhe, aur conditional edges se routing ki. Har jagah ek cheez baar baar dikhi — **reducer**. Ab time hai isko poori tarah samajhne ka, kyunki yeh LangGraph ka sabse underrated concept hai — agar iski mental model clear nahi hui, to tumhare agents mein weird bugs aayenge jahan state "gayab" ho jaata hai ya "overwrite" ho jaata hai bina wajah ke.

Socho tum Swiggy ke ek group order pe ho — tum, tumhara roommate, aur ek aur dost, teeno apne apne items add kar rahe ho ek hi cart mein. Ab agar Swiggy ka system naive ho aur har baar poora cart replace kar de jab koi item add kare, to sirf last person ka order hi bachega — baaki sab ka data udd jaayega. Lekin Swiggy aisa nahi karta — woh **merge** karta hai: "existing cart + naya item = updated cart". Yeh merge logic hi reducer hai.

LangGraph mein jab multiple nodes (ya parallel branches) same state field ko update karte hain, LangGraph ko pata hona chahiye: **naye value ko purane value ke saath kaise combine karna hai?** Yeh decision reducer function leta hai. Reducer ke bina, LangGraph ka default behavior hota hai — **naya value purana value overwrite kar dega**. Yeh kabhi thik hota hai (jaise `finalAnswer` field), aur kabhi disaster (jaise `messages` array, jahan tumhe purani conversation history khona nahi chahiye).

> [!info]
> Reducer term React/Redux se aata hai — wahi concept: `(state, action) => newState`. LangGraph mein reducer hai: `(currentValue, updateValue) => mergedValue`. Concept same hai, sirf context different hai.

## Kyun zaruri hai?

Agent-building mein state sirf ek simple key-value store nahi hai — yeh **evolving, shared memory** hai jise multiple nodes, parallel branches, aur loops touch karte hain. Reducers zaruri hain kyunki:

1. **Concurrent updates handle karna** — Jab tumhare graph mein parallel nodes (fan-out) same field ko update karte hain, LangGraph ko pata hona chahiye ki dono updates ko kaise combine karein — warna race condition jaisa behavior milega.
2. **Accumulation vs replacement** — Kuch fields accumulate hone chahiye (chat history, search results, logs), kuch replace hone chahiye (current step, final answer, retry flag). Reducer yeh distinction explicitly define karta hai.
3. **Predictability** — Bina reducer samjhe, tumhe nahi pata chalega ki agent "purani state bhool" kyun raha hai ya "duplicate values" kyun aa rahe hain.
4. **LangGraph ke built-in patterns ka foundation** — `MessagesAnnotation`, checkpointing, multi-agent state sharing — yeh sab reducers pe hi bane hain.

> [!warning]
> Yeh sabse common beginner mistake hai: `messages: Annotation<BaseMessage[]>` bina reducer ke define karna. Har node jab naya message return karega, poori purani conversation history **replace** ho jaayegi — sirf last message bachega. Isse agent "amnesia" jaisa behave karega, jaise har turn pe naya customer support agent baat kar raha ho jise pichli conversation yaad hi nahi.

---

## Setup

```bash
npm install @langchain/langgraph @langchain/core zod
```

```typescript
import { Annotation, StateGraph, START, END, messagesStateReducer } from "@langchain/langgraph";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
```

---

## Reducer ka basic anatomy

Har `Annotation` field do cheezein le sakta hai:

```typescript
Annotation<T>({
  reducer: (currentValue: T, updateValue: U) => T,  // merge logic
  default: () => T,                                  // initial value jab graph start ho
})
```

- **`reducer`** — function jo batata hai naye update ko purani value ke saath kaise combine karna hai. Signature: `(existing, update) => merged`.
- **`default`** — factory function jo initial value deta hai jab graph pehli baar chalta hai (agar field explicitly initialize nahi kiya gaya).

Agar tum sirf `Annotation<T>` likhte ho (bina options ke), to default reducer hai:

```typescript
// Default reducer — sirf naye value se replace karo
(existing, update) => update
```

Yeh simple fields ke liye theek hai — jaise `currentStep: Annotation<string>` (jahan tumhe hamesha latest value chahiye, purani nahi).

### Sabse simple example — replace reducer (default)

```typescript
const GraphState = Annotation.Root({
  // No reducer specified => default replace behavior
  userQuery: Annotation<string>,
  currentStep: Annotation<string>,
});

// Node A returns: { currentStep: "searching" }
// Node B returns: { currentStep: "answering" }
// Final state.currentStep = "answering" (replaced, not merged)
```

Yeh bilkul theek hai kyunki `currentStep` ek "point-in-time" value hai — tumhe purane steps ki list nahi chahiye, sirf latest status chahiye. Jaise Swiggy app mein order status sirf ek current stage dikhata hai, na ki saari history ek saath.

---

## Accumulator reducers — jab data collect karna ho

Ab wo case dekhte hain jahan tumhe **history accumulate** karni hai, replace nahi.

```typescript
const GraphState = Annotation.Root({
  userQuery: Annotation<string>,

  // Array concat reducer — naye items ko purani list mein add karo
  searchResults: Annotation<string[]>({
    reducer: (existing, update) => existing.concat(update),
    default: () => [],
  }),

  // Counter reducer — increment karo, replace mat karo
  retryCount: Annotation<number>({
    reducer: (existing, update) => existing + update,
    default: () => 0,
  }),

  // Log accumulator — debugging/observability ke liye
  executionLog: Annotation<string[]>({
    reducer: (existing, update) => [...existing, ...update],
    default: () => [],
  }),
});

type GraphStateType = typeof GraphState.State;
```

Ab dekhte hain yeh kaam kaise karta hai actual nodes mein:

```typescript
async function searchNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  // Node sirf naye results return karta hai, poori list nahi
  const results = await fakeSearchAPI(state.userQuery);
  return {
    searchResults: results,               // reducer isse existing array mein concat karega
    executionLog: [`Searched for: ${state.userQuery}`],
  };
}

async function retryNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  return {
    retryCount: 1,                        // reducer: existing (0) + 1 = 1, phir agli baar 1+1=2, ...
    executionLog: [`Retry attempt started`],
  };
}
```

> [!tip]
> Notice karo — node sirf **delta** (jo naya add karna hai) return karta hai, poora accumulated state nahi. Yeh Redux ke `dispatch(action)` jaisa hai — tum poora naya state nahi bhejte, sirf "yeh hua hai" bhejte ho, aur reducer merge sambhal leta hai.

### Ek practical example — dabbawala tracking system

Zara isko ek real scenario se samjhte hain — Mumbai dabbawala jaisa multi-stage delivery tracking:

```typescript
const DabbaState = Annotation.Root({
  dabbaId: Annotation<string>,

  // Har checkpoint pe naya stop add hota hai, purane stops delete nahi hote
  route: Annotation<{ station: string; timestamp: string }[]>({
    reducer: (existing, update) => existing.concat(update),
    default: () => [],
  }),

  // Total distance — accumulate hoti hai
  totalDistanceKm: Annotation<number>({
    reducer: (existing, update) => existing + update,
    default: () => 0,
  }),

  // Current handler — sirf latest wala chahiye
  currentHandler: Annotation<string>,
});

async function checkpointNode(state: typeof DabbaState.State) {
  return {
    route: [{ station: "Churchgate", timestamp: new Date().toISOString() }],
    totalDistanceKm: 3.5,
    currentHandler: "Dabbawala #42",
  };
}
```

Har checkpoint pe `route` array grow karta hai (poori journey track hoti hai), `totalDistanceKm` accumulate hoti hai, lekin `currentHandler` sirf replace hota hai kyunki tumhe sirf yeh jaanna hai ki **abhi** dabba kiske paas hai.

---

## `messagesStateReducer` — chat history ke liye purpose-built reducer

Conversation-based agents mein sabse common pattern hai `messages` array maintain karna. LangGraph iske liye ek **built-in reducer** deta hai jo sirf concat se zyada smart hai — yeh message IDs ke basis pe messages ko **update/replace bhi kar sakta hai**, jo streaming aur tool-call updates ke liye zaruri hai.

```typescript
import { Annotation, messagesStateReducer } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";

const GraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
});
```

Ya, aur bhi common — LangGraph deta hai ek **pre-built `MessagesAnnotation`** jo yeh exact pattern already implement karta hai:

```typescript
import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";

// MessagesAnnotation already yeh define karta hai:
// { messages: Annotation<BaseMessage[]>({ reducer: messagesStateReducer, default: () => [] }) }

const graph = new StateGraph(MessagesAnnotation)
  .addNode("chatbot", async (state) => {
    const response = await llm.invoke(state.messages);
    return { messages: [response] };   // sirf naya message return karo
  })
  .addEdge(START, "chatbot")
  .addEdge("chatbot", END)
  .compile();
```

`messagesStateReducer` ki special behavior:
- Agar naya message ek **naya `id`** ke saath aata hai, to woh list mein **append** hota hai.
- Agar naya message **same `id`** ke saath aata hai jo already list mein hai, to woh **replace** karta hai (update, not duplicate) — yeh streaming tokens ko progressively build karne ke liye zaruri hai.
- `RemoveMessage` object bhej ke tum specific message ko **delete** bhi kar sakte ho.

```typescript
import { RemoveMessage } from "@langchain/core/messages";

async function clearOldMessages(state: typeof MessagesAnnotation.State) {
  // Pehle 2 messages ko history se hata do (jaise old system prompts)
  const toRemove = state.messages.slice(0, 2).map((m) => new RemoveMessage({ id: m.id! }));
  return { messages: toRemove };
}
```

> [!info]
> Yeh bilkul Swiggy ke order-edit jaisa hai — agar tum ek item ki quantity update karte ho (same item ID), cart mein duplicate nahi banta, existing entry update ho jaati hai. Agar naya item add karte ho (naya ID), woh list mein append hota hai. Aur agar item remove karte ho, woh cart se hat jaata hai. `messagesStateReducer` yehi teeno operations support karta hai.

---

## Custom reducers — apni merge logic likhna

Kabhi kabhi built-in patterns (replace, concat, sum) kaafi nahi hote. Tab tum apna custom reducer likh sakte ho — yeh bas ek plain function hai.

### Example 1: Deduplicated set (jaise unique product IDs cart mein)

```typescript
const CartState = Annotation.Root({
  productIds: Annotation<string[]>({
    reducer: (existing, update) => {
      const merged = new Set([...existing, ...update]);
      return Array.from(merged);
    },
    default: () => [],
  }),
});
```

### Example 2: Object merge (shallow merge, jaise user profile update)

```typescript
interface UserProfile {
  name?: string;
  email?: string;
  preferences?: Record<string, unknown>;
}

const ProfileState = Annotation.Root({
  profile: Annotation<UserProfile>({
    reducer: (existing, update) => ({ ...existing, ...update }),
    default: () => ({}),
  }),
});

async function updateEmailNode(state: typeof ProfileState.State) {
  // Sirf email update karo, baaki profile fields untouched rahenge
  return { profile: { email: "newemail@example.com" } };
}
```

### Example 3: "Last-writer-wins with priority" — jab conflict resolution chahiye

```typescript
type Priority = "low" | "medium" | "high";

interface StatusUpdate {
  status: string;
  priority: Priority;
}

const priorityOrder: Record<Priority, number> = { low: 0, medium: 1, high: 2 };

const AlertState = Annotation.Root({
  currentAlert: Annotation<StatusUpdate | null>({
    reducer: (existing, update) => {
      if (!existing) return update;
      // Sirf tab overwrite karo jab naye update ki priority zyada ya equal ho
      return priorityOrder[update.priority] >= priorityOrder[existing.priority] ? update : existing;
    },
    default: () => null,
  }),
});
```

Yeh useful hai jab parallel nodes ek hi field ko update karne ki koshish karein, lekin tumhe "sabse important" update jeetna chahiye — jaise fraud-detection system mein agar ek node "low risk" bole aur dusra parallel node "high risk" bole, high risk jeetna chahiye chahe woh baad mein aaya ho ya pehle.

### Example 4: Max/Min aggregator (jaise best price track karna — Flipkart price comparison)

```typescript
const PriceState = Annotation.Root({
  bestPrice: Annotation<number>({
    reducer: (existing, update) => Math.min(existing, update),
    default: () => Infinity,
  }),
  bestSeller: Annotation<string>({
    reducer: (existing, update) => update, // simple replace tracked alongside
    default: () => "",
  }),
});

// Multiple parallel nodes har ek alag seller check karte hain
async function checkSellerA(state: typeof PriceState.State) {
  return { bestPrice: 999, bestSeller: "SellerA" };
}
async function checkSellerB(state: typeof PriceState.State) {
  return { bestPrice: 899, bestSeller: "SellerB" };
}
// Reducer automatically sabse kam price rakhega — Flipkart jaisa "best price" comparison
```

---

## Parallel nodes aur reducers — asli power yahin dikhti hai

Reducers ki sabse zaruri application hai **fan-out / parallel execution** mein. Jab ek node se multiple nodes trigger hote hain (parallel branches), aur woh sab same field ko update karte hain, LangGraph reducer use karke unhe deterministically merge karta hai — chahe woh kis order mein complete hon.

```typescript
const ResearchState = Annotation.Root({
  topic: Annotation<string>,
  findings: Annotation<string[]>({
    reducer: (existing, update) => existing.concat(update),
    default: () => [],
  }),
});

const graph = new StateGraph(ResearchState)
  .addNode("searchWeb", async (state) => {
    return { findings: [`Web result for ${state.topic}`] };
  })
  .addNode("searchNews", async (state) => {
    return { findings: [`News result for ${state.topic}`] };
  })
  .addNode("searchAcademic", async (state) => {
    return { findings: [`Academic result for ${state.topic}`] };
  })
  .addNode("combine", async (state) => {
    console.log("All findings:", state.findings); // teeno results yahan honge
    return {};
  })
  .addEdge(START, "searchWeb")
  .addEdge(START, "searchNews")
  .addEdge(START, "searchAcademic")   // teeno parallel start hote hain
  .addEdge("searchWeb", "combine")
  .addEdge("searchNews", "combine")
  .addEdge("searchAcademic", "combine")
  .addEdge("combine", END)
  .compile();
```

Yahan `searchWeb`, `searchNews`, `searchAcademic` — teeno parallel chalte hain (fan-out from `START`). Har ek apna `findings` update return karta hai. LangGraph in teeno updates ko reducer (`concat`) use karke merge karta hai **before** `combine` node run hota hai. Agar reducer nahi hota (default replace), to sirf ek random branch ka result bachta — baaki do "lost" ho jaate.

> [!warning]
> Agar do parallel nodes **same primitive field** (jaise `Annotation<string>` bina reducer ke) ko different values ke saath update karte hain **same super-step mein**, LangGraph error throw karega ("InvalidUpdateError") kyunki usse pata nahi kaunsa value rakhna hai. Yeh intentional hai — silent data loss se better hai crash ho jaana. Fix: ya to reducer define karo, ya architecture change karo taaki conflicting nodes same field ko ek saath update na karein.

```typescript
// YEH CRASH KAREGA agar dono nodes parallel mein chalte hain:
const BadState = Annotation.Root({
  result: Annotation<string>,   // no reducer => replace-only
});
// nodeA returns { result: "A" }, nodeB returns { result: "B" } — same step mein
// => Error: Can't update key "result" concurrently
```

---

## Zod ke saath reducers (recommended production pattern)

Naye LangGraph.js versions mein Zod schemas ko `.langgraph.reducer()` helper ke saath use kar sakte ho — isse validation aur reducer dono mil jaate hain:

```typescript
import { z } from "zod";
import "@langchain/langgraph/zod"; // reducer() extension registers ho jaata hai

const StateSchema = z.object({
  userQuery: z.string(),

  searchResults: z
    .array(z.string())
    .default([])
    .langgraph.reducer((existing, update: string[]) => existing.concat(update)),

  retryCount: z
    .number()
    .default(0)
    .langgraph.reducer((existing, update: number) => existing + update),
});

type State = z.infer<typeof StateSchema>;
```

> [!tip]
> Production apps ke liye Zod recommended hai kyunki tumhe **runtime validation free milta hai** — agar koi node galat type ka data return kare (jaise `string` ki jagah `number`), Zod turant error dega instead of silently corrupt state carry karne ke. Yeh bilkul waise hai jaise Express mein tum request body validate karte ho — agar validation nahi hai, bugs production mein hi pakde jaate hain.

---

## Reducers ke liye ek quick decision table

| Field type | Reducer pattern | Use case |
|---|---|---|
| Latest-value fields (status, current step) | Default replace (`(e, u) => u`) | `currentStep`, `finalAnswer`, `isComplete` |
| Growing lists (history, logs, results) | Concat (`(e, u) => e.concat(u)`) | `searchResults`, `executionLog`, `documents` |
| Chat messages | `messagesStateReducer` | `messages` (built-in, supports add/update/delete via ID) |
| Counters | Sum (`(e, u) => e + u`) | `retryCount`, `tokensUsed`, `apiCallCount` |
| Deduplicated collections | Set-merge | `visitedNodeIds`, `uniqueTags` |
| Partial objects | Shallow merge (`{...e, ...u}`) | `userProfile`, `config` |
| Conflict resolution needed | Custom priority logic | `currentAlert`, `bestOffer` |
| Aggregates (min/max) | `Math.min`/`Math.max` | `bestPrice`, `highestConfidenceScore` |

---

## Common Mistakes aur Gotchas

1. **`messages` field pe reducer bhoolna** — sabse common bug. Bina reducer ke, agent ki har response purani conversation ko delete kar degi. Hamesha `MessagesAnnotation` ya `messagesStateReducer` use karo chat history ke liye.

2. **Reducer ke andar mutation karna** — reducer ko **naya** object/array return karna chahiye, existing ko mutate nahiin karna chahiye:
   ```typescript
   // GALAT — existing array ko mutate kar rahe ho
   reducer: (existing, update) => {
     existing.push(...update);   // side effect!
     return existing;
   }

   // SAHI — naya array return karo
   reducer: (existing, update) => existing.concat(update)
   ```
   Mutation se subtle bugs aate hain, especially checkpointing ke saath (LangGraph state snapshots leta hai — agar tum mutate karte ho, purane snapshots bhi corrupt ho sakte hain kyunki reference same hai).

3. **Unbounded accumulation** — agar `messages` ya `executionLog` array continuously grow karta rahe (jaise ek long-running agent loop mein), token limits aur memory issues aa sakte hain. Production mein **trimming/summarization strategy** rakho (yeh hum Memory chapter mein already dekh chuke hain — `trimMessages` ya periodic summarization).

4. **Reducer mein async/side-effects daalna** — reducer sirf **pure function** hona chahiye (same input => same output, no side effects, no API calls). Agar tumhe async kaam karna hai (DB call, external API), woh node ke andar karo, reducer ke andar nahi.

5. **Default value ko shared reference banana** — `default: () => []` use karo, `default: []` nahi. Agar tum direct value doge (function ki jagah), saare graph invocations same array/object reference share karenge — ek run ka data dusre run mein leak ho sakta hai.
   ```typescript
   // GALAT — shared mutable reference across runs
   Annotation<string[]>({ default: [] })

   // SAHI — har run ko fresh array milta hai
   Annotation<string[]>({ default: () => [] })
   ```

6. **Parallel nodes same non-reducer field update karna** — jaisa upar dikhaya, yeh runtime error deta hai. Design time pe socho: "kya yeh field kabhi parallel update hoga?" Agar haan, reducer zaruri hai.

---

## Production Considerations

- **Checkpointing ke saath interaction**: Jab tum `checkpointer` use karte ho (persistence ke liye — Human-in-the-loop chapter mein detail milega), state snapshots reducers ke through hi build hote hain. Isliye reducers deterministic aur side-effect-free hone chahiye — replay/resume karte waqt same result aana chahiye.
- **Cost/latency**: Agar `messages` array bahut bada ho jaaye (lambi conversation), har LLM call mein poora array bhejna costly hoga. Reducer khud cost control nahi karta — usko trimming logic ke saath combine karo (jaise `trimMessages` node se pehle).
- **Debugging**: Reducers ko **named, testable functions** banao (inline arrow function ki jagah agar complex logic hai), taaki unit test likh sako:
  ```typescript
  export function appendUnique(existing: string[], update: string[]): string[] {
    return Array.from(new Set([...existing, ...update]));
  }
  // Ab isko normal function ki tarah test kar sakte ho, LangGraph ke bina bhi
  ```
- **Type safety**: Reducer ka update type existing type se different ho sakta hai (jaise `existing: number[]`, `update: number` — single item add karne ke liye). TypeScript explicitly annotate karo taaki galat type node se accidentally na aa jaaye.

---

## Key Takeaways

- Reducer ek function hai `(existingValue, update) => mergedValue` — yeh decide karta hai LangGraph state ke har field ko kaise update kare.
- Reducer specify na karo to default behavior hai **replace** — latest-value fields (status, final answer) ke liye theek hai, lekin accumulating data (history, results) ke liye data-loss bug bana sakta hai.
- Common reducer patterns: **replace** (default), **concat** (arrays), **sum** (counters), **shallow merge** (objects), **set-dedupe** (unique collections), **custom priority logic** (conflict resolution).
- Chat messages ke liye hamesha `MessagesAnnotation` ya `messagesStateReducer` use karo — yeh add, ID-based update, aur `RemoveMessage` se delete, teeno support karta hai.
- Reducers **parallel/fan-out nodes** ke liye critical hain — bina reducer ke, concurrent updates same field pe ya to data lose karti hain (silent) ya runtime error dete hain (loud).
- Reducer functions **pure** rakho — koi mutation, koi side-effect, koi async call nahi. Naya value hamesha return karo, existing ko mutate mat karo.
- `default: () => value` use karo (factory function), `default: value` nahi — warna runs ke beech shared-reference bugs aayenge.
- Zod + `.langgraph.reducer()` combo production mein recommended hai — reducer logic ke saath runtime validation bhi milta hai.
