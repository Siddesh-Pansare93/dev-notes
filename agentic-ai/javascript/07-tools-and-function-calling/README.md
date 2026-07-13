# Tools and Function Calling

🟡 Intermediate

## Kya hota hai?

Socho ek second ke liye — agar koi tumse keh de "aaj Pune mein weather kaisa hai?", tumhare paas do options hain: ya to guess karo (aur galat ho sakte ho), ya phir apna phone nikal ke weather app check karo (accurate answer). LLM ke saath bhi exactly yehi problem hai. GPT-4 ya Claude ko training ke time tak ka hi data pata hai — usse pucho "abhi USD to INR rate kya hai" ya "mera order kaha pahuncha", to wo ya to hallucinate karega ya seedha bol dega "I don't have real-time access to that information."

**Tools (function calling)** ye exact gap fill karte hain. Idea simple hai: LLM ko hum bolte hain "tumhare paas ye functions available hain — agar tumhe lagta hai user ka sawaal answer karne ke liye inme se kisi ki zaroorat hai, to mujhe bata do konsa function call karna hai aur kaunse arguments ke saath." LLM khud function execute *nahi* karta — wo sirf ek structured request return karta hai (jaise `{ tool: "getWeather", args: { city: "Pune" } }`), aur tumhara Node.js code us function ko actually run karke result LLM ko wapas bhejta hai.

Ye bilkul Swiggy ke customer support bot jaisa hai — jab tum pucho "mera order kaha hai", bot khud order status nahi "jaanta" — wo backend ke `getOrderStatus(orderId)` API ko call karta hai, real data leke aata hai, aur phir tumhe natural language mein jawab deta hai. LLM yahan sirf "decide" kar raha hai ki *kaunsa* tool call karna hai aur *kya* arguments dene hain — actual kaam (database query, API call, calculation) tumhara code karta hai.

## Kyun zaruri hai agent-building mein?

Function calling hi wo cheez hai jo ek "chatbot" ko "agent" banati hai. Bina tools ke, LLM sirf text generate kar sakta hai — kuch bhi *action* nahi le sakta. Tools ke saath, LLM:

1. **Real-time data** access kar sakta hai (weather, stock prices, order status)
2. **Calculations** kar sakta hai jo wo khud accurately nahi kar sakta (LLMs math mein weak hote hain)
3. **External systems ko modify** kar sakta hai (database mein row insert karna, email bhejna, calendar mein event create karna)
4. **Multi-step reasoning** kar sakta hai — ek tool ka output dekh ke decide karna ki agla kaunsa tool call karna hai

Ye pura course — LangGraph agents, ReAct loops, multi-agent systems — sab tools ke upar hi bana hai. Isliye is chapter ko achhe se samajhna zaroori hai, kyunki Chapter 8 ("Building your first Agent") aur usse aage sab kuch isी foundation pe khada hai.

> [!info]
> **"Function calling" vs "Tool calling"** — ye dono terms mostly interchangeable use hote hain. OpenAI originally "function calling" bolta tha, ab industry-wide "tool calling" zyada common term hai kyunki ek call mein multiple tools ho sakte hain, aur ye sirf functions tak limited nahi (retrieval, code execution, etc. bhi "tools" hi hain). LangChain.js docs mein bhi "tool calling" hi standard term hai.

---

## Setup

```bash
npm install @langchain/openai @langchain/core zod
```

```bash
# .env
OPENAI_API_KEY=sk-...
```

```ts
// Common imports used throughout this chapter
import { ChatOpenAI } from "@langchain/openai";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
```

---

## 1. Tool Kya Hota Hai, Under the Hood

Ek "tool" mein teen cheezein hoti hain:

| Part | Kya karta hai | Analogy |
|---|---|---|
| **Name** | Unique identifier jo LLM use karega tool ko refer karne ke liye | Swiggy app mein button ka label — "Track Order" |
| **Description** | Plain English mein bataata hai tool kya karta hai aur kab use karna hai | Button ke upar ka tooltip |
| **Schema (args)** | Zod schema jo define karta hai tool ko kaunse parameters chahiye, kis type ke | Form fields jo tumhe fill karne padte hain (Order ID, required) |

Jab tum LLM ko tools ke saath call karte ho, LangChain in teeno cheezon ko **JSON Schema** mein convert karke LLM provider (OpenAI) ko bhejta hai. LLM in descriptions ko padhkar decide karta hai ki konsa tool relevant hai — isliye description likhna utna hi important hai jitna khud function likhna.

