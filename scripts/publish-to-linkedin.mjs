#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

/** OpenID userinfo — OpenID apps cannot call /v2/me. */
export const LINKEDIN_USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';
/** LinkedIn Posts API (replaces deprecated /v2/ugcPosts). */
export const LINKEDIN_POSTS_URL = 'https://api.linkedin.com/rest/posts';
/** LinkedIn Images API — initializeUpload then PUT binary to the returned URL. */
export const LINKEDIN_IMAGES_URL = 'https://api.linkedin.com/rest/images';
/** Latest stable LMS version; 202508 sunset 2026-08-17 — see LinkedIn versioning docs. */
export const LINKEDIN_API_VERSION = '202608';
export const LINKEDIN_COMMENTARY_MAX_LENGTH = 3000;
export const LINKEDIN_IMAGE_ALT_MAX_LENGTH = 4086;
export const LINKEDIN_IMAGE_ALT_RECOMMENDED_LENGTH = 120;
export const ALLOWED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif'];
export const DRY_RUN_IMAGE_URN = 'urn:li:image:dry-run';
export const IMAGE_CONTENT_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
};
/** OpenID `sub` is often alphanumeric, not only digits. */
export const PERSON_URN_PATTERN = /^urn:li:person:[A-Za-z0-9_-]+$/;
/**
 * Reserved little-text characters that must be backslash-escaped in Posts API
 * `commentary`. Unescaped `(`, `)`, `|`, `{`, `}`, etc. are parsed as mention /
 * template syntax and LinkedIn silently truncates the rest of the post.
 * `#` is left unescaped so trailing hashtags stay real HashtagElements.
 * https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/little-text-format
 */
const LITTLE_TEXT_ESCAPE_RE = /[\\|{}\[\]()<>*_~@]/g;

/**
 * Escape reserved little-text characters so LinkedIn treats them as plaintext.
 */
export function escapeLinkedInCommentary(text) {
  if (typeof text !== 'string' || text.length === 0) {
    return text;
  }
  return text.replace(LITTLE_TEXT_ESCAPE_RE, '\\$&');
}

/**
 * Build the Posts API payload for an organic post.
 * Pass `media` (`{ id, altText }`) to attach an image; omit for text-only.
 * https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api
 */
export function buildLinkedInPostPayload(authorUrn, commentary, media = null) {
  const payload = {
    author: authorUrn,
    commentary: escapeLinkedInCommentary(commentary),
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  };

  if (media?.id) {
    payload.content = {
      media: {
        id: media.id,
        ...(media.altText ? { altText: media.altText } : {}),
      },
    };
  }

  return payload;
}

/**
 * Resolve `frontmatter.image` relative to the markdown file directory.
 * `images/YYYY-MM-DD-slug.png` next to `content/linkedin/*.md` → `content/linkedin/images/...`.
 */
export function resolvePostImagePath(post) {
  const image = typeof post?.frontmatter?.image === 'string' ? post.frontmatter.image.trim() : '';
  if (!image) return null;
  if (path.isAbsolute(image)) return image;
  const mdDir = post.path ? path.dirname(path.resolve(post.path)) : process.cwd();
  return path.resolve(mdDir, image);
}

export function imageContentType(filePath) {
  const ext = path.extname(filePath || '').toLowerCase();
  return IMAGE_CONTENT_TYPES[ext] || null;
}

/**
 * Headers required by all LinkedIn REST APIs.
 */
export function buildLinkedInRequestHeaders(accessToken, apiVersion = LINKEDIN_API_VERSION) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
    'X-Restli-Protocol-Version': '2.0.0',
    'LinkedIn-Version': apiVersion,
  };
}

export function normalizePersonUrn(value) {
  const raw = (value || '').trim();
  if (!raw) return '';
  return raw.startsWith('urn:li:person:') ? raw : `urn:li:person:${raw}`;
}

/**
 * Validate post content and frontmatter before calling LinkedIn.
 */
