# RAG — Retrieval-Augmented Generation

🟡 Intermediate

## Kya hota hai, aur ye chapter kyu zaruri hai?

Socho tumne apni company ka ek internal chatbot banaya — koi employee usse pucha "hamari leave policy kya hai?" ya "last quarter ka refund process kya tha?". LLM (GPT-4o-mini ho ya Claude) ko ye cheezein **pata hi nahi** — kyunki:

1. Ye tumhari company ka **private data** hai — LLM ko kabhi train hi nahi kiya gaya iss par.
2. LLM ka training data ek **cutoff date** tak hi hai — aaj ki news, aaj ka stock price, kal ka product launch — kuch nahi pata.
3. LLM **fine-tune** karna — apna khud ka model retrain karna — mehenga hai, slow hai, aur har baar data update hone par dobara karna padega.

Ab socho Swiggy ka customer support agent hai. Customer pucha: "mera order #48291 kaha hai?" — LLM ko ye order-specific data kabhi nahi malum hoga, chahe woh duniya ka sabse smart model ho. LLM sirf wahi jaanta hai jo usko **training** mein dikhaya gaya tha — aur woh bhi ek fixed snapshot hai, real-time nahi.

Yahi exact problem **RAG (Retrieval-Augmented Generation)** solve karta hai. Idea simple hai:

> Model ko **closed-book exam** dene ke bajaye, usse **open-book exam** do. Question ke saath-saath relevant reference material bhi de do — model sirf usi material ko padh kar answer likhega.

```
User question
    ↓
Question ko embed karo → Vector store mein search karo → Relevant chunks nikalo
    ↓
"Is context ko use karke answer do: {chunks}"
    ↓
LLM apna answer deta hai — apne "training memory" se nahi, balki
tumhare diye gaye REAL data se grounded
```

RAG ka naam hi teen steps se bana hai:
- **Retrieve** — apne data se relevant pieces dhundo
- **Augment** — LLM ke prompt mein woh pieces context ke tor pe daal do
- **Generate** — LLM us context ko use karke answer generate kare

> [!info]
> Is chapter mein hum poori RAG pipeline banayenge: document loaders → text splitters → embeddings → vector stores → retrievers → LCEL chain → aur last mein **agentic RAG**, jaha retrieval khud ek tool ban jaata hai jise agent apni marzi se call karta hai.

---

## Kyun RAG — sab kuch prompt mein kyu nahi daal dete?

Naya developer soch sakta hai: "bhai simple hai, poora document hi prompt mein paste kar do, LLM khud padh lega." Ye chhote documents ke liye chalta hai, lekin production mein fail hota hai kyunki:

| Problem | Explanation |
|---|---|
| **Context window limit** | GPT-4o-mini ho ya koi bhi model — ek fixed max token limit hoti hai. Tumhari company ke 10,000 pages ke docs kabhi ek prompt mein nahi aayenge. |
| **Cost** | Har token paisa hai. Agar tum har query ke saath poora knowledge base bhejte ho, bill aasman chhoo lega. |
| **Relevance / Noise** | Agar tum 500 pages bhej do jab sirf 1 paragraph relevant tha, model confuse ho sakta hai ya galat cheez pe focus kar sakta hai ("lost in the middle" problem). |
| **Freshness** | Naya document add karna hai? RAG mein bas usko index kar do. Fine-tuning mein poora model retrain karna padta. |
| **Hallucination** | Jab model ke paas real grounding data hota hai, woh cheezein "banane" (hallucinate karne) ki possibility kam ho jaati hai. |

> [!tip]
> RAG vs Fine-tuning: RAG use karo jab tumhe **knowledge** update karni ho (facts, docs, policies). Fine-tuning tab use karo jab tumhe model ka **behavior/style/format** change karna ho. Zyadatar production agents dono ka combination bhi use karte hain, lekin RAG hamesha cheaper aur faster starting point hota hai.

---

## Poora RAG Pipeline — Bird's Eye View

RAG do alag phases mein chalta hai — pehla ek baar (ya periodically) hota hai, doosra har query pe:

```
INDEXING PHASE (ek baar / periodically):
Documents → Load → Split → Embed → Vector DB mein store karo

QUERY PHASE (har user question pe):
User Query → Embed → Similarity Search → Relevant Chunks
                                            ↓
                        Prompt + Context → LLM → Answer
```

Chalo isko step-by-step banate hain — real, runnable code ke saath.

---

## Step 1: Document Loaders — Data Andar Laana