> [!warning]
> Agar tumhari tool description vague hai (jaise "gets data"), LLM confuse ho jayega ki kab use karna hai. Achhi description specific honi chahiye: "Given a city name, returns the current temperature and weather condition in Celsius."

---

## 2. `tool()` Helper Se Tool Define Karna

LangChain.js mein tool banane ka modern, recommended tareeka hai `tool()` helper function — ye `@langchain/core/tools` se aata hai.

```ts
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const getWeatherTool = tool(
  async ({ city }) => {
    // Yahan real API call hoga (jaise OpenWeatherMap)
    // Abhi ke liye hum mock data return kar rahe hain
    const mockWeatherDB: Record<string, { temp: number; condition: string }> = {
      pune: { temp: 29, condition: "Partly Cloudy" },
      mumbai: { temp: 32, condition: "Humid" },
      delhi: { temp: 38, condition: "Sunny" },
    };

    const data = mockWeatherDB[city.toLowerCase()];
    if (!data) {
      return `Sorry, weather data available nahi hai ${city} ke liye.`;
    }
    return `${city} mein abhi ${data.temp}°C hai aur mausam ${data.condition} hai.`;
  },
  {
    name: "get_weather",
    description:
      "Kisi bhi city ka current weather (temperature aur condition) return karta hai. Sirf tab use karo jab user specifically weather ke baare mein pooche.",
    schema: z.object({
      city: z.string().describe("Shehar ka naam, jaise 'Pune' ya 'Mumbai'"),
    }),
  }
);
```

`tool()` function 2 arguments leta hai:

1. **Implementation function** — actual logic jo run hoga. Ye `async` ho sakta hai (real-world mein zyadatar tools async hote hain — API calls, DB queries).
2. **Config object** — `name`, `description`, aur `schema` (Zod object schema).

Tool ko manually call karke test kar sakte ho:

```ts
const result = await getWeatherTool.invoke({ city: "Pune" });
console.log(result);
// "Pune mein abhi 29°C hai aur mausam Partly Cloudy hai."
```

### Multiple parameters wala tool

```ts
const calculateEMITool = tool(
  async ({ principal, annualRatePercent, tenureMonths }) => {
    const monthlyRate = annualRatePercent / 12 / 100;
    const emi =
      (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
      (Math.pow(1 + monthlyRate, tenureMonths) - 1);
    return `Monthly EMI hoga approx ₹${emi.toFixed(2)}`;
  },
  {
    name: "calculate_emi",
    description:
      "Loan ka monthly EMI (Equated Monthly Installment) calculate karta hai, given principal amount, annual interest rate, aur tenure in months. Jab bhi user loan/EMI se related calculation pooche, ye tool use karo — khud math mat karo.",
    schema: z.object({
      principal: z.number().positive().describe("Loan ki total amount in rupees"),
      annualRatePercent: z.number().positive().describe("Annual interest rate percentage mein, jaise 8.5"),
      tenureMonths: z.number().int().positive().describe("Loan tenure months mein"),
    }),
  }
);
```

> [!tip]
> Notice kiya — description mein humne explicitly likha "khud math mat karo". LLMs arithmetic mein galtiyan karte hain (especially decimals aur compounding ke saath). Jab bhi precise calculation chahiye ho, ek dedicated tool banao aur description mein LLM ko clearly bolo ki calculation ke liye tool use kare, apne "mind" se answer na de.

---

## 3. Zod Schema Deep-Dive — Tool Ke Parameters

Zod schema hi wo contract hai jo decide karta hai LLM tool ko kaise call kar sakta hai. Jitna precise schema, utna better tool-calling accuracy.

### Optional aur default values

```ts
const searchRestaurantsTool = tool(
  async ({ cuisine, maxPriceForTwo, isVegOnly }) => {
    // ... search logic
    return `Found restaurants for ${cuisine}, budget ₹${maxPriceForTwo}, veg-only: ${isVegOnly}`;
  },
  {
    name: "search_restaurants",
    description: "Cuisine, budget, aur veg preference ke basis pe restaurants search karta hai (Zomato-style).",
    schema: z.object({
      cuisine: z.string().describe("Cuisine type, jaise 'North Indian', 'Chinese', 'Italian'"),
      maxPriceForTwo: z.number().positive().optional().describe("Maximum budget for two people, agar specify na ho to 500 assume karo"),
      isVegOnly: z.boolean().default(false).describe("Sirf pure-veg restaurants chahiye ya nahi"),
    }),
  }
);
```

