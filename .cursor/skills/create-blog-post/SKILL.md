---
name: create-blog-post
description: >-
  Generates blog articles in English, shows them for review,
  then after approval saves them as .md, commits, and opens a PR.
  Use when the user asks to write a blog post, create-blog-post, or generate
  a long-form article from a subject/topic.
---

# Blog Post Generation

## Workflow

1. **Ask first**: If `{sujet}` is missing, ask for the subject of the article. Do **not** generate content until the subject is known.
2. **Generate + preview**: Once `{sujet}` is known, write the article following the prompt below (replace `{sujet}` with the given subject). Show the full draft **in the chat only** (article body only — **no SEO fields** in chat). **Never** create or write the `.md` file at this step. End with: *"Tell me your edits, or reply ok / approve / save to publish."*
3. **Revise loop**: If the user requests changes, update the article body, show the full revised draft again in chat, and **still do not save** the file. Repeat until approval.
4. **On approval only**: When the user explicitly approves with a message like `ok`, `approve`, `save`, `publish`, `approuve`, `sauvegarde`, or `valide`:
   - Date: today's date in `YYYY-MM-DD`. Slug: kebab-case ASCII from the subject (lowercase, hyphens, no accents if possible).
   - **Featured image** (do **not** generate during draft/preview — only after approval):
     - Call the GenerateImage tool with `aspect_ratio: "16:9"` and `filename: "YYYY-MM-DD-slug.png"` (filename only, no directory).
     - Description: editorial illustration of `{sujet}`. No letters, watermarks, logos, or UI text. No stock clichés (handshakes, glowing brains, generic laptops).
     - Move/copy the generated file to `content/blog/images/YYYY-MM-DD-slug.png` (create `content/blog/images/` if needed).
     - If image generation or the move fails: still write the article, **omit** `featured_image` and `image_alt` from frontmatter, and mention the failure in the reply. Do **not** block the PR.
   - **SEO fields** (do **not** generate during draft/preview — only after approval, **after** the cover image step). Derive them from the **approved** article (same topic, no new claims). See **SEO fields (on approval only)** below.
   - **Internal linking suggestions** (after SEO fields): Call the API to suggest internal links (related blog posts). Show the user 2–5 suggestions with:
     - Target article title
     - Suggested anchor text (the link text to use in your article)
     - Reason (keyword match %, topic overlap, content type similarity)
     - Target URL preview
     - User selects which links to include (multi-select, optional)
   - Write `content/blog/YYYY-MM-DD-slug.md` (create `content/blog/` if needed). Include `featured_image` and `image_alt` in frontmatter only if the PNG was saved. Always include `seo_title`, `meta_description`, `focus_keyword`, and the complete `seo_analysis` block.
   - Then run the **Git / PR** steps below.
   - Reply with the article path, the image path if any, the PR URL, **and** a short recap of the SEO fields written (`seo_title`, `meta_description`, `image_alt` if any, `focus_keyword`, `readability_score`, `seo_score`, `keyword_density`, and `internal_linking_suggestions`) so they can be edited in the PR before merge.
5. **Never write the file before approval.**

## Output file format

```markdown
---
sujet: "{sujet}"
date: YYYY-MM-DD
platform: blog
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

{generated article body}
```

Omit `featured_image` and `image_alt` if the cover PNG was not generated. Always include the `seo_analysis` block.

## SEO fields (on approval only)

Derive from the approved article. Do **not** invent a different topic or new claims. Do **not** show these in the draft chat.

- `seo_title`: English, 50–60 characters, specific, not clickbait, not a generic “everything you need to know”. Stored as the article title in frontmatter.
- `meta_description`: English, 140–160 characters, one or two concrete sentences, topic included naturally. Stored as the excerpt in frontmatter.
- `image_alt`: describes the cover illustration, English, no “image of” / “illustration of” prefix. Omit if the cover PNG was not generated.
- `focus_keyword`: 1–3 words from `{sujet}`, lowercase. Primary keyword for SEO review. Stored in frontmatter only.

