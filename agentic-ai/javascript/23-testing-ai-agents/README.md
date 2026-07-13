# Testing AI Agents

🔴 Production-grade

## Kya hota hai?

Socho ek second ke liye — tumne Zomato ke liye ek AI agent banaya hai jo order-related complaints handle karta hai: refund process karta hai, restaurant ko notify karta hai, aur customer ko friendly reply deta hai. Tumne ise localhost pe test kiya, 5-6 messages bheje, sab sahi laga, aur deploy kar diya production mein.

Do din baad pata chalta hai ki agent ne ek customer ko ₹50,000 ka refund process kar diya jab actual order ₹500 ka tha — kyunki LLM ne ek tool call mein galat amount pass kar diya, aur kisi ne bhi us edge case ko test nahi kiya tha.

Yeh exactly wo problem hai jo **testing** solve karta hai. Traditional software mein tum `add(2, 3) === 5` jaisa deterministic assertion likh sakte ho. Lekin AI agents non-deterministic hote hain — same input do baar do alag outputs de sakta hai. Toh sawal yeh uthta hai: **agent ko test kaise karein jab uska behavior khud hi random hai?**

## Kyun zaruri hai agentic systems mein?

Traditional web app aur AI agent ke testing mein fundamental farak hai:

| Traditional App | AI Agent |
|---|---|
| Deterministic — same input → same output | Non-deterministic — LLM sampling se output vary karta hai |
| Unit test: `expect(sum(2,3)).toBe(5)` | Unit test: "kya response mein refund amount sahi hai?" (exact string match nahi karega) |
| External API calls mock karna optional | LLM calls mock karna **zaruri** hai (cost + speed + determinism) |
| Bug = wrong code path | Bug ho sakta hai: prompt, tool schema, routing logic, ya LLM khud galat decision le raha ho |
| CI run cost: ~0 | Har real LLM call CI mein paiso ka bill banata hai |

Is chapter mein hum dekhenge:
1. Agent testing ki **pyramid** — kaunsa test kab likhna hai
2. **Vitest** setup LangChain.js/LangGraph.js projects ke liye
3. LLM calls ko **mock** karna (fake responses, no real API hits)
4. Tool calling **unit tests**
5. Graph/node level testing (LangGraph)
6. **Evaluation-based testing** — jab exact match possible nahi
7. Integration tests with real (but controlled) LLM calls
8. Regression testing aur CI pipeline setup

> [!info]
> Yeh chapter assume karta hai ki tumne pichle chapters (08 - building your first agent, 12-19 - LangGraph) padh liye hain. Code examples usi agent architecture pe build karte hain.

---

## 1. Testing Pyramid for AI Agents

Normal software testing pyramid (unit → integration → e2e) yahan bhi apply hoti hai, bas har layer mein LLM-specific concerns add ho jaate hain:

```
                    ▲
                   / \
                  /E2E\           <- Real LLM, real tools, slow, expensive, few tests
                 /-----\
                /  Eval  \        <- LLM-as-judge, semantic checks, "is this good?"
               /----------\
              / Integration \     <- Real LangGraph graph, mocked LLM responses
             /----------------\
            /   Unit Tests      \ <- Pure functions: parsers, reducers, tool logic
           /______________________\
```

- **Unit tests** (sabse zyada, sabse fast): pure TypeScript functions — tool implementations, state reducers, output parsers. Koi LLM involved nahi.
- **Integration tests**: LangGraph ka poora graph run karo, lekin LLM calls ko **mock** karo taaki deterministic aur free ho.
- **Evaluation tests**: jab output ka exact match possible nahi (jaise "friendly tone hai ya nahi"), tab LLM-as-judge ya semantic similarity use karo.
- **E2E tests** (sabse kam, sabse slow/expensive): real LLM + real tools, sirf critical paths ke liye, shayad nightly CI run mein — daily PR checks mein nahi.

> [!tip]
> Rule of thumb: agar test mein real OpenAI/Anthropic API call ho rahi hai, wo E2E hai — usko minimize karo. 90% tests mocked LLM ke saath hone chahiye.

---

## 2. Project Setup — Vitest + LangChain.js

