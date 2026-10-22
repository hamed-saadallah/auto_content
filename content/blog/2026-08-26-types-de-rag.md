---
sujet: "Les différents types de RAG"
date: 2026-08-26
platform: blog
featured_image: images/2026-08-26-types-de-rag.png
seo_title: "Types de RAG : HyDE, Self-RAG, multi-hop et agentic"
meta_description: "Du RAG classique à Self-RAG, HyDE, multi-hop et agentic : quelles architectures choisir selon vos questions, vos données et vos contraintes."
image_alt: "Réseau abstrait de documents reliés par des chemins de retrieval en tons bleu-ardoise et teal"
focus_keyword: "types de rag"
---

# Les différents types de RAG : au-delà du retrieval simple

La Retrieval-Augmented Generation (RAG) s’est imposée comme une façon concrète d’ancrer un modèle de langage dans des données externes. En pratique, pourtant, « faire du RAG » ne veut presque jamais dire la même chose d’un projet à l’autre. Derrière le même acronyme, on trouve des architectures très différentes, avec des coûts, des latences et des garanties qui n’ont rien à voir.

Beaucoup d’équipes commencent par brancher une base vectorielle sur un LLM et s’arrêtent là. Ça marche… jusqu’au jour où la question demande un raisonnement en plusieurs étapes, où le retrieval remonte du bruit, ou où le modèle invente une synthèse à partir de passages à peine pertinents. Le piège n’est pas technique : c’est de traiter le RAG comme un module unique, alors que c’est une famille de designs.

## Le RAG classique : efficace, mais vite limité

Le schéma de base reste le même : une question arrive, on récupère quelques passages proches dans un index, on les injecte dans le prompt, puis le modèle génère une réponse.

Pour une FAQ, une doc produit ou une recherche documentaire simple, c’est souvent suffisant. La limite apparaît dès que la bonne réponse n’est pas dans un seul extrait, ou dès que la formulation de la question s’éloigne trop du vocabulaire des documents. À ce stade, ajouter « plus de chunks » ne corrige presque jamais le fond du problème. Il faut changer la stratégie.

## HyDE : chercher comme si on avait déjà la réponse

Avec Hypothetical Document Embeddings (HyDE), on ne cherche plus directement à partir de la question. On demande d’abord au modèle de rédiger un document hypothétique qui y répondrait, puis on utilise cet énoncé pour interroger l’index.

L’idée est simple : un faux document bien formulé se rapproche souvent davantage du style et du contenu des sources réelles qu’une question courte. J’ai remarqué que cette approche aide surtout quand les utilisateurs parlent en langage métier, alors que les documents sont rédigés en jargon technique, ou l’inverse. Ce n’est pas magique, mais c’est un levier utile avant de complexifier toute la chaîne.

## Self-RAG : une capacité apprise, pas un prompt de plus

Self-RAG ne se résume pas à demander poliment au modèle : « vérifie si ce document est utile ». L’apport principal est dans l’entraînement. Le modèle est entraîné (ou fine-tuné) pour produire, en plus de la réponse, des signaux de contrôle : faut-il récupérer de l’information ? Ce passage est-il pertinent ? La génération est-elle supportée par les sources ?

Concrètement, Self-RAG apprend à décider quand lancer un retrieval, à évaluer la qualité des passages récupérés, et à juger si la réponse finale reste fidèle au contexte. Ce n’est donc pas une couche de prompting collée après coup sur un RAG classique : c’est une modification du comportement du modèle lui-même, avec des tokens ou des labels dédiés à ces décisions.

La différence compte en production. Un simple prompt d’auto-critique peut aider un peu, mais il reste fragile et irrégulier. Self-RAG vise une boucle retrieval / critique / génération plus stable, parce que cette boucle a été apprise. Le coût, lui, est réel : il faut un setup d’entraînement adapté, des données annotées ou synthétiques pour ces signaux, et une infra plus lourde qu’un pipeline « embed + top-k + prompt ».

## Multi-hop RAG : enchaîner des recherches, pas empiler des filtres

Le multi-hop RAG répond à un autre besoin : certaines questions ne se résolvent pas en une seule récupération, parce que l’information utile est répartie et dépendante d’étapes intermédiaires.

Ce n’est pas la même chose qu’une requête multi-critères. Filtrer « les clients du secteur X, actifs depuis moins de 90 jours, avec un contrat Y » reste souvent une seule interrogation structurée. Le multi-hop, lui, suppose une chaîne : la réponse à l’étape 1 devient l’entrée de l’étape 2.

Imaginons une question du type : « Quel cabinet a accompagné l’entreprise qui a racheté la filiale européenne de Telora l’an dernier, et sur quel sujet réglementaire ? » Une première recherche identifie l’acquéreur. Une deuxième part de ce nom pour retrouver le cabinet. Une troisième relie ce cabinet au sujet réglementaire. Chaque hop dépend du précédent ; sans cette chaîne, le système cherche trop tôt une réponse complète qui n’existe nulle part en un seul document.

Le multi-hop RAG est donc plus lent et plus difficile à évaluer. En contrepartie, il permet de traiter des questions où le raisonnement documentaire compte autant que la similarité sémantique.

## Agentic RAG : laisser le modèle piloter la recherche

Dans l’agentic RAG, le LLM ne suit plus un pipeline figé. Il choisit dynamiquement d’interroger un index, une API, une base SQL, de reformuler, de croiser, puis de s’arrêter quand l’information suffit.

C’est adapté aux enquêtes ouvertes, aux synthèses transverses, aux cas où on ne peut pas prédire à l’avance le nombre d’étapes utiles. Le trade-off est clair : plus de flexibilité, mais aussi plus de latence, plus de coût, et un besoin plus fort de garde-fous (outils autorisés, budgets d’appels, traçabilité des sources).

## Ce que je conseille de faire concrètement

1. Classez vos questions réelles en trois paniers : une seule source suffit, plusieurs sources indépendantes, ou chaîne d’étapes dépendantes.
2. Mesurez d’abord la qualité du retrieval (rappel, précision des top-k, présence de la bonne source) avant de toucher au modèle de génération.
3. Testez HyDE quand l’écart de vocabulaire entre questions et documents est le vrai frein.
4. N’envisagez Self-RAG que si vous êtes prêts à investir dans l’entraînement / fine-tuning, pas seulement dans un prompt d’auto-évaluation.
5. Réservez multi-hop et agentic aux cas où une seule passe de retrieval échoue de façon structurelle, pas pour « faire plus moderne ».

Le RAG a rendu les LLM plus ancrés et plus utiles en entreprise. Mais la bonne question n’est pas « quel type de RAG est le meilleur ? ». C’est plutôt : quelle partie de mon problème vient du retrieval, du raisonnement multi-étapes, ou de l’absence de contrôle appris dans le modèle ? Une fois ce diagnostic posé, le choix d’architecture devient beaucoup plus simple.
