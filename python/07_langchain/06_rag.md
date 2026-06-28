# 06 - Retrieval Augmented Generation (RAG)

## What Is RAG?

RAG is a pattern where you **retrieve** relevant information from your own data, then **augment** the LLM's prompt with that context before **generating** a response. This lets you build systems that answer questions about your own documents, codebases, or knowledge bases -- without fine-tuning the model.

Think of it as giving the LLM an open-book exam instead of a closed-book one.

```
User question
    ↓
Embed the question → Search vector store → Get relevant chunks
    ↓
"Answer this question using this context: {chunks}"
    ↓
LLM generates answer grounded in YOUR data
```

### Why RAG instead of just sending everything to the LLM?

- **Context window limits** -- you cannot paste 10,000 pages into a prompt
- **Cost** -- fewer tokens = lower cost
- **Relevance** -- retrieval finds the most relevant pieces
- **Freshness** -- update your documents without retraining the model
- **Hallucination reduction** -- the model has real data to ground its answers

---

## The RAG Pipeline

```
Documents → Load → Split → Embed → Store in Vector DB
                                        ↓
User Query → Embed → Similarity Search → Relevant Chunks
                                        ↓
                    Prompt + Context → LLM → Answer
```

Let's build each step.

---

## Step 1: Document Loaders

Document loaders read data from various sources into LangChain `Document` objects.

```python
from langchain_core.documents import Document

# A Document is simply text + metadata
doc = Document(
    page_content="This is the actual text content.",
    metadata={"source": "my_file.txt", "page": 1},
)
```

### TextLoader: Plain text files

```python
from langchain_community.document_loaders import TextLoader

loader = TextLoader("data/notes.txt", encoding="utf-8")
documents = loader.load()

print(len(documents))              # 1 document
print(documents[0].page_content)   # The file contents
print(documents[0].metadata)       # {"source": "data/notes.txt"}
```

### PyPDFLoader: PDF files

```bash
pip install pypdf
```

```python
from langchain_community.document_loaders import PyPDFLoader

loader = PyPDFLoader("data/report.pdf")
documents = loader.load()  # One Document per page

for doc in documents:
    print(f"Page {doc.metadata['page']}: {doc.page_content[:100]}...")
```

### WebBaseLoader: Web pages

```bash
pip install beautifulsoup4
```

```python
from langchain_community.document_loaders import WebBaseLoader

loader = WebBaseLoader("https://docs.python.org/3/tutorial/introduction.html")
documents = loader.load()

print(documents[0].page_content[:200])
```

### DirectoryLoader: Load all files from a directory

```python
from langchain_community.document_loaders import DirectoryLoader, TextLoader

loader = DirectoryLoader(
    "data/docs/",
    glob="**/*.txt",       # File pattern
    loader_cls=TextLoader,  # Which loader to use per file
    show_progress=True,
)
documents = loader.load()
print(f"Loaded {len(documents)} documents")
```

### CSVLoader: Spreadsheet data

```python
from langchain_community.document_loaders import CSVLoader

loader = CSVLoader("data/products.csv")
documents = loader.load()
# Each row becomes a Document
```

---

## Step 2: Text Splitters

Documents are usually too large to embed or fit in a prompt. Splitters break them into smaller, overlapping chunks.

### RecursiveCharacterTextSplitter (the default choice)

```python
from langchain_text_splitters import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,       # Max characters per chunk
    chunk_overlap=200,     # Overlap between chunks (prevents losing context at boundaries)
    length_function=len,   # How to measure length
    separators=["\n\n", "\n", ". ", " ", ""],  # Split priority
)

text = """
Python is a high-level programming language. It was created by Guido van Rossum
and first released in 1991. Python's design philosophy emphasizes code readability
with the use of significant indentation.

Python is dynamically typed and garbage-collected. It supports multiple programming
paradigms, including structured, object-oriented, and functional programming.

Python consistently ranks as one of the most popular programming languages. It is
used in web development, data science, artificial intelligence, scientific computing,
and automation.
"""

chunks = splitter.split_text(text)
for i, chunk in enumerate(chunks):
    print(f"Chunk {i} ({len(chunk)} chars): {chunk[:80]}...")
```

### Splitting documents (preserves metadata)

```python
from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

loader = TextLoader("data/article.txt")
documents = loader.load()

splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
chunks = splitter.split_documents(documents)

# Each chunk is still a Document with metadata
for chunk in chunks:
    print(f"Source: {chunk.metadata['source']}, Length: {len(chunk.page_content)}")
```

