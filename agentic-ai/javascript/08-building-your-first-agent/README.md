# Building Your First Agent

🟡 Intermediate

## Kya hota hai?

Ab tak humne dekha — chat models (Chapter 2), prompts (Chapter 3), structured output (Chapter 4), chains/LCEL (Chapter 5), memory (Chapter 6), aur tools (Chapter 7). Sab pieces ready hain. Ye chapter un sab ko jodkar tumhara **pehla actual agent** banayega.

Pehle samjho farak kya hai ek "chain" aur ek "agent" mein:

- **Chain** — tumne khud hi fixed order likha hai: "pehle prompt banao → phir LLM ko bhejo → phir output parse karo." Flow hardcoded hai, LLM sirf ek step mein content generate karta hai.
- **Agent** — LLM khud decide karta hai ki **kaunsa step next lena hai**, based on jo abhi tak hua hai. Kabhi wo ek tool call karega, uska result dekhega, phir decide karega ki dobara tool call karna hai ya final answer dena hai.

Socho Zomato ka ek customer support chat hai jaha customer poochta hai:

> "Mera order ORD123 kaha hai aur agar late hua to kitna refund milega?"

Ye ek single, fixed chain se solve nahi hoga — kyunki system ko pehle `get_order_status` tool call karna padega, uska result dekhna padega ("out_for_delivery, 45 min late"), phir us result ke basis par `calculate_refund` tool call karna padega, aur tab jaake final human-readable answer banega. Kitne tools call karne hain, kis order mein, kaunse arguments ke saath — ye sab **LLM khud decide karta hai runtime par**. Yehi ek **agent** hai.

> [!info]
> Is pattern ko **ReAct** (Reason + Act) kehte hain — LLM "reason" karta hai (sochta hai next step kya hona chahiye), phir "act" karta hai (tool call karta hai), phir observation dekhta hai, aur loop repeat hota hai jab tak final answer nahi mil jata.

## Kyun zaruri hai in agent-building?

Ye poore course ka turning point hai. Chapter 1-7 tak humne "building blocks" seekhe. Ye chapter pehli baar dikhayega ki ek LLM **autonomously multi-step decisions** kaise leta hai — jo agentic AI ka core idea hai. Isके baad Chapter 9 (RAG) aur Chapter 12 onwards (LangGraph) isi foundation par build karenge.

LangChain.js do bade tareeke deta hai agents banane ke:

1. **`AgentExecutor`** (is chapter ka focus) — LangChain ka original, high-level agent runtime. Quick setup, kam boilerplate, single-agent tool-use ke liye perfect.
2. **LangGraph's `createReactAgent`** — newer, graph-based approach jo zyada control deta hai (cycles, human-in-the-loop, persistence). Chapter 12 se aage humein isi par shift karenge.

Dono ka underlying idea same hai (ReAct loop), lekin `AgentExecutor` seekhna zaruri hai kyunki:
- Ye samjhata hai ki agent loop **internally kaam kaise karta hai** (bina is samajh ke, LangGraph "magic" lagega)
- Production codebases mein aaj bhi `AgentExecutor` widely use hota hai simple use-cases ke liye
- Concepts (scratchpad, intermediate steps, max iterations) LangGraph mein bhi wahi rehte hain, bas naam/API change hota hai

---

## Anatomy of an Agent

Ek `AgentExecutor`-based agent ke 4 core pieces hote hain:

| Piece | Role |
|---|---|
| **LLM** | Decision-maker — decide karta hai next action kya ho (tool call ya final answer) |
| **Tools** | Agent ke "hands" — external world se interact karne ke functions (DB lookup, API call, calculator) |
| **Prompt** | Agent ko instructions deta hai + ek special `agent_scratchpad` slot rakhta hai jaha pichle tool calls aur unke results store hote hain |
| **AgentExecutor** | Loop chalata hai: LLM ko call karo → agar tool call chahiye to tool run karo → result ko scratchpad mein daalo → repeat, jab tak LLM final answer na de |

```
┌─────────────────────────────────────────────────────────┐
│                     AgentExecutor Loop                    │
│                                                             │
│   User Input                                               │
│       │                                                     │
│       ▼                                                     │
│   ┌────────┐   "call get_order_status"   ┌───────────┐    │
│   │  LLM   │ ───────────────────────────▶│   Tool    │    │
│   │(reason)│                              │  (act)    │    │
│   └────────┘ ◀─────────────────────────── └───────────┘    │
│       │           observation (result)                     │
│       │                                                     │
│       │  (loop repeats until LLM decides it has enough      │
│       │   info to answer)                                   │
│       ▼                                                     │
│   Final Answer                                              │
└─────────────────────────────────────────────────────────┘
```

