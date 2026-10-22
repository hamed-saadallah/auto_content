---
sujet: "Évolution des agents IA : des workflows single-agent aux workflows multi-agents auto-correcteurs et boucles de feedback"
date: 2026-09-06
platform: linkedin
image: images/2026-09-06-evolution-agents-ia-single-vers-multi-agent.png
image_alt: "Figures géométriques : à gauche un parcours linéaire isolé, à droite trois silhouettes en boucle de cuivre autour d'un plan de travail"
---

Un agent unique qui enchaîne les outils, ça impressionne en démo. En prod, la première hallucination silencieuse passe souvent inaperçue.

On a commencé comme ça : un LLM, une liste d'outils, une boucle ReAct. Le modèle planifie, appelle, observe, recommence. Suffisant tant que la tâche est courte et que l'erreur se voit tout de suite.

Cas fréquent : un agent rédige une spec, interroge une API, ouvre un ticket. Il invente un champ, continue, pousse le ticket. Le workflow affiche "succès". Personne n'a relu.

Ce que je vois changer, c'est moins le modèle que le droit de dire non avant la sortie :

→ Un producteur, un critique. Le reviewer n'a pas le même prompt, pas les mêmes outils, pas le droit d'écrire la réponse finale.
→ Une boucle bornée : critères de sortie, retry limité, budget tokens/temps. Pas un "essaie encore" sans plafond.
→ Des rôles séparés (recherche, rédaction, vérification) plutôt qu'un agent qui s'auto-valide.
→ Une trace pour chaque aller-retour : qui a objecté, pourquoi, ce qui a changé au second passage.
→ Une condition d'arrêt claire. Plus d'objection, ou budget atteint. Sinon la boucle tourne pour rien.

Le single-agent enchaîne jusqu'au bout. Un système multi-agents qui se corrige s'arrête quand un pair refuse le résultat.

Sur vos workflows agents, qui a le droit de renvoyer le travail, et avec quels critères ?

#AgentsIA #MultiAgent #LLM #GenAI #ArchitectureIA
