# LinkedIn — Expliquer un concept

Skill Cursor pour générer un post LinkedIn **pédagogique** en français :
expliquer un concept précis, avec une image (diagramme, schéma ou illustration)
et un appui textuel (tableau ASCII et/ou extrait de code).

Le pipeline (preview → approbation → `content/linkedin/` → PR → publication)
est le même que `linkedin-post`. Le contenu et le brief image sont différents.

## Quand l'utiliser

| Besoin | Skill |
|---|---|
| Expliquer une notion / un pattern avec schéma ou code | **linkedin-explain-concept** |
| Post opinion / leçon générique | `linkedin-post` |
| Voix Bernard | `linkedin-post-bernard` |
| Présenter **votre** produit / projet | `linkedin-product-showcase` |

## Ce que ça fait

1. **Ask** — Collecte le concept précis (et l'angle si besoin)
2. **Generate** — Post pédagogique + image 16:9 (`diagramme` / `schema` / `illustration`)
3. **Preview** — Brouillon dans le chat + carte LinkedIn-like dans le navigateur
4. **Iterate** — Corrections texte ou image, toujours sous `.preview/`
5. **Approve** — Sur `ok` / `approuve` / `sauvegarde` / `valide`, écrit `content/linkedin/`
6. **Publish** — Branche, commit, push, PR ; le merge publie sur LinkedIn

## Comment l'utiliser

```
explique le concept debounce vs throttle sur LinkedIn
```

Ou :

```
post linkedin concept : event sourcing
```

Ou :

```
génère un schéma LinkedIn pour expliquer le CAP theorem
```

Si le concept est trop large, l'agent demande de préciser.

### Variables typiques

- **Concept** (requis) — ex. debounce vs throttle, event sourcing
- **Angle** — débutants, comparaison, piège courant…
- **Visuel** — `diagramme` | `schema` | `illustration`
- **Support** — `tableau` | `code` | `les_deux`
- **Langage** — si code (JS, Python, SQL…)

## Structure du post

1. Accroche (confusion ou question précise)
2. Contexte — pourquoi ce concept revient
3. Définition claire
4. **Tableau ASCII** et/ou **extrait de code** (texte brut LinkedIn)
5. Exemple concret
6. Piège / nuance
7. Takeaway + question
8. 3–5 hashtags

### Longueur

Post **long** : viser **2400–2850** caractères après échappement LinkedIn
(little-text : `|`, `()`, etc. comptent double). Plafond absolu :
**3000 caractères** (corps + hashtags). Ne jamais dépasser.

LinkedIn n'affiche pas le Markdown : pas de `**gras**`, pas de fences \`\`\`.
Les tableaux sont en colonnes `|` ; le code annonce le langage sur la 1re ligne.

## Image de couverture

| Type | Rôle |
|---|---|
| `diagramme` | Flux, étapes, relations — libellés courts OK |
| `schema` | Architecture / comparaison visuelle A vs B |
| `illustration` | Métaphore sans texte |

Les **tableaux de données** et les **blocs de code** restent dans le corps du
post, pas dans l'image.

## Fichiers produits

```
content/linkedin/YYYY-MM-DD-slug.md
content/linkedin/images/YYYY-MM-DD-slug.png
```

Frontmatter :

```markdown
---
sujet: "debounce vs throttle"
date: 2026-09-16
platform: linkedin
type: explain-concept
visuel: schema
image: images/2026-09-16-debounce-vs-throttle.png
image_alt: "Deux colonnes : attente après pause vs cadence fixe"
---
```

## Emplacement

```
.cursor/skills/linkedin-explain-concept/
├── SKILL.md      (instructions agent)
└── README.md     (ce fichier)
```

## Personnalisation

Éditer `SKILL.md` pour ajuster :

- la structure pédagogique
- les règles de tableaux / code
- le brief image par type de visuel
- le routing depuis les autres skills LinkedIn
