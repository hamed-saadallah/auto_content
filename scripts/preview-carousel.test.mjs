import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import {
  buildLinkedInDocumentPostPayload,
  escapeHtml,
  formatSlideIndex,
  loadCarouselDraft,
  normalizeTheme,
  renderCarouselHtml,
  validateCarousel,
} from './carousel-common.mjs';
import { previewCarousel } from './preview-carousel.mjs';

function writeTinyPng(filePath) {
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, png);
}

function makeTempCarousel(options = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'carousel-'));
  const slug = options.slug ?? '2026-09-06-test-carousel';
  const mdPath = path.join(dir, `${slug}.md`);
  const imageDir = path.join(dir, 'images', slug);
  const pdfDir = path.join(dir, 'pdfs');
  fs.mkdirSync(imageDir, { recursive: true });
  fs.mkdirSync(pdfDir, { recursive: true });

  const slides = (options.slides ?? [
    { id: 1, role: 'hook', title: 'Accroche forte', body: 'Une promesse claire.', background: `images/${slug}/slide-01-bg.png` },
    { id: 2, role: 'problem', title: 'Le piège', bullets: ['Erreur fréquente', 'Conséquence concrète'], background: `images/${slug}/slide-02-bg.png` },
  ]).map((slide) => {
    if (slide.background && options.createBackgrounds !== false) {
      writeTinyPng(path.join(dir, slide.background));
    }
    return slide;
  });

  const pdfPath = path.join(pdfDir, `${slug}.pdf`);
  if (options.withPdf !== false) {
    fs.writeFileSync(pdfPath, '%PDF-1.4 fake');
  }

  const frontmatter = {
    sujet: options.sujet ?? 'Test carousel',
    date: '2026-09-06',
    platform: 'linkedin-carousel',
    slide_count: slides.length,
    theme: { primary: '#0a66c2', secondary: '#191919', font: 'system-ui' },
    document: `pdfs/${slug}.pdf`,
    document_title: `${slug}.pdf`,
    slides,
  };

  const body = options.body ?? 'Commentaire LinkedIn sans markdown.\n\n#Test #Carousel';
  const yaml = ['---', ...Object.entries(frontmatter).flatMap(([key, value]) => {
    if (key === 'slides') {
      return ['slides:', ...value.map((slide) => {
        const lines = [`  - id: ${slide.id}`, `    role: ${slide.role}`, `    title: "${slide.title}"`];
        if (slide.body) lines.push(`    body: "${slide.body}"`);
        if (slide.bullets) lines.push(`    bullets: ${JSON.stringify(slide.bullets)}`);
        if (slide.background) lines.push(`    background: ${slide.background}`);
        return lines.join('\n');
      })];
    }
    if (key === 'theme') {
      return ['theme:', `  primary: "${value.primary}"`, `  secondary: "${value.secondary}"`, `  font: "${value.font}"`];
    }
    return `${key}: ${typeof value === 'string' ? `"${value}"` : value}`;
  }), '---', '', body].join('\n');

  fs.writeFileSync(mdPath, `${yaml}\n`, 'utf-8');
  return { dir, mdPath, pdfPath, slides };
}

test('validateCarousel accepts a well-formed draft', () => {
  const draft = makeTempCarousel();
  try {
    const carousel = loadCarouselDraft(draft.mdPath);
    assert.deepEqual(validateCarousel(carousel), []);
  } finally {
    fs.rmSync(draft.dir, { recursive: true, force: true });
  }
});

test('validateCarousel flags markdown in commentary', () => {
  const draft = makeTempCarousel({ body: '**Bold** text' });
  try {
    const carousel = loadCarouselDraft(draft.mdPath);
    const errors = validateCarousel(carousel);
    assert.ok(errors.some((error) => error.includes('Markdown bold')));
  } finally {
    fs.rmSync(draft.dir, { recursive: true, force: true });
  }
});

test('renderCarouselHtml escapes slide titles and includes swipe controls', () => {
  const draft = makeTempCarousel({
    slides: [
      { id: 1, role: 'hook', title: '<script>alert(1)</script>', body: 'Safe body', background: 'images/2026-09-06-test-carousel/slide-01-bg.png' },
      { id: 2, role: 'cta', title: 'CTA', bullets: ['Agir'], background: 'images/2026-09-06-test-carousel/slide-02-bg.png' },
    ],
  });
  try {
    const carousel = loadCarouselDraft(draft.mdPath);
    const { html } = renderCarouselHtml(carousel);
    assert.equal(html.includes('<script>alert(1)</script>'), false);
    assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
    assert.ok(html.includes('id="slides"'));
    assert.ok(html.includes('id="next"'));
    assert.ok(html.includes('role-hook'));
    assert.ok(html.includes('slide-well'));
    assert.ok(html.includes('01 / 02'));
    assert.equal(html.includes('class="slide-role"'), false);
    assert.equal(/HOOK/.test(html), false);
  } finally {
    fs.rmSync(draft.dir, { recursive: true, force: true });
  }
});

test('buildLinkedInDocumentPostPayload uses document media', () => {
  const payload = buildLinkedInDocumentPostPayload('urn:li:person:123', 'Hello carousel', {
    title: 'deck.pdf',
    id: 'urn:li:document:abc',
  });

  assert.equal(payload.author, 'urn:li:person:123');
  assert.equal(payload.commentary, 'Hello carousel');
  assert.deepEqual(payload.content.media, {
    title: 'deck.pdf',
    id: 'urn:li:document:abc',
  });
});

