---
sujet: "Agents vocaux et bonnes pratiques pour les développer et les tester"
date: 2026-09-04
platform: linkedin
---

Le premier vrai appel d’un agent vocal ne ressemble jamais à la démo.

Vous avez un STT, un LLM, un TTS. En interne, tout le monde tape des phrases propres. Ça marche. Puis quelqu’un appelle vraiment : il coupe la phrase, l’ASR entend « quinze » au lieu de « cinq », un camion passe, et l’agent confirme un rendez-vous au mauvais jour. Sans filet.

Un cas fréquent : coller un micro sur un chatbot et appeler ça un agent vocal. La voix n’est pas du texte lu à voix haute. On ne relit pas. On subit la latence, les « euh », les interruptions.

Quelques réflexes si vous en construisez un :

→ Concevez pour l’oral. Une question à la fois. Confirmation explicite sur les slots critiques : montant, date, identité.
→ Budgettez le silence. Deux secondes à l’écran passent. Au téléphone, ça sonne comme un plantage. Streamez transcription et réponse, n’attendez pas la phrase complète.
→ Gérez le barge-in. L’utilisateur doit pouvoir couper. S’il parle par-dessus et que l’agent continue, vous avez un IVR, pas un agent.
→ Testez avec de l’audio réel, pas du texte tapé. Accents, rumble, « allô ? », phrases coupées, fillers.
→ Mesurez ce qui casse vraiment : compréhension d’intention après ASR, taux de clarification, temps jusqu’à la première syllabe, traces où l’agent a inventé un slot.

Le texte, on le relit. La voix, elle, se joue en temps réel. Un bon agent vocal sait où s’arrêter et comment redemander, plutôt que de remplir les blancs.

Vous testez encore sur des transcripts propres, ou sur des appels qui ressemblent à de vrais utilisateurs ?

#AgentsVocaux #VoiceAI #ConversationalAI #QA #ProductManagement
