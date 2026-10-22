---
sujet: "Implementing a scanned-document RAG with OpenCV, OCR, and a quality gate"
date: 2026-09-07
platform: tutorial
featured_image: images/2026-09-07-scanned-document-rag-opencv-ocr.png
seo_title: "Build a Scanned Document RAG Pipeline with Quality Gate"
meta_description: "Learn how to build a scanned document RAG pipeline: preprocess scans with OpenCV, run OCR, retry failed quality checks, then index and query only clean text."
image_alt: "Skewed cream paper scan passing cyan optical filters and a brass quality ring into a lattice of amber nodes"
focus_keyword: "scanned document RAG"
seo_analysis:
  readability_score: "Yellow"
  seo_score: "Yellow"
  keyword_density: "0.05%"
  keyword_variations: ["OCR quality gate", "OpenCV preprocessing", "Tesseract confidence", "vector store"]
  internal_linking_suggestions:
    - "Prerequisites: LangChain simple RAG workflow tutorial"
    - "Step 6: Index Only Pages That Pass the Gate: LangChain simple RAG workflow tutorial"
    - "Step 7: Query the Indexed Scans: managing Agentforce prompt templates"
  word_count: 2204
---

# How to Build a Scanned-Document RAG Pipeline with OpenCV, OCR, and a Quality Gate

## Outcome

By the end of this tutorial, you will have a working **scanned document RAG** pipeline. A scanned page (PNG, JPEG, or a PDF page rendered as an image) goes through OpenCV cleanup, Tesseract OCR, and a quality gate. If the extracted text fails the gate, the pipeline retries with a different preprocessing recipe. Only text that passes the gate is chunked, embedded, and queried.

I treat the quality loop as part of ingestion, not as an afterthought. Garbage OCR in a vector store produces confident, wrong answers later.

## Prerequisites

- Python 3.10 or later, with `pip` and a virtual environment
- A local Tesseract install (`tesseract --version` should print a version)
- An OpenAI API key, or another embedding/LLM provider you can swap in
- One or two scanned pages to test: a clean invoice and a crooked, noisy one
- Basic comfort with NumPy arrays and a simple RAG flow (load, chunk, embed, retrieve)

On Debian/Ubuntu:

```bash
sudo apt-get update
sudo apt-get install -y tesseract-ocr tesseract-ocr-eng libgl1
```

Then create the project:

```bash
mkdir scanned-rag && cd scanned-rag
python3 -m venv venv
source venv/bin/activate
pip install opencv-python-headless pytesseract numpy pillow pdf2image \
  langchain langchain-openai langchain-chroma chromadb
export OPENAI_API_KEY="sk-your-key-here"
```

Use `opencv-python-headless` on a server. You do not need a GUI window to preprocess images.

## Step 1: Accept a Scanned File as an OpenCV Image

Keep one entry point that always returns a BGR `numpy` array. Images load directly. PDFs are rasterized page by page.

```python
from pathlib import Path

import cv2
import numpy as np
from pdf2image import convert_from_path


def load_scan(path: str, page: int = 1) -> np.ndarray:
    suffix = Path(path).suffix.lower()
    if suffix in {".png", ".jpg", ".jpeg", ".tif", ".tiff"}:
        image = cv2.imread(path, cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError(f"Could not read image: {path}")
        return image

    if suffix == ".pdf":
        pages = convert_from_path(path, dpi=300)
        if page < 1 or page > len(pages):
            raise ValueError(f"PDF has {len(pages)} pages; asked for {page}")
        rgb = np.array(pages[page - 1])
        return cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)

    raise ValueError(f"Unsupported file type: {suffix}")
```

**300 DPI** is a solid default for office scans. 150 DPI often looks fine on screen and still fails OCR on small print. If `pdf2image` complains about Poppler, install `poppler-utils` on Linux.

Create a `scans/` folder and drop a test file there. Then check the load:

```python
image = load_scan("scans/invoice.png")
print(image.shape)
```

You should see `(height, width, 3)`. If that print never appears, the path or file type is wrong.

## Step 2: Preprocess the Scan with OpenCV

Raw scanner output is a poor OCR input. Shadows, yellow paper, slight rotation, and compression noise all drop Tesseract confidence. I keep a small catalog of recipes instead of one magic filter. The quality loop will pick the next recipe when the current one fails.

```python
def deskew(gray: np.ndarray) -> np.ndarray:
    coords = np.column_stack(np.where(gray < 255))
    if coords.size == 0:
        return gray
    angle = cv2.minAreaRect(coords)[-1]
    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle
    if abs(angle) < 0.4:
        return gray
    h, w = gray.shape
    matrix = cv2.getRotationMatrix2D((w // 2, h // 2), angle, 1.0)
    return cv2.warpAffine(
        gray, matrix, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE
    )


def preprocess(image: np.ndarray, recipe: str) -> np.ndarray:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    if recipe == "adaptive":
        blur = cv2.GaussianBlur(gray, (3, 3), 0)
        return cv2.adaptiveThreshold(
            blur, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 11
        )

    if recipe == "clahe_denoise":
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        denoised = cv2.fastNlMeansDenoising(enhanced, h=17)
        _, binary = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        return binary

    if recipe == "deskew_morph":
        binary = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 35, 13
        )
        aligned = deskew(binary)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
        return cv2.morphologyEx(aligned, cv2.MORPH_CLOSE, kernel)

    raise ValueError(f"Unknown recipe: {recipe}")
```

