import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContentType } from '@prisma/client';
import { readFileSync } from 'fs';
import { basename } from 'path';
import { buildWordpressPayload } from './wordpress.mapper';

@Injectable()
export class WordpressPublisherService {
  private readonly logger = new Logger(WordpressPublisherService.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(
      this.config.get<string>('WP_URL') &&
        this.config.get<string>('WP_USERNAME') &&
        this.config.get<string>('WP_APPLICATION_PASSWORD'),
    );
  }

  private baseUrl(): string {
    const url = this.config.get<string>('WP_URL')?.replace(/\/$/, '');
    if (!url) throw new ServiceUnavailableException('WP_URL is not configured');
    return url;
  }

  private authHeader(): string {
    const user = this.config.get<string>('WP_USERNAME');
    const pass = this.config.get<string>('WP_APPLICATION_PASSWORD')?.replace(/\s+/g, '');
    if (!user || !pass) {
      throw new ServiceUnavailableException('WordPress credentials are not configured');
    }
    return `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
  }

  categoryIds() {
    return {
      blog: Number(this.config.get<string>('WP_BLOG_CATEGORY_ID') || 23),
      tutorial: Number(this.config.get<string>('WP_TUTORIAL_CATEGORY_ID') || 24),
    };
  }

  async publish(params: {
    type: ContentType;
    sujet: string;
    slug: string;
    body: string;
    seoTitle?: string | null;
    metaDescription?: string | null;
    focusKeyword?: string | null;
    imageAlt?: string | null;
    coverAbsPath?: string | null;
    wordpressId?: number | null;
    internalLinks?: Array<{ targetUrl: string; anchorText: string }>;
  }): Promise<{ id: number; url: string | null }> {
    if (params.type === ContentType.LINKEDIN) {
      throw new ServiceUnavailableException('LinkedIn posts are not synced to WordPress');
    }
    let mediaId: number | null = null;
    if (params.coverAbsPath) {
      mediaId = await this.uploadMedia(params.coverAbsPath, params.imageAlt || params.sujet);
    }

    let bodyWithLinks = params.body;
    if (params.internalLinks && params.internalLinks.length > 0) {
      bodyWithLinks = this.embedInternalLinks(params.body, params.internalLinks);
    }

    const payload = buildWordpressPayload(
      {
        type: params.type,
        sujet: params.sujet,
        slug: params.slug,
        body: bodyWithLinks,
        seoTitle: params.seoTitle,
        metaDescription: params.metaDescription,
        focusKeyword: params.focusKeyword,
        imageAlt: params.imageAlt,
      },
      { mediaId, categoryIds: this.categoryIds(), status: 'publish' },
    );
    const path = params.wordpressId
      ? `/wp-json/wp/v2/posts/${params.wordpressId}`
      : '/wp-json/wp/v2/posts';
    const response = await fetch(`${this.baseUrl()}${path}`, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const data = (await response.json().catch(() => ({}))) as {
      id?: number;
      link?: string;
      message?: string;
    };
    if (!response.ok || !data.id) {
      this.logger.error(`WordPress publish failed: ${JSON.stringify(data)}`);
      throw new ServiceUnavailableException(data.message || `WordPress API error (${response.status})`);
    }
    return { id: data.id, url: data.link || null };
  }

  private embedInternalLinks(
    body: string,
    links: Array<{ targetUrl: string; anchorText: string }>,
  ): string {
    let result = body;

    for (const link of links) {
      const pattern = new RegExp(`\\b${this.escapeRegex(link.anchorText)}\\b`, 'i');
      const match = result.match(pattern);

      if (match) {
        const htmlLink = `<a href="${link.targetUrl}" title="${link.anchorText}">${match[0]}</a>`;
        result = result.replace(pattern, htmlLink);
      }
    }

    return result;
  }

  private escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private async uploadMedia(filePath: string, alt: string): Promise<number> {
    const bytes = readFileSync(filePath);
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(bytes)], { type: 'image/png' }), basename(filePath));
    form.append('alt_text', alt);
    form.append('title', alt);
    const response = await fetch(`${this.baseUrl()}/wp-json/wp/v2/media`, {
      method: 'POST',
      headers: { Authorization: this.authHeader() },
      body: form,
    });
    const data = (await response.json().catch(() => ({}))) as { id?: number; message?: string };
    if (!response.ok || !data.id) {
      throw new ServiceUnavailableException(data.message || `WordPress media upload failed (${response.status})`);
    }
    return data.id;
  }
}
