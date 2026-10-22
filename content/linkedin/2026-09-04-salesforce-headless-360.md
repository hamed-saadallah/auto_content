---
sujet: "Salesforce Headless 360"
date: 2026-09-04
platform: linkedin
---

Salesforce sans ouvrir un onglet Salesforce.

C’est le vrai sujet de Headless 360 : exposer Customer 360 comme une couche d’exécution (API, outil MCP, commande CLI). Le navigateur devient optionnel. Un agent peut brancher data, workflows et règles métier sans qu’un humain clique dans Lightning.

Le e-commerce a déjà vécu ce découplage. Le catalogue restait le système de record. La vitrine, elle, pouvait vivre sur n’importe quelle surface. Headless 360 applique la même logique à tout le CRM : ventes, service, commerce, agents.

Le piège fréquent : coller un agent devant l’UI et appeler ça “headless”. Imaginons un flux classique : créer une opportunité, respecter vos sharing rules, déclencher une approbation. Si l’agent clique à votre place, vous avez de l’automatisation fragile. S’il consomme les mêmes capacités que vos users, avec une identité auditable et vos permissions, vous avez une architecture.

Quelques réflexes concrets si vous commencez à creuser :

→ Partez des capacités métier à exposer (créer un case, relancer un devis, lire un compte), pas des écrans à recréer
→ Testez un flux réel via MCP depuis un coding agent (Cursor, Claude Code), pas une démo PowerPoint
→ Vérifiez que l’agent hérite de vos permission sets, du field-level security et des sharing rules. Un “super user” de commodité n’est pas de la gouvernance
→ Séparez logique et surface : Slack, React, voix, Lightning pour les humains. Le Headless Experience Layer sert exactement à ça
→ Distinguez Headless 360 et Data 360. Le premier orchestre les capacités Salesforce. Le second porte le contexte data

Lightning n’est pas à jeter. C’est une surface parmi d’autres. Le système de record, lui, reste au centre.

Vous avez déjà un process où vos équipes, ou vos agents, devraient agir dans Salesforce sans jamais ouvrir le CRM ?

#Salesforce #Headless360 #Agentforce #CRM #ArchitectureIT
