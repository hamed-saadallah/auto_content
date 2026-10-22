import {
  buildLinkedInPostPayload,
  escapeLinkedInCommentary,
  validateLinkedInBody,
} from './linkedin.util';

describe('linkedin utils', () => {
  it('escapes little-text reserved characters', () => {
    expect(escapeLinkedInCommentary('Headless 360 (API).')).toBe('Headless 360 \\(API\\).');
  });

  it('rejects markdown and oversize posts', () => {
    const errors = validateLinkedInBody('Sujet', '**bold** heading');
    expect(errors.some((e) => e.includes('Markdown bold'))).toBe(true);
  });

  it('builds a Posts API payload', () => {
    const payload = buildLinkedInPostPayload('urn:li:person:123', 'Hello') as {
      visibility: string;
      lifecycleState: string;
    };
    expect(payload.visibility).toBe('PUBLIC');
    expect(payload.lifecycleState).toBe('PUBLISHED');
  });
});
