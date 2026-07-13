# Prompt Templates and Prompt Engineering

🟢 Beginner

Socho ek second ke liye — tum Swiggy pe order kar rahe ho aur delivery boy se kehte ho "bhaiya jaldi laa dena, bahut bhookh lagi hai." Har baar tum yeh message thoda alag tarike se likhte ho — kabhi Hindi mein, kabhi English mein, kabhi typo ke saath. Ab socho Swiggy ka support bot agar har customer ka message samajhne ke liye ek fixed, predictable format expect kare — tabhi wo sahi response de payega. Yehi cheez LLM ke saath bhi hoti hai: agar tum har baar random tarike se prompt likhoge, to kabhi kabhi model achha jawab dega, kabhi bakwas. **Prompt Templates** iss randomness ko khatam karke ek reliable, reusable "recipe" bana dete hain jisse tumhara AI application production mein predictably chale.

Is chapter mein hum dekhenge ki LangChain mein prompts ko structured, reusable, aur validate-able kaise banate hain — jo ki kisi bhi serious Agentic AI application ki foundation hai.

---

## Kyun Zaruri Hai Prompt Templates?

Agar tum pehle se JavaScript ya Node.js se aaye ho, to tumne kabhi na kabhi yeh style dekha hoga:

```javascript
const prompt = `You are a ${role}. Answer the following question: ${question}`;
```

Yeh template literal chhote scripts ke liye theek hai, lekin jab tumhara app scale hota hai to yeh approach todne lagti hai:

- **Validation nahi hai** — agar caller `question` bhejna hi bhool gaya, to error runtime pe crash hoke aayega, warna prompt mein `undefined` chala jayega aur model confuse ho jayega.
- **Reusability missing** — same prompt structure ko 5 alag jagah use karna ho to copy-paste karna padega.
- **Role-based messages handle nahi hote** — chat models (jaise GPT-4, Claude) ko system/user/assistant roles chahiye hoti hain, plain string se yeh manage karna painful hai.
- **Composability nahi hai** — chhote prompt-pieces ko jodkar bada prompt banana mushkil hai.
- **Serialization impossible** — prompt ko file mein save karke baad mein load nahi kar sakte.

LangChain ke **Prompt Templates** yeh saari problems solve karte hain. Socho isse ek "order form" ki tarah — jaise Zomato pe restaurant ka menu ek fixed format follow karta hai (item name, price, customization options), waise hi prompt template ek fixed "shape" define karta hai jisme tum sirf variables bhar dete ho, aur baaki structure guaranteed rehta hai.

> [!info]
> Agentic AI systems mein prompts hi wo "instructions manual" hote hain jo LLM ko batate hain ki agent ka role kya hai, tools kaise use karne hain, aur output kis format mein chahiye. Isliye prompt engineering ek core skill hai — chahe tum simple chatbot bana rahe ho ya complex multi-agent system.

---

## PromptTemplate: Basic String Templates

`PromptTemplate` sabse simple template hai. Yeh ek single string produce karta hai — jaise ek plain text message banate ho.

```python
from langchain_core.prompts import PromptTemplate

# Method 1: Explicit input_variables batao
template = PromptTemplate(
    input_variables=["language", "topic"],
    template="Explain {topic} in {language} programming.",
)

# Method 2: Auto-detect variables (yeh zyada convenient hai, preferred)
template = PromptTemplate.from_template(
    "Explain {topic} in {language} programming."
)

# Ab isko format karo
prompt_value = template.invoke({"language": "Python", "topic": "generators"})
print(prompt_value.to_string())
# "Explain generators in Python programming."
```

> [!warning]
> JS template literals mein variable syntax hota hai `${name}`, lekin LangChain mein **single curly braces** `{name}` use hote hain. Agar tumhe prompt mein literal curly brace chahiye (jaise JSON example dikhana ho), to double braces use karo: `{{` aur `}}`. Yeh ek common gotcha hai — naye developers isme phas jaate hain.

### Model ke saath use karna

```python
from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)
template = PromptTemplate.from_template(
    "Explain {topic} in one sentence for a {audience}."
)

# Directly invoke karo
prompt = template.invoke({"topic": "async/await", "audience": "Node.js developer"})
response = model.invoke(prompt)
print(response.content)
```

