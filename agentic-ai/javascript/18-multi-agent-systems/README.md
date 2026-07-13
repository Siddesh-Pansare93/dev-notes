# Multi-Agent Systems

🔴 Production-grade

## Kya hota hai?

Ab tak humne jo bhi agent banaya — chahe woh chapter 8 wala simple ReAct agent ho ya chapter 13-17 ke LangGraph wale StateGraphs — sab **ek hi agent** the. Ek hi "dimaag" jo saara kaam khud karta tha: sochna, tool call karna, jawaab dena.

Lekin real duniya mein complex kaam ek insaan nahi karta. Socho tumne Swiggy pe order kiya — uske peeche ek nahi, kayi log/systems kaam karte hain: restaurant jo khana banata hai, delivery partner jo pickup karta hai, support team jo complaint handle karti hai, aur ek "dispatcher" system jo decide karta hai ki kaunsa delivery partner kis order ko lega. Har koi apne **specific kaam mein expert** hai, aur koi ek central system (Swiggy ka backend) sabko **coordinate** karta hai.

**Multi-agent system** bilkul yehi hai — ek single mega-agent banane ke bajaye, tum kayi **specialized agents** banate ho (research agent, coding agent, math agent, writer agent, etc.), aur unke beech kaam **route** aur **coordinate** karte ho.

> [!info]
> Multi-agent system koi naya LangGraph primitive nahi hai — yeh ek **architecture pattern** hai jo tum StateGraph, nodes, edges, aur subgraphs (chapter 17) ka use karke banate ho. Isliye yeh chapter naye API introduce nahi karta, balki un tools ko ek proven pattern mein combine karna sikhata hai.

Is chapter mein hum yeh patterns cover karenge:
1. **Kyun ek single agent fail hota hai** complex tasks pe
2. **Supervisor pattern** — ek "manager" agent jo kaam route karta hai
3. **Network / handoff pattern** — agents ek doosre ko directly kaam pass karte hain (`Command`)
4. **Hierarchical teams** — supervisors ke supervisor (nested multi-agent)
5. **Sequential pipeline pattern** — fixed order mein agents chain
6. **Shared vs isolated state** — agents ke beech data kaise flow karta hai
7. Production gotchas — infinite loops, cost, error handling, observability

---

## Kyun zaruri hai? Single agent kyun fail hota hai

Ek single agent ko bohot saare tools aur bohot saari responsibilities de do, to yeh problems aati hain:

1. **Prompt bloat** — agent ke system prompt mein "tum research bhi karo, code bhi likho, math bhi solve karo, emails bhi likho" — itna sab ek prompt mein daalne se LLM confuse hota hai ki abhi kaunsa "mode" mein kaam karna hai.
2. **Tool overload** — agar agent ke paas 30-40 tools hain (search, code executor, calculator, email sender, database query...), to LLM ko har step pe sahi tool choose karna mushil ho jaata hai. Accuracy drop hoti hai.
3. **Context window pollution** — saare tasks ka context ek hi conversation history mein mix ho jaata hai. Research ka noise coding step mein leak hota hai.
4. **No separation of concerns** — agar coding agent ka prompt improve karna hai, to poore mega-agent ka prompt touch karna padta hai — jo research aur math wale part ko bhi accidentally break kar sakta hai.
5. **Debugging nightmare** — jab agent galat jawaab de, pata lagana mushkil hota hai ki galti "research phase" mein hui ya "writing phase" mein — kyunki sab kuch ek hi node/loop mein ho raha hai.

Isiliye Zomato jaisa bada system ek hi "God API" nahi banata jo sab kuch kare — woh microservices banata hai: order-service, payment-service, delivery-service — har ek apna kaam achhe se karta hai, aur ek orchestrator unhe jodta hai. Multi-agent systems isi idea ka AI version hain.

> [!tip]
> Rule of thumb: agar tumhare agent ka system prompt "aur agar user X pooche to Y karo, warna Z karo" jaisi conditions se 50+ lines ka ho gaya hai, ya agent ke paas 10+ unrelated tools hain — yeh signal hai ki tumhe multi-agent architecture mein split karna chahiye.

