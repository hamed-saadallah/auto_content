---
name: linkedin-explain-concept
description: >-
  Explique un concept précis en français dans un post LinkedIn pédagogique :
  définition claire, tableau comparatif et/ou extrait de code en texte brut,
  plus une image 16:9 (diagramme, schéma ou illustration). Montre pour revue,
  puis après approbation enregistre en .md, commit et ouvre une PR. Use when
  the user asks to explain a concept on LinkedIn, share a technical idea with
  a diagram/schema, or write a pedagogical post with a table or code snippet.
  Not for Bernard voice (linkedin-post-bernard), product showcase
  (linkedin-product-showcase), or generic opinion posts (linkedin-post).
---

# LinkedIn — Expliquer un concept

Post LinkedIn orienté **pédagogie** : rendre un concept précis compréhensible
en une lecture, avec un **support visuel** (diagramme / schéma / illustration)
et un **appui textuel** (tableau explicatif et/ou bout de code).

Le pipeline de publication est le même que `linkedin-post` (preview → approbation
→ `content/linkedin/` → PR → merge → GitHub Action LinkedIn).

If `STUDIO_API_URL`, `STUDIO_EMAIL`, and `STUDIO_PASSWORD` are set, follow
`.cursor/skills/content-studio/SKILL.md` after approval (type `LINKEDIN`).

## Routing

| Demande utilisateur | Skill |
|---|---|
| Expliquer un concept / notion / pattern avec schéma ou code | **Ce skill** |
| Post générique (leçon, opinion, accroche) | `linkedin-post` |
| Voix Bernard, observation technique | `linkedin-post-bernard` |
| Présenter un produit / projet (stack, CTA, lien) | `linkedin-product-showcase` |

## Variables (à collecter avant d'écrire)

| Variable | Requis | Si manquant |
|---|---|---|
| `{language}` | Oui | **Demander en premier (requis, bloque les autres).** Exemple : French, English, Spanish, German. |
| `{concept}` | Oui | Demander le concept précis (pas un thème vague). Ex. « event sourcing », « debounce vs throttle », « CAP theorem ». |
| `{angle}` | Non | Demander brièvement l'angle pédagogique si plusieurs lectures possibles (ex. pour débutants, vs X, piège courant). Sinon choisir un angle et le signaler. |
| `{visuel}` | Non | `diagramme` \| `schema` \| `illustration`. Si absent : choisir selon le concept (voir **Cover image**) et signaler le choix. |
| `{support}` | Non | `tableau` \| `code` \| `les_deux`. Défaut : `les_deux` si le concept s'y prête, sinon le plus utile. Signaler. |
| `{langage}` | Non | Si `{support}` implique du code : langage (JS, Python, SQL…). Demander si ambigu. |
| `{audience}` | Non | Défaut : professionnels tech curieux. Signaler. |
| `{objectif}` | Non | Défaut : rendre le concept clair et mémorable. Signaler. |

**Ne pas générer** tant que `{language}` et `{concept}` ne sont pas connus. Si l'utilisateur donne
seulement un domaine large (« les bases de données ») ou ne spécifie pas la langue, demander **quel concept
précis** expliquer **et la langue** à utiliser.

## Workflow

1. **Ask first** : Collecter `{language}` en premier (requis, bloque les autres). Puis collecter `{concept}` (et `{angle}` / `{visuel}` / `{support}` /
   `{langage}` si utiles). Inferer le reste en une ligne courte.
2. **Generate + preview** : Rédiger le post (prompt ci-dessous). Générer l'image
   16:9 selon `{visuel}` (voir **Cover image**). Montrer le brouillon **dans le chat**,
   y compris une ligne qui nomme le type de visuel choisi.
   - Créer `.preview/` si besoin.
   - Copier le PNG vers `.preview/cover.png`.
   - Écrire `.preview/draft.md` avec frontmatter `sujet`, `date`, `platform: linkedin`,
     `type: explain-concept`, `visuel`, `image`, `image_alt`.
   - Lancer `npm run preview:linkedin -- .preview/draft.md`.
   - Indiquer que l'aperçu navigateur est ouvert **et** rappeler le compteur
     de caractères (viser long, ≤ 3000 échappés).
   - **Ne jamais** écrire `content/linkedin/*.md` à cette étape.
   - Terminer par : *« Dis-moi tes corrections, ou réponds ok / approuve / sauvegarde pour publier. »*