`PromptTemplate` ka use tab hota hai jab tumhe ek plain completion-style model (non-chat) ke saath kaam karna ho, ya sirf ek simple string chahiye ho. Real production apps mein — jaise agent banate waqt — tum zyada tar `ChatPromptTemplate` hi use karoge, kyunki aaj-kal ke saare useful models (GPT-4, Claude, Gemini) **chat models** hain.

---

## ChatPromptTemplate: Chat Models Ke Liye

Yeh wo template hai jo tum **90% samay** use karoge. Yeh ek single string nahi, balki messages ki ek **list** produce karta hai — har message ka apna role hota hai (system, human, ai).

Socho jaise IRCTC ka customer support chat: system message batata hai bot ka role ("Tum IRCTC ke ticket booking assistant ho"), phir user apna sawaal poochta hai, aur agent jawab deta hai. Yeh teeno cheezein alag-alag "roles" hain — aur `ChatPromptTemplate` inhe cleanly organize karta hai.

### Tuples se basic creation

```python
from langchain_core.prompts import ChatPromptTemplate

# Har tuple hota hai (role, template_string)
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a {role} who explains things concisely."),
    ("human", "{question}"),
])

# Variables ke saath invoke karo
messages = prompt.invoke({
    "role": "senior Python developer",
    "question": "What are list comprehensions?",
})

print(messages.to_messages())
# [
#   SystemMessage(content="You are a senior Python developer who explains things concisely."),
#   HumanMessage(content="What are list comprehensions?"),
# ]
```

### Role shortcuts

```python
from langchain_core.prompts import ChatPromptTemplate

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant."),     # SystemMessage banega
    ("human", "My question: {question}"),           # HumanMessage banega
    ("ai", "I understand, let me think..."),        # AIMessage (few-shot examples ke liye kaam aata hai)
    ("human", "Actually, {followup}"),              # Ek aur HumanMessage
])
```

### Message classes directly use karna

Kabhi kabhi tumhe koi message fix rakhna hota hai — usme koi variable nahi hota. Us case mein message class directly bhi use kar sakte ho:

```python
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import SystemMessage, HumanMessage

prompt = ChatPromptTemplate.from_messages([
    SystemMessage(content="You are a Python expert."),  # Fixed message (koi variable nahi)
    ("human", "{question}"),                             # Template message
])
```

---

## `ChatPromptTemplate.from_messages()` Ke Real Patterns

Yeh pattern tumhe har LangChain codebase mein baar-baar dikhega, isliye isko achhe se samajh lo.

### Code review assistant

```python
from langchain_core.prompts import ChatPromptTemplate

code_review_prompt = ChatPromptTemplate.from_messages([
    ("system", (
        "You are a code reviewer specializing in {language}. "
        "Focus on: correctness, readability, performance. "
        "Be constructive and suggest improvements."
    )),
    ("human", (
        "Please review this code:\n\n"
        "```{language}\n{code}\n```\n\n"
        "Context: {context}"
    )),
])

# Usage
messages = code_review_prompt.invoke({
    "language": "python",
    "code": "def add(a, b): return a + b",
    "context": "This is a utility function for a calculator app.",
})
```

### Translation assistant

```python
from langchain_core.prompts import ChatPromptTemplate

translation_prompt = ChatPromptTemplate.from_messages([
    ("system", (
        "You are a translator. Translate the following text from "
        "{source_lang} to {target_lang}. Maintain the original tone and style."
    )),
    ("human", "{text}"),
])
```

Notice karo — dono prompts mein system message ka role hai model ko **persona aur rules** dena, aur human message ka role hai **actual data** dena. Yeh separation important hai kyunki chat models system message ko thoda zyada "authority" dete hain — jaise Zomato ke restaurant partner ko unke SOP (system message) follow karni hoti hai, chahe customer (human message) kuch bhi ajeeb request kare.

---

## MessagesPlaceholder: Dynamic Message Lists

Ab tak humne fixed number ke messages dekhe. Lekin real chatbot mein conversation history hoti hai jiski length pehle se pata nahi hoti — kabhi 2 messages, kabhi 50. Iske liye `MessagesPlaceholder` use hota hai — yeh ek variable-length list of messages ko template ke beech mein "inject" karta hai.