export function validatePost(post) {
  const errors = [];

  if (!post.frontmatter.sujet) {
    errors.push('Missing frontmatter: sujet');
  }
  if (!post.frontmatter.date) {
    errors.push('Missing frontmatter: date');
  }
  if (!post.body || post.body.length === 0) {
    errors.push('Post body is empty');
  }
  const commentaryLength = post.body ? escapeLinkedInCommentary(post.body).length : 0;
  if (commentaryLength > LINKEDIN_COMMENTARY_MAX_LENGTH) {
    errors.push(
      `Post body exceeds LinkedIn limit (${commentaryLength}/${LINKEDIN_COMMENTARY_MAX_LENGTH} characters)`
    );
  }

  const markdownPatterns = [
    { pattern: /\*\*[^*]+\*\*/, message: 'Markdown bold (**text**) is not rendered on LinkedIn' },
    { pattern: /^#{1,6}\s/m, message: 'Markdown headings (#) are not rendered on LinkedIn' },
    { pattern: /\[([^\]]+)\]\(([^)]+)\)/, message: 'Markdown links ([text](url)) are not rendered on LinkedIn' },
  ];

  for (const { pattern, message } of markdownPatterns) {
    if (post.body && pattern.test(post.body)) {
      errors.push(message);
    }
  }

  const image = typeof post.frontmatter?.image === 'string' ? post.frontmatter.image.trim() : '';
  if (image) {
    const ext = path.extname(image).toLowerCase();
    if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
      errors.push(
        `Unsupported image type (${ext || 'none'}). Use ${ALLOWED_IMAGE_EXTENSIONS.join(', ')}`
      );
    }

    const resolved = resolvePostImagePath(post);
    if (!resolved || !fs.existsSync(resolved)) {
      errors.push(`Image file not found: ${image}`);
    }

    const alt = typeof post.frontmatter.image_alt === 'string' ? post.frontmatter.image_alt.trim() : '';
    if (!alt) {
      errors.push('Missing frontmatter: image_alt (required when image is set)');
    } else if (alt.length > LINKEDIN_IMAGE_ALT_MAX_LENGTH) {
      errors.push(
        `image_alt exceeds LinkedIn limit (${alt.length}/${LINKEDIN_IMAGE_ALT_MAX_LENGTH} characters)`
      );
    }
  }

  return errors;
}

/**
 * Parse LinkedIn API error payloads into a readable message.
 */
export function formatLinkedInApiError(status, errorData) {
  if (errorData?.message) {
    return errorData.message;
  }
  if (errorData?.error_description) {
    return errorData.error_description;
  }
  if (Array.isArray(errorData?.errorDetails?.inputErrors)) {
    return errorData.errorDetails.inputErrors
      .map((entry) => `${entry.description || entry.code || 'input error'}`)
      .join('; ');
  }
  if (errorData?.status) {
    return String(errorData.status);
  }
  if (Object.keys(errorData || {}).length > 0) {
    return JSON.stringify(errorData);
  }
  return `HTTP ${status}`;
}

/**
 * LinkedIn Post Publisher
 *
 * Publishes markdown posts from content/linkedin/ to LinkedIn using the Posts API.
 *
 * Usage: node scripts/publish-to-linkedin.mjs [--dry-run] <file1> [<file2> ...]
 *
 * Environment variables (unless --dry-run):
 * - LINKEDIN_ACCESS_TOKEN: OAuth token with openid, profile, w_member_social
 * - LINKEDIN_PERSON_URN: optional; resolved via GET /v2/userinfo if omitted
 * - LINKEDIN_API_VERSION: optional YYYYMM (also accepts LINKEDIN_VERSION)
 */
class LinkedInPublisher {
  constructor(options = {}) {
    this.dryRun = options.dryRun ?? false;
    this.accessToken = options.accessToken ?? process.env.LINKEDIN_ACCESS_TOKEN;
    this.personUrn = normalizePersonUrn(options.personUrn ?? process.env.LINKEDIN_PERSON_URN);
    this.apiVersion =
      process.env.LINKEDIN_API_VERSION || process.env.LINKEDIN_VERSION || LINKEDIN_API_VERSION;
    this.fetchImpl = options.fetchImpl || fetch;

    if (!this.dryRun && !this.accessToken) {
      throw new Error('LINKEDIN_ACCESS_TOKEN environment variable is not set');
    }
    if (this.personUrn && !PERSON_URN_PATTERN.test(this.personUrn)) {
      throw new Error(
        `LINKEDIN_PERSON_URN must match urn:li:person:<id> (got: ${this.personUrn})`
      );
    }
  }

  /**
   * OpenID apps (openid + profile) must use /v2/userinfo, not /v2/me.
   */
  async resolvePersonUrn() {
    if (this.personUrn) {
      console.log('   Using LINKEDIN_PERSON_URN from environment');
      return this.personUrn;
    }

    if (this.dryRun) {
      return this.personUrn;
    }

    console.log('   Resolving Person URN via /v2/userinfo...');
    const response = await this.fetchImpl(LINKEDIN_USERINFO_URL, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        `LinkedIn API error (${response.status}): ${formatLinkedInApiError(response.status, data)}. OpenID tokens cannot call /v2/me; they need /v2/userinfo (openid + profile).`
      );
    }
    if (!data.sub) {
      throw new Error('userinfo did not return a "sub" member id');
    }

