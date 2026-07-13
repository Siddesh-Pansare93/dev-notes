# Output Parsers and Structured Output

🟡 Intermediate

## Kya hota hai?

Socho tum Zomato ke liye ek feature bana rahe ho — user apni cravings type karta hai ("kuch spicy aur jaldi milne wala"), aur LLM ko us text se restaurant recommendations nikalni hai. LLM jo response dega, wo hoga plain English mein — kuch aisa:

> "Sure! I'd recommend trying Punjabi Dhaba for spicy food, they usually deliver in 20-25 minutes. Another great option is Biryani House..."

Ab is text ko tumhara Node.js backend kaise parse karega? `restaurant.name`, `restaurant.eta`, `restaurant.spiceLevel` jaise fields nikalne ke liye tumhe regex likhna padega, string splitting karni padegi — aur LLM agar thoda bhi wording change kar de ("I'd suggest" instead of "I'd recommend"), tumhara poora parsing logic tut jayega.

Yehi wo problem hai jo **Output Parsers aur Structured Output** solve karte hain. Idea simple hai: LLM se bolo ki JSON format mein jawab do, jo ek fixed schema follow kare — jaise `{ "name": string, "eta": number, "spiceLevel": "mild" | "medium" | "hot" }`. Phir us JSON ko type-safe object mein convert karo, taaki tumhara downstream code (database mein save karna, API response bhejna, UI render karna) bina kisi surprise ke chal sake.

## Kyun zaruri hai in agent-building?

Jab tum agents banate ho, LLM sirf ek "chat bot" nahi hota — wo tumhare system ka ek **decision-making component** ban jata hai. Agent ko decide karna hota hai:

- Konsa tool call karna hai aur kaunse parameters ke saath
- User ka intent kya hai (classification)
- Kya extract karna hai kisi document se (extraction)
- Next step kya hona chahiye (routing)

Ye sab cases mein tumhe LLM se **predictable, type-safe, machine-readable output** chahiye — free-flowing text nahi. Agar output structure follow nahi karega, to:

1. Tumhara code crash ho sakta hai (`undefined.property` errors)
2. Downstream tools ko wrong data mil sakta hai (jaise ek agent jo `amount: "five hundred"` bhej de instead of `amount: 500`)
3. Multi-step agent pipelines mein ek chota parsing error pura chain tod sakta hai

Isliye LangChain.js structured output ko first-class citizen ki tarah treat karta hai — aur ye chapter tumhe teen tareeke sikhayega: **Zod schemas**, **`withStructuredOutput()`**, aur **`StructuredOutputParser`**.

> [!info]
> Zod ek TypeScript-first schema validation library hai — agar tumne Express/tRPC mein request validation ke liye Zod use kiya hai, to yahan bhi wahi mental model apply hoga. Farak sirf itna hai ki ab hum validate LLM ke output ko kar rahe hain, HTTP request body ko nahi.

---

## Setup

```bash
npm install @langchain/openai @langchain/core zod
```

```ts
// .env
OPENAI_API_KEY=sk-...
```

Is chapter ke saare examples `ChatOpenAI` use karenge, lekin concepts kisi bhi chat model (Anthropic, Google, Groq, etc.) ke saath kaam karte hain jo tool-calling support karta hai.

---

## 1. Zod Schema — Structured Output ki Foundation

Sabse pehle samjhte hain Zod schema kaise define karte hain. Ye schema hi tumhare LLM output ka "contract" banta hai.

```ts
import { z } from "zod";

// Ek simple restaurant recommendation schema
const RestaurantSchema = z.object({
  name: z.string().describe("Restaurant ka naam"),
  cuisine: z.string().describe("Cuisine type, jaise 'North Indian', 'Chinese'"),
  etaMinutes: z.number().describe("Delivery mein lagne wala approx time in minutes"),
  spiceLevel: z.enum(["mild", "medium", "hot"]).describe("Spice level of the food"),
  isVeg: z.boolean().describe("Kya restaurant pure vegetarian hai"),
});

// TypeScript type automatically inferred ho jata hai schema se
type Restaurant = z.infer<typeof RestaurantSchema>;
```

