# LinkedIn Product Showcase Skill

Skill Cursor pour **présenter un produit ou un projet** sur LinkedIn : stack,
architecture, choix techniques, fonctionnalités, problèmes résolus, liens et CTA.

## Ce que fait le skill

1. **Collecte** — Nom du projet, problème adressé, features, liens (GitHub / site)
2. **Explore** — Si le projet est dans le repo, lit README et configs pour la stack
3. **Génère** — Post LinkedIn structuré + couverture 16:9 illustrative
4. **Preview** — Aperçu navigateur (`.preview/`) + brouillon dans le chat
5. **Itère** — Corrections texte / image jusqu'à approbation
6. **Publie** — Sauvegarde, branche, commit, PR ; merge → publication LinkedIn

## Exemples d'utilisation

```
présente mon projet sur linkedin
```

```
showcase linkedin pour [nom du produit] — stack nestjs + react
```

```
post linkedin projet : explique l'architecture et mets le lien github
```

Le skill demande les infos manquantes (problème, features, liens) avant de générer.

## Structure du post généré

| Section | Contenu |
|---------|---------|
| Accroche | Quoi + pourquoi c'est utile (~200 premiers caractères) |
| Problème | Pain point concret |
| Stack & architecture | Briques + **justification** des choix |
| Fonctionnalités | Feature → problème résolu |
| CTA | Invitation à tester + URL GitHub et/ou site |
| Hashtags | 3–5 tags ciblés |

## Différences avec les autres skills LinkedIn

| Skill | Usage |
|-------|--------|
| **linkedin-product-showcase** | Présenter **votre** produit / projet dev |
| `linkedin-explain-concept` | Expliquer un concept avec schéma / tableau / code |
| `linkedin-post` | Post d'opinion, leçon, sujet général |
| `linkedin-post-bernard` | Voix Bernard, observation technique |

## Fichiers produits

```
content/linkedin/YYYY-MM-DD-slug.md
content/linkedin/images/YYYY-MM-DD-slug.png
```

Frontmatter typique :

```markdown
---
sujet: "Mon SaaS"
date: 2026-09-16
platform: linkedin
type: product-showcase
image: images/2026-09-16-mon-saas.png
image_alt: "Flux de données entre services cloud stylisés"
lien_github: "https://github.com/org/repo"
lien_site: "https://demo.example.com"
---
```

## Preview navigateur

```bash
npm run preview:linkedin -- .preview/draft.md
```

## Emplacement

```
.cursor/skills/linkedin-product-showcase/
├── SKILL.md      (instructions agent)
└── README.md     (ce fichier)
```

Voir `SKILL.md` pour le prompt complet et le workflow d'approbation.
