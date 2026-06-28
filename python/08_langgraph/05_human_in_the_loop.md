# 05 - Human-in-the-Loop: Interruptions, Approvals, and Collaboration

## Why Human-in-the-Loop?

AI agents are powerful but not infallible. In production systems, you often need a human to:
- **Approve** a risky action before it executes (e.g., sending an email, making a payment)
- **Review** generated content before publishing
- **Correct** the agent when it goes off track
- **Provide input** that the agent cannot obtain on its own

LangGraph has first-class support for this via **interrupt** points. The graph pauses at a designated node, waits for human intervention, then resumes.

**Node.js analogy:** Think of it like an Express route that returns a 202 Accepted with a task ID, and the client polls or uses WebSockets to approve/reject before the backend continues processing.

---

## Prerequisites: Checkpointer Required

Human-in-the-loop requires a checkpointer because the graph must **save its state** when it pauses and **restore it** when it resumes:

```python
from langgraph.checkpoint.memory import MemorySaver

memory = MemorySaver()
app = graph.compile(
    checkpointer=memory,
    interrupt_before=["node_name"],  # Pause BEFORE this node runs
)
```

Without a checkpointer, there is nowhere to store the paused state, and interrupts will not work.

---

## interrupt_before and interrupt_after

### interrupt_before

The graph pauses **before** the specified node executes. The node has not run yet -- you can inspect the state, modify it, then resume.

```python
app = graph.compile(
    checkpointer=memory,
    interrupt_before=["execute_action"],
)
```

**Use case:** Agent proposes an action. Human reviews and approves before it runs.

### interrupt_after

The graph pauses **after** the specified node has executed. The node's output is in state, but the graph has not moved to the next node.

```python
app = graph.compile(
    checkpointer=memory,
    interrupt_after=["generate_draft"],
)
```

**Use case:** Agent generates content. Human reviews the output before it moves to the publishing step.

### Using Both

You can interrupt before and after different nodes:

```python
app = graph.compile(
    checkpointer=memory,
    interrupt_before=["send_email"],
    interrupt_after=["generate_email"],
)
```

---

## Basic Approval Workflow

Here is a complete example: an agent proposes an action, and the human must approve it.

```python
from typing import TypedDict, Annotated
import operator
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, START, END, add_messages
from langgraph.checkpoint.memory import MemorySaver


class ApprovalState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    proposed_action: str
    approved: bool


llm = ChatOpenAI(model="gpt-4o-mini")


def plan_action(state: ApprovalState) -> dict:
    """Agent plans what to do based on the conversation."""
    response = llm.invoke([
        {"role": "system", "content": "Based on the user's request, propose a specific action. "
                                       "State the action clearly."},
        *state["messages"],
    ])
    return {
        "messages": [response],
        "proposed_action": response.content,
    }


def execute_action(state: ApprovalState) -> dict:
    """Execute the approved action."""
    # In production, this would call an API, send an email, etc.
    action = state["proposed_action"]
    result = f"Action executed successfully: {action}"
    return {"messages": [AIMessage(content=result)]}


def format_response(state: ApprovalState) -> dict:
    return {"messages": [AIMessage(content="All done! The action has been completed.")]}


# Build the graph
graph = StateGraph(ApprovalState)
graph.add_node("plan", plan_action)
graph.add_node("execute", execute_action)
graph.add_node("respond", format_response)

graph.add_edge(START, "plan")
graph.add_edge("plan", "execute")
graph.add_edge("execute", "respond")
graph.add_edge("respond", END)

# Compile with interrupt BEFORE execute
memory = MemorySaver()
app = graph.compile(
    checkpointer=memory,
    interrupt_before=["execute"],
)

# --- Step 1: User makes a request, agent plans ---
config = {"configurable": {"thread_id": "approval-demo"}}

result = app.invoke(
    {"messages": [HumanMessage(content="Send an email to the team about Friday's meeting.")]},
    config=config,
)

# The graph paused BEFORE "execute"
print("Agent proposes:", result.get("proposed_action", ""))
print("Graph is paused. Waiting for approval...")

# --- Step 2: Check the state ---
state = app.get_state(config)
print("Next node to execute:", state.next)
# Output: ('execute',)

# --- Step 3: Human approves and resumes ---
# To resume, invoke with None (no new input) -- the graph continues from where it paused
result = app.invoke(None, config=config)
print("Final:", result["messages"][-1].content)
```

---

## Modifying State During Interruption

