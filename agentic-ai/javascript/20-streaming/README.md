# Streaming in LangGraph

🟡 Intermediate

## Kya hota hai?

Chapter 2 mein humne dekha tha `.stream()` ek chat model ke upar — token-by-token output, jaise ChatGPT mein "typing effect" dikhta hai. Wo simple tha kyunki us chapter mein sirf **ek hi LLM call** thi. Ab socho tumhara LangGraph agent — Chapter 12-19 mein jo bana rahe the — mein kya-kya chal raha hota hai ek single `.invoke()` ke andar:

- Node 1: LLM call jo decide karta hai kaunsa tool chalana hai
- Node 2: Tool actually execute hota hai (jaise weather API call)
- Node 3: LLM phir se call hota hai, tool result ke saath, final answer banane ke liye
- Beech mein state update ho rahi hai, conditional edges decide kar rahe hain routing

Agar tum sirf `await app.invoke(input)` karte ho, user ko **kuch nahi dikhta** jab tak poora graph khatam na ho jaaye — koi typing effect nahi, koi "tool chal raha hai" wala indicator nahi, sirf ek blank screen aur phir achanak poora jawaab. Zomato app mein agar order place karne ke baad tumhe sirf ek spinner dikhe 30 second tak aur beech mein "restaurant ne accept kiya", "chef bana raha hai", "delivery boy nikal chuka hai" — kuch bhi update na aaye, to tumhe lagega app hang ho gaya.

**LangGraph Streaming** exactly yehi problem solve karta hai — graph ke execution ke **beech-beech mein**, real-time mein, alag-alag "granularity" par updates bhejna: kaunsa node chal raha hai, state kaise badal rahi hai, LLM token-by-token kya likh raha hai, kaunse custom progress messages tum khud emit karna chahte ho.

> [!info]
> LangGraph ka streaming, chat model ke `.stream()` se **zyada powerful aur layered** hai — kyunki graph mein multiple nodes, tools, aur sub-graphs ho sakte hain, aur tumhe control chahiye hota hai ki **kis level ka detail** chahiye: sirf final node outputs? Har token? Ya dono ek saath?

## Kyun zaruri hai in agent-building?

- **Perceived latency kam karna** — agent 5-10 second bhi le sakta hai (multiple LLM calls + tool calls ki wajah se). Bina streaming ke, ye 5-10 second "dead air" jaisa lagta hai. Streaming se user ko turant pata chalta hai "kuch ho raha hai".
- **Transparency / trust** — jab agent tools use kar raha ho (jaise "database query kar raha hoon", "web search chala raha hoon"), user ko dikhana ki **kya** ho raha hai, sirf "loading..." dikhane se zyada trust banata hai. IRCTC ki tarah — "PNR check ho raha hai" → "seat availability check ho rahi hai" → "payment process ho raha hai" — har step dikhna zaruri hai warna user refresh maar dega.
- **Multi-agent systems debug karna** — Chapter 18 ke multi-agent setups mein, streaming se dekh sakte ho kaunsa agent kab active hua, kisne kya decide kiya — bina streaming ke ye pura black-box lagta hai.
- **Production UI-friendly APIs** — Chapter 21 mein jab hum LangGraph ko ek API server ke peeche expose karenge, streaming hi wo mechanism hoga jisse frontend ko Server-Sent Events (SSE) ya WebSocket ke through real-time updates milenge.

> [!warning]
> Streaming sirf "UI ka sugar" nahi hai — production agents mein agar ek request 30+ second leta hai (jo common hai multi-step agentic workflows mein), bina streaming ke bahut se HTTP clients/load balancers **timeout** kar denge. Streaming se connection "alive" rehta hai kyunki data continuously flow ho raha hota hai.

---

## Setup

```bash
npm install @langchain/langgraph @langchain/core @langchain/openai zod
```

```ts
// env setup
// OPENAI_API_KEY=sk-...
```

Is chapter ke saare examples ke liye ek common graph banate hain — ek simple weather agent, jisme ek LLM node aur ek tool node hai:

```ts
import { ChatOpenAI } from "@langchain/openai";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import {
  StateGraph,
  MessagesAnnotation,
  START,
  END,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { AIMessage } from "@langchain/core/messages";

// ---------- Tool define karo ----------
const getWeather = tool(
  async ({ city }: { city: string }) => {
    // Mock API call — real project mein yaha actual weather API hoga
    return `${city} mein abhi 32°C hai, humidity 70%, halki baarish ho sakti hai.`;
  },
  {
    name: "get_weather",
    description: "Kisi bhi shehar ka current weather batata hai",
    schema: z.object({ city: z.string().describe("Shehar ka naam") }),
  }
);

const tools = [getWeather];
const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 }).bindTools(tools);

// ---------- Nodes ----------
async function callModel(state: typeof MessagesAnnotation.State) {
  const response = await model.invoke(state.messages);
  return { messages: [response] };
}

function shouldContinue(state: typeof MessagesAnnotation.State) {
  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
  return lastMessage.tool_calls?.length ? "tools" : END;
}

// ---------- Graph banake compile karo ----------
const graph = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addNode("tools", new ToolNode(tools))
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue, { tools: "tools", [END]: END })
  .addEdge("tools", "agent");

const app = graph.compile();
```

Isi `app` ko is poore chapter mein alag-alag streaming modes ke saath use karenge.

---

## `stream()` ke Streaming Modes — Overview

LangGraph.js ka `app.stream(input, config)` ek `mode` option leta hai jo decide karta hai **kya** stream hoga:

| Mode | Kya milta hai | Kab use karo |
|---|---|---|
| `"values"` | Har step ke baad **poora updated state** | Jab tumhe complete state snapshot chahiye har step pe |
| `"updates"` | Har node ne **kya change kiya** (sirf delta/diff) | Jab tumhe sirf ye dekhna hai kaunsa node kya return kar raha hai — debugging ke liye best |
| `"messages"` | LLM ke **tokens**, jaise-jaise generate hote hain | Jab UI mein ChatGPT-style typing effect chahiye |
| `"custom"` | Tumhare khud ke emit kiye hue **custom events** (progress %, status text) | Jab tumhe apna khud ka progress signal bhejna ho (jaise "step 2/5 chal raha hai") |
| `"debug"` | Sabse detailed — internal execution trace | Deep debugging, production mein rarely use hota |

Multiple modes ek saath bhi le sakte ho — array pass karke: `app.stream(input, { streamMode: ["updates", "messages"] })`.

> [!tip]
> Zyada tar production apps `"updates"` (node-level progress ke liye) aur `"messages"` (token streaming ke liye) — dono ka combination use karte hain.

---

## Mode 1: `"values"` — Poori State Har Step Pe

```ts
const stream = await app.stream(
  { messages: [{ role: "user", content: "Delhi ka weather kaisa hai?" }] },
  { streamMode: "values" }
);

for await (const chunk of stream) {
  // 'chunk' yaha poori state hai — is point tak jitne messages accumulate hue hain
  const lastMsg = chunk.messages[chunk.messages.length - 1];
  console.log("---STATE UPDATE---");
  console.log(lastMsg.content || lastMsg.tool_calls);
}
```

**Kya print hoga (roughly):**

```
---STATE UPDATE---
Delhi ka weather kaisa hai?          // initial human message
---STATE UPDATE---
[tool_call: get_weather(city=Delhi)] // AI ne tool call decide kiya
---STATE UPDATE---
Delhi mein abhi 32°C hai...          // tool ka result state mein aaya
---STATE UPDATE---
Delhi mein abhi 32°C hai, halki baarish ho sakti hai. Umbrella le lo!  // final AI answer
```

Har yield pe tumhe **poori state ka current snapshot** milta hai — chhota graph ho to theek hai, lekin agar state bahut bada hai (jaise 50 messages ka conversation history), to har step pe pura state bhejna wasteful ho sakta hai — is wajah se `"updates"` mode zyada common hai production mein.

---

## Mode 2: `"updates"` — Sirf Jo Badla

```ts
const stream = await app.stream(
  { messages: [{ role: "user", content: "Mumbai ka weather batao" }] },
  { streamMode: "updates" }
);

for await (const chunk of stream) {
  // chunk ka shape: { [nodeName]: partialStateReturnedByNode }
  for (const [nodeName, update] of Object.entries(chunk)) {
    console.log(`Node "${nodeName}" ne ye return kiya:`, update);
  }
}
```

**Output:**

```
Node "agent" ne ye return kiya: { messages: [ AIMessage { tool_calls: [...] } ] }
Node "tools" ne ye return kiya: { messages: [ ToolMessage { content: "Mumbai mein..." } ] }
Node "agent" ne ye return kiya: { messages: [ AIMessage { content: "Mumbai mein abhi..." } ] }
```