Bilkul waise hi jaise ek dabbawala apne route decide karta hai real-time traffic dekh kar — fixed script follow nahi karta, har stop par observation leta hai (traffic jam hai kya?) aur us hisaab se next decision leta hai.

---

## Setup

```bash
npm install langchain @langchain/openai @langchain/core zod dotenv
```

```bash
# .env
OPENAI_API_KEY=sk-...
```

> [!info]
> `createToolCallingAgent` aur `AgentExecutor` `langchain` package se aate hain (not `@langchain/core`). `@langchain/openai` model provider ke liye chahiye, `zod` tool schemas ke liye.

---

## Step 1: Tools Define Karo

Chapter 7 mein humne `tool()` helper dekha tha. Ab hum ek **Zomato-style customer support agent** banayenge jiske paas 3 tools honge:

```ts
// tools.ts
import { tool } from "@langchain/core/tools";
import { z } from "zod";

// Mock "database" — real app mein ye actual DB/API call hoga
const ORDERS_DB: Record<string, { status: string; delayMinutes: number }> = {
  ORD123: { status: "out_for_delivery", delayMinutes: 45 },
  ORD456: { status: "delivered", delayMinutes: 0 },
  ORD789: { status: "preparing", delayMinutes: 10 },
};

export const getOrderStatusTool = tool(
  async ({ orderId }) => {
    const order = ORDERS_DB[orderId];
    if (!order) {
      return JSON.stringify({ error: `Order ${orderId} nahi mila.` });
    }
    return JSON.stringify({
      orderId,
      status: order.status,
      delayMinutes: order.delayMinutes,
    });
  },
  {
    name: "get_order_status",
    description:
      "Zomato order ka current status aur delay (agar koi hai) check karta hai, order ID se.",
    schema: z.object({
      orderId: z.string().describe("Order ID, jaise 'ORD123'"),
    }),
  }
);

export const calculateRefundTool = tool(
  async ({ delayMinutes, orderAmount }) => {
    // Business rule: 30+ min delay => 20% refund, 60+ min => 50% refund
    let refundPercent = 0;
    if (delayMinutes >= 60) refundPercent = 50;
    else if (delayMinutes >= 30) refundPercent = 20;

    const refundAmount = (orderAmount * refundPercent) / 100;
    return JSON.stringify({ refundPercent, refundAmount });
  },
  {
    name: "calculate_refund",
    description:
      "Order ke delay (minutes) aur order amount ke basis par refund amount calculate karta hai.",
    schema: z.object({
      delayMinutes: z.number().describe("Order kitne minutes late hua"),
      orderAmount: z.number().describe("Order ka total amount in INR"),
    }),
  }
);

export const getWeatherTool = tool(
  async ({ city }) => {
    // Mock weather API
    const weather: Record<string, string> = {
      Mumbai: "heavy rain",
      Bangalore: "clear skies",
      Delhi: "foggy",
    };
    return JSON.stringify({ city, condition: weather[city] ?? "unknown" });
  },
  {
    name: "get_weather",
    description:
      "Kisi city ka current weather condition batata hai — delivery delays explain karne ke liye useful.",
    schema: z.object({
      city: z.string().describe("City ka naam, jaise 'Mumbai'"),
    }),
  }
);

export const tools = [getOrderStatusTool, calculateRefundTool, getWeatherTool];
```

> [!tip]
> Tool ka `description` field agent ke liye sabse important cheez hai — LLM isi ko padhkar decide karta hai kaunsa tool kab use karna hai. Vague description ("gets data") se agent confuse hoga; specific description ("Zomato order ka status check karta hai, order ID se") se agent confidently sahi tool choose karega.

---

## Step 2: Agent Prompt Banao

Agent prompt normal chat prompt jaisa hi hai, bas ek extra special placeholder chahiye: **`agent_scratchpad`**. Yaha LangChain automatically pichle tool calls aur unke results inject karta hai, taaki LLM ko "memory" rahe ki wo already kya kar chuka hai is conversation turn ke andar.

