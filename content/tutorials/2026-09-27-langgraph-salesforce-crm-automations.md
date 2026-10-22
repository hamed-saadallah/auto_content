---
sujet: "using LangGraph to create automations with Salesforce CRM"
date: 2026-09-27
platform: tutorial
featured_image: images/2026-09-27-langgraph-salesforce-crm-automations.png
seo_title: "How to Build Salesforce CRM Automations with LangGraph"
meta_description: "Learn to build LangGraph automations for Salesforce CRM: look up a Contact, draft a Case, pause for human approval, then write the Case into your sandbox org."
image_alt: "Glass chambers on copper rails holding a brass card index and a bound folio, with a slatted gate between them"
focus_keyword: "langgraph"
seo_analysis:
  readability_score: "Green"
  seo_score: "Yellow"
  keyword_density: "0.7%"
  keyword_variations: ["StateGraph", "Salesforce CRM", "SalesforceTool", "Case automation"]
  internal_linking_suggestions:
    - "Prerequisites: LangGraph with TypeScript and Mistral AI tutorial"
    - "Step 3: Prove the Salesforce connection: Managing Agentforce Prompt Templates"
    - "Step 9: Compile the graph and run one request: usage of LangSmith tutorial"
  word_count: 1923
---

# How to Build Salesforce CRM Automations with LangGraph

## Outcome

By the end of this tutorial you will have a **LangGraph** workflow that turns an inbound support message into a Salesforce **Case**. The graph looks up the **Contact** by email, drafts the Case fields, pauses for a human yes or no, then writes the record into a **sandbox**. You will run it from the terminal and see the interrupt before any DML hits the CRM.

A Flow or Apex trigger is still the right tool when the path is fixed. LangGraph helps when the path is not: classify the request, fetch CRM context, stop for a person, then write. Nodes are functions. Edges decide what runs next. Shared **state** is the bag every node reads and writes.

## Prerequisites

- **Python 3.10** or later, with `pip`
- A **Salesforce sandbox** or Developer Edition org (do not point this at production while you learn)
- A Salesforce user with API access, permission to read `Contact`, and permission to create `Case`
- That user's **security token** (Profile → Settings → Reset My Security Token)
- An **OpenAI API key** (or another chat model that LangChain wraps; the graph does not care)
- Comfort with virtualenvs, SOQL, and environment variables

This walkthrough uses `StateGraph` from `langgraph`, `SalesforceTool` from `langchain-salesforce` (it wraps `simple-salesforce`), and `ChatOpenAI` for the draft step.

## Step 1: Collect sandbox credentials

Create a dedicated integration user in the sandbox if you can. The username often looks like `you@company.com.sandboxname`. After you reset the security token, Salesforce emails it. You need all four values:

- username
- password
- security token
- domain: `test` for a sandbox, `login` for production

I advise keeping `SALESFORCE_DOMAIN=test` for the whole tutorial. A wrong domain is the most common login failure I see: the password is fine, the token is fine, and you still get `INVALID_LOGIN` because the client hit login.salesforce.com instead of test.salesforce.com.

## Step 2: Scaffold the project

Create an isolated folder so the demo does not mix with other Python work.

```bash
mkdir langgraph-salesforce-automation && cd langgraph-salesforce-automation
python3 -m venv .venv
source .venv/bin/activate
pip install langgraph langchain langchain-openai langchain-salesforce python-dotenv
```

Add a `.env` file. Keep it out of git.

```bash
cat > .env << 'EOF'
OPENAI_API_KEY=sk-your-key
SALESFORCE_USERNAME=you@company.com.sandboxname
SALESFORCE_PASSWORD=your-password
SALESFORCE_SECURITY_TOKEN=your-token
SALESFORCE_DOMAIN=test
EOF
```

`SalesforceTool` reads those `SALESFORCE_*` names by default. You can also pass them as constructor arguments. Either way, do not hardcode them in source.

## Step 3: Prove the Salesforce connection

Before you draw a graph, confirm the org answers a SOQL query. Create `smoke_sf.py`:

```python
from dotenv import load_dotenv
from langchain_salesforce import SalesforceTool

load_dotenv()

sf = SalesforceTool()
result = sf.invoke({
    "operation": "query",
    "query": "SELECT Id, Name, Email FROM Contact LIMIT 5",
})
print(result)
```

Run it:

```bash
python smoke_sf.py
```

You should see a Salesforce query payload with `records`. If this fails, stop. The graph will not hide a bad token, a production/sandbox mix-up, or a profile that cannot query `Contact`.

If login succeeds but the query fails with an object or field error, the user is authenticated and the permission set is the problem. Fix that in the org before you write Case-creation code.

