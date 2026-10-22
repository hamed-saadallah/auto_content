import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import {
  DRY_RUN_IMAGE_URN,
  LINKEDIN_COMMENTARY_MAX_LENGTH,
  LINKEDIN_IMAGES_URL,
  LINKEDIN_IMAGE_ALT_MAX_LENGTH,
  LINKEDIN_POSTS_URL,
  buildLinkedInPostPayload,
  buildLinkedInRequestHeaders,
  escapeLinkedInCommentary,
  formatLinkedInApiError,
  imageContentType,
  resolvePostImagePath,
  validatePost,
} from './publish-to-linkedin.mjs';

function makeTempPost(options = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'linkedin-post-'));
  const mdPath = path.join(dir, '2026-09-05-test.md');
  const imageName = options.imageName ?? 'images/2026-09-05-test.png';
  const imagePath = path.join(dir, imageName);
  if (options.createImage !== false) {
    fs.mkdirSync(path.dirname(imagePath), { recursive: true });
    fs.writeFileSync(imagePath, Buffer.from('fake-png'));
  }
  return {
    dir,
    path: mdPath,
    frontmatter: {
      sujet: 'Test',
      date: '2026-09-05',
      image: imageName,
      image_alt: options.imageAlt ?? 'Diagramme d’architecture headless',
      ...options.frontmatter,
    },
    body: options.body ?? 'Un post sans markdown.',
  };
}

test('buildLinkedInPostPayload matches Posts API text-only schema', () => {
  const payload = buildLinkedInPostPayload('urn:li:person:123', 'Hello LinkedIn');

  assert.equal(payload.author, 'urn:li:person:123');
  assert.equal(payload.commentary, 'Hello LinkedIn');
  assert.equal(payload.visibility, 'PUBLIC');
  assert.equal(payload.lifecycleState, 'PUBLISHED');
  assert.equal(payload.isReshareDisabledByAuthor, false);
  assert.deepEqual(payload.distribution, {
    feedDistribution: 'MAIN_FEED',
    targetEntities: [],
    thirdPartyDistributionChannels: [],
  });
  assert.ok(!('specificContent' in payload));
  assert.ok(!('actor' in payload));
});

test('escapeLinkedInCommentary escapes little-text reserved characters', () => {
  assert.equal(escapeLinkedInCommentary('Hello LinkedIn'), 'Hello LinkedIn');
  assert.equal(
    escapeLinkedInCommentary("couche d'exécution (API, outil MCP, commande CLI)."),
    "couche d'exécution \\(API, outil MCP, commande CLI\\)."
  );
  assert.equal(escapeLinkedInCommentary('a\\b'), 'a\\\\b');
  assert.equal(escapeLinkedInCommentary('see @mention and {template}'), 'see \\@mention and \\{template\\}');
  assert.equal(
    escapeLinkedInCommentary('line1\n\nline2 (x)\n\n#Salesforce #CRM'),
    'line1\n\nline2 \\(x\\)\n\n#Salesforce #CRM'
  );
});

test('buildLinkedInPostPayload escapes commentary for the Posts API', () => {
  const payload = buildLinkedInPostPayload(
    'urn:li:person:123',
    'Headless 360 (API, MCP, CLI).\n\n#Salesforce'
  );

  assert.equal(payload.commentary, 'Headless 360 \\(API, MCP, CLI\\).\n\n#Salesforce');
});

test('buildLinkedInRequestHeaders includes required REST headers', () => {
  const headers = buildLinkedInRequestHeaders('token-abc', '202608');

  assert.equal(headers.Authorization, 'Bearer token-abc');
  assert.equal(headers['X-Restli-Protocol-Version'], '2.0.0');
  assert.equal(headers['LinkedIn-Version'], '202608');
  assert.equal(headers['Content-Type'], 'application/json');
});

test('validatePost rejects empty body and markdown formatting', () => {
  const errors = validatePost({
    frontmatter: { sujet: 'Test', date: '2026-09-03' },
    body: '**Bold** headline\n# Title',
  });

  assert.ok(errors.some((err) => err.includes('Markdown bold')));
  assert.ok(errors.some((err) => err.includes('Markdown headings')));
});

test('validatePost rejects commentary over LinkedIn limit', () => {
  const errors = validatePost({
    frontmatter: { sujet: 'Test', date: '2026-09-03' },
    body: 'x'.repeat(LINKEDIN_COMMENTARY_MAX_LENGTH + 1),
  });

  assert.ok(errors.some((err) => err.includes('exceeds LinkedIn limit')));
});

test('formatLinkedInApiError prefers message and inputErrors', () => {
  assert.equal(
    formatLinkedInApiError(400, { message: 'Invalid field' }),
    'Invalid field'
  );
  assert.equal(
    formatLinkedInApiError(
      403,
      { errorDetails: { inputErrors: [{ description: 'Missing distribution' }] } }
    ),
    'Missing distribution'
  );
});

test('LinkedIn publisher reads post id from x-restli-id response header', async () => {
  const { LinkedInPublisher } = await import('./publish-to-linkedin.mjs');

  const fetchImpl = async () => ({
    ok: true,
    status: 201,
    headers: {
      get(name) {
        return name.toLowerCase() === 'x-restli-id'
          ? 'urn:li:share:6844785523593134080'
          : null;
      },
    },
    json: async () => ({}),
  });

  const publisher = new LinkedInPublisher({
    fetchImpl,
    accessToken: 'test-token',
    personUrn: 'urn:li:person:123',
  });

  const result = await publisher.publishToLinkedIn({ body: 'Sample post' });
  assert.equal(result.postId, 'urn:li:share:6844785523593134080');
  assert.equal(result.status, 201);
});

