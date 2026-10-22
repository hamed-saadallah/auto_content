---
sujet: "vector search"
date: 2026-09-16
platform: linkedin
type: explain-concept
visuel: diagramme
image: images/2026-09-16-vector-search.png
image_alt: "Flux Texte vers Embedding vers voisins proches dans un espace vectoriel"
---

Beaucoup de gens pensent que "vector search" remplace Google. Non. Ça remplace surtout la recherche qui ne marche que si les mots se ressemblent.

La recherche classique compare des termes. Si tu tapes "voiture", tu trouves "voiture". Tu rates souvent "berline", "SUV", ou une phrase qui décrit le même besoin sans jamais écrire le mot. En support client, en doc interne, ou dans un catalogue, ce décalage lexical est quotidien.

La vector search part d'une autre idée : transformer un texte (ou une image) en liste de nombres, un embedding. Deux contenus proches en sens se retrouvent proches dans cet espace. On ne cherche plus la chaîne exacte. On cherche le voisinage.

Critère            | Keyword search         | Vector search
-------------------|------------------------|------------------------
Match              | Mots / tokens          | Proximité de sens
Synonymes          | Souvent ratés          | Souvent captés
Requêtes floues    | Fragiles               | Plus tolérantes
Explicabilité      | Facile à tracer        | Plus opaque
Coût / infra       | Index texte classique  | Embeddings + index ANN

Python
q = embed("politique de remboursement")
docs = embed_many(catalog_texts)
hits = ann_index.search(q, k=5)

Imaginons un catalogue d'aide : l'utilisateur écrit "je veux me faire rembourser". Aucun article ne contient exactement cette phrase. Un moteur keyword peut renvoyer zéro résultat utile. Un index vectoriel peut remonter la page "retour et remboursement" parce que les embeddings sont proches, même sans overlap lexical fort.

Sous le capot, on stocke ces vecteurs dans un index ANN (approximate nearest neighbors) : on accepte une approximation pour rester rapide à grande échelle. HNSW, IVF, et variantes : l'idée commune est d'éviter de comparer la requête à chaque document un par un.

Le piège classique : croire que l'embedding "comprend". Il encode des similarités apprises. Si tes documents sont sales, bilingues mélangés, ou hors distribution du modèle, les voisins seront confidentement faux. Autre erreur fréquente : juger la qualité seulement au feeling, sans jeu de requêtes de test ni métrique de recall.

Autre nuance : vector search et keyword search se complètent souvent. Beaucoup de systèmes mixtes (hybride) gardent le filtre exact (SKU, date, tag) et ajoutent le ranking sémantique. La magie n'est pas d'abandonner les mots. C'est de savoir quand le sens compte plus que la chaîne.

En une phrase : la vector search rapproche ce qui se ressemble en signification, pas seulement en orthographe.

Sur quel cas métier as-tu déjà vu le keyword search échouer alors qu'un humain aurait trouvé tout de suite ?

#VectorSearch #Embeddings #RAG #IA #Search
