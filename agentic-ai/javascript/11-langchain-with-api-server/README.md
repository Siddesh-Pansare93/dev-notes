# Serving a Chain/Agent Behind an API Server

🟡 Intermediate

## Kya hota hai?

Ab tak humne jo bhi banaya — chains (Chapter 5), memory (Chapter 6), tools (Chapter 7), agent (Chapter 8), RAG (Chapter 9) — sab kuch tumhare terminal mein chal raha tha. `npx tsx script.ts` chalao, console mein output dekho, khatam.

Lekin real duniya mein koi bhi terminal se tumhara AI feature use nahi karega. Tumhara React frontend, mobile app, ya koi third-party service — sabko ek **HTTP endpoint** chahiye jise wo call kar sake: `POST /api/chat`. Ye chapter bilkul yehi karta hai — humara LangChain chain/agent ek **Express API server** ke peeche khada karte hain, taaki koi bhi client usse HTTP se baat kar sake.

Socho Zomato ka backend — jab tum app mein "Order Now" dabate ho, tumhara phone kisi terminal script ko call nahi karta. Wo ek API endpoint (`POST /api/orders`) ko hit karta hai, jiske peeche pura order-processing logic chal raha hota hai. Bilkul waisi hi cheez humein apne LLM chain ke liye chahiye — ek **stable HTTP contract** jiske peeche chahe simple chain ho ya complex multi-tool agent, client ko farak nahi padta.

Doosri important cheez jo is chapter mein cover hogi — **streaming**. Jab ChatGPT ya Claude ka UI tumhe response word-by-word type hote dikhata hai, wo ek poori response wait nahi kar raha — wo tokens **stream** ho rahe hain server se browser tak, real-time mein. Hum ye **Server-Sent Events (SSE)** se implement karenge, jo HTTP streaming ka sabse simple aur widely-supported tareeka hai.

## Kyun zaruri hai in agent-building?

Ye chapter tumhare LangChain knowledge ko "demo script" se "production-usable service" mein convert karta hai. Bina isके:

- Tumhara agent sirf tumhare laptop pe kaam karega, kisi aur ke liye nahi
- Har request LLM ka poora response wait karegi — jo 5-10 second ka blank loading spinner dega (bad UX, especially agentic workflows mein jaha multiple tool calls hote hain)
- Multiple users simultaneously request nahi bhej payenge (concurrency handle nahi hogi)

Is chapter ke baad tumhare paas ek **reusable pattern** hoga jo Chapter 21 (LangGraph ke saath API server) mein bhi wahi core ideas ke saath aayega — bas underlying orchestration LangGraph ki hogi.

> [!info]
> Ye chapter Express-focused hai kyunki ye sabse framework-agnostic aur samajhne mein easiest hai. Ek Next.js Route Handler version bhi neeche diya gaya hai taaki tumhe pata chale concepts kaise translate hote hain.

---

## Project Setup

```bash
mkdir langchain-api-server && cd langchain-api-server
npm init -y
npm install express langchain @langchain/openai @langchain/core zod dotenv cors
npm install -D typescript tsx @types/express @types/node @types/cors
npx tsc --init
```

```bash
# .env
OPENAI_API_KEY=sk-...
PORT=4000
```

Folder structure jo hum banayenge:

```
langchain-api-server/
  src/
    chain.ts       # LLM chain/agent definition (business logic)
    server.ts      # Express app + routes
  .env
  tsconfig.json
  package.json
```

> [!tip]
> Chain/agent logic ko **routes se alag file mein** rakho. Ye separation of concerns hai — kal agar tumhe LangChain se LangGraph pe switch karna ho (Chapter 21), sirf `chain.ts` badalta hai, `server.ts` untouched rehta hai.

---

## Step 1: Chain Define Karo

Ek simple par realistic example lete hain — ek **"Swiggy Food Recommender" chain** jo user ki query lekar food suggestion deta hai, with streaming support built in.

