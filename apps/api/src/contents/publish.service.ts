import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ContentStatus, PublishChannel, PublicationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { LinkedInPublisherService } from '../linkedin/linkedin-publisher.service';
import { WordpressPublisherService } from '../wordpress/wordpress-publisher.service';
import { ContentsService } from './contents.service';
import { PublishContentDto } from './dto/publish.dto';

@Injectable()
export class PublishService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contents: ContentsService,
    private readonly storage: StorageService,
    private readonly linkedin: LinkedInPublisherService,
    private readonly wordpress: WordpressPublisherService,
  ) {}

  private async getInternalLinks(contentId: string) {
    const links = await this.prisma.internalLink.findMany({
      where: { contentId },
    });
    return links.map((link) => ({
      targetUrl: link.targetUrl,
      anchorText: link.anchorText,
    }));
  }

  async publish(id: string, dto: PublishContentDto) {
    const content = await this.prisma.content.findUnique({ where: { id } });
    if (!content) {
      throw new NotFoundException('Content not found');
    }
    if (content.status !== ContentStatus.APPROVED && content.status !== ContentStatus.PUBLISHED && content.status !== ContentStatus.FAILED) {
      throw new BadRequestException('Approve the draft before publishing');
    }
    if (dto.channel === PublishChannel.LINKEDIN && content.linkedinPostId && !dto.dryRun) {
      throw new BadRequestException('This post was already published to LinkedIn');
    }
    await this.prisma.content.update({
      where: { id },
      data: { status: ContentStatus.PUBLISHING },
    });
    const coverAbs = content.coverRelPath ? this.storage.absolutePath(content.coverRelPath) : null;
    try {
      if (dto.channel === PublishChannel.LINKEDIN) {
        const result = await this.linkedin.publish({
          sujet: content.sujet,
          body: content.body,
          coverAbsPath: coverAbs,
          imageAlt: content.imageAlt,
          dryRun: dto.dryRun,
        });
        const publication = await this.prisma.publication.create({
          data: {
            contentId: id,
            channel: PublishChannel.LINKEDIN,
            status: PublicationStatus.SUCCESS,
            externalId: result.postId,
            dryRun: result.dryRun,
          },
        });
        const updated = await this.prisma.content.update({
          where: { id },
          data: {
            linkedinPostId: result.postId || content.linkedinPostId,
            status: ContentStatus.PUBLISHED,
            publishedAt: new Date(),
          },
        });
        return { content: this.contents.toResponse(updated), publication };
      }

      const result = await this.wordpress.publish({
        type: content.type,
        sujet: content.sujet,
        slug: content.slug,
        body: content.body,
        seoTitle: content.seoTitle,
        metaDescription: content.metaDescription,
        focusKeyword: content.focusKeyword,
        imageAlt: content.imageAlt,
        coverAbsPath: coverAbs,
        wordpressId: content.wordpressId,
        internalLinks: await this.getInternalLinks(id),
      });
      const publication = await this.prisma.publication.create({
        data: {
          contentId: id,
          channel: PublishChannel.WORDPRESS,
          status: PublicationStatus.SUCCESS,
          externalId: String(result.id),
          url: result.url,
        },
      });
      const updated = await this.prisma.content.update({
        where: { id },
        data: {
          wordpressId: result.id,
          wordpressUrl: result.url,
          status: ContentStatus.PUBLISHED,
          publishedAt: new Date(),
        },
      });
      return { content: this.contents.toResponse(updated), publication };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Publish failed';
      await this.prisma.publication.create({
        data: {
          contentId: id,
          channel: dto.channel,
          status: PublicationStatus.FAILED,
          error: message,
          dryRun: Boolean(dto.dryRun),
        },
      });
      await this.prisma.content.update({
        where: { id },
        data: { status: ContentStatus.FAILED },
      });
      throw error;
    }
  }
}