## Step 4: Define the automation state

A chat agent can live on a message list. An automation should not. You want typed fields you can inspect after each node.

Create `automation.py` and start with state:

```python
from typing import Literal, TypedDict

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_salesforce import SalesforceTool
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.types import Command, interrupt

load_dotenv()

sf = SalesforceTool()
model = ChatOpenAI(model="gpt-4o-mini", temperature=0)


class AutomationState(TypedDict):
    request_email: str
    request_text: str
    contact_id: str
    account_id: str
    contact_name: str
    case_subject: str
    case_priority: str
    case_origin: str
    case_id: str
    status: str
```

`status` is a small machine for the router: `lookup`, `draft`, `approve`, `write`, `done`, `blocked`. Empty strings are fine as defaults. LangGraph merges node returns into this dict.

`temperature=0` keeps the draft stable. I leave it there until the Case fields look right. Raise it later for wording, not for routing.

## Step 5: Look up the Contact by email

The first node is deterministic. The model does not write SOQL here.

```python
def escape_soql(value: str) -> str:
    return value.replace("\\", "\\\\").replace("'", "\\'")


def lookup_contact(state: AutomationState) -> dict:
    email = escape_soql(state["request_email"])
    result = sf.invoke({
        "operation": "query",
        "query": (
            "SELECT Id, Name, Email, AccountId "
            f"FROM Contact WHERE Email = '{email}' LIMIT 1"
        ),
    })
    records = result.get("records") or []
    if not records:
        return {
            "status": "blocked",
            "contact_id": "",
            "account_id": "",
            "contact_name": "",
        }

    contact = records[0]
    return {
        "status": "draft",
        "contact_id": contact["Id"],
        "account_id": contact.get("AccountId") or "",
        "contact_name": contact.get("Name") or "",
    }
```

If no Contact matches, the graph stops. Auto-creating people from an inbound email is a frequent source of duplicates. Add a `Contact` create node later if your process needs it, behind the same approval gate you will add for Cases.

SOQL strings use single quotes. Escape the email. A quote in the address should not break the query or change its meaning.

## Step 6: Draft the Case with the model

The model only proposes fields. It does not call Salesforce.

```python
def draft_case(state: AutomationState) -> dict:
    prompt = (
        "Draft a Salesforce Case from this inbound request. "
        "Return exactly three lines: SUBJECT:, PRIORITY:, ORIGIN:. "
        "PRIORITY must be High, Medium, or Low. "
        "ORIGIN must be Email, Phone, or Web.\n\n"
        f"Contact: {state['contact_name']}\n"
        f"Email: {state['request_email']}\n"
        f"Message:\n{state['request_text']}"
    )
    text = model.invoke(prompt).content
    subject = "Inbound support request"
    priority = "Medium"
    origin = "Email"
    for line in text.splitlines():
        upper = line.upper()
        if upper.startswith("SUBJECT:"):
            subject = line.split(":", 1)[1].strip()[:255]
        elif upper.startswith("PRIORITY:"):
            value = line.split(":", 1)[1].strip().title()
            if value in {"High", "Medium", "Low"}:
                priority = value
        elif upper.startswith("ORIGIN:"):
            value = line.split(":", 1)[1].strip().title()
            if value in {"Email", "Phone", "Web"}:
                origin = value
    return {
        "case_subject": subject,
        "case_priority": priority,
        "case_origin": origin,
        "status": "approve",
    }
```

The parser is strict on purpose. Salesforce picklists reject values that are not in the org. If your Case **Priority** or **Origin** lists differ, describe the object first:

```python
print(sf.invoke({"operation": "describe", "object_name": "Case"}))
```

Read the picklist values and tighten the allowed set. Required fields also vary by org. **Subject** is standard. **Status** and **Origin** are required in many orgs. If create fails later, the describe payload tells you why.

## Step 7: Pause before any write

This is the piece a linear script does not give you. `interrupt()` stops the graph, checkpoints the draft, and waits.

```python
def approve_case(state: AutomationState) -> dict:
    decision = interrupt({
        "question": "Create this Case in Salesforce?",
        "contact_id": state["contact_id"],
        "subject": state["case_subject"],
        "priority": state["case_priority"],
        "origin": state["case_origin"],
        "description": state["request_text"],
    })
    if decision is True or decision == "approve":
        return {"status": "write"}
    return {"status": "blocked"}
```

`interrupt()` needs a **checkpointer** and a `thread_id`. Without both, there is nowhere to hang the draft, and you cannot resume. The node restarts from the top when you resume, so keep work before `interrupt()` cheap and idempotent.

