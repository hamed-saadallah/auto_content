---
name: create-linkedin-carousel
description: >-
  Génère un carousel LinkedIn style Gamma (cartes typographiques, accent
  visuel optionnel), avec aperçu swipeable, export PDF, puis après
  approbation enregistre, commit et ouvre une PR. Le merge publie le
  carousel (document PDF) sur LinkedIn. Use when the user asks to create a
  carousel, LinkedIn carousel, or Gamma-style slide deck.
---

# LinkedIn Carousel Generation (Gamma-style)

## Workflow

1. **Ask first**: If `{language}` is missing, **ask for it first** (required, blocks all other variables). Example: French, English, Spanish, German. Once language is confirmed, ask for `{sujet}` if missing. Do **not** generate content until both language and subject are known. Optional: `{slide_count}` (default 8–10), `{audience}`, `{objectif}`, `{theme}` (color mood, e.g. "papier crème, encre, cuivre"), `{skip_images}` (skip accent illustrations).
2. **Generate + preview**: Once `{language}` and `{sujet}` are known, write the carousel following the prompt below. Unless the user skipped images, generate **one 16:9 accent illustration per slide** during preview (see **Slide accents**). Show a slide-by-slide summary **in chat**. Then write **preview-only** files:
   - Create `.preview/` if needed.
   - Write `.preview/carousel-draft.md` with frontmatter (slides array, theme, platform) and commentary body.
   - Save accents to `.preview/slides/slide-01-bg.png`, … and reference them from `background` only when the file exists.
   - Run `npm run preview:carousel -- .preview/carousel-draft.md` to open the swipeable browser preview.
   - Tell the user the browser preview opened.
   - **Never** create or write `content/linkedin/carousel/*.md` at this step.
   - End with: *« Dis-moi tes corrections, ou réponds ok / approuve / sauvegarde pour publier. »*
3. **Revise loop**: If the user requests changes, update slide copy and/or regenerate specific accents, refresh `.preview/carousel-draft.md`, rerun preview, show revised summary in chat, and **still do not write** `content/linkedin/carousel/*.md`. Repeat until approval.
4. **On approval only**: When the user explicitly approves with `ok`, `approuve`, `sauvegarde`, or `valide`:
   - Date: today's date in `YYYY-MM-DD`. Slug: kebab-case ASCII from the subject.
   - Copy existing accents to `content/linkedin/carousel/images/YYYY-MM-DD-slug/slide-NN-bg.png`.
   - Write `content/linkedin/carousel/YYYY-MM-DD-slug.md` with permanent paths in frontmatter. Omit `background` on slides that have no image.
   - Set `document: pdfs/YYYY-MM-DD-slug.pdf` and `document_title: YYYY-MM-DD-slug.pdf`.
   - Run `npm run build:carousel-pdf -- content/linkedin/carousel/YYYY-MM-DD-slug.md`.
   - Run **pre-save validation** below on the approved commentary and slides.
   - Then run **Git / PR** steps.
   - Reply with carousel path, PDF path, image folder (if any), PR URL, and slide count.
5. **Never write the published file before approval.** `.preview/` is local only. Do not commit `.preview/`.

## Slide accents

Generate one **optional** 16:9 editorial illustration per slide during **preview**. It sits in a reserved well; titles and bullets are HTML/CSS. Slides must look finished without an image (grain / color block).

- Call the GenerateImage tool with `aspect_ratio: "16:9"` and `filename: "slide-NN-bg.png"` (filename only).
- Copy each PNG to `.preview/slides/slide-NN-bg.png` and reference it from the draft frontmatter.
- Description: concrete editorial scene for slide {N}'s idea about `{sujet}`. Match the `{theme}` mood. No letters, watermarks, logos, or UI text. No stock clichés (glowing brains, handshakes, rockets, generic laptops).
- Do **not** embed text in generated images — titles and bullets are rendered in HTML/CSS.
- Do **not** print `role` names (`hook`, `problem`, `cta`, …) on the slide. The renderer shows `01 / 09`.
- If the user skips images, or image generation fails for a slide: omit that `background` path. The CSS well still looks complete. Mention failures. Do **not** block the preview or PR.

