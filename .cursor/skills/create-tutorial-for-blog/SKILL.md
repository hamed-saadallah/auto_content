---
name: create-tutorial-for-blog
description: >-
  Generates English how-to tutorials for a subject or tool, shows them
  for review, then after approval saves them as .md, commits, and opens a PR.
  Use when the user asks to write a tutorial, create-tutorial-for-blog,
  or generate a how-to for a tool.
---

# Tutorial Generation

## Workflow

1. **Ask first**: If `{sujet}` is missing, ask for the subject or tool of the tutorial. Do **not** generate content until the subject is known.
2. **Generate + preview**: Once `{sujet}` is known, write the tutorial following the prompt below (replace `{sujet}` with the given subject). Show the full draft **in the chat only** (tutorial body only — **no SEO fields** in chat). **Never** create or write the `.md` file at this step. End with: *"Tell me your edits, or reply ok / approve / save to publish."*
3. **Revise loop**: If the user requests changes, update the tutorial body, show the full revised draft again in chat, and **still do not save** the file. Repeat until approval.
4. **On approval only**: When the user explicitly approves with a message like `ok`, `approve`, `save`, `publish`, `approuve`, `sauvegarde`, or `valide`:
   - Date: today's date in `YYYY-MM-DD`. Slug: kebab-case ASCII from the subject (lowercase, hyphens, no accents if possible).
   - **Featured image** (do **not** generate during draft/preview — only after approval):
     - Call the GenerateImage tool with `aspect_ratio: "16:9"` and `filename: "YYYY-MM-DD-slug.png"` (filename only, no directory).
     - Description: editorial illustration of `{sujet}`. No letters, watermarks, logos, or UI text. No stock clichés (handshakes, glowing brains, generic laptops).
     - Move/copy the generated file to `content/tutorials/images/YYYY-MM-DD-slug.png` (create `content/tutorials/images/` if needed).
     - If image generation or the move fails: still write the tutorial, **omit** `featured_image` and `image_alt` from frontmatter, and mention the failure in the reply. Do **not** block the PR.
   - **SEO fields** (do **not** generate during draft/preview — only after approval, **after** the cover image step). Derive them from the **approved** tutorial (same topic, no new claims). See **SEO fields (on approval only)** below.
   - Write `content/tutorials/YYYY-MM-DD-slug.md` (create `content/tutorials/` if needed). Include `featured_image` and `image_alt` in frontmatter only if the PNG was saved. Always include `seo_title`, `meta_description`, `focus_keyword`, and the complete `seo_analysis` block.
   - Then run the **Git / PR** steps below.
   - Reply with the tutorial path, the image path if any, the PR URL, **and** a short recap of the SEO fields written (`seo_title`, `meta_description`, `image_alt` if any, `focus_keyword`, `readability_score`, `seo_score`, `keyword_density`, and `internal_linking_suggestions`) so they can be edited in the PR before merge.
5. **Never write the file before approval.**

## Output file format

```markdown
---
sujet: "{sujet}"
date: YYYY-MM-DD
platform: tutorial
featured_image: images/YYYY-MM-DD-slug.png
seo_title: "..."
meta_description: "..."
image_alt: "..."
focus_keyword: "..."
seo_analysis:
  readability_score: "Green" | "Yellow" | "Red"
  seo_score: "Green" | "Yellow" | "Red"
  keyword_density: "X%"
  keyword_variations: ["...", "..."]
  internal_linking_suggestions:
    - "section_name: suggested_link_anchor"
  word_count: NNNN
---

{generated tutorial body}
```

Omit `featured_image` and `image_alt` if the cover PNG was not generated. Always include the `seo_analysis` block.

## SEO fields (on approval only)

Derive from the approved tutorial. Do **not** invent a different topic or new claims. Do **not** show these in the draft chat.

