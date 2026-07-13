# Memory in Conversations and Agents

🟡 Intermediate

## Kya hota hai?

Socho tum Swiggy ke customer support chatbot se baat kar rahe ho:

> **Tum:** "Mera order kahan hai?"
> **Bot:** "Aapka order #4521 pack ho chuka hai, 15 minute mein deliver hoga."
> **Tum:** "Isme extra raita bhi add karwa do."
> **Bot:** "Sorry, main samajh nahi paya — konsa order? Konsa item?"

Frustrating hai na? Bot ne pichhla context bhula diya. Ye isliye hota hai kyunki LLM APIs (OpenAI, Anthropic, jo bhi) **stateless** hain — har request apne aap mein independent hai. Model ko koi "yaad" nahi rehti pichhle messages ki, jab tak tum khud wo messages dobara request ke saath nahi bhejte.

Yehi gap **Memory** fill karta hai. Memory ka matlab hai — conversation history ko store karna aur har naye LLM call ke saath usse wapas bhejna, taaki model ko lage jaise usse "yaad" hai.

```
User Message 1 → [LLM Call 1: sirf Message 1 bhejo]
User Message 2 → [LLM Call 2: Message 1 + 2 dono bhejo]
User Message 3 → [LLM Call 3: Message 1 + 2 + 3 dono bhejo]
```

Har request mein poori history bhejna hi "memory" ka illusion create karta ha — LLM khud kuch store nahi karta, tumhara application layer karta hai.

> [!info]
> Ye bilkul waise hai jaise IRCTC ka customer care call — agar tum ek naye agent se baat karo, unhe apna PNR number phir se batana padega, kyunki pichhle agent ne conversation "yaad" nahi rakhi in their head — system ne kahin note kiya hoga (ticket ID) jo naya agent dekh sakta hai.

## Kyun zaruri hai in agent-building?

Agent-building mein memory sirf "chat history" se zyada hai. Ismein teen alag cheezein aati hain:

1. **Short-term memory (conversation state)** — Current session ke andar ke messages. Jaise Zomato app mein ek order session ke andar tumhare selected items, address, payment method.
2. **Long-term memory (persistent facts)** — User ke baare mein cheezein jo session cross karti hain. Jaise "Siddesh ko North Indian food pasand hai" ya "Siddesh vegetarian hai" — ye agle session mein bhi yaad rehna chahiye.
3. **Working memory / state (agent execution)** — Multi-step agent ke intermediate results, tool outputs, decisions — jo ek complex task complete karne ke liye zaruri hain (LangGraph mein isse "graph state" kehte hain).

Bina memory ke:

- Har naya message ek "cold start" hota hai — user ko baar baar context repeat karna padta hai (bura UX)
- Agent multi-step tasks complete nahi kar sakta — kyunki use yaad nahi rehta ki step 1 mein kya decide hua tha
- Personalization impossible hai — system kabhi user ko "seekh" nahi payega

Isliye production-grade agents banate waqt memory ek **first-class architectural decision** hai, na ki afterthought.

> [!warning]
> Memory = zyada tokens = zyada cost aur latency. Poori conversation history har baar LLM ko bhejna eventually context window bhar dega aur bill badha dega. Is chapter mein hum dekhenge memory ko efficiently manage kaise karte hain (trimming, summarization).

---

## Setup

```bash
npm install @langchain/openai @langchain/core @langchain/langgraph zod
```

```ts
// .env
OPENAI_API_KEY=sk-...
```

---

## 1. Manual Memory — Sabse Basic Building Block

Sabse pehle samjhte hain memory "under the hood" kaise kaam karti hai — bina kisi abstraction ke, sirf ek array of messages maintain karke.

