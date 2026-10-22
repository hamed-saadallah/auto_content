---
name: linkedin-product-showcase
description: >-
  Génère un post LinkedIn en français pour présenter un produit ou projet
  développé : stack technique, architecture, choix techniques justifiés,
  fonctionnalités, problèmes résolus, lien GitHub ou site, CTA pour tester,
  plus une couverture 16:9 illustrative. Montre pour revue, puis après
  approbation enregistre en .md, commit et ouvre une PR (publication LinkedIn
  au merge). Use when the user asks to present a product, showcase a project,
  talk about their stack/architecture on LinkedIn, or share a dev project with
  a link and CTA. Not for Bernard voice (use linkedin-post-bernard) nor generic
  thought-leadership posts (use linkedin-post).
---

# LinkedIn — Présentation produit / projet

Post LinkedIn orienté **showcase** : présenter ce que vous avez construit,
expliquer le **pourquoi technique**, montrer la **valeur** (problèmes résolus),
puis inviter à **tester** avec un lien concret.

Le pipeline de publication est le même que `linkedin-post` (preview → approbation
→ `content/linkedin/` → PR → merge → GitHub Action LinkedIn).

If `STUDIO_API_URL`, `STUDIO_EMAIL`, and `STUDIO_PASSWORD` are set, follow
`.cursor/skills/content-studio/SKILL.md` after approval (type `LINKEDIN`).

## Routing

| Demande utilisateur | Skill |
|---|---|
| Présenter un produit / projet / side project | **Ce skill** |
| Expliquer un concept avec schéma / tableau / code | `linkedin-explain-concept` |
| Post générique sur un sujet, leçon, opinion | `linkedin-post` |
| Voix Bernard, observation technique | `linkedin-post-bernard` |

## Variables (à collecter avant d'écrire)

| Variable | Requis | Si manquant |
|---|---|---|
| `{language}` | Oui | **Demander en premier (requis, bloque les autres).** Exemple : French, English, Spanish, German. |
| `{projet}` | Oui | Demander : nom + une phrase sur ce que c'est. |
| `{problème}` | Oui | Demander : quel(s) pain point(s) ce projet adresse. |
| `{stack}` | Non | Si le repo courant **est** le projet : lire `README`, `package.json`, configs, dossiers clés — **ne pas inventer**. Sinon demander ou laisser l'utilisateur compléter. |
| `{architecture}` | Non | Idem : déduire du code / docs si possible ; sinon demander brièvement. |
| `{choix_techniques}` | Non | Demander pourquoi ces choix (1–3 raisons par brique importante). Si absent : proposer des hypothèses **explicitement signalées** à valider. |
| `{fonctionnalités}` | Oui | Demander 2–5 features clés, ou les lister depuis le README / le code. |
| `{lien_github}` | Non* | Demander l'URL GitHub. *Au moins un lien (`github` ou `site`) est requis avant publication. |
| `{lien_site}` | Non* | Demander l'URL du site / démo live. |
| `{cta}` | Non | Défaut : invitation directe à tester / cloner / donner un retour. Signaler le défaut. |
| `{audience}` | Non | Défaut : devs et profils tech curieux. Signaler le défaut. |

**Ne pas générer** tant que `{language}`, `{projet}`, `{problème}` et `{fonctionnalités}` ne sont
pas connus (ou déduits de sources fiables dans le repo).

### Exploration du repo (si le projet est local)

Quand l'utilisateur parle d'un projet dans le workspace :

1. Lire `README.md`, manifests (`package.json`, `pyproject.toml`, etc.), et
   éventuellement `docs/` ou schémas d'architecture.
2. Résumer stack et architecture **uniquement** à partir de ce qui est documenté
   ou visible dans le code.
3. Si une info manque, **demander** plutôt que d'inventer un choix technique.
4. Citer mentalement les fichiers sources ; ne pas les coller en entier dans le post.

## Workflow