```ts
// src/chain.ts
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

const model = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0.7,
  streaming: true, // zaruri hai taaki .stream() token-by-token chunks de
});

const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "Tum ek friendly food recommendation assistant ho, Swiggy jaisi app ke liye. " +
      "User ki mood/craving sunkar 2-3 dish suggestions do, short aur crisp jawab do.",
  ],
  ["human", "{query}"],
]);

// LCEL chain: prompt -> model -> string output
export const foodRecommenderChain = prompt
  .pipe(model)
  .pipe(new StringOutputParser());
```

Ye chain humne Chapter 5 mein dekha tha — kuch naya nahi. Naya part ab aata hai: **isko HTTP ke peeche expose karna.**

---

## Step 2: Non-Streaming Endpoint (Simple Version)

Sabse pehle sabse simple version banate hain — jaha client poore response ka wait karta hai (jaisa traditional REST API karta hai).

```ts
// src/server.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { foodRecommenderChain } from "./chain.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/recommend", async (req, res) => {
  const { query } = req.body;

  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "`query` field required (string)" });
  }

  try {
    const result = await foodRecommenderChain.invoke({ query });
    res.json({ result });
  } catch (err) {
    console.error("Chain error:", err);
    res.status(500).json({ error: "Kuch galat ho gaya, dobara try karo." });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server chal raha hai: http://localhost:${PORT}`);
});
```

Test karo:

```bash
curl -X POST http://localhost:4000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{"query": "kuch spicy aur north indian chahiye"}'
```

Response:
```json
{ "result": "Yahan kuch spicy North Indian options hain:\n1. Butter Chicken (medium-spicy)\n2. Kadai Paneer\n3. Amritsari Chole" }
```

Ye kaam karta hai, lekin problem ye hai — agar LLM response generate hone mein 6 second lagte hain, to user 6 second tak **kuch nahi dekhega**, phir achanak poora paragraph aa jayega. Chatbot jaisa feel nahi aata. Isliye streaming chahiye.

---

## Step 3: Streaming Kyun Zaruri Hai

> [!info]
> **Streaming ka fayda sirf "cool dikhna" nahi hai** — ye perceived latency kam karta hai. User ko pehla token milte hi lagta hai "system respond kar raha hai," bhale hi poora jawab 5 second baad complete ho. Ye especially agentic workflows mein critical hai jaha agent multiple tool calls kar sakta hai aur total time 10-15 second tak ja sakta hai.

Do bade options hain real-time data client ko bhejne ke:

| Approach | Kya hai | Kab use karo |
|---|---|---|
| **Server-Sent Events (SSE)** | Ek-tarफा (server → client) HTTP stream, plain `text/event-stream` | LLM token streaming ke liye industry-standard — simple, HTTP-native, koi extra protocol nahi |
| **WebSockets** | Do-tarफा (bidirectional) full-duplex connection | Jab client ko bhi bar-bar server ko push karna ho (jaise collaborative editing) — LLM chat ke liye usually overkill |

Chat/agent responses ke liye **SSE hi standard choice hai** — OpenAI, Anthropic, sab providers apne streaming APIs SSE se hi expose karte hain. Hum bhi wahi pattern follow karenge.

---

## Step 4: SSE Endpoint Banate Hain

SSE ka core idea simple hai — HTTP response ko **band mat karo**, usko khula rakho aur chunks bhejte raho is format mein:

```
data: {"token": "Yahan"}

data: {"token": " kuch"}

data: {"token": " suggestions"}

data: [DONE]

