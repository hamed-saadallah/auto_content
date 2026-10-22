import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Content, ContentStatus, ContentType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MistralService } from '../generation/mistral.service';
import { InternalLinkingService } from '../generation/internal-linking.service';
import { StorageService } from '../storage/storage.service';
import { buildSlug } from '../common/slug';
import { validateLinkedInBody } from '../linkedin/linkedin.util';
import { CreateContentDto, UpdateContentDto } from './dto/content.dto';

@Injectable()
export class ContentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mistral: MistralService,
    private readonly storage: StorageService,
    private readonly internalLinking: InternalLinkingService,
  ) {}

  toResponse(content: Content) {
    return {
      ...content,
      coverUrl: content.coverRelPath ? this.storage.publicUrl(content.coverRelPath) : null,
      linkedinErrors:
        content.type === ContentType.LINKEDIN ? validateLinkedInBody(content.sujet, content.body) : [],
    };
  }

  async list(type?: ContentType) {
    const items = await this.prisma.content.findMany({
      where: type ? { type } : undefined,
      orderBy: { updatedAt: 'desc' },
    });
    return items.map((item) => this.toResponse(item));
  }

  async get(id: string) {
    const content = await this.prisma.content.findUnique({
      where: { id },
      include: { revisions: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
    if (!content) throw new NotFoundException('Content not found');
    return { ...this.toResponse(content), revisions: content.revisions };
  }

  private async uniqueSlug(sujet: string): Promise<string> {
    const base = buildSlug(sujet);
    let slug = base;
    let n = 2;
    while (await this.prisma.content.findUnique({ where: { slug } })) {
      slug = `${base}-${n}`;
      n += 1;
    }
    return slug;
  }

  async create(dto: CreateContentDto) {
    const slug = await this.uniqueSlug(dto.sujet);
    let body = '';
    if (dto.generate) {
      if (!this.mistral.isConfigured()) {
        throw new ServiceUnavailableException('MISTRAL_API_KEY is required to generate a draft');
      }
      body = await this.mistral.generateDraft({
        type: dto.type,
        sujet: dto.sujet,
        audience: dto.audience,
        objectif: dto.objectif,
      });
    }
    const content = await this.prisma.content.create({
      data: {
        type: dto.type,
        sujet: dto.sujet.trim(),
        slug,
        audience: dto.audience?.trim() || null,
        objectif: dto.objectif?.trim() || null,
        body,
        status: body ? ContentStatus.REVIEW : ContentStatus.DRAFT,
        revisions: body ? { create: { body, instruction: 'initial generate' } } : undefined,
      },
    });
    return this.toResponse(content);
  }

  async update(id: string, dto: UpdateContentDto) {
    await this.get(id);
    const content = await this.prisma.content.update({
      where: { id },
      data: {
        sujet: dto.sujet?.trim(),
        audience: dto.audience?.trim(),
        objectif: dto.objectif?.trim(),
        body: dto.body,
        seoTitle: dto.seoTitle,
        metaDescription: dto.metaDescription,
        focusKeyword: dto.focusKeyword,
        imageAlt: dto.imageAlt,
        status: dto.body !== undefined ? ContentStatus.REVIEW : undefined,
      },
    });
    return this.toResponse(content);
  }

  async generate(id: string) {
    const current = await this.prisma.content.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Content not found');
    if (!this.mistral.isConfigured()) {
      throw new ServiceUnavailableException('MISTRAL_API_KEY is required to generate a draft');
    }
    const body = await this.mistral.generateDraft({
      type: current.type,
      sujet: current.sujet,
      audience: current.audience,
      objectif: current.objectif,
    });
    const content = await this.prisma.content.update({
      where: { id },
      data: {
        body,
        status: ContentStatus.REVIEW,
        revisions: { create: { body, instruction: 'generate' } },
      },
    });
    return this.toResponse(content);
  }

  async revise(id: string, instruction: string) {
    const current = await this.prisma.content.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Content not found');
    if (!current.body.trim()) {
      throw new BadRequestException('Generate or paste a draft before revising');
    }
    if (!this.mistral.isConfigured()) {
      throw new ServiceUnavailableException('MISTRAL_API_KEY is required to revise a draft');
    }
    const body = await this.mistral.revise({
      type: current.type,
      body: current.body,
      instruction,
    });
    const content = await this.prisma.content.update({
      where: { id },
      data: {
        body,
        status: ContentStatus.REVIEW,
        revisions: { create: { body, instruction } },
      },
    });
    return this.toResponse(content);
  }

  async approve(id: string) {
    const current = await this.prisma.content.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Content not found');
    if (!current.body.trim()) {
      throw new BadRequestException('Cannot approve an empty draft');
    }
    if (current.type === ContentType.LINKEDIN) {
      const errors = validateLinkedInBody(current.sujet, current.body);
      if (errors.length) {
        throw new BadRequestException({ message: 'LinkedIn validation failed', errors });
      }
    }

    let seoTitle = current.seoTitle;
    let metaDescription = current.metaDescription;
    let focusKeyword = current.focusKeyword;
    let imageAlt = current.imageAlt;
    let seoAnalysis: Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined = current.seoAnalysis ?? undefined;
    let coverRelPath = current.coverRelPath;

    if (current.type !== ContentType.LINKEDIN && this.mistral.isConfigured()) {
      const seo = await this.mistral.generateSeo({
        type: current.type,
        sujet: current.sujet,
        body: current.body,
      });
      seoTitle = seo.seo_title;
      metaDescription = seo.meta_description;
      focusKeyword = seo.focus_keyword;
      imageAlt = seo.image_alt;
      seoAnalysis = JSON.parse(JSON.stringify(seo.seo_analysis)) as Prisma.InputJsonValue;
    } else if (current.type === ContentType.LINKEDIN && !imageAlt) {
      imageAlt = current.sujet;
    }

    if (this.mistral.isConfigured()) {
      try {
        const png = await this.mistral.generateCoverPng(current.sujet);
        coverRelPath = this.storage.saveCover(current.id, png, '.png');
      } catch {
        // Cover is optional; keep going like the skills do.
      }
    }

    const content = await this.prisma.content.update({
      where: { id },
      data: {
        status: ContentStatus.APPROVED,
        seoTitle,
        metaDescription,
        focusKeyword,
        imageAlt,
        seoAnalysis: seoAnalysis ?? undefined,
        coverRelPath,
      },
    });
    return this.toResponse(content);
  }

  async remove(id: string) {
    await this.get(id);
    await this.prisma.content.delete({ where: { id } });
    return { ok: true };
  }

  async suggestInternalLinks(id: string) {
    const content = await this.prisma.content.findUnique({ where: { id } });
    if (!content) throw new NotFoundException('Content not found');
    if (!content.body.trim()) {
      throw new BadRequestException('Cannot suggest links for empty content');
    }
    if (content.type === ContentType.LINKEDIN) {
      throw new BadRequestException('Internal linking is not available for LinkedIn posts');
    }

    const suggestions = await this.internalLinking.suggestInternalLinks(
      content.body,
      content.sujet,
      content.type,
      id,
    );

    return { suggestions };
  }

  async selectInternalLinks(id: string, selectedLinkIds: string[]) {
    const content = await this.prisma.content.findUnique({ where: { id } });
    if (!content) throw new NotFoundException('Content not found');

    const suggestions = await this.internalLinking.suggestInternalLinks(
      content.body,
      content.sujet,
      content.type,
      id,
    );

    const selectedSuggestions = suggestions.filter((s) =>
      selectedLinkIds.includes(s.targetId),
    );

    await this.prisma.internalLink.deleteMany({ where: { contentId: id } });

    if (selectedSuggestions.length > 0) {
      await this.prisma.internalLink.createMany({
        data: selectedSuggestions.map((s) => ({
          contentId: id,
          targetUrl: s.targetUrl,
          targetTitle: s.targetTitle,
          anchorText: s.suggestedAnchorText,
          reason: s.reason,
        })),
      });
    }

    const links = await this.prisma.internalLink.findMany({
      where: { contentId: id },
    });

    return { selectedCount: links.length, links };
  }
}
