import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { buildCarouselPdf } from './build-carousel-pdf.mjs';
import { buildLinkedInDocumentPostPayload } from './carousel-common.mjs';
import {
  buildDocumentUploadInitPayload,
  DRY_RUN_DOCUMENT_URN,
  LinkedInCarouselPublisher,
} from './publish-carousel-to-linkedin.mjs';

function writeTinyPng(filePath) {
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, png);
}

function makeTempCarousel() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'carousel-pdf-'));
  const slug = '2026-09-06-test-carousel';
  const mdPath = path.join(dir, `${slug}.md`);
  const imageDir = path.join(dir, 'images', slug);
  const pdfPath = path.join(dir, 'pdfs', `${slug}.pdf`);
  fs.mkdirSync(imageDir, { recursive: true });
  fs.mkdirSync(path.dirname(pdfPath), { recursive: true });
  fs.writeFileSync(pdfPath, '%PDF-1.4 fake');

  const slides = [
    { id: 1, role: 'hook', title: 'Accroche forte', body: 'Une promesse claire.', background: `images/${slug}/slide-01-bg.png` },
    { id: 2, role: 'cta', title: 'Passez à l’action', bullets: ['Une étape concrète'], background: `images/${slug}/slide-02-bg.png` },
  ];
  slides.forEach((slide) => writeTinyPng(path.join(dir, slide.background)));

  const yaml = `---
sujet: "Test carousel"
date: 2026-09-06
platform: linkedin-carousel
slide_count: 2
theme:
  primary: "#0a66c2"
  secondary: "#191919"
  font: "system-ui"
document: pdfs/${slug}.pdf
document_title: ${slug}.pdf
slides:
  - id: 1
    role: hook
    title: "Accroche forte"
    body: "Une promesse claire."
    background: images/${slug}/slide-01-bg.png
  - id: 2
    role: cta
    title: "Passez à l’action"
    bullets: ["Une étape concrète"]
    background: images/${slug}/slide-02-bg.png
---

Commentaire LinkedIn sans markdown.

#Test #Carousel
`;

  fs.writeFileSync(mdPath, yaml, 'utf-8');
  return { dir, mdPath, pdfPath, slug };
}

test('buildDocumentUploadInitPayload includes owner URN', () => {
  const payload = buildDocumentUploadInitPayload('urn:li:person:123');
  assert.deepEqual(payload, {
    initializeUploadRequest: { owner: 'urn:li:person:123' },
  });
});

test('LinkedInCarouselPublisher dry-run builds document post payload', async () => {
  const draft = makeTempCarousel();
  try {
    const publisher = new LinkedInCarouselPublisher({ dryRun: true, personUrn: 'urn:li:person:123' });
    const [result] = await publisher.processFiles([draft.mdPath]);
    assert.equal(result.success, true);
    assert.equal(result.payload.content.media.id, DRY_RUN_DOCUMENT_URN);
    assert.equal(result.payload.content.media.title, `${draft.slug}.pdf`);
  } finally {
    fs.rmSync(draft.dir, { recursive: true, force: true });
  }
});

test('buildCarouselPdf creates a PDF with one page per slide', async () => {
  const draft = makeTempCarousel();
  try {
    const result = await buildCarouselPdf(draft.mdPath, { out: draft.pdfPath });
    assert.equal(result.slideCount, 2);
    assert.equal(fs.existsSync(draft.pdfPath), true);
    const bytes = fs.readFileSync(draft.pdfPath);
    assert.ok(bytes.length > 100);
    assert.ok(bytes.slice(0, 4).toString('utf-8').startsWith('%PDF'));
  } finally {
    fs.rmSync(draft.dir, { recursive: true, force: true });
  }
});

test('buildLinkedInDocumentPostPayload escapes commentary', () => {
  const payload = buildLinkedInDocumentPostPayload('urn:li:person:1', 'Hook (API) #Tag', {
    title: 'deck.pdf',
    id: 'urn:li:document:abc',
  });
  assert.equal(payload.commentary, 'Hook \\(API\\) #Tag');
});
