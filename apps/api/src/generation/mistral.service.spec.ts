import { ContentType } from '@prisma/client';
import { BLOG_PROMPT, fillTemplate } from './prompts';
import { parseSeoJson, selectDraftPrompt } from './seo';

describe('parseSeoJson', () => {
  it('parses JSON even when wrapped in fences', () => {
    const raw =
      '```json\n{"seo_title":"Hello world title here ok","meta_description":"Desc","focus_keyword":"hello","image_alt":"Alt","seo_analysis":{"word_count":10}}\n```';
    const parsed = parseSeoJson(raw, 'Hello', 'one two three');
    expect(parsed.seo_title).toBe('Hello world title here ok');
    expect(parsed.focus_keyword).toBe('hello');
  });

  it('falls back when JSON is invalid', () => {
    const parsed = parseSeoJson('not json', 'Loop engineering', 'alpha beta gamma');
    expect(parsed.seo_title).toContain('Loop');
    expect((parsed.seo_analysis as { word_count: number }).word_count).toBe(3);
  });
});

describe('draft prompts', () => {
  it('injects sujet into the blog template', () => {
    const filled = fillTemplate(BLOG_PROMPT, {
      sujet: 'loop engineering',
      audience: 'engineers',
      objectif: 'teach',
    });
    expect(filled).toContain('loop engineering');
    expect(filled).not.toContain('{sujet}');
  });

  it('selects LinkedIn prompt for LINKEDIN type', () => {
    const prompt = selectDraftPrompt(ContentType.LINKEDIN, 'RAG', 'devs', 'clarity');
    expect(prompt).toContain('post LinkedIn');
    expect(prompt).toContain('RAG');
  });
});
