# Chains and LCEL (LangChain Expression Language)

🟢 Beginner

## Kya hota hai?

Chalo ek dabbawala ki tarah sochte hain. Ek dabbawala akela pura kaam nahi karta — wo tiffin ko uthata hai, station tak le jaata hai, train mein dusre dabbawale ko handover karta hai, wo aage delivery point tak le jaata hai, aur wahan se final dabbawala ghar/office tak pahunchata hai. Har banda apna ek chhota kaam karta hai, aur output seedha agle bande ke haath mein jaata hai — bina kisi confusion ke, bina kisi manual "coordination call" ke. Poora Mumbai dabbawala system isi **pipeline** pe chalta hai.

LLM applications mein bhi yehi pattern baar-baar aata hai:

```
User input
  → Prompt Template (input ko structured prompt mein badalna)
  → Chat Model (LLM se response lena)
  → Output Parser (raw response ko usable format mein todna)
  → Final Result
```

Har step apna kaam karta hai aur output seedha agle step ko de deta hai. **LCEL (LangChain Expression Language)** LangChain.js ka wo tarika hai jisse tum in steps ko `.pipe()` use karke ek clean, readable pipeline mein jod sakte ho — bilkul dabbawala relay ki tarah.

Is chapter se pehle (Chapter 2-4 mein) tumne dekha:
- Chapter 2: `model.invoke(messages)` — seedha ek Chat Model call karna
- Chapter 3: `PromptTemplate` / `ChatPromptTemplate` — prompts banana
- Chapter 4: Output Parsers — response ko structured data mein todna

Ab is chapter mein hum inhe **ek saath jodna** seekhenge — bina manually har step ka output uthake agle step mein pass kiye.

## Kyun zaruri hai agent-building ke liye?

Agar chains na hotay, toh tumhara code kuch aisa dikhta:

```typescript
// Chains ke bina - manual "glue code"
const formattedPrompt = await promptTemplate.formatMessages({ topic: "Node.js" });
const response = await model.invoke(formattedPrompt);
const parsedResult = await outputParser.parse(response.content);
console.log(parsedResult);
```

Yeh chalta toh hai, par jaise-jaise steps badhte hain (retry logic, streaming, batching, tracing), yeh manual glue code messy ho jaata hai. Aur agent-building mein toh chains hi foundation hain — LangGraph ke andar bhi har **node** actually ek chain hi hota hai (prompt → model → parser).

LCEL yeh sab automatically de deta hai:

1. **`.invoke()`** — single input ke liye ek result
2. **`.batch()`** — multiple inputs parallel mein process karna (jaise Swiggy ek saath 100 orders ko alag-alag restaurants ko route kar deta hai)
3. **`.stream()`** — token-by-token streaming (jaise UPI payment status "processing... processing... done" real-time dikhana)
4. **Automatic tracing** — LangSmith mein pura pipeline visualize ho jaata hai (Chapter 10 mein detail mein)
5. **Composability** — chains ko chains ke andar nest kar sakte ho, jaise Lego blocks

> [!info]
> LCEL koi naya concept nahi hai — yeh sirf ek **declarative syntax** hai jo `Runnable` interface ke upar bana hai. Jo bhi class `Runnable` implement karti hai (Prompt, Model, Parser, Retriever, Tool — sab), unhe tum `.pipe()` se jod sakte ho.

---

## The `Runnable` Interface — Sabka Common Base

LangChain.js mein har major building block ek common interface implement karta hai: **`Runnable`**. Isko socho jaise ek **USB-C port** — chahe wo phone ho, laptop ho, ya headphones, agar sabme USB-C port hai, toh koi bhi cable kisi bhi device se connect ho jaata hai.

`Runnable` interface `@langchain/core/runnables` mein defined hai, aur yeh guarantee karta hai ki har Runnable object ke paas yeh methods honge:

| Method | Kaam |
|---|---|
| `.invoke(input, config?)` | Single input do, single output lo |
| `.batch(inputs[], config?)` | Multiple inputs ek saath process karo (parallel) |
| `.stream(input, config?)` | Output ko chunks mein stream karo |
| `.pipe(nextRunnable)` | Is Runnable ka output agle Runnable ko input ke roop mein pass karo |
| `.invoke()` ke async variants | `.batchAsCompleted()`, `.streamEvents()` — advanced streaming/observability ke liye (Chapter 10, 20) |

