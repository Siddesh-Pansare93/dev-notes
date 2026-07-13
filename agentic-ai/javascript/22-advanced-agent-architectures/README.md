# Advanced Agent Architectures

🔴 Production-grade

## Kya hota hai?

Chapter 18 mein humne dekha ki **multiple agents** ko kaise coordinate karte hain — supervisor, network (handoff), hierarchical teams, aur `Send` API se fan-out. Woh sab isse baare mein tha ki **"kitne agents hain aur woh ek doosre se kaise baat karte hain."**

Yeh chapter ek level aur upar jaata hai — yeh baat karta hai ki **ek single agent (ya ek team) apni reasoning ko kaise structure karta hai** taaki woh zyada reliable, zyada accurate, aur zyada cost-efficient ho. Yeh "thinking architectures" hain — patterns jo research papers (ReAct, Reflexion, Plan-and-Solve, ReWOO, Tree of Thoughts, LATS, CRAG/Self-RAG) se aaye hain aur ab production agent systems mein standard ban chuke hain.

Socho aise: chapter 18 tumhe sikhata hai ki Zomato ka **org chart** kaisa dikhta hai (kaun kis team mein hai). Yeh chapter tumhe sikhata hai ki **har team apna kaam kaise karti hai achhe se** — jaise ek delivery partner apna route plan karta hai (Plan-and-Execute), ek chef apna dish taste karke improve karta hai (Reflection), ya QA team pehle se hi galtiyaan pakadne ke liye checklist follow karti hai (Evaluator-Optimizer).

> [!info]
> Bilkul chapter 18 ki tarah, yeh bhi koi naya LangGraph.js primitive nahi hai. Yeh sab patterns tum `StateGraph`, `Annotation`, conditional edges, aur `Send` se hi banate ho — bas ek **proven reasoning shape** follow karke.

Is chapter mein hum yeh architectures cover karenge:

1. **Reflection** — agent apna khud ka output critique karta hai aur improve karta hai
2. **Plan-and-Execute** — planner pehle poora plan banata hai, executor step-by-step chalata hai
3. **ReWOO** (Reasoning WithOut Observation) — plan + tool calls upfront, LLM calls minimum
4. **Orchestrator-Worker** (dynamic map-reduce) — orchestrator kaam todta hai, workers parallel solve karte hain
5. **Evaluator-Optimizer** (generator-critic loop) — generator banata hai, evaluator score deta hai, loop tab tak chalta hai jab tak quality bar cross na ho
6. **Tree of Thoughts / LATS** — multiple reasoning paths explore karke best wala choose karna
7. **Self-Corrective RAG (CRAG)** — retrieval quality check karke query rewrite/retry karna
8. Konsa architecture kab use karein — decision table
9. Production considerations — cost, latency, loop guards, observability

---

## Setup

```bash
npm install @langchain/langgraph @langchain/core @langchain/openai zod
```

```typescript
import { StateGraph, START, END, Annotation, Send } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import {
  BaseMessage,
  HumanMessage,
  AIMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { z } from "zod";

const llm = new ChatOpenAI({ model: "gpt-4o", temperature: 0 });
```

---

## 1. Reflection Pattern

### Kya hota hai?

**Reflection** mein agent apna khud ka pehla draft/output banata hai, phir ek "critic" step (jo wahi LLM ya doosra LLM ho sakta hai) us output ko review karta hai — kya galti hai, kya missing hai, kya improve ho sakta hai. Agent phir feedback ke basis pe revise karta hai. Yeh loop tab tak chalta hai jab tak output "good enough" na ho ya max iterations khatam na ho jaayein.

### Kyun zaruri hai?

LLMs **pehli koshish mein hamesha best output nahi dete** — jaise tum bhi pehla draft likhte ho to usme typos, gaps, weak arguments hote hain, aur phir ek baar padh ke edit karte ho. Socho ek naya developer jo code likhta hai aur direct production mein push kar deta hai — vs ek senior developer jo apna khud ka PR ek baar review karta hai submit karne se pehle. Reflection wahi self-review discipline agent ko deta hai.

Yeh especially zaruri hai jab:
- Output quality-critical hai (legal draft, code generation, long-form content)
- Koi automated checker (compiler, linter, test suite) available hai jo objectively bata sake "galti hai"
- User directly LLM ka pehla output nahi dekhega — beech mein polish hoga

> [!warning]
> Reflection **extra LLM calls** ka matlab hai — har iteration ek generate + ek critique call hai. Agar tumhe sirf "quick answer" chahiye (jaise FAQ bot), reflection overkill hai — latency aur cost dono badhte hain bina proportional value ke.

### State design aur graph