```ts
// prompt.ts
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";

export const agentPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `Tum Zomato ke ek helpful customer support agent ho.
Customer ke order-related sawalon ka jawab do — status check karo, refund calculate karo, weather-related delays explain karo.
Hamesha tools use karo actual data lene ke liye — kabhi bhi order status ya refund amount guess mat karo.
Jawab concise aur friendly rakho, jaise ek real support agent deta hai.`,
  ],
  new MessagesPlaceholder("chat_history"),
  ["human", "{input}"],
  new MessagesPlaceholder("agent_scratchpad"),
]);
```

> [!warning]
> `agent_scratchpad` placeholder **miss mat karo** — agar ye prompt mein nahi hoga, to `createToolCallingAgent` runtime error dega ya agent tool-call results ko track nahi kar payega, aur infinite confusion ho sakti hai.

`chat_history` optional hai (agar multi-turn conversation support karni hai — Chapter 6 ka memory yaha plug hota hai), lekin single-turn agent ke liye bhi ise empty array `[]` pass kar sakte ho.

---

## Step 3: Agent Aur AgentExecutor Banao

```ts
// agent.ts
import { ChatOpenAI } from "@langchain/openai";
import { createToolCallingAgent, AgentExecutor } from "langchain/agents";
import { tools } from "./tools";
import { agentPrompt } from "./prompt";

const model = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0, // agents ke liye deterministic behavior better hai
});

export async function buildAgentExecutor() {
  // Step A: "agent" banao — ye decide karta hai next action kya ho
  const agent = await createToolCallingAgent({
    llm: model,
    tools,
    prompt: agentPrompt,
  });

  // Step B: AgentExecutor banao — ye actual loop chalata hai
  const agentExecutor = new AgentExecutor({
    agent,
    tools,
    verbose: true,              // console mein har step print karega (debugging ke liye great)
    maxIterations: 6,           // infinite loop se bachne ke liye hard limit
    returnIntermediateSteps: true, // debugging/logging ke liye tool calls ka trace milega
  });

  return agentExecutor;
}
```

**Kya ho raha hai yaha:**

- `createToolCallingAgent` LLM ko tools ke saath "bind" karta hai (internally `model.bindTools(tools)` jaisa kaam) aur ek `Runnable` return karta hai jo decide karta hai: "is input ke liye, kaunsa tool call karna chahiye (agar koi) ya seedha answer dena chahiye."
- `AgentExecutor` is decision-making Runnable ko ek **loop** mein wrap karta hai — jab tak agent tool calls maangta rahe, executor unhe run karta rahega aur results wapas feed karta rahega, jab tak final answer na aa jaye ya `maxIterations` hit na ho jaye.

---

## Step 4: Agent Run Karo

```ts
// main.ts
import "dotenv/config";
import { buildAgentExecutor } from "./agent";

async function main() {
  const agentExecutor = await buildAgentExecutor();

  const result = await agentExecutor.invoke({
    input:
      "Mera order ORD123 kaha hai? Agar late hua hai to mujhe kitna refund milega, order amount tha ₹450.",
    chat_history: [],
  });

  console.log("\n=== FINAL ANSWER ===");
  console.log(result.output);

  console.log("\n=== INTERMEDIATE STEPS (tool calls) ===");
  console.log(JSON.stringify(result.intermediateSteps, null, 2));
}

main();
```

### Expected execution trace (`verbose: true` ka output, simplified)

```
> Entering new AgentExecutor chain...

Invoking: `get_order_status` with `{"orderId":"ORD123"}`
{"orderId":"ORD123","status":"out_for_delivery","delayMinutes":45}

Invoking: `calculate_refund` with `{"delayMinutes":45,"orderAmount":450}`
{"refundPercent":20,"refundAmount":90}

Aapka order ORD123 abhi "out for delivery" hai aur 45 minute late chal raha hai.
Is delay ke basis par, aapko ₹90 (20%) ka refund milega.

> Finished chain.
```

**Yaha exactly kya hua, step-by-step:**

1. LLM ne input dekha, socha "mujhe pehle order status pata karna hoga" → `get_order_status` tool call kiya
2. Executor ne tool run kiya, result (`45 min delay`) wapas LLM ko diya (scratchpad mein add hua)
3. LLM ne socha "ab mujhe refund calculate karna hai is delay ke basis par" → `calculate_refund` tool call kiya
4. Executor ne wo bhi run kiya, result LLM ko wapas diya
5. Ab LLM ke paas dono results the — usne decide kiya ki **ab aur tool calls ki zarurat nahi**, aur final human-readable answer generate kiya
6. `AgentExecutor` ne loop stop kiya kyunki LLM ne is baar koi tool call nahi maanga (matlab final answer aa gaya)