```ts
import { ChatOpenAI } from "@langchain/openai";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
  type BaseMessage,
} from "@langchain/core/messages";

const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0.3 });

// Ye array hi humari "memory" hai - hum khud isko maintain karenge
const chatHistory: BaseMessage[] = [
  new SystemMessage(
    "Tum Swiggy ka customer support assistant ho. Concise jawab do."
  ),
];

async function sendMessage(userText: string) {
  // 1. User ka naya message history mein add karo
  chatHistory.push(new HumanMessage(userText));

  // 2. POORI history LLM ko bhejo (sirf latest message nahi!)
  const response = await model.invoke(chatHistory);

  // 3. AI ka response bhi history mein add karo, taaki agla call ise "yaad" rakhe
  chatHistory.push(new AIMessage(response.content as string));

  return response.content;
}

async function main() {
  console.log(await sendMessage("Mera order #4521 kahan hai?"));
  // "Aapka order pack ho chuka hai, jald hi deliver hoga."

  console.log(await sendMessage("Isme extra raita add karwa do"));
  // Ab model ko pata hai "isme" ka matlab order #4521 hai, kyunki
  // poori history LLM ko gayi thi.
}

main();
```

Yehi core idea hai — **memory ka matlab hai state ko app ke andar store karna aur har call ke saath resend karna.** Baaki sab kuch (LangChain classes, LangGraph checkpointers) isi idea ke convenient wrappers hain.

> [!tip]
> `chatHistory` array yahan sirf ek local JS variable hai — jaise hi process restart hoga, ye gayab ho jayega. Real apps mein isse Redis, Postgres, ya kisi DB mein persist karna padta hai (aage dekhenge).

---

## 2. `ChatMessageHistory` — LangChain ka In-Memory Store

LangChain.js ek helper class deta hai — `ChatMessageHistory` — jo upar wale array pattern ko thoda structure deta hai.

```ts
import { ChatMessageHistory } from "langchain/stores/message/in_memory";
import { HumanMessage, AIMessage } from "@langchain/core/messages";

const history = new ChatMessageHistory();

await history.addMessage(new HumanMessage("Mujhe biryani chahiye"));
await history.addMessage(new AIMessage("Sure! Konsi city se order karna hai?"));
await history.addMessage(new HumanMessage("Pune"));

const messages = await history.getMessages();
console.log(messages.length); // 3
```

Ye by itself kuch magic nahi karta — bas ek clean API deta hai messages add/get karne ke liye. Real power tab aati hai jab hum isse **`RunnableWithMessageHistory`** ke saath combine karte hain, jo automatically history ko manage karta hai per-session basis pe.

### `RunnableWithMessageHistory` — Automatic Session-Based Memory

Real apps mein tumhare paas ek nahi, **hazaaron users** hote hain — har ek ki apni alag conversation. Isliye per-user/per-session history chahiye, ek global array nahi.

```ts
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { ChatMessageHistory } from "langchain/stores/message/in_memory";
import { StringOutputParser } from "@langchain/core/output_parsers";

const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0.3 });

const prompt = ChatPromptTemplate.fromMessages([
  ["system", "Tum ek friendly food-ordering assistant ho."],
  new MessagesPlaceholder("history"), // yahan pichli conversation inject hogi
  ["human", "{input}"],
]);

const chain = prompt.pipe(model).pipe(new StringOutputParser());

// Har sessionId ke liye alag history store karne wala map
const sessionStore: Record<string, ChatMessageHistory> = {};

function getHistoryForSession(sessionId: string): ChatMessageHistory {
  if (!sessionStore[sessionId]) {
    sessionStore[sessionId] = new ChatMessageHistory();
  }
  return sessionStore[sessionId];
}

const chainWithHistory = new RunnableWithMessageHistory({
  runnable: chain,
  getMessageHistory: (sessionId) => getHistoryForSession(sessionId),
  inputMessagesKey: "input",
  historyMessagesKey: "history",
});

async function main() {
  // User "siddesh-123" ki conversation
  const r1 = await chainWithHistory.invoke(
    { input: "Mujhe Pune mein biryani chahiye" },
    { configurable: { sessionId: "siddesh-123" } }
  );
  console.log(r1);

  const r2 = await chainWithHistory.invoke(
    { input: "Konsa restaurant best hai?" },
    { configurable: { sessionId: "siddesh-123" } } // same session -> context maintain
  );
  console.log(r2); // ye "Pune" aur "biryani" context use karega

  // Ek doosra user - bilkul alag, koi cross-contamination nahi
  const r3 = await chainWithHistory.invoke(
    { input: "Mujhe pizza chahiye" },
    { configurable: { sessionId: "another-user-456" } }
  );
  console.log(r3);
}

main();
```