```

Har event `data: ` se start hota hai aur do newlines (`\n\n`) se end hota hai.

```ts
// src/server.ts (updated with streaming route)
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { foodRecommenderChain } from "./chain.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/recommend/stream", async (req, res) => {
  const { query } = req.body;

  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "`query` field required (string)" });
  }

  // --- SSE headers set karo ---
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders(); // headers turant bhej do, body ka wait mat karo

  // Client ne connection band kiya to hum bhi rok de
  let clientDisconnected = false;
  req.on("close", () => {
    clientDisconnected = true;
  });

  try {
    // LCEL ka .stream() method — AsyncIterator return karta hai
    const stream = await foodRecommenderChain.stream({ query });

    for await (const chunk of stream) {
      if (clientDisconnected) break;

      // chunk yahan ek string hai (StringOutputParser ke wajah se)
      res.write(`data: ${JSON.stringify({ token: chunk })}\n\n`);
    }

    res.write("data: [DONE]\n\n");
  } catch (err) {
    console.error("Streaming error:", err);
    res.write(`data: ${JSON.stringify({ error: "Stream fail ho gaya" })}\n\n`);
  } finally {
    res.end();
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server chal raha hai: http://localhost:${PORT}`);
});
```

### Isme ho kya raha hai, step by step

1. **`res.flushHeaders()`** — normally Express headers ko body ke saath batch karta hai. Yaha hum force karte hain ki headers turant client tak pahunche, taaki client ko pata chale "connection open ho gaya hai."
2. **`foodRecommenderChain.stream({ query })`** — LCEL ka built-in method, jo koi bhi `.pipe()`-chained runnable pe available hota hai. Ye ek `AsyncIterable` return karta hai jisse hum `for await` se consume karte hain.
3. **`res.write(...)`** — har chunk aate hi turant client ko bhej dete hain, `res.end()` ka wait nahi karte.
4. **`req.on("close", ...)`** — agar user browser tab band kar de ya request cancel kare, hum LLM ko unnecessary tokens generate karte rehne se bachate hain (cost saving!).
5. **`data: [DONE]\n\n`** — ek convention (OpenAI bhi yahi use karta hai) jisse client ko pata chale stream khatam ho gaya.

> [!warning]
> Agar tum **Nginx** ya kisi reverse-proxy ke peeche deploy kar rahe ho, unki default buffering SSE ko tod sakti hai. Nginx mein `proxy_buffering off;` set karna padta hai, warna chunks buffer ho kar ek saath aayenge — streaming ka fayda hi khatam.

---

## Step 5: Agent Ko Stream Karna (Tool Calls Ke Saath)

Chapter 8 mein humne `AgentExecutor` dekha tha. Agent ko stream karna thoda alag hai kyunki beech mein **tool calls** bhi ho sakte hain — hum chahte hain client ko ye bhi pata chale ki "agent abhi tool call kar raha hai" (transparency ke liye), na sirf final text tokens.

```ts
// src/agent.ts
import { ChatOpenAI } from "@langchain/openai";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const getRestaurantOffersTool = tool(
  async ({ restaurantName }) => {
    // real app mein DB/API call hoga
    return JSON.stringify({ restaurantName, offer: "50% off up to ₹100" });
  },
  {
    name: "get_restaurant_offers",
    description: "Kisi restaurant ke current offers fetch karta hai.",
    schema: z.object({ restaurantName: z.string() }),
  }
);

const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0, streaming: true });

const prompt = ChatPromptTemplate.fromMessages([
  ["system", "Tum Swiggy ka order assistant ho. Tools use karke user ki help karo."],
  ["human", "{input}"],
  ["placeholder", "{agent_scratchpad}"],
]);

const agent = createToolCallingAgent({ llm: model, tools: [getRestaurantOffersTool], prompt });

export const agentExecutor = new AgentExecutor({
  agent,
  tools: [getRestaurantOffersTool],
  verbose: false,
});
```

Ab route mein `AgentExecutor.streamEvents()` use karenge — ye `.stream()` se zyada powerful hai kyunki ye **granular events** deta hai (tool start, tool end, LLM token, etc.), na sirf raw text chunks.

```ts
// src/server.ts (agent streaming route)
import { agentExecutor } from "./agent.js";

