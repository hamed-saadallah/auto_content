---
sujet: "Les différents types de chunking en ML"
date: 2026-09-03
platform: linkedin
---

Votre RAG rate des réponses évidentes ? Avant de changer de modèle, inspectez vos chunks.

Le chunking fixe ce qu'un LLM peut lire. Je vois souvent la même erreur en prod : des blocs de taille fixe, sans overlap ni logique documentaire.

Quatre familles que je compare systématiquement :

Fixe (N tokens) : simple, rapide. Convient aux logs ou FAQ courtes. Piège : une définition coupée en deux morceaux inutilisables.

Structurel : découper aux titres, paragraphes ou pages. Indispensable pour la doc technique, où la hiérarchie porte le sens.

Sémantique : regrouper les passages proches en espace vectoriel. Chunks plus cohérents, coût d'indexation plus élevé.

Récursif + overlap : gros blocs d'abord, puis affinage ; chevauchement aux frontières. Mon choix par défaut sur les rapports longs.

Aucune méthode ne gagne partout. Le bon test : posez la même question avant/après changement de stratégie, sur vos vrais documents.

Vous partez plutôt sur du fixe, du sémantique ou du structurel, et pour quel type de contenu ?

#RAG #MachineLearning #NLP #LLM #Chunking
