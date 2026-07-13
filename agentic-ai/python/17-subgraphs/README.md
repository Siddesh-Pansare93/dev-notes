# Subgraphs

🟡 **Intermediate**

## Kya hota hai?

Socho tum Zomato ka backend bana rahe ho. Ek monolith mein sab kuch — order placement, payment, delivery tracking, restaurant onboarding — ek hi jagah likh doge toh 6 mahine baad woh file itni badi ho jayegi ki koi bhi engineer usse chhedne se darega. Isliye real systems mein hum modules banate hain: `payments-service`, `delivery-service`, `orders-service` — har ek apne aap mein complete, testable, aur reusable.

LangGraph mein bhi yehi problem aati hai jab tumhara agent workflow grow karta hai. Ek single `StateGraph` mein 20-30 nodes daal doge toh woh samajhna, debug karna, aur test karna nightmare ban jata hai. **Subgraphs** iska solution hain — ek **compiled graph ko dusre graph ke andar ek node ki tarah use karna**.

Yeh bilkul waisa hi hai jaise Node.js mein Express routers compose karte ho:

```js
// Node.js router composition — tumhe yeh pattern familiar lagega
const authRouter = express.Router();   // Apne aap mein complete, self-contained
const apiRouter = express.Router();
apiRouter.use("/auth", authRouter);    // Parent mein compose kiya
app.use("/api", apiRouter);
```

LangGraph mein:

```
Parent Graph:
  START -> intake -> [subgraph: research_agent] -> [subgraph: writing_agent] -> review -> END
```

`research_agent` aur `writing_agent` khud apne aap mein poore graphs hain — apne nodes, apne edges, apna state schema — lekin parent graph unhe ek single node jaisa treat karta hai.

## Kyun zaruri hai?

1. **Modularity** — Har sub-agent ko alag se likho, alag se test karo. "Research karne wala part sahi kaam kar raha hai ya nahi" — yeh check karne ke liye tumhe pura pipeline run nahi karna padega.
2. **Reusability** — Ek `validator` subgraph banao aur usse 5 alag pipelines mein use karo. Bilkul jaise ek npm package ko multiple projects mein import karte ho.
3. **Team scaling** — Agar tum team mein kaam kar rahe ho, ek engineer research subgraph pe kaam karega, dusra writing subgraph pe — bina ek dusre ka code todhe.
4. **Hierarchical architectures** — Complex agents banate waqt (jaise ek "manager" agent jo 3-4 "specialist" agents ko delegate karta hai) subgraphs hi natural building block hain. Chapter 18 (Multi-Agent Systems) mein isi pattern ko aur aage le jayenge.
5. **Debuggability** — Chhota graph = chhota blast radius. Kuch galat ho raha hai? Sirf uss subgraph ko isolate karke debug karo.

> [!tip]
> Rule of thumb: agar tumhara ek node internally 3+ steps ka kaam kar raha hai (jaise "research karo" jisme web search + paper search + synthesis shaamil hai), woh candidate hai ek subgraph banne ke liye.

---

## Subgraph Banana — Step by Step

Ek subgraph bas ek normal compiled graph hai jise tum parent graph mein node ki tarah add karte ho. Koi special syntax nahi chahiye.

### Step 1: Subgraph define karo

Chalo ek "research" subgraph banate hain jo web se aur papers se information gather karke summarize karta hai — bilkul jaise Swiggy ka "search restaurants" flow multiple sources (nearby, cuisine-match, ratings) se data fetch karke ek combined result deta hai.

