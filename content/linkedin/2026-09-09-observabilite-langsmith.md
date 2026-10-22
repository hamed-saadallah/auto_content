---
sujet: "l’observabilité avec LangSmith"
date: 2026-09-09
platform: linkedin
image: images/2026-09-09-observabilite-langsmith.png
image_alt: "Filament cuivre et teal qui traverse des chambres de verre empilées, inspecté à un nœud intermédiaire"
---

On juge un agent à sa dernière phrase. L'erreur, elle, s'est souvent jouée trois appels plus tôt.

LangSmith, je l'utilise comme on instrumente une API : une chronologie d'exécution. Chaque span (prompt, retriever, outil, nœud LangGraph) porte ses entrées, ses sorties, sa latence, ses tokens.

Le piège fréquent : n'instrumenter que le chat final. Imaginons un RAG support. L'utilisateur dit que la réponse est fausse. Dans les logs applicatifs, on voit 200 OK. Dans la trace, le retriever a renvoyé deux chunks hors sujet, le modèle a interpolé, et personne n'a vu le score de similarité.

Ce que je mets en place, concrètement :

→ Activer le tracing dès le proto. Un projet LangSmith par environnement (local, staging, prod), pas un dump unique.

→ Taguer chaque run : version de prompt, tenant, modèle, feature flag. Sinon la trace devient illisible dès qu'on a deux déploiements.

→ Lire les spans enfants avant d'incriminer le LLM. Retriever vide, outil en timeout, routeur mal aiguillé : ça se voit dans l'arbre, pas dans la phrase.

→ Transformer les traces ratées en dataset. Relancer le même input après un changement de prompt, comparer.

→ Ajouter un signal de qualité : feedback humain, évaluateur de pertinence, budget latence et tokens. Observer sans critère, c'est collectionner des captures.

Un LLM paraît opaque quand on ne trace que sa réponse. LangSmith rend l'exécution inspectable.

Quand un agent se trompe chez vous, vous relisez le prompt final, ou le span où la donnée a déjà divergé ?

#LangSmith #Observabilité #LLM #AgentsIA #LangChain
