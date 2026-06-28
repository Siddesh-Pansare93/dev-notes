# 07 - Memory in LangChain

## Why Memory Matters

LLMs are stateless. Each `.invoke()` call is independent -- the model has no idea what you said 30 seconds ago. For chatbots and multi-turn applications, you need to explicitly pass conversation history back to the model every time.

This is the same problem in Node.js: you store session data in Redis or a database and attach it to each request. LangChain provides memory abstractions that manage this for you.

```
Without memory:
  User: "My name is Alice."     → AI: "Nice to meet you, Alice!"
  User: "What is my name?"      → AI: "I don't know your name."

With memory:
  User: "My name is Alice."     → AI: "Nice to meet you, Alice!"
  User: "What is my name?"      → AI: "Your name is Alice."
```

---

## Memory Strategies Overview

| Strategy | What It Stores | Best For |
|---|---|---|
| Buffer | All messages verbatim | Short conversations |
| Window | Last N message pairs | Medium conversations |
| Summary | AI-generated summary of old messages | Long conversations |
| Token Buffer | Messages up to N tokens | Token-budget-aware apps |
| Manual management | You handle it yourself | Production systems |

---

## ConversationBufferMemory

Stores every message in the conversation. Simple but grows without limit.

```python
from langchain.memory import ConversationBufferMemory

memory = ConversationBufferMemory(return_messages=True)

# Simulate a conversation
memory.save_context(
    {"input": "My name is Alice."},
    {"output": "Nice to meet you, Alice!"},
)
memory.save_context(
    {"input": "I'm learning Python."},
    {"output": "That's great! Python is a fantastic language."},
)

# Retrieve the stored messages
history = memory.load_memory_variables({})
print(history)
# {
#   "history": [
#     HumanMessage(content="My name is Alice."),
#     AIMessage(content="Nice to meet you, Alice!"),
#     HumanMessage(content="I'm learning Python."),
#     AIMessage(content="That's great! Python is a fantastic language."),
#   ]
# }
```

### Using with a chain (legacy pattern)

```python
from langchain.chains import ConversationChain
from langchain_openai import ChatOpenAI
from langchain.memory import ConversationBufferMemory

model = ChatOpenAI(model="gpt-4o-mini", temperature=0.7)
memory = ConversationBufferMemory(return_messages=True)

conversation = ConversationChain(
    llm=model,
    memory=memory,
    verbose=True,  # See what's happening
)

# Each call automatically includes history
response1 = conversation.predict(input="My name is Alice and I code in Node.js.")
print(response1)

response2 = conversation.predict(input="What language do I use?")
print(response2)  # "You mentioned you code in Node.js!"

response3 = conversation.predict(input="What is my name?")
print(response3)  # "Your name is Alice."
```

---

## ConversationBufferWindowMemory

Keeps only the last `k` exchanges. Prevents the context from growing too large.

```python
from langchain.memory import ConversationBufferWindowMemory

memory = ConversationBufferWindowMemory(k=3, return_messages=True)
# Keeps last 3 exchange pairs (6 messages: 3 human + 3 AI)

# Simulate 5 exchanges
for i in range(5):
    memory.save_context(
        {"input": f"Message {i+1} from user"},
        {"output": f"Response {i+1} from AI"},
    )

history = memory.load_memory_variables({})
messages = history["history"]
print(f"Messages stored: {len(messages)}")  # 6 (last 3 pairs)

for msg in messages:
    print(f"  {msg.__class__.__name__}: {msg.content}")
# Only messages 3, 4, 5 remain -- messages 1, 2 have been dropped
```

> **Node.js parallel:** This is like keeping a sliding window of chat messages in an Express session. In Node.js you might do `messages = messages.slice(-6)`. LangChain automates this.

---

## ConversationSummaryMemory

Summarizes old messages using an LLM. Keeps the gist of old conversations without storing everything.