### Enums — jab options limited hon

```ts
const bookRideTool = tool(
  async ({ pickupLocation, dropLocation, rideType }) => {
    return `${rideType} booked from ${pickupLocation} to ${dropLocation}`;
  },
  {
    name: "book_ride",
    description: "Ola/Uber-style ride book karta hai given pickup, drop, aur ride type.",
    schema: z.object({
      pickupLocation: z.string(),
      dropLocation: z.string(),
      rideType: z.enum(["Bike", "Auto", "Mini", "Sedan", "SUV"]).describe("Vehicle type jo user chahta hai"),
    }),
  }
);
```

`z.enum()` use karna bahut important hai jab bhi values ek fixed set se aati hain — isse LLM kabhi bhi random/invalid value generate nahi karega, kyunki JSON Schema level pe hi restriction lag jaati hai.

### Nested objects aur arrays

```ts
const placeOrderTool = tool(
  async ({ items, deliveryAddress }) => {
    const total = items.reduce((sum, item) => sum + item.quantity * item.pricePerUnit, 0);
    return `Order placed! ${items.length} items, total ₹${total}, delivering to ${deliveryAddress.city}`;
  },
  {
    name: "place_order",
    description: "Cart items aur delivery address ke saath ek naya order place karta hai.",
    schema: z.object({
      items: z
        .array(
          z.object({
            name: z.string(),
            quantity: z.number().int().positive(),
            pricePerUnit: z.number().positive(),
          })
        )
        .min(1)
        .describe("Order mein include kiye jaane wale items"),
      deliveryAddress: z.object({
        line1: z.string(),
        city: z.string(),
        pincode: z.string().length(6),
      }),
    }),
  }
);
```

> [!warning]
> Zyada deeply nested schemas (3-4 levels se zyada) LLM ke liye confusing ho sakte hain aur accuracy drop hoti hai. Jahan tak possible ho, schema flat rakho, ya complex input ko multiple simpler tool calls mein todo.

---

## 4. Tool Ko Chat Model Se Bind Karna

Sirf tool define karna kaafi nahi — LLM ko batana padega ki ye tools available hain. Iske liye `bindTools()` use hota hai.

```ts
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({ model: "gpt-4o", temperature: 0 });

const modelWithTools = model.bindTools([getWeatherTool, calculateEMITool]);

const response = await modelWithTools.invoke("Pune mein weather kaisa hai?");

console.log(response.tool_calls);
/*
[
  {
    name: 'get_weather',
    args: { city: 'Pune' },
    id: 'call_abc123',
    type: 'tool_call'
  }
]
*/
```

Yahan kya hua samjho:

1. `bindTools()` LLM ko tools ke JSON schemas bhej deta hai (system-level, background mein).
2. Jab tum `.invoke()` karte ho, LLM decide karta hai ki iss query ke liye tool chahiye ya nahi.
3. Agar chahiye, to response ka content khali (ya minimal) hoga, aur `response.tool_calls` array mein wo tools honge jo LLM call karna chahta hai, along with generated arguments.
4. **LLM khud tool execute nahi karta** — sirf "mujhe ye call karna hai" bolta hai. Actual execution tumhara responsibility hai.

> [!info]
> `temperature: 0` set karna tool-calling ke liye best practice hai — tumhe deterministic, consistent tool selection chahiye, creative/random responses nahi.

### Agar tool ki zaroorat na ho

```ts
const response2 = await modelWithTools.invoke("Tumhara naam kya hai?");
console.log(response2.tool_calls); // []
console.log(response2.content); // "Main ek AI assistant hoon..."
```

LLM khud smart decision leta hai — agar query answer karne ke liye tool ki zaroorat nahi, to normal text response deta hai.

---

## 5. Full Loop — Tool Call Execute Karke Result Wapas Bhejna

Ye sabse important part hai. Real flow ye hota hai:

```
User message → LLM (with tools bound) → Tool call request
    → Tumhara code tool execute karta hai
    → Result LLM ko wapas bhejo (as ToolMessage)
    → LLM final natural-language answer generate karta hai
```

