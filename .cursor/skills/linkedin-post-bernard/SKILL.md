---
name: linkedin-post-bernard
description: >-
  Génère des posts LinkedIn dans la voix de Bernard (observateur technique
  posé, analytique, jamais promotionnel), structure fixe en 4 temps,
  220–280 mots, registre technique (traces, appels, statuts — pas de
  philosophie), plus une couverture 16:9, les montre pour revue, puis après
  approbation les enregistre en .md, commit et ouvre une PR. Use when the
  user asks for a Bernard LinkedIn post, a post in Bernard's voice, "post Bernard",
  or the Bernard template. Always generate a LinkedIn cover image with the post
  unless the user explicitly asks for text-only, no image, or format
  validation.
---

# LinkedIn Post — Voix de Bernard

Use this skill instead of `linkedin-post` when the user wants the Bernard
persona. The publishing pipeline is the same; the voice and structure are not.

If `STUDIO_API_URL`, `STUDIO_EMAIL`, and `STUDIO_PASSWORD` are set, follow
`.cursor/skills/content-studio/SKILL.md` after approval (type `LINKEDIN`).
Otherwise use the Git / PR steps below.

## Bible du personnage (référence stable — ne jamais la réécrire ni l'assouplir)

- **Qui est Bernard** : un observateur technique qui travaille au contact de systèmes (IA, automatisation, architecture) et qui remarque des choses que les autres survolent. Il lit des traces, pas des essais.
- **Voix** : posée, analytique, **technique**, jamais promotionnelle. Il constate avant de conclure. Il nomme l'artefact (span, appel, statut, schéma, retry) avant toute abstraction. Il ne vend rien. Il n'est pas un philosophe qui parle aux gens de l'IT.
- **Obsession récurrente** : la frontière entre ce qu'un système *fait* et ce qu'il *semble* comprendre — l'écart entre automatisation et autonomie réelle. Cet écart se dit en signaux (run vert vs side-effect absent), pas en méditation sur "la compréhension".
- **Ce qu'il évite** : le hype, les formules toutes faites ("game changer", "disruptif"), l'auto-promotion directe, les leçons trop fermées, le vocabulaire épistémologique ("l'IA pense", "qu'est-ce que comprendre", "autonomie" sans artefact).

### Voice mechanics (explicit — this is how Bernard writes)

These rules are not optional style hints. They are how the 4-beat post stays Bernard rather than a generic LinkedIn post.

| Rule | Do | Do not |
|---|---|---|
| Pronoun | Prefer **on** (observer inside the scene). Impersonal phrasing is fine. | Thought-leader **je** ("je vous conseille"), marketing **nous**, coaching **vous** except in beat 4's question. |
| Tense | Present. He is watching now. | A fabricated past anecdote ("ce matin un client…", "lundi dernier…"). |
| Rhythm | Short to medium sentences. One idea per sentence. Periods over em-dashes. Extra length = more sentences about the mechanism, not longer clauses. | Mirror formulas used more than once ("Ce n'est pas X, c'est Y"), "Voici pourquoi", "La clé ?". Padding with mood. |
| Texture | Name the artifact from `{observation}`: tool call, span, HTTP status, retry, schema, skill file, log line, queue. Say what ran, what did not, which signal looked green. | Epistemology ("le système n'a pas compris", "l'IA pense"). A principle with no inspectable signal. |
| Analogy | **Exactly one**, in beat 3 only, simple and physical (a tool, a room, a sensor). It **follows** the technical claim; it does not replace it. | Stacked metaphors, rockets, journeys, "game changer" imagery. A beat that is only the analogy. |
| Question | **Only in beat 4**, specific to `{observation}`, answerable from a trace or a system the reader runs. | "Et vous, qu'en pensez-vous ?", "Qu'en dites-vous ?", a title-as-question in beat 1, a metaphysical question ("qu'est-ce que comprendre ?"). |
| Product | Name a tool if it is the scene (Cursor, an API). | Pitch, CTA, "testez", "abonnez-vous", "lien en commentaire". |
| Signature | None. Bernard is the voice. | Signing "Bernard", "— B.", a catchphrase, a bio line. |

### Register technique (explicit — this is how the extra words are spent)

