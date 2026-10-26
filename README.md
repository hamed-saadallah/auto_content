# Skills

This repo ships **Cursor project skills** under `.cursor/skills/`. Ask for a blog, tutorial, LinkedIn post, carousel, product showcase, or concept explanation in **Agent chat**. The matching skill drafts in the conversation first; it writes files and publishes **only after you approve**.

**To use them from Cursor:** open **this** folder (the one that contains `.cursor/skills/`), switch the chat to **Agent**, then type a request or `/skill-name`. Full colleague walkthrough: [`setup.md` → Use this project from Cursor chat](./setup.md#use-this-project-from-cursor-chat).

Env vars, Node, GitHub Actions, and Content Studio: [`setup.md`](./setup.md). Agent instructions live in each skill’s `SKILL.md`. Human-oriented notes live in each skill’s `README.md`.

## Shared workflow

Every content skill follows the same loop:

1. **Ask** — If a required field is missing (subject, language, observation, …), the agent asks before writing.
2. **Generate** — Draft in chat. LinkedIn skills also open a local browser preview under `.preview/` (gitignored).
3. **Revise** — Request edits. The file under `content/` is still not written.
4. **Approve** — Reply with `ok`, `approve`, `save`, `publish`, `approuve`, `sauvegarde`, or `valide` (LinkedIn skills use the French set). Then the agent generates remaining assets (cover, SEO, PDF) and saves.
5. **Publish**
   - **Default:** branch → commit → push → PR against `master`. Merge runs GitHub Actions.
   - **Studio fallback:** if `STUDIO_API_URL`, `STUDIO_EMAIL`, and `STUDIO_PASSWORD` are set, the agent publishes through the Content Studio API and **does not open a PR**. See [content-studio](#content-studio).

Never treat `.preview/` as published. Do not commit it.

### Where files land after approval

| Skill | Markdown | Extra assets | Merge publishes to |
|---|---|---|---|
| `create-blog-post` | `content/blog/YYYY-MM-DD-slug.md` | `content/blog/images/…png` | WordPress category **blog** |
| `create-tutorial-for-blog` | `content/tutorials/YYYY-MM-DD-slug.md` | `content/tutorials/images/…png` | WordPress category **tutorials** |
| `linkedin-post` | `content/linkedin/YYYY-MM-DD-slug.md` | optional 16:9 PNG | LinkedIn Posts API |
| `linkedin-post-bernard` | same | 16:9 PNG (unless text-only) | LinkedIn Posts API |
| `linkedin-explain-concept` | same | 16:9 diagram / schema / illustration | LinkedIn Posts API |
| `linkedin-product-showcase` | same | 16:9 illustration | LinkedIn Posts API |
| `create-linkedin-carousel` | `content/linkedin/carousel/YYYY-MM-DD-slug.md` | slide PNGs + PDF | LinkedIn document post |

Keep the frontmatter key `sujet` (do not rename it to `subject`).

## Which skill to use

| You want to… | Skill to ask for |
|---|---|
| Write a long-form English article | `create-blog-post` |
| Write an English how-to | `create-tutorial-for-blog` |
| Write a generic LinkedIn post (hook, lesson, question) | `linkedin-post` |
| Write in **Bernard’s** voice (4 beats, traces, 220–280 words) | `linkedin-post-bernard` |
| Explain **one** concept with a diagram/schema + table or code | `linkedin-explain-concept` |
| Present **your** product/project (stack, features, GitHub/site, CTA) | `linkedin-product-showcase` |
| Build a Gamma-style swipeable deck | `create-linkedin-carousel` |
| Publish an already-approved draft via the Railway / studio app | `content-studio` |

The LinkedIn skills route to each other. If you say “post Bernard”, the generic LinkedIn skill hands off to Bernard. If you say “explain debounce vs throttle with a schema”, it hands off to explain-concept.

---

## create-blog-post

**Path:** `.cursor/skills/create-blog-post/`

Generates an **English** long-form article (about 800–1200 words), shows the body in chat, then on approval writes markdown + a 16:9 cover + Yoast-style SEO fields, opens a PR, and on merge syncs to WordPress.

### How it works

1. You give a `{sujet}` (or the agent asks). Optional `{audience}` and `{objectif}` are inferred if missing.
2. Draft appears **in chat only**. No SEO fields, no file, no image yet.
3. On approval the agent:
   - Generates a 16:9 cover (`content/blog/images/YYYY-MM-DD-slug.png`)
   - Derives `seo_title`, `meta_description`, `focus_keyword`, and `seo_analysis`
   - Optionally suggests 2–5 internal links to other published posts
   - Writes `content/blog/YYYY-MM-DD-slug.md`
   - Creates branch `content/blog-YYYY-MM-DD-slug`, commit `Add blog post: {sujet}`, PR title `Blog: {sujet}`

Cover failure does not block the PR: `featured_image` / `image_alt` are omitted and mentioned in the reply.

### How to use

```
write a blog post on loop engineering
```

```
write a blog post
```

(The agent asks for the subject if you omit it.)

Approve with `ok` / `approve` / `save` / `publish` / `approuve` / `sauvegarde` / `valide`.

### Article shape

Title → lede → context → problem → 2–4 H2 sections → 3–5 concrete actions → conclusion. Markdown allowed (`#`, `##`, lists, **bold**). No hashtags.

### Local WordPress dry-run

```bash
npm run sync:wordpress -- content/blog/YYYY-MM-DD-slug.md
```

---

## create-tutorial-for-blog

**Path:** `.cursor/skills/create-tutorial-for-blog/`

Same pipeline as the blog skill, for **English how-tos** (about 1200–2000 words) with numbered steps, code blocks, and a troubleshooting section. WordPress category is **tutorials**.

### How it works

Ask → chat draft (no SEO, no file) → revise → approve → 16:9 cover + SEO → `content/tutorials/YYYY-MM-DD-slug.md` → branch `content/tutorial-YYYY-MM-DD-slug` → PR `Tutorial: {sujet}` → merge syncs to WordPress.

The agent must not invent CLI flags, API fields, or menu labels. Uncertain commands are omitted or marked as gaps.

### How to use

```
write a tutorial on setting up a vector index
```

```
create a tutorial for Cursor skills
```

### Tutorial shape

How-to title → outcome → prerequisites → numbered steps (one action each, expected result when useful) → pitfalls → recap + next step. Fenced code and inline code are allowed.

---

## linkedin-post

**Path:** `.cursor/skills/linkedin-post/`

Default **French** (or the language you set) LinkedIn post: hook, illustration, problem, 3–5 actions, central message, question, 3–5 hashtags. Target 150–250 words, hard cap **3000 characters**. LinkedIn does not render Markdown — plain text only, `→` bullets, blank lines.

### How it works

1. Agent asks for `{language}` first, then `{sujet}`.
2. Writes the post **and** a 16:9 cover during preview.
3. Writes `.preview/draft.md` + `.preview/cover.png` and runs `npm run preview:linkedin`.
4. On approval, copies to `content/linkedin/`, validates (no `**`, no `#`, no `[links](url)`, ≤ 3000 chars), then PR `LinkedIn: {sujet}` on branch `content/linkedin-YYYY-MM-DD-slug`.
5. Merge runs **Publish to LinkedIn** (`scripts/publish-to-linkedin.mjs`): `/v2/userinfo`, optional Images API upload, then `POST /rest/posts`.

No WordPress sync.

### How to use

```
génère un post linkedin sur loop engineering
```

```
write a linkedin post about RAG vs agentic RAG
```

If you actually want Bernard, a product showcase, or a concept + diagram, say so — this skill will route.

### Preview / dry-run

```bash
npm run preview:linkedin -- .preview/draft.md
npm run publish:linkedin -- --dry-run content/linkedin/YYYY-MM-DD-slug.md
```

---

## linkedin-post-bernard

**Path:** `.cursor/skills/linkedin-post-bernard/`

Same publish pipeline as `linkedin-post`. Different **voice and format**. Bernard is a calm technical observer: he names spans, calls, statuses, retries — not philosophy, not a product pitch.

### How it works

Required before writing: `{language}`, `{sujet}`, and a **concrete `{observation}`** (a checkable fact, not “les agents IA”). The agent will not invent a bug, client, or log.

Published body is **exactly four paragraphs**, then 3–5 hashtags:

| Beat | Job | Length |
|---|---|---|
| 1. Constat / scène | One observable moment + inspectable artifact | ~55–70 words |
| 2. Le déclic | What looks true vs what is true, as two signals | ~55–70 words |
| 3. Développement | Systems property, then **one** physical analogy | ~75–95 words |
| 4. Conclusion ouverte | One question answerable from a trace or config | ~35–50 words |

Total **220–280 words** (hashtags excluded), prefer ~260–280. Pronoun **on**. No lists, no Markdown, no “Bernard” signature.

Cover is required: 16:9 scene with Bernard in it. Face/wardrobe can follow `references/bernard.png`; pose and grimace must change with the observation (`sceptique`, `inspecteur`, `agacé`, …). Text-only only if you explicitly ask (`text only`, `pas d'image`, `validate format`).

Chat preview includes a **format checklist** (4 beats, word count, no markdown, inspectable signal, cover).

### How to use

```
génère un post Bernard sur [sujet]
```

```
post linkedin bernard
```

Give a usable observation, for example: *l'agent a résumé un outil qu'il n'avait pas appelé*.

To check format only: `text only` / `validate format` — no cover, no `content/linkedin/` file. To discard a test draft: `don't publish` / `ne publie pas`.

PR title: `LinkedIn (Bernard): {sujet}`. Frontmatter includes `voice: bernard`.

---

## linkedin-explain-concept

**Path:** `.cursor/skills/linkedin-explain-concept/`

Pedagogical LinkedIn post for **one precise concept**: definition, ASCII table and/or raw code snippet, plus a 16:9 **diagram / schema / illustration**. Long post: aim 2400–2850 escaped characters, cap 3000.

### How it works

1. Asks `{language}` first, then `{concept}` (not a vague theme). Optional: `{angle}`, `{visuel}`, `{support}` (`tableau` / `code` / `les_deux`), `{langage}`.
2. Generates copy + image. Tables and code stay in the **body as plain text** (LinkedIn does not render Markdown fences). Short labels are allowed **in the image** only for `diagramme` / `schema`.
3. Preview via `.preview/` + `npm run preview:linkedin`.
4. On approval: `type: explain-concept` in frontmatter, PR `LinkedIn (concept): {concept}`.

At least one of ASCII table or raw code must appear. No `**`, no `#`, no ``` fences.

### How to use

```
explique le concept debounce vs throttle sur LinkedIn
```

```
post linkedin concept : event sourcing
```

```
génère un schéma LinkedIn pour expliquer le CAP theorem
```

---

## linkedin-product-showcase

**Path:** `.cursor/skills/linkedin-product-showcase/`

Showcase **your** product or project: stack, architecture, why those choices, features tied to problems, GitHub and/or live URL, CTA to test. Target 200–350 words. Not Bernard, not a generic thought-leadership post.

### How it works

Required: `{language}`, `{projet}`, `{problème}`, `{fonctionnalités}`. At least one URL (GitHub or site) before publish.

If the project is this repo, the agent reads `README.md`, manifests, and `docs/` and **does not invent** frameworks or metrics.

Cover is a 16:9 illustration of the product domain — no readable UI screenshots, logos, or letters.

Frontmatter: `type: product-showcase`, optional `lien_github` / `lien_site`. URLs must also appear **in the post body** (LinkedIn ignores frontmatter for display).

### How to use

```
présente mon projet sur linkedin
```

```
showcase linkedin pour [nom du produit] — stack nestjs + react
```

```
post linkedin projet : explique l'architecture et mets le lien github
```

PR title: `LinkedIn (showcase): {projet}`.

---

## create-linkedin-carousel

**Path:** `.cursor/skills/create-linkedin-carousel/`

Gamma-style **swipeable deck**: 8–10 typographic 4:5 slides (default), optional 16:9 accent illustrations, LinkedIn commentary, PDF export. Merge publishes a **document post** (not an image carousel).

### How it works

1. Asks `{language}` first, then `{sujet}`. Optional: `{slide_count}` (2–20), `{theme}`, `{skip_images}`.
2. Writes `.preview/carousel-draft.md` + optional `.preview/slides/slide-NN-bg.png` and runs `npm run preview:carousel` (swipeable browser preview).
3. Slides use CSS layouts by `role` (`hook`, `problem`, `why`, `value`, `mistakes`, `cta`). Role names are **not** printed on the slide; the renderer shows `01 / 09`. Images sit in a reserved well — a slide still looks finished without one.
4. On approval: copies assets to `content/linkedin/carousel/`, builds the PDF, validates commentary (plain text, ≤ 3000 chars, 3–5 hashtags, no “Swipe →”), then PR `LinkedIn carousel: {sujet}`.
5. Merge runs **Publish LinkedIn Carousel**: Documents API upload → wait until `AVAILABLE` → Posts API with `urn:li:document:…`.

### How to use

```
génère un carousel linkedin sur [subject]
```

```
create linkedin carousel about [subject]
```

### Commands

```bash
npm run preview:carousel -- .preview/carousel-draft.md
npm run build:carousel-pdf -- content/linkedin/carousel/YYYY-MM-DD-slug.md
npm run publish:carousel -- --dry-run content/linkedin/carousel/YYYY-MM-DD-slug.md
```

Output layout:

```
content/linkedin/carousel/YYYY-MM-DD-slug.md
content/linkedin/carousel/images/YYYY-MM-DD-slug/slide-01-bg.png   # optional
content/linkedin/carousel/pdfs/YYYY-MM-DD-slug.pdf
```

---

## content-studio

**Path:** `.cursor/skills/content-studio/`

Not a writer. It is the **no-PR publish path** for an already-approved blog, tutorial, or LinkedIn draft when the studio API is configured.

### How it works

Requires `STUDIO_API_URL`, `STUDIO_EMAIL`, `STUDIO_PASSWORD`.

1. Follow the matching writer skill through generate → review → explicit approval (`ok` / `approve` / `approuve` / `valide`).
2. Do **not** write `content/**` and do **not** open a PR.
3. `POST /api/auth/login` → `POST /api/contents` (`generate: false`) → `PATCH` body → `POST /approve` (server builds cover + SEO) → `POST /publish`.
4. Channel: `WORDPRESS` for blog/tutorial, `LINKEDIN` for every LinkedIn variant (including Bernard). `type` is uppercase: `BLOG` | `TUTORIAL` | `LINKEDIN`.
5. Reply with the studio content id plus `wordpressUrl` or `linkedinPostId`.
6. If login or publish fails, keep the draft in chat. Do not silently fall back to a PR unless you ask.

Run the studio itself with [`setup.md`](./setup.md) §4. Product notes: [`docs/CONTENT_STUDIO.md`](./docs/CONTENT_STUDIO.md).

### How to use

```
publish this via the studio
```

Or just approve a draft while `STUDIO_*` is set in the agent environment — the writer skills detect it and switch to this path.

---

## Customize a skill

Edit the `SKILL.md` in that folder:

- Approval keywords
- Prompt / structure
- Branch names and PR titles (base is `master`)
- Cover-image brief

Keep Bernard’s character bible and 4-beat contract stable unless the persona itself changes.

To reuse a skill in another project, copy the folder into that repo’s `.cursor/skills/` directory.
