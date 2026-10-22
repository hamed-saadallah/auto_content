---
sujet: "Accès des tools d'un agent IA selon les droits de l'utilisateur"
date: 2026-10-12
platform: linkedin
type: explain-concept
visuel: schema
image: images/2026-10-12-acces-tools-agent-ia.png
image_alt: "Utilisateur lecteur, filtre ACL, agent : seul le tool Lire ticket reste autorisé"
---

Tu branches dix tools sur l'agent. L'utilisateur n'a le droit d'en appeler que trois. Si les dix restent dans le prompt, tu viens d'inventer un admin par procuration.

Copilots, serveurs MCP, function calls : on câble vite un catalogue parce que "l'agent a besoin d'agir". Le modèle propose. Le runtime exécute. Entre les deux, trop souvent, personne ne revérifie si CET utilisateur a le droit. Le trou n'est pas le LLM. C'est le pont entre le prompt et l'API.

Le scoped tool access, c'est l'intersection, à chaque tour, entre les capacités de l'agent et les autorisations de la personne qui le pilote. L'agent n'a pas d'identité magique. Il agit au nom de l'utilisateur courant. Tools visibles, arguments acceptés, données renvoyées : tout reste dans ce périmètre. Un tool "supprimer un compte" peut exister sur le serveur. Pour un lecteur, il n'existe pas.

Le modèle peut proposer n'importe quelle action. Le runtime refuse ce qui dépasse le rôle.

Critère          | Catalogue unique      | Scoped à l'user
-----------------|-----------------------|------------------
Tools exposés    | Tous ceux du serveur  | Intersection
Identité d'appel | Compte de service     | Token de l'user
Données lues     | Périmètre large       | Ce qu'il a le droit
Si le rôle change| L'agent garde tout    | Le catalogue suit

TS
const tools = catalog.filter(t => user.can(t.permission))

function callTool(name, args, user) {
  if (!user.can(name)) throw Error("forbidden")
  return run(name, args, { as: user })
}

Cas hypothétique. Un agent support a trois tools : lire un ticket, rembourser, clôturer le compte. Alice est niveau 1 : lecture seulement. Bob est superviseur : lecture et remboursement. Si tu injectes les trois tools dans chaque session, Alice n'a qu'à écrire "clôture ce compte". Le modèle, obéissant, tente l'appel. Sans check au runtime, l'action passe. Alice n'a pas contourné la sécu. C'est le catalogue qui l'a élevée au-dessus de son rôle.

Deux oublis fréquents. Filtrer la liste ne suffit pas : il faut revalider à l'exécution. L'UI cache "supprimer", l'endpoint reste ouvert. Un compte de service plus puissant que n'importe quel user, "parce que l'agent doit agir", pose un super-utilisateur invisible. Et un prompt "respecte les droits de l'utilisateur" n'est pas une ACL. Il se contourne par une formulation, un enchaînement de tools, ou une hallucination utile.

Même check que si l'humain cliquait le bouton. Même identité. Même journal d'audit. L'agent accélère le parcours. Il n'élargit pas le périmètre.

Dans ton produit, un user sans le droit X peut-il encore faire X simplement en le demandant à l'agent ?

#AgentsIA #Authorization #LeastPrivilege #MCP #AppSec
