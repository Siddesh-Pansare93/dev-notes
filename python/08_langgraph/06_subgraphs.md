# 06 - Subgraphs: Composing and Reusing Graph Components

## Why Subgraphs?

As your agent workflows grow, you need to organize them into reusable, testable pieces. **Subgraphs** let you use one compiled graph as a node inside another graph, just like how in Node.js you might compose Express routers or break a large application into modules.

```
// Node.js router composition analogy
const authRouter = express.Router();  // Self-contained sub-app
const apiRouter = express.Router();
apiRouter.use("/auth", authRouter);   // Compose into parent
app.use("/api", apiRouter);
```

In LangGraph:
```
Parent Graph:
  START -> intake -> [subgraph: research_agent] -> [subgraph: writing_agent] -> review -> END
```

---

## Creating a Subgraph

A subgraph is just a regular compiled graph that you add as a node to a parent graph.

### Step 1: Define the subgraph

```python
from typing import TypedDict, Annotated
import operator
from langgraph.graph import StateGraph, START, END


class ResearchState(TypedDict):
    query: str
    sources: Annotated[list[str], operator.add]
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


# Build the research subgraph
research_graph = StateGraph(ResearchState)
research_graph.add_node("search_web", search_web)
research_graph.add_node("search_papers", search_papers)
research_graph.add_node("synthesize", synthesize)

research_graph.add_edge(START, "search_web")
research_graph.add_edge("search_web", "search_papers")
research_graph.add_edge("search_papers", "synthesize")
research_graph.add_edge("synthesize", END)

# Compile the subgraph
research_app = research_graph.compile()

# You can run it standalone
result = research_app.invoke({"query": "LangGraph best practices", "sources": [], "summary": ""})
print(result["summary"])
```

### Step 2: Use it as a node in a parent graph

```python
class ParentState(TypedDict):
    topic: str
    research: str
    article: str


def prepare_research(state: ParentState) -> dict:
    """Transform parent state into subgraph input state."""
    return {"query": state["topic"], "sources": [], "summary": ""}


def write_article(state: ParentState) -> dict:
    return {"article": f"Article based on research:\n{state['research']}"}


# Option 1: Use compiled subgraph directly as a node
parent_graph = StateGraph(ParentState)
parent_graph.add_node("research", research_app)  # Compiled graph as node
parent_graph.add_node("write", write_article)

parent_graph.add_edge(START, "research")
parent_graph.add_edge("research", "write")
parent_graph.add_edge("write", END)
```

**Important:** When using a subgraph directly as a node, the parent state and subgraph state must share the same keys that need to be passed between them, or you need to handle state transformation.

---

## Nested State Management

The biggest challenge with subgraphs is **state compatibility**. The parent graph and subgraph may have different state schemas.

### Shared Keys Approach

The simplest approach: ensure both states share the keys they need to communicate through.

```python
class ParentState(TypedDict):
    query: str           # Shared with subgraph
    sources: list[str]   # Shared with subgraph
    summary: str         # Shared with subgraph
    final_output: str    # Parent only


class SubgraphState(TypedDict):
    query: str           # Shared with parent
    sources: list[str]   # Shared with parent
    summary: str         # Shared with parent
    internal_score: float  # Subgraph only
```

When the subgraph runs as a node, LangGraph automatically:
1. Passes matching keys from parent state to subgraph
2. Returns matching keys from subgraph output to parent state
3. Ignores keys that exist only in one schema

### Wrapper Function Approach

For maximum control, wrap the subgraph in a function that handles state transformation:

```python
class ParentState(TypedDict):
    topic: str
    research_summary: str
    article: str


class ResearchState(TypedDict):
    query: str
    sources: Annotated[list[str], operator.add]
    summary: str


research_app = build_research_graph()  # Returns compiled subgraph


def research_node(state: ParentState) -> dict:
    """Wrapper: transforms parent state -> subgraph state -> parent state."""
    # Map parent state to subgraph input
    subgraph_input = {
        "query": state["topic"],
        "sources": [],
        "summary": "",
    }

    # Run the subgraph
    result = research_app.invoke(subgraph_input)

    # Map subgraph output back to parent state
    return {"research_summary": result["summary"]}


parent_graph = StateGraph(ParentState)
parent_graph.add_node("research", research_node)  # Wrapper function, not raw subgraph
```

This is the recommended pattern when parent and subgraph states have different structures. It is explicit and easy to debug.

---

## Reusable Graph Components

Build a library of graph components that can be composed into different workflows:

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
    """Factory function that returns a compiled validation graph."""
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
    """Factory function for a summarization subgraph."""
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

### Using the Components

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

---

## Hierarchical Agent Architectures

Subgraphs enable hierarchical designs where a top-level coordinator delegates to specialized sub-agents:

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
    # Simple score extraction (in production, use structured output)
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
    "rewrite": "write",  # Cycle: write again if review score is low
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

---

## Debugging Subgraphs

### Stream events from subgraphs

```python
for event in app.stream(initial_state, stream_mode="updates"):
    print(event)
    # Events from subgraph nodes are also visible
```

### Visualize the full hierarchy

```python
# Parent graph visualization
print(app.get_graph().draw_mermaid())

# To see inside subgraphs:
print(app.get_graph(xray=True).draw_mermaid())
```

The `xray=True` parameter expands subgraphs in the visualization so you can see their internal structure.

---

## Key Takeaways

1. Subgraphs are compiled graphs used as nodes in parent graphs.
2. State mapping between parent and subgraph requires shared keys or wrapper functions.
3. Wrapper functions give you explicit control over state transformation.
4. Factory functions (`build_X_graph()`) create reusable, parameterized components.
5. Hierarchical architectures (coordinator + sub-agents) are a powerful pattern for complex workflows.
6. Use `xray=True` in visualization to inspect subgraph internals.

---

## Practice Exercises

### Exercise 1: Validation Pipeline
Create three reusable subgraphs:
- `email_validator` - checks if text is a valid email format
- `url_validator` - checks if text is a valid URL format
- `text_sanitizer` - removes HTML tags and extra whitespace

Compose them into a parent "input_cleaner" graph that validates and sanitizes user input.

### Exercise 2: Modular Data Pipeline
Build a data processing pipeline from subgraphs:
- `fetcher` subgraph: simulates fetching data from an API
- `transformer` subgraph: cleans and normalizes the data
- `aggregator` subgraph: computes statistics (min, max, avg)

The parent graph chains them together and handles errors from any stage.

### Exercise 3: Agent Team
Build a team of three specialized sub-agents:
1. **Planner**: takes a goal, breaks it into steps
2. **Executor**: takes a step, performs it (simulated)
3. **Verifier**: checks if the step was completed correctly

The parent coordinator runs each step through executor -> verifier, retrying failed steps (max 2 retries).

### Exercise 4: Dynamic Subgraph Selection
Build a parent graph where the coordinator dynamically selects which subgraph to run based on the task type:
- "math" -> calculator subgraph
- "text" -> text processing subgraph
- "search" -> search subgraph

Use a conditional edge to route to the appropriate subgraph.

### Exercise 5: Subgraph with Human-in-the-Loop
Create a subgraph that has its own interrupt points. Embed it in a parent graph that also has interrupts. Test:
1. Does the subgraph interrupt correctly when running inside the parent?
2. Can you update the subgraph's state through the parent?
3. What happens when both parent and subgraph have interrupts?