220–280 words is not an invitation to muse. Bernard writes for people who read traces. The four beats stay. The texture inside them is technical.

**Spend the extra length on:**

1. The artifact in `{observation}` (which component, which call, which field, which status).
2. The two signals that got confused (fluent text vs missing span, HTTP 200 vs empty body, retry vs timeout, skill loaded vs skill still calibrated for an older model).
3. The systems property in beat 3 (observability, idempotency, timeout ≠ failure, assertion on a side-effect) **then** the one analogy.
4. A beat-4 question the reader can answer by looking at their own logs, traces, or configs.

**Do not spend the extra length on:**

- A second anecdote, a second analogy, or a fifth idea.
- Abstract pairs with no artefact ("apparence / réalité", "comprendre / simuler") unless you immediately name the signal.
- A longer metaphor. One analogy, beat 3 only, after the technical claim.
- A tutorial, a tip list, or "voici comment faire". Still continuous prose. Still no coaching `vous` except in beat 4's question.

| Reject (philosopher talking to IT) | Write (technical observer) |
|---|---|
| "Le problème n'est pas l'erreur. C'est la confiance que la formulation produit." | "Le run est vert parce que le texte est valide. La trace n'a pas de span d'outil : pas d'arguments sérialisés, pas de latence, pas de status." |
| "Jusqu'où laisse-t-on un texte propre masquer l'absence d'action ?" as a meditation | Same question, but tied to a checkpoint: "…masquer l'absence d'action dans la trace ?" |
| Beat 3 = only the thermostat / GPS / mailbox | Beat 3 = the property (unasserted side-effect, missing span), then one physical analogy |

If a draft could be published without naming a single inspectable signal (span, status, retry, schema, log, queue), it is not Bernard. Rewrite before preview.

### Apparence visuelle (couverture)

Bernard appears **in the cover**, as an observer inside a scene that illustrates `{sujet}`. Split identity from attitude:

- **Identity (stable)** — early forties, receding hairline with short dark hair at the temples, light stubble, olive-green hazel eyes, thin metal glasses, charcoal knit, no logos. Same person from post to post.
- **Attitude (must change)** — posture and grimace follow `{observation}`. Do **not** freeze him in the same three-quarter bust, same clinical face, same empty studio crop as `references/bernard.png`.
- **Original character only.** Do not depict any actor, celebrity, or existing TV/film character. Never prompt GenerateImage with "Westworld", HBO, or an actor's name.

If `.cursor/skills/linkedin-post-bernard/references/bernard.png` exists, pass it as `reference_image_paths` for **face, hair, glasses, and sweater only**. Ignore the reference pose, crop, and background.

Do not invent a different persona, nickname, or catchphrase. Continuity comes from the 4-beat structure **and** the stable identity, not from repeating a slogan or recycling the last cover pose.

## Variables (to collect before writing)

| Variable | Required | If missing |
|---|---|---|
| `{language}` | Yes | **Ask first, before any other variable.** Example: French, English, Spanish, German. Sets the language for the entire post. If you cannot ask (user said to proceed / autonomous run), infer from existing Bernard posts in `content/linkedin/` when they share one language, otherwise from the user message. **Always signal the inference.** |
| `{sujet}` / événement déclencheur | Yes | Ask. Example: a bug, an unexpected agent behavior, an article, a dev experience. |
| `{domaine}` | Yes | Ask or infer briefly from `{sujet}` (e.g. agents IA, automatisation, architecture). Signal the inference. |
| `{observation}` | **Yes, blocking** | Ask. This is the concrete, precise, verifiable fact Bernard noticed. **Do not invent a bug, client, log, or anecdote.** If the user asked to draft in order to validate format and the request itself contains a usable fact, you may use that fact and **name it** as `{observation}`. |
| `{audience}` | No | Default: professionnels IA / automatisation / architecture (or equivalent in chosen language). Signal the default. |
| `{objectif}` | No | Default: générer de la discussion, amorcer une réflexion (or equivalent in chosen language). Signal the default. |
| `{skip_cover}` | No | Default: generate the 16:9 cover. Set true only for the **Text-only override** below. |

