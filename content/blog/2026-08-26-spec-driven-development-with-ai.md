---
sujet: "Spec driven development with AI"
date: 2026-08-26
platform: blog
featured_image: images/2026-08-26-spec-driven-development-with-ai.png
seo_title: "Spec-Driven AI Development: Write the Contract First"
meta_description: "Define behavior, scope, and acceptance criteria before code. A practical workflow for using specs as the contract between teams and AI coding agents."
image_alt: "Layered blueprint documents flowing into structured code blocks in slate and teal tones"
focus_keyword: "spec driven development"
---

# Spec-Driven Development with AI: Write the Contract First, Then Let the Model Build

Most teams treat AI coding assistants like a faster autocomplete. They paste a vague prompt, get a plausible diff, and ship it if the tests pass. That works for small fixes. It falls apart the moment the task spans multiple files, touches behavior that isn't covered by tests, or needs to stay consistent with constraints the model never saw.

Spec-driven development flips the order. You define what "done" means before any code is written — not as a README afterthought, but as the artifact the AI (and humans) actually work from. The spec becomes the source of truth. Code is the implementation detail.

I've noticed the teams that get real leverage from AI aren't the ones with the flashiest prompts. They're the ones who learned to write specs tight enough that a model can execute them, and loose enough that humans still want to read them.

## Why "just describe what you want" stops working

The failure mode is familiar. You ask an agent to "add OAuth login." It adds a route, a callback handler, and a session cookie. Tests pass. Two weeks later, security review asks where refresh token rotation is. Product asks why Google-only was assumed. DevOps discovers the redirect URI hardcodes localhost.

Nothing in the original request mentioned any of that. The model filled gaps with reasonable defaults — reasonable for a demo, not for your product.

Spec-driven development doesn't eliminate ambiguity. It moves ambiguity to the front, where it's cheap to fix. A paragraph in a spec costs five minutes. The same misunderstanding in production costs a sprint.

The shift is conceptual: you're not prompting for code. You're prompting for alignment on behavior, boundaries, and acceptance criteria. Code generation is step two.

## What a good spec looks like in an AI workflow

A useful spec for AI-assisted development has four layers. You don't need a formal template every time, but skipping any of these layers tends to produce rework.

**Intent.** One or two sentences on the problem and the user outcome. Not "implement feature X" but "let existing users sign in with their corporate Google account without creating a second password."

**Scope.** What's in, what's out, and what must not change. Explicit exclusions matter as much as inclusions. "No changes to the billing module" saves you from surprise refactors.

**Behavior.** Concrete scenarios: given this state, when this happens, then this result. Write them the way you'd write test cases, because often they *become* test cases. If your team uses Gherkin or a similar format, this is where it pays off.

**Constraints.** Security, performance, compatibility, style. "Must work with our existing session middleware" or "no new runtime dependencies" are the guardrails that keep agents from reaching for convenient but wrong libraries.

The spec doesn't have to be long. A tight half-page beats a sprawling PRD the model will skim and misinterpret. What matters is that every sentence is actionable.

## Specs as the interface between human judgment and machine speed

Think of the spec as an API contract between you and the agent. Humans supply judgment: trade-offs, product context, things that aren't written down anywhere. The model supplies speed: boilerplate, wiring, repetitive transformations across files.

When that contract is vague, the model improvises. When it's precise, the model stops being a guesser and starts being a compiler.

This is where spec-driven development overlaps with practices teams already know. Test-driven development says: write the test first, then make it pass. Behavior-driven development says: describe behavior in shared language, then implement. Spec-driven development with AI extends the same idea: the spec is the first artifact, and everything downstream — tests, code, docs — derives from it.

The difference in an AI workflow is scale. A human developer might write one test file before implementation. An agent can consume a full spec and produce code, tests, migration scripts, and documentation in one pass — *if* the spec is coherent enough to drive all of those outputs without contradiction.

## A practical loop that actually holds up

Here's a workflow I've seen work for features beyond a single function change:

1. **Draft the spec in chat or a markdown file.** Start rough. Include at least one edge case you care about (expired token, duplicate email, empty input). If you can't think of an edge case, the spec isn't ready.

2. **Ask the agent to critique the spec, not write code.** "What's ambiguous here? What assumptions am I making? What's missing for production?" This step catches gaps before they become diffs.

3. **Revise until the critique is boring.** When the agent stops finding structural holes, you're close.

4. **Generate implementation from the frozen spec.** Point the agent at the spec file. Instruct it to implement exactly what's specified and flag anything that can't be done without a decision.

5. **Verify against the spec, not against vibes.** Walk through each scenario. If the code diverges, fix the spec or fix the code — but don't let them drift silently.

6. **Feed learnings back.** When production reveals a gap, update the spec before patching code. Otherwise the next agent session will repeat the same mistake.

This loop turns AI from a one-shot generator into a repeatable pipeline. The spec accumulates institutional knowledge. The model stays disposable; the spec persists.

## Where people get stuck

**Specs that are secretly code.** If your "spec" is a step-by-step implementation plan ("create a file called auth.ts, import jwt..."), you're not spec-driven — you're remote-pairing with extra steps. Keep specs at the behavior level unless the constraint truly requires a specific structure.

**Specs that never freeze.** Endless revision before any code ships is analysis paralysis with a new name. Set a freeze point. Implement. Iterate on the spec only when reality proves it wrong.

**Specs with no verification path.** A spec without testable scenarios is a wish list. Every "should" needs a corresponding way to check it, even if that check is manual for now.

**Treating the agent as the spec author.** Models are good at expanding bullet points into scenarios. They're unreliable as the sole source of product truth. You own intent; the agent helps articulate and implement it.

## Five things to try this week

1. **Pick one upcoming task and write the spec before opening the codebase.** Include scope, three scenarios, and one explicit non-goal.

2. **Add a "critique my spec" step to your agent workflow.** Make it mandatory for anything touching auth, payments, or data migration.

3. **Store specs alongside the code they produced** — for example in a `docs/specs/` folder or as the body of a GitHub issue linked to the PR. Future you (and future agents) need the context.

4. **Derive test names directly from spec scenarios.** If the scenario says "given an expired refresh token, when the user requests a new access token, then return 401 and clear the session," your test name should be readable without opening the spec.

5. **When a PR surprises you, trace it back to the spec.** Was the spec silent, or was the agent non-compliant? Fix the right layer.

## The real shift

Spec-driven development with AI isn't about writing more documents. It's about deciding earlier what you actually want, and giving the model something solid to execute against instead of a fuzzy intention.

The teams that treat specs as first-class artifacts — reviewed, versioned, linked to PRs — stop fighting hallucinated architecture. They still review code. They still run tests. But the conversation moves upstream, where mistakes are cheaper and clarity compounds.

What's the next feature on your backlog that you'd hesitate to hand to an agent today? Write the spec for that one first. If you can't, that's the feature telling you what you don't understand yet — and that's exactly where spec-driven development earns its keep.
