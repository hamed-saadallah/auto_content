---
sujet: "Conversational AI"
date: 2026-09-08
platform: linkedin
image: images/2026-09-08-conversational-ai.png
image_alt: "Deux silhouettes face à face, rubans de parole teal et ambre qui s'entrelacent et convergent vers une issue"
---

Beaucoup d'assistants que je vois en prod n'ont de conversation que la surface. Une question. Une réponse. On appelle ça du Conversational AI.

ELIZA, dès les années 1960, faisait déjà illusion en renvoyant les mots de l'utilisateur. On savait que ça ne comprenait rien. Les phrases sont plus fluides aujourd'hui. Le piège n'a pas changé.

Cas fréquent : coller un LLM sur une base documentaire et vendre un assistant. Ça tient tant que la demande tient en une tour. Dès que quelqu'un dit « non, pas ça, l'autre option, celle d'hier », le fil casse. Pas de but, pas d'état, pas de réparation.

Si vous en construisez un :

→ Décrivez la tâche, pas le prompt. Quel job doit être fini à la fin de l'échange : rendez-vous, remboursement, diagnostic, commande.

→ Concevez la réparation. « Ce n'est pas ça », « attends », « je me suis trompé » sont des tours de dialogue, pas des erreurs. Recadrez sans tout recommencer.

→ Gardez un état explicite : ce qui a été dit, les contraintes, ce qui manque. Sans mémoire de tâche, le modèle rejoue le FAQ à chaque message.

→ Mesurez la complétion de tâche, pas seulement la qualité de la phrase.

→ Décidez où l'humain reprend. Un bon assistant sait s'arrêter.

Une réponse plausible ne suffit pas. L'IA conversationnelle tient le fil jusqu'à ce que le job soit fait, ou transféré.

Vous scorez encore la réponse, ou le pourcentage de conversations qui arrivent au bout ?

#ConversationalAI #Chatbots #NLU #ProductManagement #IAConversationnelle
