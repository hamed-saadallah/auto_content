---
sujet: "the usage of langsmith"
date: 2026-09-09
platform: tutorial
featured_image: images/2026-09-09-usage-of-langsmith.png
seo_title: "How to Trace and Evaluate Mistral Apps with LangSmith"
meta_description: "Learn how to use LangSmith with JavaScript and Mistral: enable tracing, inspect run trees, build a dataset, and run an evaluation experiment on your assistant."
image_alt: "Nested glass tracing panels linked by a copper filament into an evaluation grid of scored cells"
focus_keyword: "langsmith"
seo_analysis:
  readability_score: "Yellow"
  seo_score: "Green"
  keyword_density: "1.5%"
  keyword_variations: ["tracing", "evaluate", "dataset", "Mistral"]
  internal_linking_suggestions:
    - "Prerequisites: LangChain simple RAG workflow tutorial"
    - "Step 4: Build a dataset from known cases: LangChain simple RAG workflow tutorial"
    - "Pitfalls: scanned-document RAG with OpenCV and OCR tutorial"
  word_count: 1963
---

# How to Trace and Evaluate a Mistral App with LangSmith in JavaScript

## Outcome

By the end of this tutorial you will have **LangSmith** wired into a small Node.js assistant that calls **Mistral AI**. You will send traces to the hosted UI, inspect a full run tree (your function, a retriever span, and the nested Mistral chat call), save a tiny dataset of questions and expected answers, and run an evaluation experiment that scores the app against that dataset. The same setup scales later to LangChain.js or a larger production service.

## Prerequisites

