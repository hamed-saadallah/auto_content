export function fillTemplate(
  template: string,
  vars: { sujet: string; audience: string; objectif: string },
): string {
  return template
    .replaceAll('{sujet}', vars.sujet)
    .replaceAll('{audience}', vars.audience)
    .replaceAll('{objectif}', vars.objectif);
}

export const DEFAULT_AUDIENCE = 'practitioners who ship AI-assisted software';
export const DEFAULT_OBJECTIF = 'share a concrete, usable lesson';

export const BLOG_PROMPT = `Write a blog article in English on the topic of {sujet}, aimed at {audience}
with the goal of {objectif}.
Return only the article markdown (starting with an H1). Do not include SEO fields, YAML frontmatter, or a preamble.

YOAST SEO GUIDELINES:
- Keyword integration: Place the focus keyword naturally in the title (H1),
  within the first 100 words, and in 1–2 headers. Target 2–3% keyword density.
- Readability: Aim for Flesch Reading Ease 60–70 (conversational tone).
  Vary sentence length (mix short and long), keep paragraphs short (3–4 sentences),
  and use natural transitions (However, Therefore, In addition, etc.) in at least 30% of paragraphs.
- Heading hierarchy: Use proper H1 → H2 → H3 structure. Only one H1 (the title).
  Use H2 for main sections, H3 for subsections if needed.
- Active voice: Favor active voice (target 80%+ of sentences).

FACT-CHECKING RULE (priority):
- Never invent a statistic, date, study name, or quote attributed to a
  real person/source.
- If you are not certain a fact is accurate, recast it as a personal
  observation rather than an established fact — but only if it is genuinely
  a generic point of view, not a made-up specific event.
- Theoretical/cultural references must be limited to widely known
  elements (concepts, books, canonical authors).
- If in doubt about a reference: omit it rather than keep it hoping it
  is correct.

STRUCTURE (flexible skeleton — adapt, merge, or drop 1–2 elements if
the topic fits better that way; do not treat this as a rigid checklist):
- Title (H1): clear and specific to {sujet}, no clickbait.
- Lede: hook + promise of the article. Avoid stock openers
  ("What if I told you...", "In a world where...").
- Context / illustration: a genuinely relevant reference or anecdote,
  not bolted on.
- Problem: a common pitfall or mistake related to {sujet}, with a
  concrete example — real if you know it with certainty, otherwise
  framed explicitly as hypothetical ("imagine...", "a frequent case...").
- Development: 2 to 4 H2 sections that go deeper on the topic (not a
  single unbroken block).
- Actionable list: 3 to 5 concrete, specific actions, adapted to
  {audience} (not "be authentic" but what that means precisely
  in this context).
- Conclusion: one synthesis sentence, no generic motivational slogan,
  plus an opening (a question specific to the topic, or a next step).

BLOG FORMAT CONSTRAINTS:
- Target length: 800–1200 words (excluding the title).
- Allowed Markdown: \`#\` title, \`##\` sections, lists, **bold** for
  key terms. No hashtags.
- Spacious paragraphs, one strong idea per paragraph.

STYLE — AVOID (AI writing tells):
- Excess em dashes (—)
- Mirror sentences ("It's not X, it's Y")
- Decorative emojis with no function
- Empty transition formulas ("Here's why", "The key?")
- Hollow adjectives ("powerful", "incredible", "essential") without justification

STYLE — PREFER:
- Irregular rhythm: alternate short and long sentences
- Concrete details over generalities
- One strong idea per paragraph

TONE: Professional but accessible, an assumed personal voice ("I advise",
"I've noticed that"), without excessive familiarity.

GOAL: Deliver a useful, fact-checked article, adapted to {audience}, in
service of the goal of {objectif}.`;