Document loaders tumhare raw data (files, PDFs, web pages, CSVs, database rows — kuch bhi) ko LangChain ke standard `Document` object mein convert karte hain.

```python
from langchain_core.documents import Document

# Document bas do cheezein rakhta hai: text + metadata
doc = Document(
    page_content="Ye actual text content hai.",
    metadata={"source": "my_file.txt", "page": 1},
)
```

Socho `metadata` ko ek **shipping label** ki tarah — text ke saath ye batata hai "ye kaha se aaya", "kis page pe tha", "kis author ne likha" — baad mein filtering aur citation ke liye kaam aata hai.

### TextLoader — Plain Text Files

```python
from langchain_community.document_loaders import TextLoader

loader = TextLoader("data/notes.txt", encoding="utf-8")
documents = loader.load()

print(len(documents))              # 1 document
print(documents[0].page_content)   # File ka content
print(documents[0].metadata)       # {"source": "data/notes.txt"}
```

### PyPDFLoader — PDF Files

```bash
pip install pypdf
```

```python
from langchain_community.document_loaders import PyPDFLoader

loader = PyPDFLoader("data/report.pdf")
documents = loader.load()  # Ek Document per page

for doc in documents:
    print(f"Page {doc.metadata['page']}: {doc.page_content[:100]}...")
```

### WebBaseLoader — Web Pages

```bash
pip install beautifulsoup4
```

```python
from langchain_community.document_loaders import WebBaseLoader

loader = WebBaseLoader("https://docs.python.org/3/tutorial/introduction.html")
documents = loader.load()

print(documents[0].page_content[:200])
```

### DirectoryLoader — Ek Poore Folder Ko Load Karna

```python
from langchain_community.document_loaders import DirectoryLoader, TextLoader

loader = DirectoryLoader(
    "data/docs/",
    glob="**/*.txt",        # File pattern
    loader_cls=TextLoader,   # Har file ke liye konsa loader use kare
    show_progress=True,
)
documents = loader.load()
print(f"Loaded {len(documents)} documents")
```

### CSVLoader — Spreadsheet Data

```python
from langchain_community.document_loaders import CSVLoader

loader = CSVLoader("data/products.csv")
documents = loader.load()
# Har row ek Document ban jaati hai
```

> [!info]
> LangChain mein 100+ document loaders available hain — Notion, Google Drive, Slack, S3, YouTube transcripts, SQL databases, sab ke liye. Pattern hamesha same hai: `loader.load()` → `list[Document]` milta hai. Jab bhi koi naya data source connect karna ho, pehle check karo kya uske liye ek loader already exist karta hai.

---

## Step 2: Text Splitters — Bade Documents Ko Chunks Mein Todna

Ek poora PDF ya article ek hi embedding vector mein daalna practical nahi hai — na context window mein fit hoga, na search precise hogi (agar poora 50-page document ek chunk hai, toh "similarity search" bilkul useless ho jaayegi). Isliye documents ko chhote, **overlapping** chunks mein todna padta hai.

Socho ise **dabbawala** ki tarah — ek poora tiffin carrier (poora document) delivery ke liye impractical hai; usse alag-alag dabbe (chunks) mein baant do, taaki har dabba independently deliver ho sake, lekin thoda overlap rahe taaki context na khoye.

### RecursiveCharacterTextSplitter — Default Choice

```python
from langchain_text_splitters import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,       # Har chunk mein max characters
    chunk_overlap=200,     # Chunks ke beech overlap (boundary pe context na khoye isliye)
    length_function=len,   # Length kaise measure kare
    separators=["\n\n", "\n", ". ", " ", ""],  # Split karne ki priority order
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

**Ye kaam kaise karta hai?** Splitter pehle `\n\n` (paragraph breaks) se todne ki koshish karta hai. Agar chunk phir bhi bada hai, `\n` (line breaks) try karta hai. Phir `. ` (sentences), phir spaces, phir last resort mein character-by-character. Ye "recursive" naam isi se aaya — priority list ke through recursively try karta hai jab tak chunk size fit na ho jaaye.

`chunk_overlap=200` kyun zaruri hai? Socho sentence boundary pe hi cut lag gaya aur important info do chunks mein split ho gayi — overlap ensure karta hai ki dono chunks mein thoda shared context rahe, taaki retrieval ke time koi bhi chunk standalone samajh mein aaye.

### Documents Ko Split Karna (Metadata Preserve Hoti Hai)

```python
from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

loader = TextLoader("data/article.txt")
documents = loader.load()

splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
chunks = splitter.split_documents(documents)

# Har chunk abhi bhi ek Document hai, apne metadata ke saath
for chunk in chunks:
    print(f"Source: {chunk.metadata['source']}, Length: {len(chunk.page_content)}")
```

### Token-Based Splitter — LLM Ke Liye Zyada Accurate

Characters aur tokens same nahi hote (roughly 4 characters ≈ 1 token English mein). Agar tumhe exact token budget match karna hai model ki context window ke hisaab se, token-based splitter use karo.

```bash
pip install tiktoken
```

```python
from langchain_text_splitters import TokenTextSplitter

splitter = TokenTextSplitter(
    chunk_size=256,        # Tokens mein, characters mein nahi
    chunk_overlap=32,
    model_name="gpt-4o-mini",
)

chunks = splitter.split_text(long_text)
```

### Code Splitter — Language-Aware

Agar tum code documentation ya codebase index kar rahe ho, ek generic character splitter function ko beech mein kaat sakta hai. Language-aware splitter function/class boundaries samajhta hai.

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

> [!warning]
> **Common mistake**: `chunk_size` bahut chhota rakhna (jaise 100 chars) — isse context itna fragment ho jaata hai ki har chunk apne aap mein meaningless ho jaata hai. Aur bahut bada rakhna (jaise 5000 chars) — retrieval imprecise ho jaati hai, aur irrelevant content bhi context mein aa jaata hai. 500–1000 characters (ya 200–400 tokens) ek acha starting point hai — phir apne data pe experiment karke tune karo.

---

## Step 3: Embeddings — Text Ko Numbers Mein Convert Karna

Embeddings text ko ek **numerical vector** (numbers ki list) mein convert karte hain jo uska **semantic meaning** capture karta hai. Similar meaning wale texts, similar vectors produce karte hain — chahe words bilkul alag ho.

Socho ye Google Maps ki coordinates ki tarah — "Bandra" aur "Andheri" dono Mumbai mein hai, toh unki coordinates paas-paas hongi. "Bandra" aur "Connaught Place" door hai (Mumbai vs Delhi), toh coordinates bhi door honge. Embeddings bhi text ko ek "meaning space" mein place karte hain — jahan similar-meaning texts paas-paas hote hain.

### OpenAI Embeddings

```python
from langchain_openai import OpenAIEmbeddings

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

# Ek single text embed karo
vector = embeddings.embed_query("What is Python?")
print(f"Vector dimension: {len(vector)}")  # 1536
print(f"First 5 values: {vector[:5]}")

# Multiple texts embed karo (indexing ke time zyada efficient)
texts = ["Python is great", "JavaScript is popular", "Rust is fast"]
vectors = embeddings.embed_documents(texts)
print(f"Got {len(vectors)} vectors")
```

> [!info]
> `embed_query()` vs `embed_documents()` — dono same kaam karte hain (text → vector), lekin alag method isliye hain kyunki kuch embedding models query aur documents ko thoda differently treat karte hain (asymmetric embeddings). Convention follow karo: user ke question ke liye `embed_query`, indexing ke time documents ke liye `embed_documents`.

### HuggingFace Embeddings — Free, Local

Agar tum API cost avoid karna chahte ho ya data external server pe bhejna nahi chahte (compliance reasons se), local embeddings use karo:

```bash
pip install sentence-transformers
```

```python
from langchain_community.embeddings import HuggingFaceEmbeddings

embeddings = HuggingFaceEmbeddings(
    model_name="all-MiniLM-L6-v2",  # Free, locally chalta hai
)

vector = embeddings.embed_query("What is Python?")
print(f"Vector dimension: {len(vector)}")  # 384
```

### Similarity Kaise Kaam Karti Hai — Cosine Similarity

Do vectors kitne "similar" hain, ye measure karne ka standard tarika **cosine similarity** hai — dono vectors ke beech ka angle. Angle jitna chhota, similarity utni zyada (1.0 = identical direction, 0 = unrelated, -1 = opposite).

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

Yahi ganit vector stores ke andar automatically hota hai jab tum similarity search call karte ho — lekin manually samajh lena helpful hai, kyunki debugging ke time "kyun ye wrong chunk retrieve hua" jaisi problems isi similarity score se trace hoti hain.

---

## Step 4: Vector Stores — Embeddings Ko Store Aur Search Karna

Vector store ek database hai jo specifically embedding vectors store karne aur unme fast similarity search karne ke liye optimize hai. Traditional SQL database mein `WHERE` clause exact match dhundta hai — vector store "meaning ke hisaab se sabse paas kaun hai" dhundta hai.

### Chroma — Local, Development Ke Liye Best

```bash
pip install langchain-chroma
```

```python
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