```python
from langchain.memory import ConversationSummaryMemory
from langchain_openai import ChatOpenAI

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)

memory = ConversationSummaryMemory(
    llm=model,
    return_messages=True,
)

# Long conversation
memory.save_context(
    {"input": "Hi, I'm Bob. I'm a frontend developer transitioning to AI."},
    {"output": "Welcome Bob! Transitioning from frontend to AI is a great move."},
)
memory.save_context(
    {"input": "I mainly use React and TypeScript at work."},
    {"output": "React and TypeScript skills are valuable! Python will be your main new tool."},
)
memory.save_context(
    {"input": "I've been learning Python for about 2 weeks now."},
    {"output": "Two weeks in, you're at a great stage to start exploring AI frameworks."},
)

# The memory stores a SUMMARY, not all individual messages
history = memory.load_memory_variables({})
print(history)
# Contains a summary like: "Bob is a frontend developer using React and TypeScript
# who is transitioning to AI development. He has been learning Python for 2 weeks."
```

### How it works under the hood

Each time you add context, the memory:
1. Takes the existing summary
2. Adds the new exchange
3. Asks the LLM to produce an updated summary
4. Stores the new summary (not the raw messages)

This costs extra LLM calls but keeps memory compact for very long conversations.

---

## ConversationTokenBufferMemory

Keeps messages up to a token budget. More precise than window memory for controlling costs.

```python
from langchain.memory import ConversationTokenBufferMemory
from langchain_openai import ChatOpenAI

model = ChatOpenAI(model="gpt-4o-mini")

memory = ConversationTokenBufferMemory(
    llm=model,
    max_token_limit=300,  # Keep messages totaling <= 300 tokens
    return_messages=True,
)

# Add messages -- old ones are dropped when token limit is exceeded
memory.save_context(
    {"input": "Explain Python decorators in detail."},
    {"output": "Decorators are functions that modify the behavior of other functions..."},
)
memory.save_context(
    {"input": "Now explain generators."},
    {"output": "Generators are functions that use yield to produce a sequence of values lazily..."},
)
memory.save_context(
    {"input": "What about context managers?"},
    {"output": "Context managers handle setup and teardown using with statements..."},
)

# Oldest messages may have been dropped to stay within 300 tokens
history = memory.load_memory_variables({})
for msg in history["history"]:
    print(f"{msg.__class__.__name__}: {msg.content[:60]}...")
```

---

## Modern Approach: Manual Message History Management

The legacy memory classes work but are being superseded by a simpler pattern: **manage the message list yourself** and use `RunnableWithMessageHistory` for persistence.

### Manual approach (recommended for new projects)

```python
from dotenv import load_dotenv
load_dotenv()

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import HumanMessage, AIMessage

model = ChatOpenAI(model="gpt-4o-mini", temperature=0.7)

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful Python tutor for JavaScript developers."),
    MessagesPlaceholder(variable_name="history"),
    ("human", "{input}"),
])

chain = prompt | model | StrOutputParser()

# Manage history yourself -- simple and transparent
history: list = []

def chat(user_message: str) -> str:
    """Send a message and get a response, maintaining history."""
    response = chain.invoke({
        "history": history,
        "input": user_message,
    })

    # Update history
    history.append(HumanMessage(content=user_message))
    history.append(AIMessage(content=response))

    return response

# Usage
print(chat("My name is Alice."))
print(chat("What is my name?"))           # Remembers "Alice"
print(chat("I'm coming from Node.js."))
print(chat("What's my background?"))       # Remembers "Node.js"
```

### With sliding window

```python
MAX_MESSAGES = 20

def chat_with_window(user_message: str) -> str:
    """Chat with a sliding window of history."""
    response = chain.invoke({
        "history": history[-MAX_MESSAGES:],  # Only last N messages
        "input": user_message,
    })

    history.append(HumanMessage(content=user_message))
    history.append(AIMessage(content=response))

    return response
```

### RunnableWithMessageHistory (for persistent sessions)