```typescript
const ReflectionState = Annotation.Root({
  task: Annotation<string>,
  draft: Annotation<string>({
    reducer: (_existing, update) => update,
    default: () => "",
  }),
  critique: Annotation<string>({
    reducer: (_existing, update) => update,
    default: () => "",
  }),
  iterations: Annotation<number>({
    reducer: (_existing, update) => update,
    default: () => 0,
  }),
  isGoodEnough: Annotation<boolean>({
    reducer: (_existing, update) => update,
    default: () => false,
  }),
});

const MAX_ITERATIONS = 3;

// --- Generator node: draft banata ya revise karta hai ---
async function generate(state: typeof ReflectionState.State) {
  const prompt = state.critique
    ? `Task: ${state.task}\n\nPrevious draft:\n${state.draft}\n\nCritique:\n${state.critique}\n\nAb is critique ko address karke ek better draft likho.`
    : `Task: ${state.task}\n\nEk draft likho.`;

  const response = await llm.invoke([
    new SystemMessage("Tum ek skilled writer/coder ho jo high-quality drafts banata hai."),
    new HumanMessage(prompt),
  ]);

  return {
    draft: response.content as string,
    iterations: state.iterations + 1,
  };
}

// --- Reflector node: draft ko critique karta hai ---
const CritiqueSchema = z.object({
  critique: z.string().describe("Specific, actionable feedback — kya improve karna hai"),
  isGoodEnough: z.boolean().describe("True agar draft final quality bar cross karta hai"),
});

async function reflect(state: typeof ReflectionState.State) {
  const critic = llm.withStructuredOutput(CritiqueSchema);
  const result = await critic.invoke(
    `Task: ${state.task}\n\nDraft:\n${state.draft}\n\nIs draft ko critically review karo — clarity, correctness, completeness ke against. Agar genuinely accha hai to isGoodEnough=true do, warna specific critique do.`
  );

  return { critique: result.critique, isGoodEnough: result.isGoodEnough };
}

// --- Routing: loop continue karein ya khatam karein? ---
function shouldContinue(state: typeof ReflectionState.State) {
  if (state.isGoodEnough || state.iterations >= MAX_ITERATIONS) {
    return END;
  }
  return "generate";
}

const reflectionGraph = new StateGraph(ReflectionState)
  .addNode("generate", generate)
  .addNode("reflect", reflect)
  .addEdge(START, "generate")
  .addEdge("generate", "reflect")
  .addConditionalEdges("reflect", shouldContinue, {
    generate: "generate",
    [END]: END,
  })
  .compile();

// Usage
const result = await reflectionGraph.invoke({
  task: "Ek 3-paragraph blog intro likho 'why TypeScript over JavaScript' pe",
});
console.log(result.draft);
```

Yeh diagram jaisa dikhta hai:

```
START → generate → reflect → (isGoodEnough? END : generate) → ...loop... → END
```

> [!tip]
> **`MAX_ITERATIONS` hamesha rakho.** Reflection loop bina hard cap ke infinite chal sakta hai agar critic kabhi satisfy na ho (especially subjective tasks jaise "is this creative enough"). LangGraph ka default `recursionLimit: 25` bhi ek safety net hai, lekin apna khud ka explicit counter better hai kyunki woh graceful degradation deta hai (best-so-far draft return karo, error throw nahi).

### Reflexion — Reflection + Memory

**Reflexion** (research paper se) Reflection ka ek advanced version hai jisme critique ko sirf current iteration mein use nahi karte — usse ek **running memory** mein store karte ho jo future tasks mein bhi carry hota hai. Jaise ek developer jo apni past code review comments ko yaad rakhta hai taaki wahi galti dobara na kare.

```typescript
const ReflexionState = Annotation.Root({
  task: Annotation<string>,
  draft: Annotation<string>({ reducer: (_e, u) => u, default: () => "" }),
  // Lessons learned — persist across tasks, isliye concat reducer
  lessonsLearned: Annotation<string[]>({
    reducer: (existing, update) => existing.concat(update),
    default: () => [],
  }),
});
```

Har reflection cycle ke baad, agent ek "lesson" extract karta hai (jaise "mujhe hamesha edge cases explicitly mention karne chahiye") aur usse `lessonsLearned` mein append karta hai — jo agle prompt mein context ke tarah inject hota hai. Production mein yeh lessons ek vector store ya database mein persist karte ho taaki agent sessions ke across bhi seekhta rahe (long-term memory — chapter 6 se related concept).

---

## 2. Plan-and-Execute Pattern

### Kya hota hai?

Ek standard ReAct agent (chapter 8) **step-by-step** sochta hai: "ek tool call karo, result dekho, phir agla step decide karo, repeat." Yeh flexible hai lekin **expensive** hai — har single step pe ek poora LLM call lagta hai, aur agent kabhi "bade picture" ko dekhe bina chhote-chhote decisions leta rehta hai.

**Plan-and-Execute** isse split karta hai do phases mein:
1. **Planner** — pura task dekh ke ek **poora multi-step plan** banata hai upfront (ek hi LLM call mein)
2. **Executor** — plan ke har step ko execute karta hai (tools call karke), bina baar-baar "ab kya karu" poochhe

Agar execution ke beech mein kuch unexpected hota hai, planner **re-plan** kar sakta haii — lekin normal case mein plan fixed rehta hai.

### Kyun zaruri hai?

Socho ek IRCTC trip planning karna hai: "Delhi se Goa jaana hai, budget hotel chahiye, 3 din ka trip." Ek ReAct agent har step pe naya sochega — "pehle train dhoondu... ab hotel dhoondu... ab weather check karu..." — har decision ek LLM call hai. Ek trip-planner (travel agent) instead **pehle poora itinerary banata hai** ek baar mein — "Day 1: train + check-in, Day 2: sightseeing, Day 3: return" — phir bas usse execute karta hai. Yeh zyada efficient hai kyunki:

1. **Kam LLM calls** — planning ek call hai, execution steps sirf tool-calls hain (chhote/cheaper "step executor" calls)
2. **Better global reasoning** — planner ko poora context dikhta hai jab woh decide karta hai, isliye plan zyada coherent hota hai (vs step-by-step jahan agent apna "why" bhool sakta hai)
3. **Predictable & debuggable** — plan ek explicit list hai, tum usse log/inspect kar sakte ho execution se pehle hi

> [!info]
> Trade-off: agar task truly unpredictable hai (har step ka result completely different direction le sakta hai), to rigid upfront plan galat pad sakta hai. Isliye production Plan-and-Execute mein **re-planning step** zaruri hai.

### Code

```typescript
const PlanExecuteState = Annotation.Root({
  task: Annotation<string>,
  plan: Annotation<string[]>({
    reducer: (_existing, update) => update,
    default: () => [],
  }),
  pastSteps: Annotation<Array<{ step: string; result: string }>>({
    reducer: (existing, update) => existing.concat(update),
    default: () => [],
  }),
  response: Annotation<string>({
    reducer: (_existing, update) => update,
    default: () => "",
  }),
});

// --- Planner ---
const PlanSchema = z.object({
  steps: z.array(z.string()).describe("Ordered list of steps, jo task complete karne ke liye zaruri hain"),
});

async function planStep(state: typeof PlanExecuteState.State) {
  const planner = llm.withStructuredOutput(PlanSchema);
  const result = await planner.invoke(
    `Task: ${state.task}\n\nIse solve karne ke liye ek simple, ordered step-by-step plan banao. Har step actionable hona chahiye.`
  );
  return { plan: result.steps };
}

// --- Executor: plan ka pehla pending step chalata hai ---
async function executeStep(state: typeof PlanExecuteState.State) {
  const [currentStep, ...remainingSteps] = state.plan;

  // Real production mein yahan tool-calling agent invoke hoga (chapter 8/19)
  const response = await llm.invoke([
    new SystemMessage("Tum ek task executor ho. Sirf yeh ek step complete karo, kuch aur nahi."),
    new HumanMessage(`Overall task: ${state.task}\nCurrent step: ${currentStep}`),
  ]);

  return {
    plan: remainingSteps,
    pastSteps: [{ step: currentStep, result: response.content as string }],
  };
}

// --- Re-planner: check karta hai ki aur steps chahiye ya khatam ---
const ReplanSchema = z.object({
  action: z.enum(["continue", "done"]),
  finalResponse: z.string().optional().describe("Sirf agar action='done' hai"),
  updatedSteps: z.array(z.string()).optional().describe("Sirf agar action='continue' hai"),
});

async function replanStep(state: typeof PlanExecuteState.State) {
  if (state.plan.length > 0) {
    // Abhi bhi steps baaki hain, seedha execute continue karo
    return {};
  }

  const replanner = llm.withStructuredOutput(ReplanSchema);
  const history = state.pastSteps.map((p) => `- ${p.step}: ${p.result}`).join("\n");
  const result = await replanner.invoke(
    `Original task: ${state.task}\n\nAb tak complete hue steps:\n${history}\n\nKya task poora ho gaya? Agar haan, final answer do. Agar nahi, baaki steps do.`
  );

  if (result.action === "done") {
    return { response: result.finalResponse ?? "" };
  }
  return { plan: result.updatedSteps ?? [] };
}

function shouldEnd(state: typeof PlanExecuteState.State) {
  return state.response ? END : "executeStep";
}

const planExecuteGraph = new StateGraph(PlanExecuteState)
  .addNode("planStep", planStep)
  .addNode("executeStep", executeStep)
  .addNode("replanStep", replanStep)
  .addEdge(START, "planStep")
  .addEdge("planStep", "executeStep")
  .addEdge("executeStep", "replanStep")
  .addConditionalEdges("replanStep", shouldEnd, {
    executeStep: "executeStep",
    [END]: END,
  })
  .compile();

const result = await planExecuteGraph.invoke({
  task: "Compare Node.js aur Deno ke beech performance aur ek recommendation do junior developer ke liye",
});
console.log(result.response);
```

> [!tip]
> Production mein `executeStep` ko ek full tool-calling sub-agent bana do (chapter 19 wala `ToolNode` pattern) — taaki har step actual tools (search, calculator, DB query) use kar sake, sirf plain LLM text generation na ho.

---

## 3. ReWOO — Reasoning WithOut Observation

### Kya hota hai?

Plan-and-Execute mein bhi ek inefficiency hai: **re-planner** har baar poora context (saare past steps ke results) LLM ko dobara bhejta hai, jo tokens costly banata hai lambe tasks mein. **ReWOO** iska solution deta hai — planner sirf ek baar plan banata hai **variable placeholders ke saath** (jaise `#E1`, `#E2`), phir **saare tool calls bina LLM involvement ke sequentially execute** hote hain, aur last mein ek "solver" LLM call saare results ko combine karke final answer deta hai.

Matlab: **sirf 2 LLM calls total** (plan + solve) — beech ke sab tool executions **deterministic** hain, koi LLM involvement nahi.

### Kyun zaruri hai?

