#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

import {
  buildLinkedInDocumentPostPayload,
  loadCarouselDraft,
  resolveDocumentPath,
  validateCarousel,
} from './carousel-common.mjs';
import {
  LINKEDIN_API_VERSION,
  LINKEDIN_POSTS_URL,
  LINKEDIN_USERINFO_URL,
  PERSON_URN_PATTERN,
  buildLinkedInRequestHeaders,
  formatLinkedInApiError,
  normalizePersonUrn,
} from './publish-to-linkedin.mjs';

export const LINKEDIN_DOCUMENTS_URL = 'https://api.linkedin.com/rest/documents';
export const DRY_RUN_DOCUMENT_URN = 'urn:li:document:dry-run';
export const DOCUMENT_POLL_INTERVAL_MS = 2000;
export const DOCUMENT_POLL_TIMEOUT_MS = 60000;

export function buildDocumentUploadInitPayload(ownerUrn) {
  return {
    initializeUploadRequest: {
      owner: ownerUrn,
    },
  };
}

export class LinkedInCarouselPublisher {
  constructor(options = {}) {
    this.dryRun = options.dryRun ?? false;
    this.accessToken = options.accessToken ?? process.env.LINKEDIN_ACCESS_TOKEN;
    this.personUrn = normalizePersonUrn(options.personUrn ?? process.env.LINKEDIN_PERSON_URN);
    this.apiVersion =
      process.env.LINKEDIN_API_VERSION || process.env.LINKEDIN_VERSION || LINKEDIN_API_VERSION;
    this.fetchImpl = options.fetchImpl || fetch;
    this.pollIntervalMs = options.pollIntervalMs ?? DOCUMENT_POLL_INTERVAL_MS;
    this.pollTimeoutMs = options.pollTimeoutMs ?? DOCUMENT_POLL_TIMEOUT_MS;

    if (!this.dryRun && !this.accessToken) {
      throw new Error('LINKEDIN_ACCESS_TOKEN environment variable is not set');
    }
    if (this.personUrn && !PERSON_URN_PATTERN.test(this.personUrn)) {
      throw new Error(`LINKEDIN_PERSON_URN must match urn:li:person:<id> (got: ${this.personUrn})`);
    }
  }

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
        `LinkedIn API error (${response.status}): ${formatLinkedInApiError(response.status, data)}`
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
    return loadCarouselDraft(filePath);
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

  async initializeDocumentUpload() {
    const headers = buildLinkedInRequestHeaders(this.accessToken, this.apiVersion);
    const initUrl = `${LINKEDIN_DOCUMENTS_URL}?action=initializeUpload`;

    console.log('   Initializing document upload via Documents API...');
    const initResponse = await this.fetchImpl(initUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(buildDocumentUploadInitPayload(this.personUrn)),
    });

    const initData = await initResponse.json().catch(() => ({}));
    if (!initResponse.ok) {
      throw new Error(
        `LinkedIn Documents API error (${initResponse.status}): ${formatLinkedInApiError(initResponse.status, initData)}`
      );
    }

    const uploadUrl = initData?.value?.uploadUrl;
    const documentUrn = initData?.value?.document;
    if (!uploadUrl || !documentUrn) {
      throw new Error('Documents API initializeUpload did not return uploadUrl and document URN');
    }