> [!tip]
> `.describe()` calls ko halke mein mat lo. Ye descriptions LLM ko prompt ke andar bhej di jaati hain (JSON schema ke `description` field ke through) — jitni clear description hogi, LLM utna hi accurate output dega. Ye documentation nahi hai, ye **instructions** hain.

### Nested aur array schemas

Real-world agents mein data usually flat nahi hota. Zod nested objects aur arrays ko easily handle karta hai:

```ts
const OrderSchema = z.object({
  customerName: z.string(),
  items: z.array(
    z.object({
      itemName: z.string(),
      quantity: z.number().int().positive(),
      price: z.number().positive(),
    })
  ).describe("Order mein saare items ki list"),
  deliveryAddress: z.object({
    line1: z.string(),
    city: z.string(),
    pincode: z.string().length(6),
  }),
  paymentMethod: z.enum(["UPI", "COD", "CARD"]),
});

type Order = z.infer<typeof OrderSchema>;
```

Ye bilkul waise hi hai jaise IRCTC ka booking form — naam, seat details (array of passengers), payment method — sab kuch ek fixed, validated shape mein aana chahiye, warna booking fail ho jayegi.

---

## 2. `withStructuredOutput()` — Recommended Approach

`withStructuredOutput()` LangChain.js ka sabse modern aur reliable tareeka hai structured output lene ka. Ye internally model ke **native tool-calling / JSON mode** capabilities ka use karta hai (jaise OpenAI ka `function_calling` ya `json_schema` mode), jisse output guaranteed schema-compliant aata hai — tumhe manually prompt mein "please return JSON" likhne ki zarurat nahi.

### Basic Example

```ts
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

const RestaurantSchema = z.object({
  name: z.string().describe("Restaurant ka naam"),
  cuisine: z.string().describe("Cuisine type"),
  etaMinutes: z.number().describe("Delivery time in minutes"),
  spiceLevel: z.enum(["mild", "medium", "hot"]),
  isVeg: z.boolean(),
});

const model = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
});

// Model ko schema ke saath "bind" kar diya
const structuredModel = model.withStructuredOutput(RestaurantSchema, {
  name: "restaurant_recommendation", // optional, tool/function ka naam
});

async function main() {
  const result = await structuredModel.invoke(
    "Suggest one spicy North Indian restaurant that delivers fast."
  );

  console.log(result);
  // {
  //   name: 'Punjabi Dhaba',
  //   cuisine: 'North Indian',
  //   etaMinutes: 20,
  //   spiceLevel: 'hot',
  //   isVeg: false
  // }

  // TypeScript ko pata hai result ka exact shape - autocomplete milega!
  console.log(result.etaMinutes.toFixed(0));
}

main();
```

Yahan sabse important baat: `result` ek plain JS object hai (Zod-validated), **string nahi**. Koi `JSON.parse()` nahi karna pada. TypeScript ko bhi pata hai iska exact type hai — `name` string hai, `spiceLevel` sirf teen values mein se ek ho sakta hai. Editor mein autocomplete bhi kaam karega.

### `withStructuredOutput` ke internal modes

`withStructuredOutput()` do modes mein kaam kar sakta hai:

| Mode | Kaise kaam karta hai | Kab use karein |
|---|---|---|
| `"functionCalling"` (default) | Model ko ek "tool" define karke diya jaata hai, model us tool ko call karta hai apne structured args ke saath | Zyada models ke saath compatible, sabse reliable |
| `"jsonMode"` | Model ko directly JSON schema follow karne ko bola jaata hai (`response_format: json_schema`) | Jab model native JSON schema mode support karta ho (jaise newer OpenAI models) |

```ts
const structuredModel = model.withStructuredOutput(RestaurantSchema, {
  method: "jsonMode", // ya "functionCalling" (default)
});
```

### Raw response bhi chahiye? `includeRaw`

Kabhi kabhi tumhe sirf parsed data nahi, balki raw LLM response bhi chahiye hoti hai (jaise token usage track karne ke liye, ya debugging ke liye):

```ts
const structuredModel = model.withStructuredOutput(RestaurantSchema, {
  includeRaw: true,
});

const result = await structuredModel.invoke("Suggest a mild Chinese restaurant.");

console.log(result.parsed);   // validated Restaurant object
console.log(result.raw);      // original AIMessage with tool_calls, usage_metadata, etc.
```

