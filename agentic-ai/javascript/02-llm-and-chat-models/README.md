# LLMs and Chat Models

🟢 Beginner

## Kya hota hai?

Chalo ek simple sawaal se shuru karte hain — jab tum ChatGPT ya Claude ko kuch poochte ho, backend mein asal mein ho kya raha hai?

Socho ek second ke liye — tumhara message ek text hai. Model us text ko padhta hai, aur predict karta hai ki "is sentence ke baad sabse likely agla word/token kya hoga". Fir wo ek-ek token generate karta jaata hai jab tak jawab complete na ho jaaye. Bas itna hi hai — ek **super powerful autocomplete**, jisko itna training data aur fine-tuning mila hai ki wo reasoning, coding, conversation sab kar leta hai.

Ab LangChain.js ke context mein do cheezein samajhni zaroori hain:

1. **LLM (raw text completion)** — purana style. Ek plain text string andar do, ek plain text string bahar aata hai. Jaise IRCTC ka purana "Tatkal booking" system — bas ek text field, koi structure nahi.
2. **Chat Model (message-based)** — modern style. Yeh messages ka ek **array** leta hai — har message ka ek "role" hota hai (`system`, `human`/`user`, `assistant`, `tool`) — aur ek naya assistant message return karta hai. Jaise Zomato support chat — jahan har message ke saath pata hota hai ki yeh customer ne bheja, ya support bot ne, ya "system instructions" hain jo bot ko sikhayi gayi hain.

> [!info]
> Aaj (2026 mein) LangChain.js mein **almost sabhi production use-cases Chat Models use karte hain** — OpenAI, Anthropic, Google, Mistral sab providers ne ab chat-style interface standard bana diya hai. Raw "LLM" wrapper class (`OpenAI` from `@langchain/openai`) legacy completion models (jaise `gpt-3.5-turbo-instruct`) ke liye hai — naye projects mein tumhe iski zaroorat shayad hi padegi.

## Kyun zaroori hai agent-building ke liye?

Poora Agentic AI course isi ek building block pe khada hai. Agent ka core loop hota hai:

```
System prompt (agent ka role/rules)
  + Conversation history (pichle messages)
  + Tool results (agar tools call hue)
  → Chat Model → Agla decision/response
```

Yani agar tumhe LangGraph mein multi-step agents banane hain (jo aage ke chapters mein karenge), toh Chat Model ka message-format, streaming, aur configuration options — yeh sab foundation hai. Isko skip karke seedha agents pe jaana aisa hai jaise SQL seekhe bina Prisma/TypeORM use karna — chalega thoda, par jab error aayega toh samajh nahi aayega kyun.

---

## Setup: Packages Install Karna

LangChain.js mein har provider ka apna separate package hai (monorepo structure hai):

```bash
npm install @langchain/openai @langchain/anthropic @langchain/core dotenv
```

- `@langchain/core` — saare base types/interfaces (`ChatOpenAI`, `ChatAnthropic` dono isi ke `BaseChatModel` interface ko implement karte hain)
- `@langchain/openai` — OpenAI ke models (`gpt-4o`, `gpt-4o-mini`, etc.)
- `@langchain/anthropic` — Anthropic ke models (`claude-sonnet-4-5`, `claude-haiku-4-5`, etc.)

`.env` file banao:

```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

TypeScript project ho toh `tsconfig.json` mein `"module": "NodeNext"` aur `"moduleResolution": "NodeNext"` rakhna — LangChain.js ESM-first hai.

---

## Message Types — TypeScript ke saath

LangChain.js mein messages ke liye classes milti hain `@langchain/core/messages` se. Yeh Zomato order ki tarah socho — har message ek "role" ke saath tagged hota hai:

| Message Class | Role | Kab use karein |
|---|---|---|
| `SystemMessage` | `system` | Agent ko instructions/persona dene ke liye — jaise restaurant ko order se pehle "no onion no garlic" bata dena |
| `HumanMessage` | `human` | User ka input |
| `AIMessage` | `ai` | Model ka response (agar tum manually conversation history bana rahe ho) |
| `ToolMessage` | `tool` | Kisi tool call ka result wapas model ko dena (Chapter 7 mein detail mein aayega) |

```typescript
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";