Yeh sab classes `Runnable` implement karti hain:

- `PromptTemplate`, `ChatPromptTemplate` (Chapter 3)
- `ChatOpenAI`, `ChatAnthropic` — sab Chat Models (Chapter 2)
- `StringOutputParser`, `JsonOutputParser`, `StructuredOutputParser` (Chapter 4)
- `RunnableSequence`, `RunnableParallel`, `RunnableLambda` (yeh chapter)
- Retrievers (Chapter 9), Tools (Chapter 7), aur poori LangGraph bhi!

Iska matlab — jo bhi tum seekhte ho ek Runnable ke baare mein, wo sab jagah apply hota hai.

### Ek Standalone Runnable Ka Example

```typescript
import { RunnableLambda } from "@langchain/core/runnables";

// Koi bhi plain function ko Runnable bana sakte ho
const shout = RunnableLambda.from((input: string) => input.toUpperCase());

const result = await shout.invoke("namaste duniya");
console.log(result); // "NAMASTE DUNIYA"
```

`RunnableLambda.from()` kisi bhi function ko ek proper `Runnable` mein wrap kar deta hai — matlab ab isme bhi `.pipe()`, `.batch()`, `.stream()` sab available hain.

---

## `.pipe()` — The Building Block

`.pipe()` method do Runnables ko jodta hai: pehle wale ka output, dusre wale ka input ban jaata hai. Bilkul Unix pipe (`|`) jaisa — `cat file.txt | grep "error" | wc -l`.

### Sabse Simple Example: Prompt → Model → Parser

```typescript
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { StringOutputParser } from "@langchain/core/output_parsers";
import "dotenv/config";

// Step 1: Prompt Template
const prompt = ChatPromptTemplate.fromMessages([
  ["system", "Tum ek Hinglish tech mentor ho jo short, crisp jawab deta hai."],
  ["human", "{topic} ko ek line mein samjhao."],
]);

// Step 2: Chat Model
const model = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0.3,
});

// Step 3: Output Parser (AIMessage -> plain string)
const parser = new StringOutputParser();

// Chain banao - .pipe() se jodo
const chain = prompt.pipe(model).pipe(parser);

// Ab poori pipeline ek single Runnable hai!
const result = await chain.invoke({ topic: "closures" });

console.log(result);
// "Closures wo function hote hain jo apne bahar ke variables ko yaad
//  rakhte hain, jaise dabbawala apna route yaad rakhta hai."
```

Yahan dekho kya hua:

1. `prompt.pipe(model)` — ek naya `RunnableSequence` banata hai jisme pehle prompt format hota hai, fir uska output (messages array) model ko jaata hai
2. `.pipe(parser)` — us sequence ka output (AIMessage) ab parser ko milta hai, jo `.content` string nikal deta hai
3. Final `chain` khud bhi ek `Runnable` hai — isliye isme bhi `.invoke()`, `.batch()`, `.stream()` sab kaam karega

> [!tip]
> `.pipe()` chain kar sakte ho jitna chaho — `a.pipe(b).pipe(c).pipe(d)`. Har `.pipe()` call ek naya `RunnableSequence` return karta hai jo pichle sequence ko extend karta hai.

---

## `RunnableSequence` — `.pipe()` Ka Explicit Version

`.pipe()` ke peeche asal mein `RunnableSequence` class hi kaam karti hai. Tum chaaho toh ise directly bhi use kar sakte ho — jab tumhare paas bahut saare steps ho aur code zyada readable rakhna ho:

```typescript
import { RunnableSequence } from "@langchain/core/runnables";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { StringOutputParser } from "@langchain/core/output_parsers";

const prompt = ChatPromptTemplate.fromMessages([
  ["system", "Tum ek helpful Hinglish assistant ho."],
  ["human", "{question}"],
]);

const model = new ChatOpenAI({ model: "gpt-4o-mini" });
const parser = new StringOutputParser();

// .pipe() chaining ke bajaye RunnableSequence.from() array syntax
const chain = RunnableSequence.from([prompt, model, parser]);

const result = await chain.invoke({
  question: "REST aur GraphQL mein kya farak hai?",
});

console.log(result);
```