```python
from typing import TypedDict, Annotated
import operator
from langgraph.graph import StateGraph, START, END


class ResearchState(TypedDict):
    query: str
    sources: Annotated[list[str], operator.add]  # reducer: naye sources purano mein add honge
    summary: str


def search_web(state: ResearchState) -> dict:
    # Simulated web search
    return {"sources": [f"Source about '{state['query']}' from web"]}


def search_papers(state: ResearchState) -> dict:
    # Simulated academic search
    return {"sources": [f"Paper about '{state['query']}' from arxiv"]}


def synthesize(state: ResearchState) -> dict:
    sources_text = "\n".join(state["sources"])
    return {"summary": f"Research summary based on {len(state['sources'])} sources:\n{sources_text}"}


# Research subgraph banao
research_graph = StateGraph(ResearchState)
research_graph.add_node("search_web", search_web)
research_graph.add_node("search_papers", search_papers)
research_graph.add_node("synthesize", synthesize)

research_graph.add_edge(START, "search_web")
research_graph.add_edge("search_web", "search_papers")
research_graph.add_edge("search_papers", "synthesize")
research_graph.add_edge("synthesize", END)

# Compile karo — ab yeh ek standalone, reusable graph hai
research_app = research_graph.compile()

# Standalone bhi chala sakte ho — jaise ek microservice ko directly test karna
result = research_app.invoke({"query": "LangGraph best practices", "sources": [], "summary": ""})
print(result["summary"])
```

Notice karo — `research_app` ek poora functioning graph hai. Isse standalone bhi invoke kar sakte ho, ya kisi parent graph mein bhi daal sakte ho. **Yehi reusability ka fayda hai.**

### Step 2: Parent graph mein node ki tarah use karo

```python
class ParentState(TypedDict):
    topic: str
    research: str
    article: str


def prepare_research(state: ParentState) -> dict:
    """Parent state ko subgraph ke input state mein transform karta hai."""
    return {"query": state["topic"], "sources": [], "summary": ""}


def write_article(state: ParentState) -> dict:
    return {"article": f"Article based on research:\n{state['research']}"}


# Option 1: Compiled subgraph ko seedha node ki tarah use karo
parent_graph = StateGraph(ParentState)
parent_graph.add_node("research", research_app)  # Compiled graph = node!
parent_graph.add_node("write", write_article)

parent_graph.add_edge(START, "research")
parent_graph.add_edge("research", "write")
parent_graph.add_edge("write", END)
```

> [!warning]
> Yahan ek trap hai. `research_app` ko directly node banane ke liye, **parent state aur subgraph state mein overlapping keys same naam aur same type ki honi chahiye** — tabhi LangGraph automatically map kar payega. Upar wale example mein `ParentState` mein `query`, `sources`, `summary` keys nahi hain, isliye yeh code actually fail hoga jab tak tum keys match nahi karte. Isko sahi karne ke do tareeke aage discuss kar rahe hain.

---

## Nested State Management — Asli Challenge

Subgraphs ka sabse bada challenge hai **state compatibility**. Parent graph aur subgraph ka state schema alag ho sakta hai — aur zyada tar real-world cases mein alag hi hota hai.

Socho IRCTC ka booking flow: parent flow mein `passenger_details`, `train_number`, `seat_class` hai, lekin ek "payment" subgraph ko sirf `amount` aur `upi_id` chahiye. Dono states poori tarah match nahi karenge — tumhe explicitly map karna padega.

### Approach 1: Shared Keys

Sabse simple approach: dono states mein wahi keys rakho jinhe communicate karna hai.

```python
class ParentState(TypedDict):
    query: str           # Subgraph ke saath shared
    sources: list[str]   # Subgraph ke saath shared
    summary: str         # Subgraph ke saath shared
    final_output: str    # Sirf parent ke paas


class SubgraphState(TypedDict):
    query: str           # Parent ke saath shared
    sources: list[str]   # Parent ke saath shared
    summary: str         # Parent ke saath shared
    internal_score: float  # Sirf subgraph ke paas
```

Jab subgraph node ki tarah run hota hai, LangGraph automatically:
1. Matching keys parent state se subgraph mein pass karta hai
2. Matching keys subgraph output se wapas parent state mein return karta hai
3. Jo keys sirf ek schema mein hain unhe ignore karta hai

Yeh approach kaam karta hai jab states naturally overlap karte hain, lekin production mein aksar states bilkul different hote hain (jaise upar ka `topic` vs `query` example) — tab tumhe **Approach 2** chahiye.

