# LinkedIn Carousel Skill

A Cursor skill that generates Gamma-style LinkedIn carousels: typographic 4:5 cards, optional 16:9 accent illustrations, swipeable browser preview, PDF export, review loop, then git commit and PR. Merging publishes the PDF as a LinkedIn document post.

## What it does

1. **Generate** — Writes 8–10 slides + LinkedIn commentary from a language + subject
2. **Preview** — Opens a swipeable 4:5 deck in the browser (`.preview/` only)
3. **Iterate** — Revise copy or individual slide accents before saving
4. **Approve** — On `ok` / `approuve` / `sauvegarde` / `valide`, saves markdown, optional PNGs, and PDF
5. **Publish** — PR merge triggers Documents API upload + Posts API document post

## How to use

```
génère un carousel linkedin sur [subject]
```

Or:

```
create linkedin carousel about [subject]
```

The agent asks for the language first, then the subject if missing.

## Workflow

```
1. Language + subject → Agent generates slides + optional accents + commentary
2. Agent writes .preview/carousel-draft.md, opens browser preview
3. You review and request edits or approve
4. Agent saves content/linkedin/carousel/YYYY-MM-DD-slug.md + images (if any) + PDF
5. Agent creates branch, commits, pushes, opens PR
6. Merge → GitHub Action publishes document carousel to LinkedIn
```

Slides use CSS layouts by role (`hook`, `problem`, `why`, `value`, `mistakes`, `cta`). Default copy is a title, a 2–3 sentence body, and 4–5 bullets (~80 words). Images are optional accents in a reserved well, not full-bleed backgrounds. A slide without an image still looks finished.

## Commands

```bash
# Browser preview (draft)
npm run preview:carousel -- .preview/carousel-draft.md

# Build PDF (on approval)
npm run build:carousel-pdf -- content/linkedin/carousel/YYYY-MM-DD-slug.md

# Validate publish payload
npm run publish:carousel -- --dry-run content/linkedin/carousel/YYYY-MM-DD-slug.md
```

## Output layout

```
content/linkedin/carousel/
  YYYY-MM-DD-slug.md
  images/YYYY-MM-DD-slug/slide-01-bg.png   # optional
  pdfs/YYYY-MM-DD-slug.pdf
```

## Prerequisites

- Git repo with remote `origin`
- `npm ci` (installs `puppeteer` for PDF export)
- LinkedIn secrets for auto-publish: `LINKEDIN_ACCESS_TOKEN`, optional `LINKEDIN_PERSON_URN`

See [`docs/LINKEDIN_API_SETUP.md`](../../../docs/LINKEDIN_API_SETUP.md) for API setup and troubleshooting.
