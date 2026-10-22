import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { validatePost } from './publish-to-linkedin.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skillDir = path.join(repoRoot, '.cursor/skills/linkedin-post-bernard');
const skillPath = path.join(skillDir, 'SKILL.md');
const readmePath = path.join(skillDir, 'README.md');
const genericSkillPath = path.join(repoRoot, '.cursor/skills/linkedin-post/SKILL.md');
const studioSkillPath = path.join(repoRoot, '.cursor/skills/content-studio/SKILL.md');

const BERNARD_FIXTURE_BODY = `Dans la trace, aucun appel d'outil n'avait eu lieu. Un agent a pourtant renvoyé un résumé fluide, champs remplis : nom, arguments, résultat. Pas de span tool, pas de payload, pas de latence, pas de code HTTP. Le run était vert. Le formatter n'avait pas planté. Le schéma du message de sortie était valide. L'action manquait. On a lu un compte-rendu d'exécution sans exécution.

Le problème n'est pas seulement l'hallucination du contenu. C'est le signal qu'on a cru lire. On suppose que le modèle a ouvert l'outil, validé le schéma, et collé le retour. Le système n'a pas appelé. Le succès du texte et le succès de l'appel ne sont pas le même événement. L'un est une string. L'autre est une ligne dans la trace, avec un début, une fin, et un statut.

Un pipeline sans assertion sur le side-effect est vert pour la même raison : on a vérifié la sortie, pas l'appel. L'automatisation avance dès qu'elle peut émettre un texte. L'autonomie, elle, aurait dû s'arrêter : pas d'outil invoqué, donc pas de résumé d'outil. Un thermostat qui affiche une température sans capteur ne mesure pas la pièce. Il affiche. Ici le capteur, c'est le span d'appel. Sans ce capteur, on confond une sortie valide et une exécution. La différence se voit seulement si on le vérifie, pas si on relit le markdown.

La preuve, ici, ne peut pas être le paragraphe, ni le run vert. Jusqu'où laisse-t-on un texte propre masquer l'absence d'action dans la trace, alors que le span d'appel, le seul signal d'exécution, était déjà vide ?

#AgentsIA #Automatisation #Architecture #Observabilité`;

