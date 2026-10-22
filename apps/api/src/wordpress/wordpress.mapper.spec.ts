import { ContentType } from '@prisma/client';
import { buildWordpressPayload } from './wordpress.mapper';

describe('WordPress Mapper - Internal Linking', () => {
  it('should embed internal links in post body', () => {
    const input = {
      type: ContentType.BLOG,
      sujet: 'Understanding TypeScript',
      slug: 'typescript-guide',
      body: 'TypeScript adds type safety to JavaScript. Types help catch errors early.',
      seoTitle: 'TypeScript Basics Guide',
      metaDescription: 'Learn TypeScript fundamentals',
      focusKeyword: 'typescript',
      imageAlt: 'TypeScript logo',
    };

    const payload = buildWordpressPayload(input, {
      categoryIds: { blog: 1, tutorial: 2 },
      mediaId: 123,
      status: 'publish',
    });

    expect(payload.title).toBe('TypeScript Basics Guide');
    expect(payload.content).toContain('TypeScript');
    expect(payload.excerpt).toBe('Learn TypeScript fundamentals');
    expect(payload.featured_media).toBe(123);
    expect(payload.categories).toContain(1);
  });

  it('should preserve links in markdown conversion', () => {
    const input = {
      type: ContentType.BLOG,
      sujet: 'API Design',
      slug: 'api-design',
      body: '## REST APIs\n\nREST APIs provide a standard interface. Learn more about [API design](https://example.com).',
      seoTitle: 'API Design Best Practices',
    };

    const payload = buildWordpressPayload(input, {
      categoryIds: { blog: 1, tutorial: 2 },
      status: 'publish',
    });

    expect(payload.content).toBeDefined();
    expect(typeof payload.content).toBe('string');
  });

  it('should include all required SEO meta fields', () => {
    const input = {
      type: ContentType.BLOG,
      sujet: 'Performance Optimization',
      slug: 'performance-optimization',
      body: 'Optimize your applications for better performance.',
      seoTitle: 'Web Performance Tips',
      metaDescription: 'Improve your website speed',
      focusKeyword: 'performance optimization',
    };

    const payload = buildWordpressPayload(input, {
      categoryIds: { blog: 1, tutorial: 2 },
      status: 'publish',
    });

    expect(payload.meta).toBeDefined();
    expect(payload.meta._yoast_wpseo_title).toBe('Web Performance Tips');
    expect(payload.meta._yoast_wpseo_metadesc).toBe('Improve your website speed');
    expect(payload.meta._yoast_wpseo_focuskw).toBe('performance optimization');
  });

  it('should handle tutorial category correctly', () => {
    const input = {
      type: ContentType.TUTORIAL,
      sujet: 'Building a REST API',
      slug: 'build-rest-api',
      body: 'Step-by-step guide to building a REST API.',
    };

    const payload = buildWordpressPayload(input, {
      categoryIds: { blog: 1, tutorial: 2 },
      status: 'publish',
    });

    expect(payload.categories).toContain(2);
    expect(payload.categories).not.toContain(1);
  });

  it('should set status to publish or draft as specified', () => {
    const input = {
      type: ContentType.BLOG,
      sujet: 'Draft Post',
      slug: 'draft-post',
      body: 'This is a draft.',
    };

    const draftPayload = buildWordpressPayload(input, {
      categoryIds: { blog: 1, tutorial: 2 },
      status: 'draft',
    });

    expect(draftPayload.status).toBe('draft');

    const publishedPayload = buildWordpressPayload(input, {
      categoryIds: { blog: 1, tutorial: 2 },
      status: 'publish',
    });

    expect(publishedPayload.status).toBe('publish');
  });

  it('should handle missing optional fields gracefully', () => {
    const input = {
      type: ContentType.BLOG,
      sujet: 'Simple Post',
      slug: 'simple-post',
      body: 'Just some content.',
    };

    const payload = buildWordpressPayload(input, {
      categoryIds: { blog: 1, tutorial: 2 },
    });

    expect(payload.title).toBe('Simple Post');
    expect(payload.featured_media).toBe(0);
    expect(payload.excerpt).toBe('');
    expect(payload.status).toBe('publish');
  });
});