### Token-based splitter (more accurate for LLMs)

```bash
pip install tiktoken
```

```python
from langchain_text_splitters import TokenTextSplitter

splitter = TokenTextSplitter(
    chunk_size=256,       # Tokens, not characters
    chunk_overlap=32,
    model_name="gpt-4o-mini",
)

chunks = splitter.split_text(long_text)
```

### Code splitter (language-aware)

```python
from langchain_text_splitters import RecursiveCharacterTextSplitter, Language

python_splitter = RecursiveCharacterTextSplitter.from_language(
    language=Language.PYTHON,
    chunk_size=500,
    chunk_overlap=50,
)

code = """
def hello():
    print("Hello, World!")

class Calculator:
    def add(self, a, b):
        return a + b

    def subtract(self, a, b):
        return a - b
"""

chunks = python_splitter.split_text(code)
for chunk in chunks:
    print(chunk)
    print("---")
```

---

## Step 3: Embeddings

Embeddings convert text into numerical vectors. Similar text produces similar vectors, enabling semantic search.

### OpenAI Embeddings

```python
from langchain_openai import OpenAIEmbeddings

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

# Embed a single text
vector = embeddings.embed_query("What is Python?")
print(f"Vector dimension: {len(vector)}")  # 1536
print(f"First 5 values: {vector[:5]}")

# Embed multiple texts
texts = ["Python is great", "JavaScript is popular", "Rust is fast"]
vectors = embeddings.embed_documents(texts)
print(f"Got {len(vectors)} vectors")
```

### HuggingFace Embeddings (free, local)

```bash
pip install sentence-transformers
```

```python
from langchain_community.embeddings import HuggingFaceEmbeddings

embeddings = HuggingFaceEmbeddings(
    model_name="all-MiniLM-L6-v2",  # Free, runs locally
)

vector = embeddings.embed_query("What is Python?")
print(f"Vector dimension: {len(vector)}")  # 384
```

### How similarity works

```python
import numpy as np

def cosine_similarity(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

v1 = embeddings.embed_query("How do I sort a list in Python?")
v2 = embeddings.embed_query("What is the Python sort function?")
v3 = embeddings.embed_query("Best pizza restaurants in New York")

print(f"Similar topics:  {cosine_similarity(v1, v2):.4f}")  # ~0.90
print(f"Different topics: {cosine_similarity(v1, v3):.4f}")  # ~0.30
```

---

## Step 4: Vector Stores

Vector stores are databases optimized for storing and searching embedding vectors.

### Chroma (local, great for development)

```bash
pip install langchain-chroma
```

```python
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

# Create from documents
texts = [
    "Python was created by Guido van Rossum in 1991.",
    "JavaScript was created by Brendan Eich in 1995.",
    "Rust was first released in 2015 by Mozilla.",
    "TypeScript was developed by Microsoft, first released in 2012.",
    "Go was designed at Google and released in 2009.",
]

# Create an in-memory vector store
vectorstore = Chroma.from_texts(
    texts=texts,
    embedding=embeddings,
    collection_name="languages",
)

# Search for similar documents
results = vectorstore.similarity_search("Who created Python?", k=2)
for doc in results:
    print(doc.page_content)
# "Python was created by Guido van Rossum in 1991."
# "Go was designed at Google and released in 2009."
```

### Persistent Chroma (survives restarts)

```python
# Save to disk
vectorstore = Chroma.from_texts(
    texts=texts,
    embedding=embeddings,
    persist_directory="./chroma_db",    # Saves here
    collection_name="my_docs",
)

# Load from disk later
vectorstore = Chroma(
    persist_directory="./chroma_db",
    embedding_function=embeddings,
    collection_name="my_docs",
)

results = vectorstore.similarity_search("Tell me about TypeScript")
```

### FAISS (fast, in-memory)

```bash
pip install faiss-cpu
```

```python
from langchain_community.vectorstores import FAISS

vectorstore = FAISS.from_texts(texts, embeddings)

# Save / load
vectorstore.save_local("faiss_index")
vectorstore = FAISS.load_local(
    "faiss_index", embeddings, allow_dangerous_deserialization=True
)
```

### Similarity search with scores