- `seo_title`: English, 50-60 characters, specific, action-oriented (e.g., "How to set up X", "Set up Y with Z"). Stored as the tutorial title in frontmatter. Should naturally include the main focus keyword.
- `meta_description`: English, 155-160 characters, one or two concrete sentences, must include the main keyword naturally and compellingly. Stored as the excerpt in frontmatter.
- `image_alt`: describes the cover illustration, English, no "image of" / "illustration of" prefix. Omit if the cover PNG was not generated.
- `focus_keyword`: 1-3 words from `{sujet}`, lowercase. Primary keyword for SEO review. Stored in frontmatter only.

### Yoast SEO Analysis Fields (seo_analysis block)

Generate during approval by analyzing the **approved tutorial body**. These fields support Yoast-style SEO optimization and provide metrics for review:

- `readability_score`: **Green** (Flesch Reading Ease 60-70), **Yellow** (50-59 or 71-80), or **Red** (< 50 or > 80). Target: clear instructions, varied sentence length, short paragraphs.
- `seo_score`: **Green** (keyword well-integrated, proper heading hierarchy, meta description has keyword), **Yellow** (minor gaps), or **Red** (keyword missing or poor integration).
- `keyword_density`: percentage of focus keyword occurrences in body (target: 2-3% density). Calculate as (count of exact focus keyword / total word count × 100).
- `keyword_variations`: 2-4 natural synonyms or related terms from the tutorial that support the focus keyword (e.g., if focus keyword is "vector index", variations might be "semantic search", "embedding similarity", "vector database").
- `internal_linking_suggestions`: 2-3 specific sections or steps where internal links could naturally fit. Format: `"section_heading: suggested_link_anchor"` (e.g., `"Prerequisites: advanced Python tutorial"`). Omit if fewer than 2 clear opportunities.
- `word_count`: total word count of the tutorial body (excluding frontmatter).

## Git / PR

If `STUDIO_API_URL`, `STUDIO_EMAIL`, and `STUDIO_PASSWORD` are set, **do not open a PR**. Follow `.cursor/skills/content-studio/SKILL.md` (login → create content → patch body → approve → publish `WORDPRESS`).

Otherwise, run only after the `.md` file has been written on approval.