> [!warning]
> `includeRaw: true` use karne par agar parsing fail ho jaye (rare, lekin ho sakta hai edge cases mein), to `result.parsed` `null` ho sakta hai aur error `result.raw` ke andar milega. Production code mein `parsed` ko `null` check karna mat bhoolo.

### Real Agent Example — Intent Classification

Ek common agentic use-case: user ka message aane par decide karna ki agent ko kya karna hai.

```ts
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

const IntentSchema = z.object({
  intent: z
    .enum(["order_status", "refund_request", "general_query", "complaint"])
    .describe("User ke message ka primary intent"),
  urgency: z.enum(["low", "medium", "high"]).describe("Kitni jaldi respond karna zaruri hai"),
  summary: z.string().describe("Ek line mein user ki problem ka summary"),
});

const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });
const classifier = model.withStructuredOutput(IntentSchema);

async function classifyMessage(userMessage: string) {
  const result = await classifier.invoke(
    `Classify this customer support message:\n"${userMessage}"`
  );
  return result;
}

// Usage
const result = await classifyMessage(
  "Mera order 3 din se 'out for delivery' dikha raha hai, pura refund chahiye!"
);
console.log(result);
// {
//   intent: 'refund_request',
//   urgency: 'high',
//   summary: 'Customer order delayed by 3 days, wants full refund'
// }

// Ab tum is result.intent ke basis pe agent ko route kar sakte ho
switch (result.intent) {
  case "refund_request":
    // handleRefundFlow(result);
    break;
  case "order_status":
    // handleOrderStatusFlow(result);
    break;
  // ...
}
```

Ye bilkul waise hai jaise Swiggy ka support system kaam karta hai — pehle message ko categorize karo (refund? complaint? general query?), phir uske hisaab se sahi team/flow ko route karo. LLM yaha ek smart router ban raha hai, aur `withStructuredOutput` guarantee deta hai ki `result.intent` hamesha in 4 values mein se ek hoga — kabhi bhi "the user seems upset" jaisa random text nahi aayega.

---

## 3. `StructuredOutputParser` — Manual / Legacy Approach

`withStructuredOutput()` aane se pehle (aur jab tumhe model ke tool-calling capability pe depend nahi karna — jaise purane models ya custom LLM endpoints ke saath), LangChain `StructuredOutputParser` provide karta hai. Ye ek **prompt-based approach** hai: parser khud ek format-instruction string generate karta hai jo tum prompt mein inject karte ho, aur phir raw text response ko parse karta hai.

### Kaise kaam karta hai

1. Zod schema se `StructuredOutputParser` banate ho
2. Parser se `getFormatInstructions()` leke prompt mein daalte ho
3. LLM plain text return karta hai (jisme JSON embedded hota hai)
4. Parser us text ko parse aur validate karta hai

```ts
import { ChatOpenAI } from "@langchain/openai";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";

const RestaurantSchema = z.object({
  name: z.string().describe("Restaurant ka naam"),
  cuisine: z.string().describe("Cuisine type"),
  etaMinutes: z.number().describe("Delivery time in minutes"),
  spiceLevel: z.enum(["mild", "medium", "hot"]),
});

// Parser banate hain schema se
const parser = StructuredOutputParser.fromZodSchema(RestaurantSchema);

// Parser format instructions generate karta hai (JSON schema + example)
const formatInstructions = parser.getFormatInstructions();
console.log(formatInstructions);
// "You must format your output as a JSON value that adheres to
//  a given JSON Schema instance..."

const prompt = PromptTemplate.fromTemplate(
  `Suggest one restaurant based on this request: {query}

{format_instructions}`
);

const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });

async function main() {
  const formattedPrompt = await prompt.format({
    query: "spicy North Indian food, fast delivery",
    format_instructions: formatInstructions,
  });

  const response = await model.invoke(formattedPrompt);
  const parsed = await parser.parse(response.content as string);

  console.log(parsed);
  // { name: 'Punjabi Dhaba', cuisine: 'North Indian', etaMinutes: 20, spiceLevel: 'hot' }
}

main();
```

### LCEL ke saath chain banana

`StructuredOutputParser` ek Runnable hai, isliye ise LCEL pipe (`.pipe()`) ke saath chain kar sakte ho — agla chapter (Chains and LCEL) mein isko detail mein cover karenge, lekin preview:

```ts
const chain = prompt.pipe(model).pipe(parser);

const result = await chain.invoke({
  query: "mild Chinese food",
  format_instructions: formatInstructions,
});

console.log(result); // directly parsed & validated object
```

### `withStructuredOutput` vs `StructuredOutputParser` — Kab kya use karein?

| Aspect | `withStructuredOutput()` | `StructuredOutputParser` |
|---|---|---|
| **Reliability** | High — model ka native tool-calling/JSON mode use karta hai | Medium — depends on model follow karega prompt instructions ko |
| **Setup** | Simple, ek line mein bind ho jata hai | Manual — format instructions khud prompt mein inject karni padti hain |
| **Model support** | Sirf tool-calling/JSON-mode support karne wale models | Kisi bhi text-generating model ke saath (even non-chat LLMs) |
| **Failure mode** | Rare parsing errors (model already constrained hai) | Zyada common — agar model instructions ignore kare to JSON.parse fail ho sakta hai |
| **Retry needed?** | Kam zarurat | Zyada zarurat — `OutputFixingParser` jaisi fallback strategy chahiye ho sakti hai |
| **Recommended for** | 95% modern production use-cases | Legacy models, ya jab full prompt-control chahiye |

> [!tip]
> **Rule of thumb**: Agar tumhara model (`gpt-4o`, `gpt-4o-mini`, Claude, Gemini) tool-calling support karta hai — jo aajkal almost sab karte hain — to hamesha `withStructuredOutput()` use karo. `StructuredOutputParser` ko samajhna important hai (legacy code padhne ke liye, aur underlying mechanics samajhne ke liye), lekin naya production code likhte waqt `withStructuredOutput()` hi default choice honi chahiye.

---

## 4. Advanced Zod Patterns for Structured Output

### Optional aur default fields

```ts
const ReviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string(),
  recommendToFriend: z.boolean().optional(),
  tags: z.array(z.string()).default([]),
});
```

> [!warning]
> Kuch models `.optional()` fields ko consistently handle nahi karte — kabhi include karenge, kabhi nahi. Agar field critical hai, use required rakho aur schema mein clearly describe karo ki agar value na ho to kya default use karna hai (jaise `z.string().describe("Agar comment nahi mila to empty string return karo")`).

### Union types — jab output ke multiple "shapes" ho sakte hain

Agentic systems mein aksar aisa hota hai ki LLM ko decide karna hai ki **kaunsa action** lena hai, aur har action ka apna alag shape hota hai:

```ts
const ActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("search"),
    query: z.string(),
  }),
  z.object({
    action: z.literal("book_table"),
    restaurantName: z.string(),
    partySize: z.number(),
    time: z.string(),
  }),
  z.object({
    action: z.literal("cancel_order"),
    orderId: z.string(),
  }),
]);

const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });
const actionModel = model.withStructuredOutput(ActionSchema);

const decision = await actionModel.invoke(
  "Book a table for 4 people at Punjabi Dhaba at 8 PM tonight"
);

// TypeScript narrowing automatically kaam karta hai!
if (decision.action === "book_table") {
  console.log(decision.restaurantName, decision.partySize, decision.time);
}
```

Ye pattern bahut powerful hai — agent ke andar ek "router node" bana sakte ho jo discriminated union ke through decide karta hai kaunsa branch execute karna hai. LangGraph chapters mein isi pattern ko conditional edges ke saath combine karenge.

### Validation with `.refine()`

Zod ka `.refine()` custom business-logic validation add karne deta hai — jo simple type-checking se aage jaata hai:

```ts
const BookingSchema = z.object({
  partySize: z.number().int().positive(),
  time: z.string(),
}).refine((data) => data.partySize <= 20, {
  message: "Restaurant sirf 20 tak ke groups accept karta hai",
  path: ["partySize"],
});
```

Agar LLM `partySize: 50` return kare, Zod validation error throw karega, aur tum us error ko catch karke LLM ko retry-prompt bhej sakte ho ("Please provide a party size of 20 or fewer").

---

## 5. Error Handling aur Retries (Production Consideration)

