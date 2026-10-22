---
sujet: "Agentforce"
date: 2026-09-30
platform: linkedin
image: images/2026-09-30-agentforce.png
image_alt: "Pupitre de cartes CRM et fil de cuivre passant par trois arches de contrôle jusqu'à un sceau"
---

Un copilote vous rédige un brouillon. Un agent Agentforce, lui, peut ouvrir le case, relire le contrat, proposer un geste commercial et le tracer dans Salesforce. À condition que vous lui ayez donné le droit, les données, et les limites.

C'est ça, Agentforce : un rôle, un canal, des topics (un job à faire), des actions, des instructions, et un moteur de raisonnement (Atlas) qui décide de l'étape suivante.

Le piège fréquent : partir d'un prompt unique, trop large. Imaginons un « agent service » qui gère à la fois le suivi de commande, le remboursement, le churn et la FAQ produit. Atlas n'a plus de job clair. Il mélange les actions. Et le bot dit oui à une demande qu'un humain aurait refusée.

Ce que je pose avant d'ouvrir un canal client :

→ Un topic = un job. « Suivre une commande » n'est pas « rembourser un client ». Classification, périmètre, instructions : trois textes distincts.
→ Des actions comme des contrats. Nom, description, entrées. Atlas choisit à partir de ça.
→ Ancrer dans le CRM, pas dans le prompt. Compte, case, commande : les données Salesforce, et Data 360 si vous unifiez le profil.
→ Écrire aussi les interdits. Jamais de remboursement au-delà d'un seuil sans un humain. Les garde-fous tiennent dans une instruction de topic et une liste d'actions autorisées.
→ Tester le raisonnement avant le go-live. Si l'agent choisit le mauvais topic, le job a souvent été mal découpé.

Le copilote aide un humain derrière l'écran. L'agent Agentforce agit dans le périmètre que vous avez dessiné.

Sur vos process Salesforce, quel job mérite un agent autonome, et lequel doit rester une aide à l'humain ?

#Agentforce #Salesforce #AgentsIA #CRM #Data360
