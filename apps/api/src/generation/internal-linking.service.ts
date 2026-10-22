import { Injectable, Logger } from '@nestjs/common';
import { ContentType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface InternalLinkSuggestion {
  targetId: string;
  targetUrl: string;
  targetTitle: string;
  suggestedAnchorText: string;
  score: number;
  reason: string;
}

@Injectable()
export class InternalLinkingService {
  private readonly logger = new Logger(InternalLinkingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async suggestInternalLinks(
    body: string,
    sujet: string,
    type: ContentType,
    currentContentId?: string,
  ): Promise<InternalLinkSuggestion[]> {
    const published = await this.prisma.content.findMany({
      where: {
        status: 'PUBLISHED',
        wordpressId: { not: null },
        id: currentContentId ? { not: currentContentId } : undefined,
      },
    });

    const candidates = currentContentId
      ? published.filter((article) => article.id !== currentContentId)
      : published;

    if (candidates.length === 0) {
      return [];
    }

    const keywords = this.extractKeywords(body, sujet);

    const scores = candidates.map((article) => {
      const score = this.scoreArticle(
        article,
        { body, sujet, type },
        keywords,
      );
      return { article, score };
    });

    const sorted = scores
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return sorted.map((s) => ({
      targetId: s.article.id,
      targetUrl: s.article.wordpressUrl || '',
      targetTitle: s.article.sujet,
      suggestedAnchorText: this.generateAnchorText(s.article.sujet),
      score: s.score,
      reason: this.explainScore(s.article, { body, sujet, type }, keywords),
    }));
  }

  private extractKeywords(body: string, sujet: string): string[] {
    const text = `${sujet} ${body}`.toLowerCase();
    const words = text.match(/\b\w+\b/g) || [];

    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'is', 'are', 'be', 'was', 'were', 'that',
      'this', 'it', 'as', 'if', 'so', 'some', 'any', 'no', 'not', 'all',
      'each', 'every', 'both', 'few', 'more', 'most', 'other', 'own', 'same',
      'than', 'too', 'can', 'will', 'my', 'your', 'his', 'her', 'its', 'our',
      'their', 'what', 'when', 'where', 'why', 'how', 'which', 'who', 'whom',
      'etc', 'also', 'just', 'only', 'very', 'even', 'about', 'into', 'up',
      'down', 'out', 'off', 'before', 'after', 'above', 'below', 'under',
      'over', 'between', 'among', 'through', 'during', 'should', 'would',
      'could', 'do', 'does', 'did', 'have', 'has', 'had', 'having', 'being',
      'been', 'he', 'she', 'we', 'you', 'they', 'me', 'him', 'us', 'them',
    ]);

    const filtered = words.filter(
      (w) => w.length > 3 && !stopWords.has(w),
    );

    const frequency = new Map<string, number>();
    filtered.forEach((w) => {
      frequency.set(w, (frequency.get(w) || 0) + 1);
    });

    return Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map((e) => e[0]);
  }

  private scoreArticle(
    existingArticle: any,
    newArticle: { body: string; sujet: string; type: ContentType },
    keywords: string[],
  ): number {
    let score = 0;

    const existingText = `${existingArticle.sujet} ${existingArticle.body}`.toLowerCase();

    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = existingText.match(regex) || [];
      score += matches.length * 2;
    }

    const subjectOverlap = this.calculateOverlap(
      newArticle.sujet.toLowerCase(),
      existingArticle.sujet.toLowerCase(),
    );
    score += subjectOverlap * 5;

    if (existingArticle.type === newArticle.type) {
      score += 3;
    } else if (
      (newArticle.type === ContentType.BLOG &&
        existingArticle.type === ContentType.TUTORIAL) ||
      (newArticle.type === ContentType.TUTORIAL &&
        existingArticle.type === ContentType.BLOG)
    ) {
      score += 1;
    }

    if (existingArticle.focusKeyword) {
      const focusMatch = newArticle.body
        .toLowerCase()
        .includes(existingArticle.focusKeyword.toLowerCase());
      if (focusMatch) {
        score += 3;
      }
    }

    return score;
  }

  private calculateOverlap(text1: string, text2: string): number {
    const words1 = new Set(text1.split(/\s+/));
    const words2 = new Set(text2.split(/\s+/));

    const intersection = [...words1].filter((w) => words2.has(w)).length;
    const union = new Set([...words1, ...words2]).size;

    return union > 0 ? intersection / union : 0;
  }

  private generateAnchorText(title: string): string {
    const words = title.split(/\s+/);
    return words.slice(0, Math.min(4, words.length)).join(' ');
  }

  private explainScore(
    article: any,
    newArticle: { body: string; sujet: string; type: ContentType },
    keywords: string[],
  ): string {
    const reasons: string[] = [];

    const existingText = `${article.sujet} ${article.body}`.toLowerCase();
    let keywordMatches = 0;

    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = existingText.match(regex) || [];
      keywordMatches += matches.length;
    }

    if (keywordMatches > 0) {
      reasons.push(`${keywordMatches} keyword matches`);
    }

    const subjectOverlap = this.calculateOverlap(
      newArticle.sujet.toLowerCase(),
      article.sujet.toLowerCase(),
    );
    if (subjectOverlap > 0.3) {
      reasons.push(`${Math.round(subjectOverlap * 100)}% topic overlap`);
    }

    if (article.type === newArticle.type) {
      reasons.push(`same content type (${article.type})`);
    }

    return reasons.length > 0 ? reasons.join('; ') : 'related content';
  }
}
