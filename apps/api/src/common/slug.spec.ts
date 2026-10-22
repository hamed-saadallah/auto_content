import { buildSlug, kebabAscii } from './slug';

describe('slug helpers', () => {
  it('strips accents and punctuation', () => {
    expect(kebabAscii('Évolution des agents IA')).toBe('evolution-des-agents-ia');
  });

  it('prefixes ISO date', () => {
    const slug = buildSlug('Spec driven development', new Date('2026-09-07T12:00:00.000Z'));
    expect(slug).toBe('2026-09-07-spec-driven-development');
  });
});