```python
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful Python tutor."),
    MessagesPlaceholder(variable_name="history"),  # <-- yahan dynamic list aayegi
    ("human", "{question}"),
])

# Conversation history ke saath invoke karo
messages = prompt.invoke({
    "history": [
        HumanMessage(content="What is a decorator?"),
        AIMessage(content="A decorator is a function that wraps another function..."),
        HumanMessage(content="Can you show an example?"),
        AIMessage(content="Sure! Here is a simple timing decorator..."),
    ],
    "question": "How do I stack multiple decorators?",
})

for msg in messages.to_messages():
    print(f"{msg.__class__.__name__}: {msg.content[:60]}...")
```

Yeh exact wahi mechanism hai jo agent memory (aage ke chapter "06-memory" mein detail se cover hoga) ke peeche use hota hai — purani conversation ko messages ki list ke roop mein store karke, har naye turn pe template mein plug kar dete hain.

### Optional history (default ke saath)

Kabhi kabhi pehla message hi ho sakta hai — abhi tak koi history hi nahi hai. Uss case mein `optional=True` set karo, warna LangChain error dega ki `history` variable missing hai:

```python
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant."),
    MessagesPlaceholder(variable_name="history", optional=True),  # Missing ho to error nahi dega
    ("human", "{question}"),
])

# History ke bina bhi kaam karega
messages = prompt.invoke({"question": "Hello!"})
```

> [!tip]
> Production chatbots mein hamesha `optional=True` use karo jab history first-time users ke liye empty ho sakti hai. Isse tumhe alag "first message" wala code path nahi likhna padta.

---

## Few-Shot Prompting

**Kya hota hai?** Few-shot prompting matlab model ko examples dikhana — "yeh input aaya to yeh output dena chahiye" — taaki model tumhare expected format/style ko samajh sake, bina explicitly rules likhe.

**Kyun zaruri hai?** Socho tum ek naye Swiggy delivery partner ko train kar rahe ho. Tum usse sirf rules bol sakte ho ("bag seal karo, phone pe update karo"), ya usse 2-3 example deliveries dikha sakte ho — dusra approach zyada fast aur effective hota hai kyunki pattern directly dikh jaata hai. LLMs ke saath bhi yehi hota hai — examples dikhana rules likhne se zyada reliable hota hai, especially structured output (JSON, specific format) ke liye.

### Simple few-shot with ChatPromptTemplate

Sabse basic approach — examples ko directly messages ki list mein hardcode kar do:

```python
from langchain_core.prompts import ChatPromptTemplate

prompt = ChatPromptTemplate.from_messages([
    ("system", "You extract structured data from text. Return JSON."),
    # Example 1
    ("human", "John is 30 years old and works at Google."),
    ("ai", '{{"name": "John", "age": 30, "company": "Google"}}'),
    # Example 2
    ("human", "Sarah, 25, is a developer at Meta."),
    ("ai", '{{"name": "Sarah", "age": 25, "company": "Meta"}}'),
    # Actual input
    ("human", "{input_text}"),
])

messages = prompt.invoke({
    "input_text": "Mike is 35 and leads engineering at Stripe."
})
```

> [!warning]
> Yahan `{{` aur `}}` **escaped braces** hain — yeh output mein literal `{` aur `}` produce karte hain (kyunki JSON mein curly braces chahiye hote hain, lekin LangChain normally `{}` ko variable placeholder samajhta hai). Agar tum bhool gaye escape karna, to LangChain error dega "missing variable name" — kyunki wo `{"name"` ko ek variable declaration samjhega.

### FewShotChatMessagePromptTemplate — Jab Examples Zyada Ho

Jab tumhare paas bahut saare examples hon (10, 20, 50+), to sabko hardcode karna messy ho jaata hai. `FewShotChatMessagePromptTemplate` ek clean structured way deta hai examples define karne ka:

```python
from langchain_core.prompts import (
    ChatPromptTemplate,
    FewShotChatMessagePromptTemplate,
)

# Har example ka format define karo
example_prompt = ChatPromptTemplate.from_messages([
    ("human", "{input}"),
    ("ai", "{output}"),
])

# Examples define karo
examples = [
    {
        "input": "What is 2+2?",
        "output": "The answer is 4. [CALCULATION]",
    },
    {
        "input": "Who wrote Hamlet?",
        "output": "William Shakespeare wrote Hamlet. [FACT]",
    },
    {
        "input": "What will the weather be tomorrow?",
        "output": "I cannot predict the weather as I don't have real-time data. [LIMITATION]",
    },
]

# Few-shot template banao
few_shot_prompt = FewShotChatMessagePromptTemplate(
    example_prompt=example_prompt,
    examples=examples,
)

# Isko poore prompt ke andar use karo
full_prompt = ChatPromptTemplate.from_messages([
    ("system", "Answer questions and tag your response type in brackets."),
    few_shot_prompt,
    ("human", "{question}"),
])

messages = full_prompt.invoke({"question": "What is the capital of France?"})
for msg in messages.to_messages():
    print(f"[{msg.__class__.__name__}] {msg.content}")
```