Vitest ka use karenge kyunki wo Jest-compatible API deta hai, ESM-first hai, aur TypeScript ke saath out-of-the-box kaam karta hai (Jest ko extra ts-jest config chahiye hoti hai).

```bash
npm install -D vitest @vitest/ui
npm install @langchain/core @langchain/langgraph @langchain/openai
```

`vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,          // describe/it/expect global rehte hain, import nahi karna padta
    testTimeout: 15000,     // agent graphs thoda slow ho sakte hain
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: ["**/*.config.ts", "**/types.ts"],
    },
  },
});
```

`package.json` scripts:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

> [!warning]
> CI mein kabhi bhi asli `OPENAI_API_KEY` ya `ANTHROPIC_API_KEY` expose mat karo unit/integration tests ke liye. Agar tumhare tests real key maang rahe hain, iska matlab tumne LLM calls mock nahi kiye — yeh design smell hai.

---

## 3. Mocking LLM Calls — The Core Skill

LangChain.js mein har chat model `BaseChatModel` extend karta hai. Testing ke liye LangChain ek built-in class deta hai: **`FakeListChatModel`** (aur `FakeStreamingChatModel`) — jo bina kisi real API call ke pre-defined responses return karta hai.

### 3.1 `FakeListChatModel` — Simplest Mock

```typescript
// src/agent.ts
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";

export function buildSummaryChain(model: ChatOpenAI) {
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", "Tum ek customer support summarizer ho. Complaint ko ek line mein summarize karo."],
    ["human", "{complaint}"],
  ]);
  return prompt.pipe(model);
}
```

```typescript
// tests/agent.test.ts
import { describe, it, expect } from "vitest";
import { FakeListChatModel } from "@langchain/core/utils/testing";
import { buildSummaryChain } from "../src/agent";

describe("Summary chain", () => {
  it("returns the mocked LLM response without hitting a real API", async () => {
    // FakeListChatModel LLM ki tarah hi dikhta hai (BaseChatModel ko implement karta hai)
    // lekin responses array se cycle karke deta hai — koi network call nahi hoti
    const fakeModel = new FakeListChatModel({
      responses: ["Customer ka order late aaya aur woh refund maang raha hai."],
    });

    const chain = buildSummaryChain(fakeModel as any);
    const result = await chain.invoke({ complaint: "Mera order 2 ghante late aaya, refund chahiye" });

    expect(result.content).toBe("Customer ka order late aaya aur woh refund maang raha hai.");
  });

  it("cycles through multiple responses on repeated calls", async () => {
    const fakeModel = new FakeListChatModel({
      responses: ["Response 1", "Response 2"],
    });

    const first = await fakeModel.invoke("hi");
    const second = await fakeModel.invoke("hi again");

    expect(first.content).toBe("Response 1");
    expect(second.content).toBe("Response 2");
  });
});
```

**Kaise kaam karta hai?** `FakeListChatModel` ek in-memory queue maintain karta hai. Har `invoke()` call pe agla response queue se nikal ke deta hai (aur wraparound kar jaata hai agar list khatam ho jaaye). Latency, tokens, sab kuch fake/zero hai — isliye tests millisecond mein chalte hain.

### 3.2 Mocking Tool Calls (Function Calling)

Real agents LLM se **tool calls** bhi return karwate hain (jaise "call `get_refund_status` tool with orderId=123"). Isके liye hum `FakeListChatModel` ke response ko `AIMessage` object bana ke `tool_calls` field set karte hain — ya `.bindTools()` wale model ka mock banate hain.

```typescript
// src/refund-agent.ts
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { AIMessage, BaseMessage } from "@langchain/core/messages";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

export const getRefundStatusTool = tool(
  async ({ orderId }: { orderId: string }) => {
    // production mein yeh real DB/API call hoga
    return `Order ${orderId} refund status: PROCESSED`;
  },
  {
    name: "get_refund_status",
    description: "Get refund status for a given order ID",
    schema: z.object({ orderId: z.string() }),
  }
);

export async function runAgentTurn(model: BaseChatModel, messages: BaseMessage[]) {
  const modelWithTools = model.bindTools!([getRefundStatusTool]);
  const response = await modelWithTools.invoke(messages);
  return response as AIMessage;
}
```