---

## Setup

```bash
npm install @langchain/langgraph @langchain/core @langchain/openai zod
```

```typescript
import { StateGraph, START, END, Annotation, Command } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { BaseMessage, HumanMessage, AIMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
```

---

## Pattern 1: Supervisor Architecture

Yeh sabse common aur sabse "production-friendly" pattern hai. Idea simple hai:

- Ek **supervisor node** hai jo user ka request dekhta hai aur decide karta hai — "yeh kaam kis specialist agent ko dena chahiye?"
- Har **worker agent** apna specific kaam karta hai aur result wapas supervisor ko deta hai.
- Supervisor decide karta hai — "aur kaam bacha hai ya khatam ho gaya, user ko final jawaab do."

Socho Zomato ka customer support system — pehle ek **triage bot** (supervisor) tumhari query sunta hai, phir decide karta hai: "yeh billing issue hai" → billing team ko bhejo, "yeh delivery issue hai" → delivery team ko bhejo. Team apna kaam karke wapas triage bot ko update deti hai, aur triage bot decide karta hai ki customer ko final reply bhejna hai ya kisi aur team ko bhi involve karna hai.

### State design

```typescript
const SupervisorState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (existing, update) => existing.concat(update),
    default: () => [],
  }),
  // Supervisor yeh field set karega — batata hai next kaun chalega
  next: Annotation<string>({
    reducer: (_existing, update) => update,
    default: () => "",
  }),
});
```

### Worker agents banate hain

Har worker ek chhota, focused agent hai — apne khud ke tools ke saath.

```typescript
const llm = new ChatOpenAI({ model: "gpt-4o", temperature: 0 });

// --- Research agent ---
const searchTool = tool(
  async ({ query }: { query: string }) => {
    // real implementation mein yahan Tavily/SerpAPI call hoga
    return `Search results for "${query}": LangGraph.js is a library for building stateful, multi-actor agent applications.`;
  },
  {
    name: "web_search",
    description: "Search the web for current information",
    schema: z.object({ query: z.string() }),
  }
);

async function researchAgent(state: typeof SupervisorState.State) {
  const researchLlm = llm.bindTools([searchTool]);
  const systemMsg = new SystemMessage(
    "Tum ek research specialist ho. Sirf information dhoondo aur summarize karo. Koi opinion mat do."
  );
  const response = await researchLlm.invoke([systemMsg, ...state.messages]);

  // Agar tool call hai, execute karo (simplified — real code mein ToolNode use karo)
  if (response.tool_calls?.length) {
    const toolCall = response.tool_calls[0];
    const result = await searchTool.invoke(toolCall.args as { query: string });
    return {
      messages: [
        response,
        new ToolMessage({ content: result, tool_call_id: toolCall.id! }),
      ],
    };
  }
  return { messages: [response] };
}

// --- Math agent ---
const calculatorTool = tool(
  async ({ expression }: { expression: string }) => {
    // Production mein safe eval library use karo, raw eval nahi!
    return `Result: ${Function(`"use strict"; return (${expression})`)()}`;
  },
  {
    name: "calculator",
    description: "Evaluate a math expression",
    schema: z.object({ expression: z.string() }),
  }
);

async function mathAgent(state: typeof SupervisorState.State) {
  const mathLlm = llm.bindTools([calculatorTool]);
  const systemMsg = new SystemMessage("Tum ek math specialist ho. Sirf calculations karo.");
  const response = await mathLlm.invoke([systemMsg, ...state.messages]);

  if (response.tool_calls?.length) {
    const toolCall = response.tool_calls[0];
    const result = await calculatorTool.invoke(toolCall.args as { expression: string });
    return {
      messages: [
        response,
        new ToolMessage({ content: result, tool_call_id: toolCall.id! }),
      ],
    };
  }
  return { messages: [response] };
}

// --- Writer agent ---
async function writerAgent(state: typeof SupervisorState.State) {
  const systemMsg = new SystemMessage(
    "Tum ek writing specialist ho. Available information ko ek polished, final answer mein convert karo."
  );
  const response = await llm.invoke([systemMsg, ...state.messages]);
  return { messages: [response] };
}
```