### Approach 2: Wrapper Function (Recommended)

Maximum control ke liye, subgraph ko ek wrapper function mein wrap karo jo state transformation explicitly handle kare. Yeh production mein sabse zyada use hone wala pattern hai — kyunki yeh **explicit hai aur debug karna easy hai**.

```python
class ParentState(TypedDict):
    topic: str
    research_summary: str
    article: str


class ResearchState(TypedDict):
    query: str
    sources: Annotated[list[str], operator.add]
    summary: str


research_app = build_research_graph()  # Compiled subgraph return karta hai


def research_node(state: ParentState) -> dict:
    """Wrapper: parent state -> subgraph state -> parent state transform karta hai."""
    # Parent state ko subgraph input mein map karo
    subgraph_input = {
        "query": state["topic"],
        "sources": [],
        "summary": "",
    }

    # Subgraph run karo
    result = research_app.invoke(subgraph_input)

    # Subgraph output ko wapas parent state mein map karo
    return {"research_summary": result["summary"]}


parent_graph = StateGraph(ParentState)
parent_graph.add_node("research", research_node)  # Wrapper function, raw subgraph nahi
```

> [!tip]
> Jab bhi confusion ho ki "shared keys use karu ya wrapper", **wrapper function chuno**. Haan, thoda zyada code likhna padta hai, lekin production mein jab teams grow karti hain aur states evolve hote hain, explicit mapping tumhe bahut saara debugging time bachati hai. Shared-keys approach sirf choti, tightly-coupled cheezon ke liye theek hai.

### State Isolation — kyun zaruri hai?

Notice karo `internal_score` sirf `SubgraphState` mein hai — parent ko iske baare mein pata bhi nahi chalta, aur na hi chalna chahiye. Yeh **encapsulation** hai. Bilkul jaise Swiggy ke payment service ke andar `internal_retry_count` jaisa field ho sakta hai jo order service ko kabhi dikhna hi nahi chahiye.

Isse do fayde milte hain:
- **Namespace clash avoid hota hai** — parent aur 3 alag subgraphs mein sabke apne internal fields ho sakte hain bina conflict ke.
- **Subgraph independently evolve ho sakta hai** — agar research subgraph mein ek naya internal field add karna hai, parent graph ko touch bhi nahi karna padega.

---

## Reusable Graph Components — Library Banao

Ab hum ek step aage badhte hain: chalo aise components banate hain jo multiple pipelines mein reuse ho sakein — bilkul jaise tum ek `utils/` folder mein common functions rakhte ho.

```python
# components/validators.py
from langgraph.graph import StateGraph, START, END
from typing import TypedDict


class ValidationState(TypedDict):
    text: str
    is_valid: bool
    errors: list[str]


def check_length(state: ValidationState) -> dict:
    errors = []
    if len(state["text"]) < 10:
        errors.append("Text too short (min 10 characters)")
    if len(state["text"]) > 10000:
        errors.append("Text too long (max 10000 characters)")
    return {"errors": errors}


def check_content(state: ValidationState) -> dict:
    errors = list(state.get("errors", []))
    banned_words = ["spam", "scam", "hack"]
    for word in banned_words:
        if word in state["text"].lower():
            errors.append(f"Contains banned word: {word}")
    return {"errors": errors}


def finalize_validation(state: ValidationState) -> dict:
    return {"is_valid": len(state.get("errors", [])) == 0}


def build_validator_graph():
    """Factory function jo ek compiled validation graph return karta hai."""
    graph = StateGraph(ValidationState)
    graph.add_node("check_length", check_length)
    graph.add_node("check_content", check_content)
    graph.add_node("finalize", finalize_validation)

    graph.add_edge(START, "check_length")
    graph.add_edge("check_length", "check_content")
    graph.add_edge("check_content", "finalize")
    graph.add_edge("finalize", END)

    return graph.compile()


# components/summarizer.py
def build_summarizer_graph(llm):
    """Factory function summarization subgraph ke liye — llm parameterized hai."""
    class SummaryState(TypedDict):
        text: str
        summary: str
        key_points: list[str]

    def extract_key_points(state: SummaryState) -> dict:
        response = llm.invoke(f"List 3-5 key points from:\n{state['text']}")
        points = response.content.split("\n")
        return {"key_points": points}

    def write_summary(state: SummaryState) -> dict:
        points_text = "\n".join(state["key_points"])
        response = llm.invoke(f"Write a concise summary from these points:\n{points_text}")
        return {"summary": response.content}

    graph = StateGraph(SummaryState)
    graph.add_node("extract", extract_key_points)
    graph.add_node("summarize", write_summary)
    graph.add_edge(START, "extract")
    graph.add_edge("extract", "summarize")
    graph.add_edge("summarize", END)

    return graph.compile()
```