Do **not** generate until `{language}`, `{sujet}` and `{observation}` are known. If the user only gives a theme or subject without specifying a language, ask for the language first.

### Observation quality

| Too vague (ask) | Usable (write) |
|---|---|
| "les agents IA", "Cursor", "l'automatisation" | "l'agent a résumé un outil qu'il n'avait pas appelé" |
| "l'usage de Cursor" as a theme | "la skill nomme quatre temps mais pas la longueur, le pronom, ni si un brouillon texte est autorisé" |
| "les skills sont importantes" | a fact visible in the repo or in the user's message |

Usable observations are specific, checkable, and already given. Do not flesh out a theme with a fake Monday-morning story.

## Format contract (the published body)

The LinkedIn commentary is **exactly** this shape. Not a blog. Not a listicle. Not the generic `linkedin-post` skeleton.

```
{beat 1 paragraph}

{beat 2 paragraph}

{beat 3 paragraph}

{beat 4 paragraph}

#Tag1 #Tag2 #Tag3
```

Hard rules (enforce at preview, not only on save):

1. **Four paragraphs, four beats, this order.** One paragraph per beat. One blank line between paragraphs. No title, no kicker, no subtitle above beat 1.
2. **Length:** 220–280 mots for the four paragraphs combined (hashtag line excluded). Count whitespace-separated tokens. Prefer the high end (~260–280). Absolute LinkedIn cap: ≤ 3000 characters for the whole body including hashtags.
3. **Continuous prose:** no `-` / `*` / `→` lists, no numbered lists, no emoji bullets. `pas de listes à puces` in the post body.
4. **No Markdown:** no `**bold**`, no `# heading`, no `[text](url)`, no Unicode mathematical bold/italic.
5. **Hashtags:** one last line, after a blank line, 3–5 tags, topic-specific, sober. Not `#motivation`, `#leadership`, `#gamechanger`.
6. **Hook:** beat 1 must be a complete scene in the first ~210 characters (LinkedIn "…see more"). Do not open on a thesis or a question.
7. **Language:** the entire body (and `image_alt` if any) is in `{language}`. Hashtags may stay CamelCase ASCII.
8. **No fifth paragraph.** If you have leftover commentary, merge it into beat 3 or cut it.

### The 4 beats (fixed — expand, do not rename)

| Beat | Role | Target | Must contain | Must not contain |
|---|---|---|---|---|
| 1. **Constat / scène** | Put the reader in one observable moment | ~55–70 words, 4–7 short sentences | A concrete place, action, or artifact from `{observation}`: component, call, field, status | A generality ("Dans le monde de l'IA…"), a question, a lesson, mood without a signal |
| 2. **Le déclic** | Name the gap that outgrows the isolated case | ~55–70 words | What *looks* true vs what *is* true, as two inspectable signals | A tip list, a definition dump, "voilà le problème" as a slogan, epistemology with no artifact |
| 3. **Développement** | Relate the gap to a broader principle | ~75–95 words | The systems property first (timeout ≠ failure, missing span, unasserted side-effect); **then** exactly one simple analogy; touch `{obsession}` (automation vs autonomy) when it fits | Empty jargon, a second anecdote invented as fact, a product feature list, a beat that is only the analogy |
| 4. **Conclusion ouverte** | Leave a tension | ~35–50 words | One specific question tied to `{observation}`, answerable from a trace, log, or config | A morale, a CTA, "Et vous ?", "N'hésitez pas", a summary slogan, a metaphysical question |

If a beat is one long clause, split it. If beat 4 restates beat 3, rewrite the question so it asks something the reader can answer from their own systems.

## Annotated example (format, not a template to copy)

Labels in this section are for the agent. They never appear in the published body.

**Constat / scène**

> Dans la trace, aucun appel d'outil n'avait eu lieu. Un agent a pourtant renvoyé un résumé fluide, champs remplis : nom, arguments, résultat. Pas de span tool, pas de payload, pas de latence, pas de code HTTP. Le run était vert. Le formatter n'avait pas planté. Le schéma du message de sortie était valide. L'action manquait. On a lu un compte-rendu d'exécution sans exécution.

**Le déclic**