## Step 8: Create the Case

Only this node writes.

```python
def write_case(state: AutomationState) -> dict:
    payload = {
        "Subject": state["case_subject"],
        "Description": state["request_text"],
        "Origin": state["case_origin"],
        "Priority": state["case_priority"],
        "Status": "New",
        "ContactId": state["contact_id"],
    }
    if state["account_id"]:
        payload["AccountId"] = state["account_id"]

    created = sf.invoke({
        "operation": "create",
        "object_name": "Case",
        "record_data": payload,
    })
    return {
        "case_id": created.get("id") or "",
        "status": "done" if created.get("success") else "blocked",
    }
```

`create` returns a dict with `id`, `success`, and `errors`. Print `created` if `success` is missing or false. A validation rule or a missing required field will show up there, not in the model output.

## Step 9: Compile the graph and run one request

Wire the nodes, then compile with an in-memory checkpointer.

```python
def route(state: AutomationState) -> Literal["draft_case", "approve_case", "write_case", END]:
    return {
        "draft": "draft_case",
        "approve": "approve_case",
        "write": "write_case",
    }.get(state["status"], END)


graph = (
    StateGraph(AutomationState)
    .add_node("lookup_contact", lookup_contact)
    .add_node("draft_case", draft_case)
    .add_node("approve_case", approve_case)
    .add_node("write_case", write_case)
    .add_edge(START, "lookup_contact")
    .add_conditional_edges("lookup_contact", route)
    .add_conditional_edges("draft_case", route)
    .add_conditional_edges("approve_case", route)
    .add_conditional_edges("write_case", route)
    .compile(checkpointer=InMemorySaver())
)

config = {"configurable": {"thread_id": "case-demo-1"}}

paused = graph.invoke(
    {
        "request_email": "ada@example.com",
        "request_text": "Our renewal invoice shows the wrong seat count. Please fix it today.",
        "contact_id": "",
        "account_id": "",
        "contact_name": "",
        "case_subject": "",
        "case_priority": "",
        "case_origin": "",
        "case_id": "",
        "status": "",
    },
    config,
)
print(paused.get("__interrupt__"))
```

Use an email that exists on a Contact in your sandbox. `invoke` returns when the graph hits `interrupt()`. You should see the draft subject, priority, origin, and Contact Id under `__interrupt__`. No Case exists yet.

Resume on the same `thread_id`:

```python
final = graph.invoke(Command(resume=True), config)
print(final["case_id"], final["status"])
```

Open that Case Id in the sandbox. The Contact should be linked, **Status** should be `New`, and the description should match the inbound text.

To refuse the write, resume with `Command(resume=False)`. The router goes to `END` with `status=blocked` and Salesforce stays unchanged.

`InMemorySaver` dies when the process exits. For a service, LangGraph documents database checkpointers such as Postgres. The graph code stays the same; only the checkpointer object changes.

## Pitfalls and troubleshooting

**Pitfall 1: `INVALID_LOGIN` with a password you know is right**

A frequent case: the token is from a previous password, or `SALESFORCE_DOMAIN` is still `login` while the user lives in a sandbox.

**Fix:** Reset the security token after every password change. Set `SALESFORCE_DOMAIN=test` for sandboxes. Confirm `smoke_sf.py` before you debug the graph.

**Pitfall 2: The model invents SOQL or writes records on its own**

I’ve noticed this when someone binds `SalesforceTool` as a free agent tool and asks the model to “handle the ticket.” The model can query too much, or call `create` / `delete` without a gate.

**Fix:** Keep read and write in your nodes. Let the model draft fields. Put `interrupt()` in front of every mutating `SalesforceTool` call.

**Pitfall 3: Case create fails on required fields**

Standard orgs often want **Subject**, **Status**, and **Origin**. Custom validation rules add more. Picklist values are org-specific.

**Fix:** Run `describe` on `Case`, copy the exact picklist labels, and add those fields to `record_data`. Do not guess API names for custom fields.

**Pitfall 4: Resume starts a new conversation**

`compile({ checkpointer })` is not enough. A new `thread_id` is a new run. The draft you approved is gone.

**Fix:** Pass the same `{ configurable: { thread_id: "..." } }` on the first `invoke` and on `Command(resume=...)`. Use one id per inbound request.

## Recap

You now have a LangGraph automation that reads Salesforce, drafts a Case, waits for a person, then writes the record. The useful pieces are typed state, a deterministic SOQL lookup, and an interrupt in front of DML.

Next, add a node that opens a **Task** on the Case, or swap the draft step for an Opportunity when the text is a sales request. Keep the same graph shape: look up, draft, approve, write.