app.post("/api/agent/stream", async (req, res) => {
  const { input } = req.body;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  let clientDisconnected = false;
  req.on("close", () => { clientDisconnected = true; });

  try {
    const eventStream = agentExecutor.streamEvents(
      { input },
      { version: "v2" }
    );

    for await (const event of eventStream) {
      if (clientDisconnected) break;

      switch (event.event) {
        case "on_tool_start":
          res.write(
            `data: ${JSON.stringify({
              type: "tool_start",
              tool: event.name,
              input: event.data.input,
            })}\n\n`
          );
          break;

        case "on_tool_end":
          res.write(
            `data: ${JSON.stringify({
              type: "tool_end",
              tool: event.name,
              output: event.data.output,
            })}\n\n`
          );
          break;

        case "on_chat_model_stream": {
          const token = event.data.chunk?.content;
          if (token) {
            res.write(`data: ${JSON.stringify({ type: "token", token })}\n\n`);
          }
          break;
        }

        default:
          break; // baaki events ignore karo (on_chain_start, on_agent_action, etc.)
      }
    }

    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
  } catch (err) {
    console.error("Agent streaming error:", err);
    res.write(`data: ${JSON.stringify({ type: "error", message: "Agent fail ho gaya" })}\n\n`);
  } finally {
    res.end();
  }
});
```

Ab client ko sirf text tokens nahi milte — usse pata chalta hai "agent ne `get_restaurant_offers` tool call kiya", jo UI mein "Checking offers..." jaisa intermediate status dikhane ke liye kaam aata hai. Bilkul waise hi jaise Swiggy app order tracking mein "Restaurant is preparing your food" → "Rider assigned" → "Out for delivery" dikhata hai — har step transparent hai, black-box wait nahi.

> [!tip]
> `streamEvents` ka `version: "v2"` explicitly pass karna zaruri hai — LangChain.js mein ye API stabilize hone se pehle v1 tha, aur dono ka event shape thoda alag hai.

---

## Step 6: Frontend Se Consume Karna

Browser mein native `EventSource` API SSE ke liye bani hai, lekin usme sirf `GET` requests support hoti hain (POST body nahi bhej sakte). Isliye LLM APIs ke liye usually **`fetch` + manual stream reading** use hota hai:

```ts
// client.ts (browser ya React component ke andar)
async function streamRecommendation(query: string) {
  const response = await fetch("http://localhost:4000/api/recommend/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() || ""; // incomplete chunk ko buffer mein rakho

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.replace("data: ", "");

      if (payload === "[DONE]") return;

      const { token } = JSON.parse(payload);
      process.stdout.write(token); // ya React state update karo
    }
  }
}
```

> [!warning]
> **Common mistake**: `TextDecoder` bina `{ stream: true }` option ke use karna. Iske bina multi-byte characters (jaise emoji, Hindi text!) chunk boundaries pe toot sakte hain aur garbage output aa sakta hai.

---

## Step 7: Next.js Route Handler Version

Agar tumhara frontend Next.js hai, to alag Express server chalane ki zaroorat nahi — Route Handler mein hi seedha `ReadableStream` return kar sakte ho:

```ts
// app/api/recommend/route.ts
import { foodRecommenderChain } from "@/lib/chain";

export async function POST(req: Request) {
  const { query } = await req.json();

  const stream = await foodRecommenderChain.stream({ query });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: chunk })}\n\n`));
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

Underlying idea bilkul same hai — sirf `res.write()`/`res.end()` ki jagah Web Streams API ka `ReadableStream` + `controller.enqueue()` use hota hai, kyunki Next.js Edge/Node runtimes Web Standard `Response` expect karte hain.

---

## Production Considerations

### 1. Request Validation

LLM ko seedha untrusted user input mat bhejo bina validate kiye. Zod se input schema define karo:

```ts
import { z } from "zod";

const requestSchema = z.object({
  query: z.string().min(1).max(500),
});

app.post("/api/recommend", async (req, res) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  // ... parsed.data.query use karo
});
```

### 2. Rate Limiting

Ek user agar loop mein 1000 requests bhej de, tumhara OpenAI bill fat jayega. `express-rate-limit` use karo:

```bash
npm install express-rate-limit
```

```ts
import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // per IP, per minute
  message: { error: "Bahut zyada requests. Thoda ruk kar try karo." },
});