Notice karo `build_summarizer_graph(llm)` — yeh **factory function** hai jo `llm` parameter leta hai. Isse tum same subgraph ko `gpt-4o-mini` ke saath bhi bana sakte ho aur `gpt-4o` ke saath bhi, bina code duplicate kiye. Yeh dependency-injection jaisa pattern hai jo tumne shayad Spring Boot mein `@Autowired` ke through dekha hoga.

### Components ko Use Karna

Ab in dono reusable subgraphs ko ek "content pipeline" mein compose karte hain:

```python
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="gpt-4o-mini")

validator = build_validator_graph()
summarizer = build_summarizer_graph(llm)


class ContentPipelineState(TypedDict):
    input_text: str
    is_valid: bool
    validation_errors: list[str]
    summary: str
    final_output: str


def validate_step(state: ContentPipelineState) -> dict:
    result = validator.invoke({
        "text": state["input_text"],
        "is_valid": False,
        "errors": [],
    })
    return {
        "is_valid": result["is_valid"],
        "validation_errors": result["errors"],
    }


def summarize_step(state: ContentPipelineState) -> dict:
    result = summarizer.invoke({
        "text": state["input_text"],
        "summary": "",
        "key_points": [],
    })
    return {"summary": result["summary"]}


def route_after_validation(state: ContentPipelineState) -> str:
    return "summarize" if state["is_valid"] else "reject"


def reject_step(state: ContentPipelineState) -> dict:
    errors = ", ".join(state["validation_errors"])
    return {"final_output": f"Rejected. Errors: {errors}"}


def format_output(state: ContentPipelineState) -> dict:
    return {"final_output": f"Summary: {state['summary']}"}


pipeline = StateGraph(ContentPipelineState)
pipeline.add_node("validate", validate_step)
pipeline.add_node("summarize", summarize_step)
pipeline.add_node("reject", reject_step)
pipeline.add_node("format", format_output)

pipeline.add_edge(START, "validate")
pipeline.add_conditional_edges("validate", route_after_validation, {
    "summarize": "summarize",
    "reject": "reject",
})
pipeline.add_edge("summarize", "format")
pipeline.add_edge("format", END)
pipeline.add_edge("reject", END)

app = pipeline.compile()
```

Yahan `validate_step` aur `summarize_step` **wrapper functions** hain jo `validator` aur `summarizer` subgraphs ko call karte hain — exactly Approach 2 wala pattern. Agla kabhi `email_content_pipeline` banao, tum wahi `validator` aur `summarizer` bina modify kiye reuse kar sakte ho.

---

## Hierarchical Agent Architectures

Ab asli maza — subgraphs se hum **hierarchical agent teams** bana sakte hain jahan ek top-level coordinator kaam ko specialized sub-agents mein delegate karta hai. Yeh bilkul waisa hai jaise ek Zomato restaurant manager apne kaam ko chef, delivery-coordinator, aur cashier mein baant deta hai — har koi apna specialized kaam karta hai, manager sirf orchestrate karta hai.