```python
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.chat_history import BaseChatMessageHistory, InMemoryChatMessageHistory

# Session store -- in production, use Redis or a database
session_store: dict[str, BaseChatMessageHistory] = {}

def get_session_history(session_id: str) -> BaseChatMessageHistory:
    """Get or create session history for a given session ID."""
    if session_id not in session_store:
        session_store[session_id] = InMemoryChatMessageHistory()
    return session_store[session_id]

# Wrap the chain with message history
chain_with_history = RunnableWithMessageHistory(
    chain,
    get_session_history,
    input_messages_key="input",
    history_messages_key="history",
)

# Each session maintains its own history
config1 = {"configurable": {"session_id": "user_alice"}}
config2 = {"configurable": {"session_id": "user_bob"}}

# Alice's conversation
response = chain_with_history.invoke(
    {"input": "Hi, I'm Alice!"},
    config=config1,
)
print(f"To Alice: {response}")

# Bob's conversation (separate history)
response = chain_with_history.invoke(
    {"input": "Hi, I'm Bob!"},
    config=config2,
)
print(f"To Bob: {response}")

# Alice asks about her name (her history remembers)
response = chain_with_history.invoke(
    {"input": "What's my name?"},
    config=config1,
)
print(f"To Alice: {response}")  # "Your name is Alice!"
```

---

## Persistent Memory with Databases

### SQLite-backed history

```python
from langchain_community.chat_message_histories import SQLChatMessageHistory

def get_session_history(session_id: str) -> SQLChatMessageHistory:
    return SQLChatMessageHistory(
        session_id=session_id,
        connection="sqlite:///chat_history.db",
    )

chain_with_history = RunnableWithMessageHistory(
    chain,
    get_session_history,
    input_messages_key="input",
    history_messages_key="history",
)
```

### Redis-backed history (for production)

```bash
pip install redis
```

```python
from langchain_community.chat_message_histories import RedisChatMessageHistory

def get_session_history(session_id: str) -> RedisChatMessageHistory:
    return RedisChatMessageHistory(
        session_id=session_id,
        url="redis://localhost:6379",
        ttl=3600,  # Expire after 1 hour
    )
```

> **Node.js parallel:** This is exactly like using `express-session` with Redis store. The session ID identifies the user, and the store persists the conversation across server restarts.

---

## Hybrid Strategy: Summary + Recent Messages

For long conversations, combine a summary of old messages with the recent message window.

```python
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)

WINDOW_SIZE = 6  # Keep last 6 messages (3 exchanges)

class HybridMemory:
    """Keeps a summary of old messages + recent messages."""

    def __init__(self, model, window_size: int = 6):
        self.model = model
        self.window_size = window_size
        self.all_messages: list = []
        self.summary: str = ""

    def add_exchange(self, human_msg: str, ai_msg: str):
        self.all_messages.append(HumanMessage(content=human_msg))
        self.all_messages.append(AIMessage(content=ai_msg))

        # If history is getting long, summarize old messages
        if len(self.all_messages) > self.window_size * 2:
            self._update_summary()

    def _update_summary(self):
        """Summarize messages that will be dropped from the window."""
        old_messages = self.all_messages[:-self.window_size]
        if not old_messages:
            return

        old_text = "\n".join(
            f"{'Human' if isinstance(m, HumanMessage) else 'AI'}: {m.content}"
            for m in old_messages
        )

        summary_prompt = (
            f"Summarize this conversation history concisely:\n\n"
            f"Previous summary: {self.summary}\n\n"
            f"New messages:\n{old_text}"
        )

        response = self.model.invoke(summary_prompt)
        self.summary = response.content

        # Keep only recent messages
        self.all_messages = self.all_messages[-self.window_size:]

    def get_messages(self) -> list:
        """Get messages to include in the prompt."""
        messages = []
        if self.summary:
            messages.append(SystemMessage(
                content=f"Summary of earlier conversation: {self.summary}"
            ))
        messages.extend(self.all_messages[-self.window_size:])
        return messages


# Usage
memory = HybridMemory(model, window_size=4)

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant."),
    MessagesPlaceholder(variable_name="history"),
    ("human", "{input}"),
])

chain = prompt | model | StrOutputParser()

def chat(message: str) -> str:
    response = chain.invoke({
        "history": memory.get_messages(),
        "input": message,
    })
    memory.add_exchange(message, response)
    return response
```

