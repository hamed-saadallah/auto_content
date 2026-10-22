# LinkedIn Post Skill — Bernard

A Cursor skill that generates LinkedIn posts in **Bernard's** voice: a calm
technical observer. Drafts are reviewed in chat and in a browser preview,
then saved, committed, and opened as a PR after explicit approval.

This is a **voice and structure** variant of `linkedin-post`. Publishing
(preview, merge, Posts API) is the same. The prompt is not.

## Who Bernard is

Keep this bible stable from post to post. Do not rewrite it.

- **Who**: a technical observer who works with systems (AI, automation,
  architecture) and notices what others skim past. He reads traces, not essays.
- **Voice**: calm, analytical, technical, never promotional. He names the
  artifact (span, call, status, schema, retry) before any abstraction. He
  is not a philosopher talking to IT people.
- **Recurring obsession**: the gap between what a system *does* and what it
  *seems* to understand — automation vs real autonomy, said as inspectable
  signals (green run vs missing side-effect), not as epistemology.
- **Avoids**: hype, stock phrases ("game changer", "disruptif"), direct
  self-promotion, closed moral lessons, "the AI thinks", "what is understanding".

Narrative continuity comes from the **fixed 4-beat structure**, not from a
slogan or a signature.

## What it does

1. **Ask** — Collects `{language}`, the trigger subject **and** the concrete
   observation Bernard noticed. Does not invent a bug, client, or log.
2. **Generate** — Writes a 220–280 word technical post in `{language}` in 4 beats
   **and** a required 16:9 LinkedIn cover image (unless the user asks for
   text-only / format validation)
3. **Preview** — Shows the draft in chat with a format checklist, and opens
   a LinkedIn-like card with the cover inlined (`.preview/` only)
4. **Iterate** — Text or image revisions, still no `content/linkedin/` file
5. **Approve** — On `ok` / `approuve` / `sauvegarde` / `valide`, saves the
   post
6. **Publish** — Feature branch, commit, push, PR; merge publishes to LinkedIn

## How to use

```
génère un post Bernard sur [sujet]
```

Or:

```
post linkedin bernard
```

If the concrete observation is missing, the agent asks for it before writing.

Typical variables:

- **Language** — required. French, English, Spanish, German, …
- **Sujet / événement déclencheur** — a bug, an unexpected agent behavior,
  an article, a dev experience
- **Domaine** — e.g. agents IA, automatisation, architecture logicielle
- **Ce que Bernard a remarqué** — the precise, verifiable fact
- **Public visé** — optional (default: IA / automation / architecture)
- **Objectif** — optional (default: discussion, open reflection)

## Format contract

The published body is **exactly four paragraphs** (one per beat), blank lines
between them, then 3–5 hashtags. No title, no lists, no Markdown.

| Beat | Job | Length |
|---|---|---|
| 1. Constat / scène | one observable moment, with an inspectable artifact | ~55–70 words |
| 2. Le déclic | the gap as two signals (what looks true vs what is true) | ~55–70 words |
| 3. Développement | systems property first, **then** one physical analogy | ~75–95 words |
| 4. Conclusion ouverte | one specific question answerable from a trace or config | ~35–50 words |

Total: **220–280 words** (hashtags excluded), prefer ~260–280. Pronoun: **on**.
No signature. LinkedIn cap: ≤ 3000 characters. Extra length thickens the
mechanism, not the metaphor.

The 4-beat structure is fixed. Do not rename the beats or add a fifth
paragraph.

## The 4 beats (fixed)

1. **Constat / scène** — a concrete, observable situation with an inspectable artifact
2. **Le déclic** — an anomaly or pattern that outgrows the isolated case, named as two signals
3. **Développement** — a systems property, then one simple physical analogy (not the analogy alone)
4. **Conclusion ouverte** — no closed moral; a question answerable from a trace or config

The final post is continuous prose: **no bullet lists**. Hashtags (3–5, sober)
are added at the end for the publishing pipeline only.

## Cover image (required)

Each draft includes a **16:9** LinkedIn cover, generated in the same turn as
the text (GenerateImage, then copied to `.preview/cover.png`).

The picture is an **editorial illustration of `{sujet}`**, with **Bernard in
the scene**. Identity stays (glasses, charcoal knit, receding hairline, light stubble, olive-green eyes).
**Pose and grimace change with the observation** — raised eyebrow, lean-in,
wince, tilted head, etc. Original character only — not an actor likeness,
not a TV character. No letters, logos, UI text, or AI clichés.