```python
results_with_scores = vectorstore.similarity_search_with_score(
    "Who made JavaScript?", k=3
)

for doc, score in results_with_scores:
    print(f"Score: {score:.4f} | {doc.page_content}")
```

---

## Step 5: Retrievers

A retriever wraps a vector store with the LangChain `Retriever` interface for use in chains.

```python
# Convert vector store to a retriever
retriever = vectorstore.as_retriever(
    search_type="similarity",     # or "mmr" for diversity
    search_kwargs={"k": 3},       # Return top 3
)

# Use it
docs = retriever.invoke("What year was Python created?")
for doc in docs:
    print(doc.page_content)
```

### MMR (Maximum Marginal Relevance) -- diverse results

```python
retriever = vectorstore.as_retriever(
    search_type="mmr",
    search_kwargs={
        "k": 4,
        "fetch_k": 10,     # Fetch 10, then pick 4 diverse ones
        "lambda_mult": 0.5, # 0 = max diversity, 1 = max relevance
    },
)
```

---

## Step 6: The RAG Chain

Now combine everything into a complete RAG pipeline.

```python
from dotenv import load_dotenv
load_dotenv()

from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain_chroma import Chroma

# --- Setup ---
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
model = ChatOpenAI(model="gpt-4o-mini", temperature=0)

# --- Load and store documents ---
documents = [
    "LangChain is a framework for building LLM applications. It provides tools for prompts, chains, agents, and retrieval.",
    "LCEL (LangChain Expression Language) uses the pipe operator to compose components. Example: prompt | model | parser.",
    "Agents in LangChain can use tools to interact with the outside world. They use the ReAct pattern: reason, act, observe.",
    "RAG stands for Retrieval Augmented Generation. It retrieves relevant documents and uses them as context for the LLM.",
    "Vector stores like Chroma and FAISS store document embeddings for fast similarity search.",
    "Memory in LangChain maintains conversation history. Options include buffer memory, window memory, and summary memory.",
    "Output parsers convert LLM text output into structured data. PydanticOutputParser validates against a schema.",
    "ChatPromptTemplate creates prompts with message roles. Use MessagesPlaceholder for dynamic conversation history.",
]

vectorstore = Chroma.from_texts(documents, embeddings)
retriever = vectorstore.as_retriever(search_kwargs={"k": 3})

# --- Build the chain ---
prompt = ChatPromptTemplate.from_messages([
    ("system", (
        "You are a helpful assistant that answers questions about LangChain. "
        "Use only the provided context to answer. If the context doesn't contain "
        "the answer, say 'I don't have enough information to answer that.'\n\n"
        "Context:\n{context}"
    )),
    ("human", "{question}"),
])

def format_docs(docs):
    """Join document contents with double newlines."""
    return "\n\n".join(doc.page_content for doc in docs)

rag_chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | prompt
    | model
    | StrOutputParser()
)

# --- Ask questions ---
questions = [
    "What is LCEL?",
    "How do agents work in LangChain?",
    "What is the capital of France?",  # Not in our documents
]

for q in questions:
    print(f"Q: {q}")
    answer = rag_chain.invoke(q)
    print(f"A: {answer}\n")
```

---

## Metadata Filtering

Filter documents by metadata before or during search.

```python
from langchain_core.documents import Document
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings

docs = [
    Document(
        page_content="Python 3.12 introduces faster startup times.",
        metadata={"language": "python", "version": "3.12", "year": 2024},
    ),
    Document(
        page_content="Node.js 20 is the current LTS version.",
        metadata={"language": "javascript", "version": "20", "year": 2023},
    ),
    Document(
        page_content="Python's match statement was added in 3.10.",
        metadata={"language": "python", "version": "3.10", "year": 2021},
    ),
    Document(
        page_content="Deno 2.0 brings backward compatibility with Node.js.",
        metadata={"language": "javascript", "version": "2.0", "year": 2024},
    ),
]

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
vectorstore = Chroma.from_documents(docs, embeddings)

# Filter: only Python documents
python_results = vectorstore.similarity_search(
    "What's new?",
    k=2,
    filter={"language": "python"},
)
for doc in python_results:
    print(f"[{doc.metadata['language']}] {doc.page_content}")

# Filter: only 2024 documents
recent_results = vectorstore.similarity_search(
    "Latest updates",
    k=2,
    filter={"year": 2024},
)
```

---

## Complete RAG System Example