`RunnableSequence.from([step1, step2, step3, ...])` aur `step1.pipe(step2).pipe(step3)` — dono **functionally identical** hain. `RunnableSequence.from()` array syntax tab useful hota hai jab steps ki list dynamically banti ho, ya jab code review mein saara pipeline ek jagah dikhana ho.

> [!info]
> **Python vs JS naming**: Python LangChain mein tum sirf `prompt | model | parser` likhte ho (pipe operator overload hai). JavaScript/TypeScript mein `|` operator overload nahi ho sakta, isliye LangChain.js mein `.pipe()` method use hota hai — same concept, alag syntax.

---

## Custom Logic Chain Mein Dalna — `RunnableLambda`

Real projects mein sirf prompt → model → parser kaafi nahi hota. Kabhi tumhe input ko pehle transform karna hota hai, ya model ke output pe koi custom validation/logic chalani hoti hai. Iske liye `RunnableLambda` use karte hain — yeh plain JS/TS function ko ek Runnable mein convert kar deta hai jise chain mein kahin bhi daal sakte ho.

```typescript
import { RunnableSequence, RunnableLambda } from "@langchain/core/runnables";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { StringOutputParser } from "@langchain/core/output_parsers";

const prompt = ChatPromptTemplate.fromMessages([
  ["system", "Tum sirf ek city ka naam return karte ho, kuch aur nahi."],
  ["human", "{query}"],
]);

const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });
const parser = new StringOutputParser();

// Custom step: model ke output ko clean/normalize karna
const normalizeCity = RunnableLambda.from((cityName: string) => {
  return cityName.trim().toLowerCase().replace(/\.$/, "");
});

const chain = RunnableSequence.from([prompt, model, parser, normalizeCity]);

const result = await chain.invoke({
  query: "Mujhe Bharat ki rajdhani ka naam batao.",
});

console.log(result); // "new delhi"
```

> [!warning]
> `RunnableLambda` ke andar function **pure aur predictable** rakho jahan tak ho sake. Agar tumhe iske andar koi async API call (jaise database lookup) karni hai toh async function pass karo — `RunnableLambda.from(async (input) => {...})` — LangChain automatically handle kar lega.

---

## Parallel Execution — `RunnableParallel`

Kabhi tumhe ek hi input pe **multiple independent operations** ek saath chalani hoti hain — jaise Zomato app ek saath restaurant ka rating, delivery time estimate, aur offers — teeno alag APIs se parallel mein fetch kar leta hai, taaki user ko wait na karna pade.

`RunnableParallel` (ya seedha plain object syntax) isi ke liye hai:

```typescript
import { RunnableSequence, RunnableParallel } from "@langchain/core/runnables";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { StringOutputParser } from "@langchain/core/output_parsers";

const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0.5 });
const parser = new StringOutputParser();

const summaryPrompt = ChatPromptTemplate.fromMessages([
  ["human", "{text} ka ek line summary do."],
]);

const sentimentPrompt = ChatPromptTemplate.fromMessages([
  ["human", "{text} ka sentiment positive/negative/neutral mein batao, ek word mein."],
]);

const summaryChain = summaryPrompt.pipe(model).pipe(parser);
const sentimentChain = sentimentPrompt.pipe(model).pipe(parser);

// Dono chains parallel mein chalengi, same input ke saath
const parallelChain = RunnableParallel.from({
  summary: summaryChain,
  sentiment: sentimentChain,
});

const result = await parallelChain.invoke({
  text: "Delivery time bahut zyada tha aur food thanda aaya, bahut bura experience.",
});

console.log(result);
// {
//   summary: "Delivery late thi aur food thanda pahuncha.",
//   sentiment: "negative"
// }
```