```typescript
// tests/refund-agent.test.ts
import { describe, it, expect, vi } from "vitest";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { getRefundStatusTool, runAgentTurn } from "../src/refund-agent";

describe("Refund agent tool calling", () => {
  it("triggers the correct tool call for a refund status query", async () => {
    // Real LLM ki jagah ek fake model banate hain jiska bindTools()
    // aur invoke() dono predictable output dete hain
    const fakeToolCallResponse = new AIMessage({
      content: "",
      tool_calls: [
        {
          name: "get_refund_status",
          args: { orderId: "ORD-9981" },
          id: "call_1",
          type: "tool_call",
        },
      ],
    });

    const mockModel = {
      bindTools: vi.fn().mockReturnValue({
        invoke: vi.fn().mockResolvedValue(fakeToolCallResponse),
      }),
    } as any;

    const response = await runAgentTurn(mockModel, [
      new HumanMessage("Mere order ORD-9981 ka refund status kya hai?"),
    ]);

    expect(response.tool_calls).toHaveLength(1);
    expect(response.tool_calls![0].name).toBe("get_refund_status");
    expect(response.tool_calls![0].args.orderId).toBe("ORD-9981");
  });

  it("tool implementation itself works correctly (pure unit test, no LLM needed)", async () => {
    // Yeh sabse fast test hai — tool ka logic LLM se completely independent test ho raha hai
    const result = await getRefundStatusTool.invoke({ orderId: "ORD-1234" } as any);
    expect(result).toContain("ORD-1234");
    expect(result).toContain("PROCESSED");
  });
});
```

> [!tip]
> **Golden rule**: Tool ki business logic ko LLM decision-making se **decouple** karke test karo. Tool function apne aap mein ek pure(ish) async function hai — usko directly call karke test karna sabse fast aur reliable tarika hai. LLM "sahi tool chuna ki nahi" wala part alag test hai.

### 3.3 Mocking with `vi.mock()` for Module-Level Replacement

Agar tumhara code directly `new ChatOpenAI()` instantiate karta hai (constructor ke through inject nahi hota — dependency injection nahi hai), toh Vitest ka `vi.mock()` use karo:

```typescript
// tests/module-mock.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock hoisted hota hai — file ke top pe automatically move ho jaata hai
vi.mock("@langchain/openai", () => {
  return {
    ChatOpenAI: vi.fn().mockImplementation(() => ({
      invoke: vi.fn().mockResolvedValue({
        content: "Mocked response — no real API call happened",
      }),
      bindTools: vi.fn().mockReturnThis(),
    })),
  };
});

import { ChatOpenAI } from "@langchain/openai";

describe("Module-level mocking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the mocked ChatOpenAI instead of hitting the real API", async () => {
    const model = new ChatOpenAI({ model: "gpt-4o-mini" });
    const result = await model.invoke("hello");
    expect(result.content).toBe("Mocked response — no real API call happened");
  });
});
```

> [!warning]
> `vi.mock()` factory ke andar tum **outer scope ke variables directly reference nahi kar sakte** (jaise `const fakeResponse = "..."` file ke top pe define karke andar use karna) — Vitest hoist karta hai isliye ReferenceError aayega. Agar dynamic values chahiye, `vi.hoisted()` use karo ya factory ke andar hi define karo.

---

## 4. Testing LangGraph Graphs

LangGraph.js mein tumhara agent ek **StateGraph** hota hai — nodes, edges, conditional routing. Testing ke teen levels hain:

### 4.1 Node-Level Unit Tests

Har node ek plain async function hai `(state) => partialState`. Ise LLM ke bina bhi test kar sakte ho agar node pure logic hai (routing, formatting, validation).

```typescript
// src/graph/nodes.ts
import { Annotation, messagesStateReducer } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";

export const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  refundAmount: Annotation<number>({
    reducer: (_, update) => update,
    default: () => 0,
  }),
});

// Pure routing node — no LLM call, easy to unit test
export function routeByAmount(state: typeof AgentState.State): "autoApprove" | "needsHumanReview" {
  if (state.refundAmount > 2000) {
    return "needsHumanReview";
  }
  return "autoApprove";
}
```