const messages = [
  new SystemMessage(
    "Tum ek helpful coding assistant ho jo Hinglish mein jawab deta hai."
  ),
  new HumanMessage("TypeScript mein interface aur type mein kya farak hai?"),
];
```

> [!tip]
> Simple cases mein tum plain objects (tuples) bhi use kar sakte ho — LangChain inhe automatically convert kar deta hai:
> ```typescript
> const messages = [
>   ["system", "Tum ek helpful assistant ho."],
>   ["human", "Namaste!"],
> ];
> ```
> Yeh quick prototyping ke liye theek hai, par production code mein explicit classes use karo — type-safety aur readability dono better milti hai.

---

## ChatOpenAI Class — Step by Step

### 1. Basic Setup

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import "dotenv/config";

const model = new ChatOpenAI({
  model: "gpt-4o-mini",      // model ka naam
  temperature: 0.7,           // creativity control (0 = deterministic, 1+ = random)
  maxTokens: 1024,            // response ki max length
  apiKey: process.env.OPENAI_API_KEY, // agar env var already set hai toh optional
});

const response = await model.invoke([
  new SystemMessage("Tum ek Hinglish mein baat karne wala tech mentor ho."),
  new HumanMessage("Agentic AI kya hota hai, ek line mein samjhao."),
]);

console.log(response.content);
// "Agentic AI wo systems hote hain jo khud decide karke multi-step tasks
//  complete karte hain — bina har step pe insaan se poochhe."
```

`response` ek `AIMessage` object hai, plain string nahi. Isme `.content` ke alawa aur bhi useful cheezein hoti hain (`usage_metadata`, `response_metadata`, `tool_calls` etc.) — yeh aage ke chapters mein use hongi.

### 2. Important Constructor Options

```typescript
const model = new ChatOpenAI({
  model: "gpt-4o",
  temperature: 0,        // deterministic output — production/agents ke liye recommended
  maxTokens: 2048,
  timeout: 30_000,        // ms — kitni der wait karna hai response ke liye
  maxRetries: 2,          // rate-limit/network error pe kitni baar retry
  apiKey: process.env.OPENAI_API_KEY,
});
```

> [!warning]
> `temperature: 0` ka matlab "100% deterministic" nahi hota — floating-point aur GPU non-determinism ki wajah se same input pe thoda variation aa sakta hai. Par agents/tool-calling ke liye `temperature` low (0 ya 0.1-0.2) rakhna best practice hai — warna model random tool choose karne lagta hai.

---

## ChatAnthropic Class — Step by Step

Same pattern, bas class aur model names alag:

```typescript
import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import "dotenv/config";

const model = new ChatAnthropic({
  model: "claude-sonnet-4-5",
  temperature: 0.5,
  maxTokens: 1024,
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const response = await model.invoke([
  new SystemMessage("Tum ek concise technical writer ho."),
  new HumanMessage("LangGraph aur LangChain mein kya farak hai?"),
]);

console.log(response.content);
```

> [!info]
> Anthropic ke API mein `system` message technically ek separate top-level parameter hai (message array ka part nahi) — lekin LangChain.js yeh abstraction handle kar leta hai. Tum `SystemMessage` normally array mein use kar sakte ho, LangChain internally usse sahi jagah bhejta hai. Yeh ek achha example hai ki LangChain kyun exist karta hai — **provider-specific quirks ko ek common interface ke peeche chhupa deta hai.**

### Provider-Agnostic Code Likhna

Yeh LangChain ka sabse bada selling point hai — dono classes same `BaseChatModel` interface follow karti hain, isliye tum easily switch kar sakte ho:

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

function getModel(provider: "openai" | "anthropic"): BaseChatModel {
  if (provider === "openai") {
    return new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });
  }
  return new ChatAnthropic({ model: "claude-sonnet-4-5", temperature: 0 });
}

// Aage ka code bilkul same rahega, chahe koi bhi provider ho
const model = getModel("anthropic");
const res = await model.invoke("Ek haiku likho chai pe.");
```

Yeh bilkul waisa hi hai jaise tum Node.js mein ek `PaymentGateway` interface bana lo aur Razorpay ya Stripe dono ko swap kar sako bina baaki business logic touch kiye.

---

## Invocation Methods — `.invoke()`, `.stream()`, `.batch()`

Chat model object pe teen main methods milte hain. Sabka use-case alag hai:

### `.invoke()` — Single Request, Poora Response Ek Saath

```typescript
const response = await model.invoke("2 + 2 kitna hota hai?");
console.log(response.content); // "2 + 2 = 4"
```

Simplest form — jab tumhe pura response ek saath chahiye (background jobs, scripts, non-UI use-cases).

### `.stream()` — Token-by-Token Streaming

UI mein jab tum ChatGPT jaisa "typing effect" dikhana chahte ho — jaise WhatsApp mein "typing..." dikhta hai lekin yahan actual content chunk-by-chunk aata hai:

```typescript
const stream = await model.stream("Ek chhoti kahani likho ek dabbawala ke baare mein.");