> [!tip]
> Tum plain object bhi use kar sakte ho `RunnableParallel.from()` ke bajaye — LangChain.js automatically object ko `RunnableParallel` mein convert kar deta hai jab wo kisi `.pipe()` chain ke andar milta hai:
> ```typescript
> const chain = RunnableSequence.from([
>   { summary: summaryChain, sentiment: sentimentChain },
>   RunnableLambda.from((result) => `${result.summary} (${result.sentiment})`),
> ]);
> ```

**Kab use karein `RunnableParallel`?**
- Jab multiple independent LLM calls ya data-fetches ek saath chalane ho (latency kam karne ke liye)
- Jab ek "combiner" step ko multiple sources se data chahiye ho (jaise RAG mein: retrieved docs + original question dono chahiye — Chapter 9 mein isko use karenge)

---

## Input/Output Ka Data Flow Samajhna

Ek common confusion: chain ke beech mein data ka **shape** kya hota hai? Chalo step-by-step type-check karte hain:

```typescript
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { StringOutputParser } from "@langchain/core/output_parsers";

const prompt = ChatPromptTemplate.fromMessages([
  ["human", "{topic} explain karo"],
]);
const model = new ChatOpenAI({ model: "gpt-4o-mini" });
const parser = new StringOutputParser();

const chain = prompt.pipe(model).pipe(parser);
```

| Step | Input Type | Output Type |
|---|---|---|
| `prompt.invoke({ topic: "X" })` | `{ topic: string }` (object) | `ChatPromptValue` (formatted messages) |
| `model.invoke(promptValue)` | `ChatPromptValue` ya `BaseMessage[]` | `AIMessage` |
| `parser.invoke(aiMessage)` | `AIMessage` | `string` |

Yani `chain.invoke({ topic: "X" })` ka:
- **Input** hamesha pehle Runnable ka input-type hota hai (`{ topic: string }`)
- **Output** hamesha aakhri Runnable ka output-type hota hai (`string`)

Beech ke saare "translations" (object → prompt → messages → AIMessage → string) automatically ho jaate hain — tumhe manually kuch convert nahi karna padta.

> [!warning]
> **Common Mistake**: Agar chain ke beech mein type mismatch ho (jaise ek step string expect kar raha hai par usse pehle wala step object de raha hai), toh runtime error aayega, TypeScript compile-time pe pakad nahi payega har baar (kyunki LangChain ke andar kuch jagah `any`/generic types hain). Isliye chain banate waqt har step ka `.invoke()` alag se test karna acchi practice hai, especially jab naya pipeline bana rahe ho.

---

## `.batch()` — Multiple Inputs Ek Saath

Socho tumhe 50 different products ke liye description generate karni hai. Ek-ek karke `.invoke()` call karoge toh sequential hoga — slow. `.batch()` inhe concurrently process karta hai:

```typescript
const chain = prompt.pipe(model).pipe(parser);

const topics = [
  { topic: "async/await" },
  { topic: "Promises" },
  { topic: "Event Loop" },
];

const results = await chain.batch(topics);

results.forEach((result, i) => {
  console.log(`${topics[i].topic}: ${result}`);
});
```

`.batch()` internally concurrency ko manage karta hai (default max concurrency provider ke rate limits ke hisaab se hoti hai). Tum explicitly control bhi kar sakte ho:

```typescript
const results = await chain.batch(topics, {
  maxConcurrency: 5, // ek time pe max 5 requests
});
```

> [!warning]
> **Production gotcha**: `.batch()` bahut zyada concurrent requests bhejta hai agar `maxConcurrency` set na karo — ismein rate-limit errors (`429`) aane ka risk hai, especially OpenAI/Anthropic ke free-tier ya lower-tier API keys pe. Production mein hamesha `maxConcurrency` explicitly set karo based on tumhare provider ke rate limits pe.

---

## `.stream()` — Real-time Output

Chat applications mein user ko poora response ek saath nahi, **token-by-token** dikhana behtar UX hai (jaise ChatGPT ka typing effect). `.stream()` isi ke liye hai:

```typescript
const chain = prompt.pipe(model).pipe(parser);

const stream = await chain.stream({ topic: "microservices architecture" });

for await (const chunk of stream) {
  process.stdout.write(chunk); // string chunks aate rahenge
}
```