### Supervisor node — routing decision

Supervisor ka kaam hai structured output ke through decide karna ki agla kaun chalega. Yahan `withStructuredOutput` use karna best practice hai — free-text parsing se zyada reliable.

```typescript
const routingSchema = z.object({
  next: z.enum(["researcher", "mathematician", "writer", "FINISH"])
    .describe("Kaun sa agent aage kaam karega, ya kaam khatam ho gaya"),
  reasoning: z.string().describe("Yeh decision kyun li"),
});

async function supervisorNode(state: typeof SupervisorState.State) {
  const routerLlm = llm.withStructuredOutput(routingSchema);

  const systemMsg = new SystemMessage(`Tum ek supervisor ho jo teen agents manage karta hai:
- researcher: web se information dhoondta hai
- mathematician: calculations karta hai
- writer: final polished answer likhta hai

Conversation dekho aur decide karo agla kaun chalega. Agar sab kuch already ho chuka hai
aur ek final answer ready hai, to "FINISH" bolo.`);

  const decision = await routerLlm.invoke([systemMsg, ...state.messages]);

  return { next: decision.next };
}
```

### Graph wire karna

```typescript
const graph = new StateGraph(SupervisorState)
  .addNode("supervisor", supervisorNode)
  .addNode("researcher", researchAgent)
  .addNode("mathematician", mathAgent)
  .addNode("writer", writerAgent)
  .addEdge(START, "supervisor")
  // Har worker apna kaam karke wapas supervisor ke paas jaata hai
  .addEdge("researcher", "supervisor")
  .addEdge("mathematician", "supervisor")
  .addEdge("writer", "supervisor")
  // Supervisor decide karta hai agla kaun — ya khatam
  .addConditionalEdges(
    "supervisor",
    (state) => state.next,
    {
      researcher: "researcher",
      mathematician: "mathematician",
      writer: "writer",
      FINISH: END,
    }
  )
  .compile();
```

```typescript
const result = await graph.invoke({
  messages: [new HumanMessage("LangGraph.js kya hai, aur agar ek agent 3 API calls/sec karta hai to 1 ghante mein kitne calls honge? Final answer likh do.")],
});

console.log(result.messages.at(-1)?.content);
```

**Flow kaise chalega:**
1. `supervisor` dekhta hai — pehle research chahiye → `next: "researcher"`
2. `researcher` LangGraph.js ke baare mein search karta hai, wapas `supervisor` ko
3. `supervisor` dekhta hai — ab math chahiye → `next: "mathematician"`
4. `mathematician` calculation karta hai, wapas `supervisor` ko
5. `supervisor` dekhta hai — ab dono info hai, final answer chahiye → `next: "writer"`
6. `writer` polished answer likhta hai, wapas `supervisor` ko
7. `supervisor` dekhta hai — kaam khatam → `next: "FINISH"` → graph END

> [!tip]
> Supervisor pattern ka sabse bada fayda: **centralized control**. Tumhe pata hota hai har waqt kaun sa agent active hai, aur routing logic ek jagah (supervisor) mein hoti hai. Debugging aur monitoring easy ho jaata hai.

---

## Pattern 2: Network / Handoff Pattern (`Command`)

Supervisor pattern mein control hamesha supervisor ke paas wapas aata hai. Lekin kabhi-kabhi tumhe chahiye ki agents **directly ek doosre ko** kaam handoff karein — bina beech mein wapas jaaye. Jaise ek dabbawala doosre dabbawale ko seedha dabba pass kar deta hai, bina "control office" ko beech mein involve kiye.

LangGraph.js mein iske liye `Command` object hai — yeh ek node ko power deta hai ki woh **state update AND next node dono ek saath return kare**.