for await (const chunk of stream) {
  process.stdout.write(chunk.content as string);
}
```

> [!tip]
> Production chat apps (jaise ChatGPT clone) mein streaming zaroori hai — user ko turant feedback milta hai, perceived latency kam lagti hai. Full response ka wait karna (especially 500+ token responses) UX ko bura bana deta hai.

### `.batch()` — Multiple Independent Requests Parallel Mein

```typescript
const questions = [
  "Python mein list comprehension kya hai?",
  "TypeScript mein generic kya hote hain?",
  "Node.js event loop kaise kaam karta hai?",
];

const responses = await model.batch(questions);

responses.forEach((res, i) => {
  console.log(`Q${i + 1}:`, res.content);
});
```

`.batch()` internally concurrent requests bhejta hai (with a configurable concurrency limit) — jaise ek saath 3 Swiggy orders alag-alag restaurants ko bhej dena instead of ek-ek karke.

```typescript
// Concurrency control karna ho toh:
const responses = await model.batch(questions, { maxConcurrency: 2 });
```

---

## Streaming Deep-Dive: `AIMessageChunk` aur Aggregation

Jab tum `.stream()` use karte ho, har chunk ek `AIMessageChunk` hota hai — yeh chunks **addable** hote hain (LangChain mein `+` operator overload jaisa concept hai):

```typescript
import { AIMessageChunk } from "@langchain/core/messages";

const stream = await model.stream("LangGraph.js kya hai, 3 lines mein.");

let full: AIMessageChunk | undefined;
for await (const chunk of stream) {
  full = full ? full.concat(chunk) : chunk;
}

console.log(full?.content);       // poora accumulated response
console.log(full?.usage_metadata); // token usage (agar provider stream ke end mein bhejta hai)
```

Yeh pattern tab kaam aata hai jab tumhe streaming bhi chahiye UI ke liye, AUR final complete message bhi chahiye (jaise database mein save karne ke liye, ya conversation history mein append karne ke liye).

---

## Structured Options: `bind()` aur Runtime Config

Chat model ka ek instance banane ke baad bhi tum kuch options **per-call** override kar sakte ho, `.bind()` ke through:

```typescript
const model = new ChatOpenAI({ model: "gpt-4o-mini" });

const strictModel = model.bind({
  temperature: 0,
  stop: ["\n\n"], // stop sequence — is text pe generation ruk jaayegi
});

const res = await strictModel.invoke("List 3 JavaScript array methods.");
```

Yeh useful hai jab ek hi base model se tumhe alag-alag configuration wale "variants" chahiye (jaise ek "creative" variant aur ek "strict/deterministic" variant), bina naya object baar-baar banaye.

---

## Token Usage aur Cost Tracking

Production mein cost track karna critical hai — LLM calls free nahi hote! Har response mein usage metadata milta hai:

```typescript
const response = await model.invoke("Explain recursion in one paragraph.");