```python
"""
complete_rag.py -- A full RAG system that indexes local files
and answers questions about them.
"""
from dotenv import load_dotenv
load_dotenv()

import os
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma

# === INDEXING PIPELINE ===

def build_vectorstore(docs_dir: str, persist_dir: str = "./rag_db") -> Chroma:
    """Load documents, split, embed, and store."""

    # Load
    loader = DirectoryLoader(docs_dir, glob="**/*.txt", loader_cls=TextLoader)
    documents = loader.load()
    print(f"Loaded {len(documents)} documents")

    # Split
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
    )
    chunks = splitter.split_documents(documents)
    print(f"Split into {len(chunks)} chunks")

    # Embed and store
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
    vectorstore = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory=persist_dir,
    )
    print(f"Stored in {persist_dir}")
    return vectorstore


# === QUERY PIPELINE ===

def build_rag_chain(vectorstore: Chroma):
    """Build the RAG chain."""
    retriever = vectorstore.as_retriever(search_kwargs={"k": 4})
    model = ChatOpenAI(model="gpt-4o-mini", temperature=0)

    prompt = ChatPromptTemplate.from_messages([
        ("system", (
            "Answer the question based on the context below. "
            "If you cannot find the answer, say so. "
            "Cite the source file when possible.\n\n"
            "Context:\n{context}"
        )),
        ("human", "{question}"),
    ])

    def format_docs(docs):
        formatted = []
        for doc in docs:
            source = doc.metadata.get("source", "unknown")
            formatted.append(f"[Source: {source}]\n{doc.page_content}")
        return "\n\n---\n\n".join(formatted)

    chain = (
        {"context": retriever | format_docs, "question": RunnablePassthrough()}
        | prompt
        | model
        | StrOutputParser()
    )
    return chain


# === MAIN ===

if __name__ == "__main__":
    # First run: build the index
    if not os.path.exists("./rag_db"):
        vectorstore = build_vectorstore("./data/docs/")
    else:
        # Subsequent runs: load existing index
        embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
        vectorstore = Chroma(
            persist_directory="./rag_db",
            embedding_function=embeddings,
        )

    chain = build_rag_chain(vectorstore)

    # Interactive Q&A loop
    print("\nRAG System Ready! Ask questions (type 'quit' to exit)")
    print("=" * 50)

    while True:
        question = input("\nQ: ").strip()
        if question.lower() in ("quit", "exit", "q"):
            break

        answer = chain.invoke(question)
        print(f"\nA: {answer}")
```

---

## Practice Exercises

### Exercise 1: Build a documentation Q&A system
Download or create 5-10 text files about a topic you know well (or copy some documentation pages). Build a complete RAG pipeline that can answer questions about them. Test with at least 10 questions, including some that are NOT covered by your documents (to test the "I don't know" behavior).

### Exercise 2: Chunk size experiment
Take the same set of documents and build three different vector stores with chunk sizes of 200, 500, and 1000 characters. For each, ask the same 5 questions and compare the answers. Which chunk size gives the best results? Why?

### Exercise 3: PDF RAG
Use `PyPDFLoader` to load a PDF document. Split it, embed it, and build a RAG chain. Ask questions and verify that answers include the correct page numbers from metadata.

### Exercise 4: Web page RAG
Use `WebBaseLoader` to scrape 3-5 related web pages (e.g., documentation pages). Build a RAG system over them. Include source URLs in the answers.

### Exercise 5: Metadata-filtered RAG
Create a document collection with metadata tags (e.g., category, date, author). Build a RAG chain that accepts both a question and a metadata filter. Test queries like "What did author X write about topic Y?" using metadata filtering.

### Exercise 6: RAG evaluation
For your RAG system, create a test set of 10 question-answer pairs where you know the correct answer. Run your chain on all 10, compare with expected answers, and calculate a simple accuracy score. Which questions does it get wrong, and why?

```python
test_cases = [
    {"question": "Who created Python?", "expected": "Guido van Rossum"},
    {"question": "When was Python first released?", "expected": "1991"},
    # ... more test cases
]

correct = 0
for tc in test_cases:
    answer = chain.invoke(tc["question"])
    if tc["expected"].lower() in answer.lower():
        correct += 1
        print(f"PASS: {tc['question']}")
    else:
        print(f"FAIL: {tc['question']}")
        print(f"  Expected: {tc['expected']}")
        print(f"  Got: {answer[:100]}")

print(f"\nAccuracy: {correct}/{len(test_cases)}")
```