The real power is that you can **change the state** before resuming. The agent proposed something, but the human wants to adjust it.

```python
# After the graph pauses...
state = app.get_state(config)
print("Proposed:", state.values["proposed_action"])

# Human modifies the action
app.update_state(
    config,
    {
        "proposed_action": "Send an email to the team about Friday's meeting at 3pm in Conference Room B",
        "messages": [HumanMessage(content="Modified: added time and location.")],
    },
)

# Resume with the modified state
result = app.invoke(None, config=config)
```

---

## Rejecting an Action

If the human rejects the proposed action entirely, you can modify state to skip execution:

```python
# Option 1: Update state to change the flow
app.update_state(
    config,
    {"proposed_action": "REJECTED", "messages": [HumanMessage(content="I reject this action.")]},
    as_node="execute",  # Pretend this update came from the "execute" node, skipping it
)

# Resume -- the graph continues AFTER "execute" (goes to "respond")
result = app.invoke(None, config=config)
```

The `as_node` parameter is key: it tells LangGraph to treat your update as if it came from the specified node. This effectively skips that node and proceeds to whatever comes after it.

---

## Complete Example: Content Review Workflow

A more realistic example -- an agent writes content, a human reviews and can request changes:

```python
from typing import TypedDict, Annotated, Literal
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, START, END, add_messages
from langgraph.checkpoint.memory import MemorySaver

llm = ChatOpenAI(model="gpt-4o-mini")


class ContentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    topic: str
    draft: str
    feedback: str
    revision_count: int
    status: str  # "drafting", "reviewing", "approved", "published"


def write_draft(state: ContentState) -> dict:
    """Write or revise content based on feedback."""
    prompt = f"Write a short blog post about: {state['topic']}"
    if state.get("feedback"):
        prompt = (
            f"Revise this draft based on feedback.\n\n"
            f"Draft:\n{state['draft']}\n\n"
            f"Feedback:\n{state['feedback']}\n\n"
            f"Write an improved version."
        )

    response = llm.invoke([
        {"role": "system", "content": "You are a skilled content writer."},
        {"role": "user", "content": prompt},
    ])

    return {
        "draft": response.content,
        "status": "reviewing",
        "revision_count": state.get("revision_count", 0) + 1,
        "messages": [AIMessage(content=f"Draft (revision {state.get('revision_count', 0) + 1}):\n{response.content}")],
    }


def publish(state: ContentState) -> dict:
    """Publish the approved content."""
    # In production: save to CMS, send to API, etc.
    return {
        "status": "published",
        "messages": [AIMessage(content=f"Content published successfully! Final version:\n{state['draft']}")],
    }


def check_review_result(state: ContentState) -> str:
    """Route based on human review feedback."""
    if state.get("status") == "approved":
        return "publish"
    return "revise"


# Build graph
graph = StateGraph(ContentState)
graph.add_node("write", write_draft)
graph.add_node("publish", publish)

graph.add_edge(START, "write")
# After writing, the graph will pause (interrupt_after) for human review
graph.add_conditional_edges("write", check_review_result, {
    "publish": "publish",
    "revise": "write",  # Cycle back for revision
})
graph.add_edge("publish", END)

memory = MemorySaver()
app = graph.compile(
    checkpointer=memory,
    interrupt_after=["write"],  # Pause after each draft for review
)

config = {"configurable": {"thread_id": "content-review-001"}}


# --- Round 1: Initial draft ---
result = app.invoke(
    {"topic": "Benefits of TypeScript for backend development",
     "draft": "", "feedback": "", "revision_count": 0, "status": "drafting",
     "messages": []},
    config=config,
)

state = app.get_state(config)
print("Draft ready for review!")
print(state.values["draft"][:200] + "...")


# --- Round 2: Human provides feedback ---
app.update_state(
    config,
    {
        "feedback": "Good start, but please add more about type safety in large codebases.",
        "status": "needs_revision",
    },
)

result = app.invoke(None, config=config)
state = app.get_state(config)
print(f"\nRevision {state.values['revision_count']} ready!")
print(state.values["draft"][:200] + "...")


# --- Round 3: Human approves ---
app.update_state(
    config,
    {"feedback": "", "status": "approved"},
)

result = app.invoke(None, config=config)
print("\n" + result["messages"][-1].content[:200])
```

---

## Use Cases for Human-in-the-Loop