    return { uploadUrl, documentUrn };
  }

  async uploadDocumentBytes(uploadUrl, pdfPath) {
    const bytes = fs.readFileSync(pdfPath);
    console.log(`   Uploading PDF (${bytes.length} bytes)...`);

    const putResponse = await this.fetchImpl(uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/pdf',
      },
      body: bytes,
    });

    if (!putResponse.ok) {
      const errorData = await this.readErrorPayload(putResponse);
      throw new Error(
        `LinkedIn document upload error (${putResponse.status}): ${formatLinkedInApiError(putResponse.status, errorData)}`
      );
    }
  }

  async waitForDocumentAvailable(documentUrn) {
    const headers = buildLinkedInRequestHeaders(this.accessToken, this.apiVersion);
    const encodedUrn = encodeURIComponent(documentUrn);
    const started = Date.now();

    while (Date.now() - started < this.pollTimeoutMs) {
      const response = await this.fetchImpl(`${LINKEDIN_DOCUMENTS_URL}/${encodedUrn}`, { headers });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          `LinkedIn Documents API error (${response.status}): ${formatLinkedInApiError(response.status, data)}`
        );
      }

      const status = data?.status || data?.value?.status;
      console.log(`   Document status: ${status || 'unknown'}`);

      if (status === 'AVAILABLE') {
        return data;
      }
      if (status === 'PROCESSING_FAILED') {
        throw new Error(`Document processing failed for ${documentUrn}`);
      }

      await new Promise((resolve) => setTimeout(resolve, this.pollIntervalMs));
    }

    throw new Error(`Timed out waiting for document to become AVAILABLE (${this.pollTimeoutMs}ms)`);
  }

  async uploadDocument(pdfPath) {
    const { uploadUrl, documentUrn } = await this.initializeDocumentUpload();
    await this.uploadDocumentBytes(uploadUrl, pdfPath);
    await this.waitForDocumentAvailable(documentUrn);
    console.log(`   Document URN: ${documentUrn}`);
    return documentUrn;
  }

  async publishCarousel(carousel) {
    const pdfPath = resolveDocumentPath(carousel);
    const documentTitle =
      (typeof carousel.frontmatter.document_title === 'string' && carousel.frontmatter.document_title.trim()) ||
      path.basename(pdfPath);

    let documentUrn = DRY_RUN_DOCUMENT_URN;
    if (!this.dryRun) {
      documentUrn = await this.uploadDocument(pdfPath);
    }

    const payload = buildLinkedInDocumentPostPayload(this.personUrn, carousel.body, {
      title: documentTitle,
      id: documentUrn,
    });

    if (this.dryRun) {
      return { dryRun: true, payload, pdfPath, documentTitle };
    }

    const headers = buildLinkedInRequestHeaders(this.accessToken, this.apiVersion);
    console.log('   Request headers (sanitized):');
    console.log('     Authorization: Bearer <redacted>');
    console.log(`     LinkedIn-Version: ${headers['LinkedIn-Version']}`);
    console.log(`   Payload document: ${payload.content.media.id}`);

    const response = await this.fetchImpl(LINKEDIN_POSTS_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await this.readErrorPayload(response);
      throw new Error(`LinkedIn API error (${response.status}): ${formatLinkedInApiError(response.status, errorData)}`);
    }

    const postId =
      response.headers.get('x-restli-id') || (await response.json().catch(() => ({}))).id || null;

    return { postId, status: response.status, payload };
  }

  async processFile(filePath) {
    const relativePath = path.relative(process.cwd(), filePath);
    console.log(`\n📄 Processing carousel: ${relativePath}`);

    try {
      const carousel = this.parseMarkdownFile(filePath);
      const validationErrors = validateCarousel(carousel);
      if (validationErrors.length > 0) {
        console.error('❌ Validation failed:');
        validationErrors.forEach((err) => console.error(`   - ${err}`));
        return { success: false, file: relativePath, error: validationErrors.join('; ') };
      }

      console.log(`   Sujet: ${carousel.frontmatter.sujet}`);
      console.log(`   Date: ${carousel.frontmatter.date}`);
      console.log(`   Slides: ${carousel.frontmatter.slides.length}`);
      console.log(`   Document: ${carousel.frontmatter.document}`);
      console.log(`   Commentary length: ${carousel.body.length} characters`);

      if (this.dryRun) {
        console.log('   🧪 Dry run — validating payload only (no API call)');
        const result = await this.publishCarousel(carousel);
        console.log('✅ Dry run passed');
        console.log(`   API: ${LINKEDIN_POSTS_URL}`);
        console.log(`   Document title: ${result.documentTitle}`);
        console.log(`   Document URN (dry-run): ${result.payload.content.media.id}`);
        return { success: true, file: relativePath, dryRun: true, payload: result.payload };
      }

      console.log('   🔗 Publishing carousel via Documents + Posts API...');
      const result = await this.publishCarousel(carousel);
      console.log('✅ Successfully published carousel to LinkedIn');
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
      results.push(await this.processFile(filePath));
    }
    return results;
  }

  printSummary(results) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 CAROUSEL PUBLISHING SUMMARY');
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
    console.log('Usage: node scripts/publish-carousel-to-linkedin.mjs [--dry-run] <file1> [<file2> ...]');
    console.log(
      'Environment (unless --dry-run): LINKEDIN_ACCESS_TOKEN (required), LINKEDIN_PERSON_URN (optional), LINKEDIN_API_VERSION (optional)'
    );
    process.exit(1);
  }

  try {
    const publisher = new LinkedInCarouselPublisher({ dryRun });
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

export { LinkedInCarouselPublisher as default };
