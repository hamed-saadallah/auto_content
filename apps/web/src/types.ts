export type ContentType = 'BLOG' | 'TUTORIAL' | 'LINKEDIN';
export type ContentStatus = 'DRAFT' | 'REVIEW' | 'APPROVED' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED';
export type PublishChannel = 'WORDPRESS' | 'LINKEDIN';

export type Content = {
  id: string;
  type: ContentType;
  sujet: string;
  slug: string;
  status: ContentStatus;
  audience: string | null;
  objectif: string | null;
  body: string;
  seoTitle: string | null;
  metaDescription: string | null;
  focusKeyword: string | null;
  imageAlt: string | null;
  seoAnalysis: Record<string, unknown> | null;
  coverRelPath: string | null;
  coverUrl: string | null;
  wordpressId: number | null;
  wordpressUrl: string | null;
  linkedinPostId: string | null;
  linkedinErrors: string[];
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type IntegrationStatus = {
  mistral: boolean;
  linkedin: boolean;
  wordpress: boolean;
};
