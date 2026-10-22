import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  escapeLinkedInCommentary,
  LINKEDIN_COMMENTARY_MAX_LENGTH,
  validatePost,
} from './publish-to-linkedin.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skillDir = path.join(repoRoot, '.cursor/skills/linkedin-explain-concept');
const skillPath = path.join(skillDir, 'SKILL.md');
const readmePath = path.join(skillDir, 'README.md');
const genericSkillPath = path.join(repoRoot, '.cursor/skills/linkedin-post/SKILL.md');
const showcaseSkillPath = path.join(repoRoot, '.cursor/skills/linkedin-product-showcase/SKILL.md');
const studioSkillPath = path.join(repoRoot, '.cursor/skills/content-studio/SKILL.md');

const CONCEPT_FIXTURE_BODY = `La plupart des gens confondent debounce et throttle. Les deux "ralentissent" un handler. Ils ne le font pas de la même façon, et ce détail change l'expérience utilisateur bien plus souvent qu'on ne le croit.

Sur un produit réel, le mauvais choix se voit vite : trop de requêtes, une UI qui semble figée, ou un indicateur qui saute au lieu de suivre le geste. Ce n'est pas une question de goût. C'est une question de rythme.

Debounce : on attend que l'utilisateur s'arrête avant d'agir. Throttle : on accepte au plus un appel par intervalle, même si l'événement continue. Autrement dit, debounce attend le calme. Throttle impose une cadence.

Critère          | Debounce              | Throttle
-----------------|-----------------------|------------------
Déclenchement    | Après la pause        | À intervalle fixe
Cas typique      | Champ de recherche    | Scroll / resize
Sensation UI     | Réagit au calme       | Suit le flux
Risque si mauvais| Trop d'appels API     | UI "morte" un instant

JS
const onSearch = debounce(queryApi, 300)
input.addEventListener('input', (e) => onSearch(e.target.value))

const onScroll = throttle(updateBar, 100)
window.addEventListener('scroll', onScroll)

Imaginons une barre de recherche qui interroge une API à chaque frappe. Sans debounce, chaque lettre part en réseau. Avec un debounce à 300 ms, la requête part seulement quand la personne a fini de taper. L'API respire. Le résultat reste cohérent avec l'intention finale.

Maintenant imaginons une barre de progression liée au scroll. Si vous debounce, rien ne bouge tant que le doigt ou la molette n'est pas au repos. L'interface paraît cassée. Un throttle toutes les 100 ms suit le geste sans saturer le thread principal.

Le piège classique : coller un debounce sur un flux continu (scroll, drag, mousemove). L'UI a l'air morte jusqu'à la pause. Sur un flux continu, préférez throttle. L'inverse est vrai pour une recherche ou une validation : un throttle envoie trop d'appels pendant la frappe.

Autre nuance utile : leading versus trailing. Un debounce "trailing" attend la fin. Un throttle "leading" peut tirer tout de suite, puis ignorer jusqu'à la prochaine fenêtre. Choisir le mode sans le dire, c'est souvent la source du bug "ça marche presque".

En résumé : debounce attend le calme, throttle impose un rythme. Avant de brancher un utilitaire, demandez-vous si l'événement est une série de pauses, ou un flux qui ne s'arrête pas.

Vous, sur quel événement avez-vous déjà regretté le mauvais choix entre les deux ?

#JavaScript #Frontend #Performance #WebDev`;

test('explain-concept skill files exist with required YAML name', () => {
  const skill = fs.readFileSync(skillPath, 'utf8');
  const readme = fs.readFileSync(readmePath, 'utf8');

  assert.match(skill, /^---\nname: linkedin-explain-concept\n/m);
  assert.match(skill, /Expliquer un concept/i);
  assert.match(readme, /linkedin-explain-concept/);
  assert.match(readme, /diagramme/);
  assert.match(readme, /2400–2850/);
});

test('explain-concept skill requires concept, visual type, and table/code support', () => {
  const skill = fs.readFileSync(skillPath, 'utf8');

  assert.match(skill, /\{concept\}/);
  assert.match(skill, /type: explain-concept/);
  assert.match(skill, /`diagramme`/);
  assert.match(skill, /`schema`/);
  assert.match(skill, /`illustration`/);
  assert.match(skill, /Tableaux et code/);
  assert.match(skill, /texte brut/);
  assert.match(skill, /Pas de fences Markdown/);
  assert.match(skill, /2400–2850/);
  assert.match(skill, /≤ 3000 caractères échappés|plafond absolu \*\*3000\*\*|Plafond absolu LinkedIn : \*\*≤ 3000/);
  assert.match(skill, /escapeLinkedInCommentary|little-text/);
  assert.match(skill, /GenerateImage/);
  assert.match(skill, /aspect_ratio: "16:9"/);
  assert.match(skill, /retry once/);
  assert.match(skill, /N'invente aucune statistique/);
});

test('generic LinkedIn, showcase, and studio skills route explain-concept requests', () => {
  const generic = fs.readFileSync(genericSkillPath, 'utf8');
  const showcase = fs.readFileSync(showcaseSkillPath, 'utf8');
  const studio = fs.readFileSync(studioSkillPath, 'utf8');

  assert.match(generic, /linkedin-explain-concept/);
  assert.match(showcase, /linkedin-explain-concept/);
  assert.match(studio, /linkedin-explain-concept/);
});

test('a long concept post with table and code stays within LinkedIn max length', () => {
  const escapedLen = escapeLinkedInCommentary(CONCEPT_FIXTURE_BODY).length;

  assert.ok(
    escapedLen >= 2400 && escapedLen <= LINKEDIN_COMMENTARY_MAX_LENGTH,
    `expected escaped length 2400–${LINKEDIN_COMMENTARY_MAX_LENGTH}, got ${escapedLen}`
  );
  assert.match(CONCEPT_FIXTURE_BODY, /\|/);
  assert.match(CONCEPT_FIXTURE_BODY, /^JS$/m);
  assert.doesNotMatch(CONCEPT_FIXTURE_BODY, /\*\*|```|^\s*#\s/m);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'concept-cover-'));
  const imageRel = 'images/2026-09-16-debounce-vs-throttle.png';
  const imagePath = path.join(dir, imageRel);
  fs.mkdirSync(path.dirname(imagePath), { recursive: true });
  fs.writeFileSync(imagePath, Buffer.from('fake-png'));

  const errors = validatePost({
    path: path.join(dir, '2026-09-16-debounce-vs-throttle.md'),
    frontmatter: {
      sujet: 'debounce vs throttle',
      date: '2026-09-16',
      platform: 'linkedin',
      type: 'explain-concept',
      visuel: 'schema',
      image: imageRel,
      image_alt: 'Deux colonnes : attente après pause vs cadence fixe',
    },
    body: CONCEPT_FIXTURE_BODY,
  });

  assert.deepEqual(errors, []);
});

test('concept fixture hashtags stay in the 3–5 range', () => {
  const tags = CONCEPT_FIXTURE_BODY.match(/#[\p{L}\p{N}_]+/gu) || [];
  assert.ok(tags.length >= 3 && tags.length <= 5, `got ${tags.length} hashtags`);
});