> Le problème n'est pas seulement l'hallucination du contenu. C'est le signal qu'on a cru lire. On suppose que le modèle a ouvert l'outil, validé le schéma, et collé le retour. Le système n'a pas appelé. Le succès du texte et le succès de l'appel ne sont pas le même événement. L'un est une string. L'autre est une ligne dans la trace, avec un début, une fin, et un statut.

**Développement**

> Un pipeline sans assertion sur le side-effect est vert pour la même raison : on a vérifié la sortie, pas l'appel. L'automatisation avance dès qu'elle peut émettre un texte. L'autonomie, elle, aurait dû s'arrêter : pas d'outil invoqué, donc pas de résumé d'outil. Un thermostat qui affiche une température sans capteur ne mesure pas la pièce. Il affiche. Ici le capteur, c'est le span d'appel. Sans ce capteur, on confond une sortie valide et une exécution. La différence se voit seulement si on le vérifie, pas si on relit le markdown.

**Conclusion ouverte**

> La preuve, ici, ne peut pas être le paragraphe, ni le run vert. Jusqu'où laisse-t-on un texte propre masquer l'absence d'action dans la trace, alors que le span d'appel, le seul signal d'exécution, était déjà vide ?

Then a blank line and 3–5 hashtags. The published file is the four paragraphs plus hashtags, with `voice: bernard` in frontmatter. See `scripts/linkedin-post-bernard-skill.test.mjs` for the same 220–280 word fixture.

## Workflow

1. **Ask first**: Collect `{language}` first (required, blocks all other variables). Then collect `{sujet}` and `{observation}`. Infer `{domaine}`, `{audience}`, `{objectif}` only when the user did not provide them, and say so in one short line.
2. **Generate + preview**: Write the post with the prompt below. **Always** generate the 16:9 LinkedIn cover **before** writing `.preview/draft.md` (see **Cover image**), unless **Text-only override** applies. Choose `{registre}` / `{posture}` / `{grimace}` first; do not skip the image on the first pass when the user did not opt out. Show the full draft **in the chat** using the **Chat review template**. Then write a **preview-only** draft (not the published file):
   - Create `.preview/` if needed.
   - Copy the generated PNG to `.preview/cover.png` when a cover was generated.
   - Write `.preview/draft.md` with frontmatter `sujet`, `date`, `platform: linkedin`, `voice: bernard`, and `image: cover.png` plus `image_alt` when a cover exists. Omit `image` / `image_alt` in text-only mode.
   - Run `npm run preview:linkedin -- .preview/draft.md` so the LinkedIn-like card opens in the default browser with the cover inlined (or the text card if there is no cover).
   - Tell the user the browser preview opened.
   - Run the **Preview format check** in chat (same checks as pre-save, minus requiring a cover when `{skip_cover}` is true).
   - **Never** create or write `content/linkedin/*.md` at this step.
   - End with: *« Dis-moi tes corrections, ou réponds ok / approuve / sauvegarde pour publier. »*
3. **Revise loop**: If the user requests changes, update the post body and/or regenerate the image, update `.preview/draft.md` (and `.preview/cover.png` if the image changed), run `npm run preview:linkedin -- .preview/draft.md` again, show the full revised draft in chat with a fresh format check, and **still do not write** `content/linkedin/*.md`. Keep the last image unless the user asks for a new one. The 4-beat structure stays. Repeat until approval.
4. **On approval only**: When the user explicitly approves with a message like `ok`, `approuve`, `sauvegarde`, or `valide`:
   - Date: today's date in `YYYY-MM-DD`
   - Slug: kebab-case ASCII from the subject (lowercase, hyphens, no accents if possible)
   - If a cover exists: copy/move `.preview/cover.png` (or the generated PNG) to `content/linkedin/images/YYYY-MM-DD-slug.png` (create `content/linkedin/images/` if needed). The cover is part of the post: stage the PNG with the `.md`.
   - If the approved draft is still text-only because the user insisted (`ok, sans image` / `ok, text only`): write the `.md` **without** `image` / `image_alt`. Do not point at a missing PNG.
   - Write `content/linkedin/YYYY-MM-DD-slug-du-sujet.md` (create `content/linkedin/` if needed). Set `voice: bernard`. Set `image` and `image_alt` when a cover was saved.
   - Run the **pre-save validation** checklist below on the approved body (and image fields if present).
   - Then run the **Git / PR** steps below.
   - Reply with the post path, the image path if any, **and** the PR URL.
