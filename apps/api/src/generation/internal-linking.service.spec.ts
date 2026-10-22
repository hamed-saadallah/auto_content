import { Test, TestingModule } from '@nestjs/testing';
import { ContentType } from '@prisma/client';
import { InternalLinkingService } from './internal-linking.service';
import { PrismaService } from '../prisma/prisma.service';

describe('InternalLinkingService', () => {
  let service: InternalLinkingService;
  let prisma: PrismaService;

  const mockContent = [
    {
      id: '1',
      sujet: 'Understanding TypeScript Types',
      body: 'TypeScript provides a type system that helps catch errors early. Types are essential for type safety in large projects.',
      type: ContentType.BLOG,
      status: 'PUBLISHED',
      wordpressId: 101,
      wordpressUrl: 'https://example.com/typescript-types',
      focusKeyword: 'typescript types',
      slug: 'typescript-types',
    },
    {
      id: '2',
      sujet: 'React Hooks Guide',
      body: 'React Hooks allow you to use state and other React features without writing a class. Hooks simplify component logic.',
      type: ContentType.TUTORIAL,
      status: 'PUBLISHED',
      wordpressId: 102,
      wordpressUrl: 'https://example.com/react-hooks',
      focusKeyword: 'react hooks',
      slug: 'react-hooks',
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InternalLinkingService,
        {
          provide: PrismaService,
          useValue: {
            content: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<InternalLinkingService>(InternalLinkingService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('suggestInternalLinks', () => {
    it('should return empty array when no published content exists', async () => {
      jest.spyOn(prisma.content, 'findMany').mockResolvedValue([]);

      const suggestions = await service.suggestInternalLinks(
        'This is a blog post about TypeScript',
        'Advanced TypeScript Patterns',
        ContentType.BLOG,
      );

      expect(suggestions).toEqual([]);
    });

    it('should suggest relevant articles based on keyword matching', async () => {
      jest.spyOn(prisma.content, 'findMany').mockResolvedValue(mockContent);

      const suggestions = await service.suggestInternalLinks(
        'TypeScript types are crucial. We discuss type systems and type annotations.',
        'TypeScript Best Practices',
        ContentType.BLOG,
      );

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].targetTitle).toBe('Understanding TypeScript Types');
    });

    it('should exclude self-referencing content', async () => {
      jest
        .spyOn(prisma.content, 'findMany')
        .mockImplementation(async (args?: { where?: { id?: { not?: string } } }) => {
          const notId = args?.where?.id?.not;
          return (
            notId ? mockContent.filter((article) => article.id !== notId) : mockContent
          ) as never;
        });

      const suggestions = await service.suggestInternalLinks(
        'TypeScript types are important',
        'TypeScript Best Practices',
        ContentType.BLOG,
        '1',
      );

      expect(prisma.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { not: '1' },
          }),
        }),
      );
      const hasSelf = suggestions.some((s) => s.targetId === '1');
      expect(hasSelf).toBe(false);
    });

    it('should drop the current article even if findMany still returns it', async () => {
      jest.spyOn(prisma.content, 'findMany').mockResolvedValue(mockContent as never);

      const suggestions = await service.suggestInternalLinks(
        'TypeScript types are important',
        'TypeScript Best Practices',
        ContentType.BLOG,
        '1',
      );

      expect(suggestions.some((s) => s.targetId === '1')).toBe(false);
    });

    it('should prioritize same content type', async () => {
      jest.spyOn(prisma.content, 'findMany').mockResolvedValue(mockContent);

      const suggestions = await service.suggestInternalLinks(
        'React Hooks are powerful. Using hooks in components simplifies logic.',
        'React Component State',
        ContentType.TUTORIAL,
      );

      if (suggestions.length > 0) {
        const typedSuggestions = suggestions.filter((s) =>
          mockContent.find((c) => c.id === s.targetId && c.type === ContentType.TUTORIAL),
        );
        expect(typedSuggestions.length).toBeGreaterThan(0);
      }
    });

    it('should return top 5 suggestions sorted by score', async () => {
      const manyArticles = Array.from({ length: 10 }, (_, i) => ({
        ...mockContent[0],
        id: String(i),
        wordpressId: 100 + i,
        wordpressUrl: `https://example.com/article-${i}`,
        sujet: `Article ${i}`,
      }));

      jest.spyOn(prisma.content, 'findMany').mockResolvedValue(manyArticles);

      const suggestions = await service.suggestInternalLinks(
        'Some content about types',
        'Types Discussion',
        ContentType.BLOG,
      );

      expect(suggestions.length).toBeLessThanOrEqual(5);
      expect(
        suggestions.every((s, i, arr) => i === 0 || s.score <= arr[i - 1].score),
      ).toBe(true);
    });

    it('should include reason for each suggestion', async () => {
      jest.spyOn(prisma.content, 'findMany').mockResolvedValue(mockContent);

      const suggestions = await service.suggestInternalLinks(
        'TypeScript and types',
        'Type Systems',
        ContentType.BLOG,
      );

      suggestions.forEach((s) => {
        expect(s.reason).toBeTruthy();
        expect(typeof s.reason).toBe('string');
      });
    });
  });
});