texts = [
    "Python was created by Guido van Rossum in 1991.",
    "JavaScript was created by Brendan Eich in 1995.",
    "Rust was first released in 2015 by Mozilla.",
    "TypeScript was developed by Microsoft, first released in 2012.",
    "Go was designed at Google and released in 2009.",
]

# In-memory vector store banao
vectorstore = Chroma.from_texts(
    texts=texts,
    embedding=embeddings,
    collection_name="languages",
)

# Similar documents search karo
results = vectorstore.similarity_search("Who created Python?", k=2)
for doc in results:
    print(doc.page_content)
# "Python was created by Guido van Rossum in 1991."
# "Go was designed at Google and released in 2009."
```

### Persistent Chroma — Restart Ke Baad Bhi Bacha Rahe

```python
# Disk pe save karo
vectorstore = Chroma.from_texts(
    texts=texts,
    embedding=embeddings,
    persist_directory="./chroma_db",    # Yaha save hoga
    collection_name="my_docs",
)

# Baad mein disk se load karo
vectorstore = Chroma(
    persist_directory="./chroma_db",
    embedding_function=embeddings,
    collection_name="my_docs",
)

results = vectorstore.similarity_search("Tell me about TypeScript")
```

### FAISS — Fast, In-Memory

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

### Scores Ke Saath Similarity Search

```python
results_with_scores = vectorstore.similarity_search_with_score(
    "Who made JavaScript?", k=3
)

for doc, score in results_with_scores:
    print(f"Score: {score:.4f} | {doc.page_content}")
```

> [!tip]
> **Production mein konsa vector store?** Development/prototyping ke liye Chroma ya FAISS bilkul theek hai. Production scale (millions of documents, high QPS, multi-tenancy) ke liye managed solutions dekho — Pinecone, Weaviate, Qdrant, ya Postgres ke saath `pgvector` extension. Concept same rehta hai, sirf backend badalta hai — LangChain ka interface (`as_retriever()`, `similarity_search()`) sab jagah consistent hai.

---

## Step 5: Retrievers — Chains Ke Andar Plug Karne Ke Liye

Vector store apne aap mein ek raw database hai. **Retriever** usko LangChain ke standard interface mein wrap karta hai — taaki tum ise directly LCEL chains mein pipe kar sako.

```python
# Vector store ko retriever mein convert karo
retriever = vectorstore.as_retriever(
    search_type="similarity",     # ya "mmr" diversity ke liye
    search_kwargs={"k": 3},       # Top 3 return karo
)

# Use karo
docs = retriever.invoke("What year was Python created?")
for doc in docs:
    print(doc.page_content)
```

Retriever ek `Runnable` hai — matlab isse `.invoke()`, `.batch()`, `.stream()` sab milta hai, aur ise `|` operator se doosre components ke saath chain kar sakte ho (agla section dekho).

### MMR (Maximum Marginal Relevance) — Diverse Results

Plain similarity search kabhi-kabhi ek hi tarah ke redundant chunks return kar deta hai (5 chunks jo saare basically same baat keh rahe hain). MMR ek balance banata hai relevance aur diversity ke beech.

```python
retriever = vectorstore.as_retriever(
    search_type="mmr",
    search_kwargs={
        "k": 4,
        "fetch_k": 10,      # 10 fetch karo, phir 4 diverse pick karo
        "lambda_mult": 0.5,  # 0 = max diversity, 1 = max relevance
    },
)
```

Kab use karo? Jab tumhare knowledge base mein bahut saare similar/duplicate documents hain aur tum chahte ho ki context different perspectives cover kare, sirf ek hi angle repeat na ho.

### Metadata Filtering — Search Ko Narrow Karna

Kabhi-kabhi tumhe sirf ek subset of documents mein search karni hoti hai — jaise sirf "Python" tagged docs, ya sirf 2024 ke docs.

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

# Filter: sirf Python documents
python_results = vectorstore.similarity_search(
    "What's new?",
    k=2,
    filter={"language": "python"},
)
for doc in python_results:
    print(f"[{doc.metadata['language']}] {doc.page_content}")

# Filter: sirf 2024 documents
recent_results = vectorstore.similarity_search(
    "Latest updates",
    k=2,
    filter={"year": 2024},
)
```