Ye poora decision-making — kaunsa tool, kis order mein, kab rukna hai — LLM ne khud kiya. Humne sirf tools available karaye the.

---

## Streaming Agent Steps

Production UI mein (jaise ek chat widget), user ko wait nahi karana chahiye poore agent loop ke complete hone tak — unhe real-time progress dikhana behtar hota hai ("Checking order status...", "Calculating refund..."). `AgentExecutor.stream()` isi ke liye hai:

```ts
async function streamAgent(input: string) {
  const agentExecutor = await buildAgentExecutor();
  const eventStream = await agentExecutor.stream({ input, chat_history: [] });

  for await (const chunk of eventStream) {
    if (chunk.actions) {
      for (const action of chunk.actions) {
        console.log(`🔧 Calling tool: ${action.tool} with`, action.toolInput);
      }
    }
    if (chunk.steps) {
      for (const step of chunk.steps) {
        console.log(`✅ Tool result:`, step.observation);
      }
    }
    if (chunk.output) {
      console.log(`💬 Final answer:`, chunk.output);
    }
  }
}
```

Ye pattern Zomato ke live order-tracking screen jaisa hai — user ko har intermediate update dikhta hai ("order confirmed" → "preparing" → "out for delivery"), poore process ka silent wait nahi karna padta.

---

## Different Agent Types (Context)

`createToolCallingAgent` sabse modern aur recommended approach hai, lekin LangChain.js mein aur bhi agent constructors hain jo tumhe purane codebases mein milenge:

| Constructor | Kaise kaam karta hai | Status |
|---|---|---|
| `createReactAgent` (from `langchain/agents`) | Text-based ReAct — LLM ko "Thought/Action/Action Input/Observation" format mein prompt karke response parse karta hai | Legacy — sirf un models ke liye jo native tool-calling support nahi karte |
| `createOpenAIFunctionsAgent` | OpenAI ke purane `functions` API use karta hai | Deprecated — `createOpenAIToolsAgent` se replace ho chuka hai |
| `createOpenAIToolsAgent` | OpenAI ke `tools` API use karta hai (multiple parallel tool calls support) | OpenAI-specific, still valid |
| `createStructuredChatAgent` | Multi-input tools ke liye text-based approach, non-tool-calling models ke liye | Legacy |
| **`createToolCallingAgent`** | **Provider-agnostic** — kisi bhi model ke saath kaam karta hai jo native tool-calling support karta ho (OpenAI, Anthropic, Google, etc.) | **Recommended default** |

> [!tip]
> **Rule of thumb**: Naya code likhte waqt hamesha `createToolCallingAgent` use karo, jab tak koi specific legacy reason na ho. Ye sabse reliable hai kyunki model ke **native structured tool-calling** capability par depend karta hai, text-parsing ki fragility par nahi.

---

## Error Handling aur Gotchas

### 1. Tool ke andar errors ko throw mat karo — return karo

Agar tool internally fail hota hai aur tum `throw` karte ho, poora `AgentExecutor.invoke()` crash ho jayega. Better approach: error ko ek string/object ki tarah **return** karo, taaki LLM khud dekh ke decide kare ki kya karna hai (retry, different approach, ya user ko bata dena ki nahi ho paya):

```ts
export const getOrderStatusTool = tool(
  async ({ orderId }) => {
    try {
      const order = ORDERS_DB[orderId];
      if (!order) {
        return JSON.stringify({ error: `Order ${orderId} exist nahi karta.` });
      }
      return JSON.stringify(order);
    } catch (err) {
      // LLM ko error dikhao, crash mat karo
      return JSON.stringify({ error: "Order lookup service abhi down hai, thodi der baad try karein." });
    }
  },
  { /* ... schema ... */ }
);
```

LLM is error message ko dekh kar khud decide karega ki user ko kya bolna hai — "system down hai, thodi der baad try karein" jaisa graceful response de dega, poora chat crash nahi hoga.

### 2. `maxIterations` hamesha set karo

Agar agent kisi loop mein phas jaye (jaise ek buggy tool jo hamesha same error return kare, aur LLM baar-baar retry karta rahe), bina `maxIterations` ke ye **infinite loop** ban sakta hai — jo tumhara OpenAI bill explode kar dega.

