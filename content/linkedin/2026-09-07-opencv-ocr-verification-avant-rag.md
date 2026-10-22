---
sujet: "Prétraitement OpenCV, OCR et vérification avant RAG"
date: 2026-09-07
platform: linkedin
image: images/2026-09-07-opencv-ocr-verification-avant-rag.png
image_alt: "Page scannée traversée de filtres optiques, puis d'un seuil, avant un réseau de retrieval"
---

Un PDF scanné de travers, et tout le RAG qui suit devient du théâtre.

J'ai trop souvent vu le même enchaînement : OCR sur le dossier, texte brut indexé, chatbot qui cite ses sources. Les citations sont là. Le contenu, lui, est déjà faux. Un 8 lu comme un 3. Une date inversée. Deux colonnes d'un tableau collées en une phrase.

Beaucoup attribuent ça au LLM. En pratique, l'erreur est déjà dans l'image, avant le premier token.

Cas fréquent : une facture prise en photo, lumière inégale, page un peu penchée. OpenCV n'est pas un filtre esthétique ici. Redresser, débruiter, monter le contraste, binariser. C'est ce qui décide si l'OCR lit un montant ou fabrique un chiffre.

Ensuite on lit. Puis on vérifie. On n'indexe pas un texte juste parce qu'il forme des phrases.

Avant le premier chunk :

→ Redresser et nettoyer l'image (orientation, bruit, marges)
→ Lire avec un OCR qui expose une confiance par mot, pas seulement un bloc
→ Bloquer si la confiance, la densité ou le texte incohérent dépassent un seuil
→ Valider les champs extraits (formats, types, règles métier)
→ N'envoyer au RAG que ce qui a passé le gate

Le retrieval ne rattrape pas une mauvaise lecture. Il la répète, proprement, avec des sources.

À quel moment refusez-vous un scan plutôt que de l'indexer quand même ?

Sources

Outils :
OpenCV : https://opencv.org/
Tesseract : https://github.com/tesseract-ocr/tesseract

Pour aller plus loin :
→ Prétraitement image recommandé par Tesseract (deskew, binarisation, bruit) : https://tesseract-ocr.github.io/tessdoc/ImproveQuality.html
→ Seuillage et binarisation OpenCV : https://opencv.org/image-thresholding-using-opencv/
→ Correction d'inclinaison avec OpenCV : https://pyimagesearch.com/2017/02/20/text-skew-correction-opencv-python/
→ Ingestion RAG : prétraiter, mesurer la confiance OCR, exclure les pages trop faibles : https://docs.anyscale.com/rag/quality-improvement/data-ingestion-strategies
→ Parsing documentaire et quarantaine de l'OCR peu fiable : https://www.llamaindex.ai/glossary/enterprise-rag-document-ingestion

#OCR #OpenCV #RAG #DocumentAI #GenAI