Socho ek dabbawala route planning — woh pehle hi decide kar leta hai "Station A se pickup, phir Building B, phir Building C" — beech mein har stop pe woh vaapas control room ko call karke "ab kya karu" nahi poochta. Poora route ek baar mein plan hota hai, phir bas execute hota hai. ReWOO agent bhi waisa hi hai — planning aur execution completely **decoupled** hain, jo latency aur cost dono drastically kam karta hai jab task mein multiple deterministic tool calls hote hain.

| | Plan-and-Execute | ReWOO |
|---|---|---|
| LLM calls | Plan (1) + Execute (per step) + Replan (per cycle) | Plan (1) + Solve (1) — tools LLM-free execute hote hain |
| Adaptability | High — re-plan kar sakta hai mid-way | Low — plan fixed hai, results dekhne ke baad change nahi hota |
| Best for | Unpredictable, exploratory tasks | Predictable, well-defined multi-tool tasks |

### Code

```typescript
const ReWOOState = Annotation.Root({
  task: Annotation<string>,
  plan: Annotation<Array<{ id: string; tool: string; input: string }>>({
    reducer: (_existing, update) => update,
    default: () => [],
  }),
  evidence: Annotation<Record<string, string>>({
    reducer: (existing, update) => ({ ...existing, ...update }),
    default: () => ({}),
  }),
  result: Annotation<string>({
    reducer: (_existing, update) => update,
    default: () => "",
  }),
});

// --- Planner: ek shot mein poora plan with placeholders banata hai ---
const RewooPlanSchema = z.object({
  steps: z.array(
    z.object({
      id: z.string().describe("e.g. #E1, #E2"),
      tool: z.enum(["search", "calculator"]),
      // input mein pichhle steps ke placeholders reference ho sakte hain, e.g. "revenue of #E1"
      input: z.string(),
    })
  ),
});

async function rewooPlan(state: typeof ReWOOState.State) {
  const planner = llm.withStructuredOutput(RewooPlanSchema);
  const result = await planner.invoke(
    `Task: ${state.task}\n\nEk plan banao jo "search" aur "calculator" tools use kare. Agar ek step ka output doosre step mein chahiye, uska placeholder (#E1, #E2...) reference karo.`
  );
  return { plan: result.steps };
}

// --- Worker: saare tool calls sequentially, LLM-free, chalata hai ---
async function rewooWork(state: typeof ReWOOState.State) {
  const evidence: Record<string, string> = {};

  for (const step of state.plan) {
    // Placeholders ko already-resolved evidence se replace karo
    let resolvedInput = step.input;
    for (const [key, value] of Object.entries(evidence)) {
      resolvedInput = resolvedInput.replaceAll(key, value);
    }

    let output: string;
    if (step.tool === "search") {
      output = `[mock search result for: ${resolvedInput}]`; // real: Tavily/SerpAPI call
    } else {
      output = `[mock calculation for: ${resolvedInput}]`; // real: eval/math library
    }
    evidence[step.id] = output;
  }

  return { evidence };
}

// --- Solver: final LLM call jo saara evidence combine karta hai ---
async function rewooSolve(state: typeof ReWOOState.State) {
  const evidenceText = Object.entries(state.evidence)
    .map(([id, val]) => `${id}: ${val}`)
    .join("\n");

  const response = await llm.invoke(
    `Task: ${state.task}\n\nCollected evidence:\n${evidenceText}\n\nIs evidence ka use karke final answer do.`
  );
  return { result: response.content as string };
}

const rewooGraph = new StateGraph(ReWOOState)
  .addNode("plan", rewooPlan)
  .addNode("work", rewooWork)
  .addNode("solve", rewooSolve)
  .addEdge(START, "plan")
  .addEdge("plan", "work")
  .addEdge("work", "solve")
  .addEdge("solve", END)
  .compile();
```

> [!warning]
> ReWOO **tab hi kaam karta hai jab task ke tool-calls predictable hain** — matlab planner ko pehle se pata ho sakta hai ki kaunse tools kis order mein chahiye honge. Agar task ka path genuinely data-dependent hai (jaise "agar search result X aaye to Y karo, warna Z"), ReWOO fit nahi baithta — wahan Plan-and-Execute ya standard ReAct better hai.

---

## 4. Orchestrator-Worker (Dynamic Map-Reduce)

### Kya hota hai?

Chapter 18 mein humne `Send` API dekha tha ek **static** list (`sources`) pe fan-out karne ke liye. **Orchestrator-Worker** pattern isse ek step aage le jaata hai — ek LLM (orchestrator) **dynamically decide karta hai ki kitne aur kaunse sub-tasks banane hain** (yeh number pehle se fixed nahi hai), phir un sub-tasks ko parallel workers ko bhejta hai (`Send` se), aur last mein sab results ko synthesize (reduce) karta hai.

Yeh classic **map-reduce** hai, bas "map" step ek LLM decide karta hai (static loop nahi).

### Kyun zaruri hai?

Socho tumhe ek report likhni hai "Top 5 emerging AI startups in India" pe. Tumhe pehle se nahi pata kitne "sections" chahiye honge — yeh depend karta hai topic ki complexity pe. Ek smart orchestrator (jaise ek editor jo assignment deta hai apne reporters ko) pehle decide karta hai "is report ke liye humein 4 sections chahiye: funding trends, key players, tech differentiation, challenges" — phir har section ek alag reporter (worker) ko assign karta hai jo parallel research karke likhta hai, aur editor sabko combine karke final report banata hai.

### Code

```typescript
const OrchestratorState = Annotation.Root({
  topic: Annotation<string>,
  sections: Annotation<Array<{ title: string; description: string }>>({
    reducer: (_existing, update) => update,
    default: () => [],
  }),
  // Workers parallel likhte hain, isliye concat reducer chahiye
  completedSections: Annotation<Array<{ title: string; content: string }>>({
    reducer: (existing, update) => existing.concat(update),
    default: () => [],
  }),
  finalReport: Annotation<string>({
    reducer: (_existing, update) => update,
    default: () => "",
  }),
});