## Pre-save validation (on approval only)

Before writing the published `.md`, confirm:

- **Language**: slides and commentary are in `{language}`.
- **Slides**: 8–10 by default (or user-specified `{slide_count}` within 2–20).
- **Copy**: one idea per slide; title ≤ 80 chars; body ≤ 400 chars (2–3 sentences); ≤ 5 bullets; target ~80 words, hard cap ~90.
- **Commentary**: plain text, ≤ 3000 chars, no Markdown (`**`, `#`, `[links](url)`), 3–5 hashtags at end. No “Swipe →” / “Swipe le PDF”.
- **Structure**: default is hook → problem/why → value → optional mistakes → CTA. Vary the middle when the subject needs it. Last slide is always a CTA.
- **Assets**: `background` is optional; if set, the file must exist. PDF built successfully at `document` path.

Fix issues before saving if validation would fail.

## Output file format

```markdown
---
sujet: "{sujet}"
date: YYYY-MM-DD
platform: linkedin-carousel
slide_count: 9
theme:
  bg: "#f6f1e8"
  ink: "#191919"
  accent: "#b4532a"
  font: "Georgia, serif"
document: pdfs/YYYY-MM-DD-slug.pdf
document_title: "YYYY-MM-DD-slug.pdf"
slides:
  - id: 1
    role: hook
    title: "..."
    body: "..."
    background: images/YYYY-MM-DD-slug/slide-01-bg.png
  - id: 2
    role: problem
    title: "..."
    body: "..."
    bullets: ["...", "...", "...", "..."]
---

{commentary — plain-text LinkedIn caption, hashtags at end}
```

`role` drives CSS layout only (`hook`, `problem`, `why`, `value`, `mistakes`, `cta`). It is never visible slide copy. `primary` / `secondary` in theme still work as aliases for `accent` / `ink`.

## Git / PR

Run only after the `.md`, any PNGs, and the PDF have been written on approval.

1. **Preconditions**: Confirm git repo with remote `origin`.
2. **Branch**: From up-to-date `master`, create `content/linkedin-carousel-YYYY-MM-DD-slug`.
3. **Commit**: Stage the `.md`, any slide PNGs, and the PDF. Commit message: `Add LinkedIn carousel: {sujet}`.
4. **Push**: `git push -u origin HEAD`
5. **PR**: Create with the **ManagePullRequest** tool, base **`master`**:
   - Title: `LinkedIn carousel: {sujet}`
   - Body: summary (sujet, date, slide count, PDF) + test plan (review slides, swipe preview, commentary OK, PDF present)
   - Note that merging triggers **Publish LinkedIn Carousel** workflow — Documents API upload + Posts API document post.

## LinkedIn publishing (after merge)

Workflow runs `npm run publish:carousel -- <files>` with the same secrets as text posts:

| Secret | Description |
|--------|-------------|
| `LINKEDIN_ACCESS_TOKEN` | OAuth token with `openid`, `profile`, `email`, `w_member_social` |
| `LINKEDIN_PERSON_URN` | Optional; resolved via `/v2/userinfo` if omitted |

### Local browser preview (before approval)

```bash
npm run preview:carousel -- .preview/carousel-draft.md
```

`--no-open` writes HTML without opening the browser. `--out <file>` overrides the output path.

### Build PDF (on approval)

```bash
npm run build:carousel-pdf -- content/linkedin/carousel/YYYY-MM-DD-slug.md
```

### Local dry-run (no API call)

```bash
npm ci
npm run publish:carousel -- --dry-run content/linkedin/carousel/YYYY-MM-DD-slug.md
```