- A LangSmith account at [smith.langchain.com](https://smith.langchain.com) (Google, GitHub, or email; no credit card required to start)
- A LangSmith API key from **Settings → API Keys → Create API Key**
- A Mistral API key from your [Mistral AI console](https://console.mistral.ai/)
- Node.js 18 or later, with `npm`
- Comfort with the terminal and environment variables

This walkthrough uses the official `langsmith` JavaScript SDK and `@mistralai/mistralai`. You do **not** need LangChain. Mistral’s SDK is ESM-only, so the project will use `"type": "module"`.

## Step 1: Create a project and turn tracing on

Create an isolated folder so the demo does not mix with other Node work.

```bash
mkdir langsmith-demo && cd langsmith-demo
npm init -y
npm install @mistralai/mistralai langsmith dotenv
```

Open `package.json` and set the project to ESM. Without this, Node will fail when it loads the Mistral SDK.

```json
{
  "name": "langsmith-demo",
  "type": "module",
  "private": true
}
```

Export the variables LangSmith and Mistral actually read. `LANGSMITH_TRACING` must be the string `true` or nothing is sent, even if you wrap functions with `traceable`.

```bash
export LANGSMITH_TRACING=true
export LANGSMITH_API_KEY="lsv2_pt_your-key-here"
export MISTRAL_API_KEY="your-mistral-key"
export LANGSMITH_PROJECT="langsmith-demo"
```

`LANGSMITH_PROJECT` names the tracing project in the UI. If you omit it, LangSmith creates a default project on first ingest.

If your workspace is **not** in the US region, also set the matching API host. Do not add a trailing slash; that often produces authentication errors.

```bash
# EU example
export LANGSMITH_ENDPOINT="https://eu.api.smith.langchain.com"
```

You may still see `LANGCHAIN_TRACING_V2` and `LANGCHAIN_API_KEY` in older posts. Those names still work. Prefer `LANGSMITH_TRACING` and `LANGSMITH_API_KEY`.

If your API key is attached to several workspaces, set `LANGSMITH_WORKSPACE_ID` as well, or traces land in the wrong place (or fail).

## Step 2: Instrument a small assistant

Create `app.js`. There is no `wrapOpenAI` equivalent for Mistral. You wrap the chat call yourself with `traceable` and set `run_type: "llm"` plus `ls_provider` / `ls_model_name` so LangSmith can tag the span (and estimate cost from tokens). A second `traceable` wraps the pipeline so retrieval and the model sit in one tree.

This tutorial uses `mistral-small-latest`. Swap to `mistral-medium-latest` or `mistral-large-latest` if you want a stronger model.

```javascript
import "dotenv/config";
import { Mistral } from "@mistralai/mistralai";
import { traceable } from "langsmith/traceable";

const mistral = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY,
});

const FAQ = [
  "Starter plans are limited to 5 users. Enterprise plans have unlimited users.",
  "To reset a password, use Forgot password on the login page. A reset link is emailed.",
  "API rate limits are 1,000 requests per hour on Starter and 10,000 on Enterprise.",
];

function messageText(message) {
  const content = message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === "string" ? part : part.text ?? ""))
      .join("");
  }
  return "";
}

const chatMistral = traceable(
  async ({ model, messages }) => {
    const response = await mistral.chat.complete({ model, messages });
    return messageText(response.choices?.[0]?.message);
  },
  {
    name: "Mistral Chat Completion",
    run_type: "llm",
    metadata: {
      ls_provider: "mistral",
      ls_model_name: "mistral-small-latest",
    },
  }
);

const retrieve = traceable(
  async (question) => FAQ,
  { name: "retrieve", run_type: "retriever" }
);

const supportBot = traceable(
  async (question) => {
    const context = await retrieve(question);
    return chatMistral({
      model: "mistral-small-latest",
      messages: [
        {
          role: "system",
          content:
            "You are a support agent. Answer using only this context:\n\n" +
            context.join("\n"),
        },
        { role: "user", content: question },
      ],
    });
  },
  { name: "support_bot", metadata: { component: "support_bot" } }
);

const answer = await supportBot(
  "How many users can I have on the Starter plan?"
);
console.log(answer);
```

`messageText` is a small guard. Mistral’s SDK may return `content` as a string or as an array of chunks. LangSmith still records whatever you return from the traced function.

Run it:

```bash
node app.js
```

You should see an answer that cites the five-user Starter limit. That print is only a sanity check. The useful artifact is the trace sitting in LangSmith.

I advise wrapping the **pipeline**, not only the model call. When a wrong answer shows up, you need to know whether retrieval returned the wrong snippet or the model ignored a good snippet. A single LLM span cannot tell you that.

## Step 3: Read the trace in the LangSmith UI

Open [smith.langchain.com](https://smith.langchain.com). In the sidebar, go to **Tracing** and select the `langsmith-demo` project (or **default** if you skipped `LANGSMITH_PROJECT`).

Click the `support_bot` row.

- The **Messages** / input-output view shows what went into the pipeline and what came back.
- The **Details** tab shows the run tree: `support_bot` at the root, `retrieve` as a retriever span, and **Mistral Chat Completion** nested as an LLM span.

Confirm three things before you move on:

1. The root input is the question you typed.
2. The retriever span returns the FAQ list (not empty).
3. The LLM span contains the system prompt with that context pasted in.

If the tree is missing, stay on this step. Evaluation on a black box is guesswork.

Optional: from the terminal, list recent traces with the LangSmith CLI (`langsmith trace list --project langsmith-demo --limit 5`). The UI is enough for this tutorial.

## Step 4: Build a dataset from known cases

Tracing shows what one request did. A dataset lets you rerun the same cases after you change the prompt or the model.

Create `dataset.js`:

```javascript
import { Client } from "langsmith";

const client = new Client();

const dataset = await client.createDataset("support-faq-v1", {
  description: "Short FAQ questions with reference answers.",
});

const inputs = [
  { question: "How many users can I have on the Starter plan?" },
  { question: "What is the Starter API rate limit?" },
  { question: "How do I reset my password?" },
];

const outputs = [
  { answer: "The Starter plan is limited to 5 users." },
  { answer: "1,000 requests per hour." },
  {
    answer: "Use Forgot password on the login page; a reset link is emailed.",
  },
];

await client.createExamples({
  datasetId: dataset.id,
  inputs,
  outputs,
});

console.log("Created dataset:", dataset.name);
```

Run it once:

```bash
node dataset.js
```

Expected output: `Created dataset: support-faq-v1`. In the UI, open **Datasets** and you should see three examples, each with an input `question` and a reference `answer`.

Keep examples boring and checkable. “Be helpful” is not a label. A number, a country, a product limit: those you can score without a debate.

A frequent case I see: people dump production traces into a dataset without fixing the labels. A trace is a candidate. It becomes a test only after a human confirms the expected output.

## Step 5: Score the assistant with an evaluation experiment

Create `eval.js`. The target function is the unit you are testing. LangSmith calls it once per dataset example, passing `inputs` as an object. Your return value must be an object too, so evaluators can read `outputs.answer`.

In JavaScript, import `evaluate` from `langsmith/evaluation`. Evaluators receive a single object with `inputs`, `outputs`, and `referenceOutputs`.

```javascript
import "dotenv/config";
import { Mistral } from "@mistralai/mistralai";
import { evaluate } from "langsmith/evaluation";
import { traceable } from "langsmith/traceable";

const mistral = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY,
});

const FAQ = [
  "Starter plans are limited to 5 users. Enterprise plans have unlimited users.",
  "To reset a password, use Forgot password on the login page. A reset link is emailed.",
  "API rate limits are 1,000 requests per hour on Starter and 10,000 on Enterprise.",
];

function messageText(message) {
  const content = message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === "string" ? part : part.text ?? ""))
      .join("");
  }
  return "";
}

const chatMistral = traceable(
  async ({ model, messages }) => {
    const response = await mistral.chat.complete({ model, messages });
    return messageText(response.choices?.[0]?.message);
  },
  {
    name: "Mistral Chat Completion",
    run_type: "llm",
    metadata: {
      ls_provider: "mistral",
      ls_model_name: "mistral-small-latest",
    },
  }
);

async function target(inputs) {
  const question = String(inputs.question ?? "");
  const context = FAQ.join("\n");
  const answer = await chatMistral({
    model: "mistral-small-latest",
    messages: [
      {
        role: "system",
        content: `Answer using only this context:\n\n${context}`,
      },
      { role: "user", content: question },
    ],
  });
  return { answer: String(answer).trim() };
}

async function containsReference({ outputs, referenceOutputs }) {
  const predicted = String(outputs?.answer ?? "").toLowerCase();
  const expected = String(referenceOutputs?.answer ?? "").toLowerCase();
  const tokens = expected.replace(".", "").split(/\s+/).slice(0, 4);
  const hit =
    predicted.includes(expected) || tokens.every((token) => predicted.includes(token));
  return { key: "contains_reference", score: hit ? 1 : 0 };
}

const results = await evaluate(target, {
  data: "support-faq-v1",
  evaluators: [containsReference],
  experimentPrefix: "support-bot-baseline",
  maxConcurrency: 2,
});

console.log(results);
```

Run:

```bash
node eval.js
```

The SDK prints a link to the experiment. Open it. You get a table: **Inputs**, **Reference Output**, **Outputs**, and the `contains_reference` score per row.

That substring checker is intentionally cheap. It teaches the `evaluate()` contract: dataset name, target function, list of evaluators, optional `experimentPrefix`. For graded answers (“is this faithful to the docs?”), the official path is an LLM-as-judge via the `openevals` package. Start with a deterministic scorer so a judge model is not grading a judge model on day one.

Change the system prompt, rerun `eval.js` with a new `experimentPrefix`, and compare the two experiments in the same dataset view. That comparison is the point of LangSmith evaluation: a prompt tweak stops being a vibe and becomes a delta on named cases.

## Pitfalls / troubleshooting

**Traces never appear.** `LANGSMITH_TRACING` is unset or not the string `true`. `traceable` does not bypass that flag; it is the on/off switch. Also check `LANGSMITH_ENDPOINT` if the workspace is EU or another non-US region, and confirm the key from **Settings → API Keys** is the one in your shell (`echo $LANGSMITH_API_KEY`).

**`ERR_REQUIRE_ESM` or a failed Mistral import.** The current `@mistralai/mistralai` package is ESM-only. Set `"type": "module"` in `package.json` (or use `.mjs` files). Do not `require()` the SDK.

**You copied `wrapOpenAI` onto Mistral.** That wrapper is for the OpenAI client (and OpenAI-compatible base URLs). For Mistral’s official SDK, wrap `mistral.chat.complete` with `traceable` and `run_type: "llm"`, as in Step 2.

**`createDataset` fails on the second run.** Dataset names are unique in the workspace. Either pick a new name or reuse the existing one instead of creating it again.

**The evaluator always scores 0.** The target must return keys the evaluator reads. If you return a raw string, `outputs.answer` is missing. If the dataset stores `outputs.answer` but the target returns `outputs.output`, the scorer is looking at the wrong field. Align the three objects: dataset `inputs` / `outputs`, target return value, evaluator arguments (`referenceOutputs` in JavaScript).

**You instrumented the model but not retrieval.** A frequent case: the LLM span looks fine, the answer is wrong, and nobody recorded what the retriever returned. Put `run_type: "retriever"` (or `"tool"`) on the function that fetches context. Filter later with that run type when you hunt failures.

## Recap

You installed the LangSmith JavaScript SDK and the Mistral client, enabled tracing with `LANGSMITH_TRACING` and `LANGSMITH_API_KEY`, and wrapped both the pipeline and `mistral.chat.complete` with `traceable`. You inspected the run tree in **Tracing**, created dataset `support-faq-v1`, and ran `evaluate()` to score a baseline experiment.

Next concrete step: take one real production (or staging) trace that failed, add it as a dataset example with a corrected reference answer, and rerun the same `target` function. That is the loop LangSmith is built for: observe, label, evaluate, then change the prompt or the retriever with evidence.