Each recipe attacks a different failure mode. Adaptive thresholding helps uneven lighting. CLAHE plus denoise helps faded toner. Deskew plus a small morphological close helps rotated pages and broken characters.

I advise saving the preprocessed image during development:

```python
cv2.imwrite("debug/preprocessed.png", preprocess(image, "adaptive"))
```

If you cannot read the page yourself after this step, Tesseract will not either.

## Step 3: Run OCR and Collect Confidence

Tesseract can return a string only, but the quality gate needs word-level scores. Use `image_to_data`.

```python
import pytesseract
from pytesseract import Output


def run_ocr(processed: np.ndarray, lang: str = "eng") -> dict:
    config = "--oem 3 --psm 6"
    text = pytesseract.image_to_string(processed, lang=lang, config=config)
    data = pytesseract.image_to_data(
        processed, lang=lang, config=config, output_type=Output.DICT
    )
    confidences = [int(c) for c in data["conf"] if str(c) != "-1"]
    words = [
        word
        for word, conf in zip(data["text"], data["conf"])
        if word.strip() and str(conf) != "-1"
    ]
    mean_conf = sum(confidences) / len(confidences) if confidences else 0.0
    return {"text": text, "mean_conf": mean_conf, "words": words}
```

`--psm 6` assumes a uniform block of text, which matches most invoices and letters. For a sparse form, try `--psm 4` or `--psm 11` later. Do not start by rotating through every page segmentation mode; that hides a bad preprocess step.

Print the first result so you have a baseline:

```python
processed = preprocess(image, "adaptive")
ocr = run_ocr(processed)
print(ocr["mean_conf"], ocr["text"][:300])
```

A clean scan often lands above 80 mean confidence. A crooked phone photo of a receipt can sit under 50.

## Step 4: Score OCR Quality Before You Trust the Text

Confidence alone is not enough. Tesseract can be confidently wrong on logos and stamps. I combine three cheap checks:

1. **Mean Tesseract confidence** on recognized words
2. **Alphanumeric density**, so a page of `|||` and `@#` fails
3. **Dictionary-ish word ratio**, a light filter on tokens of length 3 or more

```python
import re

COMMON = {
    "the", "and", "invoice", "total", "date", "amount", "please",
    "payment", "order", "customer", "address", "item", "quantity",
}


def score_ocr(ocr: dict) -> dict:
    text = ocr["text"]
    compact = re.sub(r"\s+", "", text)
    alnum = sum(ch.isalnum() for ch in compact)
    density = alnum / len(compact) if compact else 0.0

    tokens = [w.lower() for w in ocr["words"] if len(w) >= 3]
    if tokens:
        wordiness = sum(t.isalpha() or t in COMMON for t in tokens) / len(tokens)
    else:
        wordiness = 0.0

    passed = (
        ocr["mean_conf"] >= 72
        and density >= 0.78
        and wordiness >= 0.45
        and len(text.strip()) >= 40
    )
    return {
        "passed": passed,
        "mean_conf": ocr["mean_conf"],
        "density": density,
        "wordiness": wordiness,
    }
```

These thresholds are starting points, not laws. A French invoice needs `tesseract-ocr-fra`, `lang="fra"`, and a French `COMMON` set. A numeric table will look "not wordy" even when OCR is fine; in that case raise the confidence floor and lower `wordiness`.

## Step 5: Loop Back Through Verification Until the Gate Passes

This is the part people skip. If the first OCR pass is weak, do not index it. Feed the same scan through the next recipe and score again. Stop when the text passes, or when the recipe list is exhausted.

```python
RECIPES = ["adaptive", "clahe_denoise", "deskew_morph"]


def extract_with_quality_gate(path: str, page: int = 1) -> dict:
    image = load_scan(path, page=page)
    attempts = []

    for recipe in RECIPES:
        processed = preprocess(image, recipe)
        ocr = run_ocr(processed)
        quality = score_ocr(ocr)
        attempts.append({"recipe": recipe, **quality})
        if quality["passed"]:
            return {
                "ok": True,
                "text": ocr["text"],
                "recipe": recipe,
                "quality": quality,
                "attempts": attempts,
                "source": path,
                "page": page,
            }

    best = max(attempts, key=lambda a: a["mean_conf"])
    return {
        "ok": False,
        "text": "",
        "recipe": None,
        "quality": best,
        "attempts": attempts,
        "source": path,
        "page": page,
    }
```

The function never returns `ok=True` with empty text. Failed pages stay out of the vector store. Log `attempts` so you can see which recipe recovered a page and which pages need a human rescan.