```
Top-Level Coordinator
  |
  +-- Research Sub-Agent (graph)
  |     +-- web_search node
  |     +-- paper_search node
  |     +-- synthesize node
  |
  +-- Writing Sub-Agent (graph)
  |     +-- outline node
  |     +-- draft node
  |     +-- edit node
  |
  +-- Review Sub-Agent (graph)
        +-- fact_check node
        +-- style_check node
        +-- final_score node
```

```python
from typing import TypedDict, Annotated, Literal
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, START, END, add_messages
from langgraph.checkpoint.memory import MemorySaver

llm = ChatOpenAI(model="gpt-4o-mini")


# --- Sub-Agent 1: Research ---
class ResearchSubState(TypedDict):
    topic: str
    findings: str

def do_research(state: ResearchSubState) -> dict:
    response = llm.invoke(f"Research the topic: {state['topic']}. List 3 key findings.")
    return {"findings": response.content}

research_graph = StateGraph(ResearchSubState)
research_graph.add_node("research", do_research)
research_graph.add_edge(START, "research")
research_graph.add_edge("research", END)
research_sub = research_graph.compile()


# --- Sub-Agent 2: Writer ---
class WriterSubState(TypedDict):
    findings: str
    draft: str

def write_draft(state: WriterSubState) -> dict:
    response = llm.invoke(
        f"Write a short article based on these research findings:\n{state['findings']}"
    )
    return {"draft": response.content}

writer_graph = StateGraph(WriterSubState)
writer_graph.add_node("write", write_draft)
writer_graph.add_edge(START, "write")
writer_graph.add_edge("write", END)
writer_sub = writer_graph.compile()


# --- Sub-Agent 3: Reviewer ---
class ReviewerSubState(TypedDict):
    draft: str
    review: str
    score: float

def review_draft(state: ReviewerSubState) -> dict:
    response = llm.invoke(
        f"Review this article. Give feedback and a score 0-10.\n\n{state['draft']}"
    )
    # Production mein structured output (Pydantic model) use karo score nikalne ke liye,
    # yahan simplicity ke liye hardcode kiya hai
    score = 7.5
    return {"review": response.content, "score": score}

reviewer_graph = StateGraph(ReviewerSubState)
reviewer_graph.add_node("review", review_draft)
reviewer_graph.add_edge(START, "review")
reviewer_graph.add_edge("review", END)
reviewer_sub = reviewer_graph.compile()


# --- Top-Level Coordinator ---
class CoordinatorState(TypedDict):
    topic: str
    research_findings: str
    article_draft: str
    review_feedback: str
    review_score: float
    final_article: str


def run_research(state: CoordinatorState) -> dict:
    result = research_sub.invoke({"topic": state["topic"], "findings": ""})
    return {"research_findings": result["findings"]}


def run_writer(state: CoordinatorState) -> dict:
    result = writer_sub.invoke({"findings": state["research_findings"], "draft": ""})
    return {"article_draft": result["draft"]}


def run_reviewer(state: CoordinatorState) -> dict:
    result = reviewer_sub.invoke({
        "draft": state["article_draft"],
        "review": "",
        "score": 0.0,
    })
    return {
        "review_feedback": result["review"],
        "review_score": result["score"],
    }


def route_after_review(state: CoordinatorState) -> str:
    if state["review_score"] >= 7.0:
        return "finalize"
    return "rewrite"


def finalize(state: CoordinatorState) -> dict:
    return {"final_article": state["article_draft"]}


coordinator = StateGraph(CoordinatorState)
coordinator.add_node("research", run_research)
coordinator.add_node("write", run_writer)
coordinator.add_node("review", run_reviewer)
coordinator.add_node("finalize", finalize)

coordinator.add_edge(START, "research")
coordinator.add_edge("research", "write")
coordinator.add_edge("write", "review")
coordinator.add_conditional_edges("review", route_after_review, {
    "finalize": "finalize",
    "rewrite": "write",  # Cycle: score kam hai toh phir se likho
})
coordinator.add_edge("finalize", END)

app = coordinator.compile()

result = app.invoke({
    "topic": "The future of AI agents",
    "research_findings": "",
    "article_draft": "",
    "review_feedback": "",
    "review_score": 0.0,
    "final_article": "",
})

print(result["final_article"][:300])
```