### Dynamic Example Selection — Semantic Similarity

Sabse advanced case: agar tumhare paas 500 examples hain, to sabko har baar model ko bhejna wasteful hai (token cost + latency badh jayegi). Isliye sirf **sabse relevant** examples chuno — jaise Amazon ka recommendation engine tumhare purane orders dekhkar sabse relevant products dikhata hai, waise hi yahan embedding similarity use karke sabse relevant examples select karte hain.

```python
from langchain_core.example_selectors import SemanticSimilarityExampleSelector
from langchain_openai import OpenAIEmbeddings
from langchain_chroma import Chroma

# Similarity ke basis pe sabse relevant examples select karo
example_selector = SemanticSimilarityExampleSelector.from_examples(
    examples=examples,
    embeddings=OpenAIEmbeddings(),
    vectorstore_cls=Chroma,
    k=2,  # Top 2 sabse relevant examples select karo
)

few_shot_prompt = FewShotChatMessagePromptTemplate(
    example_prompt=example_prompt,
    example_selector=example_selector,  # Static list ki jagah selector use karo
)
```

> [!info]
> Yeh technique **RAG (Retrieval-Augmented Generation)** ka ek chhota version hai — jo chapter 09 mein detail se cover hoga. Idea same hai: pehle relevant context dhundo, phir usko prompt mein daalo.

**Production consideration:** Har `invoke()` call pe example selector embeddings compute karega ya vector DB query karega — yeh extra latency add karta hai. Agar tumhare examples fixed hain aur kam hain (5-10), static few-shot list zyada fast aur simple hai. Dynamic selection tabhi use karo jab examples ki variety bahut zyada ho.

---

## Partial Prompts

**Kya hota hai?** Partial prompts tumhe kuch variables abhi fill karne dete hain aur baaki baad mein — bilkul jaise UPI app mein tum apna default payment method pehle se set kar dete ho, aur sirf amount har baar type karte ho.

**Kyun zaruri hai?** Jab tum reusable prompt "components" banate ho — jaise ek base template jisse alag-alag specialized versions banane hain — to partial variables tumhe duplication se bachate hain.

```python
from langchain_core.prompts import ChatPromptTemplate

# Full template
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a {role}. Respond in {language}."),
    ("human", "{question}"),
])

# Partial: role abhi fix karo, question baad mein aayega
python_tutor_prompt = prompt.partial(role="Python tutor", language="English")

# Ab sirf question dena hoga
messages = python_tutor_prompt.invoke({"question": "What are generators?"})
```

### Partial with functions (lazy evaluation)

Kabhi tumhe koi value chahiye hoti hai jo **invoke ke time** compute honi chahiye, definition ke time nahi — jaise current date/time. Iske liye function pass karo:

```python
from datetime import datetime
from langchain_core.prompts import ChatPromptTemplate

prompt = ChatPromptTemplate.from_messages([
    ("system", "Today is {date}. You are a helpful assistant."),
    ("human", "{question}"),
])

# Date function invoke time pe call hoga, definition time pe nahi
prompt = prompt.partial(date=lambda: datetime.now().strftime("%Y-%m-%d"))

# Jab bhi invoke karoge, date hamesha current hoga
messages = prompt.invoke({"question": "What day is it?"})
```

> [!tip]
> Yeh pattern production agents mein bahut kaam aata hai — jaise `user_id`, `current_date`, `session_context` jaise values jo request-time pe pata chalti hain, unhe partial functions ke through inject karo, taaki tumhara core prompt template clean aur reusable rahe.

---

## Prompt Composition

Complex prompts ko chhote, reusable pieces se banao — factory functions ke through:

```python
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

# Base template — ek factory function
def create_assistant_prompt(
    system_instruction: str,
    include_history: bool = False,
) -> ChatPromptTemplate:
    """Assistant prompts banane ke liye factory function."""
    messages = [("system", system_instruction)]

    if include_history:
        messages.append(MessagesPlaceholder(variable_name="history", optional=True))

    messages.append(("human", "{input}"))

    return ChatPromptTemplate.from_messages(messages)

# Specialized prompts banao
code_prompt = create_assistant_prompt(
    "You are a Python code assistant. Write clean, well-documented code.",
    include_history=True,
)

review_prompt = create_assistant_prompt(
    "You are a code reviewer. Be constructive and thorough.",
    include_history=False,
)
```

Yeh pattern bilkul waisa hi hai jaise React mein tum reusable component banate ho jisme props se behavior control hota hai — yahan `system_instruction` aur `include_history` "props" ki tarah kaam kar rahe hain.

---

## Prompt Templates vs. JavaScript Template Literals

| Feature | JS Template Literals | LangChain PromptTemplate |
|---|---|---|
| Variable substitution | `${variable}` | `{variable}` |
| Validation | Nahi (runtime errors) | Missing variable pe error raise karta hai |
| Role support | Manual | `ChatPromptTemplate` mein built-in |
| Serialization | Possible nahi | YAML/JSON se save/load ho sakta hai |
| Composition | String concatenation | `.partial()`, nesting, factories |
| Dynamic examples | Manual | `FewShotChatMessagePromptTemplate` |
| Type safety | TypeScript types | Pydantic validation |

---

## Real-World Pattern: Prompt Library

Production apps mein prompts ko ek central jagah rakhna best practice hai — jaise tum apni CSS variables ek `theme.css` file mein rakhte ho, waise hi prompts ko ek `prompts.py` module mein centralize karo.

```python
"""prompts.py -- Centralized prompt definitions."""
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

# Poore application mein reusable
SUMMARIZER = ChatPromptTemplate.from_messages([
    ("system", (
        "Summarize the following text in {num_sentences} sentences. "
        "Target audience: {audience}."
    )),
    ("human", "{text}"),
])

CLASSIFIER = ChatPromptTemplate.from_messages([
    ("system", (
        "Classify the following text into one of these categories: {categories}. "
        "Return only the category name, nothing else."
    )),
    ("human", "{text}"),
])

CHATBOT = ChatPromptTemplate.from_messages([
    ("system", (
        "You are {bot_name}, a {bot_personality} assistant. "
        "You help users with {bot_domain}."
    )),
    MessagesPlaceholder(variable_name="history", optional=True),
    ("human", "{input}"),
])

QA_WITH_CONTEXT = ChatPromptTemplate.from_messages([
    ("system", (
        "Answer the question based only on the provided context. "
        "If the context does not contain the answer, say 'I don't know'. "
        "Do not make up information."
    )),
    ("human", (
        "Context:\n{context}\n\n"
        "Question: {question}"
    )),
])
```

```python
# Prompt library ko use karna
from prompts import SUMMARIZER, CHATBOT
from langchain_openai import ChatOpenAI

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)

# Kuch summarize karo
chain = SUMMARIZER | model
response = chain.invoke({
    "num_sentences": 3,
    "audience": "software developers",
    "text": "LangChain is a framework for developing applications...",
})
print(response.content)
```

`SUMMARIZER | model` — yeh `|` pipe operator LangChain Expression Language (LCEL) ka hai, jo chapter 05 mein detail se cover hoga. Abhi bas itna samjho: prompt template ka output directly model ko pipe kar diya.

---

## Prompt Engineering: Practical Tips for Reliable Prompts

Ab tak humne "syntax" dekha — ab kuch **practical wisdom** jo production mein farak dalti hai.

### 1. System message ko specific rakho, vague nahi

```python
# Bura — bahut generic
("system", "You are a helpful assistant.")

# Achha — specific role, constraints, aur format clear hai
("system", (
    "You are a customer support agent for an Indian e-commerce app. "
    "Always respond in a polite, professional tone. "
    "If you don't know the answer, say so — never make up order details. "
    "Keep responses under 3 sentences unless asked for more detail."
))
```

### 2. Output format explicitly bolo

Agar tumhe structured output chahiye (JSON, bullet list, specific schema), to model ko explicitly batao — assume mat karo ki wo samajh jayega.

