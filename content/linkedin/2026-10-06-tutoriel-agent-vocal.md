---
sujet: "Tutoriel agent vocal avec Python, FastAPI, Mistral AI, LangGraph et Deepgram"
date: 2026-10-06
platform: linkedin
image: images/2026-10-06-tutoriel-agent-vocal.png
image_alt: "Micro cuivre relié par des fils teal à trois chambres de verre, un graphe de nœuds laiton et un pavillon"
---

Un agent vocal qui « marche » au premier enregistrement, je m'en méfie. Trop de couches parlent en même temps.

J'ai publié un tutoriel pour en monter un en local : FastAPI tient chaque tour de parole, Deepgram transcrit et synthétise, un StateGraph LangGraph avec Mistral AI appelle des outils et garde l'état. L'exemple est un magasin : horaires du samedi, suivi de commande ORD-1001.

Le piège fréquent : brancher le micro dès le premier commit. Imaginons un blob WebM vide, une clé Mistral invalide, et bind_tools oublié. Dans le navigateur, ça fait juste « ça ne répond pas ».

Ce que je fais, dans l'ordre :

→ Smoke-test Mistral tout seul. Une phrase. Si ça échoue, le graphe ne sauvera rien.

→ Smoke-test Deepgram Listen et Speak sur un WAV public, pas sur votre voix.

→ Faire tourner le graphe en texte, même thread_id, deux questions de suite. Vérifier que l'outil hours et l'outil order partent vraiment.

→ Une route FastAPI par tour, asyncio.to_thread, JSON avec transcript + reply + audio. Pas seulement un MP3 muet.

→ Un session_id fixe par onglet. Un id nouveau à chaque clic, plus de mémoire.

Tant que chaque API n'a pas son test isolé, le micro n'ajoute que du bruit.

Le pas à pas, avec le code :

https://www.hamedsaadallah.com/2026-10-06-voice-agent-python-fastapi-mistral-langgraph-deepgram/

Vous déboguez encore depuis le navigateur, ou vous avez déjà un smoke test par couche ?

#AgentsVocaux #LangGraph #FastAPI #Deepgram #MistralAI