Yahan dhyan do — `route_after_review` ek **retry loop** bana raha hai: agar reviewer ka score 7.0 se kam hai, coordinator wapas `write` node pe jata hai (jo actually `writer_sub` subgraph ko phir se invoke karta hai). Yeh pattern production agents mein bahut common hai — "quality gate + retry", jaise ek QA engineer jab tak bug fix na ho tab tak dev ko wapas bhejta rahta hai.

> [!warning]
> Is tarah ke retry loops mein **hamesha ek max-retry limit lagao**, warna agar LLM consistently low score deta rahega (ya reviewer khud buggy hai), tumhara graph infinite loop mein fas sakta hai aur bill (API cost) uthta rahega. Isko fix karne ke liye `CoordinatorState` mein ek `retry_count` field add karo aur `route_after_review` mein check karo:
> ```python
> def route_after_review(state: CoordinatorState) -> str:
>     if state["review_score"] >= 7.0 or state.get("retry_count", 0) >= 2:
>         return "finalize"
>     return "rewrite"
> ```

---

## Subgraphs Debug Karna

Bade hierarchical systems debug karna mushkil ho sakta hai agar tumhe visibility na mile ki andar kya ho raha hai. LangGraph isko easy banata hai.

### Subgraphs se events stream karo

```python
for event in app.stream(initial_state, stream_mode="updates"):
    print(event)
    # Subgraph nodes ke events bhi yahan visible hote hain
```

Production mein jab tumhara coordinator 3-4 sub-agents chala raha ho, yeh streaming tumhe real-time dikhata hai ki kaunsa sub-agent abhi kya kar raha hai — bilkul jaise Swiggy app mein "restaurant ne order accept kiya", "chef bana raha hai", "delivery boy nikal chuka hai" — step by step status milta hai.

### Poori hierarchy visualize karo

```python
# Sirf parent graph ka visualization
print(app.get_graph().draw_mermaid())

# Subgraphs ke andar dekhne ke liye:
print(app.get_graph(xray=True).draw_mermaid())
```

`xray=True` parameter visualization mein subgraphs ko **expand** kar deta hai taaki tum unki internal structure bhi dekh sako — jaise ek company ke org chart mein zoom-in karke individual team ke members dikhna.

> [!info]
> Agar tum LangGraph Studio use kar rahe ho (jo hum Chapter 24 mein production deployment ke context mein cover karenge), waha `xray` mode automatically UI mein available hota hai — tum click karke subgraphs expand/collapse kar sakte ho.

---

## Common Mistakes aur Gotchas

1. **State keys match nahi karna, silently ignore ho jana**: Agar tum subgraph ko directly node ki tarah add karte ho (bina wrapper ke) aur keys match nahi karte, LangGraph error nahi dega hamesha — kabhi kabhi woh keys simply ignore ho jayengi aur tumhe pata bhi nahi chalega ki data pass nahi hua. **Wrapper function use karo jab bhi doubt ho.**

2. **Mutable default state fields bhool jana**: Jab subgraph ko `.invoke()` karte ho, uska poora initial state explicitly pass karna padta hai (jaise `{"sources": [], "summary": ""}`), warna `KeyError` aayega andar ke nodes mein.

3. **Reducers ka scope confuse karna**: `Annotated[list[str], operator.add]` jaisa reducer sirf uss state schema ke andar kaam karta hai jaha define hua hai. Agar parent state mein wahi field bina reducer ke declare hai, dono independent behave karenge.

4. **Retry loops mein max-limit na lagana**: Jaise upar dikhaya, hierarchical coordinator patterns mein cycles common hain — hamesha ek termination condition rakho.

