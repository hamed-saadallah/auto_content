import MarkdownIt from 'markdown-it';
import { ContentType } from '@prisma/client';

const markdown = new MarkdownIt({ html: false, linkify: true, breaks: false });

export type WordpressPostInput = {
  type: ContentType;
  sujet: string;
  slug: string;
  body: string;
  seoTitle?: string | null;
  metaDescription?: string | null;
  focusKeyword?: string | null;
  imageAlt?: string | null;
  date?: Date;
};

export type WordpressCategoryIds = {
  blog: number;
  tutorial: number;
};

export function categoryForType(type: ContentType, ids: WordpressCategoryIds): number | null {
  if (type === ContentType.BLOG) return ids.blog;
  if (type === ContentType.TUTORIAL) return ids.tutorial;
  return null;
}

export function markdownToHtml(source: string): string {
  return markdown.render(source ?? '');
}

export function buildWordpressPayload(
  input: WordpressPostInput,
  options: { mediaId?: number | null; categoryIds: WordpressCategoryIds; status?: 'publish' | 'draft' },
) {
  const categoryId = categoryForType(input.type, options.categoryIds);
  const title = input.seoTitle?.trim() || input.sujet;
  const excerpt = input.metaDescription?.trim() || '';
  const payload: Record<string, unknown> = {
    title,
    slug: input.slug,
    content: markdownToHtml(input.body),
    excerpt,
    status: options.status ?? 'publish',
    featured_media: options.mediaId ?? 0,
  };
  if (input.date) {
    payload.date = input.date.toISOString();
  }
  if (categoryId) {
    payload.categories = [categoryId];
  }
  if (input.seoTitle || input.metaDescription || input.focusKeyword) {
    payload.meta = {
      _yoast_wpseo_title: input.seoTitle || title,
      _yoast_wpseo_metadesc: input.metaDescription || excerpt,
      _yoast_wpseo_focuskw: input.focusKeyword || '',
    };
  }
  return payload;
}