```typescript
import { Command } from "@langchain/langgraph";

const NetworkState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (existing, update) => existing.concat(update),
    default: () => [],
  }),
});

async function billingAgent(
  state: typeof NetworkState.State
): Promise<Command> {
  const systemMsg = new SystemMessage(
    `Tum billing specialist ho. Agar query delivery se related hai, "delivery_agent" ko handoff karo.
     Agar tumhare paas jawaab hai, "FINISH" karo.`
  );

  const decisionSchema = z.object({
    answer: z.string().nullable(),
    handoffTo: z.enum(["delivery_agent", "FINISH"]),
  });

  const decision = await llm.withStructuredOutput(decisionSchema).invoke([
    systemMsg,
    ...state.messages,
  ]);

  const goto = decision.handoffTo === "FINISH" ? END : decision.handoffTo;

  return new Command({
    // State update — jaise normal node return karta
    update: {
      messages: [new AIMessage(decision.answer ?? "Delivery team ko forward kar raha hoon...")],
    },
    // Control transfer — seedha batao agla node kaun
    goto,
  });
}

async function deliveryAgent(
  state: typeof NetworkState.State
): Promise<Command> {
  const systemMsg = new SystemMessage(
    `Tum delivery specialist ho. Agar query billing se related hai, "billing_agent" ko handoff karo.
     Agar tumhare paas jawaab hai, "FINISH" karo.`
  );

  const decisionSchema = z.object({
    answer: z.string().nullable(),
    handoffTo: z.enum(["billing_agent", "FINISH"]),
  });

  const decision = await llm.withStructuredOutput(decisionSchema).invoke([
    systemMsg,
    ...state.messages,
  ]);

  const goto = decision.handoffTo === "FINISH" ? END : decision.handoffTo;

  return new Command({
    update: {
      messages: [new AIMessage(decision.answer ?? "Billing team ko forward kar raha hoon...")],
    },
    goto,
  });
}
```

Graph wiring bhi simpler ho jaati hai — kyunki routing logic ab nodes ke andar hai, alag se `addConditionalEdges` ki zaroorat nahi:

```typescript
const networkGraph = new StateGraph(NetworkState)
  .addNode("billing_agent", billingAgent, { ends: ["delivery_agent", END] })
  .addNode("delivery_agent", deliveryAgent, { ends: ["billing_agent", END] })
  .addEdge(START, "billing_agent")
  .compile();
```

> [!info]
> `addNode` ke `ends` option se LangGraph ko batate ho ki yeh node `Command` ke through kaun-kaunse nodes pe jump kar sakta hai. Yeh optional hai lekin graph visualization (`getGraph().drawMermaidPng()`) aur type-safety ke liye recommended hai.

**Supervisor vs Network — kab kya use karein?**

| Aspect | Supervisor | Network (Command) |
|---|---|---|
| Control | Centralized (ek jagah routing decide hoti hai) | Decentralized (har agent khud decide karta hai) |
| Debugging | Easy — ek jagah dekho routing kyun hui | Thoda harder — logic multiple nodes mein spread hai |
| Flexibility | Kam — supervisor ko sab agents ke baare mein pata hona chahiye | Zyada — agents peer-to-peer collaborate kar sakte hain |
| Use case | Clear hierarchy wale tasks (customer support triage) | Collaborative tasks jahan agents ek doosre ko refer karte hain |
| Scaling | Supervisor prompt bada hota jaata hai jaise-jaise agents badhte hain | Har agent sirf apne "neighbors" ke baare mein jaanta hai |

---

## Pattern 3: Hierarchical Teams (Supervisor of Supervisors)

Jaise ek bade company mein CEO directly har employee ko manage nahi karta — CEO teams ke heads (VPs) ko manage karta hai, aur har VP apni team manage karta hai. Bade multi-agent systems mein bhi yeh **hierarchical** structure zaroori ho jaati hai jab agents ki sankhya badh jaaye.

Chapter 17 (Subgraphs) mein jo seekha tha, wahi yahan kaam aata hai — **har team ek subgraph hai**, aur ek top-level supervisor un teams ke beech route karta hai.