Ye pattern Zomato jaise app mein bilkul waise hi hai jaise **order sessions** — har user ka apna cart hota hai, `sessionId` = `userId` ya `orderId` samjho. Ek user ka cart doosre user ke cart se kabhi mix nahi hota.

> [!warning]
> `ChatMessageHistory` **in-memory** hai — process restart hote hi sab data gayab. Production mein isse persistent store (Redis, Postgres, MongoDB) se replace karna padta hai. LangChain.js community packages mein `RedisChatMessageHistory`, `PostgresChatMessageHistory` jaise implementations available hain — sabka interface same hota hai (`addMessage`, `getMessages`), bas backend badal jata hai.

```ts
// Concept (actual package: @langchain/redis ya community package):
import { RedisChatMessageHistory } from "@langchain/redis";

function getHistoryForSession(sessionId: string) {
  return new RedisChatMessageHistory({
    sessionId,
    sessionTTL: 3600, // 1 ghanta baad auto-expire, jaise OTP session
    url: process.env.REDIS_URL,
  });
}
```

---

## 3. Memory ko Trim/Manage Karna — Context Window Problem

Agar conversation lambi ho jaaye (jaise IRCTC support chat jo 100+ messages tak chal gayi), to poori history LLM ko bhejna:

1. **Context window** bhar sakta hai (model ka max token limit)
2. **Cost badhega** — har request mein zyada tokens = zyada paisa
3. **Latency badhegi** — zyada tokens process karne mein time lagta hai
4. Kabhi kabhi model **confuse** ho sakta hai zyada irrelevant purani information se

Isliye humein memory ko **trim** ya **summarize** karna padta hai.

### Option A: `trimMessages` — Sirf Recent N Messages Rakho

```ts
import { trimMessages } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({ model: "gpt-4o-mini" });

async function getTrimmedHistory(messages: BaseMessage[]) {
  return trimMessages(messages, {
    maxTokens: 1000,           // approx token budget for history
    strategy: "last",          // "last" = sabse recent messages rakho
    tokenCounter: model,       // model ke tokenizer se count karo
    includeSystem: true,       // system message hamesha rakho
    startOn: "human",          // trimmed history "human" message se start ho (clean cut)
  });
}
```

`trimMessages` purani messages ko drop kar deta hai jab token budget cross ho jata hai — bilkul waise jaise WhatsApp mein purane messages "cleared chat" ho jaate hain lekin recent context bacha rehta hai.

> [!warning]
> Naive trimming se information loss hota hai — agar user ne message #2 mein apna address bataya tha aur wo trim ho gaya, to model wo bhool jayega. Isiliye long-term important facts ko separate se (long-term memory mein) store karna better hota hai, na ki sirf raw chat history pe depend karna.

### Option B: Summarization — Purani History ko Summary Mein Compress Karo

Better approach lambi conversations ke liye: purani messages ko ek **summary** mein convert kar do, aur sirf recent messages + summary LLM ko bhejo.

```ts
import { ChatOpenAI } from "@langchain/openai";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
  type BaseMessage,
} from "@langchain/core/messages";

const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });

async function summarizeHistory(
  existingSummary: string,
  newMessages: BaseMessage[]
): Promise<string> {
  const summaryPrompt = `
Ye ab tak ki conversation ka summary hai:
${existingSummary || "(koi summary abhi nahi hai)"}

Naye messages:
${newMessages.map((m) => `${m._getType()}: ${m.content}`).join("\n")}

