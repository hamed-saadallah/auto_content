import { ContentType } from '@prisma/client';
import {
  BLOG_PROMPT,
  DEFAULT_AUDIENCE,
  DEFAULT_OBJECTIF,
  LINKEDIN_PROMPT,
  TUTORIAL_PROMPT,
  fillTemplate,
} from './prompts';

export function selectDraftPrompt(
  type: ContentType,
  sujet: string,
  audience?: string | null,
  objectif?: string | null,
): string {
  const vars = {
    sujet,
    audience: audience?.trim() || DEFAULT_AUDIENCE,
    objectif: objectif?.trim() || DEFAULT_OBJECTIF,
  };
  if (type === ContentType.TUTORIAL) return fillTemplate(TUTORIAL_PROMPT, vars);
  if (type === ContentType.LINKEDIN) return fillTemplate(LINKEDIN_PROMPT, vars);
  return fillTemplate(BLOG_PROMPT, vars);
}

export type SeoResult = {
  seo_title: string;
  meta_description: string;
  focus_keyword: string;
  image_alt: string;
  seo_analysis: Record<string, unknown>;
};

export function parseSeoJson(raw: string, sujet: string, body: string): SeoResult {
  const jsonText = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  try {
    const parsed = JSON.parse(jsonText) as SeoResult;
    return {
      seo_title: parsed.seo_title || sujet,
      meta_description: parsed.meta_description || '',
      focus_keyword: parsed.focus_keyword || sujet.toLowerCase(),
      image_alt: parsed.image_alt || sujet,
      seo_analysis: parsed.seo_analysis || { word_count: body.split(/\s+/).filter(Boolean).length },
    };
  } catch {
    const words = body.split(/\s+/).filter(Boolean).length;
    return {
      seo_title: sujet.slice(0, 60),
      meta_description: body.replace(/\s+/g, ' ').slice(0, 155),
      focus_keyword: sujet.toLowerCase().split(/\s+/).slice(0, 3).join(' '),
      image_alt: sujet,
      seo_analysis: { word_count: words, seo_score: 'Yellow', readability_score: 'Yellow' },
    };
  }
}