Ye mode **debugging aur progress-tracking** ke liye best hai — kyunki tumhe exactly pata chalta hai kaunsa node chala aur usne kya add/change kiya, bina puri state repeat kiye. Production mein agar tum frontend pe "Agent tool call kar raha hai..." jaisa status dikhana chahte ho, `"updates"` mode se node ka naam check karke wo message dikha sakte ho:

```ts
for await (const chunk of stream) {
  if (chunk.tools) {
    sendToFrontend({ status: "Weather check kar raha hoon..." });
  }
  if (chunk.agent) {
    sendToFrontend({ status: "Jawaab taiyar kar raha hoon..." });
  }
}
```

---

## Mode 3: `"messages"` — Token-by-Token LLM Streaming

Ye wahi ChatGPT-style typing effect deta hai, lekin ab poore graph ke andar — matlab agar graph mein 2 LLM calls hain (ek tool decide karne ke liye, ek final answer ke liye), dono ke tokens milenge, tagged with **kaunse node se aaye**:

```ts
const stream = await app.stream(
  { messages: [{ role: "user", content: "Pune ka weather batao aur ek chhota tip do" }] },
  { streamMode: "messages" }
);

for await (const [messageChunk, metadata] of stream) {
  // messageChunk: AIMessageChunk (token/chunk of text)
  // metadata: { langgraph_node: "agent", ... } — kaunse node se aaya
  if (messageChunk.content) {
    process.stdout.write(messageChunk.content as string);
  }
}
```

**Kya hota hai internally:** jab `agent` node ke andar `model.invoke()` chalta hai, LangGraph automatically us LLM call ke tokens ko bhi stream kar deta hai bahar — tumhe apne node ke andar kuch alag se karne ki zarurat nahi (jab tak tum standard chat model use kar rahe ho).

> [!warning]
> Agar tumhara node ek **tool** hai (LLM nahi), `"messages"` mode mein us node se koi token nahi aayega — sirf LLM-calling nodes se tokens aate hain. Tool ka output `"updates"` mode se milega.

`metadata.langgraph_node` se filter kar sakte ho — jaise agar tumhe sirf final answer ke tokens chahiye (intermediate "tool decide karne wale" LLM call ke tokens nahi):

```ts
for await (const [messageChunk, metadata] of stream) {
  if (metadata.langgraph_node === "agent" && messageChunk.content) {
    process.stdout.write(messageChunk.content as string);
  }
}
```

Isse tum "thinking" tokens ko UI se hide kar sakte ho aur sirf user-facing final response stream kar sakte ho — jaise Swiggy app mein "restaurant confirm kar raha hai" wala internal step chhupa deta hai, sirf final "order confirmed!" dikhata hai.

---

## Mode 4: `"custom"` — Apne Khud Ke Progress Events

Kabhi-kabhi tumhe LangGraph ke built-in modes se zyada control chahiye hota hai — jaise ek node ke andar ek lambi-chalne wali loop hai (100 documents process ho rahe hain), aur tum har 10 documents pe progress bhejna chahte ho. Iske liye `LangGraphRunnableConfig` ke andar milne wale writer function ka use hota hai:

```ts
import { LangGraphRunnableConfig } from "@langchain/langgraph";

async function processDocuments(
  state: typeof MessagesAnnotation.State,
  config: LangGraphRunnableConfig
) {
  const docs = ["doc1", "doc2", "doc3", "doc4", "doc5"];

  for (let i = 0; i < docs.length; i++) {
    await doSomeWork(docs[i]); // mock processing

    // Custom event emit karo — sirf "custom" mode mein hi consume hoga
    config.writer?.({
      progress: `${i + 1}/${docs.length} documents processed`,
    });
  }

  return { messages: [{ role: "assistant", content: "Sab documents process ho gaye!" }] };
}
```

Consume karte waqt:

```ts
const stream = await app.stream(input, { streamMode: "custom" });

for await (const chunk of stream) {
  console.log("Progress update:", chunk.progress);
}
```

**Real use-case:** ek RAG pipeline (Chapter 9) jahan 50 documents embed ho rahe hain, ya ek batch-processing agent jo IRCTC jaisa hai — "150 mein se 40 tickets check ho gaye" jaisa progress bar dikhana. Bina `"custom"` mode ke, tumhe ya to poora wait karna padta (koi progress nahi) ya fake progress bar banana padta.