Structured output "guaranteed" hone ka matlab 100% foolproof nahi hai. Production mein ye cheezein zaroor handle karo:

```ts
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

const OrderSchema = z.object({
  itemName: z.string(),
  quantity: z.number().int().positive(),
});

const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });
const structuredModel = model.withStructuredOutput(OrderSchema, {
  includeRaw: true,
});

async function extractOrderSafely(userInput: string) {
  try {
    const result = await structuredModel.invoke(userInput);

    if (!result.parsed) {
      console.error("Parsing failed, raw response:", result.raw);
      throw new Error("Could not extract structured order from input");
    }

    // Extra validation layer - Zod se validated hai, phir bhi business rules check karo
    const validated = OrderSchema.safeParse(result.parsed);
    if (!validated.success) {
      console.error("Schema validation failed:", validated.error.format());
      throw new Error("Invalid order structure");
    }

    return validated.data;
  } catch (err) {
    console.error("Structured output extraction failed:", err);
    // Production mein: retry with a clarifying prompt, ya fallback to a default,
    // ya escalate to human review
    throw err;
  }
}
```

### Common Gotchas

> [!warning]
> **1. Overly complex schemas fail more often.** Agar schema mein 15+ nested fields hain, deeply nested arrays hain, model confuse ho sakta hai. Complex extraction ko chhote schemas mein todo, ya multiple LLM calls use karo.

> [!warning]
> **2. `temperature: 0` use karo structured extraction ke liye.** High temperature output ki randomness badhata hai, jo schema-compliance ko thoda unpredictable bana sakta hai (khaas kar `StructuredOutputParser` jaise prompt-based approaches mein).

> [!warning]
> **3. Har model equally accha nahi hota tool-calling mein.** Chhote/cheaper models (jaise `gpt-4o-mini`) bade models se zyada mistakes karte hain complex schemas ke saath. Agar accuracy critical hai (jaise payment amounts extract karna), bigger model use karo ya extra validation layer rakho.

> [!warning]
> **4. Cost aur latency trade-off.** `withStructuredOutput()` internally ek tool-call generate karta hai — ye normal text generation se thoda zyada tokens use kar sakta hai (schema definition prompt mein jaati hai). Bahut simple extractions ke liye ye negligible hai, lekin high-volume production systems mein token cost track karo.

---

## 6. Quick Comparison Table — Teen Approaches

| Approach | Output Type | Reliability | Best For |
|---|---|---|---|
| Plain prompting ("return JSON please") | string (needs manual `JSON.parse`) | Low | Prototyping only, never production |
| `StructuredOutputParser` | Parsed & Zod-validated object | Medium | Legacy models, full prompt control needed |
| `withStructuredOutput()` | Parsed & Zod-validated object, TypeScript-typed | High | **Default choice for modern production agents** |

---

## Key Takeaways

- Structured output ka core idea: LLM se free-text lene ke bajaye, ek fixed **Zod schema** ke hisaab se type-safe, validated data lena — jisse downstream code reliably kaam kar sake.
- **Zod schemas** LangChain.js mein structured output ka foundation hain — `.describe()` calls LLM ko guide karte hain, aur `z.infer<>` se automatic TypeScript types milte hain.
- **`withStructuredOutput()`** modern, recommended approach hai — model ke native tool-calling/JSON mode ka use karta hai, high reliability deta hai, aur ek line mein setup ho jata hai.
- **`StructuredOutputParser`** legacy/manual approach hai — format instructions ko khud prompt mein inject karna padta hai, aur text response ko manually parse karna padta hai. Kam reliable, lekin har model ke saath compatible.
- **Discriminated unions** (`z.discriminatedUnion`) agentic routing ke liye powerful pattern hain — LLM decide karta hai kaunsa "action shape" lena hai, aur TypeScript automatically narrow ho jata hai.
- `includeRaw: true` use karo jab tumhe parsed data ke saath raw LLM response (token usage, metadata) bhi chahiye ho.
- Production mein hamesha `temperature: 0`, extra validation layers (`safeParse`), aur error-handling/retry logic rakho — structured output "guaranteed" hone ka matlab "kabhi fail nahi hoga" nahi hai.
- Complex nested schemas accuracy kam kar sakte hain — schema ko jitna simple aur clear rakhoge, model utna hi accurate output dega.