Upar diye gaye purane summary aur naye messages ko combine karke
ek updated, concise summary likho (max 150 words). Important facts
(jaise order details, preferences, decisions) zaroor include karo.
`;

  const result = await model.invoke([new HumanMessage(summaryPrompt)]);
  return result.content as string;
}

// Usage pattern:
let runningSummary = "";
let recentMessages: BaseMessage[] = [];
const RECENT_MESSAGE_LIMIT = 6;

async function chat(userText: string) {
  recentMessages.push(new HumanMessage(userText));

  // LLM ko summary + recent messages dono bhejo
  const messagesToSend: BaseMessage[] = [
    new SystemMessage(
      `Tum ek support assistant ho. Ab tak ka context: ${runningSummary}`
    ),
    ...recentMessages,
  ];

  const response = await model.invoke(messagesToSend);
  recentMessages.push(new AIMessage(response.content as string));

  // Agar recent messages zyada ho gaye, purane ko summarize karke compress karo
  if (recentMessages.length > RECENT_MESSAGE_LIMIT) {
    const toSummarize = recentMessages.slice(0, recentMessages.length - 2);
    runningSummary = await summarizeHistory(runningSummary, toSummarize);
    recentMessages = recentMessages.slice(recentMessages.length - 2);
  }

  return response.content;
}
```

Ye technique bilkul waise hai jaise ek call-center manager apne junior agent ko brief karta hai — poori 1-hour call recording nahi sunayega, ek 2-line summary dega ("customer ka order late hai, refund maang raha hai") aur agent us par kaam continue karega.

---

## 4. LangGraph mein Memory — `MemorySaver` aur Checkpointers

Jab tum simple chains se aage badh kar **LangGraph agents** banate ho, memory ka model thoda alag ho jata hai. LangGraph mein memory ka core concept hai **checkpointing** — graph ka poora **state** har step ke baad automatically save ho jata hai, associated ek `thread_id` ke saath.

Ye IRCTC ke PNR system jaisa hai — booking process ke har step (seat selection → payment → confirmation) ka state PNR number se linked hota hai. Kabhi bhi wapas aake apna PNR check karo, system ko pata hai tum kahan the.

### Basic Setup — In-Memory Checkpointer

```ts
import { StateGraph, START, END, MessagesAnnotation } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0.3 });

// MessagesAnnotation ek pre-built state schema hai jo messages array
// ko automatically "append" karta hai (reducer built-in)
const graph = new StateGraph(MessagesAnnotation)
  .addNode("chatbot", async (state) => {
    const response = await model.invoke(state.messages);
    return { messages: [response] };
  })
  .addEdge(START, "chatbot")
  .addEdge("chatbot", END);

// MemorySaver = in-memory checkpointer, process ke andar state save karta hai
const checkpointer = new MemorySaver();
const app = graph.compile({ checkpointer });

async function main() {
  const config = { configurable: { thread_id: "user-siddesh-1" } };

  const r1 = await app.invoke(
    { messages: [{ role: "user", content: "Mera naam Siddesh hai" }] },
    config
  );
  console.log(r1.messages.at(-1)?.content);

  // Same thread_id -> LangGraph automatically pichli state (messages) load karega
  const r2 = await app.invoke(
    { messages: [{ role: "user", content: "Mera naam kya hai?" }] },
    config
  );
  console.log(r2.messages.at(-1)?.content);
  // "Aapka naam Siddesh hai" - kyunki checkpointer ne pichli state yaad rakhi
}

main();
```

Yahan magic ye hai — humne khud kahin `chatHistory.push()` nahi likha. `MemorySaver` checkpointer automatically:

1. Har invoke ke baad graph ki poori state ko `thread_id` ke against save karta hai
2. Agle invoke pe usi `thread_id` ki purani state load karke naye input ke saath merge karta hai

> [!info]
> `MessagesAnnotation` ka reducer naye messages ko purane messages array mein **append** karta hai (replace nahi karta) — isiliye humein khud history manage nahi karni padi.

### Production Checkpointer — Postgres/SQLite

`MemorySaver` sirf development/testing ke liye hai — process restart pe sab data gayab. Production mein persistent checkpointer chahiye:

```bash
npm install @langchain/langgraph-checkpoint-postgres
```

```ts
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

const checkpointer = PostgresSaver.fromConnString(
  process.env.DATABASE_URL! // "postgresql://user:pass@host:5432/db"
);

// Pehli baar setup karte waqt tables create karne ke liye:
await checkpointer.setup();

const app = graph.compile({ checkpointer });

// Ab agar server restart bhi ho jaaye, thread_id se state wapas mil jayegi
const config = { configurable: { thread_id: "user-siddesh-1" } };
await app.invoke({ messages: [{ role: "user", content: "Hi" }] }, config);
```