---

## Complete Chatbot with Persistent Memory

```python
"""
chatbot.py -- Production-style chatbot with persistent memory.
"""
from dotenv import load_dotenv
load_dotenv()

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_community.chat_message_histories import SQLChatMessageHistory

# --- Setup ---
model = ChatOpenAI(model="gpt-4o-mini", temperature=0.7)

prompt = ChatPromptTemplate.from_messages([
    ("system", (
        "You are a friendly Python tutor helping JavaScript developers learn Python. "
        "Be concise. Use JS/TS comparisons when helpful. "
        "Remember details the user has shared about themselves."
    )),
    MessagesPlaceholder(variable_name="history"),
    ("human", "{input}"),
])

chain = prompt | model | StrOutputParser()

# --- Persistent history ---
def get_session_history(session_id: str) -> SQLChatMessageHistory:
    return SQLChatMessageHistory(
        session_id=session_id,
        connection="sqlite:///chat_memory.db",
    )

chain_with_history = RunnableWithMessageHistory(
    chain,
    get_session_history,
    input_messages_key="input",
    history_messages_key="history",
)

# --- Interactive loop ---
def main():
    session_id = input("Enter your username (or press Enter for 'default'): ").strip()
    if not session_id:
        session_id = "default"

    config = {"configurable": {"session_id": session_id}}
    print(f"\nChatbot ready! Session: {session_id}")
    print("Type 'quit' to exit, 'clear' to reset history")
    print("=" * 50)

    while True:
        user_input = input("\nYou: ").strip()
        if not user_input:
            continue
        if user_input.lower() == "quit":
            print("Goodbye!")
            break
        if user_input.lower() == "clear":
            history = get_session_history(session_id)
            history.clear()
            print("[History cleared]")
            continue

        # Stream the response
        print("\nTutor: ", end="")
        for chunk in chain_with_history.stream(
            {"input": user_input},
            config=config,
        ):
            print(chunk, end="", flush=True)
        print()


if __name__ == "__main__":
    main()
```

---

## Practice Exercises

### Exercise 1: Memory comparison
Build the same chatbot three times using Buffer, Window (k=3), and Summary memory. Have a 10-turn conversation with each. At the end, ask the bot to recall details from the first message. Which memory type remembers? Which doesn't? How do the token counts compare?

### Exercise 2: Session management
Build a multi-user chatbot using `RunnableWithMessageHistory` with `InMemoryChatMessageHistory`. Simulate two users chatting simultaneously by alternating session IDs. Verify that their conversations remain separate.

### Exercise 3: Persistent memory
Set up SQLite-backed chat history. Have a conversation, exit the program, restart it, and verify that the history is preserved. Then implement a `/history` command that displays the last 10 messages.

### Exercise 4: Hybrid memory implementation
Implement the `HybridMemory` class from this chapter. Have a 20-turn conversation and verify that:
- The summary captures key facts from early messages
- Recent messages are preserved verbatim
- The bot can answer questions about both old and recent topics

### Exercise 5: Token-budget memory
Build a memory system that enforces a strict token budget (e.g., 500 tokens for history). Use `tiktoken` to count tokens accurately. When the budget is exceeded, drop the oldest messages. Test with conversations of varying message lengths.

### Exercise 6: Memory-aware RAG
Combine memory with RAG: build a chatbot that remembers the conversation AND can look up information from documents. The user should be able to ask follow-up questions that reference both the documents and earlier parts of the conversation.

```python
# Example conversation:
# User: "What does the documentation say about decorators?"
# Bot: [answers from documents]
# User: "Can you give me a simpler explanation?"
# Bot: [uses memory of previous answer + documents to simplify]
# User: "How does that relate to the middleware pattern I asked about earlier?"
# Bot: [uses memory + documents to connect topics]
```