### Yoast SEO Analysis Fields (seo_analysis block)

Generate during approval by analyzing the **approved article body**. These fields support Yoast-style SEO optimization and provide metrics for review:

- `readability_score`: **Green** (Flesch Reading Ease 60–70), **Yellow** (50–59 or 71–80), or **Red** (< 50 or > 80). Target: conversational tone, varied sentence length, short paragraphs.
- `seo_score`: **Green** (keyword well-integrated, proper heading hierarchy, meta description has keyword), **Yellow** (minor gaps), or **Red** (keyword missing or poor integration).
- `keyword_density`: percentage of focus keyword occurrences in body (target: 2–3% density). Calculate as (count of exact focus keyword / total word count × 100).
- `keyword_variations`: 2–4 natural synonyms or related terms from the article that support the focus keyword (e.g., if focus keyword is "loop engineering", variations might be "measurement cycles", "feedback loops", "iterative design").
- `internal_linking_suggestions`: 2–3 specific anchors where internal links could naturally fit. Format: `"section_heading: suggested_link_anchor"` (e.g., `"Development: related_article_on_agile_practices"`). Omit if fewer than 2 clear opportunities.
- `word_count`: total word count of the article body (excluding frontmatter).

## Internal Link Suggestions (on approval only, after SEO fields)

After SEO fields are generated, the system automatically analyzes the article and suggests relevant internal links to other published blog/tutorial posts. This improves SEO and user engagement through better site structure.

**How it works:**
1. System extracts keywords and topics from the approved article
2. Compares against all published blog and tutorial posts in the database
3. Scores matches based on:
   - Keyword overlap (focus keyword and natural synonyms)
   - Topic similarity (title and subject overlap)
   - Content type (same type gets higher score)
4. Returns top 2–5 suggestions ranked by relevance score

**Workflow:**
1. After SEO fields are shown, request internal link suggestions from the API
2. Display suggestions to user in this format:
   ```
   Suggestion 1: "Understanding TypeScript Types" (89% match)
   → Anchor text: "TypeScript Types"
   → Reason: 3 keyword matches; topic overlap
   → URL: https://example.com/typescript-types
   
   Suggestion 2: ...
   ```
3. User selects which links to include (can select 0, some, or all)
4. Store selections in database via API before publishing
5. Links are automatically embedded in the WordPress post as HTML when published

**Implementation notes:**
- Only available for BLOG and TUTORIAL content types (not LinkedIn)
- Links are embedded at first occurrence of anchor text naturally found in the body
- Suggested links only appear if other published posts exist
- User can always skip this step; it's optional but recommended for SEO

## Git / PR

If `STUDIO_API_URL`, `STUDIO_EMAIL`, and `STUDIO_PASSWORD` are set, **do not open a PR**. Follow `.cursor/skills/content-studio/SKILL.md` (login → create content → patch body → approve → publish `WORDPRESS`).

Otherwise, run only after the `.md` file has been written on approval.