Yahan interesting cheez yeh hai — chain mein **`StringOutputParser` bhi streaming-aware hai**. Matlab jaise-jaise model tokens generate karta hai, parser unhe turant chunk-by-chunk string mein convert karke aage bhej deta hai — poora response ka wait nahi karna padta.

> [!info]
> Streaming ka deep-dive Chapter 20 mein hai (LangGraph ke context mein — `streamEvents`, `streamMode`, etc). Abhi ke liye samajhna hai ki `.stream()` bhi ek core `Runnable` method hai jo chain ke har Runnable pe available hai, agar wo Runnable streaming support karta ho.

---

## `RunnablePassthrough` — Original Input Ko Aage Bhejna

Kabhi chain ke beech mein tumhe **original input ko bhi carry forward** karna padta hai — jaise RAG pipeline mein retrieved context ke saath-saath original question bhi model tak pahunchni chahiye. `RunnablePassthrough` isi ke liye hai — yeh input ko "as-is" aage bhej deta hai.

```typescript
import {
  RunnableSequence,
  RunnableParallel,
  RunnablePassthrough,
  RunnableLambda,
} from "@langchain/core/runnables";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { StringOutputParser } from "@langchain/core/output_parsers";

// Fake "retriever" - real mein Chapter 9 mein vector store se aayega
async function fakeRetriever(question: string): Promise<string> {
  return "LangChain.js ek framework hai jo LLM applications banane ke liye use hota hai.";
}

const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "Diye gaye context ke basis pe answer do:\n\nContext: {context}",
  ],
  ["human", "{question}"],
]);

const model = new ChatOpenAI({ model: "gpt-4o-mini" });
const parser = new StringOutputParser();

const chain = RunnableSequence.from([
  // Input: { question: string }
  // Output: { context: string, question: string }
  RunnableParallel.from({
    context: RunnableLambda.from((input: { question: string }) =>
      fakeRetriever(input.question)
    ),
    question: new RunnablePassthrough().pipe(
      RunnableLambda.from((input: { question: string }) => input.question)
    ),
  }),
  prompt,
  model,
  parser,
]);

const result = await chain.invoke({
  question: "LangChain.js kya hai?",
});

console.log(result);
```

Yeh RAG pipelines mein sabse common pattern hai (Chapter 9 mein isko real vector store retriever ke saath dekhenge) — `RunnableParallel` + `RunnablePassthrough` ka combo taaki original input aur derived data (retrieved context) dono ek saath agle step ko mil jaayein.

> [!tip]
> Simpler cases mein `RunnablePassthrough.assign({...})` bhi milta hai jo original input object mein naye keys **add** kar deta hai (replace nahi karta):
> ```typescript
> import { RunnablePassthrough } from "@langchain/core/runnables";
>
> const chain = RunnableSequence.from([
>   RunnablePassthrough.assign({
>     context: RunnableLambda.from((input: { question: string }) =>
>       fakeRetriever(input.question)
>     ),
>   }),
>   prompt,
>   model,
>   parser,
> ]);
> // Ab input { question } se { question, context } ban jaata hai automatically
> ```

---

## Chain Ke Andar Chain — Composability

Chains ko variables mein store karke, unhe dusre chains ke andar bhi use kar sakte ho — jaise Lego blocks ko jodna:

```typescript
// Chain 1: Topic se ek joke banane wali chain
const jokeChain = ChatPromptTemplate.fromMessages([
  ["human", "{topic} pe ek chhota joke sunao."],
])
  .pipe(model)
  .pipe(parser);

// Chain 2: Joke ko rate karne wali chain
const rateChain = ChatPromptTemplate.fromMessages([
  ["human", "Is joke ko 1-10 mein rate karo: {joke}"],
])
  .pipe(model)
  .pipe(parser);

// Dono chains ko jodo - ek chain ka output dusre ka input
const fullChain = RunnableSequence.from([
  jokeChain, // Input: { topic }, Output: string (joke)
  RunnableLambda.from((joke: string) => ({ joke })), // string -> object shape adjust
  rateChain, // Input: { joke }, Output: string (rating)
]);

const rating = await fullChain.invoke({ topic: "JavaScript" });
console.log(rating); // "8/10 - accha wordplay hai!"
```