```typescript
// ---- Research Team (ek subgraph, jaise chapter 17 mein) ----
const ResearchTeamState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (existing, update) => existing.concat(update),
    default: () => [],
  }),
  next: Annotation<string>({ reducer: (_e, u) => u, default: () => "" }),
});

async function researchTeamSupervisor(state: typeof ResearchTeamState.State) {
  const decision = await llm.withStructuredOutput(
    z.object({ next: z.enum(["search_agent", "summarize_agent", "FINISH"]) })
  ).invoke([
    new SystemMessage("Research team supervisor. search_agent info dhoondta hai, summarize_agent usse summarize karta hai."),
    ...state.messages,
  ]);
  return { next: decision.next };
}

async function searchAgentNode(state: typeof ResearchTeamState.State) {
  const response = await llm.invoke([
    new SystemMessage("Tum search agent ho. Web search karke raw info do."),
    ...state.messages,
  ]);
  return { messages: [response] };
}

async function summarizeAgentNode(state: typeof ResearchTeamState.State) {
  const response = await llm.invoke([
    new SystemMessage("Tum summarizer ho. Info ko crisp bullet points mein summarize karo."),
    ...state.messages,
  ]);
  return { messages: [response] };
}

const researchTeamGraph = new StateGraph(ResearchTeamState)
  .addNode("supervisor", researchTeamSupervisor)
  .addNode("search_agent", searchAgentNode)
  .addNode("summarize_agent", summarizeAgentNode)
  .addEdge(START, "supervisor")
  .addEdge("search_agent", "supervisor")
  .addEdge("summarize_agent", "supervisor")
  .addConditionalEdges("supervisor", (s) => s.next, {
    search_agent: "search_agent",
    summarize_agent: "summarize_agent",
    FINISH: END,
  })
  .compile();

// ---- Writing Team (dusra subgraph) ----
const WritingTeamState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (existing, update) => existing.concat(update),
    default: () => [],
  }),
});

async function writingTeamGraphFn(state: typeof WritingTeamState.State) {
  const response = await llm.invoke([
    new SystemMessage("Tum writing team ho. Final polished document banao."),
    ...state.messages,
  ]);
  return { messages: [response] };
}

const writingTeamGraph = new StateGraph(WritingTeamState)
  .addNode("writer", writingTeamGraphFn)
  .addEdge(START, "writer")
  .addEdge("writer", END)
  .compile();

// ---- Top-level supervisor jo teams ke beech route karta hai ----
const TopState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (existing, update) => existing.concat(update),
    default: () => [],
  }),
  next: Annotation<string>({ reducer: (_e, u) => u, default: () => "" }),
});

async function topSupervisor(state: typeof TopState.State) {
  const decision = await llm.withStructuredOutput(
    z.object({ next: z.enum(["research_team", "writing_team", "FINISH"]) })
  ).invoke([
    new SystemMessage("Tum top-level supervisor ho jo research_team aur writing_team manage karta hai."),
    ...state.messages,
  ]);
  return { next: decision.next };
}

const topGraph = new StateGraph(TopState)
  .addNode("supervisor", topSupervisor)
  // Subgraph ko seedha node ki tarah add kar sakte ho (chapter 17 se)
  .addNode("research_team", researchTeamGraph)
  .addNode("writing_team", writingTeamGraph)
  .addEdge(START, "supervisor")
  .addEdge("research_team", "supervisor")
  .addEdge("writing_team", "supervisor")
  .addConditionalEdges("supervisor", (s) => s.next, {
    research_team: "research_team",
    writing_team: "writing_team",
    FINISH: END,
  })
  .compile();
```

> [!tip]
> Hierarchical pattern ka fayda **modularity** hai — har team apna khud ka state, apne khud ke tools, apna khud ka testing suite rakh sakti hai. Naya team add karna matlab bas ek naya subgraph likho aur top supervisor ke routing options mein add kar do. Bade production systems (10+ agents) mein yeh pattern zaruri ho jaata hai warna ek flat supervisor ka prompt unmanageable ho jaata hai.

---

## Pattern 4: Sequential Pipeline

