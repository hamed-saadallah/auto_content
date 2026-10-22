import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import {
  SEE_MORE_CHAR_LIMIT,
  bodyToHtml,
  escapeHtml,
  loadDraft,
  parsePreviewArgs,
  previewDraft,
  renderPreviewHtml,
  splitSeeMore,
} from './preview-linkedin.mjs';

function makeTempDraft(options = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'linkedin-preview-'));
  const mdPath = path.join(dir, 'draft.md');
  const imageName = options.imageName ?? 'cover.png';
  const imagePath = path.join(dir, imageName);
  if (options.createImage) {
    fs.writeFileSync(imagePath, Buffer.from('fake-png'));
  }

  const frontmatterLines = [
    '---',
    `sujet: "${options.sujet ?? 'Test preview'}"`,
    `date: "${options.date ?? '2026-09-06'}"`,
    'platform: linkedin',
  ];
  if (options.withImage) {
    frontmatterLines.push(`image: ${imageName}`);
    if (options.imageAlt !== '') {
      frontmatterLines.push(`image_alt: "${options.imageAlt ?? 'Couverture de test'}"`);
    }
  }
  frontmatterLines.push('---', '', options.body ?? 'Un post sans markdown.');

  fs.writeFileSync(mdPath, `${frontmatterLines.join('\n')}\n`, 'utf-8');
  return { dir, mdPath, imagePath };
}

test('escapeHtml encodes markup so it cannot execute', () => {
  const escaped = escapeHtml('Hello <script>alert("xss")</script> & friends');
  assert.equal(escaped.includes('<script>'), false);
  assert.ok(escaped.includes('&lt;script&gt;'));
  assert.ok(escaped.includes('&amp;'));
  assert.ok(escaped.includes('&quot;'));
});

test('bodyToHtml keeps markdown bold as literal text', () => {
  const html = bodyToHtml('Ligne **grasse**\n\nSuite');
  assert.ok(html.includes('**grasse**'));
  assert.equal(html.includes('<strong>'), false);
  assert.ok(html.includes('<p>'));
});

test('bodyToHtml splits Windows CRLF paragraphs', () => {
  const html = bodyToHtml('Premier.\r\n\r\nSecond.');
  assert.equal((html.match(/<p>/g) || []).length, 2);
  assert.ok(html.includes('<p>Premier.</p>'));
  assert.ok(html.includes('<p>Second.</p>'));
});

test('splitSeeMore leaves short posts untruncated', () => {
  const split = splitSeeMore('Accroche courte.');
  assert.equal(split.truncated, false);
  assert.equal(split.collapsed, 'Accroche courte.');
  assert.equal(split.expanded, 'Accroche courte.');
});

test('splitSeeMore cuts around the 210-character hook window', () => {
  const body = `${'A'.repeat(120)} word ${'B'.repeat(200)}`;
  const split = splitSeeMore(body);
  assert.equal(split.truncated, true);
  assert.ok(split.collapsed.length <= SEE_MORE_CHAR_LIMIT);
  assert.ok(split.collapsed.length < body.length);
  assert.equal(split.expanded, body);
});

test('renderPreviewHtml escapes script tags in the post body', () => {
  const { html } = renderPreviewHtml({
    frontmatter: { sujet: 'XSS', date: '2026-09-06' },
    body: 'Hello <script>alert(1)</script>',
  });

  assert.equal(html.includes('<script>alert(1)</script>'), false);
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
});

test('renderPreviewHtml shows voir plus only when the hook is truncated', () => {
  const short = renderPreviewHtml({
    frontmatter: { sujet: 'Court', date: '2026-09-06' },
    body: 'Accroche courte.',
  });
  assert.equal(short.truncated, false);
  assert.match(short.html, /id="see-more" hidden/);

  const longBody = `${'Le vrai sujet est plus long que le hook. '.repeat(20)}#Test`;
  const long = renderPreviewHtml({
    frontmatter: { sujet: 'Long', date: '2026-09-06' },
    body: longBody,
  });
  assert.equal(long.truncated, true);
  assert.ok(long.html.includes('…voir plus'));
  assert.doesNotMatch(long.html, /id="see-more" hidden/);
});

test('renderPreviewHtml surfaces validatePost warnings', () => {
  const { html, warnings } = renderPreviewHtml({
    frontmatter: { sujet: 'Markdown', date: '2026-09-06' },
    body: '**Bold** headline\n# Title',
  });

  assert.ok(warnings.some((warning) => warning.includes('Markdown bold')));
  assert.ok(warnings.some((warning) => warning.includes('Markdown headings')));
  assert.ok(html.includes('Markdown bold (**text**) is not rendered on LinkedIn'));
  assert.ok(html.includes('À corriger avant publication'));
});

test('renderPreviewHtml omits the cover image when none is present', () => {
  const { html, hasImage } = renderPreviewHtml({
    frontmatter: { sujet: 'Texte seul', date: '2026-09-06' },
    body: 'Un post sans image.',
  });

  assert.equal(hasImage, false);
  assert.equal(html.includes('<img '), false);
  assert.equal(html.includes('data:image'), false);
});

test('previewDraft writes HTML with an inlined cover image', () => {
  const draft = makeTempDraft({
    createImage: true,
    withImage: true,
    body: 'Un post avec image.',
  });
  const outPath = path.join(draft.dir, 'index.html');

  try {
    const result = previewDraft(draft.mdPath, { noOpen: true, out: outPath });
    assert.equal(result.hasImage, true);
    assert.equal(fs.existsSync(outPath), true);
    const html = fs.readFileSync(outPath, 'utf-8');
    assert.ok(html.includes('data:image/png;base64,'));
    assert.ok(html.includes('alt="Couverture de test"'));
  } finally {
    fs.rmSync(draft.dir, { recursive: true, force: true });
  }
});

test('loadDraft reads frontmatter and body', () => {
  const draft = makeTempDraft({ body: 'Corps du post.' });
  try {
    const post = loadDraft(draft.mdPath);
    assert.equal(post.frontmatter.sujet, 'Test preview');
    assert.equal(post.body, 'Corps du post.');
  } finally {
    fs.rmSync(draft.dir, { recursive: true, force: true });
  }
});

test('parsePreviewArgs reads --no-open and --out', () => {
  const parsed = parsePreviewArgs(['--no-open', '--out', 'tmp/preview.html', '.preview/draft.md']);
  assert.equal(parsed.noOpen, true);
  assert.equal(parsed.out, 'tmp/preview.html');
  assert.equal(parsed.file, '.preview/draft.md');
});