1. **Ask first** : Collecter `{language}` en premier (requis, bloque les autres variables). Puis collecter les variables manquantes. Explorer le repo si pertinent.
2. **Generate + preview** : Rédiger le post (prompt ci-dessous). Générer la couverture
   16:9 (voir **Cover image**). Montrer le brouillon **dans le chat**.
   - Créer `.preview/` si besoin.
   - Copier le PNG vers `.preview/cover.png`.
   - Écrire `.preview/draft.md` avec frontmatter `sujet`, `date`, `platform: linkedin`,
     `type: product-showcase`, `image`, `image_alt`, et optionnellement `lien_github` /
     `lien_site` (métadonnées internes — les URLs restent aussi dans le corps du post).
   - Lancer `npm run preview:linkedin -- .preview/draft.md`.
   - Indiquer que l'aperçu navigateur est ouvert.
   - **Ne jamais** écrire `content/linkedin/*.md` à cette étape.
   - Terminer par : *« Dis-moi tes corrections, ou réponds ok / approuve / sauvegarde pour publier. »*
3. **Revise loop** : Sur demande de changements, mettre à jour texte et/ou image,
   rafraîchir `.preview/`, relancer le preview navigateur. Ne pas écrire le fichier
   publié. Répéter jusqu'à approbation.
4. **On approval only** (`ok`, `approuve`, `sauvegarde`, `valide`) :
   - Date : `YYYY-MM-DD` du jour.
   - Slug : kebab-case ASCII depuis `{projet}`.
   - Copier `.preview/cover.png` → `content/linkedin/images/YYYY-MM-DD-slug.png`.
   - Écrire `content/linkedin/YYYY-MM-DD-slug.md` avec `type: product-showcase`.
   - Valider avec la checklist **Pre-save validation**.
   - Exécuter **Git / PR**.
   - Répondre avec chemins du post, de l'image, et URL de la PR.
5. **Never write the published file before approval.** Ne pas committer `.preview/`.

## Cover image

Chaque showcase reçoit une illustration **16:9** qui évoque le **projet** (domaine,
usage, métaphore visuelle) — pas une capture d'écran avec texte lisible.

1. Appeler GenerateImage avec `aspect_ratio: "16:9"` et
   `filename: "YYYY-MM-DD-slug.png"` (nom seul, sans répertoire).
2. Copier vers `.preview/cover.png`.
3. Description type :
   - Illustration éditoriale de `{projet}` : environnement ou métaphore du
     `{problème}` résolu.
   - Palette cohérente avec le domaine (SaaS, data, mobile, infra…).
   - **Interdit** : lettres, chiffres, logos, watermarks, UI avec texte lisible,
     clichés stock (poignées de main, cerveaux lumineux, fusées).
   - Peut suggérer des composants / flux sans schéma technique illisible.
4. `image_alt` : français, décrit l'illustration, sans préfixe « image de »,
   cible < 120 caractères.
5. Ne pas répéter l'image en Markdown dans le chat.
6. Si GenerateImage échoue : preview texte seul, omettre `image` / `image_alt`,
   mentionner l'échec — ne pas bloquer le flux.

## Pre-save validation (on approval only)

Avant d'écrire le `.md`, vérifier :

- **Contenu showcase** : stack + architecture + justification des choix ;
  fonctionnalités liées aux problèmes ; au moins une URL (GitHub ou site) ;
  CTA explicite pour tester / essayer / feedback.
- **Anti-hallucination** : aucun framework, métrique ou feature non confirmée.
- **Longueur** : cible 200–350 mots (hors hashtags) ; plafond LinkedIn 3000 caractères.
- **Pas de Markdown** : pas de `**gras**`, `# titres`, `[liens](url)` — URLs en clair.
- **Mise en forme** : paragraphes courts, lignes vides, puces `→` pour features si utile.
- **Hashtags** : 3–5 en fin de post, spécifiques (stack, domaine, type de produit).
- **Image** (si générée) : fichier PNG présent ; frontmatter `image` + `image_alt`.

Corriger ou redemander à l'utilisateur avant sauvegarde si échec.

## Output file format

```markdown
---
sujet: "{projet}"
date: YYYY-MM-DD
platform: linkedin
type: product-showcase
image: images/YYYY-MM-DD-slug.png
image_alt: "..."
lien_github: "https://github.com/..."   # optionnel
lien_site: "https://..."                # optionnel
---

{corps du post}
```