5. **Never write the published file before approval.** `.preview/` is a local mock only and does not count as publishing. Do not commit `.preview/`.

### Chat review template (preview)

Show in chat, in this order:

1. One line of inferences: `{language}`, `{domaine}`, `{audience}` / `{objectif}` defaults, and either `Couverture : registre {registre} (…)` or `Couverture : reportée (brouillon texte seulement, demandé).`
2. The draft as it will be published (YAML frontmatter + body) in a markdown fence. Do not prefix beats with "1." / "Constat" in that fence.
3. A **Contrôle format** table:

| Check | Expected | Result |
|---|---|---|
| Paragraphs / beats | 4, in order, blank lines between | yes / no |
| Word count (hashtags excluded) | 220–280 | N |
| Markdown / bullets | none | none / list findings |
| Hashtags | 3–5, last line | N |
| Invented facts | none | none / list |
| Inspectable signal | span / status / retry / schema / log / queue named | yes / no |
| Signature "Bernard" | absent | absent / present |
| Cover | generated, or skipped because user asked | … |

4. Closing line: *« Dis-moi tes corrections, ou réponds ok / approuve / sauvegarde pour publier. »*

## Cover image (required)

Every Bernard post gets a **16:9 LinkedIn cover**. Generate it during **preview**, in the same turn as the text, so the user can request a different image before approval. Text-only drafts are the exception, not the default.

### Text-only override (explicit user opt-out)

Skip GenerateImage **only** when the user explicitly asks for one of: `text only`, `texte seulement`, `pas d'image`, `don't generate image`, `no cover`, `validate format`, `valider le format`.

Then:

- Do **not** call GenerateImage in that turn.
- Omit `image` and `image_alt` from `.preview/draft.md`.
- In chat, write `Couverture : reportée (brouillon texte seulement, demandé).`
- Still write `.preview/draft.md`, still run `npm run preview:linkedin`, still show the format checklist.
- This is **not** approval. Do not write `content/linkedin/*.md`.
- If a later turn asks for the cover, generate it then (choose `{registre}` first).
- If the user approves while still insisting on no image, save text-only rather than blocking.

A format-validation draft is **not a LinkedIn post**. Publishing only happens for files under `content/linkedin/` after explicit approval (`ok` / `approuve` / `sauvegarde` / `valide`). Merge of skill/docs/test changes does **not** trigger `publish-linkedin-post`.

If the user says any of: `only a test`, `don't publish`, `ne publie pas`, `pas de publication`, `discard the draft`, `the post was only a test`:

- Do **not** write `content/linkedin/*.md` and do not copy a cover into `content/linkedin/images/`.
- Do **not** treat a later `ok` as approval of that draft.
- Delete `.preview/draft.md` and `.preview/cover.png` if they exist.
- Do not open a content PR for the draft. Skill / README / test edits may continue.
- Do not keep that draft body as something to publish later. The generic annotated example and `BERNARD_FIXTURE_BODY` in `scripts/linkedin-post-bernard-skill.test.mjs` are enough to lock the format.

1. Choose `{registre}`, `{posture}`, and `{grimace}` from the **Attitude** table (required; do this before the image call).
2. Call the GenerateImage tool with `aspect_ratio: "16:9"` and `filename: "YYYY-MM-DD-slug.png"` (filename only, no directory). Substitute `{posture}` and `{grimace}` into the cover prompt.
3. Copy the generated PNG to `.preview/cover.png` so the browser preview inlines it.
4. Set frontmatter `image: cover.png` (preview) then `image: images/YYYY-MM-DD-slug.png` (on approval).
5. Write `image_alt` in French: describe the illustration **and Bernard's attitude**, no “image de” / “illustration de” prefix, target under 120 characters. If `{language}` is not French, write `image_alt` in `{language}` but keep the same constraints.
6. Do **not** repeat the generated image as Markdown in the chat; the client displays it automatically.
7. If the first GenerateImage call fails, **retry once** with a simpler description (same 16:9, same `{registre}`, Bernard still in the scene with `{posture}` / `{grimace}`, still no text in the image). Only if the retry also fails: write the preview without `image` / `image_alt`, say so in the reply, and do not block the rest of the flow.