// --- Orchestrator: dynamically decide karta hai kitne sections chahiye ---
const SectionsSchema = z.object({
  sections: z.array(
    z.object({
      title: z.string(),
      description: z.string().describe("Is section mein kya cover karna hai"),
    })
  ),
});

async function orchestrate(state: typeof OrchestratorState.State) {
  const planner = llm.withStructuredOutput(SectionsSchema);
  const result = await planner.invoke(
    `Topic: ${state.topic}\n\nEk report ke liye zaruri sections decide karo. Sirf utne sections banao jitne genuinely chahiye — na kam, na zyada.`
  );
  return { sections: result.sections };
}

// --- Dispatcher: har section ke liye ek parallel worker Send karta hai ---
function dispatchToWorkers(state: typeof OrchestratorState.State) {
  return state.sections.map(
    (section) => new Send("writeSection", { section, topic: state.topic })
  );
}

// --- Worker: ek section likhta hai (parallel mein chalta hai) ---
async function writeSection(state: {
  section: { title: string; description: string };
  topic: string;
}) {
  const response = await llm.invoke(
    `Report topic: ${state.topic}\nSection: ${state.section.title}\nFocus: ${state.section.description}\n\nIs section ko 2-3 paragraphs mein likho.`
  );
  return {
    completedSections: [{ title: state.section.title, content: response.content as string }],
  };
}

// --- Synthesizer: sab sections combine karke final report banata hai ---
async function synthesize(state: typeof OrchestratorState.State) {
  const combined = state.completedSections
    .map((s) => `## ${s.title}\n${s.content}`)
    .join("\n\n");
  return { finalReport: `# ${state.topic}\n\n${combined}` };
}

const orchestratorGraph = new StateGraph(OrchestratorState)
  .addNode("orchestrate", orchestrate)
  .addNode("writeSection", writeSection)
  .addNode("synthesize", synthesize)
  .addEdge(START, "orchestrate")
  .addConditionalEdges("orchestrate", dispatchToWorkers, ["writeSection"])
  .addEdge("writeSection", "synthesize")
  .addEdge("synthesize", END)
  .compile();

const report = await orchestratorGraph.invoke({
  topic: "Top emerging AI startups in India (2026)",
});
console.log(report.finalReport);
```

> [!info]
> Farak chapter 18 ke `Send` fan-out se: wahan `sources` array **pehle se given** tha (static). Yahan **LLM khud decide karta hai** array ka content aur size (`orchestrate` node) — yeh "dynamic" part hai jo isse ek separate architecture pattern banata hai, na ki sirf ek API feature.

---

## 5. Evaluator-Optimizer (Generator-Critic Loop)

### Kya hota hai?

Yeh Reflection se milta-julta hai, lekin key difference: evaluator **structured, objective score** deta hai (jaise 1-10 rating specific criteria pe), na ki sirf free-text critique. Yeh loop **quality gates** ke saath production pipelines mein use hota hai — jaise "agent-generated code tab tak accept nahi hoga jab tak woh linter + test score dono pass na kare."

### Kyun zaruri hai?

Socho Swiggy ka food quality control — restaurant khana banata hai (generator), aur ek quality inspector (evaluator) usse **specific criteria** pe check karta hai: taste, packaging, temperature, portion size — har ek ko score deta hai. Agar overall score threshold se neeche hai, restaurant ko wapas bheja jaata hai improve karne ke liye. Yeh subjective "accha lagta hai" se zyada **reliable aur measurable** hai.

### Code

```typescript
const EvalOptState = Annotation.Root({
  task: Annotation<string>,
  code: Annotation<string>({ reducer: (_e, u) => u, default: () => "" }),
  score: Annotation<number>({ reducer: (_e, u) => u, default: () => 0 }),
  feedback: Annotation<string>({ reducer: (_e, u) => u, default: () => "" }),
  attempts: Annotation<number>({ reducer: (_e, u) => u, default: () => 0 }),
});

const SCORE_THRESHOLD = 8;
const MAX_ATTEMPTS = 4;

async function generateCode(state: typeof EvalOptState.State) {
  const prompt = state.feedback
    ? `Task: ${state.task}\n\nPrevious code:\n${state.code}\n\nFeedback:\n${state.feedback}\n\nIse fix karo.`
    : `Task: ${state.task}\n\nCode likho.`;

  const response = await llm.invoke(prompt);
  return { code: response.content as string, attempts: state.attempts + 1 };
}

const EvalSchema = z.object({
  score: z.number().min(0).max(10).describe("Code quality score — correctness, readability, edge cases"),
  feedback: z.string().describe("Specific, actionable feedback agar score kam hai"),
});

