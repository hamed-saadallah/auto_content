---
sujet: "LangChain and the integration of simple RAG workflow"
date: 2026-09-02
platform: tutorial
featured_image: images/2026-09-02-langchain-simple-rag-workflow.png
seo_title: "Build a Simple RAG Workflow with LangChain: A Guide"
meta_description: "Learn how to build a simple RAG workflow with LangChain: load documents, chunk them, embed them into a vector store, and query a grounded retrieval chain."
image_alt: "Abstract illustration of layered documents connected by a glowing particle stream to an interconnected neural network"
focus_keyword: "langchain"
seo_analysis:
  readability_score: "Yellow"
  seo_score: "Yellow"
  keyword_density: "1.1%"
  keyword_variations: ["RAG pipeline", "vector store", "retrieval chain", "LCEL"]
  internal_linking_suggestions:
    - "Step 5: Generate Embeddings and Build a Vector Store: vector database fundamentals guide"
    - "Pitfall 3: The model answers from memory instead of the retrieved context: prompt engineering best practices"
  word_count: 1327
---

# How to Build a Simple RAG Workflow with LangChain

## Outcome

By the end of this tutorial, you will have a working retrieval-augmented generation (RAG) pipeline built with **LangChain**. You will load a handful of text documents, split them into chunks, embed them into a vector store, and connect that store to a language model so it can answer questions grounded in your own content instead of relying only on what it memorized during training.

## Prerequisites

- Python 3.10 or later, with `pip` available
- An OpenAI API key (or another LLM provider supported by LangChain, with minor adjustments)
- Basic comfort with the command line and virtual environments
- A folder of plain text or markdown files you want to query (a few product docs, meeting notes, or a README work fine for testing)

## Step 1: Set Up Your Project Environment

Create a project folder and an isolated virtual environment so your dependencies don't collide with other Python projects.

```bash
mkdir langchain-rag-demo && cd langchain-rag-demo
python3 -m venv venv
source venv/bin/activate
```

Install the packages you need: the core LangChain library, the OpenAI integration, and Chroma as a lightweight local vector store.

```bash
pip install langchain langchain-openai langchain-community langchain-chroma chromadb
```

Set your API key as an environment variable rather than hardcoding it in your script.

```bash
export OPENAI_API_KEY="sk-your-key-here"
```

This keeps the key out of your source files, which matters the moment you commit code to a shared repository.

## Step 2: Prepare Your Source Documents

Create a `docs/` folder and drop a few text files inside it. For this walkthrough, imagine three short files: `onboarding.txt`, `refund-policy.txt`, and `shipping-faq.txt`. Each one holds a paragraph or two of realistic content, the kind of internal knowledge a support assistant would need.

The quality of your RAG answers depends directly on the quality and clarity of these source files. Vague or contradictory documents produce vague or contradictory answers, no matter how good the retrieval step is.

## Step 3: Load the Documents

LangChain provides document loaders that read files and wrap them in a common `Document` object, which carries both the text content and metadata like the source filename.

```python
from langchain_community.document_loaders import DirectoryLoader, TextLoader

loader = DirectoryLoader("docs", glob="*.txt", loader_cls=TextLoader)
documents = loader.load()

print(f"Loaded {len(documents)} documents")
```

Running this should print the number of files found in your `docs/` folder. If it prints zero, double check the `glob` pattern matches your file extensions.

## Step 4: Split Documents into Chunks

Language models have a limited context window, and embedding an entire long document as a single vector tends to blur its meaning. Splitting text into smaller, overlapping chunks keeps each piece focused and improves retrieval precision.

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=50,
)
chunks = splitter.split_documents(documents)

print(f"Split into {len(chunks)} chunks")
```

The `chunk_overlap` value repeats a small slice of text between consecutive chunks, which prevents a sentence from being cut in half and losing its context.

## Step 5: Generate Embeddings and Build a Vector Store

Each chunk now needs to become a vector, a numeric representation that captures its meaning so similar pieces of text end up close together in vector space. Chroma will store these vectors on disk and handle the similarity search for you.

```python
from langchain_openai import OpenAIEmbeddings
from langchain_chroma import Chroma

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