function stripHashtags(body) {
  return body
    .split('\n')
    .filter((line) => !/^\s*(#[\p{L}\p{N}_]+)(\s+#[\p{L}\p{N}_]+)*\s*$/u.test(line))
    .join('\n')
    .trim();
}

function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

test('Bernard skill files exist with required YAML name', () => {
  const skill = fs.readFileSync(skillPath, 'utf8');
  const readme = fs.readFileSync(readmePath, 'utf8');

  assert.match(skill, /^---\nname: linkedin-post-bernard\n/m);
  assert.match(skill, /post Bernard/);
  assert.match(readme, /Bernard/);
  assert.match(readme, /4-beat structure/);
});

test('Bernard skill keeps the character bible and the 4-beat structure', () => {
  const skill = fs.readFileSync(skillPath, 'utf8');

  assert.match(skill, /Bible du personnage/);
  assert.match(skill, /observateur technique/);
  assert.match(skill, /jamais promotionnelle/);
  assert.match(skill, /automatisation et autonomie/);
  assert.match(skill, /game changer/);
  assert.match(skill, /STRUCTURE OBLIGATOIRE \(4 temps\)/);
  assert.match(skill, /Constat \/ scène/);
  assert.match(skill, /Le déclic/);
  assert.match(skill, /Développement/);
  assert.match(skill, /Conclusion ouverte/);
  assert.match(skill, /220–280 mots/);
  assert.doesNotMatch(skill, /120–180 mots/);
  assert.match(skill, /\{observation\}/);
  assert.match(skill, /N'invente aucun chiffre/);
  assert.match(skill, /pas de listes à puces/);
  assert.match(skill, /voice: bernard/);
});

test('Bernard skill requires a 16:9 LinkedIn cover image', () => {
  const skill = fs.readFileSync(skillPath, 'utf8');
  const readme = fs.readFileSync(readmePath, 'utf8');

  assert.match(skill, /Cover image \(required\)/);
  assert.match(skill, /GenerateImage/);
  assert.match(skill, /aspect_ratio: "16:9"/);
  assert.match(skill, /\.preview\/cover\.png/);
  assert.match(skill, /image_alt/);
  assert.match(skill, /retry once/);
  assert.match(skill, /editorial illustration of the post subject/);
  assert.match(skill, /Original character Bernard/);
  assert.match(skill, /references\/bernard\.png/);
  assert.match(skill, /Do not depict any actor/);
  assert.match(skill, /Westworld/);
  assert.match(readme, /Cover image \(required\)/);
  assert.match(readme, /16:9/);
  assert.match(readme, /Bernard in/);
});

test('Bernard cover pose and grimace vary with the observation', () => {
  const skill = fs.readFileSync(skillPath, 'utf8');
  const readme = fs.readFileSync(readmePath, 'utf8');

  assert.match(skill, /Attitude \(must change\)/);
  assert.match(skill, /\{registre\}/);
  assert.match(skill, /\{posture\}/);
  assert.match(skill, /\{grimace\}/);
  assert.match(skill, /Never default to `clinique`/);
  assert.match(skill, /Copy face and wardrobe from the reference/);
  assert.match(skill, /receding hairline/);
  assert.match(readme, /receding hairline/);
  assert.match(skill, /olive-green hazel eyes/);
  assert.match(readme, /olive-green eyes/);
  assert.match(skill, /Do not copy the reference pose/);
  assert.match(skill, /not a studio bust portrait/);
  assert.match(skill, /readable at LinkedIn thumbnail size/);
  assert.match(skill, /not a default calm portrait/);
  for (const registre of [
    'sceptique',
    'inspecteur',
    'agacé',
    'perplexe',
    'las',
    'inquiet',
    'ironique',
    'clinique',
  ]) {
    assert.match(skill, new RegExp(`\`${registre}\``));
  }
  assert.match(skill, /image_alt` must name the attitude/);
  assert.match(readme, /Pose and grimace change/);
  assert.match(readme, /face and wardrobe only/);
});

test('Bernard skill ships a visual reference portrait', () => {
  const portrait = path.join(skillDir, 'references', 'bernard.png');
  assert.equal(fs.existsSync(portrait), true);
  assert.ok(fs.statSync(portrait).size > 1000);
});

test('generic LinkedIn and studio skills route Bernard requests', () => {
  const generic = fs.readFileSync(genericSkillPath, 'utf8');
  const studio = fs.readFileSync(studioSkillPath, 'utf8');

  assert.match(generic, /linkedin-post-bernard/);
  assert.match(studio, /linkedin-post-bernard/);
});

function paragraphCount(body) {
  return stripHashtags(body)
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean).length;
}

test('a Bernard-shaped post with cover passes LinkedIn publisher validation', () => {
  const prose = stripHashtags(BERNARD_FIXTURE_BODY);
  const words = wordCount(prose);
  const paragraphs = paragraphCount(BERNARD_FIXTURE_BODY);

  assert.equal(paragraphs, 4, `expected 4 beats/paragraphs, got ${paragraphs}`);
  assert.ok(words >= 220 && words <= 280, `expected 220–280 words, got ${words}`);
  assert.doesNotMatch(prose, /(^|\n)\s*[-*→]/);
  assert.doesNotMatch(BERNARD_FIXTURE_BODY, /\*\*|^\s*#\s/m);
  assert.doesNotMatch(BERNARD_FIXTURE_BODY, /Bernard/);
  assert.match(prose, /\?\s*$/);
  assert.match(prose, /span/);
  assert.match(prose, /trace/);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bernard-cover-'));
  const imageRel = 'images/2026-09-14-agent-resume-sans-outil.png';
  const imagePath = path.join(dir, imageRel);
  fs.mkdirSync(path.dirname(imagePath), { recursive: true });
  fs.writeFileSync(imagePath, Buffer.from('fake-png'));

  const errors = validatePost({
    path: path.join(dir, '2026-09-14-agent-resume-sans-outil.md'),
    frontmatter: {
      sujet: "un agent qui résume un outil sans l'appeler",
      date: '2026-09-14',
      platform: 'linkedin',
      voice: 'bernard',
      image: imageRel,
      image_alt: "Bernard, sourcil levé, reculé devant une baie dont un compartiment reste vide",
    },
    body: BERNARD_FIXTURE_BODY,
  });

  assert.deepEqual(errors, []);
});

test('Bernard fixture hashtags stay in the 3–5 range', () => {
  const tags = BERNARD_FIXTURE_BODY.match(/#[\p{L}\p{N}_]+/gu) || [];
  assert.ok(tags.length >= 3 && tags.length <= 5, `got ${tags.length} hashtags`);
});

test('Bernard skill spells out the format contract and voice mechanics', () => {
  const skill = fs.readFileSync(skillPath, 'utf8');
  const readme = fs.readFileSync(readmePath, 'utf8');

  assert.match(skill, /Format contract \(the published body\)/);
  assert.match(skill, /Four paragraphs, four beats/);
  assert.match(skill, /Chat review template/);
  assert.match(skill, /Contrôle format/);
  assert.match(skill, /Voice mechanics/);
  assert.match(skill, /Register technique/);
  assert.match(skill, /Prefer \*\*on\*\*/);
  assert.match(skill, /Text-only override/);
  assert.match(skill, /validate format/);
  assert.match(skill, /don't generate image/);
  assert.match(skill, /\{skip_cover\}/);
  assert.match(skill, /Exactly one\*\*, in beat 3 only/);
  assert.match(skill, /only a test/);
  assert.match(skill, /don't publish/);
  assert.match(skill, /Do \*\*not\*\* write `content\/linkedin\/\*\.md`/);
  assert.match(skill, /inspectable signal/);
  assert.match(readme, /Format contract/);
  assert.match(readme, /text-only/);
  assert.match(readme, /validate format/);
  assert.match(readme, /don't publish/);
  assert.match(readme, /220–280/);
  assert.match(readme, /inspectable/);
});
