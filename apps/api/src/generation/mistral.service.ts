import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContentType } from '@prisma/client';
import { IMAGE_PROMPT, REVISE_PROMPT, SEO_PROMPT } from './prompts';
import { parseSeoJson, selectDraftPrompt, type SeoResult } from './seo';

export type { SeoResult };

@Injectable()
export class MistralService {
  private readonly logger = new Logger(MistralService.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.config.get<string>('MISTRAL_API_KEY'));
  }

  private apiKey(): string {
    const key = this.config.get<string>('MISTRAL_API_KEY');
    if (!key) {
      throw new ServiceUnavailableException('MISTRAL_API_KEY is not configured');
    }
    return key;
  }

  private model(): string {
    return this.config.get<string>('MISTRAL_MODEL') || 'mistral-small-latest';
  }

  private kindLabel(type: ContentType): string {
    if (type === ContentType.TUTORIAL) return 'tutorial';
    if (type === ContentType.LINKEDIN) return 'LinkedIn post';
    return 'blog article';
  }

  draftPrompt(type: ContentType, sujet: string, audience?: string | null, objectif?: string | null): string {
    return selectDraftPrompt(type, sujet, audience, objectif);
  }

  async generateDraft(params: {
    type: ContentType;
    sujet: string;
    audience?: string | null;
    objectif?: string | null;
  }): Promise<string> {
    const prompt = this.draftPrompt(params.type, params.sujet, params.audience, params.objectif);
    return this.complete(prompt);
  }

  async revise(params: { type: ContentType; body: string; instruction: string }): Promise<string> {
    const prompt = REVISE_PROMPT.replaceAll('{kind}', this.kindLabel(params.type))
      .replaceAll('{instruction}', params.instruction)
      .replaceAll('{body}', params.body);
    return this.complete(prompt);
  }

  async generateSeo(params: { type: ContentType; sujet: string; body: string }): Promise<SeoResult> {
    const prompt = SEO_PROMPT.replaceAll('{kind}', this.kindLabel(params.type))
      .replaceAll('{sujet}', params.sujet)
      .replaceAll('{body}', params.body);
    const raw = await this.complete(prompt);
    return parseSeoJson(raw, params.sujet, params.body);
  }

  async generateCoverPng(sujet: string): Promise<Buffer> {
    const prompt = IMAGE_PROMPT.replaceAll('{sujet}', sujet);
    const data = await this.chat({
      messages: [{ role: 'user', content: prompt }],
      tools: [{ type: 'image_generation' }],
    });
    const url = this.extractImageUrl(data);
    if (url) {
      const response = await fetch(url);
      if (!response.ok) {
        throw new ServiceUnavailableException(`Failed to download generated image (${response.status})`);
      }
      return Buffer.from(await response.arrayBuffer());
    }
    const fileId = this.extractFileId(data);
    if (fileId) {
      return this.downloadFile(fileId);
    }
    throw new ServiceUnavailableException('Mistral did not return a generated image');
  }

  parseSeo(raw: string, sujet: string, body: string): SeoResult {
    return parseSeoJson(raw, sujet, body);
  }

  private async complete(prompt: string): Promise<string> {
    const data = await this.chat({
      messages: [{ role: 'user', content: prompt }],
    });
    const text = this.extractText(data).trim();
    if (!text) {
      throw new ServiceUnavailableException('Mistral returned an empty completion');
    }
    return text;
  }

  private async chat(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model(),
        temperature: 0.7,
        ...body,
      }),
    });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      this.logger.error(`Mistral error ${response.status}: ${JSON.stringify(data)}`);
      throw new ServiceUnavailableException(`Mistral API error (${response.status})`);
    }
    return data;
  }

  private extractText(data: Record<string, unknown>): string {
    const choices = data.choices as Array<Record<string, unknown>> | undefined;
    const choice = choices?.[0];
    if (!choice) return '';
    const message = (choice.message || (choice.messages as unknown[])?.[0]) as Record<string, unknown> | undefined;
    const content = message?.content;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content
        .map((part) => {
          if (typeof part === 'string') return part;
          if (part && typeof part === 'object' && 'text' in part) {
            return String((part as { text: string }).text || '');
          }
          return '';
        })
        .join('\n');
    }
    return '';
  }

  private extractImageUrl(data: Record<string, unknown>): string | null {
    const json = JSON.stringify(data);
    const match = json.match(/https?:\/\/[^"\\\s]+\.(?:png|jpg|jpeg|webp)/i);
    if (match) return match[0];
    const urlMatch = json.match(/"image_url"\s*:\s*"([^"]+)"/);
    return urlMatch?.[1] || null;
  }

  private extractFileId(data: Record<string, unknown>): string | null {
    const json = JSON.stringify(data);
    const match = json.match(/"file_id"\s*:\s*"([^"]+)"/);
    return match?.[1] || null;
  }

  private async downloadFile(fileId: string): Promise<Buffer> {
    const response = await fetch(`https://api.mistral.ai/v1/files/${fileId}/content`, {
      headers: { Authorization: `Bearer ${this.apiKey()}` },
    });
    if (!response.ok) {
      throw new ServiceUnavailableException(`Failed to download Mistral file ${fileId} (${response.status})`);
    }
    return Buffer.from(await response.arrayBuffer());
  }
}