```ts
new AgentExecutor({
  agent,
  tools,
  maxIterations: 6,          // hard stop
  earlyStoppingMethod: "force", // limit hit hone par turant stop karo
});
```

> [!warning]
> Production mein `maxIterations` ko chhota (5-8) rakho jab tak tumhare use-case ko genuinely bahut saare sequential tool calls na chahiye ho. Har iteration ek naya LLM call hai — cost aur latency dono badhate hain.

### 3. Timeout lagao

LLM calls ya tool calls (especially external APIs) kabhi kabhi hang ho sakte hain. Production mein timeout wrap karo:

```ts
import { AgentExecutor } from "langchain/agents";

const result = await Promise.race([
  agentExecutor.invoke({ input, chat_history: [] }),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Agent timed out")), 30_000)
  ),
]);
```

### 4. Vague tool descriptions se galat tool selection

Agar tumhare paas do tools hain jinke descriptions overlap karte hain (jaise "get order info" aur "get order status" — dono jaise same lagte hain), LLM confuse ho sakta hai aur galat tool choose kar sakta hai, ya dono call kar sakta hai unnecessarily. Descriptions ko distinct aur specific rakho.

### 5. Model tool-calling support nahi karta to?

Har model native tool-calling support nahi karta. `createToolCallingAgent` sirf un models ke saath kaam karega jo isko support karte hain (OpenAI GPT-3.5+, Anthropic Claude, Google Gemini, etc.). Agar koi aisa model use kar rahe ho jo support nahi karta, `createReactAgent` (text-based) use karna padega — lekin wo kam reliable hai.

---

## Production Considerations

> [!warning]
> **Cost**: Har agent loop iteration ek poora naya LLM call hai (poore conversation history + scratchpad ke saath, jo har iteration mein badhta jata hai). Ek 4-tool-call agent run ka matlab hai kam se kam 5 LLM calls (4 tool decisions + 1 final answer) — chhoti chat completion nahi, ye **multiply ho jata hai**. High-volume production systems mein isko carefully monitor karo (Chapter 10 — Callbacks & Tracing — isi ke liye hai).

> [!warning]
> **Latency**: Sequential tool calls matlab sequential LLM round-trips — 3 tool calls ka matlab 3x LLM latency + tool execution time. Agar tools independent hain (ek doosre pe depend nahi karte), consider karo ki `createOpenAIToolsAgent` jaisa parallel-tool-calling agent use karo, ya LangGraph mein custom parallel nodes banao (Chapter 13+).

> [!warning]
> **Observability**: Production mein `verbose: true` console logs kaafi nahi hain. Structured tracing chahiye — LangSmith ya custom callbacks (Chapter 10) use karo taaki tum dekh sako production mein agents kya decisions le rahe hain, kaha fail ho rahe hain, aur kitna cost aa raha hai per request.

> [!warning]
> **Guardrails**: Agent ko unrestricted tool access mat do. Jaise agar ek `delete_order` jaisa destructive tool hai, use karne se pehle human confirmation flow add karo (Chapter 16 — Human-in-the-loop — LangGraph mein isko properly handle karta hai). `AgentExecutor` mein ye manually implement karna padega (jaise tool ke andar hi ek "confirmation needed" flag return karke).

---

## AgentExecutor vs LangGraph — Ek Choti Si Jhalak

`AgentExecutor` simple, single-agent, tool-using use-cases ke liye bohot accha hai — jaisa humne abhi banaya. Lekin jaise-jaise requirements complex hoti hain (multiple agents jo collaborate karte hain, human approval steps, conditional branching, state persistence across sessions, retry with custom logic), `AgentExecutor` ka simple "loop until done" model limiting lagne lagta hai.

Chapter 12 se hum **LangGraph.js** seekhna start karenge, jo isi ReAct pattern ko ek **explicit state graph** ki tarah model karta hai — jaha tum har node aur edge par fine-grained control rakh sakte ho. Achi baat ye hai ki concepts same rehte hain (tools, scratchpad-jaisa state, iteration loop) — bas representation zyada powerful ho jata hai.

```ts
// Preview: same agent, LangGraph.js ke prebuilt helper se (Chapter 12 mein detail milega)
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { tools } from "./tools";

const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });

const graphAgent = createReactAgent({
  llm: model,
  tools,
});

const result = await graphAgent.invoke({
  messages: [{ role: "user", content: "Mera order ORD123 kaha hai?" }],
});
```