```ts
import { ChatOpenAI } from "@langchain/openai";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { HumanMessage, ToolMessage, AIMessage } from "@langchain/core/messages";

const getWeatherTool = tool(
  async ({ city }) => {
    const mockWeatherDB: Record<string, string> = {
      pune: "29°C, Partly Cloudy",
      mumbai: "32°C, Humid",
    };
    return mockWeatherDB[city.toLowerCase()] ?? "Data not available";
  },
  {
    name: "get_weather",
    description: "City ka current weather return karta hai.",
    schema: z.object({ city: z.string() }),
  }
);

const model = new ChatOpenAI({ model: "gpt-4o", temperature: 0 });
const modelWithTools = model.bindTools([getWeatherTool]);

async function chatWithTools(userInput: string) {
  const messages: (HumanMessage | AIMessage | ToolMessage)[] = [
    new HumanMessage(userInput),
  ];

  // Step 1: LLM ko call karo, dekho tool chahiye ya nahi
  const aiResponse = await modelWithTools.invoke(messages);
  messages.push(aiResponse);

  // Step 2: Agar LLM ne tool call maanga hai, to execute karo
  if (aiResponse.tool_calls && aiResponse.tool_calls.length > 0) {
    for (const toolCall of aiResponse.tool_calls) {
      let toolResult: string;

      // Registry pattern — production mein multiple tools honge
      if (toolCall.name === "get_weather") {
        toolResult = await getWeatherTool.invoke(toolCall.args as { city: string });
      } else {
        toolResult = `Unknown tool: ${toolCall.name}`;
      }

      // Step 3: Result ko ToolMessage ke roop mein wapas bhejo
      messages.push(
        new ToolMessage({
          content: toolResult,
          tool_call_id: toolCall.id!,
        })
      );
    }

    // Step 4: LLM ko dobara call karo — ab wo final answer generate karega
    const finalResponse = await modelWithTools.invoke(messages);
    return finalResponse.content;
  }

  // Agar tool ki zaroorat nahi thi
  return aiResponse.content;
}

const answer = await chatWithTools("Pune aur Mumbai dono ka weather bata do");
console.log(answer);
// "Pune mein 29°C hai aur Partly Cloudy hai, jabki Mumbai mein 32°C aur Humid hai."
```

Kuch cheezein carefully dekho:

- **`tool_call_id`** — har `ToolMessage` ko batana padta hai ki wo *kaunse* tool call ka response hai. Ye tab critical ho jaata hai jab LLM ek saath multiple tools call kare (jaise upar wale example mein agar Pune aur Mumbai dono ke liye alag-alag `get_weather` calls hoti).
- **Message history maintain karna** — `messages` array mein `HumanMessage`, `AIMessage` (jisme tool_calls hain), aur `ToolMessage` (result) sab sequence mein rehte hain. LLM ko poora context chahiye hota hai final answer banane ke liye.
- **Multiple tool calls ek saath** — modern models (GPT-4o) ek hi response mein multiple tool calls return kar sakte hain (parallel tool calling), isliye `for` loop se sab handle karo.

> [!tip]
> Ye poora "call → execute → feed back → final answer" loop hi LangGraph mein **ToolNode** ke through automate hota hai (Chapter 19 mein detail se dekhenge). Abhi manually samajhna zaroori hai taaki pata chale hood ke neeche kya ho raha hai.

---

## 6. Tool Registry Pattern (Production-Ready)

Real applications mein tumhare paas dus-bees tools honge. `if/else` chain likhna maintainable nahi. Iske bajaye ek **Map-based registry** banao:

```ts
import { StructuredToolInterface } from "@langchain/core/tools";

const allTools: StructuredToolInterface[] = [getWeatherTool, calculateEMITool, bookRideTool];

// Name → Tool ka fast lookup map
const toolRegistry = new Map(allTools.map((t) => [t.name, t]));

async function executeToolCall(toolCall: { name: string; args: Record<string, unknown>; id?: string }) {
  const matchedTool = toolRegistry.get(toolCall.name);

  if (!matchedTool) {
    return `Error: Tool '${toolCall.name}' registered nahi hai.`;
  }

  try {
    return await matchedTool.invoke(toolCall.args);
  } catch (err) {
    // Tool fail ho sakta hai — LLM ko error bhi ek valid "result" ki tarah bhejo
    return `Error executing ${toolCall.name}: ${(err as Error).message}`;
  }
}
```