```typescript
// tests/nodes.test.ts
import { describe, it, expect } from "vitest";
import { routeByAmount, AgentState } from "../src/graph/nodes";

describe("routeByAmount", () => {
  it("routes large refunds to human review", () => {
    const state: typeof AgentState.State = { messages: [], refundAmount: 5000 };
    expect(routeByAmount(state)).toBe("needsHumanReview");
  });

  it("auto-approves small refunds", () => {
    const state: typeof AgentState.State = { messages: [], refundAmount: 300 };
    expect(routeByAmount(state)).toBe("autoApprove");
  });

  it("handles boundary value correctly (exactly 2000)", () => {
    // Edge case testing — bahut zaruri hai agentic systems mein
    // kyunki LLM kabhi kabhi boundary ke bahut kareeb amounts generate karta hai
    const state: typeof AgentState.State = { messages: [], refundAmount: 2000 };
    expect(routeByAmount(state)).toBe("autoApprove");
  });
});
```

### 4.2 Full Graph Integration Test (Mocked LLM)

Ab poora graph banate hain aur usme fake model inject karte hain — yeh check karta hai ki nodes, edges, aur state transitions sab sahi wire hue hain.

```typescript
// src/graph/build-graph.ts
import { StateGraph, END, START } from "@langchain/langgraph";
import { AgentState } from "./nodes";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { AIMessage } from "@langchain/core/messages";

export function buildRefundGraph(model: BaseChatModel) {
  const graph = new StateGraph(AgentState)
    .addNode("assess", async (state) => {
      const response = await model.invoke(state.messages);
      // Suppose LLM ek structured tool call return karta hai amount ke saath
      const amount =
        (response as AIMessage).tool_calls?.[0]?.args?.amount ?? 0;
      return { messages: [response], refundAmount: amount };
    })
    .addNode("autoApprove", async (state) => ({
      messages: [new AIMessage(`Refund of ₹${state.refundAmount} auto-approved.`)],
    }))
    .addNode("needsHumanReview", async (state) => ({
      messages: [new AIMessage(`Refund of ₹${state.refundAmount} sent for human review.`)],
    }))
    .addEdge(START, "assess")
    .addConditionalEdges("assess", (state) =>
      state.refundAmount > 2000 ? "needsHumanReview" : "autoApprove"
    )
    .addEdge("autoApprove", END)
    .addEdge("needsHumanReview", END);

  return graph.compile();
}
```

```typescript
// tests/build-graph.test.ts
import { describe, it, expect } from "vitest";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { buildRefundGraph } from "../src/graph/build-graph";

function makeFakeModel(toolCallAmount: number) {
  return {
    invoke: async () =>
      new AIMessage({
        content: "",
        tool_calls: [
          { name: "assess_refund", args: { amount: toolCallAmount }, id: "1", type: "tool_call" },
        ],
      }),
  } as any;
}

describe("Refund graph — end to end (mocked LLM)", () => {
  it("routes to autoApprove for small amounts", async () => {
    const graph = buildRefundGraph(makeFakeModel(500));

    const result = await graph.invoke({
      messages: [new HumanMessage("Refund chahiye mujhe ₹500 ka")],
      refundAmount: 0,
    });

    const lastMessage = result.messages[result.messages.length - 1];
    expect(lastMessage.content).toContain("auto-approved");
  });

  it("routes to needsHumanReview for large amounts", async () => {
    const graph = buildRefundGraph(makeFakeModel(8000));

    const result = await graph.invoke({
      messages: [new HumanMessage("Refund chahiye ₹8000 ka")],
      refundAmount: 0,
    });

    const lastMessage = result.messages[result.messages.length - 1];
    expect(lastMessage.content).toContain("human review");
  });
});
```

Is test se pata chalta hai ki **graph wiring** (conditional edges, state reducers) sahi kaam kar rahi hai — bina ek bhi paisa kharch kiye kisi real LLM pe.

### 4.3 Testing Streaming Graphs

Agar tumhara graph `.stream()` use karta hai (chapter 20 dekho), toh async iterator ko collect karke assert karo:

```typescript
it("streams state updates in the correct order", async () => {
  const graph = buildRefundGraph(makeFakeModel(500));
  const events: any[] = [];

  for await (const chunk of await graph.stream(
    { messages: [new HumanMessage("test")], refundAmount: 0 },
    { streamMode: "updates" }
  )) {
    events.push(chunk);
  }

  // Expect: assess node pehle chala, phir autoApprove
  expect(Object.keys(events[0])[0]).toBe("assess");
  expect(Object.keys(events[1])[0]).toBe("autoApprove");
});
```

---

## 5. Testing Memory & State Reducers

Chapter 06 aur 15 mein humne memory/reducers dekhe the. Reducers pure functions hote hain — inko test karna sabse aasan hai:

```typescript
// src/reducers.ts
export function appendUnique<T>(current: T[], update: T[]): T[] {
  const merged = [...current];
  for (const item of update) {
    if (!merged.includes(item)) merged.push(item);
  }
  return merged;
}
```

```typescript
describe("appendUnique reducer", () => {
  it("does not add duplicate entries", () => {
    const result = appendUnique(["a", "b"], ["b", "c"]);
    expect(result).toEqual(["a", "b", "c"]);
  });

  it("handles empty update", () => {
    expect(appendUnique(["a"], [])).toEqual(["a"]);
  });
});
```

> [!tip]
> Reducers, parsers, validators, formatters — yeh sab agent code ka wo hissa hai jo LLM se independent hai. Inpe jitni coverage laoge, utna hi confidence milega bina LLM ko involve kiye.

---

## 6. Evaluation-Based Testing — Jab Exact Match Kaam Nahi Karta

Kuch cheezein exact string match se test nahi ho sakti — jaise "kya response tone mein polite hai?" ya "kya summary meaningfully correct hai?". Yahan **evaluation-style testing** use karte hain.

### 6.1 Semantic/Property-Based Assertions

Exact text ke bajaye **properties** check karo:

```typescript
describe("Response quality properties", () => {
  it("summary should be shorter than the original complaint", async () => {
    const complaint = "Mera order bahut late aaya, driver ne call bhi nahi uthaya, aur khana bhi thanda tha jab mila. Main bahut frustrated hoon.";
    const fakeModel = new FakeListChatModel({
      responses: ["Order late aaya aur khana thanda tha."],
    });
    const chain = buildSummaryChain(fakeModel as any);
    const result = await chain.invoke({ complaint });

    expect((result.content as string).length).toBeLessThan(complaint.length);
  });

  it("response should never contain PII patterns like raw card numbers", async () => {
    const fakeModel = new FakeListChatModel({
      responses: ["Aapka refund process ho gaya hai, dhanyavaad."],
    });
    const chain = buildSummaryChain(fakeModel as any);
    const result = await chain.invoke({ complaint: "test" });

    const creditCardPattern = /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/;
    expect(creditCardPattern.test(result.content as string)).toBe(false);
  });
});
```

### 6.2 LLM-as-Judge Pattern

Jab quality subjective hai (helpfulness, tone, correctness against a rubric), ek **doosra LLM call** judge ki tarah use karo. Yeh integration/eval-tier test hai — real API call involve karta hai, isliye CI mein separate, kam-frequent suite mein rakho (jaise nightly).

```typescript
// src/eval/judge.ts
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

const JudgeSchema = z.object({
  isPolite: z.boolean(),
  isFactuallyGrounded: z.boolean(),
  score: z.number().min(1).max(5),
  reasoning: z.string(),
});

export async function judgeResponse(userQuery: string, agentResponse: string) {
  const judge = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 }).withStructuredOutput(
    JudgeSchema
  );

  return judge.invoke([
    {
      role: "system",
      content:
        "Tum ek strict QA reviewer ho customer support agent responses ke liye. Rate karo 1-5, aur batao kya politeness aur factual grounding sahi hai.",
    },
    { role: "user", content: `Query: ${userQuery}\nAgent Response: ${agentResponse}` },
  ]);
}
```

```typescript
// tests/eval/judge.test.ts
import { describe, it, expect } from "vitest";
import { judgeResponse } from "../../src/eval/judge";

// Yeh test suite REAL API calls karti hai — isliye separate script se run karo
// e.g. npm run test:eval  (CI mein sirf nightly ya pre-release run ho)
describe.skipIf(!process.env.OPENAI_API_KEY)("LLM-as-judge eval (real API)", () => {
  it("scores a polite, grounded response highly", async () => {
    const result = await judgeResponse(
      "Mera refund kab tak aayega?",
      "Namaste! Aapka refund 3-5 business days mein aapke original payment method mein credit ho jaayega."
    );

    expect(result.score).toBeGreaterThanOrEqual(4);
    expect(result.isPolite).toBe(true);
  });
});
```