1. **Preconditions**: Confirm the workspace is a git repo with remote `origin` and that `gh` (GitHub CLI) is installed and authenticated. If git/remote/`gh` fails: keep the saved `.md` (and image if any), do **not** invent a remote, and explain the actionable fix (e.g. install from https://cli.github.com/ then `gh auth login`).
2. **Branch**: From up-to-date `master`, create `content/blog-YYYY-MM-DD-slug`.
3. **Commit**: Stage the new article `.md` **and** the featured image PNG when it exists. Commit message: `Add blog post: {sujet}` (use HEREDOC; follow the user's git safety rules — no force push, no config changes, no `--no-verify`).
4. **Push**: `git push -u origin HEAD`
5. **PR**: Create with `gh pr create`, base **`master`**:
   - Title: `Blog: {sujet}`
   - Body (HEREDOC):
     - Summary: 1–2 bullets (sujet + date + featured image if present)
     - Test plan: short checklist (review the `.md`, tone OK, cover visual, SEO fields)
   - Note in the reply that merging the PR to `master` syncs the article, excerpt, and featured image to WordPress (category `blog`) via GitHub Actions.

## Prompt (use verbatim)

Write a blog article in English on the topic of {sujet}, aimed at {audience}
with the goal of {objectif}.
(If {sujet} is not provided, ask for it before continuing. If {audience} and
{objectif} are not provided, propose a reasonable hypothesis and flag it
briefly rather than blocking generation.)

YOAST SEO GUIDELINES:
- Keyword integration: Place the focus keyword naturally in the title (H1),
  within the first 100 words, and in 1–2 headers. Target 2–3% keyword density.
- Readability: Aim for Flesch Reading Ease 60–70 (conversational tone).
  Vary sentence length (mix short and long), keep paragraphs short (3–4 sentences),
  and use natural transitions (However, Therefore, In addition, etc.) in at least 30% of paragraphs.
- Meta description: Write for 155–160 characters exactly. Must include the
  focus keyword naturally and compellingly (not keyword stuffed).
- Heading hierarchy: Use proper H1 → H2 → H3 structure. Only one H1 (the title).
  Use H2 for main sections, H3 for subsections if needed.
- Active voice: Favor active voice (target 80%+ of sentences).
- Internal linking opportunities: Note 2–3 specific sections where internal links
  to other articles could fit naturally (e.g., "Development: related article on X").
- Transitions and flow: Use natural connecting words between paragraphs and sections.

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

STRUCTURE (flexible skeleton — adapt, merge, or drop 1–2 elements if
the topic fits better that way; do not treat this as a rigid checklist):
- Title (H1): clear and specific to {sujet}, no clickbait.
- Lede: hook + promise of the article. Avoid stock openers
  ("What if I told you...", "In a world where...").
- Context / illustration: a genuinely relevant reference or anecdote,
  not bolted on.
- Problem: a common pitfall or mistake related to {sujet}, with a
  concrete example — real if you know it with certainty, otherwise
  framed explicitly as hypothetical ("imagine...", "a frequent case...").
- Development: 2 to 4 H2 sections that go deeper on the topic (not a
  single unbroken block).
- Actionable list: 3 to 5 concrete, specific actions, adapted to
  {audience} (not "be authentic" but what that means precisely
  in this context).
- Conclusion: one synthesis sentence, no generic motivational slogan,
  plus an opening (a question specific to the topic, or a next step).

BLOG FORMAT CONSTRAINTS:
- Target length: 800–1200 words (excluding the title).
- Allowed Markdown: `#` title, `##` sections, lists, **bold** for
  key terms. No hashtags.
- Spacious paragraphs, one strong idea per paragraph.

STYLE — AVOID (AI writing tells):
- Excess em dashes (—)
- Mirror sentences ("It's not X, it's Y")
- Decorative emojis with no function (✨🚀💡 in a row)
- Empty transition formulas ("Here's why", "The key?")
- Hollow adjectives ("powerful", "incredible", "essential") without justification
- Any structure too recognizable as a "LinkedIn growth-hacker formula" —
  vary the order or shape of sections from one article to the next

STYLE — PREFER:
- Irregular rhythm: alternate short and long sentences
- Concrete details over generalities
- One strong idea per paragraph
- Rare emojis, only functional (e.g. list bullets)

Tone calibration example (do not copy, just for cadence):
"Most people rehearse their pitch. I stopped. What works
is listening to the first question and answering that one — not the one
I had prepared for."

TONE: Professional but accessible, an assumed personal voice ("I advise",
"I've noticed that"), without excessive familiarity.

GOAL: Deliver a useful, fact-checked article, adapted to {audience}, in
service of the goal of {objectif}.