Har multi-agent system mein dynamic routing ki zaroorat nahi hoti. Kabhi-kabhi kaam ka order **fixed** hota hai — jaise IRCTC pe ticket booking: pehle availability check, phir payment, phir confirmation — order kabhi nahi badalta.

Aise cases mein supervisor ka overhead (ek extra LLM call har step ke baad "agla kaun?" decide karne ke liye) waste hai. Seedha fixed edges use karo:

```typescript
const PipelineState = Annotation.Root({
  topic: Annotation<string>,
  research: Annotation<string>({ reducer: (_e, u) => u, default: () => "" }),
  draft: Annotation<string>({ reducer: (_e, u) => u, default: () => "" }),
  finalContent: Annotation<string>({ reducer: (_e, u) => u, default: () => "" }),
});

async function researchStep(state: typeof PipelineState.State) {
  const response = await llm.invoke(`Research this topic in 3 bullet points: ${state.topic}`);
  return { research: response.content as string };
}

async function draftStep(state: typeof PipelineState.State) {
  const response = await llm.invoke(
    `Is research ke basis pe ek draft likho:\n${state.research}`
  );
  return { draft: response.content as string };
}

async function editStep(state: typeof PipelineState.State) {
  const response = await llm.invoke(
    `Is draft ko polish karo, grammar aur clarity improve karo:\n${state.draft}`
  );
  return { finalContent: response.content as string };
}

const pipelineGraph = new StateGraph(PipelineState)
  .addNode("researcher", researchStep)
  .addNode("drafter", draftStep)
  .addNode("editor", editStep)
  // Fixed order — koi routing decision nahi, seedhe edges
  .addEdge(START, "researcher")
  .addEdge("researcher", "drafter")
  .addEdge("drafter", "editor")
  .addEdge("editor", END)
  .compile();
```

Yeh **90% cheaper aur faster** hai supervisor pattern se, kyunki har step pe ek extra "routing" LLM call nahi lag rahi. Jab bhi order fixed pata ho, sequential pipeline choose karo — multi-agent ka matlab hamesha "dynamic routing" nahi hota.

---

## Parallel Multi-Agent — `Send` API

Kabhi tumhe multiple agents **parallel** mein chalane hain — jaise 3 alag research agents 3 alag sources pe simultaneously kaam karein, phir results combine ho. Iske liye `Send` API use hota hai (fan-out pattern).

```typescript
import { Send } from "@langchain/langgraph";

const FanOutState = Annotation.Root({
  sources: Annotation<string[]>,
  findings: Annotation<string[]>({
    reducer: (existing, update) => existing.concat(update),
    default: () => [],
  }),
});

// Dispatcher node — dynamically decide karta hai kitne parallel workers spawn karne hain
function dispatchToSources(state: typeof FanOutState.State) {
  return state.sources.map(
    (source) => new Send("researchOneSource", { source })
  );
}

async function researchOneSource(state: { source: string }) {
  const response = await llm.invoke(`Research about: ${state.source}`);
  return { findings: [response.content as string] };
}

const fanOutGraph = new StateGraph(FanOutState)
  .addNode("researchOneSource", researchOneSource)
  .addConditionalEdges(START, dispatchToSources, ["researchOneSource"])
  .addEdge("researchOneSource", END)
  .compile();

const result = await fanOutGraph.invoke({
  sources: ["Wikipedia", "official docs", "GitHub issues"],
  findings: [],
});
// result.findings mein teeno sources ke findings parallel collect ho jaayenge
```

Yeh Zomato ke restaurant-matching jaisa hai — jab tum order karte ho, Zomato ek saath 5-6 nearby restaurants ko notify karta hai ("kaun accept karega?") instead of ek-ek karke poochne ke. Jo pehle available hai, woh le leta hai. `Send` API isi tarah ka **fan-out, fan-in** pattern LangGraph mein enable karta hai.

---

## Shared State vs Isolated State

Multi-agent design karte waqt sabse important decision hai: **agents apna state share karenge ya alag rakhenge?**

