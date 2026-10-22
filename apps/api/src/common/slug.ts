const MAX_SLUG_LENGTH = 90;

export function kebabAscii(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function dateStamp(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function buildSlug(sujet: string, date: Date = new Date()): string {
  const base = kebabAscii(sujet) || 'untitled';
  const slug = `${dateStamp(date)}-${base}`;
  return slug.slice(0, MAX_SLUG_LENGTH).replace(/-+$/g, '');
}
