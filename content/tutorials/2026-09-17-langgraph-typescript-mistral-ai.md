---
sujet: "LangGraph with TypeScript and Mistral AI"
date: 2026-09-17
platform: tutorial
featured_image: images/2026-09-17-langgraph-typescript-mistral-ai.png
seo_title: "Build a LangGraph Agent with TypeScript and Mistral"
meta_description: "Learn LangGraph in TypeScript with Mistral AI: scaffold a Node project, bind tools, compile a StateGraph ReAct loop, and persist chat turns with MemorySaver."
image_alt: "Teal glass platforms linked by copper filaments holding a ledger, brass calculator, and amber crystal"
focus_keyword: "langgraph"
seo_analysis:
  readability_score: "Green"
  seo_score: "Yellow"
  keyword_density: "0.9%"
  keyword_variations: ["StateGraph", "Mistral AI", "tool calling", "MemorySaver"]
  internal_linking_suggestions:
    - "Prerequisites: LangChain simple RAG workflow tutorial"
    - "Step 2: Smoke-test Mistral AI: usage of LangSmith tutorial"
    - "Step 8: Persist turns with MemorySaver: usage of LangSmith tutorial"
  word_count: 2063
---

# How to Build a LangGraph Agent in TypeScript with Mistral AI

## Outcome

By the end of this tutorial you will have a working **LangGraph** agent in TypeScript. It will call **Mistral AI**, decide when to use tools, loop until it can answer, and keep conversation state across turns with a checkpointer. You will run it from the terminal and see the model call a lookup tool and a calculator before it replies.

LangGraph is the graph runtime in the LangChain ecosystem. Nodes are functions. Edges decide what runs next. Shared **state** is the memory that every node reads and writes. That is the piece a linear `invoke()` call does not give you.

## Prerequisites