1. **Preconditions**: Confirm the workspace is a git repo with remote `origin` and that `gh` (GitHub CLI) is installed and authenticated. If git/remote/`gh` fails: keep the saved `.md` (and image if any), do **not** invent a remote, and explain the actionable fix (e.g. install from https://cli.github.com/ then `gh auth login`).
2. **Branch**: From up-to-date `master`, create `content/tutorial-YYYY-MM-DD-slug`.
3. **Commit**: Stage the new tutorial `.md` **and** the featured image PNG when it exists. Commit message: `Add tutorial: {sujet}` (use HEREDOC; follow the user's git safety rules — no force push, no config changes, no `--no-verify`).
4. **Push**: `git push -u origin HEAD`
5. **PR**: Create with `gh pr create`, base **`master`**:
   - Title: `Tutorial: {sujet}`
   - Body (HEREDOC):
     - Summary: 1-2 bullets (sujet + date + featured image if present)
     - Test plan: short checklist (review the `.md`, steps runnable, cover visual, SEO fields)
   - Note in the reply that merging the PR to `master` syncs the tutorial, excerpt, and featured image to WordPress (category `tutorials`) via GitHub Actions.

## Prompt (use verbatim)

Write a how-to tutorial in English on {sujet}, aimed at {audience}
with the goal of {objectif}.
(If {sujet} is not provided, ask for it before continuing. If {audience} and
{objectif} are not provided, propose a reasonable hypothesis and flag it
briefly rather than blocking generation.)

YOAST SEO GUIDELINES (for tutorials):
- Keyword integration: Place the focus keyword naturally in the title, first
  100 words, and 1-2 headers/steps. Target 2-3% keyword density overall.
- Readability: Aim for Flesch Reading Ease 60-70. Use clear, direct language,
  short sentences for instructions, and vary paragraph length. Tutorials should
  be scannable with bold key terms and numbered steps.
- Meta description: Write for 155-160 characters exactly. Must include the
  focus keyword naturally and compellingly (describe what reader will learn).
- Heading hierarchy: Proper H1 (title only) -> H2 -> H3 structure. Numbered
  steps should be H2 or H3. Only one H1 per tutorial.
- Active voice: Favor active voice (target 80%+ of sentences, especially in
  step instructions like "Run this command" not "This command is run").
- Internal linking opportunities: Note 2-3 specific steps where internal links
  could fit naturally (e.g., "Prerequisites: advanced Python tutorial").
- Transitions and flow: Steps should flow logically; use clear transitions
  between sections ("Next," "Before you proceed," "Once complete,").

FACT-CHECKING RULE (priority):
- Never invent a statistic, date, study name, or quote attributed to a
  real person/source.
- If you are not certain a fact is accurate, recast it as a personal
  observation rather than an established fact — but only if it is genuinely
  a generic point of view, not a made-up specific event (no "a client told
  me on Monday" if that client does not exist: prefer "I often see this
  case" or a hypothetical scenario explicitly framed as such, e.g.
  "imagine someone who...").
- Theoretical/cultural references must be limited to widely known
  elements (concepts, books, canonical authors) — never a precise numeric
  statistic or exact date unless you are absolutely certain.
- If in doubt about a reference: omit it rather than keep it hoping it
  is correct.
- Do not invent CLI flags, API fields, menu labels, or config keys.
  If a command or setting is uncertain, omit it or mark the gap
  explicitly rather than guessing.

STRUCTURE (flexible skeleton — adapt, merge, or drop 1-2 elements if
the topic fits better that way; do not treat this as a rigid checklist):
- Title (H1): a specific how-to for {sujet}, no clickbait
  ("How to set up X", "Do Y with Z").
- Outcome: what the reader will have working by the end, in one
  short paragraph. Avoid stock openers ("What if I told you...",
  "In a world where...").
- Prerequisites: tools, accounts, versions, or knowledge required.
- Steps: numbered H2 (or H3 under a section) with one action per
  step. Show the command, config, or click path. When it helps,
  show the expected result so the reader can check their work.
- Pitfalls / troubleshooting: 2 to 4 common mistakes related to
  {sujet}, with a concrete fix — real if you know it with certainty,
  otherwise framed explicitly as hypothetical ("a frequent case...").
- Recap: what was built, plus one concrete next step.

TUTORIAL FORMAT CONSTRAINTS:
- Target length: 1200-2000 words (excluding the title).
- Allowed Markdown: `#` title, `##` / `###` sections, lists,
  numbered steps, **bold** for key terms, `inline code`, and
  fenced code blocks. No hashtags.
- One action per step. Do not dump a wall of commands without
  saying what each one does.
- Spacious paragraphs, one strong idea per paragraph.

STYLE — AVOID (AI writing tells):
- Excess em dashes (—)
- Mirror sentences ("It's not X, it's Y")
- Decorative emojis with no function (✨🚀💡 in a row)
- Empty transition formulas ("Here's why", "The key?")
- Hollow adjectives ("powerful", "incredible", "essential") without justification
- Any structure too recognizable as a "LinkedIn growth-hacker formula" —
  vary the order or shape of sections from one tutorial to the next

STYLE — PREFER:
- Irregular rhythm: alternate short and long sentences
- Concrete details over generalities (real commands, real file paths)
- One strong idea per paragraph
- Rare emojis, only functional (e.g. list bullets)

Tone calibration example (do not copy, just for cadence):
"Most people rehearse their pitch. I stopped. What works
is listening to the first question and answering that one — not the one
I had prepared for."

TONE: Professional but accessible, an assumed personal voice ("I advise",
"I've noticed that"), without excessive familiarity.

GOAL: Deliver a useful, fact-checked how-to, adapted to {audience}, in
service of the goal of {objectif}, that the reader can follow and finish.