### 1. Tool Approval
```python
# Pause before the agent executes any tool
app = graph.compile(
    checkpointer=memory,
    interrupt_before=["tool_executor"],
)

# Human can see which tool the agent wants to call and with what arguments
state = app.get_state(config)
last_msg = state.values["messages"][-1]
print("Agent wants to call:", last_msg.tool_calls)
# Human approves or rejects
```

### 2. Data Validation
```python
# Agent extracts data, human validates before saving
app = graph.compile(
    checkpointer=memory,
    interrupt_after=["extract_data"],
    interrupt_before=["save_to_database"],
)
```

### 3. Multi-Step Approval Pipeline
```python
# Different reviewers at different stages
app = graph.compile(
    checkpointer=memory,
    interrupt_before=["legal_review", "compliance_check", "final_publish"],
)
```

### 4. Interactive Agent
```python
# Agent asks questions and waits for human answers
def agent_asks_question(state):
    # Agent determines it needs more info
    return {"messages": [AIMessage(content="What budget range are you considering?")]}

app = graph.compile(
    checkpointer=memory,
    interrupt_after=["ask_question"],
)

# Human provides answer by updating state
app.update_state(config, {
    "messages": [HumanMessage(content="Between $500 and $1000")]
})
app.invoke(None, config=config)  # Resume
```

---

## The interrupt() Function (LangGraph >= 0.2.57)

Newer versions of LangGraph provide an `interrupt()` function that can be called directly inside a node, giving you more fine-grained control:

```python
from langgraph.types import interrupt, Command


def node_with_approval(state):
    """Node that pauses mid-execution for approval."""
    proposed = f"I want to send an email about {state['topic']}"

    # This pauses execution and sends data to the human
    human_response = interrupt({
        "question": "Do you approve this action?",
        "proposed_action": proposed,
    })

    # When resumed, human_response contains what the human provided
    if human_response.get("approved"):
        return {"result": f"Executed: {proposed}"}
    else:
        return {"result": "Action was rejected by human."}
```

To resume with a response:

```python
# Resume and provide the human's answer
app.invoke(
    Command(resume={"approved": True}),
    config=config,
)
```

---

## Key Takeaways

1. **interrupt_before** pauses the graph before a node runs -- ideal for action approval.
2. **interrupt_after** pauses after a node runs -- ideal for content review.
3. A **checkpointer is required** for interrupts to work (state must be persisted).
4. Use `update_state()` to modify state during a pause -- change the action, add feedback, etc.
5. Use `as_node` in `update_state()` to skip a node entirely.
6. Resume with `app.invoke(None, config=config)` to continue from where the graph paused.
7. The `interrupt()` function provides inline pausing within a node for finer control.

---

## Practice Exercises

### Exercise 1: Simple Approval Gate
Build a graph with three nodes:
1. `propose` - generates a random action (e.g., "Delete file X", "Send email to Y")
2. `execute` - runs the action (just prints it)
3. `report` - reports the result

Add `interrupt_before=["execute"]`. Run the graph, inspect the proposed action, then:
- Approve and resume
- Reject by updating state with `as_node="execute"` to skip it

### Exercise 2: Multi-Stage Review
Build a content pipeline:
1. `draft` - writes a blog post
2. `technical_review` - pauses for technical reviewer
3. `editorial_review` - pauses for editor
4. `publish` - publishes the final version

Each review stage should be interruptible. Simulate the full flow:
- Draft is created
- Technical reviewer provides feedback -> revision
- Editor approves -> publish

### Exercise 3: Interactive Quiz Agent
Build an agent that gives the user a quiz:
1. `generate_question` - generates a question
2. `wait_for_answer` - pauses for user to answer (interrupt_after)
3. `evaluate_answer` - checks if the answer is correct
4. `next_or_finish` - after 3 questions, go to END; otherwise loop back

Use `update_state` to inject the human's answer at each pause.

### Exercise 4: Tool Approval with Preview
Build a tool-using agent where:
1. The LLM decides to call a tool (web search, calculator, etc.)
2. Before the tool executes, the graph pauses
3. Display: "Agent wants to call {tool_name} with args {args}. Approve? (y/n)"
4. If approved, execute and continue
5. If rejected, tell the agent the tool was rejected and let it try a different approach

### Exercise 5: Collaborative Writing
Build a system where:
1. An AI generates an outline
2. Human reviews outline (interrupt, can modify)
3. AI writes each section based on the outline
4. After each section, human reviews (interrupt)
5. Human can request revision or approve
6. After all sections approved, AI compiles the final document

Track revision counts per section and the total number of human interactions.