> [!warning]
> **Tool execution errors ko silently mat nigalo, aur crash bhi mat hone do.** Agar tool fail hota hai (jaise external API down hai), us error message ko `ToolMessage` ke content mein daal ke LLM ko wapas bhej do. LLM usko dekhkar graceful response de sakta hai ("Sorry, abhi weather data fetch nahi ho pa raha"). Agar tumne poore process ko crash hone diya, to user ko koi response hi nahi milega.

---

## 7. OpenAI Function Calling — Seedha API Se (Bina LangChain)

LangChain internally OpenAI ke function-calling API ko hi use karta hai. Ye samajhna useful hai ki neeche level pe kya ho raha hai — kabhi kabhi tumhe raw SDK use karna pad sakta hai (jaise lightweight scripts mein jaha poora LangChain overhead nahi chahiye).

```ts
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const tools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "Kisi city ka current weather return karta hai.",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "Shehar ka naam" },
        },
        required: ["city"],
      },
    },
  },
];

const completion = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Delhi mein weather kaisa hai?" }],
  tools,
  tool_choice: "auto", // "auto" | "required" | "none" | { specific function }
});

const message = completion.choices[0].message;

if (message.tool_calls) {
  for (const call of message.tool_calls) {
    console.log(call.function.name); // "get_weather"
    console.log(JSON.parse(call.function.arguments)); // { city: "Delhi" }
  }
}
```

Notice karo — ye bilkul wahi structure hai jo LangChain internally generate karta hai (`bindTools()` isी JSON schema format mein convert karta hai tumhare Zod schema ko). LangChain ka fayda ye hai ki tumhe manually JSON Schema likhne ki zaroorat nahi — Zod se automatically ban jaata hai, aur provider-agnostic hai (same code OpenAI, Anthropic, Google sabke saath chalta hai).

### `tool_choice` options

| Value | Behavior |
|---|---|
| `"auto"` (default) | LLM khud decide karta hai tool use karna hai ya nahi |
| `"required"` | LLM ko **zaroor** koi tool call karna padega |
| `"none"` | Tool calling disable — normal text response |
| `{ type: "function", function: { name: "get_weather" } }` | Force karo ek specific tool hi call ho |

LangChain.js mein ye equivalent hai:

```ts
// Force a specific tool
const forcedModel = model.bindTools([getWeatherTool], {
  tool_choice: "get_weather",
});

// Force any tool to be called
const requiredModel = model.bindTools([getWeatherTool, calculateEMITool], {
  tool_choice: "required",
});
```

> [!tip]
> `tool_choice: "required"` bahut useful hai jab tum LLM ko structured-extraction jaise use-case ke liye "force" karna chahte ho — jaise Chapter 4 mein dekha tha, extraction ke liye ek single tool define karke usse "required" bana dena, structured output ka ek reliable pattern hai.

---

## 8. Multiple Tools — Ek Sath Bind Karna

Real agents mein LLM ko ek saath kai tools milte hain, aur wo khud pick karta hai konsa (ya kaunse) use karna hai.

```ts
const searchWebTool = tool(
  async ({ query }) => `Mock search results for: ${query}`,
  {
    name: "search_web",
    description: "Internet pe kisi bhi cheez ke baare mein latest information search karta hai.",
    schema: z.object({ query: z.string() }),
  }
);

const sendEmailTool = tool(
  async ({ to, subject, body }) => {
    // real SMTP/SES call yahan hota
    return `Email sent to ${to} with subject "${subject}"`;
  },
  {
    name: "send_email",
    description: "Kisi ko email bhejta hai. Sirf tab use karo jab user explicitly email bhejne ko bole.",
    schema: z.object({
      to: z.string().email(),
      subject: z.string(),
      body: z.string(),
    }),
  }
);

const modelWithManyTools = model.bindTools([
  getWeatherTool,
  calculateEMITool,
  searchWebTool,
  sendEmailTool,
]);

const res = await modelWithManyTools.invoke(
  "Pune ka weather check karo aur mujhe raj@example.com pe mail kar do"
);

console.log(res.tool_calls);
/*
[
  { name: 'get_weather', args: { city: 'Pune' }, id: 'call_1', ... },
  { name: 'send_email', args: { to: 'raj@example.com', subject: '...', body: '...' }, id: 'call_2', ... }
]
*/
```