> [!tip]
> Agar tumhe reliably-parseable JSON chahiye, isse manually prompt mein describe karne ke bajaye LangChain ke **output parsers** ya `.with_structured_output()` use karo — yeh chapter 04 mein cover hoga. Prompt engineering + structured output parsing dono saath use karna production-grade approach hai.

### 3. Few-shot examples diverse rakho

Agar tumhare 3 examples sab similar hain (jaise sab positive sentiment), model edge cases (negative, neutral, mixed sentiment) pe fail ho sakta hai. Jaise Swiggy apne delivery partners ko sirf "sunny day" delivery train nahi karta — rain, traffic, high-rise building jaise edge cases bhi sikhata hai.

### 4. Variable names meaningful rakho

```python
# Bura — kya hai yeh `x` aur `y`?
PromptTemplate.from_template("Do {x} with {y}")

# Achha — self-documenting
PromptTemplate.from_template("Translate {text} from {source_lang} to {target_lang}")
```

### 5. Missing variables ka error samajhna

Agar tum `invoke()` mein zaruri variable dena bhool gaye, LangChain `KeyError` ya validation error dega. Yeh **feature hai, bug nahi** — JS template literals mein `undefined` silently prompt mein chala jaata, jisse model ko confusing input milta. LangChain fail-fast approach follow karta hai.

```python
prompt = ChatPromptTemplate.from_messages([("human", "{question}")])

try:
    prompt.invoke({})  # 'question' missing hai
except KeyError as e:
    print(f"Missing variable: {e}")
```

### 6. Prompt length aur cost ka dhyan rakho

Har extra token — chahe wo system message ho ya few-shot examples — **cost aur latency** badhata hai. Agar tumhare few-shot examples bahut lambe hain aur tum unhe har request ke saath bhej rahe ho, to:
- Chhote, crisp examples use karo (verbose examples avoid karo)
- Dynamic example selection use karo taaki sirf relevant examples bhejo (upar dekha)
- Agar model already achha perform kar raha hai zero-shot (bina examples ke), to few-shot mat use karo — unnecessary cost hai

### 7. Prompt versioning production mein zaruri hai

Jab tum prompts ko production mein change karte ho, tumhare application ka behavior badal sakta hai — bilkul jaise API ka breaking change. Isliye:
- Prompts ko code review process mein treat karo (git mein track karo, jaise humne `prompts.py` mein kiya)
- A/B testing karo naye prompt versions ke liye rollout karne se pehle
- LangSmith jaisa tracing tool use karo (chapter 10 mein cover hoga) taaki dekh sako prompt change se output quality pe kya effect pada

> [!warning]
> Ek common production mistake: prompt ko hardcode kar dena deep inside business logic. Isse prompt ko test/update karna painful ho jaata hai. Hamesha prompts ko centralize karo (jaise upar `prompts.py` pattern) taaki unhe independently iterate kar sako.

---

## Key Takeaways

- **`PromptTemplate`** ek single string produce karta hai — simple completion-style use cases ke liye. `{variable}` syntax use hota hai (JS ke `${variable}` se alag), aur literal braces ke liye `{{` `}}` escape karna padta hai.
- **`ChatPromptTemplate`** chat models ke liye 90% use case cover karta hai — messages ki list (system/human/ai roles ke saath) produce karta hai.
- **`MessagesPlaceholder`** variable-length message lists (jaise conversation history) ko template mein inject karta hai; `optional=True` first-message scenarios ke liye zaruri hai.
- **Few-shot prompting** — examples dikhana rules likhne se zyada reliable hota hai. Chhote fixed sets ke liye hardcoded messages theek hain; bade sets ke liye `FewShotChatMessagePromptTemplate` aur `SemanticSimilarityExampleSelector` use karo.
- **Partial prompts** (`.partial()`) tumhe kuch variables abhi fix karne dete hain aur baaki invoke-time pe — static values ke liye ya lazy-evaluated functions (jaise current date) ke liye dono kaam aata hai.
- **Prompt composition** — factory functions se reusable, parameterized prompt templates banao, taaki duplication avoid ho.
- Production mein prompts ko **centralize karo** (ek `prompts.py` module), **version control** mein rakho, aur output format ko **explicitly specify** karo — yeh reliability, testability, aur maintainability ke liye critical hai.
- LangChain ki validation (missing variable pe error) ek **feature** hai jo silent bugs se bachati hai — JS template literals ke `undefined` wale silent-failure se compare karo.