Omettre `image`, `image_alt`, `lien_github`, `lien_site` si non applicables.
Les liens **doivent** apparaître en clair dans le corps du post (LinkedIn ne lit
pas le frontmatter pour l'affichage).

## Git / PR

If `STUDIO_API_URL`, `STUDIO_EMAIL`, and `STUDIO_PASSWORD` are set, **do not open a PR**.
Follow `.cursor/skills/content-studio/SKILL.md`.

Otherwise, run only after the `.md` file has been written on approval.

1. **Preconditions** : repo git avec remote `origin`.
2. **Branch** : depuis `master` à jour, créer `content/linkedin-YYYY-MM-DD-slug`.
3. **Commit** : stage le `.md` et le PNG si présent. Message :
   `Add LinkedIn product showcase: {projet}` (HEREDOC ; pas de force push).
4. **Push** : `git push -u origin HEAD`
5. **PR** : ManagePullRequest (ou `gh pr create`), base **`master`** :
   - Title : `LinkedIn (showcase): {projet}`
   - Body : résumé (projet, stack en bref, liens) + test plan (relecture, image,
     CTA, URLs, pas de markdown, ≤ 3000 car.)
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

Rédige un post LinkedIn en français pour **présenter un projet que j'ai
développé**, destiné à {audience}.
Langue du post : {language}

PROJET :
- Nom / description : {projet}
- Problème(s) adressé(s) : {problème}

STACK & ARCHITECTURE (facts only — ne rien inventer) :
- Stack : {stack}
- Architecture : {architecture}
- Choix techniques et pourquoi : {choix_techniques}

FONCTIONNALITÉS & VALEUR :
- Features clés : {fonctionnalités}
- Relie chaque feature au problème concret qu'elle résout.

LIENS & CTA :
- GitHub : {lien_github}
- Site / démo : {lien_site}
- Appel à l'action : {cta}
(Au moins une URL doit figurer dans le post. URLs en clair, pas de markdown.)

RÈGLES ANTI-HALLUCINATION (prioritaires) :
- N'invente aucune techno, métrique, témoignage, ni feature absente des inputs.
- Si un choix technique n'est pas documenté, formule-le comme une intention
  ("j'ai visé…") ou omet-le — ne pas fabriquer un benchmark.
- Pas de stats inventées ("10x plus rapide") sans source fournie par l'utilisateur.

STRUCTURE (squelette — adapte l'ordre si le sujet s'y prête mieux) :
1. **Accroche** : en ~200 premiers caractères, dire ce qu'est le projet et
   pourquoi ça compte (pas "Et si je vous disais…").
2. **Le problème** : le pain point vécu ou observé, concret.
3. **Stack & architecture** : briques principales + **pourquoi** ces choix
   (compromis, contraintes, simplicité, perf, DX…). Court et lisible, pas un dump.
4. **Ce que ça fait** : 2–4 points (puces `→` OK) reliant feature → problème résolu.
5. **Essayez-le** : CTA clair + lien(s) GitHub et/ou site sur des lignes dédiées.
6. **Question** : ouverte et spécifique (retour d'usage, comparaison d'approche…).

CONTRAINTES LINKEDIN :
- 200–350 mots hors hashtags ; max 3000 caractères.
- Pas de markdown ni gras Unicode.
- Paragraphes 1–3 lignes, espaces entre blocs.
- 3–5 hashtags pertinents en fin de post (#typescript #opensource…).
- Ton : fier du travail accompli mais concret — pas pub agressive, pas hype creux
  ("révolutionnaire", "game changer").

STYLE — ÉVITER :
- Listes interminables de logos techno sans le "pourquoi".
- Jargon sans traduction pour un lecteur curieux.
- CTA vague ("n'hésitez pas à jeter un œil") sans URL.

STYLE — PRIVILÉGIER :
- Une phrase de contexte personnelle ("J'ai construit X parce que…").
- Détails techniques qui éclairent un choix, pas une encyclopédie.
- Lien(s) visibles et CTA actionnable (tester, cloner, issue GitHub).

Écris le post final sans titre, sans balises, prêt à publier.