Dekho — ek hi query ne **do tools ko parallel call** kiya. Ye modern models (GPT-4o, Claude) ki built-in capability hai. Tumhara execution loop dono calls ko handle karega (jaisa Section 5 mein dikhaya).

> [!warning]
> **Har tool ko available karna hamesha sahi decision nahi hai.** Jitne zyada tools bind karoge, LLM ke liye "sahi tool choose karna" utna hi harder ho jaata hai (especially agar descriptions overlap karti hain). Production mein: agent ko sirf wahi tools do jo current context mein relevant hain, na ki poori company ke 50 tools ek saath.

---

## 9. Tools Ke Return Types — String vs Structured

By default, tool ka return value **string** hona chahiye (kyunki `ToolMessage.content` string expect karta hai). Lekin kabhi-kabhi tumhe structured data bhi chahiye hota hai (jaise UI mein render karne ke liye raw JSON).

```ts
const getOrderStatusTool = tool(
  async ({ orderId }) => {
    const order = {
      id: orderId,
      status: "Out for Delivery",
      eta: "15 mins",
    };

    // LLM ke liye readable string
    return JSON.stringify(order);
  },
  {
    name: "get_order_status",
    description: "Order ID se uska current status fetch karta hai.",
    schema: z.object({ orderId: z.string() }),
  }
);
```

Agar tumhe **dono** chahiye — LLM ke liye text summary AND raw structured data (jaise frontend ko bhejne ke liye) — to `responseFormat: "content_and_artifact"` use karo:

```ts
const getOrderDetailsTool = tool(
  async ({ orderId }) => {
    const orderData = { id: orderId, items: ["Biryani", "Coke"], total: 450 };
    const summaryForLLM = `Order ${orderId}: ${orderData.items.join(", ")}, total ₹${orderData.total}`;

    // [content_for_llm, artifact_for_your_app]
    return [summaryForLLM, orderData];
  },
  {
    name: "get_order_details",
    description: "Order ka poora detail fetch karta hai.",
    schema: z.object({ orderId: z.string() }),
    responseFormat: "content_and_artifact",
  }
);

const toolMessage = await getOrderDetailsTool.invoke({
  type: "tool_call",
  name: "get_order_details",
  args: { orderId: "ORD123" },
  id: "call_1",
});

console.log(toolMessage.content); // string — LLM ko jayega
console.log(toolMessage.artifact); // raw object — tumhare app ko milega, LLM ko nahi
```

> [!info]
> `artifact` field kabhi bhi LLM ko nahi bheja jaata — ye sirf tumhare application code ke liye hai. Ye pattern useful hai jab tool ka output UI mein render karna ho (jaise ek chart, image, ya table) lekin LLM ko sirf uska summary chahiye ho.

---

## 10. Error Handling Aur Validation

### Zod validation automatic hai

Agar LLM galat type ka argument bhejta hai (jaise string ki jagah number), Zod validation error throw karega jab `.invoke()` call hota hai:

```ts
try {
  await calculateEMITool.invoke({
    principal: "not a number", // galat type!
    annualRatePercent: 8.5,
    tenureMonths: 12,
  } as any);
} catch (err) {
  console.log("Validation failed:", (err as Error).message);
}
```

Practically ye rarely hota hai kyunki LLM ko schema pehle se pata hota hai, lekin production mein **hamesha assume karo ki LLM galti kar sakta hai** — kabhi missing field, kabhi wrong format.

### Tool ke andar defensive coding

```ts
const chargePaymentTool = tool(
  async ({ amount, upiId }) => {
    if (amount <= 0) {
      return "Error: Amount zero ya negative nahi ho sakta.";
    }
    if (!upiId.includes("@")) {
      return "Error: Invalid UPI ID format.";
    }

    try {
      // real payment gateway call
      // const result = await paymentGateway.charge({ amount, upiId });
      return `₹${amount} successfully charged to ${upiId}`;
    } catch (err) {
      return `Payment failed: ${(err as Error).message}`;
    }
  },
  {
    name: "charge_payment",
    description: "UPI ke through payment charge karta hai. Sirf explicit user confirmation ke baad call karo.",
    schema: z.object({
      amount: z.number().positive(),
      upiId: z.string(),
    }),
  }
);
```