console.log(response.usage_metadata);
// {
//   input_tokens: 12,
//   output_tokens: 87,
//   total_tokens: 99
// }
```

> [!warning]
> **Cost ka andaza lagao production mein jaane se pehle.** Example: agar `gpt-4o-mini` ka input $0.15/1M tokens aur output $0.60/1M tokens hai, aur tumhara agent ek request mein 5 LLM calls karta hai (tool-calling loop ki wajah se), toh 10,000 daily users pe yeh cost jaldi badh sakti hai. Isiliye:
> - Chhote tasks ke liye chhote/cheaper models use karo (`gpt-4o-mini`, `claude-haiku-4-5`)
> - Complex reasoning ke liye bade models save karo (`gpt-4o`, `claude-sonnet-4-5`, `claude-opus-4-5`)
> - `maxTokens` hamesha set karo — warna ek runaway response bill bada kar sakta hai

---

## Common Mistakes aur Gotchas

1. **API key hardcode karna** — kabhi bhi `apiKey: "sk-..."` directly code mein mat likho. Hamesha `.env` + `dotenv` use karo, aur `.env` ko `.gitignore` mein rakho.

2. **`temperature` bahut high rakhna agents ke liye** — agent/tool-calling workflows mein `temperature: 0.8+` rakhoge toh model random tools call karega ya JSON format todega. Agents ke liye `0` se `0.3` range safe hai.

3. **`.content` ko hamesha string maan lena** — kuch providers/models (especially multi-modal responses ya tool calls ke saath) `content` ko array bhi return kar sakte hain (text + image blocks). Production code mein type-check karo:

```typescript
function getTextContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((block: any) => block.type === "text")
      .map((block: any) => block.text)
      .join("");
  }
  return "";
}
```

4. **Timeout aur retries configure na karna** — network flaky ho sakta hai, ya provider ka rate limit lag sakta hai. `maxRetries` aur `timeout` set karna production apps ke liye non-negotiable hai.

5. **System message ko conversation ke beech mein daalna** — `SystemMessage` hamesha array ke **start** mein honi chahiye. Beech mein daalne se kuch providers confuse ho sakte hain ya ignore kar sakte hain.

6. **Streaming ke error-handling ko bhool jaana** — agar network beech mein toot jaaye, `for await` loop crash ho sakta hai. Production mein try/catch zaroor lagao:

```typescript
try {
  const stream = await model.stream("...");
  for await (const chunk of stream) {
    process.stdout.write(chunk.content as string);
  }
} catch (err) {
  console.error("Streaming failed, falling back:", err);
  const res = await model.invoke("...");
  console.log(res.content);
}
```

---

## Full Runnable Example — Dono Providers ke Saath

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import "dotenv/config";

async function askBothModels(question: string) {
  const openaiModel = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0.3,
    maxTokens: 512,
  });

  const anthropicModel = new ChatAnthropic({
    model: "claude-sonnet-4-5",
    temperature: 0.3,
    maxTokens: 512,
  });

  const messages = [
    new SystemMessage(
      "Tum ek helpful assistant ho jo short, precise Hinglish jawab deta hai."
    ),
    new HumanMessage(question),
  ];

  const [openaiRes, anthropicRes] = await Promise.all([
    openaiModel.invoke(messages),
    anthropicModel.invoke(messages),
  ]);

  console.log("--- OpenAI (gpt-4o-mini) ---");
  console.log(openaiRes.content);
  console.log("Tokens used:", openaiRes.usage_metadata?.total_tokens);

  console.log("\n--- Anthropic (claude-sonnet-4-5) ---");
  console.log(anthropicRes.content);
  console.log("Tokens used:", anthropicRes.usage_metadata?.total_tokens);
}

askBothModels("LangGraph.js state machine kaise kaam karta hai, 2 lines mein?");
```

Isko run karo:

```bash
npx tsx index.ts
```

Dono providers ka output side-by-side dekhoge — yeh exercise tumhe practically dikhata hai ki interface same hai, sirf underlying model/behavior alag hai.

---

## Key Takeaways

- **Chat Models** (`ChatOpenAI`, `ChatAnthropic`) modern LangChain.js standard hain — yeh messages ka array leti hain (`SystemMessage`, `HumanMessage`, `AIMessage`, `ToolMessage`) aur ek `AIMessage` return karti hain. Legacy "LLM" (raw text) classes naye projects mein avoid karo.
- Dono providers `BaseChatModel` interface implement karte hain — isliye code provider-agnostic likha ja sakta hai, sirf constructor swap karke.
- Teen main invocation methods: `.invoke()` (single, full response), `.stream()` (token-by-token, UI ke liye best), `.batch()` (parallel independent requests).
- Streaming chunks (`AIMessageChunk`) addable hote hain — `.concat()` se poora message reconstruct kar sakte ho.
- `temperature`, `maxTokens`, `timeout`, `maxRetries` — yeh sab constructor options production reliability aur cost control ke liye critical hain.
- `usage_metadata` se token consumption track karo — agents mein multiple LLM calls hote hain, cost jaldi badh sakti hai agar model choice aur `maxTokens` sahi na ho.
- Common mistakes: hardcoded API keys, high temperature agents mein, `.content` ko blindly string maan lena, aur streaming mein error-handling na hona — production mein yeh sab bugs bante hain.
