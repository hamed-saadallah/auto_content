import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import { extname } from 'path';
import {
  DRY_RUN_IMAGE_URN,
  LINKEDIN_IMAGES_URL,
  LINKEDIN_POSTS_URL,
  LINKEDIN_USERINFO_URL,
  PERSON_URN_PATTERN,
  buildLinkedInPostPayload,
  buildLinkedInRequestHeaders,
  formatLinkedInApiError,
  normalizePersonUrn,
  validateLinkedInBody,
} from './linkedin.util';

const IMAGE_CONTENT_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
};

@Injectable()
export class LinkedInPublisherService {
  private readonly logger = new Logger(LinkedInPublisherService.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.config.get<string>('LINKEDIN_ACCESS_TOKEN'));
  }

  private token(): string {
    const token = this.config.get<string>('LINKEDIN_ACCESS_TOKEN');
    if (!token) throw new ServiceUnavailableException('LINKEDIN_ACCESS_TOKEN is not configured');
    return token;
  }

  private apiVersion(): string {
    return this.config.get<string>('LINKEDIN_API_VERSION') || '202608';
  }

  async publish(params: {
    sujet: string;
    body: string;
    coverAbsPath?: string | null;
    imageAlt?: string | null;
    dryRun?: boolean;
  }): Promise<{ postId: string | null; dryRun: boolean }> {
    const errors = validateLinkedInBody(params.sujet, params.body);
    if (errors.length) {
      throw new BadRequestException(errors.join('; '));
    }
    const dryRun = Boolean(params.dryRun);
    if (!dryRun) this.token();
    const author = dryRun ? 'urn:li:person:dry-run' : await this.resolvePersonUrn();
    let media: { id: string; altText?: string } | null = null;
    if (params.coverAbsPath) {
      if (dryRun) {
        media = { id: DRY_RUN_IMAGE_URN, altText: params.imageAlt || undefined };
      } else {
        media = await this.uploadImage(params.coverAbsPath, params.imageAlt || '');
      }
    }
    const payload = buildLinkedInPostPayload(author, params.body, media);
    if (dryRun) {
      return { postId: null, dryRun: true };
    }
    const headers = buildLinkedInRequestHeaders(this.token(), this.apiVersion());
    const response = await fetch(LINKEDIN_POSTS_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      throw new ServiceUnavailableException(
        `LinkedIn API error (${response.status}): ${formatLinkedInApiError(response.status, errorData)}`,
      );
    }
    const postId =
      response.headers.get('x-restli-id') ||
      ((await response.json().catch(() => ({}))) as { id?: string }).id ||
      null;
    return { postId, dryRun: false };
  }

  private async resolvePersonUrn(): Promise<string> {
    const configured = normalizePersonUrn(this.config.get<string>('LINKEDIN_PERSON_URN'));
    if (configured) {
      if (!PERSON_URN_PATTERN.test(configured)) {
        throw new ServiceUnavailableException(`Invalid LINKEDIN_PERSON_URN: ${configured}`);
      }
      return configured;
    }
    const response = await fetch(LINKEDIN_USERINFO_URL, {
      headers: { Authorization: `Bearer ${this.token()}` },
    });
    const data = (await response.json().catch(() => ({}))) as { sub?: string };
    if (!response.ok || !data.sub) {
      throw new ServiceUnavailableException('Could not resolve LinkedIn person URN via /v2/userinfo');
    }
    return normalizePersonUrn(data.sub);
  }

  private async uploadImage(imagePath: string, altText: string): Promise<{ id: string; altText?: string }> {
    const headers = buildLinkedInRequestHeaders(this.token(), this.apiVersion());
    const initResponse = await fetch(`${LINKEDIN_IMAGES_URL}?action=initializeUpload`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        initializeUploadRequest: { owner: await this.resolvePersonUrn() },
      }),
    });
    const initData = (await initResponse.json().catch(() => ({}))) as {
      value?: { uploadUrl?: string; image?: string };
    };
    if (!initResponse.ok || !initData.value?.uploadUrl || !initData.value.image) {
      throw new ServiceUnavailableException('LinkedIn Images API initializeUpload failed');
    }
    const ext = extname(imagePath).toLowerCase();
    const contentType = IMAGE_CONTENT_TYPES[ext];
    if (!contentType) throw new ServiceUnavailableException(`Unsupported image type: ${ext}`);
    const bytes = readFileSync(imagePath);
    const putResponse = await fetch(initData.value.uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${this.token()}`,
        'Content-Type': contentType,
      },
      body: bytes,
    });
    if (!putResponse.ok) {
      throw new ServiceUnavailableException(`LinkedIn image upload failed (${putResponse.status})`);
    }
    this.logger.log(`Uploaded LinkedIn image ${initData.value.image}`);
    return { id: initData.value.image, altText: altText || undefined };
  }
}