> [!warning]
> **Golden rule: tool ke andar se kabhi bhi raw exception throw hokar poori chain crash nahi honi chahiye.** Errors ko catch karke ek meaningful string return karo, jise LLM padh sake aur user ko samjha sake. Payment, database writes, jaise **destructive/side-effecting tools** ke liye hamesha explicit confirmation step socho (Human-in-the-loop — Chapter 16 mein detail se).

---

## 11. Common Mistakes (Gotchas)

1. **Vague descriptions** — "Gets data" jaisi description se LLM confuse hota hai ki tool kab use karna hai. Hamesha specific likho: input kya expect karta hai, output kya milega, kab use karna hai, kab nahi.

2. **Bahut zyada tools bind karna** — 30-40 tools ek saath dene se accuracy drop hoti hai. Related tools ko group karo, ya sirf relevant subset dynamically bind karo (dynamic tool selection — advanced pattern).

3. **`tool_call_id` bhool jaana** — agar `ToolMessage` mein `tool_call_id` match nahi karta, kai providers error de dete hain ya wrong context assume kar lete hain. Hamesha `toolCall.id` se map karo.

4. **Tool return value non-string bhejna bina `content_and_artifact`** — agar tool directly object return kare bina `responseFormat` specify kiye, kai providers error denge ya inconsistent behavior dikhayenge.

5. **Assume karna LLM sirf ek tool call karega** — production code hamesha `tool_calls` ko **array** treat karo aur loop se process karo, kabhi single object assume mat karo.

6. **Temperature high rakhna tool-calling ke liye** — `temperature: 0` ya bahut low value use karo jab tool selection ki accuracy matter karti hai. High temperature se LLM galat tool choose kar sakta hai ya arguments hallucinate kar sakta hai.

7. **Cost aur latency ignore karna** — har tool call round-trip ek extra LLM call hai (pehle "decide karo" call, phir "final answer do" call). Agar tumhare pass 5 sequential tool calls hain, matlab 6 LLM calls ho gaye ek hi user request ke liye — cost aur latency dono impact hoti hai. Jahan possible ho, parallel tool calls encourage karo aur unnecessary tools mat bind karo.

---

## 12. Production Checklist

> [!tip]
> Agent production mein deploy karne se pehle ye checklist zaroor verify karo:

- [ ] Har tool ki description specific aur unambiguous hai
- [ ] Zod schema mein saare fields pe `.describe()` hai
- [ ] Tool execution errors gracefully handled hain (try/catch, meaningful error strings)
- [ ] Destructive tools (payment, delete, email) ke liye human-confirmation ya guardrails hain
- [ ] `temperature: 0` (ya near-zero) tool-calling models ke liye set hai
- [ ] Tool registry pattern use ho raha hai (Map-based lookup), na ki long if/else chains
- [ ] Timeout handling hai slow external APIs ke liye (jaise `Promise.race` ya `AbortController`)
- [ ] Logging/tracing set up hai taaki dekh sako LLM ne kaunsa tool kab call kiya (Chapter 10 mein detail)

---

## Key Takeaways

- **Tools LLM ko "action lene" ki capability dete hain** — real-time data fetch karna, calculations karna, external systems modify karna — jo cheezein sirf text-generation se possible nahi.
- LangChain.js mein `tool()` helper se tool banate ho — teen zaroori cheezein: `name`, `description`, aur Zod `schema`.
- **LLM khud tool execute nahi karta** — sirf structured request return karta hai (`tool_calls` array); execution tumhara application code karta hai.
- Poora flow: `bindTools()` → LLM decide karta hai → tumhara code execute karta hai → result `ToolMessage` ke through wapas bhejo → LLM final answer deta hai.
- `tool_call_id` maintain karna zaroori hai jab multiple tools ek saath call hote hain (parallel tool calling).
- `responseFormat: "content_and_artifact"` se tum LLM ke liye text summary AND apne app ke liye raw structured data dono return kar sakte ho.
- OpenAI ke raw SDK mein `tools` + `tool_choice` parameters exact wahi kaam karte hain jo LangChain internally use karta hai — LangChain sirf provider-agnostic abstraction aur Zod-to-JSON-Schema conversion deta hai.
- Production mein: descriptions specific rakho, errors gracefully handle karo, destructive actions ke liye confirmation lo, aur registry pattern use karo scale ke liye.
- Ye foundation hai — Chapter 8 mein hum inhi tools ko ek full **ReAct-style agent** mein wire karenge, aur Chapter 19 mein LangGraph ke `ToolNode` se automate karenge.