async function evaluateCode(state: typeof EvalOptState.State) {
  const evaluator = llm.withStructuredOutput(EvalSchema);
  const result = await evaluator.invoke(
    `Task: ${state.task}\n\nCode:\n${state.code}\n\nIse 0-10 score do — correctness, edge cases, readability ke basis pe. Strict raho.`
  );
  return { score: result.score, feedback: result.feedback };
}

function checkQuality(state: typeof EvalOptState.State) {
  if (state.score >= SCORE_THRESHOLD || state.attempts >= MAX_ATTEMPTS) {
    return END;
  }
  return "generateCode";
}

const evalOptGraph = new StateGraph(EvalOptState)
  .addNode("generateCode", generateCode)
  .addNode("evaluateCode", evaluateCode)
  .addEdge(START, "generateCode")
  .addEdge("generateCode", "evaluateCode")
  .addConditionalEdges("evaluateCode", checkQuality, {
    generateCode: "generateCode",
    [END]: END,
  })
  .compile();
```

> [!tip]
> Real production systems mein evaluator **hamesha LLM hona zaruri nahi hai**. Code generation ke liye, evaluator ek actual **compiler/linter/test-runner** ho sakta hai (deterministic, cheap, 100% accurate) — LLM sirf failure ko human-readable feedback mein convert karta hai. Yeh hybrid approach LLM-as-judge se zyada reliable hai jahan bhi possible ho.

---

## 6. Tree of Thoughts & LATS

### Kya hota hai?

Ab tak ke saare patterns **linear** the — ek path pe chalte hain (chahe woh loop ho). **Tree of Thoughts (ToT)** is se different hai: agent ek hi step pe **multiple alternative "thoughts"** generate karta hai (jaise 3 alag approaches ek problem solve karne ke), har ek ko evaluate karta hai, best wale(s) ko aage explore karta hai, aur weak branches ko **prune** kar deta hai — bilkul chess engine ki tarah jo multiple moves explore karke best wala choose karta hai.

**LATS (Language Agent Tree Search)** ToT ka aur advanced version hai jo Monte Carlo Tree Search (MCTS) ideas combine karta hai — reflection + search + backtracking ek saath.

### Kyun zaruri hai?

Socho tum IRCTC pe multiple route options compare kar rahe ho Delhi se Goa jaane ke — "direct flight," "train + local bus," "train + cab." Ek single-path agent sirf pehla option try karega aur agar woh fail ho jaaye (flight sold out) to atak jaayega. Tree of Thoughts approach **parallel mein 3 options evaluate karta hai**, har ek ka pros/cons dekhta hai, aur best overall path choose karta hai — na ki sirf jo pehle mila.

Yeh best hai jab:
- Problem mein **multiple valid solving strategies** hain (math proofs, puzzle-solving, code architecture decisions)
- Ek greedy/single-path approach local optima mein phas sakta hai
- Cost/latency ka budget hai multiple branches explore karne ke liye (ToT **expensive** hai — N branches × M depth = N×M LLM calls)

### Simplified code (single-level ToT)

```typescript
const ToTState = Annotation.Root({
  problem: Annotation<string>,
  thoughts: Annotation<Array<{ approach: string; score: number }>>({
    reducer: (_existing, update) => update,
    default: () => [],
  }),
  bestSolution: Annotation<string>({
    reducer: (_existing, update) => update,
    default: () => "",
  }),
});

// --- Generate multiple candidate approaches ---
const ThoughtsSchema = z.object({
  approaches: z.array(z.string()).length(3).describe("3 distinct approaches to solve this problem"),
});

async function generateThoughts(state: typeof ToTState.State) {
  const generator = llm.withStructuredOutput(ThoughtsSchema);
  const result = await generator.invoke(
    `Problem: ${state.problem}\n\n3 alag-alag, genuinely distinct approaches suggest karo ise solve karne ke.`
  );
  return { thoughts: result.approaches.map((approach) => ({ approach, score: 0 })) };
}

// --- Evaluate each thought ---
const EvalThoughtSchema = z.object({
  score: z.number().min(0).max(10).describe("Kitna viable/promising hai yeh approach"),
});

async function evaluateThoughts(state: typeof ToTState.State) {
  const evaluator = llm.withStructuredOutput(EvalThoughtSchema);
  const scored = await Promise.all(
    state.thoughts.map(async (t) => {
      const result = await evaluator.invoke(
        `Problem: ${state.problem}\nApproach: ${t.approach}\n\nIs approach ko 0-10 score do — feasibility aur effectiveness ke basis pe.`
      );
      return { approach: t.approach, score: result.score };
    })
  );
  return { thoughts: scored };
}

// --- Pick the best and expand it fully ---
async function expandBest(state: typeof ToTState.State) {
  const best = [...state.thoughts].sort((a, b) => b.score - a.score)[0];
  const response = await llm.invoke(
    `Problem: ${state.problem}\nChosen approach: ${best.approach}\n\nIs approach ko poora detail mein solve karo.`
  );
  return { bestSolution: response.content as string };
}

const totGraph = new StateGraph(ToTState)
  .addNode("generateThoughts", generateThoughts)
  .addNode("evaluateThoughts", evaluateThoughts)
  .addNode("expandBest", expandBest)
  .addEdge(START, "generateThoughts")
  .addEdge("generateThoughts", "evaluateThoughts")
  .addEdge("evaluateThoughts", "expandBest")
  .addEdge("expandBest", END)
  .compile();
