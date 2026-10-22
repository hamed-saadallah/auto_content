---
sujet: "Orchestration d'agents IA"
date: 2026-09-27
platform: linkedin-carousel
slide_count: 9
theme:
  bg: "#f6f1e8"
  ink: "#191919"
  accent: "#b4532a"
  font: "Georgia, serif"
document: pdfs/2026-09-27-orchestration-agents-ia.pdf
document_title: "2026-09-27-orchestration-agents-ia.pdf"
slides:
  - id: 1
    role: hook
    title: "Ajouter des agents ne fait pas une orchestre"
    body: "J'ai vu des stacks où trois agents s'appellent en rond, chacun avec sa mémoire, aucun contrat de sortie. Ça ressemble à du multi-agent. Ça n'orchestre rien."
    bullets:
      - "Un agent de plus n'est pas un chef d'orchestre"
      - "Sans ordre, l'état se perd entre les appels"
      - "Le statut succès peut mentir jusqu'au bout"
    background: images/2026-09-27-orchestration-agents-ia/slide-01-bg.png
  - id: 2
    role: problem
    title: "Le piège du chat entre agents"
    body: "Cas fréquent : un agent recherche, un autre rédige, un troisième vérifie. Ils se passent du texte libre. Le deuxième reformule une erreur du premier. Le troisième valide le style, pas le fond."
    bullets:
      - "Handoff en prose, pas en schéma"
      - "Personne n'est responsable du résultat final"
      - "Chaque agent relit tout l'historique"
      - "Les outils se chevauchent sans frontière"
      - "On débogue un dialogue, plus un workflow"
    background: images/2026-09-27-orchestration-agents-ia/slide-02-bg.png
  - id: 3
    role: why
    title: "Orchestrer, c'est décider avant l'appel"
    body: "L'orchestration, je la vois comme le plan : qui parle, dans quel ordre, avec quel état, et quand on s'arrête. Le modèle exécute une étape. Il ne choisit pas l'architecture à chaque token."
    bullets:
      - "Un graphe ou un pipeline, pas une conversation ouverte"
      - "Un état partagé, versionné, lisible"
      - "Des rôles avec un mandat étroit"
      - "Une condition d'arrêt écrite"
      - "Un humain ou un critique aux portes à risque"
    background: images/2026-09-27-orchestration-agents-ia/slide-03-bg.png
  - id: 4
    role: value
    title: "Choisissez le motif, pas le framework"
    body: "Je commence souvent par trois motifs. Pipeline si l'ordre est fixe. Superviseur si une étape route vers un spécialiste. Graphe si des boucles et des reprises sont nécessaires. Le framework vient après."
    bullets:
      - "Pipeline : A puis B puis C, état en entrée et sortie"
      - "Superviseur : un routeur, des spécialistes muets entre eux"
      - "Graphe : nœuds, arêtes, reprise sur échec"
      - "Évitez que tout le monde parle à tout le monde"
      - "Changez de motif quand le cas le force"
    background: images/2026-09-27-orchestration-agents-ia/slide-04-bg.png
  - id: 5
    role: value
    title: "L'état est le vrai contrat"
    body: "Si deux agents ne s'échangent qu'un paragraphe, vous orchestrez de la prose. Je préfère un état typé : but, preuves, décision, incertitude. Chaque nœud lit un sous-ensemble, écrit un champ, rien d'autre."
    bullets:
      - "Schéma stable, objets, pas un roman"
      - "Champs d'entrée et de sortie nommés"
      - "Interdit de réécrire le but en silence"
      - "Garder les preuves, pas seulement la conclusion"
      - "Versionner l'état pour rejouer un run"
    background: images/2026-09-27-orchestration-agents-ia/slide-05-bg.png
  - id: 6
    role: value
    title: "Aiguillez outils et modèles par nœud"
    body: "Un nœud de tri n'a pas besoin du modèle le plus capable, ni de tous les outils. J'attache à chaque étape un modèle, un budget, une liste d'outils courte. Moins de surface, moins de dérive."
    bullets:
      - "Un nœud, un job, une poignée d'outils"
      - "Petit modèle pour classer et extraire"
      - "Modèle plus capable seulement sur le raisonnement"
      - "Budget tokens et timeout par nœud"
      - "Pas d'outil d'écriture sur un nœud de revue"
    background: images/2026-09-27-orchestration-agents-ia/slide-06-bg.png
  - id: 7
    role: value
    title: "Tracez le run comme un workflow"
    body: "Quand ça casse, je veux savoir quel nœud, quel état, quel outil, pourquoi la reprise. Un dump de prompts ne suffit pas. L'orchestration se debug comme un pipeline, pas comme un chat."
    bullets:
      - "Identifiant de run et de nœud"
      - "Diff d'état avant et après"
      - "Outil appelé, arguments, résultat"
      - "Motif de reprise ou d'arrêt"
      - "Replay possible à partir de l'état"
    background: images/2026-09-27-orchestration-agents-ia/slide-07-bg.png
  - id: 8
    role: mistakes
    title: "Erreurs que je vois souvent"
    body: "Elles tiennent rarement au modèle. Elles tiennent au fait qu'on a laissé les agents s'organiser tout seuls, sans partition écrite."
    bullets:
      - "Un agent chef qui refait tout le travail"
      - "Aucun schéma entre les nœuds"
      - "Boucle sans plafond de retries"
      - "Revue avec les mêmes outils que la prod"
      - "Observabilité limitée aux logs LLM"
    background: images/2026-09-27-orchestration-agents-ia/slide-08-bg.png
  - id: 9
    role: cta
    title: "Qui tient la partition ?"
    body: "Sur votre stack, l'orchestration est-elle un graphe écrit, ou une conversation qui s'invente à l'exécution ? L'étape utile : dessiner les nœuds, l'état, et la porte d'arrêt."
    bullets:
      - "Nommez le motif : pipeline, superviseur, graphe"
      - "Écrivez le schéma d'état"
      - "Décidez qui peut arrêter le run"
    background: images/2026-09-27-orchestration-agents-ia/slide-09-bg.png
---

Plusieurs agents qui se parlent, ça donne souvent un chat. Rarement un workflow.

J'ai regroupé ici ce que je pose avant d'ajouter un énième agent : le motif (pipeline, superviseur, graphe), l'état partagé, l'aiguillage des outils, et la trace du run.

Sur votre stack, l'orchestration est un graphe écrit, ou une conversation qui s'invente à l'exécution ?

#AgentsIA #Orchestration #MultiAgent #LLM #ArchitectureIA
