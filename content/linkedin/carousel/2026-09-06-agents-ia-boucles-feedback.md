---
sujet: "Agents IA en boucle de feedback : pourquoi un seul agent ne suffit plus"
date: 2026-09-06
platform: linkedin-carousel
slide_count: 9
theme:
  primary: "#0a66c2"
  secondary: "#191919"
  font: "system-ui"
document: pdfs/2026-09-06-agents-ia-boucles-feedback.pdf
document_title: "2026-09-06-agents-ia-boucles-feedback.pdf"
slides:
  - id: 1
    role: hook
    title: "Un agent solo impressionne en démo"
    body: "En prod, la première erreur silencieuse passe souvent inaperçue. Swipe →"
    background: images/2026-09-06-agents-ia-boucles-feedback/slide-01-bg.png
  - id: 2
    role: problem
    title: "Le piège du workflow linéaire"
    bullets:
      - "Un LLM enchaîne outils et tickets"
      - "Il invente un champ, continue, affiche succès"
      - "Personne ne relit avant la sortie"
    background: images/2026-09-06-agents-ia-boucles-feedback/slide-02-bg.png
  - id: 3
    role: why
    title: "Pourquoi ça casse en production"
    bullets:
      - "Tâches longues = plus de points de dérive"
      - "L’erreur n’est pas visible tout de suite"
      - "Un seul prompt ne peut pas tout vérifier"
    background: images/2026-09-06-agents-ia-boucles-feedback/slide-03-bg.png
  - id: 4
    role: value
    title: "Séparez producteur et critique"
    bullets:
      - "Deux prompts, deux jeux d’outils"
      - "Le reviewer ne publie pas la réponse finale"
      - "Il peut refuser avant la sortie"
    background: images/2026-09-06-agents-ia-boucles-feedback/slide-04-bg.png
  - id: 5
    role: value
    title: "Bornez la boucle"
    bullets:
      - "Critères de sortie explicites"
      - "Retry limité, budget tokens/temps"
      - "Pas de « essaie encore » sans plafond"
    background: images/2026-09-06-agents-ia-boucles-feedback/slide-05-bg.png
  - id: 6
    role: value
    title: "Découpez les rôles"
    bullets:
      - "Recherche, rédaction, vérification"
      - "Moins d’auto-validation"
      - "Chaque rôle a un mandat clair"
    background: images/2026-09-06-agents-ia-boucles-feedback/slide-06-bg.png
  - id: 7
    role: value
    title: "Tracez chaque aller-retour"
    bullets:
      - "Qui a objecté, pourquoi"
      - "Ce qui change au second passage"
      - "Audit possible après coup"
    background: images/2026-09-06-agents-ia-boucles-feedback/slide-07-bg.png
  - id: 8
    role: mistakes
    title: "Erreurs fréquentes"
    bullets:
      - "Critique avec les mêmes outils que le producteur"
      - "Boucle infinie sans condition d’arrêt"
      - "Aucune trace des objections"
    background: images/2026-09-06-agents-ia-boucles-feedback/slide-08-bg.png
  - id: 9
    role: cta
    title: "Un pair peut refuser le résultat"
    body: "Sur vos workflows, qui a le droit de renvoyer le travail ?"
    background: images/2026-09-06-agents-ia-boucles-feedback/slide-09-bg.png
---

Un agent unique qui enchaîne les outils, ça impressionne en démo. En prod, la première hallucination silencieuse passe souvent inaperçue.

J’ai regroupé ici la structure que je vois émerger : producteur/critique, boucle bornée, rôles séparés, trace des objections.

Swipe le PDF pour le détail slide par slide.

Sur vos workflows agents, qui a le droit de renvoyer le travail, et avec quels critères ?

#AgentsIA #MultiAgent #LLM #GenAI #ArchitectureIA