3. **Revise loop** : Sur demande, mettre à jour texte et/ou régénérer l'image
   (changer `diagramme` ↔ `schema` ↔ `illustration` si demandé), rafraîchir
   `.preview/`, relancer le preview. Ne pas écrire le fichier publié.
4. **On approval only** (`ok`, `approuve`, `sauvegarde`, `valide`) :
   - Date : `YYYY-MM-DD` du jour.
   - Slug : kebab-case ASCII depuis `{concept}`.
   - Copier `.preview/cover.png` → `content/linkedin/images/YYYY-MM-DD-slug.png`.
   - Écrire `content/linkedin/YYYY-MM-DD-slug.md` avec `type: explain-concept`.
   - Valider avec **Pre-save validation**.
   - Exécuter **Git / PR**.
   - Répondre avec chemins du post, de l'image, et URL de la PR.
5. **Never write the published file before approval.** Ne pas committer `.preview/`.

## Cover image (required)

Chaque post reçoit une image **16:9** qui **explique** ou **illustre** le concept —
pas une couverture décorative générique.

Choisir exactement un `{visuel}` :

| `{visuel}` | Quand l'utiliser | Contenu de l'image |
|---|---|---|
| `diagramme` | Flux, cycles, étapes, relations cause→effet | Boîtes / flèches / nœuds. **Libellés courts autorisés** (1–3 mots par nœud). Pas de paragraphe. |
| `schema` | Architecture, couches, comparaison structurelle (A vs B côte à côte) | Structure claire, zones distinctes. Libellés courts OK. Pas de tableau dense. |
| `illustration` | Métaphore, intuition, concept abstrait | Scène éditoriale sans texte lisible. |

Règles communes :

1. Appeler GenerateImage avec `aspect_ratio: "16:9"` et
   `filename: "YYYY-MM-DD-slug.png"` (nom seul).
2. Copier vers `.preview/cover.png`.
3. **Interdit dans l'image** : tableaux de données, longues formules, blocs de code,
   watermarks, logos, captures UI avec texte dense, clichés stock (cerveaux
   lumineux, poignées de main, fusées).
4. **Les tableaux et le code vont dans le corps du post**, jamais dans l'image.
5. Palette sobre et lisible (fond clair ou contrasté), style éditorial / infographie
   pédagogique — pas photoréaliste « stock AI ».
6. `image_alt` : français, décrit le schéma ou l'illustration, sans préfixe
   « image de », cible < 120 caractères.
7. Ne pas répéter l'image en Markdown dans le chat.
8. Si GenerateImage échoue : **retry once** avec une description plus simple
   (même `{visuel}`). Si le retry échoue aussi : preview texte seul, omettre
   `image` / `image_alt`, le dire — ne pas bloquer le flux.

### Cover prompt (substituer `{concept}`, `{angle}`, `{visuel}`)

Pour `diagramme` ou `schema` :

```
Wide 16:9 clean educational {visuel} explaining the concept: {concept}.
Angle: {angle}.
Clear visual structure (boxes, arrows, or layered regions). Short labels
only (1–3 words per node). High contrast, readable at LinkedIn thumbnail
size. Soft editorial colors, flat or lightly isometric, not photoreal.
No data table, no code block, no long sentences, no watermarks, logos,
or stock AI clichés (glowing brains, rockets, handshakes).
```

Pour `illustration` :

```
Wide 16:9 editorial illustration that metaphorically conveys: {concept}.
Angle: {angle}.
Atmospheric, concrete scene (objects, place, situation) — not a chart.
No letters, numbers, logos, watermarks, or UI text.
Muted editorial palette. Avoid stock AI clichés.
```

State the choice in chat in one line, e.g.
`Visuel : schéma (debounce vs throttle, deux colonnes).`