```json
// package.json
{
  "scripts": {
    "test": "vitest run --exclude '**/eval/**'",
    "test:eval": "vitest run tests/eval"
  }
}
```

> [!warning]
> LLM-as-judge khud non-deterministic hai — ise `temperature: 0` pe rakho, aur assertions ko **thresholds** (`>= 4`) pe base karo, exact score pe nahi. Judge model bhi kabhi galat ho sakta hai — isko "strong signal", "ground truth" nahi maano.

---

## 7. Snapshot Testing for Prompts

Prompts silently badal jaate hain jab koi teammate template edit kar deta hai. **Snapshot tests** in accidental changes ko pakadte hain:

```typescript
import { describe, it, expect } from "vitest";
import { ChatPromptTemplate } from "@langchain/core/prompts";

describe("Prompt templates", () => {
  it("matches the expected system prompt structure", async () => {
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", "Tum ek helpful refund assistant ho. Hamesha polite raho aur amount confirm karo."],
      ["human", "{query}"],
    ]);

    const formatted = await prompt.formatMessages({ query: "test query" });
    // Snapshot file mein save hoga — agla run automatically compare karega
    expect(formatted.map((m) => m.content)).toMatchSnapshot();
  });
});
```

Pehli run pe Vitest `__snapshots__/agent.test.ts.snap` file banayega. Agle runs mein agar prompt text badal jaaye, test **fail** hoga aur diff dikhayega — isse accidental prompt drift pakad mein aata hai. Intentional change ho toh `vitest run -u` se snapshot update kar do.

> [!tip]
> Snapshot tests especially useful hain jab **multiple teammates** ek hi agent ke prompts edit karte hain — CI mein diff dikh jaata hai review ke waqt.

---

## 8. Testing Error Handling & Retries

Production agents ko LLM timeouts, malformed JSON, aur rate limits handle karne padte hain. In failure modes ko explicitly test karo:

```typescript
// src/safe-invoke.ts
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

export async function safeInvoke(
  model: BaseChatModel,
  input: any,
  maxRetries = 3
): Promise<any> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await model.invoke(input);
    } catch (err) {
      lastError = err;
      // Exponential backoff — production mein real delay hoga,
      // test mein hum ise mock/skip karenge
      await new Promise((r) => setTimeout(r, attempt * 100));
    }
  }
  throw new Error(`LLM call failed after ${maxRetries} attempts: ${lastError}`);
}
```

```typescript
// tests/safe-invoke.test.ts
import { describe, it, expect, vi } from "vitest";
import { safeInvoke } from "../src/safe-invoke";

describe("safeInvoke retry logic", () => {
  it("retries on failure and succeeds on the second attempt", async () => {
    const mockModel = {
      invoke: vi
        .fn()
        .mockRejectedValueOnce(new Error("Rate limit exceeded"))
        .mockResolvedValueOnce({ content: "Success on retry" }),
    } as any;

    const result = await safeInvoke(mockModel, "test input");

    expect(result.content).toBe("Success on retry");
    expect(mockModel.invoke).toHaveBeenCalledTimes(2);
  });

  it("throws after exhausting all retries", async () => {
    const mockModel = {
      invoke: vi.fn().mockRejectedValue(new Error("Persistent failure")),
    } as any;

    await expect(safeInvoke(mockModel, "test", 2)).rejects.toThrow(
      "LLM call failed after 2 attempts"
    );
    expect(mockModel.invoke).toHaveBeenCalledTimes(2);
  });

  it("handles malformed tool call arguments gracefully", async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        tool_calls: [{ name: "get_refund_status", args: null, id: "1" }],
      }),
    } as any;

    const response = await mockModel.invoke("test");
    // Agent code ko yeh defensive check karna chahiye
    const orderId = response.tool_calls[0]?.args?.orderId ?? null;
    expect(orderId).toBeNull(); // crash nahi hona chahiye
  });
});
```