test('LinkedIn publisher targets the REST posts endpoint', () => {
  assert.equal(LINKEDIN_POSTS_URL, 'https://api.linkedin.com/rest/posts');
});

test('buildLinkedInPostPayload attaches content.media when an image URN is provided', () => {
  const payload = buildLinkedInPostPayload('urn:li:person:123', 'Hello LinkedIn', {
    id: 'urn:li:image:C4E10AQFoyyAjHPMQuQ',
    altText: 'Schéma Headless 360',
  });

  assert.deepEqual(payload.content, {
    media: {
      id: 'urn:li:image:C4E10AQFoyyAjHPMQuQ',
      altText: 'Schéma Headless 360',
    },
  });
  assert.ok(!('specificContent' in payload));
});

test('buildLinkedInPostPayload stays text-only without media', () => {
  const payload = buildLinkedInPostPayload('urn:li:person:123', 'Hello LinkedIn');
  assert.ok(!('content' in payload));
});

test('resolvePostImagePath resolves image relative to the markdown file', () => {
  const post = makeTempPost();
  const resolved = resolvePostImagePath(post);
  assert.equal(resolved, path.join(post.dir, 'images', '2026-09-05-test.png'));
  fs.rmSync(post.dir, { recursive: true, force: true });
});

test('imageContentType maps common extensions', () => {
  assert.equal(imageContentType('cover.png'), 'image/png');
  assert.equal(imageContentType('cover.JPG'), 'image/jpeg');
  assert.equal(imageContentType('cover.gif'), 'image/gif');
  assert.equal(imageContentType('cover.webp'), null);
});

test('validatePost rejects a missing image file', () => {
  const post = makeTempPost({ createImage: false });
  const errors = validatePost(post);
  assert.ok(errors.some((err) => err.includes('Image file not found')));
  fs.rmSync(post.dir, { recursive: true, force: true });
});

test('validatePost rejects missing image_alt when image is set', () => {
  const post = makeTempPost({ imageAlt: '' });
  const errors = validatePost(post);
  assert.ok(errors.some((err) => err.includes('image_alt')));
  fs.rmSync(post.dir, { recursive: true, force: true });
});

test('validatePost rejects unsupported image extensions', () => {
  const post = makeTempPost({ imageName: 'images/cover.webp' });
  const errors = validatePost(post);
  assert.ok(errors.some((err) => err.includes('Unsupported image type')));
  fs.rmSync(post.dir, { recursive: true, force: true });
});

test('validatePost rejects image_alt over LinkedIn limit', () => {
  const post = makeTempPost({ imageAlt: 'x'.repeat(LINKEDIN_IMAGE_ALT_MAX_LENGTH + 1) });
  const errors = validatePost(post);
  assert.ok(errors.some((err) => err.includes('image_alt exceeds LinkedIn limit')));
  fs.rmSync(post.dir, { recursive: true, force: true });
});

test('validatePost accepts a post with an existing png and alt text', () => {
  const post = makeTempPost();
  const errors = validatePost(post);
  assert.deepEqual(errors, []);
  fs.rmSync(post.dir, { recursive: true, force: true });
});

test('dry-run payload includes a placeholder image URN', async () => {
  const { LinkedInPublisher } = await import('./publish-to-linkedin.mjs');
  const post = makeTempPost();
  const publisher = new LinkedInPublisher({
    dryRun: true,
    personUrn: 'urn:li:person:123',
  });

  const result = await publisher.publishToLinkedIn(post);
  assert.equal(result.dryRun, true);
  assert.equal(result.payload.content.media.id, DRY_RUN_IMAGE_URN);
  assert.equal(result.payload.content.media.altText, 'Diagramme d’architecture headless');
  fs.rmSync(post.dir, { recursive: true, force: true });
});

test('publisher uploads the image then posts with content.media', async () => {
  const { LinkedInPublisher } = await import('./publish-to-linkedin.mjs');
  const post = makeTempPost();
  const calls = [];

  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, method: options.method || 'GET', headers: options.headers, body: options.body });

    if (String(url).includes('action=initializeUpload')) {
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({
          value: {
            uploadUrl: 'https://www.linkedin.com/dms-uploads/test',
            image: 'urn:li:image:C4E10AQFtest',
          },
        }),
      };
    }

    if (String(url).includes('dms-uploads')) {
      return {
        ok: true,
        status: 201,
        headers: { get: () => null },
        json: async () => ({}),
        text: async () => '',
      };
    }

    return {
      ok: true,
      status: 201,
      headers: {
        get(name) {
          return name.toLowerCase() === 'x-restli-id' ? 'urn:li:share:999' : null;
        },
      },
      json: async () => ({}),
    };
  };

  const publisher = new LinkedInPublisher({
    fetchImpl,
    accessToken: 'test-token',
    personUrn: 'urn:li:person:123',
  });

  const result = await publisher.publishToLinkedIn(post);
  assert.equal(result.postId, 'urn:li:share:999');
  assert.equal(calls.length, 3);
  assert.equal(calls[0].url, `${LINKEDIN_IMAGES_URL}?action=initializeUpload`);
  assert.equal(calls[0].method, 'POST');
  assert.equal(calls[1].url, 'https://www.linkedin.com/dms-uploads/test');
  assert.equal(calls[1].method, 'PUT');
  assert.equal(calls[1].headers['Content-Type'], 'image/png');
  assert.ok(!('LinkedIn-Version' in calls[1].headers));
  assert.equal(calls[2].url, LINKEDIN_POSTS_URL);
  const postBody = JSON.parse(calls[2].body);
  assert.equal(postBody.content.media.id, 'urn:li:image:C4E10AQFtest');
  assert.equal(postBody.content.media.altText, 'Diagramme d’architecture headless');
  fs.rmSync(post.dir, { recursive: true, force: true });
});
