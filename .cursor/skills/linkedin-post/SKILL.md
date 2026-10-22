---
name: linkedin-post
description: >-
  Génère des posts LinkedIn percutants en français, les montre pour revue,
  puis après approbation les enregistre en .md, commit et ouvre une PR.
  Le merge publie le post sur LinkedIn et le conserve dans git (pas de
  WordPress). Use when the user asks to write a LinkedIn post or generate
  social content from a sujet/thème. If the user asks for a Bernard post
  (voix de Bernard, post Bernard, template Bernard), use
  linkedin-post-bernard instead. If the user asks to present a product or
  project (stack, architecture, features, GitHub/site link, CTA to test),
  use linkedin-product-showcase instead. If the user asks to explain a precise
  concept with a diagram/schema and a table or code snippet, use
  linkedin-explain-concept instead.
---

# LinkedIn Post Generation

## Routing

If the user asks for a **Bernard** post, follow
`.cursor/skills/linkedin-post-bernard/SKILL.md` instead of this skill.

If the user asks to **present a product or project** (showcase, stack,
architecture, features, link + CTA), follow
`.cursor/skills/linkedin-product-showcase/SKILL.md` instead of this skill.

If the user asks to **explain a precise concept** (diagramme / schéma /
illustration + tableau ou code), follow
`.cursor/skills/linkedin-explain-concept/SKILL.md` instead of this skill.

## Workflow

1. **Ask first**: If `{language}` is missing, **ask for it first** (required, blocks all other variables). Example: French, English, Spanish, German. Once language is confirmed, then ask for `{sujet}` if missing. Do **not** generate content until both language and subject are known.
2. **Generate + preview**: Once `{language}` and `{sujet}` are known, write the post following the prompt below (replace `{sujet}` and `{language}` with the given values). Also generate the cover image at this step (see **Cover image**). Show the full draft **in the chat**. Then write a **preview-only** draft (this is not the published file):
   - Create `.preview/` if needed.
   - Copy the generated PNG to `.preview/cover.png` if image generation succeeded.
   - Write `.preview/draft.md` with frontmatter `sujet`, `date`, `platform: linkedin`, and `image` / `image_alt` if the PNG was copied (`image: cover.png`).
   - Run `npm run preview:linkedin -- .preview/draft.md` so the LinkedIn-like card opens in the default browser.
   - Tell the user the browser preview opened.
   - **Never** create or write `content/linkedin/*.md` at this step.
   - End with: *« Dis-moi tes corrections, ou réponds ok / approuve / sauvegarde pour publier. »*
3. **Revise loop**: If the user requests changes, update the post body and/or regenerate the image, update `.preview/draft.md` (and `.preview/cover.png` if the image changed), run `npm run preview:linkedin -- .preview/draft.md` again, show the full revised draft in chat, and **still do not write** `content/linkedin/*.md`. Keep the last image unless the user asks for a new one. Repeat until approval.
4. **On approval only**: When the user explicitly approves with a message like `ok`, `approuve`, `sauvegarde`, or `valide`:
   - Date: today's date in `YYYY-MM-DD`
   - Slug: kebab-case ASCII from the subject (lowercase, hyphens, no accents if possible)
   - Copy/move `.preview/cover.png` (or the generated PNG) to `content/linkedin/images/YYYY-MM-DD-slug.png` (create `content/linkedin/images/` if needed).
   - Write `content/linkedin/YYYY-MM-DD-slug-du-sujet.md` (create `content/linkedin/` if needed). Include `image` and `image_alt` only if the PNG was saved.
   - Run the **pre-save validation** checklist below on the approved body (and image fields if present).
   - Then run the **Git / PR** steps below.
   - Reply with the post path, the image path if any, **and** the PR URL.
5. **Never write the published file before approval.** `.preview/` is a local mock only and does not count as publishing. Do not commit `.preview/`.

## Cover image