Yeh pattern production apps mein bahut common hai — chhoti-chhoti reusable chains banao, phir unhe bade pipelines mein compose karo. Isse testing bhi easy hoti hai (har chain ko individually test kar sakte ho).

---

## Error Handling Aur Fallbacks

Production mein LLM calls fail ho sakti hain — rate limits, timeouts, provider downtime. `.withFallbacks()` ek chain ko backup chain(s) de deta hai:

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";

const primaryModel = new ChatOpenAI({ model: "gpt-4o-mini", timeout: 5000 });
const backupModel = new ChatAnthropic({ model: "claude-haiku-4-5" });

const modelWithFallback = primaryModel.withFallbacks([backupModel]);

const chain = prompt.pipe(modelWithFallback).pipe(parser);

// Agar OpenAI fail ho jaaye (timeout/rate-limit), Anthropic automatically try hoga
const result = await chain.invoke({ topic: "resilient systems" });
```

`.withRetry()` bhi milta hai — transient failures pe automatic retry ke liye:

```typescript
const robustModel = primaryModel.withRetry({
  stopAfterAttempt: 3, // max 3 attempts
});
```

> [!warning]
> **Production Consideration**: `.withFallbacks()` aur `.withRetry()` dono **cost aur latency** badhate hain (retries matlab extra API calls = extra $$$). Inhe judiciously use karo — critical user-facing paths mein zaroor lagao, par background/batch jobs mein zyada aggressive retries se bill zyada aa sakta hai. LangSmith tracing (Chapter 10) se pata chalega ki kitne retries/fallbacks actually trigger ho rahe hain production mein.

---

## Configuration Pass Karna — `RunnableConfig`

Har Runnable method (`.invoke()`, `.batch()`, `.stream()`) ek optional second argument leta hai — `RunnableConfig`. Isse tum runtime pe tags, metadata, callbacks, aur timeouts control kar sakte ho:

```typescript
const result = await chain.invoke(
  { topic: "closures" },
  {
    tags: ["tutorial-chapter-5"],
    metadata: { userId: "user_123" },
    callbacks: [], // Chapter 10 mein custom callbacks dekhenge
    configurable: { thread_id: "abc" }, // LangGraph mein use hoga
  }
);
```

Yeh config poori chain ke through **propagate** hoti hai — matlab agar `chain = a.pipe(b).pipe(c)`, toh config `a`, `b`, `c` teeno tak pahunchti hai. Yeh LangSmith tracing aur LangGraph ke checkpointing (Chapter 12+) ke liye critical hai.

---

## Common Mistakes

1. **Wrong input shape pass karna**: Prompt template `{topic}` expect kar raha hai, par tumne `chain.invoke("closures")` seedha string pass kar diya (object ke bajaye). Fix: hamesha object pass karo jab tumhare prompt mein variables hon — `chain.invoke({ topic: "closures" })`.

2. **Parser ko galat jagah lagana**: `StringOutputParser` ko `AIMessage` chahiye hota hai, `ChatPromptValue` nahi. Agar tum galti se parser ko model se pehle pipe kar do (`prompt.pipe(parser).pipe(model)`), toh runtime error aayega.

3. **`.batch()` mein rate limits bhoolna**: Bina `maxConcurrency` set kiye 100 items ka batch bhejna — provider turant `429 Too Many Requests` de dega.

4. **Chains ko re-create karte rehna**: Har request pe naya `ChatOpenAI` ya naya `ChatPromptTemplate` instance banana wasteful hai. Chains ko module-level pe ek baar banao aur reuse karo (jaise ek DB connection pool banate ho, baar-baar naya connection nahi).

```typescript
// ❌ Galat - har request pe naya chain
app.post("/ask", async (req, res) => {
  const model = new ChatOpenAI({ model: "gpt-4o-mini" }); // wasteful!
  const chain = prompt.pipe(model).pipe(parser);
  res.json(await chain.invoke(req.body));
});