5. **Har chhoti cheez ko subgraph banana**: Subgraphs overhead add karte hain (extra invoke calls, state serialization). Agar ek node sirf ek simple function call hai, usse subgraph banane ki zarurat nahi — subgraphs tab use karo jab **modularity ya reusability ka real fayda** ho.

6. **Checkpointing ka scope samajhna**: Agar parent graph ek `checkpointer` (jaise `MemorySaver`) use kar raha hai for persistence/human-in-the-loop (Chapter 16 dekho), toh subgraphs bhi automatically usi checkpointing mechanism mein participate karte hain — matlab agar parent interrupt hota hai, subgraph ka intermediate state bhi save hota hai. Yeh powerful hai lekin isका matlab yeh bhi hai ki subgraph ke andar bhi tumhe interrupt behavior ka dhyan rakhna padega.

---

## Production Considerations

- **Cost**: Har subgraph invoke ek independent unit hai — agar subgraph ke andar LLM calls hain, coordinator jitni baar subgraph ko call karega utni hi baar cost add hoga. Retry loops (jaise upar wala reviewer example) cost multiply kar sakte hain — monitoring zaruri hai.
- **Latency**: Sequential subgraph calls (research -> write -> review) latency add karte jaate hain. Agar sub-agents independent hain (ek dusre pe depend nahi karte), unhe parallel branches mein chalane ke baare mein socho (LangGraph ismein fan-out/fan-in support karta hai — yeh Chapter 18 mein cover hoga).
- **Error handling**: Agar ek subgraph fail ho jaye (jaise LLM API timeout), decide karo ki parent graph kya kare — retry, fallback, ya poora pipeline fail? Wrapper function mein `try/except` daal ke graceful degradation implement karo:
  ```python
  def research_node(state: ParentState) -> dict:
      try:
          result = research_app.invoke({"query": state["topic"], "sources": [], "summary": ""})
          return {"research_summary": result["summary"]}
      except Exception as e:
          return {"research_summary": f"Research failed: {e}. Proceeding with limited info."}
  ```
- **Testing**: Sabse bada fayda yehi hai — har subgraph ko **independently unit test** kar sakte ho, bina poora coordinator chalaye. Chapter 23 (Testing AI Agents) mein isko detail se cover karenge.
- **Observability**: Production mein `stream_mode="updates"` ya tracing tools (LangSmith, jo Chapter 10 mein cover hua) use karke subgraph-level visibility rakho, taaki jab kuch galat ho, tum turant pata laga sako ki **kaunsa** sub-agent culprit hai.

---

## Key Takeaways

- Subgraph ek compiled graph hai jise parent graph mein ek node ki tarah use kiya jata hai — Node.js ke router-composition jaisa pattern.
- State compatibility subgraphs ka sabse bada challenge hai: ya toh **shared keys** rakho (simple cases ke liye), ya **wrapper function** likho (recommended, production-grade control ke liye).
- Wrapper functions parent state ko explicitly subgraph state mein map karte hain aur wapas — debug karna aasan, evolve karna aasan.
- Factory functions (`build_X_graph()`) reusable, parameterized components banane ka standard pattern hain — dependency injection jaisa (jaise `llm` ko parameter banana).
- Hierarchical architectures (coordinator + specialized sub-agents) subgraphs se naturally emerge hote hain — yeh multi-agent systems (Chapter 18) ka foundation hai.
- Retry loops (`route_after_review` jaisa pattern) powerful hain lekin **hamesha max-retry limit** ke saath aane chahiye, warna infinite loop aur runaway cost ka risk hai.
- `app.get_graph(xray=True).draw_mermaid()` se pura hierarchy visualize karo — subgraphs internal structure ke saath expand ho jaate hain.
- Checkpointing parent se subgraph tak automatically propagate hota hai — human-in-the-loop aur persistence subgraphs ke andar bhi kaam karte hain.
- Har chhoti cheez ko subgraph mat banao — sirf tab jab real modularity, reusability, ya testability ka fayda ho.