```

> [!warning]
> ToT/LATS **sabse expensive pattern hai is list mein** — real implementations mein multiple levels deep tak branches explore karte hain, jisse LLM calls exponentially badh sakte hain. Production mein isse tabhi use karo jab problem genuinely "search-worthy" ho (jaise complex planning, math olympiad problems) — routine tasks ke liye yeh vast overkill hai.

---

## 7. Self-Corrective RAG (CRAG)

### Kya hota hai?

Chapter 9 mein humne basic RAG dekha — retrieve karo, LLM ko context do, answer generate karo. Lekin agar **retrieval hi khराब ho** (irrelevant documents mile) to LLM galat/hallucinated answer degа, chahe woh kitna bhi smart ho. **Corrective RAG (CRAG)** ek grading step add karta hai: retrieved documents ko relevance ke liye check karo, aur agar weak hain to **query rewrite karke web search fallback** ya **re-retrieve** karo.

### Kyun zaruri hai?

Socho Swiggy pe search kiya "spicy biryani" aur system ne "sweet gulab jamun" recommend kar diya — agar system yeh blindly LLM ko de de context ke tarah, LLM confidently galat jawaab dega ("yahan spicy biryani hai" bolke gulab jamun describe karega). Ek achha system pehle check karta hai — "kya yeh results actually relevant hain?" — agar nahi, to search query refine karke dobara try karta hai, ya kisi doosre source (web search) pe fallback karta hai.

### Code

```typescript
const CragState = Annotation.Root({
  question: Annotation<string>,
  documents: Annotation<string[]>({
    reducer: (_existing, update) => update,
    default: () => [],
  }),
  relevanceGrades: Annotation<boolean[]>({
    reducer: (_existing, update) => update,
    default: () => [],
  }),
  needsWebSearch: Annotation<boolean>({
    reducer: (_existing, update) => update,
    default: () => false,
  }),
  answer: Annotation<string>({
    reducer: (_existing, update) => update,
    default: () => "",
  }),
});

// --- Retrieve from vector store ---
async function retrieve(state: typeof CragState.State) {
  // Real implementation: vectorStore.similaritySearch(state.question)
  const documents = [
    "LangGraph.js state graphs ke saath multi-actor agents banata hai.",
    "Zomato ek food delivery app hai jo 2008 mein launch hui.", // irrelevant doc example
  ];
  return { documents };
}

// --- Grade each document's relevance ---
const GradeSchema = z.object({
  isRelevant: z.boolean().describe("True agar document seedha question answer karne mein madad karta hai"),
});

async function gradeDocuments(state: typeof CragState.State) {
  const grader = llm.withStructuredOutput(GradeSchema);
  const grades = await Promise.all(
    state.documents.map(async (doc) => {
      const result = await grader.invoke(
        `Question: ${state.question}\nDocument: ${doc}\n\nKya yeh document is question ka answer dene mein directly relevant hai?`
      );
      return result.isRelevant;
    })
  );

  // Agar 50%+ documents irrelevant hain, web search fallback trigger karo
  const relevantCount = grades.filter(Boolean).length;
  const needsWebSearch = relevantCount < grades.length / 2;

  return { relevanceGrades: grades, needsWebSearch };
}

// --- Fallback: web search (ya query rewrite + re-retrieve) ---
async function webSearchFallback(state: typeof CragState.State) {
  // Real implementation: Tavily/SerpAPI call
  const webResults = [`[web search result for "${state.question}"]`];
  return { documents: [...state.documents, ...webResults] };
}

// --- Generate final answer from filtered/augmented documents ---
async function generateAnswer(state: typeof CragState.State) {
  const relevantDocs = state.documents.filter((_, i) => state.relevanceGrades[i] !== false);
  const response = await llm.invoke(
    `Question: ${state.question}\n\nContext:\n${relevantDocs.join("\n")}\n\nAnswer do sirf is context ke basis pe.`
  );
  return { answer: response.content as string };
}

function routeAfterGrading(state: typeof CragState.State) {
  return state.needsWebSearch ? "webSearchFallback" : "generateAnswer";
}

const cragGraph = new StateGraph(CragState)
  .addNode("retrieve", retrieve)
  .addNode("gradeDocuments", gradeDocuments)
  .addNode("webSearchFallback", webSearchFallback)
  .addNode("generateAnswer", generateAnswer)
  .addEdge(START, "retrieve")
  .addEdge("retrieve", "gradeDocuments")
  .addConditionalEdges("gradeDocuments", routeAfterGrading, {
    webSearchFallback: "webSearchFallback",
    generateAnswer: "generateAnswer",
  })
  .addEdge("webSearchFallback", "generateAnswer")
  .addEdge("generateAnswer", END)
  .compile();