vector_store = Chroma.from_documents(
    documents=chunks,
    embedding=embeddings,
    persist_directory="./chroma_db",
)
```

The `persist_directory` argument writes the index to disk, so you don't have to re-embed your documents every time you restart the script. On the next run, you can reload the same store with `Chroma(persist_directory="./chroma_db", embedding_function=embeddings)` instead of rebuilding it from scratch.

## Step 6: Turn the Vector Store into a Retriever

A retriever is the piece that takes a user question and returns the most relevant chunks. LangChain exposes this directly from the vector store.

```python
retriever = vector_store.as_retriever(search_kwargs={"k": 3})
```

The `k` parameter controls how many chunks come back per query. Three is a reasonable starting point for short documents; you can raise it if your answers feel incomplete, or lower it if the model gets distracted by irrelevant context.

## Step 7: Build the RAG Chain

This is where retrieval and generation come together. You define a prompt that instructs the model to answer using only the retrieved context, then wire the retriever and the language model into a single chain using LangChain's expression language (LCEL).

```python
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

prompt = ChatPromptTemplate.from_template(
    """Answer the question using only the context below.
If the answer isn't in the context, say you don't know.

Context:
{context}

Question:
{question}
"""
)

def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

rag_chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | prompt
    | llm
    | StrOutputParser()
)
```

The `format_docs` function joins the retrieved chunks into a single block of text the prompt can insert. The chain reads left to right: the question flows into the retriever, the retrieved chunks get formatted, both pieces fill the prompt template, the filled prompt goes to the model, and the output parser converts the raw model response into a plain string.

## Step 8: Query Your RAG Pipeline

With the chain assembled, ask a question that only makes sense if the model actually read your documents.

```python
answer = rag_chain.invoke("What is the refund window for a defective item?")
print(answer)
```

If your `refund-policy.txt` file mentions a specific window, the model should reference it directly instead of guessing. Try a question that has no answer in your documents too, such as one about a topic you never wrote about. A well-behaved chain should admit it doesn't know rather than inventing an answer, which is exactly what the prompt instruction is there to enforce.

## Pitfalls and Troubleshooting

**Pitfall 1: Chunks too large or too small**
Oversized chunks dilute the embedding with unrelated sentences, so retrieval pulls back noisy results. Undersized chunks lose surrounding context, so the model receives fragments that don't fully explain themselves.

**Fix**: Start around 500 characters with 10-15% overlap, then adjust based on how your specific documents are structured. Dense technical docs often need smaller chunks; narrative content tolerates larger ones.

**Pitfall 2: Forgetting to persist or reload the vector store**
Re-running `Chroma.from_documents` on every script execution re-embeds everything, which costs API calls and time for no benefit once your documents stop changing.

**Fix**: Check whether `./chroma_db` already exists before rebuilding, and load the existing store instead. Only regenerate embeddings when the source documents actually change.

**Pitfall 3: The model answers from memory instead of the retrieved context**
If your prompt is loosely worded, a capable model may fall back on its own training data rather than the document snippets you gave it, especially for well-known topics.

**Fix**: Make the prompt instruction explicit and strict, as shown in Step 7, and set `temperature=0` to reduce improvisation. For stricter setups, add a follow-up check that flags answers not traceable to a retrieved chunk.

**Pitfall 4: Stale index after editing source documents**
I've seen this trip people up during development: you update a text file, rerun a query, and get an answer based on the old version because the vector store was never rebuilt.

**Fix**: During active development, delete the `chroma_db` folder and rebuild the index whenever you touch your source files. In production, wire document updates to an indexing job instead of manual rebuilds.

## Recap

You've built a complete, working RAG pipeline: loading documents, splitting them into chunks, embedding them into a persistent vector store, retrieving relevant context for a given question, and generating grounded answers with LangChain's expression language.

Your next step is to swap the sample text files for real content from your own project, then experiment with the `k` value and chunk size until retrieval quality feels reliable. Once the basic pipeline holds up, look into adding source citations to each answer, so users can verify exactly which document backs up what the model told them.