- **Node.js 18** or later, with `npm`
- A **Mistral API key** from the [Mistral AI console](https://console.mistral.ai/)
- Comfort with TypeScript, `async`/`await`, and environment variables
- A terminal on macOS, Linux, or WSL

This walkthrough uses the Graph API from `@langchain/langgraph`, `ChatMistralAI` from `@langchain/mistralai`, and `tsx` to run TypeScript without a separate build step.

## Step 1: Scaffold a TypeScript project

Create an isolated folder so the demo does not mix with other Node work.

```bash
mkdir langgraph-mistral-demo && cd langgraph-mistral-demo
npm init -y
npm install @langchain/langgraph @langchain/core @langchain/mistralai zod dotenv
npm install -D typescript tsx @types/node
```

Open `package.json` and set the project to ESM. LangChain packages expect that module format.

```json
{
  "name": "langgraph-mistral-demo",
  "type": "module",
  "private": true,
  "scripts": {
    "start": "tsx src/agent.ts"
  }
}
```

Add a `tsconfig.json` that matches Node ESM:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

Create `src/` and a `.env` file. Keep the key out of source control.

```bash
mkdir src
echo 'MISTRAL_API_KEY=your-mistral-key' > .env
```

Load that file at the top of every script with `import "dotenv/config"`. If you skip it, `ChatMistralAI` looks for `MISTRAL_API_KEY` in the process environment and fails with an authentication error.

## Step 2: Smoke-test Mistral AI

Before you draw a graph, confirm the model answers a plain chat call. Create `src/smoke.ts`:

```typescript
import "dotenv/config";
import { ChatMistralAI } from "@langchain/mistralai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

const model = new ChatMistralAI({
  model: "mistral-large-latest",
  temperature: 0,
  maxRetries: 2,
});

const response = await model.invoke([
  new SystemMessage("Reply in one short sentence."),
  new HumanMessage("Confirm you are ready to run a LangGraph agent."),
]);

console.log(response.content);
```

Run it:

```bash
npx tsx src/smoke.ts
```

You should see a single sentence back from Mistral. If this fails, stop. The graph will not hide a bad key, a wrong model name, or a network block.

`mistral-large-latest` supports tool calling, which the agent needs in later steps. `mistral-medium-latest` and `mistral-small-latest` also support it. Pick Large for this demo; it is the most reliable of those three when the model must choose a tool.

Mistral’s chat API is picky about message order. The first message must not be an assistant message. User and assistant turns should alternate. Do not end the request with an assistant or system message. LangChain’s `ChatMistralAI` wrapper maps LangChain message objects onto that contract, which is why we use it instead of raw HTTP.

## Step 3: Define the tools the agent may call

The agent will answer a small internal-ops question: shipping policy plus a price. That needs two tools, not a bigger prompt.

Create `src/agent.ts` and start with the tools:

```typescript
import "dotenv/config";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const lookupPolicy = tool(
  async ({ topic }) => {
    const policies: Record<string, string> = {
      shipping:
        "Standard shipping is 4.50 EUR per kilogram, with a 3 EUR handling fee. EU orders ship in 2 to 4 business days.",
      refund:
        "Refunds are accepted within 14 days of delivery if the item is unused and in original packaging.",
    };
    return policies[topic] ?? "No policy found for that topic.";
  },
  {
    name: "lookup_policy",
    description: "Look up the shipping or refund policy.",
    schema: z.object({
      topic: z.enum(["shipping", "refund"]).describe("Which policy to read."),
    }),
  }
);

const multiply = tool(
  ({ a, b }) => a * b,
  {
    name: "multiply",
    description: "Multiply two numbers.",
    schema: z.object({
      a: z.number().describe("First number"),
      b: z.number().describe("Second number"),
    }),
  }
);

const add = tool(
  ({ a, b }) => a + b,
  {
    name: "add",
    description: "Add two numbers.",
    schema: z.object({
      a: z.number().describe("First number"),
      b: z.number().describe("Second number"),
    }),
  }
);

const toolsByName = {
  [lookupPolicy.name]: lookupPolicy,
  [multiply.name]: multiply,
  [add.name]: add,
};
const tools = Object.values(toolsByName);
```

`tool()` wraps a normal TypeScript function with a name, a description, and a Zod schema. The model never sees your source. It sees that JSON schema and decides whether to call the function. Keep descriptions specific. Vague tools produce vague tool calls.

The policy map is hardcoded on purpose. You can swap it later for a database or a retriever without changing the graph.

## Step 4: Bind Mistral to the tools and define graph state

Still in `src/agent.ts`, create the model and the state schema:

```typescript
import { ChatMistralAI } from "@langchain/mistralai";
import { StateGraph, StateSchema, MessagesValue } from "@langchain/langgraph";

const model = new ChatMistralAI({
  model: "mistral-large-latest",
  temperature: 0,
  maxRetries: 2,
});

const modelWithTools = model.bindTools(tools);

const AgentState = new StateSchema({
  messages: MessagesValue,
});
```

`bindTools` tells Mistral which functions exist. `temperature: 0` keeps tool choice stable. I advise leaving it at zero until the loop is correct; you can raise it later for wording, not for routing.

`StateSchema` is the typed bag of data that flows through the graph. `MessagesValue` is not a plain array. It ships a reducer that **appends** messages (and merges updates by id). That reducer is the difference between a working ReAct loop and a graph that overwrites history on every node.

If you stored `messages` as a raw array with no reducer, each node would replace the list. The tool result would wipe the model’s tool call, and the next model turn would have nothing to observe.

## Step 5: Write the model node and the tool node

A LangGraph agent of this shape has two nodes. The model node asks Mistral what to do. The tool node runs whatever functions the last AI message requested.

```typescript
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import {
  END,
  START,
  type GraphNode,
  type ConditionalEdgeRouter,
} from "@langchain/langgraph";

const SYSTEM_PROMPT =
  "You are a support assistant. Use lookup_policy and the math tools when they help. Do not invent prices or policy text.";

const callModel: GraphNode<typeof AgentState> = async (state) => {
  const response = await modelWithTools.invoke([
    new SystemMessage(SYSTEM_PROMPT),
    ...state.messages,
  ]);
  return { messages: [response] };
};

const callTools: GraphNode<typeof AgentState> = async (state) => {
  const lastMessage = state.messages.at(-1);

  if (lastMessage == null || !AIMessage.isInstance(lastMessage)) {
    return { messages: [] };
  }

  const results: ToolMessage[] = [];
  for (const toolCall of lastMessage.tool_calls ?? []) {
    const selected = toolsByName[toolCall.name];
    const observation = await selected.invoke(toolCall);
    results.push(observation);
  }

  return { messages: results };
};

const shouldContinue: ConditionalEdgeRouter<{
  InputSchema: typeof AgentState;
  Nodes: "callTools";
}> = (state) => {
  const lastMessage = state.messages.at(-1);

  if (!lastMessage || !AIMessage.isInstance(lastMessage)) {
    return END;
  }

  if (lastMessage.tool_calls?.length) {
    return "callTools";
  }

  return END;
};
```

Read that router once. After every model call, LangGraph asks: did the last AI message contain `tool_calls`? If yes, run tools. If no, stop. After tools finish, you will send the graph back to the model so it can see the observations.

The empty `messages: []` return is a no-op because of the reducer. It does not clear history.

## Step 6: Compile the LangGraph workflow

Wire the nodes and edges, then compile. Compilation checks the graph (no orphan nodes, edges that point somewhere real) and freezes the topology.

```typescript
const agent = new StateGraph(AgentState)
  .addNode("callModel", callModel)
  .addNode("callTools", callTools)
  .addEdge(START, "callModel")
  .addConditionalEdges("callModel", shouldContinue, ["callTools", END])
  .addEdge("callTools", "callModel")
  .compile();
```

The loop is now:

1. Start at `callModel`
2. If Mistral requested tools, go to `callTools`
3. Always return from `callTools` to `callModel`
4. When Mistral answers in plain text, go to `END`

That is the ReAct pattern (reason, act, observe) as an explicit graph. You can later insert a human-approval node on the same edge without rewriting the model call.

## Step 7: Run a question that needs both tools

Append this to `src/agent.ts`:

```typescript
const result = await agent.invoke({
  messages: [
    new HumanMessage(
      "What would shipping cost for a 3 kg parcel to the EU, and how long does it take?"
    ),
  ],
});

for (const message of result.messages) {
  const preview =
    typeof message.content === "string"
      ? message.content
      : JSON.stringify(message.content);
  console.log(`[${message.type}] ${preview}`);
}
```

Run the agent:

```bash
npm start
```

You should see a human message, then one or more AI messages with tool calls, then tool messages with policy text and numbers, then a final AI message that combines them. A typical final answer mentions **13.50 EUR** (3 × 4.50) plus the **3 EUR** handling fee, and the 2 to 4 business day window.

If the final text invents a different rate, the model skipped `lookup_policy`. Tighten the system prompt, keep `temperature` at `0`, and confirm you bound the tools with `bindTools`. If you see an API error about message roles, print `result.messages` and check that tool calls sit next to matching `ToolMessage` objects.

## Step 8: Persist turns with MemorySaver

A compiled graph without a checkpointer is stateless between `invoke` calls. Each request starts from the messages you pass in. For a chat, compile with `MemorySaver` and pass a `thread_id`.

```typescript
import { MemorySaver } from "@langchain/langgraph";

const checkpointer = new MemorySaver();

const agentWithMemory = new StateGraph(AgentState)
  .addNode("callModel", callModel)
  .addNode("callTools", callTools)
  .addEdge(START, "callModel")
  .addConditionalEdges("callModel", shouldContinue, ["callTools", END])
  .addEdge("callTools", "callModel")
  .compile({ checkpointer });

const thread = { configurable: { thread_id: "demo-thread" } };

await agentWithMemory.invoke(
  { messages: [new HumanMessage("Remember that my parcel weighs 3 kg.")] },
  thread
);

const followUp = await agentWithMemory.invoke(
  { messages: [new HumanMessage("Using the shipping policy, what do I pay?")] },
  thread
);

const last = followUp.messages.at(-1);
console.log(last?.content);
```

Same `thread_id`, same checkpoint. The second turn can see the weight from the first. Change the id and the graph starts a new conversation.

`MemorySaver` stores checkpoints in process memory. It is fine for local work. It disappears when the process exits. For a real service, LangGraph documents database checkpointers such as `PostgresSaver` from `@langchain/langgraph-checkpoint-postgres`. The graph code stays the same; only the checkpointer object changes.

## Pitfalls and troubleshooting

**Pitfall 1: A model that cannot call tools**

Not every Mistral model implements function calling. If `tool_calls` stays empty on a question that clearly needs a tool, you are often on a model outside that set.

**Fix:** Use `mistral-large-latest`, `mistral-medium-latest`, or `mistral-small-latest` as listed in Mistral’s function-calling docs. Keep `bindTools(tools)` on the object you actually `invoke`.

**Pitfall 2: State overwrites instead of appending**

I’ve noticed this when someone types `messages` as `BaseMessage[]` with no reducer. The tool node returns its `ToolMessage` list, the previous AI message vanishes, and the next model call has no tool call to pair with.

**Fix:** Use `MessagesValue` (or `messagesStateReducer` if you define state with `Annotation.Root`). After each node, log `state.messages.length` and confirm it only grows.

**Pitfall 3: Checkpointer without `thread_id`**

`compile({ checkpointer })` is not enough. If you omit `configurable.thread_id`, LangGraph has nowhere to hang the checkpoint, and the second turn will not see the first.

**Fix:** Pass `{ configurable: { thread_id: "some-stable-id" } }` on every `invoke` for that conversation. Use one id per user session, not one id for the whole process unless you want a single shared thread.

**Pitfall 4: Mistral rejects the message list**

Mistral returns a 400 when the conversation does not alternate cleanly, starts with an assistant turn, or ends on a system/assistant message. That shows up if you hand-build message arrays and skip `ToolMessage` ids.

**Fix:** Prefer `HumanMessage`, `AIMessage`, and the `ToolMessage` objects returned by `tool.invoke(toolCall)`. Do not drop the `tool_call_id`. For the first turn, start with a human (or system + human) message, never an AI message.

## Recap

You now have a TypeScript LangGraph agent that talks to Mistral AI, routes through tools, and can remember a thread with `MemorySaver`. The important pieces are the state reducer, the conditional edge on `tool_calls`, and a model that actually supports tools.

Next, replace `lookup_policy` with a retriever over your own docs, or add a node that pauses for a human before any tool that writes data. The graph shape you compiled here stays the same.
