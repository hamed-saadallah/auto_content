---
sujet: "comment le routage intelligent des modèles pourrait réduire la consommation des tokens"
date: 2026-09-14
platform: linkedin
image: images/2026-09-14-routage-intelligent-modeles-consommation-tokens.png
image_alt: "Disques de cuivre aiguillés vers trois canaux de largeurs différentes, teal étroit et cuivre large"
---

Chaque requête n'a pas besoin du modèle le plus capable. Beaucoup de tokens partent parce qu'on aiguille mal, pas parce que la tâche est difficile.

Le routage intelligent, je le vois comme un tri en amont : classer la demande (FAQ, extraction, raisonnement, code, rédaction), puis envoyer vers le modèle qui suffit.

Cas fréquent : un assistant interne. Reformuler un mail, extraire une date, déboguer une stack. Tout part vers le même modèle frontier, avec le même historique de quarante messages. Les tokens s'empilent sur des tâches qu'un petit modèle ferait en une passe.

Ce que je mets en place :

→ Un classifieur léger (règles + petit modèle) qui estime complexité, besoin de contexte, et risque d'erreur.

→ Une cascade : petit modèle d'abord. Si le score de confiance ou un check métier échoue, on remonte. Pas l'inverse.

→ Un budget de contexte par route. Une FAQ n'a pas besoin de tout le thread ni de tout le RAG.

→ Des sorties contraintes (JSON, longueur max) sur les routes simples. Moins de tokens générés, moins de dérive.

→ Un compteur par route : tokens, latence, taux d'escalade. Sans ça, on ajuste à l'aveugle.

Le coût d'un LLM se joue autant sur le modèle choisi que sur le contexte qu'on lui envoie.

Sur vos stacks, quelle part des appels pourrait partir sur un modèle plus petit sans que l'utilisateur le voie ?

#LLM #ModelRouting #GenAI #CoutsIA #ArchitectureIA
