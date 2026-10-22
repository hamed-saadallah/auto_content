export const LINKEDIN_USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';
export const LINKEDIN_POSTS_URL = 'https://api.linkedin.com/rest/posts';
export const LINKEDIN_IMAGES_URL = 'https://api.linkedin.com/rest/images';
export const LINKEDIN_API_VERSION = '202608';
export const LINKEDIN_COMMENTARY_MAX_LENGTH = 3000;
export const LINKEDIN_IMAGE_ALT_MAX_LENGTH = 4086;
export const DRY_RUN_IMAGE_URN = 'urn:li:image:dry-run';
export const PERSON_URN_PATTERN = /^urn:li:person:[A-Za-z0-9_-]+$/;
export const ALLOWED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif'];

const LITTLE_TEXT_ESCAPE_RE = /[\\|{}\[\]()<>*_~@]/g;

export function escapeLinkedInCommentary(text: string): string {
  if (!text) return text;
  return text.replace(LITTLE_TEXT_ESCAPE_RE, '\\$&');
}

export function normalizePersonUrn(value?: string | null): string {
  const raw = (value || '').trim();
  if (!raw) return '';
  return raw.startsWith('urn:li:person:') ? raw : `urn:li:person:${raw}`;
}

export function buildLinkedInPostPayload(
  authorUrn: string,
  commentary: string,
  media: { id: string; altText?: string } | null = null,
) {
  const payload: Record<string, unknown> = {
    author: authorUrn,
    commentary: escapeLinkedInCommentary(commentary),
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  };

  if (media?.id) {
    payload.content = {
      media: {
        id: media.id,
        ...(media.altText ? { altText: media.altText } : {}),
      },
    };
  }

  return payload;
}

export function buildLinkedInRequestHeaders(accessToken: string, apiVersion = LINKEDIN_API_VERSION) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
    'X-Restli-Protocol-Version': '2.0.0',
    'LinkedIn-Version': apiVersion,
  };
}

export function validateLinkedInBody(sujet: string, body: string): string[] {
  const errors: string[] = [];
  if (!sujet?.trim()) errors.push('Missing sujet');
  if (!body?.trim()) errors.push('Post body is empty');
  const commentaryLength = body ? escapeLinkedInCommentary(body).length : 0;
  if (commentaryLength > LINKEDIN_COMMENTARY_MAX_LENGTH) {
    errors.push(
      `Post body exceeds LinkedIn limit (${commentaryLength}/${LINKEDIN_COMMENTARY_MAX_LENGTH} characters)`,
    );
  }
  const markdownPatterns = [
    { pattern: /\*\*[^*]+\*\*/, message: 'Markdown bold (**text**) is not rendered on LinkedIn' },
    { pattern: /^#{1,6}\s/m, message: 'Markdown headings (#) are not rendered on LinkedIn' },
    { pattern: /\[([^\]]+)\]\(([^)]+)\)/, message: 'Markdown links ([text](url)) are not rendered on LinkedIn' },
  ];
  for (const { pattern, message } of markdownPatterns) {
    if (body && pattern.test(body)) errors.push(message);
  }
  return errors;
}

export function formatLinkedInApiError(status: number, errorData: Record<string, unknown> | null): string {
  if (!errorData) return `HTTP ${status}`;
  if (typeof errorData.message === 'string') return errorData.message;
  if (typeof errorData.error_description === 'string') return errorData.error_description;
  return Object.keys(errorData).length > 0 ? JSON.stringify(errorData) : `HTTP ${status}`;
}