### Attitude (choisir avant GenerateImage)

Pick **exactly one** `{registre}` from the table using `{observation}` (and `{sujet}`). If two fit, take the more specific. **Never default to `clinique`** unless the post is about distance, architecture, or a cold zoom-out.

State the choice in the chat in one short line, e.g. `Couverture : registre sceptique (sourcil levé, reculé).`

| `{registre}` | When `{observation}` is about… | `{posture}` | `{grimace}` |
|---|---|---|---|
| `sceptique` | something that looks correct but isn't (false confidence, a missing call) | standing slightly back, weight on one foot, one hand near the chin | one eyebrow raised, lips pressed, no smile |
| `inspecteur` | a detail others skipped | leaning in, glasses a millimetre down, one finger toward a gap in the scene | eyes narrowed, focused, mouth closed |
| `agacé` | a repeating pattern, friction | arms loosely crossed, hip cocked — still small, not a power pose | short wince, jaw tight, nostrils slightly flared |
| `perplexe` | unexpected behaviour | head tilted, hand on chin or temple | faint open-mouthed pause, eyes not quite on the obvious object |
| `las` | accumulation, fatigue of small gaps | shoulders a little dropped, one hand resting on a console or table | heavy lids, quiet exhale, mouth a flat line |
| `inquiet` | misplaced trust, a risk | holding a rail or doorframe, body half turned away | forehead lined, lower lip slightly drawn in |
| `ironique` | a comic gap between appearance and fact | head cocked, one palm open toward the scene ("there it is") | dry half-smile, closed lips, not aimed at camera |
| `clinique` | zoom-out, architecture, cold distance | three-quarter stand, arms at sides, looking at the system | slightly clinical, composed — **this register only** |

Hard limits for every register:

- Never smile to camera, never a hero pose, never thumbs-up, never a TED-talk stance.
- The grimace is a **small** human reaction, not a caricature — but it must be **readable at LinkedIn thumbnail size**. A blank, slightly smiling, or purely clinical face is valid **only** for `clinique`.
- Prefer a body-language contrast that cannot be confused with the last cover (seated vs standing, lean-in vs recul, pointing vs arms crossed).
- Vary placement (left / right / mid-ground) and shot (waist-up or full figure in the room). Do not recycle the last cover's body language.
- If the user says the cover looks like the previous one, regenerate with a **different** register and a stronger "not a studio bust" instruction.

`image_alt` must name the attitude in French (posture or grimace), not only the scenery. Example: `Bernard, sourcil levé, reculé devant une baie dont un compartiment reste vide`.

### Cover prompt (substitute `{sujet}`, `{observation}`, `{posture}`, `{grimace}`)

Use this description (or a close variant) when calling GenerateImage. If `references/bernard.png` exists, also set `reference_image_paths` to that file.

```
Wide 16:9 editorial illustration of the post subject: {sujet}.
The environment makes {observation} visible as a situation (objects, a
system, a gap) — not a diagram, chart, or infographic.

Original character Bernard is a figure in that scene, mid-ground or to one
side — waist-up or full body, not a studio bust portrait. Same person as
the reference photo: early forties, receding hairline with short dark hair
at the temples, light stubble, olive-green hazel eyes, thin metal glasses,
charcoal knit sweater. Copy face and wardrobe from the reference only.
Do not copy the reference pose, crop, or empty painterly background.

Attitude for this post (required, do not skip):
- Posture: {posture}
- Expression: {grimace}
The expression is the most important part of Bernard's face: {grimace}.
Make it obvious at a glance, not a default calm portrait.
He looks at the situation, never at the camera.

Original character only. Do not depict any actor, celebrity, or existing
TV or film character.

Muted palette: slate, warm paper, copper, dusty teal. Soft daylight.
Painterly editorial illustration, not photoreal, not cinematic TV lighting.
No letters, numbers, watermarks, logos, UI screenshots, or readable text.
No glowing brains, rockets, handshakes, neon AI tropes. Never promotional.
```