// ✅ Sahi - chain module level pe ek baar bana lo
const model = new ChatOpenAI({ model: "gpt-4o-mini" });
const chain = prompt.pipe(model).pipe(parser);

app.post("/ask", async (req, res) => {
  res.json(await chain.invoke(req.body));
});
```

---

## Poora Example — End-to-End

Chalo sab kuch ek saath dekhte hain — ek production-style chain jo prompt, model, parser, aur error handling sab combine karti hai:

```typescript
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence, RunnableLambda } from "@langchain/core/runnables";
import "dotenv/config";

// 1. Prompt
const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "Tum ek senior developer ho jo naye developers ko Hinglish mein " +
      "concepts samjhate ho. Jawab short aur practical rakho.",
  ],
  ["human", "{question}"],
]);

// 2. Model with fallback + retry
const primaryModel = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0.4,
  timeout: 10_000,
}).withRetry({ stopAfterAttempt: 2 });

const backupModel = new ChatAnthropic({ model: "claude-haiku-4-5" });

const model = primaryModel.withFallbacks([backupModel]);

// 3. Parser
const parser = new StringOutputParser();

// 4. Post-processing step
const addDisclaimer = RunnableLambda.from((answer: string) => {
  return `${answer}\n\n---\n(AI-generated jawab, double-check zaroor karo)`;
});

// 5. Poori chain compose karo
const devMentorChain = RunnableSequence.from([
  prompt,
  model,
  parser,
  addDisclaimer,
]);

// Usage
async function main() {
  // Single invoke
  const answer = await devMentorChain.invoke({
    question: "useEffect ka dependency array kaise kaam karta hai?",
  });
  console.log(answer);

  // Batch - multiple questions ek saath
  const answers = await devMentorChain.batch(
    [
      { question: "TypeScript generics kya hote hain?" },
      { question: "Node.js event loop kaise kaam karta hai?" },
    ],
    { maxConcurrency: 2 }
  );
  console.log(answers);

  // Streaming
  const stream = await devMentorChain.stream({
    question: "Docker containers vs VMs mein farak?",
  });
  for await (const chunk of stream) {
    process.stdout.write(chunk);
  }
}

main();
```

Is example mein dekho — `devMentorChain` khud ek `Runnable` hai jo `.invoke()`, `.batch()`, `.stream()` teeno support karta hai, bina extra code likhe. Yehi LCEL ki asli power hai.

---

## Key Takeaways

- **`Runnable`** LangChain.js ka universal interface hai — Prompts, Models, Parsers, Retrievers, sab isko implement karte hain, isliye sab ek jaisi API (`.invoke()`, `.batch()`, `.stream()`, `.pipe()`) share karte hain.
- **`.pipe()`** ek Runnable ka output agle Runnable ka input bana deta hai — dabbawala relay ki tarah, step-by-step data pass hota hai.
- **`RunnableSequence.from([a, b, c])`** aur `a.pipe(b).pipe(c)` functionally identical hain — dono se ek chain banti hai.
- **`RunnableLambda`** kisi bhi custom function ko chain-compatible Runnable bana deta hai — transformation ya custom logic ke liye.
- **`RunnableParallel`** (ya plain object syntax) multiple independent operations ko ek hi input pe parallel mein chalata hai.
- **`RunnablePassthrough`** original input ko chain ke aage bhi carry forward karta hai — RAG jaisi pipelines mein zaruri hota hai.
- **`.batch()`** multiple inputs concurrently process karta hai; production mein `maxConcurrency` explicitly set karna zaruri hai rate-limit errors se bachne ke liye.
- **`.stream()`** token-by-token output deta hai — chat UIs ke liye better UX.
- **`.withFallbacks()`** aur **`.withRetry()`** production-grade reliability ke liye hain, par yeh cost/latency trade-off ke saath aate hain — judiciously use karo.
- Chains ko **module-level pe ek baar** banao aur reuse karo — har request pe naya model/chain instance mat banao.
- LCEL ka har concept (Runnable, pipe, sequence) aage LangGraph mein bhi wahi ka wahi apply hota hai — yeh chapter poore course ka structural foundation hai.