Every new post gets a 16:9 illustration. Generate it during **preview** so the user can request a different image before approval.

- Call the GenerateImage tool with `aspect_ratio: "16:9"` and `filename: "YYYY-MM-DD-slug.png"` (filename only, no directory).
- Copy the generated PNG to `.preview/cover.png` so the browser preview can inline it.
- Description: editorial illustration of `{sujet}`. No letters, watermarks, logos, or UI text. No stock clichés (handshakes, glowing brains, generic laptops).
- Do **not** repeat the generated image as Markdown in the chat; the client displays it automatically.
- `image_alt`: French, describes the illustration, no “image de” / “illustration de” prefix, target under 120 characters.
- If image generation or the move fails: still write the preview draft and the post, **omit** `image` and `image_alt`, and mention the failure in the reply. Do **not** block the preview or the PR.

## Pre-save validation (on approval only)

Before writing the `.md` file, confirm the approved body meets LinkedIn publishing constraints enforced by `scripts/publish-to-linkedin.mjs`:

- **Length**: ≤ 3000 characters (LinkedIn commentary limit).
- **No Markdown**: no `**bold**`, `# headings`, or `[links](url)` — LinkedIn renders plain text only. Do not use Unicode mathematical “bold”.
- **Structural formatting only**: short paragraphs (1–3 lines), blank lines between ideas, functional bullets (`→`) — not emoji decoration or fake rich text.
- **Hashtags**: 3–5 at the end, topic-specific.
- **Image** (if generated): `content/linkedin/images/YYYY-MM-DD-slug.png` exists; frontmatter has `image` and `image_alt`.

If validation would fail, fix the body (or ask the user) before saving.

## Output file format

```markdown
---
sujet: "{sujet}"
date: YYYY-MM-DD
platform: linkedin
image: images/YYYY-MM-DD-slug.png
image_alt: "..."
---

{generated post body}
```

Omit `image` and `image_alt` if the cover PNG was not generated.

## Git / PR

If `STUDIO_API_URL`, `STUDIO_EMAIL`, and `STUDIO_PASSWORD` are set, **do not open a PR**. Follow `.cursor/skills/content-studio/SKILL.md` (login → create content → patch body → approve → publish `LINKEDIN`).

Otherwise, run only after the `.md` file has been written on approval.