> [!warning]
> **Common mistake**: `vi.useFakeTimers()` use karna bhool jaana jab retry logic mein real `setTimeout` ho — tumhare tests slow ho jaayenge (multiple seconds ka wait). Fake timers use karo:

```typescript
import { vi, beforeEach, afterEach } from "vitest";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it("retries quickly with fake timers", async () => {
  const mockModel = {
    invoke: vi.fn().mockRejectedValueOnce(new Error("fail")).mockResolvedValueOnce({ content: "ok" }),
  } as any;

  const promise = safeInvoke(mockModel, "test");
  await vi.runAllTimersAsync(); // backoff delays instantly resolve ho jaate hain
  const result = await promise;

  expect(result.content).toBe("ok");
});
```

---

## 9. Testing Human-in-the-Loop Interrupts

Chapter 16 mein humne `interrupt()` dekha tha. Isko test karne ke liye graph ko checkpointer ke saath compile karo aur verify karo ki interrupt sahi jagah pe rukta hai:

```typescript
import { MemorySaver } from "@langchain/langgraph";
import { describe, it, expect } from "vitest";
import { buildRefundGraph } from "../src/graph/build-graph-with-interrupt";
import { HumanMessage } from "@langchain/core/messages";

describe("Human-in-the-loop interrupt", () => {
  it("pauses execution before needsHumanReview node runs", async () => {
    const checkpointer = new MemorySaver();
    const graph = buildRefundGraph(makeFakeModel(9000)).compile({
      checkpointer,
      interruptBefore: ["needsHumanReview"],
    });

    const config = { configurable: { thread_id: "test-thread-1" } };
    const result = await graph.invoke(
      { messages: [new HumanMessage("₹9000 refund chahiye")], refundAmount: 0 },
      config
    );

    // Graph interrupt pe ruk gaya — needsHumanReview node abhi tak nahi chala
    const state = await graph.getState(config);
    expect(state.next).toContain("needsHumanReview");
  });

  it("resumes correctly after human approval", async () => {
    const checkpointer = new MemorySaver();
    const graph = buildRefundGraph(makeFakeModel(9000)).compile({
      checkpointer,
      interruptBefore: ["needsHumanReview"],
    });

    const config = { configurable: { thread_id: "test-thread-2" } };
    await graph.invoke(
      { messages: [new HumanMessage("₹9000 refund")], refundAmount: 0 },
      config
    );

    // Human ne approve kar diya — null input se resume karo
    const finalResult = await graph.invoke(null, config);
    const lastMessage = finalResult.messages[finalResult.messages.length - 1];
    expect(lastMessage.content).toContain("human review");
  });
});
```

---

## 10. Test Doubles Cheat Sheet

| Situation | Use This |
|---|---|
| Simple text response, no tools | `FakeListChatModel({ responses: [...] })` |
| Need to simulate tool calls | `AIMessage` with `tool_calls` array, wrapped in `vi.fn().mockResolvedValue(...)` |
| Model instantiated deep inside code, no DI | `vi.mock("@langchain/openai", ...)` |
| Need streaming chunks | `FakeStreamingChatModel` from `@langchain/core/utils/testing` |
| Testing tool logic itself | Call the `tool()`-wrapped function directly — no LLM involved |
| Testing graph wiring/routing | Compile real `StateGraph`, inject fake model |
| Testing subjective quality | LLM-as-judge with `temperature: 0`, threshold-based assertions |
| Testing retries/timeouts | `vi.fn().mockRejectedValueOnce()` + `vi.useFakeTimers()` |

---

## 11. Structuring the Test Suite (Recommended Layout)

```
project/
  src/
    agent.ts
    graph/
      nodes.ts
      build-graph.ts
    tools/
      refund-tool.ts
  tests/
    unit/
      nodes.test.ts          # pure functions, no LLM
      tools.test.ts          # tool logic in isolation
      reducers.test.ts
    integration/
      build-graph.test.ts    # full graph, mocked LLM
      interrupts.test.ts     # human-in-the-loop
    eval/
      judge.test.ts          # real LLM calls, run separately (nightly)
  vitest.config.ts
```

`package.json`:

```json
{
  "scripts": {
    "test": "vitest run tests/unit tests/integration",
    "test:eval": "vitest run tests/eval",
    "test:watch": "vitest tests/unit tests/integration",
    "test:coverage": "vitest run tests/unit tests/integration --coverage"
  }
}
```

### CI Pipeline (GitHub Actions example)

```yaml
# .github/workflows/test.yml
name: Test Agent
on: [pull_request]

jobs:
  unit-and-integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm test                 # fast, mocked, runs on every PR
      - run: npm run test:coverage

  eval-suite:
    runs-on: ubuntu-latest
    if: github.event_name == 'schedule'  # sirf nightly cron pe, PR pe nahi
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run test:eval
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

> [!info]
> Yeh split — fast mocked tests har PR pe, real-LLM eval tests sirf nightly/scheduled — production teams ka standard pattern hai. Isse CI fast rehta hai (seconds, minutes nahi) aur API bills control mein rehte hain.

---

## 12. Common Mistakes & Gotchas

1. **Real API calls in unit tests**: Sabse common mistake. Agar `npm test` chalane ke liye `OPENAI_API_KEY` chahiye, tumhara test suite design galat hai.
2. **Exact string match on LLM output**: `expect(response.content).toBe("...")` sirf tab kaam karega jab tum `FakeListChatModel` use kar rahe ho. Real LLM ke against kabhi exact match mat karo — properties/patterns check karo.
3. **Not testing tool argument validation**: Agar LLM galat type ka argument bhej de (jaise string ki jagah number), Zod schema (chapter 07) us error ko catch karna chahiye — is path ko explicitly test karo.
4. **Ignoring graph state after interrupt**: Human-in-the-loop tests mein `getState()` check karna bhool jaana — sirf `invoke()` ka return value dekhna kaafi nahi hai.
5. **Flaky eval tests polluting CI**: LLM-as-judge tests kabhi kabhi borderline scores dete hain. Inhe apne main CI gate mein mat rakho — separate, non-blocking suite banao.
6. **Not resetting mocks between tests**: `vi.clearAllMocks()` ya `vi.resetAllMocks()` `beforeEach` mein daalna mat bhoolo, warna ek test ka mock state doosre test mein leak ho jaata hai.
7. **Testing implementation, not behavior**: `expect(model.invoke).toHaveBeenCalledWith(exact_internal_prompt)` jaisi tight assertions prompt ke thoda sa badalne pe bhi break ho jaati hain. Behavior test karo (kya sahi tool call hua, kya sahi route liya), exact internal prompt text nahi.

---

## Key Takeaways

- AI agents **non-deterministic** hote hain — isliye testing pyramid ko adapt karna padta hai: zyada unit + integration tests (mocked LLM), kam evaluation/E2E tests (real LLM).
- `FakeListChatModel` (from `@langchain/core/utils/testing`) sabse aasan tarika hai LLM calls ko deterministic banane ka — real API call ke bina.
- Tool calling test karne ke liye `AIMessage` ke `tool_calls` field ko mock karo; tool ki business logic ko LLM decision-making se **decouple** karke alag test karo.
- LangGraph graphs ko teen level pe test karo: node-level pure functions, full graph with mocked LLM, aur streaming/interrupt behavior.
- Jab exact match possible nahi (tone, quality, correctness), **property-based assertions** ya **LLM-as-judge** (temperature 0, threshold-based) use karo — inhe separate, non-blocking CI suite mein rakho.
- **Snapshot tests** prompt templates ke accidental drift ko pakadte hain — teammates ke changes CI mein turant dikh jaate hain.
- Retry/error-handling logic test karte waqt `vi.useFakeTimers()` use karo taaki backoff delays real time waste na karein.
- Human-in-the-loop graphs test karne ke liye `MemorySaver` checkpointer aur `getState()` use karo — sirf final output check karna kaafi nahi hai.
- CI pipeline ko split karo: fast mocked tests har PR pe (seconds mein), real-LLM eval suite sirf scheduled/nightly runs mein — cost aur speed dono control mein rehte hain.
- Golden rule: agar tumhara test suite chalane ke liye real API key chahiye, wo unit test nahi hai — architecture ko revisit karo.