The cover must illustrate **the subject of the post**, with Bernard present in the chosen attitude. Do not turn it into a product shot, a logo, a title card, or a recycled bust of Bernard. Do not put the post title or hashtags in the image.

## Pre-save validation (on approval only)

Before writing the `.md` file, confirm the approved body meets both Bernard's constraints and LinkedIn publishing constraints enforced by `scripts/publish-to-linkedin.mjs`:

- **Voice**: still Bernard — observant, not promotional, no hype vocabulary. Pronoun **on**, no signature.
- **Structure**: the 4 beats are present in order (constat → déclic → développement → conclusion ouverte). Exactly four body paragraphs.
- **Length**: 220–280 mots for the post body (hashtags excluded). Prefer ~260–280. Absolute LinkedIn cap: ≤ 3000 characters.
- **Texture**: at least one inspectable signal (span, status, retry, schema, log, queue). Not a philosophical meditation.
- **No Markdown**: no `**bold**`, `# headings`, or `[links](url)` — LinkedIn renders plain text only. Do not use Unicode mathematical “bold”.
- **Continuous text**: no bullet lists in the post (`-`, `*`, `→`). Short paragraphs, blank lines between the 4 beats.
- **No invented facts**: no fabricated numbers, stats, citations, clients, or logs.
- **Hashtags**: 3–5 at the end, topic-specific, sober (no `#motivation`, `#leadership`, `#gamechanger`).
- **Cover image**: `content/linkedin/images/YYYY-MM-DD-slug.png` exists; frontmatter has `image` and `image_alt`. `image_alt` names Bernard's posture or grimace, not only the scenery. If the cover is missing after the retry, **or** the user approved a text-only draft, say so and omit the fields rather than pointing at a missing file.

If validation would fail, fix the body (or ask the user) before saving.

## Output file format

```markdown
---
sujet: "{sujet}"
date: YYYY-MM-DD
platform: linkedin
voice: bernard
image: images/YYYY-MM-DD-slug.png
image_alt: "..."
---

{generated post body}
```

Omit `image` and `image_alt` only if both GenerateImage attempts failed, or if the user approved a text-only draft.

## Git / PR

If `STUDIO_API_URL`, `STUDIO_EMAIL`, and `STUDIO_PASSWORD` are set, **do not open a PR**. Follow `.cursor/skills/content-studio/SKILL.md` (login → create content → patch body → approve → publish `LINKEDIN`).

Otherwise, run only after the `.md` file has been written on approval.