Isko abhi run karne ki zarurat nahi hai — bas note karo ki underlying idea (LLM + tools + loop) same hai, chahe tum `AgentExecutor` use karo ya LangGraph.

---

## Full Runnable Example (Sab Kuch Ek Saath)

```ts
// index.ts
import "dotenv/config";
import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { createToolCallingAgent, AgentExecutor } from "langchain/agents";

// ---- 1. Tools ----
const ORDERS_DB: Record<string, { status: string; delayMinutes: number }> = {
  ORD123: { status: "out_for_delivery", delayMinutes: 45 },
};

const getOrderStatusTool = tool(
  async ({ orderId }) => {
    const order = ORDERS_DB[orderId];
    if (!order) return JSON.stringify({ error: `Order ${orderId} nahi mila.` });
    return JSON.stringify({ orderId, ...order });
  },
  {
    name: "get_order_status",
    description: "Order ka status aur delay batata hai, order ID se.",
    schema: z.object({ orderId: z.string() }),
  }
);

const calculateRefundTool = tool(
  async ({ delayMinutes, orderAmount }) => {
    let refundPercent = 0;
    if (delayMinutes >= 60) refundPercent = 50;
    else if (delayMinutes >= 30) refundPercent = 20;
    return JSON.stringify({ refundPercent, refundAmount: (orderAmount * refundPercent) / 100 });
  },
  {
    name: "calculate_refund",
    description: "Delay aur order amount ke basis par refund calculate karta hai.",
    schema: z.object({ delayMinutes: z.number(), orderAmount: z.number() }),
  }
);

const tools = [getOrderStatusTool, calculateRefundTool];

// ---- 2. Prompt ----
const prompt = ChatPromptTemplate.fromMessages([
  ["system", "Tum Zomato ke customer support agent ho. Hamesha tools se real data lo, guess mat karo."],
  new MessagesPlaceholder("chat_history"),
  ["human", "{input}"],
  new MessagesPlaceholder("agent_scratchpad"),
]);

// ---- 3. Agent + Executor ----
async function main() {
  const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });

  const agent = await createToolCallingAgent({ llm: model, tools, prompt });

  const agentExecutor = new AgentExecutor({
    agent,
    tools,
    verbose: true,
    maxIterations: 6,
    returnIntermediateSteps: true,
  });

  const result = await agentExecutor.invoke({
    input: "Order ORD123 ka status kya hai, aur agar late hai to ₹450 ke order pe kitna refund banega?",
    chat_history: [],
  });

  console.log("\nFinal Answer:", result.output);
}

main().catch(console.error);
```

Ise `npx tsx index.ts` (ya `ts-node`) se run karo, aur console mein poora agent loop dekhoge — tool calls, observations, aur final answer.

---

## Key Takeaways

- Ek **agent** ek chain se fundamentally alag hai — chain mein flow hardcoded hota hai, agent mein LLM khud runtime par decide karta hai kaunsa step next lena hai.
- **ReAct pattern** (Reason → Act → Observe → repeat) hi agent ka core loop hai — LLM sochta hai, tool call karta hai, result dekhta hai, aur decide karta hai ki aur tool chahiye ya final answer.
- `AgentExecutor` = **LLM + Tools + Prompt** ka combination, ek loop mein wrapped, jo tab tak chalta hai jab tak LLM final answer nahi de deta ya `maxIterations` hit nahi ho jata.
- Agent prompt mein **`agent_scratchpad`** placeholder mandatory hai — yaha tool calls aur unke results track hote hain is conversation turn ke andar.
- `createToolCallingAgent` **recommended default** hai — provider-agnostic hai aur model ke native tool-calling capability use karta hai (text-parsing wale legacy approaches se zyada reliable).
- Tool errors ko `throw` mat karo — unhe **return** karo (string/JSON ki tarah), taaki LLM khud graceful recovery decide kar sake.
- Production mein hamesha `maxIterations`, timeouts, aur cost/latency monitoring rakho — har agent iteration ek poora naya LLM call hai jo cost aur latency dono multiply karta hai.
- `AgentExecutor` simple single-agent use-cases ke liye perfect hai; complex multi-agent/human-in-the-loop/stateful workflows ke liye Chapter 12 se **LangGraph.js** seekhenge, jo yehi ReAct concepts explicit state graph ki tarah model karta hai.