app.use("/api/", limiter);
```

### 3. Timeouts

LLM calls kabhi-kabhi hang ho sakte hain. Har request pe timeout lagao:

```ts
const model = new ChatOpenAI({
  model: "gpt-4o-mini",
  timeout: 30_000, // 30 seconds
});
```

### 4. Error Handling — Client Ko Kya Dikhana Hai

Raw error kabhi client ko mat bhejo — API keys, stack traces leak ho sakte hain:

```ts
try {
  // ...
} catch (err) {
  console.error(err); // full error sirf server logs mein
  res.status(500).json({ error: "Kuch galat ho gaya, dobara try karo." }); // generic message client ko
}
```

### 5. Cost & Latency Monitoring

Chapter 10 (Callbacks & Tracing) se LangSmith integrate karo taaki production mein pata chale konsi requests slow hain ya zyada tokens use kar rahi hain.

### 6. CORS

Agar frontend alag domain pe hai, `cors` middleware zaruri hai — lekin production mein `origin: "*"` mat rakho, specific domain whitelist karo:

```ts
app.use(cors({ origin: "https://your-frontend-domain.com" }));
```

### 7. Graceful Shutdown

Agar server restart ho raha hai (deployment ke waqt), in-flight streaming requests ko abruptly kaatna bad UX hai. `SIGTERM` handle karo:

```ts
process.on("SIGTERM", () => {
  console.log("Shutting down gracefully...");
  server.close(() => process.exit(0));
});
```

---

## Common Mistakes

| Mistake | Fix |
|---|---|
| `streaming: true` model config pe set nahi kiya | `.stream()` tab bhi kaam karega but ek hi bade chunk mein aayega, real streaming nahi |
| SSE response pe `Content-Type: application/json` set kar diya | Hamesha `text/event-stream` use karo streaming routes pe |
| Client disconnect handle nahi kiya | Background mein LLM tokens generate hote rahenge, cost waste hoga |
| `res.flushHeaders()` bhool gaye | Client ko lagega connection hang ho gaya, kuch time tak kuch nahi dikhega |
| Rate limiting skip kar diya | Ek buggy frontend loop poora OpenAI budget khatam kar sakta hai ek ghante mein |
| Zod validation skip kiya | Malformed/huge payloads seedha LLM tak pahunch jayenge, cost aur security risk |

---

## Key Takeaways

- HTTP API ke peeche chain/agent expose karne ke liye chain logic (`chain.ts`) aur server routes (`server.ts`) ko separate rakho — reusability aur future migration (LangGraph) ke liye.
- Non-streaming endpoint simple hai (`.invoke()` + JSON response) lekin lambe LLM responses ke liye poor UX deta hai — user ko blank wait dikhता hai.
- **Server-Sent Events (SSE)** LLM streaming ka industry-standard tareeka hai — HTTP-native, one-way, WebSockets se simpler.
- LCEL chains ke liye `.stream()` use karo; agents ke liye `.streamEvents({version: "v2"})` use karo taaki tool-call events bhi granularly mil sake (transparency ke liye).
- SSE implement karte waqt: headers flush karo, client disconnect handle karo, `[DONE]` sentinel bhejo stream end pe.
- Browser side `EventSource` POST support nahi karta — LLM streaming ke liye `fetch` + manual `ReadableStream` reading standard pattern hai.
- Next.js mein wahi concept Web Streams API (`ReadableStream` + `controller.enqueue()`) se implement hota hai, Express ke `res.write()` ki jagah.
- Production mein zaruri hai: Zod input validation, rate limiting, timeouts, generic error messages (raw errors leak mat karo), CORS whitelist, aur graceful shutdown.
- Ye chapter ka pattern Chapter 21 mein wapas aayega — bas underlying orchestration LangChain ki jagah LangGraph ki hogi.