A useful debug print:

```python
result = extract_with_quality_gate("scans/invoice.png")
for row in result["attempts"]:
    print(row)
print("accepted:", result["ok"], "via", result["recipe"])
```

If every recipe fails, the next action is not "lower the threshold until it passes". Rescan the page, or crop the document region before retrying. I have seen people index a coffee-stained photo and then spend a day debugging retrieval.

## Step 6: Index Only Pages That Pass the Gate

Once `ok` is true, the rest of the workflow is a standard RAG ingest. Split the accepted text, embed the chunks, and persist them.

```python
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_chroma import Chroma


def index_accepted_page(result: dict, persist_directory: str = "./chroma_db") -> int:
    if not result["ok"]:
        raise RuntimeError(
            f"Refusing to index {result['source']} page {result['page']}: "
            f"quality gate failed ({result['attempts']})"
        )

    document = Document(
        page_content=result["text"],
        metadata={
            "source": result["source"],
            "page": result["page"],
            "ocr_recipe": result["recipe"],
            "ocr_confidence": result["quality"]["mean_conf"],
        },
    )
    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=80)
    chunks = splitter.split_documents([document])

    store = Chroma(
        persist_directory=persist_directory,
        embedding_function=OpenAIEmbeddings(model="text-embedding-3-small"),
    )
    store.add_documents(chunks)
    return len(chunks)
```

Metadata matters here. When an answer looks odd later, you want the source file, page, recipe, and OCR confidence on the retrieved chunk.

Batch a folder like this:

```python
from pathlib import Path

def ingest_scans(folder: str) -> None:
    for path in sorted(Path(folder).iterdir()):
        if path.suffix.lower() not in {".png", ".jpg", ".jpeg", ".pdf"}:
            continue
        result = extract_with_quality_gate(str(path))
        if result["ok"]:
            n = index_accepted_page(result)
            print(f"Indexed {path.name} ({n} chunks) via {result['recipe']}")
        else:
            print(f"Held back {path.name}: {result['attempts']}")
```

Held-back files are the verification queue. Re-run them after a better scan, or after you add a recipe that matches that failure mode.

## Step 7: Query the Indexed Scans

Build a retriever and a grounded prompt. Keep the instruction strict so the model does not fill OCR holes from memory.

```python
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
store = Chroma(persist_directory="./chroma_db", embedding_function=embeddings)
retriever = store.as_retriever(search_kwargs={"k": 4})

prompt = ChatPromptTemplate.from_template(
    """Answer using only the context from scanned documents.
If the context is incomplete or unreadable, say so.
Quote the source filename when you can.

Context:
{context}

Question:
{question}
"""
)

def format_docs(docs):
    parts = []
    for doc in docs:
        src = doc.metadata.get("source", "unknown")
        page = doc.metadata.get("page", "?")
        parts.append(f"[{src} p.{page}]\n{doc.page_content}")
    return "\n\n".join(parts)

rag_chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | prompt
    | ChatOpenAI(model="gpt-4o-mini", temperature=0)
    | StrOutputParser()
)

print(rag_chain.invoke("What is the invoice total and the payment due date?"))
```

Ask one question that is written on the scan and one that is not. The second answer should refuse. If the model invents a total, either the quality gate let junk through or the prompt is too loose.

## Pitfalls and Troubleshooting

**Pitfall 1: Color scans look fine, binary images look ruined**
Adaptive thresholding on a page with a dark header can erase the header text.

**Fix**: Inspect `debug/preprocessed.png` before you blame Tesseract. If the header vanishes, try `clahe_denoise` first, or apply thresholding only to the body region after you crop the page.

**Pitfall 2: The loop always accepts on the last recipe**
If you "pass" when any attempt is the best of a bad set, you are indexing the least terrible OCR, not good OCR.

**Fix**: Keep an absolute floor (`mean_conf`, density, minimum length). The retry changes the preprocess. It does not relax the gate.

**Pitfall 3: Mixed-language pages tank confidence**
A French invoice with English product names will look worse than it is if you run `eng` only.

**Fix**: Install both language packs and pass `lang="eng+fra"`. Rebuild `COMMON` for the language you actually ingest.

**Pitfall 4: You index a failed page "just this once"**
One dirty page poisons retrieval for questions that happen to match its garbage tokens.

**Fix**: Route `ok=False` to a review folder. The RAG workflow continues only after a page passes, or after a human pastes corrected text into the same `Document` shape.

## Recap

You now ingest a scanned file, clean it with OpenCV, run OCR, and refuse to continue until a quality gate says the text is usable. Failed pages retry other preprocess recipes. Accepted pages become chunked, embedded documents you can query with a grounded RAG chain.

Next, replace the sample `COMMON` list with terms from your real documents, and add a review folder for pages that exhaust `RECIPES`. Once that queue stays small, you can attach source citations to every answer the same way the chunk metadata already stores file, page, recipe, and confidence.