Ye Flipkart ke product search jaisa hai — pehle "brand: Samsung" aur "price < 20000" filter laga do, phir usi subset mein relevance-based ranking karo.

---

## Step 6: Complete LCEL RAG Chain

Ab sab kuch jodte hain — ek complete, production-style RAG chain jo LCEL (LangChain Expression Language) ke pipe operator use karke banti hai. (Agar LCEL naya lag raha hai, chapter 5 "Chains and LCEL" revisit karo.)

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

# --- Documents load aur store karo ---
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

# --- Chain banao ---
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
    """Document contents ko double newlines se jodo."""
    return "\n\n".join(doc.page_content for doc in docs)

rag_chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | prompt
    | model
    | StrOutputParser()
)

# --- Questions pucho ---
questions = [
    "What is LCEL?",
    "How do agents work in LangChain?",
    "What is the capital of France?",  # Humare documents mein nahi hai
]

for q in questions:
    print(f"Q: {q}")
    answer = rag_chain.invoke(q)
    print(f"A: {answer}\n")
```

**Ye chain kaise kaam karti hai, line by line:**

1. `{"context": retriever | format_docs, "question": RunnablePassthrough()}` — ye ek dict-mapping Runnable hai. Jab tum `rag_chain.invoke("What is LCEL?")` karte ho, LangChain **parallel** mein dono branches chalata hai:
   - `retriever | format_docs` — question ko retriever ko pass karta hai, jo relevant `Document` objects return karta hai, phir `format_docs` unhe ek string mein jod deta hai
   - `RunnablePassthrough()` — original question ko as-is aage bhej deta hai
2. Output ek dict banta hai: `{"context": "...", "question": "What is LCEL?"}`
3. Ye dict `prompt` template mein jaata hai, jo `{context}` aur `{question}` placeholders ko fill karta hai
4. Filled prompt `model` ko jaata hai — LLM apna answer generate karta hai, sirf diye gaye context ke base pe
5. `StrOutputParser()` `AIMessage` ko plain string mein convert kar deta hai

> [!tip]
> Ye "sirf context use karo, warna 'I don't know' bolo" wala system prompt instruction **critical** hai. Isके bina LLM apni training memory se answer bana sakta hai (hallucination) chahe context mein woh info na ho. Har production RAG system mein ye guardrail explicitly likho.

---

## Complete Real-World Example: Ek File-Based RAG System

Ab ek full end-to-end system banate hain jo local `.txt` files index karta hai aur ek interactive Q&A loop chalata hai — indexing aur querying dono properly separate karte hue.

```python
"""
complete_rag.py -- Ek complete RAG system jo local files index karta hai
aur unke baare mein questions answer karta hai.
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
    """Documents load karo, split karo, embed karo, aur store karo."""

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

    # Embed aur store
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
    """RAG chain banao."""
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
    # Pehli baar chalane pe: index banao
    if not os.path.exists("./rag_db"):
        vectorstore = build_vectorstore("./data/docs/")
    else:
        # Baad ke runs mein: existing index load karo
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

Notice karo: indexing sirf **ek baar** chalti hai (`if not os.path.exists("./rag_db")`) — production mein tum ye ek separate cron job / pipeline mein karoge, jo tumhare docs update hone par re-index kare. Query time pe tum sirf existing store load karte ho — fast aur cheap.

---

## Agentic RAG — Retrieval Ko Ek Tool Banana

Ab tak humne "static" RAG dekha — har query ke liye hamesha retrieve karo, phir generate karo. Lekin real agents mein ye rigid hai:

- Har question ko retrieval ki zaroorat nahi hoti ("2+2 kya hai?" ke liye vector search waste hai)
- Kabhi-kabhi agent ko **multiple baar** retrieve karna padta hai (pehle ek cheez search karo, uske answer se ek doosra search query banao)
- Kabhi-kabhi agent ko decide karna hota hai **kis knowledge base** se retrieve kare (HR docs vs engineering docs vs product docs)

Isi wajah se production-grade systems mein retrieval ko ek **tool** bana diya jaata hai — jaise chapter 7 mein humne calculator ya weather API ko tool banaya tha. Agent khud decide karta hai "is question ke liye mujhe retrieval tool call karna chahiye ya nahi", aur zaroorat pade toh multiple baar bhi call kar sakta hai.

```
Traditional RAG:  Query → HAMESHA retrieve → generate
Agentic RAG:      Query → Agent SOCHTA hai "kya mujhe retrieve karna chahiye?"
                        → agar haan: retriever tool call karo → result dekho
                        → zaroorat pade toh phir se search karo (reformulated query)
                        → jab kaafi info mil jaaye: final answer generate karo
```

### Retriever Ko Tool Mein Convert Karna

LangChain retriever ko ek tool banane ka easiest tarika `create_retriever_tool` helper hai:

```python
from langchain.tools.retriever import create_retriever_tool

retriever_tool = create_retriever_tool(
    retriever,
    name="search_langchain_docs",
    description=(
        "LangChain concepts, LCEL, agents, aur RAG ke baare mein documentation "
        "search karne ke liye use karo. Jab bhi user LangChain-specific "
        "features ke baare mein pooche, is tool ko call karo."
    ),
)
```

`description` yaha **sabse zaroori part** hai — agent isi description ko padh kar decide karta hai "abhi is tool ko call karna chahiye ya nahi". Isko as specific likho jitna ho sake, jaise tum ek naye team member ko explain kar rahe ho ki ye tool kab use karna hai.

### LangGraph Ke Saath Poora Agentic RAG Agent

Chapter 8 mein humne `create_react_agent` se apna pehla agent banaya tha. Retrieval tool ko wahi pattern follow karke plug karte hain:

```python
from dotenv import load_dotenv
load_dotenv()

from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_chroma import Chroma
from langchain.tools.retriever import create_retriever_tool
from langgraph.prebuilt import create_react_agent

# --- Knowledge base banao (indexing phase) ---
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
documents = [
    "LangChain is a framework for building LLM applications.",
    "LCEL uses the pipe operator: prompt | model | parser.",
    "RAG retrieves relevant documents and uses them as LLM context.",
    "LangGraph lets you build agents as stateful graphs with nodes and edges.",
]
vectorstore = Chroma.from_texts(documents, embeddings)
retriever = vectorstore.as_retriever(search_kwargs={"k": 2})

# --- Retriever ko tool banao ---
retriever_tool = create_retriever_tool(
    retriever,
    name="search_langchain_docs",
    description="LangChain aur LangGraph concepts ke baare mein search karne ke liye use karo.",
)

# --- Agent banao, retriever tool ke saath ---
model = ChatOpenAI(model="gpt-4o-mini", temperature=0)
agent = create_react_agent(model, tools=[retriever_tool])

# --- Agent chalao ---
response = agent.invoke({
    "messages": [("human", "What is LCEL and how does it relate to RAG?")]
})

for message in response["messages"]:
    message.pretty_print()
```

Yaha agent khud decide karta hai:
1. Question padhta hai — "isme LangChain-specific info chahiye"
2. `search_langchain_docs` tool ko call karta hai (retrieval yaha hoti hai)
3. Retrieved chunks ko dekhta hai
4. Agar zaroorat lage, dusra search bhi kar sakta hai (jaise "LCEL" pehle search kiya, phir "RAG" alag se)
5. Sab info combine karke final answer deta hai

### Custom LangGraph Node Se Agentic RAG (More Control)

Agar tumhe zyada control chahiye — jaise retrieval ke baad ek "grading" step jo check kare ki retrieved docs actually relevant hain ya nahi (ye **Corrective RAG / Self-RAG** pattern kehlaata hai) — tum apna khud ka graph bana sakte ho:

```python
from typing import TypedDict, Annotated
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langchain_core.messages import HumanMessage, SystemMessage

class RAGState(TypedDict):
    messages: Annotated[list, add_messages]
    context: str

def retrieve_node(state: RAGState) -> dict:
    """User ke last message se relevant docs retrieve karo."""
    question = state["messages"][-1].content
    docs = retriever.invoke(question)
    context = "\n\n".join(doc.page_content for doc in docs)
    return {"context": context}

def generate_node(state: RAGState) -> dict:
    """Retrieved context use karke answer generate karo."""
    question = state["messages"][-1].content
    system_msg = SystemMessage(content=(
        f"Answer using only this context:\n\n{state['context']}\n\n"
        "If the context doesn't have the answer, say so clearly."
    ))
    response = model.invoke([system_msg, HumanMessage(content=question)])
    return {"messages": [response]}

graph = StateGraph(RAGState)
graph.add_node("retrieve", retrieve_node)
graph.add_node("generate", generate_node)
graph.set_entry_point("retrieve")
graph.add_edge("retrieve", "generate")
graph.add_edge("generate", END)

rag_graph = graph.compile()

result = rag_graph.invoke({
    "messages": [HumanMessage(content="What is RAG?")],
    "context": "",
})
print(result["messages"][-1].content)
```

Ye approach chapter 12–17 mein detail mein cover hoga (LangGraph state graphs, conditional edges) — abhi bas itna samajh lo ki retrieval ek **graph node** ban sakta hai, jisse tum beech mein grading, re-querying, ya multiple retrievers jaisi complex logic daal sakte ho.

> [!info]
> **Traditional RAG vs Agentic RAG — kab kya use karo?**
> - Traditional (fixed) RAG: simple Q&A bots, jaha har query ko retrieval chahiye hi chahiye — fast, predictable, cheap (ek hi LLM call)
> - Agentic RAG: complex assistants jaha kabhi retrieval chahiye kabhi nahi, ya multiple knowledge sources hain, ya multi-hop reasoning chahiye ("pehle X dhundo, uske result se Y dhundo") — flexible lekin slower aur costlier (multiple LLM calls)

---

## Conversational RAG — Chat History Ke Saath

Real chatbots mein follow-up questions aate hain: "LCEL kya hai?" ke baad "iska syntax dikhao" — yaha "iska" ka reference pichle message se hai. Agar tum seedha "iska syntax dikhao" ko retriever mein bhejoge, embedding useless hogi (koi context nahi hai kis cheez ka syntax).

Solution: ek **history-aware retriever** — pehle chat history dekh kar question ko "standalone" bana lo, phir retrieve karo.

```python
from langchain.chains import create_history_aware_retriever
from langchain_core.prompts import MessagesPlaceholder

contextualize_prompt = ChatPromptTemplate.from_messages([
    ("system", (
        "Given the chat history and the latest user question, rephrase it "
        "into a standalone question that can be understood without the chat "
        "history. Do NOT answer the question, just reformulate it if needed."
    )),
    MessagesPlaceholder("chat_history"),
    ("human", "{input}"),
])

history_aware_retriever = create_history_aware_retriever(
    model, retriever, contextualize_prompt
)
```

Ye ek chhota LLM call hai jo purely question ko "rewrite" karta hai — jaise ek smart receptionist jo tumhara adha-adhura sentence sunke poora context samajh kar aage forward karta hai.

---

## RAG Quality Improve Karne Ke Techniques

| Technique | Kya karta hai | Kab use karo |
|---|---|---|
| **Reranking** | Retriever se top-k (jaise 20) docs nikalo, phir ek dedicated reranker model (Cohere Rerank, cross-encoder) se unhe re-score karo aur top 3-5 rakho | Jab similarity search "close enough" results deta hai lekin best result top pe nahi aata |
| **Hybrid search** | Semantic (vector) search + keyword (BM25) search dono combine karo | Jab exact keyword/proper-noun matches bhi important hain (jaise product codes, error codes) |
| **Query expansion** | User ke question ko LLM se multiple phrasings mein rewrite karo, sabke results merge karo | Jab user ka phrasing knowledge base ke phrasing se match nahi karta |
| **Parent-document retrieval** | Chhoti chunks pe search karo (precise), lekin unke bade parent chunk ko context mein bhejo (richer) | Jab chhote chunks search ke liye acche hain par LLM ko zyada surrounding context chahiye |
| **Contextual chunking** | Har chunk mein ek chhota LLM-generated summary prepend karo taaki chunk apne aap mein self-contained ho | Long, complex documents jaha chunks context ke bina ambiguous ban jaate hain |

> [!warning]
> **Common gotchas jo production RAG mein baar-baar dikhte hain:**
> 1. **Chunk size galat** — bahut chhota toh context fragment, bahut bada toh irrelevant noise. Experiment karke tune karo (Exercise 2 dekho).
> 2. **`k` (retrieved docs count) bahut kam** — sirf top-1 doc retrieve karoge toh miss karne ka risk zyada. Zyada common: `k=3` se `k=6`.
> 3. **Embedding model mismatch** — indexing time pe ek embedding model use kiya, query time pe doosra — vectors compare hi nahi ho payenge properly. Hamesha same model consistently use karo.
> 4. **Stale index** — documents update hue lekin vector store re-index nahi kiya. Production mein re-indexing pipeline automate karo.
> 5. **No "I don't know" guardrail** — system prompt mein explicitly na likha ho ki context na milne pe kya kare, toh model hallucinate karega confidently.
> 6. **Cost blind spot** — har query pe embedding + retrieval + generation — teeno ka cost track karo, especially agentic RAG mein jaha multiple LLM calls ho sakte hain ek hi user question ke liye.

---

## RAG Evaluation — Kaise Pata Chale Ki Ye Kaam Kar Raha Hai?

Production mein deploy karne se pehle, apne RAG system ko systematically test karo:

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

Production-grade evaluation mein tum aur do cheezein bhi measure karoge:
- **Retrieval quality**: kya retrieved chunks actually relevant the? (precision/recall against a "golden" chunk set)
- **Faithfulness/Groundedness**: kya answer sirf retrieved context se aaya, ya model ne kuch bana diya? (LLM-as-judge se check karte hain — ye chapter 23 "Testing AI Agents" mein detail mein aayega)

---

## Practice Exercises

### Exercise 1: Documentation Q&A System
5-10 text files banao (ya copy karo) ek topic pe jo tumhe achhe se aata hai. Ek complete RAG pipeline banao jo unke baare mein questions answer kare. Kam se kam 10 questions test karo, kuch aise bhi jo documents mein NAHI cover hue (taaki "I don't know" behavior test ho).

### Exercise 2: Chunk Size Experiment
Same documents pe teen alag vector stores banao — chunk sizes 200, 500, aur 1000 characters ke saath. Har ek pe same 5 questions pucho aur answers compare karo. Konsa chunk size best result deta hai? Kyun?

### Exercise 3: PDF RAG
`PyPDFLoader` use karke ek PDF load karo. Split karo, embed karo, aur RAG chain banao. Questions pucho aur verify karo ki answers mein correct page numbers metadata se aa rahe hain.

### Exercise 4: Web Page RAG
`WebBaseLoader` use karke 3-5 related web pages scrape karo (jaise documentation pages). Unpar RAG system banao. Answers mein source URLs include karo.

### Exercise 5: Metadata-Filtered RAG
Ek document collection banao metadata tags ke saath (category, date, author). Ek RAG chain banao jo question aur metadata filter dono accept kare. Test karo "author X ne topic Y ke baare mein kya likha?" jaisi queries metadata filtering ke saath.

### Exercise 6: RAG Evaluation
Apne RAG system ke liye 10 question-answer pairs ka test set banao jaha tumhe correct answer pata ho. Chain ko saare 10 pe chalao, expected answers se compare karo, aur ek simple accuracy score calculate karo. Konse questions galat aate hain, aur kyun?

### Exercise 7: Agentic RAG
`create_retriever_tool` aur `create_react_agent` use karke apna knowledge base ko ek tool-using agent mein convert karo. Ek aisa question pucho jisme retrieval ki zaroorat nahi ("2+2 kitna hai?") aur observe karo ki agent tool call karta hai ya nahi. Phir ek multi-hop question design karo jisme agent ko do baar retrieve karna pade.

---

## Key Takeaways

- **RAG** = Retrieve (apne data se relevant info dhundo) + Augment (LLM prompt mein daalo) + Generate (grounded answer banwao) — ye LLM ko "open-book exam" deta hai.
- RAG fine-tuning se **cheaper aur faster** hai jab goal knowledge update karna ho, na ki model ka behavior/style change karna.
- Pipeline do phases mein chalti hai: **indexing** (load → split → embed → store, ek baar) aur **query** (embed question → search → generate, har request pe).
- **Document loaders** raw data ko `Document` objects mein laate hain; **text splitters** (jaise `RecursiveCharacterTextSplitter`) bade documents ko overlapping chunks mein todte hain.
- **Embeddings** text ko vectors mein convert karte hain jaha similar-meaning text, similar vectors banata hai — cosine similarity se compare hota hai.
- **Vector stores** (Chroma, FAISS, Pinecone, etc.) embeddings store karte hain aur fast similarity search karte hain; **retrievers** unhe LCEL-compatible `Runnable` interface dete hain.
- LCEL RAG chain ka standard pattern: `{"context": retriever | format_docs, "question": RunnablePassthrough()} | prompt | model | parser`.
- **MMR** diverse results ke liye, **metadata filtering** narrow-scoped search ke liye use karo.
- **Agentic RAG** mein retrieval ek **tool** ban jaata hai (`create_retriever_tool`) — agent khud decide karta hai kab retrieve karna hai, aur multi-hop queries handle kar sakta hai.
- **Conversational RAG** ke liye history-aware retriever use karo taaki follow-up questions ("iska syntax dikhao") sahi se resolve ho.
- Production mein reranking, hybrid search, aur systematic evaluation (retrieval quality + faithfulness) ke bina RAG "demo-grade" hi rehta hai.