Ye pattern exactly waise hai jaise Paytm ka transaction state — agar app crash bhi ho jaaye payment ke beech mein, backend database mein transaction state already saved hai, reload hone pe wahi se continue ho sakta hai.

### Thread History Dekhna aur "Time Travel"

Checkpointer sirf latest state nahi, **poori history of states** store karta hai — isse tum kisi bhi purane point pe "time travel" kar sakte ho (production debugging ke liye bahut useful):

```ts
const config = { configurable: { thread_id: "user-siddesh-1" } };

// Poori checkpoint history dekho
for await (const state of app.getStateHistory(config)) {
  console.log(state.config.configurable?.checkpoint_id, state.values.messages.length);
}

// Current state directly fetch karo
const currentState = await app.getState(config);
console.log(currentState.values.messages);
```

---

## 5. Long-Term Memory — Sessions ke Paar Yaad Rakhna

Ab tak jo dekha wo sab **short-term / thread-scoped** memory tha — ek specific conversation ke andar. Lekin real products mein tumhe **cross-session** memory chahiye hoti hai: jaise Swiggy ko yaad rehta hai tum vegetarian ho, chahe tum 6 mahine baad app khologe.

LangGraph iske liye **`Store`** interface deta hai — ye `thread_id` se bandha nahi hota, balki `namespace` (jaise `userId`) se organize hota hai.

```ts
import { InMemoryStore } from "@langchain/langgraph";
import { StateGraph, START, END, MessagesAnnotation } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage } from "@langchain/core/messages";

const store = new InMemoryStore(); // production mein: Postgres-backed store
const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0.3 });

const graph = new StateGraph(MessagesAnnotation)
  .addNode("chatbot", async (state, config) => {
    const userId = config.configurable?.userId as string;
    const namespace = [userId, "preferences"];

    // Long-term memory se related facts nikalo
    const memories = await store.search(namespace);
    const factsText = memories.map((m) => `- ${m.value.fact}`).join("\n");

    const systemMsg = new SystemMessage(
      `Tum ek food-ordering assistant ho. User ke baare mein pata cheezein:\n${factsText || "(kuch pata nahi abhi)"}`
    );

    const response = await model.invoke([systemMsg, ...state.messages]);

    // Agar user ne koi naya preference bataya, use save karo (simplified example)
    const lastUserMsg = state.messages.at(-1)?.content as string;
    if (lastUserMsg?.toLowerCase().includes("vegetarian")) {
      await store.put(namespace, crypto.randomUUID(), {
        fact: "User pure vegetarian hai",
      });
    }

    return { messages: [response] };
  })
  .addEdge(START, "chatbot")
  .addEdge("chatbot", END);

const app = graph.compile({ checkpointer: new MemorySaver(), store });

async function main() {
  const config = {
    configurable: { thread_id: "session-1", userId: "siddesh-123" },
  };

  await app.invoke(
    { messages: [{ role: "user", content: "Main vegetarian hoon, please yaad rakhna" }] },
    config
  );

  // Bilkul naya thread/session, lekin same userId
  const newSessionConfig = {
    configurable: { thread_id: "session-2-months-later", userId: "siddesh-123" },
  };

  const result = await app.invoke(
    { messages: [{ role: "user", content: "Kuch achha recommend karo" }] },
    newSessionConfig
  );

  console.log(result.messages.at(-1)?.content);
  // Model ko pata hai user vegetarian hai, chahe ye naya thread/session hai
}

main();
```

**Do alag concepts, do alag jagah:**

| Concept | Scope | LangGraph Primitive | Analogy |
|---|---|---|---|
| Short-term memory | Ek conversation/thread | `checkpointer` (`MemorySaver`, `PostgresSaver`) | Ek IRCTC PNR ki journey ka poora state |
| Long-term memory | User ke across sessions | `store` (`InMemoryStore`, Postgres store) | Tumhara Swiggy profile — preferences jo hamesha yaad rehti hain |

> [!tip]
> Production mein long-term memory ko naive "save every message" se mat banao — usse noise bahar aayega. Ek dedicated **extraction step** rakho (chhota LLM call jo conversation se structured facts nikale, jaise output parsers wale chapter mein dekha) aur sirf important facts ko store karo.