test('previewCarousel writes HTML output', () => {
  const draft = makeTempCarousel();
  const outPath = path.join(draft.dir, 'preview.html');
  try {
    const result = previewCarousel(draft.mdPath, { noOpen: true, out: outPath });
    assert.equal(result.slideCount, 2);
    assert.equal(fs.existsSync(outPath), true);
    const html = fs.readFileSync(outPath, 'utf-8');
    assert.ok(html.includes('Accroche forte'));
    assert.ok(html.includes('data:image/png;base64,'));
  } finally {
    fs.rmSync(draft.dir, { recursive: true, force: true });
  }
});

test('escapeHtml encodes dangerous markup', () => {
  assert.ok(escapeHtml('<b>&"').includes('&lt;b&gt;'));
});

test('formatSlideIndex pads current and total', () => {
  assert.equal(formatSlideIndex(0, 9), '01 / 09');
  assert.equal(formatSlideIndex(8, 9), '09 / 09');
});

test('normalizeTheme maps primary/secondary aliases to accent/ink', () => {
  const theme = normalizeTheme({ primary: '#0a66c2', secondary: '#111111', font: 'system-ui' });
  assert.equal(theme.accent, '#0a66c2');
  assert.equal(theme.ink, '#111111');
  assert.equal(theme.primary, '#0a66c2');
  assert.equal(theme.secondary, '#111111');
  assert.equal(theme.bg, '#f6f1e8');
});

test('validateCarousel accepts slides without a background', () => {
  const draft = makeTempCarousel({
    slides: [
      { id: 1, role: 'hook', title: 'Accroche forte', body: 'Une promesse claire.' },
      { id: 2, role: 'cta', title: 'Et maintenant', body: 'Quelle est la prochaine étape ?' },
    ],
  });
  try {
    const carousel = loadCarouselDraft(draft.mdPath);
    assert.deepEqual(validateCarousel(carousel), []);
    const { html } = renderCarouselHtml(carousel);
    assert.ok(html.includes('slide-well-fallback'));
    assert.equal(html.includes('<img class="slide-well-image"'), false);
    assert.ok(html.includes('01 / 02'));
  } finally {
    fs.rmSync(draft.dir, { recursive: true, force: true });
  }
});

test('validateCarousel accepts a slide with body and five bullets', () => {
  const draft = makeTempCarousel({
    slides: [
      {
        id: 1,
        role: 'hook',
        title: 'Un agent solo impressionne en démo',
        body: 'En prod, la première erreur silencieuse passe souvent inaperçue. Un workflow linéaire affiche succès et personne ne relit avant la sortie.',
      },
      {
        id: 2,
        role: 'value',
        title: 'Séparez producteur et critique',
        body: 'Un reviewer qui publie la réponse finale ne contrôle rien. Donnez-lui un autre prompt, d autres outils, et le droit de refuser avant la sortie. La boucle ne sert que si ce refus est possible et tracé.',
        bullets: [
          'Deux prompts distincts, deux jeux d outils',
          'Le reviewer ne publie pas la réponse',
          'Critères de refus écrits avant le run',
          'Retry limité et budget tokens affiché',
          'Trace de chaque objection dans le journal',
        ],
      },
    ],
  });
  try {
    const carousel = loadCarouselDraft(draft.mdPath);
    assert.deepEqual(validateCarousel(carousel), []);
    const { html } = renderCarouselHtml(carousel);
    assert.ok(html.includes('slide-body'));
    assert.ok(html.includes('slide-bullets'));
    assert.equal((html.match(/<li>/g) || []).length, 5);
  } finally {
    fs.rmSync(draft.dir, { recursive: true, force: true });
  }
});

test('validateCarousel rejects a sixth bullet', () => {
  const draft = makeTempCarousel({
    slides: [
      { id: 1, role: 'hook', title: 'Accroche', body: 'Une promesse claire pour ouvrir le deck.' },
      {
        id: 2,
        role: 'value',
        title: 'Trop de puces',
        body: 'Le corps reste court.',
        bullets: ['Un', 'Deux', 'Trois', 'Quatre', 'Cinq', 'Six'],
      },
    ],
  });
  try {
    const carousel = loadCarouselDraft(draft.mdPath);
    const errors = validateCarousel(carousel);
    assert.ok(errors.some((error) => error.includes('at most 5 bullets')));
  } finally {
    fs.rmSync(draft.dir, { recursive: true, force: true });
  }
});

test('validateCarousel rejects slide copy over about 90 words', () => {
  const longBody = Array.from({ length: 88 }, (_, index) => `mot${index + 1}`).join(' ');
  const draft = makeTempCarousel({
    slides: [
      { id: 1, role: 'hook', title: 'Accroche', body: 'Une promesse claire pour ouvrir le deck.' },
      { id: 2, role: 'value', title: 'Texte trop long', body: longBody },
    ],
  });
  try {
    const carousel = loadCarouselDraft(draft.mdPath);
    const errors = validateCarousel(carousel);
    assert.ok(errors.some((error) => error.includes('~90 words')));
  } finally {
    fs.rmSync(draft.dir, { recursive: true, force: true });
  }
});

test('validateCarousel flags a missing background file when a path is set', () => {
  const draft = makeTempCarousel({
    createBackgrounds: false,
    slides: [
      { id: 1, role: 'hook', title: 'Accroche forte', body: 'Une promesse claire.', background: 'images/2026-09-06-test-carousel/slide-01-bg.png' },
      { id: 2, role: 'cta', title: 'Et maintenant', body: 'Quelle est la prochaine étape ?' },
    ],
  });
  try {
    const carousel = loadCarouselDraft(draft.mdPath);
    const errors = validateCarousel(carousel);
    assert.ok(errors.some((error) => error.includes('background file not found')));
    assert.equal(errors.some((error) => error.includes('missing background path')), false);
  } finally {
    fs.rmSync(draft.dir, { recursive: true, force: true });
  }
});