export const TUTORIAL_PROMPT = `Write a how-to tutorial in English on {sujet}, aimed at {audience}
with the goal of {objectif}.
Return only the tutorial markdown (starting with an H1). Do not include SEO fields, YAML frontmatter, or a preamble.

YOAST SEO GUIDELINES (for tutorials):
- Keyword integration: Place the focus keyword naturally in the title, first
  100 words, and 1-2 headers/steps. Target 2-3% keyword density overall.
- Readability: Aim for Flesch Reading Ease 60-70. Use clear, direct language,
  short sentences for instructions, and vary paragraph length.
- Heading hierarchy: Proper H1 (title only) -> H2 -> H3 structure. Numbered
  steps should be H2 or H3. Only one H1 per tutorial.
- Active voice: Favor active voice (target 80%+ of sentences).

FACT-CHECKING RULE (priority):
- Never invent a statistic, date, study name, or quote attributed to a
  real person/source.
- Do not invent CLI flags, API fields, menu labels, or config keys.
  If a command or setting is uncertain, omit it or mark the gap
  explicitly rather than guessing.

STRUCTURE:
- Title (H1): a specific how-to for {sujet}, no clickbait
  ("How to set up X", "Do Y with Z").
- Outcome: what the reader will have working by the end, in one
  short paragraph.
- Prerequisites: tools, accounts, versions, or knowledge required.
- Steps: numbered H2 (or H3 under a section) with one action per
  step. Show the command, config, or click path.
- Pitfalls / troubleshooting: 2 to 4 common mistakes related to
  {sujet}, with a concrete fix.
- Recap: what was built, plus one concrete next step.

TUTORIAL FORMAT CONSTRAINTS:
- Target length: 1200-2000 words (excluding the title).
- Allowed Markdown: \`#\` title, \`##\` / \`###\` sections, lists,
  numbered steps, **bold** for key terms, \`inline code\`, and
  fenced code blocks. No hashtags.
- One action per step.

TONE: Professional but accessible, an assumed personal voice.

GOAL: Deliver a useful, fact-checked how-to, adapted to {audience}, in
service of the goal of {objectif}, that the reader can follow and finish.`;

export const LINKEDIN_PROMPT = `Rédige un post LinkedIn percutant sur le thème de {sujet}, destiné à {audience}
dans un objectif de {objectif}.
Retourne uniquement le texte du post (pas de markdown, pas de YAML, pas de préambule).

RÈGLE DE VÉRIFICATION FACTUELLE (prioritaire) :
- N'invente jamais de statistique, date, nom d'étude ou citation attribuée à une
  personne/source réelle.
- Si tu n'es pas certain qu'un fait soit exact, reformule-le comme une observation
  personnelle plutôt qu'un fait établi.
- En cas de doute sur une référence : l'omettre.

STRUCTURE (squelette flexible) :
- Accroche : affirmation forte ou question sur {sujet}, pensée pour fonctionner
  seule dans les ~200 premiers caractères (avant le "…voir plus" de LinkedIn).
- Illustration : une référence ou anecdote réellement pertinente.
- Problème : un piège ou une erreur courante liée à {sujet}, avec un exemple concret.
- Liste actionnable : 3 à 5 actions concrètes et spécifiques, adaptées à {audience}.
- Message central : une phrase de synthèse, sans slogan motivationnel générique.
- Question engageante : ouverte et spécifique au sujet traité.

CONTRAINTES DE FORMAT LINKEDIN :
- Longueur cible : 150-250 mots (hors hashtags), maximum absolu 3000 caractères.
- Pas de syntaxe markdown (**gras**, # titres, [liens](url)).
- Pas de gras/italique Unicode.
- Mise en forme structurelle seulement : une idée par paragraphe, lignes vides entre
  les blocs, 1-3 lignes par paragraphe, puces fonctionnelles (\`→\`).
- 3-5 hashtags maximum en fin de post, spécifiques au sujet.

STYLE - À ÉVITER :
- Tirets cadratins (—) en excès
- Phrases en miroir ("Ce n'est pas X, c'est Y")
- Emojis décoratifs sans fonction
- Formules de transition creuses
- Adjectifs vides sans justification

TON : Professionnel mais accessible, touche personnelle assumée.

OBJECTIF : Transmettre une leçon utile et vérifiée, adaptée à {audience}, en
servant l'objectif de {objectif}, tout en suscitant l'engagement.`;

export const SEO_PROMPT = `Analyze the following {kind} and return ONLY valid JSON (no markdown fences) with:
{
  "seo_title": "English, 50-60 characters, specific, not clickbait",
  "meta_description": "English, 140-160 characters, keyword included naturally",
  "focus_keyword": "1-3 lowercase words from the topic",
  "image_alt": "English description of a 16:9 editorial cover, no 'image of' prefix, under 120 characters",
  "seo_analysis": {
    "readability_score": "Green" | "Yellow" | "Red",
    "seo_score": "Green" | "Yellow" | "Red",
    "keyword_density": "X%",
    "keyword_variations": ["...", "..."],
    "internal_linking_suggestions": ["section: anchor"],
    "word_count": 0
  }
}
Do not invent a different topic. Derive fields from the approved body.

Topic: {sujet}

BODY:
{body}`;

export const IMAGE_PROMPT = `Generate a 16:9 editorial illustration of: {sujet}.
No letters, watermarks, logos, or UI text. No stock clichés (handshakes, glowing brains, generic laptops).
Abstract, editorial, slate and teal tones. Photorealistic lighting on geometric forms.`;

export const REVISE_PROMPT = `Revise the following {kind} according to this instruction:
{instruction}

Keep the same language and constraints as the original (LinkedIn posts stay plain text without markdown).
Return only the revised body, no preamble.

ORIGINAL:
{body}`;