    this.personUrn = normalizePersonUrn(data.sub);
    if (!PERSON_URN_PATTERN.test(this.personUrn)) {
      throw new Error(`userinfo sub produced an invalid Person URN: ${this.personUrn}`);
    }
    if (data.name) {
      console.log(`   Profile: ${data.name}`);
    }
    console.log(`   Person URN: ${this.personUrn}`);
    return this.personUrn;
  }

  parseMarkdownFile(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(fileContent);

    return {
      path: filePath,
      frontmatter: data,
      body: content.trim(),
    };
  }

  async readErrorPayload(response) {
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      const responseText = await response.text();
      return responseText ? { rawResponse: responseText } : {};
    } catch {
      return {};
    }
  }

  /**
   * Images API: initializeUpload then PUT raw bytes. Do not GET /rest/images
   * afterward — w_member_social is write-only for that resource.
   */
  async uploadImage(imagePath, altText) {
    const headers = buildLinkedInRequestHeaders(this.accessToken, this.apiVersion);
    const initUrl = `${LINKEDIN_IMAGES_URL}?action=initializeUpload`;

    console.log('   Initializing image upload via Images API...');
    const initResponse = await this.fetchImpl(initUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        initializeUploadRequest: { owner: this.personUrn },
      }),
    });

    const initData = await initResponse.json().catch(() => ({}));
    if (!initResponse.ok) {
      throw new Error(
        `LinkedIn Images API error (${initResponse.status}): ${formatLinkedInApiError(initResponse.status, initData)}`
      );
    }

    const uploadUrl = initData?.value?.uploadUrl;
    const imageUrn = initData?.value?.image;
    if (!uploadUrl || !imageUrn) {
      throw new Error('Images API initializeUpload did not return uploadUrl and image URN');
    }

    const contentType = imageContentType(imagePath);
    if (!contentType) {
      throw new Error(`Unsupported image type: ${path.extname(imagePath)}`);
    }

    const bytes = fs.readFileSync(imagePath);
    console.log(`   Uploading image (${bytes.length} bytes, ${contentType})...`);

    const putResponse = await this.fetchImpl(uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': contentType,
      },
      body: bytes,
    });

    if (!putResponse.ok) {
      const errorData = await this.readErrorPayload(putResponse);
      throw new Error(
        `LinkedIn image upload error (${putResponse.status}): ${formatLinkedInApiError(putResponse.status, errorData)}`
      );
    }

    console.log(`   Image URN: ${imageUrn}`);
    return { id: imageUrn, altText };
  }

  async resolveMedia(post) {
    const imageRef = typeof post.frontmatter?.image === 'string' ? post.frontmatter.image.trim() : '';
    if (!imageRef) return null;

    const imagePath = resolvePostImagePath(post);
    const altText = (post.frontmatter.image_alt || '').trim();
    const altLength = altText.length;
    if (altLength > LINKEDIN_IMAGE_ALT_RECOMMENDED_LENGTH) {
      console.log(
        `   ⚠️  image_alt is ${altLength} characters (recommended < ${LINKEDIN_IMAGE_ALT_RECOMMENDED_LENGTH})`
      );
    }

    if (this.dryRun) {
      return { id: DRY_RUN_IMAGE_URN, altText, imagePath };
    }

    const uploaded = await this.uploadImage(imagePath, altText);
    return { ...uploaded, imagePath };
  }

  async publishToLinkedIn(post) {
    const media = await this.resolveMedia(post);
    const payload = buildLinkedInPostPayload(this.personUrn, post.body, media);

    if (this.dryRun) {
      return { dryRun: true, payload };
    }

    const headers = buildLinkedInRequestHeaders(this.accessToken, this.apiVersion);

    console.log('   Request headers (sanitized):');
    console.log('     Authorization: Bearer <redacted>');
    console.log(`     X-Restli-Protocol-Version: ${headers['X-Restli-Protocol-Version']}`);
    console.log(`     LinkedIn-Version: ${headers['LinkedIn-Version']}`);
    console.log(`     Content-Type: ${headers['Content-Type']}`);
    console.log(`   Payload author: ${payload.author}`);
    console.log(`   Payload commentary length: ${payload.commentary.length} (escaped for little-text)`);
    if (payload.content?.media?.id) {
      console.log(`   Payload image: ${payload.content.media.id}`);
    }

    const response = await this.fetchImpl(LINKEDIN_POSTS_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await this.readErrorPayload(response);

      console.log(`   Response status: ${response.status}`);
      console.log(`   Response headers: x-restli-id=${response.headers.get('x-restli-id') || 'N/A'}`);
      if (Object.keys(errorData).length > 0) {
        console.log(`   Error details: ${JSON.stringify(errorData, null, 2)}`);
      }

      const errorMessage = formatLinkedInApiError(response.status, errorData);
      throw new Error(`LinkedIn API error (${response.status}): ${errorMessage}`);
    }

    const postId =
      response.headers.get('x-restli-id') ||
      (await response.json().catch(() => ({}))).id ||
      null;

    return { postId, status: response.status };
  }

  async processFile(filePath) {
    const relativePath = path.relative(process.cwd(), filePath);
    console.log(`\n📄 Processing: ${relativePath}`);

    try {
      const post = this.parseMarkdownFile(filePath);

      const validationErrors = validatePost(post);
      if (validationErrors.length > 0) {
        console.error('❌ Validation failed:');
        validationErrors.forEach((err) => console.error(`   - ${err}`));
        return { success: false, file: relativePath, error: validationErrors.join('; ') };
      }

      console.log(`   Sujet: ${post.frontmatter.sujet}`);
      console.log(`   Date: ${post.frontmatter.date}`);
      console.log(`   Body length: ${post.body.length} characters`);
      if (post.frontmatter.image) {
        console.log(`   Image: ${post.frontmatter.image}`);
      }

      if (this.dryRun) {
        console.log('   🧪 Dry run — validating payload only (no API call)');
        const result = await this.publishToLinkedIn(post);
        console.log('✅ Dry run passed');
        console.log(`   API: ${LINKEDIN_POSTS_URL}`);
        console.log(`   Author: ${this.personUrn || '(resolved at publish time via /v2/userinfo)'}`);
        console.log(`   Commentary preview: ${post.body.slice(0, 120)}${post.body.length > 120 ? '…' : ''}`);
        if (result.payload?.content?.media?.id) {
          console.log(`   Image URN (dry-run): ${result.payload.content.media.id}`);
        }
        return { success: true, file: relativePath, dryRun: true, payload: result.payload };
      }

      console.log('   🔗 Publishing via LinkedIn Posts API...');
      const result = await this.publishToLinkedIn(post);

      console.log('✅ Successfully published to LinkedIn');
      console.log(`   Post ID: ${result.postId || 'N/A'}`);

      return { success: true, file: relativePath, postId: result.postId };
    } catch (error) {
      console.error('❌ Failed to publish:', error.message);
      return { success: false, file: relativePath, error: error.message };
    }
  }

  async processFiles(filePaths) {
    if (!this.dryRun) {
      await this.resolvePersonUrn();
    }

    const results = [];

    for (const filePath of filePaths) {
      const result = await this.processFile(filePath);
      results.push(result);
    }

    return results;
  }

  printSummary(results) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 PUBLISHING SUMMARY');
    console.log('='.repeat(60));

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    console.log(`\n✅ Successful: ${successful.length}`);
    successful.forEach((r) => console.log(`   - ${r.file}${r.dryRun ? ' (dry run)' : ''}`));

    if (failed.length > 0) {
      console.log(`\n❌ Failed: ${failed.length}`);
      failed.forEach((r) => console.log(`   - ${r.file}`));
      console.log('\n   Errors:');
      failed.forEach((r) => console.log(`   - ${r.file}: ${r.error}`));
    }

    console.log(`\n📈 Total: ${results.length} file(s)`);
    console.log('='.repeat(60) + '\n');

    return failed.length === 0;
  }
}

function parseArgs(argv) {
  const dryRun = argv.includes('--dry-run');
  const files = argv.filter((arg) => arg !== '--dry-run');
  return { dryRun, files };
}

async function main() {
  const { dryRun, files } = parseArgs(process.argv.slice(2));

  if (files.length === 0) {
    console.log('Usage: node scripts/publish-to-linkedin.mjs [--dry-run] <file1> [<file2> ...]');
    console.log(
      'Environment (unless --dry-run): LINKEDIN_ACCESS_TOKEN (required), LINKEDIN_PERSON_URN (optional), LINKEDIN_API_VERSION (optional)'
    );
    process.exit(1);
  }

  try {
    const publisher = new LinkedInPublisher({ dryRun });
    const results = await publisher.processFiles(files);
    const allSuccess = publisher.printSummary(results);

    process.exit(allSuccess ? 0 : 1);
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) {
  main();
}

export { LinkedInPublisher };