```

> [!info]
> **Self-RAG** ek related pattern hai jo isse aur granular banata hai — LLM khud decide karta hai (special "reflection tokens" ke through) ki *retrieval karna hai bhi ya nahi*, *kaunse retrieved chunks use karne hain*, aur *final answer factually supported hai ya nahi* — sab kuch ek hi model ke andar built-in decision points ke through. CRAG isse simpler hai aur graph-based systems mein implement karna aasan hai.

---

## Kaunsa Architecture Kab Use Karein

| Situation | Architecture |
|---|---|
| Output quality critical hai, self-review se improve ho sakta hai | **Reflection / Reflexion** |
| Multi-step task hai, steps pehle se predictable hain | **Plan-and-Execute** |
| Multi-tool task hai, calls fully deterministic/predictable hain, cost minimize karna hai | **ReWOO** |
| Sub-tasks ki sankhya pehle se pata nahi, dynamically decide karni hai | **Orchestrator-Worker (Send)** |
| Objective, measurable quality bar hai (tests, linters, scores) | **Evaluator-Optimizer** |
| Multiple valid solving strategies hain, exploration budget hai | **Tree of Thoughts / LATS** |
| RAG pipeline mein retrieval quality unreliable hai | **Self-Corrective RAG (CRAG)** |
| Clear specialist roles hain, ek manager route kar sakta hai | **Supervisor** (chapter 18) |
| Same operation, multiple independent inputs pe | **Send fan-out** (chapter 18) |

> [!tip]
> Yeh patterns **combine bhi hote hain**. Jaise ek production research agent: Orchestrator-Worker (sections decide karo) → har worker ek CRAG pipeline use kare (reliable retrieval ke liye) → final report Evaluator-Optimizer se guzre (quality check). Real-world "advanced" agents in patterns ke **layered combinations** hote hain, koi single pattern nahi.

---

## Production Considerations

1. **Cost tracking** — har pattern ki LLM-call count bahut alag hai. ReWOO (2 calls) vs ToT (N×M calls) mein 10-50x cost difference ho sakta hai same task ke liye. Pehle estimate karo, phir architecture choose karo.

2. **Recursion aur iteration limits** — har loop-based pattern (Reflection, Evaluator-Optimizer, CRAG) mein explicit max-iteration counter rakho, sirf LangGraph ke default `recursionLimit` pe depend mat karo — kyunki default limit hit hone pe graph **error throw** karta hai, jabki apna counter graceful fallback de sakta hai:

```typescript
const result = await graph.invoke(
  { task: "..." },
  { recursionLimit: 50 } // loop-heavy patterns ke liye default 25 kaafi kam pad sakta hai
);
```

3. **Latency budgeting** — parallel patterns (Orchestrator-Worker, ToT) latency kam kar sakte hain (parallel execution) lekin total token throughput/cost badha dete hain. Sequential patterns (Plan-and-Execute, ReWOO) latency mein slow ho sakte hain lekin cost-predictable hain. User-facing chat features ke liye latency-first architecture chuno; background/batch jobs ke liye cost-first.

4. **Observability** — jitna complex architecture, utna zaruri hai LangSmith/tracing (chapter 10) setup karna. Multi-branch patterns (ToT) debug karna bina tracing ke practically impossible hai — kaunsi branch kyun choose hui, kaunse scores diye gaye, sab trace mein dikhna chahiye.

5. **Fallback for evaluator failures** — agar evaluator/critic khud galat judge kare (jaise low-quality output ko high score de de), poora loop galat direction mein optimize ho sakta hai. Production mein evaluator ko jahan possible ho deterministic checks (tests, schema validation, linters) se backup karo, sirf LLM-as-judge pe blind trust mat karo.

6. **Checkpointing** — lambe multi-step architectures (Plan-and-Execute, Orchestrator-Worker) mein agar beech mein crash ho jaaye, poora progress lost ho sakta hai. LangGraph ke checkpointer (chapter 16 se related) use karo taaki state persist ho aur resume ho sake.

---

## Key Takeaways

- **Reflection/Reflexion** — generator + critic loop, output ko iteratively improve karta hai; Reflexion isme long-term "lessons learned" memory add karta hai.
- **Plan-and-Execute** — planner ek baar poora plan banata hai, executor step-by-step chalata hai, re-planner adapt kar sakta hai; ReAct se kam LLM calls, better global reasoning.
- **ReWOO** — plan + tool-execution + solve teen phases mein alag hain; sirf 2 LLM calls total, tool-calls fully deterministic — sabse cost-efficient jab task predictable ho.
- **Orchestrator-Worker** — LLM dynamically decide karta hai kitne parallel sub-tasks chahiye, `Send` API se fan-out karta hai, phir results synthesize karta hai — chapter 18 ke static fan-out se aage ka dynamic version.
- **Evaluator-Optimizer** — generator-critic loop jisme evaluator ek objective score deta hai; production mein evaluator ko deterministic checks (compiler, tests) se backup karna reliability badhata hai.
- **Tree of Thoughts / LATS** — multiple reasoning paths parallel explore karke best choose karna; sabse powerful lekin sabse expensive pattern — sirf genuinely "search-worthy" problems ke liye.
- **Self-Corrective RAG (CRAG)** — retrieved documents ki relevance grade karo, weak retrieval pe query rewrite/web-search fallback karo — hallucination reduce karta hai jab retrieval unreliable ho.
- Koi bhi ek architecture "best" nahi hai — sab trade-offs hain (cost vs quality vs latency vs predictability). Real production systems in patterns ko **layer/combine** karte hain.
- Har loop-based architecture mein explicit max-iteration guard rakho — sirf LangGraph ke default recursion limit pe depend mat karo.
- Architecture choose karne se pehle **cost aur latency budget estimate karo** — ToT jaisa expensive pattern galat use-case pe use karna production budget uda sakta hai.