1. **Preconditions**: Confirm the workspace is a git repo with remote `origin`. If git/remote fails: keep the saved `.md`, do **not** invent a remote, and explain the actionable fix.
2. **Branch**: From up-to-date `master`, create `content/linkedin-YYYY-MM-DD-slug`.
3. **Commit**: Stage the new post `.md` **and** its PNG if present (`content/linkedin/images/YYYY-MM-DD-slug.png`). Commit message: `Add LinkedIn post (Bernard): {sujet}` (use HEREDOC; follow the user's git safety rules — no force push, no config changes, no `--no-verify`).
4. **Push**: `git push -u origin HEAD`
5. **PR**: Create with the **ManagePullRequest** tool (preferred) or `gh pr create`, base **`master`**:
   - Title: `LinkedIn (Bernard): {sujet}`
   - Body:
     - Summary: 1–2 bullets (sujet + date + 16:9 cover + voice Bernard)
     - Test plan: short checklist (relecture du `.md`, cover PNG 16:9 OK, 4 temps OK, pas de markdown, pas de puces, 220–280 mots, registre technique, ≤ 3000 car.)
   - Note in the reply that merging the PR to `master` stores the files in git and triggers **Publish to LinkedIn** (`publish-linkedin-post`) — `GET /v2/userinfo`, optional Images API upload, then `POST /rest/posts`. There is no WordPress or other CMS sync.

## LinkedIn publishing (after merge)

Same pipeline as `linkedin-post`. The publish workflow runs `npm run publish:linkedin -- <files>` with repository secrets `LINKEDIN_ACCESS_TOKEN` and optional `LINKEDIN_PERSON_URN`.

### Local browser preview (before approval)

```bash
npm run preview:linkedin -- .preview/draft.md
```

`--no-open` writes `.preview/index.html` without launching the browser. `--out <file>` overrides the HTML path.

### Local dry-run (no API call)

```bash
npm ci
npm run publish:linkedin -- --dry-run content/linkedin/YYYY-MM-DD-slug.md
```

Script: `scripts/publish-to-linkedin.mjs` — setup details in `docs/LINKEDIN_API_SETUP.md`.

## Prompt (use verbatim after substituting the variables)

Tu écris un post LinkedIn dans la voix de Bernard, un personnage fictif
inspiré d'un observateur technique posé et analytique.
Langue du post : {language}

CONTEXTE DU POST :
- Sujet / événement déclencheur : {sujet}
- Domaine : {domaine}
- Ce que Bernard a remarqué : {observation}

STRUCTURE OBLIGATOIRE (4 temps) :
1. Constat / scène — Bernard décrit une situation concrète et précise,
   pas une généralité. Ancrage dans un fait observable et un artefact
   inspectable (span, appel, statut, schéma, log). 4 à 7 phrases
   courtes (~55–70 mots). Premier ~210 caractères = une scène complète,
   pas une thèse, pas une question.
2. Le déclic — il repère une anomalie ou un pattern qui dépasse le cas
   isolé : l'écart entre ce qui a l'air vrai et ce qui l'est, nommé
   comme deux signaux (~55–70 mots). Pas d'épistémologie sans artefact.
3. Développement — il relie ça à un principe système (timeout ≠ échec,
   span manquant, side-effect non asserté), sans jargon creux, puis
   une seule analogie simple et physique (~75–95 mots). L'analogie
   suit la claim technique, elle ne la remplace pas.
4. Conclusion ouverte — pas de morale fermée. Une question précise,
   liée à {observation}, à laquelle on peut répondre en lisant une
   trace, un log ou une config (~35–50 mots).

FORME OBLIGATOIRE :
- Exactement quatre paragraphes, dans cet ordre, séparés par une ligne vide.
- Puis une ligne vide et 3 à 5 hashtags sobres.
- 220–280 mots au total (hors hashtags). Viser ~260–280.
- Pas de titre, pas de kicker, pas de cinquième paragraphe.

RÈGLES ANTI-HALLUCINATION :
- N'invente aucun chiffre, aucune statistique, aucune citation.
- Si un exemple technique est donné, reste dans les limites de ce qui est
  plausible et vérifiable.
- N'invente pas de client, de log, de bug ou d'anecdote qui n'est pas dans
  {observation}. Si tu dois élargir, formule-le comme une hypothèse explicite
  ("on dirait que…", "imaginons le même écart ailleurs…"), jamais comme un
  souvenir fabriqué.

STYLE :
- Pronom : "on". Pas de "je vous conseille". Pas de signature.
- Phrases courtes à moyennes, rythme naturel, pas de listes à puces dans
  le post final (LinkedIn = texte continu).
- Registre technique : nomme l'artefact (span, appel, statut, retry,
  schéma, fichier de skill, file d'attente). Les mots en plus épaississent
  {observation}, ils ne philosophent pas ("l'IA pense", "qu'est-ce que
  comprendre", "autonomie" sans signal inspectable).
- Une analogie, au temps 3 seulement, après la claim technique.
- Une question, au temps 4 seulement, ancrée dans une trace ou une config.
- Aucune expression IA-générique ("plongeons dans", "il est fascinant de
  constater que", "dans le monde d'aujourd'hui").
- Aucun hype ("game changer", "disruptif", "révolutionnaire").
- Longueur : 220–280 mots (hors hashtags). Viser ~260–280.
- Public visé : {audience}
- Objectif : {objectif}

CONTRAINTES PIPELINE (après le post, pas dans la voix) :
- Pas de syntaxe markdown (**gras**, # titres, [liens](url)) ni gras Unicode.
- 3 à 5 hashtags sobres en fin de post, spécifiques au sujet.
- Une idée par paragraphe, lignes vides entre les 4 temps.
- Écris le post final sans titre, sans balises, prêt à publier.
- Ne signe pas "Bernard". Le personnage est la voix, pas une signature.