If `.cursor/skills/linkedin-post-bernard/references/bernard.png` exists, the
agent passes it to GenerateImage for **face and wardrobe only**, not the
studio bust pose. The agent picks one register (`sceptique`, `inspecteur`,
`agacé`, `perplexe`, `las`, `inquiet`, `ironique`, `clinique`) before
generating, and names it in the preview.

Text-only is an explicit opt-out (`text only`, `pas d'image`, `validate
format`). The agent then skips GenerateImage, omits `image` / `image_alt`,
and still shows the format checklist. That is preview, not publishing.

On approval, the PNG is saved next to the markdown:

```
content/linkedin/images/YYYY-MM-DD-slug.png
```

Frontmatter must then include `image` and `image_alt`. If you dislike the
cover, ask for another image before approving.

## Workflow

```
1. Language + sujet + observation → Agent generates draft + 16:9 cover
   (or text-only if you asked to skip the image / validate format)
2. Agent writes .preview/draft.md (voice: bernard), opens browser preview,
   and prints a format checklist in chat (4 beats, 220–280 words, no markdown)
3. You review and either:
   a) Request changes → draft + preview refresh → back to step 2
   b) Approve with: ok / approuve / sauvegarde / valide
4. Agent saves content/linkedin/YYYY-MM-DD-slug.md (+ cover PNG unless
   you approved text-only)
5. Agent creates a feature branch, commits, pushes, opens a PR
6. Agent replies with file paths + PR URL
```

## Output files

```
content/linkedin/YYYY-MM-DD-slug.md
content/linkedin/images/YYYY-MM-DD-slug.png
```

Example frontmatter:

```markdown
---
sujet: "un agent qui reformule sans avoir lu l'outil"
date: 2026-09-14
platform: linkedin
voice: bernard
image: images/2026-09-14-agent-reformule-sans-outil.png
image_alt: "Bernard, sourcil levé, reculé devant une baie dont un compartiment reste vide"
---
```

LinkedIn does not render Markdown. Formatting is structural only: short
paragraphs and blank lines between the four beats. No `→` bullets.

## Browser preview

```bash
npm run preview:linkedin -- .preview/draft.md
```

`.preview/` is gitignored. The published `.md` is written only after approval.

## Git & PR

After approval:

1. Branch: `content/linkedin-YYYY-MM-DD-slug`
2. Commit: `Add LinkedIn post (Bernard): {sujet}`
3. PR title: `LinkedIn (Bernard): {sujet}`
4. Base: `master`

Merge to `master` stores the files in git and triggers **Publish to LinkedIn**.

Local dry-run:

```bash
npm ci
npm run publish:linkedin -- --dry-run content/linkedin/YYYY-MM-DD-slug.md
```

## File location in the repo

```
.cursor/skills/linkedin-post-bernard/
├── SKILL.md      (agent instructions: bible, 4 beats, prompt, pipeline)
├── README.md     (this file)
└── references/
    └── bernard.png   (visual reference for cover illustrations)
```

Related skill: `.cursor/skills/linkedin-post/` (generic LinkedIn posts, not Bernard).

## Customization

Edit `.cursor/skills/linkedin-post-bernard/SKILL.md`:

- The **character bible** should stay stable. Change it only if Bernard's
  identity itself changes.
- The **4-beat structure** should stay fixed. That is the continuity device.
- The **cover prompt** can be tuned; keep 16:9, no text in the image, Bernard
  in the scene, and illustrate `{sujet}`. Identity stays; **posture and
  grimace must vary** with `{observation}` (see the attitude table in
  `SKILL.md`). Do not copy a TV/film character, and do not copy the
  reference portrait's pose.
- The **prompt** variables can grow; do not drop `{observation}`.
- Publishing (preview, branch names, LinkedIn API) can follow `linkedin-post`.

## Tips

- Give Bernard a **specific observation**, not a theme. "Les agents IA" is too
  wide. "L'agent a résumé un outil qu'il n'avait pas appelé" is usable.
- Extra length must name a mechanism (span, status, retry, schema), not pad
  a metaphor. If the draft could run without an inspectable signal, rewrite.
- Do not ask Bernard to sell a product, a course, or a personal brand.
- If a revision pushes the draft into hype, lists, philosophy, or a closed
  lesson, pull it back to the four beats.
- To review **format only**, say `text only` / `validate format`. You will
  get the four paragraphs in chat, no cover, no `content/linkedin/` file.
- If the draft was **only a test**, say `don't publish` / `ne publie pas`.
  The agent discards `.preview/`, does not write `content/linkedin/`, and
  does not trigger LinkedIn. Skill edits can still land. `publish-linkedin-post`
  runs only when a file under `content/linkedin/` is merged to `master`.