1. **Preconditions**: Confirm the workspace is a git repo with remote `origin`. If git/remote fails: keep the saved `.md`, do **not** invent a remote, and explain the actionable fix.
2. **Branch**: From up-to-date `master`, create `content/linkedin-YYYY-MM-DD-slug`.
3. **Commit**: Stage the new post `.md` **and** its PNG if present (`content/linkedin/images/YYYY-MM-DD-slug.png`). Commit message: `Add LinkedIn post: {sujet}` (use HEREDOC; follow the user's git safety rules — no force push, no config changes, no `--no-verify`).
4. **Push**: `git push -u origin HEAD`
5. **PR**: Create with the **ManagePullRequest** tool (preferred) or `gh pr create`, base **`master`**:
   - Title: `LinkedIn: {sujet}`
   - Body:
     - Summary: 1–2 bullets (sujet + date + image if any)
     - Test plan: short checklist (relecture du `.md`, image OK, ton OK, pas de markdown, ≤ 3000 car.)
   - Note in the reply that merging the PR to `master` stores the files in git and triggers **Publish to LinkedIn** (`publish-linkedin-post`) — `GET /v2/userinfo`, optional Images API upload, then `POST /rest/posts`. There is no WordPress or other CMS sync.

## LinkedIn publishing (after merge)

The publish workflow runs `npm run publish:linkedin -- <files>` with repository secrets:

| Secret | Description |
|--------|-------------|
| `LINKEDIN_ACCESS_TOKEN` | OAuth token with `openid`, `profile`, `email`, `w_member_social` |
| `LINKEDIN_PERSON_URN` | Optional. `urn:li:person:<id>` from `/v2/userinfo` `sub`. Resolved automatically if omitted. |

Optional env var: `LINKEDIN_API_VERSION` (defaults to `202608`).

### Local browser preview (before approval)

The generate step writes `.preview/draft.md` and opens a LinkedIn-like card (no API call):

```bash
npm run preview:linkedin -- .preview/draft.md
```

`--no-open` writes `.preview/index.html` without launching the browser. `--out <file>` overrides the HTML path.

### Local dry-run (no API call)

Validate payload and frontmatter without credentials:

```bash
npm ci
npm run publish:linkedin -- --dry-run content/linkedin/YYYY-MM-DD-slug.md
```

### API implementation notes

The publisher uses the current **Posts API**, not the deprecated Share API (`/shares`) or UGC Posts API (`/v2/ugcPosts`).

Required request shape:

- **Profile**: `GET https://api.linkedin.com/v2/userinfo` (OpenID `openid` + `profile`). Do not use `/v2/me`.
- **Image** (when `image` is set): `POST https://api.linkedin.com/rest/images?action=initializeUpload`, then `PUT` raw bytes to `uploadUrl` (no `LinkedIn-Version` on the PUT). Do not `GET /rest/images` (`w_member_social` is write-only there).
- **Endpoint**: `POST https://api.linkedin.com/rest/posts`
- **Headers**: `Authorization`, `Content-Type`, `X-Restli-Protocol-Version: 2.0.0`, `LinkedIn-Version: YYYYMM`
- **Body fields**: `author`, `commentary`, `visibility: "PUBLIC"`, `distribution.feedDistribution: "MAIN_FEED"`, `lifecycleState: "PUBLISHED"`
- **Image body field**: `content.media.id` (`urn:li:image:...`) and `content.media.altText`
- **Success**: HTTP `201`; post ID in response header `x-restli-id`
- **Author URN**: `urn:li:person:{sub}` from userinfo
- Posts without `image` stay text-only (backward compatible).

Common failure causes:

| Symptom | Likely cause |
|---------|----------------|
| 403 `me.GET.NO_VERSION` | Called `/v2/me` — use `/v2/userinfo` |
| 403 Unpermitted fields (`/actor`, `/specificContent`) | Old Share or UGC payload — use Posts API |
| 400 Missing field | Missing `distribution` or wrong `visibility` format (must be string `"PUBLIC"`, not nested object) |
| 401 Unauthorized | Expired or invalid `LINKEDIN_ACCESS_TOKEN` |
| 400 Invalid URN | `LINKEDIN_PERSON_URN` not in `urn:li:person:<id>` format |
| 403 on `/rest/images` | Token missing `w_member_social`, or PUT sent as multipart instead of raw bytes |
| Image file not found | `image` frontmatter path missing on disk (expected `content/linkedin/images/...`) |

Script: `scripts/publish-to-linkedin.mjs` — setup details in `docs/LINKEDIN_API_SETUP.md`.

## Prompt (use verbatim)

Rédige un post LinkedIn percutant sur le thème de {sujet}, destiné à {audience} 
dans un objectif de {objectif}.
Langue du post : {language}

(Si {sujet} ou {language} n'est pas fourni, demande-le avant de continuer. Si {audience} et 
{objectif} ne sont pas fournis, propose une hypothèse raisonnable et signale-la 
brièvement plutôt que de bloquer la génération.)

RÈGLE DE VÉRIFICATION FACTUELLE (prioritaire) :
- N'invente jamais de statistique, date, nom d'étude ou citation attribuée à une 
  personne/source réelle.
- Si tu n'es pas certain qu'un fait soit exact, reformule-le comme une observation 
  personnelle plutôt qu'un fait établi — mais uniquement s'il s'agit réellement 
  d'un point de vue générique, pas d'un événement précis inventé (pas de "un 
  client m'a dit lundi" si ce client n'existe pas : préfère "je vois souvent ce 
  cas" ou un scénario hypothétique explicitement présenté comme tel, ex. 
  "imaginons quelqu'un qui...").
- Les références théoriques/culturelles doivent être limitées à des éléments 
  très largement connus (concepts, livres, auteurs canoniques) — jamais de 
  statistique chiffrée précise ni de date exacte sauf certitude absolue.
- En cas de doute sur une référence : l'omettre plutôt que la garder en 
  espérant qu'elle soit correcte.

STRUCTURE (squelette flexible — adapte, fusionne ou retire 1-2 éléments si 
le sujet s'y prête mieux ; ne traite pas ceci comme une checklist rigide) :
- Accroche : affirmation forte ou question sur {sujet}, pensée pour fonctionner 
  seule dans les ~200 premiers caractères (avant le "…voir plus" de LinkedIn). 
  Évite les formulations toutes faites ("Et si je vous disais que...", 
  "Dans un monde où...").
- Illustration : une référence ou anecdote réellement pertinente, pas plaquée 
  artificiellement. Peut être fusionnée avec le point de référence culturelle 
  plutôt que traitée séparément.
- Problème : un piège ou une erreur courante liée à {sujet}, avec un exemple 
  concret — réel si tu le connais avec certitude, sinon présenté explicitement 
  comme hypothétique ("imaginons...", "un cas fréquent...").
- Liste actionnable : 3 à 5 actions concrètes et spécifiques, adaptées à 
  {audience} (pas "soyez authentique" mais ce que ça veut dire précisément 
  dans ce contexte).
- Message central : une phrase de synthèse, sans slogan motivationnel générique.
- Question engageante : ouverte et spécifique au sujet traité (pas 
  "Et vous, qu'en pensez-vous ?").

CONTRAINTES DE FORMAT LINKEDIN :
- Longueur cible : 150-250 mots (hors hashtags), maximum absolu 3000 caractères.
- Pas de syntaxe markdown (**gras**, # titres, [liens](url)) : LinkedIn ne les affiche pas.
  Pas de gras/italique Unicode (caractères mathématiques). L’API n’a pas de rich text.
- Mise en forme structurelle seulement : une idée par paragraphe, lignes vides entre
  les blocs, 1-3 lignes par paragraphe, puces fonctionnelles (`→`) plutôt que des
  emojis décoratifs. Si un mot doit ressortir, change la formulation ou isole-le
  sur sa propre ligne.
- 3-5 hashtags maximum en fin de post, spécifiques au sujet (pas #motivation 
  #leadership génériques).

STYLE - À ÉVITER (marqueurs d'écriture IA) :
- Tirets cadratins (—) en excès
- Phrases en miroir ("Ce n'est pas X, c'est Y")
- Emojis décoratifs sans fonction (✨🚀💡 en série)
- Formules de transition creuses ("Voici pourquoi", "La clé ?")
- Adjectifs vides ("puissant", "incroyable", "essentiel") sans justification
- Toute structure trop reconnaissable comme "formule LinkedIn growth-hacker" — 
  varie l'ordre ou la forme des sections d'un post à l'autre

STYLE - À PRIVILÉGIER :
- Rythme irrégulier : alterne phrases courtes et longues
- Détails concrets plutôt que généralités
- Une seule idée forte par paragraphe
- Emojis rares, seulement fonctionnels (ex. puces de liste)

Exemple de calibrage du ton (à ne pas copier, juste pour la cadence) :
"La plupart des gens préparent leur pitch. Moi j'ai arrêté. Ce qui marche, 
c'est d'écouter la première question et de répondre à celle-là — pas à celle 
que j'avais anticipée."

TON : Professionnel mais accessible, touche personnelle assumée ("je conseille", 
"j'ai remarqué que"), sans excès de familiarité.

OBJECTIF : Transmettre une leçon utile et vérifiée, adaptée à {audience}, en 
servant l'objectif de {objectif}, tout en suscitant l'engagement.
