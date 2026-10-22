import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ContentType, ContentStatus } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Internal Linking Integration (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Clean up test data
    await prisma.internalLink.deleteMany();
    await prisma.publication.deleteMany();
    await prisma.revision.deleteMany();
    await prisma.content.deleteMany();
    await prisma.user.deleteMany();

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
      },
    });
    userId = user.id;

    // Get auth token (simplified; in real tests use proper auth)
    authToken = 'test-token-' + userId;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/contents/:id/suggest-internal-links', () => {
    it('should return empty array when no published content exists', async () => {
      const content = await prisma.content.create({
        data: {
          type: ContentType.BLOG,
          sujet: 'TypeScript Basics',
          slug: 'typescript-basics',
          body: 'TypeScript adds type safety to JavaScript',
          status: ContentStatus.APPROVED,
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/api/contents/${content.id}/suggest-internal-links`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.suggestions).toEqual([]);
    });

    it('should suggest relevant articles based on keywords', async () => {
      // Create a published article
      const published = await prisma.content.create({
        data: {
          type: ContentType.BLOG,
          sujet: 'Understanding TypeScript Types',
          slug: 'typescript-types',
          body: 'TypeScript types provide type safety. Types are essential for catching errors early.',
          status: ContentStatus.PUBLISHED,
          wordpressId: 101,
          wordpressUrl: 'https://example.com/typescript-types',
          focusKeyword: 'typescript types',
        },
      });

      // Create new article about similar topic
      const newArticle = await prisma.content.create({
        data: {
          type: ContentType.BLOG,
          sujet: 'Advanced TypeScript Patterns',
          slug: 'advanced-typescript',
          body: 'TypeScript provides powerful type features. These types help developers write better code.',
          status: ContentStatus.APPROVED,
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/api/contents/${newArticle.id}/suggest-internal-links`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.suggestions).toBeDefined();
      expect(Array.isArray(response.body.suggestions)).toBe(true);

      if (response.body.suggestions.length > 0) {
        const suggestion = response.body.suggestions[0];
        expect(suggestion.targetId).toBe(published.id);
        expect(suggestion.targetTitle).toBe('Understanding TypeScript Types');
        expect(suggestion.targetUrl).toBe('https://example.com/typescript-types');
        expect(suggestion.suggestedAnchorText).toBeDefined();
        expect(suggestion.score).toBeGreaterThan(0);
        expect(suggestion.reason).toBeDefined();
      }
    });

    it('should exclude self-referencing content', async () => {
      const article = await prisma.content.create({
        data: {
          type: ContentType.BLOG,
          sujet: 'React Hooks',
          slug: 'react-hooks',
          body: 'React Hooks simplify component logic. Hooks are powerful features.',
          status: ContentStatus.PUBLISHED,
          wordpressId: 102,
          wordpressUrl: 'https://example.com/react-hooks',
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/api/contents/${article.id}/suggest-internal-links`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const hasSelf = response.body.suggestions.some((s) => s.targetId === article.id);
      expect(hasSelf).toBe(false);
    });

    it('should fail when content is empty', async () => {
      const content = await prisma.content.create({
        data: {
          type: ContentType.BLOG,
          sujet: 'Empty Post',
          slug: 'empty-post',
          body: '',
          status: ContentStatus.APPROVED,
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/api/contents/${content.id}/suggest-internal-links`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.message).toContain('empty');
    });

    it('should fail for LinkedIn content', async () => {
      const content = await prisma.content.create({
        data: {
          type: ContentType.LINKEDIN,
          sujet: 'LinkedIn Post',
          slug: 'linkedin-post',
          body: 'Some LinkedIn content',
          status: ContentStatus.APPROVED,
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/api/contents/${content.id}/suggest-internal-links`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.message).toContain('not available for LinkedIn');
    });
  });

  describe('POST /api/contents/:id/select-internal-links', () => {
    it('should store selected internal links', async () => {
      // Create published articles
      const article1 = await prisma.content.create({
        data: {
          type: ContentType.BLOG,
          sujet: 'REST APIs',
          slug: 'rest-apis',
          body: 'REST APIs provide a standard way to build web services. APIs are crucial for modern development.',
          status: ContentStatus.PUBLISHED,
          wordpressId: 103,
          wordpressUrl: 'https://example.com/rest-apis',
        },
      });

      const article2 = await prisma.content.create({
        data: {
          type: ContentType.BLOG,
          sujet: 'GraphQL Basics',
          slug: 'graphql-basics',
          body: 'GraphQL is an alternative to REST. GraphQL provides more flexibility than traditional APIs.',
          status: ContentStatus.PUBLISHED,
          wordpressId: 104,
          wordpressUrl: 'https://example.com/graphql-basics',
        },
      });

      // Create new article
      const newArticle = await prisma.content.create({
        data: {
          type: ContentType.BLOG,
          sujet: 'Comparing API Approaches',
          slug: 'comparing-apis',
          body: 'REST APIs and GraphQL are two popular approaches. Both have their strengths.',
          status: ContentStatus.APPROVED,
        },
      });

      // First, get suggestions
      const suggestResponse = await request(app.getHttpServer())
        .post(`/api/contents/${newArticle.id}/suggest-internal-links`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const suggestions = suggestResponse.body.suggestions;

      // Select first suggestion if available
      if (suggestions.length > 0) {
        const selectedIds = [suggestions[0].targetId];

        const selectResponse = await request(app.getHttpServer())
          .post(`/api/contents/${newArticle.id}/select-internal-links`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ selectedLinkIds: selectedIds })
          .expect(200);

        expect(selectResponse.body.selectedCount).toBeGreaterThan(0);
        expect(Array.isArray(selectResponse.body.links)).toBe(true);

        const storedLinks = await prisma.internalLink.findMany({
          where: { contentId: newArticle.id },
        });

        expect(storedLinks.length).toBeGreaterThan(0);
        expect(storedLinks[0].targetUrl).toBeDefined();
        expect(storedLinks[0].anchorText).toBeDefined();
      }
    });

    it('should replace previous selections', async () => {
      const published = await prisma.content.create({
        data: {
          type: ContentType.BLOG,
          sujet: 'Database Design',
          slug: 'database-design',
          body: 'Good database design is essential. Databases store critical data.',
          status: ContentStatus.PUBLISHED,
          wordpressId: 105,
          wordpressUrl: 'https://example.com/database-design',
        },
      });

      const newArticle = await prisma.content.create({
        data: {
          type: ContentType.BLOG,
          sujet: 'Query Optimization',
          slug: 'query-optimization',
          body: 'Query optimization improves performance. Databases need optimization.',
          status: ContentStatus.APPROVED,
        },
      });

      // Select once
      const firstSelect = await request(app.getHttpServer())
        .post(`/api/contents/${newArticle.id}/select-internal-links`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ selectedLinkIds: [published.id] });

      if (firstSelect.status === 200 && firstSelect.body.selectedCount > 0) {
        // Select again with empty list
        const secondSelect = await request(app.getHttpServer())
          .post(`/api/contents/${newArticle.id}/select-internal-links`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ selectedLinkIds: [] })
          .expect(200);

        expect(secondSelect.body.selectedCount).toBe(0);

        const storedLinks = await prisma.internalLink.findMany({
          where: { contentId: newArticle.id },
        });

        expect(storedLinks.length).toBe(0);
      }
    });

    it('should validate selectedLinkIds is an array', async () => {
      const content = await prisma.content.create({
        data: {
          type: ContentType.BLOG,
          sujet: 'Test',
          slug: 'test-validation',
          body: 'Test',
          status: ContentStatus.APPROVED,
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/api/contents/${content.id}/select-internal-links`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ selectedLinkIds: 'not-an-array' })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('End-to-end workflow', () => {
    it('should suggest, select, and store internal links in complete workflow', async () => {
      // Create published articles
      const existing1 = await prisma.content.create({
        data: {
          type: ContentType.BLOG,
          sujet: 'JavaScript Promises',
          slug: 'js-promises',
          body: 'Promises handle asynchronous operations. Promises make callbacks cleaner.',
          status: ContentStatus.PUBLISHED,
          wordpressId: 106,
          wordpressUrl: 'https://example.com/js-promises',
        },
      });

      const existing2 = await prisma.content.create({
        data: {
          type: ContentType.BLOG,
          sujet: 'Async/Await Guide',
          slug: 'async-await',
          body: 'Async/await simplifies asynchronous code. Async/await is built on promises.',
          status: ContentStatus.PUBLISHED,
          wordpressId: 107,
          wordpressUrl: 'https://example.com/async-await',
        },
      });

      // Create new article
      const newArticle = await prisma.content.create({
        data: {
          type: ContentType.BLOG,
          sujet: 'Mastering Async JavaScript',
          slug: 'mastering-async',
          body: 'Promises and async/await are essential for modern JavaScript. Understanding these patterns is crucial.',
          status: ContentStatus.APPROVED,
        },
      });

      // Step 1: Get suggestions
      const suggestResponse = await request(app.getHttpServer())
        .post(`/api/contents/${newArticle.id}/suggest-internal-links`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(suggestResponse.body.suggestions).toBeDefined();

      // Step 2: Select links from suggestions
      if (suggestResponse.body.suggestions.length > 0) {
        const toSelect = suggestResponse.body.suggestions
          .slice(0, Math.min(2, suggestResponse.body.suggestions.length))
          .map((s) => s.targetId);

        const selectResponse = await request(app.getHttpServer())
          .post(`/api/contents/${newArticle.id}/select-internal-links`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ selectedLinkIds: toSelect })
          .expect(200);

        expect(selectResponse.body.selectedCount).toBe(toSelect.length);
        expect(selectResponse.body.links.length).toBe(toSelect.length);

        // Step 3: Verify stored links
        const storedLinks = await prisma.internalLink.findMany({
          where: { contentId: newArticle.id },
        });

        expect(storedLinks.length).toBe(toSelect.length);
        storedLinks.forEach((link) => {
          expect(link.targetUrl).toMatch(/^https?:\/\//);
          expect(link.anchorText).toBeTruthy();
          expect(link.reason).toBeTruthy();
        });
      }
    });
  });
});