---

## Multiple Modes Ek Saath

```ts
const stream = await app.stream(
  { messages: [{ role: "user", content: "Chennai ka weather batao" }] },
  { streamMode: ["updates", "messages"] }
);

for await (const [mode, chunk] of stream) {
  if (mode === "updates") {
    console.log("STATE UPDATE:", chunk);
  } else if (mode === "messages") {
    const [messageChunk] = chunk;
    process.stdout.write(messageChunk.content as string || "");
  }
}
```

Jab tum multiple modes pass karte ho, har yield ek `[mode, chunk]` tuple hota hai — pehla element batata hai kaunse mode ka data hai. Ye pattern production mein bahut common hai: `"messages"` se live typing effect UI mein dikhao, aur `"updates"` se backend logs/analytics mein node-level trace maintain karo — dono simultaneously.

---

## `streamEvents()` — Sabse Granular Control

`stream()` ke alawa LangGraph.js (LangChain Runnable interface se inherited) ek aur method deta hai — `streamEvents()`. Ye har **internal event** ka access deta hai — chat model start/end, tool start/end, chain start/end — event-driven style mein:

```ts
const eventStream = app.streamEvents(
  { messages: [{ role: "user", content: "Bangalore ka weather batao" }] },
  { version: "v2" }
);

for await (const event of eventStream) {
  switch (event.event) {
    case "on_chat_model_stream":
      // LLM token-by-token
      const content = event.data.chunk.content;
      if (content) process.stdout.write(content);
      break;

    case "on_tool_start":
      console.log(`\n[Tool shuru hua]: ${event.name}, input:`, event.data.input);
      break;

    case "on_tool_end":
      console.log(`[Tool khatam hua]: ${event.name}, output:`, event.data.output);
      break;

    case "on_chain_end":
      if (event.name === "LangGraph") {
        console.log("\n[Poora graph complete ho gaya]");
      }
      break;
  }
}
```

**`stream()` vs `streamEvents()` — kab kaunsa use karo:**

| | `stream()` | `streamEvents()` |
|---|---|---|
| Granularity | Node-level (`updates`/`values`) ya token-level (`messages`) | Sabse fine-grained — har internal component ka event |
| Complexity | Simpler, most use-cases ke liye kaafi | Zyada verbose, but zyada control |
| Best for | Standard UI updates, progress tracking | Custom middleware, detailed observability, tool-call-specific UI (jaise "Tool X chal raha hai" ka alag animation) |

> [!tip]
> Zyadatar production agents ke liye `stream()` ke `"messages"` aur `"updates"` modes hi kaafi hote hain. `streamEvents()` tab use karo jab tumhe **tool-level ya sub-chain-level** granularity chahiye ho — jaise agar ek tool khud ek LLM call kar raha hai andar, aur tumhe us nested call ka bhi alag se track chahiye.

---

## Real-World Pattern: Streaming ko API Response Mein Convert Karna

Chapter 21 mein hum LangGraph ko poori tarah se ek Express API ke peeche expose karenge, lekin yaha ek preview — kaise `stream()` ka output ek **Server-Sent Events (SSE)** response ban sakta hai:

```ts
import express from "express";

const app_ = express();
app_.use(express.json());

app_.post("/chat/stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const { message } = req.body;

  try {
    const stream = await app.stream(
      { messages: [{ role: "user", content: message }] },
      { streamMode: "messages" }
    );

    for await (const [messageChunk, metadata] of stream) {
      if (metadata.langgraph_node === "agent" && messageChunk.content) {
        // Har token ko SSE event ki tarah frontend ko bhejo
        res.write(`data: ${JSON.stringify({ token: messageChunk.content })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
  } catch (err) {
    console.error("Streaming error:", err);
    res.write(`data: ${JSON.stringify({ error: "Kuch galat ho gaya" })}\n\n`);
  } finally {
    res.end();
  }
});
```

Frontend (React) side pe isko `EventSource` ya `fetch` + `ReadableStream` se consume kiya jaata hai — jaise WhatsApp Web mein messages real-time aate hain, waise hi tokens yaha aayenge.

---

## Gotchas aur Common Mistakes

1. **`bindTools()` bhool jaana aur phir confuse hona ki tool calls stream kyun nahi ho rahe** — agar model ko tools bind nahi kiye, wo kabhi tool_calls generate hi nahi karega, aur `"messages"` mode mein sirf plain text tokens dikhenge.

2. **`"messages"` mode mein tool-node ke tokens dhoondhna** — jaisa upar bataya, tool nodes LLM nodes nahi hote, unka output `"messages"` mode mein nahi aata. Confusion hone par `"updates"` mode check karo.

3. **Streaming ke error-handling ko skip karna** — agar beech mein LLM API fail ho jaaye ya network toot jaaye, `for await` loop throw karega. Production mein hamesha try/catch/finally lagao, aur client ko graceful error event bhejo (upar wale SSE example jaisa).

4. **`streamMode` na batana aur default behavior se confuse hona** — agar `streamMode` specify nahi karoge, default `"values"` hota hai. Explicitly likhna better hai — code padhne wale ko turant pata chalega intent kya hai.

5. **Multiple modes ka tuple-shape bhool jaana** — jab array of modes pass karte ho, chunk `[mode, data]` tuple hota hai; single mode mein direct `data` milta hai. Ye mismatch bahut common runtime bug hai (destructuring error).

6. **Custom writer ko non-custom mode mein use karna** — `config.writer?.(...)` sirf `"custom"` streamMode active hone par consume hota hai; agar tum `"updates"` mode use kar rahe ho, wo custom events silently drop ho jaayenge (writer khud fail nahi hota, bas consumer side pe kuch nahi aata).

7. **Frontend timeout na badhana** — agar tumhara agent genuinely lamba chal sakta hai (jaise multi-agent workflow, Chapter 18), to bhale hi tokens stream ho rahe hon, kuch reverse proxies (Nginx, load balancers) ka apna idle-timeout hota hai — production mein ye configure karna padta hai warna connection beech mein drop ho jaata hai.

---

## Production Considerations

| Concern | Kya karo |
|---|---|
| **Backpressure** | Agar client slow hai (jaise mobile pe weak network), server-side buffer build ho sakta hai. SSE/WebSocket libraries ka built-in backpressure handling use karo, raw sockets khud mat likho |
| **Partial failures** | Agar graph beech mein fail ho (ek node throw kare), abhi tak stream hue tokens client ko already mil chuke hain — ek clear "error" event bhejo taaki frontend UI ko sahi se end kar sake, half-finished message ko permanent na dikhaye |
| **Cost tracking** | Streaming mode mein bhi `usage_metadata` final chunk mein milta hai (provider-dependent) — token accumulate karke cost calculate karo, jaise Chapter 2 mein dekha tha |
| **Multiple concurrent streams** | Agar ek server multiple users ko stream kar raha hai, har request ka apna independent `AsyncIterable` hota hai — Node.js ka event loop ye handle kar leta hai, lekin memory/CPU-heavy nodes (jaise embeddings) queue/worker pool se manage karo |
| **Observability** | Streaming events ko bhi apne tracing system (Chapter 10 — LangSmith) mein log karo, taaki production issues (jaise "user X ko response aadha mila") debug ho sakein |

---

## Key Takeaways

- LangGraph ka `app.stream()` graph ke execution ke beech real-time updates deta hai — poore multi-node, multi-LLM-call agent ke andar, sirf ek chat model call ke bajaye.
- `"values"` — har step pe poori state; `"updates"` — sirf har node ka delta (debugging/progress ke liye best); `"messages"` — LLM tokens, node-metadata ke saath tagged; `"custom"` — apne khud ke progress events emit karne ke liye.
- `metadata.langgraph_node` se filter karke sirf specific node (jaise final-answer-generating node) ke tokens UI ko dikha sakte ho, intermediate "thinking" tokens chhupa sakte ho.
- Multiple `streamMode` array mein pass karne par chunk `[mode, data]` tuple ban jaata hai — single mode mein direct data.
- `streamEvents()` sabse granular hai — chat model, tool, chain ke individual start/end events milte hain — production middleware aur detailed observability ke liye useful, lekin zyadatar cases mein `stream()` hi kaafi hai.
- Production mein streaming ko SSE (ya WebSocket) API response mein convert karke frontend ko real-time bhejna hota hai — Chapter 21 mein isko poora API server ke saath dekhenge.
- Common mistakes: tool nodes ke tokens `"messages"` mode mein dhoondhna, error-handling skip karna, streamMode ka default behavior bhool jaana, aur reverse-proxy timeouts ko production mein na badhana.