## Tableaux et code (corps du post — texte brut LinkedIn)

LinkedIn **n'affiche pas** le Markdown. Les tableaux et le code doivent être
lisibles en **texte brut**.

### Tableaux (obligatoire si `{support}` = `tableau` ou `les_deux`)

Utiliser un tableau ASCII compact (2–4 colonnes, 2–5 lignes de données) :

```
Critère          | Debounce              | Throttle
-----------------|-----------------------|------------------
Déclenchement    | Après la pause        | À intervalle fixe
Cas typique      | Champ de recherche    | Scroll / resize
```

Règles :

- Alignement approximatif OK ; priorité à la lisibilité mobile.
- Titres de colonnes courts.
- Une idée par cellule ; pas de phrases longues.
- Encadrer le tableau par une ligne vide avant/après.
- Alternative acceptable si le tableau est trop large : 2–4 lignes
  `→ A : …` / `→ B : …` clairement contrastées — mais **préférer le tableau**
  quand la comparaison a ≥ 2 critères.

### Code (obligatoire si `{support}` = `code` ou `les_deux`)

Bloc court (3–12 lignes), langage annoncé sur la première ligne :

```
JS
const debounced = debounce(fn, 300)
input.addEventListener('input', debounced)
```

Règles :

- Pas de fences Markdown (```) — LinkedIn les affiche comme du texte moche.
- Indentation espaces seulement ; pas de tabulations.
- Montrer l'idée, pas un fichier entier.
- Commentaires sparses, utiles (`// attend la pause`).
- Si le concept n'est pas code-friendly (ex. CAP theorem) : privilégier le
  tableau et omettre le code sans forcer un snippet artificiel.

Au moins **un** des deux (tableau ou code) doit apparaître dans chaque post.
Les deux si `{support}` = `les_deux` et que le concept le permet.

## Pre-save validation (on approval only)

Avant d'écrire le `.md`, vérifier :

- **Concept** : un seul concept précis, définition claire en 1–3 phrases.
- **Support** : au moins un tableau ASCII **ou** un extrait de code brut.
- **Pas de Markdown** : pas de `**gras**`, `# titres`, `[liens](url)`, ni fences ```.
- **Pas de gras Unicode**.
- **Longueur** : post **long** — viser 2400–2850 caractères **après** échappement
  little-text (`escapeLinkedInCommentary` : `| ( ) [ ] { }` etc. comptent double).
  Plafond absolu LinkedIn : **≤ 3000 caractères échappés** (corps + hashtags).
  Si trop long : raccourcir prose ou tableau avant sauvegarde, jamais tronquer
  silencieusement.
- **Hashtags** : 3–5 en fin, spécifiques au concept / domaine.
- **Image** : PNG présent (sauf double échec GenerateImage) ; `image` + `image_alt` ;
  `visuel` renseigné ; `type: explain-concept`.
- **Anti-hallucination** : pas de stats inventées ; exemples techniques plausibles.

Corriger avant sauvegarde si échec.

## Output file format

```markdown
---
sujet: "{concept}"
date: YYYY-MM-DD
platform: linkedin
type: explain-concept
visuel: schema
image: images/YYYY-MM-DD-slug.png
image_alt: "..."
---

{corps du post}
```

Omettre `image` / `image_alt` seulement si les deux tentatives GenerateImage ont échoué.

## Git / PR

If `STUDIO_API_URL`, `STUDIO_EMAIL`, and `STUDIO_PASSWORD` are set, **do not open a PR**.
Follow `.cursor/skills/content-studio/SKILL.md`.

Otherwise, run only after the `.md` file has been written on approval.

1. **Preconditions** : repo git avec remote `origin`.
2. **Branch** : depuis `master` à jour, créer `content/linkedin-YYYY-MM-DD-slug`.
3. **Commit** : stage le `.md` et le PNG si présent. Message :
   `Add LinkedIn concept post: {concept}` (HEREDOC ; pas de force push).
4. **Push** : `git push -u origin HEAD`
5. **PR** : ManagePullRequest (ou `gh pr create`), base **`master`** :
   - Title : `LinkedIn (concept): {concept}`
   - Body : résumé (concept, type de visuel, tableau/code) + test plan
     (relecture, image, tableau/code lisibles en brut, pas de markdown, ≤ 3000 car.)
   - Merge → `master` déclenche **Publish to LinkedIn** (`publish-linkedin-post`).

## LinkedIn publishing (after merge)

Identique à `linkedin-post`. Script : `scripts/publish-to-linkedin.mjs`.
Setup : `docs/LINKEDIN_API_SETUP.md`.

### Preview local

```bash
npm run preview:linkedin -- .preview/draft.md
```

### Dry-run

```bash
npm ci
npm run publish:linkedin -- --dry-run content/linkedin/YYYY-MM-DD-slug.md
```

## Prompt (substituer les variables, utiliser tel quel)

Rédige un post LinkedIn en français qui **explique clairement** le concept
suivant, destiné à {audience}, avec l'objectif : {objectif}.
Langue du post : {language}

CONCEPT :
- Notion à expliquer : {concept}
- Angle pédagogique : {angle}
- Support textuel attendu : {support}
- Langage pour le code (si applicable) : {langage}

STRUCTURE (squelette long — développe chaque temps ; un seul concept) :
1. **Accroche** (~200 premiers caractères) : confusion courante ou question
   précise sur {concept}. Pas de "Et si je vous disais…".
2. **Contexte** : pourquoi ce concept revient souvent (1–2 courts paragraphes).
3. **Définition** : 2–4 phrases nettes. Ce que c'est / ce que ce n'est pas.
4. **Support** : tableau ASCII et/ou extrait de code en texte brut (obligatoire).
   Le support doit prouver ou clarifier la définition.
5. **Exemple concret** : un cas d'usage ou un scénario (hypothétique si besoin,
   explicitement présenté comme tel).
6. **Piège / nuance** : erreur fréquente, limite, ou cas où le concept ne s'applique pas.
7. **Takeaway** : 1–2 phrases mémorables.
8. **Question** : ouverte et spécifique (pas "Et vous, qu'en pensez-vous ?").

RÈGLES ANTI-HALLUCINATION :
- N'invente aucune statistique, étude ou citation.
- Exemples de code : idiomatiques et corrects pour {langage} ; sinon omettre.
- Si tu n'es pas sûr d'un détail technique, simplifie ou demande — ne pas bluffer.

CONTRAINTES LINKEDIN (texte brut) :
- **Longueur** : viser un post long, 2400–2850 caractères après échappement
  little-text ; plafond absolu **3000** (corps + hashtags). Les `|` du tableau
  et les `()` du code augmentent la longueur échappée — laisser ~150–600
  caractères de marge sur le texte brut.
- Avant preview / sauvegarde : compter la longueur échappée ; raccourcir si > 3000.
- Pas de markdown (**gras**, # titres, [liens](url), fences ```).
- Pas de gras/italique Unicode.
- Tableau : format ASCII à colonnes séparées par `|`, 2–4 colonnes, 2–5 lignes.
- Code : 3–12 lignes, langage annoncé en première ligne, indentation espaces.
- Paragraphes 1–3 lignes, lignes vides entre les blocs.
- 3–5 hashtags spécifiques en fin (#EventSourcing #SystemDesign…).

STYLE — ÉVITER :
- Remplissage creux pour "faire long" ; chaque paragraphe doit avancer l'explication.
- Jargon non traduit, listes d'emojis.
- Formules IA ("plongeons dans", "la clé ?", miroirs "ce n'est pas X, c'est Y"
  en série).
- Image décrite dans le texte ("comme sur le schéma ci-dessus") de façon
  redondante : le visuel complète, le texte se suffit.

STYLE — PRIVILÉGIER :
- Profondeur utile sur **un** concept, pas un tour d'horizon.
- Exemple concret avant abstraction quand c'est possible.
- Rythme lisible malgré la longueur (paragraphes courts, air entre les blocs).

Écris le post final sans titre, sans balises, prêt à publier.