---

## 6. Memory Patterns Compare — Kab Kya Use Karo

| Pattern | Kab use karo | Trade-off |
|---|---|---|
| Manual array (`BaseMessage[]`) | Learning, prototyping, single-user scripts | Scale nahi karta, persistence manual |
| `ChatMessageHistory` + `RunnableWithMessageHistory` | Simple multi-user chat apps (chains, LCEL) | Sirf short-term; long-term ke liye khud logic likhni padegi |
| `trimMessages` | Jab context window/cost concern ho | Purani details permanently lost ho sakti hain |
| Summarization | Lambi conversations, support bots | Extra LLM calls (cost), summary mein detail loss ho sakta hai |
| LangGraph `checkpointer` (`MemorySaver`/`PostgresSaver`) | Agents, multi-step workflows, production apps | Setup thoda zyada, lekin most robust aur "time travel" jaisi features milti hain |
| LangGraph `Store` (long-term) | Personalization, cross-session facts | Extraction logic khud design karni padti hai |

---

## 7. Common Mistakes aur Gotchas

1. **Global mutable history variable use karna multi-user app mein**
   ```ts
   // GALAT - sab users ka data mix ho jayega
   let chatHistory: BaseMessage[] = [];
   ```
   Har user/session ke liye alag history honi chahiye — `sessionId` ya `thread_id` se keyed.

2. **`MemorySaver` ko production mein use karna**
   Ye sirf process ki memory mein rehta hai. Server restart, ya multiple server instances (horizontal scaling) mein state kho jayega ya inconsistent ho jayega. Postgres/Redis-backed checkpointer use karo.

3. **Poori history bina trim/summarize kiye har baar bhejna**
   Lambi conversations mein cost aur latency exponentially badhती hai. Har production chatbot mein trimming ya summarization strategy honi chahiye.

4. **System message ko history trim karte waqt drop kar dena**
   System prompt (jisme agent ka role/instructions hote hain) hamesha preserve karo — `trimMessages` mein `includeSystem: true` set karna mat bhoolo.

5. **Short-term aur long-term memory ko confuse karna**
   Thread-scoped state (checkpointer) aur user-scoped facts (store) alag purposes serve karte hain. Sabkuch ek hi jagah dalne se dono messy ho jaate hain.

6. **Sensitive data ko memory mein bina encryption/redaction ke store karna**
   Agar user apna phone number, address, ya payment info conversation mein share karta hai, wo checkpointer/store mein raw save ho jayega. Production mein PII redaction/encryption zaroor lagao — especially jab store DB persistent hai.

7. **`thread_id` predictable/guessable rakhna**
   Agar `thread_id` sirf incrementing number hai (`"1"`, `"2"`...), koi bhi user doosre ka conversation history access kar sakta hai agar authorization check missing hai. Hamesha UUID + proper access control use karo.

---

## Key Takeaways

- LLMs stateless hote hain — "memory" tumhara application layer create karta hai by resending conversation history har request ke saath.
- Sabse basic pattern: ek `BaseMessage[]` array maintain karo aur har call mein poora array bhejo — sab abstractions isi idea pe based hain.
- `ChatMessageHistory` + `RunnableWithMessageHistory` LCEL chains ke liye per-session memory ka clean, session-aware way deta hai.
- Lambi conversations mein `trimMessages` (recent-N rakho) ya summarization (purani history compress karo) use karo — warna context window aur cost dono explode karenge.
- LangGraph mein `checkpointer` (`MemorySaver` dev ke liye, `PostgresSaver` production ke liye) automatically graph state ko `thread_id` ke against persist karta hai — no manual array management.
- `Store` (jaise `InMemoryStore`, Postgres-backed) long-term, cross-session memory ke liye hai — user preferences/facts jo `thread_id` change hone ke baad bhi yaad rehni chahiye.
- Short-term (thread-scoped, checkpointer) aur long-term (user-scoped, store) memory alag concerns hain — dono ko sahi jagah use karo.
- Production mein hamesha socho: persistence (restart-safe?), cost (kitne tokens har call mein?), security (PII, access control via `thread_id`).