Script: `scripts/publish-carousel-to-linkedin.mjs` — setup details in `docs/LINKEDIN_API_SETUP.md`.

## Prompt (use verbatim)

Rédige un carousel LinkedIn percutant sur le thème de {sujet}, destiné à {audience}
dans un objectif de {objectif}.
Langue du carousel : {language}

(Si {language} ou {sujet} n'est pas fourni, demande-le avant de continuer. Si {audience},
{objectif} ou {slide_count} ne sont pas fournis, propose une hypothèse raisonnable et
signale-la brièvement plutôt que de bloquer la génération. Cible {slide_count} slides,
par défaut 8 à 10.)

RÈGLE DE VÉRIFICATION FACTUELLE (prioritaire) :
- N'invente jamais de statistique, date, nom d'étude ou citation attribuée à une
  personne/source réelle.
- Si tu n'es pas certain qu'un fait soit exact, reformule-le comme une observation
  personnelle plutôt qu'un fait établi — mais uniquement s'il s'agit réellement
  d'un point de vue générique, pas d'un événement précis inventé.
- Les références théoriques/culturelles doivent être limitées à des éléments
  très largement connus — jamais de statistique chiffrée précise ni de date exacte
  sauf certitude absolue.
- En cas de doute sur une référence : l'omettre plutôt que de la garder en espérant
  qu'elle soit correcte.

STRUCTURE CAROUSEL (squelette par défaut — varie le milieu si le sujet s'y prête
mieux ; termine toujours par un CTA) :
- Slide 1 (hook) : titre accrocheur + corps de 2–3 phrases ; 2–3 puces optionnelles.
- Slides 2–3 (problem/why) : corps de 2–3 phrases ET 4–5 puces (exemple concret
  ou cas fréquent explicitement présenté comme tel).
- Slides 4–7 (value) : une idée par slide, corps + 4–5 puces, actions concrètes
  pour {audience}.
- Slide 8 (mistakes, optionnel) : corps court + 4–5 erreurs fréquentes et leur correction.
- Dernière slide (cta) : titre + corps + prochaine étape concrète ; 2–3 puces optionnelles.
- Commentary LinkedIn (hors slides) : accroche complémentaire, contexte bref, question
  d'engagement, 3–5 hashtags spécifiques.

DENSITÉ PAR SLIDE :
- Format par défaut : titre + corps (2–3 phrases) + 4–5 puces.
- Cible ~80 mots par slide (plafond validateur ~90).
- Une seule idée forte ; le corps développe, les puces détaillent.

CONTRAINTES DE FORMAT CAROUSEL :
- Titres courts (≤ 12 mots). Puces ≤ 16 mots chacune.
- Pas de markdown dans le commentary LinkedIn.
- N'écris jamais « Swipe → », « Swipe le PDF » ni le nom du rôle (hook, problem, cta)
  sur une slide. L'index 01 / 09 est rendu par le HTML.
- Ton professionnel mais accessible, voix personnelle assumée.

STYLE - À ÉVITER (marqueurs d'écriture IA) :
- Tirets cadratins (—) en excès
- Phrases en miroir ("Ce n'est pas X, c'est Y")
- Emojis décoratifs sans fonction
- Formules de transition creuses ("Voici pourquoi", "La clé ?")
- Adjectifs vides sans justification
- Structure trop reconnaissable de "formule LinkedIn growth-hacker"

STYLE - À PRIVILÉGIER :
- Rythme irrégulier, détails concrets, une idée par slide
- Variété entre slides hook, liste, question, CTA

TON : Professionnel mais accessible, touche personnelle assumée ("je conseille",
"j'ai remarqué que"), sans excès de familiarité.

OBJECTIF : Transmettre une leçon utile et vérifiée en format swipeable, adaptée à
{audience}, en servant l'objectif de {objectif}, avec un commentary LinkedIn qui
invite à ouvrir le document.