### Shared state (jo humne abhi tak dekha)
Sab agents ek hi `messages` array padhte-likhte hain. Simple hai, lekin **context pollution** ka risk hai — research agent ka verbose output writer agent ke context mein bhi chala jaata hai, jo confuse kar sakta hai.

### Isolated state with explicit handoff
Har agent (ya team) apna khud ka state rakhta hai, aur sirf **zaroori summary** parent ko wapas jaati hai — poora conversation history nahi.

```typescript
const IsolatedTeamState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (existing, update) => existing.concat(update),
    default: () => [],
  }),
});

async function isolatedResearchTeam(state: typeof TopState.State) {
  // Sirf latest user request pass karo, poori history nahi
  const lastUserMsg = state.messages.filter((m) => m._getType() === "human").at(-1);

  const teamResult = await researchTeamGraph.invoke({
    messages: [lastUserMsg!],
  });

  // Sirf summarized result wapas top-level state mein daalo
  const summary = teamResult.messages.at(-1)?.content as string;
  return { messages: [new AIMessage(`[Research Team]: ${summary}`)] };
}
```

> [!warning]
> Shared state jitna simple lagta hai, utna hi **token cost** badhata hai — kyunki har agent ki call mein poori conversation history bhi ja rahi hoti hai. 5 agents wale system mein agar history 20 messages tak pahunch gayi, to har agent call mein woh saare 20 messages tokens consume karenge. Production mein isolated state + summarization pattern se cost significantly kam ho sakti hai.

---

## Production Considerations

### 1. Infinite loops se bacho

Supervisor/network patterns mein agar routing logic buggy hai, agents ek doosre ko infinitely handoff kar sakte hain (`billing_agent` → `delivery_agent` → `billing_agent` → ...). Hamesha **recursion limit** set karo:

```typescript
const result = await graph.invoke(
  { messages: [new HumanMessage("...")] },
  { recursionLimit: 15 } // default 25 hai, apne use-case ke hisaab se tune karo
);
```

Aur ek "max handoff counter" state mein rakhna bhi accha idea hai:

```typescript
const SafeState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (existing, update) => existing.concat(update),
    default: () => [],
  }),
  handoffCount: Annotation<number>({
    reducer: (existing, update) => existing + update,
    default: () => 0,
  }),
});

// Har handoff node mein: agar handoffCount > 5, force FINISH karo
```

### 2. Cost aur latency

Har agent ek separate LLM call hai. 4-agent supervisor system mein ek simple query bhi **5-6 LLM calls** consume kar sakti hai (1 routing + har agent ka apna call). Isse cost aur latency dono badhte hain.

- Chhote/simple queries ke liye lightweight model (jaise `gpt-4o-mini`) supervisor ke liye use karo, aur bade reasoning wale kaam ke liye hi `gpt-4o` jaisa bada model
- Agar order fixed hai, sequential pipeline use karo (routing overhead skip)
- Cache karo jo repeat ho sakta hai (chapter 10 ke observability tools se track karo kahan duplicate calls ho rahe hain)

### 3. Error handling — ek agent fail ho to?

Agar `researchAgent` timeout ho jaaye ya tool call fail ho, poora graph crash nahi hona chahiye.

```typescript
async function safeResearchAgent(state: typeof SupervisorState.State) {
  try {
    return await researchAgent(state);
  } catch (error) {
    return {
      messages: [
        new AIMessage(
          "Research step fail ho gaya. Available information ke saath aage badh rahe hain."
        ),
      ],
    };
  }
}
```

> [!warning]
> Multi-agent systems mein failure ek jagah se poore system mein cascade ho sakta hai — agar supervisor ka structured output parsing fail hoti hai (LLM ne invalid enum value diya), to poora graph stuck ho sakta hai. Hamesha fallback route define karo (jaise default: `writer` ya `FINISH`) taaki graph gracefully complete ho sake, crash na ho.

### 4. Observability

Multi-agent systems debug karna single-agent se kaafi harder hai — kyunki failure kisi bhi agent mein ho sakti hai. Chapter 10 ke LangSmith tracing yahan critical ho jaati hai:

```typescript
process.env.LANGCHAIN_TRACING_V2 = "true";
process.env.LANGCHAIN_PROJECT = "multi-agent-support-system";
```

LangSmith trace mein tumhe har agent ka input/output alag se dikhega, jisse pata chalta hai galti exactly kahan hui — routing mein, ya kisi specific agent ke reasoning mein.

### 5. Agent boundaries clearly define karo

Sabse common production mistake: do agents ke responsibilities overlap ho jaana. Agar "billing_agent" aur "delivery_agent" dono refund handle karne ki koshish karte hain, to inconsistent behavior milega. Har agent ka system prompt mein **explicitly** likho kya uske scope mein hai aur kya nahi:

```typescript
new SystemMessage(`Tum billing agent ho. Sirf yeh handle karo:
- Payment status queries
- Invoice/receipt requests
- Refund initiation (delivery se related refund NAHI — woh delivery_agent ka kaam hai)

Agar query in scope se bahar hai, "delivery_agent" ko handoff karo.`)
```

---

## Kab kaunsa pattern use karein — Decision Guide

| Situation | Pattern |
|---|---|
| Fixed order of steps, koi dynamic decision nahi | **Sequential Pipeline** |
| Ek central "manager" clearly decide kar sakta hai kaam kisko dena hai | **Supervisor** |
| Agents ko peer-level collaborate karna hai, no clear hierarchy | **Network (Command)** |
| 10+ agents, clear team boundaries (research team, writing team, QA team) | **Hierarchical Teams (Subgraphs)** |
| Same kaam multiple independent sources/inputs pe parallel karna hai | **Send API (Fan-out)** |

---

## Common Mistakes

1. **Har cheez ke liye multi-agent use karna** — agar ek single agent + achhe tools se kaam ho sakta hai, multi-agent mat banao. Extra complexity = extra failure points aur cost.
2. **Reducer bhool jaana** — jaise chapter 15 mein seekha, `messages` field pe reducer nahi lagaya to har agent ka output purane messages ko overwrite kar dega.
3. **Recursion limit set na karna** — production mein infinite loop se bill lakhon mein ja sakta hai.
4. **Overlapping agent responsibilities** — do agents same kaam handle karne ki koshish karein to inconsistent, confusing behavior milta hai.
5. **Poori history har agent ko bhejna** — cost aur context pollution dono badhte hain. Zaroorat ho to sirf relevant summary pass karo.
6. **Structured output ke bina routing** — supervisor ka decision free-text se parse karna fragile hai. Hamesha `withStructuredOutput` + enum schema use karo.

---

## Key Takeaways

- Multi-agent systems ek naya LangGraph primitive nahi hain — yeh StateGraph, nodes, conditional edges, aur subgraphs ko combine karke banaya gaya **architecture pattern** hai.
- Single agent tab fail hota hai jab prompt bloat, tool overload, aur context pollution ho jaaye — tab specialized agents mein split karna better hai.
- **Supervisor pattern** — centralized routing, ek manager decide karta hai agla kaun chalega. Debug karna easy, lekin supervisor prompt bada ho sakta hai agents badhne pe.
- **Network pattern (`Command`)** — decentralized, agents seedhe ek doosre ko handoff karte hain state update ke saath. Zyada flexible, thoda harder to trace.
- **Hierarchical teams** — subgraphs ko teams ki tarah use karo, top-level supervisor teams ke beech route karta hai. Bade systems (10+ agents) ke liye zaruri.
- **Sequential pipeline** — fixed order tasks ke liye supervisor ka overhead skip karo, seedhe edges use karo. Cheaper aur faster.
- **`Send` API** — dynamic fan-out ke liye, jab multiple agents ko parallel chalana ho.
- Shared state simple hai lekin token cost badhata hai; isolated state + summary handoff production mein cost-efficient hai.
- Production mein hamesha: recursion limits, error fallback, clear agent boundaries, aur LangSmith tracing set karo — warna failures debug karna nightmare ban jaata hai.
